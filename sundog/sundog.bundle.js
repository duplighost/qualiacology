'use strict';

/* ===== config.js ===== */
const VERSION = '1.2.0';

const CFG = Object.freeze({
  maxHealth: 5,
  trackHalfWidth: 7.4,
  playerZ: 9,
  baseSpeed: 31,
  maxSpeed: 52,
  acceleration: 1.25,
  steerSpeed: 10.4,
  steerResponse: 18,
  steerRelease: 22,
  jumpVelocity: 13.8,
  gravity: 31,
  coyoteTime: 0.11,
  jumpBuffer: 0.14,
  dashDuration: 0.26,
  dashCooldown: 0.38,
  dashVelocity: 17.6,
  dashSpeedBoost: 12,
  perfectWindow: 0.20,
  attackDuration: 0.32,
  attackCooldown: 0.04,
  attackRange: 12.5,
  attackWidth: 3.1,
  hitInvulnerability: 1.05,
  comboWindow: 2.2,
  maxChorus: 3,
  echoDelay: 0.23,
  checkpointPenalty: 900,
  stageEndDistance: 4660,
  bossStartDistance: 2360,
  boardDistance: 3280,
  coreDistance: 3860,
  finishDistance: 4520,
  farClip: 390,
  nearClip: 1.2,
  targetFps: 60,
});

const COLORS = Object.freeze({
  ink: '#171923',
  paper: '#fff9eb',
  cream: '#f7e9c6',
  sun: '#f3a24c',
  sun2: '#ffd47a',
  coral: '#f25f5c',
  blue: '#2796ad',
  sky: '#78c6db',
  violet: '#6657d9',
  mint: '#72c9a6',
  white: '#fffef7',
  blackGlass: '#242633',
});

const CHAPTERS = [
  { start: 0, end: 780, name: 'THE PUBLIC ROAD', objective: 'MOVE. JUMP. HIT SOMETHING.' },
  { start: 780, end: 1680, name: 'THE HANGING GARDENS', objective: 'KEEP THE CHORUS ALIVE' },
  { start: 1680, end: 2360, name: 'THE LAST TOLL', objective: 'BREAK THEIR LITTLE MACHINES' },
  { start: 2360, end: 3280, name: 'CROWN CHASE', objective: 'CATCH THE THING THAT STOLE THE DAY' },
  { start: 3280, end: 3860, name: 'BOARDING ACTION', objective: 'CUT THE THREE LOCKS' },
  { start: 3860, end: 4520, name: 'THE OPEN SUN', objective: 'MAKE MORNING FREE' },
  { start: 4520, end: Infinity, name: 'PUBLIC DOMAIN', objective: 'LET IT RISE' },
];

const RANKS = Object.freeze([
  { min: 260000, rank: 'SUN', note: 'THE HORIZON FILED A COMPLAINT.' },
  { min: 205000, rank: 'S', note: 'RUDELY BEAUTIFUL.' },
  { min: 145000, rank: 'A', note: 'THE DAY REMEMBERS YOU.' },
  { min: 90000, rank: 'B', note: 'STRONG WORK. MINOR PROPERTY DAMAGE.' },
  { min: 45000, rank: 'C', note: 'MORNING OCCURRED.' },
  { min: 0, rank: 'D', note: 'LEGALLY, THIS STILL COUNTS.' },
]);

const CONTROL_LABELS = Object.freeze({
  keyboard: {
    move: 'A / D OR ← / →',
    jump: 'SPACE',
    attack: 'J OR LEFT CLICK',
    dash: 'K OR RIGHT CLICK',
    pause: 'ESC',
  },
  gamepad: {
    move: 'LEFT STICK',
    jump: 'A',
    attack: 'X',
    dash: 'B / RB',
    pause: 'MENU',
  },
  touch: {
    move: 'DRAG LEFT PAD',
    jump: '↑',
    attack: '✦',
    dash: '➤',
    pause: 'Ⅱ',
  },
});


/* ===== utils.js ===== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => a === b ? 0 : (v - a) / (b - a);
const remap = (a, b, c, d, v) => lerp(c, d, clamp(invLerp(a, b, v), 0, 1));
const smoothstep = (a, b, v) => {
  const t = clamp(invLerp(a, b, v), 0, 1);
  return t * t * (3 - 2 * t);
};
const smootherstep = (a, b, v) => {
  const t = clamp(invLerp(a, b, v), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const easeOutCubic = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeInOutCubic = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
const easeOutBack = t => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const damp = (current, target, smoothing, dt) => lerp(current, target, 1 - Math.exp(-smoothing * dt));
const approach = (current, target, amount) => current < target ? Math.min(current + amount, target) : Math.max(current - amount, target);
const signNZ = v => v < 0 ? -1 : 1;
const randRange = (rng, a, b) => a + (b-a) * rng();
const choose = (rng, arr) => arr[Math.floor(rng()*arr.length) % arr.length];
const formatScore = n => Math.max(0, Math.floor(n)).toString().padStart(6, '0');
const formatTime = seconds => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  const cs = Math.floor((seconds % 1) * 100).toString().padStart(2, '0');
  return `${m}:${s}.${cs}`;
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hash01(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

function colorWithAlpha(hex, alpha) {
  const h = hex.replace('#','');
  const n = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`;
}

function roundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w)/2, Math.abs(h)/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}

function starPath(ctx, x, y, points, outer, inner, rotation=-Math.PI/2) {
  ctx.beginPath();
  for (let i=0;i<points*2;i++) {
    const r = i%2===0 ? outer : inner;
    const a = rotation + i*Math.PI/points;
    const px = x + Math.cos(a)*r;
    const py = y + Math.sin(a)*r;
    if (i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.closePath();
}

function polygon(ctx, pts) {
  if (!pts.length) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x,pts[0].y);
  for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y);
  ctx.closePath();
}

class RingBuffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.items = new Array(capacity);
    this.index = 0;
    this.length = 0;
  }
  clear() { this.index = 0; this.length = 0; }
  push(value) {
    this.items[this.index] = value;
    this.index = (this.index + 1) % this.capacity;
    this.length = Math.min(this.length + 1, this.capacity);
  }
  fromNewest(offset) {
    if (!this.length) return null;
    const o = Math.min(this.length - 1, Math.max(0, offset));
    const i = (this.index - 1 - o + this.capacity) % this.capacity;
    return this.items[i];
  }
}

class ObjectPool {
  constructor(factory, initial=0) {
    this.factory = factory;
    this.free = [];
    for (let i=0;i<initial;i++) this.free.push(factory());
  }
  acquire() { return this.free.pop() || this.factory(); }
  release(item) { this.free.push(item); }
}

function setVisible(el, visible) {
  if (!el) return;
  el.classList.toggle('visible', visible);
  el.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function safeStorageGet(key, fallback=null) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : v; }
  catch { return fallback; }
}
function safeStorageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}


/* ===== track.js ===== */


const TABLE_MIN = -96;
const TABLE_MAX = CFG.stageEndDistance + CFG.farClip + 320;
const TABLE_STEP = 1;

const TRACK_PALETTES = Object.freeze([
  Object.freeze({ road:'#171b34', road2:'#20274a', edge:'#ff5e62', line:'#ffe39a', rail:'#35d8ee', shadow:'#080d22' }),
  Object.freeze({ road:'#17383b', road2:'#20504e', edge:'#ff7c68', line:'#f7efb4', rail:'#57efca', shadow:'#071d25' }),
  Object.freeze({ road:'#241d3f', road2:'#34285a', edge:'#ff625e', line:'#ffd98b', rail:'#5bd8ff', shadow:'#0d0a22' }),
  Object.freeze({ road:'#15172b', road2:'#222640', edge:'#ff9b4b', line:'#fff0b0', rail:'#ff5f72', shadow:'#070916' }),
  Object.freeze({ road:'#0d101d', road2:'#171b2a', edge:'#ffc857', line:'#fff0bd', rail:'#32d6e9', shadow:'#03050c' }),
  Object.freeze({ road:'#25172e', road2:'#3d2447', edge:'#ffe06e', line:'#fff0c6', rail:'#b78cff', shadow:'#0d0714' }),
  Object.freeze({ road:'#7f481f', road2:'#b66c2d', edge:'#fff4c4', line:'#24172a', rail:'#2de1f2', shadow:'#32170d' }),
]);

class Track {
  constructor() {
    this.halfWidth = CFG.trackHalfWidth;
    const count = Math.ceil((TABLE_MAX - TABLE_MIN) / TABLE_STEP) + 2;
    this.centerTable = new Float32Array(count);
    this.heightTable = new Float32Array(count);
    this.widthTable = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const s = TABLE_MIN + i * TABLE_STEP;
      this.centerTable[i] = this._centerRaw(s);
      this.heightTable[i] = this._heightRaw(s);
      this.widthTable[i] = this._widthRaw(s);
    }
  }

  section(s) {
    if (s < 780) return 0;
    if (s < 1680) return 1;
    if (s < 2360) return 2;
    if (s < 3280) return 3;
    if (s < 3860) return 4;
    if (s < 4520) return 5;
    return 6;
  }

  _centerRaw(s) {
    const sec = this.section(s);
    let x = Math.sin(s * .0062) * 3.2 + Math.sin(s * .00177) * 8.2;
    if (sec === 0) x += Math.sin(s * .012) * 1.2;
    if (sec === 1) x += Math.sin((s - 780) * .018) * 2.4;
    if (sec === 2) x += Math.sin((s - 1680) * .009) * 5.2;
    if (sec === 3) x += Math.sin((s - 2360) * .004) * 10.5;
    if (sec >= 4) x *= .32;
    return x;
  }

  _heightRaw(s) {
    const sec = this.section(s);
    let y = Math.sin(s * .0036) * 1.1 + Math.sin(s * .0123) * .32;
    if (sec === 1) y += 2.2 + Math.sin((s - 780) * .007) * 2.0;
    if (sec === 2) y += 1.0 - smoothstep(1680, 2360, s) * 2.1;
    if (sec === 3) y += Math.sin((s - 2360) * .008) * 2.8;
    if (sec === 4) y = 2.0 + Math.sin(s * .01) * .25;
    if (sec === 5) y = 2.2 + Math.sin(s * .006) * .45;
    if (sec === 6) y = 2.4 + smoothstep(4520, 4700, s) * 7;
    return y;
  }

  _widthRaw(s) {
    const sec = this.section(s);
    if (sec === 1) return 7.1 + Math.sin(s * .03) * .6;
    if (sec === 2) return 7.6;
    if (sec === 3) return 6.9 + Math.sin(s * .01) * .45;
    if (sec === 4) return 8.3;
    if (sec === 5) return 9.0;
    if (sec === 6) return 9.8;
    return this.halfWidth;
  }

  _sample(table, s, raw) {
    const f = (s - TABLE_MIN) / TABLE_STEP;
    if (f < 0 || f >= table.length - 1) return raw.call(this, s);
    const i = f | 0;
    return lerp(table[i], table[i + 1], f - i);
  }

  center(s) { return this._sample(this.centerTable, s, this._centerRaw); }
  height(s) { return this._sample(this.heightTable, s, this._heightRaw); }
  width(s) { return this._sample(this.widthTable, s, this._widthRaw); }

  frame(s) {
    const sec = this.section(s);
    return { s, sec, center: this.center(s), height: this.height(s), width: this.width(s), pal: this.palette(s) };
  }

  bank(s) {
    const d = (this.center(s + 4) - this.center(s - 4)) / 8;
    return clamp(d * .13, -.42, .42);
  }

  tangentYaw(s) {
    return Math.atan2(this.center(s + 5) - this.center(s - 5), 10);
  }

  palette(s) { return TRACK_PALETTES[this.section(s)] || TRACK_PALETTES[0]; }

  camera(distance, player, reducedMotion = false) {
    const camS = distance - 5.6;
    const yaw = this.tangentYaw(camS);
    const bob = reducedMotion ? 0 : Math.sin(player.animTime * 9) * .015 * Math.min(1, player.speed / 35);
    const pitch = -.035 + clamp(player.y * .008, 0, .035);
    const roll = reducedMotion ? 0 : -this.bank(distance) * .22 - player.vx * .0042;
    return {
      s: camS,
      x: this.center(camS) + player.x * .24,
      y: this.height(camS) + 3.72 + player.y * .10 + bob,
      yaw,
      pitch,
      roll,
      cy: Math.cos(yaw), sy: Math.sin(yaw),
      cp: Math.cos(pitch), sp: Math.sin(pitch),
      cr: Math.cos(roll), sr: Math.sin(roll),
    };
  }

  prepareCamera(camera) {
    camera.cy = Math.cos(camera.yaw); camera.sy = Math.sin(camera.yaw);
    camera.cp = Math.cos(camera.pitch); camera.sp = Math.sin(camera.pitch);
    camera.cr = Math.cos(camera.roll); camera.sr = Math.sin(camera.roll);
    return camera;
  }

  worldPoint(s, lane = 0, lift = 0) {
    return { x: this.center(s) + lane, y: this.height(s) + lift, s };
  }

  project(point, camera, view) {
    const dx = point.x - camera.x;
    const dz = point.s - camera.s;
    const dy = point.y - camera.y;
    const cy = camera.cy ?? Math.cos(camera.yaw), sy = camera.sy ?? Math.sin(camera.yaw);
    let lx = dx * cy - dz * sy;
    let lz = dx * sy + dz * cy;
    const cp = camera.cp ?? Math.cos(camera.pitch), sp = camera.sp ?? Math.sin(camera.pitch);
    let ly = dy * cp - lz * sp;
    lz = dy * sp + lz * cp;
    const cr = camera.cr ?? Math.cos(camera.roll), sr = camera.sr ?? Math.sin(camera.roll);
    const rx = lx * cr - ly * sr;
    const ry = lx * sr + ly * cr;
    lx = rx; ly = ry;
    if (lz <= CFG.nearClip) return null;
    const scale = view.focal / lz;
    return { x: view.cx + lx * scale, y: view.cy - ly * scale, scale, z: lz, visible: lz < CFG.farClip };
  }

  sampleDecor(s, side) {
    const h = hash01(Math.floor(s / 22) * 17 + side * 83);
    const sec = this.section(s);
    if (sec === 1) return h > .42 ? 'tree' : 'arch';
    if (sec === 2) return h > .58 ? 'sign' : 'tower';
    if (sec === 3) return h > .65 ? 'flag' : 'pylon';
    if (sec >= 4) return h > .5 ? 'spine' : 'vent';
    return h > .6 ? 'pylon' : 'sign';
  }
}


/* ===== effects.js ===== */


class Effects {
  constructor() {
    this.world = [];
    this.screen = [];
    this.slashes = [];
    this.rings = [];
    this.popups = [];
    this.flash = 0;
    this.flashColor = '#fff';
    this.shake = 0;
    this.freeze = 0;
    this.maxWorld = 260;
    this.maxScreen = 90;
  }

  reset() {
    this.world.length=0; this.screen.length=0; this.slashes.length=0; this.rings.length=0; this.popups.length=0;
    this.flash=0; this.shake=0; this.freeze=0;
  }

  _cap(list, max) { if (list.length > max) list.splice(0, list.length - max); }
  hitStop(seconds) { this.freeze = Math.max(this.freeze,seconds); }
  addShake(amount) { this.shake = Math.min(30,this.shake+amount); }
  addFlash(color='#fff',amount=.35) { this.flashColor=color; this.flash=Math.max(this.flash,amount); }

  sparks(s,x,y,count=14,color=COLORS.sun2,power=1) {
    for(let i=0;i<count;i++) {
      const a=Math.random()*TAU;
      this.world.push({kind:'spark',s,x,y,vs:(Math.random()*10-2)*power,vx:Math.cos(a)*(2+Math.random()*8)*power,vy:(1+Math.random()*8)*power,life:.32+Math.random()*.38,maxLife:.7,size:.04+Math.random()*.11,color,rot:Math.random()*TAU,vr:(Math.random()-.5)*16});
    }
    this._cap(this.world,this.maxWorld);
  }

  shards(s,x,y,count=18,color=COLORS.paper,power=1) {
    for(let i=0;i<count;i++) {
      const a=Math.random()*TAU;
      this.world.push({kind:'shard',s,x,y,vs:(Math.random()*13-4)*power,vx:Math.cos(a)*(2+Math.random()*7)*power,vy:(2+Math.random()*9)*power,life:.55+Math.random()*.75,maxLife:1.3,size:.08+Math.random()*.18,color,rot:Math.random()*TAU,vr:(Math.random()-.5)*13});
    }
    this._cap(this.world,this.maxWorld);
  }

  petals(s,x,y,count=12,color='#ffe6d5') {
    for(let i=0;i<count;i++) {
      this.world.push({kind:'petal',s:s+(Math.random()-.5)*5,x:x+(Math.random()-.5)*5,y:y+Math.random()*3,vs:-2-Math.random()*5,vx:(Math.random()-.5)*3,vy:1+Math.random()*2,life:1.2+Math.random()*1.5,maxLife:2.7,size:.09+Math.random()*.13,color,rot:Math.random()*TAU,vr:(Math.random()-.5)*6});
    }
    this._cap(this.world,this.maxWorld);
  }

  dust(s,x,y,count=8,color='#f5d28e') {
    for(let i=0;i<count;i++) this.world.push({kind:'dust',s:s+Math.random()*2,x:x+(Math.random()-.5)*1.8,y:y+.1,vs:-3-Math.random()*5,vx:(Math.random()-.5)*2,vy:.4+Math.random()*1.1,life:.28+Math.random()*.42,maxLife:.7,size:.12+Math.random()*.28,color,rot:0,vr:0});
    this._cap(this.world,this.maxWorld);
  }

  speedLines(view,count=12,strength=1) {
    for(let i=0;i<count;i++) {
      const cx=view.cx+(Math.random()-.5)*view.w*.5;
      const cy=view.cy+(Math.random()-.5)*view.h*.35;
      const dx=(cx-view.cx),dy=(cy-view.cy);
      const len=(45+Math.random()*140)*strength;
      const mag=Math.hypot(dx,dy)||1;
      this.screen.push({kind:'line',x:cx,y:cy,vx:dx/mag*80*strength,vy:dy/mag*80*strength,dx:dx/mag*len,dy:dy/mag*len,life:.12+Math.random()*.18,maxLife:.3,color:'rgba(255,255,255,.5)',size:1+Math.random()*2});
    }
    this._cap(this.screen,this.maxScreen);
  }

  slash(s,x,y,side=1,color=COLORS.paper,echo=false) {
    this.slashes.push({s,x,y,side,color,echo,life:.22,maxLife:.22});
    this._cap(this.slashes,24);
  }
  ring(s,x,y,color=COLORS.sun2,size=1,life=.45) { this.rings.push({s,x,y,color,size,life,maxLife:life}); this._cap(this.rings,36); }
  popup(text,x,y,color='#fff',scale=1) { this.popups.push({text,x,y,color,scale,life:.7,maxLife:.7}); this._cap(this.popups,16); }

