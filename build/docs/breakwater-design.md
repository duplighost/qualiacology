# BREAKWATER — design and content record

## What this record does and does not establish

This is the design for the playable browser game in `qualiacology/breakwater/`. It records the alternatives considered, the chosen campaign, the reasons for the mechanics, and the quality checks the implementation needs to earn. Design prose, content counts, and a successful boot do not establish photorealism, modern AAA production quality, enjoyment, frame rate, or a two-hour completion time. Those require evidence from the running game.

The original request calls for a complete, fast, linear first- or third-person 3D action game, extraordinary visual quality, distinct environments and opponents, tactile skill expression, meaningful progression, secrets, and at least two hours to reach the end. The two-hour requirement remains unverified until real play measures it. `parTime` values are planning targets only. They never gate progress, add waiting, inflate enemy health, or automatically prove the duration requirement.

## Evidence and preferences

The existing site's catalog provides evidence of games that exist, not evidence of their quality or which ones the player enjoyed most. Observable recurring ideas include:

- A persistent returning object in FETCH and KICKMOON.
- Momentum earned through a physical interaction in ARC and SPACEBOARDING.
- Powers felt through the player's body in SKYSHARD.
- Discrete character-action boss encounters in SECONDHAND SAINT.
- Dense, strange physical spaces in THE LAST ROOM and the horror games.

Preferences subsequently supplied by the user strengthen the direction: Furi and Cuphead are particularly strong references; Mario 3D and Wonder support immediate spatial surprise; Dying Light supports physical traversal; Prey supports believable architectural spaces; Life is Strange and Undertale support a human world and clear emotional resolution; Skyrim supports the constellation presentation. Slow wandering, excessive exposition, and lengthy RPG padding work against this request. None of these references is a license to copy assets, characters, prose, or specific levels.

Additional design references are Titanfall 2's chapter-specific spatial rules, DOOM Eternal's aggressive recovery economy, Ghostrunner's visible route intentions, Returnal's projectile readability, and Armored Core VI's compact missions and mechanically legible bosses. These are useful design references, not asserted favorites.

## Ten alternatives considered

The order ranks feasible execution quality in this browser build, identity, route clarity, tactile potential, and variety. It is not a ranking of finished games.

### 1. BREAKWATER — selected

**Movement and combat:** throw a kinetic lance, move to change its returning line, recall through a new group, time a catch, and spend the resulting opportunity on a dash or parry. Every baseline traversal action is available early.

**Skill loop:** outward aim → committed enemy attack → lateral or vertical reposition → returning hit → catch → next decision. One object provides a coherent grammar for attack, defense, movement, sound, progression, and boss vulnerabilities.

**World and campaign:** a courier's service lance can reconnect the six districts of a coastal city whose automated sea defense has begun hoarding power. Freight Quay, Flooded Transit, Glass Conservatory, Foundry, Winter Spillway, and Storm Crown create visibly and spatially different settings connected by real infrastructure. Twenty-four district sectors and one finale target 129 minutes before measurement.

**Opposition and routes:** maintenance machines become understandable enemies: chargers, rifles, shields, mortars, hunters, furnaces, snipers, tethers, and prisms. Seven landmark bosses test different combinations of timing, position, return geometry, and height. Short secret routes reach small inhabited traces of the city and rejoin the forward route.

**Progression:** three constellations change movement, lance geometry, and reaction timing. They improve an already complete kit instead of selling mandatory traversal.

**Why selected:** first person avoids a weak full-body animation pipeline. The central object is expressive but tractable. Coastal infrastructure supports distinctive architecture, recognizable materials, and a coherent reason for barriers, gantries, pumps, and power routes.

### 2. DEAD FREIGHT

**Hook and loop:** magnetic boots and intercepted artillery. Read a shot, catch it, release its recoil as a jump, board the next carriage, and attack from a changing height.

**World and environments:** stop six shipments feeding a coastal war engine. Convoys cross salt flats, storm bridges, mountain tunnels, refinery rail, flooded suburbs, and a dawn terminal.

