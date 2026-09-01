import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEFAULT_URL = 'http://127.0.0.1:4177/glide/';
const DEFAULT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;
const DEFAULT_DPR = 1;
const DEFAULT_PHASE_MS = 8000;

function parseArgs(argv) {
  const options = {
    url: DEFAULT_URL,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    dpr: DEFAULT_DPR,
    phaseMs: DEFAULT_PHASE_MS,
    headed: false,
    forceRain: false,
    output: null,
  };
  let positionalUrl = null;

  for (const arg of argv) {
    if (arg === '--headed') {
      options.headed = true;
    } else if (arg === '--force-rain') {
      options.forceRain = true;
    } else if (arg.startsWith('--width=')) {
      options.width = Number(arg.slice('--width='.length));
    } else if (arg.startsWith('--height=')) {
      options.height = Number(arg.slice('--height='.length));
    } else if (arg.startsWith('--dpr=')) {
      options.dpr = Number(arg.slice('--dpr='.length));
    } else if (arg.startsWith('--phase-ms=')) {
      options.phaseMs = Number(arg.slice('--phase-ms='.length));
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length);
    } else if (!arg.startsWith('--') && positionalUrl === null) {
      positionalUrl = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.url = positionalUrl || options.url;
  for (const [name, value] of Object.entries({
    width: options.width,
    height: options.height,
    dpr: options.dpr,
    phaseMs: options.phaseMs,
  })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`--${name} must be a positive number; received ${value}`);
    }
  }
  if (options.phaseMs < 1000) {
    throw new Error('--phase-ms must be at least 1000');
  }
  if (options.output !== null && options.output.length === 0) {
    throw new Error('--output requires a file path');
  }
  new URL(options.url);
  return options;
}

