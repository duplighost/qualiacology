const PACKAGE_MAGIC = Object.freeze([0x4e, 0x46, 0x53, 0x43, 0x50, 0x31, 0x42, 0x31]); // NFSCP1B1
const PACKAGE_VERSION = 1;
const PACKAGE_HEADER_BYTES = 24;
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const ATTRIBUTE_ORDER = Object.freeze(['position', 'color', 'uv', 'normal']);
const STATIC_DRAW_USAGE = 35044;
const EXACT_GEOMETRIES = Object.freeze([
  Object.freeze({ name: 'static-scoria-road', role: 'road', rows: 1134, columns: 15, indexCount: 95172, attributes: Object.freeze({ position: [51030, 3], color: [51030, 3], uv: [34020, 2], normal: [51030, 3] }) }),
  Object.freeze({ name: 'static-scoria-terrain', role: 'terrain', rows: 568, columns: 34, indexCount: 112266, attributes: Object.freeze({ position: [57936, 3], color: [57936, 3], uv: [38624, 2], normal: [57936, 3] }) }),
  Object.freeze({ name: 'static-scoria-lava-left', role: 'lava-left', rows: 568, columns: 9, indexCount: 27216, attributes: Object.freeze({ position: [15336, 3], color: [15336, 3], uv: [10224, 2], normal: [15336, 3] }) }),
  Object.freeze({ name: 'static-scoria-lava-right', role: 'lava-right', rows: 568, columns: 9, indexCount: 27216, attributes: Object.freeze({ position: [15336, 3], color: [15336, 3], uv: [10224, 2], normal: [15336, 3] }) }),
  ...Array.from({ length: 5 }, (_, index) => Object.freeze({
    name: `static-scoria-line-${index}`,
    role: `line-${index}`,
    rows: 568,
    columns: 1,
    indexCount: 0,
    attributes: Object.freeze({ position: [1704, 3] }),
  })),
]);
const TYPED_ARRAYS = Object.freeze({
  Float32Array,
  Float64Array,
  Uint16Array,
  Uint32Array,
});

export const STATIC_SCORIA_PACKAGE_SCHEMA = 'ninefold-static-scoria-v1';
export const STATIC_SCORIA_PACKAGE_ASSET = 'scoria-static-p1-v1.bin';
// Filled from the checked-in generator output. Runtime verifies this before a
// readiness record can become fulfilled, covering manifest, bounds and payload.
export const STATIC_SCORIA_PACKAGE_SHA256 = '358c1318c7843e641704d68c5f5dc2f5ac7f8de01e6b96aceadeb7230d538382';
export const STATIC_SCORIA_PACKAGE_URL = new URL(
  `../assets/geometry/runtime/${STATIC_SCORIA_PACKAGE_ASSET}`,
  import.meta.url,
);

const align = (value, boundary) => Math.ceil(value / boundary) * boundary;
const isLittleEndian = () => new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
const makeExpectedProgress = (spacing) => {
  const rows = [];
  const round = (value) => Number(value.toFixed(6));
  for (let progress = -180; progress < 8200 - 0.000001; progress += spacing) rows.push(round(progress));
  if (rows.at(-1) !== 8200) rows.push(8200);
  for (let progress = 8200 + spacing; progress < 8305 - 0.000001; progress += spacing) rows.push(round(progress));
  if (rows.at(-1) !== 8305) rows.push(8305);
  if (!rows.includes(8292)) {
    rows.push(8292);
    rows.sort((left, right) => left - right);
  }
  return Float64Array.from(rows);
};
const compareExactBytes = (actual, expected, label) => {
  if (actual.byteLength !== expected.byteLength) throw new Error(`Static Scoria package ${label} byte length is not exact.`);
  const actualBytes = new Uint8Array(actual.buffer, actual.byteOffset, actual.byteLength);
  const expectedBytes = new Uint8Array(expected.buffer, expected.byteOffset, expected.byteLength);
  for (let index = 0; index < expectedBytes.length; index += 1) {
    if (actualBytes[index] !== expectedBytes[index]) {
      throw new Error(`Static Scoria package ${label} differs at byte ${index}.`);
    }
  }
};
const finiteVector = (values, label) => {
  if (!Array.isArray(values) || values.length !== 3 || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`Static Scoria package ${label} must contain three finite numbers.`);
  }
  return values;
};

