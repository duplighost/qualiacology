(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(i){if(i.ep)return;i.ep=!0;const r=t(i);fetch(i.href,r)}})();/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const pc="180",Ju=0,nl=1,Qu=2,Gh=1,Wh=2,Zn=3,ni=0,Ht=1,Et=2,xi=0,cs=1,il=2,sl=3,rl=4,ef=5,Li=100,tf=101,nf=102,sf=103,rf=104,of=200,af=201,cf=202,lf=203,ga=204,xa=205,hf=206,uf=207,ff=208,df=209,pf=210,mf=211,gf=212,xf=213,vf=214,va=0,_a=1,Ma=2,fs=3,ya=4,Sa=5,ba=6,wa=7,Xh=0,_f=1,Mf=2,vi=0,yf=1,Sf=2,bf=3,qh=4,wf=5,Tf=6,Ef=7,ol="attached",Af="detached",Yh=300,ds=301,ps=302,Ta=303,Ea=304,lo=306,ii=1e3,Tn=1001,Qr=1002,Qt=1003,jh=1004,Hs=1005,sn=1006,Gr=1007,Fn=1008,Bn=1009,Kh=1010,$h=1011,Zs=1012,mc=1013,Mi=1014,En=1015,si=1016,gc=1017,xc=1018,Js=1020,Zh=35902,Jh=35899,Qh=1021,eu=1022,ln=1023,Qs=1026,er=1027,vc=1028,_c=1029,tu=1030,Mc=1031,yc=1033,Wr=33776,Xr=33777,qr=33778,Yr=33779,Aa=35840,Ra=35841,Ca=35842,Pa=35843,Da=36196,Ia=37492,La=37496,Ua=37808,Na=37809,Fa=37810,za=37811,Oa=37812,ka=37813,Ba=37814,Ha=37815,Va=37816,Ga=37817,Wa=37818,Xa=37819,qa=37820,Ya=37821,ja=36492,Ka=36494,$a=36495,Za=36283,Ja=36284,Qa=36285,ec=36286,tr=2300,nr=2301,So=2302,al=2400,cl=2401,ll=2402,Rf=2500,Cf=0,nu=1,tc=2,Pf=3200,Df=3201,iu=0,If=1,Jn="",Pt="srgb",en="srgb-linear",eo="linear",ht="srgb",ki=7680,hl=519,Lf=512,Uf=513,Nf=514,su=515,Ff=516,zf=517,Of=518,kf=519,nc=35044,Vs=35048,ul="300 es",zn=2e3,to=2001;class Ss{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const i=n[e];if(i!==void 0){const r=i.indexOf(t);r!==-1&&i.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const i=n.slice(0);for(let r=0,o=i.length;r<o;r++)i[r].call(this,e);e.target=null}}}const Gt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let fl=1234567;const Xs=Math.PI/180,ms=180/Math.PI;function An(){const s=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Gt[s&255]+Gt[s>>8&255]+Gt[s>>16&255]+Gt[s>>24&255]+"-"+Gt[e&255]+Gt[e>>8&255]+"-"+Gt[e>>16&15|64]+Gt[e>>24&255]+"-"+Gt[t&63|128]+Gt[t>>8&255]+"-"+Gt[t>>16&255]+Gt[t>>24&255]+Gt[n&255]+Gt[n>>8&255]+Gt[n>>16&255]+Gt[n>>24&255]).toLowerCase()}function Xe(s,e,t){return Math.max(e,Math.min(t,s))}function Sc(s,e){return(s%e+e)%e}function Bf(s,e,t,n,i){return n+(s-e)*(i-n)/(t-e)}function Hf(s,e,t){return s!==e?(t-s)/(e-s):0}function qs(s,e,t){return(1-t)*s+t*e}function Vf(s,e,t,n){return qs(s,e,1-Math.exp(-t*n))}function Gf(s,e=1){return e-Math.abs(Sc(s,e*2)-e)}function Wf(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*(3-2*s))}function Xf(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*s*(s*(s*6-15)+10))}function qf(s,e){return s+Math.floor(Math.random()*(e-s+1))}function Yf(s,e){return s+Math.random()*(e-s)}function jf(s){return s*(.5-Math.random())}function Kf(s){s!==void 0&&(fl=s);let e=fl+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function $f(s){return s*Xs}function Zf(s){return s*ms}function Jf(s){return(s&s-1)===0&&s!==0}function Qf(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function ed(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function td(s,e,t,n,i){const r=Math.cos,o=Math.sin,a=r(t/2),c=o(t/2),l=r((e+n)/2),h=o((e+n)/2),u=r((e-n)/2),f=o((e-n)/2),m=r((n-e)/2),x=o((n-e)/2);switch(i){case"XYX":s.set(a*h,c*u,c*f,a*l);break;case"YZY":s.set(c*f,a*h,c*u,a*l);break;case"ZXZ":s.set(c*u,c*f,a*h,a*l);break;case"XZX":s.set(a*h,c*x,c*m,a*l);break;case"YXY":s.set(c*m,a*h,c*x,a*l);break;case"ZYZ":s.set(c*x,c*m,a*h,a*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function bn(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function ot(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}const nd={DEG2RAD:Xs,RAD2DEG:ms,generateUUID:An,clamp:Xe,euclideanModulo:Sc,mapLinear:Bf,inverseLerp:Hf,lerp:qs,damp:Vf,pingpong:Gf,smoothstep:Wf,smootherstep:Xf,randInt:qf,randFloat:Yf,randFloatSpread:jf,seededRandom:Kf,degToRad:$f,radToDeg:Zf,isPowerOfTwo:Jf,ceilPowerOfTwo:Qf,floorPowerOfTwo:ed,setQuaternionFromProperEuler:td,normalize:ot,denormalize:bn};class fe{constructor(e=0,t=0){fe.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Xe(this.x,e.x,t.x),this.y=Xe(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Xe(this.x,e,t),this.y=Xe(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Xe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Xe(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),i=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*i+e.x,this.y=r*i+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class xn{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,r,o,a){let c=n[i+0],l=n[i+1],h=n[i+2],u=n[i+3];const f=r[o+0],m=r[o+1],x=r[o+2],d=r[o+3];if(a===0){e[t+0]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u;return}if(a===1){e[t+0]=f,e[t+1]=m,e[t+2]=x,e[t+3]=d;return}if(u!==d||c!==f||l!==m||h!==x){let g=1-a;const p=c*f+l*m+h*x+u*d,v=p>=0?1:-1,M=1-p*p;if(M>Number.EPSILON){const y=Math.sqrt(M),S=Math.atan2(y,p*v);g=Math.sin(g*S)/y,a=Math.sin(a*S)/y}const _=a*v;if(c=c*g+f*_,l=l*g+m*_,h=h*g+x*_,u=u*g+d*_,g===1-a){const y=1/Math.sqrt(c*c+l*l+h*h+u*u);c*=y,l*=y,h*=y,u*=y}}e[t]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,i,r,o){const a=n[i],c=n[i+1],l=n[i+2],h=n[i+3],u=r[o],f=r[o+1],m=r[o+2],x=r[o+3];return e[t]=a*x+h*u+c*m-l*f,e[t+1]=c*x+h*f+l*u-a*m,e[t+2]=l*x+h*m+a*f-c*u,e[t+3]=h*x-a*u-c*f-l*m,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,i=e._y,r=e._z,o=e._order,a=Math.cos,c=Math.sin,l=a(n/2),h=a(i/2),u=a(r/2),f=c(n/2),m=c(i/2),x=c(r/2);switch(o){case"XYZ":this._x=f*h*u+l*m*x,this._y=l*m*u-f*h*x,this._z=l*h*x+f*m*u,this._w=l*h*u-f*m*x;break;case"YXZ":this._x=f*h*u+l*m*x,this._y=l*m*u-f*h*x,this._z=l*h*x-f*m*u,this._w=l*h*u+f*m*x;break;case"ZXY":this._x=f*h*u-l*m*x,this._y=l*m*u+f*h*x,this._z=l*h*x+f*m*u,this._w=l*h*u-f*m*x;break;case"ZYX":this._x=f*h*u-l*m*x,this._y=l*m*u+f*h*x,this._z=l*h*x-f*m*u,this._w=l*h*u+f*m*x;break;case"YZX":this._x=f*h*u+l*m*x,this._y=l*m*u+f*h*x,this._z=l*h*x-f*m*u,this._w=l*h*u-f*m*x;break;case"XZY":this._x=f*h*u-l*m*x,this._y=l*m*u-f*h*x,this._z=l*h*x+f*m*u,this._w=l*h*u+f*m*x;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],i=t[4],r=t[8],o=t[1],a=t[5],c=t[9],l=t[2],h=t[6],u=t[10],f=n+a+u;if(f>0){const m=.5/Math.sqrt(f+1);this._w=.25/m,this._x=(h-c)*m,this._y=(r-l)*m,this._z=(o-i)*m}else if(n>a&&n>u){const m=2*Math.sqrt(1+n-a-u);this._w=(h-c)/m,this._x=.25*m,this._y=(i+o)/m,this._z=(r+l)/m}else if(a>u){const m=2*Math.sqrt(1+a-n-u);this._w=(r-l)/m,this._x=(i+o)/m,this._y=.25*m,this._z=(c+h)/m}else{const m=2*Math.sqrt(1+u-n-a);this._w=(o-i)/m,this._x=(r+l)/m,this._y=(c+h)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Xe(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,i=e._y,r=e._z,o=e._w,a=t._x,c=t._y,l=t._z,h=t._w;return this._x=n*h+o*a+i*l-r*c,this._y=i*h+o*c+r*a-n*l,this._z=r*h+o*l+n*c-i*a,this._w=o*h-n*a-i*c-r*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,i=this._y,r=this._z,o=this._w;let a=o*e._w+n*e._x+i*e._y+r*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=n,this._y=i,this._z=r,this;const c=1-a*a;if(c<=Number.EPSILON){const m=1-t;return this._w=m*o+t*this._w,this._x=m*n+t*this._x,this._y=m*i+t*this._y,this._z=m*r+t*this._z,this.normalize(),this}const l=Math.sqrt(c),h=Math.atan2(l,a),u=Math.sin((1-t)*h)/l,f=Math.sin(t*h)/l;return this._w=o*u+this._w*f,this._x=n*u+this._x*f,this._y=i*u+this._y*f,this._z=r*u+this._z*f,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class R{constructor(e=0,t=0,n=0){R.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(dl.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(dl.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*i,this.y=r[1]*t+r[4]*n+r[7]*i,this.z=r[2]*t+r[5]*n+r[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*i+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*i+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*i+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*i+r[14])*o,this}applyQuaternion(e){const t=this.x,n=this.y,i=this.z,r=e.x,o=e.y,a=e.z,c=e.w,l=2*(o*i-a*n),h=2*(a*t-r*i),u=2*(r*n-o*t);return this.x=t+c*l+o*u-a*h,this.y=n+c*h+a*l-r*u,this.z=i+c*u+r*h-o*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*i,this.y=r[1]*t+r[5]*n+r[9]*i,this.z=r[2]*t+r[6]*n+r[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Xe(this.x,e.x,t.x),this.y=Xe(this.y,e.y,t.y),this.z=Xe(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Xe(this.x,e,t),this.y=Xe(this.y,e,t),this.z=Xe(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Xe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,i=e.y,r=e.z,o=t.x,a=t.y,c=t.z;return this.x=i*c-r*a,this.y=r*o-n*c,this.z=n*a-i*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return bo.copy(this).projectOnVector(e),this.sub(bo)}reflect(e){return this.sub(bo.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Xe(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const bo=new R,dl=new xn;class He{constructor(e,t,n,i,r,o,a,c,l){He.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,r,o,a,c,l)}set(e,t,n,i,r,o,a,c,l){const h=this.elements;return h[0]=e,h[1]=i,h[2]=a,h[3]=t,h[4]=r,h[5]=c,h[6]=n,h[7]=o,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,r=this.elements,o=n[0],a=n[3],c=n[6],l=n[1],h=n[4],u=n[7],f=n[2],m=n[5],x=n[8],d=i[0],g=i[3],p=i[6],v=i[1],M=i[4],_=i[7],y=i[2],S=i[5],A=i[8];return r[0]=o*d+a*v+c*y,r[3]=o*g+a*M+c*S,r[6]=o*p+a*_+c*A,r[1]=l*d+h*v+u*y,r[4]=l*g+h*M+u*S,r[7]=l*p+h*_+u*A,r[2]=f*d+m*v+x*y,r[5]=f*g+m*M+x*S,r[8]=f*p+m*_+x*A,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8];return t*o*h-t*a*l-n*r*h+n*a*c+i*r*l-i*o*c}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8],u=h*o-a*l,f=a*c-h*r,m=l*r-o*c,x=t*u+n*f+i*m;if(x===0)return this.set(0,0,0,0,0,0,0,0,0);const d=1/x;return e[0]=u*d,e[1]=(i*l-h*n)*d,e[2]=(a*n-i*o)*d,e[3]=f*d,e[4]=(h*t-i*c)*d,e[5]=(i*r-a*t)*d,e[6]=m*d,e[7]=(n*c-l*t)*d,e[8]=(o*t-n*r)*d,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,r,o,a){const c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*o+l*a)+o+e,-i*l,i*c,-i*(-l*o+c*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(wo.makeScale(e,t)),this}rotate(e){return this.premultiply(wo.makeRotation(-e)),this}translate(e,t){return this.premultiply(wo.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const wo=new He;function ru(s){for(let e=s.length-1;e>=0;--e)if(s[e]>=65535)return!0;return!1}function ir(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function id(){const s=ir("canvas");return s.style.display="block",s}const pl={};function sr(s){s in pl||(pl[s]=!0,console.warn(s))}function sd(s,e,t){return new Promise(function(n,i){function r(){switch(s.clientWaitSync(e,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}const ml=new He().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),gl=new He().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function rd(){const s={enabled:!0,workingColorSpace:en,spaces:{},convert:function(i,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===ht&&(i.r=ei(i.r),i.g=ei(i.g),i.b=ei(i.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(i.applyMatrix3(this.spaces[r].toXYZ),i.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===ht&&(i.r=ls(i.r),i.g=ls(i.g),i.b=ls(i.b))),i},workingToColorSpace:function(i,r){return this.convert(i,this.workingColorSpace,r)},colorSpaceToWorking:function(i,r){return this.convert(i,r,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===Jn?eo:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,r=this.workingColorSpace){return i.fromArray(this.spaces[r].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,r,o){return i.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(i,r){return sr("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),s.workingToColorSpace(i,r)},toWorkingColorSpace:function(i,r){return sr("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),s.colorSpaceToWorking(i,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return s.define({[en]:{primaries:e,whitePoint:n,transfer:eo,toXYZ:ml,fromXYZ:gl,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Pt},outputColorSpaceConfig:{drawingBufferColorSpace:Pt}},[Pt]:{primaries:e,whitePoint:n,transfer:ht,toXYZ:ml,fromXYZ:gl,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Pt}}}),s}const et=rd();function ei(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function ls(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}let Bi;class od{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Bi===void 0&&(Bi=ir("canvas")),Bi.width=e.width,Bi.height=e.height;const i=Bi.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=Bi}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=ir("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const i=n.getImageData(0,0,e.width,e.height),r=i.data;for(let o=0;o<r.length;o++)r[o]=ei(r[o]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(ei(t[n]/255)*255):t[n]=ei(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let ad=0;class bc{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:ad++}),this.uuid=An(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let r;if(Array.isArray(i)){r=[];for(let o=0,a=i.length;o<a;o++)i[o].isDataTexture?r.push(To(i[o].image)):r.push(To(i[o]))}else r=To(i);n.url=r}return t||(e.images[this.uuid]=n),n}}function To(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?od.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let cd=0;const Eo=new R;class Lt extends Ss{constructor(e=Lt.DEFAULT_IMAGE,t=Lt.DEFAULT_MAPPING,n=Tn,i=Tn,r=sn,o=Fn,a=ln,c=Bn,l=Lt.DEFAULT_ANISOTROPY,h=Jn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:cd++}),this.uuid=An(),this.name="",this.source=new bc(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=r,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new fe(0,0),this.repeat=new fe(1,1),this.center=new fe(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new He,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Eo).x}get height(){return this.source.getSize(Eo).y}get depth(){return this.source.getSize(Eo).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){console.warn(`THREE.Texture.setValues(): property '${t}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Yh)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case ii:e.x=e.x-Math.floor(e.x);break;case Tn:e.x=e.x<0?0:1;break;case Qr:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case ii:e.y=e.y-Math.floor(e.y);break;case Tn:e.y=e.y<0?0:1;break;case Qr:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Lt.DEFAULT_IMAGE=null;Lt.DEFAULT_MAPPING=Yh;Lt.DEFAULT_ANISOTROPY=1;class tt{constructor(e=0,t=0,n=0,i=1){tt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*i+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*i+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*i+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*i+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,r;const c=e.elements,l=c[0],h=c[4],u=c[8],f=c[1],m=c[5],x=c[9],d=c[2],g=c[6],p=c[10];if(Math.abs(h-f)<.01&&Math.abs(u-d)<.01&&Math.abs(x-g)<.01){if(Math.abs(h+f)<.1&&Math.abs(u+d)<.1&&Math.abs(x+g)<.1&&Math.abs(l+m+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const M=(l+1)/2,_=(m+1)/2,y=(p+1)/2,S=(h+f)/4,A=(u+d)/4,C=(x+g)/4;return M>_&&M>y?M<.01?(n=0,i=.707106781,r=.707106781):(n=Math.sqrt(M),i=S/n,r=A/n):_>y?_<.01?(n=.707106781,i=0,r=.707106781):(i=Math.sqrt(_),n=S/i,r=C/i):y<.01?(n=.707106781,i=.707106781,r=0):(r=Math.sqrt(y),n=A/r,i=C/r),this.set(n,i,r,t),this}let v=Math.sqrt((g-x)*(g-x)+(u-d)*(u-d)+(f-h)*(f-h));return Math.abs(v)<.001&&(v=1),this.x=(g-x)/v,this.y=(u-d)/v,this.z=(f-h)/v,this.w=Math.acos((l+m+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Xe(this.x,e.x,t.x),this.y=Xe(this.y,e.y,t.y),this.z=Xe(this.z,e.z,t.z),this.w=Xe(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Xe(this.x,e,t),this.y=Xe(this.y,e,t),this.z=Xe(this.z,e,t),this.w=Xe(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Xe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class ld extends Ss{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:sn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new tt(0,0,e,t),this.scissorTest=!1,this.viewport=new tt(0,0,e,t);const i={width:e,height:t,depth:n.depth},r=new Lt(i);this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:sn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,r=this.textures.length;i<r;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isArrayTexture=this.textures[i].image.depth>1;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const i=Object.assign({},e.textures[t].image);this.textures[t].source=new bc(i)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Cn extends ld{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class ou extends Lt{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=Qt,this.minFilter=Qt,this.wrapR=Tn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class hd extends Lt{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=Qt,this.minFilter=Qt,this.wrapR=Tn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class oi{constructor(e=new R(1/0,1/0,1/0),t=new R(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(_n.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(_n.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=_n.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,_n):_n.fromBufferAttribute(r,o),_n.applyMatrix4(e.matrixWorld),this.expandByPoint(_n);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),dr.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),dr.copy(n.boundingBox)),dr.applyMatrix4(e.matrixWorld),this.union(dr)}const i=e.children;for(let r=0,o=i.length;r<o;r++)this.expandByObject(i[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,_n),_n.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Ps),pr.subVectors(this.max,Ps),Hi.subVectors(e.a,Ps),Vi.subVectors(e.b,Ps),Gi.subVectors(e.c,Ps),ci.subVectors(Vi,Hi),li.subVectors(Gi,Vi),wi.subVectors(Hi,Gi);let t=[0,-ci.z,ci.y,0,-li.z,li.y,0,-wi.z,wi.y,ci.z,0,-ci.x,li.z,0,-li.x,wi.z,0,-wi.x,-ci.y,ci.x,0,-li.y,li.x,0,-wi.y,wi.x,0];return!Ao(t,Hi,Vi,Gi,pr)||(t=[1,0,0,0,1,0,0,0,1],!Ao(t,Hi,Vi,Gi,pr))?!1:(mr.crossVectors(ci,li),t=[mr.x,mr.y,mr.z],Ao(t,Hi,Vi,Gi,pr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,_n).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(_n).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Xn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Xn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Xn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Xn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Xn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Xn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Xn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Xn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Xn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Xn=[new R,new R,new R,new R,new R,new R,new R,new R],_n=new R,dr=new oi,Hi=new R,Vi=new R,Gi=new R,ci=new R,li=new R,wi=new R,Ps=new R,pr=new R,mr=new R,Ti=new R;function Ao(s,e,t,n,i){for(let r=0,o=s.length-3;r<=o;r+=3){Ti.fromArray(s,r);const a=i.x*Math.abs(Ti.x)+i.y*Math.abs(Ti.y)+i.z*Math.abs(Ti.z),c=e.dot(Ti),l=t.dot(Ti),h=n.dot(Ti);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>a)return!1}return!0}const ud=new oi,Ds=new R,Ro=new R;class Vn{constructor(e=new R,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):ud.setFromPoints(e).getCenter(n);let i=0;for(let r=0,o=e.length;r<o;r++)i=Math.max(i,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Ds.subVectors(e,this.center);const t=Ds.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(Ds,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Ro.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Ds.copy(e.center).add(Ro)),this.expandByPoint(Ds.copy(e.center).sub(Ro))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const qn=new R,Co=new R,gr=new R,hi=new R,Po=new R,xr=new R,Do=new R;class ho{constructor(e=new R,t=new R(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,qn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=qn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(qn.copy(this.origin).addScaledVector(this.direction,t),qn.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){Co.copy(e).add(t).multiplyScalar(.5),gr.copy(t).sub(e).normalize(),hi.copy(this.origin).sub(Co);const r=e.distanceTo(t)*.5,o=-this.direction.dot(gr),a=hi.dot(this.direction),c=-hi.dot(gr),l=hi.lengthSq(),h=Math.abs(1-o*o);let u,f,m,x;if(h>0)if(u=o*c-a,f=o*a-c,x=r*h,u>=0)if(f>=-x)if(f<=x){const d=1/h;u*=d,f*=d,m=u*(u+o*f+2*a)+f*(o*u+f+2*c)+l}else f=r,u=Math.max(0,-(o*f+a)),m=-u*u+f*(f+2*c)+l;else f=-r,u=Math.max(0,-(o*f+a)),m=-u*u+f*(f+2*c)+l;else f<=-x?(u=Math.max(0,-(-o*r+a)),f=u>0?-r:Math.min(Math.max(-r,-c),r),m=-u*u+f*(f+2*c)+l):f<=x?(u=0,f=Math.min(Math.max(-r,-c),r),m=f*(f+2*c)+l):(u=Math.max(0,-(o*r+a)),f=u>0?r:Math.min(Math.max(-r,-c),r),m=-u*u+f*(f+2*c)+l);else f=o>0?-r:r,u=Math.max(0,-(o*f+a)),m=-u*u+f*(f+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,u),i&&i.copy(Co).addScaledVector(gr,f),m}intersectSphere(e,t){qn.subVectors(e.center,this.origin);const n=qn.dot(this.direction),i=qn.dot(qn)-n*n,r=e.radius*e.radius;if(i>r)return null;const o=Math.sqrt(r-i),a=n-o,c=n+o;return c<0?null:a<0?this.at(c,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,r,o,a,c;const l=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,f=this.origin;return l>=0?(n=(e.min.x-f.x)*l,i=(e.max.x-f.x)*l):(n=(e.max.x-f.x)*l,i=(e.min.x-f.x)*l),h>=0?(r=(e.min.y-f.y)*h,o=(e.max.y-f.y)*h):(r=(e.max.y-f.y)*h,o=(e.min.y-f.y)*h),n>o||r>i||((r>n||isNaN(n))&&(n=r),(o<i||isNaN(i))&&(i=o),u>=0?(a=(e.min.z-f.z)*u,c=(e.max.z-f.z)*u):(a=(e.max.z-f.z)*u,c=(e.min.z-f.z)*u),n>c||a>i)||((a>n||n!==n)&&(n=a),(c<i||i!==i)&&(i=c),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,qn)!==null}intersectTriangle(e,t,n,i,r){Po.subVectors(t,e),xr.subVectors(n,e),Do.crossVectors(Po,xr);let o=this.direction.dot(Do),a;if(o>0){if(i)return null;a=1}else if(o<0)a=-1,o=-o;else return null;hi.subVectors(this.origin,e);const c=a*this.direction.dot(xr.crossVectors(hi,xr));if(c<0)return null;const l=a*this.direction.dot(Po.cross(hi));if(l<0||c+l>o)return null;const h=-a*hi.dot(Do);return h<0?null:this.at(h/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Oe{constructor(e,t,n,i,r,o,a,c,l,h,u,f,m,x,d,g){Oe.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,r,o,a,c,l,h,u,f,m,x,d,g)}set(e,t,n,i,r,o,a,c,l,h,u,f,m,x,d,g){const p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=i,p[1]=r,p[5]=o,p[9]=a,p[13]=c,p[2]=l,p[6]=h,p[10]=u,p[14]=f,p[3]=m,p[7]=x,p[11]=d,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Oe().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,i=1/Wi.setFromMatrixColumn(e,0).length(),r=1/Wi.setFromMatrixColumn(e,1).length(),o=1/Wi.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,i=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),c=Math.cos(i),l=Math.sin(i),h=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){const f=o*h,m=o*u,x=a*h,d=a*u;t[0]=c*h,t[4]=-c*u,t[8]=l,t[1]=m+x*l,t[5]=f-d*l,t[9]=-a*c,t[2]=d-f*l,t[6]=x+m*l,t[10]=o*c}else if(e.order==="YXZ"){const f=c*h,m=c*u,x=l*h,d=l*u;t[0]=f+d*a,t[4]=x*a-m,t[8]=o*l,t[1]=o*u,t[5]=o*h,t[9]=-a,t[2]=m*a-x,t[6]=d+f*a,t[10]=o*c}else if(e.order==="ZXY"){const f=c*h,m=c*u,x=l*h,d=l*u;t[0]=f-d*a,t[4]=-o*u,t[8]=x+m*a,t[1]=m+x*a,t[5]=o*h,t[9]=d-f*a,t[2]=-o*l,t[6]=a,t[10]=o*c}else if(e.order==="ZYX"){const f=o*h,m=o*u,x=a*h,d=a*u;t[0]=c*h,t[4]=x*l-m,t[8]=f*l+d,t[1]=c*u,t[5]=d*l+f,t[9]=m*l-x,t[2]=-l,t[6]=a*c,t[10]=o*c}else if(e.order==="YZX"){const f=o*c,m=o*l,x=a*c,d=a*l;t[0]=c*h,t[4]=d-f*u,t[8]=x*u+m,t[1]=u,t[5]=o*h,t[9]=-a*h,t[2]=-l*h,t[6]=m*u+x,t[10]=f-d*u}else if(e.order==="XZY"){const f=o*c,m=o*l,x=a*c,d=a*l;t[0]=c*h,t[4]=-u,t[8]=l*h,t[1]=f*u+d,t[5]=o*h,t[9]=m*u-x,t[2]=x*u-m,t[6]=a*h,t[10]=d*u+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(fd,e,dd)}lookAt(e,t,n){const i=this.elements;return an.subVectors(e,t),an.lengthSq()===0&&(an.z=1),an.normalize(),ui.crossVectors(n,an),ui.lengthSq()===0&&(Math.abs(n.z)===1?an.x+=1e-4:an.z+=1e-4,an.normalize(),ui.crossVectors(n,an)),ui.normalize(),vr.crossVectors(an,ui),i[0]=ui.x,i[4]=vr.x,i[8]=an.x,i[1]=ui.y,i[5]=vr.y,i[9]=an.y,i[2]=ui.z,i[6]=vr.z,i[10]=an.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,r=this.elements,o=n[0],a=n[4],c=n[8],l=n[12],h=n[1],u=n[5],f=n[9],m=n[13],x=n[2],d=n[6],g=n[10],p=n[14],v=n[3],M=n[7],_=n[11],y=n[15],S=i[0],A=i[4],C=i[8],b=i[12],w=i[1],D=i[5],L=i[9],N=i[13],F=i[2],B=i[6],V=i[10],X=i[14],k=i[3],Q=i[7],ae=i[11],pe=i[15];return r[0]=o*S+a*w+c*F+l*k,r[4]=o*A+a*D+c*B+l*Q,r[8]=o*C+a*L+c*V+l*ae,r[12]=o*b+a*N+c*X+l*pe,r[1]=h*S+u*w+f*F+m*k,r[5]=h*A+u*D+f*B+m*Q,r[9]=h*C+u*L+f*V+m*ae,r[13]=h*b+u*N+f*X+m*pe,r[2]=x*S+d*w+g*F+p*k,r[6]=x*A+d*D+g*B+p*Q,r[10]=x*C+d*L+g*V+p*ae,r[14]=x*b+d*N+g*X+p*pe,r[3]=v*S+M*w+_*F+y*k,r[7]=v*A+M*D+_*B+y*Q,r[11]=v*C+M*L+_*V+y*ae,r[15]=v*b+M*N+_*X+y*pe,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],i=e[8],r=e[12],o=e[1],a=e[5],c=e[9],l=e[13],h=e[2],u=e[6],f=e[10],m=e[14],x=e[3],d=e[7],g=e[11],p=e[15];return x*(+r*c*u-i*l*u-r*a*f+n*l*f+i*a*m-n*c*m)+d*(+t*c*m-t*l*f+r*o*f-i*o*m+i*l*h-r*c*h)+g*(+t*l*u-t*a*m-r*o*u+n*o*m+r*a*h-n*l*h)+p*(-i*a*h-t*c*u+t*a*f+i*o*u-n*o*f+n*c*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8],u=e[9],f=e[10],m=e[11],x=e[12],d=e[13],g=e[14],p=e[15],v=u*g*l-d*f*l+d*c*m-a*g*m-u*c*p+a*f*p,M=x*f*l-h*g*l-x*c*m+o*g*m+h*c*p-o*f*p,_=h*d*l-x*u*l+x*a*m-o*d*m-h*a*p+o*u*p,y=x*u*c-h*d*c-x*a*f+o*d*f+h*a*g-o*u*g,S=t*v+n*M+i*_+r*y;if(S===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const A=1/S;return e[0]=v*A,e[1]=(d*f*r-u*g*r-d*i*m+n*g*m+u*i*p-n*f*p)*A,e[2]=(a*g*r-d*c*r+d*i*l-n*g*l-a*i*p+n*c*p)*A,e[3]=(u*c*r-a*f*r-u*i*l+n*f*l+a*i*m-n*c*m)*A,e[4]=M*A,e[5]=(h*g*r-x*f*r+x*i*m-t*g*m-h*i*p+t*f*p)*A,e[6]=(x*c*r-o*g*r-x*i*l+t*g*l+o*i*p-t*c*p)*A,e[7]=(o*f*r-h*c*r+h*i*l-t*f*l-o*i*m+t*c*m)*A,e[8]=_*A,e[9]=(x*u*r-h*d*r-x*n*m+t*d*m+h*n*p-t*u*p)*A,e[10]=(o*d*r-x*a*r+x*n*l-t*d*l-o*n*p+t*a*p)*A,e[11]=(h*a*r-o*u*r-h*n*l+t*u*l+o*n*m-t*a*m)*A,e[12]=y*A,e[13]=(h*d*i-x*u*i+x*n*f-t*d*f-h*n*g+t*u*g)*A,e[14]=(x*a*i-o*d*i-x*n*c+t*d*c+o*n*g-t*a*g)*A,e[15]=(o*u*i-h*a*i+h*n*c-t*u*c-o*n*f+t*a*f)*A,this}scale(e){const t=this.elements,n=e.x,i=e.y,r=e.z;return t[0]*=n,t[4]*=i,t[8]*=r,t[1]*=n,t[5]*=i,t[9]*=r,t[2]*=n,t[6]*=i,t[10]*=r,t[3]*=n,t[7]*=i,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),i=Math.sin(t),r=1-n,o=e.x,a=e.y,c=e.z,l=r*o,h=r*a;return this.set(l*o+n,l*a-i*c,l*c+i*a,0,l*a+i*c,h*a+n,h*c-i*o,0,l*c-i*a,h*c+i*o,r*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,r,o){return this.set(1,n,r,0,e,1,o,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){const i=this.elements,r=t._x,o=t._y,a=t._z,c=t._w,l=r+r,h=o+o,u=a+a,f=r*l,m=r*h,x=r*u,d=o*h,g=o*u,p=a*u,v=c*l,M=c*h,_=c*u,y=n.x,S=n.y,A=n.z;return i[0]=(1-(d+p))*y,i[1]=(m+_)*y,i[2]=(x-M)*y,i[3]=0,i[4]=(m-_)*S,i[5]=(1-(f+p))*S,i[6]=(g+v)*S,i[7]=0,i[8]=(x+M)*A,i[9]=(g-v)*A,i[10]=(1-(f+d))*A,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){const i=this.elements;let r=Wi.set(i[0],i[1],i[2]).length();const o=Wi.set(i[4],i[5],i[6]).length(),a=Wi.set(i[8],i[9],i[10]).length();this.determinant()<0&&(r=-r),e.x=i[12],e.y=i[13],e.z=i[14],Mn.copy(this);const l=1/r,h=1/o,u=1/a;return Mn.elements[0]*=l,Mn.elements[1]*=l,Mn.elements[2]*=l,Mn.elements[4]*=h,Mn.elements[5]*=h,Mn.elements[6]*=h,Mn.elements[8]*=u,Mn.elements[9]*=u,Mn.elements[10]*=u,t.setFromRotationMatrix(Mn),n.x=r,n.y=o,n.z=a,this}makePerspective(e,t,n,i,r,o,a=zn,c=!1){const l=this.elements,h=2*r/(t-e),u=2*r/(n-i),f=(t+e)/(t-e),m=(n+i)/(n-i);let x,d;if(c)x=r/(o-r),d=o*r/(o-r);else if(a===zn)x=-(o+r)/(o-r),d=-2*o*r/(o-r);else if(a===to)x=-o/(o-r),d=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=h,l[4]=0,l[8]=f,l[12]=0,l[1]=0,l[5]=u,l[9]=m,l[13]=0,l[2]=0,l[6]=0,l[10]=x,l[14]=d,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,i,r,o,a=zn,c=!1){const l=this.elements,h=2/(t-e),u=2/(n-i),f=-(t+e)/(t-e),m=-(n+i)/(n-i);let x,d;if(c)x=1/(o-r),d=o/(o-r);else if(a===zn)x=-2/(o-r),d=-(o+r)/(o-r);else if(a===to)x=-1/(o-r),d=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=h,l[4]=0,l[8]=0,l[12]=f,l[1]=0,l[5]=u,l[9]=0,l[13]=m,l[2]=0,l[6]=0,l[10]=x,l[14]=d,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const Wi=new R,Mn=new Oe,fd=new R(0,0,0),dd=new R(1,1,1),ui=new R,vr=new R,an=new R,xl=new Oe,vl=new xn;class gn{constructor(e=0,t=0,n=0,i=gn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const i=e.elements,r=i[0],o=i[4],a=i[8],c=i[1],l=i[5],h=i[9],u=i[2],f=i[6],m=i[10];switch(t){case"XYZ":this._y=Math.asin(Xe(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,m),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(f,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Xe(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,m),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Xe(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-u,m),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-Xe(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(f,m),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(Xe(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,m));break;case"XZY":this._z=Math.asin(-Xe(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(f,l),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,m),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return xl.makeRotationFromQuaternion(e),this.setFromRotationMatrix(xl,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return vl.setFromEuler(this),this.setFromQuaternion(vl,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}gn.DEFAULT_ORDER="XYZ";class au{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let pd=0;const _l=new R,Xi=new xn,Yn=new Oe,_r=new R,Is=new R,md=new R,gd=new xn,Ml=new R(1,0,0),yl=new R(0,1,0),Sl=new R(0,0,1),bl={type:"added"},xd={type:"removed"},qi={type:"childadded",child:null},Io={type:"childremoved",child:null};class ct extends Ss{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:pd++}),this.uuid=An(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=ct.DEFAULT_UP.clone();const e=new R,t=new gn,n=new xn,i=new R(1,1,1);function r(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Oe},normalMatrix:{value:new He}}),this.matrix=new Oe,this.matrixWorld=new Oe,this.matrixAutoUpdate=ct.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=ct.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new au,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Xi.setFromAxisAngle(e,t),this.quaternion.multiply(Xi),this}rotateOnWorldAxis(e,t){return Xi.setFromAxisAngle(e,t),this.quaternion.premultiply(Xi),this}rotateX(e){return this.rotateOnAxis(Ml,e)}rotateY(e){return this.rotateOnAxis(yl,e)}rotateZ(e){return this.rotateOnAxis(Sl,e)}translateOnAxis(e,t){return _l.copy(e).applyQuaternion(this.quaternion),this.position.add(_l.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Ml,e)}translateY(e){return this.translateOnAxis(yl,e)}translateZ(e){return this.translateOnAxis(Sl,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Yn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?_r.copy(e):_r.set(e,t,n);const i=this.parent;this.updateWorldMatrix(!0,!1),Is.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Yn.lookAt(Is,_r,this.up):Yn.lookAt(_r,Is,this.up),this.quaternion.setFromRotationMatrix(Yn),i&&(Yn.extractRotation(i.matrixWorld),Xi.setFromRotationMatrix(Yn),this.quaternion.premultiply(Xi.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(bl),qi.child=e,this.dispatchEvent(qi),qi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(xd),Io.child=e,this.dispatchEvent(Io),Io.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Yn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Yn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Yn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(bl),qi.child=e,this.dispatchEvent(qi),qi.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){const o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const i=this.children;for(let r=0,o=i.length;r<o;r++)i[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Is,e,md),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Is,gd,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const i=this.children;for(let r=0,o=i.length;r<o;r++)i[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(a=>({...a})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function r(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=r(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const c=a.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){const u=c[l];r(e.shapes,u)}else r(e.shapes,c)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(r(e.materials,this.material[c]));i.material=a}else i.material=r(e.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){const c=this.animations[a];i.animations.push(r(e.animations,c))}}if(t){const a=o(e.geometries),c=o(e.materials),l=o(e.textures),h=o(e.images),u=o(e.shapes),f=o(e.skeletons),m=o(e.animations),x=o(e.nodes);a.length>0&&(n.geometries=a),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),f.length>0&&(n.skeletons=f),m.length>0&&(n.animations=m),x.length>0&&(n.nodes=x)}return n.object=i,n;function o(a){const c=[];for(const l in a){const h=a[l];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const i=e.children[n];this.add(i.clone())}return this}}ct.DEFAULT_UP=new R(0,1,0);ct.DEFAULT_MATRIX_AUTO_UPDATE=!0;ct.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const yn=new R,jn=new R,Lo=new R,Kn=new R,Yi=new R,ji=new R,wl=new R,Uo=new R,No=new R,Fo=new R,zo=new tt,Oo=new tt,ko=new tt;class wn{constructor(e=new R,t=new R,n=new R){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),yn.subVectors(e,t),i.cross(yn);const r=i.lengthSq();return r>0?i.multiplyScalar(1/Math.sqrt(r)):i.set(0,0,0)}static getBarycoord(e,t,n,i,r){yn.subVectors(i,t),jn.subVectors(n,t),Lo.subVectors(e,t);const o=yn.dot(yn),a=yn.dot(jn),c=yn.dot(Lo),l=jn.dot(jn),h=jn.dot(Lo),u=o*l-a*a;if(u===0)return r.set(0,0,0),null;const f=1/u,m=(l*c-a*h)*f,x=(o*h-a*c)*f;return r.set(1-m-x,x,m)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,Kn)===null?!1:Kn.x>=0&&Kn.y>=0&&Kn.x+Kn.y<=1}static getInterpolation(e,t,n,i,r,o,a,c){return this.getBarycoord(e,t,n,i,Kn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,Kn.x),c.addScaledVector(o,Kn.y),c.addScaledVector(a,Kn.z),c)}static getInterpolatedAttribute(e,t,n,i,r,o){return zo.setScalar(0),Oo.setScalar(0),ko.setScalar(0),zo.fromBufferAttribute(e,t),Oo.fromBufferAttribute(e,n),ko.fromBufferAttribute(e,i),o.setScalar(0),o.addScaledVector(zo,r.x),o.addScaledVector(Oo,r.y),o.addScaledVector(ko,r.z),o}static isFrontFacing(e,t,n,i){return yn.subVectors(n,t),jn.subVectors(e,t),yn.cross(jn).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return yn.subVectors(this.c,this.b),jn.subVectors(this.a,this.b),yn.cross(jn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return wn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return wn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,r){return wn.getInterpolation(e,this.a,this.b,this.c,t,n,i,r)}containsPoint(e){return wn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return wn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,i=this.b,r=this.c;let o,a;Yi.subVectors(i,n),ji.subVectors(r,n),Uo.subVectors(e,n);const c=Yi.dot(Uo),l=ji.dot(Uo);if(c<=0&&l<=0)return t.copy(n);No.subVectors(e,i);const h=Yi.dot(No),u=ji.dot(No);if(h>=0&&u<=h)return t.copy(i);const f=c*u-h*l;if(f<=0&&c>=0&&h<=0)return o=c/(c-h),t.copy(n).addScaledVector(Yi,o);Fo.subVectors(e,r);const m=Yi.dot(Fo),x=ji.dot(Fo);if(x>=0&&m<=x)return t.copy(r);const d=m*l-c*x;if(d<=0&&l>=0&&x<=0)return a=l/(l-x),t.copy(n).addScaledVector(ji,a);const g=h*x-m*u;if(g<=0&&u-h>=0&&m-x>=0)return wl.subVectors(r,i),a=(u-h)/(u-h+(m-x)),t.copy(i).addScaledVector(wl,a);const p=1/(g+d+f);return o=d*p,a=f*p,t.copy(n).addScaledVector(Yi,o).addScaledVector(ji,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const cu={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},fi={h:0,s:0,l:0},Mr={h:0,s:0,l:0};function Bo(s,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?s+(e-s)*6*t:t<1/2?e:t<2/3?s+(e-s)*6*(2/3-t):s}class xe{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Pt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,et.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=et.workingColorSpace){return this.r=e,this.g=t,this.b=n,et.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=et.workingColorSpace){if(e=Sc(e,1),t=Xe(t,0,1),n=Xe(n,0,1),t===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=Bo(o,r,e+1/3),this.g=Bo(o,r,e),this.b=Bo(o,r,e-1/3)}return et.colorSpaceToWorking(this,i),this}setStyle(e,t=Pt){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const o=i[1],a=i[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=i[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Pt){const n=cu[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=ei(e.r),this.g=ei(e.g),this.b=ei(e.b),this}copyLinearToSRGB(e){return this.r=ls(e.r),this.g=ls(e.g),this.b=ls(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Pt){return et.workingToColorSpace(Wt.copy(this),e),Math.round(Xe(Wt.r*255,0,255))*65536+Math.round(Xe(Wt.g*255,0,255))*256+Math.round(Xe(Wt.b*255,0,255))}getHexString(e=Pt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=et.workingColorSpace){et.workingToColorSpace(Wt.copy(this),t);const n=Wt.r,i=Wt.g,r=Wt.b,o=Math.max(n,i,r),a=Math.min(n,i,r);let c,l;const h=(a+o)/2;if(a===o)c=0,l=0;else{const u=o-a;switch(l=h<=.5?u/(o+a):u/(2-o-a),o){case n:c=(i-r)/u+(i<r?6:0);break;case i:c=(r-n)/u+2;break;case r:c=(n-i)/u+4;break}c/=6}return e.h=c,e.s=l,e.l=h,e}getRGB(e,t=et.workingColorSpace){return et.workingToColorSpace(Wt.copy(this),t),e.r=Wt.r,e.g=Wt.g,e.b=Wt.b,e}getStyle(e=Pt){et.workingToColorSpace(Wt.copy(this),e);const t=Wt.r,n=Wt.g,i=Wt.b;return e!==Pt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(fi),this.setHSL(fi.h+e,fi.s+t,fi.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(fi),e.getHSL(Mr);const n=qs(fi.h,Mr.h,t),i=qs(fi.s,Mr.s,t),r=qs(fi.l,Mr.l,t);return this.setHSL(n,i,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,i=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*i,this.g=r[1]*t+r[4]*n+r[7]*i,this.b=r[2]*t+r[5]*n+r[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Wt=new xe;xe.NAMES=cu;let vd=0;class kn extends Ss{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:vd++}),this.uuid=An(),this.name="",this.type="Material",this.blending=cs,this.side=ni,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=ga,this.blendDst=xa,this.blendEquation=Li,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new xe(0,0,0),this.blendAlpha=0,this.depthFunc=fs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=hl,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ki,this.stencilZFail=ki,this.stencilZPass=ki,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==cs&&(n.blending=this.blending),this.side!==ni&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==ga&&(n.blendSrc=this.blendSrc),this.blendDst!==xa&&(n.blendDst=this.blendDst),this.blendEquation!==Li&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==fs&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==hl&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==ki&&(n.stencilFail=this.stencilFail),this.stencilZFail!==ki&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==ki&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(r){const o=[];for(const a in r){const c=r[a];delete c.metadata,o.push(c)}return o}if(t){const r=i(e.textures),o=i(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const i=t.length;n=new Array(i);for(let r=0;r!==i;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class Fi extends kn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new xe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new gn,this.combine=Xh,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Dt=new R,yr=new fe;let _d=0;class At{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:_d++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=nc,this.updateRanges=[],this.gpuType=En,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,r=this.itemSize;i<r;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)yr.fromBufferAttribute(this,t),yr.applyMatrix3(e),this.setXY(t,yr.x,yr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Dt.fromBufferAttribute(this,t),Dt.applyMatrix3(e),this.setXYZ(t,Dt.x,Dt.y,Dt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Dt.fromBufferAttribute(this,t),Dt.applyMatrix4(e),this.setXYZ(t,Dt.x,Dt.y,Dt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Dt.fromBufferAttribute(this,t),Dt.applyNormalMatrix(e),this.setXYZ(t,Dt.x,Dt.y,Dt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Dt.fromBufferAttribute(this,t),Dt.transformDirection(e),this.setXYZ(t,Dt.x,Dt.y,Dt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=bn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=ot(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=bn(t,this.array)),t}setX(e,t){return this.normalized&&(t=ot(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=bn(t,this.array)),t}setY(e,t){return this.normalized&&(t=ot(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=bn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=ot(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=bn(t,this.array)),t}setW(e,t){return this.normalized&&(t=ot(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=ot(t,this.array),n=ot(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=ot(t,this.array),n=ot(n,this.array),i=ot(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,r){return e*=this.itemSize,this.normalized&&(t=ot(t,this.array),n=ot(n,this.array),i=ot(i,this.array),r=ot(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==nc&&(e.usage=this.usage),e}}class wc extends At{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Tc extends At{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class Ve extends At{constructor(e,t,n){super(new Float32Array(e),t,n)}}let Md=0;const fn=new Oe,Ho=new ct,Ki=new R,cn=new oi,Ls=new oi,Ft=new R;class Ct extends Ss{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Md++}),this.uuid=An(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(ru(e)?Tc:wc)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new He().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return fn.makeRotationFromQuaternion(e),this.applyMatrix4(fn),this}rotateX(e){return fn.makeRotationX(e),this.applyMatrix4(fn),this}rotateY(e){return fn.makeRotationY(e),this.applyMatrix4(fn),this}rotateZ(e){return fn.makeRotationZ(e),this.applyMatrix4(fn),this}translate(e,t,n){return fn.makeTranslation(e,t,n),this.applyMatrix4(fn),this}scale(e,t,n){return fn.makeScale(e,t,n),this.applyMatrix4(fn),this}lookAt(e){return Ho.lookAt(e),Ho.updateMatrix(),this.applyMatrix4(Ho.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ki).negate(),this.translate(Ki.x,Ki.y,Ki.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let i=0,r=e.length;i<r;i++){const o=e[i];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Ve(n,3))}else{const n=Math.min(e.length,t.count);for(let i=0;i<n;i++){const r=e[i];t.setXYZ(i,r.x,r.y,r.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new oi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new R(-1/0,-1/0,-1/0),new R(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){const r=t[n];cn.setFromBufferAttribute(r),this.morphTargetsRelative?(Ft.addVectors(this.boundingBox.min,cn.min),this.boundingBox.expandByPoint(Ft),Ft.addVectors(this.boundingBox.max,cn.max),this.boundingBox.expandByPoint(Ft)):(this.boundingBox.expandByPoint(cn.min),this.boundingBox.expandByPoint(cn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Vn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new R,1/0);return}if(e){const n=this.boundingSphere.center;if(cn.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){const a=t[r];Ls.setFromBufferAttribute(a),this.morphTargetsRelative?(Ft.addVectors(cn.min,Ls.min),cn.expandByPoint(Ft),Ft.addVectors(cn.max,Ls.max),cn.expandByPoint(Ft)):(cn.expandByPoint(Ls.min),cn.expandByPoint(Ls.max))}cn.getCenter(n);let i=0;for(let r=0,o=e.count;r<o;r++)Ft.fromBufferAttribute(e,r),i=Math.max(i,n.distanceToSquared(Ft));if(t)for(let r=0,o=t.length;r<o;r++){const a=t[r],c=this.morphTargetsRelative;for(let l=0,h=a.count;l<h;l++)Ft.fromBufferAttribute(a,l),c&&(Ki.fromBufferAttribute(e,l),Ft.add(Ki)),i=Math.max(i,n.distanceToSquared(Ft))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,i=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new At(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],c=[];for(let C=0;C<n.count;C++)a[C]=new R,c[C]=new R;const l=new R,h=new R,u=new R,f=new fe,m=new fe,x=new fe,d=new R,g=new R;function p(C,b,w){l.fromBufferAttribute(n,C),h.fromBufferAttribute(n,b),u.fromBufferAttribute(n,w),f.fromBufferAttribute(r,C),m.fromBufferAttribute(r,b),x.fromBufferAttribute(r,w),h.sub(l),u.sub(l),m.sub(f),x.sub(f);const D=1/(m.x*x.y-x.x*m.y);isFinite(D)&&(d.copy(h).multiplyScalar(x.y).addScaledVector(u,-m.y).multiplyScalar(D),g.copy(u).multiplyScalar(m.x).addScaledVector(h,-x.x).multiplyScalar(D),a[C].add(d),a[b].add(d),a[w].add(d),c[C].add(g),c[b].add(g),c[w].add(g))}let v=this.groups;v.length===0&&(v=[{start:0,count:e.count}]);for(let C=0,b=v.length;C<b;++C){const w=v[C],D=w.start,L=w.count;for(let N=D,F=D+L;N<F;N+=3)p(e.getX(N+0),e.getX(N+1),e.getX(N+2))}const M=new R,_=new R,y=new R,S=new R;function A(C){y.fromBufferAttribute(i,C),S.copy(y);const b=a[C];M.copy(b),M.sub(y.multiplyScalar(y.dot(b))).normalize(),_.crossVectors(S,b);const D=_.dot(c[C])<0?-1:1;o.setXYZW(C,M.x,M.y,M.z,D)}for(let C=0,b=v.length;C<b;++C){const w=v[C],D=w.start,L=w.count;for(let N=D,F=D+L;N<F;N+=3)A(e.getX(N+0)),A(e.getX(N+1)),A(e.getX(N+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new At(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let f=0,m=n.count;f<m;f++)n.setXYZ(f,0,0,0);const i=new R,r=new R,o=new R,a=new R,c=new R,l=new R,h=new R,u=new R;if(e)for(let f=0,m=e.count;f<m;f+=3){const x=e.getX(f+0),d=e.getX(f+1),g=e.getX(f+2);i.fromBufferAttribute(t,x),r.fromBufferAttribute(t,d),o.fromBufferAttribute(t,g),h.subVectors(o,r),u.subVectors(i,r),h.cross(u),a.fromBufferAttribute(n,x),c.fromBufferAttribute(n,d),l.fromBufferAttribute(n,g),a.add(h),c.add(h),l.add(h),n.setXYZ(x,a.x,a.y,a.z),n.setXYZ(d,c.x,c.y,c.z),n.setXYZ(g,l.x,l.y,l.z)}else for(let f=0,m=t.count;f<m;f+=3)i.fromBufferAttribute(t,f+0),r.fromBufferAttribute(t,f+1),o.fromBufferAttribute(t,f+2),h.subVectors(o,r),u.subVectors(i,r),h.cross(u),n.setXYZ(f+0,h.x,h.y,h.z),n.setXYZ(f+1,h.x,h.y,h.z),n.setXYZ(f+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Ft.fromBufferAttribute(e,t),Ft.normalize(),e.setXYZ(t,Ft.x,Ft.y,Ft.z)}toNonIndexed(){function e(a,c){const l=a.array,h=a.itemSize,u=a.normalized,f=new l.constructor(c.length*h);let m=0,x=0;for(let d=0,g=c.length;d<g;d++){a.isInterleavedBufferAttribute?m=c[d]*a.data.stride+a.offset:m=c[d]*h;for(let p=0;p<h;p++)f[x++]=l[m++]}return new At(f,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Ct,n=this.index.array,i=this.attributes;for(const a in i){const c=i[a],l=e(c,n);t.setAttribute(a,l)}const r=this.morphAttributes;for(const a in r){const c=[],l=r[a];for(let h=0,u=l.length;h<u;h++){const f=l[h],m=e(f,n);c.push(m)}t.morphAttributes[a]=c}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,c=o.length;a<c;a++){const l=o[a];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const c in n){const l=n[c];e.data.attributes[c]=l.toJSON(e.data)}const i={};let r=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],h=[];for(let u=0,f=l.length;u<f;u++){const m=l[u];h.push(m.toJSON(e.data))}h.length>0&&(i[c]=h,r=!0)}r&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const i=e.attributes;for(const l in i){const h=i[l];this.setAttribute(l,h.clone(t))}const r=e.morphAttributes;for(const l in r){const h=[],u=r[l];for(let f=0,m=u.length;f<m;f++)h.push(u[f].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let l=0,h=o.length;l<h;l++){const u=o[l];this.addGroup(u.start,u.count,u.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Tl=new Oe,Ei=new ho,Sr=new Vn,El=new R,br=new R,wr=new R,Tr=new R,Vo=new R,Er=new R,Al=new R,Ar=new R;class Je extends ct{constructor(e=new Ct,t=new Fi){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){const a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){const n=this.geometry,i=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(i,e);const a=this.morphTargetInfluences;if(r&&a){Er.set(0,0,0);for(let c=0,l=r.length;c<l;c++){const h=a[c],u=r[c];h!==0&&(Vo.fromBufferAttribute(u,e),o?Er.addScaledVector(Vo,h):Er.addScaledVector(Vo.sub(t),h))}t.add(Er)}return t}raycast(e,t){const n=this.geometry,i=this.material,r=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Sr.copy(n.boundingSphere),Sr.applyMatrix4(r),Ei.copy(e.ray).recast(e.near),!(Sr.containsPoint(Ei.origin)===!1&&(Ei.intersectSphere(Sr,El)===null||Ei.origin.distanceToSquared(El)>(e.far-e.near)**2))&&(Tl.copy(r).invert(),Ei.copy(e.ray).applyMatrix4(Tl),!(n.boundingBox!==null&&Ei.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Ei)))}_computeIntersections(e,t,n){let i;const r=this.geometry,o=this.material,a=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,f=r.groups,m=r.drawRange;if(a!==null)if(Array.isArray(o))for(let x=0,d=f.length;x<d;x++){const g=f[x],p=o[g.materialIndex],v=Math.max(g.start,m.start),M=Math.min(a.count,Math.min(g.start+g.count,m.start+m.count));for(let _=v,y=M;_<y;_+=3){const S=a.getX(_),A=a.getX(_+1),C=a.getX(_+2);i=Rr(this,p,e,n,l,h,u,S,A,C),i&&(i.faceIndex=Math.floor(_/3),i.face.materialIndex=g.materialIndex,t.push(i))}}else{const x=Math.max(0,m.start),d=Math.min(a.count,m.start+m.count);for(let g=x,p=d;g<p;g+=3){const v=a.getX(g),M=a.getX(g+1),_=a.getX(g+2);i=Rr(this,o,e,n,l,h,u,v,M,_),i&&(i.faceIndex=Math.floor(g/3),t.push(i))}}else if(c!==void 0)if(Array.isArray(o))for(let x=0,d=f.length;x<d;x++){const g=f[x],p=o[g.materialIndex],v=Math.max(g.start,m.start),M=Math.min(c.count,Math.min(g.start+g.count,m.start+m.count));for(let _=v,y=M;_<y;_+=3){const S=_,A=_+1,C=_+2;i=Rr(this,p,e,n,l,h,u,S,A,C),i&&(i.faceIndex=Math.floor(_/3),i.face.materialIndex=g.materialIndex,t.push(i))}}else{const x=Math.max(0,m.start),d=Math.min(c.count,m.start+m.count);for(let g=x,p=d;g<p;g+=3){const v=g,M=g+1,_=g+2;i=Rr(this,o,e,n,l,h,u,v,M,_),i&&(i.faceIndex=Math.floor(g/3),t.push(i))}}}}function yd(s,e,t,n,i,r,o,a){let c;if(e.side===Ht?c=n.intersectTriangle(o,r,i,!0,a):c=n.intersectTriangle(i,r,o,e.side===ni,a),c===null)return null;Ar.copy(a),Ar.applyMatrix4(s.matrixWorld);const l=t.ray.origin.distanceTo(Ar);return l<t.near||l>t.far?null:{distance:l,point:Ar.clone(),object:s}}function Rr(s,e,t,n,i,r,o,a,c,l){s.getVertexPosition(a,br),s.getVertexPosition(c,wr),s.getVertexPosition(l,Tr);const h=yd(s,e,t,n,br,wr,Tr,Al);if(h){const u=new R;wn.getBarycoord(Al,br,wr,Tr,u),i&&(h.uv=wn.getInterpolatedAttribute(i,a,c,l,u,new fe)),r&&(h.uv1=wn.getInterpolatedAttribute(r,a,c,l,u,new fe)),o&&(h.normal=wn.getInterpolatedAttribute(o,a,c,l,u,new R),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const f={a,b:c,c:l,normal:new R,materialIndex:0};wn.getNormal(br,wr,Tr,f.normal),h.face=f,h.barycoord=u}return h}class bs extends Ct{constructor(e=1,t=1,n=1,i=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:r,depthSegments:o};const a=this;i=Math.floor(i),r=Math.floor(r),o=Math.floor(o);const c=[],l=[],h=[],u=[];let f=0,m=0;x("z","y","x",-1,-1,n,t,e,o,r,0),x("z","y","x",1,-1,n,t,-e,o,r,1),x("x","z","y",1,1,e,n,t,i,o,2),x("x","z","y",1,-1,e,n,-t,i,o,3),x("x","y","z",1,-1,e,t,n,i,r,4),x("x","y","z",-1,-1,e,t,-n,i,r,5),this.setIndex(c),this.setAttribute("position",new Ve(l,3)),this.setAttribute("normal",new Ve(h,3)),this.setAttribute("uv",new Ve(u,2));function x(d,g,p,v,M,_,y,S,A,C,b){const w=_/A,D=y/C,L=_/2,N=y/2,F=S/2,B=A+1,V=C+1;let X=0,k=0;const Q=new R;for(let ae=0;ae<V;ae++){const pe=ae*D-N;for(let Ne=0;Ne<B;Ne++){const nt=Ne*w-L;Q[d]=nt*v,Q[g]=pe*M,Q[p]=F,l.push(Q.x,Q.y,Q.z),Q[d]=0,Q[g]=0,Q[p]=S>0?1:-1,h.push(Q.x,Q.y,Q.z),u.push(Ne/A),u.push(1-ae/C),X+=1}}for(let ae=0;ae<C;ae++)for(let pe=0;pe<A;pe++){const Ne=f+pe+B*ae,nt=f+pe+B*(ae+1),st=f+(pe+1)+B*(ae+1),Qe=f+(pe+1)+B*ae;c.push(Ne,nt,Qe),c.push(nt,st,Qe),k+=6}a.addGroup(m,k,b),m+=k,f+=X}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new bs(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function gs(s){const e={};for(const t in s){e[t]={};for(const n in s[t]){const i=s[t][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone():Array.isArray(i)?e[t][n]=i.slice():e[t][n]=i}}return e}function $t(s){const e={};for(let t=0;t<s.length;t++){const n=gs(s[t]);for(const i in n)e[i]=n[i]}return e}function Sd(s){const e=[];for(let t=0;t<s.length;t++)e.push(s[t].clone());return e}function lu(s){const e=s.getRenderTarget();return e===null?s.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:et.workingColorSpace}const hu={clone:gs,merge:$t};var bd=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,wd=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Yt extends kn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=bd,this.fragmentShader=wd,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=gs(e.uniforms),this.uniformsGroups=Sd(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const i in this.uniforms){const o=this.uniforms[i].value;o&&o.isTexture?t.uniforms[i]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[i]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[i]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[i]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[i]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[i]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[i]={type:"m4",value:o.toArray()}:t.uniforms[i]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class uo extends ct{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Oe,this.projectionMatrix=new Oe,this.projectionMatrixInverse=new Oe,this.coordinateSystem=zn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const di=new R,Rl=new fe,Cl=new fe;class qt extends uo{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=ms*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Xs*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return ms*2*Math.atan(Math.tan(Xs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){di.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(di.x,di.y).multiplyScalar(-e/di.z),di.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(di.x,di.y).multiplyScalar(-e/di.z)}getViewSize(e,t){return this.getViewBounds(e,Rl,Cl),t.subVectors(Cl,Rl)}setViewOffset(e,t,n,i,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Xs*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,r=-.5*i;const o=this.view;if(this.view!==null&&this.view.enabled){const c=o.fullWidth,l=o.fullHeight;r+=o.offsetX*i/c,t-=o.offsetY*n/l,i*=o.width/c,n*=o.height/l}const a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const $i=-90,Zi=1;class Td extends ct{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new qt($i,Zi,e,t);i.layers=this.layers,this.add(i);const r=new qt($i,Zi,e,t);r.layers=this.layers,this.add(r);const o=new qt($i,Zi,e,t);o.layers=this.layers,this.add(o);const a=new qt($i,Zi,e,t);a.layers=this.layers,this.add(a);const c=new qt($i,Zi,e,t);c.layers=this.layers,this.add(c);const l=new qt($i,Zi,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,i,r,o,a,c]=t;for(const l of t)this.remove(l);if(e===zn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===to)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,c,l,h]=this.children,u=e.getRenderTarget(),f=e.getActiveCubeFace(),m=e.getActiveMipmapLevel(),x=e.xr.enabled;e.xr.enabled=!1;const d=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,i),e.render(t,r),e.setRenderTarget(n,1,i),e.render(t,o),e.setRenderTarget(n,2,i),e.render(t,a),e.setRenderTarget(n,3,i),e.render(t,c),e.setRenderTarget(n,4,i),e.render(t,l),n.texture.generateMipmaps=d,e.setRenderTarget(n,5,i),e.render(t,h),e.setRenderTarget(u,f,m),e.xr.enabled=x,n.texture.needsPMREMUpdate=!0}}class uu extends Lt{constructor(e=[],t=ds,n,i,r,o,a,c,l,h){super(e,t,n,i,r,o,a,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Ed extends Cn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new uu(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new bs(5,5,5),r=new Yt({name:"CubemapFromEquirect",uniforms:gs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Ht,blending:xi});r.uniforms.tEquirect.value=t;const o=new Je(i,r),a=t.minFilter;return t.minFilter===Fn&&(t.minFilter=sn),new Td(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){const r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,i);e.setRenderTarget(r)}}class We extends ct{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Ad={type:"move"};class Go{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new We,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new We,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new R,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new R),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new We,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new R,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new R),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,r=null,o=null;const a=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){o=!0;for(const d of e.hand.values()){const g=t.getJointPose(d,n),p=this._getHandJoint(l,d);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}const h=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],f=h.position.distanceTo(u.position),m=.02,x=.005;l.inputState.pinching&&f>m+x?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&f<=m-x&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&r!==null&&(i=r),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Ad)))}return a!==null&&(a.visible=i!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new We;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class Ec{constructor(e,t=25e-5){this.isFogExp2=!0,this.name="",this.color=new xe(e),this.density=t}clone(){return new Ec(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class no extends ct{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new gn,this.environmentIntensity=1,this.environmentRotation=new gn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Rd{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=nc,this.updateRanges=[],this.version=0,this.uuid=An()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let i=0,r=this.stride;i<r;i++)this.array[e+i]=t.array[n+i];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=An()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=An()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const Kt=new R;class Ac{constructor(e,t,n,i=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=i}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Kt.fromBufferAttribute(this,t),Kt.applyMatrix4(e),this.setXYZ(t,Kt.x,Kt.y,Kt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Kt.fromBufferAttribute(this,t),Kt.applyNormalMatrix(e),this.setXYZ(t,Kt.x,Kt.y,Kt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Kt.fromBufferAttribute(this,t),Kt.transformDirection(e),this.setXYZ(t,Kt.x,Kt.y,Kt.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=bn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=ot(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=ot(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=ot(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=ot(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=ot(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=bn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=bn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=bn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=bn(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=ot(t,this.array),n=ot(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=ot(t,this.array),n=ot(n,this.array),i=ot(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this}setXYZW(e,t,n,i,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=ot(t,this.array),n=ot(n,this.array),i=ot(i,this.array),r=ot(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this.data.array[e+3]=r,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[i+r])}return new At(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new Ac(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[i+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}const Pl=new R,Dl=new tt,Il=new tt,Cd=new R,Ll=new Oe,Cr=new R,Wo=new Vn,Ul=new Oe,Xo=new ho;class Pd extends Je{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=ol,this.bindMatrix=new Oe,this.bindMatrixInverse=new Oe,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new oi),this.boundingBox.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Cr),this.boundingBox.expandByPoint(Cr)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new Vn),this.boundingSphere.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Cr),this.boundingSphere.expandByPoint(Cr)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){const n=this.material,i=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Wo.copy(this.boundingSphere),Wo.applyMatrix4(i),e.ray.intersectsSphere(Wo)!==!1&&(Ul.copy(i).invert(),Xo.copy(e.ray).applyMatrix4(Ul),!(this.boundingBox!==null&&Xo.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,Xo)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new tt,t=this.geometry.attributes.skinWeight;for(let n=0,i=t.count;n<i;n++){e.fromBufferAttribute(t,n);const r=1/e.manhattanLength();r!==1/0?e.multiplyScalar(r):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===ol?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===Af?this.bindMatrixInverse.copy(this.bindMatrix).invert():console.warn("THREE.SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){const n=this.skeleton,i=this.geometry;Dl.fromBufferAttribute(i.attributes.skinIndex,e),Il.fromBufferAttribute(i.attributes.skinWeight,e),Pl.copy(t).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let r=0;r<4;r++){const o=Il.getComponent(r);if(o!==0){const a=Dl.getComponent(r);Ll.multiplyMatrices(n.bones[a].matrixWorld,n.boneInverses[a]),t.addScaledVector(Cd.copy(Pl).applyMatrix4(Ll),o)}}return t.applyMatrix4(this.bindMatrixInverse)}}class fu extends ct{constructor(){super(),this.isBone=!0,this.type="Bone"}}class Rc extends Lt{constructor(e=null,t=1,n=1,i,r,o,a,c,l=Qt,h=Qt,u,f){super(null,o,a,c,l,h,i,r,u,f),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Nl=new Oe,Dd=new Oe;let Id=class du{constructor(e=[],t=[]){this.uuid=An(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){const e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){console.warn("THREE.Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,i=this.bones.length;n<i;n++)this.boneInverses.push(new Oe)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){const n=new Oe;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){const e=this.bones,t=this.boneInverses,n=this.boneMatrices,i=this.boneTexture;for(let r=0,o=e.length;r<o;r++){const a=e[r]?e[r].matrixWorld:Dd;Nl.multiplyMatrices(a,t[r]),Nl.toArray(n,r*16)}i!==null&&(i.needsUpdate=!0)}clone(){return new du(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);const t=new Float32Array(e*e*4);t.set(this.boneMatrices);const n=new Rc(t,e,e,ln,En);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){const i=this.bones[t];if(i.name===e)return i}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,i=e.bones.length;n<i;n++){const r=e.bones[n];let o=t[r];o===void 0&&(console.warn("THREE.Skeleton: No bone found with UUID:",r),o=new fu),this.bones.push(o),this.boneInverses.push(new Oe().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){const e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;const t=this.bones,n=this.boneInverses;for(let i=0,r=t.length;i<r;i++){const o=t[i];e.bones.push(o.uuid);const a=n[i];e.boneInverses.push(a.toArray())}return e}};class ic extends At{constructor(e,t,n,i=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const Ji=new Oe,Fl=new Oe,Pr=[],zl=new oi,Ld=new Oe,Us=new Je,Ns=new Vn;class Ui extends Je{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new ic(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,Ld)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new oi),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Ji),zl.copy(e.boundingBox).applyMatrix4(Ji),this.boundingBox.union(zl)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Vn),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Ji),Ns.copy(e.boundingSphere).applyMatrix4(Ji),this.boundingSphere.union(Ns)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,i=this.morphTexture.source.data.data,r=n.length+1,o=e*r+1;for(let a=0;a<n.length;a++)n[a]=i[o+a]}raycast(e,t){const n=this.matrixWorld,i=this.count;if(Us.geometry=this.geometry,Us.material=this.material,Us.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Ns.copy(this.boundingSphere),Ns.applyMatrix4(n),e.ray.intersectsSphere(Ns)!==!1))for(let r=0;r<i;r++){this.getMatrixAt(r,Ji),Fl.multiplyMatrices(n,Ji),Us.matrixWorld=Fl,Us.raycast(e,Pr);for(let o=0,a=Pr.length;o<a;o++){const c=Pr[o];c.instanceId=r,c.object=this,t.push(c)}Pr.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new ic(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){const n=t.morphTargetInfluences,i=n.length+1;this.morphTexture===null&&(this.morphTexture=new Rc(new Float32Array(i*this.count),i,this.count,vc,En));const r=this.morphTexture.source.data.data;let o=0;for(let l=0;l<n.length;l++)o+=n[l];const a=this.geometry.morphTargetsRelative?1:1-o,c=i*e;r[c]=a,r.set(n,c+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const qo=new R,Ud=new R,Nd=new He;class gi{constructor(e=new R(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const i=qo.subVectors(n,t).cross(Ud.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(qo),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/i;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Nd.getNormalMatrix(e),i=this.coplanarPoint(qo).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Ai=new Vn,Fd=new fe(.5,.5),Dr=new R;class Cc{constructor(e=new gi,t=new gi,n=new gi,i=new gi,r=new gi,o=new gi){this.planes=[e,t,n,i,r,o]}set(e,t,n,i,r,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(i),a[4].copy(r),a[5].copy(o),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=zn,n=!1){const i=this.planes,r=e.elements,o=r[0],a=r[1],c=r[2],l=r[3],h=r[4],u=r[5],f=r[6],m=r[7],x=r[8],d=r[9],g=r[10],p=r[11],v=r[12],M=r[13],_=r[14],y=r[15];if(i[0].setComponents(l-o,m-h,p-x,y-v).normalize(),i[1].setComponents(l+o,m+h,p+x,y+v).normalize(),i[2].setComponents(l+a,m+u,p+d,y+M).normalize(),i[3].setComponents(l-a,m-u,p-d,y-M).normalize(),n)i[4].setComponents(c,f,g,_).normalize(),i[5].setComponents(l-c,m-f,p-g,y-_).normalize();else if(i[4].setComponents(l-c,m-f,p-g,y-_).normalize(),t===zn)i[5].setComponents(l+c,m+f,p+g,y+_).normalize();else if(t===to)i[5].setComponents(c,f,g,_).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ai.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ai.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ai)}intersectsSprite(e){Ai.center.set(0,0,0);const t=Fd.distanceTo(e.center);return Ai.radius=.7071067811865476+t,Ai.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ai)}intersectsSphere(e){const t=this.planes,n=e.center,i=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const i=t[n];if(Dr.x=i.normal.x>0?e.max.x:e.min.x,Dr.y=i.normal.y>0?e.max.y:e.min.y,Dr.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(Dr)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class pu extends kn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new xe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const io=new R,so=new R,Ol=new Oe,Fs=new ho,Ir=new Vn,Yo=new R,kl=new R;class Pc extends ct{constructor(e=new Ct,t=new pu){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let i=1,r=t.count;i<r;i++)io.fromBufferAttribute(t,i-1),so.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=io.distanceTo(so);e.setAttribute("lineDistance",new Ve(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,r=e.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ir.copy(n.boundingSphere),Ir.applyMatrix4(i),Ir.radius+=r,e.ray.intersectsSphere(Ir)===!1)return;Ol.copy(i).invert(),Fs.copy(e.ray).applyMatrix4(Ol);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=this.isLineSegments?2:1,h=n.index,f=n.attributes.position;if(h!==null){const m=Math.max(0,o.start),x=Math.min(h.count,o.start+o.count);for(let d=m,g=x-1;d<g;d+=l){const p=h.getX(d),v=h.getX(d+1),M=Lr(this,e,Fs,c,p,v,d);M&&t.push(M)}if(this.isLineLoop){const d=h.getX(x-1),g=h.getX(m),p=Lr(this,e,Fs,c,d,g,x-1);p&&t.push(p)}}else{const m=Math.max(0,o.start),x=Math.min(f.count,o.start+o.count);for(let d=m,g=x-1;d<g;d+=l){const p=Lr(this,e,Fs,c,d,d+1,d);p&&t.push(p)}if(this.isLineLoop){const d=Lr(this,e,Fs,c,x-1,m,x-1);d&&t.push(d)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){const a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function Lr(s,e,t,n,i,r,o){const a=s.geometry.attributes.position;if(io.fromBufferAttribute(a,i),so.fromBufferAttribute(a,r),t.distanceSqToSegment(io,so,Yo,kl)>n)return;Yo.applyMatrix4(s.matrixWorld);const l=e.ray.origin.distanceTo(Yo);if(!(l<e.near||l>e.far))return{distance:l,point:kl.clone().applyMatrix4(s.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:s}}const Bl=new R,Hl=new R;class zd extends Pc{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let i=0,r=t.count;i<r;i+=2)Bl.fromBufferAttribute(t,i),Hl.fromBufferAttribute(t,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+Bl.distanceTo(Hl);e.setAttribute("lineDistance",new Ve(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Od extends Pc{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}}class ro extends kn{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new xe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const Vl=new Oe,sc=new ho,Ur=new Vn,Nr=new R;class rc extends ct{constructor(e=new Ct,t=new ro){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,r=e.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ur.copy(n.boundingSphere),Ur.applyMatrix4(i),Ur.radius+=r,e.ray.intersectsSphere(Ur)===!1)return;Vl.copy(i).invert(),sc.copy(e.ray).applyMatrix4(Vl);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=n.index,u=n.attributes.position;if(l!==null){const f=Math.max(0,o.start),m=Math.min(l.count,o.start+o.count);for(let x=f,d=m;x<d;x++){const g=l.getX(x);Nr.fromBufferAttribute(u,g),Gl(Nr,g,c,i,e,t,this)}}else{const f=Math.max(0,o.start),m=Math.min(u.count,o.start+o.count);for(let x=f,d=m;x<d;x++)Nr.fromBufferAttribute(u,x),Gl(Nr,x,c,i,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){const a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function Gl(s,e,t,n,i,r,o){const a=sc.distanceSqToPoint(s);if(a<t){const c=new R;sc.closestPointToPoint(s,c),c.applyMatrix4(n);const l=i.ray.origin.distanceTo(c);if(l<i.near||l>i.far)return;r.push({distance:l,distanceToRay:Math.sqrt(a),point:c,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}class Dc extends Lt{constructor(e,t,n,i,r,o,a,c,l){super(e,t,n,i,r,o,a,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Ic extends Lt{constructor(e,t,n=Mi,i,r,o,a=Qt,c=Qt,l,h=Qs,u=1){if(h!==Qs&&h!==er)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const f={width:e,height:t,depth:u};super(f,i,r,o,a,c,h,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new bc(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class mu extends Lt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Lc extends Ct{constructor(e=1,t=1,n=4,i=8,r=1){super(),this.type="CapsuleGeometry",this.parameters={radius:e,height:t,capSegments:n,radialSegments:i,heightSegments:r},t=Math.max(0,t),n=Math.max(1,Math.floor(n)),i=Math.max(3,Math.floor(i)),r=Math.max(1,Math.floor(r));const o=[],a=[],c=[],l=[],h=t/2,u=Math.PI/2*e,f=t,m=2*u+f,x=n*2+r,d=i+1,g=new R,p=new R;for(let v=0;v<=x;v++){let M=0,_=0,y=0,S=0;if(v<=n){const b=v/n,w=b*Math.PI/2;_=-h-e*Math.cos(w),y=e*Math.sin(w),S=-e*Math.cos(w),M=b*u}else if(v<=n+r){const b=(v-n)/r;_=-h+b*t,y=e,S=0,M=u+b*f}else{const b=(v-n-r)/n,w=b*Math.PI/2;_=h+e*Math.sin(w),y=e*Math.cos(w),S=e*Math.sin(w),M=u+f+b*u}const A=Math.max(0,Math.min(1,M/m));let C=0;v===0?C=.5/i:v===x&&(C=-.5/i);for(let b=0;b<=i;b++){const w=b/i,D=w*Math.PI*2,L=Math.sin(D),N=Math.cos(D);p.x=-y*N,p.y=_,p.z=y*L,a.push(p.x,p.y,p.z),g.set(-y*N,S,y*L),g.normalize(),c.push(g.x,g.y,g.z),l.push(w+C,A)}if(v>0){const b=(v-1)*d;for(let w=0;w<i;w++){const D=b+w,L=b+w+1,N=v*d+w,F=v*d+w+1;o.push(D,L,N),o.push(L,F,N)}}}this.setIndex(o),this.setAttribute("position",new Ve(a,3)),this.setAttribute("normal",new Ve(c,3)),this.setAttribute("uv",new Ve(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Lc(e.radius,e.height,e.capSegments,e.radialSegments,e.heightSegments)}}class hs extends Ct{constructor(e=1,t=1,n=1,i=32,r=1,o=!1,a=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:i,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:c};const l=this;i=Math.floor(i),r=Math.floor(r);const h=[],u=[],f=[],m=[];let x=0;const d=[],g=n/2;let p=0;v(),o===!1&&(e>0&&M(!0),t>0&&M(!1)),this.setIndex(h),this.setAttribute("position",new Ve(u,3)),this.setAttribute("normal",new Ve(f,3)),this.setAttribute("uv",new Ve(m,2));function v(){const _=new R,y=new R;let S=0;const A=(t-e)/n;for(let C=0;C<=r;C++){const b=[],w=C/r,D=w*(t-e)+e;for(let L=0;L<=i;L++){const N=L/i,F=N*c+a,B=Math.sin(F),V=Math.cos(F);y.x=D*B,y.y=-w*n+g,y.z=D*V,u.push(y.x,y.y,y.z),_.set(B,A,V).normalize(),f.push(_.x,_.y,_.z),m.push(N,1-w),b.push(x++)}d.push(b)}for(let C=0;C<i;C++)for(let b=0;b<r;b++){const w=d[b][C],D=d[b+1][C],L=d[b+1][C+1],N=d[b][C+1];(e>0||b!==0)&&(h.push(w,D,N),S+=3),(t>0||b!==r-1)&&(h.push(D,L,N),S+=3)}l.addGroup(p,S,0),p+=S}function M(_){const y=x,S=new fe,A=new R;let C=0;const b=_===!0?e:t,w=_===!0?1:-1;for(let L=1;L<=i;L++)u.push(0,g*w,0),f.push(0,w,0),m.push(.5,.5),x++;const D=x;for(let L=0;L<=i;L++){const F=L/i*c+a,B=Math.cos(F),V=Math.sin(F);A.x=b*V,A.y=g*w,A.z=b*B,u.push(A.x,A.y,A.z),f.push(0,w,0),S.x=B*.5+.5,S.y=V*.5*w+.5,m.push(S.x,S.y),x++}for(let L=0;L<i;L++){const N=y+L,F=D+L;_===!0?h.push(F,F+1,N):h.push(F+1,F,N),C+=3}l.addGroup(p,C,_===!0?1:2),p+=C}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new hs(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Uc extends Ct{constructor(e=[],t=[],n=1,i=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:e,indices:t,radius:n,detail:i};const r=[],o=[];a(i),l(n),h(),this.setAttribute("position",new Ve(r,3)),this.setAttribute("normal",new Ve(r.slice(),3)),this.setAttribute("uv",new Ve(o,2)),i===0?this.computeVertexNormals():this.normalizeNormals();function a(v){const M=new R,_=new R,y=new R;for(let S=0;S<t.length;S+=3)m(t[S+0],M),m(t[S+1],_),m(t[S+2],y),c(M,_,y,v)}function c(v,M,_,y){const S=y+1,A=[];for(let C=0;C<=S;C++){A[C]=[];const b=v.clone().lerp(_,C/S),w=M.clone().lerp(_,C/S),D=S-C;for(let L=0;L<=D;L++)L===0&&C===S?A[C][L]=b:A[C][L]=b.clone().lerp(w,L/D)}for(let C=0;C<S;C++)for(let b=0;b<2*(S-C)-1;b++){const w=Math.floor(b/2);b%2===0?(f(A[C][w+1]),f(A[C+1][w]),f(A[C][w])):(f(A[C][w+1]),f(A[C+1][w+1]),f(A[C+1][w]))}}function l(v){const M=new R;for(let _=0;_<r.length;_+=3)M.x=r[_+0],M.y=r[_+1],M.z=r[_+2],M.normalize().multiplyScalar(v),r[_+0]=M.x,r[_+1]=M.y,r[_+2]=M.z}function h(){const v=new R;for(let M=0;M<r.length;M+=3){v.x=r[M+0],v.y=r[M+1],v.z=r[M+2];const _=g(v)/2/Math.PI+.5,y=p(v)/Math.PI+.5;o.push(_,1-y)}x(),u()}function u(){for(let v=0;v<o.length;v+=6){const M=o[v+0],_=o[v+2],y=o[v+4],S=Math.max(M,_,y),A=Math.min(M,_,y);S>.9&&A<.1&&(M<.2&&(o[v+0]+=1),_<.2&&(o[v+2]+=1),y<.2&&(o[v+4]+=1))}}function f(v){r.push(v.x,v.y,v.z)}function m(v,M){const _=v*3;M.x=e[_+0],M.y=e[_+1],M.z=e[_+2]}function x(){const v=new R,M=new R,_=new R,y=new R,S=new fe,A=new fe,C=new fe;for(let b=0,w=0;b<r.length;b+=9,w+=6){v.set(r[b+0],r[b+1],r[b+2]),M.set(r[b+3],r[b+4],r[b+5]),_.set(r[b+6],r[b+7],r[b+8]),S.set(o[w+0],o[w+1]),A.set(o[w+2],o[w+3]),C.set(o[w+4],o[w+5]),y.copy(v).add(M).add(_).divideScalar(3);const D=g(y);d(S,w+0,v,D),d(A,w+2,M,D),d(C,w+4,_,D)}}function d(v,M,_,y){y<0&&v.x===1&&(o[M]=v.x-1),_.x===0&&_.z===0&&(o[M]=y/2/Math.PI+.5)}function g(v){return Math.atan2(v.z,-v.x)}function p(v){return Math.atan2(-v.y,Math.sqrt(v.x*v.x+v.z*v.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Uc(e.vertices,e.indices,e.radius,e.details)}}class ai{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){console.warn("THREE.Curve: .getPoint() not implemented.")}getPointAt(e,t){const n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let n,i=this.getPoint(0),r=0;t.push(0);for(let o=1;o<=e;o++)n=this.getPoint(o/e),r+=n.distanceTo(i),t.push(r),i=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){const n=this.getLengths();let i=0;const r=n.length;let o;t?o=t:o=e*n[r-1];let a=0,c=r-1,l;for(;a<=c;)if(i=Math.floor(a+(c-a)/2),l=n[i]-o,l<0)a=i+1;else if(l>0)c=i-1;else{c=i;break}if(i=c,n[i]===o)return i/(r-1);const h=n[i],f=n[i+1]-h,m=(o-h)/f;return(i+m)/(r-1)}getTangent(e,t){let i=e-1e-4,r=e+1e-4;i<0&&(i=0),r>1&&(r=1);const o=this.getPoint(i),a=this.getPoint(r),c=t||(o.isVector2?new fe:new R);return c.copy(a).sub(o).normalize(),c}getTangentAt(e,t){const n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){const n=new R,i=[],r=[],o=[],a=new R,c=new Oe;for(let m=0;m<=e;m++){const x=m/e;i[m]=this.getTangentAt(x,new R)}r[0]=new R,o[0]=new R;let l=Number.MAX_VALUE;const h=Math.abs(i[0].x),u=Math.abs(i[0].y),f=Math.abs(i[0].z);h<=l&&(l=h,n.set(1,0,0)),u<=l&&(l=u,n.set(0,1,0)),f<=l&&n.set(0,0,1),a.crossVectors(i[0],n).normalize(),r[0].crossVectors(i[0],a),o[0].crossVectors(i[0],r[0]);for(let m=1;m<=e;m++){if(r[m]=r[m-1].clone(),o[m]=o[m-1].clone(),a.crossVectors(i[m-1],i[m]),a.length()>Number.EPSILON){a.normalize();const x=Math.acos(Xe(i[m-1].dot(i[m]),-1,1));r[m].applyMatrix4(c.makeRotationAxis(a,x))}o[m].crossVectors(i[m],r[m])}if(t===!0){let m=Math.acos(Xe(r[0].dot(r[e]),-1,1));m/=e,i[0].dot(a.crossVectors(r[0],r[e]))>0&&(m=-m);for(let x=1;x<=e;x++)r[x].applyMatrix4(c.makeRotationAxis(i[x],m*x)),o[x].crossVectors(i[x],r[x])}return{tangents:i,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){const e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}}class gu extends ai{constructor(e=0,t=0,n=1,i=1,r=0,o=Math.PI*2,a=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=i,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=c}getPoint(e,t=new fe){const n=t,i=Math.PI*2;let r=this.aEndAngle-this.aStartAngle;const o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=i;for(;r>i;)r-=i;r<Number.EPSILON&&(o?r=0:r=i),this.aClockwise===!0&&!o&&(r===i?r=-i:r=r-i);const a=this.aStartAngle+e*r;let c=this.aX+this.xRadius*Math.cos(a),l=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),f=c-this.aX,m=l-this.aY;c=f*h-m*u+this.aX,l=f*u+m*h+this.aY}return n.set(c,l)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){const e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}}class kd extends gu{constructor(e,t,n,i,r,o){super(e,t,n,n,i,r,o),this.isArcCurve=!0,this.type="ArcCurve"}}function Nc(){let s=0,e=0,t=0,n=0;function i(r,o,a,c){s=r,e=a,t=-3*r+3*o-2*a-c,n=2*r-2*o+a+c}return{initCatmullRom:function(r,o,a,c,l){i(o,a,l*(a-r),l*(c-o))},initNonuniformCatmullRom:function(r,o,a,c,l,h,u){let f=(o-r)/l-(a-r)/(l+h)+(a-o)/h,m=(a-o)/h-(c-o)/(h+u)+(c-a)/u;f*=h,m*=h,i(o,a,f,m)},calc:function(r){const o=r*r,a=o*r;return s+e*r+t*o+n*a}}}const Fr=new R,jo=new Nc,Ko=new Nc,$o=new Nc;class xu extends ai{constructor(e=[],t=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=i}getPoint(e,t=new R){const n=t,i=this.points,r=i.length,o=(r-(this.closed?0:1))*e;let a=Math.floor(o),c=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:c===0&&a===r-1&&(a=r-2,c=1);let l,h;this.closed||a>0?l=i[(a-1)%r]:(Fr.subVectors(i[0],i[1]).add(i[0]),l=Fr);const u=i[a%r],f=i[(a+1)%r];if(this.closed||a+2<r?h=i[(a+2)%r]:(Fr.subVectors(i[r-1],i[r-2]).add(i[r-1]),h=Fr),this.curveType==="centripetal"||this.curveType==="chordal"){const m=this.curveType==="chordal"?.5:.25;let x=Math.pow(l.distanceToSquared(u),m),d=Math.pow(u.distanceToSquared(f),m),g=Math.pow(f.distanceToSquared(h),m);d<1e-4&&(d=1),x<1e-4&&(x=d),g<1e-4&&(g=d),jo.initNonuniformCatmullRom(l.x,u.x,f.x,h.x,x,d,g),Ko.initNonuniformCatmullRom(l.y,u.y,f.y,h.y,x,d,g),$o.initNonuniformCatmullRom(l.z,u.z,f.z,h.z,x,d,g)}else this.curveType==="catmullrom"&&(jo.initCatmullRom(l.x,u.x,f.x,h.x,this.tension),Ko.initCatmullRom(l.y,u.y,f.y,h.y,this.tension),$o.initCatmullRom(l.z,u.z,f.z,h.z,this.tension));return n.set(jo.calc(c),Ko.calc(c),$o.calc(c)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(i.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const i=this.points[t];e.points.push(i.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(new R().fromArray(i))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}}function Wl(s,e,t,n,i){const r=(n-e)*.5,o=(i-t)*.5,a=s*s,c=s*a;return(2*t-2*n+r+o)*c+(-3*t+3*n-2*r-o)*a+r*s+t}function Bd(s,e){const t=1-s;return t*t*e}function Hd(s,e){return 2*(1-s)*s*e}function Vd(s,e){return s*s*e}function Ys(s,e,t,n){return Bd(s,e)+Hd(s,t)+Vd(s,n)}function Gd(s,e){const t=1-s;return t*t*t*e}function Wd(s,e){const t=1-s;return 3*t*t*s*e}function Xd(s,e){return 3*(1-s)*s*s*e}function qd(s,e){return s*s*s*e}function js(s,e,t,n,i){return Gd(s,e)+Wd(s,t)+Xd(s,n)+qd(s,i)}class Yd extends ai{constructor(e=new fe,t=new fe,n=new fe,i=new fe){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new fe){const n=t,i=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(js(e,i.x,r.x,o.x,a.x),js(e,i.y,r.y,o.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class jd extends ai{constructor(e=new R,t=new R,n=new R,i=new R){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new R){const n=t,i=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(js(e,i.x,r.x,o.x,a.x),js(e,i.y,r.y,o.y,a.y),js(e,i.z,r.z,o.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class Kd extends ai{constructor(e=new fe,t=new fe){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new fe){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new fe){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class $d extends ai{constructor(e=new R,t=new R){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new R){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new R){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Zd extends ai{constructor(e=new fe,t=new fe,n=new fe){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new fe){const n=t,i=this.v0,r=this.v1,o=this.v2;return n.set(Ys(e,i.x,r.x,o.x),Ys(e,i.y,r.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class vu extends ai{constructor(e=new R,t=new R,n=new R){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new R){const n=t,i=this.v0,r=this.v1,o=this.v2;return n.set(Ys(e,i.x,r.x,o.x),Ys(e,i.y,r.y,o.y),Ys(e,i.z,r.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Jd extends ai{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new fe){const n=t,i=this.points,r=(i.length-1)*e,o=Math.floor(r),a=r-o,c=i[o===0?o:o-1],l=i[o],h=i[o>i.length-2?i.length-1:o+1],u=i[o>i.length-3?i.length-1:o+2];return n.set(Wl(a,c.x,l.x,h.x,u.x),Wl(a,c.y,l.y,h.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(i.clone())}return this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const i=this.points[t];e.points.push(i.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(new fe().fromArray(i))}return this}}var Qd=Object.freeze({__proto__:null,ArcCurve:kd,CatmullRomCurve3:xu,CubicBezierCurve:Yd,CubicBezierCurve3:jd,EllipseCurve:gu,LineCurve:Kd,LineCurve3:$d,QuadraticBezierCurve:Zd,QuadraticBezierCurve3:vu,SplineCurve:Jd});class fo extends Uc{constructor(e=1,t=0){const n=(1+Math.sqrt(5))/2,i=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],r=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(i,r,e,t),this.type="IcosahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new fo(e.radius,e.detail)}}class Fc extends Ct{constructor(e=[new fe(0,-.5),new fe(.5,0),new fe(0,.5)],t=12,n=0,i=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:e,segments:t,phiStart:n,phiLength:i},t=Math.floor(t),i=Xe(i,0,Math.PI*2);const r=[],o=[],a=[],c=[],l=[],h=1/t,u=new R,f=new fe,m=new R,x=new R,d=new R;let g=0,p=0;for(let v=0;v<=e.length-1;v++)switch(v){case 0:g=e[v+1].x-e[v].x,p=e[v+1].y-e[v].y,m.x=p*1,m.y=-g,m.z=p*0,d.copy(m),m.normalize(),c.push(m.x,m.y,m.z);break;case e.length-1:c.push(d.x,d.y,d.z);break;default:g=e[v+1].x-e[v].x,p=e[v+1].y-e[v].y,m.x=p*1,m.y=-g,m.z=p*0,x.copy(m),m.x+=d.x,m.y+=d.y,m.z+=d.z,m.normalize(),c.push(m.x,m.y,m.z),d.copy(x)}for(let v=0;v<=t;v++){const M=n+v*h*i,_=Math.sin(M),y=Math.cos(M);for(let S=0;S<=e.length-1;S++){u.x=e[S].x*_,u.y=e[S].y,u.z=e[S].x*y,o.push(u.x,u.y,u.z),f.x=v/t,f.y=S/(e.length-1),a.push(f.x,f.y);const A=c[3*S+0]*_,C=c[3*S+1],b=c[3*S+0]*y;l.push(A,C,b)}}for(let v=0;v<t;v++)for(let M=0;M<e.length-1;M++){const _=M+v*e.length,y=_,S=_+e.length,A=_+e.length+1,C=_+1;r.push(y,S,C),r.push(A,C,S)}this.setIndex(r),this.setAttribute("position",new Ve(o,3)),this.setAttribute("uv",new Ve(a,2)),this.setAttribute("normal",new Ve(l,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Fc(e.points,e.segments,e.phiStart,e.phiLength)}}class Hn extends Ct{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};const r=e/2,o=t/2,a=Math.floor(n),c=Math.floor(i),l=a+1,h=c+1,u=e/a,f=t/c,m=[],x=[],d=[],g=[];for(let p=0;p<h;p++){const v=p*f-o;for(let M=0;M<l;M++){const _=M*u-r;x.push(_,-v,0),d.push(0,0,1),g.push(M/a),g.push(1-p/c)}}for(let p=0;p<c;p++)for(let v=0;v<a;v++){const M=v+l*p,_=v+l*(p+1),y=v+1+l*(p+1),S=v+1+l*p;m.push(M,_,S),m.push(_,y,S)}this.setIndex(m),this.setAttribute("position",new Ve(x,3)),this.setAttribute("normal",new Ve(d,3)),this.setAttribute("uv",new Ve(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Hn(e.width,e.height,e.widthSegments,e.heightSegments)}}class vn extends Ct{constructor(e=1,t=32,n=16,i=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:i,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const c=Math.min(o+a,Math.PI);let l=0;const h=[],u=new R,f=new R,m=[],x=[],d=[],g=[];for(let p=0;p<=n;p++){const v=[],M=p/n;let _=0;p===0&&o===0?_=.5/t:p===n&&c===Math.PI&&(_=-.5/t);for(let y=0;y<=t;y++){const S=y/t;u.x=-e*Math.cos(i+S*r)*Math.sin(o+M*a),u.y=e*Math.cos(o+M*a),u.z=e*Math.sin(i+S*r)*Math.sin(o+M*a),x.push(u.x,u.y,u.z),f.copy(u).normalize(),d.push(f.x,f.y,f.z),g.push(S+_,1-M),v.push(l++)}h.push(v)}for(let p=0;p<n;p++)for(let v=0;v<t;v++){const M=h[p][v+1],_=h[p][v],y=h[p+1][v],S=h[p+1][v+1];(p!==0||o>0)&&m.push(M,_,S),(p!==n-1||c<Math.PI)&&m.push(_,y,S)}this.setIndex(m),this.setAttribute("position",new Ve(x,3)),this.setAttribute("normal",new Ve(d,3)),this.setAttribute("uv",new Ve(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new vn(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class zc extends Ct{constructor(e=new vu(new R(-1,-1,0),new R(-1,1,0),new R(1,1,0)),t=64,n=1,i=8,r=!1){super(),this.type="TubeGeometry",this.parameters={path:e,tubularSegments:t,radius:n,radialSegments:i,closed:r};const o=e.computeFrenetFrames(t,r);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;const a=new R,c=new R,l=new fe;let h=new R;const u=[],f=[],m=[],x=[];d(),this.setIndex(x),this.setAttribute("position",new Ve(u,3)),this.setAttribute("normal",new Ve(f,3)),this.setAttribute("uv",new Ve(m,2));function d(){for(let M=0;M<t;M++)g(M);g(r===!1?t:0),v(),p()}function g(M){h=e.getPointAt(M/t,h);const _=o.normals[M],y=o.binormals[M];for(let S=0;S<=i;S++){const A=S/i*Math.PI*2,C=Math.sin(A),b=-Math.cos(A);c.x=b*_.x+C*y.x,c.y=b*_.y+C*y.y,c.z=b*_.z+C*y.z,c.normalize(),f.push(c.x,c.y,c.z),a.x=h.x+n*c.x,a.y=h.y+n*c.y,a.z=h.z+n*c.z,u.push(a.x,a.y,a.z)}}function p(){for(let M=1;M<=t;M++)for(let _=1;_<=i;_++){const y=(i+1)*(M-1)+(_-1),S=(i+1)*M+(_-1),A=(i+1)*M+_,C=(i+1)*(M-1)+_;x.push(y,S,C),x.push(S,A,C)}}function v(){for(let M=0;M<=t;M++)for(let _=0;_<=i;_++)l.x=M/t,l.y=_/i,m.push(l.x,l.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(e){return new zc(new Qd[e.path.type]().fromJSON(e.path),e.tubularSegments,e.radius,e.radialSegments,e.closed)}}class It extends kn{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new xe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new xe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=iu,this.normalScale=new fe(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new gn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Gn extends It{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new fe(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Xe(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new xe(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new xe(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new xe(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}}class ep extends kn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Pf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class tp extends kn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}function zr(s,e){return!s||s.constructor===e?s:typeof e.BYTES_PER_ELEMENT=="number"?new e(s):Array.prototype.slice.call(s)}function np(s){return ArrayBuffer.isView(s)&&!(s instanceof DataView)}function ip(s){function e(i,r){return s[i]-s[r]}const t=s.length,n=new Array(t);for(let i=0;i!==t;++i)n[i]=i;return n.sort(e),n}function Xl(s,e,t){const n=s.length,i=new s.constructor(n);for(let r=0,o=0;o!==n;++r){const a=t[r]*e;for(let c=0;c!==e;++c)i[o++]=s[a+c]}return i}function _u(s,e,t,n){let i=1,r=s[0];for(;r!==void 0&&r[n]===void 0;)r=s[i++];if(r===void 0)return;let o=r[n];if(o!==void 0)if(Array.isArray(o))do o=r[n],o!==void 0&&(e.push(r.time),t.push(...o)),r=s[i++];while(r!==void 0);else if(o.toArray!==void 0)do o=r[n],o!==void 0&&(e.push(r.time),o.toArray(t,t.length)),r=s[i++];while(r!==void 0);else do o=r[n],o!==void 0&&(e.push(r.time),t.push(o)),r=s[i++];while(r!==void 0)}class or{constructor(e,t,n,i){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){const t=this.parameterPositions;let n=this._cachedIndex,i=t[n],r=t[n-1];n:{e:{let o;t:{i:if(!(e<i)){for(let a=n+2;;){if(i===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=i,i=t[++n],e<i)break e}o=t.length;break t}if(!(e>=r)){const a=t[1];e<a&&(n=2,r=a);for(let c=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(i=r,r=t[--n-1],e>=r)break e}o=n,n=0;break t}break n}for(;n<o;){const a=n+o>>>1;e<t[a]?o=a:n=a+1}if(i=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,i)}return this.interpolate_(n,r,e,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,r=e*i;for(let o=0;o!==i;++o)t[o]=n[r+o];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}}class sp extends or{constructor(e,t,n,i){super(e,t,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:al,endingEnd:al}}intervalChanged_(e,t,n){const i=this.parameterPositions;let r=e-2,o=e+1,a=i[r],c=i[o];if(a===void 0)switch(this.getSettings_().endingStart){case cl:r=e,a=2*t-n;break;case ll:r=i.length-2,a=t+i[r]-i[r+1];break;default:r=e,a=n}if(c===void 0)switch(this.getSettings_().endingEnd){case cl:o=e,c=2*n-t;break;case ll:o=1,c=n+i[1]-i[0];break;default:o=e-1,c=t}const l=(n-t)*.5,h=this.valueSize;this._weightPrev=l/(t-a),this._weightNext=l/(c-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(e,t,n,i){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,h=this._offsetPrev,u=this._offsetNext,f=this._weightPrev,m=this._weightNext,x=(n-t)/(i-t),d=x*x,g=d*x,p=-f*g+2*f*d-f*x,v=(1+f)*g+(-1.5-2*f)*d+(-.5+f)*x+1,M=(-1-m)*g+(1.5+m)*d+.5*x,_=m*g-m*d;for(let y=0;y!==a;++y)r[y]=p*o[h+y]+v*o[l+y]+M*o[c+y]+_*o[u+y];return r}}class rp extends or{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,h=(n-t)/(i-t),u=1-h;for(let f=0;f!==a;++f)r[f]=o[l+f]*u+o[c+f]*h;return r}}class op extends or{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e){return this.copySampleValue_(e-1)}}class Pn{constructor(e,t,n,i){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=zr(t,this.TimeBufferType),this.values=zr(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(e){const t=e.constructor;let n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:zr(e.times,Array),values:zr(e.values,Array)};const i=e.getInterpolation();i!==e.DefaultInterpolation&&(n.interpolation=i)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new op(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new rp(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new sp(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case tr:t=this.InterpolantFactoryMethodDiscrete;break;case nr:t=this.InterpolantFactoryMethodLinear;break;case So:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){const n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return tr;case this.InterpolantFactoryMethodLinear:return nr;case this.InterpolantFactoryMethodSmooth:return So}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){const t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]+=e}return this}scale(e){if(e!==1){const t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]*=e}return this}trim(e,t){const n=this.times,i=n.length;let r=0,o=i-1;for(;r!==i&&n[r]<e;)++r;for(;o!==-1&&n[o]>t;)--o;if(++o,r!==0||o!==i){r>=o&&(o=Math.max(o,1),r=o-1);const a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let e=!0;const t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);const n=this.times,i=this.values,r=n.length;r===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==r;a++){const c=n[a];if(typeof c=="number"&&isNaN(c)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,a,c),e=!1;break}if(o!==null&&o>c){console.error("THREE.KeyframeTrack: Out of order keys.",this,a,c,o),e=!1;break}o=c}if(i!==void 0&&np(i))for(let a=0,c=i.length;a!==c;++a){const l=i[a];if(isNaN(l)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,a,l),e=!1;break}}return e}optimize(){const e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),i=this.getInterpolation()===So,r=e.length-1;let o=1;for(let a=1;a<r;++a){let c=!1;const l=e[a],h=e[a+1];if(l!==h&&(a!==1||l!==e[0]))if(i)c=!0;else{const u=a*n,f=u-n,m=u+n;for(let x=0;x!==n;++x){const d=t[u+x];if(d!==t[f+x]||d!==t[m+x]){c=!0;break}}}if(c){if(a!==o){e[o]=e[a];const u=a*n,f=o*n;for(let m=0;m!==n;++m)t[f+m]=t[u+m]}++o}}if(r>0){e[o]=e[r];for(let a=r*n,c=o*n,l=0;l!==n;++l)t[c+l]=t[a+l];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=t.slice(0,o*n)):(this.times=e,this.values=t),this}clone(){const e=this.times.slice(),t=this.values.slice(),n=this.constructor,i=new n(this.name,e,t);return i.createInterpolant=this.createInterpolant,i}}Pn.prototype.ValueTypeName="";Pn.prototype.TimeBufferType=Float32Array;Pn.prototype.ValueBufferType=Float32Array;Pn.prototype.DefaultInterpolation=nr;class ws extends Pn{constructor(e,t,n){super(e,t,n)}}ws.prototype.ValueTypeName="bool";ws.prototype.ValueBufferType=Array;ws.prototype.DefaultInterpolation=tr;ws.prototype.InterpolantFactoryMethodLinear=void 0;ws.prototype.InterpolantFactoryMethodSmooth=void 0;class Mu extends Pn{constructor(e,t,n,i){super(e,t,n,i)}}Mu.prototype.ValueTypeName="color";class xs extends Pn{constructor(e,t,n,i){super(e,t,n,i)}}xs.prototype.ValueTypeName="number";class ap extends or{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=(n-t)/(i-t);let l=e*a;for(let h=l+a;l!==h;l+=4)xn.slerpFlat(r,0,o,l-a,o,l,c);return r}}class vs extends Pn{constructor(e,t,n,i){super(e,t,n,i)}InterpolantFactoryMethodLinear(e){return new ap(this.times,this.values,this.getValueSize(),e)}}vs.prototype.ValueTypeName="quaternion";vs.prototype.InterpolantFactoryMethodSmooth=void 0;class Ts extends Pn{constructor(e,t,n){super(e,t,n)}}Ts.prototype.ValueTypeName="string";Ts.prototype.ValueBufferType=Array;Ts.prototype.DefaultInterpolation=tr;Ts.prototype.InterpolantFactoryMethodLinear=void 0;Ts.prototype.InterpolantFactoryMethodSmooth=void 0;class _s extends Pn{constructor(e,t,n,i){super(e,t,n,i)}}_s.prototype.ValueTypeName="vector";class cp{constructor(e="",t=-1,n=[],i=Rf){this.name=e,this.tracks=n,this.duration=t,this.blendMode=i,this.uuid=An(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){const t=[],n=e.tracks,i=1/(e.fps||1);for(let o=0,a=n.length;o!==a;++o)t.push(hp(n[o]).scale(i));const r=new this(e.name,e.duration,t,e.blendMode);return r.uuid=e.uuid,r.userData=JSON.parse(e.userData||"{}"),r}static toJSON(e){const t=[],n=e.tracks,i={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let r=0,o=n.length;r!==o;++r)t.push(Pn.toJSON(n[r]));return i}static CreateFromMorphTargetSequence(e,t,n,i){const r=t.length,o=[];for(let a=0;a<r;a++){let c=[],l=[];c.push((a+r-1)%r,a,(a+1)%r),l.push(0,1,0);const h=ip(c);c=Xl(c,1,h),l=Xl(l,1,h),!i&&c[0]===0&&(c.push(r),l.push(l[0])),o.push(new xs(".morphTargetInfluences["+t[a].name+"]",c,l).scale(1/n))}return new this(e,-1,o)}static findByName(e,t){let n=e;if(!Array.isArray(e)){const i=e;n=i.geometry&&i.geometry.animations||i.animations}for(let i=0;i<n.length;i++)if(n[i].name===t)return n[i];return null}static CreateClipsFromMorphTargetSequences(e,t,n){const i={},r=/^([\w-]*?)([\d]+)$/;for(let a=0,c=e.length;a<c;a++){const l=e[a],h=l.name.match(r);if(h&&h.length>1){const u=h[1];let f=i[u];f||(i[u]=f=[]),f.push(l)}}const o=[];for(const a in i)o.push(this.CreateFromMorphTargetSequence(a,i[a],t,n));return o}static parseAnimation(e,t){if(console.warn("THREE.AnimationClip: parseAnimation() is deprecated and will be removed with r185"),!e)return console.error("THREE.AnimationClip: No animation in JSONLoader data."),null;const n=function(u,f,m,x,d){if(m.length!==0){const g=[],p=[];_u(m,g,p,x),g.length!==0&&d.push(new u(f,g,p))}},i=[],r=e.name||"default",o=e.fps||30,a=e.blendMode;let c=e.length||-1;const l=e.hierarchy||[];for(let u=0;u<l.length;u++){const f=l[u].keys;if(!(!f||f.length===0))if(f[0].morphTargets){const m={};let x;for(x=0;x<f.length;x++)if(f[x].morphTargets)for(let d=0;d<f[x].morphTargets.length;d++)m[f[x].morphTargets[d]]=-1;for(const d in m){const g=[],p=[];for(let v=0;v!==f[x].morphTargets.length;++v){const M=f[x];g.push(M.time),p.push(M.morphTarget===d?1:0)}i.push(new xs(".morphTargetInfluence["+d+"]",g,p))}c=m.length*o}else{const m=".bones["+t[u].name+"]";n(_s,m+".position",f,"pos",i),n(vs,m+".quaternion",f,"rot",i),n(_s,m+".scale",f,"scl",i)}}return i.length===0?null:new this(r,c,i,a)}resetDuration(){const e=this.tracks;let t=0;for(let n=0,i=e.length;n!==i;++n){const r=this.tracks[n];t=Math.max(t,r.times[r.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){const e=[];for(let n=0;n<this.tracks.length;n++)e.push(this.tracks[n].clone());const t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}}function lp(s){switch(s.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return xs;case"vector":case"vector2":case"vector3":case"vector4":return _s;case"color":return Mu;case"quaternion":return vs;case"bool":case"boolean":return ws;case"string":return Ts}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+s)}function hp(s){if(s.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");const e=lp(s.type);if(s.times===void 0){const t=[],n=[];_u(s.keys,t,n,"value"),s.times=t,s.values=n}return e.parse!==void 0?e.parse(s):new e(s.name,s.times,s.values,s.interpolation)}const Qn={enabled:!1,files:{},add:function(s,e){this.enabled!==!1&&(this.files[s]=e)},get:function(s){if(this.enabled!==!1)return this.files[s]},remove:function(s){delete this.files[s]},clear:function(){this.files={}}};class up{constructor(e,t,n){const i=this;let r=!1,o=0,a=0,c;const l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.abortController=new AbortController,this.itemStart=function(h){a++,r===!1&&i.onStart!==void 0&&i.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,i.onProgress!==void 0&&i.onProgress(h,o,a),o===a&&(r=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,u){return l.push(h,u),this},this.removeHandler=function(h){const u=l.indexOf(h);return u!==-1&&l.splice(u,2),this},this.getHandler=function(h){for(let u=0,f=l.length;u<f;u+=2){const m=l[u],x=l[u+1];if(m.global&&(m.lastIndex=0),m.test(h))return x}return null},this.abort=function(){return this.abortController.abort(),this.abortController=new AbortController,this}}}const fp=new up;class Es{constructor(e){this.manager=e!==void 0?e:fp,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const n=this;return new Promise(function(i,r){n.load(e,i,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}Es.DEFAULT_MATERIAL_NAME="__DEFAULT";const $n={};class dp extends Error{constructor(e,t){super(e),this.response=t}}class yu extends Es{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=Qn.get(`file:${e}`);if(r!==void 0)return this.manager.itemStart(e),setTimeout(()=>{t&&t(r),this.manager.itemEnd(e)},0),r;if($n[e]!==void 0){$n[e].push({onLoad:t,onProgress:n,onError:i});return}$n[e]=[],$n[e].push({onLoad:t,onProgress:n,onError:i});const o=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),a=this.mimeType,c=this.responseType;fetch(o).then(l=>{if(l.status===200||l.status===0){if(l.status===0&&console.warn("THREE.FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||l.body===void 0||l.body.getReader===void 0)return l;const h=$n[e],u=l.body.getReader(),f=l.headers.get("X-File-Size")||l.headers.get("Content-Length"),m=f?parseInt(f):0,x=m!==0;let d=0;const g=new ReadableStream({start(p){v();function v(){u.read().then(({done:M,value:_})=>{if(M)p.close();else{d+=_.byteLength;const y=new ProgressEvent("progress",{lengthComputable:x,loaded:d,total:m});for(let S=0,A=h.length;S<A;S++){const C=h[S];C.onProgress&&C.onProgress(y)}p.enqueue(_),v()}},M=>{p.error(M)})}}});return new Response(g)}else throw new dp(`fetch for "${l.url}" responded with ${l.status}: ${l.statusText}`,l)}).then(l=>{switch(c){case"arraybuffer":return l.arrayBuffer();case"blob":return l.blob();case"document":return l.text().then(h=>new DOMParser().parseFromString(h,a));case"json":return l.json();default:if(a==="")return l.text();{const u=/charset="?([^;"\s]*)"?/i.exec(a),f=u&&u[1]?u[1].toLowerCase():void 0,m=new TextDecoder(f);return l.arrayBuffer().then(x=>m.decode(x))}}}).then(l=>{Qn.add(`file:${e}`,l);const h=$n[e];delete $n[e];for(let u=0,f=h.length;u<f;u++){const m=h[u];m.onLoad&&m.onLoad(l)}}).catch(l=>{const h=$n[e];if(h===void 0)throw this.manager.itemError(e),l;delete $n[e];for(let u=0,f=h.length;u<f;u++){const m=h[u];m.onError&&m.onError(l)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const Qi=new WeakMap;class pp extends Es{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,o=Qn.get(`image:${e}`);if(o!==void 0){if(o.complete===!0)r.manager.itemStart(e),setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0);else{let u=Qi.get(o);u===void 0&&(u=[],Qi.set(o,u)),u.push({onLoad:t,onError:i})}return o}const a=ir("img");function c(){h(),t&&t(this);const u=Qi.get(this)||[];for(let f=0;f<u.length;f++){const m=u[f];m.onLoad&&m.onLoad(this)}Qi.delete(this),r.manager.itemEnd(e)}function l(u){h(),i&&i(u),Qn.remove(`image:${e}`);const f=Qi.get(this)||[];for(let m=0;m<f.length;m++){const x=f[m];x.onError&&x.onError(u)}Qi.delete(this),r.manager.itemError(e),r.manager.itemEnd(e)}function h(){a.removeEventListener("load",c,!1),a.removeEventListener("error",l,!1)}return a.addEventListener("load",c,!1),a.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),Qn.add(`image:${e}`,a),r.manager.itemStart(e),a.src=e,a}}class Su extends Es{constructor(e){super(e)}load(e,t,n,i){const r=new Lt,o=new pp(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(e,function(a){r.image=a,r.needsUpdate=!0,t!==void 0&&t(r)},n,i),r}}class po extends ct{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new xe(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class mp extends po{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(ct.DEFAULT_UP),this.updateMatrix(),this.groundColor=new xe(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const Zo=new Oe,ql=new R,Yl=new R;class Oc{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new fe(512,512),this.mapType=Bn,this.map=null,this.mapPass=null,this.matrix=new Oe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Cc,this._frameExtents=new fe(1,1),this._viewportCount=1,this._viewports=[new tt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;ql.setFromMatrixPosition(e.matrixWorld),t.position.copy(ql),Yl.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Yl),t.updateMatrixWorld(),Zo.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Zo,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Zo)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class gp extends Oc{constructor(){super(new qt(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){const t=this.camera,n=ms*2*e.angle*this.focus,i=this.mapSize.width/this.mapSize.height*this.aspect,r=e.distance||t.far;(n!==t.fov||i!==t.aspect||r!==t.far)&&(t.fov=n,t.aspect=i,t.far=r,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}}class xp extends po{constructor(e,t,n=0,i=Math.PI/3,r=0,o=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(ct.DEFAULT_UP),this.updateMatrix(),this.target=new ct,this.distance=n,this.angle=i,this.penumbra=r,this.decay=o,this.map=null,this.shadow=new gp}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}const jl=new Oe,zs=new R,Jo=new R;class vp extends Oc{constructor(){super(new qt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new fe(4,2),this._viewportCount=6,this._viewports=[new tt(2,1,1,1),new tt(0,1,1,1),new tt(3,1,1,1),new tt(1,1,1,1),new tt(3,0,1,1),new tt(1,0,1,1)],this._cubeDirections=[new R(1,0,0),new R(-1,0,0),new R(0,0,1),new R(0,0,-1),new R(0,1,0),new R(0,-1,0)],this._cubeUps=[new R(0,1,0),new R(0,1,0),new R(0,1,0),new R(0,1,0),new R(0,0,1),new R(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,i=this.matrix,r=e.distance||n.far;r!==n.far&&(n.far=r,n.updateProjectionMatrix()),zs.setFromMatrixPosition(e.matrixWorld),n.position.copy(zs),Jo.copy(n.position),Jo.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(Jo),n.updateMatrixWorld(),i.makeTranslation(-zs.x,-zs.y,-zs.z),jl.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(jl,n.coordinateSystem,n.reversedDepth)}}class _p extends po{constructor(e,t,n=0,i=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new vp}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class kc extends uo{constructor(e=-1,t=1,n=1,i=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let r=n-e,o=n+e,a=i+t,c=i-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,o=r+l*this.view.width,a-=h*this.view.offsetY,c=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Mp extends Oc{constructor(){super(new kc(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class bu extends po{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(ct.DEFAULT_UP),this.updateMatrix(),this.target=new ct,this.shadow=new Mp}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class Ks{static extractUrlBase(e){const t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}}const Qo=new WeakMap;class yp extends Es{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&console.warn("THREE.ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,o=Qn.get(`image-bitmap:${e}`);if(o!==void 0){if(r.manager.itemStart(e),o.then){o.then(l=>{if(Qo.has(o)===!0)i&&i(Qo.get(o)),r.manager.itemError(e),r.manager.itemEnd(e);else return t&&t(l),r.manager.itemEnd(e),l});return}return setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0),o}const a={};a.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",a.headers=this.requestHeader,a.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;const c=fetch(e,a).then(function(l){return l.blob()}).then(function(l){return createImageBitmap(l,Object.assign(r.options,{colorSpaceConversion:"none"}))}).then(function(l){return Qn.add(`image-bitmap:${e}`,l),t&&t(l),r.manager.itemEnd(e),l}).catch(function(l){i&&i(l),Qo.set(c,l),Qn.remove(`image-bitmap:${e}`),r.manager.itemError(e),r.manager.itemEnd(e)});Qn.add(`image-bitmap:${e}`,c),r.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}class Sp extends qt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}const Bc="\\[\\]\\.:\\/",bp=new RegExp("["+Bc+"]","g"),Hc="[^"+Bc+"]",wp="[^"+Bc.replace("\\.","")+"]",Tp=/((?:WC+[\/:])*)/.source.replace("WC",Hc),Ep=/(WCOD+)?/.source.replace("WCOD",wp),Ap=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Hc),Rp=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Hc),Cp=new RegExp("^"+Tp+Ep+Ap+Rp+"$"),Pp=["material","materials","bones","map"];class Dp{constructor(e,t,n){const i=n||at.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,i)}getValue(e,t){this.bind();const n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(e,t)}setValue(e,t){const n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,r=n.length;i!==r;++i)n[i].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}}class at{constructor(e,t,n){this.path=t,this.parsedPath=n||at.parseTrackName(t),this.node=at.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new at.Composite(e,t,n):new at(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(bp,"")}static parseTrackName(e){const t=Cp.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);const n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){const r=n.nodeName.substring(i+1);Pp.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,i),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){const n=function(r){for(let o=0;o<r.length;o++){const a=r[o];if(a.name===t||a.uuid===t)return a;const c=n(a.children);if(c)return c}return null},i=n(e.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){const n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)e[t++]=n[i]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,n=t.objectName,i=t.propertyName;let r=t.propertyIndex;if(e||(e=at.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=t.objectIndex;switch(n){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===l){l=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(l!==void 0){if(e[l]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}const o=e[i];if(o===void 0){const l=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+l+"."+i+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?a=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(r!==void 0){if(i==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}at.Composite=Dp;at.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};at.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};at.prototype.GetterByBindingType=[at.prototype._getValue_direct,at.prototype._getValue_array,at.prototype._getValue_arrayElement,at.prototype._getValue_toArray];at.prototype.SetterByBindingTypeAndVersioning=[[at.prototype._setValue_direct,at.prototype._setValue_direct_setNeedsUpdate,at.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[at.prototype._setValue_array,at.prototype._setValue_array_setNeedsUpdate,at.prototype._setValue_array_setMatrixWorldNeedsUpdate],[at.prototype._setValue_arrayElement,at.prototype._setValue_arrayElement_setNeedsUpdate,at.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[at.prototype._setValue_fromArray,at.prototype._setValue_fromArray_setNeedsUpdate,at.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];function Kl(s,e,t,n){const i=Ip(n);switch(t){case Qh:return s*e;case vc:return s*e/i.components*i.byteLength;case _c:return s*e/i.components*i.byteLength;case tu:return s*e*2/i.components*i.byteLength;case Mc:return s*e*2/i.components*i.byteLength;case eu:return s*e*3/i.components*i.byteLength;case ln:return s*e*4/i.components*i.byteLength;case yc:return s*e*4/i.components*i.byteLength;case Wr:case Xr:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case qr:case Yr:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Ra:case Pa:return Math.max(s,16)*Math.max(e,8)/4;case Aa:case Ca:return Math.max(s,8)*Math.max(e,8)/2;case Da:case Ia:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case La:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Ua:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Na:return Math.floor((s+4)/5)*Math.floor((e+3)/4)*16;case Fa:return Math.floor((s+4)/5)*Math.floor((e+4)/5)*16;case za:return Math.floor((s+5)/6)*Math.floor((e+4)/5)*16;case Oa:return Math.floor((s+5)/6)*Math.floor((e+5)/6)*16;case ka:return Math.floor((s+7)/8)*Math.floor((e+4)/5)*16;case Ba:return Math.floor((s+7)/8)*Math.floor((e+5)/6)*16;case Ha:return Math.floor((s+7)/8)*Math.floor((e+7)/8)*16;case Va:return Math.floor((s+9)/10)*Math.floor((e+4)/5)*16;case Ga:return Math.floor((s+9)/10)*Math.floor((e+5)/6)*16;case Wa:return Math.floor((s+9)/10)*Math.floor((e+7)/8)*16;case Xa:return Math.floor((s+9)/10)*Math.floor((e+9)/10)*16;case qa:return Math.floor((s+11)/12)*Math.floor((e+9)/10)*16;case Ya:return Math.floor((s+11)/12)*Math.floor((e+11)/12)*16;case ja:case Ka:case $a:return Math.ceil(s/4)*Math.ceil(e/4)*16;case Za:case Ja:return Math.ceil(s/4)*Math.ceil(e/4)*8;case Qa:case ec:return Math.ceil(s/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Ip(s){switch(s){case Bn:case Kh:return{byteLength:1,components:1};case Zs:case $h:case si:return{byteLength:2,components:1};case gc:case xc:return{byteLength:2,components:4};case Mi:case mc:case En:return{byteLength:4,components:1};case Zh:case Jh:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${s}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:pc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=pc);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function wu(){let s=null,e=!1,t=null,n=null;function i(r,o){t(r,o),n=s.requestAnimationFrame(i)}return{start:function(){e!==!0&&t!==null&&(n=s.requestAnimationFrame(i),e=!0)},stop:function(){s.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){s=r}}}function Lp(s){const e=new WeakMap;function t(a,c){const l=a.array,h=a.usage,u=l.byteLength,f=s.createBuffer();s.bindBuffer(c,f),s.bufferData(c,l,h),a.onUploadCallback();let m;if(l instanceof Float32Array)m=s.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)m=s.HALF_FLOAT;else if(l instanceof Uint16Array)a.isFloat16BufferAttribute?m=s.HALF_FLOAT:m=s.UNSIGNED_SHORT;else if(l instanceof Int16Array)m=s.SHORT;else if(l instanceof Uint32Array)m=s.UNSIGNED_INT;else if(l instanceof Int32Array)m=s.INT;else if(l instanceof Int8Array)m=s.BYTE;else if(l instanceof Uint8Array)m=s.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)m=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:f,type:m,bytesPerElement:l.BYTES_PER_ELEMENT,version:a.version,size:u}}function n(a,c,l){const h=c.array,u=c.updateRanges;if(s.bindBuffer(l,a),u.length===0)s.bufferSubData(l,0,h);else{u.sort((m,x)=>m.start-x.start);let f=0;for(let m=1;m<u.length;m++){const x=u[f],d=u[m];d.start<=x.start+x.count+1?x.count=Math.max(x.count,d.start+d.count-x.start):(++f,u[f]=d)}u.length=f+1;for(let m=0,x=u.length;m<x;m++){const d=u[m];s.bufferSubData(l,d.start*h.BYTES_PER_ELEMENT,h,d.start,d.count)}c.clearUpdateRanges()}c.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const c=e.get(a);c&&(s.deleteBuffer(c.buffer),e.delete(a))}function o(a,c){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const l=e.get(a);if(l===void 0)e.set(a,t(a,c));else if(l.version<a.version){if(l.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,a,c),l.version=a.version}}return{get:i,remove:r,update:o}}var Up=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Np=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Fp=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,zp=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Op=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,kp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Bp=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Hp=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Vp=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,Gp=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Wp=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Xp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,qp=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Yp=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,jp=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Kp=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,$p=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Zp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Jp=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Qp=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,em=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,tm=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,nm=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,im=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,sm=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,rm=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,om=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,am=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,cm=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,lm=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,hm="gl_FragColor = linearToOutputTexel( gl_FragColor );",um=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,fm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,dm=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,pm=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,mm=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,gm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,xm=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,vm=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,_m=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Mm=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,ym=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Sm=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,bm=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,wm=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Tm=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Em=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Am=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Rm=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Cm=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Pm=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Dm=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Im=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Lm=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Um=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Nm=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Fm=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,zm=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Om=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,km=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Bm=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Hm=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Vm=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Gm=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Wm=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Xm=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,qm=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Ym=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,jm=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Km=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,$m=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Zm=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Jm=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Qm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,e0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,t0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,n0=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,i0=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,s0=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,r0=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,o0=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,a0=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,c0=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,l0=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,h0=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,u0=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,f0=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,d0=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,p0=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,m0=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,g0=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,x0=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,v0=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,_0=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,M0=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,y0=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,S0=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,b0=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,w0=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,T0=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,E0=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,A0=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,R0=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,C0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,P0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,D0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,I0=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const L0=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,U0=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,N0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,F0=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,z0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,O0=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,k0=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,B0=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,H0=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,V0=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,G0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,W0=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,X0=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,q0=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Y0=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,j0=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,K0=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,$0=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Z0=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,J0=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Q0=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,eg=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,tg=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,ng=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ig=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,sg=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,rg=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,og=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,ag=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,cg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,lg=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,hg=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,ug=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,fg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Ge={alphahash_fragment:Up,alphahash_pars_fragment:Np,alphamap_fragment:Fp,alphamap_pars_fragment:zp,alphatest_fragment:Op,alphatest_pars_fragment:kp,aomap_fragment:Bp,aomap_pars_fragment:Hp,batching_pars_vertex:Vp,batching_vertex:Gp,begin_vertex:Wp,beginnormal_vertex:Xp,bsdfs:qp,iridescence_fragment:Yp,bumpmap_pars_fragment:jp,clipping_planes_fragment:Kp,clipping_planes_pars_fragment:$p,clipping_planes_pars_vertex:Zp,clipping_planes_vertex:Jp,color_fragment:Qp,color_pars_fragment:em,color_pars_vertex:tm,color_vertex:nm,common:im,cube_uv_reflection_fragment:sm,defaultnormal_vertex:rm,displacementmap_pars_vertex:om,displacementmap_vertex:am,emissivemap_fragment:cm,emissivemap_pars_fragment:lm,colorspace_fragment:hm,colorspace_pars_fragment:um,envmap_fragment:fm,envmap_common_pars_fragment:dm,envmap_pars_fragment:pm,envmap_pars_vertex:mm,envmap_physical_pars_fragment:Em,envmap_vertex:gm,fog_vertex:xm,fog_pars_vertex:vm,fog_fragment:_m,fog_pars_fragment:Mm,gradientmap_pars_fragment:ym,lightmap_pars_fragment:Sm,lights_lambert_fragment:bm,lights_lambert_pars_fragment:wm,lights_pars_begin:Tm,lights_toon_fragment:Am,lights_toon_pars_fragment:Rm,lights_phong_fragment:Cm,lights_phong_pars_fragment:Pm,lights_physical_fragment:Dm,lights_physical_pars_fragment:Im,lights_fragment_begin:Lm,lights_fragment_maps:Um,lights_fragment_end:Nm,logdepthbuf_fragment:Fm,logdepthbuf_pars_fragment:zm,logdepthbuf_pars_vertex:Om,logdepthbuf_vertex:km,map_fragment:Bm,map_pars_fragment:Hm,map_particle_fragment:Vm,map_particle_pars_fragment:Gm,metalnessmap_fragment:Wm,metalnessmap_pars_fragment:Xm,morphinstance_vertex:qm,morphcolor_vertex:Ym,morphnormal_vertex:jm,morphtarget_pars_vertex:Km,morphtarget_vertex:$m,normal_fragment_begin:Zm,normal_fragment_maps:Jm,normal_pars_fragment:Qm,normal_pars_vertex:e0,normal_vertex:t0,normalmap_pars_fragment:n0,clearcoat_normal_fragment_begin:i0,clearcoat_normal_fragment_maps:s0,clearcoat_pars_fragment:r0,iridescence_pars_fragment:o0,opaque_fragment:a0,packing:c0,premultiplied_alpha_fragment:l0,project_vertex:h0,dithering_fragment:u0,dithering_pars_fragment:f0,roughnessmap_fragment:d0,roughnessmap_pars_fragment:p0,shadowmap_pars_fragment:m0,shadowmap_pars_vertex:g0,shadowmap_vertex:x0,shadowmask_pars_fragment:v0,skinbase_vertex:_0,skinning_pars_vertex:M0,skinning_vertex:y0,skinnormal_vertex:S0,specularmap_fragment:b0,specularmap_pars_fragment:w0,tonemapping_fragment:T0,tonemapping_pars_fragment:E0,transmission_fragment:A0,transmission_pars_fragment:R0,uv_pars_fragment:C0,uv_pars_vertex:P0,uv_vertex:D0,worldpos_vertex:I0,background_vert:L0,background_frag:U0,backgroundCube_vert:N0,backgroundCube_frag:F0,cube_vert:z0,cube_frag:O0,depth_vert:k0,depth_frag:B0,distanceRGBA_vert:H0,distanceRGBA_frag:V0,equirect_vert:G0,equirect_frag:W0,linedashed_vert:X0,linedashed_frag:q0,meshbasic_vert:Y0,meshbasic_frag:j0,meshlambert_vert:K0,meshlambert_frag:$0,meshmatcap_vert:Z0,meshmatcap_frag:J0,meshnormal_vert:Q0,meshnormal_frag:eg,meshphong_vert:tg,meshphong_frag:ng,meshphysical_vert:ig,meshphysical_frag:sg,meshtoon_vert:rg,meshtoon_frag:og,points_vert:ag,points_frag:cg,shadow_vert:lg,shadow_frag:hg,sprite_vert:ug,sprite_frag:fg},ue={common:{diffuse:{value:new xe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new He},alphaMap:{value:null},alphaMapTransform:{value:new He},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new He}},envmap:{envMap:{value:null},envMapRotation:{value:new He},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new He}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new He}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new He},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new He},normalScale:{value:new fe(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new He},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new He}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new He}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new He}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new xe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new xe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new He},alphaTest:{value:0},uvTransform:{value:new He}},sprite:{diffuse:{value:new xe(16777215)},opacity:{value:1},center:{value:new fe(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new He},alphaMap:{value:null},alphaMapTransform:{value:new He},alphaTest:{value:0}}},Nn={basic:{uniforms:$t([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.fog]),vertexShader:Ge.meshbasic_vert,fragmentShader:Ge.meshbasic_frag},lambert:{uniforms:$t([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,ue.lights,{emissive:{value:new xe(0)}}]),vertexShader:Ge.meshlambert_vert,fragmentShader:Ge.meshlambert_frag},phong:{uniforms:$t([ue.common,ue.specularmap,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,ue.lights,{emissive:{value:new xe(0)},specular:{value:new xe(1118481)},shininess:{value:30}}]),vertexShader:Ge.meshphong_vert,fragmentShader:Ge.meshphong_frag},standard:{uniforms:$t([ue.common,ue.envmap,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.roughnessmap,ue.metalnessmap,ue.fog,ue.lights,{emissive:{value:new xe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ge.meshphysical_vert,fragmentShader:Ge.meshphysical_frag},toon:{uniforms:$t([ue.common,ue.aomap,ue.lightmap,ue.emissivemap,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.gradientmap,ue.fog,ue.lights,{emissive:{value:new xe(0)}}]),vertexShader:Ge.meshtoon_vert,fragmentShader:Ge.meshtoon_frag},matcap:{uniforms:$t([ue.common,ue.bumpmap,ue.normalmap,ue.displacementmap,ue.fog,{matcap:{value:null}}]),vertexShader:Ge.meshmatcap_vert,fragmentShader:Ge.meshmatcap_frag},points:{uniforms:$t([ue.points,ue.fog]),vertexShader:Ge.points_vert,fragmentShader:Ge.points_frag},dashed:{uniforms:$t([ue.common,ue.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ge.linedashed_vert,fragmentShader:Ge.linedashed_frag},depth:{uniforms:$t([ue.common,ue.displacementmap]),vertexShader:Ge.depth_vert,fragmentShader:Ge.depth_frag},normal:{uniforms:$t([ue.common,ue.bumpmap,ue.normalmap,ue.displacementmap,{opacity:{value:1}}]),vertexShader:Ge.meshnormal_vert,fragmentShader:Ge.meshnormal_frag},sprite:{uniforms:$t([ue.sprite,ue.fog]),vertexShader:Ge.sprite_vert,fragmentShader:Ge.sprite_frag},background:{uniforms:{uvTransform:{value:new He},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ge.background_vert,fragmentShader:Ge.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new He}},vertexShader:Ge.backgroundCube_vert,fragmentShader:Ge.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ge.cube_vert,fragmentShader:Ge.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ge.equirect_vert,fragmentShader:Ge.equirect_frag},distanceRGBA:{uniforms:$t([ue.common,ue.displacementmap,{referencePosition:{value:new R},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ge.distanceRGBA_vert,fragmentShader:Ge.distanceRGBA_frag},shadow:{uniforms:$t([ue.lights,ue.fog,{color:{value:new xe(0)},opacity:{value:1}}]),vertexShader:Ge.shadow_vert,fragmentShader:Ge.shadow_frag}};Nn.physical={uniforms:$t([Nn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new He},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new He},clearcoatNormalScale:{value:new fe(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new He},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new He},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new He},sheen:{value:0},sheenColor:{value:new xe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new He},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new He},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new He},transmissionSamplerSize:{value:new fe},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new He},attenuationDistance:{value:0},attenuationColor:{value:new xe(0)},specularColor:{value:new xe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new He},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new He},anisotropyVector:{value:new fe},anisotropyMap:{value:null},anisotropyMapTransform:{value:new He}}]),vertexShader:Ge.meshphysical_vert,fragmentShader:Ge.meshphysical_frag};const Or={r:0,b:0,g:0},Ri=new gn,dg=new Oe;function pg(s,e,t,n,i,r,o){const a=new xe(0);let c=r===!0?0:1,l,h,u=null,f=0,m=null;function x(M){let _=M.isScene===!0?M.background:null;return _&&_.isTexture&&(_=(M.backgroundBlurriness>0?t:e).get(_)),_}function d(M){let _=!1;const y=x(M);y===null?p(a,c):y&&y.isColor&&(p(y,1),_=!0);const S=s.xr.getEnvironmentBlendMode();S==="additive"?n.buffers.color.setClear(0,0,0,1,o):S==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(s.autoClear||_)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function g(M,_){const y=x(_);y&&(y.isCubeTexture||y.mapping===lo)?(h===void 0&&(h=new Je(new bs(1,1,1),new Yt({name:"BackgroundCubeMaterial",uniforms:gs(Nn.backgroundCube.uniforms),vertexShader:Nn.backgroundCube.vertexShader,fragmentShader:Nn.backgroundCube.fragmentShader,side:Ht,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(S,A,C){this.matrixWorld.copyPosition(C.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(h)),Ri.copy(_.backgroundRotation),Ri.x*=-1,Ri.y*=-1,Ri.z*=-1,y.isCubeTexture&&y.isRenderTargetTexture===!1&&(Ri.y*=-1,Ri.z*=-1),h.material.uniforms.envMap.value=y,h.material.uniforms.flipEnvMap.value=y.isCubeTexture&&y.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=_.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(dg.makeRotationFromEuler(Ri)),h.material.toneMapped=et.getTransfer(y.colorSpace)!==ht,(u!==y||f!==y.version||m!==s.toneMapping)&&(h.material.needsUpdate=!0,u=y,f=y.version,m=s.toneMapping),h.layers.enableAll(),M.unshift(h,h.geometry,h.material,0,0,null)):y&&y.isTexture&&(l===void 0&&(l=new Je(new Hn(2,2),new Yt({name:"BackgroundMaterial",uniforms:gs(Nn.background.uniforms),vertexShader:Nn.background.vertexShader,fragmentShader:Nn.background.fragmentShader,side:ni,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=y,l.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,l.material.toneMapped=et.getTransfer(y.colorSpace)!==ht,y.matrixAutoUpdate===!0&&y.updateMatrix(),l.material.uniforms.uvTransform.value.copy(y.matrix),(u!==y||f!==y.version||m!==s.toneMapping)&&(l.material.needsUpdate=!0,u=y,f=y.version,m=s.toneMapping),l.layers.enableAll(),M.unshift(l,l.geometry,l.material,0,0,null))}function p(M,_){M.getRGB(Or,lu(s)),n.buffers.color.setClear(Or.r,Or.g,Or.b,_,o)}function v(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(M,_=1){a.set(M),c=_,p(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(M){c=M,p(a,c)},render:d,addToRenderList:g,dispose:v}}function mg(s,e){const t=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=f(null);let r=i,o=!1;function a(w,D,L,N,F){let B=!1;const V=u(N,L,D);r!==V&&(r=V,l(r.object)),B=m(w,N,L,F),B&&x(w,N,L,F),F!==null&&e.update(F,s.ELEMENT_ARRAY_BUFFER),(B||o)&&(o=!1,_(w,D,L,N),F!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,e.get(F).buffer))}function c(){return s.createVertexArray()}function l(w){return s.bindVertexArray(w)}function h(w){return s.deleteVertexArray(w)}function u(w,D,L){const N=L.wireframe===!0;let F=n[w.id];F===void 0&&(F={},n[w.id]=F);let B=F[D.id];B===void 0&&(B={},F[D.id]=B);let V=B[N];return V===void 0&&(V=f(c()),B[N]=V),V}function f(w){const D=[],L=[],N=[];for(let F=0;F<t;F++)D[F]=0,L[F]=0,N[F]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:L,attributeDivisors:N,object:w,attributes:{},index:null}}function m(w,D,L,N){const F=r.attributes,B=D.attributes;let V=0;const X=L.getAttributes();for(const k in X)if(X[k].location>=0){const ae=F[k];let pe=B[k];if(pe===void 0&&(k==="instanceMatrix"&&w.instanceMatrix&&(pe=w.instanceMatrix),k==="instanceColor"&&w.instanceColor&&(pe=w.instanceColor)),ae===void 0||ae.attribute!==pe||pe&&ae.data!==pe.data)return!0;V++}return r.attributesNum!==V||r.index!==N}function x(w,D,L,N){const F={},B=D.attributes;let V=0;const X=L.getAttributes();for(const k in X)if(X[k].location>=0){let ae=B[k];ae===void 0&&(k==="instanceMatrix"&&w.instanceMatrix&&(ae=w.instanceMatrix),k==="instanceColor"&&w.instanceColor&&(ae=w.instanceColor));const pe={};pe.attribute=ae,ae&&ae.data&&(pe.data=ae.data),F[k]=pe,V++}r.attributes=F,r.attributesNum=V,r.index=N}function d(){const w=r.newAttributes;for(let D=0,L=w.length;D<L;D++)w[D]=0}function g(w){p(w,0)}function p(w,D){const L=r.newAttributes,N=r.enabledAttributes,F=r.attributeDivisors;L[w]=1,N[w]===0&&(s.enableVertexAttribArray(w),N[w]=1),F[w]!==D&&(s.vertexAttribDivisor(w,D),F[w]=D)}function v(){const w=r.newAttributes,D=r.enabledAttributes;for(let L=0,N=D.length;L<N;L++)D[L]!==w[L]&&(s.disableVertexAttribArray(L),D[L]=0)}function M(w,D,L,N,F,B,V){V===!0?s.vertexAttribIPointer(w,D,L,F,B):s.vertexAttribPointer(w,D,L,N,F,B)}function _(w,D,L,N){d();const F=N.attributes,B=L.getAttributes(),V=D.defaultAttributeValues;for(const X in B){const k=B[X];if(k.location>=0){let Q=F[X];if(Q===void 0&&(X==="instanceMatrix"&&w.instanceMatrix&&(Q=w.instanceMatrix),X==="instanceColor"&&w.instanceColor&&(Q=w.instanceColor)),Q!==void 0){const ae=Q.normalized,pe=Q.itemSize,Ne=e.get(Q);if(Ne===void 0)continue;const nt=Ne.buffer,st=Ne.type,Qe=Ne.bytesPerElement,K=st===s.INT||st===s.UNSIGNED_INT||Q.gpuType===mc;if(Q.isInterleavedBufferAttribute){const ee=Q.data,me=ee.stride,De=Q.offset;if(ee.isInstancedInterleavedBuffer){for(let Te=0;Te<k.locationSize;Te++)p(k.location+Te,ee.meshPerAttribute);w.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=ee.meshPerAttribute*ee.count)}else for(let Te=0;Te<k.locationSize;Te++)g(k.location+Te);s.bindBuffer(s.ARRAY_BUFFER,nt);for(let Te=0;Te<k.locationSize;Te++)M(k.location+Te,pe/k.locationSize,st,ae,me*Qe,(De+pe/k.locationSize*Te)*Qe,K)}else{if(Q.isInstancedBufferAttribute){for(let ee=0;ee<k.locationSize;ee++)p(k.location+ee,Q.meshPerAttribute);w.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let ee=0;ee<k.locationSize;ee++)g(k.location+ee);s.bindBuffer(s.ARRAY_BUFFER,nt);for(let ee=0;ee<k.locationSize;ee++)M(k.location+ee,pe/k.locationSize,st,ae,pe*Qe,pe/k.locationSize*ee*Qe,K)}}else if(V!==void 0){const ae=V[X];if(ae!==void 0)switch(ae.length){case 2:s.vertexAttrib2fv(k.location,ae);break;case 3:s.vertexAttrib3fv(k.location,ae);break;case 4:s.vertexAttrib4fv(k.location,ae);break;default:s.vertexAttrib1fv(k.location,ae)}}}}v()}function y(){C();for(const w in n){const D=n[w];for(const L in D){const N=D[L];for(const F in N)h(N[F].object),delete N[F];delete D[L]}delete n[w]}}function S(w){if(n[w.id]===void 0)return;const D=n[w.id];for(const L in D){const N=D[L];for(const F in N)h(N[F].object),delete N[F];delete D[L]}delete n[w.id]}function A(w){for(const D in n){const L=n[D];if(L[w.id]===void 0)continue;const N=L[w.id];for(const F in N)h(N[F].object),delete N[F];delete L[w.id]}}function C(){b(),o=!0,r!==i&&(r=i,l(r.object))}function b(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:C,resetDefaultState:b,dispose:y,releaseStatesOfGeometry:S,releaseStatesOfProgram:A,initAttributes:d,enableAttribute:g,disableUnusedAttributes:v}}function gg(s,e,t){let n;function i(l){n=l}function r(l,h){s.drawArrays(n,l,h),t.update(h,n,1)}function o(l,h,u){u!==0&&(s.drawArraysInstanced(n,l,h,u),t.update(h,n,u))}function a(l,h,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,h,0,u);let m=0;for(let x=0;x<u;x++)m+=h[x];t.update(m,n,1)}function c(l,h,u,f){if(u===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let x=0;x<l.length;x++)o(l[x],h[x],f[x]);else{m.multiDrawArraysInstancedWEBGL(n,l,0,h,0,f,0,u);let x=0;for(let d=0;d<u;d++)x+=h[d]*f[d];t.update(x,n,1)}}this.setMode=i,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=c}function xg(s,e,t,n){let i;function r(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){const A=e.get("EXT_texture_filter_anisotropic");i=s.getParameter(A.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(A){return!(A!==ln&&n.convert(A)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(A){const C=A===si&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(A!==Bn&&n.convert(A)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&A!==En&&!C)}function c(A){if(A==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";A="mediump"}return A==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp";const h=c(l);h!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);const u=t.logarithmicDepthBuffer===!0,f=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),m=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),x=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),d=s.getParameter(s.MAX_TEXTURE_SIZE),g=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),p=s.getParameter(s.MAX_VERTEX_ATTRIBS),v=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),M=s.getParameter(s.MAX_VARYING_VECTORS),_=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),y=x>0,S=s.getParameter(s.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:a,precision:l,logarithmicDepthBuffer:u,reversedDepthBuffer:f,maxTextures:m,maxVertexTextures:x,maxTextureSize:d,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:v,maxVaryings:M,maxFragmentUniforms:_,vertexTextures:y,maxSamples:S}}function vg(s){const e=this;let t=null,n=0,i=!1,r=!1;const o=new gi,a=new He,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(u,f){const m=u.length!==0||f||n!==0||i;return i=f,n=u.length,m},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,f){t=h(u,f,0)},this.setState=function(u,f,m){const x=u.clippingPlanes,d=u.clipIntersection,g=u.clipShadows,p=s.get(u);if(!i||x===null||x.length===0||r&&!g)r?h(null):l();else{const v=r?0:n,M=v*4;let _=p.clippingState||null;c.value=_,_=h(x,f,M,m);for(let y=0;y!==M;++y)_[y]=t[y];p.clippingState=_,this.numIntersection=d?this.numPlanes:0,this.numPlanes+=v}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,f,m,x){const d=u!==null?u.length:0;let g=null;if(d!==0){if(g=c.value,x!==!0||g===null){const p=m+d*4,v=f.matrixWorldInverse;a.getNormalMatrix(v),(g===null||g.length<p)&&(g=new Float32Array(p));for(let M=0,_=m;M!==d;++M,_+=4)o.copy(u[M]).applyMatrix4(v,a),o.normal.toArray(g,_),g[_+3]=o.constant}c.value=g,c.needsUpdate=!0}return e.numPlanes=d,e.numIntersection=0,g}}function _g(s){let e=new WeakMap;function t(o,a){return a===Ta?o.mapping=ds:a===Ea&&(o.mapping=ps),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===Ta||a===Ea)if(e.has(o)){const c=e.get(o).texture;return t(c,o.mapping)}else{const c=o.image;if(c&&c.height>0){const l=new Ed(c.height);return l.fromEquirectangularTexture(s,o),e.set(o,l),o.addEventListener("dispose",i),t(l.texture,o.mapping)}else return null}}return o}function i(o){const a=o.target;a.removeEventListener("dispose",i);const c=e.get(a);c!==void 0&&(e.delete(a),c.dispose())}function r(){e=new WeakMap}return{get:n,dispose:r}}const rs=4,$l=[.125,.215,.35,.446,.526,.582],Ni=20,ea=new kc,Zl=new xe;let ta=null,na=0,ia=0,sa=!1;const Di=(1+Math.sqrt(5))/2,es=1/Di,Jl=[new R(-Di,es,0),new R(Di,es,0),new R(-es,0,Di),new R(es,0,Di),new R(0,Di,-es),new R(0,Di,es),new R(-1,1,-1),new R(1,1,-1),new R(-1,1,1),new R(1,1,1)],Mg=new R;class Ql{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,i=100,r={}){const{size:o=256,position:a=Mg}=r;ta=this._renderer.getRenderTarget(),na=this._renderer.getActiveCubeFace(),ia=this._renderer.getActiveMipmapLevel(),sa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,n,i,c,a),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=nh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=th(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(ta,na,ia),this._renderer.xr.enabled=sa,e.scissorTest=!1,kr(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ds||e.mapping===ps?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),ta=this._renderer.getRenderTarget(),na=this._renderer.getActiveCubeFace(),ia=this._renderer.getActiveMipmapLevel(),sa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:sn,minFilter:sn,generateMipmaps:!1,type:si,format:ln,colorSpace:en,depthBuffer:!1},i=eh(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=eh(e,t,n);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=yg(r)),this._blurMaterial=Sg(r,e,t)}return i}_compileMaterial(e){const t=new Je(this._lodPlanes[0],e);this._renderer.compile(t,ea)}_sceneToCubeUV(e,t,n,i,r){const c=new qt(90,1,t,n),l=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,f=u.autoClear,m=u.toneMapping;u.getClearColor(Zl),u.toneMapping=vi,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(i),u.clearDepth(),u.setRenderTarget(null));const d=new Fi({name:"PMREM.Background",side:Ht,depthWrite:!1,depthTest:!1}),g=new Je(new bs,d);let p=!1;const v=e.background;v?v.isColor&&(d.color.copy(v),e.background=null,p=!0):(d.color.copy(Zl),p=!0);for(let M=0;M<6;M++){const _=M%3;_===0?(c.up.set(0,l[M],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x+h[M],r.y,r.z)):_===1?(c.up.set(0,0,l[M]),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y+h[M],r.z)):(c.up.set(0,l[M],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y,r.z+h[M]));const y=this._cubeSize;kr(i,_*y,M>2?y:0,y,y),u.setRenderTarget(i),p&&u.render(g,c),u.render(e,c)}g.geometry.dispose(),g.material.dispose(),u.toneMapping=m,u.autoClear=f,e.background=v}_textureToCubeUV(e,t){const n=this._renderer,i=e.mapping===ds||e.mapping===ps;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=nh()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=th());const r=i?this._cubemapMaterial:this._equirectMaterial,o=new Je(this._lodPlanes[0],r),a=r.uniforms;a.envMap.value=e;const c=this._cubeSize;kr(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(o,ea)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const i=this._lodPlanes.length;for(let r=1;r<i;r++){const o=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=Jl[(i-r-1)%Jl.length];this._blur(e,r-1,r,o,a)}t.autoClear=n}_blur(e,t,n,i,r){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,i,"latitudinal",r),this._halfBlur(o,e,n,n,i,"longitudinal",r)}_halfBlur(e,t,n,i,r,o,a){const c=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,u=new Je(this._lodPlanes[i],l),f=l.uniforms,m=this._sizeLods[n]-1,x=isFinite(r)?Math.PI/(2*m):2*Math.PI/(2*Ni-1),d=r/x,g=isFinite(r)?1+Math.floor(h*d):Ni;g>Ni&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${Ni}`);const p=[];let v=0;for(let A=0;A<Ni;++A){const C=A/d,b=Math.exp(-C*C/2);p.push(b),A===0?v+=b:A<g&&(v+=2*b)}for(let A=0;A<p.length;A++)p[A]=p[A]/v;f.envMap.value=e.texture,f.samples.value=g,f.weights.value=p,f.latitudinal.value=o==="latitudinal",a&&(f.poleAxis.value=a);const{_lodMax:M}=this;f.dTheta.value=x,f.mipInt.value=M-n;const _=this._sizeLods[i],y=3*_*(i>M-rs?i-M+rs:0),S=4*(this._cubeSize-_);kr(t,y,S,3*_,2*_),c.setRenderTarget(t),c.render(u,ea)}}function yg(s){const e=[],t=[],n=[];let i=s;const r=s-rs+1+$l.length;for(let o=0;o<r;o++){const a=Math.pow(2,i);t.push(a);let c=1/a;o>s-rs?c=$l[o-s+rs-1]:o===0&&(c=0),n.push(c);const l=1/(a-2),h=-l,u=1+l,f=[h,h,u,h,u,u,h,h,u,u,h,u],m=6,x=6,d=3,g=2,p=1,v=new Float32Array(d*x*m),M=new Float32Array(g*x*m),_=new Float32Array(p*x*m);for(let S=0;S<m;S++){const A=S%3*2/3-1,C=S>2?0:-1,b=[A,C,0,A+2/3,C,0,A+2/3,C+1,0,A,C,0,A+2/3,C+1,0,A,C+1,0];v.set(b,d*x*S),M.set(f,g*x*S);const w=[S,S,S,S,S,S];_.set(w,p*x*S)}const y=new Ct;y.setAttribute("position",new At(v,d)),y.setAttribute("uv",new At(M,g)),y.setAttribute("faceIndex",new At(_,p)),e.push(y),i>rs&&i--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function eh(s,e,t){const n=new Cn(s,e,t);return n.texture.mapping=lo,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function kr(s,e,t,n,i){s.viewport.set(e,t,n,i),s.scissor.set(e,t,n,i)}function Sg(s,e,t){const n=new Float32Array(Ni),i=new R(0,1,0);return new Yt({name:"SphericalGaussianBlur",defines:{n:Ni,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:Vc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:xi,depthTest:!1,depthWrite:!1})}function th(){return new Yt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Vc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:xi,depthTest:!1,depthWrite:!1})}function nh(){return new Yt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Vc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:xi,depthTest:!1,depthWrite:!1})}function Vc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function bg(s){let e=new WeakMap,t=null;function n(a){if(a&&a.isTexture){const c=a.mapping,l=c===Ta||c===Ea,h=c===ds||c===ps;if(l||h){let u=e.get(a);const f=u!==void 0?u.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==f)return t===null&&(t=new Ql(s)),u=l?t.fromEquirectangular(a,u):t.fromCubemap(a,u),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),u.texture;if(u!==void 0)return u.texture;{const m=a.image;return l&&m&&m.height>0||h&&m&&i(m)?(t===null&&(t=new Ql(s)),u=l?t.fromEquirectangular(a):t.fromCubemap(a),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),a.addEventListener("dispose",r),u.texture):null}}}return a}function i(a){let c=0;const l=6;for(let h=0;h<l;h++)a[h]!==void 0&&c++;return c===l}function r(a){const c=a.target;c.removeEventListener("dispose",r);const l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:o}}function wg(s){const e={};function t(n){if(e[n]!==void 0)return e[n];let i;switch(n){case"WEBGL_depth_texture":i=s.getExtension("WEBGL_depth_texture")||s.getExtension("MOZ_WEBGL_depth_texture")||s.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":i=s.getExtension("EXT_texture_filter_anisotropic")||s.getExtension("MOZ_EXT_texture_filter_anisotropic")||s.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":i=s.getExtension("WEBGL_compressed_texture_s3tc")||s.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":i=s.getExtension("WEBGL_compressed_texture_pvrtc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:i=s.getExtension(n)}return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const i=t(n);return i===null&&sr("THREE.WebGLRenderer: "+n+" extension not supported."),i}}}function Tg(s,e,t,n){const i={},r=new WeakMap;function o(u){const f=u.target;f.index!==null&&e.remove(f.index);for(const x in f.attributes)e.remove(f.attributes[x]);f.removeEventListener("dispose",o),delete i[f.id];const m=r.get(f);m&&(e.remove(m),r.delete(f)),n.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,t.memory.geometries--}function a(u,f){return i[f.id]===!0||(f.addEventListener("dispose",o),i[f.id]=!0,t.memory.geometries++),f}function c(u){const f=u.attributes;for(const m in f)e.update(f[m],s.ARRAY_BUFFER)}function l(u){const f=[],m=u.index,x=u.attributes.position;let d=0;if(m!==null){const v=m.array;d=m.version;for(let M=0,_=v.length;M<_;M+=3){const y=v[M+0],S=v[M+1],A=v[M+2];f.push(y,S,S,A,A,y)}}else if(x!==void 0){const v=x.array;d=x.version;for(let M=0,_=v.length/3-1;M<_;M+=3){const y=M+0,S=M+1,A=M+2;f.push(y,S,S,A,A,y)}}else return;const g=new(ru(f)?Tc:wc)(f,1);g.version=d;const p=r.get(u);p&&e.remove(p),r.set(u,g)}function h(u){const f=r.get(u);if(f){const m=u.index;m!==null&&f.version<m.version&&l(u)}else l(u);return r.get(u)}return{get:a,update:c,getWireframeAttribute:h}}function Eg(s,e,t){let n;function i(f){n=f}let r,o;function a(f){r=f.type,o=f.bytesPerElement}function c(f,m){s.drawElements(n,m,r,f*o),t.update(m,n,1)}function l(f,m,x){x!==0&&(s.drawElementsInstanced(n,m,r,f*o,x),t.update(m,n,x))}function h(f,m,x){if(x===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,m,0,r,f,0,x);let g=0;for(let p=0;p<x;p++)g+=m[p];t.update(g,n,1)}function u(f,m,x,d){if(x===0)return;const g=e.get("WEBGL_multi_draw");if(g===null)for(let p=0;p<f.length;p++)l(f[p]/o,m[p],d[p]);else{g.multiDrawElementsInstancedWEBGL(n,m,0,r,f,0,d,0,x);let p=0;for(let v=0;v<x;v++)p+=m[v]*d[v];t.update(p,n,1)}}this.setMode=i,this.setIndex=a,this.render=c,this.renderInstances=l,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function Ag(s){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case s.TRIANGLES:t.triangles+=a*(r/3);break;case s.LINES:t.lines+=a*(r/2);break;case s.LINE_STRIP:t.lines+=a*(r-1);break;case s.LINE_LOOP:t.lines+=a*r;break;case s.POINTS:t.points+=a*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function i(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function Rg(s,e,t){const n=new WeakMap,i=new tt;function r(o,a,c){const l=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0;let f=n.get(a);if(f===void 0||f.count!==u){let b=function(){A.dispose(),n.delete(a),a.removeEventListener("dispose",b)};f!==void 0&&f.texture.dispose();const m=a.morphAttributes.position!==void 0,x=a.morphAttributes.normal!==void 0,d=a.morphAttributes.color!==void 0,g=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],v=a.morphAttributes.color||[];let M=0;m===!0&&(M=1),x===!0&&(M=2),d===!0&&(M=3);let _=a.attributes.position.count*M,y=1;_>e.maxTextureSize&&(y=Math.ceil(_/e.maxTextureSize),_=e.maxTextureSize);const S=new Float32Array(_*y*4*u),A=new ou(S,_,y,u);A.type=En,A.needsUpdate=!0;const C=M*4;for(let w=0;w<u;w++){const D=g[w],L=p[w],N=v[w],F=_*y*4*w;for(let B=0;B<D.count;B++){const V=B*C;m===!0&&(i.fromBufferAttribute(D,B),S[F+V+0]=i.x,S[F+V+1]=i.y,S[F+V+2]=i.z,S[F+V+3]=0),x===!0&&(i.fromBufferAttribute(L,B),S[F+V+4]=i.x,S[F+V+5]=i.y,S[F+V+6]=i.z,S[F+V+7]=0),d===!0&&(i.fromBufferAttribute(N,B),S[F+V+8]=i.x,S[F+V+9]=i.y,S[F+V+10]=i.z,S[F+V+11]=N.itemSize===4?i.w:1)}}f={count:u,texture:A,size:new fe(_,y)},n.set(a,f),a.addEventListener("dispose",b)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(s,"morphTexture",o.morphTexture,t);else{let m=0;for(let d=0;d<l.length;d++)m+=l[d];const x=a.morphTargetsRelative?1:1-m;c.getUniforms().setValue(s,"morphTargetBaseInfluence",x),c.getUniforms().setValue(s,"morphTargetInfluences",l)}c.getUniforms().setValue(s,"morphTargetsTexture",f.texture,t),c.getUniforms().setValue(s,"morphTargetsTextureSize",f.size)}return{update:r}}function Cg(s,e,t,n){let i=new WeakMap;function r(c){const l=n.render.frame,h=c.geometry,u=e.get(c,h);if(i.get(u)!==l&&(e.update(u),i.set(u,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),i.get(c)!==l&&(t.update(c.instanceMatrix,s.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,s.ARRAY_BUFFER),i.set(c,l))),c.isSkinnedMesh){const f=c.skeleton;i.get(f)!==l&&(f.update(),i.set(f,l))}return u}function o(){i=new WeakMap}function a(c){const l=c.target;l.removeEventListener("dispose",a),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:r,dispose:o}}const Tu=new Lt,ih=new Ic(1,1),Eu=new ou,Au=new hd,Ru=new uu,sh=[],rh=[],oh=new Float32Array(16),ah=new Float32Array(9),ch=new Float32Array(4);function As(s,e,t){const n=s[0];if(n<=0||n>0)return s;const i=e*t;let r=sh[i];if(r===void 0&&(r=new Float32Array(i),sh[i]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,s[o].toArray(r,a)}return r}function Ut(s,e){if(s.length!==e.length)return!1;for(let t=0,n=s.length;t<n;t++)if(s[t]!==e[t])return!1;return!0}function Nt(s,e){for(let t=0,n=e.length;t<n;t++)s[t]=e[t]}function mo(s,e){let t=rh[e];t===void 0&&(t=new Int32Array(e),rh[e]=t);for(let n=0;n!==e;++n)t[n]=s.allocateTextureUnit();return t}function Pg(s,e){const t=this.cache;t[0]!==e&&(s.uniform1f(this.addr,e),t[0]=e)}function Dg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ut(t,e))return;s.uniform2fv(this.addr,e),Nt(t,e)}}function Ig(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(s.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Ut(t,e))return;s.uniform3fv(this.addr,e),Nt(t,e)}}function Lg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ut(t,e))return;s.uniform4fv(this.addr,e),Nt(t,e)}}function Ug(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Ut(t,e))return;s.uniformMatrix2fv(this.addr,!1,e),Nt(t,e)}else{if(Ut(t,n))return;ch.set(n),s.uniformMatrix2fv(this.addr,!1,ch),Nt(t,n)}}function Ng(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Ut(t,e))return;s.uniformMatrix3fv(this.addr,!1,e),Nt(t,e)}else{if(Ut(t,n))return;ah.set(n),s.uniformMatrix3fv(this.addr,!1,ah),Nt(t,n)}}function Fg(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Ut(t,e))return;s.uniformMatrix4fv(this.addr,!1,e),Nt(t,e)}else{if(Ut(t,n))return;oh.set(n),s.uniformMatrix4fv(this.addr,!1,oh),Nt(t,n)}}function zg(s,e){const t=this.cache;t[0]!==e&&(s.uniform1i(this.addr,e),t[0]=e)}function Og(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ut(t,e))return;s.uniform2iv(this.addr,e),Nt(t,e)}}function kg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Ut(t,e))return;s.uniform3iv(this.addr,e),Nt(t,e)}}function Bg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ut(t,e))return;s.uniform4iv(this.addr,e),Nt(t,e)}}function Hg(s,e){const t=this.cache;t[0]!==e&&(s.uniform1ui(this.addr,e),t[0]=e)}function Vg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ut(t,e))return;s.uniform2uiv(this.addr,e),Nt(t,e)}}function Gg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Ut(t,e))return;s.uniform3uiv(this.addr,e),Nt(t,e)}}function Wg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ut(t,e))return;s.uniform4uiv(this.addr,e),Nt(t,e)}}function Xg(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let r;this.type===s.SAMPLER_2D_SHADOW?(ih.compareFunction=su,r=ih):r=Tu,t.setTexture2D(e||r,i)}function qg(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||Au,i)}function Yg(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTextureCube(e||Ru,i)}function jg(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||Eu,i)}function Kg(s){switch(s){case 5126:return Pg;case 35664:return Dg;case 35665:return Ig;case 35666:return Lg;case 35674:return Ug;case 35675:return Ng;case 35676:return Fg;case 5124:case 35670:return zg;case 35667:case 35671:return Og;case 35668:case 35672:return kg;case 35669:case 35673:return Bg;case 5125:return Hg;case 36294:return Vg;case 36295:return Gg;case 36296:return Wg;case 35678:case 36198:case 36298:case 36306:case 35682:return Xg;case 35679:case 36299:case 36307:return qg;case 35680:case 36300:case 36308:case 36293:return Yg;case 36289:case 36303:case 36311:case 36292:return jg}}function $g(s,e){s.uniform1fv(this.addr,e)}function Zg(s,e){const t=As(e,this.size,2);s.uniform2fv(this.addr,t)}function Jg(s,e){const t=As(e,this.size,3);s.uniform3fv(this.addr,t)}function Qg(s,e){const t=As(e,this.size,4);s.uniform4fv(this.addr,t)}function ex(s,e){const t=As(e,this.size,4);s.uniformMatrix2fv(this.addr,!1,t)}function tx(s,e){const t=As(e,this.size,9);s.uniformMatrix3fv(this.addr,!1,t)}function nx(s,e){const t=As(e,this.size,16);s.uniformMatrix4fv(this.addr,!1,t)}function ix(s,e){s.uniform1iv(this.addr,e)}function sx(s,e){s.uniform2iv(this.addr,e)}function rx(s,e){s.uniform3iv(this.addr,e)}function ox(s,e){s.uniform4iv(this.addr,e)}function ax(s,e){s.uniform1uiv(this.addr,e)}function cx(s,e){s.uniform2uiv(this.addr,e)}function lx(s,e){s.uniform3uiv(this.addr,e)}function hx(s,e){s.uniform4uiv(this.addr,e)}function ux(s,e,t){const n=this.cache,i=e.length,r=mo(t,i);Ut(n,r)||(s.uniform1iv(this.addr,r),Nt(n,r));for(let o=0;o!==i;++o)t.setTexture2D(e[o]||Tu,r[o])}function fx(s,e,t){const n=this.cache,i=e.length,r=mo(t,i);Ut(n,r)||(s.uniform1iv(this.addr,r),Nt(n,r));for(let o=0;o!==i;++o)t.setTexture3D(e[o]||Au,r[o])}function dx(s,e,t){const n=this.cache,i=e.length,r=mo(t,i);Ut(n,r)||(s.uniform1iv(this.addr,r),Nt(n,r));for(let o=0;o!==i;++o)t.setTextureCube(e[o]||Ru,r[o])}function px(s,e,t){const n=this.cache,i=e.length,r=mo(t,i);Ut(n,r)||(s.uniform1iv(this.addr,r),Nt(n,r));for(let o=0;o!==i;++o)t.setTexture2DArray(e[o]||Eu,r[o])}function mx(s){switch(s){case 5126:return $g;case 35664:return Zg;case 35665:return Jg;case 35666:return Qg;case 35674:return ex;case 35675:return tx;case 35676:return nx;case 5124:case 35670:return ix;case 35667:case 35671:return sx;case 35668:case 35672:return rx;case 35669:case 35673:return ox;case 5125:return ax;case 36294:return cx;case 36295:return lx;case 36296:return hx;case 35678:case 36198:case 36298:case 36306:case 35682:return ux;case 35679:case 36299:case 36307:return fx;case 35680:case 36300:case 36308:case 36293:return dx;case 36289:case 36303:case 36311:case 36292:return px}}class gx{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Kg(t.type)}}class xx{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=mx(t.type)}}class vx{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const i=this.seq;for(let r=0,o=i.length;r!==o;++r){const a=i[r];a.setValue(e,t[a.id],n)}}}const ra=/(\w+)(\])?(\[|\.)?/g;function lh(s,e){s.seq.push(e),s.map[e.id]=e}function _x(s,e,t){const n=s.name,i=n.length;for(ra.lastIndex=0;;){const r=ra.exec(n),o=ra.lastIndex;let a=r[1];const c=r[2]==="]",l=r[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===i){lh(t,l===void 0?new gx(a,s,e):new xx(a,s,e));break}else{let u=t.map[a];u===void 0&&(u=new vx(a),lh(t,u)),t=u}}}class jr{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const r=e.getActiveUniform(t,i),o=e.getUniformLocation(t,r.name);_x(r,o,this)}}setValue(e,t,n,i){const r=this.map[t];r!==void 0&&r.setValue(e,n,i)}setOptional(e,t,n){const i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let r=0,o=t.length;r!==o;++r){const a=t[r],c=n[a.id];c.needsUpdate!==!1&&a.setValue(e,c.value,i)}}static seqWithValue(e,t){const n=[];for(let i=0,r=e.length;i!==r;++i){const o=e[i];o.id in t&&n.push(o)}return n}}function hh(s,e,t){const n=s.createShader(e);return s.shaderSource(n,t),s.compileShader(n),n}const Mx=37297;let yx=0;function Sx(s,e){const t=s.split(`
`),n=[],i=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=i;o<r;o++){const a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}const uh=new He;function bx(s){et._getMatrix(uh,et.workingColorSpace,s);const e=`mat3( ${uh.elements.map(t=>t.toFixed(4))} )`;switch(et.getTransfer(s)){case eo:return[e,"LinearTransferOETF"];case ht:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",s),[e,"LinearTransferOETF"]}}function fh(s,e,t){const n=s.getShaderParameter(e,s.COMPILE_STATUS),r=(s.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+Sx(s.getShaderSource(e),a)}else return r}function wx(s,e){const t=bx(e);return[`vec4 ${s}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function Tx(s,e){let t;switch(e){case yf:t="Linear";break;case Sf:t="Reinhard";break;case bf:t="Cineon";break;case qh:t="ACESFilmic";break;case Tf:t="AgX";break;case Ef:t="Neutral";break;case wf:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+s+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Br=new R;function Ex(){et.getLuminanceCoefficients(Br);const s=Br.x.toFixed(4),e=Br.y.toFixed(4),t=Br.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Ax(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Gs).join(`
`)}function Rx(s){const e=[];for(const t in s){const n=s[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Cx(s,e){const t={},n=s.getProgramParameter(e,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const r=s.getActiveAttrib(e,i),o=r.name;let a=1;r.type===s.FLOAT_MAT2&&(a=2),r.type===s.FLOAT_MAT3&&(a=3),r.type===s.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:s.getAttribLocation(e,o),locationSize:a}}return t}function Gs(s){return s!==""}function dh(s,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function ph(s,e){return s.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Px=/^[ \t]*#include +<([\w\d./]+)>/gm;function oc(s){return s.replace(Px,Ix)}const Dx=new Map;function Ix(s,e){let t=Ge[e];if(t===void 0){const n=Dx.get(e);if(n!==void 0)t=Ge[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return oc(t)}const Lx=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function mh(s){return s.replace(Lx,Ux)}function Ux(s,e,t,n){let i="";for(let r=parseInt(e);r<parseInt(t);r++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return i}function gh(s){let e=`precision ${s.precision} float;
	precision ${s.precision} int;
	precision ${s.precision} sampler2D;
	precision ${s.precision} samplerCube;
	precision ${s.precision} sampler3D;
	precision ${s.precision} sampler2DArray;
	precision ${s.precision} sampler2DShadow;
	precision ${s.precision} samplerCubeShadow;
	precision ${s.precision} sampler2DArrayShadow;
	precision ${s.precision} isampler2D;
	precision ${s.precision} isampler3D;
	precision ${s.precision} isamplerCube;
	precision ${s.precision} isampler2DArray;
	precision ${s.precision} usampler2D;
	precision ${s.precision} usampler3D;
	precision ${s.precision} usamplerCube;
	precision ${s.precision} usampler2DArray;
	`;return s.precision==="highp"?e+=`
#define HIGH_PRECISION`:s.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:s.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function Nx(s){let e="SHADOWMAP_TYPE_BASIC";return s.shadowMapType===Gh?e="SHADOWMAP_TYPE_PCF":s.shadowMapType===Wh?e="SHADOWMAP_TYPE_PCF_SOFT":s.shadowMapType===Zn&&(e="SHADOWMAP_TYPE_VSM"),e}function Fx(s){let e="ENVMAP_TYPE_CUBE";if(s.envMap)switch(s.envMapMode){case ds:case ps:e="ENVMAP_TYPE_CUBE";break;case lo:e="ENVMAP_TYPE_CUBE_UV";break}return e}function zx(s){let e="ENVMAP_MODE_REFLECTION";if(s.envMap)switch(s.envMapMode){case ps:e="ENVMAP_MODE_REFRACTION";break}return e}function Ox(s){let e="ENVMAP_BLENDING_NONE";if(s.envMap)switch(s.combine){case Xh:e="ENVMAP_BLENDING_MULTIPLY";break;case _f:e="ENVMAP_BLENDING_MIX";break;case Mf:e="ENVMAP_BLENDING_ADD";break}return e}function kx(s){const e=s.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function Bx(s,e,t,n){const i=s.getContext(),r=t.defines;let o=t.vertexShader,a=t.fragmentShader;const c=Nx(t),l=Fx(t),h=zx(t),u=Ox(t),f=kx(t),m=Ax(t),x=Rx(r),d=i.createProgram();let g,p,v=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x].filter(Gs).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x].filter(Gs).join(`
`),p.length>0&&(p+=`
`)):(g=[gh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Gs).join(`
`),p=[gh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,x,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==vi?"#define TONE_MAPPING":"",t.toneMapping!==vi?Ge.tonemapping_pars_fragment:"",t.toneMapping!==vi?Tx("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Ge.colorspace_pars_fragment,wx("linearToOutputTexel",t.outputColorSpace),Ex(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Gs).join(`
`)),o=oc(o),o=dh(o,t),o=ph(o,t),a=oc(a),a=dh(a,t),a=ph(a,t),o=mh(o),a=mh(a),t.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,g=[m,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",t.glslVersion===ul?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===ul?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const M=v+g+o,_=v+p+a,y=hh(i,i.VERTEX_SHADER,M),S=hh(i,i.FRAGMENT_SHADER,_);i.attachShader(d,y),i.attachShader(d,S),t.index0AttributeName!==void 0?i.bindAttribLocation(d,0,t.index0AttributeName):t.morphTargets===!0&&i.bindAttribLocation(d,0,"position"),i.linkProgram(d);function A(D){if(s.debug.checkShaderErrors){const L=i.getProgramInfoLog(d)||"",N=i.getShaderInfoLog(y)||"",F=i.getShaderInfoLog(S)||"",B=L.trim(),V=N.trim(),X=F.trim();let k=!0,Q=!0;if(i.getProgramParameter(d,i.LINK_STATUS)===!1)if(k=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,d,y,S);else{const ae=fh(i,y,"vertex"),pe=fh(i,S,"fragment");console.error("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(d,i.VALIDATE_STATUS)+`

Material Name: `+D.name+`
Material Type: `+D.type+`

Program Info Log: `+B+`
`+ae+`
`+pe)}else B!==""?console.warn("THREE.WebGLProgram: Program Info Log:",B):(V===""||X==="")&&(Q=!1);Q&&(D.diagnostics={runnable:k,programLog:B,vertexShader:{log:V,prefix:g},fragmentShader:{log:X,prefix:p}})}i.deleteShader(y),i.deleteShader(S),C=new jr(i,d),b=Cx(i,d)}let C;this.getUniforms=function(){return C===void 0&&A(this),C};let b;this.getAttributes=function(){return b===void 0&&A(this),b};let w=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return w===!1&&(w=i.getProgramParameter(d,Mx)),w},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(d),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=yx++,this.cacheKey=e,this.usedTimes=1,this.program=d,this.vertexShader=y,this.fragmentShader=S,this}let Hx=0;class Vx{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,i=this._getShaderStage(t),r=this._getShaderStage(n),o=this._getShaderCacheForMaterial(e);return o.has(i)===!1&&(o.add(i),i.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new Gx(e),t.set(e,n)),n}}class Gx{constructor(e){this.id=Hx++,this.code=e,this.usedTimes=0}}function Wx(s,e,t,n,i,r,o){const a=new au,c=new Vx,l=new Set,h=[],u=i.logarithmicDepthBuffer,f=i.vertexTextures;let m=i.precision;const x={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function d(b){return l.add(b),b===0?"uv":`uv${b}`}function g(b,w,D,L,N){const F=L.fog,B=N.geometry,V=b.isMeshStandardMaterial?L.environment:null,X=(b.isMeshStandardMaterial?t:e).get(b.envMap||V),k=X&&X.mapping===lo?X.image.height:null,Q=x[b.type];b.precision!==null&&(m=i.getMaxPrecision(b.precision),m!==b.precision&&console.warn("THREE.WebGLProgram.getParameters:",b.precision,"not supported, using",m,"instead."));const ae=B.morphAttributes.position||B.morphAttributes.normal||B.morphAttributes.color,pe=ae!==void 0?ae.length:0;let Ne=0;B.morphAttributes.position!==void 0&&(Ne=1),B.morphAttributes.normal!==void 0&&(Ne=2),B.morphAttributes.color!==void 0&&(Ne=3);let nt,st,Qe,K;if(Q){const rt=Nn[Q];nt=rt.vertexShader,st=rt.fragmentShader}else nt=b.vertexShader,st=b.fragmentShader,c.update(b),Qe=c.getVertexShaderID(b),K=c.getFragmentShaderID(b);const ee=s.getRenderTarget(),me=s.state.buffers.depth.getReversed(),De=N.isInstancedMesh===!0,Te=N.isBatchedMesh===!0,Ye=!!b.map,_t=!!b.matcap,I=!!X,dt=!!b.aoMap,ze=!!b.lightMap,Ie=!!b.bumpMap,Me=!!b.normalMap,pt=!!b.displacementMap,ye=!!b.emissiveMap,ke=!!b.metalnessMap,bt=!!b.roughnessMap,St=b.anisotropy>0,P=b.clearcoat>0,T=b.dispersion>0,H=b.iridescence>0,Y=b.sheen>0,te=b.transmission>0,q=St&&!!b.anisotropyMap,Ee=P&&!!b.clearcoatMap,oe=P&&!!b.clearcoatNormalMap,j=P&&!!b.clearcoatRoughnessMap,le=H&&!!b.iridescenceMap,$=H&&!!b.iridescenceThicknessMap,ne=Y&&!!b.sheenColorMap,be=Y&&!!b.sheenRoughnessMap,ge=!!b.specularMap,ce=!!b.specularColorMap,Re=!!b.specularIntensityMap,U=te&&!!b.transmissionMap,re=te&&!!b.thicknessMap,he=!!b.gradientMap,_e=!!b.alphaMap,ie=b.alphaTest>0,Z=!!b.alphaHash,we=!!b.extensions;let Be=vi;b.toneMapped&&(ee===null||ee.isXRRenderTarget===!0)&&(Be=s.toneMapping);const mt={shaderID:Q,shaderType:b.type,shaderName:b.name,vertexShader:nt,fragmentShader:st,defines:b.defines,customVertexShaderID:Qe,customFragmentShaderID:K,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:m,batching:Te,batchingColor:Te&&N._colorsTexture!==null,instancing:De,instancingColor:De&&N.instanceColor!==null,instancingMorph:De&&N.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:ee===null?s.outputColorSpace:ee.isXRRenderTarget===!0?ee.texture.colorSpace:en,alphaToCoverage:!!b.alphaToCoverage,map:Ye,matcap:_t,envMap:I,envMapMode:I&&X.mapping,envMapCubeUVHeight:k,aoMap:dt,lightMap:ze,bumpMap:Ie,normalMap:Me,displacementMap:f&&pt,emissiveMap:ye,normalMapObjectSpace:Me&&b.normalMapType===If,normalMapTangentSpace:Me&&b.normalMapType===iu,metalnessMap:ke,roughnessMap:bt,anisotropy:St,anisotropyMap:q,clearcoat:P,clearcoatMap:Ee,clearcoatNormalMap:oe,clearcoatRoughnessMap:j,dispersion:T,iridescence:H,iridescenceMap:le,iridescenceThicknessMap:$,sheen:Y,sheenColorMap:ne,sheenRoughnessMap:be,specularMap:ge,specularColorMap:ce,specularIntensityMap:Re,transmission:te,transmissionMap:U,thicknessMap:re,gradientMap:he,opaque:b.transparent===!1&&b.blending===cs&&b.alphaToCoverage===!1,alphaMap:_e,alphaTest:ie,alphaHash:Z,combine:b.combine,mapUv:Ye&&d(b.map.channel),aoMapUv:dt&&d(b.aoMap.channel),lightMapUv:ze&&d(b.lightMap.channel),bumpMapUv:Ie&&d(b.bumpMap.channel),normalMapUv:Me&&d(b.normalMap.channel),displacementMapUv:pt&&d(b.displacementMap.channel),emissiveMapUv:ye&&d(b.emissiveMap.channel),metalnessMapUv:ke&&d(b.metalnessMap.channel),roughnessMapUv:bt&&d(b.roughnessMap.channel),anisotropyMapUv:q&&d(b.anisotropyMap.channel),clearcoatMapUv:Ee&&d(b.clearcoatMap.channel),clearcoatNormalMapUv:oe&&d(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:j&&d(b.clearcoatRoughnessMap.channel),iridescenceMapUv:le&&d(b.iridescenceMap.channel),iridescenceThicknessMapUv:$&&d(b.iridescenceThicknessMap.channel),sheenColorMapUv:ne&&d(b.sheenColorMap.channel),sheenRoughnessMapUv:be&&d(b.sheenRoughnessMap.channel),specularMapUv:ge&&d(b.specularMap.channel),specularColorMapUv:ce&&d(b.specularColorMap.channel),specularIntensityMapUv:Re&&d(b.specularIntensityMap.channel),transmissionMapUv:U&&d(b.transmissionMap.channel),thicknessMapUv:re&&d(b.thicknessMap.channel),alphaMapUv:_e&&d(b.alphaMap.channel),vertexTangents:!!B.attributes.tangent&&(Me||St),vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!B.attributes.color&&B.attributes.color.itemSize===4,pointsUvs:N.isPoints===!0&&!!B.attributes.uv&&(Ye||_e),fog:!!F,useFog:b.fog===!0,fogExp2:!!F&&F.isFogExp2,flatShading:b.flatShading===!0&&b.wireframe===!1,sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:me,skinning:N.isSkinnedMesh===!0,morphTargets:B.morphAttributes.position!==void 0,morphNormals:B.morphAttributes.normal!==void 0,morphColors:B.morphAttributes.color!==void 0,morphTargetsCount:pe,morphTextureStride:Ne,numDirLights:w.directional.length,numPointLights:w.point.length,numSpotLights:w.spot.length,numSpotLightMaps:w.spotLightMap.length,numRectAreaLights:w.rectArea.length,numHemiLights:w.hemi.length,numDirLightShadows:w.directionalShadowMap.length,numPointLightShadows:w.pointShadowMap.length,numSpotLightShadows:w.spotShadowMap.length,numSpotLightShadowsWithMaps:w.numSpotLightShadowsWithMaps,numLightProbes:w.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:b.dithering,shadowMapEnabled:s.shadowMap.enabled&&D.length>0,shadowMapType:s.shadowMap.type,toneMapping:Be,decodeVideoTexture:Ye&&b.map.isVideoTexture===!0&&et.getTransfer(b.map.colorSpace)===ht,decodeVideoTextureEmissive:ye&&b.emissiveMap.isVideoTexture===!0&&et.getTransfer(b.emissiveMap.colorSpace)===ht,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===Et,flipSided:b.side===Ht,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionClipCullDistance:we&&b.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(we&&b.extensions.multiDraw===!0||Te)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()};return mt.vertexUv1s=l.has(1),mt.vertexUv2s=l.has(2),mt.vertexUv3s=l.has(3),l.clear(),mt}function p(b){const w=[];if(b.shaderID?w.push(b.shaderID):(w.push(b.customVertexShaderID),w.push(b.customFragmentShaderID)),b.defines!==void 0)for(const D in b.defines)w.push(D),w.push(b.defines[D]);return b.isRawShaderMaterial===!1&&(v(w,b),M(w,b),w.push(s.outputColorSpace)),w.push(b.customProgramCacheKey),w.join()}function v(b,w){b.push(w.precision),b.push(w.outputColorSpace),b.push(w.envMapMode),b.push(w.envMapCubeUVHeight),b.push(w.mapUv),b.push(w.alphaMapUv),b.push(w.lightMapUv),b.push(w.aoMapUv),b.push(w.bumpMapUv),b.push(w.normalMapUv),b.push(w.displacementMapUv),b.push(w.emissiveMapUv),b.push(w.metalnessMapUv),b.push(w.roughnessMapUv),b.push(w.anisotropyMapUv),b.push(w.clearcoatMapUv),b.push(w.clearcoatNormalMapUv),b.push(w.clearcoatRoughnessMapUv),b.push(w.iridescenceMapUv),b.push(w.iridescenceThicknessMapUv),b.push(w.sheenColorMapUv),b.push(w.sheenRoughnessMapUv),b.push(w.specularMapUv),b.push(w.specularColorMapUv),b.push(w.specularIntensityMapUv),b.push(w.transmissionMapUv),b.push(w.thicknessMapUv),b.push(w.combine),b.push(w.fogExp2),b.push(w.sizeAttenuation),b.push(w.morphTargetsCount),b.push(w.morphAttributeCount),b.push(w.numDirLights),b.push(w.numPointLights),b.push(w.numSpotLights),b.push(w.numSpotLightMaps),b.push(w.numHemiLights),b.push(w.numRectAreaLights),b.push(w.numDirLightShadows),b.push(w.numPointLightShadows),b.push(w.numSpotLightShadows),b.push(w.numSpotLightShadowsWithMaps),b.push(w.numLightProbes),b.push(w.shadowMapType),b.push(w.toneMapping),b.push(w.numClippingPlanes),b.push(w.numClipIntersection),b.push(w.depthPacking)}function M(b,w){a.disableAll(),w.supportsVertexTextures&&a.enable(0),w.instancing&&a.enable(1),w.instancingColor&&a.enable(2),w.instancingMorph&&a.enable(3),w.matcap&&a.enable(4),w.envMap&&a.enable(5),w.normalMapObjectSpace&&a.enable(6),w.normalMapTangentSpace&&a.enable(7),w.clearcoat&&a.enable(8),w.iridescence&&a.enable(9),w.alphaTest&&a.enable(10),w.vertexColors&&a.enable(11),w.vertexAlphas&&a.enable(12),w.vertexUv1s&&a.enable(13),w.vertexUv2s&&a.enable(14),w.vertexUv3s&&a.enable(15),w.vertexTangents&&a.enable(16),w.anisotropy&&a.enable(17),w.alphaHash&&a.enable(18),w.batching&&a.enable(19),w.dispersion&&a.enable(20),w.batchingColor&&a.enable(21),w.gradientMap&&a.enable(22),b.push(a.mask),a.disableAll(),w.fog&&a.enable(0),w.useFog&&a.enable(1),w.flatShading&&a.enable(2),w.logarithmicDepthBuffer&&a.enable(3),w.reversedDepthBuffer&&a.enable(4),w.skinning&&a.enable(5),w.morphTargets&&a.enable(6),w.morphNormals&&a.enable(7),w.morphColors&&a.enable(8),w.premultipliedAlpha&&a.enable(9),w.shadowMapEnabled&&a.enable(10),w.doubleSided&&a.enable(11),w.flipSided&&a.enable(12),w.useDepthPacking&&a.enable(13),w.dithering&&a.enable(14),w.transmission&&a.enable(15),w.sheen&&a.enable(16),w.opaque&&a.enable(17),w.pointsUvs&&a.enable(18),w.decodeVideoTexture&&a.enable(19),w.decodeVideoTextureEmissive&&a.enable(20),w.alphaToCoverage&&a.enable(21),b.push(a.mask)}function _(b){const w=x[b.type];let D;if(w){const L=Nn[w];D=hu.clone(L.uniforms)}else D=b.uniforms;return D}function y(b,w){let D;for(let L=0,N=h.length;L<N;L++){const F=h[L];if(F.cacheKey===w){D=F,++D.usedTimes;break}}return D===void 0&&(D=new Bx(s,w,b,r),h.push(D)),D}function S(b){if(--b.usedTimes===0){const w=h.indexOf(b);h[w]=h[h.length-1],h.pop(),b.destroy()}}function A(b){c.remove(b)}function C(){c.dispose()}return{getParameters:g,getProgramCacheKey:p,getUniforms:_,acquireProgram:y,releaseProgram:S,releaseShaderCache:A,programs:h,dispose:C}}function Xx(){let s=new WeakMap;function e(o){return s.has(o)}function t(o){let a=s.get(o);return a===void 0&&(a={},s.set(o,a)),a}function n(o){s.delete(o)}function i(o,a,c){s.get(o)[a]=c}function r(){s=new WeakMap}return{has:e,get:t,remove:n,update:i,dispose:r}}function qx(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.material.id!==e.material.id?s.material.id-e.material.id:s.z!==e.z?s.z-e.z:s.id-e.id}function xh(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.z!==e.z?e.z-s.z:s.id-e.id}function vh(){const s=[];let e=0;const t=[],n=[],i=[];function r(){e=0,t.length=0,n.length=0,i.length=0}function o(u,f,m,x,d,g){let p=s[e];return p===void 0?(p={id:u.id,object:u,geometry:f,material:m,groupOrder:x,renderOrder:u.renderOrder,z:d,group:g},s[e]=p):(p.id=u.id,p.object=u,p.geometry=f,p.material=m,p.groupOrder=x,p.renderOrder=u.renderOrder,p.z=d,p.group=g),e++,p}function a(u,f,m,x,d,g){const p=o(u,f,m,x,d,g);m.transmission>0?n.push(p):m.transparent===!0?i.push(p):t.push(p)}function c(u,f,m,x,d,g){const p=o(u,f,m,x,d,g);m.transmission>0?n.unshift(p):m.transparent===!0?i.unshift(p):t.unshift(p)}function l(u,f){t.length>1&&t.sort(u||qx),n.length>1&&n.sort(f||xh),i.length>1&&i.sort(f||xh)}function h(){for(let u=e,f=s.length;u<f;u++){const m=s[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:n,transparent:i,init:r,push:a,unshift:c,finish:h,sort:l}}function Yx(){let s=new WeakMap;function e(n,i){const r=s.get(n);let o;return r===void 0?(o=new vh,s.set(n,[o])):i>=r.length?(o=new vh,r.push(o)):o=r[i],o}function t(){s=new WeakMap}return{get:e,dispose:t}}function jx(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new R,color:new xe};break;case"SpotLight":t={position:new R,direction:new R,color:new xe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new R,color:new xe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new R,skyColor:new xe,groundColor:new xe};break;case"RectAreaLight":t={color:new xe,position:new R,halfWidth:new R,halfHeight:new R};break}return s[e.id]=t,t}}}function Kx(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new fe};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new fe};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new fe,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[e.id]=t,t}}}let $x=0;function Zx(s,e){return(e.castShadow?2:0)-(s.castShadow?2:0)+(e.map?1:0)-(s.map?1:0)}function Jx(s){const e=new jx,t=Kx(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new R);const i=new R,r=new Oe,o=new Oe;function a(l){let h=0,u=0,f=0;for(let b=0;b<9;b++)n.probe[b].set(0,0,0);let m=0,x=0,d=0,g=0,p=0,v=0,M=0,_=0,y=0,S=0,A=0;l.sort(Zx);for(let b=0,w=l.length;b<w;b++){const D=l[b],L=D.color,N=D.intensity,F=D.distance,B=D.shadow&&D.shadow.map?D.shadow.map.texture:null;if(D.isAmbientLight)h+=L.r*N,u+=L.g*N,f+=L.b*N;else if(D.isLightProbe){for(let V=0;V<9;V++)n.probe[V].addScaledVector(D.sh.coefficients[V],N);A++}else if(D.isDirectionalLight){const V=e.get(D);if(V.color.copy(D.color).multiplyScalar(D.intensity),D.castShadow){const X=D.shadow,k=t.get(D);k.shadowIntensity=X.intensity,k.shadowBias=X.bias,k.shadowNormalBias=X.normalBias,k.shadowRadius=X.radius,k.shadowMapSize=X.mapSize,n.directionalShadow[m]=k,n.directionalShadowMap[m]=B,n.directionalShadowMatrix[m]=D.shadow.matrix,v++}n.directional[m]=V,m++}else if(D.isSpotLight){const V=e.get(D);V.position.setFromMatrixPosition(D.matrixWorld),V.color.copy(L).multiplyScalar(N),V.distance=F,V.coneCos=Math.cos(D.angle),V.penumbraCos=Math.cos(D.angle*(1-D.penumbra)),V.decay=D.decay,n.spot[d]=V;const X=D.shadow;if(D.map&&(n.spotLightMap[y]=D.map,y++,X.updateMatrices(D),D.castShadow&&S++),n.spotLightMatrix[d]=X.matrix,D.castShadow){const k=t.get(D);k.shadowIntensity=X.intensity,k.shadowBias=X.bias,k.shadowNormalBias=X.normalBias,k.shadowRadius=X.radius,k.shadowMapSize=X.mapSize,n.spotShadow[d]=k,n.spotShadowMap[d]=B,_++}d++}else if(D.isRectAreaLight){const V=e.get(D);V.color.copy(L).multiplyScalar(N),V.halfWidth.set(D.width*.5,0,0),V.halfHeight.set(0,D.height*.5,0),n.rectArea[g]=V,g++}else if(D.isPointLight){const V=e.get(D);if(V.color.copy(D.color).multiplyScalar(D.intensity),V.distance=D.distance,V.decay=D.decay,D.castShadow){const X=D.shadow,k=t.get(D);k.shadowIntensity=X.intensity,k.shadowBias=X.bias,k.shadowNormalBias=X.normalBias,k.shadowRadius=X.radius,k.shadowMapSize=X.mapSize,k.shadowCameraNear=X.camera.near,k.shadowCameraFar=X.camera.far,n.pointShadow[x]=k,n.pointShadowMap[x]=B,n.pointShadowMatrix[x]=D.shadow.matrix,M++}n.point[x]=V,x++}else if(D.isHemisphereLight){const V=e.get(D);V.skyColor.copy(D.color).multiplyScalar(N),V.groundColor.copy(D.groundColor).multiplyScalar(N),n.hemi[p]=V,p++}}g>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ue.LTC_FLOAT_1,n.rectAreaLTC2=ue.LTC_FLOAT_2):(n.rectAreaLTC1=ue.LTC_HALF_1,n.rectAreaLTC2=ue.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=f;const C=n.hash;(C.directionalLength!==m||C.pointLength!==x||C.spotLength!==d||C.rectAreaLength!==g||C.hemiLength!==p||C.numDirectionalShadows!==v||C.numPointShadows!==M||C.numSpotShadows!==_||C.numSpotMaps!==y||C.numLightProbes!==A)&&(n.directional.length=m,n.spot.length=d,n.rectArea.length=g,n.point.length=x,n.hemi.length=p,n.directionalShadow.length=v,n.directionalShadowMap.length=v,n.pointShadow.length=M,n.pointShadowMap.length=M,n.spotShadow.length=_,n.spotShadowMap.length=_,n.directionalShadowMatrix.length=v,n.pointShadowMatrix.length=M,n.spotLightMatrix.length=_+y-S,n.spotLightMap.length=y,n.numSpotLightShadowsWithMaps=S,n.numLightProbes=A,C.directionalLength=m,C.pointLength=x,C.spotLength=d,C.rectAreaLength=g,C.hemiLength=p,C.numDirectionalShadows=v,C.numPointShadows=M,C.numSpotShadows=_,C.numSpotMaps=y,C.numLightProbes=A,n.version=$x++)}function c(l,h){let u=0,f=0,m=0,x=0,d=0;const g=h.matrixWorldInverse;for(let p=0,v=l.length;p<v;p++){const M=l[p];if(M.isDirectionalLight){const _=n.directional[u];_.direction.setFromMatrixPosition(M.matrixWorld),i.setFromMatrixPosition(M.target.matrixWorld),_.direction.sub(i),_.direction.transformDirection(g),u++}else if(M.isSpotLight){const _=n.spot[m];_.position.setFromMatrixPosition(M.matrixWorld),_.position.applyMatrix4(g),_.direction.setFromMatrixPosition(M.matrixWorld),i.setFromMatrixPosition(M.target.matrixWorld),_.direction.sub(i),_.direction.transformDirection(g),m++}else if(M.isRectAreaLight){const _=n.rectArea[x];_.position.setFromMatrixPosition(M.matrixWorld),_.position.applyMatrix4(g),o.identity(),r.copy(M.matrixWorld),r.premultiply(g),o.extractRotation(r),_.halfWidth.set(M.width*.5,0,0),_.halfHeight.set(0,M.height*.5,0),_.halfWidth.applyMatrix4(o),_.halfHeight.applyMatrix4(o),x++}else if(M.isPointLight){const _=n.point[f];_.position.setFromMatrixPosition(M.matrixWorld),_.position.applyMatrix4(g),f++}else if(M.isHemisphereLight){const _=n.hemi[d];_.direction.setFromMatrixPosition(M.matrixWorld),_.direction.transformDirection(g),d++}}}return{setup:a,setupView:c,state:n}}function _h(s){const e=new Jx(s),t=[],n=[];function i(h){l.camera=h,t.length=0,n.length=0}function r(h){t.push(h)}function o(h){n.push(h)}function a(){e.setup(t)}function c(h){e.setupView(t,h)}const l={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:i,state:l,setupLights:a,setupLightsView:c,pushLight:r,pushShadow:o}}function Qx(s){let e=new WeakMap;function t(i,r=0){const o=e.get(i);let a;return o===void 0?(a=new _h(s),e.set(i,[a])):r>=o.length?(a=new _h(s),o.push(a)):a=o[r],a}function n(){e=new WeakMap}return{get:t,dispose:n}}const ev=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,tv=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function nv(s,e,t){let n=new Cc;const i=new fe,r=new fe,o=new tt,a=new ep({depthPacking:Df}),c=new tp,l={},h=t.maxTextureSize,u={[ni]:Ht,[Ht]:ni,[Et]:Et},f=new Yt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new fe},radius:{value:4}},vertexShader:ev,fragmentShader:tv}),m=f.clone();m.defines.HORIZONTAL_PASS=1;const x=new Ct;x.setAttribute("position",new At(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const d=new Je(x,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Gh;let p=this.type;this.render=function(S,A,C){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||S.length===0)return;const b=s.getRenderTarget(),w=s.getActiveCubeFace(),D=s.getActiveMipmapLevel(),L=s.state;L.setBlending(xi),L.buffers.depth.getReversed()===!0?L.buffers.color.setClear(0,0,0,0):L.buffers.color.setClear(1,1,1,1),L.buffers.depth.setTest(!0),L.setScissorTest(!1);const N=p!==Zn&&this.type===Zn,F=p===Zn&&this.type!==Zn;for(let B=0,V=S.length;B<V;B++){const X=S[B],k=X.shadow;if(k===void 0){console.warn("THREE.WebGLShadowMap:",X,"has no shadow.");continue}if(k.autoUpdate===!1&&k.needsUpdate===!1)continue;i.copy(k.mapSize);const Q=k.getFrameExtents();if(i.multiply(Q),r.copy(k.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(r.x=Math.floor(h/Q.x),i.x=r.x*Q.x,k.mapSize.x=r.x),i.y>h&&(r.y=Math.floor(h/Q.y),i.y=r.y*Q.y,k.mapSize.y=r.y)),k.map===null||N===!0||F===!0){const pe=this.type!==Zn?{minFilter:Qt,magFilter:Qt}:{};k.map!==null&&k.map.dispose(),k.map=new Cn(i.x,i.y,pe),k.map.texture.name=X.name+".shadowMap",k.camera.updateProjectionMatrix()}s.setRenderTarget(k.map),s.clear();const ae=k.getViewportCount();for(let pe=0;pe<ae;pe++){const Ne=k.getViewport(pe);o.set(r.x*Ne.x,r.y*Ne.y,r.x*Ne.z,r.y*Ne.w),L.viewport(o),k.updateMatrices(X,pe),n=k.getFrustum(),_(A,C,k.camera,X,this.type)}k.isPointLightShadow!==!0&&this.type===Zn&&v(k,C),k.needsUpdate=!1}p=this.type,g.needsUpdate=!1,s.setRenderTarget(b,w,D)};function v(S,A){const C=e.update(d);f.defines.VSM_SAMPLES!==S.blurSamples&&(f.defines.VSM_SAMPLES=S.blurSamples,m.defines.VSM_SAMPLES=S.blurSamples,f.needsUpdate=!0,m.needsUpdate=!0),S.mapPass===null&&(S.mapPass=new Cn(i.x,i.y)),f.uniforms.shadow_pass.value=S.map.texture,f.uniforms.resolution.value=S.mapSize,f.uniforms.radius.value=S.radius,s.setRenderTarget(S.mapPass),s.clear(),s.renderBufferDirect(A,null,C,f,d,null),m.uniforms.shadow_pass.value=S.mapPass.texture,m.uniforms.resolution.value=S.mapSize,m.uniforms.radius.value=S.radius,s.setRenderTarget(S.map),s.clear(),s.renderBufferDirect(A,null,C,m,d,null)}function M(S,A,C,b){let w=null;const D=C.isPointLight===!0?S.customDistanceMaterial:S.customDepthMaterial;if(D!==void 0)w=D;else if(w=C.isPointLight===!0?c:a,s.localClippingEnabled&&A.clipShadows===!0&&Array.isArray(A.clippingPlanes)&&A.clippingPlanes.length!==0||A.displacementMap&&A.displacementScale!==0||A.alphaMap&&A.alphaTest>0||A.map&&A.alphaTest>0||A.alphaToCoverage===!0){const L=w.uuid,N=A.uuid;let F=l[L];F===void 0&&(F={},l[L]=F);let B=F[N];B===void 0&&(B=w.clone(),F[N]=B,A.addEventListener("dispose",y)),w=B}if(w.visible=A.visible,w.wireframe=A.wireframe,b===Zn?w.side=A.shadowSide!==null?A.shadowSide:A.side:w.side=A.shadowSide!==null?A.shadowSide:u[A.side],w.alphaMap=A.alphaMap,w.alphaTest=A.alphaToCoverage===!0?.5:A.alphaTest,w.map=A.map,w.clipShadows=A.clipShadows,w.clippingPlanes=A.clippingPlanes,w.clipIntersection=A.clipIntersection,w.displacementMap=A.displacementMap,w.displacementScale=A.displacementScale,w.displacementBias=A.displacementBias,w.wireframeLinewidth=A.wireframeLinewidth,w.linewidth=A.linewidth,C.isPointLight===!0&&w.isMeshDistanceMaterial===!0){const L=s.properties.get(w);L.light=C}return w}function _(S,A,C,b,w){if(S.visible===!1)return;if(S.layers.test(A.layers)&&(S.isMesh||S.isLine||S.isPoints)&&(S.castShadow||S.receiveShadow&&w===Zn)&&(!S.frustumCulled||n.intersectsObject(S))){S.modelViewMatrix.multiplyMatrices(C.matrixWorldInverse,S.matrixWorld);const N=e.update(S),F=S.material;if(Array.isArray(F)){const B=N.groups;for(let V=0,X=B.length;V<X;V++){const k=B[V],Q=F[k.materialIndex];if(Q&&Q.visible){const ae=M(S,Q,b,w);S.onBeforeShadow(s,S,A,C,N,ae,k),s.renderBufferDirect(C,null,N,ae,S,k),S.onAfterShadow(s,S,A,C,N,ae,k)}}}else if(F.visible){const B=M(S,F,b,w);S.onBeforeShadow(s,S,A,C,N,B,null),s.renderBufferDirect(C,null,N,B,S,null),S.onAfterShadow(s,S,A,C,N,B,null)}}const L=S.children;for(let N=0,F=L.length;N<F;N++)_(L[N],A,C,b,w)}function y(S){S.target.removeEventListener("dispose",y);for(const C in l){const b=l[C],w=S.target.uuid;w in b&&(b[w].dispose(),delete b[w])}}}const iv={[va]:_a,[Ma]:ba,[ya]:wa,[fs]:Sa,[_a]:va,[ba]:Ma,[wa]:ya,[Sa]:fs};function sv(s,e){function t(){let U=!1;const re=new tt;let he=null;const _e=new tt(0,0,0,0);return{setMask:function(ie){he!==ie&&!U&&(s.colorMask(ie,ie,ie,ie),he=ie)},setLocked:function(ie){U=ie},setClear:function(ie,Z,we,Be,mt){mt===!0&&(ie*=Be,Z*=Be,we*=Be),re.set(ie,Z,we,Be),_e.equals(re)===!1&&(s.clearColor(ie,Z,we,Be),_e.copy(re))},reset:function(){U=!1,he=null,_e.set(-1,0,0,0)}}}function n(){let U=!1,re=!1,he=null,_e=null,ie=null;return{setReversed:function(Z){if(re!==Z){const we=e.get("EXT_clip_control");Z?we.clipControlEXT(we.LOWER_LEFT_EXT,we.ZERO_TO_ONE_EXT):we.clipControlEXT(we.LOWER_LEFT_EXT,we.NEGATIVE_ONE_TO_ONE_EXT),re=Z;const Be=ie;ie=null,this.setClear(Be)}},getReversed:function(){return re},setTest:function(Z){Z?ee(s.DEPTH_TEST):me(s.DEPTH_TEST)},setMask:function(Z){he!==Z&&!U&&(s.depthMask(Z),he=Z)},setFunc:function(Z){if(re&&(Z=iv[Z]),_e!==Z){switch(Z){case va:s.depthFunc(s.NEVER);break;case _a:s.depthFunc(s.ALWAYS);break;case Ma:s.depthFunc(s.LESS);break;case fs:s.depthFunc(s.LEQUAL);break;case ya:s.depthFunc(s.EQUAL);break;case Sa:s.depthFunc(s.GEQUAL);break;case ba:s.depthFunc(s.GREATER);break;case wa:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}_e=Z}},setLocked:function(Z){U=Z},setClear:function(Z){ie!==Z&&(re&&(Z=1-Z),s.clearDepth(Z),ie=Z)},reset:function(){U=!1,he=null,_e=null,ie=null,re=!1}}}function i(){let U=!1,re=null,he=null,_e=null,ie=null,Z=null,we=null,Be=null,mt=null;return{setTest:function(rt){U||(rt?ee(s.STENCIL_TEST):me(s.STENCIL_TEST))},setMask:function(rt){re!==rt&&!U&&(s.stencilMask(rt),re=rt)},setFunc:function(rt,Wn,Ln){(he!==rt||_e!==Wn||ie!==Ln)&&(s.stencilFunc(rt,Wn,Ln),he=rt,_e=Wn,ie=Ln)},setOp:function(rt,Wn,Ln){(Z!==rt||we!==Wn||Be!==Ln)&&(s.stencilOp(rt,Wn,Ln),Z=rt,we=Wn,Be=Ln)},setLocked:function(rt){U=rt},setClear:function(rt){mt!==rt&&(s.clearStencil(rt),mt=rt)},reset:function(){U=!1,re=null,he=null,_e=null,ie=null,Z=null,we=null,Be=null,mt=null}}}const r=new t,o=new n,a=new i,c=new WeakMap,l=new WeakMap;let h={},u={},f=new WeakMap,m=[],x=null,d=!1,g=null,p=null,v=null,M=null,_=null,y=null,S=null,A=new xe(0,0,0),C=0,b=!1,w=null,D=null,L=null,N=null,F=null;const B=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let V=!1,X=0;const k=s.getParameter(s.VERSION);k.indexOf("WebGL")!==-1?(X=parseFloat(/^WebGL (\d)/.exec(k)[1]),V=X>=1):k.indexOf("OpenGL ES")!==-1&&(X=parseFloat(/^OpenGL ES (\d)/.exec(k)[1]),V=X>=2);let Q=null,ae={};const pe=s.getParameter(s.SCISSOR_BOX),Ne=s.getParameter(s.VIEWPORT),nt=new tt().fromArray(pe),st=new tt().fromArray(Ne);function Qe(U,re,he,_e){const ie=new Uint8Array(4),Z=s.createTexture();s.bindTexture(U,Z),s.texParameteri(U,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(U,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let we=0;we<he;we++)U===s.TEXTURE_3D||U===s.TEXTURE_2D_ARRAY?s.texImage3D(re,0,s.RGBA,1,1,_e,0,s.RGBA,s.UNSIGNED_BYTE,ie):s.texImage2D(re+we,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,ie);return Z}const K={};K[s.TEXTURE_2D]=Qe(s.TEXTURE_2D,s.TEXTURE_2D,1),K[s.TEXTURE_CUBE_MAP]=Qe(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),K[s.TEXTURE_2D_ARRAY]=Qe(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),K[s.TEXTURE_3D]=Qe(s.TEXTURE_3D,s.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ee(s.DEPTH_TEST),o.setFunc(fs),Ie(!1),Me(nl),ee(s.CULL_FACE),dt(xi);function ee(U){h[U]!==!0&&(s.enable(U),h[U]=!0)}function me(U){h[U]!==!1&&(s.disable(U),h[U]=!1)}function De(U,re){return u[U]!==re?(s.bindFramebuffer(U,re),u[U]=re,U===s.DRAW_FRAMEBUFFER&&(u[s.FRAMEBUFFER]=re),U===s.FRAMEBUFFER&&(u[s.DRAW_FRAMEBUFFER]=re),!0):!1}function Te(U,re){let he=m,_e=!1;if(U){he=f.get(re),he===void 0&&(he=[],f.set(re,he));const ie=U.textures;if(he.length!==ie.length||he[0]!==s.COLOR_ATTACHMENT0){for(let Z=0,we=ie.length;Z<we;Z++)he[Z]=s.COLOR_ATTACHMENT0+Z;he.length=ie.length,_e=!0}}else he[0]!==s.BACK&&(he[0]=s.BACK,_e=!0);_e&&s.drawBuffers(he)}function Ye(U){return x!==U?(s.useProgram(U),x=U,!0):!1}const _t={[Li]:s.FUNC_ADD,[tf]:s.FUNC_SUBTRACT,[nf]:s.FUNC_REVERSE_SUBTRACT};_t[sf]=s.MIN,_t[rf]=s.MAX;const I={[of]:s.ZERO,[af]:s.ONE,[cf]:s.SRC_COLOR,[ga]:s.SRC_ALPHA,[pf]:s.SRC_ALPHA_SATURATE,[ff]:s.DST_COLOR,[hf]:s.DST_ALPHA,[lf]:s.ONE_MINUS_SRC_COLOR,[xa]:s.ONE_MINUS_SRC_ALPHA,[df]:s.ONE_MINUS_DST_COLOR,[uf]:s.ONE_MINUS_DST_ALPHA,[mf]:s.CONSTANT_COLOR,[gf]:s.ONE_MINUS_CONSTANT_COLOR,[xf]:s.CONSTANT_ALPHA,[vf]:s.ONE_MINUS_CONSTANT_ALPHA};function dt(U,re,he,_e,ie,Z,we,Be,mt,rt){if(U===xi){d===!0&&(me(s.BLEND),d=!1);return}if(d===!1&&(ee(s.BLEND),d=!0),U!==ef){if(U!==g||rt!==b){if((p!==Li||_!==Li)&&(s.blendEquation(s.FUNC_ADD),p=Li,_=Li),rt)switch(U){case cs:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case il:s.blendFunc(s.ONE,s.ONE);break;case sl:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case rl:s.blendFuncSeparate(s.DST_COLOR,s.ONE_MINUS_SRC_ALPHA,s.ZERO,s.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",U);break}else switch(U){case cs:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case il:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE,s.ONE,s.ONE);break;case sl:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case rl:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",U);break}v=null,M=null,y=null,S=null,A.set(0,0,0),C=0,g=U,b=rt}return}ie=ie||re,Z=Z||he,we=we||_e,(re!==p||ie!==_)&&(s.blendEquationSeparate(_t[re],_t[ie]),p=re,_=ie),(he!==v||_e!==M||Z!==y||we!==S)&&(s.blendFuncSeparate(I[he],I[_e],I[Z],I[we]),v=he,M=_e,y=Z,S=we),(Be.equals(A)===!1||mt!==C)&&(s.blendColor(Be.r,Be.g,Be.b,mt),A.copy(Be),C=mt),g=U,b=!1}function ze(U,re){U.side===Et?me(s.CULL_FACE):ee(s.CULL_FACE);let he=U.side===Ht;re&&(he=!he),Ie(he),U.blending===cs&&U.transparent===!1?dt(xi):dt(U.blending,U.blendEquation,U.blendSrc,U.blendDst,U.blendEquationAlpha,U.blendSrcAlpha,U.blendDstAlpha,U.blendColor,U.blendAlpha,U.premultipliedAlpha),o.setFunc(U.depthFunc),o.setTest(U.depthTest),o.setMask(U.depthWrite),r.setMask(U.colorWrite);const _e=U.stencilWrite;a.setTest(_e),_e&&(a.setMask(U.stencilWriteMask),a.setFunc(U.stencilFunc,U.stencilRef,U.stencilFuncMask),a.setOp(U.stencilFail,U.stencilZFail,U.stencilZPass)),ye(U.polygonOffset,U.polygonOffsetFactor,U.polygonOffsetUnits),U.alphaToCoverage===!0?ee(s.SAMPLE_ALPHA_TO_COVERAGE):me(s.SAMPLE_ALPHA_TO_COVERAGE)}function Ie(U){w!==U&&(U?s.frontFace(s.CW):s.frontFace(s.CCW),w=U)}function Me(U){U!==Ju?(ee(s.CULL_FACE),U!==D&&(U===nl?s.cullFace(s.BACK):U===Qu?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):me(s.CULL_FACE),D=U}function pt(U){U!==L&&(V&&s.lineWidth(U),L=U)}function ye(U,re,he){U?(ee(s.POLYGON_OFFSET_FILL),(N!==re||F!==he)&&(s.polygonOffset(re,he),N=re,F=he)):me(s.POLYGON_OFFSET_FILL)}function ke(U){U?ee(s.SCISSOR_TEST):me(s.SCISSOR_TEST)}function bt(U){U===void 0&&(U=s.TEXTURE0+B-1),Q!==U&&(s.activeTexture(U),Q=U)}function St(U,re,he){he===void 0&&(Q===null?he=s.TEXTURE0+B-1:he=Q);let _e=ae[he];_e===void 0&&(_e={type:void 0,texture:void 0},ae[he]=_e),(_e.type!==U||_e.texture!==re)&&(Q!==he&&(s.activeTexture(he),Q=he),s.bindTexture(U,re||K[U]),_e.type=U,_e.texture=re)}function P(){const U=ae[Q];U!==void 0&&U.type!==void 0&&(s.bindTexture(U.type,null),U.type=void 0,U.texture=void 0)}function T(){try{s.compressedTexImage2D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function H(){try{s.compressedTexImage3D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function Y(){try{s.texSubImage2D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function te(){try{s.texSubImage3D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function q(){try{s.compressedTexSubImage2D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function Ee(){try{s.compressedTexSubImage3D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function oe(){try{s.texStorage2D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function j(){try{s.texStorage3D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function le(){try{s.texImage2D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function $(){try{s.texImage3D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function ne(U){nt.equals(U)===!1&&(s.scissor(U.x,U.y,U.z,U.w),nt.copy(U))}function be(U){st.equals(U)===!1&&(s.viewport(U.x,U.y,U.z,U.w),st.copy(U))}function ge(U,re){let he=l.get(re);he===void 0&&(he=new WeakMap,l.set(re,he));let _e=he.get(U);_e===void 0&&(_e=s.getUniformBlockIndex(re,U.name),he.set(U,_e))}function ce(U,re){const _e=l.get(re).get(U);c.get(re)!==_e&&(s.uniformBlockBinding(re,_e,U.__bindingPointIndex),c.set(re,_e))}function Re(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),o.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),h={},Q=null,ae={},u={},f=new WeakMap,m=[],x=null,d=!1,g=null,p=null,v=null,M=null,_=null,y=null,S=null,A=new xe(0,0,0),C=0,b=!1,w=null,D=null,L=null,N=null,F=null,nt.set(0,0,s.canvas.width,s.canvas.height),st.set(0,0,s.canvas.width,s.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:ee,disable:me,bindFramebuffer:De,drawBuffers:Te,useProgram:Ye,setBlending:dt,setMaterial:ze,setFlipSided:Ie,setCullFace:Me,setLineWidth:pt,setPolygonOffset:ye,setScissorTest:ke,activeTexture:bt,bindTexture:St,unbindTexture:P,compressedTexImage2D:T,compressedTexImage3D:H,texImage2D:le,texImage3D:$,updateUBOMapping:ge,uniformBlockBinding:ce,texStorage2D:oe,texStorage3D:j,texSubImage2D:Y,texSubImage3D:te,compressedTexSubImage2D:q,compressedTexSubImage3D:Ee,scissor:ne,viewport:be,reset:Re}}function rv(s,e,t,n,i,r,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new fe,h=new WeakMap;let u;const f=new WeakMap;let m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function x(P,T){return m?new OffscreenCanvas(P,T):ir("canvas")}function d(P,T,H){let Y=1;const te=St(P);if((te.width>H||te.height>H)&&(Y=H/Math.max(te.width,te.height)),Y<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){const q=Math.floor(Y*te.width),Ee=Math.floor(Y*te.height);u===void 0&&(u=x(q,Ee));const oe=T?x(q,Ee):u;return oe.width=q,oe.height=Ee,oe.getContext("2d").drawImage(P,0,0,q,Ee),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+te.width+"x"+te.height+") to ("+q+"x"+Ee+")."),oe}else return"data"in P&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+te.width+"x"+te.height+")."),P;return P}function g(P){return P.generateMipmaps}function p(P){s.generateMipmap(P)}function v(P){return P.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:P.isWebGL3DRenderTarget?s.TEXTURE_3D:P.isWebGLArrayRenderTarget||P.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function M(P,T,H,Y,te=!1){if(P!==null){if(s[P]!==void 0)return s[P];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let q=T;if(T===s.RED&&(H===s.FLOAT&&(q=s.R32F),H===s.HALF_FLOAT&&(q=s.R16F),H===s.UNSIGNED_BYTE&&(q=s.R8)),T===s.RED_INTEGER&&(H===s.UNSIGNED_BYTE&&(q=s.R8UI),H===s.UNSIGNED_SHORT&&(q=s.R16UI),H===s.UNSIGNED_INT&&(q=s.R32UI),H===s.BYTE&&(q=s.R8I),H===s.SHORT&&(q=s.R16I),H===s.INT&&(q=s.R32I)),T===s.RG&&(H===s.FLOAT&&(q=s.RG32F),H===s.HALF_FLOAT&&(q=s.RG16F),H===s.UNSIGNED_BYTE&&(q=s.RG8)),T===s.RG_INTEGER&&(H===s.UNSIGNED_BYTE&&(q=s.RG8UI),H===s.UNSIGNED_SHORT&&(q=s.RG16UI),H===s.UNSIGNED_INT&&(q=s.RG32UI),H===s.BYTE&&(q=s.RG8I),H===s.SHORT&&(q=s.RG16I),H===s.INT&&(q=s.RG32I)),T===s.RGB_INTEGER&&(H===s.UNSIGNED_BYTE&&(q=s.RGB8UI),H===s.UNSIGNED_SHORT&&(q=s.RGB16UI),H===s.UNSIGNED_INT&&(q=s.RGB32UI),H===s.BYTE&&(q=s.RGB8I),H===s.SHORT&&(q=s.RGB16I),H===s.INT&&(q=s.RGB32I)),T===s.RGBA_INTEGER&&(H===s.UNSIGNED_BYTE&&(q=s.RGBA8UI),H===s.UNSIGNED_SHORT&&(q=s.RGBA16UI),H===s.UNSIGNED_INT&&(q=s.RGBA32UI),H===s.BYTE&&(q=s.RGBA8I),H===s.SHORT&&(q=s.RGBA16I),H===s.INT&&(q=s.RGBA32I)),T===s.RGB&&(H===s.UNSIGNED_INT_5_9_9_9_REV&&(q=s.RGB9_E5),H===s.UNSIGNED_INT_10F_11F_11F_REV&&(q=s.R11F_G11F_B10F)),T===s.RGBA){const Ee=te?eo:et.getTransfer(Y);H===s.FLOAT&&(q=s.RGBA32F),H===s.HALF_FLOAT&&(q=s.RGBA16F),H===s.UNSIGNED_BYTE&&(q=Ee===ht?s.SRGB8_ALPHA8:s.RGBA8),H===s.UNSIGNED_SHORT_4_4_4_4&&(q=s.RGBA4),H===s.UNSIGNED_SHORT_5_5_5_1&&(q=s.RGB5_A1)}return(q===s.R16F||q===s.R32F||q===s.RG16F||q===s.RG32F||q===s.RGBA16F||q===s.RGBA32F)&&e.get("EXT_color_buffer_float"),q}function _(P,T){let H;return P?T===null||T===Mi||T===Js?H=s.DEPTH24_STENCIL8:T===En?H=s.DEPTH32F_STENCIL8:T===Zs&&(H=s.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===Mi||T===Js?H=s.DEPTH_COMPONENT24:T===En?H=s.DEPTH_COMPONENT32F:T===Zs&&(H=s.DEPTH_COMPONENT16),H}function y(P,T){return g(P)===!0||P.isFramebufferTexture&&P.minFilter!==Qt&&P.minFilter!==sn?Math.log2(Math.max(T.width,T.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?T.mipmaps.length:1}function S(P){const T=P.target;T.removeEventListener("dispose",S),C(T),T.isVideoTexture&&h.delete(T)}function A(P){const T=P.target;T.removeEventListener("dispose",A),w(T)}function C(P){const T=n.get(P);if(T.__webglInit===void 0)return;const H=P.source,Y=f.get(H);if(Y){const te=Y[T.__cacheKey];te.usedTimes--,te.usedTimes===0&&b(P),Object.keys(Y).length===0&&f.delete(H)}n.remove(P)}function b(P){const T=n.get(P);s.deleteTexture(T.__webglTexture);const H=P.source,Y=f.get(H);delete Y[T.__cacheKey],o.memory.textures--}function w(P){const T=n.get(P);if(P.depthTexture&&(P.depthTexture.dispose(),n.remove(P.depthTexture)),P.isWebGLCubeRenderTarget)for(let Y=0;Y<6;Y++){if(Array.isArray(T.__webglFramebuffer[Y]))for(let te=0;te<T.__webglFramebuffer[Y].length;te++)s.deleteFramebuffer(T.__webglFramebuffer[Y][te]);else s.deleteFramebuffer(T.__webglFramebuffer[Y]);T.__webglDepthbuffer&&s.deleteRenderbuffer(T.__webglDepthbuffer[Y])}else{if(Array.isArray(T.__webglFramebuffer))for(let Y=0;Y<T.__webglFramebuffer.length;Y++)s.deleteFramebuffer(T.__webglFramebuffer[Y]);else s.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer&&s.deleteRenderbuffer(T.__webglDepthbuffer),T.__webglMultisampledFramebuffer&&s.deleteFramebuffer(T.__webglMultisampledFramebuffer),T.__webglColorRenderbuffer)for(let Y=0;Y<T.__webglColorRenderbuffer.length;Y++)T.__webglColorRenderbuffer[Y]&&s.deleteRenderbuffer(T.__webglColorRenderbuffer[Y]);T.__webglDepthRenderbuffer&&s.deleteRenderbuffer(T.__webglDepthRenderbuffer)}const H=P.textures;for(let Y=0,te=H.length;Y<te;Y++){const q=n.get(H[Y]);q.__webglTexture&&(s.deleteTexture(q.__webglTexture),o.memory.textures--),n.remove(H[Y])}n.remove(P)}let D=0;function L(){D=0}function N(){const P=D;return P>=i.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+P+" texture units while this GPU supports only "+i.maxTextures),D+=1,P}function F(P){const T=[];return T.push(P.wrapS),T.push(P.wrapT),T.push(P.wrapR||0),T.push(P.magFilter),T.push(P.minFilter),T.push(P.anisotropy),T.push(P.internalFormat),T.push(P.format),T.push(P.type),T.push(P.generateMipmaps),T.push(P.premultiplyAlpha),T.push(P.flipY),T.push(P.unpackAlignment),T.push(P.colorSpace),T.join()}function B(P,T){const H=n.get(P);if(P.isVideoTexture&&ke(P),P.isRenderTargetTexture===!1&&P.isExternalTexture!==!0&&P.version>0&&H.__version!==P.version){const Y=P.image;if(Y===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(Y.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{K(H,P,T);return}}else P.isExternalTexture&&(H.__webglTexture=P.sourceTexture?P.sourceTexture:null);t.bindTexture(s.TEXTURE_2D,H.__webglTexture,s.TEXTURE0+T)}function V(P,T){const H=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&H.__version!==P.version){K(H,P,T);return}t.bindTexture(s.TEXTURE_2D_ARRAY,H.__webglTexture,s.TEXTURE0+T)}function X(P,T){const H=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&H.__version!==P.version){K(H,P,T);return}t.bindTexture(s.TEXTURE_3D,H.__webglTexture,s.TEXTURE0+T)}function k(P,T){const H=n.get(P);if(P.version>0&&H.__version!==P.version){ee(H,P,T);return}t.bindTexture(s.TEXTURE_CUBE_MAP,H.__webglTexture,s.TEXTURE0+T)}const Q={[ii]:s.REPEAT,[Tn]:s.CLAMP_TO_EDGE,[Qr]:s.MIRRORED_REPEAT},ae={[Qt]:s.NEAREST,[jh]:s.NEAREST_MIPMAP_NEAREST,[Hs]:s.NEAREST_MIPMAP_LINEAR,[sn]:s.LINEAR,[Gr]:s.LINEAR_MIPMAP_NEAREST,[Fn]:s.LINEAR_MIPMAP_LINEAR},pe={[Lf]:s.NEVER,[kf]:s.ALWAYS,[Uf]:s.LESS,[su]:s.LEQUAL,[Nf]:s.EQUAL,[Of]:s.GEQUAL,[Ff]:s.GREATER,[zf]:s.NOTEQUAL};function Ne(P,T){if(T.type===En&&e.has("OES_texture_float_linear")===!1&&(T.magFilter===sn||T.magFilter===Gr||T.magFilter===Hs||T.magFilter===Fn||T.minFilter===sn||T.minFilter===Gr||T.minFilter===Hs||T.minFilter===Fn)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(P,s.TEXTURE_WRAP_S,Q[T.wrapS]),s.texParameteri(P,s.TEXTURE_WRAP_T,Q[T.wrapT]),(P===s.TEXTURE_3D||P===s.TEXTURE_2D_ARRAY)&&s.texParameteri(P,s.TEXTURE_WRAP_R,Q[T.wrapR]),s.texParameteri(P,s.TEXTURE_MAG_FILTER,ae[T.magFilter]),s.texParameteri(P,s.TEXTURE_MIN_FILTER,ae[T.minFilter]),T.compareFunction&&(s.texParameteri(P,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(P,s.TEXTURE_COMPARE_FUNC,pe[T.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===Qt||T.minFilter!==Hs&&T.minFilter!==Fn||T.type===En&&e.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||n.get(T).__currentAnisotropy){const H=e.get("EXT_texture_filter_anisotropic");s.texParameterf(P,H.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,i.getMaxAnisotropy())),n.get(T).__currentAnisotropy=T.anisotropy}}}function nt(P,T){let H=!1;P.__webglInit===void 0&&(P.__webglInit=!0,T.addEventListener("dispose",S));const Y=T.source;let te=f.get(Y);te===void 0&&(te={},f.set(Y,te));const q=F(T);if(q!==P.__cacheKey){te[q]===void 0&&(te[q]={texture:s.createTexture(),usedTimes:0},o.memory.textures++,H=!0),te[q].usedTimes++;const Ee=te[P.__cacheKey];Ee!==void 0&&(te[P.__cacheKey].usedTimes--,Ee.usedTimes===0&&b(T)),P.__cacheKey=q,P.__webglTexture=te[q].texture}return H}function st(P,T,H){return Math.floor(Math.floor(P/H)/T)}function Qe(P,T,H,Y){const q=P.updateRanges;if(q.length===0)t.texSubImage2D(s.TEXTURE_2D,0,0,0,T.width,T.height,H,Y,T.data);else{q.sort(($,ne)=>$.start-ne.start);let Ee=0;for(let $=1;$<q.length;$++){const ne=q[Ee],be=q[$],ge=ne.start+ne.count,ce=st(be.start,T.width,4),Re=st(ne.start,T.width,4);be.start<=ge+1&&ce===Re&&st(be.start+be.count-1,T.width,4)===ce?ne.count=Math.max(ne.count,be.start+be.count-ne.start):(++Ee,q[Ee]=be)}q.length=Ee+1;const oe=s.getParameter(s.UNPACK_ROW_LENGTH),j=s.getParameter(s.UNPACK_SKIP_PIXELS),le=s.getParameter(s.UNPACK_SKIP_ROWS);s.pixelStorei(s.UNPACK_ROW_LENGTH,T.width);for(let $=0,ne=q.length;$<ne;$++){const be=q[$],ge=Math.floor(be.start/4),ce=Math.ceil(be.count/4),Re=ge%T.width,U=Math.floor(ge/T.width),re=ce,he=1;s.pixelStorei(s.UNPACK_SKIP_PIXELS,Re),s.pixelStorei(s.UNPACK_SKIP_ROWS,U),t.texSubImage2D(s.TEXTURE_2D,0,Re,U,re,he,H,Y,T.data)}P.clearUpdateRanges(),s.pixelStorei(s.UNPACK_ROW_LENGTH,oe),s.pixelStorei(s.UNPACK_SKIP_PIXELS,j),s.pixelStorei(s.UNPACK_SKIP_ROWS,le)}}function K(P,T,H){let Y=s.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(Y=s.TEXTURE_2D_ARRAY),T.isData3DTexture&&(Y=s.TEXTURE_3D);const te=nt(P,T),q=T.source;t.bindTexture(Y,P.__webglTexture,s.TEXTURE0+H);const Ee=n.get(q);if(q.version!==Ee.__version||te===!0){t.activeTexture(s.TEXTURE0+H);const oe=et.getPrimaries(et.workingColorSpace),j=T.colorSpace===Jn?null:et.getPrimaries(T.colorSpace),le=T.colorSpace===Jn||oe===j?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,T.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,T.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,le);let $=d(T.image,!1,i.maxTextureSize);$=bt(T,$);const ne=r.convert(T.format,T.colorSpace),be=r.convert(T.type);let ge=M(T.internalFormat,ne,be,T.colorSpace,T.isVideoTexture);Ne(Y,T);let ce;const Re=T.mipmaps,U=T.isVideoTexture!==!0,re=Ee.__version===void 0||te===!0,he=q.dataReady,_e=y(T,$);if(T.isDepthTexture)ge=_(T.format===er,T.type),re&&(U?t.texStorage2D(s.TEXTURE_2D,1,ge,$.width,$.height):t.texImage2D(s.TEXTURE_2D,0,ge,$.width,$.height,0,ne,be,null));else if(T.isDataTexture)if(Re.length>0){U&&re&&t.texStorage2D(s.TEXTURE_2D,_e,ge,Re[0].width,Re[0].height);for(let ie=0,Z=Re.length;ie<Z;ie++)ce=Re[ie],U?he&&t.texSubImage2D(s.TEXTURE_2D,ie,0,0,ce.width,ce.height,ne,be,ce.data):t.texImage2D(s.TEXTURE_2D,ie,ge,ce.width,ce.height,0,ne,be,ce.data);T.generateMipmaps=!1}else U?(re&&t.texStorage2D(s.TEXTURE_2D,_e,ge,$.width,$.height),he&&Qe(T,$,ne,be)):t.texImage2D(s.TEXTURE_2D,0,ge,$.width,$.height,0,ne,be,$.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){U&&re&&t.texStorage3D(s.TEXTURE_2D_ARRAY,_e,ge,Re[0].width,Re[0].height,$.depth);for(let ie=0,Z=Re.length;ie<Z;ie++)if(ce=Re[ie],T.format!==ln)if(ne!==null)if(U){if(he)if(T.layerUpdates.size>0){const we=Kl(ce.width,ce.height,T.format,T.type);for(const Be of T.layerUpdates){const mt=ce.data.subarray(Be*we/ce.data.BYTES_PER_ELEMENT,(Be+1)*we/ce.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,ie,0,0,Be,ce.width,ce.height,1,ne,mt)}T.clearLayerUpdates()}else t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,ie,0,0,0,ce.width,ce.height,$.depth,ne,ce.data)}else t.compressedTexImage3D(s.TEXTURE_2D_ARRAY,ie,ge,ce.width,ce.height,$.depth,0,ce.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else U?he&&t.texSubImage3D(s.TEXTURE_2D_ARRAY,ie,0,0,0,ce.width,ce.height,$.depth,ne,be,ce.data):t.texImage3D(s.TEXTURE_2D_ARRAY,ie,ge,ce.width,ce.height,$.depth,0,ne,be,ce.data)}else{U&&re&&t.texStorage2D(s.TEXTURE_2D,_e,ge,Re[0].width,Re[0].height);for(let ie=0,Z=Re.length;ie<Z;ie++)ce=Re[ie],T.format!==ln?ne!==null?U?he&&t.compressedTexSubImage2D(s.TEXTURE_2D,ie,0,0,ce.width,ce.height,ne,ce.data):t.compressedTexImage2D(s.TEXTURE_2D,ie,ge,ce.width,ce.height,0,ce.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):U?he&&t.texSubImage2D(s.TEXTURE_2D,ie,0,0,ce.width,ce.height,ne,be,ce.data):t.texImage2D(s.TEXTURE_2D,ie,ge,ce.width,ce.height,0,ne,be,ce.data)}else if(T.isDataArrayTexture)if(U){if(re&&t.texStorage3D(s.TEXTURE_2D_ARRAY,_e,ge,$.width,$.height,$.depth),he)if(T.layerUpdates.size>0){const ie=Kl($.width,$.height,T.format,T.type);for(const Z of T.layerUpdates){const we=$.data.subarray(Z*ie/$.data.BYTES_PER_ELEMENT,(Z+1)*ie/$.data.BYTES_PER_ELEMENT);t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,Z,$.width,$.height,1,ne,be,we)}T.clearLayerUpdates()}else t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,$.width,$.height,$.depth,ne,be,$.data)}else t.texImage3D(s.TEXTURE_2D_ARRAY,0,ge,$.width,$.height,$.depth,0,ne,be,$.data);else if(T.isData3DTexture)U?(re&&t.texStorage3D(s.TEXTURE_3D,_e,ge,$.width,$.height,$.depth),he&&t.texSubImage3D(s.TEXTURE_3D,0,0,0,0,$.width,$.height,$.depth,ne,be,$.data)):t.texImage3D(s.TEXTURE_3D,0,ge,$.width,$.height,$.depth,0,ne,be,$.data);else if(T.isFramebufferTexture){if(re)if(U)t.texStorage2D(s.TEXTURE_2D,_e,ge,$.width,$.height);else{let ie=$.width,Z=$.height;for(let we=0;we<_e;we++)t.texImage2D(s.TEXTURE_2D,we,ge,ie,Z,0,ne,be,null),ie>>=1,Z>>=1}}else if(Re.length>0){if(U&&re){const ie=St(Re[0]);t.texStorage2D(s.TEXTURE_2D,_e,ge,ie.width,ie.height)}for(let ie=0,Z=Re.length;ie<Z;ie++)ce=Re[ie],U?he&&t.texSubImage2D(s.TEXTURE_2D,ie,0,0,ne,be,ce):t.texImage2D(s.TEXTURE_2D,ie,ge,ne,be,ce);T.generateMipmaps=!1}else if(U){if(re){const ie=St($);t.texStorage2D(s.TEXTURE_2D,_e,ge,ie.width,ie.height)}he&&t.texSubImage2D(s.TEXTURE_2D,0,0,0,ne,be,$)}else t.texImage2D(s.TEXTURE_2D,0,ge,ne,be,$);g(T)&&p(Y),Ee.__version=q.version,T.onUpdate&&T.onUpdate(T)}P.__version=T.version}function ee(P,T,H){if(T.image.length!==6)return;const Y=nt(P,T),te=T.source;t.bindTexture(s.TEXTURE_CUBE_MAP,P.__webglTexture,s.TEXTURE0+H);const q=n.get(te);if(te.version!==q.__version||Y===!0){t.activeTexture(s.TEXTURE0+H);const Ee=et.getPrimaries(et.workingColorSpace),oe=T.colorSpace===Jn?null:et.getPrimaries(T.colorSpace),j=T.colorSpace===Jn||Ee===oe?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,T.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,T.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,j);const le=T.isCompressedTexture||T.image[0].isCompressedTexture,$=T.image[0]&&T.image[0].isDataTexture,ne=[];for(let Z=0;Z<6;Z++)!le&&!$?ne[Z]=d(T.image[Z],!0,i.maxCubemapSize):ne[Z]=$?T.image[Z].image:T.image[Z],ne[Z]=bt(T,ne[Z]);const be=ne[0],ge=r.convert(T.format,T.colorSpace),ce=r.convert(T.type),Re=M(T.internalFormat,ge,ce,T.colorSpace),U=T.isVideoTexture!==!0,re=q.__version===void 0||Y===!0,he=te.dataReady;let _e=y(T,be);Ne(s.TEXTURE_CUBE_MAP,T);let ie;if(le){U&&re&&t.texStorage2D(s.TEXTURE_CUBE_MAP,_e,Re,be.width,be.height);for(let Z=0;Z<6;Z++){ie=ne[Z].mipmaps;for(let we=0;we<ie.length;we++){const Be=ie[we];T.format!==ln?ge!==null?U?he&&t.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,we,0,0,Be.width,Be.height,ge,Be.data):t.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,we,Re,Be.width,Be.height,0,Be.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):U?he&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,we,0,0,Be.width,Be.height,ge,ce,Be.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,we,Re,Be.width,Be.height,0,ge,ce,Be.data)}}}else{if(ie=T.mipmaps,U&&re){ie.length>0&&_e++;const Z=St(ne[0]);t.texStorage2D(s.TEXTURE_CUBE_MAP,_e,Re,Z.width,Z.height)}for(let Z=0;Z<6;Z++)if($){U?he&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,ne[Z].width,ne[Z].height,ge,ce,ne[Z].data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,Re,ne[Z].width,ne[Z].height,0,ge,ce,ne[Z].data);for(let we=0;we<ie.length;we++){const mt=ie[we].image[Z].image;U?he&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,we+1,0,0,mt.width,mt.height,ge,ce,mt.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,we+1,Re,mt.width,mt.height,0,ge,ce,mt.data)}}else{U?he&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,0,0,ge,ce,ne[Z]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0,Re,ge,ce,ne[Z]);for(let we=0;we<ie.length;we++){const Be=ie[we];U?he&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,we+1,0,0,ge,ce,Be.image[Z]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+Z,we+1,Re,ge,ce,Be.image[Z])}}}g(T)&&p(s.TEXTURE_CUBE_MAP),q.__version=te.version,T.onUpdate&&T.onUpdate(T)}P.__version=T.version}function me(P,T,H,Y,te,q){const Ee=r.convert(H.format,H.colorSpace),oe=r.convert(H.type),j=M(H.internalFormat,Ee,oe,H.colorSpace),le=n.get(T),$=n.get(H);if($.__renderTarget=T,!le.__hasExternalTextures){const ne=Math.max(1,T.width>>q),be=Math.max(1,T.height>>q);te===s.TEXTURE_3D||te===s.TEXTURE_2D_ARRAY?t.texImage3D(te,q,j,ne,be,T.depth,0,Ee,oe,null):t.texImage2D(te,q,j,ne,be,0,Ee,oe,null)}t.bindFramebuffer(s.FRAMEBUFFER,P),ye(T)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,Y,te,$.__webglTexture,0,pt(T)):(te===s.TEXTURE_2D||te>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&te<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,Y,te,$.__webglTexture,q),t.bindFramebuffer(s.FRAMEBUFFER,null)}function De(P,T,H){if(s.bindRenderbuffer(s.RENDERBUFFER,P),T.depthBuffer){const Y=T.depthTexture,te=Y&&Y.isDepthTexture?Y.type:null,q=_(T.stencilBuffer,te),Ee=T.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,oe=pt(T);ye(T)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,oe,q,T.width,T.height):H?s.renderbufferStorageMultisample(s.RENDERBUFFER,oe,q,T.width,T.height):s.renderbufferStorage(s.RENDERBUFFER,q,T.width,T.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,Ee,s.RENDERBUFFER,P)}else{const Y=T.textures;for(let te=0;te<Y.length;te++){const q=Y[te],Ee=r.convert(q.format,q.colorSpace),oe=r.convert(q.type),j=M(q.internalFormat,Ee,oe,q.colorSpace),le=pt(T);H&&ye(T)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,le,j,T.width,T.height):ye(T)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,le,j,T.width,T.height):s.renderbufferStorage(s.RENDERBUFFER,j,T.width,T.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function Te(P,T){if(T&&T.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(s.FRAMEBUFFER,P),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const Y=n.get(T.depthTexture);Y.__renderTarget=T,(!Y.__webglTexture||T.depthTexture.image.width!==T.width||T.depthTexture.image.height!==T.height)&&(T.depthTexture.image.width=T.width,T.depthTexture.image.height=T.height,T.depthTexture.needsUpdate=!0),B(T.depthTexture,0);const te=Y.__webglTexture,q=pt(T);if(T.depthTexture.format===Qs)ye(T)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,te,0,q):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,te,0);else if(T.depthTexture.format===er)ye(T)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,te,0,q):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,te,0);else throw new Error("Unknown depthTexture format")}function Ye(P){const T=n.get(P),H=P.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==P.depthTexture){const Y=P.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),Y){const te=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,Y.removeEventListener("dispose",te)};Y.addEventListener("dispose",te),T.__depthDisposeCallback=te}T.__boundDepthTexture=Y}if(P.depthTexture&&!T.__autoAllocateDepthBuffer){if(H)throw new Error("target.depthTexture not supported in Cube render targets");const Y=P.texture.mipmaps;Y&&Y.length>0?Te(T.__webglFramebuffer[0],P):Te(T.__webglFramebuffer,P)}else if(H){T.__webglDepthbuffer=[];for(let Y=0;Y<6;Y++)if(t.bindFramebuffer(s.FRAMEBUFFER,T.__webglFramebuffer[Y]),T.__webglDepthbuffer[Y]===void 0)T.__webglDepthbuffer[Y]=s.createRenderbuffer(),De(T.__webglDepthbuffer[Y],P,!1);else{const te=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,q=T.__webglDepthbuffer[Y];s.bindRenderbuffer(s.RENDERBUFFER,q),s.framebufferRenderbuffer(s.FRAMEBUFFER,te,s.RENDERBUFFER,q)}}else{const Y=P.texture.mipmaps;if(Y&&Y.length>0?t.bindFramebuffer(s.FRAMEBUFFER,T.__webglFramebuffer[0]):t.bindFramebuffer(s.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=s.createRenderbuffer(),De(T.__webglDepthbuffer,P,!1);else{const te=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,q=T.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,q),s.framebufferRenderbuffer(s.FRAMEBUFFER,te,s.RENDERBUFFER,q)}}t.bindFramebuffer(s.FRAMEBUFFER,null)}function _t(P,T,H){const Y=n.get(P);T!==void 0&&me(Y.__webglFramebuffer,P,P.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),H!==void 0&&Ye(P)}function I(P){const T=P.texture,H=n.get(P),Y=n.get(T);P.addEventListener("dispose",A);const te=P.textures,q=P.isWebGLCubeRenderTarget===!0,Ee=te.length>1;if(Ee||(Y.__webglTexture===void 0&&(Y.__webglTexture=s.createTexture()),Y.__version=T.version,o.memory.textures++),q){H.__webglFramebuffer=[];for(let oe=0;oe<6;oe++)if(T.mipmaps&&T.mipmaps.length>0){H.__webglFramebuffer[oe]=[];for(let j=0;j<T.mipmaps.length;j++)H.__webglFramebuffer[oe][j]=s.createFramebuffer()}else H.__webglFramebuffer[oe]=s.createFramebuffer()}else{if(T.mipmaps&&T.mipmaps.length>0){H.__webglFramebuffer=[];for(let oe=0;oe<T.mipmaps.length;oe++)H.__webglFramebuffer[oe]=s.createFramebuffer()}else H.__webglFramebuffer=s.createFramebuffer();if(Ee)for(let oe=0,j=te.length;oe<j;oe++){const le=n.get(te[oe]);le.__webglTexture===void 0&&(le.__webglTexture=s.createTexture(),o.memory.textures++)}if(P.samples>0&&ye(P)===!1){H.__webglMultisampledFramebuffer=s.createFramebuffer(),H.__webglColorRenderbuffer=[],t.bindFramebuffer(s.FRAMEBUFFER,H.__webglMultisampledFramebuffer);for(let oe=0;oe<te.length;oe++){const j=te[oe];H.__webglColorRenderbuffer[oe]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,H.__webglColorRenderbuffer[oe]);const le=r.convert(j.format,j.colorSpace),$=r.convert(j.type),ne=M(j.internalFormat,le,$,j.colorSpace,P.isXRRenderTarget===!0),be=pt(P);s.renderbufferStorageMultisample(s.RENDERBUFFER,be,ne,P.width,P.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+oe,s.RENDERBUFFER,H.__webglColorRenderbuffer[oe])}s.bindRenderbuffer(s.RENDERBUFFER,null),P.depthBuffer&&(H.__webglDepthRenderbuffer=s.createRenderbuffer(),De(H.__webglDepthRenderbuffer,P,!0)),t.bindFramebuffer(s.FRAMEBUFFER,null)}}if(q){t.bindTexture(s.TEXTURE_CUBE_MAP,Y.__webglTexture),Ne(s.TEXTURE_CUBE_MAP,T);for(let oe=0;oe<6;oe++)if(T.mipmaps&&T.mipmaps.length>0)for(let j=0;j<T.mipmaps.length;j++)me(H.__webglFramebuffer[oe][j],P,T,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+oe,j);else me(H.__webglFramebuffer[oe],P,T,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+oe,0);g(T)&&p(s.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ee){for(let oe=0,j=te.length;oe<j;oe++){const le=te[oe],$=n.get(le);let ne=s.TEXTURE_2D;(P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(ne=P.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(ne,$.__webglTexture),Ne(ne,le),me(H.__webglFramebuffer,P,le,s.COLOR_ATTACHMENT0+oe,ne,0),g(le)&&p(ne)}t.unbindTexture()}else{let oe=s.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(oe=P.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(oe,Y.__webglTexture),Ne(oe,T),T.mipmaps&&T.mipmaps.length>0)for(let j=0;j<T.mipmaps.length;j++)me(H.__webglFramebuffer[j],P,T,s.COLOR_ATTACHMENT0,oe,j);else me(H.__webglFramebuffer,P,T,s.COLOR_ATTACHMENT0,oe,0);g(T)&&p(oe),t.unbindTexture()}P.depthBuffer&&Ye(P)}function dt(P){const T=P.textures;for(let H=0,Y=T.length;H<Y;H++){const te=T[H];if(g(te)){const q=v(P),Ee=n.get(te).__webglTexture;t.bindTexture(q,Ee),p(q),t.unbindTexture()}}}const ze=[],Ie=[];function Me(P){if(P.samples>0){if(ye(P)===!1){const T=P.textures,H=P.width,Y=P.height;let te=s.COLOR_BUFFER_BIT;const q=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Ee=n.get(P),oe=T.length>1;if(oe)for(let le=0;le<T.length;le++)t.bindFramebuffer(s.FRAMEBUFFER,Ee.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+le,s.RENDERBUFFER,null),t.bindFramebuffer(s.FRAMEBUFFER,Ee.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+le,s.TEXTURE_2D,null,0);t.bindFramebuffer(s.READ_FRAMEBUFFER,Ee.__webglMultisampledFramebuffer);const j=P.texture.mipmaps;j&&j.length>0?t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Ee.__webglFramebuffer[0]):t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Ee.__webglFramebuffer);for(let le=0;le<T.length;le++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(te|=s.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(te|=s.STENCIL_BUFFER_BIT)),oe){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,Ee.__webglColorRenderbuffer[le]);const $=n.get(T[le]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,$,0)}s.blitFramebuffer(0,0,H,Y,0,0,H,Y,te,s.NEAREST),c===!0&&(ze.length=0,Ie.length=0,ze.push(s.COLOR_ATTACHMENT0+le),P.depthBuffer&&P.resolveDepthBuffer===!1&&(ze.push(q),Ie.push(q),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,Ie)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,ze))}if(t.bindFramebuffer(s.READ_FRAMEBUFFER,null),t.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),oe)for(let le=0;le<T.length;le++){t.bindFramebuffer(s.FRAMEBUFFER,Ee.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+le,s.RENDERBUFFER,Ee.__webglColorRenderbuffer[le]);const $=n.get(T[le]).__webglTexture;t.bindFramebuffer(s.FRAMEBUFFER,Ee.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+le,s.TEXTURE_2D,$,0)}t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Ee.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.resolveDepthBuffer===!1&&c){const T=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[T])}}}function pt(P){return Math.min(i.maxSamples,P.samples)}function ye(P){const T=n.get(P);return P.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function ke(P){const T=o.render.frame;h.get(P)!==T&&(h.set(P,T),P.update())}function bt(P,T){const H=P.colorSpace,Y=P.format,te=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||H!==en&&H!==Jn&&(et.getTransfer(H)===ht?(Y!==ln||te!==Bn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",H)),T}function St(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(l.width=P.naturalWidth||P.width,l.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(l.width=P.displayWidth,l.height=P.displayHeight):(l.width=P.width,l.height=P.height),l}this.allocateTextureUnit=N,this.resetTextureUnits=L,this.setTexture2D=B,this.setTexture2DArray=V,this.setTexture3D=X,this.setTextureCube=k,this.rebindTextures=_t,this.setupRenderTarget=I,this.updateRenderTargetMipmap=dt,this.updateMultisampleRenderTarget=Me,this.setupDepthRenderbuffer=Ye,this.setupFrameBufferTexture=me,this.useMultisampledRTT=ye}function ov(s,e){function t(n,i=Jn){let r;const o=et.getTransfer(i);if(n===Bn)return s.UNSIGNED_BYTE;if(n===gc)return s.UNSIGNED_SHORT_4_4_4_4;if(n===xc)return s.UNSIGNED_SHORT_5_5_5_1;if(n===Zh)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===Jh)return s.UNSIGNED_INT_10F_11F_11F_REV;if(n===Kh)return s.BYTE;if(n===$h)return s.SHORT;if(n===Zs)return s.UNSIGNED_SHORT;if(n===mc)return s.INT;if(n===Mi)return s.UNSIGNED_INT;if(n===En)return s.FLOAT;if(n===si)return s.HALF_FLOAT;if(n===Qh)return s.ALPHA;if(n===eu)return s.RGB;if(n===ln)return s.RGBA;if(n===Qs)return s.DEPTH_COMPONENT;if(n===er)return s.DEPTH_STENCIL;if(n===vc)return s.RED;if(n===_c)return s.RED_INTEGER;if(n===tu)return s.RG;if(n===Mc)return s.RG_INTEGER;if(n===yc)return s.RGBA_INTEGER;if(n===Wr||n===Xr||n===qr||n===Yr)if(o===ht)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Wr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Xr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===qr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Yr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Wr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Xr)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===qr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Yr)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Aa||n===Ra||n===Ca||n===Pa)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Aa)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Ra)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Ca)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Pa)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Da||n===Ia||n===La)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Da||n===Ia)return o===ht?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===La)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===Ua||n===Na||n===Fa||n===za||n===Oa||n===ka||n===Ba||n===Ha||n===Va||n===Ga||n===Wa||n===Xa||n===qa||n===Ya)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Ua)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Na)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Fa)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===za)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Oa)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===ka)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Ba)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Ha)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Va)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Ga)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Wa)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Xa)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===qa)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Ya)return o===ht?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===ja||n===Ka||n===$a)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===ja)return o===ht?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Ka)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===$a)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Za||n===Ja||n===Qa||n===ec)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===Za)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Ja)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Qa)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===ec)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Js?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:t}}const av=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,cv=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class lv{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new mu(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new Yt({vertexShader:av,fragmentShader:cv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Je(new Hn(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class hv extends Ss{constructor(e,t){super();const n=this;let i=null,r=1,o=null,a="local-floor",c=1,l=null,h=null,u=null,f=null,m=null,x=null;const d=typeof XRWebGLBinding<"u",g=new lv,p={},v=t.getContextAttributes();let M=null,_=null;const y=[],S=[],A=new fe;let C=null;const b=new qt;b.viewport=new tt;const w=new qt;w.viewport=new tt;const D=[b,w],L=new Sp;let N=null,F=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let ee=y[K];return ee===void 0&&(ee=new Go,y[K]=ee),ee.getTargetRaySpace()},this.getControllerGrip=function(K){let ee=y[K];return ee===void 0&&(ee=new Go,y[K]=ee),ee.getGripSpace()},this.getHand=function(K){let ee=y[K];return ee===void 0&&(ee=new Go,y[K]=ee),ee.getHandSpace()};function B(K){const ee=S.indexOf(K.inputSource);if(ee===-1)return;const me=y[ee];me!==void 0&&(me.update(K.inputSource,K.frame,l||o),me.dispatchEvent({type:K.type,data:K.inputSource}))}function V(){i.removeEventListener("select",B),i.removeEventListener("selectstart",B),i.removeEventListener("selectend",B),i.removeEventListener("squeeze",B),i.removeEventListener("squeezestart",B),i.removeEventListener("squeezeend",B),i.removeEventListener("end",V),i.removeEventListener("inputsourceschange",X);for(let K=0;K<y.length;K++){const ee=S[K];ee!==null&&(S[K]=null,y[K].disconnect(ee))}N=null,F=null,g.reset();for(const K in p)delete p[K];e.setRenderTarget(M),m=null,f=null,u=null,i=null,_=null,Qe.stop(),n.isPresenting=!1,e.setPixelRatio(C),e.setSize(A.width,A.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){r=K,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){a=K,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(K){l=K},this.getBaseLayer=function(){return f!==null?f:m},this.getBinding=function(){return u===null&&d&&(u=new XRWebGLBinding(i,t)),u},this.getFrame=function(){return x},this.getSession=function(){return i},this.setSession=async function(K){if(i=K,i!==null){if(M=e.getRenderTarget(),i.addEventListener("select",B),i.addEventListener("selectstart",B),i.addEventListener("selectend",B),i.addEventListener("squeeze",B),i.addEventListener("squeezestart",B),i.addEventListener("squeezeend",B),i.addEventListener("end",V),i.addEventListener("inputsourceschange",X),v.xrCompatible!==!0&&await t.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(A),d&&"createProjectionLayer"in XRWebGLBinding.prototype){let me=null,De=null,Te=null;v.depth&&(Te=v.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,me=v.stencil?er:Qs,De=v.stencil?Js:Mi);const Ye={colorFormat:t.RGBA8,depthFormat:Te,scaleFactor:r};u=this.getBinding(),f=u.createProjectionLayer(Ye),i.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),_=new Cn(f.textureWidth,f.textureHeight,{format:ln,type:Bn,depthTexture:new Ic(f.textureWidth,f.textureHeight,De,void 0,void 0,void 0,void 0,void 0,void 0,me),stencilBuffer:v.stencil,colorSpace:e.outputColorSpace,samples:v.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}else{const me={antialias:v.antialias,alpha:!0,depth:v.depth,stencil:v.stencil,framebufferScaleFactor:r};m=new XRWebGLLayer(i,t,me),i.updateRenderState({baseLayer:m}),e.setPixelRatio(1),e.setSize(m.framebufferWidth,m.framebufferHeight,!1),_=new Cn(m.framebufferWidth,m.framebufferHeight,{format:ln,type:Bn,colorSpace:e.outputColorSpace,stencilBuffer:v.stencil,resolveDepthBuffer:m.ignoreDepthValues===!1,resolveStencilBuffer:m.ignoreDepthValues===!1})}_.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await i.requestReferenceSpace(a),Qe.setContext(i),Qe.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function X(K){for(let ee=0;ee<K.removed.length;ee++){const me=K.removed[ee],De=S.indexOf(me);De>=0&&(S[De]=null,y[De].disconnect(me))}for(let ee=0;ee<K.added.length;ee++){const me=K.added[ee];let De=S.indexOf(me);if(De===-1){for(let Ye=0;Ye<y.length;Ye++)if(Ye>=S.length){S.push(me),De=Ye;break}else if(S[Ye]===null){S[Ye]=me,De=Ye;break}if(De===-1)break}const Te=y[De];Te&&Te.connect(me)}}const k=new R,Q=new R;function ae(K,ee,me){k.setFromMatrixPosition(ee.matrixWorld),Q.setFromMatrixPosition(me.matrixWorld);const De=k.distanceTo(Q),Te=ee.projectionMatrix.elements,Ye=me.projectionMatrix.elements,_t=Te[14]/(Te[10]-1),I=Te[14]/(Te[10]+1),dt=(Te[9]+1)/Te[5],ze=(Te[9]-1)/Te[5],Ie=(Te[8]-1)/Te[0],Me=(Ye[8]+1)/Ye[0],pt=_t*Ie,ye=_t*Me,ke=De/(-Ie+Me),bt=ke*-Ie;if(ee.matrixWorld.decompose(K.position,K.quaternion,K.scale),K.translateX(bt),K.translateZ(ke),K.matrixWorld.compose(K.position,K.quaternion,K.scale),K.matrixWorldInverse.copy(K.matrixWorld).invert(),Te[10]===-1)K.projectionMatrix.copy(ee.projectionMatrix),K.projectionMatrixInverse.copy(ee.projectionMatrixInverse);else{const St=_t+ke,P=I+ke,T=pt-bt,H=ye+(De-bt),Y=dt*I/P*St,te=ze*I/P*St;K.projectionMatrix.makePerspective(T,H,Y,te,St,P),K.projectionMatrixInverse.copy(K.projectionMatrix).invert()}}function pe(K,ee){ee===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(ee.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(i===null)return;let ee=K.near,me=K.far;g.texture!==null&&(g.depthNear>0&&(ee=g.depthNear),g.depthFar>0&&(me=g.depthFar)),L.near=w.near=b.near=ee,L.far=w.far=b.far=me,(N!==L.near||F!==L.far)&&(i.updateRenderState({depthNear:L.near,depthFar:L.far}),N=L.near,F=L.far),L.layers.mask=K.layers.mask|6,b.layers.mask=L.layers.mask&3,w.layers.mask=L.layers.mask&5;const De=K.parent,Te=L.cameras;pe(L,De);for(let Ye=0;Ye<Te.length;Ye++)pe(Te[Ye],De);Te.length===2?ae(L,b,w):L.projectionMatrix.copy(b.projectionMatrix),Ne(K,L,De)};function Ne(K,ee,me){me===null?K.matrix.copy(ee.matrixWorld):(K.matrix.copy(me.matrixWorld),K.matrix.invert(),K.matrix.multiply(ee.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(ee.projectionMatrix),K.projectionMatrixInverse.copy(ee.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=ms*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return L},this.getFoveation=function(){if(!(f===null&&m===null))return c},this.setFoveation=function(K){c=K,f!==null&&(f.fixedFoveation=K),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=K)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(L)},this.getCameraTexture=function(K){return p[K]};let nt=null;function st(K,ee){if(h=ee.getViewerPose(l||o),x=ee,h!==null){const me=h.views;m!==null&&(e.setRenderTargetFramebuffer(_,m.framebuffer),e.setRenderTarget(_));let De=!1;me.length!==L.cameras.length&&(L.cameras.length=0,De=!0);for(let I=0;I<me.length;I++){const dt=me[I];let ze=null;if(m!==null)ze=m.getViewport(dt);else{const Me=u.getViewSubImage(f,dt);ze=Me.viewport,I===0&&(e.setRenderTargetTextures(_,Me.colorTexture,Me.depthStencilTexture),e.setRenderTarget(_))}let Ie=D[I];Ie===void 0&&(Ie=new qt,Ie.layers.enable(I),Ie.viewport=new tt,D[I]=Ie),Ie.matrix.fromArray(dt.transform.matrix),Ie.matrix.decompose(Ie.position,Ie.quaternion,Ie.scale),Ie.projectionMatrix.fromArray(dt.projectionMatrix),Ie.projectionMatrixInverse.copy(Ie.projectionMatrix).invert(),Ie.viewport.set(ze.x,ze.y,ze.width,ze.height),I===0&&(L.matrix.copy(Ie.matrix),L.matrix.decompose(L.position,L.quaternion,L.scale)),De===!0&&L.cameras.push(Ie)}const Te=i.enabledFeatures;if(Te&&Te.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&d){u=n.getBinding();const I=u.getDepthInformation(me[0]);I&&I.isValid&&I.texture&&g.init(I,i.renderState)}if(Te&&Te.includes("camera-access")&&d){e.state.unbindTexture(),u=n.getBinding();for(let I=0;I<me.length;I++){const dt=me[I].camera;if(dt){let ze=p[dt];ze||(ze=new mu,p[dt]=ze);const Ie=u.getCameraImage(dt);ze.sourceTexture=Ie}}}}for(let me=0;me<y.length;me++){const De=S[me],Te=y[me];De!==null&&Te!==void 0&&Te.update(De,ee,l||o)}nt&&nt(K,ee),ee.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ee}),x=null}const Qe=new wu;Qe.setAnimationLoop(st),this.setAnimationLoop=function(K){nt=K},this.dispose=function(){}}}const Ci=new gn,uv=new Oe;function fv(s,e){function t(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function n(g,p){p.color.getRGB(g.fogColor.value,lu(s)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function i(g,p,v,M,_){p.isMeshBasicMaterial||p.isMeshLambertMaterial?r(g,p):p.isMeshToonMaterial?(r(g,p),u(g,p)):p.isMeshPhongMaterial?(r(g,p),h(g,p)):p.isMeshStandardMaterial?(r(g,p),f(g,p),p.isMeshPhysicalMaterial&&m(g,p,_)):p.isMeshMatcapMaterial?(r(g,p),x(g,p)):p.isMeshDepthMaterial?r(g,p):p.isMeshDistanceMaterial?(r(g,p),d(g,p)):p.isMeshNormalMaterial?r(g,p):p.isLineBasicMaterial?(o(g,p),p.isLineDashedMaterial&&a(g,p)):p.isPointsMaterial?c(g,p,v,M):p.isSpriteMaterial?l(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,t(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===Ht&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,t(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===Ht&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,t(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,t(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);const v=e.get(p),M=v.envMap,_=v.envMapRotation;M&&(g.envMap.value=M,Ci.copy(_),Ci.x*=-1,Ci.y*=-1,Ci.z*=-1,M.isCubeTexture&&M.isRenderTargetTexture===!1&&(Ci.y*=-1,Ci.z*=-1),g.envMapRotation.value.setFromMatrix4(uv.makeRotationFromEuler(Ci)),g.flipEnvMap.value=M.isCubeTexture&&M.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,g.aoMapTransform))}function o(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform))}function a(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function c(g,p,v,M){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*v,g.scale.value=M*.5,p.map&&(g.map.value=p.map,t(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function l(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function h(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function u(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function f(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function m(g,p,v){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Ht&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=v.texture,g.transmissionSamplerSize.value.set(v.width,v.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,g.specularIntensityMapTransform))}function x(g,p){p.matcap&&(g.matcap.value=p.matcap)}function d(g,p){const v=e.get(p).light;g.referencePosition.value.setFromMatrixPosition(v.matrixWorld),g.nearDistance.value=v.shadow.camera.near,g.farDistance.value=v.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function dv(s,e,t,n){let i={},r={},o=[];const a=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function c(v,M){const _=M.program;n.uniformBlockBinding(v,_)}function l(v,M){let _=i[v.id];_===void 0&&(x(v),_=h(v),i[v.id]=_,v.addEventListener("dispose",g));const y=M.program;n.updateUBOMapping(v,y);const S=e.render.frame;r[v.id]!==S&&(f(v),r[v.id]=S)}function h(v){const M=u();v.__bindingPointIndex=M;const _=s.createBuffer(),y=v.__size,S=v.usage;return s.bindBuffer(s.UNIFORM_BUFFER,_),s.bufferData(s.UNIFORM_BUFFER,y,S),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,M,_),_}function u(){for(let v=0;v<a;v++)if(o.indexOf(v)===-1)return o.push(v),v;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(v){const M=i[v.id],_=v.uniforms,y=v.__cache;s.bindBuffer(s.UNIFORM_BUFFER,M);for(let S=0,A=_.length;S<A;S++){const C=Array.isArray(_[S])?_[S]:[_[S]];for(let b=0,w=C.length;b<w;b++){const D=C[b];if(m(D,S,b,y)===!0){const L=D.__offset,N=Array.isArray(D.value)?D.value:[D.value];let F=0;for(let B=0;B<N.length;B++){const V=N[B],X=d(V);typeof V=="number"||typeof V=="boolean"?(D.__data[0]=V,s.bufferSubData(s.UNIFORM_BUFFER,L+F,D.__data)):V.isMatrix3?(D.__data[0]=V.elements[0],D.__data[1]=V.elements[1],D.__data[2]=V.elements[2],D.__data[3]=0,D.__data[4]=V.elements[3],D.__data[5]=V.elements[4],D.__data[6]=V.elements[5],D.__data[7]=0,D.__data[8]=V.elements[6],D.__data[9]=V.elements[7],D.__data[10]=V.elements[8],D.__data[11]=0):(V.toArray(D.__data,F),F+=X.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,L,D.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function m(v,M,_,y){const S=v.value,A=M+"_"+_;if(y[A]===void 0)return typeof S=="number"||typeof S=="boolean"?y[A]=S:y[A]=S.clone(),!0;{const C=y[A];if(typeof S=="number"||typeof S=="boolean"){if(C!==S)return y[A]=S,!0}else if(C.equals(S)===!1)return C.copy(S),!0}return!1}function x(v){const M=v.uniforms;let _=0;const y=16;for(let A=0,C=M.length;A<C;A++){const b=Array.isArray(M[A])?M[A]:[M[A]];for(let w=0,D=b.length;w<D;w++){const L=b[w],N=Array.isArray(L.value)?L.value:[L.value];for(let F=0,B=N.length;F<B;F++){const V=N[F],X=d(V),k=_%y,Q=k%X.boundary,ae=k+Q;_+=Q,ae!==0&&y-ae<X.storage&&(_+=y-ae),L.__data=new Float32Array(X.storage/Float32Array.BYTES_PER_ELEMENT),L.__offset=_,_+=X.storage}}}const S=_%y;return S>0&&(_+=y-S),v.__size=_,v.__cache={},this}function d(v){const M={boundary:0,storage:0};return typeof v=="number"||typeof v=="boolean"?(M.boundary=4,M.storage=4):v.isVector2?(M.boundary=8,M.storage=8):v.isVector3||v.isColor?(M.boundary=16,M.storage=12):v.isVector4?(M.boundary=16,M.storage=16):v.isMatrix3?(M.boundary=48,M.storage=48):v.isMatrix4?(M.boundary=64,M.storage=64):v.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",v),M}function g(v){const M=v.target;M.removeEventListener("dispose",g);const _=o.indexOf(M.__bindingPointIndex);o.splice(_,1),s.deleteBuffer(i[M.id]),delete i[M.id],delete r[M.id]}function p(){for(const v in i)s.deleteBuffer(i[v]);o=[],i={},r={}}return{bind:c,update:l,dispose:p}}class pv{constructor(e={}){const{canvas:t=id(),context:n=null,depth:i=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:f=!1}=e;this.isWebGLRenderer=!0;let m;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=n.getContextAttributes().alpha}else m=o;const x=new Uint32Array(4),d=new Int32Array(4);let g=null,p=null;const v=[],M=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=vi,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const _=this;let y=!1;this._outputColorSpace=Pt;let S=0,A=0,C=null,b=-1,w=null;const D=new tt,L=new tt;let N=null;const F=new xe(0);let B=0,V=t.width,X=t.height,k=1,Q=null,ae=null;const pe=new tt(0,0,V,X),Ne=new tt(0,0,V,X);let nt=!1;const st=new Cc;let Qe=!1,K=!1;const ee=new Oe,me=new R,De=new tt,Te={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ye=!1;function _t(){return C===null?k:1}let I=n;function dt(E,z){return t.getContext(E,z)}try{const E={alpha:!0,depth:i,stencil:r,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${pc}`),t.addEventListener("webglcontextlost",he,!1),t.addEventListener("webglcontextrestored",_e,!1),t.addEventListener("webglcontextcreationerror",ie,!1),I===null){const z="webgl2";if(I=dt(z,E),I===null)throw dt(z)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(E){throw console.error("THREE.WebGLRenderer: "+E.message),E}let ze,Ie,Me,pt,ye,ke,bt,St,P,T,H,Y,te,q,Ee,oe,j,le,$,ne,be,ge,ce,Re;function U(){ze=new wg(I),ze.init(),ge=new ov(I,ze),Ie=new xg(I,ze,e,ge),Me=new sv(I,ze),Ie.reversedDepthBuffer&&f&&Me.buffers.depth.setReversed(!0),pt=new Ag(I),ye=new Xx,ke=new rv(I,ze,Me,ye,Ie,ge,pt),bt=new _g(_),St=new bg(_),P=new Lp(I),ce=new mg(I,P),T=new Tg(I,P,pt,ce),H=new Cg(I,T,P,pt),$=new Rg(I,Ie,ke),oe=new vg(ye),Y=new Wx(_,bt,St,ze,Ie,ce,oe),te=new fv(_,ye),q=new Yx,Ee=new Qx(ze),le=new pg(_,bt,St,Me,H,m,c),j=new nv(_,H,Ie),Re=new dv(I,pt,Ie,Me),ne=new gg(I,ze,pt),be=new Eg(I,ze,pt),pt.programs=Y.programs,_.capabilities=Ie,_.extensions=ze,_.properties=ye,_.renderLists=q,_.shadowMap=j,_.state=Me,_.info=pt}U();const re=new hv(_,I);this.xr=re,this.getContext=function(){return I},this.getContextAttributes=function(){return I.getContextAttributes()},this.forceContextLoss=function(){const E=ze.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){const E=ze.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return k},this.setPixelRatio=function(E){E!==void 0&&(k=E,this.setSize(V,X,!1))},this.getSize=function(E){return E.set(V,X)},this.setSize=function(E,z,G=!0){if(re.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}V=E,X=z,t.width=Math.floor(E*k),t.height=Math.floor(z*k),G===!0&&(t.style.width=E+"px",t.style.height=z+"px"),this.setViewport(0,0,E,z)},this.getDrawingBufferSize=function(E){return E.set(V*k,X*k).floor()},this.setDrawingBufferSize=function(E,z,G){V=E,X=z,k=G,t.width=Math.floor(E*G),t.height=Math.floor(z*G),this.setViewport(0,0,E,z)},this.getCurrentViewport=function(E){return E.copy(D)},this.getViewport=function(E){return E.copy(pe)},this.setViewport=function(E,z,G,W){E.isVector4?pe.set(E.x,E.y,E.z,E.w):pe.set(E,z,G,W),Me.viewport(D.copy(pe).multiplyScalar(k).round())},this.getScissor=function(E){return E.copy(Ne)},this.setScissor=function(E,z,G,W){E.isVector4?Ne.set(E.x,E.y,E.z,E.w):Ne.set(E,z,G,W),Me.scissor(L.copy(Ne).multiplyScalar(k).round())},this.getScissorTest=function(){return nt},this.setScissorTest=function(E){Me.setScissorTest(nt=E)},this.setOpaqueSort=function(E){Q=E},this.setTransparentSort=function(E){ae=E},this.getClearColor=function(E){return E.copy(le.getClearColor())},this.setClearColor=function(){le.setClearColor(...arguments)},this.getClearAlpha=function(){return le.getClearAlpha()},this.setClearAlpha=function(){le.setClearAlpha(...arguments)},this.clear=function(E=!0,z=!0,G=!0){let W=0;if(E){let O=!1;if(C!==null){const se=C.texture.format;O=se===yc||se===Mc||se===_c}if(O){const se=C.texture.type,de=se===Bn||se===Mi||se===Zs||se===Js||se===gc||se===xc,Se=le.getClearColor(),ve=le.getClearAlpha(),Ue=Se.r,Fe=Se.g,Ce=Se.b;de?(x[0]=Ue,x[1]=Fe,x[2]=Ce,x[3]=ve,I.clearBufferuiv(I.COLOR,0,x)):(d[0]=Ue,d[1]=Fe,d[2]=Ce,d[3]=ve,I.clearBufferiv(I.COLOR,0,d))}else W|=I.COLOR_BUFFER_BIT}z&&(W|=I.DEPTH_BUFFER_BIT),G&&(W|=I.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),I.clear(W)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",he,!1),t.removeEventListener("webglcontextrestored",_e,!1),t.removeEventListener("webglcontextcreationerror",ie,!1),le.dispose(),q.dispose(),Ee.dispose(),ye.dispose(),bt.dispose(),St.dispose(),H.dispose(),ce.dispose(),Re.dispose(),Y.dispose(),re.dispose(),re.removeEventListener("sessionstart",Ln),re.removeEventListener("sessionend",$c),Si.stop()};function he(E){E.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),y=!0}function _e(){console.log("THREE.WebGLRenderer: Context Restored."),y=!1;const E=pt.autoReset,z=j.enabled,G=j.autoUpdate,W=j.needsUpdate,O=j.type;U(),pt.autoReset=E,j.enabled=z,j.autoUpdate=G,j.needsUpdate=W,j.type=O}function ie(E){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}function Z(E){const z=E.target;z.removeEventListener("dispose",Z),we(z)}function we(E){Be(E),ye.remove(E)}function Be(E){const z=ye.get(E).programs;z!==void 0&&(z.forEach(function(G){Y.releaseProgram(G)}),E.isShaderMaterial&&Y.releaseShaderCache(E))}this.renderBufferDirect=function(E,z,G,W,O,se){z===null&&(z=Te);const de=O.isMesh&&O.matrixWorld.determinant()<0,Se=qu(E,z,G,W,O);Me.setMaterial(W,de);let ve=G.index,Ue=1;if(W.wireframe===!0){if(ve=T.getWireframeAttribute(G),ve===void 0)return;Ue=2}const Fe=G.drawRange,Ce=G.attributes.position;let Ke=Fe.start*Ue,lt=(Fe.start+Fe.count)*Ue;se!==null&&(Ke=Math.max(Ke,se.start*Ue),lt=Math.min(lt,(se.start+se.count)*Ue)),ve!==null?(Ke=Math.max(Ke,0),lt=Math.min(lt,ve.count)):Ce!=null&&(Ke=Math.max(Ke,0),lt=Math.min(lt,Ce.count));const Rt=lt-Ke;if(Rt<0||Rt===1/0)return;ce.setup(O,W,Se,G,ve);let Mt,ft=ne;if(ve!==null&&(Mt=P.get(ve),ft=be,ft.setIndex(Mt)),O.isMesh)W.wireframe===!0?(Me.setLineWidth(W.wireframeLinewidth*_t()),ft.setMode(I.LINES)):ft.setMode(I.TRIANGLES);else if(O.isLine){let Le=W.linewidth;Le===void 0&&(Le=1),Me.setLineWidth(Le*_t()),O.isLineSegments?ft.setMode(I.LINES):O.isLineLoop?ft.setMode(I.LINE_LOOP):ft.setMode(I.LINE_STRIP)}else O.isPoints?ft.setMode(I.POINTS):O.isSprite&&ft.setMode(I.TRIANGLES);if(O.isBatchedMesh)if(O._multiDrawInstances!==null)sr("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),ft.renderMultiDrawInstances(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount,O._multiDrawInstances);else if(ze.get("WEBGL_multi_draw"))ft.renderMultiDraw(O._multiDrawStarts,O._multiDrawCounts,O._multiDrawCount);else{const Le=O._multiDrawStarts,wt=O._multiDrawCounts,it=O._multiDrawCount,rn=ve?P.get(ve).bytesPerElement:1,Oi=ye.get(W).currentProgram.getUniforms();for(let on=0;on<it;on++)Oi.setValue(I,"_gl_DrawID",on),ft.render(Le[on]/rn,wt[on])}else if(O.isInstancedMesh)ft.renderInstances(Ke,Rt,O.count);else if(G.isInstancedBufferGeometry){const Le=G._maxInstanceCount!==void 0?G._maxInstanceCount:1/0,wt=Math.min(G.instanceCount,Le);ft.renderInstances(Ke,Rt,wt)}else ft.render(Ke,Rt)};function mt(E,z,G){E.transparent===!0&&E.side===Et&&E.forceSinglePass===!1?(E.side=Ht,E.needsUpdate=!0,fr(E,z,G),E.side=ni,E.needsUpdate=!0,fr(E,z,G),E.side=Et):fr(E,z,G)}this.compile=function(E,z,G=null){G===null&&(G=E),p=Ee.get(G),p.init(z),M.push(p),G.traverseVisible(function(O){O.isLight&&O.layers.test(z.layers)&&(p.pushLight(O),O.castShadow&&p.pushShadow(O))}),E!==G&&E.traverseVisible(function(O){O.isLight&&O.layers.test(z.layers)&&(p.pushLight(O),O.castShadow&&p.pushShadow(O))}),p.setupLights();const W=new Set;return E.traverse(function(O){if(!(O.isMesh||O.isPoints||O.isLine||O.isSprite))return;const se=O.material;if(se)if(Array.isArray(se))for(let de=0;de<se.length;de++){const Se=se[de];mt(Se,G,O),W.add(Se)}else mt(se,G,O),W.add(se)}),p=M.pop(),W},this.compileAsync=function(E,z,G=null){const W=this.compile(E,z,G);return new Promise(O=>{function se(){if(W.forEach(function(de){ye.get(de).currentProgram.isReady()&&W.delete(de)}),W.size===0){O(E);return}setTimeout(se,10)}ze.get("KHR_parallel_shader_compile")!==null?se():setTimeout(se,10)})};let rt=null;function Wn(E){rt&&rt(E)}function Ln(){Si.stop()}function $c(){Si.start()}const Si=new wu;Si.setAnimationLoop(Wn),typeof self<"u"&&Si.setContext(self),this.setAnimationLoop=function(E){rt=E,re.setAnimationLoop(E),E===null?Si.stop():Si.start()},re.addEventListener("sessionstart",Ln),re.addEventListener("sessionend",$c),this.render=function(E,z){if(z!==void 0&&z.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(y===!0)return;if(E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),z.parent===null&&z.matrixWorldAutoUpdate===!0&&z.updateMatrixWorld(),re.enabled===!0&&re.isPresenting===!0&&(re.cameraAutoUpdate===!0&&re.updateCamera(z),z=re.getCamera()),E.isScene===!0&&E.onBeforeRender(_,E,z,C),p=Ee.get(E,M.length),p.init(z),M.push(p),ee.multiplyMatrices(z.projectionMatrix,z.matrixWorldInverse),st.setFromProjectionMatrix(ee,zn,z.reversedDepth),K=this.localClippingEnabled,Qe=oe.init(this.clippingPlanes,K),g=q.get(E,v.length),g.init(),v.push(g),re.enabled===!0&&re.isPresenting===!0){const se=_.xr.getDepthSensingMesh();se!==null&&Mo(se,z,-1/0,_.sortObjects)}Mo(E,z,0,_.sortObjects),g.finish(),_.sortObjects===!0&&g.sort(Q,ae),Ye=re.enabled===!1||re.isPresenting===!1||re.hasDepthSensing()===!1,Ye&&le.addToRenderList(g,E),this.info.render.frame++,Qe===!0&&oe.beginShadows();const G=p.state.shadowsArray;j.render(G,E,z),Qe===!0&&oe.endShadows(),this.info.autoReset===!0&&this.info.reset();const W=g.opaque,O=g.transmissive;if(p.setupLights(),z.isArrayCamera){const se=z.cameras;if(O.length>0)for(let de=0,Se=se.length;de<Se;de++){const ve=se[de];Jc(W,O,E,ve)}Ye&&le.render(E);for(let de=0,Se=se.length;de<Se;de++){const ve=se[de];Zc(g,E,ve,ve.viewport)}}else O.length>0&&Jc(W,O,E,z),Ye&&le.render(E),Zc(g,E,z);C!==null&&A===0&&(ke.updateMultisampleRenderTarget(C),ke.updateRenderTargetMipmap(C)),E.isScene===!0&&E.onAfterRender(_,E,z),ce.resetDefaultState(),b=-1,w=null,M.pop(),M.length>0?(p=M[M.length-1],Qe===!0&&oe.setGlobalState(_.clippingPlanes,p.state.camera)):p=null,v.pop(),v.length>0?g=v[v.length-1]:g=null};function Mo(E,z,G,W){if(E.visible===!1)return;if(E.layers.test(z.layers)){if(E.isGroup)G=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(z);else if(E.isLight)p.pushLight(E),E.castShadow&&p.pushShadow(E);else if(E.isSprite){if(!E.frustumCulled||st.intersectsSprite(E)){W&&De.setFromMatrixPosition(E.matrixWorld).applyMatrix4(ee);const de=H.update(E),Se=E.material;Se.visible&&g.push(E,de,Se,G,De.z,null)}}else if((E.isMesh||E.isLine||E.isPoints)&&(!E.frustumCulled||st.intersectsObject(E))){const de=H.update(E),Se=E.material;if(W&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),De.copy(E.boundingSphere.center)):(de.boundingSphere===null&&de.computeBoundingSphere(),De.copy(de.boundingSphere.center)),De.applyMatrix4(E.matrixWorld).applyMatrix4(ee)),Array.isArray(Se)){const ve=de.groups;for(let Ue=0,Fe=ve.length;Ue<Fe;Ue++){const Ce=ve[Ue],Ke=Se[Ce.materialIndex];Ke&&Ke.visible&&g.push(E,de,Ke,G,De.z,Ce)}}else Se.visible&&g.push(E,de,Se,G,De.z,null)}}const se=E.children;for(let de=0,Se=se.length;de<Se;de++)Mo(se[de],z,G,W)}function Zc(E,z,G,W){const O=E.opaque,se=E.transmissive,de=E.transparent;p.setupLightsView(G),Qe===!0&&oe.setGlobalState(_.clippingPlanes,G),W&&Me.viewport(D.copy(W)),O.length>0&&ur(O,z,G),se.length>0&&ur(se,z,G),de.length>0&&ur(de,z,G),Me.buffers.depth.setTest(!0),Me.buffers.depth.setMask(!0),Me.buffers.color.setMask(!0),Me.setPolygonOffset(!1)}function Jc(E,z,G,W){if((G.isScene===!0?G.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[W.id]===void 0&&(p.state.transmissionRenderTarget[W.id]=new Cn(1,1,{generateMipmaps:!0,type:ze.has("EXT_color_buffer_half_float")||ze.has("EXT_color_buffer_float")?si:Bn,minFilter:Fn,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:et.workingColorSpace}));const se=p.state.transmissionRenderTarget[W.id],de=W.viewport||D;se.setSize(de.z*_.transmissionResolutionScale,de.w*_.transmissionResolutionScale);const Se=_.getRenderTarget(),ve=_.getActiveCubeFace(),Ue=_.getActiveMipmapLevel();_.setRenderTarget(se),_.getClearColor(F),B=_.getClearAlpha(),B<1&&_.setClearColor(16777215,.5),_.clear(),Ye&&le.render(G);const Fe=_.toneMapping;_.toneMapping=vi;const Ce=W.viewport;if(W.viewport!==void 0&&(W.viewport=void 0),p.setupLightsView(W),Qe===!0&&oe.setGlobalState(_.clippingPlanes,W),ur(E,G,W),ke.updateMultisampleRenderTarget(se),ke.updateRenderTargetMipmap(se),ze.has("WEBGL_multisampled_render_to_texture")===!1){let Ke=!1;for(let lt=0,Rt=z.length;lt<Rt;lt++){const Mt=z[lt],ft=Mt.object,Le=Mt.geometry,wt=Mt.material,it=Mt.group;if(wt.side===Et&&ft.layers.test(W.layers)){const rn=wt.side;wt.side=Ht,wt.needsUpdate=!0,Qc(ft,G,W,Le,wt,it),wt.side=rn,wt.needsUpdate=!0,Ke=!0}}Ke===!0&&(ke.updateMultisampleRenderTarget(se),ke.updateRenderTargetMipmap(se))}_.setRenderTarget(Se,ve,Ue),_.setClearColor(F,B),Ce!==void 0&&(W.viewport=Ce),_.toneMapping=Fe}function ur(E,z,G){const W=z.isScene===!0?z.overrideMaterial:null;for(let O=0,se=E.length;O<se;O++){const de=E[O],Se=de.object,ve=de.geometry,Ue=de.group;let Fe=de.material;Fe.allowOverride===!0&&W!==null&&(Fe=W),Se.layers.test(G.layers)&&Qc(Se,z,G,ve,Fe,Ue)}}function Qc(E,z,G,W,O,se){E.onBeforeRender(_,z,G,W,O,se),E.modelViewMatrix.multiplyMatrices(G.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),O.onBeforeRender(_,z,G,W,E,se),O.transparent===!0&&O.side===Et&&O.forceSinglePass===!1?(O.side=Ht,O.needsUpdate=!0,_.renderBufferDirect(G,z,W,O,E,se),O.side=ni,O.needsUpdate=!0,_.renderBufferDirect(G,z,W,O,E,se),O.side=Et):_.renderBufferDirect(G,z,W,O,E,se),E.onAfterRender(_,z,G,W,O,se)}function fr(E,z,G){z.isScene!==!0&&(z=Te);const W=ye.get(E),O=p.state.lights,se=p.state.shadowsArray,de=O.state.version,Se=Y.getParameters(E,O.state,se,z,G),ve=Y.getProgramCacheKey(Se);let Ue=W.programs;W.environment=E.isMeshStandardMaterial?z.environment:null,W.fog=z.fog,W.envMap=(E.isMeshStandardMaterial?St:bt).get(E.envMap||W.environment),W.envMapRotation=W.environment!==null&&E.envMap===null?z.environmentRotation:E.envMapRotation,Ue===void 0&&(E.addEventListener("dispose",Z),Ue=new Map,W.programs=Ue);let Fe=Ue.get(ve);if(Fe!==void 0){if(W.currentProgram===Fe&&W.lightsStateVersion===de)return tl(E,Se),Fe}else Se.uniforms=Y.getUniforms(E),E.onBeforeCompile(Se,_),Fe=Y.acquireProgram(Se,ve),Ue.set(ve,Fe),W.uniforms=Se.uniforms;const Ce=W.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(Ce.clippingPlanes=oe.uniform),tl(E,Se),W.needsLights=ju(E),W.lightsStateVersion=de,W.needsLights&&(Ce.ambientLightColor.value=O.state.ambient,Ce.lightProbe.value=O.state.probe,Ce.directionalLights.value=O.state.directional,Ce.directionalLightShadows.value=O.state.directionalShadow,Ce.spotLights.value=O.state.spot,Ce.spotLightShadows.value=O.state.spotShadow,Ce.rectAreaLights.value=O.state.rectArea,Ce.ltc_1.value=O.state.rectAreaLTC1,Ce.ltc_2.value=O.state.rectAreaLTC2,Ce.pointLights.value=O.state.point,Ce.pointLightShadows.value=O.state.pointShadow,Ce.hemisphereLights.value=O.state.hemi,Ce.directionalShadowMap.value=O.state.directionalShadowMap,Ce.directionalShadowMatrix.value=O.state.directionalShadowMatrix,Ce.spotShadowMap.value=O.state.spotShadowMap,Ce.spotLightMatrix.value=O.state.spotLightMatrix,Ce.spotLightMap.value=O.state.spotLightMap,Ce.pointShadowMap.value=O.state.pointShadowMap,Ce.pointShadowMatrix.value=O.state.pointShadowMatrix),W.currentProgram=Fe,W.uniformsList=null,Fe}function el(E){if(E.uniformsList===null){const z=E.currentProgram.getUniforms();E.uniformsList=jr.seqWithValue(z.seq,E.uniforms)}return E.uniformsList}function tl(E,z){const G=ye.get(E);G.outputColorSpace=z.outputColorSpace,G.batching=z.batching,G.batchingColor=z.batchingColor,G.instancing=z.instancing,G.instancingColor=z.instancingColor,G.instancingMorph=z.instancingMorph,G.skinning=z.skinning,G.morphTargets=z.morphTargets,G.morphNormals=z.morphNormals,G.morphColors=z.morphColors,G.morphTargetsCount=z.morphTargetsCount,G.numClippingPlanes=z.numClippingPlanes,G.numIntersection=z.numClipIntersection,G.vertexAlphas=z.vertexAlphas,G.vertexTangents=z.vertexTangents,G.toneMapping=z.toneMapping}function qu(E,z,G,W,O){z.isScene!==!0&&(z=Te),ke.resetTextureUnits();const se=z.fog,de=W.isMeshStandardMaterial?z.environment:null,Se=C===null?_.outputColorSpace:C.isXRRenderTarget===!0?C.texture.colorSpace:en,ve=(W.isMeshStandardMaterial?St:bt).get(W.envMap||de),Ue=W.vertexColors===!0&&!!G.attributes.color&&G.attributes.color.itemSize===4,Fe=!!G.attributes.tangent&&(!!W.normalMap||W.anisotropy>0),Ce=!!G.morphAttributes.position,Ke=!!G.morphAttributes.normal,lt=!!G.morphAttributes.color;let Rt=vi;W.toneMapped&&(C===null||C.isXRRenderTarget===!0)&&(Rt=_.toneMapping);const Mt=G.morphAttributes.position||G.morphAttributes.normal||G.morphAttributes.color,ft=Mt!==void 0?Mt.length:0,Le=ye.get(W),wt=p.state.lights;if(Qe===!0&&(K===!0||E!==w)){const jt=E===w&&W.id===b;oe.setState(W,E,jt)}let it=!1;W.version===Le.__version?(Le.needsLights&&Le.lightsStateVersion!==wt.state.version||Le.outputColorSpace!==Se||O.isBatchedMesh&&Le.batching===!1||!O.isBatchedMesh&&Le.batching===!0||O.isBatchedMesh&&Le.batchingColor===!0&&O.colorTexture===null||O.isBatchedMesh&&Le.batchingColor===!1&&O.colorTexture!==null||O.isInstancedMesh&&Le.instancing===!1||!O.isInstancedMesh&&Le.instancing===!0||O.isSkinnedMesh&&Le.skinning===!1||!O.isSkinnedMesh&&Le.skinning===!0||O.isInstancedMesh&&Le.instancingColor===!0&&O.instanceColor===null||O.isInstancedMesh&&Le.instancingColor===!1&&O.instanceColor!==null||O.isInstancedMesh&&Le.instancingMorph===!0&&O.morphTexture===null||O.isInstancedMesh&&Le.instancingMorph===!1&&O.morphTexture!==null||Le.envMap!==ve||W.fog===!0&&Le.fog!==se||Le.numClippingPlanes!==void 0&&(Le.numClippingPlanes!==oe.numPlanes||Le.numIntersection!==oe.numIntersection)||Le.vertexAlphas!==Ue||Le.vertexTangents!==Fe||Le.morphTargets!==Ce||Le.morphNormals!==Ke||Le.morphColors!==lt||Le.toneMapping!==Rt||Le.morphTargetsCount!==ft)&&(it=!0):(it=!0,Le.__version=W.version);let rn=Le.currentProgram;it===!0&&(rn=fr(W,z,O));let Oi=!1,on=!1,Cs=!1;const Tt=rn.getUniforms(),hn=Le.uniforms;if(Me.useProgram(rn.program)&&(Oi=!0,on=!0,Cs=!0),W.id!==b&&(b=W.id,on=!0),Oi||w!==E){Me.buffers.depth.getReversed()&&E.reversedDepth!==!0&&(E._reversedDepth=!0,E.updateProjectionMatrix()),Tt.setValue(I,"projectionMatrix",E.projectionMatrix),Tt.setValue(I,"viewMatrix",E.matrixWorldInverse);const tn=Tt.map.cameraPosition;tn!==void 0&&tn.setValue(I,me.setFromMatrixPosition(E.matrixWorld)),Ie.logarithmicDepthBuffer&&Tt.setValue(I,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),(W.isMeshPhongMaterial||W.isMeshToonMaterial||W.isMeshLambertMaterial||W.isMeshBasicMaterial||W.isMeshStandardMaterial||W.isShaderMaterial)&&Tt.setValue(I,"isOrthographic",E.isOrthographicCamera===!0),w!==E&&(w=E,on=!0,Cs=!0)}if(O.isSkinnedMesh){Tt.setOptional(I,O,"bindMatrix"),Tt.setOptional(I,O,"bindMatrixInverse");const jt=O.skeleton;jt&&(jt.boneTexture===null&&jt.computeBoneTexture(),Tt.setValue(I,"boneTexture",jt.boneTexture,ke))}O.isBatchedMesh&&(Tt.setOptional(I,O,"batchingTexture"),Tt.setValue(I,"batchingTexture",O._matricesTexture,ke),Tt.setOptional(I,O,"batchingIdTexture"),Tt.setValue(I,"batchingIdTexture",O._indirectTexture,ke),Tt.setOptional(I,O,"batchingColorTexture"),O._colorsTexture!==null&&Tt.setValue(I,"batchingColorTexture",O._colorsTexture,ke));const un=G.morphAttributes;if((un.position!==void 0||un.normal!==void 0||un.color!==void 0)&&$.update(O,G,rn),(on||Le.receiveShadow!==O.receiveShadow)&&(Le.receiveShadow=O.receiveShadow,Tt.setValue(I,"receiveShadow",O.receiveShadow)),W.isMeshGouraudMaterial&&W.envMap!==null&&(hn.envMap.value=ve,hn.flipEnvMap.value=ve.isCubeTexture&&ve.isRenderTargetTexture===!1?-1:1),W.isMeshStandardMaterial&&W.envMap===null&&z.environment!==null&&(hn.envMapIntensity.value=z.environmentIntensity),on&&(Tt.setValue(I,"toneMappingExposure",_.toneMappingExposure),Le.needsLights&&Yu(hn,Cs),se&&W.fog===!0&&te.refreshFogUniforms(hn,se),te.refreshMaterialUniforms(hn,W,k,X,p.state.transmissionRenderTarget[E.id]),jr.upload(I,el(Le),hn,ke)),W.isShaderMaterial&&W.uniformsNeedUpdate===!0&&(jr.upload(I,el(Le),hn,ke),W.uniformsNeedUpdate=!1),W.isSpriteMaterial&&Tt.setValue(I,"center",O.center),Tt.setValue(I,"modelViewMatrix",O.modelViewMatrix),Tt.setValue(I,"normalMatrix",O.normalMatrix),Tt.setValue(I,"modelMatrix",O.matrixWorld),W.isShaderMaterial||W.isRawShaderMaterial){const jt=W.uniformsGroups;for(let tn=0,yo=jt.length;tn<yo;tn++){const bi=jt[tn];Re.update(bi,rn),Re.bind(bi,rn)}}return rn}function Yu(E,z){E.ambientLightColor.needsUpdate=z,E.lightProbe.needsUpdate=z,E.directionalLights.needsUpdate=z,E.directionalLightShadows.needsUpdate=z,E.pointLights.needsUpdate=z,E.pointLightShadows.needsUpdate=z,E.spotLights.needsUpdate=z,E.spotLightShadows.needsUpdate=z,E.rectAreaLights.needsUpdate=z,E.hemisphereLights.needsUpdate=z}function ju(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}this.getActiveCubeFace=function(){return S},this.getActiveMipmapLevel=function(){return A},this.getRenderTarget=function(){return C},this.setRenderTargetTextures=function(E,z,G){const W=ye.get(E);W.__autoAllocateDepthBuffer=E.resolveDepthBuffer===!1,W.__autoAllocateDepthBuffer===!1&&(W.__useRenderToTexture=!1),ye.get(E.texture).__webglTexture=z,ye.get(E.depthTexture).__webglTexture=W.__autoAllocateDepthBuffer?void 0:G,W.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(E,z){const G=ye.get(E);G.__webglFramebuffer=z,G.__useDefaultFramebuffer=z===void 0};const Ku=I.createFramebuffer();this.setRenderTarget=function(E,z=0,G=0){C=E,S=z,A=G;let W=!0,O=null,se=!1,de=!1;if(E){const ve=ye.get(E);if(ve.__useDefaultFramebuffer!==void 0)Me.bindFramebuffer(I.FRAMEBUFFER,null),W=!1;else if(ve.__webglFramebuffer===void 0)ke.setupRenderTarget(E);else if(ve.__hasExternalTextures)ke.rebindTextures(E,ye.get(E.texture).__webglTexture,ye.get(E.depthTexture).__webglTexture);else if(E.depthBuffer){const Ce=E.depthTexture;if(ve.__boundDepthTexture!==Ce){if(Ce!==null&&ye.has(Ce)&&(E.width!==Ce.image.width||E.height!==Ce.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");ke.setupDepthRenderbuffer(E)}}const Ue=E.texture;(Ue.isData3DTexture||Ue.isDataArrayTexture||Ue.isCompressedArrayTexture)&&(de=!0);const Fe=ye.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(Fe[z])?O=Fe[z][G]:O=Fe[z],se=!0):E.samples>0&&ke.useMultisampledRTT(E)===!1?O=ye.get(E).__webglMultisampledFramebuffer:Array.isArray(Fe)?O=Fe[G]:O=Fe,D.copy(E.viewport),L.copy(E.scissor),N=E.scissorTest}else D.copy(pe).multiplyScalar(k).floor(),L.copy(Ne).multiplyScalar(k).floor(),N=nt;if(G!==0&&(O=Ku),Me.bindFramebuffer(I.FRAMEBUFFER,O)&&W&&Me.drawBuffers(E,O),Me.viewport(D),Me.scissor(L),Me.setScissorTest(N),se){const ve=ye.get(E.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_CUBE_MAP_POSITIVE_X+z,ve.__webglTexture,G)}else if(de){const ve=z;for(let Ue=0;Ue<E.textures.length;Ue++){const Fe=ye.get(E.textures[Ue]);I.framebufferTextureLayer(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0+Ue,Fe.__webglTexture,G,ve)}}else if(E!==null&&G!==0){const ve=ye.get(E.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,ve.__webglTexture,G)}b=-1},this.readRenderTargetPixels=function(E,z,G,W,O,se,de,Se=0){if(!(E&&E.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let ve=ye.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&de!==void 0&&(ve=ve[de]),ve){Me.bindFramebuffer(I.FRAMEBUFFER,ve);try{const Ue=E.textures[Se],Fe=Ue.format,Ce=Ue.type;if(!Ie.textureFormatReadable(Fe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ie.textureTypeReadable(Ce)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}z>=0&&z<=E.width-W&&G>=0&&G<=E.height-O&&(E.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+Se),I.readPixels(z,G,W,O,ge.convert(Fe),ge.convert(Ce),se))}finally{const Ue=C!==null?ye.get(C).__webglFramebuffer:null;Me.bindFramebuffer(I.FRAMEBUFFER,Ue)}}},this.readRenderTargetPixelsAsync=async function(E,z,G,W,O,se,de,Se=0){if(!(E&&E.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let ve=ye.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&de!==void 0&&(ve=ve[de]),ve)if(z>=0&&z<=E.width-W&&G>=0&&G<=E.height-O){Me.bindFramebuffer(I.FRAMEBUFFER,ve);const Ue=E.textures[Se],Fe=Ue.format,Ce=Ue.type;if(!Ie.textureFormatReadable(Fe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Ie.textureTypeReadable(Ce))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Ke=I.createBuffer();I.bindBuffer(I.PIXEL_PACK_BUFFER,Ke),I.bufferData(I.PIXEL_PACK_BUFFER,se.byteLength,I.STREAM_READ),E.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+Se),I.readPixels(z,G,W,O,ge.convert(Fe),ge.convert(Ce),0);const lt=C!==null?ye.get(C).__webglFramebuffer:null;Me.bindFramebuffer(I.FRAMEBUFFER,lt);const Rt=I.fenceSync(I.SYNC_GPU_COMMANDS_COMPLETE,0);return I.flush(),await sd(I,Rt,4),I.bindBuffer(I.PIXEL_PACK_BUFFER,Ke),I.getBufferSubData(I.PIXEL_PACK_BUFFER,0,se),I.deleteBuffer(Ke),I.deleteSync(Rt),se}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(E,z=null,G=0){const W=Math.pow(2,-G),O=Math.floor(E.image.width*W),se=Math.floor(E.image.height*W),de=z!==null?z.x:0,Se=z!==null?z.y:0;ke.setTexture2D(E,0),I.copyTexSubImage2D(I.TEXTURE_2D,G,0,0,de,Se,O,se),Me.unbindTexture()};const $u=I.createFramebuffer(),Zu=I.createFramebuffer();this.copyTextureToTexture=function(E,z,G=null,W=null,O=0,se=null){se===null&&(O!==0?(sr("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),se=O,O=0):se=0);let de,Se,ve,Ue,Fe,Ce,Ke,lt,Rt;const Mt=E.isCompressedTexture?E.mipmaps[se]:E.image;if(G!==null)de=G.max.x-G.min.x,Se=G.max.y-G.min.y,ve=G.isBox3?G.max.z-G.min.z:1,Ue=G.min.x,Fe=G.min.y,Ce=G.isBox3?G.min.z:0;else{const un=Math.pow(2,-O);de=Math.floor(Mt.width*un),Se=Math.floor(Mt.height*un),E.isDataArrayTexture?ve=Mt.depth:E.isData3DTexture?ve=Math.floor(Mt.depth*un):ve=1,Ue=0,Fe=0,Ce=0}W!==null?(Ke=W.x,lt=W.y,Rt=W.z):(Ke=0,lt=0,Rt=0);const ft=ge.convert(z.format),Le=ge.convert(z.type);let wt;z.isData3DTexture?(ke.setTexture3D(z,0),wt=I.TEXTURE_3D):z.isDataArrayTexture||z.isCompressedArrayTexture?(ke.setTexture2DArray(z,0),wt=I.TEXTURE_2D_ARRAY):(ke.setTexture2D(z,0),wt=I.TEXTURE_2D),I.pixelStorei(I.UNPACK_FLIP_Y_WEBGL,z.flipY),I.pixelStorei(I.UNPACK_PREMULTIPLY_ALPHA_WEBGL,z.premultiplyAlpha),I.pixelStorei(I.UNPACK_ALIGNMENT,z.unpackAlignment);const it=I.getParameter(I.UNPACK_ROW_LENGTH),rn=I.getParameter(I.UNPACK_IMAGE_HEIGHT),Oi=I.getParameter(I.UNPACK_SKIP_PIXELS),on=I.getParameter(I.UNPACK_SKIP_ROWS),Cs=I.getParameter(I.UNPACK_SKIP_IMAGES);I.pixelStorei(I.UNPACK_ROW_LENGTH,Mt.width),I.pixelStorei(I.UNPACK_IMAGE_HEIGHT,Mt.height),I.pixelStorei(I.UNPACK_SKIP_PIXELS,Ue),I.pixelStorei(I.UNPACK_SKIP_ROWS,Fe),I.pixelStorei(I.UNPACK_SKIP_IMAGES,Ce);const Tt=E.isDataArrayTexture||E.isData3DTexture,hn=z.isDataArrayTexture||z.isData3DTexture;if(E.isDepthTexture){const un=ye.get(E),jt=ye.get(z),tn=ye.get(un.__renderTarget),yo=ye.get(jt.__renderTarget);Me.bindFramebuffer(I.READ_FRAMEBUFFER,tn.__webglFramebuffer),Me.bindFramebuffer(I.DRAW_FRAMEBUFFER,yo.__webglFramebuffer);for(let bi=0;bi<ve;bi++)Tt&&(I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,ye.get(E).__webglTexture,O,Ce+bi),I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,ye.get(z).__webglTexture,se,Rt+bi)),I.blitFramebuffer(Ue,Fe,de,Se,Ke,lt,de,Se,I.DEPTH_BUFFER_BIT,I.NEAREST);Me.bindFramebuffer(I.READ_FRAMEBUFFER,null),Me.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else if(O!==0||E.isRenderTargetTexture||ye.has(E)){const un=ye.get(E),jt=ye.get(z);Me.bindFramebuffer(I.READ_FRAMEBUFFER,$u),Me.bindFramebuffer(I.DRAW_FRAMEBUFFER,Zu);for(let tn=0;tn<ve;tn++)Tt?I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,un.__webglTexture,O,Ce+tn):I.framebufferTexture2D(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,un.__webglTexture,O),hn?I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,jt.__webglTexture,se,Rt+tn):I.framebufferTexture2D(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,jt.__webglTexture,se),O!==0?I.blitFramebuffer(Ue,Fe,de,Se,Ke,lt,de,Se,I.COLOR_BUFFER_BIT,I.NEAREST):hn?I.copyTexSubImage3D(wt,se,Ke,lt,Rt+tn,Ue,Fe,de,Se):I.copyTexSubImage2D(wt,se,Ke,lt,Ue,Fe,de,Se);Me.bindFramebuffer(I.READ_FRAMEBUFFER,null),Me.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else hn?E.isDataTexture||E.isData3DTexture?I.texSubImage3D(wt,se,Ke,lt,Rt,de,Se,ve,ft,Le,Mt.data):z.isCompressedArrayTexture?I.compressedTexSubImage3D(wt,se,Ke,lt,Rt,de,Se,ve,ft,Mt.data):I.texSubImage3D(wt,se,Ke,lt,Rt,de,Se,ve,ft,Le,Mt):E.isDataTexture?I.texSubImage2D(I.TEXTURE_2D,se,Ke,lt,de,Se,ft,Le,Mt.data):E.isCompressedTexture?I.compressedTexSubImage2D(I.TEXTURE_2D,se,Ke,lt,Mt.width,Mt.height,ft,Mt.data):I.texSubImage2D(I.TEXTURE_2D,se,Ke,lt,de,Se,ft,Le,Mt);I.pixelStorei(I.UNPACK_ROW_LENGTH,it),I.pixelStorei(I.UNPACK_IMAGE_HEIGHT,rn),I.pixelStorei(I.UNPACK_SKIP_PIXELS,Oi),I.pixelStorei(I.UNPACK_SKIP_ROWS,on),I.pixelStorei(I.UNPACK_SKIP_IMAGES,Cs),se===0&&z.generateMipmaps&&I.generateMipmap(wt),Me.unbindTexture()},this.initRenderTarget=function(E){ye.get(E).__webglFramebuffer===void 0&&ke.setupRenderTarget(E)},this.initTexture=function(E){E.isCubeTexture?ke.setTextureCube(E,0):E.isData3DTexture?ke.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?ke.setTexture2DArray(E,0):ke.setTexture2D(E,0),Me.unbindTexture()},this.resetState=function(){S=0,A=0,C=null,Me.reset(),ce.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return zn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=et._getDrawingBufferColorSpace(e),t.unpackColorSpace=et._getUnpackColorSpace()}}function Cu(s,e=!1){const t=s[0].index!==null,n=new Set(Object.keys(s[0].attributes)),i=new Set(Object.keys(s[0].morphAttributes)),r={},o={},a=s[0].morphTargetsRelative,c=new Ct;let l=0;for(let h=0;h<s.length;++h){const u=s[h];let f=0;if(t!==(u.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const m in u.attributes){if(!n.has(m))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+m+'" attribute exists among all geometries, or in none of them.'),null;r[m]===void 0&&(r[m]=[]),r[m].push(u.attributes[m]),f++}if(f!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(a!==u.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const m in u.morphAttributes){if(!i.has(m))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;o[m]===void 0&&(o[m]=[]),o[m].push(u.morphAttributes[m])}if(e){let m;if(t)m=u.index.count;else if(u.attributes.position!==void 0)m=u.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;c.addGroup(l,m,h),l+=m}}if(t){let h=0;const u=[];for(let f=0;f<s.length;++f){const m=s[f].index;for(let x=0;x<m.count;++x)u.push(m.getX(x)+h);h+=s[f].attributes.position.count}c.setIndex(u)}for(const h in r){const u=Mh(r[h]);if(!u)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;c.setAttribute(h,u)}for(const h in o){const u=o[h][0].length;if(u===0)break;c.morphAttributes=c.morphAttributes||{},c.morphAttributes[h]=[];for(let f=0;f<u;++f){const m=[];for(let d=0;d<o[h].length;++d)m.push(o[h][d][f]);const x=Mh(m);if(!x)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;c.morphAttributes[h].push(x)}}return c}function Mh(s){let e,t,n,i=-1,r=0;for(let l=0;l<s.length;++l){const h=s[l];if(e===void 0&&(e=h.array.constructor),e!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=h.itemSize),t!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=h.gpuType),i!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;r+=h.count*t}const o=new e(r),a=new At(o,t,n);let c=0;for(let l=0;l<s.length;++l){const h=s[l];if(h.isInterleavedBufferAttribute){const u=c/t;for(let f=0,m=h.count;f<m;f++)for(let x=0;x<t;x++){const d=h.getComponent(f,x);a.setComponent(f+u,x,d)}}else o.set(h.array,c);c+=h.count*t}return i!==void 0&&(a.gpuType=i),a}function yh(s,e){if(e===Cf)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),s;if(e===tc||e===nu){let t=s.getIndex();if(t===null){const o=[],a=s.getAttribute("position");if(a!==void 0){for(let c=0;c<a.count;c++)o.push(c);s.setIndex(o),t=s.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),s}const n=t.count-2,i=[];if(e===tc)for(let o=1;o<=n;o++)i.push(t.getX(0)),i.push(t.getX(o)),i.push(t.getX(o+1));else for(let o=0;o<n;o++)o%2===0?(i.push(t.getX(o)),i.push(t.getX(o+1)),i.push(t.getX(o+2))):(i.push(t.getX(o+2)),i.push(t.getX(o+1)),i.push(t.getX(o)));i.length/3!==n&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");const r=s.clone();return r.setIndex(i),r.clearGroups(),r}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),s}class mv extends Es{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new Mv(t)}),this.register(function(t){return new yv(t)}),this.register(function(t){return new Pv(t)}),this.register(function(t){return new Dv(t)}),this.register(function(t){return new Iv(t)}),this.register(function(t){return new bv(t)}),this.register(function(t){return new wv(t)}),this.register(function(t){return new Tv(t)}),this.register(function(t){return new Ev(t)}),this.register(function(t){return new _v(t)}),this.register(function(t){return new Av(t)}),this.register(function(t){return new Sv(t)}),this.register(function(t){return new Cv(t)}),this.register(function(t){return new Rv(t)}),this.register(function(t){return new xv(t)}),this.register(function(t){return new Lv(t)}),this.register(function(t){return new Uv(t)})}load(e,t,n,i){const r=this;let o;if(this.resourcePath!=="")o=this.resourcePath;else if(this.path!==""){const l=Ks.extractUrlBase(e);o=Ks.resolveURL(l,this.path)}else o=Ks.extractUrlBase(e);this.manager.itemStart(e);const a=function(l){i?i(l):console.error(l),r.manager.itemError(e),r.manager.itemEnd(e)},c=new yu(this.manager);c.setPath(this.path),c.setResponseType("arraybuffer"),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(l){try{r.parse(l,o,function(h){t(h),r.manager.itemEnd(e)},a)}catch(h){a(h)}},n,a)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,i){let r;const o={},a={},c=new TextDecoder;if(typeof e=="string")r=JSON.parse(e);else if(e instanceof ArrayBuffer)if(c.decode(new Uint8Array(e,0,4))===Pu){try{o[je.KHR_BINARY_GLTF]=new Nv(e)}catch(u){i&&i(u);return}r=JSON.parse(o[je.KHR_BINARY_GLTF].content)}else r=JSON.parse(c.decode(e));else r=e;if(r.asset===void 0||r.asset.version[0]<2){i&&i(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}const l=new jv(r,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});l.fileLoader.setRequestHeader(this.requestHeader);for(let h=0;h<this.pluginCallbacks.length;h++){const u=this.pluginCallbacks[h](l);u.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),a[u.name]=u,o[u.name]=!0}if(r.extensionsUsed)for(let h=0;h<r.extensionsUsed.length;++h){const u=r.extensionsUsed[h],f=r.extensionsRequired||[];switch(u){case je.KHR_MATERIALS_UNLIT:o[u]=new vv;break;case je.KHR_DRACO_MESH_COMPRESSION:o[u]=new Fv(r,this.dracoLoader);break;case je.KHR_TEXTURE_TRANSFORM:o[u]=new zv;break;case je.KHR_MESH_QUANTIZATION:o[u]=new Ov;break;default:f.indexOf(u)>=0&&a[u]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+u+'".')}}l.setExtensions(o),l.setPlugins(a),l.parse(n,i)}parseAsync(e,t){const n=this;return new Promise(function(i,r){n.parse(e,t,i,r)})}}function gv(){let s={};return{get:function(e){return s[e]},add:function(e,t){s[e]=t},remove:function(e){delete s[e]},removeAll:function(){s={}}}}const je={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"};class xv{constructor(e){this.parser=e,this.name=je.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){const e=this.parser,t=this.parser.json.nodes||[];for(let n=0,i=t.length;n<i;n++){const r=t[n];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){const t=this.parser,n="light:"+e;let i=t.cache.get(n);if(i)return i;const r=t.json,c=((r.extensions&&r.extensions[this.name]||{}).lights||[])[e];let l;const h=new xe(16777215);c.color!==void 0&&h.setRGB(c.color[0],c.color[1],c.color[2],en);const u=c.range!==void 0?c.range:0;switch(c.type){case"directional":l=new bu(h),l.target.position.set(0,0,-1),l.add(l.target);break;case"point":l=new _p(h),l.distance=u;break;case"spot":l=new xp(h),l.distance=u,c.spot=c.spot||{},c.spot.innerConeAngle=c.spot.innerConeAngle!==void 0?c.spot.innerConeAngle:0,c.spot.outerConeAngle=c.spot.outerConeAngle!==void 0?c.spot.outerConeAngle:Math.PI/4,l.angle=c.spot.outerConeAngle,l.penumbra=1-c.spot.innerConeAngle/c.spot.outerConeAngle,l.target.position.set(0,0,-1),l.add(l.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+c.type)}return l.position.set(0,0,0),Un(l,c),c.intensity!==void 0&&(l.intensity=c.intensity),l.name=t.createUniqueName(c.name||"light_"+e),i=Promise.resolve(l),t.cache.add(n,i),i}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){const t=this,n=this.parser,r=n.json.nodes[e],a=(r.extensions&&r.extensions[this.name]||{}).light;return a===void 0?null:this._loadLight(a).then(function(c){return n._getNodeRef(t.cache,a,c)})}}class vv{constructor(){this.name=je.KHR_MATERIALS_UNLIT}getMaterialType(){return Fi}extendParams(e,t,n){const i=[];e.color=new xe(1,1,1),e.opacity=1;const r=t.pbrMetallicRoughness;if(r){if(Array.isArray(r.baseColorFactor)){const o=r.baseColorFactor;e.color.setRGB(o[0],o[1],o[2],en),e.opacity=o[3]}r.baseColorTexture!==void 0&&i.push(n.assignTexture(e,"map",r.baseColorTexture,Pt))}return Promise.all(i)}}class _v{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){const i=this.parser.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=i.extensions[this.name].emissiveStrength;return r!==void 0&&(t.emissiveIntensity=r),Promise.resolve()}}class Mv{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Gn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];if(o.clearcoatFactor!==void 0&&(t.clearcoat=o.clearcoatFactor),o.clearcoatTexture!==void 0&&r.push(n.assignTexture(t,"clearcoatMap",o.clearcoatTexture)),o.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=o.clearcoatRoughnessFactor),o.clearcoatRoughnessTexture!==void 0&&r.push(n.assignTexture(t,"clearcoatRoughnessMap",o.clearcoatRoughnessTexture)),o.clearcoatNormalTexture!==void 0&&(r.push(n.assignTexture(t,"clearcoatNormalMap",o.clearcoatNormalTexture)),o.clearcoatNormalTexture.scale!==void 0)){const a=o.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new fe(a,a)}return Promise.all(r)}}class yv{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_DISPERSION}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Gn}extendMaterialParams(e,t){const i=this.parser.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=i.extensions[this.name];return t.dispersion=r.dispersion!==void 0?r.dispersion:0,Promise.resolve()}}class Sv{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Gn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];return o.iridescenceFactor!==void 0&&(t.iridescence=o.iridescenceFactor),o.iridescenceTexture!==void 0&&r.push(n.assignTexture(t,"iridescenceMap",o.iridescenceTexture)),o.iridescenceIor!==void 0&&(t.iridescenceIOR=o.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),o.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=o.iridescenceThicknessMinimum),o.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=o.iridescenceThicknessMaximum),o.iridescenceThicknessTexture!==void 0&&r.push(n.assignTexture(t,"iridescenceThicknessMap",o.iridescenceThicknessTexture)),Promise.all(r)}}class bv{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_SHEEN}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Gn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[];t.sheenColor=new xe(0,0,0),t.sheenRoughness=0,t.sheen=1;const o=i.extensions[this.name];if(o.sheenColorFactor!==void 0){const a=o.sheenColorFactor;t.sheenColor.setRGB(a[0],a[1],a[2],en)}return o.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=o.sheenRoughnessFactor),o.sheenColorTexture!==void 0&&r.push(n.assignTexture(t,"sheenColorMap",o.sheenColorTexture,Pt)),o.sheenRoughnessTexture!==void 0&&r.push(n.assignTexture(t,"sheenRoughnessMap",o.sheenRoughnessTexture)),Promise.all(r)}}class wv{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Gn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];return o.transmissionFactor!==void 0&&(t.transmission=o.transmissionFactor),o.transmissionTexture!==void 0&&r.push(n.assignTexture(t,"transmissionMap",o.transmissionTexture)),Promise.all(r)}}class Tv{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_VOLUME}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Gn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];t.thickness=o.thicknessFactor!==void 0?o.thicknessFactor:0,o.thicknessTexture!==void 0&&r.push(n.assignTexture(t,"thicknessMap",o.thicknessTexture)),t.attenuationDistance=o.attenuationDistance||1/0;const a=o.attenuationColor||[1,1,1];return t.attenuationColor=new xe().setRGB(a[0],a[1],a[2],en),Promise.all(r)}}class Ev{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_IOR}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Gn}extendMaterialParams(e,t){const i=this.parser.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=i.extensions[this.name];return t.ior=r.ior!==void 0?r.ior:1.5,Promise.resolve()}}class Av{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_SPECULAR}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Gn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];t.specularIntensity=o.specularFactor!==void 0?o.specularFactor:1,o.specularTexture!==void 0&&r.push(n.assignTexture(t,"specularIntensityMap",o.specularTexture));const a=o.specularColorFactor||[1,1,1];return t.specularColor=new xe().setRGB(a[0],a[1],a[2],en),o.specularColorTexture!==void 0&&r.push(n.assignTexture(t,"specularColorMap",o.specularColorTexture,Pt)),Promise.all(r)}}class Rv{constructor(e){this.parser=e,this.name=je.EXT_MATERIALS_BUMP}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Gn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];return t.bumpScale=o.bumpFactor!==void 0?o.bumpFactor:1,o.bumpTexture!==void 0&&r.push(n.assignTexture(t,"bumpMap",o.bumpTexture)),Promise.all(r)}}class Cv{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Gn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];return o.anisotropyStrength!==void 0&&(t.anisotropy=o.anisotropyStrength),o.anisotropyRotation!==void 0&&(t.anisotropyRotation=o.anisotropyRotation),o.anisotropyTexture!==void 0&&r.push(n.assignTexture(t,"anisotropyMap",o.anisotropyTexture)),Promise.all(r)}}class Pv{constructor(e){this.parser=e,this.name=je.KHR_TEXTURE_BASISU}loadTexture(e){const t=this.parser,n=t.json,i=n.textures[e];if(!i.extensions||!i.extensions[this.name])return null;const r=i.extensions[this.name],o=t.options.ktx2Loader;if(!o){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,r.source,o)}}class Dv{constructor(e){this.parser=e,this.name=je.EXT_TEXTURE_WEBP}loadTexture(e){const t=this.name,n=this.parser,i=n.json,r=i.textures[e];if(!r.extensions||!r.extensions[t])return null;const o=r.extensions[t],a=i.images[o.source];let c=n.textureLoader;if(a.uri){const l=n.options.manager.getHandler(a.uri);l!==null&&(c=l)}return n.loadTextureImage(e,o.source,c)}}class Iv{constructor(e){this.parser=e,this.name=je.EXT_TEXTURE_AVIF}loadTexture(e){const t=this.name,n=this.parser,i=n.json,r=i.textures[e];if(!r.extensions||!r.extensions[t])return null;const o=r.extensions[t],a=i.images[o.source];let c=n.textureLoader;if(a.uri){const l=n.options.manager.getHandler(a.uri);l!==null&&(c=l)}return n.loadTextureImage(e,o.source,c)}}class Lv{constructor(e){this.name=je.EXT_MESHOPT_COMPRESSION,this.parser=e}loadBufferView(e){const t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){const i=n.extensions[this.name],r=this.parser.getDependency("buffer",i.buffer),o=this.parser.options.meshoptDecoder;if(!o||!o.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return r.then(function(a){const c=i.byteOffset||0,l=i.byteLength||0,h=i.count,u=i.byteStride,f=new Uint8Array(a,c,l);return o.decodeGltfBufferAsync?o.decodeGltfBufferAsync(h,u,f,i.mode,i.filter).then(function(m){return m.buffer}):o.ready.then(function(){const m=new ArrayBuffer(h*u);return o.decodeGltfBuffer(new Uint8Array(m),h,u,f,i.mode,i.filter),m})})}else return null}}class Uv{constructor(e){this.name=je.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){const t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;const i=t.meshes[n.mesh];for(const l of i.primitives)if(l.mode!==pn.TRIANGLES&&l.mode!==pn.TRIANGLE_STRIP&&l.mode!==pn.TRIANGLE_FAN&&l.mode!==void 0)return null;const o=n.extensions[this.name].attributes,a=[],c={};for(const l in o)a.push(this.parser.getDependency("accessor",o[l]).then(h=>(c[l]=h,c[l])));return a.length<1?null:(a.push(this.parser.createNodeMesh(e)),Promise.all(a).then(l=>{const h=l.pop(),u=h.isGroup?h.children:[h],f=l[0].count,m=[];for(const x of u){const d=new Oe,g=new R,p=new xn,v=new R(1,1,1),M=new Ui(x.geometry,x.material,f);for(let _=0;_<f;_++)c.TRANSLATION&&g.fromBufferAttribute(c.TRANSLATION,_),c.ROTATION&&p.fromBufferAttribute(c.ROTATION,_),c.SCALE&&v.fromBufferAttribute(c.SCALE,_),M.setMatrixAt(_,d.compose(g,p,v));for(const _ in c)if(_==="_COLOR_0"){const y=c[_];M.instanceColor=new ic(y.array,y.itemSize,y.normalized)}else _!=="TRANSLATION"&&_!=="ROTATION"&&_!=="SCALE"&&x.geometry.setAttribute(_,c[_]);ct.prototype.copy.call(M,x),this.parser.assignFinalMaterial(M),m.push(M)}return h.isGroup?(h.clear(),h.add(...m),h):m[0]}))}}const Pu="glTF",Os=12,Sh={JSON:1313821514,BIN:5130562};class Nv{constructor(e){this.name=je.KHR_BINARY_GLTF,this.content=null,this.body=null;const t=new DataView(e,0,Os),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==Pu)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");const i=this.header.length-Os,r=new DataView(e,Os);let o=0;for(;o<i;){const a=r.getUint32(o,!0);o+=4;const c=r.getUint32(o,!0);if(o+=4,c===Sh.JSON){const l=new Uint8Array(e,Os+o,a);this.content=n.decode(l)}else if(c===Sh.BIN){const l=Os+o;this.body=e.slice(l,l+a)}o+=a}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}}class Fv{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=je.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){const n=this.json,i=this.dracoLoader,r=e.extensions[this.name].bufferView,o=e.extensions[this.name].attributes,a={},c={},l={};for(const h in o){const u=ac[h]||h.toLowerCase();a[u]=o[h]}for(const h in e.attributes){const u=ac[h]||h.toLowerCase();if(o[h]!==void 0){const f=n.accessors[e.attributes[h]],m=us[f.componentType];l[u]=m.name,c[u]=f.normalized===!0}}return t.getDependency("bufferView",r).then(function(h){return new Promise(function(u,f){i.decodeDracoFile(h,function(m){for(const x in m.attributes){const d=m.attributes[x],g=c[x];g!==void 0&&(d.normalized=g)}u(m)},a,l,en,f)})})}}class zv{constructor(){this.name=je.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){return(t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0||(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),e.needsUpdate=!0),e}}class Ov{constructor(){this.name=je.KHR_MESH_QUANTIZATION}}class Du extends or{constructor(e,t,n,i){super(e,t,n,i)}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,r=e*i*3+i;for(let o=0;o!==i;o++)t[o]=n[r+o];return t}interpolate_(e,t,n,i){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=a*2,l=a*3,h=i-t,u=(n-t)/h,f=u*u,m=f*u,x=e*l,d=x-l,g=-2*m+3*f,p=m-f,v=1-g,M=p-f+u;for(let _=0;_!==a;_++){const y=o[d+_+a],S=o[d+_+c]*h,A=o[x+_+a],C=o[x+_]*h;r[_]=v*y+M*S+g*A+p*C}return r}}const kv=new xn;class Bv extends Du{interpolate_(e,t,n,i){const r=super.interpolate_(e,t,n,i);return kv.fromArray(r).normalize().toArray(r),r}}const pn={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6},us={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},bh={9728:Qt,9729:sn,9984:jh,9985:Gr,9986:Hs,9987:Fn},wh={33071:Tn,33648:Qr,10497:ii},oa={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},ac={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},pi={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},Hv={CUBICSPLINE:void 0,LINEAR:nr,STEP:tr},aa={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function Vv(s){return s.DefaultMaterial===void 0&&(s.DefaultMaterial=new It({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:ni})),s.DefaultMaterial}function Pi(s,e,t){for(const n in t.extensions)s[n]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[n]=t.extensions[n])}function Un(s,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(s.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function Gv(s,e,t){let n=!1,i=!1,r=!1;for(let l=0,h=e.length;l<h;l++){const u=e[l];if(u.POSITION!==void 0&&(n=!0),u.NORMAL!==void 0&&(i=!0),u.COLOR_0!==void 0&&(r=!0),n&&i&&r)break}if(!n&&!i&&!r)return Promise.resolve(s);const o=[],a=[],c=[];for(let l=0,h=e.length;l<h;l++){const u=e[l];if(n){const f=u.POSITION!==void 0?t.getDependency("accessor",u.POSITION):s.attributes.position;o.push(f)}if(i){const f=u.NORMAL!==void 0?t.getDependency("accessor",u.NORMAL):s.attributes.normal;a.push(f)}if(r){const f=u.COLOR_0!==void 0?t.getDependency("accessor",u.COLOR_0):s.attributes.color;c.push(f)}}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(c)]).then(function(l){const h=l[0],u=l[1],f=l[2];return n&&(s.morphAttributes.position=h),i&&(s.morphAttributes.normal=u),r&&(s.morphAttributes.color=f),s.morphTargetsRelative=!0,s})}function Wv(s,e){if(s.updateMorphTargets(),e.weights!==void 0)for(let t=0,n=e.weights.length;t<n;t++)s.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){const t=e.extras.targetNames;if(s.morphTargetInfluences.length===t.length){s.morphTargetDictionary={};for(let n=0,i=t.length;n<i;n++)s.morphTargetDictionary[t[n]]=n}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function Xv(s){let e;const t=s.extensions&&s.extensions[je.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+ca(t.attributes):e=s.indices+":"+ca(s.attributes)+":"+s.mode,s.targets!==void 0)for(let n=0,i=s.targets.length;n<i;n++)e+=":"+ca(s.targets[n]);return e}function ca(s){let e="";const t=Object.keys(s).sort();for(let n=0,i=t.length;n<i;n++)e+=t[n]+":"+s[t[n]]+";";return e}function cc(s){switch(s){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function qv(s){return s.search(/\.jpe?g($|\?)/i)>0||s.search(/^data\:image\/jpeg/)===0?"image/jpeg":s.search(/\.webp($|\?)/i)>0||s.search(/^data\:image\/webp/)===0?"image/webp":s.search(/\.ktx2($|\?)/i)>0||s.search(/^data\:image\/ktx2/)===0?"image/ktx2":"image/png"}const Yv=new Oe;class jv{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new gv,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,i=-1,r=!1,o=-1;if(typeof navigator<"u"){const a=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(a)===!0;const c=a.match(/Version\/(\d+)/);i=n&&c?parseInt(c[1],10):-1,r=a.indexOf("Firefox")>-1,o=r?a.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||n&&i<17||r&&o<98?this.textureLoader=new Su(this.options.manager):this.textureLoader=new yp(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new yu(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),this.options.crossOrigin==="use-credentials"&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){const n=this,i=this.json,r=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(o){return o._markDefs&&o._markDefs()}),Promise.all(this._invokeAll(function(o){return o.beforeRoot&&o.beforeRoot()})).then(function(){return Promise.all([n.getDependencies("scene"),n.getDependencies("animation"),n.getDependencies("camera")])}).then(function(o){const a={scene:o[0][i.scene||0],scenes:o[0],animations:o[1],cameras:o[2],asset:i.asset,parser:n,userData:{}};return Pi(r,a,i),Un(a,i),Promise.all(n._invokeAll(function(c){return c.afterRoot&&c.afterRoot(a)})).then(function(){for(const c of a.scenes)c.updateMatrixWorld();e(a)})}).catch(t)}_markDefs(){const e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let i=0,r=t.length;i<r;i++){const o=t[i].joints;for(let a=0,c=o.length;a<c;a++)e[o[a]].isBone=!0}for(let i=0,r=e.length;i<r;i++){const o=e[i];o.mesh!==void 0&&(this._addNodeRef(this.meshCache,o.mesh),o.skin!==void 0&&(n[o.mesh].isSkinnedMesh=!0)),o.camera!==void 0&&this._addNodeRef(this.cameraCache,o.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;const i=n.clone(),r=(o,a)=>{const c=this.associations.get(o);c!=null&&this.associations.set(a,c);for(const[l,h]of o.children.entries())r(h,a.children[l])};return r(n,i),i.name+="_instance_"+e.uses[t]++,i}_invokeOne(e){const t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){const i=e(t[n]);if(i)return i}return null}_invokeAll(e){const t=Object.values(this.plugins);t.unshift(this);const n=[];for(let i=0;i<t.length;i++){const r=e(t[i]);r&&n.push(r)}return n}getDependency(e,t){const n=e+":"+t;let i=this.cache.get(n);if(!i){switch(e){case"scene":i=this.loadScene(t);break;case"node":i=this._invokeOne(function(r){return r.loadNode&&r.loadNode(t)});break;case"mesh":i=this._invokeOne(function(r){return r.loadMesh&&r.loadMesh(t)});break;case"accessor":i=this.loadAccessor(t);break;case"bufferView":i=this._invokeOne(function(r){return r.loadBufferView&&r.loadBufferView(t)});break;case"buffer":i=this.loadBuffer(t);break;case"material":i=this._invokeOne(function(r){return r.loadMaterial&&r.loadMaterial(t)});break;case"texture":i=this._invokeOne(function(r){return r.loadTexture&&r.loadTexture(t)});break;case"skin":i=this.loadSkin(t);break;case"animation":i=this._invokeOne(function(r){return r.loadAnimation&&r.loadAnimation(t)});break;case"camera":i=this.loadCamera(t);break;default:if(i=this._invokeOne(function(r){return r!=this&&r.getDependency&&r.getDependency(e,t)}),!i)throw new Error("Unknown type: "+e);break}this.cache.add(n,i)}return i}getDependencies(e){let t=this.cache.get(e);if(!t){const n=this,i=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(i.map(function(r,o){return n.getDependency(e,o)})),this.cache.add(e,t)}return t}loadBuffer(e){const t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[je.KHR_BINARY_GLTF].body);const i=this.options;return new Promise(function(r,o){n.load(Ks.resolveURL(t.uri,i.path),r,void 0,function(){o(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){const t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(n){const i=t.byteLength||0,r=t.byteOffset||0;return n.slice(r,r+i)})}loadAccessor(e){const t=this,n=this.json,i=this.json.accessors[e];if(i.bufferView===void 0&&i.sparse===void 0){const o=oa[i.type],a=us[i.componentType],c=i.normalized===!0,l=new a(i.count*o);return Promise.resolve(new At(l,o,c))}const r=[];return i.bufferView!==void 0?r.push(this.getDependency("bufferView",i.bufferView)):r.push(null),i.sparse!==void 0&&(r.push(this.getDependency("bufferView",i.sparse.indices.bufferView)),r.push(this.getDependency("bufferView",i.sparse.values.bufferView))),Promise.all(r).then(function(o){const a=o[0],c=oa[i.type],l=us[i.componentType],h=l.BYTES_PER_ELEMENT,u=h*c,f=i.byteOffset||0,m=i.bufferView!==void 0?n.bufferViews[i.bufferView].byteStride:void 0,x=i.normalized===!0;let d,g;if(m&&m!==u){const p=Math.floor(f/m),v="InterleavedBuffer:"+i.bufferView+":"+i.componentType+":"+p+":"+i.count;let M=t.cache.get(v);M||(d=new l(a,p*m,i.count*m/h),M=new Rd(d,m/h),t.cache.add(v,M)),g=new Ac(M,c,f%m/h,x)}else a===null?d=new l(i.count*c):d=new l(a,f,i.count*c),g=new At(d,c,x);if(i.sparse!==void 0){const p=oa.SCALAR,v=us[i.sparse.indices.componentType],M=i.sparse.indices.byteOffset||0,_=i.sparse.values.byteOffset||0,y=new v(o[1],M,i.sparse.count*p),S=new l(o[2],_,i.sparse.count*c);a!==null&&(g=new At(g.array.slice(),g.itemSize,g.normalized)),g.normalized=!1;for(let A=0,C=y.length;A<C;A++){const b=y[A];if(g.setX(b,S[A*c]),c>=2&&g.setY(b,S[A*c+1]),c>=3&&g.setZ(b,S[A*c+2]),c>=4&&g.setW(b,S[A*c+3]),c>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}g.normalized=x}return g})}loadTexture(e){const t=this.json,n=this.options,r=t.textures[e].source,o=t.images[r];let a=this.textureLoader;if(o.uri){const c=n.manager.getHandler(o.uri);c!==null&&(a=c)}return this.loadTextureImage(e,r,a)}loadTextureImage(e,t,n){const i=this,r=this.json,o=r.textures[e],a=r.images[t],c=(a.uri||a.bufferView)+":"+o.sampler;if(this.textureCache[c])return this.textureCache[c];const l=this.loadImageSource(t,n).then(function(h){h.flipY=!1,h.name=o.name||a.name||"",h.name===""&&typeof a.uri=="string"&&a.uri.startsWith("data:image/")===!1&&(h.name=a.uri);const f=(r.samplers||{})[o.sampler]||{};return h.magFilter=bh[f.magFilter]||sn,h.minFilter=bh[f.minFilter]||Fn,h.wrapS=wh[f.wrapS]||ii,h.wrapT=wh[f.wrapT]||ii,h.generateMipmaps=!h.isCompressedTexture&&h.minFilter!==Qt&&h.minFilter!==sn,i.associations.set(h,{textures:e}),h}).catch(function(){return null});return this.textureCache[c]=l,l}loadImageSource(e,t){const n=this,i=this.json,r=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(u=>u.clone());const o=i.images[e],a=self.URL||self.webkitURL;let c=o.uri||"",l=!1;if(o.bufferView!==void 0)c=n.getDependency("bufferView",o.bufferView).then(function(u){l=!0;const f=new Blob([u],{type:o.mimeType});return c=a.createObjectURL(f),c});else if(o.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");const h=Promise.resolve(c).then(function(u){return new Promise(function(f,m){let x=f;t.isImageBitmapLoader===!0&&(x=function(d){const g=new Lt(d);g.needsUpdate=!0,f(g)}),t.load(Ks.resolveURL(u,r.path),x,void 0,m)})}).then(function(u){return l===!0&&a.revokeObjectURL(c),Un(u,o),u.userData.mimeType=o.mimeType||qv(o.uri),u}).catch(function(u){throw console.error("THREE.GLTFLoader: Couldn't load texture",c),u});return this.sourceCache[e]=h,h}assignTexture(e,t,n,i){const r=this;return this.getDependency("texture",n.index).then(function(o){if(!o)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(o=o.clone(),o.channel=n.texCoord),r.extensions[je.KHR_TEXTURE_TRANSFORM]){const a=n.extensions!==void 0?n.extensions[je.KHR_TEXTURE_TRANSFORM]:void 0;if(a){const c=r.associations.get(o);o=r.extensions[je.KHR_TEXTURE_TRANSFORM].extendTexture(o,a),r.associations.set(o,c)}}return i!==void 0&&(o.colorSpace=i),e[t]=o,o})}assignFinalMaterial(e){const t=e.geometry;let n=e.material;const i=t.attributes.tangent===void 0,r=t.attributes.color!==void 0,o=t.attributes.normal===void 0;if(e.isPoints){const a="PointsMaterial:"+n.uuid;let c=this.cache.get(a);c||(c=new ro,kn.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,c.sizeAttenuation=!1,this.cache.add(a,c)),n=c}else if(e.isLine){const a="LineBasicMaterial:"+n.uuid;let c=this.cache.get(a);c||(c=new pu,kn.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,this.cache.add(a,c)),n=c}if(i||r||o){let a="ClonedMaterial:"+n.uuid+":";i&&(a+="derivative-tangents:"),r&&(a+="vertex-colors:"),o&&(a+="flat-shading:");let c=this.cache.get(a);c||(c=n.clone(),r&&(c.vertexColors=!0),o&&(c.flatShading=!0),i&&(c.normalScale&&(c.normalScale.y*=-1),c.clearcoatNormalScale&&(c.clearcoatNormalScale.y*=-1)),this.cache.add(a,c),this.associations.set(c,this.associations.get(n))),n=c}e.material=n}getMaterialType(){return It}loadMaterial(e){const t=this,n=this.json,i=this.extensions,r=n.materials[e];let o;const a={},c=r.extensions||{},l=[];if(c[je.KHR_MATERIALS_UNLIT]){const u=i[je.KHR_MATERIALS_UNLIT];o=u.getMaterialType(),l.push(u.extendParams(a,r,t))}else{const u=r.pbrMetallicRoughness||{};if(a.color=new xe(1,1,1),a.opacity=1,Array.isArray(u.baseColorFactor)){const f=u.baseColorFactor;a.color.setRGB(f[0],f[1],f[2],en),a.opacity=f[3]}u.baseColorTexture!==void 0&&l.push(t.assignTexture(a,"map",u.baseColorTexture,Pt)),a.metalness=u.metallicFactor!==void 0?u.metallicFactor:1,a.roughness=u.roughnessFactor!==void 0?u.roughnessFactor:1,u.metallicRoughnessTexture!==void 0&&(l.push(t.assignTexture(a,"metalnessMap",u.metallicRoughnessTexture)),l.push(t.assignTexture(a,"roughnessMap",u.metallicRoughnessTexture))),o=this._invokeOne(function(f){return f.getMaterialType&&f.getMaterialType(e)}),l.push(Promise.all(this._invokeAll(function(f){return f.extendMaterialParams&&f.extendMaterialParams(e,a)})))}r.doubleSided===!0&&(a.side=Et);const h=r.alphaMode||aa.OPAQUE;if(h===aa.BLEND?(a.transparent=!0,a.depthWrite=!1):(a.transparent=!1,h===aa.MASK&&(a.alphaTest=r.alphaCutoff!==void 0?r.alphaCutoff:.5)),r.normalTexture!==void 0&&o!==Fi&&(l.push(t.assignTexture(a,"normalMap",r.normalTexture)),a.normalScale=new fe(1,1),r.normalTexture.scale!==void 0)){const u=r.normalTexture.scale;a.normalScale.set(u,u)}if(r.occlusionTexture!==void 0&&o!==Fi&&(l.push(t.assignTexture(a,"aoMap",r.occlusionTexture)),r.occlusionTexture.strength!==void 0&&(a.aoMapIntensity=r.occlusionTexture.strength)),r.emissiveFactor!==void 0&&o!==Fi){const u=r.emissiveFactor;a.emissive=new xe().setRGB(u[0],u[1],u[2],en)}return r.emissiveTexture!==void 0&&o!==Fi&&l.push(t.assignTexture(a,"emissiveMap",r.emissiveTexture,Pt)),Promise.all(l).then(function(){const u=new o(a);return r.name&&(u.name=r.name),Un(u,r),t.associations.set(u,{materials:e}),r.extensions&&Pi(i,u,r),u})}createUniqueName(e){const t=at.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){const t=this,n=this.extensions,i=this.primitiveCache;function r(a){return n[je.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(a,t).then(function(c){return Th(c,a,t)})}const o=[];for(let a=0,c=e.length;a<c;a++){const l=e[a],h=Xv(l),u=i[h];if(u)o.push(u.promise);else{let f;l.extensions&&l.extensions[je.KHR_DRACO_MESH_COMPRESSION]?f=r(l):f=Th(new Ct,l,t),i[h]={primitive:l,promise:f},o.push(f)}}return Promise.all(o)}loadMesh(e){const t=this,n=this.json,i=this.extensions,r=n.meshes[e],o=r.primitives,a=[];for(let c=0,l=o.length;c<l;c++){const h=o[c].material===void 0?Vv(this.cache):this.getDependency("material",o[c].material);a.push(h)}return a.push(t.loadGeometries(o)),Promise.all(a).then(function(c){const l=c.slice(0,c.length-1),h=c[c.length-1],u=[];for(let m=0,x=h.length;m<x;m++){const d=h[m],g=o[m];let p;const v=l[m];if(g.mode===pn.TRIANGLES||g.mode===pn.TRIANGLE_STRIP||g.mode===pn.TRIANGLE_FAN||g.mode===void 0)p=r.isSkinnedMesh===!0?new Pd(d,v):new Je(d,v),p.isSkinnedMesh===!0&&p.normalizeSkinWeights(),g.mode===pn.TRIANGLE_STRIP?p.geometry=yh(p.geometry,nu):g.mode===pn.TRIANGLE_FAN&&(p.geometry=yh(p.geometry,tc));else if(g.mode===pn.LINES)p=new zd(d,v);else if(g.mode===pn.LINE_STRIP)p=new Pc(d,v);else if(g.mode===pn.LINE_LOOP)p=new Od(d,v);else if(g.mode===pn.POINTS)p=new rc(d,v);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+g.mode);Object.keys(p.geometry.morphAttributes).length>0&&Wv(p,r),p.name=t.createUniqueName(r.name||"mesh_"+e),Un(p,r),g.extensions&&Pi(i,p,g),t.assignFinalMaterial(p),u.push(p)}for(let m=0,x=u.length;m<x;m++)t.associations.set(u[m],{meshes:e,primitives:m});if(u.length===1)return r.extensions&&Pi(i,u[0],r),u[0];const f=new We;r.extensions&&Pi(i,f,r),t.associations.set(f,{meshes:e});for(let m=0,x=u.length;m<x;m++)f.add(u[m]);return f})}loadCamera(e){let t;const n=this.json.cameras[e],i=n[n.type];if(!i){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return n.type==="perspective"?t=new qt(nd.radToDeg(i.yfov),i.aspectRatio||1,i.znear||1,i.zfar||2e6):n.type==="orthographic"&&(t=new kc(-i.xmag,i.xmag,i.ymag,-i.ymag,i.znear,i.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),Un(t,n),Promise.resolve(t)}loadSkin(e){const t=this.json.skins[e],n=[];for(let i=0,r=t.joints.length;i<r;i++)n.push(this._loadNodeShallow(t.joints[i]));return t.inverseBindMatrices!==void 0?n.push(this.getDependency("accessor",t.inverseBindMatrices)):n.push(null),Promise.all(n).then(function(i){const r=i.pop(),o=i,a=[],c=[];for(let l=0,h=o.length;l<h;l++){const u=o[l];if(u){a.push(u);const f=new Oe;r!==null&&f.fromArray(r.array,l*16),c.push(f)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[l])}return new Id(a,c)})}loadAnimation(e){const t=this.json,n=this,i=t.animations[e],r=i.name?i.name:"animation_"+e,o=[],a=[],c=[],l=[],h=[];for(let u=0,f=i.channels.length;u<f;u++){const m=i.channels[u],x=i.samplers[m.sampler],d=m.target,g=d.node,p=i.parameters!==void 0?i.parameters[x.input]:x.input,v=i.parameters!==void 0?i.parameters[x.output]:x.output;d.node!==void 0&&(o.push(this.getDependency("node",g)),a.push(this.getDependency("accessor",p)),c.push(this.getDependency("accessor",v)),l.push(x),h.push(d))}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(c),Promise.all(l),Promise.all(h)]).then(function(u){const f=u[0],m=u[1],x=u[2],d=u[3],g=u[4],p=[];for(let M=0,_=f.length;M<_;M++){const y=f[M],S=m[M],A=x[M],C=d[M],b=g[M];if(y===void 0)continue;y.updateMatrix&&y.updateMatrix();const w=n._createAnimationTracks(y,S,A,C,b);if(w)for(let D=0;D<w.length;D++)p.push(w[D])}const v=new cp(r,void 0,p);return Un(v,i),v})}createNodeMesh(e){const t=this.json,n=this,i=t.nodes[e];return i.mesh===void 0?null:n.getDependency("mesh",i.mesh).then(function(r){const o=n._getNodeRef(n.meshCache,i.mesh,r);return i.weights!==void 0&&o.traverse(function(a){if(a.isMesh)for(let c=0,l=i.weights.length;c<l;c++)a.morphTargetInfluences[c]=i.weights[c]}),o})}loadNode(e){const t=this.json,n=this,i=t.nodes[e],r=n._loadNodeShallow(e),o=[],a=i.children||[];for(let l=0,h=a.length;l<h;l++)o.push(n.getDependency("node",a[l]));const c=i.skin===void 0?Promise.resolve(null):n.getDependency("skin",i.skin);return Promise.all([r,Promise.all(o),c]).then(function(l){const h=l[0],u=l[1],f=l[2];f!==null&&h.traverse(function(m){m.isSkinnedMesh&&m.bind(f,Yv)});for(let m=0,x=u.length;m<x;m++)h.add(u[m]);return h})}_loadNodeShallow(e){const t=this.json,n=this.extensions,i=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];const r=t.nodes[e],o=r.name?i.createUniqueName(r.name):"",a=[],c=i._invokeOne(function(l){return l.createNodeMesh&&l.createNodeMesh(e)});return c&&a.push(c),r.camera!==void 0&&a.push(i.getDependency("camera",r.camera).then(function(l){return i._getNodeRef(i.cameraCache,r.camera,l)})),i._invokeAll(function(l){return l.createNodeAttachment&&l.createNodeAttachment(e)}).forEach(function(l){a.push(l)}),this.nodeCache[e]=Promise.all(a).then(function(l){let h;if(r.isBone===!0?h=new fu:l.length>1?h=new We:l.length===1?h=l[0]:h=new ct,h!==l[0])for(let u=0,f=l.length;u<f;u++)h.add(l[u]);if(r.name&&(h.userData.name=r.name,h.name=o),Un(h,r),r.extensions&&Pi(n,h,r),r.matrix!==void 0){const u=new Oe;u.fromArray(r.matrix),h.applyMatrix4(u)}else r.translation!==void 0&&h.position.fromArray(r.translation),r.rotation!==void 0&&h.quaternion.fromArray(r.rotation),r.scale!==void 0&&h.scale.fromArray(r.scale);if(!i.associations.has(h))i.associations.set(h,{});else if(r.mesh!==void 0&&i.meshCache.refs[r.mesh]>1){const u=i.associations.get(h);i.associations.set(h,{...u})}return i.associations.get(h).nodes=e,h}),this.nodeCache[e]}loadScene(e){const t=this.extensions,n=this.json.scenes[e],i=this,r=new We;n.name&&(r.name=i.createUniqueName(n.name)),Un(r,n),n.extensions&&Pi(t,r,n);const o=n.nodes||[],a=[];for(let c=0,l=o.length;c<l;c++)a.push(i.getDependency("node",o[c]));return Promise.all(a).then(function(c){for(let h=0,u=c.length;h<u;h++)r.add(c[h]);const l=h=>{const u=new Map;for(const[f,m]of i.associations)(f instanceof kn||f instanceof Lt)&&u.set(f,m);return h.traverse(f=>{const m=i.associations.get(f);m!=null&&u.set(f,m)}),u};return i.associations=l(r),r})}_createAnimationTracks(e,t,n,i,r){const o=[],a=e.name?e.name:e.uuid,c=[];pi[r.path]===pi.weights?e.traverse(function(f){f.morphTargetInfluences&&c.push(f.name?f.name:f.uuid)}):c.push(a);let l;switch(pi[r.path]){case pi.weights:l=xs;break;case pi.rotation:l=vs;break;case pi.translation:case pi.scale:l=_s;break;default:switch(n.itemSize){case 1:l=xs;break;case 2:case 3:default:l=_s;break}break}const h=i.interpolation!==void 0?Hv[i.interpolation]:nr,u=this._getArrayFromAccessor(n);for(let f=0,m=c.length;f<m;f++){const x=new l(c[f]+"."+pi[r.path],t.array,u,h);i.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(x),o.push(x)}return o}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){const n=cc(t.constructor),i=new Float32Array(t.length);for(let r=0,o=t.length;r<o;r++)i[r]=t[r]*n;t=i}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(n){const i=this instanceof vs?Bv:Du;return new i(this.times,this.values,this.getValueSize()/3,n)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}function Kv(s,e,t){const n=e.attributes,i=new oi;if(n.POSITION!==void 0){const a=t.json.accessors[n.POSITION],c=a.min,l=a.max;if(c!==void 0&&l!==void 0){if(i.set(new R(c[0],c[1],c[2]),new R(l[0],l[1],l[2])),a.normalized){const h=cc(us[a.componentType]);i.min.multiplyScalar(h),i.max.multiplyScalar(h)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;const r=e.targets;if(r!==void 0){const a=new R,c=new R;for(let l=0,h=r.length;l<h;l++){const u=r[l];if(u.POSITION!==void 0){const f=t.json.accessors[u.POSITION],m=f.min,x=f.max;if(m!==void 0&&x!==void 0){if(c.setX(Math.max(Math.abs(m[0]),Math.abs(x[0]))),c.setY(Math.max(Math.abs(m[1]),Math.abs(x[1]))),c.setZ(Math.max(Math.abs(m[2]),Math.abs(x[2]))),f.normalized){const d=cc(us[f.componentType]);c.multiplyScalar(d)}a.max(c)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}i.expandByVector(a)}s.boundingBox=i;const o=new Vn;i.getCenter(o.center),o.radius=i.min.distanceTo(i.max)/2,s.boundingSphere=o}function Th(s,e,t){const n=e.attributes,i=[];function r(o,a){return t.getDependency("accessor",o).then(function(c){s.setAttribute(a,c)})}for(const o in n){const a=ac[o]||o.toLowerCase();a in s.attributes||i.push(r(n[o],a))}if(e.indices!==void 0&&!s.index){const o=t.getDependency("accessor",e.indices).then(function(a){s.setIndex(a)});i.push(o)}return et.workingColorSpace!==en&&"COLOR_0"in n&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${et.workingColorSpace}" not supported.`),Un(s,e),Kv(s,e,t),Promise.all(i).then(function(){return e.targets!==void 0?Gv(s,e.targets,t):s})}const $e=Math.PI*2,go=(s,e=0,t=1)=>Math.max(e,Math.min(t,s)),qe=(s,e,t)=>s+(e-s)*t,gt=(s,e,t)=>{const n=go((t-s)/(e-s));return n*n*(3-2*n)};function Ze(s,e=0,t=0){let n=Math.imul(s|0,374761393)^Math.imul(e|0,668265263)^Math.imul(t|0,1274126177);return n=Math.imul(n^n>>>13,1274126177),((n^n>>>16)>>>0)/4294967296}function Dn(s){let e=s|0;return()=>{e+=1831565813;let t=e;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}}function Zt(s,e,t=0){const n=Math.floor(s),i=Math.floor(e),r=s-n,o=e-i,a=r*r*(3-2*r),c=o*o*(3-2*o);return qe(qe(Ze(n,i,t),Ze(n+1,i,t),a),qe(Ze(n,i+1,t),Ze(n+1,i+1,t),a),c)}function Eh(s,e,t=0){return Zt(s,e,t)*.58+Zt(s*2.03,e*2.03,t+1)*.28+Zt(s*4.07,e*4.07,t+2)*.14}class ri{constructor(){this.p=[],this.n=[],this.u=[],this.c=[],this.i=[]}vertex(e,t,n,i){const r=this.p.length/3;return this.p.push(...e),this.n.push(...t),this.u.push(...n),this.c.push(...i),r}quad(e,t,n,i,r,o=[0,0,1,1],a=[1,1,1]){const c=this.p.length/3;this.vertex(e,r,[o[0],o[1]],a),this.vertex(t,r,[o[2],o[1]],a),this.vertex(n,r,[o[2],o[3]],a),this.vertex(i,r,[o[0],o[3]],a),this.i.push(c,c+1,c+2,c,c+2,c+3)}tube(e,t,n,i,r=7,o=[1,1,1],a=0){const c=new R(...e),l=new R(...t),h=l.clone().sub(c),u=h.length();h.normalize();const f=new R(0,1,0);Math.abs(h.y)>.96&&f.set(1,0,0),f.cross(h).normalize();const m=h.clone().cross(f).normalize();c.addScaledVector(h,-.025),l.addScaledVector(h,.025);const x=this.p.length/3;for(let d=0;d<=r;d++){let g=d/r*$e;const p=f.clone().multiplyScalar(Math.cos(g)).addScaledVector(m,Math.sin(g)),v=1+Math.sin(g*5)*.07;if(this.vertex(c.clone().addScaledVector(p,n*v).toArray(),p.toArray(),[d/r*1.5,a],o),this.vertex(l.clone().addScaledVector(p,i*v).toArray(),p.toArray(),[d/r*1.5,a+u*.52],o),d<r){const M=x+d*2;this.i.push(M,M+2,M+1,M+2,M+3,M+1)}}}plane(e,t,n,i,r=0,o=[0,0,.5,.5],a=[1,1,1]){const c=new xn().setFromEuler(new gn(r,i,0)),l=new R(0,0,1).applyQuaternion(c).toArray(),h=(u,f)=>new R(u,f,0).applyQuaternion(c).add(new R(...e)).toArray();this.quad(h(-t/2,-n/2),h(t/2,-n/2),h(t/2,n/2),h(-t/2,n/2),l,o,a)}geometry(){const e=new Ct;return e.setAttribute("position",new Ve(this.p,3)),e.setAttribute("normal",new Ve(this.n,3)),e.setAttribute("uv",new Ve(this.u,2)),e.setAttribute("color",new Ve(this.c,3)),e.setIndex(this.i),e.computeBoundingSphere(),e}}function Iu(s,e,t,n,i,r=!1){const o=new R(...t).sub(new R(...e)).normalize(),a=new R(0,1,0).cross(o).normalize(),c=o.clone().cross(a).normalize();for(const[l,h,u]of[[e,n,-1],[t,i,1]]){const f=new R(...l).addScaledVector(o,u*.03),m=o.clone().multiplyScalar(u).toArray(),x=r?.76:0;for(let d=0;d<24;d++){const g=d/24*$e,p=(d+1)/24*$e,v=(_,y)=>{const S=h*y*(1+Math.sin(_*5)*.035);return f.clone().addScaledVector(a,Math.cos(_)*S).addScaledVector(c,Math.sin(_)*S).toArray()},M=s.p.length/3;for(const[_,y]of[[g,x],[g,1],[p,1],[p,x]])s.vertex(v(_,y),m,[.5+Math.cos(_)*y*.5,.5+Math.sin(_)*y*.5],[1,1,1]);s.i.push(M,M+1,M+2,M,M+2,M+3)}}}function $v(){const s=new ri,e=Dn(154);for(let t=0;t<18;t++){const n=e()*$e,i=Math.sqrt(e())*.52,r=Math.cos(n)*i,o=Math.sin(n)*i,a=.38+e()*.62,c=.0035+e()*.005,l=Math.sin(n),h=Math.cos(n);for(let u=0;u<3;u++){const f=u/3,m=(u+1)/3,x=c*(1-f),d=c*(1-m),g=(p,v,M)=>[r+l*p*p*a*.38+h*v*M,a*p,o+h*p*p*a*.38-l*v*M];s.quad(g(f,-1,x),g(f,1,x),g(m,1,d),g(m,-1,d),[h,.3,-l],[0,f,1,m],[.54+f*.38,.6+f*.3,.35+f*.3])}if(t<3){const u=r+l*a*.38,f=o+h*a*.38;for(let m=0;m<5;m++){const x=a+m*.025,d=.013*(1-m/6);s.plane([u,x,f],d*2,.06,n,.2,[0,0,1,1],[.7,.61,.42])}}}return s.geometry()}function Lu(){const s=new Hn(.24,.24,2,2);s.rotateX(-Math.PI/2);const e=s.attributes.position;for(let t=0;t<e.count;t++)e.setY(t,.013*Math.pow(e.getZ(t)/.12,2)+Math.sin(e.getX(t)*16)*.006);return s.computeVertexNormals(),s.setAttribute("color",new Ve(new Array(e.count*3).fill(1),3)),s}function Zv(){const s=Lu(),e=new ri,t=Dn(819),n=s.attributes.position,i=s.attributes.normal,r=s.attributes.uv,o=s.index.array;for(let a=0;a<34;a++){const c=new Oe().compose(new R(t()-.5,.008+t()*.055,t()-.5),new xn().setFromEuler(new gn((t()-.5)*.45,t()*$e,(t()-.5)*.4)),new R().setScalar(.46+t()*.4)),l=new He().getNormalMatrix(c),h=e.p.length/3,u=new xe([15713413,14132846,13141329,13219961,15250549][a%5]);for(let f=0;f<n.count;f++)e.vertex(new R().fromBufferAttribute(n,f).applyMatrix4(c).toArray(),new R().fromBufferAttribute(i,f).applyMatrix3(l).normalize().toArray(),[r.getX(f),r.getY(f)],u.toArray());for(const f of o)e.i.push(h+f)}return s.dispose(),e.geometry()}function Jv(s){const e=new fo(1,2),t=e.attributes.position,n=[];for(let r=0;r<t.count;r++){let o=t.getX(r),a=t.getY(r),c=t.getZ(r),l=1+Math.sin(o*11+c*4)*.12+Math.sin(c*7+a*6)*.12;t.setXYZ(r,o*l,a*l*.76,c*l);const h=new xe().setRGB(.7+Math.max(0,a)*.25,.74+Math.max(0,a)*.24,.57+Math.max(0,a)*.3);n.push(...h.toArray())}e.setAttribute("color",new Ve(n,3));const i=[];for(let r=0;r<t.count;r++)i.push(t.getX(r)*.6,t.getZ(r)*.6+t.getY(r)*.5);return e.setAttribute("uv",new Ve(i,2)),e.computeVertexNormals(),e}const lc=Math.PI*2,Ah=(s,e)=>{let t=s-e;for(;t>Math.PI;)t-=lc;for(;t<-Math.PI;)t+=lc;return t};function Rh(s,e,t,n,i){const r=[0,.16],o=[],a=150,c=i()*10;for(let h=0;h<=a;h++){const u=-Math.PI+h/a*lc;let f=e,m=0;for(const[x,d,g]of s){const p=Math.abs(Ah(u,x))/g;if(p<1){const v=e+(d-e)*Math.pow(1-p,1.35);v>f&&(f=v,m=1-p)}}f*=1+n*Math.pow(Math.max(0,Math.sin(u*t+c)),2)*Math.min(1,m*3),Math.abs(Ah(u,Math.PI))<.25&&(f=Math.min(f,e*.7)),o.push(r[0]+f*Math.sin(u),r[1]-f*Math.cos(u))}const l=s.map(([h,u])=>[r[0],r[1],r[0]+.85*u*Math.sin(h),r[1]-.85*u*Math.cos(h)]);return{pts:o,veins:l,stem:[r[0],r[1],.02,.5]}}function ts(s,e,t){const o=[],a=[];for(let l=0;l<=90;l++){const h=l/90;a.push([s(h),.3+(-.5-.3)*h])}for(const[l,h]of a)o.push(l,h);for(let l=a.length-1;l>=0;l--)o.push(-a[l][0]*(.94+.06*t()),a[l][1]);const c=[[0,.3,0,-.5+.03]];for(let l=1;l<=e;l++){const h=(l-.4)/(e+.4),u=.3+(-.5-.3)*h,f=s(Math.min(1,h+.08))*.92;c.push([0,u,f,u+(-.5-.3)*.1],[0,u,-f,u+(-.5-.3)*.1])}return{pts:o,veins:c,stem:[0,.3,0,.5]}}function Qv(s,e){switch(s){case"maple":{const t=()=>.92+.16*e();return Rh([[0,.66*t(),.5],[1.05,.6*t(),.44],[-1.05,.6*t(),.44],[2,.34*t(),.4],[-2,.34*t(),.4]],.15,9,.12,e)}case"redmaple":{const t=()=>.92+.16*e();return Rh([[0,.6*t(),.62],[.95,.5*t(),.55],[-.95,.5*t(),.55],[1.9,.22,.4],[-1.9,.22,.4]],.2,26,.06,e)}case"oak":{const t=3+Math.floor(e()*2),n=.25+e()*.2;return ts(i=>.34*Math.pow(Math.sin(Math.PI*Math.pow(i,.85)),.7)*(.5+.5*Math.pow(Math.abs(Math.cos(Math.PI*(t*i+n))),.6))+.012,t,e)}case"redoak":{const t=3+Math.floor(e()*2);return ts(n=>.36*Math.pow(Math.sin(Math.PI*Math.pow(n,.8)),.6)*(.3+.7*Math.pow(Math.abs(Math.cos(Math.PI*(t*n+.3))),2.6))+.014,t,e)}case"beech":return ts(t=>.24*Math.pow(Math.sin(Math.PI*t),.85)*(1+.035*Math.sin(t*Math.PI*22))+.004,8,e);case"birch":return ts(t=>.33*Math.pow(t+.02,.35)*Math.pow(1-t,.95)*1.75*(1+.05*Math.abs(Math.sin(t*Math.PI*16))),6,e);case"aspen":return ts(t=>.4*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.02)),.6)*(1+.03*Math.abs(Math.sin(t*Math.PI*14))),4,e);case"ginkgo":{const t=[0,.22],n=[t[0],t[1]],i=60;for(let o=0;o<=i;o++){const a=-.95+o/i*1.9;let c=.62*(1-.18*Math.abs(a))*(1+.025*Math.sin(a*40));c-=.2*Math.exp(-Math.pow(a/.06,2)),n.push(t[0]+c*Math.sin(a),t[1]-c*Math.cos(a))}const r=[];for(let o=-4;o<=4;o++){const a=o*.2;r.push([t[0],t[1],t[0]+.56*Math.sin(a),t[1]-.56*Math.cos(a)])}return{pts:n,veins:r,stem:[0,.22,0,.5]}}case"needle":default:return ts(t=>.03*Math.sin(Math.PI*t)+.004,0,e)}}function e_(s){const e=new Path2D,t=s.pts;e.moveTo(t[0],t[1]);for(let n=2;n<t.length;n+=2)e.lineTo(t[n],t[n+1]);return e.closePath(),e}function Gc(s){let e=s>>>0;return()=>{e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}class t_{constructor(e){this.f=Gc(e)}next(){return this.f()}range(e,t){return e+(t-e)*this.f()}int(e){return Math.floor(this.f()*e)}chance(e){return this.f()<e}pick(e){return e[Math.floor(this.f()*e.length)]}sign(){return this.f()<.5?-1:1}gauss(){let e=0;for(let t=0;t<4;t++)e+=this.f();return(e-2)*.866}}const Ii=new Uint8Array(512),Kr=new Float32Array(16),$r=new Float32Array(16);for(let s=0;s<16;s++){const e=s/16*Math.PI*2+.13;Kr[s]=Math.cos(e),$r[s]=Math.sin(e)}{const s=Gc(20261016),e=Array.from({length:256},(t,n)=>n);for(let t=255;t>0;t--){const n=Math.floor(s()*(t+1)),i=e[t];e[t]=e[n],e[n]=i}for(let t=0;t<512;t++)Ii[t]=e[t&255]}const n_=.5*(Math.sqrt(3)-1),ks=(3-Math.sqrt(3))/6;function i_(s,e){const t=(s+e)*n_,n=Math.floor(s+t),i=Math.floor(e+t),r=(n+i)*ks,o=s-n+r,a=e-i+r,c=o>a?1:0,l=1-c,h=o-c+ks,u=a-l+ks,f=o-1+2*ks,m=a-1+2*ks,x=n&255,d=i&255;let g=0,p,v;return p=.5-o*o-a*a,p>0&&(v=Ii[x+Ii[d]]&15,p*=p,g+=p*p*(Kr[v]*o+$r[v]*a)),p=.5-h*h-u*u,p>0&&(v=Ii[x+c+Ii[d+l]]&15,p*=p,g+=p*p*(Kr[v]*h+$r[v]*u)),p=.5-f*f-m*m,p>0&&(v=Ii[x+1+Ii[d+1]]&15,p*=p,g+=p*p*(Kr[v]*f+$r[v]*m)),99*g}const hc=["maple","redmaple","oak","beech","birch","aspen","ginkgo","japanese","spruce","pine","larch","sumac"],zi=4,uc=3,s_=512,r_=s=>hc.indexOf(s),o_={maple:{leaf:"maple",size:.17,pairs:!0,nodes:7,twigs:6,petiole:.07,droop:.2},redmaple:{leaf:"redmaple",size:.15,pairs:!0,nodes:8,twigs:6,petiole:.06,droop:.15},oak:{leaf:"redoak",size:.19,pairs:!1,nodes:7,twigs:6,petiole:.025,droop:.1,whorl:!0},beech:{leaf:"beech",size:.13,pairs:!1,nodes:11,twigs:7,petiole:.012,droop:.12,flat:!0},birch:{leaf:"birch",size:.11,pairs:!1,nodes:11,twigs:8,petiole:.025,droop:.45},aspen:{leaf:"aspen",size:.11,pairs:!1,nodes:10,twigs:8,petiole:.05,droop:.25},ginkgo:{leaf:"ginkgo",size:.12,pairs:!1,nodes:10,twigs:7,petiole:.04,droop:.2,spur:!0},japanese:{leaf:"maple",size:.11,pairs:!0,nodes:9,twigs:8,petiole:.05,droop:.3,fine:!0},sumac:{leaf:"beech",size:.1,pairs:!0,nodes:12,twigs:6,petiole:0,droop:.35,compound:!0}};function Ch(s){const e=document.createElement("canvas");return e.width=e.height=s,e.getContext("2d",{willReadFrequently:!0})}function oo(s,e,t,n,i,r){const o=[];let a=s,c=e,l=t;for(let h=0;h<=r;h++)o.push([a,c,l]),l+=i/r,a+=Math.cos(l)*n/r,c+=Math.sin(l)*n/r;return o}function Uu(s,e,t,n,i){for(let r=1;r<t.length;r++){const o=n+(i-n)*(r/t.length);for(const[a,c]of[[s,"rgb(58,0,0)"],[e,"#fff"]])a.strokeStyle=c,a.lineWidth=o,a.lineCap="round",a.beginPath(),a.moveTo(t[r-1][0],t[r-1][1]),a.lineTo(t[r][0],t[r][1]),a.stroke()}}function a_(s,e,t,n,i,r,o,a,c){const{cc:l,cm:h}=s,u=e+Math.cos(n)*r*s.S,f=t+Math.sin(n)*r*s.S;if(r>0)for(const[S,A]of[[l,"rgb(74,0,0)"],[h,"#fff"]])S.strokeStyle=A,S.lineWidth=1.6,S.beginPath(),S.moveTo(e,t),S.lineTo(u,f),S.stroke();const m=i*s.S*(.82+.36*c()),x=n+Math.PI/2,d=u+Math.cos(n)*m*.5,g=f+Math.sin(n)*m*.5,p=.8+.2*c(),v=S=>S.setTransform(m*p*Math.cos(x),m*p*Math.sin(x),-m*Math.sin(x),m*Math.cos(x),d,g),M=.72+.28*c(),_=Math.round(255*c()),y=S=>Math.round(255*Math.min(1,S));v(l),l.fillStyle=`rgb(${y(M*.92)},${_},255)`,l.fill(a),c()<.6&&(l.save(),l.scale(.6,.72),l.translate((c()-.5)*.2,(c()-.5)*.2),l.fillStyle=`rgb(${y(M*1.05)},${_},255)`,l.fill(a),l.restore()),l.strokeStyle=`rgba(${y(M*.55)},${_},255,0.5)`,l.lineWidth=1.4/m,l.stroke(a),l.strokeStyle=`rgba(${y(M*.8)},${_},255,0.7)`,l.lineWidth=1.1/m,l.beginPath();for(const[S,A,C,b]of o.veins)l.moveTo(S,A),l.lineTo(C,b);l.stroke(),v(h),h.fillStyle="#fff",h.fill(a);for(const S of[l,h])S.setTransform(1,0,0,1,0,0)}function c_(s,e,t){const n=o_[e],i=s.S,r=[];for(let l=0;l<5;l++){const h=Qv(n.leaf,t);r.push({sh:h,path:e_(h)})}const o=oo(i*.5,i*.98,-Math.PI/2+(t()-.5)*.3,i*.86,(t()-.5)*.5,24),a=[o];for(let l=0;l<n.twigs;l++){const h=o[Math.floor(4+l/n.twigs*16+t()*2)],u=l%2?1:-1,f=h[2]+u*(.6+t()*.5);a.push(oo(h[0],h[1],f,i*(.26+t()*.18)*(1-l/(n.twigs*1.6)),-u*(.2+t()*.4),12))}for(const l of a)Uu(s.cc,s.cm,l,l===o?i*.013:i*.008,i*.004);const c=[];for(const l of a){const h=l===o?n.nodes+2:n.nodes;for(let u=1;u<=h;u++){const f=Math.min(l.length-1,Math.floor(u/h*(l.length-1))),[m,x,d]=l[f],g=n.pairs?[-1,1]:[u%2?1:-1];for(const p of g){const v=n.compound?1.35:.75+t()*.6,M=d+p*v+n.droop*(t()-.3);c.push([m,x,M,u/h])}if(u===h&&c.push([m,x,d+(t()-.5)*.3,1]),n.spur&&t()<.6)for(let p=0;p<3;p++)c.push([m,x,d+(p-1)*.7+(t()-.5)*.4,u/h])}}c.sort((l,h)=>l[3]-h[3]);for(const[l,h,u,f]of c){const{sh:m,path:x}=r[Math.floor(t()*r.length)],d=n.size*(.75+.35*f);a_(s,l,h,u,d,n.petiole,m,x,t)}}function l_(s,e,t){const n=s.S,{cc:i,cm:r}=s,o=e==="spruce",a=e==="larch",c=oo(n*.5,n*.99,-Math.PI/2+(t()-.5)*.2,n*.92,(t()-.5)*.3,30),l=[c],h=o?9:a?7:5;for(let u=0;u<h;u++){const f=c[Math.floor(3+u/h*24)];for(const m of[-1,1]){const x=n*(.32-.2*(u/h))*(.8+.4*t());l.push(oo(f[0],f[1],f[2]+m*(.75+t()*.3),x,-m*.15,10))}}for(const u of l)Uu(i,r,u,u===c?n*.012:n*.006,n*.003);for(const u of l)for(let f=0;f<u.length;f++){const[m,x,d]=u[f];if(a){if(f%2)continue;const g=14;for(let p=0;p<g;p++){const v=d+(p/g-.5)*2.6+(t()-.5)*.3,M=n*(.035+.02*t());la(s,m,x,v,M,n*.004,t)}}else if(o)for(const g of[-1,1,-1,1]){const p=d+g*(.9+t()*.6),v=n*(.03+.015*t());la(s,m,x,p,v,n*.0055,t)}else{if(f<u.length-4)continue;for(let g=0;g<18;g++){const p=d+(g/18-.5)*2.2+(t()-.5)*.2,v=n*(.1+.04*t());la(s,m,x,p,v,n*.004,t)}}}}function la(s,e,t,n,i,r,o){const{cc:a,cm:c}=s,l=e+Math.cos(n)*i,h=t+Math.sin(n)*i,u=Math.round(255*(.65+.35*o())),f=Math.round(255*o());for(const[m,x]of[[a,`rgb(${u},${f},255)`],[c,"#fff"]])m.strokeStyle=x,m.lineWidth=r,m.lineCap="round",m.beginPath(),m.moveTo(e,t),m.lineTo(l,h),m.stroke()}function h_(s=3){const e=s_,t=e*zi,n=e*uc,i=new Uint8Array(t*n*4),r=Gc(s);for(let a=0;a<hc.length;a++){const c=hc[a],l={S:e,cc:Ch(e),cm:Ch(e)};for(const x of[l.cc,l.cm])x.fillStyle="#000",x.fillRect(0,0,e,e);c==="spruce"||c==="pine"||c==="larch"?l_(l,c,r):c_(l,c,r);const h=l.cc.getImageData(0,0,e,e).data,u=l.cm.getImageData(0,0,e,e).data,f=a%zi*e,m=Math.floor(a/zi)*e;for(let x=0;x<e;x++)for(let d=0;d<e;d++){const g=(x*e+d)*4,p=((m+x)*t+f+d)*4,v=u[g],M=v>0?255/v:0;i[p]=Math.min(255,h[g]*M),i[p+1]=Math.min(255,h[g+1]*M),i[p+2]=h[g+2]*M>128?255:0,i[p+3]=v}}u_(i,t,n,6);const o=new Rc(i,t,n,ln);return o.flipY=!1,o.magFilter=sn,o.minFilter=Fn,o.generateMipmaps=!0,o.anisotropy=4,o.colorSpace=Jn,o.wrapS=o.wrapT=Tn,o.needsUpdate=!0,o}function u_(s,e,t,n){const i=new Uint8Array(s.length),r=new Uint8Array(e*t);for(let a=0;a<e*t;a++)r[a]=s[a*4+3]>0?1:0;const o=new Uint8Array(e*t);for(let a=0;a<n;a++){i.set(s),o.set(r);for(let c=1;c<t-1;c++){let l=c*e;for(let h=1;h<e-1;h++){if(l=c*e+h,r[l])continue;const u=r[l+1],f=r[l-1],m=r[l+e],x=r[l-e],d=u+f+m+x;if(!d)continue;let g=0,p=0,v=0;if(u){const _=(l+1)*4;g+=s[_],p+=s[_+1],v+=s[_+2]}if(f){const _=(l-1)*4;g+=s[_],p+=s[_+1],v+=s[_+2]}if(m){const _=(l+e)*4;g+=s[_],p+=s[_+1],v+=s[_+2]}if(x){const _=(l-e)*4;g+=s[_],p+=s[_+1],v+=s[_+2]}const M=l*4;i[M]=g/d,i[M+1]=p/d,i[M+2]=v/d,o[l]=1}}s.set(i),r.set(o)}}function Nu(s,e=0,t=0){const n=s*.037-e*.004-t*.002,i=.42+.32*(.5+.5*Math.sin(n))+.26*Math.pow(.5+.5*Math.sin(n*2.73+1.9),3),r=.5+.5*Math.sin(s*.0057+Math.sin(s*.0019));return{gust:i,cloud:r,sun:1-r*.27}}const Fu={value:.65},Ph="varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",f_=`
#include <packing>
uniform sampler2D depthTex;uniform sampler2D shadowTex;
uniform mat4 invProjection;uniform mat4 cameraWorld;uniform mat4 shadowMatrix;
uniform vec3 cameraPos;uniform vec3 sunDirection;uniform vec3 lightColor;
uniform float baseHeight;uniform float density;uniform float enabled;
varying vec2 vUv;
float hash(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
void main(){
 if(enabled<.5){gl_FragColor=vec4(0.);return;}
 float depth=texture2D(depthTex,vUv).x;
 vec4 vp=invProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);vp/=vp.w;
 vec3 delta=(cameraWorld*vec4(vp.xyz,1.)).xyz-cameraPos;
 float distance=min(length(delta),115.);vec3 direction=normalize(delta);
 float stepSize=distance/24.,lit=0.,transmittance=1.;
 float jitter=hash(gl_FragCoord.xy);
 for(int i=0;i<24;i++){
  vec3 p=cameraPos+direction*(float(i)+jitter)*stepSize;
  vec4 q=shadowMatrix*vec4(p,1.);
  float visible=1.;
  if(q.x>0.&&q.x<1.&&q.y>0.&&q.y<1.&&q.z>0.&&q.z<1.){
   float d=unpackRGBAToDepth(texture2D(shadowTex,q.xy));visible=smoothstep(q.z-.0015,q.z-.0005,d);
  }
  float air=density*exp(-max(-8.,p.y-baseHeight)*.065);
  float extinction=exp(-air*stepSize);lit+=visible*transmittance*(1.-extinction);transmittance*=extinction;
 }
 float mu=dot(direction,sunDirection),g=.57;
 float phase=(1.-g*g)/pow(max(.01,1.+g*g-2.*g*mu),1.5);
 gl_FragColor=vec4(lightColor*lit*(.13+phase*.18),1.-transmittance);
}`;class d_{constructor(e,t,n){this.renderer=e,this.camera=t,this.sun=n,this.target=new Cn(1,1,{type:si,depthBuffer:!1}),this.material=new Yt({vertexShader:Ph,fragmentShader:f_,depthTest:!1,depthWrite:!1,uniforms:{depthTex:{value:null},shadowTex:{value:null},invProjection:{value:t.projectionMatrixInverse},cameraWorld:{value:t.matrixWorld},shadowMatrix:{value:n.shadow.matrix},cameraPos:{value:t.position},sunDirection:{value:new R},lightColor:{value:new xe},baseHeight:{value:0},density:{value:.003},enabled:{value:0}}}),this.scene=new no,this.scene.add(new Je(new Hn(2,2),this.material)),this.postCamera=new uo,this.exposureTargets=[0,1].map(()=>new Cn(1,1,{type:si,depthBuffer:!1})),this.exposureIndex=0,this.first=!0,this.lastTime=0,this.exposureMaterial=new Yt({vertexShader:Ph,depthTest:!1,depthWrite:!1,uniforms:{sceneTex:{value:null},depthTex:{value:null},previous:{value:this.exposureTargets[0].texture},blend:{value:1}},fragmentShader:"uniform sampler2D sceneTex;uniform sampler2D depthTex;uniform sampler2D previous;uniform float blend;varying vec2 vUv;void main(){float sum=0.,weights=0.;for(int j=0;j<4;j++)for(int i=0;i<6;i++){vec2 uv=vec2(.12+float(i)*.152,.1+float(j)*.21);vec3 c=texture2D(sceneTex,uv).rgb;float w=texture2D(depthTex,uv).x>.99999?.15:1.;sum+=log(max(.004,dot(c,vec3(.2126,.7152,.0722))))*w;weights+=w;}float average=exp(sum/max(weights,1.));float target=clamp(pow(.16/average,.36),.9,1.5);float old=clamp(texture2D(previous,vec2(.5)).r,.9,1.5);gl_FragColor=vec4(mix(old,target,blend),0.,0.,1.);}"}),this.exposureScene=new no,this.exposureScene.add(new Je(new Hn(2,2),this.exposureMaterial))}resize(e,t){this.target.setSize(Math.max(2,Math.round(e/2)),Math.max(2,Math.round(t/2)))}render(e,t,n,i){const r=this.material.uniforms;r.depthTex.value=e,r.shadowTex.value=this.sun.shadow.map?.texture,r.enabled.value=r.shadowTex.value?1:0,r.sunDirection.value.copy(t),r.lightColor.value.copy(this.sun.color).multiplyScalar(this.sun.intensity*.9),r.baseHeight.value=n,r.density.value=i,this.renderer.setRenderTarget(this.target),this.renderer.render(this.scene,this.postCamera)}adapt(e,t,n){const i=this.exposureMaterial.uniforms;return i.sceneTex.value=e,i.depthTex.value=t,i.previous.value=this.exposureTargets[this.exposureIndex].texture,i.blend.value=this.first?1:1-Math.exp(-Math.max(0,Math.min(.15,n-this.lastTime))*1.1),this.exposureIndex=1-this.exposureIndex,this.renderer.setRenderTarget(this.exposureTargets[this.exposureIndex]),this.renderer.render(this.exposureScene,this.postCamera),this.first=!1,this.lastTime=n,this.exposureTargets[this.exposureIndex].texture}}const ha=[15250492,13072418,12469534,15125079,10301216,13404964,8491076,14000971],Jt={time:{value:0},player:{value:new R},sun:{value:new R(-.65,.5,.3).normalize()}},ua={active:!1};function Wc(s){const e=new Dc(s);return e.colorSpace=Pt,e.anisotropy=8,e}function p_(s,e){if(s.beginPath(),e===0)[[0,-1],[.14,-.61],[.36,-.76],[.34,-.43],[.73,-.57],[.57,-.21],[.95,-.18],[.67,.07],[.78,.29],[.38,.25],[.32,.55],[.09,.48],[0,.77],[-.09,.48],[-.32,.55],[-.38,.25],[-.78,.29],[-.67,.07],[-.95,-.18],[-.57,-.21],[-.73,-.57],[-.34,-.43],[-.36,-.76],[-.14,-.61]].forEach((n,i)=>i?s.lineTo(...n):s.moveTo(...n));else if(e===1){s.moveTo(0,-1);for(let t=0;t<=24;t++){let n=t/24*Math.PI;const i=Math.sin(n)*(.74+t%2*.07);s.lineTo(i,-Math.cos(n))}for(let t=24;t>=0;t--){let n=t/24*Math.PI;const i=Math.sin(n)*(.74+t%2*.07);s.lineTo(-i,-Math.cos(n))}}else{s.moveTo(0,-1);for(let t=0;t<=18;t++){const n=t/18*Math.PI;s.lineTo(Math.sin(n)*(.56+.17*Math.cos(n*12)),-Math.cos(n))}for(let t=18;t>=0;t--){const n=t/18*Math.PI;s.lineTo(-Math.sin(n)*(.56+.17*Math.cos(n*12)),-Math.cos(n))}}s.closePath()}function fa(s,e,t,n,i,r,o,a=0){s.save(),s.translate(e,t),s.rotate(i),s.scale(n,n);const c=66+o()*19+a,l=44+o()*13,h=s.createLinearGradient(-.6,-.6,.7,.8);h.addColorStop(0,`hsl(${l},55%,${c+8}%)`),h.addColorStop(.48,`hsl(${l-3},61%,${c}%)`),h.addColorStop(1,`hsl(${l-9},54%,${c-19}%)`),p_(s,r),s.fillStyle=h,s.fill(),s.save(),s.clip();for(let u=0;u<18;u++)s.beginPath(),s.ellipse(o()*1.7-.85,o()*1.7-.85,.012+o()*.09,.01+o()*.045,o()*$e,0,$e),s.fillStyle=`rgba(72,48,18,${o()*.13})`,s.fill();s.lineWidth=.019,s.strokeStyle="rgba(78,54,20,.3)",s.beginPath(),s.moveTo(0,.95),s.lineTo(0,-.96);for(let u=0;u<7;u++){let f=.55-u*.22;s.moveTo(0,f),s.lineTo(.6-Math.abs(f)*.2,f-.35),s.moveTo(0,f),s.lineTo(-(.6-Math.abs(f)*.2),f-.35)}s.stroke(),s.lineWidth=.008,s.strokeStyle="rgba(255,240,157,.42)",s.beginPath(),s.moveTo(.02,.9),s.lineTo(.02,-.94),s.stroke(),s.restore(),s.lineWidth=.025,s.strokeStyle="#877248",s.beginPath(),s.moveTo(0,.6),s.quadraticCurveTo(.05,.9,.07,1.08),s.stroke(),s.restore()}function m_(){const s=document.createElement("canvas");s.width=2048,s.height=1024;const e=s.getContext("2d"),t=Dn(221);for(let n=0;n<4;n++){const i=n%2*1024,r=Math.floor(n/2)*512;if(e.save(),e.translate(i,r),n<3){e.strokeStyle="#695333",e.lineCap="round";for(let o=0;o<9;o++){const a=90+o*93,c=365-Math.sin(o/8*Math.PI)*190;e.lineWidth=3.3,e.beginPath(),e.moveTo(500,490),e.quadraticCurveTo(500,250,a,c-75),e.stroke();for(let l=0;l<13;l++){const h=l/13,u=500+(a-500)*h+(t()-.5)*105,f=470+(c-470)*h+(t()-.5)*94;fa(e,u,f,21+t()*21,t()*$e,n,t)}}for(let o=0;o<36;o++){let a=t()*$e,c=Math.sqrt(t());fa(e,510+Math.cos(a)*c*455,240+Math.sin(a)*c*195,18+t()*26,t()*$e,n,t)}}else for(let o=0;o<8;o++)fa(e,90+o*118,250,65+o%3*8,(t()-.5)*.8,o%3,t);e.restore()}return Wc(s)}function g_(){const s=document.createElement("canvas");s.width=512,s.height=1024;const e=s.getContext("2d"),t=Dn(720631),n=e.createImageData(512,1024);for(let r=0;r<1024;r++)for(let o=0;o<512;o++){const a=(r*512+o)*4,c=Math.sin(o*.051)*3+Math.sin(o*.147+r*.003)*1.6,l=(t()-.5)*12,h=Math.sin(r*.15+o*.014)*1.7,u=204+c+l+h;n.data[a]=u+5,n.data[a+1]=u+3,n.data[a+2]=u-5,n.data[a+3]=255}e.putImageData(n,0,0);for(let r=0;r<65;r++){const o=t()*512,a=t()*1024,c=10+t()*68,l=3+t()*19,h=e.createRadialGradient(o,a,0,o,a,c);h.addColorStop(0,`rgba(118,103,77,${.03+t()*.065})`),h.addColorStop(1,"rgba(118,103,77,0)"),e.fillStyle=h,e.save(),e.translate(o,a),e.scale(1,l/c),e.translate(-o,-a),e.fillRect(o-c,a-c,c*2,c*2),e.restore()}for(let r=0;r<1050;r++){const o=t()*512,a=t()*1024,c=2+Math.pow(t(),3)*42,l=.35+t()*1.8;e.strokeStyle=`rgba(53,50,41,${.18+t()*.42})`,e.lineWidth=l,e.beginPath(),e.moveTo(o,a),e.quadraticCurveTo(o+c*.5,a+(t()-.5)*2.8,o+c,a+(t()-.5)*1.4),e.stroke(),c>18&&(e.strokeStyle="rgba(245,240,220,.54)",e.lineWidth=.9,e.beginPath(),e.moveTo(o+1,a+l+1),e.lineTo(o+c*.82,a+l+1),e.stroke())}for(let r=0;r<23;r++){const o=t()*512,a=t()*1024,c=13+t()*37,l=3+t()*7;e.beginPath(),e.moveTo(o-c,a);for(let h=1;h<=8;h++){const u=h/8;e.lineTo(o-c+u*c*2,a-Math.sin(u*Math.PI)*l*(.45+t()*.6))}for(let h=7;h>=0;h--){const u=h/8;e.lineTo(o-c+u*c*2,a+Math.sin(u*Math.PI)*l*(.24+t()*.36))}e.closePath(),e.fillStyle=`rgba(38,37,32,${.72+t()*.21})`,e.fill(),e.strokeStyle="rgba(237,234,216,.87)",e.lineWidth=1.2,e.stroke(),e.beginPath(),e.moveTo(o-c*.8,a+l*.9),e.quadraticCurveTo(o,a+l*1.6,o+c*.8,a+l*.6),e.strokeStyle="rgba(129,118,94,.53)",e.lineWidth=.8,e.stroke()}const i=Wc(s);return i.wrapS=i.wrapT=ii,i.repeat.set(1,2),i}function x_(){const s=document.createElement("canvas");s.width=s.height=256;const e=s.getContext("2d"),t=Dn(3842);e.fillStyle="#a5946c",e.fillRect(0,0,256,256);for(let n=0;n<15e3;n++)e.fillStyle=`rgba(45,35,20,${t()*.14})`,e.fillRect(t()*256,t()*256,1+t()*2,1+t()*2);for(let n=0;n<47;n++){e.beginPath();for(let i=0;i<=120;i++){const r=i/120*$e,o=n*2.8+Math.sin(r*3+n*.09)*2+Math.sin(r*7)*.6,a=124+Math.cos(r)*o,c=132+Math.sin(r)*o*.96;i?e.lineTo(a,c):e.moveTo(a,c)}e.strokeStyle=`rgba(62,43,22,${.13+t()*.2})`,e.lineWidth=.4+t()*.7,e.stroke()}for(let n=0;n<5;n++){const i=t()*$e;e.strokeStyle="rgba(39,28,17,.6)",e.lineWidth=.4+t(),e.beginPath(),e.moveTo(128+Math.cos(i)*128,128+Math.sin(i)*128),e.lineTo(128+Math.cos(i+.04)*75,128+Math.sin(i+.04)*75),e.lineTo(128+Math.cos(i-.02)*49,128+Math.sin(i-.02)*49),e.stroke()}return Wc(s)}function mi(s,e=.1,t=!1,n=!1){return s.onBeforeCompile=i=>{i.uniforms.uWind=Fu,i.uniforms.uTime=Jt.time,i.uniforms.uPlayer=Jt.player,i.uniforms.uSun=Jt.sun,i.vertexShader=`uniform float uWind;uniform float uTime; uniform vec3 uPlayer; varying vec3 vForestWorld;
`+i.vertexShader,i.vertexShader=i.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
      vec3 root=position;
      #ifdef USE_INSTANCING
      root=(instanceMatrix*vec4(position,1.)).xyz;
      #endif
      float front=uTime*.75-root.x*.055-root.z*.036;
      float wind=(sin(front)+sin(front*2.31+1.4)*.26)*uWind;
      float flex=${n?"pow(clamp(position.y*1.7,0.,1.),1.8)":"clamp(position.y*.12,0.,1.)"};
      transformed.x+=wind*${e.toFixed(3)}*flex;
      transformed.z+=wind*${(e*.58).toFixed(3)}*flex;
      ${n?"vec2 away=root.xz-uPlayer.xz;float d=length(away);transformed.xz+=away/max(d,.01)*(1.-smoothstep(.25,1.25,d))*.24*flex;":""}
      vForestWorld=(modelMatrix*vec4(root,1.)).xyz;
    `),i.fragmentShader=`uniform vec3 uSun; varying vec3 vForestWorld;
`+i.fragmentShader,i.fragmentShader=i.fragmentShader.replace("#include <shadowmap_pars_fragment>",`#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>`),i.fragmentShader=i.fragmentShader.replace("#include <opaque_fragment>",`${t?`float transmission=pow(max(0.,dot(normalize(vForestWorld-cameraPosition),uSun)),3.);outgoingLight+=diffuseColor.rgb*(${n?".04":".09"}+transmission*${n?".65":"1.05"}*max(.09,getShadowMask()));`:""}
#include <opaque_fragment>`)},s.customProgramCacheKey=()=>`forest-${e}-${t}-${n}`,s}async function v_(s){const e=new Su,t="./textures/",n=new mv,i=n.loadAsync("./models/fern/fern.gltf"),r=n.loadAsync("./models/grass/grass.gltf"),o=n.loadAsync("./models/rocks/rocks-game.glb"),a=n.loadAsync("./models/cliff/cliff.gltf"),c=async(j,le=!0)=>{const $=await e.loadAsync(t+j);return le&&($.colorSpace=Pt),$.wrapS=$.wrapT=ii,$.anisotropy=Math.min(12,s.capabilities.getMaxAnisotropy()),$},[l,h,u,f,m,x,d,g,p,v,M]=await Promise.all([c("floor.jpg"),c("floor-normal.jpg",!1),c("bark.jpg"),c("bark-normal.jpg",!1),c("rock.jpg"),c("rock-normal.jpg",!1),c("moss.jpg"),c("floor-height.png",!1),c("floor-ao.jpg",!1),c("cliff.jpg"),c("cliff-normal.jpg",!1)]);g.anisotropy=2,p.anisotropy=4,h.anisotropy=4,v.anisotropy=4,M.anisotropy=4;const _=m_();_.anisotropy=8;const y=h_();y.anisotropy=8;const[S,A,C,b,w,D]=await Promise.all([c("leafy_grass.jpg"),c("leafy_grass-normal.jpg",!1),c("rocky_trail_02.jpg"),c("rocky_trail_02-normal.jpg",!1),c("dry_riverbed_rock.jpg"),c("dry_riverbed_rock-normal.jpg",!1)]),L=new It({map:l,normalMap:h,normalScale:new fe(.65,.65),roughness:.95,vertexColors:!0});L.onBeforeCompile=j=>{Object.assign(j.uniforms,{meadowMap:{value:S},meadowN:{value:A},pathMap:{value:C},pathN:{value:b},pebbleMap:{value:w},pebbleN:{value:D},mossMap:{value:d},heightMap:{value:g},groundAO:{value:p},cliffMap:{value:v},cliffNormal:{value:M}}),j.vertexShader=`attribute vec4 seasonTone;varying vec4 vSeasonTone;attribute vec4 habitat;attribute float groundDrift;varying float vDrift; varying vec4 vHabitat;varying vec3 vGround; varying vec3 vTerrainNormal;
`+j.vertexShader,j.vertexShader=j.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
vSeasonTone=seasonTone;vGround=position; vTerrainNormal=normal; vHabitat=habitat;vDrift=groundDrift;`),j.fragmentShader=`varying vec4 vSeasonTone;varying float vDrift;varying vec4 vHabitat;uniform sampler2D meadowMap;uniform sampler2D meadowN;uniform sampler2D pathMap;uniform sampler2D pathN;uniform sampler2D pebbleMap;uniform sampler2D pebbleN;varying vec3 vGround;varying vec3 vTerrainNormal;uniform sampler2D mossMap;uniform sampler2D heightMap;uniform sampler2D groundAO;uniform sampler2D cliffMap;uniform sampler2D cliffNormal;
`+j.fragmentShader,j.fragmentShader=j.fragmentShader.replace("#include <map_fragment>",`
      vec2 forestUV=vMapUv;
      vec3 worldView=normalize(cameraPosition-vGround);
      vec3 surfaceN=normalize(vTerrainNormal);
      float cliffAmount=smoothstep(.2,.68,1.-surfaceN.y)*(1.-smoothstep(.03,.15,vDrift)*smoothstep(.25,.55,surfaceN.y));
      if(distance(cameraPosition,vGround)<17. && cliffAmount<.3){
        vec3 dp1=dFdx(vGround),dp2=dFdy(vGround);vec2 duv1=dFdx(vMapUv),duv2=dFdy(vMapUv);
        vec3 T=normalize(dp1*duv2.y-dp2*duv1.y),B=normalize(-dp1*duv2.x+dp2*duv1.x);
        vec2 shift=vec2(dot(worldView,T),dot(worldView,B))/max(.23,dot(worldView,surfaceN))*.019/9.;
        float layer=0.;for(int i=0;i<9;i++){if(layer>=1.-texture2D(heightMap,forestUV).r)break;forestUV-=shift;layer+=1./9.;}
      }
      vec3 leafColor=texture2D(map,forestUV).rgb;float leafLum=dot(leafColor,vec3(.2126,.7152,.0722));
      leafColor=mix(leafColor,leafLum*vec3(1.65,1.03,.43),.52);
      leafColor=mix(leafColor,leafLum*vec3(1.44,1.09,.46),vSeasonTone.x*.73);
      leafColor=mix(leafColor,leafLum*vec3(1.48,.75,.38),vSeasonTone.y*.37);
      leafColor=mix(leafColor,leafLum*vec3(1.08,.9,.64),vSeasonTone.z*.38);
      float occlusion=mix(.62,1.,texture2D(groundAO,forestUV).r);
      float patches=sin(vGround.x*.12+sin(vGround.z*.083)*2.)*sin(vGround.z*.15+sin(vGround.x*.11));
      vec3 green=texture2D(mossMap,vGround.xz*.5).rgb;
      leafColor=mix(leafColor,green,smoothstep(.48,.9,patches)*(.4+vSeasonTone.w*.35));
      vec3 weights=pow(abs(surfaceN),vec3(4.));weights/=dot(weights,vec3(1.));
      vec3 rockColor=leafColor;if(cliffAmount>.01)rockColor=texture2D(cliffMap,vGround.yz*.3).rgb*weights.x+texture2D(cliffMap,vGround.xz*.3).rgb*weights.y+texture2D(cliffMap,vGround.xy*.3).rgb*weights.z;
      vec3 soil=mix(leafColor*occlusion,texture2D(meadowMap,vGround.xz*.24).rgb*vec3(.85,.87,.61),vHabitat.x);
      soil=mix(soil,texture2D(pebbleMap,vGround.xz*.5).rgb,vHabitat.z*.85);
      soil=mix(soil,texture2D(pathMap,vGround.xz*.4).rgb,vHabitat.y*.93);
      rockColor*=vec3(.68,.8,.76);rockColor=mix(rockColor,green*.7,vHabitat.z*.22);diffuseColor.rgb*=mix(soil,rockColor,max(cliffAmount,vHabitat.w*.25));
    `),j.fragmentShader=j.fragmentShader.replace("#include <normal_fragment_maps>",Ge.normal_fragment_maps.replaceAll("vNormalMapUv","forestUV")+`
      vec3 detailN=texture2D(meadowN,vGround.xz*.24).xyz*2.-1.;detailN=mix(detailN,texture2D(pebbleN,vGround.xz*.5).xyz*2.-1.,vHabitat.z);detailN=mix(detailN,texture2D(pathN,vGround.xz*.4).xyz*2.-1.,vHabitat.y);
      vec3 dn=normalize(surfaceN+vec3(detailN.x,0.,detailN.y)*.5);normal=normalize(mix(normal,mat3(viewMatrix)*dn,max(vHabitat.x,max(vHabitat.z,vHabitat.y))));
      if(cliffAmount>.01){vec3 nx=texture2D(cliffNormal,vGround.yz*.3).xyz*2.-1.,ny=texture2D(cliffNormal,vGround.xz*.3).xyz*2.-1.,nz=texture2D(cliffNormal,vGround.xy*.3).xyz*2.-1.;
      vec3 stoneN=normalize(vec3(nx.z*sign(surfaceN.x),nx.x,nx.y)*weights.x+vec3(ny.x,ny.z*sign(surfaceN.y),ny.y)*weights.y+vec3(nz.x,nz.y,nz.z*sign(surfaceN.z))*weights.z);
      normal=normalize(mix(normal,mat3(viewMatrix)*stoneN,cliffAmount*.85));}
    `)};const N=new It({map:u,normalMap:f,normalScale:new fe(.9,.9),color:15853515,roughness:1,vertexColors:!0}),F=g_(),B=new It({map:F,bumpMap:F,bumpScale:.012,roughness:.94,vertexColors:!0}),V=mi(new It({map:y,alphaTest:.28,side:Et,roughness:.9,metalness:0,vertexColors:!0}),.14,!0),X=V.onBeforeCompile;V.onBeforeCompile=j=>{X(j),j.fragmentShader=j.fragmentShader.replace("#include <map_fragment>",`#ifdef USE_MAP
      vec4 leafSample=texture2D(map,vMapUv);float shade=.52+leafSample.r*.78;vec3 pigment=mix(vec3(.22,.14,.065),vec3(shade),smoothstep(.2,.8,leafSample.b));pigment*=mix(vec3(.83,.91,.72),vec3(1.14,1.,.78),leafSample.g);diffuseColor*=vec4(pigment,leafSample.a);
      #endif`)},V.customProgramCacheKey=()=>"botanical-season-v4",V.alphaToCoverage=!0;const k=await c("october-leaf-sprays.png");k.wrapS=k.wrapT=Tn;const Q=mi(new It({map:k,bumpMap:k,bumpScale:.025,alphaTest:.42,side:Et,roughness:.91,vertexColors:!0}),.12,!0);Q.alphaToCoverage=!0;const ae=Q.onBeforeCompile;Q.onBeforeCompile=j=>{ae(j),j.fragmentShader=j.fragmentShader.replace("#include <map_fragment>","vec4 texel=texture2D(map,vMapUv);float lum=dot(texel.rgb,vec3(.2126,.7152,.0722));vec3 pigment=mix(texel.rgb,vec3(.12+sqrt(max(0.,lum))*.72),.92);diffuseColor*=vec4(pigment,texel.a);")},Q.customProgramCacheKey=()=>"october-photographic-sprays";const[pe,Ne,nt]=await Promise.all([c("fir-twig_diff.jpg"),c("fir-twig_alpha.png",!1),c("fir-twig_nor_gl.jpg",!1)]),st=mi(new It({map:pe,alphaMap:Ne,normalMap:nt,normalScale:new fe(.7,.7),alphaTest:.36,alphaToCoverage:!0,side:Et,roughness:.94,vertexColors:!0}),.065,!0),Qe=st.onBeforeCompile;st.onBeforeCompile=j=>{Qe(j),j.fragmentShader=j.fragmentShader.replace("#include <map_fragment>","vec4 texel=texture2D(map,vMapUv);float lum=dot(texel.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb*=mix(texel.rgb,vec3(lum)*1.75,.92)*3.4;")},st.customProgramCacheKey=()=>"scanned-conifer-needles";const K=await i;K.scene.updateMatrixWorld(!0);let ee;K.scene.traverse(j=>{j.isMesh&&!ee&&(ee=j)});const me=ee.geometry.clone().applyMatrix4(ee.matrixWorld);me.computeBoundingBox();const De=me.boundingBox,Te=De.getSize(new R),Ye=De.getCenter(new R);me.translate(-Ye.x,-De.min.y,-Ye.z),me.scale(1/Te.y,1/Te.y,1/Te.y);const _t=mi(ee.material.clone(),.12,!0,!0);_t.color.setRGB(2.1,2.1,1.65),_t.roughness=1,_t.side=Et,_t.normalScale.set(.55,.55),_t.alphaMap=await c("fern-alpha.png",!1),_t.alphaMap.flipY=!1,_t.alphaTest=.45;const I=new It({map:m,normalMap:x,normalScale:new fe(.8,.8),roughness:.97,vertexColors:!0});I.onBeforeCompile=j=>{j.vertexShader=`varying vec3 vStone; varying vec3 vStoneNormal;
`+j.vertexShader,j.vertexShader=j.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
    mat4 stoneMatrix=modelMatrix;
    #ifdef USE_INSTANCING
    stoneMatrix=modelMatrix*instanceMatrix;
    #endif
    vStone=(stoneMatrix*vec4(position,1.)).xyz;vStoneNormal=normalize(mat3(stoneMatrix)*normal);
  `),j.fragmentShader=`varying vec3 vStone; varying vec3 vStoneNormal;
`+j.fragmentShader,j.fragmentShader=j.fragmentShader.replace("#include <map_fragment>",`vec3 weights=pow(abs(vStoneNormal),vec3(4.));weights/=dot(weights,vec3(1.));
    vec3 triplanar=texture2D(map,vStone.yz*.38).rgb*weights.x+texture2D(map,vStone.xz*.38).rgb*weights.y+texture2D(map,vStone.xy*.38).rgb*weights.z;
    diffuseColor.rgb*=triplanar;`)};const dt=new It({map:x_(),roughness:.97,side:Et}),ze=new It({map:u,normalMap:f,color:7563856,roughness:1}),Ie=await c("fallen-maple-v1.png");Ie.wrapS=Ie.wrapT=Tn;const Me=new It({map:Ie,alphaTest:.38,side:Et,roughness:.96,vertexColors:!0});Me.onBeforeCompile=j=>{j.fragmentShader=j.fragmentShader.replace("#include <map_fragment>","vec4 texel=texture2D(map,vMapUv);float lum=dot(texel.rgb,vec3(.2126,.7152,.0722));diffuseColor*=vec4(mix(texel.rgb,vec3(.12+sqrt(max(lum,0.))*.78),.88),texel.a);")};const pt=new It({color:10636328,roughness:.88,vertexColors:!0}),ye=new It({map:v,normalMap:M,normalScale:new fe(.9,.9),roughness:.87,vertexColors:!0}),ke=await r;ke.scene.updateMatrixWorld(!0);const bt=[],St=await e.loadAsync("./models/grass/alpha.png");St.flipY=!1;let P=0;ke.scene.traverse(j=>{if(!j.isMesh)return;const le=P++;if(![0,6].includes(le))return;const $=j.geometry.clone().applyMatrix4(j.matrixWorld);$.computeBoundingBox();const ne=$.boundingBox,be=ne.getCenter(new R),ge=ne.max.y-ne.min.y;$.translate(-be.x,-ne.min.y,-be.z);const ce=.48;$.scale(ce/ge,ce/ge,ce/ge);const Re=mi(j.material.clone(),.18,!0,!0);Re.map=j.material.map,Re.alphaMap=St,Re.alphaTest=.42,Re.side=Et,Re.roughness=1,Re.color.setRGB(2.3,2.25,1.75),Re.emissive.set(2698515),Re.emissiveIntensity=.22,Re.aoMap=null,Re.normalScale?.set(.55,.55),bt.push({geometry:$,material:Re})});const T=bt[0].material;for(let j=0;j<2;j++){const le=new ri,$=j===0?[.2,.91,.5,.745]:[.57,.9,.83,.747];for(let be=0;be<3;be++)le.plane([0,.28,0],1.15,.56,be*Math.PI/3,.06,$,[1,1,1]);const ne=T.clone();mi(ne,.18,!0,!0),ne.normalMap=null,ne.color.setRGB(2.3,2.25,1.75),ne.emissive.set(2698515),ne.emissiveIntensity=.22,ne.aoMap=null,bt.push({geometry:le.geometry(),material:ne})}const H=mi(new It({color:16777215,side:Et,vertexColors:!0,roughness:1}),.25,!0,!0),Y=new vn(1,10,6,0,Math.PI*2,0,Math.PI*.5),te=await o;te.scene.updateMatrixWorld(!0);const q=[];te.scene.traverse(j=>{if(!j.isMesh)return;const le=j.geometry.clone().applyMatrix4(j.matrixWorld);le.computeBoundingBox();const $=le.boundingBox,ne=$.getCenter(new R),be=$.getSize(new R),ge=1/Math.max(be.x,be.z);le.translate(-ne.x,-$.min.y,-ne.z),le.scale(ge,ge,ge);const ce=j.material.clone();ce.roughness=.94,ce.normalScale?.set(.8,.8),le.computeBoundingBox(),q.push({geometry:le,material:ce,height:le.boundingBox.max.y})});const Ee=await a;Ee.scene.updateMatrixWorld(!0);let oe;return Ee.scene.traverse(j=>{if(!j.isMesh||oe)return;const le=j.geometry.clone().applyMatrix4(j.matrixWorld);le.rotateX(.62),le.computeBoundingBox();const $=le.boundingBox,ne=$.getSize(new R),be=$.getCenter(new R);le.translate(-be.x,-$.min.y,-$.max.z),le.scale(1/ne.y,1/ne.y,1/ne.y);const ge=j.material.clone();ge.roughness=.88,ge.normalScale?.set(.85,.85),oe={geometry:le,material:ge,width:ne.x/ne.y,depth:ne.z/ne.y}}),{cliffPart:oe,needle:st,grassParts:bt,grass:H,shelfGeometry:Y,ground:L,trunk:N,birch:B,leaf:V,leafPhoto:Q,fern:_t,fernGeometry:me,rockParts:q,stone:I,wood:ze,cutWood:dt,fallen:Me,mushroomCap:pt,atlas:_,cliffFace:ye}}const ns=56,_i=420,mn=256,ti=11,Dh=[["mirrorpond","Copper mirror",2,28,"pond"],["island","An island of red maples",2,29,"island"],["birchhall","The white woods",1,28,"grove"],["aspenwheel","Quaking aspen hollow",1,26,"grove"],["scarletaisle","Scarlet passage",2,21,"aisle"],["beechcathedral","Old beech canopy",3,24,"grove"],["ginkgo","Golden fan grove",6,23,"grove"],["orchard","The overgrown orchard",0,26,"grove"],["ferngully","Fern gully",4,23,"hollow"],["mossgrotto","Moss grotto",4,21,"hollow"],["splitrock","The split granite",5,20,"stone"],["bouldergarden","Glacial boulder garden",5,27,"stone"],["basalt","The stone organ",5,22,"stone"],["overlook","Heather ridge",5,27,"ridge"],["standingstones","Sleeping stones",6,22,"stone"],["stonearch","The last doorway",2,22,"ruin"],["ruinedgarden","The garden that returned",4,25,"ruin"],["hearthruin","The old hearth",3,21,"ruin"],["oldsteps","Forgotten stair",4,21,"steps"],["hollowgiant","The hollow giant",3,22,"log"],["windfall","Windfall clearing",0,28,"log"],["leafbowl","A bowl of copper leaves",6,24,"bowl"],["mushroomring","The quiet ring",3,20,"grove"],["berrycopse","Rowan and rosehips",2,22,"grove"],["heather","The violet hillside",5,25,"ridge"],["meadowoak","The meadow oak",0,34,"meadow"],["cedarpond","The dark green pool",4,28,"pond"],["reedmarsh","A reed filled hollow",0,29,"marsh"],["larchridge","Golden larch ridge",5,28,"ridge"],["spring","The hidden spring",4,22,"pond"],["rootgate","The roots of an ancient tree",3,22,"grove"],["amphitheatre","The autumn amphitheatre",2,29,"bowl"],["maplegarden","A garden of small maples",2,25,"grove"],["pineglade","The scented pine glade",3,26,"grove"],["silvermeadow","Silver grass meadow",0,34,"meadow"],["cairntrail","The cairn trail",5,22,"stone"]].map(([s,e,t,n,i])=>({kind:s,name:e,type:t,radius:n,shape:i}));function __(s){return Math.round(s/_i)}function Ms(s,e=0){return e*_i-4+Math.sin(s*.017+e*2)*12+Math.sin(s*.043+e)*3+Math.sin(s*.12+e*3)*1.15}function Xc(s,e=0){const t=Math.round((s+64)/mn),n=t*mn-64;return{id:e+":"+t,x:Ms(n,e),z:n,low:-t*ti,high:(1-t)*ti,index:e,k:t,width:3.4+Ze(e,t,72)*2.8}}function In(s,e){const t=__(s),n=Xc(e,t),i=e-n.z,r=Ms(e,t),o=Math.exp(-Math.pow((i-15)/17,2)),a=3.4+Math.sin(e*.023+t)*.7+o*7+(Zt(e*.093,t,507)-.5)*1.8*gt(4,14,Math.abs(i)),c=n.low+(i<-.6?ti:i>1.8?0:ti*(1-gt(-.6,1.8,i)));return{index:t,f:n,v:i,x:r,d:Math.abs(s-r),width:a,level:c,pool:o}}function zu(s,e){const t=In(s,e),n=t.f,i=t.v,r=n.low+ti*(1-gt(-31,22,i)),o=gt(57,185,t.d)*(14+Eh(s*.008,e*.009,71)*43);let a=r+1.1+Eh(s*.023,e*.023,13)*4.2+o+Math.pow(Zt(s*.018+Zt(e*.01,0,72)*2,e*.015,73),2)*o*.7+Zt(s*.13,e*.13,65)*.28;const c=1-gt(9,31,t.d),l=(Zt(s*.14,n.z*.19,777)-.5)*5*gt(5,19,t.d),h=1-gt(-2+l,2.7+l,i);a=qe(a,n.low+ti*h+1+Zt(s*.17,e*.14,54)*1.5,c*(1-gt(12,32,Math.abs(i))));const u=Zt(s*.29,e*.23,529),f=(1-gt(t.width+3,t.width+10+u*4,t.d))*gt(12,28,Math.abs(i));a=qe(a,t.level+.48+Zt(s*.18,e*.21,587)*.75,f);const m=t.level-(.35+t.pool*1.9)-(1-gt(0,t.width,t.d))*.58+Zt(s*.6,e*.43,512)*.14;return qe(m,a,gt(t.width*.66,t.width+4.1+u*1.6,t.d))}const is=new Map;function Ou(s,e){const t=s+","+e;if(is.has(t))return is.get(t);let n=s*106+(Ze(s,e,40)-.5)*34,i=e*112+(Ze(s,e,41)-.5)*38,r=Math.floor(Ze(s,e,842)*Dh.length);s===0&&e===0&&(n=55,i=-10,r=0),s===-1&&e===0&&(n=-67,i=3,r=2),s===-1&&e===-1&&(n=-67,i=-105,r=15),s===0&&e===-1&&(n=43,i=-120,r=9),s===1&&e===0&&(n=145,i=6,r=13),s===0&&e===1&&(n=39,i=107,r=25);const o=Dh[r],a=In(n,i),c=["pond","island","marsh"].includes(o.shape);c&&a.d<36&&(n=a.x+(n<a.x?-1:1)*43);const l=o.radius*(.88+Ze(s,e,43)*.27),h=Ze(s,e,48)*$e,u={...o,id:t,gx:s,gz:e,x:n,z:i,rx:l*1.12,rz:l*(1+Ze(s,e,44)*.24),radius:l,angle:h,ca:Math.cos(h),sa:Math.sin(h),seed:Ze(s,e,45)*1e8,variant:Ze(s,e,46),pond:c,pondRX:l*.57,pondRZ:l*.69,region:Zt(n*.0017,i*.0017,391),h:zu(n,i)};return u.water=u.h-.6,u.depth=u.shape==="marsh"?.55:u.kind==="spring"?1.05:2.25,is.set(t,u),is.size>600&&is.delete(is.keys().next().value),u}function ku(s,e,t=190){const n=[],i=Math.round(s/106),r=Math.round(e/112);for(let o=-2;o<=2;o++)for(let a=-2;a<=2;a++){const c=Ou(i+a,r+o);Math.hypot(c.x-s,c.z-e)<t&&n.push(c)}return n}let Ih=1e9,Lh=1e9,Hr=[];function ar(s,e){const t=Math.round(s/106),n=Math.round(e/112);if(t!==Ih||n!==Lh){Ih=t,Lh=n,Hr=[];for(let o=-1;o<=1;o++)for(let a=-1;a<=1;a++)Hr.push(Ou(t+a,n+o))}let i=Hr[0],r=1/0;for(const o of Hr){const a=((s-o.x)/o.rx)**2+((e-o.z)/o.rz)**2;a<r&&(i=o,r=a)}return i}function qc(s,e,t){const n=e-s.x,i=t-s.z;return{u:n*s.ca+i*s.sa,v:-n*s.sa+i*s.ca}}function cr(s,e,t){const n=qc(s,e,t);return Math.hypot(n.u/s.pondRX,n.v/s.pondRZ)*(1+.045*Math.sin(Math.atan2(n.v,n.u)*5+s.variant*20))}function yi(s,e){const t=ar(s,e),n=Math.hypot((s-t.x)/t.rx,(e-t.z)/t.rz),i=1-gt(.65,1.65,n);return{site:t,type:t.type,weight:i,meadow:t.type===0?i:0,birch:t.type===1?i:0,maple:t.type===2?i:0,old:t.type===3?i:0,fern:t.type===4?i:0,rock:t.type===5?i:0,leaves:t.type===6?i:0}}function Bu(s,e){const t=Math.round(s/_i),n=Math.round((e-60)/mn),i=n*mn+45+Ze(t,n,732)*32,r=Ms(i,t),o=In(r,i).width+12;return Math.abs(e-i)+gt(o,o+14,Math.abs(s-r))*40}function lr(s,e){const t=In(s,e),n=t.x+17+Math.sin(e*.034+t.index)*5,i=t.x-22+Math.sin(e*.021)*7,r=Math.round(e/112)*112+18+Math.sin(s*.028)*13,o=ar(s,e),a=qc(o,s,e),c=Math.abs(a.u-Math.sin(a.v*.075+o.variant)*2.8),l=gt(o.radius,o.radius+13,Math.abs(a.v)),h=o.pond?Math.abs(cr(o,s,e)-1.39)*o.radius:c+l*20;return Math.min(Bu(s,e),Math.abs(s-n),Math.abs(s-i)*1.25,Math.abs(e-r)*1.1,h)}function fc(s,e){const t=yi(s,e);if(t.meadow>.3||t.rock>.5||t.site.pond)return 0;const n=Math.round(s/19),i=Math.round(e/19),r=n*19+(Ze(n,i,411)-.5)*9,o=i*19+(Ze(n,i,412)-.5)*9,a=Math.exp(-Math.pow((s-r)/(2.2+Ze(n,i,414)*2.8),2)-Math.pow((e-o)/2.5,2));return(Math.pow(Math.max(0,(Zt(s*.075,e*.075,555)-.51)/.49),2.3)*.35+a*(Ze(n,i,413)>.65||t.leaves>.5?.85+t.leaves*.55:0))*gt(.7,2.4,lr(s,e))}function Pe(s,e){let t=zu(s,e);const n=yi(s,e),i=n.site,r=In(s,e),o=qc(i,s,e),a=Math.hypot(o.u/i.rx,o.v/i.rz),c=gt(r.width+4,r.width+12,r.d),l=(1-gt(.6,1.5,a))*c;let h=i.h+(Zt(s*.075,e*.075,321)-.5)*.35;if(i.shape==="ridge"&&(h+=Math.sin(o.u*.055)*2.5+o.v*.08),i.shape==="hollow"&&(h-=2*(1-gt(4,22,Math.hypot(o.u,o.v)))),i.shape==="bowl"&&(h-=2.2*(1-gt(3,22,Math.hypot(o.u,o.v)))),i.shape==="steps"&&(h+=o.v*.14),t=qe(t,h,l*.82),i.pond){const u=cr(i,s,e);let f=i.water-i.depth*(1-gt(.2,1.01,u));i.shape==="island"&&(f=qe(f,i.water+1.8,1-gt(.16,.37,u))),t=qe(t,f,1-gt(.92,1.23,u))}return t-=.1*(1-gt(.5,2.4,lr(s,e))),t+fc(s,e)*c}function ys(s,e){return new R(Pe(s-.22,e)-Pe(s+.22,e),.44,Pe(s,e-.22)-Pe(s,e+.22)).normalize()}function Ot(s,e){const t=ar(s,e);return t.pond&&cr(t,s,e)<1.26?t.water:In(s,e).level}function M_(s,e){if(Pe(s,e)<Ot(s,e))return"water";const n=yi(s,e);return lr(s,e)<1.1?"dirt":n.meadow>.45?"grass":ys(s,e).y<.75||n.rock>.6?"stone":"leaves"}function y_(s,e,t){const n=In(s,e),i=ar(s,e),r=i.pond&&cr(i,s,e)<1.26,o=r?i.water:n.level,a=Math.max(0,o-Pe(s,e)),c=a>.04&&(r||n.d<n.width+4),l=r?0:(1-gt(2.4,6.8,Math.abs(s-n.f.x)))*(1-gt(3,10,Math.abs(e-n.f.z-2.5)))*go((n.f.high-t+2)/3);return{level:o,depth:c?a:0,swimming:c&&a>1.4,underwater:c&&t<o-.05,spray:l,inPond:r}}const S_="varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",b_=`
uniform mat4 projectionInverse;uniform mat4 cameraWorld;uniform float fogBase;uniform float mist;uniform vec3 fogColor;uniform sampler2D airTex;uniform sampler2D exposureTex;
uniform sampler2D sceneTex;uniform sampler2D depthTex;uniform vec2 sunScreen;uniform float sunVisible;uniform float clock;uniform vec2 resolution;uniform float wetness;uniform float spray;uniform float underwater;
varying vec2 vUv;
float rand(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float viewDepth(float d){return (2.*.07*1450.)/(1450.+.07-(d*2.-1.)*(1450.-.07));}
void main(){
  vec2 uv=vUv,distort=vec2(0.);float glint=0.;
  for(int i=0;i<18;i++){float seed=float(i);float a=rand(vec2(seed,2.)),b=rand(vec2(seed,5.));vec2 centre=vec2(a,fract(b-clock*(.006+a*.009)));vec2 delta=(vUv-centre)*vec2(resolution.x/resolution.y,1.);float size=(.009+rand(vec2(seed,9.))*.014)*wetness;float d=length(delta);if(d<size){vec2 n=delta/max(size,.0001);distort+=n*(1.-d/max(size,.0001))*.017*wetness;glint+=pow(max(0.,dot(normalize(vec3(-n,1.)),normalize(vec3(-1.,1.,.3)))),28.)*.15*wetness;}}
  vec3 c=texture2D(sceneTex,clamp(uv+distort,.001,.999)).rgb+glint;
  float depth=viewDepth(texture2D(depthTex,vUv).x);float ao=0.;vec2 slope=vec2(dFdx(depth),dFdy(depth));float radius=clamp(42./max(depth,1.),1.5,9.);for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 px=vec2(cos(a),sin(a))*radius;float sampleDepth=viewDepth(texture2D(depthTex,vUv+px/resolution).x);float above=depth+dot(slope,px)-sampleDepth;ao+=smoothstep(.035,.18,above)*(1.-smoothstep(.25,1.4,above));}c*=1.-ao*.037;
  vec4 air=vec4(0.);float total=0.;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 duv=vec2(float(i),float(j))*2./resolution;float sd=viewDepth(texture2D(depthTex,clamp(vUv+duv,.001,.999)).x);float w=exp(-abs(sd-depth)*.15)/(1.+float(i*i+j*j));air+=texture2D(airTex,vUv+duv)*w;total+=w;}air/=max(total,.001);c+=air.rgb;
  if(depth<1400.){vec4 ray=projectionInverse*vec4(vUv*2.-1.,1.,1.);vec3 view=ray.xyz/ray.w;view*=depth/max(.001,-view.z);vec3 wp=(cameraWorld*vec4(view,1.)).xyz;float low=exp(-max(0.,wp.y-fogBase)*.11);float veil=(1.-exp(-depth*.002))*low*mist;c=mix(c,fogColor,veil*.27);}
  c=mix(c,c*vec3(.38,.77,.72)+vec3(.01,.035,.026),underwater*.78);
  // Only a small optical glow; the light in the air comes from world-space shadows.
  vec3 glow=vec3(0.);for(int i=0;i<8;i++){float a=float(i)*.785398;vec3 s=texture2D(sceneTex,clamp(vUv+vec2(cos(a),sin(a))*5./resolution,.001,.999)).rgb;glow+=s*smoothstep(1.8,5.,max(s.r,max(s.g,s.b)));}c+=glow*.008;
  vec2 q=vUv*(1.-vUv.yx);float vignette=pow(clamp(q.x*q.y*18.,0.,1.),.07);c*=mix(.88,1.,vignette);
  c+=vec3(rand(vUv*resolution+fract(clock))-.5)*.002;
  gl_FragColor=vec4(c*texture2D(exposureTex,vec2(.5)).r,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;class w_{constructor(e){this.renderer=new pv({canvas:e,antialias:!0,powerPreference:"high-performance",alpha:!1}),this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.3)),this.renderer.setSize(innerWidth,innerHeight),this.renderer.outputColorSpace=Pt,this.renderer.toneMapping=qh,this.renderer.toneMappingExposure=1.05,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Wh,this.renderer.shadowMap.autoUpdate=!1,this.scene=new no,this.scene.fog=new Ec(10729921,.0021),this.camera=new qt(67,innerWidth/innerHeight,.07,1450),this.camera.rotation.order="YXZ",this.hemi=new mp(11848927,10189128,.82),this.scene.add(this.hemi),this.sun=new bu(16768941,2.8),this.sun.castShadow=!0,this.sun.shadow.mapSize.set(2048,2048),this.sun.shadow.camera.left=-49,this.sun.shadow.camera.right=49,this.sun.shadow.camera.top=49,this.sun.shadow.camera.bottom=-49,this.sun.shadow.camera.near=1,this.sun.shadow.camera.far=180,this.sun.shadow.bias=-18e-5,this.sun.shadow.normalBias=.065,this.sun.shadow.radius=2,this.scene.add(this.sun,this.sun.target),this.sky(),this.air=new d_(this.renderer,this.camera,this.sun),this.target=new Cn(innerWidth,innerHeight,{type:si,depthBuffer:!0,samples:2}),this.target.depthTexture=new Ic(innerWidth,innerHeight),this.target.depthTexture.type=Mi,this.postScene=new no,this.postCamera=new uo,this.post=new Yt({uniforms:{exposureTex:{value:null},airTex:{value:this.air.target.texture},projectionInverse:{value:this.camera.projectionMatrixInverse},cameraWorld:{value:this.camera.matrixWorld},fogBase:{value:0},mist:{value:.4},fogColor:{value:new xe(12699068)},sceneTex:{value:this.target.texture},depthTex:{value:this.target.depthTexture},sunScreen:{value:new fe},sunVisible:{value:1},clock:{value:0},wetness:{value:0},spray:{value:0},underwater:{value:0},resolution:{value:new fe(innerWidth,innerHeight)}},vertexShader:S_,fragmentShader:b_,depthTest:!1,depthWrite:!1}),this.postScene.add(new Je(new Hn(2,2),this.post)),this.ticks=0,this.quality="high",this.shadowAt=new R(999,999,999),this.size(),window.addEventListener("resize",()=>this.size())}async loadSky(){this.scene.background=new xe(10863829),this.skydome.visible=!0}sky(){const e=new Yt({side:Ht,depthWrite:!1,uniforms:{sunDirection:Jt.sun,uTime:Jt.time},vertexShader:"varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:`
    uniform vec3 sunDirection;uniform float uTime;varying vec3 vDir;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);float dotSun=max(0.,dot(d,sunDirection));vec3 low=vec3(.49,.63,.73),high=vec3(.055,.21,.40);vec3 col=mix(low,high,pow(h,.6));col+=vec3(.6,.37,.13)*pow(dotSun,7.)*.45;col+=vec3(1.8,1.3,.7)*pow(dotSun,1000.);vec2 p=d.xz/max(.12,d.y)*1.2+vec2(uTime*.0017,uTime*.0008);float cloud=noise(p)*.6+noise(p*2.8)*.26+noise(p*7.5)*.14;float wisps=smoothstep(.46,.77,cloud)*smoothstep(.02,.3,h)*.49;col=mix(col,vec3(.88,.89,.86),wisps);gl_FragColor=vec4(col,1.);}`});this.skydome=new Je(new vn(1300,32,16),e),this.skydome.renderOrder=-100,this.scene.add(this.skydome)}size(){const e=this.quality==="high"?Math.min(devicePixelRatio,1.3)*(this.renderScale||1):this.quality==="ultra"?Math.min(devicePixelRatio*1.25,1.8):Math.min(devicePixelRatio,1)*.8;this.renderer.setPixelRatio(e),this.renderer.setSize(innerWidth,innerHeight),this.target.setSize(Math.round(innerWidth*e),Math.round(innerHeight*e)),this.air.resize(Math.round(innerWidth*e),Math.round(innerHeight*e)),this.camera.aspect=innerWidth/innerHeight,this.camera.updateProjectionMatrix(),this.post.uniforms.resolution.value.set(innerWidth*e,innerHeight*e)}observeFrame(e){if(this.quality!=="high"||e>150||(this.frameWindow??=[],this.frameWindow.push(e),this.frameWindow.length<150))return;this.frameWindow.sort((r,o)=>r-o);const t=this.frameWindow[112],n=this.frameWindow[142];this.frameWindow.length=0;const i=this.renderScale||1;t>23?(this.renderScale=Math.max(.78,i-.075),this.quickWindows=0):n<17.4?(this.quickWindows=(this.quickWindows||0)+1,this.quickWindows>=8&&(this.renderScale=Math.min(1,i+.025),this.quickWindows=0)):this.quickWindows=0,this.renderScale&&Math.abs(this.renderScale-i)>.001&&this.size()}setWetness(e,t,n){this.post.uniforms.wetness.value=e,this.post.uniforms.spray.value=t,this.post.uniforms.underwater.value=n?1:0}detail(){return this.quality=this.quality==="high"?"ultra":this.quality==="ultra"?"balanced":"high",this.size(),this.quality}render(e){const t=e/2400,n=Nu(e,this.camera.position.x,this.camera.position.z);Fu.value=n.gust,Jt.sun.value.set(-.18+Math.sin(t)*.16,.43+Math.sin(t*.7)*.1,-.78).normalize(),this.sun.intensity=3.8*n.sun,this.sun.color.set(16769198),this.hemi.intensity=1.1+(1-n.sun)*.55;const i=yi(this.camera.position.x,this.camera.position.z),r=i.fern*.6+(i.site.pond?.4:0);this.post.uniforms.mist.value=.27+r+(.5+.5*Math.sin(e*.006))*.19,this.post.uniforms.fogBase.value=Pe(this.camera.position.x,this.camera.position.z)+1.7;const o=this.camera;this.skydome.position.copy(o.position);const c=o.position.clone().addScaledVector(Jt.sun.value,200).project(o);if(this.post.uniforms.sunScreen.value.set(c.x*.5+.5,c.y*.5+.5),this.post.uniforms.sunVisible.value=c.z<1?1:0,this.post.uniforms.clock.value=e,o.position.distanceToSquared(this.shadowAt)>.36||this.ticks%18===0){const u=Math.round(o.position.x*8)/8,f=Math.round(o.position.z*8)/8;this.sun.target.position.set(u,o.position.y+5,f),this.sun.position.copy(this.sun.target.position).addScaledVector(Jt.sun.value,90),this.renderer.shadowMap.needsUpdate=!0,this.shadowAt.copy(o.position)}this.renderer.setRenderTarget(this.target),this.renderer.render(this.scene,o);const l=this.renderer.info.render.calls,h=this.renderer.info.render.triangles;return this.air.render(this.target.depthTexture,Jt.sun.value,this.post.uniforms.fogBase.value,65e-5+r*7e-4),this.post.uniforms.exposureTex.value=this.air.adapt(this.target.texture,this.target.depthTexture,e),this.renderer.setRenderTarget(null),this.renderer.render(this.postScene,this.postCamera),this.ticks++,{calls:l,tris:h}}}class xo extends Je{constructor(e,t={}){super(e),this.isReflector=!0,this.type="Reflector",this.forceUpdate=!1,this.camera=new qt;const n=this,i=t.color!==void 0?new xe(t.color):new xe(8355711),r=t.textureWidth||512,o=t.textureHeight||512,a=t.clipBias||0,c=t.shader||xo.ReflectorShader,l=t.multisample!==void 0?t.multisample:4,h=new gi,u=new R,f=new R,m=new R,x=new Oe,d=new R(0,0,-1),g=new tt,p=new R,v=new R,M=new tt,_=new Oe,y=this.camera,S=new Cn(r,o,{samples:l,type:si}),A=new Yt({name:c.name!==void 0?c.name:"unspecified",uniforms:hu.clone(c.uniforms),fragmentShader:c.fragmentShader,vertexShader:c.vertexShader});A.uniforms.tDiffuse.value=S.texture,A.uniforms.color.value=i,A.uniforms.textureMatrix.value=_,this.material=A,this.onBeforeRender=function(C,b,w){if(f.setFromMatrixPosition(n.matrixWorld),m.setFromMatrixPosition(w.matrixWorld),x.extractRotation(n.matrixWorld),u.set(0,0,1),u.applyMatrix4(x),p.subVectors(f,m),p.dot(u)>0===!0&&this.forceUpdate===!1)return;p.reflect(u).negate(),p.add(f),x.extractRotation(w.matrixWorld),d.set(0,0,-1),d.applyMatrix4(x),d.add(m),v.subVectors(f,d),v.reflect(u).negate(),v.add(f),y.position.copy(p),y.up.set(0,1,0),y.up.applyMatrix4(x),y.up.reflect(u),y.lookAt(v),y.far=w.far,y.updateMatrixWorld(),y.projectionMatrix.copy(w.projectionMatrix),_.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),_.multiply(y.projectionMatrix),_.multiply(y.matrixWorldInverse),_.multiply(n.matrixWorld),h.setFromNormalAndCoplanarPoint(u,f),h.applyMatrix4(y.matrixWorldInverse),g.set(h.normal.x,h.normal.y,h.normal.z,h.constant);const L=y.projectionMatrix;M.x=(Math.sign(g.x)+L.elements[8])/L.elements[0],M.y=(Math.sign(g.y)+L.elements[9])/L.elements[5],M.z=-1,M.w=(1+L.elements[10])/L.elements[14],g.multiplyScalar(2/g.dot(M)),L.elements[2]=g.x,L.elements[6]=g.y,L.elements[10]=g.z+1-a,L.elements[14]=g.w,n.visible=!1;const N=C.getRenderTarget(),F=C.xr.enabled,B=C.shadowMap.autoUpdate;C.xr.enabled=!1,C.shadowMap.autoUpdate=!1,C.setRenderTarget(S),C.state.buffers.depth.setMask(!0),C.autoClear===!1&&C.clear(),C.render(b,y),C.xr.enabled=F,C.shadowMap.autoUpdate=B,C.setRenderTarget(N);const V=w.viewport;V!==void 0&&C.state.viewport(V),n.visible=!0,this.forceUpdate=!1},this.getRenderTarget=function(){return S},this.dispose=function(){S.dispose(),n.material.dispose()}}}xo.ReflectorShader={name:"ReflectorShader",uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null}},vertexShader:`
		uniform mat4 textureMatrix;
		varying vec4 vUv;

		#include <common>
		#include <logdepthbuf_pars_vertex>

		void main() {

			vUv = textureMatrix * vec4( position, 1.0 );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			#include <logdepthbuf_vertex>

		}`,fragmentShader:`
		uniform vec3 color;
		uniform sampler2D tDiffuse;
		varying vec4 vUv;

		#include <logdepthbuf_pars_fragment>

		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}

		void main() {

			#include <logdepthbuf_fragment>

			vec4 base = texture2DProj( tDiffuse, vUv );
			gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`};const da="float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.),f.x),f.y);}float fb(vec2 p){return n2(p)*.6+n2(p*2.13)*.27+n2(p*4.1)*.13;}";class T_{constructor(e,t){this.scene=e,this.materials=t,this.group=new We,e.add(this.group),this.surfaces=[],this.falls=[],this.sources=[],this.frame=0,this.key="",this.ripples=Array.from({length:8},()=>new tt(0,0,-100,0)),this.rippleIndex=0,this.makeMaterials()}makeMaterials(){this.sheetMaterial=new Yt({side:Et,transparent:!0,depthWrite:!1,uniforms:{time:Jt.time},vertexShader:"varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:`uniform float time;varying vec2 vUv;varying vec3 vWorld;${da}
 void main(){float travel=sqrt(max(.001,vUv.y));vec2 p=vec2(vUv.x*36.,travel*13.-time*8.6);float threads=fb(p*vec2(1.,.45));float broken=fb(p*vec2(2.2,.9)+17.);float edge=smoothstep(0.,.055,vUv.x)*smoothstep(1.,.945,vUv.x);float grain=n2(vec2(vUv.x*135.,travel*87.-time*32.));float streams=smoothstep(.12,.48,fb(vec2(vWorld.x*1.4,3.7)));float a=(.035+smoothstep(.27,.74,threads)*.63)*edge*(.76+grain*.36)*streams;vec3 c=mix(vec3(.11,.18,.16),vec3(.63,.75,.71),smoothstep(.29,.73,threads));c+=pow(broken,5.)*.24+pow(grain,8.)*.07;gl_FragColor=vec4(c,a);#include <tonemapping_fragment>
 #include <colorspace_fragment>}`.replace(";#include",`;
#include`)}),this.sprayMaterial=new ro({color:14807018,size:.07,transparent:!0,opacity:.5,depthWrite:!1,sizeAttenuation:!0});const e=document.createElement("canvas");e.width=e.height=64;const t=e.getContext("2d"),n=t.createRadialGradient(32,32,0,32,32,32);n.addColorStop(0,"rgba(255,255,255,.7)"),n.addColorStop(.3,"rgba(255,255,255,.35)"),n.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=n,t.fillRect(0,0,64,64),this.mistMap=new Dc(e),this.sprayMaterial.map=this.mistMap,this.sprayMaterial.alphaTest=.015,this.mistMaterial=new ro({map:this.mistMap,color:13886174,size:3.7,transparent:!0,opacity:.17,depthWrite:!1}),this.foamMaterial=new Yt({transparent:!0,depthWrite:!1,side:Et,uniforms:{time:Jt.time},vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:`varying vec2 vUv;uniform float time;${da}void main(){vec2 q=(vUv-.5)*2.;float d=length(q*vec2(1.,.74));float n=fb(vUv*vec2(17.,24.)-vec2(0.,time*.8));float a=(1.-smoothstep(.2,1.,d))*smoothstep(.38,.72,n)*.32;gl_FragColor=vec4(.75,.87,.82,a);}`})}surface(e,t,n,i,r=null){const o=r?r.water:-t*ti,a=new ri,c=r?72:Math.ceil((i-n)/1.5),l=r?72:20;for(let d=0;d<=c;d++){const g=n+(i-n)*d/c,p=In(e*_i,g);for(let v=0;v<=l;v++){const M=v/l*2-1,_=r?r.x+M*r.radius*1.05:p.x+M*(p.width+4);if(a.vertex([_,-g,0],[0,0,1],[_,g],[1,1,1]),v<l&&d<c){const y=d*(l+1)+v;a.i.push(y,y+1,y+l+1,y+1,y+l+2,y+l+1)}}}const h=a.geometry(),u=new Float32Array(h.attributes.position.count);for(let d=0;d<u.length;d++)u[d]=r&&cr(r,h.attributes.position.getX(d),-h.attributes.position.getY(d))>1.23?0:Math.max(0,o-Pe(h.attributes.position.getX(d),-h.attributes.position.getY(d)));h.setAttribute("waterDepth",new At(u,1));const f=new xo(h,{textureWidth:512,textureHeight:512,clipBias:.002});f.rotation.x=-Math.PI/2,f.position.y=o+.018;const m=f.material;Object.assign(m.uniforms,{hasReflection:{value:0},time:Jt.time,sunDirection:Jt.sun,ripples:{value:this.ripples},flow:{value:r?.025:.19}}),m.vertexShader="uniform mat4 textureMatrix;varying vec4 vCoord;varying vec3 vWorld;varying float vDepth;attribute float waterDepth;void main(){vCoord=textureMatrix*vec4(position,1.);vWorld=(modelMatrix*vec4(position,1.)).xyz;vDepth=waterDepth;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",m.fragmentShader=`uniform float hasReflection;uniform sampler2D tDiffuse;uniform float time;uniform float flow;uniform vec3 sunDirection;uniform vec4 ripples[8];varying vec4 vCoord;varying vec3 vWorld;varying float vDepth;${da}
  void main(){if(vDepth<.008)discard;vec2 p=vWorld.xz*.65-vec2(time*flow*.16,time*flow);float h=fb(p),hx=fb(p+vec2(.04,0.)),hy=fb(p+vec2(0.,.04));vec2 grad=vec2(h-hx,h-hy)*.23;
  for(int i=0;i<8;i++){float age=time-ripples[i].z;if(age>0.&&age<3.4){vec2 d=vWorld.xz-ripples[i].xy;float len=length(d);float ring=sin((len-age*1.9)*24.)*exp(-pow((len-age*1.9)*3.,2.))*(1.-age/3.4);grad+=normalize(d+vec2(.0001))*ring*.013;}}
  vec3 normal=normalize(vec3(grad.x,1.,grad.y)),view=normalize(cameraPosition-vWorld);float fresnel=.025+.975*pow(1.-max(0.,dot(normal,view)),5.);vec4 coord=vCoord;coord.xy+=grad*.085*coord.w;vec2 reflectionUV=coord.xy/coord.w;float valid=hasReflection*smoothstep(0.,.045,min(min(reflectionUV.x,reflectionUV.y),min(1.-reflectionUV.x,1.-reflectionUV.y)));vec3 reflected=mix(vec3(.12,.18,.19),texture2DProj(tDiffuse,coord).rgb,valid);vec3 body=mix(vec3(.085,.095,.048),vec3(.012,.043,.031),smoothstep(0.,2.3,vDepth));vec3 c=mix(body,reflected,clamp(fresnel+.22,0.,.98));float spec=pow(max(0.,dot(normal,normalize(sunDirection+view))),200.);c+=vec3(1.,.85,.53)*spec*.65;float edgeFoam=(1.-smoothstep(.02,.24,vDepth))*smoothstep(.58,.79,fb(vWorld.xz*3.-vec2(time*.12,time*.45)));c=mix(c,vec3(.7,.78,.67),edgeFoam*.5);gl_FragColor=vec4(c,smoothstep(0.,.23,vDepth)*.92);#include <tonemapping_fragment>
  #include <colorspace_fragment>}`.replace(";#include",`;
#include`),m.transparent=!0,m.depthWrite=!1,m.side=Ht,f.renderOrder=1;const x=f.onBeforeRender;f.onBeforeRender=(...d)=>{if(ua.active||(f.userData.visibleFrame=this.frame,this.didReflect===this.frame))return;const g=f===this.closest;if(!f.userData.fresh&&!(g&&this.frame%2===0)&&!(this.frame%2===1&&this.frame-(f.userData.reflectedAt||0)>12)||d[2].position.y<o||Math.abs(d[2].position.y-o)>55)return;this.didReflect=this.frame,f.userData.fresh=!1,f.userData.reflectedAt=this.frame,ua.active=!0;const p=d[0].shadowMap.needsUpdate;d[0].shadowMap.needsUpdate=!1,this.surfaces.forEach(_=>_.visible=!1);const v=[],M=[];d[1].traverse(_=>{_.userData.reflectionGeometry&&_.geometry!==_.userData.reflectionGeometry&&(v.push([_,_.geometry]),_.geometry=_.userData.reflectionGeometry),_.userData.skipReflection&&_.visible&&(M.push(_),_.visible=!1)});try{x.call(f,...d),m.uniforms.hasReflection.value=1}finally{for(const[_,y]of v)_.geometry=y;for(const _ of M)_.visible=!0;this.surfaces.forEach(_=>_.visible=!0),d[0].shadowMap.needsUpdate=p,ua.active=!1}},f.userData.fresh=!0,f.userData.level=o,f.userData.midZ=(n+i)/2,f.userData.midX=r?r.x:Ms((n+i)/2,e),f.userData.start=n,f.userData.end=i,f.userData.index=e,f.userData.radius=r?.radius||0,f.userData.pondId=r?.id,this.group.add(f),this.surfaces.push(f)}waterfall(e){const t=Dn(e.k*15+e.index*381+756),n=new ri,i=e.width,r=38,o=42;for(let p=0;p<=r;p++){const v=p/r;for(let M=0;M<=o;M++){const _=M/o*2-1,y=e.x+_*i,S=e.z-.65+v*2.9+Math.sin(_*6)*.14*v,A=e.high-ti*v*v,C=(Math.sin(_*37)*.28+Math.sin(_*63)*.16)*v;if(n.vertex([y,A,S+C],[0,.18,1],[M/o,v*v],[1,1,1]),M<o&&p<r){const b=p*(o+1)+M;n.i.push(b,b+1,b+o+1,b+1,b+o+2,b+o+1)}}}const a=new Je(n.geometry(),this.sheetMaterial);a.renderOrder=2,this.group.add(a);const c=new Je(n.geometry(),this.sheetMaterial);c.position.z=-.27,c.scale.x=1,this.group.add(c);const l=420,h=new Float32Array(l*3),u=[];for(let p=0;p<l;p++)u.push({u:(t()*2-1)*i,p:t(),s:.8+t()*.7});const f=new Ct;f.setAttribute("position",new At(h,3));const m=new rc(f,this.sprayMaterial);m.frustumCulled=!1,this.group.add(m);const x=new Ct;x.setAttribute("position",new At(new Float32Array(105),3));const d=new rc(x,this.mistMaterial);d.frustumCulled=!1,this.group.add(d);const g=new Je(new Hn(i*2.5,7),this.foamMaterial);g.rotation.x=-Math.PI/2,g.position.set(e.x,e.low+.045,e.z+4.1),g.renderOrder=3,this.group.add(g),this.falls.push({f:e,seeds:u,spray:m,mist:d}),this.sources.push({id:e.id,x:e.x,y:e.low+2,z:e.z+2})}rebuild(e,t){const n=Math.round(e/_i),i=Math.floor((t+64)/mn),r=n+","+i;if(r!==this.key){this.key=r;for(const o of[...this.group.children])this.group.remove(o),o.geometry?.dispose(),o.isReflector&&o.dispose();this.surfaces=[],this.falls=[],this.sources=[],this.pondKey="";for(let o=n-1;o<=n+1;o++)for(let a=i-1;a<=i+1;a++)Math.abs(o*_i-e)>310||(this.surface(o,a,a*mn-64+1.8,(a+1)*mn-64-.6),this.waterfall(Xc(a*mn-64,o)))}}syncPonds(e,t){const n=Math.floor(e/56)+","+Math.floor(t/56);if(n===this.pondKey)return;this.pondKey=n;const i=ku(e,t,200).filter(o=>o.pond),r=new Set(i.map(o=>o.id));for(const o of[...this.surfaces])o.userData.pondId&&!r.has(o.userData.pondId)&&(this.group.remove(o),o.geometry.dispose(),o.dispose(),this.surfaces.splice(this.surfaces.indexOf(o),1));for(const o of i)this.surfaces.some(a=>a.userData.pondId===o.id)||this.surface(0,0,o.z-o.radius*1.05,o.z+o.radius*1.05,o)}splash(e,t,n){this.ripples[this.rippleIndex++%8].set(e,t,n,1)}update(e,t){this.frame++,this.rebuild(t.x,t.z),this.syncPonds(t.x,t.z);const n=i=>{const r=i.userData,o=r.pondId?r.midZ:Math.max(r.start,Math.min(r.end,t.z)),a=r.pondId?r.midX:Ms(o,r.index),c=a-t.x,l=o-t.z,h=Math.max(0,Math.hypot(c,l)-r.radius*.65),u=(-Math.sin(t.yaw)*c-Math.cos(t.yaw)*l)/Math.max(1,Math.hypot(c,l));return h+Math.abs(r.level-t.y)*2+(u<-.15?80:0)+(this.frame-(r.visibleFrame||0)>2?200:0)};this.closest=[...this.surfaces].sort((i,r)=>n(i)-n(r))[0];for(const i of this.falls){const{f:r,seeds:o}=i,a=i.spray.geometry.attributes.position;for(let l=0;l<o.length;l++){const h=o[l],u=(h.p+e*.63*h.s)%1,f=r.high-ti*u*u,m=Math.sin(l*63)*.25*u;a.setXYZ(l,r.x+h.u+m,f,r.z-.6+u*3.1+Math.sin(l*83)*.5*u)}a.needsUpdate=!0;const c=i.mist.geometry.attributes.position;for(let l=0;l<c.count;l++){const h=(l/c.count+e*.12)%1;c.setXYZ(l,r.x+Math.sin(l*817)*r.width*(.8+h),r.low+.3+h*2.6,r.z+2+h*5+Math.sin(l*35)*1.5)}c.needsUpdate=!0}}}const vt={SUGAR_A:4,SUGAR_B:5,RED_A:6,RED_B:7,BIRCH:8,ASPEN:9,OAK_A:10,OAK_B:11,BEECH:12,SPRUCE:13,PINE:14,LARCH:15,GINKGO:16,JAPANESE:17,SUMAC:18,BARE:22,SUGAR_C:23,OAK_C:24,BLUEBERRY:25},ut={SUGAR:0,RED:1,BIRCH:2,ASPEN:3,OAK:4,BEECH:5,SPRUCE:6,PINE:7,LARCH:8,SNAG:9,GINKGO:10,JAPANESE:11,SUMAC:12,HAZEL:13,BLUEBERRY:14,SAPLING:15},Rn=Math.PI*2,Vt=[];Vt[ut.SUGAR]={name:"sugar maple",kind:"maple",bark:"maple",h:[14,21],base:[.18,.28],width:[.68,.88],shape:"round",points:400,cards:560,card:[1.25,1.65],trunk:.34,up:.1,variants:3,rows:[vt.SUGAR_A,vt.SUGAR_B,vt.SUGAR_C],lumpy:.4};Vt[ut.RED]={name:"red maple",kind:"redmaple",bark:"beech",h:[12,18],base:[.2,.32],width:[.52,.7],shape:"oval",points:340,cards:480,card:[1.15,1.5],trunk:.27,up:.18,variants:3,rows:[vt.RED_A,vt.RED_B,vt.SUGAR_C],lumpy:.42};Vt[ut.BIRCH]={name:"birch",kind:"birch",bark:"birch",h:[12,18],base:[.24,.38],width:[.42,.58],shape:"oval",points:300,cards:430,card:[1.05,1.35],trunk:.17,up:.02,excurrent:.55,variants:3,rows:[vt.BIRCH],lumpy:.36,droop:.35};Vt[ut.ASPEN]={name:"aspen",kind:"aspen",bark:"aspen",h:[13,20],base:[.36,.5],width:[.34,.46],shape:"column",points:270,cards:380,card:[1,1.3],trunk:.19,up:.22,excurrent:.75,variants:3,rows:[vt.ASPEN,vt.BIRCH],lumpy:.34};Vt[ut.OAK]={name:"oak",kind:"oak",bark:"oak",h:[13,19],base:[.18,.26],width:[.85,1.05],shape:"spread",points:420,cards:560,card:[1.3,1.7],trunk:.42,up:-.04,variants:3,rows:[vt.OAK_A,vt.OAK_B,vt.OAK_C],lumpy:.45};Vt[ut.BEECH]={name:"beech",kind:"beech",bark:"beech",h:[14,20],base:[.16,.26],width:[.72,.92],shape:"round",points:400,cards:540,card:[1.2,1.55],trunk:.32,up:.06,variants:2,rows:[vt.BEECH],lumpy:.38};Vt[ut.SPRUCE]={name:"spruce",kind:"spruce",bark:"spruce",conifer:"spruce",h:[16,26],base:[.06,.14],width:[.28,.36],trunk:.3,variants:3,rows:[vt.SPRUCE]};Vt[ut.PINE]={name:"pine",kind:"pine",bark:"pine",conifer:"pine",h:[16,24],base:[.32,.46],width:[.36,.46],trunk:.33,variants:2,rows:[vt.PINE]};Vt[ut.LARCH]={name:"larch",kind:"larch",bark:"spruce",conifer:"larch",h:[15,22],base:[.14,.24],width:[.26,.34],trunk:.26,variants:2,rows:[vt.LARCH]};Vt[ut.SNAG]={name:"dead tree",kind:"maple",bark:"oak",h:[9,16],base:[.36,.5],width:[.4,.6],shape:"oval",points:110,cards:0,card:[1,1],trunk:.28,up:.15,variants:2,rows:[vt.BARE],lumpy:.3,dead:!0};Vt[ut.GINKGO]={name:"ginkgo",kind:"ginkgo",bark:"maple",h:[12,18],base:[.28,.4],width:[.46,.62],shape:"oval",points:300,cards:470,card:[1.1,1.4],trunk:.28,up:.25,excurrent:.4,variants:2,rows:[vt.GINKGO],lumpy:.4};Vt[ut.JAPANESE]={name:"japanese maple",kind:"japanese",bark:"beech",h:[5,8],base:[.14,.24],width:[1,1.3],shape:"dome",points:300,cards:380,card:[.85,1.1],trunk:.13,up:0,variants:2,rows:[vt.JAPANESE],lumpy:.42};Vt[ut.SUMAC]={name:"sumac",kind:"sumac",bark:"beech",h:[2.2,4],base:[.12,.25],width:[.75,1.05],shape:"dome",points:140,cards:120,card:[.62,.85],trunk:.05,up:.3,variants:2,rows:[vt.SUMAC],lumpy:.3,shrub:!0};Vt[ut.HAZEL]={name:"witch hazel",kind:"beech",bark:"beech",h:[2,3.6],base:[.08,.2],width:[.85,1.15],shape:"dome",points:140,cards:120,card:[.6,.85],trunk:.05,up:.2,variants:2,rows:[vt.BIRCH,vt.ASPEN],lumpy:.3,shrub:!0};Vt[ut.BLUEBERRY]={name:"blueberry",kind:"beech",bark:"beech",h:[.8,1.5],base:[.05,.15],width:[1.1,1.5],shape:"dome",points:90,cards:70,card:[.4,.55],trunk:.025,up:.15,variants:2,rows:[vt.BLUEBERRY],lumpy:.25,shrub:!0};Vt[ut.SAPLING]={name:"young maple",kind:"maple",bark:"beech",h:[2.6,4.6],base:[.2,.35],width:[.55,.75],shape:"oval",points:120,cards:100,card:[.6,.8],trunk:.05,up:.25,variants:2,rows:[vt.SUGAR_A,vt.SUGAR_C,vt.RED_A],lumpy:.3,shrub:!0};function Uh(s,e){switch(s){case"oval":return Math.pow(Math.sin(Math.PI*Math.min(1,e)),.55);case"column":return(e<.82?1:Math.sqrt(Math.max(0,(1-e)/.18)))*(.65+.35*Math.sin(Math.PI*e));case"spread":return Math.pow(Math.sin(Math.PI*Math.pow(Math.min(1,e),.6)),.45);case"dome":return Math.sqrt(Math.max(0,1-Math.pow(e,1.6)))*(.7+.3*Math.min(1,e*4));default:return Math.pow(Math.sin(Math.PI*Math.pow(Math.min(1,e),.85)),.7)}}class Hu{constructor(){this.x=[],this.y=[],this.z=[],this.parent=[],this.r=[],this.kids=[]}add(e,t,n,i){const r=this.x.length;return this.x.push(e),this.y.push(t),this.z.push(n),this.parent.push(i),this.kids.push([]),i>=0&&this.kids[i].push(r),r}get n(){return this.x.length}}function E_(s,e){const t=e.range(s.h[0],s.h[1]),n=t*e.range(s.base[0],s.base[1]),i=t*e.range(s.width[0],s.width[1])*.5,r=e.range(-1,1)*t*.04,o=e.range(-1,1)*t*.04,a=e.int(1e4),c=[],l=3+e.int(4);for(let F=0;F<l;F++){const B=e.range(.25,.85),V=Uh(s.shape,B),X=e.next()*Rn,k=i*V*e.range(.25,.8);c.push([Math.cos(X)*k+r*B,n+B*(t-n),Math.sin(X)*k+o*B,i*e.range(.42,.7)*(.6+.4*V)])}const h=[];let u=0;for(;h.length<s.points*3&&u++<6e4;){const F=e.next(),B=n+F*(t-n),V=Uh(s.shape,F),X=e.next()*Rn,k=Math.sqrt(e.next())*i*V*1.12,Q=Math.cos(X)*k+r*F,ae=Math.sin(X)*k+o*F;let pe=!1;for(const[nt,st,Qe,K]of c){const ee=Q-nt,me=(B-st)*1.25,De=ae-Qe;if(ee*ee+me*me+De*De<K*K){pe=!0;break}}!pe&&e.next()>.18||.5+.5*i_(Q*.32+a,ae*.32+B*.27-a)<s.lumpy*e.next()*1.6||h.push(Q,B,ae)}const f=h.length/3,m=new Hu,x=Math.max(.36,t/42),d=n+(t-n)*(s.excurrent?s.excurrent:.12);let g=m.add(0,0,0,-1);const p=Math.max(3,Math.round(d/x));for(let F=1;F<=p;F++){const B=F/p;g=m.add(r*B*.6+e.range(-.04,.04),d*B,o*B*.6+e.range(-.04,.04),g)}const v=i*1.05+2.2,M=x*2.3,_=v*v,y=M*M,S=new Int32Array(f).fill(-1),A=new Float32Array(f).fill(1e9),C=new Uint8Array(f).fill(1),b=F=>{for(let B=0;B<f;B++){if(!C[B])continue;const V=h[B*3],X=h[B*3+1],k=h[B*3+2];for(let Q=F;Q<m.n;Q++){const ae=V-m.x[Q],pe=X-m.y[Q],Ne=k-m.z[Q],nt=ae*ae+pe*pe+Ne*Ne;nt<A[B]&&(A[B]=nt,S[B]=Q)}A[B]<y&&(C[B]=0)}};b(0);const w=new Float32Array(4096),D=new Float32Array(4096),L=new Float32Array(4096),N=new Uint16Array(4096);for(let F=0;F<90;F++){const B=m.n;if(B>4e3)break;w.fill(0,0,B),D.fill(0,0,B),L.fill(0,0,B),N.fill(0,0,B);let V=!1;for(let X=0;X<f;X++){if(!C[X]||A[X]>_)continue;const k=S[X],Q=h[X*3]-m.x[k],ae=h[X*3+1]-m.y[k],pe=h[X*3+2]-m.z[k],Ne=Math.sqrt(Q*Q+ae*ae+pe*pe)||1;w[k]+=Q/Ne,D[k]+=ae/Ne,L[k]+=pe/Ne,N[k]++,V=!0}if(!V)break;for(let X=0;X<B;X++){if(!N[X])continue;let k=w[X]/N[X],Q=D[X]/N[X]+s.up,ae=L[X]/N[X];s.droop&&m.y[X]>n&&(Q-=s.droop*Math.min(1,Math.hypot(m.x[X],m.z[X])/i)*.5),k+=e.range(-.12,.12),ae+=e.range(-.12,.12),Q+=e.range(-.08,.08);const pe=Math.sqrt(k*k+Q*Q+ae*ae);pe<.05||m.add(m.x[X]+k/pe*x,m.y[X]+Q/pe*x,m.z[X]+ae/pe*x,X)}if(m.n===B)break;b(B)}return{S:m,H:t,cb:n,cr:i,cx:r*.5,cz:o*.5,D:x}}function A_(s,e,t,n){for(let l=0;l<4;l++)for(let h=1;h<s.n;h++){const u=s.kids[h];if(!u.length)continue;const f=s.parent[h];let m=0,x=0,d=0;for(const g of u)m+=s.x[g],x+=s.y[g],d+=s.z[g];m/=u.length,x/=u.length,d/=u.length,s.x[h]=.5*s.x[h]+.25*(s.x[f]+m),s.y[h]=.5*s.y[h]+.25*(s.y[f]+x),s.z[h]=.5*s.z[h]+.25*(s.z[f]+d)}const i=new Float32Array(s.n),r=.011*(t/18);for(let l=s.n-1;l>=0;l--){const h=s.kids[l];if(!h.length){i[l]=r;continue}let u=0;for(const f of h)u+=Math.pow(i[f],2.35);i[l]=Math.pow(u,1/2.35)}const a=e.trunk*(t/18)/i[0],c=i[0];for(let l=0;l<s.n;l++){const h=.5+.5*Math.sqrt(i[l]/c);i[l]=Math.max(.006,i[l]*Math.pow(a,h))}s.r=i}function R_(s,e){const t=e.range(s.h[0],s.h[1]),n=t*e.range(s.base[0],s.base[1]),i=t*e.range(s.width[0],s.width[1])*.5,r=new Hu,o=e.range(-1,1)*.3,a=e.range(-1,1)*.3,c=[],l=Math.round(t/.8);let h=r.add(0,0,0,-1);c.push(h);for(let p=1;p<=l;p++){const v=p/l;h=r.add(o*v*v,t*v,a*v*v,h),c.push(h)}const u=s.conifer,f=u==="pine"?1.1:u==="larch"?.72:.62,m=[];let x=e.next()*Rn;for(let p=n;p<t-.6;p+=f*e.range(.8,1.2)){const v=(p-n)/(t-n),M=c[Math.min(c.length-1,Math.round(p/t*l))],_=u==="pine"?4+e.int(2):5+e.int(2);x+=.7+e.next();for(let y=0;y<_;y++){if(u==="pine"&&e.chance(.25))continue;const S=x+y/_*Rn+e.range(-.3,.3);let A=i*(u==="pine"?(.55+.45*(1-v))*e.range(.7,1.15):Math.pow(1-v,.95)*e.range(.85,1.15))+.25;const C=e.range(-.16,.12),b=u==="pine"?.18:u==="larch"?-.05:-.3,w=u==="spruce"?.25:.1,D=5;let L=M,N=r.x[M],F=p,B=r.z[M];const V=[];for(let X=1;X<=D;X++){const k=X/D,Q=b+(w-b)*k*k+C*Math.sin(k*Math.PI);N+=Math.cos(S)*Math.cos(Q)*(A/D),B+=Math.sin(S)*Math.cos(Q)*(A/D),F+=Math.sin(Q)*(A/D),L=r.add(N,F,B,L),V.push(L)}m.push({pts:V,a:S,L:A,t:v})}}const d=new Float32Array(r.n),g=s.trunk*(t/20);for(let p=0;p<c.length;p++)d[c[p]]=Math.max(.03,g*Math.pow(1-p/c.length,.9));for(const p of m)p.pts.forEach((v,M)=>{d[v]=Math.max(.008,.06*Math.min(1,p.L/4)*(1-M/p.pts.length))});return r.r=d,{S:r,H:t,cb:n,cr:i,cx:o*.5,cz:a*.5,branches:m,trunkIdx:c}}class Yc{constructor(){this.p=[],this.n=[],this.uv=[],this.w=[],this.l=[],this.idx=[],this.v=0}vert(e,t,n,i,r,o,a,c,l,h,u,f=0,m=0,x=0){return this.p.push(e,t,n),this.n.push(i,r,o),this.uv.push(a,c),this.w.push(l,h,u),this.l.push(f,m,x),this.v++}geometry(e){const t=new Ct;return t.setAttribute("position",new Ve(this.p,3)),t.setAttribute("normal",new Ve(this.n,3)),t.setAttribute("uv",new Ve(this.uv,2)),t.setAttribute("aWind",new Ve(this.w,3)),e&&t.setAttribute("aLeaf",new Ve(this.l,3)),t.setIndex(this.v>65535?new Tc(this.idx,1):new wc(this.idx,1)),t.computeBoundingSphere(),t}}const C_=.9,P_=1.8;function Nh(s,e,t,n,i){const r=new Yc,o=[[0,-1]],a=new R,c=new R,l=new R,h=new R;for(;o.length;){const[u,f]=o.pop();if(s.r[u]<t)continue;const m=[];f>=0&&m.push(f);let x=u;for(;;){m.push(x);const y=s.kids[x];if(!y.length)break;let S=y[0];for(const A of y)s.r[A]>s.r[S]&&(S=A);for(const A of y)A!==S&&o.push([A,x]);if(s.r[S]<t)break;x=S}if(m.length<2)continue;const d=s.r[m[f>=0?1:0]],g=Math.max(3,Math.min(12,Math.round((d>.2?11:d>.08?8:d>.03?6:4)*n))),p=Math.max(1,Math.round(Rn*d/C_)),v=i.next()*Rn;let M=i.next()*3;c.set(0,0,0);let _=r.v;for(let y=0;y<m.length;y++){const S=m[y],A=m[Math.max(0,y-1)],C=m[Math.min(m.length-1,y+1)];a.set(s.x[C]-s.x[A],s.y[C]-s.y[A],s.z[C]-s.z[A]).normalize(),y===0?(h.set(Math.abs(a.y)<.9?0:1,Math.abs(a.y)<.9?1:0,0),c.crossVectors(a,h).normalize()):c.addScaledVector(a,-c.dot(a)).normalize(),l.crossVectors(a,c);let b=f>=0&&y===0?Math.min(s.r[S]*.85,s.r[m[1]]*1.15):s.r[S];if((S===0||f<0&&y<3)&&(b*=1+.28*Math.exp(-Math.max(0,s.y[S])/.7)),y===m.length-1&&!s.kids[S].length&&(b*=.3),y>0){const L=m[y-1];M+=Math.hypot(s.x[S]-s.x[L],s.y[S]-s.y[L],s.z[S]-s.z[L])/P_}const w=Math.max(0,s.y[S]/e),D=1-Math.min(1,s.r[S]/.12);for(let L=0;L<=g;L++){const N=L/g*Rn,F=Math.cos(N),B=Math.sin(N),V=c.x*F+l.x*B,X=c.y*F+l.y*B,k=c.z*F+l.z*B;r.vert(s.x[S]+V*b,s.y[S]+X*b,s.z[S]+k*b,V,X,k,L/g*p,M,w,D,v)}if(y>0){const L=_+(y-1)*(g+1),N=_+y*(g+1);for(let F=0;F<g;F++)r.idx.push(L+F,N+F,L+F+1,L+F+1,N+F,N+F+1)}}}return r.geometry(!1)}function Vu(s){const e=r_(s),t=e%zi,n=Math.floor(e/zi),i=.004;return[t/zi+i,n/uc+i,(t+1)/zi-i,(n+1)/uc-i]}function Zr(s,e,t,n,i,r,o,a,c,l,h,u,f,m,x,d=1){const g=new R().crossVectors(r,i).normalize(),p=new R().crossVectors(g,r).normalize(),v=o*.5*d,M=o*.08,_=o*.92,[y,S,A,C]=a,b=c?A:y,w=c?y:A,D=[[-v,-M,b,C],[v,-M,w,C],[v,_,w,S],[-v,_,b,S]],L=s.v;for(const[N,F,B,V]of D){const X=e+g.x*N+p.x*F,k=t+g.y*N+p.y*F,Q=n+g.z*N+p.z*F;s.vert(X,k,Q,l.x,l.y,l.z,B,V,Math.max(0,k/m),1,x,h,u,f)}s.idx.push(L,L+1,L+2,L,L+2,L+3)}function Fh(s,e,t,n,i,r){const o=new Yc;if(!i)return o.geometry(!0);const{H:a,cb:c,cr:l}=t,h=t.cx,u=c+(a-c)*.5,f=t.cz,m=(a-c)*.5,x=[];for(let _=1;_<s.n;_++)s.r[_]<.045&&s.y[_]>c*.85&&x.push(_);if(!x.length)return o.geometry(!0);const d=Vu(e.kind),g=new R,p=new R,v=new R,M=new R;for(let _=0;_<i;_++){const y=x[n.int(x.length)],S=s.parent[y],A=s.kids[y].length===0,C=.28,b=s.x[y]+n.range(-C,C),w=s.y[y]+n.range(-C,C),D=s.z[y]+n.range(-C,C);v.set((b-h)/l,(w-u)/m,(D-f)/l);const L=Math.min(1.2,v.length());v.normalize(),g.set(s.x[y]-s.x[S],s.y[y]-s.y[S],s.z[y]-s.z[S]).normalize(),g.lerp(v,.35).normalize(),p.set(v.x+n.range(-.9,.9),v.y+n.range(-.7,.9),v.z+n.range(-.9,.9)).normalize(),Math.abs(p.dot(g))>.92&&p.set(-g.z,g.x,g.y).normalize(),M.copy(v).lerp(p,.3).normalize();const N=Math.min(1,.35+.65*Math.pow(Math.min(1,L),1.4))*(.82+.18*Math.min(1,(w-c)/(a-c)+.3)),F=n.range(e.card[0],e.card[1])*r*(A?1:.88);Zr(o,b,w,D,g,p,F,d,n.chance(.5),M,N,n.next(),Math.min(1,Math.max(0,(w-c)/(a-c)))*.7+.3*Math.min(1,L),a,n.next()*Rn)}return o.geometry(!0)}function zh(s,e,t,n,i,r){const o=new Yc,{H:a,cb:c,cr:l,branches:h}=t,u=Vu(e.kind),f=new R,m=new R,x=new R,d=new R,g=e.conifer==="pine"?1.3:1.05;let p=0;for(const M of h){const _=M.pts;for(let y=1;y<_.length;y++){if(p++%i)continue;const S=_[y],A=_[y-1];if(e.conifer==="pine"&&y<_.length-2)continue;f.set(s.x[S]-s.x[A],s.y[S]-s.y[A],s.z[S]-s.z[A]).normalize(),d.set(-f.z,0,f.x).normalize(),m.crossVectors(f,d).normalize(),m.y<0&&m.negate(),m.x+=n.range(-.25,.25),m.z+=n.range(-.25,.25),m.normalize();const C=s.x[S]-t.cx,b=s.z[S]-t.cz,w=Math.hypot(C,b)||1;x.set(C/w,.75,b/w).normalize();const L=.4+.6*Math.min(1,w/Math.max(.5,l*(1-(s.y[S]-c)/(a-c))+.3)),N=(s.y[S]-c)/(a-c),F=g*n.range(.85,1.15)*r,B=s.x[A],V=s.y[A],X=s.z[A];Zr(o,B,V,X,f,m,F,u,n.chance(.5),x,L,n.next(),N,a,n.next()*Rn,.75),e.conifer!=="pine"&&Zr(o,B+f.x*.19,V+f.y*.19,X+f.z*.19,f,d,F*.95,u,n.chance(.5),x,L*.9,n.next(),N,a,n.next()*Rn,.75)}}const v=t.trunkIdx[t.trunkIdx.length-1];for(let M=0;M<3;M++){const _=M/3*Math.PI;m.set(Math.cos(_),0,Math.sin(_)),f.set(0,1,0),Zr(o,s.x[v],s.y[v]-1.4,s.z[v],f,m,1.6*r,u,M%2===0,x.set(0,1,0),1,n.next(),1,a,n.next()*Rn,.6)}return o.geometry(!0)}function D_(s,e,t=!1){const n=Vt[s],i=t?{...n,points:Math.round(n.points*1.5),cards:Math.round(n.cards*1.7),width:[n.width[0]*1.12,n.width[1]*1.12],base:[n.base[0]*.8,n.base[1]*.8],lumpy:n.lumpy*.8}:n,r=new t_(1e3+s*97+e*13);let o;i.conifer?o=R_(i,r):(o=E_(i,r),A_(o.S,i,o.H));const a=o.S,c=Nh(a,o.H,Math.min(.027,a.r[0]*.12),.7,r),l=Nh(a,o.H,Math.min(.075,a.r[0]*.4),.5,r);let h,u;return i.conifer?(h=zh(a,i,o,r,1,1.4),u=zh(a,i,o,r,2,1.8)):(h=Fh(a,i,o,r,Math.round(i.cards*1.65),.78),u=Fh(a,i,o,r,Math.round(i.cards*.5),1.3)),{skeleton:a,spId:s,variant:e,sp:i,H:o.H,crownBase:o.cb,crownR:o.cr,trunkR:a.r[0]*1.15,bark0:c,bark1:l,leaves0:h,leaves1:u}}const Gu=[ut.SUGAR,ut.BIRCH,ut.OAK,ut.BEECH,ut.SPRUCE,ut.ASPEN,ut.LARCH,ut.GINKGO,ut.JAPANESE,ut.PINE,ut.SNAG,ut.HAZEL],I_=Gu.length;function L_(s,e){const t=D_(Gu[s],e),n=t.skeleton,i=[0,2,1,4,-1,5,-1,-1,6,-1,-1,7][s];if(i>=0)for(const l of[t.leaves0,t.leaves1]){const h=l.attributes.uv;for(let u=0;u<h.count;u++){const f=h.getX(u)*4%1,m=h.getY(u)*3%1;h.setXY(u,(i%4+f)/4,(2-Math.floor(i/4)-m)/2)}}if([4,6,9].includes(s))for(const l of[t.leaves0,t.leaves1]){const h=l.attributes.uv,u=[[.172,.022,.422,.322],[.643,.02,.958,.373],[.285,.407,.654,.786],[.629,.439,.977,.841]];for(let f=0;f<h.count;f++){const m=h.getX(f)*4%1,x=h.getY(f)*3%1,d=u[Math.floor(l.attributes.aLeaf.getY(f)*3.99)];h.setXY(f,d[0]+m*(d[2]-d[0]),1-d[1]-x*(d[3]-d[1]))}}const r=[];for(let l=1;l<n.n;l++){const h=n.parent[l],u=n.x[l]-n.x[h],f=n.y[l]-n.y[h],m=n.z[l]-n.z[h];n.y[l]>1.3&&n.y[l]<6.5&&n.r[l]>.025&&n.r[l]<.12&&Math.abs(f)<Math.hypot(u,m)*.7&&r.push({x:n.x[l],y:n.y[l]+n.r[l]*.8,z:n.z[l]})}const o=[];let a=0;for(;a!==void 0;)o.push({x:n.x[a],y:n.y[a],z:n.z[a],r:n.r[a]}),a=n.kids[a].reduce((l,h)=>l===void 0||n.r[h]>n.r[l]?h:l,void 0);const c=(l,h)=>{const u=l.attributes.position.count,f=new Float32Array(u*3);for(let m=0;m<u;m++){const x=h?.32+.68*Math.pow(l.attributes.aLeaf.getX(m),.8):1,d=h?l.attributes.aLeaf.getY(m):.5;f[m*3]=x*(.91+d*.18),f[m*3+1]=x*(.85+d*.22),f[m*3+2]=x*(.78+d*.2)}return l.setAttribute("color",new At(f,3)),l};return{species:s,perches:r,near:{wood:c(t.bark0,!1),leaf:c(t.leaves0,!0),radius:t.trunkR,height:t.H,trunk:o},far:{wood:c(t.bark1,!1),leaf:c(t.leaves1,!0),radius:t.trunkR,height:t.H,trunk:o}}}const ss=new Map;function U_(s){if(ss.has(s.id))return ss.get(s.id);const e=Dn(s.seed),t={trees:[],stones:[],logs:[],blocks:[],beams:[],plants:[],fungi:[]},n=(d,g)=>({x:s.x+d*s.ca-g*s.sa,z:s.z+d*s.sa+g*s.ca}),i=(d,g,p,v=1)=>{const M=n(d,g),_=Pe(M.x,M.z);_<Ot(M.x,M.z)+.12||ys(M.x,M.z).y<.72||Bu(M.x,M.z)<3.5||t.trees.push({...M,y:_-.05,species:p,scale:v,rot:e()*$e,variant:Math.floor(e()*3),color:e(),id:s.id+":authored:"+t.trees.length})},r=(d,g,p=2,v=p*.7,M=p,_="scan")=>{const y=n(d,g),S=Math.min(...[[0,0],[-p*.38,-M*.38],[p*.38,-M*.38],[-p*.38,M*.38],[p*.38,M*.38]].map(([A,C])=>Pe(y.x+A,y.z+C)));t.stones.push({...y,y:S-.1,sx:p,sy:v,sz:M,rot:e()*$e,variant:Math.floor(e()*4),style:_})},o=(d,g,p="fern",v=1)=>{const M=n(d,g),_=Pe(M.x,M.z);_<Ot(M.x,M.z)-.25&&p!=="reed"||t.plants.push({...M,y:_,kind:p,scale:v,rot:e()*$e})},a=(d,g,p,v=0,M=0)=>{for(let _=0;_<g;_++){const y=e()*$e,S=Math.sqrt(e())*p;o(v+Math.cos(y)*S,M+Math.sin(y)*S,d,.55+e()*.9)}},c=(d,g,p,v=1)=>{for(let M=0;M<g;M++){const _=M/g*$e+(e()-.5)*.17,y=p*(.9+e()*.18);i(Math.cos(_)*y,Math.sin(_)*y,d,v*(.85+e()*.3))}},l=(d,g,p,v,M,_=0,y=0)=>{const S=n(d,g),A=Pe(S.x,S.z);t.blocks.push({...S,y:A+_+v*.5-.06,w:p,h:v,d:M,rot:-s.angle+y})},h=(d,g,p,v,M=.5,_=M,y=.12)=>{const S=n(d,g),A=n(p,v);t.beams.push({a:[S.x,Pe(S.x,S.z)+M,S.z],b:[A.x,Pe(A.x,A.z)+_,A.z],r:y})},u=(d,g,p,v,M=.6,_=!1)=>{const y=n(d,g),S=n(p,v);t.logs.push({x:y.x,z:y.z,ex:S.x,ez:S.z,r:M,hollow:_})},f=(d,g,p=12,v=3)=>{for(let M=0;M<p;M++){const _=e()*$e,y=Math.sqrt(e())*v,S=n(d+Math.cos(_)*y,g+Math.sin(_)*y);t.fungi.push({...S,y:Pe(S.x,S.z),scale:.16+e()*.25,color:e()})}},m=(d,g,p,v,M=2)=>{const _=Math.ceil(Math.hypot(p-d,v-g)/1.05),y=-Math.atan2(v-g,p-d);for(let S=0;S<M;S++)for(let A=0;A<_;A++){const C=(A+.5+S%2*.3)/_;C>1||e()<S*.14||l(d+(p-d)*C,g+(v-g)*C,1.08,.48,.62,S*.46,y+(e()-.5)*.05)}},x=(d,g)=>{for(let p=0;p<4;p++)h(d-1.4,g+p*.12,d+1.4,g+p*.12,.52,.52,.085);for(const p of[-1,1])h(d+p,g,d+p,g,.02,.48,.12),h(d+p,g+.42,d+p,g+.42,.02,1,.07);h(d-1.4,g+.45,d+1.4,g+.45,.88,.88,.1)};switch(s.kind){case"mirrorpond":case"island":case"cedarpond":case"spring":case"reedmarsh":{const d=s.kind==="cedarpond"?4:s.kind==="spring"?1:0,g=s.kind==="spring"?9:15;for(let p=0;p<g;p++){const v=p/g*$e,M=1.42+e()*.25;i(Math.cos(v)*s.pondRX*M,Math.sin(v)*s.pondRZ*M,p%4===0?1:d,.82+e()*.38)}s.kind==="island"&&(i(0,0,8,1.4),i(2,-1,1,.7),r(0,1,2.2,1.2,2));for(let p=0;p<14;p++){const v=e()*$e;r(Math.cos(v)*s.pondRX*1.15,Math.sin(v)*s.pondRZ*1.15,.6+e()*1.7,.45+e()*.9,1+e())}for(let p=0;p<(s.kind==="reedmarsh"?150:55);p++){const v=e()*$e,M=.96+e()*.15;o(Math.cos(v)*s.pondRX*M,Math.sin(v)*s.pondRZ*M,"reed",.65+e()*.8)}u(-s.pondRX*.8,s.pondRZ*.85,-s.pondRX*.28,s.pondRZ*1.2,.32),a("fern",35,7,-s.pondRX*1.4,0),s.kind==="mirrorpond"&&x(s.pondRX*1.3,4);break}case"birchhall":case"aspenwheel":{const d=s.kind==="birchhall"?1:5;for(let g=0;g<34;g++){const p=g*2.399,v=5+Math.sqrt(e())*20;i(Math.cos(p)*v,Math.sin(p)*v,d,.85+e()*.42)}a("fern",70,23),u(-12,10,-4,14,.36),f(-6,13);break}case"scarletaisle":for(let d=0;d<9;d++)for(const g of[-1,1])i(g*(5+Math.sin(d*.8)*1.4),-23+d*5,8,1.25+e()*.55);a("berry",45,23);break;case"beechcathedral":c(3,7,15,1.55),i(-3,-6,3,1.65),a("fern",75,23),f(7,8,25,5);break;case"ginkgo":c(7,9,13,1.15),i(-4,1,7,1.3),a("gold",55,22),f(3,-9);break;case"orchard":for(let d=-2;d<=2;d++)for(let g=-2;g<=2;g++)e()>.18&&i(d*8+(e()-.5)*2,g*8+(e()-.5)*2,8,.7+e()*.35);m(-21,-18,-21,18,1),a("flower",90,24),x(6,0);break;case"ferngully":for(let d=0;d<8;d++)for(const g of[-1,1])r(g*(6+e()*2),-19+d*5,3+e()*2,1.3+e()*2,2.8),i(g*12,-20+d*6,d%3===0?4:3,.7+e()*.5);a("fern",180,24),u(-8,-5,8,1,.7),f(-7,-4,20,3);break;case"mossgrotto":{for(const p of[-1,1])r(p*5,1,6,6,8),r(p*7,7,7,4,6),i(p*11,-3,3,1.3);const d=n(0,4),g=Pe(d.x,d.z);t.stones.push({...d,y:g+4.5,sx:13,sy:2.2,sz:6,rot:-s.angle,variant:1,style:"lintel"}),r(0,10,10,7,5),a("fern",120,15,0,-1),f(4,5,30,4);break}case"splitrock":r(-3.6,0,6.3,7.7,9),r(3.8,1,6.6,8.8,9),r(-5,7,3.4,2.2,4),a("fern",50,12),c(4,8,22,.9);break;case"bouldergarden":for(let d=0;d<18;d++){const g=d*2.399,p=5+e()*18;r(Math.cos(g)*p,Math.sin(g)*p,2+e()*7,1.4+e()*5,2+e()*4)}a("heather",110,26),c(6,12,25,1);break;case"basalt":for(let d=0;d<26;d++){const g=-18+d*1.4,p=5+Math.sin(d*.42)*4;r(g,p,1.4,2+e()*7,1.5,"column")}a("heather",100,22),c(6,9,26,1);break;case"overlook":case"heather":case"larchridge":case"cairntrail":{const d=s.kind==="larchridge"?6:9;for(let g=0;g<12;g++){const p=1.2+g*.3;i(Math.cos(p)*26,Math.sin(p)*23,d,.7+e()*.6)}a("heather",170,27);for(let g=0;g<7;g++)r(-13+g*4,9+Math.sin(g)*4,2+e()*2,.7+e()*1.8,2.1);if(s.kind==="overlook"&&x(-4,-7),s.kind==="cairntrail")for(let g=0;g<5;g++)for(let p=0;p<4;p++){const v=n((g%2?1:-1)*5,-16+g*8),M=Pe(v.x,v.z);t.stones.push({...v,y:M+p*.24,sx:1-p*.18,sy:.45,sz:1-p*.18,variant:p%4,rot:e()*$e,style:"stack"})}break}case"standingstones":for(let d=0;d<10;d++){const g=d/10*$e;r(Math.cos(g)*11,Math.sin(g)*11,1.4,3+e()*2,1.2)}c(0,11,26,1.1),f(0,0,35,5);break;case"stonearch":{const d=n(0,0),g=Pe(d.x,d.z),p=3.1;for(const v of[-1,1])for(let M=0;M<5;M++){const _=n(v*p,0);t.blocks.push({..._,y:g+M*.61+.3,w:.85,h:.65,d:1.35,rot:-s.angle})}for(let v=0;v<13;v++){const M=v/12*Math.PI,_=n(Math.cos(M)*p,0);t.blocks.push({..._,y:g+2.75+Math.sin(M)*p,w:.82,h:.8,d:1.3,rot:-s.angle,roll:M-Math.PI/2})}m(-3,-.3,-15,-.3,3),m(3,0,13,0,2),a("fern",70,20),i(-12,7,8,1.6),c(0,10,25,1.1);break}case"ruinedgarden":m(-12,-13,-12,13,3),m(12,-13,12,13,2),m(-12,-13,12,-13,4),m(-12,13,-4,13,2),m(4,13,12,13,2);for(const d of[-1,1])for(let g=0;g<3;g++)i(d*7,-7+g*7,8,.8),a("flower",28,3,d*7,-7+g*7);a("fern",70,23),x(0,-8);break;case"hearthruin":m(-6,-5,-6,6,3),m(6,-5,6,6,2),m(-6,-5,6,-5,3);for(let d=0;d<6;d++)l(-1,-5,2.8,.56,1.5,d*.54);a("fern",80,18),f(4,-4,15),i(10,6,3,1.4);break;case"oldsteps":for(let d=0;d<14;d++)l(0,-10+d*1.45,4.4,.22,1.45,.06),r(-3.4,-10+d*1.45,1.2,.7,1.5);a("fern",100,22),i(0,16,3,1.4);break;case"hollowgiant":u(-12,-2,11,4,1.5,!0),i(-17,-3,3,1.7),a("fern",110,22),f(7,5,38,4);break;case"windfall":for(let d=0;d<6;d++)u(-17+d*5,-7+e()*7,-12+d*5,4+e()*9,.4+e()*.5);c(3,10,28,1.2),a("flower",110,27),f(-6,4,24,5);break;case"leafbowl":c(0,15,23,1.2),c(8,7,14,.9),u(8,-4,13,5,.45),f(-8,8,20,3);break;case"mushroomring":c(3,8,21,1.15);for(let d=0;d<45;d++){const g=d/45*$e,p=n(Math.cos(g)*6.5,Math.sin(g)*6.5);t.fungi.push({...p,y:Pe(p.x,p.z),scale:.19+e()*.24,color:e()})}a("fern",90,24),u(-15,-5,-9,4,.6);break;case"berrycopse":c(0,11,25,.85),a("berry",130,24),i(0,0,11,2.2),f(9,5);break;case"meadowoak":case"silvermeadow":i(-6,-4,s.kind==="meadowoak"?2:5,1.65),c(5,15,34,1),a("flower",150,31);for(let d=0;d<6;d++)r(-15+e()*30,-20+e()*40,1+e(),.6,1.4);break;case"rootgate":i(-2,0,3,2.1),i(4,2,3,1.7),u(-7,5,9,7,.7),a("fern",150,26),f(0,4,40,8);break;case"amphitheatre":for(let d=0;d<3;d++)for(let g=0;g<13;g++){const p=.2+g/12*Math.PI*1.6,v=10+d*4;r(Math.cos(p)*v,Math.sin(p)*v,2.6,1+d*.3,2)}c(8,14,29,1.25),a("flower",100,25);break;case"maplegarden":c(8,12,16,1.15),i(0,-3,8,1.5);for(let d=0;d<8;d++)r(-14+d*4,9+Math.sin(d)*3,1.8,.9,1.4);a("fern",95,23),x(0,10);break;case"pineglade":c(9,12,23,1.15),i(-3,-2,9,1.5),a("gold",75,22),u(-8,5,4,9,.55),f(-4,5,30,5);break}return a(s.type===5?"heather":s.type===0?"flower":"fern",24,s.radius*1.1),ss.set(s.id,t),ss.size>180&&ss.delete(ss.keys().next().value),t}function N_(s,e){const t=e*mn+45+Ze(s,e,732)*32,n=Ms(t,s),i=In(n,t),r=i.width+7;return{id:s+":"+e,x:n,z:t,half:r,left:Pe(n-r,t)+.05,right:Pe(n+r,t)+.05,level:i.level}}function pa(s,e){const t=Math.max(0,Math.min(1,(e-s.x+s.half)/(2*s.half)));return s.left+(s.right-s.left)*t+Math.sin(t*Math.PI)*.75}const Bs=new R;function dn(s,e,t,n,i,r){const o=2*Math.PI*i/4,a=Math.max(r-2*i,0),c=Math.PI/4;Bs.copy(e),Bs[n]=0,Bs.normalize();const l=.5*o/(o+a),h=1-Bs.angleTo(s)/c;return Math.sign(Bs[t])===1?h*l:a/(o+a)+l+l*(1-h)}class jc extends bs{constructor(e=1,t=1,n=1,i=2,r=.1){const o=i*2+1;if(r=Math.min(e/2,t/2,n/2,r),super(1,1,1,o,o,o),this.type="RoundedBoxGeometry",this.parameters={width:e,height:t,depth:n,segments:i,radius:r},o===1)return;const a=this.toNonIndexed();this.index=null,this.attributes.position=a.attributes.position,this.attributes.normal=a.attributes.normal,this.attributes.uv=a.attributes.uv;const c=new R,l=new R,h=new R(e,t,n).divideScalar(2).subScalar(r),u=this.attributes.position.array,f=this.attributes.normal.array,m=this.attributes.uv.array,x=u.length/6,d=new R,g=.5/o;for(let p=0,v=0;p<u.length;p+=3,v+=2)switch(c.fromArray(u,p),l.copy(c),l.x-=Math.sign(l.x)*g,l.y-=Math.sign(l.y)*g,l.z-=Math.sign(l.z)*g,l.normalize(),u[p+0]=h.x*Math.sign(c.x)+l.x*r,u[p+1]=h.y*Math.sign(c.y)+l.y*r,u[p+2]=h.z*Math.sign(c.z)+l.z*r,f[p+0]=l.x,f[p+1]=l.y,f[p+2]=l.z,Math.floor(p/x)){case 0:d.set(1,0,0),m[v+0]=dn(d,l,"z","y",r,n),m[v+1]=1-dn(d,l,"y","z",r,t);break;case 1:d.set(-1,0,0),m[v+0]=1-dn(d,l,"z","y",r,n),m[v+1]=1-dn(d,l,"y","z",r,t);break;case 2:d.set(0,1,0),m[v+0]=1-dn(d,l,"x","z",r,e),m[v+1]=dn(d,l,"z","x",r,n);break;case 3:d.set(0,-1,0),m[v+0]=1-dn(d,l,"x","z",r,e),m[v+1]=1-dn(d,l,"z","x",r,n);break;case 4:d.set(0,0,1),m[v+0]=1-dn(d,l,"x","y",r,e),m[v+1]=1-dn(d,l,"y","x",r,t);break;case 5:d.set(0,0,-1),m[v+0]=dn(d,l,"x","y",r,e),m[v+1]=1-dn(d,l,"y","x",r,t);break}}static fromJSON(e){return new jc(e.width,e.height,e.depth,e.segments,e.radius)}}function os(s,e){const t=new xe(e),n=new Float32Array(s.attributes.position.count*3);for(let i=0;i<n.length;i+=3)n[i]=t.r,n[i+1]=t.g,n[i+2]=t.b;return s.setAttribute("color",new At(n,3)),s}function F_(s){const e=s.map(n=>n.index?n.toNonIndexed():n),t=Cu(e);return new Set([...s,...e]).forEach(n=>n.dispose()),t}function Vr(s){const e=new ri,t=Dn(s==="reed"?712:s==="berry"?241:517),n=[];for(let i=0;i<(s==="reed"?8:s==="berry"?7:12);i++){const r=t()*$e,o=t()*.38,a=Math.cos(r)*o,c=Math.sin(r)*o,l=s==="reed"?.65+t()*.7:.19+t()*.43;if(e.tube([a,0,c],[a+Math.sin(r)*.12,l,c+Math.cos(r)*.12],.008,.002,3,[.35,.39,.17]),s==="reed"){for(let h=0;h<4;h++){const u=l*(.1+h*.16),f=r+h*2.4,m=Math.cos(f),x=Math.sin(f),d=.23+t()*.28;for(let g=0;g<5;g++){const p=g/5,v=(g+1)/5,M=(_,y)=>[a+m*_*d-x*y*.017*(1-_),u+Math.sin(_*2)*d*.7,c+x*_*d+m*y*.017*(1-_)];e.quad(M(p,-1),M(p,1),M(v,1),M(v,-1),[-x,.6,m],[0,p,1,v],[.43,.46,.24])}}if(i%3===0){const h=new Lc(.022,.14,3,7);h.translate(a+Math.sin(r)*.12,l-.045,c+Math.cos(r)*.12),n.push(os(h,6770747))}}else{for(let h=0;h<4;h++){const u=l*(.25+h*.18),f=r+h*2.4,m=Math.sin(f)*.1,x=Math.cos(f)*.1;e.quad([a-.012,u,c],[a+.012,u,c],[a+m+.025,u+.07,c+x],[a+m-.025,u+.07,c+x],[0,.7,1],[0,0,1,1],s==="berry"?[.3,.38,.11]:[.37,.38,.17])}for(let h=0;h<5;h++){const u=new fo(s==="berry"?.026:.028,0);u.scale(1,s==="heather"?1.9:1,1),u.translate(a+Math.sin(r)*.12+Math.sin(h*2.4)*.04,l-h*.032,c+Math.cos(r)*.12+Math.cos(h*2.4)*.04),n.push(os(u,s==="berry"?13847337:s==="heather"?9597842:13617056))}}}return n.push(e.geometry()),F_(n)}class z_{constructor(e){this.w=e,this.box=new jc(1,1,1,2,.08),os(this.box,13748661),this.reed=Vr("reed"),this.heather=Vr("heather"),this.flower=Vr("flower"),this.berry=Vr("berry"),this.plantMaterial=mi(new It({vertexColors:!0,roughness:.96,side:Et}),.2,!0,!0),this.stemMaterial=new It({color:14075813,roughness:.95}),this.stem=new hs(.09,.12,.8,7),this.stem.translate(0,.4,0),this.cap=new Fc([new fe(0,1),new fe(.22,.99),new fe(.46,.86),new fe(.53,.69),new fe(.48,.62),new fe(.12,.71)],14),os(this.cap,16777215),this.sphere=new vn(1,12,8),this.loaded=[]}draw(e,t){const n=this.w,i=ku(e,t,175),r=[],o=[],a=[],c=[],l=[],h=[];this.loaded=i.map(d=>({id:d.id,name:d.name,kind:d.kind,x:d.x,z:d.z}));for(const d of i){const g=U_(d);r.push(...g.stones),o.push(...g.blocks),a.push(...g.beams),c.push(...g.logs),l.push(...g.plants.filter(p=>Math.hypot(p.x-e,p.z-t)<75)),h.push(...g.fungi.filter(p=>Math.hypot(p.x-e,p.z-t)<42))}for(let d=0;d<n.m.rockParts.length;d++){const g=n.m.rockParts[d];n.instance(g.geometry,g.material,r.filter(p=>p.variant%n.m.rockParts.length===d&&p.style!=="column"),(p,v)=>{v.position.set(p.x,p.y,p.z),v.rotation.y=p.rot,v.scale.set(p.sx,p.sy/Math.max(.1,g.height),p.sz)},!0)}n.instance(this.box,n.m.stone,r.filter(d=>d.style==="column"),(d,g)=>{g.position.set(d.x,d.y+d.sy*.5-.2,d.z),g.rotation.y=d.rot,g.scale.set(d.sx,d.sy,d.sz)},!0);for(const d of r)d.style!=="lintel"&&n.colliders.push({x:d.x,z:d.z,r:Math.min(d.sx,d.sz)*.46,topY:d.y+d.sy});n.instance(this.box,n.m.stone,o,(d,g)=>{g.position.set(d.x,d.y,d.z),g.rotation.set(0,d.rot,d.roll||0),g.scale.set(d.w,d.h,d.d)},!0);for(const d of o)n.colliders.push({x:d.x,z:d.z,r:Math.min(d.w,d.d)*.47,topY:d.y+d.h*.5,bottomY:d.y-d.h*.5});const u=new ri;for(const d of a){u.tube(d.a,d.b,d.r,d.r*.93,7,[.7,.65,.5]);const g=Math.hypot(d.b[0]-d.a[0],d.b[2]-d.a[2]),p=Math.max(1,Math.ceil(g/.5));for(let v=0;v<=p;v++){const M=v/p,_=qe(d.a[0],d.b[0],M),y=qe(d.a[2],d.b[2],M);n.colliders.push({x:_,z:y,r:d.r+.17,topY:qe(d.a[1],d.b[1],M)+d.r,bottomY:qe(d.a[1],d.b[1],M)-d.r})}}for(const d of c){const g=Pe(d.x,d.z)+d.r*.72,p=Pe(d.ex,d.ez)+d.r*.72;if(Iu(n.logEnds,[d.x,g,d.z],[d.ex,p,d.ez],d.r,d.r*.88,d.hollow),d.hollow){const v=new R(d.ex-d.x,p-g,d.ez-d.z),M=v.length(),_=new xn().setFromUnitVectors(new R(0,1,0),v.normalize()),y=new hs(d.r*.88,d.r,M,18,1,!0),S=y.attributes.uv;for(let N=0;N<S.count;N++)S.setXY(N,S.getX(N)*d.r*5,S.getY(N)*M*.52);os(y,16777215),y.applyQuaternion(_),y.translate((d.x+d.ex)*.5,(g+p)*.5,(d.z+d.ez)*.5);const A=n.m.trunk.clone();A.side=Et;const C=new Je(y,A);C.castShadow=C.receiveShadow=!0,C.userData.ownGeometry=!0,C.userData.ownMaterial=!0,n.draw.add(C);const b=new hs(d.r*.88*.76,d.r*.76,M,18,1,!0),w=b.attributes.uv;for(let N=0;N<w.count;N++)w.setXY(N,w.getX(N)*d.r*5,w.getY(N)*M*.52);os(b,10194549),b.applyQuaternion(_),b.translate((d.x+d.ex)*.5,(g+p)*.5,(d.z+d.ez)*.5);const D=n.m.trunk.clone();D.side=Ht;const L=new Je(b,D);L.receiveShadow=!0,L.userData.ownGeometry=L.userData.ownMaterial=!0,n.draw.add(L);for(let N=0;N<=1;N+=.05)for(const F of[-1,1])n.colliders.push({x:qe(d.x,d.ex,N)+v.z*d.r*.85*F,z:qe(d.z,d.ez,N)-v.x*d.r*.85*F,r:.26})}else{u.tube([d.x,g,d.z],[d.ex,p,d.ez],d.r,d.r*.83,12,[.65,.69,.52]);for(let v=0;v<=1;v+=.09)n.colliders.push({x:qe(d.x,d.ex,v),z:qe(d.z,d.ez,v),r:d.r+.2,topY:qe(g,p,v)+d.r})}if(!d.hollow)for(let v=0;v<5;v++){const M=.15+v*.14,_=qe(d.x,d.ex,M),y=qe(d.z,d.ez,M),S=qe(g,p,M);u.tube([_,S,y],[_+Math.sin(v*9)*1.4,S+.4,y+Math.cos(v*9)*1.4],d.r*.2,.025,6,[.55,.58,.44])}}n.bridges=[];const f=Math.round(e/_i),m=Math.round((t-60)/mn);for(let d=f-1;d<=f+1;d++)for(let g=m-1;g<=m+1;g++){const p=N_(d,g);if(Math.hypot(p.x-e,p.z-t)>175)continue;n.bridges.push(p);const v=Math.ceil(p.half*2/.28);for(let M=0;M<=v;M++){const _=p.x-p.half+M/v*p.half*2,y=pa(p,_);for(let S of[-1,1])if(M%9===0&&(u.tube([_,y-.25,p.z+S*1.35],[_,y+1,p.z+S*1.35],.075,.065,7,[.8,.75,.6]),n.colliders.push({x:_,z:p.z+S*1.47,r:.25})),M<v){const A=p.x-p.half+(M+1)/v*p.half*2;u.tube([_,y+.82,p.z+S*1.35],[A,pa(p,A)+.82,p.z+S*1.35],.055,.055,5,[.75,.7,.57])}o.push({x:_,z:p.z,y:y-.05,w:.29,h:.16,d:2.55,rot:0,bridge:!0})}}this.walkable=o.filter(d=>!d.bridge&&d.h<.4),n.instance(this.box,n.m.wood,o.filter(d=>d.bridge),(d,g)=>{g.position.set(d.x,d.y,d.z),g.scale.set(d.w,d.h,d.d)},!0);const x=new Je(u.geometry(),n.m.trunk);x.castShadow=x.receiveShadow=!0,x.userData.ownGeometry=!0,n.draw.add(x);for(const d of["reed","heather","flower","berry"])n.instance(this[d],this.plantMaterial,l.filter(g=>g.kind===d),(g,p)=>{p.position.set(g.x,g.y-.02,g.z),p.rotation.y=g.rot,p.scale.setScalar(g.scale)},!1);n.instance(n.ferns,n.m.fern,l.filter(d=>d.kind==="fern"||d.kind==="gold"),(d,g)=>(g.position.set(d.x,d.y-.03,d.z),g.rotation.y=d.rot,g.scale.setScalar(d.scale*.75),new xe(d.kind==="gold"?13409355:10266218))),n.instance(this.stem,this.stemMaterial,h,(d,g)=>{g.position.set(d.x,d.y,d.z),g.scale.setScalar(d.scale)}),n.instance(this.cap,n.m.mushroomCap,h,(d,g)=>(g.position.set(d.x,d.y,d.z),g.scale.setScalar(d.scale),new xe(d.color>.65?14072209:d.color>.3?11700821:15124632)))}surface(e,t){for(const n of this.w.bridges)if(Math.abs(t-n.z)<1.3&&Math.abs(e-n.x)<=n.half+.18)return"wood";return this.height(e,t)>Pe(e,t)+.12?"stone":null}height(e,t){let n=Pe(e,t);for(const i of this.walkable||[]){const r=e-i.x,o=t-i.z,a=r*Math.cos(i.rot)-o*Math.sin(i.rot),c=r*Math.sin(i.rot)+o*Math.cos(i.rot);Math.abs(a)<i.w*.5&&Math.abs(c)<i.d*.5&&(n=Math.max(n,i.y+i.h*.5+.015))}for(const i of this.w.bridges)Math.abs(t-i.z)<1.3&&Math.abs(e-i.x)<=i.half+.18&&(n=Math.max(n,pa(i,e)+.035));return n}}class O_{constructor(e,t){this.scene=e,this.m=t,this.jobId=0,this.jobs=new Map,this.worker=new Worker(new URL(""+new URL("generation-worker-BTp9WKTX.js",import.meta.url).href,import.meta.url),{type:"module"}),this.worker.onmessage=({data:n})=>{const i=this.jobs.get(n.id);this.jobs.delete(n.id),n.error?i?.reject(new Error(n.error)):i?.resolve(n.result)},this.worker.onerror=n=>{for(const i of this.jobs.values())i.reject(new Error(n.message));this.jobs.clear()},this.tiles=new Map,this.cx=999,this.cz=999,this.center=new R,this.draw=new We,e.add(this.draw),this.chunks=new We,e.add(this.chunks),this.colliders=[],this.bridges=[],this.trees=[],this.perches=[],this.rebuilds=0,this.frame=0,this.prototypes=[];for(let n=0;n<I_;n++)for(let i=0;i<3;i++)this.prototypes.push(L_(n,i));this.protoCount=this.prototypes.length,this.scenery=new z_(this),this.grass=$v(),this.ferns=t.fernGeometry,this.leaf=Lu(),this.rock=Jv(),this.rivers=new T_(e,t),this.createFalling(),this.carpet=new Ui(Zv(),t.fallen,650),this.carpet.receiveShadow=!0,this.carpet.userData.skipReflection=!0,this.carpet.count=0,this.carpetCenter=new fe(999,999),e.add(this.carpet)}terrainFromData(e,t=!1){const n=new Ct;for(const[r,o]of Object.entries(e.attributes))n.setAttribute(r,new At(o.array,o.itemSize));n.setIndex(new At(e.index,1)),n.computeBoundingSphere();const i=new Je(n,this.m.ground);return i.receiveShadow=!t,i}async makeTile(e,t){const n=await this.generate("tile",{tx:e,tz:t,rockVariants:this.m.rockParts.length});return n.mesh=this.terrainFromData(n.terrain),delete n.terrain,this.chunks.add(n.mesh),n}generate(e,t){const n=++this.jobId;return new Promise((i,r)=>{this.jobs.set(n,{resolve:i,reject:r}),this.worker.postMessage({id:n,kind:e,args:t})})}prepareTreeVisibility(e,t){e&&(e.userData.trees=t,e.userData.fullMatrices=e.instanceMatrix.array.slice(),e.userData.fullColors=e.instanceColor?.array.slice(),e.userData.visibleIds=[-1],e.instanceMatrix.setUsage(Vs),e.instanceColor&&e.instanceColor.setUsage(Vs))}updateTreeVisibility(e){const t=Math.atan(Math.tan(67*Math.PI/360)*(innerWidth/innerHeight))+.18,n=Math.cos(t),i=-Math.sin(e.yaw),r=-Math.cos(e.yaw);for(const o of[this.draw,this.farTrees])if(o)for(const a of o.children){const c=a.userData;if(!c.trees)continue;const l=[];for(let h=0;h<c.trees.length;h++){const u=c.trees[h],f=u.x-e.x,m=u.z-e.z,x=Math.hypot(f,m);(x<78||f*i+m*r>x*n-18*(u.scale||u.s||1))&&l.push(h)}if(!(l.length===c.visibleIds.length&&l.every((h,u)=>h===c.visibleIds[u]))){for(let h=0;h<l.length;h++){const u=l[h];a.instanceMatrix.array.set(c.fullMatrices.subarray(u*16,u*16+16),h*16),c.fullColors&&a.instanceColor.array.set(c.fullColors.subarray(u*3,u*3+3),h*3)}a.count=l.length,a.instanceMatrix.needsUpdate=!0,a.instanceColor&&(a.instanceColor.needsUpdate=!0),c.visibleIds=l}}}instance(e,t,n,i,r=!1){if(!n.length)return;const o=new Ui(e,t,n.length),a=new ct;return n.forEach((c,l)=>{a.position.set(0,0,0),a.rotation.set(0,0,0),a.scale.set(1,1,1);const h=i(c,a);a.updateMatrix(),o.setMatrixAt(l,a.matrix),h&&o.setColorAt(l,h)}),o.castShadow=r,o.receiveShadow=!0,o.userData.skipReflection=t===this.m.fern||t===this.m.grass||this.m.grassParts.some(c=>c.material===t),o.computeBoundingSphere(),this.draw.add(o),o}rebuildDraw(e,t){for(const x of[...this.draw.children])this.draw.remove(x),x.isInstancedMesh&&x.dispose(),x.userData.ownGeometry&&x.geometry.dispose(),x.userData.ownMaterial&&x.material.dispose();const n=Array.from({length:this.protoCount*2},()=>[]),i=[],r=[],o=[],a=[],c=[];this.colliders=[],this.trees=[],this.perches=[],this.logEnds=new ri;for(const x of this.tiles.values()){for(const d of x.trees){const g=Math.hypot(d.x-e,d.z-t);g>235||(this.trees.push(d),n[d.species*3+d.variant+(g>66?this.protoCount:0)].push(d),g<100&&this.colliders.push({x:d.x,z:d.z,r:this.prototypes[d.species*3+d.variant].near.radius*d.scale+.25}))}for(const d of x.rocks)Math.hypot(d.x-e,d.z-t)<120&&i.push(d);for(const d of x.flora)Math.hypot(d.x-e,d.z-t)<64&&r.push(d);for(const d of x.grass)Math.hypot(d.x-e,d.z-t)<69&&o.push(d);for(const d of x.litter)Math.hypot(d.x-e,d.z-t)<38&&a.push(d);for(const d of x.logs)Math.hypot(d.x-e,d.z-t)<115&&c.push(d)}const l=(x,d)=>{d.position.set(x.x,x.y,x.z),d.rotation.y=x.rot,d.scale.set(x.scale*(.85+x.color*.35),x.scale,x.scale*(.85+x.color*.35))};for(let x=0;x<this.protoCount*2;x++){const d=this.prototypes[x%this.protoCount],g=x<this.protoCount?d.near:d.far,p=n[x],v=this.instance(g.wood,[1,5].includes(d.species)?this.m.birch:this.m.trunk,p,l,x<this.protoCount),M=this.instance(g.leaf,[4,6,9].includes(d.species)?this.m.needle:[7,10].includes(d.species)?this.m.leaf:this.m.leafPhoto,p,(_,y)=>{l(_,y);const S=yi(_.x,_.z),A=_.species===1||_.species===5||_.species===7?[15976766,15848550,15382348]:_.species===4||_.species===9?[5667670,4353879,7505498]:_.species===6?[14397262,14992746,11119964]:_.species===8?[12795947,12074297,14841669]:_.species===3?[13602117,14332524,12089401]:_.species===2?[11635792,12876092,10190670]:S.maple>.4?[15237432,12995367,14457923]:[15316303,13204537,14721879];return new xe(A[Math.floor(_.color*A.length)])},x<this.protoCount);v&&(v.userData.reflectionGeometry=d.far.wood),M&&(M.userData.reflectionGeometry=d.far.leaf),this.prepareTreeVisibility(v,p),this.prepareTreeVisibility(M,p)}for(let x=0;x<this.m.rockParts.length;x++){const d=this.m.rockParts[x];this.instance(d.geometry,d.material,i.filter(g=>g.variant===x),(g,p)=>{p.position.set(g.x,g.y,g.z),p.scale.set(g.s,g.s*(.75+Ze(g.x,g.z)*.55),g.s),p.rotation.y=g.rot},!0)}for(const x of i)x.s>1.5&&this.colliders.push({x:x.x,z:x.z,r:x.s*.52,topY:x.y+x.s*.5}),x.s>1&&x.s<2.8&&this.perches.push({id:"rock:"+x.x.toFixed(2)+","+x.z.toFixed(2),x:x.x,y:x.y+x.s*this.m.rockParts[x.variant].height*.8,z:x.z});this.instance(this.ferns,this.m.fern,r,(x,d)=>{d.position.set(x.x,x.y,x.z),d.scale.setScalar(x.s),d.rotation.y=x.rot});for(let x=0;x<this.m.grassParts.length;x++){const d=this.m.grassParts[x];this.instance(d.geometry,d.material,o.filter((g,p)=>Math.hypot(g.x-e,g.z-t)<13?p%4===x:p%2+2===x),(g,p)=>(p.position.set(g.x,g.y,g.z),p.quaternion.setFromUnitVectors(new R(0,1,0),new R(g.nx,g.ny,g.nz)),p.rotateY(g.rot),p.scale.set(g.s,g.s*(g.meadow?1.35:1),g.s),new xe(g.meadow?14735276:12963737)))}this.instance(this.grass,this.m.grass,o.filter(x=>x.meadow&&Math.hypot(x.x-e,x.z-t)<42),(x,d)=>(d.position.set(x.x,x.y,x.z),d.rotation.y=x.rot,d.scale.set(x.s*.85,x.s*1.05,x.s*.85),new xe().setRGB(.83+x.color*.27,.68+x.color*.22,.35+x.color*.16))),this.instance(this.leaf,this.m.fallen,a,(x,d)=>(d.position.set(x.x,x.y,x.z),d.quaternion.setFromUnitVectors(new R(0,1,0),ys(x.x,x.z)),d.rotateY(x.rot),d.scale.setScalar(x.s),new xe(ha[Math.floor(x.c*8)])));const h=new ri;for(const x of c){const d=Pe(x.x,x.z)+x.r*.65,g=Pe(x.ex,x.ez)+x.r*.65;h.tube([x.x,d,x.z],[x.ex,g,x.ez],x.r,x.r*.8,12,[.7,.74,.66]),Iu(this.logEnds,[x.x,d,x.z],[x.ex,g,x.ez],x.r,x.r*.8);const p=Math.hypot(x.ex-x.x,x.ez-x.z);for(let v=0;v<3;v++){const M=.25+v*.23,_=qe(x.x,x.ex,M),y=qe(x.z,x.ez,M),S=qe(d,g,M);h.tube([_,S,y],[_+.7,S+.28,y-.6],x.r*.2,.025,6,[.7,.7,.6])}for(let v=0;v<Math.ceil(p);v++){const M=v/Math.ceil(p);this.colliders.push({x:qe(x.x,x.ex,M),z:qe(x.z,x.ez,M),r:x.r+.2,topY:qe(d,g,M)+x.r})}this.perches.push({id:"log:"+x.x.toFixed(2),x:qe(x.x,x.ex,.25),y:qe(d,g,.25)+x.r,z:qe(x.z,x.ez,.25)})}const u=new Je(h.geometry(),this.m.trunk);u.receiveShadow=u.castShadow=!0,u.userData.ownGeometry=!0,this.draw.add(u);const f=[];for(const x of c)for(let d=0;d<6;d++){const g=.15+d*.1;f.push({x:qe(x.x,x.ex,g)+x.r*.8,z:qe(x.z,x.ez,g),y:qe(Pe(x.x,x.z),Pe(x.ex,x.ez),g)+x.r*.8,r:.1+Ze(d,x.x)*.13})}this.instance(this.m.shelfGeometry,this.m.mushroomCap,f,(x,d)=>{d.position.set(x.x,x.y,x.z),d.scale.set(x.r,x.r*.25,x.r*.7)}),this.landmarks(e,t);const m=new Je(this.logEnds.geometry(),this.m.cutWood);m.receiveShadow=!0,m.userData.ownGeometry=!0,this.draw.add(m),this.rebuilds++}landmarks(e,t){this.scenery.draw(e,t);const n=[],i=Math.round(e/_i),r=Math.round((t+64)/mn);for(let o=r-1;o<=r+1;o++){const a=Xc(o*mn-64,i);if(Math.hypot(e-a.x,t-a.z)>165)continue;const c=this.m.cliffPart;for(const l of[-1,1]){const h=12.8+Ze(o,l,892)*.6,u=c.width*h,f=new Je(c.geometry,c.material);f.position.set(a.x+l*(a.width+u*.46),a.low-1.2,a.z+3.3),f.scale.set(l*h,h,h*.84),f.rotation.y=l*.12,f.castShadow=f.receiveShadow=!0,this.draw.add(f);for(let m=0;m<12;m++){const x=a.x+l*(a.width+.7+m*1.35);this.colliders.push({x,z:a.z+2.8,r:.9,topY:a.high+.7})}}for(const l of[-1,1])for(let h=0;h<8;h++){const u=a.x+l*(a.width+6+h*3.6),f=a.z+5+Math.sin(h*2.3)*2,m=5+Ze(o,h,121)*4,x=Math.min(...[[0,0],[-m*.4,0],[m*.4,0],[0,-m*.4],[0,m*.4]].map(([d,g])=>Pe(u+d,f+g)));n.push({x:u,y:x-.12,z:f,sx:m,sy:3+Ze(h,o,141)*4,sz:m*.8,rot:Ze(h,o,123)*$e})}}for(let o=0;o<this.m.rockParts.length;o++){const a=this.m.rockParts[o];this.instance(a.geometry,a.material,n.filter((c,l)=>l%this.m.rockParts.length===o),(c,l)=>{l.position.set(c.x,c.y,c.z),l.rotation.y=c.rot,l.scale.set(c.sx,c.sy,c.sz)},!0)}for(const o of n)this.colliders.push({x:o.x,z:o.z,r:Math.min(o.sx,o.sz)*.43,topY:o.y+o.sy*.6});for(const o of this.trees){if(Math.hypot(o.x-e,o.z-t)>85)continue;const a=this.prototypes[o.species*3+o.variant],c=a.perches;if(!c.length)continue;const l=Math.min(2,c.length),h=o.scale*(.85+o.color*.35);for(let u=0;u<l;u++){const f=c[Math.floor(Ze(o.x+u,o.z,733)*c.length)],m=f.x*h,x=f.z*h;this.perches.push({id:"branch:"+o.id+":"+u,x:o.x+m*Math.cos(o.rot)+x*Math.sin(o.rot),y:o.y+f.y*o.scale,z:o.z-m*Math.sin(o.rot)+x*Math.cos(o.rot)})}}}async rebuildFar(e,t){const[n,i]=await Promise.all([this.generate("terrain",{x0:e-1120,z0:t-1120,size:2240,res:112,far:!0}),this.generate("distant",{x:e,z:t})]),r=this.terrainFromData(n,!0),o=new We,a=[14326089,15058522,11831891,12684109,5075026,14730600,13940320,15058521,12536373,5994067,10850160,12427355];for(let c=0;c<12;c++){const l=i.filter(f=>f.species===c);if(!l.length)continue;const h=this.prototypes[c*3].far,u=[4,6,9].includes(c)?this.m.needle:[7,10].includes(c)?this.m.leaf:this.m.leafPhoto;for(const[f,m,x]of[[h.wood,[1,5].includes(c)?this.m.birch:this.m.trunk,!1],[h.leaf,u,!0]]){const d=new Ui(f,m,l.length),g=new ct;l.forEach((p,v)=>{g.position.set(p.x,p.y,p.z),g.scale.setScalar(p.s),g.rotation.y=p.rot,g.updateMatrix(),d.setMatrixAt(v,g.matrix),x&&d.setColorAt(v,new xe(a[c]))}),d.computeBoundingSphere(),this.prepareTreeVisibility(d,l),o.add(d)}}if(this.far&&(this.scene.remove(this.far),this.far.geometry.dispose()),this.farTrees){this.scene.remove(this.farTrees);for(const c of this.farTrees.children)c.dispose()}this.far=r,this.farTrees=o,this.scene.add(r,o)}trunkPoint(e,t){const n=this.prototypes[e.species*3+e.variant].near.trunk,i=(t-e.y)/e.scale;let r=1;for(;r<n.length-1&&n[r].y<i;)r++;const o=n[r-1],a=n[r],c=Math.max(0,Math.min(1,(i-o.y)/(a.y-o.y))),l=e.scale*(.85+e.color*.35),h=qe(o.x,a.x,c)*l,u=qe(o.z,a.z,c)*l;return{x:e.x+h*Math.cos(e.rot)+u*Math.sin(e.rot),z:e.z-h*Math.sin(e.rot)+u*Math.cos(e.rot),r:qe(o.r,a.r,c)*l}}walkHeight(e,t){return this.scenery.height(e,t)}walkSurface(e,t){return this.scenery.surface(e,t)}move(e,t,n,i){let r=e+n,o=t+i,a=this.walkHeight(e,t);for(const c of this.colliders){if(c.bottomY!==void 0&&c.bottomY>a+1.8||c.topY!==void 0&&a>c.topY-.1)continue;const l=Math.hypot(r-c.x,o-c.z);l<c.r&&l>1e-4&&(r=c.x+(r-c.x)/l*c.r,o=c.z+(o-c.z)/l*c.r)}return this.walkHeight(r,o)-a>.3&&(this.walkHeight(r,t)-a>.3&&(r=e),this.walkHeight(e,o)-a>.3&&(o=t)),{x:r,z:o}}async init(e,t){await this.stream(e,t,!0)}async stream(e,t){const n=Math.floor(e/ns),i=Math.floor(t/ns);if(this.streaming||n===this.cx&&i===this.cz)return;this.streaming=!0,this.cx=n,this.cz=i;const r=[];for(let a=-3;a<=3;a++)for(let c=-3;c<=3;c++){const l=n+c,h=i+a;r.push({tx:l,tz:h,key:l+","+h,d:c*c+a*a})}r.sort((a,c)=>a.d-c.d);const o=new Set(r.map(a=>a.key));for(const[a,c]of this.tiles)o.has(a)||(this.chunks.remove(c.mesh),c.mesh.geometry.dispose(),this.tiles.delete(a));for(const a of r)this.tiles.has(a.key)||(this.tiles.set(a.key,await this.makeTile(a.tx,a.tz)),await new Promise(c=>requestAnimationFrame(c)));this.rebuildDraw(e,t),await this.rebuildFar(n*ns,i*ns),this.center.set(e,0,t),this.streaming=!1}createFalling(){this.fallCount=180,this.falling=new Ui(this.leaf,this.m.fallen,this.fallCount),this.falling.instanceMatrix.setUsage(Vs),this.falling.frustumCulled=!1,this.scene.add(this.falling),this.leafParticles=[];const e=Dn(445);for(let t=0;t<this.fallCount;t++)this.leafParticles.push({x:e()*60-30,y:e()*18,z:e()*60-30,s:.35+e()*.4,phase:e()*$e,rate:.28+e()*.6}),this.falling.setColorAt(t,new xe(ha[t%8]));this.kicks=[],this.kickMesh=new Ui(this.leaf,this.m.fallen,120),this.kickMesh.instanceMatrix.setUsage(Vs),this.kickMesh.frustumCulled=!1,this.scene.add(this.kickMesh),this.kickMesh.count=0,this.dummy=new ct}kick(e,t,n,i){const r=7+Math.floor(fc(e,t)*17);for(let o=0;o<r;o++){const a=Math.random()*$e,c=Math.random()*.55;this.kicks.push({x:e+Math.cos(a)*c,y:Pe(e,t)+.07,z:t+Math.sin(a)*c,vx:n*.24+Math.cos(a),vz:i*.24+Math.sin(a),vy:.6+Math.random()*1.5,life:1.2+Math.random(),rot:Math.random()*$e,color:ha[o%8]})}this.kicks.length>120&&this.kicks.splice(0,this.kicks.length-120)}updateCarpet(e,t){const n=Math.round(e/5)*5,i=Math.round(t/5)*5;if(this.carpetCenter.x===n&&this.carpetCenter.y===i)return;this.carpetCenter.set(n,i);const r=new ct;let o=0;for(let a=-13;a<=13;a++)for(let c=-13;c<=13;c++){if(c*c+a*a>169)continue;const l=n+c,h=i+a,u=Pe(l,h),f=yi(l,h),m=ys(l,h);u<Ot(l,h)+.1||m.y<.84||f.meadow>.4||lr(l,h)<1||(r.position.set(l,u+.02,h),r.quaternion.setFromUnitVectors(new R(0,1,0),m),r.rotateY(Ze(l,h,177)*$e),r.scale.setScalar(.75+fc(l,h)*.23),r.updateMatrix(),this.carpet.setMatrixAt(o,r.matrix),this.carpet.setColorAt(o++,new xe(f.birch>.3||f.leaves>.4?16371568:f.maple>.3?15776145:14140834)))}this.carpet.count=o,this.carpet.instanceMatrix.needsUpdate=!0,this.carpet.instanceColor&&(this.carpet.instanceColor.needsUpdate=!0),this.carpet.computeBoundingSphere()}update(e,t,n){this.frame++,this.frame%6===0&&this.updateCarpet(n.x,n.z),!this.streaming&&(Math.floor(n.x/ns)!==this.cx||Math.floor(n.z/ns)!==this.cz)&&this.stream(n.x,n.z),!this.streaming&&Math.hypot(n.x-this.center.x,n.z-this.center.z)>24&&(this.rebuildDraw(n.x,n.z),this.center.set(n.x,0,n.z)),this.updateTreeVisibility(n),this.rivers.update(t,n);const i=this.dummy;for(let r=0;r<this.fallCount;r++){const o=this.leafParticles[r];let a=((o.x+t*.4-n.x+30)%60+60)%60-30+n.x,c=((o.z+t*.13-n.z+30)%60+60)%60-30+n.z;(o.floor===void 0||Math.abs(a-(o.floorX??a))+Math.abs(c-(o.floorZ??c))>5||r%12===this.frame%12)&&(o.floorTarget=Pe(a,c),o.floorX=a,o.floorZ=c,o.floor===void 0&&(o.floor=o.floorTarget)),o.floor+=(o.floorTarget-o.floor)*Math.min(1,e*6);const l=o.floor+((o.y-t*o.rate)%18+18)%18;a+=Math.sin(t*.6+o.phase),c+=Math.cos(t*.55+o.phase)*.6,i.position.set(a,l,c),i.rotation.set(t*.8+o.phase,t*.5+o.phase,Math.sin(t*1.6+o.phase)*.8),i.scale.setScalar(o.s),i.updateMatrix(),this.falling.setMatrixAt(r,i.matrix)}this.falling.instanceMatrix.needsUpdate=!0;for(const r of this.kicks){r.life-=e,r.vy-=e*3.4,r.x+=r.vx*e,r.y+=r.vy*e,r.z+=r.vz*e;const o=Pe(r.x,r.z)+.04;r.y<o&&(r.y=o,r.vy=0,r.vx*=.85,r.vz*=.85)}this.kicks=this.kicks.filter(r=>r.life>0),this.kickMesh.count=this.kicks.length,this.kicks.forEach((r,o)=>{i.position.set(r.x,r.y,r.z),i.rotation.set(r.vy===0?0:t*4,r.rot+t*.9,0),i.scale.setScalar(.55*Math.min(1,r.life*2)),i.updateMatrix(),this.kickMesh.setMatrixAt(o,i.matrix),this.kickMesh.setColorAt(o,new xe(r.color))}),this.kickMesh.instanceMatrix.needsUpdate=!0,this.kickMesh.instanceColor&&(this.kickMesh.instanceColor.needsUpdate=!0)}}class k_{constructor(){this.ctx=null,this.enabled=!0,this.steps=0,this.samples=[],this.buffers={},this.peak=0,this.animals=new Map,this.falls=new Map,this.audibleFalls=[],this.calls=[]}async start(){if(this.ctx){await this.ctx.resume();return}const e=this.ctx=new AudioContext;this.master=e.createGain(),this.master.gain.value=this.enabled?.65:0,this.filter=e.createBiquadFilter(),this.filter.type="lowpass",this.filter.frequency.value=19e3,this.master.connect(this.filter).connect(e.destination),this.analyser=e.createAnalyser(),this.analyser.fftSize=256,this.filter.connect(this.analyser),this.wave=new Float32Array(256),this.noise=e.createBuffer(1,e.sampleRate*4,e.sampleRate);const t=this.noise.getChannelData(0);for(let o=0;o<t.length;o++)t[o]=(Math.random()*2-1)*.2;const n=e.createBufferSource(),i=e.createBiquadFilter(),r=e.createGain();n.buffer=this.noise,n.loop=!0,i.type="lowpass",i.frequency.value=650,r.gain.value=.035,n.connect(i).connect(r).connect(this.master),n.start(),this.wind=r,this.windFilter=i,this.initializing=Promise.all([["windTrees","wind-trees.ogg"],["windGrass","wind-grass.ogg"],["footsteps","leaf-footsteps.mp3"],["leaf0","leaves01.ogg"],["leaf1","leaves02.ogg"],["stone","gravel01.ogg"],["wood","wood01.ogg"],["wood2","wood02.ogg"],["wood3","wood03.ogg"],["mud","mud02.ogg"],["rockStep","stone01.ogg"],["robin","robin.mp3"],["robinAlt","robin-alt.mp3"],["blackbird","blackbird.mp3"],["cascade","cascade.mp3"],["stream","stream.mp3"],["splash","splash.mp3"]].map(async([o,a])=>{try{const c=await fetch("./audio/"+a);if(!c.ok)throw Error(a);this.buffers[o]=await e.decodeAudioData(await c.arrayBuffer())}catch{console.warn("Sound unavailable",a)}})).then(()=>this.samples=Object.values(this.buffers)),await e.resume()}setEnabled(e){this.enabled=e,this.ctx&&this.master.gain.setTargetAtTime(e?.65:0,this.ctx.currentTime,.12)}pause(){this.ctx?.suspend()}panner(e,t,n,i=3,r=38){const o=this.ctx.createPanner();return o.panningModel="HRTF",o.distanceModel="inverse",o.refDistance=i,o.maxDistance=r,o.rolloffFactor=1.8,o.positionX.value=e,o.positionY.value=t,o.positionZ.value=n,o.connect(this.master),o}play(e,t=.2,n=1,i=this.master,r=0,o=null){if(!this.ctx||this.ctx.state!=="running"||!e)return;const a=this.ctx.createBufferSource(),c=this.ctx.createGain();a.buffer=e,a.playbackRate.value=n;const l=this.ctx.currentTime,h=(o??Math.max(.01,e.duration-r))/n;return c.gain.setValueAtTime(0,l),c.gain.linearRampToValueAtTime(t,l+.006),c.gain.setValueAtTime(t,l+Math.max(.007,h-.045)),c.gain.linearRampToValueAtTime(0,l+h),a.connect(c).connect(i),o===null?a.start(l,r):a.start(l,r,o),a.addEventListener("ended",()=>{a.disconnect(),c.disconnect()},{once:!0}),a}step(e,t,n=!1,i="leaves",r=0,o=!1){if(!this.ctx||this.ctx.state!=="running")return;this.steps++;const a=o?.34:1;if(i==="water"){this.play(this.buffers.splash,.14*a,.8+Math.random()*.35);return}if(i==="leaves"&&this.buffers.footsteps){let h=Math.floor(Math.random()*12);h===this.lastFoot&&(h=(h+5)%12),this.lastFoot=h,this.play(this.buffers.footsteps,(n?.34:.25)*a,.94+Math.random()*.12,this.master,.075+h*.735,.53),r>.2&&this.play(this.buffers.splash,r*.025,1.5);return}const l=i==="leaves"?this.buffers["leaf"+this.steps%2]:i==="wood"?this.buffers[["wood","wood2","wood3"][this.steps%3]]:i==="grass"||i==="dirt"?this.buffers.mud:this.buffers.rockStep;this.play(l,(i==="grass"?.1:i==="leaves"?.25:.14)*a,.87+Math.random()*.24),r>.2&&this.play(this.buffers.splash,r*.032,1.5)}splashAt(e,t,n,i=.08){if(!this.ctx||this.ctx.state!=="running")return;const r=this.panner(e,t,n,2,28),o=this.play(this.buffers.splash,i,1.2,r);o?o.addEventListener("ended",()=>r.disconnect(),{once:!0}):r.disconnect()}rustleAt(e,t,n,i=.07){if(!this.ctx||this.ctx.state!=="running")return;const r=this.panner(e,t,n,2,25),o=this.play(this.buffers.leaf0,i,1.45,r);o?o.addEventListener("ended",()=>r.disconnect(),{once:!0}):r.disconnect()}call(e,t,n){if(!this.ctx||this.ctx.state!=="running")return;let i=this.animals.get(e);i||(i=this.panner(n.x,n.y,n.z,4,34),this.animals.set(e,i)),this.play(this.buffers[t==="blackbird"?"blackbird":Math.random()<.5?"robin":"robinAlt"],.17,.96+Math.random()*.07,i),this.calls.push({id:e,x:n.x,y:n.y,z:n.z,time:this.ctx.currentTime}),this.calls.length>20&&this.calls.shift()}moveAnimal(e,t,n,i){const r=this.animals.get(e);r&&(r.positionX.value=t,r.positionY.value=n,r.positionZ.value=i)}removeAnimal(e){this.animals.get(e)?.disconnect(),this.animals.delete(e)}waterLoop(e,t,n=6){if(!t)return null;const i=this.ctx,r=i.createBufferSource(),o=i.createBiquadFilter(),a=i.createGain(),c=this.panner(e.x,e.y,e.z,n,52);return o.type="highpass",o.frequency.value=420,r.buffer=t,r.loop=!0,a.gain.value=0,r.connect(o).connect(a).connect(c),r.start(0,Math.random()*Math.min(8,t.duration)),{source:r,gain:a,pan:c,filter:o}}canopyLoop(e,t,n,i){if(!e)return null;const r=this.ctx,o=r.createBufferSource(),a=r.createGain(),c=this.panner(t,n,i,10,65);return o.buffer=e,o.loop=!0,a.gain.value=0,o.connect(a).connect(c),o.start(0,Math.random()*e.duration),{source:o,gain:a,pan:c}}updateCanopy(e,t,n){const i=this.ctx,r=yi(t.x,t.z),o=Nu(e,t.x,t.z);if(!this.canopy&&this.buffers.windTrees&&(this.canopy=Array.from({length:3},()=>this.canopyLoop(this.buffers.windTrees,t.x,t.y+7,t.z)),this.grassLoop=this.canopyLoop(this.buffers.windGrass,t.x,t.y-.8,t.z)),!!this.canopy){if(!this.canopyAt||e-this.canopyAt>2.5){this.canopyAt=e;const a=n.trees.filter(c=>Math.hypot(c.x-t.x,c.z-t.z)<34).sort((c,l)=>Math.hypot(c.x-t.x,c.z-t.z)-Math.hypot(l.x-t.x,l.z-t.z));this.rustlers=[a[0],a[Math.min(3,a.length-1)],a[Math.min(7,a.length-1)]]}if(this.canopy.forEach((a,c)=>{const l=this.rustlers?.[c];a.gain.gain.setTargetAtTime(l?(.11+o.gust*.3)*(1-r.meadow*.35):0,i.currentTime,1.2),l&&(a.pan.positionX.setTargetAtTime(l.x,i.currentTime,1.1),a.pan.positionY.setTargetAtTime(l.y+7*l.scale,i.currentTime,1.1),a.pan.positionZ.setTargetAtTime(l.z,i.currentTime,1.1))}),this.grassLoop){const a=this.grassLoop;a.pan.positionX.value=t.x+5,a.pan.positionY.value=t.y-1,a.pan.positionZ.value=t.z-4,a.gain.gain.setTargetAtTime(r.meadow*(.12+o.gust*.36),i.currentTime,1.2)}}}update(e,t,n,i){if(!this.ctx||this.ctx.state!=="running")return;const r=this.ctx,o=r.listener;for(const[u,f]of Object.entries({positionX:t.x,positionY:t.y,positionZ:t.z,forwardX:-Math.sin(t.yaw)*Math.cos(t.pitch),forwardY:Math.sin(t.pitch),forwardZ:-Math.cos(t.yaw)*Math.cos(t.pitch),upX:0,upY:1,upZ:0}))o[u].setValueAtTime(f,r.currentTime);this.filter.frequency.setTargetAtTime(i.underwater?650:19e3,r.currentTime,.12);const a=.72+Math.sin(e*.071)*.21+Math.sin(e*.173)*.09;this.updateCanopy(e,t,n),this.wind.gain.setTargetAtTime(.008*a,r.currentTime,.8),this.windFilter.frequency.setTargetAtTime(480+a*250,r.currentTime,.8);const c=new Set;this.audibleFalls=[];for(const u of n.rivers.sources){const f=Math.hypot(u.x-t.x,u.z-t.z,u.y-t.y);if(f>56)continue;c.add(u.id);let m=this.falls.get(u.id);if(!m){if(m=this.waterLoop(u,this.buffers.cascade),!m)continue;this.falls.set(u.id,m)}const x=Math.pow(Math.max(0,1-f/52),2);m.gain.gain.setTargetAtTime(x*.32,r.currentTime,.25),x>.001&&this.audibleFalls.push({id:u.id,distance:f,gain:x*.32})}for(const[u,f]of this.falls)c.has(u)||(f.source.stop(),f.source.disconnect(),f.filter.disconnect(),f.gain.disconnect(),f.pan.disconnect(),this.falls.delete(u));const l=In(t.x,t.z);this.stream||(this.stream=this.waterLoop({x:l.x,y:l.level,z:t.z},this.buffers.stream,2)),this.stream&&(this.stream.pan.positionX.value=l.x,this.stream.pan.positionY.value=l.level,this.stream.pan.positionZ.value=t.z,this.stream.gain.gain.setTargetAtTime(Math.pow(Math.max(0,1-l.d/17),2)*.11,r.currentTime,.3)),this.analyser.getFloatTimeDomainData(this.wave);let h=0;for(const u of this.wave)h=Math.max(h,Math.abs(u));this.peak=Math.max(this.peak,h)}}const B_=new vn(1,16,10);function H_(){const s=document.createElement("canvas");s.width=s.height=256;const e=s.getContext("2d"),t=Dn(713);e.fillStyle="#b8afa0",e.fillRect(0,0,256,256);for(let i=0;i<22e3;i++){const r=100+t()*150;e.strokeStyle=`rgba(${r},${r},${r},.4)`,e.lineWidth=.5,e.beginPath();const o=t()*256,a=t()*256;e.moveTo(o,a),e.lineTo(o+(t()-.5)*3,a+2+t()*6),e.stroke()}const n=new Dc(s);return n.colorSpace=Pt,n.wrapS=n.wrapT=ii,n}const V_=new It({map:H_(),vertexColors:!0,roughness:.96}),Rs=new It({color:1052685,roughness:.21});function Ae(s,e,t,n,i,r,o,a=0){const c=B_.clone();c.scale(n,i,r),c.rotateX(a),c.translate(s,e,t);const l=new xe(o),h=[];for(let u=0;u<c.attributes.position.count;u++){const f=c.attributes.normal.getY(u);h.push(l.r*(.84+.16*Math.max(0,f)),l.g*(.84+.16*Math.max(0,f)),l.b*(.84+.16*Math.max(0,f)))}return c.setAttribute("color",new Ve(h,3)),c}function xt(s,e=V_){const t=Cu(s,!1);s.forEach(i=>i.dispose());const n=new Je(t,e);return n.castShadow=!0,n}function On(s,e,t,n,i){const r=new R(...s),o=new R(...e),a=o.clone().sub(r),c=new hs(n,t,a.length(),8,1);c.applyQuaternion(new xn().setFromUnitVectors(new R(0,1,0),a.normalize())),c.translate(...r.add(o).multiplyScalar(.5).toArray());const l=new xe(i),h=[];for(let u=0;u<c.attributes.position.count;u++)h.push(l.r,l.g,l.b);return c.setAttribute("color",new Ve(h,3)),c}function Oh(s=!1){const e=new We,t=new We;e.add(t);const n=s?4340529:8680537,i=s?3617580:6576712;t.add(xt([Ae(0,.17,0,.076,.106,.135,n,-.35),Ae(0,.19,.083,.067,.075,.058,s?5589305:13267258)]));const r=new We;r.position.set(0,.275,.085),t.add(r),r.add(xt([Ae(0,0,0,.061,.064,.061,n),Ae(0,0,.043,.048,.041,.018,s?4603441:12940351),On([0,.002,.05],[0,-.003,.099],.013,.001,s?13344826:4010532)]));for(let l of[-1,1]){const h=new Je(new vn(.009,10,8),Rs);h.position.set(l*.052,.016,.023),r.add(h)}const o=[];for(let l of[-1,1]){const h=new We;h.position.set(l*.055,.21,-.015),t.add(h);const u=[Ae(l*.024,-.025,-.025,.032,.075,.13,i,.3)];for(let f=0;f<7;f++)u.push(Ae(l*(.023+f*.004),-.025-f*.004,-.065-f*.011,.009,.009,.085,i,.3));h.add(xt(u)),o.push(h),t.add(xt([On([l*.027,.1,.03],[l*.028,.027,.037],.005,.003,6375214),On([l*.028,.027,.037],[l*.035,.012,.083],.003,.001,6375214),On([l*.028,.027,.037],[l*.048,.012,.059],.003,.001,6375214)]))}const a=new We;a.position.set(0,.14,-.09);const c=[];for(let l=0;l<5;l++)c.push(Ae((l-2)*.013,0,-.085,.013,.008,.11,i,-.12));return a.add(xt(c)),t.add(a),{root:e,body:t,wings:o,tail:a,head:r,kind:"bird"}}function G_(){const s=new We,e=new We;s.add(e);const t=10118977;e.add(xt([Ae(0,.24,-.025,.107,.155,.18,t,-.3),Ae(0,.2,.065,.075,.115,.08,12163445,-.3)]));const i=new We;i.position.set(0,.35,.13),e.add(i),i.add(xt([Ae(0,0,0,.069,.074,.086,t),Ae(0,-.02,.07,.04,.038,.052,11043938),Ae(-.045,.076,-.008,.022,.048,.015,t,-.12),Ae(.045,.076,-.008,.022,.048,.015,t,-.12),Ae(0,-.015,.116,.015,.013,.011,3353634)]));for(let u of[-1,1]){const f=new Je(new vn(.012,12,8),Rs);f.position.set(u*.06,.015,.045),i.add(f)}const r=[];for(let u of[-1,1])for(let f=0;f<2;f++){const m=new We;m.position.set(u*.07,.17,f?-.13:.1),m.add(xt([Ae(u*.014,-.035,0,f?.066:.027,f?.08:.065,f?.07:.026,t),Ae(u*.01,-.13,.035,.024,.019,.058,7689017)])),e.add(m),r.push(m)}const o=new We;o.position.set(0,.19,-.17),e.add(o);const a=new xu([new R(0,0,0),new R(.01,.16,-.16),new R(.025,.37,-.19),new R(.02,.55,-.05)]),c=new zc(a,28,.1,12,!1),l=c.attributes.position,h=[];for(let u=0;u<=28;u++){const f=u/28,m=a.getPointAt(f),x=(.055+Math.sin(f*Math.PI)*.078)*Math.sqrt(1-f*.55);for(let d=0;d<=12;d++){const g=u*13+d,p=new R().fromBufferAttribute(l,g).sub(m).normalize();l.setXYZ(g,m.x+p.x*x,m.y+p.y*x,m.z+p.z*x);const v=new xe(d%4===0?12094046:t);v.multiplyScalar(.86+Math.max(0,p.y)*.14),h.push(v.r,v.g,v.b)}}return c.setAttribute("color",new Ve(h,3)),c.computeVertexNormals(),o.add(xt([c])),{root:s,body:e,head:i,legs:r,tail:o,kind:"squirrel"}}function kh(s=!1){const e=new We,t=new We;e.add(t);const n=10059878,i=13022880,r=5326393;t.add(xt([Ae(0,1.03,0,.26,.35,.64,n),Ae(0,1.1,.48,.18,.43,.22,n,-.45),Ae(0,.98,-.52,.21,.27,.15,i)]));const o=new We;o.position.set(0,1.54,.61),t.add(o),o.add(xt([Ae(0,0,.055,.11,.16,.2,n,.25),Ae(0,-.09,.22,.072,.075,.16,n,.3),Ae(0,-.12,.355,.065,.04,.036,r),Ae(-.16,.16,-.005,.065,.16,.027,n,-.25),Ae(.16,.16,-.005,.065,.16,.027,n,-.25)]));for(let l of[-1,1]){const h=new Je(new vn(.018,10,8),Rs);if(h.position.set(l*.104,.013,.155),o.add(h),s){const u=[];for(let f=0;f<4;f++)u.push(On([l*(.065+f*.025),.13+f*.09,-f*.07],[l*(.09+f*.025),.22+f*.09,-.07-f*.07],.018-f*.003,.015-f*.003,10721658)),f>0&&u.push(On([l*(.07+f*.025),.17+f*.09,-.04-f*.07],[l*(.12+f*.035),.35+f*.09,.04-f*.07],.012,.002,10721658));o.add(xt(u))}}const a=[];for(let l of[-1,1])for(let h=0;h<2;h++){const u=new We;u.position.set(l*.16,1.02,h?-.4:.4),u.add(xt([On([0,0,0],[0,-.46,h?.06:-.04],.067,.035,n),On([0,-.46,h?.06:-.04],[0,-.94,.02],.033,.019,n),Ae(0,-.955,.055,.04,.055,.075,r)])),t.add(u),a.push(u)}const c=new We;return c.position.set(0,1.15,-.59),c.add(xt([Ae(0,0,-.08,.07,.045,.16,i,-.5)])),t.add(c),{root:e,body:t,head:o,legs:a,tail:c,kind:"deer"}}function W_(){const s=new We,e=new We;s.add(e);const t=9404516;e.add(xt([Ae(0,.25,-.06,.105,.16,.23,t),Ae(0,.22,.08,.08,.12,.12,11575424)]));const n=new We;n.position.set(0,.36,.15),n.add(xt([Ae(0,0,0,.063,.075,.085,t),Ae(0,-.025,.075,.044,.031,.04,10720636),Ae(-.031,.15,-.015,.024,.16,.018,t,-.2),Ae(.031,.15,-.015,.024,.16,.018,t,-.2),Ae(-.031,.16,.001,.011,.11,.007,7953743),Ae(.031,.16,.001,.011,.11,.007,7953743)])),e.add(n);for(const o of[-1,1]){const a=new Je(new vn(.01,8,6),Rs);a.position.set(o*.057,.02,.034),n.add(a)}const i=[];for(const o of[-1,1])for(let a=0;a<2;a++){const c=new We;c.position.set(o*.07,.2,a?-.19:.12),c.add(xt([Ae(0,-.08,.02,a?.055:.023,.09,.055,t),Ae(0,-.17,.07,.025,.025,a?.105:.06,t)])),e.add(c),i.push(c)}const r=new We;return r.add(xt([Ae(0,.24,-.28,.04,.05,.05,13616296)])),e.add(r),{root:s,body:e,head:n,legs:i,tail:r}}function X_(){const s=new We,e=new We;s.add(e);const t=10904885;e.add(xt([Ae(0,.48,0,.13,.18,.38,t),Ae(0,.48,.28,.1,.22,.12,t,-.3),Ae(0,.37,.27,.08,.12,.1,13154718)]));const n=new We;n.position.set(0,.67,.31),e.add(n),n.add(xt([Ae(0,0,.03,.082,.086,.12,t),Ae(0,-.02,.145,.047,.037,.12,t),Ae(0,-.025,.242,.022,.019,.022,2630429),Ae(-.057,.11,-.003,.031,.094,.019,t),Ae(.057,.11,-.003,.031,.094,.019,t)]));for(const o of[-1,1]){const a=new Je(new vn(.009,8,6),Rs);a.position.set(o*.071,.012,.076),n.add(a)}const i=[];for(const o of[-1,1])for(let a=0;a<2;a++){const c=new We;c.position.set(o*.085,.47,a?-.25:.25),c.add(xt([On([0,0,0],[0,-.28,a?.04:-.01],.038,.02,t),On([0,-.28,0],[0,-.45,.025],.02,.013,4470827),Ae(0,-.45,.05,.024,.025,.05,4470827)])),e.add(c),i.push(c)}const r=new We;return r.position.set(0,.46,-.32),r.add(xt([Ae(0,-.04,-.24,.075,.083,.29,t,-.16),Ae(0,-.075,-.48,.052,.06,.095,13024420,-.16)])),e.add(r),{root:s,body:e,head:n,legs:i,tail:r}}function q_(){const s=new We,e=new We;s.add(e),e.add(xt([Ae(0,.095,0,.12,.12,.25,9212292),Ae(0,.16,.13,.095,.13,.1,7754567),Ae(0,.26,.19,.055,.105,.058,3430730)]));const t=new We;t.position.set(0,.34,.21),e.add(t),t.add(xt([Ae(0,0,0,.064,.068,.084,2643016),Ae(0,-.015,.096,.041,.016,.065,12229698)]));for(const r of[-1,1]){const o=new Je(new vn(.007,8,6),Rs);o.position.set(r*.055,.015,.034),t.add(o)}const n=[];for(const r of[-1,1]){const o=new We;o.position.set(r*.09,.15,0),o.add(xt([Ae(r*.02,0,-.05,.044,.061,.2,6840142),Ae(r*.045,.01,-.06,.014,.043,.07,4085112)])),e.add(o),n.push(o)}const i=new We;return i.add(xt([Ae(0,.11,-.25,.07,.033,.08,4145723)])),e.add(i),{root:s,body:e,head:t,wings:n,tail:i}}class Y_{constructor(e,t,n){this.scene=e,this.world=t,this.audio=n,this.animals=new Map,this.spawned=new Set,this.tick=0,this.spooks={bird:0,squirrel:0,deer:0,hare:0,fox:0},this.calls=0,this.templates={robin:Oh(!1),blackbird:Oh(!0),squirrel:G_(),deer:kh(!1),stag:kh(!0),hare:W_(),fox:X_(),duck:q_()},this.lastCell="",this.events=[],this.tracks=[];const i=new Yt({transparent:!0,depthWrite:!1,side:Et,vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}",fragmentShader:"varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float d=min(length((p-vec2(.26,0.))*vec2(2.8,1.3)),length((p+vec2(.26,0.))*vec2(2.8,1.3)));gl_FragColor=vec4(.08,.055,.028,(1.-smoothstep(.65,1.,d))*.3);}"}),r=new Hn(.17,.23);r.rotateX(-Math.PI/2),this.trackMesh=new Ui(r,i,180),this.trackMesh.instanceMatrix.setUsage(Vs),this.trackMesh.count=0,this.trackMesh.frustumCulled=!1,e.add(this.trackMesh),this.dummy=new ct}model(e){const t=this.templates[e],n=t.root.clone(!0),i=new Map,r=(o,a)=>{i.set(o,a),o.children.forEach((c,l)=>r(c,a.children[l]))};return r(t.root,n),{root:n,body:i.get(t.body),head:i.get(t.head),tail:i.get(t.tail),legs:t.legs?.map(o=>i.get(o)),wings:t.wings?.map(o=>i.get(o))}}spawn(e,t){const n=Math.floor(e.x/30),i=Math.floor(e.z/30),r=n+","+i;if(r!==this.lastCell){this.lastCell=r;for(let o=-3;o<=3;o++)for(let a=-3;a<=3;a++){const c=n+a,l=i+o,h=c+","+l;if(this.spawned.has(h))continue;const u=Dn(Ze(c,l,373)*1e8),f=c*30+5+u()*20,m=l*30+5+u()*20,x=yi(f,m),d=Pe(f,m),g=x.site.pond&&d<Ot(f,m)-.25;if(!g&&(d<Ot(f,m)+.2||ys(f,m).y<.8))continue;this.spawned.add(h);let p=g?"duck":x.meadow>.4?u()<.58?"deer":"hare":u()<.12?"fox":u()<.58?"robin":"squirrel";p==="robin"&&u()<.3&&(p="blackbird");const v=p==="duck"?2+Math.floor(u()*2):p==="deer"?2+Math.floor(u()*3):p==="robin"?1+Math.floor(u()*2):1;for(let M=0;M<v;M++){let _=f+M*2.1,y=m+M*1.8,S=Pe(_,y);g&&(S=Ot(_,y)+.015);const A=p==="robin"||p==="blackbird"||g;if(A&&!g){const w=this.world.perches.filter(D=>!D.id.startsWith("rock:")&&![...this.animals.values()].some(L=>L.bird&&Math.hypot(L.x-D.x,L.z-D.z)<.7)).filter(D=>Math.hypot(D.x-_,D.z-y)<14);if(w.length){const D=w[Math.floor(u()*w.length)];_=D.x,S=D.y,y=D.z}}if(!g&&S<Ot(_,y)+.2||g&&Pe(_,y)>Ot(_,y)-.1)continue;const C=this.model(p==="deer"&&u()<.35?"stag":p),b={id:h+":"+M,kind:p,bird:A,waterBird:g,model:C,x:_,y:S,z:y,home:{x:_,z:y},yaw:u()*$e,phase:u()*$e,state:"idle",next:t+2+u()*9,callAt:t+2+u()*12,callCount:0,spooked:!1,age:0,target:null,trackX:_,trackZ:y};C.root.position.set(_,S,y),C.root.rotation.y=b.yaw,C.root.scale.setScalar(A?1.15:p==="deer"?.85+u()*.18:1),this.scene.add(C.root),this.animals.set(b.id,b)}}for(const[o,a]of this.animals)Math.hypot(a.x-e.x,a.z-e.z)>140&&(this.audio.removeAnimal(o),this.scene.remove(a.model.root),this.animals.delete(o));for(const o of this.spawned){const[a,c]=o.split(",").map(Number);Math.hypot(a*30+15-e.x,c*30+15-e.z)>175&&this.spawned.delete(o)}}}targetAway(e,t){if(e.waterBird){const r=[];for(let o=0;o<24;o++){const a=o/24*$e,c=e.x+Math.sin(a)*13,l=e.z+Math.cos(a)*13;Pe(c,l)<Ot(c,l)-.2&&r.push({x:c,z:l,y:Ot(c,l)+.015})}return r.sort((o,a)=>Math.hypot(a.x-t.x,a.z-t.z)-Math.hypot(o.x-t.x,o.z-t.z)),r[0]||{x:e.x,z:e.z,y:Ot(e.x,e.z)+.015}}let n=e.bird?this.world.perches.filter(r=>!r.id.startsWith("rock:")&&![...this.animals.values()].some(o=>o.bird&&Math.hypot(o.x-r.x,o.z-r.z)<.7)):this.world.trees;if(n=n.filter(r=>{const o=Math.hypot(r.x-e.x,r.z-e.z);return o>10&&o<32&&Math.hypot(r.x-t.x,r.z-t.z)>18}),n.length){n.sort((o,a)=>Math.hypot(o.x-e.x,o.z-e.z)-Math.hypot(a.x-e.x,a.z-e.z));const r=n[0];return{x:r.x,y:e.bird?r.y:Pe(r.x,r.z),z:r.z,tree:e.bird?null:r}}const i=Math.atan2(e.x-t.x,e.z-t.z)+(Ze(Math.floor(e.x),Math.floor(e.z),97)-.5)*1.4;return{x:e.x+Math.sin(i)*24,z:e.z+Math.cos(i)*24,y:0}}update(e,t,n,i){if(!i)return;this.tick++,this.spawn(n,t);const r=Math.hypot(n.vx,n.vz);for(const o of this.animals.values()){const a=Math.hypot(o.x-n.x,o.z-n.z),c=o.model;if(c.root.visible=a<(o.bird?46:85),a>85)continue;o.age+=e,o.state,o.state;const l=o.waterBird?r>3?14:r<1.5?4:7:o.bird?r>3?11:r<1.5?2.7:4.3:o.kind==="squirrel"?r>3?13:r<1.5?3.4:5:r>3?25:r<1.5?6.5:12;if(a<l&&o.state!=="fly"&&o.state!=="flee"&&o.state!=="climb"&&o.state!=="tree"&&o.state!=="descend"&&(o.state=o.bird?"fly":"flee",o.target=this.targetAway(o,n),o.origin={x:o.x,y:o.y,z:o.z},o.age=0,o.spooked=!0,this.spooks[o.bird?"bird":o.kind]++,o.waterBird&&this.audio.splashAt(o.x,o.y,o.z,.16),this.audio.rustleAt(o.x,o.y,o.z,o.bird?.06:.13),this.events.push({kind:o.kind,type:"flee",distance:a,time:t}),this.events.length>20&&this.events.shift()),o.state==="fly"){const h=go(o.age/3.1),u=h*h*(3-2*h);o.x=qe(o.origin.x,o.target.x,u),o.z=qe(o.origin.z,o.target.z,u);const f=o.target.y||Pe(o.target.x,o.target.z)+.02;o.y=qe(o.origin.y,f,u)+Math.sin(h*Math.PI)*5,o.yaw=Math.atan2(o.target.x-o.origin.x,o.target.z-o.origin.z),c.body.rotation.x=-.15;for(let m=0;m<2;m++)c.wings[m].rotation.z=(m?1:-1)*(1+Math.sin(t*43+o.phase)*.85),c.wings[m].rotation.y=(m?1:-1)*.8;h>=1&&(o.state="idle",o.age=0,o.next=t+6,o.callAt=t+6+Ze(o.x,o.z)*10,c.body.rotation.x=0,c.wings.forEach(m=>m.rotation.set(0,0,0)))}else if(o.state==="flee"||o.state==="wander"){const h=o.state==="flee",u=o.target.x-o.x,f=o.target.z-o.z,m=Math.hypot(u,f),x=h?o.kind==="squirrel"?5:6.5:o.kind==="deer"?.5:.8;if(m>.6){const d=Math.min(m,x*e),g=o.x+u/m*d,p=o.z+f/m*d;if(Pe(g,p)>Ot(g,p)+.1){const M=this.world.move(o.x,o.z,g-o.x,p-o.z);o.x=M.x,o.z=M.z}else o.target={x:o.x,z:o.z};o.yaw=Math.atan2(u,f),o.y=Pe(o.x,o.z);const v=Math.max(0,Math.sin(o.age*(h?18:8)));c.body.position.y=h?v*(o.kind==="deer"?.12:o.kind==="hare"?.18:.06):0,c.legs?.forEach((M,_)=>M.rotation.x=Math.sin(o.age*(h?18:8)+_%2*Math.PI)*(h?.8:.25)),this.tick%45===0&&a<22&&this.audio.rustleAt(o.x,o.y,o.z,.07)}(m<1||o.age>7)&&(h&&m<1&&o.kind==="squirrel"&&o.target.tree?(o.state="climb",o.tree=o.target.tree,o.y=Pe(o.tree.x,o.tree.z),o.climbAngle=o.yaw+Math.PI):(o.state="idle",o.next=t+3+Ze(o.x,o.z)*6,c.body.position.y=0,c.legs?.forEach(d=>d.rotation.x=0)),o.age=0)}else if(o.state==="climb")o.y+=e*2.7,c.body.rotation.x=-1.1,c.tail.rotation.x=.3,(o.age>1.8||o.y>o.tree.y+this.world.prototypes[o.tree.species*3+o.tree.variant].near.height*o.tree.scale*.55)&&(o.state="tree",o.next=t+20);else if(o.state==="tree")t>o.next&&a>12&&(o.state="descend",o.age=0);else if(o.state==="descend")o.y-=e*1.8,c.body.rotation.x=1.1,o.y<=Pe(o.x,o.z)&&(o.y=Pe(o.x,o.z),o.state="idle",o.next=t+8,c.body.rotation.x=0);else{if(c.body.position.y=Math.sin(t*2+o.phase)*.004,o.bird?(c.head.rotation.y=Math.sin(Math.floor(t*1.4+o.phase))*.35,c.tail.rotation.x=Math.sin(t*3+o.phase)*.08,!o.waterBird&&t>o.callAt&&a<34&&(this.audio.call(o.id,o.kind,{x:o.x,y:o.y+.28,z:o.z}),o.callAt=t+6+Ze(Math.floor(t),o.x)*13,o.callCount++,this.calls++)):(c.head.rotation.x=o.kind==="deer"?Math.sin(t*.45+o.phase)*.45+.2:Math.sin(t*2+o.phase)*.1,c.head.rotation.y=Math.sin(t*.72+o.phase)*.27,c.tail.rotation.z=Math.sin(t*2+o.phase)*(o.kind==="squirrel"?.1:.03)),o.bird&&!o.waterBird&&t>o.next+27&&a>7){const h=this.world.perches.filter(u=>!u.id.startsWith("rock:")&&![...this.animals.values()].some(f=>f.bird&&Math.hypot(f.x-u.x,f.z-u.z)<.7)).filter(u=>Math.hypot(u.x-o.x,u.z-o.z)>7&&Math.hypot(u.x-o.x,u.z-o.z)<22);h.length?(o.target=h[Math.floor(Ze(o.x,Math.floor(t),38)*h.length)],o.origin={x:o.x,y:o.y,z:o.z},o.state="fly",o.age=0):o.next=t+12}if(!o.bird&&t>o.next){const h=Ze(Math.floor(t),o.x)*$e,u=o.x+Math.sin(h)*4,f=o.z+Math.cos(h)*4;Pe(u,f)>Ot(u,f)+.2&&(o.state="wander",o.target={x:u,z:f},o.age=0),o.next=t+5+Ze(o.x,t)*9}}if(!o.bird&&Math.hypot(o.x-o.trackX,o.z-o.trackZ)>(o.kind==="deer"?.75:.32)&&o.state!=="tree"&&o.state!=="climb"){const h=In(o.x,o.z);(lr(o.x,o.z)<2.5||h.d<h.width+7)&&this.tracks.push({x:o.x,z:o.z,angle:o.yaw,size:o.kind==="deer"?1:.4,time:t}),o.trackX=o.x,o.trackZ=o.z}if(!o.bird&&(o.state==="idle"||o.state==="wander"||o.state==="flee"))for(const h of this.animals.values()){if(h===o||h.bird||h.state==="climb"||h.state==="tree"||h.state==="descend")continue;const u=o.x-h.x,f=o.z-h.z,m=Math.hypot(u,f),x=(o.kind==="deer"?.95:.28)+(h.kind==="deer"?.95:.28);if(m>.001&&m<x){const d=(x-m)*.55,g=this.world.move(o.x,o.z,u/m*d,f/m*d);Pe(g.x,g.z)>Ot(g.x,g.z)+.1&&(o.x=g.x,o.z=g.z,o.y=Pe(o.x,o.z))}}if(o.state==="climb"||o.state==="tree"||o.state==="descend"){const h=this.world.trunkPoint(o.tree,o.y+.28),u=h.r+.23;o.x=h.x+Math.sin(o.climbAngle)*u,o.z=h.z+Math.cos(o.climbAngle)*u}if(o.waterBird&&o.state!=="fly"){const h=o.phase+t*.11,u=o.x+Math.sin(h)*e*.21,f=o.z+Math.cos(h)*e*.21;Pe(u,f)<Ot(u,f)-.12&&(o.x=u,o.z=f,o.yaw=h),o.y=Ot(o.x,o.z)+Math.sin(t*1.8+o.phase)*.008,this.tick%85===0&&a<32&&this.world.rivers.splash(o.x,o.z,t)}c.root.position.set(o.x,o.y,o.z),c.root.rotation.y=o.yaw,this.audio.moveAnimal(o.id,o.x,o.y+.25,o.z)}this.tracks=this.tracks.filter(o=>t-o.time<70).slice(-180),this.trackMesh.count=this.tracks.length,this.tracks.forEach((o,a)=>{const c=this.dummy;c.position.set(o.x,Pe(o.x,o.z)+.023,o.z),c.quaternion.setFromUnitVectors(new R(0,1,0),ys(o.x,o.z)),c.rotateY(o.angle),c.scale.setScalar(o.size),c.updateMatrix(),this.trackMesh.setMatrixAt(a,c.matrix)}),this.trackMesh.instanceMatrix.needsUpdate=!0}inspect(e){return{tracks:this.tracks.length,count:this.animals.size,calls:this.calls,spooks:{...this.spooks},nearby:[...this.animals.values()].map(t=>({id:t.id,kind:t.kind,x:t.x,y:t.y,z:t.z,state:t.state,calls:t.callCount,distance:Math.hypot(t.x-e.x,t.z-e.z)})).sort((t,n)=>t.distance-n.distance).slice(0,12),events:this.events}}}const hr=document.querySelector("#forest"),rr=document.querySelector("#enter"),vo=document.querySelector("#error"),kt=new Set,Bt=new k_;let nn=!1,ao=!1,as=!matchMedia("(prefers-reduced-motion: reduce)").matches,yt,zt,Jr,Xt={},Ws=0,J={x:40,z:6,y:Pe(40,6)+1.69,yaw:-.785,pitch:.025,vx:0,vz:0,vy:0,distance:0},Sn=0,co=performance.now(),ma=0,$s=[],dc={},Bh=0,Hh=0;try{const s=JSON.parse(localStorage.getItem("autumn:walk:v4")||"null");s&&[s.x,s.z,s.yaw,s.pitch].every(Number.isFinite)&&(J={...J,...s},J.y=Pe(J.x,J.z)+1.69)}catch{}function Kc(){try{localStorage.setItem("autumn:walk:v4",JSON.stringify({x:J.x,z:J.z,yaw:J.yaw,pitch:J.pitch}))}catch{}}function _o(){nn=!1,kt.clear(),J.vx=J.vz=0,document.body.classList.remove("walking"),rr.textContent="Continue walking",Bt.pause(),Kc()}async function Wu(){if(ao){await Bt.start();try{await hr.requestPointerLock()}catch{vo.textContent="Click the forest to use the mouse. Escape releases it."}}}rr.addEventListener("click",Wu);hr.addEventListener("click",()=>{nn||Wu()});document.addEventListener("pointerlockchange",()=>{nn=document.pointerLockElement===hr,nn?(document.body.classList.add("walking"),Bt.start(),co=performance.now(),vo.textContent=""):_o()});document.addEventListener("mousemove",s=>{nn&&(J.yaw-=s.movementX*.00165,J.pitch=go(J.pitch-s.movementY*.00165,-1.42,1.42))});window.addEventListener("keydown",s=>{if(s.code==="Escape"&&nn){document.exitPointerLock(),_o();return}["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","ShiftLeft","ShiftRight","ControlLeft","ControlRight"].includes(s.code)&&(nn&&s.preventDefault(),kt.add(s.code))});window.addEventListener("keyup",s=>kt.delete(s.code));window.addEventListener("blur",()=>{kt.clear(),J.vx=J.vz=0,document.pointerLockElement&&document.exitPointerLock()});document.addEventListener("visibilitychange",()=>{document.hidden&&(kt.clear(),document.pointerLockElement&&document.exitPointerLock(),_o())});window.addEventListener("pagehide",Kc);document.querySelector("#sound").onclick=s=>{Bt.setEnabled(!Bt.enabled),s.target.textContent=Bt.enabled?"Sound on":"Sound off",s.target.setAttribute("aria-pressed",String(Bt.enabled))};document.querySelector("#quality").onclick=s=>{yt&&(s.target.textContent="Detail: "+yt.detail())};document.querySelector("#sway").textContent=as?"Walking motion on":"Walking motion off";document.querySelector("#sway").onclick=s=>{as=!as,s.target.textContent=as?"Walking motion on":"Walking motion off",s.target.setAttribute("aria-pressed",String(as))};document.querySelector("#full").onclick=()=>{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{})};hr.addEventListener("webglcontextlost",s=>{s.preventDefault(),_o(),vo.textContent="The graphics connection was interrupted. Reload to continue from your last position."});function Vh(){const s=y_(J.x,J.z,J.y);return zt.walkHeight(J.x,J.z)>s.level+.06&&zt.walkHeight(J.x,J.z)>Pe(J.x,J.z)+.12?{...s,depth:0,swimming:!1,underwater:!1}:s}function Xu(s){requestAnimationFrame(Xu),s=performance.now();const e=Math.max(0,(s-co)/1e3),t=Math.min(.15,e);if(co=s,document.hidden||!ao)return;if(!nn){if(s-Hh<140)return;Hh=s}if(Sn+=t,Jt.time.value=Sn,nn&&Sn>4&&yt.observeFrame(e*1e3),nn){const r=t,o=Math.ceil(r/.025);for(let a=0;a<o;a++){const c=r/o;let l=(kt.has("KeyW")||kt.has("ArrowUp")?1:0)-(kt.has("KeyS")||kt.has("ArrowDown")?1:0),h=(kt.has("KeyD")?1:0)-(kt.has("KeyA")?1:0);kt.has("ArrowLeft")&&(J.yaw+=c*1.1),kt.has("ArrowRight")&&(J.yaw-=c*1.1);const u=Math.hypot(l,h);u>0&&(l/=u,h/=u),Xt=Vh();const f=kt.has("ShiftLeft")||kt.has("ShiftRight"),m=kt.has("ControlLeft")||kt.has("ControlRight"),x=(m?1.15:f?4.6:2.7)*(Xt.swimming?.46:Xt.depth>.15?.61:1),d=(h*Math.cos(J.yaw)-l*Math.sin(J.yaw))*x,g=(-l*Math.cos(J.yaw)-h*Math.sin(J.yaw))*x,p=1-Math.exp(-c*(u?15:22));J.vx+=(d-J.vx)*p,J.vz+=(g-J.vz)*p;const v=zt.move(J.x,J.z,J.vx*c,J.vz*c+(Xt.depth>1.2?.16+Xt.spray*.5:0)*c),M=Math.hypot(v.x-J.x,v.z-J.z);if(J.x=v.x,J.z=v.z,J.distance+=M,ma+=M,ma>(Xt.swimming?1.3:f?1.05:.86)){ma=0;const y=zt.walkSurface(J.x,J.z)||M_(J.x,J.z);Bt.step(J.x,J.z,f,y,Ws,m),y==="water"&&zt.rivers.splash(J.x,J.z,Sn),y==="leaves"&&zt.kick(J.x-Math.sin(J.yaw)*.32,J.z-Math.cos(J.yaw)*.32,J.vx,J.vz)}Xt=Vh(),Ws=Math.max(Ws-c*.018,Xt.spray,Xt.depth>.7?.8:0);const _=Math.max(zt.walkHeight(J.x,J.z)+1.69,Xt.swimming?Xt.level+.34:-1/0);Xt.swimming?(J.vy+=(_-J.y)*c*12,J.vy*=Math.exp(-c*4),J.y+=J.vy*c):J.y>_+.16?(J.vy-=c*9.81,J.y+=J.vy*c,J.y<_&&(J.y=_,J.vy=0)):(J.y+=(_-J.y)*(1-Math.exp(-c*16)),J.vy=0),Sn-Bh>8&&(Kc(),Bh=Sn)}}const n=Math.min(1,Math.hypot(J.vx,J.vz)),i=nn&&as?Math.sin(J.distance*j_/.86)*.014*n:0;yt.camera.position.set(J.x,J.y+i,J.z),yt.camera.rotation.set(J.pitch,J.yaw,0),Jt.player.value.copy(yt.camera.position),zt.update(t,Sn,J),Jr.update(t,Sn,J,nn),Bt.update(Sn,J,zt,Xt),yt.setWetness(Ws,Xt.spray||0,Xt.underwater||!1),dc=yt.render(Sn),nn&&($s.push(e*1e3),$s.length>1200&&$s.shift())}const j_=Math.PI*2;async function K_(){yt=new w_(hr);const[s]=await Promise.all([v_(yt.renderer),yt.loadSky()]);zt=new O_(yt.scene,s),await zt.init(J.x,J.z),Jr=new Y_(yt.scene,zt,Bt),Jr.spawn(J,Sn),J.y=zt.walkHeight(J.x,J.z)+1.69,yt.camera.position.set(J.x,J.y,J.z),yt.camera.rotation.set(J.pitch,J.yaw,0),yt.renderer.shadowMap.needsUpdate=!0,await yt.renderer.compileAsync(yt.scene,yt.camera),yt.render(0),ao=!0,rr.disabled=!1,rr.textContent="Walk",co=performance.now(),requestAnimationFrame(Xu),window.AUTUMN=Object.freeze({inspect:()=>{const e=[...$s].sort((n,i)=>n-i),t=ar(J.x,J.z);return{ready:ao,walking:nn,position:{x:J.x,y:J.y,z:J.z},yaw:J.yaw,pitch:J.pitch,distance:J.distance,steps:Bt.steps,frames:$s.length,medianMs:e[Math.floor(e.length*.5)]||0,p95Ms:e[Math.floor(e.length*.95)]||0,drawCalls:dc.calls,triangles:dc.tris,tiles:zt.tiles.size,objects:yt.renderer.info.memory,nearestPlace:t.name,places:zt.scenery.loaded,placeDistance:Math.hypot(J.x-t.x,J.z-t.z),streamRebuilds:zt.rebuilds,water:{...Xt,wetness:Ws},wildlife:Jr.inspect(J),audio:{falls:Bt.audibleFalls,calls:Bt.calls,state:Bt.ctx?.state||"not started",enabled:Bt.enabled,peak:Bt.peak,samples:Bt.samples.filter(Boolean).length},quality:yt.quality,renderScale:yt.renderScale||1,renderSize:{width:yt.target.width,height:yt.target.height},leafParticles:zt.fallCount,kickedLeaves:zt.kicks.length,hasHUD:document.body.classList.contains("walking")?getComputedStyle(document.querySelector("#veil")).visibility!=="hidden":!1}}})}K_().catch(s=>{console.error(s),rr.textContent="Unable to load",vo.textContent="The forest could not load. Reload to try again. "+s.message});
