# The ground

Terrain, road and paving textures packed by `tools/ground-pack.py` (1024 px
layers, stacked into WebP strips the game loads as texture arrays), plus two
generated textures and three rock scans. All sources are CC0 1.0; nothing here
needs attribution.

## Texture layers (CC0 1.0)

`terrain-albedo.webp`, `terrain-normal.webp`, in order:

- lawn: Grass 001, ambientCG (via GPT-6 Pro's Outdoors pack) — https://ambientcg.com/a/Grass001
- dry grass: Grass Ground, Charlotte Baglioni, Poly Haven — https://polyhaven.com/a/grass_ground
- chaparral soil: Forest Ground 04, Rob Tuytel / Rico Cilliers, Poly Haven — https://polyhaven.com/a/forest_ground_04
- trail dirt: Gravelly Sand, Dario Barresi, Poly Haven — https://polyhaven.com/a/gravelly_sand
- rock: Rock Face 03, Dario Barresi / Rico Cilliers, Poly Haven — https://polyhaven.com/a/rock_face_03
- creek sand: Damp Beach Sand 02, Poly Haven — https://polyhaven.com/a/damp_beach_sand_02

`paved-albedo.webp`, `paved-normal.webp`, in order:

- asphalt: Asphalt 030, ambientCG — https://ambientcg.com/a/Asphalt030
- newer asphalt (patches): Asphalt 033, ambientCG — https://ambientcg.com/a/Asphalt033
- concrete (curbs, gutters, sidewalks): Concrete 047 A, ambientCG — https://ambientcg.com/a/Concrete047A
- pavers (driveways): Paving Stones 138, ambientCG — https://ambientcg.com/a/PavingStones138

Modified: resized to 1024 px, height and roughness and ambient occlusion
repacked into the alpha and blue channels, WebP.

## Generated

`road-detail.webp` (cracks, sealant, patches and oil for 96 m of road) and
`ground-noise.webp` (tileable noise) are made by `tools/ground-pack.py`.

## Rocks (`rocks/`, CC0 1.0)

- `cliff02.glb`: Coastal Cliff 02, Rob Tuytel, Poly Haven — https://polyhaven.com/a/coastal_cliff_02
- `cliff04.glb`: Coastal Cliff 04, Rob Tuytel / Rico Cilliers, Poly Haven — https://polyhaven.com/a/coastal_cliff_04
- `rock09.glb`: Rock 09, Poly Haven — https://polyhaven.com/a/rock_09

Modified: simplified to about 5k (cliffs) and 2.5k (rock) triangles from
GPT-6 Pro's reduced copies, textures 1024 px WebP, meshopt-compressed.
