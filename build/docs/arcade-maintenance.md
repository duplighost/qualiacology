# Complete arcade

The authored portfolio remains in `src/content/site-data.json`. The broader arcade lives in `src/content/arcade-data.json`; one family groups related saved builds. Preserve existing IDs because links, favorites, and recent-play history use them.

Run `node scripts/preflight.mjs --art` from `build` after editing. The build generates `/arcade/`, its hashed catalog and script, the shared stylesheet, the home/games navigation, and the sitemap. Commit the generated output with its sources. Validation checks catalog IDs, preferred builds, images, safe public URLs, the authored portfolio descriptions, and the normal site routes.

## Add a game or a build

Add a build to its existing family when it is actually a version of that game. Similar titles alone are not identity evidence. Keep different games separate and keep original builds when publishing a repair. Give each new build a unique ID, readable label, recorded date, public HTTPS URL, size where known, and honest check status. A source repository or an uncompiled native project is not a playable URL.

The family supplies a title, description, genres, controls, kind, first/last recorded dates, image metadata, and a `preferredId` that exists in `versions`. Existing portfolio text and featured selections are authored content; the recovery catalog must not silently rewrite them. PASTA remains a collection with its six authored game choices.

Every family needs a local image. Prefer an authentic screenshot or existing authored artwork. Preserve the complete screenshot composition. If no suitable image exists, an exact-title graphic is acceptable only with `imageKind: "title"` and a caption identifying it as title artwork. Never present a fabricated image as a gameplay capture. Referenced raster images are 800 × 450 WebP.

## What a check means

| Status | Evidence required |
| --- | --- |
| `input-checked` | A deliberately tested input caused a visible in-game response. Describe the limited scope in `qaNote`. |
| `launch-checked` | A title screen, interface, or game scene rendered and was visually reviewed. This does not establish gameplay. |
| `menu-only` | Only the menu was checked. |
| `link-checked` | The public entry responded; no gameplay claim. |
| `launch-unverified` | A launch attempt did not establish a running game. Describe the observed limitation without claiming a source defect. |
| `environment-limited` | The test environment could not supply a required graphics capability. Do not call the game broken on that basis. |
| `broken` | A demonstrated runtime defect interrupted that exact build. Preserve the original and add any repair separately. |
| `download` | A native download exists; it has not necessarily been executed. |
| `unavailable` | No playable or downloadable build is hosted. Keep the entry visible. |
| `untested` | No stronger applicable evidence. |

Check evidence belongs to an exact build and destination, not merely a family title. Include `checkedAt` and a concise `qaNote`; never expose private source paths, account data, credentials, or private file references in the public catalog. A short check does not certify all levels, endings, saves, audio, mobile controls, or desktop compatibility.

The public archive stores restored runtime assets separately. Its bounded upload process verifies exact file and chunk fingerprints and closes its upload window after a release. The arcade links to those public copies while preserving the original source projects' existing audiences.

## Discovery behavior

Search, genre/control/type/status filters, sort order, view mode, and pagination operate locally after a single catalog fetch. A share URL can identify a family and a specific build. Favorites and recent plays remain in the visitor's own browser. The no-script directory keeps the collection navigable without JavaScript.
