const DEFAULT_SETTINGS = Object.freeze({sensitivity:.002, volume:.75, music:.5, fov:82, quality:'high', shake:.6, difficulty:'standard', subtitles:true, inverted:false});
const BRANCHES = {momentum:'Momentum', vector:'Vector', resonance:'Resonance'};
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
const BRAND = '<svg class="brand-icon" viewBox="0 0 28 32" aria-hidden="true"><path d="M3 25 14 3l11 22M7 17h14M2 30h24"/></svg>';
const LOCK = '<svg class="chapter-lock" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 5V3a3 3 0 0 1 6 0v2M2 5h8v6H2z"/></svg>';
const ICONS = {
  catchdrive:'M4 12a8 8 0 1 1 3 6M4 6v6h6M9 15l3-5 3 5',
  slidevault:'M3 17h7l6-10M12 7h4v4M6 13h5M4 20h16',
  airpull:'M4 18 18 4M11 4h7v7M3 11l4-4M10 18l7-7',
  wake:'M3 8c4-5 6 5 10 0s5-1 8 0M3 14c4-5 6 5 10 0s5-1 8 0M7 20l5-5 5 5',
  breaker:'M12 3l8 3v7l-8 8-8-8V6zM15 5l-5 7h4l-4 7',
  drag:'M3 12h16M8 7l-5 5 5 5M14 6l6 6-6 6',
  pin:'M12 3v18M7 7l5-4 5 4M5 15h14M8 18h8',
  fork:'M12 21V12M12 12 4 4M12 12l8-8M4 10V4h6M14 4h6v6',
  returnfire:'M20 17c0-10-16-10-16 0M4 17v-6M4 17h6M10 3l4 4-4 4',
  pulsecatch:'M8 8a6 6 0 1 0 8 0M5 5a10 10 0 1 0 14 0M12 3v9M9 9l3 3 3-3',
  stormchain:'M13 2 6 13h6l-1 9 7-12h-6zM2 6h3M19 18h3',
  bloodtide:'M12 3s-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12zM9 14h6M12 11v6'
};
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const number = n => Math.max(0, Math.floor(Number(n) || 0)).toLocaleString('en-US');
const time = value => {const seconds=Math.max(0,Math.floor(Number(value)||0));return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;};
const roman = index => ['I','II','III','IV','V','VI','VII'][index] || String(index+1);
const topLine = text => `<div class="menu-topline"><div class="brand-lockup">${BRAND}<span>BREAKWATER</span></div><span class="micro">${text}</span></div>`;
const backButton = (label='Back') => `<button class="back-button" data-action="back"><kbd>Esc</kbd><span>${label}</span></button>`;
const menuButton = (action,label,primary=false,extra='') => `<button class="menu-action${primary?' primary':''}" data-action="${action}"><span class="action-marker" aria-hidden="true">${ARROW}</span><span>${label}</span>${extra}</button>`;

