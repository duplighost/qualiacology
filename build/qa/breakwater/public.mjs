// Actual player-facing route: no development bridge or combat fixtures.
// This specifically covers pointer-lock promise/event ordering on start/resume.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';

const url=new URL(process.env.BREAKWATER_QA_URL||'http://127.0.0.1:4173/breakwater/');
url.searchParams.delete('dev');
const out=process.env.BREAKWATER_QA_OUT||`${tmpdir()}/breakwater-public-qa`;
mkdirSync(out,{recursive:true});
const report={url:url.href,method:'Real clicks and keyboard input on the ordinary public route. Performance quality is selected for the cloud software renderer.',checks:[],errors:[],httpErrors:[],externalRequests:[]};
const browser=await chromium.launch({executablePath:process.env.BREAKWATER_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600}});
 page.setDefaultTimeout(60000);
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({url:r.url(),status:r.status()});});
 page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==url.origin)report.externalRequests.push(r.url());});
 await page.addInitScript(()=>localStorage.setItem('qualiacology.breakwater.v1',JSON.stringify({version:1,settings:{quality:'low',volume:0,music:0}})));
 await page.goto(url.href,{waitUntil:'domcontentloaded'});
 await page.locator('#menu-panel:not(.hidden)').waitFor({timeout:120000});
 assert.equal(await page.evaluate(()=>!!window.__BREAKWATER__),false);
 report.checks.push('Public menu boots without a developer bridge');
 const playing=async()=>{
   await page.waitForFunction(()=>document.pointerLockElement===document.querySelector('#game')&&!document.querySelector('#hud').classList.contains('hidden'),null,{timeout:60000,polling:50});
   assert.equal(await page.locator('.panel:not(.hidden)').count(),0);
 };
 await page.locator('#menu-panel [data-action="new"]').click();
 await playing();report.checks.push('New game captures the mouse and leaves the HUD active');
 await page.keyboard.press('Escape');
 await page.locator('#pause-panel:not(.hidden)').waitFor();
 await page.waitForFunction(()=>!document.pointerLockElement,null,{polling:50});
 report.checks.push('Escape pauses and releases the mouse');
 await page.locator('#pause-panel [data-action="resume"]').click();
 await playing();report.checks.push('Resume captures the mouse and returns directly to play');
 await page.keyboard.press('Tab');
 await page.locator('#skills-panel:not(.hidden)').waitFor();
 await page.locator('#skills-panel [data-action="exit-skills"]').click();
 await playing();report.checks.push('The constellation returns to play through the same public lock path');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpErrors,[]);assert.deepEqual(report.externalRequests,[]);
 report.passed=true;
 console.log(JSON.stringify(report,null,2));
}catch(error){report.passed=false;report.failure=error.stack||String(error);throw error;}
finally{writeFileSync(`${out}/public-report.json`,JSON.stringify(report,null,2));await browser.close();}
