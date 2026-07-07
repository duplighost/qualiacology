# VESPERBANE

*The night is long. Run it down.*

A fast, momentum-driven gothic action platformer. One long night, two forks
in the road, and a bell that ends it all. Pure HTML5 canvas — no
dependencies, no build step.

## Play

Open `index.html` in a browser (double-click works), or serve the folder:

```
python -m http.server 8123
```

## Controls

| Input | Action |
|---|---|
| ← → / A D | Run |
| Z / Space | Jump (hold for height; near a wall: wall-kick) |
| X / J | Slash (cancels into anything) |
| C / Shift | Dash (i-frames; kills refund it instantly) |
| ↓ + C on ground | Slide (fits under low gaps) |
| ↓ + X in air | Pogo slash (bounce off enemies and candles) |
| ↓ + Z on platform | Drop through |
| M / P / R | Mute / Pause / Restart run |

## How it wants to be played

**Speed feeds the flame.** Sustained top speed, kills, and sparks build your
VELOCITY tier (the flame gauge). Higher tiers raise your top speed, leave
crimson afterimages, and at tier 3 double your slash damage. Getting hit
knocks a tier off. The fastest lines through the night require staying fast.

**The road forks twice.** Rooftops or catacombs, rafters or crypt. The high
road is faster and riskier — and falling off it doesn't kill you, it just
drops you into the slow road. The 9-tile rooftop gap wants a dash-jump at
velocity tier 1+.

Ring the Vesper Bell three times to end the night. Your best time is kept.
