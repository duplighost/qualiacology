/* The catalog is fetched once; filters and personal shelves stay local. */
(() => {
  const root = document.querySelector('[data-arcade]');
  if (!root) return;
  const $ = (selector, parent = root) => parent.querySelector(selector);
  const $$ = (selector, parent = root) => [...parent.querySelectorAll(selector)];
  const grid = $('[data-arcade-grid]');
  const dialog = $('#arcade-game');
  const content = $('[data-dialog-content]');
  const params = new URLSearchParams(location.search);
  const PAGE_SIZE = 36;
  const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const saveStore = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing still supports discovery. */ } };
  const savedFavorites = readStore('qualiacology.arcade.favorites', []);
  const savedRecent = readStore('qualiacology.arcade.recent', []);
  const favorites = new Set((Array.isArray(savedFavorites) ? savedFavorites : []).filter(v => typeof v === 'string'));
  let recent = (Array.isArray(savedRecent) ? savedRecent : []).filter(v => v && typeof v.id === 'string').slice(0, 100);
  const state = {
    q: params.get('q') || '', shelf: params.get('shelf') || 'all', genre: params.get('genre') || '',
    kind: params.get('kind') || '', control: params.get('control') || '',
    sort: params.get('sort') || (params.get('shelf') === 'recent' ? 'recent' : 'az'), page: Math.max(1, Math.trunc(Number(params.get('page'))) || 1),
    layout: readStore('qualiacology.arcade.layout', 'grid') === 'list' ? 'list' : 'grid',
  };
  let games = [], filtered = [], activeGame, trigger;
  const KIND = {game:'Browser game', experience:'Interactive experience', collection:'Collection', native:'Desktop game'};
  const preferred = game => game.versions.find(v => v.id === game.preferredId) || game.versions[0];
  // Missing, zero or invalid sizes are not comparable with recorded byte counts.
  const buildBytes = v => Number.isSafeInteger(v?.bytes) && v.bytes > 0 ? v.bytes : null;
  const launchUrl = v => {
    if (!v || ['restricted','unavailable','broken','failed','needs-fix'].includes(v.status)) return '';
    const value = v.url || v.downloadUrl || '';
    return /^(https:\/\/|\/(?!\/))/.test(value) ? value : '';
  };
  const bytesText = value => value >= 1e9 ? `${(value / 1e9).toFixed(2)} GB` : value >= 1e6 ? `${(value / 1e6).toFixed(1)} MB` : `${Math.ceil(value / 1e3)} KB`;
  const cover = (game, detail = false) => {
    if (game.imageKind === 'title') {
      return `<span class="arcade-title-panel${game.title.length > 44 ? ' arcade-title-panel-long' : ''}${detail ? ' arcade-detail-art' : ''}" role="img" aria-label="${esc(`Title artwork for ${game.title}`)}"><span aria-hidden="true">${esc(game.title)}</span></span>`;
    }
    const src = game.imageUrl || '/assets/arcade/cover-unavailable.svg';
    const alt = game.imageAlt || (game.imageUrl ? `${game.title} — ${game.imageKind === 'art' ? 'cover art' : game.imageKind === 'title' ? 'title card' : 'preview'}` : `Preview image unavailable for ${game.title}`);
    return `<img src="${esc(src)}" alt="${esc(alt)}" width="800" height="450" ${detail ? '' : 'loading="lazy"'} decoding="async" class="${detail ? 'arcade-detail-art' : ''}${game.imageUrl ? '' : ' arcade-placeholder'}" data-cover>${game.imageUrl || detail ? '' : `<span class="arcade-cover-title">${esc(game.title)}</span><span class="arcade-cover-caption">Preview unavailable</span>`}`;
  };
  function favoriteButton(game, detail = false) {
    const selected = favorites.has(game.id);
    return `<button class="arcade-favorite" type="button" data-favorite="${esc(game.id)}" aria-pressed="${selected}" aria-label="${selected ? 'Remove' : 'Save'} ${esc(game.title)} ${selected ? 'from' : 'to'} favorites">${detail ? selected ? '★ Saved' : '☆ Save favorite' : selected ? '★' : '☆'}</button>`;
  }
  function action(game, version) {
    const url = launchUrl(version);
    if (!url) return '';
    const label = game.kind === 'native' ? (/\.(zip|exe)(?:\?|$)/i.test(url) || !version.url ? 'Download' : 'Get game') : game.kind === 'collection' ? 'Open collection' : game.kind === 'experience' ? 'Open' : 'Play';
    return `<a class="button button-primary" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-play="${esc(game.id)}">${label}<span class="sr-only"> ${esc(game.title)} — opens in a new tab</span></a>`;
  }
  function card(game) {
    const v = preferred(game);
    const bytes = buildBytes(v);
    return `<li class="arcade-card" data-game-id="${esc(game.id)}"><div class="arcade-card-media"><button type="button" data-open="${esc(game.id)}" aria-label="View ${esc(game.title)}">${cover(game)}</button>${favoriteButton(game)}</div><div class="arcade-card-copy"><div class="arcade-card-kicker"><span>${esc(game.genres[0] || KIND[game.kind] || 'Browser game')}</span></div><h2><button type="button" data-open="${esc(game.id)}">${esc(game.title)}</button></h2>${game.description ? `<p class="arcade-card-description">${esc(game.description)}</p>` : ''}<div class="arcade-card-bottom">${bytes === null ? '' : `<p class="arcade-card-size">${esc(bytesText(bytes))}</p>`}<div class="arcade-card-actions">${action(game,v)}<button type="button" class="arcade-details" data-open="${esc(game.id)}">Details & controls<span class="sr-only"> for ${esc(game.title)}</span></button></div></div></div></li>`;
  }
  function normalize(value) { return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
  // Group supplied descriptions into short, useful menu categories. Keep the
  // original genre text intact in search and the game's detail view.
  function genreGroups(game) {
    const text = normalize([...(game.genres || []), game.description || ''].join(' '));
    const rules = [
      ['Action',/\baction|combat|brawl|melee|fighting\b/], ['Shooter',/\bfps\b|shooter|shooting/],
      ['Platforming & movement',/platform|parkour|traversal|precision movement|momentum/],
      ['Horror',/horror|haunted|terror|scare/], ['Adventure & exploration',/adventure|explor|discovery/],
      ['Puzzle & word games',/puzzle|word game|riddle|logic/], ['Driving & racing',/driving|racing|\bracer\b|kart|rocket.board/],
      ['Rhythm & music',/rhythm|musical|music|instrument|playable album/],
      ['Story & visual novels',/narrative|visual novel|interactive fiction|\bstory\b/],
      ['RPG',/\brpg\b|role.playing/], ['Roguelite & survival',/rogue|survival|horde/],
      ['Sports',/\bsports\b|tennis|bowling|basketball|golf|skate|skating/],
      ['Simulation & sandbox',/simulat|sandbox|world.building/], ['Physics',/physics|gravity|kinetic/],
      ['Flight & space',/\bflight\b|flying|orbital|space exploration/],
      ['Interactive art & toys',/interactive (art|toy|experience|scene)|generative|visualizer|diorama/],
      ['Educational & quiz',/educational|\bquiz\b|naplex/], ['Arcade',/\barcade\b/],
    ];
    const groups = rules.filter(([,rule])=>rule.test(text)).map(([label])=>label);
    return groups.length ? groups : ['Uncategorized'];
  }
  function writeUrl(gameId) {
    const url = new URL(location.href);
    url.search = '';
    Object.entries(state).forEach(([key,value]) => {
      if (key === 'layout' || !value || (key === 'shelf' && value === 'all') || (key === 'sort' && value === (state.shelf === 'recent' ? 'recent' : 'az')) || (key === 'page' && value === 1)) return;
      url.searchParams.set(key,String(value));
    });
    if (gameId || dialog.open && activeGame) url.searchParams.set('game',gameId || activeGame.id);
    history.replaceState(null,'',url);
  }
  function updateShelves() {
    $$('[data-shelf]').forEach(button => {
      button.setAttribute('aria-pressed',String(state.shelf === button.dataset.shelf));
      const count = $('[data-shelf-count]',button);
      if (count) count.textContent = button.dataset.shelf === 'favorites' ? favorites.size : recent.length;
    });
  }
  function render({scroll = false} = {}) {
    const terms = normalize(state.q).trim().split(/\s+/).filter(Boolean);
    const recency = new Map(recent.map((v,i) => [v.id,i]));
    filtered = games.filter(game =>
      terms.every(term => game.search.includes(term)) &&
      (!state.genre || game.filterGenres.includes(state.genre)) &&
      (!state.kind || game.kind === state.kind) &&
      (!state.control || game.controlKinds.includes(state.control)) &&
      (state.shelf === 'all' || state.shelf === 'favorites' && favorites.has(game.id) || state.shelf === 'recent' && recency.has(game.id))
    );
    const byTitle = (a,b) => a.title.localeCompare(b.title,undefined,{numeric:true,sensitivity:'base'});
    const bySize = (a,b) => {
      const aBytes = buildBytes(preferred(a)), bBytes = buildBytes(preferred(b));
      // Unknowns always come last, even when known sizes are descending.
      if ((aBytes === null) !== (bBytes === null)) return aBytes === null ? 1 : -1;
      if (aBytes !== null && aBytes !== bBytes) return state.sort === 'size-asc' ? aBytes-bBytes : bBytes-aBytes;
      return byTitle(a,b) || a.id.localeCompare(b.id);
    };
    filtered.sort((a,b) => state.sort === 'size-asc' || state.sort === 'size-desc' ? bySize(a,b) : state.sort === 'recent' ? (recency.get(a.id) ?? Infinity)-(recency.get(b.id) ?? Infinity) || byTitle(a,b) : state.sort === 'za' ? byTitle(b,a) : byTitle(a,b));
    const pages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
    state.page = Math.min(pages,Math.max(1,state.page));
    const start = (state.page-1)*PAGE_SIZE;
    grid.innerHTML = filtered.slice(start,start+PAGE_SIZE).map(card).join('');
    grid.dataset.layout = state.layout;
    $('[data-results-count]').innerHTML = filtered.length ? `<strong>${start+1}–${Math.min(start+PAGE_SIZE,filtered.length)}</strong> of <strong>${filtered.length.toLocaleString()}</strong> games` : '<strong>No matching games</strong>';
    $('[data-empty]').hidden = Boolean(filtered.length);
    $('[data-pagination]').hidden = filtered.length <= PAGE_SIZE;
    $('[data-page-status]').textContent = `Page ${state.page} of ${pages}`;
    $('[data-page-prev]').disabled = state.page === 1;
    $('[data-page-next]').disabled = state.page === pages;
    $('[data-random]').disabled = !filtered.length;
    $$('[data-layout]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.layout === state.layout)));
    updateShelves();
    writeUrl();
    if (scroll) $('[data-results]').scrollIntoView({block:'start'});
  }
  function buildDetail() {
    const game = activeGame, v = preferred(game);
    const controls = (v.controls?.length ? v.controls : game.controls || []).map(v => typeof v === 'string' ? v : JSON.stringify(v));
    const bytes = buildBytes(v);
    const facts = `<dl class="arcade-detail-facts"><div><dt>Format</dt><dd>${esc(KIND[game.kind] || 'Browser game')}</dd></div>${bytes === null ? '' : `<div><dt>Size</dt><dd>${esc(bytesText(bytes))}</dd></div>`}</dl>`;
    content.innerHTML = `<div class="arcade-detail-grid"><div>${cover(game,true)}<div class="arcade-tags">${[...game.genres,...game.controlKinds].filter(Boolean).map(v=>`<span>${esc(v)}</span>`).join('')}</div></div><div><h2 id="arcade-dialog-title">${esc(game.title)}</h2>${game.description ? `<p class="arcade-detail-description">${esc(game.description)}</p>` : ''}<div class="arcade-detail-actions">${action(game,v)}${favoriteButton(game,true)}<button type="button" class="arcade-share" data-share>Copy link</button></div>${facts}${controls.length ? `<h3>Controls</h3><ul class="arcade-detail-controls">${controls.map(value=>`<li>${esc(value)}</li>`).join('')}</ul>` : ''}</div></div>`;
  }
  function openGame(id, source) {
    const game = games.find(game=>game.id === id);
    if (!game) return;
    trigger = source || document.activeElement;
    activeGame = game;
    buildDetail();
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    writeUrl(game.id);
  }
  function restoreControls() {
    $$('[data-filter-key]').forEach(control => { control.value = state[control.dataset.filterKey]; });
    updateShelves();
  }
  function reset() { Object.assign(state,{q:'',shelf:'all',genre:'',kind:'',control:'',sort:'az',page:1}); restoreControls(); render(); }
  root.addEventListener('click', async event => {
    const button = event.target.closest('button,a');
    if (!button) return;
    if (button.dataset.open) { event.preventDefault(); openGame(button.dataset.open,button); }
    if (button.dataset.favorite) {
      const id = button.dataset.favorite;
      favorites.has(id) ? favorites.delete(id) : favorites.add(id);
      saveStore('qualiacology.arcade.favorites',[...favorites]);
      render();
      if (dialog.open) { buildDetail(); $('[data-favorite]',content)?.focus({preventScroll:true}); }
      else ($(`[data-favorite="${CSS.escape(id)}"]`) || $('[data-search]')).focus({preventScroll:true});
    }
    if (button.dataset.play) {
      recent = [{id:button.dataset.play,at:Date.now()},...recent.filter(v=>v.id!==button.dataset.play)].slice(0,100);
      saveStore('qualiacology.arcade.recent',recent); updateShelves();
    }
    if (button.dataset.shelf) { state.shelf=button.dataset.shelf; state.page=1; if(state.shelf==='recent')state.sort='recent'; restoreControls(); render(); }
    if (button.dataset.layout) { state.layout=button.dataset.layout; saveStore('qualiacology.arcade.layout',state.layout); render(); }
    if (button.hasAttribute('data-page-prev')) { state.page--; render({scroll:true}); }
    if (button.hasAttribute('data-page-next')) { state.page++; render({scroll:true}); }
    if (button.hasAttribute('data-reset')) reset();
    if (button.hasAttribute('data-random') && filtered.length) openGame(filtered[Math.floor(Math.random()*filtered.length)].id,button);
    if (button.hasAttribute('data-dialog-close')) dialog.close();
    if (button.hasAttribute('data-share')) {
      try { await navigator.clipboard.writeText(location.href); button.textContent='Link copied'; }
      catch { button.textContent='Copy the address above'; }
    }
  });
  root.addEventListener('change',event=>{
    if (event.target.matches('[data-filter-key]')) { state[event.target.dataset.filterKey]=event.target.value; state.page=1; render(); }
  });
  let searchTimer;
  $('[data-search]').addEventListener('input',event=>{clearTimeout(searchTimer); const value=event.target.value; searchTimer=setTimeout(()=>{state.q=value; state.page=1; render();},120);});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{writeUrl();(trigger?.isConnected ? trigger : $(`[data-open="${CSS.escape(activeGame?.id || '')}"]`) || $('[data-search]')).focus({preventScroll:true});});
  root.addEventListener('error',event=>{if(event.target.matches('img[data-cover]') && !event.target.dataset.failed){event.target.dataset.failed='true';event.target.src='/assets/arcade/cover-unavailable.svg';event.target.classList.add('arcade-placeholder');event.target.alt='Preview image unavailable';}},true);
  async function init() {
    try {
      const response=await fetch(root.dataset.catalog,{credentials:'same-origin'});
      if(!response.ok) throw new Error(`Catalog ${response.status}`);
      const catalog=await response.json();
      games=catalog.games.filter(game=>launchUrl(preferred(game))).map(game=>({...game,filterGenres:genreGroups(game),search:normalize([game.title,game.description,...game.genres,...game.controls,...game.controlKinds].join(' '))}));
      const retainedIds=new Set(games.map(game=>game.id));
      for(const id of favorites)if(!retainedIds.has(id))favorites.delete(id);
      const seenRecent=new Set();
      recent=recent.filter(item=>{
        if(!retainedIds.has(item.id) || seenRecent.has(item.id))return false;
        seenRecent.add(item.id);
        return true;
      });
      saveStore('qualiacology.arcade.favorites',[...favorites]);
      saveStore('qualiacology.arcade.recent',recent);
      const options=(key,selector)=>{
        const counts=new Map();games.forEach(game=>new Set(game[key]).forEach(value=>counts.set(value,(counts.get(value)||0)+1)));
        const select=$(selector);select.insertAdjacentHTML('beforeend',[...counts].sort(([a],[b])=>a.localeCompare(b)).map(([value,count])=>`<option value="${esc(value)}">${esc(value)} (${count})</option>`).join(''));
      };
      options('filterGenres','[data-filter-key="genre"]');options('controlKinds','[data-filter-key="control"]');
      if(!['all','favorites','recent'].includes(state.shelf))state.shelf='all';
      for(const key of ['genre','kind','control','sort']) { const select=$(`[data-filter-key="${key}"]`); if(![...select.options].some(option=>option.value===state[key]))state[key]=key==='sort'?'az':''; }
      const narrowLayout = matchMedia('(max-width: 720px)');
      if (narrowLayout.matches) $('.arcade-refine').open=false;
      narrowLayout.addEventListener('change', event => {
        if (!event.matches) $('.arcade-refine').open=true;
      });
      restoreControls(); render();
      $('[data-loading]').hidden=true;
      const initialId=params.get('game');if(initialId)openGame(initialId);
    } catch(error) {
      $('[data-loading]').textContent='The arcade could not load. Reload this page or use the game directory below.';
      $('[data-fallback]').hidden=false;
    }
  }
  init();
})();
