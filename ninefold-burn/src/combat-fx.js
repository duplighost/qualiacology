import * as THREE from 'three';

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const LOCAL_FORWARD = new THREE.Vector3(0, 0, -1);
const LOCAL_REAR = new THREE.Vector3(0, 0, 1);
const LOCAL_AXIS_Y = new THREE.Vector3(0, 1, 0);
const LOCAL_AXIS_Z = new THREE.Vector3(0, 0, 1);
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const saturate = (value) => clamp(value, 0, 1);
const easeOutCubic = (value) => 1 - ((1 - value) ** 3);

function hash32(value) {
  const string = String(value ?? 'combat-fx');
  let hash = 2166136261;
  for (let index = 0; index < string.length; index += 1) {
    hash ^= string.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function hashUnit(value) {
  return hash32(value) / 0xffffffff;
}

function setColor(target, value, fallback = 0x62f6ff) {
  if (value?.isColor) target.copy(value);
  else target.set(value ?? fallback);
  return target;
}

function resolveWorldPosition(value, target) {
  if (value?.isObject3D) {
    value.updateWorldMatrix(true, false);
    return value.getWorldPosition(target);
  }
  if (value?.isVector3) return target.copy(value);
  if (Array.isArray(value)) return target.set(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
  if (value && Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z)) {
    return target.set(value.x, value.y, value.z);
  }
  return target.set(0, 0, 0);
}

function makeRadialTexture(size = 48) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = ((x + 0.5) / size) * 2 - 1;
      const ny = ((y + 0.5) / size) * 2 - 1;
      const radius = Math.sqrt(nx * nx + ny * ny);
      const falloff = Math.pow(Math.max(0, 1 - radius), 2.35);
      const offset = (y * size + x) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(falloff * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = 'combat-soft-disc';
  texture.needsUpdate = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function makeBoltMaterial(color, halo = false) {
  return new THREE.ShaderMaterial({
    name: halo ? 'combat-bolt-halo' : 'combat-bolt-core',
    uniforms: {
      color: { value: new THREE.Color(color) },
      opacity: { value: halo ? 0.24 : 1 },
      phase: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      uniform float phase;
      varying vec2 vUv;
      void main() {
        float nose = smoothstep(0.0, 0.2, vUv.y);
        float tail = 1.0 - smoothstep(0.76, 1.0, vUv.y);
        float longitudinal = max(0.035, nose * tail);
        float filament = 0.84 + 0.16 * sin(vUv.y * 28.0 - phase * 16.0);
        float alpha = longitudinal * filament * opacity;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

function makeShieldMaterial(color) {
  return new THREE.ShaderMaterial({
    name: 'combat-target-shield-hit',
    uniforms: {
      color: { value: new THREE.Color(color) },
      opacity: { value: 0 },
      impactDirection: { value: new THREE.Vector3(0, 0, 1) },
      wave: { value: 1 },
    },
    vertexShader: `
      varying vec3 vLocal;
      varying vec3 vViewNormal;
      varying vec3 vViewPosition;
      void main() {
        vLocal = position;
        vViewNormal = normalize(normalMatrix * normal);
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      uniform vec3 impactDirection;
      uniform float wave;
      varying vec3 vLocal;
      varying vec3 vViewNormal;
      varying vec3 vViewPosition;
      void main() {
        vec3 localDirection = normalize(vLocal);
        float cameraRim = pow(1.0 - abs(dot(normalize(vViewNormal), normalize(-vViewPosition))), 2.4);
        float facingImpact = dot(localDirection, normalize(impactDirection));
        float shockRing = exp(-pow((facingImpact - wave) * 12.0, 2.0));
        float impactCap = pow(max(0.0, facingImpact), 12.0);
        float alpha = (cameraRim * 0.38 + shockRing * 0.9 + impactCap * 0.72) * opacity;
        gl_FragColor = vec4(color * (1.15 + shockRing * 0.75), alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

function makeFractureGeometry() {
  const positions = [];
  const branchCount = 13;
  for (let branch = 0; branch < branchCount; branch += 1) {
    const angle = branch * GOLDEN_ANGLE;
    const reach = 0.72 + (branch % 4) * 0.11;
    let previousX = 0;
    let previousY = 0;
    for (let step = 1; step <= 3; step += 1) {
      const progress = step / 3;
      const bend = Math.sin((branch + 1) * (step + 0.7)) * 0.095;
      const x = Math.cos(angle + bend) * reach * progress;
      const y = Math.sin(angle + bend) * reach * progress;
      positions.push(previousX, previousY, 0, x, y, 0);
      if (step === 2 && branch % 2 === 0) {
        const forkAngle = angle + (branch % 4 < 2 ? 0.48 : -0.48);
        positions.push(
          x,
          y,
          0,
          x + Math.cos(forkAngle) * reach * 0.26,
          y + Math.sin(forkAngle) * reach * 0.26,
          0,
        );
      }
      previousX = x;
      previousY = y;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function quadraticBezier(target, start, control, end, t) {
  const inverse = 1 - t;
  return target.copy(start).multiplyScalar(inverse * inverse)
    .addScaledVector(control, 2 * inverse * t)
    .addScaledVector(end, t * t);
}

function quadraticTangent(target, start, control, end, t) {
  const inverse = 1 - t;
  return target.set(
    2 * (inverse * (control.x - start.x) + t * (end.x - control.x)),
    2 * (inverse * (control.y - start.y) + t * (end.y - control.y)),
    2 * (inverse * (control.z - start.z) + t * (end.z - control.z)),
  ).normalize();
}

/**
 * Pooled, deterministic combat presentation for the space legs.
 *
 * Supported construction forms:
 *   new CombatFX(scene, playerVehicleOrWorldRoot)
 *   new CombatFX({ scene, root, player })
 *
 * If `root` is a world container, the player is found by the name
 * `player-vehicle`. Effects that travel through space live directly under the
 * scene so their coordinates remain world-space; shield and engine feedback
 * are deliberately parented to their targets.
 */
export class CombatFX {
  constructor(sceneOrOptions, rootArgument = null) {
    const options = sceneOrOptions?.scene
      ? sceneOrOptions
      : { scene: sceneOrOptions, root: rootArgument };
    if (!options.scene?.isObject3D) throw new TypeError('CombatFX requires a Three.js scene/root Object3D.');

    this.scene = options.scene;
    this.root = options.root ?? rootArgument ?? options.scene;
    this.playerRoot = options.player
      ?? (this.root?.name === 'player-vehicle' ? this.root : this.root?.getObjectByName?.('player-vehicle'))
      ?? this.root;
    this.fxRoot = new THREE.Group();
    this.fxRoot.name = 'combat-fx-world-space';
    this.scene.add(this.fxRoot);

    this._clock = 0;
    this._shotSequence = 0;
    this._disposed = false;
    this._materials = new Set();
    this._geometries = new Set();
    this._textures = new Set();
    this._stats = {
      playerSalvos: 0,
      playerBolts: 0,
      rivalShots: 0,
      confirmedHits: 0,
      misses: 0,
      returnSignals: 0,
      enginePulses: 0,
      poolSteals: 0,
    };

    this._softDisc = this._trackTexture(makeRadialTexture());
    this._boltGeometry = this._trackGeometry(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true));
    this._shieldGeometry = this._trackGeometry(new THREE.SphereGeometry(2.9, 24, 16));
    this._fractureGeometry = this._trackGeometry(makeFractureGeometry());
    this._ringGeometry = this._trackGeometry(new THREE.RingGeometry(0.58, 0.78, 32));
    // The return payoff belongs at the nozzle, not around the whole vehicle.
    // Keeping this geometry compact also prevents a camera-near pulse from
    // ballooning across the lower third of the screen at rocket speeds.
    this._engineRingGeometry = this._trackGeometry(new THREE.TorusGeometry(0.43, 0.042, 8, 32));

    this._bolts = Array.from({ length: 24 }, (_, index) => this._makeBolt(index));
    this._muzzles = Array.from({ length: 8 }, (_, index) => this._makeMuzzle(index));
    this._hits = Array.from({ length: 8 }, (_, index) => this._makeHit(index));
    this._returns = Array.from({ length: 5 }, (_, index) => this._makeReturn(index));
    this._enginePulses = Array.from({ length: 5 }, (_, index) => this._makeEnginePulse(index));

    this._v0 = new THREE.Vector3();
    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._v3 = new THREE.Vector3();
    this._q0 = new THREE.Quaternion();
  }

  _trackMaterial(material) {
    this._materials.add(material);
    return material;
  }

  _trackGeometry(geometry) {
    this._geometries.add(geometry);
    return geometry;
  }

  _trackTexture(texture) {
    this._textures.add(texture);
    return texture;
  }

  _makeSpriteMaterial(color, opacity = 1) {
    return this._trackMaterial(new THREE.SpriteMaterial({
      color,
      map: this._softDisc,
      opacity,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    }));
  }

  _makeBolt(index) {
    const group = new THREE.Group();
    group.name = `combat-bolt-${index}`;
    group.visible = false;
    const coreMaterial = this._trackMaterial(makeBoltMaterial(0xffffff, false));
    const haloMaterial = this._trackMaterial(makeBoltMaterial(0x62f6ff, true));
    const core = new THREE.Mesh(this._boltGeometry, coreMaterial);
    const halo = new THREE.Mesh(this._boltGeometry, haloMaterial);
    core.scale.set(0.045, 1, 0.045);
    halo.scale.set(0.16, 1, 0.16);
    core.renderOrder = 8;
    halo.renderOrder = 7;
    group.add(halo, core);
    const headMaterial = this._makeSpriteMaterial(0xffffff, 1);
    const head = new THREE.Sprite(headMaterial);
    head.renderOrder = 9;
    head.scale.setScalar(0.72);
    group.add(head);
    this.fxRoot.add(group);
    return {
      index,
      active: false,
      group,
      core,
      halo,
      head,
      coreMaterial,
      haloMaterial,
      headMaterial,
      color: new THREE.Color(),
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
      current: new THREE.Vector3(),
      previous: new THREE.Vector3(),
      direction: new THREE.Vector3(0, 0, -1),
      control: new THREE.Vector3(),
      pathDirection: new THREE.Vector3(0, 0, -1),
      curveRight: new THREE.Vector3(1, 0, 0),
      curveUp: new THREE.Vector3(0, 1, 0),
      targetOffsetLocal: new THREE.Vector3(),
      target: null,
      targetId: null,
      externalShotId: null,
      hit: false,
      triggerImpact: false,
      returnToPlayer: true,
      team: 'player',
      age: 0,
      duration: 0.3,
      trailLength: 6,
      pathLength: 1,
      curveMagnitude: 0,
      curveLift: 0,
      curveSide: 1,
      startedAt: 0,
    };
  }

  _makeMuzzle(index) {
    const group = new THREE.Group();
    group.name = `combat-muzzle-${index}`;
    group.visible = false;
    const materials = [this._makeSpriteMaterial(0xffffff), this._makeSpriteMaterial(0xffffff)];
    const flares = materials.map((material) => {
      const flare = new THREE.Sprite(material);
      flare.renderOrder = 11;
      group.add(flare);
      return flare;
    });
    this.fxRoot.add(group);
    return {
      index,
      active: false,
      group,
      flares,
      materials,
      age: 0,
      duration: 0.095,
      count: 2,
      startedAt: 0,
    };
  }

  _makeHit(index) {
    const group = new THREE.Group();
    group.name = `combat-target-hit-${index}`;
    group.visible = false;
    const shellMaterial = this._trackMaterial(makeShieldMaterial(0x62f6ff));
    const shell = new THREE.Mesh(this._shieldGeometry, shellMaterial);
    shell.renderOrder = 6;
    group.add(shell);

    const fracturePivot = new THREE.Group();
    group.add(fracturePivot);
    const fractureMaterial = this._trackMaterial(new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    }));
    const fractures = new THREE.LineSegments(this._fractureGeometry, fractureMaterial);
    fractures.renderOrder = 10;
    fracturePivot.add(fractures);
    const ringMaterial = this._trackMaterial(new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }));
    const ring = new THREE.Mesh(this._ringGeometry, ringMaterial);
    ring.renderOrder = 10;
    fracturePivot.add(ring);

    const sparkPositions = new Float32Array(18 * 3);
    const sparkGeometry = this._trackGeometry(new THREE.BufferGeometry());
    const sparkAttribute = new THREE.BufferAttribute(sparkPositions, 3);
    sparkAttribute.setUsage(THREE.DynamicDrawUsage);
    sparkGeometry.setAttribute('position', sparkAttribute);
    const sparkMaterial = this._trackMaterial(new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.34,
      map: this._softDisc,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false,
    }));
    const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
    sparks.renderOrder = 12;
    group.add(sparks);
    return {
      index,
      active: false,
      group,
      shell,
      shellMaterial,
      fracturePivot,
      fractureMaterial,
      fractures,
      ring,
      ringMaterial,
      sparks,
      sparkGeometry,
      sparkMaterial,
      sparkPositions,
      sparkOrigin: new THREE.Vector3(),
      sparkVelocities: Array.from({ length: 18 }, () => new THREE.Vector3()),
      localNormal: new THREE.Vector3(0, 0, 1),
      target: null,
      externalShotId: null,
      age: 0,
      duration: 0.46,
      startedAt: 0,
    };
  }

  _makeReturn(index) {
    const group = new THREE.Group();
    group.name = `combat-return-signal-${index}`;
    group.visible = false;
    const positions = new Float32Array(12 * 3);
    const geometry = this._trackGeometry(new THREE.BufferGeometry());
    const attribute = new THREE.BufferAttribute(positions, 3);
    attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', attribute);
    const lineMaterial = this._trackMaterial(new THREE.LineBasicMaterial({
      color: 0x62f6ff,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    }));
    const line = new THREE.Line(geometry, lineMaterial);
    line.frustumCulled = false;
    line.renderOrder = 8;
    group.add(line);
    const headMaterial = this._makeSpriteMaterial(0xffffff, 1);
    const head = new THREE.Sprite(headMaterial);
    head.scale.setScalar(0.84);
    head.renderOrder = 10;
    group.add(head);
    this.fxRoot.add(group);
    return {
      index,
      active: false,
      group,
      geometry,
      positions,
      line,
      lineMaterial,
      head,
      headMaterial,
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
      control: new THREE.Vector3(),
      current: new THREE.Vector3(),
      age: 0,
      duration: 0.34,
      pulseTriggered: false,
      phaseSide: 1,
      startedAt: 0,
    };
  }

  _makeEnginePulse(index) {
    const group = new THREE.Group();
    group.name = `combat-engine-return-pulse-${index}`;
    group.visible = false;
    const outerMaterial = this._trackMaterial(new THREE.MeshBasicMaterial({
      color: 0x62f6ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    }));
    const innerMaterial = outerMaterial.clone();
    this._trackMaterial(innerMaterial);
    const outer = new THREE.Mesh(this._engineRingGeometry, outerMaterial);
    const inner = new THREE.Mesh(this._engineRingGeometry, innerMaterial);
    inner.scale.setScalar(0.68);
    outer.renderOrder = 12;
    inner.renderOrder = 12;
    group.add(outer, inner);
    const coreMaterial = this._makeSpriteMaterial(0xffffff, 0);
    const core = new THREE.Sprite(coreMaterial);
    core.scale.setScalar(0.42);
    core.renderOrder = 13;
    group.add(core);
    return {
      index,
      active: false,
      group,
      outer,
      inner,
      outerMaterial,
      innerMaterial,
      core,
      coreMaterial,
      age: 0,
      duration: 0.27,
      startedAt: 0,
    };
  }

  _acquire(pool, deactivate) {
    let record = pool.find((candidate) => !candidate.active);
    if (!record) {
      record = pool.reduce((oldest, candidate) => (
        candidate.startedAt < oldest.startedAt ? candidate : oldest
      ));
      deactivate.call(this, record);
      this._stats.poolSteals += 1;
    }
    record.active = true;
    record.startedAt = this._clock;
    return record;
  }

  _resolvePlayerRoot() {
    if (this.playerRoot?.name === 'player-vehicle') return this.playerRoot;
    const found = this.root?.getObjectByName?.('player-vehicle');
    if (found) this.playerRoot = found;
    return this.playerRoot;
  }

  _playerMuzzles(targetPosition) {
    const player = this._resolvePlayerRoot();
    if (!player?.isObject3D) {
      return [new THREE.Vector3(-1.5, 0.1, -2.2), new THREE.Vector3(1.5, 0.1, -2.2)];
    }
    player.updateWorldMatrix(true, true);
    const pods = player.userData?.gunPods;
    if (Array.isArray(pods) && pods.length >= 2) {
      return pods.slice(0, 2).map((pod) => {
        pod.updateWorldMatrix(true, false);
        const positive = pod.localToWorld(new THREE.Vector3(0, 1.16, 0));
        const negative = pod.localToWorld(new THREE.Vector3(0, -1.16, 0));
        return positive.distanceToSquared(targetPosition) < negative.distanceToSquared(targetPosition)
          ? positive
          : negative;
      });
    }
    return [-1, 1].map((side) => player.localToWorld(new THREE.Vector3(side * 1.62, 0.14, -2.35)));
  }

  _sourceMuzzle(source, targetPosition, alternate = 0) {
    if (!source?.isObject3D) return resolveWorldPosition(source, new THREE.Vector3());
    source.updateWorldMatrix(true, true);
    const pods = source.userData?.gunPods;
    if (Array.isArray(pods) && pods.length) {
      const pod = pods[Math.abs(alternate) % pods.length];
      const positive = pod.localToWorld(new THREE.Vector3(0, 1.16, 0));
      const negative = pod.localToWorld(new THREE.Vector3(0, -1.16, 0));
      return positive.distanceToSquared(targetPosition) < negative.distanceToSquared(targetPosition)
        ? positive
        : negative;
    }
    return source.localToWorld(new THREE.Vector3((alternate % 2 ? 1 : -1) * 1.25, 0.12, -2.1));
  }

  _targetWorldPoint(target, localOffset, output) {
    if (!target?.isObject3D) return resolveWorldPosition(target, output);
    target.updateWorldMatrix(true, false);
    output.copy(localOffset);
    return target.localToWorld(output);
  }

  _spawnMuzzle(positions, direction, color, time, count = positions.length) {
    const record = this._acquire(this._muzzles, this._deactivateMuzzle);
    record.age = 0;
    record.startedAt = Number.isFinite(time) ? time : this._clock;
    record.count = clamp(count, 1, 2);
    for (let index = 0; index < record.flares.length; index += 1) {
      const visible = index < record.count;
      const flare = record.flares[index];
      flare.visible = visible;
      if (!visible) continue;
      flare.position.copy(positions[index] ?? positions[0]);
      flare.position.addScaledVector(direction, 0.18);
      flare.scale.setScalar(0.72);
      setColor(record.materials[index].color, color);
      record.materials[index].opacity = 1;
    }
    record.group.visible = true;
    return record;
  }

  _configureRivalBoltPath(record) {
    record.pathDirection.copy(record.end).sub(record.start);
    const distance = record.pathDirection.length();
    if (distance < 0.0001) record.pathDirection.copy(LOCAL_FORWARD);
    else record.pathDirection.multiplyScalar(1 / distance);

    record.curveRight.crossVectors(record.pathDirection, WORLD_UP);
    if (record.curveRight.lengthSq() < 0.0001) record.curveRight.set(1, 0, 0);
    else record.curveRight.normalize();
    record.curveUp.crossVectors(record.curveRight, record.pathDirection);
    if (record.curveUp.lengthSq() < 0.0001) record.curveUp.copy(WORLD_UP);
    else record.curveUp.normalize();

    record.control.lerpVectors(record.start, record.end, 0.5)
      .addScaledVector(record.curveRight, record.curveSide * record.curveMagnitude)
      .addScaledVector(record.curveUp, record.curveLift);
    const controlPolygonLength = record.start.distanceTo(record.control)
      + record.control.distanceTo(record.end);
    record.pathLength = Math.max(distance, controlPolygonLength * 0.82);
  }

  _spawnBolt({
    start,
    end,
    color,
    target = null,
    targetId = null,
    externalShotId = null,
    targetOffsetLocal = null,
    hit = false,
    triggerImpact = false,
    returnToPlayer = true,
    durationOverride = null,
    team = 'player',
    curveSide = 1,
    time,
  }) {
    const record = this._acquire(this._bolts, this._deactivateBolt);
    record.age = 0;
    record.startedAt = Number.isFinite(time) ? time : this._clock;
    record.start.copy(start);
    record.end.copy(end);
    record.previous.copy(start);
    record.current.copy(start);
    record.target = target?.isObject3D ? target : null;
    record.targetId = targetId;
    record.externalShotId = externalShotId;
    record.targetOffsetLocal.copy(targetOffsetLocal ?? this._v0.set(0, 0, 0));
    record.hit = Boolean(hit);
    record.triggerImpact = Boolean(triggerImpact);
    record.returnToPlayer = Boolean(returnToPlayer);
    record.team = team;
    setColor(record.color, color, team === 'rival' ? 0xff4c76 : 0x62f6ff);
    const distance = Math.max(1, record.start.distanceTo(record.end));
    const speed = team === 'rival' ? 720 : 850;
    record.duration = Number.isFinite(durationOverride)
      ? clamp(durationOverride, 0.105, 0.72)
      : clamp(distance / speed, 0.105, hit ? 0.46 : 0.62);
    record.trailLength = clamp(distance * 0.075, team === 'rival' ? 7.2 : 6.5, 18);
    record.curveSide = Math.sign(curveSide) || 1;
    record.curveMagnitude = team === 'rival' ? clamp(distance * 0.145, 10, 24) : 0;
    record.curveLift = team === 'rival' ? clamp(distance * 0.04, 3.2, 7.5) : 0;
    record.pathLength = distance;
    if (team === 'rival') this._configureRivalBoltPath(record);
    setColor(record.coreMaterial.uniforms.color.value, 0xffffff);
    setColor(record.haloMaterial.uniforms.color.value, record.color);
    setColor(record.headMaterial.color, record.color);
    record.headMaterial.depthTest = team !== 'rival';
    record.headMaterial.opacity = 1;
    record.head.renderOrder = team === 'rival' ? 13 : 9;
    record.group.visible = true;
    this._updateBoltVisual(record, 0);
    return record;
  }

  _updateBoltVisual(record, progress) {
    if (record.hit && record.target?.isObject3D) {
      this._targetWorldPoint(record.target, record.targetOffsetLocal, record.end);
    }
    record.previous.copy(record.current);
    if (record.team === 'rival') {
      this._configureRivalBoltPath(record);
      quadraticBezier(record.current, record.start, record.control, record.end, progress);
      quadraticTangent(record.direction, record.start, record.control, record.end, progress);
    } else {
      record.current.lerpVectors(record.start, record.end, progress);
      record.direction.copy(record.end).sub(record.start).normalize();
    }
    const distanceTravelled = record.team === 'rival'
      ? record.pathLength * progress
      : record.start.distanceTo(record.current);
    const liveTrail = Math.min(record.trailLength, Math.max(0.18, distanceTravelled));
    record.group.position.copy(record.current).addScaledVector(record.direction, -liveTrail * 0.5);
    record.group.quaternion.setFromUnitVectors(LOCAL_AXIS_Y, record.direction);
    const proximity = progress * progress;
    const coreRadius = record.team === 'rival' ? 0.074 + proximity * 0.01 : 0.062;
    const haloRadius = record.team === 'rival' ? 0.25 + proximity * 0.045 : 0.21;
    record.core.scale.set(coreRadius, liveTrail, coreRadius);
    record.halo.scale.set(haloRadius, liveTrail, haloRadius);
    record.head.position.set(0, liveTrail * 0.5, 0);
    const headScale = record.team === 'rival'
      ? 0.82 + Math.sin(progress * Math.PI) * 0.28 + proximity * 0.18
      : 0.76 * (0.82 + Math.sin(progress * Math.PI) * 0.22);
    record.head.scale.setScalar(headScale);
    record.coreMaterial.uniforms.phase.value = this._clock;
    record.haloMaterial.uniforms.phase.value = this._clock + 0.7;
    record.coreMaterial.uniforms.opacity.value = record.team === 'rival' ? 1 : 0.98;
    record.haloMaterial.uniforms.opacity.value = record.team === 'rival' ? 0.34 + proximity * 0.06 : 0.27;
    record.headMaterial.opacity = record.team === 'rival' ? 0.92 + proximity * 0.08 : 1;
  }

  /** Launch a deterministic dual-gun player salvo. */
  firePlayer({ target, targetId = 'target', hit = false, color = 0x62f6ff, time = this._clock } = {}) {
    if (this._disposed || !target) return null;
    const targetPosition = resolveWorldPosition(target, new THREE.Vector3());
    const muzzles = this._playerMuzzles(targetPosition);
    const averageMuzzle = muzzles[0].clone().add(muzzles[1]).multiplyScalar(0.5);
    const forward = targetPosition.clone().sub(averageMuzzle).normalize();
    const right = new THREE.Vector3().crossVectors(forward, WORLD_UP);
    if (right.lengthSq() < 0.0001) right.set(1, 0, 0);
    else right.normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();
    const sequence = ++this._shotSequence;
    const seed = hash32(`${targetId}:${sequence}`);

    this._spawnMuzzle(muzzles, forward, color, time, 2);
    this._stats.playerSalvos += 1;
    this._stats.playerBolts += 2;
    if (!hit) this._stats.misses += 1;

    for (let index = 0; index < 2; index += 1) {
      const side = index === 0 ? -1 : 1;
      const targetOffsetLocal = new THREE.Vector3(side * 0.42, 0.12 + index * 0.11, 1.84);
      let end;
      if (hit && target?.isObject3D) {
        end = this._targetWorldPoint(target, targetOffsetLocal, new THREE.Vector3());
      } else if (hit) {
        end = targetPosition.clone().addScaledVector(right, side * 0.22);
      } else {
        const missSide = (seed & 1) === 0 ? -1 : 1;
        const lateralMiss = 3.7 + hashUnit(seed ^ 0x3d6e) * 2.2;
        const verticalMiss = (hashUnit(seed ^ 0x9a31) - 0.5) * 2.4;
        const passPoint = targetPosition.clone()
          .addScaledVector(right, missSide * lateralMiss + side * 0.22)
          .addScaledVector(up, verticalMiss);
        const passDirection = passPoint.clone().sub(muzzles[index]).normalize();
        end = passPoint.addScaledVector(passDirection, 150 + hashUnit(seed ^ index) * 54);
      }
      this._spawnBolt({
        start: muzzles[index],
        end,
        color,
        target,
        targetId,
        targetOffsetLocal,
        hit,
        triggerImpact: hit && index === 0,
        team: 'player',
        time,
      });
    }

    return { salvoId: sequence, targetId, hit: Boolean(hit), boltCount: 2 };
  }

  /** Render a resolved rival shot: impact, trusted dodge, or visible whiff. */
  fireRival({
    source,
    target = null,
    targetPosition,
    shotId = null,
    hit = false,
    aimed = false,
    dodged = false,
    missSide = 1,
    travelTime = null,
    color = 0xff4c76,
    time = this._clock,
  } = {}) {
    if (this._disposed || !source || !targetPosition) return null;
    const targetWorld = resolveWorldPosition(targetPosition, new THREE.Vector3());
    const sequence = ++this._shotSequence;
    const start = this._sourceMuzzle(source, targetWorld, sequence);
    const direction = targetWorld.clone().sub(start).normalize();
    const right = new THREE.Vector3().crossVectors(direction, WORLD_UP);
    if (right.lengthSq() < 0.0001) right.set(1, 0, 0);
    else right.normalize();
    const side = Math.sign(missSide) || 1;
    // A telegraphed bolt must arrive at its authored aim point exactly when
    // the simulation resolves the shot. Extending an aimed bolt past the
    // player made it cross the cockpit early and then triggered a detached
    // shield flash later, which looked like fake combat even though the event
    // counters were correct.
    const end = (hit || aimed)
      ? targetWorld.clone()
      : targetWorld.clone()
        .addScaledVector(right, side * (dodged ? 5.8 : 3.9))
        .addScaledVector(direction, 92);
    this._spawnMuzzle([start], direction, color, time, 1);
    const bolt = this._spawnBolt({
      start,
      end,
      color,
      target: hit ? target : null,
      targetId: hit ? 'player' : `rival-miss-${sequence}`,
      externalShotId: shotId,
      targetOffsetLocal: hit ? new THREE.Vector3(0, 0.16, 1.2) : null,
      hit,
      triggerImpact: hit,
      returnToPlayer: false,
      durationOverride: travelTime,
      team: 'rival',
      curveSide: side,
      time,
    });
    this._stats.rivalShots += 1;
    return {
      shotId: sequence,
      externalShotId: shotId,
      boltIndex: bolt.index,
      hit: Boolean(hit),
      dodged: Boolean(dodged),
    };
  }

  /** Attach a compact shield fracture and spark fan directly to a target. */
  hitTarget(target, {
    color = 0x62f6ff,
    time = this._clock,
    worldPoint = null,
    incoming = null,
    seed = null,
    returnToPlayer = true,
    externalShotId = null,
  } = {}) {
    if (this._disposed || !target?.isObject3D) return null;
    const record = this._acquire(this._hits, this._deactivateHit);
    if (record.group.parent) record.group.removeFromParent();
    target.add(record.group);
    record.group.visible = true;
    record.group.position.set(0, 0, 0);
    record.group.rotation.set(0, 0, 0);
    record.group.scale.setScalar(1);
    record.target = target;
    record.externalShotId = externalShotId;
    record.age = 0;
    record.startedAt = Number.isFinite(time) ? time : this._clock;

    target.updateWorldMatrix(true, false);
    if (incoming?.isVector3 && incoming.lengthSq() > 0.0001) {
      target.getWorldQuaternion(this._q0).invert();
      record.localNormal.copy(incoming).normalize().negate().applyQuaternion(this._q0).normalize();
    } else if (worldPoint) {
      record.localNormal.copy(resolveWorldPosition(worldPoint, this._v0));
      target.worldToLocal(record.localNormal);
      if (record.localNormal.lengthSq() < 0.0001) record.localNormal.copy(LOCAL_REAR);
      else record.localNormal.normalize();
    } else {
      record.localNormal.copy(LOCAL_REAR);
    }

    const effectColor = new THREE.Color();
    setColor(effectColor, color);
    setColor(record.shellMaterial.uniforms.color.value, effectColor);
    record.shellMaterial.uniforms.opacity.value = 1;
    record.shellMaterial.uniforms.wave.value = 0.98;
    record.shellMaterial.uniforms.impactDirection.value.copy(record.localNormal);
    setColor(record.fractureMaterial.color, effectColor);
    record.fractureMaterial.opacity = 1;
    setColor(record.ringMaterial.color, effectColor);
    record.ringMaterial.opacity = 1;
    setColor(record.sparkMaterial.color, effectColor);
    record.sparkMaterial.opacity = 1;

    record.fracturePivot.position.copy(record.localNormal).multiplyScalar(2.52);
    record.fracturePivot.quaternion.setFromUnitVectors(LOCAL_AXIS_Z, record.localNormal);
    record.fracturePivot.scale.setScalar(0.42);
    record.ring.scale.setScalar(0.5);
    record.sparkOrigin.copy(record.localNormal).multiplyScalar(2.48);

    const basisA = this._v1.crossVectors(record.localNormal, WORLD_UP);
    if (basisA.lengthSq() < 0.0001) basisA.set(1, 0, 0);
    else basisA.normalize();
    const basisB = this._v2.crossVectors(record.localNormal, basisA).normalize();
    const effectSeed = hash32(seed ?? `${target.uuid}:${this._shotSequence}`);
    for (let index = 0; index < record.sparkVelocities.length; index += 1) {
      const angle = index * GOLDEN_ANGLE + hashUnit(effectSeed ^ index) * 0.28;
      const tangentSpeed = 3.4 + (index % 5) * 0.62;
      const normalSpeed = 2.8 + ((index * 7) % 9) * 0.42;
      record.sparkVelocities[index].copy(record.localNormal).multiplyScalar(normalSpeed)
        .addScaledVector(basisA, Math.cos(angle) * tangentSpeed)
        .addScaledVector(basisB, Math.sin(angle) * tangentSpeed);
      const offset = index * 3;
      record.sparkPositions[offset] = record.sparkOrigin.x;
      record.sparkPositions[offset + 1] = record.sparkOrigin.y;
      record.sparkPositions[offset + 2] = record.sparkOrigin.z;
    }
    record.sparkGeometry.attributes.position.needsUpdate = true;
    this._stats.confirmedHits += 1;

    let impactWorld;
    if (worldPoint) impactWorld = resolveWorldPosition(worldPoint, new THREE.Vector3());
    else impactWorld = target.localToWorld(record.sparkOrigin.clone());
    if (returnToPlayer) this._spawnReturn(impactWorld, effectColor, time, effectSeed);
    return { hitIndex: record.index, target, worldPoint: impactWorld.clone() };
  }

  _spawnReturn(worldStart, color, time, seed) {
    const record = this._acquire(this._returns, this._deactivateReturn);
    record.age = 0;
    record.startedAt = Number.isFinite(time) ? time : this._clock;
    record.pulseTriggered = false;
    record.phaseSide = (seed & 1) === 0 ? -1 : 1;
    record.start.copy(worldStart);
    this._playerEngineWorld(record.end);
    setColor(record.lineMaterial.color, color);
    setColor(record.headMaterial.color, color);
    record.lineMaterial.opacity = 0.76;
    record.headMaterial.opacity = 1;
    record.group.visible = true;
    this._stats.returnSignals += 1;
    return record;
  }

  _playerEngineWorld(output) {
    const player = this._resolvePlayerRoot();
    if (!player?.isObject3D) return output.set(0, 0.1, 2.8);
    const engine = player.userData?.engineRig;
    if (engine?.isObject3D) {
      engine.updateWorldMatrix(true, false);
      return engine.localToWorld(output.set(0, 0.08, 0.62));
    }
    player.updateWorldMatrix(true, false);
    return player.localToWorld(output.set(0, 0.08, 2.8));
  }

  _spawnEnginePulse(color, time) {
    const player = this._resolvePlayerRoot();
    if (!player?.isObject3D) return null;
    const record = this._acquire(this._enginePulses, this._deactivateEnginePulse);
    if (record.group.parent) record.group.removeFromParent();
    const engine = player.userData?.engineRig;
    if (engine?.isObject3D) {
      engine.add(record.group);
      record.group.position.set(0, 0.08, 0.62);
    } else {
      player.add(record.group);
      record.group.position.set(0, 0.08, 2.8);
    }
    record.group.rotation.set(0, 0, 0);
    record.group.scale.setScalar(0.3);
    record.outer.rotation.set(0, 0, 0);
    record.inner.rotation.set(0, 0, 0);
    record.core.scale.setScalar(0.42);
    record.group.visible = true;
    record.age = 0;
    record.startedAt = Number.isFinite(time) ? time : this._clock;
    setColor(record.outerMaterial.color, color);
    setColor(record.innerMaterial.color, 0xffffff);
    setColor(record.coreMaterial.color, color);
    record.outerMaterial.opacity = 1;
    record.innerMaterial.opacity = 0.92;
    record.coreMaterial.opacity = 1;
    this._stats.enginePulses += 1;
    return record;
  }

  _updateBolt(record, dt) {
    record.age += dt;
    const progress = saturate(record.age / record.duration);
    this._updateBoltVisual(record, progress);
    if (progress < 1) return;
    if (record.hit && record.triggerImpact && record.target?.isObject3D) {
      this.hitTarget(record.target, {
        color: record.color,
        time: this._clock,
        worldPoint: record.current,
        incoming: record.direction,
        seed: `${record.targetId}:${record.startedAt}`,
        returnToPlayer: record.returnToPlayer,
        externalShotId: record.externalShotId,
      });
    }
    this._deactivateBolt(record);
  }

  _updateMuzzle(record, dt) {
    record.age += dt;
    const progress = saturate(record.age / record.duration);
    const envelope = (1 - progress) ** 2;
    for (let index = 0; index < record.count; index += 1) {
      const flare = record.flares[index];
      const scale = 0.38 + Math.sin(progress * Math.PI) * 0.92;
      flare.scale.setScalar(scale);
      record.materials[index].opacity = envelope;
    }
    if (progress >= 1) this._deactivateMuzzle(record);
  }

  _updateHit(record, dt) {
    record.age += dt;
    const progress = saturate(record.age / record.duration);
    const flashEnvelope = (1 - progress) ** 1.65;
    const shellEnvelope = Math.sin(Math.PI * Math.min(1, progress * 1.18)) * (1 - progress * 0.56);
    record.shellMaterial.uniforms.opacity.value = shellEnvelope;
    record.shellMaterial.uniforms.wave.value = 0.98 - progress * 1.72;
    record.shell.scale.setScalar(0.93 + easeOutCubic(progress) * 0.18);
    record.fracturePivot.scale.setScalar(0.42 + easeOutCubic(progress) * 2.1);
    record.fractureMaterial.opacity = flashEnvelope;
    record.ring.scale.setScalar(0.55 + easeOutCubic(progress) * 2.75);
    record.ringMaterial.opacity = (1 - progress) ** 2.2;
    record.sparkMaterial.opacity = (1 - progress) ** 1.8;
    record.sparkMaterial.size = 0.34 * (1 - progress * 0.45);

    for (let index = 0; index < record.sparkVelocities.length; index += 1) {
      const velocity = record.sparkVelocities[index];
      const travel = record.age * (1 - progress * 0.22);
      const offset = index * 3;
      record.sparkPositions[offset] = record.sparkOrigin.x + velocity.x * travel;
      record.sparkPositions[offset + 1] = record.sparkOrigin.y + velocity.y * travel;
      record.sparkPositions[offset + 2] = record.sparkOrigin.z + velocity.z * travel;
    }
    record.sparkGeometry.attributes.position.needsUpdate = true;
    if (progress >= 1) this._deactivateHit(record);
  }

  _updateReturn(record, dt) {
    record.age += dt;
    const rawProgress = saturate(record.age / record.duration);
    const progress = easeOutCubic(rawProgress);
    this._playerEngineWorld(record.end);
    record.control.lerpVectors(record.start, record.end, 0.5);
    const path = record.end.clone().sub(record.start);
    const side = this._v0.crossVectors(path, WORLD_UP);
    if (side.lengthSq() < 0.0001) side.set(1, 0, 0);
    else side.normalize();
    record.control.addScaledVector(WORLD_UP, clamp(path.length() * 0.055, 2.2, 8));
    record.control.addScaledVector(side, record.phaseSide * clamp(path.length() * 0.035, 1.4, 5.2));

    const startTrail = Math.max(0, progress - 0.26);
    for (let index = 0; index < 12; index += 1) {
      const t = startTrail + (progress - startTrail) * (index / 11);
      quadraticBezier(this._v1, record.start, record.control, record.end, t);
      const offset = index * 3;
      record.positions[offset] = this._v1.x;
      record.positions[offset + 1] = this._v1.y;
      record.positions[offset + 2] = this._v1.z;
    }
    record.geometry.attributes.position.needsUpdate = true;
    quadraticBezier(record.current, record.start, record.control, record.end, progress);
    record.head.position.copy(record.current);
    record.head.scale.setScalar(0.58 + Math.sin(rawProgress * Math.PI) * 0.72);
    record.lineMaterial.opacity = (1 - rawProgress * 0.62) * 0.78;
    record.headMaterial.opacity = 1 - rawProgress * 0.45;
    if (!record.pulseTriggered && rawProgress >= 0.82) {
      record.pulseTriggered = true;
      this._spawnEnginePulse(record.headMaterial.color, this._clock);
    }
    if (rawProgress >= 1) this._deactivateReturn(record);
  }

  _updateEnginePulse(record, dt) {
    record.age += dt;
    const progress = saturate(record.age / record.duration);
    // A tight, fast pressure-ring is the final punctuation in the causal
    // shot -> hit -> return -> boost chain. The previous 2.8x expansion and
    // inherited 1.9x sprite scale could cover most of the car and the speed
    // readout when the rear engines sat close to camera.
    const envelope = (1 - progress) ** 2.05;
    const scale = 0.3 + easeOutCubic(progress) * 0.74;
    record.group.scale.setScalar(scale);
    record.outer.rotation.z += dt * 5.8;
    record.inner.rotation.z -= dt * 8.2;
    record.outerMaterial.opacity = envelope;
    record.innerMaterial.opacity = envelope * 0.78;
    record.coreMaterial.opacity = envelope * 0.88;
    record.core.scale.setScalar(0.42 + progress * 0.24);
    if (progress >= 1) this._deactivateEnginePulse(record);
  }

  /** Advance all pools. `time` should be the race's monotonic simulation time. */
  update(dt, time = this._clock + dt) {
    if (this._disposed) return;
    const safeDt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
    this._clock = Number.isFinite(time) ? time : this._clock + safeDt;
    for (const record of this._bolts) if (record.active) this._updateBolt(record, safeDt);
    for (const record of this._muzzles) if (record.active) this._updateMuzzle(record, safeDt);
    for (const record of this._hits) if (record.active) this._updateHit(record, safeDt);
    for (const record of this._returns) if (record.active) this._updateReturn(record, safeDt);
    for (const record of this._enginePulses) if (record.active) this._updateEnginePulse(record, safeDt);
  }

  /**
   * Immediately retire every presentation record without changing combat
   * counters. Reentry uses this to hand the whole frame back to the landing
   * vector instead of carrying a half-second shield bloom into atmosphere.
   */
  clear() {
    for (const record of this._bolts) if (record.active) this._deactivateBolt(record);
    for (const record of this._muzzles) if (record.active) this._deactivateMuzzle(record);
    for (const record of this._hits) if (record.active) this._deactivateHit(record);
    for (const record of this._returns) if (record.active) this._deactivateReturn(record);
    for (const record of this._enginePulses) if (record.active) this._deactivateEnginePulse(record);
  }

  /**
   * Return a staged/prewarmed presentation to the same observable state as a
   * fresh race. Startup deliberately exercises the real combat pools so their
   * first player-visible volley cannot compile shaders mid-flight; none of
   * those throwaway shots may leak into race diagnostics or shot sequencing.
   */
  resetDiagnostics(time = 0) {
    // Reset every pooled record, including inactive ones. An inactive engine
    // pulse can retain its integrated counter-rotation after being retired;
    // clearing only active records made a later QA capture depend on which
    // pool slot happened to be reused.
    for (const record of this._bolts) {
      this._deactivateBolt(record);
      record.group.position.set(0, 0, 0);
      record.group.quaternion.identity();
      record.group.scale.setScalar(1);
    }
    for (const record of this._muzzles) {
      this._deactivateMuzzle(record);
      record.age = 0;
      record.group.position.set(0, 0, 0);
      record.group.quaternion.identity();
      record.group.scale.setScalar(1);
    }
    for (const record of this._hits) {
      this._deactivateHit(record);
      record.age = 0;
      record.group.position.set(0, 0, 0);
      record.group.quaternion.identity();
      record.group.scale.setScalar(1);
      record.fracturePivot.position.set(0, 0, 0);
      record.fracturePivot.quaternion.identity();
      record.fracturePivot.scale.setScalar(1);
      record.ring.scale.setScalar(1);
      record.sparkPositions.fill(0);
      record.sparkGeometry.attributes.position.needsUpdate = true;
    }
    for (const record of this._returns) {
      this._deactivateReturn(record);
      record.age = 0;
      record.pulseTriggered = false;
      record.group.position.set(0, 0, 0);
      record.group.quaternion.identity();
      record.group.scale.setScalar(1);
      record.positions.fill(0);
      record.geometry.attributes.position.needsUpdate = true;
    }
    for (const record of this._enginePulses) {
      this._deactivateEnginePulse(record);
      record.age = 0;
      record.group.position.set(0, 0, 0);
      record.group.quaternion.identity();
      record.group.scale.setScalar(1);
      record.outer.rotation.set(0, 0, 0);
      record.inner.rotation.set(0, 0, 0);
      record.core.scale.setScalar(0.42);
      record.outerMaterial.opacity = 0;
      record.innerMaterial.opacity = 0;
      record.coreMaterial.opacity = 0;
    }
    this._clock = Number.isFinite(time) ? time : 0;
    this._shotSequence = 0;
    for (const key of Object.keys(this._stats)) this._stats[key] = 0;
  }

  _deactivateBolt(record) {
    record.active = false;
    record.group.visible = false;
    record.target = null;
    record.targetId = null;
    record.externalShotId = null;
    record.hit = false;
    record.triggerImpact = false;
    record.returnToPlayer = true;
    record.team = 'player';
    record.age = 0;
    record.curveMagnitude = 0;
    record.curveLift = 0;
    record.curveSide = 1;
    record.pathLength = 1;
    record.headMaterial.depthTest = true;
    record.headMaterial.opacity = 1;
    record.head.renderOrder = 9;
  }

  _deactivateMuzzle(record) {
    record.active = false;
    record.group.visible = false;
    for (const material of record.materials) material.opacity = 0;
  }

  _deactivateHit(record) {
    record.active = false;
    record.group.visible = false;
    if (record.group.parent) record.group.removeFromParent();
    record.target = null;
    record.externalShotId = null;
  }

  _deactivateReturn(record) {
    record.active = false;
    record.group.visible = false;
  }

  _deactivateEnginePulse(record) {
    record.active = false;
    record.group.visible = false;
    if (record.group.parent) record.group.removeFromParent();
    record.outer.rotation.set(0, 0, 0);
    record.inner.rotation.set(0, 0, 0);
  }

  /**
   * Ordered, collision-resistant input for the renderer's QA presentation
   * signature. Diagnostics() intentionally stays compact and human-readable;
   * this state records every active pool slot's causal identity and authored
   * transform so equal age sums cannot conceal different visible combat.
   */
  presentationSignatureState() {
    const number = (value) => {
      if (Number.isNaN(value)) return '@nonfinite:NaN';
      if (value === Infinity) return '@nonfinite:+Infinity';
      if (value === -Infinity) return '@nonfinite:-Infinity';
      if (!Number.isFinite(value)) return `@nonnumeric:${typeof value}:${String(value)}`;
      const rounded = Math.fround(value);
      if (rounded === Infinity) return '@f32overflow:+Infinity';
      if (rounded === -Infinity) return '@f32overflow:-Infinity';
      return rounded;
    };
    const vector = (value) => (value?.toArray
      ? value.toArray().map(number)
      : []);
    const transform = (object) => ({
      visible: Boolean(object?.visible),
      position: vector(object?.position),
      quaternion: vector(object?.quaternion),
      scale: vector(object?.scale),
    });
    const targetName = (target) => target?.name ?? null;
    const externalId = (value) => (value == null ? null : String(value));
    return {
      clock: number(this._clock),
      shotSequence: this._shotSequence,
      bolts: this._bolts.map((record) => ({
        index: record.index,
        active: record.active,
        age: number(record.age),
        duration: number(record.duration),
        team: record.team,
        targetId: externalId(record.targetId),
        externalShotId: externalId(record.externalShotId),
        target: targetName(record.target),
        hit: record.hit,
        triggerImpact: record.triggerImpact,
        returnToPlayer: record.returnToPlayer,
        start: vector(record.start),
        end: vector(record.end),
        current: vector(record.current),
        previous: vector(record.previous),
        direction: vector(record.direction),
        control: vector(record.control),
        targetOffsetLocal: vector(record.targetOffsetLocal),
        group: transform(record.group),
        core: transform(record.core),
        halo: transform(record.halo),
        head: transform(record.head),
      })),
      muzzles: this._muzzles.map((record) => ({
        index: record.index,
        active: record.active,
        age: number(record.age),
        duration: number(record.duration),
        count: record.count,
        group: transform(record.group),
        flares: record.flares.map(transform),
        opacities: record.materials.map((material) => number(material.opacity)),
      })),
      hits: this._hits.map((record) => ({
        index: record.index,
        active: record.active,
        age: number(record.age),
        duration: number(record.duration),
        externalShotId: externalId(record.externalShotId),
        target: targetName(record.target),
        localNormal: vector(record.localNormal),
        sparkOrigin: vector(record.sparkOrigin),
        sparkPositions: Array.from(record.sparkPositions, number),
        sparkVelocities: record.sparkVelocities.map(vector),
        group: transform(record.group),
        shell: transform(record.shell),
        fracture: transform(record.fracturePivot),
        ring: transform(record.ring),
        opacities: [
          record.shellMaterial.uniforms.opacity.value,
          record.fractureMaterial.opacity,
          record.ringMaterial.opacity,
          record.sparkMaterial.opacity,
        ].map(number),
      })),
      returns: this._returns.map((record) => ({
        index: record.index,
        active: record.active,
        age: number(record.age),
        duration: number(record.duration),
        pulseTriggered: record.pulseTriggered,
        phaseSide: record.phaseSide,
        start: vector(record.start),
        end: vector(record.end),
        control: vector(record.control),
        current: vector(record.current),
        positions: Array.from(record.positions, number),
        group: transform(record.group),
        head: transform(record.head),
        opacities: [record.lineMaterial.opacity, record.headMaterial.opacity].map(number),
      })),
      enginePulses: this._enginePulses.map((record) => ({
        index: record.index,
        active: record.active,
        age: number(record.age),
        duration: number(record.duration),
        parent: targetName(record.group.parent),
        group: transform(record.group),
        outer: transform(record.outer),
        inner: transform(record.inner),
        core: transform(record.core),
        opacities: [
          record.outerMaterial.opacity,
          record.innerMaterial.opacity,
          record.coreMaterial.opacity,
        ].map(number),
      })),
    };
  }

  diagnostics() {
    const countActive = (pool) => pool.reduce((count, record) => count + (record.active ? 1 : 0), 0);
    return {
      active: {
        bolts: countActive(this._bolts),
        playerBolts: this._bolts.reduce((count, record) => count + (record.active && record.team === 'player' ? 1 : 0), 0),
        rivalBolts: this._bolts.reduce((count, record) => count + (record.active && record.team === 'rival' ? 1 : 0), 0),
        rivalShotIds: this._bolts
          .filter((record) => record.active && record.team === 'rival' && record.externalShotId != null)
          .map((record) => record.externalShotId),
        muzzleFlashes: countActive(this._muzzles),
        shieldHits: countActive(this._hits),
        shieldHitShotIds: this._hits
          .filter((record) => record.active && record.externalShotId != null)
          .map((record) => record.externalShotId),
        returnSignals: countActive(this._returns),
        enginePulses: countActive(this._enginePulses),
      },
      capacity: {
        bolts: this._bolts.length,
        muzzleFlashes: this._muzzles.length,
        shieldHits: this._hits.length,
        returnSignals: this._returns.length,
        enginePulses: this._enginePulses.length,
      },
      totals: { ...this._stats },
      presentation: {
        clock: Number(this._clock.toFixed(6)),
        shotSequence: this._shotSequence,
        boltAgeSum: Number(this._bolts.reduce((sum, record) => sum + record.age, 0).toFixed(6)),
        hitAgeSum: Number(this._hits.reduce((sum, record) => sum + record.age, 0).toFixed(6)),
        returnAgeSum: Number(this._returns.reduce((sum, record) => sum + record.age, 0).toFixed(6)),
        enginePulseAgeSum: Number(this._enginePulses.reduce((sum, record) => sum + record.age, 0).toFixed(6)),
        engineOuterRotationZ: this._enginePulses.map((record) => Number(record.outer.rotation.z.toFixed(6))),
        engineInnerRotationZ: this._enginePulses.map((record) => Number(record.inner.rotation.z.toFixed(6))),
      },
      deterministic: true,
      worldSpaceBolts: true,
      targetLocalImpacts: true,
      disposed: this._disposed,
    };
  }

  dispose() {
    if (this._disposed) return;
    for (const record of this._bolts) {
      this._deactivateBolt(record);
      record.group.removeFromParent();
    }
    for (const record of this._muzzles) {
      this._deactivateMuzzle(record);
      record.group.removeFromParent();
    }
    for (const record of this._hits) this._deactivateHit(record);
    for (const record of this._returns) {
      this._deactivateReturn(record);
      record.group.removeFromParent();
    }
    for (const record of this._enginePulses) this._deactivateEnginePulse(record);
    this.fxRoot.removeFromParent();
    for (const material of this._materials) material.dispose();
    for (const geometry of this._geometries) geometry.dispose();
    for (const texture of this._textures) texture.dispose();
    this._materials.clear();
    this._geometries.clear();
    this._textures.clear();
    this._disposed = true;
  }
}

export default CombatFX;