function normalizeArrayBuffer(source) {
  if (source instanceof ArrayBuffer) return source;
  if (ArrayBuffer.isView(source)) {
    return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  }
  throw new TypeError('Static Scoria package source must be an ArrayBuffer or typed-array view.');
}

function arrayDescriptor(array, itemSize, normalized, usage, offset) {
  return {
    type: array.constructor.name,
    count: array.length,
    itemSize,
    normalized: Boolean(normalized),
    usage,
    offset,
    bytes: array.byteLength,
  };
}

function validateDescriptor(descriptor, label, payloadBytes, occupied) {
  if (!descriptor || typeof descriptor !== 'object') {
    throw new Error(`Static Scoria package ${label} descriptor is missing.`);
  }
  const Constructor = TYPED_ARRAYS[descriptor.type];
  if (!Constructor) throw new Error(`Static Scoria package ${label} has unsupported type ${descriptor.type}.`);
  for (const field of ['count', 'itemSize', 'usage', 'offset', 'bytes']) {
    if (!Number.isInteger(descriptor[field]) || descriptor[field] < 0) {
      throw new Error(`Static Scoria package ${label}.${field} must be a non-negative integer.`);
    }
  }
  if (descriptor.itemSize < 1) throw new Error(`Static Scoria package ${label}.itemSize must be positive.`);
  const expectedBytes = descriptor.count * Constructor.BYTES_PER_ELEMENT;
  if (descriptor.bytes !== expectedBytes) {
    throw new Error(`Static Scoria package ${label} has ${descriptor.bytes} bytes; expected ${expectedBytes}.`);
  }
  if (descriptor.offset % Constructor.BYTES_PER_ELEMENT !== 0) {
    throw new Error(`Static Scoria package ${label} is not ${Constructor.BYTES_PER_ELEMENT}-byte aligned.`);
  }
  const end = descriptor.offset + descriptor.bytes;
  if (end > payloadBytes) throw new Error(`Static Scoria package ${label} exceeds its payload.`);
  for (const range of occupied) {
    if (descriptor.offset < range.end && end > range.start) {
      throw new Error(`Static Scoria package ${label} overlaps ${range.label}.`);
    }
  }
  occupied.push({ start: descriptor.offset, end, label });
}

function validateBounds(bounds, label) {
  if (!bounds || typeof bounds !== 'object') throw new Error(`Static Scoria package ${label} bounds are missing.`);
  finiteVector(bounds.box?.min, `${label}.box.min`);
  finiteVector(bounds.box?.max, `${label}.box.max`);
  finiteVector(bounds.sphere?.center, `${label}.sphere.center`);
  if (!Number.isFinite(bounds.sphere?.radius) || bounds.sphere.radius < 0) {
    throw new Error(`Static Scoria package ${label}.sphere.radius must be finite and non-negative.`);
  }
}

