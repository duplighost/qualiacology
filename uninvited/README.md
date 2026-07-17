# UNINVITED

*a quiet night · a big empty house · easy money*

A first-person horror game with a turn. You break into a dark old house you were
told is empty — maybe haunted. Four "ghosts" drift through the rooms saying things
that chill you: *who are you… you shouldn't be here… I've called someone.* Your
own nerves narrate the dark like a Resident Evil hero. You climb toward a pale
figure standing at the far window of the top floor…

…and when you reach it, the lights come on, it's a dressmaker's dummy, and there's
a police officer in the doorway. The four ghosts were a family — home, awake, and
terrified of the stranger in their house. The only uninvited thing here was you.

## Play

```
node serve.mjs        # then open http://localhost:8555
```

Any modern browser. Three.js loads once from a CDN; every texture, sound, and
character is generated procedurally at load — there are no asset files.

## Controls

**Desktop** — W A S D move · mouse look (click to capture) · SHIFT hurry ·
**E** look closer · **F** torch · ESC release the mouse.

**Mobile** — left thumb anywhere = move stick · right thumb = look · on-screen
**LOOK** / **TORCH** buttons. Push the move stick to the edge to hurry.

## The night

One floor of living rooms, a kitchen, a study, a playroom; a staircase up to the
bedrooms; and a long landing hall ending at the master bedroom — the farthest room
from the front door, where the night ends. ~8–10 minutes. Walk to the far room to
finish it.

## Structure

Plain ES modules, no build step, procedural art and audio (no asset files):

- `src/world.js` — the house: a cell-grid floor plan compiled to walls/floors/stairs/colliders
- `src/rooms.js` — furniture, the household candlelight, and the shape at the window
- `src/npc.js` — the family (and the officer): low-poly figures, wander/activity AI, speech
- `src/scares.js` — the frights: fleeting figures, a watcher behind you, drifting doors, the
  storm, the kids — every one a mundane thing your nerves misread
- `src/events.js` — the paranoid monologue triggers and the arrest finale
- `src/story.js` — the family, the monologue, the family's lines, the ending
- `src/player.js` — first-person controller (desktop pointer-lock + mobile dual-stick)
- `src/effects.js` — dark lighting, fog, post stack, and the house-wide light-flip
- `src/textures.js` / `src/audio.js` — procedural materials and synthesized sound
- `src/main.js` — bootstrap, input, the loop
