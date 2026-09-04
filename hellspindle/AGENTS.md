Open index.html in this folder. Keep index.html, style.css, game.js, and assets together.

This folder is the playable copy after the 2026-09-04 gamefeel and routes pass.
See CHANGELOG.md, and docs/STATUS.md for what is true right now.

Two things to know before you change anything:

- Do not put the frame back through a second, hidden canvas. A canvas that is
  never shown does not get hardware acceleration, and blitting it across cost
  about 87% of every frame. render() paints straight onto the visible canvas.
- Nothing in the rope solver may release a hook. Only the player does, by
  letting go or jumping. Everything else — a blocked arc, a wall, a ledge —
  slides, stretches or stops. It never drops you.

Do not merge this with another game.