  update(dt) {
    this.flash=Math.max(0,this.flash-dt*2.8);
    this.shake=Math.max(0,this.shake-dt*18);
    let w=0;
    for(let i=0;i<this.world.length;i++){
      const p=this.world[i];
      p.life-=dt; p.s+=p.vs*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy-=11*dt; p.vx*=Math.exp(-1.2*dt); p.vs*=Math.exp(-.4*dt); p.rot+=p.vr*dt;
      if(p.life>0)this.world[w++]=p;
    }
    this.world.length=w;
    w=0;
    for(let i=0;i<this.screen.length;i++){const p=this.screen[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.life>0)this.screen[w++]=p;}this.screen.length=w;
    w=0;for(let i=0;i<this.slashes.length;i++){const p=this.slashes[i];p.life-=dt;if(p.life>0)this.slashes[w++]=p;}this.slashes.length=w;
    w=0;for(let i=0;i<this.rings.length;i++){const p=this.rings[i];p.life-=dt;if(p.life>0)this.rings[w++]=p;}this.rings.length=w;
    w=0;for(let i=0;i<this.popups.length;i++){const p=this.popups[i];p.life-=dt;p.y-=36*dt;if(p.life>0)this.popups[w++]=p;}this.popups.length=w;
  }

  renderWorld(ctx, track, camera, view) {
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    for (const p of this.rings) {
      const pr=track.project(track.worldPoint(p.s,p.x,p.y),camera,view); if(!pr||!pr.visible) continue;
      const t=1-p.life/p.maxLife;
      ctx.globalAlpha=(1-t)*.72;
      ctx.strokeStyle=p.color;
      ctx.lineWidth=Math.max(1,pr.scale*.06);
      ctx.beginPath(); ctx.ellipse(pr.x,pr.y,pr.scale*p.size*(1+t*2),pr.scale*p.size*.38*(1+t*2),0,0,TAU); ctx.stroke();
    }
    for (const p of this.world) {
      const pr=track.project(track.worldPoint(p.s,p.x,p.y),camera,view); if(!pr||!pr.visible) continue;
      const a=clamp(p.life/p.maxLife,0,1);
      const size=Math.max(.8,pr.scale*p.size);
      ctx.globalAlpha=a;
      ctx.fillStyle=p.color;
      if(p.kind==='spark') {
        ctx.save();ctx.translate(pr.x,pr.y);ctx.rotate(p.rot);ctx.fillRect(-size*.18,-size*2,size*.36,size*4);ctx.restore();
      } else if(p.kind==='shard') {
        ctx.save();ctx.translate(pr.x,pr.y);ctx.rotate(p.rot);ctx.beginPath();ctx.moveTo(0,-size*1.8);ctx.lineTo(size,size*.8);ctx.lineTo(-size*.6,size);ctx.closePath();ctx.fill();ctx.restore();
      } else if(p.kind==='petal') {
        ctx.save();ctx.translate(pr.x,pr.y);ctx.rotate(p.rot);ctx.beginPath();ctx.ellipse(0,0,size*1.4,size*.55,0,0,TAU);ctx.fill();ctx.restore();
      } else {
        ctx.globalAlpha=a*.24;ctx.beginPath();ctx.arc(pr.x,pr.y,size,0,TAU);ctx.fill();
      }
    }
    for (const s of this.slashes) {
      const pr=track.project(track.worldPoint(s.s,s.x,s.y+1),camera,view); if(!pr||!pr.visible) continue;
      const t=1-s.life/s.maxLife;
      const r=pr.scale*(4.8+t*2.2);
      ctx.globalAlpha=(1-t)*(s.echo?.36:.84);
      ctx.strokeStyle=s.color;
      ctx.lineWidth=Math.max(2,pr.scale*(s.echo?.08:.14));
      ctx.lineCap='round';
      ctx.beginPath();
      const start=s.side>0?-2.35:-.79;
      const end=s.side>0?-.35:1.95;
      ctx.arc(pr.x,pr.y,r,start,end,s.side<0);
      ctx.stroke();
      ctx.lineWidth=Math.max(1,pr.scale*.035);ctx.strokeStyle='rgba(255,255,255,.95)';ctx.stroke();
    }
    ctx.restore();
  }

  renderScreen(ctx,view) {
    ctx.save();ctx.globalCompositeOperation='screen';
    for(const p of this.screen) {
      const a=clamp(p.life/p.maxLife,0,1);
      ctx.globalAlpha=a;ctx.strokeStyle=p.color;ctx.lineWidth=p.size;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+p.dx,p.y+p.dy);ctx.stroke();
    }
    ctx.restore();
    for(const p of this.popups) {
      const a=clamp(p.life/p.maxLife,0,1);
      ctx.save();ctx.globalAlpha=Math.min(1,a*2);ctx.translate(p.x,p.y);ctx.scale(p.scale,p.scale);ctx.fillStyle=p.color;ctx.strokeStyle='rgba(23,25,35,.25)';ctx.lineWidth=5;ctx.textAlign='center';ctx.font='950 20px system-ui,sans-serif';ctx.strokeText(p.text,0,0);ctx.fillText(p.text,0,0);ctx.restore();
    }
    if(this.flash>0) {
      ctx.save();ctx.globalAlpha=this.flash*.55;ctx.fillStyle=this.flashColor;ctx.fillRect(0,0,view.w,view.h);ctx.restore();
    }
  }
}


/* ===== input.js ===== */

const KEY = {
  left: ['KeyA','ArrowLeft'],
  right: ['KeyD','ArrowRight'],
  jump: ['Space','KeyW','ArrowUp'],
  attack: ['KeyJ','KeyX'],
  dash: ['KeyK','KeyC','ShiftLeft','ShiftRight'],
  pause: ['Escape','KeyP'],
  confirm: ['Enter','Space'],
};

class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.prevKeys = new Set();
    this.mouse = new Set();
    this.prevMouse = new Set();
    this.touchButtons = new Set();
    this.prevTouchButtons = new Set();
    this.touchAxis = 0;
    this.gamepadPrev = [];
    this.lastDevice = 'keyboard';
    this.enabled = true;
    this._pauseLatch = false;
    this._bindKeyboard();
    this._bindMouse();
    this._bindTouch();
    this.detectTouch();
  }

  detectTouch() {
    const touch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    document.body.classList.toggle('touch', touch);
    this.isTouch = touch;
    return touch;
  }

  _bindKeyboard() {
    addEventListener('keydown', e => {
      if (!this.enabled) return;
      if (Object.values(KEY).some(list => list.includes(e.code))) e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) this.lastDevice = 'keyboard';
    }, {passive:false});
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouse.clear(); this.touchButtons.clear(); this.touchAxis = 0; });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.keys.clear(); this.mouse.clear(); this.touchButtons.clear(); this.touchAxis = 0; }
    });
  }

  _bindMouse() {
    this.canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;
      this.canvas.focus();
      this.mouse.add(e.button);
      this.lastDevice = 'keyboard';
    });
    addEventListener('pointerup', e => this.mouse.delete(e.button));
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  _bindTouch() {
    const stick = document.getElementById('touch-stick');
    const knob = document.getElementById('touch-knob');
    if (stick && knob) {
      let activeId = null;
      const update = e => {
        const r = stick.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width/2);
        const radius = r.width * .34;
        const x = clamp(dx / radius, -1, 1);
        this.touchAxis = x;
        knob.style.transform = `translate(${x*radius}px,0)`;
        this.lastDevice = 'touch';
      };
      stick.addEventListener('pointerdown', e => {
        activeId = e.pointerId;
        stick.setPointerCapture(activeId);
        update(e);
      });
      stick.addEventListener('pointermove', e => { if (e.pointerId === activeId) update(e); });
      const end = e => {
        if (e.pointerId !== activeId) return;
        activeId = null;
        this.touchAxis = 0;
        knob.style.transform = 'translate(0,0)';
      };
      stick.addEventListener('pointerup', end);
      stick.addEventListener('pointercancel', end);
    }

    const bind = (id, action) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', e => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        this.touchButtons.add(action);
        this.lastDevice = 'touch';
      });
      const end = e => { e.preventDefault(); this.touchButtons.delete(action); };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    };
    bind('touch-jump','jump');
    bind('touch-attack','attack');
    bind('touch-dash','dash');
    bind('touch-pause','pause');
  }

  _keyDown(action) { return KEY[action]?.some(code => this.keys.has(code)) || false; }
  _keyPressed(action) { return KEY[action]?.some(code => this.keys.has(code) && !this.prevKeys.has(code)) || false; }
  _touchDown(action) { return this.touchButtons.has(action); }
  _touchPressed(action) { return this.touchButtons.has(action) && !this.prevTouchButtons.has(action); }
  _mousePressed(button) { return this.mouse.has(button) && !this.prevMouse.has(button); }

  pollGamepad() {
    const pads = navigator.getGamepads?.() || [];
    const pad = [...pads].find(Boolean);
    if (!pad) return null;
    const prev = this.gamepadPrev;
    const buttons = pad.buttons.map(b => b.pressed || b.value > .55);
    const pressed = i => !!buttons[i] && !prev[i];
    const down = i => !!buttons[i];
    const dead = v => Math.abs(v) < .18 ? 0 : (Math.abs(v)-.18)/.82*Math.sign(v);
    const axis = dead(pad.axes[0] || 0);
    if (Math.abs(axis) > .05 || buttons.some(Boolean)) this.lastDevice = 'gamepad';
    const result = {
      axis,
      jump: pressed(0),
      attack: pressed(2) || pressed(3),
      dash: pressed(1) || pressed(5),
      pause: pressed(9),
      confirm: pressed(0),
      jumpDown: down(0),
      attackDown: down(2) || down(3),
      dashDown: down(1) || down(5),
    };
    this.gamepadPrev = buttons;
    return result;
  }

  sample() {
    const gp = this.pollGamepad();
    const keyAxis = (this._keyDown('right') ? 1 : 0) - (this._keyDown('left') ? 1 : 0);
    const axis = clamp(Math.abs(this.touchAxis) > .02 ? this.touchAxis : (gp?.axis ?? keyAxis), -1, 1);
    const out = {
      axis,
      jump: this._keyPressed('jump') || this._touchPressed('jump') || !!gp?.jump,
      attack: this._keyPressed('attack') || this._mousePressed(0) || this._touchPressed('attack') || !!gp?.attack,
      dash: this._keyPressed('dash') || this._mousePressed(2) || this._touchPressed('dash') || !!gp?.dash,
      pause: this._keyPressed('pause') || this._touchPressed('pause') || !!gp?.pause,
      confirm: this._keyPressed('confirm') || !!gp?.confirm,
      jumpDown: this._keyDown('jump') || this._touchDown('jump') || !!gp?.jumpDown,
      attackDown: this._keyDown('attack') || this._touchDown('attack') || this.mouse.has(0) || !!gp?.attackDown,
      dashDown: this._keyDown('dash') || this._touchDown('dash') || this.mouse.has(2) || !!gp?.dashDown,
      device: this.lastDevice,
    };
    return out;
  }

  _copySet(source,target) { target.clear(); for(const value of source)target.add(value); }

  endFrame() {
    this._copySet(this.keys,this.prevKeys);
    this._copySet(this.mouse,this.prevMouse);
    this._copySet(this.touchButtons,this.prevTouchButtons);
  }

  clearEdges() {
    this._copySet(this.keys,this.prevKeys);
    this._copySet(this.mouse,this.prevMouse);
    this._copySet(this.touchButtons,this.prevTouchButtons);
    this.gamepadPrev.length = 0;
  }
}


/* ===== audio.js ===== */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.started = false;
    this.muted = false;
    this.nextNote = 0;
    this.step = 0;
    this.timer = null;
    this.bpm = 150;
    this.intensity = 0;
    this.phase = 0;
    this.noiseBuffer = null;
  }

  async start() {
    if (this.started) {
      if (this.ctx?.state === 'suspended') this.ctx.resume().catch(()=>{});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC({latencyHint:'interactive'});
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : .68;
      this.musicBus.gain.value = .48;
      this.sfxBus.gain.value = .9;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this._makeNoise();
      this.nextNote = this.ctx.currentTime + .06;
      this.timer = setInterval(() => this._schedule(), 25);
      this.started = true;
      this.ctx.resume().catch(()=>{});
    } catch { /* game remains playable without audio */ }
  }

  setMuted(value) {
    this.muted = !!value;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : .68, this.ctx.currentTime, .025);
  }
  setIntensity(v) { this.intensity = clamp(v,0,1); }
  setPhase(v) { this.phase = v; }

  _makeNoise() {
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * 1.5));
    const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i=0;i<len;i++) {
      const white = Math.random()*2-1;
      last = last*.94 + white*.06;
      d[i] = white*.7 + last*.3;
    }
    return b;
  }

  _schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const stepDur = 60 / this.bpm / 4;
    while (this.nextNote < this.ctx.currentTime + .12) {
      this._musicStep(this.step, this.nextNote);
      this.nextNote += stepDur;
      this.step = (this.step + 1) % 64;
    }
  }

  _musicStep(step, t) {
    const bar = Math.floor(step/16);
    const s = step%16;
    const intensity = this.intensity;
    if (s===0 || s===8) this._kick(t, s===0 ? .95 : .72);
    if (s===4 || s===12) this._snare(t, .48 + intensity*.18);
    if (s%2===0 && (intensity>.08 || s%4===0)) this._hat(t, s%4===2 ? .13 : .085);
    if (intensity>.58 && (s===3 || s===7 || s===11 || s===15)) this._hat(t, .08, true);

    const roots = this.phase >= 3 ? [45,48,52,43] : [45,52,48,50];
    const root = roots[bar%roots.length];
    if (s===0 || s===6 || s===8 || s===14) {
      const notes = [root, root, root+7, root+5];
      this._bass(t, notes[(s/2)%4|0], .12 + intensity*.08);
    }
    if (intensity>.22 && s%4===0) {
      const chord = [root+12, root+16, root+19];
      this._pad(t, chord, .08 + intensity*.045, .34);
    }
    if (intensity>.62 && s%2===1) {
      const arp = [root+24,root+28,root+31,root+35];
      this._pluck(t, arp[(step+bar)%arp.length], .045 + intensity*.025);
    }
  }

  _osc({time, freq, endFreq=freq, type='sine', gain=.1, dur=.1, bus=this.sfxBus, attack=.002}) {
    if (!this.ctx || !bus) return;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(Math.max(20,freq),time);
    o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),time+dur);
    g.gain.setValueAtTime(.0001,time);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),time+attack);
    g.gain.exponentialRampToValueAtTime(.0001,time+dur);
    o.connect(g).connect(bus); o.start(time); o.stop(time+dur+.02);
  }
  _noise({time, gain=.1, dur=.1, highpass=500, lowpass=14000, bus=this.sfxBus}) {
    if (!this.ctx || !this.noiseBuffer || !bus) return;
    const src=this.ctx.createBufferSource(), hp=this.ctx.createBiquadFilter(), lp=this.ctx.createBiquadFilter(), g=this.ctx.createGain();
    src.buffer=this.noiseBuffer; hp.type='highpass'; hp.frequency.value=highpass; lp.type='lowpass'; lp.frequency.value=lowpass;
    g.gain.setValueAtTime(gain,time); g.gain.exponentialRampToValueAtTime(.0001,time+dur);
    src.connect(hp).connect(lp).connect(g).connect(bus); src.start(time); src.stop(time+dur+.02);
  }
  _midi(n) { return 440*Math.pow(2,(n-69)/12); }
  _kick(t, gain=.8) { this._osc({time:t,freq:140,endFreq:42,type:'sine',gain:.23*gain,dur:.16,bus:this.musicBus}); }
  _snare(t,gain=.5) { this._noise({time:t,gain:.13*gain,dur:.13,highpass:900,lowpass:6800,bus:this.musicBus}); this._osc({time:t,freq:180,endFreq:120,type:'triangle',gain:.05*gain,dur:.08,bus:this.musicBus}); }
  _hat(t,gain=.1,open=false) { this._noise({time:t,gain,dur:open?.12:.035,highpass:5000,lowpass:15000,bus:this.musicBus}); }
  _bass(t,n,g=.15) { this._osc({time:t,freq:this._midi(n),endFreq:this._midi(n),type:'sawtooth',gain:g,dur:.19,bus:this.musicBus,attack:.006}); }
  _pad(t,notes,g=.09,dur=.3) { notes.forEach((n,i)=>this._osc({time:t+i*.006,freq:this._midi(n),type:i%2?'triangle':'sine',gain:g/notes.length,dur,bus:this.musicBus,attack:.035})); }
  _pluck(t,n,g=.06) { this._osc({time:t,freq:this._midi(n),endFreq:this._midi(n-1),type:'triangle',gain:g,dur:.09,bus:this.musicBus}); }

  sfx(name, strength=1) {
    if (!this.ctx || !this.started || this.ctx.state!=='running') return;
    const t=this.ctx.currentTime;
    const s=clamp(strength,0,2);
    switch(name) {
      case 'jump':
        this._osc({time:t,freq:230,endFreq:520,type:'triangle',gain:.08*s,dur:.12}); break;
      case 'dash':
        this._noise({time:t,gain:.13*s,dur:.18,highpass:700,lowpass:9000});
        this._osc({time:t,freq:180,endFreq:62,type:'sawtooth',gain:.055*s,dur:.15}); break;
      case 'slash':
        this._noise({time:t,gain:.12*s,dur:.085,highpass:1600,lowpass:12000});
        this._osc({time:t,freq:900,endFreq:230,type:'sawtooth',gain:.045*s,dur:.095}); break;
      case 'hit':
        this._osc({time:t,freq:120,endFreq:48,type:'square',gain:.10*s,dur:.10});
        this._noise({time:t,gain:.10*s,dur:.07,highpass:280,lowpass:4200}); break;
      case 'hurt':
        this._osc({time:t,freq:260,endFreq:70,type:'sawtooth',gain:.12*s,dur:.24});
        this._noise({time:t,gain:.12*s,dur:.13,highpass:120,lowpass:2800}); break;
      case 'perfect':
        [0,4,7,12].forEach((n,i)=>this._osc({time:t+i*.035,freq:this._midi(72+n),type:'sine',gain:.055*s,dur:.28})); break;
      case 'break':
        this._noise({time:t,gain:.18*s,dur:.26,highpass:260,lowpass:8200});
        this._osc({time:t,freq:95,endFreq:35,type:'sine',gain:.13*s,dur:.32}); break;
      case 'collect':
        this._osc({time:t,freq:500+s*80,endFreq:900+s*170,type:'sine',gain:.05*s,dur:.13}); break;
      case 'boss':
        this._osc({time:t,freq:62,endFreq:25,type:'sawtooth',gain:.20*s,dur:.8});
        this._noise({time:t,gain:.16*s,dur:.65,highpass:45,lowpass:1400}); break;
      case 'win':
        [0,7,12,16,19].forEach((n,i)=>this._osc({time:t+i*.09,freq:this._midi(60+n),type:'triangle',gain:.07*s,dur:.7})); break;
    }
  }
}


/* ===== entities.js ===== */


let NEXT_ID=1;
const id=()=>NEXT_ID++;

class Player {
  constructor() {
    this.history=new RingBuffer(240);
    this.reset(true);
  }

  reset(full=true) {
    this.x=0; this.vx=0; this.y=0; this.vy=0; this.grounded=true;
    this.coyote=CFG.coyoteTime; this.jumpBuffer=0;
    this.dashTimer=0; this.dashCooldown=0; this.dashAge=0; this.dashDir=1;
    this.attackTimer=0; this.attackCooldown=0; this.attackIndex=0; this.attackBuffer=0; this.dashBuffer=0;
    this.invuln=0; this.hitFlash=0; this.animTime=0; this.lean=0; this.speed=CFG.baseSpeed;
    this.health=CFG.maxHealth; this.chorus=full?0:this.chorus;
    this.combo=0; this.comboTimer=0; this.flow=0;
    this.lightChain=0; this.lightTimer=0; this.wallSparkCooldown=0;
    this.lastAxis=1; this.lastPerfectAt=-999; this.dead=false;
    this.history.clear();
  }

