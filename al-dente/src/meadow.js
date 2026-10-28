// Stage one: the meadow, the lasagna chimney, the dry bridge, the springs, the tagliatelle bridge, the rigatoni.
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { buildProps } from './props.js';
import { buildFlora } from './flora.js';

export function buildMeadow(scene, K, audio) {
  const W = buildWorld(scene, K);
  const props = buildProps(scene, K, W, audio);
  const flora = buildFlora(scene, K, W);
  const S = { id: 'meadow', scene, colliders: W.colliders, zones: W.zones, supports: props.supports, tube: props.tube, fx: props.fx,
    skyMat: W.skyMat, star: props.star, pickups: props.pickups };
  S.spawn = new THREE.Vector3(0, W.colliders.floorBelow(0, 50, 58) + 0.46, 58);
  S.facing = Math.PI;
  const st = props.star.home;
  S.intro = {
    len: 6.2,
    fly: new THREE.CatmullRomCurve3([
      st.clone().add(new THREE.Vector3(-3.2, 0.6, 4.2)), new THREE.Vector3(14, 30, -40), new THREE.Vector3(-6, 22, -24),
      new THREE.Vector3(2, 17, -6), new THREE.Vector3(1, 11, 24), new THREE.Vector3(0, 6, 54), new THREE.Vector3(0, 4.2, 64),
    ], false, 'centripetal'),
    look: new THREE.CatmullRomCurve3([
      st.clone(), st.clone().add(new THREE.Vector3(0, -2, 0)), new THREE.Vector3(10, 19, -45), new THREE.Vector3(0, 9, -14),
      new THREE.Vector3(0, 6, 8), new THREE.Vector3(0, 4, 24), new THREE.Vector3(0, 2.6, 40),
    ], false, 'centripetal'),
  };
  S.update = (dt, time, hero) => { props.update(dt, time, hero); flora.update(dt, time, hero); };
  S.fixed = (dt) => props.fixed(dt);
  S.reset = () => props.reset();
  S.resetBreakables = () => props.resetBreakables();
  return S;
}
