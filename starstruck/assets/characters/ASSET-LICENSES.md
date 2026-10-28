# Character sources

Character models are adapted from the following source assets. The source files and changes are recorded in the project provenance.

## Eric Rigged 001 â€” Rigged 3D Business Man

Renderpeople — CC BY 4.0

https://sketchfab.com/3d-models/eric-rigged-001-rigged-3d-business-man-a46bc9f67aaa415bb4f3241eef900e7f

https://creativecommons.org/licenses/by/4.0/

Changes: Original GLB preserved. Runtime scanned-clothing mask, cold skin grading, silt and bruising; hunched additive spine pose, local bone hit springs, captured-pose physical knockdown/death.

## public/assets/characters/caller/mask.glb

Renderpeople body scan; mask, cloth and animation adaptation authored for Alex's OLLY OLLY — Body scan CC BY 4.0; preserve source metadata for authored additions

https://sketchfab.com/3d-models/eric-rigged-001-rigged-3d-business-man-a46bc9f67aaa415bb4f3241eef900e7f

https://creativecommons.org/licenses/by/4.0/

Changes: Original GLB preserved. Only ghoul face and hood shown; bag and collar hidden; cloth and face grading muted. Original skeleton and clips with caller gesture, interruptible call and physical body reactions.

## public/assets/characters/husk/husk.glb

Sculpted for Alex's OLLY OLLY project — Existing Alex-owned project asset; no separate third-party asset attribution found in donor





Changes: Original sculpted GLB preserved. Donor rigid skinning and all-fours gait adapted, reduced scale, damped inner emissive materials, live claw/foot surface contacts, physical retained corpse.

## public/assets/characters/cast-lod.bin, cast-lod.json

Levels of detail for Eric (8000, 4000 and 1800 triangles over his own vertices), made with meshoptimizer 1.1.1
(simplifyWithAttributes, keeping UVs and normals) — meshoptimizer is MIT (LICENSE.meshoptimizer.txt).

## Carla, Claudia, Manuel, Nathan, Sophia (carla.glb, claudia.glb, manuel.glb, nathan.glb, sophia.glb)

Renderpeople — free 3D People (rp_carla_rigged_001, rp_claudia_rigged_002, rp_manuel_rigged_001, rp_nathan_rigged_003, rp_sophia_rigged_003), downloaded 27 Oct 2026 from the free rigged and animated people packs

https://renderpeople.com/free-3d-people/

Terms: Renderpeople's free models: "Free Download, Free Commercial Use, No Registration Required", under the same terms of use as their shop models (use in a game is allowed; the models themselves are not redistributed as files for others to reuse).

Changes (tools/cast/convert-rp.mjs, package-rp.py, lod.mjs): FBX converted to GLB; vertices deduplicated; weights normalized; arms swung from the A-pose into Eric's T and that baked as the rest pose; scaled to Eric's height in the file (the game restores each person's own height); diffuse resized to 2048, normal to 2048, roughness from the gloss channel at 1024; a clothing mask drawn from the pack's garment masks; three coarser levels of detail. Driven at runtime by OLLY OLLY's clips and dressed by the same shader as Eric.