function validateManifest(manifest, payloadBytes) {
  if (!manifest || manifest.schema !== STATIC_SCORIA_PACKAGE_SCHEMA || manifest.version !== PACKAGE_VERSION) {
    throw new Error('Static Scoria package schema/version mismatch.');
  }
  if (manifest.littleEndian !== true || !isLittleEndian()) {
    throw new Error('Static Scoria package requires a little-endian runtime.');
  }
  if (manifest.payloadBytes !== payloadBytes) {
    throw new Error(`Static Scoria package payload has ${payloadBytes} bytes; manifest declares ${manifest.payloadBytes}.`);
  }
  if (!Array.isArray(manifest.geometries) || manifest.geometryCount !== manifest.geometries.length) {
    throw new Error('Static Scoria package geometry count is inconsistent.');
  }
  if (manifest.geometryCount !== 9 || manifest.arrayCount !== 25 || manifest.residentBytes !== 2605844) {
    throw new Error('Static Scoria package failed the exact 9/25/2,605,844 census.');
  }
  const occupied = [];
  validateDescriptor(manifest.roadProgress, 'roadProgress', payloadBytes, occupied);
  validateDescriptor(manifest.surfaceProgress, 'surfaceProgress', payloadBytes, occupied);
  if (manifest.roadProgress.type !== 'Float64Array' || manifest.surfaceProgress.type !== 'Float64Array') {
    throw new Error('Static Scoria progress rows must be Float64Array payloads.');
  }
  if (manifest.roadProgress.count !== 1134 || manifest.surfaceProgress.count !== 568
    || manifest.roadProgress.itemSize !== 1 || manifest.surfaceProgress.itemSize !== 1
    || manifest.roadProgress.normalized || manifest.surfaceProgress.normalized) {
    throw new Error('Static Scoria package progress descriptor census is not exact.');
  }
  let residentBytes = 0;
  let arrayCount = 0;
  const names = new Set();
  for (const [geometryIndex, geometry] of manifest.geometries.entries()) {
    const label = `geometries[${geometryIndex}]`;
    const invariant = EXACT_GEOMETRIES[geometryIndex];
    if (typeof geometry.name !== 'string' || !geometry.name || names.has(geometry.name)) {
      throw new Error(`Static Scoria package ${label} has a missing or duplicate name.`);
    }
    names.add(geometry.name);
    if (!Number.isInteger(geometry.rows) || geometry.rows < 1
      || !Number.isInteger(geometry.columns) || geometry.columns < 1) {
      throw new Error(`Static Scoria package ${label} rows/columns are invalid.`);
    }
    if (!invariant || geometry.name !== invariant.name || geometry.role !== invariant.role
      || geometry.rows !== invariant.rows || geometry.columns !== invariant.columns) {
      throw new Error(`Static Scoria package ${label} identity/topology is not exact.`);
    }
    if (!geometry.drawRange || !Number.isInteger(geometry.drawRange.start) || geometry.drawRange.start < 0
      || !(geometry.drawRange.count === null
        || (Number.isInteger(geometry.drawRange.count) && geometry.drawRange.count >= 0))) {
      throw new Error(`Static Scoria package ${label} draw range is invalid.`);
    }
    if (geometry.drawRange.start !== 0 || geometry.drawRange.count !== null) {
      throw new Error(`Static Scoria package ${label} must retain the full/infinite authoring draw range.`);
    }
    validateBounds(geometry.bounds, label);
    if (geometry.index) {
      validateDescriptor(geometry.index, `${label}.index`, payloadBytes, occupied);
      if (invariant.indexCount === 0 || geometry.index.type !== 'Uint16Array'
        || geometry.index.itemSize !== 1 || geometry.index.count !== invariant.indexCount
        || geometry.index.normalized || geometry.index.usage !== STATIC_DRAW_USAGE) {
        throw new Error(`Static Scoria package ${label}.index contract is not exact.`);
      }
      residentBytes += geometry.index.bytes;
      arrayCount += 1;
    } else if (invariant.indexCount !== 0) {
      throw new Error(`Static Scoria package ${label} is missing its exact index payload.`);
    }
    if (!Array.isArray(geometry.attributes) || geometry.attributes.length < 1) {
      throw new Error(`Static Scoria package ${label} has no attributes.`);
    }
    const attributeNames = geometry.attributes.map((attribute) => attribute.name);
    const expectedOrder = ATTRIBUTE_ORDER.filter((name) => attributeNames.includes(name));
    if (attributeNames.length !== expectedOrder.length
      || attributeNames.some((name, index) => name !== expectedOrder[index])) {
      throw new Error(`Static Scoria package ${label} attribute order must be position,color,uv,normal.`);
    }
    if (attributeNames[0] !== 'position') {
      throw new Error(`Static Scoria package ${label} must begin with a position attribute.`);
    }
    const invariantNames = Object.keys(invariant.attributes);
    if (attributeNames.length !== invariantNames.length
      || attributeNames.some((name, index) => name !== invariantNames[index])) {
      throw new Error(`Static Scoria package ${label} attribute family is not exact.`);
    }
    for (const attribute of geometry.attributes) {
      validateDescriptor(attribute, `${label}.${attribute.name}`, payloadBytes, occupied);
      const [expectedCount, expectedItemSize] = invariant.attributes[attribute.name];
      if (attribute.type !== 'Float32Array' || attribute.count !== expectedCount
        || attribute.itemSize !== expectedItemSize || attribute.normalized
        || attribute.usage !== STATIC_DRAW_USAGE) {
        throw new Error(`Static Scoria package ${label}.${attribute.name} contract is not exact.`);
      }
      residentBytes += attribute.bytes;
      arrayCount += 1;
    }
  }
  if (!Array.isArray(manifest.padding)) throw new Error('Static Scoria package padding table is missing.');
  for (const [index, padding] of manifest.padding.entries()) {
    if (!Number.isInteger(padding.offset) || padding.offset < 0
      || !Number.isInteger(padding.bytes) || padding.bytes < 1
      || padding.offset + padding.bytes > payloadBytes) {
      throw new Error(`Static Scoria package padding[${index}] is invalid.`);
    }
    const end = padding.offset + padding.bytes;
    for (const range of occupied) {
      if (padding.offset < range.end && end > range.start) {
        throw new Error(`Static Scoria package padding[${index}] overlaps ${range.label}.`);
      }
    }
    occupied.push({ start: padding.offset, end, label: `padding[${index}]` });
  }
  occupied.sort((left, right) => left.start - right.start);
  if (occupied[0]?.start !== 0 || occupied.at(-1)?.end !== payloadBytes) {
    throw new Error('Static Scoria package payload coverage is incomplete.');
  }
  for (let index = 1; index < occupied.length; index += 1) {
    if (occupied[index - 1].end !== occupied[index].start) {
      throw new Error('Static Scoria package payload contains an overlap or undeclared gap.');
    }
  }
  if (residentBytes !== manifest.residentBytes || arrayCount !== manifest.arrayCount) {
    throw new Error('Static Scoria package resident-byte or array-count census is inconsistent.');
  }
  return manifest;
}

