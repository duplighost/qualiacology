import * as THREE from 'three';

/**
 * Last Chorus — world-space hoverboard wakes.
 *
 * const wake = new BoardTrail(scene, board, 'stained-saint');
 * wake.update(deltaSeconds, { speed: 18, beat: 0.8, boost: 0.4, airborne: true });
 * wake.reset();   // respawn, seek, or another discontinuity
 * wake.dispose();
 *
 * Geometry and materials belong to the effect, not to the board. A wake is
 * deliberately not a child of the rider: its old samples stay in the world.
 * Y is up; a board travels toward local -Z. `trail_left` / `trail_right` empty
 * objects are used when present. There are no image, DOM, or audio dependencies.
 * `beat` is an externally supplied 0..1 envelope, not an internal fake beat.
 */

export const TRAIL_PRESETS = Object.freeze({
  'stained-saint': Object.freeze({ name: 'Prism Requiem', style: 0, colors: ['#fa4dbe', '#52ddff', '#f3d475'], life: 1.55, rate: 82, particleLife: 1.3, size: .13, width: .025, gravity: -.20, description: 'Three spectral filaments and tumbling, faceted glass shards.' }),
  'afterburn': Object.freeze({ name: 'Redline', style: 1, colors: ['#ff4427', '#ffb13c', '#ff38ac'], life: 1.15, rate: 132, particleLife: .92, size: .16, width: .065, gravity: .44, description: 'Intertwined hot-core flames, violet exhaust, and needle sparks.' }),
  'razor-bloom': Object.freeze({ name: 'Petal Riot', style: 2, colors: ['#ff3b92', '#ffc1dc', '#bf52ff'], life: 1.65, rate: 72, particleLife: 1.65, size: .16, width: .11, gravity: -.13, description: 'A sweeping satin wake shedding rotating rose petals.' }),
  'deep-cut': Object.freeze({ name: 'Soundwave', style: 3, colors: ['#41ffe4', '#cdff55', '#68a6ff'], life: 1.4, rate: 54, particleLife: 1.2, size: .19, width: .023, gravity: .04, description: 'Paired oscilloscope waves, expanding beat rings, and equalizer ticks.' }),
  'midnight-koi': Object.freeze({ name: 'Moonwake', style: 4, colors: ['#65b5ff', '#ffd87c', '#9cdfff'], life: 1.65, rate: 68, particleLife: 1.3, size: .105, width: .07, gravity: -.65, description: 'Sinuous blue-and-gold water wakes, droplets, and fine ripples.' }),
  'ghost-orchid': Object.freeze({ name: 'Phantom Silk', style: 5, colors: ['#d8d2ff', '#8bcfff', '#fff0fa'], life: 1.8, rate: 47, particleLife: 1.9, size: .22, width: .17, gravity: .16, description: 'A translucent silken veil and softly drifting moth silhouettes.' }),
  'lovebite': Object.freeze({ name: 'Heartbreaker', style: 6, colors: ['#ff4a99', '#ffb8d5', '#d768ff'], life: 1.45, rate: 66, particleLife: 1.4, size: .16, width: .031, gravity: .18, description: 'Split-heart sparks and two crossing electric threads.' }),
  'dead-channel': Object.freeze({ name: 'Signal Loss', style: 7, colors: ['#bcff32', '#45f9e7', '#ebffbd'], life: 1.2, rate: 88, particleLife: 1.1, size: .095, width: .043, gravity: -.32, description: 'Broken digital strips, quantized turns, and falling pixel fragments.' })
});

const ribbonVertex = /* glsl */`
attribute vec3 color;
attribute vec3 aEdge;
attribute float aFade;
uniform float uGlow;
varying vec3 vColor;
varying vec2 vUv;
varying float vFade;
void main(){
  vColor=color; vUv=uv; vFade=aFade;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position+aEdge*uGlow*3.0,1.0);
}`;