**Enemies and bosses:** roof snipers punish straight movement; coupling guards threaten links between cars; artillery cars require returned ammunition; the final engine rearranges its carriage formation. Under-carriage routes provide dangerous shortcuts.

**Progression and campaign:** steer recoil, split shells, and run on carriage sides. Six substantial convoy missions plus a terminal assault target roughly 124 minutes.

**Reason not selected:** moving-platform physics, camera stability, and convincing surrounding motion threaten execution quality. Carriage repetition limits environmental variety despite changing scenery.

### 3. GLASS MERIDIAN

**Hook and loop:** pin a glass blade into architecture, reposition, then recall it as a cutting line that reflects from marked mirrors. The skill is reading angles quickly while maintaining movement.

**World and environments:** restore an optical energy network through a salt cavern, tidal archive, glass desert, molten lensworks, alpine receiver, and observatory.

**Enemies and bosses:** mirror shields redirect careless hits; light-eating units become vulnerable across reflected lines; bosses expose lenses through physical movement. Reflections reveal hidden branches before their entrances are visible.

**Progression and campaign:** a second reflection, two pins, and beam-to-dash conversion. Six 19-minute chapters and a 14-minute finale are the initial target.

**Reason not selected:** reflection rules risk becoming slow puzzles. Making fast three-dimensional geometry comprehensible would consume substantial tutorial and UI effort.

### 4. BELLWETHER

**Hook and loop:** a shock hammer catches incoming force. Provoke, parry, redirect a pressure wave, launch through a gap, and strike a resonant structure.

**World and environments:** emergency bells have seized a mountain city's defenses. Bronze foundries, flooded cloisters, snow terraces, industrial organworks, cable stations, and the bell tower belong to the same system.

**Enemies and bosses:** distinct windup cadences teach timing without requiring beat matching. A swinging bell giant must have its force redirected. Cracked resonant surfaces reveal optional shortcuts.

**Progression and campaign:** stored impacts, aerial releases, and pressure steering across nine approximately 14-minute missions.

**Reason not selected:** audio latency and rhythm-game expectations can punish players for factors outside their skill. The sound system would become a critical gameplay dependency.

### 5. BORROWED SECOND

**Hook and loop:** record a few seconds of movement and attack, release an active echo, then flank to combine two attack directions. The player builds a useful line before exploiting it.

**World and environments:** a city emergency system repeats its last intact day across a harbor evacuation, hospital skybridge, bright market, flooded museum, collapsed metro, and elevated relay.

**Enemies and bosses:** opponents react to the previous route; shield pairs require simultaneous angles; a boss attempts to overwrite the echo. Optional echo-operated passages give short route changes.

**Progression and campaign:** longer echoes, projectile ownership transfer, and position swaps over eight 16-minute chapters.

**Reason not selected:** timeline causality, collision history, and intelligible feedback introduce substantial system risk. The mechanic is strongest only when the whole level is authored around it.

### 6. UNDERTOW

**Hook and loop:** a pressure suit converts close impacts into short directed underwater flight. Strike, gain pressure, jet through a gap, intercept, and breach onto solid ground.

**World and environments:** ascend from abyssal maintenance through a drowned hotel, reef greenhouse, thermal bore, ballast chambers, and open storm surge.

**Enemies and bosses:** anchored predators pull; buoyant mines reward redirection; a pump creature changes the current. Visible currents identify optional vents and exits.

**Progression and campaign:** pressure redirection, charged breach, and vortex parry over six approximately 20-minute stages and an ending.

**Reason not selected:** convincing water and unrestricted swimming increase motion discomfort and navigation risk. Oxygen countdowns would add precisely the artificial pressure the design should avoid.

### 7. FAULTLINE

**Hook and loop:** seismic gauntlets break authored structural seams. Read a support, strike while moving, and use its collapse as a ramp, shield, or weapon.

**World and environments:** traverse a tectonic power installation through quarry, buried district, freight elevator, ceramic reactor, glacier fissure, and summit transmitter.

