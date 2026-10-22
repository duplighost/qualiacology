import{ag as O,V as T,ah as Ie,d as G,ai as L,a as U,e as de,f as R,aj as V,ak as _,g as Fe,al as E,am as Oe,w as j,A as Q,k as $,K as N,x as K,an as X,a8 as te,ao as ee,m as W,M as le,ap as Z,h as Ue,X as ve,B as re,J as me,ac as De,C as q,aq as ye,t as be,I as ze,v as ie,a4 as Re,P as Le}from"./index-x_3JYPbS.js";function _e(e,n){if(!e||e.userData.mirrorFloor)return e;e.userData.mirrorFloor=!0;const s=e.onBeforeCompile,l=e.customProgramCacheKey;return e.onBeforeCompile=(i,o)=>{s?.call(e,i,o),Object.assign(i.uniforms,{tMirror:O.tMirror,tMirrorSharp:O.tMirrorSharp,uMirrorMatrix:O.uMirrorMatrix,uMirrorOn:O.uMirrorOn}),i.vertexShader=`varying vec3 vMirrorWorld;
`+i.vertexShader.replace("#include <fog_vertex>",`#include <fog_vertex>
vMirrorWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`),i.fragmentShader=`uniform sampler2D tMirror; uniform sampler2D tMirrorSharp; uniform mat4 uMirrorMatrix; uniform float uMirrorOn; varying vec3 vMirrorWorld;
`+i.fragmentShader.replace("#include <opaque_fragment>",`
      {
        vec3 wn = inverseTransformDirection(normal, viewMatrix);
        float upf = smoothstep(0.75, 0.95, wn.y) * (1.0 - smoothstep(0.22, 0.4, vMirrorWorld.y));
        #ifdef STREET_WET
        float mw = ${n<0?"wet * 0.85 + 0.15":n.toFixed(3)};
        #else
        float mw = ${(n<0?.5:n).toFixed(3)};
        #endif
        vec3 V = normalize(cameraPosition - vMirrorWorld);
        float F = 0.025 + 0.975 * pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0);
        vec4 mc = uMirrorMatrix * vec4(vMirrorWorld + vec3(wn.x, 0.0, wn.z) * 1.1, 1.0);
        vec2 muv = mc.xy / mc.w;
        vec3 soft = texture2D(tMirror, muv).rgb, sharp = texture2D(tMirrorSharp, muv).rgb;
        vec3 refl = mix(soft, sharp, mw * mw * 0.5) * (0.2 + 0.8 * mw);
        // (lights, not the haze: the dim sky in it is let go, so a wet street stays dark between its streaks)
        refl *= smoothstep(0.012, 0.1, dot(refl, vec3(0.3, 0.59, 0.11)));
        outgoingLight += refl * F * upf * uMirrorOn * 1.15;
      }
      #include <opaque_fragment>`)},e.customProgramCacheKey=()=>(l?l.call(e):"")+"|street-mirror-1",e.needsUpdate=!0,e}const J=260,Ee=340,H=520;class Be{constructor(n,{collector:s,heart:l}){this.collectorAt=s.getWorldPosition(new T),this.heart=l,this.theft=1,this.flashDir=new Ie(new T(0,1,0)),this.domeU={...L(),uTime:O.uTime,uFlashDir:this.flashDir,uVortex:{value:new G(this.collectorAt.x,this.collectorAt.z)},uTheft:{value:1}},this.dome=new U(new de(1,64,32),new R({uniforms:this.domeU,side:Fe,depthWrite:!1,fog:!0,vertexShader:`
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * viewMatrix * vec4(cameraPosition + position * ${Ee}.0, 1.0);
          gl_Position.z = gl_Position.w * 0.99999; // on the far plane: drawn after the city, only where the city is not
        }`,fragmentShader:`
        uniform float uTime; uniform vec3 uFlashDir; uniform vec2 uVortex; uniform float uTheft;
        varying vec3 vDir;
        ${V}
        ${_}
        void main() {
          vec3 d = normalize(vDir);
          float up = max(d.y, 0.0);
          vec3 zenith = fogColor * 0.22;
          vec3 col = mix(cityHaze(d, fogColor), zenith, smoothstep(0.0, 0.55, up));
          if (d.y > 0.004) {
            float t = (${J}.0 - cameraPosition.y) / d.y;
            vec2 P = cameraPosition.xz + d.xz * min(t, 6000.0);
            // round the Collector the cloud turns, faster toward the middle
            vec2 r = P - uVortex; float rl = length(r);
            float ang = uTheft * (uTime * 0.09 * (1.0 + 140.0 / (rl + 25.0)) + 2.4 * exp(-rl / 140.0));
            float ca = cos(ang), sa = sin(ang);
            vec2 Q = uVortex + mat2(ca, -sa, sa, ca) * r;
            vec2 wind = vec2(uTime * 2.4, uTime * 0.9);
            float c1 = fbm((Q + wind) / 210.0), c2 = fbm((Q * 1.7 - wind * 1.4) / 95.0 + 3.1);
            float cloud = smoothstep(0.38, 0.82, c1 * 0.72 + c2 * 0.42);
            // lit from beneath by the city: warmest low over the horizon; the gaps between are the dark above
            vec3 under = fogColor * (1.35 + 2.1 * (1.0 - smoothstep(0.03, 0.5, up))) + vec3(0.010, 0.004, 0.012);
            vec3 cl = mix(zenith * 0.7, under, cloud);
            // the funnel's mouth glows with what it is taking
            float core = exp(-rl / 38.0) * uTheft, ring = exp(-pow((rl - 70.0) / 30.0, 2.0)) * uTheft;
            cl += vec3(0.30, 0.85, 1.5) * core * (0.5 + 0.5 * cloud) * (0.85 + 0.15 * sin(uTime * 3.1));
            cl *= 1.0 - ring * 0.35 * (1.0 - cloud);
            // lightning lights the cloud from inside, round where it is
            float fl = pow(max(dot(d, uFlashDir), 0.0), 7.0);
            cl += uFlashCol * uFlash * (0.08 + 1.6 * fl) * (0.25 + cloud);
            col = mix(col, cl, smoothstep(0.015, 0.22, up));
          }
          gl_FragColor = vec4(col, 1.0);
        }`})),this.dome.frustumCulled=!1,this.dome.renderOrder=1e3,this.dome.layers.enable(E),n.add(this.dome);const i=[];for(let c=0;c<=24;c++){const d=c/24,m=this.collectorAt.y+4+d*(J-this.collectorAt.y-4);i.push(new G(5.5+70*Math.pow(d,2.2)+6*d,m-this.collectorAt.y))}const o=new Oe(i,48);this.funnelU={...L(),uTime:O.uTime,uTheft:this.domeU.uTheft},this.funnel=new U(o,new R({uniforms:this.funnelU,transparent:!0,depthWrite:!1,side:j,fog:!0,vertexShader:`
        varying vec2 vUv; varying vec3 vWorld; varying vec3 vN;
        void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
        uniform float uTime; uniform float uTheft; varying vec2 vUv; varying vec3 vWorld; varying vec3 vN;
        ${V}
        ${_}
        void main() {
          float u = vUv.x, v = vUv.y;
          // bands winding down and in
          vec2 q = vec2(u * 7.0 + v * 5.0 - uTime * (0.55 + 0.6 * (1.0 - v)), v * 9.0 - uTime * 0.8);
          float n = fbm(q) * 0.75 + fbm(q * 2.3 + 4.0) * 0.4;
          float band = smoothstep(0.45, 0.85, n);
          // soft at its outline, as a cloud is
          float facing = abs(dot(normalize(vN), normalize(cameraPosition - vWorld)));
          float a = (0.2 + 0.8 * band) * smoothstep(0.0, 0.05, v) * (1.0 - smoothstep(0.5, 1.0, v)) * 0.9 * uTheft * smoothstep(0.04, 0.5, facing);
          vec3 dark = fogColor * 0.9;
          vec3 lit = vec3(0.12, 0.45, 1.0) * (0.06 + 2.4 * pow(1.0 - v, 6.0)) * (0.5 + 0.5 * n);
          vec3 c = mix(dark, lit, 0.35 + 0.65 * band);
          float f = cityFogAmount(cameraPosition, vWorld, fogDensity);
          gl_FragColor = vec4(mix(c, cityHaze(normalize(vWorld - cameraPosition), fogColor), f), a * (1.0 - f * 0.7));
        }`})),this.funnel.position.copy(this.collectorAt),this.funnel.renderOrder=3,n.add(this.funnel),this.plasmaU={uTime:O.uTime,uTheft:this.domeU.uTheft},this.plasma=new U(new de(2.55,40,24),new R({uniforms:this.plasmaU,transparent:!0,depthWrite:!1,blending:Q,vertexShader:`
        varying vec3 vN; varying vec3 vP; varying vec3 vV;
        void main() { vN = normalize(normalMatrix * normal); vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,fragmentShader:`
        uniform float uTime; uniform float uTheft; varying vec3 vN; varying vec3 vP; varying vec3 vV;
        ${V}
        void main() {
          vec3 p = normalize(vP);
          float n = fbm(vec2(atan(p.z, p.x) * 2.0 + uTime * 0.9, p.y * 3.0 - uTime * 1.3));
          float threads = pow(1.0 - abs(n - 0.55) * 6.0, 6.0);
          float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5);
          vec3 c = vec3(0.2, 0.75, 1.6) * (max(threads, 0.0) * 1.8 + rim * 0.6) * uTheft;
          gl_FragColor = vec4(c, 1.0);
        }`})),this.plasma.position.copy(this.collectorAt),this.plasma.layers.enable(E),n.add(this.plasma);const a=new $;this.bPos=new Float32Array(H*2*3),this.bSide=new Float32Array(H*2),this.bI=new Float32Array(H*2),this.bT=new Float32Array(H*2),a.setAttribute("position",new N(this.bPos,3).setUsage(K)),a.setAttribute("aSide",new N(this.bSide,1).setUsage(K)),a.setAttribute("aI",new N(this.bI,1).setUsage(K)),a.setAttribute("aTint",new N(this.bT,1).setUsage(K)),this.bIndex=new Uint16Array(H*6),a.setIndex(new N(this.bIndex,1).setUsage(K)),a.setDrawRange(0,0),this.boltGeo=a,this.bolts=new U(a,new R({uniforms:{...L()},transparent:!0,depthWrite:!1,blending:Q,side:j,fog:!0,vertexShader:`
        attribute float aSide; attribute float aI; attribute float aTint; varying float vS; varying float vI; varying float vT; varying vec3 vWorld;
        void main() { vS = aSide; vI = aI; vT = aTint; vWorld = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,fragmentShader:`
        varying float vS; varying float vI; varying float vT; varying vec3 vWorld;
        ${_}
        void main() {
          float x = abs(vS);
          float core = pow(max(0.0, 1.0 - x * 3.2), 3.0), glow = pow(1.0 - x, 2.0);
          vec3 c = (mix(vec3(1.6, 1.9, 2.4), vec3(0.45, 1.5, 2.6), vT) * core * 6.0 + vec3(0.25, 0.6, 1.4) * glow * 0.9) * vI;
          float f = cityFogAmount(cameraPosition, vWorld, fogDensity);
          gl_FragColor = vec4(c * (1.0 - f * 0.8), 1.0);
        }`})),this.bolts.frustumCulled=!1,this.bolts.renderOrder=5,this.bolts.layers.enable(E),n.add(this.bolts),this.arcs=Array.from({length:3},(c,d)=>({pts:null,next:d*.03,life:0,i:0})),this.strike=null,this.nextStrike=4+Math.random()*4,this.ended=!1,this.time=0}ending(){this.ended=!0}path(n,s,l,i){let o=[n.clone(),s.clone()],a=n.distanceTo(s)*l;for(let c=0;c<i;c++){const d=[o[0]];for(let m=0;m<o.length-1;m++){const v=o[m].clone().add(o[m+1]).multiplyScalar(.5);v.x+=(Math.random()-.5)*a,v.y+=(Math.random()-.5)*a*.4,v.z+=(Math.random()-.5)*a,d.push(v,o[m+1])}o=d,a*=.55}return o}newStrike(n){const s=new T;n.getWorldDirection(s),s.y=0,s.normalize();const l=Math.random(),i=Math.abs(s.z)>.5?s.z<0?Math.PI:0:Math.atan2(s.x,s.z),o=l<.55?i+(Math.random()-.5)*.5:l<.8?Math.atan2(s.x,s.z)+(Math.random()-.5)*1.2:Math.random()*Math.PI*2,a=220+Math.random()*110,c=new T(n.position.x+Math.sin(o)*a,-10,n.position.z+Math.cos(o)*a),d=c.clone().add(new T((Math.random()-.5)*60,J-25+Math.random()*20,(Math.random()-.5)*60)),m=this.path(d,c,.18,6),v=[];for(let f=0;f<2;f++){const u=m[8+Math.floor(Math.random()*30)],t=u.clone().add(new T((Math.random()-.5)*70,-40-Math.random()*60,(Math.random()-.5)*70));v.push(this.path(u,t,.25,4))}const h=[[0,1,.05],[.08+Math.random()*.04,.5+Math.random()*.3,.05],[.17+Math.random()*.06,.75,.12]];Math.random()<.5&&h.pop(),this.strike={main:m,forks:v,pulses:h,t:0,dist:a},X.flashDir.copy(d).sub(n.position).normalize(),this.flashDir.value.copy(X.flashDir);const g=new T().crossVectors(s,new T(0,1,0)).normalize(),b=c.clone().sub(n.position).setY(0).normalize(),r=te.clamp(.3+(a-220)/220,.3,.85);window.STORMGLASS_AUDIO?.play?.("thunder",te.clamp(b.dot(g),-1,1)*.8,{distance:r,at:a/343*.55})}update(n,s){this.time=s;const l=ee.camera;if(!l)return;const i=this.ended?0:1;this.theft+=(i-this.theft)*Math.min(1,n*.35),this.domeU.uTheft.value=this.theft,this.funnel.visible=this.plasma.visible=this.theft>.01,this.nextStrike-=n,this.nextStrike<=0&&!this.strike&&(this.newStrike(l),this.nextStrike=(this.ended?14:6)+Math.random()*9);let o=0;if(this.strike){const a=this.strike;a.t+=n;for(const[c,d,m]of a.pulses)a.t>=c&&(o+=d*Math.exp(-(a.t-c)/m));a.t>.75&&(this.strike=null)}O.uFlash.value=Math.min(1.4,o);for(const a of this.arcs)if(a.next-=n,a.next<=0){a.next=.06+Math.random()*.11;const c=this.collectorAt,d=Math.random()*Math.PI*2,m=26+Math.random()*46,v=5.5+70*Math.pow((m-4)/(J-c.y-4),2.2)+6*((m-4)/(J-c.y-4)),h=new T(c.x+Math.cos(d)*v*.85,c.y+m,c.z+Math.sin(d)*v*.85),g=d+(Math.random()-.5)*1.5,b=4.6+Math.random()*3,r=new T(c.x+Math.cos(g)*b,c.y+(Math.random()-.5)*2.5,c.z+Math.sin(g)*b);a.pts=Math.random()<.6*this.theft?this.path(h,r,.2,5):null,a.i=.35+Math.random()*.5}(s-(this.built??-1)>1/75||s<this.built)&&(this.buildRibbons(l,o),this.built=s)}buildRibbons(n,s){let l=0,i=0;const o=this.bPos,a=this.bSide,c=this.bI,d=this.bT,m=this.bIndex,v=new T,h=new T,g=new T,b=(r,f,u,t=0)=>{if(!r||l+r.length>H)return;const M=l;for(let p=0;p<r.length;p++){const y=r[p],z=r[Math.max(0,p-1)],k=r[Math.min(r.length-1,p+1)];v.copy(k).sub(z).normalize(),h.copy(n.position).sub(y).normalize(),g.crossVectors(v,h).normalize().multiplyScalar(f*(.6+.4*Math.min(1,y.distanceTo(n.position)/120)));const w=1-.6*(p/(r.length-1));for(const C of[-1,1]){const x=l*2+(C>0?1:0);o[x*3]=y.x+g.x*C,o[x*3+1]=y.y+g.y*C,o[x*3+2]=y.z+g.z*C,a[x]=C,c[x]=u*w,d[x]=t}if(p>0){const C=(l-1)*2,x=l*2;m.set([C,C+1,x,C+1,x+1,x],i),i+=6}l++}return M};for(const r of this.arcs)r.pts&&this.theft>.05&&b(r.pts,.75,r.i*this.theft,1);if(this.strike&&s>.04){b(this.strike.main,3.6,Math.min(1.2,s)*1.8);for(const r of this.strike.forks)b(r,2.2,Math.min(1.2,s)*1)}this.boltGeo.setDrawRange(0,i),this.boltGeo.attributes.position.needsUpdate=!0,this.boltGeo.attributes.aSide.needsUpdate=!0,this.boltGeo.attributes.aI.needsUpdate=!0,this.boltGeo.attributes.aTint.needsUpdate=!0,this.boltGeo.index.needsUpdate=!0}}const ae=-45,he=[[-40,30,18,20,95],[-44,2,22,18,122],[-38,-24,16,22,86],[-48,-50,24,22,152],[-46,-80,18,18,72],[-42,-106,20,24,112],[-40,-132,18,20,96],[-44,-160,22,22,136],[-36,-190,16,18,80],[42,24,20,18,112],[38,-4,16,18,76],[46,-30,22,24,142],[42,-62,18,20,96],[40,-92,18,18,86],[48,-122,24,22,162],[40,-150,18,20,92],[44,-186,20,20,85],[-14,-216,26,22,172],[20,-230,24,24,150],[-52,-242,28,26,130],[58,-256,26,26,178],[0,-282,34,30,124],[-34,-268,22,20,160],[34,-300,26,24,140],[-10,72,26,24,142],[30,86,24,20,102],[-50,92,26,28,162],[60,60,22,22,120],[8,120,30,26,180]],oe=[{c:[0,-60],r:[17,88],y:34,v:22,p:0},{c:[5,-40],r:[23,70],y:47,v:-17,p:2.1},{c:[0,-196],r:[95,5],y:92,v:26,p:1.2},{c:[0,58],r:[48,11],y:50,v:-20,p:4}],Me=[{x:-2.8,y:13.2,z0:62,z1:-152,v:24,cars:3},{x:2.8,y:14.1,z0:-152,z1:62,v:21,cars:3}],Ve=oe.length+Me.reduce((e,n)=>e+n.cars,0);function $e(e){return()=>{e|=0,e=e+1831565813|0;let n=Math.imul(e^e>>>15,1|e);return n=n+Math.imul(n^n>>>7,61|n)^n,((n^n>>>14)>>>0)/4294967296}}class Ne{constructor(n){const s=$e(1977),l=he.map(([r,f,u,t,M])=>[Math.abs(f)<205&&f<40?Math.sign(r)*(Math.abs(r)+26):r,f,u,t,M]);for(let r=0;r<46;r++){const f=r%2?1:-1,u=f*(96+s()*110),t=130-s()*450;l.push([u,t,18+s()*20,18+s()*20,70+s()*120])}const i=[],o=[],a=[],c={pos:[],col:[],info:[]},d=(r,f,u,t,M,p,y)=>{const z=new re(t,M,p).toNonIndexed();z.translate(r,f,u),i.push(...z.attributes.position.array),o.push(...z.attributes.normal.array);for(let k=0;k<z.attributes.position.count;k++)a.push(y);z.dispose()},m=(r,f,u,t,M)=>{const p=new T(...r),y=new T(...f),z=y.clone().sub(p),k=z.length(),w=z.clone().normalize(),C=Math.abs(w.y)>.9?new T(1,0,0):new T(0,1,0),x=t?.6:.14,I=new T().crossVectors(w,C).normalize().multiplyScalar(x),S=new T().crossVectors(w,I).normalize().multiplyScalar(x),A=p.clone().add(y).multiplyScalar(.5),P=w.multiplyScalar(Math.max(k/2,x));for(const F of[I,S])for(const[D,B]of[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]){const Y=A.clone().addScaledVector(F,D).addScaledVector(P,B);c.pos.push(Y.x,Y.y,Y.z),c.col.push(...u),c.info.push(t?1:0,M)}},v=[[.4,3.4,6.2],[5.6,.5,5.4],[6,2.2,.5],[.5,4.8,3.2],[3.4,1.2,6.6]];l.forEach((r,f)=>{const[u,t,M,p,y]=r,z=s(),k=s()<.5&&y>90,w=k?y-18-s()*22:y;d(u,(ae+w)/2,t,M,w-ae,p,z);let C=w,x=M,I=p;if(k&&(x=M*(.55+s()*.2),I=p*(.55+s()*.2),d(u,(w+y)/2,t,x,y-w,I,z+.37),C=y),d(u+x*.15,C+1.6,t-I*.1,x*.4,3.2,I*.35,z+.71),s()<.55){const S=8+s()*18;d(u,C+S/2,t,.5,S,.5,z+.11),m([u,C+S+.4,t],[u,C+S+.41,t],[8,.3,.2],!0,z)}if(f<he.length||s()<.45){const S=v[Math.floor(s()*v.length)],A=C+.1,P=x/2+.05,F=I/2+.05;if(m([u-P,A,t-F],[u+P,A,t-F],S,!1,z),m([u-P,A,t+F],[u+P,A,t+F],S,!1,z),m([u-P,A,t-F],[u-P,A,t+F],S,!1,z),m([u+P,A,t-F],[u+P,A,t+F],S,!1,z),s()<.45)for(const[D,B]of[[-1,-1],[1,1]])m([u+D*(M/2+.05),ae+40,t+B*(p/2+.05)],[u+D*(M/2+.05),w,t+B*(p/2+.05)],S,!1,z+D)}});const h=new $;h.setAttribute("position",new W(i,3)),h.setAttribute("normal",new W(o,3)),h.setAttribute("aTower",new W(a,1)),h.computeBoundingSphere();const g=new le({color:2106927,roughness:.3,metalness:.55});g.onBeforeCompile=r=>{r.uniforms.uTime=O.uTime,r.vertexShader=`attribute float aTower;
varying float vTower;
varying vec3 vTw;
varying vec3 vTn;
`+r.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
vTower = aTower; vTw = (modelMatrix * vec4(transformed, 1.0)).xyz; vTn = normal;`),r.fragmentShader=`uniform float uTime;
varying float vTower;
varying vec3 vTw;
varying vec3 vTn;
`+V+r.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
        {
          vec3 n = normalize(vTn);
          if (abs(n.y) < 0.5) {
            vec2 f = abs(n.x) > 0.5 ? vec2(vTw.z, vTw.y) : vec2(vTw.x, vTw.y);
            // offices (long bands of glass) or flats (separate windows); 3.1 m floors
            bool office = fract(vTower * 5.17) > 0.6;
            vec2 cellSize = vec2(office ? 1.25 : 1.15 + vTower * 0.5, 3.1);
            vec2 q = f / cellSize, cell = floor(q), fr = fract(q);
            float tower = vTower * 97.0;
            float density = 0.16 + 0.34 * fract(vTower * 7.31);
            float h = h21(cell + tower + n.x * 3.0 + n.z * 7.0);
            // lit rooms come in clusters (a floor of offices, a stack of flats); whole floors stay dark
            float cluster = smoothstep(0.3, 0.7, vnoise(cell * vec2(office ? 0.12 : 0.25, 0.32) + tower));
            float lit = step(1.0 - density * (0.35 + 1.5 * cluster), office ? h21(vec2(floor(cell.x / 4.0), cell.y) + tower) : h);
            lit *= step(0.16, h21(vec2(cell.y, tower)));
            // the colour of a lit room
            float k = h21((office ? vec2(floor(cell.x / 4.0), cell.y) : cell) * 1.7 + tower + 5.0);
            vec3 warm = vec3(1.0, 0.66, 0.36), cool = vec3(0.7, 0.82, 1.0), white = vec3(0.92, 0.9, 0.84);
            vec3 c = k < 0.45 ? warm : k < 0.8 ? cool : white;
            if (k > 0.965) c = mod(cell.x, 2.0) > 0.5 ? vec3(1.0, 0.18, 0.75) : vec3(0.15, 0.9, 1.0);
            float flick = 1.0 - 0.7 * step(0.985, h21(cell + floor(uTime * 6.0))) * step(0.9, k);
            float win = (office ? step(0.06, fr.x) * step(fr.x, 0.94) : step(0.2, fr.x) * step(fr.x, 0.8)) * step(0.3, fr.y) * step(fr.y, 0.8);
            // far away a window is less than a pixel: its average instead of a shimmer
            float px = max(fwidth(q.x), fwidth(q.y));
            float detail = smoothstep(0.7, 0.25, px);
            float glow = mix(lit * 0.42, lit * win, detail) * flick * (0.45 + 0.55 * h21(cell + tower + 3.3));
            // a few towers carry bands of colour round some floors
            float band = step(0.72, fract(vTower * 13.7)) * step(0.88, fract(f.y / 3.6)) * step(mod(floor(f.y / 3.6), 6.0), 0.5);
            vec3 bandC = fract(vTower * 3.3) > 0.5 ? vec3(1.0, 0.2, 0.8) : vec3(0.2, 0.85, 1.0);
            totalEmissiveRadiance += c * glow * 1.3 + bandC * band * 2.2;
            diffuseColor.rgb *= 1.0 - 0.6 * win * detail;
          }
        }`)},g.customProgramCacheKey=()=>"skyline-windows-v1",Z(g),this.towers=new U(h,g),this.towers.layers.enable(E),n.add(this.towers);const b=new $;b.setAttribute("position",new W(c.pos,3)),b.setAttribute("aColour",new W(c.col,3)),b.setAttribute("aInfo",new W(c.info,2)),b.computeBoundingSphere(),this.lightsMat=new R({uniforms:{...L(),uTime:O.uTime},fog:!0,side:j,vertexShader:`
        attribute vec3 aColour; attribute vec2 aInfo; varying vec3 vColour; varying vec2 vInfo; varying vec3 vWorld;
        void main() { vColour = aColour; vInfo = aInfo; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
        uniform float uTime; varying vec3 vColour; varying vec2 vInfo; varying vec3 vWorld;
        ${_}
        void main() {
          float on = vInfo.x > 0.5 ? step(0.55, fract(uTime * 0.6 + vInfo.y)) : 1.0;
          vec3 c = vColour * on;
          float f = cityFogAmount(cameraPosition, vWorld, fogDensity);
          gl_FragColor = vec4(mix(c, cityHaze(normalize(vWorld - cameraPosition), fogColor), f * 0.85), 1.0);
        }`}),this.lights=new U(b,this.lightsMat),this.lights.layers.enable(E),n.add(this.lights),this.cars=qe(n)}update(n){const{body:s,glow:l,n:i}=this.cars,o=new Ue,a=new ve,c=new T(1.5,1.5,1.5),d=new T(1.7,.45,22),m=new T,v=[[-1.05,0,3.22],[1.05,0,3.22],[-1.12,.08,-3.22],[1.12,.08,-3.22],[0,-.72,0]];let h=oe.length;for(const g of Me){const b=Math.abs(g.z1-g.z0),r=Math.sign(g.z1-g.z0);for(let f=0;f<g.cars;f++,h++){const u=(n*g.v+f/g.cars*b+g.x*7)%b,t=Math.min(1,u/18,(b-u)/18);m.set(g.x+Math.sin(n*.5+f)*.25,g.y+Math.sin(n*.8+f*2)*.35,g.z0+r*u),a.setFromAxisAngle(new T(0,1,0),r>0?0:Math.PI);const M=c.clone().multiplyScalar(Math.max(.001,t));o.compose(m,a,M),s.setMatrixAt(h,o);for(let p=0;p<5;p++){const y=new T(...v[p]).multiplyScalar(t).applyQuaternion(a).add(m);o.compose(y,a,p===4?d.clone().multiplyScalar(t):M),l.setMatrixAt(h*5+p,o)}}}for(let g=0;g<oe.length;g++){const b=oe[g],r=b.p+n*b.v/((b.r[0]+b.r[1])*.5);m.set(b.c[0]+Math.cos(r)*b.r[0],b.y+Math.sin(n*.7+g)*1.2,b.c[1]+Math.sin(r)*b.r[1]);const f=new T(-Math.sin(r)*b.r[0],0,Math.cos(r)*b.r[1]).multiplyScalar(Math.sign(b.v)).normalize();a.setFromUnitVectors(new T(0,0,1),f);const u=new ve().setFromAxisAngle(f,-.18*Math.sign(b.v));a.premultiply(u),o.compose(m,a,c),s.setMatrixAt(g,o);for(let t=0;t<5;t++){const M=new T(...v[t]).applyQuaternion(a).add(m);o.compose(M,a,t===4?d:c),l.setMatrixAt(g*5+t,o)}}s.instanceMatrix.needsUpdate=!0,l.instanceMatrix.needsUpdate=!0}}function qe(e){const n=Ve,l=[[0,0,0,2.1,.75,4.4],[0,.55,-.3,1.4,.5,1.8],[-1.25,-.15,-.6,.55,.45,2.6],[1.25,-.15,-.6,.55,.45,2.6]].map(([r,f,u,t,M,p])=>{const y=new re(t,M,p).toNonIndexed();return y.translate(r,f,u),y}),i=[],o=[];for(const r of l)i.push(...r.attributes.position.array),o.push(...r.attributes.normal.array),r.dispose();const a=new $;a.setAttribute("position",new W(i,3)),a.setAttribute("normal",new W(o,3));const c=Z(new le({color:2764600,roughness:.32,metalness:.8})),d=new me(a,c,n);d.frustumCulled=!1,e.add(d);const m=Z(new De({color:16777215})),v=new me(new re(.42,.16,.12),m,n*5),h=new q(7,7.4,8),g=new q(8,.25,.3),b=[new q(.5,4,7),new q(6,.5,5)];for(let r=0;r<n;r++)v.setColorAt(r*5,h),v.setColorAt(r*5+1,h),v.setColorAt(r*5+2,g),v.setColorAt(r*5+3,g),v.setColorAt(r*5+4,b[r%2]);return v.frustumCulled=!1,v.layers.enable(E),e.add(v),{body:d,glow:v,n}}const ke={pink:[6.5,.55,3.2],magenta:[5.2,.5,6],cyan:[.35,3.6,6.2],blue:[.6,1.4,7],red:[7,.45,.6],amber:[6.5,2.4,.5],green:[.6,5.4,2.6],violet:[2.8,.8,7],white:[4.5,4.8,5.6]},pe={steady:0,buzz:1,dying:2,broken:3,screen:4},se='"Yu Gothic", "YuGothic", "Meiryo", "Hiragino Sans", "Noto Sans CJK JP", "Noto Sans JP", "Microsoft YaHei", sans-serif',Te='"Arial Narrow", "Helvetica Neue", Arial, sans-serif',we=[{kind:"blade",at:[-13.7,8.2,-14],w:1.5,h:4,text:"ホテル",vertical:!0,colour:"pink",zone:0,mode:"broken",dead:1},{kind:"blade",at:[12.1,8.6,-15],w:1.4,h:3.4,text:"電気",vertical:!0,colour:"cyan",zone:0,mode:"steady"},{kind:"blade",at:[-12.15,10.4,-28.75],w:1.5,h:6.4,text:"未来酒店",vertical:!0,colour:"red",zone:3,mode:"buzz"},{kind:"blade",at:[13.85,9.2,-29.75],w:1.5,h:3.6,text:"薬",vertical:!0,colour:"green",zone:0,mode:"dying",solo:!0},{kind:"board",at:[-11.25,6.55,-14.2],facing:1,w:4.2,h:.95,text:"REPAIRS",colour:"magenta",zone:0,mode:"buzz"},{kind:"board",at:[11.25,6.55,-10.8],facing:-1,w:2.6,h:1.05,text:"時計",colour:"amber",zone:0,mode:"steady"},{kind:"board",at:[11.62,3.35,-9.75],facing:-1,w:1.25,h:.5,text:"OPEN",colour:"pink",zone:3,mode:"buzz",frameless:!0},{kind:"board",at:[-14.2,15.2,-36.5],facing:1,w:5.5,h:1.3,text:"NOODLES",colour:"amber",zone:0,mode:"dying",dead:6},{kind:"board",at:[12.55,18.6,-12],facing:-1,w:6,h:1.5,text:"HOTEL",colour:"violet",zone:0,mode:"steady"},{kind:"roof",at:[-17.3,21,-5.9],facing:1,w:5,h:1.9,text:"BAR",colour:"pink",zone:3,mode:"steady"},{kind:"roof",at:[16,25.6,-6.9],facing:1,w:7,h:2.3,text:"夜の電気",colour:"magenta",zone:0,mode:"buzz"},{kind:"strip",from:[-14.6,.4,-5.65],to:[-14.6,18.6,-5.65],colour:"magenta",zone:0,mode:"steady"},{kind:"strip",from:[12.9,.4,-6.65],to:[12.9,22.6,-6.65],colour:"cyan",zone:0,mode:"buzz"},{kind:"strip",from:[-12.9,.4,-24.65],to:[-12.9,22.6,-24.65],colour:"violet",zone:3,mode:"steady"},{kind:"strip",from:[14.6,.4,-25.65],to:[14.6,17.6,-25.65],colour:"pink",zone:0,mode:"dying"},{kind:"strip",from:[12.75,13.75,-23.3],to:[12.75,13.75,-6.7],colour:"pink",zone:0,mode:"steady"},{kind:"strip",from:[-14.45,4.8,-22.3],to:[-14.45,4.8,-19.4],colour:"pink",zone:0,mode:"steady"},{kind:"strip",from:[-10.95,5.25,-18.7],to:[-10.95,5.25,-9.7],colour:"magenta",zone:0,mode:"buzz"},{kind:"strip",from:[10.95,5.25,-15],to:[10.95,5.25,-6.6],colour:"amber",zone:0,mode:"steady"},{kind:"blade",at:[-16.9,12.6,-64.5],w:1.7,h:5.6,text:"夜市",vertical:!0,colour:"magenta",zone:1,mode:"steady"},{kind:"blade",at:[16.9,13.2,-68.25],w:1.7,h:6.4,text:"酒場",vertical:!0,colour:"red",zone:3,mode:"buzz"},{kind:"blade",at:[-16.9,12.2,-75.75],w:1.6,h:3.8,text:"電",vertical:!0,colour:"violet",zone:1,mode:"dying",solo:!0},{kind:"blade",at:[16.9,12.4,-79.5],w:1.6,h:5.2,text:"OPEN",vertical:!0,colour:"cyan",zone:1,mode:"buzz"},{kind:"board",at:[-16.92,9,-72],facing:1,w:10,h:.9,text:"NIGHT MARKET",colour:"pink",zone:1,mode:"steady"},{kind:"board",at:[16.92,9,-72],facing:-1,w:5.2,h:.95,text:"NOODLES",colour:"amber",zone:3,mode:"steady"},{kind:"board",at:[-17.55,15.6,-84],facing:1,w:4.4,h:1.3,text:"修理",colour:"cyan",zone:1,mode:"broken",dead:0},{kind:"strip",from:[-17,3,-86.5],to:[-17,3,-57.5],colour:"violet",zone:1,mode:"steady"},{kind:"strip",from:[17,3,-86.5],to:[17,3,-57.5],colour:"magenta",zone:1,mode:"steady"},{kind:"strip",from:[-17.9,.4,-57.1],to:[-17.9,17.6,-57.1],colour:"pink",zone:1,mode:"steady"},{kind:"strip",from:[17.9,.4,-57.1],to:[17.9,24.6,-57.1],colour:"cyan",zone:3,mode:"buzz"},{kind:"roof",screen:!0,at:[-11.1,12.4,-22],facing:1,w:3.6,h:5.4,text:"ネオン",colour:"pink",zone:3,mode:"steady"},{kind:"roof",screen:!0,at:[11.5,14.2,-37.5],facing:1,w:3.4,h:5,text:"電気",colour:"pink",zone:3,mode:"steady"},{kind:"roof",screen:!0,at:[-19.8,15.5,-116.4],facing:1,w:5,h:7.4,text:"嵐",colour:"magenta",zone:3,mode:"steady"},{kind:"roof",screen:!0,at:[20.2,13.2,-115.6],facing:1,w:4.4,h:6.4,text:"夜市",colour:"magenta",zone:3,mode:"steady"},{kind:"roof",screen:!0,at:[-4.6,8.75,-41.5],facing:1,w:4.2,h:1.2,text:"CENTRAL",colour:"cyan",zone:3,mode:"steady",wide:!0},{kind:"roof",screen:!0,at:[4.6,8.75,-41.5],facing:1,w:4.2,h:1.2,text:"中央通り",colour:"pink",zone:3,mode:"steady",wide:!0},{kind:"blade",at:[-15,8.6,1.5],w:1.6,h:5.2,text:"ラーメン",vertical:!0,colour:"pink",zone:3,mode:"buzz"},{kind:"blade",at:[15,9.4,-2.5],w:1.6,h:6,text:"女の子",vertical:!0,colour:"magenta",zone:3,mode:"steady"},{kind:"board",at:[-15.9,5.6,9],facing:1,w:6,h:1,text:"NOODLE BAR",colour:"pink",zone:3,mode:"steady"},{kind:"board",at:[15.9,5.6,7.5],facing:-1,w:5,h:1,text:"ARCADE",colour:"cyan",zone:3,mode:"buzz"},{kind:"blade",at:[-15,14.5,-3.8],w:1.4,h:4.2,text:"酒",vertical:!0,colour:"red",zone:3,mode:"steady"},{kind:"strip",from:[-16,.4,-4.6],to:[-16,26,-4.6],colour:"pink",zone:3,mode:"steady"},{kind:"strip",from:[16,.4,-5],to:[16,30,-5],colour:"cyan",zone:3,mode:"steady"},{kind:"board",at:[-22.4,5.6,-124],facing:1,w:7,h:1.2,text:"KARAOKE",colour:"magenta",zone:3,mode:"buzz"},{kind:"board",at:[22.4,5.6,-132],facing:-1,w:6,h:1.2,text:"HOTEL",colour:"pink",zone:3,mode:"steady"},{kind:"blade",at:[-21.4,11,-140.5],w:1.8,h:7,text:"未来酒店",vertical:!0,colour:"red",zone:3,mode:"steady"},{kind:"blade",at:[21.4,12,-137.5],w:1.8,h:5.8,text:"カラオケ",vertical:!0,colour:"cyan",zone:3,mode:"buzz"}],xe=[{at:[11.6,11.2,-46.5],face:[0,0,1],w:6.8,h:10.4,portrait:!0,colour:"violet"},{at:[-22.2,19,-129],face:[1,0,.12],w:10,h:15.4,portrait:!0,colour:"magenta"},{at:[22.2,19,-150],face:[-1,0,.3],w:8.6,h:13.2,portrait:!0,colour:"cyan"},{at:[-14.5,17.5,-56.6],face:[.12,0,1],w:7.5,h:11,text:"電力",colour:"pink"},{at:[31,31,-104],face:[-.8,0,.6],w:11,h:17,text:"嵐",colour:"magenta"},{at:[-34,30,-140],face:[1,0,.25],w:10,h:16,text:"夜",colour:"violet"},{at:[22,28,46],face:[-.4,0,-1],w:10,h:15,text:"未来",colour:"pink"}];function He(e,n){const i=document.createElement("canvas");i.width=2048,i.height=2048;const o=i.getContext("2d");o.fillStyle="#000",o.fillRect(0,0,2048,2048);let a=0,c=0,d=0;const m=(r,f)=>{a+r>2048&&(a=0,c+=d+4,d=0);const u={x:a,y:c,w:r,h:f};return a+=r+4,d=Math.max(d,f),u},v=r=>Array.from(r);o.textAlign="center",o.textBaseline="middle",o.lineJoin="round";const h=m(64,64);o.fillStyle="rgb(255,150,0)",o.fillRect(h.x,h.y,h.w,h.h);const g=(r,f,u,t,M,p)=>{o.font=`600 ${t}px ${M}`,o.globalCompositeOperation="lighter",o.shadowColor="rgb(0,255,0)",o.shadowBlur=t*.3,o.fillStyle="rgb(0,150,0)",o.strokeStyle="rgb(0,150,0)",o.lineWidth=t*.1,o.strokeText(r,f,u),o.fillText(r,f,u),o.shadowBlur=0,o.fillStyle=p?"rgb(0,0,255)":"rgb(255,0,0)",o.fillText(r,f,u),o.globalCompositeOperation="source-over"};for(const r of e){if(r.kind==="strip"){r.cell=null;continue}if(r.screen){r.cell=Ge(o,m,r);continue}const f=v(r.text),u=/^[\x20-\x7e]+$/.test(r.text),t=u?Te:se;if(r.vertical){const y=127.44000000000001*f.length+40,z=r.cell=m(168,Math.ceil(y));f.forEach((k,w)=>g(k,z.x+168/2,z.y+20+118*1.08*(w+.5),118,t,w===r.dead))}else{const y=Math.min(2048,Math.ceil((u?79.2:124.80000000000001)*f.length+70)),z=168,k=r.cell=m(y,z);o.font=`600 120px ${t}`;const w=f.map(I=>o.measureText(I).width),C=w.reduce((I,S)=>I+S,0)+(f.length-1)*120*.08;let x=k.x+y/2-C/2;f.forEach((I,S)=>{g(I,x+w[S]/2,k.y+z/2+4,120,t,S===r.dead),x+=w[S]+120*.08})}}for(const r of n){const t=r.cell=m(300,460);if(r.portrait){je(o,t.x,t.y,300);continue}o.globalCompositeOperation="lighter";const M=t.x+300/2,p=t.y+150;o.strokeStyle="rgb(255,0,0)",o.shadowColor="rgb(0,255,0)",o.shadowBlur=14;for(const[k,w]of[[118,6],[92,3],[64,9]])o.lineWidth=w,o.beginPath(),o.arc(M,p,k,0,Math.PI*2),o.stroke();o.lineWidth=7,o.beginPath(),o.moveTo(M+18,p-110),o.lineTo(M-22,p+6),o.lineTo(M+14,p+2),o.lineTo(M-16,p+110),o.stroke(),o.shadowBlur=0;const y=v(r.text),z=y.length>1?96:150;y.forEach((k,w)=>g(k,M,t.y+300+(y.length>1?(w-.5)*100:40),z,se,!1)),o.fillStyle="rgb(160,0,0)";for(let k=0;k<9;k++)o.fillRect(t.x+20+k%3*8,t.y+20+k*11,40+k*37%60,4);o.globalCompositeOperation="source-over"}const b=new ye(i);return b.anisotropy=8,b.generateMipmaps=!0,b.minFilter=be,{tex:b,W:2048,H:2048,solid:h}}function Ge(e,n,s){const l=s.wide,i=l?640:300,o=l?180:450,a=n(i,o),c=a.x+i/2;if(e.globalCompositeOperation="lighter",e.shadowColor="rgb(0,255,0)",e.shadowBlur=12,!l){const v=a.y+165;e.strokeStyle="rgb(255,0,0)";for(const[h,g]of[[112,10],[86,4],[58,14]])e.lineWidth=g,e.beginPath(),e.arc(c,v,h,0,Math.PI*2),e.stroke();e.lineWidth=9,e.beginPath(),e.moveTo(c+16,v-100),e.lineTo(c-20,v+6),e.lineTo(c+12,v+2),e.lineTo(c-14,v+100),e.stroke()}e.shadowBlur=0;const d=/^[\x20-\x7e]+$/.test(s.text),m=l?110:88;return e.font=`700 ${m}px ${d?Te:se}`,e.textAlign="center",e.textBaseline="middle",e.fillStyle="rgb(255,120,0)",e.fillText(s.text,c,l?a.y+o/2+4:a.y+360,i-30),e.globalCompositeOperation="source-over",a}function je(e,n,s,l,i){e.save(),e.translate(n+l/2,s+20),e.scale(l/300,l/300),e.globalCompositeOperation="lighter",e.shadowBlur=0,e.fillStyle="rgb(0,60,0)",e.beginPath(),e.moveTo(-96,160),e.bezierCurveTo(-124,16,124,16,96,160),e.bezierCurveTo(122,270,128,340,112,420),e.lineTo(70,420),e.bezierCurveTo(86,320,82,240,72,176),e.lineTo(-72,176),e.bezierCurveTo(-82,240,-86,320,-70,420),e.lineTo(-112,420),e.bezierCurveTo(-128,340,-122,270,-96,160),e.fill(),e.fillStyle="rgb(0,120,0)",e.beginPath(),e.ellipse(0,180,80,106,0,0,Math.PI*2),e.fill(),e.fillStyle="rgb(0,80,0)",e.beginPath(),e.moveTo(-40,280),e.lineTo(-44,336),e.quadraticCurveTo(-120,350,-150,430),e.lineTo(150,430),e.quadraticCurveTo(120,350,44,336),e.lineTo(40,280),e.fill(),e.shadowColor="rgb(0,255,0)",e.shadowBlur=10,e.strokeStyle="rgb(255,0,0)",e.fillStyle="rgb(255,0,0)",e.lineCap="round",e.lineJoin="round",e.lineWidth=5,e.beginPath(),e.moveTo(-80,128),e.bezierCurveTo(-84,222,-52,276,0,290),e.bezierCurveTo(52,276,84,222,80,128),e.stroke();for(const o of[-1,1])e.beginPath(),e.moveTo(o*16,176),e.quadraticCurveTo(o*38,158,o*60,176),e.quadraticCurveTo(o*38,188,o*16,176),e.stroke(),e.beginPath(),e.arc(o*38,175,7,0,Math.PI*2),e.fill(),e.beginPath(),e.moveTo(o*12,150),e.quadraticCurveTo(o*40,136,o*66,150),e.stroke();e.beginPath(),e.moveTo(-3,182),e.lineTo(-11,224),e.quadraticCurveTo(0,233,11,224),e.stroke(),e.beginPath(),e.moveTo(-28,254),e.quadraticCurveTo(0,244,28,254),e.quadraticCurveTo(0,272,-28,254),e.stroke(),e.lineWidth=3;for(let o=0;o<8;o++){const a=o%2?1:-1,c=Math.floor(o/2)*10;e.beginPath(),e.moveTo(a*(8+c),42),e.bezierCurveTo(a*(96+c*.3),80,a*(110+c*.2),240,a*(88+c*.5),415),e.stroke()}e.lineWidth=4,e.beginPath(),e.moveTo(-36,282),e.lineTo(-40,336),e.quadraticCurveTo(-112,350,-142,425),e.moveTo(36,282),e.lineTo(40,336),e.quadraticCurveTo(112,350,142,425),e.stroke(),e.lineWidth=2,e.beginPath(),e.arc(0,190,136,-2.6,-.5),e.stroke(),e.restore(),e.globalCompositeOperation="source-over",e.shadowBlur=0}const Ce=`
float signWake(float t) { if (t < 0.0) return 0.0; float on = (t < 0.07 || (t > 0.16 && t < 0.22) || t > 0.36) ? 1.0 : 0.0; return on; }
vec2 signPower(float mode, float seed, float wakeT, float own, float time) {
  float zone = own > 0.5 ? 1.0 : signWake(wakeT);
  float n1 = h11(floor(time * 18.0) + seed * 91.0), n2 = h11(floor(time * 2.3) + seed * 37.0), n3 = h11(floor(time * 7.0) + seed * 13.0);
  float p = zone, dead = 0.0;
  if (mode > 0.5 && mode < 1.5) p *= 0.82 + 0.18 * step(0.25, n1);                               // buzz
  if (mode > 1.5 && mode < 2.5) {                                                                 // dying
    p *= step(0.18, n2) * (0.7 + 0.3 * step(0.4, n1));
    if (zone < 0.5) p = 0.75 * step(0.86, n1) * step(0.55, n2);                                   // spits in the dark
  }
  if (mode > 2.5) { p *= 0.9 + 0.1 * step(0.3, n1); dead = 0.5 * step(0.83, n1) * step(0.5, n3) * max(zone, 0.3); } // broken letter
  return vec2(p, dead);
}`,Se=e=>{const n=Math.sin(e*91.345+47.13)*43758.5453;return n-Math.floor(n)};function Qe(e,n,s,l,i){const o=h=>Se(h),c=l?1:(h=>h<0?0:h<.07||h>.16&&h<.22||h>.36?1:0)(s),d=o(Math.floor(i*18)+n*91),m=o(Math.floor(i*2.3)+n*37);let v=c;return e===1&&(v*=.82+.18*(d>.25)),e===2&&(v*=(m>.18)*(.7+.3*(d>.4)),c<.5&&(v=.75*(d>.86)*(m>.55))),e===3&&(v*=.9),v}class Ye{constructor(n,{wake:s,relaySeats:l}){this.wake=s;const{tex:i,W:o,H:a,solid:c}=He(we,xe);this.tex=i;const d=[],m=[],v=[],h=[],g=[],b=(t,M,p,y,z,k,w)=>{const C=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]],x=y??c;for(const[I,S]of C){d.push(t[0]+M[0]*I+p[0]*S,t[1]+M[1]*I+p[1]*S,t[2]+M[2]*I+p[2]*S);const A=z?-I:I,P=y?1:0;m.push((x.x+x.w*(.5+.5*A*P))/o,1-(x.y+x.h*(.5-.5*S*P))/a),v.push(...k),h.push(...w)}},r=(t,M,p,y)=>{const z=new re(M,p,y);z.translate(...t),g.push(z)};this.sources=[],we.forEach((t,M)=>{const p=ke[t.colour],y=Se(M+3.7),z=t.zone===3?0:t.zone,k=l[z],w=t.at??[(t.from[0]+t.to[0])/2,(t.from[1]+t.to[1])/2,(t.from[2]+t.to[2])/2],C=Math.hypot(w[0]-k[0],w[2]-k[1])/16+.25+y*.3,x=[z,t.screen?4:pe[t.mode],y,C+(t.zone===3?1e3:0)];if(t.kind==="blade"){const A=t.w/2,P=t.h/2;b([w[0],w[1],w[2]+.115],[A,0,0],[0,P,0],t.cell,!1,p,x),b([w[0],w[1],w[2]-.115],[A,0,0],[0,P,0],t.cell,!0,p,x),r([w[0],w[1],w[2]],t.w+.16,t.h+.16,.2);const F=w[0]<0?-1:1,D=w[0]+F*(t.w/2+.08);r([(D+w[0]+F*(t.w/2+.75))/2,w[1]+t.h/2-.25,w[2]],.75,.08,.08),r([(D+w[0]+F*(t.w/2+.75))/2,w[1]-t.h/2+.25,w[2]],.75,.08,.08)}else if(t.kind==="board"||t.kind==="roof"){const A=t.facing,P=t.w/2,F=t.h/2;if(t.kind==="board")b([w[0]+A*.06,w[1],w[2]],[0,0,-A*P],[0,F,0],t.cell,!1,p,x),t.frameless||r([w[0]-A*.03,w[1],w[2]],.12,t.h+.2,t.w+.25);else if(b([w[0],w[1],w[2]+A*.08],[A*P,0,0],[0,F,0],t.cell,!1,p,x),r([w[0],w[1],w[2]],t.w+.3,t.h+.3,.14),!t.screen)for(const D of[-P*.7,P*.7])r([w[0]+D,w[1]-F-.9,w[2]-A*.2],.1,1.9,.1)}else if(t.kind==="strip"){const A=new T(...t.from),P=new T(...t.to),F=P.clone().sub(A),D=F.length(),B=F.clone().normalize(),Y=Math.abs(B.y)>.9?new T(1,0,0):new T(0,1,0),ce=new T().crossVectors(B,Y).normalize().multiplyScalar(.045),We=new T().crossVectors(B,ce).normalize().multiplyScalar(.045),fe=A.clone().add(P).multiplyScalar(.5),ue=B.clone().multiplyScalar(D/2);b(fe.toArray(),ce.toArray(),ue.toArray(),null,!1,p,x),b(fe.toArray(),We.toArray(),ue.toArray(),null,!1,p,x)}const I=new q(p[0],p[1],p[2]).multiplyScalar(.16),S=t.kind==="strip"?2.4:Math.max(t.w,t.h);this.sources.push({position:new T(...w),color:I,power:0,reach:3+S*.9,sign:{mode:pe[t.mode],seed:y,zone:z,own:t.zone===3,delay:C}})});const f=new $;f.setAttribute("position",new W(d,3)),f.setAttribute("uv",new W(m,2)),f.setAttribute("aColour",new W(v,3)),f.setAttribute("aInfo",new W(h,4)),f.computeBoundingSphere(),this.uniforms={...L(),tAtlas:{value:i},uTime:O.uTime,uWakes:{value:new T(-1,-1,-1)}},this.mat=new R({uniforms:this.uniforms,fog:!0,side:j,vertexShader:`
        attribute vec3 aColour; attribute vec4 aInfo;
        varying vec2 vUv; varying vec3 vColour; varying vec4 vInfo; varying vec3 vWorld;
        void main() { vUv = uv; vColour = aColour; vInfo = aInfo; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
        uniform sampler2D tAtlas; uniform float uTime; uniform vec3 uWakes;
        varying vec2 vUv; varying vec3 vColour; varying vec4 vInfo; varying vec3 vWorld;
        ${V}
        ${Ce}
        ${_}
        void main() {
          float own = step(500.0, vInfo.w), delay = mod(vInfo.w, 1000.0);
          float z = vInfo.x, wakeT = (z < 0.5 ? uWakes.x : z < 1.5 ? uWakes.y : uWakes.z) - delay;
          vec2 pw = signPower(vInfo.y, vInfo.z, wakeT, own, uTime);
          vec3 t = texture2D(tAtlas, vUv).rgb;
          vec3 hot = mix(vColour, vec3(dot(vColour, vec3(0.33))), 0.3);
          vec3 col = vec3(0.004, 0.004, 0.006) + hot * (t.r * pw.x + t.b * pw.y) * 1.25 + vColour * t.g * 0.07 * max(pw.x, pw.y);
          // a screen: lit all over (dimmer toward its edges, a faint grid of pixels), its picture bright on it
          if (vInfo.y > 3.5) {
            vec2 px = fract(vWorld.xy * 22.0 + vWorld.zz * 22.0);
            float grid = 0.82 + 0.18 * step(0.25, px.x) * step(0.25, px.y);
            col = (vColour * 0.075 * (0.7 + 0.3 * sin(uTime * 0.7 + vInfo.z * 9.0)) + hot * t.r * 0.9 + vColour * t.g * 0.12) * grid;
          }
          gl_FragColor = vec4(cityAirOf(col, vWorld), 1.0);
        }`}),this.mesh=new U(f,this.mat),this.mesh.layers.enable(E),n.add(this.mesh);const u=Ke(g);this.frameMat=Z(new le({color:3818060,roughness:.45,metalness:.7})),this.frames=new U(u,this.frameMat),this.frames.castShadow=!1,this.frames.receiveShadow=!0,n.add(this.frames),this.holo=Je(n,i,o,a)}update(n){const s=this.uniforms.uWakes.value,l=this.wake;s.set(l[0].value,l[1].value,l[2].value);for(const i of this.sources){const o=i.sign,a=o.zone===0?s.x:o.zone===1?s.y:s.z;i.power=Qe(o.mode,o.seed,a<0?-1:a-o.delay,o.own,n)}}}function Ke(e){const n=e.map(c=>{const d=c.toNonIndexed();return c.dispose(),d});let s=0;for(const c of n)s+=c.attributes.position.count;const l=new Float32Array(s*3),i=new Float32Array(s*3);let o=0;for(const c of n)l.set(c.attributes.position.array,o*3),i.set(c.attributes.normal.array,o*3),o+=c.attributes.position.count,c.dispose();const a=new $;return a.setAttribute("position",new N(l,3)),a.setAttribute("normal",new N(i,3)),a.computeBoundingSphere(),a}function Je(e,n,s,l){const i=[],o=[],a=[],c=[];for(const h of xe){const g=new T(...h.face).normalize(),b=new T(g.z,0,-g.x).normalize(),r=new T(0,1,0),f=new T(...h.at),u=h.cell,t=ke[h.colour];for(const[M,p]of[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]){const y=f.clone().addScaledVector(b,M*h.w/2).addScaledVector(r,p*h.h/2);i.push(y.x,y.y,y.z),o.push((u.x+u.w*(.5+.5*M))/s,1-(u.y+u.h*(.5-.5*p))/l),a.push(...t),c.push(.5+.5*M,.5+.5*p)}}const d=new $;d.setAttribute("position",new W(i,3)),d.setAttribute("uv",new W(o,2)),d.setAttribute("aColour",new W(a,3)),d.setAttribute("aLoc",new W(c,2)),d.computeBoundingSphere();const m=new R({uniforms:{...L(),tAtlas:{value:n},uTime:O.uTime,uCell:{value:new G(300/s,460/l)}},fog:!0,transparent:!0,depthWrite:!1,blending:Q,side:j,vertexShader:`
      attribute vec3 aColour; attribute vec2 aLoc;
      varying vec2 vUv; varying vec3 vColour; varying vec2 vLoc; varying vec3 vWorld;
      void main() { vUv = uv; vColour = aColour; vLoc = aLoc; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
      uniform sampler2D tAtlas; uniform float uTime; uniform vec2 uCell;
      varying vec2 vUv; varying vec3 vColour; varying vec2 vLoc; varying vec3 vWorld;
      ${V}
      ${_}
      void main() {
        float seed = floor(vColour.r * 7.0 + vColour.b * 3.0);
        // a tear: a band of the picture slips sideways for a moment
        float band = floor(vLoc.y * 24.0), tear = step(0.93, h11(band + floor(uTime * 9.0) * 7.0 + seed)) * (h11(band + uTime) - 0.5) * 0.08;
        vec2 uv = vUv + vec2(tear * uCell.x, 0.0);
        vec3 t = texture2D(tAtlas, uv).rgb;
        float scan = 0.65 + 0.35 * sin(vWorld.y * 9.0 - uTime * 6.0);
        float sweep = smoothstep(0.08, 0.0, abs(fract(vLoc.y * 0.5 - uTime * 0.18) - 0.5));
        float breathe = 0.8 + 0.2 * sin(uTime * 1.3 + seed);
        float edge = smoothstep(0.0, 0.06, vLoc.x) * smoothstep(1.0, 0.94, vLoc.x) * smoothstep(0.0, 0.04, vLoc.y) * smoothstep(1.0, 0.96, vLoc.y);
        float a = (t.r * 0.9 + t.g * 0.35) * scan * breathe + sweep * 0.12 + 0.025;
        vec3 c = vColour * a * edge * 0.75;
        // (in the air: the haze takes it like anything else, as light added)
        float f = cityFogAmount(cameraPosition, vWorld, fogDensity);
        gl_FragColor = vec4(c * (1.0 - f), 1.0);
      }`}),v=new U(d,m);return v.renderOrder=4,v.layers.enable(E),e.add(v),v}const ne=170,Ae=6;function Xe(e,n){const s=()=>{e.fill(),e.stroke()};e.fillStyle="rgb(255,0,0)",e.strokeStyle="rgb(255,200,0)",e.lineWidth=3,e.lineJoin="round";const l=(o,a,c=15)=>{e.beginPath(),e.arc(o,a,c,0,Math.PI*2),s()},i=o=>{e.beginPath(),e.moveTo(o[0][0],o[0][1]);for(const a of o.slice(1))e.lineTo(a[0],a[1]);e.closePath(),s()};if(n===0)l(0,-212),i([[-10,-197],[10,-197],[30,-182],[36,-80],[28,-60],[-28,-60],[-36,-80],[-30,-182]]),i([[-22,-62],[-6,-62],[-8,0],[-22,0]]),i([[6,-62],[22,-62],[22,0],[8,0]]);else if(n===1)l(2,-208,14),i([[-8,-194],[12,-194],[26,-178],[22,-112],[28,-88],[-24,-88],[-18,-112],[-24,-178]]),i([[-18,-90],[-4,-90],[-16,-2],[-30,0]]),i([[4,-90],[18,-90],[30,-2],[16,0]]),i([[24,-150],[40,-150],[44,-110],[24,-110]]);else if(n===2)e.beginPath(),e.moveTo(-74,-222),e.quadraticCurveTo(0,-300,74,-222),e.quadraticCurveTo(0,-238,-74,-222),s(),e.fillRect(-2,-238,4,60),l(0,-200,14),i([[-10,-186],[10,-186],[28,-170],[30,-84],[-30,-84],[-28,-170]]),i([[-22,-86],[-6,-86],[-8,0],[-22,0]]),i([[6,-86],[22,-86],[22,0],[8,0]]);else if(n===3)l(6,-200,14),i([[-6,-186],[14,-186],[30,-168],[30,-86],[-26,-86],[-26,-170]]),i([[-20,-88],[-6,-88],[-8,0],[-22,0]]),i([[6,-88],[20,-88],[22,0],[8,0]]),e.fillStyle="rgb(255,255,0)",e.fillRect(14,-150,10,14),e.fillStyle="rgb(255,0,0)";else if(n===4)e.beginPath(),e.ellipse(0,-206,18,20,0,0,Math.PI*2),s(),i([[-14,-190],[14,-190],[32,-170],[28,-96],[-28,-96],[-32,-170]]),i([[-22,-98],[-6,-98],[4,-2],[-10,0]]),i([[6,-98],[22,-98],[10,0],[-4,-2]]);else{e.beginPath(),e.moveTo(-82,-226),e.quadraticCurveTo(0,-306,82,-226),e.quadraticCurveTo(0,-242,-82,-226),s();for(const[o,a]of[[-26,1],[26,.94]])e.save(),e.translate(o,0),e.scale(a,a),l(0,-200,13),i([[-9,-187],[9,-187],[24,-170],[26,-86],[-26,-86],[-24,-170]]),i([[-18,-88],[-5,-88],[-7,0],[-19,0]]),i([[5,-88],[18,-88],[19,0],[7,0]]),e.restore()}}function Ze(){const s=document.createElement("canvas");s.width=1024,s.height=256;const l=s.getContext("2d");l.fillStyle="#000",l.fillRect(0,0,1024,256);for(let o=0;o<Ae;o++)l.save(),l.translate(o*ne+ne/2,253),Xe(l,o),l.restore();const i=new ye(s);return i.generateMipmaps=!0,i.minFilter=be,i.anisotropy=4,{tex:i,W:1024,H:256}}function eo(){let e=11;const n=()=>(e=e*16807%2147483647)/2147483647,s=[],l=(i,o,a,c,d)=>{for(let m=0;m<d;m++)s.push([i+(o-i)*n(),a+(c-a)*(m+n()*.8)/d])};l(-12.6,-10.7,-24.2,-19.6,2),l(-12.6,-10.7,-9,-5.8,1),l(-12.4,-10.7,-41,-25.5,4),l(10.7,12.6,-23,-15.8,3),l(10.7,14.2,-41.5,-25,4),l(-15.4,-12.7,-4,14,4),l(12.7,15.4,-4,14,4),l(-11.6,-8.6,17,52,5),l(8.6,11.6,17,52,5);for(const i of[-1,1])for(let o=-60;o>=-84;o-=6)s.push([i*(16.5+n()*.9),o+(n()-.5)*3]);return l(-21.8,-17.8,-118,-156,6),l(17.8,21.8,-118,-156,6),s.map(([i,o],a)=>({x:i,z:o,pose:Math.floor(n()*Ae),h:1.62+n()*.24,rim:n(),sway:n()*6.28}))}function oo(e){const{tex:n,W:s,H:l}=Ze(),i=eo(),o=i.length,a=new ze;a.setAttribute("position",new W([-.5,0,0,.5,0,0,.5,1,0,-.5,1,0],3)),a.setIndex([0,1,2,0,2,3]);const c=new Float32Array(o*4),d=new Float32Array(o*4);i.forEach((h,g)=>{c.set([h.x,0,h.z,h.sway],g*4),d.set([h.pose,h.h,h.rim,g%2?1:-1],g*4)}),a.setAttribute("aAt",new ie(c,4)),a.setAttribute("aInfo",new ie(d,4)),a.instanceCount=o;const m=new R({uniforms:{...L(),tPeople:{value:n},uTime:O.uTime,uCell:{value:new G(ne/s,256/l)}},fog:!0,side:j,vertexShader:`
      attribute vec4 aAt; attribute vec4 aInfo; uniform float uTime; uniform vec2 uCell;
      varying vec2 vUv; varying vec3 vWorld; varying float vRim;
      void main() {
        float h = aInfo.y, w = h * ${(ne/230).toFixed(4)};
        vec3 base = aAt.xyz;
        vec3 toCam = cameraPosition - base; toCam.y = 0.0; toCam = normalize(toCam + vec3(1e-4, 0.0, 0.0));
        vec3 right = vec3(toCam.z, 0.0, -toCam.x) * aInfo.w;
        float sway = sin(uTime * 0.9 + aAt.w) * 0.015 * position.y;
        vec3 p = base + right * (position.x * w + sway) + vec3(0.0, position.y * h * ${(256/230).toFixed(4)}, 0.0);
        vUv = vec2((aInfo.x + 0.5 + position.x) * uCell.x, position.y * uCell.y);
        vRim = aInfo.z;
        vWorld = p;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,fragmentShader:`
      uniform sampler2D tPeople; varying vec2 vUv; varying vec3 vWorld; varying float vRim;
      ${_}
      void main() {
        vec3 t = texture2D(tPeople, vUv).rgb;
        if (t.r < 0.5) discard;
        vec3 rim = mix(vec3(1.0, 0.25, 0.7), vec3(0.25, 0.8, 1.0), step(0.5, vRim)) * 0.22;
        vec3 c = vec3(0.006, 0.006, 0.008) + rim * t.g + vec3(0.9, 1.0, 1.1) * 1.4 * step(0.9, t.g) * step(0.9, t.r) * (1.0 - step(0.95, t.b));
        gl_FragColor = vec4(cityAirOf(c, vWorld), 1.0);
      }`}),v=new U(a,m);return v.frustumCulled=!1,e.add(v),v}const Pe=new q(1,.8,.6),ge=4;function to(e,n,s){const l=.07*(.72+.28*Math.sin(s*7.3+n*41)*Math.sin(s*2.1+n*17));if(e<0)return l;const i=e<.06||e>.14&&e<.2||e>.32?1:0;return l+(1-l)*i*(.55+.45*te.smoothstep(e,.32,.7))}function so({group:e,wake:n,relaySeats:s,lamps:l,collector:i,heart:o,floors:a}){e.traverse(f=>{if(!f.isMesh||f.userData.colliderSource)return;const u=f.material;u.isMeshStandardMaterial&&Z(u);const t=u.emissive;(t&&u.emissiveIntensity*(t.r+t.g+t.b)>.6||u.userData.mirror)&&f.layers.enable(E)});for(const f of a)_e(f.material,f.wet);const c=new Be(e,{collector:i,heart:o}),d=new Ne(e),m=new Ye(e,{wake:n,relaySeats:s});oo(e);const v=l.map(f=>({position:new T(f.x,f.y,f.z),color:Pe.clone().multiplyScalar(.55),power:0,reach:7.5,lamp:{zone:f.zone,delay:f.wake,seed:f.wake}})),h=ao(e,l,s,m.sources);ro(e,[[-5.4,-3],[5.4,-21],[-5.4,-45],[5.4,-63],[-5.4,-81],[5.4,-123],[-5.4,-147]]),e.add(no([-11.6,11.6],[0,7.4],-161.45,new q(.8,.22,1).multiplyScalar(.6)));const g=Array.from({length:ge},()=>{const f=new Re(16777215,0,11,2);return f.layers.enable(E),e.add(f),f});X.sources=[...v,...m.sources];const b=[];ee.city=!0;let r=0;return{update(f,u,t){r=u;const M=[n[0].value,n[1].value,n[2].value];for(const y of v){const z=y.lamp,k=M[z.zone];y.power=to(k<0?-1:k-z.delay,z.seed,r)}m.update(r),c.update(f,r),d.update(r),h.uniforms.uWakes.value.set(M[0],M[1],M[2]),b.length=0;const p=t.position;for(const y of X.sources){if(y.power<.15)continue;const z=y.position.distanceToSquared(p);z>400||b.push([z/y.power,y])}b.sort((y,z)=>y[0]-z[0]);for(let y=0;y<ge;y++){const z=g[y],k=b[y]?.[1];if(!k){z.intensity=0;continue}z.position.copy(k.position),k.lamp&&(z.position.y-=.5),z.color.copy(k.color).multiplyScalar(1/Math.max(.01,Math.max(k.color.r,k.color.g,k.color.b))),z.intensity=(k.lamp?55:24)*k.power,z.distance=k.lamp?12:9}},ending(){c.ending()},dispose(){X.sources=[],O.uFlash.value=0,ee.city=!1,ee.drop?.()}}}function ro(e,n){const l=n.length*26,i=new ze;i.setAttribute("position",new W([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3)),i.setIndex([0,1,2,0,2,3]);const o=new Float32Array(l*4);n.forEach(([d,m],v)=>{for(let h=0;h<26;h++){const g=(v*26+h)*4;o[g]=d,o[g+1]=m,o[g+2]=h/26,o[g+3]=Math.random()}}),i.setAttribute("aVent",new ie(o,4)),i.instanceCount=l;const a=new R({uniforms:{...L(),uTime:O.uTime},fog:!0,transparent:!0,depthWrite:!1,blending:Q,vertexShader:`
      attribute vec4 aVent; uniform float uTime;
      varying vec2 vQ; varying float vA; varying vec3 vWorld; varying float vSeed;
      void main() {
        float life = fract(uTime / 4.5 + aVent.z + aVent.w * 0.13);
        vec3 p = vec3(aVent.x, 0.0, aVent.y);
        p.y = 0.15 + life * 3.6 + life * life * 1.2;
        p.x += (aVent.w - 0.5) * 0.5 + life * life * 1.4 + sin(uTime * 0.8 + aVent.w * 6.0) * 0.2 * life;
        p.z += (fract(aVent.w * 7.3) - 0.5) * 0.5 + life * 0.6;
        float size = 0.5 + life * 2.4;
        vec3 toCam = normalize(cameraPosition - p), right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam)), up = cross(toCam, right);
        vec3 w = p + (right * position.x + up * position.y) * size;
        vQ = position.xy; vSeed = aVent.w;
        vA = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.45, 1.0, life));
        vWorld = w;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,fragmentShader:`
      varying vec2 vQ; varying float vA; varying vec3 vWorld; varying float vSeed;
      ${V}
      ${_}
      void main() {
        float r = length(vQ) * 2.0;
        float puff = (1.0 - smoothstep(0.35, 1.0, r)) * (0.65 + 0.35 * vnoise(vQ * 3.0 + vSeed * 9.0));
        float a = puff * vA * 0.14;
        if (a < 0.002) discard;
        vec3 lit = cityHaze(vec3(0.0, 0.1, 1.0), fogColor) * 9.0 + vec3(0.09, 0.07, 0.11);
        gl_FragColor = vec4(lit * a * (1.0 - cityFogAmount(cameraPosition, vWorld, fogDensity)), 1.0);
      }`}),c=new U(i,a);return c.frustumCulled=!1,c.renderOrder=5,e.add(c),c}function no([e,n],[s,l],i,o){const a=new Le(n-e,l-s);a.translate((e+n)/2,(s+l)/2,i);const c=new R({uniforms:{...L(),uColour:{value:o},uY:{value:new G(s,l)},uX:{value:new G(e,n)}},fog:!0,transparent:!0,depthWrite:!1,blending:Q,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2,vertexShader:"varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",fragmentShader:`uniform vec3 uColour; uniform vec2 uY; uniform vec2 uX; varying vec3 vWorld;
      ${_}
      void main() {
        float h = (vWorld.y - uY.x) / (uY.y - uY.x), u = (vWorld.x - uX.x) / (uX.y - uX.x);
        float k = pow(1.0 - h, 2.2) * smoothstep(0.0, 0.08, u) * smoothstep(1.0, 0.92, u) * (0.8 + 0.2 * sin(vWorld.x * 2.1));
        gl_FragColor = vec4(uColour * k * (1.0 - cityFogAmount(cameraPosition, vWorld, fogDensity)), 1.0);
      }`}),d=new U(a,c);return d.renderOrder=2,d}function ao(e,n,s,l){const i=[],o=[],a=[],c=[],d=[],m=(r,f,u,t,M,p)=>{for(const[y,z]of[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]])i.push(r+y*u,.028,f+z*u),o.push(r,f,u),a.push(t.r,t.g,t.b),c.push(...M),d.push(...p)};for(const r of n)m(r.x,r.z,4.6,Pe.clone().multiplyScalar(.11),[r.zone,r.wake,r.wake,0],[0,0,0,0]);for(const r of l){const f=r.position;if(f.y>11)continue;const u=r.sign,t=Math.abs(f.z)<51?f.z>-5?12:10:16,M=te.clamp(f.x,-t+1.5,t-1.5),p=2.6+Math.min(4,f.y*.35);m(M,f.z,p,r.color.clone().multiplyScalar(.55/(1+f.y*.12)),[u.zone,u.delay,u.seed,1],[u.mode,u.own?1:0,0,0])}const v=new $;v.setAttribute("position",new W(i,3)),v.setAttribute("aCentre",new W(o,3)),v.setAttribute("aColour",new W(a,3)),v.setAttribute("aInfo",new W(c,4)),v.setAttribute("aInfo2",new W(d,4)),v.computeBoundingSphere();const h={...L(),uTime:O.uTime,uWakes:{value:new T(-1,-1,-1)}},g=new R({uniforms:h,fog:!0,transparent:!0,depthWrite:!1,blending:Q,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2,vertexShader:`
      attribute vec3 aCentre; attribute vec3 aColour; attribute vec4 aInfo; attribute vec4 aInfo2;
      varying vec3 vWorld; varying vec3 vCentre; varying vec3 vColour; varying vec4 vInfo; varying vec4 vInfo2;
      void main() { vCentre = aCentre; vColour = aColour; vInfo = aInfo; vInfo2 = aInfo2; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,fragmentShader:`
      uniform float uTime; uniform vec3 uWakes;
      varying vec3 vWorld; varying vec3 vCentre; varying vec3 vColour; varying vec4 vInfo; varying vec4 vInfo2;
      ${V}
      ${Ce}
      ${_}
      float lampLevel(float t, float seed) {
        float dim = 0.07 * (0.72 + 0.28 * sin(uTime * 7.3 + seed * 41.0) * sin(uTime * 2.1 + seed * 17.0));
        if (t < 0.0) return dim;
        float on = (t < 0.06 || (t > 0.14 && t < 0.2) || t > 0.32) ? 1.0 : 0.0;
        return mix(dim, 1.0, on * mix(0.55, 1.0, smoothstep(0.32, 0.7, t)));
      }
      void main() {
        // only on the street: past the rails is a drop
        float z = vWorld.z, hw = z > -5.0 ? 12.0 : z > -51.0 ? 10.0 : z > -93.0 ? 16.0 : z > -114.0 ? 7.0 : 17.0;
        if (abs(vWorld.x) > hw - 0.3 || z > 14.7 || z < -157.7) discard;
        vec2 d = (vWorld.xz - vCentre.xy) / vCentre.z;
        float r2 = dot(d, d);
        if (r2 > 1.0) discard;
        float fall = pow(1.0 - r2, 2.2) * (0.75 + 0.25 * vnoise(vWorld.xz * 1.7));
        float zi = vInfo.x, wt = (zi < 0.5 ? uWakes.x : zi < 1.5 ? uWakes.y : uWakes.z);
        float p;
        if (vInfo.w < 0.5) p = lampLevel(wt < 0.0 ? -1.0 : wt - vInfo.y, vInfo.z);
        else p = signPower(vInfo2.x, vInfo.z, wt < 0.0 ? -1.0 : wt - vInfo.y, vInfo2.y, uTime).x;
        vec3 c = vColour * fall * p;
        gl_FragColor = vec4(c * (1.0 - cityFogAmount(cameraPosition, vWorld, fogDensity)), 1.0);
      }`}),b=new U(v,g);return b.renderOrder=2,e.add(b),{mesh:b,uniforms:h}}export{Z as air,so as dressCity};
