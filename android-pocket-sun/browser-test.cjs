const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('./node_modules/playwright');
const OUT = path.join(__dirname, 'out');
const report = { checks: [], smoke: [], limitations: 'Desktop Chromium mobile emulation; not physical-phone performance.' };
const mime = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
function serve(root, port) {
  return new Promise(resolve => {
    const s = http.createServer((req,res) => {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const relative = pathname.replace(/^\/pocket-sun\/?/, '') || 'index.html';
      const file = path.resolve(root, relative);
      if (!file.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404); res.end(); return;
      }
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      res.end(fs.readFileSync(file));
    }).listen(port, '127.0.0.1', () => resolve(s));
  });
}
function check(name, condition) { assert.ok(condition, name); report.checks.push(name); }
async function context(browser, viewport, native) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  const external = [];
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (/^http:\/\/127\.0\.0\.1:81(?:23|24)\//.test(url)) route.continue();
    else { external.push(url); route.abort(); }
  });
  if (native) await ctx.addInitScript(() => {
    window.__backgroundCalls = 0;
    window.__hapticCalls = 0;
    window.PocketSunAndroid = {
      ready(){}, requestSound(){return true;},
      background(){window.__backgroundCalls++;},
      vibrate(){window.__hapticCalls++;}
    };
  });
  return {ctx, external};
}
(async () => {
  fs.mkdirSync(path.join(OUT, 'qa'), {recursive:true});
  const servers = [await serve(path.join(OUT,'baseline'),8124),
    await serve(path.join(OUT,'PocketSunAndroid/app/src/main/assets/pocket-sun'),8123)];
  const browser = await chromium.launch({ executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',
    headless:true, args:['--no-sandbox','--disable-dev-shm-usage'] });
  report.browser = browser.version();
  try {
    for (const viewport of [{width:360,height:800},{width:412,height:915},{width:480,height:1040}]) {
      const results = [];
      for (const native of [false,true]) {
        const {ctx, external} = await context(browser, viewport, native);
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror',e => errors.push(String(e)));
        const port = native ? 8123 : 8124;
        await page.goto(`http://127.0.0.1:${port}/pocket-sun/index.html?autotest=1&seed=314159`, {waitUntil:'load'});
        await page.waitForFunction(() => document.body.dataset.autotest === 'done', null, {timeout:60000});
        const smoke = await page.evaluate(() => JSON.parse(document.body.dataset.autotestResult));
        check(`${native?'Android':'Original'} smoke passes at ${viewport.width}x${viewport.height}`, smoke.ok);
        check(`${native?'Android':'Original'} has no JS exceptions at ${viewport.width}`, errors.length === 0);
        if (native) check(`Android uses only bundled resources at ${viewport.width}`, external.length === 0);
        results.push(smoke);
        report.smoke.push({native,viewport,result:smoke,errors,external});
        await ctx.close();
      }
      check(`Seeded physics matches the original at ${viewport.width}`, results[0].stateHash === results[1].stateHash);
    }
    const {ctx,external} = await context(browser, {width:412,height:915}, true);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror',e => errors.push(String(e)));
    await page.goto('http://127.0.0.1:8123/pocket-sun/index.html?seed=271828');
    await page.waitForFunction(() => document.body.dataset.gameReady === 'true');
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:210,y:500,id:1}]});
    await page.waitForTimeout(100);
    check('Original one-finger hold is active', await page.evaluate(() => window.__POCKET_ANDROID_TEST__().pointerDown));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:275,y:420,id:1}]});
    await page.waitForTimeout(250);
    await page.evaluate(() => window.__pocketSetActive(false));
    check('Backgrounding cancels the active touch without a release pulse', await page.evaluate(() => !window.__POCKET_ANDROID_TEST__().pointerDown));
    check('Backgrounding suspends the simulation', await page.evaluate(() => window.__POCKET_ANDROID_TEST__().suspended));
    const suspendedHash = await page.evaluate(() => window.__POCKET_SUN__.stateHash());
    await page.waitForTimeout(250);
    check('No background physics drift', suspendedHash === await page.evaluate(() => window.__POCKET_SUN__.stateHash()));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    await page.evaluate(() => window.__pocketSetActive(true));
    await page.waitForTimeout(200);
    check('Simulation resumes after an interruption', suspendedHash !== await page.evaluate(() => window.__POCKET_SUN__.stateHash()));
    await page.evaluate(() => window.dispatchEvent(new Event('pocket-native-back')));
    check('Android Back pauses the game', await page.evaluate(() => window.__POCKET_ANDROID_TEST__().paused));
    await page.evaluate(() => { window.__pocketSetActive(false); window.__pocketSetActive(true); });
    check('Manual pause survives background/resume', await page.evaluate(() => window.__POCKET_ANDROID_TEST__().paused));
    await page.evaluate(() => window.dispatchEvent(new Event('pocket-native-back')));
    check('Second Back minimizes instead of losing the run', await page.evaluate(() => window.__backgroundCalls === 1));
    await page.getByRole('button',{name:'Resume Pocket Sun'}).tap();
    check('Existing resume overlay works with touch', await page.evaluate(() => !window.__POCKET_ANDROID_TEST__().paused));
    await page.touchscreen.tap(150,500);
    await page.waitForTimeout(400);
    await page.screenshot({path:path.join(OUT,'qa','portrait-browser.png')});
    // Stop the old run before injecting a fixture; it otherwise overwrites it on its next save.
    await page.evaluate(() => { window.__pocketSetActive(false); localStorage.setItem('pocket-sun-best','24680'); });
    report.storageBeforeReload = await page.evaluate(() => localStorage.getItem('pocket-sun-best'));
    await page.reload();
    await page.waitForFunction(() => document.body.dataset.gameReady === 'true');
    report.storageAfterReload = await page.evaluate(() => localStorage.getItem('pocket-sun-best'));
    check('Best-score storage persists after reload', report.storageBeforeReload === '24680' && report.storageAfterReload === '24680');
    await page.reload();
    await page.waitForFunction(() => document.body.dataset.gameReady === 'true');
    check('Saved best remains intact on another launch', await page.evaluate(() => localStorage.getItem('pocket-sun-best') === '24680'));
    const canvas = await page.locator('canvas.world').boundingBox();
    check('Portrait playfield fits the viewport', canvas.width <= 413 && canvas.height <= 916 && canvas.height > canvas.width);
    check('No external resource dependencies', external.length === 0);
    check('No interaction or lifecycle JS exceptions', errors.length === 0);
    report.interactionErrors = errors;
    await ctx.close();
    report.ok = true;
    console.log(JSON.stringify(report,null,2));
  } catch(e) {
    report.ok = false; report.error = String(e.stack || e); throw e;
  } finally {
    fs.writeFileSync(path.join(OUT,'qa','browser-report.json'),JSON.stringify(report,null,2));
    await browser.close(); servers.forEach(s => s.close());
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
