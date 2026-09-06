# Weapon and first-person hand credits

## AK-74m weapon — creationwasteland; animation/adaptation by Cransh

`carbine.glb` is the weapon-only derivative of **FPS AK-74m Animations** by **Cransh**, whose published description credits **creationwasteland** for the AK model.

- Creator's adaptation page: https://sketchfab.com/3d-models/fps-ak-74m-animations-94be8385c402474cacd39bc096c6ca14
- Primary metadata, reviewed September 5, 2026: https://api.sketchfab.com/v3/models/94be8385c402474cacd39bc096c6ca14
- Published adaptation license: **Creative Commons Attribution 4.0 International**; https://creativecommons.org/licenses/by/4.0/
- Original credited model creator profile: https://sketchfab.com/creationwasteland . This profile was unavailable when checked; the original leaf model's license could not be independently recovered. The retained weapon relies on Cransh's explicit CC BY publication and embedded attribution, not an assertion that the original leaf license was independently verified.
- Public acquisition mirror: https://github.com/Ayush-Mohanty/FPS-Arms-3D/tree/main/Models/fps_ak-74m_animations
- Original glTF acquisition URL: https://raw.githubusercontent.com/Ayush-Mohanty/FPS-Arms-3D/main/Models/fps_ak-74m_animations/scene.gltf

The adaptation also contained older DJMaesen first-person arms whose separate original listing is **CC BY-NC**: https://sketchfab.com/3d-models/fp-arms-8416c380544949bb9b224278819cbe6b . **Those arm meshes, texture images, and arm animation channels are excluded from this runtime derivative.** Shared source buffers were repacked by retained accessors, so excluded hand geometry is not merely hidden inside the file. Unused transform nodes remain to preserve weapon hierarchy; they contain no hand geometry or textures. The combined original stays in development source storage only and must not be copied into public assets.

Runtime changes: two weapon skinned meshes retained (main rifle and reload magazine), 25,171 triangles; weapon mechanical tracks retained from the eight original actions; main receiver motion stabilized at runtime; glTF repacked into GLB; three 2048px maps converted to JPEG; redundant specular map removed while retaining metallic/roughness material workflow; viewmodel and enemy scale/orientation normalized. Separate clean hands are described below. Firing, ammo, hit processing, and gameplay timing are Winterline implementation.

Attribution: **“FPS AK-74m Animations” — Cransh; AK model credited to creationwasteland. CC BY 4.0. Adapted for Winterline: weapon-only extraction, texture optimization, stable receiver transforms, and mechanical animation timing.**

## Eric Rigged 001 hands and forearms — Renderpeople

`hands.glb` contains only selected forearm/hand triangles from **Eric Rigged 001** by **Renderpeople**.

- Creator asset page: https://sketchfab.com/3d-models/eric-rigged-001-rigged-3d-business-man-a46bc9f67aaa415bb4f3241eef900e7f
- Primary metadata: https://api.sketchfab.com/v3/models/a46bc9f67aaa415bb4f3241eef900e7f
- Creator profile: https://sketchfab.com/renderpeople
- License explicitly published on the creator asset: **Creative Commons Attribution 4.0 International**; https://creativecommons.org/licenses/by/4.0/
- Acquired from creator's official pack: https://renderpeople.com/sample/free/renderpeople_free_rigged_people_FBX.zip
- Creator download listing: https://renderpeople.com/free-3d-people/
- Full character acquisition and license context: `../characters/ASSET-LICENSES.md`.

Runtime changes: geometry extracted by forearm/hand skin weights (original extraction: 2,006 vertices and 3,458 triangles; current gloves: 7,464 vertices and 13,832 triangles after one welded Loop subdivision with interpolated normalized weights and smooth normals); excluded upper-arm influences removed and weights renormalized; forearm twist influences remapped to posed forearms; rear sleeves extended to keep the extraction edge outside the view; original diffuse/normal maps retained, gloss converted to roughness; source body/head geometry omitted; no imported locomotion animations retained in this hand asset. Skin and cloth triangles retain two material groups. Original maps remain in the asset; runtime shaders replace the hand albedo and normal detail with fitted charcoal gloves, leather palms, fabric backs and stitched seams. Sleeves retain the scanned cloth map with a charcoal tint. Forearm roll follows the hand, elbows track camera-relative body anchors, fingers flex toward each palm with constrained thumb hinges, and reload hand paths are driven by Winterline code. Rear sleeve coverage is fitted to hide the extraction boundary through the inspected weapon poses. The creator's separately published CC BY grant is recorded above; do not market the original website sample pack as a standalone asset product.

