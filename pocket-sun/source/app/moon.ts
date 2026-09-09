export type Moon = { x: number; y: number; r: number; progress: number; solid: boolean };
export type MovingBody = { x: number; y: number; vx: number; vy: number; r: number };
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export const MOON_SCORE = 5000;
export const moonProgressForScore = (score: number) => clamp(score / MOON_SCORE, 0, 1);

export function moonLayout(width: number, height: number, progress: number, time: number): Moon {
  const p = clamp(progress, 0, 1), ease = p * p * (3 - 2 * p);
  const drift = (1 - ease) * (0.012 + p * 0.045);
  return {
    x: width * (0.77 - 0.27 * ease + Math.sin(time * 0.12) * drift),
    y: height * (0.23 + 0.27 * ease + Math.cos(time * 0.09) * drift * 0.55),
    r: Math.min(width * 0.36, height * 0.21) * (1 - ease) + Math.min(width, height) * 0.235 * ease,
    progress: p,
    solid: p >= 0.92,
  };
}

// Continuous relative-motion contact prevents a fast sun crossing the moon in one frame.
// Only inward velocity is reflected: objects already leaving the surface are never pulled back.
export function bounceOffMoon(body: MovingBody, start: { x: number; y: number }, moon: Moon, previous: Moon, dt: number, slingshot = false) {
  if (!moon.solid) return false;
  const radius = moon.r + body.r;
  const sx = start.x - previous.x, sy = start.y - previous.y;
  const dx = body.x - moon.x - sx, dy = body.y - moon.y - sy;
  const a = dx * dx + dy * dy, b = 2 * (sx * dx + sy * dy), c = sx * sx + sy * sy - radius * radius;
  const disc = b * b - 4 * a * c;
  const hitTime = a > 1e-8 && disc >= 0 ? (-b - Math.sqrt(disc)) / (2 * a) : -1;
  const overlapping = Math.hypot(body.x - moon.x, body.y - moon.y) < radius;
  if (!overlapping && (hitTime < 0 || hitTime > 1)) return false;
  const hx = hitTime >= 0 && hitTime <= 1 ? sx + dx * hitTime : body.x - moon.x;
  const hy = hitTime >= 0 && hitTime <= 1 ? sy + dy * hitTime : body.y - moon.y;
  const length = Math.hypot(hx, hy);
  const nx = length > 0.001 ? hx / length : 0, ny = length > 0.001 ? hy / length : -1;
  body.x = moon.x + nx * (radius + 0.75);
  body.y = moon.y + ny * (radius + 0.75);
  const mvx = (moon.x - previous.x) / Math.max(dt, 0.001), mvy = (moon.y - previous.y) / Math.max(dt, 0.001);
  let vx = body.vx - mvx, vy = body.vy - mvy;
  const inward = vx * nx + vy * ny;
  if (inward >= 0) return false;
  vx -= 2 * inward * nx; vy -= 2 * inward * ny;
  if (slingshot) {
    const tangent = -vx * ny + vy * nx;
    const direction = tangent < 0 ? -1 : 1;
    const outward = clamp(-inward * 0.8, 180, 510);
    const sideways = direction * clamp(Math.abs(tangent) + 190, 210, 630);
    vx = nx * outward - ny * sideways; vy = ny * outward + nx * sideways;
  }
  body.vx = vx + mvx; body.vy = vy + mvy;
  const speed = Math.hypot(body.vx, body.vy);
  if (slingshot && speed > 900) { body.vx *= 900 / speed; body.vy *= 900 / speed; }
  return true;
}

export function pushOutsideMoon(body: { x: number; y: number; r: number }, moon: Moon, padding = 0) {
  if (!moon.solid) return;
  const dx = body.x - moon.x, dy = body.y - moon.y, length = Math.hypot(dx, dy);
  const distance = moon.r + body.r + padding;
  if (length >= distance) return;
  body.x = moon.x + (length > 0.001 ? dx / length : 0) * distance;
  body.y = moon.y + (length > 0.001 ? dy / length : -1) * distance;
}
