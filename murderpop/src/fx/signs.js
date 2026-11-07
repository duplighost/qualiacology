// Lyric signs: a song's best lines appear in the world as set dressing at the moment they're sung.
// Styles: 'neon' (glowing tube script), 'gilt' (gold leaf caps), 'lipstick' (scrawled on a mirror or wall),
// 'marquee' (bulbs). Never instructions; only the song.
import * as THREE from 'three';

const STYLE = {
  neon: { font: 'italic 700 120px Fraunces, Georgia, serif', fill: '#fff2f8', glow: '#ff2e88', blur: 38, emissive: 3.4 },
  gilt: { font: '900 110px "Archivo Black", Arial Black, sans-serif', fill: '#f6d27a', glow: '#c7922b', blur: 18, emissive: 1.8, caps: true, track: 0.08 },
  lipstick: { font: 'italic 800 130px Fraunces, Georgia, serif', fill: '#d8103e', glow: '#ff3a5a', blur: 8, emissive: 1.2, wobble: true },
  marquee: { font: '900 104px "Archivo Black", Arial Black, sans-serif', fill: '#fff6d8', glow: '#ffd27a', blur: 24, emissive: 2.6, caps: true, track: 0.12, bulbs: true },
  chalk: { font: '700 100px "Space Grotesk", sans-serif', fill: '#f4f0ea', glow: '#ffffff', blur: 6, emissive: 0.9 },
};

function textTexture(text, st) {
  const pad = 60;
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  g.font = st.font;
  const label = st.caps ? text.toUpperCase() : text;
  const spacing = (st.track || 0) * 100;
  let w = 0; for (const ch of label) w += g.measureText(ch).width + spacing;
  c.width = Math.min(4096, Math.ceil(w + pad * 2)); c.height = 220;
  g.font = st.font; g.textBaseline = 'middle';
  let x = pad;
  const draw = (pass) => {
    x = pad;
    for (const ch of label) {
      const dy = st.wobble ? Math.sin(x * 0.05) * 6 : 0, rot = st.wobble ? Math.sin(x * 0.031) * 0.06 : 0;
      g.save(); g.translate(x, 110 + dy); g.rotate(rot);
      if (pass === 0) { g.shadowColor = st.glow; g.shadowBlur = st.blur; g.fillStyle = st.glow; g.fillText(ch, 0, 0); }
      else { g.shadowBlur = 0; g.fillStyle = st.fill; g.fillText(ch, 0, 0); }
      g.restore();
      x += g.measureText(ch).width + spacing;
    }
  };
  draw(0); draw(0); draw(1);
  if (st.bulbs) { g.fillStyle = '#fff3c4'; g.shadowColor = '#ffd27a'; g.shadowBlur = 14; for (let bx = 30; bx < c.width - 20; bx += 44) { g.beginPath(); g.arc(bx, 16, 7, 0, 7); g.fill(); g.beginPath(); g.arc(bx, 204, 7, 0, 7); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { tex: t, aspect: c.width / c.height };
}

export class Signs {
  constructor(scene) { this.scene = scene; this.list = []; }

  // {text, style, x, y, z, height (m), rotY, lieFlat, t0, t1, flicker}
  add(o) {
    const st = STYLE[o.style || 'neon'];
    const { tex, aspect } = textTexture(o.text, st);
    const h = o.height || 1.2, w = h * aspect;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, color: new THREE.Color(st.emissive, st.emissive, st.emissive), side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(o.x || 0, o.y ?? 3.5, o.z || -6);
    if (o.lieFlat) m.rotation.x = -Math.PI / 2;
    m.rotation.y = o.rotY || 0;
    m.renderOrder = 3;
    this.scene.add(m);
    const s = { m, t0: o.t0, t1: o.t1 ?? o.t0 + 4, flicker: o.flicker ?? (o.style === 'neon' || o.style === 'marquee'), base: m.scale.clone(), pop: o.pop ?? 1 };
    this.list.push(s);
    return s;
  }
  clearAfter(t) { for (const s of this.list) if (s.t0 > t) s.m.material.opacity = 0; }
  update(t) {
    for (const s of this.list) {
      const fadeIn = THREE.MathUtils.clamp((t - s.t0) / 0.18, 0, 1), fadeOut = THREE.MathUtils.clamp((s.t1 - t) / 0.5, 0, 1);
      let a = Math.min(fadeIn, fadeOut);
      if (s.flicker && t - s.t0 < 0.45 && t > s.t0) a *= (Math.sin((t - s.t0) * 90) > -0.2 ? 1 : 0.15);
      s.m.material.opacity = a;
      s.m.visible = a > 0.001;
      const k = 1 + (1 - fadeIn) * 0.25 * s.pop; s.m.scale.set(k, k, 1);
    }
  }
  dispose() { for (const s of this.list) { this.scene.remove(s.m); s.m.material.map.dispose(); s.m.material.dispose(); s.m.geometry.dispose(); } this.list.length = 0; }
}