Attribution: **“Eric Rigged 001” — Renderpeople, CC BY 4.0. Adapted for Winterline: forearm/hand extraction, sleeve adjustment, smoothed glove geometry, procedural glove materials, texture optimization, and procedural weapon grip posing.**

## Springfield Armory XD Mod.2 pistol - raimeiyonke; animation - Cransh

`pistol.glb` supplies the detailed Morrow 9 weapon. The original weapon creator is **raimeiyonke**. The separate slide and magazine animation was published by **Cransh**.

- Original weapon: https://sketchfab.com/3d-models/springfield-armory-xd-mod2-sub-compact-7e635c86995b4d27b76bfe3bb45e4bc1
- Original creator: https://sketchfab.com/raimeiyonke
- Original primary license metadata: https://api.sketchfab.com/v3/models/7e635c86995b4d27b76bfe3bb45e4bc1
- Animation adaptation: https://sketchfab.com/3d-models/fps-pistol-animations-0d7a343dcb6f401197a73c91aee93f6d
- Animation creator: https://sketchfab.com/Cransh
- Adaptation primary license metadata: https://api.sketchfab.com/v3/models/0d7a343dcb6f401197a73c91aee93f6d
- Both creator listings explicitly publish **Creative Commons Attribution 4.0 International**: https://creativecommons.org/licenses/by/4.0/
- Public acquisition mirror: https://raw.githubusercontent.com/Parking-Master/FPS/main/models/weapons/pistol.glb

The mirror lost embedded creator attribution. Identity was checked against the named XD meshes, Springfield/XD/GRIPZONE textures, and the animation creator's explicit credit to the linked original weapon. This provenance-chain limitation is retained here. The adaptation also contained the older DJMaesen NC arms described above. All arm meshes, images, animation tracks, skins, and unused nodes were removed by repacking only the retained weapon data. The combined original is development-only. No game code from the mirror was copied.

Runtime modifications: retained three compact weapon skins (frame, slide, magazine), 17,818 triangles, and weapon mechanical tracks; removed arm/camera motion; normalized metric orientation and stabilized the receiver; converted legacy specular/glossiness material to metallic/roughness using the published Khronos conversion; packaged 1K base-color/normal JPEG and lossless metallic/roughness PNG textures. Conversion decodes color maps to linear light, derives metallic and base color from diffuse/specular values, and writes roughness as one minus glossiness. Winterline supplies firing timing, grip posing, recoil and reload choreography. The pistol magazine and supporting hand follow a shared continuous reload path; the reused magazine is exchanged below the view rather than producing a persistent dropped magazine. Runtime file approximately 3.806 MB.

Conversion reference: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Archived/KHR_materials_pbrSpecularGlossiness/examples/convert-between-workflows/js/three.pbrUtilities.js . The associated Gary Hsu MIT notice is retained in [KHRONOS-CONVERSION-LICENSE.txt](KHRONOS-CONVERSION-LICENSE.txt).

Attribution: **Springfield Armory XD Mod.2 Sub-Compact - raimeiyonke; FPS Pistol Animations - Cransh. CC BY 4.0. Adapted for Winterline: weapon-only extraction, material workflow conversion, texture optimization, stable receiver alignment, and procedural hand posing.**

## Remington 870 Police Magnum - 8sianDude / haoliu95

`shotgun.glb` supplies the detailed Lockwood 12. Complete creator attribution, CC BY 4.0 source links, acquisition limitations and geometry/animation changes are in [SHOTGUN-LICENSE.md](SHOTGUN-LICENSE.md). Winterline additionally reuses the source loose shell for visible per-shell loading. All three weapons share the clean Renderpeople hands documented above. These adaptations remain subject to visual and gameplay development; third-party asset use is not a claim of finished AAA quality.
