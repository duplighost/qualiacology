# Scoria material provenance

Generated for NINEFOLD BURN on 2026-08-23 with the built-in image-generation tool. The lossless PNG masters are retained beside the optimized runtime WebP files during development; release packaging may include only the runtime files.

## Losslessly baked 512px terrain responses

The six PNGs below are the exact deterministic 512 x 512 RGBA outputs of
`createAuthoredTerrainResponse`. They replace cold-boot canvas analysis only
when the requested response size is 512; smaller quality tiers retain the live
authoring path. The source scans, response algorithm, wrap/repeat settings,
color spaces, filters, mipmaps, and material parameters are unchanged.

- Scoria source: `scoria-terrain-ai-v1.webp`, SHA-256 `3948A64ECDFF6C0B8827AA68BF48E8B4C5756877D1A5F80A9D429F20A4E371B7`
- Shard Cathedral source: `shard-cathedral-rock-ai-v3.webp`, SHA-256 `4B13C3C5FCF698497F98F1F6BF8379A8A679B08736ABBCE73494765FC7EA678C`
- Generator size: 512 x 512; normal strength 2.15; the generator's periodic edge conditioning is retained exactly.
- Canonical verification: `npm run verify:baked-terrain` regenerates all six maps from the current source scans, decodes the shipping PNGs through Chrome, and requires zero changed RGBA bytes, zero changed pixels, and maximum absolute channel delta zero.

| Runtime output | PNG SHA-256 | Decoded RGBA SHA-256 |
| --- | --- | --- |
| `runtime/scoria-terrain-normal-512.png` | `5C3C545F82BB00EB4A845870E80EC8815BD76F4471C0AE45B5055341AC698FAA` | `E94344EABD91BAC8CE4D68B043037CFA5AFCEEA164867373DEB33F612139480C` |
| `runtime/scoria-terrain-roughness-512.png` | `8C47312EE12DE51FB81AD315F60375AD0E8E427BEE510018C38653A7A55552C6` | `BF4761C9EFBFB05C7252015E35568698862A11AEC9262772CC932C48C07B3582` |
| `runtime/scoria-terrain-emissive-512.png` | `257E8D9101B9B6C15D032DAEEDBAB657B0297C05644C2BD33741EA7AF1B4DA2B` | `B1143FC6F34508FFE65CE6467DBDCA345CFEBA2E836C82D86356D8ED434E60A2` |
| `runtime/shard-cathedral-normal-512.png` | `FFE89605576B5448E42A8AC790C998CA0CB32135A8293425508B6DB6D9DB6B74` | `DB17723EFAF171ADD806C71DB646DB1E6D598FD37C3C4C4C0230FFBEAA29B828` |
| `runtime/shard-cathedral-roughness-512.png` | `951B437E5178BA5028729C13C8F1DF8D2C607F0520AD7620195DE586996AC316` | `9F98BAE28837DB25A0340C645B313D31554F511FBC5D36E70CD6F7BB3ACC97D5` |
| `runtime/shard-cathedral-emissive-512.png` | `29B5A5A4F1DADD52C009946006A6EF1B816C5B6893FCDA4F22EC7A5570519D56` | `52140E3CE635CE4AC6DDF8B0EB6558C86A353A9CABAEE54C1EF89F20214595D7` |

## `scoria-terrain-ai-v1`

- Runtime: `scoria-terrain-ai-v1.webp`
- Master: `scoria-terrain-ai-v1.png`
- Master SHA-256: `46E1117CE39452B67EA68E2C04CB7FE74591DEF23CBFF84C2109832280D01204`
- Runtime conversion: 1254 x 1254 PNG to 1024 x 1024 WebP, quality 88, Sharp 0.34.x

Prompt:

```text
Use case: stylized-concept
Asset type: seamless tileable game texture for a premium 3D racing-game terrain material
Primary request: a photorealistic square texture of cooled volcanic basalt and oxidized iron-rich scoria on a hostile exoplanet, dark charcoal stone that still retains visible mineral detail, red-brown ferric weathering, subtle porous vesicles, tiny glassy crystalline flecks, compressed heat scars, and very sparse hairline ember seams
Style/medium: hyperreal PBR-quality material photography, physically plausible geology, production game texture
Composition/framing: perfectly orthographic top-down material scan, uniform detail distribution, seamless/tileable on all four edges, no horizon and no perspective
Lighting/mood: flat neutral diffuse studio illumination with no directional shadows or baked highlights
Color palette: charcoal, gunmetal gray, deep hematite red-brown, restrained burnt orange only inside a few microscopic seams
Materials/textures: crisp multi-scale rock grain and subtle height variation suitable for combining with a procedural normal map
Constraints: no objects, no vehicles, no text, no symbols, no logos, no watermark, no obvious central focal feature, genuinely seamless edges
Avoid: giant lava rivers, wide glowing cracks, pure black featureless areas, fantasy crystals, cartoon styling, dramatic scene lighting, vignette, perspective distortion
```

## `scoria-road-ai-v1`

- Runtime: `scoria-road-ai-v1.webp`
- Master: `scoria-road-ai-v1.png`
- Master SHA-256: `91541C3DF948DE82A6B12607E14BD7B13028C2238A9988005CD2FE9B0A0EB5ED`
- Runtime conversion: 1254 x 1254 PNG to 1024 x 1024 WebP, quality 88, Sharp 0.34.x
- Tiling inspection: 2 x 2 visual preview; mean opposite-edge absolute RGB difference 8.92/255 left-right and 10.62/255 top-bottom; no visible hard seam in the preview.

Prompt:

```text
Use case: stylized-concept
Asset type: seamless tileable game texture for the driving surface of a premium 3D hyperspeed racing game
Primary request: a photorealistic square material scan of a pressure-fused obsidian and iron-basalt raceway formed directly from volcanic rock, mostly smooth and drivable but microscopically pitted and heat-scarred, dark charcoal rather than black, subtle longitudinal abrasion, faint red-brown mineral inclusions, sparse glassy flecks, and extremely thin discontinuous burnt-orange thermal veins
Style/medium: hyperreal PBR-quality material photography, physically plausible engineered volcanic stone, production game texture
Composition/framing: perfectly orthographic top-down scan, uniform scale and detail, seamless/tileable on all four edges, no perspective, no horizon, no curb and no lane markings
Lighting/mood: flat neutral diffuse illumination, no directional shadows, no baked reflections
Materials/textures: dense fine-grain fused basalt with restrained roughness variation; no loose rocks larger than a pebble
Constraints: no objects, no text, no symbols, no logos, no watermark, no central focal feature, genuinely seamless edges
Avoid: cobblestones, large boulders, deep potholes, huge cracks, bright lava rivers, pure black empty areas, wet mirror finish, cartoon or fantasy styling, vignette
```

## `shard-cathedral-rock-ai-v1`

- Runtime: `shard-cathedral-rock-ai-v1.webp`
- Master: `shard-cathedral-rock-ai-v1.png`
- Master SHA-256: `804A11B4FBF6F34B27852490F3FF47EA37E9045581766BD778CC00A511E9F307`
- Runtime conversion: 1254 x 1254 PNG to 1024 x 1024 WebP, quality 88, Sharp 0.34.x

Prompt:

