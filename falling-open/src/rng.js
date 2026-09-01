export class RNG {
  constructor(seed = 0x6d2b79f5) {
    this.state = (Number(seed) >>> 0) || 0x6d2b79f5;
  }

  next() {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 4294967296;
  }

  range(min, max) { return min + (max - min) * this.next(); }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
}

export function hashString(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

