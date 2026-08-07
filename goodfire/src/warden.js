// GOODFIRE warden.js — the body and the verbs (Module A; owner: verbs agent).
// Conforms to docs/canon-final.md (numbers law), docs/interfaces.md (signatures law),
// docs/spec-verbs.md (owning spec). Pure module: no DOM, Node-importable; every state
// machine advances on 30 Hz TICKS so headless step(n) reproduces feel exactly.
//
// The one locomotion law: movement is NEVER stolen by any ceremony. The single exception
// is the live CUT stroke — itself a held player input, released in 0 frames — where the
// mouse is the draftsman's hand and WASD/Shift are ignored (spec-verbs §5.1 decision).

import { GRID, DT, FUEL, S, FLAG, WARDEN, LINE, STOMP, CEREMONY, RETARDANT,
         F_CUTSPEED } from './canon.js';

const idx = (x, y) => y * GRID + x;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

// ---- module-local constants (homed here per interface-freeze protocol; canon.js owns
//      nothing camera/warden-glue — sources cited per line) ----
const STOMP_CD_TICKS = Math.round(STOMP.COOLDOWN_S / DT); // 0.35 s → 11 ticks
const CUT_BLEND_TAU = 0.04;   // PROVISIONAL — spec-verbs §5.2 "blend over 120 ms" realized as
                              // exponential τ=40ms (≈3τ settle); cap changes mid-blend stay smooth
const CUT_STOP_EPS = 0.15;    // PROVISIONAL — cursor-reached deadband (tiles): kills orbit jitter
                              // when the cursor sits on the warden; well under half a stride
const CUT_PROBE = 0.4;        // PROVISIONAL — halt lookahead (tiles): > max stride (0.2), < 1
                              // tile, so the stroke pins at the fire edge without cell-skipping
const ELEV_RISE_PER_STEP = 2 / 30; // canon-final §11: 1 elev unit ≈ 2 m over a 30 m cell —
                              // PROVISIONAL reading: spec-verbs' "terrain gradient" = physical
                              // rise/run, so g = Δelev·(2/30) per tile (sim's ±0.10/step is the
                              // FIRE's slope law; legs feel true grade, not raw elev units)
// pseudo featureIds for anchors the map never stamped (PROVISIONAL ids; the ≥8-apart rule
// tells two touches of the same class apart, which is also physically honest)
const FID_SCAR = 0xFFF0, FID_ROCK = 0xFFF1, FID_WATER = 0xFFF2, FID_RET = 0xFFF3;
const FID_EDGE = 40;          // map.js FEATURE.EDGE — the edge is a real anchor (map.js §doc)