function makeView(buffer, payloadOffset, descriptor) {
  const Constructor = TYPED_ARRAYS[descriptor.type];
  return new Constructor(buffer, payloadOffset + descriptor.offset, descriptor.count);
}

export function decodeStaticScoriaSurfacePackage(source) {
  const buffer = normalizeArrayBuffer(source);
  if (buffer.byteLength < PACKAGE_HEADER_BYTES) throw new Error('Static Scoria package is shorter than its header.');
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < PACKAGE_MAGIC.length; index += 1) {
    if (bytes[index] !== PACKAGE_MAGIC[index]) throw new Error('Static Scoria package magic mismatch.');
  }
  const view = new DataView(buffer);
  const version = view.getUint32(8, true);
  const manifestBytes = view.getUint32(12, true);
  const payloadOffset = view.getUint32(16, true);
  const payloadBytes = view.getUint32(20, true);
  if (version !== PACKAGE_VERSION) throw new Error(`Static Scoria package version ${version} is unsupported.`);
  if (payloadOffset % 8 !== 0 || payloadOffset < PACKAGE_HEADER_BYTES + manifestBytes
    || payloadOffset + payloadBytes !== buffer.byteLength) {
    throw new Error('Static Scoria package header offsets are invalid.');
  }
  let manifest;
  try {
    manifest = JSON.parse(TEXT_DECODER.decode(bytes.subarray(PACKAGE_HEADER_BYTES, PACKAGE_HEADER_BYTES + manifestBytes)));
  } catch (error) {
    throw new Error(`Static Scoria package manifest is invalid JSON: ${error?.message ?? error}`);
  }
  validateManifest(manifest, payloadBytes);
  const roadProgress = makeView(buffer, payloadOffset, manifest.roadProgress);
  const surfaceProgress = makeView(buffer, payloadOffset, manifest.surfaceProgress);
  compareExactBytes(roadProgress, makeExpectedProgress(7.5), 'roadProgress');
  compareExactBytes(surfaceProgress, makeExpectedProgress(15), 'surfaceProgress');
  for (const [index, padding] of manifest.padding.entries()) {
    const paddingBytes = bytes.subarray(payloadOffset + padding.offset, payloadOffset + padding.offset + padding.bytes);
    if (paddingBytes.some((value) => value !== 0)) {
      throw new Error(`Static Scoria package padding[${index}] contains non-zero data.`);
    }
  }
  const geometries = manifest.geometries.map((geometry) => ({
    ...geometry,
    indexArray: geometry.index ? makeView(buffer, payloadOffset, geometry.index) : null,
    attributeArrays: Object.fromEntries(geometry.attributes.map((attribute) => [
      attribute.name,
      makeView(buffer, payloadOffset, attribute),
    ])),
  }));
  return {
    buffer,
    bytes: buffer.byteLength,
    manifestBytes,
    payloadOffset,
    payloadBytes,
    manifest,
    roadProgress,
    surfaceProgress,
    geometries,
  };
}