  update(dt,input,game) {
    this.animTime+=dt;
    this.invuln=Math.max(0,this.invuln-dt);
    this.hitFlash=Math.max(0,this.hitFlash-dt);
    this.dashCooldown=Math.max(0,this.dashCooldown-dt);
    this.attackCooldown=Math.max(0,this.attackCooldown-dt);
    this.attackBuffer=Math.max(0,this.attackBuffer-dt);
    this.dashBuffer=Math.max(0,this.dashBuffer-dt);
    this.lightTimer=Math.max(0,this.lightTimer-dt);
    this.wallSparkCooldown=Math.max(0,this.wallSparkCooldown-dt);
    if(this.lightTimer<=0)this.lightChain=0;
    this.comboTimer=Math.max(0,this.comboTimer-dt);
    if(this.comboTimer<=0) this.combo=0;
    if(this.attackTimer>0) this.attackTimer=Math.max(0,this.attackTimer-dt);
    if(this.dashTimer>0) { this.dashTimer=Math.max(0,this.dashTimer-dt); this.dashAge+=dt; }

    if(Math.abs(input.axis)>.08) this.lastAxis=signNZ(input.axis);
    const axis=Math.abs(input.axis)>.055?input.axis:0;
    if(this.dashTimer>0) {
      const dashTarget=this.dashDir*CFG.dashVelocity+axis*1.15;
      this.vx=damp(this.vx,dashTarget,24,dt);
    } else {
      const targetVx=axis*CFG.steerSpeed;
      this.vx=damp(this.vx,targetVx,axis?CFG.steerResponse:CFG.steerRelease,dt);
    }
    this.x += this.vx*dt;

    const half=game.track.width(game.distance+CFG.playerZ)-.72;
    if(this.x < -half) { this.x=-half; if(this.vx<0)this.vx=0; this.scrapeEdge(game); }
    if(this.x > half) { this.x=half; if(this.vx>0)this.vx=0; this.scrapeEdge(game); }

    this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
    if(input.jump) this.jumpBuffer=CFG.jumpBuffer;
    if(this.grounded) this.coyote=CFG.coyoteTime; else this.coyote=Math.max(0,this.coyote-dt);
    if(this.jumpBuffer>0 && this.coyote>0) {
      this.vy=CFG.jumpVelocity; this.grounded=false; this.coyote=0; this.jumpBuffer=0;
      game.audio.sfx('jump'); game.effects.dust(game.distance+CFG.playerZ,this.x,0,7);
      game.stats.jumps++;
    }
    if(!input.jumpDown && this.vy>4.2) this.vy-=22*dt;
    this.vy-=CFG.gravity*dt;
    this.y+=this.vy*dt;
    if(this.y<=0) {
      if(!this.grounded && this.vy<-7) game.effects.dust(game.distance+CFG.playerZ,this.x,0,8);
      this.y=0;this.vy=0;this.grounded=true;
    }

    if(input.dash) this.dashBuffer=.14;
    if(input.attack) this.attackBuffer=.16;
    if(this.dashBuffer>0 && this.dashCooldown<=0) { this.dashBuffer=0; this.startDash(input.axis,game); }
    if(this.attackBuffer>0 && this.attackCooldown<=0) { this.attackBuffer=0; this.startAttack(game); }

    const targetLean=clamp(-this.vx*.045 + input.axis*.12,-.55,.55);
    this.lean=damp(this.lean,targetLean,10,dt);
    this.flow=Math.max(0,this.flow-dt*(this.comboTimer>0?.035:.12));

    this.history.push({x:this.x,y:this.y,lean:this.lean,attackTimer:this.attackTimer,attackIndex:this.attackIndex,dash:this.dashTimer>0,t:game.elapsed});
  }

  startDash(axis,game) {
    this.dashTimer=CFG.dashDuration;this.dashCooldown=CFG.dashCooldown;this.dashAge=0;
    this.dashDir=Math.abs(axis)>.12?signNZ(axis):this.lastAxis;
    this.invuln=Math.max(this.invuln,CFG.dashDuration+.04);
    this.vx=this.dashDir*CFG.dashVelocity;
    game.speedImpulse+=CFG.dashSpeedBoost;
    game.audio.sfx('dash');game.effects.speedLines(game.view,game.settings.reducedMotion?3:10,1.0);
    game.effects.dust(game.distance+CFG.playerZ,this.x,0,8,COLORS.paper);
    game.stats.dashes++;
  }

  scrapeEdge(game) {
    if(this.wallSparkCooldown>0)return;
    this.wallSparkCooldown=.08;
    game.effects.sparks(game.distance+CFG.playerZ,this.x,0,4,COLORS.sun,.55);
  }

  startAttack(game) {
    this.attackIndex=(this.attackIndex+1)%3;
    this.attackTimer=CFG.attackDuration;
    this.attackCooldown=CFG.attackDuration*.44+CFG.attackCooldown;
    const side=this.attackIndex===1?-1:1;
    const lift=this.y+1.15;
    const target=game.targetEntity;
    const targetRz=target?target.s-(game.distance+CFG.playerZ):999;
    const assistedX=target&&targetRz<18&&Math.abs(target.x-this.x)<CFG.attackWidth+1.2
      ?this.x+clamp(target.x-this.x,-.65,.65):this.x;
    game.effects.slash(game.distance+CFG.playerZ+5.4,assistedX,lift,side,this.chorus>=3?COLORS.sun2:COLORS.paper,false);
    game.audio.sfx('slash',.9+this.attackIndex*.08);
    game.performStrike({s:game.distance+CFG.playerZ+5.5,x:assistedX,y:this.y,echo:false,index:0,side,power:this.attackIndex===2?1.45:1});
    for(let i=1;i<=this.chorus;i++) game.scheduleEchoStrike(i,side,this.attackIndex===2?1.1:.75);
    game.stats.attacks++;
  }

  perfectDodge(game,hazard) {
    if(hazard.perfected) return;
    hazard.perfected=true;
    this.lastPerfectAt=game.elapsed;
    const before=this.chorus;
    this.chorus=clamp(this.chorus+1,0,CFG.maxChorus);
    this.flow=clamp(this.flow+.22,0,1);
    this.combo=Math.max(1,this.combo+1);this.comboTimer=CFG.comboWindow;
    game.addScore(650+this.chorus*120,'PERFECT');
    game.audio.sfx('perfect',1.1);game.effects.addFlash(COLORS.sun2,.28);game.effects.addShake(5);game.effects.hitStop(.055);
    game.effects.speedLines(game.view,game.settings.reducedMotion?3:12,.72);
    game.effects.ring(game.distance+CFG.playerZ,this.x,this.y+1,COLORS.sun2,1.1,.55);
    game.toast(before<CFG.maxChorus?'ECHO ADDED':'FULL CHORUS',COLORS.paper);
    game.stats.perfects++;
  }

  hurt(game,amount=1,source=null) {
    if(game.debugInvincible || this.invuln>0 || this.dead || game.state!=='playing') return false;
    this.health=Math.max(0,this.health-amount);this.invuln=CFG.hitInvulnerability;this.hitFlash=.34;
    this.vx+=(source?.x!=null?signNZ(this.x-source.x):signNZ(this.lastAxis))*7;
    this.vy=Math.max(this.vy,5.5);this.grounded=false;
    this.chorus=Math.max(0,this.chorus-1);this.combo=0;this.comboTimer=0;this.flow*=.45;
    game.audio.sfx('hurt');game.effects.addFlash(COLORS.coral,.42);game.effects.addShake(15);
    game.effects.shards(game.distance+CFG.playerZ,this.x,this.y+1,14,COLORS.coral,.9);
    game.stats.hitsTaken++;
    if(this.health<=0) { this.dead=true; game.onPlayerDeath(); }
    return true;
  }
}

function makeEntity(kind,opts={}) {
  return Object.assign({
    id:id(),kind,s:0,x:0,y:0,vx:0,vy:0,vs:0,health:1,maxHealth:1,radius:1,
    dead:false,remove:false,active:false,warning:false,timer:0,age:0,seed:Math.random()*9999,
    hitFlash:0,perfected:false,score:100,damage:1,attackable:true,
  },opts);
}

const spawn = {
  drone(s,x,variant=0) {
    return makeEntity('drone',{s,x,y:2.1,health:variant===2?4:2,maxHealth:variant===2?4:2,radius:1.15,variant,state:'sleep',fired:false,score:450+variant*160});
  },
  gate(s,x,width=3.3,armored=false) {
    return makeEntity('gate',{s,x,y:0,width,height:1.8,health:armored?4:2,maxHealth:armored?4:2,radius:width*.55,armored,score:350,attackable:true});
  },
  needle(s,x,dir=1) {
    return makeEntity('needle',{s,x,y:.25,dir,health:2,maxHealth:2,radius:1.0,state:'sleep',timer:0,score:420});
  },
  pickup(s,x,type='chorus') {
    return makeEntity('pickup',{s,x,y:1.3,type,radius:.7,attackable:false,score:0});
  },
  projectile(s,x,y,targetX,variant=0) {
    const travel=variant===1?-35:-45;
    return makeEntity('projectile',{s,x,y,vx:clamp((targetX-x)*1.15,-8,8),vs:travel,radius:.55,attackable:true,health:1,maxHealth:1,score:160,variant,life:4});
  },
  lowWave(s,_x=0,width=14,speed=-18) {
    return makeEntity('lowWave',{s,x:0,y:.55,width,vs:speed,radius:width*.5,attackable:false,warning:true,damage:1});
  },
  beam(followS,x,width=2.7,warning=.9,active=.42) {
    return makeEntity('beam',{s:followS,x,y:0,width,warningTime:warning,activeTime:active,life:warning+active+.25,attackable:false,warning:true,followPlayer:true});
  },
  sweep(followS,from,to,warning=.78,active=.72) {
    return makeEntity('sweep',{s:followS,x:from,y:1.1,from,to,width:2.2,warningTime:warning,activeTime:active,life:warning+active+.2,attackable:false,warning:true,followPlayer:true});
  },
  lock(s,x,index) {
    return makeEntity('lock',{s,x,y:.5,index,health:7,maxHealth:7,radius:1.9,score:2800,state:'live'});
  },
  core(s,x=0) {
    return makeEntity('core',{s,x,y:1.1,health:58,maxHealth:58,radius:2.8,score:12000,state:'shielded',vulnerable:0});
  },
};

function updateEntity(e,dt,game) {
  e.age+=dt;e.hitFlash=Math.max(0,e.hitFlash-dt);
  const playerS=game.distance+CFG.playerZ;
  const rz=e.s-playerS;
  if(e.followPlayer) e.s=playerS+(e.followOffset??6);

  switch(e.kind) {
    case 'drone': {
      e.y=2.2+Math.sin(e.age*3.4+e.seed)*.42;
      e.x+=Math.sin(e.age*1.8+e.seed)*.25*dt;
      if(rz<135&&e.state==='sleep')e.state='watch';
      if(rz<73&&!e.fired) {
        e.fired=true;e.state='fire';e.timer=.72;
      }
      if(e.timer>0) {
        e.timer-=dt;
        if(e.timer<=0 && !e.dead) {
          game.addEntity(spawn.projectile(e.s-1,e.x,e.y,game.player.x,e.variant===2?1:0));
          game.audio.sfx('slash',.35);
        }
      }
      if(rz<-18)e.remove=true;
      break;
    }
    case 'needle': {
      // Start the warning far enough out for readability, but align the
      // lateral crossing with the rider's collision window at any road speed.
      const warnDistance=game.speed*.98+1;
      if(rz<warnDistance&&e.state==='sleep'){e.state='warn';e.timer=.78;}
      if(e.state==='warn'){e.timer-=dt;if(e.timer<=0){e.state='lunge';e.active=true;e.vx=e.dir*28;}}
      if(e.state==='lunge'){e.x+=e.vx*dt;e.timer+=dt;if(e.timer>.78||rz<-4){e.active=false;e.state='spent';}}
      if(rz<-16)e.remove=true;
      break;
    }
    case 'projectile': {
      e.life-=dt;e.s+=e.vs*dt;e.x+=e.vx*dt;e.y+=Math.sin(e.age*12)*.01;
      if(e.life<=0||rz<-15)e.remove=true;
      break;
    }
    case 'lowWave': {
      e.s+=e.vs*dt;
      if(rz<28)e.warning=false;
      if(rz<5&&rz>-3)e.active=true; else e.active=false;
      if(rz<-12)e.remove=true;
      break;
    }
    case 'beam': {
      e.life-=dt;
      if(e.age<e.warningTime){e.warning=true;e.active=false;}
      else if(e.age<e.warningTime+e.activeTime){e.warning=false;e.active=true;}
      else {e.active=false;}
      if(e.life<=0)e.remove=true;
      break;
    }
    case 'sweep': {
      e.life-=dt;
      if(e.age<e.warningTime){e.warning=true;e.active=false;e.x=e.from;}
      else if(e.age<e.warningTime+e.activeTime){const t=(e.age-e.warningTime)/e.activeTime;e.warning=false;e.active=true;e.x=e.from+(e.to-e.from)*t;}
      else e.active=false;
      if(e.life<=0)e.remove=true;
      break;
    }
    case 'pickup': {
      e.y=1.25+Math.sin(e.age*4+e.seed)*.28;
      if(rz<-12)e.remove=true;
      break;
    }
    case 'gate': if(rz<-15)e.remove=true; break;
    case 'lock': e.y=.65+Math.sin(e.age*3+e.index)*.12; break;
    case 'core': {
      e.y=1.3+Math.sin(e.age*2.2)*.22;
      e.vulnerable=Math.max(0,e.vulnerable-dt);
      e.hintCooldown=Math.max(0,(e.hintCooldown||0)-dt);
      e.state=e.vulnerable>0?'open':'shielded';
      break;
    }
  }

  if(!e.remove) checkInteractions(e,game,rz);
}

function checkInteractions(e,game,rz) {
  const p=game.player;
  const dx=Math.abs(e.x-p.x);
  const dz=Math.abs(rz);
  const ground=p.y<1.1;

  if(e.kind==='pickup'&&dz<3&&dx<1.2) {
    if(e.type==='health') {
      p.health=Math.min(CFG.maxHealth,p.health+1);game.addScore(250,'FOUND');
    } else if(e.type==='chorus') {
      p.chorus=Math.min(CFG.maxChorus,p.chorus+1);game.addScore(250,'ECHO FOUND');
    } else {
      p.lightChain=p.lightTimer>0?p.lightChain+1:1;p.lightTimer=.9;
      p.flow=clamp(p.flow+.075,0,1);p.combo=Math.max(1,p.combo+1);p.comboTimer=CFG.comboWindow;
      game.stats.lightShards++;game.stats.maxLightChain=Math.max(game.stats.maxLightChain,p.lightChain);
      game.addScore(70+Math.min(180,p.lightChain*14),p.lightChain>=5?'LIGHT CHAIN':'');
    }
    e.remove=true;game.audio.sfx('collect',.82+Math.min(.45,p.lightChain*.035));game.effects.ring(game.distance+CFG.playerZ,p.x,p.y+1,COLORS.sun2,e.type==='light'?.58:.8,e.type==='light'?.28:.4);
    return;
  }

  let hazard=false;
  if(e.kind==='gate'&&dz<2.6&&dx<e.width*.55&&ground&&!e.dead)hazard=true;
  if(e.kind==='needle'&&e.active&&dz<3&&dx<1.35&&p.y<1.8)hazard=true;
  if(e.kind==='projectile'&&dz<2.6&&dx<1.15&&Math.abs(e.y-(p.y+1))<1.45)hazard=true;
  if(e.kind==='lowWave'&&e.active&&ground)hazard=true;
  if(e.kind==='beam'&&e.active&&dx<e.width*.5)hazard=true;
  if(e.kind==='sweep'&&e.active&&dx<e.width*.55&&p.y<2.1)hazard=true;

  if(hazard) {
    if(p.invuln>0) {
      if(p.dashTimer>0&&p.dashAge<=CFG.perfectWindow+.09)p.perfectDodge(game,e);
      if(e.kind==='projectile') { e.dead=true;e.remove=true;game.effects.sparks(e.s,e.x,e.y,10,COLORS.blue,.8);game.addScore(180,'CUT'); }
      if(e.kind==='gate'&&p.dashTimer>0) damageEntity(e,99,game,{echo:false});
    } else p.hurt(game,e.damage||1,e);
  }
}

function damageEntity(e,amount,game,source={echo:false}) {
  if(!e||e.dead||!e.attackable)return false;
  if(e.kind==='core'&&e.vulnerable<=0) {
    game.effects.ring(e.s,e.x,e.y+1,COLORS.violet,1.8,.3);game.audio.sfx('hit',.35);
    if(!source.echo&&game.player.chorus>0){e.vulnerable=1.05;game.toast('ECHO WINDOW OPEN',COLORS.paper);}
    else if(!source.echo&&(e.hintCooldown||0)<=0){e.hintCooldown=1.25;game.toast('THE SHIELD NEEDS AN ECHO',COLORS.paper,1.1);}
    return false;
  }
  e.health-=amount;e.hitFlash=.12;
  game.effects.sparks(e.s,e.x,e.y+1,source.echo?6:10,source.echo?COLORS.blue:COLORS.sun2,source.echo?.55:.8);
  game.audio.sfx('hit',source.echo?.45:.75);game.effects.addShake(source.echo?1.5:3.5);
  if(e.health<=0) {
    e.dead=true;e.remove=e.kind!=='lock'&&e.kind!=='core';
    game.effects.shards(e.s,e.x,e.y+1,e.kind==='core'?50:e.kind==='lock'?28:18,e.kind==='core'?COLORS.sun2:COLORS.paper,e.kind==='core'?1.8:1);
    game.effects.addShake(e.kind==='core'?24:e.kind==='lock'?13:7);game.effects.hitStop(e.kind==='core'?.13:e.kind==='lock'?.08:.045);
    game.audio.sfx(e.kind==='core'?'boss':'break',e.kind==='core'?1.5:1);
    game.addScore(e.score||200,e.kind==='lock'?'LOCK CUT':e.kind==='core'?'':'BROKEN');
    game.onEntityDestroyed(e);
  }
  return true;
}

function entityCanBeHit(e, strike) {
  if(e.dead||!e.attackable)return false;
  const dz=e.s-strike.s;
  if(dz < -3 || dz > CFG.attackRange) return false;
  const width=CFG.attackWidth*(strike.echo?.86:1)+(e.radius||1)*.45;
  if(Math.abs(e.x-strike.x)>width)return false;
  if(e.kind==='drone'||e.kind==='projectile') return Math.abs((e.y||0)-(strike.y+1.1))<3.3;
  return true;
}


/* ===== director.js ===== */



class StageDirector {
  constructor(game) {
    this.game=game;
    this.events=[];
    this.cursor=0;
    this.lastChapter=-1;
    this.build();
  }

  add(trigger,s,fn) { this.events.push({trigger,s,fn}); }
  at(s,fn,lead=250) { this.add(s-lead,s,fn); }
  wave(s,defs) {
    this.at(s,()=>{for(const d of defs){const [kind,off,x,a,b]=d;const e=spawn[kind](s+off,x,a,b);this.game.addEntity(e);}});
  }

