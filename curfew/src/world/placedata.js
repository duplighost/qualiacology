// CURFEW — placedata: the authored destination table.
//
// FIFTEEN majors over the 4 x 4 km county, plus the minor-site vocabulary and the
// rationing weights that space them along the roads. This file is DATA ONLY: it imports
// no THREE, touches no scene, and every number in it was measured against the real
// terrain and road field before it was typed (tools/probe, 2026-09-02) rather than
// guessed from the map picture.
//
// donor: Projects/qualiacology/skyshard/src/world/destdata.js — the row schema (id, name,
//   x/z, region, kind, discovery radius, xp) and the separation law it is audited against,
//   read 2026-09-02. SKYSHARD keys `region` to an index into regions.js; here it is a
//   STRING that names the AUTHORED region (DESIGN section 2's seven), which is not the same
//   thing as terrain.regionAt()'s four-kernel field. See the note under REGION_TINT.
//
// THE THREE LAWS THIS TABLE IS AUDITED AGAINST (DESIGN section 2, "Destination law"):
//   1. no two majors within 600 m         — measured minimum below is 721 m (manor <-> bell;
//                                            it was 677 m briar <-> bell before ROUND 6)
//   2. every major has a road within 40 m — measured maximum below is 29.7 m
//   3. every major sits on a level pad    — every row either carries `flat` or names an
//      existing disc in `flatId`; slope at every centre measured <= 0.03
//
// MEASURED at each centre (heightAt / slopeAt / roadDistance / regionAt, 2026-09-02):
//   filling-station  h  16.4  slope 0.00  road  0.0   marsh
//   blackthorn-manor h  35.6  slope 0.00  road 20.0   pines   (ROUND 6: on Briar House's pad,
//                                                            20 m past the spur end; see the row)
//   weeping-mine     h  89.4  slope 0.00  road  0.2   fields
//   relay            h 121.3  slope 0.00  road 27.6   ridge
//   cathedral        h  86.5  slope 0.00  road 28.9   fields
//   chapel           h 110.4  slope 0.03  road 26.0   ridge
//   gallowsfen       h  15.0  slope 0.00  road 18.9   pines   (moisture 0.67)
//   drowned-light    h   2.7  slope 0.02  road 26.5   pines   (lowest ground on the loop)
//   hollow-mill      h  58.2  slope 0.01  road 24.0   pines
//   garden-of-rest   h 117.5  slope 0.01  road 28.0   ridge
//   bell-tower       h  86.6  slope 0.02  road 25.3   pines   (moisture 0.81)
//   jackfield        h  75.6  slope 0.01  road 29.7   fields
//
// The nine loop destinations are the odd control points of the county loop, pushed 24-30 m
// radially off the centreline so the road runs PAST the yard instead of THROUGH the
// building. Odd indices only, because adjacent control points are ~434 m apart and the
// separation law wants 600.
//
// WHY EVERY `blend` IS 0.62. blend is the inner fraction of a FLATS disc that is dead level;
// the rest is a graded verge. These discs are large and several of them sit on the county
// loop, so terrain.heightAt changes under the ROAD as well as under the yard, and roads.js
// resamples its spline from that. Measured over all 1380 road samples, 8 m apart:
//
//                        mean gradient   worst gradient
//   M0, before places        0.0821          0.3124
//   blend 0.66-0.72          0.0848          0.3719   <- a new worst, at the chapel
//   blend 0.62 (shipped)     0.0845          0.3124   <- the same worst as M0's own
//
// A wider graded ring costs nothing and gives the pads back for free: relief inside an
// 18 m building footprint is 0.08 m WITH the discs and up to 7.44 m without them.

/* ------------------------------------------------------------------ *
 * Region tint — the colour of a place's map pin and of the light
 * it puts in the sky once it is claimed.
 *
 * These key the AUTHORED region names from DESIGN section 2 (seven of them), not
 * terrain.regionAt()'s four gaussian kernels (pines/fields/marsh/ridge). The two agree
 * about mood, never about borders, and making the pin colour depend on a smooth field
 * would mean a destination's own colour changes as you walk around it. Authored wins.
 * ------------------------------------------------------------------ */
import { STAGED_KINDS } from './staged.js';

