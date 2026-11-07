// What YOU took back from each of them, as small objects: on the record (each won track keeps its keepsake in its
// groove) and in the credits store. makeKeepsake(kind) returns a Group at real size (metres), resting on y = 0.
import * as THREE from 'three';

const M = {};
const mat = (k, o) => (M[k] ||= new THREE.MeshStandardMaterial(o));
const gold = () => mat('gold', { color: 0xe0b04a, roughness: 0.25, metalness: 0.9 });
const brass = () => mat('brass', { color: 0xc9a050, roughness: 0.3, metalness: 0.85 });
const pink = () => mat('pink', { color: 0xff5f9e, roughness: 0.18, metalness: 0.1 });
const lilac = () => mat('lilac', { color: 0xb79ad6, roughness: 0.6 });
const dark = () => mat('dark', { color: 0x0a0a0a, roughness: 0.25 });
function heart(depth = 0.008) { const s = new THREE.Shape(); s.moveTo(0, -0.03); s.bezierCurveTo(0.05, 0.005, 0.03, 0.04, 0, 0.022); s.bezierCurveTo(-0.03, 0.04, -0.05, 0.005, 0, -0.03); return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export const KEEPSAKE_SIZE = { tag: 0.13, key: 0.13, gavel: 0.12, locket: 0.1, teddy: 0.3, giltkey: 0.22, star: 0.11, pin: 0.07, prize: 0.06, bag: 0.4, cherry: 0.1, headlight: 0.15 };

export function makeKeepsake(kind) {
  const g = new THREE.Group();
  const add = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
  if (kind === 'tag') {   // A1: her price tag, torn off the choker
    const t = canvasTex(256, 128, (x) => { x.fillStyle = '#fbf7ee'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#d8a84a'; x.lineWidth = 8; x.strokeRect(4, 4, 248, 120); x.fillStyle = '#111'; x.font = "700 64px 'Space Grotesk', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$29.99', 128, 68); });
    const card = mat('card', { color: 0xf4efe4, roughness: 0.7 });
    add(new THREE.BoxGeometry(0.12, 0.003, 0.06), [card, card, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), card, card, card], 0, 0.002, 0);
    add(new THREE.BoxGeometry(0.004, 0.002, 0.09), dark(), -0.07, 0.003, 0.03, 0, 0.6, 0);
  } else if (kind === 'key') {   // A2: the brass house key, a pink enamel heart fob
    add(new THREE.TorusGeometry(0.035, 0.012, 8, 20), brass(), 0, 0.006, 0.05, Math.PI / 2); add(new THREE.BoxGeometry(0.014, 0.008, 0.1), brass(), 0, 0.006, -0.03); add(new THREE.BoxGeometry(0.03, 0.008, 0.012), brass(), 0.012, 0.006, -0.06);
    add(new THREE.TorusGeometry(0.022, 0.003, 6, 16), brass(), 0, 0.004, 0.095, Math.PI / 2); add(heart(), pink(), 0.02, 0.0, 0.07, -Math.PI / 2);
  } else if (kind === 'gavel') {   // A3: her gold gavel charm, snapped chain
    add(new THREE.CylinderGeometry(0.006, 0.007, 0.09, 10), gold(), 0, 0.01, 0, 0, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.016, 0.016, 0.05, 14), gold(), -0.045, 0.016, 0, Math.PI / 2); add(new THREE.TorusGeometry(0.05, 0.002, 4, 24, Math.PI * 1.3), gold(), 0.03, 0.004, 0, Math.PI / 2);
  } else if (kind === 'locket') {   // A4: a gold heart locket, a lily on the front
    add(heart(0.012), gold(), 0, 0.0, 0.0, -Math.PI / 2); add(new THREE.TorusGeometry(0.08, 0.0025, 4, 36), gold(), 0, 0.003, -0.07, Math.PI / 2);
  } else if (kind === 'teddy') {   // B2: the dead-eye teddy bear
    const fur = mat('fur', { color: 0x9a6a3e, roughness: 1 });
    add(new THREE.SphereGeometry(0.1, 16, 12), fur, 0, 0.1, 0); add(new THREE.SphereGeometry(0.075, 16, 12), fur, 0, 0.24, 0.01);
    for (const s of [-1, 1]) { add(new THREE.SphereGeometry(0.03, 10, 8), fur, s * 0.055, 0.31, 0); add(new THREE.SphereGeometry(0.035, 10, 8), fur, s * 0.1, 0.12, 0.03); add(new THREE.SphereGeometry(0.04, 10, 8), fur, s * 0.06, 0.03, 0.06); }
    add(new THREE.SphereGeometry(0.012, 8, 6), dark(), -0.028, 0.26, 0.072);
    add(new THREE.BoxGeometry(0.022, 0.004, 0.004), dark(), 0.03, 0.26, 0.074, 0, 0, 0.7); add(new THREE.BoxGeometry(0.022, 0.004, 0.004), dark(), 0.03, 0.26, 0.074, 0, 0, -0.7);
    add(new THREE.TorusGeometry(0.025, 0.008, 6, 12), gold(), 0, 0.19, 0.05, 0.3);
  } else if (kind === 'giltkey') {   // B3: her long gilt key, her kiss on the bow, lilac ribbon
    add(new THREE.TorusGeometry(0.04, 0.01, 8, 22), gold(), 0, 0.008, 0.07, Math.PI / 2); add(new THREE.BoxGeometry(0.012, 0.008, 0.17), gold(), 0, 0.008, -0.05); add(new THREE.BoxGeometry(0.036, 0.008, 0.014), gold(), 0.014, 0.008, -0.12);
    add(new THREE.BoxGeometry(0.03, 0.004, 0.12), lilac(), 0.02, 0.003, 0.15, 0, 0.3, 0); add(new THREE.SphereGeometry(0.012, 8, 6), mat('lips', { color: 0xc0103a, roughness: 0.3 }), 0, 0.014, 0.07);
  } else if (kind === 'star') {   // B4: the gold star she awarded herself, one point creased
    const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.022 : 0.055; const px = Math.cos(a) * r, py = Math.sin(a) * r; if (i) s.lineTo(px, py); else s.moveTo(px, py); } s.closePath();
    add(new THREE.ExtrudeGeometry(s, { depth: 0.002, bevelEnabled: false }), mat('foil', { color: 0xf2c24a, roughness: 0.22, metalness: 0.95 }), 0, 0.004, 0, -Math.PI / 2, 0, 0.12);
  } else if (kind === 'pin') {   // B5: the gold pull-ring from her last perfume grenade
    add(new THREE.TorusGeometry(0.03, 0.005, 8, 24), gold(), 0, 0.006, 0, Math.PI / 2); add(new THREE.BoxGeometry(0.004, 0.004, 0.06), gold(), 0.03, 0.006, 0.02, 0, 0.5, 0);
  } else if (kind === 'prize') {   // Bonus: a plastic prize ring from the bottom of the box
    add(new THREE.TorusGeometry(0.014, 0.004, 8, 20), mat('cobalt', { color: 0x1f4fd8, roughness: 0.35 }), 0, 0.014, 0); add(new THREE.OctahedronGeometry(0.012), mat('gem', { color: 0x9ad8ff, roughness: 0.1, metalness: 0.2 }), 0, 0.03, 0);
  } else if (kind === 'headlight') {   // B1: her car's one headlight, the lens that stayed lit
    const chrome = mat('chrome', { color: 0xd8d8dc, roughness: 0.12, metalness: 1 });
    const lens = mat('lens', { color: 0xfff2d8, roughness: 0.05, metalness: 0, emissive: 0xffd9a0, emissiveIntensity: 0.9, transparent: true, opacity: 0.92 });
    const bowl = mat('bowl', { color: 0xb8b8bc, roughness: 0.2, metalness: 1 });
    add(new THREE.TorusGeometry(0.068, 0.008, 10, 36), chrome, 0, 0.012, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.066, 0.05, 0.02, 32, 1, true), bowl, 0, 0.004, 0);
    const dome = new THREE.SphereGeometry(0.189, 32, 6, 0, Math.PI * 2, 0, 0.357); dome.translate(0, -0.177, 0);
    add(dome, lens, 0, 0.012, 0);
    add(new THREE.BoxGeometry(0.004, 0.003, 0.11), mat('rib', { color: 0xf6efe0, roughness: 0.1, transparent: true, opacity: 0.5 }), 0, 0.021, 0);
  } else if (kind === 'bag') {   // the credits: the plastic bag you walked out with
    const body = new THREE.LatheGeometry([[0, 0], [0.13, 0.0], [0.17, 0.08], [0.18, 0.2], [0.15, 0.3], [0.1, 0.34]].map(([a, b]) => new THREE.Vector2(a, b)), 14); body.scale(1, 1, 0.62);
    const m = mat('bag', { color: 0xf4f2ec, roughness: 0.55, side: THREE.DoubleSide });
    add(body, m, 0, 0, 0); for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.05, 0.008, 6, 14, Math.PI), m, s * 0.05, 0.34, 0);
  } else {   // anything else: a little gold heart
    add(heart(0.01), gold(), 0, 0, 0, -Math.PI / 2);
  }
  g.userData.kind = kind;
  return g;
}
