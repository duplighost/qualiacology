// The hero light: a key light that rides with the camera (up and to its left), on YOU and on her only. Whatever
// colour a room goes (a red hell, a blackout, a blue night), the two of you keep your own colours and your shape:
// her glaze still shines, YOU's coat is still ivory. It's added inside their own materials (no scene light: the room
// stays as it was baked). k: how strong (the fight raises it for her death scene); scaled like every glow by the
// room's exposure (FXK), so a dark room raised by exposure doesn't blow it out.
import * as THREE from 'three';

export const HERO = { k: 0.42, dir: { value: new THREE.Vector3(-0.42, 0.62, 0.66).normalize() }, spec: { value: 0.55 } };

// in a physical material's fragment shader, after its lights: `uni` is the name of its vec3 colour uniform
export const heroChunk = (uni) => `
  { vec3 hl = uHeroDir; float nd = dot(normal, hl);
    float wrap = clamp(nd * 0.78 + 0.22, 0.0, 1.0);
    reflectedLight.directDiffuse += ${uni} * material.diffuseColor * wrap;
    vec3 hh = normalize(hl + normalize(vViewPosition));
    reflectedLight.directSpecular += ${uni} * pow(max(dot(normal, hh), 0.0), 54.0) * uHeroSpec * (1.0 - material.roughness); }
`;
export const HERO_PARS = 'uniform vec3 uHeroDir; uniform float uHeroSpec;';