export const REGION_TINT = Object.freeze({
  pines: 0x63d08a,    // cold green
  fields: 0xd8c46a,   // dry gold — Jackfield's corn
  fen: 0x74c8d8,      // sick teal — Gallowsfen's water
  ridge: 0xb9c8ee,    // moon blue — the highest ground
  works: 0xe08a4a,    // ember orange — the only warm light in the county
  shore: 0xa8dcff,    // pale ice — the reservoir
});

/** Fallback so a mistyped region can never produce a black (invisible) pin or claim light. */
export const DEFAULT_TINT = 0x9fb4d8;

/* ------------------------------------------------------------------ *
 * terrainRegion — the row's flavour region, mapped onto a REAL one.
 *
 * `region` above is authored flavour and three of its names ('shore', 'works', 'fen')
 * do not exist anywhere else in the build: terrain.js ships exactly four kernels, and
 * other lanes (audio beds, flora kits, the director's spawn tables) index their tables
 * by THAT id. A lane reading `region` off one of these rows would have missed its table
 * and fallen back silently, which is the working-but-wrong failure this game keeps
 * shipping. So every row now also carries `terrainRegion`, and it is not a guess: it is
 * terrain.regionAt()'s own answer at that centre, measured 2026-09-02 and listed in the
 * MEASURED block at the top of this file. Read `terrainRegion` for anything mechanical;
 * read `region` only for the map/claim colour and the prose.
 *
 * They disagree on purpose in four places — the cathedral is authored 'ridge' but stands
 * on ground the field calls 'fields', Gallowsfen is authored 'fen' in pines, and both
 * shore sites are in pines. Mood and borders are different questions.
 * ------------------------------------------------------------------ */
export const TERRAIN_REGIONS = Object.freeze(['pines', 'fields', 'marsh', 'ridge']);

/* ------------------------------------------------------------------ *
 * The sixteen. The original twelve are followed by three landmark-class DUSKFALL
 * compositions added only after a measured road-coverage audit found 0.9 km dead legs.
 *
 * claim.how:
 *   'touch'  walk within claim.r of (x+dx, z+dz) — a breaker, a brazier, a winding lamp.
 *   'shoot'  land a shot within claim.r of (x+dx, y0+dy, z+dz) — a bell, a hanging lamp.
 *   'none'   already yours (the Filling Station; you wake in it).
 * Both verbs exist in M0 today. Nothing here waits on a system that is not built.
 *
 * `lit` is whether the place's lamps are burning BEFORE you claim it — true only for the
 * Filling Station, which is the one lit thing in the county at the first frame. `hub` is
 * that same station seen from progression's side: the place with the map board, the place
 * you wake in, and the place where XP banks. Both ride on the `place:near` payload
 * (progression/progress.js gates its banking beat on `lit || hub`), which is why they are
 * fields on the row and not a hard-coded id comparison somewhere downstream.
 *
 * `startClaimed` means CLAIMED. It no longer also means FOUND. Those were one flag until
 * 2026-09-02, and collapsing them is why the whole destination loop measured dead: the hub
 * was written straight into places.found at boot, so the one place the player is standing
 * in when the game begins could never emit `place:discovered`, never whisper its name, and
 * started the map board with a pin already stuck in it. A board that begins EMPTY and
 * fills up is the thing Alex asked for by name. Discovery is ARRIVAL now (places.js,
 * `_proximity`): the hub is found the same way as the other fourteen, the first time you
 * walk into its yard, and it pays `xpFind` like the other fourteen.
 *
 * `terrainRegion` is terrain.regionAt()'s real answer at that centre — see above.
 *
 * `horizon: true` marks the long-range reads DESIGN section 2 says are never distance-culled.
 * Every row gets a silhouette in the persistent landmark group regardless — a county with
 * sixteen silhouettes in it is the answer to "always something in the distance" — but only
 * the explicitly flagged rows carry a moving, lit feature that reads from across the map.
 * ------------------------------------------------------------------ */
/* ROUND 6 (2026-09-03, Alex's fifth playtest: "I'm assuming there are other guns, right? I
 * haven't found any... Those would be great rewards for completing areas" and "I hope there
 * are bosses somewhere"). Two optional fields on a row:
 *   reward  a weapon def id ('revolver' | 'shotgun' | 'carbine') granted on the CLAIM of this
 *           place — weapons/weapon.js reads it off MAJOR_BY_ID on place:claimed. One gun per
 *           place, never two; a place with no reward field grants nothing.
 *   boss    a guardian species id ('kneeler') that stands dormant at this place and wakes
 *           when you come for the claim — enemies/kneeler.js reads it and places itself.
 * Data only, like everything in this file. */