function round(value, digits = 3) {
  if (!Number.isFinite(value)) return value;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function percentile(sorted, fraction) {
  if (sorted.length === 0) return null;
  return sorted[Math.floor((sorted.length - 1) * fraction)];
}

function summarizeFrames(sample) {
  const sorted = [...sample.deltas].sort((a, b) => a - b);
  const wallMs = sample.endedAt - sample.startedAt;
  const sum = sample.deltas.reduce((total, value) => total + value, 0);
  return {
    durationMs: round(wallMs),
    frames: sample.deltas.length,
    fps: round((sample.deltas.length * 1000) / wallMs),
    meanMs: round(sum / sample.deltas.length),
    medianMs: round(percentile(sorted, 0.5)),
    p95Ms: round(percentile(sorted, 0.95)),
    p99Ms: round(percentile(sorted, 0.99)),
    maxMs: round(sorted.at(-1)),
    over20Ms: sample.deltas.filter((value) => value > 20).length,
    over34Ms: sample.deltas.filter((value) => value > 34).length,
    over50Ms: sample.deltas.filter((value) => value > 50).length,
    over100Ms: sample.deltas.filter((value) => value > 100).length,
  };
}

function summarizeLongTasks(tasks) {
  const durations = tasks.map((task) => task.duration);
  return {
    count: tasks.length,
    totalMs: round(durations.reduce((total, value) => total + value, 0)),
    maxMs: round(durations.length ? Math.max(...durations) : 0),
    tasks: tasks
      .toSorted((a, b) => b.duration - a.duration)
      .slice(0, 12)
      .map((task) => ({
        startMs: round(task.startTime),
        durationMs: round(task.duration),
        name: task.name,
      })),
  };
}

function summarizeLongAnimationFrames(frames) {
  return {
    count: frames.length,
    totalBlockingMs: round(frames.reduce(
      (total, frame) => total + (frame.blockingDuration || 0),
      0,
    )),
    frames: frames
      .toSorted((a, b) => b.duration - a.duration)
      .slice(0, 12)
      .map((frame) => ({
        startMs: round(frame.startTime),
        durationMs: round(frame.duration),
        blockingMs: round(frame.blockingDuration),
        renderStartMs: round(frame.renderStart),
        styleAndLayoutStartMs: round(frame.styleAndLayoutStart),
        scripts: frame.scripts
          .toSorted((a, b) => b.duration - a.duration)
          .slice(0, 8)
          .map((script) => ({
            durationMs: round(script.duration),
            forcedStyleAndLayoutMs: round(script.forcedStyleAndLayoutDuration),
            invokerType: script.invokerType,
            invoker: script.invoker,
            sourceURL: script.sourceURL,
            sourceFunctionName: script.sourceFunctionName,
          })),
      })),
  };
}

function distance(a, b, horizontalOnly = false) {
  if (!a || !b) return null;
  const dx = b.x - a.x;
  const dy = horizontalOnly ? 0 : b.y - a.y;
  const dz = b.z - a.z;
  return Math.hypot(dx, dy, dz);
}

const options = parseArgs(process.argv.slice(2));
const expectedRenderDpr = Math.min(options.dpr, 1);
const browserFailures = [];
const checks = [];

function check(name, pass, actual, expected) {
  checks.push({ name, pass: Boolean(pass), actual, expected });
}

const browser = await chromium.launch({
  channel: 'chrome',
  headless: !options.headed,
  args: [
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--use-angle=d3d11',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
  ],
});

let report;
let context = null;
let page = null;
try {
  context = await browser.newContext({
    viewport: { width: options.width, height: options.height },
    deviceScaleFactor: options.dpr,
  });
  page = await context.newPage();
  page.setDefaultTimeout(60_000);

  page.on('pageerror', (error) => {
    browserFailures.push({ type: 'pageerror', message: error.message });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserFailures.push({ type: 'console.error', message: message.text() });
    }
  });
  page.on('requestfailed', (request) => {
    browserFailures.push({
      type: 'requestfailed',
      message: `${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`.trim(),
    });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      browserFailures.push({
        type: 'http',
        message: `${response.status()} ${response.url()}`,
      });
    }
  });

  await page.addInitScript(() => {
    const probe = {
      firstRafMs: null,
      longTasks: [],
      longAnimationFrames: [],
      failures: [],
    };
    Object.defineProperty(window, '__GLIDE_PERFORMANCE_PROBE__', {
      value: probe,
      configurable: false,
      enumerable: false,
      writable: false,
    });

    requestAnimationFrame((timestamp) => {
      probe.firstRafMs = timestamp;
    });

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          probe.longTasks.push({
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
          });
        }
      });
      observer.observe({ type: 'longtask', buffered: true });
    } catch (error) {
      probe.failures.push({ type: 'longtask-observer', message: String(error) });
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          probe.longAnimationFrames.push({
            startTime: entry.startTime,
            duration: entry.duration,
            blockingDuration: entry.blockingDuration,
            renderStart: entry.renderStart,
            styleAndLayoutStart: entry.styleAndLayoutStart,
            scripts: Array.from(entry.scripts || [], (script) => ({
              duration: script.duration,
              forcedStyleAndLayoutDuration: script.forcedStyleAndLayoutDuration,
              invokerType: script.invokerType,
              invoker: script.invoker,
              sourceURL: script.sourceURL,
              sourceFunctionName: script.sourceFunctionName,
            })),
          });
        }
      });
      observer.observe({ type: 'long-animation-frame', buffered: true });
    } catch (error) {
      probe.failures.push({ type: 'long-animation-frame-observer', message: String(error) });
    }

    window.addEventListener('error', (event) => {
      probe.failures.push({ type: 'window.error', message: event.message || 'Unknown error' });
    });
    window.addEventListener('unhandledrejection', (event) => {
      probe.failures.push({ type: 'unhandledrejection', message: String(event.reason) });
    });
    document.addEventListener(
      'webglcontextlost',
      () => probe.failures.push({ type: 'webglcontextlost', message: 'WebGL context lost' }),
      true,
    );

    probe.sample = (durationMs) => new Promise((resolve) => {
      const deltas = [];
      const hitchFrames = [];
      const stateCounts = Object.create(null);
      const chunkKeys = new Set();
      const chunkKeySequence = [];
      const startedAt = performance.now();
      let previousAt = startedAt;
      let previousChunkKey = null;
      let startPosition = null;
      let endPosition = null;
      let previousPosition = null;
      let pathDistance3d = 0;
      let pathDistanceHorizontal = 0;
      let queueMax = 0;
      let activationQueueMax = 0;
      let chunksMin = Infinity;
      let chunksMax = 0;
      let visibleChunksMin = Infinity;
      let visibleChunksMax = 0;
      let desiredVisibleMin = Infinity;
      let desiredVisibleMax = 0;
      let inputSamples = 0;
      let wHeldFrames = 0;
      let forwardMoveFrames = 0;
      let pondSurfaceMeshes = null;
      let pondSurfaceStart = null;
      let pondSurfaceEnd = null;

      const readPondSurface = (game) => {
        if (!pondSurfaceMeshes) {
          pondSurfaceMeshes = { pads: null, flowers: null };
          game?.engine?.scene?.traverse?.((object) => {
            if (!object.isInstancedMesh || object.count !== 18) return;
            const color = object.material?.color?.getHex?.();
            if (color === 0x3f7d3a) pondSurfaceMeshes.pads = object;
            if (color === 0xfbd2e2) pondSurfaceMeshes.flowers = object;
          });
        }
        const readMesh = (mesh) => mesh
          ? { matrixVersion: mesh.instanceMatrix?.version ?? null, visible: mesh.visible }
          : null;
        return {
          pads: readMesh(pondSurfaceMeshes.pads),
          flowers: readMesh(pondSurfaceMeshes.flowers),
        };
      };

      const readTelemetry = () => {
        const game = window.__GAME;
        const position = game?.player?.position;
        const world = game?.world;
        const queue = world?._queue?.length ?? 0;
        const activationQueue = world?._activateQueue?.length ?? 0;
        const chunks = world?.chunks?.size ?? 0;
        const chunkEntries = world?.chunks ? [...world.chunks.entries()] : [];
        const visibleChunks = chunkEntries.reduce(
          (count, [, chunk]) => count + (chunk?.group?.visible ? 1 : 0),
          0,
        );
        const desiredKeys = world?._desiredKeys;
        const desiredVisible = desiredKeys
          ? chunkEntries.reduce(
            (count, [chunkKey, chunk]) => count + (
              desiredKeys.has(chunkKey) && chunk?.group?.visible ? 1 : 0
            ),
            0,
          )
          : 0;
        const key = world?._curKey ?? null;
        const state = game?.player?.state ?? 'missing';
        const weather = game?.weather;
        const wHeld = game?.input?.keys?.has?.('KeyW') === true;
        const forward = game?.input?.move?.y ?? 0;
        const point = position
          ? { x: position.x, y: position.y, z: position.z }
          : null;
        return {
          point,
          queue,
          activationQueue,
          chunks,
          visibleChunks,
          desiredVisible,
          desiredCount: desiredKeys?.size ?? 0,
          activeTrees: world?.activeTrees?.length ?? 0,
          key,
          state,
          wHeld,
          forward,
          wetness: weather?.wetness ?? null,
          wetTarget: weather?._wetTarget ?? null,
          snowing: weather?.snowing ?? null,
          weatherTimer: weather?._timer ?? null,
          bloomStrength: game?.engine?.bloom?.strength ?? null,
          shadowMapActive: Boolean(game?.sky?.sun?.shadow?.map),
          pondSurface: readPondSurface(game),
        };
      };

      const tick = (now) => {
        const telemetry = readTelemetry();
        if (startPosition === null) startPosition = telemetry.point;
        const delta = now - previousAt;
        if (delta > 0) {
          deltas.push(delta);
          previousAt = now;
          if (delta > 20) {
            hitchFrames.push({
              atMs: now,
              deltaMs: delta,
              queue: telemetry.queue,
              activationQueue: telemetry.activationQueue,
              chunks: telemetry.chunks,
              visibleChunks: telemetry.visibleChunks,
              desiredVisible: telemetry.desiredVisible,
              desiredCount: telemetry.desiredCount,
              activeTrees: telemetry.activeTrees,
              chunkKey: telemetry.key,
              state: telemetry.state,
              wetness: telemetry.wetness,
              wetTarget: telemetry.wetTarget,
              snowing: telemetry.snowing,
              weatherTimer: telemetry.weatherTimer,
              bloomStrength: telemetry.bloomStrength,
              shadowMapActive: telemetry.shadowMapActive,
              pondSurface: telemetry.pondSurface,
              position: telemetry.point,
            });
          }
        }

        endPosition = telemetry.point;
        if (telemetry.point && previousPosition) {
          const dx = telemetry.point.x - previousPosition.x;
          const dy = telemetry.point.y - previousPosition.y;
          const dz = telemetry.point.z - previousPosition.z;
          pathDistance3d += Math.hypot(dx, dy, dz);
          pathDistanceHorizontal += Math.hypot(dx, dz);
        }
        previousPosition = telemetry.point;
        queueMax = Math.max(queueMax, telemetry.queue);
        activationQueueMax = Math.max(activationQueueMax, telemetry.activationQueue);
        chunksMin = Math.min(chunksMin, telemetry.chunks);
        chunksMax = Math.max(chunksMax, telemetry.chunks);
        visibleChunksMin = Math.min(visibleChunksMin, telemetry.visibleChunks);
        visibleChunksMax = Math.max(visibleChunksMax, telemetry.visibleChunks);
        desiredVisibleMin = Math.min(desiredVisibleMin, telemetry.desiredVisible);
        desiredVisibleMax = Math.max(desiredVisibleMax, telemetry.desiredVisible);
        if (telemetry.key !== null) {
          chunkKeys.add(telemetry.key);
          if (telemetry.key !== previousChunkKey) {
            chunkKeySequence.push({ atMs: now, key: telemetry.key });
            previousChunkKey = telemetry.key;
          }
        }
        if (!pondSurfaceStart) pondSurfaceStart = telemetry.pondSurface;
        pondSurfaceEnd = telemetry.pondSurface;
        stateCounts[telemetry.state] = (stateCounts[telemetry.state] || 0) + 1;
        inputSamples += 1;
        if (telemetry.wHeld) wHeldFrames += 1;
        if (telemetry.forward > 0.9) forwardMoveFrames += 1;

        if (now - startedAt < durationMs) {
          requestAnimationFrame(tick);
        } else {
          resolve({
            startedAt,
            endedAt: now,
            deltas,
            startPosition,
            endPosition,
            pathDistance3d,
            pathDistanceHorizontal,
            queueMax,
            activationQueueMax,
            chunksMin: Number.isFinite(chunksMin) ? chunksMin : 0,
            chunksMax,
            visibleChunksMin: Number.isFinite(visibleChunksMin) ? visibleChunksMin : 0,
            visibleChunksMax,
            desiredVisibleMin: Number.isFinite(desiredVisibleMin) ? desiredVisibleMin : 0,
            desiredVisibleMax,
            chunkKeys: [...chunkKeys],
            chunkKeySequence,
            pondSurface: {
              start: pondSurfaceStart,
              end: pondSurfaceEnd,
              padsMatrixUpdates: pondSurfaceStart?.pads && pondSurfaceEnd?.pads
                ? pondSurfaceEnd.pads.matrixVersion - pondSurfaceStart.pads.matrixVersion
                : null,
              flowersMatrixUpdates: pondSurfaceStart?.flowers && pondSurfaceEnd?.flowers
                ? pondSurfaceEnd.flowers.matrixVersion - pondSurfaceStart.flowers.matrixVersion
                : null,
            },
            stateCounts,
            inputSamples,
            wHeldFrames,
            forwardMoveFrames,
            hitchFrames: hitchFrames
              .sort((a, b) => b.deltaMs - a.deltaMs)
              .slice(0, 12),
          });
        }
      };
      requestAnimationFrame(tick);
    });
  });

  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

  const navigationWallStart = performance.now();
  const response = await page.goto(options.url, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  const domContentLoadedWallMs = performance.now() - navigationWallStart;

  await page.waitForFunction(() =>
    window.__GAME
      && document.documentElement.dataset.glideVersion
      && document.documentElement.dataset.glideReady === '1',
  );
  const readyWallMs = performance.now() - navigationWallStart;
  const readyPageMs = await page.evaluate(() => performance.now());

  await page.waitForFunction(() =>
    window.__GAME?.__worldExpansion?.destinations?.length === 50,
  );
  const contentBuiltPageMs = await page.evaluate(() => performance.now());

  const coldCompletePageMs = await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now())));
  }));
  const coldCompleteWallMs = performance.now() - navigationWallStart;

  await page.keyboard.press('Enter');
  await page.waitForFunction(() => {
    const veil = document.querySelector('#veil');
    return document.documentElement.dataset.glideTitle === 'entered'
      && veil?.classList.contains('title-entered')
      && Number.parseFloat(getComputedStyle(veil).opacity || '1') <= 0.05;
  });

  const snapshot = async () => page.evaluate(() => {
    const game = window.__GAME;
    const renderer = game?.engine?.renderer;
    const composer = game?.engine?.composer;
    const canvas = renderer?.domElement;
    const gl = renderer?.getContext?.();
    const debugInfo = gl?.getExtension?.('WEBGL_debug_renderer_info');
    const position = game?.player?.position;
    const biome = position ? game?.biomeAt?.(position.x, position.z) : null;
    const sceneCounts = {
      objects: 0,
      meshes: 0,
      instancedMeshes: 0,
      instances: 0,
      visibleMeshes: 0,
      shadowCasters: 0,
      frustumCulled: 0,
    };
    game?.engine?.scene?.traverse?.((object) => {
      sceneCounts.objects += 1;
      if (object.isMesh || object.isInstancedMesh) {
        sceneCounts.meshes += 1;
        if (object.isInstancedMesh) {
          sceneCounts.instancedMeshes += 1;
          sceneCounts.instances += object.count || 0;
        }
        if (object.visible) sceneCounts.visibleMeshes += 1;
        if (object.castShadow) sceneCounts.shadowCasters += 1;
        if (object.frustumCulled) sceneCounts.frustumCulled += 1;
      }
    });

    return {
      url: location.href,
      title: document.title,
      version: document.documentElement.dataset.glideVersion || null,
      ready: document.documentElement.dataset.glideReady || null,
      runtimeError: document.documentElement.dataset.glideRuntimeError || null,
      viewport: {
        innerWidth,
        innerHeight,
        devicePixelRatio,
      },
      renderer: {
        pixelRatio: renderer?.getPixelRatio?.() ?? null,
        canvasCssWidth: canvas?.clientWidth ?? null,
        canvasCssHeight: canvas?.clientHeight ?? null,
        drawingBufferWidth: canvas?.width ?? null,
        drawingBufferHeight: canvas?.height ?? null,
        calls: renderer?.info?.render?.calls ?? null,
        triangles: renderer?.info?.render?.triangles ?? null,
        geometries: renderer?.info?.memory?.geometries ?? null,
        textures: renderer?.info?.memory?.textures ?? null,
        programs: renderer?.info?.programs?.length ?? null,
      },
      composer: {
        pixelRatio: composer?._pixelRatio
          ?? (composer?.renderTarget1?.width && canvas?.clientWidth
            ? composer.renderTarget1.width / canvas.clientWidth
            : null),
        targetWidth: composer?.renderTarget1?.width ?? null,
        targetHeight: composer?.renderTarget1?.height ?? null,
      },
      gpu: {
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
      },
      weather: game?.weather
        ? {
          cloudiness: game.weather.cloudiness,
          wetness: game.weather.wetness,
          cloudTarget: game.weather._cloudTarget,
          wetTarget: game.weather._wetTarget,
          timer: game.weather._timer,
          snowing: game.weather.snowing,
          drops: game.weather.n,
        }
        : null,
      adaptive: {
        bloomStrength: game?.engine?.bloom?.strength ?? null,
        desiredChunkCount: game?.world?._desiredKeys?.size ?? null,
        shadowMapWidth: game?.sky?.sun?.shadow?.mapSize?.width ?? null,
        shadowMapActive: Boolean(game?.sky?.sun?.shadow?.map),
      },
      heap: performance.memory
        ? {
          usedBytes: performance.memory.usedJSHeapSize,
          totalBytes: performance.memory.totalJSHeapSize,
          limitBytes: performance.memory.jsHeapSizeLimit,
        }
        : null,
      player: position
        ? {
          x: position.x,
          y: position.y,
          z: position.z,
          state: game.player.state,
          groundY: biome?.ground ?? null,
          groundGap: biome ? position.y - biome.ground : null,
          velocity: {
            x: game.player.velocity.x,
            y: game.player.velocity.y,
            z: game.player.velocity.z,
          },
        }
        : null,
      world: {
        chunks: game?.world?.chunks?.size ?? null,
        queue: game?.world?._queue?.length ?? null,
        activationQueue: game?.world?._activateQueue?.length ?? null,
        visibleChunks: game?.world?.chunks
          ? [...game.world.chunks.values()].filter((chunk) => chunk?.group?.visible).length
          : null,
        desiredVisible: game?.world?._desiredKeys && game?.world?.chunks
          ? [...game.world.chunks.entries()].filter(
            ([key, chunk]) => game.world._desiredKeys.has(key) && chunk?.group?.visible,
          ).length
          : null,
        desiredCount: game?.world?._desiredKeys?.size ?? null,
        currentChunkKey: game?.world?._curKey ?? null,
        activeTrees: game?.world?.activeTrees?.length ?? null,
        destinations: game?.__worldExpansion?.destinations?.length ?? null,
        toys: game?.__worldExpansion?.toys?.length ?? null,
      },
      scene: sceneCounts,
    };
  });

  const measureOneRenderedFrame = async () => page.evaluate(() => new Promise((resolve) => {
    const renderer = window.__GAME.engine.renderer;
    const info = renderer.info;
    const oldAutoReset = info.autoReset;
    requestAnimationFrame(() => {
      info.autoReset = false;
      info.reset();
      requestAnimationFrame(() => {
        const counters = {
          calls: info.render.calls,
          triangles: info.render.triangles,
          points: info.render.points,
          lines: info.render.lines,
        };
        info.autoReset = oldAutoReset;
        if (oldAutoReset) info.reset();
        resolve(counters);
      });
    });
  }));

  const phase = async (name) => {
    const before = await snapshot();
    const sample = await page.evaluate(
      (durationMs) => window.__GLIDE_PERFORMANCE_PROBE__.sample(durationMs),
      options.phaseMs,
    );
    // Let the PerformanceObserver deliver an entry for a long task at the phase boundary.
    await page.waitForTimeout(50);
    const after = await snapshot();
    const renderedFrame = await measureOneRenderedFrame();
    const phaseLongTasks = await page.evaluate(
      ({ startedAt, endedAt }) => window.__GLIDE_PERFORMANCE_PROBE__.longTasks.filter(
        (entry) => entry.startTime <= endedAt && entry.startTime + entry.duration >= startedAt,
      ),
      sample,
    );
    const phaseLongAnimationFrames = await page.evaluate(
      ({ startedAt, endedAt }) => window.__GLIDE_PERFORMANCE_PROBE__.longAnimationFrames.filter(
        (entry) => entry.startTime <= endedAt && entry.startTime + entry.duration >= startedAt,
      ),
      sample,
    );
    return {
      name,
      frames: summarizeFrames(sample),
      longTasks: summarizeLongTasks(phaseLongTasks),
      longAnimationFrames: summarizeLongAnimationFrames(phaseLongAnimationFrames),
      movement: {
        netDistance3d: round(distance(sample.startPosition, sample.endPosition)),
        netDistanceHorizontal: round(distance(sample.startPosition, sample.endPosition, true)),
        pathDistance3d: round(sample.pathDistance3d),
        pathDistanceHorizontal: round(sample.pathDistanceHorizontal),
        start: sample.startPosition,
        end: sample.endPosition,
      },
      input: {
        samples: sample.inputSamples,
        wHeldFrames: sample.wHeldFrames,
        forwardMoveFrames: sample.forwardMoveFrames,
      },
      streaming: {
        queueMax: sample.queueMax,
        activationQueueMax: sample.activationQueueMax,
        chunksMin: sample.chunksMin,
        chunksMax: sample.chunksMax,
        visibleChunksMin: sample.visibleChunksMin,
        visibleChunksMax: sample.visibleChunksMax,
        desiredVisibleMin: sample.desiredVisibleMin,
        desiredVisibleMax: sample.desiredVisibleMax,
        chunkKeys: sample.chunkKeys,
        chunkKeySequence: sample.chunkKeySequence,
      },
      pondSurface: sample.pondSurface,
      stateCounts: sample.stateCounts,
      hitches: sample.hitchFrames.map((hitch) => ({
        ...hitch,
        atMs: round(hitch.atMs),
        deltaMs: round(hitch.deltaMs),
        position: hitch.position
          ? Object.fromEntries(Object.entries(hitch.position).map(([key, value]) => [key, round(value)]))
          : null,
      })),
      renderedFrame,
      before,
      after,
    };
  };

  if (options.forceRain) {
    await page.evaluate(() => {
      const weather = window.__GAME.weather;
      weather._timer = 1e9;
      weather._cloudTarget = 1;
      weather._wetTarget = 1;
      weather.cloudiness = 1;
      weather.wetness = 1;
    });
  }

  const startup = await snapshot();
  const idle = await phase('idle');

  await page.bringToFront();
  await page.keyboard.down('w');
  await page.waitForFunction(() =>
    window.__GAME?.input?.keys?.has?.('KeyW')
      && window.__GAME?.input?.move?.y > 0.9,
  );
  const stream = await phase('stream');
  const warm = await phase('warm');
  await page.keyboard.up('w');
  await page.waitForFunction(() => !window.__GAME?.input?.keys?.has?.('KeyW'));

  const final = await snapshot();
  const probe = await page.evaluate(() => ({
    firstRafMs: window.__GLIDE_PERFORMANCE_PROBE__.firstRafMs,
    longTasks: window.__GLIDE_PERFORMANCE_PROBE__.longTasks,
    longAnimationFrames: window.__GLIDE_PERFORMANCE_PROBE__.longAnimationFrames,
    failures: window.__GLIDE_PERFORMANCE_PROBE__.failures,
    navigation: (() => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (!nav) return null;
      return {
        responseEndMs: nav.responseEnd,
        domContentLoadedMs: nav.domContentLoadedEventEnd,
        loadMs: nav.loadEventEnd,
        transferSize: nav.transferSize,
        decodedBodySize: nav.decodedBodySize,
      };
    })(),
    paint: performance.getEntriesByType('paint').map((entry) => ({
      name: entry.name,
      startMs: entry.startTime,
    })),
  }));

  const coldTasks = probe.longTasks.filter((task) => task.startTime <= coldCompletePageMs);
  const failures = [...browserFailures, ...probe.failures];
  if (startup.runtimeError) {
    failures.push({ type: 'runtime-dataset', message: startup.runtimeError });
  }

  const rendererText = `${startup.gpu.vendor || ''} ${startup.gpu.renderer || ''}`.trim();
  const gpuIdentityKnown = rendererText.length > 0;
  const hardwareWebGl = gpuIdentityKnown
    && !/swiftshader|software|llvmpipe|\bwarp\b|microsoft basic render/i.test(rendererText);
  check('HTTP response is successful', response?.ok(), response?.status() ?? null, '2xx');
  check('v84 game wrapper is loaded', startup.version === 'v84-mobile-hold-title', startup.version, 'v84-mobile-hold-title');
  check('GLIDE reports ready', startup.ready === '1', startup.ready, '1');
  check('No runtime/browser/resource failures', failures.length === 0, failures, '[]');
  check('Hardware WebGL identity is available', gpuIdentityKnown, startup.gpu, 'non-empty vendor or renderer');
  check('Hardware WebGL is active', hardwareWebGl, startup.gpu, 'not SwiftShader/software/WARP');
  check('Requested viewport is active',
    startup.viewport.innerWidth === options.width && startup.viewport.innerHeight === options.height,
    startup.viewport,
    { width: options.width, height: options.height });
  check('Browser DPR matches requested DPR',
    Math.abs(startup.viewport.devicePixelRatio - options.dpr) < 0.01,
    startup.viewport.devicePixelRatio,
    options.dpr);
  check('Renderer DPR matches the intentional 1x cap',
    Math.abs(startup.renderer.pixelRatio - expectedRenderDpr) < 0.01,
    startup.renderer.pixelRatio,
    expectedRenderDpr);
  check('Composer DPR matches renderer DPR',
    Math.abs(startup.composer.pixelRatio - startup.renderer.pixelRatio) < 0.01,
    startup.composer.pixelRatio,
    startup.renderer.pixelRatio);
  check('Default start is grounded',
    startup.player?.state === 'ground' && Math.abs(startup.player?.groundGap ?? Infinity) <= 0.75,
    { state: startup.player?.state, groundGap: round(startup.player?.groundGap) },
    'state=ground and |groundGap| <= 0.75');
  if (options.forceRain) {
    check('Forced-rain stress is active',
      startup.weather?.wetness === 1 && startup.weather?.wetTarget === 1,
      startup.weather,
      'wetness=1 and wetTarget=1');
  }
  check('Cold ready signal arrives within 6 s', readyWallMs <= 6000,
    round(readyWallMs), '<= 6000 ms');
  check('Cold staged scene completes within 10 s', coldCompleteWallMs <= 10_000,
    round(coldCompleteWallMs), '<= 10000 ms');
  check('No cold main-thread task exceeds 4 s', summarizeLongTasks(coldTasks).maxMs <= 4000,
    summarizeLongTasks(coldTasks).maxMs, '<= 4000 ms');
  check('Idle median frame is within one 60 Hz frame', idle.frames.medianMs <= 17.5,
    idle.frames.medianMs, '<= 17.5 ms');
  check('Idle p95 stays below 25 ms', idle.frames.p95Ms <= 25,
    idle.frames.p95Ms, '<= 25 ms');
  check('Idle has no major hitch', idle.frames.maxMs <= 100,
    idle.frames.maxMs, '<= 100 ms');
  check('Initial world queue drains during idle', idle.after.world.queue === 0,
    idle.after.world.queue, '0');
  check('Instanced scene draw calls stay bounded', idle.renderedFrame.calls <= 750,
    idle.renderedFrame.calls, '<= 750 calls');
  check('Forest/scatter instancing is active', idle.after.scene.instancedMeshes >= 300,
    idle.after.scene.instancedMeshes, '>= 300 instanced meshes');
  check('Streaming median stays below 18.5 ms', stream.frames.medianMs <= 18.5,
    stream.frames.medianMs, '<= 18.5 ms');
  check('Streaming p95 stays below 34 ms', stream.frames.p95Ms <= 34,
    stream.frames.p95Ms, '<= 34 ms');
  check('Streaming p99 stays below 75 ms', stream.frames.p99Ms <= 75,
    stream.frames.p99Ms, '<= 75 ms');
  check('Streaming hitches stay below 100 ms', stream.frames.maxMs <= 100,
    stream.frames.maxMs, '<= 100 ms');
  check('Real W remains held for the streaming phase',
    stream.input.wHeldFrames === stream.input.samples
      && stream.input.forwardMoveFrames === stream.input.samples,
    stream.input,
    'W held and forward input active for every sample');
  check('W produces sustained streaming movement', stream.movement.pathDistanceHorizontal >= 20,
    stream.movement.pathDistanceHorizontal, '>= 20 world units along path');
  check('W crosses multiple world chunks', stream.streaming.chunkKeys.length >= 2,
    stream.streaming.chunkKeys, '>= 2 chunk keys');
  check('Warm W remains held',
    warm.input.wHeldFrames === warm.input.samples
      && warm.input.forwardMoveFrames === warm.input.samples,
    warm.input,
    'W held and forward input active for every sample');
  check('Warm movement remains active', warm.movement.pathDistanceHorizontal >= 20,
    warm.movement.pathDistanceHorizontal, '>= 20 world units along path');
  check('Warm median stays below 18.5 ms', warm.frames.medianMs <= 18.5,
    warm.frames.medianMs, '<= 18.5 ms');
  check('Warm p95 stays below 34 ms', warm.frames.p95Ms <= 34,
    warm.frames.p95Ms, '<= 34 ms');
  check('Warm p99 stays below 75 ms', warm.frames.p99Ms <= 75,
    warm.frames.p99Ms, '<= 75 ms');
  check('Warm phase sustains at least 55 fps', warm.frames.fps >= 55,
    warm.frames.fps, '>= 55 fps');
  check('Warm hitches stay below 100 ms', warm.frames.maxMs <= 100,
    warm.frames.maxMs, '<= 100 ms');
  check('Warm long-task budget stays below 100 ms', warm.longTasks.totalMs <= 100,
    warm.longTasks.totalMs, '<= 100 ms');

  report = {
    schema: 'glide-performance-check/v1',
    passed: checks.every((item) => item.pass),
    capturedAt: new Date().toISOString(),
    config: options,
    cold: {
      domContentLoadedWallMs: round(domContentLoadedWallMs),
      readyWallMs: round(readyWallMs),
      readyPageMs: round(readyPageMs),
      contentBuiltPageMs: round(contentBuiltPageMs),
      completeWallMs: round(coldCompleteWallMs),
      completePageMs: round(coldCompletePageMs),
      firstRafMs: round(probe.firstRafMs),
      navigation: probe.navigation,
      paint: probe.paint,
      longTasks: summarizeLongTasks(coldTasks),
      longAnimationFrames: summarizeLongAnimationFrames(
        probe.longAnimationFrames.filter((frame) => frame.startTime <= coldCompletePageMs),
      ),
    },
    startup,
    phases: { idle, stream, warm },
    final,
    failures,
    checks,
  };

  await context.close();
  context = null;
} catch (error) {
  let pageState = null;
  let probeFailures = [];
  if (page && !page.isClosed()) {
    pageState = await page.evaluate(() => ({
      href: location.href,
      title: document.title,
      version: document.documentElement.dataset.glideVersion || null,
      ready: document.documentElement.dataset.glideReady || null,
      runtimeError: document.documentElement.dataset.glideRuntimeError || null,
      hasGame: Boolean(window.__GAME),
      motionPatchVersion: window.__GAME?.__glideMotionPatchVersion || null,
      destinations: window.__GAME?.__worldExpansion?.destinations?.length ?? null,
      playerState: window.__GAME?.player?.state ?? null,
    })).catch((snapshotError) => ({ snapshotError: String(snapshotError) }));
    probeFailures = await page.evaluate(
      () => window.__GLIDE_PERFORMANCE_PROBE__?.failures || [],
    ).catch(() => []);
  }
  report = {
    schema: 'glide-performance-check/v1',
    passed: false,
    capturedAt: new Date().toISOString(),
    config: options,
    fatal: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      pageState,
    },
    failures: [...browserFailures, ...probeFailures],
    checks,
  };
} finally {
  if (context) await context.close().catch(() => {});
  await browser.close();
}

