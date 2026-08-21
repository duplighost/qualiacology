// The director — Cinderbloom's wave contract run as a horde loop:
// CONTACT (one bearing, 34–66° off the player's facing) → SQUEEZE (artillery
// + a second bearing 110–155° away) → ANCHOR (1.4 s rumble, then the warden)
// → SILENCE (7 designed seconds of nothing). Queue = duration, cap =
// pressure: kills pull the next body. Waves ramp by BODIES ONLY — never
// speed, never telegraphs (that law is why fast enemies stay fair). Mercy:
// −7% bodies per death past the first, floor −25%; the wave index NEVER
// advances on a death.
//
// Spawn laws (hard): ≥14 m from the player, outside the 90° view cone,
// ≥600 ms between spawn events, inside the arena, off the structure core.
// Blocked orders defer 0.35 s and retry forever — a jammed arena runs waves
// late, never short.

import * as THREE from 'three';
import { TAU, clamp, clamp01, lerp } from '../engine/math.js';

const FINAL_WAVE = 10;
const ALIVE_CAP = 16;
const MIN_SPAWN_DIST = 14, VIEW_CONE = Math.PI / 4, SPAWN_GAP = 0.6;
const BANDS = { thrall: [16, 28], chorister: [24, 38], warden: [30, 44] };
const SILENCE_S = 7.0;

