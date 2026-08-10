/* hud.js — as little as the game can get away with.
 *
 * No name plate, no "87 / 100". Health is a length of chain that loses links.
 * Resonance is four small bells that fill. Both read by SHAPE and LENGTH, not
 * by hue, because hue is not information everyone receives.
 *
 * Anything that can be said in the world is said in the world instead: the
 * exit glows, the sun-disc lights, the whip glows when a Sunstrike is loaded.
 */

import { VIEW_W, VIEW_H } from './config.js';
import { clamp, lerp, TAU, withAlpha, smoothstep } from './core.js';

export function drawHud(ctx, game) {
  const p = game.player;
  if (!p) return;
  const t = game.worldTime;

  ctx.save();

  /* ---- health: a run of chain links ---- */
  const links = 10;
  const filled = (p.hp / p.maxHp) * links;
  /* indented past the site's home pill, which lives at the top-left of the
   * page and would otherwise sit on the first link of the chain */
  const x0 = 72; const y0 = 26;
  for (let i = 0; i < links; i += 1) {
    const full = i < Math.floor(filled);
    const partial = !full && i < filled;
    const cx = x0 + i * 15;
    ctx.save();
    ctx.translate(cx, y0);
    ctx.rotate(i % 2 ? Math.PI * 0.5 : 0);
    if (full || partial) {
      ctx.strokeStyle = partial ? 'rgba(240,248,244,.52)' : '#eef6f1';
      ctx.lineWidth = 2.6;
      if (game.lowHealthPulse > 0 && i < 3) {
        ctx.shadowColor = 'rgba(255,180,180,.9)';
        ctx.shadowBlur = 6 * game.lowHealthPulse;
      }
    } else {
      ctx.strokeStyle = 'rgba(150,172,176,.22)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([2, 3]);
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.6, 3.7, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  /* ---- resonance: four bells; the fourth ringing means Sunstrike ---- */
  const bx = 74; const by = 48;
  for (let i = 0; i < 4; i += 1) {
    const on = p.resonance > i;
    const cx = bx + i * 17;
    ctx.save();
    ctx.translate(cx, by);
    const ring = p.sunstrikeReady ? Math.sin(t * 9 + i) * 0.14 : 0;
    ctx.rotate(ring);
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.quadraticCurveTo(6.4, -1.6, 5.2, 5.4);
    ctx.lineTo(-5.2, 5.4);
    ctx.quadraticCurveTo(-6.4, -1.6, 0, -6.5);
    ctx.closePath();
    if (on) {
      ctx.fillStyle = p.sunstrikeReady ? 'rgba(255,240,186,.92)' : 'rgba(224,238,236,.82)';
      ctx.fill();
    }
    ctx.strokeStyle = on ? 'rgba(255,250,225,.95)' : 'rgba(150,172,176,.34)';
    ctx.lineWidth = on ? 1.3 : 1;
    ctx.stroke();
    ctx.restore();
  }

  /* ---- the shards you carry, as the shapes they are ---- */
  const shards = game.progress ? [...game.progress.shards] : [];
  shards.forEach((key, i) => {
    const sx = 74 + i * 20;
    ctx.save();
    ctx.translate(sx, 70);
    ctx.rotate(TAU * 0.125 + Math.sin(t * 1.1 + i) * 0.05);
    ctx.fillStyle = 'rgba(216,182,243,.72)';
    ctx.strokeStyle = 'rgba(243,230,255,.9)';
    ctx.lineWidth = 1.1;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.strokeRect(-5, -5, 10, 10);
    ctx.restore();
  });

  /* ---- chain counter: only when it means something ---- */
  if (p.chain >= 3) {
    const a = clamp(p.chainTimer / 2.6, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#f2fbf8';
    ctx.font = 'italic 700 20px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${p.chain}`, 72, 104);
    ctx.font = '600 9px Arial, sans-serif';
    ctx.fillStyle = 'rgba(226,242,238,.6)';
    ctx.fillText('LINKS', 72 + (p.chain >= 10 ? 26 : 15), 104);
    ctx.globalAlpha = 1;
  }

  /* ---- boss bar ---- */
  if (game.boss && !game.boss.defeated) {
    const b = game.boss;
    const w = 520;
    const x = (VIEW_W - w) * 0.5;
    const y = VIEW_H - 46;
    ctx.fillStyle = 'rgba(4,8,14,.66)';
    ctx.fillRect(x - 2, y - 2, w + 4, 12);
    ctx.fillStyle = 'rgba(238,246,242,.9)';
    ctx.fillRect(x, y, w * clamp(b.hp / b.maxHp, 0, 1), 8);
    /* phase notches — shape, not colour */
    ctx.strokeStyle = 'rgba(8,14,20,.8)';
    ctx.lineWidth = 2;
    for (let i = 1; i < b.phases; i += 1) {
      const nx = x + (w * i) / b.phases;
      ctx.beginPath(); ctx.moveTo(nx, y); ctx.lineTo(nx, y + 8); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(238,246,242,.72)';
    ctx.font = '600 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.title, VIEW_W * 0.5, y - 8);
  }

  /* ---- banner ---- */
  if (game.bannerTimer > 0) {
    const bn = game.bannerData;
    const k = clamp(game.bannerTimer / game.bannerMax, 0, 1);
    const fade = k > 0.8 ? (1 - k) / 0.2 : Math.min(1, k / 0.25);
    ctx.globalAlpha = clamp(fade, 0, 1);
    ctx.textAlign = 'center';
    if (bn.style === 'step') {
      ctx.font = 'italic 700 22px Georgia, serif';
      ctx.fillStyle = 'rgba(232,251,255,.94)';
      ctx.fillText(bn.title, VIEW_W * 0.5, VIEW_H * 0.34);
    } else {
      ctx.font = '600 27px Georgia, serif';
      ctx.fillStyle = 'rgba(244,251,248,.95)';
      ctx.fillText(bn.title, VIEW_W * 0.5, VIEW_H * 0.30);
      if (bn.subtitle) {
        ctx.font = 'italic 14px Georgia, serif';
        ctx.fillStyle = 'rgba(226,241,239,.72)';
        ctx.fillText(bn.subtitle, VIEW_W * 0.5, VIEW_H * 0.30 + 24);
      }
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/* The in-world control glyphs. A chevron is not a sentence. */
export function drawHintGlyph(ctx, prop, time) {
  const bob = Math.sin(time * 2.6) * 3;
  const x = prop.x; const y = prop.y + bob;
  ctx.save();
  ctx.globalAlpha = 0.62 + Math.sin(time * 2.6) * 0.16;
  ctx.strokeStyle = 'rgba(255,242,198,.9)';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  const g = prop.glyph;
  if (g === 'crouch') {
    for (let i = 0; i < 2; i += 1) {
      const yy = y + i * 9;
      ctx.beginPath();
      ctx.moveTo(x - 9, yy - 4); ctx.lineTo(x, yy + 4); ctx.lineTo(x + 9, yy - 4);
      ctx.stroke();
      ctx.globalAlpha *= 0.55;
    }
  } else if (g === 'dive') {
    ctx.beginPath();
    ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 8); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 1); ctx.lineTo(x, y + 10); ctx.lineTo(x + 7, y + 1); ctx.stroke();
  } else if (g === 'up') {
    ctx.beginPath();
    ctx.moveTo(x - 9, y + 4); ctx.lineTo(x, y - 4); ctx.lineTo(x + 9, y + 4); ctx.stroke();
  } else if (g === 'step') {
    ctx.beginPath();
    ctx.moveTo(x - 11, y); ctx.lineTo(x + 8, y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 6); ctx.lineTo(x + 9, y); ctx.lineTo(x + 2, y + 6); ctx.stroke();
  }
  ctx.restore();
}
