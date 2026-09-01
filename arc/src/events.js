// A tiny event bus. Every reward and refusal in the game is an event, and the listener
// audit test fails the build if an emitted event has no visual and no audio listener
// (SPACEBOARDING's biggest payout was wired to nothing for two rounds).
export const EVENTS = Object.freeze([
  'charge', 'gather', 'throw', 'throwRefused', 'stick', 'hang', 'latch', 'unlatch', 'pop',
  'call', 'callRefused', 'earlyCall', 'catchSoft', 'catchDash', 'fall', 'respawn', 'giveUp',
  'lantern', 'bossDown', 'chapterWake', 'wave', 'stab', 'stabWarn', 'surface', 'dive', 'ending', 'endingStand', 'grindStart', 'grindStop',
]);

export class EventBus {
  constructor() { this.listeners = new Map(); this.log = []; this.counts = {}; }
  on(name, fn, tag = 'visual') {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push({ fn, tag });
    return () => { const l = this.listeners.get(name); const i = l.findIndex(e => e.fn === fn); if (i >= 0) l.splice(i, 1); };
  }
  emit(name, data = {}) {
    this.counts[name] = (this.counts[name] || 0) + 1;
    if (this.log.length < 4000) this.log.push({ name, t: data.t ?? 0, data });
    const l = this.listeners.get(name);
    if (l) for (const e of l) { try { e.fn(data); } catch (err) { console.error('listener failed for ' + name, err); } }
  }
  // For the audit: which tags listen to each event.
  audit() {
    const out = {};
    for (const name of EVENTS) {
      const l = this.listeners.get(name) || [];
      out[name] = { visual: l.some(e => e.tag === 'visual'), audio: l.some(e => e.tag === 'audio'), count: l.length };
    }
    return out;
  }
}
