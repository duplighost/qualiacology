# Remington 870 Police Magnum shotgun

`shotgun.glb` uses the Remington 870 Police Magnum model and textures by **8sianDude** (Sketchfab username **haoliu95**), adapted as Winterline's Lockwood 12.

- Original creator: https://sketchfab.com/haoliu95
- Creator asset: https://sketchfab.com/3d-models/remington-870-police-magnum-12-gauge-shotgun-eea11de7e9d24b6683962b8388c319eb
- Primary license metadata: https://api.sketchfab.com/v3/models/eea11de7e9d24b6683962b8388c319eb
- Creator portfolio: https://www.artstation.com/artwork/4XVDo8
- License: **Creative Commons Attribution 4.0 International**, https://creativecommons.org/licenses/by/4.0/
- Public acquisition mirror: https://raw.githubusercontent.com/Parking-Master/FPS/main/models/weapons/shotgun.glb

The creator's primary metadata explicitly permits commercial use with attribution. The public converted mirror lost embedded original attribution; identity was checked against the original R870 model, shape, materials and markings. That provenance-chain limitation is preserved here. The mirror also contained unrelated pistol/hand assets; those meshes, materials, images, skins, animation and hierarchy are entirely excluded from the runtime derivative. No game code from the mirror was copied.

Modifications: weapon-only extraction; connected-component separation into stationary Receiver, moving Pump and Bolt; translation/rotation/scale baked into a metric receiver-centered coordinate system; original PBR image bytes preserved; separate source 12-gauge shell retained for deliberate ejection and hidden at rest. Winterline code supplies pump timing, bolt motion and the shell trajectory. These are newly implemented mechanics, not animations authored by the model creator.

The combined weapon retains 15,816 triangles. The separate shell has 830 triangles. The available converted textures are approximately 1K, below the original creator's advertised 4K weapon and 2K shell maps.

Attribution: **Remington 870 Police Magnum — 8sianDude / haoliu95, CC BY 4.0. Adapted for Winterline: weapon-only extraction, metric transform, pump and bolt separation, and procedural mechanical animation.**