**Enemies and bosses:** braced enemies resist direct force; burrowers expose themselves when ground changes; bosses lose structural supports. Small optional fractures reveal human-scale spaces outside the main route.

**Progression and campaign:** directional collapse, wall impulse, and counter-seismic parry over six 20-minute chapters and an eight-minute finale.

**Reason not selected:** even finite, scripted destruction creates extensive collision, camera, and asset work. General destruction would also make route clarity much less reliable.

### 8. THE LONG FALL

**Hook and loop:** descend a vertical city using a grappling blade; attacks and parries redirect momentum. Select a landing, hook or strike, turn the impact sideways, and retain sight of the next route.

**World and environments:** solar crown, suspended gardens, residential decks, transit belts, machine interior, and harbor foundations beneath an orbital elevator.

**Enemies and bosses:** interceptors, anchored beams, and wall-running pursuers; bosses occupy the descent itself. Difficult side descents form genuine shortcuts.

**Progression and campaign:** hook-release timing, aerial counters, and controlled dives over eight 16-minute strata.

**Reason not selected:** an overwhelmingly vertical camera can make forward intent unclear and conceal threats. This risks recreating the lost-player problem despite nominal linearity.

### 9. VESPER

**Hook and loop:** third-person chain-blade defense turns an incoming attack into an orbit around its source. Read, pivot, expose a flank, strike, and launch toward the next opponent.

**World and environments:** break six automated courts along a pilgrimage route: salt basilica, flooded courthouse, orchard prison, volcanic mint, ice tribunal, and crown observatory.

**Enemies and bosses:** duelists, shield carriers, coordinated twins, and a judge whose weapon becomes traversal geometry. Architectural side routes hold optional movement trials.

**Progression and campaign:** chain pivots, aerial strings, and directional counters over six 20-minute courts and a finale.

**Reason not selected:** convincing character animation, contact, models, camera obstruction handling, and melee readability need a much larger production investment than the established pipeline supports.

### 10. REDLINE DUET

**Hook and loop:** a powered board follows a returning disc's temporary rail. Throw the route, ride, attack, recall, catch, and transfer while carrying momentum.

**World and environments:** deliver a stolen reactor through six consecutive infrastructure corridors from red quarry through freight city to the open sea.

**Enemies and bosses:** interceptors, track cutters, and mobile artillery; the final harbor carrier's deck becomes a changing race course. High-skill transfers are faster alternate routes.

**Progression and campaign:** rail curvature, aerial catch, aggressive transfers, and projectile deflection over six approximately 20-minute routes plus finale.

**Reason not selected:** it overlaps ARC and SPACEBOARDING heavily. Strong vehicle motion would constrain the desired breadth of close combat and boss duels.

## The final direction

BREAKWATER is about bringing something back: the lance to the hand, the current to the city, and people to the ordinary places that kept them alive. The story is carried by changing infrastructure, short optional radio, and small physical refuges. No long speech blocks the controls. The player always has a visible destination and a simple immediate objective.

Mara is a maintenance engineer below the mountain floodgate. She guides the player through the city because she knows it as a place people worked and lived, not as a sequence of levels. The automated Crown has diverted power upward to protect its own heart. Each district relay restores a useful function below: shelter lighting, transit pumps, irrigation, home heating, then the sea gate. The player breaks the Crown's defense and forces the heart to release its current. Mara keeps the manual gate open. The coast remains protected, windows light below, and the game ends in morning rather than leaving its principal conflict unresolved.

## Campaign structure

All sectors have a unique authored `layout`, semantic arena shapes, offsets, dimensions, wave composition, objective, brief radio, completion line, and optional secret place. The table lists design targets, not measured times.

