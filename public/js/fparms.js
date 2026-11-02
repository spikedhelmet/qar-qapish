// First-person arms (rigged model): hands are placed on the gun every frame and the elbows bend
// to reach them (two-bone IK). Works with the team's Mixamo soldier (hand hangs off the forearm)
// and with the Sketchfab arms rig (hand hangs off its own control bone).
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4();

const FINGERS = ['index', 'middle', 'ring', 'pinky'];
const cap = s => s[0].toUpperCase() + s.slice(1);

// Bone names per rig. `keep`: for a full-body model, only triangles skinned to these bones are drawn
// (the soldier's arms and hands; head, body and legs are cut away).
export const RIGS = {
  mixamo: {
    sides: { right: 'Right', left: 'Left' },
    upper: s => `mixamorig${s}Arm`, lower: s => `mixamorig${s}ForeArm`, hand: s => `mixamorig${s}Hand`,
    control: null,
    finger: (f, i, s) => `mixamorig${s}Hand${cap(f)}${i}`, thumb: (i, s) => `mixamorig${s}HandThumb${i}`,
    keep: /(Left|Right)(ForeArm|Hand)/, // upper arms would fill the corner of the screen
    curlAxis: { right: [1, 0, 0], left: [-1, 0, 0] }, // Mixamo mirrors the left hand's axes
  },
  sketchfab: {
    sides: { right: 'r', left: 'l' },
    upper: s => `upperarm_${s}_`, lower: s => `lowerarm_${s}_`, hand: s => `hand_${s}_`,
    control: s => `lk_mano_${s}`,
    finger: (f, i, s) => `${f}_0${i}_${s}_`, thumb: (i, s) => `thumb_0${i}_${s}_`,
  },
};

function find(root, prefix) {
  let hit = null;
  const p = prefix.toLowerCase();
  root.traverse(o => { if (!hit && o.isBone && o.name.toLowerCase().startsWith(p)) hit = o; });
  return hit;
}

// Keep only the triangles of a skinned mesh whose vertices mostly follow the given bones.
// The geometry is copied first: the original is shared with the third-person soldiers.
function trimToBones(mesh, keep) {
  const g = mesh.geometry.clone();
  const idx = g.attributes.skinIndex, wt = g.attributes.skinWeight, bones = mesh.skeleton.bones;
  const kept = new Uint8Array(idx.count);
  for (let v = 0; v < idx.count; v++) {
    let best = 0, bone = 0;
    for (let k = 0; k < 4; k++) if (wt.getComponent(v, k) > best) { best = wt.getComponent(v, k); bone = idx.getComponent(v, k); }
    kept[v] = keep.test(bones[bone]?.name || '') ? 1 : 0;
  }
  const src = g.index ? g.index.array : [...Array(idx.count).keys()];
  const tris = [];
  for (let i = 0; i < src.length; i += 3) {
    if (kept[src[i]] + kept[src[i + 1]] + kept[src[i + 2]] >= 2) tris.push(src[i], src[i + 1], src[i + 2]);
  }
  g.setIndex(tris);
  mesh.geometry = g;
  return tris.length / 3;
}