const ribbonFragment = /* glsl */`
uniform float uTime;
uniform float uGlow;
uniform int uStyle;
varying vec3 vColor;
varying vec2 vUv;
varying float vFade;
void main(){
  float edge=abs(vUv.y);
  float core=pow(max(0.0,1.0-edge),uGlow>0.5?2.5:.7);
  float detail=1.0;
  if(uStyle==0){ detail=.75+.25*sin(vUv.x*43.0-uTime*5.0); }
  else if(uStyle==1){ detail=.70+.30*sin(vUv.x*65.0-uTime*13.0+edge*4.0); }
  else if(uStyle==2){ detail=.65+.35*pow(abs(sin(vUv.x*24.0-uTime*2.0+vUv.y*3.0)),2.0); }
  else if(uStyle==3){ detail=.68+.32*step(.5,fract(vUv.x*34.0-uTime*.4)); }
  else if(uStyle==4){ detail=.7+.3*sin(vUv.x*38.0-uTime*2.0+vUv.y*7.0); }
  else if(uStyle==5){ detail=.46+.4*pow(abs(sin(vUv.x*17.0-uTime*1.6+vUv.y*4.0)),2.0); }
  else if(uStyle==6){ detail=.65+.35*sin(vUv.x*95.0-uTime*9.0); }
  else if(uStyle==7){ detail=step(.23,fract(vUv.x*28.0-uTime*.2)); }
  float alpha=core*vFade*detail*(uGlow>.5?.22:.77);
  if(alpha<.003) discard;
  vec3 col=vColor;
  if(uGlow<.5) col=mix(col,vec3(1.0),pow(max(0.0,1.0-edge*4.0),3.0)*.34);
  gl_FragColor=vec4(col,alpha);
  #include <colorspace_fragment>
}`;

const particleVertex = /* glsl */`
attribute vec3 aVelocity;
attribute vec3 color;
attribute float aBirth;
attribute float aLife;
attribute float aSize;
attribute float aSeed;
uniform float uTime;
uniform float uViewportHeight;
uniform float uGravity;
uniform int uStyle;
varying vec3 vColor;
varying float vAge;
varying float vSeed;
varying float vRotation;
void main(){
  float age=uTime-aBirth;
  float alive=step(0.0,age)*step(age,aLife);
  vAge=clamp(age/max(aLife,.001),0.0,1.0);
  vSeed=aSeed; vColor=color;
  vec3 p=position+aVelocity*age;
  p.y+=uGravity*age*age*.5;
  if(uStyle==0 || uStyle==2 || uStyle==5){
    p.x+=sin(age*3.7+aSeed*33.0)*age*.055;
    p.z+=cos(age*2.8+aSeed*17.0)*age*.045;
  }
  if(uStyle==7){ p.x+=floor(age*10.0)*.009*sin(aSeed*70.0); }
  vRotation=aSeed*6.28318+age*(uStyle==4?.25:(uStyle==7?0.0:2.6))*(aSeed-.35);
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  float s=aSize;
  if(uStyle==1) s*=1.15-vAge*.85;
  else if(uStyle==3) s*=.5+vAge*1.7;
  else if(uStyle==5) s*=.65+sin(vAge*3.14159)*.55;
  gl_PointSize=clamp(s*uViewportHeight*projectionMatrix[1][1]/max(.1,-mv.z*2.0),1.0,110.0)*alive;
  gl_Position=projectionMatrix*mv;
  if(alive<.5) gl_Position=vec4(2.0,2.0,2.0,1.0);
}`;

