# BLACKTHORN MANOR
*An Inquiry into the Events of All Hallows' Eve, 1899*

A first-person haunted-house mystery in the browser. Yorkshire, 1904: five years
ago Lady Constance Blackthorn died beneath the gallery of her own foyer and her
nine-year-old daughter Lily vanished the same night. The inquest called it an
accident. Her sister has hired you to learn the truth. The house — and something
in it — has been waiting.

## Play

```
node serve.mjs        # then open http://localhost:8471
```

Requires any modern browser. Three.js loads from the jsDelivr CDN (one-time,
then cached); everything else — textures, portraits, audio — is generated
procedurally at load. There are no asset files.

## Controls

| Key | Action |
|-----|--------|
| W A S D | walk (SHIFT to hurry) |
| Mouse | look (click to capture) |
| E | examine / open / read / put down |
| F | lantern on/off |
| TAB | case journal — evidence, inquiries, keys, persons |
| ESC | release the mouse |

## The house

Four levels, ~35 rooms: grand foyer with an imperial staircase, ballroom,
library, chapel, portrait gallery, conservatory, a sealed east wing, servants'
passages, attics, and a basement of tunnels and older things. Progress is gated
by found keys, a secret passage, and one door that is not a door.

Nine pieces of core evidence solve the case. When you hold them all, go to the
grand staircase. Progress autosaves to localStorage.

## Structure

Everything is plain ES modules, no build step:

- `src/world.js` — the manor: cell-grid floor plan compiled to walls/floors/stairs/colliders
- `src/rooms.js` — furnishing and every clue placement
- `src/story.js` — the case: documents, clues, keys, the accusation
- `src/events.js` — scripted hauntings and the finale
- `src/player.js` / `src/interact.js` — first-person controller, raycast interaction
- `src/textures.js` / `src/audio.js` — procedural materials and synthesized sound
- `src/effects.js` — lighting, post stack, candle pool, the grey lady
