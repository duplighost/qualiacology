const GAMES = [
  {id:'mario',title:'Spaghetti Mario',maker:'GPT Pro',detail:'33 courses · Two players',url:'./games/spaghetti-mario/',image:'./art/mario.jpg'},
  {id:'64',title:'Spaghetti 64',maker:'GPT Pro',detail:'The castle, 24 courses & Bowser',url:'./games/spaghetti-64/',image:'./art/64.jpg'},
  {id:'pasta-sunshine',title:'Pasta Sunshine',maker:'GPT Pro',detail:'15 destinations · 31 Shines',url:'./games/pasta-sunshine/',image:'./art/pasta-sunshine.jpg'},
  {id:'sunshine',title:'Spaghetti Sunshine',maker:'Codex',detail:'17 missions · Playable Delfino Plaza',url:'/spaghetti-sunshine/',image:'./art/sunshine.jpg'},
  {id:'spaghetti',title:'SPAGHETTI',maker:'Claude',detail:'Seven levels · Swing, climb, jump',url:'/spaghetti/?select=1',image:'./art/spaghetti.jpg'},
  {id:'al-dente',title:'AL DENTE',maker:'Claude',detail:'Four stages · Climb the lasagna',url:'/al-dente/',image:'./art/al-dente.jpg'}
];
const $=id=>document.getElementById(id), menu=$('collection'),player=$('player'),screen=$('screen');
const key='qualiacology:pasta:collection:v1';let selected=0,frame=null,active=null,generation=0;
function remember(id){try{localStorage.setItem(key,id)}catch{}}
function previous(){try{return localStorage.getItem(key)}catch{return null}}
for(const [i,g] of GAMES.entries()){
  const card=document.createElement('a');card.className='game';card.href='#'+g.id;card.dataset.game=g.id;
  card.innerHTML=`<div class="picture"><img src="${g.image}" alt="" width="1280" height="720"><span class="number" aria-hidden="true">0${i+1}</span></div><div class="game-copy"><span class="maker">${g.maker}</span><h2>${g.title}</h2><p class="detail">${g.detail}</p><span class="play-mark" aria-hidden="true">↗</span></div>`;
  card.addEventListener('focus',()=>selected=i);card.addEventListener('click',e=>{e.preventDefault();if(location.hash==='#'+g.id)open(g);else location.hash=g.id});$('games').append(card);
}
const cards=[...document.querySelectorAll('.game')];
function select(i,focus=true){selected=(i+GAMES.length)%GAMES.length;if(focus)cards[selected].focus({preventScroll:true});cards[selected].scrollIntoView({block:'nearest',behavior:'instant'});}
function showLast(){const g=GAMES.find(g=>g.id===previous());$('last-played').textContent=g?'Last played: '+g.title:'';return g;}
function destroy(){generation++;if(frame){try{frame.contentDocument.exitPointerLock?.();frame.contentWindow.dispatchEvent(new Event('blur'));}catch{}frame.remove();frame=null;}active=null;screen.replaceChildren();}
function back(){try{document.exitPointerLock?.();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});}catch{}if(location.hash)location.hash='';else showMenu();}
function showMenu(){destroy();player.hidden=true;menu.hidden=false;document.title='Pasta | Qualiacology';showLast();select(selected);}
function frameKeys(e){if(e.code==='F8'){e.preventDefault();e.stopImmediatePropagation();back();}}
function open(g){destroy();active=g;selected=GAMES.indexOf(g);remember(g.id);menu.hidden=true;player.hidden=false;$('playing-title').textContent=g.title+' · '+g.maker;document.title=g.title+' · Pasta | Qualiacology';$('loading').hidden=false;
  const ticket=generation;frame=document.createElement('iframe');frame.title=g.title;frame.allow='autoplay; fullscreen; gamepad';frame.allowFullscreen=true;frame.src=g.url;frame.dataset.game=g.id;
  frame.addEventListener('load',()=>{if(ticket!==generation)return;$('loading').hidden=true;try{frame.contentWindow.addEventListener('keydown',frameKeys,true);frame.contentWindow.addEventListener('keyup',e=>{if(e.code==='F8')e.stopImmediatePropagation()},true);frame.contentWindow.focus();}catch{}});
  screen.append(frame);
}
$('back').onclick=back;
$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else player.requestFullscreen().then(()=>frame?.contentWindow.focus()).catch(()=>{});};
document.addEventListener('keydown',e=>{if(e.code==='F8'&&active){frameKeys(e);return;}if(active||e.altKey||e.ctrlKey||e.metaKey)return;const columns=getComputedStyle($('games')).gridTemplateColumns.split(' ').length;const delta={ArrowRight:1,ArrowLeft:-1,ArrowDown:columns,ArrowUp:-columns}[e.code];if(delta){e.preventDefault();select(selected+delta);}else if(e.code==='Enter'&&!cards.includes(document.activeElement)){e.preventDefault();location.hash=GAMES[selected].id;}else if(/^[1-6]$/.test(e.key)){e.preventDefault();location.hash=GAMES[Number(e.key)-1].id;}});
function route(){const g=GAMES.find(g=>g.id===location.hash.slice(1));if(g){if(active?.id!==g.id)open(g);}else showMenu();}
window.addEventListener('hashchange',route);
window.addEventListener('pagehide',destroy);
window.addEventListener('pageshow',e=>{if(e.persisted)route()});
const last=showLast();if(last)selected=GAMES.indexOf(last);route();