  build() {
    const E=[];this.events=E;
    const at=(s,fn,lead=250)=>E.push({trigger:s-lead,s,fn});
    const wave=(s,defs)=>at(s,()=>defs.forEach(d=>{
      const [kind,off,x,a,b]=d;this.game.addEntity(spawn[kind](s+off,x,a,b));
    }));

    // The Public Road — one verb at a time, with light trails showing the route.
    wave(58,[['pickup',0,0,'light'],['pickup',12,-1.8,'light'],['pickup',24,-3.6,'light'],['pickup',36,-1.8,'light'],['pickup',48,0,'light']]);
    wave(165,[['gate',0,0,3.2,false]]);
    wave(330,[['lowWave',0,0,14,-17]]);
    wave(420,[['pickup',0,0,'chorus'],['pickup',15,2.0,'light'],['pickup',27,4.0,'light']]);
    wave(535,[['needle',0,-5.4,1]]);
    wave(650,[['drone',0,-3.6,0],['drone',14,3.6,0]]);
    wave(735,[['gate',0,0,4.1,true],['pickup',18,-4.8,'light'],['pickup',30,-3.0,'light'],['pickup',42,-1.2,'light']]);

    // Hanging Gardens — first deliberate perfect-dodge opportunities.
    wave(835,[['drone',0,-4.2,0],['drone',7,0,1],['drone',14,4.2,0]]);
    wave(900,[['pickup',0,-4.4,'light'],['pickup',11,-2.2,'light'],['pickup',22,0,'light'],['pickup',33,2.2,'light'],['pickup',44,4.4,'light']]);
    wave(965,[['lowWave',0,0,14,-17]]);
    wave(1060,[['pickup',0,-5.0,'chorus'],['gate',34,2.8,3.2,false]]);
    wave(1190,[['needle',0,-5.6,1],['needle',14,5.6,-1],['drone',30,0,1]]);
    wave(1350,[['gate',0,-3.9,3.2,false],['gate',12,3.9,3.2,false],['pickup',32,0,'health']]);
    wave(1430,[['pickup',0,4.7,'light'],['pickup',10,2.4,'light'],['pickup',20,0,'light'],['pickup',30,-2.4,'light'],['pickup',40,-4.7,'light']]);
    wave(1510,[['drone',0,-4.4,2],['drone',12,4.4,2]]);
    wave(1615,[['lowWave',0,0,14,-20],['pickup',44,0,'chorus']]);

    // The Last Toll — denser but still authored and readable.
    wave(1735,[['gate',0,0,4.2,true],['needle',28,-5.4,1],['needle',38,5.4,-1]]);
    wave(1870,[['drone',0,-4.6,1],['drone',8,0,2],['drone',16,4.6,1]]);
    wave(1940,[['pickup',0,-4.6,'light'],['pickup',10,-2.3,'light'],['pickup',20,0,'light'],['pickup',30,2.3,'light'],['pickup',40,4.6,'light']]);
    wave(2010,[['lowWave',0,0,15,-22],['gate',38,-3.8,3.2,false],['gate',52,3.8,3.2,false]]);
    wave(2175,[['needle',0,-5.8,1],['needle',10,5.8,-1],['drone',28,0,2]]);
    wave(2290,[['pickup',0,0,'health'],['pickup',12,-3.7,'chorus'],['pickup',24,3.7,'chorus']]);

    // Crown chase set pieces.
    wave(2460,[['drone',0,-4.8,2],['drone',8,0,1],['drone',16,4.8,2]]);
    wave(2590,[['lowWave',0,0,15,-24]]);
    wave(2695,[['gate',0,-4.1,3.4,true],['gate',12,4.1,3.4,true]]);
    wave(2748,[['pickup',0,0,'light'],['pickup',10,-2.3,'light'],['pickup',20,-4.6,'light'],['pickup',30,-2.3,'light'],['pickup',40,0,'light']]);
    wave(2810,[['needle',0,-5.5,1],['needle',12,5.5,-1],['drone',24,0,2]]);
    wave(2940,[['lowWave',0,0,15,-24],['pickup',34,0,'chorus']]);
    wave(3070,[['gate',0,0,4.6,true],['drone',20,-4.6,2],['drone',26,4.6,2]]);
    wave(3185,[['needle',0,-5.8,1],['needle',8,5.8,-1]]);

    E.sort((a,b)=>a.trigger-b.trigger);
  }

  reset(distance=0) {
    this.cursor=0;
    while(this.cursor<this.events.length&&this.events[this.cursor].trigger<=distance) {
      const e=this.events[this.cursor];
      if(e.s>=distance-18)e.fn();
      this.cursor++;
    }
    this.lastChapter=-1;
  }

  update() {
    const d=this.game.distance;
    while(this.cursor<this.events.length&&this.events[this.cursor].trigger<=d) {
      const e=this.events[this.cursor++];
      if(e.s>=d-18)e.fn();
    }
    const checkpoints=[780,1680,2360];
    for(const cp of checkpoints) if(d>=cp&&this.game.checkpoint.distance<cp)this.game.setCheckpoint(cp,cp>=2360?1:0);
  }
}

class BossController {
  constructor(game) { this.game=game; this.resetTo(0); }

  resetTo(phase=0) {
    this.phase=phase;
    this.visible=phase>0;
    this.gap=phase>=2?23:190;
    this.x=0;
    this.timer=0;
    this.attackTimer=1.7;
    this.pattern=0;
    this.locks=[];
    this.core=null;
    this.defeated=false;
    if(phase===1)this.visible=true;
    if(phase===2)this.spawnLocks();
    if(phase===3)this.spawnCore();
  }

  update(dt) {
    const g=this.game,d=g.distance;
    if(d>1980)this.visible=true;
    if(this.phase===0&&d>=CFG.bossStartDistance) this.beginChase();
    if(this.phase===1) {
      this.gap=190-(190-29)*smoothstep(CFG.bossStartDistance,CFG.boardDistance,d);
      this.x=Math.sin(g.elapsed*.55)*2.2;
      if(d>=CFG.boardDistance)this.beginLocks();
    }
    if(this.phase===2||this.phase===3) {
      this.gap=23+Math.sin(g.elapsed*.7)*.5;
      this.x=0;this.timer+=dt;this.attackTimer-=dt;
      if(this.attackTimer<=0){this.spawnPattern();this.attackTimer=this.phase===2?2.25:1.72;}
      if(this.phase===2&&this.locks.length&&this.locks.every(e=>e.dead))this.beginCore();
      if(this.phase===3&&this.core?.dead)this.beginDefeat();
    }
    if(this.phase===4) {
      this.gap+=dt*24;this.x=Math.sin(g.elapsed*1.7)*this.gap*.04;
    }
  }

  beginChase() {
    this.phase=1;this.visible=true;this.gap=190;this.game.setCheckpoint(CFG.bossStartDistance,1);
    this.game.cinematicBars=1;this.game.toast('THE CROWN ENGINE',COLORS.paper,1.8);
    this.game.audio.sfx('boss',1.35);
    setTimeout(()=>{if(this.game)this.game.cinematicBars=0;},900);
  }

  beginLocks() {
    if(this.phase>=2)return;
    this.phase=2;this.gap=23;this.game.entities.length=0;this.game.setCheckpoint(CFG.boardDistance,2);
    this.spawnLocks();this.game.toast('BOARDING ACTION',COLORS.sun2,1.5);this.game.audio.sfx('boss',1.1);
    this.attackTimer=1.6;this.pattern=0;
  }

  spawnLocks() {
    this.locks=[];
    [-4.8,0,4.8].forEach((x,i)=>{const e=spawn.lock(this.game.distance+CFG.playerZ+12,x,i);e.followPlayer=true;e.followOffset=12;this.game.addEntity(e);this.locks.push(e);});
  }

  beginCore() {
    if(this.phase>=3)return;
    this.phase=3;this.game.entities=this.game.entities.filter(e=>e.kind!=='lock');this.game.setCheckpoint(Math.max(CFG.coreDistance,this.game.distance),3,true);
    this.spawnCore();this.game.toast('THE SUN IS UNDER THERE',COLORS.paper,1.8);this.game.audio.sfx('boss',1.3);this.attackTimer=1.0;this.pattern=0;
  }

  spawnCore() {
    const e=spawn.core(this.game.distance+CFG.playerZ+13,0);e.followPlayer=true;e.followOffset=13;this.game.addEntity(e);this.core=e;
  }

  spawnPattern() {
    const g=this.game,p=g.player,playerS=g.distance+CFG.playerZ;
    const phase=this.phase;
    const pat=this.pattern++%(phase===2?5:7);
    if(pat===0) {
      const x=clamp(p.x+(hash01(this.pattern*13)-.5)*2.2,-5.7,5.7);
      g.addEntity(spawn.beam(playerS+6,x,phase===3?3.1:2.6,phase===3?.72:.92,phase===3?.5:.42));g.toast('LANE BURN',COLORS.paper,.7);
    } else if(pat===1) {
      const from=this.pattern%2?-7:7;g.addEntity(spawn.sweep(playerS+6,from,-from,phase===3?.58:.76,phase===3?.7:.76));g.toast('CROWN SWEEP',COLORS.paper,.7);
    } else if(pat===2) {
      g.addEntity(spawn.lowWave(playerS+42,0,15,phase===3?-27:-23));
    } else if(pat===3) {
      g.addEntity(spawn.drone(playerS+75,-4.3,2));g.addEntity(spawn.drone(playerS+82,4.3,2));
    } else if(pat===4) {
      g.addEntity(spawn.beam(playerS+6,-4.2,2.5,.85,.38));g.addEntity(spawn.beam(playerS+6,4.2,2.5,.85,.38));
    } else if(pat===5) {
      g.addEntity(spawn.sweep(playerS+6,-7,7,.52,.62));
      setTimeout(()=>{if(g.state==='playing'&&this.phase===3)g.addEntity(spawn.sweep(g.distance+CFG.playerZ+6,7,-7,.45,.62));},360);
    } else {
      const safe=clamp(p.x,-3.8,3.8);for(const x of [-5.2,0,5.2])if(Math.abs(x-safe)>2.2)g.addEntity(spawn.beam(playerS+6,x,2.35,.68,.42));
    }
  }

  beginDefeat() {
    if(this.defeated)return;
    this.defeated=true;this.phase=4;this.game.entities=[];this.game.echoStrikes=[];this.game.player.invuln=999;
    this.game.onBossDefeated();
  }

  healthRatio() {
    if(this.phase===2&&this.locks.length) {
      const total=this.locks.reduce((a,e)=>a+Math.max(0,e.health),0);const max=this.locks.reduce((a,e)=>a+e.maxHealth,0);return max?total/max:0;
    }
    if(this.phase===3&&this.core)return Math.max(0,this.core.health)/this.core.maxHealth;
    if(this.phase===4)return 0;
    return 1;
  }

  label() { return this.phase===1?'CHASE':this.phase===2?'THREE LOCKS':this.phase===3?'OPEN THE SUN':this.phase===4?'DEFEATED':'DISTANT'; }
}


/* ===== renderer.js ===== */


const SCENE_PALETTES = [
  { skyTop:'#075a78', skyMid:'#26a9bd', horizon:'#ffb45f', seaTop:'#17647a', seaBottom:'#071c36', cityFar:'#214b60', cityNear:'#102b43', cloud:'#fff1d7', cloudShade:'#b7d8d5', sun:'#ffe991', sunCore:'#fffbd8' },
  { skyTop:'#095b6b', skyMid:'#3eb99d', horizon:'#ffd06f', seaTop:'#176b69', seaBottom:'#082c42', cityFar:'#315f57', cityNear:'#153c3b', cloud:'#fff2cf', cloudShade:'#b7dbc3', sun:'#fff097', sunCore:'#fffde0' },
  { skyTop:'#243a84', skyMid:'#6d64bb', horizon:'#ff9e5d', seaTop:'#3a477d', seaBottom:'#151633', cityFar:'#4f4269', cityNear:'#201d3c', cloud:'#ffe8d5', cloudShade:'#b5acd0', sun:'#ffd771', sunCore:'#fff7c8' },
  { skyTop:'#111b52', skyMid:'#364886', horizon:'#ff754f', seaTop:'#24345e', seaBottom:'#090d25', cityFar:'#293157', cityNear:'#111529', cloud:'#f5d6cc', cloudShade:'#8e9ab9', sun:'#ffc85f', sunCore:'#fff2b1' },
  { skyTop:'#070d28', skyMid:'#15264d', horizon:'#e96f52', seaTop:'#111a37', seaBottom:'#030610', cityFar:'#1b2441', cityNear:'#080d1d', cloud:'#c8ccdf', cloudShade:'#5d6584', sun:'#ffc85a', sunCore:'#fff4ad' },
  { skyTop:'#281544', skyMid:'#6a3e79', horizon:'#ff9c55', seaTop:'#33264e', seaBottom:'#0d0818', cityFar:'#563757', cityNear:'#24152f', cloud:'#f4d1dd', cloudShade:'#a47ea1', sun:'#ffe06e', sunCore:'#fff8be' },
  { skyTop:'#047f9d', skyMid:'#38c6d8', horizon:'#ffd56a', seaTop:'#168ea0', seaBottom:'#06324e', cityFar:'#2c7180', cityNear:'#114b60', cloud:'#fff7df', cloudShade:'#c0e7df', sun:'#fff19a', sunCore:'#ffffff' },
];

function angleDamp(current, target, smoothing, dt) {
  let delta = (target - current + Math.PI) % TAU - Math.PI;
  if (delta < -Math.PI) delta += TAU;
  return current + delta * (1 - Math.exp(-smoothing * dt));
}

function makeSprite(size, painter) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  painter(ctx, size);
  return canvas;
}