export function encodeStaticScoriaSurfacePackage({ roadProgress, surfaceProgress, geometries }) {
  if (!(roadProgress instanceof Float64Array) || !(surfaceProgress instanceof Float64Array)) {
    throw new TypeError('Static Scoria authoring progress rows must be Float64Array values.');
  }
  if (!Array.isArray(geometries) || geometries.length < 1) {
    throw new TypeError('Static Scoria authoring geometries are required.');
  }
  const payloads = [];
  const padding = [];
  let payloadBytes = 0;
  const alignPayload = (boundary) => {
    const nextOffset = align(payloadBytes, boundary);
    if (nextOffset > payloadBytes) padding.push({ offset: payloadBytes, bytes: nextOffset - payloadBytes });
    payloadBytes = nextOffset;
  };
  const append = (array, itemSize, normalized, usage) => {
    alignPayload(array.BYTES_PER_ELEMENT);
    const descriptor = arrayDescriptor(array, itemSize, normalized, usage, payloadBytes);
    payloads.push({ array, offset: payloadBytes });
    payloadBytes += array.byteLength;
    return descriptor;
  };
  const roadProgressDescriptor = append(roadProgress, 1, false, 0);
  const surfaceProgressDescriptor = append(surfaceProgress, 1, false, 0);
  let residentBytes = 0;
  let arrayCount = 0;
  const geometryRecords = geometries.map(({ geometry, role, rows, columns }) => {
    if (!geometry?.isBufferGeometry) throw new TypeError(`Static Scoria ${role ?? 'geometry'} is not BufferGeometry.`);
    if (!geometry.boundingBox || !geometry.boundingSphere) {
      throw new Error(`Static Scoria ${geometry.name || role || 'geometry'} has no stored bounds.`);
    }
    const index = geometry.index
      ? append(geometry.index.array, 1, geometry.index.normalized, geometry.index.usage)
      : null;
    if (index) {
      residentBytes += index.bytes;
      arrayCount += 1;
    }
    const attributes = [];
    for (const name of ATTRIBUTE_ORDER) {
      const attribute = geometry.getAttribute(name);
      if (!attribute) continue;
      const descriptor = append(attribute.array, attribute.itemSize, attribute.normalized, attribute.usage);
      attributes.push({ name, ...descriptor });
      residentBytes += descriptor.bytes;
      arrayCount += 1;
    }
    return {
      name: geometry.name,
      role,
      rows,
      columns,
      drawRange: {
        // The package is an immutable authoring surface. Runtime derives its
        // moving row window after activation; never serialize a live/prewarm
        // window from whichever frame happened to run before the generator.
        start: 0,
        count: null,
      },
      bounds: {
        box: {
          min: geometry.boundingBox.min.toArray(),
          max: geometry.boundingBox.max.toArray(),
        },
        sphere: {
          center: geometry.boundingSphere.center.toArray(),
          radius: geometry.boundingSphere.radius,
        },
      },
      index,
      attributes,
    };
  });
  alignPayload(8);
  const manifest = {
    schema: STATIC_SCORIA_PACKAGE_SCHEMA,
    version: PACKAGE_VERSION,
    littleEndian: true,
    geometryCount: geometryRecords.length,
    arrayCount,
    residentBytes,
    payloadBytes,
    padding,
    roadProgress: roadProgressDescriptor,
    surfaceProgress: surfaceProgressDescriptor,
    geometries: geometryRecords,
  };
  const manifestData = TEXT_ENCODER.encode(JSON.stringify(manifest));
  const payloadOffset = align(PACKAGE_HEADER_BYTES + manifestData.byteLength, 8);
  const buffer = new ArrayBuffer(payloadOffset + payloadBytes);
  const bytes = new Uint8Array(buffer);
  bytes.set(PACKAGE_MAGIC, 0);
  const view = new DataView(buffer);
  view.setUint32(8, PACKAGE_VERSION, true);
  view.setUint32(12, manifestData.byteLength, true);
  view.setUint32(16, payloadOffset, true);
  view.setUint32(20, payloadBytes, true);
  bytes.set(manifestData, PACKAGE_HEADER_BYTES);
  for (const payload of payloads) {
    bytes.set(new Uint8Array(payload.array.buffer, payload.array.byteOffset, payload.array.byteLength), payloadOffset + payload.offset);
  }
  // Decode the completed asset before returning it. Authoring can never emit a
  // package that runtime validation would reject.
  const decoded = decodeStaticScoriaSurfacePackage(buffer);
  return { buffer, manifest: decoded.manifest, decoded };
}