export const MAJORS = Object.freeze([
  {
    id: 'filling-station', name: 'The Filling Station',
    x: -520, z: 240, region: 'shore', terrainRegion: 'marsh', kind: 'station',
    lit: true, hub: true,
    // roads.js already authored this disc (M0_SITES[1], r 38, blend 0.72) and the west
    // gravel spur terminates on it. Reuse, never re-declare: two discs on one spot fight.
    flat: null, flatId: 'filling-station',
    // Road-readable landmark contract. `existing` means the authored sign pylon already is
    // the arrival frame; every other major gets the same state-witness role from sites.js.
    approach: { x: 6.6, z: -7.4, w: 3.4, h: 9.4, style: 'station', existing: true },
    discoverR: 24, nearR: 80, horizon: false,
    claim: { how: 'none' },
    // xpFind was 0 while the hub was pre-found and could never pay for it. It is found by
    // walking into the yard now, like everywhere else, so it pays like everywhere else —
    // the smallest find in the county, because coming home is the easiest one to make.
    xpFind: 20, xpClaim: 0, startClaimed: true,
  },
  {
    // ROUND 6 (Alex, playtest 5): "if any of my haunted mansion from previous games made it
    // in as destinations. I would like it if they did." Blackthorn Manor, DESIGN 7.5, built
    // by src/world/manor.js from the donor's own room tables. It REPLACES Briar House's
    // shell on Briar House's pad: MEASURED 2026-09-03 (tools/manor-probe.mjs), no other
    // legal site exists — the ten odd loop control points all carry a major, the even
    // points are ~434 m from their neighbours, and the two spurs' middle points are
    // 254-500 m from a major. This centre is 20 m along the north spur PAST its end
    // (road 20.0 m, slope 0.000, regionAt pines), inside the M0 'briar-house' disc's
    // 21 m level core, so the manor's own 52 m disc registers at the same 35.64 m the road
    // was baked to and the two discs cannot fight. The road end is at local (0, +19.9)
    // (places.js sends local +Z to the road point); the house stands 4 m behind the origin
    // (manor.js HZ) with its front on +Z, so the foot of its front steps lands on the road
    // end.
    id: 'blackthorn-manor', name: 'Blackthorn Manor',
    // ROUND 7 (NEXT.md B1): the yard is a clearing. The footprint reaches 36 m from the
    // centre on the diagonal and the flat's level core is 32, so 44 clears the house and
    // its steps and leaves the pines standing at the edge of the lawn.
    clearR: 44,
    x: 401.4, z: -542.0, region: 'pines', terrainRegion: 'pines', kind: 'manor',
    lit: false, hub: false,
    flat: { radius: 52, blend: 0.62 },
    approach: { x: 0, z: 39, w: 12, h: 9.6, style: 'manor', routeX: 0, routeZ: 19 },
    discoverR: 30, nearR: 140, horizon: false,
    // the fuse board in the cellar. dy is 0 because the cellar stands AT GRADE inside the
    // plinth (manor-data.js, departure 2); dx/dz are manor.js claimLocal() (donor (41, 12)
    // translated by (-30, -24)) and tests/manor.mjs asserts the row and the builder agree.
    claim: { how: 'touch', dx: 11.0, dy: 0, dz: -12.0, r: 2.6 },
    xpFind: 40, xpClaim: 260, startClaimed: false,
  },
  {
    // ROUND 11: Alex asked for his mansions, plural, and for destinations large enough to
    // justify the drive. The Avery House comes from UNINVITED's authored three-level family
    // home plan. Its actual garage/front facade is the arrival read: no generic gate.
    id: 'avery-house', name: 'The Avery House',
    clearR: 48,
    // Twelve metres back from the first draft: the road flatten band had reached under
    // the porch, buried all seven front treads and forced the generic bank stair through
    // the foyer. Here the lane remains a close 32 m arrival while its shoulder ends beyond
    // the porch, leaving one continuous road -> bank stair -> front-door walk.
    x: -442, z: 868, region: 'pines', terrainRegion: 'pines', kind: 'avery',
    lit: false, hub: false,
    flat: { radius: 52, blend: 0.62 },
    approach: { x: 0, z: 40, w: 18, h: 11, style: 'avery', routeX: 0, routeZ: 20, existing: true },
    discoverR: 30, nearR: 140, horizon: false,
    // UNINVITED's basement boiler-room fuse board, donor (26.25, 30), translated by
    // Avery's frozen (-30, -24) house frame. It uses CURFEW's ordinary claim contract.
    claim: { how: 'touch', dx: -3.75, dy: 0, dz: 6.0, r: 2.6 },
    xpFind: 40, xpClaim: 260, startClaimed: false,
  },
  {
    id: 'weeping-mine', name: 'The Weeping Mine',
    reward: 'carbine', boss: 'kneeler',   // ROUND 6: the carbine is the Kneeler's prize
    x: 917, z: 1150, region: 'works', terrainRegion: 'fields', kind: 'works',
    lit: false, hub: false,
    // roads.js authored this one as 'ashfall-works' (M0_SITES[0], r 46, blend 0.74) and
    // says in its own comment that the road runs through the yard. It does; that is the
    // read as you come round the loop and the headframe stands over you.
    flat: null, flatId: 'ashfall-works',
    approach: { x: 0, z: 34, w: 14, h: 11.5, style: 'works', routeX: 9, routeZ: 23 },
    discoverR: 24, nearR: 90, horizon: true,
    claim: { how: 'touch', dx: 12.5, dy: 0, dz: -13.9, r: 2.8 },  // the winding-house breaker
    xpFind: 25, xpClaim: 150, startClaimed: false,
  },
  {
    id: 'relay', name: 'The Relay',
    x: 1500.5, z: 462.8, region: 'ridge', terrainRegion: 'ridge', kind: 'relay',
    lit: false, hub: false,
    flat: { radius: 34, blend: 0.62 },
    approach: { x: 0, z: 29, w: 11, h: 9.8, style: 'relay', routeX: 0, routeZ: 20 },
    discoverR: 24, nearR: 80, horizon: true,
    claim: { how: 'touch', dx: 3.2, dy: 0, dz: 5.4, r: 2.6 },     // the cabinet at the mast foot
    xpFind: 25, xpClaim: 150, startClaimed: false,
  },
  {
    id: 'cathedral', name: 'The Cathedral of Unlight',
    boss: 'kneeler',                       // ROUND 6: one Kneeler at the west door
    x: 93.1, z: 1242.6, region: 'ridge', terrainRegion: 'fields', kind: 'cathedral',
    lit: false, hub: false,
    flat: { radius: 50, blend: 0.62 },
    approach: { x: -17, z: 40, w: 14, h: 12.0, style: 'cathedral', routeX: -17, routeZ: 30 },
    discoverR: 28, nearR: 120, horizon: true,
    claim: { how: 'touch', dx: 3.0, dy: 0, dz: -12.0, r: 3.2 },   // the brazier at the west door
    xpFind: 40, xpClaim: 200, startClaimed: false,
  },
  {
    id: 'chapel', name: 'The Chapel',
    x: -816.4, z: 1414.0, region: 'ridge', terrainRegion: 'ridge', kind: 'chapel',
    lit: false, hub: false,
    flat: { radius: 42, blend: 0.62 },
    approach: { x: 0, z: 32, w: 11, h: 9.4, style: 'chapel', routeX: 0, routeZ: 24 },
    discoverR: 24, nearR: 70, horizon: false,
    // BESIDE the tower, not in it: the landmark tower stands at local (0, -4) with a 3.0 m
    // half-extent, and a claim point inside a collider is a claim you can never walk to.
    claim: { how: 'touch', dx: 4.8, dy: 0, dz: -4.0, r: 2.6 },    // the hearth by the porch
    xpFind: 25, xpClaim: 130, startClaimed: false,
  },
  {
    id: 'gallowsfen', name: 'Gallowsfen Steeple',
    x: -1305, z: 579, region: 'fen', terrainRegion: 'pines', kind: 'steeple',
    lit: false, hub: false,
    flat: { radius: 34, blend: 0.62 },
    approach: { x: 0, z: 29, w: 11, h: 10.2, style: 'steeple', routeX: 0, routeZ: 27 },
    discoverR: 24, nearR: 70, horizon: false,
    // the hanging lamp in the drowned belfry. You have to stand in the water to see it.
    claim: { how: 'shoot', dx: -4.4, dy: 13.4, dz: 0, r: 3.0 },
    xpFind: 25, xpClaim: 140, startClaimed: false,
  },
  {
    id: 'drowned-light', name: 'The Drowned Light',
    reward: 'revolver',                    // ROUND 6: at the top of the stair, in the lamp room
    x: -1380.3, z: -208.1, region: 'shore', terrainRegion: 'pines', kind: 'lighthouse',
    lit: false, hub: false,
    flat: { radius: 32, blend: 0.62 },
    approach: { x: 0, z: 28, w: 12, h: 11.2, style: 'lighthouse', routeX: 0, routeZ: 24 },
    discoverR: 24, nearR: 90, horizon: true,
    // ROUND 6 (Alex: "I can't even go into the lighthouse... Or not load by walk up
    // stairs"): the claim is the LAMP, in the lamp room at the top of the stair —
    // 81 treads up the inside of the tower to the gallery floor at 36.7 m (sites.js
    // lighthouse.landmark). dy is the lamp-room floor; lane D1's height test honours it.
    claim: { how: 'touch', dx: 0, dy: 36.7, dz: 0, r: 2.2 },
    xpFind: 30, xpClaim: 170, startClaimed: false,
  },
  {
    id: 'hollow-mill', name: 'The Hollow Mill',
    x: -996.5, z: -924.6, region: 'pines', terrainRegion: 'pines', kind: 'mill',
    lit: false, hub: false,
    flat: { radius: 34, blend: 0.62 },
    approach: { x: 0, z: 29, w: 12, h: 10.0, style: 'mill', routeX: 0, routeZ: 25 },
    discoverR: 24, nearR: 80, horizon: true,
    claim: { how: 'touch', dx: 0, dy: 0, dz: 5.2, r: 2.6 },       // wind the lamp at the door
    xpFind: 25, xpClaim: 150, startClaimed: false,
  },
  {
    id: 'garden-of-rest', name: 'The Garden of Rest',
    boss: 'kneeler',                       // ROUND 6: one Kneeler among the graves
    x: -366.6, z: -1606.0, region: 'ridge', terrainRegion: 'ridge', kind: 'cemetery',
    lit: false, hub: false,
    flat: { radius: 40, blend: 0.62 },
    approach: { x: 0, z: 35, w: 12, h: 10.4, style: 'cemetery', routeX: 0, routeZ: 26 },
    discoverR: 26, nearR: 70, horizon: false,
    claim: { how: 'touch', dx: 0, dy: 0, dz: 10.6, r: 3.0 },      // the lamp on the far mausoleum
    xpFind: 25, xpClaim: 130, startClaimed: false,
  },
  {
    id: 'bell-tower', name: 'The Bell Tower',
    x: 493.3, z: -1256.9, region: 'pines', terrainRegion: 'pines', kind: 'tower',
    lit: false, hub: false,
    flat: { radius: 30, blend: 0.62 },
    approach: { x: 0, z: 26, w: 11, h: 10.8, style: 'tower', routeX: 0, routeZ: 22 },
    discoverR: 24, nearR: 70, horizon: false,
    // donor: Projects/qualiacology/skyshard/src/main.js — the shootable bell. Ringing it
    // from the road is the loudest thing you can do in CURFEW and it lights the tower.
    claim: { how: 'shoot', dx: 0, dy: 24.4, dz: 0, r: 2.6 },
    xpFind: 25, xpClaim: 140, startClaimed: false,
  },
  {
    id: 'jackfield', name: 'Jackfield Barn',
    reward: 'shotgun',                     // ROUND 6: in the loft, where DESIGN 7.9 always put it
    x: 1158.9, z: -790.1, region: 'fields', terrainRegion: 'fields', kind: 'barn',
    lit: false, hub: false,
    flat: { radius: 42, blend: 0.62 },
    approach: { x: 2, z: 35, w: 13, h: 10.0, style: 'barn', routeX: 2, routeZ: 30 },
    discoverR: 24, nearR: 70, horizon: false,
    claim: { how: 'touch', dx: 0, dy: 0, dz: -7.8, r: 2.8 },      // the loft lantern
    xpFind: 25, xpClaim: 130, startClaimed: false,
  },
  {
    // Round 9 coverage point 1: the roads around the Works junction were 914 m from the
    // nearest major. This is DUSKFALL's standing-stone composition promoted whole: henge,
    // lintels, altar and climbable fallen stones, not one stone copied to fill a hole.
    id: 'standing-stones', name: 'The Standing Stones',
    x: 435, z: 395, region: 'works', terrainRegion: 'fields', kind: 'stones',
    lit: false, hub: false, clearR: 42,
    flat: { radius: 44, blend: 0.62 },
    approach: { x: 0, z: 31, w: 14, h: 10.2, style: 'stones', routeX: 0, routeZ: 18 },
    discoverR: 30, nearR: 100, horizon: true,
    // On the central altar: its nearest clear ground stance is 1.8 m from the proud panel,
    // inside the 2.4 m use reach and the 2.0 m foot-height tolerance. The focused probe must
    // search the usable reach band rather than assuming every fixture has room at exactly 1.6 m.
    claim: { how: 'touch', dx: 0, dy: 1.35, dz: 0, r: 2.8 },
    xpFind: 35, xpClaim: 180, startClaimed: false,
  },
  {
    // Round 9 coverage point 2: DUSKFALL's Great Tree occupies the western interior road,
    // with an actual spiral climb and a supply cage on the crown deck.
    id: 'great-tree', name: 'The Great Tree',
    x: -260, z: -850, region: 'pines', terrainRegion: 'pines', kind: 'great-tree',
    lit: false, hub: false, clearR: 50,
    flat: { radius: 52, blend: 0.62 },
    approach: { x: 0, z: 31, w: 15, h: 11.8, style: 'great-tree', routeX: 0, routeZ: 20 },
    discoverR: 32, nearR: 120, horizon: true,
    // Out on the deck's east shoulder, clear of the trunk and close enough to the edge
    // that its high lamp reads from the yard below. The original x=2.4 position was
    // inside the trunk's visible taper and the deck lip hid the glint from the ground.
    claim: { how: 'touch', dx: 4.2, dy: 12.9, dz: 0.6, r: 2.6 },
    xpFind: 40, xpClaim: 220, startClaimed: false,
  },
  {
    // Round 9 coverage point 3: the eastern cross-road receives DUSKFALL's rock-arch and
    // sleeper-monolith vocabulary as one vertical destination with a route onto its crown.
    id: 'black-rib', name: 'The Black Rib',
    x: 1392, z: -218, region: 'ridge', terrainRegion: 'ridge', kind: 'rock-arch',
    lit: false, hub: false, clearR: 40,
    flat: { radius: 42, blend: 0.62 },
    approach: { x: 0, z: 34, w: 15, h: 11.0, style: 'rock-arch', routeX: 6, routeZ: 13 },
    discoverR: 30, nearR: 100, horizon: true,
    // At the south lip of the crown, directly above the stair's cross-landing. At the
    // old centre position the crown slab itself hid the lamp from every ground approach.
    claim: { how: 'touch', dx: 0, dy: 10.2, dz: -3.0, r: 2.8 },
    xpFind: 35, xpClaim: 190, startClaimed: false,
  },
]);

