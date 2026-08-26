# Third-party notices

## three.js r161

KICKMOON (formerly KICK BALL // LUNAR VELOCITY) includes code derived from
**three.js**, release
**r161**, distributed under the MIT License.

- Project: https://threejs.org/
- Release source: https://github.com/mrdoob/three.js/tree/r161
- Core source file: https://github.com/mrdoob/three.js/blob/r161/build/three.module.min.js
- License source: https://github.com/mrdoob/three.js/blob/r161/LICENSE
- Included license: `licenses/threejs-r161-license.txt`

`vendor/three.min.js` is a classic-script adaptation of the r161 minified ES
module. It was generated from an already-local copy of
`build/three.module.min.js` whose SHA-256 is
`8DA856FD9DDFE38FDB286DA04BC1D85F3BF108BF083E0EAC71CD276EC6674030`.
The conversion preserves the original license header and minified
implementation bytes, encloses the implementation in a strict IIFE so its
internal names cannot collide with other classic scripts, and replaces the
terminal ES-module export declaration with an equivalent 415-property
`globalThis.THREE` namespace assignment. No network download or package
installation was used.

The three.js MIT terms apply to both the original work and this mechanically
adapted distribution.