let bakedStaticScoriaRequest = null;

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export function preloadBakedStaticScoriaSurfacePackage({ priority = 'auto' } = {}) {
  if (bakedStaticScoriaRequest) return bakedStaticScoriaRequest;
  const startedAt = performance.now();
  const controller = new AbortController();
  const request = {
    status: 'pending',
    startedAt,
    settledAt: null,
    responseMs: null,
    fetchMs: null,
    shaMs: null,
    decodeMs: null,
    readyMs: null,
    sha256: null,
    value: null,
    error: null,
    abandonedReason: null,
    promise: null,
    abandon(reason = 'Static Scoria package was not consumed.') {
      if (request.status === 'pending') {
        request.status = 'abandoned';
        request.abandonedReason = reason;
        request.settledAt = performance.now();
        request.readyMs = request.settledAt - startedAt;
        controller.abort();
      } else if (request.status === 'fulfilled') {
        request.status = 'released';
        request.abandonedReason = reason;
        request.value = null;
      }
    },
  };
  request.promise = fetch(STATIC_SCORIA_PACKAGE_URL, { priority, signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load baked static Scoria package: HTTP ${response.status}`);
      request.responseMs = performance.now() - startedAt;
      return response.arrayBuffer();
    })
    .then(async (buffer) => {
      request.fetchMs = performance.now() - startedAt;
      const shaStartedAt = performance.now();
      const sha256 = await sha256Hex(buffer);
      request.shaMs = performance.now() - shaStartedAt;
      // The track boundary can abandon while SubtleCrypto owns this buffer.
      // Do not parse a package that can no longer win the startup race.
      if (request.status === 'abandoned') return null;
      if (STATIC_SCORIA_PACKAGE_SHA256 && sha256 !== STATIC_SCORIA_PACKAGE_SHA256) {
        throw new Error(`Baked static Scoria package SHA-256 ${sha256} does not match ${STATIC_SCORIA_PACKAGE_SHA256}.`);
      }
      const decodeStartedAt = performance.now();
      const value = decodeStaticScoriaSurfacePackage(buffer);
      request.decodeMs = performance.now() - decodeStartedAt;
      // Retain only packages still owned by a live consumer. This second gate
      // also documents the ownership boundary immediately before publication.
      if (request.status === 'abandoned') return null;
      request.status = 'fulfilled';
      request.settledAt = performance.now();
      request.readyMs = request.settledAt - startedAt;
      request.sha256 = sha256;
      request.value = {
        ...value,
        responseMs: request.responseMs,
        fetchMs: request.fetchMs,
        shaMs: request.shaMs,
        decodeMs: request.decodeMs,
        readyMs: request.readyMs,
        sha256,
      };
      // Consumers inspect the settled record synchronously. Never retain the
      // package a second time as the Promise's fulfillment value.
      return null;
    })
    .catch((error) => {
      if (request.status === 'abandoned' || error?.name === 'AbortError') return null;
      request.status = 'rejected';
      request.settledAt = performance.now();
      request.readyMs = request.settledAt - startedAt;
      request.error = error;
      // This request is deliberately consumed synchronously at the pre-track
      // boundary. Resolve the observer promise so an early network failure can
      // never become an unhandled rejection while WebGL construction blocks.
      return null;
    });
  bakedStaticScoriaRequest = request;
  return request;
}
