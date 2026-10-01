# BREAKWATER — asset credits

BREAKWATER is an original game for Qualiacology. Its architectural geometry,
maintenance machines, kinetic lance, encounters, interface and progression are
created for this game. The surface photographs below are reused with their
documented licences. No endorsement by their creators is implied.

## Photographic surfaces

These surfaces are released under **CC0 1.0 Universal**:
<https://creativecommons.org/publicdomain/zero/1.0/>.
Original sources are [ambientCG](https://docs.ambientcg.com/license/) and
[Poly Haven](https://polyhaven.com/license). Both permit commercial use,
modification and redistribution. Credits are retained for traceability.

| BREAKWATER material | Original asset | Creator |
| --- | --- | --- |
| concrete | [Concrete 035](https://ambientcg.com/a/Concrete035) | ambientCG / Lennart Demes |
| concreteClean | [Concrete 047 A](https://ambientcg.com/a/Concrete047A) | ambientCG / Lennart Demes |
| steel | [Corrugated Steel 009](https://ambientcg.com/a/CorrugatedSteel009) | ambientCG / Lennart Demes |
| rust | [Rust 003](https://ambientcg.com/a/Rust003) | ambientCG / Lennart Demes |
| brick | [Bricks 089](https://ambientcg.com/a/Bricks089) | ambientCG / Lennart Demes |
| stone | [Rock 001](https://ambientcg.com/a/Rock001) | ambientCG / Lennart Demes |
| marble | [Marble 012](https://ambientcg.com/a/Marble012) | ambientCG / Lennart Demes |
| wood | [Wood 049](https://ambientcg.com/a/Wood049) | ambientCG / Lennart Demes |
| dark / iron | [Metal 046 B](https://ambientcg.com/a/Metal046B) | ambientCG / Lennart Demes |
| soil | [Brown Mud Leaves 01](https://polyhaven.com/a/brown_mud_leaves_01) | Rob Tuytel / Poly Haven |
| grass | [Leafy Grass](https://polyhaven.com/a/leafy_grass) | Charlotte Baglioni / Poly Haven |
| moss | [Moss 002](https://ambientcg.com/a/Moss002) | ambientCG / Lennart Demes |
| bark | [Bark Brown 02](https://polyhaven.com/a/bark_brown_02) | Rob Tuytel / Poly Haven |
| plaster | [Painted Plaster 017](https://ambientcg.com/a/PaintedPlaster017) | ambientCG / Lennart Demes |
| snow | [Snow 010 A](https://ambientcg.com/a/Snow010A) | ambientCG / Lennart Demes |
| leaf | [Leaf Set 027](https://ambientcg.com/a/LeafSet027), [028](https://ambientcg.com/a/LeafSet028), [021](https://ambientcg.com/a/LeafSet021), [012](https://ambientcg.com/a/LeafSet012) — source sets of the retained OLLY OLLY atlas | ambientCG / Lennart Demes |

Materials are prepared from documented local copies in OLLY OLLY and WINTERLINE,
not from promotional renders or screenshots. The leaf is a single matching crop
from OLLY OLLY's photographic leaf atlas, with four transparent guard pixels at
each edge to exclude neighboring atlas fragments; its retained source record names the four
original sets, without identifying the individual tile's set more precisely.

The neutral worn brass surface was authored for OLLY OLLY and marked **CC0 1.0**
in that game's material library. BREAKWATER reuses those maps for brass, painted
metal and patinated metal through physical material settings and colour tinting.
Glass and emissive surfaces use original material settings. The water normal map
is generated from original periodic wave derivatives.

### Preparation and colour handling

The shipped files are standard WebP textures. Existing gzip wrapping is decoded;
DXT1/DXT5 colour and packed surface maps are decoded. BC5 OpenGL normal maps are
decoded into tangent-space XY, positive Z is reconstructed, and vectors are
normalized. Normal resizing re-normalizes vectors. Colour maps retain their sRGB
encoding. Normal and ORM maps remain linear data, with no gamma correction.
ORM channels are red = ambient occlusion, green = roughness, blue = metallic.
Colour images use quality-91 WebP; normal and ORM data use lossless WebP.

[The asset manifest](assets/textures/sources.json) contains every retained source
path, creator, licence, source URL, source SHA-256, output SHA-256, dimensions,
world-scale tile size, and conversion description. Donor files are unchanged.

## Photographic sky and reflections

`assets/sky/coastal-clouds-2k.hdr` is the unmodified 2K HDR version of
[Kloofendal 48d Partly Cloudy (Pure Sky)](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky),
photographed by **Greg Zaal**, with sky edits by **Jarod Guest**, distributed by
Poly Haven under **CC0 1.0**. [Publisher licence](https://polyhaven.com/license).
The file was downloaded directly from Poly Haven and checked against the byte
count and MD5 published by its asset API. Runtime environment intensity and
lighting are adapted for the game's districts.
[Its source record](assets/sky/source.json) retains the original URL, filename,
authors, published checksum and SHA-256. The accompanying RGBELoader is the
official Three.js revision 161 loader, under the same MIT notice as Three.js.

## Audio

The adaptive electronic score and kinetic-lance sounds are composed and
synthesized for BREAKWATER. They contain no sampled commercial music or game audio.

Recorded layers are **CC0 1.0**:

| Runtime files | Source | Creator |
| --- | --- | --- |
| `assets/audio/step-0.wav` through `step-3.wav` | [Footsteps, Shoe on Concrete (0514)](https://bigsoundbank.com/footsteps-shoe-on-concrete-s0514.html) | Joseph Sardin / BigSoundBank |
| `assets/audio/metal-*.ogg`, `punch-*.ogg`, `glass-*.ogg` | [Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney |
| `assets/audio/cloth-*.ogg` | [RPG Audio](https://kenney.nl/assets/rpg-audio) | Kenney |

The existing trimmed mono 48 kHz recordings are copied unchanged from the
documented WINTERLINE and OLLY OLLY assets. Runtime pitch, gain and spatial
variation, and layering with original synthesized effects, are BREAKWATER work.
[The audio source manifest](assets/audio/sources.json) identifies each donor file,
source page, licence, adaptation and SHA-256. BigSoundBank's creator licence
statement is available at <https://bigsoundbank.com/licenses.html>.

## Software

[Three.js](https://threejs.org/), revision 161, copyright Three.js Authors,
is used under the MIT licence. [The full notice is retained here](vendor/THREE-LICENSE.txt).

The optional contact-occlusion effect also uses official Three.js revision 161
SSAOPass, SSAOShader and SimplexNoise sources, covered by the retained
[Three.js MIT notice](vendor/THREE-LICENSE.txt).

## Detailed props

The six local models below are original **1K glTF** downloads from
[Poly Haven](https://polyhaven.com/license), released under **CC0 1.0 Universal**.
Their geometry, binary buffers and JPG texture maps are unmodified. BREAKWATER
centers their runtime instances, places each model's base at floor height, and
adapts environment-reflection intensity to the district lighting. Colour and
emission maps remain sRGB; normal and packed surface maps remain linear.

| Runtime prop | Original model | Creator |
| --- | --- | --- |
| barrel | [Barrel 03](https://polyhaven.com/a/barrel_03) | Serhii Khromov |
| storage cart | [Industrial Storage Cart](https://polyhaven.com/a/industrial_storage_cart) | Jule Bielitz |
| gas tank | [Propane Tank](https://polyhaven.com/a/propane_tank) | Slinc |
| rock | [Rock Face 02](https://polyhaven.com/a/rock_face_02) | Dario Barresi; processing by Rico Cilliers |
| wooden crate | [Wooden Crate 02](https://polyhaven.com/a/wooden_crate_02) | James Ray Cock; graphic design by Jurita Burger |
| hanging lamp | [Hanging Industrial Lamp](https://polyhaven.com/a/hanging_industrial_lamp) | Kuutti Siitonen |

[The prop source manifest](assets/props/sources.json) records every downloaded
file, original URL, published byte count and MD5, independently calculated
SHA-256, model authors and publisher licence statement. Every original file
matched its published size and MD5. These six unmodified models total 14,434,117 bytes
(13.77 MiB), with no external runtime asset requests. Shared model instances
reuse their geometry, materials and textures. The accompanying GLTFLoader and
BufferGeometryUtils are official Three.js revision 161 sources, covered by the
retained [MIT notice](vendor/THREE-LICENSE.txt).

### Conservatory specimen tree

The foreground botanical specimen is
[Quiver Tree 01](https://polyhaven.com/a/quiver_tree_01), photographed by
**James Ray Cock** and **Dario Barresi**, modeled by **Rico Cilliers**, and
released by Poly Haven under **CC0 1.0 Universal**. The original source downloads
were verified against the publisher's byte counts and MD5 hashes.

BREAKWATER reduces its original glTF geometry from 150,124 to **26,000 triangles**
with separate trunk and foliage budgets in Blender 4.3.2. All six original 1K JPG
maps are embedded byte-for-byte unchanged. The resulting local GLB is
**5,268,732 bytes (5.02 MiB)** and requires no additional decoder. The foliage
uses opaque geometric silhouettes; unnecessary blending was removed because
its source images and material factor contain no transparency. Original source
hashes, preparation steps, output hashes and measured bounds are retained in
[the prop manifest](assets/props/sources.json). The original large model is not
part of the shipped game.

## Typefaces

[Space Grotesk](https://github.com/floriankarsten/space-grotesk) and
[Inter](https://rsms.me/inter/) are hosted locally and used under the
**SIL Open Font License 1.1**. Their notices are retained with the font files:
[Space Grotesk OFL](assets/fonts/Space-Grotesk-OFL.txt) and
[Inter OFL](assets/fonts/Inter-OFL.txt).