// Turn a bone (from its rest pose) so its +Y axis — the direction it points — aims at `target`.
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
  constructor(model, rig) {
    this.root = model;
    this.rig = rig;
    if (rig.keep) {
      const meshes = [];
      model.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
      for (const m of meshes) if (trimToBones(m, rig.keep) === 0) m.visible = false;
    }
    model.updateMatrixWorld(true);
    const rest = new Map();
    model.traverse(o => { if (o.isBone) rest.set(o, o.quaternion.clone()); });
    const p = b => b.getWorldPosition(new THREE.Vector3());
    this.sides = {};
    for (const [key, s] of Object.entries(rig.sides)) {
      const side = {
        upper: find(model, rig.upper(s)), lower: find(model, rig.lower(s)), hand: find(model, rig.hand(s)),
        control: rig.control ? find(model, rig.control(s)) : null,
        fingers: FINGERS.map(f => [1, 2, 3].map(i => find(model, rig.finger(f, i, s)))),
        thumb: [1, 2, 3].map(i => find(model, rig.thumb(i, s))),
        sign: key === 'right' ? 1 : -1,
        curlAxis: rig.curlAxis?.[key] || [1, 0, 0],
        rest,
      };
      side.L1 = p(side.upper).distanceTo(p(side.lower));
      side.L2 = p(side.lower).distanceTo(p(side.hand));
      // The hand's own axes: +Y toward the fingers; "across" from pinky knuckle to index knuckle.
      const across = side.fingers[0][0].position.clone().sub(side.fingers[3][0].position);
      across.y = 0;
      side.across = across.normalize();
      side.palm = p(side.hand).distanceTo(p(side.fingers[1][0])) * 0.55; // wrist → middle of the palm, meters
      this.sides[key] = side;
    }
  }

  // Midpoint between the shoulders, in the model's parent space (used to place the body).
  shoulderMid() {
    this.root.updateMatrixWorld(true);
    const r = this.sides.right.upper.getWorldPosition(new THREE.Vector3());
    const l = this.sides.left.upper.getWorldPosition(new THREE.Vector3());
    return r.add(l).multiplyScalar(0.5);
  }

  // target: { palm, fingers, across, curl, trigger } in the arms' parent space (camera space), or null
  // to drop that arm out of view. fingers / across are directions: wrist→knuckles and pinky→index.
  update(right, left) {
    this.solve(this.sides.right, right);
    this.solve(this.sides.left, left);
  }

  solve(side, t) {
    const sh = side.upper.getWorldPosition(new THREE.Vector3());
    if (!t) {
      // Arm hangs down out of sight.
      t = { palm: sh.clone().add(new THREE.Vector3(0.08 * side.sign, -0.5, -0.1)), fingers: new THREE.Vector3(0, -1, -0.2), across: new THREE.Vector3(0, 0, -1), curl: 0.5 };
    }
    const F = t.fingers.clone().normalize();
    const A = t.across.clone().addScaledVector(F, -t.across.dot(F)).normalize();
    let wrist = t.palm.clone().addScaledVector(F, -side.palm);

    // Arm: two-bone IK from the shoulder to the wrist, elbow pushed down and outward.
    const reach = side.L1 + side.L2;
    let d = sh.distanceTo(wrist);
    if (side.control) {
      // Separate hand bone: the forearm may stretch a little rather than leave a gap.
      side.lower.scale.y = d > reach * 0.999 ? Math.min(1.25, (d - side.L1) / side.L2 + 0.001) : 1;
    } else if (d > reach * 0.995) {
      // Hand rides on the forearm: if out of reach, it stops at full stretch.
      wrist = sh.clone().add(wrist.clone().sub(sh).setLength(reach * 0.995));
      d = reach * 0.995;
    }
    const L2 = side.L2 * side.lower.scale.y, dd = Math.min(d, side.L1 + L2 - 1e-4);
    const along = (side.L1 * side.L1 - L2 * L2 + dd * dd) / (2 * dd);
    const up = Math.sqrt(Math.max(0, side.L1 * side.L1 - along * along));
    const dir = wrist.clone().sub(sh).normalize();
    // Elbows down and out; the left one tucked lower so the forearm enters from the bottom of the view.
    const pole = side.sign > 0 ? new THREE.Vector3(0.55, -1, 0.25) : new THREE.Vector3(-0.25, -1, 0.35);
    pole.addScaledVector(dir, -pole.dot(dir)).normalize();
    const elbow = sh.clone().addScaledVector(dir, along).addScaledVector(pole, up);
    aim(side.upper, side.rest.get(side.upper), elbow);
    aim(side.lower, side.rest.get(side.lower), wrist);

    // Hand: (on the Sketchfab rig, move its control bone to the wrist) then turn it so its axes match (A, F).
    if (side.control) {
      const ctrl = side.control;
      ctrl.position.copy(ctrl.parent.worldToLocal(wrist.clone()));
      ctrl.updateMatrixWorld(true);
    }
    const local = _m.makeBasis(side.across, UP, _a.crossVectors(side.across, UP).normalize());
    const want = _m2.makeBasis(A, F, _b.crossVectors(A, F).normalize());
    const worldQ = new THREE.Quaternion().setFromRotationMatrix(want.multiply(local.transpose()));
    side.hand.quaternion.copy(side.hand.parent.getWorldQuaternion(_q).invert().multiply(worldQ));
    side.hand.updateMatrixWorld(true);

    // Fingers wrap the grip; the thumb closes a little.
    const curl = t.curl ?? 0.8, axis = side.curlAxis;
    side.fingers.forEach((joints, i) => joints.forEach((b, j) => {
      if (!b) return;
      const angle = curl * [1.0, 1.25, 0.9][j] * (i === 0 ? (t.trigger ?? 1) : 1);
      b.quaternion.copy(side.rest.get(b)).multiply(_q.setFromAxisAngle(_a.fromArray(axis), angle));
    }));
    side.thumb.forEach(b => b && b.quaternion.copy(side.rest.get(b)).multiply(_q.setFromAxisAngle(_a.fromArray(axis), curl * 0.35)));
  }
}
