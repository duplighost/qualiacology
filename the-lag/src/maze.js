// Maze generation (recursive backtracker) + helpers.
// Walls live on cell EDGES. The whole labyrinth is a spanning tree of open cells;
// every remaining wall becomes a pane of glass.

export function rngFrom(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// vWall[r][c]  : vertical wall on the LEFT edge of cell (r,c). c in [0..cols]
// hWall[r][c]  : horizontal wall on the TOP edge of cell (r,c). r in [0..rows]
export function makeMaze(cols, rows, rng = Math.random) {
  const vWall = Array.from({ length: rows }, () => new Array(cols + 1).fill(true));
  const hWall = Array.from({ length: rows + 1 }, () => new Array(cols).fill(true));
  const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const stack = [];
  let cr = (rng() * rows) | 0, cc = (rng() * cols) | 0;
  seen[cr][cc] = true;
  stack.push([cr, cc]);

  const neighbors = (r, c) => {
    const out = [];
    if (r > 0 && !seen[r - 1][c]) out.push([r - 1, c, 'N']);
    if (r < rows - 1 && !seen[r + 1][c]) out.push([r + 1, c, 'S']);
    if (c > 0 && !seen[r][c - 1]) out.push([r, c - 1, 'W']);
    if (c < cols - 1 && !seen[r][c + 1]) out.push([r, c + 1, 'E']);
    return out;
  };

  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const ns = neighbors(r, c);
    if (!ns.length) { stack.pop(); continue; }
    const [nr, nc, dir] = ns[(rng() * ns.length) | 0];
    if (dir === 'N') hWall[r][c] = false;
    else if (dir === 'S') hWall[r + 1][c] = false;
    else if (dir === 'W') vWall[r][c] = false;
    else if (dir === 'E') vWall[r][c + 1] = false;
    seen[nr][nc] = true;
    stack.push([nr, nc]);
  }

  // Braid a little: knock out a few dead-ends so the space loops back on itself.
  // (A pure tree feels too solvable; loops make the mirrors lie better.)
  const braid = Math.floor(cols * rows * 0.10);
  for (let i = 0; i < braid; i++) {
    const r = (rng() * rows) | 0, c = (rng() * cols) | 0;
    // count open sides
    let open = 0;
    if (!hWall[r][c]) open++; if (!hWall[r + 1][c]) open++;
    if (!vWall[r][c]) open++; if (!vWall[r][c + 1]) open++;
    if (open > 1) continue; // only relieve dead-ends
    const cand = [];
    if (r > 0 && hWall[r][c]) cand.push(['h', r, c]);
    if (r < rows - 1 && hWall[r + 1][c]) cand.push(['h', r + 1, c]);
    if (c > 0 && vWall[r][c]) cand.push(['v', r, c]);
    if (c < cols - 1 && vWall[r][c + 1]) cand.push(['v', r, c + 1]);
    if (!cand.length) continue;
    const [t, rr, cc2] = cand[(rng() * cand.length) | 0];
    if (t === 'h') hWall[rr][cc2] = false; else vWall[rr][cc2] = false;
  }

  return { cols, rows, vWall, hWall };
}

// BFS distance field from a start cell; returns farthest cell + map.
export function distanceField(maze, sr, sc) {
  const { cols, rows, vWall, hWall } = maze;
  const dist = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  dist[sr][sc] = 0;
  const q = [[sr, sc]];
  let head = 0, best = [sr, sc], bestD = 0;
  while (head < q.length) {
    const [r, c] = q[head++];
    const d = dist[r][c];
    if (d > bestD) { bestD = d; best = [r, c]; }
    if (r > 0 && !hWall[r][c] && dist[r - 1][c] < 0) { dist[r - 1][c] = d + 1; q.push([r - 1, c]); }
    if (r < rows - 1 && !hWall[r + 1][c] && dist[r + 1][c] < 0) { dist[r + 1][c] = d + 1; q.push([r + 1, c]); }
    if (c > 0 && !vWall[r][c] && dist[r][c - 1] < 0) { dist[r][c - 1] = d + 1; q.push([r, c - 1]); }
    if (c < cols - 1 && !vWall[r][c + 1] && dist[r][c + 1] < 0) { dist[r][c + 1] = d + 1; q.push([r, c + 1]); }
  }
  return { cell: best, dist: bestD, map: dist };
}

// Next step (r,c) along the shortest path from `from` toward `to`, using a BFS
// predecessor walk. Returns null if unreachable or already there.
export function stepToward(maze, from, to) {
  const { cols, rows, vWall, hWall } = maze;
  const [fr, fc] = from, [tr, tc] = to;
  if (fr === tr && fc === tc) return null;
  const prev = Array.from({ length: rows }, () => new Array(cols).fill(null));
  const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
  seen[fr][fc] = true;
  const q = [[fr, fc]];
  let head = 0;
  while (head < q.length) {
    const [r, c] = q[head++];
    if (r === tr && c === tc) break;
    const push = (nr, nc) => { if (!seen[nr][nc]) { seen[nr][nc] = true; prev[nr][nc] = [r, c]; q.push([nr, nc]); } };
    if (r > 0 && !hWall[r][c]) push(r - 1, c);
    if (r < rows - 1 && !hWall[r + 1][c]) push(r + 1, c);
    if (c > 0 && !vWall[r][c]) push(r, c - 1);
    if (c < cols - 1 && !vWall[r][c + 1]) push(r, c + 1);
  }
  if (!seen[tr][tc]) return null;
  // walk back from target to the cell right after `from`
  let cur = [tr, tc];
  while (prev[cur[0]][cur[1]] && !(prev[cur[0]][cur[1]][0] === fr && prev[cur[0]][cur[1]][1] === fc)) {
    cur = prev[cur[0]][cur[1]];
  }
  return cur;
}
