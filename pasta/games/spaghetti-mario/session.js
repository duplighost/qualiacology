import { Game } from './engine.js';

const LEVELS=['1-1','1-2','1-3','1-4','2-1','2-2','2-3','2-4','3-1','3-2','3-3','3-4','4-1','4-2','4-3','4-4','5-1','5-2','5-3','5-4','6-1','6-2','6-3','6-4','7-1','7-2','7-3','7-4','8-1','8-2','8-3','8-4','q1-1'];
const INTERSTITIAL_SECONDS=1.7;

// Each player owns a complete Game, so checkpoints, power, coins and progress
// stay separate. Session changes are processed after the engine update returns.
export class GameSession {
  constructor({onEvent}={}) {
    this.onEvent=typeof onEvent==='function'?onEvent:()=>{};
    this.activePlayer=0;
    this.playerCount=1;
    this.screen='title';
    this.titleChoice=0;
    this.selection=0;
    this.topScore=0;
    this.revision=0;
    this.interstitialTime=0;
    this.interstitialRemaining=0;
    this.returnScreen='title';
    this._selectionReturn=null;
    this._events=[];
    this._processingEvents=false;
    this.games=[this._makeGame(0,'1-1')];
  }

  get game(){return this.games[this.activePlayer];}
  get playerName(){return this.activePlayer===1?'LUIGI':'MARIO';}
  get actorIndex(){return this.activePlayer===1?10:0;}

  _makeGame(index,level) {
    return new Game({startLevel:level,onEvent:event=>{
      this._events.push({index,event});
      this.onEvent(event);
    }});
  }

  _recordScores() {
    for(const game of this.games)this.topScore=Math.max(this.topScore,Number(game.score)||0);
  }

  _interstitial() {
    this.screen='interstitial';
    this.interstitialTime=0;
    this.interstitialRemaining=INTERSTITIAL_SECONDS;
    this.revision++;
  }

  _unfinished(game) {
    return !!game&&game.lives>0&&game.state!=='gameover'&&!(game.level==='q1-1'&&game.state==='won');
  }

  _otherPlayer() {
    if(this.playerCount!==2)return -1;
    const other=1-this.activePlayer;
    return this._unfinished(this.games[other])?other:-1;
  }

  _switchTo(index) {
    if(index<0||index===this.activePlayer||!this._unfinished(this.games[index]))return false;
    this.activePlayer=index;
    if(this.game.state==='title')this.game.start();
    this._interstitial();
    return true;
  }

  _processEvents() {
    if(this._processingEvents)return;
    this._processingEvents=true;
    try {
      while(this._events.length){
        const {index,event}=this._events.shift();
        if(index!==this.activePlayer)continue;
        if(event.type==='area'||event.type==='start')this.revision++;
        if(event.type==='warp-level'){
          this.selection=LEVELS.indexOf(this.game.level);this._interstitial();
        }else if(event.type==='respawn'){
          if(!this._switchTo(this._otherPlayer()))this._interstitial();
        }else if(event.type==='gameover'){
          // If both players are exhausted, the final Game remains gameover.
          this._switchTo(this._otherPlayer());
        }else if(event.type==='win'&&!['8-4','q1-1'].includes(this.game.level)){
          this.continueLevel();
        }
      }
    } finally {this._processingEvents=false;}
  }

  openSelect(count=this.playerCount) {
    if(this.screen!=='select'){
      this.returnScreen=this.screen;
      this._selectionReturn={screen:this.screen,playerCount:this.playerCount};
    }
    this.playerCount=count===2?2:1;
    this.titleChoice=this.playerCount-1;
    this.selection=Math.max(0,LEVELS.indexOf(this.game.level));
    this.screen='select';
    return this;
  }

  back() {
    if(this.screen!=='select')return false;
    const previous=this._selectionReturn;
    this.screen=previous?.screen||'title';
    if(previous)this.playerCount=previous.playerCount;
    this._selectionReturn=null;
    return true;
  }

  startLevel(level) {
    if(!LEVELS.includes(level))return false;
    this._recordScores();
    this._events.length=0;
    this.activePlayer=0;
    this.selection=LEVELS.indexOf(level);
    this.games=Array.from({length:this.playerCount},(_,index)=>this._makeGame(index,level));
    this._selectionReturn=null;
    this.game.start();
    this._interstitial();
    this._processEvents();
    return true;
  }

  returnTitle() {
    this._recordScores();
    this._events.length=0;
    this.activePlayer=0;
    this.playerCount=this.titleChoice===1?2:1;
    this.games=Array.from({length:this.playerCount},(_,index)=>this._makeGame(index,'1-1'));
    this.screen='title';
    this.selection=0;
    this.interstitialTime=0;
    this.interstitialRemaining=0;
    this.returnScreen='title';
    this._selectionReturn=null;
    this.revision++;
    return this;
  }

  restartCurrent() {
    this._recordScores();
    this._events.length=0;
    this.game.reset(true);
    this.game.start();
    this._interstitial();
    this._processEvents();
    return true;
  }

  continueLevel() {
    this._recordScores();
    if(!this.game.advanceLevel())return false;
    this.selection=LEVELS.indexOf(this.game.level);
    this._interstitial();
    this._processEvents();
    return true;
  }

  returnFromWarp() {
    if(!this.game.returnFromWarp())return false;
    this.screen='play';
    this.revision++;
    this._processEvents();
    return true;
  }

  startSecondQuest() {
    if(this.game.level!=='8-4'||this.game.state!=='won')return false;
    this._recordScores();this._events.length=0;
    this.game.selectLevel('q1-1');this.game.start();
    this.selection=LEVELS.indexOf('q1-1');this._interstitial();this._processEvents();
    return true;
  }

  nextPlayer() {
    if(!['8-4','q1-1'].includes(this.game.level)||this.game.state!=='won')return false;
    const changed=this._switchTo(this._otherPlayer());
    this._processEvents();
    return changed;
  }

  update(dt,input={}, {paused=false}={}) {
    this._recordScores();
    if(paused)return;
    const elapsed=Math.max(0,Number(dt)||0);
    if(this.screen==='interstitial'){
      this.interstitialTime+=elapsed;
      this.interstitialRemaining=Math.max(0,INTERSTITIAL_SECONDS-this.interstitialTime);
      if(this.interstitialRemaining===0)this.screen='play';
      return;
    }
    if(this.screen!=='play')return;
    this.game.update(elapsed,input);
    this._recordScores();
    this._processEvents();
    // The normal path receives a win event. This also handles a caller that
    // restores an already-completed stage before the next session tick.
    if(this.screen==='play'&&this.game.state==='won'&&!['8-4','q1-1'].includes(this.game.level))this.continueLevel();
  }
}