| District | Sector | Target | Spatial and tactical intention |
|---|---|---:|---|
| Freight Quay | Wake Dock | 4 min | Harbor dogleg; teach outward throw, sidestep, recall, and catch with small groups. |
| Freight Quay | Container Canyon | 5 min | Stack switchbacks and loading bridges; first shields reward a returning line. |
| Freight Quay | Drydock Spine | 5 min | Ship basin and overhead ribs; diagonal angles and crossfire. |
| Freight Quay | Counterweight | 5 min | Crane threshold; two approach beats and an overhead machine duel. |
| Flooded Transit | Grand Concourse | 4 min | Vaulted hall and ticket islands; mortar landing rings enter the grammar. |
| Flooded Transit | Last Platform | 5 min | Parallel tracks, high service edges, concentrated firing lanes. |
| Flooded Transit | Signal Descent | 5 min | Spiral service structure and cable well; warning lamps announce dangerous lanes. |
| Flooded Transit | The Switchman | 5 min | Three-track junction; relocate around an armored volley machine. |
| Glass Conservatory | Sun Court | 4 min | Sunlit limestone and plant courts; introduce committed hunter lunges. |
| Glass Conservatory | Hanging Orchard | 5 min | Terraced tree canopy and spans; moving vertically solves close pressure. |
| Glass Conservatory | Rain Gallery | 5 min | Curved aqueduct; jump low pressure rings while preserving a safe landing. |
| Glass Conservatory | The Glasskeeper | 6 min | Canopy circle; alternating fan gaps, a lens sweep, and shutters opened by parried shots. |
| Foundry | Casting Floor | 4 min | Molten channels and low molds; furnace units turn incoming attacks back. |
| Foundry | Furnace Choir | 5 min | Staggered crucibles; audible intake and visible pressure vents. |
| Foundry | Chainworks | 5 min | Dense gantries and conveyor spans; choose height and crossfire angle. |
| Foundry | Crucible | 6 min | Heat cone, marked slag rain, and a ground-impact attack create different movement responses. |
| Winter Spillway | White Cut | 4 min | Open snowy crest; leading snipers demand a late direction change. |
| Winter Spillway | Turbine Cathedral | 5 min | Circular scaffolds and a turbine well; counter tethers and jump low sweeps. |
| Winter Spillway | Ice Ladder | 5 min | Dam-face switchbacks; keep the next amber landing visible. |
| Winter Spillway | Floodgate | 6 min | Hydraulic threshold; jump low pressure rings and sidestep aimed high jets. |
| Storm Crown | Copper Horizon | 4 min | Exposed suspended pylons; read prism fan gaps and redirect individual shots. |
| Storm Crown | Induction Gardens | 5 min | Orbiting coil spaces; return lines exploit enemies grouped around the center. |
| Storm Crown | Broken Halo | 5 min | Alternating inner and outer arc; navigate to a conspicuous missing ring segment. |
| Storm Crown | The Warden | 6 min | Precision barrages, pursuit charges, and ring volleys; reflected fire exposes its optic. |
| Finale | First Light | 11 min | Two final traversal/combat beats, the heart duel, then a quiet playable sea-wall approach. |

The data totals **129 target minutes**, **25 sectors**, **76 arenas**, **144 sequential normal waves**, **714 normal enemies**, and **7 unique boss IDs**. These are inspectable content counts. They are not a duration measurement or proof that repeated enemy combinations feel sufficiently different. A skilled player may finish substantially faster. Real play must determine whether more authored content is needed; adding arbitrary waits or inflating health is not an acceptable repair.

## Seven boss identities

Each boss sector has two approach encounters followed by its duel. The final heart is followed by an empty, playable resolution space. The descriptions below reflect the implemented attack families found in `combat.js`, rather than the more elaborate destructible-part ideas in the original brainstorm. Distinct attack code is established by source inspection; feel, readability, and difficulty still require real play.