export function createWarden(sim, spawn, callbacks = {}) {
  const { onTieIn, onTieTick, onSizzle, onCedeTick, onGDenied } = callbacks;
  const { fuel, state, flags, load, retard, zoneId, featureId, elev } = sim;

  // ---- body ----
  let x = spawn.x, y = spawn.y;
  let vx = 0, vy = 0;
  let fx = 0, fy = 1;              // facing: last real movement direction (south at boot)

  // ---- verb FSM ----
  let mode = 'idle';               // 'idle'|'cut'|'drip'|'cede'|'aim'
  let cutCap = 0;                  // blended per-fuel cut speed cap (t/s)
  let strokeTarget = WARDEN.RETRACE_SPEED; // what cutCap is blending TOWARD (see layCell)
  let strokeCellX = -1, strokeCellY = -1; // last rasterized stroke cell
  let halted = false;              // stroke pinned against fire edge
  let dripId = 0;                  // one backburnId per hold-stroke (canon-final §5)
  let dripCellX = -1, dripCellY = -1;
  let cedeTicks = 0, cedeZoneId = 0;
  let aimDrag = null;              // {x0,y0} while corridor is being drawn
  let aimCur = null;               // {x0,y0,x1,y1,valid} — reported via verb()
  let stompCd = 0;
  let plantTicks = 0, lastPlantX = -99, lastPlantY = -99;

  // ---- feel QA ----
  let lastCutSpeed = 0, cellsCut = 0, cellsDripped = 0, cellsPlanted = 0;
  let burningGround = false;

  // ================= tie-in detection: union-find over line-cell networks =============
  // Anchors: featureId≠0 (authored rock/water/road), SCAR fuel, bare rock/water (unstamped
  // scree), live retardant, map edge. Distinct = different featureId OR ≥8 apart along the
  // stroke (lay-order seq is the path-distance proxy — PROVISIONAL: exact network-path
  // distance replaced by global lay sequence; contacts merged across strokes keep their seq).
  // Fires ONCE per network (onTieIn); later anchors on a tied network → onTieTick.
  const ufParent = new Map();      // line cell -> parent cell
  const ufMeta = new Map();        // root cell -> {cells:Set, contacts:[{fid,seq}], tied}
  const cellSeq = new Map();       // line cell -> lay order
  let laySeq = 0;

  function ufFind(c) {
    let r = c;
    while (ufParent.get(r) !== r) r = ufParent.get(r);
    while (ufParent.get(c) !== c) { const n = ufParent.get(c); ufParent.set(c, r); c = n; }
    return r;
  }
  function ufMake(c, seq) {
    ufParent.set(c, c);
    ufMeta.set(c, { cells: new Set([c]), contacts: [], tied: false });
    cellSeq.set(c, seq);
  }
  // dedup invariant: stored same-fid contacts are pairwise ≥8 apart, so contacts.length IS
  // the distinct-anchor count (spec-verbs §5.6's rule, made O(contacts) tiny)
  function insertContact(meta, fid, seq) {
    for (const ct of meta.contacts)
      if (ct.fid === fid && Math.abs(ct.seq - seq) < LINE.TIE_ANCHOR_APART) return false;
    meta.contacts.push({ fid, seq });
    return true;
  }
  function ufUnion(a, b) {
    let ra = ufFind(a), rb = ufFind(b);
    if (ra === rb) return ra;
    let ma = ufMeta.get(ra), mb = ufMeta.get(rb);
    if (ma.cells.size < mb.cells.size) { const t = ra; ra = rb; rb = t; const m = ma; ma = mb; mb = m; }
    ufParent.set(rb, ra);
    for (const c of mb.cells) ma.cells.add(c);
    ma.tied = ma.tied || mb.tied;
    for (const ct of mb.contacts) insertContact(ma, ct.fid, ct.seq);
    ufMeta.delete(rb);
    return ra;
  }
  // anchors this cell touches (8-adjacency + the cell's own edge contact)
  function scanAnchors(c, seq, out) {
    const cx = c % GRID, cy = (c / GRID) | 0;
    if (cx === 0 || cy === 0 || cx === GRID - 1 || cy === GRID - 1) out.push({ fid: FID_EDGE, seq });
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const X = cx + dx, Y = cy + dy;
      if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
      const j = idx(X, Y);
      if (flags[j] & FLAG.LINE) continue;          // network member, never an anchor
      const fid = featureId[j];
      if (fid) { out.push({ fid, seq }); continue; }
      if (retard[j] > 0.05) { out.push({ fid: FID_RET, seq }); continue; }
      const f = fuel[j];
      if (f === FUEL.SCAR) out.push({ fid: FID_SCAR, seq });
      else if (f === FUEL.ROCK) out.push({ fid: FID_ROCK, seq });
      else if (f === FUEL.WATER) out.push({ fid: FID_WATER, seq });
    }
  }
  // enclosure check: 4-connected outside flood over the network bbox; lines rasterize
  // 4-connected (no diagonal gaps), so the flood cannot leak through a legal loop
  function loopInterior(meta) {
    let x0 = GRID, y0 = GRID, x1 = 0, y1 = 0;
    for (const c of meta.cells) {
      const cx = c % GRID, cy = (c / GRID) | 0;
      if (cx < x0) x0 = cx; if (cx > x1) x1 = cx;
      if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
    }
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1);
    x1 = Math.min(GRID - 1, x1 + 1); y1 = Math.min(GRID - 1, y1 + 1);
    const W = x1 - x0 + 1, H = y1 - y0 + 1;
    const mark = new Uint8Array(W * H);           // 0 unknown, 1 wall, 2 outside
    for (const c of meta.cells) {
      const cx = c % GRID - x0, cy = ((c / GRID) | 0) - y0;
      if (cx >= 0 && cy >= 0 && cx < W && cy < H) mark[cy * W + cx] = 1;
    }
    const q = [];
    for (let i = 0; i < W; i++) {
      if (!mark[i]) { mark[i] = 2; q.push(i); }
      const b = (H - 1) * W + i;
      if (!mark[b]) { mark[b] = 2; q.push(b); }
    }
    for (let j = 0; j < H; j++) {
      const l = j * W, r = j * W + W - 1;
      if (!mark[l]) { mark[l] = 2; q.push(l); }
      if (!mark[r]) { mark[r] = 2; q.push(r); }
    }
    while (q.length) {
      const p = q.pop();
      const px = p % W, py = (p / W) | 0;
      if (px > 0 && !mark[p - 1]) { mark[p - 1] = 2; q.push(p - 1); }
      if (px < W - 1 && !mark[p + 1]) { mark[p + 1] = 2; q.push(p + 1); }
      if (py > 0 && !mark[p - W]) { mark[p - W] = 2; q.push(p - W); }
      if (py < H - 1 && !mark[p + W]) { mark[p + W] = 2; q.push(p + W); }
    }
    let interior = 0;
    for (let i = 0; i < W * H; i++) if (mark[i] === 0) interior++;
    return interior;
  }
  // register a line cell into the network. isNew = just converted by cutLineCell;
  // retraced/persisted cells (old fires' lines survive — canon-final §6) are adopted
  // lazily, one cell per touch (PROVISIONAL: historical networks are not flood-walked;
  // only the cells the warden actually revisits join the live topology).
  function touchLineCell(c) {
    if (ufParent.has(c)) return;
    const seq = ++laySeq;
    ufMake(c, seq);
    // cycle candidate: two already-mutually-connected neighbors that don't touch each
    // other means this cell closes a ring, not a thickening (spec-verbs §5.6 loop rule)
    const nbr = [];
    const cx = c % GRID, cy = (c / GRID) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const X = cx + dx, Y = cy + dy;
      if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
      const j = idx(X, Y);
      if (!(flags[j] & FLAG.LINE)) continue;
      if (!ufParent.has(j)) { ufMake(j, seq); const ct = []; scanAnchors(j, seq, ct); adopted.push([j, ct]); }
      nbr.push(j);
    }
    let cycle = false;
    for (let a = 0; a < nbr.length && !cycle; a++) for (let b = a + 1; b < nbr.length; b++) {
      const ax = nbr[a] % GRID, ay = (nbr[a] / GRID) | 0;
      const bx = nbr[b] % GRID, by = (nbr[b] / GRID) | 0;
      if (Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1) continue; // touching pair: thickening
      if (ufFind(nbr[a]) === ufFind(nbr[b])) { cycle = true; break; }
    }
    let root = c;
    for (const j of nbr) root = ufUnion(root, j);
    const meta = ufMeta.get(ufFind(root));
    const tiedBefore = meta.tied;
    // contacts: this cell's + any just-adopted neighbors'
    const contacts = [];
    scanAnchors(c, seq, contacts);
    for (const [, ct] of adopted) for (const a of ct) contacts.push(a);
    adopted.length = 0;
    let inserted = 0;
    for (const ct of contacts) if (insertContact(meta, ct.fid, ct.seq)) inserted++;
    // verdicts — once per network, ever (liturgy spent freely is liturgy spent)
    if (!meta.tied && meta.contacts.length >= LINE.TIE_ANCHOR_MIN) {
      meta.tied = true;
      if (onTieIn) onTieIn({ lengthCells: meta.cells.size, anchors: meta.contacts.length });
    } else if (!meta.tied && cycle && meta.cells.size >= LINE.LOOP_MIN_CELLS) {
      if (loopInterior(meta) >= LINE.LOOP_MIN_INTERIOR) {
        meta.tied = true;
        if (onTieIn) onTieIn({ lengthCells: meta.cells.size, anchors: meta.contacts.length });
      }
    } else if (tiedBefore && inserted > 0) {
      if (onTieTick) onTieTick({ anchors: meta.contacts.length });
    }
  }
  const adopted = []; // scratch for lazily-adopted persisted line cells (no allocation churn)

  // ================= movement helpers =================
  function elevAt(cx, cy) { return elev[idx(clamp(cx, 0, GRID - 1), clamp(cy, 0, GRID - 1))]; }
  function slopeMul(dx, dy) {
    if (dx === 0 && dy === 0) return 1;
    const cx = clamp(x | 0, 0, GRID - 1), cy = clamp(y | 0, 0, GRID - 1);
    const gx = (elevAt(cx + 1, cy) - elevAt(cx - 1, cy)) * 0.5 * ELEV_RISE_PER_STEP;
    const gy = (elevAt(cx, cy + 1) - elevAt(cx, cy - 1)) * 0.5 * ELEV_RISE_PER_STEP;
    const g = gx * dx + gy * dy; // rise/run along move dir: + uphill, − downhill
    return clamp(1 - WARDEN.SLOPE_SPEED.PER_GRADE * g, WARDEN.SLOPE_SPEED.MIN, WARDEN.SLOPE_SPEED.MAX);
  }
  function fireState(i) { const st = state[i]; return st === S.HEATING || st === S.BURNING || st === S.EMBERCAST; }
  // collider: slides along rock/deep-water/structures; the map edge is solid ground you
  // cannot leave. 0.35 radius threads a 1-tile gap between boulders (canon).
  function blockedAt(px, py) {
    const r = WARDEN.RADIUS;
    const x0 = Math.floor(px - r), x1 = Math.floor(px + r);
    const y0 = Math.floor(py - r), y1 = Math.floor(py + r);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) return true;
      const f = fuel[idx(cx, cy)];
      if (f !== FUEL.ROCK && f !== FUEL.WATER && f !== FUEL.STRUCTURE) continue;
      const nx = Math.max(cx, Math.min(px, cx + 1)), ny = Math.max(cy, Math.min(py, cy + 1));
      const ddx = px - nx, ddy = py - ny;
      if (ddx * ddx + ddy * ddy < r * r) return true;
    }
    return false;
  }
  // per-fuel cut cap for a fuel the rake has NOT yet converted. Mineral ground (rock/scar/
  // soil: cutSpeed 0) moves no dirt, so it is free travel at 3.5 — a garden path you dug
  // (spec-verbs §5.2)
  function capForFuel(f) {
    const cs = F_CUTSPEED[f];
    return cs > 0 ? cs : WARDEN.RETRACE_SPEED;
  }

  // ================= verb transitions =================
  function beginCut(cx, cy) {
    mode = 'cut';
    halted = false;
    strokeCellX = cx; strokeCellY = cy;
    layCell(cx, cy, true);
    cutCap = strokeTarget; // snap at stroke start; blending is for mid-stroke fuel changes
  }
  function endCut() { mode = 'idle'; halted = false; lastCutSpeed = 0; }
  // Lay one cell. `isStrokeCell` = the cell the BODY just entered (not a bridge fill), i.e.
  // the one whose dirt sets the pace.
  // The blend target is captured HERE, from the fuel the rake bites, at the tick it bites it.
  // It cannot be read back off the cell under the warden: cutLineCell has already stamped
  // FLAG.LINE and cleared the fuel to SOIL there, so reading it after the fact collapsed
  // every stroke to RETRACE_SPEED — grass, brush and slash all cut at 3.5 and the per-fuel
  // feel thesis was silently dead. RETRACE_SPEED is for TRUE retrace only: a stride that
  // converts nothing new (your own finished line, or ground that moves no dirt).
  function layCell(cx, cy, isStrokeCell) {
    const i = idx(cx, cy);
    const wasLine = !!(flags[i] & FLAG.LINE);
    const preFuel = fuel[i];              // read BEFORE the convert — this IS the fix
    const ok = sim.cutLineCell(cx, cy);
    const converted = ok && !wasLine;
    if (converted) cellsCut++;
    if (isStrokeCell) strokeTarget = converted ? capForFuel(preFuel) : WARDEN.RETRACE_SPEED;
    if (!ok) return false;
    touchLineCell(i); // both fresh cuts and retraced old line join the live network
    return true;
  }
  function beginDrip(cx, cy) {
    mode = 'drip';
    dripId = sim.newBackburnId();  // one backburnId per hold-stroke (canon-final §5)
    dripCellX = cx; dripCellY = cy;
    sim.dripCell(cx, cy, dripId);  // tap == 1-cell hold: drip at the feet on press, always
    cellsDripped++;
  }
  function endDrip() { mode = 'idle'; dripId = 0; }
  function cancelCede() { mode = 'idle'; cedeTicks = 0; cedeZoneId = 0; } // silent, free — always
  function cancelAim() { mode = 'idle'; aimDrag = null; aimCur = null; }  // silent (Esc/RMB)

  // ================= the tick =================
  function tick(input, ctx) {
    const scene = (ctx && ctx.scene) || 'fire';
    const keys = input.keys || EMPTY_SET;
    const pressed = input.pressed || EMPTY_SET;
    const mw = input.mouseWorld || { x, y };
    const labor = scene === 'fire' || scene === 'rx';

    if (stompCd > 0) stompCd--;

    // -- Esc: cancels aim or cede channel ONLY (never pauses on the same press — main.js
    // must check verb().mode before routing Esc to the pause menu; spec-verbs §12) --
    if (pressed.has('Escape')) {
      if (mode === 'aim') cancelAim();
      else if (mode === 'cede') cancelCede();
    }

    // -- STOMP: overlay action at any tier, in any mode; locomotion never roots --
    if (pressed.has('Space') && stompCd === 0) {
      sim.stompAt(x, y);
      stompCd = STOMP_CD_TICKS;
    }

    // -- GRANDMOTHER aim entry: a radio call; you put the rake down first (G ignored
    // during strokes). Interlude G = soft radio click, game layer's sound. --
    if (pressed.has('KeyG') && labor && mode !== 'cut' && mode !== 'drip' && mode !== 'aim') {
      if (mode === 'cede') cancelCede();
      if (ctx && (ctx.grandmotherCharges | 0) > 0) { mode = 'aim'; aimDrag = null; aimCur = null; }
      else if (onGDenied) onGDenied(); // she's gone home — the denial line is content's
    }

    // -- verb FSMs --
    let rmbConsumed = false;
    if (mode === 'aim') {
      if (input.rmbPressed) { cancelAim(); rmbConsumed = true; }
    }
    if (mode === 'aim') {
      if (input.lmbPressed && !aimDrag) aimDrag = { x0: mw.x, y0: mw.y };
      if (aimDrag) {
        const dx = mw.x - aimDrag.x0, dy = mw.y - aimDrag.y0;
        const len = Math.hypot(dx, dy);
        const draw = Math.min(len, RETARDANT.LEN_MAX); // >60 clamps: one drop never solves a flank
        const ux = len > 0 ? dx / len : 1, uy = len > 0 ? dy / len : 0;
        aimCur = { x0: aimDrag.x0, y0: aimDrag.y0,
                   x1: aimDrag.x0 + ux * draw, y1: aimDrag.y0 + uy * draw,
                   valid: len >= RETARDANT.LEN_MIN }; // <12 is too short to matter
        if (!input.lmb) {
          if (aimCur.valid) {
            if (ctx && ctx.requestGrandmother) ctx.requestGrandmother(aimCur.x0, aimCur.y0, aimCur.x1, aimCur.y1);
            cancelAim(); // no cancel after confirm — she's flying (the inbound is sim/game state)
          } else { aimDrag = null; aimCur = null; } // released on invalid: stay in aim mode
        }
      }
    } else if (scene === 'interlude') {
      // -- PLANT (the Hoedad): hold-click 0.4 s per seedling (canon-final §9 overrides
      // spec-verbs' 3/s stream); min spacing 1 tile; targeting/satchel policed by ctx.plant --
      if (mode === 'cut' || mode === 'drip') { mode = 'idle'; dripId = 0; } // scene change hygiene
      if (input.lmb) {
        plantTicks++;
        if (plantTicks >= CEREMONY.PLANT_HOLD_TICKS) {
          const px = Math.floor(mw.x), py = Math.floor(mw.y);
          if (Math.hypot(px - lastPlantX, py - lastPlantY) >= 1) {
            if (ctx && ctx.plant && ctx.plant(px, py)) { cellsPlanted++; lastPlantX = px; lastPlantY = py; }
            plantTicks = 0; // the gesture spent itself whether or not the dirt took it
          } // spacing too tight: stay ripe, plant the instant the cursor leads a tile away
        }
      } else plantTicks = 0;
    } else if (labor) {
      // precedence: first-pressed button wins; a stroke press cancels a cede channel
      // (one ceremony at a time; the hands are full — spec-verbs §12)
      if (input.lmbPressed && mode !== 'drip' && mode !== 'cut') {
        if (mode === 'cede') cancelCede();
        beginCut(clamp(x | 0, 0, GRID - 1), clamp(y | 0, 0, GRID - 1));
      }
      if (mode === 'cut' && !input.lmb) endCut();
      if (input.rmbPressed && !rmbConsumed && mode !== 'cut' && mode !== 'drip') {
        if (mode === 'cede') cancelCede();
        beginDrip(clamp(x | 0, 0, GRID - 1), clamp(y | 0, 0, GRID - 1));
      }
      if (mode === 'drip' && !input.rmb) endDrip();

      // -- SACRIFICE channel: hold X over a named, un-ceded zone under the CURSOR;
      // ticks at 0.4/0.8 s; release = silent free cancel; movement stays fully live --
      if (mode === 'idle' || mode === 'cede') {
        const mi = (mw.x >= 0 && mw.y >= 0 && mw.x < GRID && mw.y < GRID) ? idx(mw.x | 0, mw.y | 0) : -1;
        const z = mi >= 0 ? zoneId[mi] : 0;
        const named = z !== 0 && !sim.zonesCeded.has(z);
        if (keys.has('KeyX') && named) {
          if (mode !== 'cede' || cedeZoneId !== z) { mode = 'cede'; cedeZoneId = z; cedeTicks = 0; }
          cedeTicks++;
          if (onCedeTick && (cedeTicks === CEREMONY.CEDE_TICK_AT[0] || cedeTicks === CEREMONY.CEDE_TICK_AT[1]))
            onCedeTick(cedeTicks === CEREMONY.CEDE_TICK_AT[0] ? 0 : 1);
          if (cedeTicks >= CEREMONY.CEDE_HOLD_TICKS) {
            const zc = cedeZoneId;
            cancelCede();
            if (ctx && ctx.cedeZone) ctx.cedeZone(zc); // game layer writes sim.zonesCeded + ledger
          }
        } else if (mode === 'cede') cancelCede(); // left the zone or let go of X: no sound, no penalty
      }
    }

    // -- steering: one authority. CUT = the mouse; everything else = WASD --
    const here = idx(clamp(x | 0, 0, GRID - 1), clamp(y | 0, 0, GRID - 1));
    let dx = 0, dy = 0, cap = WARDEN.SPRINT;
    if (mode === 'cut') {
      const ddx = mw.x - x, ddy = mw.y - y;
      const d = Math.hypot(ddx, ddy);
      if (d > CUT_STOP_EPS) { dx = ddx / d; dy = ddy / d; }
      // cap blends 120 ms when the fuel being cut changes: the rake meeting heavier dirt
      cutCap += (strokeTarget - cutCap) * (1 - Math.exp(-DT / CUT_BLEND_TAU));
      cap = cutCap;
      // CUT halt law: the rake moves dirt, not fire. Probe the cell the steering leads
      // into; if it burns, the stroke pins at the edge and HOLDS (latched — one sizzle
      // per pin) until the cursor leads somewhere legal or the cell burns out.
      if (dx !== 0 || dy !== 0) {
        const ni = idx(clamp((x + dx * CUT_PROBE) | 0, 0, GRID - 1),
                       clamp((y + dy * CUT_PROBE) | 0, 0, GRID - 1));
        if (ni !== here && fireState(ni)) {
          dx = 0; dy = 0; vx = 0; vy = 0;
          if (!halted) { halted = true; if (onSizzle) onSizzle({ cell: ni }); }
        } else halted = false;
      } else halted = false;
    } else {
      if (keys.has('KeyW')) dy -= 1;
      if (keys.has('KeyS')) dy += 1;
      if (keys.has('KeyA')) dx -= 1;
      if (keys.has('KeyD')) dx += 1;
      const d = Math.hypot(dx, dy);
      if (d > 0) { dx /= d; dy /= d; } // diagonals are not faster; the map is honest
      if (mode === 'drip') cap = WARDEN.DRIP_SPEED; // carrying live fire: the gravest walk
    }
    burningGround = state[here] === S.BURNING || state[here] === S.EMBERCAST;
    cap *= slopeMul(dx, dy) * (burningGround ? WARDEN.BURNING_SPEED_MUL : 1);

    // accel/decel per axis: ACCEL when committing, DECEL when standing down or reversing
    const tx = dx * cap, ty = dy * cap;
    const rx = (Math.abs(tx) > Math.abs(vx) && tx * vx >= 0) ? WARDEN.ACCEL : WARDEN.DECEL;
    const ry = (Math.abs(ty) > Math.abs(vy) && ty * vy >= 0) ? WARDEN.ACCEL : WARDEN.DECEL;
    vx += clamp(tx - vx, -rx * DT, rx * DT);
    vy += clamp(ty - vy, -ry * DT, ry * DT);

    // -- move & slide (per-axis, blocked axis zeroed so the wall doesn't store energy) --
    let px = x + vx * DT;
    if (blockedAt(px, y)) { px = x; vx = 0; }
    let py = y + vy * DT;
    if (blockedAt(px, py)) { py = y; vy = 0; }
    x = clamp(px, WARDEN.RADIUS, GRID - WARDEN.RADIUS);
    y = clamp(py, WARDEN.RADIUS, GRID - WARDEN.RADIUS);

    const sp = Math.hypot(vx, vy);
    if (sp > 0.1) { fx = vx / sp; fy = vy / sp; }
    if (mode === 'cut') lastCutSpeed = sp;

    // -- stroke rasterization: 4-connected, one cell per stride (6 t/s = 0.2 t/tick, a
    // cell boundary at most once per tick). Diagonal steps fill the bridging cell with
    // higher load; tie → lower index. Deterministic — NO rngFeel (canon-final §6). --
    const cx = clamp(x | 0, 0, GRID - 1), cy = clamp(y | 0, 0, GRID - 1);
    if (mode === 'cut' && (cx !== strokeCellX || cy !== strokeCellY)) {
      const sdx = cx - strokeCellX, sdy = cy - strokeCellY;
      if (sdx !== 0 && sdy !== 0 && Math.abs(sdx) <= 1 && Math.abs(sdy) <= 1) {
        const ia = idx(cx, strokeCellY), ib = idx(strokeCellX, cy);
        let first = ia, second = ib;
        if (load[ib] > load[ia] || (load[ib] === load[ia] && ib < ia)) { first = ib; second = ia; }
        // bridge costs no time (same stride) and never sets the pace — the body is in the
        // destination cell, so that cell's dirt is what the legs feel. If the picked cell
        // refuses (burning), the other still tries — determinism holds, the leak (if any)
        // is physically honest
        if (!layCell(first % GRID, (first / GRID) | 0, false))
          layCell(second % GRID, (second / GRID) | 0, false);
      }
      layCell(cx, cy, true);
      strokeCellX = cx; strokeCellY = cy;
    }
    // -- drip trail: one fuel-cell per tile walked; the 0.8 s fuse ripple is sim's --
    if (mode === 'drip' && (cx !== dripCellX || cy !== dripCellY)) {
      sim.dripCell(cx, cy, dripId);
      cellsDripped++;
      dripCellX = cx; dripCellY = cy;
    }
  }
  const EMPTY_SET = new Set();

  // ================= public surface =================
  return {
    tick,
    pos: () => ({ x, y }),
    vel: () => ({ x: vx, y: vy }),
    facing: () => ({ x: fx, y: fy }),
    verb: () => ({
      mode,
      cutSpeed: mode === 'cut' ? cutCap : 0,
      cedeT01: mode === 'cede' ? cedeTicks / CEREMONY.CEDE_HOLD_TICKS : 0,
      aim: mode === 'aim' ? aimCur : null, // null until the corridor drag begins
      stompCooldown01: stompCd / STOMP_CD_TICKS,
      backburnId: mode === 'drip' ? dripId : 0,
    }),
    metrics: () => ({
      lastCutSpeed, cellsCut, cellsDripped, cellsPlanted,
      halted, burningGround,
      networks: ufMeta.size,
      plantHold01: plantTicks / CEREMONY.PLANT_HOLD_TICKS,
    }),
  };
}
