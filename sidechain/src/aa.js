// Patterns that don't shimmer: a checker and a square wave filtered over the pixel they're
// drawn in, so a floor or a stripe that gets finer than a pixel at a distance or a grazing
// angle settles to its average tone instead of flashing. Drop into a shader with ${AA_GLSL}.
export const AA_GLSL = /* glsl */`
float aaChkW(vec2 p, vec2 w){ w = max(w, vec2(1e-4)); vec2 i = 2.0 * (abs(fract((p - 0.5 * w) * 0.5) - 0.5) - abs(fract((p + 0.5 * w) * 0.5) - 0.5)) / w; return 0.5 - 0.5 * i.x * i.y; }
float aaChk(vec2 p){ return aaChkW(p, fwidth(p) * 1.7); }
// ... and blurred along the way you're going by as far as you go in a frame (m, in the pattern's
// units): a floor of big squares rushing past at speed strobed, a square a frame
float aaChkM(vec2 p, vec2 m){ return aaChkW(p, max(fwidth(p) * 1.7, abs(m))); }
float aaSqI(float x){ return floor(x) * 0.5 + max(fract(x) - 0.5, 0.0); }
float aaSq(float x){ float w = max(fwidth(x) * 1.7, 1e-4); return clamp((aaSqI(x + 0.5 * w) - aaSqI(x - 0.5 * w)) / w, 0.0, 1.0); }
// thin lines the same way: aaPulse is 1 where fract(x) < d (a line every unit, d of a unit wide),
// aaBand 1 within hw of c; both settle to how much of the pixel they cover when they're thinner
// than it (step() there lit a pixel or missed it, and a line of them crawled as you went by)
float aaPI(float x, float d){ return floor(x) * d + min(fract(x), d); }
float aaPulse(float x, float d){ float w = max(fwidth(x) * 1.5, 1e-4); return clamp((aaPI(x + 0.5 * w, d) - aaPI(x - 0.5 * w, d)) / w, 0.0, 1.0); }
float aaBand(float x, float c, float hw){ float w = max(fwidth(x) * 1.5, 1e-4); return clamp((min(x + 0.5 * w, c + hw) - max(x - 0.5 * w, c - hw)) / w, 0.0, 1.0); }
`;
