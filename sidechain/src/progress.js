// What you've earned, kept in this browser: points become experience, experience fills
// levels, each level is one pick of a new board (or rider, or the bonus track). Grades and best
// scores per song. Everything here survives a blocked localStorage (a private window): it just isn't kept.

const KEY = 'lc-progress';
const blank = () => ({ xp: 0, level: 1, picks: 0, owned: ['classic'], board: 'classic', rider: 'classic', ridersOwned: ['classic'], songsOwned: [], songs: {} });
const listOf = (p, kind) => (kind === 'rider' ? p.ridersOwned : kind === 'song' ? p.songsOwned : p.owned);

// points to fill each level: the first comes in a song or two, then a little more each time
export function levelNeed(level) { return 24000 + 14000 * (level - 1); }

let mem = null;
function load() {
  if (mem) return mem;
  try { const raw = localStorage.getItem(KEY); mem = raw ? { ...blank(), ...JSON.parse(raw) } : blank(); }
  catch (e) { mem = blank(); }
  if (!Array.isArray(mem.owned)) mem.owned = ['classic'];
  if (!mem.owned.includes('classic')) mem.owned.unshift('classic');
  if (!Array.isArray(mem.ridersOwned)) mem.ridersOwned = ['classic'];
  if (!Array.isArray(mem.songsOwned)) mem.songsOwned = [];
  if (!mem.songs || typeof mem.songs !== 'object') mem.songs = {};
  return mem;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* private window: kept for this visit only */ } }

export const progress = {
  get() { return load(); },
  song(id) { return load().songs[id] || null; },
  // a finished ride: returns what changed, for the end card to count up
  finish(id, points, grade) {
    const p = load();
    const before = { xp: p.xp, level: p.level, picks: p.picks };
    const s = p.songs[id] || (p.songs[id] = { best: 0, grade: null, plays: 0 });
    const rank = (g) => (g ? 'DCBAS'.indexOf(g) : -1);
    const newBest = points > s.best;
    const newGrade = rank(grade) > rank(s.grade);
    s.plays++;
    if (newBest) s.best = points;
    if (newGrade) s.grade = grade;
    p.xp += points;
    const ups = [];
    while (p.xp >= levelNeed(p.level)) { p.xp -= levelNeed(p.level); p.level++; p.picks++; ups.push(p.level); }
    save();
    return { before, after: { xp: p.xp, level: p.level, picks: p.picks }, ups, newBest, newGrade, best: s.best, grade: s.grade };
  },
  // spend a pick on a board (or a rider, or a song)
  unlock(kind, id) {
    const p = load();
    const list = listOf(p, kind);
    if (list.includes(id) || p.picks < 1) return false;
    p.picks--; list.push(id);
    if (kind === 'rider') p.rider = id; else if (kind === 'board') p.board = id;
    save(); return true;
  },
  choose(kind, id) {
    const p = load();
    const list = listOf(p, kind);
    if (!list.includes(id)) return false;
    if (kind === 'rider') p.rider = id; else if (kind === 'board') p.board = id;
    save(); return true;
  },
};
