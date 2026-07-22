# VESPERBANE

*The night is long. Run it down.*

A fast, momentum-driven gothic action platformer in two Nights. Pure HTML5
canvas — no dependencies, no build step. Plays on desktop and phones
(landscape). Beat **Night I** to unlock **Night II**.

## Play

Open `index.html` in a browser (double-click works), or serve the folder:

```
python -m http.server 8123
```

On a phone: touch controls appear automatically — left thumb is a floating
stick (drag down to crouch/slide), right thumb gets JUMP / SLASH / DASH.

## Controls

Two comfortable keyboard layouts work out of the box; everything is
rebindable in-game with **F2** (saved between sessions).

| Input | Action |
|---|---|
| ← → / A D | Run (double-tap → to dash, toggleable in F2) |
| Space / K | Jump (hold for height; near a wall: wall-kick) |
| Z / J | Slash (cancels into anything) |
| X / C / Shift / L | Dash (i-frames; kills refund it instantly) |
| ↓ + X on ground | Slide (fits under low gaps) |
| ↓ + Z in air | Pogo slash (bounce off enemies and candles) |
| ↓ + Space on platform | Drop through |
| ← → on title | Choose a Night |
| F2 | Rebind keys / toggle double-tap dash |
| M / P / R | Mute / Pause / Restart run |

Default grip: index on **Z** (slash), middle on **X** (dash), thumb on
**Space** (jump). Two-handed alt: WASD + **J / K / L**.

## The two Nights

**NIGHT I — THE UNRUNG BELL.** The Bellkeeper died at dusk and the Vesper
Bell went silent, so the night stuck. Cross a forked city — rooftops or
catacombs, rafters or crypt, and a hidden wall-kick **Spire** above it all —
then beat the **Bellkeeper's Shade** and ring the bell three times.

**NIGHT II — THE UNDERTOLL.** You rang the bell; dawn came; then the cracked
bell's last note *fell*, and you follow it underground. Here the **Pale
Hound** hunts you: slow between tolls (you pull ahead by moving), but it
**surges** while the toll rings — the mechanic that gave you shortcuts in
Night I now bares its teeth. Slash it to knock it back, but it can't be
killed, only outrun. At the bottom waits the **Tollbearer**, wearing your
bell for a heart; charge past its rushes, punish it when it slams, and cut
the bell out.

## How it wants to be played

**Speed feeds the flame.** Sustained top speed, kills, and sparks build your
VELOCITY tier. Higher tiers raise your top speed, leave crimson afterimages,
and at tier 3 double your slash damage. In Night II this is survival: the
Hound's surge is *just* faster than a standing run, so keeping your flame lit
is how you stay ahead of it.

**The night keeps time.** Every 18 seconds the Vesper Toll rings and spectral
platforms hold for six — shortcuts and escape routes. The bell icon by your
flame gauge counts down to the next ring. Learn the rhythm, own the night.

Your best time is kept per Night.

## Under the hood

- Fixed 60 Hz simulation with an accumulator; **input presses are consumed by
  the sim, not cleared per rendered frame** — so jumps and dashes never get
  eaten on 120/144/240 Hz displays.
- Every level is code-built (`js/level.js`), so new Nights remix geometry,
  toll timing, hazards, and bosses cheaply. `LEVELS[]` drives the picker.
- `window.DEBUG` exposes a deterministic `step()` harness plus `level()`,
  `warp()`, `toll()`, `boss()`, `hunter()` for automated testing.