const particleFragment = /* glsl */`
uniform int uStyle;
uniform float uTime;
varying vec3 vColor;
varying float vAge;
varying float vSeed;
varying float vRotation;
float ellipse(vec2 p,vec2 r){return length(p/r)-1.0;}
void main(){
  vec2 p=gl_PointCoord*2.0-1.0;
  p.y=-p.y;
  float cs=cos(vRotation), sn=sin(vRotation);
  p=mat2(cs,-sn,sn,cs)*p;
  float d=0.0;
  float detail=1.0;
  vec3 col=vColor;
  if(uStyle==0){
    // A sharp, genuinely triangular shard with two colored facets.
    d=max(abs(p.x)*.91+p.y*.45-.40,-p.y-.70);
    detail=.55+.45*step(p.x*.5,p.y);
    col=mix(col,vec3(.88,.95,1.0),.32*step(p.y,-p.x*.7));
  }else if(uStyle==1){
    if(vSeed>.69){d=ellipse(p,vec2(.09,.87));detail=1.0;}
    else{
      p.x+=sin(p.y*7.0+uTime*5.0+vSeed*19.0)*.07*(p.y+.9);
      d=ellipse(p-vec2(0.0,-.16),vec2(.46*(1.0-p.y*.53),.78));
      col=mix(col,vec3(1.0,.86,.53),max(0.0,1.0-length(p*2.2))*.72);
    }
  }else if(uStyle==2){
    // Curved, tapered petals, with a light central crease.
    p.x+=p.y*p.y*.30;
    d=ellipse(p,vec2(.53*(1.0-p.y*.42),.83));
    detail=.5+.5*smoothstep(.0,.27,abs(p.x+p.y*.13));
    col=mix(col,vec3(1.0,.82,.92),.26*(1.0-smoothstep(-.3,.3,p.x)));
  }else if(uStyle==3){
    if(vSeed>.66){d=max(abs(p.x)-.12,abs(p.y)-.78);}
    else{d=abs(length(p)-.65)-.065;detail=.65+.35*step(.15,abs(p.x));}
  }else if(uStyle==4){
    if(vSeed>.76) d=abs(length(p)-.65)-.07;
    else{p.x*=1.0+.55*p.y; d=ellipse(p-vec2(0.0,-.12),vec2(.43,.74));}
    col=mix(col,vec3(.85,.98,1.0),.45*max(0.0,1.0-length(p-vec2(-.15,.15))*3.0));
  }else if(uStyle==5){
    // Four soft wings and a tiny luminous body; no external particle atlas.
    float flap=.75+.2*sin(uTime*8.0+vSeed*20.0);
    p.x/=flap;
    float a=ellipse(vec2(abs(p.x)-.35,p.y-.22),vec2(.40,.43));
    float b=ellipse(vec2(abs(p.x)-.25,p.y+.30),vec2(.29,.35));
    d=min(min(a,b),ellipse(p,vec2(.075,.61)));
    detail=.42+.55*pow(abs(sin(p.x*7.0+p.y*3.0)),1.5);
    col=mix(col,vec3(1.0),.40*max(0.0,1.0-abs(p.x)*3.0));
  }else if(uStyle==6){
    // Implicit heart, visibly split by a narrow lightning-shaped fracture.
    p.y+=.08;
    float a=dot(p,p)-.49;
    float h=a*a*a-p.x*p.x*p.y*p.y*p.y;
    d=h*4.0;
    detail=smoothstep(.015,.045,abs(p.x+.04*sin(p.y*19.0)));
  }else{
    d=max(abs(p.x)-.69,abs(p.y)-.69);
    if(vSeed>.45) d=max(d,-max(abs(p.x)-.42,abs(p.y)-.42));
    detail=.60+.40*step(0.0,p.y);
  }
  float aa=max(fwidth(d),.012);
  float shape=1.0-smoothstep(-aa,aa,d);
  float fade=pow(max(0.0,1.0-vAge),1.35)*smoothstep(0.0,.055,vAge);
  float alpha=shape*fade*detail*.84;
  if(alpha<.005) discard;
  gl_FragColor=vec4(col,alpha);
  #include <colorspace_fragment>
}`;

function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }

