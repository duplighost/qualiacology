(() => {
  'use strict';

  const W = 720;
  const H = 1080;
  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => {
    const n = clamp(t, 0, 1);
    return n * n * (3 - 2 * n);
  };
  const wrap = (value, range) => ((value % range) + range) % range;
  const hash = (value) => {
    const n = Math.sin(value * 127.1 + 311.7) * 43758.5453123;
    return n - Math.floor(n);
  };
  const BACKGROUND_FPS = 30;
  const FIELD_ENEMY_DISPLAY_SCALE = 1.07;
  // Zone II hierarchy is carried by the visible body, not a larger damage
  // radius: moths remain a flock while bulbs and hounds own the composition.
  const FIELD_ENEMY_SPECIES_SCALE = Object.freeze({
    milkmoth: .96,
    pendulumbulb: 1.22,
    prunerhand: 1.08,
    grafthound: 1.24
  });
  const PLAYER_CLEAR_RADIUS = 155;
  const PLAYER_HIT_PULSE_MAX = .5;
  const PLAYER_CLEAR_DURATION = .42;
  const PLAYER_INVULN_DURATION = 2.45;
  const ATTACK_BRACE_WINDOW = .28;
  const BACKDROP_ATMOSPHERE_COLORS = Object.freeze([
    [126, 225, 231], [190, 241, 157], [241, 116, 87],
    [175, 241, 229], [236, 103, 76], [132, 229, 255]
  ]);
  const backgroundCaches = new Map();
  const backdropCaches = new Map();
  const backdropAtmosphereProfiles = new Map();

  // The renderer is deliberately hybrid: authored high-resolution plates and
  // creatures establish material reality, while Canvas remains responsible for
  // motion, lighting, telegraphs, damage and gameplay readability.
  const zoneArt = Object.freeze([
    Object.freeze({
      plate: loadArtImage('assets/world/zone-1-low-tide-under-heaven-v2.png', true),
      foreground: loadArtImage('assets/world/zone-1-foreground-parallax-v3.png', true),
      enemies: loadArtImage('assets/zone-1-enemy-atlas-v2.png', true),
      boss: loadArtImage('assets/trawlmother-atlas-v2.png', true)
    }),
    Object.freeze({
      plate: loadArtImage('assets/world/zone-2-hanging-acre-v2.png'),
      foreground: loadArtImage('assets/world/zone-2-foreground-parallax-v3.png'),
      enemies: loadArtImage('assets/zone-2-enemy-atlas-v2.png'),
      boss: loadArtImage('assets/hundred-hand-gardener-atlas-v2.png')
    }),
    Object.freeze({
      plate: loadArtImage('assets/world/zone-3-spine-country-v2.png'),
      foreground: loadArtImage('assets/world/zone-3-foreground-parallax-v3.png'),
      enemies: loadArtImage('assets/zone-3-enemy-atlas-v2.png'),
      boss: loadArtImage('assets/cathedral-stag-atlas-v2.png')
    }),
    Object.freeze({
      plate: loadArtImage('assets/world/zone-4-lung-sea-v2.png'),
      foreground: loadArtImage('assets/world/zone-4-foreground-parallax-v3.png'),
      enemies: loadArtImage('assets/zone-4-enemy-atlas-v2.png'),
      boss: loadArtImage('assets/nine-throats-atlas-v2.png')
    }),
    Object.freeze({
      plate: loadArtImage('assets/world/zone-5-borrowed-city-v2.png'),
      foreground: loadArtImage('assets/world/zone-5-foreground-parallax-v3.png'),
      enemies: loadArtImage('assets/zone-5-enemy-atlas-v2.png'),
      boss: loadArtImage('assets/borrowed-city-boss-atlas-v2.png')
    }),
    Object.freeze({
      plate: loadArtImage('assets/world/zone-6-first-blue-v2.png'),
      foreground: loadArtImage('assets/world/zone-6-foreground-parallax-v3.png'),
      enemies: loadArtImage('assets/zone-6-enemy-atlas-v2.png'),
      boss: loadArtImage('assets/crown-louse-atlas-v2.png')
    })
  ]);
  const artImages = Object.freeze({
    lowTide: zoneArt[0].plate,
    petrel: loadArtImage('assets/petrel-v2.png', true),
    lowTideEnemies: zoneArt[0].enemies,
    trawlmother: zoneArt[0].boss
  });

  function loadArtImage(src, eager = false) {
    const image = new Image();
    image.decoding = 'async';
    image._rainSource = src;
    if (eager) image.src = src;
    return image;
  }

  function ensureArtImage(image) {
    if (image && !image.src && image._rainSource) image.src = image._rainSource;
    return image;
  }

  function activateZoneArt(zoneIndex, includeNext = false) {
    const indexes = includeNext ? [zoneIndex, zoneIndex + 1] : [zoneIndex];
    for (const index of indexes) {
      const bundle = zoneArt[index];
      if (!bundle) continue;
      ensureArtImage(bundle.plate);
      ensureArtImage(bundle.foreground);
      ensureArtImage(bundle.enemies);
      ensureArtImage(bundle.boss);
    }
  }

  function imageReady(image) {
    return !!(image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
  }

  function zoneArtReady(zoneIndex) {
    const bundle = zoneArt[zoneIndex];
    if (!bundle) return false;
    activateZoneArt(zoneIndex, false);
    return imageReady(bundle.plate) && imageReady(bundle.foreground) && imageReady(bundle.enemies) && imageReady(bundle.boss) && imageReady(artImages.petrel);
  }

  async function decodeZoneArt(zoneIndex) {
    const bundle = zoneArt[zoneIndex];
    if (!bundle) return false;
    activateZoneArt(zoneIndex, false);
    const images = [bundle.plate, bundle.foreground, bundle.enemies, bundle.boss, artImages.petrel];
    try {
      await Promise.all(images.map((image) => image.decode()));
    } catch (_) {
      // The boolean below remains the authority.  A rejected decode should
      // fail the QA barrier rather than leaking a one-frame fallback plate.
    }
    const ready = images.every(imageReady);
    if (ready) {
      // A synchronous QA jump may already have cached the procedural fallback
      // for this exact simulation tick.  Invalidate that one stale layer now
      // that the authored pixels are decoded; the next step(0) redraw is then
      // truthful from its first captured frame.
      backgroundCaches.delete(zoneIndex);
      for (const key of backdropCaches.keys()) {
        if (key.startsWith(`${zoneIndex}:`)) backdropCaches.delete(key);
      }
    }
    return ready;
  }

  function finite(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }

  function normalizedPulse(value, peak = 1) {
    return clamp(finite(value) / Math.max(.0001, peak), 0, 1);
  }

  function attackBrace(actor) {
    const countdown = finite(actor && actor.fire, Infinity);
    return countdown > 0 && countdown < ATTACK_BRACE_WINDOW
      ? ease(1 - countdown / ATTACK_BRACE_WINDOW)
      : 0;
  }

  function bossAttackPerformance(actor) {
    const anticipation = attackBrace(actor);
    const fire = normalizedPulse(actor && actor.firePulse);
    // firePulse is written on the exact frame that the first hostile projectile
    // is emitted, then decays to zero.  Split that decay into a hard discharge
    // followed by a softer return so the body visibly completes every action.
    const emission = fire * fire;
    const recovery = fire > .001 ? Math.sin((1 - fire) * Math.PI) : 0;
    return { anticipation, emission, recovery, fire };
  }

  function pathRoundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(Math.abs(width) * .5, Math.abs(height) * .5, Math.max(0, radius));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function fillVerticalGradient(ctx, top, middle, bottom, middleAt = .52) {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, top);
    gradient.addColorStop(middleAt, middle);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }

  function radialGlow(ctx, x, y, inner, outer, radius, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.globalCompositeOperation = 'screen';
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  function drawAtmosphericGrain(ctx, time, color, speed, count = 32, slant = -4) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = .54;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const x = wrap(i * 97 + hash(i + 14) * 173 + time * (i % 3 - 1) * 5, W + 70) - 35;
      const y = wrap(i * 191 + hash(i + 70) * 229 + time * (speed + i % 5 * 7), H + 130) - 65;
      const length = 10 + hash(i + 43) * 28;
      ctx.moveTo(x, y);
      ctx.lineTo(x + slant, y + length);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawReadabilityFinish(ctx, state, tint) {
    const rawDensity = state && Array.isArray(state.enemyBullets)
      ? state.enemyBullets.length
      : finite(state && (state.bulletDensity ?? state.density), 0);
    const suppression = clamp((rawDensity - 60) / 560, 0, .3);
    if (suppression > 0) {
      ctx.fillStyle = `rgba(2,7,13,${suppression})`;
      ctx.fillRect(0, 0, W, H);
    }

    const vignette = ctx.createRadialGradient(W * .5, H * .5, H * .18, W * .5, H * .5, H * .72);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(.78, 'rgba(0,0,0,.035)');
    vignette.addColorStop(1, tint);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }

  const travelMaterialPalettes = Object.freeze([
    Object.freeze({ dark: [2, 13, 16], body: [31, 52, 51], warm: [126, 88, 45], edge: [143, 195, 187], texture: [77, 112, 105] }),
    Object.freeze({ dark: [5, 18, 13], body: [46, 76, 45], warm: [137, 119, 60], edge: [165, 197, 132], texture: [82, 108, 65] }),
    Object.freeze({ dark: [27, 18, 21], body: [122, 101, 78], warm: [185, 151, 105], edge: [213, 190, 149], texture: [102, 70, 61] }),
    Object.freeze({ dark: [8, 17, 31], body: [65, 105, 115], warm: [137, 78, 124], edge: [145, 218, 210], texture: [89, 139, 158] }),
    Object.freeze({ dark: [5, 12, 18], body: [47, 58, 61], warm: [112, 70, 47], edge: [119, 148, 151], texture: [73, 86, 86] }),
    Object.freeze({ dark: [17, 47, 76], body: [108, 159, 178], warm: [211, 171, 98], edge: [194, 228, 230], texture: [115, 190, 214] })
  ]);

  function travelRgba(color, alpha) {
    return 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + alpha + ')';
  }

  function appendTravelBeam(ctx, x1, y1, x2, y2, width) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.max(.001, Math.hypot(dx, dy));
    const nx = -dy / length * width * .5;
    const ny = dx / length * width * .5;
    ctx.moveTo(x1 + nx, y1 + ny);
    ctx.lineTo(x2 + nx, y2 + ny);
    ctx.lineTo(x2 - nx, y2 - ny);
    ctx.lineTo(x1 - nx, y1 - ny);
    ctx.closePath();
  }

  function paintTravelMass(ctx, zoneIndex, size, near, variant, palette) {
    const translucent = zoneIndex === 3 || zoneIndex === 5;
    const materialAlpha = translucent
      ? (near ? .58 : .34)
      : (near ? .91 : .64);

    ctx.save();
    ctx.shadowBlur = near ? 8 : 4;
    ctx.shadowColor = travelRgba(palette.dark, near ? .7 : .42);
    ctx.strokeStyle = travelRgba(palette.edge, near ? .27 : .14);
    ctx.lineWidth = near ? 1.75 : 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.clip();

    const material = ctx.createLinearGradient(-size * 1.15, -size * 1.25, size * .92, size * 1.2);
    material.addColorStop(0, travelRgba(palette.dark, materialAlpha));
    material.addColorStop(.29, travelRgba(palette.body, materialAlpha * .96));
    material.addColorStop(.61, travelRgba(palette.warm, materialAlpha * (translucent ? .6 : .82)));
    material.addColorStop(1, travelRgba(palette.dark, materialAlpha * .95));
    ctx.fillStyle = material;
    ctx.fillRect(-size * 1.35, -size * 1.4, size * 2.7, size * 2.8);

    const plate = ensureArtImage(zoneArt[zoneIndex] && zoneArt[zoneIndex].plate);
    if (imageReady(plate) && (near || variant % 2 === 0)) {
      const sourceWidth = plate.naturalWidth * .24;
      const sourceHeight = plate.naturalHeight * .27;
      const sourceX = hash(variant * 47 + zoneIndex * 131 + 19) * (plate.naturalWidth - sourceWidth);
      const sourceY = hash(variant * 83 + zoneIndex * 71 + 43) * (plate.naturalHeight - sourceHeight);
      ctx.globalAlpha = near ? .31 : .17;
      ctx.drawImage(
        plate,
        sourceX, sourceY, sourceWidth, sourceHeight,
        -size * 1.32, -size * 1.42, size * 2.64, size * 2.84
      );
      ctx.globalAlpha = 1;
    }

    const wetLight = ctx.createRadialGradient(-size * .28, -size * .48, 0, -size * .18, -size * .34, size * 1.25);
    wetLight.addColorStop(0, travelRgba(palette.edge, near ? .19 : .1));
    wetLight.addColorStop(.42, travelRgba(palette.warm, near ? .075 : .035));
    wetLight.addColorStop(1, travelRgba(palette.edge, 0));
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = wetLight;
    ctx.fillRect(-size * 1.35, -size * 1.4, size * 2.7, size * 2.8);

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = travelRgba(palette.texture, near ? .2 : .11);
    ctx.lineWidth = near ? 1.25 : .75;
    for (let i = 0; i < 6; i++) {
      const y = -size * .92 + i * size * .35 + hash(i + variant * 17) * size * .08;
      ctx.beginPath();
      ctx.moveTo(-size * .96, y);
      ctx.quadraticCurveTo(
        -size * .08 + hash(i + variant * 29) * size * .3,
        y + (hash(i + 91) - .5) * size * .2,
        size * .9,
        y + (hash(i + 170) - .5) * size * .15
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTravelStructure(ctx, zoneIndex, x, y, size, side, phase, near, variant) {
    const palette = travelMaterialPalettes[zoneIndex] || travelMaterialPalettes[0];

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(side, 1);
    ctx.rotate(Math.sin(phase) * (near ? .035 : .018));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.save();
    if (zoneIndex === 5) ctx.globalCompositeOperation = 'screen';
    const fog = ctx.createRadialGradient(0, 0, size * .18, 0, 0, size * 1.48);
    const fogColor = zoneIndex === 5 ? palette.body : palette.dark;
    fog.addColorStop(0, travelRgba(fogColor, near ? .17 : .075));
    fog.addColorStop(.72, travelRgba(fogColor, near ? .055 : .025));
    fog.addColorStop(1, travelRgba(fogColor, 0));
    ctx.fillStyle = fog;
    ctx.fillRect(-size * 1.55, -size * 1.55, size * 3.1, size * 3.1);
    ctx.restore();

    if (zoneIndex === 0) {
      ctx.beginPath();
      ctx.moveTo(-size * 1.04, -size * 1.18);
      ctx.bezierCurveTo(-size * .37, -size * .91, -size * .2, size * .31, size * .73, size * 1.11);
      ctx.lineTo(size * .47, size * 1.2);
      ctx.bezierCurveTo(-size * .15, size * .45, -size * .57, -size * .58, -size * 1.12, -size * .87);
      ctx.closePath();
      paintTravelMass(ctx, zoneIndex, size, near, variant, palette);

      ctx.strokeStyle = travelRgba(palette.warm, near ? .31 : .17);
      ctx.lineWidth = near ? 2.45 : 1.25;
      for (let i = 0; i < 4; i++) {
        const u = i / 3;
        const ribY = lerp(-size * .7, size * .69, u);
        ctx.beginPath();
        ctx.moveTo(lerp(-size * .7, -size * .06, u), ribY - size * .17);
        ctx.quadraticCurveTo(
          lerp(-size * .39, size * .13, u),
          ribY + size * .02,
          lerp(-size * .27, size * .49, u),
          ribY + size * .17
        );
        ctx.stroke();
      }

      ctx.strokeStyle = travelRgba(palette.dark, near ? .76 : .48);
      ctx.lineWidth = near ? 2.25 : 1.2;
      ctx.beginPath();
      ctx.moveTo(-size * .82, -size * 1.02);
      ctx.quadraticCurveTo(size * .12, -size * .05, size * .62, size * .93);
      ctx.moveTo(-size * .43, -size * .63);
      ctx.quadraticCurveTo(size * .03, size * .06, size * .21, size * .79);
      ctx.stroke();
      ctx.strokeStyle = travelRgba(palette.edge, near ? .16 : .08);
      ctx.lineWidth = near ? .75 : .45;
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        const weightX = size * (.1 + i * .17);
        const weightY = size * (.45 + i * .2);
        const brass = ctx.createRadialGradient(
          weightX - size * .018, weightY - size * .025, 0,
          weightX, weightY, size * .075
        );
        brass.addColorStop(0, travelRgba(palette.edge, near ? .45 : .25));
        brass.addColorStop(.3, travelRgba(palette.warm, near ? .72 : .42));
        brass.addColorStop(1, travelRgba(palette.dark, near ? .92 : .62));
        ctx.fillStyle = brass;
        ctx.beginPath();
        ctx.ellipse(weightX, weightY, size * .044, size * .074, -.25, 0, TAU);
        ctx.fill();
      }
    } else if (zoneIndex === 1) {
      ctx.beginPath();
      ctx.moveTo(-size * 1.13, -size * 1.01);
      ctx.bezierCurveTo(-size * .48, -size * .73, -size * .19, size * .34, size * .92, size * 1.03);
      ctx.lineTo(size * .73, size * 1.15);
      ctx.bezierCurveTo(-size * .2, size * .57, -size * .59, -size * .56, -size * 1.17, -size * .82);
      ctx.closePath();
      paintTravelMass(ctx, zoneIndex, size, near, variant, palette);

      const leafMaterial = ctx.createLinearGradient(-size * .8, -size * .65, size * .72, size * .8);
      leafMaterial.addColorStop(0, travelRgba(palette.dark, near ? .78 : .5));
      leafMaterial.addColorStop(.48, travelRgba(palette.body, near ? .86 : .56));
      leafMaterial.addColorStop(1, travelRgba(palette.warm, near ? .58 : .34));
      for (let i = 0; i < 5; i++) {
        const u = (i + 1) / 6;
        const leafX = lerp(-size * .72, size * .56, u);
        const leafY = lerp(-size * .57, size * .72, u) + (i % 2 ? size * .1 : -size * .08);
        ctx.save();
        ctx.translate(leafX, leafY);
        ctx.rotate((i % 2 ? -.71 : .61) + (variant % 3 - 1) * .08);
        ctx.fillStyle = leafMaterial;
        ctx.shadowBlur = near ? 5 : 2;
        ctx.shadowColor = travelRgba(palette.dark, .5);
        ctx.beginPath();
        ctx.moveTo(-size * .24, 0);
        ctx.bezierCurveTo(-size * .08, -size * .12, size * .17, -size * .08, size * .27, 0);
        ctx.bezierCurveTo(size * .08, size * .1, -size * .12, size * .1, -size * .24, 0);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = travelRgba(palette.edge, near ? .16 : .08);
        ctx.lineWidth = near ? .85 : .5;
        ctx.beginPath(); ctx.moveTo(-size * .17, 0); ctx.quadraticCurveTo(0, size * .012, size * .18, 0); ctx.stroke();
        ctx.restore();
      }

      for (let i = 0; i < 2; i++) {
        const seedX = size * (.04 + i * .31);
        const seedY = size * (.38 + i * .25);
        ctx.strokeStyle = travelRgba(palette.body, near ? .56 : .31);
        ctx.lineWidth = near ? 1.7 : .9;
        ctx.beginPath(); ctx.moveTo(seedX, seedY - size * .27); ctx.quadraticCurveTo(seedX - size * .04, seedY - size * .1, seedX, seedY); ctx.stroke();
        const sac = ctx.createRadialGradient(seedX - size * .025, seedY + size * .04, 0, seedX, seedY + size * .08, size * .15);
        sac.addColorStop(0, travelRgba(palette.edge, near ? .42 : .22));
        sac.addColorStop(.42, travelRgba(palette.warm, near ? .5 : .28));
        sac.addColorStop(1, travelRgba(palette.dark, near ? .48 : .28));
        ctx.fillStyle = sac;
        ctx.beginPath();
        ctx.ellipse(seedX, seedY + size * .08, size * .075, size * .14, .08, 0, TAU);
        ctx.fill();
      }
    } else if (zoneIndex === 2) {
      ctx.beginPath();
      ctx.moveTo(-size * 1.06, -size * 1.12);
      ctx.bezierCurveTo(size * .38, -size * .99, size * .83, size * .13, size * .69, size * 1.18);
      ctx.lineTo(size * .43, size * 1.03);
      ctx.bezierCurveTo(size * .52, size * .22, size * .14, -size * .63, -size * .83, -size * .84);
      ctx.closePath();
      paintTravelMass(ctx, zoneIndex, size, near, variant, palette);

      const cavity = ctx.createRadialGradient(0, 0, 0, 0, 0, size * .1);
      cavity.addColorStop(0, travelRgba(palette.dark, near ? .92 : .64));
      cavity.addColorStop(.64, travelRgba(palette.texture, near ? .58 : .34));
      cavity.addColorStop(1, travelRgba(palette.warm, near ? .18 : .09));
      for (let i = 0; i < 4; i++) {
        const u = (i + 1) / 5;
        const socketX = lerp(-size * .59, size * .51, u);
        const socketY = -size * .54 + u * u * size * 1.37;
        ctx.save();
        ctx.translate(socketX, socketY);
        ctx.rotate(u * .9);
        ctx.fillStyle = cavity;
        ctx.beginPath(); ctx.ellipse(0, 0, size * .077, size * .048, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = travelRgba([117, 48, 53], near ? .24 : .12);
      ctx.lineWidth = near ? 1.45 : .8;
      ctx.beginPath();
      ctx.moveTo(-size * .72, -size * .75);
      ctx.bezierCurveTo(-size * .12, -size * .42, size * .46, size * .36, size * .54, size * .92);
      ctx.stroke();
    } else if (zoneIndex === 3) {
      ctx.beginPath();
      ctx.moveTo(-size * .22, -size * 1.24);
      ctx.bezierCurveTo(size * .94, -size * .82, size * 1.01, size * .43, size * .03, size * 1.2);
      ctx.bezierCurveTo(-size * .46, size * .58, -size * .58, -size * .51, -size * .22, -size * 1.24);
      ctx.closePath();
      paintTravelMass(ctx, zoneIndex, size, near, variant, palette);

      ctx.strokeStyle = travelRgba(palette.warm, near ? .27 : .13);
      ctx.lineWidth = near ? 1.9 : 1;
      ctx.shadowBlur = near ? 3 : 1;
      ctx.shadowColor = travelRgba(palette.warm, .25);
      ctx.beginPath();
      ctx.moveTo(-size * .14, -size * 1.04);
      ctx.bezierCurveTo(size * .04, -size * .42, size * .02, size * .34, size * .04, size * 1.01);
      for (let i = 0; i < 4; i++) {
        const veinY = lerp(-size * .62, size * .56, i / 3);
        ctx.moveTo(0, veinY);
        ctx.bezierCurveTo(
          size * (.17 + i * .04), veinY + size * .025,
          size * (.31 + i * .045), veinY + size * .12,
          size * (.48 + i * .045), veinY + size * .2
        );
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 4; i++) {
        const cellX = size * (.14 + i * .12);
        const cellY = size * (-.52 + i * .33);
        const cell = ctx.createRadialGradient(cellX, cellY, 0, cellX, cellY, size * (.13 + i * .008));
        cell.addColorStop(0, travelRgba(palette.edge, near ? .12 : .06));
        cell.addColorStop(.65, travelRgba(palette.body, near ? .055 : .025));
        cell.addColorStop(1, travelRgba(palette.edge, 0));
        ctx.fillStyle = cell;
        ctx.fillRect(cellX - size * .15, cellY - size * .15, size * .3, size * .3);
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if (zoneIndex === 4) {
      ctx.beginPath();
      appendTravelBeam(ctx, -size * .79, -size * 1.18, -size * .5, size * 1.16, size * .14);
      appendTravelBeam(ctx, size * .52, -size * 1.17, size * .21, size * 1.15, size * .135);
      for (let i = 0; i < 5; i++) {
        const beamY = lerp(-size * .95, size * .93, i / 4);
        appendTravelBeam(
          ctx,
          -size * (.7 - i * .035), beamY,
          size * (.46 - i * .035), beamY + size * .075,
          size * .1
        );
      }
      appendTravelBeam(ctx, -size * .67, -size * .91, size * .35, -size * .38, size * .075);
      appendTravelBeam(ctx, size * .35, -size * .38, -size * .59, size * .02, size * .075);
      appendTravelBeam(ctx, -size * .59, size * .02, size * .29, size * .51, size * .075);
      appendTravelBeam(ctx, size * .29, size * .51, -size * .52, size * .91, size * .075);
      paintTravelMass(ctx, zoneIndex, size, near, variant, palette);

      ctx.strokeStyle = travelRgba(palette.warm, near ? .25 : .12);
      ctx.lineWidth = near ? 2.2 : 1.15;
      for (let i = 0; i < 5; i++) {
        const rustY = -size * .85 + i * size * .39;
        ctx.beginPath();
        ctx.moveTo(-size * (.58 - i * .02), rustY);
        ctx.quadraticCurveTo(-size * .3, rustY + size * .05, -size * .08, rustY + size * .015);
        ctx.stroke();
      }
      for (let i = 0; i < 5; i++) {
        const rivetX = i % 2 ? size * .18 : -size * .46;
        const rivetY = -size * .78 + i * size * .39;
        ctx.fillStyle = travelRgba(palette.edge, near ? .27 : .14);
        ctx.beginPath(); ctx.arc(rivetX, rivetY, near ? 1.8 : 1, 0, TAU); ctx.fill();
      }

      ctx.strokeStyle = travelRgba(palette.dark, near ? .77 : .5);
      ctx.lineWidth = near ? 2.1 : 1.15;
      ctx.beginPath();
      ctx.moveTo(size * .5, -size * 1.13);
      ctx.quadraticCurveTo(size * .9, -size * .45, size * .7, size * .36);
      ctx.stroke();
      ctx.strokeStyle = travelRgba(palette.edge, near ? .13 : .065);
      ctx.lineWidth = near ? .65 : .4;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-size * .2, -size * 1.26);
      ctx.bezierCurveTo(size * .41, -size * 1.02, size * .76, -size * .54, size * .73, -size * .23);
      ctx.lineTo(size * .25, size * 1.18);
      ctx.bezierCurveTo(size * .04, size * .74, -size * .09, size * .39, -size * .12, size * .31);
      ctx.bezierCurveTo(-size * .39, size * .58, -size * .59, size * .68, -size * .73, size * .7);
      ctx.bezierCurveTo(-size * .47, size * .13, -size * .41, -size * .7, -size * .2, -size * 1.26);
      ctx.closePath();
      paintTravelMass(ctx, zoneIndex, size, near, variant, palette);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const cloud = ctx.createRadialGradient(-size * .04, -size * .18, 0, -size * .02, -size * .04, size * .92);
      cloud.addColorStop(0, travelRgba(palette.edge, near ? .18 : .09));
      cloud.addColorStop(.42, travelRgba(palette.body, near ? .1 : .05));
      cloud.addColorStop(1, travelRgba(palette.edge, 0));
      ctx.fillStyle = cloud;
      ctx.beginPath();
      ctx.ellipse(0, -size * .02, size * .63, size * .92, -.18, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = travelRgba(palette.warm, near ? .31 : .16);
      ctx.lineWidth = near ? 2 : 1.1;
      ctx.beginPath();
      ctx.moveTo(-size * .14, -size * 1.08);
      ctx.bezierCurveTo(-size * .02, -size * .43, size * .11, size * .35, size * .19, size * .99);
      ctx.stroke();

      ctx.strokeStyle = travelRgba(palette.edge, near ? .19 : .09);
      ctx.lineWidth = near ? 1.05 : .6;
      ctx.beginPath();
      ctx.moveTo(-size * .06, -size * .57); ctx.quadraticCurveTo(size * .23, -size * .43, size * .53, -size * .27);
      ctx.moveTo(size * .02, -size * .18); ctx.quadraticCurveTo(size * .25, -size * .02, size * .45, size * .25);
      ctx.moveTo(size * .07, size * .24); ctx.quadraticCurveTo(-size * .2, size * .49, -size * .49, size * .61);
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        const beadX = size * (.21 + i * .055);
        const beadY = size * (-.52 + i * .31);
        const bead = ctx.createRadialGradient(beadX - size * .01, beadY - size * .012, 0, beadX, beadY, size * .055);
        bead.addColorStop(0, travelRgba(palette.edge, near ? .44 : .22));
        bead.addColorStop(.4, travelRgba(palette.warm, near ? .48 : .25));
        bead.addColorStop(1, travelRgba(palette.body, 0));
        ctx.fillStyle = bead;
        ctx.beginPath(); ctx.arc(beadX, beadY, size * .055, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawVectorTravelParallaxLegacy(ctx, zoneIndex, time, progress, state, look = null) {
    const reduced = !!(state && state.reducedEffects);
    const motionTime = reduced ? 0 : time;
    const slowProgress = progress * (reduced ? 34 : 112);

    // MIDGROUND: recognizable structures descend 70-105 px/s. These remain
    // smaller, dimmer and farther from the camera than the foreground pass.
    // Their displacement is deliberately easy to track over a one-second reel.
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? -1 : 1;
      const cycle = H + 440;
      const speed = 72 + (i % 3) * 15;
      const y = wrap(95 + i * 263 + hash(i + zoneIndex * 31) * 170 + motionTime * speed + slowProgress, cycle) - 220;
      const edge = 62 + (i % 3) * 17 + hash(i + 70) * 16;
      const x = side > 0 ? edge : W - edge;
      const size = 55 + (i % 3) * 10 + hash(i + zoneIndex * 17) * 13;
      drawTravelStructure(ctx, zoneIndex, x, y, size, side, motionTime * .16 + i * 1.7, false, i, look);
    }

    // FOREGROUND: two large structures per side cross at 238-334 px/s. Strong
    // material rims and internal construction detail make them read as nearby
    // world geometry rather than low-contrast particles or lighting bands.
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? -1 : 1;
      const cycle = H + 700;
      const speed = 238 + (i % 3) * 48;
      const y = wrap(170 + i * 431 + hash(i + zoneIndex * 53) * 240 + motionTime * speed + slowProgress * 1.35, cycle) - 350;
      const edge = 18 + (i % 2) * 15 + hash(i + 130) * 18;
      const x = side > 0 ? edge : W - edge;
      const size = 108 + (i % 3) * 18 + hash(i + zoneIndex * 29) * 22;
      drawTravelStructure(ctx, zoneIndex, x, y, size, side, motionTime * .11 + i * 2.3, true, i + 6, look);
    }
  }

  const travelForegroundAlpha = Object.freeze([.76, .66, .72, .49, .74, .5]);
  const travelMidgroundAlpha = Object.freeze([.24, .22, .23, .16, .23, .15]);
  const travelForegroundSurfaces = new WeakMap();

  function travelForegroundSurface(image) {
    if (!imageReady(image)) return image;
    const cached = travelForegroundSurfaces.get(image);
    if (cached && cached.width === image.naturalWidth && cached.height === image.naturalHeight) return cached;

    const surface = document.createElement('canvas');
    surface.width = image.naturalWidth;
    surface.height = image.naturalHeight;
    const surfaceContext = surface.getContext('2d', { alpha: true });
    surfaceContext.drawImage(image, 0, 0);
    surfaceContext.globalCompositeOperation = 'destination-in';

    // Image generation supplies true alpha, but feather-light matte pixels can
    // still describe the source rectangle when layered. Force an organic clear
    // flight lane and feather it into the authored edge structures.
    const lane = surfaceContext.createLinearGradient(0, 0, surface.width, 0);
    lane.addColorStop(0, 'rgba(255,255,255,1)');
    lane.addColorStop(.285, 'rgba(255,255,255,1)');
    lane.addColorStop(.395, 'rgba(255,255,255,0)');
    lane.addColorStop(.605, 'rgba(255,255,255,0)');
    lane.addColorStop(.715, 'rgba(255,255,255,1)');
    lane.addColorStop(1, 'rgba(255,255,255,1)');
    surfaceContext.fillStyle = lane;
    surfaceContext.fillRect(0, 0, surface.width, surface.height);

    // Tile ends crossfade instead of exposing a horizontal atlas boundary.
    const ends = surfaceContext.createLinearGradient(0, 0, 0, surface.height);
    ends.addColorStop(0, 'rgba(255,255,255,0)');
    ends.addColorStop(.14, 'rgba(255,255,255,1)');
    ends.addColorStop(.86, 'rgba(255,255,255,1)');
    ends.addColorStop(1, 'rgba(255,255,255,0)');
    surfaceContext.fillStyle = ends;
    surfaceContext.fillRect(0, 0, surface.width, surface.height);
    surfaceContext.globalCompositeOperation = 'source-over';

    travelForegroundSurfaces.set(image, surface);
    return surface;
  }

  function drawRasterTravelLayer(ctx, image, offset, scale, alpha, mirrored = false, cycle = 0) {
    if (!imageReady(image) || alpha <= 0) return;
    const surface = travelForegroundSurface(image);
    const height = H * scale;
    const stride = height * .82;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Overlap the alpha-faded ends: no hard atlas cut, no rectangular panel,
    // and no transparent pop on the smaller depth plane. Tile identity is
    // anchored to world travel rather than the wrapped screen offset, so an
    // object keeps its variant while crossing a wrap. Alternating mirror and
    // subtle width treatments turn one plate into a long non-obvious cadence.
    const widthTreatments = [1, .972, 1.026, .988, 1.038, .98];
    for (let copy = -2; copy <= 3; copy++) {
      const tileId = copy - cycle;
      const variant = ((tileId % widthTreatments.length) + widthTreatments.length) % widthTreatments.length;
      const width = W * scale * widthTreatments[variant];
      const x = (W - width) * .5;
      const flip = (tileId & 1) ? !mirrored : mirrored;
      ctx.save();
      if (flip) {
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(surface, x, offset + copy * stride, width, height);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawForwardTravelParallax(ctx, zoneIndex, time, progress, state) {
    const bundle = zoneArt[zoneIndex];
    const foreground = ensureArtImage(bundle && bundle.foreground);
    if (!imageReady(foreground)) return;

    const reduced = !!(state && state.reducedEffects);
    const motionTime = reduced ? 0 : time;
    const routeDrift = ease(progress) * (reduced ? 28 : 104);

    // A dim mirrored echo passes farther away; the full-resolution plate then
    // moves faster at the camera. Both planes use alpha-authored photographic
    // material, so depth never changes the world's visual language.
    const midScale = .9;
    const midStride = H * midScale * .82;
    const midTravel = motionTime * 68 + routeDrift + zoneIndex * 137;
    const midCycle = Math.floor(midTravel / midStride);
    const midOffset = wrap(midTravel, midStride) - midStride;
    drawRasterTravelLayer(
      ctx,
      foreground,
      midOffset,
      midScale,
      travelMidgroundAlpha[zoneIndex] || .2,
      true,
      midCycle
    );

    const nearScale = 1.045;
    const nearStride = H * nearScale * .82;
    const nearTravel = motionTime * 224 + routeDrift * 1.38 + zoneIndex * 211;
    const nearCycle = Math.floor(nearTravel / nearStride);
    const nearOffset = wrap(nearTravel, nearStride) - nearStride;
    drawRasterTravelLayer(
      ctx,
      foreground,
      nearOffset,
      nearScale,
      travelForegroundAlpha[zoneIndex] || .66,
      false,
      nearCycle
    );
  }

  function drawLowTideActs(ctx, time, progress, state) {
    const p = clamp(progress, 0, 1);
    const ramp = (from, to) => ease(clamp((p - from) / Math.max(.001, to - from), 0, 1));
    const reduced = !!(state && state.reducedEffects);
    const motionTime = reduced ? 0 : time;
    const trench = ramp(.24, .5);
    const mouth = ramp(.62, .88);
    const harbor = 1 - ramp(.22, .48);
    const currentX = finite(state && state.currentX, 0);

    // ACT I — DROWNED HARBOUR. Reflections are not generic particles: each
    // one hangs under an implied lamp and fractures with the water. They fade
    // as the route leaves human wreckage behind.
    if (harbor > .01) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = harbor;
      for (let i = 0; i < (reduced ? 5 : 9); i++) {
        const anchorX = W * (.12 + hash(i + 901) * .76);
        const anchorY = H * (.38 + hash(i + 411) * .47);
        const flicker = .68 + Math.sin(motionTime * (1.1 + i * .07) + i * 2.7) * .22;
        const glow = ctx.createRadialGradient(anchorX, anchorY, 0, anchorX, anchorY, 58 + i % 3 * 17);
        glow.addColorStop(0, `rgba(255,196,91,${.075 * flicker})`);
        glow.addColorStop(.35, `rgba(245,151,55,${.035 * flicker})`);
        glow.addColorStop(1, 'rgba(245,151,55,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(anchorX - 95, anchorY - 30, 190, 160);
        ctx.strokeStyle = `rgba(255,203,112,${.11 * flicker})`;
        ctx.lineWidth = 1.2;
        for (let shard = 0; shard < 3; shard++) {
          const y = anchorY + 20 + shard * 14;
          const width = 18 + shard * 13 + hash(i * 7 + shard) * 21;
          ctx.beginPath();
          ctx.moveTo(anchorX - width, y);
          ctx.quadraticCurveTo(anchorX + Math.sin(motionTime * .8 + i) * 7, y + 3, anchorX + width, y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // One arena-wide physical sentence: the water changes direction as a
    // whole. Background silk, enemies and hostile formations share this same
    // current. The ribbons stay behind threats and never imply collision.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    const currentWeight = .28 + trench * .3 + mouth * .24;
    const currentReach = 64 + Math.abs(currentX) * 2.8;
    const sway = Math.sin(motionTime * (.58 + p * .24) + Math.sin(motionTime * .17) * .24);
    for (let i = 0; i < (reduced ? 8 : 17); i++) {
      const y = wrap(i * 127 + hash(i + 733) * 210 + motionTime * (19 + i % 3 * 6), H + 150) - 75;
      const x = wrap(i * 173 + hash(i + 149) * 370 + sway * (54 + i % 4 * 11), W + 220) - 110;
      const direction = currentX === 0 ? sway : Math.sign(currentX);
      ctx.strokeStyle = i % 5 === 0
        ? `rgba(255,208,128,${.065 * currentWeight})`
        : `rgba(176,238,241,${.12 * currentWeight})`;
      ctx.lineWidth = .7 + (i % 3) * .38;
      ctx.beginPath();
      ctx.moveTo(x - direction * currentReach * .5, y);
      ctx.bezierCurveTo(
        x - direction * currentReach * .12, y - 7,
        x + direction * currentReach * .18, y + 8,
        x + direction * currentReach * .5, y + 1
      );
      ctx.stroke();
    }
    ctx.restore();

    // ACT II — ROOT TRENCH. The route tightens materially at the edges, but
    // the center remains unambiguously open and non-collidable.
    if (trench > .01) {
      ctx.save();
      const rootWeight = trench * (1 - mouth * .38);
      ctx.globalAlpha = rootWeight;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        const edgeX = side < 0 ? -34 : W + 34;
        for (let i = 0; i < (reduced ? 4 : 7); i++) {
          const y = -80 + i * 190 + wrap(motionTime * (24 + i * 3), 190);
          const reach = 96 + hash(i + (side > 0 ? 811 : 311)) * 88;
          ctx.strokeStyle = `rgba(3,9,10,${.34 + i % 2 * .1})`;
          ctx.lineWidth = 28 - i % 3 * 4;
          ctx.beginPath();
          ctx.moveTo(edgeX, y - 86);
          ctx.bezierCurveTo(edgeX - side * reach * .24, y - 31, edgeX - side * reach, y + 34, edgeX - side * reach * .72, y + 96);
          ctx.stroke();
          ctx.globalCompositeOperation = 'screen';
          ctx.strokeStyle = `rgba(157,205,190,${.055 + rootWeight * .035})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      const trenchShade = ctx.createLinearGradient(0, 0, W, 0);
      trenchShade.addColorStop(0, `rgba(1,5,8,${.27 * rootWeight})`);
      trenchShade.addColorStop(.22, 'rgba(1,5,8,0)');
      trenchShade.addColorStop(.78, 'rgba(1,5,8,0)');
      trenchShade.addColorStop(1, `rgba(1,5,8,${.27 * rootWeight})`);
      ctx.fillStyle = trenchShade; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // ACT III — THE TRAWL MOUTH. Net geometry grows from the architecture
    // before the boss arrives, so Trawlmother feels like the place completing
    // itself rather than a sprite entering an unrelated wallpaper.
    if (mouth > .01) {
      ctx.save();
      const pulse = .86 + Math.sin(motionTime * .64) * .14;
      const aperture = ctx.createRadialGradient(W * .5, H * .28, 92, W * .5, H * .28, H * .7);
      aperture.addColorStop(0, 'rgba(0,0,0,0)');
      aperture.addColorStop(.58, `rgba(0,4,7,${.055 * mouth})`);
      aperture.addColorStop(1, `rgba(0,3,6,${.31 * mouth})`);
      ctx.fillStyle = aperture; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'screen';
      ctx.translate(W * .5, H * .24);
      ctx.scale(1, .66);
      ctx.setLineDash([13, 18]);
      for (let ring = 0; ring < (reduced ? 3 : 5); ring++) {
        const radius = 178 + ring * 77 + Math.sin(motionTime * .38 + ring) * 7;
        ctx.strokeStyle = ring % 2
          ? `rgba(166,224,222,${mouth * (.055 + ring * .006)})`
          : `rgba(255,190,104,${mouth * (.045 + ring * .005)})`;
        ctx.lineWidth = 1.1 + ring * .18;
        ctx.beginPath(); ctx.arc(0, 0, radius * pulse, -.12, Math.PI + .12); ctx.stroke();
      }
      ctx.setLineDash([]);
      for (let spoke = 0; spoke < (reduced ? 8 : 14); spoke++) {
        const angle = -Math.PI + spoke * Math.PI / 13 + Math.sin(motionTime * .27 + spoke) * .015;
        const inner = 146, outer = 510;
        ctx.strokeStyle = `rgba(188,233,226,${mouth * .037})`;
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawLowTidePlate(ctx, time, progress, state) {
    const plate = artImages.lowTide;
    if (!imageReady(plate)) return false;

    const sourceWidth = plate.naturalWidth * .74;
    const sourceHeight = plate.naturalHeight * .74;
    const sourceX = (plate.naturalWidth - sourceWidth) * .5 + Math.sin(time * .055) * 5;
    const travel = ease(progress);
    const sourceY = clamp(
      lerp(plate.naturalHeight - sourceHeight, 0, travel) + Math.sin(time * .08) * 4,
      0,
      plate.naturalHeight - sourceHeight
    );
    ctx.drawImage(plate, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, W, H);
    drawForwardTravelParallax(ctx, 0, time, progress, state);
    drawLowTideActs(ctx, time, progress, state);

    // A slow drowned-light pulse binds the still plate to the live simulation.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const dawn = ctx.createRadialGradient(W * .29, H * .09, 5, W * .29, H * .09, 390);
    dawn.addColorStop(0, `rgba(224,241,218,${.075 + Math.sin(time * .17) * .012})`);
    dawn.addColorStop(.45, 'rgba(107,185,183,.025)');
    dawn.addColorStop(1, 'rgba(4,18,27,0)');
    ctx.fillStyle = dawn;
    ctx.fillRect(0, 0, W, H * .58);

    const underlight = ctx.createLinearGradient(0, H * .48, 0, H);
    underlight.addColorStop(0, 'rgba(255,176,75,0)');
    underlight.addColorStop(.66, `rgba(255,155,46,${.018 + Math.sin(time * .31) * .006})`);
    underlight.addColorStop(1, 'rgba(255,196,96,.055)');
    ctx.fillStyle = underlight;
    ctx.fillRect(0, H * .42, W, H * .58);
    ctx.restore();

    // Three rain depths: distant silk, readable middle streaks, sparse close
    // needles. They move at unrelated speeds so the player always feels forward
    // travel without sacrificing the central lane.
    ctx.save();
    ctx.lineCap = 'round';
    for (let layer = 0; layer < 3; layer++) {
      const count = layer === 0 ? 34 : (layer === 1 ? 25 : 12);
      const speed = 105 + layer * 135;
      const length = 17 + layer * 21;
      ctx.strokeStyle = layer === 2 ? 'rgba(222,252,255,.32)' : `rgba(183,228,232,${.1 + layer * .055})`;
      ctx.lineWidth = .65 + layer * .65;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const x = wrap(i * (89 + layer * 17) + hash(i + layer * 90) * 221 - time * (9 + layer * 5), W + 90) - 45;
        const y = wrap(i * 173 + hash(i + layer * 41) * 317 + time * speed, H + 170) - 85;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3 - layer * 2, y + length);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Sparse travelling reflections provide motion in the quiet combat lane.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    for (let i = 0; i < 11; i++) {
      const y = H * .34 + wrap(i * 119 + time * (18 + i % 3 * 5), H * .76);
      const x = W * .18 + hash(i + 701) * W * .64;
      const width = 24 + hash(i + 90) * 76;
      ctx.strokeStyle = i % 3 ? 'rgba(113,205,208,.10)' : 'rgba(255,185,85,.13)';
      ctx.lineWidth = 1 + hash(i + 8) * 1.2;
      ctx.beginPath();
      ctx.moveTo(x - width * .5, y);
      ctx.quadraticCurveTo(x, y + Math.sin(time * .6 + i) * 3, x + width * .5, y);
      ctx.stroke();
    }
    ctx.restore();

    // Density grading is lane-specific rather than a blanket black veil: the
    // world keeps its material while hostile cores retain predictable contrast.
    const density = finite(state && (state.bulletDensity ?? state.density), 0);
    const suppression = clamp((density - 90) / 850, 0, .2);
    if (suppression > 0) {
      const lane = ctx.createLinearGradient(0, 0, W, 0);
      lane.addColorStop(0, 'rgba(2,8,13,0)');
      lane.addColorStop(.22, `rgba(2,8,13,${suppression * .66})`);
      lane.addColorStop(.5, `rgba(2,8,13,${suppression})`);
      lane.addColorStop(.78, `rgba(2,8,13,${suppression * .66})`);
      lane.addColorStop(1, 'rgba(2,8,13,0)');
      ctx.fillStyle = lane;
      ctx.fillRect(0, 0, W, H);
    }

    const vignette = ctx.createRadialGradient(W * .5, H * .49, H * .22, W * .5, H * .5, H * .76);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(.76, 'rgba(0,4,8,.02)');
    vignette.addColorStop(1, 'rgba(0,4,9,.44)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    return true;
  }

  const authoredPlateLooks = Object.freeze([
    null,
    Object.freeze({ light: [244, 229, 151], accent: [157, 236, 164], shadow: [4, 12, 13], vignette: .48 }),
    Object.freeze({ light: [255, 218, 151], accent: [217, 86, 75], shadow: [13, 8, 17], vignette: .5 }),
    Object.freeze({ light: [185, 252, 239], accent: [247, 154, 194], shadow: [8, 10, 27], vignette: .43 }),
    Object.freeze({ light: [255, 193, 102], accent: [235, 73, 60], shadow: [4, 8, 15], vignette: .52 }),
    Object.freeze({ light: [255, 244, 187], accent: [112, 231, 255], shadow: [8, 18, 34], vignette: .34 })
  ]);

  function drawLaneGrade(ctx, state, shadow, zoneIndex) {
    const density = finite(state && (state.bulletDensity ?? state.density), 0);
    const lungSea = zoneIndex === 3;
    const suppression = lungSea
      ? clamp((density - 58) / 720, 0, .27)
      : clamp((density - 95) / 900, 0, .19);
    if (suppression <= 0) return;
    const lane = ctx.createLinearGradient(0, 0, W, 0);
    lane.addColorStop(0, `rgba(${shadow[0]},${shadow[1]},${shadow[2]},0)`);
    lane.addColorStop(lungSea ? .1 : .18, `rgba(${shadow[0]},${shadow[1]},${shadow[2]},${suppression * .42})`);
    lane.addColorStop(.5, `rgba(${shadow[0]},${shadow[1]},${shadow[2]},${suppression})`);
    lane.addColorStop(lungSea ? .9 : .82, `rgba(${shadow[0]},${shadow[1]},${shadow[2]},${suppression * .42})`);
    lane.addColorStop(1, `rgba(${shadow[0]},${shadow[1]},${shadow[2]},0)`);
    ctx.fillStyle = lane;
    ctx.fillRect(0, 0, W, H);
  }

  function drawAuthoredZoneAtmosphere(ctx, zoneIndex, time, progress, state, look) {
    const reduced = !!(state && state.reducedEffects);
    const motionTime = reduced ? 0 : time;
    const [lr, lg, lb] = look.light;
    const [ar, ag, ab] = look.accent;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const travelLight = ctx.createRadialGradient(
      W * (.24 + progress * .5),
      H * (.08 + progress * .08),
      8,
      W * (.24 + progress * .5),
      H * (.08 + progress * .08),
      410
    );
    travelLight.addColorStop(0, `rgba(${lr},${lg},${lb},${.08 + Math.sin(motionTime * .19) * .012})`);
    travelLight.addColorStop(.5, `rgba(${ar},${ag},${ab},.022)`);
    travelLight.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
    ctx.fillStyle = travelLight;
    ctx.fillRect(0, 0, W, H * .65);
    ctx.restore();

    if (zoneIndex === 1) {
      // Pollen hangs at three depths while canopy shadows sweep only the
      // periphery.  It reverses with the exact current that carries hostile
      // formations, teaching the Acre's rule through world motion.
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const lift = clamp(-finite(state && state.currentY) / 86, 0, 1);
      const pollenDirection = lerp(1, -1.45, ease(lift));
      for (let i = 0; i < (reduced ? 18 : 42); i++) {
        const depth = i % 3;
        const x = wrap(i * 83 + hash(i + 830) * 240 + motionTime * (7 + depth * 5), W + 90) - 45;
        const y = wrap(
          i * 149 + hash(i + 281) * 420
            + motionTime * (13 + depth * 17) * pollenDirection,
          H + 120
        ) - 60;
        const r = .8 + depth * .75 + hash(i + 17) * 1.4;
        ctx.fillStyle = i % 5 === 0 ? `rgba(${lr},${lg},${lb},.28)` : `rgba(${ar},${ag},${ab},.19)`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
      ctx.restore();
      ctx.save();
      const canopy = ctx.createLinearGradient(0, 0, W, H);
      canopy.addColorStop(0, 'rgba(0,10,8,.28)');
      canopy.addColorStop(.23, 'rgba(0,10,8,0)');
      canopy.addColorStop(.76, 'rgba(0,10,8,0)');
      canopy.addColorStop(1, 'rgba(0,10,8,.23)');
      ctx.fillStyle = canopy; ctx.fillRect(0, 0, W, H); ctx.restore();
    } else if (zoneIndex === 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < (reduced ? 16 : 34); i++) {
        const x = wrap(i * 113 + hash(i + 92) * 180 + motionTime * (i % 2 ? 11 : -8), W + 100) - 50;
        const y = wrap(i * 197 + hash(i + 113) * 270 + motionTime * (21 + i % 4 * 5), H + 130) - 65;
        ctx.fillStyle = i % 6 === 0 ? `rgba(${ar},${ag},${ab},.22)` : `rgba(${lr},${lg},${lb},.16)`;
        ctx.beginPath(); ctx.arc(x, y, 1 + hash(i + 12) * 2.2, 0, TAU); ctx.fill();
      }
      const pulse = .045 + Math.max(0, Math.sin(motionTime * .71)) * .035;
      for (const side of [-1, 1]) {
        const x = side < 0 ? 22 : W - 22;
        const vein = ctx.createLinearGradient(x, 0, x - side * 180, 0);
        vein.addColorStop(0, `rgba(${ar},${ag},${ab},${pulse})`);
        vein.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
        ctx.fillStyle = vein; ctx.fillRect(side < 0 ? 0 : W - 180, 0, 180, H);
      }
      ctx.restore();
    } else if (zoneIndex === 3) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < (reduced ? 12 : 27); i++) {
        const radius = 3 + hash(i + 41) * (i % 5 === 0 ? 16 : 7);
        const x = 24 + hash(i + 402) * (W - 48) + Math.sin(motionTime * .45 + i) * (4 + radius * .2);
        const y = H + 50 - wrap(i * 171 + hash(i + 4) * 280 + motionTime * (19 + i % 4 * 8), H + 150);
        ctx.strokeStyle = i % 4 === 0 ? `rgba(${ar},${ag},${ab},.26)` : `rgba(${lr},${lg},${lb},.19)`;
        ctx.lineWidth = .7 + radius * .055;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(x - radius * .28, y - radius * .31, Math.max(.6, radius * .12), 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.26)'; ctx.fill();
      }
      const breath = .028 + (Math.sin(motionTime * .83) * .5 + .5) * .035;
      const caustic = ctx.createLinearGradient(0, 0, W, H);
      caustic.addColorStop(0, `rgba(${lr},${lg},${lb},0)`);
      caustic.addColorStop(.48, `rgba(${lr},${lg},${lb},${breath})`);
      caustic.addColorStop(.54, `rgba(${ar},${ag},${ab},${breath * .42})`);
      caustic.addColorStop(1, `rgba(${lr},${lg},${lb},0)`);
      ctx.fillStyle = caustic; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } else if (zoneIndex === 4) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(203,231,235,.23)';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      for (let i = 0; i < (reduced ? 18 : 44); i++) {
        const depth = i % 3;
        const x = wrap(i * 101 + hash(i + 451) * 231 - motionTime * (16 + depth * 8), W + 100) - 50;
        const y = wrap(i * 167 + hash(i + 94) * 320 + motionTime * (145 + depth * 62), H + 180) - 90;
        ctx.moveTo(x, y); ctx.lineTo(x - 5 - depth * 3, y + 22 + depth * 13);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = 'screen';
      const nervePulse = .035 + Math.max(0, Math.sin(motionTime * 1.12 - progress * 4)) * .05;
      const nerve = ctx.createLinearGradient(0, 0, W, 0);
      nerve.addColorStop(0, `rgba(${ar},${ag},${ab},${nervePulse})`);
      nerve.addColorStop(.22, `rgba(${ar},${ag},${ab},0)`);
      nerve.addColorStop(.78, `rgba(${ar},${ag},${ab},0)`);
      nerve.addColorStop(1, `rgba(${ar},${ag},${ab},${nervePulse})`);
      ctx.fillStyle = nerve; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } else if (zoneIndex === 5) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < (reduced ? 15 : 38); i++) {
        const depth = i % 4;
        const x = wrap(i * 137 + hash(i + 602) * 311 - motionTime * (70 + depth * 35), W + 210) - 105;
        const y = wrap(i * 181 + hash(i + 73) * 281 + motionTime * (9 + depth * 3), H + 90) - 45;
        const length = 20 + depth * 18 + hash(i + 7) * 24;
        ctx.moveTo(x, y); ctx.lineTo(x + length, y + 4 + depth);
      }
      ctx.strokeStyle = `rgba(${lr},${lg},${lb},.19)`;
      ctx.lineWidth = 1.1; ctx.stroke();

      const phase = finite(state && state.bossPhase, 0);
      if (phase >= 3) {
        const eclipse = ctx.createRadialGradient(W * .5, H * .105, phase >= 4 ? 18 : 8, W * .5, H * .105, phase >= 4 ? 176 : 116);
        eclipse.addColorStop(0, phase >= 4 ? 'rgba(0,5,13,.92)' : 'rgba(255,217,101,.17)');
        eclipse.addColorStop(.15, phase >= 4 ? 'rgba(155,244,255,.18)' : 'rgba(255,232,157,.10)');
        eclipse.addColorStop(.23, phase >= 4 ? 'rgba(255,242,176,.24)' : 'rgba(255,232,157,.05)');
        eclipse.addColorStop(1, 'rgba(80,205,255,0)');
        ctx.fillStyle = eclipse; ctx.fillRect(W * .5 - 190, -60, 380, 380);
      }
      ctx.restore();
    }
  }

  // The Hanging Acre changes its physical sentence as the route advances:
  // first the bird passes beneath a suspended canopy, then through falling
  // seed, and finally into a harvest running in reverse. These marks stay
  // translucent and peripheral so they read as depth rather than collision.
  function drawHangingAcreActs(ctx, time, progress, state) {
    const p = clamp(finite(progress), 0, 1);
    const reduced = !!(state && state.reducedEffects);
    const motionTime = reduced ? 0 : finite(time);
    const currentY = clamp(finite(state && state.currentY), -240, 240);
    const suppliedLift = state && Number.isFinite(state.harvestLift)
      ? clamp(state.harvestLift, 0, 1)
      : null;

    // Wide overlaps make the three acts cross-dissolve instead of switching.
    const canopyAct = 1 - ease((p - .2) / .3);
    const seedAct = ease((p - .1) / .25) * (1 - ease((p - .62) / .25));
    const harvestAct = ease((p - .53) / .31);
    const lift = suppliedLift === null ? harvestAct : lerp(harvestAct, suppliedLift, .46);
    const sideInset = 176;

    if (canopyAct > .002) {
      ctx.save();
      const canopyShade = ctx.createLinearGradient(0, 0, 0, H * .42);
      canopyShade.addColorStop(0, `rgba(3,18,10,${canopyAct * .34})`);
      canopyShade.addColorStop(.58, `rgba(7,25,13,${canopyAct * .075})`);
      canopyShade.addColorStop(1, 'rgba(7,25,13,0)');
      ctx.fillStyle = canopyShade;
      ctx.fillRect(0, 0, W, H * .44);

      ctx.lineCap = 'round';
      for (let i = 0; i < (reduced ? 8 : 14); i++) {
        const right = i % 2;
        const seed = 1721 + i * 31.7;
        const edgeX = 24 + hash(seed) * sideInset;
        const x = right ? W - edgeX : edgeX;
        const endY = H * (.19 + hash(seed + 7) * .31);
        const sway = Math.sin(motionTime * (.22 + hash(seed + 9) * .12) + seed) * (3 + hash(seed + 11) * 7);
        ctx.strokeStyle = `rgba(183,225,126,${canopyAct * (.055 + hash(seed + 13) * .055)})`;
        ctx.lineWidth = .65 + hash(seed + 17) * 1.15;
        ctx.beginPath();
        ctx.moveTo(x, -12);
        ctx.bezierCurveTo(x + sway * .25, endY * .32, x - sway * .7, endY * .72, x + sway, endY);
        ctx.stroke();

        ctx.save();
        ctx.translate(x + sway, endY);
        ctx.rotate(sway * .018 + (right ? -.12 : .12));
        ctx.fillStyle = `rgba(207,226,132,${canopyAct * .075})`;
        ctx.beginPath();
        ctx.ellipse(0, 4, 3 + hash(seed + 21) * 4, 8 + hash(seed + 23) * 7, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    if (seedAct > .002) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.lineCap = 'round';
      const count = reduced ? 18 : 38;
      const span = H + 150;
      for (let i = 0; i < count; i++) {
        const seed = 2317 + i * 43.3;
        const right = hash(seed + 3) > .5;
        // Only every fifth seed crosses the lane, and those are dimmer. The
        // central navigation space never becomes a wall of false hit shapes.
        const laneSeed = i % 5 === 0;
        const x = laneSeed
          ? 80 + hash(seed + 5) * (W - 160)
          : (right ? W - 32 - hash(seed + 5) * sideInset : 32 + hash(seed + 5) * sideInset);
        const fallSpeed = 44 + hash(seed + 7) * 52 + currentY * .09;
        const y = wrap(hash(seed + 9) * span + motionTime * fallSpeed + p * 250, span) - 75;
        const drift = Math.sin(motionTime * .31 + seed) * (2 + hash(seed + 11) * 5);
        const alpha = seedAct * (laneSeed ? .07 : .12 + hash(seed + 13) * .09);
        ctx.strokeStyle = `rgba(231,244,159,${alpha * .72})`;
        ctx.lineWidth = .55 + hash(seed + 15) * .55;
        ctx.beginPath();
        ctx.moveTo(x + drift, y - 8);
        ctx.quadraticCurveTo(x + drift * .6 + (right ? -3 : 3), y - 3, x + drift, y);
        ctx.stroke();
        ctx.fillStyle = `rgba(174,232,126,${alpha})`;
        ctx.save();
        ctx.translate(x + drift, y + 2);
        ctx.rotate((hash(seed + 17) - .5) * 1.3 + Math.sin(motionTime * .4 + seed) * .22);
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.2 + hash(seed + 19) * 1.5, 3.2 + hash(seed + 23) * 2.6, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    if (harvestAct > .002 || lift > .002) {
      const strength = Math.max(harvestAct, lift * .82);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // Soft peripheral columns communicate the current without creating a
      // horizontal ledge or a bright corridor the player could mistake for a
      // rule of collision.
      for (const side of [-1, 1]) {
        const edge = side < 0 ? 0 : W;
        const draft = ctx.createLinearGradient(edge, 0, edge - side * 210, 0);
        draft.addColorStop(0, `rgba(136,238,165,${strength * .115})`);
        draft.addColorStop(.7, `rgba(219,243,158,${strength * .025})`);
        draft.addColorStop(1, 'rgba(219,243,158,0)');
        ctx.fillStyle = draft;
        ctx.fillRect(side < 0 ? 0 : W - 210, 0, 210, H);
      }

      ctx.lineCap = 'round';
      const count = reduced ? 11 : 24;
      const span = H + 180;
      const riseTravel = motionTime * (72 + lift * 64) + p * 330 - currentY * .12;
      for (let i = 0; i < count; i++) {
        const seed = 3181 + i * 59.9;
        const right = i % 2;
        const edgeX = 26 + hash(seed + 3) * (sideInset + 8);
        const baseX = right ? W - edgeX : edgeX;
        const y = H + 90 - wrap(hash(seed + 5) * span + riseTravel * (.72 + hash(seed + 7) * .5), span);
        const weave = Math.sin(motionTime * (.25 + hash(seed + 9) * .18) + seed) * (5 + hash(seed + 11) * 10);
        const alpha = strength * (.08 + hash(seed + 13) * .105);
        const length = 9 + hash(seed + 15) * 17;
        ctx.strokeStyle = `rgba(153,235,147,${alpha * .64})`;
        ctx.lineWidth = .55 + hash(seed + 17) * .75;
        ctx.beginPath();
        ctx.moveTo(baseX + weave, y + length);
        ctx.quadraticCurveTo(baseX - weave * .2, y + length * .45, baseX + weave * .55, y);
        ctx.stroke();

        ctx.save();
        ctx.translate(baseX + weave * .55, y);
        ctx.rotate(Math.sin(motionTime * .33 + seed) * .45 + (right ? -.2 : .2));
        ctx.strokeStyle = `rgba(241,245,166,${alpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 2 + hash(seed + 19) * 2.5, 5 + hash(seed + 21) * 4, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  // Glassbone Ravine begins as a split in the earth, briefly closes around the
  // bird like a ruined nave, then opens onto a distant horizon that appears to
  // have a pulse. The structural marks never meet across the flight lane: they
  // stay soft, incomplete and peripheral so none reads as a collision wall.
  function drawGlassboneRavineActs(ctx, time, progress, state) {
    const p = clamp(finite(progress), 0, 1);
    const reduced = !!(state && state.reducedEffects);
    const motionTime = reduced ? 0 : finite(time);
    const currentX = finite(state && state.currentX, 0);

    // The entire ravine answers the same heartbeat that carries enemies and
    // their authored gaps. The bounded translation reads as breathing terrain,
    // never as an independent hazard or camera shove.
    ctx.save();
    ctx.translate(currentX * .32, 0);

    // Generous overlaps make the geography metamorphose instead of cutting.
    const ravineAct = 1 - ease((p - .18) / .29);
    const naveAct = ease((p - .08) / .25) * (1 - ease((p - .67) / .24));
    const horizonAct = ease((p - .51) / .34);
    const sideSpan = 178;

    if (ravineAct > .002) {
      ctx.save();

      // Faceted walls darken the margins without describing a hard boundary.
      for (const side of [-1, 1]) {
        const edge = side < 0 ? 0 : W;
        const wall = ctx.createLinearGradient(edge, 0, edge - side * 220, 0);
        wall.addColorStop(0, `rgba(20,12,20,${ravineAct * .54})`);
        wall.addColorStop(.58, `rgba(55,35,37,${ravineAct * .13})`);
        wall.addColorStop(1, 'rgba(55,35,37,0)');
        ctx.fillStyle = wall;
        ctx.fillRect(side < 0 ? 0 : W - 220, 0, 220, H);

        ctx.lineCap = 'round';
        for (let i = 0; i < (reduced ? 6 : 11); i++) {
          const seed = 4217 + i * 67.1 + (side > 0 ? 1703 : 0);
          const edgeX = 15 + hash(seed) * sideSpan;
          const x = side < 0 ? edgeX : W - edgeX;
          const span = H + 190;
          const y = wrap(hash(seed + 3) * span + motionTime * (24 + hash(seed + 5) * 42) + p * 180, span) - 95;
          const reach = 16 + hash(seed + 7) * 38;
          const fall = 48 + hash(seed + 9) * 104;
          ctx.strokeStyle = `rgba(255,213,165,${ravineAct * (.055 + hash(seed + 11) * .09)})`;
          ctx.lineWidth = .55 + hash(seed + 13) * 1.15;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - side * reach * .72, y + fall * .38);
          ctx.lineTo(x - side * reach, y + fall);
          ctx.stroke();

          // A tiny detached glint makes the fissure read as glass in depth,
          // rather than as a wire or a gameplay laser.
          ctx.fillStyle = `rgba(255,229,189,${ravineAct * .12})`;
          ctx.beginPath();
          ctx.ellipse(x - side * reach * .84, y + fall * .68, 1 + hash(seed + 15) * 1.8, 3 + hash(seed + 17) * 3.8, side * .38, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    if (naveAct > .002) {
      ctx.save();

      // The nave is implied by paired buttresses and broken half-vaults. Each
      // side ends well outside the central third, preserving an honest lane.
      for (const side of [-1, 1]) {
        for (let i = 0; i < (reduced ? 3 : 5); i++) {
          const depth = i / 4;
          const seed = 5579 + i * 83.7 + (side > 0 ? 911 : 0);
          const x = side < 0 ? 30 + depth * 104 : W - 30 - depth * 104;
          const drift = Math.sin(motionTime * .14 + seed) * (1.5 + depth * 2.5);
          const baseAlpha = naveAct * (.095 - depth * .018);

          ctx.strokeStyle = `rgba(249,224,184,${baseAlpha})`;
          ctx.lineWidth = 2.6 - depth * .7;
          ctx.beginPath();
          ctx.moveTo(x + drift, H + 20);
          ctx.bezierCurveTo(x - side * 8, H * .7, x + side * 11, H * .27, x + side * (14 + depth * 9), -18);
          ctx.stroke();

          ctx.strokeStyle = `rgba(194,72,65,${baseAlpha * .66})`;
          ctx.lineWidth = .8 + depth * .35;
          ctx.beginPath();
          ctx.moveTo(x + side * 5, H * .92);
          ctx.bezierCurveTo(x - side * 4, H * .61, x + side * 8, H * .34, x + side * (17 + depth * 8), H * .12);
          ctx.stroke();

          const vaultY = H * (.1 + depth * .115);
          const vaultEnd = side < 0 ? 222 + depth * 17 : W - 222 - depth * 17;
          ctx.strokeStyle = `rgba(255,216,164,${baseAlpha * .72})`;
          ctx.lineWidth = 1.2 + (1 - depth) * .55;
          ctx.beginPath();
          ctx.moveTo(x + side * 12, vaultY - 84);
          ctx.quadraticCurveTo(x + side * 84, vaultY - 42, vaultEnd, vaultY + 20);
          ctx.stroke();

          // Narrow luminous cavities distinguish the middle act at a glance,
          // but remain translucent scenery tucked against the margins.
          const windowY = H * (.24 + depth * .16);
          const glass = ctx.createRadialGradient(x, windowY, 0, x, windowY, 47 - depth * 9);
          glass.addColorStop(0, `rgba(255,184,127,${naveAct * (.09 - depth * .012)})`);
          glass.addColorStop(.48, `rgba(225,80,69,${naveAct * .035})`);
          glass.addColorStop(1, 'rgba(225,80,69,0)');
          ctx.fillStyle = glass;
          ctx.fillRect(x - 52, windowY - 86, 104, 172);
        }
      }

      // Dust climbs through the nave like reverse incense. Nearly all of it is
      // peripheral, and it uses irregular flecks rather than bullet-like dots.
      ctx.globalCompositeOperation = 'screen';
      const fleckCount = reduced ? 12 : 25;
      const span = H + 120;
      for (let i = 0; i < fleckCount; i++) {
        const seed = 6401 + i * 47.3;
        const right = i % 2;
        const edgeX = 38 + hash(seed + 3) * (sideSpan + 10);
        const x = right ? W - edgeX : edgeX;
        const y = H + 60 - wrap(hash(seed + 5) * span + motionTime * (18 + hash(seed + 7) * 35) + p * 210, span);
        const sway = Math.sin(motionTime * .27 + seed) * 4;
        ctx.fillStyle = `rgba(255,225,181,${naveAct * (.075 + hash(seed + 9) * .08)})`;
        ctx.beginPath();
        ctx.moveTo(x + sway - 2, y + 4);
        ctx.lineTo(x + sway + 1, y - 4);
        ctx.lineTo(x + sway + 3, y + 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    if (horizonAct > .002) {
      ctx.save();
      const rawBeat = reduced ? .42 : .5 + Math.sin(motionTime * 1.34 - p * 1.7) * .5;
      const beat = Math.pow(rawBeat, 3);
      const horizonY = H * .135;

      // A soft distant opening replaces the close nave. It has no crisp rim or
      // closed contour, so its pulse cannot be confused with a projectile.
      ctx.globalCompositeOperation = 'screen';
      const opening = ctx.createRadialGradient(W * .5, horizonY, 4, W * .5, horizonY, 190 + beat * 22);
      opening.addColorStop(0, `rgba(255,244,204,${horizonAct * (.18 + beat * .105)})`);
      opening.addColorStop(.17, `rgba(255,180,122,${horizonAct * (.11 + beat * .06)})`);
      opening.addColorStop(.52, `rgba(217,77,69,${horizonAct * .036})`);
      opening.addColorStop(1, 'rgba(217,77,69,0)');
      ctx.fillStyle = opening;
      ctx.fillRect(W * .5 - 220, -80, 440, 430);

      // Broken vascular rays answer the beat along the margins. Their center
      // ends fade before the combat lane and never assemble into a barrier.
      for (const side of [-1, 1]) {
        const edge = side < 0 ? 0 : W;
        const warmth = ctx.createLinearGradient(edge, 0, edge - side * 210, 0);
        warmth.addColorStop(0, `rgba(223,73,65,${horizonAct * (.105 + beat * .065)})`);
        warmth.addColorStop(.72, `rgba(255,180,121,${horizonAct * .018})`);
        warmth.addColorStop(1, 'rgba(255,180,121,0)');
        ctx.fillStyle = warmth;
        ctx.fillRect(side < 0 ? 0 : W - 210, 0, 210, H);

        ctx.lineCap = 'round';
        for (let i = 0; i < (reduced ? 6 : 10); i++) {
          const seed = 7919 + i * 61.9 + (side > 0 ? 1201 : 0);
          const edgeX = 22 + hash(seed) * sideSpan;
          const x = side < 0 ? edgeX : W - edgeX;
          const y = H * (.23 + hash(seed + 3) * .72);
          const pulseReach = 10 + beat * (4 + hash(seed + 5) * 9);
          ctx.strokeStyle = `rgba(255,186,133,${horizonAct * (.045 + hash(seed + 7) * .07)})`;
          ctx.lineWidth = .6 + hash(seed + 9) * .9;
          ctx.beginPath();
          ctx.moveTo(x, y + pulseReach);
          ctx.bezierCurveTo(x - side * 18, y - 22, x + side * 26, y - 55, x - side * (11 + hash(seed + 11) * 25), y - 92);
          ctx.stroke();
        }
      }

      // The horizon's lower glow rises very slightly with route progress,
      // making the exit feel approached rather than merely faded in.
      const horizonBandY = lerp(H * .24, H * .17, horizonAct);
      const band = ctx.createLinearGradient(0, horizonBandY - 105, 0, horizonBandY + 120);
      band.addColorStop(0, 'rgba(255,202,151,0)');
      band.addColorStop(.46, `rgba(255,184,126,${horizonAct * (.035 + beat * .025)})`);
      band.addColorStop(.58, `rgba(225,86,73,${horizonAct * .018})`);
      band.addColorStop(1, 'rgba(225,86,73,0)');
      ctx.fillStyle = band;
      ctx.fillRect(0, horizonBandY - 105, W, 225);
      ctx.restore();
    }
    ctx.restore();
  }

  // The Lung Sea changes scale across the route: first the bird crosses the
  // translucent outer membrane, then enters a chamber crowded by great valve
  // shoals, and finally reaches the lightless organ that houses the Nine
  // Throats. These forms are deliberately broad, soft and peripheral. Nothing
  // closes across the flight lane or acquires the crisp nucleus of a hazard.
  function drawLungSeaActs(ctx, time, progress, state) {
    const p = clamp(finite(progress), 0, 1);
    const reduced = !!(state && state.reducedEffects);
    const motionTime = reduced ? 0 : finite(time);
    const breathRaw = reduced ? .48 : .5 + Math.sin(motionTime * 1.02 - p * 1.6) * .5;
    const breath = ease(breathRaw);
    const orbitX = finite(state && state.orbitX, 0);
    const orbitY = finite(state && state.orbitY, 0);

    ctx.save();
    ctx.translate(orbitX * .34, orbitY * .34);

    // Long overlaps make the material appear to open around the player rather
    // than cross-fading between three unrelated backgrounds.
    const membraneAct = 1 - ease((p - .2) / .34);
    const chamberAct = ease((p - .08) / .28) * (1 - ease((p - .72) / .24));
    const abyssAct = ease((p - .5) / .36);
    const edgeSpan = 188;

    if (membraneAct > .002) {
      ctx.save();

      // Two translucent walls expand on the same slow breath. Their inner
      // edges are gradients rather than lines, so they read as depth and never
      // as collision boundaries.
      for (const side of [-1, 1]) {
        const edge = side < 0 ? 0 : W;
        const reach = 128 + breath * 26;
        const tissue = ctx.createLinearGradient(edge, 0, edge - side * (reach + 95), 0);
        tissue.addColorStop(0, `rgba(72,31,72,${membraneAct * .43})`);
        tissue.addColorStop(.48, `rgba(198,126,157,${membraneAct * .14})`);
        tissue.addColorStop(1, 'rgba(216,164,184,0)');
        ctx.fillStyle = tissue;
        ctx.beginPath();
        ctx.moveTo(edge, -30);
        ctx.lineTo(edge, H + 30);
        ctx.bezierCurveTo(
          edge - side * (reach - 24), H * .81,
          edge - side * (reach + 22), H * .62,
          edge - side * (reach - 7), H * .48
        );
        ctx.bezierCurveTo(
          edge - side * (reach + 18), H * .3,
          edge - side * (reach - 31), H * .13,
          edge, -30
        );
        ctx.closePath();
        ctx.fill();

        // Large alveolar impressions sit inside the wall. Their scale and low
        // contrast keep them categorically separate from hostile bullets.
        for (let i = 0; i < (reduced ? 3 : 5); i++) {
          const seed = 10391 + i * 79.3 + (side > 0 ? 1709 : 0);
          const span = H + 220;
          const y = wrap(hash(seed + 3) * span + motionTime * (13 + hash(seed + 5) * 19) + p * 170, span) - 110;
          const xFromEdge = 28 + hash(seed + 7) * 86 + breath * (4 + hash(seed + 9) * 9);
          const x = side < 0 ? xFromEdge : W - xFromEdge;
          const rx = 34 + hash(seed + 11) * 40;
          const ry = 68 + hash(seed + 13) * 76;
          const hollow = ctx.createRadialGradient(x, y, 2, x, y, Math.max(rx, ry));
          hollow.addColorStop(0, `rgba(229,182,192,${membraneAct * .018})`);
          hollow.addColorStop(.44, `rgba(244,200,205,${membraneAct * .045})`);
          hollow.addColorStop(1, 'rgba(244,200,205,0)');
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
          ctx.fillStyle = hollow;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(rx, ry), 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      }

      // A cool sheen travels down the membrane, giving the first act a clear
      // water-surface identity without adding small particle clutter.
      ctx.globalCompositeOperation = 'screen';
      const sheenY = reduced ? H * .34 : wrap(motionTime * 24 + p * 260, H + 360) - 180;
      const sheen = ctx.createLinearGradient(0, sheenY - 150, 0, sheenY + 150);
      sheen.addColorStop(0, 'rgba(190,252,239,0)');
      sheen.addColorStop(.5, `rgba(190,252,239,${membraneAct * .045})`);
      sheen.addColorStop(1, 'rgba(190,252,239,0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, sheenY - 150, W, 300);
      ctx.restore();
    }

    if (chamberAct > .002) {
      ctx.save();

      // The chamber is suggested by immense side walls and paired valve lips.
      // Every valve remains outside the central half of the playfield.
      for (const side of [-1, 1]) {
        const edge = side < 0 ? 0 : W;
        const chamberShade = ctx.createLinearGradient(edge, 0, edge - side * 245, 0);
        chamberShade.addColorStop(0, `rgba(30,17,49,${chamberAct * .42})`);
        chamberShade.addColorStop(.64, `rgba(102,57,96,${chamberAct * .09})`);
        chamberShade.addColorStop(1, 'rgba(102,57,96,0)');
        ctx.fillStyle = chamberShade;
        ctx.fillRect(side < 0 ? 0 : W - 245, 0, 245, H);

        const valveCount = reduced ? 3 : 5;
        for (let i = 0; i < valveCount; i++) {
          const seed = 12157 + i * 101.7 + (side > 0 ? 2153 : 0);
          const depth = i / Math.max(1, valveCount - 1);
          const span = H + 310;
          const y = wrap(hash(seed + 3) * span + motionTime * (24 + depth * 18) + p * 270, span) - 155;
          const xFromEdge = 28 + depth * 116 + hash(seed + 5) * 18;
          const x = side < 0 ? xFromEdge : W - xFromEdge;
          const open = .78 + breath * .22;
          const halfW = (54 - depth * 10) * open;
          const halfH = 48 + depth * 22;
          const alpha = chamberAct * (.06 + (1 - depth) * .035);

          // Broad, broken lips are anatomical landmarks rather than rings.
          ctx.lineCap = 'round';
          ctx.strokeStyle = `rgba(239,166,187,${alpha})`;
          ctx.lineWidth = 13 - depth * 3;
          ctx.beginPath();
          ctx.moveTo(x - side * halfW * .2, y - halfH);
          ctx.bezierCurveTo(x - side * halfW, y - halfH * .52, x - side * halfW, y + halfH * .22, x - side * halfW * .34, y + halfH * .72);
          ctx.stroke();

          ctx.strokeStyle = `rgba(126,57,100,${alpha * 1.6})`;
          ctx.lineWidth = 19 - depth * 4;
          ctx.beginPath();
          ctx.moveTo(x + side * halfW * .12, y - halfH * .8);
          ctx.bezierCurveTo(x + side * halfW * .78, y - halfH * .35, x + side * halfW * .72, y + halfH * .31, x + side * halfW * .2, y + halfH);
          ctx.stroke();

          const lumen = ctx.createRadialGradient(x, y, 3, x, y, halfH * 1.25);
          lumen.addColorStop(0, `rgba(5,7,25,${alpha * 1.4})`);
          lumen.addColorStop(.58, `rgba(61,32,72,${alpha * .55})`);
          lumen.addColorStop(1, 'rgba(61,32,72,0)');
          ctx.fillStyle = lumen;
          ctx.fillRect(x - halfH * 1.3, y - halfH * 1.3, halfH * 2.6, halfH * 2.6);
        }
      }

      // A distant chamber roof swells above the action. Its broken highlight
      // establishes enclosure but stops far short of becoming a ceiling line.
      ctx.globalCompositeOperation = 'screen';
      const roof = ctx.createRadialGradient(W * .5, -90, 50, W * .5, -90, 430 + breath * 26);
      roof.addColorStop(0, `rgba(247,181,200,${chamberAct * .095})`);
      roof.addColorStop(.46, `rgba(185,252,239,${chamberAct * .032})`);
      roof.addColorStop(1, 'rgba(185,252,239,0)');
      ctx.fillStyle = roof;
      ctx.fillRect(0, 0, W, 360);
      ctx.restore();
    }

    if (abyssAct > .002) {
      ctx.save();

      // Light drains upward as the route reaches the central organ. The middle
      // lane remains transparent enough for hostile cores and the player.
      const depth = ctx.createLinearGradient(0, 0, 0, H);
      depth.addColorStop(0, `rgba(4,5,19,${abyssAct * .56})`);
      depth.addColorStop(.48, `rgba(8,7,27,${abyssAct * .2})`);
      depth.addColorStop(1, 'rgba(8,7,27,0)');
      ctx.fillStyle = depth;
      ctx.fillRect(0, 0, W, H);

      // Nine recessed throats resolve slowly from the organ wall: six along
      // the margins, three at the unreachable upper horizon. They have no
      // bright rims, hard circles, or moving cores that could read as shots.
      const mouths = [
        [.075, .17, .1], [.14, .4, .42], [.105, .68, .73],
        [.925, .18, .24], [.86, .43, .55], [.895, .7, .88],
        [.34, .065, .3], [.5, .035, .61], [.66, .07, .82]
      ];
      // Reduced-effects mode still keeps the promised nine-part landmark; it
      // freezes their drift and pulse instead of deleting the composition.
      for (let i = 0; i < mouths.length; i++) {
        const [nx, ny, phase] = mouths[i];
        const peripheral = i < 6;
        const x = W * nx + (reduced ? 0 : Math.sin(motionTime * .19 + i * 1.7) * 3);
        const y = H * ny + (peripheral ? 0 : -20);
        const inhale = reduced ? .54 : .5 + Math.sin(motionTime * .7 + phase * TAU) * .5;
        const rx = (peripheral ? 64 : 72) + inhale * 11;
        const ry = (peripheral ? 102 : 70) - inhale * 7;
        const alpha = abyssAct * (peripheral ? .18 : .145);

        const recess = ctx.createRadialGradient(x, y, 4, x, y, Math.max(rx, ry));
        recess.addColorStop(0, `rgba(1,2,12,${alpha})`);
        recess.addColorStop(.42, `rgba(20,12,39,${alpha * .74})`);
        recess.addColorStop(.78, `rgba(87,45,83,${alpha * .16})`);
        recess.addColorStop(1, 'rgba(87,45,83,0)');
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
        ctx.fillStyle = recess;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(rx, ry), 0, TAU);
        ctx.fill();
        ctx.restore();

        // Only short outer folds catch the distant pearl light; the mouth is
        // never outlined as a complete target or danger ring.
        ctx.strokeStyle = `rgba(219,145,180,${alpha * .24})`;
        ctx.lineWidth = 7 + inhale * 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x, y, rx * .8, -.8, .32);
        ctx.stroke();
      }

      // Long soft filaments sink toward the throats at the edges, giving the
      // final act a downward pull while leaving the combat lane untouched.
      ctx.globalCompositeOperation = 'screen';
      for (const side of [-1, 1]) {
        for (let i = 0; i < (reduced ? 4 : 7); i++) {
          const seed = 14731 + i * 71.9 + (side > 0 ? 1327 : 0);
          const xFromEdge = 18 + hash(seed + 3) * edgeSpan;
          const x = side < 0 ? xFromEdge : W - xFromEdge;
          const y = H * (.2 + hash(seed + 5) * .75);
          const sway = reduced ? 0 : Math.sin(motionTime * .31 + seed) * 9;
          ctx.strokeStyle = `rgba(185,252,239,${abyssAct * (.022 + hash(seed + 7) * .035)})`;
          ctx.lineWidth = 1.2 + hash(seed + 9) * 2.4;
          ctx.beginPath();
          ctx.moveTo(x + sway, y - 105);
          ctx.bezierCurveTo(x - side * 16, y - 42, x + side * 20 + sway, y + 38, x - side * 7, y + 125);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // The Borrowed City does not simply scroll past the bird. Its weather and
  // architecture change ownership over the route: false shelter gives way to
  // streets shedding their addresses, then the whole metropolis stands up as
  // one vertical animal. All hard structure stays in the outer quarters; the
  // navigable field is expressed with veils, not lines that resemble hazards.
  function drawBorrowedCityActs(ctx, time, progress, state) {
    const p = clamp(finite(progress), 0, 1);
    const reduced = !!(state && state.reducedEffects);
    const motionTime = reduced ? 0 : finite(time);
    const addressOffset = clamp(finite(state && state.addressOffset), -180, 180);
    const addressVelocity = clamp(finite(state && state.addressVelocity), -240, 240);
    const addressLean = addressVelocity * .018;

    // Wide overlaps make the city appear to reorganize rather than swap
    // backdrops. These act weights are deterministic functions of route
    // progress, so reduced-effects mode keeps the complete visual story.
    const outskirtsAct = 1 - ease((p - .19) / .31);
    const moltAct = ease((p - .08) / .28) * (1 - ease((p - .71) / .24));
    const uprightAct = ease((p - .5) / .36);
    const sideSpan = 184;

    if (outskirtsAct > .002) {
      ctx.save();

      // ACT I — FALSE AWNING. The roof looks protective from a distance, but
      // its two halves never meet. Rain continues through the exposed middle,
      // teaching the fraud through motion instead of a label.
      const roofShade = ctx.createLinearGradient(0, 0, 0, H * .39);
      roofShade.addColorStop(0, `rgba(5,9,14,${outskirtsAct * .49})`);
      roofShade.addColorStop(.55, `rgba(19,16,19,${outskirtsAct * .11})`);
      roofShade.addColorStop(1, 'rgba(19,16,19,0)');
      ctx.fillStyle = roofShade;
      ctx.fillRect(0, 0, W, H * .42);

      for (const side of [-1, 1]) {
        const edge = side < 0 ? 0 : W;
        const awningReach = 132 + Math.sin(motionTime * .17 + side * 1.9) * 8;
        const awning = ctx.createLinearGradient(edge, 0, edge - side * 235, 0);
        awning.addColorStop(0, `rgba(7,11,16,${outskirtsAct * .63})`);
        awning.addColorStop(.62, `rgba(51,31,30,${outskirtsAct * .17})`);
        awning.addColorStop(1, 'rgba(51,31,30,0)');
        ctx.fillStyle = awning;
        ctx.beginPath();
        ctx.moveTo(edge, -24);
        ctx.lineTo(edge, H * .42);
        ctx.bezierCurveTo(
          edge - side * (awningReach - 18), H * .34,
          edge - side * (awningReach + 26), H * .17,
          edge - side * awningReach, -24
        );
        ctx.closePath();
        ctx.fill();

        // Broad runoff and torn cloth are deliberately incomplete contours.
        // They live well outside the center and cannot read as hit geometry.
        ctx.lineCap = 'round';
        for (let i = 0; i < (reduced ? 4 : 7); i++) {
          const seed = 16001 + i * 71.3 + (side > 0 ? 1181 : 0);
          const xFromEdge = 24 + hash(seed + 3) * sideSpan;
          const x = side < 0 ? xFromEdge : W - xFromEdge;
          const span = H + 190;
          const y = wrap(
            hash(seed + 5) * span
              + motionTime * (63 + hash(seed + 7) * 39)
              + p * 210,
            span
          ) - 95;
          const slant = 8 + hash(seed + 9) * 15;
          ctx.strokeStyle = `rgba(203,229,231,${outskirtsAct * (.055 + hash(seed + 11) * .07)})`;
          ctx.lineWidth = .7 + hash(seed + 13) * 1.2;
          ctx.beginPath();
          ctx.moveTo(x + side * slant * .45, y - 34);
          ctx.bezierCurveTo(x, y - 14, x - side * slant, y + 14, x - side * slant * 1.18, y + 42);
          ctx.stroke();
        }
      }

      // A dim central rain sheet proves the awning has no gameplay effect.
      // Its strokes are long, sparse and nucleus-free, unlike hostile shots.
      ctx.globalCompositeOperation = 'screen';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < (reduced ? 6 : 13); i++) {
        const seed = 16993 + i * 53.9;
        const x = 176 + hash(seed + 3) * (W - 352);
        const y = wrap(hash(seed + 5) * (H + 170) + motionTime * (119 + hash(seed + 7) * 63), H + 170) - 85;
        ctx.moveTo(x + 5, y - 24);
        ctx.lineTo(x - 4, y + 29);
      }
      ctx.strokeStyle = `rgba(204,235,238,${outskirtsAct * .052})`;
      ctx.lineWidth = .8;
      ctx.stroke();
      ctx.restore();
    }

    if (moltAct > .002) {
      ctx.save();

      // ACT II — RUSH-HOUR MOLT. The optional gameplay offset and velocity
      // visibly displace the street skins. If the rule is absent, the authored
      // counter-current below still gives this act its own physical cadence.
      const fallbackShift = reduced
        ? 0
        : Math.sin(motionTime * .43 + Math.sin(motionTime * .117) * .8) * 17;
      const streetShift = addressOffset * .72 + fallbackShift;
      const rush = reduced ? .38 : .5 + Math.sin(motionTime * .79 + p * 3.1) * .5;

      for (const side of [-1, 1]) {
        const edge = side < 0 ? 0 : W;
        const sideShift = streetShift * (.22 + (side > 0 ? .08 : -.03));
        const streetShade = ctx.createLinearGradient(edge, 0, edge - side * 244, 0);
        streetShade.addColorStop(0, `rgba(13,13,17,${moltAct * .51})`);
        streetShade.addColorStop(.58, `rgba(77,35,31,${moltAct * .13})`);
        streetShade.addColorStop(1, 'rgba(77,35,31,0)');
        ctx.fillStyle = streetShade;
        ctx.fillRect(side < 0 ? 0 : W - 244, 0, 244, H);

        // Window fields slide in staggered address blocks. They are low-
        // contrast vertical smears, never complete bright rectangles.
        ctx.globalCompositeOperation = 'screen';
        const columnCount = reduced ? 3 : 5;
        for (let column = 0; column < columnCount; column++) {
          const depth = column / Math.max(1, columnCount - 1);
          const seed = 17707 + column * 97.1 + (side > 0 ? 1907 : 0);
          const xFromEdge = 25 + depth * 132 + hash(seed + 3) * 15;
          const x = (side < 0 ? xFromEdge : W - xFromEdge) + sideShift * (1 - depth * .5);
          const addressBand = wrap(
            hash(seed + 5) * 178
              + motionTime * (17 + depth * 12)
              + p * 370
              + addressOffset * (side < 0 ? .43 : -.37),
            178
          );
          for (let row = -1; row < 8; row++) {
            const y = row * 178 + addressBand - 94;
            const windowH = 45 + hash(seed + row * 11 + 7) * 57;
            const glow = ctx.createLinearGradient(x, y, x + side * 38, y + windowH);
            glow.addColorStop(0, 'rgba(255,183,96,0)');
            glow.addColorStop(.42, `rgba(255,179,90,${moltAct * (.026 + rush * .022)})`);
            glow.addColorStop(1, 'rgba(236,76,62,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(x - 22, y, 44, windowH);
          }
        }
        ctx.globalCompositeOperation = 'source-over';

        // The façade peels in huge translucent sheets. Their irregular filled
        // silhouettes read as material, not lasers, rails or bullet walls.
        const sheetCount = reduced ? 3 : 6;
        for (let i = 0; i < sheetCount; i++) {
          const seed = 18427 + i * 83.7 + (side > 0 ? 1423 : 0);
          const span = H + 360;
          const y = wrap(
            hash(seed + 3) * span
              + motionTime * (46 + hash(seed + 5) * 47)
              + p * 310,
            span
          ) - 180;
          const xFromEdge = 26 + hash(seed + 7) * 118;
          const x = (side < 0 ? xFromEdge : W - xFromEdge) + sideShift * .54;
          const width = 36 + hash(seed + 9) * 67;
          const height = 105 + hash(seed + 11) * 164;
          const curl = side * (14 + rush * 13 + addressLean);
          const skin = ctx.createLinearGradient(x, y, x - side * width, y + height);
          skin.addColorStop(0, `rgba(112,54,47,${moltAct * .16})`);
          skin.addColorStop(.58, `rgba(222,81,61,${moltAct * .075})`);
          skin.addColorStop(1, 'rgba(226,149,98,0)');
          ctx.fillStyle = skin;
          ctx.beginPath();
          ctx.moveTo(x, y - height * .5);
          ctx.bezierCurveTo(
            x - side * width * .24 + curl, y - height * .22,
            x - side * width + curl, y + height * .16,
            x - side * width * .47, y + height * .5
          );
          ctx.bezierCurveTo(
            x - side * width * .1, y + height * .2,
            x + side * width * .13, y - height * .17,
            x, y - height * .5
          );
          ctx.fill();
        }
      }
      ctx.restore();
    }

    if (uprightAct > .002) {
      ctx.save();

      // ACT III — THE CITY STANDS UP. Vertical masses grow from the margins
      // and flex with address velocity, revealing the streets as ribs of one
      // organism. Their inner edges dissolve before the combat lane.
      const rise = ease(uprightAct);
      const standBreath = reduced ? .52 : .5 + Math.sin(motionTime * .67 + p * 2.2) * .5;
      for (const side of [-1, 1]) {
        const edge = side < 0 ? 0 : W;
        const body = ctx.createLinearGradient(edge, 0, edge - side * 260, 0);
        body.addColorStop(0, `rgba(3,8,14,${rise * .73})`);
        body.addColorStop(.55, `rgba(39,21,24,${rise * .2})`);
        body.addColorStop(1, 'rgba(39,21,24,0)');
        ctx.fillStyle = body;
        ctx.fillRect(side < 0 ? 0 : W - 260, 0, 260, H);

        const trunkCount = reduced ? 3 : 5;
        for (let i = 0; i < trunkCount; i++) {
          const depth = i / Math.max(1, trunkCount - 1);
          const seed = 19681 + i * 109.7 + (side > 0 ? 2371 : 0);
          const xFromEdge = 18 + depth * 128 + hash(seed + 3) * 17;
          const x = (side < 0 ? xFromEdge : W - xFromEdge)
            + addressOffset * (.08 + depth * .05);
          const flex = (reduced ? 0 : Math.sin(motionTime * (.13 + depth * .05) + seed) * (5 + depth * 4))
            + addressLean * (.7 + depth * .3);
          const topY = lerp(H * .7, -55, rise) + depth * 36;
          const width = 30 - depth * 9;

          ctx.lineCap = 'round';
          ctx.strokeStyle = `rgba(20,14,19,${rise * (.52 - depth * .08)})`;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(x, H + 55);
          ctx.bezierCurveTo(
            x - side * (12 + depth * 19), H * .72,
            x + flex, H * .31,
            x - side * flex * .32, topY
          );
          ctx.stroke();

          // Warm capillaries and cool rain sheen remain broken, soft accents.
          ctx.globalCompositeOperation = 'screen';
          ctx.strokeStyle = `rgba(238,91,63,${rise * (.045 + standBreath * .038)})`;
          ctx.lineWidth = 1.4 + (1 - depth) * 1.6;
          ctx.beginPath();
          ctx.moveTo(x - side * 4, H * .94);
          ctx.bezierCurveTo(x + side * 3, H * .69, x + flex * .55, H * .39, x - side * flex * .2, Math.max(topY + 38, H * .05));
          ctx.stroke();
          ctx.strokeStyle = `rgba(170,230,237,${rise * .035})`;
          ctx.lineWidth = .8;
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';

          // Short ribs articulate scale but never extend into the center half.
          for (let rib = 0; rib < 4; rib++) {
            const ribY = H * (.24 + rib * .18) + depth * 18;
            const reach = 17 + hash(seed + rib * 17 + 9) * 28;
            ctx.strokeStyle = `rgba(106,53,48,${rise * (.075 - depth * .015)})`;
            ctx.lineWidth = 5 - depth * 1.4;
            ctx.beginPath();
            ctx.moveTo(x, ribY);
            ctx.quadraticCurveTo(x - side * reach * .68, ribY + 12, x - side * reach, ribY + 38);
            ctx.stroke();
          }
        }
      }

      // The distant upright axis is a misted light well, not a solid column.
      // It implies an enormous body beyond the boss while preserving contrast
      // behind the player and every hostile core.
      ctx.globalCompositeOperation = 'screen';
      const axisX = W * .5 + addressOffset * .12;
      const axis = ctx.createLinearGradient(axisX - 130, 0, axisX + 130, 0);
      axis.addColorStop(0, 'rgba(255,185,105,0)');
      axis.addColorStop(.46, `rgba(255,170,90,${rise * .025})`);
      axis.addColorStop(.5, `rgba(197,232,232,${rise * (.035 + standBreath * .018)})`);
      axis.addColorStop(.54, `rgba(239,90,66,${rise * .022})`);
      axis.addColorStop(1, 'rgba(239,90,66,0)');
      ctx.fillStyle = axis;
      ctx.fillRect(axisX - 130, 0, 260, H);
      ctx.restore();
    }

    // The source plate has a memorable raster landmark cadence. These broad
    // procedural occluders travel on three incommensurate cycles, breaking the
    // recognition loop without changing image assets or background caching.
    // They remain large, dark and edge-biased, so none can be mistaken for a
    // projectile, telegraph or collision boundary.
    ctx.save();
    const occlusionWeight = clamp(.3 * outskirtsAct + .63 * moltAct + .76 * uprightAct, 0, 1);
    const cycles = [8.17, 11.63, 14.29];
    for (let i = 0; i < cycles.length; i++) {
      const cycle = cycles[i];
      const phase = reduced ? hash(20717 + i * 31) : wrap(motionTime / cycle + hash(20717 + i * 31), 1);
      const right = i % 2;
      const xTravel = lerp(-240, W + 240, phase);
      const x = right ? W - xTravel : xTravel;
      const y = H * (.18 + hash(20963 + i * 43) * .68);
      const radius = 132 + i * 34;
      const veil = ctx.createRadialGradient(x, y, radius * .18, x, y, radius);
      veil.addColorStop(0, `rgba(2,6,11,${occlusionWeight * (.075 + i * .018)})`);
      veil.addColorStop(.56, `rgba(10,8,12,${occlusionWeight * .04})`);
      veil.addColorStop(1, 'rgba(10,8,12,0)');
      ctx.fillStyle = veil;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }

  // The final passage spends scale, not clutter.  Its source plate already
  // contains the complete vertical revelation, so these three overlapping
  // acts make that journey physical: night falls away, migration becomes
  // weather, and the apparent landscape resolves into one enormous animal.
  // When the First Blue's arena rolls, only this authored atmosphere banks
  // around PETREL.  Reduced-effects mode keeps that structural rotation
  // because it mirrors the real rule, while removing incidental drift.
  function drawFirstBlueActs(ctx, time, progress, state) {
    const p = clamp(finite(progress), 0, 1);
    const reduced = !!(state && state.reducedEffects);
    const motionTime = reduced ? 0 : finite(time);
    const emergenceAct = 1 - ease((p - .25) / .15);
    const migrationAct = ease((p - .22) / .14) * (1 - ease((p - .72) / .14));
    const wholeAnimalAct = ease((p - .61) / .22);
    const crownApproach = ease((p - .78) / .19) * ((state && state.phase === 'field') ? 1 : .16);
    const bank = clamp(finite(state && state.blueRollAngle), -.105, .105);
    const pivotX = clamp(finite(state && state.playerX, W * .5), 36, W - 36);
    const pivotY = clamp(finite(state && state.playerY, H * .82), 36, H - 36);

    ctx.save();
    if (Math.abs(bank) > .0001) {
      ctx.translate(pivotX, pivotY);
      ctx.rotate(bank);
      ctx.translate(-pivotX, -pivotY);
    }

    if (emergenceAct > .002) {
      ctx.save();

      // ACT I — EMERGENCE INTO THE FIRST BLUE. A receding night membrane
      // joins the city passage to the high atmosphere without putting small
      // lights, crisp marks or false collision silhouettes into the lane.
      const release = ease((p - .02) / .32);
      const nightTop = lerp(H * .31, H * .72, release);
      const night = ctx.createLinearGradient(0, nightTop - 180, 0, H);
      night.addColorStop(0, 'rgba(5,18,38,0)');
      night.addColorStop(.48, `rgba(5,18,38,${emergenceAct * .075})`);
      night.addColorStop(1, `rgba(5,18,38,${emergenceAct * .3})`);
      ctx.fillStyle = night;
      ctx.fillRect(0, nightTop - 180, W, H - nightTop + 180);

      // Two immense soft banks peel away from the outer quarters. Their
      // asymmetry prevents the plate from reading as a repeated frame.
      for (const side of [-1, 1]) {
        const edge = side < 0 ? 0 : W;
        const reach = 215 + (reduced ? 0 : Math.sin(motionTime * .13 + side * 1.7) * 13);
        ctx.fillStyle = `rgba(8,29,52,${emergenceAct * .16})`;
        ctx.beginPath();
        ctx.moveTo(edge, -35);
        ctx.lineTo(edge, H + 40);
        ctx.bezierCurveTo(
          edge - side * (reach * .42), H * .78,
          edge - side * (reach * 1.08), H * .42,
          edge - side * reach, -35
        );
        ctx.closePath();
        ctx.fill();
      }

      // A few cloud folds descend past the wings. They are broad, filled and
      // nucleus-free, so they cannot be confused with hostile weather.
      const foldCount = reduced ? 3 : 4;
      for (let i = 0; i < foldCount; i++) {
        const seed = 23117 + i * 83.7;
        const side = i % 2 ? 1 : -1;
        const span = H + 390;
        const y = wrap(
          hash(seed + 3) * span + motionTime * (18 + hash(seed + 5) * 11) + p * 255,
          span
        ) - 195;
        const x = side < 0 ? 42 + hash(seed + 7) * 92 : W - 42 - hash(seed + 7) * 92;
        const width = 118 + hash(seed + 9) * 62;
        const height = 62 + hash(seed + 11) * 39;
        ctx.fillStyle = `rgba(225,245,244,${emergenceAct * (.024 + hash(seed + 13) * .025)})`;
        ctx.beginPath();
        ctx.moveTo(x - side * width, y + height * .22);
        ctx.bezierCurveTo(x - side * width * .54, y - height, x + side * width * .2, y - height * .7, x + side * width, y + height * .16);
        ctx.bezierCurveTo(x + side * width * .34, y + height * .5, x - side * width * .4, y + height * .6, x - side * width, y + height * .22);
        ctx.fill();
      }

      // Planetary curvature arrives before the body is consciously legible.
      const radii = [[590, 390, 16], [515, 330, 6], [445, 275, 1.2]];
      for (let i = 0; i < radii.length; i++) {
        const [rx, ry, width] = radii[i];
        ctx.strokeStyle = `rgba(184,229,235,${emergenceAct * (.022 + i * .016)})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.ellipse(W * .5, H + 220, rx, ry, 0, Math.PI, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (migrationAct > .002) {
      ctx.save();

      // ACT II — MIGRATION WEATHER. Continental jetstreams are filled veils,
      // not projectile-like rails. Their huge scale is Zone VI's unique verb.
      const ribbonCount = reduced ? 3 : 4;
      for (let i = 0; i < ribbonCount; i++) {
        const seed = 24419 + i * 101.3;
        const y = 112 + i * 138;
        const thickness = 28 + hash(seed + 3) * 26;
        const travel = reduced ? 0 : (wrap(motionTime * (.014 + i * .0027) + hash(seed + 5), 1) - .5) * 230;
        const lift = Math.sin(motionTime * (.11 + i * .017) + seed) * (reduced ? 0 : 11);
        ctx.fillStyle = `rgba(218,242,242,${migrationAct * (.017 + i * .006)})`;
        ctx.beginPath();
        ctx.moveTo(-185 + travel, y + lift);
        ctx.bezierCurveTo(W * .18 + travel, y - 48 + lift, W * .68 + travel, y + 38 + lift, W + 185 + travel, y - 15 + lift);
        ctx.lineTo(W + 185 + travel, y - 15 + lift + thickness);
        ctx.bezierCurveTo(W * .68 + travel, y + 38 + lift + thickness, W * .18 + travel, y - 48 + lift + thickness, -185 + travel, y + lift + thickness);
        ctx.closePath();
        ctx.fill();
      }

      // Three ranks of distant whole animals cross only the upper atmosphere.
      // Paired filled wings remain unmistakably fauna rather than bullets.
      const ranks = reduced ? 2 : 3;
      const perRank = reduced ? 3 : 4;
      for (let rank = 0; rank < ranks; rank++) {
        for (let i = 0; i < perRank; i++) {
          const seed = 25189 + rank * 521 + i * 67.9;
          const span = W + 260;
          const x = wrap(hash(seed + 3) * span + motionTime * (42 + rank * 9) + p * (430 + rank * 55), span) - 130;
          const y = 104 + rank * 126 + hash(seed + 5) * 42 + Math.sin(motionTime * .2 + seed) * (reduced ? 0 : 8);
          const wing = 16 + rank * 5 + hash(seed + 7) * 8;
          const belly = 4 + rank * 1.4;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((hash(seed + 9) - .5) * .13 + (reduced ? 0 : Math.sin(motionTime * .17 + seed) * .035));
          ctx.fillStyle = `rgba(20,63,91,${migrationAct * (.105 + rank * .024)})`;
          ctx.beginPath();
          ctx.moveTo(0, belly * .32);
          ctx.bezierCurveTo(-wing * .24, -belly, -wing * .72, -belly * 1.55, -wing, -belly * .42);
          ctx.bezierCurveTo(-wing * .58, -belly * .27, -wing * .22, belly * .45, 0, belly * .32);
          ctx.bezierCurveTo(wing * .22, belly * .45, wing * .58, -belly * .27, wing, -belly * .42);
          ctx.bezierCurveTo(wing * .72, -belly * 1.55, wing * .24, -belly, 0, belly * .32);
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();
    }

    if (wholeAnimalAct > .002) {
      ctx.save();

      // ACT III — THE WHOLE ANIMAL. A single low-frequency mass and broken
      // side capillaries reveal that the apparent sea is living anatomy while
      // leaving the center and projectile silhouettes untouched.
      const body = ctx.createRadialGradient(W * .5, H + 245, 170, W * .5, H + 245, 690);
      body.addColorStop(0, `rgba(108,159,178,${wholeAnimalAct * .082})`);
      body.addColorStop(.54, `rgba(45,102,133,${wholeAnimalAct * .046})`);
      body.addColorStop(1, 'rgba(8,25,48,0)');
      ctx.fillStyle = body;
      ctx.fillRect(0, H * .55, W, H * .45);

      const animalRadii = [[610, 430, 12], [526, 354, 4.5], [448, 292, 1.1]];
      for (let i = 0; i < animalRadii.length; i++) {
        if (reduced && i === 1) continue;
        const [rx, ry, width] = animalRadii[i];
        ctx.strokeStyle = `rgba(112,231,255,${wholeAnimalAct * (.025 + i * .012)})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.ellipse(W * .5, H + 245, rx, ry, 0, Math.PI, TAU);
        ctx.stroke();
      }

      const veinCount = reduced ? 2 : 3;
      for (const side of [-1, 1]) {
        for (let i = 0; i < veinCount; i++) {
          const seed = 26861 + i * 79.7 + (side > 0 ? 1871 : 0);
          const xFromEdge = 28 + i * 55 + hash(seed + 3) * 17;
          const x = side < 0 ? xFromEdge : W - xFromEdge;
          const pulse = reduced ? .5 : .5 + Math.sin(motionTime * .31 + seed) * .5;
          ctx.strokeStyle = `rgba(112,231,255,${wholeAnimalAct * (.024 + pulse * .031)})`;
          ctx.lineWidth = 1 + i * .55;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x, H + 20);
          ctx.bezierCurveTo(x - side * 18, H * .82, x + side * 20, H * .67, x - side * (8 + i * 5), H * (.54 + i * .045));
          ctx.stroke();
        }
      }

      // Seven soft feather-veils prepare the Crown Louse's upper-center throne
      // without creating another eclipse, hard ray, or dishonest safe route.
      if (crownApproach > .002) {
        const veilCount = reduced ? 4 : 7;
        for (let i = 0; i < veilCount; i++) {
          const u = veilCount === 1 ? .5 : i / (veilCount - 1);
          const topX = lerp(68, W - 68, u);
          const bias = (u - .5) * 42;
          ctx.fillStyle = `rgba(255,244,187,${crownApproach * (.018 + (1 - Math.abs(u - .5) * 2) * .022)})`;
          ctx.beginPath();
          ctx.moveTo(topX - 24, -28);
          ctx.bezierCurveTo(topX - 7, 39, W * .5 + bias - 34, 101, W * .5 + bias, 151);
          ctx.bezierCurveTo(W * .5 + bias + 19, 108, topX + 12, 45, topX + 24, -28);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawAuthoredZonePlate(ctx, zoneIndex, time, progress, state) {
    if (zoneIndex === 0) return drawLowTidePlate(ctx, time, progress, state);
    const bundle = zoneArt[zoneIndex];
    const plate = ensureArtImage(bundle && bundle.plate);
    if (!imageReady(plate)) return false;
    const look = authoredPlateLooks[zoneIndex];
    const travel = ease(progress);
    const breathingZoom = state && state.reducedEffects ? 0 : Math.sin(time * .065 + zoneIndex) * .004;
    const crop = clamp(.76 + breathingZoom, .75, .77);
    const sourceWidth = plate.naturalWidth * crop;
    const sourceHeight = plate.naturalHeight * crop;
    const maxX = plate.naturalWidth - sourceWidth;
    const maxY = plate.naturalHeight - sourceHeight;
    const sourceX = clamp(maxX * .5 + Math.sin(time * .047 + zoneIndex) * 4, 0, maxX);
    const sourceY = zoneIndex === 5
      ? lerp(maxY, 0, travel)
      : lerp(maxY * (.9 + zoneIndex * .015), maxY * .03, travel);
    ctx.drawImage(plate, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, W, H);

    drawForwardTravelParallax(ctx, zoneIndex, time, progress, state, look);
    drawAuthoredZoneAtmosphere(ctx, zoneIndex, time, progress, state, look);
    if (zoneIndex === 1) drawHangingAcreActs(ctx, time, progress, state);
    else if (zoneIndex === 2) drawGlassboneRavineActs(ctx, time, progress, state);
    else if (zoneIndex === 3) drawLungSeaActs(ctx, time, progress, state);
    else if (zoneIndex === 4) drawBorrowedCityActs(ctx, time, progress, state);
    else if (zoneIndex === 5) drawFirstBlueActs(ctx, time, progress, state);
    drawLaneGrade(ctx, state, look.shadow, zoneIndex);

    const vignette = ctx.createRadialGradient(W * .5, H * .49, H * .24, W * .5, H * .51, H * .78);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(.72, 'rgba(0,0,0,.018)');
    vignette.addColorStop(1, `rgba(${look.shadow[0]},${look.shadow[1]},${look.shadow[2]},${look.vignette})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    return true;
  }

  function drawPetrel(ctx, player, state) {
    const sprite = artImages.petrel;
    if (!ctx || !player || !imageReady(sprite)) return false;
    if (player.dead && Math.floor(finite(state && state.time) * 18) % 2) return true;

    const wing = clamp(finite(player.wing), 0, 1);
    const time = finite(state && state.time);
    const reducedEffects = !!(state && state.reducedEffects);
    const firePulse = normalizedPulse(player.firePulse);
    const focusPulse = normalizedPulse(player.focusPulse);
    const hitPulse = normalizedPulse(player.hitPulse, PLAYER_HIT_PULSE_MAX);
    const clearRemaining = normalizedPulse(player.clearPulse, PLAYER_CLEAR_DURATION);
    const requestedWidth = lerp(84, 53, wing);
    const edgeRoom = Math.min(finite(player.x, W * .5), W - finite(player.x, W * .5));
    // The true core may safely reach the navigation boundary. The illustrated
    // wings elastically fold there instead of being sliced by the canvas edge.
    const width = Math.min(requestedWidth, Math.max(42, (edgeRoom - 3) * 2));
    const height = lerp(120, 110, wing);
    const bank = clamp(finite(player.bank), -1, 1);
    ctx.save();
    ctx.translate(finite(player.x, W * .5), finite(player.y, H * .78));

    // Damage clears hostile material to an exact 135-unit gameplay radius.
    // Keep this membrane in world space so recoil and squash cannot falsify it.
    if (clearRemaining > 0) {
      const clearTravel = ease(clamp((1 - clearRemaining) / .82, 0, 1));
      const clearRadius = lerp(12, PLAYER_CLEAR_RADIUS, clearTravel);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const membrane = ctx.createRadialGradient(0, 0, clearRadius * .68, 0, 0, clearRadius);
      membrane.addColorStop(0, 'rgba(180,246,255,0)');
      membrane.addColorStop(.84, 'rgba(180,246,255,' + clearRemaining * (reducedEffects ? .035 : .075) + ')');
      membrane.addColorStop(1, 'rgba(255,228,151,0)');
      ctx.fillStyle = membrane;
      ctx.beginPath(); ctx.arc(0, 0, clearRadius, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(226,253,255,' + clearRemaining * .72 + ')';
      ctx.lineWidth = 1.2 + clearRemaining * (reducedEffects ? 1.8 : 3.8);
      ctx.beginPath(); ctx.arc(0, 0, clearRadius, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    // A draining arc communicates the remaining invulnerability rather than
    // relying on the old binary blink alone.
    const invulnerability = finite(player.invuln);
    if (!player.dead && invulnerability > 0 && invulnerability < 98) {
      const remaining = clamp(invulnerability / PLAYER_INVULN_DURATION, 0, 1);
      const ringRadius = 17 + (1 - remaining) * 7;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = 'rgba(3,13,22,.72)';
      ctx.lineWidth = 3.6;
      ctx.beginPath(); ctx.arc(0, 0, ringRadius, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,224,135,' + (.3 + remaining * .66) + ')';
      ctx.lineWidth = reducedEffects ? 1.6 : 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, -Math.PI * .5, -Math.PI * .5 + TAU * remaining);
      ctx.stroke();
      ctx.restore();
    }

    if (player.invuln > 0 && Math.floor(player.invuln * 14) % 2) ctx.globalAlpha = .38;
    const focusDirection = player.focus ? 1 : -1;
    ctx.translate(0, firePulse * 5 + hitPulse * 1.2);
    ctx.rotate(bank * .2 + Math.sin(time * 43) * hitPulse * .028);
    ctx.scale(
      1 + hitPulse * .1 + firePulse * .025 - focusDirection * focusPulse * .04,
      1 - hitPulse * .13 - firePulse * .05 + focusDirection * focusPulse * .035
    );

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const tail = ctx.createLinearGradient(0, 9, 0, 105);
    tail.addColorStop(0, wing > .5 ? 'rgba(255,213,116,.66)' : 'rgba(196,250,255,.72)');
    tail.addColorStop(.36, 'rgba(86,207,229,.19)');
    tail.addColorStop(1, 'rgba(70,171,215,0)');
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.moveTo(-6, 17);
    ctx.bezierCurveTo(-15 - bank * 7, 49, -12, 83, -2, 106);
    ctx.lineTo(3, 106);
    ctx.bezierCurveTo(14 - bank * 7, 80, 14, 48, 6, 17);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const aura = ctx.createRadialGradient(0, 2, 3, 0, 2, 64);
    aura.addColorStop(0, wing > .5 ? 'rgba(255,220,130,.16)' : 'rgba(183,244,255,.20)');
    aura.addColorStop(1, 'rgba(95,209,235,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(-70, -65, 140, 150);
    ctx.restore();

    if (firePulse > 0) {
      const muzzleY = -height * .37 - 3;
      const pressureRadius = 8 + firePulse * 18;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const pressure = ctx.createRadialGradient(0, muzzleY, 0, 0, muzzleY, pressureRadius);
      pressure.addColorStop(0, 'rgba(255,248,207,' + firePulse * (reducedEffects ? .58 : .88) + ')');
      pressure.addColorStop(.34, 'rgba(145,239,255,' + firePulse * .34 + ')');
      pressure.addColorStop(1, 'rgba(107,222,246,0)');
      ctx.fillStyle = pressure;
      ctx.beginPath();
      ctx.ellipse(0, muzzleY, pressureRadius * .7, pressureRadius * .34, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(222,253,255,' + firePulse * .8 + ')';
      ctx.lineWidth = 1.1 + firePulse * 1.4;
      ctx.beginPath();
      ctx.arc(0, muzzleY, pressureRadius * .72, Math.PI, TAU);
      ctx.stroke();
      ctx.restore();
    }

    ctx.drawImage(sprite, -width * .5, -height * .36, width, height);

    // The exact collision core is deliberately drawn above the illustrated
    // cockpit so visual confidence never depends on texture interpretation.
    if (player.focus || player.grazePulse > 0 || finite(state && state.bulletDensity) > 170) {
      ctx.fillStyle = 'rgba(4,12,20,.88)';
      ctx.beginPath(); ctx.arc(0, 0, finite(player.radius, 5) + 2.2, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'screen';
      ctx.shadowBlur = 13; ctx.shadowColor = '#dfffff';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, finite(player.radius, 5), 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffd277'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, finite(player.radius, 5) + 5, 0, TAU); ctx.stroke();
    }
    ctx.restore();

    if (player.counterPulse > 0) {
      const t = 1 - player.counterPulse / .24;
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(255,232,142,${1 - t})`; ctx.lineWidth = 4 * (1 - t) + 1;
      ctx.beginPath(); ctx.arc(player.x, player.y, 14 + t * 42, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    return true;
  }

  const fieldEnemySprites = Object.freeze({
    // zone, source x/y/w/h, destination w/h. Custom specimen bounds avoid
    // clipping wings, roots and smoke that deliberately cross a simple grid.
    skifftick: [0, 0, 0, 627, 627, 94, 110],
    buoychoir: [0, 627, 0, 627, 627, 126, 106],
    netkite: [0, 0, 627, 627, 627, 112, 118],
    lanternray: [0, 627, 627, 627, 627, 136, 116],

    milkmoth: [1, 0, 0, 705, 605, 96, 88],
    pendulumbulb: [1, 770, 0, 484, 608, 82, 106],
    prunerhand: [1, 28, 555, 662, 699, 86, 102],
    grafthound: [1, 720, 525, 534, 729, 92, 118],

    marrowskate: [2, 0, 0, 650, 620, 132, 112],
    spinetick: [2, 660, 0, 594, 620, 112, 114],
    bannerkite: [2, 0, 560, 625, 694, 142, 126],
    ribshepherd: [2, 625, 555, 629, 699, 158, 148],

    nacreleech: [3, 0, 0, 627, 627, 92, 126],
    ciliawheel: [3, 627, 0, 627, 627, 124, 124],
    valveray: [3, 0, 627, 627, 627, 142, 122],
    airpearl: [3, 627, 627, 627, 627, 116, 128],

    umbrellamite: [4, 24, 0, 605, 610, 104, 112],
    chimneyheron: [4, 615, 0, 639, 615, 136, 122],
    signaltripod: [4, 0, 555, 670, 699, 116, 126],
    tramcentipede: [4, 638, 555, 616, 699, 120, 158],

    skyscrivener: [5, 0, 0, 660, 620, 138, 124],
    shedling: [5, 620, 0, 634, 620, 108, 116],
    sunbladder: [5, 0, 550, 675, 704, 150, 146],
    migrationthorn: [5, 630, 550, 624, 704, 126, 142]
  });

  // Several authored specimens intentionally cross a simple atlas quadrant.
  // Their custom crops preserve the complete animal, but can also catch a few
  // disconnected pixels from the neighboring specimen. Isolate the largest
  // connected alpha body once, at three times play resolution, and retain its
  // soft antialiased fringe. The render path then articulates a clean specimen
  // surface instead of repeatedly sampling a contaminated atlas rectangle.
  const FIELD_ENEMY_SURFACE_SCALE = 3;
  const FIELD_ENEMY_ALPHA_THRESHOLD = 12;
  const fieldEnemySurfaceCache = new Map();

  function buildFieldEnemySurface(type, atlas, cell) {
    const cached = fieldEnemySurfaceCache.get(type);
    if (cached) return cached;
    if (!imageReady(atlas)) return null;

    const width = Math.ceil(cell[5] * FIELD_ENEMY_SURFACE_SCALE);
    const height = Math.ceil(cell[6] * FIELD_ENEMY_SURFACE_SCALE);
    const surface = document.createElement('canvas');
    surface.width = width;
    surface.height = height;
    const surfaceContext = surface.getContext('2d', { willReadFrequently: true });
    surfaceContext.imageSmoothingEnabled = true;
    surfaceContext.imageSmoothingQuality = 'high';
    surfaceContext.drawImage(atlas, cell[1], cell[2], cell[3], cell[4], 0, 0, width, height);

    const image = surfaceContext.getImageData(0, 0, width, height);
    const pixels = image.data;
    const count = width * height;
    const labels = new Uint16Array(count);
    const queue = new Int32Array(count);
    let nextLabel = 0;
    let largestLabel = 0;
    let largestSize = 0;

    for (let start = 0; start < count; start++) {
      if (labels[start] || pixels[start * 4 + 3] < FIELD_ENEMY_ALPHA_THRESHOLD) continue;
      const label = ++nextLabel;
      let head = 0;
      let tail = 1;
      let size = 0;
      queue[0] = start;
      labels[start] = label;
      while (head < tail) {
        const index = queue[head++];
        const x = index % width;
        const y = Math.floor(index / width);
        size++;
        for (let offsetY = -1; offsetY <= 1; offsetY++) {
          for (let offsetX = -1; offsetX <= 1; offsetX++) {
            if (offsetX === 0 && offsetY === 0) continue;
            const nextX = x + offsetX;
            const nextY = y + offsetY;
            if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
            const next = nextY * width + nextX;
            if (labels[next] || pixels[next * 4 + 3] < FIELD_ENEMY_ALPHA_THRESHOLD) continue;
            labels[next] = label;
            queue[tail++] = next;
          }
        }
      }
      if (size > largestSize) {
        largestSize = size;
        largestLabel = label;
      }
    }

    if (largestLabel) {
      // Two source pixels of dilation restore the low-alpha fringe without
      // admitting any separately labelled neighboring specimen fragment.
      let fringe = new Uint8Array(count);
      for (let index = 0; index < count; index++) {
        if (labels[index] === largestLabel) fringe[index] = 1;
      }
      for (let pass = 0; pass < 2; pass++) {
        const expanded = fringe.slice();
        for (let index = 0; index < count; index++) {
          if (!fringe[index]) continue;
          const x = index % width;
          const y = Math.floor(index / width);
          for (let offsetY = -1; offsetY <= 1; offsetY++) {
            for (let offsetX = -1; offsetX <= 1; offsetX++) {
              const nextX = x + offsetX;
              const nextY = y + offsetY;
              if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
                expanded[nextY * width + nextX] = 1;
              }
            }
          }
        }
        fringe = expanded;
      }
      for (let index = 0; index < count; index++) {
        if (labels[index] === largestLabel || (labels[index] === 0 && fringe[index])) continue;
        const offset = index * 4;
        pixels[offset] = 0;
        pixels[offset + 1] = 0;
        pixels[offset + 2] = 0;
        pixels[offset + 3] = 0;
      }
      surfaceContext.putImageData(image, 0, 0);
    }

    const isolated = Object.freeze({
      image: surface,
      cell: Object.freeze([cell[0], 0, 0, width, height, cell[5], cell[6]])
    });
    fieldEnemySurfaceCache.set(type, isolated);
    return isolated;
  }

  const fieldEnemyPreparationQueue = [];
  const fieldEnemyPreparationZones = new Set();
  let fieldEnemyPreparationScheduled = false;

  function scheduleFieldEnemyPreparation() {
    if (fieldEnemyPreparationScheduled || fieldEnemyPreparationQueue.length === 0) return;
    fieldEnemyPreparationScheduled = true;
    const prepareOne = () => {
      fieldEnemyPreparationScheduled = false;
      const next = fieldEnemyPreparationQueue.shift();
      if (next && !fieldEnemySurfaceCache.has(next.type)) buildFieldEnemySurface(next.type, next.atlas, next.cell);
      scheduleFieldEnemyPreparation();
    };
    if ('requestIdleCallback' in window) requestIdleCallback(prepareOne, { timeout: 1500 });
    else setTimeout(prepareOne, 32);
  }

  function queueFieldEnemyPreparation(zone, atlas) {
    if (fieldEnemyPreparationZones.has(zone)) return;
    fieldEnemyPreparationZones.add(zone);
    for (const [type, cell] of Object.entries(fieldEnemySprites)) {
      if (cell[0] === zone) fieldEnemyPreparationQueue.push({ type, atlas, cell });
    }
    scheduleFieldEnemyPreparation();
  }

  // Prewarm only when an atlas has actually loaded, one specimen per idle
  // callback across the entire game. This removes first-appearance hitches
  // without competing with play or decoding all six zones at boot.
  for (let zone = 0; zone < zoneArt.length; zone++) {
    const atlas = zoneArt[zone].enemies;
    const queue = () => queueFieldEnemyPreparation(zone, atlas);
    if (imageReady(atlas)) queue();
    else atlas.addEventListener('load', queue, { once: true });
  }

  const fieldEnemyGlow = Object.freeze([
    [107, 218, 222],
    [187, 245, 158],
    [236, 94, 76],
    [179, 247, 235],
    [243, 87, 61],
    [122, 231, 255]
  ]);

  // Normalized outlet positions keep discharge light attached to a readable
  // anatomical feature instead of blooming from every crop's geometric centre.
  const fieldEnemyDischargeAnchors = Object.freeze({
    skifftick: [0, .17], buoychoir: [.18, .12], netkite: [0, .08], lanternray: [0, -.04],
    milkmoth: [0, .04], pendulumbulb: [0, .22], prunerhand: [.12, .08], grafthound: [.14, .13],
    marrowskate: [0, .08], spinetick: [0, 0], bannerkite: [.08, .05], ribshepherd: [0, .12],
    nacreleech: [.08, -.12], ciliawheel: [0, 0], valveray: [0, .02], airpearl: [.07, .05],
    umbrellamite: [0, .18], chimneyheron: [.2, -.11], signaltripod: [.1, -.1], tramcentipede: [.2, .04],
    skyscrivener: [.24, -.05], shedling: [0, -.1], sunbladder: [0, 0], migrationthorn: [0, 0]
  });

  // The atlases contain one definitive specimen per species. Repeating that
  // exact internal pose made formations read as stamped decals even after
  // mirroring and attachment variation. These profiles recompose the same,
  // exact crop as articulated body layers: broad animals fold, walkers pump
  // their side limbs, circular bodies iris, and long animals flex through the
  // tail. Arrays are allocated once here; the render path below creates no
  // per-frame pose objects or temporary offset lists.
  const ENEMY_ART_FOLD = 1;
  const ENEMY_ART_SCUTTLE = 2;
  const ENEMY_ART_FLEX = 3;
  const ENEMY_ART_IRIS = 4;
  const fieldEnemyArticulation = Object.freeze({
    skifftick: [ENEMY_ART_SCUTTLE, 4.9, .3, .37],
    buoychoir: [ENEMY_ART_FLEX, 2.1, .16, .3],
    netkite: [ENEMY_ART_FOLD, 3, .29, .31],
    lanternray: [ENEMY_ART_FOLD, 2.3, .38, .4],

    milkmoth: [ENEMY_ART_FOLD, 4.7, .34, .41],
    pendulumbulb: [ENEMY_ART_FLEX, 1.8, .16, .33],
    prunerhand: [ENEMY_ART_SCUTTLE, 3.8, .34, .38],
    grafthound: [ENEMY_ART_FLEX, 2.6, .27, .3],

    marrowskate: [ENEMY_ART_FOLD, 2.8, .31, .4],
    spinetick: [ENEMY_ART_SCUTTLE, 5, .27, .36],
    bannerkite: [ENEMY_ART_FOLD, 3.4, .33, .35],
    ribshepherd: [ENEMY_ART_IRIS, 1.8, .25, .4],

    nacreleech: [ENEMY_ART_FLEX, 2.4, .22, .3],
    ciliawheel: [ENEMY_ART_IRIS, 2.7, .18, .3],
    valveray: [ENEMY_ART_FOLD, 2.5, .34, .32],
    airpearl: [ENEMY_ART_FLEX, 1.6, .23, .32],

    umbrellamite: [ENEMY_ART_FOLD, 2.6, .24, .31],
    chimneyheron: [ENEMY_ART_FOLD, 3.1, .23, .3],
    signaltripod: [ENEMY_ART_SCUTTLE, 3.4, .32, .38],
    tramcentipede: [ENEMY_ART_FLEX, 3, .31, .27],

    skyscrivener: [ENEMY_ART_FOLD, 3.5, .33, .4],
    shedling: [ENEMY_ART_IRIS, 4.1, .27, .38],
    sunbladder: [ENEMY_ART_IRIS, 1.7, .27, .4],
    migrationthorn: [ENEMY_ART_FLEX, 2.8, .27, .31]
  });

  function drawEnemyAtlasLayer(
    ctx, atlas, cell, width, height,
    clipX, clipY, clipWidth, clipHeight,
    pivotX, pivotY, turn, stretchX, stretchY, shiftX, shiftY
  ) {
    ctx.save();
    ctx.translate(pivotX + shiftX, pivotY + shiftY);
    ctx.rotate(turn);
    ctx.scale(stretchX, stretchY);
    ctx.beginPath();
    ctx.rect(clipX - pivotX, clipY - pivotY, clipWidth, clipHeight);
    ctx.clip();
    // Each layer samples the original custom specimen crop verbatim. Clipping
    // the complete image, instead of guessing a second source rectangle, keeps
    // wings, roots and smoke on the crop boundary intact.
    ctx.drawImage(
      atlas,
      cell[1], cell[2], cell[3], cell[4],
      -width * .5 - pivotX, -height * .5 - pivotY, width, height
    );
    ctx.restore();
  }

  function drawArticulatedFieldEnemy(ctx, atlas, cell, width, height, enemy, variant, age, seed) {
    const profile = fieldEnemyArticulation[enemy.type];
    if (!profile) {
      ctx.drawImage(atlas, cell[1], cell[2], cell[3], cell[4], -width * .5, -height * .5, width, height);
      return;
    }

    const mode = profile[0];
    const frequency = profile[1];
    const amplitude = profile[2];
    const split = profile[3];
    const phase = age * frequency + seed * .73 + variant * 1.618;
    const primary = Math.sin(phase);
    const secondary = Math.sin(phase * 1.071 + 1.93 + variant * .29);
    const tertiary = Math.sin(phase * .613 + 3.1 + variant * .47);
    // These biases are stable for an individual, so a same-species formation
    // has visibly different resting silhouettes even when every creature was
    // spawned on the same update. Motion then travels around that resting pose
    // instead of repeatedly converging on a shared atlas stance.
    const restA = ((variant % 5) - 2) * .5;
    const restB = (((variant * 3 + 1) % 7) - 3) / 3;
    const restC = (((variant * 5 + 2) % 9) - 4) * .25;
    const parity = variant % 2 ? -1 : 1;
    const overlap = 2.75;
    const exterior = 9;

    if (enemy.type === 'milkmoth') {
      // Moths need two hinges per side. Moving the complete left and right
      // halves together preserved the same four-wing stamp; independent fore
      // and hind wings create broad, high-V and partially tucked rest poses.
      const wingWidth = width * split;
      const leftRoot = -width * .5 + wingWidth;
      const rightRoot = width * .5 - wingWidth;
      const wingSplitY = -height * .015;
      const foreHeight = wingSplitY + height * .5 + overlap + exterior;
      const hindHeight = height * .5 - wingSplitY + overlap + exterior;
      const leftFore = amplitude * (primary * .84 + restA * .65 + parity * .12);
      const rightFore = -amplitude * (primary * .76 + secondary * .16 + restB * .65 - parity * .12);
      const leftHind = -amplitude * (secondary * .72 + restC * .58 - parity * .1);
      const rightHind = amplitude * (secondary * .78 - restA * .5 + parity * .1);

      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        -width * .5 - exterior, -height * .5 - exterior,
        wingWidth + overlap + exterior, foreHeight,
        leftRoot, -height * .09, leftFore,
        1 - Math.abs(leftFore) * .28, 1 + Math.abs(leftFore) * .08,
        -width * (primary * .018 + restA * .025),
        -height * (secondary * .018 + restA * .012)
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        rightRoot - overlap, -height * .5 - exterior,
        wingWidth + overlap + exterior, foreHeight,
        rightRoot, -height * .09, rightFore,
        1 - Math.abs(rightFore) * .28, 1 + Math.abs(rightFore) * .08,
        width * (secondary * .018 + restB * .025),
        -height * (primary * .018 + restB * .012)
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        -width * .5 - exterior, wingSplitY - overlap,
        wingWidth + overlap + exterior, hindHeight,
        leftRoot, height * .08, leftHind,
        1 - Math.abs(leftHind) * .24, 1 + Math.abs(leftHind) * .07,
        -width * (secondary * .02 + restC * .025),
        height * (primary * .02 + restC * .014)
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        rightRoot - overlap, wingSplitY - overlap,
        wingWidth + overlap + exterior, hindHeight,
        rightRoot, height * .08, rightHind,
        1 - Math.abs(rightHind) * .24, 1 + Math.abs(rightHind) * .07,
        width * (primary * .02 - restA * .025),
        height * (secondary * .02 - restA * .014)
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        leftRoot - overlap, -height * .5 - exterior,
        rightRoot - leftRoot + overlap * 2, height + exterior * 2,
        0, 0, amplitude * (tertiary * .08 + restC * .1),
        1 + primary * amplitude * .12, 1 - primary * amplitude * .08,
        restC * width * .01, tertiary * height * .008
      );
      return;
    }

    if (enemy.type === 'prunerhand') {
      // Three persistent claw languages stop the orchard column from settling
      // into one both-claws-down stamp: left-open/right-tucked, its inverse,
      // and a bilateral threat display. Live motion stays small around the
      // selected rest stance so those silhouettes remain readable in a still.
      const clawWidth = width * split;
      const leftRoot = -width * .5 + clawWidth;
      const rightRoot = width * .5 - clawWidth;
      const stance = variant % 3;
      let leftRest;
      let rightRest;
      if (stance === 0) {
        leftRest = .9;
        rightRest = .46;
      } else if (stance === 1) {
        leftRest = -.46;
        rightRest = -.9;
      } else {
        leftRest = .82;
        rightRest = -.82;
      }
      const leftClaw = amplitude * (leftRest + primary * .22 + secondary * .08);
      const rightClaw = amplitude * (rightRest + secondary * .22 + primary * .08);
      const bodyPump = primary * .58 + tertiary * .3 + restC * .28;

      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        -width * .5 - exterior, -height * .5 - exterior,
        clawWidth + overlap + exterior, height + exterior * 2,
        leftRoot, -height * .1, leftClaw,
        1 + Math.abs(leftClaw) * .07, 1 - Math.abs(leftClaw) * .025,
        -leftClaw * width * .14,
        -Math.abs(leftClaw) * height * .02 + secondary * height * .012
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        rightRoot - overlap, -height * .5 - exterior,
        clawWidth + overlap + exterior, height + exterior * 2,
        rightRoot, -height * .1, rightClaw,
        1 + Math.abs(rightClaw) * .07, 1 - Math.abs(rightClaw) * .025,
        -rightClaw * width * .14,
        -Math.abs(rightClaw) * height * .02 + primary * height * .012
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        leftRoot - overlap, -height * .5 - exterior,
        rightRoot - leftRoot + overlap * 2, height + exterior * 2,
        0, 0, amplitude * (restC * .08 + tertiary * .04),
        1 - bodyPump * amplitude * .13, 1 + bodyPump * amplitude * .18,
        restC * width * .01, tertiary * height * .006
      );
      return;
    }

    if (enemy.type === 'skifftick') {
      // The hull stays authoritative while upper and lower leg fans pump as
      // four distinct groups. The final hull layer covers every shoulder root.
      const limbWidth = width * split;
      const leftRoot = -width * .5 + limbWidth;
      const rightRoot = width * .5 - limbWidth;
      const limbSplitY = -height * .02;
      const upperHeight = limbSplitY + height * .5 + overlap + exterior;
      const lowerHeight = height * .5 - limbSplitY + overlap + exterior;
      const leftUpper = amplitude * (primary * .72 + restA * .58 + parity * .16);
      const rightUpper = -amplitude * (secondary * .72 + restB * .58 - parity * .16);
      const leftLower = -amplitude * (secondary * .76 + restC * .56 - parity * .14);
      const rightLower = amplitude * (primary * .76 - restC * .56 + parity * .14);

      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        -width * .5 - exterior, -height * .5 - exterior,
        limbWidth + overlap + exterior, upperHeight,
        leftRoot, -height * .15, leftUpper,
        1 + Math.abs(leftUpper) * .09, 1 - Math.abs(leftUpper) * .035,
        -width * (primary * .035 + restA * .04),
        height * (secondary * .035 + restB * .018)
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        rightRoot - overlap, -height * .5 - exterior,
        limbWidth + overlap + exterior, upperHeight,
        rightRoot, -height * .15, rightUpper,
        1 + Math.abs(rightUpper) * .09, 1 - Math.abs(rightUpper) * .035,
        width * (secondary * .035 + restB * .04),
        height * (primary * .035 + restA * .018)
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        -width * .5 - exterior, limbSplitY - overlap,
        limbWidth + overlap + exterior, lowerHeight,
        leftRoot, height * .14, leftLower,
        1 + Math.abs(leftLower) * .08, 1 - Math.abs(leftLower) * .03,
        -width * (secondary * .04 + restC * .04),
        height * (primary * .045 + restC * .02)
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        rightRoot - overlap, limbSplitY - overlap,
        limbWidth + overlap + exterior, lowerHeight,
        rightRoot, height * .14, rightLower,
        1 + Math.abs(rightLower) * .08, 1 - Math.abs(rightLower) * .03,
        width * (primary * .04 - restC * .04),
        height * (secondary * .045 - restC * .02)
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        leftRoot - overlap, -height * .5 - exterior,
        rightRoot - leftRoot + overlap * 2, height + exterior * 2,
        0, 0, amplitude * (restC * .13 + tertiary * .06),
        1 - primary * amplitude * .2, 1 + primary * amplitude * .27,
        restC * width * .012, tertiary * height * .008
      );
      return;
    }

    if (enemy.type === 'lanternray') {
      // The lamp stalk is its own delayed hinge above two independently
      // cupping membranes. A narrow central body is drawn last at the wing
      // roots; the stalk then sways over that sealed joint.
      const wingWidth = width * split;
      const leftRoot = -width * .5 + wingWidth;
      const rightRoot = width * .5 - wingWidth;
      const wingTop = -height * .22;
      const wingHeight = height * .5 - wingTop + overlap + exterior;
      const leftWing = -amplitude * (primary * .96 + secondary * .22 + restA * .5 + parity * .1);
      const rightWing = amplitude * (secondary * .96 + primary * .22 + restB * .5 - parity * .1);
      const bodyBreath = tertiary * .7 + restC * .35;

      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        -width * .5 - exterior, wingTop - overlap,
        wingWidth + overlap + exterior, wingHeight,
        leftRoot, -height * .01, leftWing,
        1 - Math.abs(leftWing) * .3, 1 + Math.abs(leftWing) * .09,
        -width * (primary * .04 + restA * .03),
        height * (secondary * .036 + restA * .014)
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        rightRoot - overlap, wingTop - overlap,
        wingWidth + overlap + exterior, wingHeight,
        rightRoot, -height * .01, rightWing,
        1 - Math.abs(rightWing) * .3, 1 + Math.abs(rightWing) * .09,
        width * (secondary * .04 + restB * .03),
        height * (primary * .036 + restB * .014)
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        leftRoot - overlap, wingTop - overlap,
        rightRoot - leftRoot + overlap * 2, height * .5 - wingTop + overlap + exterior,
        0, 0, amplitude * (restC * .13 + tertiary * .08),
        1 + bodyBreath * amplitude * .22, 1 - bodyBreath * amplitude * .14,
        restC * width * .012, primary * height * .012
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        -width * .5 - exterior, -height * .5 - exterior,
        width + exterior * 2, height * .28 + overlap + exterior,
        0, wingTop, amplitude * (tertiary * .68 + restC * .25),
        1, 1,
        width * (secondary * .045 + restB * .018), tertiary * height * .012
      );
      return;
    }

    if (enemy.type === 'tramcentipede') {
      // Seven overlapping body bands follow a smooth travelling wave. This
      // produces a readable S-curve instead of rotating only the tail third;
      // the loop is scalar-only and allocates nothing in the render path.
      const bandCount = 7;
      const bandHeight = height / bandCount;
      const bandOverlap = 5.2;
      const stance = variant % 3;
      for (let i = bandCount - 1; i >= 0; i--) {
        const bandTop = -height * .5 + i * bandHeight;
        const bandCenter = bandTop + bandHeight * .5;
        const longitudinal = (i - 3) / 3;
        const bandPhase = phase * .72 - i * .48;
        const wave = Math.sin(bandPhase);
        const slope = Math.cos(bandPhase);
        const stanceSign = stance === 1 ? -1 : 1;
        const restCurve = stance === 2
          ? .98 * Math.sin(longitudinal * Math.PI * .5)
          : stanceSign * (.62 * longitudinal + .35 * Math.sin(longitudinal * Math.PI * .72 + .4));
        const restSlope = stance === 2
          ? .98 * Math.PI * .5 * Math.cos(longitudinal * Math.PI * .5)
          : stanceSign * (.62 + .35 * Math.PI * .72 * Math.cos(longitudinal * Math.PI * .72 + .4));
        const clipY = bandTop - bandOverlap - (i === 0 ? exterior : 0);
        const clipHeight = bandHeight + bandOverlap * 2 + (i === 0 || i === bandCount - 1 ? exterior : 0);
        drawEnemyAtlasLayer(
          ctx, atlas, cell, width, height,
          -width * .5 - exterior, clipY,
          width + exterior * 2, clipHeight,
          0, bandCenter, amplitude * (slope * .52 + restSlope * .14),
          1 + Math.abs(wave) * .018, 1 + tertiary * longitudinal * .007,
          width * (wave * .21 + restCurve * .18),
          tertiary * longitudinal * height * .004
        );
      }
      return;
    }

    if (enemy.type === 'migrationthorn') {
      // Five overlapping feather bands give each migration thorn one of three
      // persistent flight silhouettes. A smaller travelling wave moves through
      // that authored rest curve, so a flock never collapses into identical,
      // ruler-straight atlas poses at the same instant.
      const bandCount = 5;
      const bandHeight = height / bandCount;
      const bandOverlap = 4.2;
      const stance = variant % 3;
      for (let i = bandCount - 1; i >= 0; i--) {
        const bandTop = -height * .5 + i * bandHeight;
        const bandCenter = bandTop + bandHeight * .5;
        const longitudinal = (i - 2) / 2;
        const bandPhase = phase * .78 - i * .61;
        const wave = Math.sin(bandPhase);
        const slope = Math.cos(bandPhase);
        const stanceSign = stance === 1 ? -1 : 1;
        const restCurve = stance === 2
          ? 1.04 * Math.sin(longitudinal * Math.PI * .5)
          : stanceSign * (.58 * longitudinal + .31 * Math.sin(longitudinal * Math.PI * .68 + .34));
        const restSlope = stance === 2
          ? 1.04 * Math.PI * .5 * Math.cos(longitudinal * Math.PI * .5)
          : stanceSign * (.58 + .31 * Math.PI * .68 * Math.cos(longitudinal * Math.PI * .68 + .34));
        const clipY = bandTop - bandOverlap - (i === 0 ? exterior : 0);
        const clipHeight = bandHeight + bandOverlap * 2 + (i === 0 || i === bandCount - 1 ? exterior : 0);
        drawEnemyAtlasLayer(
          ctx, atlas, cell, width, height,
          -width * .5 - exterior, clipY,
          width + exterior * 2, clipHeight,
          0, bandCenter, amplitude * (slope * .22 + restSlope * .13),
          1 + Math.abs(wave) * .022, 1 + tertiary * longitudinal * .009,
          width * (wave * .078 + restCurve * .175),
          tertiary * longitudinal * height * .004
        );
      }
      return;
    }

    if (enemy.type === 'airpearl') {
      // The pearl shell is a stable pressure vessel; its two lower tendril
      // curtains paddle independently beneath it. Drawing the shell last seals
      // both roots and stops this species from reading as a tilted static gem.
      const tailTop = height * .07;
      const rootY = height * .055;
      const tailOverlap = 5;
      const tailHeight = height * .5 - tailTop + tailOverlap + exterior;
      const leftTurn = amplitude * (primary * .78 + secondary * .2 + restA * .48);
      const rightTurn = -amplitude * (secondary * .78 + primary * .2 + restB * .48);
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        -width * .5 - exterior, tailTop - tailOverlap,
        width * .5 + tailOverlap + exterior, tailHeight,
        -width * .08, rootY, leftTurn,
        1 + Math.abs(leftTurn) * .08, 1 - Math.abs(leftTurn) * .025,
        -width * (primary * .055 + restA * .028), height * Math.abs(secondary) * .012
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        -tailOverlap, tailTop - tailOverlap,
        width * .5 + tailOverlap + exterior, tailHeight,
        width * .08, rootY, rightTurn,
        1 + Math.abs(rightTurn) * .08, 1 - Math.abs(rightTurn) * .025,
        width * (secondary * .055 + restB * .028), height * Math.abs(primary) * .012
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        -width * .5 - exterior, -height * .5 - exterior,
        width + exterior * 2, tailTop + height * .5 + tailOverlap + exterior,
        0, -height * .08, amplitude * (tertiary * .1 + restC * .08),
        1 + primary * amplitude * .18, 1 - primary * amplitude * .12,
        restC * width * .012, tertiary * height * .006
      );
      return;
    }

    if (mode === ENEMY_ART_FLEX) {
      const bandHeight = height * split;
      const topPivot = -height * .5 + bandHeight;
      const bottomPivot = height * .5 - bandHeight;
      const tailPose = primary * .86 + secondary * .22 + restA * .62;
      const headPose = secondary * .72 - primary * .18 + restB * .48;
      const breath = primary * .65 + tertiary * .25 + restC * .35;
      const tailTurn = amplitude * tailPose;

      // Tail first, then living trunk, then the head plate. The small overlaps
      // remain on the body joints, never outside the authored specimen crop.
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        -width * .5 - exterior, bottomPivot - overlap,
        width + exterior * 2, bandHeight + overlap + exterior,
        0, bottomPivot, tailTurn,
        1 + Math.abs(tailPose) * .055 + restC * .018,
        1 - Math.abs(tailPose) * .025,
        width * (primary * .055 + restA * .035),
        height * (Math.abs(primary) * .015 + restC * .008)
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        -width * .5 - exterior, topPivot - overlap,
        width + exterior * 2, bottomPivot - topPivot + overlap * 2,
        0, 0, amplitude * (secondary * .25 + restC * .18),
        1 + breath * amplitude * .42, 1 - breath * amplitude * .2,
        width * (secondary * .012 + restC * .01), 0
      );
      drawEnemyAtlasLayer(
        ctx, atlas, cell, width, height,
        -width * .5 - exterior, -height * .5 - exterior,
        width + exterior * 2, bandHeight + overlap + exterior,
        0, topPivot, -amplitude * headPose * .55,
        1 + restB * .025, 1 - Math.abs(headPose) * .012,
        width * (secondary * .022 + restB * .018), tertiary * height * .01
      );
      return;
    }

    const sideWidth = width * split;
    const leftPivot = -width * .5 + sideWidth;
    const rightPivot = width * .5 - sideWidth;
    let leftTurn;
    let rightTurn;
    let leftShiftX = 0;
    let rightShiftX = 0;
    let leftShiftY;
    let rightShiftY;
    let centerTurn = 0;
    let centerStretchX = 1;
    let centerStretchY = 1;
    let centerShiftX = 0;
    let centerShiftY = 0;
    let leftStretchX = 1;
    let leftStretchY = 1;
    let rightStretchX = 1;
    let rightStretchY = 1;

    if (mode === ENEMY_ART_SCUTTLE) {
      const leftPose = primary * .78 + secondary * .18 + restA * .58 + parity * .12;
      const rightPose = secondary * .78 + primary * .18 + restB * .58 - parity * .12;
      const bodyPump = primary * .65 + tertiary * .35 + restC * .35;
      leftTurn = amplitude * leftPose;
      rightTurn = -amplitude * rightPose;
      leftShiftX = width * (-primary * .03 - restA * .032 - parity * .008);
      rightShiftX = width * (secondary * .03 + restB * .032 - parity * .008);
      leftShiftY = height * (primary * .055 + restB * .018);
      rightShiftY = height * (secondary * .055 + restA * .018);
      leftStretchX = 1 + Math.abs(leftPose) * .07;
      leftStretchY = 1 - Math.abs(leftPose) * .035;
      rightStretchX = 1 + Math.abs(rightPose) * .07;
      rightStretchY = 1 - Math.abs(rightPose) * .035;
      centerTurn = amplitude * restC * .12;
      centerStretchX = 1 - bodyPump * amplitude * .28;
      centerStretchY = 1 + bodyPump * amplitude * .4;
      centerShiftX = width * (tertiary * .018 + restC * .025);
      centerShiftY = height * (primary * .012 + restA * .01);
    } else if (mode === ENEMY_ART_IRIS) {
      const iris = primary * .76 + tertiary * .24 + restC * .35;
      const leftPose = iris + secondary * .18 + restA * .35;
      const rightPose = iris - secondary * .18 + restB * .35;
      leftTurn = -amplitude * leftPose;
      rightTurn = amplitude * rightPose;
      leftShiftX = width * (iris * .028 + restA * .018);
      rightShiftX = -width * (iris * .028 + restB * .018);
      leftShiftY = height * (secondary * .025 + restA * .012);
      rightShiftY = height * (-secondary * .025 + restB * .012);
      leftStretchX = 1 - Math.abs(leftTurn) * .28;
      leftStretchY = 1 + Math.abs(leftTurn) * .12;
      rightStretchX = 1 - Math.abs(rightTurn) * .28;
      rightStretchY = 1 + Math.abs(rightTurn) * .12;
      centerTurn = -amplitude * (iris * .38 + restC * .22);
      centerStretchX = 1 + iris * amplitude * .45;
      centerStretchY = 1 - iris * amplitude * .38;
      centerShiftX = width * (secondary * .012 + restC * .018);
      centerShiftY = height * (tertiary * .018 + restA * .01);
    } else {
      const fold = primary * .8 + tertiary * .2;
      const leftPose = fold + secondary * .15 + restA * .55 + parity * .1;
      const rightPose = fold - secondary * .15 + restB * .55 - parity * .1;
      const bodyBreath = secondary * .52 + tertiary * .28 + restC * .35;
      leftTurn = -amplitude * leftPose;
      rightTurn = amplitude * rightPose;
      leftShiftX = -width * (primary * .018 + restA * .025 + parity * .006);
      rightShiftX = width * (primary * .018 + restB * .025 - parity * .006);
      leftShiftY = height * (Math.abs(primary) * .03 + restA * .015);
      rightShiftY = height * (Math.abs(secondary) * .03 + restB * .015);
      leftStretchX = 1 - Math.abs(leftTurn) * .45;
      leftStretchY = 1 + Math.abs(leftTurn) * .09;
      rightStretchX = 1 - Math.abs(rightTurn) * .45;
      rightStretchY = 1 + Math.abs(rightTurn) * .09;
      centerTurn = amplitude * (restC * .12 + secondary * .06);
      centerStretchX = 1 + bodyBreath * amplitude * .34;
      centerStretchY = 1 - bodyBreath * amplitude * .22;
      centerShiftX = width * (secondary * .01 + restC * .015);
      centerShiftY = height * (primary * .018 + restB * .01);
    }

    // Outer anatomy moves first; the central carapace then seals the shoulder
    // seams. Exterior clip padding preserves the existing specimen filters.
    drawEnemyAtlasLayer(
      ctx, atlas, cell, width, height,
      -width * .5 - exterior, -height * .5 - exterior,
      sideWidth + overlap + exterior, height + exterior * 2,
      leftPivot, 0, leftTurn,
      leftStretchX, leftStretchY,
      leftShiftX, leftShiftY
    );
    drawEnemyAtlasLayer(
      ctx, atlas, cell, width, height,
      rightPivot - overlap, -height * .5 - exterior,
      sideWidth + overlap + exterior, height + exterior * 2,
      rightPivot, 0, rightTurn,
      rightStretchX, rightStretchY,
      rightShiftX, rightShiftY
    );
    drawEnemyAtlasLayer(
      ctx, atlas, cell, width, height,
      leftPivot - overlap, -height * .5 - exterior,
      rightPivot - leftPivot + overlap * 2, height + exterior * 2,
      0, 0, centerTurn,
      centerStretchX, centerStretchY,
      centerShiftX, centerShiftY
    );
  }

  function drawEnemyVariantAttachments(ctx, zone, width, height, variant, age) {
    // Atlas specimens establish the species; these stable, seed-selected
    // appendages make individuals legible inside a formation.  They remain
    // attached to the body and deliberately avoid the coral/white collision
    // vocabulary used by hostile bullets.
    const side = variant % 2 ? -1 : 1;
    const count = 1 + variant % 3;
    const sway = Math.sin(age * 1.65 + variant * 1.37);
    const w = width;
    const h = height;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (zone === 0) {
      // Salvaged rigging: wet rope pennants and asymmetrical brass glands.
      for (let i = 0; i < count; i++) {
        const direction = i === 1 && variant % 4 === 0 ? -side : side;
        const anchorX = direction * w * (.15 + i * .035);
        const anchorY = -h * .18 + i * h * .17;
        const endX = direction * w * (.52 + i * .045) + sway * 3;
        const endY = h * (.05 + i * .14);
        ctx.strokeStyle = 'rgba(5,20,22,.9)';
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(anchorX, anchorY);
        ctx.quadraticCurveTo(direction * w * .39, anchorY + h * .08, endX, endY);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(153,126,69,.82)';
        ctx.lineWidth = 1.15;
        ctx.stroke();

        const flagX = lerp(anchorX, endX, .68);
        const flagY = lerp(anchorY, endY, .68);
        ctx.fillStyle = i % 2 ? 'rgba(48,92,83,.88)' : 'rgba(126,76,43,.9)';
        ctx.strokeStyle = 'rgba(4,18,21,.92)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(flagX, flagY);
        ctx.lineTo(flagX - direction * (7 + (variant % 3) * 1.5), flagY + 4);
        ctx.lineTo(flagX - direction * 2.5, flagY + 10 + i * 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if ((variant + i) % 2 === 0) {
          const glandY = endY + 9 + i * 3;
          ctx.strokeStyle = 'rgba(30,28,21,.9)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(endX, endY); ctx.lineTo(endX, glandY - 5); ctx.stroke();
          ctx.fillStyle = 'rgba(126,88,42,.9)';
          ctx.strokeStyle = 'rgba(41,28,18,.96)';
          ctx.beginPath();
          ctx.ellipse(endX, glandY, 3.4 + i * .7, 6.3 + (variant % 3) * 1.2, direction * .18, 0, TAU);
          ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(208,167,83,.58)';
          ctx.lineWidth = .8;
          ctx.beginPath();
          ctx.ellipse(endX - direction * 1.1, glandY - 1.2, 1.25 + i * .25, 3.6 + (variant % 2), direction * .18, -.9, 1.4);
          ctx.stroke();
        }
      }
    } else if (zone === 1) {
      // The Acre grows every body differently: pollen petals on one shoulder,
      // seedpods on the other, never a free-floating gameplay dot.
      const petalCount = 2 + variant % 3;
      for (let i = 0; i < petalCount; i++) {
        const direction = i === petalCount - 1 && variant % 3 === 0 ? -side : side;
        const x = direction * w * (.27 + i * .055);
        const y = -h * (.18 - i * .12);
        const reach = 13 + i * 3 + variant % 4;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(direction * (-.7 + i * .31) + sway * .04);
        ctx.fillStyle = i % 2 ? 'rgba(198,198,91,.76)' : 'rgba(118,154,71,.82)';
        ctx.strokeStyle = 'rgba(25,47,27,.95)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(5, -reach * .42, 8, -reach * .82, 1, -reach);
        ctx.bezierCurveTo(-7, -reach * .72, -6, -reach * .28, 0, 0);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = 'rgba(42,69,34,.94)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-side * w * .16, -h * .08);
      ctx.quadraticCurveTo(-side * w * .42, h * .02, -side * w * (.46 + variant % 3 * .04), h * .23);
      ctx.stroke();
      for (let i = 0; i < 1 + variant % 2; i++) {
        const x = -side * w * (.34 + i * .09);
        const y = h * (.04 + i * .13);
        ctx.save(); ctx.translate(x, y); ctx.rotate(-side * (.36 - i * .2));
        ctx.fillStyle = i ? 'rgba(91,117,46,.96)' : 'rgba(169,158,66,.94)';
        ctx.strokeStyle = 'rgba(24,39,22,.98)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 10 + variant % 4, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    } else if (zone === 2) {
      // Marrow growth is angular and broken: no two rib cages calcify alike.
      const spineCount = 2 + variant % 4;
      for (let i = 0; i < spineCount; i++) {
        const direction = i === spineCount - 1 && variant % 3 === 1 ? -side : side;
        const y = -h * .27 + i * h * .17;
        const anchorX = direction * w * (.09 + (i % 2) * .025);
        const rootX = direction * w * (.2 + (i % 2) * .03);
        const length = 8 + ((variant + i * 3) % 5) * 2.1;
        ctx.strokeStyle = 'rgba(69,18,28,.96)';
        ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.moveTo(anchorX, y); ctx.lineTo(rootX, y - 1.5); ctx.stroke();
        ctx.strokeStyle = 'rgba(186,145,105,.72)';
        ctx.lineWidth = .8;
        ctx.stroke();
        ctx.fillStyle = i % 2 ? 'rgba(143,111,88,.88)' : 'rgba(181,155,116,.9)';
        ctx.strokeStyle = 'rgba(68,18,28,.98)';
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        ctx.moveTo(rootX, y - 2.7);
        ctx.lineTo(rootX + direction * length, y - 7 + sway * 1.3);
        ctx.lineTo(rootX + direction * 3.4, y + 3.2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(221,196,151,.58)';
        ctx.lineWidth = .7;
        ctx.beginPath();
        ctx.moveTo(rootX + direction * 2, y - .3);
        ctx.lineTo(rootX + direction * (length - 2), y - 6 + sway * 1.1);
        ctx.stroke();
      }
      if (variant % 2 === 0) {
        ctx.strokeStyle = 'rgba(74,22,30,.96)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(-side * w * .24, h * .02, w * .24, -.92, .94);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(194,168,128,.92)';
        ctx.lineWidth = 1.7;
        ctx.stroke();
      }
    } else if (zone === 3) {
      // Cilia trail and flex with the current; bubbles are hollow, dim and
      // visibly tethered so they cannot be mistaken for projectile cores.
      const ciliaCount = 3 + variant % 4;
      ctx.strokeStyle = variant % 2 ? 'rgba(102,202,200,.56)' : 'rgba(191,119,180,.59)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < ciliaCount; i++) {
        const direction = i === ciliaCount - 1 && variant % 3 === 0 ? -side : side;
        const rootX = direction * w * (.25 + (i % 2) * .045);
        const rootY = -h * .18 + i * h * .12;
        ctx.beginPath();
        ctx.moveTo(rootX, rootY);
        ctx.quadraticCurveTo(
          direction * w * (.48 + i * .025),
          rootY + 7 + sway * (4 + i),
          direction * w * (.58 + i * .035),
          rootY + 17 + i * 3
        );
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(118,198,203,.42)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 1 + variant % 3; i++) {
        const bubbleX = -side * w * (.34 + i * .1);
        const bubbleY = -h * .04 - i * 13;
        ctx.beginPath();
        ctx.moveTo(-side * w * .25, h * .02 - i * 3);
        ctx.lineTo(bubbleX, bubbleY + 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, 4 + i * 1.6, 0, TAU);
        ctx.stroke();
      }
    } else if (zone === 4) {
      // Borrowed infrastructure: mismatched aerial trees, semaphore cloth and
      // cold articulated joints bolted around otherwise organic silhouettes.
      const mastX = side * w * (.075 + variant % 3 * .018);
      const mastY = -h * .24;
      const tipX = side * w * (.42 + variant % 4 * .035) + sway * 2;
      const tipY = -h * (.48 + variant % 3 * .05);
      ctx.strokeStyle = 'rgba(7,17,25,.95)';
      ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(mastX, mastY); ctx.lineTo(tipX, tipY); ctx.stroke();
      ctx.strokeStyle = 'rgba(94,135,146,.78)';
      ctx.lineWidth = 1.05;
      ctx.stroke();
      ctx.fillStyle = 'rgba(19,37,43,.98)';
      ctx.strokeStyle = 'rgba(124,177,184,.86)';
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.ellipse(mastX, mastY, 4.6, 3.2, side * .28, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(94,135,146,.78)';
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - side * 6, tipY - 5);
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + side * 4, tipY - 7);
      ctx.stroke();
      if (variant % 3 !== 2) {
        ctx.fillStyle = variant % 2 ? 'rgba(180,103,54,.92)' : 'rgba(70,126,142,.94)';
        ctx.strokeStyle = 'rgba(8,18,23,.98)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lerp(mastX, tipX, .42), lerp(mastY, tipY, .42));
        ctx.lineTo(lerp(mastX, tipX, .42) - side * (9 + variant % 4 * 1.4), lerp(mastY, tipY, .42) + 3);
        ctx.lineTo(lerp(mastX, tipX, .42) - side * 2.5, lerp(mastY, tipY, .42) + 10);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      for (let i = 0; i < 1 + variant % 2; i++) {
        const jointX = -side * w * (.3 + i * .08);
        const jointY = h * (.05 + i * .18);
        ctx.strokeStyle = 'rgba(8,17,23,.98)'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(-side * w * .09, jointY - 7); ctx.lineTo(jointX, jointY); ctx.stroke();
        ctx.fillStyle = 'rgba(45,69,76,.98)';
        ctx.strokeStyle = 'rgba(137,178,185,.9)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(jointX, jointY, 5 + i, 0, TAU); ctx.fill(); ctx.stroke();
      }
    } else if (zone === 5) {
      // First Blue fauna carries prismatic molts and old solar rosaries.  Both
      // remain elongated or connected, never isolated as bullet-like lights.
      const featherCount = 1 + variant % 3;
      for (let i = 0; i < featherCount; i++) {
        const direction = i === 2 && variant % 2 === 0 ? -side : side;
        const x = direction * w * (.16 + i * .045);
        const y = -h * .12 + i * h * .14;
        const length = 15 + ((variant + i) % 4) * 3;
        ctx.save(); ctx.translate(x, y); ctx.rotate(direction * (.7 + i * .17) + sway * .025);
        ctx.fillStyle = i % 2 ? 'rgba(171,129,55,.62)' : 'rgba(45,132,177,.64)';
        ctx.strokeStyle = 'rgba(20,50,83,.94)'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(7, -length * .25, 7, -length * .72, 0, -length);
        ctx.bezierCurveTo(-6, -length * .64, -6, -length * .2, 0, 0);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(30,67,95,.92)';
        ctx.beginPath(); ctx.ellipse(0, 0, 2.8, 1.8, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(214,177,86,.62)'; ctx.lineWidth = .8;
        ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -length + 3); ctx.stroke();
        ctx.restore();
      }
      const beadCount = 2 + variant % 3;
      ctx.strokeStyle = 'rgba(28,53,80,.96)'; ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-side * w * .1, -h * .04);
      for (let i = 0; i < beadCount; i++) {
        ctx.lineTo(-side * w * (.255 + i * .038), h * (.005 + i * .042));
      }
      ctx.stroke();
      for (let i = 0; i < beadCount; i++) {
        const beadX = -side * w * (.255 + i * .038);
        const beadY = h * (.005 + i * .042);
        ctx.fillStyle = i % 2 ? 'rgba(142,91,34,.92)' : 'rgba(187,132,49,.9)';
        ctx.strokeStyle = 'rgba(37,54,67,.98)'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.ellipse(beadX, beadY, 2.25 + i * .15, 3.35 + i * .2, side * .25, 0, TAU); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawEnemyVariantSurfaceMarkings(ctx, zone, width, height, variant, age) {
    // The atlas supplies a species, not a row of clones. These close-body marks
    // sit over the articulated specimen, breaking repeated internal highlights
    // without growing the gameplay silhouette or borrowing projectile colors.
    const side = variant % 2 ? -1 : 1;
    const family = variant % 4;
    const sway = Math.sin(age * 1.35 + variant * 1.71);
    const w = width;
    const h = height;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (zone === 0) {
      // Tarred repair lash, brass stitch and salt scratches.
      ctx.strokeStyle = 'rgba(7,22,24,.84)'; ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(-side * w * .24, -h * (.11 + family * .015));
      ctx.quadraticCurveTo(side * w * .02, h * (.01 + sway * .008), side * w * .23, h * (.13 - family * .012));
      ctx.stroke();
      ctx.strokeStyle = family % 2 ? 'rgba(174,127,61,.9)' : 'rgba(86,137,126,.82)'; ctx.lineWidth = 1.15;
      ctx.stroke();
      ctx.fillStyle = 'rgba(166,119,54,.9)'; ctx.strokeStyle = 'rgba(25,28,24,.92)'; ctx.lineWidth = 1;
      for (let i = 0; i < 2 + family % 2; i++) {
        const x = side * w * (-.1 + i * .1);
        const y = h * (-.04 + i * .055);
        ctx.beginPath(); ctx.ellipse(x, y, 2.1, 3.2, side * .35, 0, TAU); ctx.fill(); ctx.stroke();
      }
    } else if (zone === 1) {
      // Uneven lichen petals grow across one shoulder and visibly change mass.
      for (let i = 0; i < 2 + family % 3; i++) {
        const x = side * w * (.04 + i * .065);
        const y = -h * .13 + i * h * .075;
        ctx.save(); ctx.translate(x, y); ctx.rotate(side * (.4 + i * .43) + sway * .025);
        ctx.fillStyle = i % 2 ? 'rgba(157,153,65,.82)' : 'rgba(78,125,66,.84)';
        ctx.strokeStyle = 'rgba(20,42,25,.94)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(0, 0, 3.2 + family * .25, 7 + i * 1.2, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    } else if (zone === 2) {
      // Marrow-dark fracture trees make each calcified body break differently.
      const rootX = side * w * (-.08 + family * .025);
      const rootY = -h * .13;
      ctx.strokeStyle = 'rgba(74,20,29,.92)'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(rootX, rootY); ctx.lineTo(rootX - side * w * .03, h * .02); ctx.lineTo(rootX + side * w * .06, h * .15); ctx.stroke();
      ctx.strokeStyle = 'rgba(224,190,143,.72)'; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(rootX - side * w * .03, h * .015); ctx.lineTo(rootX - side * w * (.13 + family * .012), h * .045); ctx.moveTo(rootX + side * w * .045, h * .12); ctx.lineTo(rootX + side * w * .14, h * (.08 + family * .01)); ctx.stroke();
    } else if (zone === 3) {
      // Cold capillaries drift through the translucent body rather than sitting
      // as disconnected bubbles that could be mistaken for live shots.
      ctx.strokeStyle = family % 2 ? 'rgba(83,183,196,.72)' : 'rgba(183,104,177,.69)';
      ctx.lineWidth = 1.15;
      for (let i = 0; i < 2 + family % 2; i++) {
        const y = h * (-.11 + i * .1);
        ctx.beginPath();
        ctx.moveTo(-side * w * .19, y);
        ctx.bezierCurveTo(-side * w * .05, y - 6 - sway * 2, side * w * .03, y + 7, side * w * (.2 + i * .025), y - 2);
        ctx.stroke();
      }
    } else if (zone === 4) {
      // A mismatched civic service plate and connected cold conduit.
      const plateX = side * w * (.03 + family * .025);
      const plateY = -h * (.08 - family * .012);
      ctx.fillStyle = family % 2 ? 'rgba(63,97,105,.88)' : 'rgba(110,70,49,.88)';
      ctx.strokeStyle = 'rgba(6,17,24,.96)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.rect(plateX - 7, plateY - 5, 14, 10); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(139,202,210,.9)'; ctx.lineWidth = .9; ctx.strokeRect(plateX - 5.5, plateY - 3.5, 11, 7);
      ctx.beginPath(); ctx.moveTo(plateX + side * 7, plateY); ctx.quadraticCurveTo(side * w * .18, h * .02, side * w * .2, h * .17); ctx.stroke();
    } else {
      // A single prismatic molt seam; the warm half changes side per specimen.
      const gradient = ctx.createLinearGradient(-side * w * .2, -h * .12, side * w * .2, h * .14);
      gradient.addColorStop(0, family % 2 ? 'rgba(57,146,184,.2)' : 'rgba(185,127,48,.18)');
      gradient.addColorStop(.5, family % 2 ? 'rgba(111,207,224,.76)' : 'rgba(221,176,74,.72)');
      gradient.addColorStop(1, family % 2 ? 'rgba(203,156,65,.16)' : 'rgba(67,151,193,.17)');
      ctx.strokeStyle = gradient; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-side * w * .2, -h * (.13 + family * .012));
      ctx.quadraticCurveTo(-side * w * .02, -h * .01 + sway * 2, side * w * .21, h * (.13 - family * .01));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(31,66,91,.72)'; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.moveTo(-side * w * .08, -h * .06); ctx.lineTo(side * w * .03, h * .02); ctx.lineTo(side * w * .12, h * .09); ctx.stroke();
    }
    ctx.restore();
  }

  function drawFieldEnemyDischarge(ctx, enemy, zone, width, height, firePulse, bracePulse, reducedEffects) {
    const strength = Math.max(firePulse, bracePulse * .42);
    if (strength <= .001) return;
    const anchor = fieldEnemyDischargeAnchors[enemy.type] || [0, .12];
    const x = anchor[0] * width;
    const y = anchor[1] * height;
    const color = fieldEnemyGlow[zone];
    const radius = 5 + strength * 17;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, 'rgba(255,247,201,' + strength * (reducedEffects ? .58 : .9) + ')');
    glow.addColorStop(.34, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + strength * .5 + ')');
    glow.addColorStop(1, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
    if (firePulse > .02) {
      ctx.strokeStyle = 'rgba(255,237,175,' + firePulse * .78 + ')';
      ctx.lineWidth = 1 + firePulse * 1.5;
      ctx.beginPath();
      ctx.arc(x, y + radius * .18, radius * .72, .12 * Math.PI, .88 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFieldEnemyLocal(ctx, enemy, state) {
    const cell = enemy && fieldEnemySprites[enemy.type];
    const zone = Math.round(finite(state && state.zone, -1));
    if (!ctx || !cell || cell[0] !== zone || zone < 0 || zone >= zoneArt.length) return false;
    activateZoneArt(zone, true);
    const atlas = zoneArt[zone].enemies;
    if (!imageReady(atlas)) return false;
    const isolated = buildFieldEnemySurface(enemy.type, atlas, cell);
    const specimenAtlas = isolated ? isolated.image : atlas;
    const specimenCell = isolated ? isolated.cell : cell;
    const width = cell[5];
    const height = cell[6];
    const age = finite(enemy.age);
    const seed = finite(enemy.seed);
    const stride = Math.sin(age * 5.4 + seed) * .025;
    const glow = fieldEnemyGlow[zone];
    const hitPulse = normalizedPulse(enemy.hitPulse, .15);
    const firePulse = normalizedPulse(enemy.firePulse);
    const bracePulse = attackBrace(enemy);
    const responseSide = hash(seed * 59.1 + zone * 173 + 1901) > .5 ? 1 : -1;

    ctx.save();
    const dx = finite(enemy.x) - finite(enemy.px, enemy.x);
    // Atlas specimens share a coherent frontal design language, but formations
    // should not read like identical stickers.  Give each creature a stable
    // authored posture, then layer live banking on top of it.
    const variant = Math.floor(hash(seed * 113.9 + zone * 331 + 1409) * 12);
    const posture = (hash(seed * 29.7 + zone * 61 + 503) - .5) * .56;
    const mirror = hash(seed * 41.3 + zone * 97 + 811) > .5 ? -1 : 1;
    let rotation = posture + clamp(dx * .012, -.32, .32) + stride;
    rotation += responseSide * (hitPulse * .065 - bracePulse * .018);
    if (enemy.type === 'ciliawheel') rotation += age * .55;
    else if (enemy.type === 'spinetick') rotation += Math.sin(age * 1.4 + seed) * .14;
    else if (enemy.type === 'migrationthorn') rotation += finite(enemy.side) * .12;
    ctx.translate(responseSide * hitPulse * 1.1, -bracePulse * 1.8 - firePulse * 3.5);
    ctx.rotate(rotation);

    let scaleX = 1;
    let scaleY = 1;
    if (enemy.type === 'milkmoth' || enemy.type === 'valveray' || enemy.type === 'skyscrivener') {
      scaleX += Math.sin(age * 5.2 + seed) * .045;
      scaleY -= Math.sin(age * 5.2 + seed) * .018;
    } else if (enemy.type === 'pendulumbulb' || enemy.type === 'airpearl' || enemy.type === 'sunbladder') {
      const breathe = Math.sin(age * 2 + seed) * .035;
      scaleX += breathe;
      scaleY -= breathe;
    }
    const individuality = .89 + hash(seed * 17.3 + 41) * .23;
    const proportion = .97 + hash(seed * 23.7 + 91) * .06;
    const speciesScale = FIELD_ENEMY_SPECIES_SCALE[enemy.type] || 1;
    scaleX *= individuality * proportion * mirror * FIELD_ENEMY_DISPLAY_SCALE * speciesScale
      * (1 + hitPulse * .095 + bracePulse * .045 + firePulse * .03);
    scaleY *= individuality / proportion * FIELD_ENEMY_DISPLAY_SCALE * speciesScale
      * (1 - hitPulse * .12 - bracePulse * .04 - firePulse * .065);
    const depth = clamp((finite(enemy.y, 160) - 35) / (H * .72), 0, 1);
    const depthTier = Math.floor(hash(seed * 71.9 + zone * 43 + 307) * 3);
    ctx.globalAlpha *= [.83, .92, 1][depthTier] * (.96 + depth * .04);
    ctx.scale(scaleX, scaleY);
    // A tiny stable shear makes wing/root arrangements lean with the animal
    // rather than preserving the exact atlas pose under every rotation.
    const shearX = (hash(seed * 83.7 + 1201) - .5) * .09;
    const shearY = (hash(seed * 89.3 + 1601) - .5) * .045;
    ctx.transform(1, shearY, shearX, 1, 0, 0);

    // A directional contact shadow makes each specimen displace the plate
    // instead of hovering like a square atlas decal.
    ctx.save();
    ctx.fillStyle = zone === 5 ? 'rgba(7,35,58,.2)' : 'rgba(1,5,10,.27)';
    ctx.beginPath();
    ctx.ellipse(width * .08, height * .24, width * .34, height * .14, -.22, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const isolation = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.max(width, height) * .64);
    const isolationAlpha = zone === 5 ? .42 : (zone === 2 || zone === 3 ? .31 : .24);
    isolation.addColorStop(0, `rgba(1,7,14,${isolationAlpha})`);
    isolation.addColorStop(.58, `rgba(1,7,14,${isolationAlpha * .5})`);
    isolation.addColorStop(1, 'rgba(1,7,14,0)');
    ctx.fillStyle = isolation;
    ctx.fillRect(-width * .72, -height * .72, width * 1.44, height * 1.44);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const auraRadius = Math.max(width, height) * .72;
    const aura = ctx.createRadialGradient(0, 0, 1, 0, 0, auraRadius);
    aura.addColorStop(0, `rgba(${glow[0]},${glow[1]},${glow[2]},${enemy.charge ? .16 : .07})`);
    aura.addColorStop(1, `rgba(${glow[0]},${glow[1]},${glow[2]},0)`);
    ctx.fillStyle = aura;
    ctx.fillRect(-auraRadius, -auraRadius, auraRadius * 2, auraRadius * 2);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const wake = ctx.createLinearGradient(0, -height * .1, 0, height * .86);
    wake.addColorStop(0, `rgba(${glow[0]},${glow[1]},${glow[2]},.11)`);
    wake.addColorStop(1, `rgba(${glow[0]},${glow[1]},${glow[2]},0)`);
    ctx.strokeStyle = wake;
    ctx.lineWidth = Math.max(7, width * .16);
    ctx.beginPath(); ctx.moveTo(0, height * .1); ctx.lineTo(0, height * .82); ctx.stroke();
    ctx.restore();

    // The busiest plates deliberately share materials with their fauna.  A
    // narrow specimen rim separates threat silhouette from scenery without
    // flattening the creature into a sticker or changing its collision shape.
    let specimenFilter = 'none';
    if (zone === 1) specimenFilter = 'drop-shadow(0 0 2px rgba(11,31,20,.95))';
    else if (zone === 2) specimenFilter = 'drop-shadow(0 0 3px rgba(45,11,18,.98)) drop-shadow(0 1px 1px rgba(24,7,12,.9))';
    else if (zone === 4) specimenFilter = 'drop-shadow(0 0 2px rgba(151,232,255,.88)) drop-shadow(0 1px 2px rgba(4,10,18,.9))';
    const gradeBrightness = .94 + hash(seed * 101.3 + 2027) * .12;
    const gradeSaturation = .88 + hash(seed * 107.9 + 2081) * .24;
    const gradeContrast = 1.01 + hash(seed * 109.7 + 2131) * .08;
    const gradeHue = (hash(seed * 127.1 + 2179) - .5) * 10;
    const materialGrade = `brightness(${gradeBrightness.toFixed(3)}) saturate(${gradeSaturation.toFixed(3)}) contrast(${gradeContrast.toFixed(3)}) hue-rotate(${gradeHue.toFixed(2)}deg)`;
    if (enemy.flash > 0) {
      ctx.filter = `${specimenFilter === 'none' ? '' : `${specimenFilter} `}${materialGrade} brightness(1.55) saturate(.66) contrast(1.04)`;
    } else {
      ctx.filter = `${specimenFilter === 'none' ? '' : `${specimenFilter} `}${materialGrade}`;
    }
    drawArticulatedFieldEnemy(ctx, specimenAtlas, specimenCell, width, height, enemy, variant, age, seed);
    ctx.filter = 'none';
    // Overlay roots after the articulated body so every mast, leaf and feather
    // visibly enters the animal even at the extremes of its seeded rest pose.
    drawEnemyVariantAttachments(ctx, zone, width, height, variant, age);
    drawEnemyVariantSurfaceMarkings(ctx, zone, width, height, variant, age);
    drawFieldEnemyDischarge(
      ctx,
      enemy,
      zone,
      width,
      height,
      firePulse,
      bracePulse,
      !!(state && state.reducedEffects)
    );

    const damage = clamp(1 - finite(enemy.hp, 1) / Math.max(1, finite(enemy.maxHp, enemy.hp || 1)), 0, 1);
    if (damage > .26) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = zone === 5
        ? `rgba(120,238,255,${.1 + damage * .35})`
        : `rgba(255,154,99,${.1 + damage * .35})`;
      ctx.lineWidth = 1 + damage;
      for (let i = 0; i < Math.floor(1 + damage * 4); i++) {
        const x = (hash(i + seed * 31 + 90) - .5) * width * .42;
        const y = (hash(i + seed * 47 + 220) - .5) * height * .36;
        ctx.beginPath(); ctx.moveTo(x - 4, y - 5); ctx.lineTo(x + 1, y); ctx.lineTo(x - 2, y + 7); ctx.stroke();
      }
      ctx.restore();
    }

    if ((enemy.type === 'lanternray' || enemy.type === 'airpearl') && enemy.charge === 1) {
      ctx.globalCompositeOperation = 'screen';
      const pulse = .38 + Math.sin(finite(enemy.telegraph) * 34) * .18;
      const glow = ctx.createRadialGradient(0, -4, 2, 0, -4, 42);
      glow.addColorStop(0, `rgba(255,224,140,${pulse})`);
      glow.addColorStop(1, 'rgba(255,157,64,0)');
      ctx.fillStyle = glow; ctx.fillRect(-48, -52, 96, 96);
    }

    if (enemy.type === 'pendulumbulb' || enemy.type === 'sunbladder') {
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(255,225,142,${.12 + (Math.sin(age * 2.3) * .5 + .5) * .13})`;
      ctx.lineWidth = 1.25;
      ctx.beginPath(); ctx.arc(0, 0, Math.max(width, height) * (.33 + Math.sin(age * 1.2) * .025), 0, TAU); ctx.stroke();
    }
    ctx.restore();
    return true;
  }

  function getFieldEnemyVisualFootprint(enemy) {
    const cell = enemy && fieldEnemySprites[enemy.type];
    if (!cell) return null;
    const seed = finite(enemy.seed);
    const age = finite(enemy.age);
    const zone = cell[0];
    const dx = finite(enemy.x) - finite(enemy.px, enemy.x);
    const stride = Math.sin(age * 5.4 + seed) * .025;
    const posture = (hash(seed * 29.7 + zone * 61 + 503) - .5) * .56;
    const hitPulse = normalizedPulse(enemy.hitPulse, .15);
    const firePulse = normalizedPulse(enemy.firePulse);
    const bracePulse = attackBrace(enemy);
    const responseSide = hash(seed * 59.1 + zone * 173 + 1901) > .5 ? 1 : -1;
    let rotation = posture + clamp(dx * .012, -.32, .32) + stride;
    rotation += responseSide * (hitPulse * .065 - bracePulse * .018);
    if (enemy.type === 'ciliawheel') rotation += age * .55;
    else if (enemy.type === 'spinetick') rotation += Math.sin(age * 1.4 + seed) * .14;
    else if (enemy.type === 'migrationthorn') rotation += finite(enemy.side) * .12;

    let scaleX = 1;
    let scaleY = 1;
    if (enemy.type === 'milkmoth' || enemy.type === 'valveray' || enemy.type === 'skyscrivener') {
      scaleX += Math.sin(age * 5.2 + seed) * .045;
      scaleY -= Math.sin(age * 5.2 + seed) * .018;
    } else if (enemy.type === 'pendulumbulb' || enemy.type === 'airpearl' || enemy.type === 'sunbladder') {
      const breathe = Math.sin(age * 2 + seed) * .035;
      scaleX += breathe;
      scaleY -= breathe;
    }
    const individuality = .89 + hash(seed * 17.3 + 41) * .23;
    const proportion = .97 + hash(seed * 23.7 + 91) * .06;
    const speciesScale = FIELD_ENEMY_SPECIES_SCALE[enemy.type] || 1;
    scaleX = Math.abs(scaleX * individuality * proportion * FIELD_ENEMY_DISPLAY_SCALE * speciesScale
      * (1 + hitPulse * .095 + bracePulse * .045 + firePulse * .03));
    scaleY = Math.abs(scaleY * individuality / proportion * FIELD_ENEMY_DISPLAY_SCALE * speciesScale
      * (1 - hitPulse * .12 - bracePulse * .04 - firePulse * .065));
    const shearX = Math.abs((hash(seed * 83.7 + 1201) - .5) * .09);
    const shearY = Math.abs((hash(seed * 89.3 + 1601) - .5) * .045);
    return {
      rx: cell[5] * .62 * scaleX * (1 + shearX) + hitPulse * 1.1,
      ry: cell[6] * .62 * scaleY * (1 + shearY) + bracePulse * 1.8 + firePulse * 3.5,
      rotation
    };
  }

  // The boss paintings are intentionally rich, single-pose specimens.  A
  // five-band mesh lets those paintings perform without manufacturing fake
  // gameplay motion: upper anatomy, core and lower anatomy can brace, fire and
  // settle on the real attack clock while the actor's x/y and hitbox remain
  // completely untouched.  Source padding stays inside the selected atlas
  // cell, so no neighboring phase can bleed through at a flexed seam.
  function bossBandPose(zone, phase, age, t, performance, responseSide, strength) {
    const anticipation = performance.anticipation * strength;
    const emission = performance.emission * strength;
    const recovery = performance.recovery * strength;
    const top = (1 - t) * .5;
    const lower = (1 + t) * .5;
    const middle = 1 - Math.abs(t);
    const idleA = Math.sin(age * (.74 + zone * .075) + phase * .71);
    const idleB = Math.sin(age * (1.24 + zone * .09) + phase * 1.17 + t * 1.83);
    let dx = responseSide * idleB * (1.05 + middle * .55) * strength;
    let dy = idleA * (1.05 + lower * .8) * strength;
    let rotation = responseSide * idleB * (.0025 + middle * .0015) * strength;
    let scaleX = 1 + idleB * .0035 * strength;
    let scaleY = 1 - idleB * .0025 * strength;

    if (zone === 0) {
      // Trawlmother draws her rigging and jaw into the rib cage, then opens
      // around the projectile source like a trawl snapping taut.
      const rib = .35 + middle * .65;
      dx += responseSide * (top - lower) * (anticipation * 3.5 - emission * 5.5 + recovery * 2.2);
      dy += anticipation * (2 + middle * 4.5) - emission * (top * 8 - lower * 6) - recovery * lower * 2;
      rotation += responseSide * (top - lower) * (-anticipation * .012 + emission * .024 - recovery * .01);
      scaleX += -anticipation * .034 * rib + emission * .078 * rib - recovery * .018 * rib;
      scaleY += anticipation * .027 * rib - emission * .052 * rib + recovery * .016 * rib;
    } else if (zone === 1) {
      // The Gardener's crown of hands gathers around the seed, lashes outward,
      // and lets the root-weight pull the lower body home after the volley.
      const reach = .48 + middle * .52;
      dx += responseSide * (top - lower * .45) * (anticipation * 4 - emission * 7 + recovery * 3);
      dy += anticipation * top * 5 - emission * (top * 9 - lower * 4) + recovery * lower * 3;
      rotation += responseSide * (top - lower) * (-anticipation * .014 + emission * .027 - recovery * .012);
      scaleX += -anticipation * .055 * reach + emission * .095 * reach - recovery * .025 * reach;
      scaleY += anticipation * .035 * reach - emission * .055 * reach + recovery * .018 * reach;
    } else if (zone === 2) {
      // Stag antlers rear as one cathedral arch, strike wide at emission, and
      // send the counterweight down the long sternum instead of bobbing whole.
      const antler = clamp((.38 - t) / 1.38, 0, 1);
      dx += responseSide * (antler - lower * .3) * (anticipation * 4.5 - emission * 8 + recovery * 3.5);
      dy += anticipation * antler * 7 - emission * (antler * 12 - lower * 4) + recovery * lower * 2.5;
      rotation += responseSide * (antler - lower * .42) * (-anticipation * .014 + emission * .026 - recovery * .011);
      scaleX += -anticipation * .064 * antler + emission * .115 * antler - recovery * .034 * antler;
      scaleY += anticipation * .035 * antler - emission * .056 * antler + recovery * .022 * lower;
    } else if (zone === 3) {
      // Nine Throats inhales as a shared organ, collapses around the exhale,
      // then passes a soft peristaltic return down the body.
      const organ = .72 + middle * .28;
      const peristalsis = Math.sin(age * 1.36 + t * 2.45 + phase * .43);
      dx += responseSide * peristalsis * (1.2 + phase * .25) * strength;
      dy += t * (-anticipation * 3 + emission * 7 - recovery * 4) + peristalsis * 1.4 * strength;
      rotation += responseSide * peristalsis * .0035 * strength;
      scaleX += anticipation * .062 * organ - emission * .057 * organ + recovery * .028 * peristalsis;
      scaleY += anticipation * .027 * organ - emission * .074 * organ - recovery * .021 * peristalsis;
    } else if (zone === 4) {
      // The Borrowed City is a creature wearing infrastructure: towers crouch,
      // the road-core detonates, and the lower districts kick against that
      // force in the opposite direction.  Final phase moves harder, not faster.
      const finalWeight = phase >= 4 ? 1.18 : 1;
      const tower = clamp((.42 - t) / 1.42, 0, 1);
      const foundation = clamp((t + .08) / 1.08, 0, 1);
      dx += responseSide * finalWeight * (
        anticipation * (tower * 4 - foundation * 2)
        + emission * (tower * 10 - foundation * 6)
        - recovery * (tower * 5 - foundation * 3)
      );
      dy += finalWeight * (anticipation * tower * 8 - emission * tower * 15 + emission * foundation * 8 - recovery * foundation * 4);
      rotation += responseSide * finalWeight * (tower - foundation) * (-anticipation * .012 + emission * .027 - recovery * .014);
      scaleX += finalWeight * (-anticipation * .046 * tower + emission * (.085 * tower + .035 * middle) - recovery * .025 * tower);
      scaleY += finalWeight * (anticipation * .041 * tower - emission * .064 * tower + emission * .035 * foundation);
    } else {
      // Crown Louse folds its upper wings/corona in around the eclipse, bursts
      // broad on the shot, then sends the recoil down its abdomen and legs.
      const finalWeight = phase >= 4 ? 1.2 : 1;
      const wing = clamp((.5 - t) / 1.5, 0, 1);
      const abdomen = clamp((t + .18) / 1.18, 0, 1);
      const wingBeat = Math.sin(age * (1.48 + phase * .075) + .4);
      dx += responseSide * finalWeight * (
        anticipation * wing * 4.5 + emission * (wing * 9 - abdomen * 5) - recovery * (wing * 4 - abdomen * 2.5)
      );
      dy += finalWeight * (anticipation * wing * 7 - emission * wing * 12 + emission * abdomen * 8 - recovery * abdomen * 4);
      rotation += responseSide * finalWeight * (wing - abdomen * .4) * (-anticipation * .015 + emission * .026 - recovery * .012);
      scaleX += wingBeat * .016 * wing * strength + finalWeight * (-anticipation * .085 * wing + emission * .13 * wing - recovery * .038 * wing);
      scaleY += -wingBeat * .009 * wing * strength + finalWeight * (anticipation * .052 * wing - emission * .066 * wing + emission * .035 * abdomen);
    }

    return {
      dx,
      dy,
      rotation,
      scaleX: Math.max(.82, scaleX),
      scaleY: Math.max(.82, scaleY)
    };
  }

  function drawBossAtlasPerformance(ctx, atlas, source, width, height, zone, phase, age, performance, responseSide, reducedEffects) {
    if (reducedEffects) {
      // Reduced effects retains the readable whole-body brace supplied by
      // drawBoss, but removes the independently flexing anatomical mesh.
      ctx.drawImage(atlas, source[0], source[1], source[2], source[3], -width * .5, -height * .5, width, height);
      return;
    }

    const bandCount = 5;
    const strength = phase >= (zone >= 4 ? 4 : 3) ? 1 : .88;
    const sourceBottom = source[1] + source[3];
    const destTop = -height * .5;
    const sourcePad = Math.min(2, source[3] / 200);
    const destPad = Math.max(.75, height * sourcePad / source[3]);

    // A dim undeformed under-paint is only visible in the tiny wedges exposed
    // by band rotation.  It prevents one-frame black seams without reading as
    // a second, ghosted copy of the creature.
    ctx.save();
    ctx.globalAlpha *= .16;
    ctx.drawImage(atlas, source[0], source[1], source[2], source[3], -width * .5, destTop, width, height);
    ctx.restore();

    for (let band = 0; band < bandCount; band++) {
      const v0 = band / bandCount;
      const v1 = (band + 1) / bandCount;
      const t = (v0 + v1) - 1;
      const pose = bossBandPose(zone, phase, age, t, performance, responseSide, strength);
      const rawSourceY = source[1] + source[3] * v0;
      const rawSourceEnd = source[1] + source[3] * v1;
      const sourceY = Math.max(source[1], rawSourceY - sourcePad);
      const sourceEnd = Math.min(sourceBottom, rawSourceEnd + sourcePad);
      const bandCenterY = destTop + height * (v0 + v1) * .5;
      const destinationY = destTop + height * v0 - (sourceY < rawSourceY ? destPad : 0);
      const destinationHeight = height * (v1 - v0)
        + (sourceY < rawSourceY ? destPad : 0)
        + (sourceEnd > rawSourceEnd ? destPad : 0);

      ctx.save();
      ctx.translate(pose.dx, bandCenterY + pose.dy);
      ctx.rotate(pose.rotation);
      ctx.scale(pose.scaleX, pose.scaleY);
      ctx.translate(0, -bandCenterY);
      ctx.drawImage(
        atlas,
        source[0],
        sourceY,
        source[2],
        sourceEnd - sourceY,
        -width * .5,
        destinationY,
        width,
        destinationHeight
      );
      ctx.restore();
    }
  }

  function drawTrawlmotherAsset(ctx, boss, state) {
    const atlas = artImages.trawlmother;
    if (!imageReady(atlas)) return false;
    const phase = clamp(Math.round(finite(boss.phase, 1)), 1, 3);
    const age = finite(boss.age);
    const performance = bossAttackPerformance(boss);
    const responseSide = hash(phase * 47 + 1877) > .5 ? 1 : -1;
    const reducedEffects = !!(state && state.reducedEffects);
    // The atlas is intentionally composed rather than mechanically gridded;
    // these specimen bounds prevent neighboring transformation states from
    // leaking into one another.
    const sources = [null, [0, 0, 465, 887], [465, 0, 559, 887], [1031, 0, 743, 887]];
    const source = sources[phase];
    const sourceWidth = source[2];
    const sourceHeight = source[3];
    const widths = [0, 252, 306, 386];
    const width = widths[phase];
    const height = width * sourceHeight / sourceWidth;

    drawBossAura(ctx, phase === 3 ? 'rgba(255,116,75,ALPHA)' : 'rgba(111,220,228,ALPHA)', phase === 3 ? 330 : 250, phase === 3 ? .3 : .19);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = phase === 3 ? 'rgba(255,188,91,.2)' : 'rgba(172,235,232,.14)';
    ctx.lineWidth = (phase === 3 ? 4 : 2) + performance.emission * (reducedEffects ? .6 : 1.8);
    const rings = phase === 1 ? 1 : (phase === 2 ? 3 : 5);
    for (let i = 0; i < rings; i++) {
      const ringAction = performance.anticipation * -5 + performance.emission * (12 + i * 2.5) - performance.recovery * 3;
      ctx.beginPath();
      ctx.ellipse(
        responseSide * performance.emission * (i - rings * .5) * 1.4,
        18 + performance.anticipation * 4 - performance.emission * 6,
        width * (.43 + i * .105) + Math.sin(age * 1.8 + i) * 5 + ringAction,
        height * (.24 + i * .037) + ringAction * .34,
        age * (phase === 3 ? .035 : .012) + responseSide * performance.recovery * .012,
        0,
        TAU
      );
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(0, [0, 55, 64, 78][phase] - performance.anticipation * 2 - performance.emission * 3);
    ctx.rotate(Math.sin(age * .63) * (phase === 3 ? .025 : .012) + responseSide * performance.recovery * .006);
    if (boss.flash > 0) ctx.filter = 'brightness(1.32) saturate(.72) contrast(1.08)';
    drawBossAtlasPerformance(
      ctx,
      atlas,
      source,
      width,
      height,
      0,
      phase,
      age,
      performance,
      responseSide,
      reducedEffects
    );
    ctx.filter = 'none';
    ctx.restore();

    const damage = clamp(1 - finite(boss.hp, 1) / Math.max(1, finite(boss.maxHp, boss.hp || 1)), 0, 1);
    if (damage > .18) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(255,178,106,${.18 + damage * .38})`; ctx.lineWidth = 1.4 + damage * 1.4;
      for (let i = 0; i < Math.floor(2 + damage * 6); i++) {
        const a = hash(i + 901) * TAU;
        const r = 36 + hash(i + 990) * width * .25;
        const x = Math.cos(a) * r, y = 12 + Math.sin(a) * r * .62;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x * 1.18 + Math.sin(i) * 9, y * 1.22); ctx.stroke();
      }
      ctx.restore();
    }
    return true;
  }

  const authoredBossSpecs = Object.freeze([
    null,
    Object.freeze({
      color: [196, 246, 154], hot: [255, 205, 100], sockets: 7,
      phases: Object.freeze([
        null,
        Object.freeze({ source: [0, 0, 330, 900], width: 170, offsetY: 60 }),
        Object.freeze({ source: [360, 0, 565, 900], width: 272, offsetY: 66 }),
        Object.freeze({ source: [960, 0, 576, 900], width: 324, offsetY: 90 })
      ])
    }),
    Object.freeze({
      color: [255, 226, 167], hot: [239, 75, 68], sockets: 6,
      phases: Object.freeze([
        null,
        Object.freeze({ source: [0, 0, 320, 1024], width: 178, offsetY: 100 }),
        Object.freeze({ source: [360, 0, 496, 1024], width: 236, offsetY: 105 }),
        Object.freeze({ source: [860, 0, 676, 1024], width: 312, offsetY: 105 })
      ])
    }),
    Object.freeze({
      color: [190, 250, 239], hot: [255, 142, 186], sockets: 9,
      phases: Object.freeze([
        null,
        Object.freeze({ source: [0, 0, 397, 941], width: 190, offsetY: 70 }),
        Object.freeze({ source: [397, 0, 668, 941], width: 332, offsetY: 85 }),
        Object.freeze({ source: [1093, 0, 579, 941], width: 296, offsetY: 110 })
      ])
    }),
    Object.freeze({
      color: [255, 184, 92], hot: [244, 73, 54], sockets: 8,
      phases: Object.freeze([
        null,
        Object.freeze({ source: [0, 0, 642, 566], width: 300, offsetY: 20 }),
        Object.freeze({ source: [642, 0, 612, 566], width: 350, offsetY: 35 }),
        Object.freeze({ source: [0, 566, 642, 688], width: 330, offsetY: 38 }),
        Object.freeze({ source: [642, 566, 612, 688], width: 390, offsetY: 70 })
      ])
    }),
    Object.freeze({
      color: [144, 238, 255], hot: [255, 224, 112], sockets: 8,
      phases: Object.freeze([
        null,
        Object.freeze({ source: [0, 0, 535, 595], width: 240, offsetY: 25 }),
        Object.freeze({ source: [500, 0, 754, 610], width: 370, offsetY: 30 }),
        Object.freeze({ source: [0, 535, 650, 719], width: 372, offsetY: 55 }),
        Object.freeze({ source: [610, 535, 644, 719], width: 390, offsetY: 70 })
      ])
    })
  ]);

  function drawAuthoredBossAsset(ctx, boss, zoneIndex, state) {
    const spec = authoredBossSpecs[zoneIndex];
    const atlas = ensureArtImage(zoneArt[zoneIndex] && zoneArt[zoneIndex].boss);
    if (!spec || !imageReady(atlas)) return false;
    const phase = clamp(Math.round(finite(boss.phase, 1)), 1, spec.phases.length - 1);
    const phaseSpec = spec.phases[phase];
    const source = phaseSpec.source;
    const width = phaseSpec.width;
    const height = width * source[3] / source[2];
    const age = finite(boss.age);
    const phaseAge = finite(boss.phaseAge, age);
    const reveal = ease(clamp(phaseAge / .92, 0, 1));
    const damage = clamp(1 - finite(boss.hp, 1) / Math.max(1, finite(boss.maxHp, boss.hp || 1)), 0, 1);
    const [r, g, b] = spec.color;
    const [hr, hg, hb] = spec.hot;
    const hitPulse = normalizedPulse(boss.hitPulse, .15);
    const performance = bossAttackPerformance(boss);
    const firePulse = performance.fire;
    const bracePulse = performance.anticipation;
    const responseSide = hash(zoneIndex * 109 + phase * 47 + 2309) > .5 ? 1 : -1;
    const reducedEffects = !!(state && state.reducedEffects);

    ctx.save();
    ctx.fillStyle = `rgba(0,3,8,${.25 + phase * .025})`;
    ctx.beginPath();
    ctx.ellipse(0, height * .19 + phaseSpec.offsetY, width * .43, Math.max(22, height * .105), 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    drawBossAura(
      ctx,
      `rgba(${phase >= spec.phases.length - 1 ? hr : r},${phase >= spec.phases.length - 1 ? hg : g},${phase >= spec.phases.length - 1 ? hb : b},ALPHA)`,
      Math.max(width, height) * .61,
      .16 + phase * .035
    );

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const ringCount = Math.min(6, phase + 1);
    ctx.strokeStyle = `rgba(${r},${g},${b},${.08 + phase * .025})`;
    ctx.lineWidth = phase >= 3 ? 2.4 : 1.5;
    for (let i = 0; i < ringCount; i++) {
      const pulse = Math.sin(age * (1.1 + phase * .17) + i * 1.9) * 5;
      ctx.beginPath();
      ctx.ellipse(
        0,
        phaseSpec.offsetY,
        width * (.34 + i * .09) + pulse,
        height * (.19 + i * .035) + pulse * .35,
        age * (i % 2 ? -.012 : .009),
        0,
        TAU
      );
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(0, phaseSpec.offsetY - bracePulse * 1.4 - firePulse * 2.2);
    ctx.rotate(
      Math.sin(age * .57 + zoneIndex) * (.008 + phase * .004)
      + responseSide * hitPulse * .022
    );
    ctx.scale(
      lerp(.76, 1, reveal) * (1 + hitPulse * .05 + bracePulse * .025 + firePulse * .018),
      lerp(1.14, 1, reveal) * (1 - hitPulse * .07 - bracePulse * .035 - firePulse * .04)
    );
    if (boss.flash > 0) ctx.filter = 'brightness(1.3) saturate(.78) contrast(1.07)';
    drawBossAtlasPerformance(
      ctx,
      atlas,
      source,
      width,
      height,
      zoneIndex,
      phase,
      age,
      performance,
      responseSide,
      reducedEffects
    );
    ctx.filter = 'none';
    ctx.restore();

    // Phase changes rupture the lighting as well as swapping the silhouette.
    // The shield is a gameplay value, so this visual can never run late or
    // conceal an active hitbox.
    if (reveal < 1 || finite(boss.phaseShield) > 0) {
      const transition = Math.max(1 - reveal, clamp(finite(boss.phaseShield) / 1.2, 0, 1));
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const bloom = ctx.createRadialGradient(0, phaseSpec.offsetY, 4, 0, phaseSpec.offsetY, width * .7);
      bloom.addColorStop(0, `rgba(${hr},${hg},${hb},${transition * .42})`);
      bloom.addColorStop(.3, `rgba(${r},${g},${b},${transition * .14})`);
      bloom.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = bloom;
      ctx.fillRect(-width, -height * .58, width * 2, height * 1.2);
      ctx.strokeStyle = `rgba(${hr},${hg},${hb},${transition * .55})`;
      ctx.lineWidth = 2 + transition * 5;
      ctx.beginPath(); ctx.ellipse(0, phaseSpec.offsetY, width * (.3 + (1 - transition) * .34), height * .2, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }

    // Low-cost anatomical source lights make each barrage appear to come from
    // the creature rather than from an invisible point at its centre.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const firingPulse = .035 + bracePulse * .16 + firePulse * ((state && state.reducedEffects) ? .24 : .48);
    for (let i = 0; i < spec.sockets; i++) {
      const u = spec.sockets === 1 ? .5 : i / (spec.sockets - 1);
      const x = (u - .5) * width * (.52 + phase * .05);
      const y = phaseSpec.offsetY + height * (.19 + Math.abs(u - .5) * .11);
      const radius = 5 + phase * 1.4 + (i % 2) * 2;
      const socket = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.2);
      socket.addColorStop(0, `rgba(${hr},${hg},${hb},${firingPulse})`);
      socket.addColorStop(1, `rgba(${hr},${hg},${hb},0)`);
      ctx.fillStyle = socket; ctx.fillRect(x - radius * 3.2, y - radius * 3.2, radius * 6.4, radius * 6.4);
    }
    ctx.restore();

    if (damage > .16) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(${hr},${hg},${hb},${.13 + damage * .42})`;
      ctx.lineWidth = 1.1 + damage * 1.9;
      for (let i = 0; i < Math.floor(2 + damage * 7); i++) {
        const a = hash(i + zoneIndex * 83 + 170) * TAU;
        const radius = 28 + hash(i + zoneIndex * 113 + 400) * width * .28;
        const x = Math.cos(a) * radius;
        const y = phaseSpec.offsetY + Math.sin(a) * radius * .72;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x * 1.15 + Math.sin(i * 3.1) * 8, phaseSpec.offsetY + (y - phaseSpec.offsetY) * 1.19);
        ctx.stroke();
      }
      ctx.restore();
    }
    return true;
  }

  function getBossVisualFootprint(boss) {
    const zone = resolveBossZone(boss);
    const phase = clamp(Math.round(finite(boss && boss.phase, 1)), 1, zone === 4 || zone === 5 ? 4 : 3);
    if (zone === 0) {
      const sources = [null, [0, 0, 465, 887], [465, 0, 559, 887], [1031, 0, 743, 887]];
      const widths = [0, 252, 306, 386];
      const offsets = [0, 55, 64, 78];
      const source = sources[phase];
      const width = widths[phase];
      return { width, height: width * source[3] / source[2], offsetY: offsets[phase] };
    }
    const spec = authoredBossSpecs[zone];
    const phaseSpec = spec && spec.phases[phase];
    if (!phaseSpec) return null;
    return {
      width: phaseSpec.width,
      height: phaseSpec.width * phaseSpec.source[3] / phaseSpec.source[2],
      offsetY: phaseSpec.offsetY
    };
  }

  function drawWeatherFruit(ctx, x, y, scale, time, seed) {
    const swing = Math.sin(time * .7 + seed * 5.1) * .045;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(swing);
    ctx.scale(scale, scale);

    ctx.strokeStyle = 'rgba(197,222,175,.34)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -74);
    ctx.bezierCurveTo(-7, -55, 8, -44, 0, -31);
    ctx.stroke();

    const glow = ctx.createRadialGradient(-7, -8, 2, 0, 0, 46);
    glow.addColorStop(0, 'rgba(255,232,156,.26)');
    glow.addColorStop(.56, 'rgba(102,192,158,.14)');
    glow.addColorStop(1, 'rgba(19,45,47,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, 0, 54, 67, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'rgba(37,89,70,.42)';
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.bezierCurveTo(33, -49, 47, -18, 38, 21);
    ctx.bezierCurveTo(31, 53, 10, 64, 0, 68);
    ctx.bezierCurveTo(-10, 64, -31, 53, -38, 21);
    ctx.bezierCurveTo(-47, -18, -33, -49, 0, -52);
    ctx.fill();
    ctx.strokeStyle = 'rgba(226,239,196,.52)';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 8, 34, 47, 0, 0, TAU);
    ctx.clip();
    const interior = ctx.createLinearGradient(0, -38, 0, 54);
    interior.addColorStop(0, 'rgba(13,38,54,.8)');
    interior.addColorStop(.56, 'rgba(42,105,104,.65)');
    interior.addColorStop(1, 'rgba(222,167,88,.56)');
    ctx.fillStyle = interior;
    ctx.fillRect(-40, -45, 80, 110);
    ctx.fillStyle = 'rgba(230,230,202,.19)';
    ctx.beginPath();
    ctx.ellipse(-8, 13 + Math.sin(time + seed) * 3, 31, 11, -.08, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(221,250,244,.8)';
    ctx.lineWidth = 1.4;
    const flash = Math.sin(time * 2.1 + seed * 11) > .76;
    if (flash) {
      ctx.beginPath();
      ctx.moveTo(5, -32);
      ctx.lineTo(-4, -6);
      ctx.lineTo(7, -9);
      ctx.lineTo(-8, 28);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const cloudX = -22 + i * 11;
      const cloudY = 25 + Math.sin(time * .4 + i + seed) * 3;
      ctx.fillStyle = 'rgba(220,238,218,.2)';
      ctx.beginPath();
      ctx.ellipse(cloudX, cloudY, 15, 7, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(244,239,196,.72)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(-11, -15, 22, 3.55, 5.2);
    ctx.stroke();
    ctx.restore();
  }

  function drawHangingAcre(ctx, time, progress, state) {
    fillVerticalGradient(ctx, '#07191f', '#173a35', '#182034', .55);
    radialGlow(ctx, W * .18, 335, 'rgba(239,195,111,.28)', 'rgba(239,195,111,0)', 270, 1);
    radialGlow(ctx, W * .8, 690, 'rgba(103,205,169,.15)', 'rgba(103,205,169,0)', 330, 1);

    const scroll = time * 46;
    const opened = ease(progress);

    ctx.save();
    ctx.globalAlpha = .24;
    ctx.strokeStyle = '#92be95';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const y = wrap(i * 310 + scroll * .22, H + 500) - 250;
      ctx.beginPath();
      ctx.moveTo(-100, y + 130);
      ctx.bezierCurveTo(110, y - 80, 480, y + 90, W + 100, y - 100);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(229,210,146,.16)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = '#92be95';
      ctx.lineWidth = 20;
    }
    ctx.restore();

    for (let i = 0; i < 10; i++) {
      const scale = .42 + hash(i + 3) * .42;
      const x = 48 + hash(i + 20) * (W - 96);
      const y = wrap(i * 173 + scroll * (.54 + hash(i) * .2), H + 280) - 150;
      drawWeatherFruit(ctx, x, y, scale, time, i + 1);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 7; i++) {
      const x = 35 + i * 108 + Math.sin(i * 2.2) * 18;
      const width = 10 + (i % 3) * 9;
      const pollen = ctx.createLinearGradient(x, 0, x, H);
      pollen.addColorStop(0, 'rgba(255,220,133,.02)');
      pollen.addColorStop(.32, `rgba(255,213,105,${.04 + opened * .035})`);
      pollen.addColorStop(1, 'rgba(255,202,91,0)');
      ctx.fillStyle = pollen;
      ctx.fillRect(x - width, 0, width * 2, H);
    }
    ctx.restore();

    ctx.save();
    const soil = ctx.createLinearGradient(0, 0, 0, 170);
    soil.addColorStop(0, '#030b0e');
    soil.addColorStop(.58, '#15251d');
    soil.addColorStop(1, '#304332');
    ctx.fillStyle = soil;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, 82);
    ctx.bezierCurveTo(630, 117, 570, 64, 491, 102);
    ctx.bezierCurveTo(397, 149, 320, 70, 228, 111);
    ctx.bezierCurveTo(126, 158, 64, 85, 0, 126);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(204,223,171,.22)';
    ctx.lineWidth = 3;
    ctx.stroke();

    for (let i = 0; i < 13; i++) {
      const x = 16 + i * 58 + hash(i + 100) * 24;
      const length = 90 + hash(i + 120) * 240;
      const sway = Math.sin(time * .38 + i) * (10 + i % 4 * 3);
      ctx.strokeStyle = i % 4 === 0 ? '#25392b' : 'rgba(154,181,127,.55)';
      ctx.lineWidth = 4 + hash(i + 140) * 10;
      ctx.beginPath();
      ctx.moveTo(x, 48 + hash(i) * 60);
      ctx.bezierCurveTo(x - 22, 105, x + sway + 22, length * .65, x + sway, length);
      ctx.stroke();
      if (i % 3 === 1) {
        ctx.fillStyle = 'rgba(93,154,106,.55)';
        for (let k = 1; k < 4; k++) {
          const leafY = 90 + k * length / 5;
          const side = k % 2 ? -1 : 1;
          ctx.beginPath();
          ctx.ellipse(x + sway * k / 5 + side * 10, leafY, 13, 5, side * .65, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    ctx.save();
    for (let i = 0; i < 40; i++) {
      const x = wrap(i * 79 + hash(i + 250) * 71 + Math.sin(time * .15 + i) * 18, W);
      const y = wrap(i * 113 + scroll * (1 + i % 3 * .18), H + 70) - 35;
      ctx.fillStyle = i % 5 ? 'rgba(244,206,111,.24)' : 'rgba(188,239,204,.3)';
      ctx.beginPath();
      ctx.arc(x, y, 1 + hash(i + 280) * 2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    drawAtmosphericGrain(ctx, time, 'rgba(201,241,221,.15)', 64, 34, -3);
    drawReadabilityFinish(ctx, state, 'rgba(1,8,10,.29)');
  }

  function drawVertebra(ctx, y, scale, bend, index, time) {
    ctx.save();
    ctx.translate(W * .5 + bend, y);
    ctx.scale(scale, scale);
    const warm = index % 3 === 0;

    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      const bone = ctx.createLinearGradient(45, -20, 280, 70);
      bone.addColorStop(0, warm ? '#d7bea0' : '#cbd0c3');
      bone.addColorStop(.42, '#eee3c8');
      bone.addColorStop(1, '#756f69');
      ctx.fillStyle = bone;
      ctx.beginPath();
      ctx.moveTo(54, -39);
      ctx.bezierCurveTo(108, -89, 192, -70, 291, -18);
      ctx.lineTo(335, 26);
      ctx.bezierCurveTo(236, 6, 174, 48, 113, 65);
      ctx.bezierCurveTo(83, 72, 62, 46, 42, 27);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,246,216,.54)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(73,69,68,.35)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(96, -27);
      ctx.bezierCurveTo(159, -28, 225, -13, 298, 12);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(144,171,148,.62)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const gx = 112 + i * 15;
        const gy = 21 + Math.sin(i * .8 + index) * 7;
        const lean = Math.sin(time * 1.6 + i + index) * 7;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx + 6, gy - 17, gx + lean, gy - 31 - i % 3 * 5);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.fillStyle = '#676866';
    ctx.beginPath();
    ctx.ellipse(0, 8, 78, 59, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#eee3c7';
    ctx.lineWidth = 19;
    ctx.beginPath();
    ctx.ellipse(0, 5, 60, 43, 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(83,52,55,.48)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 5, 51, .15, Math.PI - .15);
    ctx.stroke();
    ctx.restore();
  }

  function drawSpineCountry(ctx, time, progress, state) {
    fillVerticalGradient(ctx, '#0a1730', '#6c6a72', '#242332', .47);
    const dawn = ctx.createLinearGradient(0, 100, W, 540);
    dawn.addColorStop(0, 'rgba(135,117,117,0)');
    dawn.addColorStop(.48, 'rgba(232,177,120,.18)');
    dawn.addColorStop(1, 'rgba(248,210,149,0)');
    ctx.fillStyle = dawn;
    ctx.fillRect(0, 80, W, 560);
    radialGlow(ctx, W * .78, 205, 'rgba(255,225,171,.35)', 'rgba(255,190,128,0)', 220, 1);

    ctx.save();
    ctx.globalAlpha = .35;
    ctx.fillStyle = '#171b2a';
    ctx.beginPath();
    ctx.moveTo(0, 395);
    ctx.bezierCurveTo(118, 310, 215, 391, 327, 323);
    ctx.bezierCurveTo(435, 257, 551, 382, 720, 286);
    ctx.lineTo(720, 510);
    ctx.lineTo(0, 510);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const ground = ctx.createLinearGradient(0, 315, 0, H);
    ground.addColorStop(0, '#55575d');
    ground.addColorStop(.24, '#77756e');
    ground.addColorStop(.6, '#4a494c');
    ground.addColorStop(1, '#171925');
    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.moveTo(0, 370);
    ctx.bezierCurveTo(190, 292, 480, 420, 720, 322);
    ctx.lineTo(720, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    const scroll = time * 76;
    for (let i = -1; i < 7; i++) {
      const y = wrap(i * 238 + scroll, H + 430) - 210;
      const depth = clamp((y + 210) / (H + 430), 0, 1);
      const scale = .48 + depth * .56;
      const bend = Math.sin(i * 1.73 + progress * 2.2) * 34 * depth;
      drawVertebra(ctx, y, scale, bend, i, time);
    }

    ctx.save();
    ctx.fillStyle = 'rgba(20,24,31,.62)';
    ctx.strokeStyle = 'rgba(233,211,169,.3)';
    ctx.lineWidth = 1.5;
    for (let herd = 0; herd < 3; herd++) {
      const baseY = wrap(330 + herd * 370 + scroll * .36, H + 240) - 120;
      const center = 360 + Math.sin(time * .13 + herd * 2) * 110;
      for (let i = 0; i < 7; i++) {
        const x = center + (i - 3) * 22 + Math.sin(i * 4.3) * 8;
        const y = baseY + Math.abs(i - 3) * 10;
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x + 6, y + 5);
        ctx.lineTo(x, y + 2);
        ctx.lineTo(x - 6, y + 5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - 3, y - 6);
        ctx.lineTo(x - 7, y - 13);
        ctx.moveTo(x + 3, y - 6);
        ctx.lineTo(x + 7, y - 13);
        ctx.stroke();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = 'rgba(255,225,175,.13)';
    for (let i = 0; i < 24; i++) {
      const y = wrap(i * 91 + scroll * (1.1 + i % 4 * .08), H + 100) - 50;
      const x = wrap(i * 137 + time * 23, W + 160) - 80;
      ctx.lineWidth = 1 + i % 2;
      ctx.beginPath();
      ctx.moveTo(x - 28, y);
      ctx.quadraticCurveTo(x, y + 3, x + 43, y - 2);
      ctx.stroke();
    }
    ctx.restore();
    drawAtmosphericGrain(ctx, time, 'rgba(250,221,178,.14)', 83, 28, 10);
    drawReadabilityFinish(ctx, state, 'rgba(4,7,16,.33)');
  }

  function drawCiliaBank(ctx, side, y, scale, time, seed) {
    ctx.save();
    ctx.translate(side < 0 ? 0 : W, y);
    ctx.scale(side, 1);
    ctx.strokeStyle = 'rgba(212,185,181,.42)';
    ctx.lineWidth = 3 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const yy = (i - 5.5) * 13 * scale;
      const wave = Math.sin(time * 1.3 + seed + i * .28) * 17;
      ctx.moveTo(0, yy);
      ctx.quadraticCurveTo(45 * scale, yy - 14, 92 * scale + wave, yy - 3);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawLungSea(ctx, time, progress, state) {
    fillVerticalGradient(ctx, '#101429', '#382f4a', '#141728', .52);
    const breath = Math.sin(time * 1.02) * .5 + .5;
    const breathWidth = 24 + breath * 22;
    radialGlow(ctx, W * .5, H * .48, 'rgba(205,241,235,.14)', 'rgba(205,241,235,0)', 430, 1);
    radialGlow(ctx, W * .28, 230, 'rgba(244,184,173,.14)', 'rgba(244,184,173,0)', 250, 1);

    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      if (side < 0) ctx.translate(-W, 0);
      const membrane = ctx.createLinearGradient(W - 220, 0, W, 0);
      membrane.addColorStop(0, 'rgba(112,73,105,.12)');
      membrane.addColorStop(.63, 'rgba(173,108,124,.42)');
      membrane.addColorStop(1, 'rgba(61,30,59,.82)');
      ctx.fillStyle = membrane;
      ctx.beginPath();
      ctx.moveTo(W, 0);
      ctx.lineTo(W, H);
      ctx.bezierCurveTo(W - 110 - breathWidth, 980, W - 95 + breathWidth, 840, W - 142 - breathWidth, 710);
      ctx.bezierCurveTo(W - 205 + breathWidth, 555, W - 89 - breathWidth, 398, W - 156 + breathWidth, 245);
      ctx.bezierCurveTo(W - 93, 116, W - 138, 46, W, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(250,202,194,.22)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(110,34,68,.55)';
      ctx.lineWidth = 5;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(W - 4, 70 + i * 225);
        ctx.bezierCurveTo(W - 78, 120 + i * 210, W - 77 - breathWidth, 193 + i * 198, W - 146, 250 + i * 180);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(244,163,170,.23)';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(110,34,68,.55)';
        ctx.lineWidth = 5;
      }
      ctx.restore();
    }

    const current = ctx.createLinearGradient(W * .5, 90, W * .5, H);
    current.addColorStop(0, 'rgba(201,245,239,0)');
    current.addColorStop(.45, 'rgba(201,245,239,.055)');
    current.addColorStop(1, 'rgba(201,245,239,0)');
    ctx.fillStyle = current;
    ctx.beginPath();
    ctx.moveTo(279 - breath * 13, 0);
    ctx.bezierCurveTo(432, 285, 274, 690, 246, H);
    ctx.lineTo(489, H);
    ctx.bezierCurveTo(444, 720, 544, 338, 435 + breath * 11, 0);
    ctx.closePath();
    ctx.fill();

    const scroll = time * 64;
    for (let i = 0; i < 7; i++) {
      const y = wrap(i * 203 + scroll, H + 260) - 130;
      const scale = .68 + (y + 130) / (H + 260) * .42;
      drawCiliaBank(ctx, -1, y, scale, time, i);
      drawCiliaBank(ctx, 1, y + 68, scale, time, i + .8);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const pearls = [];
    for (let i = 0; i < 25; i++) {
      const radius = 7 + hash(i + 320) * 24;
      const x = 72 + hash(i + 330) * (W - 144) + Math.sin(time * .17 + i) * 11;
      const y = wrap(i * 149 - time * (20 + i % 4 * 8), H + 150) - 75;
      pearls.push({ x, y, radius, pink: i % 3 === 0 });
    }
    for (const pink of [false, true]) {
      ctx.fillStyle = pink ? 'rgba(241,173,184,.13)' : 'rgba(188,220,219,.1)';
      ctx.beginPath();
      for (const pearl of pearls) if (pearl.pink === pink) {
        ctx.moveTo(pearl.x + pearl.radius, pearl.y);
        ctx.arc(pearl.x, pearl.y, pearl.radius, 0, TAU);
      }
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(224,249,243,.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const pearl of pearls) {
      ctx.moveTo(pearl.x + pearl.radius, pearl.y);
      ctx.arc(pearl.x, pearl.y, pearl.radius, 0, TAU);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(247,255,244,.38)';
    ctx.beginPath();
    for (const pearl of pearls) {
      const shine = Math.max(1.5, pearl.radius * .17);
      const x = pearl.x - pearl.radius * .28;
      const y = pearl.y - pearl.radius * .3;
      ctx.moveTo(x + shine, y);
      ctx.arc(x, y, shine, 0, TAU);
    }
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(232,193,196,.11)';
    ctx.lineWidth = 10;
    for (let i = 0; i < 4; i++) {
      const y = wrap(i * 323 + scroll * .42, H + 330) - 165;
      ctx.beginPath();
      ctx.ellipse(W * .5, y, 260 + breath * 22, 72 + breath * 8, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    drawAtmosphericGrain(ctx, time, 'rgba(213,247,242,.12)', -22, 30, 2);
    drawReadabilityFinish(ctx, state, 'rgba(5,5,17,.34)');
  }

  function drawBuilding(ctx, x, y, width, height, seed, time, phase = 0) {
    const face = ctx.createLinearGradient(x, y, x + width, y + height);
    face.addColorStop(0, seed % 3 ? '#202a35' : '#30313a');
    face.addColorStop(1, '#0d141e');
    ctx.fillStyle = face;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = 'rgba(130,119,112,.18)';
    ctx.fillRect(x, y, 6, height);
    ctx.strokeStyle = 'rgba(218,206,184,.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, y + .5, width - 1, height - 1);

    const columns = Math.max(2, Math.floor(width / 14));
    const rows = Math.max(2, Math.floor(height / 18));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const lit = hash(seed * 47 + row * 9 + col * 3) > .52;
        const flicker = Math.sin(time * .7 + seed + row * 2 + col) > -.95;
        ctx.fillStyle = lit && flicker
          ? (phase > 1 ? 'rgba(255,119,89,.42)' : 'rgba(255,210,133,.34)')
          : 'rgba(4,9,15,.5)';
        ctx.fillRect(x + 7 + col * (width - 12) / columns, y + 8 + row * (height - 13) / rows, 4, 6);
      }
    }
  }

  function drawBorrowedCity(ctx, time, progress, state) {
    fillVerticalGradient(ctx, '#07101b', '#1b2630', '#11131d', .48);
    radialGlow(ctx, 570, 170, 'rgba(244,181,103,.16)', 'rgba(244,181,103,0)', 260, 1);
    const scroll = time * 70;

    ctx.save();
    ctx.fillStyle = '#3d3139';
    ctx.globalAlpha = .58;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(119, 132, 63, 305, 136, 452);
    ctx.bezierCurveTo(202, 588, 93, 841, 0, H);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.bezierCurveTo(601, 106, 652, 310, 576, 461);
    ctx.bezierCurveTo(520, 636, 636, 850, W, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(218,143,141,.22)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i % 2 ? W : 0, i * 260 + 40);
      ctx.bezierCurveTo(160 + i * 20, 230 + i * 170, 90, 360 + i * 190, 184, 470 + i * 170);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    const road = ctx.createLinearGradient(0, 0, W, 0);
    road.addColorStop(0, '#10151d');
    road.addColorStop(.15, '#222a31');
    road.addColorStop(.5, '#303238');
    road.addColorStop(.85, '#222a31');
    road.addColorStop(1, '#10151d');
    ctx.fillStyle = road;
    ctx.fillRect(208, 0, 304, H);
    ctx.strokeStyle = 'rgba(241,208,134,.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([28, 25]);
    ctx.lineDashOffset = scroll;
    ctx.beginPath();
    ctx.moveTo(330, 0);
    ctx.lineTo(330, H);
    ctx.moveTo(390, 0);
    ctx.lineTo(390, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(225,228,218,.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(219, 0); ctx.lineTo(219, H);
    ctx.moveTo(501, 0); ctx.lineTo(501, H);
    ctx.stroke();
    ctx.restore();

    for (let row = -1; row < 7; row++) {
      const y = wrap(row * 225 + scroll, H + 330) - 190;
      const height = 86 + hash(row + 500) * 82;
      drawBuilding(ctx, 14 + hash(row + 510) * 46, y, 84 + hash(row + 520) * 58, height, row + 30, time);
      drawBuilding(ctx, 137 + hash(row + 530) * 42, y + 41, 54 + hash(row + 540) * 34, height * .72, row + 70, time);
      drawBuilding(ctx, 516 + hash(row + 550) * 43, y + 18, 64 + hash(row + 560) * 38, height * .81, row + 110, time);
      drawBuilding(ctx, 610 + hash(row + 570) * 34, y - 28, 62 + hash(row + 580) * 45, height * 1.08, row + 150, time);

      const crossY = y + 171;
      ctx.fillStyle = '#171c23';
      ctx.fillRect(0, crossY, W, 38);
      ctx.strokeStyle = 'rgba(229,222,200,.17)';
      ctx.lineWidth = 1;
      for (let x = 15; x < W; x += 34) {
        ctx.beginPath();
        ctx.moveTo(x, crossY + 18);
        ctx.lineTo(x + 16, crossY + 18);
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(0,2,6,.82)';
    ctx.lineWidth = 17;
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const x = i % 2 ? -20 : W + 20;
      const target = 180 + i * 68;
      const y = -80 + i * 171;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(i % 2 ? 150 : W - 150, y + 64, i % 2 ? 85 : W - 85, y + 198, target, y + 285);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(108,50,63,.38)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,2,6,.82)';
      ctx.lineWidth = 17;
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 22; i++) {
      const x = i % 2 ? 224 + hash(i + 620) * 278 : hash(i + 620) * W;
      const y = wrap(i * 149 + scroll * (1.2 + i % 3 * .1), H + 90) - 45;
      ctx.fillStyle = i % 4 ? 'rgba(255,204,124,.14)' : 'rgba(151,221,226,.18)';
      ctx.fillRect(x, y, 2, 13);
    }
    ctx.restore();
    drawAtmosphericGrain(ctx, time, 'rgba(178,221,226,.13)', 138, 44, -6);
    drawReadabilityFinish(ctx, state, 'rgba(2,5,10,.37)');
  }

  function drawCloudRibbon(ctx, x, y, scale, alpha, time, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha *= alpha;
    const cloud = ctx.createLinearGradient(0, -35, 0, 45);
    cloud.addColorStop(0, 'rgba(249,253,238,.72)');
    cloud.addColorStop(1, 'rgba(178,222,227,.06)');
    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.moveTo(-175, 18);
    ctx.bezierCurveTo(-117, -10, -79, 4, -45, -30);
    ctx.bezierCurveTo(-8, -62, 33, -23, 55, -8);
    ctx.bezierCurveTo(91, -33, 142, -4, 179, 24);
    ctx.bezierCurveTo(81, 35, -62, 38, -175, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.34)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-145, 13);
    ctx.bezierCurveTo(-48, -2, 57, 12, 153, 18 + Math.sin(time * .2 + seed) * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawFirstBlue(ctx, time, progress, state) {
    fillVerticalGradient(ctx, '#03517f', '#178eb9', '#68becd', .64);
    const high = ctx.createLinearGradient(0, 0, W, 0);
    high.addColorStop(0, 'rgba(0,33,69,.22)');
    high.addColorStop(.5, 'rgba(61,172,210,0)');
    high.addColorStop(1, 'rgba(0,43,75,.18)');
    ctx.fillStyle = high;
    ctx.fillRect(0, 0, W, H);
    radialGlow(ctx, 575, 116, 'rgba(255,250,199,.72)', 'rgba(255,224,147,0)', 250, 1);

    const scroll = time * 52;
    for (let i = -1; i < 6; i++) {
      const y = wrap(i * 274 + scroll * (.45 + i % 3 * .07), H + 470) - 235;
      const x = i % 2 ? 140 + Math.sin(i * 3.2) * 70 : 570 + Math.sin(i * 2.4) * 45;
      drawCloudRibbon(ctx, x, y, .58 + (i + 2) % 3 * .25, .16 + (i + 2) % 3 * .07, time, i);
    }

    ctx.save();
    ctx.globalAlpha = .62 + ease(progress) * .13;
    const body = ctx.createRadialGradient(W * .5, H + 250, 170, W * .5, H + 250, 740);
    body.addColorStop(0, '#d7ded3');
    body.addColorStop(.52, '#829b9a');
    body.addColorStop(.78, '#426d78');
    body.addColorStop(1, 'rgba(24,62,77,0)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(W * .5, H + 196 - progress * 40, 660, 415, -.03, Math.PI, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(242,243,218,.24)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(W * .5, H + 196 - progress * 40, 660, 415, -.03, Math.PI + .19, TAU - .2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(20,74,83,.24)';
    ctx.lineWidth = 13;
    for (let i = 0; i < 7; i++) {
      const x = 100 + i * 87;
      ctx.beginPath();
      ctx.moveTo(x, 940 + Math.sin(i) * 19);
      ctx.bezierCurveTo(x - 35, 1005, x + 28, 1040, x + Math.sin(time * .2 + i) * 25, H + 30);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(221,246,240,.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(20,74,83,.24)';
      ctx.lineWidth = 13;
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = 'rgba(214,250,249,.2)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const y = wrap(i * 109 + scroll * (1 + i % 3 * .12), H + 130) - 65;
      const x = 30 + hash(i + 700) * 660;
      ctx.beginPath();
      ctx.moveTo(x - 60, y + 9);
      ctx.bezierCurveTo(x - 15, y - 4, x + 29, y + 4, x + 78, y - 7);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(5,69,99,.24)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 10; i++) {
      const x = wrap(i * 173 + time * (18 + i % 3 * 5), W + 200) - 100;
      const y = 128 + i * 71;
      ctx.beginPath();
      ctx.moveTo(x - 34, y);
      ctx.lineTo(x, y - 5);
      ctx.lineTo(x + 34, y);
      ctx.stroke();
    }
    ctx.restore();
    drawAtmosphericGrain(ctx, time, 'rgba(232,255,250,.18)', 154, 27, -5);
    drawReadabilityFinish(ctx, state, 'rgba(1,34,56,.24)');
  }

  function bossAlpha(boss, state) {
    if (!boss || !boss.dead) return 1;
    const death = finite(state && state.bossDeath, 0);
    return death > 0 ? clamp(death / 4.8, 0, 1) : .22;
  }

  function drawBossAura(ctx, color, radius, intensity = .22) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const aura = ctx.createRadialGradient(0, 0, 12, 0, 0, radius);
    aura.addColorStop(0, color.replace('ALPHA', String(intensity)));
    aura.addColorStop(1, color.replace('ALPHA', '0'));
    ctx.fillStyle = aura;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();
  }

  function drawGardenerHand(ctx, x, y, angle, scale, phase, index) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.fillStyle = phase >= 3 && index % 4 === 0 ? '#f1b65f' : '#c9b982';
    ctx.strokeStyle = '#3a3b30';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 10, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.lineCap = 'round';
    for (let finger = -2; finger <= 2; finger++) {
      ctx.beginPath();
      ctx.moveTo(finger * 2.4, -5);
      ctx.lineTo(finger * 3.1, -15 - (2 - Math.abs(finger)) * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHundredHandGardener(ctx, boss) {
    const age = finite(boss.age);
    const phase = finite(boss.phase, 1);
    drawBossAura(ctx, 'rgba(194,255,160,ALPHA)', 205, .22);

    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 24; i++) {
      const ring = i % 2;
      const angle = -Math.PI * .93 + i * TAU / 24 + Math.sin(age * .65 + i * 1.7) * .055;
      const radius = 116 + ring * 35 + (phase >= 3 ? Math.sin(age * 2.2 + i) * 17 : 0);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * .76 + 14;
      const side = Math.sign(x) || 1;
      ctx.strokeStyle = i % 5 === 0 ? '#84603e' : (ring ? '#52673c' : '#75804c');
      ctx.lineWidth = ring ? 5 : 7;
      ctx.beginPath();
      ctx.moveTo(side * (30 + ring * 10), -4 + (i % 3) * 9);
      ctx.bezierCurveTo(x * .38, y * .16 - 25, x * .72 + Math.sin(age + i) * 12, y * .65, x, y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(235,224,169,.24)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      drawGardenerHand(ctx, x, y, angle + Math.PI * .5, .7 + ring * .08, phase, i);
    }
    ctx.restore();

    if (phase >= 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 10; i++) {
        const a = age * (phase >= 3 ? .62 : .32) + i * TAU / 10;
        const r = 173 + Math.sin(age * 1.2 + i) * 9;
        ctx.fillStyle = i % 2 ? 'rgba(255,213,108,.62)' : 'rgba(177,235,160,.55)';
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * r, Math.sin(a) * r * .68, 6, 10, a, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    const body = ctx.createLinearGradient(0, -105, 0, 112);
    body.addColorStop(0, '#b7a66e');
    body.addColorStop(.48, '#596540');
    body.addColorStop(1, '#242a24');
    ctx.fillStyle = boss.flash > 0 ? '#ffffff' : body;
    ctx.beginPath();
    ctx.moveTo(0, -111);
    ctx.bezierCurveTo(71, -94, 83, -35, 68, 35);
    ctx.bezierCurveTo(58, 89, 29, 116, 0, 128);
    ctx.bezierCurveTo(-29, 116, -58, 89, -68, 35);
    ctx.bezierCurveTo(-83, -35, -71, -94, 0, -111);
    ctx.fill();
    ctx.strokeStyle = '#e7d99b';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#243326';
    ctx.beginPath();
    ctx.ellipse(0, -69, 48, 32, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#e3c46f';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#f0d889';
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.ellipse(i * 18, -70, 7, 11, i * .14, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#17211c';
      ctx.beginPath();
      ctx.ellipse(i * 18, -70, 2.5, 6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#f0d889';
    }

    ctx.fillStyle = '#151c19';
    pathRoundRect(ctx, -39, -20, 78, 82, 24);
    ctx.fill();
    ctx.strokeStyle = '#a6b468';
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(-30 + i * 10, -13);
      ctx.quadraticCurveTo(-17 + i * 7, 18, -27 + i * 9, 52);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd070';
    ctx.beginPath();
    ctx.arc(0, 25, 7 + Math.sin(age * 2) * 1.3, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#394a31';
    ctx.beginPath();
    ctx.ellipse(0, -112, 102, 25, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#d5c781';
    ctx.lineWidth = 3;
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9;
      ctx.fillStyle = i % 3 ? '#6f8e50' : '#b98148';
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 86, -112 + Math.sin(a) * 18, 19, 7, a, 0, TAU);
      ctx.fill();
    }
  }

  function strokeAntler(ctx, side, age, phase) {
    ctx.save();
    ctx.scale(side, 1);
    const flare = phase >= 3 ? 1.08 : 1;
    ctx.scale(flare, flare);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#352d31';
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(38, -43);
    ctx.bezierCurveTo(74, -104, 82, -161, 142, -184);
    ctx.bezierCurveTo(191, -202, 205, -145, 181, -111);
    ctx.stroke();
    ctx.strokeStyle = '#e8dfc9';
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.strokeStyle = '#fff5dc';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    const branches = [
      [76, -112, 53, -163, 77, -203],
      [111, -162, 113, -221, 150, -239],
      [151, -184, 181, -235, 218, -229],
      [187, -157, 229, -184, 248, -154],
      [179, -114, 225, -116, 238, -82]
    ];
    for (let i = 0; i < branches.length; i++) {
      const b = branches[i];
      ctx.strokeStyle = '#3a3133';
      ctx.lineWidth = 15 - i * .8;
      ctx.beginPath();
      ctx.moveTo(b[0], b[1]);
      ctx.quadraticCurveTo(b[2], b[3], b[4], b[5]);
      ctx.stroke();
      ctx.strokeStyle = '#e6dcc6';
      ctx.lineWidth = 9 - i * .6;
      ctx.stroke();
      if (phase >= 2) {
        ctx.fillStyle = i % 2 ? 'rgba(255,208,113,.72)' : 'rgba(193,238,226,.6)';
        ctx.beginPath();
        ctx.arc(b[4], b[5] + Math.sin(age * 1.3 + i) * 2, 4.5, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawCathedralStag(ctx, boss) {
    const age = finite(boss.age);
    const phase = finite(boss.phase, 1);
    drawBossAura(ctx, 'rgba(255,221,155,ALPHA)', 265, .2);
    if (phase >= 2) {
      ctx.save();
      ctx.globalAlpha = .22;
      ctx.strokeStyle = '#f3ddb0';
      ctx.lineWidth = 7;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(0, -85, 105 + i * 42 + Math.sin(age * 1.6 + i) * 5, 157 + i * 26, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    strokeAntler(ctx, -1, age, phase);
    strokeAntler(ctx, 1, age, phase);

    ctx.fillStyle = '#1e2028';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.beginPath();
      ctx.moveTo(44, -46);
      ctx.quadraticCurveTo(91, -83, 118, -44);
      ctx.quadraticCurveTo(81, -16, 49, -22);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#e5d8bf';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    const neck = ctx.createLinearGradient(-62, -91, 65, 132);
    neck.addColorStop(0, '#eee5cf');
    neck.addColorStop(.5, '#aaa99f');
    neck.addColorStop(1, '#363640');
    ctx.fillStyle = boss.flash > 0 ? '#ffffff' : neck;
    ctx.beginPath();
    ctx.moveTo(-49, -94);
    ctx.bezierCurveTo(-71, -25, -64, 60, -38, 127);
    ctx.lineTo(0, 167);
    ctx.lineTo(38, 127);
    ctx.bezierCurveTo(64, 60, 71, -25, 49, -94);
    ctx.bezierCurveTo(28, -124, -28, -124, -49, -94);
    ctx.fill();
    ctx.strokeStyle = '#fff5de';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = '#725559';
    ctx.lineWidth = 7;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-37 + i * 18, 85);
      ctx.quadraticCurveTo(-31 + i * 15, 133, -50 + i * 25, 171);
      ctx.stroke();
    }

    ctx.fillStyle = '#22202a';
    ctx.beginPath();
    ctx.ellipse(0, -50, 36, 59, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#e1c47e';
    ctx.lineWidth = 4;
    ctx.stroke();

    const rose = phase >= 3 ? '#ff9f73' : '#ffd078';
    ctx.strokeStyle = rose;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -62, 23, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + age * .12;
      ctx.beginPath();
      ctx.moveTo(0, -62);
      ctx.lineTo(Math.cos(a) * 22, -62 + Math.sin(a) * 22);
      ctx.stroke();
    }
    ctx.fillStyle = '#bff2ee';
    ctx.beginPath();
    ctx.arc(0, -62, 5, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#e6dcc8';
    ctx.beginPath();
    ctx.moveTo(-24, -18);
    ctx.quadraticCurveTo(0, 6, 24, -18);
    ctx.lineTo(17, 18);
    ctx.quadraticCurveTo(0, 38, -17, 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#25212a';
    ctx.beginPath();
    ctx.ellipse(0, 15, 10, 7, 0, 0, TAU);
    ctx.fill();

    for (const side of [-1, 1]) {
      ctx.fillStyle = '#ffdc86';
      ctx.beginPath();
      ctx.ellipse(side * 20, -36, 5, 9, side * .15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#11141c';
      ctx.beginPath();
      ctx.ellipse(side * 20, -36, 2, 5, 0, 0, TAU);
      ctx.fill();
    }
  }

  function drawThroat(ctx, angle, radius, age, phase, index) {
    const pulse = Math.sin(age * 2.1 + index * .93) * 7;
    const x = Math.cos(angle) * (radius + pulse);
    const y = Math.sin(angle) * (radius * .74 + pulse * .5) + 5;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3c1e3e';
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 43, Math.sin(angle) * 36 + 3);
    ctx.bezierCurveTo(Math.cos(angle + .44) * 83, Math.sin(angle + .44) * 55, x * .72, y * .8, x, y);
    ctx.stroke();
    ctx.strokeStyle = phase >= 3 && index % 3 === 0 ? '#d7899a' : '#aa778c';
    ctx.lineWidth = 19;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,213,207,.35)';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI * .5);
    const open = 10 + (Math.sin(age * 2.4 + index) * .5 + .5) * (phase >= 2 ? 8 : 4);
    ctx.fillStyle = '#170d22';
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, open, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#e5a8a4';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = '#f3d1c3';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * open * .67);
      ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * open * .92);
      ctx.stroke();
    }
    ctx.fillStyle = index % 2 ? '#ffd486' : '#c9fbff';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawNineThroatsBody(ctx, boss) {
    const age = finite(boss.age);
    const phase = finite(boss.phase, 1);
    drawBossAura(ctx, 'rgba(238,165,189,ALPHA)', 230, .22);

    if (phase >= 2) {
      ctx.save();
      ctx.strokeStyle = 'rgba(210,248,240,.24)';
      ctx.lineWidth = 5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 8, 115 + i * 29 + Math.sin(age * 2.4 + i) * 5, 83 + i * 17, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (let i = 0; i < 9; i++) {
      const angle = -Math.PI * .5 + i * TAU / 9 + (phase >= 3 ? Math.sin(age * .35) * .09 : 0);
      drawThroat(ctx, angle, 145 + (i % 2) * 20, age, phase, i);
    }

    const body = ctx.createRadialGradient(-18, -24, 6, 0, 0, 92);
    body.addColorStop(0, boss.flash > 0 ? '#ffffff' : '#d9b7bb');
    body.addColorStop(.48, '#7d536f');
    body.addColorStop(1, '#281d36');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -96);
    ctx.bezierCurveTo(72, -85, 98, -37, 86, 23);
    ctx.bezierCurveTo(73, 89, 30, 116, 0, 121);
    ctx.bezierCurveTo(-30, 116, -73, 89, -86, 23);
    ctx.bezierCurveTo(-98, -37, -72, -85, 0, -96);
    ctx.fill();
    ctx.strokeStyle = 'rgba(250,219,212,.75)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(65,26,61,.55)';
    ctx.lineWidth = 7;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 24, -76 + Math.abs(i) * 9);
      ctx.bezierCurveTo(i * 37, -4, i * 9, 55, i * 16, 100);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(252,205,206,.2)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(65,26,61,.55)';
      ctx.lineWidth = 7;
    }

    ctx.fillStyle = '#171326';
    ctx.beginPath();
    ctx.ellipse(0, 9, 41, 52, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = phase >= 3 ? '#ffaf86' : '#d8eee5';
    ctx.lineWidth = 4;
    ctx.stroke();
    if (!boss.staticBake) {
      for (let i = 0; i < 9; i++) {
        const a = i * TAU / 9 + age * (phase >= 3 ? .33 : .1);
        ctx.fillStyle = i % 2 ? '#f0c98c' : '#c9fbff';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 27, 9 + Math.sin(a) * 35, 3.8, 0, TAU);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#f4dfbd';
    ctx.beginPath();
    ctx.ellipse(0, -40, 24, 15, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a1931';
    ctx.beginPath();
    ctx.ellipse(0, -40, 8, 11, 0, 0, TAU);
    ctx.fill();
  }

  const nineThroatsSprites = new Map();

  function nineThroatsSprite(phase, flash) {
    const key = `${phase}:${flash ? 1 : 0}`;
    if (nineThroatsSprites.has(key)) return nineThroatsSprites.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = 560;
    canvas.height = 560;
    const ink = canvas.getContext('2d', { alpha: true });
    ink.translate(280, 280);
    drawNineThroatsBody(ink, { age: .85, phase, flash: flash ? 1 : 0, staticBake: true });
    nineThroatsSprites.set(key, canvas);
    return canvas;
  }

  function drawNineThroats(ctx, boss) {
    const age = finite(boss.age);
    const phase = finite(boss.phase, 1);
    const sprite = nineThroatsSprite(phase, boss.flash > 0);
    ctx.save();
    ctx.rotate(Math.sin(age * .35) * .012);
    ctx.scale(1 + Math.sin(age * 2.1) * .006, 1 + Math.sin(age * 2.4) * .012);
    ctx.drawImage(sprite, -280, -280);
    ctx.restore();

    // The intricate body is static geometry, but the nine inner voices keep a
    // full-rate orbit so the boss continues to breathe and communicate phase.
    ctx.save();
    ctx.rotate(age * (phase >= 3 ? .33 : .1));
    ctx.beginPath();
    for (let i = 0; i < 9; i += 2) {
      const a = i * TAU / 9;
      ctx.moveTo(Math.cos(a) * 27 + 3.8, 9 + Math.sin(a) * 35);
      ctx.arc(Math.cos(a) * 27, 9 + Math.sin(a) * 35, 3.8, 0, TAU);
    }
    ctx.fillStyle = '#c9fbff';
    ctx.fill();
    ctx.beginPath();
    for (let i = 1; i < 9; i += 2) {
      const a = i * TAU / 9;
      ctx.moveTo(Math.cos(a) * 27 + 3.8, 9 + Math.sin(a) * 35);
      ctx.arc(Math.cos(a) * 27, 9 + Math.sin(a) * 35, 3.8, 0, TAU);
    }
    ctx.fillStyle = '#f0c98c';
    ctx.fill();
    ctx.restore();
  }

  function drawDistrictBuilding(ctx, x, y, width, height, seed, age, phase) {
    const facade = ctx.createLinearGradient(x, y, x + width, y + height);
    facade.addColorStop(0, seed % 2 ? '#4a4650' : '#343c46');
    facade.addColorStop(1, '#111824');
    ctx.fillStyle = facade;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#918c84';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    const cols = Math.max(2, Math.floor(width / 13));
    const rows = Math.max(2, Math.floor(height / 17));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const on = hash(seed * 63 + row * 11 + col) > .42;
        ctx.fillStyle = on
          ? (phase >= 3 && (row + col) % 3 === 0 ? '#ff856c' : 'rgba(255,211,128,.72)')
          : '#090e16';
        ctx.fillRect(x + 6 + col * (width - 10) / cols, y + 7 + row * (height - 11) / rows, 4, 6);
      }
    }
    if (seed % 3 === 0) {
      ctx.strokeStyle = 'rgba(205,239,235,.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + width * .5, y);
      ctx.lineTo(x + width * .5 + Math.sin(age + seed) * 4, y - 19);
      ctx.stroke();
    }
  }

  function drawBorrowedCityBoss(ctx, boss) {
    const age = finite(boss.age);
    const phase = finite(boss.phase, 1);
    drawBossAura(ctx, 'rgba(255,168,104,ALPHA)', 255, .18);

    ctx.save();
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      const armLift = phase >= 2 ? -60 : -7;
      ctx.strokeStyle = '#060910';
      ctx.lineWidth = 42;
      ctx.beginPath();
      ctx.moveTo(79, -1);
      ctx.bezierCurveTo(145, -14, 155, armLift, 215, armLift + 28);
      ctx.stroke();
      ctx.strokeStyle = '#41454c';
      ctx.lineWidth = 25;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(244,207,127,.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#121720';
      ctx.beginPath();
      ctx.moveTo(199, armLift + 5);
      ctx.lineTo(245, armLift + 28);
      ctx.lineTo(211, armLift + 61);
      ctx.lineTo(181, armLift + 35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    ctx.strokeStyle = '#02050a';
    ctx.lineWidth = 27;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 46, 91);
      ctx.bezierCurveTo(side * 67, 138, side * 47, 173, side * 97, 224);
      ctx.stroke();
      ctx.strokeStyle = '#4a4145';
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.strokeStyle = '#02050a';
      ctx.lineWidth = 27;
    }

    const mass = ctx.createLinearGradient(0, -126, 0, 126);
    mass.addColorStop(0, '#4a4950');
    mass.addColorStop(.45, '#242c36');
    mass.addColorStop(1, '#090f17');
    ctx.fillStyle = boss.flash > 0 ? '#ffffff' : mass;
    ctx.beginPath();
    ctx.moveTo(-124, 71);
    ctx.lineTo(-115, -66);
    ctx.lineTo(-75, -95);
    ctx.lineTo(-48, -83);
    ctx.lineTo(-26, -131);
    ctx.lineTo(6, -112);
    ctx.lineTo(36, -153);
    ctx.lineTo(69, -103);
    ctx.lineTo(111, -80);
    ctx.lineTo(128, 73);
    ctx.lineTo(76, 124);
    ctx.lineTo(-75, 124);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9b9186';
    ctx.lineWidth = 3;
    ctx.stroke();

    const buildings = [
      [-111, -48, 39, 111], [-67, -83, 42, 148], [-19, -118, 42, 183],
      [29, -92, 36, 157], [70, -58, 41, 123]
    ];
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      drawDistrictBuilding(ctx, b[0], b[1], b[2], b[3], i + 1, age, phase);
    }

    ctx.fillStyle = '#151a22';
    ctx.fillRect(-122, 65, 244, 43);
    ctx.strokeStyle = 'rgba(244,216,145,.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(-110, 86);
    ctx.lineTo(110, 86);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#080c12';
    pathRoundRect(ctx, -33, -34, 66, 62, 10);
    ctx.fill();
    ctx.strokeStyle = phase >= 3 ? '#ff8b70' : '#ffd17d';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#c9fbff';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.fillRect(side * 13 - 5, -15, 10, 8);
    }
    ctx.fillStyle = '#ffcc77';
    ctx.beginPath();
    ctx.arc(0, 11, 6 + Math.sin(age * 2.3) * 1.2, 0, TAU);
    ctx.fill();

    if (phase >= 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = 'rgba(255,193,112,.3)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.rect(-151 - i * 18, -164 - i * 12, 302 + i * 36, 299 + i * 27);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawLouseLeg(ctx, side, y, reach, lift, age, index, phase) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.lineCap = 'round';
    const flex = Math.sin(age * 1.7 + index * 1.4) * (phase >= 3 ? 10 : 5);
    ctx.strokeStyle = '#050912';
    ctx.lineWidth = 23;
    ctx.beginPath();
    ctx.moveTo(58, y);
    ctx.bezierCurveTo(104, y + lift, 134, y + lift + flex, reach, y + lift * .35 + flex);
    ctx.stroke();
    ctx.strokeStyle = '#8b713f';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = '#f5cb68';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#090d15';
    ctx.beginPath();
    ctx.moveTo(reach - 8, y + lift * .35 + flex - 9);
    ctx.lineTo(reach + 31, y + lift * .35 + flex);
    ctx.lineTo(reach - 6, y + lift * .35 + flex + 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawCrownWing(ctx, side, age, phase) {
    ctx.save();
    ctx.scale(side, 1);
    const spread = phase >= 4 ? 1.2 : (phase >= 2 ? 1 : .78);
    ctx.scale(spread, 1);
    const wing = ctx.createLinearGradient(52, -104, 226, 83);
    wing.addColorStop(0, 'rgba(213,249,235,.4)');
    wing.addColorStop(.5, 'rgba(115,206,209,.2)');
    wing.addColorStop(1, 'rgba(255,211,125,.08)');
    ctx.fillStyle = wing;
    ctx.beginPath();
    ctx.moveTo(44, -72);
    ctx.bezierCurveTo(118, -152, 218, -158, 251, -76);
    ctx.bezierCurveTo(280, -5, 219, 91, 106, 111);
    ctx.bezierCurveTo(70, 76, 64, 8, 44, -72);
    ctx.fill();
    ctx.strokeStyle = 'rgba(224,249,232,.68)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(226,240,218,.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(51, -63);
    ctx.bezierCurveTo(139, -45, 196, -15, 241, -71);
    ctx.moveTo(61, -19);
    ctx.bezierCurveTo(136, 5, 184, 54, 112, 102);
    ctx.moveTo(88, -117);
    ctx.bezierCurveTo(119, -63, 129, 24, 142, 78);
    ctx.stroke();

    ctx.globalAlpha *= .62;
    ctx.strokeStyle = phase >= 4 ? '#ffd36f' : '#a8e1d9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(128, -51, 22, 29, -.45, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(174, -90); ctx.lineTo(190, -72); ctx.lineTo(176, -55);
    ctx.moveTo(174, 33); ctx.lineTo(210, 33); ctx.moveTo(192, 17); ctx.lineTo(192, 51);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(120 + i * 20, 18 + Math.sin(i + age * .3) * 7, 4, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCrownLouse(ctx, boss) {
    const age = finite(boss.age);
    const phase = finite(boss.phase, 1);
    drawBossAura(ctx, 'rgba(255,214,104,ALPHA)', 285, phase >= 4 ? .31 : .2);
    drawCrownWing(ctx, -1, age, phase);
    drawCrownWing(ctx, 1, age, phase);

    drawLouseLeg(ctx, -1, -42, 216, -94, age, 0, phase);
    drawLouseLeg(ctx, 1, -42, 216, -94, age, 0, phase);
    drawLouseLeg(ctx, -1, 3, 235, 4, age, 1, phase);
    drawLouseLeg(ctx, 1, 3, 235, 4, age, 1, phase);
    drawLouseLeg(ctx, -1, 51, 202, 94, age, 2, phase);
    drawLouseLeg(ctx, 1, 51, 202, 94, age, 2, phase);

    const abdomen = ctx.createLinearGradient(-72, -120, 74, 151);
    abdomen.addColorStop(0, '#ccae5d');
    abdomen.addColorStop(.23, '#3b3a32');
    abdomen.addColorStop(.67, '#111722');
    abdomen.addColorStop(1, '#503b34');
    ctx.fillStyle = boss.flash > 0 ? '#ffffff' : abdomen;
    ctx.beginPath();
    ctx.moveTo(0, -121);
    ctx.bezierCurveTo(75, -111, 94, -47, 82, 42);
    ctx.bezierCurveTo(74, 114, 37, 151, 0, 167);
    ctx.bezierCurveTo(-37, 151, -74, 114, -82, 42);
    ctx.bezierCurveTo(-94, -47, -75, -111, 0, -121);
    ctx.fill();
    ctx.strokeStyle = '#f6d77e';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#0b1019';
    for (let i = 0; i < 5; i++) {
      const y = -58 + i * 42;
      ctx.beginPath();
      ctx.ellipse(0, y, 73 - i * 5, 12, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(244,202,104,.42)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = '#070b12';
    ctx.beginPath();
    ctx.moveTo(-61, -75);
    ctx.quadraticCurveTo(0, -124, 61, -75);
    ctx.lineTo(49, 8);
    ctx.quadraticCurveTo(0, 48, -49, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = phase >= 4 ? '#fff0a0' : '#e6bc59';
    ctx.lineWidth = 4;
    ctx.stroke();

    for (const side of [-1, 1]) {
      ctx.fillStyle = phase >= 3 ? '#ff9a72' : '#c9fbff';
      ctx.beginPath();
      ctx.ellipse(side * 23, -54, 8, 14, side * .16, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#071018';
      ctx.beginPath();
      ctx.ellipse(side * 23, -54, 3, 8, 0, 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = '#ffd36f';
    ctx.beginPath();
    ctx.arc(0, -12, 10 + Math.sin(age * 2.2) * 1.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e9ffff';
    ctx.beginPath();
    ctx.arc(0, -12, 3.2, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#120f13';
    ctx.strokeStyle = '#f4ce68';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-72, -102);
    ctx.lineTo(-58, -166);
    ctx.lineTo(-27, -136);
    ctx.lineTo(0, -193);
    ctx.lineTo(27, -136);
    ctx.lineTo(58, -166);
    ctx.lineTo(72, -102);
    ctx.quadraticCurveTo(0, -132, -72, -102);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (const x of [-58, 0, 58]) {
      ctx.fillStyle = phase >= 4 ? '#fff5b0' : '#ffd36f';
      ctx.beginPath();
      ctx.arc(x, x === 0 ? -193 : -166, 6, 0, TAU);
      ctx.fill();
    }

    if (phase >= 2) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(255,225,126,${phase >= 4 ? .55 : .25})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(0, -12, 111 + i * 39 + Math.sin(age * 2 + i) * 5, 149 + i * 23, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function resolveBossZone(boss, state) {
    const numeric = [
      boss && boss.zoneIndex,
      boss && boss.zone,
      state && state.zoneIndex,
      state && state.zone
    ];
    for (const value of numeric) {
      if (Number.isInteger(value) && value >= 0 && value <= 5) return value;
    }
    const key = `${boss && boss.id || ''} ${boss && boss.type || ''} ${boss && boss.name || ''}`.toLowerCase();
    if (key.includes('hundred') || key.includes('gardener')) return 1;
    if (key.includes('cathedral') || key.includes('stag')) return 2;
    if (key.includes('nine') || key.includes('throat')) return 3;
    if (key.includes('borrowed') || key.includes('district')) return 4;
    if (key.includes('crown') || key.includes('louse')) return 5;
    return 0;
  }

  function renderBackground(ctx, zoneIndex, time, progress, state) {
    if (drawAuthoredZonePlate(ctx, zoneIndex, time, progress, state)) return;
    if (zoneIndex === 0) drawLowTidePlate(ctx, time, progress, state);
    else if (zoneIndex === 1) drawHangingAcre(ctx, time, progress, state);
    else if (zoneIndex === 2) drawSpineCountry(ctx, time, progress, state);
    else if (zoneIndex === 3) drawLungSea(ctx, time, progress, state);
    else if (zoneIndex === 4) drawBorrowedCity(ctx, time, progress, state);
    else drawFirstBlue(ctx, time, progress, state);
  }

  function drawBackground(ctx, zoneIndex, time, progress, state) {
    if (!ctx || !Number.isInteger(zoneIndex) || zoneIndex < 0 || zoneIndex > 5) return false;
    activateZoneArt(zoneIndex, true);
    if (zoneIndex === 0 && !imageReady(artImages.lowTide)) return false;
    const t = finite(time);
    const p = clamp(finite(progress), 0, 1);
    const density = finite(state && (state.bulletDensity ?? state.density), 0);
    const timeTick = Math.floor(t * BACKGROUND_FPS);
    const progressTick = Math.floor(p * 240);
    const densityBucket = Math.floor(density / 20);
    let cache = backgroundCaches.get(zoneIndex);
    if (!cache) {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      cache = { canvas, ctx: canvas.getContext('2d', { alpha: false }), timeTick: -1, progressTick: -1, densityBucket: -1 };
      backgroundCaches.set(zoneIndex, cache);
    }
    if (cache.timeTick !== timeTick || cache.progressTick !== progressTick || cache.densityBucket !== densityBucket) {
      const layer = cache.ctx;
      layer.setTransform(1, 0, 0, 1, 0, 0);
      layer.globalAlpha = 1;
      layer.globalCompositeOperation = 'source-over';
      layer.clearRect(0, 0, W, H);
      layer.save();
      try {
        renderBackground(layer, zoneIndex, t, p, state);
      } finally {
        layer.restore();
      }
      cache.timeTick = timeTick;
      cache.progressTick = progressTick;
      cache.densityBucket = densityBucket;
    }
    ctx.drawImage(cache.canvas, 0, 0);
    return true;
  }

  // Coarse-pointer layouts keep the 2:3 simulation field intact, but the
  // surrounding screen is still part of the world. This cached plate extension
  // turns letterbox space into dim, tactile atmosphere without putting a blur or
  // high-resolution source crop on the hot gameplay path every frame.
  function drawBackdropAtmosphere(ctx, zoneIndex, width, height, state) {
    const reducedEffects = !!(state && state.reducedEffects);
    const time = finite(state && state.time);
    const color = BACKDROP_ATMOSPHERE_COLORS[zoneIndex];
    const profileKey = `${zoneIndex}:${width}x${height}:${reducedEffects ? 1 : 0}`;
    let profile = backdropAtmosphereProfiles.get(profileKey);
    if (!profile) {
      const count = reducedEffects ? 8 : clamp(Math.ceil(width / 70), 16, 30);
      const span = height + 180;
      const values = new Float64Array(count * 6);
      const styles = new Array(count);
      for (let i = 0; i < count; i++) {
        const seed = zoneIndex * 97 + i * 17.31;
        const offset = i * 6;
        const alpha = (reducedEffects ? .035 : .045) + hash(seed + 103) * (reducedEffects ? .035 : .08);
        values[offset] = hash(seed + 11) * width;
        values[offset + 1] = hash(seed + 47) * span;
        values[offset + 2] = (12 + hash(seed + 29) * 31) * (reducedEffects ? .48 : 1);
        values[offset + 3] = 18 + hash(seed + 71) * (zoneIndex === 3 ? 62 : 38);
        values[offset + 4] = (hash(seed + 89) - .5) * 18 + (zoneIndex - 2.5) * 2.2;
        values[offset + 5] = .6 + hash(seed + 131) * 1.4;
        styles[i] = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
      }
      profile = { count, span, direction: zoneIndex === 3 || zoneIndex === 5 ? -1 : 1, values, styles };
      backdropAtmosphereProfiles.set(profileKey, profile);
      if (backdropAtmosphereProfiles.size > 24) {
        const oldest = backdropAtmosphereProfiles.keys().next().value;
        backdropAtmosphereProfiles.delete(oldest);
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    for (let i = 0; i < profile.count; i++) {
      const offset = i * 6;
      const x = profile.values[offset];
      const y = wrap(profile.values[offset + 1] + time * profile.values[offset + 2] * profile.direction, profile.span) - 90;
      ctx.strokeStyle = profile.styles[i];
      ctx.lineWidth = profile.values[offset + 5];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + profile.values[offset + 4], y + profile.values[offset + 3] * profile.direction);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBackdrop(ctx, zoneIndex, width, height, state) {
    if (!ctx || !Number.isInteger(zoneIndex) || zoneIndex < 0 || zoneIndex > 5) return false;
    const bundle = zoneArt[zoneIndex];
    const image = ensureArtImage(bundle && bundle.plate);
    if (!imageReady(image)) return false;
    const w = Math.max(1, Math.round(finite(width, W)));
    const h = Math.max(1, Math.round(finite(height, H)));
    const key = `${zoneIndex}:${w}x${h}`;
    let cache = backdropCaches.get(key);
    if (!cache) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const layer = canvas.getContext('2d', { alpha: false });
      layer.fillStyle = '#02070b';
      layer.fillRect(0, 0, w, h);

      // Scale by height so the authored vertical journey remains recognizable.
      // Wide screens receive reflected continuation panels rather than one
      // brutally enlarged center crop.
      const tileWidth = Math.max(1, h * image.naturalWidth / image.naturalHeight);
      const centerX = (w - tileWidth) * .5;
      const drawTile = (x, mirror) => {
        layer.save();
        if (mirror) {
          layer.translate(x + tileWidth, 0);
          layer.scale(-1, 1);
          layer.drawImage(image, 0, 0, tileWidth, h);
        } else {
          layer.drawImage(image, x, 0, tileWidth, h);
        }
        layer.restore();
      };
      drawTile(centerX, false);
      for (let step = 1; centerX - step * tileWidth > -tileWidth; step++) drawTile(centerX - step * tileWidth, step % 2 === 1);
      for (let step = 1; centerX + step * tileWidth < w; step++) drawTile(centerX + step * tileWidth, step % 2 === 1);

      layer.fillStyle = 'rgba(1,7,12,.58)';
      layer.fillRect(0, 0, w, h);
      const vignette = layer.createRadialGradient(w * .5, h * .48, Math.min(w, h) * .08, w * .5, h * .48, Math.max(w, h) * .68);
      vignette.addColorStop(0, 'rgba(6,22,28,.04)');
      vignette.addColorStop(.52, 'rgba(2,9,14,.2)');
      vignette.addColorStop(1, 'rgba(0,3,7,.76)');
      layer.fillStyle = vignette;
      layer.fillRect(0, 0, w, h);
      cache = canvas;
      backdropCaches.set(key, cache);

      // A device normally has only one portrait and one landscape cache. Keep
      // resize thrashing from growing this forever in browser devtools.
      if (backdropCaches.size > 18) {
        const oldest = backdropCaches.keys().next().value;
        backdropCaches.delete(oldest);
      }
    }
    ctx.drawImage(cache, 0, 0, width, height);
    drawBackdropAtmosphere(ctx, zoneIndex, w, h, state);
    return true;
  }

  function drawBoss(ctx, boss, state) {
    if (!ctx || !boss) return false;
    const zone = resolveBossZone(boss, state);
    if (zone < 0 || zone > 5) return false;
    const x = finite(boss.x, W * .5);
    const y = finite(boss.y, 210);
    const age = finite(boss.age);
    const pulse = 1 + Math.sin(age * 1.7) * .014;
    const hitPulse = normalizedPulse(boss.hitPulse, .15);
    const firePulse = normalizedPulse(boss.firePulse);
    const bracePulse = attackBrace(boss);
    const shieldPulse = normalizedPulse(boss.shieldPulse);
    const reducedEffects = !!(state && state.reducedEffects);
    const responseSide = hash(zone * 131 + Math.round(finite(boss.phase, 1)) * 59 + 2801) > .5 ? 1 : -1;

    ctx.save();
    try {
      ctx.translate(x, y - bracePulse * 1.5 - firePulse * 3.2);
      ctx.globalAlpha *= bossAlpha(boss, state);
      ctx.rotate(responseSide * (hitPulse * .018 + firePulse * .006));
      ctx.scale(
        pulse * (1 + hitPulse * .04 + bracePulse * .028 + firePulse * .02),
        pulse * (1 - hitPulse * .055 - bracePulse * .034 - firePulse * .045)
      );
      if (boss.flash > 0) {
        ctx.shadowBlur = 28;
        ctx.shadowColor = '#ffffff';
      }
      if (zone === 0) {
        if (!drawTrawlmotherAsset(ctx, boss, state)) return false;
      }
      else if (!drawAuthoredBossAsset(ctx, boss, zone, state)) {
        if (zone === 1) drawHundredHandGardener(ctx, boss);
        else if (zone === 2) drawCathedralStag(ctx, boss);
        else if (zone === 3) drawNineThroats(ctx, boss);
        else if (zone === 4) drawBorrowedCityBoss(ctx, boss);
        else drawCrownLouse(ctx, boss);
      }

      if (shieldPulse > 0) {
        const footprint = getBossVisualFootprint(boss);
        if (footprint) {
          const travel = ease(1 - shieldPulse);
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.strokeStyle = 'rgba(210,251,255,' + shieldPulse * .72 + ')';
          ctx.lineWidth = 1.2 + shieldPulse * (reducedEffects ? 2 : 4);
          ctx.beginPath();
          ctx.ellipse(
            0,
            footprint.offsetY,
            footprint.width * lerp(.34, .62, travel),
            footprint.height * lerp(.24, .48, travel),
            0,
            0,
            TAU
          );
          ctx.stroke();
          ctx.restore();
        }
      }
    } finally {
      ctx.restore();
    }
    return true;
  }

  window.RAIN_ART = Object.freeze({
    drawBackground,
    drawBackdrop,
    drawBoss,
    drawFieldEnemyLocal,
    drawPlayer: drawPetrel,
    getBossVisualFootprint,
    getFieldEnemyVisualFootprint,
    zoneArtReady,
    decodeZoneArt
  });
})();