export function create(ctx) {
  const rng = ctx.rng.fork('director');
  let wave = 0, attempt = 1;
  let phase = 'idle';            // idle | contact | squeeze | anchor | cleanup | silence | won
  let phaseT = 0, waveT = 0;
  let queue = [];                // [{species, at, bearing}]
  let sinceSpawn = 99;
  let rumbleSent = false;
  let running = false;
  let underAttackT = 0;

  /* ---------------- supply pod ---------------- */
  const podGroup = new THREE.Group();
  const podMat = new THREE.MeshStandardMaterial({ color: 0x223244, roughness: 0.4, metalness: 0.6, emissive: 0x35dfff, emissiveIntensity: 0.8 });
  const pod = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), podMat);
  pod.position.y = 0.6;
  pod.castShadow = true;
  podGroup.add(pod);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.4, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x7df9ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
  );
  beam.position.y = 20;
  podGroup.add(beam);
  podGroup.visible = false;
  ctx.scene.add(podGroup);
  let podLive = false, podT = 0;

  function dropPod() {
    const p = ctx.systems.player;
    const a = Math.atan2(p.pos.z, p.pos.x);
    const r = 20;
    podGroup.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    podGroup.position.y = ctx.systems.world.groundAt(podGroup.position.x, podGroup.position.z, 100);
    podGroup.visible = true;
    podLive = true;
    podT = 0;
    ctx.bus.emit('supply:drop', { pos: podGroup.position });
  }

  /* ---------------- wave building ---------------- */
  function bodies(base) {
    const ramp = 1 + 0.18 * (wave - 1);
    const mercy = 1 - clamp((attempt - 1) * 0.07, 0, 0.25);
    return Math.max(1, Math.round(base * ramp * mercy));
  }

  /**
   * The player's facing as a bearing in the SAME frame the spawn ring uses
   * (x = cos a, z = sin a), i.e. atan2(dz, dx). Forward is
   * (-sin yaw, 0, -cos yaw). Mixing atan2(x,z) here with atan2(z,x) at the
   * comparison site silently rotates the whole view-cone law into nonsense.
   */
  function playerBearing() {
    const cam = ctx.systems.camera;
    return Math.atan2(-Math.cos(cam.yaw), -Math.sin(cam.yaw));
  }

  function enqueue(species, count, bearing, atBase, spacing) {
    for (let i = 0; i < count; i++) {
      queue.push({
        species,
        at: waveT + atBase + i * (spacing + rng.next() * 0.4),
        bearing: bearing + (rng.next() - 0.5) * 0.5,
      });
    }
  }

  function buildWave() {
    queue.length = 0;
    const facing = playerBearing();
    // CONTACT: one bearing, deliberately 34–66° OFF the facing axis
    const side = rng.sign();
    const contactBearing = facing + side * (0.6 + rng.next() * 0.55);
    enqueue('thrall', bodies(3), contactBearing, 0.5, 0.9);
    // SQUEEZE at +8 s: artillery + second bearing 110–155° away
    const squeezeBearing = contactBearing + rng.sign() * (1.9 + rng.next() * 0.8);
    enqueue('chorister', wave >= 3 ? 2 : 1, squeezeBearing, 8.0, 4.0);
    enqueue('thrall', bodies(4), squeezeBearing, 9.0, 1.5);
    // ANCHOR at +28 s from wave 2: rumble first, then the warden(s)
    if (wave >= 2) {
      enqueue('warden', wave >= 6 ? 2 : 1, contactBearing + Math.PI + (rng.next() - 0.5), 28.0, 8);
    }
    // late thrall pressure on big waves
    if (wave >= 4) enqueue('thrall', bodies(3), facing + Math.PI, 30, 1.8);
    rumbleSent = false;
  }

  /* ---------------- spawn legality ---------------- */
  const _v = new THREE.Vector3();
  function trySpawn(order) {
    const p = ctx.systems.player;
    const world = ctx.systems.world;
    const enemies = ctx.systems.enemies;
    if (enemies.aliveCount >= ALIVE_CAP) return false;
    if (sinceSpawn < SPAWN_GAP) return false;
    const [rMin, rMax] = BANDS[order.species];
    const facing = playerBearing();
    for (let attempt2 = 0; attempt2 < 12; attempt2++) {
      const a = order.bearing + (rng.next() - 0.5) * 0.7 * (1 + attempt2 * 0.3);
      const r = rMin + Math.sqrt(rng.next()) * (rMax - rMin);
      const x = p.pos.x + Math.cos(a) * r;
      const z = p.pos.z + Math.sin(a) * r;
      // laws
      if (Math.hypot(x, z) > world.playRadius - 3) continue;
      if (Math.hypot(x - p.pos.x, z - p.pos.z) < MIN_SPAWN_DIST) continue;
      if (Math.hypot(x, z) < world.structure.floorR + 1) continue;
      let da = Math.atan2(z - p.pos.z, x - p.pos.x) - facing;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      if (Math.abs(da) < VIEW_CONE) continue;             // never in the view cone
      const e = enemies.spawn(order.species, x, z);
      if (e) {
        sinceSpawn = 0;
        return true;
      }
      return false; // pool jammed — defer
    }
    return false;
  }

  /* ---------------- run control ---------------- */
  function startWave(n) {
    wave = n;
    waveT = 0;
    phase = 'contact';
    phaseT = 0;
    buildWave();
    ctx.systems.world.setPower(wave / FINAL_WAVE);
    ctx.systems.world.setProgress((wave - 1) / FINAL_WAVE);
    ctx.bus.emit('wave:start', { wave, final: FINAL_WAVE });
  }

  ctx.bus.on('player:hurt', () => { underAttackT = 2.5; });
  ctx.bus.on('player:died', () => { attempt++; });
  let dryT = 0;                 // truly out of ammo -> emergency pod

  return {
    id: 'director',
    get wave() { return wave; },
    get phase() { return phase; },
    get queued() { return queue.length; },
    get running() { return running; },
    /** fresh=false restarts the CURRENT wave (death retry, mercy applied);
     *  the wave index never advances — and never resets — on a death. */
    startRun({ retry = false } = {}) {
      running = true;
      if (!retry) attempt = 1;
      startWave(retry ? Math.max(1, wave) : 1);
    },
    reset() {
      running = false;
      queue.length = 0;
      phase = 'idle';
      podLive = false;
      podGroup.visible = false;
      // wave stays — a death restarts the SAME wave (never advances on death)
    },
    debugSpawnWave(n) { startWave(n ?? Math.max(1, wave)); },

    update(dt) {
      if (!running || ctx.state !== 'playing') return;
      const enemies = ctx.systems.enemies;
      const p = ctx.systems.player;
      waveT += dt;
      phaseT += dt;
      sinceSpawn += dt;
      underAttackT = Math.max(0, underAttackT - dt);

      // threat dial: the sky, fog, and trim all follow this one scalar
      ctx.systems.world.setThreat(
        (wave / FINAL_WAVE) * 0.7 + (enemies.aliveCount / 24) * 0.25 + (underAttackT > 0 ? 0.12 : 0),
      );

      // ANCHOR rumble: part of the spawn, not decoration
      if (!rumbleSent && queue.some(o => o.species === 'warden') && wave >= 2) {
        const next = queue.find(o => o.species === 'warden');
        if (next && waveT >= next.at - 1.4) {
          rumbleSent = true;
          ctx.bus.emit('enemy:rumble', {});
          ctx.systems.camera.addTrauma(0.18);
        }
      }

      // drain the queue under the laws; blocked orders defer 0.35 s
      for (let i = 0; i < queue.length; i++) {
        const o = queue[i];
        if (waveT < o.at) continue;
        if (trySpawn(o)) {
          queue.splice(i, 1);
          break;                       // one spawn event per frame max
        } else {
          o.at = waveT + 0.35;
        }
      }

      // phase bookkeeping (for tests + the banner rhythm)
      if (phase === 'contact' && waveT >= 8) { phase = 'squeeze'; phaseT = 0; }
      else if (phase === 'squeeze' && waveT >= 28) { phase = 'anchor'; phaseT = 0; }
      else if (phase === 'anchor' && queue.length === 0) { phase = 'cleanup'; phaseT = 0; }
      else if ((phase === 'cleanup' || phase === 'contact' || phase === 'squeeze') && queue.length === 0 && enemies.aliveCount === 0) {
        // field is clear — the designed silence
        phase = 'silence';
        phaseT = 0;
        ctx.bus.emit('wave:clear', { wave });
        dropPod();
      } else if (phase === 'silence') {
        if (phaseT >= SILENCE_S) {
          if (wave >= FINAL_WAVE) {
            phase = 'won';
            running = false;
            ctx.systems.world.setProgress(1);
            ctx.bus.emit('run:won', { wave });
          } else {
            startWave(wave + 1);
          }
        }
      }

      // emergency pod: a player with literally no rounds gets a lifeline
      const a = ctx.systems.weapons.ammoState();
      dryT = (a.ammo + (a.reserve ?? 0) === 0) ? dryT + dt : 0;
      if (dryT > 5 && !podLive) dropPod();

      // supply pod: collect by touch
      if (podLive) {
        podT += dt;
        pod.rotation.y += dt * 1.4;
        pod.position.y = 0.6 + Math.sin(podT * 2.2) * 0.12;
        beam.material.opacity = 0.16 + Math.sin(podT * 3.1) * 0.05;
        if (_v.set(p.pos.x - podGroup.position.x, 0, p.pos.z - podGroup.position.z).length() < 2.0) {
          podLive = false;
          podGroup.visible = false;
          const got = ctx.systems.weapons.addReserve(90);
          p.heal(40);
          ctx.bus.emit('supply:collect', { ammo: got });
        }
        if (podT > 30 + SILENCE_S) { podLive = false; podGroup.visible = false; }
      }
    },
  };
}
