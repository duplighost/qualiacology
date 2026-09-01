import {
  Euler,
  MathUtils,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three';
import { vehiclePoseRoll, writeVehicleSurfaceFrame } from './surface-frame.js';

const TAU = Math.PI * 2;
const WORLD_RIGHT = new Vector3(1, 0, 0);
const WORLD_UP = new Vector3(0, 1, 0);
const CAMERA_FORWARD = new Vector3(0, 0, -1);

// Measured from the authored player asset with Box3 at morph 0, .25, .5,
// .75, and 1. These deliberately enclose the physical body (including wheels
// and deployed rocket wings), not just the vehicle root or canopy. The camera
// guard uses the box only to reserve screen space; it never changes the model.
const PLAYER_SILHOUETTE_HALF_WIDTH = 2.8;
const PLAYER_SILHOUETTE_HALF_HEIGHT = 1.28;
const PLAYER_SILHOUETTE_CAR_HALF_LENGTH = 4.25;
const PLAYER_SILHOUETTE_ROCKET_HALF_LENGTH = 7.78;
const PLAYER_SILHOUETTE_CAR_CENTER_Y = -0.006;
const PLAYER_SILHOUETTE_ROCKET_CENTER_Y = 0.2;
const PLAYER_SILHOUETTE_CAR_CENTER_Z = 0.02;
const PLAYER_SILHOUETTE_ROCKET_CENTER_Z = -0.45;
const PLAYER_SILHOUETTE_EDGE_PADDING = 0.035;
const MAX_FRAMING_YAW = MathUtils.degToRad(16);
const MAX_FRAMING_PITCH = MathUtils.degToRad(18);
const FRAMING_EPSILON = 0.00001;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const saturate = (value) => clamp(finite(value), 0, 1);
const smoothstep01 = (value) => {
  const t = saturate(value);
  return t * t * (3 - 2 * t);
};

function setBankedRigPoint(target, anchorX, anchorY, anchorZ, localX, localY, localZ, cos, sin) {
  target.set(
    anchorX + localX * cos - localY * sin,
    anchorY + localX * sin + localY * cos,
    anchorZ + localZ,
  );
}

const RIG_ORDER = Object.freeze([
  'drift',
  'trick-landed/boost',
  'launch',
  'space-combat',
  'reentry',
  'touchdown',
]);

const WEIGHT_FREQUENCIES = Object.freeze({
  drive: 18,
  drift: 15,
  'trick-landed/boost': 12,
  launch: 8,
  'space-combat': 10,
  reentry: 7,
  touchdown: 15,
});

const RESPONSE_FREQUENCIES = Object.freeze({
  drive: Object.freeze({ position: 12, look: 10, fov: 9, roll: 11 }),
  drift: Object.freeze({ position: 14, look: 12, fov: 10, roll: 14 }),
  'trick-landed/boost': Object.freeze({ position: 10, look: 9, fov: 8, roll: 11 }),
  launch: Object.freeze({ position: 7, look: 7, fov: 7, roll: 8 }),
  'space-combat': Object.freeze({ position: 11, look: 10, fov: 9, roll: 12 }),
  reentry: Object.freeze({ position: 7, look: 7, fov: 7, roll: 9 }),
  touchdown: Object.freeze({ position: 16, look: 13, fov: 12, roll: 15 }),
});

const DEFAULT_TRAUMA_PROFILE = Object.freeze({
  gain: 0.42,
  decay: 3,
  x: 0.06,
  y: 0.05,
  z: 0.07,
  roll: 0.008,
});

const TRAUMA_PROFILES = Object.freeze({
  boost: Object.freeze({ gain: 0.44, decay: 4.4, x: 0.025, y: 0.035, z: 0.12, roll: 0.005 }),
  'trick-landed': Object.freeze({ gain: 0.58, decay: 4, x: 0.05, y: 0.045, z: 0.15, roll: 0.012 }),
  shot: Object.freeze({ gain: 0.24, decay: 7.5, x: 0.018, y: 0.014, z: 0.055, roll: 0.004 }),
  hit: Object.freeze({ gain: 0.76, decay: 4.6, x: 0.12, y: 0.09, z: 0.1, roll: 0.024 }),
  launch: Object.freeze({ gain: 0.9, decay: 2.1, x: 0.1, y: 0.1, z: 0.22, roll: 0.018 }),
  reentry: Object.freeze({ gain: 0.62, decay: 1.35, x: 0.09, y: 0.07, z: 0.08, roll: 0.017 }),
  touchdown: Object.freeze({ gain: 1, decay: 3.4, x: 0.13, y: 0.2, z: 0.18, roll: 0.026 }),
  landing: Object.freeze({ gain: 1, decay: 3.4, x: 0.13, y: 0.2, z: 0.18, roll: 0.026 }),
});

function scalarState(value = 0) {
  return { value, velocity: 0 };
}

/**
 * Exact integration of a critically damped spring while its target is constant
 * over the current time step. This never overshoots and remains stable across
 * irregular browser frame times.
 */
function stepCriticalScalar(spring, target, frequency, dt) {
  const omega = Math.max(0.001, finite(frequency, 1));
  const y = spring.value - target;
  const j = spring.velocity + omega * y;
  const decay = Math.exp(-omega * dt);
  spring.value = target + (y + j * dt) * decay;
  spring.velocity = (spring.velocity - j * omega * dt) * decay;
  return spring.value;
}

function stepCriticalVector(value, velocity, target, frequency, dt) {
  const omega = Math.max(0.001, finite(frequency, 1));
  const decay = Math.exp(-omega * dt);

  const yx = value.x - target.x;
  const jy = velocity.x + omega * yx;
  value.x = target.x + (yx + jy * dt) * decay;
  velocity.x = (velocity.x - jy * omega * dt) * decay;

  const yy = value.y - target.y;
  const jyy = velocity.y + omega * yy;
  value.y = target.y + (yy + jyy * dt) * decay;
  velocity.y = (velocity.y - jyy * omega * dt) * decay;

  const yz = value.z - target.z;
  const jz = velocity.z + omega * yz;
  value.z = target.z + (yz + jz * dt) * decay;
  velocity.z = (velocity.z - jz * omega * dt) * decay;

  return value;
}

function hashText(text) {
  let value = 2166136261 >>> 0;
  const source = String(text);
  for (let i = 0; i < source.length; i += 1) {
    value ^= source.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function hashUnit(seed) {
  let value = seed >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

function makeRig(name) {
  return {
    name,
    position: new Vector3(),
    look: new Vector3(),
    fov: 62,
    roll: 0,
    screenTarget: 0.17,
  };
}

function copyRig(target, source) {
  target.name = source.name;
  target.position.copy(source.position);
  target.look.copy(source.look);
  target.fov = source.fov;
  target.roll = source.roll;
  target.screenTarget = source.screenTarget;
  return target;
}

function blendRig(target, source, amount) {
  const t = saturate(amount);
  target.position.lerp(source.position, t);
  target.look.lerp(source.look, t);
  target.fov = MathUtils.lerp(target.fov, source.fov, t);
  target.roll = MathUtils.lerp(target.roll, source.roll, t);
  target.screenTarget = MathUtils.lerp(target.screenTarget, source.screenTarget, t);
  return target;
}

/**
 * Stateful third-person camera choreography for a player-local racing world.
 *
 * Coordinate contract:
 * - the vehicle is near z=0;
 * - forward travel is -Z;
 * - +Y is up;
 * - state.lateral is the player's local X position on the course.
 */
export class CameraDirector {
  constructor(camera, options = {}) {
    if (!camera?.isPerspectiveCamera) {
      throw new TypeError('CameraDirector requires a Three.js PerspectiveCamera.');
    }

    this.camera = camera;
    this.reducedMotion = Boolean(options.reducedMotion);
    this.vehicleFramingHeight = clamp(finite(options.vehicleFramingHeight, 1.8), 0.5, 5);
    this.minimumDistance = clamp(finite(options.minimumDistance, 6.2), 2, 20);
    this.maximumDistance = Math.max(this.minimumDistance, finite(options.maximumDistance, 12.8));
    this.maximumFov = clamp(finite(options.maximumFov, 78), 55, 78);
    this.minimumFov = clamp(finite(options.minimumFov, 56), 40, this.maximumFov);
    this.framingSafetyEnabled = options.framingSafetyEnabled !== false;

    this.rigs = {
      drive: makeRig('drive'),
      drift: makeRig('drift'),
      'trick-landed/boost': makeRig('trick-landed/boost'),
      launch: makeRig('launch'),
      'space-combat': makeRig('space-combat'),
      reentry: makeRig('reentry'),
      touchdown: makeRig('touchdown'),
    };
    this.compositeRig = makeRig('drive');

    this.weights = {
      drive: scalarState(1),
      drift: scalarState(0),
      'trick-landed/boost': scalarState(0),
      launch: scalarState(0),
      'space-combat': scalarState(0),
      reentry: scalarState(0),
      touchdown: scalarState(0),
    };

    this.position = camera.position.clone();
    this.positionVelocity = new Vector3();
    this.look = new Vector3(0, 0.45, -34);
    this.lookVelocity = new Vector3();
    this.fovSpring = scalarState(clamp(finite(camera.fov, 62), this.minimumFov, this.maximumFov));
    this.rollSpring = scalarState(0);

    this.vehicleAnchor = new Vector3();
    this.vehicleSurfaceFrame = {
      x: 0,
      y: 0.2,
      bank: 0,
      anchorX: 0,
      anchorY: 0.48,
      unitLateral: 0,
      roadVertical: 0.13,
      surface: 1,
    };
    this.framingDirection = new Vector3();
    this.traumaOffsetLocal = new Vector3();
    this.traumaOffsetWorld = new Vector3();
    this.lookMatrix = new Matrix4();
    this.baseQuaternion = new Quaternion();
    this.rollQuaternion = new Quaternion();
    this.inverseCameraQuaternion = new Quaternion();
    this.vehicleQuaternion = new Quaternion();
    this.vehicleRootQuaternion = new Quaternion();
    this.vehiclePoseQuaternion = new Quaternion();
    this.vehiclePoseEuler = new Euler(0, 0, 0, 'XYZ');
    this.vehicleCenter = new Vector3();
    this.vehicleCenterOffset = new Vector3();
    this.silhouetteCorner = new Vector3();
    this.anchorCameraLocal = new Vector3();
    this.vehicleCenterCameraLocal = new Vector3();
    this.cornerCameraLocal = new Vector3();
    this.currentAnchorDirection = new Vector3();
    this.desiredAnchorDirection = new Vector3();
    this.safetyDollyDirection = new Vector3();
    this.safetyYawQuaternion = new Quaternion();
    this.safetyPitchQuaternion = new Quaternion();
    this.safetyCorrectionQuaternion = new Quaternion();
    this.framingMeasure = {
      valid: false,
      anchorX: 0,
      anchorY: 0,
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
    };
    this.framingEnvelope = {
      fitPossible: true,
      minX: -1,
      maxX: 1,
      minY: -1,
      maxY: 1,
    };

    this.elapsed = 0;
    this.initialized = false;
    this.previousAirborne = false;
    this.previousTrickMeter = 0;
    this.previousBoost = 0;
    this.previousSegmentType = null;
    this.releaseTimer = 0;
    this.releaseDuration = 0.72;
    this.releaseStrength = 0;
    this.touchdownTimer = 0;
    this.touchdownDuration = 1.05;

    this.traumaLevel = 0;
    this.traumaTime = 0;
    this.traumaSerial = 0;
    this.traumaType = 'none';
    this.traumaProfile = DEFAULT_TRAUMA_PROFILE;
    this.traumaPhases = new Float64Array(8);

    this.diagnostics = {
      rig: 'drive',
      rigName: 'drive',
      fov: this.fovSpring.value,
      vehicleScreenTarget: 0.17,
      trauma: 0,
      traumaType: 'none',
      launchPose: 0,
      launchWeight: 0,
      launchRigTargetFov: 70,
      launchRigScreenTarget: 0.052,
      launchRigPosition: [0, 0, 0],
      launchRigLook: [0, 0, 0],
      courseYaw: 0,
      surfacePoseDriven: false,
      framingSafety: {
        enabled: this.framingSafetyEnabled,
        active: false,
        fitPossible: true,
        saturated: false,
        atAngularLimit: false,
        atDistanceLimit: false,
        correctionYaw: 0,
        correctionPitch: 0,
        correctionDolly: 0,
        preAnchorX: 0,
        preAnchorY: 0,
        preMinX: 0,
        preMaxX: 0,
        preMinY: 0,
        preMaxY: 0,
        preSafeMinX: -1,
        preSafeMaxX: 1,
        preSafeMinY: -1,
        preSafeMaxY: 1,
        postAnchorX: 0,
        postAnchorY: 0,
        postMinX: 0,
        postMaxX: 0,
        postMinY: 0,
        postMaxY: 0,
        safeMinX: -1,
        safeMaxX: 1,
        safeMinY: -1,
        safeMaxY: 1,
      },
    };
  }

  /**
   * Adds a deterministic camera impulse. The same ordered event sequence yields
   * the same multi-band motion; no random source is sampled.
   */
  trauma(type = 'impact', intensity = 1) {
    const key = String(type || 'impact').toLowerCase();
    const profile = TRAUMA_PROFILES[key] ?? DEFAULT_TRAUMA_PROFILE;
    const amount = clamp(finite(intensity, 1), 0, 2);
    const incoming = amount * profile.gain;

    this.traumaProfile = profile;
    this.traumaType = key;
    this.traumaLevel = clamp(Math.max(this.traumaLevel, incoming) + incoming * 0.18, 0, 1.35);
    this.traumaTime = 0;
    this.traumaSerial += 1;

    const base = (hashText(key) ^ Math.imul(this.traumaSerial, 0x9e3779b1)) >>> 0;
    for (let i = 0; i < this.traumaPhases.length; i += 1) {
      this.traumaPhases[i] = hashUnit((base + Math.imul(i + 1, 0x85ebca6b)) >>> 0) * TAU;
    }

    if (key === 'trick-landed' || key === 'boost') {
      const releaseStrength = saturate(amount);
      this.releaseStrength = Math.max(this.releaseStrength, releaseStrength);
      this.releaseTimer = Math.max(
        this.releaseTimer,
        this.releaseDuration * (0.22 + releaseStrength * 0.78),
      );
    }
    if (key === 'touchdown' || key === 'landing') {
      this.touchdownTimer = Math.max(this.touchdownTimer, this.touchdownDuration);
    }

    return this.traumaLevel;
  }

  getDiagnostics() {
    return { ...this.diagnostics };
  }

  _setRigTargets(context) {
    const {
      state,
      segment,
      morph,
      current,
      next,
      speedNorm,
      boost,
      launch,
      landing,
      departure = 0,
    } = context;

    const lateral = finite(state.lateral);
    const lift = Math.max(0, finite(state.lift));
    // `state.yaw` has several owners on a planet: near the ground it is the
    // board's small course-relative steering angle, but in the air it is the
    // trick motor's accumulated spin pose (PI per committed 180), and after
    // the finish it is the authored sideways-stop pose. Feeding a pose channel
    // into the chase rigs made every 180 drag the camera several units sideways
    // and made the finish camera orbit with the car instead of showing it turn.
    //
    // Keep the camera in course space. A grounded switch stance is equivalent
    // to forward for framing, while airborne, rail/grind, landing-settle and
    // finish pose yaw/roll belong to the vehicle presentation only. Track
    // curvature, lateral travel, trick framing weight, boost/release FOV and
    // trauma remain authored inputs below.
    const surfacePoseDriven = context.isSurface
      && (
        state.riderState === 'air'
        || state.riderState === 'rail'
        || state.riderState === 'grind'
        || finite(state.landingSettle) > 0
        || state.finished === true
      );
    const stanceYaw = context.isSurface ? finite(state.stance) * Math.PI : 0;
    const courseYawRaw = finite(state.yaw) - stanceYaw;
    const courseYaw = Math.atan2(Math.sin(courseYawRaw), Math.cos(courseYawRaw));
    const yaw = surfacePoseDriven ? 0 : courseYaw;
    const vehicleRoll = surfacePoseDriven ? 0 : finite(state.roll);
    this.diagnostics.courseYaw = Number(yaw.toFixed(4));
    this.diagnostics.surfacePoseDriven = surfacePoseDriven;
    // The drift camera became the TRICK camera: it frames the board while a
    // trick is charging in the air, which is when the player most needs to see
    // their own orientation to judge the landing.
    const driftCharge = saturate(state.trickMeter);
    const driftSide = Math.sign(finite(state.spinSide, Math.sign(finite(state.lastInput?.steer)))) || 1;
    const bank = finite(current.bank);
    const curveX = clamp(finite(next.x) - finite(current.x), -30, 30);
    const roadRise = clamp(finite(next.y) - finite(current.y), -18, 22);
    const suppliedFrame = context.vehicleFrame;
    const vehicleFrame = suppliedFrame
      && Number.isFinite(suppliedFrame.x)
      && Number.isFinite(suppliedFrame.y)
      && Number.isFinite(suppliedFrame.bank)
      && Number.isFinite(suppliedFrame.anchorX)
      && Number.isFinite(suppliedFrame.anchorY)
      ? suppliedFrame
      : writeVehicleSurfaceFrame(this.vehicleSurfaceFrame, {
        lateral,
        width: finite(current.width, 1),
        bank,
        surface: finite(morph.surface, context.isSurface ? 1 : landing),
        lift,
        pitch: Number.isFinite(context.vehiclePitch) ? context.vehiclePitch : 0,
      });
    const vehicleX = finite(vehicleFrame.anchorX, lateral);
    const vehicleY = finite(vehicleFrame.anchorY, 0.48 + lift);
    const vehicleZ = finite(vehicleFrame.anchorZ);
    const vehicleBank = finite(vehicleFrame.bank);
    const bankCos = Math.cos(vehicleBank);
    const bankSin = Math.sin(vehicleBank);
    const legacyAnchorY = 0.48 + lift;
    // The framing probe must use the exact same resolved frame as the rig. In
    // focused camera tests no renderer-supplied frame exists, so retain the
    // preallocated fallback on the per-update context rather than recomputing
    // or silently measuring an unbanked body.
    context.vehicleFrame = vehicleFrame;
    this.vehicleAnchor.set(vehicleX, vehicleY, vehicleZ);

    const drive = this.rigs.drive;
    setBankedRigPoint(drive.position, vehicleX, vehicleY, vehicleZ,
      -yaw * 1.8, 2.65, 7.2, bankCos, bankSin);
    setBankedRigPoint(drive.look, vehicleX, vehicleY, vehicleZ,
      lateral * 0.2 + curveX * 0.44 - yaw * 2.8 - lateral,
      0.52 + roadRise * 0.22 + lift * 0.08 - legacyAnchorY,
      -32 - speedNorm * 8,
      bankCos,
      bankSin,
    );
    drive.fov = 61 + speedNorm * 4;
    drive.roll = bank * 0.34 + vehicleRoll * 0.18;
    drive.screenTarget = 0.172;

    const drift = this.rigs.drift;
    setBankedRigPoint(drift.position, vehicleX, vehicleY, vehicleZ,
      -driftSide * (1.1 + driftCharge * 0.95) - yaw * 0.7,
      2.35,
      7.05,
      bankCos,
      bankSin);
    setBankedRigPoint(drift.look, vehicleX, vehicleY, vehicleZ,
      lateral * 0.18 + curveX * 0.58 + driftSide * 0.42 - yaw * 2 - lateral,
      0.48 + roadRise * 0.28 + lift * 0.06 - legacyAnchorY,
      -36 - speedNorm * 7,
      bankCos,
      bankSin,
    );
    drift.fov = 63 + speedNorm * 5;
    drift.roll = bank * 0.38 + vehicleRoll * 0.25 - driftSide * driftCharge * 0.028;
    drift.screenTarget = 0.184;

    const release = this.rigs['trick-landed/boost'];
    setBankedRigPoint(release.position, vehicleX, vehicleY, vehicleZ,
      -yaw * 1.15, 2.4, 8.25, bankCos, bankSin);
    setBankedRigPoint(release.look, vehicleX, vehicleY, vehicleZ,
      lateral * 0.17 + curveX * 0.54 - yaw * 2.5 - lateral,
      0.5 + roadRise * 0.3 + lift * 0.06 - legacyAnchorY,
      -42 - speedNorm * 9,
      bankCos,
      bankSin,
    );
    // The FOV punch, and it is now large enough to be a punch. At `boost * 5`
    // -- blended in at partial weight -- a full cash moved the lens by about
    // three degrees, which is below the threshold anyone notices. Alex, on the
    // result: "i really cant see it." The clamp above this is 78, so there was
    // headroom the whole time and nothing was using it.
    release.fov = 66 + speedNorm * 4 + boost * 12;
    release.roll = bank * 0.32 + vehicleRoll * 0.16;
    release.screenTarget = 0.171;

    const launchRig = this.rigs.launch;
    // The simulation's planet-side launch value reaches one at the boundary,
    // then resets to zero because the new Space segment owns a fresh morph
    // state. Keep the exact same outbound camera pose alive with Space's
    // departure envelope instead of snapping the raw rig target on that frame.
    const launchPose = segment.type === 'space' ? saturate(departure) : launch;
    setBankedRigPoint(launchRig.position, vehicleX, vehicleY, vehicleZ,
      -yaw * 1.2, 3 + launchPose * 1.2, 8.8, bankCos, bankSin);
    setBankedRigPoint(launchRig.look, vehicleX, vehicleY, vehicleZ,
      lateral * 0.14 + curveX * 0.65 - yaw * 2.4 - lateral,
      0.6 + roadRise * 0.42 + launchPose * 1.45 + lift * 0.12 - legacyAnchorY,
      -49 - speedNorm * 8,
      bankCos,
      bankSin,
    );
    launchRig.fov = 70 + launchPose * 6 + boost * 2;
    launchRig.roll = bank * 0.46 + vehicleRoll * 0.35;
    // The launch is the one moment where seeing the whole transformation and
    // the world fall away matters more than keeping the hero large.  Pull back
    // far enough to preserve the plume and closing wing tips in a single frame.
    launchRig.screenTarget = 0.052;
    this.diagnostics.launchPose = Number(launchPose.toFixed(6));
    this.diagnostics.launchRigTargetFov = Number(launchRig.fov.toFixed(4));
    this.diagnostics.launchRigScreenTarget = launchRig.screenTarget;
    this.diagnostics.launchRigPosition[0] = Number(launchRig.position.x.toFixed(4));
    this.diagnostics.launchRigPosition[1] = Number(launchRig.position.y.toFixed(4));
    this.diagnostics.launchRigPosition[2] = Number(launchRig.position.z.toFixed(4));
    this.diagnostics.launchRigLook[0] = Number(launchRig.look.x.toFixed(4));
    this.diagnostics.launchRigLook[1] = Number(launchRig.look.y.toFixed(4));
    this.diagnostics.launchRigLook[2] = Number(launchRig.look.z.toFixed(4));

    const space = this.rigs['space-combat'];
    setBankedRigPoint(space.position, vehicleX, vehicleY, vehicleZ,
      -yaw * 1.8 - vehicleRoll * 0.55,
      2.7 + lift * 0.1,
      8.5,
      bankCos,
      bankSin);
    setBankedRigPoint(space.look, vehicleX, vehicleY, vehicleZ,
      lateral * 0.18 + curveX * 0.74 - yaw * 3.4 - lateral,
      0.7 + roadRise * 0.46 + lift * 0.12 - legacyAnchorY,
      -48 - speedNorm * 10,
      bankCos,
      bankSin,
    );
    space.fov = 68 + speedNorm * 5 + boost * 3;
    space.roll = bank * 0.18 + vehicleRoll * 0.56;
    space.screenTarget = 0.088;

    const reentry = this.rigs.reentry;
    setBankedRigPoint(reentry.position, vehicleX, vehicleY, vehicleZ,
      -yaw * 0.9 - vehicleRoll * 1.35,
      3.45 + landing * 1.25,
      9.15,
      bankCos,
      bankSin);
    setBankedRigPoint(reentry.look, vehicleX, vehicleY, vehicleZ,
      lateral * 0.14 + curveX * 0.72 - yaw * 2 - lateral,
      0.34 + roadRise * 0.72 - landing * 1.15 + lift * 0.06 - legacyAnchorY,
      -57 - speedNorm * 8,
      bankCos,
      bankSin,
    );
    reentry.fov = 71 + speedNorm * 4 + landing * 2;
    reentry.roll = bank * 0.35 + vehicleRoll * 0.66;
    reentry.screenTarget = 0.092;

    const touchdown = this.rigs.touchdown;
    setBankedRigPoint(touchdown.position, vehicleX, vehicleY, vehicleZ,
      -yaw * 1.4, 2.02, 6.85, bankCos, bankSin);
    setBankedRigPoint(touchdown.look, vehicleX, vehicleY, vehicleZ,
      lateral * 0.22 + curveX * 0.52 - yaw * 2.6 - lateral,
      0.36 + roadRise * 0.27 - legacyAnchorY,
      -36 - speedNorm * 7,
      bankCos,
      bankSin,
    );
    touchdown.fov = 64 + speedNorm * 4;
    touchdown.roll = bank * 0.4 + vehicleRoll * 0.25;
    touchdown.screenTarget = 0.186;

    // A narrow viewport has almost no spare horizontal field of view. Keep
    // the authored outward drift composition on desktop, but progressively
    // bring every rig's gaze back toward the vehicle on portrait screens so a
    // full rail skim never crops the player's steering silhouette.
    const portraitFollow = clamp((0.82 - finite(this.camera.aspect, 1.6)) / 0.4, 0, 1);
    if (portraitFollow > 0) {
      for (const rig of Object.values(this.rigs)) {
        const vehicleBiasedLookX = vehicleX + (rig.look.x - vehicleX) * 0.3;
        const vehicleBiasedPositionX = vehicleX + (rig.position.x - vehicleX) * 0.65;
        rig.look.x = MathUtils.lerp(rig.look.x, vehicleBiasedLookX, portraitFollow);
        rig.position.x = MathUtils.lerp(rig.position.x, vehicleBiasedPositionX, portraitFollow);
        rig.screenTarget *= MathUtils.lerp(1, 0.88, portraitFollow);
      }
    }

    for (const rig of Object.values(this.rigs)) {
      rig.fov = clamp(rig.fov, this.minimumFov, this.reducedMotion ? Math.min(72, this.maximumFov) : this.maximumFov);
      rig.roll = clamp(rig.roll, -0.72, 0.72);
    }

    // Keep launch meaningful only while a surface still exists. In the current
    // morph contract, the space segment's `launch` value remains one after its
    // first few percent and therefore cannot be used as a general camera weight.
    context.isSurface = segment.type !== 'space';
    context.isSpace = segment.type === 'space';
    context.morphAmount = saturate(morph.morph);
  }

  _updateWeights(context, dt, snap = false) {
    const { state, isSurface, isSpace, boost, launch, landing, departure = 0 } = context;
    const releaseEnvelope = smoothstep01(this.releaseTimer / this.releaseDuration) * this.releaseStrength;
    const touchdownEnvelope = smoothstep01(this.touchdownTimer / this.touchdownDuration);
    const targets = {
      drive: 1,
      drift: isSurface && state.riderState === 'air' ? 0.56 + saturate(state.trickMeter) * 0.44 : 0,
      // Boost pulls the release rig in HARD. At 0.52 the widened, pulled-back
      // camera was never more than half present, so half of an effect that was
      // already too small for anyone to see.
      'trick-landed/boost': isSurface ? Math.max(releaseEnvelope, boost * 0.95) : 0,
      launch: isSurface ? smoothstep01(launch) : departure,
      'space-combat': isSpace ? (1 - smoothstep01(landing)) * (1 - departure * 0.72) : 0,
      reentry: isSpace ? smoothstep01(landing) : 0,
      touchdown: isSurface ? touchdownEnvelope : 0,
    };

    for (const [name, spring] of Object.entries(this.weights)) {
      if (snap) {
        spring.value = targets[name];
        spring.velocity = 0;
      } else {
        stepCriticalScalar(spring, targets[name], WEIGHT_FREQUENCIES[name], dt);
      }
      spring.value = saturate(spring.value);
    }
  }

  _composeRig() {
    const composite = copyRig(this.compositeRig, this.rigs.drive);
    for (const name of RIG_ORDER) {
      blendRig(composite, this.rigs[name], this.weights[name].value);
    }
    composite.fov = clamp(
      composite.fov,
      this.minimumFov,
      this.reducedMotion ? Math.min(72, this.maximumFov) : this.maximumFov,
    );
    composite.roll = clamp(composite.roll, -0.72, 0.72);
    composite.screenTarget = clamp(composite.screenTarget, 0.05, 0.22);

    const precedence = [...RIG_ORDER].reverse();
    composite.name = precedence.find((name) => this.weights[name].value >= 0.35) ?? 'drive';
    return composite;
  }

  _enforceVehicleFraming(rig) {
    const radians = MathUtils.degToRad(rig.fov);
    const portraitCompensation = clamp(
      0.78 / Math.max(0.45, finite(this.camera.aspect, 1.6)),
      1,
      1.95,
    );
    const requestedDistance = (this.vehicleFramingHeight
      / Math.max(0.001, 2 * rig.screenTarget * Math.tan(radians * 0.5))) * portraitCompensation;
    const distance = clamp(requestedDistance, this.minimumDistance, this.maximumDistance);

    this.framingDirection.copy(rig.position).sub(this.vehicleAnchor);
    if (this.framingDirection.lengthSq() < 0.0001) this.framingDirection.set(0, 0.35, 1);
    this.framingDirection.normalize().multiplyScalar(distance);
    rig.position.copy(this.vehicleAnchor).add(this.framingDirection);
  }

  _measureVehicleFraming(context) {
    const measure = this.framingMeasure;
    const aspect = Math.max(0.2, finite(this.camera.aspect, 1.6));
    const tangent = Math.max(0.001, Math.tan(MathUtils.degToRad(this.camera.fov) * 0.5));
    const morphAmount = saturate(context.morphAmount);
    const roadPitch = Number.isFinite(context.vehiclePitch)
      ? context.vehiclePitch
      : -Math.atan2(
        clamp(finite(context.next.y) - finite(context.current.y), -18, 22),
        80,
      );
    const poseRoll = vehiclePoseRoll({
      roll: finite(context.state.roll),
      driftSide: finite(context.state.spinSide),
      driftCharge: saturate(context.state.trickMeter),
      morph: morphAmount,
    });

    this.vehiclePoseEuler.set(roadPitch, 0, finite(context.vehicleFrame?.bank), 'XYZ');
    this.vehicleRootQuaternion.setFromEuler(this.vehiclePoseEuler);
    this.vehiclePoseEuler.set(
      -morphAmount * 0.035,
      finite(context.state.yaw),
      poseRoll,
      'XYZ',
    );
    this.vehiclePoseQuaternion.setFromEuler(this.vehiclePoseEuler);
    this.vehicleQuaternion.copy(this.vehicleRootQuaternion).multiply(this.vehiclePoseQuaternion).normalize();

    this.vehicleCenterOffset.set(
      0,
      MathUtils.lerp(
        PLAYER_SILHOUETTE_CAR_CENTER_Y,
        PLAYER_SILHOUETTE_ROCKET_CENTER_Y,
        morphAmount,
      ),
      MathUtils.lerp(
        PLAYER_SILHOUETTE_CAR_CENTER_Z,
        PLAYER_SILHOUETTE_ROCKET_CENTER_Z,
        morphAmount,
      ),
    ).applyQuaternion(this.vehicleQuaternion);
    this.vehicleCenter.copy(this.vehicleAnchor).add(this.vehicleCenterOffset);
    this.inverseCameraQuaternion.copy(this.camera.quaternion).invert();
    this.anchorCameraLocal.copy(this.vehicleAnchor)
      .sub(this.camera.position)
      .applyQuaternion(this.inverseCameraQuaternion);
    this.vehicleCenterCameraLocal.copy(this.vehicleCenter)
      .sub(this.camera.position)
      .applyQuaternion(this.inverseCameraQuaternion);

    const anchorDepth = -this.anchorCameraLocal.z;
    const centerDepth = -this.vehicleCenterCameraLocal.z;
    if (!(anchorDepth > 0.05) || !(centerDepth > 0.05)) {
      measure.valid = false;
      measure.anchorX = 0;
      measure.anchorY = 0;
      measure.minX = -Infinity;
      measure.maxX = Infinity;
      measure.minY = -Infinity;
      measure.maxY = Infinity;
      return measure;
    }

    measure.valid = true;
    measure.anchorX = (this.anchorCameraLocal.x / anchorDepth) / (tangent * aspect);
    measure.anchorY = (this.anchorCameraLocal.y / anchorDepth) / tangent;
    measure.minX = Infinity;
    measure.maxX = -Infinity;
    measure.minY = Infinity;
    measure.maxY = -Infinity;

    // Project the measured oriented body box on a conservative silhouette
    // plane. Using 82% of center depth reserves perspective growth for the
    // vehicle's camera-side half without letting a mathematically empty OBB
    // corner at the exhaust tip dictate the composition of the whole race.
    // This is intentionally stricter than the rig's nominal screenTarget while
    // remaining representative of visible body pixels in the chase view.
    const silhouetteDepth = Math.max(0.05, centerDepth * 0.82);
    const centerX = (this.vehicleCenterCameraLocal.x / centerDepth) / (tangent * aspect);
    const centerY = (this.vehicleCenterCameraLocal.y / centerDepth) / tangent;
    const halfLength = MathUtils.lerp(
      PLAYER_SILHOUETTE_CAR_HALF_LENGTH,
      PLAYER_SILHOUETTE_ROCKET_HALF_LENGTH,
      morphAmount,
    );
    for (let xi = -1; xi <= 1; xi += 2) {
      for (let yi = -1; yi <= 1; yi += 2) {
        for (let zi = -1; zi <= 1; zi += 2) {
          this.silhouetteCorner.set(
            xi * PLAYER_SILHOUETTE_HALF_WIDTH,
            yi * PLAYER_SILHOUETTE_HALF_HEIGHT,
            zi * halfLength,
          ).applyQuaternion(this.vehicleQuaternion).add(this.vehicleCenter);
          this.cornerCameraLocal.copy(this.silhouetteCorner)
            .sub(this.camera.position)
            .applyQuaternion(this.inverseCameraQuaternion);
          const x = centerX
            + ((this.cornerCameraLocal.x - this.vehicleCenterCameraLocal.x) / silhouetteDepth)
              / (tangent * aspect);
          const y = centerY
            + ((this.cornerCameraLocal.y - this.vehicleCenterCameraLocal.y) / silhouetteDepth) / tangent;
          measure.minX = Math.min(measure.minX, x);
          measure.maxX = Math.max(measure.maxX, x);
          measure.minY = Math.min(measure.minY, y);
          measure.maxY = Math.max(measure.maxY, y);
        }
      }
    }
    return measure;
  }

  _deriveVehicleSafeEnvelope(measure) {
    const envelope = this.framingEnvelope;
    if (!measure.valid) {
      envelope.fitPossible = false;
      envelope.minX = 0;
      envelope.maxX = 0;
      envelope.minY = 0;
      envelope.maxY = 0;
      return envelope;
    }

    const leftExtent = Math.max(0, measure.anchorX - measure.minX);
    const rightExtent = Math.max(0, measure.maxX - measure.anchorX);
    const bottomExtent = Math.max(0, measure.anchorY - measure.minY);
    const topExtent = Math.max(0, measure.maxY - measure.anchorY);
    envelope.minX = -1 + PLAYER_SILHOUETTE_EDGE_PADDING + leftExtent;
    envelope.maxX = 1 - PLAYER_SILHOUETTE_EDGE_PADDING - rightExtent;
    envelope.minY = -1 + PLAYER_SILHOUETTE_EDGE_PADDING + bottomExtent;
    envelope.maxY = 1 - PLAYER_SILHOUETTE_EDGE_PADDING - topExtent;
    envelope.fitPossible = envelope.minX <= envelope.maxX && envelope.minY <= envelope.maxY;
    if (envelope.minX > envelope.maxX) {
      const midpoint = (envelope.minX + envelope.maxX) * 0.5;
      envelope.minX = midpoint;
      envelope.maxX = midpoint;
    }
    if (envelope.minY > envelope.maxY) {
      const midpoint = (envelope.minY + envelope.maxY) * 0.5;
      envelope.minY = midpoint;
      envelope.maxY = midpoint;
    }
    return envelope;
  }

  _applyLocalFramingCorrection(targetX, targetY, accumulatedYaw, accumulatedPitch) {
    this.currentAnchorDirection.copy(this.anchorCameraLocal).normalize();
    const tangent = Math.max(0.001, Math.tan(MathUtils.degToRad(this.camera.fov) * 0.5));
    const aspect = Math.max(0.2, finite(this.camera.aspect, 1.6));
    this.desiredAnchorDirection.set(
      targetX * tangent * aspect,
      targetY * tangent,
      -1,
    ).normalize();

    const tx = this.desiredAnchorDirection.x;
    const ty = this.desiredAnchorDirection.y;
    const tz = this.desiredAnchorDirection.z;
    const dx = this.currentAnchorDirection.x;
    const dy = this.currentAnchorDirection.y;
    const dz = this.currentAnchorDirection.z;
    const pitchRadius = Math.max(0.000001, Math.hypot(ty, tz));
    const phase = Math.atan2(-tz, ty);
    const reach = Math.acos(clamp(dy / pitchRadius, -1, 1));
    const firstPitch = Math.atan2(Math.sin(phase + reach), Math.cos(phase + reach));
    const secondPitch = Math.atan2(Math.sin(phase - reach), Math.cos(phase - reach));
    let pitch = Math.abs(firstPitch) < Math.abs(secondPitch) ? firstPitch : secondPitch;
    pitch = clamp(pitch, -MAX_FRAMING_PITCH - accumulatedPitch, MAX_FRAMING_PITCH - accumulatedPitch);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const pitchedZ = sinPitch * ty + cosPitch * tz;
    let yaw = Math.atan2(
      dx * pitchedZ - dz * tx,
      dx * tx + dz * pitchedZ,
    );

    yaw = clamp(yaw, -MAX_FRAMING_YAW - accumulatedYaw, MAX_FRAMING_YAW - accumulatedYaw);
    this.safetyYawQuaternion.setFromAxisAngle(WORLD_UP, yaw);
    this.safetyPitchQuaternion.setFromAxisAngle(WORLD_RIGHT, pitch);
    this.safetyCorrectionQuaternion.copy(this.safetyYawQuaternion).multiply(this.safetyPitchQuaternion);
    this.camera.quaternion.multiply(this.safetyCorrectionQuaternion).normalize();
    this.lastFramingYaw = yaw;
    this.lastFramingPitch = pitch;
  }

  _enforceVehicleScreenSafety(context) {
    const safety = this.diagnostics.framingSafety;
    let measure = this._measureVehicleFraming(context);
    safety.preAnchorX = measure.anchorX;
    safety.preAnchorY = measure.anchorY;
    let envelope = this._deriveVehicleSafeEnvelope(measure);
    safety.preMinX = measure.minX;
    safety.preMaxX = measure.maxX;
    safety.preMinY = measure.minY;
    safety.preMaxY = measure.maxY;
    safety.preSafeMinX = envelope.minX;
    safety.preSafeMaxX = envelope.maxX;
    safety.preSafeMinY = envelope.minY;
    safety.preSafeMaxY = envelope.maxY;
    let accumulatedYaw = 0;
    let accumulatedPitch = 0;
    let accumulatedDolly = 0;
    let active = false;

    if (this.framingSafetyEnabled) {
      // Angular recentering changes the projected orientation of a banked
      // silhouette. Alternate bounded fit and recenter phases so a portrait
      // correction cannot make the envelope empty after the only dolly pass.
      for (let phase = 0; phase < 2; phase += 1) {
        // A portrait viewport can make the safe horizontal envelope physically
        // empty even with the anchor centered. Add only the distance required
        // to make it exist, bounded by the rig's declared maximum distance.
        for (let pass = 0; pass < 3 && !envelope.fitPossible; pass += 1) {
          active = true;
          const availableSpan = 2 - PLAYER_SILHOUETTE_EDGE_PADDING * 2;
          const requiredScale = Math.max(
            (measure.maxX - measure.minX) / availableSpan,
            (measure.maxY - measure.minY) / availableSpan,
            1,
          );
          const currentDistance = this.camera.position.distanceTo(this.vehicleAnchor);
          const targetDistance = Math.min(this.maximumDistance, currentDistance * requiredScale * 1.015);
          const dolly = Math.max(0, targetDistance - currentDistance);
          if (dolly <= FRAMING_EPSILON || currentDistance <= FRAMING_EPSILON) break;
          this.safetyDollyDirection.copy(this.camera.position)
            .sub(this.vehicleAnchor)
            .multiplyScalar(1 / currentDistance);
          this.camera.position.addScaledVector(this.safetyDollyDirection, dolly);
          accumulatedDolly += dolly;
          measure = this._measureVehicleFraming(context);
          envelope = this._deriveVehicleSafeEnvelope(measure);
        }

        for (let pass = 0; pass < 5; pass += 1) {
          const outside = measure.anchorX < envelope.minX - FRAMING_EPSILON
            || measure.anchorX > envelope.maxX + FRAMING_EPSILON
            || measure.anchorY < envelope.minY - FRAMING_EPSILON
            || measure.anchorY > envelope.maxY + FRAMING_EPSILON;
          if (!outside) break;
          active = true;
          const targetX = clamp(measure.anchorX, envelope.minX, envelope.maxX);
          const targetY = clamp(measure.anchorY, envelope.minY, envelope.maxY);
          this._applyLocalFramingCorrection(targetX, targetY, accumulatedYaw, accumulatedPitch);
          if (Math.abs(this.lastFramingYaw) <= FRAMING_EPSILON
            && Math.abs(this.lastFramingPitch) <= FRAMING_EPSILON) break;
          accumulatedYaw += this.lastFramingYaw;
          accumulatedPitch += this.lastFramingPitch;
          measure = this._measureVehicleFraming(context);
          envelope = this._deriveVehicleSafeEnvelope(measure);
        }
        if (envelope.fitPossible) break;
      }
    }

    const stillOutside = measure.anchorX < envelope.minX - FRAMING_EPSILON
      || measure.anchorX > envelope.maxX + FRAMING_EPSILON
      || measure.anchorY < envelope.minY - FRAMING_EPSILON
      || measure.anchorY > envelope.maxY + FRAMING_EPSILON;
    safety.enabled = this.framingSafetyEnabled;
    safety.active = active;
    safety.fitPossible = envelope.fitPossible;
    safety.atAngularLimit = active && (
      Math.abs(accumulatedYaw) >= MAX_FRAMING_YAW - FRAMING_EPSILON
      || Math.abs(accumulatedPitch) >= MAX_FRAMING_PITCH - FRAMING_EPSILON
    );
    safety.atDistanceLimit = active
      && this.camera.position.distanceTo(this.vehicleAnchor) >= this.maximumDistance - FRAMING_EPSILON;
    safety.saturated = active && stillOutside;
    safety.correctionYaw = accumulatedYaw;
    safety.correctionPitch = accumulatedPitch;
    safety.correctionDolly = accumulatedDolly;
    safety.postAnchorX = measure.anchorX;
    safety.postAnchorY = measure.anchorY;
    safety.postMinX = measure.minX;
    safety.postMaxX = measure.maxX;
    safety.postMinY = measure.minY;
    safety.postMaxY = measure.maxY;
    safety.safeMinX = envelope.minX;
    safety.safeMaxX = envelope.maxX;
    safety.safeMinY = envelope.minY;
    safety.safeMaxY = envelope.maxY;
  }

  _sampleTrauma(dt) {
    this.traumaTime += dt;
    const level = clamp(this.traumaLevel, 0, 1.35);
    const energy = level * level * (this.reducedMotion ? 0.22 : 1);
    const p = this.traumaPhases;
    const t = this.traumaTime;
    const lowX = Math.sin(t * TAU * 3.7 + p[0]);
    const midX = Math.sin(t * TAU * 8.9 + p[1]);
    const highX = Math.sin(t * TAU * 15.7 + p[2]);
    const lowY = Math.sin(t * TAU * 4.3 + p[3]);
    const highY = Math.sin(t * TAU * 13.1 + p[4]);
    const lowZ = Math.sin(t * TAU * 2.9 + p[5]);
    const highZ = Math.sin(t * TAU * 11.3 + p[6]);
    const rollBand = Math.sin(t * TAU * 7.1 + p[7]) * 0.68
      + Math.sin(t * TAU * 17.9 + p[2]) * 0.32;
    const profile = this.traumaProfile;

    this.traumaOffsetLocal.set(
      (lowX * 0.45 + midX * 0.35 + highX * 0.2) * profile.x * energy,
      (lowY * 0.58 + highY * 0.42) * profile.y * energy,
      (lowZ * 0.62 + highZ * 0.38) * profile.z * energy,
    );

    this.traumaLevel = Math.max(0, this.traumaLevel - profile.decay * dt);
    if (this.traumaLevel <= 0.0001) {
      this.traumaLevel = 0;
      this.traumaType = 'none';
    }
    return rollBand * profile.roll * energy;
  }

  /**
   * Updates and applies the camera.
   *
   * Required integration values are accepted under explicit names; short
   * aliases (`morph`, `current`, and `next`) are also supported.
   */
  update({
    state = {},
    segment = {},
    morphState = null,
    morph = null,
    currentSample = null,
    current = null,
    nextSample = null,
    next = null,
    vehicleFrame = null,
    vehiclePitch = null,
    dt = 1 / 60,
  } = {}) {
    const step = clamp(finite(dt, 1 / 60), 0, 1 / 20);
    const resolvedMorph = morphState ?? morph ?? {};
    const resolvedCurrent = currentSample ?? current ?? {};
    const resolvedNext = nextSample ?? next ?? resolvedCurrent;
    const segmentType = segment.type ?? state.mode ?? 'planet';
    const speed = finite(state.speed, finite(segment.baseSpeed));
    const baseSpeed = finite(segment.baseSpeed);
    const maxSpeed = Math.max(baseSpeed + 1, finite(segment.maxSpeed, baseSpeed + 1));
    const speedNorm = saturate((speed - baseSpeed) / (maxSpeed - baseSpeed));
    const boost = saturate(state.boost);
    const launch = saturate(resolvedMorph.launch);
    const landing = saturate(resolvedMorph.landing);
    const segmentScale = state.short ? 0.075 : 1;
    const segmentFraction = saturate(finite(state.segmentProgress)
      / Math.max(1, finite(segment.length, 1) * segmentScale));
    // Keep the launch camera attached to the physical outbound arc for the
    // first few percent of Space, then hand smoothly to the combat chase rig.
    const departure = segmentType === 'space'
      ? 1 - smoothstep01(segmentFraction / 0.055)
      : 0;

    let releasedThisFrame = false;
    const wasAirborne = this.previousAirborne;
    const landedThisFrame = this.initialized && wasAirborne && state.riderState !== 'air';
    if (landedThisFrame) {
      const commitment = saturate(this.previousTrickMeter);
      const releaseStrength = clamp(0.06 + Math.pow(commitment, 0.9) * 0.94, 0.06, 1);
      this.trauma('trick-landed', releaseStrength);
      releasedThisFrame = true;
    }
    if (this.initialized && !releasedThisFrame && segmentType !== 'space' && boost - this.previousBoost > 0.06) {
      this.releaseTimer = Math.max(this.releaseTimer, this.releaseDuration * 0.8);
      this.trauma('boost', clamp((boost - this.previousBoost) * 3.2, 0.3, 1));
    }
    if (this.initialized && this.previousSegmentType === 'space' && segmentType !== 'space') {
      this.touchdownTimer = this.touchdownDuration;
      this.trauma('touchdown', 1);
    }

    this.elapsed += step;
    this.releaseTimer = Math.max(0, this.releaseTimer - step);
    if (this.releaseTimer <= 0) this.releaseStrength = 0;
    this.touchdownTimer = Math.max(0, this.touchdownTimer - step);

    const context = {
      state,
      segment: { ...segment, type: segmentType },
      morph: resolvedMorph,
      current: resolvedCurrent,
      next: resolvedNext,
      speedNorm,
      boost,
      launch,
      landing,
      departure,
      isSurface: segmentType !== 'space',
      isSpace: segmentType === 'space',
      morphAmount: saturate(resolvedMorph.morph),
      vehicleFrame,
      vehiclePitch,
    };

    this._setRigTargets(context);
    this._updateWeights(context, step, !this.initialized);
    const target = this._composeRig();
    this._enforceVehicleFraming(target);

    const response = RESPONSE_FREQUENCIES[target.name] ?? RESPONSE_FREQUENCIES.drive;
    if (!this.initialized) {
      this.position.copy(target.position);
      this.positionVelocity.set(0, 0, 0);
      this.look.copy(target.look);
      this.lookVelocity.set(0, 0, 0);
      this.fovSpring.value = target.fov;
      this.fovSpring.velocity = 0;
      this.rollSpring.value = target.roll;
      this.rollSpring.velocity = 0;
      this.initialized = true;
    } else if (step > 0) {
      stepCriticalVector(this.position, this.positionVelocity, target.position, response.position, step);
      stepCriticalVector(this.look, this.lookVelocity, target.look, response.look, step);
      stepCriticalScalar(this.fovSpring, target.fov, response.fov, step);
      stepCriticalScalar(this.rollSpring, target.roll, response.roll, step);
    }

    this.fovSpring.value = clamp(
      this.fovSpring.value,
      this.minimumFov,
      this.reducedMotion ? Math.min(72, this.maximumFov) : this.maximumFov,
    );
    this.rollSpring.value = clamp(this.rollSpring.value, -0.72, 0.72);

    const traumaRoll = this._sampleTrauma(step);
    this.lookMatrix.lookAt(this.position, this.look, WORLD_UP);
    this.baseQuaternion.setFromRotationMatrix(this.lookMatrix);
    this.traumaOffsetWorld.copy(this.traumaOffsetLocal).applyQuaternion(this.baseQuaternion);

    this.camera.position.copy(this.position).add(this.traumaOffsetWorld);
    this.lookMatrix.lookAt(this.camera.position, this.look, WORLD_UP);
    this.camera.quaternion.setFromRotationMatrix(this.lookMatrix);
    this.rollQuaternion.setFromAxisAngle(CAMERA_FORWARD, this.rollSpring.value + traumaRoll);
    this.camera.quaternion.multiply(this.rollQuaternion).normalize();
    this.camera.up.copy(WORLD_UP);

    if (Math.abs(this.camera.fov - this.fovSpring.value) > 0.0001) {
      this.camera.fov = this.fovSpring.value;
      this.camera.updateProjectionMatrix();
    }
    this._enforceVehicleScreenSafety(context);

    this.diagnostics.rig = target.name;
    this.diagnostics.rigName = target.name;
    this.diagnostics.fov = Number(this.camera.fov.toFixed(3));
    this.diagnostics.vehicleScreenTarget = Number(target.screenTarget.toFixed(4));
    this.diagnostics.launchWeight = Number(this.weights.launch.value.toFixed(6));
    this.diagnostics.trauma = Number(this.traumaLevel.toFixed(4));
    this.diagnostics.traumaType = this.traumaType;
    this.diagnostics.distance = Number(this.camera.position.distanceTo(this.vehicleAnchor).toFixed(4));
    this.diagnostics.roll = Number(this.rollSpring.value.toFixed(4));
    this.diagnostics.position = this.camera.position.toArray().map((value) => Number(value.toFixed(4)));
    this.diagnostics.look = this.look.toArray().map((value) => Number(value.toFixed(4)));

    this.previousAirborne = state.riderState === 'air';
    this.previousTrickMeter = saturate(state.trickMeter);
    this.previousBoost = boost;
    this.previousSegmentType = segmentType;

    return this.diagnostics;
  }
}

export default CameraDirector;
