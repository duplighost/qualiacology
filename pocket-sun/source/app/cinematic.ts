import type { Moon } from "./moon";
// Procedural materials are baked once; gameplay only composites cached surfaces.
// The visual seed is independent of gameplay randomness and saved progress.
const fract = (v: number) => v - Math.floor(v);
const hash = (x: number, y: number) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
const lattice = Float32Array.from({ length: 65536 }, (_, i) => hash(i & 255, i >>> 8));
const sample = (x: number, y: number) => lattice[(x & 255) + (y & 255) * 256];
const smooth = (v: number) => v * v * (3 - 2 * v);
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(fract(x)), fy = smooth(fract(y));
  const a = sample(ix, iy), b = sample(ix + 1, iy), c = sample(ix, iy + 1), d = sample(ix + 1, iy + 1);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
function fbm(x: number, y: number, octaves = 5) {
  let result = 0, weight = 0.5;
  for (let i = 0; i < octaves; i++) {
    result += noise(x, y) * weight;
    x = x * 2.03 + 12.7; y = y * 2.01 + 7.9; weight *= 0.5;
  }
  return result;
}
function surface(size: number, pixel: (x: number, y: number) => number[]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const data = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    data.data.set(pixel((x + 0.5) / size, (y + 0.5) / size), (y * size + x) * 4);
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

export function createCinematicMaterials() {
  const palettes = [[55, 154, 205, 244, 119, 98], [104, 67, 216, 246, 131, 205], [242, 159, 62, 255, 225, 148], [26, 154, 165, 132, 237, 202]];
  const nebulae = palettes.map((palette, index) => surface(512, (x, y) => {
    const ox = x * 4 + index * 23, oy = y * 4 + index * 11;
    const warp = fbm(ox, oy);
    const n = fbm(ox * 2 + warp * 3, oy * 2 - warp * 3);
    const angle = Math.atan2(y - 0.5, x - 0.5), radius = Math.hypot(x - 0.5, y - 0.5);
    const geometry = index === 0 ? x - y * 0.7 - 0.2
      : index === 1 ? radius - 0.28 - Math.sin(angle * 3 + warp) * 0.08
      : index === 2 ? y - 0.5 - Math.sin(x * 6 + warp * 3) * 0.23
      : x - 0.5 - Math.sin(y * 8 + warp * 3) * 0.24;
    const band = Math.exp(-Math.pow((geometry + warp * 0.1) * 4.5, 2));
    const filament = Math.pow(Math.max(0, 1 - Math.abs(n - 0.5) * 5.3), 3);
    const cloud = Math.pow(n, 2) * 0.35;
    const light = (filament * 0.62 + cloud) * band;
    const warm = smooth(Math.min(1, Math.max(0, warp * 1.7 - 0.25)));
    return [3 + light * (palette[0] * (1 - warm) + palette[3] * warm),
      5 + light * (palette[1] * (1 - warm) + palette[4] * warm),
      12 + light * (palette[2] * (1 - warm) + palette[5] * warm), 255];
  }));
  const sun = surface(192, (u, v) => {
    const x = u * 2 - 1, y = v * 2 - 1, r2 = x * x + y * y;
    if (r2 > 1) return [0, 0, 0, 0];
    const z = Math.sqrt(1 - r2);
    const longitude = Math.atan2(x, z), latitude = Math.asin(y);
    const turbulence = fbm(longitude * 8 + 30, latitude * 8 + 30);
    const cells = noise(longitude * 62 + turbulence * 9, latitude * 62 + turbulence * 9);
    const veins = Math.pow(1 - Math.abs(turbulence - 0.48) * 2, 8);
    const limb = 0.48 + z * 0.52;
    const heat = (0.35 + cells * 0.4 + veins * 0.5) * limb;
    return [255 * (0.86 + heat * 0.14), 65 + heat * 174, 12 + Math.pow(heat, 2) * 156, Math.min(255, (1 - r2) * 9000)];
  });
  const planet = surface(320, (u, v) => {
    const x = u * 2 - 1, y = v * 2 - 1, r2 = x * x + y * y;
    if (r2 > 1) return [0, 0, 0, 0];
    const z = Math.sqrt(1 - r2);
    const light = Math.max(0, -x * 0.65 - y * 0.5 + z * 0.35);
    const land = fbm(Math.atan2(x, z) * 9 + 15, Math.asin(y) * 9 + 15);
    const clouds = Math.pow(fbm(x * 15 + land * 4, y * 15 + land * 3), 3);
    const rim = Math.pow(1 - z, 4) * Math.max(0, -x - y) * 0.8;
    const terrain = 0.35 + land * 0.9;
    return [3 + light * terrain * 32 + clouds * light * 55 + rim * 35,
      5 + light * terrain * 54 + clouds * light * 72 + rim * 108,
      9 + light * terrain * 70 + clouds * light * 90 + rim * 165,
      Math.min(255, (1 - r2) * 13000)];
  });
  const awakeMoon = surface(320, (u, v) => {
    const x = u * 2 - 1, y = v * 2 - 1, r2 = x * x + y * y;
    if (r2 > 1) return [0, 0, 0, 0];
    const z = Math.sqrt(1 - r2), grain = fbm(x * 14 + 27, y * 14 + 15);
    const lighting = Math.max(0.06, -x * 0.18 - y * 0.28 + z * 0.8);
    const detail = 0.7 + grain * 0.5, glow = Math.pow(1 - z, 5);
    return [15 + lighting * detail * 188 + glow * 75, 22 + lighting * detail * 182 + glow * 101,
      38 + lighting * detail * 200 + glow * 149, Math.min(255, (1 - r2) * 13000)];
  });
  return { nebulae, sun, planet, awakeMoon };
}

export function drawDeepSpace(ctx: CanvasRenderingContext2D, materials: ReturnType<typeof createCinematicMaterials>, width: number, height: number, time: number, progress: number, cool: string, hot: string) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#03060d"; ctx.fillRect(0, 0, width, height);
  const span = Math.max(width, height);
  const phase = time / 34 + progress * 2.4;
  const first = Math.floor(phase) % materials.nebulae.length;
  const blend = smooth(fract(phase));
  for (let layer = 0; layer < 2; layer++) {
    ctx.globalAlpha = layer === 0 ? 1 : blend;
    ctx.save();
    ctx.translate(width * 0.5, height * 0.5);
    ctx.rotate(Math.sin(time * 0.025 + first + layer) * 0.085);
    ctx.drawImage(materials.nebulae[(first + layer) % materials.nebulae.length], -width * 0.65, -height * 0.65, width * 1.3, height * 1.3);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "screen";
  const wash = ctx.createRadialGradient(width * 0.7, height * 0.75, 0, width * 0.7, height * 0.75, span * 0.7);
  const translucent = (color: string, opacity: number) => color.startsWith("rgb(") ? color.replace(")", ` / ${opacity})`) : color + Math.round(opacity * 255).toString(16).padStart(2, "0");
  wash.addColorStop(0, translucent(hot, 0.09)); wash.addColorStop(0.5, translucent(cool, 0.03)); wash.addColorStop(1, "#00000000");
  ctx.fillStyle = wash; ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 270; i++) {
    const depth = hash(i, 71);
    const x = (hash(i, 3) * width + Math.sin(time * 0.018) * depth * 12 + width) % width;
    const y = (hash(i, 9) * height + time * depth * 0.3) % height;
    const radius = depth > 0.985 ? 1.35 : 0.25 + depth * 0.58;
    ctx.globalAlpha = 0.2 + depth * 0.65 + Math.sin(time * 0.7 + i) * 0.1;
    ctx.fillStyle = i % 7 === 0 ? "#eebc91" : "#c6deee";
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    if (depth > 0.985) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 13);
      glow.addColorStop(0, "#c8eaff55"); glow.addColorStop(1, "#b5dfff00");
      ctx.fillStyle = glow; ctx.fillRect(x - 13, y - 13, 26, 26);
    }
  }
  ctx.restore();
}

