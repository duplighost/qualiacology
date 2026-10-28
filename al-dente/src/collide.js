// Collision for a sphere hero against simple solids that match the visuals:
// boxes (lasagna stacks, rod planks), vertical cylinders (bundles, pillars),
// a hollow tube with a doorway (the giant rigatoni), capsules (rods, logs),
// spheres (snails), and the meadow heightfield.
import { clamp } from './util.js';

const TAU = Math.PI * 2;

export class Colliders {
  constructor(heightFn) {
    this.list = [];
    this.heightAt = heightFn;
    this._c = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, d: 0 };
  }
  add(c) {
    c.active = c.active ?? true;
    c.sticky = c.sticky ?? false;
    c.surface = c.surface ?? 'cooked';
    if (c.type === 'box') { c.cos = Math.cos(c.rot || 0); c.sin = Math.sin(c.rot || 0); const r = Math.hypot(c.hx, c.hz); c.bx0 = c.x - r; c.bx1 = c.x + r; c.bz0 = c.z - r; c.bz1 = c.z + r; c.by0 = c.y - c.hy; c.by1 = c.y + c.hy; }
    else if (c.type === 'cyl') { c.bx0 = c.x - c.r; c.bx1 = c.x + c.r; c.bz0 = c.z - c.r; c.bz1 = c.z + c.r; c.by0 = c.y0; c.by1 = c.y1; }
    else if (c.type === 'tube') { c.bx0 = c.x - c.r1; c.bx1 = c.x + c.r1; c.bz0 = c.z - c.r1; c.bz1 = c.z + c.r1; c.by0 = c.y0; c.by1 = c.y1; }
    else if (c.type === 'capsule') { c.bx0 = Math.min(c.ax, c.bx) - c.r; c.bx1 = Math.max(c.ax, c.bx) + c.r; c.bz0 = Math.min(c.az, c.bz) - c.r; c.bz1 = Math.max(c.az, c.bz) + c.r; c.by0 = Math.min(c.ay, c.by) - c.r; c.by1 = Math.max(c.ay, c.by) + c.r; }
    else if (c.type === 'sphere') { this.refreshSphere(c); }
    this.list.push(c);
    return c;
  }
  refreshSphere(c) { c.bx0 = c.x - c.r; c.bx1 = c.x + c.r; c.bz0 = c.z - c.r; c.bz1 = c.z + c.r; c.by0 = c.y - c.r; c.by1 = c.y + c.r; }
  refreshBox(c) { this.list.includes(c); c.cos = Math.cos(c.rot || 0); c.sin = Math.sin(c.rot || 0); const r = Math.hypot(c.hx, c.hz); c.bx0 = c.x - r; c.bx1 = c.x + r; c.bz0 = c.z - r; c.bz1 = c.z + r; c.by0 = c.y - c.hy; c.by1 = c.y + c.hy; }

  // Closest-point contact for one collider. Writes into this._c, returns true if within r.
  contact(c, px, py, pz, r) {
    const o = this._c;
    if (c.type === 'box') {
      const dx = px - c.x, dy = py - c.y, dz = pz - c.z;
      const lx = c.cos * dx - c.sin * dz, lz = c.sin * dx + c.cos * dz, ly = dy;
      const qx = clamp(lx, -c.hx, c.hx), qy = clamp(ly, -c.hy, c.hy), qz = clamp(lz, -c.hz, c.hz);
      let nx = lx - qx, ny = ly - qy, nz = lz - qz;
      let d2 = nx * nx + ny * ny + nz * nz, depth;
      if (d2 > 1e-10) {
        if (d2 >= r * r) return false;
        const d = Math.sqrt(d2); nx /= d; ny /= d; nz /= d; depth = r - d;
      } else {
        const ex = c.hx - Math.abs(lx), ey = c.hy - Math.abs(ly), ez = c.hz - Math.abs(lz);
        if (ey <= ex && ey <= ez) { nx = 0; ny = Math.sign(ly) || 1; nz = 0; depth = r + ey; }
        else if (ex <= ez) { nx = Math.sign(lx) || 1; ny = 0; nz = 0; depth = r + ex; }
        else { nx = 0; ny = 0; nz = Math.sign(lz) || 1; depth = r + ez; }
      }
      // back to world (inverse rotation)
      o.nx = c.cos * nx + c.sin * nz; o.ny = ny; o.nz = -c.sin * nx + c.cos * nz; o.d = depth;
      return true;
    }
    if (c.type === 'cyl') {
      const dx = px - c.x, dz = pz - c.z, rho = Math.hypot(dx, dz);
      const qy = clamp(py, c.y0, c.y1);
      let qx, qz;
      if (rho > c.r) { qx = c.x + dx / rho * c.r; qz = c.z + dz / rho * c.r; } else { qx = px; qz = pz; }
      let nx = px - qx, ny = py - qy, nz = pz - qz;
      const d2 = nx * nx + ny * ny + nz * nz;
      if (d2 > 1e-10) {
        if (d2 >= r * r) return false;
        const d = Math.sqrt(d2); o.nx = nx / d; o.ny = ny / d; o.nz = nz / d; o.d = r - d; return true;
      }
      const eSide = c.r - rho, eTop = c.y1 - py, eBot = py - c.y0;
      if (eTop <= eSide && eTop <= eBot) { o.nx = 0; o.ny = 1; o.nz = 0; o.d = r + eTop; }
      else if (eBot <= eSide) { o.nx = 0; o.ny = -1; o.nz = 0; o.d = r + eBot; }
      else { const k = rho > 1e-6 ? 1 / rho : 0; o.nx = dx * k || 1; o.ny = 0; o.nz = dz * k; o.d = r + eSide; }
      return true;
    }
    if (c.type === 'tube') return this.tubeContact(c, px, py, pz, r);
    if (c.type === 'capsule') {
      const ax = c.ax, ay = c.ay, az = c.az, bx = c.bx - ax, by = c.by - ay, bz = c.bz - az;
      const t = clamp(((px - ax) * bx + (py - ay) * by + (pz - az) * bz) / (bx * bx + by * by + bz * bz), 0, 1);
      const nx = px - (ax + bx * t), ny = py - (ay + by * t), nz = pz - (az + bz * t);
      const d2 = nx * nx + ny * ny + nz * nz, rr = r + c.r;
      if (d2 >= rr * rr) return false;
      const d = Math.sqrt(d2) || 1e-6; o.nx = nx / d; o.ny = ny / d; o.nz = nz / d; o.d = rr - d; o.t = t;
      return true;
    }
    if (c.type === 'sphere') {
      const nx = px - c.x, ny = py - c.y, nz = pz - c.z, d2 = nx * nx + ny * ny + nz * nz, rr = r + c.r;
      if (d2 >= rr * rr) return false;
      const d = Math.sqrt(d2) || 1e-6; o.nx = nx / d; o.ny = ny / d; o.nz = nz / d; o.d = rr - d;
      return true;
    }
    return false;
  }

  // Hollow upright tube (annulus r0..r1, y0..y1) with an arched-off doorway notch at the base.
  tubeContact(c, px, py, pz, r) {
    const o = this._c;
    const dx = px - c.x, dz = pz - c.z, rho = Math.hypot(dx, dz) || 1e-6;
    const ux = dx / rho, uz = dz / rho;
    const th = Math.atan2(dz, dx);
    let notch = c.notch;
    if (c.notches) { let bd = 9; for (const n of c.notches) { const d = Math.abs(Math.atan2(Math.sin(th - n.angle), Math.cos(th - n.angle))); if (d < bd) { bd = d; notch = n; } } }
    let inNotch = false, dTh = 0;
    if (notch) {
      dTh = Math.atan2(Math.sin(th - notch.angle), Math.cos(th - notch.angle));
      inNotch = Math.abs(dTh) < notch.half && py < c.y0 + notch.h;
    }
    if (!inNotch) {
      const qr = clamp(rho, c.r0, c.r1), qy = clamp(py, c.y0, c.y1);
      const ny0 = py - qy, nr = rho - qr;
      const d2 = nr * nr + ny0 * ny0;
      let best = null;
      if (d2 > 1e-10) {
        if (d2 < r * r) { const d = Math.sqrt(d2); best = { nx: ux * nr / d, ny: ny0 / d, nz: uz * nr / d, d: r - d }; }
      } else {
        // inside the wall: smallest way out (inner face, outer face, top, bottom, notch jamb)
        const opts = [
          { e: rho - c.r0, nx: -ux, ny: 0, nz: -uz },
          { e: c.r1 - rho, nx: ux, ny: 0, nz: uz },
          { e: c.y1 - py, nx: 0, ny: 1, nz: 0 },
          { e: py - c.y0, nx: 0, ny: -1, nz: 0 },
        ];
        if (notch && py < c.y0 + notch.h) {
          const arc = (Math.abs(dTh) - notch.half) * rho;
          const s = Math.sign(dTh) || 1; // push back toward the notch opening (tangent)
          opts.push({ e: arc, nx: uz * s, ny: 0, nz: -ux * s });
        }
        if (notch && Math.abs(dTh) < notch.half && py >= c.y0 + notch.h) {
          opts.push({ e: py - (c.y0 + notch.h), nx: 0, ny: -1, nz: 0 }); // under the arch
        }
        let m = opts[0];
        for (const q of opts) if (q.e < m.e) m = q;
        best = { nx: m.nx, ny: m.ny, nz: m.nz, d: r + m.e };
      }
      // near a jamb but outside the notch: also test the jamb plane
      if (notch && py < c.y0 + notch.h + r && rho > c.r0 - r && rho < c.r1 + r) {
        const j = this.jamb(c, notch, px, py, pz, r, rho, th, dTh);
        if (j && (!best || j.d > best.d)) best = j;
      }
      if (!best) return false;
      o.nx = best.nx; o.ny = best.ny; o.nz = best.nz; o.d = best.d;
      return true;
    }
    // inside the doorway: jambs and the arch above
    const j = this.jamb(c, notch, px, py, pz, r, rho, th, dTh);
    const top = c.y0 + notch.h;
    let best = j;
    if (rho > c.r0 - r && rho < c.r1 + r) {
      const dy = top - py;
      if (dy < r) { const cand = { nx: 0, ny: -1, nz: 0, d: r - dy }; if (!best || cand.d > best.d) best = cand; }
    }
    if (!best) return false;
    o.nx = best.nx; o.ny = best.ny; o.nz = best.nz; o.d = best.d;
    return true;
  }
  jamb(c, notch, px, py, pz, r, rho, th, dTh) {
    // the two jamb faces are vertical planes at angle notch.angle ± half, spanning rho in [r0, r1]
    let best = null;
    for (const s of [-1, 1]) {
      const a = notch.angle + s * notch.half;
      const ex = Math.cos(a), ez = Math.sin(a); // radial direction of the jamb
      const tx = ez * s, tz = -ex * s;           // normal pointing into the doorway
      const rx = px - c.x, rz = pz - c.z;
      const along = clamp(rx * ex + rz * ez, c.r0, c.r1);
      const off = rx * tx + rz * tz; // signed distance from the jamb plane (positive = in doorway)
      // only the doorway side of the plane matters here; inside the wall the annulus handles it
      if (off < 0) continue;
      const qy = clamp(py, c.y0, c.y0 + notch.h);
      const qx = c.x + ex * along, qz = c.z + ez * along;
      const nx = px - qx, ny = py - qy, nz = pz - qz;
      const d2 = nx * nx + ny * ny + nz * nz;
      if (d2 >= r * r) continue;
      const d = Math.sqrt(d2);
      const cand = d > 1e-5 ? { nx: nx / d, ny: ny / d, nz: nz / d, d: r - d } : { nx: tx, ny: 0, nz: tz, d: r };
      if (!best || cand.d > best.d) best = cand;
    }
    return best;
  }

  /**
   * Push sphere (pos {x,y,z}) out of everything. Fills `contacts` with
   * { nx, ny, nz, c } (c = collider or 'ground'). Returns the contacts array.
   */
  resolve(pos, r, contacts, skip) {
    contacts.length = 0;
    for (let iter = 0; iter < 4; iter++) {
      let moved = false;
      for (const c of this.list) {
        if (!c.active || c === skip) continue;
        if (pos.x + r < c.bx0 || pos.x - r > c.bx1 || pos.z + r < c.bz0 || pos.z - r > c.bz1 || pos.y + r < c.by0 || pos.y - r > c.by1) continue;
        if (this.contact(c, pos.x, pos.y, pos.z, r)) {
          const o = this._c;
          if (o.d <= 1e-6) continue;
          pos.x += o.nx * o.d; pos.y += o.ny * o.d; pos.z += o.nz * o.d;
          moved = true;
          if (iter === 0 || !contacts.some(k => k.c === c)) contacts.push({ nx: o.nx, ny: o.ny, nz: o.nz, c, t: o.t });
        }
      }
      const h = this.heightAt(pos.x, pos.z);
      if (pos.y - r < h) {
        const n = this.groundNormal(pos.x, pos.z);
        pos.y = h + r;
        if (!contacts.some(k => k.c === 'ground')) contacts.push({ nx: n.x, ny: n.y, nz: n.z, c: 'ground' });
        moved = true;
      }
      if (!moved) break;
    }
    return contacts;
  }

  groundNormal(x, z) {
    const e = 0.25;
    const hx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    const hz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    const l = Math.hypot(hx, 2 * e, hz);
    this._n = this._n || { x: 0, y: 1, z: 0 };
    this._n.x = -hx / l; this._n.y = 2 * e / l; this._n.z = -hz / l;
    return this._n;
  }

  // Highest solid surface below (x, y, z) within reach: for drop shadows, snapping, spawns.
  floorBelow(x, y, z, reach = 50) {
    let best = this.heightAt(x, z);
    for (const c of this.list) {
      if (!c.active) continue;
      if (x < c.bx0 || x > c.bx1 || z < c.bz0 || z > c.bz1) continue;
      let top = null;
      if (c.type === 'box') {
        const dx = x - c.x, dz = z - c.z, lx = c.cos * dx - c.sin * dz, lz = c.sin * dx + c.cos * dz;
        if (Math.abs(lx) <= c.hx && Math.abs(lz) <= c.hz) top = c.y + c.hy;
      } else if (c.type === 'cyl') { if (Math.hypot(x - c.x, z - c.z) <= c.r) top = c.y1; }
      else if (c.type === 'tube') { const rho = Math.hypot(x - c.x, z - c.z); if (rho >= c.r0 && rho <= c.r1) top = c.y1; }
      if (top !== null && top <= y + 0.05 && top > best && y - top < reach) best = top;
    }
    return best;
  }

  // Ray against everything (for the camera). Returns hit distance or maxDist.
  raycast(ox, oy, oz, dx, dy, dz, maxDist, ignoreTube = false) {
    let best = maxDist;
    for (const c of this.list) {
      if (!c.active || c.noCamera) continue;
      let t = Infinity;
      if (c.type === 'box') t = rayBox(c, ox, oy, oz, dx, dy, dz);
      else if (c.type === 'cyl') t = rayCyl(c.x, c.z, c.r, c.y0, c.y1, ox, oy, oz, dx, dy, dz);
      else if (c.type === 'tube' && !ignoreTube) t = Math.hypot(ox - c.x, oz - c.z) < c.r0 && oy > c.y0 && oy < c.y1 ? rayInside(c.x, c.z, c.r0, ox, oz, dx, dz) : rayCyl(c.x, c.z, c.r1, c.y0, c.y1, ox, oy, oz, dx, dy, dz, true);
      if (t < best) best = t;
    }
    // heightfield march
    let prevT = 0, prevAbove = oy - this.heightAt(ox, oz);
    for (let t = 0.4; t < best; t += 0.4) {
      const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t;
      const above = y - this.heightAt(x, z);
      if (above < 0.15) {
        const k = prevAbove / Math.max(prevAbove - above, 1e-4);
        best = Math.min(best, prevT + (t - prevT) * clamp(k, 0, 1));
        break;
      }
      prevT = t; prevAbove = above;
    }
    return best;
  }
}

