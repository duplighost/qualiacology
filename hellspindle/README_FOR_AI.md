# GORETHREAD // HELLSPINDLE

Playable browser game. Open `index.html`. Keep `index.html`, `style.css`, `game.js`, and `assets/` together.

Alex makes this. He is not a programmer. Talk in folders and copies, not git. Mobile matters more than PC. If he reports how it plays, he is right.

## What it is

Side-scrolling action. You throw and steer a chained circular saw (the Hellspindle). Hold mouse / right thumb to command it. You can latch the blade on hanging rings and swing. Goreweave curtains are physical bands you cut a hole through.

Twelve districts in one long cathedral, about 38400 px wide, ending at the Red Abbot. Kill enemies for XP. Level raises life and wheel damage. Death keeps the level. Pause shows XP and rooms walked. Click continues a save (`localStorage` key `gorethread-cathedral-v1`). N on the title is a new descent.

## Controls

Desktop: A/D move and pump a swing, Space jump/release, hold mouse for the wheel, P/Esc pause, M mute, R checkpoint, F fullscreen.
Phone: landscape. Left thumb moves (swipe up to jump). Right thumb is the wheel.

## Files

- `index.html` `style.css` `game.js` — the game
- `assets/bg_*.webp` — district panoramas
- `assets/sprites/` — characters, wheel, hook, tiles, goreweave
- `assets/sprites/anim/` — walk/idle/air/flap loops
- `docs/STATUS.md` — what is true now
- `AGENTS.md` — short working note

Do not merge this with another game. Do not invent a HUD. Controls belong on title and pause.

Debug hook: `window.__HELLSPINDLE__` (snapshot, teleport, start, restart).
