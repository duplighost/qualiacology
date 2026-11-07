// A1: SEXY TRAUMA COSTUME. THE CLERK, in the back room of a Halloween pop-up, "where the real scary costumes live".
// The rule: she sings what it is right before it lands. Hear the name, catch it, and send it back. Her packages are
// pink, and a caught package never opens: it goes back to her gold. In the final chorus some come white, FINAL SALE.
// The set (tools/arena/arenas/sexy-trauma-costume.py) is baked in six lighting states; everything that moves is
// real time (room.js) and is put back by setStateAt(t) on every rewind.
import * as THREE from 'three';
import { CharacterKit } from '../../engine/character.js';
import { buildFigurine } from '../../game/figurine.js';
import { Boss } from '../../game/boss.js';
import { Arena } from '../../game/arena.js';
import { liteArena } from '../../game/arena-lite.js';
import { SPEC, PIECES, Clerk } from './clerk.js';
import { Room } from './room.js';
import { script, SEC } from './script.js';
import { U } from './moves.js';

let kit = null;
const ID = 'sexy-trauma-costume';
// the song's clock stops on the finish; the room plays the last second out (house lights, applause) on the finish's own
// real-time clock until the results come up
const roomT = (f) => (f.state === 'finishing' && f._finishT !== undefined ? f.t + f._finishT : f.t);
const LITE = new URLSearchParams(location.search).has('lite');
// her health, by the rule for every fight (no bullet sponges): the good bot, which strikes about 2.4 times a second at
// about twice a person's damage, empties her bar at about 42% of the song, so a person empties it late in the song
const HP = 280 * U;

export default {
  id: ID, beats: ID,
  par: 90000,                  // about 0.55 of the good bot's median score, 160k (grading is forgiving)
  lastHit: 214.494,
  spawn: { player: [0, 5.6, Math.PI], boss: [0, -6.85, Math.PI] },

  async buildArena(f) {
    let arena = null;
    if (!LITE) {
      try { arena = await Arena.load(`assets/arenas/${ID}/${ID}.json`, f.app.renderer, f.scene, { camera: f.cam.cam }); }
      catch (e) { console.warn('the back room is not baked yet:', e.message); arena = null; }
    }
    let w;
    if (arena) {
      arena.prepareCamera(f.cam.cam);
      arena.setState(0);
      w = { arena, bounds: { minX: -11, maxX: 11, minZ: -7, maxZ: 7 }, room: arena.room,
        resolve: (x, z, r) => arena.resolve(x, z, r),
        update(dt, t, ff) { ff.room && ff.room.lights(roomT(ff), arena); arena.update(dt, ff.cam.cam, ff.player.root.position); ff.room && ff.room.pool.aim(arena); ff.app.post.fx.exposure = arena.exposure * (ff.room ? ff.room.exposureK : 1); },
        dispose() { f.room && f.room.dispose(); arena.dispose(); } };
    } else {
      const a = liteArena(f.scene, { w: 22, d: 14, color: 0x1a0a14, accent: 0xff6a13 });
      const d0 = a.dispose; a.dispose = () => { f.room && f.room.dispose(); d0(); };
      w = a;
    }
    if (!kit) { kit = new CharacterKit('assets/characters/'); await kit.init(); }
    f.room = new Room(f, w);
    await f.room.build(kit);
    return w;
  },

  async buildBoss(f) {
    if (!kit) { kit = new CharacterKit('assets/characters/'); await kit.init(); }
    const fig = await buildFigurine(kit, SPEC);
    f.scene.add(fig.root);
    const b = new Boss({ root: fig.root, rig: fig.rig, figurine: fig }, { name: 'THE CLERK', hp: HP, notches: [0.75, 0.5, 0.25], pieces: PIECES, radius: 0.85 });
    b.idle = 'Idle_Talking_Loop'; b.loop('Idle_Talking_Loop');
    b.faceTarget = f.player;
    b.arena = f.arena;
    f.clerk = new Clerk(f, b, fig);
    // a start part-way in: the room and her as the song has them, before that moment's own events fire
    f._stcInit = (t) => { if (f._stcPlaced) return; f._stcPlaced = true; f.clerk.placeAt(t); f.clerk.reset(t); f.room.setStateAt(t); };
    if (f.arena.arena) { f.arena.arena.addCaster(f.player.root); f.arena.arena.addCaster(fig.root); }
    if (f.room && f.room.refl && f.room.refl.warm) f.room.refl.warm();
    return b;
  },

  script(T, f) {
    script(T, f);
    // a start part-way in (practice from a section, or ?at=) calls no track hook, and its first seek is the moment
    // before that time's own events fire: put the room and her as the song has them there
    const seek0 = T.seek.bind(T);
    T.seek = (t) => { seek0(t); if (!f._stcPlaced && f.state === 'play') { if (t > 0.05) f._stcInit(t); else f._stcPlaced = true; } };
  },

  onStart(f) { f._stcPlaced = true; f.room.setStateAt(0); f.clerk.reset(0); },
  // a rewind (her position comes back from the checkpoint) or the ENCORE (it doesn't: she goes back up on the counter).
  // Everything here is derived from t, so running it twice is the same as once
  onRewind(f, t) { f.room.setStateAt(t); f.clerk.reset(t); if (f.state === 'encore') f.clerk.placeAt(t); },
  onSection(f, sec) { f.room.onSection && f.room.onSection(sec); },
  onBreak(f, i) { f.clerk.onBreak(i); },
  onEmpty(f) { f.clerk.onEmpty(); },
  onFinish(f) { f.clerk.onFinish(); f.room.onFinish(); },
  onEncore(f) { f.clerk.onEncore(); },
  onSpotlight(f, on) { f.room.onSpotlight(on); },
  update(f, dt) {
    if (!f._stcPlaced) { if (f.t > 0.05) f._stcInit(f.t); else f._stcPlaced = true; }
    // (a safety: she never stands nowhere)
    if (!Number.isFinite(f.boss.x + f.boss.z)) { f.boss.move = null; f.boss.place(0, -1); }
    f.clerk.update(dt); f.room.update(dt, roomT(f));
  },
  sections: SEC,
};
