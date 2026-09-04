(() => {
  const out = document.getElementById('results');
  const canvas = document.getElementById('game');
  const results = [];
  let failed = 0;

  function log(ok, name, detail) {
    results.push({ ok, name, detail: detail == null ? '' : String(detail) });
    if (!ok) failed++;
    out.textContent = results.map(r => (r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.detail ? ' — ' + r.detail : '')).join('\n');
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function key(type, code) {
    const target = window;
    target.dispatchEvent(new KeyboardEvent(type === 'down' ? 'keydown' : 'keyup', {
      code, key: code, bubbles: true, cancelable: true
    }));
  }

  function pointer(type, props) {
    const r = canvas.getBoundingClientRect();
    const nx = props.nx == null ? 0.5 : props.nx;
    const ny = props.ny == null ? 0.5 : props.ny;
    canvas.dispatchEvent(new PointerEvent(type, {
      pointerId: props.id || 1,
      pointerType: props.pointerType || 'mouse',
      isPrimary: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: r.left + r.width * nx,
      clientY: r.top + r.height * ny,
      bubbles: true,
      cancelable: true
    }));
  }

  function canvasHasPaint() {
    try {
      const ctx = canvas.getContext('2d');
      const sample = ctx.getImageData(80, 80, 240, 120).data;
      let colored = 0;
      for (let i = 0; i < sample.length; i += 16) {
        if (sample[i] > 8 || sample[i + 1] > 8 || sample[i + 2] > 8) colored++;
      }
      return colored > 20;
    } catch (err) {
      return false;
    }
  }

  async function run() {
    const errors = [];
    window.addEventListener('error', e => errors.push(String(e.error || e.message)));
    await wait(250);
    const HS = window.__HELLSPINDLE__;
    log(!!HS, 'debug hook present');
    if (!HS) {
      window.__RESULTS__ = { failed: 1, results, errors };
      return;
    }

    log(HS.snapshot().state === 'title', 'title state');
    log(canvasHasPaint(), 'title canvas has paint');

    HS.start();
    await wait(200);
    log(HS.snapshot().state === 'playing', 'start enters playing');
    log(canvasHasPaint(), 'playing canvas has paint');

    const x0 = HS.snapshot().player.x;
    key('down', 'KeyD');
    await wait(220);
    key('up', 'KeyD');
    const x1 = HS.snapshot().player.x;
    log(x1 > x0 + 15, 'keyboard D moves', `${x0.toFixed(1)} -> ${x1.toFixed(1)}`);

    const y0 = HS.snapshot().player.y;
    key('down', 'Space');
    await wait(80);
    key('up', 'Space');
    const jump = HS.snapshot().player;
    log(jump.y < y0 - 8 || jump.vy < -40, 'space jumps', `y ${jump.y.toFixed(1)} vy ${jump.vy.toFixed(1)}`);

    pointer('pointerdown', { pointerType: 'mouse', nx: 0.8, ny: 0.25 });
    await wait(100);
    const wheel = HS.snapshot().yoyo;
    log(wheel.active === true, 'mouse aims the wheel', JSON.stringify({ active: wheel.active, x: wheel.x.toFixed(1) }));
    pointer('pointerup', { pointerType: 'mouse', nx: 0.8, ny: 0.25 });

    HS.restartFull();
    await wait(80);
    const t0 = HS.snapshot().player.x;
    pointer('pointerdown', { pointerType: 'touch', id: 11, nx: 0.12, ny: 0.78 });
    pointer('pointermove', { pointerType: 'touch', id: 11, nx: 0.28, ny: 0.78 });
    await wait(220);
    pointer('pointerup', { pointerType: 'touch', id: 11, nx: 0.28, ny: 0.78 });
    const t1 = HS.snapshot().player.x;
    log(t1 > t0 + 8, 'touch drag moves', `${t0.toFixed(1)} -> ${t1.toFixed(1)}`);

    HS.teleport(580, 610);
    await wait(80);
    const ledgeY = HS.snapshot().player.y;
    key('down', 'KeyS');
    await wait(350);
    key('up', 'KeyS');
    const dropped = HS.snapshot();
    log(dropped.state === 'playing' && dropped.player.y > ledgeY + 80 && dropped.player.y < 790, 'drop through ledge', `y ${ledgeY.toFixed(1)} -> ${dropped.player.y.toFixed(1)}`);

    key('down', 'KeyP');
    await wait(50);
    key('up', 'KeyP');
    log(HS.snapshot().paused === true, 'pause');
    key('down', 'KeyP');
    await wait(50);
    key('up', 'KeyP');
    log(HS.snapshot().paused === false, 'unpause');

    HS.setInvulnerable(30);
    HS.breakMembrane(10, 0, 99);
    HS.teleport(35060, 760);
    await wait(180);
    const boss = HS.snapshot().boss;
    log(!!(boss && boss.alive && boss.awake), 'finale wakes boss', JSON.stringify(boss));
    HS.restart();
    await wait(120);
    const again = HS.snapshot().boss;
    log(!!(again && again.alive && again.awake), 'restart keeps boss awake', JSON.stringify(again));

    HS.damageBoss(100000);
    let vic = HS.snapshot();
    const until = performance.now() + 8000;
    while (vic.state !== 'victory' && performance.now() < until) {
      await wait(150);
      vic = HS.snapshot();
    }
    log(vic.state === 'victory', 'victory after boss', vic.state);
    log(vic.completed === true, 'victory persisted in session');

    const raw = localStorage.getItem('gorethread-cathedral-v1');
    let saveOk = false;
    try { saveOk = JSON.parse(raw).completed === true; } catch (_) {}
    log(saveOk, 'localStorage completed flag');

    log(errors.length === 0, 'no page errors', errors.join(' | '));

    window.__RESULTS__ = {
      failed,
      passed: results.filter(r => r.ok).length,
      results,
      errors
    };
    out.textContent += `\n\n${window.__RESULTS__.passed} passed, ${failed} failed`;
    document.title = failed ? 'FAIL' : 'PASS';
  }

  window.addEventListener('load', () => {
    run().catch(err => {
      log(false, 'runner exception', err && err.stack || err);
      window.__RESULTS__ = { failed: failed + 1, results, errors: [String(err)] };
      document.title = 'FAIL';
    });
  });
})();