export class BoardTrail {
  constructor(scene, boardObject, id = 'stained-saint', options = {}) {
    if (!scene?.add || !boardObject?.updateWorldMatrix) throw new TypeError('BoardTrail requires a Three.js scene and board Object3D.');
    if (!TRAIL_PRESETS[id]) throw new RangeError(`Unknown hoverboard trail: ${id}`);
    this.id = id;
    this.preset = TRAIL_PRESETS[id];
    this.board = boardObject;
    this.scene = scene;
    this.quality = options.quality === 'low' ? 'low' : 'high';
    this.scale = Math.max(.05, Number(options.scale) || 1);
    this._low = this.quality === 'low';
    this._historyMax = this._low ? 88 : 168;
    this._particleMax = this._low ? 112 : 320;
    this._interval = this._low ? 1 / 40 : 1 / 80;
    this._seed = (Number(options.seed) || 173).toString().split('').reduce((n, c) => ((n * 31 + c.charCodeAt(0)) >>> 0), 83123);
    this._time = 0;
    this._sampleClock = 0;
    this._emitClock = 0;
    this._count = 0;
    this._head = -1;
    this._particleHead = 0;
    this._started = false;
    this._disposed = false;
    this._lastBeat = 0;
    this._beatCooldown = 0;
    this._history = new Float32Array(this._historyMax * 11);
    this._colors = this.preset.colors.map(c => new THREE.Color(c));
    this._leftAnchor = boardObject.getObjectByName('trail_left');
    this._rightAnchor = boardObject.getObjectByName('trail_right');
    this._left = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._center = new THREE.Vector3();
    this._lastCenter = new THREE.Vector3();
    this._side = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._back = new THREE.Vector3();
    this._worldScale = new THREE.Vector3();
    this._rotation = new THREE.Quaternion();
    this._bufferSize = new THREE.Vector2();
    this.group = new THREE.Group();
    this.group.name = `wake_${id}`;
    scene.add(this.group);
    this._makeRibbons();
    this._makeParticles();
    this.stats = { drawCalls: 3, maxParticles: this._particleMax, historySamples: 0, emitting: false };
  }

  _random() {
    this._seed = (Math.imul(1664525, this._seed) + 1013904223) >>> 0;
    return this._seed / 4294967296;
  }

  _makeRibbons() {
    const count = this._historyMax * 2 * 3;
    this._ribbonPositions = new Float32Array(count * 3);
    this._ribbonColors = new Float32Array(count * 3);
    this._ribbonEdges = new Float32Array(count * 3);
    this._ribbonUV = new Float32Array(count * 2);
    this._ribbonFades = new Float32Array(count);
    const indices = [];
    for (let lane = 0; lane < 3; lane++) {
      const offset = lane * this._historyMax * 2;
      const color = this._colors[lane];
      for (let i = 0; i < this._historyMax; i++) {
        for (let e = 0; e < 2; e++) {
          const vertex = offset + i * 2 + e;
          this._ribbonColors[vertex * 3] = color.r;
          this._ribbonColors[vertex * 3 + 1] = color.g;
          this._ribbonColors[vertex * 3 + 2] = color.b;
        }
        if (i < this._historyMax - 1) {
          const j = offset + i * 2;
          indices.push(j, j + 1, j + 2, j + 2, j + 1, j + 3);
        }
      }
    }
    this._ribbonGeometry = new THREE.BufferGeometry();
    this._ribbonGeometry.setAttribute('position', new THREE.BufferAttribute(this._ribbonPositions, 3).setUsage(THREE.DynamicDrawUsage));
    this._ribbonGeometry.setAttribute('color', new THREE.BufferAttribute(this._ribbonColors, 3));
    this._ribbonGeometry.setAttribute('aEdge', new THREE.BufferAttribute(this._ribbonEdges, 3).setUsage(THREE.DynamicDrawUsage));
    this._ribbonGeometry.setAttribute('uv', new THREE.BufferAttribute(this._ribbonUV, 2).setUsage(THREE.DynamicDrawUsage));
    this._ribbonGeometry.setAttribute('aFade', new THREE.BufferAttribute(this._ribbonFades, 1).setUsage(THREE.DynamicDrawUsage));
    this._ribbonGeometry.setIndex(indices);
    this._ribbonUniforms = { uTime: { value: 0 }, uGlow: { value: 0 }, uStyle: { value: this.preset.style } };
    const common = { vertexShader: ribbonVertex, fragmentShader: ribbonFragment, transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false };
    this._ribbonMaterial = new THREE.ShaderMaterial({ ...common, uniforms: this._ribbonUniforms });
    this._glowMaterial = new THREE.ShaderMaterial({ ...common, uniforms: { uTime: this._ribbonUniforms.uTime, uGlow: { value: 1 }, uStyle: this._ribbonUniforms.uStyle } });
    this._ribbon = new THREE.Mesh(this._ribbonGeometry, this._ribbonMaterial);
    this._glow = new THREE.Mesh(this._ribbonGeometry, this._glowMaterial);
    this._ribbon.name = `${this.id}_ribbon`;
    this._glow.name = `${this.id}_soft_light`;
    this._ribbon.frustumCulled = this._glow.frustumCulled = false;
    this._ribbon.renderOrder = 12;
    this._glow.renderOrder = 11;
    this.group.add(this._glow, this._ribbon);
  }