class Renderer {
  constructor(canvas, track, effects) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha:false, desynchronized:true });
    this.track = track;
    this.effects = effects;
    this.view = { w:1, h:1, cx:.5, cy:.5, focal:700, dpr:1 };
    this.coarse = matchMedia('(pointer: coarse)').matches;
    this.quality = null;
    this.maxQuality = this.coarse ? 1 : 2;
    this.renderScale = 1;
    this.fps = 60;
    this.fpsAccum = 0;
    this.fpsFrames = 0;
    this.adaptTimer = 0;
    this.goodWindows = 0;
    this.cameraState = null;
    this.lastDistance = -9999;
    this.lastPhase = -1;
    this.entityDrawList = [];
    this.skyGradients = new Map();
    this.seaGradients = new Map();
    this.sprites = this.makeSprites();
    this.grainTile = this.makeGrainTile();
    this.grainPattern = null;
    this.vignette = null;
    this.resize();
    addEventListener('resize', () => this.resize(), { passive:true });
  }

  makeSprites() {
    return {
      sun: makeSprite(256, (c, s) => {
        const m = s / 2;
        const g = c.createRadialGradient(m, m, 4, m, m, m);
        g.addColorStop(0, 'rgba(255,255,245,1)');
        g.addColorStop(.18, 'rgba(255,244,170,.95)');
        g.addColorStop(.48, 'rgba(255,186,84,.28)');
        g.addColorStop(1, 'rgba(255,142,66,0)');
        c.fillStyle = g; c.fillRect(0, 0, s, s);
      }),
      glowGold: makeSprite(128, (c, s) => {
        const m=s/2,g=c.createRadialGradient(m,m,0,m,m,m);
        g.addColorStop(0,'rgba(255,255,235,1)');g.addColorStop(.22,'rgba(255,224,104,.9)');g.addColorStop(1,'rgba(255,170,40,0)');
        c.fillStyle=g;c.fillRect(0,0,s,s);
      }),
      glowCyan: makeSprite(128, (c, s) => {
        const m=s/2,g=c.createRadialGradient(m,m,0,m,m,m);
        g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.2,'rgba(70,226,255,.92)');g.addColorStop(1,'rgba(24,130,255,0)');
        c.fillStyle=g;c.fillRect(0,0,s,s);
      }),
      glowHot: makeSprite(128, (c, s) => {
        const m=s/2,g=c.createRadialGradient(m,m,0,m,m,m);
        g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.2,'rgba(255,89,90,.95)');g.addColorStop(1,'rgba(255,45,70,0)');
        c.fillStyle=g;c.fillRect(0,0,s,s);
      }),
    };
  }

  makeGrainTile() {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const x = c.getContext('2d');
    x.clearRect(0,0,96,96);
    for (let i=0;i<280;i++) {
      const px = Math.floor(hash01(i*17.7)*96);
      const py = Math.floor(hash01(i*31.3+9)*96);
      const a = .08 + hash01(i*7.1)*.18;
      x.fillStyle = `rgba(255,255,255,${a})`;
      x.fillRect(px,py,1,1);
    }
    return c;
  }

  resize() {
    const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
    this.coarse = matchMedia('(pointer: coarse)').matches;
    const rawDpr = devicePixelRatio || 1;
    // Keep the simulation/UI at full CSS resolution, but cap canvas pixels.
    // The original build could render and blur 6.7M+ pixels per frame on a
    // 1080p high-DPI display. This budget stays sharp at ordinary sizes and
    // deliberately trades imperceptible internal resolution for stable motion.
    const budget = this.coarse ? 780_000 : 1_650_000;
    const cap = this.coarse ? 1.16 : 1.30;
    const budgetDpr = Math.sqrt(budget / Math.max(1, w*h));
    const baseDpr = Math.min(rawDpr, cap, budgetDpr);
    const dpr = clamp(baseDpr * this.renderScale, .70, cap);
    this.canvas.width = Math.max(1, Math.round(w*dpr));
    this.canvas.height = Math.max(1, Math.round(h*dpr));
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.view = { w, h, cx:w*.5, cy:h*.47, focal:Math.min(w*1.10,h*1.21), dpr };
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.ctx.imageSmoothingEnabled = true;
    this.maxQuality = this.coarse ? 1 : 2;
    const suggested = this.coarse ? 1 : ((w*h*dpr*dpr)<1_400_000?2:1);
    this.quality = this.quality == null ? suggested : Math.min(this.quality, this.maxQuality);
    this.skyGradients.clear();
    this.seaGradients.clear();
    this.grainPattern = this.ctx.createPattern(this.grainTile, 'repeat');
    const v=this.view;
    this.vignette=this.ctx.createRadialGradient(v.cx,v.h*.44,Math.min(v.w,v.h)*.18,v.cx,v.h*.5,Math.max(v.w,v.h)*.74);
    this.vignette.addColorStop(0,'rgba(0,0,0,0)');
    this.vignette.addColorStop(.68,'rgba(4,7,19,.03)');
    this.vignette.addColorStop(1,'rgba(2,4,14,.34)');
    this.cameraState = null;
  }

  noteFrame(dt) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > .12) return;
    this.fpsAccum += dt;
    this.fpsFrames++;
    this.adaptTimer += dt;
    if (this.adaptTimer >= 2.75) {
      this.fps = this.fpsFrames / Math.max(.001, this.fpsAccum);
      if (this.fps < 50) {
        if (this.quality > 0) this.quality--;
        if (this.fps < 44 && this.renderScale > .78) {
          this.renderScale = Math.max(.78, this.renderScale - .08);
          this.resize();
        }
        this.goodWindows = 0;
      } else if (this.fps > 58.5) {
        this.goodWindows++;
        if (this.goodWindows >= 3) {
          if (this.renderScale < .995) {
            this.renderScale = Math.min(1, this.renderScale + .04);
            this.resize();
          } else if (this.quality < this.maxQuality) this.quality++;
          this.goodWindows = 0;
        }
      } else this.goodWindows = 0;
      this.fpsAccum = 0;
      this.fpsFrames = 0;
      this.adaptTimer = 0;
    }
  }

  smoothCamera(raw, dt, game) {
    const jumped = Math.abs(game.distance - this.lastDistance) > 90 || game.boss.phase !== this.lastPhase;
    this.lastDistance = game.distance;
    this.lastPhase = game.boss.phase;
    if (!this.cameraState || jumped || game.settings.reducedMotion) {
      this.cameraState = { ...raw };
    } else {
      const c=this.cameraState;
      c.s = raw.s;
      c.x = damp(c.x, raw.x, 16, dt);
      c.y = damp(c.y, raw.y, 12, dt);
      c.yaw = angleDamp(c.yaw, raw.yaw, 14, dt);
      c.pitch = damp(c.pitch, raw.pitch, 12, dt);
      c.roll = damp(c.roll, raw.roll, 12, dt);
    }
    this.track.prepareCamera(this.cameraState);
    return this.cameraState;
  }

  render(game, dt) {
    this.noteFrame(dt);
    const v=this.view,ctx=this.ctx;
    ctx.save();
    ctx.setTransform(v.dpr,0,0,v.dpr,0,0);
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';
    ctx.clearRect(0,0,v.w,v.h);
    const rawCam=this.track.camera(game.distance,game.player,game.settings.reducedMotion);
    const cam=this.smoothCamera(rawCam,Math.min(.05,dt||0),game);
    game.camera=cam;
    const shake=game.settings.reducedMotion?0:this.effects.shake;
    const sx=shake?(Math.random()-.5)*shake:0,sy=shake?(Math.random()-.5)*shake*.58:0;
    ctx.translate(sx,sy);
    this.drawBackground(ctx,game,cam);
    this.drawDistantDecor(ctx,game,cam);
    this.drawBoss(ctx,game,cam,false);
    this.drawTrack(ctx,game,cam);
    this.drawRoadDecor(ctx,game,cam);
    this.drawThreatTelegraphs(ctx,game,cam);
    this.drawSpeedRibbons(ctx,game);
    this.drawBoss(ctx,game,cam,true);
    this.drawEntities(ctx,game,cam);
    this.drawEchoes(ctx,game,cam);
    this.drawPlayer(ctx,game,cam);
    this.effects.renderWorld(ctx,this.track,cam,v);
    ctx.restore();
    this.effects.renderScreen(ctx,v);
    this.drawCinematicOverlays(ctx,game);
    this.drawVignetteAndGrain(ctx,game);
  }

  paletteFor(game) { return SCENE_PALETTES[this.track.section(game.distance)] || SCENE_PALETTES[0]; }

  gradientFor(cache, key, create) {
    if (!cache.has(key)) cache.set(key, create());
    return cache.get(key);
  }

  drawBackground(ctx,game) {
    const v=this.view,sec=this.track.section(game.distance),pal=SCENE_PALETTES[sec];
    const sky=this.gradientFor(this.skyGradients,`${sec}:${v.w}:${v.h}`,()=>{
      const g=ctx.createLinearGradient(0,0,0,v.h*.72);
      g.addColorStop(0,pal.skyTop);g.addColorStop(.48,pal.skyMid);g.addColorStop(1,pal.horizon);return g;
    });
    ctx.fillStyle=sky;ctx.fillRect(-40,-40,v.w+80,v.h+80);

    const endT=smoothstep(4420,4610,game.distance);
    const sunX=v.w*(.72-endT*.19)+Math.sin(game.elapsed*.055)*8;
    const sunY=v.h*(.22-endT*.075);
    const r=Math.min(v.w,v.h)*(.105+endT*.055);

    if(this.quality>0&&!game.settings.reducedMotion){
      ctx.save();ctx.translate(sunX,sunY);ctx.globalAlpha=.10;
      const rayCount=this.quality===2?10:6;
      for(let i=0;i<rayCount;i++){
        const a=i/rayCount*TAU+game.elapsed*.008;
        const a2=a+.12+(i%2)*.035;
        const len=Math.max(v.w,v.h)*1.05;
        ctx.fillStyle=i%2?'#fff2b2':'#ff8f5f';
        ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.8,Math.sin(a)*r*.8);ctx.lineTo(Math.cos(a)*len,Math.sin(a)*len);ctx.lineTo(Math.cos(a2)*len,Math.sin(a2)*len);ctx.closePath();ctx.fill();
      }
      ctx.restore();
    }
    ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.88;
    ctx.drawImage(this.sprites.sun,sunX-r*2.15,sunY-r*2.15,r*4.3,r*4.3);ctx.restore();
    ctx.fillStyle=pal.sun;ctx.beginPath();ctx.arc(sunX,sunY,r,0,TAU);ctx.fill();
    ctx.fillStyle=pal.sunCore;ctx.globalAlpha=.78;ctx.beginPath();ctx.arc(sunX-r*.13,sunY-r*.13,r*.74,0,TAU);ctx.fill();ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(255,255,255,.62)';ctx.lineWidth=Math.max(1,r*.025);ctx.beginPath();ctx.arc(sunX,sunY,r*1.08,0,TAU);ctx.stroke();

    const cloudCount=this.quality===0?3:(this.quality===1?5:6);
    for(let i=0;i<cloudCount;i++){
      const h=hash01(i*19+sec*73);
      const x=((h*(v.w+420)+game.distance*(.010+i*.0015))%(v.w+420))-210;
      const y=v.h*(.075+hash01(i*41+5)*.29);
      const size=46+hash01(i*83+2)*94;
      this.drawCloud(ctx,x,y,size,pal,sec>=4?.32:.48);
    }

    const horizon=v.h*.565;
    const sea=this.gradientFor(this.seaGradients,`${sec}:${v.w}:${v.h}`,()=>{
      const g=ctx.createLinearGradient(0,horizon,0,v.h);
      g.addColorStop(0,pal.seaTop);g.addColorStop(1,pal.seaBottom);return g;
    });
    ctx.fillStyle=sea;ctx.fillRect(-40,horizon,v.w+80,v.h-horizon+40);
    ctx.fillStyle='rgba(255,245,205,.68)';ctx.fillRect(0,horizon,v.w,1.5);

    ctx.save();ctx.globalCompositeOperation='screen';
    const reflT=clamp((sunY-r)/(horizon-sunY+r),0,1);
    for(let i=0;i<11;i++){
      const t=i/10, y=horizon+6+t*t*(v.h-horizon)*.78;
      const wobble=Math.sin(game.elapsed*.6+i*1.7)*7;
      const half=(1-t)*r*.44+t*r*1.08;
      ctx.globalAlpha=.24*(1-t*.55);
      ctx.fillStyle=i%2?pal.sun:'#fff4c7';
      ctx.fillRect(sunX-half+wobble,y,half*2,1.5+t*2.4);
    }
    ctx.restore();

    ctx.save();ctx.globalAlpha=this.quality===0?.18:.26;ctx.strokeStyle='#bfeeff';ctx.lineWidth=1;
    const waves=this.quality===0?4:(this.quality===1?7:10);
    for(let i=0;i<waves;i++){
      const t=(i+1)/(waves+1),y=horizon+Math.pow(t,1.55)*(v.h-horizon);
      const phase=game.elapsed*(.22+i*.015)+i*.93;
      ctx.beginPath();ctx.moveTo(-30,y);
      const seg=6;
      for(let j=1;j<=seg;j++){
        const x=j/seg*(v.w+60)-30;
        const yy=y+Math.sin(phase+j*1.17)*(2+t*5);
        ctx.lineTo(x,yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCloud(ctx,x,y,size,pal,alpha=.45) {
    ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;
    ctx.fillStyle=pal.cloudShade;
    ctx.beginPath();ctx.ellipse(0,size*.08,size*1.18,size*.28,0,0,TAU);ctx.fill();
    ctx.fillStyle=pal.cloud;
    ctx.beginPath();
    ctx.ellipse(-size*.43,0,size*.55,size*.31,0,0,TAU);
    ctx.ellipse(size*.02,-size*.18,size*.72,size*.48,0,0,TAU);
    ctx.ellipse(size*.56,-size*.02,size*.48,size*.30,0,0,TAU);
    ctx.fill();
    ctx.globalAlpha*=.42;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(-size*.02,-size*.27,size*.48,size*.18,0,0,TAU);ctx.fill();
    ctx.restore();
  }

  drawDistantDecor(ctx,game) {
    const v=this.view,sec=this.track.section(game.distance),pal=SCENE_PALETTES[sec],horizon=v.h*.565;
    const layers=this.quality===0?1:2;
    for(let layer=0;layer<layers;layer++){
      const count=this.quality===1?(layer?14:20):(layer?20:27);
      const speed=layer?.026:.011;
      ctx.save();ctx.globalAlpha=layer?.76:.42;ctx.fillStyle=layer?pal.cityNear:pal.cityFar;
      for(let i=0;i<count;i++){
        const key=i+layer*101+Math.floor(game.distance/1200)*37;
        const x=((hash01(key*17)*(v.w+320)-game.distance*speed)%(v.w+320))-160;
        const w=12+hash01(key*23)*(layer?42:64);
        const h=22+hash01(key*37)*(layer?145:105);
        if(sec===1&&hash01(key*9)>.35){
          ctx.beginPath();ctx.moveTo(x-w*.7,horizon);ctx.quadraticCurveTo(x,horizon-h*1.15,x+w*.7,horizon);ctx.fill();
        }else{
          ctx.fillRect(x,horizon-h,w,h);
          if(hash01(key*71)>.58){ctx.beginPath();ctx.moveTo(x,horizon-h);ctx.lineTo(x+w*.5,horizon-h-(18+hash01(key*5)*30));ctx.lineTo(x+w,horizon-h);ctx.fill();}
          if(layer&&this.quality>0&&w>22){
            ctx.fillStyle=sec>=4?'rgba(255,200,91,.55)':'rgba(255,238,176,.45)';
            const rows=Math.min(4,Math.floor(h/30));
            for(let r=0;r<rows;r++)if(hash01(key*113+r)>.45)ctx.fillRect(x+w*.2,horizon-h+12+r*22,w*.12,3);
            ctx.fillStyle=layer?pal.cityNear:pal.cityFar;
          }
        }
      }
      ctx.restore();
    }
  }

  makeRoadSamples(game,cam) {
    const arr=[];let z=4.2;
    const stepScale=this.quality===0?1.42:(this.quality===1?1.14:1);
    while(z<CFG.farClip){
      const s=game.distance+z;
      const center=this.track.center(s),height=this.track.height(s),width=this.track.width(s);
      const left=this.track.project({x:center-width,y:height,s},cam,this.view);
      const right=this.track.project({x:center+width,y:height,s},cam,this.view);
      const mid=this.track.project({x:center,y:height+.015,s},cam,this.view);
      if(left&&right&&mid)arr.push({s,z,left,right,mid,pal:this.track.palette(s),sec:this.track.section(s),width});
      z+=(z<30?2.0:z<100?4.0:z<220?7.5:12.5)*stepScale;
    }
    return arr;
  }

  roadPath(ctx,samples,offset=0) {
    if(samples.length<2)return;
    ctx.beginPath();
    ctx.moveTo(samples[0].left.x,samples[0].left.y+offset);
    for(let i=1;i<samples.length;i++)ctx.lineTo(samples[i].left.x,samples[i].left.y+offset);
    for(let i=samples.length-1;i>=0;i--)ctx.lineTo(samples[i].right.x,samples[i].right.y+offset);
    ctx.closePath();
  }

  drawTrack(ctx,game,cam) {
    const samples=this.makeRoadSamples(game,cam);game.roadSamples=samples;
    if(samples.length<2)return;

    ctx.save();
    this.roadPath(ctx,samples,18);
    ctx.fillStyle=samples[0].pal.shadow;ctx.globalAlpha=.92;ctx.fill();
    ctx.restore();

    for(let i=samples.length-2;i>=0;i--){
      const a=samples[i],b=samples[i+1],alt=(Math.floor(a.s/18)&1)===0;
      ctx.fillStyle=alt?a.pal.road:a.pal.road2;
      polygon(ctx,[a.left,a.right,b.right,b.left]);ctx.fill();
      if(this.quality>0&&i%3===0){
        ctx.fillStyle='rgba(255,255,255,.018)';polygon(ctx,[a.left,a.right,b.right,b.left]);ctx.fill();
      }
    }

    const near=samples[0];
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    for(const side of ['left','right']){
      ctx.beginPath();
      for(let i=0;i<samples.length;i++){
        const p=samples[i][side];if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
      }
      ctx.strokeStyle=colorWithAlpha(near.pal.edge,.22);ctx.lineWidth=Math.max(5,near.left.scale*.82);ctx.stroke();
      ctx.strokeStyle=near.pal.edge;ctx.lineWidth=Math.max(2,near.left.scale*.24);ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.78)';ctx.lineWidth=Math.max(1,near.left.scale*.055);ctx.stroke();
    }
    ctx.restore();

    ctx.save();ctx.lineCap='round';
    for(let i=samples.length-2;i>=0;i--){
      const a=samples[i],b=samples[i+1];
      for(let lane=0;lane<3;lane++){
        const t=[.20,.50,.80][lane];
        if((Math.floor((a.s+lane*5)/15)&1)!==0)continue;
        const pa={x:lerp(a.left.x,a.right.x,t),y:lerp(a.left.y,a.right.y,t)};
        const pb={x:lerp(b.left.x,b.right.x,t),y:lerp(b.left.y,b.right.y,t)};
        ctx.strokeStyle=colorWithAlpha(lane===1?a.pal.line:a.pal.rail,lane===1?.66:.34);
        ctx.lineWidth=Math.max(1,a.left.scale*(lane===1?.065:.045));ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();
      }
      if(Math.floor(a.s/24)!==Math.floor(b.s/24)){
        ctx.strokeStyle='rgba(255,255,255,.075)';ctx.lineWidth=Math.max(1,a.left.scale*.035);ctx.beginPath();ctx.moveTo(a.left.x,a.left.y);ctx.lineTo(a.right.x,a.right.y);ctx.stroke();
      }
    }
    ctx.restore();

    const markerStep=this.quality===0?6:(this.quality===1?4:3);
    for(let i=2;i<samples.length-1;i+=markerStep){
      const a=samples[i];if(a.z>205)continue;
      const blink=(Math.floor(a.s/24)&1)===0;
      const sc=Math.max(1,a.left.scale);
      for(const side of [-1,1]){
        const p=side<0?a.left:a.right;
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(side<0?-.38:.38);
        ctx.fillStyle=blink?a.pal.edge:a.pal.rail;ctx.globalAlpha=clamp(1-a.z/240,.18,.9);
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(side*sc*.75,-sc*.25);ctx.lineTo(side*sc*.45,sc*.43);ctx.closePath();ctx.fill();ctx.restore();
      }
    }
  }

  drawRoadDecor(ctx,game,cam) {
    const v=this.view;
    const far=Math.floor((game.distance+CFG.farClip)/27)*27;
    const stride=this.quality===0?67.5:(this.quality===1?40.5:27);
    for(let s=far;s>game.distance+18;s-=stride){
      const sec=this.track.section(s);
      if(sec>=4&&hash01(s*.1)<.30)continue;
      for(const side of [-1,1]){
        if(hash01(Math.floor(s)*3+side*11)<.52)continue;
        const lane=side*(this.track.width(s)+1.65+hash01(s*5+side)*4.2);
        const p=this.track.project(this.track.worldPoint(s,lane,0),cam,v);
        if(p&&p.visible)this.drawDecorItem(ctx,{s,side,p,type:this.track.sampleDecor(s,side),sec},game);
      }
    }
  }

  drawRoadQuad(ctx,cam,s0,s1,x,width,color,alpha) {
    const half=width*.5;
    const pts=[
      this.track.project(this.track.worldPoint(s0,x-half,.025),cam,this.view),
      this.track.project(this.track.worldPoint(s0,x+half,.025),cam,this.view),
      this.track.project(this.track.worldPoint(s1,x+half,.025),cam,this.view),
      this.track.project(this.track.worldPoint(s1,x-half,.025),cam,this.view),
    ];
    if(pts.some(p=>!p||!p.visible))return;
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;polygon(ctx,pts);ctx.fill();ctx.globalAlpha=Math.min(1,alpha*2.1);ctx.strokeStyle='#fff5c7';ctx.lineWidth=1.25;ctx.stroke();ctx.restore();
  }

  drawThreatTelegraphs(ctx,game,cam) {
    const playerS=game.distance+CFG.playerZ,pulse=.78+Math.sin(game.elapsed*12)*.22;
    for(const e of game.entities){
      if(e.dead||e.remove)continue;
      const rz=e.s-playerS;
      if(rz<-3||rz>120)continue;
      if(e.kind==='gate'&&rz<92){
        const urgency=1-clamp(rz/92,0,1);
        this.drawRoadQuad(ctx,cam,e.s-3.2,e.s+3.2,e.x,e.width+1.0,'#ff4f62',(.07+urgency*.17)*pulse);
      }else if(e.kind==='lowWave'&&e.warning){
        this.drawRoadQuad(ctx,cam,e.s-2.1,e.s+2.1,0,this.track.width(e.s)*1.88,'#ffce63',.16*pulse);
      }else if(e.kind==='needle'&&(e.state==='warn'||e.state==='lunge')){
        this.drawRoadQuad(ctx,cam,e.s-2.4,e.s+2.4,0,this.track.width(e.s)*1.86,e.state==='lunge'?'#ff415f':'#ffd36f',(e.state==='lunge'?.25:.13)*pulse);
      }
    }
  }

  drawDecorItem(ctx,it) {
    const {p,type,side,sec}=it,sc=p.scale;
    ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=clamp(1-p.z/CFG.farClip,0,1)*.92;
    if(type==='tree'){
      ctx.fillStyle='#183f3a';ctx.fillRect(-sc*.10,-sc*2.6,sc*.20,sc*2.6);
      const c=sec===1?'#ff8d78':'#62d29f';ctx.fillStyle=c;
      for(let i=0;i<5;i++){ctx.beginPath();ctx.arc((i-2)*sc*.22,-sc*(2.55+Math.abs(i-2)*.08),sc*(.55-Math.abs(i-2)*.04),0,TAU);ctx.fill();}
      ctx.strokeStyle='#fff0b5';ctx.lineWidth=Math.max(1,sc*.05);ctx.beginPath();ctx.moveTo(-sc*.55,-sc*2.45);ctx.lineTo(sc*.55,-sc*2.45);ctx.stroke();
    }else if(type==='arch'){
      ctx.strokeStyle='#fff0b5';ctx.lineWidth=Math.max(1,sc*.18);ctx.beginPath();ctx.arc(0,-sc*.92,sc*1.05,Math.PI,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(-sc*1.05,-sc*.92);ctx.lineTo(-sc*1.05,0);ctx.moveTo(sc*1.05,-sc*.92);ctx.lineTo(sc*1.05,0);ctx.stroke();
      ctx.strokeStyle='#4ef0c8';ctx.lineWidth=Math.max(1,sc*.05);ctx.beginPath();ctx.arc(0,-sc*.92,sc*.78,Math.PI,TAU);ctx.stroke();
    }else if(type==='sign'){
      ctx.fillStyle='#11182b';ctx.fillRect(-sc*.09,-sc*1.8,sc*.18,sc*1.8);ctx.fillStyle=sec===2?'#ff5e62':'#18b9ce';roundedRect(ctx,-sc*.78,-sc*2.35,sc*1.56,sc*.78,sc*.12);ctx.fill();ctx.strokeStyle='#fff1b8';ctx.lineWidth=Math.max(1,sc*.05);ctx.stroke();
      if(sc>.9){ctx.fillStyle='#fff8d8';ctx.font=`900 ${Math.max(6,sc*.25)}px system-ui`;ctx.textAlign='center';ctx.fillText(hash01(it.s)>.5?'OPEN':'RUN',0,-sc*1.82);}
    }else if(type==='tower'||type==='pylon'){
      ctx.fillStyle=type==='tower'?'#1d2b45':'#11172b';ctx.beginPath();ctx.moveTo(-sc*.38,0);ctx.lineTo(-sc*.2,-sc*3);ctx.lineTo(sc*.2,-sc*3);ctx.lineTo(sc*.38,0);ctx.closePath();ctx.fill();
      ctx.fillStyle=sec>=4?'#ffc857':'#36d7ef';ctx.fillRect(-sc*.25,-sc*2.25,sc*.5,sc*.17);ctx.fillRect(-sc*.19,-sc*1.45,sc*.38,sc*.09);
    }else if(type==='flag'){
      ctx.strokeStyle='#fff0b5';ctx.lineWidth=Math.max(1,sc*.09);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-sc*2.55);ctx.stroke();ctx.fillStyle=side>0?'#ff5e62':'#7f6cff';ctx.beginPath();ctx.moveTo(0,-sc*2.5);ctx.quadraticCurveTo(side*sc*.9,-sc*2.16,side*sc*1.35,-sc*2.4);ctx.lineTo(0,-sc*1.76);ctx.closePath();ctx.fill();
    }else{
      ctx.fillStyle='#101522';roundedRect(ctx,-sc*.5,-sc*1.45,sc,sc*1.45,sc*.18);ctx.fill();ctx.strokeStyle='#ffc857';ctx.lineWidth=Math.max(1,sc*.05);ctx.stroke();ctx.fillStyle=sec>=4?'#ffc857':'#36d7ef';ctx.fillRect(-sc*.37,-sc*1.02,sc*.74,sc*.17);
    }
    ctx.restore();
  }

  drawSpeedRibbons(ctx,game) {
    if(game.settings.reducedMotion||game.state==='boot')return;
    const amount=clamp((game.speed-31)/20,0,1);
    if(amount<=.03)return;
    const v=this.view,count=this.quality===0?3:(this.quality===1?5:8);
    ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';
    for(let i=0;i<count;i++){
      const side=i%2?-1:1;
      const seed=hash01(i*43+7);
      const y=((game.elapsed*(220+seed*170)+seed*v.h*1.7)%(v.h*.78))+v.h*.16;
      const x=side<0?v.w*(.02+seed*.18):v.w*(.98-seed*.18);
      const len=(70+seed*180)*amount;
      ctx.globalAlpha=.08+.18*amount;ctx.strokeStyle=i%3===0?'#ffcc70':'#68e9ff';ctx.lineWidth=1+seed*2;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+side*len,y+len*.18);ctx.stroke();
    }
    ctx.restore();
  }

  drawBoss(ctx,game,cam,foreground) {
    const b=game.boss;if(!b?.visible)return;
    const deck=b.phase>=2;
    if(foreground!==deck)return;
    const s=game.distance+b.gap;
    const point=this.track.worldPoint(s,b.x||0,deck?7.15:10.6);
    const p=this.track.project(point,cam,this.view);if(!p)return;
    const sc=p.scale;
    ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=clamp(1-p.z/520,.34,1);
    const pulse=1+Math.sin(game.elapsed*2.5)*.018;ctx.scale(pulse,pulse);
    const outer=sc*(deck?12.4:9.2),inner=sc*(deck?5.2:3.8);
    ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=deck?.28:.52;ctx.drawImage(this.sprites.glowGold,-outer*1.5,-outer*1.5,outer*3,outer*3);ctx.restore();

    ctx.save();ctx.rotate(game.elapsed*(deck?.10:.18));
    const fins=12;
    for(let i=0;i<fins;i++){
      const a=i/fins*TAU;ctx.save();ctx.rotate(a);ctx.fillStyle=i%3===0?'#ffbb55':'#111528';ctx.strokeStyle='#ffd97a';ctx.lineWidth=Math.max(1,sc*.08);
      ctx.beginPath();ctx.moveTo(-sc*.52,-outer*.67);ctx.lineTo(0,-outer*1.18);ctx.lineTo(sc*.52,-outer*.67);ctx.lineTo(sc*.28,-outer*.56);ctx.lineTo(-sc*.28,-outer*.56);ctx.closePath();ctx.fill();if(i%3===0)ctx.stroke();ctx.restore();
    }
    ctx.restore();

    ctx.lineCap='round';
    ctx.strokeStyle='#0a0e1e';ctx.lineWidth=Math.max(5,sc*.92);ctx.beginPath();ctx.arc(0,0,outer,0,TAU);ctx.stroke();
    ctx.strokeStyle='#ffc857';ctx.lineWidth=Math.max(2,sc*.26);ctx.beginPath();ctx.arc(0,0,outer,0,TAU);ctx.stroke();
    ctx.strokeStyle='rgba(255,244,184,.86)';ctx.lineWidth=Math.max(1,sc*.09);ctx.setLineDash([Math.max(3,sc*1.1),Math.max(3,sc*.65)]);ctx.lineDashOffset=-game.elapsed*sc*.6;ctx.beginPath();ctx.arc(0,0,outer*.82,0,TAU);ctx.stroke();ctx.setLineDash([]);

    for(let i=0;i<8;i++){
      const a=i/8*TAU+game.elapsed*.03;ctx.save();ctx.rotate(a);ctx.fillStyle=i%2?'#20263b':'#14192c';roundedRect(ctx,-sc*.62,-outer*.73,sc*1.24,outer*.22,sc*.15);ctx.fill();ctx.fillStyle=i%2?'#36d7ef':'#ff6a64';ctx.fillRect(-sc*.28,-outer*.67,sc*.56,sc*.12);ctx.restore();
    }

    ctx.fillStyle='#080c1a';ctx.beginPath();ctx.arc(0,0,inner*1.55,0,TAU);ctx.fill();
    ctx.strokeStyle='#fff0af';ctx.lineWidth=Math.max(2,sc*.28);ctx.beginPath();ctx.arc(0,0,inner*1.34,0,TAU);ctx.stroke();
    ctx.fillStyle=b.phase>=3?'#ffe26f':'#7467e8';ctx.beginPath();ctx.arc(0,0,inner*.77,0,TAU);ctx.fill();
    ctx.fillStyle='#fffbe2';ctx.globalAlpha=.78;ctx.beginPath();ctx.arc(-inner*.12,-inner*.12,inner*.42,0,TAU);ctx.fill();ctx.globalAlpha=1;

    if(deck){
      ctx.strokeStyle='#080b16';ctx.lineWidth=Math.max(4,sc*.86);
      for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*outer*.48,sc*2);ctx.quadraticCurveTo(side*outer*1.25,outer*.9,side*outer*1.55,outer*2.1);ctx.stroke();ctx.strokeStyle='#ffc857';ctx.lineWidth=Math.max(1,sc*.11);ctx.stroke();ctx.strokeStyle='#080b16';ctx.lineWidth=Math.max(4,sc*.86);}
    }
    ctx.restore();
  }

  drawEntities(ctx,game,cam) {
    const list=this.entityDrawList;list.length=0;
    for(const e of game.entities){
      if(e.remove)continue;
      const p=this.track.project(this.track.worldPoint(e.s,e.x,e.y),cam,this.view);
      if(p&&p.visible)list.push({e,p});
    }
    list.sort((a,b)=>b.p.z-a.p.z);
    for(const item of list)this.drawEntity(ctx,item.e,item.p,game,cam);
    const target=list.find(item=>item.e===game.targetEntity);
    if(target)this.drawTargetBracket(ctx,target.e,target.p,game);
  }

  drawTargetBracket(ctx,e,p,game) {
    const rz=e.s-(game.distance+CFG.playerZ);
    const inRange=rz>=2.5&&rz<=18&&Math.abs(e.x-game.player.x)<=CFG.attackWidth+(e.radius||1)*.45;
    const r=clamp(p.scale*((e.width||e.radius||1)*.62+1.2),15,58),seg=r*.34;
    ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle=inRange?'#ffe58a':'#58e8f5';ctx.lineWidth=inRange?3:2;ctx.globalAlpha=.62+Math.sin(game.elapsed*9)*.18;
    for(const sx of [-1,1])for(const sy of [-1,1]){ctx.beginPath();ctx.moveTo(sx*r,sy*(r-seg));ctx.lineTo(sx*r,sy*r);ctx.lineTo(sx*(r-seg),sy*r);ctx.stroke();}
    ctx.fillStyle=inRange?'#ffe58a':'#58e8f5';ctx.beginPath();ctx.moveTo(0,-r-8);ctx.lineTo(-4,-r-14);ctx.lineTo(4,-r-14);ctx.closePath();ctx.fill();ctx.restore();
  }

  drawEntity(ctx,e,p,game,cam) {
    const sc=p.scale;ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=e.dead?.32:1;
    if(e.hitFlash>0){ctx.globalCompositeOperation='screen';ctx.globalAlpha=.88;}
    switch(e.kind){
      case 'drone':this.drawDrone(ctx,e,sc);break;
      case 'gate':this.drawGate(ctx,e,sc);break;
      case 'needle':this.drawNeedle(ctx,e,sc);break;
      case 'projectile':this.drawProjectile(ctx,e,sc);break;
      case 'pickup':this.drawPickup(ctx,e,sc);break;
      case 'lowWave':this.drawLowWave(ctx,e,sc);break;
      case 'beam':ctx.restore();this.drawBeamWorld(ctx,e,game,cam);return;
      case 'sweep':this.drawSweep(ctx,e,sc);break;
      case 'lock':this.drawLock(ctx,e,sc);break;
      case 'core':this.drawCore(ctx,e,sc);break;
    }
    ctx.restore();
  }

  drawShadow(ctx,sc,w=1,h=.28,a=.28) {ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#050713';ctx.beginPath();ctx.ellipse(0,sc*.95,sc*w,sc*h,0,0,TAU);ctx.fill();ctx.restore();}

  drawDrone(ctx,e,sc) {
    this.drawShadow(ctx,sc,1.35,.22,.30);ctx.rotate(Math.sin(e.age*2+e.seed)*.1);
    if(e.state==='fire'&&e.timer>0){const t=1-e.timer/.72;ctx.globalAlpha=.35+.35*Math.sin(e.timer*24);ctx.strokeStyle='#ff625e';ctx.lineWidth=Math.max(2,sc*.10);ctx.beginPath();ctx.arc(0,0,sc*(1.55+t*1.6),0,TAU);ctx.stroke();ctx.globalAlpha=1;}
    ctx.fillStyle='#090e1d';ctx.strokeStyle='#fff0b8';ctx.lineWidth=Math.max(1,sc*.085);
    ctx.beginPath();ctx.moveTo(-sc*1.65,sc*.12);ctx.lineTo(-sc*.55,-sc*.56);ctx.lineTo(0,-sc*.8);ctx.lineTo(sc*.55,-sc*.56);ctx.lineTo(sc*1.65,sc*.12);ctx.lineTo(sc*.48,sc*.48);ctx.lineTo(0,sc*.70);ctx.lineTo(-sc*.48,sc*.48);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=e.variant===2?'#ff5e62':'#2ed8ef';ctx.beginPath();ctx.arc(0,-sc*.04,sc*.40,0,TAU);ctx.fill();
    ctx.fillStyle='#fffce1';ctx.beginPath();ctx.arc(-sc*.12,-sc*.16,sc*.12,0,TAU);ctx.fill();
    ctx.fillStyle=e.variant===2?'#ffb14d':'#ffc857';ctx.fillRect(-sc*1.2,sc*.06,sc*.48,sc*.12);ctx.fillRect(sc*.72,sc*.06,sc*.48,sc*.12);
  }

  drawGate(ctx,e,sc) {
    this.drawShadow(ctx,sc,e.width*.57,.24,.32);ctx.translate(0,-sc*.78);
    const w=sc*e.width,h=sc*e.height;
    ctx.fillStyle='#090d1b';roundedRect(ctx,-w/2,-h/2,w,h,sc*.20);ctx.fill();
    ctx.strokeStyle=e.armored?'#ff625e':'#ffc857';ctx.lineWidth=Math.max(2,sc*.14);ctx.stroke();
    ctx.save();ctx.beginPath();roundedRect(ctx,-w/2,-h/2,w,h,sc*.20);ctx.clip();
    ctx.strokeStyle=e.armored?'rgba(255,94,98,.72)':'rgba(54,215,239,.66)';ctx.lineWidth=sc*.34;
    for(let x=-w;x<w*1.5;x+=sc*1.0){ctx.beginPath();ctx.moveTo(x,h/2);ctx.lineTo(x+sc*1.4,-h/2);ctx.stroke();}
    ctx.restore();
    ctx.fillStyle='#fff3b8';ctx.fillRect(-w*.42,-sc*.10,w*.84,sc*.10);
  }

  drawNeedle(ctx,e,sc) {
    this.drawShadow(ctx,sc,1.25,.22,.28);
    if(e.state==='warn'){ctx.globalAlpha=.48+.42*Math.sin(e.age*20);ctx.strokeStyle='#fff1ac';ctx.lineWidth=Math.max(2,sc*.12);ctx.beginPath();ctx.arc(0,0,sc*1.65,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(-e.dir*sc*2.8,0);ctx.lineTo(e.dir*sc*2.8,0);ctx.stroke();ctx.globalAlpha=1;}
    ctx.rotate(e.dir>0?-.35:.35);ctx.fillStyle='#080d1b';ctx.strokeStyle='#ff625e';ctx.lineWidth=Math.max(2,sc*.10);
    ctx.beginPath();ctx.moveTo(-sc*.92,sc*.48);ctx.lineTo(0,-sc*1.92);ctx.lineTo(sc*.92,sc*.48);ctx.lineTo(0,sc*.16);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff6c7';ctx.beginPath();ctx.arc(0,-sc*.42,sc*.20,0,TAU);ctx.fill();
  }

  drawProjectile(ctx,e,sc) {
    const r=sc*(e.variant===1?1.65:1.32),sprite=e.variant===1?this.sprites.glowHot:this.sprites.glowCyan;
    ctx.strokeStyle=e.variant===1?'rgba(255,92,94,.62)':'rgba(64,225,244,.58)';ctx.lineWidth=Math.max(2,sc*.12);ctx.beginPath();ctx.moveTo(0,sc*.3);ctx.lineTo(-e.vx*sc*.12,sc*2.4);ctx.stroke();
    ctx.save();ctx.globalCompositeOperation='screen';ctx.drawImage(sprite,-r,-r,r*2,r*2);ctx.restore();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,Math.max(1,sc*.16),0,TAU);ctx.fill();
  }

  drawPickup(ctx,e,sc) {
    ctx.save();ctx.rotate(e.age*1.55);ctx.globalCompositeOperation='screen';ctx.globalAlpha=.48;const r=sc*1.45;ctx.drawImage(e.type==='health'?this.sprites.glowHot:this.sprites.glowGold,-r,-r,r*2,r*2);ctx.restore();
    ctx.rotate(e.age*1.55);ctx.fillStyle=e.type==='health'?'#ff625e':'#ffe16d';
    if(e.type==='light'){ctx.beginPath();ctx.moveTo(0,-sc*.68);ctx.lineTo(sc*.46,0);ctx.lineTo(0,sc*.68);ctx.lineTo(-sc*.46,0);ctx.closePath();}else starPath(ctx,0,0,6,sc*.78,sc*.36);
    ctx.fill();ctx.strokeStyle='#fff9d9';ctx.lineWidth=Math.max(1,sc*.08);ctx.stroke();if(e.type==='light'){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,Math.max(1,sc*.11),0,TAU);ctx.fill();}
  }

  drawLowWave(ctx,e,sc) {
    const w=sc*e.width*.5;ctx.globalAlpha=e.warning?.50:.98;ctx.fillStyle=e.warning?'#fff1af':'#ff425f';ctx.fillRect(-w,-sc*.68,w*2,sc*(e.warning?.20:.40));ctx.fillStyle=e.warning?'rgba(255,255,255,.45)':'#fff0c0';ctx.fillRect(-w,-sc*.54,w*2,sc*.07);
    if(!e.warning){for(let x=-w;x<w;x+=Math.max(5,sc*1.4)){ctx.beginPath();ctx.moveTo(x,-sc*.68);ctx.lineTo(x+sc*.42,-sc*1.08);ctx.lineTo(x+sc*.84,-sc*.68);ctx.fill();}}ctx.globalAlpha=1;
  }

  drawBeamWorld(ctx,e,game,cam) {
    const s0=game.distance+3,s1=game.distance+115;
    const pts=[this.track.worldPoint(s0,e.x-e.width/2,.02),this.track.worldPoint(s0,e.x+e.width/2,.02),this.track.worldPoint(s1,e.x+e.width/2,.02),this.track.worldPoint(s1,e.x-e.width/2,.02)].map(q=>this.track.project(q,cam,this.view));
    if(pts.some(p=>!p))return;
    ctx.save();ctx.globalCompositeOperation=e.warning?'source-over':'screen';ctx.globalAlpha=e.warning?.34:.82;ctx.fillStyle=e.warning?'#fff1a8':'#ff425f';polygon(ctx,pts);ctx.fill();ctx.strokeStyle=e.warning?'#fff':'#ffd1cb';ctx.lineWidth=e.warning?2:3;ctx.stroke();
    if(e.warning){ctx.setLineDash([8,7]);ctx.strokeStyle='#ff625e';ctx.stroke();ctx.setLineDash([]);}ctx.restore();
  }

  drawSweep(ctx,e,sc) {
    ctx.globalAlpha=e.warning?.42:.98;ctx.strokeStyle=e.warning?'#fff1af':'#ff4f62';ctx.lineWidth=Math.max(4,sc*(e.warning?.14:.38));ctx.beginPath();ctx.moveTo(-sc*8.5,0);ctx.lineTo(sc*8.5,0);ctx.stroke();
    ctx.globalAlpha=1;ctx.fillStyle='#080d1c';ctx.beginPath();ctx.arc(0,0,sc*.86,0,TAU);ctx.fill();ctx.strokeStyle='#ffc857';ctx.lineWidth=Math.max(1,sc*.08);ctx.stroke();
  }

  drawLock(ctx,e,sc) {
    ctx.scale(1.14,1.14);this.drawShadow(ctx,sc,1.8,.3,.34);ctx.rotate(Math.sin(e.age*2+e.index)*.075);
    ctx.fillStyle=e.dead?'#25242a':'#080d1b';roundedRect(ctx,-sc*1.45,-sc*1.82,sc*2.9,sc*2.75,sc*.34);ctx.fill();
    ctx.strokeStyle=e.dead?'#6b5745':'#ffc857';ctx.lineWidth=Math.max(2,sc*.18);ctx.stroke();
    ctx.fillStyle=e.dead?'#201d20':'#fff0ae';ctx.beginPath();ctx.arc(0,-sc*.48,sc*.56,0,TAU);ctx.fill();ctx.fillRect(-sc*.20,-sc*.48,sc*.40,sc*1.02);
    if(!e.dead){ctx.strokeStyle='#35d8ee';ctx.lineWidth=Math.max(1,sc*.06);ctx.beginPath();ctx.arc(0,-sc*.48,sc*(.88+Math.sin(e.age*4)*.08),0,TAU);ctx.stroke();}
    const ratio=Math.max(0,e.health)/e.maxHealth;ctx.fillStyle='rgba(4,7,17,.88)';ctx.fillRect(-sc*1.26,sc*1.14,sc*2.52,Math.max(3,sc*.16));ctx.fillStyle=e.dead?'#3e4657':'#ffe06d';ctx.fillRect(-sc*1.20,sc*1.18,sc*2.40*ratio,Math.max(1,sc*.08));
  }

  drawCore(ctx,e,sc) {
    this.drawShadow(ctx,sc,3,.38,.34);
    const r=sc*3.3;
    ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=e.vulnerable>0?.75:.42;ctx.drawImage(e.vulnerable>0?this.sprites.glowGold:this.sprites.glowCyan,-r,-r,r*2,r*2);ctx.restore();
    ctx.save();ctx.rotate(e.age*.48);ctx.strokeStyle=e.vulnerable>0?'#ffe16d':'#8d7aff';ctx.lineWidth=Math.max(2,sc*.20);
    for(let i=0;i<3;i++){ctx.rotate(TAU/3);ctx.beginPath();ctx.ellipse(0,0,sc*2.55,sc*.95,0,0,TAU);ctx.stroke();}
    ctx.restore();
    ctx.strokeStyle=e.vulnerable>0?'rgba(255,231,121,.92)':'rgba(142,121,255,.78)';ctx.lineWidth=Math.max(2,sc*.10);ctx.setLineDash([Math.max(3,sc*.35),Math.max(2,sc*.20)]);ctx.lineDashOffset=-e.age*sc*.7;ctx.beginPath();ctx.arc(0,0,sc*3.1,0,TAU);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#fff8cf';ctx.beginPath();ctx.arc(0,0,sc*.68,0,TAU);ctx.fill();ctx.fillStyle=e.vulnerable>0?'#ffc857':'#7163e5';ctx.globalAlpha=.72;ctx.beginPath();ctx.arc(-sc*.12,-sc*.12,sc*.38,0,TAU);ctx.fill();ctx.globalAlpha=1;
  }

  drawEchoes(ctx,game,cam) {
    const p=game.player;if(!p.chorus)return;
    for(let i=p.chorus;i>=1;i--){
      const h=p.history.fromNewest(Math.round(i*CFG.echoDelay*60));if(!h)continue;
      const pr=this.track.project(this.track.worldPoint(game.distance+CFG.playerZ-i*.64,h.x,h.y),cam,this.view);if(!pr)continue;
      this.drawRider(ctx,pr,h,game,i===p.chorus?'#46e6f2':'#8f7cff',.18+i*.065,true);
    }
  }

  drawBoardTrail(ctx,game,cam) {
    const p=game.player;if(game.settings.reducedMotion)return;
    const pts=[];const count=this.quality===0?7:(this.quality===1?10:14);
    for(let i=count;i>=0;i--){
      const h=p.history.fromNewest(i*2);if(!h)continue;
      const pr=this.track.project(this.track.worldPoint(game.distance+CFG.playerZ-i*.78,h.x,h.y+.10),cam,this.view);if(pr)pts.push(pr);
    }
    if(pts.length<3)return;
    ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';ctx.lineJoin='round';
    for(const [color,width,alpha] of [['#24d9f0',.22,.24],['#ff6a64',.09,.36]]){
      ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,pts.at(-1).scale*width);ctx.stroke();
    }
    ctx.restore();
  }

  drawPlayer(ctx,game,cam) {
    this.drawBoardTrail(ctx,game,cam);
    const p=game.player,pr=this.track.project(this.track.worldPoint(game.distance+CFG.playerZ,p.x,p.y),cam,this.view);if(!pr)return;
    this.drawRider(ctx,pr,p,game,COLORS.paper,p.invuln>0&&Math.floor(p.invuln*18)%2===0?.48:1,false);
  }

  drawRider(ctx,pr,state,game,color,alpha=1,echo=false) {
    const sc=pr.scale;ctx.save();ctx.translate(pr.x,pr.y);ctx.globalAlpha=alpha;
    if(!echo)this.drawShadow(ctx,sc,1.5,.22,.35);
    const lean=state.lean||0,attack=state.attackTimer>0?1-state.attackTimer/CFG.attackDuration:0,dash=!!state.dash||state.dashTimer>0;
    ctx.rotate(lean*.34);if(dash)ctx.scale(1.16,.90);

    if(!echo){
      ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.26;const g=sc*2.5;ctx.drawImage(this.sprites.glowCyan,-g,-g*.55,g*2,g*1.35);ctx.restore();
    }

    // Board: a sharp, readable silhouette with a luminous underside.
    ctx.fillStyle=echo?color:'#070b17';ctx.strokeStyle=echo?'rgba(255,255,255,.48)':'#fff0b5';ctx.lineWidth=Math.max(1,sc*.075);
    ctx.beginPath();ctx.moveTo(-sc*1.62,sc*.57);ctx.quadraticCurveTo(-sc*.35,sc*.95,sc*1.55,sc*.48);ctx.lineTo(sc*1.06,sc*.86);ctx.quadraticCurveTo(-sc*.35,sc*1.18,-sc*1.76,sc*.76);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle=echo?color:'#2de0ef';ctx.lineWidth=Math.max(2,sc*.11);ctx.beginPath();ctx.moveTo(-sc*1.25,sc*.78);ctx.quadraticCurveTo(0,sc*1.06,sc*1.28,sc*.70);ctx.stroke();
    ctx.fillStyle=echo?color:'#ff625e';ctx.beginPath();ctx.moveTo(-sc*1.58,sc*.60);ctx.lineTo(-sc*1.95,sc*.72);ctx.lineTo(-sc*1.58,sc*.83);ctx.closePath();ctx.fill();

    ctx.save();ctx.rotate(-lean*.68);
    // Trailing coat/scarf gives speed and a stronger silhouette.
    ctx.fillStyle=echo?color:'#ff625e';ctx.globalAlpha=echo?.55:1;ctx.beginPath();ctx.moveTo(-sc*.18,-sc*.50);ctx.lineTo(-sc*(1.12+(dash?.45:0)),-sc*.18);ctx.lineTo(-sc*.55,sc*.18);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
    // Legs.
    ctx.strokeStyle=echo?color:'#080c18';ctx.lineWidth=Math.max(2,sc*.19);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-sc*.25,sc*.26);ctx.lineTo(-sc*.66,sc*.83);ctx.moveTo(sc*.18,sc*.24);ctx.lineTo(sc*.60,sc*.72);ctx.stroke();
    // Torso armor.
    ctx.fillStyle=echo?color:'#f6dca4';ctx.beginPath();ctx.moveTo(-sc*.42,-sc*.66);ctx.quadraticCurveTo(0,-sc*.92,sc*.42,-sc*.60);ctx.lineTo(sc*.32,sc*.18);ctx.quadraticCurveTo(0,sc*.42,-sc*.36,sc*.16);ctx.closePath();ctx.fill();
    ctx.strokeStyle=echo?'rgba(255,255,255,.45)':'#080c18';ctx.lineWidth=Math.max(1,sc*.09);ctx.stroke();
    ctx.fillStyle=echo?'rgba(255,255,255,.26)':'#ff625e';ctx.fillRect(-sc*.30,-sc*.46,sc*.60,sc*.12);
    // Helmet.
    ctx.fillStyle=echo?color:'#080c18';ctx.beginPath();ctx.arc(sc*.03,-sc*1.30,sc*.43,0,TAU);ctx.fill();ctx.strokeStyle=echo?'rgba(255,255,255,.48)':'#fff0b5';ctx.lineWidth=Math.max(1,sc*.07);ctx.stroke();
    ctx.fillStyle=echo?'rgba(255,255,255,.75)':'#44e1ef';roundedRect(ctx,-sc*.24,-sc*1.39,sc*.58,sc*.17,sc*.07);ctx.fill();
    // Sword arm.
    const swingSide=state.attackIndex===1?-1:1;
    const armA=attack>0?Math.sin(attack*Math.PI)*1.72*swingSide:.20;
    ctx.save();ctx.translate(sc*.10,-sc*.62);ctx.rotate(-armA);ctx.strokeStyle=echo?color:'#080c18';ctx.lineWidth=Math.max(2,sc*.17);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(sc*.68,0);ctx.stroke();
    ctx.strokeStyle=echo?'rgba(255,255,255,.66)':'#fff7cf';ctx.lineWidth=Math.max(2,sc*.105);ctx.beginPath();ctx.moveTo(sc*.52,0);ctx.lineTo(sc*1.56,0);ctx.stroke();
    ctx.strokeStyle=echo?color:'#ffcc64';ctx.lineWidth=Math.max(1,sc*.035);ctx.beginPath();ctx.moveTo(sc*.62,-sc*.07);ctx.lineTo(sc*1.55,-sc*.07);ctx.stroke();ctx.restore();
    ctx.restore();

    if(!echo&&game.player.chorus>=3){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.30;const g=sc*2.25;ctx.drawImage(this.sprites.glowGold,-g,-g*1.05,g*2,g*2);ctx.restore();}
    ctx.restore();
  }

  drawCinematicOverlays(ctx,game) {
    const v=this.view;
    if(game.cinematicBars>0){const h=v.h*.085*game.cinematicBars;ctx.fillStyle='#040712';ctx.fillRect(0,0,v.w,h);ctx.fillRect(0,v.h-h,v.w,h);}
    if(game.state==='dying'){ctx.fillStyle=`rgba(7,8,20,${clamp(game.deathTimer*.78,0,.68)})`;ctx.fillRect(0,0,v.w,v.h);}
  }

  drawVignetteAndGrain(ctx,game) {
    const v=this.view;
    ctx.save();ctx.fillStyle=this.vignette;ctx.globalAlpha=game.settings.reducedMotion?.62:1;ctx.fillRect(0,0,v.w,v.h);
    if(this.quality>0&&this.grainPattern){ctx.globalAlpha=.024;ctx.fillStyle=this.grainPattern;ctx.translate(-(game.elapsed*7)%96,-(game.elapsed*3)%96);ctx.fillRect(-96,-96,v.w+192,v.h+192);}
    ctx.restore();
  }
}


