const TAU = Math.PI * 2;

const QUALITY_PRESETS = Object.freeze({
  low: Object.freeze({
    maxStrands: 9,
    maxDroplets: 22,
    maxSmears: 5,
    strandBurst: 1.35,
    dropletBurst: 3.2,
    maxDpr: 1.2,
    glints: 0.45
  }),
  medium: Object.freeze({
    maxStrands: 17,
    maxDroplets: 40,
    maxSmears: 8,
    strandBurst: 2.1,
    dropletBurst: 5.2,
    maxDpr: 1.5,
    glints: 0.72
  }),
  high: Object.freeze({
    maxStrands: 28,
    maxDroplets: 64,
    maxSmears: 12,
    strandBurst: 3,
    dropletBurst: 7.4,
    maxDpr: 1.8,
    glints: 1
  })
});

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

function smoothstep(minimum, maximum, value) {
  const amount = clamp((value - minimum) / Math.max(0.00001, maximum - minimum), 0, 1);
  return amount * amount * (3 - 2 * amount);
}

function lifeEnvelope(age, lifetime, fadeStart = 0.68) {
  const life = clamp(age / Math.max(0.001, lifetime), 0, 1);
  const enter = smoothstep(0, 0.055, life);
  const exit = 1 - smoothstep(fadeStart, 1, life);
  return enter * exit;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeQuality(value) {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "high";
}

function colorBetween(first, second, amount, alpha) {
  const t = clamp(amount, 0, 1);
  const red = Math.round(lerp(first[0], second[0], t));
  const green = Math.round(lerp(first[1], second[1], t));
  const blue = Math.round(lerp(first[2], second[2], t));
  return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`;
}

function cubicPoint(a, b, c, d, amount) {
  const inverse = 1 - amount;
  return inverse * inverse * inverse * a +
    3 * inverse * inverse * amount * b +
    3 * inverse * amount * amount * c +
    amount * amount * amount * d;
}

function boundedPush(list, item, maximum, counters) {
  if (list.length >= maximum) {
    list.shift();
    counters.recycled += 1;
  }
  list.push(item);
}

/**
 * Creates a transparent Canvas2D lens-contamination overlay.
 *
 * The module owns no animation loop. Call update(dt, time, motion) from the
 * game's existing frame loop. Coordinates passed to splat() are normalized by
 * default, which makes existing contamination survive responsive resizes.
 */
export function createCameraSpaghetti(options = {}) {
  if (!options || typeof options !== "object") options = {};
  const candidateDocument = options.document || options.canvas?.ownerDocument || globalThis.document;
  const explicitCanvas = typeof options.canvas === "string"
    ? candidateDocument?.querySelector?.(options.canvas)
    : options.canvas;
  const documentRef = options.document || explicitCanvas?.ownerDocument || candidateDocument;
  if (!documentRef?.createElement) {
    throw new Error("createCameraSpaghetti requires a browser document");
  }

  const windowRef = documentRef.defaultView || globalThis.window;
  const existingCanvas = explicitCanvas || documentRef.querySelector?.("#camera-spaghetti");
  const canvas = existingCanvas || documentRef.createElement("canvas");
  const ownsCanvas = !existingCanvas;

  if (ownsCanvas) {
    const requestedParent = typeof options.parent === "string"
      ? documentRef.querySelector?.(options.parent)
      : options.parent;
    const parent = requestedParent || documentRef.querySelector?.("#fx") || documentRef.body || documentRef.documentElement;
    canvas.id = options.id || "camera-spaghetti";
    canvas.style.position = parent === documentRef.body ? "fixed" : "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.zIndex = String(finite(options.zIndex, 3));
    parent.appendChild(canvas);
  }

  canvas.setAttribute("aria-hidden", "true");
  canvas.setAttribute("role", "presentation");
  canvas.tabIndex = -1;
  canvas.style.pointerEvents = "none";
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  canvas.style.webkitUserSelect = "none";
  canvas.style.contain = "strict";

  const context = canvas.getContext("2d", {
    alpha: true,
    desynchronized: true
  });
  if (!context) {
    if (ownsCanvas) canvas.remove();
    throw new Error("Camera spaghetti needs Canvas2D support");
  }

  const quality = normalizeQuality(options.quality);
  const preset = QUALITY_PRESETS[quality];
  const random = mulberry32(finite(Number(options.seed), 481516234));
  const reducedMotion = options.reducedMotion ?? Boolean(
    windowRef?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  );
  const motionScale = reducedMotion ? 0.42 : 1;
  const settings = Object.freeze({
    maxStrands: clamp(Math.round(finite(options.maxStrands, preset.maxStrands)), 1, 64),
    maxDroplets: clamp(Math.round(finite(options.maxDroplets, preset.maxDroplets)), 1, 120),
    maxSmears: clamp(Math.round(finite(options.maxSmears, preset.maxSmears)), 1, 24),
    strandBurst: preset.strandBurst,
    dropletBurst: preset.dropletBurst,
    maxDpr: clamp(finite(options.maxDpr, preset.maxDpr), 0.75, 2.5),
    glints: reducedMotion ? preset.glints * 0.72 : preset.glints
  });

  const strands = [];
  const droplets = [];
  const smears = [];
  const counters = {
    totalSplats: 0,
    totalStrands: 0,
    totalDroplets: 0,
    totalSmears: 0,
    recycled: 0,
    frames: 0,
    resizeCount: 0
  };

  let width = 1;
  let height = 1;
  let minimumDimension = 1;
  let pixelRatio = 1;
  let elapsed = 0;
  let nextId = 1;
  let hadContent = false;
  let destroyed = false;
  let resizeFrame = 0;
  let lastRenderMs = 0;

  function resize(nextWidth, nextHeight, nextDpr) {
    if (destroyed) return getStats();

    const clientWidth = finite(canvas.clientWidth, 0);
    const clientHeight = finite(canvas.clientHeight, 0);
    width = Math.max(1, finite(Number(nextWidth), clientWidth || windowRef?.innerWidth || 1));
    height = Math.max(1, finite(Number(nextHeight), clientHeight || windowRef?.innerHeight || 1));
    minimumDimension = Math.max(1, Math.min(width, height));
    pixelRatio = clamp(
      finite(Number(nextDpr), finite(windowRef?.devicePixelRatio, 1)),
      0.5,
      settings.maxDpr
    );

    const bufferWidth = Math.max(1, Math.round(width * pixelRatio));
    const bufferHeight = Math.max(1, Math.round(height * pixelRatio));
    if (canvas.width !== bufferWidth) canvas.width = bufferWidth;
    if (canvas.height !== bufferHeight) canvas.height = bufferHeight;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    counters.resizeCount += 1;
    hadContent = strands.length + droplets.length + smears.length > 0;
    return getStats();
  }

  function resolveSplatPosition(config) {
    let x = finite(Number(config.x), 0.08 + random() * 0.84);
    let y = finite(Number(config.y), 0.07 + random() * 0.72);
    if (config.space === "pixels" || config.normalized === false) {
      x /= Math.max(1, width);
      y /= Math.max(1, height);
    }
    return {
      x: clamp(x, -0.08, 1.08),
      y: clamp(y, -0.08, 1.08)
    };
  }

  function createStrand(id, x, y, angle, intensity, wetness, sauce) {
    const localAngle = angle + (random() - 0.5) * 1.15;
    const length = lerp(0.095, 0.285, random()) * lerp(0.82, 1.28, clamp(intensity, 0, 1));
    const offset = (random() - 0.5) * 0.035 * intensity;
    return {
      id,
      x: x + Math.cos(localAngle + Math.PI * 0.5) * offset,
      y: y + Math.sin(localAngle + Math.PI * 0.5) * offset * (width / Math.max(1, height)),
      dx: Math.cos(localAngle) * length,
      dy: Math.sin(localAngle) * length * 0.62,
      width: lerp(0.0052, 0.0105, random()) * lerp(0.88, 1.16, intensity),
      sag: lerp(0.006, 0.018, random()),
      sagVelocity: 0,
      slideSpeed: lerp(0.0015, 0.0065, random()) * lerp(0.7, 1.35, wetness),
      drift: (random() - 0.5) * 0.003,
      wetness,
      sauce: clamp(sauce + (random() - 0.5) * 0.14, 0, 1),
      phase: random() * TAU,
      wobble: lerp(0.002, 0.009, random()) * motionScale,
      glintAt: lerp(0.28, 0.72, random()),
      age: 0,
      lifetime: lerp(4.2, 8.8, wetness) * lerp(0.84, 1.18, random())
    };
  }

  function createDroplet(id, x, y, intensity, wetness, sauce) {
    const scatter = lerp(0.018, 0.115, random()) * intensity;
    const scatterAngle = random() * TAU;
    return {
      id,
      x: x + Math.cos(scatterAngle) * scatter,
      y: y + Math.sin(scatterAngle) * scatter * (width / Math.max(1, height)),
      radius: lerp(0.0035, 0.0155, random()) * lerp(0.8, 1.24, intensity),
      stretch: lerp(1.05, 2.35, random()),
      angle: lerp(-0.34, 0.34, random()),
      slideSpeed: lerp(0.003, 0.022, random()) * lerp(0.72, 1.42, wetness),
      wetness,
      sauce: clamp(sauce + (random() - 0.5) * 0.24, 0, 1),
      phase: random() * TAU,
      glint: random() < settings.glints,
      age: 0,
      lifetime: lerp(2.6, 6.5, wetness) * lerp(0.82, 1.2, random())
    };
  }

  function createSmear(id, x, y, intensity, wetness, sauce) {
    return {
      id,
      x: x + (random() - 0.5) * 0.04 * intensity,
      y: y + (random() - 0.5) * 0.04 * intensity,
      radius: lerp(0.032, 0.102, random()) * lerp(0.82, 1.22, intensity),
      stretch: lerp(0.48, 1.65, random()),
      angle: random() * TAU,
      opacity: lerp(0.34, 0.72, random()),
      wetness,
      sauce: clamp(sauce + (random() - 0.5) * 0.16, 0, 1),
      phase: random() * TAU,
      age: 0,
      lifetime: lerp(6.5, 12.5, wetness) * lerp(0.85, 1.15, random())
    };
  }

  function splat(config = {}) {
    if (destroyed) return { id: null, strands: 0, droplets: 0, smears: 0 };
    if (Number.isFinite(config)) config = { intensity: Number(config) };
    else if (!config || typeof config !== "object") config = {};

    const position = resolveSplatPosition(config);
    const intensity = clamp(finite(Number(config.intensity), 0.72), 0.05, 1.5);
    const wetness = clamp(finite(Number(config.wetness), 0.9), 0, 1);
    const sauce = clamp(finite(Number(config.sauce), 0.34), 0, 1);
    const directionX = finite(Number(config.directionX), 0);
    const directionY = finite(Number(config.directionY), 1);
    const providedAngle = Number(config.angle);
    const angle = Number.isFinite(providedAngle)
      ? providedAngle
      : Math.hypot(directionX, directionY) > 0.0001
        ? Math.atan2(directionY, directionX)
        : random() * TAU;
    const eventId = nextId++;

    const strandCount = clamp(
      Math.round(settings.strandBurst * intensity * lerp(0.78, 1.22, random())),
      intensity > 0.18 ? 1 : 0,
      6
    );
    const dropletCount = clamp(
      Math.round(settings.dropletBurst * intensity * lerp(0.78, 1.25, random())),
      1,
      14
    );
    const smearCount = sauce > 0.12 && random() < 0.4 + intensity * 0.38 ? 1 : 0;

    for (let index = 0; index < smearCount; index += 1) {
      boundedPush(
        smears,
        createSmear(eventId, position.x, position.y, intensity, wetness, sauce),
        settings.maxSmears,
        counters
      );
    }
    for (let index = 0; index < strandCount; index += 1) {
      boundedPush(
        strands,
        createStrand(eventId, position.x, position.y, angle, intensity, wetness, sauce),
        settings.maxStrands,
        counters
      );
    }
    for (let index = 0; index < dropletCount; index += 1) {
      boundedPush(
        droplets,
        createDroplet(eventId, position.x, position.y, intensity, wetness, sauce),
        settings.maxDroplets,
        counters
      );
    }

    counters.totalSplats += 1;
    counters.totalStrands += strandCount;
    counters.totalDroplets += dropletCount;
    counters.totalSmears += smearCount;
    hadContent = true;

    return {
      id: eventId,
      x: position.x,
      y: position.y,
      strands: strandCount,
      droplets: dropletCount,
      smears: smearCount
    };
  }

  function updateStrands(dt, motionX, motionY, gravityX, gravityY) {
    const widthScale = minimumDimension / Math.max(1, width);
    const heightScale = minimumDimension / Math.max(1, height);
    for (let index = strands.length - 1; index >= 0; index -= 1) {
      const strand = strands[index];
      strand.age += dt;
      if (strand.age >= strand.lifetime || strand.y > 1.24) {
        strands.splice(index, 1);
        continue;
      }

      const strandLength = Math.hypot(strand.dx, strand.dy);
      const targetSag = (0.012 + strandLength * 0.17) * (1 + strand.wetness * 0.28) + Math.max(0, gravityY) * 0.008;
      const spring = reducedMotion ? 7.5 : 11.5;
      strand.sagVelocity += (targetSag - strand.sag) * spring * dt;
      strand.sagVelocity += (0.004 + strand.wetness * 0.009 + Math.abs(motionY) * 0.003) * dt;
      strand.sagVelocity *= Math.exp(-(reducedMotion ? 9 : 6.5) * dt);
      strand.sag = clamp(strand.sag + strand.sagVelocity * dt, 0, 0.14);
      strand.x += (strand.drift + motionX * 0.004 + gravityX * 0.002) * dt * widthScale;
      strand.y += strand.slideSpeed * dt * heightScale;
    }
  }

  function updateDroplets(dt, motionX, gravityX, gravityY) {
    const widthScale = minimumDimension / Math.max(1, width);
    const heightScale = minimumDimension / Math.max(1, height);
    for (let index = droplets.length - 1; index >= 0; index -= 1) {
      const droplet = droplets[index];
      droplet.age += dt;
      if (droplet.age >= droplet.lifetime || droplet.y > 1.18) {
        droplets.splice(index, 1);
        continue;
      }
      const release = smoothstep(0.06, 0.42, droplet.age / droplet.lifetime);
      const wobble = Math.sin(elapsed * 1.7 + droplet.phase) * 0.0011 * motionScale;
      droplet.x += (motionX * 0.003 + gravityX * 0.0015 + wobble) * dt * widthScale;
      droplet.y += droplet.slideSpeed * (0.5 + release * 0.8 + Math.max(0, gravityY) * 0.18) * dt * heightScale;
    }
  }

  function updateSmears(dt, motionX, gravityY) {
    const widthScale = minimumDimension / Math.max(1, width);
    const heightScale = minimumDimension / Math.max(1, height);
    for (let index = smears.length - 1; index >= 0; index -= 1) {
      const smear = smears[index];
      smear.age += dt;
      if (smear.age >= smear.lifetime || smear.y > 1.22) {
        smears.splice(index, 1);
        continue;
      }
      smear.x += motionX * 0.0005 * dt * widthScale;
      smear.y += (0.00035 + smear.wetness * 0.0008 + Math.max(0, gravityY) * 0.0005) * dt * heightScale;
    }
  }

  function buildStrandPath(strand) {
    const startX = strand.x * width;
    const startY = strand.y * height;
    const deltaX = strand.dx * minimumDimension;
    const deltaY = strand.dy * minimumDimension;
    const endX = startX + deltaX;
    const endY = startY + deltaY;
    const measuredLength = Math.max(0.001, Math.hypot(deltaX, deltaY));
    const perpendicularX = -deltaY / measuredLength;
    const perpendicularY = deltaX / measuredLength;
    const wobble = Math.sin(elapsed * 1.2 + strand.phase) * strand.wobble * minimumDimension;
    const sag = strand.sag * minimumDimension;
    const control1X = startX + deltaX * 0.31 + perpendicularX * wobble;
    const control1Y = startY + deltaY * 0.31 + perpendicularY * wobble + sag;
    const control2X = startX + deltaX * 0.69 - perpendicularX * wobble * 0.55;
    const control2Y = startY + deltaY * 0.69 - perpendicularY * wobble * 0.55 + sag * 1.12;
    context.beginPath();
    context.moveTo(startX, startY);
    context.bezierCurveTo(control1X, control1Y, control2X, control2Y, endX, endY);
    return {
      startX,
      startY,
      control1X,
      control1Y,
      control2X,
      control2Y,
      endX,
      endY
    };
  }

  function drawSmear(smear) {
    const alpha = lifeEnvelope(smear.age, smear.lifetime, 0.58) * smear.opacity;
    if (alpha <= 0.002) return;
    const radius = smear.radius * minimumDimension;
    const centerX = smear.x * width;
    const centerY = smear.y * height;
    const oily = [211, 141, 50];
    const tomato = [118, 34, 12];

    context.save();
    context.translate(centerX, centerY);
    context.rotate(smear.angle);
    context.scale(1, smear.stretch);
    const gradient = context.createRadialGradient(-radius * 0.16, -radius * 0.18, radius * 0.03, 0, 0, radius);
    gradient.addColorStop(0, colorBetween([255, 205, 106], tomato, smear.sauce * 0.52, alpha * 0.58));
    gradient.addColorStop(0.36, colorBetween(oily, tomato, smear.sauce, alpha * 0.34));
    gradient.addColorStop(0.78, colorBetween(oily, tomato, smear.sauce, alpha * 0.12));
    gradient.addColorStop(1, "rgba(77, 26, 5, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(0, 0, radius, radius * 0.72, 0, 0, TAU);
    context.fill();

    context.globalCompositeOperation = "screen";
    context.strokeStyle = `rgba(255, 225, 153, ${alpha * 0.2})`;
    context.lineWidth = Math.max(0.7, radius * 0.035);
    context.beginPath();
    context.ellipse(-radius * 0.12, -radius * 0.12, radius * 0.68, radius * 0.43, 0, Math.PI * 1.04, Math.PI * 1.76);
    context.stroke();
    context.restore();
  }

  function drawStrand(strand) {
    const alpha = lifeEnvelope(strand.age, strand.lifetime, 0.72);
    if (alpha <= 0.002) return;
    const noodleWidth = Math.max(2.1, strand.width * minimumDimension);
    const oily = [202, 123, 32];
    const tomato = [119, 37, 12];

    context.save();
    context.lineCap = "round";
    context.lineJoin = "round";
    // Canvas2D retains the current path across stroke() calls, so build the
    // bezier once and re-stroke it for each layer instead of rebuilding the
    // identical path (and allocating a throwaway curve object) four times.
    const curve = buildStrandPath(strand);
    context.strokeStyle = `rgba(42, 16, 3, ${alpha * 0.32})`;
    context.lineWidth = noodleWidth + 4.2;
    context.stroke();

    if (strand.sauce > 0.08) {
      context.strokeStyle = colorBetween(oily, tomato, strand.sauce, alpha * 0.72);
      context.lineWidth = noodleWidth + 1.55;
      context.stroke();
    }

    context.strokeStyle = colorBetween([218, 145, 44], [173, 71, 18], strand.sauce * 0.68, alpha * 0.94);
    context.lineWidth = noodleWidth;
    context.stroke();

    context.globalCompositeOperation = "screen";
    context.strokeStyle = `rgba(255, 226, 145, ${alpha * (0.24 + strand.wetness * 0.26)})`;
    context.lineWidth = Math.max(0.75, noodleWidth * 0.27);
    context.stroke();

    if (settings.glints > 0.5 && strand.wetness > 0.42) {
      const pulse = 0.55 + Math.sin(elapsed * 3.1 + strand.phase) * 0.45;
      const amount = strand.glintAt;
      const glintX = cubicPoint(curve.startX, curve.control1X, curve.control2X, curve.endX, amount);
      const glintY = cubicPoint(curve.startY, curve.control1Y, curve.control2Y, curve.endY, amount);
      context.fillStyle = `rgba(255, 248, 222, ${alpha * pulse * 0.48})`;
      context.beginPath();
      context.ellipse(glintX, glintY, noodleWidth * 0.75, Math.max(0.7, noodleWidth * 0.2), -0.4, 0, TAU);
      context.fill();
    }
    context.restore();
  }

  function drawDroplet(droplet) {
    const alpha = lifeEnvelope(droplet.age, droplet.lifetime, 0.64);
    if (alpha <= 0.002) return;
    const radius = Math.max(1.5, droplet.radius * minimumDimension);
    const centerX = droplet.x * width;
    const centerY = droplet.y * height;
    const oily = [216, 146, 52];
    const tomato = [119, 36, 13];

    context.save();
    context.translate(centerX, centerY);
    context.rotate(droplet.angle);
    context.scale(1, droplet.stretch);
    const gradient = context.createRadialGradient(-radius * 0.24, -radius * 0.28, radius * 0.08, 0, 0, radius * 1.08);
    gradient.addColorStop(0, colorBetween([255, 229, 158], tomato, droplet.sauce * 0.28, alpha * 0.84));
    gradient.addColorStop(0.31, colorBetween(oily, tomato, droplet.sauce, alpha * 0.65));
    gradient.addColorStop(0.78, colorBetween([145, 75, 19], tomato, droplet.sauce, alpha * 0.5));
    gradient.addColorStop(1, "rgba(52, 16, 3, 0)");
    context.fillStyle = gradient;
    context.strokeStyle = `rgba(72, 25, 4, ${alpha * 0.36})`;
    context.lineWidth = Math.max(0.55, radius * 0.075);
    context.beginPath();
    context.moveTo(0, -radius * 1.2);
    context.bezierCurveTo(radius * 0.9, -radius * 0.42, radius, radius * 0.75, 0, radius);
    context.bezierCurveTo(-radius, radius * 0.75, -radius * 0.9, -radius * 0.42, 0, -radius * 1.2);
    context.closePath();
    context.fill();
    context.stroke();

    if (droplet.glint) {
      context.globalCompositeOperation = "screen";
      context.strokeStyle = `rgba(255, 246, 216, ${alpha * (0.34 + droplet.wetness * 0.34)})`;
      context.lineWidth = Math.max(0.7, radius * 0.12);
      context.beginPath();
      context.arc(-radius * 0.18, -radius * 0.2, radius * 0.44, Math.PI * 1.08, Math.PI * 1.72);
      context.stroke();
    }
    context.restore();
  }

  function update(dt = 0, time, motion = {}) {
    if (destroyed) return getStats();
    if (time && typeof time === "object") {
      motion = time;
      time = undefined;
    }
    if (!motion || typeof motion !== "object") motion = {};
    const started = globalThis.performance?.now?.() || 0;
    const safeDt = clamp(finite(Number(dt), 0), 0, 0.08);
    elapsed = Number.isFinite(time) ? Number(time) : elapsed + safeDt;
    const motionX = clamp(finite(Number(motion.motionX), finite(Number(motion.x), 0)), -2, 2) * motionScale;
    const motionY = clamp(finite(Number(motion.motionY), finite(Number(motion.y), 0)), -2, 2) * motionScale;
    const gravityX = clamp(finite(Number(motion.gravityX), 0), -1, 1) * motionScale;
    const gravityY = clamp(finite(Number(motion.gravityY), 1), -1, 1);

    updateStrands(safeDt, motionX, motionY, gravityX, gravityY);
    updateDroplets(safeDt, motionX, gravityX, gravityY);
    updateSmears(safeDt, motionX, gravityY);

    const active = strands.length + droplets.length + smears.length;
    if (!active) {
      if (hadContent) {
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, width, height);
        hadContent = false;
      }
      counters.frames += 1;
      lastRenderMs = Math.max(0, (globalThis.performance?.now?.() || started) - started);
      return getStats();
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
    for (const smear of smears) drawSmear(smear);
    for (const strand of strands) drawStrand(strand);
    for (const droplet of droplets) drawDroplet(droplet);
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
    hadContent = true;
    counters.frames += 1;
    lastRenderMs = Math.max(0, (globalThis.performance?.now?.() || started) - started);
    return getStats();
  }

  function clear() {
    strands.length = 0;
    droplets.length = 0;
    smears.length = 0;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    hadContent = false;
    return getStats();
  }

  function getStats() {
    return {
      quality,
      reducedMotion,
      width,
      height,
      pixelRatio,
      activeStrands: strands.length,
      activeDroplets: droplets.length,
      activeSmears: smears.length,
      activeMarks: strands.length + droplets.length + smears.length,
      maximumMarks: settings.maxStrands + settings.maxDroplets + settings.maxSmears,
      totalSplats: counters.totalSplats,
      totalStrands: counters.totalStrands,
      totalDroplets: counters.totalDroplets,
      totalSmears: counters.totalSmears,
      recycledMarks: counters.recycled,
      frames: counters.frames,
      resizeCount: counters.resizeCount,
      lastRenderMs: Number(lastRenderMs.toFixed(3)),
      attached: canvas.isConnected,
      destroyed
    };
  }

  function scheduleResize() {
    if (destroyed || resizeFrame) return;
    if (typeof windowRef?.requestAnimationFrame === "function") {
      resizeFrame = windowRef.requestAnimationFrame(() => {
        resizeFrame = 0;
        resize();
      });
    } else {
      resize();
    }
  }

  function destroy() {
    if (destroyed) return;
    clear();
    destroyed = true;
    if (resizeFrame && typeof windowRef?.cancelAnimationFrame === "function") {
      windowRef.cancelAnimationFrame(resizeFrame);
    }
    resizeFrame = 0;
    windowRef?.removeEventListener?.("resize", scheduleResize);
    windowRef?.removeEventListener?.("orientationchange", scheduleResize);
    if (ownsCanvas || options.removeCanvasOnDestroy) canvas.remove();
  }

  if (options.autoResize !== false) {
    windowRef?.addEventListener?.("resize", scheduleResize, { passive: true });
    windowRef?.addEventListener?.("orientationchange", scheduleResize, { passive: true });
  }
  resize(options.width, options.height, options.dpr);

  return Object.freeze({
    canvas,
    resize,
    update,
    clear,
    splat,
    getStats,
    destroy
  });
}

export default createCameraSpaghetti;