if (options.output) {
  const outputPath = resolve(options.output);
  report.reportPath = outputPath;
  try {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  } catch (error) {
    report.failures = report.failures || [];
    report.failures.push({ type: 'report-write', message: String(error) });
    report.passed = false;
  }
}

const compactPhase = (phaseReport) => phaseReport
  ? {
    medianMs: phaseReport.frames.medianMs,
    p95Ms: phaseReport.frames.p95Ms,
    p99Ms: phaseReport.frames.p99Ms,
    maxMs: phaseReport.frames.maxMs,
    fps: phaseReport.frames.fps,
    longTaskTotalMs: phaseReport.longTasks.totalMs,
    longAnimationFrameCount: phaseReport.longAnimationFrames.count,
    longAnimationBlockingMs: phaseReport.longAnimationFrames.totalBlockingMs,
    chunkKeys: phaseReport.streaming.chunkKeys,
    chunkKeySequence: phaseReport.streaming.chunkKeySequence,
    queueMax: phaseReport.streaming.queueMax,
    activationQueueMax: phaseReport.streaming.activationQueueMax,
    visibleChunksMin: phaseReport.streaming.visibleChunksMin,
    visibleChunksMax: phaseReport.streaming.visibleChunksMax,
    desiredVisibleMin: phaseReport.streaming.desiredVisibleMin,
    desiredVisibleMax: phaseReport.streaming.desiredVisibleMax,
    pondSurface: phaseReport.pondSurface,
    calls: phaseReport.renderedFrame.calls,
    triangles: phaseReport.renderedFrame.triangles,
    heapUsedBeforeBytes: phaseReport.before.heap?.usedBytes ?? null,
    heapUsedAfterBytes: phaseReport.after.heap?.usedBytes ?? null,
    weatherBefore: phaseReport.before.weather,
    weatherAfter: phaseReport.after.weather,
    adaptiveBefore: phaseReport.before.adaptive,
    adaptiveAfter: phaseReport.after.adaptive,
  }
  : null;
console.log(`GLIDE_PERF_SUMMARY ${JSON.stringify({
  passed: report.passed,
  url: report.config?.url,
  reportPath: report.reportPath || null,
  coldCompleteMs: report.cold?.completeWallMs ?? null,
  coldLongTaskTotalMs: report.cold?.longTasks?.totalMs ?? null,
  rendererDpr: report.startup?.renderer?.pixelRatio ?? null,
  composerDpr: report.startup?.composer?.pixelRatio ?? null,
  groundedStart: report.startup?.player
    ? { state: report.startup.player.state, gap: round(report.startup.player.groundGap) }
    : null,
  idle: compactPhase(report.phases?.idle),
  stream: compactPhase(report.phases?.stream),
  warm: compactPhase(report.phases?.warm),
  failedChecks: report.checks?.filter((item) => !item.pass).map((item) => item.name) || [],
  fatal: report.fatal?.message || null,
})}`);
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