1. **Counterweight:** a mobile crane rig marks a slam, emits pressure rings, and crosses two ground-impact lines. The winch becomes more vulnerable after the slam, and a returning lance during that opening receives a further 1.4× counter bonus.
2. **Switchman:** a charge follows a locked warning lane, a missed charge overheats its brakes and opens the engine for 3.1 seconds; crossing-fire bursts and signal mines change the threat between charges.
3. **Glasskeeper:** staggered projectile fans alternate their gaps, a lens sweep walks across the player's line, and circular volleys punish tunnel vision. A reflected round opens its shutters for 3.4 seconds.
4. **Crucible:** a charged core hit during the heat-cone windup ruptures its vent, interrupts the attack and opens the core for 3 seconds. Flanking remains a safe fallback; marked slag rain requires relocation and a hammer impact produces a jumpable ring.
5. **Floodgate:** jumping an actual low pressure ring unbalances the turbine and opens its core for 2.4 seconds. Aimed paired jets reward sidesteps; low cross-room cable sweeps alter the safe route.
6. **Warden:** precise execution shots, a committed pursuit charge, and radial lockdown volleys provide three responses. Reflecting an execution-line precision shot disables fire control and exposes the optic for 3.7 seconds; other reflected shots provide a shorter interrupt.
7. **Heart:** rotating projectile volleys, marked anchor blasts, four low sweeping arms, and an added pressure surge escalate through three health phases. It has a finite defeat and clear ending.

The original brainstorm included a furnace catching the player's lance, prism decoys, force-pulling tethers, destructible boss segments, and a Warden whose armor had to be torn open on recall. Those specific mechanics are not implemented and are not advertised by the revised tutorial text. The implementation instead uses the concrete counters above. The bosses share an exposed-core damage framework, but the later mastery revision adds different actions that create or improve openings: timed recall, an evaded charge, a reflected lens round, a charged windup interrupt, a ring jump, and a reflected precision shot. These are action counters, not environmental puzzle simulations. The Heart adds rotating cables in phase two and pressure surges in phase three.

Bosses should remain attackable through skilled positioning. Long mandatory invulnerable periods undermine the desired continuous flow. Their health and number of phases should be chosen for learning and mastery, not campaign length.

## Progression that changes play

The complete baseline kit contains jump, dash, slide, throw, recall, and parry. The twelve one-point skills are three four-node constellations, with the previous node as the prerequisite. Runtime behavior must match the displayed promise.

| Branch | ID | Concrete change |
|---|---|---|
| Momentum | `catchdrive` | Perfect catch restores a dash immediately. |
| Momentum | `slidevault` | A sliding kill adds an upward vault while preserving forward movement. |
| Momentum | `airpull` | Recalling while moving in the air pulls the player forward. |
| Momentum | `wake` | Dash damages enemies along its path. |
| Vector | `breaker` | Returning lance hits break shields. |
| Vector | `drag` | The returning lance pulls light enemies. |
| Vector | `pin` | A fully charged throw briefly stuns heavy machines and bosses. |
| Vector | `fork` | A charged hit chains to a nearby second target. |
| Resonance | `returnfire` | A parried projectile homes back with doubled damage. |
| Resonance | `pulsecatch` | Perfect catch causes radial stagger. |
| Resonance | `stormchain` | A parry primes the next throw to chain. |
| Resonance | `bloodtide` | A nearby return kill provides extra healing. |

The revised experience curve is `floor(420 × (level − 1)^1.65)`, with level and awarded skill points capped at twelve total nodes. Mandatory enemy, boss, and sector rewards sum to 22,192 XP; all optional secrets add 5,825 XP. Level twelve requires 21,956 XP, so a run without secrets reaches the final point around the last boss, while exploration brings choices forward. This replaced a 160 coefficient that completed the entire tree halfway through the campaign and left unspendable points. The new economy is checked against content data, not yet calibrated by a complete human playthrough.

No mandatory encounter may require purchasing a particular skill. A purchase should feel useful on the very next fight, not merely change an invisible statistic.

## Secrets and the human scale

There are twenty-five named secret places, with a spatial hint, an optional tiny record, and a numeric experience reward. Their names include Night Watch Room, Lost Property Office, The Crooked Branch, The Second Chair, The Warm Room, and The Window Request. The physical place matters more than its pickup. Each should have a plausible service route, shelter, furniture or object, and a short way back to the main flow. No mandatory fetch quest depends on finding one.

The story fragments are deliberately small: a child's train drawing, a hand-annotated seed inventory, a knitted wind-gauge sleeve, a spare chair beside a furnace, a note about the sea wall's original purpose. They establish the people worth saving without stopping the action or creating an unrelated collectible mythology.

