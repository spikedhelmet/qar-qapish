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
  },
  psx: {
    sides: { right: 'R', left: 'L' },
    upper: s => `upper_arm${s}`, lower: s => `forearm${s}`, hand: s => `hand${s}`,
    control: null,
    finger: (f, i, s) => `f_${f}0${i}${s}`, thumb: (i, s) => `thumb0${i}${s}`,
    // Whole arms, shoulders placed below the view: elbows point down and back so the forearms rise
    // from the bottom edge of the screen and the upper arms never show.
    pole: { right: [0.4, -1, 0.2], left: [-0.15, -1, 0.3] },
    handScale: 0.8, // its hands are oversized next to the guns; the arms keep their reach
  },
  sketchfab: {
    sides: { right: 'r', left: 'l' },
    upper: s => `upperarm_${s}_`, lower: s => `lowerarm_${s}_`, hand: s => `hand_${s}_`,
    control: s => `lk_mano_${s}`,
    finger: (f, i, s) => `${f}_0${i}_${s}_`, thumb: (i, s) => `thumb_0${i}_${s}_`,
  },
};

function find(root, name) {
  let exact = null, prefix = null;
  const p = name.toLowerCase();
  root.traverse(o => {
    if (!o.isBone) return;
    const n = o.name.toLowerCase();
    if (!exact && n === p) exact = o;
    if (!prefix && n.startsWith(p)) prefix = o;
  });
  return exact || prefix;
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

// Works out, for every finger joint, the local axis that bends it toward the palm: fingers curl around
// the line across the knuckles; the palm is on the side of the hand the thumb sits on.
function curlAxes(side, p) {
  side.hand.updateMatrixWorld(true);
  const handQ = side.hand.getWorldQuaternion(new THREE.Quaternion());
  const across = side.across.clone().applyQuaternion(handQ);
  const toFingers = side.toFingers.clone().applyQuaternion(handQ);
  const palmN = new THREE.Vector3().crossVectors(toFingers, across).normalize();
  const thumbSide = p(side.thumb[1] || side.thumb[0]).sub(p(side.hand));
  if (thumbSide.dot(palmN) < 0) palmN.negate();
  const axes = new Map();
  for (const b of [...side.fingers.flat(), ...side.thumb]) {
    if (!b) continue;
    // Rotating about +k moves the bone's tip by k × dir: pick ±across so that goes toward the palm.
    const dir = UP.clone().applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion()));
    const k = across.clone();
    if (new THREE.Vector3().crossVectors(k, dir).dot(palmN) < 0) k.negate();
    axes.set(b, k.applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize());
  }
  return axes;
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
    if (rig.handScale) for (const s of Object.values(rig.sides)) find(model, rig.hand(s)).scale.setScalar(rig.handScale);
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
        // Which way the elbow points (camera space). Default: down and outward.
        pole: new THREE.Vector3(...(rig.pole?.[key] || (key === 'right' ? [0.55, -1, 0.25] : [-0.25, -1, 0.35]))),
        rest,
      };
      side.L1 = p(side.upper).distanceTo(p(side.lower));
      side.L2 = p(side.lower).distanceTo(p(side.hand));
      // The hand's own axes, measured from its knuckles (finger bones may hang off palm bones):
      // toward the middle knuckle, and across from the pinky knuckle to the index knuckle.
      const inHand = b => side.hand.worldToLocal(p(b));
      side.toFingers = inHand(side.fingers[1][0]).normalize();
      const across = inHand(side.fingers[0][0]).sub(inHand(side.fingers[3][0]));
      side.across = across.addScaledVector(side.toFingers, -across.dot(side.toFingers)).normalize();
      side.curlAxes = curlAxes(side, p);
      // Which side of the hand the palm is on (the thumb's side), in the hand's own frame.
      side.palmN = new THREE.Vector3().crossVectors(side.toFingers, side.across);
      if (inHand(side.thumb[1] || side.thumb[0]).dot(side.palmN) < 0) side.palmN.negate();
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

  // target: { palm, fingers, across, thumb, curl, trigger } in the arms' parent space (camera space), or
  // null to drop that arm out of view. fingers / across / thumb are directions: wrist→knuckles,
  // pinky→index, and where the thumb points (default: forward along the fingers, a little toward the palm).
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
    const pole = side.pole.clone();
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
    const local = _m.makeBasis(side.across, side.toFingers, _a.crossVectors(side.across, side.toFingers).normalize());
    const want = _m2.makeBasis(A, F, _b.crossVectors(A, F).normalize());
    const worldQ = new THREE.Quaternion().setFromRotationMatrix(want.multiply(local.transpose()));
    side.hand.quaternion.copy(side.hand.parent.getWorldQuaternion(_q).invert().multiply(worldQ));
    side.hand.updateMatrixWorld(true);

    // Fingers wrap the grip (index looser: it rests on the trigger).
    const curl = t.curl ?? 0.8;
    side.fingers.forEach((joints, i) => joints.forEach((b, j) => {
      if (!b) return;
      const angle = curl * [0.9, 1.2, 0.8][j] * (i === 0 ? (t.trigger ?? 1) : 1);
      b.quaternion.copy(side.rest.get(b)).multiply(_q.setFromAxisAngle(side.curlAxes.get(b), angle));
    }));
    // The thumb lies along the grip: each joint is aimed rather than curled (it bends on its own axis).
    const palmN = side.palmN.clone().transformDirection(side.hand.matrixWorld);
    const thumb = t.thumb ? t.thumb.clone().normalize() : F.clone().addScaledVector(palmN, 0.5).addScaledVector(A, 0.2).normalize();
    for (const b of side.thumb) {
      if (!b) continue;
      b.updateMatrixWorld(true);
      aim(b, side.rest.get(b), b.getWorldPosition(new THREE.Vector3()).add(thumb));
    }
  }
}