  _makeParticles() {
    const n = this._particleMax;
    this._pPosition = new Float32Array(n * 3);
    this._pVelocity = new Float32Array(n * 3);
    this._pColors = new Float32Array(n * 3);
    this._pBirth = new Float32Array(n).fill(-100);
    this._pLife = new Float32Array(n).fill(1);
    this._pSize = new Float32Array(n);
    this._pSeed = new Float32Array(n);
    this._particleGeometry = new THREE.BufferGeometry();
    const attributes = { position: [this._pPosition, 3], aVelocity: [this._pVelocity, 3], color: [this._pColors, 3], aBirth: [this._pBirth, 1], aLife: [this._pLife, 1], aSize: [this._pSize, 1], aSeed: [this._pSeed, 1] };
    for (const [name, pair] of Object.entries(attributes)) this._particleGeometry.setAttribute(name, new THREE.BufferAttribute(pair[0], pair[1]).setUsage(THREE.DynamicDrawUsage));
    this._particleAttributes = Object.values(this._particleGeometry.attributes);
    this._particleUniforms = { uTime: this._ribbonUniforms.uTime, uViewportHeight: { value: 900 }, uGravity: { value: this.preset.gravity * this.scale }, uStyle: this._ribbonUniforms.uStyle };
    this._particleMaterial = new THREE.ShaderMaterial({ vertexShader: particleVertex, fragmentShader: particleFragment, uniforms: this._particleUniforms, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, toneMapped: false });
    this._particles = new THREE.Points(this._particleGeometry, this._particleMaterial);
    this._particles.name = `${this.id}_particles`;
    this._particles.frustumCulled = false;
    this._particles.renderOrder = 13;
    this._particles.onBeforeRender = renderer => {
      renderer.getDrawingBufferSize(this._bufferSize);
      this._particleUniforms.uViewportHeight.value = this._bufferSize.y;
    };
    this.group.add(this._particles);
  }

  _pose() {
    this.board.updateWorldMatrix(true, false);
    this.board.getWorldQuaternion(this._rotation);
    this.board.getWorldScale(this._worldScale);
    this._side.set(1, 0, 0).applyQuaternion(this._rotation);
    this._up.set(0, 1, 0).applyQuaternion(this._rotation);
    this._back.set(0, 0, 1).applyQuaternion(this._rotation);
    if (this._leftAnchor && this._rightAnchor) {
      this._leftAnchor.getWorldPosition(this._left);
      this._rightAnchor.getWorldPosition(this._right);
    } else {
      this._left.set(-.18, -.07, .84).applyMatrix4(this.board.matrixWorld);
      this._right.set(.18, -.07, .84).applyMatrix4(this.board.matrixWorld);
    }
    this._center.copy(this._left).add(this._right).multiplyScalar(.5);
    this._effectiveScale = this.scale * Math.max(.05, (Math.abs(this._worldScale.x) + Math.abs(this._worldScale.y) + Math.abs(this._worldScale.z)) / 3);
    this._particleUniforms.uGravity.value = this.preset.gravity * this._effectiveScale;
  }

