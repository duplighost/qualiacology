// The keeper's stock stays visible while looking at them. E still fits the selected
// part in the world; this never pauses, captures the pointer, or opens a tutorial.
export class WorkshopCard{
  constructor(){
    this.root=document.createElement('aside');this.root.id='car-workshop';this.root.hidden=true;
    this.root.innerHTML=`<style>
#car-workshop{position:fixed;right:28px;top:26%;width:328px;padding:18px 20px;background:linear-gradient(130deg,#0b1719ed,#101719e8);color:#cfddd6;border:1px solid #77928150;border-top:2px solid #c2b183;box-shadow:0 14px 60px #0008;font:12px/1.4 ui-monospace,Consolas,monospace;pointer-events:none;z-index:28}
#car-workshop[hidden]{display:none}#car-workshop header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:11px;font-size:13px;letter-spacing:.10em}#car-workshop .wallet{color:#e4c78c;font-size:12px;letter-spacing:0}#car-workshop .row{display:flex;justify-content:space-between;gap:12px;padding:7px 10px;border-left:2px solid transparent;color:#81948e}#car-workshop .row.selected{color:#edf5ed;background:#93b2a21a;border-color:#bfcf9c}#car-workshop .row.poor .price{color:#bd8979}#car-workshop .detail{margin-top:12px;padding:10px 0;border-top:1px solid #889f9036;min-height:34px;color:#d2c6a4}#car-workshop footer{color:#afc0b6;font-size:10px}#car-workshop .fitted{margin-top:9px;font-size:9px;letter-spacing:.04em;color:#849a90}
</style><header><span>CAR WORKSHOP</span><span class="wallet"></span></header><div class="stock"></div><div class="detail"></div><footer>T · NEXT PART &nbsp; HOLD E · FIT</footer><div class="fitted"></div>`;
    document.body.appendChild(this.root);this.wallet=this.root.querySelector('.wallet');this.stock=this.root.querySelector('.stock');this.detail=this.root.querySelector('.detail');this.fitted=this.root.querySelector('.fitted');this.key='';
  }
  show(offers,index,cash,owned){
    this.root.hidden=false;const key=offers.map(o=>o.id||o.kind).join('|')+':'+index+':'+cash+':'+owned.join('|');if(key===this.key)return;this.key=key;
    this.wallet.textContent=cash+' COINS';this.stock.replaceChildren();
    offers.forEach((o,i)=>{const row=document.createElement('div');row.className='row'+(i===index?' selected':'')+(cash<o.price?' poor':'');const name=document.createElement('span'),price=document.createElement('span');name.textContent=o.name;price.className='price';price.textContent=o.price;row.append(name,price);this.stock.appendChild(row);});
    const current=offers[index];this.detail.textContent=current?current.line+(cash<current.price?' · '+(current.price-cash)+' MORE COINS':''):'Everything fitted. Ready for the road.';
    this.fitted.textContent=owned.length?'FITTED · '+owned.join(' · '):'UPGRADES STAY WITH YOUR CAR';
  }
  hide(){this.root.hidden=true;}
  dispose(){this.root.remove();}
}
