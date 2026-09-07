// CURFEW — WHAT IS LEFT OF PEOPLE. Owner: shared between the staged lane and the places lane.
//
// Alex, 2026-09-07: "there should be a lot more environmental story telling in areas with
// realistic bodies and skeletons and everything you can brainstorm."
//
// This module exists so the county and the Holdfast build their dead out of the same
// primitives. Everything here is kit geometry welded into whatever site calls it: no mesh of
// its own, no material, no draw call, no program. A skeleton in this game costs the same as
// a fence post, which is the only reason there can be sixty of them.
//
// THE THREE RULES EVERY PROP HERE FOLLOWS
//
//  1. IT STANDS ON groundY, NEVER ON padY. A scene is laid on a hill as often as on a pad,
//     and a body that hovers is worse than no body.
//  2. IT EMITS ITS COLLIDER IN THE SAME STATEMENT THAT LAYS ITS GEOMETRY, tagged 'body' and
//     standable at ankle height — you walk over the dead, you do not walk into them.
//  3. IT REGISTERS ITSELF WITH THE SEARCH LANE through api.body(), so holding E over it can
//     find it. A body you cannot go through is scenery; a body you can is a beat.
//
// VALUE. Bone is the one pale thing in the file and it is small and it is on the ground,
// which is where a pale thing is allowed to be. Everything else is at or under C.dark.

import { C, groundY, ON_APRON } from './sites.js';

const shade = (col, k) => [col[0] * k, col[1] * k, col[2] * k];

// MEASURED, FIRST PASS: at 0.196 the pit put 18.3% of the frame over luma 150 with the torch
// on, and the bone field 12.0%, against ART 0.3 row 12's 1.5% ration. A torch is a 560 cd
// source and bone is the only pale surface it ever lands on at two metres. Halved. It still
// reads as bone, because bone against wet soil is a CONTRAST and not a brightness.
export const BONE = Object.freeze({
  pale: [0.098, 0.092, 0.079],
  dark: [0.064, 0.060, 0.051],
  socket: [0.004, 0.004, 0.005],
  rag: [0.034, 0.031, 0.027],
});

/**
 * A person who has been lying here long enough to be bone.
 *
 * Twenty primitives: a ribcage of five rings, a spine, a pelvis, a skull turned away with two
 * sockets that are VOID rather than dark, and five long bones thrown about within a metre.
 * The rings are the hound's own cage trick one scale up — it is the read that says ribcage
 * from three metres and says nothing at all from thirty, which is correct.
 */
export function skeleton(k, api, lx, lz, yaw, rng) {
  const s = k.solid || k;
  const g = groundY(api, lx, lz) + ON_APRON;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const put = (ox, oz) => [lx + ox * cy + oz * sy, lz - ox * sy + oz * cy];

  s.quad(0.86, 1.28, lx, g + 0.006, lz, BONE.rag, yaw, -Math.PI * 0.5);
  for (let i = 0; i < 5; i++) {
    const [rx, rz] = put(0, 0.10 + i * 0.115);
    const r = 0.13 - Math.abs(i - 2) * 0.018;
    s.cyl(r, r, 0.035, 7, rx, g + 0.10, rz, BONE.pale, yaw, Math.PI * 0.5, 0);
  }
  const [spx, spz] = put(0, 0.34);
  s.cyl(0.035, 0.035, 0.62, 5, spx, g + 0.06, spz, BONE.dark, yaw, Math.PI * 0.5);
  const [pvx, pvz] = put(0, 0.66);
  s.box(0.20, 0.07, 0.13, pvx, g + 0.05, pvz, BONE.pale, yaw);
  const [kx, kz] = put(0.05, -0.16);
  s.cyl(0.093, 0.086, 0.145, 8, kx, g + 0.09, kz, BONE.pale, yaw + 0.6, Math.PI * 0.5, 0.3);
  for (const side of [-1, 1]) {
    const [ex, ez] = put(0.05 + side * 0.035, -0.225);
    s.box(0.032, 0.030, 0.020, ex, g + 0.105, ez, BONE.socket, yaw + 0.6);
  }
  for (let i = 0; i < 5; i++) {
    const a = rng.next() * Math.PI * 2;
    const d = 0.35 + rng.next() * 0.75;
    const bx = lx + Math.cos(a) * d, bz = lz + Math.sin(a) * d;
    s.cyl(0.026, 0.030, 0.20 + rng.next() * 0.24, 5,
      bx, groundY(api, bx, bz) + ON_APRON + 0.03, bz,
      rng.next() < 0.4 ? BONE.dark : BONE.pale, rng.next() * 3, Math.PI * 0.5, 0);
  }
  api.emit({ kind: 'circle', x: lx, z: lz, r: 0.55, y0: g - 0.25, y1: g + 0.22, tag: 'body', standable: true });
  if (typeof api.body === 'function') api.body(lx, lz, g);
  return g;
}

