# Character provenance

## Eric Rigged 001 — Renderpeople

- Creator's official asset page: https://sketchfab.com/3d-models/eric-rigged-001-rigged-3d-business-man-a46bc9f67aaa415bb4f3241eef900e7f
- Creator profile: https://sketchfab.com/renderpeople
- Primary metadata: https://api.sketchfab.com/v3/models/a46bc9f67aaa415bb4f3241eef900e7f
- License published on that creator page and in primary API metadata: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/
- Metadata license requirement: Author must be credited. Commercial use is allowed.
- Source FBX acquired from the creator's no-registration free-model pack: https://renderpeople.com/sample/free/renderpeople_free_rigged_people_FBX.zip
- Download listing: https://renderpeople.com/free-3d-people/
- Also reviewed creator website terms: https://renderpeople.com/general-terms-and-conditions/ . Section4.1(b) explicitly permits real-time computer/video games, while4.3(b) forbids easily accessible standalone redistribution under that website license. The creator's separate CC BY4.0 publication is recorded above. Do not market or redistribute the source pack as a standalone asset product.
- Acquisition: only the nested Eric ZIP, bytes56–45243981 of the official pack, downloaded. No Carla/Claudia data downloaded.
- Original geometry includes a bound88-bone skeleton and20,539 nondegenerate triangles as loaded by Three.js0.180 FBXLoader.
- Runtime changes: FBX->glTF, duplicate vertices merged, four skinning influences normalized, centimeter scale retained under0.01 root,4K diffuse/2K normal/1K converted gloss-to-roughness maps embedded. This is a development derivative requiring rendered inspection.

Suggested attribution: “Eric Rigged001” by Renderpeople, licensed CC BY4.0. Adapted for Winterline: format/texture optimization and animation retargeting.

### Clothing variation and collapse posing

`eric-clothing-mask.png` is derived from the creator's included `mask01` and
`mask02` texture maps under the same CC BY 4.0 grant. Their suit/trouser and shirt
regions are packed into red and green channels, vertically aligned with the
runtime GLB, thresholded to remove JPEG edge noise, reduced to 1024px, and
slightly inset to prevent tint bleeding. Three shared muted clothing palettes
use this mask. The scanned face, hair, and skin texture are unchanged.

Winterline also supplies a procedural skeletal collapse: the current animation
pose blends into a knee buckle and side fall, with separate limb/torso settling
and weapon release. It is newly authored posing, not an additional Renderpeople
or Mixamo animation clip. Body contact uses a shared sample of the skinned
surface; it is not a full physics ragdoll.

## Locomotion — Mixamo via Three.js Soldier example

- Original source: https://github.com/mrdoob/three.js/blob/r180/examples/models/gltf/Soldier.glb
- Three.js example credits model to Mixamo: https://threejs.org/examples/webgl_animation_skinning_blending.html
- Adobe states characters and animations are royalty-free for video games: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
- Idle, Walk, Run retargeted onto Eric using rest-pose world rotation deltas. Mixamo content is used as embedded game animation; do not redistribute it as a standalone animation library.

No AI training or dataset use is involved. No publication or final quality acceptance is implied by this acquisition.

## Enemy rifle

The enemy uses the same licensed weapon-only AK-74m as the player. Creator: Cransh; CC BY 4.0. Source: https://sketchfab.com/3d-models/fps-ak-74m-animations-94be8385c402474cacd39bc096c6ca14 . The separate noncommercial hand contribution is removed from the runtime weapon. See ../weapons/ASSET-LICENSES.md for the full weapon provenance. Enemy hands belong to Eric above.