  _sample(fraction, birthTime, strength) {
    this._head = (this._head + 1) % this._historyMax;
    this._count = Math.min(this._count + 1, this._historyMax);
    const h = this._history, j = this._head * 11;
    h[j] = this._lastCenter.x + (this._center.x - this._lastCenter.x) * fraction;
    h[j + 1] = this._lastCenter.y + (this._center.y - this._lastCenter.y) * fraction;
    h[j + 2] = this._lastCenter.z + (this._center.z - this._lastCenter.z) * fraction;
    h[j + 3] = this._side.x; h[j + 4] = this._side.y; h[j + 5] = this._side.z;
    h[j + 6] = this._up.x; h[j + 7] = this._up.y; h[j + 8] = this._up.z;
    h[j + 9] = birthTime; h[j + 10] = strength;
  }

  _particle(fraction, beat, boost, airborne) {
    const n = this._particleHead;
    this._particleHead = (n + 1) % this._particleMax;
    const j = n * 3, s = this._effectiveScale;
    const side = (this._random() - .5) * .40 * s;
    const height = (this._random() - .5) * .10 * s;
    const spread = this.preset.style === 5 ? .40 : (this.preset.style === 1 ? .23 : .56);
    const vx = (this._random() - .5) * spread * s;
    const vy = (this._random() - .4) * .29 * s + (airborne ? .08 * s : 0);
    const vz = (.12 + this._random() * .44) * s;
    this._pPosition[j] = this._lastCenter.x + (this._center.x - this._lastCenter.x) * fraction + this._side.x * side + this._up.x * height;
    this._pPosition[j + 1] = this._lastCenter.y + (this._center.y - this._lastCenter.y) * fraction + this._side.y * side + this._up.y * height;
    this._pPosition[j + 2] = this._lastCenter.z + (this._center.z - this._lastCenter.z) * fraction + this._side.z * side + this._up.z * height;
    this._pVelocity[j] = this._side.x * vx + this._up.x * vy + this._back.x * vz;
    this._pVelocity[j + 1] = this._side.y * vx + this._up.y * vy + this._back.y * vz;
    this._pVelocity[j + 2] = this._side.z * vx + this._up.z * vy + this._back.z * vz;
    const color = this._colors[Math.floor(this._random() * 3)];
    this._pColors[j] = color.r; this._pColors[j + 1] = color.g; this._pColors[j + 2] = color.b;
    this._pBirth[n] = this._time;
    this._pLife[n] = this.preset.particleLife * (.65 + this._random() * .55);
    this._pSize[n] = this.preset.size * s * (.65 + this._random() * .65) * (1 + beat * .25 + boost * .2);
    this._pSeed[n] = this._random();
  }

