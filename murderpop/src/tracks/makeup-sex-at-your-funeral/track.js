// A4 · Makeup Sex at Your Funeral · THE MOURNER.
// One funeral, dusk to dawn to a wedding. YOU is the deceased; she is the girlfriend who turned your funeral into
// her party and her photo shoot. Her rule: every attack ends in a pose and a flash. Stay out of the picture; hit
// her while she holds the pose.
import * as THREE from 'three';
import { FuneralSet, TL } from './set.js';
import { buildMourner, Mourner, repaintFace, getKit, PEARL } from './mourner.js';
import { Shots } from './shot.js';
import { Director, Entrance } from './director.js';
import { choreograph } from './script.js';
import { Bearers, Ride, Hearses, Chapel, Decals, GROOMSMEN } from './pieces.js';
import { death } from './death.js';
import { Sounds } from './sounds.js';
import { Petals, RippleEdge } from './atmos.js';
import { heart } from './mourner.js';
import { mats as propMats, makePin, makeBouquet, tagTexture } from './props.js';

const PI = Math.PI;
const inFoot = (c, x, z, r) => {
  if (c.type === 'circle') return Math.hypot(x - c.x, z - c.z) < c.r + r;
  const ca = Math.cos(c.rot || 0), sa = Math.sin(c.rot || 0);
  const lx = (x - c.x) * ca + (z - c.z) * sa, lz = -(x - c.x) * sa + (z - c.z) * ca;
  return Math.abs(lx) < c.hx + r && Math.abs(lz) < c.hz + r;
};
const smooth = (a, b, t) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };

