# Interior furniture

Both source models and their texture maps are provided by Poly Haven under
CC0 1.0 Universal: https://creativecommons.org/publicdomain/zero/1.0/
Poly Haven's license statement: https://polyhaven.com/license

## Leather and oak armchair

- Modern Arm Chair 01 by **Vibrant Nordic**.
- Creator's page: https://polyhaven.com/a/modern_arm_chair_01
- Official file listing: https://api.polyhaven.com/files/modern_arm_chair_01
- Direct source: https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/modern_arm_chair_01/modern_arm_chair_01_1k.gltf
- Runtime: `armchair.glb`, 2,696,324 bytes, 8,916 triangles, two materials and six 1K JPEG maps.
- SHA256: `899c44e3aef81c39d5050cd0b9430559d0e1039b3c7c634a8f335915127cbd4e`

The source is approximately 0.820 m wide, 0.987 m deep and 1.023 m high.

## Café table and chairs

- Outdoor Table Chair Set 01 by **James Ray Cock**.
- Creator's page: https://polyhaven.com/a/outdoor_table_chair_set_01
- Official file listing: https://api.polyhaven.com/files/outdoor_table_chair_set_01
- Direct source: https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/outdoor_table_chair_set_01/outdoor_table_chair_set_01_1k.gltf
- Runtime: `cafe.glb`, 1,239,964 bytes, 9,828 triangles, two materials and six 1K JPEG maps.
- SHA256: `2fb3b02d1c1aa140235f9ca5922b3955e6541b69fd9ea7c265d84443a001d8a3`

The tabletop is approximately 0.692 m square and 0.726 m above the floor. The
two chairs retain their source arrangement and natural angles.

## Adaptations

The official glTF, binary buffer and six referenced diffuse/OpenGL-normal/ARM
JPEG files for each model are embedded in a self-contained GLB. Geometry and
image bytes are retained. Each downloaded file was checked against the source
API's byte count and MD5; source metadata and preparation records are in the
project's ignored `work/furniture-sources` directory.

At runtime, mesh transforms are baked and geometry is merged by material.
Armchairs are centered horizontally and placed on the floor. The café set is
anchored at its table's center; each source mesh is grounded separately, removing
the source chairs' roughly 6 mm floor penetration without changing scale.
The red channel of the official ARM maps supplies ambient occlusion. All
districts share the four resulting geometries and materials; placements use
instanced meshes. No source archives, website example renders or unrelated assets
are distributed.

Other interior joinery, layouts, rugs, menu boards, lamps, holiday ribbons and
awning artwork are original game content.
