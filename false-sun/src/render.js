import { COLORS } from './config.js';
import { ROOM_H, ROOM_W } from './content.js';
import { clamp, hashObject, lerp } from './math.js';
import { getDistrict } from './engine.js';
import { casterVertices } from './shadows.js';

const TAU = Math.PI * 2;

function hexToRgba(hex, alpha = 1) {
  const value = String(hex || '#000000').replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map((character) => character + character).join('')
    : value.padEnd(6, '0').slice(0, 6);
  const number = Number.parseInt(normalized, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

function seeded(id, salt = 0) {
  const hash = Number.parseInt(hashObject(`${id}:${salt}`), 16) >>> 0;
  return (hash % 100000) / 100000;
}

function traceShape(ctx, item) {
  ctx.beginPath();
  if (item.shape === 'circle') {
    ctx.arc(item.x, item.y, item.r, 0, TAU);
  } else if (item.shape === 'poly') {
    const points = casterVertices(item);
    if (!points.length) return false;
    const first = Array.isArray(points[0]) ? { x: points[0][0], y: points[0][1] } : points[0];
    ctx.moveTo(first.x, first.y);
    for (let index = 1; index < points.length; index += 1) {
      const point = Array.isArray(points[index]) ? { x: points[index][0], y: points[index][1] } : points[index];
      ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
  } else {
    const angle = item.angle ?? item.rotation ?? 0;
    if (Math.abs(angle) > 0.0001) {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(angle);
      ctx.rect(-item.w * 0.5, -item.h * 0.5, item.w, item.h);
      ctx.restore();
    } else {
      ctx.rect(item.x - item.w * 0.5, item.y - item.h * 0.5, item.w, item.h);
    }
  }
  return true;
}

function pathPolygon(ctx, points) {
  if (!points?.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index].x, points[index].y);
  ctx.closePath();
}

function shapeCenter(item) {
  if (Number.isFinite(item?.x) && Number.isFinite(item?.y)) return { x: item.x, y: item.y };
  const points = item?.points ?? [];
  if (!points.length) return { x: ROOM_W * 0.5, y: ROOM_H * 0.5 };
  return points.reduce((sum, value) => {
    const point = Array.isArray(value) ? { x: value[0], y: value[1] } : value;
    return { x: sum.x + point.x / points.length, y: sum.y + point.y / points.length };
  }, { x: 0, y: 0 });
}

function materialColors(material, district) {
  const name = String(material ?? 'cream-stone');
  if (/ink|root|hedge|buried/.test(name)) return { top: '#253453', side: '#0b1025', line: '#6489a4' };
  if (/cobalt|machine|iron|pipe/.test(name)) return { top: '#244a78', side: '#0a1732', line: '#73b9db' };
  if (/bell|brass|gilt|gold/.test(name)) return { top: '#d7b457', side: '#614c32', line: '#fff0a6' };
  if (/glass|prism|clear/.test(name)) return { top: '#b9f4f2', side: '#214f6c', line: '#f7ffff', alpha: 0.72 };
  if (/shelf|page|archive|paper/.test(name)) return { top: '#ded7bd', side: '#40465f', line: '#fff8e7' };
  if (/crack/.test(name)) return { top: district.architecture, side: '#4d4563', line: COLORS.cyan };
  if (/porcelain|bone|cream|stone|sundial|lattice/.test(name)) return { top: district.architecture, side: '#6c6380', line: '#ffffff' };
  return { top: district.architecture, side: '#42415c', line: district.actionEdge };
}

function drawFloor(ctx, state, district) {
  ctx.fillStyle = district.floor;
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);

  const gradient = ctx.createRadialGradient(
    state.player.sunX, state.player.sunY, 40,
    state.player.sunX, state.player.sunY, 820,
  );
  gradient.addColorStop(0, hexToRgba(district.accent, 0.17));
  gradient.addColorStop(0.42, hexToRgba(district.actionEdge, 0.04));
  gradient.addColorStop(1, 'rgba(2, 3, 16, 0.28)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);

  ctx.save();
  ctx.strokeStyle = hexToRgba(district.architecture, state.room.district === 'false-noon' ? 0.16 : 0.07);
  ctx.lineWidth = 1;
  const spacing = state.room.district === 'bellworks' ? 80 : 100;
  ctx.beginPath();
  for (let x = spacing; x < ROOM_W; x += spacing) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ROOM_H);
  }
  for (let y = spacing; y < ROOM_H; y += spacing) {
    ctx.moveTo(0, y);
    ctx.lineTo(ROOM_W, y);
  }
  ctx.stroke();

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = district.actionEdge;
  for (let index = 0; index < 65; index += 1) {
    const x = seeded(state.roomId, index) * ROOM_W;
    const y = seeded(state.roomId, index + 1000) * ROOM_H;
    const radius = 0.8 + seeded(state.roomId, index + 2000) * 2.2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  if (state.room.district === 'drowned-archive') {
    ctx.save();
    ctx.strokeStyle = 'rgba(110, 230, 255, 0.11)';
    ctx.lineWidth = 2;
    for (let row = 0; row < 13; row += 1) {
      const y = 45 + row * 68;
      ctx.beginPath();
      for (let x = 0; x <= ROOM_W; x += 28) {
        const waveY = y + Math.sin(x * 0.018 + state.time * 0.8 + row) * 4;
        if (x === 0) ctx.moveTo(x, waveY); else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawFlowerBed(ctx, item, district) {
  const count = item.count ?? Math.round(10 * (item.scale ?? 1));
  const radius = item.radius ?? 62 * (item.scale ?? 1);
  for (let index = 0; index < count; index += 1) {
    const angle = seeded(item.id, index) * TAU;
    const distance = Math.sqrt(seeded(item.id, index + 100)) * radius;
    const x = item.x + Math.cos(angle) * distance;
    const y = item.y + Math.sin(angle) * distance * 0.55;
    const size = 3 + seeded(item.id, index + 300) * 6;
    ctx.fillStyle = index % 4 === 0 ? district.accent : district.actionEdge;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.45, angle, 0, TAU);
    ctx.fill();
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }
}

function drawTree(ctx, item, district) {
  const scale = item.scale ?? 1;
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation ?? 0);
  ctx.strokeStyle = '#17182e';
  ctx.lineCap = 'round';
  ctx.lineWidth = 15 * scale;
  ctx.beginPath();
  ctx.moveTo(0, 42 * scale);
  ctx.quadraticCurveTo(-12 * scale, -18 * scale, 5 * scale, -70 * scale);
  ctx.stroke();
  ctx.lineWidth = 7 * scale;
  for (let index = 0; index < 6; index += 1) {
    const side = index % 2 ? 1 : -1;
    const y = -15 * scale - index * 9 * scale;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(side * 38 * scale, y - 18 * scale, side * 58 * scale, y - 45 * scale);
    ctx.stroke();
  }
  ctx.fillStyle = hexToRgba(district.accent, 0.78);
  for (let index = 0; index < 12; index += 1) {
    const angle = seeded(item.id, index) * TAU;
    const distance = 30 + seeded(item.id, index + 90) * 58;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * distance, -52 * scale + Math.sin(angle) * distance * 0.48, 3 + seeded(item.id, index + 80) * 5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawMachineDecor(ctx, item, district) {
  const scale = item.scale ?? 1;
  const radius = item.radius ?? 36 * scale;
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate((item.rotation ?? 0) + stateSafeTime(item) * (item.speed ?? 0));
  ctx.strokeStyle = hexToRgba(district.architecture, 0.25);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.stroke();
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * radius * 0.35, Math.sin(angle) * radius * 0.35);
    ctx.lineTo(Math.cos(angle) * radius * 1.25, Math.sin(angle) * radius * 1.25);
    ctx.stroke();
  }
  ctx.restore();
}

function stateSafeTime(item) {
  return Number(item.__renderTime || 0);
}

function drawDecor(ctx, state, district, layer) {
  for (const item of state.room.decor ?? []) {
    if ((item.layer ?? 'mid') !== layer) continue;
    if (item.requires && !meetsRenderRequirement(state, item.requires)) continue;
    item.__renderTime = state.time;
    const type = String(item.type ?? '');
    ctx.save();
    ctx.globalAlpha = layer === 'back' ? 0.58 : layer === 'front' ? 0.72 : 0.8;
    if (/flower|fungus|pollen|mote/.test(type)) {
      drawFlowerBed(ctx, item, district);
    } else if (/tree|topiary|root|statue|silhouette|gardeners|family/.test(type)) {
      drawTree(ctx, item, district);
    } else if (/gear|machine|rotor|bell|ring|oculus/.test(type)) {
      drawMachineDecor(ctx, item, district);
    } else if (/thread|path|crescent-chain/.test(type) && item.path) {
      ctx.strokeStyle = hexToRgba(district.actionEdge, 0.7);
      ctx.lineWidth = 5;
      ctx.setLineDash([12, 9]);
      ctx.beginPath();
      const first = item.path[0];
      ctx.moveTo(first[0] ?? first.x, first[1] ?? first.y);
      for (let index = 1; index < item.path.length; index += 1) {
        const point = item.path[index];
        ctx.lineTo(point[0] ?? point.x, point[1] ?? point.y);
      }
      ctx.stroke();
    } else if (/sky-slit|window|horizon/.test(type)) {
      const gradient = ctx.createLinearGradient(item.x - 120, item.y, item.x + 120, item.y);
      gradient.addColorStop(0, 'rgba(255,216,106,0)');
      gradient.addColorStop(0.5, 'rgba(255,245,205,0.75)');
      gradient.addColorStop(1, 'rgba(84,232,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(item.x - 140, item.y - 8, 280, 16);
    } else if (/page|book|index|glyph|name|constellation|tableau/.test(type)) {
      const scale = item.scale ?? 1;
      ctx.strokeStyle = hexToRgba(district.architecture, 0.55);
      ctx.fillStyle = hexToRgba(district.shadow, 0.6);
      ctx.lineWidth = 2;
      const sides = /glyph|name|constellation/.test(type) ? 6 : 4;
      ctx.beginPath();
      for (let index = 0; index < sides; index += 1) {
        const angle = -Math.PI / 2 + (index / sides) * TAU;
        const radius = 22 * scale * (index % 2 ? 0.75 : 1);
        const x = item.x + Math.cos(angle) * radius;
        const y = item.y + Math.sin(angle) * radius;
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = hexToRgba(district.architecture, 0.16);
      ctx.beginPath();
      ctx.arc(item.x, item.y, 16 * (item.scale ?? 1), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function meetsRenderRequirement(state, requirement) {
  if (!requirement) return true;
  const split = requirement.split(':');
  if (split[0] === 'upgrade') return state.player.upgrades.includes(split[1]);
  if (split[0] === 'boss') return state.world.bosses.includes(split[1]);
  if (split[0] === 'night-names') return state.player.nightNames >= Number(split[1]);
  if (split[0] === 'alignment') return Object.values(state.world.rooms).some((room) => room.activated?.includes(split[1]));
  if (split[0] === 'break') return Object.values(state.world.rooms).some((room) => room.destroyed?.includes(split[1]));
  return false;
}

function drawHazards(ctx, state, district) {
  for (const hazard of state.hazards) {
    ctx.save();
    const pulse = 0.5 + Math.sin(hazard.phase * 4) * 0.2;
    ctx.globalAlpha = hazard.active === false ? 0.16 : 0.55 + pulse * 0.2;
    ctx.fillStyle = hexToRgba(district.shadow, 0.78);
    ctx.strokeStyle = COLORS.danger;
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 9]);
    const ring = String(hazard.type ?? '').includes('ring');
    const boundary = hazard.type === 'inward-horizon';
    if (hazard.shape === 'rect') {
      ctx.beginPath();
      if (boundary) {
        ctx.rect(34, 34, ROOM_W - 68, ROOM_H - 68);
      } else {
        ctx.save();
        ctx.translate(hazard.x, hazard.y);
        ctx.rotate(hazard.rotation ?? 0);
        ctx.rect(-hazard.w * 0.5, -hazard.h * 0.5, hazard.w, hazard.h);
        ctx.restore();
      }
    } else {
      ctx.beginPath();
      const radius = hazard.r * (ring ? 1 : (0.95 + pulse * 0.07));
      ctx.arc(hazard.x, hazard.y, radius, 0, TAU);
    }
    if (!ring && !boundary) ctx.fill();
    else ctx.lineWidth = Math.max(4, (hazard.thickness ?? 20) * 1.35);
    ctx.stroke();
    ctx.restore();
  }
}

function drawReceivers(ctx, state, district) {
  for (const receiver of state.receivers) {
    const pulse = receiver.active ? 1 : receiver.charge;
    ctx.save();
    ctx.translate(receiver.x, receiver.y);
    ctx.rotate(-Math.PI * 0.2);
    ctx.strokeStyle = receiver.active ? COLORS.cream : district.actionEdge;
    ctx.lineWidth = 4 + pulse * 3;
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.beginPath();
    ctx.arc(0, 0, receiver.radius, -Math.PI * 0.75, Math.PI * 0.75);
    ctx.stroke();
    ctx.setLineDash([3, 7]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, receiver.radius + 9 + pulse * 4, 0, TAU);
    ctx.stroke();
    if (receiver.singing || receiver.active) {
      ctx.fillStyle = hexToRgba(district.actionEdge, 0.22 + pulse * 0.3);
      ctx.beginPath();
      ctx.arc(0, 0, receiver.radius * (0.5 + pulse * 0.4), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawShadows(ctx, state, district, edgeEmphasis) {
  ctx.save();
  ctx.lineJoin = 'round';
  for (const shadow of state.shadows) {
    if (!shadow.polygon?.length) continue;
    const bullet = String(shadow.casterId).startsWith('bullet:');
    const enemy = String(shadow.casterId).startsWith('enemy:');
    const splitLight = Boolean(shadow.splitLight);
    const hostileLight = Boolean(shadow.hostileLight);
    pathPolygon(ctx, shadow.polygon);
    ctx.fillStyle = hostileLight
      ? hexToRgba(COLORS.magenta, 0.12)
      : splitLight
      ? hexToRgba(COLORS.violet, bullet ? 0.08 : enemy ? 0.15 : 0.19)
      : hexToRgba(district.shadow, bullet ? 0.26 : enemy ? 0.48 : 0.62);
    ctx.fill();
    ctx.strokeStyle = hostileLight
      ? hexToRgba(COLORS.magenta, edgeEmphasis ? 0.7 : 0.38)
      : splitLight
      ? hexToRgba(COLORS.gold, edgeEmphasis ? 0.84 : 0.55)
      : bullet
      ? hexToRgba(COLORS.magenta, edgeEmphasis ? 0.68 : 0.28)
      : hexToRgba(district.actionEdge, edgeEmphasis ? 0.92 : state.player.upgrades.includes('edge-sight') ? 0.78 : 0.46);
    ctx.lineWidth = bullet ? (edgeEmphasis ? 2.5 : 1) : (edgeEmphasis ? 4.5 : 2.2);
    if (hostileLight || (state.room.district === 'drowned-archive' && !state.player.upgrades.includes('edge-sight') && !shadow.interactive)) {
      ctx.setLineDash([10, 13]);
    } else ctx.setLineDash([]);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTrails(ctx, state, district) {
  ctx.save();
  ctx.lineCap = 'round';
  for (const trail of state.trails) {
    const alpha = clamp(trail.life / trail.maxLife, 0, 1);
    ctx.strokeStyle = hexToRgba(district.actionEdge, alpha * 0.24);
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(trail.x1, trail.y1);
    ctx.lineTo(trail.x2, trail.y2);
    ctx.stroke();
    ctx.strokeStyle = hexToRgba(COLORS.cyanWhite, alpha * 0.95);
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 8]);
    ctx.lineDashOffset = -state.time * 90;
    ctx.stroke();
  }
  ctx.restore();
}

function drawObstacle(ctx, obstacle, state, district) {
  const colors = materialColors(obstacle.material, district);
  const center = shapeCenter(obstacle);
  const sunAngle = Math.atan2(center.y - state.player.sunY, center.x - state.player.sunX);
  const depthX = Math.cos(sunAngle) * 10;
  const depthY = Math.sin(sunAngle) * 10 + 9;
  ctx.save();
  ctx.globalAlpha = colors.alpha ?? 1;
  ctx.translate(depthX, depthY);
  if (traceShape(ctx, obstacle)) {
    ctx.fillStyle = colors.side;
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  if (traceShape(ctx, obstacle)) {
    const gradient = ctx.createLinearGradient(
      center.x - Math.cos(sunAngle) * 80,
      center.y - Math.sin(sunAngle) * 80,
      center.x + Math.cos(sunAngle) * 80,
      center.y + Math.sin(sunAngle) * 80,
    );
    gradient.addColorStop(0, colors.line);
    gradient.addColorStop(0.22, colors.top);
    gradient.addColorStop(1, colors.side);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = hexToRgba(colors.line, obstacle.breakable ? 0.95 : 0.5);
    ctx.lineWidth = obstacle.breakable ? 4 : 2;
    ctx.stroke();
  }

  if (obstacle.breakable) {
    ctx.strokeStyle = COLORS.cyanWhite;
    ctx.lineWidth = 3;
    ctx.setLineDash([11, 7]);
    const size = obstacle.shape === 'circle' ? obstacle.r : Math.min(obstacle.w ?? 100, obstacle.h ?? 100) * 0.7;
    ctx.beginPath();
    ctx.moveTo(center.x - size * 0.55, center.y - size * 0.38);
    ctx.lineTo(center.x - size * 0.12, center.y - size * 0.05);
    ctx.lineTo(center.x - size * 0.34, center.y + size * 0.34);
    ctx.moveTo(center.x - size * 0.12, center.y - size * 0.05);
    ctx.lineTo(center.x + size * 0.45, center.y + size * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPickups(ctx, state, district) {
  for (const pickup of state.pickups) {
    if (!meetsRenderRequirement(state, pickup.requires)) continue;
    const y = pickup.y + Math.sin(pickup.bob) * 7;
    const scale = pickup.type === 'ability' ? 1.45 : 1;
    ctx.save();
    ctx.translate(pickup.x, y);
    ctx.rotate(state.time * 0.5);
    ctx.shadowBlur = 22;
    ctx.shadowColor = district.actionEdge;
    ctx.fillStyle = pickup.type === 'night-name' ? COLORS.cream : pickup.type === 'health-knot' ? district.accent : district.actionEdge;
    ctx.strokeStyle = COLORS.cyanWhite;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let index = 0; index < 8; index += 1) {
      const angle = -Math.PI / 2 + (index / 8) * TAU;
      const radius = (index % 2 ? 10 : 22) * scale;
      const x = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemyShape(ctx, enemy, state, district) {
  const type = enemy.archetype;
  const radius = enemy.radius;
  const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(type === 'bell' || type === 'bell-guardian' ? state.time * 0.25 : angle);
  ctx.shadowBlur = enemy.hurtTimer > 0 ? 30 : 12;
  ctx.shadowColor = enemy.cutOpen > 0 ? district.actionEdge : COLORS.magenta;
  ctx.strokeStyle = enemy.cutOpen > 0 ? COLORS.cyanWhite : COLORS.danger;
  ctx.fillStyle = enemy.boss ? '#251340' : '#321b55';
  ctx.lineWidth = enemy.boss ? 6 : 3;

  if (type === 'moth') {
    const flap = 0.55 + Math.sin(state.time * 12 + enemy.angle) * 0.28;
    ctx.beginPath();
    ctx.moveTo(radius * 0.9, 0);
    ctx.lineTo(-radius * 0.35, -radius * flap);
    ctx.lineTo(-radius * 0.05, 0);
    ctx.lineTo(-radius * 0.35, radius * flap);
    ctx.closePath();
  } else if (type === 'husk' || type === 'hedge-guardian') {
    ctx.beginPath();
    ctx.moveTo(radius, -radius * 0.45);
    ctx.lineTo(radius * 0.55, -radius * 0.9);
    ctx.lineTo(-radius * 0.65, -radius * 0.62);
    ctx.lineTo(-radius, 0);
    ctx.lineTo(-radius * 0.65, radius * 0.62);
    ctx.lineTo(radius * 0.55, radius * 0.9);
    ctx.lineTo(radius, radius * 0.45);
    ctx.lineTo(radius * 0.35, 0);
    ctx.closePath();
  } else if (type === 'bell' || type === 'bell-guardian') {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.moveTo(radius * 0.62, 0);
    ctx.arc(0, 0, radius * 0.62, 0, TAU);
    ctx.moveTo(radius * 0.2, -radius * 1.05);
    ctx.lineTo(radius * 0.65, -radius * 0.72);
  } else if (type === 'needle' || type === 'reader-guardian') {
    ctx.beginPath();
    ctx.moveTo(radius * 1.45, 0);
    ctx.lineTo(-radius * 0.65, -radius * 0.48);
    ctx.lineTo(-radius * 0.25, 0);
    ctx.lineTo(-radius * 0.65, radius * 0.48);
    ctx.closePath();
  } else if (type === 'warden') {
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(radius * 0.25, -radius);
    ctx.lineTo(-radius * 0.85, -radius * 0.55);
    ctx.lineTo(-radius * 0.4, 0);
    ctx.lineTo(-radius * 0.85, radius * 0.55);
    ctx.lineTo(radius * 0.25, radius);
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.arc(-radius * 0.34, 0, radius * 0.62, -Math.PI * 0.72, Math.PI * 0.72);
    ctx.arc(radius * 0.34, 0, radius * 0.62, Math.PI * 0.28, Math.PI * 1.72);
    ctx.closePath();
  }
  ctx.fill('evenodd');
  ctx.stroke();

  ctx.fillStyle = COLORS.danger;
  ctx.beginPath();
  ctx.arc(radius * 0.2, 0, Math.max(3, radius * 0.15), 0, TAU);
  ctx.fill();
  if (enemy.boss) {
    ctx.strokeStyle = district.accent;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.28 + Math.sin(state.time * 3) * 7, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  if (!enemy.boss && (enemy.hurtTimer > 0 || enemy.hp < enemy.maxHp)) {
    const width = radius * 2.2;
    ctx.fillStyle = 'rgba(4,4,15,0.75)';
    ctx.fillRect(enemy.x - width * 0.5, enemy.y - radius - 15, width, 5);
    ctx.fillStyle = district.actionEdge;
    ctx.fillRect(enemy.x - width * 0.5, enemy.y - radius - 15, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 5);
  }
}

function drawBullets(ctx, state, district) {
  for (const bullet of state.bullets) {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.shadowBlur = bullet.converted ? 20 : 13;
    ctx.shadowColor = bullet.converted ? district.actionEdge : COLORS.magenta;
    ctx.fillStyle = bullet.converted ? district.actionEdge : COLORS.danger;
    ctx.strokeStyle = bullet.converted ? COLORS.cream : '#5f2c89';
    ctx.lineWidth = 3;
    if (/lane|wall/.test(bullet.kind)) {
      const angle = Math.atan2(bullet.vy, bullet.vx);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.rect(-bullet.radius * 1.7, -bullet.radius * 0.65, bullet.radius * 3.4, bullet.radius * 1.3);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, bullet.radius, 0, TAU);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, bullet.radius * 0.28), 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawSunBody(ctx, state, district, x, y, secondary = false) {
  const player = state.player;
  ctx.save();
  const aura = ctx.createRadialGradient(x, y, 0, x, y, secondary ? 125 : 155);
  aura.addColorStop(0, 'rgba(255,255,240,0.95)');
  aura.addColorStop(0.08, hexToRgba(secondary ? COLORS.violet : COLORS.gold, 0.95));
  aura.addColorStop(0.35, hexToRgba(secondary ? COLORS.cyan : district.accent, 0.24));
  aura.addColorStop(1, 'rgba(255,216,106,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, secondary ? 125 : 155, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = COLORS.cream;
  ctx.shadowBlur = secondary ? 24 : 32;
  ctx.shadowColor = secondary ? COLORS.violet : COLORS.gold;
  ctx.beginPath();
  ctx.arc(x, y, (secondary ? 10 : 15) + Math.sin(state.time * 4) * 2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = secondary ? COLORS.gold : district.actionEdge;
  ctx.lineWidth = 2;
  ctx.setLineDash(secondary ? [3, 6] : player.sunPinned ? [5, 7] : []);
  ctx.beginPath();
  ctx.arc(x, y, (secondary ? 20 : 25) + Math.sin(state.time * 2.3) * 3, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawSun(ctx, state, district) {
  drawSunBody(ctx, state, district, state.player.sunX, state.player.sunY, false);
  if (state.player.splitTimer > 0) {
    drawSunBody(ctx, state, district, state.player.splitSunX, state.player.splitSunY, true);
  }
  for (const rival of state.enemies.filter((enemy) => (
    !enemy.dead && (enemy.archetype === 'twin' || enemy.archetype === 'noon-guardian')
  )).slice(0, 3)) {
    drawSunBody(ctx, state, district, rival.rivalSunX, rival.rivalSunY, true);
  }
}

function drawPlayer(ctx, state, district) {
  const player = state.player;
  const speed = Math.hypot(player.vx, player.vy);
  const angle = speed > 20 ? Math.atan2(player.vy, player.vx) : Math.atan2(player.aimY, player.aimX);
  ctx.save();
  ctx.strokeStyle = hexToRgba(district.actionEdge, 0.35);
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 9]);
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.sunX, player.sunY);
  ctx.stroke();
  if (player.splitTimer > 0) {
    ctx.strokeStyle = hexToRgba(COLORS.gold, 0.42);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.splitSunX, player.splitSunY);
    ctx.stroke();
  }

  if (player.dashTimer > 0) {
    ctx.strokeStyle = hexToRgba(COLORS.cyanWhite, 0.65);
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(player.previousX, player.previousY);
    ctx.lineTo(player.x, player.y);
    ctx.stroke();
  }

  ctx.translate(player.x, player.y);
  ctx.rotate(angle);
  ctx.shadowBlur = player.inShadow ? 22 : 12;
  ctx.shadowColor = player.inShadow ? district.actionEdge : COLORS.cream;
  ctx.fillStyle = player.hitTimer > 0 ? '#ffffff' : COLORS.cream;
  ctx.strokeStyle = district.actionEdge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(player.radius * 1.25, 0);
  ctx.lineTo(-player.radius * 0.55, -player.radius * 0.78);
  ctx.lineTo(-player.radius * 0.28, 0);
  ctx.lineTo(-player.radius * 0.55, player.radius * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#15122f';
  ctx.beginPath();
  ctx.arc(player.radius * 0.2, 0, 4.5, 0, TAU);
  ctx.fill();
  if (player.invulnerable > 0) {
    ctx.globalAlpha = 0.55 + Math.sin(state.time * 28) * 0.3;
    ctx.strokeStyle = COLORS.cream;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius * 1.5, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBeam(ctx, state, district) {
  if (!state.beam.active) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hexToRgba(district.accent, 0.18);
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(state.beam.fromX, state.beam.fromY);
  ctx.lineTo(state.beam.toX, state.beam.toY);
  ctx.stroke();
  ctx.strokeStyle = hexToRgba(COLORS.cream, 0.95);
  ctx.lineWidth = state.beam.hit ? 9 : 6;
  ctx.stroke();
  ctx.strokeStyle = hexToRgba(district.actionEdge, 0.85);
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 9]);
  ctx.lineDashOffset = -state.time * 120;
  ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx, state, district) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const particle of state.particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color
      ?? (/hurt|death|boss/.test(particle.kind) ? COLORS.magenta : /stone|wall/.test(particle.kind) ? COLORS.cream : district.actionEdge);
    ctx.beginPath();
    if (particle.kind === 'cut') {
      ctx.rect(particle.x - particle.size * 0.5, particle.y - 1, particle.size * 2.5, 2);
    } else ctx.arc(particle.x, particle.y, particle.size * (0.5 + alpha * 0.5), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawRoomBounds(ctx, state, district) {
  ctx.save();
  ctx.strokeStyle = hexToRgba(district.architecture, 0.62);
  ctx.lineWidth = 22;
  ctx.strokeRect(0, 0, ROOM_W, ROOM_H);
  for (const exit of state.room.exits) {
    const open = meetsRenderRequirement(state, exit.requires)
      && !(exit.bossGate && state.enemies.some((enemy) => enemy.boss && !enemy.dead));
    ctx.strokeStyle = open ? district.actionEdge : COLORS.cream;
    ctx.lineWidth = open ? 11 : 17;
    ctx.setLineDash(open ? [18, 12] : [3, 7]);
    ctx.beginPath();
    const half = exit.span * 0.5;
    if (exit.side === 'east') { ctx.moveTo(ROOM_W, exit.at - half); ctx.lineTo(ROOM_W, exit.at + half); }
    if (exit.side === 'west') { ctx.moveTo(0, exit.at - half); ctx.lineTo(0, exit.at + half); }
    if (exit.side === 'north') { ctx.moveTo(exit.at - half, 0); ctx.lineTo(exit.at + half, 0); }
    if (exit.side === 'south') { ctx.moveTo(exit.at - half, ROOM_H); ctx.lineTo(exit.at + half, ROOM_H); }
    ctx.stroke();
  }
  ctx.restore();
}

function drawScreenFx(ctx, state, width, height, options) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.48, Math.min(width, height) * 0.18, width * 0.5, height * 0.5, Math.max(width, height) * 0.72);
  vignette.addColorStop(0, 'rgba(2,2,12,0)');
  vignette.addColorStop(0.72, 'rgba(2,2,12,0.16)');
  vignette.addColorStop(1, 'rgba(2,1,10,0.7)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.24})`;
    ctx.fillRect(0, 0, width, height);
  }
  if (state.transition > 0) {
    ctx.fillStyle = `rgba(8,7,28,${clamp(state.transition, 0, 1)})`;
    ctx.fillRect(0, 0, width, height);
  }
  if (!options.reducedMotion) {
    ctx.globalAlpha = 0.055;
    ctx.fillStyle = '#ffffff';
    const scan = ((state.time * 36) % 5) | 0;
    for (let y = scan; y < height; y += 5) ctx.fillRect(0, y, width, 1);
  }
  ctx.restore();
}

export function createRenderer(canvas, initialOptions = {}) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('createRenderer requires a canvas');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) throw new Error('Canvas 2D is not available');
  const options = {
    reducedMotion: Boolean(initialOptions.reducedMotion),
    edgeEmphasis: Boolean(initialOptions.edgeEmphasis),
    screenShake: initialOptions.screenShake !== false,
    quality: initialOptions.quality ?? 'high',
    shadows: initialOptions.shadows !== false,
    decor: initialOptions.decor !== false,
    screenFx: initialOptions.screenFx !== false,
  };
  const stats = { frames: 0, width: 0, height: 0, dpr: 1, scale: 1, viewWidth: 0, viewHeight: 0, drawMs: 0 };
  let cameraX = ROOM_W * 0.5;
  let cameraY = ROOM_H * 0.5;
  let lastShakeX = 0;
  let lastShakeY = 0;
  let destroyed = false;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dprCap = options.quality === 'low' ? 1 : 1.6;
    const dpr = clamp(window.devicePixelRatio || 1, 1, dprCap);
    const width = Math.max(320, Math.round(rect.width * dpr));
    const height = Math.max(320, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    stats.width = width;
    stats.height = height;
    stats.dpr = dpr;
  }

  function render(state, alpha = 1) {
    if (destroyed || !state?.room) return;
    const started = performance.now();
    resize();
    const width = canvas.width;
    const height = canvas.height;
    const aspect = width / height;
    const viewHeight = aspect < 0.85 ? 900 : aspect < 1.25 ? 820 : 760;
    const viewWidth = viewHeight * aspect;
    const targetX = lerp(state.player.previousX, state.player.x, clamp(alpha, 0, 1));
    const targetY = lerp(state.player.previousY, state.player.y, clamp(alpha, 0, 1));
    cameraX = lerp(cameraX, clamp(targetX, viewWidth * 0.5, ROOM_W - viewWidth * 0.5), options.reducedMotion ? 1 : 0.18);
    cameraY = lerp(cameraY, clamp(targetY, viewHeight * 0.5, ROOM_H - viewHeight * 0.5), options.reducedMotion ? 1 : 0.18);
    const scale = height / viewHeight;
    stats.scale = scale;
    stats.viewWidth = viewWidth;
    stats.viewHeight = viewHeight;
    const shakeAmount = options.screenShake && !options.reducedMotion ? state.shake * 7 : 0;
    const shakeX = Math.sin(state.tick * 12.9898) * shakeAmount;
    const shakeY = Math.cos(state.tick * 8.233) * shakeAmount;
    lastShakeX = shakeX;
    lastShakeY = shakeY;
    const district = getDistrict(state);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = district.floor;
    ctx.fillRect(0, 0, width, height);
    ctx.setTransform(scale, 0, 0, scale, width * 0.5 - cameraX * scale + shakeX, height * 0.5 - cameraY * scale + shakeY);

    drawFloor(ctx, state, district);
    if (options.decor) drawDecor(ctx, state, district, 'back');
    drawHazards(ctx, state, district);
    drawReceivers(ctx, state, district);
    if (options.shadows) drawShadows(ctx, state, district, options.edgeEmphasis);
    drawTrails(ctx, state, district);
    for (const obstacle of state.obstacles) drawObstacle(ctx, obstacle, state, district);
    drawRoomBounds(ctx, state, district);
    if (options.decor) drawDecor(ctx, state, district, 'mid');
    drawPickups(ctx, state, district);
    drawBullets(ctx, state, district);
    for (const enemy of state.enemies) if (!enemy.dead) drawEnemyShape(ctx, enemy, state, district);
    drawBeam(ctx, state, district);
    drawSun(ctx, state, district);
    drawPlayer(ctx, state, district);
    drawParticles(ctx, state, district);
    if (options.decor) drawDecor(ctx, state, district, 'front');
    if (options.screenFx) drawScreenFx(ctx, state, width, height, options);

    stats.frames += 1;
    stats.drawMs = performance.now() - started;
  }

  function setOptions(next = {}) {
    Object.assign(options, next);
  }

  function getStats() {
    return { ...stats, options: { ...options }, cameraX, cameraY };
  }

  function worldToClient(x, y) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, stats.width);
    const height = Math.max(1, stats.height);
    const worldX = Number.isFinite(x) ? x : cameraX;
    const worldY = Number.isFinite(y) ? y : cameraY;
    const deviceX = (worldX - cameraX) * stats.scale + width * 0.5 + lastShakeX;
    const deviceY = (worldY - cameraY) * stats.scale + height * 0.5 + lastShakeY;
    return {
      x: rect.left + deviceX * (rect.width / width),
      y: rect.top + deviceY * (rect.height / height),
    };
  }

  function destroy() {
    destroyed = true;
  }

  resize();
  return Object.freeze({ render, resize, setOptions, getStats, worldToClient, destroy });
}
