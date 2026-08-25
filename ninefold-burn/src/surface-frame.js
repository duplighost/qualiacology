const ROAD_BASE_Y = -0.52;
const ROAD_CENTER_CROWN = 0.13;
const VEHICLE_ROOT_Y_FLAT = 0.2;
const VEHICLE_POSE_ANCHOR_HEIGHT = 0.28;
const VEHICLE_SURFACE_CLEARANCE = VEHICLE_ROOT_Y_FLAT - (ROAD_BASE_Y + ROAD_CENTER_CROWN);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const lerp = (a, b, t) => a + (b - a) * t;

function roadColumnVertical(column, columns) {
  const u = (column / (columns - 1)) * 2 - 1;
  const edge = Math.abs(u);
  const crown = (1 - Math.pow(edge, 1.45)) * ROAD_CENTER_CROWN;
  const shoulderT = clamp((edge - 0.78) / 0.22, 0, 1);
  const smoothShoulder = shoulderT * shoulderT * (3 - 2 * shoulderT);
  return crown - smoothShoulder * 0.22;
}

/**
 * Matches the authored road ribbon's crown and shoulder profile exactly.
 * `unitLateral` is the road-normalized coordinate used by renderer.js.
 */
export function roadVerticalAtUnitLateral(unitLateral, columns = 15) {
  const safeColumns = Math.max(2, Math.round(finite(columns, 15)));
  const clamped = clamp(finite(unitLateral), -1, 1);
  const columnPosition = (clamped * 0.5 + 0.5) * (safeColumns - 1);
  const leftColumn = Math.min(safeColumns - 2, Math.max(0, Math.floor(columnPosition)));
  const amount = columnPosition - leftColumn;
  return lerp(
    roadColumnVertical(leftColumn, safeColumns),
    roadColumnVertical(leftColumn + 1, safeColumns),
    amount,
  );
}

/**
 * Writes a surface-local contact point for an effect whose parent counter-
 * translates the current track sample by `(-currentX, -currentY, +progress)`.
 * Applying the clearance along the bank normal keeps the effect exactly above
 * the crowned road without tangent leakage on either banking sign.
 */
export function writeTrackSurfaceLocalContactFrame(target, {
  currentX = 0,
  currentY = 0,
  width = 1,
  bank = 0,
  lateral = 0,
  progress = 0,
  roadColumns = 15,
  normalClearance = 0.02,
} = {}) {
  const output = target ?? {};
  const safeWidth = Math.max(0.000001, Math.abs(finite(width, 1)));
  const safeLateral = finite(lateral);
  const safeBank = finite(bank);
  const unitLateral = clamp(safeLateral / safeWidth, -1, 1);
  const roadVertical = roadVerticalAtUnitLateral(unitLateral, roadColumns);
  const surfaceHeight = roadVertical + finite(normalClearance, 0.02);
  const cos = Math.cos(safeBank);
  const sin = Math.sin(safeBank);

  output.x = finite(currentX) + safeLateral * cos - surfaceHeight * sin;
  output.y = finite(currentY) + ROAD_BASE_Y + safeLateral * sin + surfaceHeight * cos;
  output.z = -finite(progress);
  output.bank = safeBank;
  output.unitLateral = unitLateral;
  output.roadVertical = roadVertical;
  output.normalClearance = finite(normalClearance, 0.02);
  return output;
}

/** Shared pose-roll contract for the rendered asset and camera silhouette. */
export function vehiclePoseRoll({
  roll = 0,
  driftSide = 0,
  driftCharge = 0,
  morph = 0,
} = {}) {
  const rawMorph = clamp(finite(morph), 0, 1);
  const m = rawMorph * rawMorph * (3 - 2 * rawMorph);
  const car = 1 - m;
  const surfaceDrift = clamp(finite(driftCharge), 0, 1) * car;
  const side = Math.sign(finite(driftSide));
  const safeRoll = finite(roll);
  return safeRoll - side * surfaceDrift * 0.112;
}

/**
 * Writes the player's root and pose anchor in the same banked local frame as
 * the physical road ribbon. The `surface` blend detaches that frame during
 * launch and acquires it during reentry without moving the legacy free-flight
 * anchor. Callers provide `target` so the render hot path allocates nothing.
 */
export function writeVehicleSurfaceFrame(target, {
  lateral = 0,
  width = 1,
  bank = 0,
  surface = 0,
  lift = 0,
  roadColumns = 15,
  pitch = 0,
} = {}) {
  const output = target ?? {};
  const safeLateral = finite(lateral);
  const safeWidth = Math.max(0.000001, Math.abs(finite(width, 1)));
  const safeBank = finite(bank);
  const surfaceAmount = clamp(finite(surface), 0, 1);
  const safeLift = finite(lift);
  const unitLateral = clamp(safeLateral / safeWidth, -1, 1);
  const roadVertical = roadVerticalAtUnitLateral(unitLateral, roadColumns);
  const cos = Math.cos(safeBank);
  const sin = Math.sin(safeBank);
  const normalOffset = roadVertical + VEHICLE_SURFACE_CLEARANCE;

  // Full-contact pose: move laterally along the ribbon's banked right vector,
  // then outward along its normal by the clearance that produced y=.2 on the
  // original flat, crowned road. This preserves the old centre-lane stance.
  const bankedRootX = safeLateral * cos - normalOffset * sin;
  const bankedRootY = ROAD_BASE_Y + safeLateral * sin + normalOffset * cos;
  const rootX = lerp(safeLateral, bankedRootX, surfaceAmount);
  const rootY = lerp(VEHICLE_ROOT_Y_FLAT, bankedRootY, surfaceAmount);
  const rootBank = safeBank * surfaceAmount;
  const rootCos = Math.cos(rootBank);
  const rootSin = Math.sin(rootBank);
  const poseHeight = VEHICLE_POSE_ANCHOR_HEIGHT + safeLift;
  const rootPitch = finite(pitch);

  output.x = rootX;
  output.y = rootY;
  output.bank = rootBank;
  output.anchorX = rootX - poseHeight * rootSin;
  output.anchorY = rootY + poseHeight * rootCos * Math.cos(rootPitch);
  output.anchorZ = poseHeight * rootCos * Math.sin(rootPitch);
  output.unitLateral = unitLateral;
  output.roadVertical = roadVertical;
  output.surface = surfaceAmount;
  output.pitch = rootPitch;
  return output;
}

export const SURFACE_FRAME_CONSTANTS = Object.freeze({
  roadBaseY: ROAD_BASE_Y,
  roadCenterCrown: ROAD_CENTER_CROWN,
  vehicleRootYFlat: VEHICLE_ROOT_Y_FLAT,
  vehiclePoseAnchorHeight: VEHICLE_POSE_ANCHOR_HEIGHT,
  vehicleSurfaceClearance: VEHICLE_SURFACE_CLEARANCE,
});
