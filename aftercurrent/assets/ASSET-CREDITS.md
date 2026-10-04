# AFTERCURRENT asset credits

Original game, environments, rescue equipment model, and adaptations by Alex / Qualiacology with Codex.

The machine-readable `asset-manifest.json` records copied file hashes. `materials/library.json` and the `<asset>.source.json` records alongside scanned props retain creator names, source URLs, licences, and processing information. Donor files were copied without modifying the original games; private source-copy paths remain in the editable project.

## Materials and scanned props

Concrete035, Concrete047A, Metal046B, Rust003, Rock001, Moss002, Fabric001, Leather014, Plaster007, Bricks026, and CorrugatedSteel009 by **Lennart Demes / ambientCG**, distributed under **CC0 1.0**: https://ambientcg.com/ and https://creativecommons.org/publicdomain/zero/1.0/.

Pine bark derives from **Poly Haven's pine_tree_01** and fir needles from **fir_tree_01**. The rock faces, barrel, wooden crate, ladder, manhole cover, overhead crane, compressor and industrial pipe kit are **Poly Haven CC0** scans and models. Exact creators are retained in their per-asset records. Source: https://polyhaven.com/; licence: https://polyhaven.com/license.

The daylight environment uses **Kloofendal 48d Partly Cloudy**, a Poly Haven CC0 HDRI: https://polyhaven.com/a/kloofendal_48d_partly_cloudy.

Cast foundations and service-passage concrete use **Brushed Concrete 2**, photographed by **Dimitrios Savva** and processed by **Dario Barresi / Poly Haven**, CC0: https://polyhaven.com/a/brushed_concrete_2. Structural enamel uses a grey-green adaptation of **Green Metal Rust** by **Rob Tuytel / Poly Haven**, CC0: https://polyhaven.com/a/green_metal_rust. Both sets use locally encoded BC1/BC5 textures and complete mip chains; exact sources and hashes are in their material folders.

The Vale Hydro alternators are original geometry authored for AFTERCURRENT. Their painted surfaces use **Green Metal Rust** by **Rob Tuytel / Poly Haven**, CC0. Source and processing records are in `industrial/vale-turbine/asset-manifest.json`.

## Hands and breaching gun

The scanned hands and forearms derive from **Eric Rigged 001** by **Renderpeople**, published under **CC BY 4.0**. They were extracted from the body, smoothed, reskinned, posed, and given authored work-glove and sleeve shading through Winterline, OLLY OLLY, and AFTERCURRENT. The runtime file contains no original full-body mesh.

Source: https://sketchfab.com/3d-models/eric-rigged-001-rigged-3d-business-man-a46bc9f67aaa415bb4f3241eef900e7f

The breaching gun uses the **Remington 870 Police Magnum** by **8sianDude / haoliu95**, published under **CC BY 4.0**. The runtime derivative separates receiver, pump, bolt and shell, optimizes textures, and uses original gameplay-driven mechanical animation. Detailed source and acquisition qualifications are retained in `weapons/SHOTGUN-LICENSE.md`.

CC BY 4.0: https://creativecommons.org/licenses/by/4.0/

The authored cable cuff is new geometry created for AFTERCURRENT. Its editable source is `tools/build-cable-cuff.py` in the game source folder. It uses no third-party geometry.

## CLAMP machinery

The CLAMP capture crawler body, forged jaws, hydraulic linkages and articulated suspension are original AFTERCURRENT geometry authored for Alex / Qualiacology. Its photographed paint derives from **Green Metal Rust** by **Rob Tuytel / Poly Haven**, **CC0 1.0**. The photographs are tinted, projected and baked with geometry wear, cavity shading and relief into the original machinery. The four legs use rigid component joints with working piston travel and compliant rubber soles. Source credits, image hashes and runtime asset hashes are in `industrial/clamp/asset-manifest.json` and `industrial/clamp/legs-manifest.json`. Both runtime models use Draco compression; the approved body photographs and material definitions are preserved byte for byte.

Source: https://polyhaven.com/a/green_metal_rust. Licence: https://creativecommons.org/publicdomain/zero/1.0/

## Sound

The firearm recordings originate from **The Free Firearm Sound Library** by **Ben Jaszczak, Brian Nelson, Kevin Heras, and Matthew Nanney**, **CC0 1.0**. Source: https://opengameart.org/content/the-free-firearm-sound-library.

Recorded handling, impact, footsteps, and wind clips include **Kenney** and **Joseph Sardin / BigSoundBank**, under their documented **CC0** grants. Runtime edits include trimming, layering, fades, pitch/level changes and OGG encoding. Full acquisition records are retained in `licenses/SOURCES.md`; firearm and mechanical attribution is in `audio/guns/ASSET-LICENSES.md`.

## Retained records

`licenses/ASSET-LICENSES.md`, `licenses/SOURCES.md`, and `weapons/ASSET-LICENSES.md` are unabridged donor records. They describe the wider donor libraries and may mention assets that AFTERCURRENT does not include. The present game includes only the bounded subset listed in `asset-manifest.json`.

The software notices from the donor loader are retained in `licenses/THIRD-PARTY-NOTICES.txt`.
# Intake machinery

SKIMMER and PICKET geometry and mechanical assemblies were authored for Alex / Qualiacology in Blender. Their painted and machined finishes use CC0 Green Metal Rust by Rob Tuytel / Poly Haven and Metal046B by Lennart Demes / ambientCG. Original authoring sources and detailed manifests remain in the project. Each runtime asset folder includes its own license and material provenance. No manufacturer models or reference images are distributed.

