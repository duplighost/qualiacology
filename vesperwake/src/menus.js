/* menus.js — the sun-disc forge and the map.
 *
 * Both are drawn on the canvas, in the game's own voice, over a darkened
 * still of the world rather than a separate screen. You never leave the room
 * you are standing in.
 */

import { VIEW_W, VIEW_H } from './config.js';
import { clamp, TAU, withAlpha } from './core.js';
import { FORGE, SHARDS, costOf } from './progress.js';

const GOLD = '#f0d68e';
const INK = '#eef6f1';
const DIM = 'rgba(226,241,239,.56)';

/* ------------------------------------------------------------------ *
 * THE FORGE — what a sun-disc is for.
 * ------------------------------------------------------------------ */

export const FORGE_KEYS = Object.keys(FORGE);

export function drawForge(ctx, game) {
  const pr = game.progress;
  const sel = game.forgeIndex;

  ctx.save();
  ctx.fillStyle = 'rgba(2,5,11,.74)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const panelW = 560;
  const panelH = 300;
  const px = (VIEW_W - panelW) * 0.5;
  const py = (VIEW_H - panelH) * 0.5 - 8;

  /* a disc of noon behind the panel */
  const g = ctx.createRadialGradient(VIEW_W * 0.5, py + panelH * 0.44, 20, VIEW_W * 0.5, py + panelH * 0.44, 320);
  g.addColorStop(0, 'rgba(255,232,164,.13)');
  g.addColorStop(1, 'rgba(255,232,164,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = '600 25px Georgia, serif';
  ctx.fillText('THE SUN-DISC REMEMBERS', VIEW_W * 0.5, py + 4);
  ctx.font = 'italic 12px Georgia, serif';
  ctx.fillStyle = DIM;
  ctx.fillText('Noon gathered from the things that would not let it come', VIEW_W * 0.5, py + 24);

  /* dust, drawn as a count of motes rather than a wallet */
  ctx.font = '700 13px Arial, sans-serif';
  ctx.fillStyle = GOLD;
  ctx.fillText(`${pr.dust} NOON`, VIEW_W * 0.5, py + 48);

  ctx.textAlign = 'left';
  FORGE_KEYS.forEach((key, i) => {
    const def = FORGE[key];
    const rank = pr.ranks[key] ?? 0;
    const cost = costOf(key, pr);
    const y = py + 84 + i * 58;
    const on = i === sel;
    const afford = cost !== null && pr.dust >= cost;

    if (on) {
      ctx.fillStyle = 'rgba(255,232,164,.09)';
      ctx.fillRect(px - 12, y - 20, panelW + 24, 50);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.moveTo(px - 24, y - 4); ctx.lineTo(px - 14, y + 2); ctx.lineTo(px - 24, y + 8);
      ctx.closePath(); ctx.fill();
    }

    ctx.fillStyle = on ? INK : DIM;
    ctx.font = '700 14px Arial, sans-serif';
    ctx.fillText(def.name, px, y);
    ctx.font = 'italic 12px Georgia, serif';
    ctx.fillStyle = on ? 'rgba(226,241,239,.72)' : 'rgba(226,241,239,.38)';
    ctx.fillText(def.line, px, y + 17);

    /* rank pips — shape, not colour */
    for (let r = 0; r < def.ranks; r += 1) {
      const cx = px + 300 + r * 17;
      ctx.beginPath();
      ctx.arc(cx, y - 4, 5.4, 0, TAU);
      if (r < rank) { ctx.fillStyle = on ? GOLD : 'rgba(240,214,142,.6)'; ctx.fill(); }
      ctx.strokeStyle = on ? 'rgba(255,246,214,.9)' : 'rgba(200,218,216,.34)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    ctx.textAlign = 'right';
    ctx.font = '700 12px Arial, sans-serif';
    if (cost === null) {
      ctx.fillStyle = 'rgba(226,241,239,.4)';
      ctx.fillText('FULL', px + panelW, y - 1);
    } else {
      ctx.fillStyle = afford ? GOLD : 'rgba(226,241,239,.32)';
      ctx.fillText(`${cost} NOON`, px + panelW, y - 1);
    }
    ctx.font = 'italic 11px Georgia, serif';
    ctx.fillStyle = 'rgba(226,241,239,.45)';
    ctx.fillText(cost === null ? def.describe(rank) : `${def.describe(rank)}  →  ${def.next(rank)}`,
      px + panelW, y + 15);
    ctx.textAlign = 'left';
  });

  ctx.textAlign = 'center';
  ctx.font = '600 10px Arial, sans-serif';
  ctx.fillStyle = 'rgba(226,241,239,.44)';
  ctx.fillText('W S  choose      J  forge      M  map      ESC  leave', VIEW_W * 0.5, py + panelH - 4);
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * THE MAP — a chapter is a road, so the map is a road.
 * ------------------------------------------------------------------ */

export function drawMap(ctx, game) {
  const pr = game.progress;
  const lv = game.level;

  ctx.save();
  ctx.fillStyle = 'rgba(2,5,11,.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = '600 24px Georgia, serif';
  ctx.fillText(lv.name, VIEW_W * 0.5, 74);
  ctx.font = 'italic 12px Georgia, serif';
  ctx.fillStyle = DIM;
  ctx.fillText(`CHAPTER ${lv.chapter}`, VIEW_W * 0.5, 94);

  /* the road */
  const x0 = 90;
  const x1 = VIEW_W - 90;
  const y = 210;
  const toScreen = (wx) => x0 + (wx / lv.width) * (x1 - x0);

  ctx.strokeStyle = 'rgba(226,241,239,.16)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();

  /* the stretches you have actually walked */
  ctx.strokeStyle = 'rgba(240,214,142,.7)';
  ctx.lineWidth = 3;
  for (const z of lv.zones) {
    if (!pr.zonesSeen.has(`${lv.id}:${z.name}`)) continue;
    ctx.beginPath();
    ctx.moveTo(toScreen(z.x0), y);
    ctx.lineTo(toScreen(z.x1), y);
    ctx.stroke();
  }

  /* the sun-discs */
  for (const c of lv.checkpoints) {
    const sx = toScreen(c.x);
    ctx.beginPath(); ctx.arc(sx, y, 6.5, 0, TAU);
    ctx.fillStyle = c.lit ? GOLD : 'rgba(20,30,36,.9)';
    ctx.fill();
    ctx.strokeStyle = c.lit ? '#fff3c8' : 'rgba(200,218,216,.4)';
    ctx.lineWidth = 1.6; ctx.stroke();
  }

  /* the secrets: a diamond you have found, a dashed one you have not */
  for (const s of lv.breakables.filter((b) => b.kind === 'falsewall')) {
    const sx = toScreen(s.x);
    const found = pr.secretsFound.has(`${lv.id}:${s.id}`);
    ctx.save();
    ctx.translate(sx, y - 22);
    ctx.rotate(Math.PI * 0.25);
    if (found) { ctx.fillStyle = 'rgba(216,182,243,.9)'; ctx.fillRect(-4.5, -4.5, 9, 9); }
    else { ctx.setLineDash([2, 3]); }
    ctx.strokeStyle = found ? '#f3e6ff' : 'rgba(200,218,216,.42)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-4.5, -4.5, 9, 9);
    ctx.restore();
  }

  /* the gates, and whether you can open them yet */
  for (const gate of (lv.gates ?? [])) {
    const sx = toScreen(gate.x);
    const open = pr.shards.has(gate.shard);
    ctx.strokeStyle = open ? 'rgba(240,214,142,.85)' : 'rgba(226,241,239,.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, y - 14); ctx.lineTo(sx, y + 14);
    ctx.stroke();
    if (!open) {
      ctx.beginPath(); ctx.arc(sx, y + 20, 4, 0, TAU); ctx.stroke();
    }
  }

  /* where you are */
  const me = toScreen(game.player.x);
  ctx.fillStyle = '#eafcff';
  ctx.beginPath();
  ctx.moveTo(me, y - 15); ctx.lineTo(me + 5, y - 24); ctx.lineTo(me - 5, y - 24);
  ctx.closePath(); ctx.fill();

  /* the exit */
  if (lv.exit) {
    const ex = toScreen(lv.exit.x);
    ctx.strokeStyle = 'rgba(255,240,190,.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex - 6, y - 10); ctx.lineTo(ex + 4, y); ctx.lineTo(ex - 6, y + 10);
    ctx.stroke();
  }

  /* the zone names, alternating above and below so they do not collide */
  ctx.font = '400 9px Arial, sans-serif';
  ctx.textAlign = 'center';
  lv.zones.forEach((z, i) => {
    const seen = pr.zonesSeen.has(`${lv.id}:${z.name}`);
    ctx.fillStyle = seen ? 'rgba(226,241,239,.62)' : 'rgba(226,241,239,.16)';
    const cx = toScreen((z.x0 + z.x1) * 0.5);
    ctx.save();
    ctx.translate(cx, y + (i % 2 ? 46 : -44));
    ctx.rotate(-0.34);
    ctx.fillText(seen ? z.name.toUpperCase() : '· · ·', 0, 0);
    ctx.restore();
  });

  /* shards, relics, and the road behind you */
  const sy = 330;
  ctx.textAlign = 'left';
  ctx.font = '700 11px Arial, sans-serif';
  ctx.fillStyle = 'rgba(226,241,239,.5)';
  ctx.fillText('SHARDS', 120, sy);
  let sx2 = 120;
  for (const [key, def] of Object.entries(SHARDS)) {
    const has = pr.shards.has(key);
    ctx.save();
    ctx.translate(sx2 + 12, sy + 30);
    ctx.rotate(TAU * 0.125);
    ctx.fillStyle = has ? 'rgba(216,182,243,.92)' : 'rgba(20,30,36,.6)';
    ctx.fillRect(-9, -9, 18, 18);
    ctx.strokeStyle = has ? '#f3e6ff' : 'rgba(200,218,216,.3)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-9, -9, 18, 18);
    ctx.restore();
    ctx.font = '400 9px Arial, sans-serif';
    ctx.fillStyle = has ? 'rgba(226,241,239,.7)' : 'rgba(226,241,239,.22)';
    ctx.textAlign = 'center';
    ctx.fillText(has ? def.name.split(' ')[0] : '???', sx2 + 12, sy + 54);
    ctx.textAlign = 'left';
    sx2 += 74;
  }

  ctx.font = '700 11px Arial, sans-serif';
  ctx.fillStyle = 'rgba(226,241,239,.5)';
  ctx.fillText('RELICS', VIEW_W - 300, sy);
  for (let i = 0; i < 3; i += 1) {
    const rx = VIEW_W - 288 + i * 34;
    const has = pr.relics.size > i;
    ctx.beginPath();
    for (let k = 0; k < 6; k += 1) {
      const a = (k / 6) * TAU - Math.PI * 0.5;
      const px = rx + Math.cos(a) * 11;
      const py = sy + 30 + Math.sin(a) * 11;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (has) { ctx.fillStyle = 'rgba(255,238,170,.85)'; ctx.fill(); }
    ctx.strokeStyle = has ? '#fff6d6' : 'rgba(200,218,216,.3)';
    ctx.lineWidth = 1.4; ctx.stroke();
  }

  ctx.font = '700 11px Arial, sans-serif';
  ctx.fillStyle = GOLD;
  ctx.textAlign = 'right';
  ctx.fillText(`${pr.dust} NOON`, VIEW_W - 120, sy + 62);

  /* chapter travel — the reason a shard you find late is worth anything */
  ctx.textAlign = 'center';
  ctx.font = '700 11px Arial, sans-serif';
  ctx.fillStyle = 'rgba(226,241,239,.5)';
  ctx.fillText('THE ROAD BEHIND', VIEW_W * 0.5, 430);
  const names = ['I · THE WAKE ORCHARD', 'II · THE DROWNED RELIQUARY', 'III · THE MERIDIAN BELFRY'];
  names.forEach((n, i) => {
    const open = i <= game.progress.furthestChapter;
    const here = i === game.levelIndex;
    const cy = 456 + i * 22;
    ctx.font = here ? '700 12px Arial, sans-serif' : '400 12px Arial, sans-serif';
    ctx.fillStyle = here ? GOLD : open ? 'rgba(226,241,239,.62)' : 'rgba(226,241,239,.18)';
    ctx.fillText(`${open ? '' : '· '}${n}${here ? '   ←' : ''}`, VIEW_W * 0.5, cy);
  });
  ctx.font = '600 10px Arial, sans-serif';
  ctx.fillStyle = 'rgba(226,241,239,.4)';
  ctx.fillText('at a sun-disc:  A D  choose a chapter      J  travel', VIEW_W * 0.5, 528);

  ctx.restore();
}
