/* Agitation waves.
 *
 * First attempt spread alarm bird-to-bird, one hop per frame, and it was wrong
 * twice over: the wave died out before crossing a flock this wide, and its
 * speed was whatever the frame rate happened to be — so the game's one piece of
 * timing ran fast on a desktop and slow on a phone. It is modelled as an
 * explicit front instead, which is also how the real thing is described and
 * measured: a band travelling at a fixed speed through birds that are barely
 * moving. Neighbour contagion still exists in flock.js, but only as texture.
 *
 * Cavagna et al. clocked real starling waves at roughly three times flight
 * speed. WAVE_SPEED / cruise here is 780 / 120 ≈ 6.5, which is a lie in the
 * direction of the game being playable: at 3x you cannot save the far side of
 * the flock from anywhere, and the answer to every falcon is to already be
 * standing where it will hit.
 *
 * FADE is the other half of that balance and it is set against the measured
 * size of the flock, not chosen for its own sake. A wave that carries across
 * the whole murmuration means every alarm saves everyone and where you are
 * standing stops mattering; one that dies too early means the far side is
 * never savable. Measured against an 850px flock this arms about three
 * quarters of it from the middle and under half from the edge, so the falcon —
 * which hunts whatever is calmest — can always find the part you did not
 * cover, and you have to go to it.
 */

export const WAVE_SPEED = 780;
const WIDTH = 74;        /* how thick the band is */
const REACH = 900;       /* px before the band is dropped entirely */
/* Falloff length. Deliberately much shorter than REACH, because how far the
 * wave can be SEEN and how far it can still SAVE anything are two different
 * distances and the game needs them to be. Tie them together and you pick
 * between a wave that rolls handsomely across the whole sky and decides
 * nothing, or one that decides everything and is gone in half a second.
 * Alarm is 0.30 — just armed — at about 370px, and still bright enough to
 * read as a band out past 600. */
const FADE = 305;

export class Waves {
  constructor() {
    this.list = [];
  }

  emit(x, y, strength) {
    this.list.push({ x, y, r: 0, strength });
  }

  step(dt) {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const w = list[i];
      w.r += WAVE_SPEED * dt;
      if (w.r > REACH) list.splice(i, 1);
    }
  }

  /* Strength of the band at a point, 0 when the point is not in it. Kept
   * branch-cheap: this runs three thousand times a frame per live wave. */
  at(px, py) {
    const list = this.list;
    let best = 0;
    for (let i = 0; i < list.length; i++) {
      const w = list[i];
      const dx = px - w.x, dy = py - w.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const off = Math.abs(d - w.r);
      if (off > WIDTH) continue;
      /* Falls off across the band, and fades with distance travelled — a turn
       * three flock-widths away is news that arrives as a rumour. Cubed, not
       * linear: linear falloff was already down to a tenth by the far side of
       * the flock, so the wave could not reach the place it most needed to and
       * the only viable play was to be standing on the falcon before it moved.
       * This holds full strength across the body of the flock and dies just
       * outside it. */
      const across = 1 - off / WIDTH;
      const spent = Math.exp(-w.r / FADE);
      const s = across * spent * w.strength;
      if (s > best) best = s;
    }
    return best;
  }

  clear() { this.list.length = 0; }
}