/**
 * Newer than the skeleton, and still wearing a coat. Face down, one arm flung out — the
 * flung arm IS the silhouette, which is the lesson staged.js's own fallenBody records after
 * its first pass read as a stack of pale crates under the torch.
 */
export function corpse(k, api, lx, lz, yaw, rng) {
  const s = k.solid || k;
  const g = groundY(api, lx, lz) + ON_APRON;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const coat = shade(C.dark, 0.55);
  const skin = shade(C.soil, 0.85);
  void cy;
  s.quad(1.00, 1.42, lx, g + 0.008, lz, shade(C.dark, 0.7), yaw, -Math.PI * 0.5);
  s.box(0.44, 0.23, 0.78, lx, g + 0.115, lz, coat, yaw);
  s.box(0.40, 0.21, 0.33, lx - sy * 0.53, g + 0.105, lz - Math.cos(yaw) * 0.53, coat, yaw);
  const hx = lx + sy * 0.55, hz = lz + Math.cos(yaw) * 0.55;
  s.cyl(0.13, 0.13, 0.25, 8, hx, groundY(api, hx, hz) + ON_APRON + 0.125, hz, skin, yaw, Math.PI * 0.5, 0.4);
  for (const side of [-1, 1]) {
    const a = yaw + side * (0.14 + rng.next() * 0.34);
    const ex = lx - Math.sin(a) * 1.28, ez = lz - Math.cos(a) * 1.28;
    s.cyl(0.082, 0.098, 0.84, 5, (lx + ex) * 0.5,
      groundY(api, (lx + ex) * 0.5, (lz + ez) * 0.5) + ON_APRON + 0.085, (lz + ez) * 0.5, coat, a, Math.PI * 0.5);
  }
  const fa = yaw + 1.2 + rng.next() * 0.4;
  const ax = lx + Math.sin(fa) * 0.6, az = lz + Math.cos(fa) * 0.6;
  s.cyl(0.063, 0.073, 0.70, 5, (lx + ax) * 0.5,
    groundY(api, (lx + ax) * 0.5, (lz + az) * 0.5) + ON_APRON + 0.07, (lz + az) * 0.5, coat, fa, Math.PI * 0.5);
  s.cyl(0.053, 0.053, 0.17, 5, ax, groundY(api, ax, az) + ON_APRON + 0.05, az, skin, fa, Math.PI * 0.5);
  api.emit({ kind: 'circle', x: lx, z: lz, r: 0.60, y0: g - 0.25, y1: g + 0.32, tag: 'body', standable: true });
  if (typeof api.body === 'function') api.body(lx, lz, g);
  return g;
}

/** Spent brass, where somebody stood and fired until they stopped. Four to nine cases. */
export function brass(k, api, lx, lz, rng, n) {
  const s = k.solid || k;
  const count = n || (4 + ((rng.next() * 6) | 0));
  for (let i = 0; i < count; i++) {
    const a = rng.next() * Math.PI * 2, d = rng.next() * 1.3;
    const bx = lx + Math.cos(a) * d, bz = lz + Math.sin(a) * d;
    s.cyl(0.011, 0.012, 0.055, 5, bx, groundY(api, bx, bz) + ON_APRON + 0.012, bz,
      C.rust, rng.next() * 3, Math.PI * 0.5, 0);
  }
}

/** A drag mark: something was pulled this way, and it did not walk. */
export function dragMark(k, api, x0, z0, x1, z1, rng) {
  const s = k.solid || k;
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.1));
  const yaw = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const mx = x0 + (x1 - x0) * t, mz = z0 + (z1 - z0) * t;
    s.quad(0.30 + rng.next() * 0.22, 1.05, mx, groundY(api, mx, mz) + ON_APRON + 0.004, mz,
      shade(C.soil, 0.62), yaw + rng.range(-0.12, 0.12), -Math.PI * 0.5);
  }
}
