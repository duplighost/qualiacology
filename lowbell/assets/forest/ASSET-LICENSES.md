# LOWBELL foliage sources

The selected branch-generation source and processed textures come from Alex's
current OLLY OLLY project at
`C:/Users/Alex/Projects/olly-olly-wt/integration-20260923`. The donor is unchanged.
LOWBELL has its own planting plan, terrain exclusion, collision registration,
wind treatment, instancing, distance LOD renderer and disposal. No OLLY map is
included. Per-file paths and hashes are in `assets/foliage-provenance.json`.

## Photographic bark and needles — CC0 1.0

- **Bark Brown 01** and **Bark Brown 02**, by **Rob Tuytel / Poly Haven**:
  https://polyhaven.com/a/bark_brown_01 and https://polyhaven.com/a/bark_brown_02
- **Fir Tree 01** bark and needle maps, by **Rob Tuytel and Rico Cilliers / Poly Haven**:
  https://polyhaven.com/a/fir_tree_01

License: https://creativecommons.org/publicdomain/zero/1.0/

The selected OLLY adaptations store bark/needle albedo as DDS DXT1/DXT5, normals
as KTX2 BC5, and combined ambient occlusion/roughness/metalness as DDS. These maps
are unchanged in this port. Twig UV rectangles sample the photographic fir atlas.

## Generated twig/fern atlas and birch bark

`forest_cards.*` combines OLLY-generated branch/fern geometry rendered into cards
with sixteen photographed leaf cutouts from **ScatteredLeaves007**, by
**Lennart Demes / ambientCG**, CC0 1.0:
https://ambientcg.com/a/ScatteredLeaves007

The exact source construction is retained in the donor's
`tools/forest/atlas.py`, `tools/forest/cards.mjs` and
`tools/blender/tree_cards.py`. Card silhouettes are drawn as the fitted polygons
from the original generated `hulls.js`, reducing empty transparent area.

`birch_bark.*` was procedurally authored in OLLY's `tools/forest/birch.py`, with
horizontal lenticels, peeled edges and normal/roughness detail. It is not a
photographic scan. Original tree generation and generated texture work belong
to Alex's game project.

## Rendering scope

The runtime uses five species: oak, maple, paper birch, spruce and hemlock. Each
has distinct generated branch architecture. Photo-based conifer cards, physical
bark shading and three mesh LODs are retained. No downloaded 478 MB tree mesh or
runtime GPU impostor atlas bake is used.
