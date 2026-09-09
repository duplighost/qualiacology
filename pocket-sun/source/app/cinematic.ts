// Procedural materials are baked once; gameplay only composites cached surfaces.
// The visual seed is independent of gameplay randomness and saved progress.
const fract = (v: number) => v - Math.floor(v);
const hash = (x: number, y: number) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
const smooth = (v: number) => v * v * (3 - 2 * v);
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(fract(x)), fy = smooth(fract(y));
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
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
  const nebula = surface(640, (x, y) => {
    const warp = fbm(x * 3.8, y * 3.8);
    const n = fbm(x * 7 + warp * 3, y * 7 - warp * 2);
    const filament = Math.pow(Math.max(0, 1 - Math.abs(n - 0.48) * 7), 3);
    const band = Math.exp(-Math.pow((x - y * 0.6 - 0.25 + warp * 0.2) * 3.5, 2));
    const dust = fbm(x * 22, y * 22, 3);
    const light = filament * band * (0.3 + dust) * 0.8;
    const warm = smooth(Math.min(1, Math.max(0, y * 1.8 - x * 0.55)));
    const occlusion = Math.pow(fbm(x * 11 + 6, y * 11), 2) * 0.7;
    return [3 + light * (48 + warm * 100) * (1 - occlusion),
      6 + light * (76 + warm * 14) * (1 - occlusion),
      12 + light * (110 - warm * 67) * (1 - occlusion), 255];
  });
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
  return { nebula, sun, planet };
}

export function drawDeepSpace(ctx: CanvasRenderingContext2D, materials: ReturnType<typeof createCinematicMaterials>, width: number, height: number, time: number, stage: number, cool: string, hot: string) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#03060d"; ctx.fillRect(0, 0, width, height);
  const span = Math.max(width, height);
  // Slow parallax leaves the gesture and moving targets as the dominant motion.
  ctx.drawImage(materials.nebula, -width * 0.12 + Math.sin(time * 0.018) * 8, -height * 0.1, width * 1.25, height * 1.2);
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
  ctx.globalAlpha = 0.85;
  ctx.globalCompositeOperation = "source-over";
  const diameter = Math.min(width * 0.72, height * 0.42);
  const px = width * 0.77 + Math.sin(stage * 1.1) * width * 0.1;
  const py = height * 0.22 + Math.cos(stage * 0.7) * height * 0.025;
  ctx.drawImage(materials.planet, px - diameter * 0.5, py - diameter * 0.5, diameter, diameter);
  ctx.restore();
}