function rayBox(c, ox, oy, oz, dx, dy, dz) {
  const rx = ox - c.x, rz = oz - c.z;
  const lox = c.cos * rx - c.sin * rz, loz = c.sin * rx + c.cos * rz, loy = oy - c.y;
  const ldx = c.cos * dx - c.sin * dz, ldz = c.sin * dx + c.cos * dz, ldy = dy;
  let t0 = -Infinity, t1 = Infinity;
  const ax = [[lox, ldx, c.hx], [loy, ldy, c.hy], [loz, ldz, c.hz]];
  for (const [o, d, h] of ax) {
    if (Math.abs(d) < 1e-9) { if (o < -h || o > h) return Infinity; continue; }
    let a = (-h - o) / d, b = (h - o) / d;
    if (a > b) { const tmp = a; a = b; b = tmp; }
    if (a > t0) t0 = a; if (b < t1) t1 = b;
    if (t0 > t1) return Infinity;
  }
  if (t1 < 0) return Infinity;
  return t0 > 0 ? t0 : Infinity; // ray starting inside: ignore
}

function rayInside(cx, cz, r, ox, oz, dx, dz) {
  const fx = ox - cx, fz = oz - cz, a = dx * dx + dz * dz;
  if (a < 1e-9) return Infinity;
  const b = 2 * (fx * dx + fz * dz), cc = fx * fx + fz * fz - r * r;
  const disc = b * b - 4 * a * cc;
  if (disc < 0) return Infinity;
  return (-b + Math.sqrt(disc)) / (2 * a);
}

function rayCyl(cx, cz, r, y0, y1, ox, oy, oz, dx, dy, dz) {
  const fx = ox - cx, fz = oz - cz;
  const a = dx * dx + dz * dz;
  if (a < 1e-9) return Infinity;
  const b = 2 * (fx * dx + fz * dz), cc = fx * fx + fz * fz - r * r;
  const disc = b * b - 4 * a * cc;
  if (disc < 0) return Infinity;
  const s = Math.sqrt(disc);
  const t = (-b - s) / (2 * a);
  if (t <= 0) return Infinity;
  const y = oy + dy * t;
  if (y < y0 || y > y1) {
    // cap hit
    const tc = dy !== 0 ? ((dy < 0 ? y1 : y0) - oy) / dy : Infinity;
    if (tc > 0) { const x = ox + dx * tc - cx, z = oz + dz * tc - cz; if (x * x + z * z <= r * r) return tc; }
    return Infinity;
  }
  return t;
}

export { TAU };
