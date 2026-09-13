const { chromium } = require('/tmp/qualiacology-mobile-qa/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const ROOT = path.join(__dirname, 'out', 'MobileGamesAndroid');
const QA = path.join(__dirname, 'out', 'qa');
const games = [['fallingopen','falling-open'],['lilbigbang','lil-big-bang'],['thrown','thrown'],['iseentit','i-seent-it']];
const mime = {'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.wasm':'application/wasm'};
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
(async()=>{
  fs.mkdirSync(QA,{recursive:true});
  const executablePath = process.env.CHROME_PATH || execSync('which google-chrome || which chromium || which chromium-browser',{encoding:'utf8'}).trim().split('\n')[0];
  const browser = await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const reports=[];
  try {
    for (const [module,slug] of games) {
      const assets=path.join(ROOT,module,'src/main/assets');
      const server=http.createServer((req,res)=>{
        const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
        let target=path.resolve(assets,'.'+pathname);
        if (!target.startsWith(assets+path.sep)) {res.writeHead(403);res.end();return;}
        if (fs.existsSync(target)&&fs.statSync(target).isDirectory()) target=path.join(target,'index.html');
        if (!fs.existsSync(target)) {res.writeHead(404);res.end('Not found');return;}
        res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});fs.createReadStream(target).pipe(res);
      });
      await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
      const origin='http://127.0.0.1:'+server.address().port;
      try {
        for (const viewport of [{width:412,height:915},{width:360,height:800}]) {
          const errors=[],missing=[],blocked=[];
          const context=await browser.newContext({viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
          await context.route('**/*',route=>{
            const url=route.request().url();
            if (url.startsWith(origin+'/') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
            blocked.push(url);return route.abort();
          });
          const page=await context.newPage();
          page.on('pageerror',e=>errors.push(e.message));
          page.on('response',response=>{if(response.status()>=400&&!/favicon/.test(response.url()))missing.push({url:response.url(),status:response.status()});});
          const report={slug,viewport,errors,missing,blocked};
          try {
            await page.goto(origin+'/'+slug+'/index.html',{waitUntil:'load',timeout:45000});
            await page.waitForTimeout(4000);
            report.initial=await page.evaluate(()=>({title:document.title,text:document.body.innerText.slice(0,5000),canvases:Array.from(document.querySelectorAll('canvas'),c=>({width:c.width,height:c.height})),buttons:Array.from(document.querySelectorAll('button'),b=>({text:b.innerText,visible:b.getBoundingClientRect().width>0&&getComputedStyle(b).visibility!=='hidden'}))}));
            await page.screenshot({path:path.join(QA,slug+'-'+viewport.width+'-start.png')});
            await page.evaluate(()=>{window.__mobileTestTouchCount=0;addEventListener('pointerdown',()=>window.__mobileTestTouchCount++);});
            const cdp=await context.newCDPSession(page);
            const w=viewport.width,h=viewport.height;
            let started=false;
            for (const button of await page.locator('button').all()) {
              const text=(await button.innerText()).trim();
              if (/^(play|begin|start|enter|continue|fall|accept|sign)(\b|\s)/i.test(text) && !/restart|again|movement/i.test(text) && await button.isVisible()) {
                await button.tap();started=true;break;
              }
            }
            if(!started) await page.touchscreen.tap(w*.5,h*.64);
            await page.waitForTimeout(1000);
            for(let gesture=0;gesture<4;gesture++) {
              await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:w*.5,y:h*.57,id:1}]});
              for(let step=1;step<=8;step++) {
                await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:w*(.5+Math.sin(step/8*Math.PI)*.2*(gesture%2?1:-1)),y:h*(.57-step*.012),id:1}]});
                await page.waitForTimeout(45);
              }
              await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
              await page.waitForTimeout(250);
            }
            await page.waitForTimeout(2000);
            report.after=await page.evaluate(()=>({text:document.body.innerText.slice(0,5000),touchCount:window.__mobileTestTouchCount,canvases:Array.from(document.querySelectorAll('canvas'),c=>({width:c.width,height:c.height})),scrollWidth:document.documentElement.scrollWidth,innerWidth,visibility:document.visibilityState}));
            await page.screenshot({path:path.join(QA,slug+'-'+viewport.width+'-played.png')});
            await page.evaluate(()=>localStorage.setItem('__android_storage_smoke','ok'));
            await page.reload({waitUntil:'load'});
            report.storageSurvivedReload=await page.evaluate(()=>{const ok=localStorage.getItem('__android_storage_smoke')==='ok';localStorage.removeItem('__android_storage_smoke');return ok;});
            report.passed=errors.length===0&&missing.length===0&&report.after.touchCount>=4&&report.after.canvases.some(c=>c.width>0&&c.height>0)&&report.storageSurvivedReload;
          } catch(e) {report.failure=e.stack;report.passed=false;}
          reports.push(report);console.log(JSON.stringify(report));
          await context.close();
        }
      } finally {await new Promise(resolve=>server.close(resolve));}
    }
  } finally {await browser.close();fs.writeFileSync(path.join(QA,'browser-report.json'),JSON.stringify({description:'Desktop Chromium mobile/touch emulation, not physical Android performance or complete gameplay certification.',reports},null,2));}
  if(reports.length!==8||reports.some(r=>!r.passed))process.exitCode=1;
})();