/** id -> row. Built once; MAJORS is frozen so this can never drift from it. */
export const MAJOR_BY_ID = Object.freeze(
  MAJORS.reduce((m, d) => { m[d.id] = d; return m; }, Object.create(null)),
);

/** The terrain.regionAt() region a major actually stands in, or null. Never `region`. */
export function terrainRegionOf(id) {
  const d = MAJOR_BY_ID[id];
  return d ? d.terrainRegion : null;
}

/* ------------------------------------------------------------------ *
 * MINOR SITES — the vocabulary, and the rationing that spaces them.
 *
 * donor: Projects/eaten-path/src/world/world.js:103-142 (`_chooseKind`), read 2026-09-02:
 *   since-counters per kind, hard starvation guards ("nothing waits forever"), a
 *   never-stack-two-of-a-kind rule, and a weight table the guards override. The shape is
 *   lifted; the kinds are re-kitted rural per DESIGN section 7's minor-site list.
 *
 * `weight` is the base pick weight. `minSince` is how many other sites must pass before
 * this kind is eligible again. `starve` is the count at which it is FORCED regardless of
 * weight — the guard that stops a seed from never showing you a hunting blind.
 * `bulk` is the rough footprint radius, used for the collider and for keeping two sites
 * from overlapping when the road doubles back on itself.
 * ------------------------------------------------------------------ */