```text
Use case: stylized-concept
Asset type: seamless tileable game texture for monumental asteroid architecture in a premium 3D space-racing game
Primary request: a photorealistic square material scan of ancient carbonaceous asteroid stone and nickel-iron meteorite, gunmetal charcoal with rough impact glass, compressed regolith, subtle metallic inclusions, pale mineral dust, and sparse razor-thin cyan-blue crystalline fracture traces
Style/medium: hyperreal PBR-quality material photography, physically plausible meteorite geology, production game texture
Composition/framing: perfectly orthographic top-down scan, uniform fine and medium detail, seamless/tileable on all four edges, no horizon, no perspective, no obvious focal object
Lighting/mood: flat neutral diffuse reference illumination, no directional shadow and no baked dramatic highlights
Color palette: charcoal, cool gunmetal, faint blue-gray dust, extremely restrained cyan only in microscopic fractures
Materials/textures: dense chipped meteorite matrix with micro-pitting and glassy impact veins
Constraints: no objects, no stars, no text, no symbols, no logos, no watermark, genuinely seamless edges
Avoid: large glowing cracks, neon grid patterns, fantasy gemstones, smooth plastic, giant craters, pure black empty areas, cartoon styling, vignette
```

## `shard-cathedral-rock-ai-v2`

- Runtime: `shard-cathedral-rock-ai-v2.webp`
- Master: `shard-cathedral-rock-ai-v2.png`
- Master SHA-256: `7DF02684F0CEDB872A5DA443CC03677767286042434E1E948C3E10AEE04C4AC5`
- Runtime conversion: 1254 x 1254 PNG to 1024 x 1024 WebP, quality 88, Sharp 0.34.x
- Tiling inspection: 2 x 2 visual preview; mean opposite-edge absolute RGB difference 13.88/255 left-right and 14.86/255 top-bottom. This revision materially reduces the original edge discontinuity and shows no hard cross seam in the preview; the retained v1 master remains alongside it for provenance.

Edit prompt applied to `shard-cathedral-rock-ai-v1`:

```text
Edit this existing square meteorite material scan into a genuinely seamless, tileable production texture. Preserve the photoreal carbonaceous asteroid stone, nickel-iron inclusions, charcoal gunmetal palette, pale mineral dust, micro-pitting, glassy impact veins, and extremely sparse razor-thin cyan-blue microfractures. Recompose only what is necessary so the left edge matches the right edge exactly in visual structure and value, and the top edge matches the bottom edge, with no visible cross seam in a 2 by 2 repeat. Keep an orthographic top-down material scan with uniform fine and medium detail, flat neutral diffuse illumination, no baked highlights, no directional shadows, no objects, no stars, no text, no symbols, no logo, no watermark, no focal centerpiece, no vignette. Avoid obvious mirroring, repeated large round stones, edge bands, large glowing cracks, fantasy crystals, neon grids, giant craters, pure black areas, or cartoon styling. Output a square texture only.
```

## `shard-cathedral-rock-ai-v3`

- Runtime: `shard-cathedral-rock-ai-v3.webp`
- Raw generated master: `shard-cathedral-rock-ai-v3.png`
- Master SHA-256: `373A60387F824D1ED5A858269962F01B481385A9A49EC2895F769A4995F95A44`
- Runtime SHA-256: `4B13C3C5FCF698497F98F1F6BF8379A8A679B08736ABBCE73494765FC7EA678C`
- Runtime conversion: 1254 x 1254 PNG to 1254 x 1254 WebP, quality 92, Pillow 12.2.0.
- Seam conditioning: a 96-pixel smoothstep crossfade reconciles each opposing edge; decoded runtime mean opposite-edge absolute RGB difference is exactly 0/255 on both axes. The raw generated master is retained unchanged.

Prompt:

```text
Create a square seamless tileable 2048x2048 PBR albedo-style material scan for an impossible deep-space cathedral carved from one monolithic meteorite. Large-scale angular cleavage planes, compressed mineral layers, sharp geological striations, subtle oxidized steel-gray and charcoal variation, sparse extremely thin cyan crystalline seams embedded in cracks. Hyperreal macro surface detail with readable meter-scale fracture structure. Neutral even diffuse studio capture suitable as a color map: no directional shadows, no perspective, no objects, no architecture silhouette, no planets, no stars, no text, no border, no vignette, no pebbles, no cobblestones, no circular rocks, no glowing bloom. The left/right and top/bottom edges must tile seamlessly. Beautiful AAA racing-game environment material, photorealistic rather than stylized.
```
