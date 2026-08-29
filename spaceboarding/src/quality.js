export function chooseInitialQuality(params = new URLSearchParams(location.search)) {
  const explicit = params.get('quality');
  if (['low', 'medium', 'high'].includes(explicit)) return explicit;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const memory = navigator.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  if (coarse || memory <= 4 || cores <= 4) return 'low';
  if (memory <= 8 || cores <= 6) return 'medium';
  return 'high';
}