export class UI {
  constructor(callbacks={}) {
    this.callbacks=callbacks;
    this.root=document.querySelector('#ui');
    if (!this.root) throw new Error('BREAKWATER UI requires #ui.');
    this.homeLink=document.querySelector('#site-home');
    this.settings={...DEFAULT_SETTINGS};
    this.activePanel=null;
    this.previousPanel='menu';
    this.lastSave={sector:0,unlockedSector:0,skills:[],skillPoints:0,stats:{}};
    this.sectors=[];
    this.skills=[];
    this.selectedSkill=null;
    this.currentSector=0;
    this.lastState={};
    this.cachedText=new Map();
    this.radioQueue=[];
    this.radioTimer=null;
    this.toastTimers=new Set();
    this.awardTimers=new Set();
    this._destroyed=false;
    this.root.innerHTML=`
      <div id="hud" class="hud hidden" aria-hidden="true">
        <div class="hud-top-left"><p id="hud-district" class="hud-location"></p><p id="hud-sector" class="hud-sector"></p><div class="hud-objective"><i class="objective-diamond"></i><span id="hud-objective"></span></div><p id="hud-distance" class="objective-distance"></p></div>
        <div id="hud-style" class="hud-top-right no-combo"><p id="hud-rank" class="style-rank">C</p><p id="hud-combo" class="combo-label"></p><p id="hud-score" class="score-value"></p><div id="hud-awards" class="hud-awards"></div></div>
        <div id="hud-health" class="hud-bottom-left"><div class="health-values"><span id="hud-health-value" class="health-number">100</span><span id="hud-health-max" class="health-max">/ 100</span><span class="health-label">Integrity</span></div><div class="health-track"><i id="hud-health-fill" class="health-fill"></i></div><div class="hud-level"><span id="hud-level">LV 01</span><span id="hud-xp">0 XP</span></div><div id="hud-xp-track" class="xp-track hidden"><div id="hud-xp-fill" class="xp-fill"></div></div></div>
        <div class="hud-bottom-right"><p class="hud-speed"><span id="hud-speed">0</span><small>KM/H</small></p><div id="hud-skill-prompt" class="hud-skill-prompt"><kbd>Tab</kbd><span id="hud-points">Constellation</span></div></div>
        <div id="reticle" class="reticle"><svg viewBox="0 0 56 56"><circle class="reticle-base" cx="28" cy="28" r="22"/><circle id="reticle-charge" class="reticle-charge" cx="28" cy="28" r="22"/><path class="reticle-spokes" d="M28 15v5M28 36v5M15 28h5M36 28h5"/><circle class="reticle-dot" cx="28" cy="28" r="1.2"/></svg></div><div id="catch-flash" class="catch-flash"></div><p id="lance-status" class="lance-status"></p>
        <div id="lance-hint" class="lance-hint"><span><kbd>LMB</kbd>Hold · throw</span><span><kbd>RMB</kbd>Recall</span><span><kbd>E</kbd>Catch · parry</span></div>
        <div id="boss-hud" class="boss-hud hidden"><p id="boss-name" class="boss-name"></p><p id="boss-phase" class="boss-phase"></p><div class="boss-track"><div id="boss-fill" class="boss-fill"></div></div></div>
        <div id="toasts" class="toasts"></div><div id="radio" class="radio"><span id="radio-speaker" class="radio-speaker">MARA</span><span id="radio-text" class="radio-text"></span></div>
      </div>
      <section id="menu-panel" class="panel title-panel hidden" aria-label="Main menu">${topLine('A game by Alex')}<div class="menu-layout"><div class="eyebrow title-caption">Kinetic lance / First-person action</div><h1 class="wordmark"><span>BREAK</span><span>WATER</span></h1><div class="menu-action-group"><div id="main-actions"></div><div class="menu-secondary"><button class="text-button" data-action="chapters">Chapters</button><button class="text-button" data-action="settings">Settings</button><button class="text-button" data-action="controls">Controls</button><a class="text-button" href="CREDITS.md" target="_blank" rel="noopener">Credits</a></div></div></div><div class="menu-footer"><div class="location-sign"><span id="menu-location-kicker" class="micro">Eastern coast / District I</span><strong id="menu-location">The Eastern Quay</strong></div><div class="menu-device-note">Headphones recommended<br>Keyboard + mouse · Saves automatically</div></div></section>
      <section id="pause-panel" class="panel hidden" role="dialog" aria-modal="true" aria-labelledby="pause-title">${topLine('Signal held')}<div class="pause-layout"><p class="panel-kicker">Paused</p><h2 id="pause-title" class="panel-title">Take a breath.</h2><p id="pause-objective" class="pause-objective"></p><div class="menu-action-group">${menuButton('resume','Return to the coast',true)}${menuButton('skills','Constellation')}${menuButton('restart-confirm','Retry checkpoint')}<div class="menu-secondary"><button class="text-button" data-action="settings">Settings</button><button class="text-button" data-action="controls">Controls</button></div></div></div><div class="pause-sector"><p id="pause-district" class="panel-kicker"></p><h3 id="pause-sector"></h3><p id="pause-progress"></p></div>${backButton('Resume')}</section>
      <section id="chapters-panel" class="panel chapters-panel hidden" role="dialog" aria-modal="true" aria-labelledby="chapters-title">${topLine('Campaign archive')}<div class="panel-body"><div class="panel-heading"><div><p class="panel-kicker">The coast, in sequence</p><h2 id="chapters-title" class="panel-title">Chapters</h2></div><p id="chapters-progress" class="micro"></p></div><div id="chapters-grid" class="chapters-grid"></div><p class="chapter-replay-note">Return to an unlocked sector with your current constellation. Progress is saved on this browser.</p></div>${backButton()}</section>
      <section id="settings-panel" class="panel settings-panel hidden" role="dialog" aria-modal="true" aria-labelledby="settings-title">${topLine('Personal calibration')}<div class="panel-body"><div class="panel-heading"><div><p class="panel-kicker">Make it yours</p><h2 id="settings-title" class="panel-title">Settings</h2></div><span class="micro">Saved automatically</span></div><div id="settings-grid" class="settings-grid"></div><p class="settings-footer">Settings apply immediately. Use the mouse sensitivity and field of view that feel comfortable to you.</p></div>${backButton()}</section>
      <section id="controls-panel" class="panel hidden" role="dialog" aria-modal="true" aria-labelledby="controls-title">${topLine('Lance operator reference')}<div class="panel-body"><div class="panel-heading"><div><p class="panel-kicker">Every move is yours</p><h2 id="controls-title" class="panel-title">Controls</h2></div><span class="micro">Keyboard + mouse</span></div><div class="controls-layout"><div><h3 class="control-heading">Movement</h3><dl class="controls-list">${this._control('Move',['W','A','S','D'])}${this._control('Look',['Mouse'])}${this._control('Jump / swim up',['Space'])}${this._control('Dash',['Shift'])}${this._control('Slide / swim down',['Ctrl','C'])}${this._control('Interact / climb',['E'])}</dl><p class="control-description">Keep moving. Dash through an opening, slide beneath fire, and take raised routes for better angles.</p></div><div><h3 class="control-heading">The lance</h3><dl class="controls-list">${this._control('Hold to charge · release to throw',['LMB'])}${this._control('Recall the lance',['RMB'])}${this._control('Parry / perfect catch',['E'])}${this._control('Constellation',['Tab'])}${this._control('Pause',['Esc'])}</dl><p class="control-description">A throw is half an attack. Move around an enemy, then <strong>recall through its back.</strong> Press <strong>E</strong> when the returning lance reaches you to perfect-catch. Parry an incoming shot at close range.</p></div></div></div>${backButton()}</section>
      <section id="skills-panel" class="panel skills-panel hidden" role="dialog" aria-modal="true" aria-labelledby="skills-title"><div class="skills-header"><p class="panel-kicker">Operator progression</p><h2 id="skills-title" class="panel-title">Constellation</h2><p class="panel-intro">Three disciplines. Twelve ways to change the return.</p></div><div class="skills-points"><span id="skills-point-number" class="skills-point-number">0</span><span class="skills-point-caption">Skill points<br>available</span></div><div id="constellation" class="constellation"></div><div id="skill-detail" class="skill-detail" aria-live="polite"></div><div class="skills-help"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> Explore<span><kbd>Enter</kbd> Select</span></div><button class="close-top" data-action="exit-skills"><span>Return</span><kbd>Tab / Esc</kbd></button></section>
      <section id="debrief-panel" class="panel results-panel hidden" role="dialog" aria-modal="true" aria-labelledby="debrief-title">${topLine('Sector debrief')}<div class="results-layout"><div class="results-copy"><p id="debrief-kicker" class="panel-kicker">Sector clear</p><h2 id="debrief-title" class="panel-title"></h2><p id="debrief-context" class="results-context"></p><div id="debrief-stats" class="results-stats"></div><div class="button-row"><button class="ui-button" data-action="next-sector"><span id="debrief-next">Next sector</span>${ARROW}</button><button class="ui-button secondary" data-action="skills">Constellation</button></div><p id="debrief-note" class="results-note"></p></div><div id="debrief-rank-wrap" class="results-rank"><strong id="debrief-rank"></strong><span>Sector rank</span></div></div></section>
      <section id="death-panel" class="panel results-panel death-panel hidden" role="dialog" aria-modal="true" aria-labelledby="death-title">${topLine('Connection interrupted')}<div class="results-layout"><div class="results-copy"><p class="panel-kicker">Operator down</p><h2 id="death-title" class="panel-title">Signal lost.</h2><p id="death-context" class="results-context">Return to the last checkpoint. Find a new angle, and bring the lance home.</p><div id="death-stats" class="results-stats"></div><div class="button-row"><button class="ui-button" data-action="restart"><span>Retry checkpoint</span>${ARROW}</button><button class="ui-button secondary" data-action="settings">Settings</button></div><p class="results-note">Your unlocked constellation is kept.</p></div></div></section>
      <section id="ending-panel" class="panel results-panel ending-panel hidden" role="dialog" aria-modal="true" aria-labelledby="ending-title">${topLine('BREAKWATER / End of campaign')}<div class="results-layout"><div class="results-copy"><p class="panel-kicker">The coast is yours</p><h2 id="ending-title" class="panel-title">First light.</h2><p id="ending-context" class="results-context"></p><div id="ending-stats" class="results-stats"></div><div class="button-row"><button class="ui-button" data-action="chapters"><span>Return to the coast</span>${ARROW}</button></div><p class="results-note">Campaign complete. Every unlocked sector remains yours to revisit.<br><a href="CREDITS.md" target="_blank" rel="noopener">Credits &amp; asset acknowledgements</a></p></div></div></section>
      <div id="confirm-panel" class="confirm-panel hidden" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><div class="confirm-content"><h2 id="confirm-title"></h2><p id="confirm-description"></p><div class="button-row"><button id="confirm-primary" class="ui-button" data-action="confirm">Continue</button><button class="ui-button secondary" data-action="cancel-confirm">Go back</button></div></div></div>
      <div id="live-announcement" class="live-announcement" role="status" aria-live="polite" aria-atomic="true"></div>`;
    this.elements={};
    this.root.querySelectorAll('[id]').forEach(el=>{this.elements[el.id]=el;});
    this._clickHandler=e=>this._click(e);
    this._inputHandler=e=>this._settingChanged(e);
    this._keyHandler=e=>this._key(e);
    this._pointerLockHandler=()=>this._syncHomeLink();
    this.root.addEventListener('click',this._clickHandler);
    this.root.addEventListener('input',this._inputHandler);
    this.root.addEventListener('change',this._inputHandler);
    document.addEventListener('keydown',this._keyHandler,true);
    document.addEventListener('pointerlockchange',this._pointerLockHandler);
  }