  _buildRibbon() {
    const h = this._history, p = this._ribbonPositions, edges = this._ribbonEdges, uv = this._ribbonUV, fade = this._ribbonFades;
    const style = this.preset.style, count = this._historyMax, life = this.preset.life, s = this._effectiveScale;
    for (let lane = 0; lane < 3; lane++) {
      for (let i = 0; i < count; i++) {
        const vertex = (lane * count + i) * 2;
        if (i >= this._count) {
          fade[vertex] = fade[vertex + 1] = 0;
          // Collapse unused segments to the previous pair. Leaving them at the
          // origin would briefly draw a giant triangle while a new wake fills.
          if (i > 0) for (let e = 0; e < 2; e++) {
            const k = (vertex + e) * 3, prev = k - 6;
            p[k] = p[prev]; p[k + 1] = p[prev + 1]; p[k + 2] = p[prev + 2];
            edges[k] = edges[prev]; edges[k + 1] = edges[prev + 1]; edges[k + 2] = edges[prev + 2];
          }
          continue;
        }
        const hi = ((this._head - i + count) % count) * 11;
        const age = Math.max(0, this._time - h[hi + 9]), a = age / life;
        const phase = age * 10 - h[hi + 9] * 4;
        let side = (lane - 1) * .15, up = 0, width = this.preset.width;
        if (style === 0) { side += Math.sin(phase + lane * 2.1) * .025; up = Math.sin(phase * .8 + lane * 2) * .025; }
        else if (style === 1) {
          side = lane === 2 ? 0 : Math.sin(phase * 1.25 + lane * Math.PI) * .105;
          up = lane === 2 ? 0 : Math.cos(phase * 1.25 + lane * Math.PI) * .065;
          width *= lane === 2 ? .35 : 1.0;
        } else if (style === 2) {
          side = (lane - 1) * .17 + Math.sin(phase * .65) * .07;
          up = Math.cos(phase * .45 + lane) * .035;
          width *= lane === 1 ? 1 : .16;
        } else if (style === 3) {
          side = lane === 2 ? 0 : (lane === 0 ? -1 : 1) * (.14 + Math.sin(phase * 1.65) * .095);
          up = lane === 2 ? Math.sin(phase * 2) * .02 : Math.cos(phase * 1.65) * .045;
          width *= lane === 2 ? .45 : 1;
        } else if (style === 4) {
          side = (lane - 1) * .15 + Math.sin(phase * .48 + lane * 1.3) * .08;
          up = Math.sin(phase * .65 + lane * 1.8) * .035;
          width *= lane === 1 ? .3 : .8;
        } else if (style === 5) {
          side = (lane - 1) * .095 + Math.sin(phase * .42 + lane * 2) * .075;
          up = Math.sin(phase * .55 + lane) * .07 + age * .045;
          width *= lane === 1 ? 1 : .55;
        } else if (style === 6) {
          side = lane === 2 ? Math.sin(phase * 8.0) * .015 : Math.cos(phase * 1.2 + lane * Math.PI) * .16;
          up = lane === 2 ? 0 : Math.sin(phase * 1.2 + lane * Math.PI) * .04;
          width *= lane === 2 ? .3 : 1;
        } else {
          side = (lane - 1) * .14 + Math.floor(Math.sin(phase * 1.1 + lane) * 3) * .028;
          up = Math.floor(Math.cos(phase + lane) * 2) * .02;
          width *= lane === 1 ? .4 : 1;
        }
        width *= s * (.6 + h[hi + 10] * .4) * Math.max(.06, 1 - a * .82);
        side *= s; up *= s;
        const opacity = a < 1 ? Math.pow(1 - a, 1.45) * h[hi + 10] : 0;
        for (let e = 0; e < 2; e++) {
          const v = vertex + e, k = v * 3, w = side + (e === 0 ? -width : width);
          p[k] = h[hi] + h[hi + 3] * w + h[hi + 6] * up;
          p[k + 1] = h[hi + 1] + h[hi + 4] * w + h[hi + 7] * up;
          p[k + 2] = h[hi + 2] + h[hi + 5] * w + h[hi + 8] * up;
          const edge = e === 0 ? -width : width;
          edges[k] = h[hi + 3] * edge; edges[k + 1] = h[hi + 4] * edge; edges[k + 2] = h[hi + 5] * edge;
          uv[v * 2] = a; uv[v * 2 + 1] = e === 0 ? -1 : 1;
          fade[v] = opacity;
        }
      }
    }
    this._ribbonGeometry.attributes.position.needsUpdate = true;
    this._ribbonGeometry.attributes.aEdge.needsUpdate = true;
    this._ribbonGeometry.attributes.uv.needsUpdate = true;
    this._ribbonGeometry.attributes.aFade.needsUpdate = true;
  }

