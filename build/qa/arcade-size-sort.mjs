
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createStaticServer } from '../scripts/static-server.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const catalog = JSON.parse(readFileSync(join(root,'build/src/content/arcade-data.json'),'utf8'));
const games = catalog.games;
const recommended = g => g.versions.find(v => v.id === g.preferredId);
const bytes = g => recommended(g).bytes;
const known = g => Number.isSafeInteger(bytes(g)) && bytes(g)>0;
const title = (a,b) => a.title.localeCompare(b.title,undefined,{numeric:true,sensitivity:'base'});
const ties = (a,b) => title(a,b) || a.id.localeCompare(b.id);
const expected = (items, descending) => [
  ...items.filter(known).sort((a,b) => (descending ? bytes(b)-bytes(a) : bytes(a)-bytes(b)) || ties(a,b)),
  ...items.filter(g => !known(g)).sort(ties),
].map(g=>g.id);
const ids = page => page.locator('[data-game-id]').evaluateAll(cards=>cards.map(c=>c.dataset.gameId));
const sort = page => page.locator('[data-filter-key="sort"]');
const param = (page,key) => new URL(page.url()).searchParams.get(key);
const server = await createStaticServer({root,port:0});
const base = 'http://127.0.0.1:'+server.address().port+'/arcade/';
const errors = [];
const report = process.env.ARCADE_QA_SCREENSHOTS;
let browser;
function pass(message) { console.log('PASS '+message); }
async function load(page, query='') {
  const response = await page.goto(base+query);
  assert.equal(response.status(),200);
  await page.locator('[data-loading]').waitFor({state:'hidden'});
  assert.equal(await page.locator('[data-fallback]').isVisible(),false);
}
async function choose(page, key, value) {
  await page.locator('[data-filter-key="'+key+'"]').selectOption(value);
}
async function collect(page) {
  const result = [];
  for (;;) {
    result.push(...await ids(page));
    const next = page.locator('[data-page-next]');
    if (!(await next.isVisible()) || await next.isDisabled()) break;
    await next.evaluate(button=>button.click());
  }
  return result;
}
async function checkOrder(page, items, descending) {
  assert.deepEqual(await collect(page),expected(items,descending));
}
function watch(page) { page.on('pageerror',e=>errors.push(e.message)); }
try {
  browser = await chromium.launch(process.env.QA_CHROME_PATH
    ? {headless:true,executablePath:process.env.QA_CHROME_PATH}
    : {headless:true,channel:'chrome'});
  const context = await browser.newContext({viewport:{width:1440,height:900}});
  const page = await context.newPage();
  watch(page);
  assert.equal(games.length,catalog.metadata.counts.families);
  assert.equal(games.reduce((n,g)=>n+g.versions.length,0),catalog.metadata.counts.versions);
  const buildCount = games.reduce((n,g)=>n+g.versions.length,0);
  const pages = Math.ceil(games.length/36);
  await load(page);
  assert.equal(await sort(page).inputValue(),'newest');
  assert.deepEqual(await sort(page).locator('option').evaluateAll(opts=>opts.map(o=>o.value)),['newest','oldest','az','za','featured','size-asc','size-desc']);
  assert.ok((await page.locator('[data-results-count]').innerText()).includes(games.length.toLocaleString()));
  pass(games.length+' families / '+buildCount.toLocaleString()+' builds; all seven sort choices; newest remains default');
  for (const [mode,desc] of [['size-asc',false],['size-desc',true]]) {
    await choose(page,'sort',mode);
    assert.equal(param(page,'sort'),mode);
    assert.equal(param(page,'page'),null);
    const first = (await ids(page))[0];
    const firstCard = page.locator('[data-game-id]').first();
    assert.match(await firstCard.locator('.arcade-card-status').innerText(),/KB|MB|GB/);
    assert.equal(await firstCard.locator('.arcade-card-status span').getAttribute('title'),'Preferred build: '+bytes(games.find(g=>g.id===first)).toLocaleString()+' bytes');
    if (report) {
      mkdirSync(report,{recursive:true});
      await page.locator('[data-results]').scrollIntoViewIfNeeded();
      await page.screenshot({path:join(report,mode+'-desktop.png')});
    }
    const all = await collect(page);
    assert.deepEqual(all,expected(games,desc));
    assert.equal(new Set(all).size,games.length);
    assert.equal(param(page,'page'),pages>1?String(pages):null);
    assert.equal(await page.locator('[data-page-next]').isDisabled(),true);
    if (!known(games.find(g=>g.id===all[(pages-1)*36]))) assert.equal(await page.locator('.arcade-card-status span').first().innerText(),'Size not recorded');
    pass(mode+': all '+pages+' pages / '+games.length+' unique families; known order, ties and unknowns last; first '+first);
    await page.reload();
    await page.locator('[data-loading]').waitFor({state:'hidden'});
    assert.equal(await sort(page).inputValue(),mode);
    assert.equal(param(page,'page'),pages>1?String(pages):null);
    assert.deepEqual(await ids(page),all.slice((pages-1)*36));
  }
  await choose(page,'sort','size-asc');
  assert.equal(param(page,'page'),null);
  await choose(page,'kind','native');
  await checkOrder(page,games.filter(g=>g.kind==='native'),false);
  assert.equal(param(page,'kind'),'native');
  await choose(page,'sort','size-desc');
  await checkOrder(page,games.filter(g=>g.kind==='native'),true);
  pass('type filter composes with both directions and resets pagination');

  // Use a selected real game to exercise simultaneous search, facets and URL state.
  await load(page,'?sort=size-asc&kind=game&status=playable');
  const match = games.find(g=>g.kind==='game' && known(g) && g.controlKinds.includes('Keyboard') && g.versions.length>1 && /^https:\/\//.test(recommended(g).url||'') && !['restricted','unavailable','broken','failed','needs-fix'].includes(recommended(g).status))
    || games.find(g=>g.kind==='game' && known(g) && g.controlKinds.length && g.versions.length>1 && /^https:\/\//.test(recommended(g).url||'') && !['restricted','unavailable','broken','failed','needs-fix'].includes(recommended(g).status));
  assert.ok(match);
  const search = page.locator('[data-search]');
  await search.fill(match.title);
  await page.waitForFunction(q=>new URL(location.href).searchParams.get('q')===q,match.title);
  const control = match.controlKinds[0];
  await choose(page,'control',control);
  assert.ok((await ids(page)).includes(match.id));
  const genres = await page.locator('[data-filter-key="genre"] option').evaluateAll(opts=>opts.map(o=>o.value).filter(Boolean));
  let genre;
  for (const g of genres) {
    await choose(page,'genre',g);
    if ((await ids(page)).includes(match.id)) {genre=g;break;}
  }
  assert.ok(genre);
  const before = await collect(page);
  assert.deepEqual(before,expected(games.filter(g=>before.includes(g.id)),false));
  await choose(page,'sort','size-desc');
  assert.deepEqual(await collect(page),expected(games.filter(g=>before.includes(g.id)),true));
  const selectedUrl = page.url();
  await page.reload();
  await page.locator('[data-loading]').waitFor({state:'hidden'});
  assert.equal(page.url(),selectedUrl);
  for (const [key,value] of [['sort','size-desc'],['kind','game'],['status','playable'],['control',control],['genre',genre],['q',match.title]]) assert.equal(param(page,key),value);
  assert.equal(await search.inputValue(),match.title);
  pass('search + genre + type + controls + availability survive sort and reload');
  await page.locator('[data-layout="list"]').click();
  assert.equal(await page.locator('[data-arcade-grid]').getAttribute('data-layout'),'list');
  const card = page.locator('[data-game-id="'+match.id+'"]');
  await card.locator('[data-favorite]').click();
  await card.locator('h2 button').click();
  const dialog=page.locator('#arcade-game');
  assert.equal(await dialog.isVisible(),true);
  assert.equal(param(page,'game'),match.id);
  const other=match.versions.find(v=>v.id!==match.preferredId);
  await dialog.locator('[data-version]').selectOption(other.id);
  assert.equal(param(page,'build'),other.id);
  assert.equal(param(page,'sort'),'size-desc');
  await page.reload();
  await page.locator('[data-loading]').waitFor({state:'hidden'});
  assert.equal(await dialog.locator('[data-version]').inputValue(),other.id);
  assert.equal(param(page,'build'),other.id);
  await dialog.locator('[data-dialog-close]').click();
  await page.waitForFunction(()=>!new URL(location.href).searchParams.has('game'));
  assert.equal(param(page,'build'),null);
  assert.equal(param(page,'sort'),'size-desc');
  assert.equal(await page.locator('[data-arcade-grid]').getAttribute('data-layout'),'list');
  pass('list layout, favorite, detail dialog and alternate-build deep links preserved');
  await page.locator('[data-reset]').first().click();
  assert.equal(param(page,'sort'),null);
  assert.equal(param(page,'q'),null);
  assert.equal(await sort(page).inputValue(),'newest');
  await page.locator('[data-shelf="favorites"]').click();
  await choose(page,'sort','size-desc');
  assert.deepEqual(await ids(page),[match.id]);
  pass('clear filters resets sort; favorites shelf remains sortable');
  const playable=games.filter(g=>/^https:\/\//.test(recommended(g).url||'') && !['restricted','unavailable','broken','failed','needs-fix'].includes(recommended(g).status) && known(g)).slice(0,4);
  await page.evaluate(items=>localStorage.setItem('qualiacology.arcade.recent',JSON.stringify(items)),playable.map((g,i)=>({id:g.id,at:Date.now()-i})));
  await load(page,'?shelf=recent');
  assert.deepEqual(await ids(page),playable.map(g=>g.id));
  await choose(page,'sort','size-desc');
  assert.deepEqual(await ids(page),expected(playable,true));
  pass('recent shelf default play order and explicit size ordering');
  await load(page,'?sort=invalid');
  assert.equal(await sort(page).inputValue(),'newest');
  assert.equal(param(page,'sort'),null);
  await search.fill('no-match-8bf432e16');
  await page.locator('[data-empty]').waitFor({state:'visible'});
  assert.equal(await page.locator('[data-random]').isDisabled(),true);
  pass('invalid sort falls back; no-results state remains functional');
  for (const mode of ['newest','oldest','az','za','featured']) {
    await load(page,'?sort='+mode);
    const ordered = games.slice().sort((a,b)=>mode==='az'?title(a,b):mode==='za'?title(b,a):mode==='oldest'?(Date.parse(a.firstDate)||Infinity)-(Date.parse(b.firstDate)||Infinity)||title(a,b):mode==='featured'?Number(b.featured)-Number(a.featured)||title(a,b):(Date.parse(b.lastDate)||0)-(Date.parse(a.lastDate)||0)||title(a,b));
    assert.deepEqual(await ids(page),ordered.slice(0,36).map(g=>g.id));
  }
  pass('all five existing sort orders match their original first pages');
  await context.close();

  const mobile = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const mp = await mobile.newPage();
  watch(mp);
  await load(mp,'?sort=size-desc');
  assert.deepEqual(await ids(mp),expected(games,true).slice(0,36));
  await mp.locator('.arcade-refine summary').click();
  assert.equal(await sort(mp).isVisible(),true);
  await choose(mp,'sort','size-asc');
  assert.deepEqual(await ids(mp),expected(games,false).slice(0,36));
  assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(report) {await sort(mp).scrollIntoViewIfNeeded();await mp.screenshot({path:join(report,'mobile-sort.png')});}
  await mobile.close();
  pass('390px mobile filter controls, both directions, no horizontal overflow');

  // Intercept a test-only catalog in a fresh context, leaving the real files untouched.
  const edge = await browser.newContext();
  const ep = await edge.newPage(); watch(ep);
  const samples = [null,undefined,0,-1,'42',1.5,Number.MAX_SAFE_INTEGER+1,100,100,20];
  const fixture = {...catalog,games:samples.map((value,i)=>{
    const source=games[i];
    return {...source,id:'fixture-'+i,title:i===7?'Zeta':i===8?'Alpha':String(i),preferredId:'pref-'+i,versions:[{...recommended(source),id:'other-'+i,bytes:1},{...recommended(source),id:'pref-'+i,bytes:value}]};
  })};
  await ep.route('**/assets/arcade/catalog.*.json',route=>route.fulfill({json:fixture}));
  for(const [mode,desc] of [['size-asc',false],['size-desc',true]]) {
    await load(ep,'?sort='+mode);
    assert.deepEqual(await ids(ep),expected(fixture.games,desc));
    assert.deepEqual((await ids(ep)).slice(0,3),desc?['fixture-8','fixture-7','fixture-9']:['fixture-9','fixture-8','fixture-7']);
    assert.equal(await ep.locator('.arcade-card-status span').filter({hasText:'Size not recorded'}).count(),7);
  }
  pass('test-only invalid/missing/zero/negative/non-numeric/unsafe byte values; preferred build vs older build; exact-size ties');
  await edge.close();
  assert.deepEqual(errors,[]);
  pass('zero uncaught browser JavaScript errors');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
