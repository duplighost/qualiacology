/**
 * Load a local WebGL game without leaving visitors on a black screen when their
 * browser, GPU process, or hardware acceleration cannot create a context.
 *
 * The game module is imported only after a tiny probe succeeds. Individual games
 * can also call window.__qualiacologyGameFatal(title, detail) for asynchronous
 * boot failures that occur after their module has loaded.
 */
function createFallback(title, detail) {
  let host = document.getElementById('qualiacology-runtime-fallback');
  if (!host) {
    host = document.createElement('main');
    host.id = 'qualiacology-runtime-fallback';
    host.setAttribute('role', 'alert');
    host.setAttribute('aria-live', 'assertive');
    host.innerHTML = `
      <section>
        <p class="qrf-kicker">Qualiacology browser world</p>
        <h1></h1>
        <p class="qrf-detail"></p>
        <div class="qrf-actions">
          <button type="button">Try again</button>
          <a href="/games/">Back to Games</a>
        </div>
      </section>`;
    const style = document.createElement('style');
    style.id = 'qualiacology-runtime-fallback-style';
    style.textContent = `
      #qualiacology-runtime-fallback{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 35%,#111722 0%,#05070b 68%,#000 100%);color:#f3f6f8;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center}
      #qualiacology-runtime-fallback section{width:min(560px,100%);padding:30px 26px;border:1px solid rgba(255,255,255,.16);border-radius:20px;background:rgba(8,11,17,.88);box-shadow:0 28px 90px rgba(0,0,0,.58)}
      #qualiacology-runtime-fallback .qrf-kicker{margin:0 0 12px;color:#9eb0b9;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
      #qualiacology-runtime-fallback h1{margin:0 0 12px;font-size:clamp(28px,7vw,48px);line-height:1.02;letter-spacing:-.03em}
      #qualiacology-runtime-fallback .qrf-detail{margin:0 auto;color:#c9d4d9;line-height:1.6;max-width:44ch}
      #qualiacology-runtime-fallback .qrf-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:24px}
      #qualiacology-runtime-fallback button,#qualiacology-runtime-fallback a{min-height:44px;padding:11px 16px;border:1px solid rgba(255,255,255,.26);border-radius:999px;background:rgba(255,255,255,.06);color:#fff;font:800 13px/1 system-ui,-apple-system,"Segoe UI",sans-serif;text-decoration:none;cursor:pointer}
      #qualiacology-runtime-fallback button:hover,#qualiacology-runtime-fallback button:focus-visible,#qualiacology-runtime-fallback a:hover,#qualiacology-runtime-fallback a:focus-visible{background:rgba(255,255,255,.14);outline:2px solid #fff;outline-offset:2px}`;
    document.head.appendChild(style);
    document.body.appendChild(host);
    host.querySelector('button').addEventListener('click', () => location.reload());
  }
  host.querySelector('h1').textContent = title || 'This world could not open.';
  host.querySelector('.qrf-detail').textContent = detail || 'Try a current browser with hardware acceleration enabled.';
  host.hidden = false;
  document.documentElement.style.background = '#000';
  document.body.style.background = '#000';
  return host;
}

function probeWebGL() {
  const canvas = document.createElement('canvas');
  let gl = null;
  try {
    gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false })
      || canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false });
  } catch (_) {
    gl = null;
  }
  if (gl) {
    try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch (_) {}
  }
  return !!gl;
}

export async function loadWebGLGame(entry, options = {}) {
  const title = options.title || 'This world could not open.';
  const unavailable = options.unavailable
    || 'This game needs WebGL. Try a current browser with hardware acceleration enabled.';
  const failed = options.failed
    || 'The game files loaded, but the renderer could not start. Reloading often fixes a temporary GPU reset.';

  window.__qualiacologyGameFatal = (fatalTitle = title, detail = failed) => createFallback(fatalTitle, detail);

  if (!probeWebGL()) {
    if (typeof options.onUnavailable === 'function') options.onUnavailable(unavailable);
    else createFallback(title, unavailable);
    return false;
  }

  try {
    await import(new URL(entry, document.baseURI).href);
    return true;
  } catch (error) {
    // Keep the technical exception available to developers without turning a
    // recoverable compatibility screen into an unhandled page error.
    console.warn(`[Qualiacology] ${title} failed to start`, error);
    if (typeof options.onFailure === 'function') options.onFailure(error, failed);
    else createFallback(title, failed);
    return false;
  }
}