export function drawMoon(ctx: CanvasRenderingContext2D, materials: ReturnType<typeof createCinematicMaterials>, moon: Moon, time: number, impact: number) {
  const { x, y, r, progress } = moon;
  const face = smooth(moon.face ?? (progress === 1 ? 1 : 0));
  ctx.save();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0;
  ctx.translate(x, y);
  const halo = ctx.createRadialGradient(0, 0, r * 0.85, 0, 0, r * 1.55);
  halo.addColorStop(0, `rgba(130,191,255,${0.1 + progress * 0.18 + impact * 0.1})`);
  halo.addColorStop(1, "#8abfff00");
  ctx.fillStyle = halo; ctx.fillRect(-r * 1.55, -r * 1.55, r * 3.1, r * 3.1);
  ctx.drawImage(materials.planet, -r, -r, r * 2, r * 2);
  ctx.globalAlpha = face;
  ctx.drawImage(materials.awakeMoon, -r, -r, r * 2, r * 2);
  if (face > 0) {
    ctx.rotate(Math.sin(time * 0.5) * 0.016 * face);
    ctx.strokeStyle = "#141e35"; ctx.lineCap = "round"; ctx.lineWidth = r * 0.045;
    // Upturned eyes and a broad, softly lit crescent smile emerge with the surface.
    for (const direction of [-1, 1]) {
      const ex = direction * r * 0.33;
      ctx.beginPath(); ctx.moveTo(ex - r * 0.14, -r * 0.13);
      ctx.quadraticCurveTo(ex, -r * (0.25 + face * 0.045), ex + r * 0.14, -r * 0.13); ctx.stroke();
      const cheek = ctx.createRadialGradient(ex, r * 0.06, 0, ex, r * 0.06, r * 0.21);
      cheek.addColorStop(0, "#ffafab35"); cheek.addColorStop(1, "#ffafab00");
      ctx.fillStyle = cheek; ctx.fillRect(ex - r * 0.21, -r * 0.15, r * 0.42, r * 0.42);
    }
    const smileWidth = r * (0.29 + face * 0.28);
    ctx.beginPath(); ctx.moveTo(-smileWidth, r * 0.13);
    ctx.quadraticCurveTo(0, r * 0.36, smileWidth, r * 0.13);
    ctx.bezierCurveTo(r * 0.42, r * (0.42 + face * 0.21), -r * 0.42, r * (0.42 + face * 0.21), -smileWidth, r * 0.13);
    ctx.closePath();
    const grin = ctx.createLinearGradient(0, r * 0.13, 0, r * 0.58);
    grin.addColorStop(0, "#fff3ce"); grin.addColorStop(0.55, "#fffcf1"); grin.addColorStop(1, "#a7cadd");
    ctx.fillStyle = grin; ctx.fill(); ctx.lineWidth = r * 0.018; ctx.stroke();
  }
  // The physical rim becomes visible before the moon becomes solid.
  ctx.globalAlpha = face * 0.6;
  ctx.strokeStyle = "#dcecff"; ctx.lineWidth = 1.1 + impact * 2;
  ctx.beginPath(); ctx.arc(0, 0, r + 0.5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
