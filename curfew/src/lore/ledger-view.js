import {handwritingStyle} from '../world/lore-handwriting.js';

const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const button=(text,fn,cls='')=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};

export const LEDGER_CSS=`
#curfew-pause .ledger-shell{display:grid;grid-template-columns:190px minmax(180px,270px) minmax(0,1fr);height:min(62vh,650px);min-height:330px;border-top:1px solid #a9916b44}
#curfew-pause .ledger-sections{display:flex;flex-direction:column;gap:4px;overflow:auto;padding:15px 18px 20px 0;border-right:1px solid #a9916b33}
#curfew-pause .ledger-sections button{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 9px;border:0;border-left:2px solid transparent;background:transparent;text-align:left;font-size:11px;line-height:1.6;color:#a4adaf;cursor:pointer}
#curfew-pause .ledger-sections button[aria-pressed=true]{color:#eee0bc;border-left-color:#c3a976;background:#bea97a0a}
#curfew-pause .ledger-sections small{color:#a39270;font:10px ui-monospace,Consolas,monospace}
#curfew-pause .ledger-index{display:flex;flex-direction:column;min-width:0;padding:18px 18px 0;border-right:1px solid #a9916b33}
#curfew-pause .ledger-search{box-sizing:border-box;width:100%;padding:11px 12px;border:1px solid #8a80654d;border-radius:0;background:#111c2477;color:#e9e0ca;font:12px/1.5 inherit}
#curfew-pause .ledger-search:focus{outline:1px solid #c3a976;outline-offset:2px}#curfew-pause .ledger-search::placeholder{color:#889493}
#curfew-pause .ledger-results{overflow:auto;margin-top:15px;padding-right:6px;scrollbar-color:#8a8065 #141b23;scrollbar-width:thin}
#curfew-pause .ledger-entry{display:block;width:100%;text-align:left;padding:14px 5px;border:0;border-bottom:1px solid #8a806529;background:transparent;cursor:pointer;color:#aab5b5;font:13px/1.5 Georgia,serif}
#curfew-pause .ledger-entry[aria-current=true]{color:#efe0bc;background:#b7a7780b}#curfew-pause .ledger-entry:hover{color:#eee0bc}
#curfew-pause .ledger-entry[data-unread=true]:before{content:'·';color:#e1bd80;display:inline-block;width:12px;margin-left:-3px}
#curfew-pause .ledger-reading{overflow:auto;padding:23px clamp(24px,3.8vw,64px) 35px;scrollbar-color:#8a8065 #141b23;scrollbar-width:thin;background:linear-gradient(105deg,#bda26c06,transparent 45%)}
#curfew-pause .ledger-source{font:10px/1.65 ui-monospace,Consolas,monospace;color:#a29477;letter-spacing:.09em}
#curfew-pause .ledger-reading h2{font:400 clamp(23px,2.1vw,32px)/1.25 Georgia,serif;letter-spacing:.01em;color:#ebdfbf;margin:14px 0 25px}
#curfew-pause .ledger-body{max-width:680px;font:17px/1.85 Georgia,serif;color:#d2d3c6;white-space:pre-line;overflow-wrap:anywhere}
#curfew-pause .ledger-body p{margin:0 0 1em}#curfew-pause .ledger-doubt{margin-top:30px;color:#ab9c7a;font:italic 13px/1.7 Georgia,serif}
#curfew-pause .ledger-empty{font:15px/1.8 Georgia,serif;color:#9aa8a8;padding-top:20px}
#curfew-pause .ledger-topline{display:flex;justify-content:space-between;gap:25px;padding:0 0 18px;color:#9ca7a6;font:12px/1.6 Georgia,serif}
#curfew-pause .ledger-count{white-space:nowrap;color:#b7a17c;font:10px/1.6 ui-monospace,Consolas,monospace}
@media(max-width:1100px){#curfew-pause .ledger-shell{grid-template-columns:158px 210px minmax(0,1fr)}#curfew-pause .ledger-reading{padding:23px 25px}#curfew-pause .ledger-body{font-size:16px}}
`;

