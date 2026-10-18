(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(i){if(i.ep)return;i.ep=!0;const r=t(i);fetch(i.href,r)}})();/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const gc="180",Ju=0,rl=1,Qu=2,qh=1,Yh=2,$n=3,ni=0,Vt=1,Tt=2,gi=0,us=1,ol=2,al=3,cl=4,ed=5,Ui=100,td=101,nd=102,id=103,sd=104,rd=200,od=201,ad=202,cd=203,xa=204,va=205,ld=206,hd=207,ud=208,dd=209,fd=210,pd=211,md=212,gd=213,_d=214,ya=0,Ma=1,Sa=2,ms=3,ba=4,wa=5,Ea=6,Ta=7,jh=0,xd=1,vd=2,_i=0,yd=1,Md=2,Sd=3,Kh=4,bd=5,wd=6,Ed=7,ll="attached",Td="detached",$h=300,gs=301,_s=302,eo=303,Aa=304,ho=306,ii=1e3,cn=1001,to=1002,Jt=1003,Zh=1004,Hs=1005,Dt=1006,Wr=1007,An=1008,Bn=1009,Jh=1010,Qh=1011,$s=1012,_c=1013,yi=1014,en=1015,Rn=1016,xc=1017,vc=1018,Zs=1020,eu=35902,tu=35899,nu=1021,iu=1022,ln=1023,Js=1026,Qs=1027,yc=1028,Mc=1029,su=1030,Sc=1031,bc=1033,Xr=33776,qr=33777,Yr=33778,jr=33779,Ra=35840,Ca=35841,Pa=35842,La=35843,Ia=36196,Da=37492,Ua=37496,Na=37808,Fa=37809,za=37810,Oa=37811,ka=37812,Ba=37813,Ha=37814,Va=37815,Ga=37816,Wa=37817,Xa=37818,qa=37819,Ya=37820,ja=37821,Ka=36492,$a=36494,Za=36495,Ja=36283,Qa=36284,ec=36285,tc=36286,er=2300,tr=2301,bo=2302,hl=2400,ul=2401,dl=2402,Ad=2500,Rd=0,ru=1,nc=2,Cd=3200,Pd=3201,ou=0,Ld=1,Zn="",Ct="srgb",jt="srgb-linear",no="linear",dt="srgb",Vi=7680,fl=519,Id=512,Dd=513,Ud=514,au=515,Nd=516,Fd=517,zd=518,Od=519,ic=35044,sc=35048,pl="300 es",zn=2e3,io=2001;class bs{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const i=n[e];if(i!==void 0){const r=i.indexOf(t);r!==-1&&i.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const i=n.slice(0);for(let r=0,o=i.length;r<o;r++)i[r].call(this,e);e.target=null}}}const Wt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let ml=1234567;const Ws=Math.PI/180,xs=180/Math.PI;function Cn(){const s=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Wt[s&255]+Wt[s>>8&255]+Wt[s>>16&255]+Wt[s>>24&255]+"-"+Wt[e&255]+Wt[e>>8&255]+"-"+Wt[e>>16&15|64]+Wt[e>>24&255]+"-"+Wt[t&63|128]+Wt[t>>8&255]+"-"+Wt[t>>16&255]+Wt[t>>24&255]+Wt[n&255]+Wt[n>>8&255]+Wt[n>>16&255]+Wt[n>>24&255]).toLowerCase()}function Xe(s,e,t){return Math.max(e,Math.min(t,s))}function wc(s,e){return(s%e+e)%e}function kd(s,e,t,n,i){return n+(s-e)*(i-n)/(t-e)}function Bd(s,e,t){return s!==e?(t-s)/(e-s):0}function Xs(s,e,t){return(1-t)*s+t*e}function Hd(s,e,t,n){return Xs(s,e,1-Math.exp(-t*n))}function Vd(s,e=1){return e-Math.abs(wc(s,e*2)-e)}function Gd(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*(3-2*s))}function Wd(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*s*(s*(s*6-15)+10))}function Xd(s,e){return s+Math.floor(Math.random()*(e-s+1))}function qd(s,e){return s+Math.random()*(e-s)}function Yd(s){return s*(.5-Math.random())}function jd(s){s!==void 0&&(ml=s);let e=ml+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Kd(s){return s*Ws}function $d(s){return s*xs}function Zd(s){return(s&s-1)===0&&s!==0}function Jd(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function Qd(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function ef(s,e,t,n,i){const r=Math.cos,o=Math.sin,a=r(t/2),c=o(t/2),l=r((e+n)/2),h=o((e+n)/2),u=r((e-n)/2),d=o((e-n)/2),m=r((n-e)/2),_=o((n-e)/2);switch(i){case"XYX":s.set(a*h,c*u,c*d,a*l);break;case"YZY":s.set(c*d,a*h,c*u,a*l);break;case"ZXZ":s.set(c*u,c*d,a*h,a*l);break;case"XZX":s.set(a*h,c*_,c*m,a*l);break;case"YXY":s.set(c*m,a*h,c*_,a*l);break;case"ZYZ":s.set(c*_,c*m,a*h,a*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function wn(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function ct(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}const tf={DEG2RAD:Ws,RAD2DEG:xs,generateUUID:Cn,clamp:Xe,euclideanModulo:wc,mapLinear:kd,inverseLerp:Bd,lerp:Xs,damp:Hd,pingpong:Vd,smoothstep:Gd,smootherstep:Wd,randInt:Xd,randFloat:qd,randFloatSpread:Yd,seededRandom:jd,degToRad:Kd,radToDeg:$d,isPowerOfTwo:Zd,ceilPowerOfTwo:Jd,floorPowerOfTwo:Qd,setQuaternionFromProperEuler:ef,normalize:ct,denormalize:wn};class he{constructor(e=0,t=0){he.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Xe(this.x,e.x,t.x),this.y=Xe(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Xe(this.x,e,t),this.y=Xe(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Xe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Xe(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),i=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*i+e.x,this.y=r*i+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class xn{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,r,o,a){let c=n[i+0],l=n[i+1],h=n[i+2],u=n[i+3];const d=r[o+0],m=r[o+1],_=r[o+2],p=r[o+3];if(a===0){e[t+0]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u;return}if(a===1){e[t+0]=d,e[t+1]=m,e[t+2]=_,e[t+3]=p;return}if(u!==p||c!==d||l!==m||h!==_){let g=1-a;const f=c*d+l*m+h*_+u*p,x=f>=0?1:-1,v=1-f*f;if(v>Number.EPSILON){const b=Math.sqrt(v),w=Math.atan2(b,f*x);g=Math.sin(g*w)/b,a=Math.sin(a*w)/b}const y=a*x;if(c=c*g+d*y,l=l*g+m*y,h=h*g+_*y,u=u*g+p*y,g===1-a){const b=1/Math.sqrt(c*c+l*l+h*h+u*u);c*=b,l*=b,h*=b,u*=b}}e[t]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,i,r,o){const a=n[i],c=n[i+1],l=n[i+2],h=n[i+3],u=r[o],d=r[o+1],m=r[o+2],_=r[o+3];return e[t]=a*_+h*u+c*m-l*d,e[t+1]=c*_+h*d+l*u-a*m,e[t+2]=l*_+h*m+a*d-c*u,e[t+3]=h*_-a*u-c*d-l*m,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,i=e._y,r=e._z,o=e._order,a=Math.cos,c=Math.sin,l=a(n/2),h=a(i/2),u=a(r/2),d=c(n/2),m=c(i/2),_=c(r/2);switch(o){case"XYZ":this._x=d*h*u+l*m*_,this._y=l*m*u-d*h*_,this._z=l*h*_+d*m*u,this._w=l*h*u-d*m*_;break;case"YXZ":this._x=d*h*u+l*m*_,this._y=l*m*u-d*h*_,this._z=l*h*_-d*m*u,this._w=l*h*u+d*m*_;break;case"ZXY":this._x=d*h*u-l*m*_,this._y=l*m*u+d*h*_,this._z=l*h*_+d*m*u,this._w=l*h*u-d*m*_;break;case"ZYX":this._x=d*h*u-l*m*_,this._y=l*m*u+d*h*_,this._z=l*h*_-d*m*u,this._w=l*h*u+d*m*_;break;case"YZX":this._x=d*h*u+l*m*_,this._y=l*m*u+d*h*_,this._z=l*h*_-d*m*u,this._w=l*h*u-d*m*_;break;case"XZY":this._x=d*h*u-l*m*_,this._y=l*m*u-d*h*_,this._z=l*h*_+d*m*u,this._w=l*h*u+d*m*_;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],i=t[4],r=t[8],o=t[1],a=t[5],c=t[9],l=t[2],h=t[6],u=t[10],d=n+a+u;if(d>0){const m=.5/Math.sqrt(d+1);this._w=.25/m,this._x=(h-c)*m,this._y=(r-l)*m,this._z=(o-i)*m}else if(n>a&&n>u){const m=2*Math.sqrt(1+n-a-u);this._w=(h-c)/m,this._x=.25*m,this._y=(i+o)/m,this._z=(r+l)/m}else if(a>u){const m=2*Math.sqrt(1+a-n-u);this._w=(r-l)/m,this._x=(i+o)/m,this._y=.25*m,this._z=(c+h)/m}else{const m=2*Math.sqrt(1+u-n-a);this._w=(o-i)/m,this._x=(r+l)/m,this._y=(c+h)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Xe(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,i=e._y,r=e._z,o=e._w,a=t._x,c=t._y,l=t._z,h=t._w;return this._x=n*h+o*a+i*l-r*c,this._y=i*h+o*c+r*a-n*l,this._z=r*h+o*l+n*c-i*a,this._w=o*h-n*a-i*c-r*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,i=this._y,r=this._z,o=this._w;let a=o*e._w+n*e._x+i*e._y+r*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=n,this._y=i,this._z=r,this;const c=1-a*a;if(c<=Number.EPSILON){const m=1-t;return this._w=m*o+t*this._w,this._x=m*n+t*this._x,this._y=m*i+t*this._y,this._z=m*r+t*this._z,this.normalize(),this}const l=Math.sqrt(c),h=Math.atan2(l,a),u=Math.sin((1-t)*h)/l,d=Math.sin(t*h)/l;return this._w=o*u+this._w*d,this._x=n*u+this._x*d,this._y=i*u+this._y*d,this._z=r*u+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class C{constructor(e=0,t=0,n=0){C.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(gl.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(gl.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*i,this.y=r[1]*t+r[4]*n+r[7]*i,this.z=r[2]*t+r[5]*n+r[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*i+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*i+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*i+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*i+r[14])*o,this}applyQuaternion(e){const t=this.x,n=this.y,i=this.z,r=e.x,o=e.y,a=e.z,c=e.w,l=2*(o*i-a*n),h=2*(a*t-r*i),u=2*(r*n-o*t);return this.x=t+c*l+o*u-a*h,this.y=n+c*h+a*l-r*u,this.z=i+c*u+r*h-o*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*i,this.y=r[1]*t+r[5]*n+r[9]*i,this.z=r[2]*t+r[6]*n+r[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Xe(this.x,e.x,t.x),this.y=Xe(this.y,e.y,t.y),this.z=Xe(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Xe(this.x,e,t),this.y=Xe(this.y,e,t),this.z=Xe(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Xe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,i=e.y,r=e.z,o=t.x,a=t.y,c=t.z;return this.x=i*c-r*a,this.y=r*o-n*c,this.z=n*a-i*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return wo.copy(this).projectOnVector(e),this.sub(wo)}reflect(e){return this.sub(wo.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Xe(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const wo=new C,gl=new xn;class He{constructor(e,t,n,i,r,o,a,c,l){He.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,r,o,a,c,l)}set(e,t,n,i,r,o,a,c,l){const h=this.elements;return h[0]=e,h[1]=i,h[2]=a,h[3]=t,h[4]=r,h[5]=c,h[6]=n,h[7]=o,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,r=this.elements,o=n[0],a=n[3],c=n[6],l=n[1],h=n[4],u=n[7],d=n[2],m=n[5],_=n[8],p=i[0],g=i[3],f=i[6],x=i[1],v=i[4],y=i[7],b=i[2],w=i[5],R=i[8];return r[0]=o*p+a*x+c*b,r[3]=o*g+a*v+c*w,r[6]=o*f+a*y+c*R,r[1]=l*p+h*x+u*b,r[4]=l*g+h*v+u*w,r[7]=l*f+h*y+u*R,r[2]=d*p+m*x+_*b,r[5]=d*g+m*v+_*w,r[8]=d*f+m*y+_*R,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8];return t*o*h-t*a*l-n*r*h+n*a*c+i*r*l-i*o*c}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8],u=h*o-a*l,d=a*c-h*r,m=l*r-o*c,_=t*u+n*d+i*m;if(_===0)return this.set(0,0,0,0,0,0,0,0,0);const p=1/_;return e[0]=u*p,e[1]=(i*l-h*n)*p,e[2]=(a*n-i*o)*p,e[3]=d*p,e[4]=(h*t-i*c)*p,e[5]=(i*r-a*t)*p,e[6]=m*p,e[7]=(n*c-l*t)*p,e[8]=(o*t-n*r)*p,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,r,o,a){const c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*o+l*a)+o+e,-i*l,i*c,-i*(-l*o+c*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(Eo.makeScale(e,t)),this}rotate(e){return this.premultiply(Eo.makeRotation(-e)),this}translate(e,t){return this.premultiply(Eo.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Eo=new He;function cu(s){for(let e=s.length-1;e>=0;--e)if(s[e]>=65535)return!0;return!1}function nr(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function nf(){const s=nr("canvas");return s.style.display="block",s}const _l={};function ir(s){s in _l||(_l[s]=!0,console.warn(s))}function sf(s,e,t){return new Promise(function(n,i){function r(){switch(s.clientWaitSync(e,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}const xl=new He().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),vl=new He().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function rf(){const s={enabled:!0,workingColorSpace:jt,spaces:{},convert:function(i,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===dt&&(i.r=ei(i.r),i.g=ei(i.g),i.b=ei(i.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(i.applyMatrix3(this.spaces[r].toXYZ),i.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===dt&&(i.r=ds(i.r),i.g=ds(i.g),i.b=ds(i.b))),i},workingToColorSpace:function(i,r){return this.convert(i,this.workingColorSpace,r)},colorSpaceToWorking:function(i,r){return this.convert(i,r,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===Zn?no:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,r=this.workingColorSpace){return i.fromArray(this.spaces[r].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,r,o){return i.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(i,r){return ir("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),s.workingToColorSpace(i,r)},toWorkingColorSpace:function(i,r){return ir("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),s.colorSpaceToWorking(i,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return s.define({[jt]:{primaries:e,whitePoint:n,transfer:no,toXYZ:xl,fromXYZ:vl,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Ct},outputColorSpaceConfig:{drawingBufferColorSpace:Ct}},[Ct]:{primaries:e,whitePoint:n,transfer:dt,toXYZ:xl,fromXYZ:vl,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Ct}}}),s}const nt=rf();function ei(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function ds(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}let Gi;class of{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Gi===void 0&&(Gi=nr("canvas")),Gi.width=e.width,Gi.height=e.height;const i=Gi.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=Gi}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=nr("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const i=n.getImageData(0,0,e.width,e.height),r=i.data;for(let o=0;o<r.length;o++)r[o]=ei(r[o]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(ei(t[n]/255)*255):t[n]=ei(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let af=0;class Ec{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:af++}),this.uuid=Cn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let r;if(Array.isArray(i)){r=[];for(let o=0,a=i.length;o<a;o++)i[o].isDataTexture?r.push(To(i[o].image)):r.push(To(i[o]))}else r=To(i);n.url=r}return t||(e.images[this.uuid]=n),n}}function To(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?of.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let cf=0;const Ao=new C;class Ut extends bs{constructor(e=Ut.DEFAULT_IMAGE,t=Ut.DEFAULT_MAPPING,n=cn,i=cn,r=Dt,o=An,a=ln,c=Bn,l=Ut.DEFAULT_ANISOTROPY,h=Zn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:cf++}),this.uuid=Cn(),this.name="",this.source=new Ec(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=r,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new he(0,0),this.repeat=new he(1,1),this.center=new he(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new He,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(Ao).x}get height(){return this.source.getSize(Ao).y}get depth(){return this.source.getSize(Ao).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){console.warn(`THREE.Texture.setValues(): property '${t}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==$h)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case ii:e.x=e.x-Math.floor(e.x);break;case cn:e.x=e.x<0?0:1;break;case to:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case ii:e.y=e.y-Math.floor(e.y);break;case cn:e.y=e.y<0?0:1;break;case to:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Ut.DEFAULT_IMAGE=null;Ut.DEFAULT_MAPPING=$h;Ut.DEFAULT_ANISOTROPY=1;class it{constructor(e=0,t=0,n=0,i=1){it.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*i+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*i+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*i+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*i+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,r;const c=e.elements,l=c[0],h=c[4],u=c[8],d=c[1],m=c[5],_=c[9],p=c[2],g=c[6],f=c[10];if(Math.abs(h-d)<.01&&Math.abs(u-p)<.01&&Math.abs(_-g)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+p)<.1&&Math.abs(_+g)<.1&&Math.abs(l+m+f-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const v=(l+1)/2,y=(m+1)/2,b=(f+1)/2,w=(h+d)/4,R=(u+p)/4,A=(_+g)/4;return v>y&&v>b?v<.01?(n=0,i=.707106781,r=.707106781):(n=Math.sqrt(v),i=w/n,r=R/n):y>b?y<.01?(n=.707106781,i=0,r=.707106781):(i=Math.sqrt(y),n=w/i,r=A/i):b<.01?(n=.707106781,i=.707106781,r=0):(r=Math.sqrt(b),n=R/r,i=A/r),this.set(n,i,r,t),this}let x=Math.sqrt((g-_)*(g-_)+(u-p)*(u-p)+(d-h)*(d-h));return Math.abs(x)<.001&&(x=1),this.x=(g-_)/x,this.y=(u-p)/x,this.z=(d-h)/x,this.w=Math.acos((l+m+f-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Xe(this.x,e.x,t.x),this.y=Xe(this.y,e.y,t.y),this.z=Xe(this.z,e.z,t.z),this.w=Xe(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Xe(this.x,e,t),this.y=Xe(this.y,e,t),this.z=Xe(this.z,e,t),this.w=Xe(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Xe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class lf extends bs{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Dt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new it(0,0,e,t),this.scissorTest=!1,this.viewport=new it(0,0,e,t);const i={width:e,height:t,depth:n.depth},r=new Ut(i);this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:Dt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,r=this.textures.length;i<r;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isArrayTexture=this.textures[i].image.depth>1;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const i=Object.assign({},e.textures[t].image);this.textures[t].source=new Ec(i)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class si extends lf{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class lu extends Ut{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=Jt,this.minFilter=Jt,this.wrapR=cn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class hf extends Ut{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=Jt,this.minFilter=Jt,this.wrapR=cn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class oi{constructor(e=new C(1/0,1/0,1/0),t=new C(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Mn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Mn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=Mn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Mn):Mn.fromBufferAttribute(r,o),Mn.applyMatrix4(e.matrixWorld),this.expandByPoint(Mn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),fr.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),fr.copy(n.boundingBox)),fr.applyMatrix4(e.matrixWorld),this.union(fr)}const i=e.children;for(let r=0,o=i.length;r<o;r++)this.expandByObject(i[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Mn),Mn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Ps),pr.subVectors(this.max,Ps),Wi.subVectors(e.a,Ps),Xi.subVectors(e.b,Ps),qi.subVectors(e.c,Ps),ci.subVectors(Xi,Wi),li.subVectors(qi,Xi),wi.subVectors(Wi,qi);let t=[0,-ci.z,ci.y,0,-li.z,li.y,0,-wi.z,wi.y,ci.z,0,-ci.x,li.z,0,-li.x,wi.z,0,-wi.x,-ci.y,ci.x,0,-li.y,li.x,0,-wi.y,wi.x,0];return!Ro(t,Wi,Xi,qi,pr)||(t=[1,0,0,0,1,0,0,0,1],!Ro(t,Wi,Xi,qi,pr))?!1:(mr.crossVectors(ci,li),t=[mr.x,mr.y,mr.z],Ro(t,Wi,Xi,qi,pr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Mn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Mn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Wn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Wn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Wn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Wn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Wn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Wn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Wn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Wn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Wn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Wn=[new C,new C,new C,new C,new C,new C,new C,new C],Mn=new C,fr=new oi,Wi=new C,Xi=new C,qi=new C,ci=new C,li=new C,wi=new C,Ps=new C,pr=new C,mr=new C,Ei=new C;function Ro(s,e,t,n,i){for(let r=0,o=s.length-3;r<=o;r+=3){Ei.fromArray(s,r);const a=i.x*Math.abs(Ei.x)+i.y*Math.abs(Ei.y)+i.z*Math.abs(Ei.z),c=e.dot(Ei),l=t.dot(Ei),h=n.dot(Ei);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>a)return!1}return!0}const uf=new oi,Ls=new C,Co=new C;class Hn{constructor(e=new C,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):uf.setFromPoints(e).getCenter(n);let i=0;for(let r=0,o=e.length;r<o;r++)i=Math.max(i,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Ls.subVectors(e,this.center);const t=Ls.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(Ls,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Co.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Ls.copy(e.center).add(Co)),this.expandByPoint(Ls.copy(e.center).sub(Co))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const Xn=new C,Po=new C,gr=new C,hi=new C,Lo=new C,_r=new C,Io=new C;class uo{constructor(e=new C,t=new C(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Xn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Xn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Xn.copy(this.origin).addScaledVector(this.direction,t),Xn.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){Po.copy(e).add(t).multiplyScalar(.5),gr.copy(t).sub(e).normalize(),hi.copy(this.origin).sub(Po);const r=e.distanceTo(t)*.5,o=-this.direction.dot(gr),a=hi.dot(this.direction),c=-hi.dot(gr),l=hi.lengthSq(),h=Math.abs(1-o*o);let u,d,m,_;if(h>0)if(u=o*c-a,d=o*a-c,_=r*h,u>=0)if(d>=-_)if(d<=_){const p=1/h;u*=p,d*=p,m=u*(u+o*d+2*a)+d*(o*u+d+2*c)+l}else d=r,u=Math.max(0,-(o*d+a)),m=-u*u+d*(d+2*c)+l;else d=-r,u=Math.max(0,-(o*d+a)),m=-u*u+d*(d+2*c)+l;else d<=-_?(u=Math.max(0,-(-o*r+a)),d=u>0?-r:Math.min(Math.max(-r,-c),r),m=-u*u+d*(d+2*c)+l):d<=_?(u=0,d=Math.min(Math.max(-r,-c),r),m=d*(d+2*c)+l):(u=Math.max(0,-(o*r+a)),d=u>0?r:Math.min(Math.max(-r,-c),r),m=-u*u+d*(d+2*c)+l);else d=o>0?-r:r,u=Math.max(0,-(o*d+a)),m=-u*u+d*(d+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,u),i&&i.copy(Po).addScaledVector(gr,d),m}intersectSphere(e,t){Xn.subVectors(e.center,this.origin);const n=Xn.dot(this.direction),i=Xn.dot(Xn)-n*n,r=e.radius*e.radius;if(i>r)return null;const o=Math.sqrt(r-i),a=n-o,c=n+o;return c<0?null:a<0?this.at(c,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,r,o,a,c;const l=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return l>=0?(n=(e.min.x-d.x)*l,i=(e.max.x-d.x)*l):(n=(e.max.x-d.x)*l,i=(e.min.x-d.x)*l),h>=0?(r=(e.min.y-d.y)*h,o=(e.max.y-d.y)*h):(r=(e.max.y-d.y)*h,o=(e.min.y-d.y)*h),n>o||r>i||((r>n||isNaN(n))&&(n=r),(o<i||isNaN(i))&&(i=o),u>=0?(a=(e.min.z-d.z)*u,c=(e.max.z-d.z)*u):(a=(e.max.z-d.z)*u,c=(e.min.z-d.z)*u),n>c||a>i)||((a>n||n!==n)&&(n=a),(c<i||i!==i)&&(i=c),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,Xn)!==null}intersectTriangle(e,t,n,i,r){Lo.subVectors(t,e),_r.subVectors(n,e),Io.crossVectors(Lo,_r);let o=this.direction.dot(Io),a;if(o>0){if(i)return null;a=1}else if(o<0)a=-1,o=-o;else return null;hi.subVectors(this.origin,e);const c=a*this.direction.dot(_r.crossVectors(hi,_r));if(c<0)return null;const l=a*this.direction.dot(Lo.cross(hi));if(l<0||c+l>o)return null;const h=-a*hi.dot(Io);return h<0?null:this.at(h/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ke{constructor(e,t,n,i,r,o,a,c,l,h,u,d,m,_,p,g){ke.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,r,o,a,c,l,h,u,d,m,_,p,g)}set(e,t,n,i,r,o,a,c,l,h,u,d,m,_,p,g){const f=this.elements;return f[0]=e,f[4]=t,f[8]=n,f[12]=i,f[1]=r,f[5]=o,f[9]=a,f[13]=c,f[2]=l,f[6]=h,f[10]=u,f[14]=d,f[3]=m,f[7]=_,f[11]=p,f[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ke().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,i=1/Yi.setFromMatrixColumn(e,0).length(),r=1/Yi.setFromMatrixColumn(e,1).length(),o=1/Yi.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,i=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),c=Math.cos(i),l=Math.sin(i),h=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){const d=o*h,m=o*u,_=a*h,p=a*u;t[0]=c*h,t[4]=-c*u,t[8]=l,t[1]=m+_*l,t[5]=d-p*l,t[9]=-a*c,t[2]=p-d*l,t[6]=_+m*l,t[10]=o*c}else if(e.order==="YXZ"){const d=c*h,m=c*u,_=l*h,p=l*u;t[0]=d+p*a,t[4]=_*a-m,t[8]=o*l,t[1]=o*u,t[5]=o*h,t[9]=-a,t[2]=m*a-_,t[6]=p+d*a,t[10]=o*c}else if(e.order==="ZXY"){const d=c*h,m=c*u,_=l*h,p=l*u;t[0]=d-p*a,t[4]=-o*u,t[8]=_+m*a,t[1]=m+_*a,t[5]=o*h,t[9]=p-d*a,t[2]=-o*l,t[6]=a,t[10]=o*c}else if(e.order==="ZYX"){const d=o*h,m=o*u,_=a*h,p=a*u;t[0]=c*h,t[4]=_*l-m,t[8]=d*l+p,t[1]=c*u,t[5]=p*l+d,t[9]=m*l-_,t[2]=-l,t[6]=a*c,t[10]=o*c}else if(e.order==="YZX"){const d=o*c,m=o*l,_=a*c,p=a*l;t[0]=c*h,t[4]=p-d*u,t[8]=_*u+m,t[1]=u,t[5]=o*h,t[9]=-a*h,t[2]=-l*h,t[6]=m*u+_,t[10]=d-p*u}else if(e.order==="XZY"){const d=o*c,m=o*l,_=a*c,p=a*l;t[0]=c*h,t[4]=-u,t[8]=l*h,t[1]=d*u+p,t[5]=o*h,t[9]=m*u-_,t[2]=_*u-m,t[6]=a*h,t[10]=p*u+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(df,e,ff)}lookAt(e,t,n){const i=this.elements;return rn.subVectors(e,t),rn.lengthSq()===0&&(rn.z=1),rn.normalize(),ui.crossVectors(n,rn),ui.lengthSq()===0&&(Math.abs(n.z)===1?rn.x+=1e-4:rn.z+=1e-4,rn.normalize(),ui.crossVectors(n,rn)),ui.normalize(),xr.crossVectors(rn,ui),i[0]=ui.x,i[4]=xr.x,i[8]=rn.x,i[1]=ui.y,i[5]=xr.y,i[9]=rn.y,i[2]=ui.z,i[6]=xr.z,i[10]=rn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,r=this.elements,o=n[0],a=n[4],c=n[8],l=n[12],h=n[1],u=n[5],d=n[9],m=n[13],_=n[2],p=n[6],g=n[10],f=n[14],x=n[3],v=n[7],y=n[11],b=n[15],w=i[0],R=i[4],A=i[8],M=i[12],S=i[1],L=i[5],I=i[9],N=i[13],U=i[2],z=i[6],O=i[10],G=i[14],H=i[3],J=i[7],te=i[11],le=i[15];return r[0]=o*w+a*S+c*U+l*H,r[4]=o*R+a*L+c*z+l*J,r[8]=o*A+a*I+c*O+l*te,r[12]=o*M+a*N+c*G+l*le,r[1]=h*w+u*S+d*U+m*H,r[5]=h*R+u*L+d*z+m*J,r[9]=h*A+u*I+d*O+m*te,r[13]=h*M+u*N+d*G+m*le,r[2]=_*w+p*S+g*U+f*H,r[6]=_*R+p*L+g*z+f*J,r[10]=_*A+p*I+g*O+f*te,r[14]=_*M+p*N+g*G+f*le,r[3]=x*w+v*S+y*U+b*H,r[7]=x*R+v*L+y*z+b*J,r[11]=x*A+v*I+y*O+b*te,r[15]=x*M+v*N+y*G+b*le,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],i=e[8],r=e[12],o=e[1],a=e[5],c=e[9],l=e[13],h=e[2],u=e[6],d=e[10],m=e[14],_=e[3],p=e[7],g=e[11],f=e[15];return _*(+r*c*u-i*l*u-r*a*d+n*l*d+i*a*m-n*c*m)+p*(+t*c*m-t*l*d+r*o*d-i*o*m+i*l*h-r*c*h)+g*(+t*l*u-t*a*m-r*o*u+n*o*m+r*a*h-n*l*h)+f*(-i*a*h-t*c*u+t*a*d+i*o*u-n*o*d+n*c*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8],u=e[9],d=e[10],m=e[11],_=e[12],p=e[13],g=e[14],f=e[15],x=u*g*l-p*d*l+p*c*m-a*g*m-u*c*f+a*d*f,v=_*d*l-h*g*l-_*c*m+o*g*m+h*c*f-o*d*f,y=h*p*l-_*u*l+_*a*m-o*p*m-h*a*f+o*u*f,b=_*u*c-h*p*c-_*a*d+o*p*d+h*a*g-o*u*g,w=t*x+n*v+i*y+r*b;if(w===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const R=1/w;return e[0]=x*R,e[1]=(p*d*r-u*g*r-p*i*m+n*g*m+u*i*f-n*d*f)*R,e[2]=(a*g*r-p*c*r+p*i*l-n*g*l-a*i*f+n*c*f)*R,e[3]=(u*c*r-a*d*r-u*i*l+n*d*l+a*i*m-n*c*m)*R,e[4]=v*R,e[5]=(h*g*r-_*d*r+_*i*m-t*g*m-h*i*f+t*d*f)*R,e[6]=(_*c*r-o*g*r-_*i*l+t*g*l+o*i*f-t*c*f)*R,e[7]=(o*d*r-h*c*r+h*i*l-t*d*l-o*i*m+t*c*m)*R,e[8]=y*R,e[9]=(_*u*r-h*p*r-_*n*m+t*p*m+h*n*f-t*u*f)*R,e[10]=(o*p*r-_*a*r+_*n*l-t*p*l-o*n*f+t*a*f)*R,e[11]=(h*a*r-o*u*r-h*n*l+t*u*l+o*n*m-t*a*m)*R,e[12]=b*R,e[13]=(h*p*i-_*u*i+_*n*d-t*p*d-h*n*g+t*u*g)*R,e[14]=(_*a*i-o*p*i-_*n*c+t*p*c+o*n*g-t*a*g)*R,e[15]=(o*u*i-h*a*i+h*n*c-t*u*c-o*n*d+t*a*d)*R,this}scale(e){const t=this.elements,n=e.x,i=e.y,r=e.z;return t[0]*=n,t[4]*=i,t[8]*=r,t[1]*=n,t[5]*=i,t[9]*=r,t[2]*=n,t[6]*=i,t[10]*=r,t[3]*=n,t[7]*=i,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),i=Math.sin(t),r=1-n,o=e.x,a=e.y,c=e.z,l=r*o,h=r*a;return this.set(l*o+n,l*a-i*c,l*c+i*a,0,l*a+i*c,h*a+n,h*c-i*o,0,l*c-i*a,h*c+i*o,r*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,r,o){return this.set(1,n,r,0,e,1,o,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){const i=this.elements,r=t._x,o=t._y,a=t._z,c=t._w,l=r+r,h=o+o,u=a+a,d=r*l,m=r*h,_=r*u,p=o*h,g=o*u,f=a*u,x=c*l,v=c*h,y=c*u,b=n.x,w=n.y,R=n.z;return i[0]=(1-(p+f))*b,i[1]=(m+y)*b,i[2]=(_-v)*b,i[3]=0,i[4]=(m-y)*w,i[5]=(1-(d+f))*w,i[6]=(g+x)*w,i[7]=0,i[8]=(_+v)*R,i[9]=(g-x)*R,i[10]=(1-(d+p))*R,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){const i=this.elements;let r=Yi.set(i[0],i[1],i[2]).length();const o=Yi.set(i[4],i[5],i[6]).length(),a=Yi.set(i[8],i[9],i[10]).length();this.determinant()<0&&(r=-r),e.x=i[12],e.y=i[13],e.z=i[14],Sn.copy(this);const l=1/r,h=1/o,u=1/a;return Sn.elements[0]*=l,Sn.elements[1]*=l,Sn.elements[2]*=l,Sn.elements[4]*=h,Sn.elements[5]*=h,Sn.elements[6]*=h,Sn.elements[8]*=u,Sn.elements[9]*=u,Sn.elements[10]*=u,t.setFromRotationMatrix(Sn),n.x=r,n.y=o,n.z=a,this}makePerspective(e,t,n,i,r,o,a=zn,c=!1){const l=this.elements,h=2*r/(t-e),u=2*r/(n-i),d=(t+e)/(t-e),m=(n+i)/(n-i);let _,p;if(c)_=r/(o-r),p=o*r/(o-r);else if(a===zn)_=-(o+r)/(o-r),p=-2*o*r/(o-r);else if(a===io)_=-o/(o-r),p=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=h,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=u,l[9]=m,l[13]=0,l[2]=0,l[6]=0,l[10]=_,l[14]=p,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,i,r,o,a=zn,c=!1){const l=this.elements,h=2/(t-e),u=2/(n-i),d=-(t+e)/(t-e),m=-(n+i)/(n-i);let _,p;if(c)_=1/(o-r),p=o/(o-r);else if(a===zn)_=-2/(o-r),p=-(o+r)/(o-r);else if(a===io)_=-1/(o-r),p=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=h,l[4]=0,l[8]=0,l[12]=d,l[1]=0,l[5]=u,l[9]=0,l[13]=m,l[2]=0,l[6]=0,l[10]=_,l[14]=p,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const Yi=new C,Sn=new ke,df=new C(0,0,0),ff=new C(1,1,1),ui=new C,xr=new C,rn=new C,yl=new ke,Ml=new xn;class _n{constructor(e=0,t=0,n=0,i=_n.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const i=e.elements,r=i[0],o=i[4],a=i[8],c=i[1],l=i[5],h=i[9],u=i[2],d=i[6],m=i[10];switch(t){case"XYZ":this._y=Math.asin(Xe(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,m),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Xe(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,m),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(Xe(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,m),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-Xe(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,m),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(Xe(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,m));break;case"XZY":this._z=Math.asin(-Xe(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,l),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,m),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return yl.makeRotationFromQuaternion(e),this.setFromRotationMatrix(yl,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Ml.setFromEuler(this),this.setFromQuaternion(Ml,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}_n.DEFAULT_ORDER="XYZ";class hu{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let pf=0;const Sl=new C,ji=new xn,qn=new ke,vr=new C,Is=new C,mf=new C,gf=new xn,bl=new C(1,0,0),wl=new C(0,1,0),El=new C(0,0,1),Tl={type:"added"},_f={type:"removed"},Ki={type:"childadded",child:null},Do={type:"childremoved",child:null};class ht extends bs{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:pf++}),this.uuid=Cn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=ht.DEFAULT_UP.clone();const e=new C,t=new _n,n=new xn,i=new C(1,1,1);function r(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new ke},normalMatrix:{value:new He}}),this.matrix=new ke,this.matrixWorld=new ke,this.matrixAutoUpdate=ht.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=ht.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new hu,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ji.setFromAxisAngle(e,t),this.quaternion.multiply(ji),this}rotateOnWorldAxis(e,t){return ji.setFromAxisAngle(e,t),this.quaternion.premultiply(ji),this}rotateX(e){return this.rotateOnAxis(bl,e)}rotateY(e){return this.rotateOnAxis(wl,e)}rotateZ(e){return this.rotateOnAxis(El,e)}translateOnAxis(e,t){return Sl.copy(e).applyQuaternion(this.quaternion),this.position.add(Sl.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(bl,e)}translateY(e){return this.translateOnAxis(wl,e)}translateZ(e){return this.translateOnAxis(El,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(qn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?vr.copy(e):vr.set(e,t,n);const i=this.parent;this.updateWorldMatrix(!0,!1),Is.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?qn.lookAt(Is,vr,this.up):qn.lookAt(vr,Is,this.up),this.quaternion.setFromRotationMatrix(qn),i&&(qn.extractRotation(i.matrixWorld),ji.setFromRotationMatrix(qn),this.quaternion.premultiply(ji.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Tl),Ki.child=e,this.dispatchEvent(Ki),Ki.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(_f),Do.child=e,this.dispatchEvent(Do),Do.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),qn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),qn.multiply(e.parent.matrixWorld)),e.applyMatrix4(qn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Tl),Ki.child=e,this.dispatchEvent(Ki),Ki.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){const o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const i=this.children;for(let r=0,o=i.length;r<o;r++)i[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Is,e,mf),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Is,gf,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const i=this.children;for(let r=0,o=i.length;r<o;r++)i[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(a=>({...a})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function r(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=r(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const c=a.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){const u=c[l];r(e.shapes,u)}else r(e.shapes,c)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(r(e.materials,this.material[c]));i.material=a}else i.material=r(e.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){const c=this.animations[a];i.animations.push(r(e.animations,c))}}if(t){const a=o(e.geometries),c=o(e.materials),l=o(e.textures),h=o(e.images),u=o(e.shapes),d=o(e.skeletons),m=o(e.animations),_=o(e.nodes);a.length>0&&(n.geometries=a),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),m.length>0&&(n.animations=m),_.length>0&&(n.nodes=_)}return n.object=i,n;function o(a){const c=[];for(const l in a){const h=a[l];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const i=e.children[n];this.add(i.clone())}return this}}ht.DEFAULT_UP=new C(0,1,0);ht.DEFAULT_MATRIX_AUTO_UPDATE=!0;ht.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const bn=new C,Yn=new C,Uo=new C,jn=new C,$i=new C,Zi=new C,Al=new C,No=new C,Fo=new C,zo=new C,Oo=new it,ko=new it,Bo=new it;class En{constructor(e=new C,t=new C,n=new C){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),bn.subVectors(e,t),i.cross(bn);const r=i.lengthSq();return r>0?i.multiplyScalar(1/Math.sqrt(r)):i.set(0,0,0)}static getBarycoord(e,t,n,i,r){bn.subVectors(i,t),Yn.subVectors(n,t),Uo.subVectors(e,t);const o=bn.dot(bn),a=bn.dot(Yn),c=bn.dot(Uo),l=Yn.dot(Yn),h=Yn.dot(Uo),u=o*l-a*a;if(u===0)return r.set(0,0,0),null;const d=1/u,m=(l*c-a*h)*d,_=(o*h-a*c)*d;return r.set(1-m-_,_,m)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,jn)===null?!1:jn.x>=0&&jn.y>=0&&jn.x+jn.y<=1}static getInterpolation(e,t,n,i,r,o,a,c){return this.getBarycoord(e,t,n,i,jn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,jn.x),c.addScaledVector(o,jn.y),c.addScaledVector(a,jn.z),c)}static getInterpolatedAttribute(e,t,n,i,r,o){return Oo.setScalar(0),ko.setScalar(0),Bo.setScalar(0),Oo.fromBufferAttribute(e,t),ko.fromBufferAttribute(e,n),Bo.fromBufferAttribute(e,i),o.setScalar(0),o.addScaledVector(Oo,r.x),o.addScaledVector(ko,r.y),o.addScaledVector(Bo,r.z),o}static isFrontFacing(e,t,n,i){return bn.subVectors(n,t),Yn.subVectors(e,t),bn.cross(Yn).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return bn.subVectors(this.c,this.b),Yn.subVectors(this.a,this.b),bn.cross(Yn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return En.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return En.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,r){return En.getInterpolation(e,this.a,this.b,this.c,t,n,i,r)}containsPoint(e){return En.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return En.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,i=this.b,r=this.c;let o,a;$i.subVectors(i,n),Zi.subVectors(r,n),No.subVectors(e,n);const c=$i.dot(No),l=Zi.dot(No);if(c<=0&&l<=0)return t.copy(n);Fo.subVectors(e,i);const h=$i.dot(Fo),u=Zi.dot(Fo);if(h>=0&&u<=h)return t.copy(i);const d=c*u-h*l;if(d<=0&&c>=0&&h<=0)return o=c/(c-h),t.copy(n).addScaledVector($i,o);zo.subVectors(e,r);const m=$i.dot(zo),_=Zi.dot(zo);if(_>=0&&m<=_)return t.copy(r);const p=m*l-c*_;if(p<=0&&l>=0&&_<=0)return a=l/(l-_),t.copy(n).addScaledVector(Zi,a);const g=h*_-m*u;if(g<=0&&u-h>=0&&m-_>=0)return Al.subVectors(r,i),a=(u-h)/(u-h+(m-_)),t.copy(i).addScaledVector(Al,a);const f=1/(g+p+d);return o=p*f,a=d*f,t.copy(n).addScaledVector($i,o).addScaledVector(Zi,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const uu={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},di={h:0,s:0,l:0},yr={h:0,s:0,l:0};function Ho(s,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?s+(e-s)*6*t:t<1/2?e:t<2/3?s+(e-s)*6*(2/3-t):s}class xe{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Ct){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,nt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=nt.workingColorSpace){return this.r=e,this.g=t,this.b=n,nt.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=nt.workingColorSpace){if(e=wc(e,1),t=Xe(t,0,1),n=Xe(n,0,1),t===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=Ho(o,r,e+1/3),this.g=Ho(o,r,e),this.b=Ho(o,r,e-1/3)}return nt.colorSpaceToWorking(this,i),this}setStyle(e,t=Ct){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const o=i[1],a=i[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=i[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Ct){const n=uu[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=ei(e.r),this.g=ei(e.g),this.b=ei(e.b),this}copyLinearToSRGB(e){return this.r=ds(e.r),this.g=ds(e.g),this.b=ds(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Ct){return nt.workingToColorSpace(Xt.copy(this),e),Math.round(Xe(Xt.r*255,0,255))*65536+Math.round(Xe(Xt.g*255,0,255))*256+Math.round(Xe(Xt.b*255,0,255))}getHexString(e=Ct){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=nt.workingColorSpace){nt.workingToColorSpace(Xt.copy(this),t);const n=Xt.r,i=Xt.g,r=Xt.b,o=Math.max(n,i,r),a=Math.min(n,i,r);let c,l;const h=(a+o)/2;if(a===o)c=0,l=0;else{const u=o-a;switch(l=h<=.5?u/(o+a):u/(2-o-a),o){case n:c=(i-r)/u+(i<r?6:0);break;case i:c=(r-n)/u+2;break;case r:c=(n-i)/u+4;break}c/=6}return e.h=c,e.s=l,e.l=h,e}getRGB(e,t=nt.workingColorSpace){return nt.workingToColorSpace(Xt.copy(this),t),e.r=Xt.r,e.g=Xt.g,e.b=Xt.b,e}getStyle(e=Ct){nt.workingToColorSpace(Xt.copy(this),e);const t=Xt.r,n=Xt.g,i=Xt.b;return e!==Ct?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(di),this.setHSL(di.h+e,di.s+t,di.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(di),e.getHSL(yr);const n=Xs(di.h,yr.h,t),i=Xs(di.s,yr.s,t),r=Xs(di.l,yr.l,t);return this.setHSL(n,i,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,i=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*i,this.g=r[1]*t+r[4]*n+r[7]*i,this.b=r[2]*t+r[5]*n+r[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Xt=new xe;xe.NAMES=uu;let xf=0;class kn extends bs{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:xf++}),this.uuid=Cn(),this.name="",this.type="Material",this.blending=us,this.side=ni,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=xa,this.blendDst=va,this.blendEquation=Ui,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new xe(0,0,0),this.blendAlpha=0,this.depthFunc=ms,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=fl,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Vi,this.stencilZFail=Vi,this.stencilZPass=Vi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==us&&(n.blending=this.blending),this.side!==ni&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==xa&&(n.blendSrc=this.blendSrc),this.blendDst!==va&&(n.blendDst=this.blendDst),this.blendEquation!==Ui&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==ms&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==fl&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Vi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Vi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Vi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(r){const o=[];for(const a in r){const c=r[a];delete c.metadata,o.push(c)}return o}if(t){const r=i(e.textures),o=i(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const i=t.length;n=new Array(i);for(let r=0;r!==i;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class zi extends kn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new xe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new _n,this.combine=jh,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Jn=vf();function vf(){const s=new ArrayBuffer(4),e=new Float32Array(s),t=new Uint32Array(s),n=new Uint32Array(512),i=new Uint32Array(512);for(let c=0;c<256;++c){const l=c-127;l<-27?(n[c]=0,n[c|256]=32768,i[c]=24,i[c|256]=24):l<-14?(n[c]=1024>>-l-14,n[c|256]=1024>>-l-14|32768,i[c]=-l-1,i[c|256]=-l-1):l<=15?(n[c]=l+15<<10,n[c|256]=l+15<<10|32768,i[c]=13,i[c|256]=13):l<128?(n[c]=31744,n[c|256]=64512,i[c]=24,i[c|256]=24):(n[c]=31744,n[c|256]=64512,i[c]=13,i[c|256]=13)}const r=new Uint32Array(2048),o=new Uint32Array(64),a=new Uint32Array(64);for(let c=1;c<1024;++c){let l=c<<13,h=0;for(;(l&8388608)===0;)l<<=1,h-=8388608;l&=-8388609,h+=947912704,r[c]=l|h}for(let c=1024;c<2048;++c)r[c]=939524096+(c-1024<<13);for(let c=1;c<31;++c)o[c]=c<<23;o[31]=1199570944,o[32]=2147483648;for(let c=33;c<63;++c)o[c]=2147483648+(c-32<<23);o[63]=3347054592;for(let c=1;c<64;++c)c!==32&&(a[c]=1024);return{floatView:e,uint32View:t,baseTable:n,shiftTable:i,mantissaTable:r,exponentTable:o,offsetTable:a}}function yf(s){Math.abs(s)>65504&&console.warn("THREE.DataUtils.toHalfFloat(): Value out of range."),s=Xe(s,-65504,65504),Jn.floatView[0]=s;const e=Jn.uint32View[0],t=e>>23&511;return Jn.baseTable[t]+((e&8388607)>>Jn.shiftTable[t])}function Mf(s){const e=s>>10;return Jn.uint32View[0]=Jn.mantissaTable[Jn.offsetTable[e]+(s&1023)]+Jn.exponentTable[e],Jn.floatView[0]}class Mr{static toHalfFloat(e){return yf(e)}static fromHalfFloat(e){return Mf(e)}}const Pt=new C,Sr=new he;let Sf=0;class wt{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Sf++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=ic,this.updateRanges=[],this.gpuType=en,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,r=this.itemSize;i<r;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Sr.fromBufferAttribute(this,t),Sr.applyMatrix3(e),this.setXY(t,Sr.x,Sr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Pt.fromBufferAttribute(this,t),Pt.applyMatrix3(e),this.setXYZ(t,Pt.x,Pt.y,Pt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Pt.fromBufferAttribute(this,t),Pt.applyMatrix4(e),this.setXYZ(t,Pt.x,Pt.y,Pt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Pt.fromBufferAttribute(this,t),Pt.applyNormalMatrix(e),this.setXYZ(t,Pt.x,Pt.y,Pt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Pt.fromBufferAttribute(this,t),Pt.transformDirection(e),this.setXYZ(t,Pt.x,Pt.y,Pt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=wn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=ct(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=wn(t,this.array)),t}setX(e,t){return this.normalized&&(t=ct(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=wn(t,this.array)),t}setY(e,t){return this.normalized&&(t=ct(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=wn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=ct(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=wn(t,this.array)),t}setW(e,t){return this.normalized&&(t=ct(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=ct(t,this.array),n=ct(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=ct(t,this.array),n=ct(n,this.array),i=ct(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,r){return e*=this.itemSize,this.normalized&&(t=ct(t,this.array),n=ct(n,this.array),i=ct(i,this.array),r=ct(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==ic&&(e.usage=this.usage),e}}class Tc extends wt{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Ac extends wt{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class Ve extends wt{constructor(e,t,n){super(new Float32Array(e),t,n)}}let bf=0;const fn=new ke,Vo=new ht,Ji=new C,on=new oi,Ds=new oi,zt=new C;class At extends bs{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:bf++}),this.uuid=Cn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(cu(e)?Ac:Tc)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new He().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return fn.makeRotationFromQuaternion(e),this.applyMatrix4(fn),this}rotateX(e){return fn.makeRotationX(e),this.applyMatrix4(fn),this}rotateY(e){return fn.makeRotationY(e),this.applyMatrix4(fn),this}rotateZ(e){return fn.makeRotationZ(e),this.applyMatrix4(fn),this}translate(e,t,n){return fn.makeTranslation(e,t,n),this.applyMatrix4(fn),this}scale(e,t,n){return fn.makeScale(e,t,n),this.applyMatrix4(fn),this}lookAt(e){return Vo.lookAt(e),Vo.updateMatrix(),this.applyMatrix4(Vo.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ji).negate(),this.translate(Ji.x,Ji.y,Ji.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let i=0,r=e.length;i<r;i++){const o=e[i];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Ve(n,3))}else{const n=Math.min(e.length,t.count);for(let i=0;i<n;i++){const r=e[i];t.setXYZ(i,r.x,r.y,r.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new oi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new C(-1/0,-1/0,-1/0),new C(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){const r=t[n];on.setFromBufferAttribute(r),this.morphTargetsRelative?(zt.addVectors(this.boundingBox.min,on.min),this.boundingBox.expandByPoint(zt),zt.addVectors(this.boundingBox.max,on.max),this.boundingBox.expandByPoint(zt)):(this.boundingBox.expandByPoint(on.min),this.boundingBox.expandByPoint(on.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Hn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new C,1/0);return}if(e){const n=this.boundingSphere.center;if(on.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){const a=t[r];Ds.setFromBufferAttribute(a),this.morphTargetsRelative?(zt.addVectors(on.min,Ds.min),on.expandByPoint(zt),zt.addVectors(on.max,Ds.max),on.expandByPoint(zt)):(on.expandByPoint(Ds.min),on.expandByPoint(Ds.max))}on.getCenter(n);let i=0;for(let r=0,o=e.count;r<o;r++)zt.fromBufferAttribute(e,r),i=Math.max(i,n.distanceToSquared(zt));if(t)for(let r=0,o=t.length;r<o;r++){const a=t[r],c=this.morphTargetsRelative;for(let l=0,h=a.count;l<h;l++)zt.fromBufferAttribute(a,l),c&&(Ji.fromBufferAttribute(e,l),zt.add(Ji)),i=Math.max(i,n.distanceToSquared(zt))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,i=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new wt(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],c=[];for(let A=0;A<n.count;A++)a[A]=new C,c[A]=new C;const l=new C,h=new C,u=new C,d=new he,m=new he,_=new he,p=new C,g=new C;function f(A,M,S){l.fromBufferAttribute(n,A),h.fromBufferAttribute(n,M),u.fromBufferAttribute(n,S),d.fromBufferAttribute(r,A),m.fromBufferAttribute(r,M),_.fromBufferAttribute(r,S),h.sub(l),u.sub(l),m.sub(d),_.sub(d);const L=1/(m.x*_.y-_.x*m.y);isFinite(L)&&(p.copy(h).multiplyScalar(_.y).addScaledVector(u,-m.y).multiplyScalar(L),g.copy(u).multiplyScalar(m.x).addScaledVector(h,-_.x).multiplyScalar(L),a[A].add(p),a[M].add(p),a[S].add(p),c[A].add(g),c[M].add(g),c[S].add(g))}let x=this.groups;x.length===0&&(x=[{start:0,count:e.count}]);for(let A=0,M=x.length;A<M;++A){const S=x[A],L=S.start,I=S.count;for(let N=L,U=L+I;N<U;N+=3)f(e.getX(N+0),e.getX(N+1),e.getX(N+2))}const v=new C,y=new C,b=new C,w=new C;function R(A){b.fromBufferAttribute(i,A),w.copy(b);const M=a[A];v.copy(M),v.sub(b.multiplyScalar(b.dot(M))).normalize(),y.crossVectors(w,M);const L=y.dot(c[A])<0?-1:1;o.setXYZW(A,v.x,v.y,v.z,L)}for(let A=0,M=x.length;A<M;++A){const S=x[A],L=S.start,I=S.count;for(let N=L,U=L+I;N<U;N+=3)R(e.getX(N+0)),R(e.getX(N+1)),R(e.getX(N+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new wt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,m=n.count;d<m;d++)n.setXYZ(d,0,0,0);const i=new C,r=new C,o=new C,a=new C,c=new C,l=new C,h=new C,u=new C;if(e)for(let d=0,m=e.count;d<m;d+=3){const _=e.getX(d+0),p=e.getX(d+1),g=e.getX(d+2);i.fromBufferAttribute(t,_),r.fromBufferAttribute(t,p),o.fromBufferAttribute(t,g),h.subVectors(o,r),u.subVectors(i,r),h.cross(u),a.fromBufferAttribute(n,_),c.fromBufferAttribute(n,p),l.fromBufferAttribute(n,g),a.add(h),c.add(h),l.add(h),n.setXYZ(_,a.x,a.y,a.z),n.setXYZ(p,c.x,c.y,c.z),n.setXYZ(g,l.x,l.y,l.z)}else for(let d=0,m=t.count;d<m;d+=3)i.fromBufferAttribute(t,d+0),r.fromBufferAttribute(t,d+1),o.fromBufferAttribute(t,d+2),h.subVectors(o,r),u.subVectors(i,r),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)zt.fromBufferAttribute(e,t),zt.normalize(),e.setXYZ(t,zt.x,zt.y,zt.z)}toNonIndexed(){function e(a,c){const l=a.array,h=a.itemSize,u=a.normalized,d=new l.constructor(c.length*h);let m=0,_=0;for(let p=0,g=c.length;p<g;p++){a.isInterleavedBufferAttribute?m=c[p]*a.data.stride+a.offset:m=c[p]*h;for(let f=0;f<h;f++)d[_++]=l[m++]}return new wt(d,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new At,n=this.index.array,i=this.attributes;for(const a in i){const c=i[a],l=e(c,n);t.setAttribute(a,l)}const r=this.morphAttributes;for(const a in r){const c=[],l=r[a];for(let h=0,u=l.length;h<u;h++){const d=l[h],m=e(d,n);c.push(m)}t.morphAttributes[a]=c}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,c=o.length;a<c;a++){const l=o[a];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const c in n){const l=n[c];e.data.attributes[c]=l.toJSON(e.data)}const i={};let r=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],h=[];for(let u=0,d=l.length;u<d;u++){const m=l[u];h.push(m.toJSON(e.data))}h.length>0&&(i[c]=h,r=!0)}r&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const i=e.attributes;for(const l in i){const h=i[l];this.setAttribute(l,h.clone(t))}const r=e.morphAttributes;for(const l in r){const h=[],u=r[l];for(let d=0,m=u.length;d<m;d++)h.push(u[d].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let l=0,h=o.length;l<h;l++){const u=o[l];this.addGroup(u.start,u.count,u.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Rl=new ke,Ti=new uo,br=new Hn,Cl=new C,wr=new C,Er=new C,Tr=new C,Go=new C,Ar=new C,Pl=new C,Rr=new C;class rt extends ht{constructor(e=new At,t=new zi){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){const a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){const n=this.geometry,i=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(i,e);const a=this.morphTargetInfluences;if(r&&a){Ar.set(0,0,0);for(let c=0,l=r.length;c<l;c++){const h=a[c],u=r[c];h!==0&&(Go.fromBufferAttribute(u,e),o?Ar.addScaledVector(Go,h):Ar.addScaledVector(Go.sub(t),h))}t.add(Ar)}return t}raycast(e,t){const n=this.geometry,i=this.material,r=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),br.copy(n.boundingSphere),br.applyMatrix4(r),Ti.copy(e.ray).recast(e.near),!(br.containsPoint(Ti.origin)===!1&&(Ti.intersectSphere(br,Cl)===null||Ti.origin.distanceToSquared(Cl)>(e.far-e.near)**2))&&(Rl.copy(r).invert(),Ti.copy(e.ray).applyMatrix4(Rl),!(n.boundingBox!==null&&Ti.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Ti)))}_computeIntersections(e,t,n){let i;const r=this.geometry,o=this.material,a=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,m=r.drawRange;if(a!==null)if(Array.isArray(o))for(let _=0,p=d.length;_<p;_++){const g=d[_],f=o[g.materialIndex],x=Math.max(g.start,m.start),v=Math.min(a.count,Math.min(g.start+g.count,m.start+m.count));for(let y=x,b=v;y<b;y+=3){const w=a.getX(y),R=a.getX(y+1),A=a.getX(y+2);i=Cr(this,f,e,n,l,h,u,w,R,A),i&&(i.faceIndex=Math.floor(y/3),i.face.materialIndex=g.materialIndex,t.push(i))}}else{const _=Math.max(0,m.start),p=Math.min(a.count,m.start+m.count);for(let g=_,f=p;g<f;g+=3){const x=a.getX(g),v=a.getX(g+1),y=a.getX(g+2);i=Cr(this,o,e,n,l,h,u,x,v,y),i&&(i.faceIndex=Math.floor(g/3),t.push(i))}}else if(c!==void 0)if(Array.isArray(o))for(let _=0,p=d.length;_<p;_++){const g=d[_],f=o[g.materialIndex],x=Math.max(g.start,m.start),v=Math.min(c.count,Math.min(g.start+g.count,m.start+m.count));for(let y=x,b=v;y<b;y+=3){const w=y,R=y+1,A=y+2;i=Cr(this,f,e,n,l,h,u,w,R,A),i&&(i.faceIndex=Math.floor(y/3),i.face.materialIndex=g.materialIndex,t.push(i))}}else{const _=Math.max(0,m.start),p=Math.min(c.count,m.start+m.count);for(let g=_,f=p;g<f;g+=3){const x=g,v=g+1,y=g+2;i=Cr(this,o,e,n,l,h,u,x,v,y),i&&(i.faceIndex=Math.floor(g/3),t.push(i))}}}}function wf(s,e,t,n,i,r,o,a){let c;if(e.side===Vt?c=n.intersectTriangle(o,r,i,!0,a):c=n.intersectTriangle(i,r,o,e.side===ni,a),c===null)return null;Rr.copy(a),Rr.applyMatrix4(s.matrixWorld);const l=t.ray.origin.distanceTo(Rr);return l<t.near||l>t.far?null:{distance:l,point:Rr.clone(),object:s}}function Cr(s,e,t,n,i,r,o,a,c,l){s.getVertexPosition(a,wr),s.getVertexPosition(c,Er),s.getVertexPosition(l,Tr);const h=wf(s,e,t,n,wr,Er,Tr,Pl);if(h){const u=new C;En.getBarycoord(Pl,wr,Er,Tr,u),i&&(h.uv=En.getInterpolatedAttribute(i,a,c,l,u,new he)),r&&(h.uv1=En.getInterpolatedAttribute(r,a,c,l,u,new he)),o&&(h.normal=En.getInterpolatedAttribute(o,a,c,l,u,new C),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const d={a,b:c,c:l,normal:new C,materialIndex:0};En.getNormal(wr,Er,Tr,d.normal),h.face=d,h.barycoord=u}return h}class ws extends At{constructor(e=1,t=1,n=1,i=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:r,depthSegments:o};const a=this;i=Math.floor(i),r=Math.floor(r),o=Math.floor(o);const c=[],l=[],h=[],u=[];let d=0,m=0;_("z","y","x",-1,-1,n,t,e,o,r,0),_("z","y","x",1,-1,n,t,-e,o,r,1),_("x","z","y",1,1,e,n,t,i,o,2),_("x","z","y",1,-1,e,n,-t,i,o,3),_("x","y","z",1,-1,e,t,n,i,r,4),_("x","y","z",-1,-1,e,t,-n,i,r,5),this.setIndex(c),this.setAttribute("position",new Ve(l,3)),this.setAttribute("normal",new Ve(h,3)),this.setAttribute("uv",new Ve(u,2));function _(p,g,f,x,v,y,b,w,R,A,M){const S=y/R,L=b/A,I=y/2,N=b/2,U=w/2,z=R+1,O=A+1;let G=0,H=0;const J=new C;for(let te=0;te<O;te++){const le=te*L-N;for(let ge=0;ge<z;ge++){const ze=ge*S-I;J[p]=ze*x,J[g]=le*v,J[f]=U,l.push(J.x,J.y,J.z),J[p]=0,J[g]=0,J[f]=w>0?1:-1,h.push(J.x,J.y,J.z),u.push(ge/R),u.push(1-te/A),G+=1}}for(let te=0;te<A;te++)for(let le=0;le<R;le++){const ge=d+le+z*te,ze=d+le+z*(te+1),ot=d+(le+1)+z*(te+1),tt=d+(le+1)+z*te;c.push(ge,ze,tt),c.push(ze,ot,tt),H+=6}a.addGroup(m,H,M),m+=H,d+=G}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ws(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function vs(s){const e={};for(const t in s){e[t]={};for(const n in s[t]){const i=s[t][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone():Array.isArray(i)?e[t][n]=i.slice():e[t][n]=i}}return e}function Zt(s){const e={};for(let t=0;t<s.length;t++){const n=vs(s[t]);for(const i in n)e[i]=n[i]}return e}function Ef(s){const e=[];for(let t=0;t<s.length;t++)e.push(s[t].clone());return e}function du(s){const e=s.getRenderTarget();return e===null?s.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:nt.workingColorSpace}const fu={clone:vs,merge:Zt};var Tf=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Af=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class tn extends kn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Tf,this.fragmentShader=Af,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=vs(e.uniforms),this.uniformsGroups=Ef(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const i in this.uniforms){const o=this.uniforms[i].value;o&&o.isTexture?t.uniforms[i]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[i]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[i]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[i]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[i]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[i]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[i]={type:"m4",value:o.toArray()}:t.uniforms[i]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class Rc extends ht{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ke,this.projectionMatrix=new ke,this.projectionMatrixInverse=new ke,this.coordinateSystem=zn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const fi=new C,Ll=new he,Il=new he;class Yt extends Rc{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=xs*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Ws*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return xs*2*Math.atan(Math.tan(Ws*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){fi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(fi.x,fi.y).multiplyScalar(-e/fi.z),fi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(fi.x,fi.y).multiplyScalar(-e/fi.z)}getViewSize(e,t){return this.getViewBounds(e,Ll,Il),t.subVectors(Il,Ll)}setViewOffset(e,t,n,i,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Ws*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,r=-.5*i;const o=this.view;if(this.view!==null&&this.view.enabled){const c=o.fullWidth,l=o.fullHeight;r+=o.offsetX*i/c,t-=o.offsetY*n/l,i*=o.width/c,n*=o.height/l}const a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const Qi=-90,es=1;class Rf extends ht{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new Yt(Qi,es,e,t);i.layers=this.layers,this.add(i);const r=new Yt(Qi,es,e,t);r.layers=this.layers,this.add(r);const o=new Yt(Qi,es,e,t);o.layers=this.layers,this.add(o);const a=new Yt(Qi,es,e,t);a.layers=this.layers,this.add(a);const c=new Yt(Qi,es,e,t);c.layers=this.layers,this.add(c);const l=new Yt(Qi,es,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,i,r,o,a,c]=t;for(const l of t)this.remove(l);if(e===zn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===io)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,c,l,h]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),m=e.getActiveMipmapLevel(),_=e.xr.enabled;e.xr.enabled=!1;const p=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,i),e.render(t,r),e.setRenderTarget(n,1,i),e.render(t,o),e.setRenderTarget(n,2,i),e.render(t,a),e.setRenderTarget(n,3,i),e.render(t,c),e.setRenderTarget(n,4,i),e.render(t,l),n.texture.generateMipmaps=p,e.setRenderTarget(n,5,i),e.render(t,h),e.setRenderTarget(u,d,m),e.xr.enabled=_,n.texture.needsPMREMUpdate=!0}}class pu extends Ut{constructor(e=[],t=gs,n,i,r,o,a,c,l,h){super(e,t,n,i,r,o,a,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Cf extends si{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new pu(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},i=new ws(5,5,5),r=new tn({name:"CubemapFromEquirect",uniforms:vs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Vt,blending:gi});r.uniforms.tEquirect.value=t;const o=new rt(i,r),a=t.minFilter;return t.minFilter===An&&(t.minFilter=Dt),new Rf(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){const r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,i);e.setRenderTarget(r)}}class qe extends ht{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Pf={type:"move"};class Wo{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new qe,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new qe,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new C,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new C),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new qe,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new C,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new C),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,r=null,o=null;const a=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){o=!0;for(const p of e.hand.values()){const g=t.getJointPose(p,n),f=this._getHandJoint(l,p);g!==null&&(f.matrix.fromArray(g.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=g.radius),f.visible=g!==null}const h=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],d=h.position.distanceTo(u.position),m=.02,_=.005;l.inputState.pinching&&d>m+_?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&d<=m-_&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&r!==null&&(i=r),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Pf)))}return a!==null&&(a.visible=i!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new qe;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class Cc{constructor(e,t=25e-5){this.isFogExp2=!0,this.name="",this.color=new xe(e),this.density=t}clone(){return new Cc(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class Dl extends ht{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new _n,this.environmentIntensity=1,this.environmentRotation=new _n,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Lf{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=ic,this.updateRanges=[],this.version=0,this.uuid=Cn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let i=0,r=this.stride;i<r;i++)this.array[e+i]=t.array[n+i];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Cn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Cn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const $t=new C;class Pc{constructor(e,t,n,i=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=i}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)$t.fromBufferAttribute(this,t),$t.applyMatrix4(e),this.setXYZ(t,$t.x,$t.y,$t.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)$t.fromBufferAttribute(this,t),$t.applyNormalMatrix(e),this.setXYZ(t,$t.x,$t.y,$t.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)$t.fromBufferAttribute(this,t),$t.transformDirection(e),this.setXYZ(t,$t.x,$t.y,$t.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=wn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=ct(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=ct(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=ct(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=ct(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=ct(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=wn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=wn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=wn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=wn(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=ct(t,this.array),n=ct(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=ct(t,this.array),n=ct(n,this.array),i=ct(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this}setXYZW(e,t,n,i,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=ct(t,this.array),n=ct(n,this.array),i=ct(i,this.array),r=ct(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this.data.array[e+3]=r,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[i+r])}return new wt(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new Pc(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[i+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}const Ul=new C,Nl=new it,Fl=new it,If=new C,zl=new ke,Pr=new C,Xo=new Hn,Ol=new ke,qo=new uo;class Df extends rt{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=ll,this.bindMatrix=new ke,this.bindMatrixInverse=new ke,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new oi),this.boundingBox.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Pr),this.boundingBox.expandByPoint(Pr)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new Hn),this.boundingSphere.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Pr),this.boundingSphere.expandByPoint(Pr)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){const n=this.material,i=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Xo.copy(this.boundingSphere),Xo.applyMatrix4(i),e.ray.intersectsSphere(Xo)!==!1&&(Ol.copy(i).invert(),qo.copy(e.ray).applyMatrix4(Ol),!(this.boundingBox!==null&&qo.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,qo)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new it,t=this.geometry.attributes.skinWeight;for(let n=0,i=t.count;n<i;n++){e.fromBufferAttribute(t,n);const r=1/e.manhattanLength();r!==1/0?e.multiplyScalar(r):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===ll?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===Td?this.bindMatrixInverse.copy(this.bindMatrix).invert():console.warn("THREE.SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){const n=this.skeleton,i=this.geometry;Nl.fromBufferAttribute(i.attributes.skinIndex,e),Fl.fromBufferAttribute(i.attributes.skinWeight,e),Ul.copy(t).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let r=0;r<4;r++){const o=Fl.getComponent(r);if(o!==0){const a=Nl.getComponent(r);zl.multiplyMatrices(n.bones[a].matrixWorld,n.boneInverses[a]),t.addScaledVector(If.copy(Ul).applyMatrix4(zl),o)}}return t.applyMatrix4(this.bindMatrixInverse)}}class mu extends ht{constructor(){super(),this.isBone=!0,this.type="Bone"}}class fo extends Ut{constructor(e=null,t=1,n=1,i,r,o,a,c,l=Jt,h=Jt,u,d){super(null,o,a,c,l,h,i,r,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const kl=new ke,Uf=new ke;let Nf=class gu{constructor(e=[],t=[]){this.uuid=Cn(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){const e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){console.warn("THREE.Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,i=this.bones.length;n<i;n++)this.boneInverses.push(new ke)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){const n=new ke;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){const e=this.bones,t=this.boneInverses,n=this.boneMatrices,i=this.boneTexture;for(let r=0,o=e.length;r<o;r++){const a=e[r]?e[r].matrixWorld:Uf;kl.multiplyMatrices(a,t[r]),kl.toArray(n,r*16)}i!==null&&(i.needsUpdate=!0)}clone(){return new gu(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);const t=new Float32Array(e*e*4);t.set(this.boneMatrices);const n=new fo(t,e,e,ln,en);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){const i=this.bones[t];if(i.name===e)return i}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,i=e.bones.length;n<i;n++){const r=e.bones[n];let o=t[r];o===void 0&&(console.warn("THREE.Skeleton: No bone found with UUID:",r),o=new mu),this.bones.push(o),this.boneInverses.push(new ke().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){const e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;const t=this.bones,n=this.boneInverses;for(let i=0,r=t.length;i<r;i++){const o=t[i];e.bones.push(o.uuid);const a=n[i];e.boneInverses.push(a.toArray())}return e}};class rc extends wt{constructor(e,t,n,i=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const ts=new ke,Bl=new ke,Lr=[],Hl=new oi,Ff=new ke,Us=new rt,Ns=new Hn;class Ni extends rt{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new rc(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,Ff)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new oi),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ts),Hl.copy(e.boundingBox).applyMatrix4(ts),this.boundingBox.union(Hl)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Hn),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ts),Ns.copy(e.boundingSphere).applyMatrix4(ts),this.boundingSphere.union(Ns)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,i=this.morphTexture.source.data.data,r=n.length+1,o=e*r+1;for(let a=0;a<n.length;a++)n[a]=i[o+a]}raycast(e,t){const n=this.matrixWorld,i=this.count;if(Us.geometry=this.geometry,Us.material=this.material,Us.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Ns.copy(this.boundingSphere),Ns.applyMatrix4(n),e.ray.intersectsSphere(Ns)!==!1))for(let r=0;r<i;r++){this.getMatrixAt(r,ts),Bl.multiplyMatrices(n,ts),Us.matrixWorld=Bl,Us.raycast(e,Lr);for(let o=0,a=Lr.length;o<a;o++){const c=Lr[o];c.instanceId=r,c.object=this,t.push(c)}Lr.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new rc(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){const n=t.morphTargetInfluences,i=n.length+1;this.morphTexture===null&&(this.morphTexture=new fo(new Float32Array(i*this.count),i,this.count,yc,en));const r=this.morphTexture.source.data.data;let o=0;for(let l=0;l<n.length;l++)o+=n[l];const a=this.geometry.morphTargetsRelative?1:1-o,c=i*e;r[c]=a,r.set(n,c+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const Yo=new C,zf=new C,Of=new He;class mi{constructor(e=new C(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const i=Yo.subVectors(n,t).cross(zf.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(Yo),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/i;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Of.getNormalMatrix(e),i=this.coplanarPoint(Yo).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Ai=new Hn,kf=new he(.5,.5),Ir=new C;class Lc{constructor(e=new mi,t=new mi,n=new mi,i=new mi,r=new mi,o=new mi){this.planes=[e,t,n,i,r,o]}set(e,t,n,i,r,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(i),a[4].copy(r),a[5].copy(o),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=zn,n=!1){const i=this.planes,r=e.elements,o=r[0],a=r[1],c=r[2],l=r[3],h=r[4],u=r[5],d=r[6],m=r[7],_=r[8],p=r[9],g=r[10],f=r[11],x=r[12],v=r[13],y=r[14],b=r[15];if(i[0].setComponents(l-o,m-h,f-_,b-x).normalize(),i[1].setComponents(l+o,m+h,f+_,b+x).normalize(),i[2].setComponents(l+a,m+u,f+p,b+v).normalize(),i[3].setComponents(l-a,m-u,f-p,b-v).normalize(),n)i[4].setComponents(c,d,g,y).normalize(),i[5].setComponents(l-c,m-d,f-g,b-y).normalize();else if(i[4].setComponents(l-c,m-d,f-g,b-y).normalize(),t===zn)i[5].setComponents(l+c,m+d,f+g,b+y).normalize();else if(t===io)i[5].setComponents(c,d,g,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ai.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ai.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ai)}intersectsSprite(e){Ai.center.set(0,0,0);const t=kf.distanceTo(e.center);return Ai.radius=.7071067811865476+t,Ai.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ai)}intersectsSphere(e){const t=this.planes,n=e.center,i=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const i=t[n];if(Ir.x=i.normal.x>0?e.max.x:e.min.x,Ir.y=i.normal.y>0?e.max.y:e.min.y,Ir.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(Ir)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class _u extends kn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new xe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const so=new C,ro=new C,Vl=new ke,Fs=new uo,Dr=new Hn,jo=new C,Gl=new C;class Ic extends ht{constructor(e=new At,t=new _u){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let i=1,r=t.count;i<r;i++)so.fromBufferAttribute(t,i-1),ro.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=so.distanceTo(ro);e.setAttribute("lineDistance",new Ve(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,r=e.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Dr.copy(n.boundingSphere),Dr.applyMatrix4(i),Dr.radius+=r,e.ray.intersectsSphere(Dr)===!1)return;Vl.copy(i).invert(),Fs.copy(e.ray).applyMatrix4(Vl);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=this.isLineSegments?2:1,h=n.index,d=n.attributes.position;if(h!==null){const m=Math.max(0,o.start),_=Math.min(h.count,o.start+o.count);for(let p=m,g=_-1;p<g;p+=l){const f=h.getX(p),x=h.getX(p+1),v=Ur(this,e,Fs,c,f,x,p);v&&t.push(v)}if(this.isLineLoop){const p=h.getX(_-1),g=h.getX(m),f=Ur(this,e,Fs,c,p,g,_-1);f&&t.push(f)}}else{const m=Math.max(0,o.start),_=Math.min(d.count,o.start+o.count);for(let p=m,g=_-1;p<g;p+=l){const f=Ur(this,e,Fs,c,p,p+1,p);f&&t.push(f)}if(this.isLineLoop){const p=Ur(this,e,Fs,c,_-1,m,_-1);p&&t.push(p)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){const a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function Ur(s,e,t,n,i,r,o){const a=s.geometry.attributes.position;if(so.fromBufferAttribute(a,i),ro.fromBufferAttribute(a,r),t.distanceSqToSegment(so,ro,jo,Gl)>n)return;jo.applyMatrix4(s.matrixWorld);const l=e.ray.origin.distanceTo(jo);if(!(l<e.near||l>e.far))return{distance:l,point:Gl.clone().applyMatrix4(s.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:s}}const Wl=new C,Xl=new C;class Bf extends Ic{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let i=0,r=t.count;i<r;i+=2)Wl.fromBufferAttribute(t,i),Xl.fromBufferAttribute(t,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+Wl.distanceTo(Xl);e.setAttribute("lineDistance",new Ve(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Hf extends Ic{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}}class oo extends kn{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new xe(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const ql=new ke,oc=new uo,Nr=new Hn,Fr=new C;class ac extends ht{constructor(e=new At,t=new oo){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,r=e.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Nr.copy(n.boundingSphere),Nr.applyMatrix4(i),Nr.radius+=r,e.ray.intersectsSphere(Nr)===!1)return;ql.copy(i).invert(),oc.copy(e.ray).applyMatrix4(ql);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=n.index,u=n.attributes.position;if(l!==null){const d=Math.max(0,o.start),m=Math.min(l.count,o.start+o.count);for(let _=d,p=m;_<p;_++){const g=l.getX(_);Fr.fromBufferAttribute(u,g),Yl(Fr,g,c,i,e,t,this)}}else{const d=Math.max(0,o.start),m=Math.min(u.count,o.start+o.count);for(let _=d,p=m;_<p;_++)Fr.fromBufferAttribute(u,_),Yl(Fr,_,c,i,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){const a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function Yl(s,e,t,n,i,r,o){const a=oc.distanceSqToPoint(s);if(a<t){const c=new C;oc.closestPointToPoint(s,c),c.applyMatrix4(n);const l=i.ray.origin.distanceTo(c);if(l<i.near||l>i.far)return;r.push({distance:l,distanceToRay:Math.sqrt(a),point:c,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}class Dc extends Ut{constructor(e,t,n,i,r,o,a,c,l){super(e,t,n,i,r,o,a,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}}class Uc extends Ut{constructor(e,t,n=yi,i,r,o,a=Jt,c=Jt,l,h=Js,u=1){if(h!==Js&&h!==Qs)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:e,height:t,depth:u};super(d,i,r,o,a,c,h,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Ec(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class xu extends Ut{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Nc extends At{constructor(e=1,t=1,n=4,i=8,r=1){super(),this.type="CapsuleGeometry",this.parameters={radius:e,height:t,capSegments:n,radialSegments:i,heightSegments:r},t=Math.max(0,t),n=Math.max(1,Math.floor(n)),i=Math.max(3,Math.floor(i)),r=Math.max(1,Math.floor(r));const o=[],a=[],c=[],l=[],h=t/2,u=Math.PI/2*e,d=t,m=2*u+d,_=n*2+r,p=i+1,g=new C,f=new C;for(let x=0;x<=_;x++){let v=0,y=0,b=0,w=0;if(x<=n){const M=x/n,S=M*Math.PI/2;y=-h-e*Math.cos(S),b=e*Math.sin(S),w=-e*Math.cos(S),v=M*u}else if(x<=n+r){const M=(x-n)/r;y=-h+M*t,b=e,w=0,v=u+M*d}else{const M=(x-n-r)/n,S=M*Math.PI/2;y=h+e*Math.sin(S),b=e*Math.cos(S),w=e*Math.sin(S),v=u+d+M*u}const R=Math.max(0,Math.min(1,v/m));let A=0;x===0?A=.5/i:x===_&&(A=-.5/i);for(let M=0;M<=i;M++){const S=M/i,L=S*Math.PI*2,I=Math.sin(L),N=Math.cos(L);f.x=-b*N,f.y=y,f.z=b*I,a.push(f.x,f.y,f.z),g.set(-b*N,w,b*I),g.normalize(),c.push(g.x,g.y,g.z),l.push(S+A,R)}if(x>0){const M=(x-1)*p;for(let S=0;S<i;S++){const L=M+S,I=M+S+1,N=x*p+S,U=x*p+S+1;o.push(L,I,N),o.push(I,U,N)}}}this.setIndex(o),this.setAttribute("position",new Ve(a,3)),this.setAttribute("normal",new Ve(c,3)),this.setAttribute("uv",new Ve(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Nc(e.radius,e.height,e.capSegments,e.radialSegments,e.heightSegments)}}class fs extends At{constructor(e=1,t=1,n=1,i=32,r=1,o=!1,a=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:i,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:c};const l=this;i=Math.floor(i),r=Math.floor(r);const h=[],u=[],d=[],m=[];let _=0;const p=[],g=n/2;let f=0;x(),o===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(h),this.setAttribute("position",new Ve(u,3)),this.setAttribute("normal",new Ve(d,3)),this.setAttribute("uv",new Ve(m,2));function x(){const y=new C,b=new C;let w=0;const R=(t-e)/n;for(let A=0;A<=r;A++){const M=[],S=A/r,L=S*(t-e)+e;for(let I=0;I<=i;I++){const N=I/i,U=N*c+a,z=Math.sin(U),O=Math.cos(U);b.x=L*z,b.y=-S*n+g,b.z=L*O,u.push(b.x,b.y,b.z),y.set(z,R,O).normalize(),d.push(y.x,y.y,y.z),m.push(N,1-S),M.push(_++)}p.push(M)}for(let A=0;A<i;A++)for(let M=0;M<r;M++){const S=p[M][A],L=p[M+1][A],I=p[M+1][A+1],N=p[M][A+1];(e>0||M!==0)&&(h.push(S,L,N),w+=3),(t>0||M!==r-1)&&(h.push(L,I,N),w+=3)}l.addGroup(f,w,0),f+=w}function v(y){const b=_,w=new he,R=new C;let A=0;const M=y===!0?e:t,S=y===!0?1:-1;for(let I=1;I<=i;I++)u.push(0,g*S,0),d.push(0,S,0),m.push(.5,.5),_++;const L=_;for(let I=0;I<=i;I++){const U=I/i*c+a,z=Math.cos(U),O=Math.sin(U);R.x=M*O,R.y=g*S,R.z=M*z,u.push(R.x,R.y,R.z),d.push(0,S,0),w.x=z*.5+.5,w.y=O*.5*S+.5,m.push(w.x,w.y),_++}for(let I=0;I<i;I++){const N=b+I,U=L+I;y===!0?h.push(U,U+1,N):h.push(U+1,U,N),A+=3}l.addGroup(f,A,y===!0?1:2),f+=A}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new fs(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Fc extends At{constructor(e=[],t=[],n=1,i=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:e,indices:t,radius:n,detail:i};const r=[],o=[];a(i),l(n),h(),this.setAttribute("position",new Ve(r,3)),this.setAttribute("normal",new Ve(r.slice(),3)),this.setAttribute("uv",new Ve(o,2)),i===0?this.computeVertexNormals():this.normalizeNormals();function a(x){const v=new C,y=new C,b=new C;for(let w=0;w<t.length;w+=3)m(t[w+0],v),m(t[w+1],y),m(t[w+2],b),c(v,y,b,x)}function c(x,v,y,b){const w=b+1,R=[];for(let A=0;A<=w;A++){R[A]=[];const M=x.clone().lerp(y,A/w),S=v.clone().lerp(y,A/w),L=w-A;for(let I=0;I<=L;I++)I===0&&A===w?R[A][I]=M:R[A][I]=M.clone().lerp(S,I/L)}for(let A=0;A<w;A++)for(let M=0;M<2*(w-A)-1;M++){const S=Math.floor(M/2);M%2===0?(d(R[A][S+1]),d(R[A+1][S]),d(R[A][S])):(d(R[A][S+1]),d(R[A+1][S+1]),d(R[A+1][S]))}}function l(x){const v=new C;for(let y=0;y<r.length;y+=3)v.x=r[y+0],v.y=r[y+1],v.z=r[y+2],v.normalize().multiplyScalar(x),r[y+0]=v.x,r[y+1]=v.y,r[y+2]=v.z}function h(){const x=new C;for(let v=0;v<r.length;v+=3){x.x=r[v+0],x.y=r[v+1],x.z=r[v+2];const y=g(x)/2/Math.PI+.5,b=f(x)/Math.PI+.5;o.push(y,1-b)}_(),u()}function u(){for(let x=0;x<o.length;x+=6){const v=o[x+0],y=o[x+2],b=o[x+4],w=Math.max(v,y,b),R=Math.min(v,y,b);w>.9&&R<.1&&(v<.2&&(o[x+0]+=1),y<.2&&(o[x+2]+=1),b<.2&&(o[x+4]+=1))}}function d(x){r.push(x.x,x.y,x.z)}function m(x,v){const y=x*3;v.x=e[y+0],v.y=e[y+1],v.z=e[y+2]}function _(){const x=new C,v=new C,y=new C,b=new C,w=new he,R=new he,A=new he;for(let M=0,S=0;M<r.length;M+=9,S+=6){x.set(r[M+0],r[M+1],r[M+2]),v.set(r[M+3],r[M+4],r[M+5]),y.set(r[M+6],r[M+7],r[M+8]),w.set(o[S+0],o[S+1]),R.set(o[S+2],o[S+3]),A.set(o[S+4],o[S+5]),b.copy(x).add(v).add(y).divideScalar(3);const L=g(b);p(w,S+0,x,L),p(R,S+2,v,L),p(A,S+4,y,L)}}function p(x,v,y,b){b<0&&x.x===1&&(o[v]=x.x-1),y.x===0&&y.z===0&&(o[v]=b/2/Math.PI+.5)}function g(x){return Math.atan2(x.z,-x.x)}function f(x){return Math.atan2(-x.y,Math.sqrt(x.x*x.x+x.z*x.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Fc(e.vertices,e.indices,e.radius,e.details)}}class ai{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){console.warn("THREE.Curve: .getPoint() not implemented.")}getPointAt(e,t){const n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let n,i=this.getPoint(0),r=0;t.push(0);for(let o=1;o<=e;o++)n=this.getPoint(o/e),r+=n.distanceTo(i),t.push(r),i=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){const n=this.getLengths();let i=0;const r=n.length;let o;t?o=t:o=e*n[r-1];let a=0,c=r-1,l;for(;a<=c;)if(i=Math.floor(a+(c-a)/2),l=n[i]-o,l<0)a=i+1;else if(l>0)c=i-1;else{c=i;break}if(i=c,n[i]===o)return i/(r-1);const h=n[i],d=n[i+1]-h,m=(o-h)/d;return(i+m)/(r-1)}getTangent(e,t){let i=e-1e-4,r=e+1e-4;i<0&&(i=0),r>1&&(r=1);const o=this.getPoint(i),a=this.getPoint(r),c=t||(o.isVector2?new he:new C);return c.copy(a).sub(o).normalize(),c}getTangentAt(e,t){const n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){const n=new C,i=[],r=[],o=[],a=new C,c=new ke;for(let m=0;m<=e;m++){const _=m/e;i[m]=this.getTangentAt(_,new C)}r[0]=new C,o[0]=new C;let l=Number.MAX_VALUE;const h=Math.abs(i[0].x),u=Math.abs(i[0].y),d=Math.abs(i[0].z);h<=l&&(l=h,n.set(1,0,0)),u<=l&&(l=u,n.set(0,1,0)),d<=l&&n.set(0,0,1),a.crossVectors(i[0],n).normalize(),r[0].crossVectors(i[0],a),o[0].crossVectors(i[0],r[0]);for(let m=1;m<=e;m++){if(r[m]=r[m-1].clone(),o[m]=o[m-1].clone(),a.crossVectors(i[m-1],i[m]),a.length()>Number.EPSILON){a.normalize();const _=Math.acos(Xe(i[m-1].dot(i[m]),-1,1));r[m].applyMatrix4(c.makeRotationAxis(a,_))}o[m].crossVectors(i[m],r[m])}if(t===!0){let m=Math.acos(Xe(r[0].dot(r[e]),-1,1));m/=e,i[0].dot(a.crossVectors(r[0],r[e]))>0&&(m=-m);for(let _=1;_<=e;_++)r[_].applyMatrix4(c.makeRotationAxis(i[_],m*_)),o[_].crossVectors(i[_],r[_])}return{tangents:i,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){const e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}}class vu extends ai{constructor(e=0,t=0,n=1,i=1,r=0,o=Math.PI*2,a=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=i,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=c}getPoint(e,t=new he){const n=t,i=Math.PI*2;let r=this.aEndAngle-this.aStartAngle;const o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=i;for(;r>i;)r-=i;r<Number.EPSILON&&(o?r=0:r=i),this.aClockwise===!0&&!o&&(r===i?r=-i:r=r-i);const a=this.aStartAngle+e*r;let c=this.aX+this.xRadius*Math.cos(a),l=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),d=c-this.aX,m=l-this.aY;c=d*h-m*u+this.aX,l=d*u+m*h+this.aY}return n.set(c,l)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){const e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}}class Vf extends vu{constructor(e,t,n,i,r,o){super(e,t,n,n,i,r,o),this.isArcCurve=!0,this.type="ArcCurve"}}function zc(){let s=0,e=0,t=0,n=0;function i(r,o,a,c){s=r,e=a,t=-3*r+3*o-2*a-c,n=2*r-2*o+a+c}return{initCatmullRom:function(r,o,a,c,l){i(o,a,l*(a-r),l*(c-o))},initNonuniformCatmullRom:function(r,o,a,c,l,h,u){let d=(o-r)/l-(a-r)/(l+h)+(a-o)/h,m=(a-o)/h-(c-o)/(h+u)+(c-a)/u;d*=h,m*=h,i(o,a,d,m)},calc:function(r){const o=r*r,a=o*r;return s+e*r+t*o+n*a}}}const zr=new C,Ko=new zc,$o=new zc,Zo=new zc;class yu extends ai{constructor(e=[],t=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=i}getPoint(e,t=new C){const n=t,i=this.points,r=i.length,o=(r-(this.closed?0:1))*e;let a=Math.floor(o),c=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:c===0&&a===r-1&&(a=r-2,c=1);let l,h;this.closed||a>0?l=i[(a-1)%r]:(zr.subVectors(i[0],i[1]).add(i[0]),l=zr);const u=i[a%r],d=i[(a+1)%r];if(this.closed||a+2<r?h=i[(a+2)%r]:(zr.subVectors(i[r-1],i[r-2]).add(i[r-1]),h=zr),this.curveType==="centripetal"||this.curveType==="chordal"){const m=this.curveType==="chordal"?.5:.25;let _=Math.pow(l.distanceToSquared(u),m),p=Math.pow(u.distanceToSquared(d),m),g=Math.pow(d.distanceToSquared(h),m);p<1e-4&&(p=1),_<1e-4&&(_=p),g<1e-4&&(g=p),Ko.initNonuniformCatmullRom(l.x,u.x,d.x,h.x,_,p,g),$o.initNonuniformCatmullRom(l.y,u.y,d.y,h.y,_,p,g),Zo.initNonuniformCatmullRom(l.z,u.z,d.z,h.z,_,p,g)}else this.curveType==="catmullrom"&&(Ko.initCatmullRom(l.x,u.x,d.x,h.x,this.tension),$o.initCatmullRom(l.y,u.y,d.y,h.y,this.tension),Zo.initCatmullRom(l.z,u.z,d.z,h.z,this.tension));return n.set(Ko.calc(c),$o.calc(c),Zo.calc(c)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(i.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const i=this.points[t];e.points.push(i.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(new C().fromArray(i))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}}function jl(s,e,t,n,i){const r=(n-e)*.5,o=(i-t)*.5,a=s*s,c=s*a;return(2*t-2*n+r+o)*c+(-3*t+3*n-2*r-o)*a+r*s+t}function Gf(s,e){const t=1-s;return t*t*e}function Wf(s,e){return 2*(1-s)*s*e}function Xf(s,e){return s*s*e}function qs(s,e,t,n){return Gf(s,e)+Wf(s,t)+Xf(s,n)}function qf(s,e){const t=1-s;return t*t*t*e}function Yf(s,e){const t=1-s;return 3*t*t*s*e}function jf(s,e){return 3*(1-s)*s*s*e}function Kf(s,e){return s*s*s*e}function Ys(s,e,t,n,i){return qf(s,e)+Yf(s,t)+jf(s,n)+Kf(s,i)}class $f extends ai{constructor(e=new he,t=new he,n=new he,i=new he){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new he){const n=t,i=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Ys(e,i.x,r.x,o.x,a.x),Ys(e,i.y,r.y,o.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class Zf extends ai{constructor(e=new C,t=new C,n=new C,i=new C){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new C){const n=t,i=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(Ys(e,i.x,r.x,o.x,a.x),Ys(e,i.y,r.y,o.y,a.y),Ys(e,i.z,r.z,o.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class Jf extends ai{constructor(e=new he,t=new he){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new he){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new he){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Qf extends ai{constructor(e=new C,t=new C){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new C){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new C){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class ep extends ai{constructor(e=new he,t=new he,n=new he){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new he){const n=t,i=this.v0,r=this.v1,o=this.v2;return n.set(qs(e,i.x,r.x,o.x),qs(e,i.y,r.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Mu extends ai{constructor(e=new C,t=new C,n=new C){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new C){const n=t,i=this.v0,r=this.v1,o=this.v2;return n.set(qs(e,i.x,r.x,o.x),qs(e,i.y,r.y,o.y),qs(e,i.z,r.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class tp extends ai{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new he){const n=t,i=this.points,r=(i.length-1)*e,o=Math.floor(r),a=r-o,c=i[o===0?o:o-1],l=i[o],h=i[o>i.length-2?i.length-1:o+1],u=i[o>i.length-3?i.length-1:o+2];return n.set(jl(a,c.x,l.x,h.x,u.x),jl(a,c.y,l.y,h.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(i.clone())}return this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const i=this.points[t];e.points.push(i.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(new he().fromArray(i))}return this}}var np=Object.freeze({__proto__:null,ArcCurve:Vf,CatmullRomCurve3:yu,CubicBezierCurve:$f,CubicBezierCurve3:Zf,EllipseCurve:vu,LineCurve:Jf,LineCurve3:Qf,QuadraticBezierCurve:ep,QuadraticBezierCurve3:Mu,SplineCurve:tp});class po extends Fc{constructor(e=1,t=0){const n=(1+Math.sqrt(5))/2,i=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],r=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(i,r,e,t),this.type="IcosahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new po(e.radius,e.detail)}}class Oc extends At{constructor(e=[new he(0,-.5),new he(.5,0),new he(0,.5)],t=12,n=0,i=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:e,segments:t,phiStart:n,phiLength:i},t=Math.floor(t),i=Xe(i,0,Math.PI*2);const r=[],o=[],a=[],c=[],l=[],h=1/t,u=new C,d=new he,m=new C,_=new C,p=new C;let g=0,f=0;for(let x=0;x<=e.length-1;x++)switch(x){case 0:g=e[x+1].x-e[x].x,f=e[x+1].y-e[x].y,m.x=f*1,m.y=-g,m.z=f*0,p.copy(m),m.normalize(),c.push(m.x,m.y,m.z);break;case e.length-1:c.push(p.x,p.y,p.z);break;default:g=e[x+1].x-e[x].x,f=e[x+1].y-e[x].y,m.x=f*1,m.y=-g,m.z=f*0,_.copy(m),m.x+=p.x,m.y+=p.y,m.z+=p.z,m.normalize(),c.push(m.x,m.y,m.z),p.copy(_)}for(let x=0;x<=t;x++){const v=n+x*h*i,y=Math.sin(v),b=Math.cos(v);for(let w=0;w<=e.length-1;w++){u.x=e[w].x*y,u.y=e[w].y,u.z=e[w].x*b,o.push(u.x,u.y,u.z),d.x=x/t,d.y=w/(e.length-1),a.push(d.x,d.y);const R=c[3*w+0]*y,A=c[3*w+1],M=c[3*w+0]*b;l.push(R,A,M)}}for(let x=0;x<t;x++)for(let v=0;v<e.length-1;v++){const y=v+x*e.length,b=y,w=y+e.length,R=y+e.length+1,A=y+1;r.push(b,w,A),r.push(R,A,w)}this.setIndex(r),this.setAttribute("position",new Ve(o,3)),this.setAttribute("uv",new Ve(a,2)),this.setAttribute("normal",new Ve(l,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Oc(e.points,e.segments,e.phiStart,e.phiLength)}}class Mi extends At{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};const r=e/2,o=t/2,a=Math.floor(n),c=Math.floor(i),l=a+1,h=c+1,u=e/a,d=t/c,m=[],_=[],p=[],g=[];for(let f=0;f<h;f++){const x=f*d-o;for(let v=0;v<l;v++){const y=v*u-r;_.push(y,-x,0),p.push(0,0,1),g.push(v/a),g.push(1-f/c)}}for(let f=0;f<c;f++)for(let x=0;x<a;x++){const v=x+l*f,y=x+l*(f+1),b=x+1+l*(f+1),w=x+1+l*f;m.push(v,y,w),m.push(y,b,w)}this.setIndex(m),this.setAttribute("position",new Ve(_,3)),this.setAttribute("normal",new Ve(p,3)),this.setAttribute("uv",new Ve(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Mi(e.width,e.height,e.widthSegments,e.heightSegments)}}class vn extends At{constructor(e=1,t=32,n=16,i=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:i,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const c=Math.min(o+a,Math.PI);let l=0;const h=[],u=new C,d=new C,m=[],_=[],p=[],g=[];for(let f=0;f<=n;f++){const x=[],v=f/n;let y=0;f===0&&o===0?y=.5/t:f===n&&c===Math.PI&&(y=-.5/t);for(let b=0;b<=t;b++){const w=b/t;u.x=-e*Math.cos(i+w*r)*Math.sin(o+v*a),u.y=e*Math.cos(o+v*a),u.z=e*Math.sin(i+w*r)*Math.sin(o+v*a),_.push(u.x,u.y,u.z),d.copy(u).normalize(),p.push(d.x,d.y,d.z),g.push(w+y,1-v),x.push(l++)}h.push(x)}for(let f=0;f<n;f++)for(let x=0;x<t;x++){const v=h[f][x+1],y=h[f][x],b=h[f+1][x],w=h[f+1][x+1];(f!==0||o>0)&&m.push(v,y,w),(f!==n-1||c<Math.PI)&&m.push(y,b,w)}this.setIndex(m),this.setAttribute("position",new Ve(_,3)),this.setAttribute("normal",new Ve(p,3)),this.setAttribute("uv",new Ve(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new vn(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class kc extends At{constructor(e=new Mu(new C(-1,-1,0),new C(-1,1,0),new C(1,1,0)),t=64,n=1,i=8,r=!1){super(),this.type="TubeGeometry",this.parameters={path:e,tubularSegments:t,radius:n,radialSegments:i,closed:r};const o=e.computeFrenetFrames(t,r);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;const a=new C,c=new C,l=new he;let h=new C;const u=[],d=[],m=[],_=[];p(),this.setIndex(_),this.setAttribute("position",new Ve(u,3)),this.setAttribute("normal",new Ve(d,3)),this.setAttribute("uv",new Ve(m,2));function p(){for(let v=0;v<t;v++)g(v);g(r===!1?t:0),x(),f()}function g(v){h=e.getPointAt(v/t,h);const y=o.normals[v],b=o.binormals[v];for(let w=0;w<=i;w++){const R=w/i*Math.PI*2,A=Math.sin(R),M=-Math.cos(R);c.x=M*y.x+A*b.x,c.y=M*y.y+A*b.y,c.z=M*y.z+A*b.z,c.normalize(),d.push(c.x,c.y,c.z),a.x=h.x+n*c.x,a.y=h.y+n*c.y,a.z=h.z+n*c.z,u.push(a.x,a.y,a.z)}}function f(){for(let v=1;v<=t;v++)for(let y=1;y<=i;y++){const b=(i+1)*(v-1)+(y-1),w=(i+1)*v+(y-1),R=(i+1)*v+y,A=(i+1)*(v-1)+y;_.push(b,w,A),_.push(w,R,A)}}function x(){for(let v=0;v<=t;v++)for(let y=0;y<=i;y++)l.x=v/t,l.y=y/i,m.push(l.x,l.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(e){return new kc(new np[e.path.type]().fromJSON(e.path),e.tubularSegments,e.radius,e.radialSegments,e.closed)}}class It extends kn{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new xe(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new xe(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ou,this.normalScale=new he(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new _n,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Vn extends It{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new he(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Xe(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new xe(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new xe(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new xe(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}}class ip extends kn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Cd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class sp extends kn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}function Or(s,e){return!s||s.constructor===e?s:typeof e.BYTES_PER_ELEMENT=="number"?new e(s):Array.prototype.slice.call(s)}function rp(s){return ArrayBuffer.isView(s)&&!(s instanceof DataView)}function op(s){function e(i,r){return s[i]-s[r]}const t=s.length,n=new Array(t);for(let i=0;i!==t;++i)n[i]=i;return n.sort(e),n}function Kl(s,e,t){const n=s.length,i=new s.constructor(n);for(let r=0,o=0;o!==n;++r){const a=t[r]*e;for(let c=0;c!==e;++c)i[o++]=s[a+c]}return i}function Su(s,e,t,n){let i=1,r=s[0];for(;r!==void 0&&r[n]===void 0;)r=s[i++];if(r===void 0)return;let o=r[n];if(o!==void 0)if(Array.isArray(o))do o=r[n],o!==void 0&&(e.push(r.time),t.push(...o)),r=s[i++];while(r!==void 0);else if(o.toArray!==void 0)do o=r[n],o!==void 0&&(e.push(r.time),o.toArray(t,t.length)),r=s[i++];while(r!==void 0);else do o=r[n],o!==void 0&&(e.push(r.time),t.push(o)),r=s[i++];while(r!==void 0)}class rr{constructor(e,t,n,i){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){const t=this.parameterPositions;let n=this._cachedIndex,i=t[n],r=t[n-1];n:{e:{let o;t:{i:if(!(e<i)){for(let a=n+2;;){if(i===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=i,i=t[++n],e<i)break e}o=t.length;break t}if(!(e>=r)){const a=t[1];e<a&&(n=2,r=a);for(let c=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(i=r,r=t[--n-1],e>=r)break e}o=n,n=0;break t}break n}for(;n<o;){const a=n+o>>>1;e<t[a]?o=a:n=a+1}if(i=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,i)}return this.interpolate_(n,r,e,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,r=e*i;for(let o=0;o!==i;++o)t[o]=n[r+o];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}}class ap extends rr{constructor(e,t,n,i){super(e,t,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:hl,endingEnd:hl}}intervalChanged_(e,t,n){const i=this.parameterPositions;let r=e-2,o=e+1,a=i[r],c=i[o];if(a===void 0)switch(this.getSettings_().endingStart){case ul:r=e,a=2*t-n;break;case dl:r=i.length-2,a=t+i[r]-i[r+1];break;default:r=e,a=n}if(c===void 0)switch(this.getSettings_().endingEnd){case ul:o=e,c=2*n-t;break;case dl:o=1,c=n+i[1]-i[0];break;default:o=e-1,c=t}const l=(n-t)*.5,h=this.valueSize;this._weightPrev=l/(t-a),this._weightNext=l/(c-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(e,t,n,i){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,m=this._weightNext,_=(n-t)/(i-t),p=_*_,g=p*_,f=-d*g+2*d*p-d*_,x=(1+d)*g+(-1.5-2*d)*p+(-.5+d)*_+1,v=(-1-m)*g+(1.5+m)*p+.5*_,y=m*g-m*p;for(let b=0;b!==a;++b)r[b]=f*o[h+b]+x*o[l+b]+v*o[c+b]+y*o[u+b];return r}}class cp extends rr{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,h=(n-t)/(i-t),u=1-h;for(let d=0;d!==a;++d)r[d]=o[l+d]*u+o[c+d]*h;return r}}class lp extends rr{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e){return this.copySampleValue_(e-1)}}class Ln{constructor(e,t,n,i){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Or(t,this.TimeBufferType),this.values=Or(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(e){const t=e.constructor;let n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Or(e.times,Array),values:Or(e.values,Array)};const i=e.getInterpolation();i!==e.DefaultInterpolation&&(n.interpolation=i)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new lp(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new cp(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new ap(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case er:t=this.InterpolantFactoryMethodDiscrete;break;case tr:t=this.InterpolantFactoryMethodLinear;break;case bo:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){const n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return er;case this.InterpolantFactoryMethodLinear:return tr;case this.InterpolantFactoryMethodSmooth:return bo}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){const t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]+=e}return this}scale(e){if(e!==1){const t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]*=e}return this}trim(e,t){const n=this.times,i=n.length;let r=0,o=i-1;for(;r!==i&&n[r]<e;)++r;for(;o!==-1&&n[o]>t;)--o;if(++o,r!==0||o!==i){r>=o&&(o=Math.max(o,1),r=o-1);const a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let e=!0;const t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);const n=this.times,i=this.values,r=n.length;r===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==r;a++){const c=n[a];if(typeof c=="number"&&isNaN(c)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,a,c),e=!1;break}if(o!==null&&o>c){console.error("THREE.KeyframeTrack: Out of order keys.",this,a,c,o),e=!1;break}o=c}if(i!==void 0&&rp(i))for(let a=0,c=i.length;a!==c;++a){const l=i[a];if(isNaN(l)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,a,l),e=!1;break}}return e}optimize(){const e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),i=this.getInterpolation()===bo,r=e.length-1;let o=1;for(let a=1;a<r;++a){let c=!1;const l=e[a],h=e[a+1];if(l!==h&&(a!==1||l!==e[0]))if(i)c=!0;else{const u=a*n,d=u-n,m=u+n;for(let _=0;_!==n;++_){const p=t[u+_];if(p!==t[d+_]||p!==t[m+_]){c=!0;break}}}if(c){if(a!==o){e[o]=e[a];const u=a*n,d=o*n;for(let m=0;m!==n;++m)t[d+m]=t[u+m]}++o}}if(r>0){e[o]=e[r];for(let a=r*n,c=o*n,l=0;l!==n;++l)t[c+l]=t[a+l];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=t.slice(0,o*n)):(this.times=e,this.values=t),this}clone(){const e=this.times.slice(),t=this.values.slice(),n=this.constructor,i=new n(this.name,e,t);return i.createInterpolant=this.createInterpolant,i}}Ln.prototype.ValueTypeName="";Ln.prototype.TimeBufferType=Float32Array;Ln.prototype.ValueBufferType=Float32Array;Ln.prototype.DefaultInterpolation=tr;class Es extends Ln{constructor(e,t,n){super(e,t,n)}}Es.prototype.ValueTypeName="bool";Es.prototype.ValueBufferType=Array;Es.prototype.DefaultInterpolation=er;Es.prototype.InterpolantFactoryMethodLinear=void 0;Es.prototype.InterpolantFactoryMethodSmooth=void 0;class bu extends Ln{constructor(e,t,n,i){super(e,t,n,i)}}bu.prototype.ValueTypeName="color";class ys extends Ln{constructor(e,t,n,i){super(e,t,n,i)}}ys.prototype.ValueTypeName="number";class hp extends rr{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=(n-t)/(i-t);let l=e*a;for(let h=l+a;l!==h;l+=4)xn.slerpFlat(r,0,o,l-a,o,l,c);return r}}class Ms extends Ln{constructor(e,t,n,i){super(e,t,n,i)}InterpolantFactoryMethodLinear(e){return new hp(this.times,this.values,this.getValueSize(),e)}}Ms.prototype.ValueTypeName="quaternion";Ms.prototype.InterpolantFactoryMethodSmooth=void 0;class Ts extends Ln{constructor(e,t,n){super(e,t,n)}}Ts.prototype.ValueTypeName="string";Ts.prototype.ValueBufferType=Array;Ts.prototype.DefaultInterpolation=er;Ts.prototype.InterpolantFactoryMethodLinear=void 0;Ts.prototype.InterpolantFactoryMethodSmooth=void 0;class Ss extends Ln{constructor(e,t,n,i){super(e,t,n,i)}}Ss.prototype.ValueTypeName="vector";class up{constructor(e="",t=-1,n=[],i=Ad){this.name=e,this.tracks=n,this.duration=t,this.blendMode=i,this.uuid=Cn(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){const t=[],n=e.tracks,i=1/(e.fps||1);for(let o=0,a=n.length;o!==a;++o)t.push(fp(n[o]).scale(i));const r=new this(e.name,e.duration,t,e.blendMode);return r.uuid=e.uuid,r.userData=JSON.parse(e.userData||"{}"),r}static toJSON(e){const t=[],n=e.tracks,i={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let r=0,o=n.length;r!==o;++r)t.push(Ln.toJSON(n[r]));return i}static CreateFromMorphTargetSequence(e,t,n,i){const r=t.length,o=[];for(let a=0;a<r;a++){let c=[],l=[];c.push((a+r-1)%r,a,(a+1)%r),l.push(0,1,0);const h=op(c);c=Kl(c,1,h),l=Kl(l,1,h),!i&&c[0]===0&&(c.push(r),l.push(l[0])),o.push(new ys(".morphTargetInfluences["+t[a].name+"]",c,l).scale(1/n))}return new this(e,-1,o)}static findByName(e,t){let n=e;if(!Array.isArray(e)){const i=e;n=i.geometry&&i.geometry.animations||i.animations}for(let i=0;i<n.length;i++)if(n[i].name===t)return n[i];return null}static CreateClipsFromMorphTargetSequences(e,t,n){const i={},r=/^([\w-]*?)([\d]+)$/;for(let a=0,c=e.length;a<c;a++){const l=e[a],h=l.name.match(r);if(h&&h.length>1){const u=h[1];let d=i[u];d||(i[u]=d=[]),d.push(l)}}const o=[];for(const a in i)o.push(this.CreateFromMorphTargetSequence(a,i[a],t,n));return o}static parseAnimation(e,t){if(console.warn("THREE.AnimationClip: parseAnimation() is deprecated and will be removed with r185"),!e)return console.error("THREE.AnimationClip: No animation in JSONLoader data."),null;const n=function(u,d,m,_,p){if(m.length!==0){const g=[],f=[];Su(m,g,f,_),g.length!==0&&p.push(new u(d,g,f))}},i=[],r=e.name||"default",o=e.fps||30,a=e.blendMode;let c=e.length||-1;const l=e.hierarchy||[];for(let u=0;u<l.length;u++){const d=l[u].keys;if(!(!d||d.length===0))if(d[0].morphTargets){const m={};let _;for(_=0;_<d.length;_++)if(d[_].morphTargets)for(let p=0;p<d[_].morphTargets.length;p++)m[d[_].morphTargets[p]]=-1;for(const p in m){const g=[],f=[];for(let x=0;x!==d[_].morphTargets.length;++x){const v=d[_];g.push(v.time),f.push(v.morphTarget===p?1:0)}i.push(new ys(".morphTargetInfluence["+p+"]",g,f))}c=m.length*o}else{const m=".bones["+t[u].name+"]";n(Ss,m+".position",d,"pos",i),n(Ms,m+".quaternion",d,"rot",i),n(Ss,m+".scale",d,"scl",i)}}return i.length===0?null:new this(r,c,i,a)}resetDuration(){const e=this.tracks;let t=0;for(let n=0,i=e.length;n!==i;++n){const r=this.tracks[n];t=Math.max(t,r.times[r.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){const e=[];for(let n=0;n<this.tracks.length;n++)e.push(this.tracks[n].clone());const t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}}function dp(s){switch(s.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return ys;case"vector":case"vector2":case"vector3":case"vector4":return Ss;case"color":return bu;case"quaternion":return Ms;case"bool":case"boolean":return Es;case"string":return Ts}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+s)}function fp(s){if(s.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");const e=dp(s.type);if(s.times===void 0){const t=[],n=[];Su(s.keys,t,n,"value"),s.times=t,s.values=n}return e.parse!==void 0?e.parse(s):new e(s.name,s.times,s.values,s.interpolation)}const Qn={enabled:!1,files:{},add:function(s,e){this.enabled!==!1&&(this.files[s]=e)},get:function(s){if(this.enabled!==!1)return this.files[s]},remove:function(s){delete this.files[s]},clear:function(){this.files={}}};class pp{constructor(e,t,n){const i=this;let r=!1,o=0,a=0,c;const l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.abortController=new AbortController,this.itemStart=function(h){a++,r===!1&&i.onStart!==void 0&&i.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,i.onProgress!==void 0&&i.onProgress(h,o,a),o===a&&(r=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,u){return l.push(h,u),this},this.removeHandler=function(h){const u=l.indexOf(h);return u!==-1&&l.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=l.length;u<d;u+=2){const m=l[u],_=l[u+1];if(m.global&&(m.lastIndex=0),m.test(h))return _}return null},this.abort=function(){return this.abortController.abort(),this.abortController=new AbortController,this}}}const mp=new pp;class Bi{constructor(e){this.manager=e!==void 0?e:mp,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const n=this;return new Promise(function(i,r){n.load(e,i,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}Bi.DEFAULT_MATERIAL_NAME="__DEFAULT";const Kn={};class gp extends Error{constructor(e,t){super(e),this.response=t}}class Bc extends Bi{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=Qn.get(`file:${e}`);if(r!==void 0)return this.manager.itemStart(e),setTimeout(()=>{t&&t(r),this.manager.itemEnd(e)},0),r;if(Kn[e]!==void 0){Kn[e].push({onLoad:t,onProgress:n,onError:i});return}Kn[e]=[],Kn[e].push({onLoad:t,onProgress:n,onError:i});const o=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),a=this.mimeType,c=this.responseType;fetch(o).then(l=>{if(l.status===200||l.status===0){if(l.status===0&&console.warn("THREE.FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||l.body===void 0||l.body.getReader===void 0)return l;const h=Kn[e],u=l.body.getReader(),d=l.headers.get("X-File-Size")||l.headers.get("Content-Length"),m=d?parseInt(d):0,_=m!==0;let p=0;const g=new ReadableStream({start(f){x();function x(){u.read().then(({done:v,value:y})=>{if(v)f.close();else{p+=y.byteLength;const b=new ProgressEvent("progress",{lengthComputable:_,loaded:p,total:m});for(let w=0,R=h.length;w<R;w++){const A=h[w];A.onProgress&&A.onProgress(b)}f.enqueue(y),x()}},v=>{f.error(v)})}}});return new Response(g)}else throw new gp(`fetch for "${l.url}" responded with ${l.status}: ${l.statusText}`,l)}).then(l=>{switch(c){case"arraybuffer":return l.arrayBuffer();case"blob":return l.blob();case"document":return l.text().then(h=>new DOMParser().parseFromString(h,a));case"json":return l.json();default:if(a==="")return l.text();{const u=/charset="?([^;"\s]*)"?/i.exec(a),d=u&&u[1]?u[1].toLowerCase():void 0,m=new TextDecoder(d);return l.arrayBuffer().then(_=>m.decode(_))}}}).then(l=>{Qn.add(`file:${e}`,l);const h=Kn[e];delete Kn[e];for(let u=0,d=h.length;u<d;u++){const m=h[u];m.onLoad&&m.onLoad(l)}}).catch(l=>{const h=Kn[e];if(h===void 0)throw this.manager.itemError(e),l;delete Kn[e];for(let u=0,d=h.length;u<d;u++){const m=h[u];m.onError&&m.onError(l)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const ns=new WeakMap;class _p extends Bi{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,o=Qn.get(`image:${e}`);if(o!==void 0){if(o.complete===!0)r.manager.itemStart(e),setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0);else{let u=ns.get(o);u===void 0&&(u=[],ns.set(o,u)),u.push({onLoad:t,onError:i})}return o}const a=nr("img");function c(){h(),t&&t(this);const u=ns.get(this)||[];for(let d=0;d<u.length;d++){const m=u[d];m.onLoad&&m.onLoad(this)}ns.delete(this),r.manager.itemEnd(e)}function l(u){h(),i&&i(u),Qn.remove(`image:${e}`);const d=ns.get(this)||[];for(let m=0;m<d.length;m++){const _=d[m];_.onError&&_.onError(u)}ns.delete(this),r.manager.itemError(e),r.manager.itemEnd(e)}function h(){a.removeEventListener("load",c,!1),a.removeEventListener("error",l,!1)}return a.addEventListener("load",c,!1),a.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),Qn.add(`image:${e}`,a),r.manager.itemStart(e),a.src=e,a}}class xp extends Bi{constructor(e){super(e)}load(e,t,n,i){const r=this,o=new fo,a=new Bc(this.manager);return a.setResponseType("arraybuffer"),a.setRequestHeader(this.requestHeader),a.setPath(this.path),a.setWithCredentials(r.withCredentials),a.load(e,function(c){let l;try{l=r.parse(c)}catch(h){if(i!==void 0)i(h);else{console.error(h);return}}l.image!==void 0?o.image=l.image:l.data!==void 0&&(o.image.width=l.width,o.image.height=l.height,o.image.data=l.data),o.wrapS=l.wrapS!==void 0?l.wrapS:cn,o.wrapT=l.wrapT!==void 0?l.wrapT:cn,o.magFilter=l.magFilter!==void 0?l.magFilter:Dt,o.minFilter=l.minFilter!==void 0?l.minFilter:Dt,o.anisotropy=l.anisotropy!==void 0?l.anisotropy:1,l.colorSpace!==void 0&&(o.colorSpace=l.colorSpace),l.flipY!==void 0&&(o.flipY=l.flipY),l.format!==void 0&&(o.format=l.format),l.type!==void 0&&(o.type=l.type),l.mipmaps!==void 0&&(o.mipmaps=l.mipmaps,o.minFilter=An),l.mipmapCount===1&&(o.minFilter=Dt),l.generateMipmaps!==void 0&&(o.generateMipmaps=l.generateMipmaps),o.needsUpdate=!0,t&&t(o,l)},n,i),o}}class wu extends Bi{constructor(e){super(e)}load(e,t,n,i){const r=new Ut,o=new _p(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(e,function(a){r.image=a,r.needsUpdate=!0,t!==void 0&&t(r)},n,i),r}}class mo extends ht{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new xe(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class vp extends mo{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(ht.DEFAULT_UP),this.updateMatrix(),this.groundColor=new xe(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const Jo=new ke,$l=new C,Zl=new C;class Hc{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new he(512,512),this.mapType=Bn,this.map=null,this.mapPass=null,this.matrix=new ke,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Lc,this._frameExtents=new he(1,1),this._viewportCount=1,this._viewports=[new it(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;$l.setFromMatrixPosition(e.matrixWorld),t.position.copy($l),Zl.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Zl),t.updateMatrixWorld(),Jo.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Jo,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Jo)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class yp extends Hc{constructor(){super(new Yt(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){const t=this.camera,n=xs*2*e.angle*this.focus,i=this.mapSize.width/this.mapSize.height*this.aspect,r=e.distance||t.far;(n!==t.fov||i!==t.aspect||r!==t.far)&&(t.fov=n,t.aspect=i,t.far=r,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}}class Mp extends mo{constructor(e,t,n=0,i=Math.PI/3,r=0,o=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(ht.DEFAULT_UP),this.updateMatrix(),this.target=new ht,this.distance=n,this.angle=i,this.penumbra=r,this.decay=o,this.map=null,this.shadow=new yp}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}const Jl=new ke,zs=new C,Qo=new C;class Sp extends Hc{constructor(){super(new Yt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new he(4,2),this._viewportCount=6,this._viewports=[new it(2,1,1,1),new it(0,1,1,1),new it(3,1,1,1),new it(1,1,1,1),new it(3,0,1,1),new it(1,0,1,1)],this._cubeDirections=[new C(1,0,0),new C(-1,0,0),new C(0,0,1),new C(0,0,-1),new C(0,1,0),new C(0,-1,0)],this._cubeUps=[new C(0,1,0),new C(0,1,0),new C(0,1,0),new C(0,1,0),new C(0,0,1),new C(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,i=this.matrix,r=e.distance||n.far;r!==n.far&&(n.far=r,n.updateProjectionMatrix()),zs.setFromMatrixPosition(e.matrixWorld),n.position.copy(zs),Qo.copy(n.position),Qo.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(Qo),n.updateMatrixWorld(),i.makeTranslation(-zs.x,-zs.y,-zs.z),Jl.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Jl,n.coordinateSystem,n.reversedDepth)}}class bp extends mo{constructor(e,t,n=0,i=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new Sp}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class Vc extends Rc{constructor(e=-1,t=1,n=1,i=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let r=n-e,o=n+e,a=i+t,c=i-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,o=r+l*this.view.width,a-=h*this.view.offsetY,c=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class wp extends Hc{constructor(){super(new Vc(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Eu extends mo{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(ht.DEFAULT_UP),this.updateMatrix(),this.target=new ht,this.shadow=new wp}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class js{static extractUrlBase(e){const t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}}const ea=new WeakMap;class Ep extends Bi{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&console.warn("THREE.ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,o=Qn.get(`image-bitmap:${e}`);if(o!==void 0){if(r.manager.itemStart(e),o.then){o.then(l=>{if(ea.has(o)===!0)i&&i(ea.get(o)),r.manager.itemError(e),r.manager.itemEnd(e);else return t&&t(l),r.manager.itemEnd(e),l});return}return setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0),o}const a={};a.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",a.headers=this.requestHeader,a.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;const c=fetch(e,a).then(function(l){return l.blob()}).then(function(l){return createImageBitmap(l,Object.assign(r.options,{colorSpaceConversion:"none"}))}).then(function(l){return Qn.add(`image-bitmap:${e}`,l),t&&t(l),r.manager.itemEnd(e),l}).catch(function(l){i&&i(l),ea.set(c,l),Qn.remove(`image-bitmap:${e}`),r.manager.itemError(e),r.manager.itemEnd(e)});Qn.add(`image-bitmap:${e}`,c),r.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}class Tp extends Yt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}const Gc="\\[\\]\\.:\\/",Ap=new RegExp("["+Gc+"]","g"),Wc="[^"+Gc+"]",Rp="[^"+Gc.replace("\\.","")+"]",Cp=/((?:WC+[\/:])*)/.source.replace("WC",Wc),Pp=/(WCOD+)?/.source.replace("WCOD",Rp),Lp=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Wc),Ip=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Wc),Dp=new RegExp("^"+Cp+Pp+Lp+Ip+"$"),Up=["material","materials","bones","map"];class Np{constructor(e,t,n){const i=n||lt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,i)}getValue(e,t){this.bind();const n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(e,t)}setValue(e,t){const n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,r=n.length;i!==r;++i)n[i].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}}class lt{constructor(e,t,n){this.path=t,this.parsedPath=n||lt.parseTrackName(t),this.node=lt.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new lt.Composite(e,t,n):new lt(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Ap,"")}static parseTrackName(e){const t=Dp.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);const n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){const r=n.nodeName.substring(i+1);Up.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,i),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){const n=function(r){for(let o=0;o<r.length;o++){const a=r[o];if(a.name===t||a.uuid===t)return a;const c=n(a.children);if(c)return c}return null},i=n(e.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){const n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)e[t++]=n[i]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,n=t.objectName,i=t.propertyName;let r=t.propertyIndex;if(e||(e=lt.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=t.objectIndex;switch(n){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===l){l=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(l!==void 0){if(e[l]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}const o=e[i];if(o===void 0){const l=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+l+"."+i+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?a=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(r!==void 0){if(i==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}lt.Composite=Np;lt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};lt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};lt.prototype.GetterByBindingType=[lt.prototype._getValue_direct,lt.prototype._getValue_array,lt.prototype._getValue_arrayElement,lt.prototype._getValue_toArray];lt.prototype.SetterByBindingTypeAndVersioning=[[lt.prototype._setValue_direct,lt.prototype._setValue_direct_setNeedsUpdate,lt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[lt.prototype._setValue_array,lt.prototype._setValue_array_setNeedsUpdate,lt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[lt.prototype._setValue_arrayElement,lt.prototype._setValue_arrayElement_setNeedsUpdate,lt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[lt.prototype._setValue_fromArray,lt.prototype._setValue_fromArray_setNeedsUpdate,lt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];function Ql(s,e,t,n){const i=Fp(n);switch(t){case nu:return s*e;case yc:return s*e/i.components*i.byteLength;case Mc:return s*e/i.components*i.byteLength;case su:return s*e*2/i.components*i.byteLength;case Sc:return s*e*2/i.components*i.byteLength;case iu:return s*e*3/i.components*i.byteLength;case ln:return s*e*4/i.components*i.byteLength;case bc:return s*e*4/i.components*i.byteLength;case Xr:case qr:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case Yr:case jr:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Ca:case La:return Math.max(s,16)*Math.max(e,8)/4;case Ra:case Pa:return Math.max(s,8)*Math.max(e,8)/2;case Ia:case Da:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case Ua:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Na:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case Fa:return Math.floor((s+4)/5)*Math.floor((e+3)/4)*16;case za:return Math.floor((s+4)/5)*Math.floor((e+4)/5)*16;case Oa:return Math.floor((s+5)/6)*Math.floor((e+4)/5)*16;case ka:return Math.floor((s+5)/6)*Math.floor((e+5)/6)*16;case Ba:return Math.floor((s+7)/8)*Math.floor((e+4)/5)*16;case Ha:return Math.floor((s+7)/8)*Math.floor((e+5)/6)*16;case Va:return Math.floor((s+7)/8)*Math.floor((e+7)/8)*16;case Ga:return Math.floor((s+9)/10)*Math.floor((e+4)/5)*16;case Wa:return Math.floor((s+9)/10)*Math.floor((e+5)/6)*16;case Xa:return Math.floor((s+9)/10)*Math.floor((e+7)/8)*16;case qa:return Math.floor((s+9)/10)*Math.floor((e+9)/10)*16;case Ya:return Math.floor((s+11)/12)*Math.floor((e+9)/10)*16;case ja:return Math.floor((s+11)/12)*Math.floor((e+11)/12)*16;case Ka:case $a:case Za:return Math.ceil(s/4)*Math.ceil(e/4)*16;case Ja:case Qa:return Math.ceil(s/4)*Math.ceil(e/4)*8;case ec:case tc:return Math.ceil(s/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Fp(s){switch(s){case Bn:case Jh:return{byteLength:1,components:1};case $s:case Qh:case Rn:return{byteLength:2,components:1};case xc:case vc:return{byteLength:2,components:4};case yi:case _c:case en:return{byteLength:4,components:1};case eu:case tu:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${s}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:gc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=gc);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Tu(){let s=null,e=!1,t=null,n=null;function i(r,o){t(r,o),n=s.requestAnimationFrame(i)}return{start:function(){e!==!0&&t!==null&&(n=s.requestAnimationFrame(i),e=!0)},stop:function(){s.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){s=r}}}function zp(s){const e=new WeakMap;function t(a,c){const l=a.array,h=a.usage,u=l.byteLength,d=s.createBuffer();s.bindBuffer(c,d),s.bufferData(c,l,h),a.onUploadCallback();let m;if(l instanceof Float32Array)m=s.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)m=s.HALF_FLOAT;else if(l instanceof Uint16Array)a.isFloat16BufferAttribute?m=s.HALF_FLOAT:m=s.UNSIGNED_SHORT;else if(l instanceof Int16Array)m=s.SHORT;else if(l instanceof Uint32Array)m=s.UNSIGNED_INT;else if(l instanceof Int32Array)m=s.INT;else if(l instanceof Int8Array)m=s.BYTE;else if(l instanceof Uint8Array)m=s.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)m=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:d,type:m,bytesPerElement:l.BYTES_PER_ELEMENT,version:a.version,size:u}}function n(a,c,l){const h=c.array,u=c.updateRanges;if(s.bindBuffer(l,a),u.length===0)s.bufferSubData(l,0,h);else{u.sort((m,_)=>m.start-_.start);let d=0;for(let m=1;m<u.length;m++){const _=u[d],p=u[m];p.start<=_.start+_.count+1?_.count=Math.max(_.count,p.start+p.count-_.start):(++d,u[d]=p)}u.length=d+1;for(let m=0,_=u.length;m<_;m++){const p=u[m];s.bufferSubData(l,p.start*h.BYTES_PER_ELEMENT,h,p.start,p.count)}c.clearUpdateRanges()}c.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const c=e.get(a);c&&(s.deleteBuffer(c.buffer),e.delete(a))}function o(a,c){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const l=e.get(a);if(l===void 0)e.set(a,t(a,c));else if(l.version<a.version){if(l.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,a,c),l.version=a.version}}return{get:i,remove:r,update:o}}var Op=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,kp=`#ifdef USE_ALPHAHASH
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
#endif`,Bp=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Hp=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Vp=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Gp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Wp=`#ifdef USE_AOMAP
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
#endif`,Xp=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,qp=`#ifdef USE_BATCHING
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
#endif`,Yp=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,jp=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Kp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,$p=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Zp=`#ifdef USE_IRIDESCENCE
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
#endif`,Jp=`#ifdef USE_BUMPMAP
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
#endif`,Qp=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,em=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,tm=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,nm=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,im=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,sm=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,rm=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,om=`#if defined( USE_COLOR_ALPHA )
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
#endif`,am=`#define PI 3.141592653589793
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
} // validated`,cm=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,lm=`vec3 transformedNormal = objectNormal;
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
#endif`,hm=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,um=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,dm=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,fm=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,pm="gl_FragColor = linearToOutputTexel( gl_FragColor );",mm=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,gm=`#ifdef USE_ENVMAP
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
#endif`,_m=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,xm=`#ifdef USE_ENVMAP
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
#endif`,vm=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,ym=`#ifdef USE_ENVMAP
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
#endif`,Mm=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Sm=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,bm=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,wm=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Em=`#ifdef USE_GRADIENTMAP
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
}`,Tm=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Am=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Rm=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Cm=`uniform bool receiveShadow;
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
#endif`,Pm=`#ifdef USE_ENVMAP
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
#endif`,Lm=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Im=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Dm=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Um=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Nm=`PhysicalMaterial material;
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
#endif`,Fm=`struct PhysicalMaterial {
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
}`,zm=`
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
#endif`,Om=`#if defined( RE_IndirectDiffuse )
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
#endif`,km=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Bm=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Hm=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Vm=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Gm=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Wm=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Xm=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,qm=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Ym=`#if defined( USE_POINTS_UV )
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
#endif`,jm=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Km=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,$m=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Zm=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Jm=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Qm=`#ifdef USE_MORPHTARGETS
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
#endif`,e0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,t0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,n0=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,i0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,s0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,r0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,o0=`#ifdef USE_NORMALMAP
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
#endif`,a0=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,c0=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,l0=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,h0=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,u0=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,d0=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,f0=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,p0=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,m0=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,g0=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,_0=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,x0=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,v0=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,y0=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,M0=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,S0=`float getShadowMask() {
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
}`,b0=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,w0=`#ifdef USE_SKINNING
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
#endif`,E0=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,T0=`#ifdef USE_SKINNING
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
#endif`,A0=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,R0=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,C0=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,P0=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,L0=`#ifdef USE_TRANSMISSION
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
#endif`,I0=`#ifdef USE_TRANSMISSION
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
#endif`,D0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,U0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,N0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,F0=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const z0=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,O0=`uniform sampler2D t2D;
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
}`,k0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,B0=`#ifdef ENVMAP_TYPE_CUBE
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
}`,H0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,V0=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,G0=`#include <common>
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
}`,W0=`#if DEPTH_PACKING == 3200
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
}`,X0=`#define DISTANCE
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
}`,q0=`#define DISTANCE
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
}`,Y0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,j0=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,K0=`uniform float scale;
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
}`,$0=`uniform vec3 diffuse;
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
}`,Z0=`#include <common>
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
}`,J0=`uniform vec3 diffuse;
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
}`,Q0=`#define LAMBERT
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
}`,eg=`#define LAMBERT
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
}`,tg=`#define MATCAP
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
}`,ng=`#define MATCAP
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
}`,ig=`#define NORMAL
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
}`,sg=`#define NORMAL
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
}`,rg=`#define PHONG
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
}`,og=`#define PHONG
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
}`,ag=`#define STANDARD
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
}`,cg=`#define STANDARD
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
}`,lg=`#define TOON
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
}`,hg=`#define TOON
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
}`,ug=`uniform float size;
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
}`,dg=`uniform vec3 diffuse;
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
}`,fg=`#include <common>
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
}`,pg=`uniform vec3 color;
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
}`,mg=`uniform float rotation;
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
}`,gg=`uniform vec3 diffuse;
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
}`,We={alphahash_fragment:Op,alphahash_pars_fragment:kp,alphamap_fragment:Bp,alphamap_pars_fragment:Hp,alphatest_fragment:Vp,alphatest_pars_fragment:Gp,aomap_fragment:Wp,aomap_pars_fragment:Xp,batching_pars_vertex:qp,batching_vertex:Yp,begin_vertex:jp,beginnormal_vertex:Kp,bsdfs:$p,iridescence_fragment:Zp,bumpmap_pars_fragment:Jp,clipping_planes_fragment:Qp,clipping_planes_pars_fragment:em,clipping_planes_pars_vertex:tm,clipping_planes_vertex:nm,color_fragment:im,color_pars_fragment:sm,color_pars_vertex:rm,color_vertex:om,common:am,cube_uv_reflection_fragment:cm,defaultnormal_vertex:lm,displacementmap_pars_vertex:hm,displacementmap_vertex:um,emissivemap_fragment:dm,emissivemap_pars_fragment:fm,colorspace_fragment:pm,colorspace_pars_fragment:mm,envmap_fragment:gm,envmap_common_pars_fragment:_m,envmap_pars_fragment:xm,envmap_pars_vertex:vm,envmap_physical_pars_fragment:Pm,envmap_vertex:ym,fog_vertex:Mm,fog_pars_vertex:Sm,fog_fragment:bm,fog_pars_fragment:wm,gradientmap_pars_fragment:Em,lightmap_pars_fragment:Tm,lights_lambert_fragment:Am,lights_lambert_pars_fragment:Rm,lights_pars_begin:Cm,lights_toon_fragment:Lm,lights_toon_pars_fragment:Im,lights_phong_fragment:Dm,lights_phong_pars_fragment:Um,lights_physical_fragment:Nm,lights_physical_pars_fragment:Fm,lights_fragment_begin:zm,lights_fragment_maps:Om,lights_fragment_end:km,logdepthbuf_fragment:Bm,logdepthbuf_pars_fragment:Hm,logdepthbuf_pars_vertex:Vm,logdepthbuf_vertex:Gm,map_fragment:Wm,map_pars_fragment:Xm,map_particle_fragment:qm,map_particle_pars_fragment:Ym,metalnessmap_fragment:jm,metalnessmap_pars_fragment:Km,morphinstance_vertex:$m,morphcolor_vertex:Zm,morphnormal_vertex:Jm,morphtarget_pars_vertex:Qm,morphtarget_vertex:e0,normal_fragment_begin:t0,normal_fragment_maps:n0,normal_pars_fragment:i0,normal_pars_vertex:s0,normal_vertex:r0,normalmap_pars_fragment:o0,clearcoat_normal_fragment_begin:a0,clearcoat_normal_fragment_maps:c0,clearcoat_pars_fragment:l0,iridescence_pars_fragment:h0,opaque_fragment:u0,packing:d0,premultiplied_alpha_fragment:f0,project_vertex:p0,dithering_fragment:m0,dithering_pars_fragment:g0,roughnessmap_fragment:_0,roughnessmap_pars_fragment:x0,shadowmap_pars_fragment:v0,shadowmap_pars_vertex:y0,shadowmap_vertex:M0,shadowmask_pars_fragment:S0,skinbase_vertex:b0,skinning_pars_vertex:w0,skinning_vertex:E0,skinnormal_vertex:T0,specularmap_fragment:A0,specularmap_pars_fragment:R0,tonemapping_fragment:C0,tonemapping_pars_fragment:P0,transmission_fragment:L0,transmission_pars_fragment:I0,uv_pars_fragment:D0,uv_pars_vertex:U0,uv_vertex:N0,worldpos_vertex:F0,background_vert:z0,background_frag:O0,backgroundCube_vert:k0,backgroundCube_frag:B0,cube_vert:H0,cube_frag:V0,depth_vert:G0,depth_frag:W0,distanceRGBA_vert:X0,distanceRGBA_frag:q0,equirect_vert:Y0,equirect_frag:j0,linedashed_vert:K0,linedashed_frag:$0,meshbasic_vert:Z0,meshbasic_frag:J0,meshlambert_vert:Q0,meshlambert_frag:eg,meshmatcap_vert:tg,meshmatcap_frag:ng,meshnormal_vert:ig,meshnormal_frag:sg,meshphong_vert:rg,meshphong_frag:og,meshphysical_vert:ag,meshphysical_frag:cg,meshtoon_vert:lg,meshtoon_frag:hg,points_vert:ug,points_frag:dg,shadow_vert:fg,shadow_frag:pg,sprite_vert:mg,sprite_frag:gg},ce={common:{diffuse:{value:new xe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new He},alphaMap:{value:null},alphaMapTransform:{value:new He},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new He}},envmap:{envMap:{value:null},envMapRotation:{value:new He},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new He}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new He}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new He},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new He},normalScale:{value:new he(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new He},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new He}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new He}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new He}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new xe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new xe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new He},alphaTest:{value:0},uvTransform:{value:new He}},sprite:{diffuse:{value:new xe(16777215)},opacity:{value:1},center:{value:new he(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new He},alphaMap:{value:null},alphaMapTransform:{value:new He},alphaTest:{value:0}}},Fn={basic:{uniforms:Zt([ce.common,ce.specularmap,ce.envmap,ce.aomap,ce.lightmap,ce.fog]),vertexShader:We.meshbasic_vert,fragmentShader:We.meshbasic_frag},lambert:{uniforms:Zt([ce.common,ce.specularmap,ce.envmap,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.fog,ce.lights,{emissive:{value:new xe(0)}}]),vertexShader:We.meshlambert_vert,fragmentShader:We.meshlambert_frag},phong:{uniforms:Zt([ce.common,ce.specularmap,ce.envmap,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.fog,ce.lights,{emissive:{value:new xe(0)},specular:{value:new xe(1118481)},shininess:{value:30}}]),vertexShader:We.meshphong_vert,fragmentShader:We.meshphong_frag},standard:{uniforms:Zt([ce.common,ce.envmap,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.roughnessmap,ce.metalnessmap,ce.fog,ce.lights,{emissive:{value:new xe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:We.meshphysical_vert,fragmentShader:We.meshphysical_frag},toon:{uniforms:Zt([ce.common,ce.aomap,ce.lightmap,ce.emissivemap,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.gradientmap,ce.fog,ce.lights,{emissive:{value:new xe(0)}}]),vertexShader:We.meshtoon_vert,fragmentShader:We.meshtoon_frag},matcap:{uniforms:Zt([ce.common,ce.bumpmap,ce.normalmap,ce.displacementmap,ce.fog,{matcap:{value:null}}]),vertexShader:We.meshmatcap_vert,fragmentShader:We.meshmatcap_frag},points:{uniforms:Zt([ce.points,ce.fog]),vertexShader:We.points_vert,fragmentShader:We.points_frag},dashed:{uniforms:Zt([ce.common,ce.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:We.linedashed_vert,fragmentShader:We.linedashed_frag},depth:{uniforms:Zt([ce.common,ce.displacementmap]),vertexShader:We.depth_vert,fragmentShader:We.depth_frag},normal:{uniforms:Zt([ce.common,ce.bumpmap,ce.normalmap,ce.displacementmap,{opacity:{value:1}}]),vertexShader:We.meshnormal_vert,fragmentShader:We.meshnormal_frag},sprite:{uniforms:Zt([ce.sprite,ce.fog]),vertexShader:We.sprite_vert,fragmentShader:We.sprite_frag},background:{uniforms:{uvTransform:{value:new He},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:We.background_vert,fragmentShader:We.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new He}},vertexShader:We.backgroundCube_vert,fragmentShader:We.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:We.cube_vert,fragmentShader:We.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:We.equirect_vert,fragmentShader:We.equirect_frag},distanceRGBA:{uniforms:Zt([ce.common,ce.displacementmap,{referencePosition:{value:new C},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:We.distanceRGBA_vert,fragmentShader:We.distanceRGBA_frag},shadow:{uniforms:Zt([ce.lights,ce.fog,{color:{value:new xe(0)},opacity:{value:1}}]),vertexShader:We.shadow_vert,fragmentShader:We.shadow_frag}};Fn.physical={uniforms:Zt([Fn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new He},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new He},clearcoatNormalScale:{value:new he(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new He},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new He},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new He},sheen:{value:0},sheenColor:{value:new xe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new He},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new He},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new He},transmissionSamplerSize:{value:new he},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new He},attenuationDistance:{value:0},attenuationColor:{value:new xe(0)},specularColor:{value:new xe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new He},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new He},anisotropyVector:{value:new he},anisotropyMap:{value:null},anisotropyMapTransform:{value:new He}}]),vertexShader:We.meshphysical_vert,fragmentShader:We.meshphysical_frag};const kr={r:0,b:0,g:0},Ri=new _n,_g=new ke;function xg(s,e,t,n,i,r,o){const a=new xe(0);let c=r===!0?0:1,l,h,u=null,d=0,m=null;function _(v){let y=v.isScene===!0?v.background:null;return y&&y.isTexture&&(y=(v.backgroundBlurriness>0?t:e).get(y)),y}function p(v){let y=!1;const b=_(v);b===null?f(a,c):b&&b.isColor&&(f(b,1),y=!0);const w=s.xr.getEnvironmentBlendMode();w==="additive"?n.buffers.color.setClear(0,0,0,1,o):w==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(s.autoClear||y)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function g(v,y){const b=_(y);b&&(b.isCubeTexture||b.mapping===ho)?(h===void 0&&(h=new rt(new ws(1,1,1),new tn({name:"BackgroundCubeMaterial",uniforms:vs(Fn.backgroundCube.uniforms),vertexShader:Fn.backgroundCube.vertexShader,fragmentShader:Fn.backgroundCube.fragmentShader,side:Vt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(w,R,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(h)),Ri.copy(y.backgroundRotation),Ri.x*=-1,Ri.y*=-1,Ri.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(Ri.y*=-1,Ri.z*=-1),h.material.uniforms.envMap.value=b,h.material.uniforms.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=y.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(_g.makeRotationFromEuler(Ri)),h.material.toneMapped=nt.getTransfer(b.colorSpace)!==dt,(u!==b||d!==b.version||m!==s.toneMapping)&&(h.material.needsUpdate=!0,u=b,d=b.version,m=s.toneMapping),h.layers.enableAll(),v.unshift(h,h.geometry,h.material,0,0,null)):b&&b.isTexture&&(l===void 0&&(l=new rt(new Mi(2,2),new tn({name:"BackgroundMaterial",uniforms:vs(Fn.background.uniforms),vertexShader:Fn.background.vertexShader,fragmentShader:Fn.background.fragmentShader,side:ni,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=b,l.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,l.material.toneMapped=nt.getTransfer(b.colorSpace)!==dt,b.matrixAutoUpdate===!0&&b.updateMatrix(),l.material.uniforms.uvTransform.value.copy(b.matrix),(u!==b||d!==b.version||m!==s.toneMapping)&&(l.material.needsUpdate=!0,u=b,d=b.version,m=s.toneMapping),l.layers.enableAll(),v.unshift(l,l.geometry,l.material,0,0,null))}function f(v,y){v.getRGB(kr,du(s)),n.buffers.color.setClear(kr.r,kr.g,kr.b,y,o)}function x(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(v,y=1){a.set(v),c=y,f(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(v){c=v,f(a,c)},render:p,addToRenderList:g,dispose:x}}function vg(s,e){const t=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=d(null);let r=i,o=!1;function a(S,L,I,N,U){let z=!1;const O=u(N,I,L);r!==O&&(r=O,l(r.object)),z=m(S,N,I,U),z&&_(S,N,I,U),U!==null&&e.update(U,s.ELEMENT_ARRAY_BUFFER),(z||o)&&(o=!1,y(S,L,I,N),U!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,e.get(U).buffer))}function c(){return s.createVertexArray()}function l(S){return s.bindVertexArray(S)}function h(S){return s.deleteVertexArray(S)}function u(S,L,I){const N=I.wireframe===!0;let U=n[S.id];U===void 0&&(U={},n[S.id]=U);let z=U[L.id];z===void 0&&(z={},U[L.id]=z);let O=z[N];return O===void 0&&(O=d(c()),z[N]=O),O}function d(S){const L=[],I=[],N=[];for(let U=0;U<t;U++)L[U]=0,I[U]=0,N[U]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:L,enabledAttributes:I,attributeDivisors:N,object:S,attributes:{},index:null}}function m(S,L,I,N){const U=r.attributes,z=L.attributes;let O=0;const G=I.getAttributes();for(const H in G)if(G[H].location>=0){const te=U[H];let le=z[H];if(le===void 0&&(H==="instanceMatrix"&&S.instanceMatrix&&(le=S.instanceMatrix),H==="instanceColor"&&S.instanceColor&&(le=S.instanceColor)),te===void 0||te.attribute!==le||le&&te.data!==le.data)return!0;O++}return r.attributesNum!==O||r.index!==N}function _(S,L,I,N){const U={},z=L.attributes;let O=0;const G=I.getAttributes();for(const H in G)if(G[H].location>=0){let te=z[H];te===void 0&&(H==="instanceMatrix"&&S.instanceMatrix&&(te=S.instanceMatrix),H==="instanceColor"&&S.instanceColor&&(te=S.instanceColor));const le={};le.attribute=te,te&&te.data&&(le.data=te.data),U[H]=le,O++}r.attributes=U,r.attributesNum=O,r.index=N}function p(){const S=r.newAttributes;for(let L=0,I=S.length;L<I;L++)S[L]=0}function g(S){f(S,0)}function f(S,L){const I=r.newAttributes,N=r.enabledAttributes,U=r.attributeDivisors;I[S]=1,N[S]===0&&(s.enableVertexAttribArray(S),N[S]=1),U[S]!==L&&(s.vertexAttribDivisor(S,L),U[S]=L)}function x(){const S=r.newAttributes,L=r.enabledAttributes;for(let I=0,N=L.length;I<N;I++)L[I]!==S[I]&&(s.disableVertexAttribArray(I),L[I]=0)}function v(S,L,I,N,U,z,O){O===!0?s.vertexAttribIPointer(S,L,I,U,z):s.vertexAttribPointer(S,L,I,N,U,z)}function y(S,L,I,N){p();const U=N.attributes,z=I.getAttributes(),O=L.defaultAttributeValues;for(const G in z){const H=z[G];if(H.location>=0){let J=U[G];if(J===void 0&&(G==="instanceMatrix"&&S.instanceMatrix&&(J=S.instanceMatrix),G==="instanceColor"&&S.instanceColor&&(J=S.instanceColor)),J!==void 0){const te=J.normalized,le=J.itemSize,ge=e.get(J);if(ge===void 0)continue;const ze=ge.buffer,ot=ge.type,tt=ge.bytesPerElement,j=ot===s.INT||ot===s.UNSIGNED_INT||J.gpuType===_c;if(J.isInterleavedBufferAttribute){const Q=J.data,pe=Q.stride,Ie=J.offset;if(Q.isInstancedInterleavedBuffer){for(let Se=0;Se<H.locationSize;Se++)f(H.location+Se,Q.meshPerAttribute);S.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let Se=0;Se<H.locationSize;Se++)g(H.location+Se);s.bindBuffer(s.ARRAY_BUFFER,ze);for(let Se=0;Se<H.locationSize;Se++)v(H.location+Se,le/H.locationSize,ot,te,pe*tt,(Ie+le/H.locationSize*Se)*tt,j)}else{if(J.isInstancedBufferAttribute){for(let Q=0;Q<H.locationSize;Q++)f(H.location+Q,J.meshPerAttribute);S.isInstancedMesh!==!0&&N._maxInstanceCount===void 0&&(N._maxInstanceCount=J.meshPerAttribute*J.count)}else for(let Q=0;Q<H.locationSize;Q++)g(H.location+Q);s.bindBuffer(s.ARRAY_BUFFER,ze);for(let Q=0;Q<H.locationSize;Q++)v(H.location+Q,le/H.locationSize,ot,te,le*tt,le/H.locationSize*Q*tt,j)}}else if(O!==void 0){const te=O[G];if(te!==void 0)switch(te.length){case 2:s.vertexAttrib2fv(H.location,te);break;case 3:s.vertexAttrib3fv(H.location,te);break;case 4:s.vertexAttrib4fv(H.location,te);break;default:s.vertexAttrib1fv(H.location,te)}}}}x()}function b(){A();for(const S in n){const L=n[S];for(const I in L){const N=L[I];for(const U in N)h(N[U].object),delete N[U];delete L[I]}delete n[S]}}function w(S){if(n[S.id]===void 0)return;const L=n[S.id];for(const I in L){const N=L[I];for(const U in N)h(N[U].object),delete N[U];delete L[I]}delete n[S.id]}function R(S){for(const L in n){const I=n[L];if(I[S.id]===void 0)continue;const N=I[S.id];for(const U in N)h(N[U].object),delete N[U];delete I[S.id]}}function A(){M(),o=!0,r!==i&&(r=i,l(r.object))}function M(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:A,resetDefaultState:M,dispose:b,releaseStatesOfGeometry:w,releaseStatesOfProgram:R,initAttributes:p,enableAttribute:g,disableUnusedAttributes:x}}function yg(s,e,t){let n;function i(l){n=l}function r(l,h){s.drawArrays(n,l,h),t.update(h,n,1)}function o(l,h,u){u!==0&&(s.drawArraysInstanced(n,l,h,u),t.update(h,n,u))}function a(l,h,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,h,0,u);let m=0;for(let _=0;_<u;_++)m+=h[_];t.update(m,n,1)}function c(l,h,u,d){if(u===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let _=0;_<l.length;_++)o(l[_],h[_],d[_]);else{m.multiDrawArraysInstancedWEBGL(n,l,0,h,0,d,0,u);let _=0;for(let p=0;p<u;p++)_+=h[p]*d[p];t.update(_,n,1)}}this.setMode=i,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=c}function Mg(s,e,t,n){let i;function r(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){const R=e.get("EXT_texture_filter_anisotropic");i=s.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(R){return!(R!==ln&&n.convert(R)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(R){const A=R===Rn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(R!==Bn&&n.convert(R)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&R!==en&&!A)}function c(R){if(R==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp";const h=c(l);h!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);const u=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),m=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),_=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),p=s.getParameter(s.MAX_TEXTURE_SIZE),g=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),f=s.getParameter(s.MAX_VERTEX_ATTRIBS),x=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),v=s.getParameter(s.MAX_VARYING_VECTORS),y=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),b=_>0,w=s.getParameter(s.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:a,precision:l,logarithmicDepthBuffer:u,reversedDepthBuffer:d,maxTextures:m,maxVertexTextures:_,maxTextureSize:p,maxCubemapSize:g,maxAttributes:f,maxVertexUniforms:x,maxVaryings:v,maxFragmentUniforms:y,vertexTextures:b,maxSamples:w}}function Sg(s){const e=this;let t=null,n=0,i=!1,r=!1;const o=new mi,a=new He,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){const m=u.length!==0||d||n!==0||i;return i=d,n=u.length,m},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){t=h(u,d,0)},this.setState=function(u,d,m){const _=u.clippingPlanes,p=u.clipIntersection,g=u.clipShadows,f=s.get(u);if(!i||_===null||_.length===0||r&&!g)r?h(null):l();else{const x=r?0:n,v=x*4;let y=f.clippingState||null;c.value=y,y=h(_,d,v,m);for(let b=0;b!==v;++b)y[b]=t[b];f.clippingState=y,this.numIntersection=p?this.numPlanes:0,this.numPlanes+=x}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,d,m,_){const p=u!==null?u.length:0;let g=null;if(p!==0){if(g=c.value,_!==!0||g===null){const f=m+p*4,x=d.matrixWorldInverse;a.getNormalMatrix(x),(g===null||g.length<f)&&(g=new Float32Array(f));for(let v=0,y=m;v!==p;++v,y+=4)o.copy(u[v]).applyMatrix4(x,a),o.normal.toArray(g,y),g[y+3]=o.constant}c.value=g,c.needsUpdate=!0}return e.numPlanes=p,e.numIntersection=0,g}}function bg(s){let e=new WeakMap;function t(o,a){return a===eo?o.mapping=gs:a===Aa&&(o.mapping=_s),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===eo||a===Aa)if(e.has(o)){const c=e.get(o).texture;return t(c,o.mapping)}else{const c=o.image;if(c&&c.height>0){const l=new Cf(c.height);return l.fromEquirectangularTexture(s,o),e.set(o,l),o.addEventListener("dispose",i),t(l.texture,o.mapping)}else return null}}return o}function i(o){const a=o.target;a.removeEventListener("dispose",i);const c=e.get(a);c!==void 0&&(e.delete(a),c.dispose())}function r(){e=new WeakMap}return{get:n,dispose:r}}const cs=4,eh=[.125,.215,.35,.446,.526,.582],Fi=20,ta=new Vc,th=new xe;let na=null,ia=0,sa=0,ra=!1;const Li=(1+Math.sqrt(5))/2,is=1/Li,nh=[new C(-Li,is,0),new C(Li,is,0),new C(-is,0,Li),new C(is,0,Li),new C(0,Li,-is),new C(0,Li,is),new C(-1,1,-1),new C(1,1,-1),new C(-1,1,1),new C(1,1,1)],wg=new C;class ih{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,i=100,r={}){const{size:o=256,position:a=wg}=r;na=this._renderer.getRenderTarget(),ia=this._renderer.getActiveCubeFace(),sa=this._renderer.getActiveMipmapLevel(),ra=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,n,i,c,a),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=oh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=rh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(na,ia,sa),this._renderer.xr.enabled=ra,e.scissorTest=!1,Br(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===gs||e.mapping===_s?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),na=this._renderer.getRenderTarget(),ia=this._renderer.getActiveCubeFace(),sa=this._renderer.getActiveMipmapLevel(),ra=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Dt,minFilter:Dt,generateMipmaps:!1,type:Rn,format:ln,colorSpace:jt,depthBuffer:!1},i=sh(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=sh(e,t,n);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Eg(r)),this._blurMaterial=Tg(r,e,t)}return i}_compileMaterial(e){const t=new rt(this._lodPlanes[0],e);this._renderer.compile(t,ta)}_sceneToCubeUV(e,t,n,i,r){const c=new Yt(90,1,t,n),l=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,d=u.autoClear,m=u.toneMapping;u.getClearColor(th),u.toneMapping=_i,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(i),u.clearDepth(),u.setRenderTarget(null));const p=new zi({name:"PMREM.Background",side:Vt,depthWrite:!1,depthTest:!1}),g=new rt(new ws,p);let f=!1;const x=e.background;x?x.isColor&&(p.color.copy(x),e.background=null,f=!0):(p.color.copy(th),f=!0);for(let v=0;v<6;v++){const y=v%3;y===0?(c.up.set(0,l[v],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x+h[v],r.y,r.z)):y===1?(c.up.set(0,0,l[v]),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y+h[v],r.z)):(c.up.set(0,l[v],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y,r.z+h[v]));const b=this._cubeSize;Br(i,y*b,v>2?b:0,b,b),u.setRenderTarget(i),f&&u.render(g,c),u.render(e,c)}g.geometry.dispose(),g.material.dispose(),u.toneMapping=m,u.autoClear=d,e.background=x}_textureToCubeUV(e,t){const n=this._renderer,i=e.mapping===gs||e.mapping===_s;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=oh()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=rh());const r=i?this._cubemapMaterial:this._equirectMaterial,o=new rt(this._lodPlanes[0],r),a=r.uniforms;a.envMap.value=e;const c=this._cubeSize;Br(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(o,ta)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const i=this._lodPlanes.length;for(let r=1;r<i;r++){const o=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=nh[(i-r-1)%nh.length];this._blur(e,r-1,r,o,a)}t.autoClear=n}_blur(e,t,n,i,r){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,i,"latitudinal",r),this._halfBlur(o,e,n,n,i,"longitudinal",r)}_halfBlur(e,t,n,i,r,o,a){const c=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,u=new rt(this._lodPlanes[i],l),d=l.uniforms,m=this._sizeLods[n]-1,_=isFinite(r)?Math.PI/(2*m):2*Math.PI/(2*Fi-1),p=r/_,g=isFinite(r)?1+Math.floor(h*p):Fi;g>Fi&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${Fi}`);const f=[];let x=0;for(let R=0;R<Fi;++R){const A=R/p,M=Math.exp(-A*A/2);f.push(M),R===0?x+=M:R<g&&(x+=2*M)}for(let R=0;R<f.length;R++)f[R]=f[R]/x;d.envMap.value=e.texture,d.samples.value=g,d.weights.value=f,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);const{_lodMax:v}=this;d.dTheta.value=_,d.mipInt.value=v-n;const y=this._sizeLods[i],b=3*y*(i>v-cs?i-v+cs:0),w=4*(this._cubeSize-y);Br(t,b,w,3*y,2*y),c.setRenderTarget(t),c.render(u,ta)}}function Eg(s){const e=[],t=[],n=[];let i=s;const r=s-cs+1+eh.length;for(let o=0;o<r;o++){const a=Math.pow(2,i);t.push(a);let c=1/a;o>s-cs?c=eh[o-s+cs-1]:o===0&&(c=0),n.push(c);const l=1/(a-2),h=-l,u=1+l,d=[h,h,u,h,u,u,h,h,u,u,h,u],m=6,_=6,p=3,g=2,f=1,x=new Float32Array(p*_*m),v=new Float32Array(g*_*m),y=new Float32Array(f*_*m);for(let w=0;w<m;w++){const R=w%3*2/3-1,A=w>2?0:-1,M=[R,A,0,R+2/3,A,0,R+2/3,A+1,0,R,A,0,R+2/3,A+1,0,R,A+1,0];x.set(M,p*_*w),v.set(d,g*_*w);const S=[w,w,w,w,w,w];y.set(S,f*_*w)}const b=new At;b.setAttribute("position",new wt(x,p)),b.setAttribute("uv",new wt(v,g)),b.setAttribute("faceIndex",new wt(y,f)),e.push(b),i>cs&&i--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function sh(s,e,t){const n=new si(s,e,t);return n.texture.mapping=ho,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Br(s,e,t,n,i){s.viewport.set(e,t,n,i),s.scissor.set(e,t,n,i)}function Tg(s,e,t){const n=new Float32Array(Fi),i=new C(0,1,0);return new tn({name:"SphericalGaussianBlur",defines:{n:Fi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:Xc(),fragmentShader:`

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
		`,blending:gi,depthTest:!1,depthWrite:!1})}function rh(){return new tn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Xc(),fragmentShader:`

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
		`,blending:gi,depthTest:!1,depthWrite:!1})}function oh(){return new tn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Xc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:gi,depthTest:!1,depthWrite:!1})}function Xc(){return`

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
	`}function Ag(s){let e=new WeakMap,t=null;function n(a){if(a&&a.isTexture){const c=a.mapping,l=c===eo||c===Aa,h=c===gs||c===_s;if(l||h){let u=e.get(a);const d=u!==void 0?u.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==d)return t===null&&(t=new ih(s)),u=l?t.fromEquirectangular(a,u):t.fromCubemap(a,u),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),u.texture;if(u!==void 0)return u.texture;{const m=a.image;return l&&m&&m.height>0||h&&m&&i(m)?(t===null&&(t=new ih(s)),u=l?t.fromEquirectangular(a):t.fromCubemap(a),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),a.addEventListener("dispose",r),u.texture):null}}}return a}function i(a){let c=0;const l=6;for(let h=0;h<l;h++)a[h]!==void 0&&c++;return c===l}function r(a){const c=a.target;c.removeEventListener("dispose",r);const l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:o}}function Rg(s){const e={};function t(n){if(e[n]!==void 0)return e[n];let i;switch(n){case"WEBGL_depth_texture":i=s.getExtension("WEBGL_depth_texture")||s.getExtension("MOZ_WEBGL_depth_texture")||s.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":i=s.getExtension("EXT_texture_filter_anisotropic")||s.getExtension("MOZ_EXT_texture_filter_anisotropic")||s.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":i=s.getExtension("WEBGL_compressed_texture_s3tc")||s.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":i=s.getExtension("WEBGL_compressed_texture_pvrtc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:i=s.getExtension(n)}return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const i=t(n);return i===null&&ir("THREE.WebGLRenderer: "+n+" extension not supported."),i}}}function Cg(s,e,t,n){const i={},r=new WeakMap;function o(u){const d=u.target;d.index!==null&&e.remove(d.index);for(const _ in d.attributes)e.remove(d.attributes[_]);d.removeEventListener("dispose",o),delete i[d.id];const m=r.get(d);m&&(e.remove(m),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function a(u,d){return i[d.id]===!0||(d.addEventListener("dispose",o),i[d.id]=!0,t.memory.geometries++),d}function c(u){const d=u.attributes;for(const m in d)e.update(d[m],s.ARRAY_BUFFER)}function l(u){const d=[],m=u.index,_=u.attributes.position;let p=0;if(m!==null){const x=m.array;p=m.version;for(let v=0,y=x.length;v<y;v+=3){const b=x[v+0],w=x[v+1],R=x[v+2];d.push(b,w,w,R,R,b)}}else if(_!==void 0){const x=_.array;p=_.version;for(let v=0,y=x.length/3-1;v<y;v+=3){const b=v+0,w=v+1,R=v+2;d.push(b,w,w,R,R,b)}}else return;const g=new(cu(d)?Ac:Tc)(d,1);g.version=p;const f=r.get(u);f&&e.remove(f),r.set(u,g)}function h(u){const d=r.get(u);if(d){const m=u.index;m!==null&&d.version<m.version&&l(u)}else l(u);return r.get(u)}return{get:a,update:c,getWireframeAttribute:h}}function Pg(s,e,t){let n;function i(d){n=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function c(d,m){s.drawElements(n,m,r,d*o),t.update(m,n,1)}function l(d,m,_){_!==0&&(s.drawElementsInstanced(n,m,r,d*o,_),t.update(m,n,_))}function h(d,m,_){if(_===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,m,0,r,d,0,_);let g=0;for(let f=0;f<_;f++)g+=m[f];t.update(g,n,1)}function u(d,m,_,p){if(_===0)return;const g=e.get("WEBGL_multi_draw");if(g===null)for(let f=0;f<d.length;f++)l(d[f]/o,m[f],p[f]);else{g.multiDrawElementsInstancedWEBGL(n,m,0,r,d,0,p,0,_);let f=0;for(let x=0;x<_;x++)f+=m[x]*p[x];t.update(f,n,1)}}this.setMode=i,this.setIndex=a,this.render=c,this.renderInstances=l,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function Lg(s){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case s.TRIANGLES:t.triangles+=a*(r/3);break;case s.LINES:t.lines+=a*(r/2);break;case s.LINE_STRIP:t.lines+=a*(r-1);break;case s.LINE_LOOP:t.lines+=a*r;break;case s.POINTS:t.points+=a*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function i(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function Ig(s,e,t){const n=new WeakMap,i=new it;function r(o,a,c){const l=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0;let d=n.get(a);if(d===void 0||d.count!==u){let M=function(){R.dispose(),n.delete(a),a.removeEventListener("dispose",M)};d!==void 0&&d.texture.dispose();const m=a.morphAttributes.position!==void 0,_=a.morphAttributes.normal!==void 0,p=a.morphAttributes.color!==void 0,g=a.morphAttributes.position||[],f=a.morphAttributes.normal||[],x=a.morphAttributes.color||[];let v=0;m===!0&&(v=1),_===!0&&(v=2),p===!0&&(v=3);let y=a.attributes.position.count*v,b=1;y>e.maxTextureSize&&(b=Math.ceil(y/e.maxTextureSize),y=e.maxTextureSize);const w=new Float32Array(y*b*4*u),R=new lu(w,y,b,u);R.type=en,R.needsUpdate=!0;const A=v*4;for(let S=0;S<u;S++){const L=g[S],I=f[S],N=x[S],U=y*b*4*S;for(let z=0;z<L.count;z++){const O=z*A;m===!0&&(i.fromBufferAttribute(L,z),w[U+O+0]=i.x,w[U+O+1]=i.y,w[U+O+2]=i.z,w[U+O+3]=0),_===!0&&(i.fromBufferAttribute(I,z),w[U+O+4]=i.x,w[U+O+5]=i.y,w[U+O+6]=i.z,w[U+O+7]=0),p===!0&&(i.fromBufferAttribute(N,z),w[U+O+8]=i.x,w[U+O+9]=i.y,w[U+O+10]=i.z,w[U+O+11]=N.itemSize===4?i.w:1)}}d={count:u,texture:R,size:new he(y,b)},n.set(a,d),a.addEventListener("dispose",M)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(s,"morphTexture",o.morphTexture,t);else{let m=0;for(let p=0;p<l.length;p++)m+=l[p];const _=a.morphTargetsRelative?1:1-m;c.getUniforms().setValue(s,"morphTargetBaseInfluence",_),c.getUniforms().setValue(s,"morphTargetInfluences",l)}c.getUniforms().setValue(s,"morphTargetsTexture",d.texture,t),c.getUniforms().setValue(s,"morphTargetsTextureSize",d.size)}return{update:r}}function Dg(s,e,t,n){let i=new WeakMap;function r(c){const l=n.render.frame,h=c.geometry,u=e.get(c,h);if(i.get(u)!==l&&(e.update(u),i.set(u,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),i.get(c)!==l&&(t.update(c.instanceMatrix,s.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,s.ARRAY_BUFFER),i.set(c,l))),c.isSkinnedMesh){const d=c.skeleton;i.get(d)!==l&&(d.update(),i.set(d,l))}return u}function o(){i=new WeakMap}function a(c){const l=c.target;l.removeEventListener("dispose",a),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:r,dispose:o}}const Au=new Ut,ah=new Uc(1,1),Ru=new lu,Cu=new hf,Pu=new pu,ch=[],lh=[],hh=new Float32Array(16),uh=new Float32Array(9),dh=new Float32Array(4);function As(s,e,t){const n=s[0];if(n<=0||n>0)return s;const i=e*t;let r=ch[i];if(r===void 0&&(r=new Float32Array(i),ch[i]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,s[o].toArray(r,a)}return r}function Nt(s,e){if(s.length!==e.length)return!1;for(let t=0,n=s.length;t<n;t++)if(s[t]!==e[t])return!1;return!0}function Ft(s,e){for(let t=0,n=e.length;t<n;t++)s[t]=e[t]}function go(s,e){let t=lh[e];t===void 0&&(t=new Int32Array(e),lh[e]=t);for(let n=0;n!==e;++n)t[n]=s.allocateTextureUnit();return t}function Ug(s,e){const t=this.cache;t[0]!==e&&(s.uniform1f(this.addr,e),t[0]=e)}function Ng(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Nt(t,e))return;s.uniform2fv(this.addr,e),Ft(t,e)}}function Fg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(s.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Nt(t,e))return;s.uniform3fv(this.addr,e),Ft(t,e)}}function zg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Nt(t,e))return;s.uniform4fv(this.addr,e),Ft(t,e)}}function Og(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Nt(t,e))return;s.uniformMatrix2fv(this.addr,!1,e),Ft(t,e)}else{if(Nt(t,n))return;dh.set(n),s.uniformMatrix2fv(this.addr,!1,dh),Ft(t,n)}}function kg(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Nt(t,e))return;s.uniformMatrix3fv(this.addr,!1,e),Ft(t,e)}else{if(Nt(t,n))return;uh.set(n),s.uniformMatrix3fv(this.addr,!1,uh),Ft(t,n)}}function Bg(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Nt(t,e))return;s.uniformMatrix4fv(this.addr,!1,e),Ft(t,e)}else{if(Nt(t,n))return;hh.set(n),s.uniformMatrix4fv(this.addr,!1,hh),Ft(t,n)}}function Hg(s,e){const t=this.cache;t[0]!==e&&(s.uniform1i(this.addr,e),t[0]=e)}function Vg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Nt(t,e))return;s.uniform2iv(this.addr,e),Ft(t,e)}}function Gg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Nt(t,e))return;s.uniform3iv(this.addr,e),Ft(t,e)}}function Wg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Nt(t,e))return;s.uniform4iv(this.addr,e),Ft(t,e)}}function Xg(s,e){const t=this.cache;t[0]!==e&&(s.uniform1ui(this.addr,e),t[0]=e)}function qg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Nt(t,e))return;s.uniform2uiv(this.addr,e),Ft(t,e)}}function Yg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Nt(t,e))return;s.uniform3uiv(this.addr,e),Ft(t,e)}}function jg(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Nt(t,e))return;s.uniform4uiv(this.addr,e),Ft(t,e)}}function Kg(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let r;this.type===s.SAMPLER_2D_SHADOW?(ah.compareFunction=au,r=ah):r=Au,t.setTexture2D(e||r,i)}function $g(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||Cu,i)}function Zg(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTextureCube(e||Pu,i)}function Jg(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||Ru,i)}function Qg(s){switch(s){case 5126:return Ug;case 35664:return Ng;case 35665:return Fg;case 35666:return zg;case 35674:return Og;case 35675:return kg;case 35676:return Bg;case 5124:case 35670:return Hg;case 35667:case 35671:return Vg;case 35668:case 35672:return Gg;case 35669:case 35673:return Wg;case 5125:return Xg;case 36294:return qg;case 36295:return Yg;case 36296:return jg;case 35678:case 36198:case 36298:case 36306:case 35682:return Kg;case 35679:case 36299:case 36307:return $g;case 35680:case 36300:case 36308:case 36293:return Zg;case 36289:case 36303:case 36311:case 36292:return Jg}}function e_(s,e){s.uniform1fv(this.addr,e)}function t_(s,e){const t=As(e,this.size,2);s.uniform2fv(this.addr,t)}function n_(s,e){const t=As(e,this.size,3);s.uniform3fv(this.addr,t)}function i_(s,e){const t=As(e,this.size,4);s.uniform4fv(this.addr,t)}function s_(s,e){const t=As(e,this.size,4);s.uniformMatrix2fv(this.addr,!1,t)}function r_(s,e){const t=As(e,this.size,9);s.uniformMatrix3fv(this.addr,!1,t)}function o_(s,e){const t=As(e,this.size,16);s.uniformMatrix4fv(this.addr,!1,t)}function a_(s,e){s.uniform1iv(this.addr,e)}function c_(s,e){s.uniform2iv(this.addr,e)}function l_(s,e){s.uniform3iv(this.addr,e)}function h_(s,e){s.uniform4iv(this.addr,e)}function u_(s,e){s.uniform1uiv(this.addr,e)}function d_(s,e){s.uniform2uiv(this.addr,e)}function f_(s,e){s.uniform3uiv(this.addr,e)}function p_(s,e){s.uniform4uiv(this.addr,e)}function m_(s,e,t){const n=this.cache,i=e.length,r=go(t,i);Nt(n,r)||(s.uniform1iv(this.addr,r),Ft(n,r));for(let o=0;o!==i;++o)t.setTexture2D(e[o]||Au,r[o])}function g_(s,e,t){const n=this.cache,i=e.length,r=go(t,i);Nt(n,r)||(s.uniform1iv(this.addr,r),Ft(n,r));for(let o=0;o!==i;++o)t.setTexture3D(e[o]||Cu,r[o])}function __(s,e,t){const n=this.cache,i=e.length,r=go(t,i);Nt(n,r)||(s.uniform1iv(this.addr,r),Ft(n,r));for(let o=0;o!==i;++o)t.setTextureCube(e[o]||Pu,r[o])}function x_(s,e,t){const n=this.cache,i=e.length,r=go(t,i);Nt(n,r)||(s.uniform1iv(this.addr,r),Ft(n,r));for(let o=0;o!==i;++o)t.setTexture2DArray(e[o]||Ru,r[o])}function v_(s){switch(s){case 5126:return e_;case 35664:return t_;case 35665:return n_;case 35666:return i_;case 35674:return s_;case 35675:return r_;case 35676:return o_;case 5124:case 35670:return a_;case 35667:case 35671:return c_;case 35668:case 35672:return l_;case 35669:case 35673:return h_;case 5125:return u_;case 36294:return d_;case 36295:return f_;case 36296:return p_;case 35678:case 36198:case 36298:case 36306:case 35682:return m_;case 35679:case 36299:case 36307:return g_;case 35680:case 36300:case 36308:case 36293:return __;case 36289:case 36303:case 36311:case 36292:return x_}}class y_{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Qg(t.type)}}class M_{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=v_(t.type)}}class S_{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const i=this.seq;for(let r=0,o=i.length;r!==o;++r){const a=i[r];a.setValue(e,t[a.id],n)}}}const oa=/(\w+)(\])?(\[|\.)?/g;function fh(s,e){s.seq.push(e),s.map[e.id]=e}function b_(s,e,t){const n=s.name,i=n.length;for(oa.lastIndex=0;;){const r=oa.exec(n),o=oa.lastIndex;let a=r[1];const c=r[2]==="]",l=r[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===i){fh(t,l===void 0?new y_(a,s,e):new M_(a,s,e));break}else{let u=t.map[a];u===void 0&&(u=new S_(a),fh(t,u)),t=u}}}class Kr{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const r=e.getActiveUniform(t,i),o=e.getUniformLocation(t,r.name);b_(r,o,this)}}setValue(e,t,n,i){const r=this.map[t];r!==void 0&&r.setValue(e,n,i)}setOptional(e,t,n){const i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let r=0,o=t.length;r!==o;++r){const a=t[r],c=n[a.id];c.needsUpdate!==!1&&a.setValue(e,c.value,i)}}static seqWithValue(e,t){const n=[];for(let i=0,r=e.length;i!==r;++i){const o=e[i];o.id in t&&n.push(o)}return n}}function ph(s,e,t){const n=s.createShader(e);return s.shaderSource(n,t),s.compileShader(n),n}const w_=37297;let E_=0;function T_(s,e){const t=s.split(`
`),n=[],i=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=i;o<r;o++){const a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}const mh=new He;function A_(s){nt._getMatrix(mh,nt.workingColorSpace,s);const e=`mat3( ${mh.elements.map(t=>t.toFixed(4))} )`;switch(nt.getTransfer(s)){case no:return[e,"LinearTransferOETF"];case dt:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",s),[e,"LinearTransferOETF"]}}function gh(s,e,t){const n=s.getShaderParameter(e,s.COMPILE_STATUS),r=(s.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+T_(s.getShaderSource(e),a)}else return r}function R_(s,e){const t=A_(e);return[`vec4 ${s}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function C_(s,e){let t;switch(e){case yd:t="Linear";break;case Md:t="Reinhard";break;case Sd:t="Cineon";break;case Kh:t="ACESFilmic";break;case wd:t="AgX";break;case Ed:t="Neutral";break;case bd:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+s+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Hr=new C;function P_(){nt.getLuminanceCoefficients(Hr);const s=Hr.x.toFixed(4),e=Hr.y.toFixed(4),t=Hr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function L_(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Vs).join(`
`)}function I_(s){const e=[];for(const t in s){const n=s[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function D_(s,e){const t={},n=s.getProgramParameter(e,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const r=s.getActiveAttrib(e,i),o=r.name;let a=1;r.type===s.FLOAT_MAT2&&(a=2),r.type===s.FLOAT_MAT3&&(a=3),r.type===s.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:s.getAttribLocation(e,o),locationSize:a}}return t}function Vs(s){return s!==""}function _h(s,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function xh(s,e){return s.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const U_=/^[ \t]*#include +<([\w\d./]+)>/gm;function cc(s){return s.replace(U_,F_)}const N_=new Map;function F_(s,e){let t=We[e];if(t===void 0){const n=N_.get(e);if(n!==void 0)t=We[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return cc(t)}const z_=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function vh(s){return s.replace(z_,O_)}function O_(s,e,t,n){let i="";for(let r=parseInt(e);r<parseInt(t);r++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return i}function yh(s){let e=`precision ${s.precision} float;
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
#define LOW_PRECISION`),e}function k_(s){let e="SHADOWMAP_TYPE_BASIC";return s.shadowMapType===qh?e="SHADOWMAP_TYPE_PCF":s.shadowMapType===Yh?e="SHADOWMAP_TYPE_PCF_SOFT":s.shadowMapType===$n&&(e="SHADOWMAP_TYPE_VSM"),e}function B_(s){let e="ENVMAP_TYPE_CUBE";if(s.envMap)switch(s.envMapMode){case gs:case _s:e="ENVMAP_TYPE_CUBE";break;case ho:e="ENVMAP_TYPE_CUBE_UV";break}return e}function H_(s){let e="ENVMAP_MODE_REFLECTION";if(s.envMap)switch(s.envMapMode){case _s:e="ENVMAP_MODE_REFRACTION";break}return e}function V_(s){let e="ENVMAP_BLENDING_NONE";if(s.envMap)switch(s.combine){case jh:e="ENVMAP_BLENDING_MULTIPLY";break;case xd:e="ENVMAP_BLENDING_MIX";break;case vd:e="ENVMAP_BLENDING_ADD";break}return e}function G_(s){const e=s.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function W_(s,e,t,n){const i=s.getContext(),r=t.defines;let o=t.vertexShader,a=t.fragmentShader;const c=k_(t),l=B_(t),h=H_(t),u=V_(t),d=G_(t),m=L_(t),_=I_(r),p=i.createProgram();let g,f,x=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_].filter(Vs).join(`
`),g.length>0&&(g+=`
`),f=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_].filter(Vs).join(`
`),f.length>0&&(f+=`
`)):(g=[yh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Vs).join(`
`),f=[yh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,_,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==_i?"#define TONE_MAPPING":"",t.toneMapping!==_i?We.tonemapping_pars_fragment:"",t.toneMapping!==_i?C_("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",We.colorspace_pars_fragment,R_("linearToOutputTexel",t.outputColorSpace),P_(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Vs).join(`
`)),o=cc(o),o=_h(o,t),o=xh(o,t),a=cc(a),a=_h(a,t),a=xh(a,t),o=vh(o),a=vh(a),t.isRawShaderMaterial!==!0&&(x=`#version 300 es
`,g=[m,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,f=["#define varying in",t.glslVersion===pl?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===pl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+f);const v=x+g+o,y=x+f+a,b=ph(i,i.VERTEX_SHADER,v),w=ph(i,i.FRAGMENT_SHADER,y);i.attachShader(p,b),i.attachShader(p,w),t.index0AttributeName!==void 0?i.bindAttribLocation(p,0,t.index0AttributeName):t.morphTargets===!0&&i.bindAttribLocation(p,0,"position"),i.linkProgram(p);function R(L){if(s.debug.checkShaderErrors){const I=i.getProgramInfoLog(p)||"",N=i.getShaderInfoLog(b)||"",U=i.getShaderInfoLog(w)||"",z=I.trim(),O=N.trim(),G=U.trim();let H=!0,J=!0;if(i.getProgramParameter(p,i.LINK_STATUS)===!1)if(H=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,p,b,w);else{const te=gh(i,b,"vertex"),le=gh(i,w,"fragment");console.error("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(p,i.VALIDATE_STATUS)+`

Material Name: `+L.name+`
Material Type: `+L.type+`

Program Info Log: `+z+`
`+te+`
`+le)}else z!==""?console.warn("THREE.WebGLProgram: Program Info Log:",z):(O===""||G==="")&&(J=!1);J&&(L.diagnostics={runnable:H,programLog:z,vertexShader:{log:O,prefix:g},fragmentShader:{log:G,prefix:f}})}i.deleteShader(b),i.deleteShader(w),A=new Kr(i,p),M=D_(i,p)}let A;this.getUniforms=function(){return A===void 0&&R(this),A};let M;this.getAttributes=function(){return M===void 0&&R(this),M};let S=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return S===!1&&(S=i.getProgramParameter(p,w_)),S},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(p),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=E_++,this.cacheKey=e,this.usedTimes=1,this.program=p,this.vertexShader=b,this.fragmentShader=w,this}let X_=0;class q_{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,i=this._getShaderStage(t),r=this._getShaderStage(n),o=this._getShaderCacheForMaterial(e);return o.has(i)===!1&&(o.add(i),i.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new Y_(e),t.set(e,n)),n}}class Y_{constructor(e){this.id=X_++,this.code=e,this.usedTimes=0}}function j_(s,e,t,n,i,r,o){const a=new hu,c=new q_,l=new Set,h=[],u=i.logarithmicDepthBuffer,d=i.vertexTextures;let m=i.precision;const _={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function p(M){return l.add(M),M===0?"uv":`uv${M}`}function g(M,S,L,I,N){const U=I.fog,z=N.geometry,O=M.isMeshStandardMaterial?I.environment:null,G=(M.isMeshStandardMaterial?t:e).get(M.envMap||O),H=G&&G.mapping===ho?G.image.height:null,J=_[M.type];M.precision!==null&&(m=i.getMaxPrecision(M.precision),m!==M.precision&&console.warn("THREE.WebGLProgram.getParameters:",M.precision,"not supported, using",m,"instead."));const te=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,le=te!==void 0?te.length:0;let ge=0;z.morphAttributes.position!==void 0&&(ge=1),z.morphAttributes.normal!==void 0&&(ge=2),z.morphAttributes.color!==void 0&&(ge=3);let ze,ot,tt,j;if(J){const at=Fn[J];ze=at.vertexShader,ot=at.fragmentShader}else ze=M.vertexShader,ot=M.fragmentShader,c.update(M),tt=c.getVertexShaderID(M),j=c.getFragmentShaderID(M);const Q=s.getRenderTarget(),pe=s.state.buffers.depth.getReversed(),Ie=N.isInstancedMesh===!0,Se=N.isBatchedMesh===!0,Ye=!!M.map,Lt=!!M.matcap,D=!!G,gt=!!M.aoMap,Oe=!!M.lightMap,De=!!M.bumpMap,ve=!!M.normalMap,pt=!!M.displacementMap,K=!!M.emissiveMap,Re=!!M.metalnessMap,Je=!!M.roughnessMap,$e=M.anisotropy>0,P=M.clearcoat>0,E=M.dispersion>0,V=M.iridescence>0,q=M.sheen>0,ee=M.transmission>0,Y=$e&&!!M.anisotropyMap,Te=P&&!!M.clearcoatMap,oe=P&&!!M.clearcoatNormalMap,be=P&&!!M.clearcoatRoughnessMap,we=V&&!!M.iridescenceMap,se=V&&!!M.iridescenceThicknessMap,fe=q&&!!M.sheenColorMap,Ne=q&&!!M.sheenRoughnessMap,Ee=!!M.specularMap,ue=!!M.specularColorMap,Ge=!!M.specularIntensityMap,F=ee&&!!M.transmissionMap,re=ee&&!!M.thicknessMap,ae=!!M.gradientMap,_e=!!M.alphaMap,ne=M.alphaTest>0,$=!!M.alphaHash,Me=!!M.extensions;let Be=_i;M.toneMapped&&(Q===null||Q.isXRRenderTarget===!0)&&(Be=s.toneMapping);const _t={shaderID:J,shaderType:M.type,shaderName:M.name,vertexShader:ze,fragmentShader:ot,defines:M.defines,customVertexShaderID:tt,customFragmentShaderID:j,isRawShaderMaterial:M.isRawShaderMaterial===!0,glslVersion:M.glslVersion,precision:m,batching:Se,batchingColor:Se&&N._colorsTexture!==null,instancing:Ie,instancingColor:Ie&&N.instanceColor!==null,instancingMorph:Ie&&N.morphTexture!==null,supportsVertexTextures:d,outputColorSpace:Q===null?s.outputColorSpace:Q.isXRRenderTarget===!0?Q.texture.colorSpace:jt,alphaToCoverage:!!M.alphaToCoverage,map:Ye,matcap:Lt,envMap:D,envMapMode:D&&G.mapping,envMapCubeUVHeight:H,aoMap:gt,lightMap:Oe,bumpMap:De,normalMap:ve,displacementMap:d&&pt,emissiveMap:K,normalMapObjectSpace:ve&&M.normalMapType===Ld,normalMapTangentSpace:ve&&M.normalMapType===ou,metalnessMap:Re,roughnessMap:Je,anisotropy:$e,anisotropyMap:Y,clearcoat:P,clearcoatMap:Te,clearcoatNormalMap:oe,clearcoatRoughnessMap:be,dispersion:E,iridescence:V,iridescenceMap:we,iridescenceThicknessMap:se,sheen:q,sheenColorMap:fe,sheenRoughnessMap:Ne,specularMap:Ee,specularColorMap:ue,specularIntensityMap:Ge,transmission:ee,transmissionMap:F,thicknessMap:re,gradientMap:ae,opaque:M.transparent===!1&&M.blending===us&&M.alphaToCoverage===!1,alphaMap:_e,alphaTest:ne,alphaHash:$,combine:M.combine,mapUv:Ye&&p(M.map.channel),aoMapUv:gt&&p(M.aoMap.channel),lightMapUv:Oe&&p(M.lightMap.channel),bumpMapUv:De&&p(M.bumpMap.channel),normalMapUv:ve&&p(M.normalMap.channel),displacementMapUv:pt&&p(M.displacementMap.channel),emissiveMapUv:K&&p(M.emissiveMap.channel),metalnessMapUv:Re&&p(M.metalnessMap.channel),roughnessMapUv:Je&&p(M.roughnessMap.channel),anisotropyMapUv:Y&&p(M.anisotropyMap.channel),clearcoatMapUv:Te&&p(M.clearcoatMap.channel),clearcoatNormalMapUv:oe&&p(M.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:be&&p(M.clearcoatRoughnessMap.channel),iridescenceMapUv:we&&p(M.iridescenceMap.channel),iridescenceThicknessMapUv:se&&p(M.iridescenceThicknessMap.channel),sheenColorMapUv:fe&&p(M.sheenColorMap.channel),sheenRoughnessMapUv:Ne&&p(M.sheenRoughnessMap.channel),specularMapUv:Ee&&p(M.specularMap.channel),specularColorMapUv:ue&&p(M.specularColorMap.channel),specularIntensityMapUv:Ge&&p(M.specularIntensityMap.channel),transmissionMapUv:F&&p(M.transmissionMap.channel),thicknessMapUv:re&&p(M.thicknessMap.channel),alphaMapUv:_e&&p(M.alphaMap.channel),vertexTangents:!!z.attributes.tangent&&(ve||$e),vertexColors:M.vertexColors,vertexAlphas:M.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,pointsUvs:N.isPoints===!0&&!!z.attributes.uv&&(Ye||_e),fog:!!U,useFog:M.fog===!0,fogExp2:!!U&&U.isFogExp2,flatShading:M.flatShading===!0&&M.wireframe===!1,sizeAttenuation:M.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:pe,skinning:N.isSkinnedMesh===!0,morphTargets:z.morphAttributes.position!==void 0,morphNormals:z.morphAttributes.normal!==void 0,morphColors:z.morphAttributes.color!==void 0,morphTargetsCount:le,morphTextureStride:ge,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:M.dithering,shadowMapEnabled:s.shadowMap.enabled&&L.length>0,shadowMapType:s.shadowMap.type,toneMapping:Be,decodeVideoTexture:Ye&&M.map.isVideoTexture===!0&&nt.getTransfer(M.map.colorSpace)===dt,decodeVideoTextureEmissive:K&&M.emissiveMap.isVideoTexture===!0&&nt.getTransfer(M.emissiveMap.colorSpace)===dt,premultipliedAlpha:M.premultipliedAlpha,doubleSided:M.side===Tt,flipSided:M.side===Vt,useDepthPacking:M.depthPacking>=0,depthPacking:M.depthPacking||0,index0AttributeName:M.index0AttributeName,extensionClipCullDistance:Me&&M.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Me&&M.extensions.multiDraw===!0||Se)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:M.customProgramCacheKey()};return _t.vertexUv1s=l.has(1),_t.vertexUv2s=l.has(2),_t.vertexUv3s=l.has(3),l.clear(),_t}function f(M){const S=[];if(M.shaderID?S.push(M.shaderID):(S.push(M.customVertexShaderID),S.push(M.customFragmentShaderID)),M.defines!==void 0)for(const L in M.defines)S.push(L),S.push(M.defines[L]);return M.isRawShaderMaterial===!1&&(x(S,M),v(S,M),S.push(s.outputColorSpace)),S.push(M.customProgramCacheKey),S.join()}function x(M,S){M.push(S.precision),M.push(S.outputColorSpace),M.push(S.envMapMode),M.push(S.envMapCubeUVHeight),M.push(S.mapUv),M.push(S.alphaMapUv),M.push(S.lightMapUv),M.push(S.aoMapUv),M.push(S.bumpMapUv),M.push(S.normalMapUv),M.push(S.displacementMapUv),M.push(S.emissiveMapUv),M.push(S.metalnessMapUv),M.push(S.roughnessMapUv),M.push(S.anisotropyMapUv),M.push(S.clearcoatMapUv),M.push(S.clearcoatNormalMapUv),M.push(S.clearcoatRoughnessMapUv),M.push(S.iridescenceMapUv),M.push(S.iridescenceThicknessMapUv),M.push(S.sheenColorMapUv),M.push(S.sheenRoughnessMapUv),M.push(S.specularMapUv),M.push(S.specularColorMapUv),M.push(S.specularIntensityMapUv),M.push(S.transmissionMapUv),M.push(S.thicknessMapUv),M.push(S.combine),M.push(S.fogExp2),M.push(S.sizeAttenuation),M.push(S.morphTargetsCount),M.push(S.morphAttributeCount),M.push(S.numDirLights),M.push(S.numPointLights),M.push(S.numSpotLights),M.push(S.numSpotLightMaps),M.push(S.numHemiLights),M.push(S.numRectAreaLights),M.push(S.numDirLightShadows),M.push(S.numPointLightShadows),M.push(S.numSpotLightShadows),M.push(S.numSpotLightShadowsWithMaps),M.push(S.numLightProbes),M.push(S.shadowMapType),M.push(S.toneMapping),M.push(S.numClippingPlanes),M.push(S.numClipIntersection),M.push(S.depthPacking)}function v(M,S){a.disableAll(),S.supportsVertexTextures&&a.enable(0),S.instancing&&a.enable(1),S.instancingColor&&a.enable(2),S.instancingMorph&&a.enable(3),S.matcap&&a.enable(4),S.envMap&&a.enable(5),S.normalMapObjectSpace&&a.enable(6),S.normalMapTangentSpace&&a.enable(7),S.clearcoat&&a.enable(8),S.iridescence&&a.enable(9),S.alphaTest&&a.enable(10),S.vertexColors&&a.enable(11),S.vertexAlphas&&a.enable(12),S.vertexUv1s&&a.enable(13),S.vertexUv2s&&a.enable(14),S.vertexUv3s&&a.enable(15),S.vertexTangents&&a.enable(16),S.anisotropy&&a.enable(17),S.alphaHash&&a.enable(18),S.batching&&a.enable(19),S.dispersion&&a.enable(20),S.batchingColor&&a.enable(21),S.gradientMap&&a.enable(22),M.push(a.mask),a.disableAll(),S.fog&&a.enable(0),S.useFog&&a.enable(1),S.flatShading&&a.enable(2),S.logarithmicDepthBuffer&&a.enable(3),S.reversedDepthBuffer&&a.enable(4),S.skinning&&a.enable(5),S.morphTargets&&a.enable(6),S.morphNormals&&a.enable(7),S.morphColors&&a.enable(8),S.premultipliedAlpha&&a.enable(9),S.shadowMapEnabled&&a.enable(10),S.doubleSided&&a.enable(11),S.flipSided&&a.enable(12),S.useDepthPacking&&a.enable(13),S.dithering&&a.enable(14),S.transmission&&a.enable(15),S.sheen&&a.enable(16),S.opaque&&a.enable(17),S.pointsUvs&&a.enable(18),S.decodeVideoTexture&&a.enable(19),S.decodeVideoTextureEmissive&&a.enable(20),S.alphaToCoverage&&a.enable(21),M.push(a.mask)}function y(M){const S=_[M.type];let L;if(S){const I=Fn[S];L=fu.clone(I.uniforms)}else L=M.uniforms;return L}function b(M,S){let L;for(let I=0,N=h.length;I<N;I++){const U=h[I];if(U.cacheKey===S){L=U,++L.usedTimes;break}}return L===void 0&&(L=new W_(s,S,M,r),h.push(L)),L}function w(M){if(--M.usedTimes===0){const S=h.indexOf(M);h[S]=h[h.length-1],h.pop(),M.destroy()}}function R(M){c.remove(M)}function A(){c.dispose()}return{getParameters:g,getProgramCacheKey:f,getUniforms:y,acquireProgram:b,releaseProgram:w,releaseShaderCache:R,programs:h,dispose:A}}function K_(){let s=new WeakMap;function e(o){return s.has(o)}function t(o){let a=s.get(o);return a===void 0&&(a={},s.set(o,a)),a}function n(o){s.delete(o)}function i(o,a,c){s.get(o)[a]=c}function r(){s=new WeakMap}return{has:e,get:t,remove:n,update:i,dispose:r}}function $_(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.material.id!==e.material.id?s.material.id-e.material.id:s.z!==e.z?s.z-e.z:s.id-e.id}function Mh(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.z!==e.z?e.z-s.z:s.id-e.id}function Sh(){const s=[];let e=0;const t=[],n=[],i=[];function r(){e=0,t.length=0,n.length=0,i.length=0}function o(u,d,m,_,p,g){let f=s[e];return f===void 0?(f={id:u.id,object:u,geometry:d,material:m,groupOrder:_,renderOrder:u.renderOrder,z:p,group:g},s[e]=f):(f.id=u.id,f.object=u,f.geometry=d,f.material=m,f.groupOrder=_,f.renderOrder=u.renderOrder,f.z=p,f.group=g),e++,f}function a(u,d,m,_,p,g){const f=o(u,d,m,_,p,g);m.transmission>0?n.push(f):m.transparent===!0?i.push(f):t.push(f)}function c(u,d,m,_,p,g){const f=o(u,d,m,_,p,g);m.transmission>0?n.unshift(f):m.transparent===!0?i.unshift(f):t.unshift(f)}function l(u,d){t.length>1&&t.sort(u||$_),n.length>1&&n.sort(d||Mh),i.length>1&&i.sort(d||Mh)}function h(){for(let u=e,d=s.length;u<d;u++){const m=s[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:n,transparent:i,init:r,push:a,unshift:c,finish:h,sort:l}}function Z_(){let s=new WeakMap;function e(n,i){const r=s.get(n);let o;return r===void 0?(o=new Sh,s.set(n,[o])):i>=r.length?(o=new Sh,r.push(o)):o=r[i],o}function t(){s=new WeakMap}return{get:e,dispose:t}}function J_(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new C,color:new xe};break;case"SpotLight":t={position:new C,direction:new C,color:new xe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new C,color:new xe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new C,skyColor:new xe,groundColor:new xe};break;case"RectAreaLight":t={color:new xe,position:new C,halfWidth:new C,halfHeight:new C};break}return s[e.id]=t,t}}}function Q_(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new he};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new he};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new he,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[e.id]=t,t}}}let ex=0;function tx(s,e){return(e.castShadow?2:0)-(s.castShadow?2:0)+(e.map?1:0)-(s.map?1:0)}function nx(s){const e=new J_,t=Q_(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new C);const i=new C,r=new ke,o=new ke;function a(l){let h=0,u=0,d=0;for(let M=0;M<9;M++)n.probe[M].set(0,0,0);let m=0,_=0,p=0,g=0,f=0,x=0,v=0,y=0,b=0,w=0,R=0;l.sort(tx);for(let M=0,S=l.length;M<S;M++){const L=l[M],I=L.color,N=L.intensity,U=L.distance,z=L.shadow&&L.shadow.map?L.shadow.map.texture:null;if(L.isAmbientLight)h+=I.r*N,u+=I.g*N,d+=I.b*N;else if(L.isLightProbe){for(let O=0;O<9;O++)n.probe[O].addScaledVector(L.sh.coefficients[O],N);R++}else if(L.isDirectionalLight){const O=e.get(L);if(O.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const G=L.shadow,H=t.get(L);H.shadowIntensity=G.intensity,H.shadowBias=G.bias,H.shadowNormalBias=G.normalBias,H.shadowRadius=G.radius,H.shadowMapSize=G.mapSize,n.directionalShadow[m]=H,n.directionalShadowMap[m]=z,n.directionalShadowMatrix[m]=L.shadow.matrix,x++}n.directional[m]=O,m++}else if(L.isSpotLight){const O=e.get(L);O.position.setFromMatrixPosition(L.matrixWorld),O.color.copy(I).multiplyScalar(N),O.distance=U,O.coneCos=Math.cos(L.angle),O.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),O.decay=L.decay,n.spot[p]=O;const G=L.shadow;if(L.map&&(n.spotLightMap[b]=L.map,b++,G.updateMatrices(L),L.castShadow&&w++),n.spotLightMatrix[p]=G.matrix,L.castShadow){const H=t.get(L);H.shadowIntensity=G.intensity,H.shadowBias=G.bias,H.shadowNormalBias=G.normalBias,H.shadowRadius=G.radius,H.shadowMapSize=G.mapSize,n.spotShadow[p]=H,n.spotShadowMap[p]=z,y++}p++}else if(L.isRectAreaLight){const O=e.get(L);O.color.copy(I).multiplyScalar(N),O.halfWidth.set(L.width*.5,0,0),O.halfHeight.set(0,L.height*.5,0),n.rectArea[g]=O,g++}else if(L.isPointLight){const O=e.get(L);if(O.color.copy(L.color).multiplyScalar(L.intensity),O.distance=L.distance,O.decay=L.decay,L.castShadow){const G=L.shadow,H=t.get(L);H.shadowIntensity=G.intensity,H.shadowBias=G.bias,H.shadowNormalBias=G.normalBias,H.shadowRadius=G.radius,H.shadowMapSize=G.mapSize,H.shadowCameraNear=G.camera.near,H.shadowCameraFar=G.camera.far,n.pointShadow[_]=H,n.pointShadowMap[_]=z,n.pointShadowMatrix[_]=L.shadow.matrix,v++}n.point[_]=O,_++}else if(L.isHemisphereLight){const O=e.get(L);O.skyColor.copy(L.color).multiplyScalar(N),O.groundColor.copy(L.groundColor).multiplyScalar(N),n.hemi[f]=O,f++}}g>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ce.LTC_FLOAT_1,n.rectAreaLTC2=ce.LTC_FLOAT_2):(n.rectAreaLTC1=ce.LTC_HALF_1,n.rectAreaLTC2=ce.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;const A=n.hash;(A.directionalLength!==m||A.pointLength!==_||A.spotLength!==p||A.rectAreaLength!==g||A.hemiLength!==f||A.numDirectionalShadows!==x||A.numPointShadows!==v||A.numSpotShadows!==y||A.numSpotMaps!==b||A.numLightProbes!==R)&&(n.directional.length=m,n.spot.length=p,n.rectArea.length=g,n.point.length=_,n.hemi.length=f,n.directionalShadow.length=x,n.directionalShadowMap.length=x,n.pointShadow.length=v,n.pointShadowMap.length=v,n.spotShadow.length=y,n.spotShadowMap.length=y,n.directionalShadowMatrix.length=x,n.pointShadowMatrix.length=v,n.spotLightMatrix.length=y+b-w,n.spotLightMap.length=b,n.numSpotLightShadowsWithMaps=w,n.numLightProbes=R,A.directionalLength=m,A.pointLength=_,A.spotLength=p,A.rectAreaLength=g,A.hemiLength=f,A.numDirectionalShadows=x,A.numPointShadows=v,A.numSpotShadows=y,A.numSpotMaps=b,A.numLightProbes=R,n.version=ex++)}function c(l,h){let u=0,d=0,m=0,_=0,p=0;const g=h.matrixWorldInverse;for(let f=0,x=l.length;f<x;f++){const v=l[f];if(v.isDirectionalLight){const y=n.directional[u];y.direction.setFromMatrixPosition(v.matrixWorld),i.setFromMatrixPosition(v.target.matrixWorld),y.direction.sub(i),y.direction.transformDirection(g),u++}else if(v.isSpotLight){const y=n.spot[m];y.position.setFromMatrixPosition(v.matrixWorld),y.position.applyMatrix4(g),y.direction.setFromMatrixPosition(v.matrixWorld),i.setFromMatrixPosition(v.target.matrixWorld),y.direction.sub(i),y.direction.transformDirection(g),m++}else if(v.isRectAreaLight){const y=n.rectArea[_];y.position.setFromMatrixPosition(v.matrixWorld),y.position.applyMatrix4(g),o.identity(),r.copy(v.matrixWorld),r.premultiply(g),o.extractRotation(r),y.halfWidth.set(v.width*.5,0,0),y.halfHeight.set(0,v.height*.5,0),y.halfWidth.applyMatrix4(o),y.halfHeight.applyMatrix4(o),_++}else if(v.isPointLight){const y=n.point[d];y.position.setFromMatrixPosition(v.matrixWorld),y.position.applyMatrix4(g),d++}else if(v.isHemisphereLight){const y=n.hemi[p];y.direction.setFromMatrixPosition(v.matrixWorld),y.direction.transformDirection(g),p++}}}return{setup:a,setupView:c,state:n}}function bh(s){const e=new nx(s),t=[],n=[];function i(h){l.camera=h,t.length=0,n.length=0}function r(h){t.push(h)}function o(h){n.push(h)}function a(){e.setup(t)}function c(h){e.setupView(t,h)}const l={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:i,state:l,setupLights:a,setupLightsView:c,pushLight:r,pushShadow:o}}function ix(s){let e=new WeakMap;function t(i,r=0){const o=e.get(i);let a;return o===void 0?(a=new bh(s),e.set(i,[a])):r>=o.length?(a=new bh(s),o.push(a)):a=o[r],a}function n(){e=new WeakMap}return{get:t,dispose:n}}const sx=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,rx=`uniform sampler2D shadow_pass;
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
}`;function ox(s,e,t){let n=new Lc;const i=new he,r=new he,o=new it,a=new ip({depthPacking:Pd}),c=new sp,l={},h=t.maxTextureSize,u={[ni]:Vt,[Vt]:ni,[Tt]:Tt},d=new tn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new he},radius:{value:4}},vertexShader:sx,fragmentShader:rx}),m=d.clone();m.defines.HORIZONTAL_PASS=1;const _=new At;_.setAttribute("position",new wt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const p=new rt(_,d),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=qh;let f=this.type;this.render=function(w,R,A){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||w.length===0)return;const M=s.getRenderTarget(),S=s.getActiveCubeFace(),L=s.getActiveMipmapLevel(),I=s.state;I.setBlending(gi),I.buffers.depth.getReversed()===!0?I.buffers.color.setClear(0,0,0,0):I.buffers.color.setClear(1,1,1,1),I.buffers.depth.setTest(!0),I.setScissorTest(!1);const N=f!==$n&&this.type===$n,U=f===$n&&this.type!==$n;for(let z=0,O=w.length;z<O;z++){const G=w[z],H=G.shadow;if(H===void 0){console.warn("THREE.WebGLShadowMap:",G,"has no shadow.");continue}if(H.autoUpdate===!1&&H.needsUpdate===!1)continue;i.copy(H.mapSize);const J=H.getFrameExtents();if(i.multiply(J),r.copy(H.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(r.x=Math.floor(h/J.x),i.x=r.x*J.x,H.mapSize.x=r.x),i.y>h&&(r.y=Math.floor(h/J.y),i.y=r.y*J.y,H.mapSize.y=r.y)),H.map===null||N===!0||U===!0){const le=this.type!==$n?{minFilter:Jt,magFilter:Jt}:{};H.map!==null&&H.map.dispose(),H.map=new si(i.x,i.y,le),H.map.texture.name=G.name+".shadowMap",H.camera.updateProjectionMatrix()}s.setRenderTarget(H.map),s.clear();const te=H.getViewportCount();for(let le=0;le<te;le++){const ge=H.getViewport(le);o.set(r.x*ge.x,r.y*ge.y,r.x*ge.z,r.y*ge.w),I.viewport(o),H.updateMatrices(G,le),n=H.getFrustum(),y(R,A,H.camera,G,this.type)}H.isPointLightShadow!==!0&&this.type===$n&&x(H,A),H.needsUpdate=!1}f=this.type,g.needsUpdate=!1,s.setRenderTarget(M,S,L)};function x(w,R){const A=e.update(p);d.defines.VSM_SAMPLES!==w.blurSamples&&(d.defines.VSM_SAMPLES=w.blurSamples,m.defines.VSM_SAMPLES=w.blurSamples,d.needsUpdate=!0,m.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new si(i.x,i.y)),d.uniforms.shadow_pass.value=w.map.texture,d.uniforms.resolution.value=w.mapSize,d.uniforms.radius.value=w.radius,s.setRenderTarget(w.mapPass),s.clear(),s.renderBufferDirect(R,null,A,d,p,null),m.uniforms.shadow_pass.value=w.mapPass.texture,m.uniforms.resolution.value=w.mapSize,m.uniforms.radius.value=w.radius,s.setRenderTarget(w.map),s.clear(),s.renderBufferDirect(R,null,A,m,p,null)}function v(w,R,A,M){let S=null;const L=A.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(L!==void 0)S=L;else if(S=A.isPointLight===!0?c:a,s.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0||R.alphaToCoverage===!0){const I=S.uuid,N=R.uuid;let U=l[I];U===void 0&&(U={},l[I]=U);let z=U[N];z===void 0&&(z=S.clone(),U[N]=z,R.addEventListener("dispose",b)),S=z}if(S.visible=R.visible,S.wireframe=R.wireframe,M===$n?S.side=R.shadowSide!==null?R.shadowSide:R.side:S.side=R.shadowSide!==null?R.shadowSide:u[R.side],S.alphaMap=R.alphaMap,S.alphaTest=R.alphaToCoverage===!0?.5:R.alphaTest,S.map=R.map,S.clipShadows=R.clipShadows,S.clippingPlanes=R.clippingPlanes,S.clipIntersection=R.clipIntersection,S.displacementMap=R.displacementMap,S.displacementScale=R.displacementScale,S.displacementBias=R.displacementBias,S.wireframeLinewidth=R.wireframeLinewidth,S.linewidth=R.linewidth,A.isPointLight===!0&&S.isMeshDistanceMaterial===!0){const I=s.properties.get(S);I.light=A}return S}function y(w,R,A,M,S){if(w.visible===!1)return;if(w.layers.test(R.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&S===$n)&&(!w.frustumCulled||n.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(A.matrixWorldInverse,w.matrixWorld);const N=e.update(w),U=w.material;if(Array.isArray(U)){const z=N.groups;for(let O=0,G=z.length;O<G;O++){const H=z[O],J=U[H.materialIndex];if(J&&J.visible){const te=v(w,J,M,S);w.onBeforeShadow(s,w,R,A,N,te,H),s.renderBufferDirect(A,null,N,te,w,H),w.onAfterShadow(s,w,R,A,N,te,H)}}}else if(U.visible){const z=v(w,U,M,S);w.onBeforeShadow(s,w,R,A,N,z,null),s.renderBufferDirect(A,null,N,z,w,null),w.onAfterShadow(s,w,R,A,N,z,null)}}const I=w.children;for(let N=0,U=I.length;N<U;N++)y(I[N],R,A,M,S)}function b(w){w.target.removeEventListener("dispose",b);for(const A in l){const M=l[A],S=w.target.uuid;S in M&&(M[S].dispose(),delete M[S])}}}const ax={[ya]:Ma,[Sa]:Ea,[ba]:Ta,[ms]:wa,[Ma]:ya,[Ea]:Sa,[Ta]:ba,[wa]:ms};function cx(s,e){function t(){let F=!1;const re=new it;let ae=null;const _e=new it(0,0,0,0);return{setMask:function(ne){ae!==ne&&!F&&(s.colorMask(ne,ne,ne,ne),ae=ne)},setLocked:function(ne){F=ne},setClear:function(ne,$,Me,Be,_t){_t===!0&&(ne*=Be,$*=Be,Me*=Be),re.set(ne,$,Me,Be),_e.equals(re)===!1&&(s.clearColor(ne,$,Me,Be),_e.copy(re))},reset:function(){F=!1,ae=null,_e.set(-1,0,0,0)}}}function n(){let F=!1,re=!1,ae=null,_e=null,ne=null;return{setReversed:function($){if(re!==$){const Me=e.get("EXT_clip_control");$?Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.ZERO_TO_ONE_EXT):Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.NEGATIVE_ONE_TO_ONE_EXT),re=$;const Be=ne;ne=null,this.setClear(Be)}},getReversed:function(){return re},setTest:function($){$?Q(s.DEPTH_TEST):pe(s.DEPTH_TEST)},setMask:function($){ae!==$&&!F&&(s.depthMask($),ae=$)},setFunc:function($){if(re&&($=ax[$]),_e!==$){switch($){case ya:s.depthFunc(s.NEVER);break;case Ma:s.depthFunc(s.ALWAYS);break;case Sa:s.depthFunc(s.LESS);break;case ms:s.depthFunc(s.LEQUAL);break;case ba:s.depthFunc(s.EQUAL);break;case wa:s.depthFunc(s.GEQUAL);break;case Ea:s.depthFunc(s.GREATER);break;case Ta:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}_e=$}},setLocked:function($){F=$},setClear:function($){ne!==$&&(re&&($=1-$),s.clearDepth($),ne=$)},reset:function(){F=!1,ae=null,_e=null,ne=null,re=!1}}}function i(){let F=!1,re=null,ae=null,_e=null,ne=null,$=null,Me=null,Be=null,_t=null;return{setTest:function(at){F||(at?Q(s.STENCIL_TEST):pe(s.STENCIL_TEST))},setMask:function(at){re!==at&&!F&&(s.stencilMask(at),re=at)},setFunc:function(at,Gn,Dn){(ae!==at||_e!==Gn||ne!==Dn)&&(s.stencilFunc(at,Gn,Dn),ae=at,_e=Gn,ne=Dn)},setOp:function(at,Gn,Dn){($!==at||Me!==Gn||Be!==Dn)&&(s.stencilOp(at,Gn,Dn),$=at,Me=Gn,Be=Dn)},setLocked:function(at){F=at},setClear:function(at){_t!==at&&(s.clearStencil(at),_t=at)},reset:function(){F=!1,re=null,ae=null,_e=null,ne=null,$=null,Me=null,Be=null,_t=null}}}const r=new t,o=new n,a=new i,c=new WeakMap,l=new WeakMap;let h={},u={},d=new WeakMap,m=[],_=null,p=!1,g=null,f=null,x=null,v=null,y=null,b=null,w=null,R=new xe(0,0,0),A=0,M=!1,S=null,L=null,I=null,N=null,U=null;const z=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let O=!1,G=0;const H=s.getParameter(s.VERSION);H.indexOf("WebGL")!==-1?(G=parseFloat(/^WebGL (\d)/.exec(H)[1]),O=G>=1):H.indexOf("OpenGL ES")!==-1&&(G=parseFloat(/^OpenGL ES (\d)/.exec(H)[1]),O=G>=2);let J=null,te={};const le=s.getParameter(s.SCISSOR_BOX),ge=s.getParameter(s.VIEWPORT),ze=new it().fromArray(le),ot=new it().fromArray(ge);function tt(F,re,ae,_e){const ne=new Uint8Array(4),$=s.createTexture();s.bindTexture(F,$),s.texParameteri(F,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(F,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let Me=0;Me<ae;Me++)F===s.TEXTURE_3D||F===s.TEXTURE_2D_ARRAY?s.texImage3D(re,0,s.RGBA,1,1,_e,0,s.RGBA,s.UNSIGNED_BYTE,ne):s.texImage2D(re+Me,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,ne);return $}const j={};j[s.TEXTURE_2D]=tt(s.TEXTURE_2D,s.TEXTURE_2D,1),j[s.TEXTURE_CUBE_MAP]=tt(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),j[s.TEXTURE_2D_ARRAY]=tt(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),j[s.TEXTURE_3D]=tt(s.TEXTURE_3D,s.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),Q(s.DEPTH_TEST),o.setFunc(ms),De(!1),ve(rl),Q(s.CULL_FACE),gt(gi);function Q(F){h[F]!==!0&&(s.enable(F),h[F]=!0)}function pe(F){h[F]!==!1&&(s.disable(F),h[F]=!1)}function Ie(F,re){return u[F]!==re?(s.bindFramebuffer(F,re),u[F]=re,F===s.DRAW_FRAMEBUFFER&&(u[s.FRAMEBUFFER]=re),F===s.FRAMEBUFFER&&(u[s.DRAW_FRAMEBUFFER]=re),!0):!1}function Se(F,re){let ae=m,_e=!1;if(F){ae=d.get(re),ae===void 0&&(ae=[],d.set(re,ae));const ne=F.textures;if(ae.length!==ne.length||ae[0]!==s.COLOR_ATTACHMENT0){for(let $=0,Me=ne.length;$<Me;$++)ae[$]=s.COLOR_ATTACHMENT0+$;ae.length=ne.length,_e=!0}}else ae[0]!==s.BACK&&(ae[0]=s.BACK,_e=!0);_e&&s.drawBuffers(ae)}function Ye(F){return _!==F?(s.useProgram(F),_=F,!0):!1}const Lt={[Ui]:s.FUNC_ADD,[td]:s.FUNC_SUBTRACT,[nd]:s.FUNC_REVERSE_SUBTRACT};Lt[id]=s.MIN,Lt[sd]=s.MAX;const D={[rd]:s.ZERO,[od]:s.ONE,[ad]:s.SRC_COLOR,[xa]:s.SRC_ALPHA,[fd]:s.SRC_ALPHA_SATURATE,[ud]:s.DST_COLOR,[ld]:s.DST_ALPHA,[cd]:s.ONE_MINUS_SRC_COLOR,[va]:s.ONE_MINUS_SRC_ALPHA,[dd]:s.ONE_MINUS_DST_COLOR,[hd]:s.ONE_MINUS_DST_ALPHA,[pd]:s.CONSTANT_COLOR,[md]:s.ONE_MINUS_CONSTANT_COLOR,[gd]:s.CONSTANT_ALPHA,[_d]:s.ONE_MINUS_CONSTANT_ALPHA};function gt(F,re,ae,_e,ne,$,Me,Be,_t,at){if(F===gi){p===!0&&(pe(s.BLEND),p=!1);return}if(p===!1&&(Q(s.BLEND),p=!0),F!==ed){if(F!==g||at!==M){if((f!==Ui||y!==Ui)&&(s.blendEquation(s.FUNC_ADD),f=Ui,y=Ui),at)switch(F){case us:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case ol:s.blendFunc(s.ONE,s.ONE);break;case al:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case cl:s.blendFuncSeparate(s.DST_COLOR,s.ONE_MINUS_SRC_ALPHA,s.ZERO,s.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",F);break}else switch(F){case us:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case ol:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE,s.ONE,s.ONE);break;case al:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case cl:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",F);break}x=null,v=null,b=null,w=null,R.set(0,0,0),A=0,g=F,M=at}return}ne=ne||re,$=$||ae,Me=Me||_e,(re!==f||ne!==y)&&(s.blendEquationSeparate(Lt[re],Lt[ne]),f=re,y=ne),(ae!==x||_e!==v||$!==b||Me!==w)&&(s.blendFuncSeparate(D[ae],D[_e],D[$],D[Me]),x=ae,v=_e,b=$,w=Me),(Be.equals(R)===!1||_t!==A)&&(s.blendColor(Be.r,Be.g,Be.b,_t),R.copy(Be),A=_t),g=F,M=!1}function Oe(F,re){F.side===Tt?pe(s.CULL_FACE):Q(s.CULL_FACE);let ae=F.side===Vt;re&&(ae=!ae),De(ae),F.blending===us&&F.transparent===!1?gt(gi):gt(F.blending,F.blendEquation,F.blendSrc,F.blendDst,F.blendEquationAlpha,F.blendSrcAlpha,F.blendDstAlpha,F.blendColor,F.blendAlpha,F.premultipliedAlpha),o.setFunc(F.depthFunc),o.setTest(F.depthTest),o.setMask(F.depthWrite),r.setMask(F.colorWrite);const _e=F.stencilWrite;a.setTest(_e),_e&&(a.setMask(F.stencilWriteMask),a.setFunc(F.stencilFunc,F.stencilRef,F.stencilFuncMask),a.setOp(F.stencilFail,F.stencilZFail,F.stencilZPass)),K(F.polygonOffset,F.polygonOffsetFactor,F.polygonOffsetUnits),F.alphaToCoverage===!0?Q(s.SAMPLE_ALPHA_TO_COVERAGE):pe(s.SAMPLE_ALPHA_TO_COVERAGE)}function De(F){S!==F&&(F?s.frontFace(s.CW):s.frontFace(s.CCW),S=F)}function ve(F){F!==Ju?(Q(s.CULL_FACE),F!==L&&(F===rl?s.cullFace(s.BACK):F===Qu?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):pe(s.CULL_FACE),L=F}function pt(F){F!==I&&(O&&s.lineWidth(F),I=F)}function K(F,re,ae){F?(Q(s.POLYGON_OFFSET_FILL),(N!==re||U!==ae)&&(s.polygonOffset(re,ae),N=re,U=ae)):pe(s.POLYGON_OFFSET_FILL)}function Re(F){F?Q(s.SCISSOR_TEST):pe(s.SCISSOR_TEST)}function Je(F){F===void 0&&(F=s.TEXTURE0+z-1),J!==F&&(s.activeTexture(F),J=F)}function $e(F,re,ae){ae===void 0&&(J===null?ae=s.TEXTURE0+z-1:ae=J);let _e=te[ae];_e===void 0&&(_e={type:void 0,texture:void 0},te[ae]=_e),(_e.type!==F||_e.texture!==re)&&(J!==ae&&(s.activeTexture(ae),J=ae),s.bindTexture(F,re||j[F]),_e.type=F,_e.texture=re)}function P(){const F=te[J];F!==void 0&&F.type!==void 0&&(s.bindTexture(F.type,null),F.type=void 0,F.texture=void 0)}function E(){try{s.compressedTexImage2D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function V(){try{s.compressedTexImage3D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function q(){try{s.texSubImage2D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function ee(){try{s.texSubImage3D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Y(){try{s.compressedTexSubImage2D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Te(){try{s.compressedTexSubImage3D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function oe(){try{s.texStorage2D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function be(){try{s.texStorage3D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function we(){try{s.texImage2D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function se(){try{s.texImage3D(...arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function fe(F){ze.equals(F)===!1&&(s.scissor(F.x,F.y,F.z,F.w),ze.copy(F))}function Ne(F){ot.equals(F)===!1&&(s.viewport(F.x,F.y,F.z,F.w),ot.copy(F))}function Ee(F,re){let ae=l.get(re);ae===void 0&&(ae=new WeakMap,l.set(re,ae));let _e=ae.get(F);_e===void 0&&(_e=s.getUniformBlockIndex(re,F.name),ae.set(F,_e))}function ue(F,re){const _e=l.get(re).get(F);c.get(re)!==_e&&(s.uniformBlockBinding(re,_e,F.__bindingPointIndex),c.set(re,_e))}function Ge(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),o.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),h={},J=null,te={},u={},d=new WeakMap,m=[],_=null,p=!1,g=null,f=null,x=null,v=null,y=null,b=null,w=null,R=new xe(0,0,0),A=0,M=!1,S=null,L=null,I=null,N=null,U=null,ze.set(0,0,s.canvas.width,s.canvas.height),ot.set(0,0,s.canvas.width,s.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:Q,disable:pe,bindFramebuffer:Ie,drawBuffers:Se,useProgram:Ye,setBlending:gt,setMaterial:Oe,setFlipSided:De,setCullFace:ve,setLineWidth:pt,setPolygonOffset:K,setScissorTest:Re,activeTexture:Je,bindTexture:$e,unbindTexture:P,compressedTexImage2D:E,compressedTexImage3D:V,texImage2D:we,texImage3D:se,updateUBOMapping:Ee,uniformBlockBinding:ue,texStorage2D:oe,texStorage3D:be,texSubImage2D:q,texSubImage3D:ee,compressedTexSubImage2D:Y,compressedTexSubImage3D:Te,scissor:fe,viewport:Ne,reset:Ge}}function lx(s,e,t,n,i,r,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new he,h=new WeakMap;let u;const d=new WeakMap;let m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(P,E){return m?new OffscreenCanvas(P,E):nr("canvas")}function p(P,E,V){let q=1;const ee=$e(P);if((ee.width>V||ee.height>V)&&(q=V/Math.max(ee.width,ee.height)),q<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){const Y=Math.floor(q*ee.width),Te=Math.floor(q*ee.height);u===void 0&&(u=_(Y,Te));const oe=E?_(Y,Te):u;return oe.width=Y,oe.height=Te,oe.getContext("2d").drawImage(P,0,0,Y,Te),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+ee.width+"x"+ee.height+") to ("+Y+"x"+Te+")."),oe}else return"data"in P&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+ee.width+"x"+ee.height+")."),P;return P}function g(P){return P.generateMipmaps}function f(P){s.generateMipmap(P)}function x(P){return P.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:P.isWebGL3DRenderTarget?s.TEXTURE_3D:P.isWebGLArrayRenderTarget||P.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function v(P,E,V,q,ee=!1){if(P!==null){if(s[P]!==void 0)return s[P];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let Y=E;if(E===s.RED&&(V===s.FLOAT&&(Y=s.R32F),V===s.HALF_FLOAT&&(Y=s.R16F),V===s.UNSIGNED_BYTE&&(Y=s.R8)),E===s.RED_INTEGER&&(V===s.UNSIGNED_BYTE&&(Y=s.R8UI),V===s.UNSIGNED_SHORT&&(Y=s.R16UI),V===s.UNSIGNED_INT&&(Y=s.R32UI),V===s.BYTE&&(Y=s.R8I),V===s.SHORT&&(Y=s.R16I),V===s.INT&&(Y=s.R32I)),E===s.RG&&(V===s.FLOAT&&(Y=s.RG32F),V===s.HALF_FLOAT&&(Y=s.RG16F),V===s.UNSIGNED_BYTE&&(Y=s.RG8)),E===s.RG_INTEGER&&(V===s.UNSIGNED_BYTE&&(Y=s.RG8UI),V===s.UNSIGNED_SHORT&&(Y=s.RG16UI),V===s.UNSIGNED_INT&&(Y=s.RG32UI),V===s.BYTE&&(Y=s.RG8I),V===s.SHORT&&(Y=s.RG16I),V===s.INT&&(Y=s.RG32I)),E===s.RGB_INTEGER&&(V===s.UNSIGNED_BYTE&&(Y=s.RGB8UI),V===s.UNSIGNED_SHORT&&(Y=s.RGB16UI),V===s.UNSIGNED_INT&&(Y=s.RGB32UI),V===s.BYTE&&(Y=s.RGB8I),V===s.SHORT&&(Y=s.RGB16I),V===s.INT&&(Y=s.RGB32I)),E===s.RGBA_INTEGER&&(V===s.UNSIGNED_BYTE&&(Y=s.RGBA8UI),V===s.UNSIGNED_SHORT&&(Y=s.RGBA16UI),V===s.UNSIGNED_INT&&(Y=s.RGBA32UI),V===s.BYTE&&(Y=s.RGBA8I),V===s.SHORT&&(Y=s.RGBA16I),V===s.INT&&(Y=s.RGBA32I)),E===s.RGB&&(V===s.UNSIGNED_INT_5_9_9_9_REV&&(Y=s.RGB9_E5),V===s.UNSIGNED_INT_10F_11F_11F_REV&&(Y=s.R11F_G11F_B10F)),E===s.RGBA){const Te=ee?no:nt.getTransfer(q);V===s.FLOAT&&(Y=s.RGBA32F),V===s.HALF_FLOAT&&(Y=s.RGBA16F),V===s.UNSIGNED_BYTE&&(Y=Te===dt?s.SRGB8_ALPHA8:s.RGBA8),V===s.UNSIGNED_SHORT_4_4_4_4&&(Y=s.RGBA4),V===s.UNSIGNED_SHORT_5_5_5_1&&(Y=s.RGB5_A1)}return(Y===s.R16F||Y===s.R32F||Y===s.RG16F||Y===s.RG32F||Y===s.RGBA16F||Y===s.RGBA32F)&&e.get("EXT_color_buffer_float"),Y}function y(P,E){let V;return P?E===null||E===yi||E===Zs?V=s.DEPTH24_STENCIL8:E===en?V=s.DEPTH32F_STENCIL8:E===$s&&(V=s.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):E===null||E===yi||E===Zs?V=s.DEPTH_COMPONENT24:E===en?V=s.DEPTH_COMPONENT32F:E===$s&&(V=s.DEPTH_COMPONENT16),V}function b(P,E){return g(P)===!0||P.isFramebufferTexture&&P.minFilter!==Jt&&P.minFilter!==Dt?Math.log2(Math.max(E.width,E.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?E.mipmaps.length:1}function w(P){const E=P.target;E.removeEventListener("dispose",w),A(E),E.isVideoTexture&&h.delete(E)}function R(P){const E=P.target;E.removeEventListener("dispose",R),S(E)}function A(P){const E=n.get(P);if(E.__webglInit===void 0)return;const V=P.source,q=d.get(V);if(q){const ee=q[E.__cacheKey];ee.usedTimes--,ee.usedTimes===0&&M(P),Object.keys(q).length===0&&d.delete(V)}n.remove(P)}function M(P){const E=n.get(P);s.deleteTexture(E.__webglTexture);const V=P.source,q=d.get(V);delete q[E.__cacheKey],o.memory.textures--}function S(P){const E=n.get(P);if(P.depthTexture&&(P.depthTexture.dispose(),n.remove(P.depthTexture)),P.isWebGLCubeRenderTarget)for(let q=0;q<6;q++){if(Array.isArray(E.__webglFramebuffer[q]))for(let ee=0;ee<E.__webglFramebuffer[q].length;ee++)s.deleteFramebuffer(E.__webglFramebuffer[q][ee]);else s.deleteFramebuffer(E.__webglFramebuffer[q]);E.__webglDepthbuffer&&s.deleteRenderbuffer(E.__webglDepthbuffer[q])}else{if(Array.isArray(E.__webglFramebuffer))for(let q=0;q<E.__webglFramebuffer.length;q++)s.deleteFramebuffer(E.__webglFramebuffer[q]);else s.deleteFramebuffer(E.__webglFramebuffer);if(E.__webglDepthbuffer&&s.deleteRenderbuffer(E.__webglDepthbuffer),E.__webglMultisampledFramebuffer&&s.deleteFramebuffer(E.__webglMultisampledFramebuffer),E.__webglColorRenderbuffer)for(let q=0;q<E.__webglColorRenderbuffer.length;q++)E.__webglColorRenderbuffer[q]&&s.deleteRenderbuffer(E.__webglColorRenderbuffer[q]);E.__webglDepthRenderbuffer&&s.deleteRenderbuffer(E.__webglDepthRenderbuffer)}const V=P.textures;for(let q=0,ee=V.length;q<ee;q++){const Y=n.get(V[q]);Y.__webglTexture&&(s.deleteTexture(Y.__webglTexture),o.memory.textures--),n.remove(V[q])}n.remove(P)}let L=0;function I(){L=0}function N(){const P=L;return P>=i.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+P+" texture units while this GPU supports only "+i.maxTextures),L+=1,P}function U(P){const E=[];return E.push(P.wrapS),E.push(P.wrapT),E.push(P.wrapR||0),E.push(P.magFilter),E.push(P.minFilter),E.push(P.anisotropy),E.push(P.internalFormat),E.push(P.format),E.push(P.type),E.push(P.generateMipmaps),E.push(P.premultiplyAlpha),E.push(P.flipY),E.push(P.unpackAlignment),E.push(P.colorSpace),E.join()}function z(P,E){const V=n.get(P);if(P.isVideoTexture&&Re(P),P.isRenderTargetTexture===!1&&P.isExternalTexture!==!0&&P.version>0&&V.__version!==P.version){const q=P.image;if(q===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(q.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{j(V,P,E);return}}else P.isExternalTexture&&(V.__webglTexture=P.sourceTexture?P.sourceTexture:null);t.bindTexture(s.TEXTURE_2D,V.__webglTexture,s.TEXTURE0+E)}function O(P,E){const V=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&V.__version!==P.version){j(V,P,E);return}t.bindTexture(s.TEXTURE_2D_ARRAY,V.__webglTexture,s.TEXTURE0+E)}function G(P,E){const V=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&V.__version!==P.version){j(V,P,E);return}t.bindTexture(s.TEXTURE_3D,V.__webglTexture,s.TEXTURE0+E)}function H(P,E){const V=n.get(P);if(P.version>0&&V.__version!==P.version){Q(V,P,E);return}t.bindTexture(s.TEXTURE_CUBE_MAP,V.__webglTexture,s.TEXTURE0+E)}const J={[ii]:s.REPEAT,[cn]:s.CLAMP_TO_EDGE,[to]:s.MIRRORED_REPEAT},te={[Jt]:s.NEAREST,[Zh]:s.NEAREST_MIPMAP_NEAREST,[Hs]:s.NEAREST_MIPMAP_LINEAR,[Dt]:s.LINEAR,[Wr]:s.LINEAR_MIPMAP_NEAREST,[An]:s.LINEAR_MIPMAP_LINEAR},le={[Id]:s.NEVER,[Od]:s.ALWAYS,[Dd]:s.LESS,[au]:s.LEQUAL,[Ud]:s.EQUAL,[zd]:s.GEQUAL,[Nd]:s.GREATER,[Fd]:s.NOTEQUAL};function ge(P,E){if(E.type===en&&e.has("OES_texture_float_linear")===!1&&(E.magFilter===Dt||E.magFilter===Wr||E.magFilter===Hs||E.magFilter===An||E.minFilter===Dt||E.minFilter===Wr||E.minFilter===Hs||E.minFilter===An)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(P,s.TEXTURE_WRAP_S,J[E.wrapS]),s.texParameteri(P,s.TEXTURE_WRAP_T,J[E.wrapT]),(P===s.TEXTURE_3D||P===s.TEXTURE_2D_ARRAY)&&s.texParameteri(P,s.TEXTURE_WRAP_R,J[E.wrapR]),s.texParameteri(P,s.TEXTURE_MAG_FILTER,te[E.magFilter]),s.texParameteri(P,s.TEXTURE_MIN_FILTER,te[E.minFilter]),E.compareFunction&&(s.texParameteri(P,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(P,s.TEXTURE_COMPARE_FUNC,le[E.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(E.magFilter===Jt||E.minFilter!==Hs&&E.minFilter!==An||E.type===en&&e.has("OES_texture_float_linear")===!1)return;if(E.anisotropy>1||n.get(E).__currentAnisotropy){const V=e.get("EXT_texture_filter_anisotropic");s.texParameterf(P,V.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(E.anisotropy,i.getMaxAnisotropy())),n.get(E).__currentAnisotropy=E.anisotropy}}}function ze(P,E){let V=!1;P.__webglInit===void 0&&(P.__webglInit=!0,E.addEventListener("dispose",w));const q=E.source;let ee=d.get(q);ee===void 0&&(ee={},d.set(q,ee));const Y=U(E);if(Y!==P.__cacheKey){ee[Y]===void 0&&(ee[Y]={texture:s.createTexture(),usedTimes:0},o.memory.textures++,V=!0),ee[Y].usedTimes++;const Te=ee[P.__cacheKey];Te!==void 0&&(ee[P.__cacheKey].usedTimes--,Te.usedTimes===0&&M(E)),P.__cacheKey=Y,P.__webglTexture=ee[Y].texture}return V}function ot(P,E,V){return Math.floor(Math.floor(P/V)/E)}function tt(P,E,V,q){const Y=P.updateRanges;if(Y.length===0)t.texSubImage2D(s.TEXTURE_2D,0,0,0,E.width,E.height,V,q,E.data);else{Y.sort((se,fe)=>se.start-fe.start);let Te=0;for(let se=1;se<Y.length;se++){const fe=Y[Te],Ne=Y[se],Ee=fe.start+fe.count,ue=ot(Ne.start,E.width,4),Ge=ot(fe.start,E.width,4);Ne.start<=Ee+1&&ue===Ge&&ot(Ne.start+Ne.count-1,E.width,4)===ue?fe.count=Math.max(fe.count,Ne.start+Ne.count-fe.start):(++Te,Y[Te]=Ne)}Y.length=Te+1;const oe=s.getParameter(s.UNPACK_ROW_LENGTH),be=s.getParameter(s.UNPACK_SKIP_PIXELS),we=s.getParameter(s.UNPACK_SKIP_ROWS);s.pixelStorei(s.UNPACK_ROW_LENGTH,E.width);for(let se=0,fe=Y.length;se<fe;se++){const Ne=Y[se],Ee=Math.floor(Ne.start/4),ue=Math.ceil(Ne.count/4),Ge=Ee%E.width,F=Math.floor(Ee/E.width),re=ue,ae=1;s.pixelStorei(s.UNPACK_SKIP_PIXELS,Ge),s.pixelStorei(s.UNPACK_SKIP_ROWS,F),t.texSubImage2D(s.TEXTURE_2D,0,Ge,F,re,ae,V,q,E.data)}P.clearUpdateRanges(),s.pixelStorei(s.UNPACK_ROW_LENGTH,oe),s.pixelStorei(s.UNPACK_SKIP_PIXELS,be),s.pixelStorei(s.UNPACK_SKIP_ROWS,we)}}function j(P,E,V){let q=s.TEXTURE_2D;(E.isDataArrayTexture||E.isCompressedArrayTexture)&&(q=s.TEXTURE_2D_ARRAY),E.isData3DTexture&&(q=s.TEXTURE_3D);const ee=ze(P,E),Y=E.source;t.bindTexture(q,P.__webglTexture,s.TEXTURE0+V);const Te=n.get(Y);if(Y.version!==Te.__version||ee===!0){t.activeTexture(s.TEXTURE0+V);const oe=nt.getPrimaries(nt.workingColorSpace),be=E.colorSpace===Zn?null:nt.getPrimaries(E.colorSpace),we=E.colorSpace===Zn||oe===be?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,E.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,E.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,we);let se=p(E.image,!1,i.maxTextureSize);se=Je(E,se);const fe=r.convert(E.format,E.colorSpace),Ne=r.convert(E.type);let Ee=v(E.internalFormat,fe,Ne,E.colorSpace,E.isVideoTexture);ge(q,E);let ue;const Ge=E.mipmaps,F=E.isVideoTexture!==!0,re=Te.__version===void 0||ee===!0,ae=Y.dataReady,_e=b(E,se);if(E.isDepthTexture)Ee=y(E.format===Qs,E.type),re&&(F?t.texStorage2D(s.TEXTURE_2D,1,Ee,se.width,se.height):t.texImage2D(s.TEXTURE_2D,0,Ee,se.width,se.height,0,fe,Ne,null));else if(E.isDataTexture)if(Ge.length>0){F&&re&&t.texStorage2D(s.TEXTURE_2D,_e,Ee,Ge[0].width,Ge[0].height);for(let ne=0,$=Ge.length;ne<$;ne++)ue=Ge[ne],F?ae&&t.texSubImage2D(s.TEXTURE_2D,ne,0,0,ue.width,ue.height,fe,Ne,ue.data):t.texImage2D(s.TEXTURE_2D,ne,Ee,ue.width,ue.height,0,fe,Ne,ue.data);E.generateMipmaps=!1}else F?(re&&t.texStorage2D(s.TEXTURE_2D,_e,Ee,se.width,se.height),ae&&tt(E,se,fe,Ne)):t.texImage2D(s.TEXTURE_2D,0,Ee,se.width,se.height,0,fe,Ne,se.data);else if(E.isCompressedTexture)if(E.isCompressedArrayTexture){F&&re&&t.texStorage3D(s.TEXTURE_2D_ARRAY,_e,Ee,Ge[0].width,Ge[0].height,se.depth);for(let ne=0,$=Ge.length;ne<$;ne++)if(ue=Ge[ne],E.format!==ln)if(fe!==null)if(F){if(ae)if(E.layerUpdates.size>0){const Me=Ql(ue.width,ue.height,E.format,E.type);for(const Be of E.layerUpdates){const _t=ue.data.subarray(Be*Me/ue.data.BYTES_PER_ELEMENT,(Be+1)*Me/ue.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,ne,0,0,Be,ue.width,ue.height,1,fe,_t)}E.clearLayerUpdates()}else t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,ne,0,0,0,ue.width,ue.height,se.depth,fe,ue.data)}else t.compressedTexImage3D(s.TEXTURE_2D_ARRAY,ne,Ee,ue.width,ue.height,se.depth,0,ue.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else F?ae&&t.texSubImage3D(s.TEXTURE_2D_ARRAY,ne,0,0,0,ue.width,ue.height,se.depth,fe,Ne,ue.data):t.texImage3D(s.TEXTURE_2D_ARRAY,ne,Ee,ue.width,ue.height,se.depth,0,fe,Ne,ue.data)}else{F&&re&&t.texStorage2D(s.TEXTURE_2D,_e,Ee,Ge[0].width,Ge[0].height);for(let ne=0,$=Ge.length;ne<$;ne++)ue=Ge[ne],E.format!==ln?fe!==null?F?ae&&t.compressedTexSubImage2D(s.TEXTURE_2D,ne,0,0,ue.width,ue.height,fe,ue.data):t.compressedTexImage2D(s.TEXTURE_2D,ne,Ee,ue.width,ue.height,0,ue.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):F?ae&&t.texSubImage2D(s.TEXTURE_2D,ne,0,0,ue.width,ue.height,fe,Ne,ue.data):t.texImage2D(s.TEXTURE_2D,ne,Ee,ue.width,ue.height,0,fe,Ne,ue.data)}else if(E.isDataArrayTexture)if(F){if(re&&t.texStorage3D(s.TEXTURE_2D_ARRAY,_e,Ee,se.width,se.height,se.depth),ae)if(E.layerUpdates.size>0){const ne=Ql(se.width,se.height,E.format,E.type);for(const $ of E.layerUpdates){const Me=se.data.subarray($*ne/se.data.BYTES_PER_ELEMENT,($+1)*ne/se.data.BYTES_PER_ELEMENT);t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,$,se.width,se.height,1,fe,Ne,Me)}E.clearLayerUpdates()}else t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,se.width,se.height,se.depth,fe,Ne,se.data)}else t.texImage3D(s.TEXTURE_2D_ARRAY,0,Ee,se.width,se.height,se.depth,0,fe,Ne,se.data);else if(E.isData3DTexture)F?(re&&t.texStorage3D(s.TEXTURE_3D,_e,Ee,se.width,se.height,se.depth),ae&&t.texSubImage3D(s.TEXTURE_3D,0,0,0,0,se.width,se.height,se.depth,fe,Ne,se.data)):t.texImage3D(s.TEXTURE_3D,0,Ee,se.width,se.height,se.depth,0,fe,Ne,se.data);else if(E.isFramebufferTexture){if(re)if(F)t.texStorage2D(s.TEXTURE_2D,_e,Ee,se.width,se.height);else{let ne=se.width,$=se.height;for(let Me=0;Me<_e;Me++)t.texImage2D(s.TEXTURE_2D,Me,Ee,ne,$,0,fe,Ne,null),ne>>=1,$>>=1}}else if(Ge.length>0){if(F&&re){const ne=$e(Ge[0]);t.texStorage2D(s.TEXTURE_2D,_e,Ee,ne.width,ne.height)}for(let ne=0,$=Ge.length;ne<$;ne++)ue=Ge[ne],F?ae&&t.texSubImage2D(s.TEXTURE_2D,ne,0,0,fe,Ne,ue):t.texImage2D(s.TEXTURE_2D,ne,Ee,fe,Ne,ue);E.generateMipmaps=!1}else if(F){if(re){const ne=$e(se);t.texStorage2D(s.TEXTURE_2D,_e,Ee,ne.width,ne.height)}ae&&t.texSubImage2D(s.TEXTURE_2D,0,0,0,fe,Ne,se)}else t.texImage2D(s.TEXTURE_2D,0,Ee,fe,Ne,se);g(E)&&f(q),Te.__version=Y.version,E.onUpdate&&E.onUpdate(E)}P.__version=E.version}function Q(P,E,V){if(E.image.length!==6)return;const q=ze(P,E),ee=E.source;t.bindTexture(s.TEXTURE_CUBE_MAP,P.__webglTexture,s.TEXTURE0+V);const Y=n.get(ee);if(ee.version!==Y.__version||q===!0){t.activeTexture(s.TEXTURE0+V);const Te=nt.getPrimaries(nt.workingColorSpace),oe=E.colorSpace===Zn?null:nt.getPrimaries(E.colorSpace),be=E.colorSpace===Zn||Te===oe?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,E.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,E.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,be);const we=E.isCompressedTexture||E.image[0].isCompressedTexture,se=E.image[0]&&E.image[0].isDataTexture,fe=[];for(let $=0;$<6;$++)!we&&!se?fe[$]=p(E.image[$],!0,i.maxCubemapSize):fe[$]=se?E.image[$].image:E.image[$],fe[$]=Je(E,fe[$]);const Ne=fe[0],Ee=r.convert(E.format,E.colorSpace),ue=r.convert(E.type),Ge=v(E.internalFormat,Ee,ue,E.colorSpace),F=E.isVideoTexture!==!0,re=Y.__version===void 0||q===!0,ae=ee.dataReady;let _e=b(E,Ne);ge(s.TEXTURE_CUBE_MAP,E);let ne;if(we){F&&re&&t.texStorage2D(s.TEXTURE_CUBE_MAP,_e,Ge,Ne.width,Ne.height);for(let $=0;$<6;$++){ne=fe[$].mipmaps;for(let Me=0;Me<ne.length;Me++){const Be=ne[Me];E.format!==ln?Ee!==null?F?ae&&t.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+$,Me,0,0,Be.width,Be.height,Ee,Be.data):t.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+$,Me,Ge,Be.width,Be.height,0,Be.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):F?ae&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+$,Me,0,0,Be.width,Be.height,Ee,ue,Be.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+$,Me,Ge,Be.width,Be.height,0,Ee,ue,Be.data)}}}else{if(ne=E.mipmaps,F&&re){ne.length>0&&_e++;const $=$e(fe[0]);t.texStorage2D(s.TEXTURE_CUBE_MAP,_e,Ge,$.width,$.height)}for(let $=0;$<6;$++)if(se){F?ae&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+$,0,0,0,fe[$].width,fe[$].height,Ee,ue,fe[$].data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+$,0,Ge,fe[$].width,fe[$].height,0,Ee,ue,fe[$].data);for(let Me=0;Me<ne.length;Me++){const _t=ne[Me].image[$].image;F?ae&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+$,Me+1,0,0,_t.width,_t.height,Ee,ue,_t.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+$,Me+1,Ge,_t.width,_t.height,0,Ee,ue,_t.data)}}else{F?ae&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+$,0,0,0,Ee,ue,fe[$]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+$,0,Ge,Ee,ue,fe[$]);for(let Me=0;Me<ne.length;Me++){const Be=ne[Me];F?ae&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+$,Me+1,0,0,Ee,ue,Be.image[$]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+$,Me+1,Ge,Ee,ue,Be.image[$])}}}g(E)&&f(s.TEXTURE_CUBE_MAP),Y.__version=ee.version,E.onUpdate&&E.onUpdate(E)}P.__version=E.version}function pe(P,E,V,q,ee,Y){const Te=r.convert(V.format,V.colorSpace),oe=r.convert(V.type),be=v(V.internalFormat,Te,oe,V.colorSpace),we=n.get(E),se=n.get(V);if(se.__renderTarget=E,!we.__hasExternalTextures){const fe=Math.max(1,E.width>>Y),Ne=Math.max(1,E.height>>Y);ee===s.TEXTURE_3D||ee===s.TEXTURE_2D_ARRAY?t.texImage3D(ee,Y,be,fe,Ne,E.depth,0,Te,oe,null):t.texImage2D(ee,Y,be,fe,Ne,0,Te,oe,null)}t.bindFramebuffer(s.FRAMEBUFFER,P),K(E)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,q,ee,se.__webglTexture,0,pt(E)):(ee===s.TEXTURE_2D||ee>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&ee<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,q,ee,se.__webglTexture,Y),t.bindFramebuffer(s.FRAMEBUFFER,null)}function Ie(P,E,V){if(s.bindRenderbuffer(s.RENDERBUFFER,P),E.depthBuffer){const q=E.depthTexture,ee=q&&q.isDepthTexture?q.type:null,Y=y(E.stencilBuffer,ee),Te=E.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,oe=pt(E);K(E)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,oe,Y,E.width,E.height):V?s.renderbufferStorageMultisample(s.RENDERBUFFER,oe,Y,E.width,E.height):s.renderbufferStorage(s.RENDERBUFFER,Y,E.width,E.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,Te,s.RENDERBUFFER,P)}else{const q=E.textures;for(let ee=0;ee<q.length;ee++){const Y=q[ee],Te=r.convert(Y.format,Y.colorSpace),oe=r.convert(Y.type),be=v(Y.internalFormat,Te,oe,Y.colorSpace),we=pt(E);V&&K(E)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,we,be,E.width,E.height):K(E)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,we,be,E.width,E.height):s.renderbufferStorage(s.RENDERBUFFER,be,E.width,E.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function Se(P,E){if(E&&E.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(s.FRAMEBUFFER,P),!(E.depthTexture&&E.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const q=n.get(E.depthTexture);q.__renderTarget=E,(!q.__webglTexture||E.depthTexture.image.width!==E.width||E.depthTexture.image.height!==E.height)&&(E.depthTexture.image.width=E.width,E.depthTexture.image.height=E.height,E.depthTexture.needsUpdate=!0),z(E.depthTexture,0);const ee=q.__webglTexture,Y=pt(E);if(E.depthTexture.format===Js)K(E)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,ee,0,Y):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,ee,0);else if(E.depthTexture.format===Qs)K(E)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,ee,0,Y):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,ee,0);else throw new Error("Unknown depthTexture format")}function Ye(P){const E=n.get(P),V=P.isWebGLCubeRenderTarget===!0;if(E.__boundDepthTexture!==P.depthTexture){const q=P.depthTexture;if(E.__depthDisposeCallback&&E.__depthDisposeCallback(),q){const ee=()=>{delete E.__boundDepthTexture,delete E.__depthDisposeCallback,q.removeEventListener("dispose",ee)};q.addEventListener("dispose",ee),E.__depthDisposeCallback=ee}E.__boundDepthTexture=q}if(P.depthTexture&&!E.__autoAllocateDepthBuffer){if(V)throw new Error("target.depthTexture not supported in Cube render targets");const q=P.texture.mipmaps;q&&q.length>0?Se(E.__webglFramebuffer[0],P):Se(E.__webglFramebuffer,P)}else if(V){E.__webglDepthbuffer=[];for(let q=0;q<6;q++)if(t.bindFramebuffer(s.FRAMEBUFFER,E.__webglFramebuffer[q]),E.__webglDepthbuffer[q]===void 0)E.__webglDepthbuffer[q]=s.createRenderbuffer(),Ie(E.__webglDepthbuffer[q],P,!1);else{const ee=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Y=E.__webglDepthbuffer[q];s.bindRenderbuffer(s.RENDERBUFFER,Y),s.framebufferRenderbuffer(s.FRAMEBUFFER,ee,s.RENDERBUFFER,Y)}}else{const q=P.texture.mipmaps;if(q&&q.length>0?t.bindFramebuffer(s.FRAMEBUFFER,E.__webglFramebuffer[0]):t.bindFramebuffer(s.FRAMEBUFFER,E.__webglFramebuffer),E.__webglDepthbuffer===void 0)E.__webglDepthbuffer=s.createRenderbuffer(),Ie(E.__webglDepthbuffer,P,!1);else{const ee=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Y=E.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,Y),s.framebufferRenderbuffer(s.FRAMEBUFFER,ee,s.RENDERBUFFER,Y)}}t.bindFramebuffer(s.FRAMEBUFFER,null)}function Lt(P,E,V){const q=n.get(P);E!==void 0&&pe(q.__webglFramebuffer,P,P.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),V!==void 0&&Ye(P)}function D(P){const E=P.texture,V=n.get(P),q=n.get(E);P.addEventListener("dispose",R);const ee=P.textures,Y=P.isWebGLCubeRenderTarget===!0,Te=ee.length>1;if(Te||(q.__webglTexture===void 0&&(q.__webglTexture=s.createTexture()),q.__version=E.version,o.memory.textures++),Y){V.__webglFramebuffer=[];for(let oe=0;oe<6;oe++)if(E.mipmaps&&E.mipmaps.length>0){V.__webglFramebuffer[oe]=[];for(let be=0;be<E.mipmaps.length;be++)V.__webglFramebuffer[oe][be]=s.createFramebuffer()}else V.__webglFramebuffer[oe]=s.createFramebuffer()}else{if(E.mipmaps&&E.mipmaps.length>0){V.__webglFramebuffer=[];for(let oe=0;oe<E.mipmaps.length;oe++)V.__webglFramebuffer[oe]=s.createFramebuffer()}else V.__webglFramebuffer=s.createFramebuffer();if(Te)for(let oe=0,be=ee.length;oe<be;oe++){const we=n.get(ee[oe]);we.__webglTexture===void 0&&(we.__webglTexture=s.createTexture(),o.memory.textures++)}if(P.samples>0&&K(P)===!1){V.__webglMultisampledFramebuffer=s.createFramebuffer(),V.__webglColorRenderbuffer=[],t.bindFramebuffer(s.FRAMEBUFFER,V.__webglMultisampledFramebuffer);for(let oe=0;oe<ee.length;oe++){const be=ee[oe];V.__webglColorRenderbuffer[oe]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,V.__webglColorRenderbuffer[oe]);const we=r.convert(be.format,be.colorSpace),se=r.convert(be.type),fe=v(be.internalFormat,we,se,be.colorSpace,P.isXRRenderTarget===!0),Ne=pt(P);s.renderbufferStorageMultisample(s.RENDERBUFFER,Ne,fe,P.width,P.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+oe,s.RENDERBUFFER,V.__webglColorRenderbuffer[oe])}s.bindRenderbuffer(s.RENDERBUFFER,null),P.depthBuffer&&(V.__webglDepthRenderbuffer=s.createRenderbuffer(),Ie(V.__webglDepthRenderbuffer,P,!0)),t.bindFramebuffer(s.FRAMEBUFFER,null)}}if(Y){t.bindTexture(s.TEXTURE_CUBE_MAP,q.__webglTexture),ge(s.TEXTURE_CUBE_MAP,E);for(let oe=0;oe<6;oe++)if(E.mipmaps&&E.mipmaps.length>0)for(let be=0;be<E.mipmaps.length;be++)pe(V.__webglFramebuffer[oe][be],P,E,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+oe,be);else pe(V.__webglFramebuffer[oe],P,E,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+oe,0);g(E)&&f(s.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Te){for(let oe=0,be=ee.length;oe<be;oe++){const we=ee[oe],se=n.get(we);let fe=s.TEXTURE_2D;(P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(fe=P.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(fe,se.__webglTexture),ge(fe,we),pe(V.__webglFramebuffer,P,we,s.COLOR_ATTACHMENT0+oe,fe,0),g(we)&&f(fe)}t.unbindTexture()}else{let oe=s.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(oe=P.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(oe,q.__webglTexture),ge(oe,E),E.mipmaps&&E.mipmaps.length>0)for(let be=0;be<E.mipmaps.length;be++)pe(V.__webglFramebuffer[be],P,E,s.COLOR_ATTACHMENT0,oe,be);else pe(V.__webglFramebuffer,P,E,s.COLOR_ATTACHMENT0,oe,0);g(E)&&f(oe),t.unbindTexture()}P.depthBuffer&&Ye(P)}function gt(P){const E=P.textures;for(let V=0,q=E.length;V<q;V++){const ee=E[V];if(g(ee)){const Y=x(P),Te=n.get(ee).__webglTexture;t.bindTexture(Y,Te),f(Y),t.unbindTexture()}}}const Oe=[],De=[];function ve(P){if(P.samples>0){if(K(P)===!1){const E=P.textures,V=P.width,q=P.height;let ee=s.COLOR_BUFFER_BIT;const Y=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Te=n.get(P),oe=E.length>1;if(oe)for(let we=0;we<E.length;we++)t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+we,s.RENDERBUFFER,null),t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+we,s.TEXTURE_2D,null,0);t.bindFramebuffer(s.READ_FRAMEBUFFER,Te.__webglMultisampledFramebuffer);const be=P.texture.mipmaps;be&&be.length>0?t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Te.__webglFramebuffer[0]):t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Te.__webglFramebuffer);for(let we=0;we<E.length;we++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(ee|=s.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(ee|=s.STENCIL_BUFFER_BIT)),oe){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,Te.__webglColorRenderbuffer[we]);const se=n.get(E[we]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,se,0)}s.blitFramebuffer(0,0,V,q,0,0,V,q,ee,s.NEAREST),c===!0&&(Oe.length=0,De.length=0,Oe.push(s.COLOR_ATTACHMENT0+we),P.depthBuffer&&P.resolveDepthBuffer===!1&&(Oe.push(Y),De.push(Y),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,De)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,Oe))}if(t.bindFramebuffer(s.READ_FRAMEBUFFER,null),t.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),oe)for(let we=0;we<E.length;we++){t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+we,s.RENDERBUFFER,Te.__webglColorRenderbuffer[we]);const se=n.get(E[we]).__webglTexture;t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+we,s.TEXTURE_2D,se,0)}t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Te.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.resolveDepthBuffer===!1&&c){const E=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[E])}}}function pt(P){return Math.min(i.maxSamples,P.samples)}function K(P){const E=n.get(P);return P.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&E.__useRenderToTexture!==!1}function Re(P){const E=o.render.frame;h.get(P)!==E&&(h.set(P,E),P.update())}function Je(P,E){const V=P.colorSpace,q=P.format,ee=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||V!==jt&&V!==Zn&&(nt.getTransfer(V)===dt?(q!==ln||ee!==Bn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",V)),E}function $e(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(l.width=P.naturalWidth||P.width,l.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(l.width=P.displayWidth,l.height=P.displayHeight):(l.width=P.width,l.height=P.height),l}this.allocateTextureUnit=N,this.resetTextureUnits=I,this.setTexture2D=z,this.setTexture2DArray=O,this.setTexture3D=G,this.setTextureCube=H,this.rebindTextures=Lt,this.setupRenderTarget=D,this.updateRenderTargetMipmap=gt,this.updateMultisampleRenderTarget=ve,this.setupDepthRenderbuffer=Ye,this.setupFrameBufferTexture=pe,this.useMultisampledRTT=K}function hx(s,e){function t(n,i=Zn){let r;const o=nt.getTransfer(i);if(n===Bn)return s.UNSIGNED_BYTE;if(n===xc)return s.UNSIGNED_SHORT_4_4_4_4;if(n===vc)return s.UNSIGNED_SHORT_5_5_5_1;if(n===eu)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===tu)return s.UNSIGNED_INT_10F_11F_11F_REV;if(n===Jh)return s.BYTE;if(n===Qh)return s.SHORT;if(n===$s)return s.UNSIGNED_SHORT;if(n===_c)return s.INT;if(n===yi)return s.UNSIGNED_INT;if(n===en)return s.FLOAT;if(n===Rn)return s.HALF_FLOAT;if(n===nu)return s.ALPHA;if(n===iu)return s.RGB;if(n===ln)return s.RGBA;if(n===Js)return s.DEPTH_COMPONENT;if(n===Qs)return s.DEPTH_STENCIL;if(n===yc)return s.RED;if(n===Mc)return s.RED_INTEGER;if(n===su)return s.RG;if(n===Sc)return s.RG_INTEGER;if(n===bc)return s.RGBA_INTEGER;if(n===Xr||n===qr||n===Yr||n===jr)if(o===dt)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Xr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===qr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Yr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===jr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Xr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===qr)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Yr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===jr)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Ra||n===Ca||n===Pa||n===La)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Ra)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Ca)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Pa)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===La)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Ia||n===Da||n===Ua)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Ia||n===Da)return o===dt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Ua)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===Na||n===Fa||n===za||n===Oa||n===ka||n===Ba||n===Ha||n===Va||n===Ga||n===Wa||n===Xa||n===qa||n===Ya||n===ja)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Na)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Fa)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===za)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Oa)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===ka)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Ba)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Ha)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Va)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Ga)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Wa)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Xa)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===qa)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Ya)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===ja)return o===dt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Ka||n===$a||n===Za)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===Ka)return o===dt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===$a)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Za)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Ja||n===Qa||n===ec||n===tc)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===Ja)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Qa)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===ec)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===tc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Zs?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:t}}const ux=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,dx=`
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

}`;class fx{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new xu(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new tn({vertexShader:ux,fragmentShader:dx,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new rt(new Mi(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class px extends bs{constructor(e,t){super();const n=this;let i=null,r=1,o=null,a="local-floor",c=1,l=null,h=null,u=null,d=null,m=null,_=null;const p=typeof XRWebGLBinding<"u",g=new fx,f={},x=t.getContextAttributes();let v=null,y=null;const b=[],w=[],R=new he;let A=null;const M=new Yt;M.viewport=new it;const S=new Yt;S.viewport=new it;const L=[M,S],I=new Tp;let N=null,U=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(j){let Q=b[j];return Q===void 0&&(Q=new Wo,b[j]=Q),Q.getTargetRaySpace()},this.getControllerGrip=function(j){let Q=b[j];return Q===void 0&&(Q=new Wo,b[j]=Q),Q.getGripSpace()},this.getHand=function(j){let Q=b[j];return Q===void 0&&(Q=new Wo,b[j]=Q),Q.getHandSpace()};function z(j){const Q=w.indexOf(j.inputSource);if(Q===-1)return;const pe=b[Q];pe!==void 0&&(pe.update(j.inputSource,j.frame,l||o),pe.dispatchEvent({type:j.type,data:j.inputSource}))}function O(){i.removeEventListener("select",z),i.removeEventListener("selectstart",z),i.removeEventListener("selectend",z),i.removeEventListener("squeeze",z),i.removeEventListener("squeezestart",z),i.removeEventListener("squeezeend",z),i.removeEventListener("end",O),i.removeEventListener("inputsourceschange",G);for(let j=0;j<b.length;j++){const Q=w[j];Q!==null&&(w[j]=null,b[j].disconnect(Q))}N=null,U=null,g.reset();for(const j in f)delete f[j];e.setRenderTarget(v),m=null,d=null,u=null,i=null,y=null,tt.stop(),n.isPresenting=!1,e.setPixelRatio(A),e.setSize(R.width,R.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(j){r=j,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(j){a=j,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(j){l=j},this.getBaseLayer=function(){return d!==null?d:m},this.getBinding=function(){return u===null&&p&&(u=new XRWebGLBinding(i,t)),u},this.getFrame=function(){return _},this.getSession=function(){return i},this.setSession=async function(j){if(i=j,i!==null){if(v=e.getRenderTarget(),i.addEventListener("select",z),i.addEventListener("selectstart",z),i.addEventListener("selectend",z),i.addEventListener("squeeze",z),i.addEventListener("squeezestart",z),i.addEventListener("squeezeend",z),i.addEventListener("end",O),i.addEventListener("inputsourceschange",G),x.xrCompatible!==!0&&await t.makeXRCompatible(),A=e.getPixelRatio(),e.getSize(R),p&&"createProjectionLayer"in XRWebGLBinding.prototype){let pe=null,Ie=null,Se=null;x.depth&&(Se=x.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,pe=x.stencil?Qs:Js,Ie=x.stencil?Zs:yi);const Ye={colorFormat:t.RGBA8,depthFormat:Se,scaleFactor:r};u=this.getBinding(),d=u.createProjectionLayer(Ye),i.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),y=new si(d.textureWidth,d.textureHeight,{format:ln,type:Bn,depthTexture:new Uc(d.textureWidth,d.textureHeight,Ie,void 0,void 0,void 0,void 0,void 0,void 0,pe),stencilBuffer:x.stencil,colorSpace:e.outputColorSpace,samples:x.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{const pe={antialias:x.antialias,alpha:!0,depth:x.depth,stencil:x.stencil,framebufferScaleFactor:r};m=new XRWebGLLayer(i,t,pe),i.updateRenderState({baseLayer:m}),e.setPixelRatio(1),e.setSize(m.framebufferWidth,m.framebufferHeight,!1),y=new si(m.framebufferWidth,m.framebufferHeight,{format:ln,type:Bn,colorSpace:e.outputColorSpace,stencilBuffer:x.stencil,resolveDepthBuffer:m.ignoreDepthValues===!1,resolveStencilBuffer:m.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await i.requestReferenceSpace(a),tt.setContext(i),tt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function G(j){for(let Q=0;Q<j.removed.length;Q++){const pe=j.removed[Q],Ie=w.indexOf(pe);Ie>=0&&(w[Ie]=null,b[Ie].disconnect(pe))}for(let Q=0;Q<j.added.length;Q++){const pe=j.added[Q];let Ie=w.indexOf(pe);if(Ie===-1){for(let Ye=0;Ye<b.length;Ye++)if(Ye>=w.length){w.push(pe),Ie=Ye;break}else if(w[Ye]===null){w[Ye]=pe,Ie=Ye;break}if(Ie===-1)break}const Se=b[Ie];Se&&Se.connect(pe)}}const H=new C,J=new C;function te(j,Q,pe){H.setFromMatrixPosition(Q.matrixWorld),J.setFromMatrixPosition(pe.matrixWorld);const Ie=H.distanceTo(J),Se=Q.projectionMatrix.elements,Ye=pe.projectionMatrix.elements,Lt=Se[14]/(Se[10]-1),D=Se[14]/(Se[10]+1),gt=(Se[9]+1)/Se[5],Oe=(Se[9]-1)/Se[5],De=(Se[8]-1)/Se[0],ve=(Ye[8]+1)/Ye[0],pt=Lt*De,K=Lt*ve,Re=Ie/(-De+ve),Je=Re*-De;if(Q.matrixWorld.decompose(j.position,j.quaternion,j.scale),j.translateX(Je),j.translateZ(Re),j.matrixWorld.compose(j.position,j.quaternion,j.scale),j.matrixWorldInverse.copy(j.matrixWorld).invert(),Se[10]===-1)j.projectionMatrix.copy(Q.projectionMatrix),j.projectionMatrixInverse.copy(Q.projectionMatrixInverse);else{const $e=Lt+Re,P=D+Re,E=pt-Je,V=K+(Ie-Je),q=gt*D/P*$e,ee=Oe*D/P*$e;j.projectionMatrix.makePerspective(E,V,q,ee,$e,P),j.projectionMatrixInverse.copy(j.projectionMatrix).invert()}}function le(j,Q){Q===null?j.matrixWorld.copy(j.matrix):j.matrixWorld.multiplyMatrices(Q.matrixWorld,j.matrix),j.matrixWorldInverse.copy(j.matrixWorld).invert()}this.updateCamera=function(j){if(i===null)return;let Q=j.near,pe=j.far;g.texture!==null&&(g.depthNear>0&&(Q=g.depthNear),g.depthFar>0&&(pe=g.depthFar)),I.near=S.near=M.near=Q,I.far=S.far=M.far=pe,(N!==I.near||U!==I.far)&&(i.updateRenderState({depthNear:I.near,depthFar:I.far}),N=I.near,U=I.far),I.layers.mask=j.layers.mask|6,M.layers.mask=I.layers.mask&3,S.layers.mask=I.layers.mask&5;const Ie=j.parent,Se=I.cameras;le(I,Ie);for(let Ye=0;Ye<Se.length;Ye++)le(Se[Ye],Ie);Se.length===2?te(I,M,S):I.projectionMatrix.copy(M.projectionMatrix),ge(j,I,Ie)};function ge(j,Q,pe){pe===null?j.matrix.copy(Q.matrixWorld):(j.matrix.copy(pe.matrixWorld),j.matrix.invert(),j.matrix.multiply(Q.matrixWorld)),j.matrix.decompose(j.position,j.quaternion,j.scale),j.updateMatrixWorld(!0),j.projectionMatrix.copy(Q.projectionMatrix),j.projectionMatrixInverse.copy(Q.projectionMatrixInverse),j.isPerspectiveCamera&&(j.fov=xs*2*Math.atan(1/j.projectionMatrix.elements[5]),j.zoom=1)}this.getCamera=function(){return I},this.getFoveation=function(){if(!(d===null&&m===null))return c},this.setFoveation=function(j){c=j,d!==null&&(d.fixedFoveation=j),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=j)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(I)},this.getCameraTexture=function(j){return f[j]};let ze=null;function ot(j,Q){if(h=Q.getViewerPose(l||o),_=Q,h!==null){const pe=h.views;m!==null&&(e.setRenderTargetFramebuffer(y,m.framebuffer),e.setRenderTarget(y));let Ie=!1;pe.length!==I.cameras.length&&(I.cameras.length=0,Ie=!0);for(let D=0;D<pe.length;D++){const gt=pe[D];let Oe=null;if(m!==null)Oe=m.getViewport(gt);else{const ve=u.getViewSubImage(d,gt);Oe=ve.viewport,D===0&&(e.setRenderTargetTextures(y,ve.colorTexture,ve.depthStencilTexture),e.setRenderTarget(y))}let De=L[D];De===void 0&&(De=new Yt,De.layers.enable(D),De.viewport=new it,L[D]=De),De.matrix.fromArray(gt.transform.matrix),De.matrix.decompose(De.position,De.quaternion,De.scale),De.projectionMatrix.fromArray(gt.projectionMatrix),De.projectionMatrixInverse.copy(De.projectionMatrix).invert(),De.viewport.set(Oe.x,Oe.y,Oe.width,Oe.height),D===0&&(I.matrix.copy(De.matrix),I.matrix.decompose(I.position,I.quaternion,I.scale)),Ie===!0&&I.cameras.push(De)}const Se=i.enabledFeatures;if(Se&&Se.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&p){u=n.getBinding();const D=u.getDepthInformation(pe[0]);D&&D.isValid&&D.texture&&g.init(D,i.renderState)}if(Se&&Se.includes("camera-access")&&p){e.state.unbindTexture(),u=n.getBinding();for(let D=0;D<pe.length;D++){const gt=pe[D].camera;if(gt){let Oe=f[gt];Oe||(Oe=new xu,f[gt]=Oe);const De=u.getCameraImage(gt);Oe.sourceTexture=De}}}}for(let pe=0;pe<b.length;pe++){const Ie=w[pe],Se=b[pe];Ie!==null&&Se!==void 0&&Se.update(Ie,Q,l||o)}ze&&ze(j,Q),Q.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:Q}),_=null}const tt=new Tu;tt.setAnimationLoop(ot),this.setAnimationLoop=function(j){ze=j},this.dispose=function(){}}}const Ci=new _n,mx=new ke;function gx(s,e){function t(g,f){g.matrixAutoUpdate===!0&&g.updateMatrix(),f.value.copy(g.matrix)}function n(g,f){f.color.getRGB(g.fogColor.value,du(s)),f.isFog?(g.fogNear.value=f.near,g.fogFar.value=f.far):f.isFogExp2&&(g.fogDensity.value=f.density)}function i(g,f,x,v,y){f.isMeshBasicMaterial||f.isMeshLambertMaterial?r(g,f):f.isMeshToonMaterial?(r(g,f),u(g,f)):f.isMeshPhongMaterial?(r(g,f),h(g,f)):f.isMeshStandardMaterial?(r(g,f),d(g,f),f.isMeshPhysicalMaterial&&m(g,f,y)):f.isMeshMatcapMaterial?(r(g,f),_(g,f)):f.isMeshDepthMaterial?r(g,f):f.isMeshDistanceMaterial?(r(g,f),p(g,f)):f.isMeshNormalMaterial?r(g,f):f.isLineBasicMaterial?(o(g,f),f.isLineDashedMaterial&&a(g,f)):f.isPointsMaterial?c(g,f,x,v):f.isSpriteMaterial?l(g,f):f.isShadowMaterial?(g.color.value.copy(f.color),g.opacity.value=f.opacity):f.isShaderMaterial&&(f.uniformsNeedUpdate=!1)}function r(g,f){g.opacity.value=f.opacity,f.color&&g.diffuse.value.copy(f.color),f.emissive&&g.emissive.value.copy(f.emissive).multiplyScalar(f.emissiveIntensity),f.map&&(g.map.value=f.map,t(f.map,g.mapTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,t(f.alphaMap,g.alphaMapTransform)),f.bumpMap&&(g.bumpMap.value=f.bumpMap,t(f.bumpMap,g.bumpMapTransform),g.bumpScale.value=f.bumpScale,f.side===Vt&&(g.bumpScale.value*=-1)),f.normalMap&&(g.normalMap.value=f.normalMap,t(f.normalMap,g.normalMapTransform),g.normalScale.value.copy(f.normalScale),f.side===Vt&&g.normalScale.value.negate()),f.displacementMap&&(g.displacementMap.value=f.displacementMap,t(f.displacementMap,g.displacementMapTransform),g.displacementScale.value=f.displacementScale,g.displacementBias.value=f.displacementBias),f.emissiveMap&&(g.emissiveMap.value=f.emissiveMap,t(f.emissiveMap,g.emissiveMapTransform)),f.specularMap&&(g.specularMap.value=f.specularMap,t(f.specularMap,g.specularMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest);const x=e.get(f),v=x.envMap,y=x.envMapRotation;v&&(g.envMap.value=v,Ci.copy(y),Ci.x*=-1,Ci.y*=-1,Ci.z*=-1,v.isCubeTexture&&v.isRenderTargetTexture===!1&&(Ci.y*=-1,Ci.z*=-1),g.envMapRotation.value.setFromMatrix4(mx.makeRotationFromEuler(Ci)),g.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=f.reflectivity,g.ior.value=f.ior,g.refractionRatio.value=f.refractionRatio),f.lightMap&&(g.lightMap.value=f.lightMap,g.lightMapIntensity.value=f.lightMapIntensity,t(f.lightMap,g.lightMapTransform)),f.aoMap&&(g.aoMap.value=f.aoMap,g.aoMapIntensity.value=f.aoMapIntensity,t(f.aoMap,g.aoMapTransform))}function o(g,f){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,f.map&&(g.map.value=f.map,t(f.map,g.mapTransform))}function a(g,f){g.dashSize.value=f.dashSize,g.totalSize.value=f.dashSize+f.gapSize,g.scale.value=f.scale}function c(g,f,x,v){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,g.size.value=f.size*x,g.scale.value=v*.5,f.map&&(g.map.value=f.map,t(f.map,g.uvTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,t(f.alphaMap,g.alphaMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest)}function l(g,f){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,g.rotation.value=f.rotation,f.map&&(g.map.value=f.map,t(f.map,g.mapTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,t(f.alphaMap,g.alphaMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest)}function h(g,f){g.specular.value.copy(f.specular),g.shininess.value=Math.max(f.shininess,1e-4)}function u(g,f){f.gradientMap&&(g.gradientMap.value=f.gradientMap)}function d(g,f){g.metalness.value=f.metalness,f.metalnessMap&&(g.metalnessMap.value=f.metalnessMap,t(f.metalnessMap,g.metalnessMapTransform)),g.roughness.value=f.roughness,f.roughnessMap&&(g.roughnessMap.value=f.roughnessMap,t(f.roughnessMap,g.roughnessMapTransform)),f.envMap&&(g.envMapIntensity.value=f.envMapIntensity)}function m(g,f,x){g.ior.value=f.ior,f.sheen>0&&(g.sheenColor.value.copy(f.sheenColor).multiplyScalar(f.sheen),g.sheenRoughness.value=f.sheenRoughness,f.sheenColorMap&&(g.sheenColorMap.value=f.sheenColorMap,t(f.sheenColorMap,g.sheenColorMapTransform)),f.sheenRoughnessMap&&(g.sheenRoughnessMap.value=f.sheenRoughnessMap,t(f.sheenRoughnessMap,g.sheenRoughnessMapTransform))),f.clearcoat>0&&(g.clearcoat.value=f.clearcoat,g.clearcoatRoughness.value=f.clearcoatRoughness,f.clearcoatMap&&(g.clearcoatMap.value=f.clearcoatMap,t(f.clearcoatMap,g.clearcoatMapTransform)),f.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=f.clearcoatRoughnessMap,t(f.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),f.clearcoatNormalMap&&(g.clearcoatNormalMap.value=f.clearcoatNormalMap,t(f.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(f.clearcoatNormalScale),f.side===Vt&&g.clearcoatNormalScale.value.negate())),f.dispersion>0&&(g.dispersion.value=f.dispersion),f.iridescence>0&&(g.iridescence.value=f.iridescence,g.iridescenceIOR.value=f.iridescenceIOR,g.iridescenceThicknessMinimum.value=f.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=f.iridescenceThicknessRange[1],f.iridescenceMap&&(g.iridescenceMap.value=f.iridescenceMap,t(f.iridescenceMap,g.iridescenceMapTransform)),f.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=f.iridescenceThicknessMap,t(f.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),f.transmission>0&&(g.transmission.value=f.transmission,g.transmissionSamplerMap.value=x.texture,g.transmissionSamplerSize.value.set(x.width,x.height),f.transmissionMap&&(g.transmissionMap.value=f.transmissionMap,t(f.transmissionMap,g.transmissionMapTransform)),g.thickness.value=f.thickness,f.thicknessMap&&(g.thicknessMap.value=f.thicknessMap,t(f.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=f.attenuationDistance,g.attenuationColor.value.copy(f.attenuationColor)),f.anisotropy>0&&(g.anisotropyVector.value.set(f.anisotropy*Math.cos(f.anisotropyRotation),f.anisotropy*Math.sin(f.anisotropyRotation)),f.anisotropyMap&&(g.anisotropyMap.value=f.anisotropyMap,t(f.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=f.specularIntensity,g.specularColor.value.copy(f.specularColor),f.specularColorMap&&(g.specularColorMap.value=f.specularColorMap,t(f.specularColorMap,g.specularColorMapTransform)),f.specularIntensityMap&&(g.specularIntensityMap.value=f.specularIntensityMap,t(f.specularIntensityMap,g.specularIntensityMapTransform))}function _(g,f){f.matcap&&(g.matcap.value=f.matcap)}function p(g,f){const x=e.get(f).light;g.referencePosition.value.setFromMatrixPosition(x.matrixWorld),g.nearDistance.value=x.shadow.camera.near,g.farDistance.value=x.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function _x(s,e,t,n){let i={},r={},o=[];const a=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function c(x,v){const y=v.program;n.uniformBlockBinding(x,y)}function l(x,v){let y=i[x.id];y===void 0&&(_(x),y=h(x),i[x.id]=y,x.addEventListener("dispose",g));const b=v.program;n.updateUBOMapping(x,b);const w=e.render.frame;r[x.id]!==w&&(d(x),r[x.id]=w)}function h(x){const v=u();x.__bindingPointIndex=v;const y=s.createBuffer(),b=x.__size,w=x.usage;return s.bindBuffer(s.UNIFORM_BUFFER,y),s.bufferData(s.UNIFORM_BUFFER,b,w),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,v,y),y}function u(){for(let x=0;x<a;x++)if(o.indexOf(x)===-1)return o.push(x),x;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(x){const v=i[x.id],y=x.uniforms,b=x.__cache;s.bindBuffer(s.UNIFORM_BUFFER,v);for(let w=0,R=y.length;w<R;w++){const A=Array.isArray(y[w])?y[w]:[y[w]];for(let M=0,S=A.length;M<S;M++){const L=A[M];if(m(L,w,M,b)===!0){const I=L.__offset,N=Array.isArray(L.value)?L.value:[L.value];let U=0;for(let z=0;z<N.length;z++){const O=N[z],G=p(O);typeof O=="number"||typeof O=="boolean"?(L.__data[0]=O,s.bufferSubData(s.UNIFORM_BUFFER,I+U,L.__data)):O.isMatrix3?(L.__data[0]=O.elements[0],L.__data[1]=O.elements[1],L.__data[2]=O.elements[2],L.__data[3]=0,L.__data[4]=O.elements[3],L.__data[5]=O.elements[4],L.__data[6]=O.elements[5],L.__data[7]=0,L.__data[8]=O.elements[6],L.__data[9]=O.elements[7],L.__data[10]=O.elements[8],L.__data[11]=0):(O.toArray(L.__data,U),U+=G.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,I,L.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function m(x,v,y,b){const w=x.value,R=v+"_"+y;if(b[R]===void 0)return typeof w=="number"||typeof w=="boolean"?b[R]=w:b[R]=w.clone(),!0;{const A=b[R];if(typeof w=="number"||typeof w=="boolean"){if(A!==w)return b[R]=w,!0}else if(A.equals(w)===!1)return A.copy(w),!0}return!1}function _(x){const v=x.uniforms;let y=0;const b=16;for(let R=0,A=v.length;R<A;R++){const M=Array.isArray(v[R])?v[R]:[v[R]];for(let S=0,L=M.length;S<L;S++){const I=M[S],N=Array.isArray(I.value)?I.value:[I.value];for(let U=0,z=N.length;U<z;U++){const O=N[U],G=p(O),H=y%b,J=H%G.boundary,te=H+J;y+=J,te!==0&&b-te<G.storage&&(y+=b-te),I.__data=new Float32Array(G.storage/Float32Array.BYTES_PER_ELEMENT),I.__offset=y,y+=G.storage}}}const w=y%b;return w>0&&(y+=b-w),x.__size=y,x.__cache={},this}function p(x){const v={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(v.boundary=4,v.storage=4):x.isVector2?(v.boundary=8,v.storage=8):x.isVector3||x.isColor?(v.boundary=16,v.storage=12):x.isVector4?(v.boundary=16,v.storage=16):x.isMatrix3?(v.boundary=48,v.storage=48):x.isMatrix4?(v.boundary=64,v.storage=64):x.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",x),v}function g(x){const v=x.target;v.removeEventListener("dispose",g);const y=o.indexOf(v.__bindingPointIndex);o.splice(y,1),s.deleteBuffer(i[v.id]),delete i[v.id],delete r[v.id]}function f(){for(const x in i)s.deleteBuffer(i[x]);o=[],i={},r={}}return{bind:c,update:l,dispose:f}}class xx{constructor(e={}){const{canvas:t=nf(),context:n=null,depth:i=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1}=e;this.isWebGLRenderer=!0;let m;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=n.getContextAttributes().alpha}else m=o;const _=new Uint32Array(4),p=new Int32Array(4);let g=null,f=null;const x=[],v=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=_i,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const y=this;let b=!1;this._outputColorSpace=Ct;let w=0,R=0,A=null,M=-1,S=null;const L=new it,I=new it;let N=null;const U=new xe(0);let z=0,O=t.width,G=t.height,H=1,J=null,te=null;const le=new it(0,0,O,G),ge=new it(0,0,O,G);let ze=!1;const ot=new Lc;let tt=!1,j=!1;const Q=new ke,pe=new C,Ie=new it,Se={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ye=!1;function Lt(){return A===null?H:1}let D=n;function gt(T,k){return t.getContext(T,k)}try{const T={alpha:!0,depth:i,stencil:r,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${gc}`),t.addEventListener("webglcontextlost",ae,!1),t.addEventListener("webglcontextrestored",_e,!1),t.addEventListener("webglcontextcreationerror",ne,!1),D===null){const k="webgl2";if(D=gt(k,T),D===null)throw gt(k)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(T){throw console.error("THREE.WebGLRenderer: "+T.message),T}let Oe,De,ve,pt,K,Re,Je,$e,P,E,V,q,ee,Y,Te,oe,be,we,se,fe,Ne,Ee,ue,Ge;function F(){Oe=new Rg(D),Oe.init(),Ee=new hx(D,Oe),De=new Mg(D,Oe,e,Ee),ve=new cx(D,Oe),De.reversedDepthBuffer&&d&&ve.buffers.depth.setReversed(!0),pt=new Lg(D),K=new K_,Re=new lx(D,Oe,ve,K,De,Ee,pt),Je=new bg(y),$e=new Ag(y),P=new zp(D),ue=new vg(D,P),E=new Cg(D,P,pt,ue),V=new Dg(D,E,P,pt),se=new Ig(D,De,Re),oe=new Sg(K),q=new j_(y,Je,$e,Oe,De,ue,oe),ee=new gx(y,K),Y=new Z_,Te=new ix(Oe),we=new xg(y,Je,$e,ve,V,m,c),be=new ox(y,V,De),Ge=new _x(D,pt,De,ve),fe=new yg(D,Oe,pt),Ne=new Pg(D,Oe,pt),pt.programs=q.programs,y.capabilities=De,y.extensions=Oe,y.properties=K,y.renderLists=Y,y.shadowMap=be,y.state=ve,y.info=pt}F();const re=new px(y,D);this.xr=re,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const T=Oe.get("WEBGL_lose_context");T&&T.loseContext()},this.forceContextRestore=function(){const T=Oe.get("WEBGL_lose_context");T&&T.restoreContext()},this.getPixelRatio=function(){return H},this.setPixelRatio=function(T){T!==void 0&&(H=T,this.setSize(O,G,!1))},this.getSize=function(T){return T.set(O,G)},this.setSize=function(T,k,W=!0){if(re.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}O=T,G=k,t.width=Math.floor(T*H),t.height=Math.floor(k*H),W===!0&&(t.style.width=T+"px",t.style.height=k+"px"),this.setViewport(0,0,T,k)},this.getDrawingBufferSize=function(T){return T.set(O*H,G*H).floor()},this.setDrawingBufferSize=function(T,k,W){O=T,G=k,H=W,t.width=Math.floor(T*W),t.height=Math.floor(k*W),this.setViewport(0,0,T,k)},this.getCurrentViewport=function(T){return T.copy(L)},this.getViewport=function(T){return T.copy(le)},this.setViewport=function(T,k,W,X){T.isVector4?le.set(T.x,T.y,T.z,T.w):le.set(T,k,W,X),ve.viewport(L.copy(le).multiplyScalar(H).round())},this.getScissor=function(T){return T.copy(ge)},this.setScissor=function(T,k,W,X){T.isVector4?ge.set(T.x,T.y,T.z,T.w):ge.set(T,k,W,X),ve.scissor(I.copy(ge).multiplyScalar(H).round())},this.getScissorTest=function(){return ze},this.setScissorTest=function(T){ve.setScissorTest(ze=T)},this.setOpaqueSort=function(T){J=T},this.setTransparentSort=function(T){te=T},this.getClearColor=function(T){return T.copy(we.getClearColor())},this.setClearColor=function(){we.setClearColor(...arguments)},this.getClearAlpha=function(){return we.getClearAlpha()},this.setClearAlpha=function(){we.setClearAlpha(...arguments)},this.clear=function(T=!0,k=!0,W=!0){let X=0;if(T){let B=!1;if(A!==null){const ie=A.texture.format;B=ie===bc||ie===Sc||ie===Mc}if(B){const ie=A.texture.type,de=ie===Bn||ie===yi||ie===$s||ie===Zs||ie===xc||ie===vc,ye=we.getClearColor(),me=we.getClearAlpha(),Ue=ye.r,Fe=ye.g,Pe=ye.b;de?(_[0]=Ue,_[1]=Fe,_[2]=Pe,_[3]=me,D.clearBufferuiv(D.COLOR,0,_)):(p[0]=Ue,p[1]=Fe,p[2]=Pe,p[3]=me,D.clearBufferiv(D.COLOR,0,p))}else X|=D.COLOR_BUFFER_BIT}k&&(X|=D.DEPTH_BUFFER_BIT),W&&(X|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(X)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",ae,!1),t.removeEventListener("webglcontextrestored",_e,!1),t.removeEventListener("webglcontextcreationerror",ne,!1),we.dispose(),Y.dispose(),Te.dispose(),K.dispose(),Je.dispose(),$e.dispose(),V.dispose(),ue.dispose(),Ge.dispose(),q.dispose(),re.dispose(),re.removeEventListener("sessionstart",Dn),re.removeEventListener("sessionend",Qc),Si.stop()};function ae(T){T.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),b=!0}function _e(){console.log("THREE.WebGLRenderer: Context Restored."),b=!1;const T=pt.autoReset,k=be.enabled,W=be.autoUpdate,X=be.needsUpdate,B=be.type;F(),pt.autoReset=T,be.enabled=k,be.autoUpdate=W,be.needsUpdate=X,be.type=B}function ne(T){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",T.statusMessage)}function $(T){const k=T.target;k.removeEventListener("dispose",$),Me(k)}function Me(T){Be(T),K.remove(T)}function Be(T){const k=K.get(T).programs;k!==void 0&&(k.forEach(function(W){q.releaseProgram(W)}),T.isShaderMaterial&&q.releaseShaderCache(T))}this.renderBufferDirect=function(T,k,W,X,B,ie){k===null&&(k=Se);const de=B.isMesh&&B.matrixWorld.determinant()<0,ye=qu(T,k,W,X,B);ve.setMaterial(X,de);let me=W.index,Ue=1;if(X.wireframe===!0){if(me=E.getWireframeAttribute(W),me===void 0)return;Ue=2}const Fe=W.drawRange,Pe=W.attributes.position;let Qe=Fe.start*Ue,ut=(Fe.start+Fe.count)*Ue;ie!==null&&(Qe=Math.max(Qe,ie.start*Ue),ut=Math.min(ut,(ie.start+ie.count)*Ue)),me!==null?(Qe=Math.max(Qe,0),ut=Math.min(ut,me.count)):Pe!=null&&(Qe=Math.max(Qe,0),ut=Math.min(ut,Pe.count));const Et=ut-Qe;if(Et<0||Et===1/0)return;ue.setup(B,X,ye,W,me);let yt,mt=fe;if(me!==null&&(yt=P.get(me),mt=Ne,mt.setIndex(yt)),B.isMesh)X.wireframe===!0?(ve.setLineWidth(X.wireframeLinewidth*Lt()),mt.setMode(D.LINES)):mt.setMode(D.TRIANGLES);else if(B.isLine){let Le=X.linewidth;Le===void 0&&(Le=1),ve.setLineWidth(Le*Lt()),B.isLineSegments?mt.setMode(D.LINES):B.isLineLoop?mt.setMode(D.LINE_LOOP):mt.setMode(D.LINE_STRIP)}else B.isPoints?mt.setMode(D.POINTS):B.isSprite&&mt.setMode(D.TRIANGLES);if(B.isBatchedMesh)if(B._multiDrawInstances!==null)ir("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),mt.renderMultiDrawInstances(B._multiDrawStarts,B._multiDrawCounts,B._multiDrawCount,B._multiDrawInstances);else if(Oe.get("WEBGL_multi_draw"))mt.renderMultiDraw(B._multiDrawStarts,B._multiDrawCounts,B._multiDrawCount);else{const Le=B._multiDrawStarts,Mt=B._multiDrawCounts,st=B._multiDrawCount,nn=me?P.get(me).bytesPerElement:1,Hi=K.get(X).currentProgram.getUniforms();for(let sn=0;sn<st;sn++)Hi.setValue(D,"_gl_DrawID",sn),mt.render(Le[sn]/nn,Mt[sn])}else if(B.isInstancedMesh)mt.renderInstances(Qe,Et,B.count);else if(W.isInstancedBufferGeometry){const Le=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,Mt=Math.min(W.instanceCount,Le);mt.renderInstances(Qe,Et,Mt)}else mt.render(Qe,Et)};function _t(T,k,W){T.transparent===!0&&T.side===Tt&&T.forceSinglePass===!1?(T.side=Vt,T.needsUpdate=!0,dr(T,k,W),T.side=ni,T.needsUpdate=!0,dr(T,k,W),T.side=Tt):dr(T,k,W)}this.compile=function(T,k,W=null){W===null&&(W=T),f=Te.get(W),f.init(k),v.push(f),W.traverseVisible(function(B){B.isLight&&B.layers.test(k.layers)&&(f.pushLight(B),B.castShadow&&f.pushShadow(B))}),T!==W&&T.traverseVisible(function(B){B.isLight&&B.layers.test(k.layers)&&(f.pushLight(B),B.castShadow&&f.pushShadow(B))}),f.setupLights();const X=new Set;return T.traverse(function(B){if(!(B.isMesh||B.isPoints||B.isLine||B.isSprite))return;const ie=B.material;if(ie)if(Array.isArray(ie))for(let de=0;de<ie.length;de++){const ye=ie[de];_t(ye,W,B),X.add(ye)}else _t(ie,W,B),X.add(ie)}),f=v.pop(),X},this.compileAsync=function(T,k,W=null){const X=this.compile(T,k,W);return new Promise(B=>{function ie(){if(X.forEach(function(de){K.get(de).currentProgram.isReady()&&X.delete(de)}),X.size===0){B(T);return}setTimeout(ie,10)}Oe.get("KHR_parallel_shader_compile")!==null?ie():setTimeout(ie,10)})};let at=null;function Gn(T){at&&at(T)}function Dn(){Si.stop()}function Qc(){Si.start()}const Si=new Tu;Si.setAnimationLoop(Gn),typeof self<"u"&&Si.setContext(self),this.setAnimationLoop=function(T){at=T,re.setAnimationLoop(T),T===null?Si.stop():Si.start()},re.addEventListener("sessionstart",Dn),re.addEventListener("sessionend",Qc),this.render=function(T,k){if(k!==void 0&&k.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(b===!0)return;if(T.matrixWorldAutoUpdate===!0&&T.updateMatrixWorld(),k.parent===null&&k.matrixWorldAutoUpdate===!0&&k.updateMatrixWorld(),re.enabled===!0&&re.isPresenting===!0&&(re.cameraAutoUpdate===!0&&re.updateCamera(k),k=re.getCamera()),T.isScene===!0&&T.onBeforeRender(y,T,k,A),f=Te.get(T,v.length),f.init(k),v.push(f),Q.multiplyMatrices(k.projectionMatrix,k.matrixWorldInverse),ot.setFromProjectionMatrix(Q,zn,k.reversedDepth),j=this.localClippingEnabled,tt=oe.init(this.clippingPlanes,j),g=Y.get(T,x.length),g.init(),x.push(g),re.enabled===!0&&re.isPresenting===!0){const ie=y.xr.getDepthSensingMesh();ie!==null&&Mo(ie,k,-1/0,y.sortObjects)}Mo(T,k,0,y.sortObjects),g.finish(),y.sortObjects===!0&&g.sort(J,te),Ye=re.enabled===!1||re.isPresenting===!1||re.hasDepthSensing()===!1,Ye&&we.addToRenderList(g,T),this.info.render.frame++,tt===!0&&oe.beginShadows();const W=f.state.shadowsArray;be.render(W,T,k),tt===!0&&oe.endShadows(),this.info.autoReset===!0&&this.info.reset();const X=g.opaque,B=g.transmissive;if(f.setupLights(),k.isArrayCamera){const ie=k.cameras;if(B.length>0)for(let de=0,ye=ie.length;de<ye;de++){const me=ie[de];tl(X,B,T,me)}Ye&&we.render(T);for(let de=0,ye=ie.length;de<ye;de++){const me=ie[de];el(g,T,me,me.viewport)}}else B.length>0&&tl(X,B,T,k),Ye&&we.render(T),el(g,T,k);A!==null&&R===0&&(Re.updateMultisampleRenderTarget(A),Re.updateRenderTargetMipmap(A)),T.isScene===!0&&T.onAfterRender(y,T,k),ue.resetDefaultState(),M=-1,S=null,v.pop(),v.length>0?(f=v[v.length-1],tt===!0&&oe.setGlobalState(y.clippingPlanes,f.state.camera)):f=null,x.pop(),x.length>0?g=x[x.length-1]:g=null};function Mo(T,k,W,X){if(T.visible===!1)return;if(T.layers.test(k.layers)){if(T.isGroup)W=T.renderOrder;else if(T.isLOD)T.autoUpdate===!0&&T.update(k);else if(T.isLight)f.pushLight(T),T.castShadow&&f.pushShadow(T);else if(T.isSprite){if(!T.frustumCulled||ot.intersectsSprite(T)){X&&Ie.setFromMatrixPosition(T.matrixWorld).applyMatrix4(Q);const de=V.update(T),ye=T.material;ye.visible&&g.push(T,de,ye,W,Ie.z,null)}}else if((T.isMesh||T.isLine||T.isPoints)&&(!T.frustumCulled||ot.intersectsObject(T))){const de=V.update(T),ye=T.material;if(X&&(T.boundingSphere!==void 0?(T.boundingSphere===null&&T.computeBoundingSphere(),Ie.copy(T.boundingSphere.center)):(de.boundingSphere===null&&de.computeBoundingSphere(),Ie.copy(de.boundingSphere.center)),Ie.applyMatrix4(T.matrixWorld).applyMatrix4(Q)),Array.isArray(ye)){const me=de.groups;for(let Ue=0,Fe=me.length;Ue<Fe;Ue++){const Pe=me[Ue],Qe=ye[Pe.materialIndex];Qe&&Qe.visible&&g.push(T,de,Qe,W,Ie.z,Pe)}}else ye.visible&&g.push(T,de,ye,W,Ie.z,null)}}const ie=T.children;for(let de=0,ye=ie.length;de<ye;de++)Mo(ie[de],k,W,X)}function el(T,k,W,X){const B=T.opaque,ie=T.transmissive,de=T.transparent;f.setupLightsView(W),tt===!0&&oe.setGlobalState(y.clippingPlanes,W),X&&ve.viewport(L.copy(X)),B.length>0&&ur(B,k,W),ie.length>0&&ur(ie,k,W),de.length>0&&ur(de,k,W),ve.buffers.depth.setTest(!0),ve.buffers.depth.setMask(!0),ve.buffers.color.setMask(!0),ve.setPolygonOffset(!1)}function tl(T,k,W,X){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;f.state.transmissionRenderTarget[X.id]===void 0&&(f.state.transmissionRenderTarget[X.id]=new si(1,1,{generateMipmaps:!0,type:Oe.has("EXT_color_buffer_half_float")||Oe.has("EXT_color_buffer_float")?Rn:Bn,minFilter:An,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:nt.workingColorSpace}));const ie=f.state.transmissionRenderTarget[X.id],de=X.viewport||L;ie.setSize(de.z*y.transmissionResolutionScale,de.w*y.transmissionResolutionScale);const ye=y.getRenderTarget(),me=y.getActiveCubeFace(),Ue=y.getActiveMipmapLevel();y.setRenderTarget(ie),y.getClearColor(U),z=y.getClearAlpha(),z<1&&y.setClearColor(16777215,.5),y.clear(),Ye&&we.render(W);const Fe=y.toneMapping;y.toneMapping=_i;const Pe=X.viewport;if(X.viewport!==void 0&&(X.viewport=void 0),f.setupLightsView(X),tt===!0&&oe.setGlobalState(y.clippingPlanes,X),ur(T,W,X),Re.updateMultisampleRenderTarget(ie),Re.updateRenderTargetMipmap(ie),Oe.has("WEBGL_multisampled_render_to_texture")===!1){let Qe=!1;for(let ut=0,Et=k.length;ut<Et;ut++){const yt=k[ut],mt=yt.object,Le=yt.geometry,Mt=yt.material,st=yt.group;if(Mt.side===Tt&&mt.layers.test(X.layers)){const nn=Mt.side;Mt.side=Vt,Mt.needsUpdate=!0,nl(mt,W,X,Le,Mt,st),Mt.side=nn,Mt.needsUpdate=!0,Qe=!0}}Qe===!0&&(Re.updateMultisampleRenderTarget(ie),Re.updateRenderTargetMipmap(ie))}y.setRenderTarget(ye,me,Ue),y.setClearColor(U,z),Pe!==void 0&&(X.viewport=Pe),y.toneMapping=Fe}function ur(T,k,W){const X=k.isScene===!0?k.overrideMaterial:null;for(let B=0,ie=T.length;B<ie;B++){const de=T[B],ye=de.object,me=de.geometry,Ue=de.group;let Fe=de.material;Fe.allowOverride===!0&&X!==null&&(Fe=X),ye.layers.test(W.layers)&&nl(ye,k,W,me,Fe,Ue)}}function nl(T,k,W,X,B,ie){T.onBeforeRender(y,k,W,X,B,ie),T.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,T.matrixWorld),T.normalMatrix.getNormalMatrix(T.modelViewMatrix),B.onBeforeRender(y,k,W,X,T,ie),B.transparent===!0&&B.side===Tt&&B.forceSinglePass===!1?(B.side=Vt,B.needsUpdate=!0,y.renderBufferDirect(W,k,X,B,T,ie),B.side=ni,B.needsUpdate=!0,y.renderBufferDirect(W,k,X,B,T,ie),B.side=Tt):y.renderBufferDirect(W,k,X,B,T,ie),T.onAfterRender(y,k,W,X,B,ie)}function dr(T,k,W){k.isScene!==!0&&(k=Se);const X=K.get(T),B=f.state.lights,ie=f.state.shadowsArray,de=B.state.version,ye=q.getParameters(T,B.state,ie,k,W),me=q.getProgramCacheKey(ye);let Ue=X.programs;X.environment=T.isMeshStandardMaterial?k.environment:null,X.fog=k.fog,X.envMap=(T.isMeshStandardMaterial?$e:Je).get(T.envMap||X.environment),X.envMapRotation=X.environment!==null&&T.envMap===null?k.environmentRotation:T.envMapRotation,Ue===void 0&&(T.addEventListener("dispose",$),Ue=new Map,X.programs=Ue);let Fe=Ue.get(me);if(Fe!==void 0){if(X.currentProgram===Fe&&X.lightsStateVersion===de)return sl(T,ye),Fe}else ye.uniforms=q.getUniforms(T),T.onBeforeCompile(ye,y),Fe=q.acquireProgram(ye,me),Ue.set(me,Fe),X.uniforms=ye.uniforms;const Pe=X.uniforms;return(!T.isShaderMaterial&&!T.isRawShaderMaterial||T.clipping===!0)&&(Pe.clippingPlanes=oe.uniform),sl(T,ye),X.needsLights=ju(T),X.lightsStateVersion=de,X.needsLights&&(Pe.ambientLightColor.value=B.state.ambient,Pe.lightProbe.value=B.state.probe,Pe.directionalLights.value=B.state.directional,Pe.directionalLightShadows.value=B.state.directionalShadow,Pe.spotLights.value=B.state.spot,Pe.spotLightShadows.value=B.state.spotShadow,Pe.rectAreaLights.value=B.state.rectArea,Pe.ltc_1.value=B.state.rectAreaLTC1,Pe.ltc_2.value=B.state.rectAreaLTC2,Pe.pointLights.value=B.state.point,Pe.pointLightShadows.value=B.state.pointShadow,Pe.hemisphereLights.value=B.state.hemi,Pe.directionalShadowMap.value=B.state.directionalShadowMap,Pe.directionalShadowMatrix.value=B.state.directionalShadowMatrix,Pe.spotShadowMap.value=B.state.spotShadowMap,Pe.spotLightMatrix.value=B.state.spotLightMatrix,Pe.spotLightMap.value=B.state.spotLightMap,Pe.pointShadowMap.value=B.state.pointShadowMap,Pe.pointShadowMatrix.value=B.state.pointShadowMatrix),X.currentProgram=Fe,X.uniformsList=null,Fe}function il(T){if(T.uniformsList===null){const k=T.currentProgram.getUniforms();T.uniformsList=Kr.seqWithValue(k.seq,T.uniforms)}return T.uniformsList}function sl(T,k){const W=K.get(T);W.outputColorSpace=k.outputColorSpace,W.batching=k.batching,W.batchingColor=k.batchingColor,W.instancing=k.instancing,W.instancingColor=k.instancingColor,W.instancingMorph=k.instancingMorph,W.skinning=k.skinning,W.morphTargets=k.morphTargets,W.morphNormals=k.morphNormals,W.morphColors=k.morphColors,W.morphTargetsCount=k.morphTargetsCount,W.numClippingPlanes=k.numClippingPlanes,W.numIntersection=k.numClipIntersection,W.vertexAlphas=k.vertexAlphas,W.vertexTangents=k.vertexTangents,W.toneMapping=k.toneMapping}function qu(T,k,W,X,B){k.isScene!==!0&&(k=Se),Re.resetTextureUnits();const ie=k.fog,de=X.isMeshStandardMaterial?k.environment:null,ye=A===null?y.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:jt,me=(X.isMeshStandardMaterial?$e:Je).get(X.envMap||de),Ue=X.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Fe=!!W.attributes.tangent&&(!!X.normalMap||X.anisotropy>0),Pe=!!W.morphAttributes.position,Qe=!!W.morphAttributes.normal,ut=!!W.morphAttributes.color;let Et=_i;X.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(Et=y.toneMapping);const yt=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,mt=yt!==void 0?yt.length:0,Le=K.get(X),Mt=f.state.lights;if(tt===!0&&(j===!0||T!==S)){const Kt=T===S&&X.id===M;oe.setState(X,T,Kt)}let st=!1;X.version===Le.__version?(Le.needsLights&&Le.lightsStateVersion!==Mt.state.version||Le.outputColorSpace!==ye||B.isBatchedMesh&&Le.batching===!1||!B.isBatchedMesh&&Le.batching===!0||B.isBatchedMesh&&Le.batchingColor===!0&&B.colorTexture===null||B.isBatchedMesh&&Le.batchingColor===!1&&B.colorTexture!==null||B.isInstancedMesh&&Le.instancing===!1||!B.isInstancedMesh&&Le.instancing===!0||B.isSkinnedMesh&&Le.skinning===!1||!B.isSkinnedMesh&&Le.skinning===!0||B.isInstancedMesh&&Le.instancingColor===!0&&B.instanceColor===null||B.isInstancedMesh&&Le.instancingColor===!1&&B.instanceColor!==null||B.isInstancedMesh&&Le.instancingMorph===!0&&B.morphTexture===null||B.isInstancedMesh&&Le.instancingMorph===!1&&B.morphTexture!==null||Le.envMap!==me||X.fog===!0&&Le.fog!==ie||Le.numClippingPlanes!==void 0&&(Le.numClippingPlanes!==oe.numPlanes||Le.numIntersection!==oe.numIntersection)||Le.vertexAlphas!==Ue||Le.vertexTangents!==Fe||Le.morphTargets!==Pe||Le.morphNormals!==Qe||Le.morphColors!==ut||Le.toneMapping!==Et||Le.morphTargetsCount!==mt)&&(st=!0):(st=!0,Le.__version=X.version);let nn=Le.currentProgram;st===!0&&(nn=dr(X,k,B));let Hi=!1,sn=!1,Cs=!1;const St=nn.getUniforms(),un=Le.uniforms;if(ve.useProgram(nn.program)&&(Hi=!0,sn=!0,Cs=!0),X.id!==M&&(M=X.id,sn=!0),Hi||S!==T){ve.buffers.depth.getReversed()&&T.reversedDepth!==!0&&(T._reversedDepth=!0,T.updateProjectionMatrix()),St.setValue(D,"projectionMatrix",T.projectionMatrix),St.setValue(D,"viewMatrix",T.matrixWorldInverse);const Qt=St.map.cameraPosition;Qt!==void 0&&Qt.setValue(D,pe.setFromMatrixPosition(T.matrixWorld)),De.logarithmicDepthBuffer&&St.setValue(D,"logDepthBufFC",2/(Math.log(T.far+1)/Math.LN2)),(X.isMeshPhongMaterial||X.isMeshToonMaterial||X.isMeshLambertMaterial||X.isMeshBasicMaterial||X.isMeshStandardMaterial||X.isShaderMaterial)&&St.setValue(D,"isOrthographic",T.isOrthographicCamera===!0),S!==T&&(S=T,sn=!0,Cs=!0)}if(B.isSkinnedMesh){St.setOptional(D,B,"bindMatrix"),St.setOptional(D,B,"bindMatrixInverse");const Kt=B.skeleton;Kt&&(Kt.boneTexture===null&&Kt.computeBoneTexture(),St.setValue(D,"boneTexture",Kt.boneTexture,Re))}B.isBatchedMesh&&(St.setOptional(D,B,"batchingTexture"),St.setValue(D,"batchingTexture",B._matricesTexture,Re),St.setOptional(D,B,"batchingIdTexture"),St.setValue(D,"batchingIdTexture",B._indirectTexture,Re),St.setOptional(D,B,"batchingColorTexture"),B._colorsTexture!==null&&St.setValue(D,"batchingColorTexture",B._colorsTexture,Re));const dn=W.morphAttributes;if((dn.position!==void 0||dn.normal!==void 0||dn.color!==void 0)&&se.update(B,W,nn),(sn||Le.receiveShadow!==B.receiveShadow)&&(Le.receiveShadow=B.receiveShadow,St.setValue(D,"receiveShadow",B.receiveShadow)),X.isMeshGouraudMaterial&&X.envMap!==null&&(un.envMap.value=me,un.flipEnvMap.value=me.isCubeTexture&&me.isRenderTargetTexture===!1?-1:1),X.isMeshStandardMaterial&&X.envMap===null&&k.environment!==null&&(un.envMapIntensity.value=k.environmentIntensity),sn&&(St.setValue(D,"toneMappingExposure",y.toneMappingExposure),Le.needsLights&&Yu(un,Cs),ie&&X.fog===!0&&ee.refreshFogUniforms(un,ie),ee.refreshMaterialUniforms(un,X,H,G,f.state.transmissionRenderTarget[T.id]),Kr.upload(D,il(Le),un,Re)),X.isShaderMaterial&&X.uniformsNeedUpdate===!0&&(Kr.upload(D,il(Le),un,Re),X.uniformsNeedUpdate=!1),X.isSpriteMaterial&&St.setValue(D,"center",B.center),St.setValue(D,"modelViewMatrix",B.modelViewMatrix),St.setValue(D,"normalMatrix",B.normalMatrix),St.setValue(D,"modelMatrix",B.matrixWorld),X.isShaderMaterial||X.isRawShaderMaterial){const Kt=X.uniformsGroups;for(let Qt=0,So=Kt.length;Qt<So;Qt++){const bi=Kt[Qt];Ge.update(bi,nn),Ge.bind(bi,nn)}}return nn}function Yu(T,k){T.ambientLightColor.needsUpdate=k,T.lightProbe.needsUpdate=k,T.directionalLights.needsUpdate=k,T.directionalLightShadows.needsUpdate=k,T.pointLights.needsUpdate=k,T.pointLightShadows.needsUpdate=k,T.spotLights.needsUpdate=k,T.spotLightShadows.needsUpdate=k,T.rectAreaLights.needsUpdate=k,T.hemisphereLights.needsUpdate=k}function ju(T){return T.isMeshLambertMaterial||T.isMeshToonMaterial||T.isMeshPhongMaterial||T.isMeshStandardMaterial||T.isShadowMaterial||T.isShaderMaterial&&T.lights===!0}this.getActiveCubeFace=function(){return w},this.getActiveMipmapLevel=function(){return R},this.getRenderTarget=function(){return A},this.setRenderTargetTextures=function(T,k,W){const X=K.get(T);X.__autoAllocateDepthBuffer=T.resolveDepthBuffer===!1,X.__autoAllocateDepthBuffer===!1&&(X.__useRenderToTexture=!1),K.get(T.texture).__webglTexture=k,K.get(T.depthTexture).__webglTexture=X.__autoAllocateDepthBuffer?void 0:W,X.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(T,k){const W=K.get(T);W.__webglFramebuffer=k,W.__useDefaultFramebuffer=k===void 0};const Ku=D.createFramebuffer();this.setRenderTarget=function(T,k=0,W=0){A=T,w=k,R=W;let X=!0,B=null,ie=!1,de=!1;if(T){const me=K.get(T);if(me.__useDefaultFramebuffer!==void 0)ve.bindFramebuffer(D.FRAMEBUFFER,null),X=!1;else if(me.__webglFramebuffer===void 0)Re.setupRenderTarget(T);else if(me.__hasExternalTextures)Re.rebindTextures(T,K.get(T.texture).__webglTexture,K.get(T.depthTexture).__webglTexture);else if(T.depthBuffer){const Pe=T.depthTexture;if(me.__boundDepthTexture!==Pe){if(Pe!==null&&K.has(Pe)&&(T.width!==Pe.image.width||T.height!==Pe.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Re.setupDepthRenderbuffer(T)}}const Ue=T.texture;(Ue.isData3DTexture||Ue.isDataArrayTexture||Ue.isCompressedArrayTexture)&&(de=!0);const Fe=K.get(T).__webglFramebuffer;T.isWebGLCubeRenderTarget?(Array.isArray(Fe[k])?B=Fe[k][W]:B=Fe[k],ie=!0):T.samples>0&&Re.useMultisampledRTT(T)===!1?B=K.get(T).__webglMultisampledFramebuffer:Array.isArray(Fe)?B=Fe[W]:B=Fe,L.copy(T.viewport),I.copy(T.scissor),N=T.scissorTest}else L.copy(le).multiplyScalar(H).floor(),I.copy(ge).multiplyScalar(H).floor(),N=ze;if(W!==0&&(B=Ku),ve.bindFramebuffer(D.FRAMEBUFFER,B)&&X&&ve.drawBuffers(T,B),ve.viewport(L),ve.scissor(I),ve.setScissorTest(N),ie){const me=K.get(T.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+k,me.__webglTexture,W)}else if(de){const me=k;for(let Ue=0;Ue<T.textures.length;Ue++){const Fe=K.get(T.textures[Ue]);D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0+Ue,Fe.__webglTexture,W,me)}}else if(T!==null&&W!==0){const me=K.get(T.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,me.__webglTexture,W)}M=-1},this.readRenderTargetPixels=function(T,k,W,X,B,ie,de,ye=0){if(!(T&&T.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let me=K.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&de!==void 0&&(me=me[de]),me){ve.bindFramebuffer(D.FRAMEBUFFER,me);try{const Ue=T.textures[ye],Fe=Ue.format,Pe=Ue.type;if(!De.textureFormatReadable(Fe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!De.textureTypeReadable(Pe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}k>=0&&k<=T.width-X&&W>=0&&W<=T.height-B&&(T.textures.length>1&&D.readBuffer(D.COLOR_ATTACHMENT0+ye),D.readPixels(k,W,X,B,Ee.convert(Fe),Ee.convert(Pe),ie))}finally{const Ue=A!==null?K.get(A).__webglFramebuffer:null;ve.bindFramebuffer(D.FRAMEBUFFER,Ue)}}},this.readRenderTargetPixelsAsync=async function(T,k,W,X,B,ie,de,ye=0){if(!(T&&T.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let me=K.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&de!==void 0&&(me=me[de]),me)if(k>=0&&k<=T.width-X&&W>=0&&W<=T.height-B){ve.bindFramebuffer(D.FRAMEBUFFER,me);const Ue=T.textures[ye],Fe=Ue.format,Pe=Ue.type;if(!De.textureFormatReadable(Fe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!De.textureTypeReadable(Pe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Qe=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,Qe),D.bufferData(D.PIXEL_PACK_BUFFER,ie.byteLength,D.STREAM_READ),T.textures.length>1&&D.readBuffer(D.COLOR_ATTACHMENT0+ye),D.readPixels(k,W,X,B,Ee.convert(Fe),Ee.convert(Pe),0);const ut=A!==null?K.get(A).__webglFramebuffer:null;ve.bindFramebuffer(D.FRAMEBUFFER,ut);const Et=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await sf(D,Et,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,Qe),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,ie),D.deleteBuffer(Qe),D.deleteSync(Et),ie}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(T,k=null,W=0){const X=Math.pow(2,-W),B=Math.floor(T.image.width*X),ie=Math.floor(T.image.height*X),de=k!==null?k.x:0,ye=k!==null?k.y:0;Re.setTexture2D(T,0),D.copyTexSubImage2D(D.TEXTURE_2D,W,0,0,de,ye,B,ie),ve.unbindTexture()};const $u=D.createFramebuffer(),Zu=D.createFramebuffer();this.copyTextureToTexture=function(T,k,W=null,X=null,B=0,ie=null){ie===null&&(B!==0?(ir("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ie=B,B=0):ie=0);let de,ye,me,Ue,Fe,Pe,Qe,ut,Et;const yt=T.isCompressedTexture?T.mipmaps[ie]:T.image;if(W!==null)de=W.max.x-W.min.x,ye=W.max.y-W.min.y,me=W.isBox3?W.max.z-W.min.z:1,Ue=W.min.x,Fe=W.min.y,Pe=W.isBox3?W.min.z:0;else{const dn=Math.pow(2,-B);de=Math.floor(yt.width*dn),ye=Math.floor(yt.height*dn),T.isDataArrayTexture?me=yt.depth:T.isData3DTexture?me=Math.floor(yt.depth*dn):me=1,Ue=0,Fe=0,Pe=0}X!==null?(Qe=X.x,ut=X.y,Et=X.z):(Qe=0,ut=0,Et=0);const mt=Ee.convert(k.format),Le=Ee.convert(k.type);let Mt;k.isData3DTexture?(Re.setTexture3D(k,0),Mt=D.TEXTURE_3D):k.isDataArrayTexture||k.isCompressedArrayTexture?(Re.setTexture2DArray(k,0),Mt=D.TEXTURE_2D_ARRAY):(Re.setTexture2D(k,0),Mt=D.TEXTURE_2D),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,k.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,k.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,k.unpackAlignment);const st=D.getParameter(D.UNPACK_ROW_LENGTH),nn=D.getParameter(D.UNPACK_IMAGE_HEIGHT),Hi=D.getParameter(D.UNPACK_SKIP_PIXELS),sn=D.getParameter(D.UNPACK_SKIP_ROWS),Cs=D.getParameter(D.UNPACK_SKIP_IMAGES);D.pixelStorei(D.UNPACK_ROW_LENGTH,yt.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,yt.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Ue),D.pixelStorei(D.UNPACK_SKIP_ROWS,Fe),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Pe);const St=T.isDataArrayTexture||T.isData3DTexture,un=k.isDataArrayTexture||k.isData3DTexture;if(T.isDepthTexture){const dn=K.get(T),Kt=K.get(k),Qt=K.get(dn.__renderTarget),So=K.get(Kt.__renderTarget);ve.bindFramebuffer(D.READ_FRAMEBUFFER,Qt.__webglFramebuffer),ve.bindFramebuffer(D.DRAW_FRAMEBUFFER,So.__webglFramebuffer);for(let bi=0;bi<me;bi++)St&&(D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,K.get(T).__webglTexture,B,Pe+bi),D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,K.get(k).__webglTexture,ie,Et+bi)),D.blitFramebuffer(Ue,Fe,de,ye,Qe,ut,de,ye,D.DEPTH_BUFFER_BIT,D.NEAREST);ve.bindFramebuffer(D.READ_FRAMEBUFFER,null),ve.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else if(B!==0||T.isRenderTargetTexture||K.has(T)){const dn=K.get(T),Kt=K.get(k);ve.bindFramebuffer(D.READ_FRAMEBUFFER,$u),ve.bindFramebuffer(D.DRAW_FRAMEBUFFER,Zu);for(let Qt=0;Qt<me;Qt++)St?D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,dn.__webglTexture,B,Pe+Qt):D.framebufferTexture2D(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,dn.__webglTexture,B),un?D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Kt.__webglTexture,ie,Et+Qt):D.framebufferTexture2D(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,Kt.__webglTexture,ie),B!==0?D.blitFramebuffer(Ue,Fe,de,ye,Qe,ut,de,ye,D.COLOR_BUFFER_BIT,D.NEAREST):un?D.copyTexSubImage3D(Mt,ie,Qe,ut,Et+Qt,Ue,Fe,de,ye):D.copyTexSubImage2D(Mt,ie,Qe,ut,Ue,Fe,de,ye);ve.bindFramebuffer(D.READ_FRAMEBUFFER,null),ve.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else un?T.isDataTexture||T.isData3DTexture?D.texSubImage3D(Mt,ie,Qe,ut,Et,de,ye,me,mt,Le,yt.data):k.isCompressedArrayTexture?D.compressedTexSubImage3D(Mt,ie,Qe,ut,Et,de,ye,me,mt,yt.data):D.texSubImage3D(Mt,ie,Qe,ut,Et,de,ye,me,mt,Le,yt):T.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,ie,Qe,ut,de,ye,mt,Le,yt.data):T.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,ie,Qe,ut,yt.width,yt.height,mt,yt.data):D.texSubImage2D(D.TEXTURE_2D,ie,Qe,ut,de,ye,mt,Le,yt);D.pixelStorei(D.UNPACK_ROW_LENGTH,st),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,nn),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Hi),D.pixelStorei(D.UNPACK_SKIP_ROWS,sn),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Cs),ie===0&&k.generateMipmaps&&D.generateMipmap(Mt),ve.unbindTexture()},this.initRenderTarget=function(T){K.get(T).__webglFramebuffer===void 0&&Re.setupRenderTarget(T)},this.initTexture=function(T){T.isCubeTexture?Re.setTextureCube(T,0):T.isData3DTexture?Re.setTexture3D(T,0):T.isDataArrayTexture||T.isCompressedArrayTexture?Re.setTexture2DArray(T,0):Re.setTexture2D(T,0),ve.unbindTexture()},this.resetState=function(){w=0,R=0,A=null,ve.reset(),ue.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return zn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=nt._getDrawingBufferColorSpace(e),t.unpackColorSpace=nt._getUnpackColorSpace()}}class vx extends xp{constructor(e){super(e),this.type=Rn}parse(e){const o=function(A,M){switch(A){case 1:throw new Error("THREE.HDRLoader: Read Error: "+(M||""));case 2:throw new Error("THREE.HDRLoader: Write Error: "+(M||""));case 3:throw new Error("THREE.HDRLoader: Bad File Format: "+(M||""));default:case 4:throw new Error("THREE.HDRLoader: Memory Error: "+(M||""))}},u=function(A,M,S){M=M||1024;let I=A.pos,N=-1,U=0,z="",O=String.fromCharCode.apply(null,new Uint16Array(A.subarray(I,I+128)));for(;0>(N=O.indexOf(`
`))&&U<M&&I<A.byteLength;)z+=O,U+=O.length,I+=128,O+=String.fromCharCode.apply(null,new Uint16Array(A.subarray(I,I+128)));return-1<N?(A.pos+=U+N+1,z+O.slice(0,N)):!1},d=function(A){const M=/^#\?(\S+)/,S=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,L=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,I=/^\s*FORMAT=(\S+)\s*$/,N=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,U={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0};let z,O;for((A.pos>=A.byteLength||!(z=u(A)))&&o(1,"no header found"),(O=z.match(M))||o(3,"bad initial token"),U.valid|=1,U.programtype=O[1],U.string+=z+`
`;z=u(A),z!==!1;){if(U.string+=z+`
`,z.charAt(0)==="#"){U.comments+=z+`
`;continue}if((O=z.match(S))&&(U.gamma=parseFloat(O[1])),(O=z.match(L))&&(U.exposure=parseFloat(O[1])),(O=z.match(I))&&(U.valid|=2,U.format=O[1]),(O=z.match(N))&&(U.valid|=4,U.height=parseInt(O[1],10),U.width=parseInt(O[2],10)),U.valid&2&&U.valid&4)break}return U.valid&2||o(3,"missing format specifier"),U.valid&4||o(3,"missing image size specifier"),U},m=function(A,M,S){const L=M;if(L<8||L>32767||A[0]!==2||A[1]!==2||A[2]&128)return new Uint8Array(A);L!==(A[2]<<8|A[3])&&o(3,"wrong scanline width");const I=new Uint8Array(4*M*S);I.length||o(4,"unable to allocate buffer space");let N=0,U=0;const z=4*L,O=new Uint8Array(4),G=new Uint8Array(z);let H=S;for(;H>0&&U<A.byteLength;){U+4>A.byteLength&&o(1),O[0]=A[U++],O[1]=A[U++],O[2]=A[U++],O[3]=A[U++],(O[0]!=2||O[1]!=2||(O[2]<<8|O[3])!=L)&&o(3,"bad rgbe scanline format");let J=0,te;for(;J<z&&U<A.byteLength;){te=A[U++];const ge=te>128;if(ge&&(te-=128),(te===0||J+te>z)&&o(3,"bad scanline data"),ge){const ze=A[U++];for(let ot=0;ot<te;ot++)G[J++]=ze}else G.set(A.subarray(U,U+te),J),J+=te,U+=te}const le=L;for(let ge=0;ge<le;ge++){let ze=0;I[N]=G[ge+ze],ze+=L,I[N+1]=G[ge+ze],ze+=L,I[N+2]=G[ge+ze],ze+=L,I[N+3]=G[ge+ze],N+=4}H--}return I},_=function(A,M,S,L){const I=A[M+3],N=Math.pow(2,I-128)/255;S[L+0]=A[M+0]*N,S[L+1]=A[M+1]*N,S[L+2]=A[M+2]*N,S[L+3]=1},p=function(A,M,S,L){const I=A[M+3],N=Math.pow(2,I-128)/255;S[L+0]=Mr.toHalfFloat(Math.min(A[M+0]*N,65504)),S[L+1]=Mr.toHalfFloat(Math.min(A[M+1]*N,65504)),S[L+2]=Mr.toHalfFloat(Math.min(A[M+2]*N,65504)),S[L+3]=Mr.toHalfFloat(1)},g=new Uint8Array(e);g.pos=0;const f=d(g),x=f.width,v=f.height,y=m(g.subarray(g.pos),x,v);let b,w,R;switch(this.type){case en:R=y.length/4;const A=new Float32Array(R*4);for(let S=0;S<R;S++)_(y,S*4,A,S*4);b=A,w=en;break;case Rn:R=y.length/4;const M=new Uint16Array(R*4);for(let S=0;S<R;S++)p(y,S*4,M,S*4);b=M,w=Rn;break;default:throw new Error("THREE.HDRLoader: Unsupported type: "+this.type)}return{width:x,height:v,data:b,header:f.string,gamma:f.gamma,exposure:f.exposure,type:w}}setDataType(e){return this.type=e,this}load(e,t,n,i){function r(o,a){switch(o.type){case en:case Rn:o.colorSpace=jt,o.minFilter=Dt,o.magFilter=Dt,o.generateMipmaps=!1,o.flipY=!0;break}t&&t(o,a)}return super.load(e,r,n,i)}}class yx extends vx{constructor(e){console.warn("RGBELoader has been deprecated. Please use HDRLoader instead."),super(e)}}function Lu(s,e=!1){const t=s[0].index!==null,n=new Set(Object.keys(s[0].attributes)),i=new Set(Object.keys(s[0].morphAttributes)),r={},o={},a=s[0].morphTargetsRelative,c=new At;let l=0;for(let h=0;h<s.length;++h){const u=s[h];let d=0;if(t!==(u.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const m in u.attributes){if(!n.has(m))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+m+'" attribute exists among all geometries, or in none of them.'),null;r[m]===void 0&&(r[m]=[]),r[m].push(u.attributes[m]),d++}if(d!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(a!==u.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const m in u.morphAttributes){if(!i.has(m))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;o[m]===void 0&&(o[m]=[]),o[m].push(u.morphAttributes[m])}if(e){let m;if(t)m=u.index.count;else if(u.attributes.position!==void 0)m=u.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;c.addGroup(l,m,h),l+=m}}if(t){let h=0;const u=[];for(let d=0;d<s.length;++d){const m=s[d].index;for(let _=0;_<m.count;++_)u.push(m.getX(_)+h);h+=s[d].attributes.position.count}c.setIndex(u)}for(const h in r){const u=wh(r[h]);if(!u)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;c.setAttribute(h,u)}for(const h in o){const u=o[h][0].length;if(u===0)break;c.morphAttributes=c.morphAttributes||{},c.morphAttributes[h]=[];for(let d=0;d<u;++d){const m=[];for(let p=0;p<o[h].length;++p)m.push(o[h][p][d]);const _=wh(m);if(!_)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;c.morphAttributes[h].push(_)}}return c}function wh(s){let e,t,n,i=-1,r=0;for(let l=0;l<s.length;++l){const h=s[l];if(e===void 0&&(e=h.array.constructor),e!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=h.itemSize),t!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=h.gpuType),i!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;r+=h.count*t}const o=new e(r),a=new wt(o,t,n);let c=0;for(let l=0;l<s.length;++l){const h=s[l];if(h.isInterleavedBufferAttribute){const u=c/t;for(let d=0,m=h.count;d<m;d++)for(let _=0;_<t;_++){const p=h.getComponent(d,_);a.setComponent(d+u,_,p)}}else o.set(h.array,c);c+=h.count*t}return i!==void 0&&(a.gpuType=i),a}function Eh(s,e){if(e===Rd)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),s;if(e===nc||e===ru){let t=s.getIndex();if(t===null){const o=[],a=s.getAttribute("position");if(a!==void 0){for(let c=0;c<a.count;c++)o.push(c);s.setIndex(o),t=s.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),s}const n=t.count-2,i=[];if(e===nc)for(let o=1;o<=n;o++)i.push(t.getX(0)),i.push(t.getX(o)),i.push(t.getX(o+1));else for(let o=0;o<n;o++)o%2===0?(i.push(t.getX(o)),i.push(t.getX(o+1)),i.push(t.getX(o+2))):(i.push(t.getX(o+2)),i.push(t.getX(o+1)),i.push(t.getX(o)));i.length/3!==n&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");const r=s.clone();return r.setIndex(i),r.clearGroups(),r}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),s}class aa extends Bi{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new Ex(t)}),this.register(function(t){return new Tx(t)}),this.register(function(t){return new Nx(t)}),this.register(function(t){return new Fx(t)}),this.register(function(t){return new zx(t)}),this.register(function(t){return new Rx(t)}),this.register(function(t){return new Cx(t)}),this.register(function(t){return new Px(t)}),this.register(function(t){return new Lx(t)}),this.register(function(t){return new wx(t)}),this.register(function(t){return new Ix(t)}),this.register(function(t){return new Ax(t)}),this.register(function(t){return new Ux(t)}),this.register(function(t){return new Dx(t)}),this.register(function(t){return new Sx(t)}),this.register(function(t){return new Ox(t)}),this.register(function(t){return new kx(t)})}load(e,t,n,i){const r=this;let o;if(this.resourcePath!=="")o=this.resourcePath;else if(this.path!==""){const l=js.extractUrlBase(e);o=js.resolveURL(l,this.path)}else o=js.extractUrlBase(e);this.manager.itemStart(e);const a=function(l){i?i(l):console.error(l),r.manager.itemError(e),r.manager.itemEnd(e)},c=new Bc(this.manager);c.setPath(this.path),c.setResponseType("arraybuffer"),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(l){try{r.parse(l,o,function(h){t(h),r.manager.itemEnd(e)},a)}catch(h){a(h)}},n,a)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,i){let r;const o={},a={},c=new TextDecoder;if(typeof e=="string")r=JSON.parse(e);else if(e instanceof ArrayBuffer)if(c.decode(new Uint8Array(e,0,4))===Iu){try{o[Ze.KHR_BINARY_GLTF]=new Bx(e)}catch(u){i&&i(u);return}r=JSON.parse(o[Ze.KHR_BINARY_GLTF].content)}else r=JSON.parse(c.decode(e));else r=e;if(r.asset===void 0||r.asset.version[0]<2){i&&i(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}const l=new Qx(r,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});l.fileLoader.setRequestHeader(this.requestHeader);for(let h=0;h<this.pluginCallbacks.length;h++){const u=this.pluginCallbacks[h](l);u.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),a[u.name]=u,o[u.name]=!0}if(r.extensionsUsed)for(let h=0;h<r.extensionsUsed.length;++h){const u=r.extensionsUsed[h],d=r.extensionsRequired||[];switch(u){case Ze.KHR_MATERIALS_UNLIT:o[u]=new bx;break;case Ze.KHR_DRACO_MESH_COMPRESSION:o[u]=new Hx(r,this.dracoLoader);break;case Ze.KHR_TEXTURE_TRANSFORM:o[u]=new Vx;break;case Ze.KHR_MESH_QUANTIZATION:o[u]=new Gx;break;default:d.indexOf(u)>=0&&a[u]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+u+'".')}}l.setExtensions(o),l.setPlugins(a),l.parse(n,i)}parseAsync(e,t){const n=this;return new Promise(function(i,r){n.parse(e,t,i,r)})}}function Mx(){let s={};return{get:function(e){return s[e]},add:function(e,t){s[e]=t},remove:function(e){delete s[e]},removeAll:function(){s={}}}}const Ze={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"};class Sx{constructor(e){this.parser=e,this.name=Ze.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){const e=this.parser,t=this.parser.json.nodes||[];for(let n=0,i=t.length;n<i;n++){const r=t[n];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){const t=this.parser,n="light:"+e;let i=t.cache.get(n);if(i)return i;const r=t.json,c=((r.extensions&&r.extensions[this.name]||{}).lights||[])[e];let l;const h=new xe(16777215);c.color!==void 0&&h.setRGB(c.color[0],c.color[1],c.color[2],jt);const u=c.range!==void 0?c.range:0;switch(c.type){case"directional":l=new Eu(h),l.target.position.set(0,0,-1),l.add(l.target);break;case"point":l=new bp(h),l.distance=u;break;case"spot":l=new Mp(h),l.distance=u,c.spot=c.spot||{},c.spot.innerConeAngle=c.spot.innerConeAngle!==void 0?c.spot.innerConeAngle:0,c.spot.outerConeAngle=c.spot.outerConeAngle!==void 0?c.spot.outerConeAngle:Math.PI/4,l.angle=c.spot.outerConeAngle,l.penumbra=1-c.spot.innerConeAngle/c.spot.outerConeAngle,l.target.position.set(0,0,-1),l.add(l.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+c.type)}return l.position.set(0,0,0),Nn(l,c),c.intensity!==void 0&&(l.intensity=c.intensity),l.name=t.createUniqueName(c.name||"light_"+e),i=Promise.resolve(l),t.cache.add(n,i),i}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){const t=this,n=this.parser,r=n.json.nodes[e],a=(r.extensions&&r.extensions[this.name]||{}).light;return a===void 0?null:this._loadLight(a).then(function(c){return n._getNodeRef(t.cache,a,c)})}}class bx{constructor(){this.name=Ze.KHR_MATERIALS_UNLIT}getMaterialType(){return zi}extendParams(e,t,n){const i=[];e.color=new xe(1,1,1),e.opacity=1;const r=t.pbrMetallicRoughness;if(r){if(Array.isArray(r.baseColorFactor)){const o=r.baseColorFactor;e.color.setRGB(o[0],o[1],o[2],jt),e.opacity=o[3]}r.baseColorTexture!==void 0&&i.push(n.assignTexture(e,"map",r.baseColorTexture,Ct))}return Promise.all(i)}}class wx{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){const i=this.parser.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=i.extensions[this.name].emissiveStrength;return r!==void 0&&(t.emissiveIntensity=r),Promise.resolve()}}class Ex{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Vn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];if(o.clearcoatFactor!==void 0&&(t.clearcoat=o.clearcoatFactor),o.clearcoatTexture!==void 0&&r.push(n.assignTexture(t,"clearcoatMap",o.clearcoatTexture)),o.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=o.clearcoatRoughnessFactor),o.clearcoatRoughnessTexture!==void 0&&r.push(n.assignTexture(t,"clearcoatRoughnessMap",o.clearcoatRoughnessTexture)),o.clearcoatNormalTexture!==void 0&&(r.push(n.assignTexture(t,"clearcoatNormalMap",o.clearcoatNormalTexture)),o.clearcoatNormalTexture.scale!==void 0)){const a=o.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new he(a,a)}return Promise.all(r)}}class Tx{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_DISPERSION}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Vn}extendMaterialParams(e,t){const i=this.parser.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=i.extensions[this.name];return t.dispersion=r.dispersion!==void 0?r.dispersion:0,Promise.resolve()}}class Ax{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Vn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];return o.iridescenceFactor!==void 0&&(t.iridescence=o.iridescenceFactor),o.iridescenceTexture!==void 0&&r.push(n.assignTexture(t,"iridescenceMap",o.iridescenceTexture)),o.iridescenceIor!==void 0&&(t.iridescenceIOR=o.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),o.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=o.iridescenceThicknessMinimum),o.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=o.iridescenceThicknessMaximum),o.iridescenceThicknessTexture!==void 0&&r.push(n.assignTexture(t,"iridescenceThicknessMap",o.iridescenceThicknessTexture)),Promise.all(r)}}class Rx{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_SHEEN}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Vn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[];t.sheenColor=new xe(0,0,0),t.sheenRoughness=0,t.sheen=1;const o=i.extensions[this.name];if(o.sheenColorFactor!==void 0){const a=o.sheenColorFactor;t.sheenColor.setRGB(a[0],a[1],a[2],jt)}return o.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=o.sheenRoughnessFactor),o.sheenColorTexture!==void 0&&r.push(n.assignTexture(t,"sheenColorMap",o.sheenColorTexture,Ct)),o.sheenRoughnessTexture!==void 0&&r.push(n.assignTexture(t,"sheenRoughnessMap",o.sheenRoughnessTexture)),Promise.all(r)}}class Cx{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Vn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];return o.transmissionFactor!==void 0&&(t.transmission=o.transmissionFactor),o.transmissionTexture!==void 0&&r.push(n.assignTexture(t,"transmissionMap",o.transmissionTexture)),Promise.all(r)}}class Px{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_VOLUME}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Vn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];t.thickness=o.thicknessFactor!==void 0?o.thicknessFactor:0,o.thicknessTexture!==void 0&&r.push(n.assignTexture(t,"thicknessMap",o.thicknessTexture)),t.attenuationDistance=o.attenuationDistance||1/0;const a=o.attenuationColor||[1,1,1];return t.attenuationColor=new xe().setRGB(a[0],a[1],a[2],jt),Promise.all(r)}}class Lx{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_IOR}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Vn}extendMaterialParams(e,t){const i=this.parser.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=i.extensions[this.name];return t.ior=r.ior!==void 0?r.ior:1.5,Promise.resolve()}}class Ix{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_SPECULAR}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Vn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];t.specularIntensity=o.specularFactor!==void 0?o.specularFactor:1,o.specularTexture!==void 0&&r.push(n.assignTexture(t,"specularIntensityMap",o.specularTexture));const a=o.specularColorFactor||[1,1,1];return t.specularColor=new xe().setRGB(a[0],a[1],a[2],jt),o.specularColorTexture!==void 0&&r.push(n.assignTexture(t,"specularColorMap",o.specularColorTexture,Ct)),Promise.all(r)}}class Dx{constructor(e){this.parser=e,this.name=Ze.EXT_MATERIALS_BUMP}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Vn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];return t.bumpScale=o.bumpFactor!==void 0?o.bumpFactor:1,o.bumpTexture!==void 0&&r.push(n.assignTexture(t,"bumpMap",o.bumpTexture)),Promise.all(r)}}class Ux{constructor(e){this.parser=e,this.name=Ze.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Vn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];return o.anisotropyStrength!==void 0&&(t.anisotropy=o.anisotropyStrength),o.anisotropyRotation!==void 0&&(t.anisotropyRotation=o.anisotropyRotation),o.anisotropyTexture!==void 0&&r.push(n.assignTexture(t,"anisotropyMap",o.anisotropyTexture)),Promise.all(r)}}class Nx{constructor(e){this.parser=e,this.name=Ze.KHR_TEXTURE_BASISU}loadTexture(e){const t=this.parser,n=t.json,i=n.textures[e];if(!i.extensions||!i.extensions[this.name])return null;const r=i.extensions[this.name],o=t.options.ktx2Loader;if(!o){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,r.source,o)}}class Fx{constructor(e){this.parser=e,this.name=Ze.EXT_TEXTURE_WEBP}loadTexture(e){const t=this.name,n=this.parser,i=n.json,r=i.textures[e];if(!r.extensions||!r.extensions[t])return null;const o=r.extensions[t],a=i.images[o.source];let c=n.textureLoader;if(a.uri){const l=n.options.manager.getHandler(a.uri);l!==null&&(c=l)}return n.loadTextureImage(e,o.source,c)}}class zx{constructor(e){this.parser=e,this.name=Ze.EXT_TEXTURE_AVIF}loadTexture(e){const t=this.name,n=this.parser,i=n.json,r=i.textures[e];if(!r.extensions||!r.extensions[t])return null;const o=r.extensions[t],a=i.images[o.source];let c=n.textureLoader;if(a.uri){const l=n.options.manager.getHandler(a.uri);l!==null&&(c=l)}return n.loadTextureImage(e,o.source,c)}}class Ox{constructor(e){this.name=Ze.EXT_MESHOPT_COMPRESSION,this.parser=e}loadBufferView(e){const t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){const i=n.extensions[this.name],r=this.parser.getDependency("buffer",i.buffer),o=this.parser.options.meshoptDecoder;if(!o||!o.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return r.then(function(a){const c=i.byteOffset||0,l=i.byteLength||0,h=i.count,u=i.byteStride,d=new Uint8Array(a,c,l);return o.decodeGltfBufferAsync?o.decodeGltfBufferAsync(h,u,d,i.mode,i.filter).then(function(m){return m.buffer}):o.ready.then(function(){const m=new ArrayBuffer(h*u);return o.decodeGltfBuffer(new Uint8Array(m),h,u,d,i.mode,i.filter),m})})}else return null}}class kx{constructor(e){this.name=Ze.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){const t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;const i=t.meshes[n.mesh];for(const l of i.primitives)if(l.mode!==mn.TRIANGLES&&l.mode!==mn.TRIANGLE_STRIP&&l.mode!==mn.TRIANGLE_FAN&&l.mode!==void 0)return null;const o=n.extensions[this.name].attributes,a=[],c={};for(const l in o)a.push(this.parser.getDependency("accessor",o[l]).then(h=>(c[l]=h,c[l])));return a.length<1?null:(a.push(this.parser.createNodeMesh(e)),Promise.all(a).then(l=>{const h=l.pop(),u=h.isGroup?h.children:[h],d=l[0].count,m=[];for(const _ of u){const p=new ke,g=new C,f=new xn,x=new C(1,1,1),v=new Ni(_.geometry,_.material,d);for(let y=0;y<d;y++)c.TRANSLATION&&g.fromBufferAttribute(c.TRANSLATION,y),c.ROTATION&&f.fromBufferAttribute(c.ROTATION,y),c.SCALE&&x.fromBufferAttribute(c.SCALE,y),v.setMatrixAt(y,p.compose(g,f,x));for(const y in c)if(y==="_COLOR_0"){const b=c[y];v.instanceColor=new rc(b.array,b.itemSize,b.normalized)}else y!=="TRANSLATION"&&y!=="ROTATION"&&y!=="SCALE"&&_.geometry.setAttribute(y,c[y]);ht.prototype.copy.call(v,_),this.parser.assignFinalMaterial(v),m.push(v)}return h.isGroup?(h.clear(),h.add(...m),h):m[0]}))}}const Iu="glTF",Os=12,Th={JSON:1313821514,BIN:5130562};class Bx{constructor(e){this.name=Ze.KHR_BINARY_GLTF,this.content=null,this.body=null;const t=new DataView(e,0,Os),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==Iu)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");const i=this.header.length-Os,r=new DataView(e,Os);let o=0;for(;o<i;){const a=r.getUint32(o,!0);o+=4;const c=r.getUint32(o,!0);if(o+=4,c===Th.JSON){const l=new Uint8Array(e,Os+o,a);this.content=n.decode(l)}else if(c===Th.BIN){const l=Os+o;this.body=e.slice(l,l+a)}o+=a}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}}class Hx{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=Ze.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){const n=this.json,i=this.dracoLoader,r=e.extensions[this.name].bufferView,o=e.extensions[this.name].attributes,a={},c={},l={};for(const h in o){const u=lc[h]||h.toLowerCase();a[u]=o[h]}for(const h in e.attributes){const u=lc[h]||h.toLowerCase();if(o[h]!==void 0){const d=n.accessors[e.attributes[h]],m=ps[d.componentType];l[u]=m.name,c[u]=d.normalized===!0}}return t.getDependency("bufferView",r).then(function(h){return new Promise(function(u,d){i.decodeDracoFile(h,function(m){for(const _ in m.attributes){const p=m.attributes[_],g=c[_];g!==void 0&&(p.normalized=g)}u(m)},a,l,jt,d)})})}}class Vx{constructor(){this.name=Ze.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){return(t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0||(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),e.needsUpdate=!0),e}}class Gx{constructor(){this.name=Ze.KHR_MESH_QUANTIZATION}}class Du extends rr{constructor(e,t,n,i){super(e,t,n,i)}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,r=e*i*3+i;for(let o=0;o!==i;o++)t[o]=n[r+o];return t}interpolate_(e,t,n,i){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=a*2,l=a*3,h=i-t,u=(n-t)/h,d=u*u,m=d*u,_=e*l,p=_-l,g=-2*m+3*d,f=m-d,x=1-g,v=f-d+u;for(let y=0;y!==a;y++){const b=o[p+y+a],w=o[p+y+c]*h,R=o[_+y+a],A=o[_+y]*h;r[y]=x*b+v*w+g*R+f*A}return r}}const Wx=new xn;class Xx extends Du{interpolate_(e,t,n,i){const r=super.interpolate_(e,t,n,i);return Wx.fromArray(r).normalize().toArray(r),r}}const mn={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6},ps={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},Ah={9728:Jt,9729:Dt,9984:Zh,9985:Wr,9986:Hs,9987:An},Rh={33071:cn,33648:to,10497:ii},ca={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},lc={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},pi={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},qx={CUBICSPLINE:void 0,LINEAR:tr,STEP:er},la={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function Yx(s){return s.DefaultMaterial===void 0&&(s.DefaultMaterial=new It({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:ni})),s.DefaultMaterial}function Pi(s,e,t){for(const n in t.extensions)s[n]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[n]=t.extensions[n])}function Nn(s,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(s.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function jx(s,e,t){let n=!1,i=!1,r=!1;for(let l=0,h=e.length;l<h;l++){const u=e[l];if(u.POSITION!==void 0&&(n=!0),u.NORMAL!==void 0&&(i=!0),u.COLOR_0!==void 0&&(r=!0),n&&i&&r)break}if(!n&&!i&&!r)return Promise.resolve(s);const o=[],a=[],c=[];for(let l=0,h=e.length;l<h;l++){const u=e[l];if(n){const d=u.POSITION!==void 0?t.getDependency("accessor",u.POSITION):s.attributes.position;o.push(d)}if(i){const d=u.NORMAL!==void 0?t.getDependency("accessor",u.NORMAL):s.attributes.normal;a.push(d)}if(r){const d=u.COLOR_0!==void 0?t.getDependency("accessor",u.COLOR_0):s.attributes.color;c.push(d)}}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(c)]).then(function(l){const h=l[0],u=l[1],d=l[2];return n&&(s.morphAttributes.position=h),i&&(s.morphAttributes.normal=u),r&&(s.morphAttributes.color=d),s.morphTargetsRelative=!0,s})}function Kx(s,e){if(s.updateMorphTargets(),e.weights!==void 0)for(let t=0,n=e.weights.length;t<n;t++)s.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){const t=e.extras.targetNames;if(s.morphTargetInfluences.length===t.length){s.morphTargetDictionary={};for(let n=0,i=t.length;n<i;n++)s.morphTargetDictionary[t[n]]=n}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function $x(s){let e;const t=s.extensions&&s.extensions[Ze.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+ha(t.attributes):e=s.indices+":"+ha(s.attributes)+":"+s.mode,s.targets!==void 0)for(let n=0,i=s.targets.length;n<i;n++)e+=":"+ha(s.targets[n]);return e}function ha(s){let e="";const t=Object.keys(s).sort();for(let n=0,i=t.length;n<i;n++)e+=t[n]+":"+s[t[n]]+";";return e}function hc(s){switch(s){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function Zx(s){return s.search(/\.jpe?g($|\?)/i)>0||s.search(/^data\:image\/jpeg/)===0?"image/jpeg":s.search(/\.webp($|\?)/i)>0||s.search(/^data\:image\/webp/)===0?"image/webp":s.search(/\.ktx2($|\?)/i)>0||s.search(/^data\:image\/ktx2/)===0?"image/ktx2":"image/png"}const Jx=new ke;class Qx{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new Mx,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,i=-1,r=!1,o=-1;if(typeof navigator<"u"){const a=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(a)===!0;const c=a.match(/Version\/(\d+)/);i=n&&c?parseInt(c[1],10):-1,r=a.indexOf("Firefox")>-1,o=r?a.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||n&&i<17||r&&o<98?this.textureLoader=new wu(this.options.manager):this.textureLoader=new Ep(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new Bc(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),this.options.crossOrigin==="use-credentials"&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){const n=this,i=this.json,r=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(o){return o._markDefs&&o._markDefs()}),Promise.all(this._invokeAll(function(o){return o.beforeRoot&&o.beforeRoot()})).then(function(){return Promise.all([n.getDependencies("scene"),n.getDependencies("animation"),n.getDependencies("camera")])}).then(function(o){const a={scene:o[0][i.scene||0],scenes:o[0],animations:o[1],cameras:o[2],asset:i.asset,parser:n,userData:{}};return Pi(r,a,i),Nn(a,i),Promise.all(n._invokeAll(function(c){return c.afterRoot&&c.afterRoot(a)})).then(function(){for(const c of a.scenes)c.updateMatrixWorld();e(a)})}).catch(t)}_markDefs(){const e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let i=0,r=t.length;i<r;i++){const o=t[i].joints;for(let a=0,c=o.length;a<c;a++)e[o[a]].isBone=!0}for(let i=0,r=e.length;i<r;i++){const o=e[i];o.mesh!==void 0&&(this._addNodeRef(this.meshCache,o.mesh),o.skin!==void 0&&(n[o.mesh].isSkinnedMesh=!0)),o.camera!==void 0&&this._addNodeRef(this.cameraCache,o.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;const i=n.clone(),r=(o,a)=>{const c=this.associations.get(o);c!=null&&this.associations.set(a,c);for(const[l,h]of o.children.entries())r(h,a.children[l])};return r(n,i),i.name+="_instance_"+e.uses[t]++,i}_invokeOne(e){const t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){const i=e(t[n]);if(i)return i}return null}_invokeAll(e){const t=Object.values(this.plugins);t.unshift(this);const n=[];for(let i=0;i<t.length;i++){const r=e(t[i]);r&&n.push(r)}return n}getDependency(e,t){const n=e+":"+t;let i=this.cache.get(n);if(!i){switch(e){case"scene":i=this.loadScene(t);break;case"node":i=this._invokeOne(function(r){return r.loadNode&&r.loadNode(t)});break;case"mesh":i=this._invokeOne(function(r){return r.loadMesh&&r.loadMesh(t)});break;case"accessor":i=this.loadAccessor(t);break;case"bufferView":i=this._invokeOne(function(r){return r.loadBufferView&&r.loadBufferView(t)});break;case"buffer":i=this.loadBuffer(t);break;case"material":i=this._invokeOne(function(r){return r.loadMaterial&&r.loadMaterial(t)});break;case"texture":i=this._invokeOne(function(r){return r.loadTexture&&r.loadTexture(t)});break;case"skin":i=this.loadSkin(t);break;case"animation":i=this._invokeOne(function(r){return r.loadAnimation&&r.loadAnimation(t)});break;case"camera":i=this.loadCamera(t);break;default:if(i=this._invokeOne(function(r){return r!=this&&r.getDependency&&r.getDependency(e,t)}),!i)throw new Error("Unknown type: "+e);break}this.cache.add(n,i)}return i}getDependencies(e){let t=this.cache.get(e);if(!t){const n=this,i=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(i.map(function(r,o){return n.getDependency(e,o)})),this.cache.add(e,t)}return t}loadBuffer(e){const t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[Ze.KHR_BINARY_GLTF].body);const i=this.options;return new Promise(function(r,o){n.load(js.resolveURL(t.uri,i.path),r,void 0,function(){o(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){const t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(n){const i=t.byteLength||0,r=t.byteOffset||0;return n.slice(r,r+i)})}loadAccessor(e){const t=this,n=this.json,i=this.json.accessors[e];if(i.bufferView===void 0&&i.sparse===void 0){const o=ca[i.type],a=ps[i.componentType],c=i.normalized===!0,l=new a(i.count*o);return Promise.resolve(new wt(l,o,c))}const r=[];return i.bufferView!==void 0?r.push(this.getDependency("bufferView",i.bufferView)):r.push(null),i.sparse!==void 0&&(r.push(this.getDependency("bufferView",i.sparse.indices.bufferView)),r.push(this.getDependency("bufferView",i.sparse.values.bufferView))),Promise.all(r).then(function(o){const a=o[0],c=ca[i.type],l=ps[i.componentType],h=l.BYTES_PER_ELEMENT,u=h*c,d=i.byteOffset||0,m=i.bufferView!==void 0?n.bufferViews[i.bufferView].byteStride:void 0,_=i.normalized===!0;let p,g;if(m&&m!==u){const f=Math.floor(d/m),x="InterleavedBuffer:"+i.bufferView+":"+i.componentType+":"+f+":"+i.count;let v=t.cache.get(x);v||(p=new l(a,f*m,i.count*m/h),v=new Lf(p,m/h),t.cache.add(x,v)),g=new Pc(v,c,d%m/h,_)}else a===null?p=new l(i.count*c):p=new l(a,d,i.count*c),g=new wt(p,c,_);if(i.sparse!==void 0){const f=ca.SCALAR,x=ps[i.sparse.indices.componentType],v=i.sparse.indices.byteOffset||0,y=i.sparse.values.byteOffset||0,b=new x(o[1],v,i.sparse.count*f),w=new l(o[2],y,i.sparse.count*c);a!==null&&(g=new wt(g.array.slice(),g.itemSize,g.normalized)),g.normalized=!1;for(let R=0,A=b.length;R<A;R++){const M=b[R];if(g.setX(M,w[R*c]),c>=2&&g.setY(M,w[R*c+1]),c>=3&&g.setZ(M,w[R*c+2]),c>=4&&g.setW(M,w[R*c+3]),c>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}g.normalized=_}return g})}loadTexture(e){const t=this.json,n=this.options,r=t.textures[e].source,o=t.images[r];let a=this.textureLoader;if(o.uri){const c=n.manager.getHandler(o.uri);c!==null&&(a=c)}return this.loadTextureImage(e,r,a)}loadTextureImage(e,t,n){const i=this,r=this.json,o=r.textures[e],a=r.images[t],c=(a.uri||a.bufferView)+":"+o.sampler;if(this.textureCache[c])return this.textureCache[c];const l=this.loadImageSource(t,n).then(function(h){h.flipY=!1,h.name=o.name||a.name||"",h.name===""&&typeof a.uri=="string"&&a.uri.startsWith("data:image/")===!1&&(h.name=a.uri);const d=(r.samplers||{})[o.sampler]||{};return h.magFilter=Ah[d.magFilter]||Dt,h.minFilter=Ah[d.minFilter]||An,h.wrapS=Rh[d.wrapS]||ii,h.wrapT=Rh[d.wrapT]||ii,h.generateMipmaps=!h.isCompressedTexture&&h.minFilter!==Jt&&h.minFilter!==Dt,i.associations.set(h,{textures:e}),h}).catch(function(){return null});return this.textureCache[c]=l,l}loadImageSource(e,t){const n=this,i=this.json,r=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(u=>u.clone());const o=i.images[e],a=self.URL||self.webkitURL;let c=o.uri||"",l=!1;if(o.bufferView!==void 0)c=n.getDependency("bufferView",o.bufferView).then(function(u){l=!0;const d=new Blob([u],{type:o.mimeType});return c=a.createObjectURL(d),c});else if(o.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");const h=Promise.resolve(c).then(function(u){return new Promise(function(d,m){let _=d;t.isImageBitmapLoader===!0&&(_=function(p){const g=new Ut(p);g.needsUpdate=!0,d(g)}),t.load(js.resolveURL(u,r.path),_,void 0,m)})}).then(function(u){return l===!0&&a.revokeObjectURL(c),Nn(u,o),u.userData.mimeType=o.mimeType||Zx(o.uri),u}).catch(function(u){throw console.error("THREE.GLTFLoader: Couldn't load texture",c),u});return this.sourceCache[e]=h,h}assignTexture(e,t,n,i){const r=this;return this.getDependency("texture",n.index).then(function(o){if(!o)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(o=o.clone(),o.channel=n.texCoord),r.extensions[Ze.KHR_TEXTURE_TRANSFORM]){const a=n.extensions!==void 0?n.extensions[Ze.KHR_TEXTURE_TRANSFORM]:void 0;if(a){const c=r.associations.get(o);o=r.extensions[Ze.KHR_TEXTURE_TRANSFORM].extendTexture(o,a),r.associations.set(o,c)}}return i!==void 0&&(o.colorSpace=i),e[t]=o,o})}assignFinalMaterial(e){const t=e.geometry;let n=e.material;const i=t.attributes.tangent===void 0,r=t.attributes.color!==void 0,o=t.attributes.normal===void 0;if(e.isPoints){const a="PointsMaterial:"+n.uuid;let c=this.cache.get(a);c||(c=new oo,kn.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,c.sizeAttenuation=!1,this.cache.add(a,c)),n=c}else if(e.isLine){const a="LineBasicMaterial:"+n.uuid;let c=this.cache.get(a);c||(c=new _u,kn.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,this.cache.add(a,c)),n=c}if(i||r||o){let a="ClonedMaterial:"+n.uuid+":";i&&(a+="derivative-tangents:"),r&&(a+="vertex-colors:"),o&&(a+="flat-shading:");let c=this.cache.get(a);c||(c=n.clone(),r&&(c.vertexColors=!0),o&&(c.flatShading=!0),i&&(c.normalScale&&(c.normalScale.y*=-1),c.clearcoatNormalScale&&(c.clearcoatNormalScale.y*=-1)),this.cache.add(a,c),this.associations.set(c,this.associations.get(n))),n=c}e.material=n}getMaterialType(){return It}loadMaterial(e){const t=this,n=this.json,i=this.extensions,r=n.materials[e];let o;const a={},c=r.extensions||{},l=[];if(c[Ze.KHR_MATERIALS_UNLIT]){const u=i[Ze.KHR_MATERIALS_UNLIT];o=u.getMaterialType(),l.push(u.extendParams(a,r,t))}else{const u=r.pbrMetallicRoughness||{};if(a.color=new xe(1,1,1),a.opacity=1,Array.isArray(u.baseColorFactor)){const d=u.baseColorFactor;a.color.setRGB(d[0],d[1],d[2],jt),a.opacity=d[3]}u.baseColorTexture!==void 0&&l.push(t.assignTexture(a,"map",u.baseColorTexture,Ct)),a.metalness=u.metallicFactor!==void 0?u.metallicFactor:1,a.roughness=u.roughnessFactor!==void 0?u.roughnessFactor:1,u.metallicRoughnessTexture!==void 0&&(l.push(t.assignTexture(a,"metalnessMap",u.metallicRoughnessTexture)),l.push(t.assignTexture(a,"roughnessMap",u.metallicRoughnessTexture))),o=this._invokeOne(function(d){return d.getMaterialType&&d.getMaterialType(e)}),l.push(Promise.all(this._invokeAll(function(d){return d.extendMaterialParams&&d.extendMaterialParams(e,a)})))}r.doubleSided===!0&&(a.side=Tt);const h=r.alphaMode||la.OPAQUE;if(h===la.BLEND?(a.transparent=!0,a.depthWrite=!1):(a.transparent=!1,h===la.MASK&&(a.alphaTest=r.alphaCutoff!==void 0?r.alphaCutoff:.5)),r.normalTexture!==void 0&&o!==zi&&(l.push(t.assignTexture(a,"normalMap",r.normalTexture)),a.normalScale=new he(1,1),r.normalTexture.scale!==void 0)){const u=r.normalTexture.scale;a.normalScale.set(u,u)}if(r.occlusionTexture!==void 0&&o!==zi&&(l.push(t.assignTexture(a,"aoMap",r.occlusionTexture)),r.occlusionTexture.strength!==void 0&&(a.aoMapIntensity=r.occlusionTexture.strength)),r.emissiveFactor!==void 0&&o!==zi){const u=r.emissiveFactor;a.emissive=new xe().setRGB(u[0],u[1],u[2],jt)}return r.emissiveTexture!==void 0&&o!==zi&&l.push(t.assignTexture(a,"emissiveMap",r.emissiveTexture,Ct)),Promise.all(l).then(function(){const u=new o(a);return r.name&&(u.name=r.name),Nn(u,r),t.associations.set(u,{materials:e}),r.extensions&&Pi(i,u,r),u})}createUniqueName(e){const t=lt.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){const t=this,n=this.extensions,i=this.primitiveCache;function r(a){return n[Ze.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(a,t).then(function(c){return Ch(c,a,t)})}const o=[];for(let a=0,c=e.length;a<c;a++){const l=e[a],h=$x(l),u=i[h];if(u)o.push(u.promise);else{let d;l.extensions&&l.extensions[Ze.KHR_DRACO_MESH_COMPRESSION]?d=r(l):d=Ch(new At,l,t),i[h]={primitive:l,promise:d},o.push(d)}}return Promise.all(o)}loadMesh(e){const t=this,n=this.json,i=this.extensions,r=n.meshes[e],o=r.primitives,a=[];for(let c=0,l=o.length;c<l;c++){const h=o[c].material===void 0?Yx(this.cache):this.getDependency("material",o[c].material);a.push(h)}return a.push(t.loadGeometries(o)),Promise.all(a).then(function(c){const l=c.slice(0,c.length-1),h=c[c.length-1],u=[];for(let m=0,_=h.length;m<_;m++){const p=h[m],g=o[m];let f;const x=l[m];if(g.mode===mn.TRIANGLES||g.mode===mn.TRIANGLE_STRIP||g.mode===mn.TRIANGLE_FAN||g.mode===void 0)f=r.isSkinnedMesh===!0?new Df(p,x):new rt(p,x),f.isSkinnedMesh===!0&&f.normalizeSkinWeights(),g.mode===mn.TRIANGLE_STRIP?f.geometry=Eh(f.geometry,ru):g.mode===mn.TRIANGLE_FAN&&(f.geometry=Eh(f.geometry,nc));else if(g.mode===mn.LINES)f=new Bf(p,x);else if(g.mode===mn.LINE_STRIP)f=new Ic(p,x);else if(g.mode===mn.LINE_LOOP)f=new Hf(p,x);else if(g.mode===mn.POINTS)f=new ac(p,x);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+g.mode);Object.keys(f.geometry.morphAttributes).length>0&&Kx(f,r),f.name=t.createUniqueName(r.name||"mesh_"+e),Nn(f,r),g.extensions&&Pi(i,f,g),t.assignFinalMaterial(f),u.push(f)}for(let m=0,_=u.length;m<_;m++)t.associations.set(u[m],{meshes:e,primitives:m});if(u.length===1)return r.extensions&&Pi(i,u[0],r),u[0];const d=new qe;r.extensions&&Pi(i,d,r),t.associations.set(d,{meshes:e});for(let m=0,_=u.length;m<_;m++)d.add(u[m]);return d})}loadCamera(e){let t;const n=this.json.cameras[e],i=n[n.type];if(!i){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return n.type==="perspective"?t=new Yt(tf.radToDeg(i.yfov),i.aspectRatio||1,i.znear||1,i.zfar||2e6):n.type==="orthographic"&&(t=new Vc(-i.xmag,i.xmag,i.ymag,-i.ymag,i.znear,i.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),Nn(t,n),Promise.resolve(t)}loadSkin(e){const t=this.json.skins[e],n=[];for(let i=0,r=t.joints.length;i<r;i++)n.push(this._loadNodeShallow(t.joints[i]));return t.inverseBindMatrices!==void 0?n.push(this.getDependency("accessor",t.inverseBindMatrices)):n.push(null),Promise.all(n).then(function(i){const r=i.pop(),o=i,a=[],c=[];for(let l=0,h=o.length;l<h;l++){const u=o[l];if(u){a.push(u);const d=new ke;r!==null&&d.fromArray(r.array,l*16),c.push(d)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[l])}return new Nf(a,c)})}loadAnimation(e){const t=this.json,n=this,i=t.animations[e],r=i.name?i.name:"animation_"+e,o=[],a=[],c=[],l=[],h=[];for(let u=0,d=i.channels.length;u<d;u++){const m=i.channels[u],_=i.samplers[m.sampler],p=m.target,g=p.node,f=i.parameters!==void 0?i.parameters[_.input]:_.input,x=i.parameters!==void 0?i.parameters[_.output]:_.output;p.node!==void 0&&(o.push(this.getDependency("node",g)),a.push(this.getDependency("accessor",f)),c.push(this.getDependency("accessor",x)),l.push(_),h.push(p))}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(c),Promise.all(l),Promise.all(h)]).then(function(u){const d=u[0],m=u[1],_=u[2],p=u[3],g=u[4],f=[];for(let v=0,y=d.length;v<y;v++){const b=d[v],w=m[v],R=_[v],A=p[v],M=g[v];if(b===void 0)continue;b.updateMatrix&&b.updateMatrix();const S=n._createAnimationTracks(b,w,R,A,M);if(S)for(let L=0;L<S.length;L++)f.push(S[L])}const x=new up(r,void 0,f);return Nn(x,i),x})}createNodeMesh(e){const t=this.json,n=this,i=t.nodes[e];return i.mesh===void 0?null:n.getDependency("mesh",i.mesh).then(function(r){const o=n._getNodeRef(n.meshCache,i.mesh,r);return i.weights!==void 0&&o.traverse(function(a){if(a.isMesh)for(let c=0,l=i.weights.length;c<l;c++)a.morphTargetInfluences[c]=i.weights[c]}),o})}loadNode(e){const t=this.json,n=this,i=t.nodes[e],r=n._loadNodeShallow(e),o=[],a=i.children||[];for(let l=0,h=a.length;l<h;l++)o.push(n.getDependency("node",a[l]));const c=i.skin===void 0?Promise.resolve(null):n.getDependency("skin",i.skin);return Promise.all([r,Promise.all(o),c]).then(function(l){const h=l[0],u=l[1],d=l[2];d!==null&&h.traverse(function(m){m.isSkinnedMesh&&m.bind(d,Jx)});for(let m=0,_=u.length;m<_;m++)h.add(u[m]);return h})}_loadNodeShallow(e){const t=this.json,n=this.extensions,i=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];const r=t.nodes[e],o=r.name?i.createUniqueName(r.name):"",a=[],c=i._invokeOne(function(l){return l.createNodeMesh&&l.createNodeMesh(e)});return c&&a.push(c),r.camera!==void 0&&a.push(i.getDependency("camera",r.camera).then(function(l){return i._getNodeRef(i.cameraCache,r.camera,l)})),i._invokeAll(function(l){return l.createNodeAttachment&&l.createNodeAttachment(e)}).forEach(function(l){a.push(l)}),this.nodeCache[e]=Promise.all(a).then(function(l){let h;if(r.isBone===!0?h=new mu:l.length>1?h=new qe:l.length===1?h=l[0]:h=new ht,h!==l[0])for(let u=0,d=l.length;u<d;u++)h.add(l[u]);if(r.name&&(h.userData.name=r.name,h.name=o),Nn(h,r),r.extensions&&Pi(n,h,r),r.matrix!==void 0){const u=new ke;u.fromArray(r.matrix),h.applyMatrix4(u)}else r.translation!==void 0&&h.position.fromArray(r.translation),r.rotation!==void 0&&h.quaternion.fromArray(r.rotation),r.scale!==void 0&&h.scale.fromArray(r.scale);if(!i.associations.has(h))i.associations.set(h,{});else if(r.mesh!==void 0&&i.meshCache.refs[r.mesh]>1){const u=i.associations.get(h);i.associations.set(h,{...u})}return i.associations.get(h).nodes=e,h}),this.nodeCache[e]}loadScene(e){const t=this.extensions,n=this.json.scenes[e],i=this,r=new qe;n.name&&(r.name=i.createUniqueName(n.name)),Nn(r,n),n.extensions&&Pi(t,r,n);const o=n.nodes||[],a=[];for(let c=0,l=o.length;c<l;c++)a.push(i.getDependency("node",o[c]));return Promise.all(a).then(function(c){for(let h=0,u=c.length;h<u;h++)r.add(c[h]);const l=h=>{const u=new Map;for(const[d,m]of i.associations)(d instanceof kn||d instanceof Ut)&&u.set(d,m);return h.traverse(d=>{const m=i.associations.get(d);m!=null&&u.set(d,m)}),u};return i.associations=l(r),r})}_createAnimationTracks(e,t,n,i,r){const o=[],a=e.name?e.name:e.uuid,c=[];pi[r.path]===pi.weights?e.traverse(function(d){d.morphTargetInfluences&&c.push(d.name?d.name:d.uuid)}):c.push(a);let l;switch(pi[r.path]){case pi.weights:l=ys;break;case pi.rotation:l=Ms;break;case pi.translation:case pi.scale:l=Ss;break;default:switch(n.itemSize){case 1:l=ys;break;case 2:case 3:default:l=Ss;break}break}const h=i.interpolation!==void 0?qx[i.interpolation]:tr,u=this._getArrayFromAccessor(n);for(let d=0,m=c.length;d<m;d++){const _=new l(c[d]+"."+pi[r.path],t.array,u,h);i.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(_),o.push(_)}return o}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){const n=hc(t.constructor),i=new Float32Array(t.length);for(let r=0,o=t.length;r<o;r++)i[r]=t[r]*n;t=i}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(n){const i=this instanceof Ms?Xx:Du;return new i(this.times,this.values,this.getValueSize()/3,n)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}function ev(s,e,t){const n=e.attributes,i=new oi;if(n.POSITION!==void 0){const a=t.json.accessors[n.POSITION],c=a.min,l=a.max;if(c!==void 0&&l!==void 0){if(i.set(new C(c[0],c[1],c[2]),new C(l[0],l[1],l[2])),a.normalized){const h=hc(ps[a.componentType]);i.min.multiplyScalar(h),i.max.multiplyScalar(h)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;const r=e.targets;if(r!==void 0){const a=new C,c=new C;for(let l=0,h=r.length;l<h;l++){const u=r[l];if(u.POSITION!==void 0){const d=t.json.accessors[u.POSITION],m=d.min,_=d.max;if(m!==void 0&&_!==void 0){if(c.setX(Math.max(Math.abs(m[0]),Math.abs(_[0]))),c.setY(Math.max(Math.abs(m[1]),Math.abs(_[1]))),c.setZ(Math.max(Math.abs(m[2]),Math.abs(_[2]))),d.normalized){const p=hc(ps[d.componentType]);c.multiplyScalar(p)}a.max(c)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}i.expandByVector(a)}s.boundingBox=i;const o=new Hn;i.getCenter(o.center),o.radius=i.min.distanceTo(i.max)/2,s.boundingSphere=o}function Ch(s,e,t){const n=e.attributes,i=[];function r(o,a){return t.getDependency("accessor",o).then(function(c){s.setAttribute(a,c)})}for(const o in n){const a=lc[o]||o.toLowerCase();a in s.attributes||i.push(r(n[o],a))}if(e.indices!==void 0&&!s.index){const o=t.getDependency("accessor",e.indices).then(function(a){s.setIndex(a)});i.push(o)}return nt.workingColorSpace!==jt&&"COLOR_0"in n&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${nt.workingColorSpace}" not supported.`),Nn(s,e),ev(s,e,t),Promise.all(i).then(function(){return e.targets!==void 0?jx(s,e.targets,t):s})}const et=Math.PI*2,_o=(s,e=0,t=1)=>Math.max(e,Math.min(t,s)),je=(s,e,t)=>s+(e-s)*t,bt=(s,e,t)=>{const n=_o((t-s)/(e-s));return n*n*(3-2*n)};function Ke(s,e=0,t=0){let n=Math.imul(s|0,374761393)^Math.imul(e|0,668265263)^Math.imul(t|0,1274126177);return n=Math.imul(n^n>>>13,1274126177),((n^n>>>16)>>>0)/4294967296}function In(s){let e=s|0;return()=>{e+=1831565813;let t=e;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}}function Tn(s,e,t=0){const n=Math.floor(s),i=Math.floor(e),r=s-n,o=e-i,a=r*r*(3-2*r),c=o*o*(3-2*o);return je(je(Ke(n,i,t),Ke(n+1,i,t),a),je(Ke(n,i+1,t),Ke(n+1,i+1,t),a),c)}function Ph(s,e,t=0){return Tn(s,e,t)*.58+Tn(s*2.03,e*2.03,t+1)*.28+Tn(s*4.07,e*4.07,t+2)*.14}class ri{constructor(){this.p=[],this.n=[],this.u=[],this.c=[],this.i=[]}vertex(e,t,n,i){const r=this.p.length/3;return this.p.push(...e),this.n.push(...t),this.u.push(...n),this.c.push(...i),r}quad(e,t,n,i,r,o=[0,0,1,1],a=[1,1,1]){const c=this.p.length/3;this.vertex(e,r,[o[0],o[1]],a),this.vertex(t,r,[o[2],o[1]],a),this.vertex(n,r,[o[2],o[3]],a),this.vertex(i,r,[o[0],o[3]],a),this.i.push(c,c+1,c+2,c,c+2,c+3)}tube(e,t,n,i,r=7,o=[1,1,1],a=0){const c=new C(...e),l=new C(...t),h=l.clone().sub(c),u=h.length();h.normalize();const d=new C(0,1,0);Math.abs(h.y)>.96&&d.set(1,0,0),d.cross(h).normalize();const m=h.clone().cross(d).normalize();c.addScaledVector(h,-.025),l.addScaledVector(h,.025);const _=this.p.length/3;for(let p=0;p<=r;p++){let g=p/r*et;const f=d.clone().multiplyScalar(Math.cos(g)).addScaledVector(m,Math.sin(g)),x=1+Math.sin(g*5)*.07;if(this.vertex(c.clone().addScaledVector(f,n*x).toArray(),f.toArray(),[p/r*1.5,a],o),this.vertex(l.clone().addScaledVector(f,i*x).toArray(),f.toArray(),[p/r*1.5,a+u*.52],o),p<r){const v=_+p*2;this.i.push(v,v+2,v+1,v+2,v+3,v+1)}}}plane(e,t,n,i,r=0,o=[0,0,.5,.5],a=[1,1,1]){const c=new xn().setFromEuler(new _n(r,i,0)),l=new C(0,0,1).applyQuaternion(c).toArray(),h=(u,d)=>new C(u,d,0).applyQuaternion(c).add(new C(...e)).toArray();this.quad(h(-t/2,-n/2),h(t/2,-n/2),h(t/2,n/2),h(-t/2,n/2),l,o,a)}geometry(){const e=new At;return e.setAttribute("position",new Ve(this.p,3)),e.setAttribute("normal",new Ve(this.n,3)),e.setAttribute("uv",new Ve(this.u,2)),e.setAttribute("color",new Ve(this.c,3)),e.setIndex(this.i),e.computeBoundingSphere(),e}}function Uu(s,e,t,n,i,r=!1){const o=new C(...t).sub(new C(...e)).normalize(),a=new C(0,1,0).cross(o).normalize(),c=o.clone().cross(a).normalize();for(const[l,h,u]of[[e,n,-1],[t,i,1]]){const d=new C(...l).addScaledVector(o,u*.03),m=o.clone().multiplyScalar(u).toArray(),_=r?.76:0;for(let p=0;p<24;p++){const g=p/24*et,f=(p+1)/24*et,x=(y,b)=>{const w=h*b*(1+Math.sin(y*5)*.035);return d.clone().addScaledVector(a,Math.cos(y)*w).addScaledVector(c,Math.sin(y)*w).toArray()},v=s.p.length/3;for(const[y,b]of[[g,_],[g,1],[f,1],[f,_]])s.vertex(x(y,b),m,[.5+Math.cos(y)*b*.5,.5+Math.sin(y)*b*.5],[1,1,1]);s.i.push(v,v+1,v+2,v,v+2,v+3)}}}function tv(){const s=new ri,e=In(154);for(let t=0;t<18;t++){const n=e()*et,i=Math.sqrt(e())*.52,r=Math.cos(n)*i,o=Math.sin(n)*i,a=.38+e()*.62,c=.0035+e()*.005,l=Math.sin(n),h=Math.cos(n);for(let u=0;u<3;u++){const d=u/3,m=(u+1)/3,_=c*(1-d),p=c*(1-m),g=(f,x,v)=>[r+l*f*f*a*.38+h*x*v,a*f,o+h*f*f*a*.38-l*x*v];s.quad(g(d,-1,_),g(d,1,_),g(m,1,p),g(m,-1,p),[h,.3,-l],[0,d,1,m],[.54+d*.38,.6+d*.3,.35+d*.3])}if(t<3){const u=r+l*a*.38,d=o+h*a*.38;for(let m=0;m<5;m++){const _=a+m*.025,p=.013*(1-m/6);s.plane([u,_,d],p*2,.06,n,.2,[0,0,1,1],[.7,.61,.42])}}}return s.geometry()}function Nu(){const s=new Mi(.24,.24,2,2);s.rotateX(-Math.PI/2);const e=s.attributes.position;for(let t=0;t<e.count;t++)e.setY(t,.013*Math.pow(e.getZ(t)/.12,2)+Math.sin(e.getX(t)*16)*.006);return s.computeVertexNormals(),s.setAttribute("color",new Ve(new Array(e.count*3).fill(1),3)),s}function nv(){const s=Nu(),e=new ri,t=In(819),n=s.attributes.position,i=s.attributes.normal,r=s.attributes.uv,o=s.index.array;for(let a=0;a<34;a++){const c=new ke().compose(new C(t()-.5,.008+t()*.055,t()-.5),new xn().setFromEuler(new _n((t()-.5)*.45,t()*et,(t()-.5)*.4)),new C().setScalar(.46+t()*.4)),l=new He().getNormalMatrix(c),h=e.p.length/3,u=new xe([15713413,14132846,13141329,13219961,15250549][a%5]);for(let d=0;d<n.count;d++)e.vertex(new C().fromBufferAttribute(n,d).applyMatrix4(c).toArray(),new C().fromBufferAttribute(i,d).applyMatrix3(l).normalize().toArray(),[r.getX(d),r.getY(d)],u.toArray());for(const d of o)e.i.push(h+d)}return s.dispose(),e.geometry()}function iv(s){const e=new po(1,2),t=e.attributes.position,n=[];for(let r=0;r<t.count;r++){let o=t.getX(r),a=t.getY(r),c=t.getZ(r),l=1+Math.sin(o*11+c*4)*.12+Math.sin(c*7+a*6)*.12;t.setXYZ(r,o*l,a*l*.76,c*l);const h=new xe().setRGB(.7+Math.max(0,a)*.25,.74+Math.max(0,a)*.24,.57+Math.max(0,a)*.3);n.push(...h.toArray())}e.setAttribute("color",new Ve(n,3));const i=[];for(let r=0;r<t.count;r++)i.push(t.getX(r)*.6,t.getZ(r)*.6+t.getY(r)*.5);return e.setAttribute("uv",new Ve(i,2)),e.computeVertexNormals(),e}const uc=Math.PI*2,Lh=(s,e)=>{let t=s-e;for(;t>Math.PI;)t-=uc;for(;t<-Math.PI;)t+=uc;return t};function Ih(s,e,t,n,i){const r=[0,.16],o=[],a=150,c=i()*10;for(let h=0;h<=a;h++){const u=-Math.PI+h/a*uc;let d=e,m=0;for(const[_,p,g]of s){const f=Math.abs(Lh(u,_))/g;if(f<1){const x=e+(p-e)*Math.pow(1-f,1.35);x>d&&(d=x,m=1-f)}}d*=1+n*Math.pow(Math.max(0,Math.sin(u*t+c)),2)*Math.min(1,m*3),Math.abs(Lh(u,Math.PI))<.25&&(d=Math.min(d,e*.7)),o.push(r[0]+d*Math.sin(u),r[1]-d*Math.cos(u))}const l=s.map(([h,u])=>[r[0],r[1],r[0]+.85*u*Math.sin(h),r[1]-.85*u*Math.cos(h)]);return{pts:o,veins:l,stem:[r[0],r[1],.02,.5]}}function ss(s,e,t){const o=[],a=[];for(let l=0;l<=90;l++){const h=l/90;a.push([s(h),.3+(-.5-.3)*h])}for(const[l,h]of a)o.push(l,h);for(let l=a.length-1;l>=0;l--)o.push(-a[l][0]*(.94+.06*t()),a[l][1]);const c=[[0,.3,0,-.5+.03]];for(let l=1;l<=e;l++){const h=(l-.4)/(e+.4),u=.3+(-.5-.3)*h,d=s(Math.min(1,h+.08))*.92;c.push([0,u,d,u+(-.5-.3)*.1],[0,u,-d,u+(-.5-.3)*.1])}return{pts:o,veins:c,stem:[0,.3,0,.5]}}function sv(s,e){switch(s){case"maple":{const t=()=>.92+.16*e();return Ih([[0,.66*t(),.5],[1.05,.6*t(),.44],[-1.05,.6*t(),.44],[2,.34*t(),.4],[-2,.34*t(),.4]],.15,9,.12,e)}case"redmaple":{const t=()=>.92+.16*e();return Ih([[0,.6*t(),.62],[.95,.5*t(),.55],[-.95,.5*t(),.55],[1.9,.22,.4],[-1.9,.22,.4]],.2,26,.06,e)}case"oak":{const t=3+Math.floor(e()*2),n=.25+e()*.2;return ss(i=>.34*Math.pow(Math.sin(Math.PI*Math.pow(i,.85)),.7)*(.5+.5*Math.pow(Math.abs(Math.cos(Math.PI*(t*i+n))),.6))+.012,t,e)}case"redoak":{const t=3+Math.floor(e()*2);return ss(n=>.36*Math.pow(Math.sin(Math.PI*Math.pow(n,.8)),.6)*(.3+.7*Math.pow(Math.abs(Math.cos(Math.PI*(t*n+.3))),2.6))+.014,t,e)}case"beech":return ss(t=>.24*Math.pow(Math.sin(Math.PI*t),.85)*(1+.035*Math.sin(t*Math.PI*22))+.004,8,e);case"birch":return ss(t=>.33*Math.pow(t+.02,.35)*Math.pow(1-t,.95)*1.75*(1+.05*Math.abs(Math.sin(t*Math.PI*16))),6,e);case"aspen":return ss(t=>.4*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.02)),.6)*(1+.03*Math.abs(Math.sin(t*Math.PI*14))),4,e);case"ginkgo":{const t=[0,.22],n=[t[0],t[1]],i=60;for(let o=0;o<=i;o++){const a=-.95+o/i*1.9;let c=.62*(1-.18*Math.abs(a))*(1+.025*Math.sin(a*40));c-=.2*Math.exp(-Math.pow(a/.06,2)),n.push(t[0]+c*Math.sin(a),t[1]-c*Math.cos(a))}const r=[];for(let o=-4;o<=4;o++){const a=o*.2;r.push([t[0],t[1],t[0]+.56*Math.sin(a),t[1]-.56*Math.cos(a)])}return{pts:n,veins:r,stem:[0,.22,0,.5]}}case"needle":default:return ss(t=>.03*Math.sin(Math.PI*t)+.004,0,e)}}function rv(s){const e=new Path2D,t=s.pts;e.moveTo(t[0],t[1]);for(let n=2;n<t.length;n+=2)e.lineTo(t[n],t[n+1]);return e.closePath(),e}function qc(s){let e=s>>>0;return()=>{e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}class ov{constructor(e){this.f=qc(e)}next(){return this.f()}range(e,t){return e+(t-e)*this.f()}int(e){return Math.floor(this.f()*e)}chance(e){return this.f()<e}pick(e){return e[Math.floor(this.f()*e.length)]}sign(){return this.f()<.5?-1:1}gauss(){let e=0;for(let t=0;t<4;t++)e+=this.f();return(e-2)*.866}}const Ii=new Uint8Array(512),$r=new Float32Array(16),Zr=new Float32Array(16);for(let s=0;s<16;s++){const e=s/16*Math.PI*2+.13;$r[s]=Math.cos(e),Zr[s]=Math.sin(e)}{const s=qc(20261016),e=Array.from({length:256},(t,n)=>n);for(let t=255;t>0;t--){const n=Math.floor(s()*(t+1)),i=e[t];e[t]=e[n],e[n]=i}for(let t=0;t<512;t++)Ii[t]=e[t&255]}const av=.5*(Math.sqrt(3)-1),ks=(3-Math.sqrt(3))/6;function cv(s,e){const t=(s+e)*av,n=Math.floor(s+t),i=Math.floor(e+t),r=(n+i)*ks,o=s-n+r,a=e-i+r,c=o>a?1:0,l=1-c,h=o-c+ks,u=a-l+ks,d=o-1+2*ks,m=a-1+2*ks,_=n&255,p=i&255;let g=0,f,x;return f=.5-o*o-a*a,f>0&&(x=Ii[_+Ii[p]]&15,f*=f,g+=f*f*($r[x]*o+Zr[x]*a)),f=.5-h*h-u*u,f>0&&(x=Ii[_+c+Ii[p+l]]&15,f*=f,g+=f*f*($r[x]*h+Zr[x]*u)),f=.5-d*d-m*m,f>0&&(x=Ii[_+1+Ii[p+1]]&15,f*=f,g+=f*f*($r[x]*d+Zr[x]*m)),99*g}const dc=["maple","redmaple","oak","beech","birch","aspen","ginkgo","japanese","spruce","pine","larch","sumac"],Oi=4,fc=3,lv=512,hv=s=>dc.indexOf(s),uv={maple:{leaf:"maple",size:.17,pairs:!0,nodes:7,twigs:6,petiole:.07,droop:.2},redmaple:{leaf:"redmaple",size:.15,pairs:!0,nodes:8,twigs:6,petiole:.06,droop:.15},oak:{leaf:"redoak",size:.19,pairs:!1,nodes:7,twigs:6,petiole:.025,droop:.1,whorl:!0},beech:{leaf:"beech",size:.13,pairs:!1,nodes:11,twigs:7,petiole:.012,droop:.12,flat:!0},birch:{leaf:"birch",size:.11,pairs:!1,nodes:11,twigs:8,petiole:.025,droop:.45},aspen:{leaf:"aspen",size:.11,pairs:!1,nodes:10,twigs:8,petiole:.05,droop:.25},ginkgo:{leaf:"ginkgo",size:.12,pairs:!1,nodes:10,twigs:7,petiole:.04,droop:.2,spur:!0},japanese:{leaf:"maple",size:.11,pairs:!0,nodes:9,twigs:8,petiole:.05,droop:.3,fine:!0},sumac:{leaf:"beech",size:.1,pairs:!0,nodes:12,twigs:6,petiole:0,droop:.35,compound:!0}};function Dh(s){const e=document.createElement("canvas");return e.width=e.height=s,e.getContext("2d",{willReadFrequently:!0})}function ao(s,e,t,n,i,r){const o=[];let a=s,c=e,l=t;for(let h=0;h<=r;h++)o.push([a,c,l]),l+=i/r,a+=Math.cos(l)*n/r,c+=Math.sin(l)*n/r;return o}function Fu(s,e,t,n,i){for(let r=1;r<t.length;r++){const o=n+(i-n)*(r/t.length);for(const[a,c]of[[s,"rgb(58,0,0)"],[e,"#fff"]])a.strokeStyle=c,a.lineWidth=o,a.lineCap="round",a.beginPath(),a.moveTo(t[r-1][0],t[r-1][1]),a.lineTo(t[r][0],t[r][1]),a.stroke()}}function dv(s,e,t,n,i,r,o,a,c){const{cc:l,cm:h}=s,u=e+Math.cos(n)*r*s.S,d=t+Math.sin(n)*r*s.S;if(r>0)for(const[w,R]of[[l,"rgb(74,0,0)"],[h,"#fff"]])w.strokeStyle=R,w.lineWidth=1.6,w.beginPath(),w.moveTo(e,t),w.lineTo(u,d),w.stroke();const m=i*s.S*(.82+.36*c()),_=n+Math.PI/2,p=u+Math.cos(n)*m*.5,g=d+Math.sin(n)*m*.5,f=.8+.2*c(),x=w=>w.setTransform(m*f*Math.cos(_),m*f*Math.sin(_),-m*Math.sin(_),m*Math.cos(_),p,g),v=.72+.28*c(),y=Math.round(255*c()),b=w=>Math.round(255*Math.min(1,w));x(l),l.fillStyle=`rgb(${b(v*.92)},${y},255)`,l.fill(a),c()<.6&&(l.save(),l.scale(.6,.72),l.translate((c()-.5)*.2,(c()-.5)*.2),l.fillStyle=`rgb(${b(v*1.05)},${y},255)`,l.fill(a),l.restore()),l.strokeStyle=`rgba(${b(v*.55)},${y},255,0.5)`,l.lineWidth=1.4/m,l.stroke(a),l.strokeStyle=`rgba(${b(v*.8)},${y},255,0.7)`,l.lineWidth=1.1/m,l.beginPath();for(const[w,R,A,M]of o.veins)l.moveTo(w,R),l.lineTo(A,M);l.stroke(),x(h),h.fillStyle="#fff",h.fill(a);for(const w of[l,h])w.setTransform(1,0,0,1,0,0)}function fv(s,e,t){const n=uv[e],i=s.S,r=[];for(let l=0;l<5;l++){const h=sv(n.leaf,t);r.push({sh:h,path:rv(h)})}const o=ao(i*.5,i*.98,-Math.PI/2+(t()-.5)*.3,i*.86,(t()-.5)*.5,24),a=[o];for(let l=0;l<n.twigs;l++){const h=o[Math.floor(4+l/n.twigs*16+t()*2)],u=l%2?1:-1,d=h[2]+u*(.6+t()*.5);a.push(ao(h[0],h[1],d,i*(.26+t()*.18)*(1-l/(n.twigs*1.6)),-u*(.2+t()*.4),12))}for(const l of a)Fu(s.cc,s.cm,l,l===o?i*.013:i*.008,i*.004);const c=[];for(const l of a){const h=l===o?n.nodes+2:n.nodes;for(let u=1;u<=h;u++){const d=Math.min(l.length-1,Math.floor(u/h*(l.length-1))),[m,_,p]=l[d],g=n.pairs?[-1,1]:[u%2?1:-1];for(const f of g){const x=n.compound?1.35:.75+t()*.6,v=p+f*x+n.droop*(t()-.3);c.push([m,_,v,u/h])}if(u===h&&c.push([m,_,p+(t()-.5)*.3,1]),n.spur&&t()<.6)for(let f=0;f<3;f++)c.push([m,_,p+(f-1)*.7+(t()-.5)*.4,u/h])}}c.sort((l,h)=>l[3]-h[3]);for(const[l,h,u,d]of c){const{sh:m,path:_}=r[Math.floor(t()*r.length)],p=n.size*(.75+.35*d);dv(s,l,h,u,p,n.petiole,m,_,t)}}function pv(s,e,t){const n=s.S,{cc:i,cm:r}=s,o=e==="spruce",a=e==="larch",c=ao(n*.5,n*.99,-Math.PI/2+(t()-.5)*.2,n*.92,(t()-.5)*.3,30),l=[c],h=o?9:a?7:5;for(let u=0;u<h;u++){const d=c[Math.floor(3+u/h*24)];for(const m of[-1,1]){const _=n*(.32-.2*(u/h))*(.8+.4*t());l.push(ao(d[0],d[1],d[2]+m*(.75+t()*.3),_,-m*.15,10))}}for(const u of l)Fu(i,r,u,u===c?n*.012:n*.006,n*.003);for(const u of l)for(let d=0;d<u.length;d++){const[m,_,p]=u[d];if(a){if(d%2)continue;const g=14;for(let f=0;f<g;f++){const x=p+(f/g-.5)*2.6+(t()-.5)*.3,v=n*(.035+.02*t());ua(s,m,_,x,v,n*.004,t)}}else if(o)for(const g of[-1,1,-1,1]){const f=p+g*(.9+t()*.6),x=n*(.03+.015*t());ua(s,m,_,f,x,n*.0055,t)}else{if(d<u.length-4)continue;for(let g=0;g<18;g++){const f=p+(g/18-.5)*2.2+(t()-.5)*.2,x=n*(.1+.04*t());ua(s,m,_,f,x,n*.004,t)}}}}function ua(s,e,t,n,i,r,o){const{cc:a,cm:c}=s,l=e+Math.cos(n)*i,h=t+Math.sin(n)*i,u=Math.round(255*(.65+.35*o())),d=Math.round(255*o());for(const[m,_]of[[a,`rgb(${u},${d},255)`],[c,"#fff"]])m.strokeStyle=_,m.lineWidth=r,m.lineCap="round",m.beginPath(),m.moveTo(e,t),m.lineTo(l,h),m.stroke()}function mv(s=3){const e=lv,t=e*Oi,n=e*fc,i=new Uint8Array(t*n*4),r=qc(s);for(let a=0;a<dc.length;a++){const c=dc[a],l={S:e,cc:Dh(e),cm:Dh(e)};for(const _ of[l.cc,l.cm])_.fillStyle="#000",_.fillRect(0,0,e,e);c==="spruce"||c==="pine"||c==="larch"?pv(l,c,r):fv(l,c,r);const h=l.cc.getImageData(0,0,e,e).data,u=l.cm.getImageData(0,0,e,e).data,d=a%Oi*e,m=Math.floor(a/Oi)*e;for(let _=0;_<e;_++)for(let p=0;p<e;p++){const g=(_*e+p)*4,f=((m+_)*t+d+p)*4,x=u[g],v=x>0?255/x:0;i[f]=Math.min(255,h[g]*v),i[f+1]=Math.min(255,h[g+1]*v),i[f+2]=h[g+2]*v>128?255:0,i[f+3]=x}}gv(i,t,n,6);const o=new fo(i,t,n,ln);return o.flipY=!1,o.magFilter=Dt,o.minFilter=An,o.generateMipmaps=!0,o.anisotropy=4,o.colorSpace=Zn,o.wrapS=o.wrapT=cn,o.needsUpdate=!0,o}function gv(s,e,t,n){const i=new Uint8Array(s.length),r=new Uint8Array(e*t);for(let a=0;a<e*t;a++)r[a]=s[a*4+3]>0?1:0;const o=new Uint8Array(e*t);for(let a=0;a<n;a++){i.set(s),o.set(r);for(let c=1;c<t-1;c++){let l=c*e;for(let h=1;h<e-1;h++){if(l=c*e+h,r[l])continue;const u=r[l+1],d=r[l-1],m=r[l+e],_=r[l-e],p=u+d+m+_;if(!p)continue;let g=0,f=0,x=0;if(u){const y=(l+1)*4;g+=s[y],f+=s[y+1],x+=s[y+2]}if(d){const y=(l-1)*4;g+=s[y],f+=s[y+1],x+=s[y+2]}if(m){const y=(l+e)*4;g+=s[y],f+=s[y+1],x+=s[y+2]}if(_){const y=(l-e)*4;g+=s[y],f+=s[y+1],x+=s[y+2]}const v=l*4;i[v]=g/p,i[v+1]=f/p,i[v+2]=x/p,o[l]=1}}s.set(i),r.set(o)}}const da=[15250492,13072418,12469534,15125079,10301216,13404964,8491076,14000971],hn={time:{value:0},player:{value:new C},sun:{value:new C(-.65,.5,.3).normalize()}},fa={active:!1};function Yc(s){const e=new Dc(s);return e.colorSpace=Ct,e.anisotropy=8,e}function _v(s,e){if(s.beginPath(),e===0)[[0,-1],[.14,-.61],[.36,-.76],[.34,-.43],[.73,-.57],[.57,-.21],[.95,-.18],[.67,.07],[.78,.29],[.38,.25],[.32,.55],[.09,.48],[0,.77],[-.09,.48],[-.32,.55],[-.38,.25],[-.78,.29],[-.67,.07],[-.95,-.18],[-.57,-.21],[-.73,-.57],[-.34,-.43],[-.36,-.76],[-.14,-.61]].forEach((n,i)=>i?s.lineTo(...n):s.moveTo(...n));else if(e===1){s.moveTo(0,-1);for(let t=0;t<=24;t++){let n=t/24*Math.PI;const i=Math.sin(n)*(.74+t%2*.07);s.lineTo(i,-Math.cos(n))}for(let t=24;t>=0;t--){let n=t/24*Math.PI;const i=Math.sin(n)*(.74+t%2*.07);s.lineTo(-i,-Math.cos(n))}}else{s.moveTo(0,-1);for(let t=0;t<=18;t++){const n=t/18*Math.PI;s.lineTo(Math.sin(n)*(.56+.17*Math.cos(n*12)),-Math.cos(n))}for(let t=18;t>=0;t--){const n=t/18*Math.PI;s.lineTo(-Math.sin(n)*(.56+.17*Math.cos(n*12)),-Math.cos(n))}}s.closePath()}function pa(s,e,t,n,i,r,o,a=0){s.save(),s.translate(e,t),s.rotate(i),s.scale(n,n);const c=66+o()*19+a,l=44+o()*13,h=s.createLinearGradient(-.6,-.6,.7,.8);h.addColorStop(0,`hsl(${l},55%,${c+8}%)`),h.addColorStop(.48,`hsl(${l-3},61%,${c}%)`),h.addColorStop(1,`hsl(${l-9},54%,${c-19}%)`),_v(s,r),s.fillStyle=h,s.fill(),s.save(),s.clip();for(let u=0;u<18;u++)s.beginPath(),s.ellipse(o()*1.7-.85,o()*1.7-.85,.012+o()*.09,.01+o()*.045,o()*et,0,et),s.fillStyle=`rgba(72,48,18,${o()*.13})`,s.fill();s.lineWidth=.019,s.strokeStyle="rgba(78,54,20,.3)",s.beginPath(),s.moveTo(0,.95),s.lineTo(0,-.96);for(let u=0;u<7;u++){let d=.55-u*.22;s.moveTo(0,d),s.lineTo(.6-Math.abs(d)*.2,d-.35),s.moveTo(0,d),s.lineTo(-(.6-Math.abs(d)*.2),d-.35)}s.stroke(),s.lineWidth=.008,s.strokeStyle="rgba(255,240,157,.42)",s.beginPath(),s.moveTo(.02,.9),s.lineTo(.02,-.94),s.stroke(),s.restore(),s.lineWidth=.025,s.strokeStyle="#877248",s.beginPath(),s.moveTo(0,.6),s.quadraticCurveTo(.05,.9,.07,1.08),s.stroke(),s.restore()}function xv(){const s=document.createElement("canvas");s.width=2048,s.height=1024;const e=s.getContext("2d"),t=In(221);for(let n=0;n<4;n++){const i=n%2*1024,r=Math.floor(n/2)*512;if(e.save(),e.translate(i,r),n<3){e.strokeStyle="#695333",e.lineCap="round";for(let o=0;o<9;o++){const a=90+o*93,c=365-Math.sin(o/8*Math.PI)*190;e.lineWidth=3.3,e.beginPath(),e.moveTo(500,490),e.quadraticCurveTo(500,250,a,c-75),e.stroke();for(let l=0;l<13;l++){const h=l/13,u=500+(a-500)*h+(t()-.5)*105,d=470+(c-470)*h+(t()-.5)*94;pa(e,u,d,21+t()*21,t()*et,n,t)}}for(let o=0;o<36;o++){let a=t()*et,c=Math.sqrt(t());pa(e,510+Math.cos(a)*c*455,240+Math.sin(a)*c*195,18+t()*26,t()*et,n,t)}}else for(let o=0;o<8;o++)pa(e,90+o*118,250,65+o%3*8,(t()-.5)*.8,o%3,t);e.restore()}return Yc(s)}function vv(){const s=document.createElement("canvas");s.width=512,s.height=1024;const e=s.getContext("2d"),t=In(720631),n=e.createImageData(512,1024);for(let r=0;r<1024;r++)for(let o=0;o<512;o++){const a=(r*512+o)*4,c=Math.sin(o*.051)*3+Math.sin(o*.147+r*.003)*1.6,l=(t()-.5)*12,h=Math.sin(r*.15+o*.014)*1.7,u=204+c+l+h;n.data[a]=u+5,n.data[a+1]=u+3,n.data[a+2]=u-5,n.data[a+3]=255}e.putImageData(n,0,0);for(let r=0;r<65;r++){const o=t()*512,a=t()*1024,c=10+t()*68,l=3+t()*19,h=e.createRadialGradient(o,a,0,o,a,c);h.addColorStop(0,`rgba(118,103,77,${.03+t()*.065})`),h.addColorStop(1,"rgba(118,103,77,0)"),e.fillStyle=h,e.save(),e.translate(o,a),e.scale(1,l/c),e.translate(-o,-a),e.fillRect(o-c,a-c,c*2,c*2),e.restore()}for(let r=0;r<1050;r++){const o=t()*512,a=t()*1024,c=2+Math.pow(t(),3)*42,l=.35+t()*1.8;e.strokeStyle=`rgba(53,50,41,${.18+t()*.42})`,e.lineWidth=l,e.beginPath(),e.moveTo(o,a),e.quadraticCurveTo(o+c*.5,a+(t()-.5)*2.8,o+c,a+(t()-.5)*1.4),e.stroke(),c>18&&(e.strokeStyle="rgba(245,240,220,.54)",e.lineWidth=.9,e.beginPath(),e.moveTo(o+1,a+l+1),e.lineTo(o+c*.82,a+l+1),e.stroke())}for(let r=0;r<23;r++){const o=t()*512,a=t()*1024,c=13+t()*37,l=3+t()*7;e.beginPath(),e.moveTo(o-c,a);for(let h=1;h<=8;h++){const u=h/8;e.lineTo(o-c+u*c*2,a-Math.sin(u*Math.PI)*l*(.45+t()*.6))}for(let h=7;h>=0;h--){const u=h/8;e.lineTo(o-c+u*c*2,a+Math.sin(u*Math.PI)*l*(.24+t()*.36))}e.closePath(),e.fillStyle=`rgba(38,37,32,${.72+t()*.21})`,e.fill(),e.strokeStyle="rgba(237,234,216,.87)",e.lineWidth=1.2,e.stroke(),e.beginPath(),e.moveTo(o-c*.8,a+l*.9),e.quadraticCurveTo(o,a+l*1.6,o+c*.8,a+l*.6),e.strokeStyle="rgba(129,118,94,.53)",e.lineWidth=.8,e.stroke()}const i=Yc(s);return i.wrapS=i.wrapT=ii,i.repeat.set(1,2),i}function yv(){const s=document.createElement("canvas");s.width=s.height=256;const e=s.getContext("2d"),t=In(3842);e.fillStyle="#a5946c",e.fillRect(0,0,256,256);for(let n=0;n<15e3;n++)e.fillStyle=`rgba(45,35,20,${t()*.14})`,e.fillRect(t()*256,t()*256,1+t()*2,1+t()*2);for(let n=0;n<47;n++){e.beginPath();for(let i=0;i<=120;i++){const r=i/120*et,o=n*2.8+Math.sin(r*3+n*.09)*2+Math.sin(r*7)*.6,a=124+Math.cos(r)*o,c=132+Math.sin(r)*o*.96;i?e.lineTo(a,c):e.moveTo(a,c)}e.strokeStyle=`rgba(62,43,22,${.13+t()*.2})`,e.lineWidth=.4+t()*.7,e.stroke()}for(let n=0;n<5;n++){const i=t()*et;e.strokeStyle="rgba(39,28,17,.6)",e.lineWidth=.4+t(),e.beginPath(),e.moveTo(128+Math.cos(i)*128,128+Math.sin(i)*128),e.lineTo(128+Math.cos(i+.04)*75,128+Math.sin(i+.04)*75),e.lineTo(128+Math.cos(i-.02)*49,128+Math.sin(i-.02)*49),e.stroke()}return Yc(s)}function Di(s,e=.1,t=!1){return s.onBeforeCompile=n=>{n.uniforms.uTime=hn.time,n.uniforms.uPlayer=hn.player,n.uniforms.uSun=hn.sun,n.vertexShader=`uniform float uTime; uniform vec3 uPlayer; varying vec3 vForestWorld;
`+n.vertexShader,n.vertexShader=n.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
      vec3 root=position;
      #ifdef USE_INSTANCING
      root=(instanceMatrix*vec4(position,1.)).xyz;
      #endif
      float wind=sin(uTime*.85+root.x*.12+root.z*.18)+sin(uTime*1.63+root.z*.41)*.38;
      float flex=clamp(position.y*.12,0.,1.);
      transformed.x+=wind*${e.toFixed(3)}*flex;
      transformed.z+=cos(uTime*.67+root.x*.17)*${(e*.6).toFixed(3)}*flex;
      vForestWorld=(modelMatrix*vec4(root,1.)).xyz;
    `),n.fragmentShader=`uniform vec3 uSun; varying vec3 vForestWorld;
`+n.fragmentShader,n.fragmentShader=n.fragmentShader.replace("#include <dithering_fragment>",`#include <dithering_fragment>
      ${t?"float backLight=pow(max(0.,dot(normalize(vForestWorld-cameraPosition),uSun)),3.);gl_FragColor.rgb+=diffuseColor.rgb*(.035+backLight*.22);":""}
    `)},s.customProgramCacheKey=()=>`forest-${e}-${t}`,s}async function Mv(s){const e=new wu,t="./textures/",n=async(K,Re=!0)=>{const Je=await e.loadAsync(t+K);return Re&&(Je.colorSpace=Ct),Je.wrapS=Je.wrapT=ii,Je.anisotropy=Math.min(12,s.capabilities.getMaxAnisotropy()),Je},[i,r,o,a,c,l,h,u,d,m,_]=await Promise.all([n("floor.jpg"),n("floor-normal.jpg",!1),n("bark.jpg"),n("bark-normal.jpg",!1),n("rock.jpg"),n("rock-normal.jpg",!1),n("moss.jpg"),n("floor-height.png",!1),n("floor-ao.jpg",!1),n("cliff.jpg"),n("cliff-normal.jpg",!1)]);u.anisotropy=2,d.anisotropy=4,r.anisotropy=4,m.anisotropy=4,_.anisotropy=4;const p=xv();p.anisotropy=8;const g=mv();g.anisotropy=8;const[f,x,v,y,b,w]=await Promise.all([n("leafy_grass.jpg"),n("leafy_grass-normal.jpg",!1),n("rocky_trail_02.jpg"),n("rocky_trail_02-normal.jpg",!1),n("dry_riverbed_rock.jpg"),n("dry_riverbed_rock-normal.jpg",!1)]),R=new It({map:i,normalMap:r,normalScale:new he(.65,.65),roughness:.95,vertexColors:!0});R.onBeforeCompile=K=>{Object.assign(K.uniforms,{meadowMap:{value:f},meadowN:{value:x},pathMap:{value:v},pathN:{value:y},pebbleMap:{value:b},pebbleN:{value:w},mossMap:{value:h},heightMap:{value:u},groundAO:{value:d},cliffMap:{value:m},cliffNormal:{value:_}}),K.vertexShader=`attribute vec4 seasonTone;varying vec4 vSeasonTone;attribute vec4 habitat;attribute float groundDrift;varying float vDrift; varying vec4 vHabitat;varying vec3 vGround; varying vec3 vTerrainNormal;
`+K.vertexShader,K.vertexShader=K.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
vSeasonTone=seasonTone;vGround=position; vTerrainNormal=normal; vHabitat=habitat;vDrift=groundDrift;`),K.fragmentShader=`varying vec4 vSeasonTone;varying float vDrift;varying vec4 vHabitat;uniform sampler2D meadowMap;uniform sampler2D meadowN;uniform sampler2D pathMap;uniform sampler2D pathN;uniform sampler2D pebbleMap;uniform sampler2D pebbleN;varying vec3 vGround;varying vec3 vTerrainNormal;uniform sampler2D mossMap;uniform sampler2D heightMap;uniform sampler2D groundAO;uniform sampler2D cliffMap;uniform sampler2D cliffNormal;
`+K.fragmentShader,K.fragmentShader=K.fragmentShader.replace("#include <map_fragment>",`
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
    `),K.fragmentShader=K.fragmentShader.replace("#include <normal_fragment_maps>",We.normal_fragment_maps.replaceAll("vNormalMapUv","forestUV")+`
      vec3 detailN=texture2D(meadowN,vGround.xz*.24).xyz*2.-1.;detailN=mix(detailN,texture2D(pebbleN,vGround.xz*.5).xyz*2.-1.,vHabitat.z);detailN=mix(detailN,texture2D(pathN,vGround.xz*.4).xyz*2.-1.,vHabitat.y);
      vec3 dn=normalize(surfaceN+vec3(detailN.x,0.,detailN.y)*.5);normal=normalize(mix(normal,mat3(viewMatrix)*dn,max(vHabitat.x,max(vHabitat.z,vHabitat.y))));
      if(cliffAmount>.01){vec3 nx=texture2D(cliffNormal,vGround.yz*.3).xyz*2.-1.,ny=texture2D(cliffNormal,vGround.xz*.3).xyz*2.-1.,nz=texture2D(cliffNormal,vGround.xy*.3).xyz*2.-1.;
      vec3 stoneN=normalize(vec3(nx.z*sign(surfaceN.x),nx.x,nx.y)*weights.x+vec3(ny.x,ny.z*sign(surfaceN.y),ny.y)*weights.y+vec3(nz.x,nz.y,nz.z*sign(surfaceN.z))*weights.z);
      normal=normalize(mix(normal,mat3(viewMatrix)*stoneN,cliffAmount*.85));}
    `)};const A=new It({map:o,normalMap:a,normalScale:new he(.9,.9),color:15853515,roughness:1,vertexColors:!0}),M=vv(),S=new It({map:M,bumpMap:M,bumpScale:.012,roughness:.94,vertexColors:!0}),L=Di(new It({map:g,alphaTest:.28,side:Tt,roughness:.9,metalness:0,vertexColors:!0}),.14,!0),I=L.onBeforeCompile;L.onBeforeCompile=K=>{I(K),K.fragmentShader=K.fragmentShader.replace("#include <map_fragment>",`#ifdef USE_MAP
      vec4 leafSample=texture2D(map,vMapUv);float shade=.52+leafSample.r*.78;vec3 pigment=mix(vec3(.22,.14,.065),vec3(shade),smoothstep(.2,.8,leafSample.b));pigment*=mix(vec3(.83,.91,.72),vec3(1.14,1.,.78),leafSample.g);diffuseColor*=vec4(pigment,leafSample.a);
      #endif`)},L.customProgramCacheKey=()=>"botanical-season-v4",L.alphaToCoverage=!0;const N=await n("october-leaf-sprays.png");N.wrapS=N.wrapT=cn;const U=Di(new It({map:N,alphaTest:.42,side:Tt,roughness:.91,vertexColors:!0}),.12,!0);U.alphaToCoverage=!0;const z=U.onBeforeCompile;U.onBeforeCompile=K=>{z(K),K.fragmentShader=K.fragmentShader.replace("#include <map_fragment>","vec4 texel=texture2D(map,vMapUv);float lum=dot(texel.rgb,vec3(.2126,.7152,.0722));diffuseColor*=vec4(mix(texel.rgb,vec3(lum)*1.32,.72),texel.a);")},U.customProgramCacheKey=()=>"october-photographic-sprays";const O=await new aa().loadAsync("./models/fern/fern.gltf");O.scene.updateMatrixWorld(!0);let G;O.scene.traverse(K=>{K.isMesh&&!G&&(G=K)});const H=G.geometry.clone().applyMatrix4(G.matrixWorld);H.computeBoundingBox();const J=H.boundingBox,te=J.getSize(new C),le=J.getCenter(new C);H.translate(-le.x,-J.min.y,-le.z),H.scale(1/te.y,1/te.y,1/te.y);const ge=Di(G.material.clone(),.055,!0);ge.color.set(12763552),ge.roughness=1,ge.side=Tt,ge.normalScale.set(.55,.55),ge.alphaMap=await n("fern-alpha.png",!1),ge.alphaMap.flipY=!1,ge.alphaTest=.45;const ze=new It({map:c,normalMap:l,normalScale:new he(.8,.8),roughness:.97,vertexColors:!0});ze.onBeforeCompile=K=>{K.vertexShader=`varying vec3 vStone; varying vec3 vStoneNormal;
`+K.vertexShader,K.vertexShader=K.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
    mat4 stoneMatrix=modelMatrix;
    #ifdef USE_INSTANCING
    stoneMatrix=modelMatrix*instanceMatrix;
    #endif
    vStone=(stoneMatrix*vec4(position,1.)).xyz;vStoneNormal=normalize(mat3(stoneMatrix)*normal);
  `),K.fragmentShader=`varying vec3 vStone; varying vec3 vStoneNormal;
`+K.fragmentShader,K.fragmentShader=K.fragmentShader.replace("#include <map_fragment>",`vec3 weights=pow(abs(vStoneNormal),vec3(4.));weights/=dot(weights,vec3(1.));
    vec3 triplanar=texture2D(map,vStone.yz*.38).rgb*weights.x+texture2D(map,vStone.xz*.38).rgb*weights.y+texture2D(map,vStone.xy*.38).rgb*weights.z;
    diffuseColor.rgb*=triplanar;`)};const ot=new It({map:yv(),roughness:.97,side:Tt}),tt=new It({map:o,normalMap:a,color:7563856,roughness:1}),j=await n("fallen-maple-v1.png");j.wrapS=j.wrapT=cn;const Q=new It({map:j,alphaTest:.38,side:Tt,roughness:.96,vertexColors:!0}),pe=new It({color:10636328,roughness:.88,vertexColors:!0}),Ie=new It({map:m,normalMap:_,normalScale:new he(.9,.9),roughness:.87,vertexColors:!0}),Se=await new aa().loadAsync("./models/grass/grass.gltf");Se.scene.updateMatrixWorld(!0);const Ye=[],Lt=await e.loadAsync("./models/grass/alpha.png");Lt.flipY=!1;let D=0;Se.scene.traverse(K=>{if(!K.isMesh)return;const Re=D++;if(![0,6].includes(Re))return;const Je=K.geometry.clone().applyMatrix4(K.matrixWorld);Je.computeBoundingBox();const $e=Je.boundingBox,P=$e.getCenter(new C),E=$e.max.y-$e.min.y;Je.translate(-P.x,-$e.min.y,-P.z);const V=.48;Je.scale(V/E,V/E,V/E);const q=Di(K.material.clone(),.07,!0);q.map=K.material.map,q.alphaMap=Lt,q.alphaTest=.42,q.side=Tt,q.roughness=1,q.color.setRGB(2.3,2.25,1.75),q.emissive.set(2698515),q.emissiveIntensity=.22,q.aoMap=null,q.normalScale?.set(.55,.55),Ye.push({geometry:Je,material:q})});const gt=Ye[0].material;for(let K=0;K<2;K++){const Re=new ri,Je=K===0?[.2,.91,.5,.745]:[.57,.9,.83,.747];for(let P=0;P<3;P++)Re.plane([0,.28,0],1.15,.56,P*Math.PI/3,.06,Je,[1,1,1]);const $e=gt.clone();Di($e,.16,!0),$e.normalMap=null,$e.color.setRGB(2.3,2.25,1.75),$e.emissive.set(2698515),$e.emissiveIntensity=.22,$e.aoMap=null,Ye.push({geometry:Re.geometry(),material:$e})}const Oe=Di(new It({color:16777215,side:Tt,vertexColors:!0,roughness:1}),.19,!0),De=new vn(1,10,6,0,Math.PI*2,0,Math.PI*.5),ve=await new aa().loadAsync("./models/rocks/rocks-game.glb");ve.scene.updateMatrixWorld(!0);const pt=[];return ve.scene.traverse(K=>{if(!K.isMesh)return;const Re=K.geometry.clone().applyMatrix4(K.matrixWorld);Re.computeBoundingBox();const Je=Re.boundingBox,$e=Je.getCenter(new C),P=Je.getSize(new C),E=1/Math.max(P.x,P.z);Re.translate(-$e.x,-Je.min.y,-$e.z),Re.scale(E,E,E);const V=K.material.clone();V.roughness=.94,V.normalScale?.set(.8,.8),Re.computeBoundingBox(),pt.push({geometry:Re,material:V,height:Re.boundingBox.max.y})}),{grassParts:Ye,grass:Oe,shelfGeometry:De,ground:R,trunk:A,birch:S,leaf:L,leafPhoto:U,fern:ge,fernGeometry:H,rockParts:pt,stone:ze,wood:tt,cutWood:ot,fallen:Q,mushroomCap:pe,atlas:p,cliffFace:Ie}}const rs=56,xi=420,gn=256,ti=11,Uh=[["mirrorpond","Copper mirror",2,28,"pond"],["island","An island of red maples",2,29,"island"],["birchhall","The white woods",1,28,"grove"],["aspenwheel","Quaking aspen hollow",1,26,"grove"],["scarletaisle","Scarlet passage",2,21,"aisle"],["beechcathedral","Old beech canopy",3,24,"grove"],["ginkgo","Golden fan grove",6,23,"grove"],["orchard","The overgrown orchard",0,26,"grove"],["ferngully","Fern gully",4,23,"hollow"],["mossgrotto","Moss grotto",4,21,"hollow"],["splitrock","The split granite",5,20,"stone"],["bouldergarden","Glacial boulder garden",5,27,"stone"],["basalt","The stone organ",5,22,"stone"],["overlook","Heather ridge",5,27,"ridge"],["standingstones","Sleeping stones",6,22,"stone"],["stonearch","The last doorway",2,22,"ruin"],["ruinedgarden","The garden that returned",4,25,"ruin"],["hearthruin","The old hearth",3,21,"ruin"],["oldsteps","Forgotten stair",4,21,"steps"],["hollowgiant","The hollow giant",3,22,"log"],["windfall","Windfall clearing",0,28,"log"],["leafbowl","A bowl of copper leaves",6,24,"bowl"],["mushroomring","The quiet ring",3,20,"grove"],["berrycopse","Rowan and rosehips",2,22,"grove"],["heather","The violet hillside",5,25,"ridge"],["meadowoak","The meadow oak",0,34,"meadow"],["cedarpond","The dark green pool",4,28,"pond"],["reedmarsh","A reed filled hollow",0,29,"marsh"],["larchridge","Golden larch ridge",5,28,"ridge"],["spring","The hidden spring",4,22,"pond"],["rootgate","The roots of an ancient tree",3,22,"grove"],["amphitheatre","The autumn amphitheatre",2,29,"bowl"],["maplegarden","A garden of small maples",2,25,"grove"],["pineglade","The scented pine glade",3,26,"grove"],["silvermeadow","Silver grass meadow",0,34,"meadow"],["cairntrail","The cairn trail",5,22,"stone"]].map(([s,e,t,n,i])=>({kind:s,name:e,type:t,radius:n,shape:i}));function Sv(s){return Math.round(s/xi)}function or(s,e=0){return e*xi-4+Math.sin(s*.017+e*2)*12+Math.sin(s*.043+e)*3}function jc(s,e=0){const t=Math.round((s+64)/gn),n=t*gn-64;return{id:e+":"+t,x:or(n,e),z:n,low:-t*ti,high:(1-t)*ti,index:e,k:t,width:3.4+Ke(e,t,72)*2.8}}function yn(s,e){const t=Sv(s),n=jc(e,t),i=e-n.z,r=or(e,t),o=Math.exp(-Math.pow((i-15)/17,2)),a=3.4+Math.sin(e*.023+t)*.7+o*7,c=n.low+(i<-.6?ti:i>1.8?0:ti*(1-bt(-.6,1.8,i)));return{index:t,f:n,v:i,x:r,d:Math.abs(s-r),width:a,level:c,pool:o}}function zu(s,e){const t=yn(s,e),n=t.f,i=t.v,r=n.low+ti*(1-bt(-31,22,i)),o=bt(57,185,t.d)*(14+Ph(s*.008,e*.009,71)*43);let a=r+1.1+Ph(s*.023,e*.023,13)*4.2+o+Math.pow(Tn(s*.018+Tn(e*.01,0,72)*2,e*.015,73),2)*o*.7+Tn(s*.13,e*.13,65)*.28;const c=1-bt(9,31,t.d),l=(Tn(s*.14,n.z*.19,777)-.5)*5*bt(5,19,t.d),h=1-bt(-2+l,2.7+l,i);a=je(a,n.low+ti*h+1+Tn(s*.17,e*.14,54)*1.5,c*(1-bt(12,32,Math.abs(i))));const u=t.level-(.35+t.pool*1.9)-(1-bt(0,t.width,t.d))*.58;return je(u,a,bt(t.width*.66,t.width+4.6,t.d))}const os=new Map;function Ou(s,e){const t=s+","+e;if(os.has(t))return os.get(t);let n=s*106+(Ke(s,e,40)-.5)*34,i=e*112+(Ke(s,e,41)-.5)*38,r=Math.floor(Ke(s,e,842)*Uh.length);s===0&&e===0&&(n=55,i=-10,r=0),s===-1&&e===0&&(n=-67,i=3,r=2),s===-1&&e===-1&&(n=-67,i=-105,r=15),s===0&&e===-1&&(n=43,i=-120,r=9),s===1&&e===0&&(n=145,i=6,r=13),s===0&&e===1&&(n=39,i=107,r=25);const o=Uh[r],a=yn(n,i),c=["pond","island","marsh"].includes(o.shape);c&&a.d<36&&(n=a.x+(n<a.x?-1:1)*43);const l=o.radius*(.88+Ke(s,e,43)*.27),h=Ke(s,e,48)*et,u={...o,id:t,gx:s,gz:e,x:n,z:i,rx:l*1.12,rz:l*(1+Ke(s,e,44)*.24),radius:l,angle:h,ca:Math.cos(h),sa:Math.sin(h),seed:Ke(s,e,45)*1e8,variant:Ke(s,e,46),pond:c,pondRX:l*.57,pondRZ:l*.69,region:Tn(n*.0017,i*.0017,391),h:zu(n,i)};return u.water=u.h-.6,u.depth=u.shape==="marsh"?.55:u.kind==="spring"?1.05:2.25,os.set(t,u),os.size>600&&os.delete(os.keys().next().value),u}function ku(s,e,t=190){const n=[],i=Math.round(s/106),r=Math.round(e/112);for(let o=-2;o<=2;o++)for(let a=-2;a<=2;a++){const c=Ou(i+a,r+o);Math.hypot(c.x-s,c.z-e)<t&&n.push(c)}return n}let Nh=1e9,Fh=1e9,Vr=[];function ar(s,e){const t=Math.round(s/106),n=Math.round(e/112);if(t!==Nh||n!==Fh){Nh=t,Fh=n,Vr=[];for(let o=-1;o<=1;o++)for(let a=-1;a<=1;a++)Vr.push(Ou(t+a,n+o))}let i=Vr[0],r=1/0;for(const o of Vr){const a=((s-o.x)/o.rx)**2+((e-o.z)/o.rz)**2;a<r&&(i=o,r=a)}return i}function Kc(s,e,t){const n=e-s.x,i=t-s.z;return{u:n*s.ca+i*s.sa,v:-n*s.sa+i*s.ca}}function cr(s,e,t){const n=Kc(s,e,t);return Math.hypot(n.u/s.pondRX,n.v/s.pondRZ)*(1+.045*Math.sin(Math.atan2(n.v,n.u)*5+s.variant*20))}function vi(s,e){const t=ar(s,e),n=Math.hypot((s-t.x)/t.rx,(e-t.z)/t.rz),i=1-bt(.65,1.65,n);return{site:t,type:t.type,weight:i,meadow:t.type===0?i:0,birch:t.type===1?i:0,maple:t.type===2?i:0,old:t.type===3?i:0,fern:t.type===4?i:0,rock:t.type===5?i:0,leaves:t.type===6?i:0}}function Bu(s,e){const t=Math.round(s/xi),n=Math.round((e-60)/gn),i=n*gn+45+Ke(t,n,732)*32,r=or(i,t),o=yn(r,i).width+12;return Math.abs(e-i)+bt(o,o+14,Math.abs(s-r))*40}function lr(s,e){const t=yn(s,e),n=t.x+17+Math.sin(e*.034+t.index)*5,i=t.x-22+Math.sin(e*.021)*7,r=Math.round(e/112)*112+18+Math.sin(s*.028)*13,o=ar(s,e),a=Kc(o,s,e),c=Math.abs(a.u-Math.sin(a.v*.075+o.variant)*2.8),l=bt(o.radius,o.radius+13,Math.abs(a.v)),h=o.pond?Math.abs(cr(o,s,e)-1.39)*o.radius:c+l*20;return Math.min(Bu(s,e),Math.abs(s-n),Math.abs(s-i)*1.25,Math.abs(e-r)*1.1,h)}function pc(s,e){const t=vi(s,e);if(t.meadow>.3||t.rock>.5||t.site.pond)return 0;const n=Math.round(s/19),i=Math.round(e/19),r=n*19+(Ke(n,i,411)-.5)*9,o=i*19+(Ke(n,i,412)-.5)*9,a=Math.exp(-Math.pow((s-r)/(2.2+Ke(n,i,414)*2.8),2)-Math.pow((e-o)/2.5,2));return(Math.pow(Math.max(0,(Tn(s*.075,e*.075,555)-.51)/.49),2.3)*.35+a*(Ke(n,i,413)>.65||t.leaves>.5?.85+t.leaves*.55:0))*bt(.7,2.4,lr(s,e))}function Ce(s,e){let t=zu(s,e);const n=vi(s,e),i=n.site,r=yn(s,e),o=Kc(i,s,e),a=Math.hypot(o.u/i.rx,o.v/i.rz),c=bt(r.width+4,r.width+12,r.d),l=(1-bt(.6,1.5,a))*c;let h=i.h+(Tn(s*.075,e*.075,321)-.5)*.35;if(i.shape==="ridge"&&(h+=Math.sin(o.u*.055)*2.5+o.v*.08),i.shape==="hollow"&&(h-=2*(1-bt(4,22,Math.hypot(o.u,o.v)))),i.shape==="bowl"&&(h-=2.2*(1-bt(3,22,Math.hypot(o.u,o.v)))),i.shape==="steps"&&(h+=o.v*.14),t=je(t,h,l*.82),i.pond){const u=cr(i,s,e);let d=i.water-i.depth*(1-bt(.2,1.01,u));i.shape==="island"&&(d=je(d,i.water+1.8,1-bt(.16,.37,u))),t=je(t,d,1-bt(.92,1.23,u))}return t-=.1*(1-bt(.5,2.4,lr(s,e))),t+pc(s,e)*c}function ki(s,e){return new C(Ce(s-.22,e)-Ce(s+.22,e),.44,Ce(s,e-.22)-Ce(s,e+.22)).normalize()}function kt(s,e){const t=ar(s,e);return t.pond&&cr(t,s,e)<1.26?t.water:yn(s,e).level}function bv(s,e){if(Ce(s,e)<kt(s,e))return"water";const n=vi(s,e);return lr(s,e)<1.1?"dirt":n.meadow>.45?"grass":ki(s,e).y<.75||n.rock>.6?"stone":"leaves"}function wv(s,e,t){const n=yn(s,e),i=ar(s,e),r=i.pond&&cr(i,s,e)<1.26,o=r?i.water:n.level,a=Math.max(0,o-Ce(s,e)),c=a>.04&&(r||n.d<n.width+4),l=r?0:(1-bt(2.4,6.8,Math.abs(s-n.f.x)))*(1-bt(3,10,Math.abs(e-n.f.z-2.5)))*_o((n.f.high-t+2)/3);return{level:o,depth:c?a:0,swimming:c&&a>1.4,underwater:c&&t<o-.05,spray:l,inPond:r}}const Ev="varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",Tv=`
uniform mat4 projectionInverse;uniform mat4 cameraWorld;uniform float fogBase;uniform float mist;uniform vec3 fogColor;
uniform sampler2D sceneTex;uniform sampler2D depthTex;uniform vec2 sunScreen;uniform float sunVisible;uniform float clock;uniform vec2 resolution;uniform float wetness;uniform float spray;uniform float underwater;
varying vec2 vUv;
float rand(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float viewDepth(float d){return (2.*.07*1450.)/(1450.+.07-(d*2.-1.)*(1450.-.07));}
void main(){
  vec2 uv=vUv,distort=vec2(0.);float glint=0.;
  for(int i=0;i<18;i++){float seed=float(i);float a=rand(vec2(seed,2.)),b=rand(vec2(seed,5.));vec2 centre=vec2(a,fract(b-clock*(.006+a*.009)));vec2 delta=(vUv-centre)*vec2(resolution.x/resolution.y,1.);float size=(.009+rand(vec2(seed,9.))*.014)*wetness;float d=length(delta);if(d<size){vec2 n=delta/max(size,.0001);distort+=n*(1.-d/max(size,.0001))*.017*wetness;glint+=pow(max(0.,dot(normalize(vec3(-n,1.)),normalize(vec3(-1.,1.,.3)))),28.)*.15*wetness;}}
  vec3 c=texture2D(sceneTex,clamp(uv+distort,.001,.999)).rgb+glint;
  float depth=viewDepth(texture2D(depthTex,vUv).x);float ao=0.;vec2 slope=vec2(dFdx(depth),dFdy(depth));float radius=clamp(42./max(depth,1.),1.5,9.);for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 px=vec2(cos(a),sin(a))*radius;float sampleDepth=viewDepth(texture2D(depthTex,vUv+px/resolution).x);float above=depth+dot(slope,px)-sampleDepth;ao+=smoothstep(.035,.18,above)*(1.-smoothstep(.25,1.4,above));}c*=1.-ao*.037;
  if(depth<1400.){vec4 ray=projectionInverse*vec4(vUv*2.-1.,1.,1.);vec3 view=ray.xyz/ray.w;view*=depth/max(.001,-view.z);vec3 wp=(cameraWorld*vec4(view,1.)).xyz;float low=exp(-max(0.,wp.y-fogBase)*.17);float veil=(1.-exp(-depth*.0033))*low*mist;c=mix(c,fogColor,veil*.65);}
  c=mix(c,c*vec3(.38,.77,.72)+vec3(.01,.035,.026),underwater*.78);
  vec2 ray=(sunScreen-vUv)/14.;vec2 p=vUv;float rays=0.;float weight=1.;
  for(int i=0;i<14;i++){p+=ray;float d=texture2D(depthTex,clamp(p,.001,.999)).x;float light=smoothstep(.99994,.999999,d);float edge=step(0.,p.x)*step(p.x,1.)*step(0.,p.y)*step(p.y,1.);rays+=light*weight*edge;weight*=.915;}
  float sunDist=length((sunScreen-vUv)*vec2(resolution.x/resolution.y,1.));
  c+=vec3(1.,.83,.58)*rays*.01*sunVisible*max(0.,1.2-sunDist*.5);
  vec2 q=vUv*(1.-vUv.yx);float vignette=pow(clamp(q.x*q.y*18.,0.,1.),.07);c*=mix(.88,1.,vignette);
  c+=vec3(rand(vUv*resolution+fract(clock))-.5)*.002;
  gl_FragColor=vec4(c,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;class Av{constructor(e){this.renderer=new xx({canvas:e,antialias:!0,powerPreference:"high-performance",alpha:!1}),this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.3)),this.renderer.setSize(innerWidth,innerHeight),this.renderer.outputColorSpace=Ct,this.renderer.toneMapping=Kh,this.renderer.toneMappingExposure=1.12,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Yh,this.renderer.shadowMap.autoUpdate=!1,this.scene=new Dl,this.scene.fog=new Cc(11846851,.0028),this.camera=new Yt(67,innerWidth/innerHeight,.07,1450),this.camera.rotation.order="YXZ",this.hemi=new vp(12835299,7628614,1.65),this.scene.add(this.hemi),this.sun=new Eu(16768941,2.8),this.sun.castShadow=!0,this.sun.shadow.mapSize.set(2048,2048),this.sun.shadow.camera.left=-49,this.sun.shadow.camera.right=49,this.sun.shadow.camera.top=49,this.sun.shadow.camera.bottom=-49,this.sun.shadow.camera.near=1,this.sun.shadow.camera.far=180,this.sun.shadow.bias=-18e-5,this.sun.shadow.normalBias=.065,this.sun.shadow.radius=2,this.scene.add(this.sun,this.sun.target),this.sky(),this.target=new si(innerWidth,innerHeight,{type:Rn,depthBuffer:!0,samples:2}),this.target.depthTexture=new Uc(innerWidth,innerHeight),this.target.depthTexture.type=yi,this.postScene=new Dl,this.postCamera=new Rc,this.post=new tn({uniforms:{projectionInverse:{value:this.camera.projectionMatrixInverse},cameraWorld:{value:this.camera.matrixWorld},fogBase:{value:0},mist:{value:.4},fogColor:{value:new xe(12699068)},sceneTex:{value:this.target.texture},depthTex:{value:this.target.depthTexture},sunScreen:{value:new he},sunVisible:{value:1},clock:{value:0},wetness:{value:0},spray:{value:0},underwater:{value:0},resolution:{value:new he(innerWidth,innerHeight)}},vertexShader:Ev,fragmentShader:Tv,depthTest:!1,depthWrite:!1}),this.postScene.add(new rt(new Mi(2,2),this.post)),this.ticks=0,this.quality="high",this.shadowAt=new C(999,999,999),this.size(),window.addEventListener("resize",()=>this.size())}async loadSky(){const e=await new yx().loadAsync("./textures/sky.hdr");e.mapping=eo,this.scene.background=e,this.scene.backgroundIntensity=.72,this.scene.backgroundRotation.y=1.7,this.skydome.visible=!1}sky(){const e=new tn({side:Vt,depthWrite:!1,uniforms:{sunDirection:hn.sun},vertexShader:"varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:`
    uniform vec3 sunDirection;varying vec3 vDir;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);float dotSun=max(0.,dot(d,sunDirection));vec3 low=vec3(.5,.63,.65),high=vec3(.025,.12,.22);vec3 col=mix(low,high,pow(h,.6));col+=vec3(.6,.37,.13)*pow(dotSun,7.)*.45;col+=vec3(1.8,1.3,.7)*pow(dotSun,1000.);vec2 p=d.xz/max(.1,d.y)*1.2;float cloud=noise(p)*.6+noise(p*2.8)*.26+noise(p*7.5)*.14;float wisps=smoothstep(.6,.82,cloud)*smoothstep(.02,.3,h)*.32;col=mix(col,vec3(.9,.88,.78),wisps);gl_FragColor=vec4(col,1.);}`});this.skydome=new rt(new vn(1300,32,16),e),this.skydome.renderOrder=-100,this.scene.add(this.skydome)}size(){const e=this.quality==="high"?Math.min(devicePixelRatio,1.3):this.quality==="ultra"?Math.min(devicePixelRatio*1.25,1.8):Math.min(devicePixelRatio,1)*.8;this.renderer.setPixelRatio(e),this.renderer.setSize(innerWidth,innerHeight),this.target.setSize(Math.round(innerWidth*e),Math.round(innerHeight*e)),this.camera.aspect=innerWidth/innerHeight,this.camera.updateProjectionMatrix(),this.post.uniforms.resolution.value.set(innerWidth*e,innerHeight*e)}setWetness(e,t,n){this.post.uniforms.wetness.value=e,this.post.uniforms.spray.value=t,this.post.uniforms.underwater.value=n?1:0}detail(){return this.quality=this.quality==="high"?"ultra":this.quality==="ultra"?"balanced":"high",this.size(),this.quality}render(e){const t=e/1700,n=.91+Math.sin(e*.037)*.065+Math.sin(e*.083)*.025;hn.sun.value.set(-.68+Math.sin(t)*.16,.4+Math.sin(t*.7)*.13,.42).normalize(),this.sun.intensity=2.65*n,this.hemi.intensity=1.65+(1-n)*.4,this.scene.backgroundIntensity=.68+(n-.9)*.2;const i=vi(this.camera.position.x,this.camera.position.z),r=i.fern*.6+(i.site.pond?.4:0);this.post.uniforms.mist.value=.27+r+(.5+.5*Math.sin(e*.006))*.19,this.post.uniforms.fogBase.value=Ce(this.camera.position.x,this.camera.position.z)+1.7;const o=this.camera;this.skydome.position.copy(o.position);const c=o.position.clone().addScaledVector(hn.sun.value,200).project(o);if(this.post.uniforms.sunScreen.value.set(c.x*.5+.5,c.y*.5+.5),this.post.uniforms.sunVisible.value=c.z<1?1:0,this.post.uniforms.clock.value=e,o.position.distanceToSquared(this.shadowAt)>3||this.ticks%90===0){const u=Math.round(o.position.x*4)/4,d=Math.round(o.position.z*4)/4;this.sun.target.position.set(u,o.position.y+5,d),this.sun.position.copy(this.sun.target.position).addScaledVector(hn.sun.value,90),this.renderer.shadowMap.needsUpdate=!0,this.shadowAt.copy(o.position)}this.renderer.setRenderTarget(this.target),this.renderer.render(this.scene,o);const l=this.renderer.info.render.calls,h=this.renderer.info.render.triangles;return this.renderer.setRenderTarget(null),this.renderer.render(this.postScene,this.postCamera),this.ticks++,{calls:l,tris:h}}}class xo extends rt{constructor(e,t={}){super(e),this.isReflector=!0,this.type="Reflector",this.forceUpdate=!1,this.camera=new Yt;const n=this,i=t.color!==void 0?new xe(t.color):new xe(8355711),r=t.textureWidth||512,o=t.textureHeight||512,a=t.clipBias||0,c=t.shader||xo.ReflectorShader,l=t.multisample!==void 0?t.multisample:4,h=new mi,u=new C,d=new C,m=new C,_=new ke,p=new C(0,0,-1),g=new it,f=new C,x=new C,v=new it,y=new ke,b=this.camera,w=new si(r,o,{samples:l,type:Rn}),R=new tn({name:c.name!==void 0?c.name:"unspecified",uniforms:fu.clone(c.uniforms),fragmentShader:c.fragmentShader,vertexShader:c.vertexShader});R.uniforms.tDiffuse.value=w.texture,R.uniforms.color.value=i,R.uniforms.textureMatrix.value=y,this.material=R,this.onBeforeRender=function(A,M,S){if(d.setFromMatrixPosition(n.matrixWorld),m.setFromMatrixPosition(S.matrixWorld),_.extractRotation(n.matrixWorld),u.set(0,0,1),u.applyMatrix4(_),f.subVectors(d,m),f.dot(u)>0===!0&&this.forceUpdate===!1)return;f.reflect(u).negate(),f.add(d),_.extractRotation(S.matrixWorld),p.set(0,0,-1),p.applyMatrix4(_),p.add(m),x.subVectors(d,p),x.reflect(u).negate(),x.add(d),b.position.copy(f),b.up.set(0,1,0),b.up.applyMatrix4(_),b.up.reflect(u),b.lookAt(x),b.far=S.far,b.updateMatrixWorld(),b.projectionMatrix.copy(S.projectionMatrix),y.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),y.multiply(b.projectionMatrix),y.multiply(b.matrixWorldInverse),y.multiply(n.matrixWorld),h.setFromNormalAndCoplanarPoint(u,d),h.applyMatrix4(b.matrixWorldInverse),g.set(h.normal.x,h.normal.y,h.normal.z,h.constant);const I=b.projectionMatrix;v.x=(Math.sign(g.x)+I.elements[8])/I.elements[0],v.y=(Math.sign(g.y)+I.elements[9])/I.elements[5],v.z=-1,v.w=(1+I.elements[10])/I.elements[14],g.multiplyScalar(2/g.dot(v)),I.elements[2]=g.x,I.elements[6]=g.y,I.elements[10]=g.z+1-a,I.elements[14]=g.w,n.visible=!1;const N=A.getRenderTarget(),U=A.xr.enabled,z=A.shadowMap.autoUpdate;A.xr.enabled=!1,A.shadowMap.autoUpdate=!1,A.setRenderTarget(w),A.state.buffers.depth.setMask(!0),A.autoClear===!1&&A.clear(),A.render(M,b),A.xr.enabled=U,A.shadowMap.autoUpdate=z,A.setRenderTarget(N);const O=S.viewport;O!==void 0&&A.state.viewport(O),n.visible=!0,this.forceUpdate=!1},this.getRenderTarget=function(){return w},this.dispose=function(){w.dispose(),n.material.dispose()}}}xo.ReflectorShader={name:"ReflectorShader",uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null}},vertexShader:`
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

		}`};const ma="float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.),f.x),f.y);}float fb(vec2 p){return n2(p)*.6+n2(p*2.13)*.27+n2(p*4.1)*.13;}";class Rv{constructor(e,t){this.scene=e,this.materials=t,this.group=new qe,e.add(this.group),this.surfaces=[],this.falls=[],this.sources=[],this.frame=0,this.key="",this.ripples=Array.from({length:8},()=>new it(0,0,-100,0)),this.rippleIndex=0,this.makeMaterials()}makeMaterials(){this.sheetMaterial=new tn({side:Tt,transparent:!0,depthWrite:!1,uniforms:{time:hn.time},vertexShader:"varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:`uniform float time;varying vec2 vUv;varying vec3 vWorld;${ma}
 void main(){float travel=sqrt(max(.001,vUv.y));vec2 p=vec2(vUv.x*36.,travel*13.-time*8.6);float threads=fb(p*vec2(1.,.45));float broken=fb(p*vec2(2.2,.9)+17.);float edge=smoothstep(0.,.055,vUv.x)*smoothstep(1.,.945,vUv.x);float grain=n2(vec2(vUv.x*135.,travel*87.-time*32.));float a=(.09+smoothstep(.31,.73,threads)*.55)*edge*(.76+grain*.36);vec3 c=mix(vec3(.16,.29,.3),vec3(.76,.86,.83),smoothstep(.29,.73,threads));c+=pow(broken,5.)*.24+pow(grain,8.)*.07;gl_FragColor=vec4(c,a);#include <tonemapping_fragment>
 #include <colorspace_fragment>}`.replace(";#include",`;
#include`)}),this.sprayMaterial=new oo({color:14807018,size:.07,transparent:!0,opacity:.5,depthWrite:!1,sizeAttenuation:!0});const e=document.createElement("canvas");e.width=e.height=64;const t=e.getContext("2d"),n=t.createRadialGradient(32,32,0,32,32,32);n.addColorStop(0,"rgba(255,255,255,.7)"),n.addColorStop(.3,"rgba(255,255,255,.35)"),n.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=n,t.fillRect(0,0,64,64),this.mistMap=new Dc(e),this.sprayMaterial.map=this.mistMap,this.sprayMaterial.alphaTest=.015,this.mistMaterial=new oo({map:this.mistMap,color:13886174,size:3.7,transparent:!0,opacity:.17,depthWrite:!1}),this.foamMaterial=new tn({transparent:!0,depthWrite:!1,side:Tt,uniforms:{time:hn.time},vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:`varying vec2 vUv;uniform float time;${ma}void main(){vec2 q=(vUv-.5)*2.;float d=length(q*vec2(1.,.74));float n=fb(vUv*vec2(17.,24.)-vec2(0.,time*.8));float a=(1.-smoothstep(.2,1.,d))*smoothstep(.38,.72,n)*.32;gl_FragColor=vec4(.75,.87,.82,a);}`})}surface(e,t,n,i,r=null){const o=r?r.water:-t*ti,a=new ri,c=r?44:Math.ceil((i-n)/1.5),l=r?44:14;for(let p=0;p<=c;p++){const g=n+(i-n)*p/c,f=yn(e*xi,g);for(let x=0;x<=l;x++){const v=x/l*2-1,y=r?r.x+v*r.radius*1.05:f.x+v*(f.width+4);if(a.vertex([y,-g,0],[0,0,1],[y,g],[1,1,1]),x<l&&p<c){const b=p*(l+1)+x;a.i.push(b,b+1,b+l+1,b+1,b+l+2,b+l+1)}}}const h=a.geometry(),u=new Float32Array(h.attributes.position.count);for(let p=0;p<u.length;p++)u[p]=r&&cr(r,h.attributes.position.getX(p),-h.attributes.position.getY(p))>1.23?0:Math.max(0,o-Ce(h.attributes.position.getX(p),-h.attributes.position.getY(p)));h.setAttribute("waterDepth",new wt(u,1));const d=new xo(h,{textureWidth:512,textureHeight:512,clipBias:.002});d.rotation.x=-Math.PI/2,d.position.y=o+.018;const m=d.material;Object.assign(m.uniforms,{time:hn.time,sunDirection:hn.sun,ripples:{value:this.ripples},flow:{value:r?.025:.19}}),m.vertexShader="uniform mat4 textureMatrix;varying vec4 vCoord;varying vec3 vWorld;varying float vDepth;attribute float waterDepth;void main(){vCoord=textureMatrix*vec4(position,1.);vWorld=(modelMatrix*vec4(position,1.)).xyz;vDepth=waterDepth;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",m.fragmentShader=`uniform sampler2D tDiffuse;uniform float time;uniform float flow;uniform vec3 sunDirection;uniform vec4 ripples[8];varying vec4 vCoord;varying vec3 vWorld;varying float vDepth;${ma}
  void main(){if(vDepth<.008)discard;vec2 p=vWorld.xz*.65-vec2(time*flow*.16,time*flow);float h=fb(p),hx=fb(p+vec2(.04,0.)),hy=fb(p+vec2(0.,.04));vec2 grad=vec2(h-hx,h-hy)*.48;
  for(int i=0;i<8;i++){float age=time-ripples[i].z;if(age>0.&&age<3.4){vec2 d=vWorld.xz-ripples[i].xy;float len=length(d);float ring=sin((len-age*1.9)*24.)*exp(-pow((len-age*1.9)*3.,2.))*(1.-age/3.4);grad+=normalize(d+vec2(.0001))*ring*.013;}}
  vec3 normal=normalize(vec3(grad.x,1.,grad.y)),view=normalize(cameraPosition-vWorld);float fresnel=.025+.975*pow(1.-max(0.,dot(normal,view)),5.);vec4 coord=vCoord;coord.xy+=grad*.14*coord.w;vec3 reflected=texture2DProj(tDiffuse,coord).rgb;vec3 body=mix(vec3(.13,.24,.18),vec3(.025,.12,.115),smoothstep(0.,2.3,vDepth));vec3 c=mix(body,reflected,clamp(fresnel+.28,0.,.96));float spec=pow(max(0.,dot(normal,normalize(sunDirection+view))),200.);c+=vec3(1.,.85,.53)*spec*.65;float edgeFoam=(1.-smoothstep(.02,.24,vDepth))*smoothstep(.58,.79,fb(vWorld.xz*3.-vec2(time*.12,time*.45)));c=mix(c,vec3(.7,.78,.67),edgeFoam*.5);gl_FragColor=vec4(c,smoothstep(0.,.23,vDepth)*.92);#include <tonemapping_fragment>
  #include <colorspace_fragment>}`.replace(";#include",`;
#include`),m.transparent=!0,m.depthWrite=!1,m.side=Vt,d.renderOrder=1;const _=d.onBeforeRender;d.onBeforeRender=(...p)=>{if(fa.active||this.didReflect===this.frame||this.frame%8!==0&&!d.userData.fresh||!d.userData.fresh&&d!==this.closest||(this.didReflect=this.frame,Math.abs(p[2].position.y-o)>55))return;d.userData.fresh=!1,fa.active=!0;const g=p[0].shadowMap.needsUpdate;p[0].shadowMap.needsUpdate=!1,this.surfaces.forEach(f=>f.visible=!1);try{_.call(d,...p)}finally{this.surfaces.forEach(f=>f.visible=!0),p[0].shadowMap.needsUpdate=g,fa.active=!1}},d.userData.fresh=!0,d.userData.level=o,d.userData.midZ=(n+i)/2,d.userData.midX=r?r.x:or((n+i)/2,e),d.userData.pondId=r?.id,this.group.add(d),this.surfaces.push(d)}waterfall(e){const t=In(e.k*15+e.index*381+756),n=new ri,i=e.width,r=38,o=42;for(let f=0;f<=r;f++){const x=f/r;for(let v=0;v<=o;v++){const y=v/o*2-1,b=e.x+y*i,w=e.z-.65+x*2.9+Math.sin(y*6)*.14*x,R=e.high-ti*x*x,A=(Math.sin(y*37)*.21+Math.sin(y*63)*.11)*x;if(n.vertex([b,R,w+A],[0,.18,1],[v/o,x*x],[1,1,1]),v<o&&f<r){const M=f*(o+1)+v;n.i.push(M,M+1,M+o+1,M+1,M+o+2,M+o+1)}}}const a=new rt(n.geometry(),this.sheetMaterial);a.renderOrder=2,this.group.add(a);const c=new rt(n.geometry(),this.sheetMaterial);c.position.z=-.27,c.scale.x=1,this.group.add(c);const l=420,h=new Float32Array(l*3),u=[];for(let f=0;f<l;f++)u.push({u:(t()*2-1)*i,p:t(),s:.8+t()*.7});const d=new At;d.setAttribute("position",new wt(h,3));const m=new ac(d,this.sprayMaterial);m.frustumCulled=!1,this.group.add(m);const _=new At;_.setAttribute("position",new wt(new Float32Array(105),3));const p=new ac(_,this.mistMaterial);p.frustumCulled=!1,this.group.add(p);const g=new rt(new Mi(i*2.5,7),this.foamMaterial);g.rotation.x=-Math.PI/2,g.position.set(e.x,e.low+.045,e.z+4.1),g.renderOrder=3,this.group.add(g),this.falls.push({f:e,seeds:u,spray:m,mist:p}),this.sources.push({id:e.id,x:e.x,y:e.low+2,z:e.z+2})}rebuild(e,t){const n=Math.round(e/xi),i=Math.floor((t+64)/gn),r=n+","+i;if(r!==this.key){this.key=r;for(const o of[...this.group.children])this.group.remove(o),o.geometry?.dispose(),o.isReflector&&o.dispose();this.surfaces=[],this.falls=[],this.sources=[],this.pondKey="";for(let o=n-1;o<=n+1;o++)for(let a=i-1;a<=i+1;a++)Math.abs(o*xi-e)>310||(this.surface(o,a,a*gn-64+1.8,(a+1)*gn-64-.6),this.waterfall(jc(a*gn-64,o)))}}syncPonds(e,t){const n=Math.floor(e/56)+","+Math.floor(t/56);if(n===this.pondKey)return;this.pondKey=n;const i=ku(e,t,200).filter(o=>o.pond),r=new Set(i.map(o=>o.id));for(const o of[...this.surfaces])o.userData.pondId&&!r.has(o.userData.pondId)&&(this.group.remove(o),o.geometry.dispose(),o.dispose(),this.surfaces.splice(this.surfaces.indexOf(o),1));for(const o of i)this.surfaces.some(a=>a.userData.pondId===o.id)||this.surface(0,0,o.z-o.radius*1.05,o.z+o.radius*1.05,o)}splash(e,t,n){this.ripples[this.rippleIndex++%8].set(e,t,n,1)}update(e,t){this.frame++,this.rebuild(t.x,t.z),this.syncPonds(t.x,t.z),this.closest=[...this.surfaces].sort((n,i)=>Math.abs(n.userData.level-t.y)*2+Math.hypot(n.userData.midX-t.x,n.userData.midZ-t.z)-(Math.abs(i.userData.level-t.y)*2+Math.hypot(i.userData.midX-t.x,i.userData.midZ-t.z)))[0];for(const n of this.falls){const{f:i,seeds:r}=n,o=n.spray.geometry.attributes.position;for(let c=0;c<r.length;c++){const l=r[c],h=(l.p+e*.63*l.s)%1,u=i.high-ti*h*h,d=Math.sin(c*63)*.25*h;o.setXYZ(c,i.x+l.u+d,u,i.z-.6+h*3.1+Math.sin(c*83)*.5*h)}o.needsUpdate=!0;const a=n.mist.geometry.attributes.position;for(let c=0;c<a.count;c++){const l=(c/a.count+e*.12)%1;a.setXYZ(c,i.x+Math.sin(c*817)*i.width*(.8+l),i.low+.3+l*2.6,i.z+2+l*5+Math.sin(c*35)*1.5)}a.needsUpdate=!0}}}const vt={SUGAR_A:4,SUGAR_B:5,RED_A:6,RED_B:7,BIRCH:8,ASPEN:9,OAK_A:10,OAK_B:11,BEECH:12,SPRUCE:13,PINE:14,LARCH:15,GINKGO:16,JAPANESE:17,SUMAC:18,BARE:22,SUGAR_C:23,OAK_C:24,BLUEBERRY:25},ft={SUGAR:0,RED:1,BIRCH:2,ASPEN:3,OAK:4,BEECH:5,SPRUCE:6,PINE:7,LARCH:8,SNAG:9,GINKGO:10,JAPANESE:11,SUMAC:12,HAZEL:13,BLUEBERRY:14,SAPLING:15},Pn=Math.PI*2,Gt=[];Gt[ft.SUGAR]={name:"sugar maple",kind:"maple",bark:"maple",h:[14,21],base:[.18,.28],width:[.68,.88],shape:"round",points:400,cards:560,card:[1.25,1.65],trunk:.34,up:.1,variants:3,rows:[vt.SUGAR_A,vt.SUGAR_B,vt.SUGAR_C],lumpy:.4};Gt[ft.RED]={name:"red maple",kind:"redmaple",bark:"beech",h:[12,18],base:[.2,.32],width:[.52,.7],shape:"oval",points:340,cards:480,card:[1.15,1.5],trunk:.27,up:.18,variants:3,rows:[vt.RED_A,vt.RED_B,vt.SUGAR_C],lumpy:.42};Gt[ft.BIRCH]={name:"birch",kind:"birch",bark:"birch",h:[12,18],base:[.24,.38],width:[.42,.58],shape:"oval",points:300,cards:430,card:[1.05,1.35],trunk:.17,up:.02,excurrent:.55,variants:3,rows:[vt.BIRCH],lumpy:.36,droop:.35};Gt[ft.ASPEN]={name:"aspen",kind:"aspen",bark:"aspen",h:[13,20],base:[.36,.5],width:[.34,.46],shape:"column",points:270,cards:380,card:[1,1.3],trunk:.19,up:.22,excurrent:.75,variants:3,rows:[vt.ASPEN,vt.BIRCH],lumpy:.34};Gt[ft.OAK]={name:"oak",kind:"oak",bark:"oak",h:[13,19],base:[.18,.26],width:[.85,1.05],shape:"spread",points:420,cards:560,card:[1.3,1.7],trunk:.42,up:-.04,variants:3,rows:[vt.OAK_A,vt.OAK_B,vt.OAK_C],lumpy:.45};Gt[ft.BEECH]={name:"beech",kind:"beech",bark:"beech",h:[14,20],base:[.16,.26],width:[.72,.92],shape:"round",points:400,cards:540,card:[1.2,1.55],trunk:.32,up:.06,variants:2,rows:[vt.BEECH],lumpy:.38};Gt[ft.SPRUCE]={name:"spruce",kind:"spruce",bark:"spruce",conifer:"spruce",h:[16,26],base:[.06,.14],width:[.28,.36],trunk:.3,variants:3,rows:[vt.SPRUCE]};Gt[ft.PINE]={name:"pine",kind:"pine",bark:"pine",conifer:"pine",h:[16,24],base:[.32,.46],width:[.36,.46],trunk:.33,variants:2,rows:[vt.PINE]};Gt[ft.LARCH]={name:"larch",kind:"larch",bark:"spruce",conifer:"larch",h:[15,22],base:[.14,.24],width:[.26,.34],trunk:.26,variants:2,rows:[vt.LARCH]};Gt[ft.SNAG]={name:"dead tree",kind:"maple",bark:"oak",h:[9,16],base:[.36,.5],width:[.4,.6],shape:"oval",points:110,cards:0,card:[1,1],trunk:.28,up:.15,variants:2,rows:[vt.BARE],lumpy:.3,dead:!0};Gt[ft.GINKGO]={name:"ginkgo",kind:"ginkgo",bark:"maple",h:[12,18],base:[.28,.4],width:[.46,.62],shape:"oval",points:300,cards:470,card:[1.1,1.4],trunk:.28,up:.25,excurrent:.4,variants:2,rows:[vt.GINKGO],lumpy:.4};Gt[ft.JAPANESE]={name:"japanese maple",kind:"japanese",bark:"beech",h:[5,8],base:[.14,.24],width:[1,1.3],shape:"dome",points:300,cards:380,card:[.85,1.1],trunk:.13,up:0,variants:2,rows:[vt.JAPANESE],lumpy:.42};Gt[ft.SUMAC]={name:"sumac",kind:"sumac",bark:"beech",h:[2.2,4],base:[.12,.25],width:[.75,1.05],shape:"dome",points:140,cards:120,card:[.62,.85],trunk:.05,up:.3,variants:2,rows:[vt.SUMAC],lumpy:.3,shrub:!0};Gt[ft.HAZEL]={name:"witch hazel",kind:"beech",bark:"beech",h:[2,3.6],base:[.08,.2],width:[.85,1.15],shape:"dome",points:140,cards:120,card:[.6,.85],trunk:.05,up:.2,variants:2,rows:[vt.BIRCH,vt.ASPEN],lumpy:.3,shrub:!0};Gt[ft.BLUEBERRY]={name:"blueberry",kind:"beech",bark:"beech",h:[.8,1.5],base:[.05,.15],width:[1.1,1.5],shape:"dome",points:90,cards:70,card:[.4,.55],trunk:.025,up:.15,variants:2,rows:[vt.BLUEBERRY],lumpy:.25,shrub:!0};Gt[ft.SAPLING]={name:"young maple",kind:"maple",bark:"beech",h:[2.6,4.6],base:[.2,.35],width:[.55,.75],shape:"oval",points:120,cards:100,card:[.6,.8],trunk:.05,up:.25,variants:2,rows:[vt.SUGAR_A,vt.SUGAR_C,vt.RED_A],lumpy:.3,shrub:!0};function zh(s,e){switch(s){case"oval":return Math.pow(Math.sin(Math.PI*Math.min(1,e)),.55);case"column":return(e<.82?1:Math.sqrt(Math.max(0,(1-e)/.18)))*(.65+.35*Math.sin(Math.PI*e));case"spread":return Math.pow(Math.sin(Math.PI*Math.pow(Math.min(1,e),.6)),.45);case"dome":return Math.sqrt(Math.max(0,1-Math.pow(e,1.6)))*(.7+.3*Math.min(1,e*4));default:return Math.pow(Math.sin(Math.PI*Math.pow(Math.min(1,e),.85)),.7)}}class Hu{constructor(){this.x=[],this.y=[],this.z=[],this.parent=[],this.r=[],this.kids=[]}add(e,t,n,i){const r=this.x.length;return this.x.push(e),this.y.push(t),this.z.push(n),this.parent.push(i),this.kids.push([]),i>=0&&this.kids[i].push(r),r}get n(){return this.x.length}}function Cv(s,e){const t=e.range(s.h[0],s.h[1]),n=t*e.range(s.base[0],s.base[1]),i=t*e.range(s.width[0],s.width[1])*.5,r=e.range(-1,1)*t*.04,o=e.range(-1,1)*t*.04,a=e.int(1e4),c=[],l=3+e.int(4);for(let U=0;U<l;U++){const z=e.range(.25,.85),O=zh(s.shape,z),G=e.next()*Pn,H=i*O*e.range(.25,.8);c.push([Math.cos(G)*H+r*z,n+z*(t-n),Math.sin(G)*H+o*z,i*e.range(.42,.7)*(.6+.4*O)])}const h=[];let u=0;for(;h.length<s.points*3&&u++<6e4;){const U=e.next(),z=n+U*(t-n),O=zh(s.shape,U),G=e.next()*Pn,H=Math.sqrt(e.next())*i*O*1.12,J=Math.cos(G)*H+r*U,te=Math.sin(G)*H+o*U;let le=!1;for(const[ze,ot,tt,j]of c){const Q=J-ze,pe=(z-ot)*1.25,Ie=te-tt;if(Q*Q+pe*pe+Ie*Ie<j*j){le=!0;break}}!le&&e.next()>.18||.5+.5*cv(J*.32+a,te*.32+z*.27-a)<s.lumpy*e.next()*1.6||h.push(J,z,te)}const d=h.length/3,m=new Hu,_=Math.max(.36,t/42),p=n+(t-n)*(s.excurrent?s.excurrent:.12);let g=m.add(0,0,0,-1);const f=Math.max(3,Math.round(p/_));for(let U=1;U<=f;U++){const z=U/f;g=m.add(r*z*.6+e.range(-.04,.04),p*z,o*z*.6+e.range(-.04,.04),g)}const x=i*1.05+2.2,v=_*2.3,y=x*x,b=v*v,w=new Int32Array(d).fill(-1),R=new Float32Array(d).fill(1e9),A=new Uint8Array(d).fill(1),M=U=>{for(let z=0;z<d;z++){if(!A[z])continue;const O=h[z*3],G=h[z*3+1],H=h[z*3+2];for(let J=U;J<m.n;J++){const te=O-m.x[J],le=G-m.y[J],ge=H-m.z[J],ze=te*te+le*le+ge*ge;ze<R[z]&&(R[z]=ze,w[z]=J)}R[z]<b&&(A[z]=0)}};M(0);const S=new Float32Array(4096),L=new Float32Array(4096),I=new Float32Array(4096),N=new Uint16Array(4096);for(let U=0;U<90;U++){const z=m.n;if(z>4e3)break;S.fill(0,0,z),L.fill(0,0,z),I.fill(0,0,z),N.fill(0,0,z);let O=!1;for(let G=0;G<d;G++){if(!A[G]||R[G]>y)continue;const H=w[G],J=h[G*3]-m.x[H],te=h[G*3+1]-m.y[H],le=h[G*3+2]-m.z[H],ge=Math.sqrt(J*J+te*te+le*le)||1;S[H]+=J/ge,L[H]+=te/ge,I[H]+=le/ge,N[H]++,O=!0}if(!O)break;for(let G=0;G<z;G++){if(!N[G])continue;let H=S[G]/N[G],J=L[G]/N[G]+s.up,te=I[G]/N[G];s.droop&&m.y[G]>n&&(J-=s.droop*Math.min(1,Math.hypot(m.x[G],m.z[G])/i)*.5),H+=e.range(-.12,.12),te+=e.range(-.12,.12),J+=e.range(-.08,.08);const le=Math.sqrt(H*H+J*J+te*te);le<.05||m.add(m.x[G]+H/le*_,m.y[G]+J/le*_,m.z[G]+te/le*_,G)}if(m.n===z)break;M(z)}return{S:m,H:t,cb:n,cr:i,cx:r*.5,cz:o*.5,D:_}}function Pv(s,e,t,n){for(let l=0;l<4;l++)for(let h=1;h<s.n;h++){const u=s.kids[h];if(!u.length)continue;const d=s.parent[h];let m=0,_=0,p=0;for(const g of u)m+=s.x[g],_+=s.y[g],p+=s.z[g];m/=u.length,_/=u.length,p/=u.length,s.x[h]=.5*s.x[h]+.25*(s.x[d]+m),s.y[h]=.5*s.y[h]+.25*(s.y[d]+_),s.z[h]=.5*s.z[h]+.25*(s.z[d]+p)}const i=new Float32Array(s.n),r=.011*(t/18);for(let l=s.n-1;l>=0;l--){const h=s.kids[l];if(!h.length){i[l]=r;continue}let u=0;for(const d of h)u+=Math.pow(i[d],2.35);i[l]=Math.pow(u,1/2.35)}const a=e.trunk*(t/18)/i[0],c=i[0];for(let l=0;l<s.n;l++){const h=.5+.5*Math.sqrt(i[l]/c);i[l]=Math.max(.006,i[l]*Math.pow(a,h))}s.r=i}function Lv(s,e){const t=e.range(s.h[0],s.h[1]),n=t*e.range(s.base[0],s.base[1]),i=t*e.range(s.width[0],s.width[1])*.5,r=new Hu,o=e.range(-1,1)*.3,a=e.range(-1,1)*.3,c=[],l=Math.round(t/.8);let h=r.add(0,0,0,-1);c.push(h);for(let f=1;f<=l;f++){const x=f/l;h=r.add(o*x*x,t*x,a*x*x,h),c.push(h)}const u=s.conifer,d=u==="pine"?1.1:u==="larch"?.72:.62,m=[];let _=e.next()*Pn;for(let f=n;f<t-.6;f+=d*e.range(.8,1.2)){const x=(f-n)/(t-n),v=c[Math.min(c.length-1,Math.round(f/t*l))],y=u==="pine"?4+e.int(2):5+e.int(2);_+=.7+e.next();for(let b=0;b<y;b++){if(u==="pine"&&e.chance(.25))continue;const w=_+b/y*Pn+e.range(-.3,.3);let R=i*(u==="pine"?(.55+.45*(1-x))*e.range(.7,1.15):Math.pow(1-x,.95)*e.range(.85,1.15))+.25;const A=u==="pine"?.18:u==="larch"?-.05:-.3,M=u==="spruce"?.25:.1,S=5;let L=v,I=r.x[v],N=f,U=r.z[v];const z=[];for(let O=1;O<=S;O++){const G=O/S,H=A+(M-A)*G*G;I+=Math.cos(w)*Math.cos(H)*(R/S),U+=Math.sin(w)*Math.cos(H)*(R/S),N+=Math.sin(H)*(R/S),L=r.add(I,N,U,L),z.push(L)}m.push({pts:z,a:w,L:R,t:x})}}const p=new Float32Array(r.n),g=s.trunk*(t/20);for(let f=0;f<c.length;f++)p[c[f]]=Math.max(.03,g*Math.pow(1-f/c.length,.9));for(const f of m)f.pts.forEach((x,v)=>{p[x]=Math.max(.008,.06*Math.min(1,f.L/4)*(1-v/f.pts.length))});return r.r=p,{S:r,H:t,cb:n,cr:i,cx:o*.5,cz:a*.5,branches:m,trunkIdx:c}}class $c{constructor(){this.p=[],this.n=[],this.uv=[],this.w=[],this.l=[],this.idx=[],this.v=0}vert(e,t,n,i,r,o,a,c,l,h,u,d=0,m=0,_=0){return this.p.push(e,t,n),this.n.push(i,r,o),this.uv.push(a,c),this.w.push(l,h,u),this.l.push(d,m,_),this.v++}geometry(e){const t=new At;return t.setAttribute("position",new Ve(this.p,3)),t.setAttribute("normal",new Ve(this.n,3)),t.setAttribute("uv",new Ve(this.uv,2)),t.setAttribute("aWind",new Ve(this.w,3)),e&&t.setAttribute("aLeaf",new Ve(this.l,3)),t.setIndex(this.v>65535?new Ac(this.idx,1):new Tc(this.idx,1)),t.computeBoundingSphere(),t}}const Iv=.9,Dv=1.8;function Oh(s,e,t,n,i){const r=new $c,o=[[0,-1]],a=new C,c=new C,l=new C,h=new C;for(;o.length;){const[u,d]=o.pop();if(s.r[u]<t)continue;const m=[];d>=0&&m.push(d);let _=u;for(;;){m.push(_);const b=s.kids[_];if(!b.length)break;let w=b[0];for(const R of b)s.r[R]>s.r[w]&&(w=R);for(const R of b)R!==w&&o.push([R,_]);if(s.r[w]<t)break;_=w}if(m.length<2)continue;const p=s.r[m[d>=0?1:0]],g=Math.max(3,Math.min(12,Math.round((p>.2?11:p>.08?8:p>.03?6:4)*n))),f=Math.max(1,Math.round(Pn*p/Iv)),x=i.next()*Pn;let v=i.next()*3;c.set(0,0,0);let y=r.v;for(let b=0;b<m.length;b++){const w=m[b],R=m[Math.max(0,b-1)],A=m[Math.min(m.length-1,b+1)];a.set(s.x[A]-s.x[R],s.y[A]-s.y[R],s.z[A]-s.z[R]).normalize(),b===0?(h.set(Math.abs(a.y)<.9?0:1,Math.abs(a.y)<.9?1:0,0),c.crossVectors(a,h).normalize()):c.addScaledVector(a,-c.dot(a)).normalize(),l.crossVectors(a,c);let M=d>=0&&b===0?Math.min(s.r[w]*.85,s.r[m[1]]*1.15):s.r[w];if((w===0||d<0&&b<3)&&(M*=1+.28*Math.exp(-Math.max(0,s.y[w])/.7)),b===m.length-1&&!s.kids[w].length&&(M*=.3),b>0){const I=m[b-1];v+=Math.hypot(s.x[w]-s.x[I],s.y[w]-s.y[I],s.z[w]-s.z[I])/Dv}const S=Math.max(0,s.y[w]/e),L=1-Math.min(1,s.r[w]/.12);for(let I=0;I<=g;I++){const N=I/g*Pn,U=Math.cos(N),z=Math.sin(N),O=c.x*U+l.x*z,G=c.y*U+l.y*z,H=c.z*U+l.z*z;r.vert(s.x[w]+O*M,s.y[w]+G*M,s.z[w]+H*M,O,G,H,I/g*f,v,S,L,x)}if(b>0){const I=y+(b-1)*(g+1),N=y+b*(g+1);for(let U=0;U<g;U++)r.idx.push(I+U,N+U,I+U+1,I+U+1,N+U,N+U+1)}}}return r.geometry(!1)}function Vu(s){const e=hv(s),t=e%Oi,n=Math.floor(e/Oi),i=.004;return[t/Oi+i,n/fc+i,(t+1)/Oi-i,(n+1)/fc-i]}function Jr(s,e,t,n,i,r,o,a,c,l,h,u,d,m,_,p=1){const g=new C().crossVectors(r,i).normalize(),f=new C().crossVectors(g,r).normalize(),x=o*.5*p,v=o*.08,y=o*.92,[b,w,R,A]=a,M=c?R:b,S=c?b:R,L=[[-x,-v,M,A],[x,-v,S,A],[x,y,S,w],[-x,y,M,w]],I=s.v;for(const[N,U,z,O]of L){const G=e+g.x*N+f.x*U,H=t+g.y*N+f.y*U,J=n+g.z*N+f.z*U;s.vert(G,H,J,l.x,l.y,l.z,z,O,Math.max(0,H/m),1,_,h,u,d)}s.idx.push(I,I+1,I+2,I,I+2,I+3)}function kh(s,e,t,n,i,r){const o=new $c;if(!i)return o.geometry(!0);const{H:a,cb:c,cr:l}=t,h=t.cx,u=c+(a-c)*.5,d=t.cz,m=(a-c)*.5,_=[];for(let y=1;y<s.n;y++)s.r[y]<.045&&s.y[y]>c*.85&&_.push(y);if(!_.length)return o.geometry(!0);const p=Vu(e.kind),g=new C,f=new C,x=new C,v=new C;for(let y=0;y<i;y++){const b=_[n.int(_.length)],w=s.parent[b],R=s.kids[b].length===0,A=.28,M=s.x[b]+n.range(-A,A),S=s.y[b]+n.range(-A,A),L=s.z[b]+n.range(-A,A);x.set((M-h)/l,(S-u)/m,(L-d)/l);const I=Math.min(1.2,x.length());x.normalize(),g.set(s.x[b]-s.x[w],s.y[b]-s.y[w],s.z[b]-s.z[w]).normalize(),g.lerp(x,.35).normalize(),f.set(x.x+n.range(-.9,.9),x.y+n.range(-.7,.9),x.z+n.range(-.9,.9)).normalize(),Math.abs(f.dot(g))>.92&&f.set(-g.z,g.x,g.y).normalize(),v.copy(x).lerp(f,.3).normalize();const N=Math.min(1,.35+.65*Math.pow(Math.min(1,I),1.4))*(.82+.18*Math.min(1,(S-c)/(a-c)+.3)),U=n.range(e.card[0],e.card[1])*r*(R?1:.88);Jr(o,M,S,L,g,f,U,p,n.chance(.5),v,N,n.next(),Math.min(1,Math.max(0,(S-c)/(a-c)))*.7+.3*Math.min(1,I),a,n.next()*Pn)}return o.geometry(!0)}function Bh(s,e,t,n,i,r){const o=new $c,{H:a,cb:c,cr:l,branches:h}=t,u=Vu(e.kind),d=new C,m=new C,_=new C,p=new C,g=e.conifer==="pine"?1.3:1.05;let f=0;for(const v of h){const y=v.pts;for(let b=1;b<y.length;b++){if(f++%i)continue;const w=y[b],R=y[b-1];if(e.conifer==="pine"&&b<y.length-2)continue;d.set(s.x[w]-s.x[R],s.y[w]-s.y[R],s.z[w]-s.z[R]).normalize(),p.set(-d.z,0,d.x).normalize(),m.crossVectors(d,p).normalize(),m.y<0&&m.negate(),m.x+=n.range(-.25,.25),m.z+=n.range(-.25,.25),m.normalize();const A=s.x[w]-t.cx,M=s.z[w]-t.cz,S=Math.hypot(A,M)||1;_.set(A/S,.75,M/S).normalize();const I=.4+.6*Math.min(1,S/Math.max(.5,l*(1-(s.y[w]-c)/(a-c))+.3)),N=(s.y[w]-c)/(a-c),U=g*n.range(.85,1.15)*r,z=s.x[R],O=s.y[R],G=s.z[R];Jr(o,z,O,G,d,m,U,u,n.chance(.5),_,I,n.next(),N,a,n.next()*Pn,.75),e.conifer!=="pine"&&n.chance(.45)&&Jr(o,z,O,G,d,p,U*.9,u,n.chance(.5),_,I*.9,n.next(),N,a,n.next()*Pn,.75)}}const x=t.trunkIdx[t.trunkIdx.length-1];for(let v=0;v<3;v++){const y=v/3*Math.PI;m.set(Math.cos(y),0,Math.sin(y)),d.set(0,1,0),Jr(o,s.x[x],s.y[x]-1.4,s.z[x],d,m,1.6*r,u,v%2===0,_.set(0,1,0),1,n.next(),1,a,n.next()*Pn,.6)}return o.geometry(!0)}function Uv(s,e,t=!1){const n=Gt[s],i=t?{...n,points:Math.round(n.points*1.5),cards:Math.round(n.cards*1.7),width:[n.width[0]*1.12,n.width[1]*1.12],base:[n.base[0]*.8,n.base[1]*.8],lumpy:n.lumpy*.8}:n,r=new ov(1e3+s*97+e*13);let o;i.conifer?o=Lv(i,r):(o=Cv(i,r),Pv(o.S,i,o.H));const a=o.S,c=Oh(a,o.H,.019,.85,r),l=Oh(a,o.H,.075,.5,r);let h,u;return i.conifer?(h=Bh(a,i,o,r,1,1.27),u=Bh(a,i,o,r,2,1.62)):(h=kh(a,i,o,r,i.cards,1),u=kh(a,i,o,r,Math.round(i.cards*.3),1.65)),{skeleton:a,spId:s,variant:e,sp:i,H:o.H,crownBase:o.cb,crownR:o.cr,trunkR:a.r[0]*1.15,bark0:c,bark1:l,leaves0:h,leaves1:u}}const Gu=[ft.SUGAR,ft.BIRCH,ft.OAK,ft.BEECH,ft.SPRUCE,ft.ASPEN,ft.LARCH,ft.GINKGO,ft.JAPANESE,ft.PINE,ft.SNAG,ft.HAZEL],Nv=Gu.length;function Fv(s,e){const t=Uv(Gu[s],e),n=t.skeleton,i=[0,2,1,4,-1,5,-1,-1,6,-1,-1,7][s];if(i>=0)for(const l of[t.leaves0,t.leaves1]){const h=l.attributes.uv;for(let u=0;u<h.count;u++){const d=h.getX(u)*4%1,m=h.getY(u)*3%1;h.setXY(u,(i%4+d)/4,(2-Math.floor(i/4)-m)/2)}}const r=[];for(let l=1;l<n.n;l++){const h=n.parent[l],u=n.x[l]-n.x[h],d=n.y[l]-n.y[h],m=n.z[l]-n.z[h];n.y[l]>1.3&&n.y[l]<6.5&&n.r[l]>.025&&n.r[l]<.12&&Math.abs(d)<Math.hypot(u,m)*.7&&r.push({x:n.x[l],y:n.y[l]+n.r[l]*.8,z:n.z[l]})}const o=[];let a=0;for(;a!==void 0;)o.push({x:n.x[a],y:n.y[a],z:n.z[a],r:n.r[a]}),a=n.kids[a].reduce((l,h)=>l===void 0||n.r[h]>n.r[l]?h:l,void 0);const c=(l,h)=>{const u=l.attributes.position.count,d=new Float32Array(u*3);for(let m=0;m<u;m++){const _=h?.35+.65*l.attributes.aLeaf.getX(m):1;d[m*3]=d[m*3+1]=d[m*3+2]=_}return l.setAttribute("color",new wt(d,3)),l};return{species:s,perches:r,near:{wood:c(t.bark0,!1),leaf:c(t.leaves0,!0),radius:t.trunkR,height:t.H,trunk:o},far:{wood:c(t.bark1,!1),leaf:c(t.leaves1,!0),radius:t.trunkR,height:t.H,trunk:o}}}const as=new Map;function zv(s){if(as.has(s.id))return as.get(s.id);const e=In(s.seed),t={trees:[],stones:[],logs:[],blocks:[],beams:[],plants:[],fungi:[]},n=(p,g)=>({x:s.x+p*s.ca-g*s.sa,z:s.z+p*s.sa+g*s.ca}),i=(p,g,f,x=1)=>{const v=n(p,g),y=Ce(v.x,v.z);y<kt(v.x,v.z)+.12||ki(v.x,v.z).y<.72||Bu(v.x,v.z)<3.5||t.trees.push({...v,y:y-.05,species:f,scale:x,rot:e()*et,variant:Math.floor(e()*3),color:e(),id:s.id+":authored:"+t.trees.length})},r=(p,g,f=2,x=f*.7,v=f,y="scan")=>{const b=n(p,g),w=Math.min(...[[0,0],[-f*.38,-v*.38],[f*.38,-v*.38],[-f*.38,v*.38],[f*.38,v*.38]].map(([R,A])=>Ce(b.x+R,b.z+A)));t.stones.push({...b,y:w-.1,sx:f,sy:x,sz:v,rot:e()*et,variant:Math.floor(e()*4),style:y})},o=(p,g,f="fern",x=1)=>{const v=n(p,g),y=Ce(v.x,v.z);y<kt(v.x,v.z)-.25&&f!=="reed"||t.plants.push({...v,y,kind:f,scale:x,rot:e()*et})},a=(p,g,f,x=0,v=0)=>{for(let y=0;y<g;y++){const b=e()*et,w=Math.sqrt(e())*f;o(x+Math.cos(b)*w,v+Math.sin(b)*w,p,.55+e()*.9)}},c=(p,g,f,x=1)=>{for(let v=0;v<g;v++){const y=v/g*et+(e()-.5)*.17,b=f*(.9+e()*.18);i(Math.cos(y)*b,Math.sin(y)*b,p,x*(.85+e()*.3))}},l=(p,g,f,x,v,y=0,b=0)=>{const w=n(p,g),R=Ce(w.x,w.z);t.blocks.push({...w,y:R+y+x*.5-.06,w:f,h:x,d:v,rot:-s.angle+b})},h=(p,g,f,x,v=.5,y=v,b=.12)=>{const w=n(p,g),R=n(f,x);t.beams.push({a:[w.x,Ce(w.x,w.z)+v,w.z],b:[R.x,Ce(R.x,R.z)+y,R.z],r:b})},u=(p,g,f,x,v=.6,y=!1)=>{const b=n(p,g),w=n(f,x);t.logs.push({x:b.x,z:b.z,ex:w.x,ez:w.z,r:v,hollow:y})},d=(p,g,f=12,x=3)=>{for(let v=0;v<f;v++){const y=e()*et,b=Math.sqrt(e())*x,w=n(p+Math.cos(y)*b,g+Math.sin(y)*b);t.fungi.push({...w,y:Ce(w.x,w.z),scale:.16+e()*.25,color:e()})}},m=(p,g,f,x,v=2)=>{const y=Math.ceil(Math.hypot(f-p,x-g)/1.05),b=-Math.atan2(x-g,f-p);for(let w=0;w<v;w++)for(let R=0;R<y;R++){const A=(R+.5+w%2*.3)/y;A>1||e()<w*.14||l(p+(f-p)*A,g+(x-g)*A,1.08,.48,.62,w*.46,b+(e()-.5)*.05)}},_=(p,g)=>{for(let f=0;f<4;f++)h(p-1.4,g+f*.12,p+1.4,g+f*.12,.52,.52,.085);for(const f of[-1,1])h(p+f,g,p+f,g,.02,.48,.12),h(p+f,g+.42,p+f,g+.42,.02,1,.07);h(p-1.4,g+.45,p+1.4,g+.45,.88,.88,.1)};switch(s.kind){case"mirrorpond":case"island":case"cedarpond":case"spring":case"reedmarsh":{const p=s.kind==="cedarpond"?4:s.kind==="spring"?1:0,g=s.kind==="spring"?9:15;for(let f=0;f<g;f++){const x=f/g*et,v=1.42+e()*.25;i(Math.cos(x)*s.pondRX*v,Math.sin(x)*s.pondRZ*v,f%4===0?1:p,.82+e()*.38)}s.kind==="island"&&(i(0,0,8,1.4),i(2,-1,1,.7),r(0,1,2.2,1.2,2));for(let f=0;f<14;f++){const x=e()*et;r(Math.cos(x)*s.pondRX*1.15,Math.sin(x)*s.pondRZ*1.15,.6+e()*1.7,.45+e()*.9,1+e())}for(let f=0;f<(s.kind==="reedmarsh"?150:55);f++){const x=e()*et,v=.96+e()*.15;o(Math.cos(x)*s.pondRX*v,Math.sin(x)*s.pondRZ*v,"reed",.65+e()*.8)}u(-s.pondRX*.8,s.pondRZ*.85,-s.pondRX*.28,s.pondRZ*1.2,.32),a("fern",35,7,-s.pondRX*1.4,0),s.kind==="mirrorpond"&&_(s.pondRX*1.3,4);break}case"birchhall":case"aspenwheel":{const p=s.kind==="birchhall"?1:5;for(let g=0;g<34;g++){const f=g*2.399,x=5+Math.sqrt(e())*20;i(Math.cos(f)*x,Math.sin(f)*x,p,.85+e()*.42)}a("fern",70,23),u(-12,10,-4,14,.36),d(-6,13);break}case"scarletaisle":for(let p=0;p<9;p++)for(const g of[-1,1])i(g*(5+Math.sin(p*.8)*1.4),-23+p*5,8,1.25+e()*.55);a("berry",45,23);break;case"beechcathedral":c(3,7,15,1.55),i(-3,-6,3,1.65),a("fern",75,23),d(7,8,25,5);break;case"ginkgo":c(7,9,13,1.15),i(-4,1,7,1.3),a("gold",55,22),d(3,-9);break;case"orchard":for(let p=-2;p<=2;p++)for(let g=-2;g<=2;g++)e()>.18&&i(p*8+(e()-.5)*2,g*8+(e()-.5)*2,8,.7+e()*.35);m(-21,-18,-21,18,1),a("flower",90,24),_(6,0);break;case"ferngully":for(let p=0;p<8;p++)for(const g of[-1,1])r(g*(6+e()*2),-19+p*5,3+e()*2,1.3+e()*2,2.8),i(g*12,-20+p*6,p%3===0?4:3,.7+e()*.5);a("fern",180,24),u(-8,-5,8,1,.7),d(-7,-4,20,3);break;case"mossgrotto":{for(const f of[-1,1])r(f*5,1,6,6,8),r(f*7,7,7,4,6),i(f*11,-3,3,1.3);const p=n(0,4),g=Ce(p.x,p.z);t.stones.push({...p,y:g+4.5,sx:13,sy:2.2,sz:6,rot:-s.angle,variant:1,style:"lintel"}),r(0,10,10,7,5),a("fern",120,15,0,-1),d(4,5,30,4);break}case"splitrock":r(-3.6,0,6.3,7.7,9),r(3.8,1,6.6,8.8,9),r(-5,7,3.4,2.2,4),a("fern",50,12),c(4,8,22,.9);break;case"bouldergarden":for(let p=0;p<18;p++){const g=p*2.399,f=5+e()*18;r(Math.cos(g)*f,Math.sin(g)*f,2+e()*7,1.4+e()*5,2+e()*4)}a("heather",110,26),c(6,12,25,1);break;case"basalt":for(let p=0;p<26;p++){const g=-18+p*1.4,f=5+Math.sin(p*.42)*4;r(g,f,1.4,2+e()*7,1.5,"column")}a("heather",100,22),c(6,9,26,1);break;case"overlook":case"heather":case"larchridge":case"cairntrail":{const p=s.kind==="larchridge"?6:9;for(let g=0;g<12;g++){const f=1.2+g*.3;i(Math.cos(f)*26,Math.sin(f)*23,p,.7+e()*.6)}a("heather",170,27);for(let g=0;g<7;g++)r(-13+g*4,9+Math.sin(g)*4,2+e()*2,.7+e()*1.8,2.1);if(s.kind==="overlook"&&_(-4,-7),s.kind==="cairntrail")for(let g=0;g<5;g++)for(let f=0;f<4;f++){const x=n((g%2?1:-1)*5,-16+g*8),v=Ce(x.x,x.z);t.stones.push({...x,y:v+f*.24,sx:1-f*.18,sy:.45,sz:1-f*.18,variant:f%4,rot:e()*et,style:"stack"})}break}case"standingstones":for(let p=0;p<10;p++){const g=p/10*et;r(Math.cos(g)*11,Math.sin(g)*11,1.4,3+e()*2,1.2)}c(0,11,26,1.1),d(0,0,35,5);break;case"stonearch":{const p=n(0,0),g=Ce(p.x,p.z),f=3.1;for(const x of[-1,1])for(let v=0;v<5;v++){const y=n(x*f,0);t.blocks.push({...y,y:g+v*.61+.3,w:.85,h:.65,d:1.35,rot:-s.angle})}for(let x=0;x<13;x++){const v=x/12*Math.PI,y=n(Math.cos(v)*f,0);t.blocks.push({...y,y:g+2.75+Math.sin(v)*f,w:.82,h:.8,d:1.3,rot:-s.angle,roll:v-Math.PI/2})}m(-3,-.3,-15,-.3,3),m(3,0,13,0,2),a("fern",70,20),i(-12,7,8,1.6),c(0,10,25,1.1);break}case"ruinedgarden":m(-12,-13,-12,13,3),m(12,-13,12,13,2),m(-12,-13,12,-13,4),m(-12,13,-4,13,2),m(4,13,12,13,2);for(const p of[-1,1])for(let g=0;g<3;g++)i(p*7,-7+g*7,8,.8),a("flower",28,3,p*7,-7+g*7);a("fern",70,23),_(0,-8);break;case"hearthruin":m(-6,-5,-6,6,3),m(6,-5,6,6,2),m(-6,-5,6,-5,3);for(let p=0;p<6;p++)l(-1,-5,2.8,.56,1.5,p*.54);a("fern",80,18),d(4,-4,15),i(10,6,3,1.4);break;case"oldsteps":for(let p=0;p<14;p++)l(0,-10+p*1.45,4.4,.22,1.45,.06),r(-3.4,-10+p*1.45,1.2,.7,1.5);a("fern",100,22),i(0,16,3,1.4);break;case"hollowgiant":u(-12,-2,11,4,1.5,!0),i(-17,-3,3,1.7),a("fern",110,22),d(7,5,38,4);break;case"windfall":for(let p=0;p<6;p++)u(-17+p*5,-7+e()*7,-12+p*5,4+e()*9,.4+e()*.5);c(3,10,28,1.2),a("flower",110,27),d(-6,4,24,5);break;case"leafbowl":c(0,15,23,1.2),c(8,7,14,.9),u(8,-4,13,5,.45),d(-8,8,20,3);break;case"mushroomring":c(3,8,21,1.15);for(let p=0;p<45;p++){const g=p/45*et,f=n(Math.cos(g)*6.5,Math.sin(g)*6.5);t.fungi.push({...f,y:Ce(f.x,f.z),scale:.19+e()*.24,color:e()})}a("fern",90,24),u(-15,-5,-9,4,.6);break;case"berrycopse":c(0,11,25,.85),a("berry",130,24),i(0,0,11,2.2),d(9,5);break;case"meadowoak":case"silvermeadow":i(-6,-4,s.kind==="meadowoak"?2:5,1.65),c(5,15,34,1),a("flower",150,31);for(let p=0;p<6;p++)r(-15+e()*30,-20+e()*40,1+e(),.6,1.4);break;case"rootgate":i(-2,0,3,2.1),i(4,2,3,1.7),u(-7,5,9,7,.7),a("fern",150,26),d(0,4,40,8);break;case"amphitheatre":for(let p=0;p<3;p++)for(let g=0;g<13;g++){const f=.2+g/12*Math.PI*1.6,x=10+p*4;r(Math.cos(f)*x,Math.sin(f)*x,2.6,1+p*.3,2)}c(8,14,29,1.25),a("flower",100,25);break;case"maplegarden":c(8,12,16,1.15),i(0,-3,8,1.5);for(let p=0;p<8;p++)r(-14+p*4,9+Math.sin(p)*3,1.8,.9,1.4);a("fern",95,23),_(0,10);break;case"pineglade":c(9,12,23,1.15),i(-3,-2,9,1.5),a("gold",75,22),u(-8,5,4,9,.55),d(-4,5,30,5);break}return a(s.type===5?"heather":s.type===0?"flower":"fern",24,s.radius*1.1),as.set(s.id,t),as.size>180&&as.delete(as.keys().next().value),t}function Ov(s,e){const t=e*gn+45+Ke(s,e,732)*32,n=or(t,s),i=yn(n,t),r=i.width+7;return{id:s+":"+e,x:n,z:t,half:r,left:Ce(n-r,t)+.05,right:Ce(n+r,t)+.05,level:i.level}}function ga(s,e){const t=Math.max(0,Math.min(1,(e-s.x+s.half)/(2*s.half)));return s.left+(s.right-s.left)*t+Math.sin(t*Math.PI)*.75}const Bs=new C;function pn(s,e,t,n,i,r){const o=2*Math.PI*i/4,a=Math.max(r-2*i,0),c=Math.PI/4;Bs.copy(e),Bs[n]=0,Bs.normalize();const l=.5*o/(o+a),h=1-Bs.angleTo(s)/c;return Math.sign(Bs[t])===1?h*l:a/(o+a)+l+l*(1-h)}class Zc extends ws{constructor(e=1,t=1,n=1,i=2,r=.1){const o=i*2+1;if(r=Math.min(e/2,t/2,n/2,r),super(1,1,1,o,o,o),this.type="RoundedBoxGeometry",this.parameters={width:e,height:t,depth:n,segments:i,radius:r},o===1)return;const a=this.toNonIndexed();this.index=null,this.attributes.position=a.attributes.position,this.attributes.normal=a.attributes.normal,this.attributes.uv=a.attributes.uv;const c=new C,l=new C,h=new C(e,t,n).divideScalar(2).subScalar(r),u=this.attributes.position.array,d=this.attributes.normal.array,m=this.attributes.uv.array,_=u.length/6,p=new C,g=.5/o;for(let f=0,x=0;f<u.length;f+=3,x+=2)switch(c.fromArray(u,f),l.copy(c),l.x-=Math.sign(l.x)*g,l.y-=Math.sign(l.y)*g,l.z-=Math.sign(l.z)*g,l.normalize(),u[f+0]=h.x*Math.sign(c.x)+l.x*r,u[f+1]=h.y*Math.sign(c.y)+l.y*r,u[f+2]=h.z*Math.sign(c.z)+l.z*r,d[f+0]=l.x,d[f+1]=l.y,d[f+2]=l.z,Math.floor(f/_)){case 0:p.set(1,0,0),m[x+0]=pn(p,l,"z","y",r,n),m[x+1]=1-pn(p,l,"y","z",r,t);break;case 1:p.set(-1,0,0),m[x+0]=1-pn(p,l,"z","y",r,n),m[x+1]=1-pn(p,l,"y","z",r,t);break;case 2:p.set(0,1,0),m[x+0]=1-pn(p,l,"x","z",r,e),m[x+1]=pn(p,l,"z","x",r,n);break;case 3:p.set(0,-1,0),m[x+0]=1-pn(p,l,"x","z",r,e),m[x+1]=1-pn(p,l,"z","x",r,n);break;case 4:p.set(0,0,1),m[x+0]=1-pn(p,l,"x","y",r,e),m[x+1]=1-pn(p,l,"y","x",r,t);break;case 5:p.set(0,0,-1),m[x+0]=pn(p,l,"x","y",r,e),m[x+1]=1-pn(p,l,"y","x",r,t);break}}static fromJSON(e){return new Zc(e.width,e.height,e.depth,e.segments,e.radius)}}function ls(s,e){const t=new xe(e),n=new Float32Array(s.attributes.position.count*3);for(let i=0;i<n.length;i+=3)n[i]=t.r,n[i+1]=t.g,n[i+2]=t.b;return s.setAttribute("color",new wt(n,3)),s}function kv(s){const e=s.map(n=>n.index?n.toNonIndexed():n),t=Lu(e);return new Set([...s,...e]).forEach(n=>n.dispose()),t}function Gr(s){const e=new ri,t=In(s==="reed"?712:s==="berry"?241:517),n=[];for(let i=0;i<(s==="reed"?8:s==="berry"?7:12);i++){const r=t()*et,o=t()*.38,a=Math.cos(r)*o,c=Math.sin(r)*o,l=s==="reed"?.65+t()*.7:.19+t()*.43;if(e.tube([a,0,c],[a+Math.sin(r)*.12,l,c+Math.cos(r)*.12],.008,.002,3,[.35,.39,.17]),s==="reed"){for(let h=0;h<4;h++){const u=l*(.1+h*.16),d=r+h*2.4,m=Math.cos(d),_=Math.sin(d),p=.23+t()*.28;for(let g=0;g<5;g++){const f=g/5,x=(g+1)/5,v=(y,b)=>[a+m*y*p-_*b*.017*(1-y),u+Math.sin(y*2)*p*.7,c+_*y*p+m*b*.017*(1-y)];e.quad(v(f,-1),v(f,1),v(x,1),v(x,-1),[-_,.6,m],[0,f,1,x],[.43,.46,.24])}}if(i%3===0){const h=new Nc(.022,.14,3,7);h.translate(a+Math.sin(r)*.12,l-.045,c+Math.cos(r)*.12),n.push(ls(h,6770747))}}else{for(let h=0;h<4;h++){const u=l*(.25+h*.18),d=r+h*2.4,m=Math.sin(d)*.1,_=Math.cos(d)*.1;e.quad([a-.012,u,c],[a+.012,u,c],[a+m+.025,u+.07,c+_],[a+m-.025,u+.07,c+_],[0,.7,1],[0,0,1,1],s==="berry"?[.3,.38,.11]:[.37,.38,.17])}for(let h=0;h<5;h++){const u=new po(s==="berry"?.026:.028,0);u.scale(1,s==="heather"?1.9:1,1),u.translate(a+Math.sin(r)*.12+Math.sin(h*2.4)*.04,l-h*.032,c+Math.cos(r)*.12+Math.cos(h*2.4)*.04),n.push(ls(u,s==="berry"?13847337:s==="heather"?9597842:13617056))}}}return n.push(e.geometry()),kv(n)}class Bv{constructor(e){this.w=e,this.box=new Zc(1,1,1,2,.08),ls(this.box,13748661),this.reed=Gr("reed"),this.heather=Gr("heather"),this.flower=Gr("flower"),this.berry=Gr("berry"),this.plantMaterial=Di(new It({vertexColors:!0,roughness:.96,side:Tt}),.14,!0),this.stemMaterial=new It({color:14075813,roughness:.95}),this.stem=new fs(.09,.12,.8,7),this.stem.translate(0,.4,0),this.cap=new Oc([new he(0,1),new he(.22,.99),new he(.46,.86),new he(.53,.69),new he(.48,.62),new he(.12,.71)],14),ls(this.cap,16777215),this.sphere=new vn(1,12,8),this.loaded=[]}draw(e,t){const n=this.w,i=ku(e,t,175),r=[],o=[],a=[],c=[],l=[],h=[];this.loaded=i.map(p=>({id:p.id,name:p.name,kind:p.kind,x:p.x,z:p.z}));for(const p of i){const g=zv(p);r.push(...g.stones),o.push(...g.blocks),a.push(...g.beams),c.push(...g.logs),l.push(...g.plants.filter(f=>Math.hypot(f.x-e,f.z-t)<75)),h.push(...g.fungi.filter(f=>Math.hypot(f.x-e,f.z-t)<42))}for(let p=0;p<n.m.rockParts.length;p++){const g=n.m.rockParts[p];n.instance(g.geometry,g.material,r.filter(f=>f.variant%n.m.rockParts.length===p&&f.style!=="column"),(f,x)=>{x.position.set(f.x,f.y,f.z),x.rotation.y=f.rot,x.scale.set(f.sx,f.sy/Math.max(.1,g.height),f.sz)},!0)}n.instance(this.box,n.m.stone,r.filter(p=>p.style==="column"),(p,g)=>{g.position.set(p.x,p.y+p.sy*.5-.2,p.z),g.rotation.y=p.rot,g.scale.set(p.sx,p.sy,p.sz)},!0);for(const p of r)p.style!=="lintel"&&n.colliders.push({x:p.x,z:p.z,r:Math.min(p.sx,p.sz)*.46,topY:p.y+p.sy});n.instance(this.box,n.m.stone,o,(p,g)=>{g.position.set(p.x,p.y,p.z),g.rotation.set(0,p.rot,p.roll||0),g.scale.set(p.w,p.h,p.d)},!0);for(const p of o)n.colliders.push({x:p.x,z:p.z,r:Math.min(p.w,p.d)*.47,topY:p.y+p.h*.5,bottomY:p.y-p.h*.5});const u=new ri;for(const p of a){u.tube(p.a,p.b,p.r,p.r*.93,7,[.7,.65,.5]);const g=Math.hypot(p.b[0]-p.a[0],p.b[2]-p.a[2]),f=Math.max(1,Math.ceil(g/.5));for(let x=0;x<=f;x++){const v=x/f,y=je(p.a[0],p.b[0],v),b=je(p.a[2],p.b[2],v);n.colliders.push({x:y,z:b,r:p.r+.17,topY:je(p.a[1],p.b[1],v)+p.r,bottomY:je(p.a[1],p.b[1],v)-p.r})}}for(const p of c){const g=Ce(p.x,p.z)+p.r*.72,f=Ce(p.ex,p.ez)+p.r*.72;if(Uu(n.logEnds,[p.x,g,p.z],[p.ex,f,p.ez],p.r,p.r*.88,p.hollow),p.hollow){const x=new C(p.ex-p.x,f-g,p.ez-p.z),v=x.length(),y=new xn().setFromUnitVectors(new C(0,1,0),x.normalize()),b=new fs(p.r*.88,p.r,v,18,1,!0),w=b.attributes.uv;for(let N=0;N<w.count;N++)w.setXY(N,w.getX(N)*p.r*5,w.getY(N)*v*.52);ls(b,16777215),b.applyQuaternion(y),b.translate((p.x+p.ex)*.5,(g+f)*.5,(p.z+p.ez)*.5);const R=n.m.trunk.clone();R.side=Tt;const A=new rt(b,R);A.castShadow=A.receiveShadow=!0,A.userData.ownGeometry=!0,A.userData.ownMaterial=!0,n.draw.add(A);const M=new fs(p.r*.88*.76,p.r*.76,v,18,1,!0),S=M.attributes.uv;for(let N=0;N<S.count;N++)S.setXY(N,S.getX(N)*p.r*5,S.getY(N)*v*.52);ls(M,10194549),M.applyQuaternion(y),M.translate((p.x+p.ex)*.5,(g+f)*.5,(p.z+p.ez)*.5);const L=n.m.trunk.clone();L.side=Vt;const I=new rt(M,L);I.receiveShadow=!0,I.userData.ownGeometry=I.userData.ownMaterial=!0,n.draw.add(I);for(let N=0;N<=1;N+=.05)for(const U of[-1,1])n.colliders.push({x:je(p.x,p.ex,N)+x.z*p.r*.85*U,z:je(p.z,p.ez,N)-x.x*p.r*.85*U,r:.26})}else{u.tube([p.x,g,p.z],[p.ex,f,p.ez],p.r,p.r*.83,12,[.65,.69,.52]);for(let x=0;x<=1;x+=.09)n.colliders.push({x:je(p.x,p.ex,x),z:je(p.z,p.ez,x),r:p.r+.2,topY:je(g,f,x)+p.r})}if(!p.hollow)for(let x=0;x<5;x++){const v=.15+x*.14,y=je(p.x,p.ex,v),b=je(p.z,p.ez,v),w=je(g,f,v);u.tube([y,w,b],[y+Math.sin(x*9)*1.4,w+.4,b+Math.cos(x*9)*1.4],p.r*.2,.025,6,[.55,.58,.44])}}n.bridges=[];const d=Math.round(e/xi),m=Math.round((t-60)/gn);for(let p=d-1;p<=d+1;p++)for(let g=m-1;g<=m+1;g++){const f=Ov(p,g);if(Math.hypot(f.x-e,f.z-t)>175)continue;n.bridges.push(f);const x=Math.ceil(f.half*2/.28);for(let v=0;v<=x;v++){const y=f.x-f.half+v/x*f.half*2,b=ga(f,y);for(let w of[-1,1])if(v%9===0&&(u.tube([y,b-.25,f.z+w*1.35],[y,b+1,f.z+w*1.35],.075,.065,7,[.8,.75,.6]),n.colliders.push({x:y,z:f.z+w*1.47,r:.25})),v<x){const R=f.x-f.half+(v+1)/x*f.half*2;u.tube([y,b+.82,f.z+w*1.35],[R,ga(f,R)+.82,f.z+w*1.35],.055,.055,5,[.75,.7,.57])}o.push({x:y,z:f.z,y:b-.05,w:.29,h:.16,d:2.55,rot:0,bridge:!0})}}this.walkable=o.filter(p=>!p.bridge&&p.h<.4),n.instance(this.box,n.m.wood,o.filter(p=>p.bridge),(p,g)=>{g.position.set(p.x,p.y,p.z),g.scale.set(p.w,p.h,p.d)},!0);const _=new rt(u.geometry(),n.m.trunk);_.castShadow=_.receiveShadow=!0,_.userData.ownGeometry=!0,n.draw.add(_);for(const p of["reed","heather","flower","berry"])n.instance(this[p],this.plantMaterial,l.filter(g=>g.kind===p),(g,f)=>{f.position.set(g.x,g.y-.02,g.z),f.rotation.y=g.rot,f.scale.setScalar(g.scale)},!1);n.instance(n.ferns,n.m.fern,l.filter(p=>p.kind==="fern"||p.kind==="gold"),(p,g)=>(g.position.set(p.x,p.y-.03,p.z),g.rotation.y=p.rot,g.scale.setScalar(p.scale*.75),new xe(p.kind==="gold"?13409355:10266218))),n.instance(this.stem,this.stemMaterial,h,(p,g)=>{g.position.set(p.x,p.y,p.z),g.scale.setScalar(p.scale)}),n.instance(this.cap,n.m.mushroomCap,h,(p,g)=>(g.position.set(p.x,p.y,p.z),g.scale.setScalar(p.scale),new xe(p.color>.65?14072209:p.color>.3?11700821:15124632)))}surface(e,t){for(const n of this.w.bridges)if(Math.abs(t-n.z)<1.3&&Math.abs(e-n.x)<=n.half+.18)return"wood";return this.height(e,t)>Ce(e,t)+.12?"stone":null}height(e,t){let n=Ce(e,t);for(const i of this.walkable||[]){const r=e-i.x,o=t-i.z,a=r*Math.cos(i.rot)-o*Math.sin(i.rot),c=r*Math.sin(i.rot)+o*Math.cos(i.rot);Math.abs(a)<i.w*.5&&Math.abs(c)<i.d*.5&&(n=Math.max(n,i.y+i.h*.5+.015))}for(const i of this.w.bridges)Math.abs(t-i.z)<1.3&&Math.abs(e-i.x)<=i.half+.18&&(n=Math.max(n,ga(i,e)+.035));return n}}class Hv{constructor(e,t){this.scene=e,this.m=t,this.jobId=0,this.jobs=new Map,this.worker=new Worker(new URL(""+new URL("generation-worker-DXus6Z3F.js",import.meta.url).href,import.meta.url),{type:"module"}),this.worker.onmessage=({data:n})=>{const i=this.jobs.get(n.id);this.jobs.delete(n.id),n.error?i?.reject(new Error(n.error)):i?.resolve(n.result)},this.worker.onerror=n=>{for(const i of this.jobs.values())i.reject(new Error(n.message));this.jobs.clear()},this.tiles=new Map,this.cx=999,this.cz=999,this.center=new C,this.draw=new qe,e.add(this.draw),this.chunks=new qe,e.add(this.chunks),this.colliders=[],this.bridges=[],this.trees=[],this.perches=[],this.rebuilds=0,this.frame=0,this.prototypes=[];for(let n=0;n<Nv;n++)for(let i=0;i<3;i++)this.prototypes.push(Fv(n,i));this.protoCount=this.prototypes.length,this.scenery=new Bv(this),this.grass=tv(),this.ferns=t.fernGeometry,this.leaf=Nu(),this.rock=iv(),this.rivers=new Rv(e,t),this.createFalling(),this.carpet=new Ni(nv(),t.fallen,650),this.carpet.receiveShadow=!0,this.carpet.count=0,this.carpetCenter=new he(999,999),e.add(this.carpet)}terrainFromData(e,t=!1){const n=new At;for(const[r,o]of Object.entries(e.attributes))n.setAttribute(r,new wt(o.array,o.itemSize));n.setIndex(new wt(e.index,1)),n.computeBoundingSphere();const i=new rt(n,this.m.ground);return i.receiveShadow=!t,i}async makeTile(e,t){const n=await this.generate("tile",{tx:e,tz:t,rockVariants:this.m.rockParts.length});return n.mesh=this.terrainFromData(n.terrain),delete n.terrain,this.chunks.add(n.mesh),n}generate(e,t){const n=++this.jobId;return new Promise((i,r)=>{this.jobs.set(n,{resolve:i,reject:r}),this.worker.postMessage({id:n,kind:e,args:t})})}instance(e,t,n,i,r=!1){if(!n.length)return;const o=new Ni(e,t,n.length),a=new ht;return n.forEach((c,l)=>{a.position.set(0,0,0),a.rotation.set(0,0,0),a.scale.set(1,1,1);const h=i(c,a);a.updateMatrix(),o.setMatrixAt(l,a.matrix),h&&o.setColorAt(l,h)}),o.castShadow=r,o.receiveShadow=!0,o.computeBoundingSphere(),this.draw.add(o),o}rebuildDraw(e,t){for(const _ of[...this.draw.children])this.draw.remove(_),_.isInstancedMesh&&_.dispose(),_.userData.ownGeometry&&_.geometry.dispose(),_.userData.ownMaterial&&_.material.dispose();const n=Array.from({length:this.protoCount*2},()=>[]),i=[],r=[],o=[],a=[],c=[];this.colliders=[],this.trees=[],this.perches=[],this.logEnds=new ri;for(const _ of this.tiles.values()){for(const p of _.trees){const g=Math.hypot(p.x-e,p.z-t);g>235||(this.trees.push(p),n[p.species*3+p.variant+(g>95?this.protoCount:0)].push(p),g<100&&this.colliders.push({x:p.x,z:p.z,r:this.prototypes[p.species*3+p.variant].near.radius*p.scale+.25}))}for(const p of _.rocks)Math.hypot(p.x-e,p.z-t)<120&&i.push(p);for(const p of _.flora)Math.hypot(p.x-e,p.z-t)<64&&r.push(p);for(const p of _.grass)Math.hypot(p.x-e,p.z-t)<69&&o.push(p);for(const p of _.litter)Math.hypot(p.x-e,p.z-t)<38&&a.push(p);for(const p of _.logs)Math.hypot(p.x-e,p.z-t)<115&&c.push(p)}const l=(_,p)=>{p.position.set(_.x,_.y,_.z),p.rotation.y=_.rot,p.scale.set(_.scale*(.85+_.color*.35),_.scale,_.scale*(.85+_.color*.35))};for(let _=0;_<this.protoCount*2;_++){const p=this.prototypes[_%this.protoCount],g=_<this.protoCount?p.near:p.far,f=n[_];this.instance(g.wood,[1,5].includes(p.species)?this.m.birch:this.m.trunk,f,l,_<this.protoCount),this.instance(g.leaf,[4,6,7,9,10].includes(p.species)?this.m.leaf:this.m.leafPhoto,f,(x,v)=>{l(x,v);const y=vi(x.x,x.z),b=x.species===1||x.species===5||x.species===7?[15976766,15848550,15382348]:x.species===4||x.species===9?[5667670,4353879,7505498]:x.species===6?[14397262,14992746,11119964]:x.species===8?[12795947,12074297,14841669]:x.species===3?[13602117,14332524,12089401]:x.species===2?[11635792,12876092,10190670]:y.maple>.4?[15237432,12995367,14457923]:[15316303,13204537,14721879];return new xe(b[Math.floor(x.color*b.length)])},_<this.protoCount)}for(let _=0;_<this.m.rockParts.length;_++){const p=this.m.rockParts[_];this.instance(p.geometry,p.material,i.filter(g=>g.variant===_),(g,f)=>{f.position.set(g.x,g.y,g.z),f.scale.set(g.s,g.s*(.75+Ke(g.x,g.z)*.55),g.s),f.rotation.y=g.rot},!0)}for(const _ of i)_.s>1.5&&this.colliders.push({x:_.x,z:_.z,r:_.s*.52,topY:_.y+_.s*.5}),_.s>1&&_.s<2.8&&this.perches.push({id:"rock:"+_.x.toFixed(2)+","+_.z.toFixed(2),x:_.x,y:_.y+_.s*this.m.rockParts[_.variant].height*.8,z:_.z});this.instance(this.ferns,this.m.fern,r,(_,p)=>{p.position.set(_.x,_.y,_.z),p.scale.setScalar(_.s),p.rotation.y=_.rot});for(let _=0;_<this.m.grassParts.length;_++){const p=this.m.grassParts[_];this.instance(p.geometry,p.material,o.filter((g,f)=>Math.hypot(g.x-e,g.z-t)<13?f%4===_:f%2+2===_),(g,f)=>(f.position.set(g.x,g.y,g.z),f.quaternion.setFromUnitVectors(new C(0,1,0),new C(g.nx,g.ny,g.nz)),f.rotateY(g.rot),f.scale.set(g.s,g.s*(g.meadow?1.35:1),g.s),new xe(g.meadow?14735276:12963737)))}this.instance(this.grass,this.m.grass,o.filter(_=>_.meadow&&Math.hypot(_.x-e,_.z-t)<42),(_,p)=>(p.position.set(_.x,_.y,_.z),p.rotation.y=_.rot,p.scale.set(_.s*.85,_.s*1.05,_.s*.85),new xe().setRGB(.83+_.color*.27,.68+_.color*.22,.35+_.color*.16))),this.instance(this.leaf,this.m.fallen,a,(_,p)=>(p.position.set(_.x,_.y,_.z),p.quaternion.setFromUnitVectors(new C(0,1,0),ki(_.x,_.z)),p.rotateY(_.rot),p.scale.setScalar(_.s),new xe(da[Math.floor(_.c*8)])));const h=new ri;for(const _ of c){const p=Ce(_.x,_.z)+_.r*.65,g=Ce(_.ex,_.ez)+_.r*.65;h.tube([_.x,p,_.z],[_.ex,g,_.ez],_.r,_.r*.8,12,[.7,.74,.66]),Uu(this.logEnds,[_.x,p,_.z],[_.ex,g,_.ez],_.r,_.r*.8);const f=Math.hypot(_.ex-_.x,_.ez-_.z);for(let x=0;x<3;x++){const v=.25+x*.23,y=je(_.x,_.ex,v),b=je(_.z,_.ez,v),w=je(p,g,v);h.tube([y,w,b],[y+.7,w+.28,b-.6],_.r*.2,.025,6,[.7,.7,.6])}for(let x=0;x<Math.ceil(f);x++){const v=x/Math.ceil(f);this.colliders.push({x:je(_.x,_.ex,v),z:je(_.z,_.ez,v),r:_.r+.2,topY:je(p,g,v)+_.r})}this.perches.push({id:"log:"+_.x.toFixed(2),x:je(_.x,_.ex,.25),y:je(p,g,.25)+_.r,z:je(_.z,_.ez,.25)})}const u=new rt(h.geometry(),this.m.trunk);u.receiveShadow=u.castShadow=!0,u.userData.ownGeometry=!0,this.draw.add(u);const d=[];for(const _ of c)for(let p=0;p<6;p++){const g=.15+p*.1;d.push({x:je(_.x,_.ex,g)+_.r*.8,z:je(_.z,_.ez,g),y:je(Ce(_.x,_.z),Ce(_.ex,_.ez),g)+_.r*.8,r:.1+Ke(p,_.x)*.13})}this.instance(this.m.shelfGeometry,this.m.mushroomCap,d,(_,p)=>{p.position.set(_.x,_.y,_.z),p.scale.set(_.r,_.r*.25,_.r*.7)}),this.landmarks(e,t);const m=new rt(this.logEnds.geometry(),this.m.cutWood);m.receiveShadow=!0,m.userData.ownGeometry=!0,this.draw.add(m),this.rebuilds++}landmarks(e,t){this.scenery.draw(e,t);const n=[],i=Math.round(e/xi),r=Math.round((t+64)/gn);for(let o=r-1;o<=r+1;o++){const a=jc(o*gn-64,i);if(!(Math.hypot(e-a.x,t-a.z)>165))for(const c of[-1,1])for(let l=0;l<8;l++){const h=a.x+c*(a.width+6+l*3.6),u=a.z+5+Math.sin(l*2.3)*2,d=5+Ke(o,l,121)*4,m=Math.min(...[[0,0],[-d*.4,0],[d*.4,0],[0,-d*.4],[0,d*.4]].map(([_,p])=>Ce(h+_,u+p)));n.push({x:h,y:m-.12,z:u,sx:d,sy:3+Ke(l,o,141)*4,sz:d*.8,rot:Ke(l,o,123)*et})}}for(let o=0;o<this.m.rockParts.length;o++){const a=this.m.rockParts[o];this.instance(a.geometry,a.material,n.filter((c,l)=>l%this.m.rockParts.length===o),(c,l)=>{l.position.set(c.x,c.y,c.z),l.rotation.y=c.rot,l.scale.set(c.sx,c.sy,c.sz)},!0)}for(const o of n)this.colliders.push({x:o.x,z:o.z,r:Math.min(o.sx,o.sz)*.43,topY:o.y+o.sy*.6});for(const o of this.trees){if(Math.hypot(o.x-e,o.z-t)>85)continue;const a=this.prototypes[o.species*3+o.variant],c=a.perches;if(!c.length)continue;const l=Math.min(2,c.length),h=o.scale*(.85+o.color*.35);for(let u=0;u<l;u++){const d=c[Math.floor(Ke(o.x+u,o.z,733)*c.length)],m=d.x*h,_=d.z*h;this.perches.push({id:"branch:"+o.id+":"+u,x:o.x+m*Math.cos(o.rot)+_*Math.sin(o.rot),y:o.y+d.y*o.scale,z:o.z-m*Math.sin(o.rot)+_*Math.cos(o.rot)})}}}async rebuildFar(e,t){if(this.far&&(this.scene.remove(this.far),this.far.geometry.dispose()),this.farTrees){this.scene.remove(this.farTrees);for(const i of this.farTrees.children)i.dispose()}this.far=this.terrainFromData(await this.generate("terrain",{x0:e-1120,z0:t-1120,size:2240,res:112,far:!0}),!0),this.scene.add(this.far),this.farTrees=new qe,this.scene.add(this.farTrees);const n=[];for(let i=-29;i<=29;i++)for(let r=-29;r<=29;r++){const o=e+r*19+(Ke(r+e,i+t,45)-.5)*12,a=t+i*19+(Ke(r+e,i+t,46)-.5)*12,c=Math.hypot(o-e,a-t),l=vi(o,a),h=yn(o,a);c<210||c>550||l.meadow>.55||h.d<h.width+4||ki(o,a).y<.76||n.push({x:o,z:a,y:Ce(o,a)-.15,s:.66+Ke(r+e,i+t,47)*.7,rot:Ke(r+e,i+t,48)*et})}for(let i=0;i<4;i++){const r=n.filter((a,c)=>c%4===i),o=this.prototypes[i*3].far;for(const[a,c,l]of[[o.wood,i===1?this.m.birch:this.m.trunk,!1],[o.leaf,this.m.leafPhoto,!0]]){const h=new Ni(a,c,r.length),u=new ht;r.forEach((d,m)=>{u.position.set(d.x,d.y,d.z),u.scale.setScalar(d.s),u.rotation.y=d.rot,u.updateMatrix(),h.setMatrixAt(m,u.matrix),l&&h.setColorAt(m,new xe([14003561,14798714,10923122,12032365][i]))}),h.computeBoundingSphere(),this.farTrees.add(h)}}}trunkPoint(e,t){const n=this.prototypes[e.species*3+e.variant].near.trunk,i=(t-e.y)/e.scale;let r=1;for(;r<n.length-1&&n[r].y<i;)r++;const o=n[r-1],a=n[r],c=Math.max(0,Math.min(1,(i-o.y)/(a.y-o.y))),l=e.scale*(.85+e.color*.35),h=je(o.x,a.x,c)*l,u=je(o.z,a.z,c)*l;return{x:e.x+h*Math.cos(e.rot)+u*Math.sin(e.rot),z:e.z-h*Math.sin(e.rot)+u*Math.cos(e.rot),r:je(o.r,a.r,c)*l}}walkHeight(e,t){return this.scenery.height(e,t)}walkSurface(e,t){return this.scenery.surface(e,t)}move(e,t,n,i){let r=e+n,o=t+i,a=this.walkHeight(e,t);for(const c of this.colliders){if(c.bottomY!==void 0&&c.bottomY>a+1.8||c.topY!==void 0&&a>c.topY-.1)continue;const l=Math.hypot(r-c.x,o-c.z);l<c.r&&l>1e-4&&(r=c.x+(r-c.x)/l*c.r,o=c.z+(o-c.z)/l*c.r)}return this.walkHeight(r,o)-a>.3&&(this.walkHeight(r,t)-a>.3&&(r=e),this.walkHeight(e,o)-a>.3&&(o=t)),{x:r,z:o}}async init(e,t){await this.stream(e,t,!0)}async stream(e,t){const n=Math.floor(e/rs),i=Math.floor(t/rs);if(this.streaming||n===this.cx&&i===this.cz)return;this.streaming=!0,this.cx=n,this.cz=i;const r=[];for(let a=-3;a<=3;a++)for(let c=-3;c<=3;c++){const l=n+c,h=i+a;r.push({tx:l,tz:h,key:l+","+h,d:c*c+a*a})}r.sort((a,c)=>a.d-c.d);const o=new Set(r.map(a=>a.key));for(const[a,c]of this.tiles)o.has(a)||(this.chunks.remove(c.mesh),c.mesh.geometry.dispose(),this.tiles.delete(a));for(const a of r)this.tiles.has(a.key)||(this.tiles.set(a.key,await this.makeTile(a.tx,a.tz)),await new Promise(c=>requestAnimationFrame(c)));this.rebuildDraw(e,t),await this.rebuildFar(n*rs,i*rs),this.center.set(e,0,t),this.streaming=!1}createFalling(){this.fallCount=180,this.falling=new Ni(this.leaf,this.m.fallen,this.fallCount),this.falling.instanceMatrix.setUsage(sc),this.falling.frustumCulled=!1,this.scene.add(this.falling),this.leafParticles=[];const e=In(445);for(let t=0;t<this.fallCount;t++)this.leafParticles.push({x:e()*60-30,y:e()*18,z:e()*60-30,s:.35+e()*.4,phase:e()*et,rate:.28+e()*.6}),this.falling.setColorAt(t,new xe(da[t%8]));this.kicks=[],this.kickMesh=new Ni(this.leaf,this.m.fallen,120),this.kickMesh.instanceMatrix.setUsage(sc),this.kickMesh.frustumCulled=!1,this.scene.add(this.kickMesh),this.kickMesh.count=0,this.dummy=new ht}kick(e,t,n,i){const r=7+Math.floor(pc(e,t)*17);for(let o=0;o<r;o++){const a=Math.random()*et,c=Math.random()*.55;this.kicks.push({x:e+Math.cos(a)*c,y:Ce(e,t)+.07,z:t+Math.sin(a)*c,vx:n*.24+Math.cos(a),vz:i*.24+Math.sin(a),vy:.6+Math.random()*1.5,life:1.2+Math.random(),rot:Math.random()*et,color:da[o%8]})}this.kicks.length>120&&this.kicks.splice(0,this.kicks.length-120)}updateCarpet(e,t){const n=Math.round(e/5)*5,i=Math.round(t/5)*5;if(this.carpetCenter.x===n&&this.carpetCenter.y===i)return;this.carpetCenter.set(n,i);const r=new ht;let o=0;for(let a=-13;a<=13;a++)for(let c=-13;c<=13;c++){if(c*c+a*a>169)continue;const l=n+c,h=i+a,u=Ce(l,h),d=vi(l,h),m=ki(l,h);u<kt(l,h)+.1||m.y<.84||d.meadow>.4||lr(l,h)<1||(r.position.set(l,u+.02,h),r.quaternion.setFromUnitVectors(new C(0,1,0),m),r.rotateY(Ke(l,h,177)*et),r.scale.setScalar(.75+pc(l,h)*.23),r.updateMatrix(),this.carpet.setMatrixAt(o++,r.matrix))}this.carpet.count=o,this.carpet.instanceMatrix.needsUpdate=!0,this.carpet.computeBoundingSphere()}update(e,t,n){this.frame++,this.frame%6===0&&this.updateCarpet(n.x,n.z),!this.streaming&&(Math.floor(n.x/rs)!==this.cx||Math.floor(n.z/rs)!==this.cz)&&this.stream(n.x,n.z),!this.streaming&&Math.hypot(n.x-this.center.x,n.z-this.center.z)>24&&(this.rebuildDraw(n.x,n.z),this.center.set(n.x,0,n.z)),this.rivers.update(t,n);const i=this.dummy;for(let r=0;r<this.fallCount;r++){const o=this.leafParticles[r];let a=((o.x+t*.4-n.x+30)%60+60)%60-30+n.x,c=((o.z+t*.13-n.z+30)%60+60)%60-30+n.z;const l=Ce(a,c),h=l+((o.y-t*o.rate)%18+18)%18;a+=Math.sin(t*.6+o.phase),c+=Math.cos(t*.55+o.phase)*.6,i.position.set(a,h,c),i.rotation.set(t*.8+o.phase,t*.5+o.phase,Math.sin(t*1.6+o.phase)*.8),i.scale.setScalar(o.s),i.updateMatrix(),this.falling.setMatrixAt(r,i.matrix)}this.falling.instanceMatrix.needsUpdate=!0;for(const r of this.kicks){r.life-=e,r.vy-=e*3.4,r.x+=r.vx*e,r.y+=r.vy*e,r.z+=r.vz*e;const o=Ce(r.x,r.z)+.04;r.y<o&&(r.y=o,r.vy=0,r.vx*=.85,r.vz*=.85)}this.kicks=this.kicks.filter(r=>r.life>0),this.kickMesh.count=this.kicks.length,this.kicks.forEach((r,o)=>{i.position.set(r.x,r.y,r.z),i.rotation.set(r.vy===0?0:t*4,r.rot+t*.9,0),i.scale.setScalar(.55*Math.min(1,r.life*2)),i.updateMatrix(),this.kickMesh.setMatrixAt(o,i.matrix),this.kickMesh.setColorAt(o,new xe(r.color))}),this.kickMesh.instanceMatrix.needsUpdate=!0,this.kickMesh.instanceColor&&(this.kickMesh.instanceColor.needsUpdate=!0)}}class Vv{constructor(){this.ctx=null,this.enabled=!0,this.steps=0,this.samples=[],this.buffers={},this.peak=0,this.animals=new Map,this.falls=new Map,this.audibleFalls=[],this.calls=[]}async start(){if(this.ctx){await this.ctx.resume();return}const e=this.ctx=new AudioContext;this.master=e.createGain(),this.master.gain.value=this.enabled?.65:0,this.filter=e.createBiquadFilter(),this.filter.type="lowpass",this.filter.frequency.value=19e3,this.master.connect(this.filter).connect(e.destination),this.analyser=e.createAnalyser(),this.analyser.fftSize=256,this.filter.connect(this.analyser),this.wave=new Float32Array(256),this.noise=e.createBuffer(1,e.sampleRate*4,e.sampleRate);const t=this.noise.getChannelData(0);for(let o=0;o<t.length;o++)t[o]=(Math.random()*2-1)*.2;const n=e.createBufferSource(),i=e.createBiquadFilter(),r=e.createGain();n.buffer=this.noise,n.loop=!0,i.type="lowpass",i.frequency.value=650,r.gain.value=.035,n.connect(i).connect(r).connect(this.master),n.start(),this.wind=r,this.windFilter=i,this.initializing=Promise.all([["footsteps","leaf-footsteps.mp3"],["leaf0","leaves01.ogg"],["leaf1","leaves02.ogg"],["stone","gravel01.ogg"],["wood","wood01.ogg"],["wood2","wood02.ogg"],["wood3","wood03.ogg"],["mud","mud02.ogg"],["rockStep","stone01.ogg"],["robin","robin.mp3"],["robinAlt","robin-alt.mp3"],["blackbird","blackbird.mp3"],["cascade","cascade.mp3"],["stream","stream.mp3"],["splash","splash.mp3"]].map(async([o,a])=>{try{const c=await fetch("./audio/"+a);if(!c.ok)throw Error(a);this.buffers[o]=await e.decodeAudioData(await c.arrayBuffer())}catch{console.warn("Sound unavailable",a)}})).then(()=>this.samples=Object.values(this.buffers)),await e.resume()}setEnabled(e){this.enabled=e,this.ctx&&this.master.gain.setTargetAtTime(e?.65:0,this.ctx.currentTime,.12)}pause(){this.ctx?.suspend()}panner(e,t,n,i=3,r=38){const o=this.ctx.createPanner();return o.panningModel="HRTF",o.distanceModel="inverse",o.refDistance=i,o.maxDistance=r,o.rolloffFactor=1.8,o.positionX.value=e,o.positionY.value=t,o.positionZ.value=n,o.connect(this.master),o}play(e,t=.2,n=1,i=this.master,r=0,o=null){if(!this.ctx||this.ctx.state!=="running"||!e)return;const a=this.ctx.createBufferSource(),c=this.ctx.createGain();return a.buffer=e,a.playbackRate.value=n,c.gain.value=t,a.connect(c).connect(i),o===null?a.start(0,r):a.start(0,r,o),a.addEventListener("ended",()=>{a.disconnect(),c.disconnect()},{once:!0}),a}step(e,t,n=!1,i="leaves",r=0){if(!this.ctx||this.ctx.state!=="running")return;if(this.steps++,i==="water"){this.play(this.buffers.splash,.18,.8+Math.random()*.35);return}if(i==="leaves"&&this.buffers.footsteps){let c=Math.floor(Math.random()*12);c===this.lastFoot&&(c=(c+5)%12),this.lastFoot=c,this.play(this.buffers.footsteps,n?.43:.35,.94+Math.random()*.12,this.master,.075+c*.735,.66),r>.2&&this.play(this.buffers.splash,r*.025,1.5);return}const a=i==="leaves"?this.buffers["leaf"+this.steps%2]:i==="wood"?this.buffers[["wood","wood2","wood3"][this.steps%3]]:i==="grass"||i==="dirt"?this.buffers.mud:this.buffers.rockStep;this.play(a,i==="grass"?.11:i==="leaves"?.34:.18,.87+Math.random()*.24),r>.2&&this.play(this.buffers.splash,r*.032,1.5)}splashAt(e,t,n,i=.08){if(!this.ctx||this.ctx.state!=="running")return;const r=this.panner(e,t,n,2,28),o=this.play(this.buffers.splash,i,1.2,r);o?o.addEventListener("ended",()=>r.disconnect(),{once:!0}):r.disconnect()}rustleAt(e,t,n,i=.07){if(!this.ctx||this.ctx.state!=="running")return;const r=this.panner(e,t,n,2,25),o=this.play(this.buffers.leaf0,i,1.45,r);o?o.addEventListener("ended",()=>r.disconnect(),{once:!0}):r.disconnect()}call(e,t,n){if(!this.ctx||this.ctx.state!=="running")return;let i=this.animals.get(e);i||(i=this.panner(n.x,n.y,n.z,4,34),this.animals.set(e,i)),this.play(this.buffers[t==="blackbird"?"blackbird":Math.random()<.5?"robin":"robinAlt"],.17,.96+Math.random()*.07,i),this.calls.push({id:e,x:n.x,y:n.y,z:n.z,time:this.ctx.currentTime}),this.calls.length>20&&this.calls.shift()}moveAnimal(e,t,n,i){const r=this.animals.get(e);r&&(r.positionX.value=t,r.positionY.value=n,r.positionZ.value=i)}removeAnimal(e){this.animals.get(e)?.disconnect(),this.animals.delete(e)}waterLoop(e,t,n=6){if(!t)return null;const i=this.ctx,r=i.createBufferSource(),o=i.createBiquadFilter(),a=i.createGain(),c=this.panner(e.x,e.y,e.z,n,52);return o.type="highpass",o.frequency.value=420,r.buffer=t,r.loop=!0,a.gain.value=0,r.connect(o).connect(a).connect(c),r.start(0,Math.random()*Math.min(8,t.duration)),{source:r,gain:a,pan:c,filter:o}}update(e,t,n,i){if(!this.ctx||this.ctx.state!=="running")return;const r=this.ctx,o=r.listener;for(const[u,d]of Object.entries({positionX:t.x,positionY:t.y,positionZ:t.z,forwardX:-Math.sin(t.yaw)*Math.cos(t.pitch),forwardY:Math.sin(t.pitch),forwardZ:-Math.cos(t.yaw)*Math.cos(t.pitch),upX:0,upY:1,upZ:0}))o[u].setValueAtTime(d,r.currentTime);this.filter.frequency.setTargetAtTime(i.underwater?650:19e3,r.currentTime,.12);const a=.72+Math.sin(e*.071)*.21+Math.sin(e*.173)*.09;this.wind.gain.setTargetAtTime(.022*a,r.currentTime,.8),this.windFilter.frequency.setTargetAtTime(480+a*250,r.currentTime,.8);const c=new Set;this.audibleFalls=[];for(const u of n.rivers.sources){const d=Math.hypot(u.x-t.x,u.z-t.z,u.y-t.y);if(d>56)continue;c.add(u.id);let m=this.falls.get(u.id);if(!m){if(m=this.waterLoop(u,this.buffers.cascade),!m)continue;this.falls.set(u.id,m)}const _=Math.pow(Math.max(0,1-d/52),2);m.gain.gain.setTargetAtTime(_*.32,r.currentTime,.25),_>.001&&this.audibleFalls.push({id:u.id,distance:d,gain:_*.32})}for(const[u,d]of this.falls)c.has(u)||(d.source.stop(),d.source.disconnect(),d.filter.disconnect(),d.gain.disconnect(),d.pan.disconnect(),this.falls.delete(u));const l=yn(t.x,t.z);this.stream||(this.stream=this.waterLoop({x:l.x,y:l.level,z:t.z},this.buffers.stream,2)),this.stream&&(this.stream.pan.positionX.value=l.x,this.stream.pan.positionY.value=l.level,this.stream.pan.positionZ.value=t.z,this.stream.gain.gain.setTargetAtTime(Math.pow(Math.max(0,1-l.d/17),2)*.11,r.currentTime,.3)),this.analyser.getFloatTimeDomainData(this.wave);let h=0;for(const u of this.wave)h=Math.max(h,Math.abs(u));this.peak=Math.max(this.peak,h)}}const Gv=new vn(1,16,10);function Wv(){const s=document.createElement("canvas");s.width=s.height=256;const e=s.getContext("2d"),t=In(713);e.fillStyle="#b8afa0",e.fillRect(0,0,256,256);for(let i=0;i<22e3;i++){const r=100+t()*150;e.strokeStyle=`rgba(${r},${r},${r},.4)`,e.lineWidth=.5,e.beginPath();const o=t()*256,a=t()*256;e.moveTo(o,a),e.lineTo(o+(t()-.5)*3,a+2+t()*6),e.stroke()}const n=new Dc(s);return n.colorSpace=Ct,n.wrapS=n.wrapT=ii,n}const Xv=new It({map:Wv(),vertexColors:!0,roughness:.96}),Rs=new It({color:1052685,roughness:.21});function Ae(s,e,t,n,i,r,o,a=0){const c=Gv.clone();c.scale(n,i,r),c.rotateX(a),c.translate(s,e,t);const l=new xe(o),h=[];for(let u=0;u<c.attributes.position.count;u++){const d=c.attributes.normal.getY(u);h.push(l.r*(.84+.16*Math.max(0,d)),l.g*(.84+.16*Math.max(0,d)),l.b*(.84+.16*Math.max(0,d)))}return c.setAttribute("color",new Ve(h,3)),c}function xt(s,e=Xv){const t=Lu(s,!1);s.forEach(i=>i.dispose());const n=new rt(t,e);return n.castShadow=!0,n}function On(s,e,t,n,i){const r=new C(...s),o=new C(...e),a=o.clone().sub(r),c=new fs(n,t,a.length(),8,1);c.applyQuaternion(new xn().setFromUnitVectors(new C(0,1,0),a.normalize())),c.translate(...r.add(o).multiplyScalar(.5).toArray());const l=new xe(i),h=[];for(let u=0;u<c.attributes.position.count;u++)h.push(l.r,l.g,l.b);return c.setAttribute("color",new Ve(h,3)),c}function Hh(s=!1){const e=new qe,t=new qe;e.add(t);const n=s?4340529:8680537,i=s?3617580:6576712;t.add(xt([Ae(0,.17,0,.076,.106,.135,n,-.35),Ae(0,.19,.083,.067,.075,.058,s?5589305:13267258)]));const r=new qe;r.position.set(0,.275,.085),t.add(r),r.add(xt([Ae(0,0,0,.061,.064,.061,n),Ae(0,0,.043,.048,.041,.018,s?4603441:12940351),On([0,.002,.05],[0,-.003,.099],.013,.001,s?13344826:4010532)]));for(let l of[-1,1]){const h=new rt(new vn(.009,10,8),Rs);h.position.set(l*.052,.016,.023),r.add(h)}const o=[];for(let l of[-1,1]){const h=new qe;h.position.set(l*.055,.21,-.015),t.add(h);const u=[Ae(l*.024,-.025,-.025,.032,.075,.13,i,.3)];for(let d=0;d<7;d++)u.push(Ae(l*(.023+d*.004),-.025-d*.004,-.065-d*.011,.009,.009,.085,i,.3));h.add(xt(u)),o.push(h),t.add(xt([On([l*.027,.1,.03],[l*.028,.027,.037],.005,.003,6375214),On([l*.028,.027,.037],[l*.035,.012,.083],.003,.001,6375214),On([l*.028,.027,.037],[l*.048,.012,.059],.003,.001,6375214)]))}const a=new qe;a.position.set(0,.14,-.09);const c=[];for(let l=0;l<5;l++)c.push(Ae((l-2)*.013,0,-.085,.013,.008,.11,i,-.12));return a.add(xt(c)),t.add(a),{root:e,body:t,wings:o,tail:a,head:r,kind:"bird"}}function qv(){const s=new qe,e=new qe;s.add(e);const t=10118977;e.add(xt([Ae(0,.24,-.025,.107,.155,.18,t,-.3),Ae(0,.2,.065,.075,.115,.08,12163445,-.3)]));const i=new qe;i.position.set(0,.35,.13),e.add(i),i.add(xt([Ae(0,0,0,.069,.074,.086,t),Ae(0,-.02,.07,.04,.038,.052,11043938),Ae(-.045,.076,-.008,.022,.048,.015,t,-.12),Ae(.045,.076,-.008,.022,.048,.015,t,-.12),Ae(0,-.015,.116,.015,.013,.011,3353634)]));for(let u of[-1,1]){const d=new rt(new vn(.012,12,8),Rs);d.position.set(u*.06,.015,.045),i.add(d)}const r=[];for(let u of[-1,1])for(let d=0;d<2;d++){const m=new qe;m.position.set(u*.07,.17,d?-.13:.1),m.add(xt([Ae(u*.014,-.035,0,d?.066:.027,d?.08:.065,d?.07:.026,t),Ae(u*.01,-.13,.035,.024,.019,.058,7689017)])),e.add(m),r.push(m)}const o=new qe;o.position.set(0,.19,-.17),e.add(o);const a=new yu([new C(0,0,0),new C(.01,.16,-.16),new C(.025,.37,-.19),new C(.02,.55,-.05)]),c=new kc(a,28,.1,12,!1),l=c.attributes.position,h=[];for(let u=0;u<=28;u++){const d=u/28,m=a.getPointAt(d),_=(.055+Math.sin(d*Math.PI)*.078)*Math.sqrt(1-d*.55);for(let p=0;p<=12;p++){const g=u*13+p,f=new C().fromBufferAttribute(l,g).sub(m).normalize();l.setXYZ(g,m.x+f.x*_,m.y+f.y*_,m.z+f.z*_);const x=new xe(p%4===0?12094046:t);x.multiplyScalar(.86+Math.max(0,f.y)*.14),h.push(x.r,x.g,x.b)}}return c.setAttribute("color",new Ve(h,3)),c.computeVertexNormals(),o.add(xt([c])),{root:s,body:e,head:i,legs:r,tail:o,kind:"squirrel"}}function Vh(s=!1){const e=new qe,t=new qe;e.add(t);const n=10059878,i=13022880,r=5326393;t.add(xt([Ae(0,1.03,0,.26,.35,.64,n),Ae(0,1.1,.48,.18,.43,.22,n,-.45),Ae(0,.98,-.52,.21,.27,.15,i)]));const o=new qe;o.position.set(0,1.54,.61),t.add(o),o.add(xt([Ae(0,0,.055,.11,.16,.2,n,.25),Ae(0,-.09,.22,.072,.075,.16,n,.3),Ae(0,-.12,.355,.065,.04,.036,r),Ae(-.16,.16,-.005,.065,.16,.027,n,-.25),Ae(.16,.16,-.005,.065,.16,.027,n,-.25)]));for(let l of[-1,1]){const h=new rt(new vn(.018,10,8),Rs);if(h.position.set(l*.104,.013,.155),o.add(h),s){const u=[];for(let d=0;d<4;d++)u.push(On([l*(.065+d*.025),.13+d*.09,-d*.07],[l*(.09+d*.025),.22+d*.09,-.07-d*.07],.018-d*.003,.015-d*.003,10721658)),d>0&&u.push(On([l*(.07+d*.025),.17+d*.09,-.04-d*.07],[l*(.12+d*.035),.35+d*.09,.04-d*.07],.012,.002,10721658));o.add(xt(u))}}const a=[];for(let l of[-1,1])for(let h=0;h<2;h++){const u=new qe;u.position.set(l*.16,1.02,h?-.4:.4),u.add(xt([On([0,0,0],[0,-.46,h?.06:-.04],.067,.035,n),On([0,-.46,h?.06:-.04],[0,-.94,.02],.033,.019,n),Ae(0,-.955,.055,.04,.055,.075,r)])),t.add(u),a.push(u)}const c=new qe;return c.position.set(0,1.15,-.59),c.add(xt([Ae(0,0,-.08,.07,.045,.16,i,-.5)])),t.add(c),{root:e,body:t,head:o,legs:a,tail:c,kind:"deer"}}function Yv(){const s=new qe,e=new qe;s.add(e);const t=9404516;e.add(xt([Ae(0,.25,-.06,.105,.16,.23,t),Ae(0,.22,.08,.08,.12,.12,11575424)]));const n=new qe;n.position.set(0,.36,.15),n.add(xt([Ae(0,0,0,.063,.075,.085,t),Ae(0,-.025,.075,.044,.031,.04,10720636),Ae(-.031,.15,-.015,.024,.16,.018,t,-.2),Ae(.031,.15,-.015,.024,.16,.018,t,-.2),Ae(-.031,.16,.001,.011,.11,.007,7953743),Ae(.031,.16,.001,.011,.11,.007,7953743)])),e.add(n);for(const o of[-1,1]){const a=new rt(new vn(.01,8,6),Rs);a.position.set(o*.057,.02,.034),n.add(a)}const i=[];for(const o of[-1,1])for(let a=0;a<2;a++){const c=new qe;c.position.set(o*.07,.2,a?-.19:.12),c.add(xt([Ae(0,-.08,.02,a?.055:.023,.09,.055,t),Ae(0,-.17,.07,.025,.025,a?.105:.06,t)])),e.add(c),i.push(c)}const r=new qe;return r.add(xt([Ae(0,.24,-.28,.04,.05,.05,13616296)])),e.add(r),{root:s,body:e,head:n,legs:i,tail:r}}function jv(){const s=new qe,e=new qe;s.add(e);const t=10904885;e.add(xt([Ae(0,.48,0,.13,.18,.38,t),Ae(0,.48,.28,.1,.22,.12,t,-.3),Ae(0,.37,.27,.08,.12,.1,13154718)]));const n=new qe;n.position.set(0,.67,.31),e.add(n),n.add(xt([Ae(0,0,.03,.082,.086,.12,t),Ae(0,-.02,.145,.047,.037,.12,t),Ae(0,-.025,.242,.022,.019,.022,2630429),Ae(-.057,.11,-.003,.031,.094,.019,t),Ae(.057,.11,-.003,.031,.094,.019,t)]));for(const o of[-1,1]){const a=new rt(new vn(.009,8,6),Rs);a.position.set(o*.071,.012,.076),n.add(a)}const i=[];for(const o of[-1,1])for(let a=0;a<2;a++){const c=new qe;c.position.set(o*.085,.47,a?-.25:.25),c.add(xt([On([0,0,0],[0,-.28,a?.04:-.01],.038,.02,t),On([0,-.28,0],[0,-.45,.025],.02,.013,4470827),Ae(0,-.45,.05,.024,.025,.05,4470827)])),e.add(c),i.push(c)}const r=new qe;return r.position.set(0,.46,-.32),r.add(xt([Ae(0,-.04,-.24,.075,.083,.29,t,-.16),Ae(0,-.075,-.48,.052,.06,.095,13024420,-.16)])),e.add(r),{root:s,body:e,head:n,legs:i,tail:r}}function Kv(){const s=new qe,e=new qe;s.add(e),e.add(xt([Ae(0,.095,0,.12,.12,.25,9212292),Ae(0,.16,.13,.095,.13,.1,7754567),Ae(0,.26,.19,.055,.105,.058,3430730)]));const t=new qe;t.position.set(0,.34,.21),e.add(t),t.add(xt([Ae(0,0,0,.064,.068,.084,2643016),Ae(0,-.015,.096,.041,.016,.065,12229698)]));for(const r of[-1,1]){const o=new rt(new vn(.007,8,6),Rs);o.position.set(r*.055,.015,.034),t.add(o)}const n=[];for(const r of[-1,1]){const o=new qe;o.position.set(r*.09,.15,0),o.add(xt([Ae(r*.02,0,-.05,.044,.061,.2,6840142),Ae(r*.045,.01,-.06,.014,.043,.07,4085112)])),e.add(o),n.push(o)}const i=new qe;return i.add(xt([Ae(0,.11,-.25,.07,.033,.08,4145723)])),e.add(i),{root:s,body:e,head:t,wings:n,tail:i}}class $v{constructor(e,t,n){this.scene=e,this.world=t,this.audio=n,this.animals=new Map,this.spawned=new Set,this.tick=0,this.spooks={bird:0,squirrel:0,deer:0,hare:0,fox:0},this.calls=0,this.templates={robin:Hh(!1),blackbird:Hh(!0),squirrel:qv(),deer:Vh(!1),stag:Vh(!0),hare:Yv(),fox:jv(),duck:Kv()},this.lastCell="",this.events=[],this.tracks=[];const i=new tn({transparent:!0,depthWrite:!1,side:Tt,vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}",fragmentShader:"varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float d=min(length((p-vec2(.26,0.))*vec2(2.8,1.3)),length((p+vec2(.26,0.))*vec2(2.8,1.3)));gl_FragColor=vec4(.08,.055,.028,(1.-smoothstep(.65,1.,d))*.3);}"}),r=new Mi(.17,.23);r.rotateX(-Math.PI/2),this.trackMesh=new Ni(r,i,180),this.trackMesh.instanceMatrix.setUsage(sc),this.trackMesh.count=0,this.trackMesh.frustumCulled=!1,e.add(this.trackMesh),this.dummy=new ht}model(e){const t=this.templates[e],n=t.root.clone(!0),i=new Map,r=(o,a)=>{i.set(o,a),o.children.forEach((c,l)=>r(c,a.children[l]))};return r(t.root,n),{root:n,body:i.get(t.body),head:i.get(t.head),tail:i.get(t.tail),legs:t.legs?.map(o=>i.get(o)),wings:t.wings?.map(o=>i.get(o))}}spawn(e,t){const n=Math.floor(e.x/30),i=Math.floor(e.z/30),r=n+","+i;if(r!==this.lastCell){this.lastCell=r;for(let o=-3;o<=3;o++)for(let a=-3;a<=3;a++){const c=n+a,l=i+o,h=c+","+l;if(this.spawned.has(h))continue;const u=In(Ke(c,l,373)*1e8),d=c*30+5+u()*20,m=l*30+5+u()*20,_=vi(d,m),p=Ce(d,m),g=_.site.pond&&p<kt(d,m)-.25;if(!g&&(p<kt(d,m)+.2||ki(d,m).y<.8))continue;this.spawned.add(h);let f=g?"duck":_.meadow>.4?u()<.58?"deer":"hare":u()<.12?"fox":u()<.58?"robin":"squirrel";f==="robin"&&u()<.3&&(f="blackbird");const x=f==="duck"?2+Math.floor(u()*2):f==="deer"?2+Math.floor(u()*3):f==="robin"?1+Math.floor(u()*2):1;for(let v=0;v<x;v++){let y=d+v*2.1,b=m+v*1.8,w=Ce(y,b);g&&(w=kt(y,b)+.015);const R=f==="robin"||f==="blackbird"||g;if(R&&!g){const S=this.world.perches.filter(L=>!L.id.startsWith("rock:")&&![...this.animals.values()].some(I=>I.bird&&Math.hypot(I.x-L.x,I.z-L.z)<.7)).filter(L=>Math.hypot(L.x-y,L.z-b)<14);if(S.length){const L=S[Math.floor(u()*S.length)];y=L.x,w=L.y,b=L.z}}if(!g&&w<kt(y,b)+.2||g&&Ce(y,b)>kt(y,b)-.1)continue;const A=this.model(f==="deer"&&u()<.35?"stag":f),M={id:h+":"+v,kind:f,bird:R,waterBird:g,model:A,x:y,y:w,z:b,home:{x:y,z:b},yaw:u()*et,phase:u()*et,state:"idle",next:t+2+u()*9,callAt:t+2+u()*12,callCount:0,spooked:!1,age:0,target:null,trackX:y,trackZ:b};A.root.position.set(y,w,b),A.root.rotation.y=M.yaw,A.root.scale.setScalar(R?1.15:f==="deer"?.85+u()*.18:1),this.scene.add(A.root),this.animals.set(M.id,M)}}for(const[o,a]of this.animals)Math.hypot(a.x-e.x,a.z-e.z)>140&&(this.audio.removeAnimal(o),this.scene.remove(a.model.root),this.animals.delete(o));for(const o of this.spawned){const[a,c]=o.split(",").map(Number);Math.hypot(a*30+15-e.x,c*30+15-e.z)>175&&this.spawned.delete(o)}}}targetAway(e,t){if(e.waterBird){const r=[];for(let o=0;o<24;o++){const a=o/24*et,c=e.x+Math.sin(a)*13,l=e.z+Math.cos(a)*13;Ce(c,l)<kt(c,l)-.2&&r.push({x:c,z:l,y:kt(c,l)+.015})}return r.sort((o,a)=>Math.hypot(a.x-t.x,a.z-t.z)-Math.hypot(o.x-t.x,o.z-t.z)),r[0]||{x:e.x,z:e.z,y:kt(e.x,e.z)+.015}}let n=e.bird?this.world.perches.filter(r=>!r.id.startsWith("rock:")&&![...this.animals.values()].some(o=>o.bird&&Math.hypot(o.x-r.x,o.z-r.z)<.7)):this.world.trees;if(n=n.filter(r=>{const o=Math.hypot(r.x-e.x,r.z-e.z);return o>10&&o<32&&Math.hypot(r.x-t.x,r.z-t.z)>18}),n.length){n.sort((o,a)=>Math.hypot(o.x-e.x,o.z-e.z)-Math.hypot(a.x-e.x,a.z-e.z));const r=n[0];return{x:r.x,y:e.bird?r.y:Ce(r.x,r.z),z:r.z,tree:e.bird?null:r}}const i=Math.atan2(e.x-t.x,e.z-t.z)+(Ke(Math.floor(e.x),Math.floor(e.z),97)-.5)*1.4;return{x:e.x+Math.sin(i)*24,z:e.z+Math.cos(i)*24,y:0}}update(e,t,n,i){if(!i)return;this.tick++,this.spawn(n,t);const r=Math.hypot(n.vx,n.vz);for(const o of this.animals.values()){const a=Math.hypot(o.x-n.x,o.z-n.z),c=o.model;if(c.root.visible=a<(o.bird?46:85),a>85)continue;o.age+=e,o.state,o.state;const l=o.waterBird?r>3?14:r<1.5?4:7:o.bird?r>3?11:r<1.5?2.7:4.3:o.kind==="squirrel"?r>3?13:r<1.5?3.4:5:r>3?25:r<1.5?6.5:12;if(a<l&&o.state!=="fly"&&o.state!=="flee"&&o.state!=="climb"&&o.state!=="tree"&&o.state!=="descend"&&(o.state=o.bird?"fly":"flee",o.target=this.targetAway(o,n),o.origin={x:o.x,y:o.y,z:o.z},o.age=0,o.spooked=!0,this.spooks[o.bird?"bird":o.kind]++,o.waterBird&&this.audio.splashAt(o.x,o.y,o.z,.16),this.audio.rustleAt(o.x,o.y,o.z,o.bird?.06:.13),this.events.push({kind:o.kind,type:"flee",distance:a,time:t}),this.events.length>20&&this.events.shift()),o.state==="fly"){const h=_o(o.age/3.1),u=h*h*(3-2*h);o.x=je(o.origin.x,o.target.x,u),o.z=je(o.origin.z,o.target.z,u);const d=o.target.y||Ce(o.target.x,o.target.z)+.02;o.y=je(o.origin.y,d,u)+Math.sin(h*Math.PI)*5,o.yaw=Math.atan2(o.target.x-o.origin.x,o.target.z-o.origin.z),c.body.rotation.x=-.15;for(let m=0;m<2;m++)c.wings[m].rotation.z=(m?1:-1)*(1+Math.sin(t*43+o.phase)*.85),c.wings[m].rotation.y=(m?1:-1)*.8;h>=1&&(o.state="idle",o.age=0,o.next=t+6,o.callAt=t+6+Ke(o.x,o.z)*10,c.body.rotation.x=0,c.wings.forEach(m=>m.rotation.set(0,0,0)))}else if(o.state==="flee"||o.state==="wander"){const h=o.state==="flee",u=o.target.x-o.x,d=o.target.z-o.z,m=Math.hypot(u,d),_=h?o.kind==="squirrel"?5:6.5:o.kind==="deer"?.5:.8;if(m>.6){const p=Math.min(m,_*e),g=o.x+u/m*p,f=o.z+d/m*p;if(Ce(g,f)>kt(g,f)+.1){const v=this.world.move(o.x,o.z,g-o.x,f-o.z);o.x=v.x,o.z=v.z}else o.target={x:o.x,z:o.z};o.yaw=Math.atan2(u,d),o.y=Ce(o.x,o.z);const x=Math.max(0,Math.sin(o.age*(h?18:8)));c.body.position.y=h?x*(o.kind==="deer"?.12:o.kind==="hare"?.18:.06):0,c.legs?.forEach((v,y)=>v.rotation.x=Math.sin(o.age*(h?18:8)+y%2*Math.PI)*(h?.8:.25)),this.tick%45===0&&a<22&&this.audio.rustleAt(o.x,o.y,o.z,.07)}(m<1||o.age>7)&&(h&&m<1&&o.kind==="squirrel"&&o.target.tree?(o.state="climb",o.tree=o.target.tree,o.y=Ce(o.tree.x,o.tree.z),o.climbAngle=o.yaw+Math.PI):(o.state="idle",o.next=t+3+Ke(o.x,o.z)*6,c.body.position.y=0,c.legs?.forEach(p=>p.rotation.x=0)),o.age=0)}else if(o.state==="climb")o.y+=e*2.7,c.body.rotation.x=-1.1,c.tail.rotation.x=.3,(o.age>1.8||o.y>o.tree.y+this.world.prototypes[o.tree.species*3+o.tree.variant].near.height*o.tree.scale*.55)&&(o.state="tree",o.next=t+20);else if(o.state==="tree")t>o.next&&a>12&&(o.state="descend",o.age=0);else if(o.state==="descend")o.y-=e*1.8,c.body.rotation.x=1.1,o.y<=Ce(o.x,o.z)&&(o.y=Ce(o.x,o.z),o.state="idle",o.next=t+8,c.body.rotation.x=0);else{if(c.body.position.y=Math.sin(t*2+o.phase)*.004,o.bird?(c.head.rotation.y=Math.sin(Math.floor(t*1.4+o.phase))*.35,c.tail.rotation.x=Math.sin(t*3+o.phase)*.08,!o.waterBird&&t>o.callAt&&a<34&&(this.audio.call(o.id,o.kind,{x:o.x,y:o.y+.28,z:o.z}),o.callAt=t+6+Ke(Math.floor(t),o.x)*13,o.callCount++,this.calls++)):(c.head.rotation.x=o.kind==="deer"?Math.sin(t*.45+o.phase)*.45+.2:Math.sin(t*2+o.phase)*.1,c.head.rotation.y=Math.sin(t*.72+o.phase)*.27,c.tail.rotation.z=Math.sin(t*2+o.phase)*(o.kind==="squirrel"?.1:.03)),o.bird&&!o.waterBird&&t>o.next+27&&a>7){const h=this.world.perches.filter(u=>!u.id.startsWith("rock:")&&![...this.animals.values()].some(d=>d.bird&&Math.hypot(d.x-u.x,d.z-u.z)<.7)).filter(u=>Math.hypot(u.x-o.x,u.z-o.z)>7&&Math.hypot(u.x-o.x,u.z-o.z)<22);h.length?(o.target=h[Math.floor(Ke(o.x,Math.floor(t),38)*h.length)],o.origin={x:o.x,y:o.y,z:o.z},o.state="fly",o.age=0):o.next=t+12}if(!o.bird&&t>o.next){const h=Ke(Math.floor(t),o.x)*et,u=o.x+Math.sin(h)*4,d=o.z+Math.cos(h)*4;Ce(u,d)>kt(u,d)+.2&&(o.state="wander",o.target={x:u,z:d},o.age=0),o.next=t+5+Ke(o.x,t)*9}}if(!o.bird&&Math.hypot(o.x-o.trackX,o.z-o.trackZ)>(o.kind==="deer"?.75:.32)&&o.state!=="tree"&&o.state!=="climb"){const h=yn(o.x,o.z);(lr(o.x,o.z)<2.5||h.d<h.width+7)&&this.tracks.push({x:o.x,z:o.z,angle:o.yaw,size:o.kind==="deer"?1:.4,time:t}),o.trackX=o.x,o.trackZ=o.z}if(!o.bird&&(o.state==="idle"||o.state==="wander"||o.state==="flee"))for(const h of this.animals.values()){if(h===o||h.bird||h.state==="climb"||h.state==="tree"||h.state==="descend")continue;const u=o.x-h.x,d=o.z-h.z,m=Math.hypot(u,d),_=(o.kind==="deer"?.95:.28)+(h.kind==="deer"?.95:.28);if(m>.001&&m<_){const p=(_-m)*.55,g=this.world.move(o.x,o.z,u/m*p,d/m*p);Ce(g.x,g.z)>kt(g.x,g.z)+.1&&(o.x=g.x,o.z=g.z,o.y=Ce(o.x,o.z))}}if(o.state==="climb"||o.state==="tree"||o.state==="descend"){const h=this.world.trunkPoint(o.tree,o.y+.28),u=h.r+.23;o.x=h.x+Math.sin(o.climbAngle)*u,o.z=h.z+Math.cos(o.climbAngle)*u}if(o.waterBird&&o.state!=="fly"){const h=o.phase+t*.11,u=o.x+Math.sin(h)*e*.21,d=o.z+Math.cos(h)*e*.21;Ce(u,d)<kt(u,d)-.12&&(o.x=u,o.z=d,o.yaw=h),o.y=kt(o.x,o.z)+Math.sin(t*1.8+o.phase)*.008,this.tick%85===0&&a<32&&this.world.rivers.splash(o.x,o.z,t)}c.root.position.set(o.x,o.y,o.z),c.root.rotation.y=o.yaw,this.audio.moveAnimal(o.id,o.x,o.y+.25,o.z)}this.tracks=this.tracks.filter(o=>t-o.time<70).slice(-180),this.trackMesh.count=this.tracks.length,this.tracks.forEach((o,a)=>{const c=this.dummy;c.position.set(o.x,Ce(o.x,o.z)+.023,o.z),c.quaternion.setFromUnitVectors(new C(0,1,0),ki(o.x,o.z)),c.rotateY(o.angle),c.scale.setScalar(o.size),c.updateMatrix(),this.trackMesh.setMatrixAt(a,c.matrix)}),this.trackMesh.instanceMatrix.needsUpdate=!0}inspect(e){return{tracks:this.tracks.length,count:this.animals.size,calls:this.calls,spooks:{...this.spooks},nearby:[...this.animals.values()].map(t=>({id:t.id,kind:t.kind,x:t.x,y:t.y,z:t.z,state:t.state,calls:t.callCount,distance:Math.hypot(t.x-e.x,t.z-e.z)})).sort((t,n)=>t.distance-n.distance).slice(0,12),events:this.events}}}const hr=document.querySelector("#forest"),sr=document.querySelector("#enter"),vo=document.querySelector("#error"),Bt=new Set,Ht=new Vv;let an=!1,co=!1,hs=!matchMedia("(prefers-reduced-motion: reduce)").matches,Rt,Ot,Qr,qt={},Gs=0,Z={x:40,z:6,y:Ce(40,6)+1.69,yaw:-.785,pitch:.025,vx:0,vz:0,vy:0,distance:0},Un=0,lo=performance.now(),_a=0,Ks=[],mc={},Gh=0,Wh=0;try{const s=JSON.parse(localStorage.getItem("autumn:walk:v4")||"null");s&&[s.x,s.z,s.yaw,s.pitch].every(Number.isFinite)&&(Z={...Z,...s},Z.y=Ce(Z.x,Z.z)+1.69)}catch{}function Jc(){try{localStorage.setItem("autumn:walk:v4",JSON.stringify({x:Z.x,z:Z.z,yaw:Z.yaw,pitch:Z.pitch}))}catch{}}function yo(){an=!1,Bt.clear(),Z.vx=Z.vz=0,document.body.classList.remove("walking"),sr.textContent="Continue walking",Ht.pause(),Jc()}async function Wu(){if(co){await Ht.start();try{await hr.requestPointerLock()}catch{vo.textContent="Click the forest to use the mouse. Escape releases it."}}}sr.addEventListener("click",Wu);hr.addEventListener("click",()=>{an||Wu()});document.addEventListener("pointerlockchange",()=>{an=document.pointerLockElement===hr,an?(document.body.classList.add("walking"),Ht.start(),lo=performance.now(),vo.textContent=""):yo()});document.addEventListener("mousemove",s=>{an&&(Z.yaw-=s.movementX*.00165,Z.pitch=_o(Z.pitch-s.movementY*.00165,-1.42,1.42))});window.addEventListener("keydown",s=>{if(s.code==="Escape"&&an){document.exitPointerLock(),yo();return}["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","ShiftLeft","ShiftRight","ControlLeft","ControlRight"].includes(s.code)&&(an&&s.preventDefault(),Bt.add(s.code))});window.addEventListener("keyup",s=>Bt.delete(s.code));window.addEventListener("blur",()=>{Bt.clear(),Z.vx=Z.vz=0,document.pointerLockElement&&document.exitPointerLock()});document.addEventListener("visibilitychange",()=>{document.hidden&&(Bt.clear(),document.pointerLockElement&&document.exitPointerLock(),yo())});window.addEventListener("pagehide",Jc);document.querySelector("#sound").onclick=s=>{Ht.setEnabled(!Ht.enabled),s.target.textContent=Ht.enabled?"Sound on":"Sound off",s.target.setAttribute("aria-pressed",String(Ht.enabled))};document.querySelector("#quality").onclick=s=>{Rt&&(s.target.textContent="Detail: "+Rt.detail())};document.querySelector("#sway").textContent=hs?"Walking motion on":"Walking motion off";document.querySelector("#sway").onclick=s=>{hs=!hs,s.target.textContent=hs?"Walking motion on":"Walking motion off",s.target.setAttribute("aria-pressed",String(hs))};document.querySelector("#full").onclick=()=>{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{})};hr.addEventListener("webglcontextlost",s=>{s.preventDefault(),yo(),vo.textContent="The graphics connection was interrupted. Reload to continue from your last position."});function Xh(){const s=wv(Z.x,Z.z,Z.y);return Ot.walkHeight(Z.x,Z.z)>s.level+.06&&Ot.walkHeight(Z.x,Z.z)>Ce(Z.x,Z.z)+.12?{...s,depth:0,swimming:!1,underwater:!1}:s}function Xu(s){requestAnimationFrame(Xu);const e=(s-lo)/1e3,t=Math.min(.15,e);if(lo=s,document.hidden||!co)return;if(!an){if(s-Wh<140)return;Wh=s}if(Un+=t,hn.time.value=Un,an){const r=t,o=Math.ceil(r/.025);for(let a=0;a<o;a++){const c=r/o;let l=(Bt.has("KeyW")||Bt.has("ArrowUp")?1:0)-(Bt.has("KeyS")||Bt.has("ArrowDown")?1:0),h=(Bt.has("KeyD")?1:0)-(Bt.has("KeyA")?1:0);Bt.has("ArrowLeft")&&(Z.yaw+=c*1.1),Bt.has("ArrowRight")&&(Z.yaw-=c*1.1);const u=Math.hypot(l,h);u>0&&(l/=u,h/=u),qt=Xh();const d=Bt.has("ShiftLeft")||Bt.has("ShiftRight"),m=(Bt.has("ControlLeft")||Bt.has("ControlRight")?1.15:d?4.6:2.7)*(qt.swimming?.46:qt.depth>.15?.61:1),_=(h*Math.cos(Z.yaw)-l*Math.sin(Z.yaw))*m,p=(-l*Math.cos(Z.yaw)-h*Math.sin(Z.yaw))*m,g=1-Math.exp(-c*(u?15:22));Z.vx+=(_-Z.vx)*g,Z.vz+=(p-Z.vz)*g;const f=Ot.move(Z.x,Z.z,Z.vx*c,Z.vz*c+(qt.depth>1.2?.16+qt.spray*.5:0)*c),x=Math.hypot(f.x-Z.x,f.z-Z.z);if(Z.x=f.x,Z.z=f.z,Z.distance+=x,_a+=x,_a>(qt.swimming?1.3:d?1.05:.86)){_a=0;const y=Ot.walkSurface(Z.x,Z.z)||bv(Z.x,Z.z);Ht.step(Z.x,Z.z,d,y,Gs),y==="water"&&Ot.rivers.splash(Z.x,Z.z,Un),y==="leaves"&&Ot.kick(Z.x-Math.sin(Z.yaw)*.32,Z.z-Math.cos(Z.yaw)*.32,Z.vx,Z.vz)}qt=Xh(),Gs=Math.max(Gs-c*.018,qt.spray,qt.depth>.7?.8:0);const v=Math.max(Ot.walkHeight(Z.x,Z.z)+1.69,qt.swimming?qt.level+.34:-1/0);qt.swimming?(Z.vy+=(v-Z.y)*c*12,Z.vy*=Math.exp(-c*4),Z.y+=Z.vy*c):Z.y>v+.16?(Z.vy-=c*9.81,Z.y+=Z.vy*c,Z.y<v&&(Z.y=v,Z.vy=0)):(Z.y+=(v-Z.y)*(1-Math.exp(-c*16)),Z.vy=0),Un-Gh>8&&(Jc(),Gh=Un)}}const n=Math.min(1,Math.hypot(Z.vx,Z.vz)),i=an&&hs?Math.sin(Z.distance*Zv/.86)*.014*n:0;Rt.camera.position.set(Z.x,Z.y+i,Z.z),Rt.camera.rotation.set(Z.pitch,Z.yaw,0),hn.player.value.copy(Rt.camera.position),Ot.update(t,Un,Z),Qr.update(t,Un,Z,an),Ht.update(Un,Z,Ot,qt),Rt.setWetness(Gs,qt.spray||0,qt.underwater||!1),mc=Rt.render(Un),an&&(Ks.push(e*1e3),Ks.length>1200&&Ks.shift())}const Zv=Math.PI*2;async function Jv(){Rt=new Av(hr);const[s]=await Promise.all([Mv(Rt.renderer),Rt.loadSky()]);Ot=new Hv(Rt.scene,s),await Ot.init(Z.x,Z.z),Qr=new $v(Rt.scene,Ot,Ht),Qr.spawn(Z,Un),Z.y=Ot.walkHeight(Z.x,Z.z)+1.69,Rt.camera.position.set(Z.x,Z.y,Z.z),Rt.camera.rotation.set(Z.pitch,Z.yaw,0),Rt.renderer.shadowMap.needsUpdate=!0,await Rt.renderer.compileAsync(Rt.scene,Rt.camera),Rt.render(0),co=!0,sr.disabled=!1,sr.textContent="Walk",lo=performance.now(),requestAnimationFrame(Xu),window.AUTUMN=Object.freeze({inspect:()=>{const e=[...Ks].sort((n,i)=>n-i),t=ar(Z.x,Z.z);return{ready:co,walking:an,position:{x:Z.x,y:Z.y,z:Z.z},yaw:Z.yaw,pitch:Z.pitch,distance:Z.distance,steps:Ht.steps,frames:Ks.length,medianMs:e[Math.floor(e.length*.5)]||0,p95Ms:e[Math.floor(e.length*.95)]||0,drawCalls:mc.calls,triangles:mc.tris,tiles:Ot.tiles.size,objects:Rt.renderer.info.memory,nearestPlace:t.name,places:Ot.scenery.loaded,placeDistance:Math.hypot(Z.x-t.x,Z.z-t.z),streamRebuilds:Ot.rebuilds,water:{...qt,wetness:Gs},wildlife:Qr.inspect(Z),audio:{falls:Ht.audibleFalls,calls:Ht.calls,state:Ht.ctx?.state||"not started",enabled:Ht.enabled,peak:Ht.peak,samples:Ht.samples.filter(Boolean).length},quality:Rt.quality,leafParticles:Ot.fallCount,kickedLeaves:Ot.kicks.length,hasHUD:document.body.classList.contains("walking")?getComputedStyle(document.querySelector("#veil")).visibility!=="hidden":!1}}})}Jv().catch(s=>{console.error(s),sr.textContent="Unable to load",vo.textContent="The forest could not load. Reload to try again. "+s.message});