/* ===== game.js ===== */









class Game {
  constructor(canvas) {
    this.canvas=canvas;
    this.track=new Track();
    this.effects=new Effects();
    this.input=new InputManager(canvas);
    this.audio=new AudioEngine();
    this.player=new Player();
    this.renderer=new Renderer(canvas,this.track,this.effects);
    this.view=this.renderer.view;
    this.entities=[];
    this.echoStrikes=[];
    this.targetEntity=null;
    this.state='boot';
    this.distance=0;this.elapsed=0;this.runTime=0;this.speed=CFG.baseSpeed;this.speedImpulse=0;
    this.score=0;this.highScore=Number(safeStorageGet('sundog-highscore','0'))||0;
    this.checkpoint={distance:0,bossPhase:0};
    this.boss=new BossController(this);
    this.director=new StageDirector(this);
    this.settings={muted:safeStorageGet('sundog-muted','0')==='1',reducedMotion:safeStorageGet('sundog-reduced','0')==='1'};
    this.audio.setMuted(this.settings.muted);
    this.stats=this.newStats();
    this.chapterIndex=-1;
    this.toastTimer=0;this.promptText='';this.cinematicBars=0;this.deathTimer=0;this.endingTimer=0;this.endDistance=CFG.finishDistance;
    this.lastFrame=performance.now();this.raf=0;this.debugInvincible=false;
    this.dom=this.captureDom();
    this.bindUI();
    this.syncSettingsUI();
    this.updateHUD(true);
    this.installDebugAPI();
  }

