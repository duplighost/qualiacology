// MURDERPOP. Boot, the screens (title → the record → a fight → results), and the frame loop.
// URL options (for Alex and for tests): ?track=<id> straight into a fight, ?at=<seconds> start there,
// ?auto=1|bad the bot plays, ?capture=1 a hand-stepped clock (window.__step(dt)), ?mute, ?all (everything unlocked)
import * as THREE from 'three';
import { Post } from './engine/post.js';
import { Input } from './engine/input.js';
import { Audio } from './engine/audio.js';
import { SfxLite } from './engine/sfx-lite.js';
import { ArenaCamera } from './game/camera.js';
import { HUD } from './ui/hud.js';
import { FX } from './fx/fx.js';
import { loadHeroine } from './game/heroine.js';
import { Player } from './game/player.js';
import { Fight } from './game/fight.js';
import { Walk, WalkBot } from './game/walk.js';
import { TRACKS, trackById } from './tracks/index.js';
import { Autopilot } from './game/autopilot.js';
import { RecordMenu } from './ui/record.js';
import { Screens } from './ui/screens.js';
import { MenuDOM, loadProgress, saveProgress, better } from './ui/menu.js';

const Q = new URLSearchParams(location.search);

class App {
  async boot() {
    const canvas = document.getElementById('view');
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false, powerPreference: 'high-performance' });
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07040a);
    this.post = new Post(r);
    this.cam = new ArenaCamera(innerWidth / innerHeight);
    this.input = new Input(canvas);
    this.audio = new Audio();
    this.sfx = await this._sounds();
    this.hud = new HUD(document.getElementById('hud'));
    this.fx = new FX(this.scene, this.post, this.cam);
    this.screens = new Screens(document.getElementById('screens'), this);
    this.menuDom = new MenuDOM(document.getElementById('menu'), this);
    this.record = new RecordMenu(this);
    this.progress = loadProgress();
    this.settings = { music: 1, sfx: 1, calm: false };
    try { Object.assign(this.settings, JSON.parse(localStorage.getItem('mp-settings') || '{}')); } catch (e) { /* fine */ }
    this.audio.setVolumes(this.settings.music, this.settings.sfx);
    this.record.encore = !!(this.settings.encore && this.progress.encore);
    this.resize(); addEventListener('resize', () => this.resize());
    this.reticle = document.getElementById('reticle');
    addEventListener('mousemove', (e) => { this.reticle.style.left = e.clientX + 'px'; this.reticle.style.top = e.clientY + 'px'; });
    addEventListener('keydown', (e) => this.key(e));
    addEventListener('mousedown', () => { this.audio.resume(); if (this.screen === 'title') this.toRecord(); });
    this.input.onBlur = () => { if (this.screen === 'fight' && this.fight && this.fight.state === 'play') this.pause(true); };
    this.capture = Q.has('capture');
    if (Q.has('mute')) this.audio.setVolumes(0, 0);
    this.screens.onAction = (a) => this.action(a);
    this.screens.onSetting = (k, v) => { this.settings[k] = v; try { localStorage.setItem('mp-settings', JSON.stringify(this.settings)); } catch (e) { /* fine */ } this.audio.setVolumes(this.settings.music, this.settings.sfx); };
    this.menuDom.onHover = (i) => this.menuHover(i);
    this.menuDom.onPick = (i) => this.menuPick(i);
    this.menuDom.onSide = (s) => this.setSide(s);
    this.menuDom.onEncore = () => { this.settings.encore = !this.settings.encore; try { localStorage.setItem('mp-settings', JSON.stringify(this.settings)); } catch (e) { /* fine */ } this.sfx.ui && this.sfx.ui('select'); this.record.encore = this.settings.encore; this.setSide(this.side || 'A'); };
    this.screens.veil(true, 'MURDERPOP', 0.1);
    // YOU, loaded once
    this.heroine = await loadHeroine('assets/characters/heroine.glb', 'assets/characters/anims.glb', (k) => this.screens.veil(true, 'MURDERPOP', 0.1 + k * 0.8));
    this.player = new Player(this.heroine, this.scene);
    this.record.setHeroine(this.heroine);
    this.last = performance.now();
    window.__MP = this;
    // the stepped clock (tests): __step(dt, quiet) advances the game dt seconds; quiet skips drawing the frame
    if (this.capture) window.__step = (dt, quiet) => this.frame(this.last + dt * 1000, dt, quiet);
    else { const tick = (now) => { requestAnimationFrame(tick); this.frame(now); }; requestAnimationFrame(tick); }
    await document.fonts.ready;
    this.screens.veil(false);
    if (Q.get('track')) await this.playTrack(Q.get('track'), +(Q.get('at') || 0));
    else if (Q.has('menu')) this.toRecord();
    else this.toTitle();
    window.__ready = true;
  }

  async _sounds() {
    // the full library, through the bridge the game calls; the lite set if it can't load in time (or ?sfx=lite)
    if (Q.get('sfx') !== 'lite') {
      try {
        const [{ Sfx }, { SfxBridge }] = await Promise.all([import('./engine/sfx.js'), import('./engine/sfx-bridge.js')]);
        const lib = new Sfx(this.audio);
        await Promise.race([lib.load(), new Promise((_, rej) => setTimeout(() => rej(new Error('sound library took too long')), 10000))]);
        return new SfxBridge(lib);
      } catch (e) { console.warn('sound library not ready, using the lite set:', e.message); }
    }
    return new SfxLite(this.audio);
  }

  resize() {
    const w = innerWidth, h = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.post.setSize(Math.round(w * dpr), Math.round(h * dpr));
    this.cam.setAspect(w / h);
    this.record && this.record.setAspect(w / h);
  }

  // ---------------- screens ----------------
  toTitle() { this.screen = 'title'; this.menuDom.mode('title'); this.hud.show(false); this.record.hoverTo(-1); this.sfx.ambience && this.sfx.ambience(true); }
  toRecord() {
    if (this.screen === 'record') return;
    this.screen = 'record'; this.menuDom.mode('record'); this.hud.show(false); this.record.rest();
    this.sfx.ui && this.sfx.ui('spin'); this.sfx.ambience && this.sfx.ambience(true);
    this.setSide(this.side || 'A');
  }
  sideTracks(s) { return TRACKS.filter((t) => (s === 'A' ? t.side === 'A' : t.side === 'B' || t.side === 'Bonus' || (t.side === 'Credits' && this.unlocked(t)))); }
  unlocked(t) {
    if (Q.has('all') || t.side === 'dev') return true;
    if (t.side === 'Credits') return !!this.progress.won['ptsdream-girl'] || !!this.progress.won[t.id];
    const order = TRACKS.filter((x) => x.side !== 'dev' && x.side !== 'Credits');
    const i = order.indexOf(t);
    if (t.side === 'Bonus') return order.filter((x) => x.side !== 'Bonus').every((x) => this.progress.won[x.id]);
    return i <= 0 || !!this.progress.won[order[i - 1].id] || !!this.progress.won[t.id];
  }
  setSide(s) {
    this.side = s;
    const tr = this.sideTracks(s);
    this.record.setTracks(s, tr, new Set(Object.keys(this.progress.won)));
    this.menuDom.setSide(s, tr, this.progress, (t) => this.unlocked(t));
    this.menuDom.encore(!!this.progress.encore, this.settings.encore);
    this.sel = Math.max(0, tr.findIndex((t) => this.unlocked(t) && !this.progress.won[t.id]));
    this.menuHover(this.sel);
  }
  menuHover(i) {
    const tr = this.sideTracks(this.side);
    if (i < 0 || i >= tr.length) return;
    if (i !== this.sel) this.sfx.ui && this.sfx.ui('hover');
    this.sel = i; this.record.hoverTo(i); this.menuDom.highlight(i);
  }
  async menuPick(i) {
    const t = this.sideTracks(this.side)[i];
    if (!t || !this.unlocked(t)) return;
    this.sfx.ui && this.sfx.ui('needle');
    this.record.drop();
    await new Promise((r) => setTimeout(r, 450));
    await this.playTrack(t.id);
  }

  pause(on) {
    if (!this.fight) return;
    this.fight.pause(on);
    const id = this.fight.track.id, won = !!this.progress.won[id] || Q.has('all');
    this.screens.pause(on, trackById(id).title, won && this.fight.kind !== 'walk' && this.fight.T ? this.fight.T.sections : null);
    this.hud.show(!on && this.fight.kind !== 'walk');
  }
  practice(i) {
    const f = this.fight; if (!f || !f.T || !f.T.sections[i]) return;
    const id = f.track.id, t = f.T.sections[i].t0;
    this.screens.pause(false); this.playTrack(id, t);
  }

  action(a) {
    if (a.startsWith('from:')) { this.practice(+a.slice(5)); return; }
    if (a === 'resume') this.pause(false);
    else if (a === 'restart' || a === 'again') { this.screens.pause(false); this.screens.results(false); this.playTrack(this.fight ? this.fight.track.id : this.lastTrack); }
    else if (a === 'record') { this.screens.pause(false); this.screens.results(false); this.endFight(); this.toRecord(); }
    else if (a === 'next') {
      this.screens.results(false);
      const order = TRACKS.filter((x) => x.side !== 'dev' && x.side !== 'Credits');
      const i = order.findIndex((x) => x.id === this.lastTrack);
      // the finale runs out into the credits the first time
      const nx = this.lastTrack === 'ptsdream-girl' && !this.progress.won['grocery-store-at-2-am'] ? trackById('grocery-store-at-2-am') : order[i + 1];
      if (nx && this.unlocked(nx)) this.playTrack(nx.id); else { this.endFight(); this.toRecord(); }
    }
  }

  key(e) {
    this.audio.resume();
    if (e.code === 'KeyF') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); return; }
    if (e.code === 'KeyM' && this.screen !== 'results' && !(this.fight && this.fight.state === 'paused')) { this.muted = !this.muted; this.audio.setVolumes(this.muted ? 0 : this.settings.music, this.muted ? 0 : this.settings.sfx); return; }
    if (this.screen === 'title') { this.toRecord(); return; }
    if (this.screen === 'record') {
      const tr = this.sideTracks(this.side);
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.menuHover(Math.min(tr.length - 1, this.sel + 1));
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.menuHover(Math.max(0, this.sel - 1));
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Tab') { e.preventDefault(); this.setSide(this.side === 'A' ? 'B' : 'A'); }
      if (e.code === 'Enter' || e.code === 'Space') this.menuPick(this.sel);
      if (e.code === 'Escape') this.toTitle();
      return;
    }
    if (this.screen === 'fight' && this.fight) {
      if (e.code === 'Escape') this.pause(this.fight.state !== 'paused');
      else if (this.fight.state === 'paused') {
        if (e.code === 'KeyR') this.action('restart'); if (e.code === 'KeyM') this.action('record');
        const d = /^Digit([1-9])$/.exec(e.code); if (d && (this.progress.won[this.fight.track.id] || Q.has('all'))) this.practice(+d[1] - 1);
      }
      return;
    }
    if (this.screen === 'results') {
      if (e.code === 'Enter') this.action('next');
      if (e.code === 'KeyR') this.action('again');
      if (e.code === 'Escape') this.action('record');
    }
  }

  async playTrack(id, at = 0) {
    this.endFight();
    this.sfx.ambience && this.sfx.ambience(false);
    const meta = trackById(id);
    this.lastTrack = meta.id;
    this.screen = 'loading'; this.menuDom.mode('hidden');
    this.screens.veil(true, meta.title, 0);
    let fight;
    try {
      const mod = await meta.load();
      fight = mod.default.kind === 'walk' ? new Walk(this, mod.default) : new Fight(this, mod.default);
      fight.manual = this.capture;
      await fight.load((k) => this.screens.veil(true, meta.title, k));
    } catch (e) {
      // a song that can't load never leaves you on the loading bar: say so, then back to the record
      console.error('could not load', meta.id, e);
      try { fight && fight.dispose && fight.dispose(); } catch (e2) { /* half-built */ }
      this.fight = null;
      this.screens.veil(true, `${meta.title} didn't load`, 0);
      setTimeout(() => { this.screens.veil(false); this.toRecord(); }, 2200);
      return;
    }
    const mod = { default: fight.track };
    if (Q.has('auto') && fight.kind === 'walk' && mod.default.tour) { this.auto = new WalkBot(fight, mod.default.tour); fight.input = this.auto; }
    // the bots: 1 (good: times its strikes, catches on the beat), mash (as good, but strikes whenever), bad
    const BOTS = { bad: { react: 0.3, jitter: 0.12, miss: 0.35, greed: 0.6, rhythm: 0 }, mash: { rhythm: 0 } };
    if (Q.has('auto') && fight.kind !== 'walk') { this.auto = new Autopilot(fight, BOTS[Q.get('auto')] || {}); fight.input = this.auto; }
    this.fight = fight;
    fight.resultCb = (r) => this.results(r, meta);
    await this._warm();
    await this.audio.resume();
    this.screens.veil(false);
    this.screen = 'fight';
    fight.start(at);
  }
  // warm every shader before the first frame of play: compiled for what the game really draws into (the linear
  // HDR buffer, not the screen, so nothing compiles again on the first frame), and every texture uploaded,
  // hidden things included
  async _warm() {
    const r = this.renderer, prev = r.getRenderTarget();
    r.setRenderTarget(this.post.target);
    try { if (r.compileAsync) { const job = r.compileAsync(this.scene, this.cam.cam); r.setRenderTarget(prev); await job; } else r.compile(this.scene, this.cam.cam); }
    catch (e) { console.warn('warm', e.message); }
    r.setRenderTarget(prev);
    // one frame of everything, hidden things too, through the real passes (shadow maps included): the shader
    // variants compile now. Lights hidden now stay hidden (the number of lights picks the variant)
    try {
      const vis = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
      const darkLights = []; this.scene.traverse((o) => { if (o.isLight && !vis(o)) darkLights.push(o); });
      const shown = []; this.scene.traverse((o) => { if (!o.visible && !o.isLight) { shown.push(o); o.visible = true; } });
      const lightsWere = darkLights.map((l) => l.visible); for (const l of darkLights) l.visible = false;
      r.shadowMap.needsUpdate = true;
      const rt = this._warmRT ||= new THREE.WebGLRenderTarget(64, 36, { type: THREE.HalfFloatType });
      r.setRenderTarget(rt); r.render(this.scene, this.cam.cam); r.setRenderTarget(prev);
      for (const o of shown) o.visible = false;
      darkLights.forEach((l, i) => { l.visible = lightsWere[i]; });
      // and the arena's own passes (its shadow casters, the mirror floor) and the picture's (bloom, the grade), once,
      // behind the veil: otherwise they compile on the first frame of the song, right on the downbeat
      const A = this.fight && this.fight.arena && (this.fight.arena.arena || this.fight.arena);
      if (A && A.update && A._renderCasters) A.update(0, this.cam.cam);
      this.post.render(this.scene, this.cam.cam, 0);
    } catch (e) { console.warn('warm frame', e.message); r.setRenderTarget(prev); }
    const seen = new Set(), up = (v) => { if (v && v.isTexture && !seen.has(v) && v.image && !v.isRenderTargetTexture) { seen.add(v); try { r.initTexture(v); } catch (e) { /* on first use */ } } };
    this.scene.traverse((o) => {
      if (!o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        for (const k in m) up(m[k]);
        if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (Array.isArray(v)) v.forEach(up); else up(v); }
      }
    });
  }
  endFight() { if (this.fight) { this.fight.dispose(); this.fight = null; } this.auto = null; }
  // the encore is unlocked: Back by Popular Demand comes up on the record
  async encoreSong() {
    try {
      const bm = await fetch('data/beats/back-by-popular-demand.json').then((r) => r.json());
      const buf = await this.audio.loadSong('assets/music/back-by-popular-demand', bm.duration);
      if (this.screen === 'record' || this.screen === 'title') { await this.audio.resume(); this.audio.play(buf, 0, 2.5); }
    } catch (e) { console.warn('encore song', e.message); }
  }

  results(r, meta) {
    if (r.walk) {
      // the credits end on a hard cut; the record runs out
      const first = !this.progress.won[meta.id];
      this.progress.won[meta.id] = this.progress.won[meta.id] || 'S'; this.progress.encore = true; saveProgress(this.progress);
      this.endFight(); this.side = 'B';
      this.screen = 'record'; this.menuDom.mode('hidden'); this.hud.show(false);
      this.setSide('B');
      this.record.runout(); this._menuFade = 1;
      this.record.onRunoutDone = () => { this.menuDom.mode('record'); if (first) this.encoreSong(); };
      return;
    }
    this.screen = 'results';
    if (r.won) {
      const p = this.progress;
      if (!p.won[meta.id] || better(r.grade, p.won[meta.id])) p.won[meta.id] = r.grade;
      p.best[meta.id] = Math.max(p.best[meta.id] || 0, r.score);
      saveProgress(p);
    }
    this.screens.results(true, r, meta);
    this.sfx.applause && this.sfx.applause({ S: 1, A: 0.8, B: 0.6, C: 0.4, D: 0.2 }[r.grade] || 0.3);
  }

  frame(now, dtFixed, quiet = false) {
    const dt = dtFixed ?? Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.sfx.update && this.sfx.update();
    if (this.screen === 'title' || this.screen === 'record') {
      if (this._menuFade > 0) { this._menuFade = Math.max(0, this._menuFade - dt / 1.4); this.post.fx.fade = this._menuFade * this._menuFade; } else if (this.post.fx.fade > 0 && !this.fight) this.post.fx.fade = 0;
      this.record.update(dt, now / 1000);
      if (!quiet) this.record.render(this.renderer, this.post, now / 1000);
      return;
    }
    if (this.fight) {
      if (this.capture) this.fight.stepManual(dt);
      if (this.auto) this.auto.think();
      this.fight.update(now, dt);
      if (this.settings.calm) { this.post.fx.flash.multiplyScalar(0.3); this.cam.shakeA *= 0.3; }
    }
    if (!quiet && !(this.fight && this.fight.skipRender)) this.post.render(this.scene, this.cam.cam, now / 1000);
  }
}

new App().boot().catch((e) => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f88;position:fixed;top:0;left:0;z-index:99">${e.stack || e}</pre>`); });
