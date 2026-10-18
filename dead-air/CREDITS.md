# DEAD AIR — asset credits

The alien campaign, terrain, branching routes, flora arrangements, creature models, behavior, effects, interface and sound arrangement were made for DEAD AIR. Photographic surfaces and scanned nature assets are credited below. The source package also retains the previous industrial version and its provenance; unused industrial and character assets are excluded from the playable build.

The first-person weapon and hand adaptations below were copied from Alex's local WINTERLINE asset library. The supporting weapon alignment, magazine motion, shotgun mechanics, hand posing and glove shader were adapted from that project's code. Original license and provenance notes remain in `assets/weapons/ASSET-LICENSES.md` and `SHOTGUN-LICENSE.md`.

- **FPS AK-74m Animations** — Cransh; AK model credited to creationwasteland. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). [Source](https://sketchfab.com/3d-models/fps-ak-74m-animations-94be8385c402474cacd39bc096c6ca14). Weapon-only derivative; excluded NC arm geometry is absent. Texture optimization, receiver alignment, mechanical timing and reload adaptations retained.
- **Remington 870 Police Magnum** — 8sianDude / haoliu95. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). [Source](https://sketchfab.com/3d-models/remington-870-police-magnum-12-gauge-shotgun-eea11de7e9d24b6683962b8388c319eb). Weapon-only extraction, metric transform, pump/bolt separation and procedural animation retained.
- **Eric Rigged 001** — Renderpeople. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). [Source](https://sketchfab.com/3d-models/eric-rigged-001-rigged-3d-business-man-a46bc9f67aaa415bb4f3241eef900e7f). Player forearms/hands and enemy body scan, with optimized textures, clothing masks, glove materials, weapon grip posing, and newly modeled armor. Copied from Alex's WINTERLINE library; full character provenance is in `assets/characters/ASSET-LICENSES.md`.
- **Idle, Walk, Run locomotion** — Mixamo, retargeted via the [Three.js Soldier example](https://github.com/mrdoob/three.js/blob/r180/examples/models/gltf/Soldier.glb). Embedded game animation under Adobe's [Mixamo game-use terms](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html). The source package contains game characters, not a standalone animation library.
- **The Free Firearm Sound Library** — Ben Jaszczak, Brian Nelson, Kevin Heras, Matthew Nanney. CC0. [Source](https://opengameart.org/content/the-free-firearm-sound-library). Edited AK-47 and Benelli Nova recordings, with separate close and distant layers.
- **Footsteps, Shoe on Concrete (0514)** — Joseph SARDIN / BigSoundBank. CC0. [Source](https://bigsoundbank.com/footsteps-shoe-on-concrete-s0514.html). Four edited steps.
- **Sea waves (0698)** — Joseph SARDIN / BigSoundBank. CC0. [Source](https://bigsoundbank.com/sea-waves-s0698.html). A 36-second excerpt, faded and converted to Ogg Vorbis for coastal ambience.
- **100 CC0 metal and wood SFX** — rubberduck. CC0. [Source](https://opengameart.org/content/100-cc0-metal-and-wood-sfx). Selected recordings, with runtime pitch, filtering, spatial attenuation, and room reverb.
- **Concrete**, **Metal Plate**, **Large Floor Tiles 02** — Poly Haven / Texture Haven contributors. CC0. [Concrete](https://polyhaven.com/a/concrete), [Metal Plate](https://polyhaven.com/a/metal_plate), [Floor Tiles](https://polyhaven.com/a/large_floor_tiles_02). 1K diffuse and normal maps. Download records in `assets/surfaces/sources.json`.
- **Overcast Soil PureSky** — Poly Haven. CC0. [Source](https://polyhaven.com/a/overcast_soil_puresky). 2K HDR sky and environment lighting, graded for the coast and ending.
- **Concrete Road Barrier 02** — Amal Kumar / Poly Haven. CC0. [Source](https://polyhaven.com/a/concrete_road_barrier_02). Photogrammetry model with 1K textures, repacked into GLB and scaled for the campaign.
- **Portable Generator** — James Ray Cock / Poly Haven. CC0. [Source](https://polyhaven.com/a/portable_generator). **Barrel 03** — Serhii Khromov / Poly Haven. CC0. [Source](https://polyhaven.com/a/barrel_03). Models with 1K textures, repacked into GLB.
- **Asphalt012**, **Plaster001**, **Bricks059** — ambientCG. CC0. [Asphalt](https://ambientcg.com/a/Asphalt012), [Plaster](https://ambientcg.com/a/Plaster001), [Brick](https://ambientcg.com/a/Bricks059). 1K color, normal, and roughness maps from Alex's WINTERLINE library. [License](https://docs.ambientcg.com/license/). Additional download records are in `assets/environment/SOURCES.json`.
- **Three.js** — Three.js authors, MIT. The license is included in the source package's `THREE-LICENSE.txt`.

The source weapon metadata records limitations in the original mirror provenance. Those limitations remain applicable. All attribution and license files are included with the source and hosted game.

## Alien planet revision

- **Fern 02** — Rob Tuytel and Rico Cilliers; **Rock Moss Set 01** — Kless Gyzen; **Pine Roots**, **Coastal Cliff 02**, **Mossy Rock**, **Bark Brown 02** — Rob Tuytel; **Quiver Tree 02** — Dario Barresi and Rico Cilliers; **Grass Medium 01** and **Forest Ground 04** — Rob Tuytel and Rico Cilliers. Poly Haven, CC0. Repacked and optimized geometry, hue adaptations, instancing and wind animation. Individual source URLs and acquisition records: `assets/planet/SOURCES.json`.
- **Kloppenheim 06 PureSky** — Poly Haven, CC0. [Source](https://polyhaven.com/a/kloppenheim_06_puresky). HDR environment lighting and sky.
- **Jupiter map** — Solar System Scope / INOVE, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). [Source and license](https://www.solarsystemscope.com/textures/). Atmospheric blending and lighting in the alien sky.
- **Alien leaf atlas** — generated for this game with OpenAI's built-in image generation. The saved prompt and generation mode are in `assets/planet/SOURCES.json`. Applied to curved geometry with wind, roughness and surface relief.
- **Forest and Stream #1 (2713)** — Pierre SIBANARCO, CC0, via [BigSoundBank](https://bigsoundbank.com/foret-et-ruisseau-1-s2713.html). A 60-second excerpt, fades, level normalization and playback-rate changes for the planet's ambience.
- **three-mesh-bvh** — Garrett Johnson, MIT. `BVH-LICENSE.txt` accompanies the source and game.


October 17 revision: Creature vocals and wet impact layers use rubberduck's **80 CC0 creature SFX**, CC0: https://opengameart.org/content/80-cc0-creature-sfx . Selected bug, monster, roar, hurt and spit performances were pitch shifted, filtered, layered and level adjusted. The heavier rifle, breacher and induction reports are newly mixed from the credited Free Firearm Sound Library and rubberduck Foley. Reproducible processing: `tools/design-audio.py`.

`assets/planet/chitin-v4.png` and `canopy-v4.png` were generated with the built-in OpenAI image tool for this game and applied to the creature and canopy geometry. Their complete prompts and mode are retained in `assets/planet/CHITIN-SOURCE.json` and `CANOPY-SOURCE.json`.

Grass footsteps: Kenney, **Impact Sounds**, Creative Commons CC0. Five original Ogg recordings, selected from https://kenney.nl/assets/impact-sounds .

**Rock Face** — Dario Barresi and Greg Zaal / Poly Haven, CC0. [Source](https://polyhaven.com/a/rock_face). 2K color, normal and roughness surfaces, projected onto the terrain cliffs.

The fifth revision adds open forest clearings, moss-covered formations and hanging vines, curved sail canopies, height-dependent aerial perspective, region lighting, breakable armor, interruptible creature attacks and penetrating induction effects. Quiver Tree 02 and Coastal Cliff 02 are used again in the playable world; their scanned geometry is grounded and scaled within the authored scenery. `assets/planet/living-ground-v5.png` was generated with the built-in OpenAI image tool and covers the terrain with small living plants; its complete prompt and generation mode are retained in `assets/planet/LIVING-GROUND-SOURCE.json`. No new audio generation service was used for this revision.

The sixth revision adds a continuous forest of branching broadleaf trees and clustered undergrowth, extending across the visible slopes. The close starting cliff is replaced by a wooded rear hillside. The tree, root and shrub geometry is authored for this game and reuses the credited alien leaf atlas and bark surfaces. Distant crowns use fewer leaf sprays with reduced geometry and simpler surface lighting. Repeated trunks use the same rendered geometry for collision. `assets/planet/forest-sprays-v6.png` was generated with the built-in OpenAI image tool as a transparent atlas of small leaf sprays; its complete prompt and mode are in `assets/planet/FOREST-SOURCE.json`. No new audio was acquired for this revision.

The eighth revision adds authored living boughs, fluted calyx groves, hanging gardens, a membrane vault, continuous flight membranes, a rescue craft, planted articulated creature legs and physical armor fragments. Its short shotgun report, shell fracture, charge warning and heavy footstep are new edits of the already credited firearm, rubberduck and Kenney recordings; `tools/design-audio-v8.py` contains the processing. No external generated audio was acquired.

Runtime texture packing retains each image's original dimensions. Opaque textures use optimized JPEG encoding; transparent textures use lossless WebP. GLB geometry and animation buffers are unchanged. Original source files remain in the source project; `tools/pack-runtime.py` records the transformations in `assets/runtime/packing-proof.json`.

The ninth revision adds folded understory leaves and helical blossoms using the credited alien atlas, tapered forest boughs, sunlit leaf transmission, clearer stream water and a damaged landing pod with an open cockpit. Plant motion responds to the player and gunfire; pollinators gather around flowers and scatter. These models, materials and placement changes were authored for this game. No new external assets or generated audio were acquired.

The tenth revision reshapes the opening creatures and their attack poses, adds tissue and shell shading and articulated covers for the Crown Stag's organs, and attaches impact wounds to the animated models. Creature and guardian shots use the visible geometry, accelerated with the credited three-mesh-bvh library. The models and material changes were authored for this game using the existing credited surface images. No new external assets or audio were acquired.

`rifle-v11-0.wav` and `rifle-v11-1.wav` are shortened edits of the credited rifle-heavy recordings. The initial 52 milliseconds are retained, with a faster decay and no increase in peak level. The processing is reproducible with `tools/design-audio-v11.py`.
