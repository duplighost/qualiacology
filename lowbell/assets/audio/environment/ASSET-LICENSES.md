# Environmental and creature recordings

The selected samples in this folder are accompanied by per-file hashes, source
paths, recording descriptions and modification records in
`assets/audio-provenance.json`. Existing donor projects have not been changed.

## Joseph SARDIN / BigSoundBank — CC0 1.0

Additional sounds: **Joseph SARDIN — BigSoundBank.com**.
Source license: https://bigsoundbank.com/licenses.html
CC0: https://creativecommons.org/publicdomain/zero/1.0/

The selected local OLLY excerpts retain that project's recorded-source manifest:

| Runtime groups | Original recording |
| --- | --- |
| rain.concrete | [Rain on concrete #1289](https://bigsoundbank.com/rain-on-concrete-s1289.html), newly prepared 12–48 second excerpt |
| rain.puddle | [Rain on Puddle #1290](https://bigsoundbank.com/rain-on-puddle-s1290.html), newly prepared 8–40 second excerpt |
| wind.a, wind.b, wind.gust | [Wind in the Trees #0904](https://bigsoundbank.com/forest-wind-in-the-trees-s0904.html) |
| bell.chapel | [1 church bell #0830](https://bigsoundbank.com/1-church-bell-s0830.html) |
| thunder | [Thunder #2, #3113](https://bigsoundbank.com/thunder-2-s3113.html) |
| crows | [Crows #0754](https://bigsoundbank.com/crows-s0754.html), [Carrion Crow #3461](https://bigsoundbank.com/carrion-crow-1-s3461.html) |
| owl | [Tawny Owl #1763](https://bigsoundbank.com/tawny-owl-1-s1763.html) |
| door.open, door.close | [Light door #0377](https://bigsoundbank.com/opening-and-closing-light-door-s0377.html), [Opening #1702](https://bigsoundbank.com/apartment-door-opening-1-s1702.html), [Closing #1704](https://bigsoundbank.com/apartment-door-closing-1-s1704.html), and Kenney |
| door.creak | [Creak #3205](https://bigsoundbank.com/creaking-door-2-s3205.html), #1702, #1704, [Long creak #0306](https://bigsoundbank.com/long-creaking-door-s0306.html), and Kenney |
| door.slam | [Door Slamming #0103](https://bigsoundbank.com/door-slamming-s0103.html) |
| floor.creak | [Parquet #3051](https://bigsoundbank.com/squeaking-parquet-1-s3051.html), [Parquet #3055](https://bigsoundbank.com/squeaking-parquet-5-s3055.html), and Kenney |
| step.concrete, step.asphalt, step.stone, step.tile, step.metal | [Concrete shoe #0514](https://bigsoundbank.com/footsteps-shoe-on-concrete-s0514.html); material variants filtered/layered in OLLY |
| step.gravel | [Gravel #0510](https://bigsoundbank.com/steps-on-gravels-s0510.html) |
| step.grass, step.dirt, step.mud | [Short grass #0854](https://bigsoundbank.com/steps-in-the-short-grass-s0854.html); dirt/mud variants filtered in OLLY |
| step.leaves | [Leaves #0137](https://bigsoundbank.com/feet-in-leaves-s0137.html) |
| step.creaky | [Wooden stairs #3212](https://bigsoundbank.com/step-wooden-staircase-1-s3212.html) |
| twig | [Twigs #1301](https://bigsoundbank.com/steps-on-the-twigs-s1301.html) |
| falls.roar | [Mountain Stream #7 #3222](https://bigsoundbank.com/mountain-stream-7-s3222.html), 36 second excerpt (the falls) |
| falls.cascade | [Small Cascade #0507](https://bigsoundbank.com/small-cascade-s0507.html), 26 second excerpt (the side fall on the ledge) |
| falls.lap | [Pontoon, marina #1444](https://bigsoundbank.com/pontoon-marina-s1444.html), 32 second excerpt (the lagoon in the grotto) |

New rain excerpts are taken from the source site's public MP3 recording, trimmed,
converted to mono 48 kHz, DC removed, close-droplet peaks softly limited, level
adjusted, faded, and Vorbis encoded.
Runtime crossfades loop boundaries and low-passes/attenuates weather indoors.

## Kenney — CC0 1.0

[Impact Sounds](https://kenney.nl/assets/impact-sounds) and
[RPG Audio](https://kenney.nl/assets/rpg-audio), by **Kenney**.
License: https://creativecommons.org/publicdomain/zero/1.0/

`body.hit`, `body.thud`, `soft.hit`, `wood.hit`, `wood.plank`, `metal.hit`,
`metal.light`, `stone.hit`, `glass.heavy`, `glass.light`, `cloth`, `latch`,
`pickup`, `step.wood`, `step.carpet`, and the Kenney layers of mixed door/step
groups are the selected processed OLLY excerpts. Their construction is identified
in the manifest. No claim is made that a surface variant is an independent new
field recording.

## nornalbion — CC BY 4.0

`creature.breath.*`, `creature.growl.*`, `creature.snarl.*`, and
`creature.screech.*` use **Large monster breathing, growls and screeches** by
**nornalbion** (July 30, 2013):
https://freesound.org/people/nornalbion/sounds/195733/

License: https://creativecommons.org/licenses/by/4.0/

The creator performed the sounds with their mouth and processed the recording.
This adaptation uses the public high-quality MP3 preview. Changes: selected
excerpts, mono 48 kHz conversion, DC removal, level adjustment, short fades, Ogg
Vorbis encoding; runtime pitch, duration and low-pass differences for creature
roles. These are modifications by LOWBELL's developers, not an endorsement by the
original creator. Full source file and exact cut times are retained in the
processing script and provenance manifest.

## Original score and reward design

`src/audio/score.js` contains a new adaptive rhythmic arrangement for LOWBELL,
made from the CC0 chapel bell, body impacts and metal recordings credited above.
Intensity reveals rhythmic layers; gunshots duck the music. Progression cues
combine recorded leather/metal transients and short tuned bell fragments. No
donor vocal track or complete donor musical composition is used.

Gun recordings and mechanical Foley are covered separately in
`../guns/ASSET-LICENSES.md`.
