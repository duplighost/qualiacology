# Third-party notices

## three.js r161

CINDERBLOOM includes code from **three.js**, release/tag **r161**, distributed
under the MIT License.

- Project: https://threejs.org/
- Source tag: https://github.com/mrdoob/three.js/tree/r161
- Core source: https://github.com/mrdoob/three.js/blob/r161/build/three.module.min.js
- License source: https://github.com/mrdoob/three.js/blob/r161/LICENSE
- Included license: `licenses/threejs-r161-LICENSE.txt`

`vendor/three.module.min.js` and the unmodified files under `vendor/jsm/` were
copied from that tag. `vendor/jsm/utils/BufferGeometryUtils.js` is a reduced,
modified derivative of the r161 utility that retains a subset of its helpers.
The same MIT terms apply to both the unmodified and modified copies.

The release packer verifies the SHA-256 of the shipped core module against the
known r161 upstream file and records every distributed file in the embedded
release manifest.