/** A plain DOM page. Reading never creates a second renderer or pauses twice. */
export class LedgerView {
  constructor(ctx){
    this.ctx=ctx;this.section='';this.selected='county';this.query='';this.revision=-1;
    this.element=el('div','ledger-page');const style=el('style');style.textContent=LEDGER_CSS;this.element.append(style);
    const top=el('div','ledger-topline');top.append(el('span','','Kept by Vera, at The Days We Counted.'));this.count=el('span','ledger-count');top.append(this.count);this.element.append(top);
    const shell=el('div','ledger-shell');this.categories=el('nav','ledger-sections');this.categories.setAttribute('aria-label','Ledger sections');shell.append(this.categories);
    const index=el('div','ledger-index');this.search=el('input','ledger-search');this.search.type='search';this.search.placeholder='Search what you know';this.search.setAttribute('aria-label','Search discovered ledger entries');
    this.search.addEventListener('input',()=>{this.query=this.search.value;this.refresh(true);});
    // Typing map/perk bindings into search must remain ordinary text. Escape still
    // belongs to the game's existing pause/resume handler.
    this.search.addEventListener('keydown',e=>{if(e.code!=='Escape')e.stopPropagation();});
    this.results=el('div','ledger-results');this.results.setAttribute('aria-label','Discovered entries');index.append(this.search,this.results);shell.append(index);
    this.article=el('article','ledger-reading');this.article.tabIndex=0;this.article.setAttribute('aria-label','Ledger entry');shell.append(this.article);this.element.append(shell);
  }
  ledger(){return this.ctx.systems.get('lore-ledger');}
  refresh(force=false){
    const ledger=this.ledger();if(!ledger){this.article.replaceChildren(el('p','ledger-empty','The ledger is being opened.'));return;}
    if(!force&&this.revision===ledger.revision)return;
    const all=ledger.entries(),sections=ledger.sections();this.count.textContent=all.length+' '+(all.length===1?'entry':'entries')+' · '+ledger.unreadCount()+' unread';
    if(this.section&&!sections.some(s=>s.id===this.section))this.section='';
    this.categories.replaceChildren();
    for(const s of [{id:'',title:'All entries',count:all.length},...sections]){
      const b=button('',()=>{this.section=s.id;this.refresh(true);});b.append(el('span','',s.title),el('small','',String(s.count)));b.setAttribute('aria-pressed',String(this.section===s.id));this.categories.append(b);
    }
    const entries=ledger.entries(this.section,this.query);
    if(!entries.some(e=>e.id===this.selected))this.selected=entries[0]?.id||'';
    this.results.replaceChildren();
    if(!entries.length)this.results.append(el('p','ledger-empty','Nothing in these pages matches.'));
    for(const e of entries){const b=button(e.title,()=>{this.selected=e.id;this.refresh(true);this.article.focus({preventScroll:true});},'ledger-entry');b.dataset.entry=e.id;b.dataset.unread=String(!ledger.read.has(e.id));b.setAttribute('aria-current',String(this.selected===e.id));this.results.append(b);}
    const current=ledger.entry(this.selected);this.article.replaceChildren();
    if(current){
      this.article.append(el('div','ledger-source',current.source),el('h2','',(current.circled?'◯  ':'')+current.title));
      const body=el('div','ledger-body');
      // The same visible hand links a site's old writing and an unsigned kindness.
      // Its internal author id is never rendered as a label or an accessibility name.
      if(current.hand){const hand=handwritingStyle(current.hand);body.style.fontFamily=hand.font;body.style.fontStyle=hand.seed%2?'italic':'normal';body.style.letterSpacing=(hand.spacing*.12)+'px';}
      for(const paragraph of current.text.split(/\n\n/))body.append(el('p','',paragraph));this.article.append(body);
      if(current.circled)this.article.append(el('p','ledger-doubt','Vera has circled this one.'));
      ledger.markRead(current.id);const active=this.results.querySelector('[aria-current=true]');if(active)active.dataset.unread='false';
      this.count.textContent=all.length+' '+(all.length===1?'entry':'entries')+' · '+ledger.unreadCount()+' unread';
      this.article.scrollTop=0;
    }else this.article.append(el('p','ledger-empty','The pages you have found are kept here.'));
    this.revision=ledger.revision;
  }
}