## Visual, audio, and world direction

- **Freight Quay:** wet slate, rust, rain, massive crane silhouettes, stacked containers, ship ribs, storm water below.
- **Flooded Transit:** warm ivory stone, Art Deco arches, brick service passages, shallow water reflections, long platform perspectives.
- **Glass Conservatory:** natural daylight, limestone, dense planting, glass ribs, terraces, trees with structural presence, irrigation overhead.
- **Foundry:** dark basalt, weathered metal, molten amber channels, low molds, high gantries, vents with physical sources.
- **Winter Spillway:** open alpine blue, snow against concrete, dam scale, turbine cylinders, scaffold ascent, visible wind exposure.
- **Storm Crown:** black copper, high storm cloud, enormous coils, suspended bridges, incomplete rings, distant city context.

Amber identifies route and service machinery, cyan belongs to the lance, and hostile red identifies an active threat. These signals need strong silhouette and value differences as well as color. Lighting must preserve readable enemies and floor hazards. Material roughness, normal detail, scale, and contact shadows matter more than indiscriminate bloom or chromatic effects. A coherent structural silhouette is more valuable than thousands of unrelated decorations.

The lance has three distinct sound events: a sharp outward release, a moving recall sound, and a tactile catch; perfect catch adds a restrained low impact and bright confirmation. Telegraphs have identifiable sources and do not compete with the music. Music can build with enemy pressure but should leave space for timing information. No sound plays before the player's start gesture. Master/music levels, shake, sensitivity, and difficulty remain accessible.

## Implementation agreements

The exact module contracts live in `CONTRACTS.md`. Campaign data uses only nine supported normal enemy IDs, seven supported boss IDs, and the agreed arena rule strings `crosswind`, `blackout`, `overpressure`, `risingwater`, and `crossfire`. Boss arenas omit extra environmental rules so the boss's own language remains clear.

The world accepts the semantic arena shapes `dock`, `canyon`, `basin`, `concourse`, `platform`, `spiral`, `court`, `terrace`, `aqueduct`, `casting`, `crucible`, `gantry`, `ridge`, `turbine`, `switchback`, `bridge`, `coil`, `ring`, and `heart`. Authored dimensions stay between 24–40 meters wide and 32–42 meters long, with offsets no larger than 14 meters and adjacent changes no larger than 18 meters. Those dimensions keep the route connected under the agreed sector spacing. Cosmetic seeds must not substitute for authored layout identity.

Campaign and progression modules have no runtime imports. Every sector can be selected by its ordered index. Each includes its district's display name for UI grouping. Secrets add `name` and `hint` to the required `text` and `reward` fields. Constellation coordinates are normalized to a 0–100 square.

## Evidence needed before release claims

1. Boot and physically play the beginning without developer teleportation; verify learning, aiming, movement, throw, return hits, catch, health recovery, and enemy readability.
2. Play a representative sector from every district using the actual camera and collision. Inspect rendered pixels for distinct architecture, believable scale, lighting, materials, visible destination, and secret spaces.
3. Fight each boss; verify that it is mechanically different, readable, defeatable with the baseline kit, and unable to strand progression.
4. Purchase and exercise each skill. UI text and observed behavior must agree.
5. Save and reload at checkpoints, pause during danger, recover from death, leave pointer lock, resume, finish the heart, and reach the explicit ending.
6. Measure frame times, draw calls, resource growth, audio voice counts, and input response. Distinguish software-rendered cloud results from hardware GPU performance; neither is a substitute for the other.
7. Measure a complete first play. Exclude pause and menu time. Record retries separately. Do not state that the two-hour requirement is met until it is.
8. Ask independent critics to identify concrete weaknesses in screenshots and motion. Compare legibility, density, material quality, animation, and responsiveness against real commercial references without pretending subjective superiority can be certified by a prompt.

Iteration should respond to observed defects. An unbounded instruction to call every part perfect cannot replace a defined acceptance check, and a known shortfall must remain visible in the delivery notes.
