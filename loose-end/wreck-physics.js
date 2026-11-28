/* LOOSE END — a heavy weight on a real, slack cable. Pure fixed-step simulation. */
(function (root) {
  'use strict';
  const C = Object.freeze({ W: 1600, H: 1000, WIDTH: 1600, HEIGHT: 1000,
    WORLD_W: 1600, WORLD_H: 1000, LEFT: 72, RIGHT: 1528, TOP: 76, BOTTOM: 924,
    PLAYER_RADIUS: 20, HEAD_RADIUS: 25, WEIGHT_RADIUS: 25, ROPE_LENGTH: 255,
    HAND_REACH: 22, FIXED_DT: 1 / 120, SOLVER_DT: 1 / 240, ROOM_COUNT: 6 });
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const palette = { glass: '#77eadb', crate: '#e1b07b', machine: '#f79674',
    barrel: '#ffbc58', core: '#e6ff8b', drone: '#ff6e7d', valve: '#5edbd1' };
  const hpByKind = { glass: 1, crate: 2, machine: 3, barrel: 1, core: 4, valve: 2 };
  const radiusByKind = { glass: 27, crate: 32, machine: 38, barrel: 28, core: 43, valve: 29 };
  const valueByKind = { glass: 100, crate: 140, machine: 220, barrel: 160, core: 400, valve: 200 };
  const items = (kind, points, required = true) => points.map(([x, y]) => ({ kind, x, y, required }));
  const rooms = [
    { name:'SALTGLASS GARDENS', subtitle:'A beautiful place to make a mess.', theme:'garden', quota:10,
      walls:[{x:650,y:270,w:220,h:90},{x:980,y:650,w:80,h:130},{x:1040,y:290,w:80,h:110}],
      objects:[...items('glass',[[470,425],[470,625],[420,220],[570,210],[980,210],[1140,235],
        [1200,410],[750,490],[1190,690],[800,790]]),
        ...items('crate',[[600,760],[870,650],[1300,250],[1320,790]]),...items('barrel',[[1140,500],[1230,680]])],enemies:[[620,520,'rusher'],[970,500,'guard'],[1280,440,'thrower'],[1120,820,'rusher']] },
    { name:'THE TOPIARIST', subtitle:'Get around its shield. Sweep into the exposed back.', theme:'garden', quota:1,
      boss:'topiarist',walls:[],objects:items('glass',[[390,200],[390,800],[1310,200],[1310,800]],false),enemies:[] },
    { name:'TIDAL BATHS', subtitle:'Break the valves. Shut down the steam.', theme:'baths',quota:10,
      walls:[{x:650,y:340,w:270,h:300}],
      objects:[...items('glass',[[470,220],[560,220],[1000,230],[1100,230],[1210,390],[1210,640]]),
        ...items('machine',[[470,780],[650,800],[920,790],[1120,790]]),
        ...items('barrel',[[400,420],[510,650],[1190,600],[1290,780]]),
        {kind:'valve',x:355,y:280,required:true,valveFor:'steam-left'},
        {kind:'valve',x:1270,y:280,required:true,valveFor:'steam-right'}],
      hazards:[{id:'steam-left',kind:'steam',x:470,y:505,r:68,offset:0},
        {id:'steam-right',kind:'steam',x:1120,y:505,r:68,offset:2.1}],
      enemies:[[420,570,'rusher'],[1050,580,'guard'],[1250,160,'thrower'],[830,780,'rusher'],[1130,500,'guard']] },
    { name:'THE BATHMASTER', subtitle:'Bat a pressure float back. Strike while the shutter is open.', theme:'baths',quota:1,
      boss:'bathmaster',walls:[],objects:items('glass',[[390,200],[390,800],[1330,220],[1330,780]],false),enemies:[] },
    { name:'MIDNIGHT MIDWAY', subtitle:'Keep the weight moving. The park is waking up.', theme:'midway',quota:10,
      walls:[{x:560,y:220,w:90,h:180},{x:930,y:600,w:90,h:180},{x:1060,y:250,w:80,h:140}],
      objects:[...items('machine',[[420,220],[790,200],[1130,220],[1320,360],[420,780],[760,790]]),
        ...items('glass',[[470,420],[470,630],[800,440],[800,600],[1190,630],[1300,790]]),
        ...items('barrel',[[1000,360],[1120,390],[1160,790],[1320,660]])],
      enemies:[[620,500,'rusher'],[880,210,'guard'],[1240,500,'thrower'],[1150,800,'rusher'],[750,650,'thrower'],[1240,220,'guard']] },
    { name:'THE CAROUSEL', subtitle:'Break the sweeping joints. Then pull close to the motor.', theme:'midway',quota:1,
      boss:'carousel',walls:[],objects:[],enemies:[] }
  ];

  function bossFor(kind) {
    if (!kind) return null;
    const b={id:'boss-'+kind,kind,name:kind==='topiarist'?'THE TOPIARIST':kind==='bathmaster'?'THE BATHMASTER':'THE CAROUSEL',
      x:kind==='carousel'?940:1070,y:500,r:kind==='topiarist'?80:kind==='bathmaster'?84:64,
      vx:0,vy:0,angle:Math.PI,phase:kind==='topiarist'?'stalk':kind==='bathmaster'?'armored':'idle',
      phaseTimer:2,timer:2,flash:0,destroyed:false,vulnerable:kind==='topiarist',parts:[],telegraph:null,
      activeArms:false,armInnerRadius:145,armWidth:14,sweepArc:1.7,
      hp:kind==='topiarist'?16:kind==='bathmaster'?18:22,
      maxHp:kind==='topiarist'?16:kind==='bathmaster'?18:22,
      hint:'',displayPhase:'APPROACH',engaged:false,stage:1,pulse:null,partsOpen:false,sweepDirection:1,
      patternStep:0,chargesRemaining:0,volleyIndex:0,openCharges:0,_ventMarks:0,_contact:false,_blockTime:-10,_projectileId:0};
    if(kind==='carousel'){
      b.coreHp=10;b.coreMaxHp=10;b.angle=0;
      for(let i=0;i<3;i++){
        const a=i*Math.PI*2/3;
        b.parts.push({id:'carousel-joint-'+i,x:b.x+Math.cos(a)*208,y:b.y+Math.sin(a)*208,
          r:35,hp:4,maxHp:4,angle:a,offset:a,orbitRadius:208,destroyed:false,flash:0,_contact:false});
      }
    }
    return b;
  }
  function segmentDistance(px,py,ax,ay,bx,by){
    const dx=bx-ax,dy=by-ay,d2=dx*dx+dy*dy;
    const t=d2?clamp(((px-ax)*dx+(py-ay)*dy)/d2,0,1):0;
    return Math.hypot(px-(ax+dx*t),py-(ay+dy*t));
  }

  function node(x, y, mass) {
    return { x, y, oldX: x, oldY: y, vx: 0, vy: 0, invMass: mass ? 1 / mass : 0 };
  }
  function maxDistance(a, b, length) {
    const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
    if (d2 <= length * length || d2 < 1e-10) return;
    const d = Math.sqrt(d2), weights = a.invMass + b.invMass;
    if (!weights) return;
    const k = (d - length) / (d * weights);
    a.x += dx * k * a.invMass; a.y += dy * k * a.invMass;
    b.x -= dx * k * b.invMass; b.y -= dy * k * b.invMass;
  }
  function sweep(x0, y0, x1, y1, cx, cy, radius) {
    const sx = x0 - cx, sy = y0 - cy, dx = x1 - x0, dy = y1 - y0;
    const cc = sx * sx + sy * sy - radius * radius;
    if (cc <= 0) return 0;
    const aa = dx * dx + dy * dy;
    if (aa < 1e-10) return null;
    const bb = 2 * (sx * dx + sy * dy), disc = bb * bb - 4 * aa * cc;
    if (disc < 0) return null;
    const t = (-bb - Math.sqrt(disc)) / (2 * aa);
    return t >= 0 && t <= 1 ? t : null;
  }
  function rectContact(p, r, wall, bounce = 0) {
    const qx = clamp(p.x, wall.x, wall.x + wall.w), qy = clamp(p.y, wall.y, wall.y + wall.h);
    let dx = p.x - qx, dy = p.y - qy, distance = Math.hypot(dx, dy);
    if (distance >= r) return false;
    if (distance < 1e-8) {
      const sides = [p.x - wall.x, wall.x + wall.w - p.x, p.y - wall.y, wall.y + wall.h - p.y];
      const side = sides.indexOf(Math.min(...sides));
      if (side === 0) { dx = -1; dy = 0; p.x = wall.x - r; }
      if (side === 1) { dx = 1; dy = 0; p.x = wall.x + wall.w + r; }
      if (side === 2) { dx = 0; dy = -1; p.y = wall.y - r; }
      if (side === 3) { dx = 0; dy = 1; p.y = wall.y + wall.h + r; }
    } else {
      dx /= distance; dy /= distance;
      p.x += dx * (r - distance); p.y += dy * (r - distance);
    }
    const vn = p.vx * dx + p.vy * dy;
    if (vn < 0) { p.vx -= (1 + bounce) * vn * dx; p.vy -= (1 + bounce) * vn * dy; }
    return true;
  }
  function circleContact(p, r, object, bounce = 0) {
    let dx = p.x - object.x, dy = p.y - object.y, distance = Math.hypot(dx, dy);
    const radius = r + object.r;
    if (distance >= radius) return false;
    if (distance < 1e-8) { dx = -1; dy = 0; distance = 1; }
    else { dx /= distance; dy /= distance; }
    p.x = object.x + dx * radius; p.y = object.y + dy * radius;
    const vn = p.vx * dx + p.vy * dy;
    if (vn < 0) { p.vx -= (1 + bounce) * vn * dx; p.vy -= (1 + bounce) * vn * dy; }
    return true;
  }
  function bounded(p, radius, bounce = 0) {
    let hit = false;
    if (p.x < C.LEFT + radius) { p.x = C.LEFT + radius; if (p.vx < 0) p.vx *= -bounce; hit = true; }
    if (p.x > C.RIGHT - radius) { p.x = C.RIGHT - radius; if (p.vx > 0) p.vx *= -bounce; hit = true; }
    if (p.y < C.TOP + radius) { p.y = C.TOP + radius; if (p.vy < 0) p.vy *= -bounce; hit = true; }
    if (p.y > C.BOTTOM - radius) { p.y = C.BOTTOM - radius; if (p.vy > 0) p.vy *= -bounce; hit = true; }
    return hit;
  }
  function player(hp = 4) {
    const x = 190, y = 500, length = C.ROPE_LENGTH, nodes = [];
    for (let i = 0; i <= 7; i++) {
      const f = i / 7;
      nodes.push(node(x + C.HAND_REACH + f * length * 0.86, y + Math.sin(f * Math.PI) * 14,
        i === 0 ? 0 : i === 7 ? 1.8 : 0.045));
    }
    const head = nodes[nodes.length - 1];
    return { x, y, vx: 0, vy: 0, r: 20, angle: 0, lastMoveAngle: 0, handX: x + C.HAND_REACH, handY: y,
      headX: head.x, headY: head.y, prevHeadX: head.x, prevHeadY: head.y,
      headVX: 0, headVY: 0, headR: 25, weightAngle: 0, target: null,
      rope: { length, segmentLength: length / 7, nodes }, tension: 0,
      hp, maxHp: 4, invulnerable: 0, dashCooldown: 0, dashTime: 0, flash: 0,
      _dashVX: 0, _dashVY: 0, color: '#f79674' };
  }

  class Match {
    constructor(options = {}) {
      this.options = { practice: false, ...options };
      this.onEvent = typeof options.onEvent === 'function' ? options.onEvent : () => {};
      this.reset();
    }
    random() { this._seed = (Math.imul(this._seed, 1664525) + 1013904223) >>> 0; return this._seed / 4294967296; }
    emit(type, data = {}) { this.onEvent({ type, roomIndex: this.state.roomIndex, ...data }); }
    reset(options = {}) {
      this.options = { ...this.options, ...options };
      if (typeof this.options.onEvent === 'function') this.onEvent = this.options.onEvent;
      this._seed = (Number(this.options.seed) || Date.now()) >>> 0;
      this.state = { phase: 'ready', time: 0, roomIndex: 0, roomName: '', roomSubtitle: '',
        player: null, objects: [], walls: [], enemies: [], particles: [], rings: [], boss:null, projectiles:[], hazards:[],
        roomCount:rooms.length,worldIndex:0,theme:'garden',roomType:'approach',encounter:null,enemiesRemaining:0,
        combat:{activeAttacks:0,maxConcurrent:2,nextAttackIn:1.4},
        exit: {x:1450,y:420,w:78,h:160,open:false}, score: 0, combo: 0, comboTimer: 0,
        destroyed: 0, required: 0, shake: 0, hitStop: 0, roomTime: 0 };
      this._dashHeld = false; this._roomStartScore = 0;
      const encounter=[1,3,5].includes(Number(this.options.encounter))&&!this.options.practice?Number(this.options.encounter):null;
      this.state.encounter=encounter;this.loadRoom(encounter??0, 4); return this;
    }
    loadRoom(index, hp = 4) {
      const s = this.state, room = rooms[index];
      s.roomIndex = index; s.roomName = room.name; s.roomSubtitle = room.subtitle;
      s.worldIndex=Math.floor(index/2);s.theme=room.theme;s.roomType=room.boss?'boss':'approach';s.roomCount=rooms.length;
      s.boss=this.options.practice?null:bossFor(room.boss);s.projectiles=[];
      s.hazards=(room.hazards||[]).map(h=>({...h,phase:'idle',timer:2.4,cycle:5.8,duration:1.1,disabled:false}));
      s.player = player(hp); s.objects = room.objects.map((o, i) => ({ ...o,
        id: `r${index}-o${i}`, r: radiusByKind[o.kind], hp: hpByKind[o.kind], maxHp: hpByKind[o.kind],
        angle: (this.random() - 0.5) * 0.18, flash: 0, destroyed: false, _contact: false, _soundTime: -10 }));
      // Low planters, pool borders, and stands shape walking routes; the overhead weight clears them.
      s.walls = room.walls.map(w => ({overhead:true,...w}));
      s.enemies = this.options.practice ? [] : room.enemies.map(([x,y,archetype='rusher'], i) => ({
        id:`r${index}-e${i}`,archetype,x,y,prevX:x,prevY:y,vx:0,vy:0,r:archetype==='guard'?29:23,
        hp:archetype==='guard'?3:2,maxHp:archetype==='guard'?3:2,
        phase:'seek',angle:Math.PI,timer:1.4+i*.37,flash:0,destroyed:false,_contact:false,
        shield:archetype==='guard',telegraph:null,_blockTime:-10,nav:null,navTimer:0}));
      s.enemiesRemaining=s.enemies.length;s.combat={activeAttacks:0,maxConcurrent:2,nextAttackIn:1.4};
      this._attackGap=1.4;this._view=null;this._projectileId=0;this._dangerId=0;
      s.exit = { x:1450, y:420, w:78, h:160, open:false };
      s.required = room.quota; s.destroyed = 0; s.combo = 0; s.comboTimer = 0;
      s.roomTime = 0; s.particles.length = 0; s.rings.length = 0; s.shake = 0; s.hitStop = 0;
      this._roomStartScore = s.score; this._dashHeld = false;
    }
    start() {
      if (this.state.phase === 'won' || this.state.phase === 'dead') this.reset();
      this.state.phase = 'play'; this.emit('room', { name:this.state.roomName, required:this.state.required });
      if(this.state.boss)this.emit('boss-start',{kind:this.state.boss.kind,name:this.state.boss.name});
      return this;
    }
    retry() {
      const room = this.state.roomIndex;
      this.state.score = this._roomStartScore; this.loadRoom(room, 4);
      this.state.phase = 'play'; this.emit('room', {name:this.state.roomName,required:this.state.required,retry:true});
      return this;
    }
    update(dt, input = {}) {
      if (!Number.isFinite(dt) || dt <= 0) return this.state;
      if(input.view&&['left','right','top','bottom'].every(k=>Number.isFinite(input.view[k])))this._view=input.view;
      let remaining = Math.min(dt, 0.1);
      while (remaining > 1e-8) {
        const h = Math.min(remaining, C.SOLVER_DT);
        this.step(h, input); remaining -= h;
      }
      return this.state;
    }

    movePlayer(dt, input) {
      const s = this.state, p = s.player;
      let mx = Number(input.mx) || 0, my = Number(input.my) || 0;
      if (!Number.isFinite(mx)) mx = 0; if (!Number.isFinite(my)) my = 0;
      const mag = Math.hypot(mx, my); if (mag > 1) { mx /= mag; my /= mag; }
      if (Math.hypot(mx, my) > 0.1) p.lastMoveAngle = Math.atan2(my, mx);
      const target = input.target && Number.isFinite(input.target.x) && Number.isFinite(input.target.y) ? input.target : null;
      if (target) {
        const angle = Math.atan2(target.y - p.y, target.x - p.x);
        p.angle = wrap(p.angle + clamp(wrap(angle - p.angle), -30 * dt, 30 * dt));
      } else if (Math.hypot(mx, my) > 0.1) p.angle = Math.atan2(my, mx);
      p.dashCooldown = Math.max(0, p.dashCooldown - dt);
      p.invulnerable = Math.max(0, p.invulnerable - dt); p.flash = Math.max(0, p.flash - dt * 4);
      const dash = !!input.dash;
      if (dash && !this._dashHeld && p.dashCooldown <= 0 && s.phase === 'play') {
        let dx = mx, dy = my;
        if (Math.hypot(dx, dy) < 0.1) { dx = Math.cos(p.lastMoveAngle); dy = Math.sin(p.lastMoveAngle); }
        const d = Math.hypot(dx, dy); p._dashVX = dx / d * 1120; p._dashVY = dy / d * 1120;
        p.dashTime = 0.14; p.dashCooldown = 0.85; p.invulnerable = Math.max(p.invulnerable, 0.23);
        this.burst(p.x,p.y,'#f79674',10,170); this.emit('dash',{x:p.x,y:p.y});
      }
      this._dashHeld = dash;
      if (p.dashTime > 0) {
        p.dashTime = Math.max(0, p.dashTime - dt); p.vx = p._dashVX; p.vy = p._dashVY;
      } else {
        const response = 1 - Math.exp(-19 * dt);
        let dx = (mx * 470 - p.vx) * response, dy = (my * 470 - p.vy) * response;
        const dv = Math.hypot(dx,dy), limit = 4300 * dt;
        if (dv > limit) { dx *= limit/dv; dy *= limit/dv; }
        p.vx += dx; p.vy += dy;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      bounded(p,p.r);
      for (let pass=0;pass<2;pass++) {
        for (const wall of s.walls) rectContact(p,p.r,wall);
        for (const object of s.objects) if (!object.destroyed) circleContact(p,p.r,object);
      }
      for(const e of s.enemies)if(!e.destroyed)circleContact(p,p.r,e);
      if(s.boss&&!s.boss.destroyed)circleContact(p,p.r,s.boss);
      if (!s.exit.open) rectContact(p,p.r,{x:1490,y:420,w:38,h:160});
      bounded(p,p.r);
      this.moveWeight(dt,target);
    }

    moveWeight(dt, target) {
      const s = this.state, p = s.player, ns = p.rope.nodes, a = ns[0], head = ns[ns.length-1];
      const hx = p.x + Math.cos(p.angle)*C.HAND_REACH, hy = p.y + Math.sin(p.angle)*C.HAND_REACH;
      p.prevHeadX = head.x; p.prevHeadY = head.y;
      let ax=0, ay=0;
      if (target) {
        const dx=target.x-hx,dy=target.y-hy,d=Math.hypot(dx,dy),reach=p.rope.length-2;
        const ratio=d>reach?reach/d:1, tx=hx+dx*ratio,ty=hy+dy*ratio;
        ax=3600*(tx-head.x)-110*head.vx; ay=3600*(ty-head.y)-110*head.vy;
        const force=Math.hypot(ax,ay); if(force>120000){ax*=120000/force;ay*=120000/force;}
        p.target={x:tx,y:ty,rawX:target.x,rawY:target.y,clamped:d>reach};
      } else p.target=null;
      for(let i=1;i<ns.length;i++){
        const n=ns[i];n.oldX=n.x;n.oldY=n.y;
        const drag=Math.exp(-(i===ns.length-1?0.6:1.0)*dt);n.vx*=drag;n.vy*=drag;
        if(i===ns.length-1){n.vx+=ax*dt;n.vy+=ay*dt;}
        n.x+=n.vx*dt;n.y+=n.vy*dt;
      }
      a.oldX=a.x;a.oldY=a.y;a.vx=(hx-a.x)/dt;a.vy=(hy-a.y)/dt;a.x=hx;a.y=hy;
      // Cable and weight clear low scenery; full-height walls still collide with the weight.
      // There are no permanent rope-to-pillar anchors that could trap the player.
      for(let pass=0;pass<18;pass++){
        maxDistance(a,head,p.rope.length);
        if(pass&1){for(let i=ns.length-1;i>0;i--)maxDistance(ns[i-1],ns[i],p.rope.segmentLength);}
        else{for(let i=1;i<ns.length;i++)maxDistance(ns[i-1],ns[i],p.rope.segmentLength);}
        bounded(head,C.HEAD_RADIUS);
        for(const wall of s.walls)if(!wall.overhead)rectContact(head,C.HEAD_RADIUS,wall);
      }
      for(let i=1;i<ns.length;i++){
        const n=ns[i];n.vx=(n.x-n.oldX)/dt;n.vy=(n.y-n.oldY)/dt;
        const speed=Math.hypot(n.vx,n.vy),limit=i===ns.length-1?4800:5200;
        if(speed>limit){n.vx*=limit/speed;n.vy*=limit/speed;}
      }
      bounded(head,C.HEAD_RADIUS,0.28);
      for(const wall of s.walls)if(!wall.overhead)rectContact(head,C.HEAD_RADIUS+0.01,wall,0.25);
      this.syncWeight();
      const span=Math.hypot(head.x-hx,head.y-hy)/p.rope.length;
      p.tension=lerp(p.tension,clamp((span-0.90)/0.1,0,1),1-Math.exp(-22*dt));
      p.weightAngle+=Math.hypot(head.vx,head.vy)*dt/80;
    }
    syncWeight(){
      const p=this.state.player,ns=p.rope.nodes,a=ns[0],h=ns[ns.length-1];
      p.handX=a.x;p.handY=a.y;p.headX=h.x;p.headY=h.y;p.headVX=h.vx;p.headVY=h.vy;
    }

    hitObjects(dt){
      const s=this.state,p=s.player,head=p.rope.nodes[p.rope.nodes.length-1];
      const contacts=[];
      for(const o of s.objects){
        if(o.destroyed)continue;
        const radius=o.r+C.HEAD_RADIUS+3;
        if(Math.hypot(head.x-o.x,head.y-o.y)>radius+12&&Math.hypot(p.prevHeadX-o.x,p.prevHeadY-o.y)>radius+12)o._contact=false;
        const t=sweep(p.prevHeadX,p.prevHeadY,head.x,head.y,o.x,o.y,radius);
        if(t!==null)contacts.push({o,t});
      }
      contacts.sort((a,b)=>a.t-b.t);
      for(const {o,t} of contacts){
        if(o.destroyed)continue;
        if(t===0&&Math.hypot(head.x-o.x,head.y-o.y)>=o.r+C.HEAD_RADIUS+3)continue;
        const cx=lerp(p.prevHeadX,head.x,t),cy=lerp(p.prevHeadY,head.y,t);
        let nx=cx-o.x,ny=cy-o.y,d=Math.hypot(nx,ny);
        if(d<1e-6){nx=-Math.cos(p.angle);ny=-Math.sin(p.angle);}else{nx/=d;ny/=d;}
        const vn=head.vx*nx+head.vy*ny,speed=Math.hypot(head.vx,head.vy);
        const impact=Math.max(0,-vn)*0.72+speed*0.28;
        if(!o._contact && impact>155&&vn< -15){
          o._contact=true;
          const damage=impact>2400?4:impact>1550?3:impact>800?2:1;
          this.damageObject(o,damage,clamp(impact/2400,0,1),head.vx,head.vy);
        }
        if(!o.destroyed){
          // Solid surviving targets recoil the weight; holding against them cannot grind HP.
          this.projectSolidContact(head,o,nx,ny);
          if(vn<0){head.vx-=1.28*vn*nx;head.vy-=1.28*vn*ny;}
          break;
        }else{head.vx*=0.88;head.vy*=0.88;}
      }
      this.syncWeight();
    }
    damageObject(o,damage,power=0.5,vx=0,vy=0){
      if(o.destroyed)return;
      const s=this.state;o.hp=Math.max(0,o.hp-damage);o.flash=1;
      s.shake=Math.max(s.shake,1.6+power*6);s.hitStop=Math.max(s.hitStop,0.012+power*0.015);
      this.burst(o.x,o.y,palette[o.kind],6+Math.floor(power*8),100+power*180,vx*.025,vy*.025);
      this.emit('hit',{id:o.id,x:o.x,y:o.y,kind:o.kind,power,damage,hp:o.hp});
      if(o.hp===0)this.breakObject(o,power,vx,vy);
    }
    breakObject(o,power=0.7,vx=0,vy=0){
      if(o.destroyed)return;
      const s=this.state;o.destroyed=true;o.hp=0;o.flash=1;
      s.combo=s.comboTimer>0?s.combo+1:1;s.comboTimer=2.7;
      const multiplier=1+Math.min(4,Math.floor((s.combo-1)/3))*.25;
      const earned=Math.round(valueByKind[o.kind]*multiplier);s.score+=earned;
      if(o.required)s.destroyed=Math.min(s.required,s.destroyed+1);
      this.burst(o.x,o.y,palette[o.kind],o.kind==='core'?42:26,230+power*280,vx*.07,vy*.07);
      this.ring(o.x,o.y,palette[o.kind],o.kind==='core'?125:72,0.38);
      s.shake=Math.max(s.shake,o.kind==='core'?10:4+power*5);s.hitStop=Math.max(s.hitStop,0.026);
      this.emit('break',{id:o.id,x:o.x,y:o.y,kind:o.kind,power,score:s.score,earned,combo:s.combo});
      if(o.kind==='barrel'){
        this.ring(o.x,o.y,palette.barrel,175,0.42);this.burst(o.x,o.y,palette.barrel,32,520);
        for(const other of s.objects){if(!other.destroyed&&Math.hypot(other.x-o.x,other.y-o.y)<175+other.r*.3)this.damageObject(other,3,0.85);}
        for(const e of s.enemies){if(!e.destroyed&&Math.hypot(e.x-o.x,e.y-o.y)<190)this.damageEnemy(e,3,0.9,{x:o.x,y:o.y});}
      }
      if(o.valveFor){
        const h=s.hazards.find(h=>h.id===o.valveFor);if(h){h.disabled=true;h.phase='disabled';h.timer=0;this.emit('hazard-disabled',{id:h.id,x:h.x,y:h.y});this.ring(h.x,h.y,'#5edbd1',95,.5);}
      }
      if(!s.boss&&s.destroyed>=s.required)this.openExit();
    }

    openExit(){
      const s=this.state;if(s.exit.open)return;
      s.enemiesRemaining=s.enemies.filter(e=>!e.destroyed).length;
      if(s.boss?!s.boss.destroyed:(s.destroyed<s.required||s.enemiesRemaining>0))return;
      s.exit.open=true;this.ring(s.exit.x+s.exit.w/2,s.exit.y+s.exit.h/2,'#e6ff8b',130,.6);
      this.emit('exit',{x:s.exit.x+s.exit.w/2,y:s.exit.y+s.exit.h/2,open:true});
    }
    bossPhase(phase,duration){
      const b=this.state.boss;if(!b||b.destroyed)return;
      b.phase=phase;b.timer=duration;b.phaseTimer=duration;
      this.emit('boss-phase',{kind:b.kind,name:b.name,phase,duration});
    }
    visibleActor(actor){
      const v=this._view;if(!v)return true;
      const margin=Math.min(24,actor.r||24);
      return actor.x>v.left+margin&&actor.x<v.right-margin&&actor.y>v.top+margin&&actor.y<v.bottom-margin;
    }
    segmentBlocked(ax,ay,bx,by,pad=0){
      for(const w of this.state.walls){
        let lo=0,hi=1;const dx=bx-ax,dy=by-ay;
        for(const [origin,delta,min,max] of [[ax,dx,w.x-pad,w.x+w.w+pad],[ay,dy,w.y-pad,w.y+w.h+pad]]){
          if(Math.abs(delta)<1e-9){if(origin<=min||origin>=max){lo=2;break;}}
          else{let a=(min-origin)/delta,b=(max-origin)/delta;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);}
        }
        if(lo<hi&&hi>0.001&&lo<.999)return true;
      }
      return false;
    }
    launchShot(owner,angle,reflectable=true,speed=300){
      const s=this.state,r=reflectable?30:17;
      const x=owner.x+Math.cos(angle)*(owner.r+r+9),y=owner.y+Math.sin(angle)*(owner.r+r+9);
      const q={id:'shot-'+(++this._projectileId),ownerId:owner.id,ownerKind:owner===s.boss?'boss':'enemy',
        kind:reflectable?'pearl':'spike',reflectable,x,y,prevX:x,prevY:y,r,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
        reflected:false,life:7,flash:0};
      s.projectiles.push(q);this.emit(owner===s.boss?'boss-shot':'enemy-shot',{kind:q.kind,x,y,reflectable,ownerId:owner.id});
    }
    addDanger(owner,x,y,r=88,warning=.9,active=.65){
      const h={id:'danger-'+(++this._dangerId),ownerId:owner.id,kind:'steam',shape:'circle',transient:true,
        x:clamp(x,C.LEFT+r,C.RIGHT-r),y:clamp(y,C.TOP+r,C.BOTTOM-r),r,phase:'warning',timer:warning,
        warningDuration:warning,activeDuration:active,disabled:false};
      this.state.hazards.push(h);this.emit('danger',{id:h.id,x:h.x,y:h.y,r,warning,active});return h;
    }
    finishTopCharge(){
      const b=this.state.boss,p=this.state.player;b.vx=b.vy=0;b.chargesRemaining--;
      if(b.chargesRemaining>0){b.angle=Math.atan2(p.y-b.y,p.x-b.x);this.bossPhase('windup',.78);}
      else this.bossPhase('stunned',b.stage===2?1.05:1.2);
    }
    updateBoss(dt){
      const s=this.state,b=s.boss,p=s.player;if(!b||b.destroyed)return;
      b.prevX=b.x;b.prevY=b.y;b.flash=Math.max(0,b.flash-dt*4);b.telegraph=null;b.pulse=null;
      b.stage=b.hp<=b.maxHp*.5?2:1;
      if(!b.engaged){
        b.vulnerable=false;b.partsOpen=false;b.activeArms=false;b.displayPhase='APPROACH';
        b.hint='Move in. Watch the first attack.';
        if(Math.hypot(p.x-b.x,p.y-b.y)<620&&this.visibleActor(b)){b.engaged=true;b.timer=1.0;this.emit('boss-engaged',{kind:b.kind});}
        else{b.phaseTimer=b.timer;return;}
      }
      b.timer-=dt;
      if(b.kind==='topiarist'){
        b.vx=b.vy=0;
        if(b.phase==='stalk'){
          const dx=p.x-b.x,dy=p.y-b.y,d=Math.max(1,Math.hypot(dx,dy));
          b.angle=wrap(b.angle+clamp(wrap(Math.atan2(dy,dx)-b.angle),-(b.stage===2?3.6:2.8)*dt,(b.stage===2?3.6:2.8)*dt));
          if(d>245){b.vx=dx/d*155;b.vy=dy/d*155;}
          if(b.timer<=0&&d<620&&this.visibleActor(b)){
            b.patternStep++;b.angle=Math.atan2(dy,dx);
            if(d<340&&(b.patternStep%2===0||d<170))this.bossPhase('sweep-windup',.9);
            else{b.chargesRemaining=b.stage===2?2:1;this.bossPhase('windup',.88);}
            b.vx=b.vy=0;
          }
        }else if(b.phase==='windup'){
          b.telegraph={shape:'line',x1:b.x,y1:b.y,x2:b.x+Math.cos(b.angle)*451,y2:b.y+Math.sin(b.angle)*451,width:b.r*2};
          if(b.timer<=0)this.bossPhase('charge',.53);
        }else if(b.phase==='charge'){
          b.vx=Math.cos(b.angle)*850;b.vy=Math.sin(b.angle)*850;
          if(b.timer<=0)this.finishTopCharge();
        }else if(b.phase==='sweep-windup'){
          b.pulse={phase:'warning',x:b.x,y:b.y,r:250,innerR:0,maxR:250};
          b.telegraph={shape:'circle',x:b.x,y:b.y,r:250};
          if(b.timer<=0)this.bossPhase('sweep',.28);
        }else if(b.phase==='sweep'){
          b.pulse={phase:'active',x:b.x,y:b.y,r:250,innerR:0,maxR:250};
          if(Math.hypot(p.x-b.x,p.y-b.y)<250+p.r)this.hurtPlayer(b);
          if(b.timer<=0)this.bossPhase('stunned',1.1);
        }else if(b.phase==='stunned'&&b.timer<=0)this.bossPhase('stalk',.45);
        else if(b.phase==='stagger'&&b.timer<=0)this.bossPhase('stalk',.45);
        b.x+=b.vx*dt;b.y+=b.vy*dt;
        let blocked=bounded(b,b.r,.1);for(const w of s.walls)blocked=rectContact(b,b.r,w,.1)||blocked;
        if(b.phase==='charge'){
          for(const o of s.objects)if(!o.destroyed&&Math.hypot(o.x-b.x,o.y-b.y)<o.r+b.r)this.damageObject(o,5,.9,b.vx,b.vy);
          if(Math.hypot(p.x-b.x,p.y-b.y)<p.r+b.r)this.hurtPlayer(b);
          if(blocked){this.finishTopCharge();this.ring(b.x,b.y,'#ffe5ad',140,.4);}
        }
        b.vulnerable=b.phase==='stunned';
        b.displayPhase=b.vulnerable?'REAR OPEN':b.phase==='windup'?(b.chargesRemaining>1?'DOUBLE CHARGE':'CHARGE WARNING'):
          b.phase==='charge'?'CHARGING':b.phase.includes('sweep')?'RADIAL SWEEP':b.phase==='stagger'?'SHIELD RESET':'SHIELD TRACKING';
        b.hint=b.vulnerable?'Reverse your swing into the exposed back.':b.phase==='windup'?'Aim locked. Dash sideways; keep moving for the second charge.':
          b.phase.includes('sweep')?'Radial sweep. Pull the weight in and move outside the circle.':'Flank while it commits. The shield follows you between attacks.';
      }else if(b.kind==='bathmaster'){
        b.vx=b.vy=0;
        if(b.phase==='armored'){
          b.angle=wrap(b.angle+clamp(wrap(Math.atan2(p.y-b.y,p.x-b.x)-b.angle),-1.8*dt,1.8*dt));
          if(b.timer<=0&&s.projectiles.filter(q=>!q.reflected).length<4&&this.visibleActor(b)){
            b.angle=Math.atan2(p.y+p.vy*.10-b.y,p.x+p.vx*.10-b.x);
            b.nextReflectable=b.volleyIndex%3===0;this.bossPhase('aim',.85);
          }
        }else if(b.phase==='aim'){
          b.telegraph={shape:'line',x1:b.x,y1:b.y,x2:b.x+Math.cos(b.angle)*760,y2:b.y+Math.sin(b.angle)*760,
            width:b.nextReflectable?60:34,reflectable:b.nextReflectable,spread:b.nextReflectable?0:(b.stage===2?.25:.17),
            angles:b.nextReflectable?[b.angle]:(b.stage===2?[-.25,0,.25]:[-.17,.17]).map(offset=>b.angle+offset)};
          if(b.timer<=0){
            if(b.nextReflectable)this.launchShot(b,b.angle,true,290);
            else{
              const offsets=b.stage===2?[-.25,0,.25]:[-.17,.17];
              for(const offset of offsets)this.launchShot(b,b.angle+offset,false,355);
            }
            b.volleyIndex++;this.bossPhase('armored',1.0);
          }
        }else if(b.phase==='venting'){
          const elapsed=3-b.timer;
          if(b._ventMarks===0){this.addDanger(b,p.x,p.y,88,.95,.7);b._ventMarks=1;}
          if(elapsed>1.35&&b._ventMarks===1){this.addDanger(b,p.x,p.y,b.stage===2?100:88,.95,.7);b._ventMarks=2;}
          if(b.timer<=0||b.openCharges<=0){b.openCharges=0;this.bossPhase('armored',.7);}
        }
        b.vulnerable=b.phase==='venting'&&b.openCharges>0;
        b.displayPhase=b.vulnerable?'SHUTTER OPEN':b.phase==='aim'?(b.nextReflectable?'RETURN THE PEARL':'DODGE THE SPIKES'):'PRESSURE BUILDING';
        b.hint=b.vulnerable?'Two shutter segments. Land clean swings; leave the marked steam.':
          b.phase==='aim'&&!b.nextReflectable?'Red spikes cannot be returned. Dodge between the lanes.':'Return the large pale pearl with a moving weight.';
      }else{
        b.vx=b.vy=0;
        const remaining=b.parts.filter(part=>!part.destroyed).length;
        const core=remaining===0;
        if(b.phase==='idle'){
          b.angle+=.25*b.sweepDirection*dt;
          if(b.timer<=0)this.bossPhase(core?'pulse-windup':'windup',1.0);
        }else if(b.phase==='windup'){
          b.sweepArc=(2.0+(3-remaining)*.18)*b.sweepDirection;
          if(b.timer<=0)this.bossPhase('sweep',1.18);
        }else if(b.phase==='sweep'){
          b.angle+=b.sweepArc/1.18*dt;
          if(b.timer<=0){b.patternStep=1;this.bossPhase('recovery',1.15);}
        }else if(b.phase==='pulse-windup'){
          b.pulse={phase:'warning',x:b.x,y:b.y,r:225,innerR:0,maxR:1100};
          if(b.timer<=0){s.projectiles=s.projectiles.filter(q=>q.reflected);this.bossPhase('pulse',2.0);}
        }else if(b.phase==='pulse'){
          const elapsed=2-b.timer,r=elapsed<.18?225:225+(elapsed-.18)*480,innerR=elapsed<.18?0:Math.max(0,r-48);
          b.pulse={phase:'active',x:b.x,y:b.y,r,innerR,maxR:1100};
          const d=Math.hypot(p.x-b.x,p.y-b.y);
          if(d<r+p.r&&d>innerR-p.r)this.hurtPlayer(b);
          if(b.timer<=0){b.patternStep=0;this.bossPhase('recovery',core?1.35:1.2);}
        }else if(b.phase==='recovery'&&b.timer<=0){
          if(core||b.patternStep===1)this.bossPhase('pulse-windup',1.05);
          else{b.sweepDirection*=-1;this.bossPhase('windup',.95);}
        }
        b.activeArms=b.phase==='sweep'&&!core;
        b.partsOpen=!core&&(b.phase==='recovery'||b.phase==='idle');
        for(const part of b.parts){
          part.prevX=part.x;part.prevY=part.y;part.flash=Math.max(0,part.flash-dt*4);part.angle=b.angle+part.offset;
          part.x=b.x+Math.cos(part.angle)*part.orbitRadius;part.y=b.y+Math.sin(part.angle)*part.orbitRadius;
          part.vx=(part.x-part.prevX)/dt;part.vy=(part.y-part.prevY)/dt;part.vulnerable=b.partsOpen;
          if(!part.destroyed&&b.activeArms){
            const ax=b.x+Math.cos(part.angle)*b.armInnerRadius,ay=b.y+Math.sin(part.angle)*b.armInnerRadius;
            if(segmentDistance(p.x,p.y,ax,ay,part.x,part.y)<p.r+b.armWidth)this.hurtPlayer({id:part.id});
          }
        }
        b.vulnerable=core&&b.phase==='recovery';
        b.displayPhase=b.vulnerable?'MOTOR OPEN':b.partsOpen?'JOINTS OPEN':b.phase==='windup'?'ARMS WINDING':
          b.phase==='sweep'?'ARM SWEEP':b.phase==='pulse-windup'?'HUB PULSE WARNING':'EXPANDING PULSE';
        b.hint=b.vulnerable?'Motor open. Pull close for quick, deliberate strikes.':b.partsOpen?'Joints open. Sweep wide into the outer pivots.':
          b.phase==='pulse-windup'?'Leave the hub. The pulse expands outward.':b.phase==='pulse'?'Cross behind the wave or dash through it.':
          'Read the sweep direction. Broken joints remove their arms.';
      }
      circleContact(p,p.r,b);this.settlePlayerBody();b.phaseTimer=Math.max(0,b.timer);
    }
    hitBoss(){
      const s=this.state,b=s.boss,p=s.player;if(!b||b.destroyed)return;
      const head=p.rope.nodes[p.rope.nodes.length-1];
      const targets=b.kind==='carousel'?[...b.parts.filter(part=>!part.destroyed),b]:[b];
      const contacts=[];
      for(const target of targets){
        const radius=target.r+C.HEAD_RADIUS+3;
        const ox=target.prevX??target.x,oy=target.prevY??target.y;
        if(Math.hypot(head.x-target.x,head.y-target.y)>radius+14&&Math.hypot(p.prevHeadX-ox,p.prevHeadY-oy)>radius+14)target._contact=false;
        const t=sweep(p.prevHeadX-ox,p.prevHeadY-oy,head.x-target.x,head.y-target.y,0,0,radius);
        if(t!==null)contacts.push({target,t});
      }
      contacts.sort((a,b)=>a.t-b.t);
      for(const {target,t} of contacts){
        if(target.destroyed)continue;
        const ox=target.prevX??target.x,oy=target.prevY??target.y;
        const cx=lerp(p.prevHeadX,head.x,t),cy=lerp(p.prevHeadY,head.y,t);
        // A previous contact already separating must never be projected back across a moving boss.
        if(t===0&&Math.hypot(head.x-target.x,head.y-target.y)>=target.r+C.HEAD_RADIUS+3)continue;
        let nx=lerp(p.prevHeadX-ox,head.x-target.x,t),ny=lerp(p.prevHeadY-oy,head.y-target.y,t),d=Math.hypot(nx,ny);
        if(d<1e-6){nx=-Math.cos(p.angle);ny=-Math.sin(p.angle);}else{nx/=d;ny/=d;}
        const rvx=head.vx-(target.vx||0),rvy=head.vy-(target.vy||0);
        const vn=rvx*nx+rvy*ny,speed=Math.hypot(head.vx,head.vy);
        const impact=Math.max(0,-vn)*.72+speed*.28;
        const part=target!==b;
        const rear=nx*Math.cos(b.angle)+ny*Math.sin(b.angle)<.10;
        const vulnerable=part?target.vulnerable!==false:(b.kind==='topiarist'?b.vulnerable&&rear:b.vulnerable);
        if(!target._contact&&impact>180&&vn< -25){
          target._contact=true;
          if(vulnerable){
            const damage=impact>2100?3:impact>950?2:1;
            this.damageBoss(target,damage,clamp(impact/2400,0,1));
          }else if(s.time-b._blockTime>.22){
            b._blockTime=s.time;this.burst(cx,cy,'#ffe4b1',8,160);this.ring(cx,cy,'#ffe4b1',38,.18);
            this.emit('boss-block',{kind:b.kind,x:cx,y:cy,power:clamp(impact/2400,0,1)});
          }
        }
        if(!target.destroyed){
          this.projectSolidContact(head,target,nx,ny);
          const headNormal=head.vx*nx+head.vy*ny;
          if(headNormal<0){head.vx-=1.30*headNormal*nx;head.vy-=1.30*headNormal*ny;}
          break;
        }else{head.vx*=.86;head.vy*=.86;}
      }
      this.syncWeight();
    }
    projectSolidContact(head,target,nx,ny){
      const p=this.state.player,a=p.rope.nodes[0],reach=p.rope.length-.05,radius=target.r+C.HEAD_RADIUS+3.5;
      let x=target.x+nx*radius,y=target.y+ny*radius;
      if(Math.hypot(x-a.x,y-a.y)>reach){
        const dx=target.x-a.x,dy=target.y-a.y,d=Math.hypot(dx,dy);
        if(d>reach+radius){return;} // The moving obstacle has already left the reachable disk.
        if(d>1e-6&&d>Math.abs(reach-radius)){
          const ux=dx/d,uy=dy/d,along=(reach*reach-radius*radius+d*d)/(2*d);
          const side=Math.sqrt(Math.max(0,reach*reach-along*along));
          const ax=a.x+ux*along-uy*side,ay=a.y+uy*along+ux*side;
          const bx=a.x+ux*along+uy*side,by=a.y+uy*along-ux*side;
          if(Math.hypot(ax-head.x,ay-head.y)<Math.hypot(bx-head.x,by-head.y)){x=ax;y=ay;}else{x=bx;y=by;}
        }else{
          const length=Math.hypot(x-a.x,y-a.y)||1;x=a.x+(x-a.x)/length*reach;y=a.y+(y-a.y)/length*reach;
        }
      }
      head.x=x;head.y=y;
      const ns=p.rope.nodes,span=Math.hypot(head.x-a.x,head.y-a.y);
      // A contact at full extension must straighten the cable, not leave one impossible long link.
      if(span>p.rope.length*.97){
        for(let i=1;i<ns.length-1;i++){
          const f=i/(ns.length-1);ns[i].x=lerp(a.x,head.x,f);ns[i].y=lerp(a.y,head.y,f);
          ns[i].vx=lerp(a.vx,head.vx,f);ns[i].vy=lerp(a.vy,head.vy,f);
        }
      }else{
        const mass=head.invMass;head.invMass=0;
        for(let pass=0;pass<24;pass++){
          for(let i=1;i<ns.length;i++)maxDistance(ns[i-1],ns[i],p.rope.segmentLength);
          for(let i=ns.length-1;i>0;i--)maxDistance(ns[i-1],ns[i],p.rope.segmentLength);
        }
        head.invMass=mass;
      }
    }
    damageBoss(target,damage,power){
      const s=this.state,b=s.boss;if(!b||b.destroyed||target.destroyed)return;
      const part=target!==b,actual=Math.min(target.hp,damage);target.flash=1;b.flash=.6;
      if(part){target.hp=Math.max(0,target.hp-damage);b.hp=b.coreHp+b.parts.reduce((sum,p)=>sum+p.hp,0);}
      else if(b.kind==='carousel'){b.coreHp=Math.max(0,b.coreHp-damage);b.hp=b.coreHp;}
      else b.hp=Math.max(0,b.hp-damage);
      s.score+=actual*45;s.shake=Math.max(s.shake,3+power*7);
      if(!part&&b.hp>0&&b.kind==='topiarist'){b.vulnerable=false;this.bossPhase('stagger',.25);}
      if(!part&&b.hp>0&&b.kind==='bathmaster'){b.openCharges=Math.max(0,b.openCharges-1);if(!b.openCharges){b.vulnerable=false;this.bossPhase('armored',.7);}}
      this.burst(target.x,target.y,b.kind==='topiarist'?'#ffbca6':b.kind==='bathmaster'?'#8cf5ed':'#ffc85f',16,180+power*220);
      this.emit('boss-hit',{kind:b.kind,name:b.name,id:target.id,x:target.x,y:target.y,power,damage:actual,hp:b.hp,maxHp:b.maxHp,part});
      if(part&&target.hp===0){
        target.destroyed=true;this.burst(target.x,target.y,'#ffcf72',35,410);this.ring(target.x,target.y,'#ffcf72',105,.42);
        this.emit('boss-part',{kind:b.kind,id:target.id,x:target.x,y:target.y,power,hp:b.hp});
        if(b.parts.every(p=>p.destroyed)){b.activeArms=false;b.vulnerable=false;b.stage=2;b.patternStep=0;this.bossPhase('pulse-windup',1.0);}
        else{b.sweepDirection*=-1;}
      }
      if(b.hp<=0){
        b.hp=0;b.destroyed=true;b.phase='dead';b.phaseTimer=b.timer=0;b.vx=b.vy=0;b.telegraph=null;b.activeArms=false;b.vulnerable=false;
        s.projectiles.length=0;s.hazards=s.hazards.filter(h=>!h.transient);s.destroyed=s.required;s.score+=b.kind==='carousel'?4000:2000;
        this.burst(b.x,b.y,'#ffdf8e',85,560);this.ring(b.x,b.y,'#fff3c8',260,.8);s.shake=14;
        this.emit('boss-break',{kind:b.kind,name:b.name,x:b.x,y:b.y,power:1,score:s.score});this.openExit();
      }
    }
    settlePlayerBody(){
      const s=this.state,p=s.player;
      for(let pass=0;pass<2;pass++){
        bounded(p,p.r);
        for(const w of s.walls)rectContact(p,p.r,w);
        for(const o of s.objects)if(!o.destroyed)circleContact(p,p.r,o);
      }
      bounded(p,p.r);
      const ns=p.rope.nodes,a=ns[0],head=ns[ns.length-1];
      const x=p.x+Math.cos(p.angle)*C.HAND_REACH,y=p.y+Math.sin(p.angle)*C.HAND_REACH;
      if(Math.hypot(x-a.x,y-a.y)<1e-7)return;
      a.x=x;a.y=y;
      for(let pass=0;pass<18;pass++){
        maxDistance(a,head,p.rope.length);
        if(pass&1){for(let i=ns.length-1;i>0;i--)maxDistance(ns[i-1],ns[i],p.rope.segmentLength);}
        else{for(let i=1;i<ns.length;i++)maxDistance(ns[i-1],ns[i],p.rope.segmentLength);}
      }
      this.syncWeight();
    }
    projectileTarget(q){
      const s=this.state;
      if(q.ownerKind==='boss')return s.boss&&!s.boss.destroyed?s.boss:null;
      const owner=s.enemies.find(e=>e.id===q.ownerId&&!e.destroyed);
      return owner||s.enemies.filter(e=>!e.destroyed).sort((a,b)=>Math.hypot(a.x-q.x,a.y-q.y)-Math.hypot(b.x-q.x,b.y-q.y))[0]||null;
    }
    removeShot(q){const list=this.state.projectiles,index=list.indexOf(q);if(index>=0)list.splice(index,1);}
    updateProjectiles(dt){
      const s=this.state,p=s.player,head=p.rope.nodes[p.rope.nodes.length-1];
      for(const q of [...s.projectiles]){
        if(!s.projectiles.includes(q))continue;q.prevX=q.x;q.prevY=q.y;q.life-=dt;q.flash=Math.max(0,(q.flash||0)-dt*4);
        const target=this.projectileTarget(q);
        if(q.reflected&&target){
          const speed=Math.hypot(q.vx,q.vy),angle=Math.atan2(q.vy,q.vx),desired=Math.atan2(target.y-q.y,target.x-q.x);
          const a=angle+clamp(wrap(desired-angle),-1.4*dt,1.4*dt);q.vx=Math.cos(a)*speed;q.vy=Math.sin(a)*speed;
        }
        q.x+=q.vx*dt;q.y+=q.vy*dt;
        if(!q.reflected&&q.reflectable!==false){
          const t=sweep(p.prevHeadX-q.prevX,p.prevHeadY-q.prevY,head.x-q.x,head.y-q.y,0,0,q.r+C.HEAD_RADIUS+3);
          if(t!==null){
            const dx=lerp(p.prevHeadX-q.prevX,head.x-q.x,t),dy=lerp(p.prevHeadY-q.prevY,head.y-q.y,t),d=Math.max(1,Math.hypot(dx,dy));
            const closing=(head.vx-q.vx)*dx/d+(head.vy-q.vy)*dy/d;
            if(Math.hypot(head.vx,head.vy)>135&&closing< -25){
              const desired=target?Math.atan2(target.y-q.y,target.x-q.x):Math.atan2(head.vy-q.vy,head.vx-q.vx);
              const raw=Math.atan2(head.vy-q.vy,head.vx-q.vx),angle=desired+clamp(wrap(raw-desired),-.18,.18);
              q.reflected=true;q.vx=Math.cos(angle)*650;q.vy=Math.sin(angle)*650;q.life=5;q.flash=1;
              this.ring(q.x,q.y,'#e8ffad',72,.3);this.burst(q.x,q.y,'#e8ffad',18,250);
              this.emit('reflect',{id:q.id,x:q.x,y:q.y,power:.9,ownerId:q.ownerId});
            }
          }
        }
        if(q.reflected&&target){
          if(sweep(q.prevX,q.prevY,q.x,q.y,target.x,target.y,target.r+q.r)!==null){
            if(q.ownerKind==='boss'&&target.kind==='bathmaster'){
              // A second return cannot prolong an existing opening.
              if(target.phase!=='venting'){
                this.bossPhase('venting',3);target.vulnerable=true;target.openCharges=2;target._ventMarks=0;
                this.ring(target.x,target.y,'#89fff0',160,.5);this.burst(target.x,target.y,'#c4fff2',32,300);
                this.emit('boss-open',{kind:target.kind,x:target.x,y:target.y,duration:3,segments:2});
              }
            }else if(q.ownerKind==='enemy')this.damageEnemy(target,2,.9,{x:q.prevX,y:q.prevY});
            this.removeShot(q);continue;
          }
        }else if(!q.reflected&&sweep(q.prevX,q.prevY,q.x,q.y,p.x,p.y,p.r+q.r)!==null){
          this.hurtPlayer(q);this.burst(q.x,q.y,q.reflectable?'#86dfe6':'#ff6b72',15,170);this.removeShot(q);continue;
        }
        let wallHit=false;
        if(q.ownerKind==='enemy')for(const w of s.walls)if(rectContact(q,q.r,w)){wallHit=true;break;}
        if(wallHit||q.life<=0||q.x<C.LEFT-q.r||q.x>C.RIGHT+q.r||q.y<C.TOP-q.r||q.y>C.BOTTOM+q.r){this.removeShot(q);}
      }
    }
    updateHazards(dt){
      const s=this.state,p=s.player;
      for(let i=s.hazards.length-1;i>=0;i--){
        const h=s.hazards[i];
        if(h.disabled){h.phase='disabled';continue;}
        if(h.transient){
          h.timer-=dt;
          if(h.timer<=0){if(h.phase==='warning'){h.phase='active';h.timer=h.activeDuration;}else{s.hazards.splice(i,1);continue;}}
        }else{
          const cycle=(s.roomTime+(h.offset||0))%h.cycle;
          h.phase=cycle<3.7?'idle':cycle<4.7?'warning':'active';
          h.timer=h.phase==='idle'?3.7-cycle:h.phase==='warning'?4.7-cycle:h.cycle-cycle;
        }
        if(h.phase==='active'&&Math.hypot(p.x-h.x,p.y-h.y)<p.r+h.r)this.hurtPlayer(h);
      }
    }
    enemyDirection(e,tx,ty,dt){
      const s=this.state;e.navTimer-=dt;
      if(!this.segmentBlocked(e.x,e.y,tx,ty,e.r+10)){e.nav=null;}
      else if(!e.nav||Math.hypot(e.x-e.nav.x,e.y-e.nav.y)<20||e.navTimer<=0){
        const corners=[];
        for(const w of s.walls){const margin=e.r+25;
          for(const x of [w.x-margin,w.x+w.w+margin])for(const y of [w.y-margin,w.y+w.h+margin]){
            if(x<C.LEFT+e.r||x>C.RIGHT-e.r||y<C.TOP+e.r||y>C.BOTTOM-e.r)continue;
            if(Math.hypot(x-e.x,y-e.y)<25||this.segmentBlocked(e.x,e.y,x,y,e.r+7))continue;
            corners.push({x,y,score:Math.hypot(x-e.x,y-e.y)+Math.hypot(tx-x,ty-y)+(this.segmentBlocked(x,y,tx,ty,e.r+7)?170:0)});
          }
        }
        corners.sort((a,b)=>a.score-b.score);e.nav=corners[0]||null;e.navTimer=.55;
      }
      const goal=e.nav||{x:tx,y:ty};let dx=goal.x-e.x,dy=goal.y-e.y,d=Math.max(1,Math.hypot(dx,dy));dx/=d;dy/=d;
      for(const other of s.enemies)if(other!==e&&!other.destroyed){const ox=e.x-other.x,oy=e.y-other.y,od=Math.hypot(ox,oy);if(od>0&&od<90){dx+=ox/od*(90-od)/45;dy+=oy/od*(90-od)/45;}}
      const mag=Math.max(1,Math.hypot(dx,dy));return{x:dx/mag,y:dy/mag};
    }
    updateEnemies(dt){
      const s=this.state,p=s.player;this._attackGap=Math.max(0,this._attackGap-dt);
      let active=s.enemies.filter(e=>!e.destroyed&&['windup','rush','aim'].includes(e.phase)).length+
        s.projectiles.filter(q=>q.ownerKind==='enemy'&&!q.reflected).length;
      for(const e of s.enemies){
        if(e.destroyed)continue;e.prevX=e.x;e.prevY=e.y;e.flash=Math.max(0,e.flash-dt*4);e.blockFlash=Math.max(0,(e.blockFlash||0)-dt*5);
        e.timer-=dt;e.telegraph=null;
        if(e.phase==='stunned'||e.phase==='recover'){
          e.vx*=Math.exp(-12*dt);e.vy*=Math.exp(-12*dt);
          if(e.timer<=0){e.phase='seek';e.timer=.35;}
        }else if(e.phase==='windup'){
          e.vx*=Math.exp(-20*dt);e.vy*=Math.exp(-20*dt);
          const distance=e.archetype==='guard'?176:368;
          e.telegraph={shape:'line',x1:e.x,y1:e.y,x2:e.x+Math.cos(e.angle)*distance,y2:e.y+Math.sin(e.angle)*distance,width:e.r*2};
          if(e.timer<=0){e.phase='rush';e.timer=e.archetype==='guard'?.28:.46;const speed=e.archetype==='guard'?630:800;e.vx=Math.cos(e.angle)*speed;e.vy=Math.sin(e.angle)*speed;}
        }else if(e.phase==='aim'){
          e.vx*=Math.exp(-20*dt);e.vy*=Math.exp(-20*dt);
          e.telegraph={shape:'line',x1:e.x,y1:e.y,x2:e.x+Math.cos(e.angle)*670,y2:e.y+Math.sin(e.angle)*670,width:60,reflectable:true};
          if(e.timer<=0){this.launchShot(e,e.angle,true,320);e.phase='recover';e.timer=1.35;}
        }else if(e.phase==='rush'){
          if(e.timer<=0){e.phase='recover';e.timer=.85;e.vx*=.15;e.vy*=.15;}
        }else{
          const dx=p.x-e.x,dy=p.y-e.y,d=Math.max(1,Math.hypot(dx,dy));
          e.angle=wrap(e.angle+clamp(wrap(Math.atan2(dy,dx)-e.angle),-(e.archetype==='guard'?2.4:5)*dt,(e.archetype==='guard'?2.4:5)*dt));
          let tx=p.x,ty=p.y,speed=e.archetype==='guard'?125:e.archetype==='thrower'?140:175;
          if(e.archetype==='thrower'){
            const desired=420;tx=p.x-dx/d*desired;ty=p.y-dy/d*desired;
            const drift=Math.sin(s.roomTime*.8+Number(e.id.slice(-1)))*60;tx+=-dy/d*drift;ty+=dx/d*drift;
          }else if(d<(e.archetype==='guard'?130:100))speed=0;
          const direction=this.enemyDirection(e,clamp(tx,C.LEFT+e.r,C.RIGHT-e.r),clamp(ty,C.TOP+e.r,C.BOTTOM-e.r),dt);
          const blend=1-Math.exp(-10*dt);e.vx=lerp(e.vx,direction.x*speed,blend);e.vy=lerp(e.vy,direction.y*speed,blend);
          const range=e.archetype==='guard'?300:e.archetype==='thrower'?620:510;
          if(d<range&&d>(e.archetype==='thrower'?170:0)&&e.timer<=0&&s.roomTime>=1.4&&active<2&&this._attackGap<=0&&this.visibleActor(e)&&!this.segmentBlocked(e.x,e.y,p.x,p.y,8)){
            e.phase=e.archetype==='thrower'?'aim':'windup';e.timer=e.archetype==='thrower'?.9:.85;
            e.angle=Math.atan2(p.y+p.vy*.09-e.y,p.x+p.vx*.09-e.x);this._attackGap=.48;active++;
            this.emit('enemy-windup',{id:e.id,archetype:e.archetype,x:e.x,y:e.y,angle:e.angle,duration:e.timer});
          }
        }
        e.x+=e.vx*dt;e.y+=e.vy*dt;
        let blocked=bounded(e,e.r,.1);for(const w of s.walls)blocked=rectContact(e,e.r,w,.1)||blocked;
        if(blocked&&e.phase==='rush'){e.phase='recover';e.timer=.9;e.vx=e.vy=0;}
        if(e.phase==='rush'){
          for(const o of s.objects)if(!o.destroyed&&Math.hypot(e.x-o.x,e.y-o.y)<e.r+o.r){
            this.damageObject(o,1,.45,e.vx,e.vy);if(!o.destroyed){circleContact(e,e.r,o,.1);e.phase='recover';e.timer=.7;break;}
          }
          if(Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r){this.hurtPlayer(e);e.phase='recover';e.timer=.85;e.vx*=-.15;e.vy*=-.15;}
        }
        circleContact(p,p.r,e);
      }
      this.settlePlayerBody();s.enemiesRemaining=s.enemies.filter(e=>!e.destroyed).length;
      s.combat.activeAttacks=s.enemies.filter(e=>!e.destroyed&&['windup','rush','aim'].includes(e.phase)).length+
        s.projectiles.filter(q=>q.ownerKind==='enemy'&&!q.reflected).length;
      s.combat.nextAttackIn=this._attackGap;
    }
    hitEnemies(){
      const s=this.state,p=s.player,head=p.rope.nodes[p.rope.nodes.length-1];
      for(const e of s.enemies){
        if(e.destroyed)continue;const radius=C.HEAD_RADIUS+e.r+4;
        if(Math.hypot(head.x-e.x,head.y-e.y)>radius+14&&Math.hypot(p.prevHeadX-e.prevX,p.prevHeadY-e.prevY)>radius+14)e._contact=false;
        const t=sweep(p.prevHeadX-e.prevX,p.prevHeadY-e.prevY,head.x-e.x,head.y-e.y,0,0,radius);
        if(t===null)continue;
        if(t===0&&Math.hypot(head.x-e.x,head.y-e.y)>=radius)continue;
        let nx=lerp(p.prevHeadX-e.prevX,head.x-e.x,t),ny=lerp(p.prevHeadY-e.prevY,head.y-e.y,t),n=Math.hypot(nx,ny);
        if(n<1e-6){nx=-Math.cos(p.angle);ny=-Math.sin(p.angle);}else{nx/=n;ny/=n;}
        const speed=Math.hypot(head.vx-e.vx,head.vy-e.vy),vn=(head.vx-e.vx)*nx+(head.vy-e.vy)*ny;
        const front=e.shield&&nx*Math.cos(e.angle)+ny*Math.sin(e.angle)>-.15;
        if(!e._contact&&speed>180&&vn< -20){
          e._contact=true;
          const landed=this.damageEnemy(e,speed>1900?3:speed>700?2:1,clamp(speed/2200,0,1),{x:e.x+nx*(e.r+10),y:e.y+ny*(e.r+10)});
          if(landed&&!e.destroyed){e.vx=-nx*230;e.vy=-ny*230;e.phase='stunned';e.timer=.6;}
        }
        if(front&&!e.destroyed){
          this.projectSolidContact(head,e,nx,ny);const normal=head.vx*nx+head.vy*ny;if(normal<0){head.vx-=1.25*normal*nx;head.vy-=1.25*normal*ny;}
        }else{head.vx*=.88;head.vy*=.88;}
      }
      this.syncWeight();
    }
    damageEnemy(e,damage,power,source=null){
      if(e.destroyed)return false;
      if(e.shield&&source){
        const dx=source.x-e.x,dy=source.y-e.y,d=Math.max(1,Math.hypot(dx,dy));
        if((dx*Math.cos(e.angle)+dy*Math.sin(e.angle))/d>-.15){
          e.blockFlash=1;
          if(this.state.time-e._blockTime>.15){e._blockTime=this.state.time;this.burst(e.x,e.y,'#ffe1b7',8,150);this.emit('enemy-block',{id:e.id,x:e.x,y:e.y,power});}
          return false;
        }
      }
      e.hp=Math.max(0,e.hp-damage);e.flash=1;this.burst(e.x,e.y,palette.drone,10,150+power*200);
      this.emit('hit',{id:e.id,x:e.x,y:e.y,kind:'drone',archetype:e.archetype,power,hp:e.hp,damage});
      if(e.hp===0){
        e.destroyed=true;e.vx=e.vy=0;e.telegraph=null;this.state.score+=250;
        this.state.projectiles=this.state.projectiles.filter(q=>q.ownerId!==e.id||q.reflected);
        this.burst(e.x,e.y,palette.drone,24,360);this.ring(e.x,e.y,palette.drone,65,.3);
        this.emit('break',{id:e.id,x:e.x,y:e.y,kind:'drone',archetype:e.archetype,power,score:this.state.score,earned:250});
        this.state.enemiesRemaining=this.state.enemies.filter(other=>!other.destroyed).length;
        if(!this.state.boss&&this.state.destroyed>=this.state.required)this.openExit();
      }
      return true;
    }
    hurtPlayer(enemy){
      const s=this.state,p=s.player;
      if(this.options.practice||p.invulnerable>0||s.phase!=='play')return;
      p.hp=Math.max(0,p.hp-1);p.invulnerable=1.15;p.flash=1;s.shake=9;
      this.burst(p.x,p.y,'#ff7a83',18,260);this.emit('hurt',{x:p.x,y:p.y,hp:p.hp,enemyId:enemy.id});
      if(p.hp===0){s.phase='dead';this.emit('dead',{x:p.x,y:p.y,score:s.score});}
    }
    checkExit(){
      const s=this.state,p=s.player,e=s.exit;
      if(s.phase!=='play'||!e.open||p.x+p.r<e.x||p.x-p.r>e.x+e.w||p.y+p.r<e.y||p.y-p.r>e.y+e.h)return;
      if(this.options.practice){
        this.loadRoom(0,4);s.phase='play';this.emit('room',{name:s.roomName,required:s.required,practice:true});
      }else if(s.encounter!==null){
        s.phase='won';this.burst(p.x,p.y,'#e6ff8b',60,500);this.emit('win',{score:s.score,x:p.x,y:p.y,encounter:s.encounter});
      }else if(s.roomIndex<rooms.length-1){
        const hp=Math.min(p.maxHp,p.hp+1);this.loadRoom(s.roomIndex+1,hp);s.phase='play';
        this.emit('room',{name:s.roomName,required:s.required,hp});
        if(s.boss)this.emit('boss-start',{kind:s.boss.kind,name:s.boss.name});
      }else{s.phase='won';this.burst(p.x,p.y,'#e6ff8b',60,500);this.emit('win',{score:s.score,x:p.x,y:p.y});}
    }

    step(dt,input){
      const s=this.state;s.time+=dt;this.updateEffects(dt);
      s.shake=Math.max(0,s.shake-24*dt);s.hitStop=Math.max(0,s.hitStop-dt);
      if(s.phase==='dead'||s.phase==='won')return;
      this.movePlayer(dt,input);
      if(s.phase!=='play')return;
      s.roomTime+=dt;
      if(s.comboTimer>0){s.comboTimer=Math.max(0,s.comboTimer-dt);if(s.comboTimer===0)s.combo=0;}
      for(const o of s.objects)o.flash=Math.max(0,o.flash-dt*4);
      this.hitObjects(dt);this.updateEnemies(dt);
      if(s.phase==='play'){this.hitEnemies();this.updateBoss(dt);}
      if(s.phase==='play'){this.hitBoss();this.updateProjectiles(dt);this.updateHazards(dt);this.checkExit();}
    }
    burst(x,y,color,count,speed,carryX=0,carryY=0){
      const list=this.state.particles;
      for(let i=0;i<count;i++){
        const a=this.random()*Math.PI*2,v=speed*(.2+this.random()*.8),life=.3+this.random()*.55;
        list.push({x,y,vx:Math.cos(a)*v+carryX,vy:Math.sin(a)*v+carryY,life,maxLife:life,
          size:2+this.random()*5,color,angle:this.random()*Math.PI,spin:(this.random()-.5)*16});
      }
      if(list.length>560)list.splice(0,list.length-560);
    }
    ring(x,y,color,maxR,life){this.state.rings.push({x,y,r:8,maxR,life,maxLife:life,color});}
    updateEffects(dt){
      const s=this.state;
      for(let i=s.particles.length-1;i>=0;i--){
        const p=s.particles[i];p.life-=dt;if(p.life<=0){s.particles.splice(i,1);continue;}
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-4*dt);p.vy*=Math.exp(-4*dt);p.angle+=p.spin*dt;
      }
      for(let i=s.rings.length-1;i>=0;i--){
        const r=s.rings[i];r.life-=dt;if(r.life<=0){s.rings.splice(i,1);continue;}r.r=lerp(8,r.maxR,1-r.life/r.maxLife);
      }
    }
  }
  root.WreckPhysics=Object.freeze({Match,constants:C});
})(globalThis);
