# Vehicles

## Drivable coupe

- **Asset:** Car Concept, model and textures by Eric Chadwick, copyright 2024 Darmstadt Graphics Group GmbH.
- **Primary source:** https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept
- **Source license:** https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/CarConcept/LICENSE.md
- **License:** Creative Commons Attribution 4.0 International — https://creativecommons.org/licenses/by/4.0/legalcode
- **Source GLB:** https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb
- **Original design:** Unity Fan's public-domain Concept Car 004, credited in the primary source README.
- **Runtime file:** `coupe.glb`.

Adaptations: removed the license-plate and steering-emblem logo geometry, removed
unused material variants, welded/simplified geometry with a 0.0006 relative error
limit, and retained the source image bytes. The runtime file contains 114,874
triangles. Runtime rendering grounds and centers the car, makes its forward axis
negative Z, straightens the showcase front-wheel pose, and batches shared geometry
by material and moving part. Paint, glass, cabin and light material settings are
adapted for nighttime play. Wheels, doors and the hood move independently.
Drivers use the separately credited Renderpeople Eric character.

The source license excludes Khronos logos and associated trademarks from the
model's copyright license. The two logo mesh nodes are omitted; the original
Khronos/glTF tire markings remain in the source textures. The accompanying
`KHRONOS-MARK-NOTICE.txt` preserves the source notice about those marks.
No endorsement by any asset creator is implied.

## Covered Car

- **Asset:** Covered Car, by MP / Poly Haven.
- **Creator's page:** https://polyhaven.com/a/covered_car
- **Source metadata:** https://api.polyhaven.com/info/covered_car
- **Original file listing:** https://api.polyhaven.com/files/covered_car
- **License:** CC0 1.0 Universal — https://creativecommons.org/publicdomain/zero/1.0/
- **Poly Haven license statement:** https://polyhaven.com/license
- **Runtime file:** `covered-car.glb`.

The direct Poly Haven glTF source and its original 1K JPEG diffuse, OpenGL normal,
and packed ambient-occlusion/roughness/metallic maps were packed into a GLB. The
image bytes are unchanged. The original model contains 12,592 triangles and is
approximately 1.789 m wide, 4.380 m long, and 1.411 m high.

At runtime, the separate wheels and fabric cover are transformed and merged into
one shared geometry. The duplicate materials use the same atlas and PBR values,
so they share one material. The mesh is centered horizontally and grounded on its
tires, retaining its original scale. Districts instance a deterministic selection
of cars. No source archive or unrelated material is included.