  update(dt, state = {}) {
    if (this._disposed || !Number.isFinite(dt) || dt <= 0) return;
    if (dt > .30) this.reset();
    dt = Math.min(dt, .10);
    this._time += dt;
    this._ribbonUniforms.uTime.value = this._time;
    this._pose();
    if (!this._started) { this._lastCenter.copy(this._center); this._started = true; }
    const distance = this._center.distanceTo(this._lastCenter);
    if (distance > Math.max(5 * this._effectiveScale, 120 * dt)) {
      this.reset(); this._lastCenter.copy(this._center); this._started = true;
    }
    const suppliedSpeed = Number(state.speed);
    const speed = Number.isFinite(suppliedSpeed) ? Math.max(0, suppliedSpeed) : distance / dt;
    const beat = clamp(Number(state.beat) || 0, 0, 1);
    const boost = clamp(Number(state.boost) || 0, 0, 1);
    const airborne = Boolean(state.airborne);
    const active = speed > .30;
    this.stats.emitting = active;
    this._beatCooldown = Math.max(0, this._beatCooldown - dt);
    let emitted = 0;
    if (active) {
      const strength = clamp(.32 + speed / 32 + boost * .28 + beat * .18, .25, 1);
      const previousClock = this._sampleClock;
      this._sampleClock += dt;
      while (this._sampleClock >= this._interval) {
        this._sampleClock -= this._interval;
        const fraction = clamp((dt - this._sampleClock) / dt, 0, 1);
        this._sample(fraction, this._time - this._sampleClock, strength);
      }
      // Start the ribbon immediately even on a sub-sample first frame.
      if (!this._count && previousClock < this._interval) this._sample(1, this._time, strength);
      const rate = this.preset.rate * (this._low ? .48 : 1) * clamp(speed / 11, .1, 1.4) * (1 + boost * .45);
      this._emitClock += dt * rate;
      const n = Math.min(24, Math.floor(this._emitClock));
      this._emitClock -= n;
      for (let i = 0; i < n; i++) { this._particle((i + .5) / Math.max(1, n), beat, boost, airborne); emitted++; }
      if (beat > .65 && this._lastBeat <= .65 && this._beatCooldown <= 0) {
        const burst = this._low ? 3 : (this.preset.style === 3 ? 10 : 7);
        for (let i = 0; i < burst; i++) { this._particle(1, 1, boost, airborne); emitted++; }
        this._beatCooldown = .16;
      }
    } else {
      this._sampleClock = 0;
      this._emitClock = 0;
    }
    this._lastBeat = beat;
    this._buildRibbon();
    if (emitted) for (const attribute of this._particleAttributes) attribute.needsUpdate = true;
    this._lastCenter.copy(this._center);
    this.stats.historySamples = this._count;
  }

  reset() {
    if (this._disposed) return;
    this._count = 0; this._head = -1; this._particleHead = 0;
    this._sampleClock = 0; this._emitClock = 0;
    this._started = false; this._lastBeat = 0; this._beatCooldown = 0;
    this._ribbonFades.fill(0);
    this._pBirth.fill(-100 - this._time);
    this._ribbonGeometry.attributes.aFade.needsUpdate = true;
    this._particleGeometry.attributes.aBirth.needsUpdate = true;
    this.stats.historySamples = 0; this.stats.emitting = false;
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.group.removeFromParent();
    this._ribbonGeometry.dispose();
    this._particleGeometry.dispose();
    this._ribbonMaterial.dispose();
    this._glowMaterial.dispose();
    this._particleMaterial.dispose();
    this._particles.onBeforeRender = () => {};
    this.group.clear();
  }
}
