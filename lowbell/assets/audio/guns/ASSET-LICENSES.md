# Gun, kick and firecracker sounds

Built by `tools/audio/guns-build.py`; every file is mono 48 kHz Ogg Vorbis.

## Recorded gunshots - The Free Firearm Sound Library, CC0

Created and recorded by **Ben Jaszczak, Brian Nelson, Kevin Heras, and Matthew Nanney**; **CC0 1.0 Universal** (https://creativecommons.org/publicdomain/zero/1.0/). Collection: https://opengameart.org/content/the-free-firearm-sound-library . Read from WINTERLINE's copy of the prepared archive.

| Files | Recording | Microphone |
| --- | --- | --- |
| pistol-report-*, pistol-tail-in-* | Walther PPQ / X_39P.wav | near |
| pistol-tail-out-* | Walther PPQ / X_31P.wav | mid distance |
| carbine-report-*, carbine-tail-in-* | AK-47 / C_28P.wav | near |
| carbine-tail-out-* | AK-47 / C_31P.wav | mid distance |
| shotgun-report-0,1, shotgun-tail-in-* | Benelli Nova / O_21P.wav | near |
| shotgun-report-2,3 | Winchester Model 12 / K_22P.wav | near |
| shotgun-tail-out-0,1 / 2 | Benelli Nova / O_17P.wav, Winchester Model 12 / K_17P.wav | mid distance |
| rifle-report-*, rifle-tail-in-* | Mosin Nagant / M_21P.wav | near |
| rifle-tail-out-* | Mosin Nagant / M_26P.wav | mid distance |
| cracker-pop-* | Ruger Mark III / R_35P.wav, shortened and pitched up | near |

Separate takes found by onset, trimmed, DC removed, peak-normalized, 10 ms fades. `*-tail-in-*` is the near report convolved here with a synthetic small-room response (the interior tail).

## Impacts and handling - Kenney, CC0

`impact-*`, `break-wood-*`, `latch-*`, `cloth-*` and the base of `pumpkin-*` are from Kenney's **Impact Sounds** and **RPG Audio** packs (https://kenney.nl), **CC0 1.0**.

## Synthesized here

`bolt-*`, `pump-*`, `mag-*`, `slide-fwd`, `shell-in-*`, `dry-click`, `active-hit`, `switch`, `hit-tick-*`, `head-tick`, `kill-thunk`, `kill-tone`, `brass-*`, `hull-*`, `swing`, `throw`, `fuse` and the wet layer of `pumpkin-*` are made from filtered noise and damped resonances in `tools/audio/guns-build.py` (after CURFEW's handling recipes).
