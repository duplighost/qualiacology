/* Start it, keep it running, hand the page the numbers. */

import { Game } from "./game.js";

const canvas = document.getElementById("sky");

let onState = null;
const game = new Game(canvas, {
  onState: (s, force) => onState && onState(s, force),
  onMute: (muted) => document.getElementById("muted").classList.toggle("on", muted),
});

addEventListener("resize", () => game.resize());
addEventListener("orientationchange", () => setTimeout(() => game.resize(), 120));

/* Exposed for the boot check and for anyone who wants to see the flock from a
 * console. Same shape as LEAD's __LEAD hook. */
window.__STARLING = { game };

const loop = (now) => { game.frame(now); requestAnimationFrame(loop); };
requestAnimationFrame(loop);

export { game, canvas };
export function watch(fn) { onState = fn; }