  _control(label,keys) {return `<div class="control-line"><dt>${label}</dt><dd>${keys.map(key=>`<kbd>${key}</kbd>`).join('')}</dd></div>`;}
  _el(id) {return this.elements[id];}
  _text(id,value) {const text=String(value??'');if(this.cachedText.get(id)!==text){this._el(id).textContent=text;this.cachedText.set(id,text);}}
  _announce(text) {this._text('live-announcement',text);}
  _syncHomeLink() {
    if(!this.homeLink)return;
    const visible=['menu','pause'].includes(this.activePanel)&&!document.pointerLockElement;
    this.homeLink.hidden=!visible;
    if(visible){
      const panel=this._el(`${this.activePanel}-panel`);
      if(panel&&this.homeLink.parentElement!==panel)panel.append(this.homeLink);
    }
  }
  _focusFirst(panel) {
    requestAnimationFrame(()=>{
      if(this.activePanel!==panel)return;
      const target=this._el(`${panel}-panel`)?.querySelector('[autofocus],button:not([disabled]),input,select,a');
      target?.focus({preventScroll:true});
    });
  }
  _open(panel,{focus=true}={}) {
    for(const element of this.root.querySelectorAll('.panel'))element.classList.add('hidden');
    this._el('hud').classList.add('hidden');
    this._el('hud').setAttribute('aria-hidden','true');
    this._el(`${panel}-panel`).classList.remove('hidden');
    this.activePanel=panel;
    this._syncHomeLink();
    if(focus)this._focusFirst(panel);
  }
  hidePanels() {
    for(const element of this.root.querySelectorAll('.panel,.confirm-panel'))element.classList.add('hidden');
    this.activePanel=null;
    this._syncHomeLink();
    this.confirmAction=null;
    this._el('hud').classList.remove('hidden');
    this._el('hud').setAttribute('aria-hidden','false');
    if(document.activeElement instanceof HTMLElement && this.root.contains(document.activeElement))document.activeElement.blur();
  }
  showLoading(text='Preparing the coast') {
    const loading=document.querySelector('#loading');
    if(loading){loading.hidden=false;loading.style.display='';}
    const status=document.querySelector('#load-status');
    if(status)status.textContent=text;
  }
  showMenu(save=this.lastSave,sectors=this.sectors) {
    this.lastSave=save||this.lastSave;
    this.sectors=sectors||this.sectors;
    this.settings={...DEFAULT_SETTINGS,...this.settings,...this.lastSave.settings};
    this.currentSector=clamp(this.lastSave.sector,0,Math.max(0,this.sectors.length-1));
    const sector=this.sectors[this.currentSector];
    const stats=this.lastSave.stats||{};
    const hasSave=this.currentSector>0||!!this.lastSave.completed||Number(this.lastSave.xp)>0||Number(stats.kills)>0||Number(stats.activeSeconds)>0||Number(stats.playtime)>0||Number(stats.time)>0||Number(this.lastSave.checkpoint)>0;
    this._el('main-actions').innerHTML=hasSave?`${menuButton('continue','Continue',true,`<small>${String(this.currentSector+1).padStart(2,'0')}</small>`)}${menuButton('new-confirm','New game')}`:menuButton('new','New game',true);
    this._text('menu-location',sector?.name||'The Eastern Quay');
    this._text('menu-location-kicker',sector?`Sector ${String(this.currentSector+1).padStart(2,'0')} / District ${roman(sector.district||0)}`:'Eastern coast / District I');
    this._open('menu');
  }
  showPause(state={}) {
    this.lastState={...this.lastState,...state};
    if(state.save)this.lastSave=state.save;
    if(state.settings)this.settings={...this.settings,...state.settings};
    this._text('pause-objective',state.objective||this.lastState.objective||'');
    this._text('pause-sector',state.sectorName||this.lastState.sectorName||'');
    this._text('pause-district',state.districtName||this.lastState.districtName||'');
    const beat=Number(state.arenaIndex)+1;
    this._text('pause-progress',Number.isFinite(beat)&&state.arenaCount?`Encounter ${Math.min(beat,state.arenaCount)} / ${state.arenaCount}  ·  ${time(state.elapsed)}`:time(state.elapsed));
    this._open('pause');
  }
  showSettings(settings) {
    if(settings)this.settings={...this.settings,...settings};
    if(this.activePanel!=='settings')this.previousPanel=this.activePanel||'pause';
    const slider=(key,label,min,max,step,help='')=>`<label class="setting-row"><span class="setting-label">${label}</span><output id="setting-${key}-output" class="setting-output">${this._formatSetting(key,this.settings[key])}</output><input type="range" data-setting="${key}" aria-label="${label}" min="${min}" max="${max}" step="${step}" value="${this.settings[key]}">${help?`<span class="setting-help">${help}</span>`:''}</label>`;
    const select=(key,label,options,help='')=>`<label class="setting-row"><span class="setting-label">${label}</span><select data-setting="${key}" aria-label="${label}">${options.map(([value,text])=>`<option value="${value}"${this.settings[key]===value?' selected':''}>${text}</option>`).join('')}</select>${help?`<span class="setting-help">${help}</span>`:''}</label>`;
    const toggle=(key,label)=>`<label class="setting-row"><span class="setting-label">${label}</span><input type="checkbox" data-setting="${key}"${this.settings[key]?' checked':''}></label>`;
    this._el('settings-grid').innerHTML=`<div><section class="settings-section"><h3>Handling</h3>${slider('sensitivity','Mouse sensitivity',.0008,.005,.0001)}${slider('fov','Field of view',65,105,1)}${slider('shake','Camera shake',0,1,.05)}${toggle('inverted','Invert vertical look')}</section><section class="settings-section"><h3>Challenge</h3>${select('difficulty','Difficulty',[['story','Assist'],['standard','Standard'],['relentless','Relentless']],'Assist lowers incoming damage and increases lance damage. Relentless raises the stakes. Change at any time.')}</section></div><div><section class="settings-section"><h3>Sound</h3>${slider('volume','Master volume',0,1,.05)}${slider('music','Music volume',0,1,.05)}${toggle('subtitles','Radio subtitles')}</section><section class="settings-section"><h3>Display</h3>${select('quality','Graphics quality',[['low','Performance'],['medium','Balanced'],['high','High']],'Performance lowers render resolution and shadow detail. Choose a smooth response over extra pixels.')}</section></div>`;
    this._open('settings');
  }
  showControls() {if(this.activePanel!=='controls')this.previousPanel=this.activePanel||'pause';this._open('controls');}
  showChapters() {
    if(this.activePanel!=='chapters')this.previousPanel=this.activePanel||'menu';
    const unlocked=clamp(this.lastSave.unlockedSector??this.lastSave.sector,0,Math.max(0,this.sectors.length-1));
    const completed=this.lastSave.completed;
    const isComplete=sector=>completed===true||(this.lastSave.stats?.sectors||[]).some(entry=>entry.sector===sector.index)||(Array.isArray(completed)?completed.includes(sector.index)||completed.includes(sector.id):completed instanceof Set?completed.has(sector.index)||completed.has(sector.id):typeof completed==='object'&&completed?!!completed[sector.index]||!!completed[sector.id]:typeof completed==='number'?sector.index<completed:false);
    const groups=new Map();
    this.sectors.forEach((sector,index)=>{const group=index===this.sectors.length-1&&this.sectors.length>24?6:sector.district||0;if(!groups.has(group))groups.set(group,[]);groups.get(group).push({...sector,index:sector.index??index});});
    this._el('chapters-grid').innerHTML=[...groups].map(([district,sectors])=>`<section class="chapter-group${district===6?' final-chapter':''}"><h3><span>${String(district+1).padStart(2,'0')}</span>${escapeHTML(district===6?'First light':sectors[0].districtName||`District ${roman(district)}`)}</h3>${sectors.map(sector=>{const locked=sector.index>unlocked;return `<button class="chapter-option${sector.index===this.currentSector?' current':''}" data-action="select-sector" data-index="${sector.index}"${locked?' disabled':''} aria-label="Sector ${sector.index+1}: ${escapeHTML(sector.name)}${locked?', locked':isComplete(sector)?', completed':''}"><span class="chapter-number">${String(sector.index+1).padStart(2,'0')}</span><span>${escapeHTML(sector.name)}</span><span class="chapter-state">${locked?LOCK:isComplete(sector)?'✓':sector.index===this.currentSector?'↗':''}</span></button>`;}).join('')}</section>`).join('');
    this._text('chapters-progress',`${Math.min(unlocked+1,this.sectors.length)} / ${this.sectors.length} sectors unlocked`);
    this._open('chapters');
  }
  showSkills(save,skills) {
    if(save){this.lastSave=save;this.settings={...this.settings,...save.settings};}
    if(skills)this.skills=skills;
    if(this.activePanel!=='skills')this.skillsReturnPanel=this.activePanel;
    const owned=new Set(this.lastSave.skills||[]);
    const available=skill=>(skill.requires||[]).every(id=>owned.has(id));
    const lookup=new Map(this.skills.map(skill=>[skill.id,skill]));
    let lines='';
    for(const skill of this.skills){
      for(const req of (skill.requires?.length?skill.requires:[null])){
        const from=req?lookup.get(req):{x:50,y:48};
        if(!from)continue;
        lines+=`<path class="skill-line${owned.has(skill.id)?' owned':available(skill)?' available':''}" d="M${from.x} ${from.y}L${skill.x} ${skill.y}"/>`;
      }
    }
    this._el('constellation').innerHTML=`<svg class="constellation-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse class="orbit-solid" cx="50" cy="48" rx="43" ry="43"/><ellipse class="orbit" cx="50" cy="48" rx="33" ry="33"/><ellipse class="orbit-solid" cx="50" cy="48" rx="18" ry="18"/><path class="orbit" d="M7 48h86M50 5v86"/>${lines}</svg><span class="branch-label momentum">01 / Momentum</span><span class="branch-label vector">02 / Vector</span><span class="branch-label resonance">03 / Resonance</span><div class="constellation-origin" style="top:48%" aria-hidden="true"></div>${this.skills.map(skill=>`<button class="skill-node${owned.has(skill.id)?' owned':available(skill)?' available':''}" data-action="select-skill" data-skill="${escapeHTML(skill.id)}" style="left:${clamp(skill.x,0,100)}%;top:${clamp(skill.y,0,100)}%" aria-label="${escapeHTML(skill.name)}, ${owned.has(skill.id)?'unlocked':available(skill)?'available':'locked'}" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[skill.id]||'M12 3 21 12 12 21 3 12z'}"/></svg><span class="skill-node-label">${escapeHTML(skill.name)}</span></button>`).join('')}`;
    this._text('skills-point-number',number(this.lastSave.skillPoints));
    if(!lookup.has(this.selectedSkill))this.selectedSkill=this.skills.find(skill=>!owned.has(skill.id)&&available(skill))?.id||this.skills[0]?.id;
    this._selectSkill(this.selectedSkill);
    this._open('skills',{focus:false});
    requestAnimationFrame(()=>{if(this.activePanel==='skills')this.root.querySelector(`[data-skill="${CSS.escape(this.selectedSkill||'')}"]`)?.focus({preventScroll:true});});
  }
  _selectSkill(id) {
    const skill=this.skills.find(item=>item.id===id);
    if(!skill)return;
    this.selectedSkill=id;
    const owned=new Set(this.lastSave.skills||[]);
    const isOwned=owned.has(id);
    const missing=(skill.requires||[]).filter(req=>!owned.has(req));
    const canBuy=!isOwned&&!missing.length&&(this.lastSave.skillPoints||0)>=skill.cost;
    for(const node of this.root.querySelectorAll('.skill-node')){const selected=node.dataset.skill===id;node.classList.toggle('selected',selected);node.setAttribute('aria-pressed',String(selected));}
    let status=isOwned?'Integrated. This skill is active.':missing.length?`Requires ${missing.map(req=>this.skills.find(s=>s.id===req)?.name||req).join(' and ')}.`:canBuy?`${skill.cost} skill point · Permanent upgrade`:'Earn a level to gain another skill point.';
    this._el('skill-detail').innerHTML=`<p class="skill-detail-branch">${escapeHTML(BRANCHES[skill.branch]||skill.branch)}</p><h3>${escapeHTML(skill.name)}</h3><p class="skill-detail-description">${escapeHTML(skill.description)}</p><p class="skill-detail-status">${escapeHTML(status)}</p><button class="ui-button" data-action="buy-skill" data-id="${escapeHTML(id)}"${canBuy?'':' disabled'}><span>${isOwned?'Unlocked':missing.length?'Prerequisite locked':canBuy?`Unlock · ${skill.cost} point`:'No points available'}</span>${isOwned?'<span aria-hidden="true">✓</span>':ARROW}</button>`;
  }
  async _buySkill(id) {
    if(this.buyingSkill)return;
    const skill=this.skills.find(s=>s.id===id);
    if(!skill||(this.lastSave.skills||[]).includes(id)||(this.lastSave.skillPoints||0)<skill.cost||!(skill.requires||[]).every(req=>(this.lastSave.skills||[]).includes(req)))return;
    this.buyingSkill=true;
    try{
      const result=await this.callbacks.onBuySkill?.(id);
      if(result&&typeof result==='object'&&Array.isArray(result.skills))this.lastSave=result;
      // The callback owns the save. Never award a skill speculatively.
      if(this.activePanel==='skills'){
        this.showSkills(this.lastSave,this.skills);
        if((this.lastSave.skills||[]).includes(id)){
          const node=this.root.querySelector(`[data-skill="${CSS.escape(id)}"]`);
          const flash=document.createElement('span');flash.className='skill-flourish';node?.append(flash);setTimeout(()=>flash.remove(),650);
          this._announce(`${skill.name} unlocked. ${this.lastSave.skillPoints} skill points remaining.`);
        }
      }
    }catch(error){this._announce('The skill could not be unlocked. Please try again.');console.error('Skill unlock failed',error);}
    finally{this.buyingSkill=false;}
  }
  showDebrief(data={}) {
    this.debrief=data;
    if(data.save)this.lastSave=data.save;
    const index=Number(data.sector?.index??data.sector??this.currentSector)||0;
    const sector=this.sectors[index];
    this.currentSector=index;
    this.nextSector=Number(data.nextSector??index+1);
    this._text('debrief-kicker',`Sector ${String(index+1).padStart(2,'0')} / Clear`);
    this._text('debrief-title',data.sectorName||data.name||sector?.name||'Sector clear.');
    this._text('debrief-context',data.completion||sector?.completion||'The route ahead is open.');
    this._el('debrief-stats').innerHTML=this._stats([{value:number(data.score),label:'Score'},{value:time(data.elapsed),label:'Time'},{value:number(data.kills),label:'Machines down'},{value:`+${number(data.xp)}`,label:'Experience'}]);
    this._text('debrief-rank',data.rank||'');
    this._el('debrief-rank-wrap').classList.toggle('hidden',!data.rank);
    this._text('debrief-next',data.final?'First light':`Next · ${this.sectors[this.nextSector]?.name||'Continue'}`);
    this._text('debrief-note',data.secret?'Signal cache recovered. Progress saved.':'Progress saved. Constellation upgrades carry into the next sector.');
    this._open('debrief');
  }
  showDeath(state={}) {
    this.lastState={...this.lastState,...state};
    if(state.save)this.lastSave=state.save;
    this._el('death-stats').innerHTML=this._stats([{value:state.sectorName||this.lastState.sectorName||'BREAKWATER',label:'Last signal'},{value:time(state.elapsed),label:'Time'},{value:number(state.score),label:'Score'}]);
    this._text('death-context',state.hint||'Return to the last checkpoint. Find a new angle, and bring the lance home.');
    this._open('death');
  }
  showEnding(data={}) {
    if(data.save)this.lastSave=data.save;
    this._text('ending-context',data.completion||data.message||'The heart is quiet. Every district is open. The first light reaches the water.');
    this._el('ending-stats').innerHTML=this._stats([{value:number(data.score??this.lastSave.stats?.score),label:'Total score'},{value:time(data.elapsed??this.lastSave.stats?.playtime),label:'Time on the coast'},{value:number(data.kills??this.lastSave.stats?.kills),label:'Machines down'}]);
    this._open('ending');
  }
  _stats(items) {return items.map(item=>`<div class="result-stat"><strong>${escapeHTML(item.value)}</strong><span>${escapeHTML(item.label)}</span></div>`).join('');}
  toast(text,kind='info') {
    if(!text||this._destroyed)return;
    const container=this._el('toasts');
    const element=document.createElement('div');
    element.className=`toast ${['info','skill','secret','level','combat','perfect'].includes(kind)?kind:'info'}`;
    element.textContent=text;
    container.append(element);
    while(container.childElementCount>3)container.firstElementChild.remove();
    const delay=Math.min(5500,Math.max(1700,String(text).length*42));
    const timer=setTimeout(()=>{element.classList.add('out');const exit=setTimeout(()=>{element.remove();this.toastTimers.delete(exit);},280);this.toastTimers.add(exit);this.toastTimers.delete(timer);},delay);
    this.toastTimers.add(timer);
    if(kind!=='combat'&&kind!=='perfect')this._announce(text);
  }
  award({points=0,xp=0,returning=false,boss=false}={}) {
    if(this._destroyed)return;
    const score=Math.max(0,Math.floor(Number(points)||0));
    const experience=Math.max(0,Math.floor(Number(xp)||0));
    if(!score&&!experience)return;
    const container=this._el('hud-awards');
    const entry=document.createElement('div');
    entry.className=`score-award${returning?' return-award':''}${boss?' boss-award':''}`;
    entry.innerHTML=`${returning||boss?`<span class="award-kind">${boss?'BOSS':'RETURN'}</span>`:''}<span class="award-points">${score?`+${number(score)}`:''}</span>${experience?`<span class="award-xp">+${number(experience)} XP</span>`:''}`;
    container.append(entry);
    while(container.childElementCount>3)container.firstElementChild.remove();
    const timer=setTimeout(()=>{
      entry.classList.add('out');
      const exit=setTimeout(()=>{entry.remove();this.awardTimers.delete(exit);},230);
      this.awardTimers.add(exit);this.awardTimers.delete(timer);
    },boss?2600:1800);
    this.awardTimers.add(timer);
  }
  radio(text,speaker='MARA') {
    if(!text||this._destroyed||!this.settings.subtitles)return;
    if(this.radioQueue.length>3)this.radioQueue.shift();
    this.radioQueue.push({text,speaker});
    if(!this.radioTimer)this._nextRadio();
  }
  _nextRadio() {
    if(this._destroyed)return;
    const item=this.radioQueue.shift();
    if(!item){this.radioTimer=null;this._el('radio').classList.remove('visible');return;}
    this._text('radio-text',item.text);
    this._text('radio-speaker',item.speaker);
    this._el('radio').classList.add('visible');
    this._announce(`${item.speaker}: ${item.text}`);
    this.radioTimer=setTimeout(()=>{this._el('radio').classList.remove('visible');this.radioTimer=setTimeout(()=>this._nextRadio(),250);},Math.min(14000,Math.max(4000,String(item.text).length*57)));
  }
  update(state={}) {
    this.lastState=state;
    const health=clamp(state.health,0,state.maxHealth||100);
    const maxHealth=state.maxHealth||100;
    this._text('hud-health-value',Math.ceil(health));
    this._text('hud-health-max',`/ ${maxHealth}`);
    this._el('hud-health-fill').style.transform=`scaleX(${health/maxHealth})`;
    this._el('hud-health').classList.toggle('health-critical',health/maxHealth<=.25);
    this._text('hud-district',state.districtName||'');
    this._text('hud-sector',state.sectorName||'');
    this._text('hud-objective',state.objective||'');
    this._text('hud-distance',Number.isFinite(state.objectiveDistance)&&state.objectiveDistance>2?`${Math.ceil(state.objectiveDistance)} m`:'');
    this._text('hud-rank',state.rank||'C');
    const combo=Number(state.combo)||0;
    this._el('hud-style').classList.toggle('no-combo',combo<2);
    this._text('hud-combo',`${Math.floor(combo)} × FLOW`);
    this._text('hud-score',state.score?number(state.score):'');
    this._text('hud-level',`LV ${String(state.level||1).padStart(2,'0')}`);
    this._text('hud-xp',`${number(state.xp)} XP`);
    const hasXP=Number.isFinite(state.xpProgress);
    this._el('hud-xp-track').classList.toggle('hidden',!hasXP);
    if(hasXP)this._el('hud-xp-fill').style.width=`${clamp(state.xpProgress,0,1)*100}%`;
    this._text('hud-speed',Math.round(Math.max(0,Number(state.speed)||0)*3.6));
    this._text('hud-points',state.skillPoints?`${state.skillPoints} skill point${state.skillPoints===1?'':'s'}`:'Constellation');
    this._el('hud-skill-prompt').classList.toggle('has-points',state.skillPoints>0);
    const charge=clamp(state.charge,0,1);
    this._el('reticle-charge').style.strokeDashoffset=String(138.23*(1-charge));
    const returning=state.lanceState==='returning';
    const perfect=!!state.perfectWindow;
    this._el('reticle').classList.toggle('returning',returning);
    this._el('reticle').classList.toggle('perfect',perfect);
    const text=perfect?'E · CATCH':returning?'RETURNING':charge>=.98?'CHARGED':charge>.05?'CHARGING':['out','outbound','thrown','embedded','flying','lodged'].includes(state.lanceState)?'RMB · RECALL':'';
    this._text('lance-status',text);
    this._el('lance-status').style.color=perfect?'var(--amber)':'var(--cyan)';
    this._el('catch-flash').style.opacity=String(clamp(state.catchFlash,0,1));
    this._el('lance-hint').classList.toggle('hidden',(state.elapsed||0)>32||(state.kills||0)>3);
    const boss=state.boss;
    this._el('boss-hud').classList.toggle('hidden',!boss||boss.health<=0);
    if(boss){this._text('boss-name',boss.name||'');this._text('boss-phase',Number.isFinite(boss.phase)?`Phase ${boss.phase}`:boss.phase||'');this._el('boss-fill').style.width=`${clamp(boss.health/(boss.maxHealth||1),0,1)*100}%`;}
  }
  _formatSetting(key,value) {
    if(key==='sensitivity')return `${(Number(value)/.002).toFixed(2)}×`;
    if(key==='fov')return `${value}°`;
    return `${Math.round(Number(value)*100)}%`;
  }
  _settingChanged(event) {
    const input=event.target.closest('[data-setting]');
    if(!input)return;
    // Range input fires both input and change; equal values are deliberately ignored.
    const key=input.dataset.setting;
    const value=input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value):input.value;
    if(this.settings[key]===value)return;
    this.settings[key]=value;
    const output=this.root.querySelector(`#setting-${CSS.escape(key)}-output`);
    if(output)output.textContent=this._formatSetting(key,value);
    if(key==='subtitles'&&!value){clearTimeout(this.radioTimer);this.radioTimer=null;this.radioQueue.length=0;this._el('radio').classList.remove('visible');}
    this.callbacks.onSettings?.({[key]:value});
  }
  _back() {
    if(this.activePanel==='pause'){this.callbacks.onResume?.();return;}
    if(this.activePanel==='skills'){this.callbacks.onExitSkills?.();return;}
    const previous=this.previousPanel||'menu';
    if(previous==='settings'||previous==='controls'||previous==='chapters')this._open('menu');
    else this._open(previous);
  }
  _confirm(title,description,label,action) {
    this._text('confirm-title',title);this._text('confirm-description',description);this._text('confirm-primary',label);
    this.confirmAction=action;
    this._el('confirm-panel').classList.remove('hidden');
    this.confirmReturnFocus=document.activeElement;
    requestAnimationFrame(()=>this._el('confirm-panel').querySelector('[data-action="cancel-confirm"]')?.focus());
  }
  _cancelConfirm() {this._el('confirm-panel').classList.add('hidden');this.confirmAction=null;this.confirmReturnFocus?.focus({preventScroll:true});}
  _click(event) {
    const button=event.target.closest('[data-action]');
    if(!button||button.disabled)return;
    const action=button.dataset.action;
    switch(action){
      case 'new':this.callbacks.onStart?.('new');break;
      case 'continue':this.callbacks.onStart?.('continue');break;
      case 'new-confirm':this._confirm('Start a new run?','Your current campaign progress and constellation will be replaced. Your settings are kept.','New game',()=>this.callbacks.onStart?.('new'));break;
      case 'resume':this.callbacks.onResume?.();break;
      case 'restart':this.callbacks.onRestart?.();break;
      case 'restart-confirm':this._confirm('Retry the checkpoint?','Return to the last saved checkpoint. Your unlocked constellation is kept.','Retry checkpoint',()=>this.callbacks.onRestart?.());break;
      case 'settings':this.showSettings();break;
      case 'controls':this.showControls();break;
      case 'chapters':this.showChapters();break;
      case 'select-sector':this.callbacks.onSelectSector?.(Number(button.dataset.index));break;
      case 'next-sector':this.callbacks.onSelectSector?.(this.nextSector);break;
      case 'skills':if(this.callbacks.onOpenSkills)this.callbacks.onOpenSkills();else this.showSkills(this.lastSave,this.skills);break;
      case 'select-skill':this._selectSkill(button.dataset.skill);if(event.detail===0)this._el('skill-detail').querySelector('button:not([disabled])')?.focus({preventScroll:true});break;
      case 'buy-skill':this._buySkill(button.dataset.id);break;
      case 'exit-skills':this.callbacks.onExitSkills?.();break;
      case 'back':this._back();break;
      case 'confirm':{const run=this.confirmAction;this._el('confirm-panel').classList.add('hidden');this.confirmAction=null;run?.();break;}
      case 'cancel-confirm':this._cancelConfirm();break;
    }
  }
  _key(event) {
    if(this._destroyed||!this.activePanel)return;
    const confirming=!this._el('confirm-panel').classList.contains('hidden');
    const panel=confirming?this._el('confirm-panel'):this._el(`${this.activePanel}-panel`);
    if(event.key==='Escape'&&(confirming||['settings','controls','chapters'].includes(this.activePanel))){event.preventDefault();event.stopImmediatePropagation();if(confirming)this._cancelConfirm();else this._back();return;}
    if(!confirming&&this.activePanel==='skills'&&(event.key==='Escape'||event.key==='Tab')){event.preventDefault();event.stopImmediatePropagation();this.callbacks.onExitSkills?.();return;}
    if(!confirming&&this.activePanel==='pause'&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();this.callbacks.onResume?.();return;}
    if(event.key==='Tab'){
      const focusable=[...panel.querySelectorAll('button:not([disabled]),a[href],input,select,[tabindex="0"]')].filter(el=>el.offsetWidth||el.offsetHeight||el.getClientRects().length);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))){event.preventDefault();first.focus();}
    }
    if(this.activePanel==='skills'&&!confirming&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){
      if(!document.activeElement?.classList.contains('skill-node'))return;
      event.preventDefault();event.stopPropagation();
      const from=this.skills.find(skill=>skill.id===this.selectedSkill);
      if(!from)return;
      const direction={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[event.key];
      const options=this.skills.filter(skill=>skill.id!==from.id).map(skill=>{const dx=skill.x-from.x,dy=skill.y-from.y,dot=dx*direction[0]+dy*direction[1];return {skill,dot,score:Math.hypot(dx,dy)+(Math.abs(dx*direction[1]-dy*direction[0])*1.1)};}).filter(option=>option.dot>0).sort((a,b)=>a.score-b.score);
      if(options.length){this._selectSkill(options[0].skill.id);this.root.querySelector(`[data-skill="${CSS.escape(options[0].skill.id)}"]`)?.focus({preventScroll:true});}
      return;
    }
    if(['menu','pause'].includes(this.activePanel)&&!confirming&&['ArrowUp','ArrowDown','Home','End'].includes(event.key)){
      if(document.activeElement?.matches('input,select'))return;
      const buttons=[...panel.querySelectorAll('button:not([disabled])')];
      if(!buttons.length)return;
      event.preventDefault();
      const current=buttons.indexOf(document.activeElement);
      const index=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowDown'?(current+1)%buttons.length:(current-1+buttons.length)%buttons.length;
      buttons[index]?.focus({preventScroll:true});
    }
  }
  dispose() {
    this._destroyed=true;
    this.root.removeEventListener('click',this._clickHandler);
    this.root.removeEventListener('input',this._inputHandler);
    this.root.removeEventListener('change',this._inputHandler);
    document.removeEventListener('keydown',this._keyHandler,true);
    document.removeEventListener('pointerlockchange',this._pointerLockHandler);
    clearTimeout(this.radioTimer);
    for(const timer of this.toastTimers)clearTimeout(timer);
    for(const timer of this.awardTimers)clearTimeout(timer);
    this.radioQueue.length=0;
  }
}
