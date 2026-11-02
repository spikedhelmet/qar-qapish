// First-person arms (rigged model): hands are placed on the gun every frame and the elbows bend
// to reach them (two-bone IK). The rig's hands hang off control bones, not the forearms, so a hand
// can be put anywhere and the arm is solved to meet it.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4();

const FINGERS = ['index', 'middle', 'ring', 'pinky'];

function find(root, prefix) {
  let hit = null;
  root.traverse(o => { if (!hit && o.isBone && o.name.toLowerCase().startsWith(prefix.toLowerCase())) hit = o; });
  return hit;
}

// Turn a bone (in place, from its rest pose) so its +Y axis — the direction it points — aims at `target`.
function aim(bone, rest, target) {
  bone.quaternion.copy(rest);
  bone.updateMatrixWorld(true);
  const from = bone.getWorldPosition(_a);
  const want = _b.copy(target).sub(from).normalize();
  const world = bone.getWorldQuaternion(_q);
  const cur = _c.copy(UP).applyQuaternion(world);
  const turned = _q2.setFromUnitVectors(cur, want).multiply(world);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(_q).invert().multiply(turned));
  bone.updateMatrixWorld(true);
}

export class FpArms {
  constructor(model) {
    this.root = model;
    model.updateMatrixWorld(true);
    this.sides = {};
    for (const [key, s] of [['right', 'r'], ['left', 'l']]) {
      const side = {
        upper: find(model, `upperarm_${s}_`),
        lower: find(model, `lowerarm_${s}_`),
        hand: find(model, `hand_${s}_`),
        control: find(model, `lk_mano_${s}`),
        fingers: FINGERS.map(f => [1, 2, 3].map(i => find(model, `${f}_0${i}_${s}_`))),
        thumb: [1, 2, 3].map(i => find(model, `thumb_0${i}_${s}_`)),
        sign: s === 'r' ? 1 : -1,
      };
      side.rest = new Map();
      model.traverse(o => { if (o.isBone) side.rest.set(o, o.quaternion.clone()); });
      const p = b => b.getWorldPosition(new THREE.Vector3());
      side.L1 = p(side.upper).distanceTo(p(side.lower));
      side.L2 = p(side.lower).distanceTo(p(side.hand));
      // The hand's own axes: +Y toward the fingers; "across" from pinky knuckle to index knuckle.
      const across = side.fingers[0][0].position.clone().sub(side.fingers[3][0].position);
      across.y = 0;
      side.across = across.normalize();
      side.palm = side.fingers[1][0].position.length() * 0.55; // wrist → middle of the palm, in hand units
      side.palmScale = p(side.hand).distanceTo(p(side.fingers[1][0])) / side.fingers[1][0].position.length();
      this.sides[key] = side;
    }
  }

  // target: { palm, fingers, across, curl } in the arms' parent space (camera space), or null to drop
  // that arm out of view. fingers / across are directions: where the fingers point and pinky→index.
  update(right, left) {
    this.solve(this.sides.right, right);
    this.solve(this.sides.left, left);
  }

  solve(side, t) {
    const sh = side.upper.getWorldPosition(new THREE.Vector3());
    if (!t) {
      // Arm hangs down out of sight.
      t = { palm: sh.clone().add(new THREE.Vector3(0.06 * side.sign, -0.55, -0.15)), fingers: new THREE.Vector3(0, -1, -0.3), across: new THREE.Vector3(0, 0, -1), curl: 0.5 };
    }
    const F = t.fingers.clone().normalize();
    const A = t.across.clone().addScaledVector(F, -t.across.dot(F)).normalize();
    const wrist = t.palm.clone().addScaledVector(F, -side.palm * side.palmScale);

    // Hand: put its control bone at the wrist and turn the hand so its axes match (A, F).
    const ctrl = side.control;
    ctrl.position.copy(ctrl.parent.worldToLocal(wrist.clone()));
    ctrl.updateMatrixWorld(true);
    const local = _m.makeBasis(side.across, UP, _a.crossVectors(side.across, UP).normalize());
    const want = _m2.makeBasis(A, F, _b.crossVectors(A, F).normalize());
    const worldQ = new THREE.Quaternion().setFromRotationMatrix(want.multiply(local.transpose()));
    side.hand.quaternion.copy(ctrl.getWorldQuaternion(_q).invert().multiply(worldQ));
    side.hand.updateMatrixWorld(true);

    // Arm: two-bone IK from the shoulder to the wrist, elbow pushed down and outward.
    const d = sh.distanceTo(wrist);
    const reach = side.L1 + side.L2;
    side.lower.scale.y = d > reach * 0.999 ? Math.min(1.25, (d - side.L1) / side.L2 + 0.001) : 1; // stretch rather than leave a gap
    const L2 = side.L2 * side.lower.scale.y, dd = Math.min(d, side.L1 + L2 - 1e-4);
    const along = (side.L1 * side.L1 - L2 * L2 + dd * dd) / (2 * dd);
    const up = Math.sqrt(Math.max(0, side.L1 * side.L1 - along * along));
    const dir = wrist.clone().sub(sh).normalize();
    const pole = new THREE.Vector3(0.55 * side.sign, -1, 0.25);
    pole.addScaledVector(dir, -pole.dot(dir)).normalize();
    const elbow = sh.clone().addScaledVector(dir, along).addScaledVector(pole, up);
    aim(side.upper, side.rest.get(side.upper), elbow);
    aim(side.lower, side.rest.get(side.lower), wrist);

    // Fingers wrap the grip; the thumb closes a little.
    const curl = t.curl ?? 0.8;
    side.fingers.forEach((joints, i) => joints.forEach((b, j) => {
      if (!b) return;
      b.quaternion.copy(side.rest.get(b)).multiply(_q.setFromAxisAngle(_a.set(1, 0, 0), curl * [1.0, 1.25, 0.9][j] * (i === 0 ? (t.trigger ?? 1) : 1)));
    }));
    side.thumb.forEach((b, j) => b && b.quaternion.copy(side.rest.get(b)).multiply(_q.setFromAxisAngle(_a.set(1, 0, 0), curl * 0.35)));
  }
}