export const MINOR_KINDS = Object.freeze([
  // ROUND 7: the staged scenes. Their rows live with their builders in staged.js so one
  // lane owns a scene end to end; they are spliced in here so _chooseMinor rations them
  // exactly like every other kind. Same shape, no special case anywhere downstream.
  ...STAGED_KINDS,
  // ROUND 5 (Alex, playtest 4): "it shouldn't be that vacant. There should be areas with at
  // least cool scenery... maybe little campfire spots." The campfire is the first minor that
  // lives OFF the road (`offRoad`: 18-40 m out, see CAMPFIRE_OFFSET) and is visible from it:
  // a stone ring with embers that breathe, a lean-to, a dropped pack. It is a LIT FIRE in
  // DESIGN section 6's sense — standing at one banks carried XP through `place:near`
  // (places.js emits {major: false, lit: true} within CAMPFIRE_NEAR_R) — with no inventory
  // and no new system. Weighted for roughly one in six minors (53 minors over 11.1 km of
  // road, measured 2026-09-03), so 8-12 across the county after the off-road rejections.
  // FIRST in the table on purpose: _chooseMinor serves starvation in table order and the
  // table is over-subscribed (the reciprocals of the starve counts sum past 1), so the last
  // row is the one that never wins a tie — measured at 5 campfires however it was weighted.
  // `lit` is what puts a kind on places.js's proximity list (place:near {lit: true} within
  // CAMPFIRE_NEAR_R); `offRoad` is only where it sits. Keep them separate: a future off-road
  // wreck is scenery, not a fire.
  { id: 'campfire', weight: 7.0, minSince: 2, starve: 5, bulk: 3.0, offRoad: true, lit: true },
  { id: 'fence', weight: 5.0, minSince: 1, starve: 7, bulk: 4.0 },
  { id: 'waystone', weight: 3.4, minSince: 2, starve: 9, bulk: 1.2 },
  { id: 'culvert', weight: 2.6, minSince: 3, starve: 12, bulk: 2.6 },
  { id: 'pylon', weight: 3.0, minSince: 3, starve: 11, bulk: 2.4 },
  { id: 'blind', weight: 2.2, minSince: 4, starve: 13, bulk: 1.8 },
  { id: 'orchard', weight: 2.0, minSince: 5, starve: 15, bulk: 9.0 },
  { id: 'cairn', weight: 2.8, minSince: 2, starve: 10, bulk: 1.4 },
  { id: 'wreck', weight: 2.2, minSince: 4, starve: 14, bulk: 2.4 },
  { id: 'poster', weight: 2.4, minSince: 3, starve: 12, bulk: 1.0 },
  { id: 'gear', weight: 2.0, minSince: 4, starve: 14, bulk: 1.6 },
]);

/** How far off the centreline an `offRoad` minor sits: in the trees, but in sight of the
 *  road it was placed from (a glow at 18-40 m through pines reads; at 60 it is gone). */
export const CAMPFIRE_OFFSET = Object.freeze({ min: 18, max: 40 });

/** Within this of a campfire's ring you are AT it: place:near fires with lit: true and
 *  progression banks. Sized to the ring plus a body, so you have to walk up to the fire. */
export const CAMPFIRE_NEAR_R = 4.0;

export const MINOR_BY_ID = Object.freeze(
  MINOR_KINDS.reduce((m, k) => { m[k.id] = k; return m; }, Object.create(null)),
);

/** DESIGN section 2: "a minor site or vignette occurs every 120-220 m of road." */
export const MINOR_SPACING = Object.freeze({ min: 120, max: 220 });

/** How far off the centreline a minor sits. Outside CFG.roads.plantExclude.tree (7.05)
 *  so it stands in the trees rather than in the verge the trees were kept out of. */
export const MINOR_OFFSET = Object.freeze({ min: 7.4, max: 12.6 });

export default MAJORS;
