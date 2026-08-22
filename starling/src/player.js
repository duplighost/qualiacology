/* You.
 *
 * One starling among three thousand, with one bird's worth of body and a
 * little more than one bird's worth of attention paid to it. There is no
 * button. The only thing you do is turn, and turning hard enough is what
 * sends the wave — so the control and the mechanic are the same gesture, and
 * nobody has to be told what the gesture is. They find it by swerving.
 */

import { wrapAngle, clamp, TAU } from "./math.js";

const TURN = 5.2;        /* rad/s — a shade nimbler than the birds around you */
const BANK_DECAY = 3.4;
const BANK_TRIGGER = 0.92;   /* radians of committed turn that raises the alarm */
const COOLDOWN = 0.8;

export class Player {
  constructor(world) {
    this.world = world;
    this.x = world.hoverX;
    this.y = world.hoverY + 90;
    this.dir = -Math.PI / 2;
    this.speed = 128;
    this.alarm = 0;
    this.authority = 168;
    this.bank = 0;
    this.cool = 0;
    this.waves = 0;
    /* How much the flock still believes you. Every alarm spends some of it and
     * it comes back slowly. Birds habituate to a signal that keeps arriving
     * and nothing is behind it — cry wolf and the wave you actually need is
     * the one nobody turns for. It is also the only thing stopping the game
     * from being won by flying in a circle for two minutes. */
    this.credit = 1;
    /* Purely cosmetic: how far the body is rolled into the turn. */
    this.roll = 0;
  }

  step(dt, input, waves, onWave) {
    /* --- what heading is being asked for --------------------------------- */
    let want = this.dir;
    if (input.keyTurn !== 0) {
      want = this.dir + input.keyTurn * TURN * dt * 1.6;
    } else if (input.aimActive) {
      const dx = input.aimX - this.x, dy = input.aimY - this.y;
      if (dx * dx + dy * dy > 36) want = Math.atan2(dy, dx);
    }

    let turn = wrapAngle(want - this.dir);
    const maxTurn = TURN * dt;
    if (turn > maxTurn) turn = maxTurn; else if (turn < -maxTurn) turn = -maxTurn;
    this.dir += turn;

    /* --- was that a swerve or a drift? -----------------------------------
     * Signed and decaying, so a hard committed bank in one direction fires and
     * a nervous wobble cancels itself out. Wobbling to farm waves does not
     * work, which is the point: it has to be a real turn. */
    this.bank = this.bank * Math.exp(-BANK_DECAY * dt) + turn;
    this.roll += (clamp(turn / maxTurn || 0, -1, 1) - this.roll) * Math.min(1, dt * 9);

    this.cool = Math.max(0, this.cool - dt);
    this.credit = Math.min(1, this.credit + dt * 0.2);
    if (Math.abs(this.bank) > BANK_TRIGGER && this.cool === 0) {
      /* A turn that just clears the trigger should still be a real alarm.
       * Dividing by 1.5 meant an ordinary hard bank sent a wave at two thirds
       * strength, which after habituation sat under the threshold where birds
       * show pale — so the flock was being warned and did not look it. */
      const strength = clamp(Math.abs(this.bank) / 1.05, 0.6, 1) * this.credit;
      this.credit = Math.max(0.1, this.credit - 0.34);
      waves.emit(this.x, this.y, strength);
      this.waves++;
      this.alarm = 1;
      this.cool = COOLDOWN;
      this.bank = 0;
      onWave && onWave(strength);
    }

    this.alarm = Math.max(0, this.alarm - dt * 1.5);

    this.x += Math.cos(this.dir) * this.speed * dt;
    this.y += Math.sin(this.dir) * this.speed * dt;

    /* You are held by the same box as everyone else, a little more firmly —
     * losing the player off the edge of the sky is not an interesting way to
     * find out you were flying the wrong way. */
    const w = this.world;
    const m = 46;
    if (this.x < m) this.x = m; else if (this.x > w.w - m) this.x = w.w - m;
    if (this.y < m) this.y = m;
    const floor = w.h - w.ground - 40;
    if (this.y > floor) this.y = floor;
  }
}
