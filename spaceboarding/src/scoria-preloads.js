let bakedScoriaEnvironmentRequest = null;

export function preloadBakedScoriaEnvironmentData() {
  if (bakedScoriaEnvironmentRequest) return bakedScoriaEnvironmentRequest;
  const startedAt = performance.now();
  bakedScoriaEnvironmentRequest = fetch(
    new URL('../assets/textures/runtime/scoria-environment-float32-640x320-v1.bin', import.meta.url),
  )
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load baked Scoria environment: HTTP ${response.status}`);
      return response.arrayBuffer();
    })
    .then((buffer) => {
      const expectedBytes = 640 * 320 * 4 * Float32Array.BYTES_PER_ELEMENT;
      if (buffer.byteLength !== expectedBytes) {
        throw new Error(`Baked Scoria environment has ${buffer.byteLength} bytes; expected ${expectedBytes}.`);
      }
      if (new Uint8Array(new Uint16Array([1]).buffer)[0] !== 1) {
        throw new Error('Baked Scoria environment requires a little-endian Float32 runtime.');
      }
      return {
        data: new Float32Array(buffer),
        bytes: buffer.byteLength,
        fetchMs: performance.now() - startedAt,
      };
    });
  return bakedScoriaEnvironmentRequest;
}