  newStats() { return {kills:0,perfects:0,attacks:0,dashes:0,jumps:0,hitsTaken:0,deaths:0,maxCombo:0,echoHits:0,lightShards:0,maxLightChain:0,damage:0,startTime:0,endTime:0}; }

  captureDom() {
    const ids=['boot','play','pause','resume','restart','mute','motion','fullscreen','results','result-title','rank','stats','encore','copy-score','hud','health','objective','chapter','score','combo','chorus','flow-fill','speed-state','action-cut','action-dash','toast','prompt','bossbar','boss-fill','boss-phase','boss-locks'];
    const d={};for(const id of ids)d[id.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=document.getElementById(id);return d;
  }

  bindUI() {
    this.dom.play?.addEventListener('click',()=>this.startRun());
    this.dom.resume?.addEventListener('click',()=>this.resume());
    this.dom.restart?.addEventListener('click',()=>{this.resume();this.restartCheckpoint();});
    this.dom.encore?.addEventListener('click',()=>this.startRun(true));
    this.dom.copyScore?.addEventListener('click',()=>this.copyScore());
    this.dom.mute?.addEventListener('click',()=>{this.settings.muted=!this.settings.muted;this.audio.setMuted(this.settings.muted);safeStorageSet('sundog-muted',this.settings.muted?'1':'0');this.syncSettingsUI();});
    this.dom.motion?.addEventListener('click',()=>{this.settings.reducedMotion=!this.settings.reducedMotion;safeStorageSet('sundog-reduced',this.settings.reducedMotion?'1':'0');this.syncSettingsUI();});
    this.dom.fullscreen?.addEventListener('click',async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.state==='playing')this.pause();});
    const pauseForPortrait=()=>{if(this.input.isTouch&&matchMedia('(orientation: portrait)').matches&&this.state==='playing')this.pause();};
    addEventListener('orientationchange',pauseForPortrait,{passive:true});
    addEventListener('resize',pauseForPortrait,{passive:true});
  }

  syncSettingsUI() {
    if(this.dom.mute){this.dom.mute.textContent=this.settings.muted?'SOUND OFF':'SOUND ON';this.dom.mute.setAttribute('aria-pressed',String(this.settings.muted));}
    if(this.dom.motion){this.dom.motion.textContent=this.settings.reducedMotion?'REDUCED MOTION':'FULL MOTION';this.dom.motion.setAttribute('aria-pressed',String(this.settings.reducedMotion));}
  }

  async startRun(encore=false) {
    await this.audio.start();this.audio.setMuted(this.settings.muted);
    this.state='playing';document.body.classList.add('game-active');this.distance=0;this.elapsed=0;this.runTime=0;this.speed=CFG.baseSpeed;this.speedImpulse=0;this.score=0;
    this.stats=this.newStats();this.stats.startTime=performance.now();this.entities=[];this.echoStrikes=[];this.targetEntity=null;this.effects.reset();this.player.reset(true);
    if(encore){this.player.chorus=1;this.score=1000;}
    this.checkpoint={distance:0,bossPhase:0};this.boss.resetTo(0);this.director.reset(0);this.chapterIndex=-1;this.endDistance=CFG.finishDistance;
    this.cinematicBars=0;this.deathTimer=0;this.endingTimer=0;
    setVisible(this.dom.boot,false);setVisible(this.dom.pause,false);setVisible(this.dom.results,false);this.dom.hud?.classList.add('visible');this.dom.hud?.setAttribute('aria-hidden','false');
    this.canvas.focus();this.input.clearEdges();this.toast('RUN THE CROWN',COLORS.paper,1.15);this.updateChapter(true);this.updateHUD(true);
  }

  pause() {
    if(this.state!=='playing')return;this.state='paused';document.body.classList.remove('game-active');setVisible(this.dom.pause,true);this.input.clearEdges();
  }
  resume() {
    if(this.state!=='paused')return;this.state='playing';document.body.classList.add('game-active');setVisible(this.dom.pause,false);this.lastFrame=performance.now();this.canvas.focus();this.input.clearEdges();this.audio.start();
  }

  setCheckpoint(distance,bossPhase=0,force=false) {
    if(!force&&distance<=this.checkpoint.distance)return;
    this.checkpoint={distance,bossPhase};
  }

  restartCheckpoint() {
    this.stats.deaths++;
    this.score=Math.max(0,this.score-CFG.checkpointPenalty);
    this.distance=this.checkpoint.distance;this.speed=CFG.baseSpeed;this.speedImpulse=0;this.entities=[];this.echoStrikes=[];this.targetEntity=null;this.effects.reset();
    const keepChorus=this.player.chorus;this.player.reset(true);this.player.chorus=Math.min(1,keepChorus);
    this.boss.resetTo(this.checkpoint.bossPhase);this.director.reset(this.distance);this.state='playing';document.body.classList.add('game-active');this.deathTimer=0;this.cinematicBars=0;
    this.toast('BACK ON THE ROAD',COLORS.paper,1);this.updateChapter(true);this.updateHUD(true);
  }

  onPlayerDeath() {
    if(this.debugInvincible){this.player.health=CFG.maxHealth;this.player.dead=false;return;}
    this.state='dying';document.body.classList.remove('game-active');this.deathTimer=0;this.audio.sfx('hurt',1.3);this.toast('THE ROAD OBJECTS',COLORS.paper,.7);
  }

  addEntity(e) { if(e)this.entities.push(e);return e; }

  updateTargeting() {
    const playerS=this.distance+CFG.playerZ;
    let best=null,bestScore=Infinity;
    for(const e of this.entities) {
      if(e.dead||e.remove||!e.attackable)continue;
      const rz=e.s-playerS,dx=Math.abs(e.x-this.player.x);
      if(rz<1.5||rz>34||dx>5.5)continue;
      const priority=(e.kind==='lock'||e.kind==='core')?-8:0;
      const score=rz+dx*3.1+priority;
      if(score<bestScore){best=e;bestScore=score;}
    }
    this.targetEntity=best;
  }

  performStrike(strike) {
    let hits=0;
    for(const e of this.entities) {
      if(entityCanBeHit(e,strike)) {
        const amount=(strike.echo?.72:1.12)*(strike.power||1);
        if(damageEntity(e,amount,this,strike)){hits++;this.stats.damage+=amount;if(strike.echo)this.stats.echoHits++;}
      }
    }
    if(hits>0) {
      this.player.combo+=hits;this.player.comboTimer=CFG.comboWindow;this.player.flow=clamp(this.player.flow+.055*hits,0,1);this.stats.maxCombo=Math.max(this.stats.maxCombo,this.player.combo);
      this.addScore(Math.round(45*hits*(1+Math.min(3,this.player.combo*.08))),strike.echo?'ECHO HIT':'CLEAN');
      this.effects.hitStop(strike.echo?.018:.035);
    }
  }

  scheduleEchoStrike(index,side,power) { this.echoStrikes.push({timer:index*CFG.echoDelay,index,side,power}); }

  updateEchoStrikes(dt) {
    const strikes=this.echoStrikes;
    let w=0;
    for(let i=0,n=strikes.length;i<n;i++) {
      const e=strikes[i];
      if(!e)continue;
      e.timer-=dt;
      if(e.timer<=0) {
        const h=this.player.history.fromNewest(Math.round(e.index*CFG.echoDelay*60))||this.player;
        const s=this.distance+CFG.playerZ+5.5;
        this.effects.slash(s,h.x,h.y+1.05,e.side,e.index%2?COLORS.blue:COLORS.violet,true);
        this.performStrike({s,x:h.x,y:h.y,echo:true,index:e.index,side:e.side,power:e.power});
        // Core destruction intentionally replaces the pending-strike array.
        // Do not compact the old array into the new victory-state array.
        if(this.echoStrikes!==strikes)return;
      } else strikes[w++]=e;
    }
    strikes.length=w;
  }

  onEntityDestroyed(e) {
    if(e.kind!=='projectile')this.stats.kills++;
    if(e.kind==='drone'&&Math.random()<.11&&this.player.health<CFG.maxHealth)this.addEntity(spawn.pickup(e.s,e.x,'health'));
    if(e.kind==='core')this.boss.beginDefeat();
  }

  onBossDefeated() {
    this.addScore(15000,'');this.effects.popup('+15,000',this.view.cx,this.view.h*.43,COLORS.sun2,1.3);this.audio.sfx('win',1.3);this.effects.addFlash('#fff5ba',.9);this.effects.addShake(26);this.effects.speedLines(this.view,this.settings.reducedMotion?6:28,1.5);
    this.toast('MORNING IS NOW PUBLIC DOMAIN',COLORS.paper,2.4);this.cinematicBars=1;this.endDistance=Math.max(CFG.finishDistance,this.distance+260);
    setTimeout(()=>{if(this.state==='playing')this.cinematicBars=0;},1400);
  }

  addScore(amount,label='') {
    const mult=1+Math.min(3,this.player.combo*.055)+this.player.chorus*.12;
    this.score+=Math.round(amount*mult);
    if(label&&amount>=180)this.effects.popup(label,this.view.cx,this.view.h*.34,label.includes('PERFECT')?COLORS.sun2:'#fff',amount>1000?1.35:1);
  }

  toast(text,color=COLORS.paper,duration=1) {
    const el=this.dom.toast;if(!el)return;el.textContent=text;el.style.color=color;el.classList.add('show');this.toastTimer=duration;
  }

  updateToast(dt) {
    if(this.toastTimer>0){this.toastTimer-=dt;if(this.toastTimer<=0)this.dom.toast?.classList.remove('show');}
  }

  updateChapter(force=false) {
    let idx=CHAPTERS.findIndex(c=>this.distance>=c.start&&this.distance<c.end);
    if(this.boss.phase===2)idx=4; else if(this.boss.phase===3)idx=5; else if(this.boss.phase===4)idx=6;
    if(idx<0)return;
    if(force||idx!==this.chapterIndex) {
      this.chapterIndex=idx;const c=CHAPTERS[idx];
      if(this.dom.chapter)this.dom.chapter.textContent=c.name;
      if(this.dom.objective)this.dom.objective.textContent=c.objective;
      if(!force&&idx>0&&this.boss.phase!==4)this.toast(c.name,COLORS.paper,1.25);
    }
  }

  tutorialPrompt(input) {
    if(this.distance>780||this.boss.phase>=1)return '';
    const labels=CONTROL_LABELS[input.device]||CONTROL_LABELS.keyboard;
    if(this.distance<115)return `STEER THROUGH THE LIGHT — ${labels.move}`;
    if(this.stats.attacks===0&&this.distance<225)return `CUT THE BARRIER — ${labels.attack}`;
    if(this.stats.jumps===0&&this.distance<365)return `JUMP THE RED WAVE — ${labels.jump}`;
    if(this.stats.dashes===0&&this.distance<600)return `DASH THROUGH DANGER — ${labels.dash}`;
    if(this.stats.perfects===0&&this.distance>430)return 'DASH AS RED HITS — BANK AN ECHO';
    return '';
  }

  updateHUD(force=false,input={device:this.input.lastDevice}) {
    if(!this.dom.health)return;
    const hp=Array.from({length:CFG.maxHealth},(_,i)=>`<span class="health-pip ${i<this.player.health?'full':''} ${this.player.health===1&&i===0?'danger':''}"></span>`).join('');
    if(force||this.dom.health.dataset.v!==hp){this.dom.health.innerHTML=hp;this.dom.health.dataset.v=hp;}
    const ch=`<span class="resource-name">ECHOES</span>${Array.from({length:CFG.maxChorus},(_,i)=>`<span class="chorus-pip ${i<this.player.chorus?'full':''}"></span>`).join('')}<span class="resource-count">${this.player.chorus}/${CFG.maxChorus}</span>`;
    if(force||this.dom.chorus.dataset.v!==ch){this.dom.chorus.innerHTML=ch;this.dom.chorus.dataset.v=ch;}
    const scoreText=formatScore(this.score);if(force||this.dom.score.textContent!==scoreText)this.dom.score.textContent=scoreText;
    const comboText=this.player.lightChain>1?`LIGHT ×${this.player.lightChain}`:this.player.combo>1?`${this.player.combo}× COMBO`:'';if(force||this.dom.combo.textContent!==comboText)this.dom.combo.textContent=comboText;
    if(this.dom.flowFill){const flow=clamp(this.player.flow,0,1).toFixed(3);if(this.dom.flowFill.dataset.v!==flow){this.dom.flowFill.dataset.v=flow;this.dom.flowFill.style.transform=`scaleX(${flow})`;}}
    if(this.dom.speedState){const state=this.player.flow>.76?'BLAZING':this.player.flow>.34?'SURGING':'CRUISE';if(this.dom.speedState.textContent!==state)this.dom.speedState.textContent=state;}
    const labels=CONTROL_LABELS[input.device]||CONTROL_LABELS.keyboard;
    if(this.dom.actionCut){const cut=`${labels.attack}  CUT`;if(this.dom.actionCut.textContent!==cut)this.dom.actionCut.textContent=cut;}
    if(this.dom.actionDash){const ready=this.player.dashCooldown<=0,dash=`${labels.dash}  ${ready?'DASH':'CHARGING'}`;if(this.dom.actionDash.textContent!==dash)this.dom.actionDash.textContent=dash;this.dom.actionDash.classList.toggle('ready',ready);}
    const prompt=this.tutorialPrompt(input);if(prompt!==this.promptText){this.promptText=prompt;this.dom.prompt.textContent=prompt;this.dom.prompt.classList.toggle('show',!!prompt);}
    let objective=CHAPTERS[this.chapterIndex]?.objective||'';
    if(this.boss.phase===2){const alive=this.boss.locks.filter(e=>!e.dead).length;objective=`CUT ${alive} LOCK${alive===1?'':'S'} — ${labels.attack}`;}
    else if(this.boss.phase===3){objective=this.boss.core?.vulnerable>0?'ECHO WINDOW — KEEP CUTTING':this.player.chorus>0?`CUT THE SHIELD — ${labels.attack}`:'DASH THROUGH RED — BUILD AN ECHO';}
    else if(this.boss.phase===4)objective='LET IT RISE';
    if(this.dom.objective&&this.dom.objective.textContent!==objective)this.dom.objective.textContent=objective;
    const bossVisible=this.boss.phase>=1&&this.boss.phase<=3;
    if(force||this.dom.bossbar.dataset.visible!==String(bossVisible)){this.dom.bossbar.dataset.visible=String(bossVisible);this.dom.bossbar.classList.toggle('visible',bossVisible);this.dom.bossbar.setAttribute('aria-hidden',bossVisible?'false':'true');}
    if(bossVisible){
      const ratio=clamp(this.boss.healthRatio(),0,1).toFixed(4);
      const label=this.boss.phase===3?(this.boss.core?.vulnerable>0?'ECHO WINDOW':'SHIELD SEALED'):this.boss.label();
      if(this.dom.bossFill.dataset.r!==ratio){this.dom.bossFill.dataset.r=ratio;this.dom.bossFill.style.transform=`scaleX(${ratio})`;}
      if(this.dom.bossPhase.textContent!==label)this.dom.bossPhase.textContent=label;
      if(this.dom.bossLocks){
        const locks=this.boss.phase===2?this.boss.locks.map((e,i)=>`<span class="boss-lock ${e.dead?'cut':''}">${e.dead?'✓':i+1}</span>`).join(''):`<span class="core-state ${this.boss.core?.vulnerable>0?'open':''}">${this.boss.core?.vulnerable>0?'OPEN — ECHOES STRIKING':'SHIELD — PERFECT-DASH TO CHARGE'}</span>`;
        if(this.dom.bossLocks.dataset.v!==locks){this.dom.bossLocks.dataset.v=locks;this.dom.bossLocks.innerHTML=locks;}
      }
    }
  }

  updatePlaying(dt,input) {
    this.runTime+=dt;this.player.update(dt,input,this);
    const sec=this.track.section(this.distance);
    let target=CFG.baseSpeed+Math.min(9,this.distance*.0024)+this.player.flow*8;
    if(this.boss.phase===1)target=39+smoothstepSafe(CFG.bossStartDistance,CFG.boardDistance,this.distance)*7;
    if(this.boss.phase===2)target=27;
    if(this.boss.phase===3)target=29;
    if(this.boss.phase===4)target=48;
    this.speedImpulse=Math.max(0,this.speedImpulse-dt*38);target+=this.speedImpulse;
    this.speed=damp(this.speed,target,3.3,dt);
    this.player.speed=this.speed;this.distance+=this.speed*dt;

    this.director.update();this.boss.update(dt);this.updateEchoStrikes(dt);
    const entityCount=this.entities.length;
    for(let i=0;i<entityCount;i++)updateEntity(this.entities[i],dt,this);
    let w=0;for(let i=0;i<this.entities.length;i++){const e=this.entities[i];if(!e.remove)this.entities[w++]=e;}this.entities.length=w;
    this.updateTargeting();
    this.effects.update(dt);this.updateToast(dt);this.updateChapter();
    this.audio.setIntensity(clamp(.12+this.player.flow*.58+(this.boss.phase>=1?.22:0)+(this.boss.phase>=3?.16:0),0,1));this.audio.setPhase(this.boss.phase);
    this.updateHUD(false,input);
    if(this.boss.phase===4&&this.distance>=this.endDistance)this.beginEnding();
  }

  beginEnding() {
    if(this.state==='ending'||this.state==='results')return;
    this.state='ending';document.body.classList.remove('game-active');this.endingTimer=0;this.cinematicBars=1;this.stats.endTime=performance.now();
    this.toast('LET IT RISE',COLORS.paper,1.4);
  }

  updateEnding(dt) {
    this.endingTimer+=dt;this.distance+=this.speed*dt;this.speed=damp(this.speed,20,1.5,dt);this.player.update(dt,{axis:0,jump:false,attack:false,dash:false,jumpDown:false},this);this.effects.update(dt);this.updateToast(dt);
    if(this.endingTimer>3.5)this.showResults();
  }

  updateBoot(dt) {
    this.elapsed+=dt;this.distance=(this.distance+dt*8)%650;this.player.animTime+=dt;this.player.x=Math.sin(this.elapsed*.45)*1.3;this.player.lean=Math.sin(this.elapsed*.45)*-.12;this.effects.update(dt);
  }

  updateDying(dt) {
    this.deathTimer+=dt;this.effects.update(dt);this.updateToast(dt);if(this.deathTimer>.82)this.restartCheckpoint();
  }

  showResults() {
    this.state='results';document.body.classList.remove('game-active');this.cinematicBars=0;this.dom.hud?.classList.remove('visible');this.dom.hud?.setAttribute('aria-hidden','true');
    const final=this.finalScore();const r=RANKS.find(x=>final>=x.min)||RANKS.at(-1);
    this.score=final;this.highScore=Math.max(this.highScore,final);safeStorageSet('sundog-highscore',String(this.highScore));
    this.dom.rank.textContent=r.rank;this.dom.rank.title=r.note;this.dom.resultTitle.textContent='MORNING IS NOW PUBLIC DOMAIN';
    this.dom.stats.innerHTML=[
      ['SCORE',formatScore(final)],['RANK NOTE',r.note],['TIME',formatTime(this.runTime)],['PERFECT DODGES',this.stats.perfects],['MAX COMBO',`${this.stats.maxCombo}×`],['DAYLIGHT SHARDS',this.stats.lightShards],['BEST LIGHT CHAIN',`${this.stats.maxLightChain}×`],['HITS TAKEN',this.stats.hitsTaken],['ECHO HITS',this.stats.echoHits],['CHECKPOINTS USED',this.stats.deaths],['BEST SCORE',formatScore(this.highScore)],['BUILD',VERSION]
    ].map(([k,v])=>`<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
    setVisible(this.dom.results,true);
  }

  finalScore() {
    let s=this.score;
    s+=Math.max(0,18000-this.runTime*55);
    s+=this.stats.perfects*420;
    s+=Math.max(0,6000-this.stats.hitsTaken*1300);
    s+=this.stats.maxCombo*110;
    s-=this.stats.deaths*1200;
    return Math.max(0,Math.round(s));
  }

  async copyScore() {
    const r=RANKS.find(x=>this.score>=x.min)||RANKS.at(-1);
    const text=`SUNDOG — ${r.rank} RANK\n${formatScore(this.score)} points · ${formatTime(this.runTime)} · ${this.stats.perfects} perfect dodges\nMorning is now public domain.`;
    try{await navigator.clipboard.writeText(text);this.dom.copyScore.textContent='COPIED';setTimeout(()=>this.dom.copyScore.textContent='COPY SCORE CARD',900);}catch{this.dom.copyScore.textContent='COPY FAILED';}
  }

  tick(now=performance.now()) {
    const raw=Math.min(.05,Math.max(0,(now-this.lastFrame)/1000));this.lastFrame=now;
    this.view=this.renderer.view;this.elapsed+=raw;
    const input=this.input.sample();
    if(input.pause){if(this.state==='playing')this.pause();else if(this.state==='paused')this.resume();}
    let dt=raw;
    const hitStopped=this.effects.freeze>0;
    if(hitStopped){this.effects.freeze-=raw;dt=0;}
    if(this.state==='playing'&&dt>0)this.updatePlaying(dt,input);
    else if(this.state==='dying')this.updateDying(raw);
    else if(this.state==='ending')this.updateEnding(raw);
    else if(this.state==='boot')this.updateBoot(raw);
    else if(this.state==='paused')this.effects.update(0);
    this.renderer.render(this,raw);
    if(!hitStopped||this.state!=='playing')this.input.endFrame();
    this.raf=requestAnimationFrame(t=>this.tick(t));
  }

  startLoop() { if(!this.raf){this.lastFrame=performance.now();this.raf=requestAnimationFrame(t=>this.tick(t));} }

  installDebugAPI() {
    const self=this;
    const publicAPI=Object.freeze({version:VERSION,selfTest:()=>self.selfTest()});
    if(window.__SUNDOG_QA__!==true){window.__SUNDOG__=publicAPI;return;}
    window.__SUNDOG__={
      ...publicAPI,
      getState:()=>({state:self.state,distance:self.distance,score:self.score,health:self.player.health,chorus:self.player.chorus,bossPhase:self.boss.phase,bossHealth:self.boss.healthRatio(),locks:self.boss.locks.map(e=>({x:e.x,health:Math.max(0,e.health),maxHealth:e.maxHealth,dead:e.dead})),coreHealth:self.boss.core?Math.max(0,self.boss.core.health):null,coreMaxHealth:self.boss.core?.maxHealth??null,x:self.player.x,y:self.player.y,entities:self.entities.length,speed:self.speed,endDistance:self.endDistance,endingTimer:self.endingTimer,checkpoint:{...self.checkpoint},fps:self.renderer.fps,quality:self.renderer.quality,stats:{...self.stats}}),
      start:()=>self.startRun(),
      invincible:(v=true)=>{self.debugInvincible=!!v;return self.debugInvincible;},
      setChorus:(n=0)=>{self.player.chorus=clamp(Math.floor(Number(n)||0),0,CFG.maxChorus);return self.player.chorus;},
      skipToBoss:()=>self.startRun().then(()=>{self.distance=CFG.bossStartDistance+10;self.setCheckpoint(CFG.bossStartDistance,1,true);self.boss.resetTo(1);self.director.reset(self.distance);return true;}),
      skipToLocks:()=>self.startRun().then(()=>{self.distance=CFG.boardDistance;self.setCheckpoint(CFG.boardDistance,2,true);self.entities=[];self.boss.resetTo(2);self.director.reset(self.distance);return true;}),
      skipToCore:()=>self.startRun().then(()=>{self.distance=CFG.coreDistance;self.setCheckpoint(CFG.coreDistance,3,true);self.entities=[];self.boss.resetTo(3);self.director.reset(self.distance);self.player.chorus=3;return true;}),
      warp:(distance)=>{if(self.state!=='playing')return false;self.distance=clamp(Number(distance)||0,0,CFG.finishDistance);self.entities=[];self.director.reset(self.distance);self.updateChapter(true);return true;},
      kill:()=>{if(self.state!=='playing')return false;self.player.health=0;self.player.dead=true;self.onPlayerDeath();return true;},
      forceVictory:()=>{if(self.state!=='playing')return false;self.boss.beginDefeat();return true;},
      finishVictory:()=>{if(self.state!=='playing')return false;if(self.boss.phase<4)self.boss.beginDefeat();self.endDistance=self.distance;return true;},
    };
  }

  selfTest() {
    const errors=[];
    const assert=(cond,msg)=>{if(!cond)errors.push(msg);};
    const cam=this.track.camera(100,this.player,true);const p=this.track.project(this.track.worldPoint(120,0,0),cam,this.renderer.view);
    assert(!!p&&Number.isFinite(p.x)&&p.z>0,'Projection failed');
    assert(this.track.width(100)>5&&this.track.width(4000)>5,'Track width invalid');
    assert(CFG.maxChorus===3,'Chorus contract changed');
    assert(this.director.events.length>=20,'Stage event script incomplete');
    assert(this.director.events.every((e,i,a)=>i===0||a[i-1].trigger<=e.trigger),'Stage events unsorted');
    assert(CFG.attackWidth<4,'Attack arc crosses multiple boss-lock lanes');
    const test=spawn.drone(100,0,0);assert(test.health===2&&test.attackable,'Entity factory invalid');
    const core=spawn.core(100,0);assert(core.maxHealth>=50&&core.attackable,'Core factory invalid');
    const wave=spawn.lowWave(100,0,14,-18);assert(wave.width===14&&wave.vs===-18,'Low-wave factory argument contract invalid');
    assert(CFG.steerSpeed>=9&&CFG.steerResponse>=14,'Steering response regressed');
    assert(RANKS.every((r,i)=>i===RANKS.length-1||r.min>RANKS[i+1].min),'Rank thresholds unsorted');
    assert(this.dom.play&&this.dom.hud&&this.canvas,'Required DOM missing');
    return {ok:errors.length===0,errors,checks:12,version:VERSION};
  }
}

function smoothstepSafe(a,b,v){const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);}


/* ===== main.js ===== */

// Local preview only: expose the QA surface when explicitly requested.
if (location.hostname === 'terminal.local' && new URLSearchParams(location.search).get('qa') === '1') {
  window.__SUNDOG_QA__ = true;
}

const canvas=document.getElementById('game');
if(!canvas?.getContext) {
  document.getElementById('unsupported')?.classList.add('visible');
} else {
  const game=new Game(canvas);
  game.startLoop();
  if('serviceWorker' in navigator && location.protocol.startsWith('http') && location.hostname!=='terminal.local') {
    addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
}

