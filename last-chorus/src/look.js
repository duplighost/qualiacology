// A song's look over time. Most songs have one palette; some move through
// several (Summer People goes winter -> spring -> summer -> September -> rain).
// Each frame the blended palette is pushed into every shader that uses it.

import * as THREE from 'three';

const COLOR_KEYS = ['glass', 'cloud', 'water', 'sand', 'zenith', 'horizon', 'skyGlow', 'moon', 'fog', 'ground', 'street', 'roof', 'wall', 'tree', 'window', 'windowAlt', 'lamp', 'ribbon', 'edge', 'fret', 'glow', 'skyline', 'skyLight', 'bounce', 'heart', 'hold', 'gate', 'gem'];
const NUM_KEYS = ['fogDensity', 'stars', 'sunSize', 'snow', 'rain', 'wake', 'snowGround', 'sunK', 'hemiK', 'fillK', 'clouds', 'dapple', 'shade', 'hills', 'breath', 'windowK', 'daze'];
const VEC_KEYS = ['glowDir', 'moonDir'];

export class Look {
  constructor(entry, PALETTES) {
    const keys = entry.looks || [{ t: -99, palette: entry.palette }];
    this.keys = keys.map((k) => ({ t: k.t, fade: k.fade ?? 4, P: { ...PALETTES[entry.palette], ...(PALETTES[k.palette] || {}), ...(k.set || {}) } }));
    this.animated = this.keys.length > 1;
    this.live = { ...this.keys[0].P };
    this._c = new THREE.Color(); this._d = new THREE.Color();
  }

  // blended palette at song time t (hex numbers for colours, so code that reads P.x keeps working)
  at(t) {
    const K = this.keys;
    let i = 0;
    while (i + 1 < K.length && t >= K[i + 1].t) i++;
    const a = K[i].P;
    const nxt = K[i + 1];
    // blend into the next look over its fade, ending on its time
    let f = 0, b = a;
    if (nxt && t > nxt.t - nxt.fade) { f = (t - (nxt.t - nxt.fade)) / nxt.fade; b = nxt.P; }
    f = f * f * (3 - 2 * f);
    const L = this.live;
    for (const k of COLOR_KEYS) {
      if (a[k] === undefined) continue;
      this._c.set(a[k]); this._d.set(b[k] ?? a[k]);
      L[k] = this._c.lerp(this._d, f).getHex();
    }
    for (const k of NUM_KEYS) { const va = a[k] ?? 0, vb = b[k] ?? va; L[k] = va + (vb - va) * f; }
    for (const k of VEC_KEYS) { if (!a[k]) continue; const va = a[k], vb = b[k] || va; L[k] = va.map((x, j) => x + (vb[j] - x) * f); }
    return L;
  }
}

// push a palette into every material that draws with it
export function applyLook(S, L) {
  const set = (u, hex) => { if (u && hex !== undefined) u.value.set(hex); };
  const su = S.sky.material.uniforms;
  set(su.uZenith, L.zenith); set(su.uHorizon, L.horizon); set(su.uGlow, L.skyGlow); set(su.uMoon, L.moon);
  if (L.glowDir) su.uGlowDir.value.set(...L.glowDir).normalize();
  if (L.moonDir) su.uMoonDir.value.set(...L.moonDir).normalize();
  if (su.uStars) su.uStars.value = L.stars ?? 1;
  if (su.uSun) su.uSun.value = L.sunSize ?? 0;
  if (su.uCloud) { if (L.cloud !== undefined) { su.uCloud.value.set(L.cloud); su.uCloudK.value = 1; } else su.uCloudK.value = 0; su.uClouds.value = L.clouds ?? 0.45; }
  const ku = S.skyline.material.uniforms;
  set(ku.uSil, L.skyline); set(ku.uFog, L.fog); set(ku.uWin, L.window); set(ku.uAlt, L.windowAlt);
  const gu = S.ground.material.uniforms;
  if (!S.land) { set(gu.uFog, L.fog); set(gu.uGround, L.ground); set(gu.uStreet, L.street); set(gu.uHorizon, L.horizon); gu.uFogDensity.value = L.fogDensity; }
  const tu = S.track.mat.uniforms;
  if (tu.uDapple) { tu.uDapple.value = L.dapple ?? 0; tu.uShade.value = L.shade ?? 0; set(tu.uSun, L.moon); if (L.moonDir) tu.uSunDir.value.set(...L.moonDir).normalize(); }
  set(tu.uBase, L.ribbon); set(tu.uEdge, L.edge); set(tu.uFret, L.fret); set(tu.uGlow, L.glow); set(tu.uSky, L.horizon); set(tu.uFogColor, L.fog);
  if (tu.uHoldCol) { tu.uHoldCol.value.set(L.hold ?? L.glow); if (L.gate !== undefined) tu.uGateCol.value.set(L.gate); else tu.uGateCol.value.set(L.edge).lerp(S._white || (S._white = tu.uHitCol.value.clone().setRGB(1, 1, 1)), 0.55); }
  tu.uFogDensity.value = L.fogDensity;
  // scenery reads its palette object every frame for lamps and porch lights
  Object.assign(S.town.P, L);
  for (const k of ['house', 'block', 'tower', 'shop', 'motel']) {
    const sh = S.town.mats[k].userData.shader;
    if (sh) { set(sh.uniforms.uWarm, L.window); set(sh.uniforms.uCandy, L.windowAlt); if (sh.uniforms.uWinK) { sh.uniforms.uWinK.value = L.windowK ?? 1; sh.uniforms.uGlass.value.set(L.glass ?? 0x030406); } }
  }
  for (const r of S.town.roadMeshes) { set(r.mat.uniforms.uSky, L.horizon); set(r.mat.uniforms.uLamp, L.street); }
  if (S.hemi) { S.hemi.color.set(L.skyLight ?? 0x6a5a9a); S.hemi.groundColor.set(L.bounce ?? 0x5a3a2a); S.hemi.intensity = L.hemiK ?? 1.9; }
  if (S.moonLight) { S.moonLight.color.set(L.moon); if (!S.entry.heart) { S.moonLight.intensity = L.sunK ?? 0.9; if (L.moonDir) S.moonLight.position.set(...L.moonDir).normalize().multiplyScalar(100); } }
  if (S.fillLight) { S.fillLight.color.set(L.skyGlow); S.fillLight.intensity = L.fillK ?? 0.7; }
  for (const r of S.town.roadMeshes) { r.mat.uniforms.uShade.value = L.shade ?? 0; set(r.mat.uniforms.uSun, L.moon); r.mat.uniforms.uSnow.value = L.snowGround ?? 0; }
  if (gu.uStyle !== undefined) { gu.uSnow.value = L.snowGround ?? 0; }
  if (ku.uHills !== undefined) ku.uHills.value = L.hills ?? 0;
  if (S.weather) S.weather.set(L.snow ?? 0, L.rain ?? 0);
  S.P = L;
}
