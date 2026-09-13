# Third-party notices — IRON PSALM / RECKONING

## Renderer

Three.js r161 and bundled GLTF/geometry helpers. Copyright Three.js authors,
MIT license; the full notice is in THREE-LICENSE.txt and the standalone HTML.
The engine and helpers are inherited from the user's supplied game packages.
https://github.com/mrdoob/three.js/blob/r161/LICENSE
https://threejs.org/

## Character

“Eric Rigged 001 — Rigged 3D Business Man” by Renderpeople, CC BY 4.0.
The optimized rigged derivative and clothing mask are inherited from the user's
IRON RIOT / IRON PSALM REFORGED files. Prior modifications include retargeted
locomotion, recolored clothing, and added caps, patches, belts and shields.
This revision removes the free-standing number patch and unused procedural body,
prints the prisoner number on the deforming garment, attaches equipment to bones,
and maps knockdown joints onto the visible scanned skeleton. The inherited ankle
attachment is retained.
The creator does not endorse this game. No new independent license retrieval
was performed during this control/camera revision; supplied attribution is retained.

Original creator publication:
https://sketchfab.com/3d-models/eric-rigged-001-rigged-3d-business-man-a46bc9f67aaa415bb4f3241eef900e7f
https://sketchfab.com/renderpeople
https://creativecommons.org/licenses/by/4.0/

See licenses/CC-BY-4.0.txt and the inherited licenses/CHARACTER-PROVENANCE.md.
The character is embedded in assets/characters.js, not supplied as a new asset pack.

## Locomotion

Idle / Walk / Run are inherited Mixamo clips retargeted in the supplied derivative,
with provenance from Three.js's Soldier example. Included only as game animation;
not an independently redistributable animation library.
https://github.com/mrdoob/three.js/blob/r180/examples/models/gltf/Soldier.glb
https://threejs.org/examples/webgl_animation_skinning_blending.html
https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html

## Environment, reference and sound

The prison geometry, procedural environment materials, sound synthesis and prior
simulation are inherited from the supplied Iron Psalm / Reforged source. Its
reports identify THURIBLE as a movement/feedback reference. The source reference
is not redistributed here. This revision is based on Alex's feedback about
camera cutaways and the lack of manual mouse control.

All included screenshots are actual game-renderer output. None are generated
concept art. The interface uses system fonts; no font files are distributed.


## 0.5 material update
Additional material derivatives recovered from the supplied Iron Riot source,
not from commercial comparison games: ambientCG Bricks059, Plaster001 and
Asphalt012 (CC0). Masonry saturation is reduced; maps are recompressed.
The commercial reference images are not used as game assets.
https://ambientcg.com/view?id=Bricks059
https://ambientcg.com/view?id=Plaster001
https://ambientcg.com/view?id=Asphalt012
https://docs.ambientcg.com/license/

Cast-concrete material: newly composited from the supplied ambientCG Plaster001
and Asphalt012 color derivatives, with authored scratches and derived normals.
It is a composite material, not a newly acquired photographic concrete scan.
PavingStones138 was evaluated during development but is not in the playable
texture payload. Earlier generated masonry is also not loaded by the 0.5 game.


## 0.8 Reckoning changes
The inherited licensed character is still the base of all human bodies. This
revision adds bone-mounted padded equipment, rank details, procedural shield paint,
rounded shield edges, clothing shading, secondary impact poses and two-bone
climbing reach posing. These are modifications, not a newly acquired character
cast, mocap library, or endorsement by the creator.

The meadow color/normal/roughness material is an authored composite using the
already supplied ambientCG Asphalt012 derivatives plus generated soil/moss coloring
and leaf litter. Canonical JPEGs and the optional authoring script are included.
It is not a newly acquired ground scan. No Poly Haven image was downloaded into or
used by this release. No commercial-game image is a playable asset.