export default {
  id: 'makeup-sex-at-your-funeral',
  beats: 'makeup-sex-at-your-funeral',
  par: 110000,
  lastHit: 212.625,
  spawn: { player: [0, -5.0, PI / 2], boss: [10.6, 0, -PI / 2] },
  // her end: shut in your casket, at her own wedding (death.js)
  death,

  async buildArena(f) {
    const S = this.S = { f, pins: [], walls: [], spans: [] };
    S.sounds = new Sounds(f);
    const sl = S.sounds.load();
    S.set = new FuneralSet(f);
    await S.set.load();
    await sl;
    S.decals = new Decals(f);
    S.petals = new Petals(f.scene); S.edge = new RippleEdge(f.scene);
    const set = S.set;
    // what the fight sees of the world
    return {
      arena: set.arena, room: set.arena ? set.arena.room : undefined, bounds: set.bounds,
      resolve: (x, z, r) => set.resolve(x, z, r),
      update: (dt, t, ff) => set.update(dt, t, ff),
      strikeArc: (x, z, ang, range, arc, s) => set.strikeArc(x, z, ang, range, arc, s),
      dispose: () => this._dispose(),
    };
  },

  async buildBoss(f) {
    const S = this.S, set = S.set;
    const fig = await buildMourner(f);
    const b = new Mourner({ root: fig.root, rig: fig.rig, figurine: fig }, { name: 'THE MOURNER', hp: 3200, notches: [0.75, 0.5, 0.25], pieces: ['hat', 'shoulder_r', 'hand_r'] });
    b.idle = 'Idle_TalkingPhone_Loop'; b.loop('Idle_TalkingPhone_Loop'); b.faceTarget = f.player; b.clock = () => f.t;
    // she stands on what she rides: BELOVED when she sits on it, the island plinth when she's a parade float on it
    b.arena = { resolve: (x, z, r) => set.resolve(x, z, r, b.onStone ? 'beloved' : S.ride && S.ride.island ? 'island' : null) };
    if (set.arena) { set.arena.addCaster(f.player.root); set.arena.addCaster(fig.root); }
    // the people round her
    S.shots = new Shots(f, { sounds: S.sounds, cover: () => this._cover(), onPose: (s, ph) => S.D.onPose(s, ph), onFlash: (s, hit) => this._flashed(s, hit) });
    S.D = new Director(f, S);
    S.D.makeBloom();
    S.entrance = new Entrance(f, S);
    S.bearers = new Bearers(S); await S.bearers.build(getKit());
    S.ride = new Ride(S);
    S.hearses = new Hearses(S); S.hearses.build();
    S.chapel = new Chapel(S); S.chapel.makeLight();
    // the little helpers the script calls
    S.busy = (t) => S.D.spans.some((x) => t >= x.t0 - 0.05 && t <= x.t1 + 0.05);
    S.onRoad = (x, z) => f.t >= TL.road && f.t < TL.chapel && Math.abs(z) < 1.95;
    Object.defineProperty(S, 'turf', { get: () => { const c = set.floorAt(f.t).cur[1]; return c === 'cemetery'; } });
    S.streak = (x, z, a) => S.decals.streak(x, z, a);
    S.pit = (x, z) => S.decals.pit(x, z);
    S.furrow = (a, c) => S.decals.furrow(a, c);
    S.flood = () => S.decals.flood();
    S.slideTable = (from, a, speed) => { S.tableRun = { x: from.x, z: from.z, a, speed }; };
    S.shoveTable = () => { const t = set.props.table.obj; if (Math.abs(t.position.z + 1.4) < 0.9) set.drive('table', { x: t.position.x, z: -0.35 }); };
    S.glaze = () => { S.glazeT = f.beat; f.player.rig.flash(new THREE.Color(2.2, 2.2, 2.3), 0.85); S.sounds.play('glassLight', { x: f.player.x }); };
    S.casketBurst = () => { f.fx.chips(0, 0.9, -4.0, new THREE.Color(0.05, 0.04, 0.05), 40); };
    S.sunrise = () => { f.fx.flash(new THREE.Color(1.0, 0.7, 0.4), 0.25); S.sounds.play('swell', { x: 0 }); };
    // the last flash turns the world white; with her bar empty she is at the foot of the white runner when it clears
    S.whiteFlash = () => { S.whiteT = 0.01; S.whiteMove = b.state === 'desperate'; };
    S.negative = () => this._negative();
    S.outroWalk = () => this._outroWalk();
    S.weakPose = () => { S.sounds.play('pop', { x: f.boss.x, gain: 0.3, rate: 0.6 }); };
    set.extraSolids = () => this._solids();
    set.onBreak = (p, by) => { S.sounds.play(p.name.startsWith('pew') ? 'plank' : 'glassMed', { x: p.obj.position.x, gain: 0.8 }); f._good && f._good(60); };
    set.onChip = (p) => S.sounds.play('woodLight', { x: p.obj.position.x, gain: 0.5, gate: 0.06 });
    set.onWord = () => S.sounds.play('click', { x: 9.6, gain: 0.7, rate: 0.8 });
    // her events: every hit glints gold during a hold; notches; the casket she hides in jolts
    // (the glint on every hit; its glass ding at most five a second, a little lower, so a flurry doesn't turn shrill)
    b.onPoseHit = (info) => { f.fx.glitter(b.x, 1.5, b.z, new THREE.Color(3.4, 2.2, 0.6), 10, 0.4); S.sounds.play('ding', { x: b.x, gain: 0.3, rate: 1.25, gate: 0.2 }); };
    b.on('hit', (h) => this._hit(h));
    this._prewarm(f);
    return b;
  },

  // Everything the song will show is built behind the loading veil. The things made mid-song (decals, a Polaroid, the
  // pin, the bouquet, the locket) leave one hidden copy here so the game's own warm-up (main.js _warm: the scene
  // compiled into the post target, every texture uploaded; arena.js uploads every state's lightmap and key map)
  // covers their shaders. What stays here: the reflection cube, which sees only the set and none of the lights, so
  // its shaders differ, and which at load sees only the set that's in the middle (the other three sets wait 80-240 m
  // away); compiled for every set now, not at the first set change mid-song.
  _prewarm(f) {
    const S = this.S, r = f.app.renderer;
    const hold = new THREE.Group(); hold.visible = false; f.scene.add(hold); S.warm = hold;
    const add = (o) => { hold.add(o); return o; };
    const dot = () => new THREE.PlaneGeometry(0.01, 0.01);
    const M = propMats();
    for (const k of ['pewDark', 'pewWhite', 'mahogany', 'porcelain', 'velvetBlush', 'velvetPlum', 'satinWhite']) if (M[k]) add(new THREE.Mesh(dot(), M[k]));
    const d = S.decals, n0 = d.list.length;
    d.streak(0, 0, 0); d.pit(0, 0); d.furrow({ x: 0, z: 0 }, { x: 0, z: 1 }); d.flood();
    for (const e of d.list.splice(n0)) { d.g.remove(e.mesh); add(e.mesh); }
    const pic = new THREE.CanvasTexture(document.createElement('canvas'));
    add(new THREE.Mesh(dot(), new THREE.MeshStandardMaterial({ map: pic, roughness: 0.55, side: THREE.DoubleSide })));
    add(new THREE.Mesh(dot(), new THREE.MeshPhysicalMaterial({ color: 0xe0b04c, metalness: 1, roughness: 0.2, emissive: new THREE.Color(0.5, 0.33, 0.08) })));
    add(new THREE.Mesh(dot(), new THREE.MeshBasicMaterial({ map: pic })));
    add(new THREE.Mesh(dot(), new THREE.MeshBasicMaterial({ color: 0x0e0a0c })));
    add(makePin()); add(makeBouquet(false)); add(makeBouquet(true));
    add(new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTexture('heaven'), transparent: true, depthWrite: false })));
    const a = S.set.arena, prev = r.getRenderTarget();
    if (a && a.cubeRT && a.cubeCam) {
      const cc = a.cubeCam.children[0], done = new Set();
      r.setRenderTarget(a.cubeRT);
      f.scene.traverse((o) => { if (o.isMesh && o.layers.test(cc.layers) && !done.has(o.material)) { done.add(o.material); r.compile(o, cc, f.scene); } });
    }
    r.setRenderTarget(prev);
  },

  script(T, f) { choreograph(T, f, this.S.D, this.S); },

  // ---------------------------------------------------------------- the fight's hooks
  onStart(f) {
    const S = this.S;
    S.set.evaluate(0, true);
    S.entrance.begin();
    S.lastT = 0; S.snap = S.set.snapshot();
    f.boss.place(10.6, 0, -PI / 2); f.boss.setMark(10.6, 0);
  },
  onSection(f, sec) { this.S.snap = this.S.set.snapshot(); },
  // a rewind and the encore both land here (and update() catches any other jump in time). The same moment twice in
  // one frame is done once: a second resync would restart every attack that is mid-wind-up a second time.
  onRewind(f, t) { const S = this.S; if (S.syncFrame === S.frame && S.syncT === t) return; if (S.snap) S.set.restore(S.snap); this._resync(t); },
  onSpotlight(f, on) {
    const S = this.S;
    if (on) { S.shots.cancelAll(); S.D.face('fury'); S.D.act('Sword_Block', 4 * f.beat, { from: 0.1, to: 0.3 }); for (const h of S.hearses.live) h.hit = true; }   // her lanes go dark: the cars on the road drive on harmless
  },
  onBreak(f, i) {
    const S = this.S, b = f.boss, fig = b.fig;
    // a notch dissolves her pending telegraphs (set hazards keep going)
    S.D.gen = (S.D.gen || 0) + 1;
    for (const g of f.tele.list) if (g.kind !== 'gold' && !g.keep) g.dead = true;
    S.shots.cancelAll(); b.pose = null; b.backTo = null; S.D.admire = 0; S.D.scMode = 'shoulder';
    // (one layer under the game's own break: the veil's black glass, then porcelain plate for the pad and the hand)
    S.sounds.play(i === 0 ? 'glassHeavy' : 'plateHeavy', { x: b.x, gain: 0.6, delay: 0.02 });
    S.D.face('fury', 0.06);
    if (i === 0) { fig.breakPiece('veil'); repaintFace(fig, 'run'); }
    if (i === 2) { b.sober = true; this._dropFlask(); }
    b.rig && b.rig.once('Idle_Shield_Break', { duration: 2 * f.beat, from: 0, to: 0.7, then: b.idleClip });
  },
  onEmpty(f) { const S = this.S; repaintFace(f.boss.fig, 'wreck'); S.D.face('fury'); S.shots.cancelAll(); for (const g of f.tele.list) if (g.kind !== 'gold' && !g.keep) g.dead = true; },
  onFinish(f) { this._locket(); },
  onEncore(f) { this.S.encore = true; },

  update(f, dt) {
    const S = this.S; if (!S || !S.D) return;
    const b = f.boss;
    S.frame = (S.frame || 0) + 1;
    // a jump in time (a rewind, an encore, a start anywhere): put everything where the song has it. Only a jump back,
    // or a long one forward: a frame hitch is not a jump (the timeline catches up on its own, late events included)
    if (S.lastT === undefined || f.t < S.lastT - 0.05 || f.t - S.lastT > 2.0) this._resync(f.t);
    S.lastT = f.t;
    // until the doors blow open she is behind them: unseen, and nothing reaches her through a shut door
    if (f.t < TL.doors) { b.intangible = true; b.fig.root.visible = false; S.preDoors = true; }
    else if (S.preDoors) { S.preDoors = false; b.intangible = false; b.fig.root.visible = !S.chapel.inside; }
    S.entrance.update(dt);
    S.D.update(dt);
    S.shots.update(dt);
    S.bearers.update(dt); S.ride.update(dt); S.hearses.update(dt); S.chapel.update(dt); S.decals.update(dt);
    this._pins(dt); this._walls(dt); this._projectiles(dt); this._table(dt);
    // her height: on BELOVED, on the island, in the casket (a real jump of hers has her height itself, and so does
    // her death scene)
    const t = f.t;
    let y = 0;
    if (S.ride.on) y = 0.92; else if ((S.ride.island || (t >= TL.island && t < 145.9)) && Math.abs(b.x) < 2.05 && Math.abs(b.z) < 0.6) y = 0.32;
    else if (t >= 150.7 && t < 156.9 && !S.chapel.inside && Math.hypot(b.x, b.z + 4) < 0.5) y = 0.95;
    b.onStone = (t >= 62.9 && t < 65.8) || (t >= 117.0 && t < 118.6);
    if (b.onStone && Math.hypot(b.x, b.z + 4.6) < 0.9) y = 1.05;
    const jumping = b.move && b.move.arc;
    if (!b.scene && !S.kill && !jumping) b.root.position.y += (y - b.root.position.y) * Math.min(1, dt * 14);
    b.keepFacing = S.ride.on || y === 0.95;
    if (S.glazeT > 0) { S.glazeT -= dt; if (S.glazeT <= 0) f.player.rig.flash(new THREE.Color(0, 0, 0), 0); }
    // the last flash turns the world white (a white fade, never a strobe): a soft bloom of white, up in 0.14 s, held a
    // moment, then it lifts off the white chapel. With her bar empty she is moved to the runner's foot under it.
    if (S.whiteT > 0) {
      S.whiteT += dt; const w = S.whiteT;
      if (S.whiteMove && w >= 0.13) { S.whiteMove = false; b.place(0, 1.4, PI); b.setMark(0, 1.4); }
      const k = w < 0.14 ? smooth(0, 0.14, w) : w < 0.3 ? 1 : Math.max(0, 1 - (w - 0.3) / 0.8);
      f.app.post.fx.fadeColor.set(1, 0.97, 0.94); f.app.post.fx.fade = 0.7 * k;
      if (k <= 0 && w > 0.4) { S.whiteT = 0; f.app.post.fx.fade = 0; f.app.post.fx.fadeColor.set(0, 0, 0); }
    }
    // the build and dawn: the sun is low behind the graves, so their grassed mounds face you in full shadow and went
    // pitch black, the same black as an open grave. The sky's light in that shadow keeps them mounds: the shaded turf's
    // own colour, dark violet before the sun, mauve once it is up (never lighter than the turf round them)
    const mound = S.moundMat || (S.moundMat = propMats().mound);
    if (mound) {
      const on = t >= TL.burst && t < TL.wedding, k = on ? smooth(TL.burst, TL.sunrise, t) : 0;
      const key = on ? Math.round(k * 50) : -1;
      if (mound.userData.dawnKey !== key) { mound.userData.dawnKey = key; if (on) mound.emissive.setRGB(0.014 + 0.032 * k, 0.012 + 0.01 * k, 0.04 + 0.002 * k); else mound.emissive.setRGB(0, 0, 0); }
    }
    // Polaroids stay as set dressing until the next set change
    const fl = S.set.floorAt(t).cur[1]; if (S.floorWas && fl !== S.floorWas) S.shots.clearPolaroids(); S.floorWas = fl;
    // the outro, with the bar empty: she walks to the arch, poses weakly; her phone dies on the dropout
    // (her death scene takes this over from where it starts: death.js)
    if (S.outro && !b.scene && !S.kill && f.state === 'play') this._outroUpdate(dt);
    if (S.locketFly) this._locketUpdate(dt);
    this._air(dt);
    // her death scene's own things: the casket's lids, what's in the air, the pin (from its start to the fight's end)
    if (S.kill) S.kill.update(dt);
  },

  // ---------------------------------------------------------------- internals
  _resync(t) {
    const S = this.S, f = S.f, b = f.boss;
    if (S.kill) { S.kill.dispose(); S.kill = null; }      // (her death scene's things: a rewind takes them back)
    S.shots.cancelAll(); S.D.clearHands(); S.hearses.clear(); S.decals.clear();
    for (const p of S.pins) { f.scene.remove(p.pin, p.tag); } S.pins.length = 0; S.walls.length = 0;
    S.tableRun = null; S.set.override.clear(); S.whiteT = 0; S.whiteMove = false; f.app.post.fx.fade = 0;
    if (t > 0.5) S.entrance.end();
    S.bearers.reset(t); S.ride.reset(t); S.chapel.reset(t);
    S.set.evaluate(t, true);
    b.pose = null; b.backTo = null; b.dmgMul = b.dmgMul ?? 1; S.D.admire = 0; S.D.scMode = 'shoulder';
    b.sober = b.broken >= 3;
    repaintFace(b.fig, b.state === 'desperate' ? 'wreck' : b.broken >= 1 ? 'run' : 'clean');
    if (b.broken < 3) this._restoreFlask();
    this._glaze(t >= TL.negative);
    S.outro = null;
    S.petals.clear();
    S.D.resync(t, S.lastT === undefined);
    S.lastT = t; S.syncFrame = S.frame; S.syncT = t;
  },
  // rose petals through the cemetery chorus, a few under the rose moon, pouring at sunrise, white at the wedding
  _air(dt) {
    const S = this.S, f = S.f, t = f.t;
    const red = [new THREE.Color(0.75, 0.04, 0.12), new THREE.Color(1.0, 0.42, 0.55)], gold = [new THREE.Color(1.0, 0.55, 0.3), new THREE.Color(1.0, 0.75, 0.5), new THREE.Color(0.9, 0.2, 0.35)], white = [new THREE.Color(1, 0.98, 0.96), new THREE.Color(1.0, 0.8, 0.84)];
    if (t >= TL.turf && t < TL.lectern) S.petals.set(12, red);
    else if (t >= TL.road && t < TL.chapel) S.petals.set(4, red);
    else if (t >= TL.sunHigh && t < TL.wedding) S.petals.set(26, gold);
    else if (t >= TL.wedding) S.petals.set(14, white);
    else S.petals.set(0);
    S.petals.update(dt, f.cam.focus);
    S.edge.set(S.set.ripple && S.set.ripple.from !== S.set.ripple.to ? S.set.ripple : null);
  },
  _cover() {
    const S = this.S, out = S.set.cover();
    const bf = S.bearers.footprint; if (bf) out.push(bf);
    for (const h of S.hearses.footprints()) out.push(h);
    for (const p of S.pins) if (S.f.t >= p.t1 && S.f.t < p.tGone) out.push({ type: 'circle', x: p.x, z: p.z, r: 0.55, name: 'pin' });
    return out;
  },
  _solids() {
    const S = this.S, f = S.f, out = [];
    for (const h of S.D.handsLive()) out.push({ type: 'circle', x: h.x, z: h.z, r: 0.35 });
    for (const p of S.pins) if (f.t >= p.t1 && f.t < p.tGone) out.push({ type: 'circle', x: p.x, z: p.z, r: 0.55 });
    // the viewing room's fixed pieces (the catafalque, the candelabras, the wreaths, your portrait)
    if (f.t < TL.turf && S.set.baked) { out.push({ type: 'box', x: 0, z: -5.0, hx: 1.3, hz: 0.5, rot: 0 }); for (const x of [-2, 2]) out.push({ type: 'circle', x, z: -5.2, r: 0.3 }); for (const x of [-3.4, 3.4]) out.push({ type: 'circle', x, z: -5.9, r: 0.45 }); }
    if (f.t >= TL.chapel && f.t < TL.burst && S.set.baked) for (const x of [-2, 2]) out.push({ type: 'circle', x, z: -4.4, r: 0.3 });
    // the wedding: the chapel's bier is the altar under the rose arch (nobody walks through it), its candelabras, the arch's feet
    if (f.t >= TL.wedding && S.set.baked) {
      out.push({ type: 'box', x: 0, z: -4.0, hx: 1.15, hz: 0.36, rot: 0, name: 'altar' });
      for (const x of [-2, 2]) out.push({ type: 'circle', x, z: -4.4, r: 0.3 });
      for (const x of [-1.5, 1.5]) out.push({ type: 'circle', x, z: -4.6, r: 0.24 });
    }
    // and her six groomsmen along the back wall, whatever the set is drawn with
    if (f.t >= TL.wedding && S.bearers && S.bearers.men.length) for (const [x, z] of GROOMSMEN) out.push({ type: 'circle', x, z, r: 0.3, name: 'groomsman' });
    return out;
  },
  // her projectiles stop on cover; DISSOLVING pills split; a whole pill caught goes back double
  _projectiles(dt) {
    const S = this.S, f = S.f, cover = this._cover();
    for (const p of f.proj.list) {
      if (p.dead) continue;
      if (p.owner === 'player') { if (p.splitAt && !p._doubled) { p._doubled = true; p.dmgBack = (p.dmgBack || 15) * 2; } continue; }
      if (p.owner !== 'boss') continue;
      if (p.splitAt && f.t >= p.splitAt && !p._split) {
        p._split = true; p.dead = true;
        for (const s of [-1, 1]) { const q = f.proj.spawn({ x: p.x, z: p.z, y: p.y, angle: p.angle + s * 12 * PI / 180, speed: p.speed, kind: 'pink', shape: 'pill', size: p.size * 0.8, spin: 8, life: 3 }); }
        S.sounds.play('tick', { x: p.x, gain: 0.4, gate: 0.05 });
        continue;
      }
      if (p.age < 0.08) continue;
      for (const c of cover) if (inFoot(c, p.x, p.z, p.radius * 0.6)) { p.dead = true; f.fx.sparks(p.x, p.y, p.z, new THREE.Color(1.6, 1.4, 1.5), 5); break; }
    }
  },
  // the kicked embalming table slides to the wall and stays there as cover
  _table(dt) {
    const S = this.S, run = S.tableRun; if (!run) return;
    const f = S.f, b = f.bounds;
    const nx = run.x + Math.sin(run.a) * run.speed * dt, nz = run.z + Math.cos(run.a) * run.speed * dt;
    if (nx < b.minX + 1.2 || nx > b.maxX - 1.2 || nz < b.minZ + 0.5 || nz > b.maxZ - 0.5) { S.tableRun = null; S.sounds.play('metalHeavy', { x: run.x, gain: 0.8 }); f.cam.shake(0.4, 0.12); return; }
    run.x = nx; run.z = nz;
    S.set.drive('table', { x: nx, z: nz, rotY: run.a + PI / 2 });
  },
  _pins(dt) {
    const S = this.S, f = S.f;
    for (let i = S.pins.length - 1; i >= 0; i--) {
      const p = S.pins[i], t = f.t;
      if (t >= p.tGone) { f.fx.chips(p.x, 1.5, p.z, new THREE.Color(2.6, 0.2, 0.3), 40); f.fx.glitter(p.x, 1.8, p.z, new THREE.Color(3, 2.5, 2.5), 30, 1); S.sounds.play('glassHeavy', { x: p.x, gain: 0.7 }); f.scene.remove(p.pin, p.tag); S.pins.splice(i, 1); continue; }
      let y = 6 + Math.sin(t * 3) * 0.15;
      if (t >= p.t1 - 0.15) y = Math.max(0, 6 * (1 - (t - (p.t1 - 0.15)) / 0.15));
      if (t >= p.t1) y = 0;
      p.pin.position.set(p.x, y, p.z); p.pin.rotation.y = t < p.t1 ? t * 1.5 : p.pin.rotation.y;
      p.tag.visible = t >= p.t1;
      if (p.tag.visible) { const pop = Math.min(1, (t - p.t1) / 0.12); p.tag.position.set(p.x, 3.15, p.z); p.tag.scale.set(2.2 * pop, 0.69 * pop, 1); }
    }
  },
  // THREE THOUSAND LIKES: catch a heart and its two neighbours scoot aside
  _walls(dt) {
    const S = this.S;
    for (const w of S.walls) for (const p of w.list) {
      if (p.owner !== 'player' || p._scoot) continue;
      p._scoot = true;
      const px = Math.cos(w.a), pz = -Math.sin(w.a);
      for (const q of w.list) { if (q === p || q.owner !== 'boss' || Math.abs(q.k - p.k) !== 1) continue; const s = Math.sign(q.k - p.k); q.x += px * s * 1.1; q.z += pz * s * 1.1; }
    }
  },
  _flashed(s, hit) {
    const S = this.S;
    if (hit === 'blurred') { S.D.face('fury'); S.sounds.play('smear', { x: s.ax }); }
  },
  _hit(h) {
    const S = this.S, f = S.f, b = f.boss;
    // (the casket she hides in jolts under your blows; its knock is quiet: the 3 a.m. music is the quietest in the song)
    if (S.chapel.inside) { S.set.drive('casket', { lift: 0.06 }); f.after(0.08, () => S.set.drive('casket', { lift: 0 })); S.sounds.play('woodHeavy', { x: b.x, gain: 0.3, gate: 0.15 }); f.fx.chips(b.x, 1.0, b.z, new THREE.Color(0.2, 0.12, 0.1), 8); }
    // YOUR MOVE: across the fade and the silence, a blow that lands becomes the finish (bigger, gold, a bonus)
    if (b.state === 'desperate' && f.t >= 211.964 && f.t < 212.625 && !S.yourMove) { S.yourMove = true; f.score += 3000 * f.mult; f.fx.glitter(b.x, 1.6, b.z, new THREE.Color(3.6, 2.4, 0.6), 60, 1.2); }
  },
  // notch 3: her right hand breaks off at the wrist; the flask clatters to the floor and stays there
  _dropFlask() {
    const S = this.S, f = S.f, fig = f.boss.fig, h = fig.props.flask; if (!h || h.userData.dropped) return;
    h.userData.home = h.parent; h.userData.dropped = true;
    const w = new THREE.Vector3(); h.getWorldPosition(w);
    f.scene.attach(h);
    const ring = fig.props.ring; if (ring) ring.visible = false;
    const t0 = f.t, y0 = w.y, x = w.x, z = w.z;
    const step = () => { const k = Math.min(1, (f.t - t0) / 0.45); h.position.set(x + k * 0.4, Math.max(0.05, y0 * (1 - k * k)), z + k * 0.2); h.rotation.set(k * 1.6, k * 2, PI / 2 * k); if (k < 1) f.after(0.016, step); else S.sounds.play('metalLight', { x, gain: 0.6 }); };
    step();
  },
  _restoreFlask() {
    const fig = this.S.f.boss.fig, h = fig.props.flask; if (!h || !h.userData.dropped) return;
    h.userData.dropped = false; h.userData.home.attach(h);
    const ws = h.parent.getWorldScale(new THREE.Vector3()).x || 1; h.scale.setScalar(1 / ws);
    h.position.set(0, 0.08 / ws, 0.03 / ws); h.rotation.set(0, PI / 2, 0);
    if (fig.props.ring) fig.props.ring.visible = true;
  },
  // the band drops out: a photo-negative flip, and her black glaze turns pearl white
  _negative() { const S = this.S; S.f.fx.flash(new THREE.Color(0.8, 0.8, 0.85), 0.35); this._glaze(true); },
  _glaze(white) {
    const S = this.S, fig = S.f.boss.fig; if (!fig || S.white === white) return;
    S.white = white;
    const U = fig.bodyU.fLayCol.value;
    if (!S.layCols) S.layCols = U.map((v) => v.clone());
    const pearl = new THREE.Color(PEARL);
    U.forEach((v, i) => { const o = S.layCols[i]; if (white) v.set(pearl.r * 0.95, pearl.g * 0.93, pearl.b * 0.92, o.w); else v.copy(o); });
    for (const a of fig.acc) for (const o of a.objects) o.traverse((m) => { if (!m.isMesh || !m.material || !m.material.color || m.material.userData.figMake?.opts?.goldTint) return; if (!m.material.userData.origColor) m.material.userData.origColor = m.material.color.clone(); if (white) m.material.color.copy(pearl).multiplyScalar(0.92); else m.material.color.copy(m.material.userData.origColor); });
  },
  // the outro with the bar empty: up the white runner to the arch, limping, the glowing locket to her lips
  _outroWalk() { const S = this.S, b = S.f.boss; if (b.state !== 'desperate' || b.scene || S.kill) return; S.outro = { t: 0 }; S.D.free(); b.moveTo(0, -2.4, 3.8, { easing: 'inOut' }); b.setMark(0, -2.4); },
  _outroUpdate(dt) {
    const S = this.S, f = S.f, b = f.boss, t = f.t, fig = b.fig;
    if (t >= 204.724 && !S.outro.posed) { S.outro.posed = true; S.D.act('Spell_Simple_Shoot', 0.3); S.sounds.play('pop', { x: b.x, gain: 0.25, rate: 0.5 }); S.shots.ledK = 0.2; }
    if (t >= 205.6 && !S.outro.on) { S.outro.on = true; b.moveTo(0, -3.15, 2.9, { easing: 'inOut' }); b.setMark(0, -3.15); }
    if (t >= 208.651 && !S.outro.bride) { S.outro.bride = true; b.omega = 6; b.faceTarget = f.player; S.D.hold('Walk_Formal_Loop', 0.25, 214); S.D.face('pout'); }
    if (t >= 210.74 && !S.outro.dead) { S.outro.dead = true; fig.props.scrMat.color.setRGB(0, 0, 0); }
    if (fig.props.locketMat) { const g = 0.4 + 0.6 * Math.abs(Math.sin(t * 2)); fig.props.locketMat.emissive.setRGB(0.6 * g, 0.42 * g, 0.12 * g); }
  },
  // the finish: the locket flies up out of the pieces and pops open, the ash pours out and drifts down; it lands
  // where you stood, open: the last photo she took of you on the left (an empty frame if she never got one), the ash
  // under glass on the right. Big and glowing enough to read among the shards from the game camera.
  _locket() {
    const S = this.S, f = S.f, b = f.boss, s = 1.7;
    const g = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xe0b04c, metalness: 1, roughness: 0.2, emissive: new THREE.Color(0.9, 0.6, 0.15) });
    const L = new THREE.Group(), R = new THREE.Group();
    L.add(new THREE.Mesh(heart(0.11 * s, 0.025 * s), mat)); R.add(new THREE.Mesh(heart(0.11 * s, 0.025 * s), mat));
    const inside = (m) => { const o = new THREE.Mesh(new THREE.CircleGeometry(0.07 * s, 28), m); o.position.set(0, 0.01 * s, 0.031 * s); return o; };
    if (S.shots.lastPhoto) { const tx = new THREE.CanvasTexture(S.shots.lastPhoto); tx.colorSpace = THREE.SRGBColorSpace; L.add(inside(new THREE.MeshBasicMaterial({ map: tx }))); }
    else L.add(inside(new THREE.MeshBasicMaterial({ color: 0x0e0a0c })));
    R.add(inside(new THREE.MeshBasicMaterial({ color: 0x8a8580 })));
    R.rotation.y = PI;            // closed: the two halves face to face
    g.add(L, R);
    const glow = new THREE.Sprite(S.D.bloom.material.clone()); glow.material.color.setRGB(2.4, 1.6, 0.5); glow.material.opacity = 0.75; glow.scale.setScalar(1.0); g.add(glow);
    g.position.set(b.x, 1.55, b.z); f.scene.add(g);
    S.locketFly = { g, L, R, glow, from: g.position.clone(), to: new THREE.Vector3(f.player.x + 0.5, 0.06, f.player.z + 0.4) };
    S.sounds.play('latch', { x: b.x, delay: 0.5 });
  },
  _locketUpdate(dt) {
    // its own clock: the song's stops when she breaks
    const S = this.S, f = S.f, L = S.locketFly; L.k = (L.k || 0) + dt; const k = L.k;
    const up = Math.min(1, k / 0.55);
    if (k < 0.55) L.g.position.set(L.from.x, L.from.y + 2.2 * (1 - (1 - up) * (1 - up)), L.from.z);
    else { const d = Math.min(1, (k - 0.55) / 0.5); L.g.position.lerpVectors(new THREE.Vector3(L.from.x, L.from.y + 2.2, L.from.z), L.to, d * d); if (d >= 1 && !L.landed) { L.landed = true; L.yaw = L.g.rotation.y; S.sounds.play('metalLight', { x: L.to.x, gain: 0.5, rate: 1.6 }); } }
    // it pops open at the top like a book: the halves part and turn to face the same way
    const open = smooth(0.35, 0.65, k);
    L.L.position.x = -0.1 * 1.7 * open; L.R.position.x = 0.1 * 1.7 * open; L.R.rotation.y = PI * (1 - open);
    if (!L.landed) { L.g.rotation.set(0, k * 3, 0); }
    else L.g.rotation.set(-PI / 2 + 0.12, 0, L.yaw, 'XYZ');
    L.glow.material.opacity = L.landed ? 0.35 + 0.15 * Math.sin(k * 4) : 0.75; L.glow.scale.setScalar(L.landed ? 0.7 : 1.0);
    if (k > 0.5 && k < 1.6 && Math.random() < 0.6) f.fx.glitter(L.g.position.x, L.g.position.y, L.g.position.z, new THREE.Color(0.7, 0.68, 0.66), 3, 0.2);
  },
  _dispose() {
    const S = this.S; if (!S) return;
    if (S.kill) { S.kill.dispose(); S.kill = null; }
    S.shots && S.shots.dispose(); S.D && S.D.dispose(); S.decals && S.decals.dispose(); S.set && S.set.dispose();
    S.petals && S.petals.dispose(S.f.scene); S.edge && S.edge.dispose(S.f.scene);
    for (const p of S.pins) S.f.scene.remove(p.pin, p.tag);
    if (S.bearers) { for (const m of S.bearers.men) S.f.scene.remove(m.rig.root); if (S.bearers.director) S.f.scene.remove(S.bearers.director.root); }
    if (S.hearses) for (const h of S.hearses.pool) S.f.scene.remove(h);
    if (S.locketFly) S.f.scene.remove(S.locketFly.g);
    if (S.chapel && S.chapel.torchLight) S.f.scene.remove(S.chapel.torchLight, S.chapel.torchLight.target);
    if (S.warm) S.f.scene.remove(S.warm);
    const fx = S.f.app.post.fx; fx.fade = 0; fx.fadeColor.set(0, 0, 0); fx.saturation = 1;
    this.S = null;
  },
};
