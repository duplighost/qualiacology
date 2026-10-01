// Numerical WebAudio regression and listening artifact; not a subjective audio review.
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';

const out = process.env.BREAKWATER_QA_OUT || `${tmpdir()}/breakwater-audio-qa`;
mkdirSync(out, {recursive: true});
const origin = new URL(process.env.BREAKWATER_QA_URL || 'http://127.0.0.1:4173/breakwater/').origin;

const browser = await chromium.launch({ executablePath: process.env.BREAKWATER_CHROMIUM || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.route('**/underwater-audio-proof', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><button>Unlock audio</button>' }));
await page.goto(`${origin}/underwater-audio-proof`);
try {
  const before = await page.evaluate(async () => {
    const { AudioSystem } = await import('/breakwater/src/audio.js');
    window.AudioSystem = AudioSystem;
    const a = window.audio = new AudioSystem();
    a.setUnderwater(true);
    const pre = { context: !!a.context, underwater: a.getStats().underwater };
    a.setUnderwater(false);
    document.querySelector('button').onclick = async () => { window.started = await a.unlock(); };
    return pre;
  });
  assert.deepEqual(before, { context: false, underwater: true }, 'Underwater state must not unlock audio');
  await page.click('button');
  await page.waitForFunction(() => window.started === true);
  await page.evaluate(() => window.audio.ready);
  const measurements = await page.evaluate(async () => {
    const a = window.audio, c = a.context;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    a.setVolume(.8, 0);
    clearInterval(a._timer); a._timer = null;
    const osc = c.createOscillator(), gain = c.createGain();
    osc.frequency.value = 4000; gain.gain.value = .04;
    osc.connect(gain); gain.connect(a.sfxBus); osc.start();
    const analyser = c.createAnalyser(); analyser.fftSize = 4096; analyser.smoothingTimeConstant = 0;
    a.output.connect(analyser);
    const silent = c.createGain(); silent.gain.value = 0; analyser.connect(silent); silent.connect(c.destination);
    const measure = frequency => {
      const bins = new Float32Array(analyser.frequencyBinCount); analyser.getFloatFrequencyData(bins);
      const at = Math.round(frequency / c.sampleRate * analyser.fftSize);
      return Math.max(...bins.slice(Math.max(0, at - 2), at + 3));
    };
    await wait(300);
    const normal = { db: measure(4000), stats: a.getStats() };
    a.setUnderwater(true); await wait(120);
    const midpoint = a.getStats();
    await wait(650);
    const submerged = { db: measure(4000), stats: a.getStats() };
    a.setUnderwater(false); await wait(750);
    const restored = { db: measure(4000), stats: a.getStats() };
    osc.frequency.value = 220; await wait(200);
    const lowNormal = measure(220);
    a.setUnderwater(true); await wait(750);
    const lowSubmerged = measure(220);

    // The same source through music must be filtered too; mute existing score
    // stems to isolate the measurement without changing the actual routing.
    gain.disconnect(); gain.connect(a.musicBus); osc.frequency.value = 4000;
    a.setVolume(.8, .5);
    for (const stem of Object.values(a.stems)) { stem.gain.cancelScheduledValues(c.currentTime); stem.gain.value = 0; }
    a.setUnderwater(false); await wait(750); const musicNormal = measure(4000);
    a.setUnderwater(true); await wait(750); const musicSubmerged = measure(4000);

    // Paused UI/ending output must remain clear while underwater.
    gain.disconnect(); gain.connect(a.uiBus); a.setVolume(.8, 0);
    await wait(200); const uiSubmerged = measure(4000);
    a.setUnderwater(false); await wait(750); const uiNormal = measure(4000);
    a.setUnderwater(true); a.pause(true); await wait(750); const uiPausedSubmerged = measure(4000);
    osc.stop(); gain.disconnect();
    a.sfx('complete'); await wait(160);
    const data = new Float32Array(4096); analyser.getFloatTimeDomainData(data);
    const endingRms = Math.sqrt(data.reduce((sum, n) => sum + n * n, 0) / data.length);
    a.setVolume(0, 0); await wait(300); analyser.getFloatTimeDomainData(data);
    const mutedRms = Math.sqrt(data.reduce((sum, n) => sum + n * n, 0) / data.length);
    a.output.disconnect(analyser); analyser.disconnect(); silent.disconnect();
    return { normal, midpoint, submerged, restored, lowNormal, lowSubmerged, musicNormal, musicSubmerged, uiNormal, uiSubmerged, uiPausedSubmerged, endingRms, mutedRms };
  });
  assert.ok(measurements.midpoint.gameplayCutoff > 1100 && measurements.midpoint.gameplayCutoff < 19000, 'Filter did not ramp smoothly');
  assert.ok(Math.abs(measurements.submerged.stats.gameplayCutoff - 950) < 15);
  assert.ok(Math.abs(measurements.submerged.stats.gameplayGain - .72) < .002);
  assert.ok(measurements.submerged.db - measurements.normal.db < -20, 'High-frequency SFX remained clear underwater');
  assert.ok(Math.abs(measurements.restored.db - measurements.normal.db) < .3, 'Normal sound did not recover');
  assert.ok(measurements.lowSubmerged - measurements.lowNormal > -5, 'Low-frequency body was lost underwater');
  assert.ok(measurements.musicSubmerged - measurements.musicNormal < -20, 'Music bypassed underwater filter');
  assert.ok(Math.abs(measurements.uiNormal - measurements.uiSubmerged) < .3, 'UI was filtered underwater');
  assert.ok(Math.abs(measurements.uiNormal - measurements.uiPausedSubmerged) < .3, 'Paused underwater UI was muted');
  assert.ok(measurements.endingRms > .005, 'Explicit ending cue was inaudible');
  assert.ok(measurements.mutedRms < .0001, 'Master mute failed on underwater UI');

  // Audible artifact: the same original motif + recorded footsteps/lance sounds
  // repeats above water (0–2s), submerged (2–4s), then restored (4–6s).
  const pcm = await page.evaluate(async () => {
    const a = new window.AudioSystem();
    a.context = new OfflineAudioContext(2, 24000 * 6, 24000);
    a._buildGraph(); a._buildSynth(); a.samples = window.audio.samples;
    a.setVolume(.85, .65); a.setIntensity(.7);
    for (let section = 0; section < 3; section++) {
      const time = section * 2 + .03;
      for (let step = 0; step < 4; step++) {
        a._play(a._instrument('bass', 38, .45, .6), { time: time + step * .5, gain: .5, bus: a.stems.pulse, music: true });
        a._play(a._instrument('glass', [74, 81, 77, 86][step], .7, .4), { time: time + step * .5 + .1, gain: .4, bus: a.stems.lead, music: true, pan: step % 2 ? .4 : -.4 });
        a._play(a.synth.get(step % 2 ? 'snare' : 'kick'), { time: time + step * .5, gain: .4, bus: a.stems.drums, music: true });
      }
      a._play(a.samples.get('step-0'), { time: time + .2, gain: .3 });
      a._play(a.samples.get('step-2'), { time: time + .65, gain: .3 });
      a._play(a.synth.get('throw'), { time: time + 1, gain: .6 });
      a._play(a.synth.get('perfect'), { time: time + 1.48, gain: .35 });
    }
    const down = a.context.suspend(2).then(() => { a.setUnderwater(true); return a.context.resume(); });
    const up = a.context.suspend(4).then(() => { a.setUnderwater(false); return a.context.resume(); });
    const rendering = a.context.startRendering();
    await Promise.all([down, up]); const buffer = await rendering;
    const left = buffer.getChannelData(0), right = buffer.getChannelData(1);
    return Array.from({ length: left.length * 2 }, (_, i) => i % 2 ? right[(i - 1) / 2] : left[i / 2]);
  });
  assert.ok(pcm.every(Number.isFinite)); assert.ok(pcm.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0) < 1);
  const wav = Buffer.alloc(44 + pcm.length * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(24000, 24); wav.writeUInt32LE(96000, 28);
  wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(pcm.length * 2, 40);
  pcm.forEach((value, i) => wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + i * 2));
  writeFileSync(`${out}/underwater-transition.wav`, wav);
  assert.equal(errors.length, 0);
  const report = { passed: true, before, measurements, errors, audibleArtifact: 'underwater-transition.wav (normal 0–2s, submerged 2–4s, normal 4–6s)' };
  writeFileSync(`${out}/audio-underwater-results.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: true, highSfxAttenuationDB: measurements.submerged.db - measurements.normal.db, highMusicAttenuationDB: measurements.musicSubmerged - measurements.musicNormal, lowFrequencyChangeDB: measurements.lowSubmerged - measurements.lowNormal, restoredDifferenceDB: measurements.restored.db - measurements.normal.db, uiDifferenceDB: measurements.uiPausedSubmerged - measurements.uiNormal, endingRms: measurements.endingRms, mutedRms: measurements.mutedRms, errors }, null, 2));
  await page.evaluate(() => window.audio.dispose());
} finally {
  await browser.close();
}
