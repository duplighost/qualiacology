(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(i){if(i.ep)return;i.ep=!0;const r=t(i);fetch(i.href,r)}})();/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Fc="180",Gf=0,Pl=1,Wf=2,Tu=1,Eu=2,ti=3,ai=0,Wt=1,Et=2,bi=0,ws=1,Ll=2,Il=3,Dl=4,Xf=5,ki=100,qf=101,Yf=102,jf=103,Kf=104,Zf=200,$f=201,Jf=202,Qf=203,za=204,Fa=205,ed=206,td=207,nd=208,id=209,sd=210,rd=211,od=212,ad=213,cd=214,Oa=0,ka=1,Ba=2,Es=3,Ha=4,Va=5,Ga=6,Wa=7,Au=0,ld=1,hd=2,Si=0,ud=1,fd=2,dd=3,Ru=4,pd=5,md=6,gd=7,Ul="attached",xd="detached",Cu=300,As=301,Rs=302,Xa=303,qa=304,Po=306,ci=1e3,Pn=1001,yo=1002,tn=1003,Pu=1004,tr=1005,on=1006,lo=1007,Vn=1008,Xn=1009,Lu=1010,Iu=1011,ur=1012,Oc=1013,Ei=1014,Ln=1015,li=1016,kc=1017,Bc=1018,fr=1020,Du=35902,Uu=35899,Nu=1021,zu=1022,fn=1023,dr=1026,pr=1027,Hc=1028,Vc=1029,Fu=1030,Gc=1031,Wc=1033,ho=33776,uo=33777,fo=33778,po=33779,Ya=35840,ja=35841,Ka=35842,Za=35843,$a=36196,Ja=37492,Qa=37496,ec=37808,tc=37809,nc=37810,ic=37811,sc=37812,rc=37813,oc=37814,ac=37815,cc=37816,lc=37817,hc=37818,uc=37819,fc=37820,dc=37821,pc=36492,mc=36494,gc=36495,xc=36283,vc=36284,_c=36285,yc=36286,mr=2300,gr=2301,Vo=2302,Nl=2400,zl=2401,Fl=2402,vd=2500,_d=0,Ou=1,Mc=2,yd=3200,ku=3201,Bu=0,Md=1,ni="",Ut="srgb",nn="srgb-linear",Mo="linear",xt="srgb",Ji=7680,Ol=519,wd=512,bd=513,Sd=514,Hu=515,Td=516,Ed=517,Ad=518,Rd=519,wc=35044,vs=35048,kl="300 es",Gn=2e3,wo=2001;class zs{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const i=n[e];if(i!==void 0){const r=i.indexOf(t);r!==-1&&i.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const i=n.slice(0);for(let r=0,o=i.length;r<o;r++)i[r].call(this,e);e.target=null}}}const Yt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Bl=1234567;const rr=Math.PI/180,Cs=180/Math.PI;function Mn(){const s=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Yt[s&255]+Yt[s>>8&255]+Yt[s>>16&255]+Yt[s>>24&255]+"-"+Yt[e&255]+Yt[e>>8&255]+"-"+Yt[e>>16&15|64]+Yt[e>>24&255]+"-"+Yt[t&63|128]+Yt[t>>8&255]+"-"+Yt[t>>16&255]+Yt[t>>24&255]+Yt[n&255]+Yt[n>>8&255]+Yt[n>>16&255]+Yt[n>>24&255]).toLowerCase()}function et(s,e,t){return Math.max(e,Math.min(t,s))}function Xc(s,e){return(s%e+e)%e}function Cd(s,e,t,n,i){return n+(s-e)*(i-n)/(t-e)}function Pd(s,e,t){return s!==e?(t-s)/(e-s):0}function or(s,e,t){return(1-t)*s+t*e}function Ld(s,e,t,n){return or(s,e,1-Math.exp(-t*n))}function Id(s,e=1){return e-Math.abs(Xc(s,e*2)-e)}function Dd(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*(3-2*s))}function Ud(s,e,t){return s<=e?0:s>=t?1:(s=(s-e)/(t-e),s*s*s*(s*(s*6-15)+10))}function Nd(s,e){return s+Math.floor(Math.random()*(e-s+1))}function zd(s,e){return s+Math.random()*(e-s)}function Fd(s){return s*(.5-Math.random())}function Od(s){s!==void 0&&(Bl=s);let e=Bl+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function kd(s){return s*rr}function Bd(s){return s*Cs}function Hd(s){return(s&s-1)===0&&s!==0}function Vd(s){return Math.pow(2,Math.ceil(Math.log(s)/Math.LN2))}function Gd(s){return Math.pow(2,Math.floor(Math.log(s)/Math.LN2))}function Wd(s,e,t,n,i){const r=Math.cos,o=Math.sin,a=r(t/2),c=o(t/2),l=r((e+n)/2),h=o((e+n)/2),u=r((e-n)/2),f=o((e-n)/2),d=r((n-e)/2),m=o((n-e)/2);switch(i){case"XYX":s.set(a*h,c*u,c*f,a*l);break;case"YZY":s.set(c*f,a*h,c*u,a*l);break;case"ZXZ":s.set(c*u,c*f,a*h,a*l);break;case"XZX":s.set(a*h,c*m,c*d,a*l);break;case"YXY":s.set(c*d,a*h,c*m,a*l);break;case"ZYZ":s.set(c*m,c*d,a*h,a*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function Rn(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function pt(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}const Xd={DEG2RAD:rr,RAD2DEG:Cs,generateUUID:Mn,clamp:et,euclideanModulo:Xc,mapLinear:Cd,inverseLerp:Pd,lerp:or,damp:Ld,pingpong:Id,smoothstep:Dd,smootherstep:Ud,randInt:Nd,randFloat:zd,randFloatSpread:Fd,seededRandom:Od,degToRad:kd,radToDeg:Bd,isPowerOfTwo:Hd,ceilPowerOfTwo:Vd,floorPowerOfTwo:Gd,setQuaternionFromProperEuler:Wd,normalize:pt,denormalize:Rn};class le{constructor(e=0,t=0){le.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=et(this.x,e.x,t.x),this.y=et(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=et(this.x,e,t),this.y=et(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(et(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(et(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),i=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*i+e.x,this.y=r*i+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class bn{constructor(e=0,t=0,n=0,i=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=i}static slerpFlat(e,t,n,i,r,o,a){let c=n[i+0],l=n[i+1],h=n[i+2],u=n[i+3];const f=r[o+0],d=r[o+1],m=r[o+2],x=r[o+3];if(a===0){e[t+0]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u;return}if(a===1){e[t+0]=f,e[t+1]=d,e[t+2]=m,e[t+3]=x;return}if(u!==x||c!==f||l!==d||h!==m){let g=1-a;const p=c*f+l*d+h*m+u*x,M=p>=0?1:-1,v=1-p*p;if(v>Number.EPSILON){const w=Math.sqrt(v),b=Math.atan2(w,p*M);g=Math.sin(g*b)/w,a=Math.sin(a*b)/w}const _=a*M;if(c=c*g+f*_,l=l*g+d*_,h=h*g+m*_,u=u*g+x*_,g===1-a){const w=1/Math.sqrt(c*c+l*l+h*h+u*u);c*=w,l*=w,h*=w,u*=w}}e[t]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,i,r,o){const a=n[i],c=n[i+1],l=n[i+2],h=n[i+3],u=r[o],f=r[o+1],d=r[o+2],m=r[o+3];return e[t]=a*m+h*u+c*d-l*f,e[t+1]=c*m+h*f+l*u-a*d,e[t+2]=l*m+h*d+a*f-c*u,e[t+3]=h*m-a*u-c*f-l*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,i=e._y,r=e._z,o=e._order,a=Math.cos,c=Math.sin,l=a(n/2),h=a(i/2),u=a(r/2),f=c(n/2),d=c(i/2),m=c(r/2);switch(o){case"XYZ":this._x=f*h*u+l*d*m,this._y=l*d*u-f*h*m,this._z=l*h*m+f*d*u,this._w=l*h*u-f*d*m;break;case"YXZ":this._x=f*h*u+l*d*m,this._y=l*d*u-f*h*m,this._z=l*h*m-f*d*u,this._w=l*h*u+f*d*m;break;case"ZXY":this._x=f*h*u-l*d*m,this._y=l*d*u+f*h*m,this._z=l*h*m+f*d*u,this._w=l*h*u-f*d*m;break;case"ZYX":this._x=f*h*u-l*d*m,this._y=l*d*u+f*h*m,this._z=l*h*m-f*d*u,this._w=l*h*u+f*d*m;break;case"YZX":this._x=f*h*u+l*d*m,this._y=l*d*u+f*h*m,this._z=l*h*m-f*d*u,this._w=l*h*u-f*d*m;break;case"XZY":this._x=f*h*u-l*d*m,this._y=l*d*u-f*h*m,this._z=l*h*m+f*d*u,this._w=l*h*u+f*d*m;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],i=t[4],r=t[8],o=t[1],a=t[5],c=t[9],l=t[2],h=t[6],u=t[10],f=n+a+u;if(f>0){const d=.5/Math.sqrt(f+1);this._w=.25/d,this._x=(h-c)*d,this._y=(r-l)*d,this._z=(o-i)*d}else if(n>a&&n>u){const d=2*Math.sqrt(1+n-a-u);this._w=(h-c)/d,this._x=.25*d,this._y=(i+o)/d,this._z=(r+l)/d}else if(a>u){const d=2*Math.sqrt(1+a-n-u);this._w=(r-l)/d,this._x=(i+o)/d,this._y=.25*d,this._z=(c+h)/d}else{const d=2*Math.sqrt(1+u-n-a);this._w=(o-i)/d,this._x=(r+l)/d,this._y=(c+h)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(et(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,i=e._y,r=e._z,o=e._w,a=t._x,c=t._y,l=t._z,h=t._w;return this._x=n*h+o*a+i*l-r*c,this._y=i*h+o*c+r*a-n*l,this._z=r*h+o*l+n*c-i*a,this._w=o*h-n*a-i*c-r*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,i=this._y,r=this._z,o=this._w;let a=o*e._w+n*e._x+i*e._y+r*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=n,this._y=i,this._z=r,this;const c=1-a*a;if(c<=Number.EPSILON){const d=1-t;return this._w=d*o+t*this._w,this._x=d*n+t*this._x,this._y=d*i+t*this._y,this._z=d*r+t*this._z,this.normalize(),this}const l=Math.sqrt(c),h=Math.atan2(l,a),u=Math.sin((1-t)*h)/l,f=Math.sin(t*h)/l;return this._w=o*u+this._w*f,this._x=n*u+this._x*f,this._y=i*u+this._y*f,this._z=r*u+this._z*f,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),i=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(i*Math.sin(e),i*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class C{constructor(e=0,t=0,n=0){C.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Hl.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Hl.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*i,this.y=r[1]*t+r[4]*n+r[7]*i,this.z=r[2]*t+r[5]*n+r[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*i+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*i+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*i+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*i+r[14])*o,this}applyQuaternion(e){const t=this.x,n=this.y,i=this.z,r=e.x,o=e.y,a=e.z,c=e.w,l=2*(o*i-a*n),h=2*(a*t-r*i),u=2*(r*n-o*t);return this.x=t+c*l+o*u-a*h,this.y=n+c*h+a*l-r*u,this.z=i+c*u+r*h-o*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,i=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*i,this.y=r[1]*t+r[5]*n+r[9]*i,this.z=r[2]*t+r[6]*n+r[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=et(this.x,e.x,t.x),this.y=et(this.y,e.y,t.y),this.z=et(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=et(this.x,e,t),this.y=et(this.y,e,t),this.z=et(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(et(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,i=e.y,r=e.z,o=t.x,a=t.y,c=t.z;return this.x=i*c-r*a,this.y=r*o-n*c,this.z=n*a-i*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Go.copy(this).projectOnVector(e),this.sub(Go)}reflect(e){return this.sub(Go.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(et(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Go=new C,Hl=new bn;class $e{constructor(e,t,n,i,r,o,a,c,l){$e.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,i,r,o,a,c,l)}set(e,t,n,i,r,o,a,c,l){const h=this.elements;return h[0]=e,h[1]=i,h[2]=a,h[3]=t,h[4]=r,h[5]=c,h[6]=n,h[7]=o,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,r=this.elements,o=n[0],a=n[3],c=n[6],l=n[1],h=n[4],u=n[7],f=n[2],d=n[5],m=n[8],x=i[0],g=i[3],p=i[6],M=i[1],v=i[4],_=i[7],w=i[2],b=i[5],y=i[8];return r[0]=o*x+a*M+c*w,r[3]=o*g+a*v+c*b,r[6]=o*p+a*_+c*y,r[1]=l*x+h*M+u*w,r[4]=l*g+h*v+u*b,r[7]=l*p+h*_+u*y,r[2]=f*x+d*M+m*w,r[5]=f*g+d*v+m*b,r[8]=f*p+d*_+m*y,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8];return t*o*h-t*a*l-n*r*h+n*a*c+i*r*l-i*o*c}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8],u=h*o-a*l,f=a*c-h*r,d=l*r-o*c,m=t*u+n*f+i*d;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/m;return e[0]=u*x,e[1]=(i*l-h*n)*x,e[2]=(a*n-i*o)*x,e[3]=f*x,e[4]=(h*t-i*c)*x,e[5]=(i*r-a*t)*x,e[6]=d*x,e[7]=(n*c-l*t)*x,e[8]=(o*t-n*r)*x,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,r,o,a){const c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*o+l*a)+o+e,-i*l,i*c,-i*(-l*o+c*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(Wo.makeScale(e,t)),this}rotate(e){return this.premultiply(Wo.makeRotation(-e)),this}translate(e,t){return this.premultiply(Wo.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Wo=new $e;function Vu(s){for(let e=s.length-1;e>=0;--e)if(s[e]>=65535)return!0;return!1}function xr(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function qd(){const s=xr("canvas");return s.style.display="block",s}const Vl={};function vr(s){s in Vl||(Vl[s]=!0,console.warn(s))}function Yd(s,e,t){return new Promise(function(n,i){function r(){switch(s.clientWaitSync(e,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:i();break;case s.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}const Gl=new $e().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Wl=new $e().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function jd(){const s={enabled:!0,workingColorSpace:nn,spaces:{},convert:function(i,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===xt&&(i.r=ri(i.r),i.g=ri(i.g),i.b=ri(i.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(i.applyMatrix3(this.spaces[r].toXYZ),i.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===xt&&(i.r=bs(i.r),i.g=bs(i.g),i.b=bs(i.b))),i},workingToColorSpace:function(i,r){return this.convert(i,this.workingColorSpace,r)},colorSpaceToWorking:function(i,r){return this.convert(i,r,this.workingColorSpace)},getPrimaries:function(i){return this.spaces[i].primaries},getTransfer:function(i){return i===ni?Mo:this.spaces[i].transfer},getToneMappingMode:function(i){return this.spaces[i].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(i,r=this.workingColorSpace){return i.fromArray(this.spaces[r].luminanceCoefficients)},define:function(i){Object.assign(this.spaces,i)},_getMatrix:function(i,r,o){return i.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(i){return this.spaces[i].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(i=this.workingColorSpace){return this.spaces[i].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(i,r){return vr("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),s.workingToColorSpace(i,r)},toWorkingColorSpace:function(i,r){return vr("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),s.colorSpaceToWorking(i,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return s.define({[nn]:{primaries:e,whitePoint:n,transfer:Mo,toXYZ:Gl,fromXYZ:Wl,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Ut},outputColorSpaceConfig:{drawingBufferColorSpace:Ut}},[Ut]:{primaries:e,whitePoint:n,transfer:xt,toXYZ:Gl,fromXYZ:Wl,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Ut}}}),s}const rt=jd();function ri(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function bs(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}let Qi;class Kd{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Qi===void 0&&(Qi=xr("canvas")),Qi.width=e.width,Qi.height=e.height;const i=Qi.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),n=Qi}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=xr("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const i=n.getImageData(0,0,e.width,e.height),r=i.data;for(let o=0;o<r.length;o++)r[o]=ri(r[o]/255)*255;return n.putImageData(i,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(ri(t[n]/255)*255):t[n]=ri(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Zd=0;class qc{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Zd++}),this.uuid=Mn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let r;if(Array.isArray(i)){r=[];for(let o=0,a=i.length;o<a;o++)i[o].isDataTexture?r.push(Xo(i[o].image)):r.push(Xo(i[o]))}else r=Xo(i);n.url=r}return t||(e.images[this.uuid]=n),n}}function Xo(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?Kd.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let $d=0;const qo=new C;class Ft extends zs{constructor(e=Ft.DEFAULT_IMAGE,t=Ft.DEFAULT_MAPPING,n=Pn,i=Pn,r=on,o=Vn,a=fn,c=Xn,l=Ft.DEFAULT_ANISOTROPY,h=ni){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:$d++}),this.uuid=Mn(),this.name="",this.source=new qc(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=r,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new le(0,0),this.repeat=new le(1,1),this.center=new le(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new $e,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(qo).x}get height(){return this.source.getSize(qo).y}get depth(){return this.source.getSize(qo).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){console.warn(`THREE.Texture.setValues(): property '${t}' does not exist.`);continue}i&&n&&i.isVector2&&n.isVector2||i&&n&&i.isVector3&&n.isVector3||i&&n&&i.isMatrix3&&n.isMatrix3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Cu)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case ci:e.x=e.x-Math.floor(e.x);break;case Pn:e.x=e.x<0?0:1;break;case yo:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case ci:e.y=e.y-Math.floor(e.y);break;case Pn:e.y=e.y<0?0:1;break;case yo:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Ft.DEFAULT_IMAGE=null;Ft.DEFAULT_MAPPING=Cu;Ft.DEFAULT_ANISOTROPY=1;class at{constructor(e=0,t=0,n=0,i=1){at.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,i=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*i+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*i+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*i+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*i+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,r;const c=e.elements,l=c[0],h=c[4],u=c[8],f=c[1],d=c[5],m=c[9],x=c[2],g=c[6],p=c[10];if(Math.abs(h-f)<.01&&Math.abs(u-x)<.01&&Math.abs(m-g)<.01){if(Math.abs(h+f)<.1&&Math.abs(u+x)<.1&&Math.abs(m+g)<.1&&Math.abs(l+d+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const v=(l+1)/2,_=(d+1)/2,w=(p+1)/2,b=(h+f)/4,y=(u+x)/4,A=(m+g)/4;return v>_&&v>w?v<.01?(n=0,i=.707106781,r=.707106781):(n=Math.sqrt(v),i=b/n,r=y/n):_>w?_<.01?(n=.707106781,i=0,r=.707106781):(i=Math.sqrt(_),n=b/i,r=A/i):w<.01?(n=.707106781,i=.707106781,r=0):(r=Math.sqrt(w),n=y/r,i=A/r),this.set(n,i,r,t),this}let M=Math.sqrt((g-m)*(g-m)+(u-x)*(u-x)+(f-h)*(f-h));return Math.abs(M)<.001&&(M=1),this.x=(g-m)/M,this.y=(u-x)/M,this.z=(f-h)/M,this.w=Math.acos((l+d+p-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=et(this.x,e.x,t.x),this.y=et(this.y,e.y,t.y),this.z=et(this.z,e.z,t.z),this.w=et(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=et(this.x,e,t),this.y=et(this.y,e,t),this.z=et(this.z,e,t),this.w=et(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(et(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Jd extends zs{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:on,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new at(0,0,e,t),this.scissorTest=!1,this.viewport=new at(0,0,e,t);const i={width:e,height:t,depth:n.depth},r=new Ft(i);this.textures=[];const o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview}_setTextureOptions(e={}){const t={minFilter:on,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let i=0,r=this.textures.length;i<r;i++)this.textures[i].image.width=e,this.textures[i].image.height=t,this.textures[i].image.depth=n,this.textures[i].isArrayTexture=this.textures[i].image.depth>1;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const i=Object.assign({},e.textures[t].image);this.textures[t].source=new qc(i)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Dn extends Jd{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Gu extends Ft{constructor(e=null,t=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=tn,this.minFilter=tn,this.wrapR=Pn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Qd extends Ft{constructor(e=null,t=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:i},this.magFilter=tn,this.minFilter=tn,this.wrapR=Pn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class fi{constructor(e=new C(1/0,1/0,1/0),t=new C(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Tn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Tn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=Tn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Tn):Tn.fromBufferAttribute(r,o),Tn.applyMatrix4(e.matrixWorld),this.expandByPoint(Tn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Pr.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Pr.copy(n.boundingBox)),Pr.applyMatrix4(e.matrixWorld),this.union(Pr)}const i=e.children;for(let r=0,o=i.length;r<o;r++)this.expandByObject(i[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Tn),Tn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Ws),Lr.subVectors(this.max,Ws),es.subVectors(e.a,Ws),ts.subVectors(e.b,Ws),ns.subVectors(e.c,Ws),di.subVectors(ts,es),pi.subVectors(ns,ts),Pi.subVectors(es,ns);let t=[0,-di.z,di.y,0,-pi.z,pi.y,0,-Pi.z,Pi.y,di.z,0,-di.x,pi.z,0,-pi.x,Pi.z,0,-Pi.x,-di.y,di.x,0,-pi.y,pi.x,0,-Pi.y,Pi.x,0];return!Yo(t,es,ts,ns,Lr)||(t=[1,0,0,0,1,0,0,0,1],!Yo(t,es,ts,ns,Lr))?!1:(Ir.crossVectors(di,pi),t=[Ir.x,Ir.y,Ir.z],Yo(t,es,ts,ns,Lr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Tn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Tn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Kn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Kn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Kn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Kn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Kn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Kn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Kn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Kn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Kn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Kn=[new C,new C,new C,new C,new C,new C,new C,new C],Tn=new C,Pr=new fi,es=new C,ts=new C,ns=new C,di=new C,pi=new C,Pi=new C,Ws=new C,Lr=new C,Ir=new C,Li=new C;function Yo(s,e,t,n,i){for(let r=0,o=s.length-3;r<=o;r+=3){Li.fromArray(s,r);const a=i.x*Math.abs(Li.x)+i.y*Math.abs(Li.y)+i.z*Math.abs(Li.z),c=e.dot(Li),l=t.dot(Li),h=n.dot(Li);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>a)return!1}return!0}const ep=new fi,Xs=new C,jo=new C;class qn{constructor(e=new C,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):ep.setFromPoints(e).getCenter(n);let i=0;for(let r=0,o=e.length;r<o;r++)i=Math.max(i,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Xs.subVectors(e,this.center);const t=Xs.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.addScaledVector(Xs,i/n),this.radius+=i}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(jo.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Xs.copy(e.center).add(jo)),this.expandByPoint(Xs.copy(e.center).sub(jo))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const Zn=new C,Ko=new C,Dr=new C,mi=new C,Zo=new C,Ur=new C,$o=new C;class br{constructor(e=new C,t=new C(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Zn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Zn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Zn.copy(this.origin).addScaledVector(this.direction,t),Zn.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){Ko.copy(e).add(t).multiplyScalar(.5),Dr.copy(t).sub(e).normalize(),mi.copy(this.origin).sub(Ko);const r=e.distanceTo(t)*.5,o=-this.direction.dot(Dr),a=mi.dot(this.direction),c=-mi.dot(Dr),l=mi.lengthSq(),h=Math.abs(1-o*o);let u,f,d,m;if(h>0)if(u=o*c-a,f=o*a-c,m=r*h,u>=0)if(f>=-m)if(f<=m){const x=1/h;u*=x,f*=x,d=u*(u+o*f+2*a)+f*(o*u+f+2*c)+l}else f=r,u=Math.max(0,-(o*f+a)),d=-u*u+f*(f+2*c)+l;else f=-r,u=Math.max(0,-(o*f+a)),d=-u*u+f*(f+2*c)+l;else f<=-m?(u=Math.max(0,-(-o*r+a)),f=u>0?-r:Math.min(Math.max(-r,-c),r),d=-u*u+f*(f+2*c)+l):f<=m?(u=0,f=Math.min(Math.max(-r,-c),r),d=f*(f+2*c)+l):(u=Math.max(0,-(o*r+a)),f=u>0?r:Math.min(Math.max(-r,-c),r),d=-u*u+f*(f+2*c)+l);else f=o>0?-r:r,u=Math.max(0,-(o*f+a)),d=-u*u+f*(f+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,u),i&&i.copy(Ko).addScaledVector(Dr,f),d}intersectSphere(e,t){Zn.subVectors(e.center,this.origin);const n=Zn.dot(this.direction),i=Zn.dot(Zn)-n*n,r=e.radius*e.radius;if(i>r)return null;const o=Math.sqrt(r-i),a=n-o,c=n+o;return c<0?null:a<0?this.at(c,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,r,o,a,c;const l=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,f=this.origin;return l>=0?(n=(e.min.x-f.x)*l,i=(e.max.x-f.x)*l):(n=(e.max.x-f.x)*l,i=(e.min.x-f.x)*l),h>=0?(r=(e.min.y-f.y)*h,o=(e.max.y-f.y)*h):(r=(e.max.y-f.y)*h,o=(e.min.y-f.y)*h),n>o||r>i||((r>n||isNaN(n))&&(n=r),(o<i||isNaN(i))&&(i=o),u>=0?(a=(e.min.z-f.z)*u,c=(e.max.z-f.z)*u):(a=(e.max.z-f.z)*u,c=(e.min.z-f.z)*u),n>c||a>i)||((a>n||n!==n)&&(n=a),(c<i||i!==i)&&(i=c),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,Zn)!==null}intersectTriangle(e,t,n,i,r){Zo.subVectors(t,e),Ur.subVectors(n,e),$o.crossVectors(Zo,Ur);let o=this.direction.dot($o),a;if(o>0){if(i)return null;a=1}else if(o<0)a=-1,o=-o;else return null;mi.subVectors(this.origin,e);const c=a*this.direction.dot(Ur.crossVectors(mi,Ur));if(c<0)return null;const l=a*this.direction.dot(Zo.cross(mi));if(l<0||c+l>o)return null;const h=-a*mi.dot($o);return h<0?null:this.at(h/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class qe{constructor(e,t,n,i,r,o,a,c,l,h,u,f,d,m,x,g){qe.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,i,r,o,a,c,l,h,u,f,d,m,x,g)}set(e,t,n,i,r,o,a,c,l,h,u,f,d,m,x,g){const p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=i,p[1]=r,p[5]=o,p[9]=a,p[13]=c,p[2]=l,p[6]=h,p[10]=u,p[14]=f,p[3]=d,p[7]=m,p[11]=x,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new qe().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,i=1/is.setFromMatrixColumn(e,0).length(),r=1/is.setFromMatrixColumn(e,1).length(),o=1/is.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,i=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),c=Math.cos(i),l=Math.sin(i),h=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){const f=o*h,d=o*u,m=a*h,x=a*u;t[0]=c*h,t[4]=-c*u,t[8]=l,t[1]=d+m*l,t[5]=f-x*l,t[9]=-a*c,t[2]=x-f*l,t[6]=m+d*l,t[10]=o*c}else if(e.order==="YXZ"){const f=c*h,d=c*u,m=l*h,x=l*u;t[0]=f+x*a,t[4]=m*a-d,t[8]=o*l,t[1]=o*u,t[5]=o*h,t[9]=-a,t[2]=d*a-m,t[6]=x+f*a,t[10]=o*c}else if(e.order==="ZXY"){const f=c*h,d=c*u,m=l*h,x=l*u;t[0]=f-x*a,t[4]=-o*u,t[8]=m+d*a,t[1]=d+m*a,t[5]=o*h,t[9]=x-f*a,t[2]=-o*l,t[6]=a,t[10]=o*c}else if(e.order==="ZYX"){const f=o*h,d=o*u,m=a*h,x=a*u;t[0]=c*h,t[4]=m*l-d,t[8]=f*l+x,t[1]=c*u,t[5]=x*l+f,t[9]=d*l-m,t[2]=-l,t[6]=a*c,t[10]=o*c}else if(e.order==="YZX"){const f=o*c,d=o*l,m=a*c,x=a*l;t[0]=c*h,t[4]=x-f*u,t[8]=m*u+d,t[1]=u,t[5]=o*h,t[9]=-a*h,t[2]=-l*h,t[6]=d*u+m,t[10]=f-x*u}else if(e.order==="XZY"){const f=o*c,d=o*l,m=a*c,x=a*l;t[0]=c*h,t[4]=-u,t[8]=l*h,t[1]=f*u+x,t[5]=o*h,t[9]=d*u-m,t[2]=m*u-d,t[6]=a*h,t[10]=x*u+f}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(tp,e,np)}lookAt(e,t,n){const i=this.elements;return hn.subVectors(e,t),hn.lengthSq()===0&&(hn.z=1),hn.normalize(),gi.crossVectors(n,hn),gi.lengthSq()===0&&(Math.abs(n.z)===1?hn.x+=1e-4:hn.z+=1e-4,hn.normalize(),gi.crossVectors(n,hn)),gi.normalize(),Nr.crossVectors(hn,gi),i[0]=gi.x,i[4]=Nr.x,i[8]=hn.x,i[1]=gi.y,i[5]=Nr.y,i[9]=hn.y,i[2]=gi.z,i[6]=Nr.z,i[10]=hn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,i=t.elements,r=this.elements,o=n[0],a=n[4],c=n[8],l=n[12],h=n[1],u=n[5],f=n[9],d=n[13],m=n[2],x=n[6],g=n[10],p=n[14],M=n[3],v=n[7],_=n[11],w=n[15],b=i[0],y=i[4],A=i[8],T=i[12],S=i[1],L=i[5],D=i[9],z=i[13],N=i[2],F=i[6],V=i[10],G=i[14],B=i[3],$=i[7],fe=i[11],ce=i[15];return r[0]=o*b+a*S+c*N+l*B,r[4]=o*y+a*L+c*F+l*$,r[8]=o*A+a*D+c*V+l*fe,r[12]=o*T+a*z+c*G+l*ce,r[1]=h*b+u*S+f*N+d*B,r[5]=h*y+u*L+f*F+d*$,r[9]=h*A+u*D+f*V+d*fe,r[13]=h*T+u*z+f*G+d*ce,r[2]=m*b+x*S+g*N+p*B,r[6]=m*y+x*L+g*F+p*$,r[10]=m*A+x*D+g*V+p*fe,r[14]=m*T+x*z+g*G+p*ce,r[3]=M*b+v*S+_*N+w*B,r[7]=M*y+v*L+_*F+w*$,r[11]=M*A+v*D+_*V+w*fe,r[15]=M*T+v*z+_*G+w*ce,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],i=e[8],r=e[12],o=e[1],a=e[5],c=e[9],l=e[13],h=e[2],u=e[6],f=e[10],d=e[14],m=e[3],x=e[7],g=e[11],p=e[15];return m*(+r*c*u-i*l*u-r*a*f+n*l*f+i*a*d-n*c*d)+x*(+t*c*d-t*l*f+r*o*f-i*o*d+i*l*h-r*c*h)+g*(+t*l*u-t*a*d-r*o*u+n*o*d+r*a*h-n*l*h)+p*(-i*a*h-t*c*u+t*a*f+i*o*u-n*o*f+n*c*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],i=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8],u=e[9],f=e[10],d=e[11],m=e[12],x=e[13],g=e[14],p=e[15],M=u*g*l-x*f*l+x*c*d-a*g*d-u*c*p+a*f*p,v=m*f*l-h*g*l-m*c*d+o*g*d+h*c*p-o*f*p,_=h*x*l-m*u*l+m*a*d-o*x*d-h*a*p+o*u*p,w=m*u*c-h*x*c-m*a*f+o*x*f+h*a*g-o*u*g,b=t*M+n*v+i*_+r*w;if(b===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const y=1/b;return e[0]=M*y,e[1]=(x*f*r-u*g*r-x*i*d+n*g*d+u*i*p-n*f*p)*y,e[2]=(a*g*r-x*c*r+x*i*l-n*g*l-a*i*p+n*c*p)*y,e[3]=(u*c*r-a*f*r-u*i*l+n*f*l+a*i*d-n*c*d)*y,e[4]=v*y,e[5]=(h*g*r-m*f*r+m*i*d-t*g*d-h*i*p+t*f*p)*y,e[6]=(m*c*r-o*g*r-m*i*l+t*g*l+o*i*p-t*c*p)*y,e[7]=(o*f*r-h*c*r+h*i*l-t*f*l-o*i*d+t*c*d)*y,e[8]=_*y,e[9]=(m*u*r-h*x*r-m*n*d+t*x*d+h*n*p-t*u*p)*y,e[10]=(o*x*r-m*a*r+m*n*l-t*x*l-o*n*p+t*a*p)*y,e[11]=(h*a*r-o*u*r-h*n*l+t*u*l+o*n*d-t*a*d)*y,e[12]=w*y,e[13]=(h*x*i-m*u*i+m*n*f-t*x*f-h*n*g+t*u*g)*y,e[14]=(m*a*i-o*x*i-m*n*c+t*x*c+o*n*g-t*a*g)*y,e[15]=(o*u*i-h*a*i+h*n*c-t*u*c-o*n*f+t*a*f)*y,this}scale(e){const t=this.elements,n=e.x,i=e.y,r=e.z;return t[0]*=n,t[4]*=i,t[8]*=r,t[1]*=n,t[5]*=i,t[9]*=r,t[2]*=n,t[6]*=i,t[10]*=r,t[3]*=n,t[7]*=i,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),i=Math.sin(t),r=1-n,o=e.x,a=e.y,c=e.z,l=r*o,h=r*a;return this.set(l*o+n,l*a-i*c,l*c+i*a,0,l*a+i*c,h*a+n,h*c-i*o,0,l*c-i*a,h*c+i*o,r*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,i,r,o){return this.set(1,n,r,0,e,1,o,0,t,i,1,0,0,0,0,1),this}compose(e,t,n){const i=this.elements,r=t._x,o=t._y,a=t._z,c=t._w,l=r+r,h=o+o,u=a+a,f=r*l,d=r*h,m=r*u,x=o*h,g=o*u,p=a*u,M=c*l,v=c*h,_=c*u,w=n.x,b=n.y,y=n.z;return i[0]=(1-(x+p))*w,i[1]=(d+_)*w,i[2]=(m-v)*w,i[3]=0,i[4]=(d-_)*b,i[5]=(1-(f+p))*b,i[6]=(g+M)*b,i[7]=0,i[8]=(m+v)*y,i[9]=(g-M)*y,i[10]=(1-(f+x))*y,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){const i=this.elements;let r=is.set(i[0],i[1],i[2]).length();const o=is.set(i[4],i[5],i[6]).length(),a=is.set(i[8],i[9],i[10]).length();this.determinant()<0&&(r=-r),e.x=i[12],e.y=i[13],e.z=i[14],En.copy(this);const l=1/r,h=1/o,u=1/a;return En.elements[0]*=l,En.elements[1]*=l,En.elements[2]*=l,En.elements[4]*=h,En.elements[5]*=h,En.elements[6]*=h,En.elements[8]*=u,En.elements[9]*=u,En.elements[10]*=u,t.setFromRotationMatrix(En),n.x=r,n.y=o,n.z=a,this}makePerspective(e,t,n,i,r,o,a=Gn,c=!1){const l=this.elements,h=2*r/(t-e),u=2*r/(n-i),f=(t+e)/(t-e),d=(n+i)/(n-i);let m,x;if(c)m=r/(o-r),x=o*r/(o-r);else if(a===Gn)m=-(o+r)/(o-r),x=-2*o*r/(o-r);else if(a===wo)m=-o/(o-r),x=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return l[0]=h,l[4]=0,l[8]=f,l[12]=0,l[1]=0,l[5]=u,l[9]=d,l[13]=0,l[2]=0,l[6]=0,l[10]=m,l[14]=x,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,i,r,o,a=Gn,c=!1){const l=this.elements,h=2/(t-e),u=2/(n-i),f=-(t+e)/(t-e),d=-(n+i)/(n-i);let m,x;if(c)m=1/(o-r),x=o/(o-r);else if(a===Gn)m=-2/(o-r),x=-(o+r)/(o-r);else if(a===wo)m=-1/(o-r),x=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return l[0]=h,l[4]=0,l[8]=0,l[12]=f,l[1]=0,l[5]=u,l[9]=0,l[13]=d,l[2]=0,l[6]=0,l[10]=m,l[14]=x,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const is=new C,En=new qe,tp=new C(0,0,0),np=new C(1,1,1),gi=new C,Nr=new C,hn=new C,Xl=new qe,ql=new bn;class wn{constructor(e=0,t=0,n=0,i=wn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i=this._order){return this._x=e,this._y=t,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const i=e.elements,r=i[0],o=i[4],a=i[8],c=i[1],l=i[5],h=i[9],u=i[2],f=i[6],d=i[10];switch(t){case"XYZ":this._y=Math.asin(et(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,d),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(f,l),this._z=0);break;case"YXZ":this._x=Math.asin(-et(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,d),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(et(f,-1,1)),Math.abs(f)<.9999999?(this._y=Math.atan2(-u,d),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-et(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(f,d),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(et(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,d));break;case"XZY":this._z=Math.asin(-et(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(f,l),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,d),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Xl.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Xl,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return ql.setFromEuler(this),this.setFromQuaternion(ql,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}wn.DEFAULT_ORDER="XYZ";class Yc{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let ip=0;const Yl=new C,ss=new bn,$n=new qe,zr=new C,qs=new C,sp=new C,rp=new bn,jl=new C(1,0,0),Kl=new C(0,1,0),Zl=new C(0,0,1),$l={type:"added"},op={type:"removed"},rs={type:"childadded",child:null},Jo={type:"childremoved",child:null};class ut extends zs{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:ip++}),this.uuid=Mn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=ut.DEFAULT_UP.clone();const e=new C,t=new wn,n=new bn,i=new C(1,1,1);function r(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new qe},normalMatrix:{value:new $e}}),this.matrix=new qe,this.matrixWorld=new qe,this.matrixAutoUpdate=ut.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=ut.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Yc,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ss.setFromAxisAngle(e,t),this.quaternion.multiply(ss),this}rotateOnWorldAxis(e,t){return ss.setFromAxisAngle(e,t),this.quaternion.premultiply(ss),this}rotateX(e){return this.rotateOnAxis(jl,e)}rotateY(e){return this.rotateOnAxis(Kl,e)}rotateZ(e){return this.rotateOnAxis(Zl,e)}translateOnAxis(e,t){return Yl.copy(e).applyQuaternion(this.quaternion),this.position.add(Yl.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(jl,e)}translateY(e){return this.translateOnAxis(Kl,e)}translateZ(e){return this.translateOnAxis(Zl,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4($n.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?zr.copy(e):zr.set(e,t,n);const i=this.parent;this.updateWorldMatrix(!0,!1),qs.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?$n.lookAt(qs,zr,this.up):$n.lookAt(zr,qs,this.up),this.quaternion.setFromRotationMatrix($n),i&&($n.extractRotation(i.matrixWorld),ss.setFromRotationMatrix($n),this.quaternion.premultiply(ss.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent($l),rs.child=e,this.dispatchEvent(rs),rs.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(op),Jo.child=e,this.dispatchEvent(Jo),Jo.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),$n.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),$n.multiply(e.parent.matrixWorld)),e.applyMatrix4($n),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent($l),rs.child=e,this.dispatchEvent(rs),rs.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){const o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const i=this.children;for(let r=0,o=i.length;r<o;r++)i[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(qs,e,sp),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(qs,rp,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const i=this.children;for(let r=0,o=i.length;r<o;r++)i[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),i.instanceInfo=this._instanceInfo.map(a=>({...a})),i.availableInstanceIds=this._availableInstanceIds.slice(),i.availableGeometryIds=this._availableGeometryIds.slice(),i.nextIndexStart=this._nextIndexStart,i.nextVertexStart=this._nextVertexStart,i.geometryCount=this._geometryCount,i.maxInstanceCount=this._maxInstanceCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.matricesTexture=this._matricesTexture.toJSON(e),i.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(i.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(i.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(i.boundingBox=this.boundingBox.toJSON()));function r(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=r(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const c=a.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){const u=c[l];r(e.shapes,u)}else r(e.shapes,c)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(r(e.materials,this.material[c]));i.material=a}else i.material=r(e.materials,this.material);if(this.children.length>0){i.children=[];for(let a=0;a<this.children.length;a++)i.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let a=0;a<this.animations.length;a++){const c=this.animations[a];i.animations.push(r(e.animations,c))}}if(t){const a=o(e.geometries),c=o(e.materials),l=o(e.textures),h=o(e.images),u=o(e.shapes),f=o(e.skeletons),d=o(e.animations),m=o(e.nodes);a.length>0&&(n.geometries=a),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),f.length>0&&(n.skeletons=f),d.length>0&&(n.animations=d),m.length>0&&(n.nodes=m)}return n.object=i,n;function o(a){const c=[];for(const l in a){const h=a[l];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const i=e.children[n];this.add(i.clone())}return this}}ut.DEFAULT_UP=new C(0,1,0);ut.DEFAULT_MATRIX_AUTO_UPDATE=!0;ut.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const An=new C,Jn=new C,Qo=new C,Qn=new C,os=new C,as=new C,Jl=new C,ea=new C,ta=new C,na=new C,ia=new at,sa=new at,ra=new at;class Cn{constructor(e=new C,t=new C,n=new C){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i.subVectors(n,t),An.subVectors(e,t),i.cross(An);const r=i.lengthSq();return r>0?i.multiplyScalar(1/Math.sqrt(r)):i.set(0,0,0)}static getBarycoord(e,t,n,i,r){An.subVectors(i,t),Jn.subVectors(n,t),Qo.subVectors(e,t);const o=An.dot(An),a=An.dot(Jn),c=An.dot(Qo),l=Jn.dot(Jn),h=Jn.dot(Qo),u=o*l-a*a;if(u===0)return r.set(0,0,0),null;const f=1/u,d=(l*c-a*h)*f,m=(o*h-a*c)*f;return r.set(1-d-m,m,d)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,Qn)===null?!1:Qn.x>=0&&Qn.y>=0&&Qn.x+Qn.y<=1}static getInterpolation(e,t,n,i,r,o,a,c){return this.getBarycoord(e,t,n,i,Qn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,Qn.x),c.addScaledVector(o,Qn.y),c.addScaledVector(a,Qn.z),c)}static getInterpolatedAttribute(e,t,n,i,r,o){return ia.setScalar(0),sa.setScalar(0),ra.setScalar(0),ia.fromBufferAttribute(e,t),sa.fromBufferAttribute(e,n),ra.fromBufferAttribute(e,i),o.setScalar(0),o.addScaledVector(ia,r.x),o.addScaledVector(sa,r.y),o.addScaledVector(ra,r.z),o}static isFrontFacing(e,t,n,i){return An.subVectors(n,t),Jn.subVectors(e,t),An.cross(Jn).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}setFromAttributeAndIndices(e,t,n,i){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,i),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return An.subVectors(this.c,this.b),Jn.subVectors(this.a,this.b),An.cross(Jn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Cn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Cn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,i,r){return Cn.getInterpolation(e,this.a,this.b,this.c,t,n,i,r)}containsPoint(e){return Cn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Cn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,i=this.b,r=this.c;let o,a;os.subVectors(i,n),as.subVectors(r,n),ea.subVectors(e,n);const c=os.dot(ea),l=as.dot(ea);if(c<=0&&l<=0)return t.copy(n);ta.subVectors(e,i);const h=os.dot(ta),u=as.dot(ta);if(h>=0&&u<=h)return t.copy(i);const f=c*u-h*l;if(f<=0&&c>=0&&h<=0)return o=c/(c-h),t.copy(n).addScaledVector(os,o);na.subVectors(e,r);const d=os.dot(na),m=as.dot(na);if(m>=0&&d<=m)return t.copy(r);const x=d*l-c*m;if(x<=0&&l>=0&&m<=0)return a=l/(l-m),t.copy(n).addScaledVector(as,a);const g=h*m-d*u;if(g<=0&&u-h>=0&&d-m>=0)return Jl.subVectors(r,i),a=(u-h)/(u-h+(d-m)),t.copy(i).addScaledVector(Jl,a);const p=1/(g+x+f);return o=x*p,a=f*p,t.copy(n).addScaledVector(os,o).addScaledVector(as,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const Wu={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},xi={h:0,s:0,l:0},Fr={h:0,s:0,l:0};function oa(s,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?s+(e-s)*6*t:t<1/2?e:t<2/3?s+(e-s)*6*(2/3-t):s}class Me{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const i=e;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Ut){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,rt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,i=rt.workingColorSpace){return this.r=e,this.g=t,this.b=n,rt.colorSpaceToWorking(this,i),this}setHSL(e,t,n,i=rt.workingColorSpace){if(e=Xc(e,1),t=et(t,0,1),n=et(n,0,1),t===0)this.r=this.g=this.b=n;else{const r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=oa(o,r,e+1/3),this.g=oa(o,r,e),this.b=oa(o,r,e-1/3)}return rt.colorSpaceToWorking(this,i),this}setStyle(e,t=Ut){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const o=i[1],a=i[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=i[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Ut){const n=Wu[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=ri(e.r),this.g=ri(e.g),this.b=ri(e.b),this}copyLinearToSRGB(e){return this.r=bs(e.r),this.g=bs(e.g),this.b=bs(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Ut){return rt.workingToColorSpace(jt.copy(this),e),Math.round(et(jt.r*255,0,255))*65536+Math.round(et(jt.g*255,0,255))*256+Math.round(et(jt.b*255,0,255))}getHexString(e=Ut){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=rt.workingColorSpace){rt.workingToColorSpace(jt.copy(this),t);const n=jt.r,i=jt.g,r=jt.b,o=Math.max(n,i,r),a=Math.min(n,i,r);let c,l;const h=(a+o)/2;if(a===o)c=0,l=0;else{const u=o-a;switch(l=h<=.5?u/(o+a):u/(2-o-a),o){case n:c=(i-r)/u+(i<r?6:0);break;case i:c=(r-n)/u+2;break;case r:c=(n-i)/u+4;break}c/=6}return e.h=c,e.s=l,e.l=h,e}getRGB(e,t=rt.workingColorSpace){return rt.workingToColorSpace(jt.copy(this),t),e.r=jt.r,e.g=jt.g,e.b=jt.b,e}getStyle(e=Ut){rt.workingToColorSpace(jt.copy(this),e);const t=jt.r,n=jt.g,i=jt.b;return e!==Ut?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(e,t,n){return this.getHSL(xi),this.setHSL(xi.h+e,xi.s+t,xi.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(xi),e.getHSL(Fr);const n=or(xi.h,Fr.h,t),i=or(xi.s,Fr.s,t),r=or(xi.l,Fr.l,t);return this.setHSL(n,i,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,i=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*i,this.g=r[1]*t+r[4]*n+r[7]*i,this.b=r[2]*t+r[5]*n+r[8]*i,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const jt=new Me;Me.NAMES=Wu;let ap=0;class Wn extends zs{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:ap++}),this.uuid=Mn(),this.name="",this.type="Material",this.blending=ws,this.side=ai,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=za,this.blendDst=Fa,this.blendEquation=ki,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Me(0,0,0),this.blendAlpha=0,this.depthFunc=Es,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Ol,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ji,this.stencilZFail=Ji,this.stencilZPass=Ji,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const i=this[t];if(i===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==ws&&(n.blending=this.blending),this.side!==ai&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==za&&(n.blendSrc=this.blendSrc),this.blendDst!==Fa&&(n.blendDst=this.blendDst),this.blendEquation!==ki&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Es&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Ol&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Ji&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Ji&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Ji&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(r){const o=[];for(const a in r){const c=r[a];delete c.metadata,o.push(c)}return o}if(t){const r=i(e.textures),o=i(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const i=t.length;n=new Array(i);for(let r=0;r!==i;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class Hi extends Wn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Me(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new wn,this.combine=Au,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Nt=new C,Or=new le;let cp=0;class yt{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:cp++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=wc,this.updateRanges=[],this.gpuType=Ln,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,r=this.itemSize;i<r;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Or.fromBufferAttribute(this,t),Or.applyMatrix3(e),this.setXY(t,Or.x,Or.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Nt.fromBufferAttribute(this,t),Nt.applyMatrix3(e),this.setXYZ(t,Nt.x,Nt.y,Nt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Nt.fromBufferAttribute(this,t),Nt.applyMatrix4(e),this.setXYZ(t,Nt.x,Nt.y,Nt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Nt.fromBufferAttribute(this,t),Nt.applyNormalMatrix(e),this.setXYZ(t,Nt.x,Nt.y,Nt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Nt.fromBufferAttribute(this,t),Nt.transformDirection(e),this.setXYZ(t,Nt.x,Nt.y,Nt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Rn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=pt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Rn(t,this.array)),t}setX(e,t){return this.normalized&&(t=pt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Rn(t,this.array)),t}setY(e,t){return this.normalized&&(t=pt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Rn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=pt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Rn(t,this.array)),t}setW(e,t){return this.normalized&&(t=pt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=pt(t,this.array),n=pt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.normalized&&(t=pt(t,this.array),n=pt(n,this.array),i=pt(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,r){return e*=this.itemSize,this.normalized&&(t=pt(t,this.array),n=pt(n,this.array),i=pt(i,this.array),r=pt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==wc&&(e.usage=this.usage),e}}class jc extends yt{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Kc extends yt{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class Ye extends yt{constructor(e,t,n){super(new Float32Array(e),t,n)}}let lp=0;const gn=new qe,aa=new ut,cs=new C,un=new fi,Ys=new fi,Bt=new C;class wt extends zs{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:lp++}),this.uuid=Mn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Vu(e)?Kc:jc)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const r=new $e().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return gn.makeRotationFromQuaternion(e),this.applyMatrix4(gn),this}rotateX(e){return gn.makeRotationX(e),this.applyMatrix4(gn),this}rotateY(e){return gn.makeRotationY(e),this.applyMatrix4(gn),this}rotateZ(e){return gn.makeRotationZ(e),this.applyMatrix4(gn),this}translate(e,t,n){return gn.makeTranslation(e,t,n),this.applyMatrix4(gn),this}scale(e,t,n){return gn.makeScale(e,t,n),this.applyMatrix4(gn),this}lookAt(e){return aa.lookAt(e),aa.updateMatrix(),this.applyMatrix4(aa.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(cs).negate(),this.translate(cs.x,cs.y,cs.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let i=0,r=e.length;i<r;i++){const o=e[i];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Ye(n,3))}else{const n=Math.min(e.length,t.count);for(let i=0;i<n;i++){const r=e[i];t.setXYZ(i,r.x,r.y,r.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new fi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new C(-1/0,-1/0,-1/0),new C(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){const r=t[n];un.setFromBufferAttribute(r),this.morphTargetsRelative?(Bt.addVectors(this.boundingBox.min,un.min),this.boundingBox.expandByPoint(Bt),Bt.addVectors(this.boundingBox.max,un.max),this.boundingBox.expandByPoint(Bt)):(this.boundingBox.expandByPoint(un.min),this.boundingBox.expandByPoint(un.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new qn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new C,1/0);return}if(e){const n=this.boundingSphere.center;if(un.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){const a=t[r];Ys.setFromBufferAttribute(a),this.morphTargetsRelative?(Bt.addVectors(un.min,Ys.min),un.expandByPoint(Bt),Bt.addVectors(un.max,Ys.max),un.expandByPoint(Bt)):(un.expandByPoint(Ys.min),un.expandByPoint(Ys.max))}un.getCenter(n);let i=0;for(let r=0,o=e.count;r<o;r++)Bt.fromBufferAttribute(e,r),i=Math.max(i,n.distanceToSquared(Bt));if(t)for(let r=0,o=t.length;r<o;r++){const a=t[r],c=this.morphTargetsRelative;for(let l=0,h=a.count;l<h;l++)Bt.fromBufferAttribute(a,l),c&&(cs.fromBufferAttribute(e,l),Bt.add(cs)),i=Math.max(i,n.distanceToSquared(Bt))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,i=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new yt(new Float32Array(4*n.count),4));const o=this.getAttribute("tangent"),a=[],c=[];for(let A=0;A<n.count;A++)a[A]=new C,c[A]=new C;const l=new C,h=new C,u=new C,f=new le,d=new le,m=new le,x=new C,g=new C;function p(A,T,S){l.fromBufferAttribute(n,A),h.fromBufferAttribute(n,T),u.fromBufferAttribute(n,S),f.fromBufferAttribute(r,A),d.fromBufferAttribute(r,T),m.fromBufferAttribute(r,S),h.sub(l),u.sub(l),d.sub(f),m.sub(f);const L=1/(d.x*m.y-m.x*d.y);isFinite(L)&&(x.copy(h).multiplyScalar(m.y).addScaledVector(u,-d.y).multiplyScalar(L),g.copy(u).multiplyScalar(d.x).addScaledVector(h,-m.x).multiplyScalar(L),a[A].add(x),a[T].add(x),a[S].add(x),c[A].add(g),c[T].add(g),c[S].add(g))}let M=this.groups;M.length===0&&(M=[{start:0,count:e.count}]);for(let A=0,T=M.length;A<T;++A){const S=M[A],L=S.start,D=S.count;for(let z=L,N=L+D;z<N;z+=3)p(e.getX(z+0),e.getX(z+1),e.getX(z+2))}const v=new C,_=new C,w=new C,b=new C;function y(A){w.fromBufferAttribute(i,A),b.copy(w);const T=a[A];v.copy(T),v.sub(w.multiplyScalar(w.dot(T))).normalize(),_.crossVectors(b,T);const L=_.dot(c[A])<0?-1:1;o.setXYZW(A,v.x,v.y,v.z,L)}for(let A=0,T=M.length;A<T;++A){const S=M[A],L=S.start,D=S.count;for(let z=L,N=L+D;z<N;z+=3)y(e.getX(z+0)),y(e.getX(z+1)),y(e.getX(z+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new yt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let f=0,d=n.count;f<d;f++)n.setXYZ(f,0,0,0);const i=new C,r=new C,o=new C,a=new C,c=new C,l=new C,h=new C,u=new C;if(e)for(let f=0,d=e.count;f<d;f+=3){const m=e.getX(f+0),x=e.getX(f+1),g=e.getX(f+2);i.fromBufferAttribute(t,m),r.fromBufferAttribute(t,x),o.fromBufferAttribute(t,g),h.subVectors(o,r),u.subVectors(i,r),h.cross(u),a.fromBufferAttribute(n,m),c.fromBufferAttribute(n,x),l.fromBufferAttribute(n,g),a.add(h),c.add(h),l.add(h),n.setXYZ(m,a.x,a.y,a.z),n.setXYZ(x,c.x,c.y,c.z),n.setXYZ(g,l.x,l.y,l.z)}else for(let f=0,d=t.count;f<d;f+=3)i.fromBufferAttribute(t,f+0),r.fromBufferAttribute(t,f+1),o.fromBufferAttribute(t,f+2),h.subVectors(o,r),u.subVectors(i,r),h.cross(u),n.setXYZ(f+0,h.x,h.y,h.z),n.setXYZ(f+1,h.x,h.y,h.z),n.setXYZ(f+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Bt.fromBufferAttribute(e,t),Bt.normalize(),e.setXYZ(t,Bt.x,Bt.y,Bt.z)}toNonIndexed(){function e(a,c){const l=a.array,h=a.itemSize,u=a.normalized,f=new l.constructor(c.length*h);let d=0,m=0;for(let x=0,g=c.length;x<g;x++){a.isInterleavedBufferAttribute?d=c[x]*a.data.stride+a.offset:d=c[x]*h;for(let p=0;p<h;p++)f[m++]=l[d++]}return new yt(f,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new wt,n=this.index.array,i=this.attributes;for(const a in i){const c=i[a],l=e(c,n);t.setAttribute(a,l)}const r=this.morphAttributes;for(const a in r){const c=[],l=r[a];for(let h=0,u=l.length;h<u;h++){const f=l[h],d=e(f,n);c.push(d)}t.morphAttributes[a]=c}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,c=o.length;a<c;a++){const l=o[a];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const c=this.parameters;for(const l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const c in n){const l=n[c];e.data.attributes[c]=l.toJSON(e.data)}const i={};let r=!1;for(const c in this.morphAttributes){const l=this.morphAttributes[c],h=[];for(let u=0,f=l.length;u<f;u++){const d=l[u];h.push(d.toJSON(e.data))}h.length>0&&(i[c]=h,r=!0)}r&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const i=e.attributes;for(const l in i){const h=i[l];this.setAttribute(l,h.clone(t))}const r=e.morphAttributes;for(const l in r){const h=[],u=r[l];for(let f=0,d=u.length;f<d;f++)h.push(u[f].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let l=0,h=o.length;l<h;l++){const u=o[l];this.addGroup(u.start,u.count,u.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Ql=new qe,Ii=new br,kr=new qn,eh=new C,Br=new C,Hr=new C,Vr=new C,ca=new C,Gr=new C,th=new C,Wr=new C;class st extends ut{constructor(e=new wt,t=new Hi){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){const a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){const n=this.geometry,i=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(i,e);const a=this.morphTargetInfluences;if(r&&a){Gr.set(0,0,0);for(let c=0,l=r.length;c<l;c++){const h=a[c],u=r[c];h!==0&&(ca.fromBufferAttribute(u,e),o?Gr.addScaledVector(ca,h):Gr.addScaledVector(ca.sub(t),h))}t.add(Gr)}return t}raycast(e,t){const n=this.geometry,i=this.material,r=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),kr.copy(n.boundingSphere),kr.applyMatrix4(r),Ii.copy(e.ray).recast(e.near),!(kr.containsPoint(Ii.origin)===!1&&(Ii.intersectSphere(kr,eh)===null||Ii.origin.distanceToSquared(eh)>(e.far-e.near)**2))&&(Ql.copy(r).invert(),Ii.copy(e.ray).applyMatrix4(Ql),!(n.boundingBox!==null&&Ii.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Ii)))}_computeIntersections(e,t,n){let i;const r=this.geometry,o=this.material,a=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,f=r.groups,d=r.drawRange;if(a!==null)if(Array.isArray(o))for(let m=0,x=f.length;m<x;m++){const g=f[m],p=o[g.materialIndex],M=Math.max(g.start,d.start),v=Math.min(a.count,Math.min(g.start+g.count,d.start+d.count));for(let _=M,w=v;_<w;_+=3){const b=a.getX(_),y=a.getX(_+1),A=a.getX(_+2);i=Xr(this,p,e,n,l,h,u,b,y,A),i&&(i.faceIndex=Math.floor(_/3),i.face.materialIndex=g.materialIndex,t.push(i))}}else{const m=Math.max(0,d.start),x=Math.min(a.count,d.start+d.count);for(let g=m,p=x;g<p;g+=3){const M=a.getX(g),v=a.getX(g+1),_=a.getX(g+2);i=Xr(this,o,e,n,l,h,u,M,v,_),i&&(i.faceIndex=Math.floor(g/3),t.push(i))}}else if(c!==void 0)if(Array.isArray(o))for(let m=0,x=f.length;m<x;m++){const g=f[m],p=o[g.materialIndex],M=Math.max(g.start,d.start),v=Math.min(c.count,Math.min(g.start+g.count,d.start+d.count));for(let _=M,w=v;_<w;_+=3){const b=_,y=_+1,A=_+2;i=Xr(this,p,e,n,l,h,u,b,y,A),i&&(i.faceIndex=Math.floor(_/3),i.face.materialIndex=g.materialIndex,t.push(i))}}else{const m=Math.max(0,d.start),x=Math.min(c.count,d.start+d.count);for(let g=m,p=x;g<p;g+=3){const M=g,v=g+1,_=g+2;i=Xr(this,o,e,n,l,h,u,M,v,_),i&&(i.faceIndex=Math.floor(g/3),t.push(i))}}}}function hp(s,e,t,n,i,r,o,a){let c;if(e.side===Wt?c=n.intersectTriangle(o,r,i,!0,a):c=n.intersectTriangle(i,r,o,e.side===ai,a),c===null)return null;Wr.copy(a),Wr.applyMatrix4(s.matrixWorld);const l=t.ray.origin.distanceTo(Wr);return l<t.near||l>t.far?null:{distance:l,point:Wr.clone(),object:s}}function Xr(s,e,t,n,i,r,o,a,c,l){s.getVertexPosition(a,Br),s.getVertexPosition(c,Hr),s.getVertexPosition(l,Vr);const h=hp(s,e,t,n,Br,Hr,Vr,th);if(h){const u=new C;Cn.getBarycoord(th,Br,Hr,Vr,u),i&&(h.uv=Cn.getInterpolatedAttribute(i,a,c,l,u,new le)),r&&(h.uv1=Cn.getInterpolatedAttribute(r,a,c,l,u,new le)),o&&(h.normal=Cn.getInterpolatedAttribute(o,a,c,l,u,new C),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const f={a,b:c,c:l,normal:new C,materialIndex:0};Cn.getNormal(Br,Hr,Vr,f.normal),h.face=f,h.barycoord=u}return h}class Fs extends wt{constructor(e=1,t=1,n=1,i=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:r,depthSegments:o};const a=this;i=Math.floor(i),r=Math.floor(r),o=Math.floor(o);const c=[],l=[],h=[],u=[];let f=0,d=0;m("z","y","x",-1,-1,n,t,e,o,r,0),m("z","y","x",1,-1,n,t,-e,o,r,1),m("x","z","y",1,1,e,n,t,i,o,2),m("x","z","y",1,-1,e,n,-t,i,o,3),m("x","y","z",1,-1,e,t,n,i,r,4),m("x","y","z",-1,-1,e,t,-n,i,r,5),this.setIndex(c),this.setAttribute("position",new Ye(l,3)),this.setAttribute("normal",new Ye(h,3)),this.setAttribute("uv",new Ye(u,2));function m(x,g,p,M,v,_,w,b,y,A,T){const S=_/y,L=w/A,D=_/2,z=w/2,N=b/2,F=y+1,V=A+1;let G=0,B=0;const $=new C;for(let fe=0;fe<V;fe++){const ce=fe*L-z;for(let Re=0;Re<F;Re++){const Je=Re*S-D;$[x]=Je*M,$[g]=ce*v,$[p]=N,l.push($.x,$.y,$.z),$[x]=0,$[g]=0,$[p]=b>0?1:-1,h.push($.x,$.y,$.z),u.push(Re/y),u.push(1-fe/A),G+=1}}for(let fe=0;fe<A;fe++)for(let ce=0;ce<y;ce++){const Re=f+ce+F*fe,Je=f+ce+F*(fe+1),ct=f+(ce+1)+F*(fe+1),tt=f+(ce+1)+F*fe;c.push(Re,Je,tt),c.push(Je,ct,tt),B+=6}a.addGroup(d,B,T),d+=B,f+=G}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Fs(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Ps(s){const e={};for(const t in s){e[t]={};for(const n in s[t]){const i=s[t][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=i.clone():Array.isArray(i)?e[t][n]=i.slice():e[t][n]=i}}return e}function Jt(s){const e={};for(let t=0;t<s.length;t++){const n=Ps(s[t]);for(const i in n)e[i]=n[i]}return e}function up(s){const e=[];for(let t=0;t<s.length;t++)e.push(s[t].clone());return e}function Xu(s){const e=s.getRenderTarget();return e===null?s.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:rt.workingColorSpace}const qu={clone:Ps,merge:Jt};var fp=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,dp=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Xt extends Wn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=fp,this.fragmentShader=dp,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ps(e.uniforms),this.uniformsGroups=up(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const i in this.uniforms){const o=this.uniforms[i].value;o&&o.isTexture?t.uniforms[i]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[i]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[i]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[i]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[i]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[i]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[i]={type:"m4",value:o.toArray()}:t.uniforms[i]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class Lo extends ut{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new qe,this.projectionMatrix=new qe,this.projectionMatrixInverse=new qe,this.coordinateSystem=Gn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const vi=new C,nh=new le,ih=new le;class Kt extends Lo{constructor(e=50,t=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Cs*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(rr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Cs*2*Math.atan(Math.tan(rr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){vi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(vi.x,vi.y).multiplyScalar(-e/vi.z),vi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(vi.x,vi.y).multiplyScalar(-e/vi.z)}getViewSize(e,t){return this.getViewBounds(e,nh,ih),t.subVectors(ih,nh)}setViewOffset(e,t,n,i,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(rr*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,r=-.5*i;const o=this.view;if(this.view!==null&&this.view.enabled){const c=o.fullWidth,l=o.fullHeight;r+=o.offsetX*i/c,t-=o.offsetY*n/l,i*=o.width/c,n*=o.height/l}const a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+i,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const ls=-90,hs=1;class pp extends ut{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new Kt(ls,hs,e,t);i.layers=this.layers,this.add(i);const r=new Kt(ls,hs,e,t);r.layers=this.layers,this.add(r);const o=new Kt(ls,hs,e,t);o.layers=this.layers,this.add(o);const a=new Kt(ls,hs,e,t);a.layers=this.layers,this.add(a);const c=new Kt(ls,hs,e,t);c.layers=this.layers,this.add(c);const l=new Kt(ls,hs,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,i,r,o,a,c]=t;for(const l of t)this.remove(l);if(e===Gn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===wo)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,c,l,h]=this.children,u=e.getRenderTarget(),f=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;const x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,i),e.render(t,r),e.setRenderTarget(n,1,i),e.render(t,o),e.setRenderTarget(n,2,i),e.render(t,a),e.setRenderTarget(n,3,i),e.render(t,c),e.setRenderTarget(n,4,i),e.render(t,l),n.texture.generateMipmaps=x,e.setRenderTarget(n,5,i),e.render(t,h),e.setRenderTarget(u,f,d),e.xr.enabled=m,n.texture.needsPMREMUpdate=!0}}class Yu extends Ft{constructor(e=[],t=As,n,i,r,o,a,c,l,h){super(e,t,n,i,r,o,a,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class mp extends Dn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},i=[n,n,n,n,n,n];this.texture=new Yu(i),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},i=new Fs(5,5,5),r=new Xt({name:"CubemapFromEquirect",uniforms:Ps(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Wt,blending:bi});r.uniforms.tEquirect.value=t;const o=new st(i,r),a=t.minFilter;return t.minFilter===Vn&&(t.minFilter=on),new pp(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,i=!0){const r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,i);e.setRenderTarget(r)}}class We extends ut{constructor(){super(),this.isGroup=!0,this.type="Group"}}const gp={type:"move"};class la{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new We,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new We,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new C,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new C),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new We,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new C,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new C),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,r=null,o=null;const a=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){o=!0;for(const x of e.hand.values()){const g=t.getJointPose(x,n),p=this._getHandJoint(l,x);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}const h=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],f=h.position.distanceTo(u.position),d=.02,m=.005;l.inputState.pinching&&f>d+m?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&f<=d-m&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(i=t.getPose(e.targetRaySpace,n),i===null&&r!==null&&(i=r),i!==null&&(a.matrix.fromArray(i.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,i.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(i.linearVelocity)):a.hasLinearVelocity=!1,i.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(i.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(gp)))}return a!==null&&(a.visible=i!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new We;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}class Zc{constructor(e,t=25e-5){this.isFogExp2=!0,this.name="",this.color=new Me(e),this.density=t}clone(){return new Zc(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class bo extends ut{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new wn,this.environmentIntensity=1,this.environmentRotation=new wn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class xp{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=wc,this.updateRanges=[],this.version=0,this.uuid=Mn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let i=0,r=this.stride;i<r;i++)this.array[e+i]=t.array[n+i];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Mn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Mn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const $t=new C;class $c{constructor(e,t,n,i=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=i}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)$t.fromBufferAttribute(this,t),$t.applyMatrix4(e),this.setXYZ(t,$t.x,$t.y,$t.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)$t.fromBufferAttribute(this,t),$t.applyNormalMatrix(e),this.setXYZ(t,$t.x,$t.y,$t.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)$t.fromBufferAttribute(this,t),$t.transformDirection(e),this.setXYZ(t,$t.x,$t.y,$t.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=Rn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=pt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=pt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=pt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=pt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=pt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Rn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Rn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Rn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Rn(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=pt(t,this.array),n=pt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=pt(t,this.array),n=pt(n,this.array),i=pt(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this}setXYZW(e,t,n,i,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=pt(t,this.array),n=pt(n,this.array),i=pt(i,this.array),r=pt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this.data.array[e+3]=r,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[i+r])}return new yt(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new $c(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const i=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[i+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}const sh=new C,rh=new at,oh=new at,vp=new C,ah=new qe,qr=new C,ha=new qn,ch=new qe,ua=new br;class _p extends st{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=Ul,this.bindMatrix=new qe,this.bindMatrixInverse=new qe,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new fi),this.boundingBox.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,qr),this.boundingBox.expandByPoint(qr)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new qn),this.boundingSphere.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,qr),this.boundingSphere.expandByPoint(qr)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){const n=this.material,i=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),ha.copy(this.boundingSphere),ha.applyMatrix4(i),e.ray.intersectsSphere(ha)!==!1&&(ch.copy(i).invert(),ua.copy(e.ray).applyMatrix4(ch),!(this.boundingBox!==null&&ua.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,ua)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new at,t=this.geometry.attributes.skinWeight;for(let n=0,i=t.count;n<i;n++){e.fromBufferAttribute(t,n);const r=1/e.manhattanLength();r!==1/0?e.multiplyScalar(r):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===Ul?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===xd?this.bindMatrixInverse.copy(this.bindMatrix).invert():console.warn("THREE.SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){const n=this.skeleton,i=this.geometry;rh.fromBufferAttribute(i.attributes.skinIndex,e),oh.fromBufferAttribute(i.attributes.skinWeight,e),sh.copy(t).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let r=0;r<4;r++){const o=oh.getComponent(r);if(o!==0){const a=rh.getComponent(r);ah.multiplyMatrices(n.bones[a].matrixWorld,n.boneInverses[a]),t.addScaledVector(vp.copy(sh).applyMatrix4(ah),o)}}return t.applyMatrix4(this.bindMatrixInverse)}}class ju extends ut{constructor(){super(),this.isBone=!0,this.type="Bone"}}class Jc extends Ft{constructor(e=null,t=1,n=1,i,r,o,a,c,l=tn,h=tn,u,f){super(null,o,a,c,l,h,i,r,u,f),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const lh=new qe,yp=new qe;let Mp=class Ku{constructor(e=[],t=[]){this.uuid=Mn(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){const e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){console.warn("THREE.Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,i=this.bones.length;n<i;n++)this.boneInverses.push(new qe)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){const n=new qe;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){const e=this.bones,t=this.boneInverses,n=this.boneMatrices,i=this.boneTexture;for(let r=0,o=e.length;r<o;r++){const a=e[r]?e[r].matrixWorld:yp;lh.multiplyMatrices(a,t[r]),lh.toArray(n,r*16)}i!==null&&(i.needsUpdate=!0)}clone(){return new Ku(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);const t=new Float32Array(e*e*4);t.set(this.boneMatrices);const n=new Jc(t,e,e,fn,Ln);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){const i=this.bones[t];if(i.name===e)return i}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,i=e.bones.length;n<i;n++){const r=e.bones[n];let o=t[r];o===void 0&&(console.warn("THREE.Skeleton: No bone found with UUID:",r),o=new ju),this.bones.push(o),this.boneInverses.push(new qe().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){const e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;const t=this.bones,n=this.boneInverses;for(let i=0,r=t.length;i<r;i++){const o=t[i];e.bones.push(o.uuid);const a=n[i];e.boneInverses.push(a.toArray())}return e}};class bc extends yt{constructor(e,t,n,i=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const us=new qe,hh=new qe,Yr=[],uh=new fi,wp=new qe,js=new st,Ks=new qn;class ii extends st{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new bc(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,wp)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new fi),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,us),uh.copy(e.boundingBox).applyMatrix4(us),this.boundingBox.union(uh)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new qn),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,us),Ks.copy(e.boundingSphere).applyMatrix4(us),this.boundingSphere.union(Ks)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,i=this.morphTexture.source.data.data,r=n.length+1,o=e*r+1;for(let a=0;a<n.length;a++)n[a]=i[o+a]}raycast(e,t){const n=this.matrixWorld,i=this.count;if(js.geometry=this.geometry,js.material=this.material,js.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Ks.copy(this.boundingSphere),Ks.applyMatrix4(n),e.ray.intersectsSphere(Ks)!==!1))for(let r=0;r<i;r++){this.getMatrixAt(r,us),hh.multiplyMatrices(n,us),js.matrixWorld=hh,js.raycast(e,Yr);for(let o=0,a=Yr.length;o<a;o++){const c=Yr[o];c.instanceId=r,c.object=this,t.push(c)}Yr.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new bc(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){const n=t.morphTargetInfluences,i=n.length+1;this.morphTexture===null&&(this.morphTexture=new Jc(new Float32Array(i*this.count),i,this.count,Hc,Ln));const r=this.morphTexture.source.data.data;let o=0;for(let l=0;l<n.length;l++)o+=n[l];const a=this.geometry.morphTargetsRelative?1:1-o,c=i*e;r[c]=a,r.set(n,c+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const fa=new C,bp=new C,Sp=new $e;class Mi{constructor(e=new C(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const i=fa.subVectors(n,t).cross(bp.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(fa),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/i;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||Sp.getNormalMatrix(e),i=this.coplanarPoint(fa).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Di=new qn,Tp=new le(.5,.5),jr=new C;class Qc{constructor(e=new Mi,t=new Mi,n=new Mi,i=new Mi,r=new Mi,o=new Mi){this.planes=[e,t,n,i,r,o]}set(e,t,n,i,r,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(i),a[4].copy(r),a[5].copy(o),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Gn,n=!1){const i=this.planes,r=e.elements,o=r[0],a=r[1],c=r[2],l=r[3],h=r[4],u=r[5],f=r[6],d=r[7],m=r[8],x=r[9],g=r[10],p=r[11],M=r[12],v=r[13],_=r[14],w=r[15];if(i[0].setComponents(l-o,d-h,p-m,w-M).normalize(),i[1].setComponents(l+o,d+h,p+m,w+M).normalize(),i[2].setComponents(l+a,d+u,p+x,w+v).normalize(),i[3].setComponents(l-a,d-u,p-x,w-v).normalize(),n)i[4].setComponents(c,f,g,_).normalize(),i[5].setComponents(l-c,d-f,p-g,w-_).normalize();else if(i[4].setComponents(l-c,d-f,p-g,w-_).normalize(),t===Gn)i[5].setComponents(l+c,d+f,p+g,w+_).normalize();else if(t===wo)i[5].setComponents(c,f,g,_).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Di.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Di.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Di)}intersectsSprite(e){Di.center.set(0,0,0);const t=Tp.distanceTo(e.center);return Di.radius=.7071067811865476+t,Di.applyMatrix4(e.matrixWorld),this.intersectsSphere(Di)}intersectsSphere(e){const t=this.planes,n=e.center,i=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const i=t[n];if(jr.x=i.normal.x>0?e.max.x:e.min.x,jr.y=i.normal.y>0?e.max.y:e.min.y,jr.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(jr)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Zu extends Wn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Me(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const So=new C,To=new C,fh=new qe,Zs=new br,Kr=new qn,da=new C,dh=new C;class el extends ut{constructor(e=new wt,t=new Zu){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let i=1,r=t.count;i<r;i++)So.fromBufferAttribute(t,i-1),To.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=So.distanceTo(To);e.setAttribute("lineDistance",new Ye(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,r=e.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Kr.copy(n.boundingSphere),Kr.applyMatrix4(i),Kr.radius+=r,e.ray.intersectsSphere(Kr)===!1)return;fh.copy(i).invert(),Zs.copy(e.ray).applyMatrix4(fh);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=this.isLineSegments?2:1,h=n.index,f=n.attributes.position;if(h!==null){const d=Math.max(0,o.start),m=Math.min(h.count,o.start+o.count);for(let x=d,g=m-1;x<g;x+=l){const p=h.getX(x),M=h.getX(x+1),v=Zr(this,e,Zs,c,p,M,x);v&&t.push(v)}if(this.isLineLoop){const x=h.getX(m-1),g=h.getX(d),p=Zr(this,e,Zs,c,x,g,m-1);p&&t.push(p)}}else{const d=Math.max(0,o.start),m=Math.min(f.count,o.start+o.count);for(let x=d,g=m-1;x<g;x+=l){const p=Zr(this,e,Zs,c,x,x+1,x);p&&t.push(p)}if(this.isLineLoop){const x=Zr(this,e,Zs,c,m-1,d,m-1);x&&t.push(x)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){const a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function Zr(s,e,t,n,i,r,o){const a=s.geometry.attributes.position;if(So.fromBufferAttribute(a,i),To.fromBufferAttribute(a,r),t.distanceSqToSegment(So,To,da,dh)>n)return;da.applyMatrix4(s.matrixWorld);const l=e.ray.origin.distanceTo(da);if(!(l<e.near||l>e.far))return{distance:l,point:dh.clone().applyMatrix4(s.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:s}}const ph=new C,mh=new C;class Ep extends el{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let i=0,r=t.count;i<r;i+=2)ph.fromBufferAttribute(t,i),mh.fromBufferAttribute(t,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+ph.distanceTo(mh);e.setAttribute("lineDistance",new Ye(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Ap extends el{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}}class Wi extends Wn{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Me(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const gh=new qe,Sc=new br,$r=new qn,Jr=new C;class Ss extends ut{constructor(e=new wt,t=new Wi){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const n=this.geometry,i=this.matrixWorld,r=e.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),$r.copy(n.boundingSphere),$r.applyMatrix4(i),$r.radius+=r,e.ray.intersectsSphere($r)===!1)return;gh.copy(i).invert(),Sc.copy(e.ray).applyMatrix4(gh);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=n.index,u=n.attributes.position;if(l!==null){const f=Math.max(0,o.start),d=Math.min(l.count,o.start+o.count);for(let m=f,x=d;m<x;m++){const g=l.getX(m);Jr.fromBufferAttribute(u,g),xh(Jr,g,c,i,e,t,this)}}else{const f=Math.max(0,o.start),d=Math.min(u.count,o.start+o.count);for(let m=f,x=d;m<x;m++)Jr.fromBufferAttribute(u,m),xh(Jr,m,c,i,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=i.length;r<o;r++){const a=i[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function xh(s,e,t,n,i,r,o){const a=Sc.distanceSqToPoint(s);if(a<t){const c=new C;Sc.closestPointToPoint(s,c),c.applyMatrix4(n);const l=i.ray.origin.distanceTo(c);if(l<i.near||l>i.far)return;r.push({distance:l,distanceToRay:Math.sqrt(a),point:c,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}class Io extends Ft{constructor(e,t,n,i,r,o,a,c,l){super(e,t,n,i,r,o,a,c,l),this.isCanvasTexture=!0,this.needsUpdate=!0}}class tl extends Ft{constructor(e,t,n=Ei,i,r,o,a=tn,c=tn,l,h=dr,u=1){if(h!==dr&&h!==pr)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const f={width:e,height:t,depth:u};super(f,i,r,o,a,c,h,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new qc(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class $u extends Ft{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class nl extends wt{constructor(e=1,t=1,n=4,i=8,r=1){super(),this.type="CapsuleGeometry",this.parameters={radius:e,height:t,capSegments:n,radialSegments:i,heightSegments:r},t=Math.max(0,t),n=Math.max(1,Math.floor(n)),i=Math.max(3,Math.floor(i)),r=Math.max(1,Math.floor(r));const o=[],a=[],c=[],l=[],h=t/2,u=Math.PI/2*e,f=t,d=2*u+f,m=n*2+r,x=i+1,g=new C,p=new C;for(let M=0;M<=m;M++){let v=0,_=0,w=0,b=0;if(M<=n){const T=M/n,S=T*Math.PI/2;_=-h-e*Math.cos(S),w=e*Math.sin(S),b=-e*Math.cos(S),v=T*u}else if(M<=n+r){const T=(M-n)/r;_=-h+T*t,w=e,b=0,v=u+T*f}else{const T=(M-n-r)/n,S=T*Math.PI/2;_=h+e*Math.sin(S),w=e*Math.cos(S),b=e*Math.sin(S),v=u+f+T*u}const y=Math.max(0,Math.min(1,v/d));let A=0;M===0?A=.5/i:M===m&&(A=-.5/i);for(let T=0;T<=i;T++){const S=T/i,L=S*Math.PI*2,D=Math.sin(L),z=Math.cos(L);p.x=-w*z,p.y=_,p.z=w*D,a.push(p.x,p.y,p.z),g.set(-w*z,b,w*D),g.normalize(),c.push(g.x,g.y,g.z),l.push(S+A,y)}if(M>0){const T=(M-1)*x;for(let S=0;S<i;S++){const L=T+S,D=T+S+1,z=M*x+S,N=M*x+S+1;o.push(L,D,z),o.push(D,N,z)}}}this.setIndex(o),this.setAttribute("position",new Ye(a,3)),this.setAttribute("normal",new Ye(c,3)),this.setAttribute("uv",new Ye(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new nl(e.radius,e.height,e.capSegments,e.radialSegments,e.heightSegments)}}class wi extends wt{constructor(e=1,t=1,n=1,i=32,r=1,o=!1,a=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:i,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:c};const l=this;i=Math.floor(i),r=Math.floor(r);const h=[],u=[],f=[],d=[];let m=0;const x=[],g=n/2;let p=0;M(),o===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(h),this.setAttribute("position",new Ye(u,3)),this.setAttribute("normal",new Ye(f,3)),this.setAttribute("uv",new Ye(d,2));function M(){const _=new C,w=new C;let b=0;const y=(t-e)/n;for(let A=0;A<=r;A++){const T=[],S=A/r,L=S*(t-e)+e;for(let D=0;D<=i;D++){const z=D/i,N=z*c+a,F=Math.sin(N),V=Math.cos(N);w.x=L*F,w.y=-S*n+g,w.z=L*V,u.push(w.x,w.y,w.z),_.set(F,y,V).normalize(),f.push(_.x,_.y,_.z),d.push(z,1-S),T.push(m++)}x.push(T)}for(let A=0;A<i;A++)for(let T=0;T<r;T++){const S=x[T][A],L=x[T+1][A],D=x[T+1][A+1],z=x[T][A+1];(e>0||T!==0)&&(h.push(S,L,z),b+=3),(t>0||T!==r-1)&&(h.push(L,D,z),b+=3)}l.addGroup(p,b,0),p+=b}function v(_){const w=m,b=new le,y=new C;let A=0;const T=_===!0?e:t,S=_===!0?1:-1;for(let D=1;D<=i;D++)u.push(0,g*S,0),f.push(0,S,0),d.push(.5,.5),m++;const L=m;for(let D=0;D<=i;D++){const N=D/i*c+a,F=Math.cos(N),V=Math.sin(N);y.x=T*V,y.y=g*S,y.z=T*F,u.push(y.x,y.y,y.z),f.push(0,S,0),b.x=F*.5+.5,b.y=V*.5*S+.5,d.push(b.x,b.y),m++}for(let D=0;D<i;D++){const z=w+D,N=L+D;_===!0?h.push(N,N+1,z):h.push(N+1,N,z),A+=3}l.addGroup(p,A,_===!0?1:2),p+=A}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new wi(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class il extends wt{constructor(e=[],t=[],n=1,i=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:e,indices:t,radius:n,detail:i};const r=[],o=[];a(i),l(n),h(),this.setAttribute("position",new Ye(r,3)),this.setAttribute("normal",new Ye(r.slice(),3)),this.setAttribute("uv",new Ye(o,2)),i===0?this.computeVertexNormals():this.normalizeNormals();function a(M){const v=new C,_=new C,w=new C;for(let b=0;b<t.length;b+=3)d(t[b+0],v),d(t[b+1],_),d(t[b+2],w),c(v,_,w,M)}function c(M,v,_,w){const b=w+1,y=[];for(let A=0;A<=b;A++){y[A]=[];const T=M.clone().lerp(_,A/b),S=v.clone().lerp(_,A/b),L=b-A;for(let D=0;D<=L;D++)D===0&&A===b?y[A][D]=T:y[A][D]=T.clone().lerp(S,D/L)}for(let A=0;A<b;A++)for(let T=0;T<2*(b-A)-1;T++){const S=Math.floor(T/2);T%2===0?(f(y[A][S+1]),f(y[A+1][S]),f(y[A][S])):(f(y[A][S+1]),f(y[A+1][S+1]),f(y[A+1][S]))}}function l(M){const v=new C;for(let _=0;_<r.length;_+=3)v.x=r[_+0],v.y=r[_+1],v.z=r[_+2],v.normalize().multiplyScalar(M),r[_+0]=v.x,r[_+1]=v.y,r[_+2]=v.z}function h(){const M=new C;for(let v=0;v<r.length;v+=3){M.x=r[v+0],M.y=r[v+1],M.z=r[v+2];const _=g(M)/2/Math.PI+.5,w=p(M)/Math.PI+.5;o.push(_,1-w)}m(),u()}function u(){for(let M=0;M<o.length;M+=6){const v=o[M+0],_=o[M+2],w=o[M+4],b=Math.max(v,_,w),y=Math.min(v,_,w);b>.9&&y<.1&&(v<.2&&(o[M+0]+=1),_<.2&&(o[M+2]+=1),w<.2&&(o[M+4]+=1))}}function f(M){r.push(M.x,M.y,M.z)}function d(M,v){const _=M*3;v.x=e[_+0],v.y=e[_+1],v.z=e[_+2]}function m(){const M=new C,v=new C,_=new C,w=new C,b=new le,y=new le,A=new le;for(let T=0,S=0;T<r.length;T+=9,S+=6){M.set(r[T+0],r[T+1],r[T+2]),v.set(r[T+3],r[T+4],r[T+5]),_.set(r[T+6],r[T+7],r[T+8]),b.set(o[S+0],o[S+1]),y.set(o[S+2],o[S+3]),A.set(o[S+4],o[S+5]),w.copy(M).add(v).add(_).divideScalar(3);const L=g(w);x(b,S+0,M,L),x(y,S+2,v,L),x(A,S+4,_,L)}}function x(M,v,_,w){w<0&&M.x===1&&(o[v]=M.x-1),_.x===0&&_.z===0&&(o[v]=w/2/Math.PI+.5)}function g(M){return Math.atan2(M.z,-M.x)}function p(M){return Math.atan2(-M.y,Math.sqrt(M.x*M.x+M.z*M.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new il(e.vertices,e.indices,e.radius,e.details)}}class Yn{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){console.warn("THREE.Curve: .getPoint() not implemented.")}getPointAt(e,t){const n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){const t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let n,i=this.getPoint(0),r=0;t.push(0);for(let o=1;o<=e;o++)n=this.getPoint(o/e),r+=n.distanceTo(i),t.push(r),i=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){const n=this.getLengths();let i=0;const r=n.length;let o;t?o=t:o=e*n[r-1];let a=0,c=r-1,l;for(;a<=c;)if(i=Math.floor(a+(c-a)/2),l=n[i]-o,l<0)a=i+1;else if(l>0)c=i-1;else{c=i;break}if(i=c,n[i]===o)return i/(r-1);const h=n[i],f=n[i+1]-h,d=(o-h)/f;return(i+d)/(r-1)}getTangent(e,t){let i=e-1e-4,r=e+1e-4;i<0&&(i=0),r>1&&(r=1);const o=this.getPoint(i),a=this.getPoint(r),c=t||(o.isVector2?new le:new C);return c.copy(a).sub(o).normalize(),c}getTangentAt(e,t){const n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){const n=new C,i=[],r=[],o=[],a=new C,c=new qe;for(let d=0;d<=e;d++){const m=d/e;i[d]=this.getTangentAt(m,new C)}r[0]=new C,o[0]=new C;let l=Number.MAX_VALUE;const h=Math.abs(i[0].x),u=Math.abs(i[0].y),f=Math.abs(i[0].z);h<=l&&(l=h,n.set(1,0,0)),u<=l&&(l=u,n.set(0,1,0)),f<=l&&n.set(0,0,1),a.crossVectors(i[0],n).normalize(),r[0].crossVectors(i[0],a),o[0].crossVectors(i[0],r[0]);for(let d=1;d<=e;d++){if(r[d]=r[d-1].clone(),o[d]=o[d-1].clone(),a.crossVectors(i[d-1],i[d]),a.length()>Number.EPSILON){a.normalize();const m=Math.acos(et(i[d-1].dot(i[d]),-1,1));r[d].applyMatrix4(c.makeRotationAxis(a,m))}o[d].crossVectors(i[d],r[d])}if(t===!0){let d=Math.acos(et(r[0].dot(r[e]),-1,1));d/=e,i[0].dot(a.crossVectors(r[0],r[e]))>0&&(d=-d);for(let m=1;m<=e;m++)r[m].applyMatrix4(c.makeRotationAxis(i[m],d*m)),o[m].crossVectors(i[m],r[m])}return{tangents:i,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){const e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}}class sl extends Yn{constructor(e=0,t=0,n=1,i=1,r=0,o=Math.PI*2,a=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=i,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=c}getPoint(e,t=new le){const n=t,i=Math.PI*2;let r=this.aEndAngle-this.aStartAngle;const o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=i;for(;r>i;)r-=i;r<Number.EPSILON&&(o?r=0:r=i),this.aClockwise===!0&&!o&&(r===i?r=-i:r=r-i);const a=this.aStartAngle+e*r;let c=this.aX+this.xRadius*Math.cos(a),l=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){const h=Math.cos(this.aRotation),u=Math.sin(this.aRotation),f=c-this.aX,d=l-this.aY;c=f*h-d*u+this.aX,l=f*u+d*h+this.aY}return n.set(c,l)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){const e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}}class Rp extends sl{constructor(e,t,n,i,r,o){super(e,t,n,n,i,r,o),this.isArcCurve=!0,this.type="ArcCurve"}}function rl(){let s=0,e=0,t=0,n=0;function i(r,o,a,c){s=r,e=a,t=-3*r+3*o-2*a-c,n=2*r-2*o+a+c}return{initCatmullRom:function(r,o,a,c,l){i(o,a,l*(a-r),l*(c-o))},initNonuniformCatmullRom:function(r,o,a,c,l,h,u){let f=(o-r)/l-(a-r)/(l+h)+(a-o)/h,d=(a-o)/h-(c-o)/(h+u)+(c-a)/u;f*=h,d*=h,i(o,a,f,d)},calc:function(r){const o=r*r,a=o*r;return s+e*r+t*o+n*a}}}const Qr=new C,pa=new rl,ma=new rl,ga=new rl;class Ju extends Yn{constructor(e=[],t=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=i}getPoint(e,t=new C){const n=t,i=this.points,r=i.length,o=(r-(this.closed?0:1))*e;let a=Math.floor(o),c=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:c===0&&a===r-1&&(a=r-2,c=1);let l,h;this.closed||a>0?l=i[(a-1)%r]:(Qr.subVectors(i[0],i[1]).add(i[0]),l=Qr);const u=i[a%r],f=i[(a+1)%r];if(this.closed||a+2<r?h=i[(a+2)%r]:(Qr.subVectors(i[r-1],i[r-2]).add(i[r-1]),h=Qr),this.curveType==="centripetal"||this.curveType==="chordal"){const d=this.curveType==="chordal"?.5:.25;let m=Math.pow(l.distanceToSquared(u),d),x=Math.pow(u.distanceToSquared(f),d),g=Math.pow(f.distanceToSquared(h),d);x<1e-4&&(x=1),m<1e-4&&(m=x),g<1e-4&&(g=x),pa.initNonuniformCatmullRom(l.x,u.x,f.x,h.x,m,x,g),ma.initNonuniformCatmullRom(l.y,u.y,f.y,h.y,m,x,g),ga.initNonuniformCatmullRom(l.z,u.z,f.z,h.z,m,x,g)}else this.curveType==="catmullrom"&&(pa.initCatmullRom(l.x,u.x,f.x,h.x,this.tension),ma.initCatmullRom(l.y,u.y,f.y,h.y,this.tension),ga.initCatmullRom(l.z,u.z,f.z,h.z,this.tension));return n.set(pa.calc(c),ma.calc(c),ga.calc(c)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(i.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const i=this.points[t];e.points.push(i.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(new C().fromArray(i))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}}function vh(s,e,t,n,i){const r=(n-e)*.5,o=(i-t)*.5,a=s*s,c=s*a;return(2*t-2*n+r+o)*c+(-3*t+3*n-2*r-o)*a+r*s+t}function Cp(s,e){const t=1-s;return t*t*e}function Pp(s,e){return 2*(1-s)*s*e}function Lp(s,e){return s*s*e}function ar(s,e,t,n){return Cp(s,e)+Pp(s,t)+Lp(s,n)}function Ip(s,e){const t=1-s;return t*t*t*e}function Dp(s,e){const t=1-s;return 3*t*t*s*e}function Up(s,e){return 3*(1-s)*s*s*e}function Np(s,e){return s*s*s*e}function cr(s,e,t,n,i){return Ip(s,e)+Dp(s,t)+Up(s,n)+Np(s,i)}class Qu extends Yn{constructor(e=new le,t=new le,n=new le,i=new le){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new le){const n=t,i=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(cr(e,i.x,r.x,o.x,a.x),cr(e,i.y,r.y,o.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class zp extends Yn{constructor(e=new C,t=new C,n=new C,i=new C){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new C){const n=t,i=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(cr(e,i.x,r.x,o.x,a.x),cr(e,i.y,r.y,o.y,a.y),cr(e,i.z,r.z,o.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}}class ef extends Yn{constructor(e=new le,t=new le){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new le){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new le){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class Fp extends Yn{constructor(e=new C,t=new C){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new C){const n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new C){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class tf extends Yn{constructor(e=new le,t=new le,n=new le){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new le){const n=t,i=this.v0,r=this.v1,o=this.v2;return n.set(ar(e,i.x,r.x,o.x),ar(e,i.y,r.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class nf extends Yn{constructor(e=new C,t=new C,n=new C){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new C){const n=t,i=this.v0,r=this.v1,o=this.v2;return n.set(ar(e,i.x,r.x,o.x),ar(e,i.y,r.y,o.y),ar(e,i.z,r.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){const e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}}class sf extends Yn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new le){const n=t,i=this.points,r=(i.length-1)*e,o=Math.floor(r),a=r-o,c=i[o===0?o:o-1],l=i[o],h=i[o>i.length-2?i.length-1:o+1],u=i[o>i.length-3?i.length-1:o+2];return n.set(vh(a,c.x,l.x,h.x,u.x),vh(a,c.y,l.y,h.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(i.clone())}return this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){const i=this.points[t];e.points.push(i.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){const i=e.points[t];this.points.push(new le().fromArray(i))}return this}}var Eo=Object.freeze({__proto__:null,ArcCurve:Rp,CatmullRomCurve3:Ju,CubicBezierCurve:Qu,CubicBezierCurve3:zp,EllipseCurve:sl,LineCurve:ef,LineCurve3:Fp,QuadraticBezierCurve:tf,QuadraticBezierCurve3:nf,SplineCurve:sf});class Op extends Yn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){const e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){const n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Eo[n](t,e))}return this}getPoint(e,t){const n=e*this.getLength(),i=this.getCurveLengths();let r=0;for(;r<i.length;){if(i[r]>=n){const o=i[r]-n,a=this.curves[r],c=a.getLength(),l=c===0?0:1-o/c;return a.getPointAt(l,t)}r++}return null}getLength(){const e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const e=[];let t=0;for(let n=0,i=this.curves.length;n<i;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){const t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){const t=[];let n;for(let i=0,r=this.curves;i<r.length;i++){const o=r[i],a=o.isEllipseCurve?e*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?e*o.points.length:e,c=o.getPoints(a);for(let l=0;l<c.length;l++){const h=c[l];n&&n.equals(h)||(t.push(h),n=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){const i=e.curves[t];this.curves.push(i.clone())}return this.autoClose=e.autoClose,this}toJSON(){const e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){const i=this.curves[t];e.curves.push(i.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){const i=e.curves[t];this.curves.push(new Eo[i.type]().fromJSON(i))}return this}}class _h extends Op{constructor(e){super(),this.type="Path",this.currentPoint=new le,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){const n=new ef(this.currentPoint.clone(),new le(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,i){const r=new tf(this.currentPoint.clone(),new le(e,t),new le(n,i));return this.curves.push(r),this.currentPoint.set(n,i),this}bezierCurveTo(e,t,n,i,r,o){const a=new Qu(this.currentPoint.clone(),new le(e,t),new le(n,i),new le(r,o));return this.curves.push(a),this.currentPoint.set(r,o),this}splineThru(e){const t=[this.currentPoint.clone()].concat(e),n=new sf(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,i,r,o){const a=this.currentPoint.x,c=this.currentPoint.y;return this.absarc(e+a,t+c,n,i,r,o),this}absarc(e,t,n,i,r,o){return this.absellipse(e,t,n,n,i,r,o),this}ellipse(e,t,n,i,r,o,a,c){const l=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+l,t+h,n,i,r,o,a,c),this}absellipse(e,t,n,i,r,o,a,c){const l=new sl(e,t,n,i,r,o,a,c);if(this.curves.length>0){const u=l.getPoint(0);u.equals(this.currentPoint)||this.lineTo(u.x,u.y)}this.curves.push(l);const h=l.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){const e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}}class rf extends _h{constructor(e){super(e),this.uuid=Mn(),this.type="Shape",this.holes=[]}getPointsHoles(e){const t=[];for(let n=0,i=this.holes.length;n<i;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){const i=e.holes[t];this.holes.push(i.clone())}return this}toJSON(){const e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){const i=this.holes[t];e.holes.push(i.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){const i=e.holes[t];this.holes.push(new _h().fromJSON(i))}return this}}function kp(s,e,t=2){const n=e&&e.length,i=n?e[0]*t:s.length;let r=of(s,0,i,t,!0);const o=[];if(!r||r.next===r.prev)return o;let a,c,l;if(n&&(r=Wp(s,e,r,t)),s.length>80*t){a=1/0,c=1/0;let h=-1/0,u=-1/0;for(let f=t;f<i;f+=t){const d=s[f],m=s[f+1];d<a&&(a=d),m<c&&(c=m),d>h&&(h=d),m>u&&(u=m)}l=Math.max(h-a,u-c),l=l!==0?32767/l:0}return _r(r,o,t,a,c,l,0),o}function of(s,e,t,n,i){let r;if(i===tm(s,e,t,n)>0)for(let o=e;o<t;o+=n)r=yh(o/n|0,s[o],s[o+1],r);else for(let o=t-n;o>=e;o-=n)r=yh(o/n|0,s[o],s[o+1],r);return r&&Ls(r,r.next)&&(Mr(r),r=r.next),r}function qi(s,e){if(!s)return s;e||(e=s);let t=s,n;do if(n=!1,!t.steiner&&(Ls(t,t.next)||Pt(t.prev,t,t.next)===0)){if(Mr(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function _r(s,e,t,n,i,r,o){if(!s)return;!o&&r&&Kp(s,n,i,r);let a=s;for(;s.prev!==s.next;){const c=s.prev,l=s.next;if(r?Hp(s,n,i,r):Bp(s)){e.push(c.i,s.i,l.i),Mr(s),s=l.next,a=l.next;continue}if(s=l,s===a){o?o===1?(s=Vp(qi(s),e),_r(s,e,t,n,i,r,2)):o===2&&Gp(s,e,t,n,i,r):_r(qi(s),e,t,n,i,r,1);break}}}function Bp(s){const e=s.prev,t=s,n=s.next;if(Pt(e,t,n)>=0)return!1;const i=e.x,r=t.x,o=n.x,a=e.y,c=t.y,l=n.y,h=Math.min(i,r,o),u=Math.min(a,c,l),f=Math.max(i,r,o),d=Math.max(a,c,l);let m=n.next;for(;m!==e;){if(m.x>=h&&m.x<=f&&m.y>=u&&m.y<=d&&nr(i,a,r,c,o,l,m.x,m.y)&&Pt(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function Hp(s,e,t,n){const i=s.prev,r=s,o=s.next;if(Pt(i,r,o)>=0)return!1;const a=i.x,c=r.x,l=o.x,h=i.y,u=r.y,f=o.y,d=Math.min(a,c,l),m=Math.min(h,u,f),x=Math.max(a,c,l),g=Math.max(h,u,f),p=Tc(d,m,e,t,n),M=Tc(x,g,e,t,n);let v=s.prevZ,_=s.nextZ;for(;v&&v.z>=p&&_&&_.z<=M;){if(v.x>=d&&v.x<=x&&v.y>=m&&v.y<=g&&v!==i&&v!==o&&nr(a,h,c,u,l,f,v.x,v.y)&&Pt(v.prev,v,v.next)>=0||(v=v.prevZ,_.x>=d&&_.x<=x&&_.y>=m&&_.y<=g&&_!==i&&_!==o&&nr(a,h,c,u,l,f,_.x,_.y)&&Pt(_.prev,_,_.next)>=0))return!1;_=_.nextZ}for(;v&&v.z>=p;){if(v.x>=d&&v.x<=x&&v.y>=m&&v.y<=g&&v!==i&&v!==o&&nr(a,h,c,u,l,f,v.x,v.y)&&Pt(v.prev,v,v.next)>=0)return!1;v=v.prevZ}for(;_&&_.z<=M;){if(_.x>=d&&_.x<=x&&_.y>=m&&_.y<=g&&_!==i&&_!==o&&nr(a,h,c,u,l,f,_.x,_.y)&&Pt(_.prev,_,_.next)>=0)return!1;_=_.nextZ}return!0}function Vp(s,e){let t=s;do{const n=t.prev,i=t.next.next;!Ls(n,i)&&cf(n,t,t.next,i)&&yr(n,i)&&yr(i,n)&&(e.push(n.i,t.i,i.i),Mr(t),Mr(t.next),t=s=i),t=t.next}while(t!==s);return qi(t)}function Gp(s,e,t,n,i,r){let o=s;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&Jp(o,a)){let c=lf(o,a);o=qi(o,o.next),c=qi(c,c.next),_r(o,e,t,n,i,r,0),_r(c,e,t,n,i,r,0);return}a=a.next}o=o.next}while(o!==s)}function Wp(s,e,t,n){const i=[];for(let r=0,o=e.length;r<o;r++){const a=e[r]*n,c=r<o-1?e[r+1]*n:s.length,l=of(s,a,c,n,!1);l===l.next&&(l.steiner=!0),i.push($p(l))}i.sort(Xp);for(let r=0;r<i.length;r++)t=qp(i[r],t);return t}function Xp(s,e){let t=s.x-e.x;if(t===0&&(t=s.y-e.y,t===0)){const n=(s.next.y-s.y)/(s.next.x-s.x),i=(e.next.y-e.y)/(e.next.x-e.x);t=n-i}return t}function qp(s,e){const t=Yp(s,e);if(!t)return e;const n=lf(t,s);return qi(n,n.next),qi(t,t.next)}function Yp(s,e){let t=e;const n=s.x,i=s.y;let r=-1/0,o;if(Ls(s,t))return t;do{if(Ls(s,t.next))return t.next;if(i<=t.y&&i>=t.next.y&&t.next.y!==t.y){const u=t.x+(i-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(u<=n&&u>r&&(r=u,o=t.x<t.next.x?t:t.next,u===n))return o}t=t.next}while(t!==e);if(!o)return null;const a=o,c=o.x,l=o.y;let h=1/0;t=o;do{if(n>=t.x&&t.x>=c&&n!==t.x&&af(i<l?n:r,i,c,l,i<l?r:n,i,t.x,t.y)){const u=Math.abs(i-t.y)/(n-t.x);yr(t,s)&&(u<h||u===h&&(t.x>o.x||t.x===o.x&&jp(o,t)))&&(o=t,h=u)}t=t.next}while(t!==a);return o}function jp(s,e){return Pt(s.prev,s,e.prev)<0&&Pt(e.next,s,s.next)<0}function Kp(s,e,t,n){let i=s;do i.z===0&&(i.z=Tc(i.x,i.y,e,t,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==s);i.prevZ.nextZ=null,i.prevZ=null,Zp(i)}function Zp(s){let e,t=1;do{let n=s,i;s=null;let r=null;for(e=0;n;){e++;let o=n,a=0;for(let l=0;l<t&&(a++,o=o.nextZ,!!o);l++);let c=t;for(;a>0||c>0&&o;)a!==0&&(c===0||!o||n.z<=o.z)?(i=n,n=n.nextZ,a--):(i=o,o=o.nextZ,c--),r?r.nextZ=i:s=i,i.prevZ=r,r=i;n=o}r.nextZ=null,t*=2}while(e>1);return s}function Tc(s,e,t,n,i){return s=(s-t)*i|0,e=(e-n)*i|0,s=(s|s<<8)&16711935,s=(s|s<<4)&252645135,s=(s|s<<2)&858993459,s=(s|s<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,s|e<<1}function $p(s){let e=s,t=s;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==s);return t}function af(s,e,t,n,i,r,o,a){return(i-o)*(e-a)>=(s-o)*(r-a)&&(s-o)*(n-a)>=(t-o)*(e-a)&&(t-o)*(r-a)>=(i-o)*(n-a)}function nr(s,e,t,n,i,r,o,a){return!(s===o&&e===a)&&af(s,e,t,n,i,r,o,a)}function Jp(s,e){return s.next.i!==e.i&&s.prev.i!==e.i&&!Qp(s,e)&&(yr(s,e)&&yr(e,s)&&em(s,e)&&(Pt(s.prev,s,e.prev)||Pt(s,e.prev,e))||Ls(s,e)&&Pt(s.prev,s,s.next)>0&&Pt(e.prev,e,e.next)>0)}function Pt(s,e,t){return(e.y-s.y)*(t.x-e.x)-(e.x-s.x)*(t.y-e.y)}function Ls(s,e){return s.x===e.x&&s.y===e.y}function cf(s,e,t,n){const i=to(Pt(s,e,t)),r=to(Pt(s,e,n)),o=to(Pt(t,n,s)),a=to(Pt(t,n,e));return!!(i!==r&&o!==a||i===0&&eo(s,t,e)||r===0&&eo(s,n,e)||o===0&&eo(t,s,n)||a===0&&eo(t,e,n))}function eo(s,e,t){return e.x<=Math.max(s.x,t.x)&&e.x>=Math.min(s.x,t.x)&&e.y<=Math.max(s.y,t.y)&&e.y>=Math.min(s.y,t.y)}function to(s){return s>0?1:s<0?-1:0}function Qp(s,e){let t=s;do{if(t.i!==s.i&&t.next.i!==s.i&&t.i!==e.i&&t.next.i!==e.i&&cf(t,t.next,s,e))return!0;t=t.next}while(t!==s);return!1}function yr(s,e){return Pt(s.prev,s,s.next)<0?Pt(s,e,s.next)>=0&&Pt(s,s.prev,e)>=0:Pt(s,e,s.prev)<0||Pt(s,s.next,e)<0}function em(s,e){let t=s,n=!1;const i=(s.x+e.x)/2,r=(s.y+e.y)/2;do t.y>r!=t.next.y>r&&t.next.y!==t.y&&i<(t.next.x-t.x)*(r-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==s);return n}function lf(s,e){const t=Ec(s.i,s.x,s.y),n=Ec(e.i,e.x,e.y),i=s.next,r=e.prev;return s.next=e,e.prev=s,t.next=i,i.prev=t,n.next=t,t.prev=n,r.next=n,n.prev=r,n}function yh(s,e,t,n){const i=Ec(s,e,t);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function Mr(s){s.next.prev=s.prev,s.prev.next=s.next,s.prevZ&&(s.prevZ.nextZ=s.nextZ),s.nextZ&&(s.nextZ.prevZ=s.prevZ)}function Ec(s,e,t){return{i:s,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function tm(s,e,t,n){let i=0;for(let r=e,o=t-n;r<t;r+=n)i+=(s[o]-s[r])*(s[r+1]+s[o+1]),o=r;return i}class nm{static triangulate(e,t,n=2){return kp(e,t,n)}}class _s{static area(e){const t=e.length;let n=0;for(let i=t-1,r=0;r<t;i=r++)n+=e[i].x*e[r].y-e[r].x*e[i].y;return n*.5}static isClockWise(e){return _s.area(e)<0}static triangulateShape(e,t){const n=[],i=[],r=[];Mh(e),wh(n,e);let o=e.length;t.forEach(Mh);for(let c=0;c<t.length;c++)i.push(o),o+=t[c].length,wh(n,t[c]);const a=nm.triangulate(n,i);for(let c=0;c<a.length;c+=3)r.push(a.slice(c,c+3));return r}}function Mh(s){const e=s.length;e>2&&s[e-1].equals(s[0])&&s.pop()}function wh(s,e){for(let t=0;t<e.length;t++)s.push(e[t].x),s.push(e[t].y)}class ol extends wt{constructor(e=new rf([new le(.5,.5),new le(-.5,.5),new le(-.5,-.5),new le(.5,-.5)]),t={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];const n=this,i=[],r=[];for(let a=0,c=e.length;a<c;a++){const l=e[a];o(l)}this.setAttribute("position",new Ye(i,3)),this.setAttribute("uv",new Ye(r,2)),this.computeVertexNormals();function o(a){const c=[],l=t.curveSegments!==void 0?t.curveSegments:12,h=t.steps!==void 0?t.steps:1,u=t.depth!==void 0?t.depth:1;let f=t.bevelEnabled!==void 0?t.bevelEnabled:!0,d=t.bevelThickness!==void 0?t.bevelThickness:.2,m=t.bevelSize!==void 0?t.bevelSize:d-.1,x=t.bevelOffset!==void 0?t.bevelOffset:0,g=t.bevelSegments!==void 0?t.bevelSegments:3;const p=t.extrudePath,M=t.UVGenerator!==void 0?t.UVGenerator:im;let v,_=!1,w,b,y,A;p&&(v=p.getSpacedPoints(h),_=!0,f=!1,w=p.computeFrenetFrames(h,!1),b=new C,y=new C,A=new C),f||(g=0,d=0,m=0,x=0);const T=a.extractPoints(l);let S=T.shape;const L=T.holes;if(!_s.isClockWise(S)){S=S.reverse();for(let se=0,Z=L.length;se<Z;se++){const J=L[se];_s.isClockWise(J)&&(L[se]=J.reverse())}}function z(se){const J=10000000000000001e-36;let Q=se[0];for(let me=1;me<=se.length;me++){const he=me%se.length,ge=se[he],Xe=ge.x-Q.x,Be=ge.y-Q.y,P=Xe*Xe+Be*Be,E=Math.max(Math.abs(ge.x),Math.abs(ge.y),Math.abs(Q.x),Math.abs(Q.y)),H=J*E*E;if(P<=H){se.splice(he,1),me--;continue}Q=ge}}z(S),L.forEach(z);const N=L.length,F=S;for(let se=0;se<N;se++){const Z=L[se];S=S.concat(Z)}function V(se,Z,J){return Z||console.error("THREE.ExtrudeGeometry: vec does not exist"),se.clone().addScaledVector(Z,J)}const G=S.length;function B(se,Z,J){let Q,me,he;const ge=se.x-Z.x,Xe=se.y-Z.y,Be=J.x-se.x,P=J.y-se.y,E=ge*ge+Xe*Xe,H=ge*P-Xe*Be;if(Math.abs(H)>Number.EPSILON){const q=Math.sqrt(E),re=Math.sqrt(Be*Be+P*P),j=Z.x-Xe/q,Ie=Z.y+ge/q,pe=J.x-P/re,Ae=J.y+Be/re,Ce=((pe-j)*P-(Ae-Ie)*Be)/(ge*P-Xe*Be);Q=j+ge*Ce-se.x,me=Ie+Xe*Ce-se.y;const ue=Q*Q+me*me;if(ue<=2)return new le(Q,me);he=Math.sqrt(ue/2)}else{let q=!1;ge>Number.EPSILON?Be>Number.EPSILON&&(q=!0):ge<-Number.EPSILON?Be<-Number.EPSILON&&(q=!0):Math.sign(Xe)===Math.sign(P)&&(q=!0),q?(Q=-Xe,me=ge,he=Math.sqrt(E)):(Q=ge,me=Xe,he=Math.sqrt(E/2))}return new le(Q/he,me/he)}const $=[];for(let se=0,Z=F.length,J=Z-1,Q=se+1;se<Z;se++,J++,Q++)J===Z&&(J=0),Q===Z&&(Q=0),$[se]=B(F[se],F[J],F[Q]);const fe=[];let ce,Re=$.concat();for(let se=0,Z=N;se<Z;se++){const J=L[se];ce=[];for(let Q=0,me=J.length,he=me-1,ge=Q+1;Q<me;Q++,he++,ge++)he===me&&(he=0),ge===me&&(ge=0),ce[Q]=B(J[Q],J[he],J[ge]);fe.push(ce),Re=Re.concat(ce)}let Je;if(g===0)Je=_s.triangulateShape(F,L);else{const se=[],Z=[];for(let J=0;J<g;J++){const Q=J/g,me=d*Math.cos(Q*Math.PI/2),he=m*Math.sin(Q*Math.PI/2)+x;for(let ge=0,Xe=F.length;ge<Xe;ge++){const Be=V(F[ge],$[ge],he);Le(Be.x,Be.y,-me),Q===0&&se.push(Be)}for(let ge=0,Xe=N;ge<Xe;ge++){const Be=L[ge];ce=fe[ge];const P=[];for(let E=0,H=Be.length;E<H;E++){const q=V(Be[E],ce[E],he);Le(q.x,q.y,-me),Q===0&&P.push(q)}Q===0&&Z.push(P)}}Je=_s.triangulateShape(se,Z)}const ct=Je.length,tt=m+x;for(let se=0;se<G;se++){const Z=f?V(S[se],Re[se],tt):S[se];_?(y.copy(w.normals[0]).multiplyScalar(Z.x),b.copy(w.binormals[0]).multiplyScalar(Z.y),A.copy(v[0]).add(y).add(b),Le(A.x,A.y,A.z)):Le(Z.x,Z.y,0)}for(let se=1;se<=h;se++)for(let Z=0;Z<G;Z++){const J=f?V(S[Z],Re[Z],tt):S[Z];_?(y.copy(w.normals[se]).multiplyScalar(J.x),b.copy(w.binormals[se]).multiplyScalar(J.y),A.copy(v[se]).add(y).add(b),Le(A.x,A.y,A.z)):Le(J.x,J.y,u/h*se)}for(let se=g-1;se>=0;se--){const Z=se/g,J=d*Math.cos(Z*Math.PI/2),Q=m*Math.sin(Z*Math.PI/2)+x;for(let me=0,he=F.length;me<he;me++){const ge=V(F[me],$[me],Q);Le(ge.x,ge.y,u+J)}for(let me=0,he=L.length;me<he;me++){const ge=L[me];ce=fe[me];for(let Xe=0,Be=ge.length;Xe<Be;Xe++){const P=V(ge[Xe],ce[Xe],Q);_?Le(P.x,P.y+v[h-1].y,v[h-1].x+J):Le(P.x,P.y,u+J)}}}K(),ne();function K(){const se=i.length/3;if(f){let Z=0,J=G*Z;for(let Q=0;Q<ct;Q++){const me=Je[Q];Te(me[2]+J,me[1]+J,me[0]+J)}Z=h+g*2,J=G*Z;for(let Q=0;Q<ct;Q++){const me=Je[Q];Te(me[0]+J,me[1]+J,me[2]+J)}}else{for(let Z=0;Z<ct;Z++){const J=Je[Z];Te(J[2],J[1],J[0])}for(let Z=0;Z<ct;Z++){const J=Je[Z];Te(J[0]+G*h,J[1]+G*h,J[2]+G*h)}}n.addGroup(se,i.length/3-se,0)}function ne(){const se=i.length/3;let Z=0;Se(F,Z),Z+=F.length;for(let J=0,Q=L.length;J<Q;J++){const me=L[J];Se(me,Z),Z+=me.length}n.addGroup(se,i.length/3-se,1)}function Se(se,Z){let J=se.length;for(;--J>=0;){const Q=J;let me=J-1;me<0&&(me=se.length-1);for(let he=0,ge=h+g*2;he<ge;he++){const Xe=G*he,Be=G*(he+1),P=Z+Q+Xe,E=Z+me+Xe,H=Z+me+Be,q=Z+Q+Be;Ze(P,E,H,q)}}}function Le(se,Z,J){c.push(se),c.push(Z),c.push(J)}function Te(se,Z,J){ft(se),ft(Z),ft(J);const Q=i.length/3,me=M.generateTopUV(n,i,Q-3,Q-2,Q-1);I(me[0]),I(me[1]),I(me[2])}function Ze(se,Z,J,Q){ft(se),ft(Z),ft(Q),ft(Z),ft(J),ft(Q);const me=i.length/3,he=M.generateSideWallUV(n,i,me-6,me-3,me-2,me-1);I(he[0]),I(he[1]),I(he[3]),I(he[1]),I(he[2]),I(he[3])}function ft(se){i.push(c[se*3+0]),i.push(c[se*3+1]),i.push(c[se*3+2])}function I(se){r.push(se.x),r.push(se.y)}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON(),t=this.parameters.shapes,n=this.parameters.options;return sm(t,n,e)}static fromJSON(e,t){const n=[];for(let r=0,o=e.shapes.length;r<o;r++){const a=t[e.shapes[r]];n.push(a)}const i=e.options.extrudePath;return i!==void 0&&(e.options.extrudePath=new Eo[i.type]().fromJSON(i)),new ol(n,e.options)}}const im={generateTopUV:function(s,e,t,n,i){const r=e[t*3],o=e[t*3+1],a=e[n*3],c=e[n*3+1],l=e[i*3],h=e[i*3+1];return[new le(r,o),new le(a,c),new le(l,h)]},generateSideWallUV:function(s,e,t,n,i,r){const o=e[t*3],a=e[t*3+1],c=e[t*3+2],l=e[n*3],h=e[n*3+1],u=e[n*3+2],f=e[i*3],d=e[i*3+1],m=e[i*3+2],x=e[r*3],g=e[r*3+1],p=e[r*3+2];return Math.abs(a-h)<Math.abs(o-l)?[new le(o,1-c),new le(l,1-u),new le(f,1-m),new le(x,1-p)]:[new le(a,1-c),new le(h,1-u),new le(d,1-m),new le(g,1-p)]}};function sm(s,e,t){if(t.shapes=[],Array.isArray(s))for(let n=0,i=s.length;n<i;n++){const r=s[n];t.shapes.push(r.uuid)}else t.shapes.push(s.uuid);return t.options=Object.assign({},e),e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}class Do extends il{constructor(e=1,t=0){const n=(1+Math.sqrt(5))/2,i=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],r=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(i,r,e,t),this.type="IcosahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new Do(e.radius,e.detail)}}class al extends wt{constructor(e=[new le(0,-.5),new le(.5,0),new le(0,.5)],t=12,n=0,i=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:e,segments:t,phiStart:n,phiLength:i},t=Math.floor(t),i=et(i,0,Math.PI*2);const r=[],o=[],a=[],c=[],l=[],h=1/t,u=new C,f=new le,d=new C,m=new C,x=new C;let g=0,p=0;for(let M=0;M<=e.length-1;M++)switch(M){case 0:g=e[M+1].x-e[M].x,p=e[M+1].y-e[M].y,d.x=p*1,d.y=-g,d.z=p*0,x.copy(d),d.normalize(),c.push(d.x,d.y,d.z);break;case e.length-1:c.push(x.x,x.y,x.z);break;default:g=e[M+1].x-e[M].x,p=e[M+1].y-e[M].y,d.x=p*1,d.y=-g,d.z=p*0,m.copy(d),d.x+=x.x,d.y+=x.y,d.z+=x.z,d.normalize(),c.push(d.x,d.y,d.z),x.copy(m)}for(let M=0;M<=t;M++){const v=n+M*h*i,_=Math.sin(v),w=Math.cos(v);for(let b=0;b<=e.length-1;b++){u.x=e[b].x*_,u.y=e[b].y,u.z=e[b].x*w,o.push(u.x,u.y,u.z),f.x=M/t,f.y=b/(e.length-1),a.push(f.x,f.y);const y=c[3*b+0]*_,A=c[3*b+1],T=c[3*b+0]*w;l.push(y,A,T)}}for(let M=0;M<t;M++)for(let v=0;v<e.length-1;v++){const _=v+M*e.length,w=_,b=_+e.length,y=_+e.length+1,A=_+1;r.push(w,b,A),r.push(y,A,b)}this.setIndex(r),this.setAttribute("position",new Ye(o,3)),this.setAttribute("uv",new Ye(a,2)),this.setAttribute("normal",new Ye(l,3))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new al(e.points,e.segments,e.phiStart,e.phiLength)}}class Un extends wt{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};const r=e/2,o=t/2,a=Math.floor(n),c=Math.floor(i),l=a+1,h=c+1,u=e/a,f=t/c,d=[],m=[],x=[],g=[];for(let p=0;p<h;p++){const M=p*f-o;for(let v=0;v<l;v++){const _=v*u-r;m.push(_,-M,0),x.push(0,0,1),g.push(v/a),g.push(1-p/c)}}for(let p=0;p<c;p++)for(let M=0;M<a;M++){const v=M+l*p,_=M+l*(p+1),w=M+1+l*(p+1),b=M+1+l*p;d.push(v,_,b),d.push(_,w,b)}this.setIndex(d),this.setAttribute("position",new Ye(m,3)),this.setAttribute("normal",new Ye(x,3)),this.setAttribute("uv",new Ye(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Un(e.width,e.height,e.widthSegments,e.heightSegments)}}class an extends wt{constructor(e=1,t=32,n=16,i=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:i,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const c=Math.min(o+a,Math.PI);let l=0;const h=[],u=new C,f=new C,d=[],m=[],x=[],g=[];for(let p=0;p<=n;p++){const M=[],v=p/n;let _=0;p===0&&o===0?_=.5/t:p===n&&c===Math.PI&&(_=-.5/t);for(let w=0;w<=t;w++){const b=w/t;u.x=-e*Math.cos(i+b*r)*Math.sin(o+v*a),u.y=e*Math.cos(o+v*a),u.z=e*Math.sin(i+b*r)*Math.sin(o+v*a),m.push(u.x,u.y,u.z),f.copy(u).normalize(),x.push(f.x,f.y,f.z),g.push(b+_,1-v),M.push(l++)}h.push(M)}for(let p=0;p<n;p++)for(let M=0;M<t;M++){const v=h[p][M+1],_=h[p][M],w=h[p+1][M],b=h[p+1][M+1];(p!==0||o>0)&&d.push(v,_,b),(p!==n-1||c<Math.PI)&&d.push(_,w,b)}this.setIndex(d),this.setAttribute("position",new Ye(m,3)),this.setAttribute("normal",new Ye(x,3)),this.setAttribute("uv",new Ye(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new an(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class cl extends wt{constructor(e=new nf(new C(-1,-1,0),new C(-1,1,0),new C(1,1,0)),t=64,n=1,i=8,r=!1){super(),this.type="TubeGeometry",this.parameters={path:e,tubularSegments:t,radius:n,radialSegments:i,closed:r};const o=e.computeFrenetFrames(t,r);this.tangents=o.tangents,this.normals=o.normals,this.binormals=o.binormals;const a=new C,c=new C,l=new le;let h=new C;const u=[],f=[],d=[],m=[];x(),this.setIndex(m),this.setAttribute("position",new Ye(u,3)),this.setAttribute("normal",new Ye(f,3)),this.setAttribute("uv",new Ye(d,2));function x(){for(let v=0;v<t;v++)g(v);g(r===!1?t:0),M(),p()}function g(v){h=e.getPointAt(v/t,h);const _=o.normals[v],w=o.binormals[v];for(let b=0;b<=i;b++){const y=b/i*Math.PI*2,A=Math.sin(y),T=-Math.cos(y);c.x=T*_.x+A*w.x,c.y=T*_.y+A*w.y,c.z=T*_.z+A*w.z,c.normalize(),f.push(c.x,c.y,c.z),a.x=h.x+n*c.x,a.y=h.y+n*c.y,a.z=h.z+n*c.z,u.push(a.x,a.y,a.z)}}function p(){for(let v=1;v<=t;v++)for(let _=1;_<=i;_++){const w=(i+1)*(v-1)+(_-1),b=(i+1)*v+(_-1),y=(i+1)*v+_,A=(i+1)*(v-1)+_;m.push(w,b,A),m.push(b,y,A)}}function M(){for(let v=0;v<=t;v++)for(let _=0;_<=i;_++)l.x=v/t,l.y=_/i,d.push(l.x,l.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){const e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(e){return new cl(new Eo[e.path.type]().fromJSON(e.path),e.tubularSegments,e.radius,e.radialSegments,e.closed)}}class Dt extends Wn{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Me(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Me(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Bu,this.normalScale=new le(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new wn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Nn extends Dt{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new le(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return et(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Me(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Me(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Me(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}}class hf extends Wn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=yd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class rm extends Wn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}function no(s,e){return!s||s.constructor===e?s:typeof e.BYTES_PER_ELEMENT=="number"?new e(s):Array.prototype.slice.call(s)}function om(s){return ArrayBuffer.isView(s)&&!(s instanceof DataView)}function am(s){function e(i,r){return s[i]-s[r]}const t=s.length,n=new Array(t);for(let i=0;i!==t;++i)n[i]=i;return n.sort(e),n}function bh(s,e,t){const n=s.length,i=new s.constructor(n);for(let r=0,o=0;o!==n;++r){const a=t[r]*e;for(let c=0;c!==e;++c)i[o++]=s[a+c]}return i}function uf(s,e,t,n){let i=1,r=s[0];for(;r!==void 0&&r[n]===void 0;)r=s[i++];if(r===void 0)return;let o=r[n];if(o!==void 0)if(Array.isArray(o))do o=r[n],o!==void 0&&(e.push(r.time),t.push(...o)),r=s[i++];while(r!==void 0);else if(o.toArray!==void 0)do o=r[n],o!==void 0&&(e.push(r.time),o.toArray(t,t.length)),r=s[i++];while(r!==void 0);else do o=r[n],o!==void 0&&(e.push(r.time),t.push(o)),r=s[i++];while(r!==void 0)}class Sr{constructor(e,t,n,i){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){const t=this.parameterPositions;let n=this._cachedIndex,i=t[n],r=t[n-1];n:{e:{let o;t:{i:if(!(e<i)){for(let a=n+2;;){if(i===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=i,i=t[++n],e<i)break e}o=t.length;break t}if(!(e>=r)){const a=t[1];e<a&&(n=2,r=a);for(let c=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(i=r,r=t[--n-1],e>=r)break e}o=n,n=0;break t}break n}for(;n<o;){const a=n+o>>>1;e<t[a]?o=a:n=a+1}if(i=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,i)}return this.interpolate_(n,r,e,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,r=e*i;for(let o=0;o!==i;++o)t[o]=n[r+o];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}}class cm extends Sr{constructor(e,t,n,i){super(e,t,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Nl,endingEnd:Nl}}intervalChanged_(e,t,n){const i=this.parameterPositions;let r=e-2,o=e+1,a=i[r],c=i[o];if(a===void 0)switch(this.getSettings_().endingStart){case zl:r=e,a=2*t-n;break;case Fl:r=i.length-2,a=t+i[r]-i[r+1];break;default:r=e,a=n}if(c===void 0)switch(this.getSettings_().endingEnd){case zl:o=e,c=2*n-t;break;case Fl:o=1,c=n+i[1]-i[0];break;default:o=e-1,c=t}const l=(n-t)*.5,h=this.valueSize;this._weightPrev=l/(t-a),this._weightNext=l/(c-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(e,t,n,i){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,h=this._offsetPrev,u=this._offsetNext,f=this._weightPrev,d=this._weightNext,m=(n-t)/(i-t),x=m*m,g=x*m,p=-f*g+2*f*x-f*m,M=(1+f)*g+(-1.5-2*f)*x+(-.5+f)*m+1,v=(-1-d)*g+(1.5+d)*x+.5*m,_=d*g-d*x;for(let w=0;w!==a;++w)r[w]=p*o[h+w]+M*o[l+w]+v*o[c+w]+_*o[u+w];return r}}class lm extends Sr{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,h=(n-t)/(i-t),u=1-h;for(let f=0;f!==a;++f)r[f]=o[l+f]*u+o[c+f]*h;return r}}class hm extends Sr{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e){return this.copySampleValue_(e-1)}}class zn{constructor(e,t,n,i){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=no(t,this.TimeBufferType),this.values=no(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(e){const t=e.constructor;let n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:no(e.times,Array),values:no(e.values,Array)};const i=e.getInterpolation();i!==e.DefaultInterpolation&&(n.interpolation=i)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new hm(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new lm(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new cm(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case mr:t=this.InterpolantFactoryMethodDiscrete;break;case gr:t=this.InterpolantFactoryMethodLinear;break;case Vo:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){const n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return mr;case this.InterpolantFactoryMethodLinear:return gr;case this.InterpolantFactoryMethodSmooth:return Vo}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){const t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]+=e}return this}scale(e){if(e!==1){const t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]*=e}return this}trim(e,t){const n=this.times,i=n.length;let r=0,o=i-1;for(;r!==i&&n[r]<e;)++r;for(;o!==-1&&n[o]>t;)--o;if(++o,r!==0||o!==i){r>=o&&(o=Math.max(o,1),r=o-1);const a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let e=!0;const t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);const n=this.times,i=this.values,r=n.length;r===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==r;a++){const c=n[a];if(typeof c=="number"&&isNaN(c)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,a,c),e=!1;break}if(o!==null&&o>c){console.error("THREE.KeyframeTrack: Out of order keys.",this,a,c,o),e=!1;break}o=c}if(i!==void 0&&om(i))for(let a=0,c=i.length;a!==c;++a){const l=i[a];if(isNaN(l)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,a,l),e=!1;break}}return e}optimize(){const e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),i=this.getInterpolation()===Vo,r=e.length-1;let o=1;for(let a=1;a<r;++a){let c=!1;const l=e[a],h=e[a+1];if(l!==h&&(a!==1||l!==e[0]))if(i)c=!0;else{const u=a*n,f=u-n,d=u+n;for(let m=0;m!==n;++m){const x=t[u+m];if(x!==t[f+m]||x!==t[d+m]){c=!0;break}}}if(c){if(a!==o){e[o]=e[a];const u=a*n,f=o*n;for(let d=0;d!==n;++d)t[f+d]=t[u+d]}++o}}if(r>0){e[o]=e[r];for(let a=r*n,c=o*n,l=0;l!==n;++l)t[c+l]=t[a+l];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=t.slice(0,o*n)):(this.times=e,this.values=t),this}clone(){const e=this.times.slice(),t=this.values.slice(),n=this.constructor,i=new n(this.name,e,t);return i.createInterpolant=this.createInterpolant,i}}zn.prototype.ValueTypeName="";zn.prototype.TimeBufferType=Float32Array;zn.prototype.ValueBufferType=Float32Array;zn.prototype.DefaultInterpolation=gr;class Os extends zn{constructor(e,t,n){super(e,t,n)}}Os.prototype.ValueTypeName="bool";Os.prototype.ValueBufferType=Array;Os.prototype.DefaultInterpolation=mr;Os.prototype.InterpolantFactoryMethodLinear=void 0;Os.prototype.InterpolantFactoryMethodSmooth=void 0;class ff extends zn{constructor(e,t,n,i){super(e,t,n,i)}}ff.prototype.ValueTypeName="color";class Is extends zn{constructor(e,t,n,i){super(e,t,n,i)}}Is.prototype.ValueTypeName="number";class um extends Sr{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=(n-t)/(i-t);let l=e*a;for(let h=l+a;l!==h;l+=4)bn.slerpFlat(r,0,o,l-a,o,l,c);return r}}class Ds extends zn{constructor(e,t,n,i){super(e,t,n,i)}InterpolantFactoryMethodLinear(e){return new um(this.times,this.values,this.getValueSize(),e)}}Ds.prototype.ValueTypeName="quaternion";Ds.prototype.InterpolantFactoryMethodSmooth=void 0;class ks extends zn{constructor(e,t,n){super(e,t,n)}}ks.prototype.ValueTypeName="string";ks.prototype.ValueBufferType=Array;ks.prototype.DefaultInterpolation=mr;ks.prototype.InterpolantFactoryMethodLinear=void 0;ks.prototype.InterpolantFactoryMethodSmooth=void 0;class Us extends zn{constructor(e,t,n,i){super(e,t,n,i)}}Us.prototype.ValueTypeName="vector";class fm{constructor(e="",t=-1,n=[],i=vd){this.name=e,this.tracks=n,this.duration=t,this.blendMode=i,this.uuid=Mn(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){const t=[],n=e.tracks,i=1/(e.fps||1);for(let o=0,a=n.length;o!==a;++o)t.push(pm(n[o]).scale(i));const r=new this(e.name,e.duration,t,e.blendMode);return r.uuid=e.uuid,r.userData=JSON.parse(e.userData||"{}"),r}static toJSON(e){const t=[],n=e.tracks,i={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let r=0,o=n.length;r!==o;++r)t.push(zn.toJSON(n[r]));return i}static CreateFromMorphTargetSequence(e,t,n,i){const r=t.length,o=[];for(let a=0;a<r;a++){let c=[],l=[];c.push((a+r-1)%r,a,(a+1)%r),l.push(0,1,0);const h=am(c);c=bh(c,1,h),l=bh(l,1,h),!i&&c[0]===0&&(c.push(r),l.push(l[0])),o.push(new Is(".morphTargetInfluences["+t[a].name+"]",c,l).scale(1/n))}return new this(e,-1,o)}static findByName(e,t){let n=e;if(!Array.isArray(e)){const i=e;n=i.geometry&&i.geometry.animations||i.animations}for(let i=0;i<n.length;i++)if(n[i].name===t)return n[i];return null}static CreateClipsFromMorphTargetSequences(e,t,n){const i={},r=/^([\w-]*?)([\d]+)$/;for(let a=0,c=e.length;a<c;a++){const l=e[a],h=l.name.match(r);if(h&&h.length>1){const u=h[1];let f=i[u];f||(i[u]=f=[]),f.push(l)}}const o=[];for(const a in i)o.push(this.CreateFromMorphTargetSequence(a,i[a],t,n));return o}static parseAnimation(e,t){if(console.warn("THREE.AnimationClip: parseAnimation() is deprecated and will be removed with r185"),!e)return console.error("THREE.AnimationClip: No animation in JSONLoader data."),null;const n=function(u,f,d,m,x){if(d.length!==0){const g=[],p=[];uf(d,g,p,m),g.length!==0&&x.push(new u(f,g,p))}},i=[],r=e.name||"default",o=e.fps||30,a=e.blendMode;let c=e.length||-1;const l=e.hierarchy||[];for(let u=0;u<l.length;u++){const f=l[u].keys;if(!(!f||f.length===0))if(f[0].morphTargets){const d={};let m;for(m=0;m<f.length;m++)if(f[m].morphTargets)for(let x=0;x<f[m].morphTargets.length;x++)d[f[m].morphTargets[x]]=-1;for(const x in d){const g=[],p=[];for(let M=0;M!==f[m].morphTargets.length;++M){const v=f[m];g.push(v.time),p.push(v.morphTarget===x?1:0)}i.push(new Is(".morphTargetInfluence["+x+"]",g,p))}c=d.length*o}else{const d=".bones["+t[u].name+"]";n(Us,d+".position",f,"pos",i),n(Ds,d+".quaternion",f,"rot",i),n(Us,d+".scale",f,"scl",i)}}return i.length===0?null:new this(r,c,i,a)}resetDuration(){const e=this.tracks;let t=0;for(let n=0,i=e.length;n!==i;++n){const r=this.tracks[n];t=Math.max(t,r.times[r.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){const e=[];for(let n=0;n<this.tracks.length;n++)e.push(this.tracks[n].clone());const t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}}function dm(s){switch(s.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return Is;case"vector":case"vector2":case"vector3":case"vector4":return Us;case"color":return ff;case"quaternion":return Ds;case"bool":case"boolean":return Os;case"string":return ks}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+s)}function pm(s){if(s.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");const e=dm(s.type);if(s.times===void 0){const t=[],n=[];uf(s.keys,t,n,"value"),s.times=t,s.values=n}return e.parse!==void 0?e.parse(s):new e(s.name,s.times,s.values,s.interpolation)}const si={enabled:!1,files:{},add:function(s,e){this.enabled!==!1&&(this.files[s]=e)},get:function(s){if(this.enabled!==!1)return this.files[s]},remove:function(s){delete this.files[s]},clear:function(){this.files={}}};class mm{constructor(e,t,n){const i=this;let r=!1,o=0,a=0,c;const l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.abortController=new AbortController,this.itemStart=function(h){a++,r===!1&&i.onStart!==void 0&&i.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,i.onProgress!==void 0&&i.onProgress(h,o,a),o===a&&(r=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,u){return l.push(h,u),this},this.removeHandler=function(h){const u=l.indexOf(h);return u!==-1&&l.splice(u,2),this},this.getHandler=function(h){for(let u=0,f=l.length;u<f;u+=2){const d=l[u],m=l[u+1];if(d.global&&(d.lastIndex=0),d.test(h))return m}return null},this.abort=function(){return this.abortController.abort(),this.abortController=new AbortController,this}}}const gm=new mm;class Bs{constructor(e){this.manager=e!==void 0?e:gm,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const n=this;return new Promise(function(i,r){n.load(e,i,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}Bs.DEFAULT_MATERIAL_NAME="__DEFAULT";const ei={};class xm extends Error{constructor(e,t){super(e),this.response=t}}class df extends Bs{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=si.get(`file:${e}`);if(r!==void 0)return this.manager.itemStart(e),setTimeout(()=>{t&&t(r),this.manager.itemEnd(e)},0),r;if(ei[e]!==void 0){ei[e].push({onLoad:t,onProgress:n,onError:i});return}ei[e]=[],ei[e].push({onLoad:t,onProgress:n,onError:i});const o=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),a=this.mimeType,c=this.responseType;fetch(o).then(l=>{if(l.status===200||l.status===0){if(l.status===0&&console.warn("THREE.FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||l.body===void 0||l.body.getReader===void 0)return l;const h=ei[e],u=l.body.getReader(),f=l.headers.get("X-File-Size")||l.headers.get("Content-Length"),d=f?parseInt(f):0,m=d!==0;let x=0;const g=new ReadableStream({start(p){M();function M(){u.read().then(({done:v,value:_})=>{if(v)p.close();else{x+=_.byteLength;const w=new ProgressEvent("progress",{lengthComputable:m,loaded:x,total:d});for(let b=0,y=h.length;b<y;b++){const A=h[b];A.onProgress&&A.onProgress(w)}p.enqueue(_),M()}},v=>{p.error(v)})}}});return new Response(g)}else throw new xm(`fetch for "${l.url}" responded with ${l.status}: ${l.statusText}`,l)}).then(l=>{switch(c){case"arraybuffer":return l.arrayBuffer();case"blob":return l.blob();case"document":return l.text().then(h=>new DOMParser().parseFromString(h,a));case"json":return l.json();default:if(a==="")return l.text();{const u=/charset="?([^;"\s]*)"?/i.exec(a),f=u&&u[1]?u[1].toLowerCase():void 0,d=new TextDecoder(f);return l.arrayBuffer().then(m=>d.decode(m))}}}).then(l=>{si.add(`file:${e}`,l);const h=ei[e];delete ei[e];for(let u=0,f=h.length;u<f;u++){const d=h[u];d.onLoad&&d.onLoad(l)}}).catch(l=>{const h=ei[e];if(h===void 0)throw this.manager.itemError(e),l;delete ei[e];for(let u=0,f=h.length;u<f;u++){const d=h[u];d.onError&&d.onError(l)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const fs=new WeakMap;class vm extends Bs{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,o=si.get(`image:${e}`);if(o!==void 0){if(o.complete===!0)r.manager.itemStart(e),setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0);else{let u=fs.get(o);u===void 0&&(u=[],fs.set(o,u)),u.push({onLoad:t,onError:i})}return o}const a=xr("img");function c(){h(),t&&t(this);const u=fs.get(this)||[];for(let f=0;f<u.length;f++){const d=u[f];d.onLoad&&d.onLoad(this)}fs.delete(this),r.manager.itemEnd(e)}function l(u){h(),i&&i(u),si.remove(`image:${e}`);const f=fs.get(this)||[];for(let d=0;d<f.length;d++){const m=f[d];m.onError&&m.onError(u)}fs.delete(this),r.manager.itemError(e),r.manager.itemEnd(e)}function h(){a.removeEventListener("load",c,!1),a.removeEventListener("error",l,!1)}return a.addEventListener("load",c,!1),a.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),si.add(`image:${e}`,a),r.manager.itemStart(e),a.src=e,a}}class pf extends Bs{constructor(e){super(e)}load(e,t,n,i){const r=new Ft,o=new vm(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(e,function(a){r.image=a,r.needsUpdate=!0,t!==void 0&&t(r)},n,i),r}}class Uo extends ut{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Me(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class _m extends Uo{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(ut.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Me(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const xa=new qe,Sh=new C,Th=new C;class ll{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new le(512,512),this.mapType=Xn,this.map=null,this.mapPass=null,this.matrix=new qe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Qc,this._frameExtents=new le(1,1),this._viewportCount=1,this._viewports=[new at(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;Sh.setFromMatrixPosition(e.matrixWorld),t.position.copy(Sh),Th.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Th),t.updateMatrixWorld(),xa.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(xa,t.coordinateSystem,t.reversedDepth),t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(xa)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class ym extends ll{constructor(){super(new Kt(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){const t=this.camera,n=Cs*2*e.angle*this.focus,i=this.mapSize.width/this.mapSize.height*this.aspect,r=e.distance||t.far;(n!==t.fov||i!==t.aspect||r!==t.far)&&(t.fov=n,t.aspect=i,t.far=r,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}}class Mm extends Uo{constructor(e,t,n=0,i=Math.PI/3,r=0,o=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(ut.DEFAULT_UP),this.updateMatrix(),this.target=new ut,this.distance=n,this.angle=i,this.penumbra=r,this.decay=o,this.map=null,this.shadow=new ym}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}const Eh=new qe,$s=new C,va=new C;class wm extends ll{constructor(){super(new Kt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new le(4,2),this._viewportCount=6,this._viewports=[new at(2,1,1,1),new at(0,1,1,1),new at(3,1,1,1),new at(1,1,1,1),new at(3,0,1,1),new at(1,0,1,1)],this._cubeDirections=[new C(1,0,0),new C(-1,0,0),new C(0,0,1),new C(0,0,-1),new C(0,1,0),new C(0,-1,0)],this._cubeUps=[new C(0,1,0),new C(0,1,0),new C(0,1,0),new C(0,1,0),new C(0,0,1),new C(0,0,-1)]}updateMatrices(e,t=0){const n=this.camera,i=this.matrix,r=e.distance||n.far;r!==n.far&&(n.far=r,n.updateProjectionMatrix()),$s.setFromMatrixPosition(e.matrixWorld),n.position.copy($s),va.copy(n.position),va.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(va),n.updateMatrixWorld(),i.makeTranslation(-$s.x,-$s.y,-$s.z),Eh.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Eh,n.coordinateSystem,n.reversedDepth)}}class bm extends Uo{constructor(e,t,n=0,i=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new wm}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}}class hl extends Lo{constructor(e=-1,t=1,n=1,i=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let r=n-e,o=n+e,a=i+t,c=i-t;if(this.view!==null&&this.view.enabled){const l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,o=r+l*this.view.width,a-=h*this.view.offsetY,c=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Sm extends ll{constructor(){super(new hl(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class mf extends Uo{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(ut.DEFAULT_UP),this.updateMatrix(),this.target=new ut,this.shadow=new Sm}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class lr{static extractUrlBase(e){const t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}}const _a=new WeakMap;class Tm extends Bs{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&console.warn("THREE.ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const r=this,o=si.get(`image-bitmap:${e}`);if(o!==void 0){if(r.manager.itemStart(e),o.then){o.then(l=>{if(_a.has(o)===!0)i&&i(_a.get(o)),r.manager.itemError(e),r.manager.itemEnd(e);else return t&&t(l),r.manager.itemEnd(e),l});return}return setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0),o}const a={};a.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",a.headers=this.requestHeader,a.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;const c=fetch(e,a).then(function(l){return l.blob()}).then(function(l){return createImageBitmap(l,Object.assign(r.options,{colorSpaceConversion:"none"}))}).then(function(l){return si.add(`image-bitmap:${e}`,l),t&&t(l),r.manager.itemEnd(e),l}).catch(function(l){i&&i(l),_a.set(c,l),si.remove(`image-bitmap:${e}`),r.manager.itemError(e),r.manager.itemEnd(e)});si.add(`image-bitmap:${e}`,c),r.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}class Em extends Kt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}const ul="\\[\\]\\.:\\/",Am=new RegExp("["+ul+"]","g"),fl="[^"+ul+"]",Rm="[^"+ul.replace("\\.","")+"]",Cm=/((?:WC+[\/:])*)/.source.replace("WC",fl),Pm=/(WCOD+)?/.source.replace("WCOD",Rm),Lm=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",fl),Im=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",fl),Dm=new RegExp("^"+Cm+Pm+Lm+Im+"$"),Um=["material","materials","bones","map"];class Nm{constructor(e,t,n){const i=n||mt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,i)}getValue(e,t){this.bind();const n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(e,t)}setValue(e,t){const n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,r=n.length;i!==r;++i)n[i].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}}class mt{constructor(e,t,n){this.path=t,this.parsedPath=n||mt.parseTrackName(t),this.node=mt.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new mt.Composite(e,t,n):new mt(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Am,"")}static parseTrackName(e){const t=Dm.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);const n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){const r=n.nodeName.substring(i+1);Um.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,i),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){const n=function(r){for(let o=0;o<r.length;o++){const a=r[o];if(a.name===t||a.uuid===t)return a;const c=n(a.children);if(c)return c}return null},i=n(e.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){const n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)e[t++]=n[i]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const n=this.resolvedProperty;for(let i=0,r=n.length;i!==r;++i)n[i]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,n=t.objectName,i=t.propertyName;let r=t.propertyIndex;if(e||(e=mt.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=t.objectIndex;switch(n){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===l){l=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(l!==void 0){if(e[l]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}const o=e[i];if(o===void 0){const l=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+l+"."+i+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?a=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(r!==void 0){if(i==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}mt.Composite=Nm;mt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};mt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};mt.prototype.GetterByBindingType=[mt.prototype._getValue_direct,mt.prototype._getValue_array,mt.prototype._getValue_arrayElement,mt.prototype._getValue_toArray];mt.prototype.SetterByBindingTypeAndVersioning=[[mt.prototype._setValue_direct,mt.prototype._setValue_direct_setNeedsUpdate,mt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[mt.prototype._setValue_array,mt.prototype._setValue_array_setNeedsUpdate,mt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[mt.prototype._setValue_arrayElement,mt.prototype._setValue_arrayElement_setNeedsUpdate,mt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[mt.prototype._setValue_fromArray,mt.prototype._setValue_fromArray_setNeedsUpdate,mt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];const Ah=new qe;class zm{constructor(e,t,n=0,i=1/0){this.ray=new br(e,t),this.near=n,this.far=i,this.camera=null,this.layers=new Yc,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Ah.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Ah),this}intersectObject(e,t=!0,n=[]){return Ac(e,this,n,t),n.sort(Rh),n}intersectObjects(e,t=!0,n=[]){for(let i=0,r=e.length;i<r;i++)Ac(e[i],this,n,t);return n.sort(Rh),n}}function Rh(s,e){return s.distance-e.distance}function Ac(s,e,t,n){let i=!0;if(s.layers.test(e.layers)&&s.raycast(e,t)===!1&&(i=!1),i===!0&&n===!0){const r=s.children;for(let o=0,a=r.length;o<a;o++)Ac(r[o],e,t,!0)}}function Ch(s,e,t,n){const i=Fm(n);switch(t){case Nu:return s*e;case Hc:return s*e/i.components*i.byteLength;case Vc:return s*e/i.components*i.byteLength;case Fu:return s*e*2/i.components*i.byteLength;case Gc:return s*e*2/i.components*i.byteLength;case zu:return s*e*3/i.components*i.byteLength;case fn:return s*e*4/i.components*i.byteLength;case Wc:return s*e*4/i.components*i.byteLength;case ho:case uo:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case fo:case po:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case ja:case Za:return Math.max(s,16)*Math.max(e,8)/4;case Ya:case Ka:return Math.max(s,8)*Math.max(e,8)/2;case $a:case Ja:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*8;case Qa:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case ec:return Math.floor((s+3)/4)*Math.floor((e+3)/4)*16;case tc:return Math.floor((s+4)/5)*Math.floor((e+3)/4)*16;case nc:return Math.floor((s+4)/5)*Math.floor((e+4)/5)*16;case ic:return Math.floor((s+5)/6)*Math.floor((e+4)/5)*16;case sc:return Math.floor((s+5)/6)*Math.floor((e+5)/6)*16;case rc:return Math.floor((s+7)/8)*Math.floor((e+4)/5)*16;case oc:return Math.floor((s+7)/8)*Math.floor((e+5)/6)*16;case ac:return Math.floor((s+7)/8)*Math.floor((e+7)/8)*16;case cc:return Math.floor((s+9)/10)*Math.floor((e+4)/5)*16;case lc:return Math.floor((s+9)/10)*Math.floor((e+5)/6)*16;case hc:return Math.floor((s+9)/10)*Math.floor((e+7)/8)*16;case uc:return Math.floor((s+9)/10)*Math.floor((e+9)/10)*16;case fc:return Math.floor((s+11)/12)*Math.floor((e+9)/10)*16;case dc:return Math.floor((s+11)/12)*Math.floor((e+11)/12)*16;case pc:case mc:case gc:return Math.ceil(s/4)*Math.ceil(e/4)*16;case xc:case vc:return Math.ceil(s/4)*Math.ceil(e/4)*8;case _c:case yc:return Math.ceil(s/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Fm(s){switch(s){case Xn:case Lu:return{byteLength:1,components:1};case ur:case Iu:case li:return{byteLength:2,components:1};case kc:case Bc:return{byteLength:2,components:4};case Ei:case Oc:case Ln:return{byteLength:4,components:1};case Du:case Uu:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${s}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Fc}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Fc);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function gf(){let s=null,e=!1,t=null,n=null;function i(r,o){t(r,o),n=s.requestAnimationFrame(i)}return{start:function(){e!==!0&&t!==null&&(n=s.requestAnimationFrame(i),e=!0)},stop:function(){s.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){s=r}}}function Om(s){const e=new WeakMap;function t(a,c){const l=a.array,h=a.usage,u=l.byteLength,f=s.createBuffer();s.bindBuffer(c,f),s.bufferData(c,l,h),a.onUploadCallback();let d;if(l instanceof Float32Array)d=s.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)d=s.HALF_FLOAT;else if(l instanceof Uint16Array)a.isFloat16BufferAttribute?d=s.HALF_FLOAT:d=s.UNSIGNED_SHORT;else if(l instanceof Int16Array)d=s.SHORT;else if(l instanceof Uint32Array)d=s.UNSIGNED_INT;else if(l instanceof Int32Array)d=s.INT;else if(l instanceof Int8Array)d=s.BYTE;else if(l instanceof Uint8Array)d=s.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)d=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:f,type:d,bytesPerElement:l.BYTES_PER_ELEMENT,version:a.version,size:u}}function n(a,c,l){const h=c.array,u=c.updateRanges;if(s.bindBuffer(l,a),u.length===0)s.bufferSubData(l,0,h);else{u.sort((d,m)=>d.start-m.start);let f=0;for(let d=1;d<u.length;d++){const m=u[f],x=u[d];x.start<=m.start+m.count+1?m.count=Math.max(m.count,x.start+x.count-m.start):(++f,u[f]=x)}u.length=f+1;for(let d=0,m=u.length;d<m;d++){const x=u[d];s.bufferSubData(l,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}c.clearUpdateRanges()}c.onUploadCallback()}function i(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const c=e.get(a);c&&(s.deleteBuffer(c.buffer),e.delete(a))}function o(a,c){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const l=e.get(a);if(l===void 0)e.set(a,t(a,c));else if(l.version<a.version){if(l.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,a,c),l.version=a.version}}return{get:i,remove:r,update:o}}var km=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Bm=`#ifdef USE_ALPHAHASH
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
#endif`,Hm=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Vm=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Gm=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Wm=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Xm=`#ifdef USE_AOMAP
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
#endif`,qm=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Ym=`#ifdef USE_BATCHING
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
#endif`,jm=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Km=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Zm=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,$m=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Jm=`#ifdef USE_IRIDESCENCE
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
#endif`,Qm=`#ifdef USE_BUMPMAP
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
#endif`,e0=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,t0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,n0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,i0=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,s0=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,r0=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,o0=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,a0=`#if defined( USE_COLOR_ALPHA )
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
#endif`,c0=`#define PI 3.141592653589793
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
} // validated`,l0=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,h0=`vec3 transformedNormal = objectNormal;
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
#endif`,u0=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,f0=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,d0=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,p0=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,m0="gl_FragColor = linearToOutputTexel( gl_FragColor );",g0=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,x0=`#ifdef USE_ENVMAP
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
#endif`,v0=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,_0=`#ifdef USE_ENVMAP
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
#endif`,y0=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,M0=`#ifdef USE_ENVMAP
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
#endif`,w0=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,b0=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,S0=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,T0=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,E0=`#ifdef USE_GRADIENTMAP
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
}`,A0=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,R0=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,C0=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,P0=`uniform bool receiveShadow;
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
#endif`,L0=`#ifdef USE_ENVMAP
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
#endif`,I0=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,D0=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,U0=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,N0=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,z0=`PhysicalMaterial material;
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
#endif`,F0=`struct PhysicalMaterial {
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
}`,O0=`
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
#endif`,k0=`#if defined( RE_IndirectDiffuse )
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
#endif`,B0=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,H0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,V0=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,G0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,W0=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,X0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,q0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Y0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,j0=`#if defined( USE_POINTS_UV )
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
#endif`,K0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Z0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,$0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,J0=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Q0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,eg=`#ifdef USE_MORPHTARGETS
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
#endif`,tg=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,ng=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,ig=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,sg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,rg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,og=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,ag=`#ifdef USE_NORMALMAP
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
#endif`,cg=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,lg=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,hg=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,ug=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,fg=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,dg=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,pg=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,mg=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,gg=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,xg=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,vg=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,_g=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,yg=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,Mg=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,wg=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,bg=`float getShadowMask() {
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
}`,Sg=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Tg=`#ifdef USE_SKINNING
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
#endif`,Eg=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Ag=`#ifdef USE_SKINNING
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
#endif`,Rg=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Cg=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Pg=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Lg=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Ig=`#ifdef USE_TRANSMISSION
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
#endif`,Dg=`#ifdef USE_TRANSMISSION
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
#endif`,Ug=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Ng=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,zg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Fg=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Og=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,kg=`uniform sampler2D t2D;
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
}`,Bg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Hg=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Vg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Gg=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Wg=`#include <common>
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
}`,Xg=`#if DEPTH_PACKING == 3200
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
}`,qg=`#define DISTANCE
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
}`,Yg=`#define DISTANCE
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
}`,jg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Kg=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Zg=`uniform float scale;
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
}`,$g=`uniform vec3 diffuse;
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
}`,Jg=`#include <common>
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
}`,Qg=`uniform vec3 diffuse;
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
}`,ex=`#define LAMBERT
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
}`,tx=`#define LAMBERT
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
}`,nx=`#define MATCAP
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
}`,ix=`#define MATCAP
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
}`,sx=`#define NORMAL
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
}`,rx=`#define NORMAL
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
}`,ox=`#define PHONG
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
}`,ax=`#define PHONG
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
}`,cx=`#define STANDARD
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
}`,lx=`#define STANDARD
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
}`,hx=`#define TOON
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
}`,ux=`#define TOON
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
}`,fx=`uniform float size;
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
}`,dx=`uniform vec3 diffuse;
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
}`,px=`#include <common>
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
}`,mx=`uniform vec3 color;
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
}`,gx=`uniform float rotation;
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
}`,xx=`uniform vec3 diffuse;
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
}`,Qe={alphahash_fragment:km,alphahash_pars_fragment:Bm,alphamap_fragment:Hm,alphamap_pars_fragment:Vm,alphatest_fragment:Gm,alphatest_pars_fragment:Wm,aomap_fragment:Xm,aomap_pars_fragment:qm,batching_pars_vertex:Ym,batching_vertex:jm,begin_vertex:Km,beginnormal_vertex:Zm,bsdfs:$m,iridescence_fragment:Jm,bumpmap_pars_fragment:Qm,clipping_planes_fragment:e0,clipping_planes_pars_fragment:t0,clipping_planes_pars_vertex:n0,clipping_planes_vertex:i0,color_fragment:s0,color_pars_fragment:r0,color_pars_vertex:o0,color_vertex:a0,common:c0,cube_uv_reflection_fragment:l0,defaultnormal_vertex:h0,displacementmap_pars_vertex:u0,displacementmap_vertex:f0,emissivemap_fragment:d0,emissivemap_pars_fragment:p0,colorspace_fragment:m0,colorspace_pars_fragment:g0,envmap_fragment:x0,envmap_common_pars_fragment:v0,envmap_pars_fragment:_0,envmap_pars_vertex:y0,envmap_physical_pars_fragment:L0,envmap_vertex:M0,fog_vertex:w0,fog_pars_vertex:b0,fog_fragment:S0,fog_pars_fragment:T0,gradientmap_pars_fragment:E0,lightmap_pars_fragment:A0,lights_lambert_fragment:R0,lights_lambert_pars_fragment:C0,lights_pars_begin:P0,lights_toon_fragment:I0,lights_toon_pars_fragment:D0,lights_phong_fragment:U0,lights_phong_pars_fragment:N0,lights_physical_fragment:z0,lights_physical_pars_fragment:F0,lights_fragment_begin:O0,lights_fragment_maps:k0,lights_fragment_end:B0,logdepthbuf_fragment:H0,logdepthbuf_pars_fragment:V0,logdepthbuf_pars_vertex:G0,logdepthbuf_vertex:W0,map_fragment:X0,map_pars_fragment:q0,map_particle_fragment:Y0,map_particle_pars_fragment:j0,metalnessmap_fragment:K0,metalnessmap_pars_fragment:Z0,morphinstance_vertex:$0,morphcolor_vertex:J0,morphnormal_vertex:Q0,morphtarget_pars_vertex:eg,morphtarget_vertex:tg,normal_fragment_begin:ng,normal_fragment_maps:ig,normal_pars_fragment:sg,normal_pars_vertex:rg,normal_vertex:og,normalmap_pars_fragment:ag,clearcoat_normal_fragment_begin:cg,clearcoat_normal_fragment_maps:lg,clearcoat_pars_fragment:hg,iridescence_pars_fragment:ug,opaque_fragment:fg,packing:dg,premultiplied_alpha_fragment:pg,project_vertex:mg,dithering_fragment:gg,dithering_pars_fragment:xg,roughnessmap_fragment:vg,roughnessmap_pars_fragment:_g,shadowmap_pars_fragment:yg,shadowmap_pars_vertex:Mg,shadowmap_vertex:wg,shadowmask_pars_fragment:bg,skinbase_vertex:Sg,skinning_pars_vertex:Tg,skinning_vertex:Eg,skinnormal_vertex:Ag,specularmap_fragment:Rg,specularmap_pars_fragment:Cg,tonemapping_fragment:Pg,tonemapping_pars_fragment:Lg,transmission_fragment:Ig,transmission_pars_fragment:Dg,uv_pars_fragment:Ug,uv_pars_vertex:Ng,uv_vertex:zg,worldpos_vertex:Fg,background_vert:Og,background_frag:kg,backgroundCube_vert:Bg,backgroundCube_frag:Hg,cube_vert:Vg,cube_frag:Gg,depth_vert:Wg,depth_frag:Xg,distanceRGBA_vert:qg,distanceRGBA_frag:Yg,equirect_vert:jg,equirect_frag:Kg,linedashed_vert:Zg,linedashed_frag:$g,meshbasic_vert:Jg,meshbasic_frag:Qg,meshlambert_vert:ex,meshlambert_frag:tx,meshmatcap_vert:nx,meshmatcap_frag:ix,meshnormal_vert:sx,meshnormal_frag:rx,meshphong_vert:ox,meshphong_frag:ax,meshphysical_vert:cx,meshphysical_frag:lx,meshtoon_vert:hx,meshtoon_frag:ux,points_vert:fx,points_frag:dx,shadow_vert:px,shadow_frag:mx,sprite_vert:gx,sprite_frag:xx},ye={common:{diffuse:{value:new Me(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new $e},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new $e}},envmap:{envMap:{value:null},envMapRotation:{value:new $e},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new $e}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new $e}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new $e},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new $e},normalScale:{value:new le(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new $e},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new $e}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new $e}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new $e}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Me(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Me(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0},uvTransform:{value:new $e}},sprite:{diffuse:{value:new Me(16777215)},opacity:{value:1},center:{value:new le(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new $e},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0}}},Bn={basic:{uniforms:Jt([ye.common,ye.specularmap,ye.envmap,ye.aomap,ye.lightmap,ye.fog]),vertexShader:Qe.meshbasic_vert,fragmentShader:Qe.meshbasic_frag},lambert:{uniforms:Jt([ye.common,ye.specularmap,ye.envmap,ye.aomap,ye.lightmap,ye.emissivemap,ye.bumpmap,ye.normalmap,ye.displacementmap,ye.fog,ye.lights,{emissive:{value:new Me(0)}}]),vertexShader:Qe.meshlambert_vert,fragmentShader:Qe.meshlambert_frag},phong:{uniforms:Jt([ye.common,ye.specularmap,ye.envmap,ye.aomap,ye.lightmap,ye.emissivemap,ye.bumpmap,ye.normalmap,ye.displacementmap,ye.fog,ye.lights,{emissive:{value:new Me(0)},specular:{value:new Me(1118481)},shininess:{value:30}}]),vertexShader:Qe.meshphong_vert,fragmentShader:Qe.meshphong_frag},standard:{uniforms:Jt([ye.common,ye.envmap,ye.aomap,ye.lightmap,ye.emissivemap,ye.bumpmap,ye.normalmap,ye.displacementmap,ye.roughnessmap,ye.metalnessmap,ye.fog,ye.lights,{emissive:{value:new Me(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Qe.meshphysical_vert,fragmentShader:Qe.meshphysical_frag},toon:{uniforms:Jt([ye.common,ye.aomap,ye.lightmap,ye.emissivemap,ye.bumpmap,ye.normalmap,ye.displacementmap,ye.gradientmap,ye.fog,ye.lights,{emissive:{value:new Me(0)}}]),vertexShader:Qe.meshtoon_vert,fragmentShader:Qe.meshtoon_frag},matcap:{uniforms:Jt([ye.common,ye.bumpmap,ye.normalmap,ye.displacementmap,ye.fog,{matcap:{value:null}}]),vertexShader:Qe.meshmatcap_vert,fragmentShader:Qe.meshmatcap_frag},points:{uniforms:Jt([ye.points,ye.fog]),vertexShader:Qe.points_vert,fragmentShader:Qe.points_frag},dashed:{uniforms:Jt([ye.common,ye.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Qe.linedashed_vert,fragmentShader:Qe.linedashed_frag},depth:{uniforms:Jt([ye.common,ye.displacementmap]),vertexShader:Qe.depth_vert,fragmentShader:Qe.depth_frag},normal:{uniforms:Jt([ye.common,ye.bumpmap,ye.normalmap,ye.displacementmap,{opacity:{value:1}}]),vertexShader:Qe.meshnormal_vert,fragmentShader:Qe.meshnormal_frag},sprite:{uniforms:Jt([ye.sprite,ye.fog]),vertexShader:Qe.sprite_vert,fragmentShader:Qe.sprite_frag},background:{uniforms:{uvTransform:{value:new $e},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Qe.background_vert,fragmentShader:Qe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new $e}},vertexShader:Qe.backgroundCube_vert,fragmentShader:Qe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Qe.cube_vert,fragmentShader:Qe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Qe.equirect_vert,fragmentShader:Qe.equirect_frag},distanceRGBA:{uniforms:Jt([ye.common,ye.displacementmap,{referencePosition:{value:new C},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Qe.distanceRGBA_vert,fragmentShader:Qe.distanceRGBA_frag},shadow:{uniforms:Jt([ye.lights,ye.fog,{color:{value:new Me(0)},opacity:{value:1}}]),vertexShader:Qe.shadow_vert,fragmentShader:Qe.shadow_frag}};Bn.physical={uniforms:Jt([Bn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new $e},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new $e},clearcoatNormalScale:{value:new le(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new $e},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new $e},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new $e},sheen:{value:0},sheenColor:{value:new Me(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new $e},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new $e},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new $e},transmissionSamplerSize:{value:new le},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new $e},attenuationDistance:{value:0},attenuationColor:{value:new Me(0)},specularColor:{value:new Me(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new $e},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new $e},anisotropyVector:{value:new le},anisotropyMap:{value:null},anisotropyMapTransform:{value:new $e}}]),vertexShader:Qe.meshphysical_vert,fragmentShader:Qe.meshphysical_frag};const io={r:0,b:0,g:0},Ui=new wn,vx=new qe;function _x(s,e,t,n,i,r,o){const a=new Me(0);let c=r===!0?0:1,l,h,u=null,f=0,d=null;function m(v){let _=v.isScene===!0?v.background:null;return _&&_.isTexture&&(_=(v.backgroundBlurriness>0?t:e).get(_)),_}function x(v){let _=!1;const w=m(v);w===null?p(a,c):w&&w.isColor&&(p(w,1),_=!0);const b=s.xr.getEnvironmentBlendMode();b==="additive"?n.buffers.color.setClear(0,0,0,1,o):b==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,o),(s.autoClear||_)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function g(v,_){const w=m(_);w&&(w.isCubeTexture||w.mapping===Po)?(h===void 0&&(h=new st(new Fs(1,1,1),new Xt({name:"BackgroundCubeMaterial",uniforms:Ps(Bn.backgroundCube.uniforms),vertexShader:Bn.backgroundCube.vertexShader,fragmentShader:Bn.backgroundCube.fragmentShader,side:Wt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(b,y,A){this.matrixWorld.copyPosition(A.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(h)),Ui.copy(_.backgroundRotation),Ui.x*=-1,Ui.y*=-1,Ui.z*=-1,w.isCubeTexture&&w.isRenderTargetTexture===!1&&(Ui.y*=-1,Ui.z*=-1),h.material.uniforms.envMap.value=w,h.material.uniforms.flipEnvMap.value=w.isCubeTexture&&w.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=_.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(vx.makeRotationFromEuler(Ui)),h.material.toneMapped=rt.getTransfer(w.colorSpace)!==xt,(u!==w||f!==w.version||d!==s.toneMapping)&&(h.material.needsUpdate=!0,u=w,f=w.version,d=s.toneMapping),h.layers.enableAll(),v.unshift(h,h.geometry,h.material,0,0,null)):w&&w.isTexture&&(l===void 0&&(l=new st(new Un(2,2),new Xt({name:"BackgroundMaterial",uniforms:Ps(Bn.background.uniforms),vertexShader:Bn.background.vertexShader,fragmentShader:Bn.background.fragmentShader,side:ai,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=w,l.material.uniforms.backgroundIntensity.value=_.backgroundIntensity,l.material.toneMapped=rt.getTransfer(w.colorSpace)!==xt,w.matrixAutoUpdate===!0&&w.updateMatrix(),l.material.uniforms.uvTransform.value.copy(w.matrix),(u!==w||f!==w.version||d!==s.toneMapping)&&(l.material.needsUpdate=!0,u=w,f=w.version,d=s.toneMapping),l.layers.enableAll(),v.unshift(l,l.geometry,l.material,0,0,null))}function p(v,_){v.getRGB(io,Xu(s)),n.buffers.color.setClear(io.r,io.g,io.b,_,o)}function M(){h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return a},setClearColor:function(v,_=1){a.set(v),c=_,p(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(v){c=v,p(a,c)},render:x,addToRenderList:g,dispose:M}}function yx(s,e){const t=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},i=f(null);let r=i,o=!1;function a(S,L,D,z,N){let F=!1;const V=u(z,D,L);r!==V&&(r=V,l(r.object)),F=d(S,z,D,N),F&&m(S,z,D,N),N!==null&&e.update(N,s.ELEMENT_ARRAY_BUFFER),(F||o)&&(o=!1,_(S,L,D,z),N!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,e.get(N).buffer))}function c(){return s.createVertexArray()}function l(S){return s.bindVertexArray(S)}function h(S){return s.deleteVertexArray(S)}function u(S,L,D){const z=D.wireframe===!0;let N=n[S.id];N===void 0&&(N={},n[S.id]=N);let F=N[L.id];F===void 0&&(F={},N[L.id]=F);let V=F[z];return V===void 0&&(V=f(c()),F[z]=V),V}function f(S){const L=[],D=[],z=[];for(let N=0;N<t;N++)L[N]=0,D[N]=0,z[N]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:L,enabledAttributes:D,attributeDivisors:z,object:S,attributes:{},index:null}}function d(S,L,D,z){const N=r.attributes,F=L.attributes;let V=0;const G=D.getAttributes();for(const B in G)if(G[B].location>=0){const fe=N[B];let ce=F[B];if(ce===void 0&&(B==="instanceMatrix"&&S.instanceMatrix&&(ce=S.instanceMatrix),B==="instanceColor"&&S.instanceColor&&(ce=S.instanceColor)),fe===void 0||fe.attribute!==ce||ce&&fe.data!==ce.data)return!0;V++}return r.attributesNum!==V||r.index!==z}function m(S,L,D,z){const N={},F=L.attributes;let V=0;const G=D.getAttributes();for(const B in G)if(G[B].location>=0){let fe=F[B];fe===void 0&&(B==="instanceMatrix"&&S.instanceMatrix&&(fe=S.instanceMatrix),B==="instanceColor"&&S.instanceColor&&(fe=S.instanceColor));const ce={};ce.attribute=fe,fe&&fe.data&&(ce.data=fe.data),N[B]=ce,V++}r.attributes=N,r.attributesNum=V,r.index=z}function x(){const S=r.newAttributes;for(let L=0,D=S.length;L<D;L++)S[L]=0}function g(S){p(S,0)}function p(S,L){const D=r.newAttributes,z=r.enabledAttributes,N=r.attributeDivisors;D[S]=1,z[S]===0&&(s.enableVertexAttribArray(S),z[S]=1),N[S]!==L&&(s.vertexAttribDivisor(S,L),N[S]=L)}function M(){const S=r.newAttributes,L=r.enabledAttributes;for(let D=0,z=L.length;D<z;D++)L[D]!==S[D]&&(s.disableVertexAttribArray(D),L[D]=0)}function v(S,L,D,z,N,F,V){V===!0?s.vertexAttribIPointer(S,L,D,N,F):s.vertexAttribPointer(S,L,D,z,N,F)}function _(S,L,D,z){x();const N=z.attributes,F=D.getAttributes(),V=L.defaultAttributeValues;for(const G in F){const B=F[G];if(B.location>=0){let $=N[G];if($===void 0&&(G==="instanceMatrix"&&S.instanceMatrix&&($=S.instanceMatrix),G==="instanceColor"&&S.instanceColor&&($=S.instanceColor)),$!==void 0){const fe=$.normalized,ce=$.itemSize,Re=e.get($);if(Re===void 0)continue;const Je=Re.buffer,ct=Re.type,tt=Re.bytesPerElement,K=ct===s.INT||ct===s.UNSIGNED_INT||$.gpuType===Oc;if($.isInterleavedBufferAttribute){const ne=$.data,Se=ne.stride,Le=$.offset;if(ne.isInstancedInterleavedBuffer){for(let Te=0;Te<B.locationSize;Te++)p(B.location+Te,ne.meshPerAttribute);S.isInstancedMesh!==!0&&z._maxInstanceCount===void 0&&(z._maxInstanceCount=ne.meshPerAttribute*ne.count)}else for(let Te=0;Te<B.locationSize;Te++)g(B.location+Te);s.bindBuffer(s.ARRAY_BUFFER,Je);for(let Te=0;Te<B.locationSize;Te++)v(B.location+Te,ce/B.locationSize,ct,fe,Se*tt,(Le+ce/B.locationSize*Te)*tt,K)}else{if($.isInstancedBufferAttribute){for(let ne=0;ne<B.locationSize;ne++)p(B.location+ne,$.meshPerAttribute);S.isInstancedMesh!==!0&&z._maxInstanceCount===void 0&&(z._maxInstanceCount=$.meshPerAttribute*$.count)}else for(let ne=0;ne<B.locationSize;ne++)g(B.location+ne);s.bindBuffer(s.ARRAY_BUFFER,Je);for(let ne=0;ne<B.locationSize;ne++)v(B.location+ne,ce/B.locationSize,ct,fe,ce*tt,ce/B.locationSize*ne*tt,K)}}else if(V!==void 0){const fe=V[G];if(fe!==void 0)switch(fe.length){case 2:s.vertexAttrib2fv(B.location,fe);break;case 3:s.vertexAttrib3fv(B.location,fe);break;case 4:s.vertexAttrib4fv(B.location,fe);break;default:s.vertexAttrib1fv(B.location,fe)}}}}M()}function w(){A();for(const S in n){const L=n[S];for(const D in L){const z=L[D];for(const N in z)h(z[N].object),delete z[N];delete L[D]}delete n[S]}}function b(S){if(n[S.id]===void 0)return;const L=n[S.id];for(const D in L){const z=L[D];for(const N in z)h(z[N].object),delete z[N];delete L[D]}delete n[S.id]}function y(S){for(const L in n){const D=n[L];if(D[S.id]===void 0)continue;const z=D[S.id];for(const N in z)h(z[N].object),delete z[N];delete D[S.id]}}function A(){T(),o=!0,r!==i&&(r=i,l(r.object))}function T(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:a,reset:A,resetDefaultState:T,dispose:w,releaseStatesOfGeometry:b,releaseStatesOfProgram:y,initAttributes:x,enableAttribute:g,disableUnusedAttributes:M}}function Mx(s,e,t){let n;function i(l){n=l}function r(l,h){s.drawArrays(n,l,h),t.update(h,n,1)}function o(l,h,u){u!==0&&(s.drawArraysInstanced(n,l,h,u),t.update(h,n,u))}function a(l,h,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,h,0,u);let d=0;for(let m=0;m<u;m++)d+=h[m];t.update(d,n,1)}function c(l,h,u,f){if(u===0)return;const d=e.get("WEBGL_multi_draw");if(d===null)for(let m=0;m<l.length;m++)o(l[m],h[m],f[m]);else{d.multiDrawArraysInstancedWEBGL(n,l,0,h,0,f,0,u);let m=0;for(let x=0;x<u;x++)m+=h[x]*f[x];t.update(m,n,1)}}this.setMode=i,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=c}function wx(s,e,t,n){let i;function r(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){const y=e.get("EXT_texture_filter_anisotropic");i=s.getParameter(y.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(y){return!(y!==fn&&n.convert(y)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(y){const A=y===li&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(y!==Xn&&n.convert(y)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&y!==Ln&&!A)}function c(y){if(y==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";y="mediump"}return y==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp";const h=c(l);h!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);const u=t.logarithmicDepthBuffer===!0,f=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),d=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),m=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=s.getParameter(s.MAX_TEXTURE_SIZE),g=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),p=s.getParameter(s.MAX_VERTEX_ATTRIBS),M=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),v=s.getParameter(s.MAX_VARYING_VECTORS),_=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),w=m>0,b=s.getParameter(s.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:a,precision:l,logarithmicDepthBuffer:u,reversedDepthBuffer:f,maxTextures:d,maxVertexTextures:m,maxTextureSize:x,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:M,maxVaryings:v,maxFragmentUniforms:_,vertexTextures:w,maxSamples:b}}function bx(s){const e=this;let t=null,n=0,i=!1,r=!1;const o=new Mi,a=new $e,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(u,f){const d=u.length!==0||f||n!==0||i;return i=f,n=u.length,d},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,f){t=h(u,f,0)},this.setState=function(u,f,d){const m=u.clippingPlanes,x=u.clipIntersection,g=u.clipShadows,p=s.get(u);if(!i||m===null||m.length===0||r&&!g)r?h(null):l();else{const M=r?0:n,v=M*4;let _=p.clippingState||null;c.value=_,_=h(m,f,v,d);for(let w=0;w!==v;++w)_[w]=t[w];p.clippingState=_,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=M}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,f,d,m){const x=u!==null?u.length:0;let g=null;if(x!==0){if(g=c.value,m!==!0||g===null){const p=d+x*4,M=f.matrixWorldInverse;a.getNormalMatrix(M),(g===null||g.length<p)&&(g=new Float32Array(p));for(let v=0,_=d;v!==x;++v,_+=4)o.copy(u[v]).applyMatrix4(M,a),o.normal.toArray(g,_),g[_+3]=o.constant}c.value=g,c.needsUpdate=!0}return e.numPlanes=x,e.numIntersection=0,g}}function Sx(s){let e=new WeakMap;function t(o,a){return a===Xa?o.mapping=As:a===qa&&(o.mapping=Rs),o}function n(o){if(o&&o.isTexture){const a=o.mapping;if(a===Xa||a===qa)if(e.has(o)){const c=e.get(o).texture;return t(c,o.mapping)}else{const c=o.image;if(c&&c.height>0){const l=new mp(c.height);return l.fromEquirectangularTexture(s,o),e.set(o,l),o.addEventListener("dispose",i),t(l.texture,o.mapping)}else return null}}return o}function i(o){const a=o.target;a.removeEventListener("dispose",i);const c=e.get(a);c!==void 0&&(e.delete(a),c.dispose())}function r(){e=new WeakMap}return{get:n,dispose:r}}const ys=4,Ph=[.125,.215,.35,.446,.526,.582],Bi=20,ya=new hl,Lh=new Me;let Ma=null,wa=0,ba=0,Sa=!1;const Fi=(1+Math.sqrt(5))/2,ds=1/Fi,Ih=[new C(-Fi,ds,0),new C(Fi,ds,0),new C(-ds,0,Fi),new C(ds,0,Fi),new C(0,Fi,-ds),new C(0,Fi,ds),new C(-1,1,-1),new C(1,1,-1),new C(-1,1,1),new C(1,1,1)],Tx=new C;class Dh{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,i=100,r={}){const{size:o=256,position:a=Tx}=r;Ma=this._renderer.getRenderTarget(),wa=this._renderer.getActiveCubeFace(),ba=this._renderer.getActiveMipmapLevel(),Sa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,n,i,c,a),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=zh(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Nh(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Ma,wa,ba),this._renderer.xr.enabled=Sa,e.scissorTest=!1,so(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===As||e.mapping===Rs?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Ma=this._renderer.getRenderTarget(),wa=this._renderer.getActiveCubeFace(),ba=this._renderer.getActiveMipmapLevel(),Sa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:on,minFilter:on,generateMipmaps:!1,type:li,format:fn,colorSpace:nn,depthBuffer:!1},i=Uh(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Uh(e,t,n);const{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Ex(r)),this._blurMaterial=Ax(r,e,t)}return i}_compileMaterial(e){const t=new st(this._lodPlanes[0],e);this._renderer.compile(t,ya)}_sceneToCubeUV(e,t,n,i,r){const c=new Kt(90,1,t,n),l=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],u=this._renderer,f=u.autoClear,d=u.toneMapping;u.getClearColor(Lh),u.toneMapping=Si,u.autoClear=!1,u.state.buffers.depth.getReversed()&&(u.setRenderTarget(i),u.clearDepth(),u.setRenderTarget(null));const x=new Hi({name:"PMREM.Background",side:Wt,depthWrite:!1,depthTest:!1}),g=new st(new Fs,x);let p=!1;const M=e.background;M?M.isColor&&(x.color.copy(M),e.background=null,p=!0):(x.color.copy(Lh),p=!0);for(let v=0;v<6;v++){const _=v%3;_===0?(c.up.set(0,l[v],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x+h[v],r.y,r.z)):_===1?(c.up.set(0,0,l[v]),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y+h[v],r.z)):(c.up.set(0,l[v],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y,r.z+h[v]));const w=this._cubeSize;so(i,_*w,v>2?w:0,w,w),u.setRenderTarget(i),p&&u.render(g,c),u.render(e,c)}g.geometry.dispose(),g.material.dispose(),u.toneMapping=d,u.autoClear=f,e.background=M}_textureToCubeUV(e,t){const n=this._renderer,i=e.mapping===As||e.mapping===Rs;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=zh()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Nh());const r=i?this._cubemapMaterial:this._equirectMaterial,o=new st(this._lodPlanes[0],r),a=r.uniforms;a.envMap.value=e;const c=this._cubeSize;so(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(o,ya)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const i=this._lodPlanes.length;for(let r=1;r<i;r++){const o=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),a=Ih[(i-r-1)%Ih.length];this._blur(e,r-1,r,o,a)}t.autoClear=n}_blur(e,t,n,i,r){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,i,"latitudinal",r),this._halfBlur(o,e,n,n,i,"longitudinal",r)}_halfBlur(e,t,n,i,r,o,a){const c=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,u=new st(this._lodPlanes[i],l),f=l.uniforms,d=this._sizeLods[n]-1,m=isFinite(r)?Math.PI/(2*d):2*Math.PI/(2*Bi-1),x=r/m,g=isFinite(r)?1+Math.floor(h*x):Bi;g>Bi&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${Bi}`);const p=[];let M=0;for(let y=0;y<Bi;++y){const A=y/x,T=Math.exp(-A*A/2);p.push(T),y===0?M+=T:y<g&&(M+=2*T)}for(let y=0;y<p.length;y++)p[y]=p[y]/M;f.envMap.value=e.texture,f.samples.value=g,f.weights.value=p,f.latitudinal.value=o==="latitudinal",a&&(f.poleAxis.value=a);const{_lodMax:v}=this;f.dTheta.value=m,f.mipInt.value=v-n;const _=this._sizeLods[i],w=3*_*(i>v-ys?i-v+ys:0),b=4*(this._cubeSize-_);so(t,w,b,3*_,2*_),c.setRenderTarget(t),c.render(u,ya)}}function Ex(s){const e=[],t=[],n=[];let i=s;const r=s-ys+1+Ph.length;for(let o=0;o<r;o++){const a=Math.pow(2,i);t.push(a);let c=1/a;o>s-ys?c=Ph[o-s+ys-1]:o===0&&(c=0),n.push(c);const l=1/(a-2),h=-l,u=1+l,f=[h,h,u,h,u,u,h,h,u,u,h,u],d=6,m=6,x=3,g=2,p=1,M=new Float32Array(x*m*d),v=new Float32Array(g*m*d),_=new Float32Array(p*m*d);for(let b=0;b<d;b++){const y=b%3*2/3-1,A=b>2?0:-1,T=[y,A,0,y+2/3,A,0,y+2/3,A+1,0,y,A,0,y+2/3,A+1,0,y,A+1,0];M.set(T,x*m*b),v.set(f,g*m*b);const S=[b,b,b,b,b,b];_.set(S,p*m*b)}const w=new wt;w.setAttribute("position",new yt(M,x)),w.setAttribute("uv",new yt(v,g)),w.setAttribute("faceIndex",new yt(_,p)),e.push(w),i>ys&&i--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function Uh(s,e,t){const n=new Dn(s,e,t);return n.texture.mapping=Po,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function so(s,e,t,n,i){s.viewport.set(e,t,n,i),s.scissor.set(e,t,n,i)}function Ax(s,e,t){const n=new Float32Array(Bi),i=new C(0,1,0);return new Xt({name:"SphericalGaussianBlur",defines:{n:Bi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:dl(),fragmentShader:`

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
		`,blending:bi,depthTest:!1,depthWrite:!1})}function Nh(){return new Xt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:dl(),fragmentShader:`

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
		`,blending:bi,depthTest:!1,depthWrite:!1})}function zh(){return new Xt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:dl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:bi,depthTest:!1,depthWrite:!1})}function dl(){return`

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
	`}function Rx(s){let e=new WeakMap,t=null;function n(a){if(a&&a.isTexture){const c=a.mapping,l=c===Xa||c===qa,h=c===As||c===Rs;if(l||h){let u=e.get(a);const f=u!==void 0?u.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==f)return t===null&&(t=new Dh(s)),u=l?t.fromEquirectangular(a,u):t.fromCubemap(a,u),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),u.texture;if(u!==void 0)return u.texture;{const d=a.image;return l&&d&&d.height>0||h&&d&&i(d)?(t===null&&(t=new Dh(s)),u=l?t.fromEquirectangular(a):t.fromCubemap(a),u.texture.pmremVersion=a.pmremVersion,e.set(a,u),a.addEventListener("dispose",r),u.texture):null}}}return a}function i(a){let c=0;const l=6;for(let h=0;h<l;h++)a[h]!==void 0&&c++;return c===l}function r(a){const c=a.target;c.removeEventListener("dispose",r);const l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:o}}function Cx(s){const e={};function t(n){if(e[n]!==void 0)return e[n];let i;switch(n){case"WEBGL_depth_texture":i=s.getExtension("WEBGL_depth_texture")||s.getExtension("MOZ_WEBGL_depth_texture")||s.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":i=s.getExtension("EXT_texture_filter_anisotropic")||s.getExtension("MOZ_EXT_texture_filter_anisotropic")||s.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":i=s.getExtension("WEBGL_compressed_texture_s3tc")||s.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":i=s.getExtension("WEBGL_compressed_texture_pvrtc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:i=s.getExtension(n)}return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const i=t(n);return i===null&&vr("THREE.WebGLRenderer: "+n+" extension not supported."),i}}}function Px(s,e,t,n){const i={},r=new WeakMap;function o(u){const f=u.target;f.index!==null&&e.remove(f.index);for(const m in f.attributes)e.remove(f.attributes[m]);f.removeEventListener("dispose",o),delete i[f.id];const d=r.get(f);d&&(e.remove(d),r.delete(f)),n.releaseStatesOfGeometry(f),f.isInstancedBufferGeometry===!0&&delete f._maxInstanceCount,t.memory.geometries--}function a(u,f){return i[f.id]===!0||(f.addEventListener("dispose",o),i[f.id]=!0,t.memory.geometries++),f}function c(u){const f=u.attributes;for(const d in f)e.update(f[d],s.ARRAY_BUFFER)}function l(u){const f=[],d=u.index,m=u.attributes.position;let x=0;if(d!==null){const M=d.array;x=d.version;for(let v=0,_=M.length;v<_;v+=3){const w=M[v+0],b=M[v+1],y=M[v+2];f.push(w,b,b,y,y,w)}}else if(m!==void 0){const M=m.array;x=m.version;for(let v=0,_=M.length/3-1;v<_;v+=3){const w=v+0,b=v+1,y=v+2;f.push(w,b,b,y,y,w)}}else return;const g=new(Vu(f)?Kc:jc)(f,1);g.version=x;const p=r.get(u);p&&e.remove(p),r.set(u,g)}function h(u){const f=r.get(u);if(f){const d=u.index;d!==null&&f.version<d.version&&l(u)}else l(u);return r.get(u)}return{get:a,update:c,getWireframeAttribute:h}}function Lx(s,e,t){let n;function i(f){n=f}let r,o;function a(f){r=f.type,o=f.bytesPerElement}function c(f,d){s.drawElements(n,d,r,f*o),t.update(d,n,1)}function l(f,d,m){m!==0&&(s.drawElementsInstanced(n,d,r,f*o,m),t.update(d,n,m))}function h(f,d,m){if(m===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,d,0,r,f,0,m);let g=0;for(let p=0;p<m;p++)g+=d[p];t.update(g,n,1)}function u(f,d,m,x){if(m===0)return;const g=e.get("WEBGL_multi_draw");if(g===null)for(let p=0;p<f.length;p++)l(f[p]/o,d[p],x[p]);else{g.multiDrawElementsInstancedWEBGL(n,d,0,r,f,0,x,0,m);let p=0;for(let M=0;M<m;M++)p+=d[M]*x[M];t.update(p,n,1)}}this.setMode=i,this.setIndex=a,this.render=c,this.renderInstances=l,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function Ix(s){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case s.TRIANGLES:t.triangles+=a*(r/3);break;case s.LINES:t.lines+=a*(r/2);break;case s.LINE_STRIP:t.lines+=a*(r-1);break;case s.LINE_LOOP:t.lines+=a*r;break;case s.POINTS:t.points+=a*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function i(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function Dx(s,e,t){const n=new WeakMap,i=new at;function r(o,a,c){const l=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,u=h!==void 0?h.length:0;let f=n.get(a);if(f===void 0||f.count!==u){let T=function(){y.dispose(),n.delete(a),a.removeEventListener("dispose",T)};f!==void 0&&f.texture.dispose();const d=a.morphAttributes.position!==void 0,m=a.morphAttributes.normal!==void 0,x=a.morphAttributes.color!==void 0,g=a.morphAttributes.position||[],p=a.morphAttributes.normal||[],M=a.morphAttributes.color||[];let v=0;d===!0&&(v=1),m===!0&&(v=2),x===!0&&(v=3);let _=a.attributes.position.count*v,w=1;_>e.maxTextureSize&&(w=Math.ceil(_/e.maxTextureSize),_=e.maxTextureSize);const b=new Float32Array(_*w*4*u),y=new Gu(b,_,w,u);y.type=Ln,y.needsUpdate=!0;const A=v*4;for(let S=0;S<u;S++){const L=g[S],D=p[S],z=M[S],N=_*w*4*S;for(let F=0;F<L.count;F++){const V=F*A;d===!0&&(i.fromBufferAttribute(L,F),b[N+V+0]=i.x,b[N+V+1]=i.y,b[N+V+2]=i.z,b[N+V+3]=0),m===!0&&(i.fromBufferAttribute(D,F),b[N+V+4]=i.x,b[N+V+5]=i.y,b[N+V+6]=i.z,b[N+V+7]=0),x===!0&&(i.fromBufferAttribute(z,F),b[N+V+8]=i.x,b[N+V+9]=i.y,b[N+V+10]=i.z,b[N+V+11]=z.itemSize===4?i.w:1)}}f={count:u,texture:y,size:new le(_,w)},n.set(a,f),a.addEventListener("dispose",T)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)c.getUniforms().setValue(s,"morphTexture",o.morphTexture,t);else{let d=0;for(let x=0;x<l.length;x++)d+=l[x];const m=a.morphTargetsRelative?1:1-d;c.getUniforms().setValue(s,"morphTargetBaseInfluence",m),c.getUniforms().setValue(s,"morphTargetInfluences",l)}c.getUniforms().setValue(s,"morphTargetsTexture",f.texture,t),c.getUniforms().setValue(s,"morphTargetsTextureSize",f.size)}return{update:r}}function Ux(s,e,t,n){let i=new WeakMap;function r(c){const l=n.render.frame,h=c.geometry,u=e.get(c,h);if(i.get(u)!==l&&(e.update(u),i.set(u,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),i.get(c)!==l&&(t.update(c.instanceMatrix,s.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,s.ARRAY_BUFFER),i.set(c,l))),c.isSkinnedMesh){const f=c.skeleton;i.get(f)!==l&&(f.update(),i.set(f,l))}return u}function o(){i=new WeakMap}function a(c){const l=c.target;l.removeEventListener("dispose",a),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:r,dispose:o}}const xf=new Ft,Fh=new tl(1,1),vf=new Gu,_f=new Qd,yf=new Yu,Oh=[],kh=[],Bh=new Float32Array(16),Hh=new Float32Array(9),Vh=new Float32Array(4);function Hs(s,e,t){const n=s[0];if(n<=0||n>0)return s;const i=e*t;let r=Oh[i];if(r===void 0&&(r=new Float32Array(i),Oh[i]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,s[o].toArray(r,a)}return r}function Ot(s,e){if(s.length!==e.length)return!1;for(let t=0,n=s.length;t<n;t++)if(s[t]!==e[t])return!1;return!0}function kt(s,e){for(let t=0,n=e.length;t<n;t++)s[t]=e[t]}function No(s,e){let t=kh[e];t===void 0&&(t=new Int32Array(e),kh[e]=t);for(let n=0;n!==e;++n)t[n]=s.allocateTextureUnit();return t}function Nx(s,e){const t=this.cache;t[0]!==e&&(s.uniform1f(this.addr,e),t[0]=e)}function zx(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ot(t,e))return;s.uniform2fv(this.addr,e),kt(t,e)}}function Fx(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(s.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Ot(t,e))return;s.uniform3fv(this.addr,e),kt(t,e)}}function Ox(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ot(t,e))return;s.uniform4fv(this.addr,e),kt(t,e)}}function kx(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Ot(t,e))return;s.uniformMatrix2fv(this.addr,!1,e),kt(t,e)}else{if(Ot(t,n))return;Vh.set(n),s.uniformMatrix2fv(this.addr,!1,Vh),kt(t,n)}}function Bx(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Ot(t,e))return;s.uniformMatrix3fv(this.addr,!1,e),kt(t,e)}else{if(Ot(t,n))return;Hh.set(n),s.uniformMatrix3fv(this.addr,!1,Hh),kt(t,n)}}function Hx(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(Ot(t,e))return;s.uniformMatrix4fv(this.addr,!1,e),kt(t,e)}else{if(Ot(t,n))return;Bh.set(n),s.uniformMatrix4fv(this.addr,!1,Bh),kt(t,n)}}function Vx(s,e){const t=this.cache;t[0]!==e&&(s.uniform1i(this.addr,e),t[0]=e)}function Gx(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ot(t,e))return;s.uniform2iv(this.addr,e),kt(t,e)}}function Wx(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Ot(t,e))return;s.uniform3iv(this.addr,e),kt(t,e)}}function Xx(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ot(t,e))return;s.uniform4iv(this.addr,e),kt(t,e)}}function qx(s,e){const t=this.cache;t[0]!==e&&(s.uniform1ui(this.addr,e),t[0]=e)}function Yx(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Ot(t,e))return;s.uniform2uiv(this.addr,e),kt(t,e)}}function jx(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Ot(t,e))return;s.uniform3uiv(this.addr,e),kt(t,e)}}function Kx(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Ot(t,e))return;s.uniform4uiv(this.addr,e),kt(t,e)}}function Zx(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i);let r;this.type===s.SAMPLER_2D_SHADOW?(Fh.compareFunction=Hu,r=Fh):r=xf,t.setTexture2D(e||r,i)}function $x(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||_f,i)}function Jx(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTextureCube(e||yf,i)}function Qx(s,e,t){const n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(s.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||vf,i)}function ev(s){switch(s){case 5126:return Nx;case 35664:return zx;case 35665:return Fx;case 35666:return Ox;case 35674:return kx;case 35675:return Bx;case 35676:return Hx;case 5124:case 35670:return Vx;case 35667:case 35671:return Gx;case 35668:case 35672:return Wx;case 35669:case 35673:return Xx;case 5125:return qx;case 36294:return Yx;case 36295:return jx;case 36296:return Kx;case 35678:case 36198:case 36298:case 36306:case 35682:return Zx;case 35679:case 36299:case 36307:return $x;case 35680:case 36300:case 36308:case 36293:return Jx;case 36289:case 36303:case 36311:case 36292:return Qx}}function tv(s,e){s.uniform1fv(this.addr,e)}function nv(s,e){const t=Hs(e,this.size,2);s.uniform2fv(this.addr,t)}function iv(s,e){const t=Hs(e,this.size,3);s.uniform3fv(this.addr,t)}function sv(s,e){const t=Hs(e,this.size,4);s.uniform4fv(this.addr,t)}function rv(s,e){const t=Hs(e,this.size,4);s.uniformMatrix2fv(this.addr,!1,t)}function ov(s,e){const t=Hs(e,this.size,9);s.uniformMatrix3fv(this.addr,!1,t)}function av(s,e){const t=Hs(e,this.size,16);s.uniformMatrix4fv(this.addr,!1,t)}function cv(s,e){s.uniform1iv(this.addr,e)}function lv(s,e){s.uniform2iv(this.addr,e)}function hv(s,e){s.uniform3iv(this.addr,e)}function uv(s,e){s.uniform4iv(this.addr,e)}function fv(s,e){s.uniform1uiv(this.addr,e)}function dv(s,e){s.uniform2uiv(this.addr,e)}function pv(s,e){s.uniform3uiv(this.addr,e)}function mv(s,e){s.uniform4uiv(this.addr,e)}function gv(s,e,t){const n=this.cache,i=e.length,r=No(t,i);Ot(n,r)||(s.uniform1iv(this.addr,r),kt(n,r));for(let o=0;o!==i;++o)t.setTexture2D(e[o]||xf,r[o])}function xv(s,e,t){const n=this.cache,i=e.length,r=No(t,i);Ot(n,r)||(s.uniform1iv(this.addr,r),kt(n,r));for(let o=0;o!==i;++o)t.setTexture3D(e[o]||_f,r[o])}function vv(s,e,t){const n=this.cache,i=e.length,r=No(t,i);Ot(n,r)||(s.uniform1iv(this.addr,r),kt(n,r));for(let o=0;o!==i;++o)t.setTextureCube(e[o]||yf,r[o])}function _v(s,e,t){const n=this.cache,i=e.length,r=No(t,i);Ot(n,r)||(s.uniform1iv(this.addr,r),kt(n,r));for(let o=0;o!==i;++o)t.setTexture2DArray(e[o]||vf,r[o])}function yv(s){switch(s){case 5126:return tv;case 35664:return nv;case 35665:return iv;case 35666:return sv;case 35674:return rv;case 35675:return ov;case 35676:return av;case 5124:case 35670:return cv;case 35667:case 35671:return lv;case 35668:case 35672:return hv;case 35669:case 35673:return uv;case 5125:return fv;case 36294:return dv;case 36295:return pv;case 36296:return mv;case 35678:case 36198:case 36298:case 36306:case 35682:return gv;case 35679:case 36299:case 36307:return xv;case 35680:case 36300:case 36308:case 36293:return vv;case 36289:case 36303:case 36311:case 36292:return _v}}class Mv{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=ev(t.type)}}class wv{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=yv(t.type)}}class bv{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const i=this.seq;for(let r=0,o=i.length;r!==o;++r){const a=i[r];a.setValue(e,t[a.id],n)}}}const Ta=/(\w+)(\])?(\[|\.)?/g;function Gh(s,e){s.seq.push(e),s.map[e.id]=e}function Sv(s,e,t){const n=s.name,i=n.length;for(Ta.lastIndex=0;;){const r=Ta.exec(n),o=Ta.lastIndex;let a=r[1];const c=r[2]==="]",l=r[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===i){Gh(t,l===void 0?new Mv(a,s,e):new wv(a,s,e));break}else{let u=t.map[a];u===void 0&&(u=new bv(a),Gh(t,u)),t=u}}}class mo{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const r=e.getActiveUniform(t,i),o=e.getUniformLocation(t,r.name);Sv(r,o,this)}}setValue(e,t,n,i){const r=this.map[t];r!==void 0&&r.setValue(e,n,i)}setOptional(e,t,n){const i=t[n];i!==void 0&&this.setValue(e,n,i)}static upload(e,t,n,i){for(let r=0,o=t.length;r!==o;++r){const a=t[r],c=n[a.id];c.needsUpdate!==!1&&a.setValue(e,c.value,i)}}static seqWithValue(e,t){const n=[];for(let i=0,r=e.length;i!==r;++i){const o=e[i];o.id in t&&n.push(o)}return n}}function Wh(s,e,t){const n=s.createShader(e);return s.shaderSource(n,t),s.compileShader(n),n}const Tv=37297;let Ev=0;function Av(s,e){const t=s.split(`
`),n=[],i=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=i;o<r;o++){const a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}const Xh=new $e;function Rv(s){rt._getMatrix(Xh,rt.workingColorSpace,s);const e=`mat3( ${Xh.elements.map(t=>t.toFixed(4))} )`;switch(rt.getTransfer(s)){case Mo:return[e,"LinearTransferOETF"];case xt:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",s),[e,"LinearTransferOETF"]}}function qh(s,e,t){const n=s.getShaderParameter(e,s.COMPILE_STATUS),r=(s.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+Av(s.getShaderSource(e),a)}else return r}function Cv(s,e){const t=Rv(e);return[`vec4 ${s}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function Pv(s,e){let t;switch(e){case ud:t="Linear";break;case fd:t="Reinhard";break;case dd:t="Cineon";break;case Ru:t="ACESFilmic";break;case md:t="AgX";break;case gd:t="Neutral";break;case pd:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+s+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const ro=new C;function Lv(){rt.getLuminanceCoefficients(ro);const s=ro.x.toFixed(4),e=ro.y.toFixed(4),t=ro.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${s}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Iv(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(ir).join(`
`)}function Dv(s){const e=[];for(const t in s){const n=s[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Uv(s,e){const t={},n=s.getProgramParameter(e,s.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const r=s.getActiveAttrib(e,i),o=r.name;let a=1;r.type===s.FLOAT_MAT2&&(a=2),r.type===s.FLOAT_MAT3&&(a=3),r.type===s.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:s.getAttribLocation(e,o),locationSize:a}}return t}function ir(s){return s!==""}function Yh(s,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function jh(s,e){return s.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Nv=/^[ \t]*#include +<([\w\d./]+)>/gm;function Rc(s){return s.replace(Nv,Fv)}const zv=new Map;function Fv(s,e){let t=Qe[e];if(t===void 0){const n=zv.get(e);if(n!==void 0)t=Qe[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Rc(t)}const Ov=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Kh(s){return s.replace(Ov,kv)}function kv(s,e,t,n){let i="";for(let r=parseInt(e);r<parseInt(t);r++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return i}function Zh(s){let e=`precision ${s.precision} float;
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
#define LOW_PRECISION`),e}function Bv(s){let e="SHADOWMAP_TYPE_BASIC";return s.shadowMapType===Tu?e="SHADOWMAP_TYPE_PCF":s.shadowMapType===Eu?e="SHADOWMAP_TYPE_PCF_SOFT":s.shadowMapType===ti&&(e="SHADOWMAP_TYPE_VSM"),e}function Hv(s){let e="ENVMAP_TYPE_CUBE";if(s.envMap)switch(s.envMapMode){case As:case Rs:e="ENVMAP_TYPE_CUBE";break;case Po:e="ENVMAP_TYPE_CUBE_UV";break}return e}function Vv(s){let e="ENVMAP_MODE_REFLECTION";if(s.envMap)switch(s.envMapMode){case Rs:e="ENVMAP_MODE_REFRACTION";break}return e}function Gv(s){let e="ENVMAP_BLENDING_NONE";if(s.envMap)switch(s.combine){case Au:e="ENVMAP_BLENDING_MULTIPLY";break;case ld:e="ENVMAP_BLENDING_MIX";break;case hd:e="ENVMAP_BLENDING_ADD";break}return e}function Wv(s){const e=s.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function Xv(s,e,t,n){const i=s.getContext(),r=t.defines;let o=t.vertexShader,a=t.fragmentShader;const c=Bv(t),l=Hv(t),h=Vv(t),u=Gv(t),f=Wv(t),d=Iv(t),m=Dv(r),x=i.createProgram();let g,p,M=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(ir).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(ir).join(`
`),p.length>0&&(p+=`
`)):(g=[Zh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(ir).join(`
`),p=[Zh(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",f?"#define CUBEUV_TEXEL_WIDTH "+f.texelWidth:"",f?"#define CUBEUV_TEXEL_HEIGHT "+f.texelHeight:"",f?"#define CUBEUV_MAX_MIP "+f.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Si?"#define TONE_MAPPING":"",t.toneMapping!==Si?Qe.tonemapping_pars_fragment:"",t.toneMapping!==Si?Pv("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Qe.colorspace_pars_fragment,Cv("linearToOutputTexel",t.outputColorSpace),Lv(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(ir).join(`
`)),o=Rc(o),o=Yh(o,t),o=jh(o,t),a=Rc(a),a=Yh(a,t),a=jh(a,t),o=Kh(o),a=Kh(a),t.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,g=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",t.glslVersion===kl?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===kl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const v=M+g+o,_=M+p+a,w=Wh(i,i.VERTEX_SHADER,v),b=Wh(i,i.FRAGMENT_SHADER,_);i.attachShader(x,w),i.attachShader(x,b),t.index0AttributeName!==void 0?i.bindAttribLocation(x,0,t.index0AttributeName):t.morphTargets===!0&&i.bindAttribLocation(x,0,"position"),i.linkProgram(x);function y(L){if(s.debug.checkShaderErrors){const D=i.getProgramInfoLog(x)||"",z=i.getShaderInfoLog(w)||"",N=i.getShaderInfoLog(b)||"",F=D.trim(),V=z.trim(),G=N.trim();let B=!0,$=!0;if(i.getProgramParameter(x,i.LINK_STATUS)===!1)if(B=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(i,x,w,b);else{const fe=qh(i,w,"vertex"),ce=qh(i,b,"fragment");console.error("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(x,i.VALIDATE_STATUS)+`

Material Name: `+L.name+`
Material Type: `+L.type+`

Program Info Log: `+F+`
`+fe+`
`+ce)}else F!==""?console.warn("THREE.WebGLProgram: Program Info Log:",F):(V===""||G==="")&&($=!1);$&&(L.diagnostics={runnable:B,programLog:F,vertexShader:{log:V,prefix:g},fragmentShader:{log:G,prefix:p}})}i.deleteShader(w),i.deleteShader(b),A=new mo(i,x),T=Uv(i,x)}let A;this.getUniforms=function(){return A===void 0&&y(this),A};let T;this.getAttributes=function(){return T===void 0&&y(this),T};let S=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return S===!1&&(S=i.getProgramParameter(x,Tv)),S},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(x),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Ev++,this.cacheKey=e,this.usedTimes=1,this.program=x,this.vertexShader=w,this.fragmentShader=b,this}let qv=0;class Yv{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,i=this._getShaderStage(t),r=this._getShaderStage(n),o=this._getShaderCacheForMaterial(e);return o.has(i)===!1&&(o.add(i),i.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new jv(e),t.set(e,n)),n}}class jv{constructor(e){this.id=qv++,this.code=e,this.usedTimes=0}}function Kv(s,e,t,n,i,r,o){const a=new Yc,c=new Yv,l=new Set,h=[],u=i.logarithmicDepthBuffer,f=i.vertexTextures;let d=i.precision;const m={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(T){return l.add(T),T===0?"uv":`uv${T}`}function g(T,S,L,D,z){const N=D.fog,F=z.geometry,V=T.isMeshStandardMaterial?D.environment:null,G=(T.isMeshStandardMaterial?t:e).get(T.envMap||V),B=G&&G.mapping===Po?G.image.height:null,$=m[T.type];T.precision!==null&&(d=i.getMaxPrecision(T.precision),d!==T.precision&&console.warn("THREE.WebGLProgram.getParameters:",T.precision,"not supported, using",d,"instead."));const fe=F.morphAttributes.position||F.morphAttributes.normal||F.morphAttributes.color,ce=fe!==void 0?fe.length:0;let Re=0;F.morphAttributes.position!==void 0&&(Re=1),F.morphAttributes.normal!==void 0&&(Re=2),F.morphAttributes.color!==void 0&&(Re=3);let Je,ct,tt,K;if($){const dt=Bn[$];Je=dt.vertexShader,ct=dt.fragmentShader}else Je=T.vertexShader,ct=T.fragmentShader,c.update(T),tt=c.getVertexShaderID(T),K=c.getFragmentShaderID(T);const ne=s.getRenderTarget(),Se=s.state.buffers.depth.getReversed(),Le=z.isInstancedMesh===!0,Te=z.isBatchedMesh===!0,Ze=!!T.map,ft=!!T.matcap,I=!!G,se=!!T.aoMap,Z=!!T.lightMap,J=!!T.bumpMap,Q=!!T.normalMap,me=!!T.displacementMap,he=!!T.emissiveMap,ge=!!T.metalnessMap,Xe=!!T.roughnessMap,Be=T.anisotropy>0,P=T.clearcoat>0,E=T.dispersion>0,H=T.iridescence>0,q=T.sheen>0,re=T.transmission>0,j=Be&&!!T.anisotropyMap,Ie=P&&!!T.clearcoatMap,pe=P&&!!T.clearcoatNormalMap,Ae=P&&!!T.clearcoatRoughnessMap,Ce=H&&!!T.iridescenceMap,ue=H&&!!T.iridescenceThicknessMap,xe=q&&!!T.sheenColorMap,ze=q&&!!T.sheenRoughnessMap,Ne=!!T.specularMap,ve=!!T.specularColorMap,te=!!T.specularIntensityMap,U=re&&!!T.transmissionMap,ie=re&&!!T.thicknessMap,oe=!!T.gradientMap,_e=!!T.alphaMap,ae=T.alphaTest>0,ee=!!T.alphaHash,we=!!T.extensions;let je=Si;T.toneMapped&&(ne===null||ne.isXRRenderTarget===!0)&&(je=s.toneMapping);const Mt={shaderID:$,shaderType:T.type,shaderName:T.name,vertexShader:Je,fragmentShader:ct,defines:T.defines,customVertexShaderID:tt,customFragmentShaderID:K,isRawShaderMaterial:T.isRawShaderMaterial===!0,glslVersion:T.glslVersion,precision:d,batching:Te,batchingColor:Te&&z._colorsTexture!==null,instancing:Le,instancingColor:Le&&z.instanceColor!==null,instancingMorph:Le&&z.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:ne===null?s.outputColorSpace:ne.isXRRenderTarget===!0?ne.texture.colorSpace:nn,alphaToCoverage:!!T.alphaToCoverage,map:Ze,matcap:ft,envMap:I,envMapMode:I&&G.mapping,envMapCubeUVHeight:B,aoMap:se,lightMap:Z,bumpMap:J,normalMap:Q,displacementMap:f&&me,emissiveMap:he,normalMapObjectSpace:Q&&T.normalMapType===Md,normalMapTangentSpace:Q&&T.normalMapType===Bu,metalnessMap:ge,roughnessMap:Xe,anisotropy:Be,anisotropyMap:j,clearcoat:P,clearcoatMap:Ie,clearcoatNormalMap:pe,clearcoatRoughnessMap:Ae,dispersion:E,iridescence:H,iridescenceMap:Ce,iridescenceThicknessMap:ue,sheen:q,sheenColorMap:xe,sheenRoughnessMap:ze,specularMap:Ne,specularColorMap:ve,specularIntensityMap:te,transmission:re,transmissionMap:U,thicknessMap:ie,gradientMap:oe,opaque:T.transparent===!1&&T.blending===ws&&T.alphaToCoverage===!1,alphaMap:_e,alphaTest:ae,alphaHash:ee,combine:T.combine,mapUv:Ze&&x(T.map.channel),aoMapUv:se&&x(T.aoMap.channel),lightMapUv:Z&&x(T.lightMap.channel),bumpMapUv:J&&x(T.bumpMap.channel),normalMapUv:Q&&x(T.normalMap.channel),displacementMapUv:me&&x(T.displacementMap.channel),emissiveMapUv:he&&x(T.emissiveMap.channel),metalnessMapUv:ge&&x(T.metalnessMap.channel),roughnessMapUv:Xe&&x(T.roughnessMap.channel),anisotropyMapUv:j&&x(T.anisotropyMap.channel),clearcoatMapUv:Ie&&x(T.clearcoatMap.channel),clearcoatNormalMapUv:pe&&x(T.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ae&&x(T.clearcoatRoughnessMap.channel),iridescenceMapUv:Ce&&x(T.iridescenceMap.channel),iridescenceThicknessMapUv:ue&&x(T.iridescenceThicknessMap.channel),sheenColorMapUv:xe&&x(T.sheenColorMap.channel),sheenRoughnessMapUv:ze&&x(T.sheenRoughnessMap.channel),specularMapUv:Ne&&x(T.specularMap.channel),specularColorMapUv:ve&&x(T.specularColorMap.channel),specularIntensityMapUv:te&&x(T.specularIntensityMap.channel),transmissionMapUv:U&&x(T.transmissionMap.channel),thicknessMapUv:ie&&x(T.thicknessMap.channel),alphaMapUv:_e&&x(T.alphaMap.channel),vertexTangents:!!F.attributes.tangent&&(Q||Be),vertexColors:T.vertexColors,vertexAlphas:T.vertexColors===!0&&!!F.attributes.color&&F.attributes.color.itemSize===4,pointsUvs:z.isPoints===!0&&!!F.attributes.uv&&(Ze||_e),fog:!!N,useFog:T.fog===!0,fogExp2:!!N&&N.isFogExp2,flatShading:T.flatShading===!0&&T.wireframe===!1,sizeAttenuation:T.sizeAttenuation===!0,logarithmicDepthBuffer:u,reversedDepthBuffer:Se,skinning:z.isSkinnedMesh===!0,morphTargets:F.morphAttributes.position!==void 0,morphNormals:F.morphAttributes.normal!==void 0,morphColors:F.morphAttributes.color!==void 0,morphTargetsCount:ce,morphTextureStride:Re,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:T.dithering,shadowMapEnabled:s.shadowMap.enabled&&L.length>0,shadowMapType:s.shadowMap.type,toneMapping:je,decodeVideoTexture:Ze&&T.map.isVideoTexture===!0&&rt.getTransfer(T.map.colorSpace)===xt,decodeVideoTextureEmissive:he&&T.emissiveMap.isVideoTexture===!0&&rt.getTransfer(T.emissiveMap.colorSpace)===xt,premultipliedAlpha:T.premultipliedAlpha,doubleSided:T.side===Et,flipSided:T.side===Wt,useDepthPacking:T.depthPacking>=0,depthPacking:T.depthPacking||0,index0AttributeName:T.index0AttributeName,extensionClipCullDistance:we&&T.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(we&&T.extensions.multiDraw===!0||Te)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:T.customProgramCacheKey()};return Mt.vertexUv1s=l.has(1),Mt.vertexUv2s=l.has(2),Mt.vertexUv3s=l.has(3),l.clear(),Mt}function p(T){const S=[];if(T.shaderID?S.push(T.shaderID):(S.push(T.customVertexShaderID),S.push(T.customFragmentShaderID)),T.defines!==void 0)for(const L in T.defines)S.push(L),S.push(T.defines[L]);return T.isRawShaderMaterial===!1&&(M(S,T),v(S,T),S.push(s.outputColorSpace)),S.push(T.customProgramCacheKey),S.join()}function M(T,S){T.push(S.precision),T.push(S.outputColorSpace),T.push(S.envMapMode),T.push(S.envMapCubeUVHeight),T.push(S.mapUv),T.push(S.alphaMapUv),T.push(S.lightMapUv),T.push(S.aoMapUv),T.push(S.bumpMapUv),T.push(S.normalMapUv),T.push(S.displacementMapUv),T.push(S.emissiveMapUv),T.push(S.metalnessMapUv),T.push(S.roughnessMapUv),T.push(S.anisotropyMapUv),T.push(S.clearcoatMapUv),T.push(S.clearcoatNormalMapUv),T.push(S.clearcoatRoughnessMapUv),T.push(S.iridescenceMapUv),T.push(S.iridescenceThicknessMapUv),T.push(S.sheenColorMapUv),T.push(S.sheenRoughnessMapUv),T.push(S.specularMapUv),T.push(S.specularColorMapUv),T.push(S.specularIntensityMapUv),T.push(S.transmissionMapUv),T.push(S.thicknessMapUv),T.push(S.combine),T.push(S.fogExp2),T.push(S.sizeAttenuation),T.push(S.morphTargetsCount),T.push(S.morphAttributeCount),T.push(S.numDirLights),T.push(S.numPointLights),T.push(S.numSpotLights),T.push(S.numSpotLightMaps),T.push(S.numHemiLights),T.push(S.numRectAreaLights),T.push(S.numDirLightShadows),T.push(S.numPointLightShadows),T.push(S.numSpotLightShadows),T.push(S.numSpotLightShadowsWithMaps),T.push(S.numLightProbes),T.push(S.shadowMapType),T.push(S.toneMapping),T.push(S.numClippingPlanes),T.push(S.numClipIntersection),T.push(S.depthPacking)}function v(T,S){a.disableAll(),S.supportsVertexTextures&&a.enable(0),S.instancing&&a.enable(1),S.instancingColor&&a.enable(2),S.instancingMorph&&a.enable(3),S.matcap&&a.enable(4),S.envMap&&a.enable(5),S.normalMapObjectSpace&&a.enable(6),S.normalMapTangentSpace&&a.enable(7),S.clearcoat&&a.enable(8),S.iridescence&&a.enable(9),S.alphaTest&&a.enable(10),S.vertexColors&&a.enable(11),S.vertexAlphas&&a.enable(12),S.vertexUv1s&&a.enable(13),S.vertexUv2s&&a.enable(14),S.vertexUv3s&&a.enable(15),S.vertexTangents&&a.enable(16),S.anisotropy&&a.enable(17),S.alphaHash&&a.enable(18),S.batching&&a.enable(19),S.dispersion&&a.enable(20),S.batchingColor&&a.enable(21),S.gradientMap&&a.enable(22),T.push(a.mask),a.disableAll(),S.fog&&a.enable(0),S.useFog&&a.enable(1),S.flatShading&&a.enable(2),S.logarithmicDepthBuffer&&a.enable(3),S.reversedDepthBuffer&&a.enable(4),S.skinning&&a.enable(5),S.morphTargets&&a.enable(6),S.morphNormals&&a.enable(7),S.morphColors&&a.enable(8),S.premultipliedAlpha&&a.enable(9),S.shadowMapEnabled&&a.enable(10),S.doubleSided&&a.enable(11),S.flipSided&&a.enable(12),S.useDepthPacking&&a.enable(13),S.dithering&&a.enable(14),S.transmission&&a.enable(15),S.sheen&&a.enable(16),S.opaque&&a.enable(17),S.pointsUvs&&a.enable(18),S.decodeVideoTexture&&a.enable(19),S.decodeVideoTextureEmissive&&a.enable(20),S.alphaToCoverage&&a.enable(21),T.push(a.mask)}function _(T){const S=m[T.type];let L;if(S){const D=Bn[S];L=qu.clone(D.uniforms)}else L=T.uniforms;return L}function w(T,S){let L;for(let D=0,z=h.length;D<z;D++){const N=h[D];if(N.cacheKey===S){L=N,++L.usedTimes;break}}return L===void 0&&(L=new Xv(s,S,T,r),h.push(L)),L}function b(T){if(--T.usedTimes===0){const S=h.indexOf(T);h[S]=h[h.length-1],h.pop(),T.destroy()}}function y(T){c.remove(T)}function A(){c.dispose()}return{getParameters:g,getProgramCacheKey:p,getUniforms:_,acquireProgram:w,releaseProgram:b,releaseShaderCache:y,programs:h,dispose:A}}function Zv(){let s=new WeakMap;function e(o){return s.has(o)}function t(o){let a=s.get(o);return a===void 0&&(a={},s.set(o,a)),a}function n(o){s.delete(o)}function i(o,a,c){s.get(o)[a]=c}function r(){s=new WeakMap}return{has:e,get:t,remove:n,update:i,dispose:r}}function $v(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.material.id!==e.material.id?s.material.id-e.material.id:s.z!==e.z?s.z-e.z:s.id-e.id}function $h(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.z!==e.z?e.z-s.z:s.id-e.id}function Jh(){const s=[];let e=0;const t=[],n=[],i=[];function r(){e=0,t.length=0,n.length=0,i.length=0}function o(u,f,d,m,x,g){let p=s[e];return p===void 0?(p={id:u.id,object:u,geometry:f,material:d,groupOrder:m,renderOrder:u.renderOrder,z:x,group:g},s[e]=p):(p.id=u.id,p.object=u,p.geometry=f,p.material=d,p.groupOrder=m,p.renderOrder=u.renderOrder,p.z=x,p.group=g),e++,p}function a(u,f,d,m,x,g){const p=o(u,f,d,m,x,g);d.transmission>0?n.push(p):d.transparent===!0?i.push(p):t.push(p)}function c(u,f,d,m,x,g){const p=o(u,f,d,m,x,g);d.transmission>0?n.unshift(p):d.transparent===!0?i.unshift(p):t.unshift(p)}function l(u,f){t.length>1&&t.sort(u||$v),n.length>1&&n.sort(f||$h),i.length>1&&i.sort(f||$h)}function h(){for(let u=e,f=s.length;u<f;u++){const d=s[u];if(d.id===null)break;d.id=null,d.object=null,d.geometry=null,d.material=null,d.group=null}}return{opaque:t,transmissive:n,transparent:i,init:r,push:a,unshift:c,finish:h,sort:l}}function Jv(){let s=new WeakMap;function e(n,i){const r=s.get(n);let o;return r===void 0?(o=new Jh,s.set(n,[o])):i>=r.length?(o=new Jh,r.push(o)):o=r[i],o}function t(){s=new WeakMap}return{get:e,dispose:t}}function Qv(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new C,color:new Me};break;case"SpotLight":t={position:new C,direction:new C,color:new Me,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new C,color:new Me,distance:0,decay:0};break;case"HemisphereLight":t={direction:new C,skyColor:new Me,groundColor:new Me};break;case"RectAreaLight":t={color:new Me,position:new C,halfWidth:new C,halfHeight:new C};break}return s[e.id]=t,t}}}function e_(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new le};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new le};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new le,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[e.id]=t,t}}}let t_=0;function n_(s,e){return(e.castShadow?2:0)-(s.castShadow?2:0)+(e.map?1:0)-(s.map?1:0)}function i_(s){const e=new Qv,t=e_(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new C);const i=new C,r=new qe,o=new qe;function a(l){let h=0,u=0,f=0;for(let T=0;T<9;T++)n.probe[T].set(0,0,0);let d=0,m=0,x=0,g=0,p=0,M=0,v=0,_=0,w=0,b=0,y=0;l.sort(n_);for(let T=0,S=l.length;T<S;T++){const L=l[T],D=L.color,z=L.intensity,N=L.distance,F=L.shadow&&L.shadow.map?L.shadow.map.texture:null;if(L.isAmbientLight)h+=D.r*z,u+=D.g*z,f+=D.b*z;else if(L.isLightProbe){for(let V=0;V<9;V++)n.probe[V].addScaledVector(L.sh.coefficients[V],z);y++}else if(L.isDirectionalLight){const V=e.get(L);if(V.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const G=L.shadow,B=t.get(L);B.shadowIntensity=G.intensity,B.shadowBias=G.bias,B.shadowNormalBias=G.normalBias,B.shadowRadius=G.radius,B.shadowMapSize=G.mapSize,n.directionalShadow[d]=B,n.directionalShadowMap[d]=F,n.directionalShadowMatrix[d]=L.shadow.matrix,M++}n.directional[d]=V,d++}else if(L.isSpotLight){const V=e.get(L);V.position.setFromMatrixPosition(L.matrixWorld),V.color.copy(D).multiplyScalar(z),V.distance=N,V.coneCos=Math.cos(L.angle),V.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),V.decay=L.decay,n.spot[x]=V;const G=L.shadow;if(L.map&&(n.spotLightMap[w]=L.map,w++,G.updateMatrices(L),L.castShadow&&b++),n.spotLightMatrix[x]=G.matrix,L.castShadow){const B=t.get(L);B.shadowIntensity=G.intensity,B.shadowBias=G.bias,B.shadowNormalBias=G.normalBias,B.shadowRadius=G.radius,B.shadowMapSize=G.mapSize,n.spotShadow[x]=B,n.spotShadowMap[x]=F,_++}x++}else if(L.isRectAreaLight){const V=e.get(L);V.color.copy(D).multiplyScalar(z),V.halfWidth.set(L.width*.5,0,0),V.halfHeight.set(0,L.height*.5,0),n.rectArea[g]=V,g++}else if(L.isPointLight){const V=e.get(L);if(V.color.copy(L.color).multiplyScalar(L.intensity),V.distance=L.distance,V.decay=L.decay,L.castShadow){const G=L.shadow,B=t.get(L);B.shadowIntensity=G.intensity,B.shadowBias=G.bias,B.shadowNormalBias=G.normalBias,B.shadowRadius=G.radius,B.shadowMapSize=G.mapSize,B.shadowCameraNear=G.camera.near,B.shadowCameraFar=G.camera.far,n.pointShadow[m]=B,n.pointShadowMap[m]=F,n.pointShadowMatrix[m]=L.shadow.matrix,v++}n.point[m]=V,m++}else if(L.isHemisphereLight){const V=e.get(L);V.skyColor.copy(L.color).multiplyScalar(z),V.groundColor.copy(L.groundColor).multiplyScalar(z),n.hemi[p]=V,p++}}g>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ye.LTC_FLOAT_1,n.rectAreaLTC2=ye.LTC_FLOAT_2):(n.rectAreaLTC1=ye.LTC_HALF_1,n.rectAreaLTC2=ye.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=f;const A=n.hash;(A.directionalLength!==d||A.pointLength!==m||A.spotLength!==x||A.rectAreaLength!==g||A.hemiLength!==p||A.numDirectionalShadows!==M||A.numPointShadows!==v||A.numSpotShadows!==_||A.numSpotMaps!==w||A.numLightProbes!==y)&&(n.directional.length=d,n.spot.length=x,n.rectArea.length=g,n.point.length=m,n.hemi.length=p,n.directionalShadow.length=M,n.directionalShadowMap.length=M,n.pointShadow.length=v,n.pointShadowMap.length=v,n.spotShadow.length=_,n.spotShadowMap.length=_,n.directionalShadowMatrix.length=M,n.pointShadowMatrix.length=v,n.spotLightMatrix.length=_+w-b,n.spotLightMap.length=w,n.numSpotLightShadowsWithMaps=b,n.numLightProbes=y,A.directionalLength=d,A.pointLength=m,A.spotLength=x,A.rectAreaLength=g,A.hemiLength=p,A.numDirectionalShadows=M,A.numPointShadows=v,A.numSpotShadows=_,A.numSpotMaps=w,A.numLightProbes=y,n.version=t_++)}function c(l,h){let u=0,f=0,d=0,m=0,x=0;const g=h.matrixWorldInverse;for(let p=0,M=l.length;p<M;p++){const v=l[p];if(v.isDirectionalLight){const _=n.directional[u];_.direction.setFromMatrixPosition(v.matrixWorld),i.setFromMatrixPosition(v.target.matrixWorld),_.direction.sub(i),_.direction.transformDirection(g),u++}else if(v.isSpotLight){const _=n.spot[d];_.position.setFromMatrixPosition(v.matrixWorld),_.position.applyMatrix4(g),_.direction.setFromMatrixPosition(v.matrixWorld),i.setFromMatrixPosition(v.target.matrixWorld),_.direction.sub(i),_.direction.transformDirection(g),d++}else if(v.isRectAreaLight){const _=n.rectArea[m];_.position.setFromMatrixPosition(v.matrixWorld),_.position.applyMatrix4(g),o.identity(),r.copy(v.matrixWorld),r.premultiply(g),o.extractRotation(r),_.halfWidth.set(v.width*.5,0,0),_.halfHeight.set(0,v.height*.5,0),_.halfWidth.applyMatrix4(o),_.halfHeight.applyMatrix4(o),m++}else if(v.isPointLight){const _=n.point[f];_.position.setFromMatrixPosition(v.matrixWorld),_.position.applyMatrix4(g),f++}else if(v.isHemisphereLight){const _=n.hemi[x];_.direction.setFromMatrixPosition(v.matrixWorld),_.direction.transformDirection(g),x++}}}return{setup:a,setupView:c,state:n}}function Qh(s){const e=new i_(s),t=[],n=[];function i(h){l.camera=h,t.length=0,n.length=0}function r(h){t.push(h)}function o(h){n.push(h)}function a(){e.setup(t)}function c(h){e.setupView(t,h)}const l={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:i,state:l,setupLights:a,setupLightsView:c,pushLight:r,pushShadow:o}}function s_(s){let e=new WeakMap;function t(i,r=0){const o=e.get(i);let a;return o===void 0?(a=new Qh(s),e.set(i,[a])):r>=o.length?(a=new Qh(s),o.push(a)):a=o[r],a}function n(){e=new WeakMap}return{get:t,dispose:n}}const r_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,o_=`uniform sampler2D shadow_pass;
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
}`;function a_(s,e,t){let n=new Qc;const i=new le,r=new le,o=new at,a=new hf({depthPacking:ku}),c=new rm,l={},h=t.maxTextureSize,u={[ai]:Wt,[Wt]:ai,[Et]:Et},f=new Xt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new le},radius:{value:4}},vertexShader:r_,fragmentShader:o_}),d=f.clone();d.defines.HORIZONTAL_PASS=1;const m=new wt;m.setAttribute("position",new yt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new st(m,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Tu;let p=this.type;this.render=function(b,y,A){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||b.length===0)return;const T=s.getRenderTarget(),S=s.getActiveCubeFace(),L=s.getActiveMipmapLevel(),D=s.state;D.setBlending(bi),D.buffers.depth.getReversed()===!0?D.buffers.color.setClear(0,0,0,0):D.buffers.color.setClear(1,1,1,1),D.buffers.depth.setTest(!0),D.setScissorTest(!1);const z=p!==ti&&this.type===ti,N=p===ti&&this.type!==ti;for(let F=0,V=b.length;F<V;F++){const G=b[F],B=G.shadow;if(B===void 0){console.warn("THREE.WebGLShadowMap:",G,"has no shadow.");continue}if(B.autoUpdate===!1&&B.needsUpdate===!1)continue;i.copy(B.mapSize);const $=B.getFrameExtents();if(i.multiply($),r.copy(B.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(r.x=Math.floor(h/$.x),i.x=r.x*$.x,B.mapSize.x=r.x),i.y>h&&(r.y=Math.floor(h/$.y),i.y=r.y*$.y,B.mapSize.y=r.y)),B.map===null||z===!0||N===!0){const ce=this.type!==ti?{minFilter:tn,magFilter:tn}:{};B.map!==null&&B.map.dispose(),B.map=new Dn(i.x,i.y,ce),B.map.texture.name=G.name+".shadowMap",B.camera.updateProjectionMatrix()}s.setRenderTarget(B.map),s.clear();const fe=B.getViewportCount();for(let ce=0;ce<fe;ce++){const Re=B.getViewport(ce);o.set(r.x*Re.x,r.y*Re.y,r.x*Re.z,r.y*Re.w),D.viewport(o),B.updateMatrices(G,ce),n=B.getFrustum(),_(y,A,B.camera,G,this.type)}B.isPointLightShadow!==!0&&this.type===ti&&M(B,A),B.needsUpdate=!1}p=this.type,g.needsUpdate=!1,s.setRenderTarget(T,S,L)};function M(b,y){const A=e.update(x);f.defines.VSM_SAMPLES!==b.blurSamples&&(f.defines.VSM_SAMPLES=b.blurSamples,d.defines.VSM_SAMPLES=b.blurSamples,f.needsUpdate=!0,d.needsUpdate=!0),b.mapPass===null&&(b.mapPass=new Dn(i.x,i.y)),f.uniforms.shadow_pass.value=b.map.texture,f.uniforms.resolution.value=b.mapSize,f.uniforms.radius.value=b.radius,s.setRenderTarget(b.mapPass),s.clear(),s.renderBufferDirect(y,null,A,f,x,null),d.uniforms.shadow_pass.value=b.mapPass.texture,d.uniforms.resolution.value=b.mapSize,d.uniforms.radius.value=b.radius,s.setRenderTarget(b.map),s.clear(),s.renderBufferDirect(y,null,A,d,x,null)}function v(b,y,A,T){let S=null;const L=A.isPointLight===!0?b.customDistanceMaterial:b.customDepthMaterial;if(L!==void 0)S=L;else if(S=A.isPointLight===!0?c:a,s.localClippingEnabled&&y.clipShadows===!0&&Array.isArray(y.clippingPlanes)&&y.clippingPlanes.length!==0||y.displacementMap&&y.displacementScale!==0||y.alphaMap&&y.alphaTest>0||y.map&&y.alphaTest>0||y.alphaToCoverage===!0){const D=S.uuid,z=y.uuid;let N=l[D];N===void 0&&(N={},l[D]=N);let F=N[z];F===void 0&&(F=S.clone(),N[z]=F,y.addEventListener("dispose",w)),S=F}if(S.visible=y.visible,S.wireframe=y.wireframe,T===ti?S.side=y.shadowSide!==null?y.shadowSide:y.side:S.side=y.shadowSide!==null?y.shadowSide:u[y.side],S.alphaMap=y.alphaMap,S.alphaTest=y.alphaToCoverage===!0?.5:y.alphaTest,S.map=y.map,S.clipShadows=y.clipShadows,S.clippingPlanes=y.clippingPlanes,S.clipIntersection=y.clipIntersection,S.displacementMap=y.displacementMap,S.displacementScale=y.displacementScale,S.displacementBias=y.displacementBias,S.wireframeLinewidth=y.wireframeLinewidth,S.linewidth=y.linewidth,A.isPointLight===!0&&S.isMeshDistanceMaterial===!0){const D=s.properties.get(S);D.light=A}return S}function _(b,y,A,T,S){if(b.visible===!1)return;if(b.layers.test(y.layers)&&(b.isMesh||b.isLine||b.isPoints)&&(b.castShadow||b.receiveShadow&&S===ti)&&(!b.frustumCulled||n.intersectsObject(b))){b.modelViewMatrix.multiplyMatrices(A.matrixWorldInverse,b.matrixWorld);const z=e.update(b),N=b.material;if(Array.isArray(N)){const F=z.groups;for(let V=0,G=F.length;V<G;V++){const B=F[V],$=N[B.materialIndex];if($&&$.visible){const fe=v(b,$,T,S);b.onBeforeShadow(s,b,y,A,z,fe,B),s.renderBufferDirect(A,null,z,fe,b,B),b.onAfterShadow(s,b,y,A,z,fe,B)}}}else if(N.visible){const F=v(b,N,T,S);b.onBeforeShadow(s,b,y,A,z,F,null),s.renderBufferDirect(A,null,z,F,b,null),b.onAfterShadow(s,b,y,A,z,F,null)}}const D=b.children;for(let z=0,N=D.length;z<N;z++)_(D[z],y,A,T,S)}function w(b){b.target.removeEventListener("dispose",w);for(const A in l){const T=l[A],S=b.target.uuid;S in T&&(T[S].dispose(),delete T[S])}}}const c_={[Oa]:ka,[Ba]:Ga,[Ha]:Wa,[Es]:Va,[ka]:Oa,[Ga]:Ba,[Wa]:Ha,[Va]:Es};function l_(s,e){function t(){let U=!1;const ie=new at;let oe=null;const _e=new at(0,0,0,0);return{setMask:function(ae){oe!==ae&&!U&&(s.colorMask(ae,ae,ae,ae),oe=ae)},setLocked:function(ae){U=ae},setClear:function(ae,ee,we,je,Mt){Mt===!0&&(ae*=je,ee*=je,we*=je),ie.set(ae,ee,we,je),_e.equals(ie)===!1&&(s.clearColor(ae,ee,we,je),_e.copy(ie))},reset:function(){U=!1,oe=null,_e.set(-1,0,0,0)}}}function n(){let U=!1,ie=!1,oe=null,_e=null,ae=null;return{setReversed:function(ee){if(ie!==ee){const we=e.get("EXT_clip_control");ee?we.clipControlEXT(we.LOWER_LEFT_EXT,we.ZERO_TO_ONE_EXT):we.clipControlEXT(we.LOWER_LEFT_EXT,we.NEGATIVE_ONE_TO_ONE_EXT),ie=ee;const je=ae;ae=null,this.setClear(je)}},getReversed:function(){return ie},setTest:function(ee){ee?ne(s.DEPTH_TEST):Se(s.DEPTH_TEST)},setMask:function(ee){oe!==ee&&!U&&(s.depthMask(ee),oe=ee)},setFunc:function(ee){if(ie&&(ee=c_[ee]),_e!==ee){switch(ee){case Oa:s.depthFunc(s.NEVER);break;case ka:s.depthFunc(s.ALWAYS);break;case Ba:s.depthFunc(s.LESS);break;case Es:s.depthFunc(s.LEQUAL);break;case Ha:s.depthFunc(s.EQUAL);break;case Va:s.depthFunc(s.GEQUAL);break;case Ga:s.depthFunc(s.GREATER);break;case Wa:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}_e=ee}},setLocked:function(ee){U=ee},setClear:function(ee){ae!==ee&&(ie&&(ee=1-ee),s.clearDepth(ee),ae=ee)},reset:function(){U=!1,oe=null,_e=null,ae=null,ie=!1}}}function i(){let U=!1,ie=null,oe=null,_e=null,ae=null,ee=null,we=null,je=null,Mt=null;return{setTest:function(dt){U||(dt?ne(s.STENCIL_TEST):Se(s.STENCIL_TEST))},setMask:function(dt){ie!==dt&&!U&&(s.stencilMask(dt),ie=dt)},setFunc:function(dt,jn,On){(oe!==dt||_e!==jn||ae!==On)&&(s.stencilFunc(dt,jn,On),oe=dt,_e=jn,ae=On)},setOp:function(dt,jn,On){(ee!==dt||we!==jn||je!==On)&&(s.stencilOp(dt,jn,On),ee=dt,we=jn,je=On)},setLocked:function(dt){U=dt},setClear:function(dt){Mt!==dt&&(s.clearStencil(dt),Mt=dt)},reset:function(){U=!1,ie=null,oe=null,_e=null,ae=null,ee=null,we=null,je=null,Mt=null}}}const r=new t,o=new n,a=new i,c=new WeakMap,l=new WeakMap;let h={},u={},f=new WeakMap,d=[],m=null,x=!1,g=null,p=null,M=null,v=null,_=null,w=null,b=null,y=new Me(0,0,0),A=0,T=!1,S=null,L=null,D=null,z=null,N=null;const F=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let V=!1,G=0;const B=s.getParameter(s.VERSION);B.indexOf("WebGL")!==-1?(G=parseFloat(/^WebGL (\d)/.exec(B)[1]),V=G>=1):B.indexOf("OpenGL ES")!==-1&&(G=parseFloat(/^OpenGL ES (\d)/.exec(B)[1]),V=G>=2);let $=null,fe={};const ce=s.getParameter(s.SCISSOR_BOX),Re=s.getParameter(s.VIEWPORT),Je=new at().fromArray(ce),ct=new at().fromArray(Re);function tt(U,ie,oe,_e){const ae=new Uint8Array(4),ee=s.createTexture();s.bindTexture(U,ee),s.texParameteri(U,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(U,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let we=0;we<oe;we++)U===s.TEXTURE_3D||U===s.TEXTURE_2D_ARRAY?s.texImage3D(ie,0,s.RGBA,1,1,_e,0,s.RGBA,s.UNSIGNED_BYTE,ae):s.texImage2D(ie+we,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,ae);return ee}const K={};K[s.TEXTURE_2D]=tt(s.TEXTURE_2D,s.TEXTURE_2D,1),K[s.TEXTURE_CUBE_MAP]=tt(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),K[s.TEXTURE_2D_ARRAY]=tt(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),K[s.TEXTURE_3D]=tt(s.TEXTURE_3D,s.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ne(s.DEPTH_TEST),o.setFunc(Es),J(!1),Q(Pl),ne(s.CULL_FACE),se(bi);function ne(U){h[U]!==!0&&(s.enable(U),h[U]=!0)}function Se(U){h[U]!==!1&&(s.disable(U),h[U]=!1)}function Le(U,ie){return u[U]!==ie?(s.bindFramebuffer(U,ie),u[U]=ie,U===s.DRAW_FRAMEBUFFER&&(u[s.FRAMEBUFFER]=ie),U===s.FRAMEBUFFER&&(u[s.DRAW_FRAMEBUFFER]=ie),!0):!1}function Te(U,ie){let oe=d,_e=!1;if(U){oe=f.get(ie),oe===void 0&&(oe=[],f.set(ie,oe));const ae=U.textures;if(oe.length!==ae.length||oe[0]!==s.COLOR_ATTACHMENT0){for(let ee=0,we=ae.length;ee<we;ee++)oe[ee]=s.COLOR_ATTACHMENT0+ee;oe.length=ae.length,_e=!0}}else oe[0]!==s.BACK&&(oe[0]=s.BACK,_e=!0);_e&&s.drawBuffers(oe)}function Ze(U){return m!==U?(s.useProgram(U),m=U,!0):!1}const ft={[ki]:s.FUNC_ADD,[qf]:s.FUNC_SUBTRACT,[Yf]:s.FUNC_REVERSE_SUBTRACT};ft[jf]=s.MIN,ft[Kf]=s.MAX;const I={[Zf]:s.ZERO,[$f]:s.ONE,[Jf]:s.SRC_COLOR,[za]:s.SRC_ALPHA,[sd]:s.SRC_ALPHA_SATURATE,[nd]:s.DST_COLOR,[ed]:s.DST_ALPHA,[Qf]:s.ONE_MINUS_SRC_COLOR,[Fa]:s.ONE_MINUS_SRC_ALPHA,[id]:s.ONE_MINUS_DST_COLOR,[td]:s.ONE_MINUS_DST_ALPHA,[rd]:s.CONSTANT_COLOR,[od]:s.ONE_MINUS_CONSTANT_COLOR,[ad]:s.CONSTANT_ALPHA,[cd]:s.ONE_MINUS_CONSTANT_ALPHA};function se(U,ie,oe,_e,ae,ee,we,je,Mt,dt){if(U===bi){x===!0&&(Se(s.BLEND),x=!1);return}if(x===!1&&(ne(s.BLEND),x=!0),U!==Xf){if(U!==g||dt!==T){if((p!==ki||_!==ki)&&(s.blendEquation(s.FUNC_ADD),p=ki,_=ki),dt)switch(U){case ws:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case Ll:s.blendFunc(s.ONE,s.ONE);break;case Il:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case Dl:s.blendFuncSeparate(s.DST_COLOR,s.ONE_MINUS_SRC_ALPHA,s.ZERO,s.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",U);break}else switch(U){case ws:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case Ll:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE,s.ONE,s.ONE);break;case Il:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Dl:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",U);break}M=null,v=null,w=null,b=null,y.set(0,0,0),A=0,g=U,T=dt}return}ae=ae||ie,ee=ee||oe,we=we||_e,(ie!==p||ae!==_)&&(s.blendEquationSeparate(ft[ie],ft[ae]),p=ie,_=ae),(oe!==M||_e!==v||ee!==w||we!==b)&&(s.blendFuncSeparate(I[oe],I[_e],I[ee],I[we]),M=oe,v=_e,w=ee,b=we),(je.equals(y)===!1||Mt!==A)&&(s.blendColor(je.r,je.g,je.b,Mt),y.copy(je),A=Mt),g=U,T=!1}function Z(U,ie){U.side===Et?Se(s.CULL_FACE):ne(s.CULL_FACE);let oe=U.side===Wt;ie&&(oe=!oe),J(oe),U.blending===ws&&U.transparent===!1?se(bi):se(U.blending,U.blendEquation,U.blendSrc,U.blendDst,U.blendEquationAlpha,U.blendSrcAlpha,U.blendDstAlpha,U.blendColor,U.blendAlpha,U.premultipliedAlpha),o.setFunc(U.depthFunc),o.setTest(U.depthTest),o.setMask(U.depthWrite),r.setMask(U.colorWrite);const _e=U.stencilWrite;a.setTest(_e),_e&&(a.setMask(U.stencilWriteMask),a.setFunc(U.stencilFunc,U.stencilRef,U.stencilFuncMask),a.setOp(U.stencilFail,U.stencilZFail,U.stencilZPass)),he(U.polygonOffset,U.polygonOffsetFactor,U.polygonOffsetUnits),U.alphaToCoverage===!0?ne(s.SAMPLE_ALPHA_TO_COVERAGE):Se(s.SAMPLE_ALPHA_TO_COVERAGE)}function J(U){S!==U&&(U?s.frontFace(s.CW):s.frontFace(s.CCW),S=U)}function Q(U){U!==Gf?(ne(s.CULL_FACE),U!==L&&(U===Pl?s.cullFace(s.BACK):U===Wf?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):Se(s.CULL_FACE),L=U}function me(U){U!==D&&(V&&s.lineWidth(U),D=U)}function he(U,ie,oe){U?(ne(s.POLYGON_OFFSET_FILL),(z!==ie||N!==oe)&&(s.polygonOffset(ie,oe),z=ie,N=oe)):Se(s.POLYGON_OFFSET_FILL)}function ge(U){U?ne(s.SCISSOR_TEST):Se(s.SCISSOR_TEST)}function Xe(U){U===void 0&&(U=s.TEXTURE0+F-1),$!==U&&(s.activeTexture(U),$=U)}function Be(U,ie,oe){oe===void 0&&($===null?oe=s.TEXTURE0+F-1:oe=$);let _e=fe[oe];_e===void 0&&(_e={type:void 0,texture:void 0},fe[oe]=_e),(_e.type!==U||_e.texture!==ie)&&($!==oe&&(s.activeTexture(oe),$=oe),s.bindTexture(U,ie||K[U]),_e.type=U,_e.texture=ie)}function P(){const U=fe[$];U!==void 0&&U.type!==void 0&&(s.bindTexture(U.type,null),U.type=void 0,U.texture=void 0)}function E(){try{s.compressedTexImage2D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function H(){try{s.compressedTexImage3D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function q(){try{s.texSubImage2D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function re(){try{s.texSubImage3D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function j(){try{s.compressedTexSubImage2D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function Ie(){try{s.compressedTexSubImage3D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function pe(){try{s.texStorage2D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function Ae(){try{s.texStorage3D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function Ce(){try{s.texImage2D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function ue(){try{s.texImage3D(...arguments)}catch(U){console.error("THREE.WebGLState:",U)}}function xe(U){Je.equals(U)===!1&&(s.scissor(U.x,U.y,U.z,U.w),Je.copy(U))}function ze(U){ct.equals(U)===!1&&(s.viewport(U.x,U.y,U.z,U.w),ct.copy(U))}function Ne(U,ie){let oe=l.get(ie);oe===void 0&&(oe=new WeakMap,l.set(ie,oe));let _e=oe.get(U);_e===void 0&&(_e=s.getUniformBlockIndex(ie,U.name),oe.set(U,_e))}function ve(U,ie){const _e=l.get(ie).get(U);c.get(ie)!==_e&&(s.uniformBlockBinding(ie,_e,U.__bindingPointIndex),c.set(ie,_e))}function te(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),o.setReversed(!1),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),h={},$=null,fe={},u={},f=new WeakMap,d=[],m=null,x=!1,g=null,p=null,M=null,v=null,_=null,w=null,b=null,y=new Me(0,0,0),A=0,T=!1,S=null,L=null,D=null,z=null,N=null,Je.set(0,0,s.canvas.width,s.canvas.height),ct.set(0,0,s.canvas.width,s.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:ne,disable:Se,bindFramebuffer:Le,drawBuffers:Te,useProgram:Ze,setBlending:se,setMaterial:Z,setFlipSided:J,setCullFace:Q,setLineWidth:me,setPolygonOffset:he,setScissorTest:ge,activeTexture:Xe,bindTexture:Be,unbindTexture:P,compressedTexImage2D:E,compressedTexImage3D:H,texImage2D:Ce,texImage3D:ue,updateUBOMapping:Ne,uniformBlockBinding:ve,texStorage2D:pe,texStorage3D:Ae,texSubImage2D:q,texSubImage3D:re,compressedTexSubImage2D:j,compressedTexSubImage3D:Ie,scissor:xe,viewport:ze,reset:te}}function h_(s,e,t,n,i,r,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new le,h=new WeakMap;let u;const f=new WeakMap;let d=!1;try{d=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(P,E){return d?new OffscreenCanvas(P,E):xr("canvas")}function x(P,E,H){let q=1;const re=Be(P);if((re.width>H||re.height>H)&&(q=H/Math.max(re.width,re.height)),q<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){const j=Math.floor(q*re.width),Ie=Math.floor(q*re.height);u===void 0&&(u=m(j,Ie));const pe=E?m(j,Ie):u;return pe.width=j,pe.height=Ie,pe.getContext("2d").drawImage(P,0,0,j,Ie),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+re.width+"x"+re.height+") to ("+j+"x"+Ie+")."),pe}else return"data"in P&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+re.width+"x"+re.height+")."),P;return P}function g(P){return P.generateMipmaps}function p(P){s.generateMipmap(P)}function M(P){return P.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:P.isWebGL3DRenderTarget?s.TEXTURE_3D:P.isWebGLArrayRenderTarget||P.isCompressedArrayTexture?s.TEXTURE_2D_ARRAY:s.TEXTURE_2D}function v(P,E,H,q,re=!1){if(P!==null){if(s[P]!==void 0)return s[P];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let j=E;if(E===s.RED&&(H===s.FLOAT&&(j=s.R32F),H===s.HALF_FLOAT&&(j=s.R16F),H===s.UNSIGNED_BYTE&&(j=s.R8)),E===s.RED_INTEGER&&(H===s.UNSIGNED_BYTE&&(j=s.R8UI),H===s.UNSIGNED_SHORT&&(j=s.R16UI),H===s.UNSIGNED_INT&&(j=s.R32UI),H===s.BYTE&&(j=s.R8I),H===s.SHORT&&(j=s.R16I),H===s.INT&&(j=s.R32I)),E===s.RG&&(H===s.FLOAT&&(j=s.RG32F),H===s.HALF_FLOAT&&(j=s.RG16F),H===s.UNSIGNED_BYTE&&(j=s.RG8)),E===s.RG_INTEGER&&(H===s.UNSIGNED_BYTE&&(j=s.RG8UI),H===s.UNSIGNED_SHORT&&(j=s.RG16UI),H===s.UNSIGNED_INT&&(j=s.RG32UI),H===s.BYTE&&(j=s.RG8I),H===s.SHORT&&(j=s.RG16I),H===s.INT&&(j=s.RG32I)),E===s.RGB_INTEGER&&(H===s.UNSIGNED_BYTE&&(j=s.RGB8UI),H===s.UNSIGNED_SHORT&&(j=s.RGB16UI),H===s.UNSIGNED_INT&&(j=s.RGB32UI),H===s.BYTE&&(j=s.RGB8I),H===s.SHORT&&(j=s.RGB16I),H===s.INT&&(j=s.RGB32I)),E===s.RGBA_INTEGER&&(H===s.UNSIGNED_BYTE&&(j=s.RGBA8UI),H===s.UNSIGNED_SHORT&&(j=s.RGBA16UI),H===s.UNSIGNED_INT&&(j=s.RGBA32UI),H===s.BYTE&&(j=s.RGBA8I),H===s.SHORT&&(j=s.RGBA16I),H===s.INT&&(j=s.RGBA32I)),E===s.RGB&&(H===s.UNSIGNED_INT_5_9_9_9_REV&&(j=s.RGB9_E5),H===s.UNSIGNED_INT_10F_11F_11F_REV&&(j=s.R11F_G11F_B10F)),E===s.RGBA){const Ie=re?Mo:rt.getTransfer(q);H===s.FLOAT&&(j=s.RGBA32F),H===s.HALF_FLOAT&&(j=s.RGBA16F),H===s.UNSIGNED_BYTE&&(j=Ie===xt?s.SRGB8_ALPHA8:s.RGBA8),H===s.UNSIGNED_SHORT_4_4_4_4&&(j=s.RGBA4),H===s.UNSIGNED_SHORT_5_5_5_1&&(j=s.RGB5_A1)}return(j===s.R16F||j===s.R32F||j===s.RG16F||j===s.RG32F||j===s.RGBA16F||j===s.RGBA32F)&&e.get("EXT_color_buffer_float"),j}function _(P,E){let H;return P?E===null||E===Ei||E===fr?H=s.DEPTH24_STENCIL8:E===Ln?H=s.DEPTH32F_STENCIL8:E===ur&&(H=s.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):E===null||E===Ei||E===fr?H=s.DEPTH_COMPONENT24:E===Ln?H=s.DEPTH_COMPONENT32F:E===ur&&(H=s.DEPTH_COMPONENT16),H}function w(P,E){return g(P)===!0||P.isFramebufferTexture&&P.minFilter!==tn&&P.minFilter!==on?Math.log2(Math.max(E.width,E.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?E.mipmaps.length:1}function b(P){const E=P.target;E.removeEventListener("dispose",b),A(E),E.isVideoTexture&&h.delete(E)}function y(P){const E=P.target;E.removeEventListener("dispose",y),S(E)}function A(P){const E=n.get(P);if(E.__webglInit===void 0)return;const H=P.source,q=f.get(H);if(q){const re=q[E.__cacheKey];re.usedTimes--,re.usedTimes===0&&T(P),Object.keys(q).length===0&&f.delete(H)}n.remove(P)}function T(P){const E=n.get(P);s.deleteTexture(E.__webglTexture);const H=P.source,q=f.get(H);delete q[E.__cacheKey],o.memory.textures--}function S(P){const E=n.get(P);if(P.depthTexture&&(P.depthTexture.dispose(),n.remove(P.depthTexture)),P.isWebGLCubeRenderTarget)for(let q=0;q<6;q++){if(Array.isArray(E.__webglFramebuffer[q]))for(let re=0;re<E.__webglFramebuffer[q].length;re++)s.deleteFramebuffer(E.__webglFramebuffer[q][re]);else s.deleteFramebuffer(E.__webglFramebuffer[q]);E.__webglDepthbuffer&&s.deleteRenderbuffer(E.__webglDepthbuffer[q])}else{if(Array.isArray(E.__webglFramebuffer))for(let q=0;q<E.__webglFramebuffer.length;q++)s.deleteFramebuffer(E.__webglFramebuffer[q]);else s.deleteFramebuffer(E.__webglFramebuffer);if(E.__webglDepthbuffer&&s.deleteRenderbuffer(E.__webglDepthbuffer),E.__webglMultisampledFramebuffer&&s.deleteFramebuffer(E.__webglMultisampledFramebuffer),E.__webglColorRenderbuffer)for(let q=0;q<E.__webglColorRenderbuffer.length;q++)E.__webglColorRenderbuffer[q]&&s.deleteRenderbuffer(E.__webglColorRenderbuffer[q]);E.__webglDepthRenderbuffer&&s.deleteRenderbuffer(E.__webglDepthRenderbuffer)}const H=P.textures;for(let q=0,re=H.length;q<re;q++){const j=n.get(H[q]);j.__webglTexture&&(s.deleteTexture(j.__webglTexture),o.memory.textures--),n.remove(H[q])}n.remove(P)}let L=0;function D(){L=0}function z(){const P=L;return P>=i.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+P+" texture units while this GPU supports only "+i.maxTextures),L+=1,P}function N(P){const E=[];return E.push(P.wrapS),E.push(P.wrapT),E.push(P.wrapR||0),E.push(P.magFilter),E.push(P.minFilter),E.push(P.anisotropy),E.push(P.internalFormat),E.push(P.format),E.push(P.type),E.push(P.generateMipmaps),E.push(P.premultiplyAlpha),E.push(P.flipY),E.push(P.unpackAlignment),E.push(P.colorSpace),E.join()}function F(P,E){const H=n.get(P);if(P.isVideoTexture&&ge(P),P.isRenderTargetTexture===!1&&P.isExternalTexture!==!0&&P.version>0&&H.__version!==P.version){const q=P.image;if(q===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(q.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{K(H,P,E);return}}else P.isExternalTexture&&(H.__webglTexture=P.sourceTexture?P.sourceTexture:null);t.bindTexture(s.TEXTURE_2D,H.__webglTexture,s.TEXTURE0+E)}function V(P,E){const H=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&H.__version!==P.version){K(H,P,E);return}t.bindTexture(s.TEXTURE_2D_ARRAY,H.__webglTexture,s.TEXTURE0+E)}function G(P,E){const H=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&H.__version!==P.version){K(H,P,E);return}t.bindTexture(s.TEXTURE_3D,H.__webglTexture,s.TEXTURE0+E)}function B(P,E){const H=n.get(P);if(P.version>0&&H.__version!==P.version){ne(H,P,E);return}t.bindTexture(s.TEXTURE_CUBE_MAP,H.__webglTexture,s.TEXTURE0+E)}const $={[ci]:s.REPEAT,[Pn]:s.CLAMP_TO_EDGE,[yo]:s.MIRRORED_REPEAT},fe={[tn]:s.NEAREST,[Pu]:s.NEAREST_MIPMAP_NEAREST,[tr]:s.NEAREST_MIPMAP_LINEAR,[on]:s.LINEAR,[lo]:s.LINEAR_MIPMAP_NEAREST,[Vn]:s.LINEAR_MIPMAP_LINEAR},ce={[wd]:s.NEVER,[Rd]:s.ALWAYS,[bd]:s.LESS,[Hu]:s.LEQUAL,[Sd]:s.EQUAL,[Ad]:s.GEQUAL,[Td]:s.GREATER,[Ed]:s.NOTEQUAL};function Re(P,E){if(E.type===Ln&&e.has("OES_texture_float_linear")===!1&&(E.magFilter===on||E.magFilter===lo||E.magFilter===tr||E.magFilter===Vn||E.minFilter===on||E.minFilter===lo||E.minFilter===tr||E.minFilter===Vn)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(P,s.TEXTURE_WRAP_S,$[E.wrapS]),s.texParameteri(P,s.TEXTURE_WRAP_T,$[E.wrapT]),(P===s.TEXTURE_3D||P===s.TEXTURE_2D_ARRAY)&&s.texParameteri(P,s.TEXTURE_WRAP_R,$[E.wrapR]),s.texParameteri(P,s.TEXTURE_MAG_FILTER,fe[E.magFilter]),s.texParameteri(P,s.TEXTURE_MIN_FILTER,fe[E.minFilter]),E.compareFunction&&(s.texParameteri(P,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(P,s.TEXTURE_COMPARE_FUNC,ce[E.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(E.magFilter===tn||E.minFilter!==tr&&E.minFilter!==Vn||E.type===Ln&&e.has("OES_texture_float_linear")===!1)return;if(E.anisotropy>1||n.get(E).__currentAnisotropy){const H=e.get("EXT_texture_filter_anisotropic");s.texParameterf(P,H.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(E.anisotropy,i.getMaxAnisotropy())),n.get(E).__currentAnisotropy=E.anisotropy}}}function Je(P,E){let H=!1;P.__webglInit===void 0&&(P.__webglInit=!0,E.addEventListener("dispose",b));const q=E.source;let re=f.get(q);re===void 0&&(re={},f.set(q,re));const j=N(E);if(j!==P.__cacheKey){re[j]===void 0&&(re[j]={texture:s.createTexture(),usedTimes:0},o.memory.textures++,H=!0),re[j].usedTimes++;const Ie=re[P.__cacheKey];Ie!==void 0&&(re[P.__cacheKey].usedTimes--,Ie.usedTimes===0&&T(E)),P.__cacheKey=j,P.__webglTexture=re[j].texture}return H}function ct(P,E,H){return Math.floor(Math.floor(P/H)/E)}function tt(P,E,H,q){const j=P.updateRanges;if(j.length===0)t.texSubImage2D(s.TEXTURE_2D,0,0,0,E.width,E.height,H,q,E.data);else{j.sort((ue,xe)=>ue.start-xe.start);let Ie=0;for(let ue=1;ue<j.length;ue++){const xe=j[Ie],ze=j[ue],Ne=xe.start+xe.count,ve=ct(ze.start,E.width,4),te=ct(xe.start,E.width,4);ze.start<=Ne+1&&ve===te&&ct(ze.start+ze.count-1,E.width,4)===ve?xe.count=Math.max(xe.count,ze.start+ze.count-xe.start):(++Ie,j[Ie]=ze)}j.length=Ie+1;const pe=s.getParameter(s.UNPACK_ROW_LENGTH),Ae=s.getParameter(s.UNPACK_SKIP_PIXELS),Ce=s.getParameter(s.UNPACK_SKIP_ROWS);s.pixelStorei(s.UNPACK_ROW_LENGTH,E.width);for(let ue=0,xe=j.length;ue<xe;ue++){const ze=j[ue],Ne=Math.floor(ze.start/4),ve=Math.ceil(ze.count/4),te=Ne%E.width,U=Math.floor(Ne/E.width),ie=ve,oe=1;s.pixelStorei(s.UNPACK_SKIP_PIXELS,te),s.pixelStorei(s.UNPACK_SKIP_ROWS,U),t.texSubImage2D(s.TEXTURE_2D,0,te,U,ie,oe,H,q,E.data)}P.clearUpdateRanges(),s.pixelStorei(s.UNPACK_ROW_LENGTH,pe),s.pixelStorei(s.UNPACK_SKIP_PIXELS,Ae),s.pixelStorei(s.UNPACK_SKIP_ROWS,Ce)}}function K(P,E,H){let q=s.TEXTURE_2D;(E.isDataArrayTexture||E.isCompressedArrayTexture)&&(q=s.TEXTURE_2D_ARRAY),E.isData3DTexture&&(q=s.TEXTURE_3D);const re=Je(P,E),j=E.source;t.bindTexture(q,P.__webglTexture,s.TEXTURE0+H);const Ie=n.get(j);if(j.version!==Ie.__version||re===!0){t.activeTexture(s.TEXTURE0+H);const pe=rt.getPrimaries(rt.workingColorSpace),Ae=E.colorSpace===ni?null:rt.getPrimaries(E.colorSpace),Ce=E.colorSpace===ni||pe===Ae?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,E.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,E.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ce);let ue=x(E.image,!1,i.maxTextureSize);ue=Xe(E,ue);const xe=r.convert(E.format,E.colorSpace),ze=r.convert(E.type);let Ne=v(E.internalFormat,xe,ze,E.colorSpace,E.isVideoTexture);Re(q,E);let ve;const te=E.mipmaps,U=E.isVideoTexture!==!0,ie=Ie.__version===void 0||re===!0,oe=j.dataReady,_e=w(E,ue);if(E.isDepthTexture)Ne=_(E.format===pr,E.type),ie&&(U?t.texStorage2D(s.TEXTURE_2D,1,Ne,ue.width,ue.height):t.texImage2D(s.TEXTURE_2D,0,Ne,ue.width,ue.height,0,xe,ze,null));else if(E.isDataTexture)if(te.length>0){U&&ie&&t.texStorage2D(s.TEXTURE_2D,_e,Ne,te[0].width,te[0].height);for(let ae=0,ee=te.length;ae<ee;ae++)ve=te[ae],U?oe&&t.texSubImage2D(s.TEXTURE_2D,ae,0,0,ve.width,ve.height,xe,ze,ve.data):t.texImage2D(s.TEXTURE_2D,ae,Ne,ve.width,ve.height,0,xe,ze,ve.data);E.generateMipmaps=!1}else U?(ie&&t.texStorage2D(s.TEXTURE_2D,_e,Ne,ue.width,ue.height),oe&&tt(E,ue,xe,ze)):t.texImage2D(s.TEXTURE_2D,0,Ne,ue.width,ue.height,0,xe,ze,ue.data);else if(E.isCompressedTexture)if(E.isCompressedArrayTexture){U&&ie&&t.texStorage3D(s.TEXTURE_2D_ARRAY,_e,Ne,te[0].width,te[0].height,ue.depth);for(let ae=0,ee=te.length;ae<ee;ae++)if(ve=te[ae],E.format!==fn)if(xe!==null)if(U){if(oe)if(E.layerUpdates.size>0){const we=Ch(ve.width,ve.height,E.format,E.type);for(const je of E.layerUpdates){const Mt=ve.data.subarray(je*we/ve.data.BYTES_PER_ELEMENT,(je+1)*we/ve.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,ae,0,0,je,ve.width,ve.height,1,xe,Mt)}E.clearLayerUpdates()}else t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,ae,0,0,0,ve.width,ve.height,ue.depth,xe,ve.data)}else t.compressedTexImage3D(s.TEXTURE_2D_ARRAY,ae,Ne,ve.width,ve.height,ue.depth,0,ve.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else U?oe&&t.texSubImage3D(s.TEXTURE_2D_ARRAY,ae,0,0,0,ve.width,ve.height,ue.depth,xe,ze,ve.data):t.texImage3D(s.TEXTURE_2D_ARRAY,ae,Ne,ve.width,ve.height,ue.depth,0,xe,ze,ve.data)}else{U&&ie&&t.texStorage2D(s.TEXTURE_2D,_e,Ne,te[0].width,te[0].height);for(let ae=0,ee=te.length;ae<ee;ae++)ve=te[ae],E.format!==fn?xe!==null?U?oe&&t.compressedTexSubImage2D(s.TEXTURE_2D,ae,0,0,ve.width,ve.height,xe,ve.data):t.compressedTexImage2D(s.TEXTURE_2D,ae,Ne,ve.width,ve.height,0,ve.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):U?oe&&t.texSubImage2D(s.TEXTURE_2D,ae,0,0,ve.width,ve.height,xe,ze,ve.data):t.texImage2D(s.TEXTURE_2D,ae,Ne,ve.width,ve.height,0,xe,ze,ve.data)}else if(E.isDataArrayTexture)if(U){if(ie&&t.texStorage3D(s.TEXTURE_2D_ARRAY,_e,Ne,ue.width,ue.height,ue.depth),oe)if(E.layerUpdates.size>0){const ae=Ch(ue.width,ue.height,E.format,E.type);for(const ee of E.layerUpdates){const we=ue.data.subarray(ee*ae/ue.data.BYTES_PER_ELEMENT,(ee+1)*ae/ue.data.BYTES_PER_ELEMENT);t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,ee,ue.width,ue.height,1,xe,ze,we)}E.clearLayerUpdates()}else t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,ue.width,ue.height,ue.depth,xe,ze,ue.data)}else t.texImage3D(s.TEXTURE_2D_ARRAY,0,Ne,ue.width,ue.height,ue.depth,0,xe,ze,ue.data);else if(E.isData3DTexture)U?(ie&&t.texStorage3D(s.TEXTURE_3D,_e,Ne,ue.width,ue.height,ue.depth),oe&&t.texSubImage3D(s.TEXTURE_3D,0,0,0,0,ue.width,ue.height,ue.depth,xe,ze,ue.data)):t.texImage3D(s.TEXTURE_3D,0,Ne,ue.width,ue.height,ue.depth,0,xe,ze,ue.data);else if(E.isFramebufferTexture){if(ie)if(U)t.texStorage2D(s.TEXTURE_2D,_e,Ne,ue.width,ue.height);else{let ae=ue.width,ee=ue.height;for(let we=0;we<_e;we++)t.texImage2D(s.TEXTURE_2D,we,Ne,ae,ee,0,xe,ze,null),ae>>=1,ee>>=1}}else if(te.length>0){if(U&&ie){const ae=Be(te[0]);t.texStorage2D(s.TEXTURE_2D,_e,Ne,ae.width,ae.height)}for(let ae=0,ee=te.length;ae<ee;ae++)ve=te[ae],U?oe&&t.texSubImage2D(s.TEXTURE_2D,ae,0,0,xe,ze,ve):t.texImage2D(s.TEXTURE_2D,ae,Ne,xe,ze,ve);E.generateMipmaps=!1}else if(U){if(ie){const ae=Be(ue);t.texStorage2D(s.TEXTURE_2D,_e,Ne,ae.width,ae.height)}oe&&t.texSubImage2D(s.TEXTURE_2D,0,0,0,xe,ze,ue)}else t.texImage2D(s.TEXTURE_2D,0,Ne,xe,ze,ue);g(E)&&p(q),Ie.__version=j.version,E.onUpdate&&E.onUpdate(E)}P.__version=E.version}function ne(P,E,H){if(E.image.length!==6)return;const q=Je(P,E),re=E.source;t.bindTexture(s.TEXTURE_CUBE_MAP,P.__webglTexture,s.TEXTURE0+H);const j=n.get(re);if(re.version!==j.__version||q===!0){t.activeTexture(s.TEXTURE0+H);const Ie=rt.getPrimaries(rt.workingColorSpace),pe=E.colorSpace===ni?null:rt.getPrimaries(E.colorSpace),Ae=E.colorSpace===ni||Ie===pe?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,E.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,E.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,E.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ae);const Ce=E.isCompressedTexture||E.image[0].isCompressedTexture,ue=E.image[0]&&E.image[0].isDataTexture,xe=[];for(let ee=0;ee<6;ee++)!Ce&&!ue?xe[ee]=x(E.image[ee],!0,i.maxCubemapSize):xe[ee]=ue?E.image[ee].image:E.image[ee],xe[ee]=Xe(E,xe[ee]);const ze=xe[0],Ne=r.convert(E.format,E.colorSpace),ve=r.convert(E.type),te=v(E.internalFormat,Ne,ve,E.colorSpace),U=E.isVideoTexture!==!0,ie=j.__version===void 0||q===!0,oe=re.dataReady;let _e=w(E,ze);Re(s.TEXTURE_CUBE_MAP,E);let ae;if(Ce){U&&ie&&t.texStorage2D(s.TEXTURE_CUBE_MAP,_e,te,ze.width,ze.height);for(let ee=0;ee<6;ee++){ae=xe[ee].mipmaps;for(let we=0;we<ae.length;we++){const je=ae[we];E.format!==fn?Ne!==null?U?oe&&t.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,we,0,0,je.width,je.height,Ne,je.data):t.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,we,te,je.width,je.height,0,je.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):U?oe&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,we,0,0,je.width,je.height,Ne,ve,je.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,we,te,je.width,je.height,0,Ne,ve,je.data)}}}else{if(ae=E.mipmaps,U&&ie){ae.length>0&&_e++;const ee=Be(xe[0]);t.texStorage2D(s.TEXTURE_CUBE_MAP,_e,te,ee.width,ee.height)}for(let ee=0;ee<6;ee++)if(ue){U?oe&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,xe[ee].width,xe[ee].height,Ne,ve,xe[ee].data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,te,xe[ee].width,xe[ee].height,0,Ne,ve,xe[ee].data);for(let we=0;we<ae.length;we++){const Mt=ae[we].image[ee].image;U?oe&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,we+1,0,0,Mt.width,Mt.height,Ne,ve,Mt.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,we+1,te,Mt.width,Mt.height,0,Ne,ve,Mt.data)}}else{U?oe&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,Ne,ve,xe[ee]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,te,Ne,ve,xe[ee]);for(let we=0;we<ae.length;we++){const je=ae[we];U?oe&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,we+1,0,0,Ne,ve,je.image[ee]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,we+1,te,Ne,ve,je.image[ee])}}}g(E)&&p(s.TEXTURE_CUBE_MAP),j.__version=re.version,E.onUpdate&&E.onUpdate(E)}P.__version=E.version}function Se(P,E,H,q,re,j){const Ie=r.convert(H.format,H.colorSpace),pe=r.convert(H.type),Ae=v(H.internalFormat,Ie,pe,H.colorSpace),Ce=n.get(E),ue=n.get(H);if(ue.__renderTarget=E,!Ce.__hasExternalTextures){const xe=Math.max(1,E.width>>j),ze=Math.max(1,E.height>>j);re===s.TEXTURE_3D||re===s.TEXTURE_2D_ARRAY?t.texImage3D(re,j,Ae,xe,ze,E.depth,0,Ie,pe,null):t.texImage2D(re,j,Ae,xe,ze,0,Ie,pe,null)}t.bindFramebuffer(s.FRAMEBUFFER,P),he(E)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,q,re,ue.__webglTexture,0,me(E)):(re===s.TEXTURE_2D||re>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&re<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,q,re,ue.__webglTexture,j),t.bindFramebuffer(s.FRAMEBUFFER,null)}function Le(P,E,H){if(s.bindRenderbuffer(s.RENDERBUFFER,P),E.depthBuffer){const q=E.depthTexture,re=q&&q.isDepthTexture?q.type:null,j=_(E.stencilBuffer,re),Ie=E.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,pe=me(E);he(E)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,pe,j,E.width,E.height):H?s.renderbufferStorageMultisample(s.RENDERBUFFER,pe,j,E.width,E.height):s.renderbufferStorage(s.RENDERBUFFER,j,E.width,E.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,Ie,s.RENDERBUFFER,P)}else{const q=E.textures;for(let re=0;re<q.length;re++){const j=q[re],Ie=r.convert(j.format,j.colorSpace),pe=r.convert(j.type),Ae=v(j.internalFormat,Ie,pe,j.colorSpace),Ce=me(E);H&&he(E)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,Ce,Ae,E.width,E.height):he(E)?a.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,Ce,Ae,E.width,E.height):s.renderbufferStorage(s.RENDERBUFFER,Ae,E.width,E.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function Te(P,E){if(E&&E.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(s.FRAMEBUFFER,P),!(E.depthTexture&&E.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const q=n.get(E.depthTexture);q.__renderTarget=E,(!q.__webglTexture||E.depthTexture.image.width!==E.width||E.depthTexture.image.height!==E.height)&&(E.depthTexture.image.width=E.width,E.depthTexture.image.height=E.height,E.depthTexture.needsUpdate=!0),F(E.depthTexture,0);const re=q.__webglTexture,j=me(E);if(E.depthTexture.format===dr)he(E)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,re,0,j):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,re,0);else if(E.depthTexture.format===pr)he(E)?a.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,re,0,j):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,re,0);else throw new Error("Unknown depthTexture format")}function Ze(P){const E=n.get(P),H=P.isWebGLCubeRenderTarget===!0;if(E.__boundDepthTexture!==P.depthTexture){const q=P.depthTexture;if(E.__depthDisposeCallback&&E.__depthDisposeCallback(),q){const re=()=>{delete E.__boundDepthTexture,delete E.__depthDisposeCallback,q.removeEventListener("dispose",re)};q.addEventListener("dispose",re),E.__depthDisposeCallback=re}E.__boundDepthTexture=q}if(P.depthTexture&&!E.__autoAllocateDepthBuffer){if(H)throw new Error("target.depthTexture not supported in Cube render targets");const q=P.texture.mipmaps;q&&q.length>0?Te(E.__webglFramebuffer[0],P):Te(E.__webglFramebuffer,P)}else if(H){E.__webglDepthbuffer=[];for(let q=0;q<6;q++)if(t.bindFramebuffer(s.FRAMEBUFFER,E.__webglFramebuffer[q]),E.__webglDepthbuffer[q]===void 0)E.__webglDepthbuffer[q]=s.createRenderbuffer(),Le(E.__webglDepthbuffer[q],P,!1);else{const re=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,j=E.__webglDepthbuffer[q];s.bindRenderbuffer(s.RENDERBUFFER,j),s.framebufferRenderbuffer(s.FRAMEBUFFER,re,s.RENDERBUFFER,j)}}else{const q=P.texture.mipmaps;if(q&&q.length>0?t.bindFramebuffer(s.FRAMEBUFFER,E.__webglFramebuffer[0]):t.bindFramebuffer(s.FRAMEBUFFER,E.__webglFramebuffer),E.__webglDepthbuffer===void 0)E.__webglDepthbuffer=s.createRenderbuffer(),Le(E.__webglDepthbuffer,P,!1);else{const re=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,j=E.__webglDepthbuffer;s.bindRenderbuffer(s.RENDERBUFFER,j),s.framebufferRenderbuffer(s.FRAMEBUFFER,re,s.RENDERBUFFER,j)}}t.bindFramebuffer(s.FRAMEBUFFER,null)}function ft(P,E,H){const q=n.get(P);E!==void 0&&Se(q.__webglFramebuffer,P,P.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),H!==void 0&&Ze(P)}function I(P){const E=P.texture,H=n.get(P),q=n.get(E);P.addEventListener("dispose",y);const re=P.textures,j=P.isWebGLCubeRenderTarget===!0,Ie=re.length>1;if(Ie||(q.__webglTexture===void 0&&(q.__webglTexture=s.createTexture()),q.__version=E.version,o.memory.textures++),j){H.__webglFramebuffer=[];for(let pe=0;pe<6;pe++)if(E.mipmaps&&E.mipmaps.length>0){H.__webglFramebuffer[pe]=[];for(let Ae=0;Ae<E.mipmaps.length;Ae++)H.__webglFramebuffer[pe][Ae]=s.createFramebuffer()}else H.__webglFramebuffer[pe]=s.createFramebuffer()}else{if(E.mipmaps&&E.mipmaps.length>0){H.__webglFramebuffer=[];for(let pe=0;pe<E.mipmaps.length;pe++)H.__webglFramebuffer[pe]=s.createFramebuffer()}else H.__webglFramebuffer=s.createFramebuffer();if(Ie)for(let pe=0,Ae=re.length;pe<Ae;pe++){const Ce=n.get(re[pe]);Ce.__webglTexture===void 0&&(Ce.__webglTexture=s.createTexture(),o.memory.textures++)}if(P.samples>0&&he(P)===!1){H.__webglMultisampledFramebuffer=s.createFramebuffer(),H.__webglColorRenderbuffer=[],t.bindFramebuffer(s.FRAMEBUFFER,H.__webglMultisampledFramebuffer);for(let pe=0;pe<re.length;pe++){const Ae=re[pe];H.__webglColorRenderbuffer[pe]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,H.__webglColorRenderbuffer[pe]);const Ce=r.convert(Ae.format,Ae.colorSpace),ue=r.convert(Ae.type),xe=v(Ae.internalFormat,Ce,ue,Ae.colorSpace,P.isXRRenderTarget===!0),ze=me(P);s.renderbufferStorageMultisample(s.RENDERBUFFER,ze,xe,P.width,P.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+pe,s.RENDERBUFFER,H.__webglColorRenderbuffer[pe])}s.bindRenderbuffer(s.RENDERBUFFER,null),P.depthBuffer&&(H.__webglDepthRenderbuffer=s.createRenderbuffer(),Le(H.__webglDepthRenderbuffer,P,!0)),t.bindFramebuffer(s.FRAMEBUFFER,null)}}if(j){t.bindTexture(s.TEXTURE_CUBE_MAP,q.__webglTexture),Re(s.TEXTURE_CUBE_MAP,E);for(let pe=0;pe<6;pe++)if(E.mipmaps&&E.mipmaps.length>0)for(let Ae=0;Ae<E.mipmaps.length;Ae++)Se(H.__webglFramebuffer[pe][Ae],P,E,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+pe,Ae);else Se(H.__webglFramebuffer[pe],P,E,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+pe,0);g(E)&&p(s.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ie){for(let pe=0,Ae=re.length;pe<Ae;pe++){const Ce=re[pe],ue=n.get(Ce);let xe=s.TEXTURE_2D;(P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(xe=P.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(xe,ue.__webglTexture),Re(xe,Ce),Se(H.__webglFramebuffer,P,Ce,s.COLOR_ATTACHMENT0+pe,xe,0),g(Ce)&&p(xe)}t.unbindTexture()}else{let pe=s.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(pe=P.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(pe,q.__webglTexture),Re(pe,E),E.mipmaps&&E.mipmaps.length>0)for(let Ae=0;Ae<E.mipmaps.length;Ae++)Se(H.__webglFramebuffer[Ae],P,E,s.COLOR_ATTACHMENT0,pe,Ae);else Se(H.__webglFramebuffer,P,E,s.COLOR_ATTACHMENT0,pe,0);g(E)&&p(pe),t.unbindTexture()}P.depthBuffer&&Ze(P)}function se(P){const E=P.textures;for(let H=0,q=E.length;H<q;H++){const re=E[H];if(g(re)){const j=M(P),Ie=n.get(re).__webglTexture;t.bindTexture(j,Ie),p(j),t.unbindTexture()}}}const Z=[],J=[];function Q(P){if(P.samples>0){if(he(P)===!1){const E=P.textures,H=P.width,q=P.height;let re=s.COLOR_BUFFER_BIT;const j=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Ie=n.get(P),pe=E.length>1;if(pe)for(let Ce=0;Ce<E.length;Ce++)t.bindFramebuffer(s.FRAMEBUFFER,Ie.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Ce,s.RENDERBUFFER,null),t.bindFramebuffer(s.FRAMEBUFFER,Ie.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+Ce,s.TEXTURE_2D,null,0);t.bindFramebuffer(s.READ_FRAMEBUFFER,Ie.__webglMultisampledFramebuffer);const Ae=P.texture.mipmaps;Ae&&Ae.length>0?t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Ie.__webglFramebuffer[0]):t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Ie.__webglFramebuffer);for(let Ce=0;Ce<E.length;Ce++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(re|=s.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(re|=s.STENCIL_BUFFER_BIT)),pe){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,Ie.__webglColorRenderbuffer[Ce]);const ue=n.get(E[Ce]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,ue,0)}s.blitFramebuffer(0,0,H,q,0,0,H,q,re,s.NEAREST),c===!0&&(Z.length=0,J.length=0,Z.push(s.COLOR_ATTACHMENT0+Ce),P.depthBuffer&&P.resolveDepthBuffer===!1&&(Z.push(j),J.push(j),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,J)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,Z))}if(t.bindFramebuffer(s.READ_FRAMEBUFFER,null),t.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),pe)for(let Ce=0;Ce<E.length;Ce++){t.bindFramebuffer(s.FRAMEBUFFER,Ie.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+Ce,s.RENDERBUFFER,Ie.__webglColorRenderbuffer[Ce]);const ue=n.get(E[Ce]).__webglTexture;t.bindFramebuffer(s.FRAMEBUFFER,Ie.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+Ce,s.TEXTURE_2D,ue,0)}t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Ie.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.resolveDepthBuffer===!1&&c){const E=P.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[E])}}}function me(P){return Math.min(i.maxSamples,P.samples)}function he(P){const E=n.get(P);return P.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&E.__useRenderToTexture!==!1}function ge(P){const E=o.render.frame;h.get(P)!==E&&(h.set(P,E),P.update())}function Xe(P,E){const H=P.colorSpace,q=P.format,re=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||H!==nn&&H!==ni&&(rt.getTransfer(H)===xt?(q!==fn||re!==Xn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",H)),E}function Be(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(l.width=P.naturalWidth||P.width,l.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(l.width=P.displayWidth,l.height=P.displayHeight):(l.width=P.width,l.height=P.height),l}this.allocateTextureUnit=z,this.resetTextureUnits=D,this.setTexture2D=F,this.setTexture2DArray=V,this.setTexture3D=G,this.setTextureCube=B,this.rebindTextures=ft,this.setupRenderTarget=I,this.updateRenderTargetMipmap=se,this.updateMultisampleRenderTarget=Q,this.setupDepthRenderbuffer=Ze,this.setupFrameBufferTexture=Se,this.useMultisampledRTT=he}function u_(s,e){function t(n,i=ni){let r;const o=rt.getTransfer(i);if(n===Xn)return s.UNSIGNED_BYTE;if(n===kc)return s.UNSIGNED_SHORT_4_4_4_4;if(n===Bc)return s.UNSIGNED_SHORT_5_5_5_1;if(n===Du)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===Uu)return s.UNSIGNED_INT_10F_11F_11F_REV;if(n===Lu)return s.BYTE;if(n===Iu)return s.SHORT;if(n===ur)return s.UNSIGNED_SHORT;if(n===Oc)return s.INT;if(n===Ei)return s.UNSIGNED_INT;if(n===Ln)return s.FLOAT;if(n===li)return s.HALF_FLOAT;if(n===Nu)return s.ALPHA;if(n===zu)return s.RGB;if(n===fn)return s.RGBA;if(n===dr)return s.DEPTH_COMPONENT;if(n===pr)return s.DEPTH_STENCIL;if(n===Hc)return s.RED;if(n===Vc)return s.RED_INTEGER;if(n===Fu)return s.RG;if(n===Gc)return s.RG_INTEGER;if(n===Wc)return s.RGBA_INTEGER;if(n===ho||n===uo||n===fo||n===po)if(o===xt)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===ho)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===uo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===fo)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===po)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===ho)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===uo)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===fo)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===po)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Ya||n===ja||n===Ka||n===Za)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Ya)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===ja)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Ka)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Za)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===$a||n===Ja||n===Qa)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===$a||n===Ja)return o===xt?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Qa)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===ec||n===tc||n===nc||n===ic||n===sc||n===rc||n===oc||n===ac||n===cc||n===lc||n===hc||n===uc||n===fc||n===dc)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===ec)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===tc)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===nc)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===ic)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===sc)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===rc)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===oc)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===ac)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===cc)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===lc)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===hc)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===uc)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===fc)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===dc)return o===xt?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===pc||n===mc||n===gc)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===pc)return o===xt?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===mc)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===gc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===xc||n===vc||n===_c||n===yc)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===xc)return r.COMPRESSED_RED_RGTC1_EXT;if(n===vc)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===_c)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===yc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===fr?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:t}}const f_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,d_=`
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

}`;class p_{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new $u(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new Xt({vertexShader:f_,fragmentShader:d_,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new st(new Un(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class m_ extends zs{constructor(e,t){super();const n=this;let i=null,r=1,o=null,a="local-floor",c=1,l=null,h=null,u=null,f=null,d=null,m=null;const x=typeof XRWebGLBinding<"u",g=new p_,p={},M=t.getContextAttributes();let v=null,_=null;const w=[],b=[],y=new le;let A=null;const T=new Kt;T.viewport=new at;const S=new Kt;S.viewport=new at;const L=[T,S],D=new Em;let z=null,N=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(K){let ne=w[K];return ne===void 0&&(ne=new la,w[K]=ne),ne.getTargetRaySpace()},this.getControllerGrip=function(K){let ne=w[K];return ne===void 0&&(ne=new la,w[K]=ne),ne.getGripSpace()},this.getHand=function(K){let ne=w[K];return ne===void 0&&(ne=new la,w[K]=ne),ne.getHandSpace()};function F(K){const ne=b.indexOf(K.inputSource);if(ne===-1)return;const Se=w[ne];Se!==void 0&&(Se.update(K.inputSource,K.frame,l||o),Se.dispatchEvent({type:K.type,data:K.inputSource}))}function V(){i.removeEventListener("select",F),i.removeEventListener("selectstart",F),i.removeEventListener("selectend",F),i.removeEventListener("squeeze",F),i.removeEventListener("squeezestart",F),i.removeEventListener("squeezeend",F),i.removeEventListener("end",V),i.removeEventListener("inputsourceschange",G);for(let K=0;K<w.length;K++){const ne=b[K];ne!==null&&(b[K]=null,w[K].disconnect(ne))}z=null,N=null,g.reset();for(const K in p)delete p[K];e.setRenderTarget(v),d=null,f=null,u=null,i=null,_=null,tt.stop(),n.isPresenting=!1,e.setPixelRatio(A),e.setSize(y.width,y.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(K){r=K,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(K){a=K,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(K){l=K},this.getBaseLayer=function(){return f!==null?f:d},this.getBinding=function(){return u===null&&x&&(u=new XRWebGLBinding(i,t)),u},this.getFrame=function(){return m},this.getSession=function(){return i},this.setSession=async function(K){if(i=K,i!==null){if(v=e.getRenderTarget(),i.addEventListener("select",F),i.addEventListener("selectstart",F),i.addEventListener("selectend",F),i.addEventListener("squeeze",F),i.addEventListener("squeezestart",F),i.addEventListener("squeezeend",F),i.addEventListener("end",V),i.addEventListener("inputsourceschange",G),M.xrCompatible!==!0&&await t.makeXRCompatible(),A=e.getPixelRatio(),e.getSize(y),x&&"createProjectionLayer"in XRWebGLBinding.prototype){let Se=null,Le=null,Te=null;M.depth&&(Te=M.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,Se=M.stencil?pr:dr,Le=M.stencil?fr:Ei);const Ze={colorFormat:t.RGBA8,depthFormat:Te,scaleFactor:r};u=this.getBinding(),f=u.createProjectionLayer(Ze),i.updateRenderState({layers:[f]}),e.setPixelRatio(1),e.setSize(f.textureWidth,f.textureHeight,!1),_=new Dn(f.textureWidth,f.textureHeight,{format:fn,type:Xn,depthTexture:new tl(f.textureWidth,f.textureHeight,Le,void 0,void 0,void 0,void 0,void 0,void 0,Se),stencilBuffer:M.stencil,colorSpace:e.outputColorSpace,samples:M.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}else{const Se={antialias:M.antialias,alpha:!0,depth:M.depth,stencil:M.stencil,framebufferScaleFactor:r};d=new XRWebGLLayer(i,t,Se),i.updateRenderState({baseLayer:d}),e.setPixelRatio(1),e.setSize(d.framebufferWidth,d.framebufferHeight,!1),_=new Dn(d.framebufferWidth,d.framebufferHeight,{format:fn,type:Xn,colorSpace:e.outputColorSpace,stencilBuffer:M.stencil,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}_.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await i.requestReferenceSpace(a),tt.setContext(i),tt.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function G(K){for(let ne=0;ne<K.removed.length;ne++){const Se=K.removed[ne],Le=b.indexOf(Se);Le>=0&&(b[Le]=null,w[Le].disconnect(Se))}for(let ne=0;ne<K.added.length;ne++){const Se=K.added[ne];let Le=b.indexOf(Se);if(Le===-1){for(let Ze=0;Ze<w.length;Ze++)if(Ze>=b.length){b.push(Se),Le=Ze;break}else if(b[Ze]===null){b[Ze]=Se,Le=Ze;break}if(Le===-1)break}const Te=w[Le];Te&&Te.connect(Se)}}const B=new C,$=new C;function fe(K,ne,Se){B.setFromMatrixPosition(ne.matrixWorld),$.setFromMatrixPosition(Se.matrixWorld);const Le=B.distanceTo($),Te=ne.projectionMatrix.elements,Ze=Se.projectionMatrix.elements,ft=Te[14]/(Te[10]-1),I=Te[14]/(Te[10]+1),se=(Te[9]+1)/Te[5],Z=(Te[9]-1)/Te[5],J=(Te[8]-1)/Te[0],Q=(Ze[8]+1)/Ze[0],me=ft*J,he=ft*Q,ge=Le/(-J+Q),Xe=ge*-J;if(ne.matrixWorld.decompose(K.position,K.quaternion,K.scale),K.translateX(Xe),K.translateZ(ge),K.matrixWorld.compose(K.position,K.quaternion,K.scale),K.matrixWorldInverse.copy(K.matrixWorld).invert(),Te[10]===-1)K.projectionMatrix.copy(ne.projectionMatrix),K.projectionMatrixInverse.copy(ne.projectionMatrixInverse);else{const Be=ft+ge,P=I+ge,E=me-Xe,H=he+(Le-Xe),q=se*I/P*Be,re=Z*I/P*Be;K.projectionMatrix.makePerspective(E,H,q,re,Be,P),K.projectionMatrixInverse.copy(K.projectionMatrix).invert()}}function ce(K,ne){ne===null?K.matrixWorld.copy(K.matrix):K.matrixWorld.multiplyMatrices(ne.matrixWorld,K.matrix),K.matrixWorldInverse.copy(K.matrixWorld).invert()}this.updateCamera=function(K){if(i===null)return;let ne=K.near,Se=K.far;g.texture!==null&&(g.depthNear>0&&(ne=g.depthNear),g.depthFar>0&&(Se=g.depthFar)),D.near=S.near=T.near=ne,D.far=S.far=T.far=Se,(z!==D.near||N!==D.far)&&(i.updateRenderState({depthNear:D.near,depthFar:D.far}),z=D.near,N=D.far),D.layers.mask=K.layers.mask|6,T.layers.mask=D.layers.mask&3,S.layers.mask=D.layers.mask&5;const Le=K.parent,Te=D.cameras;ce(D,Le);for(let Ze=0;Ze<Te.length;Ze++)ce(Te[Ze],Le);Te.length===2?fe(D,T,S):D.projectionMatrix.copy(T.projectionMatrix),Re(K,D,Le)};function Re(K,ne,Se){Se===null?K.matrix.copy(ne.matrixWorld):(K.matrix.copy(Se.matrixWorld),K.matrix.invert(),K.matrix.multiply(ne.matrixWorld)),K.matrix.decompose(K.position,K.quaternion,K.scale),K.updateMatrixWorld(!0),K.projectionMatrix.copy(ne.projectionMatrix),K.projectionMatrixInverse.copy(ne.projectionMatrixInverse),K.isPerspectiveCamera&&(K.fov=Cs*2*Math.atan(1/K.projectionMatrix.elements[5]),K.zoom=1)}this.getCamera=function(){return D},this.getFoveation=function(){if(!(f===null&&d===null))return c},this.setFoveation=function(K){c=K,f!==null&&(f.fixedFoveation=K),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=K)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(D)},this.getCameraTexture=function(K){return p[K]};let Je=null;function ct(K,ne){if(h=ne.getViewerPose(l||o),m=ne,h!==null){const Se=h.views;d!==null&&(e.setRenderTargetFramebuffer(_,d.framebuffer),e.setRenderTarget(_));let Le=!1;Se.length!==D.cameras.length&&(D.cameras.length=0,Le=!0);for(let I=0;I<Se.length;I++){const se=Se[I];let Z=null;if(d!==null)Z=d.getViewport(se);else{const Q=u.getViewSubImage(f,se);Z=Q.viewport,I===0&&(e.setRenderTargetTextures(_,Q.colorTexture,Q.depthStencilTexture),e.setRenderTarget(_))}let J=L[I];J===void 0&&(J=new Kt,J.layers.enable(I),J.viewport=new at,L[I]=J),J.matrix.fromArray(se.transform.matrix),J.matrix.decompose(J.position,J.quaternion,J.scale),J.projectionMatrix.fromArray(se.projectionMatrix),J.projectionMatrixInverse.copy(J.projectionMatrix).invert(),J.viewport.set(Z.x,Z.y,Z.width,Z.height),I===0&&(D.matrix.copy(J.matrix),D.matrix.decompose(D.position,D.quaternion,D.scale)),Le===!0&&D.cameras.push(J)}const Te=i.enabledFeatures;if(Te&&Te.includes("depth-sensing")&&i.depthUsage=="gpu-optimized"&&x){u=n.getBinding();const I=u.getDepthInformation(Se[0]);I&&I.isValid&&I.texture&&g.init(I,i.renderState)}if(Te&&Te.includes("camera-access")&&x){e.state.unbindTexture(),u=n.getBinding();for(let I=0;I<Se.length;I++){const se=Se[I].camera;if(se){let Z=p[se];Z||(Z=new $u,p[se]=Z);const J=u.getCameraImage(se);Z.sourceTexture=J}}}}for(let Se=0;Se<w.length;Se++){const Le=b[Se],Te=w[Se];Le!==null&&Te!==void 0&&Te.update(Le,ne,l||o)}Je&&Je(K,ne),ne.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ne}),m=null}const tt=new gf;tt.setAnimationLoop(ct),this.setAnimationLoop=function(K){Je=K},this.dispose=function(){}}}const Ni=new wn,g_=new qe;function x_(s,e){function t(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function n(g,p){p.color.getRGB(g.fogColor.value,Xu(s)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function i(g,p,M,v,_){p.isMeshBasicMaterial||p.isMeshLambertMaterial?r(g,p):p.isMeshToonMaterial?(r(g,p),u(g,p)):p.isMeshPhongMaterial?(r(g,p),h(g,p)):p.isMeshStandardMaterial?(r(g,p),f(g,p),p.isMeshPhysicalMaterial&&d(g,p,_)):p.isMeshMatcapMaterial?(r(g,p),m(g,p)):p.isMeshDepthMaterial?r(g,p):p.isMeshDistanceMaterial?(r(g,p),x(g,p)):p.isMeshNormalMaterial?r(g,p):p.isLineBasicMaterial?(o(g,p),p.isLineDashedMaterial&&a(g,p)):p.isPointsMaterial?c(g,p,M,v):p.isSpriteMaterial?l(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,t(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===Wt&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,t(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===Wt&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,t(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,t(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);const M=e.get(p),v=M.envMap,_=M.envMapRotation;v&&(g.envMap.value=v,Ni.copy(_),Ni.x*=-1,Ni.y*=-1,Ni.z*=-1,v.isCubeTexture&&v.isRenderTargetTexture===!1&&(Ni.y*=-1,Ni.z*=-1),g.envMapRotation.value.setFromMatrix4(g_.makeRotationFromEuler(Ni)),g.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,g.aoMapTransform))}function o(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform))}function a(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function c(g,p,M,v){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*M,g.scale.value=v*.5,p.map&&(g.map.value=p.map,t(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function l(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function h(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function u(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function f(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function d(g,p,M){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Wt&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=M.texture,g.transmissionSamplerSize.value.set(M.width,M.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,p){p.matcap&&(g.matcap.value=p.matcap)}function x(g,p){const M=e.get(p).light;g.referencePosition.value.setFromMatrixPosition(M.matrixWorld),g.nearDistance.value=M.shadow.camera.near,g.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function v_(s,e,t,n){let i={},r={},o=[];const a=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function c(M,v){const _=v.program;n.uniformBlockBinding(M,_)}function l(M,v){let _=i[M.id];_===void 0&&(m(M),_=h(M),i[M.id]=_,M.addEventListener("dispose",g));const w=v.program;n.updateUBOMapping(M,w);const b=e.render.frame;r[M.id]!==b&&(f(M),r[M.id]=b)}function h(M){const v=u();M.__bindingPointIndex=v;const _=s.createBuffer(),w=M.__size,b=M.usage;return s.bindBuffer(s.UNIFORM_BUFFER,_),s.bufferData(s.UNIFORM_BUFFER,w,b),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,v,_),_}function u(){for(let M=0;M<a;M++)if(o.indexOf(M)===-1)return o.push(M),M;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function f(M){const v=i[M.id],_=M.uniforms,w=M.__cache;s.bindBuffer(s.UNIFORM_BUFFER,v);for(let b=0,y=_.length;b<y;b++){const A=Array.isArray(_[b])?_[b]:[_[b]];for(let T=0,S=A.length;T<S;T++){const L=A[T];if(d(L,b,T,w)===!0){const D=L.__offset,z=Array.isArray(L.value)?L.value:[L.value];let N=0;for(let F=0;F<z.length;F++){const V=z[F],G=x(V);typeof V=="number"||typeof V=="boolean"?(L.__data[0]=V,s.bufferSubData(s.UNIFORM_BUFFER,D+N,L.__data)):V.isMatrix3?(L.__data[0]=V.elements[0],L.__data[1]=V.elements[1],L.__data[2]=V.elements[2],L.__data[3]=0,L.__data[4]=V.elements[3],L.__data[5]=V.elements[4],L.__data[6]=V.elements[5],L.__data[7]=0,L.__data[8]=V.elements[6],L.__data[9]=V.elements[7],L.__data[10]=V.elements[8],L.__data[11]=0):(V.toArray(L.__data,N),N+=G.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,D,L.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function d(M,v,_,w){const b=M.value,y=v+"_"+_;if(w[y]===void 0)return typeof b=="number"||typeof b=="boolean"?w[y]=b:w[y]=b.clone(),!0;{const A=w[y];if(typeof b=="number"||typeof b=="boolean"){if(A!==b)return w[y]=b,!0}else if(A.equals(b)===!1)return A.copy(b),!0}return!1}function m(M){const v=M.uniforms;let _=0;const w=16;for(let y=0,A=v.length;y<A;y++){const T=Array.isArray(v[y])?v[y]:[v[y]];for(let S=0,L=T.length;S<L;S++){const D=T[S],z=Array.isArray(D.value)?D.value:[D.value];for(let N=0,F=z.length;N<F;N++){const V=z[N],G=x(V),B=_%w,$=B%G.boundary,fe=B+$;_+=$,fe!==0&&w-fe<G.storage&&(_+=w-fe),D.__data=new Float32Array(G.storage/Float32Array.BYTES_PER_ELEMENT),D.__offset=_,_+=G.storage}}}const b=_%w;return b>0&&(_+=w-b),M.__size=_,M.__cache={},this}function x(M){const v={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(v.boundary=4,v.storage=4):M.isVector2?(v.boundary=8,v.storage=8):M.isVector3||M.isColor?(v.boundary=16,v.storage=12):M.isVector4?(v.boundary=16,v.storage=16):M.isMatrix3?(v.boundary=48,v.storage=48):M.isMatrix4?(v.boundary=64,v.storage=64):M.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",M),v}function g(M){const v=M.target;v.removeEventListener("dispose",g);const _=o.indexOf(v.__bindingPointIndex);o.splice(_,1),s.deleteBuffer(i[v.id]),delete i[v.id],delete r[v.id]}function p(){for(const M in i)s.deleteBuffer(i[M]);o=[],i={},r={}}return{bind:c,update:l,dispose:p}}class __{constructor(e={}){const{canvas:t=qd(),context:n=null,depth:i=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:f=!1}=e;this.isWebGLRenderer=!0;let d;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");d=n.getContextAttributes().alpha}else d=o;const m=new Uint32Array(4),x=new Int32Array(4);let g=null,p=null;const M=[],v=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Si,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const _=this;let w=!1;this._outputColorSpace=Ut;let b=0,y=0,A=null,T=-1,S=null;const L=new at,D=new at;let z=null;const N=new Me(0);let F=0,V=t.width,G=t.height,B=1,$=null,fe=null;const ce=new at(0,0,V,G),Re=new at(0,0,V,G);let Je=!1;const ct=new Qc;let tt=!1,K=!1;const ne=new qe,Se=new C,Le=new at,Te={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ze=!1;function ft(){return A===null?B:1}let I=n;function se(R,O){return t.getContext(R,O)}try{const R={alpha:!0,depth:i,stencil:r,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Fc}`),t.addEventListener("webglcontextlost",oe,!1),t.addEventListener("webglcontextrestored",_e,!1),t.addEventListener("webglcontextcreationerror",ae,!1),I===null){const O="webgl2";if(I=se(O,R),I===null)throw se(O)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(R){throw console.error("THREE.WebGLRenderer: "+R.message),R}let Z,J,Q,me,he,ge,Xe,Be,P,E,H,q,re,j,Ie,pe,Ae,Ce,ue,xe,ze,Ne,ve,te;function U(){Z=new Cx(I),Z.init(),Ne=new u_(I,Z),J=new wx(I,Z,e,Ne),Q=new l_(I,Z),J.reversedDepthBuffer&&f&&Q.buffers.depth.setReversed(!0),me=new Ix(I),he=new Zv,ge=new h_(I,Z,Q,he,J,Ne,me),Xe=new Sx(_),Be=new Rx(_),P=new Om(I),ve=new yx(I,P),E=new Px(I,P,me,ve),H=new Ux(I,E,P,me),ue=new Dx(I,J,ge),pe=new bx(he),q=new Kv(_,Xe,Be,Z,J,ve,pe),re=new x_(_,he),j=new Jv,Ie=new s_(Z),Ce=new _x(_,Xe,Be,Q,H,d,c),Ae=new a_(_,H,J),te=new v_(I,me,J,Q),xe=new Mx(I,Z,me),ze=new Lx(I,Z,me),me.programs=q.programs,_.capabilities=J,_.extensions=Z,_.properties=he,_.renderLists=j,_.shadowMap=Ae,_.state=Q,_.info=me}U();const ie=new m_(_,I);this.xr=ie,this.getContext=function(){return I},this.getContextAttributes=function(){return I.getContextAttributes()},this.forceContextLoss=function(){const R=Z.get("WEBGL_lose_context");R&&R.loseContext()},this.forceContextRestore=function(){const R=Z.get("WEBGL_lose_context");R&&R.restoreContext()},this.getPixelRatio=function(){return B},this.setPixelRatio=function(R){R!==void 0&&(B=R,this.setSize(V,G,!1))},this.getSize=function(R){return R.set(V,G)},this.setSize=function(R,O,W=!0){if(ie.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}V=R,G=O,t.width=Math.floor(R*B),t.height=Math.floor(O*B),W===!0&&(t.style.width=R+"px",t.style.height=O+"px"),this.setViewport(0,0,R,O)},this.getDrawingBufferSize=function(R){return R.set(V*B,G*B).floor()},this.setDrawingBufferSize=function(R,O,W){V=R,G=O,B=W,t.width=Math.floor(R*W),t.height=Math.floor(O*W),this.setViewport(0,0,R,O)},this.getCurrentViewport=function(R){return R.copy(L)},this.getViewport=function(R){return R.copy(ce)},this.setViewport=function(R,O,W,X){R.isVector4?ce.set(R.x,R.y,R.z,R.w):ce.set(R,O,W,X),Q.viewport(L.copy(ce).multiplyScalar(B).round())},this.getScissor=function(R){return R.copy(Re)},this.setScissor=function(R,O,W,X){R.isVector4?Re.set(R.x,R.y,R.z,R.w):Re.set(R,O,W,X),Q.scissor(D.copy(Re).multiplyScalar(B).round())},this.getScissorTest=function(){return Je},this.setScissorTest=function(R){Q.setScissorTest(Je=R)},this.setOpaqueSort=function(R){$=R},this.setTransparentSort=function(R){fe=R},this.getClearColor=function(R){return R.copy(Ce.getClearColor())},this.setClearColor=function(){Ce.setClearColor(...arguments)},this.getClearAlpha=function(){return Ce.getClearAlpha()},this.setClearAlpha=function(){Ce.setClearAlpha(...arguments)},this.clear=function(R=!0,O=!0,W=!0){let X=0;if(R){let k=!1;if(A!==null){const de=A.texture.format;k=de===Wc||de===Gc||de===Vc}if(k){const de=A.texture.type,be=de===Xn||de===Ei||de===ur||de===fr||de===kc||de===Bc,De=Ce.getClearColor(),Ee=Ce.getClearAlpha(),ke=De.r,Ge=De.g,Fe=De.b;be?(m[0]=ke,m[1]=Ge,m[2]=Fe,m[3]=Ee,I.clearBufferuiv(I.COLOR,0,m)):(x[0]=ke,x[1]=Ge,x[2]=Fe,x[3]=Ee,I.clearBufferiv(I.COLOR,0,x))}else X|=I.COLOR_BUFFER_BIT}O&&(X|=I.DEPTH_BUFFER_BIT),W&&(X|=I.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),I.clear(X)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",oe,!1),t.removeEventListener("webglcontextrestored",_e,!1),t.removeEventListener("webglcontextcreationerror",ae,!1),Ce.dispose(),j.dispose(),Ie.dispose(),he.dispose(),Xe.dispose(),Be.dispose(),H.dispose(),ve.dispose(),te.dispose(),q.dispose(),ie.dispose(),ie.removeEventListener("sessionstart",On),ie.removeEventListener("sessionend",Sl),Ri.stop()};function oe(R){R.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),w=!0}function _e(){console.log("THREE.WebGLRenderer: Context Restored."),w=!1;const R=me.autoReset,O=Ae.enabled,W=Ae.autoUpdate,X=Ae.needsUpdate,k=Ae.type;U(),me.autoReset=R,Ae.enabled=O,Ae.autoUpdate=W,Ae.needsUpdate=X,Ae.type=k}function ae(R){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",R.statusMessage)}function ee(R){const O=R.target;O.removeEventListener("dispose",ee),we(O)}function we(R){je(R),he.remove(R)}function je(R){const O=he.get(R).programs;O!==void 0&&(O.forEach(function(W){q.releaseProgram(W)}),R.isShaderMaterial&&q.releaseShaderCache(R))}this.renderBufferDirect=function(R,O,W,X,k,de){O===null&&(O=Te);const be=k.isMesh&&k.matrixWorld.determinant()<0,De=Ff(R,O,W,X,k);Q.setMaterial(X,be);let Ee=W.index,ke=1;if(X.wireframe===!0){if(Ee=E.getWireframeAttribute(W),Ee===void 0)return;ke=2}const Ge=W.drawRange,Fe=W.attributes.position;let it=Ge.start*ke,gt=(Ge.start+Ge.count)*ke;de!==null&&(it=Math.max(it,de.start*ke),gt=Math.min(gt,(de.start+de.count)*ke)),Ee!==null?(it=Math.max(it,0),gt=Math.min(gt,Ee.count)):Fe!=null&&(it=Math.max(it,0),gt=Math.min(gt,Fe.count));const Lt=gt-it;if(Lt<0||Lt===1/0)return;ve.setup(k,X,De,W,Ee);let St,_t=xe;if(Ee!==null&&(St=P.get(Ee),_t=ze,_t.setIndex(St)),k.isMesh)X.wireframe===!0?(Q.setLineWidth(X.wireframeLinewidth*ft()),_t.setMode(I.LINES)):_t.setMode(I.TRIANGLES);else if(k.isLine){let Oe=X.linewidth;Oe===void 0&&(Oe=1),Q.setLineWidth(Oe*ft()),k.isLineSegments?_t.setMode(I.LINES):k.isLineLoop?_t.setMode(I.LINE_LOOP):_t.setMode(I.LINE_STRIP)}else k.isPoints?_t.setMode(I.POINTS):k.isSprite&&_t.setMode(I.TRIANGLES);if(k.isBatchedMesh)if(k._multiDrawInstances!==null)vr("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),_t.renderMultiDrawInstances(k._multiDrawStarts,k._multiDrawCounts,k._multiDrawCount,k._multiDrawInstances);else if(Z.get("WEBGL_multi_draw"))_t.renderMultiDraw(k._multiDrawStarts,k._multiDrawCounts,k._multiDrawCount);else{const Oe=k._multiDrawStarts,Rt=k._multiDrawCounts,lt=k._multiDrawCount,cn=Ee?P.get(Ee).bytesPerElement:1,$i=he.get(X).currentProgram.getUniforms();for(let ln=0;ln<lt;ln++)$i.setValue(I,"_gl_DrawID",ln),_t.render(Oe[ln]/cn,Rt[ln])}else if(k.isInstancedMesh)_t.renderInstances(it,Lt,k.count);else if(W.isInstancedBufferGeometry){const Oe=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,Rt=Math.min(W.instanceCount,Oe);_t.renderInstances(it,Lt,Rt)}else _t.render(it,Lt)};function Mt(R,O,W){R.transparent===!0&&R.side===Et&&R.forceSinglePass===!1?(R.side=Wt,R.needsUpdate=!0,Cr(R,O,W),R.side=ai,R.needsUpdate=!0,Cr(R,O,W),R.side=Et):Cr(R,O,W)}this.compile=function(R,O,W=null){W===null&&(W=R),p=Ie.get(W),p.init(O),v.push(p),W.traverseVisible(function(k){k.isLight&&k.layers.test(O.layers)&&(p.pushLight(k),k.castShadow&&p.pushShadow(k))}),R!==W&&R.traverseVisible(function(k){k.isLight&&k.layers.test(O.layers)&&(p.pushLight(k),k.castShadow&&p.pushShadow(k))}),p.setupLights();const X=new Set;return R.traverse(function(k){if(!(k.isMesh||k.isPoints||k.isLine||k.isSprite))return;const de=k.material;if(de)if(Array.isArray(de))for(let be=0;be<de.length;be++){const De=de[be];Mt(De,W,k),X.add(De)}else Mt(de,W,k),X.add(de)}),p=v.pop(),X},this.compileAsync=function(R,O,W=null){const X=this.compile(R,O,W);return new Promise(k=>{function de(){if(X.forEach(function(be){he.get(be).currentProgram.isReady()&&X.delete(be)}),X.size===0){k(R);return}setTimeout(de,10)}Z.get("KHR_parallel_shader_compile")!==null?de():setTimeout(de,10)})};let dt=null;function jn(R){dt&&dt(R)}function On(){Ri.stop()}function Sl(){Ri.start()}const Ri=new gf;Ri.setAnimationLoop(jn),typeof self<"u"&&Ri.setContext(self),this.setAnimationLoop=function(R){dt=R,ie.setAnimationLoop(R),R===null?Ri.stop():Ri.start()},ie.addEventListener("sessionstart",On),ie.addEventListener("sessionend",Sl),this.render=function(R,O){if(O!==void 0&&O.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(w===!0)return;if(R.matrixWorldAutoUpdate===!0&&R.updateMatrixWorld(),O.parent===null&&O.matrixWorldAutoUpdate===!0&&O.updateMatrixWorld(),ie.enabled===!0&&ie.isPresenting===!0&&(ie.cameraAutoUpdate===!0&&ie.updateCamera(O),O=ie.getCamera()),R.isScene===!0&&R.onBeforeRender(_,R,O,A),p=Ie.get(R,v.length),p.init(O),v.push(p),ne.multiplyMatrices(O.projectionMatrix,O.matrixWorldInverse),ct.setFromProjectionMatrix(ne,Gn,O.reversedDepth),K=this.localClippingEnabled,tt=pe.init(this.clippingPlanes,K),g=j.get(R,M.length),g.init(),M.push(g),ie.enabled===!0&&ie.isPresenting===!0){const de=_.xr.getDepthSensingMesh();de!==null&&Bo(de,O,-1/0,_.sortObjects)}Bo(R,O,0,_.sortObjects),g.finish(),_.sortObjects===!0&&g.sort($,fe),Ze=ie.enabled===!1||ie.isPresenting===!1||ie.hasDepthSensing()===!1,Ze&&Ce.addToRenderList(g,R),this.info.render.frame++,tt===!0&&pe.beginShadows();const W=p.state.shadowsArray;Ae.render(W,R,O),tt===!0&&pe.endShadows(),this.info.autoReset===!0&&this.info.reset();const X=g.opaque,k=g.transmissive;if(p.setupLights(),O.isArrayCamera){const de=O.cameras;if(k.length>0)for(let be=0,De=de.length;be<De;be++){const Ee=de[be];El(X,k,R,Ee)}Ze&&Ce.render(R);for(let be=0,De=de.length;be<De;be++){const Ee=de[be];Tl(g,R,Ee,Ee.viewport)}}else k.length>0&&El(X,k,R,O),Ze&&Ce.render(R),Tl(g,R,O);A!==null&&y===0&&(ge.updateMultisampleRenderTarget(A),ge.updateRenderTargetMipmap(A)),R.isScene===!0&&R.onAfterRender(_,R,O),ve.resetDefaultState(),T=-1,S=null,v.pop(),v.length>0?(p=v[v.length-1],tt===!0&&pe.setGlobalState(_.clippingPlanes,p.state.camera)):p=null,M.pop(),M.length>0?g=M[M.length-1]:g=null};function Bo(R,O,W,X){if(R.visible===!1)return;if(R.layers.test(O.layers)){if(R.isGroup)W=R.renderOrder;else if(R.isLOD)R.autoUpdate===!0&&R.update(O);else if(R.isLight)p.pushLight(R),R.castShadow&&p.pushShadow(R);else if(R.isSprite){if(!R.frustumCulled||ct.intersectsSprite(R)){X&&Le.setFromMatrixPosition(R.matrixWorld).applyMatrix4(ne);const be=H.update(R),De=R.material;De.visible&&g.push(R,be,De,W,Le.z,null)}}else if((R.isMesh||R.isLine||R.isPoints)&&(!R.frustumCulled||ct.intersectsObject(R))){const be=H.update(R),De=R.material;if(X&&(R.boundingSphere!==void 0?(R.boundingSphere===null&&R.computeBoundingSphere(),Le.copy(R.boundingSphere.center)):(be.boundingSphere===null&&be.computeBoundingSphere(),Le.copy(be.boundingSphere.center)),Le.applyMatrix4(R.matrixWorld).applyMatrix4(ne)),Array.isArray(De)){const Ee=be.groups;for(let ke=0,Ge=Ee.length;ke<Ge;ke++){const Fe=Ee[ke],it=De[Fe.materialIndex];it&&it.visible&&g.push(R,be,it,W,Le.z,Fe)}}else De.visible&&g.push(R,be,De,W,Le.z,null)}}const de=R.children;for(let be=0,De=de.length;be<De;be++)Bo(de[be],O,W,X)}function Tl(R,O,W,X){const k=R.opaque,de=R.transmissive,be=R.transparent;p.setupLightsView(W),tt===!0&&pe.setGlobalState(_.clippingPlanes,W),X&&Q.viewport(L.copy(X)),k.length>0&&Rr(k,O,W),de.length>0&&Rr(de,O,W),be.length>0&&Rr(be,O,W),Q.buffers.depth.setTest(!0),Q.buffers.depth.setMask(!0),Q.buffers.color.setMask(!0),Q.setPolygonOffset(!1)}function El(R,O,W,X){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[X.id]===void 0&&(p.state.transmissionRenderTarget[X.id]=new Dn(1,1,{generateMipmaps:!0,type:Z.has("EXT_color_buffer_half_float")||Z.has("EXT_color_buffer_float")?li:Xn,minFilter:Vn,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:rt.workingColorSpace}));const de=p.state.transmissionRenderTarget[X.id],be=X.viewport||L;de.setSize(be.z*_.transmissionResolutionScale,be.w*_.transmissionResolutionScale);const De=_.getRenderTarget(),Ee=_.getActiveCubeFace(),ke=_.getActiveMipmapLevel();_.setRenderTarget(de),_.getClearColor(N),F=_.getClearAlpha(),F<1&&_.setClearColor(16777215,.5),_.clear(),Ze&&Ce.render(W);const Ge=_.toneMapping;_.toneMapping=Si;const Fe=X.viewport;if(X.viewport!==void 0&&(X.viewport=void 0),p.setupLightsView(X),tt===!0&&pe.setGlobalState(_.clippingPlanes,X),Rr(R,W,X),ge.updateMultisampleRenderTarget(de),ge.updateRenderTargetMipmap(de),Z.has("WEBGL_multisampled_render_to_texture")===!1){let it=!1;for(let gt=0,Lt=O.length;gt<Lt;gt++){const St=O[gt],_t=St.object,Oe=St.geometry,Rt=St.material,lt=St.group;if(Rt.side===Et&&_t.layers.test(X.layers)){const cn=Rt.side;Rt.side=Wt,Rt.needsUpdate=!0,Al(_t,W,X,Oe,Rt,lt),Rt.side=cn,Rt.needsUpdate=!0,it=!0}}it===!0&&(ge.updateMultisampleRenderTarget(de),ge.updateRenderTargetMipmap(de))}_.setRenderTarget(De,Ee,ke),_.setClearColor(N,F),Fe!==void 0&&(X.viewport=Fe),_.toneMapping=Ge}function Rr(R,O,W){const X=O.isScene===!0?O.overrideMaterial:null;for(let k=0,de=R.length;k<de;k++){const be=R[k],De=be.object,Ee=be.geometry,ke=be.group;let Ge=be.material;Ge.allowOverride===!0&&X!==null&&(Ge=X),De.layers.test(W.layers)&&Al(De,O,W,Ee,Ge,ke)}}function Al(R,O,W,X,k,de){R.onBeforeRender(_,O,W,X,k,de),R.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,R.matrixWorld),R.normalMatrix.getNormalMatrix(R.modelViewMatrix),k.onBeforeRender(_,O,W,X,R,de),k.transparent===!0&&k.side===Et&&k.forceSinglePass===!1?(k.side=Wt,k.needsUpdate=!0,_.renderBufferDirect(W,O,X,k,R,de),k.side=ai,k.needsUpdate=!0,_.renderBufferDirect(W,O,X,k,R,de),k.side=Et):_.renderBufferDirect(W,O,X,k,R,de),R.onAfterRender(_,O,W,X,k,de)}function Cr(R,O,W){O.isScene!==!0&&(O=Te);const X=he.get(R),k=p.state.lights,de=p.state.shadowsArray,be=k.state.version,De=q.getParameters(R,k.state,de,O,W),Ee=q.getProgramCacheKey(De);let ke=X.programs;X.environment=R.isMeshStandardMaterial?O.environment:null,X.fog=O.fog,X.envMap=(R.isMeshStandardMaterial?Be:Xe).get(R.envMap||X.environment),X.envMapRotation=X.environment!==null&&R.envMap===null?O.environmentRotation:R.envMapRotation,ke===void 0&&(R.addEventListener("dispose",ee),ke=new Map,X.programs=ke);let Ge=ke.get(Ee);if(Ge!==void 0){if(X.currentProgram===Ge&&X.lightsStateVersion===be)return Cl(R,De),Ge}else De.uniforms=q.getUniforms(R),R.onBeforeCompile(De,_),Ge=q.acquireProgram(De,Ee),ke.set(Ee,Ge),X.uniforms=De.uniforms;const Fe=X.uniforms;return(!R.isShaderMaterial&&!R.isRawShaderMaterial||R.clipping===!0)&&(Fe.clippingPlanes=pe.uniform),Cl(R,De),X.needsLights=kf(R),X.lightsStateVersion=be,X.needsLights&&(Fe.ambientLightColor.value=k.state.ambient,Fe.lightProbe.value=k.state.probe,Fe.directionalLights.value=k.state.directional,Fe.directionalLightShadows.value=k.state.directionalShadow,Fe.spotLights.value=k.state.spot,Fe.spotLightShadows.value=k.state.spotShadow,Fe.rectAreaLights.value=k.state.rectArea,Fe.ltc_1.value=k.state.rectAreaLTC1,Fe.ltc_2.value=k.state.rectAreaLTC2,Fe.pointLights.value=k.state.point,Fe.pointLightShadows.value=k.state.pointShadow,Fe.hemisphereLights.value=k.state.hemi,Fe.directionalShadowMap.value=k.state.directionalShadowMap,Fe.directionalShadowMatrix.value=k.state.directionalShadowMatrix,Fe.spotShadowMap.value=k.state.spotShadowMap,Fe.spotLightMatrix.value=k.state.spotLightMatrix,Fe.spotLightMap.value=k.state.spotLightMap,Fe.pointShadowMap.value=k.state.pointShadowMap,Fe.pointShadowMatrix.value=k.state.pointShadowMatrix),X.currentProgram=Ge,X.uniformsList=null,Ge}function Rl(R){if(R.uniformsList===null){const O=R.currentProgram.getUniforms();R.uniformsList=mo.seqWithValue(O.seq,R.uniforms)}return R.uniformsList}function Cl(R,O){const W=he.get(R);W.outputColorSpace=O.outputColorSpace,W.batching=O.batching,W.batchingColor=O.batchingColor,W.instancing=O.instancing,W.instancingColor=O.instancingColor,W.instancingMorph=O.instancingMorph,W.skinning=O.skinning,W.morphTargets=O.morphTargets,W.morphNormals=O.morphNormals,W.morphColors=O.morphColors,W.morphTargetsCount=O.morphTargetsCount,W.numClippingPlanes=O.numClippingPlanes,W.numIntersection=O.numClipIntersection,W.vertexAlphas=O.vertexAlphas,W.vertexTangents=O.vertexTangents,W.toneMapping=O.toneMapping}function Ff(R,O,W,X,k){O.isScene!==!0&&(O=Te),ge.resetTextureUnits();const de=O.fog,be=X.isMeshStandardMaterial?O.environment:null,De=A===null?_.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:nn,Ee=(X.isMeshStandardMaterial?Be:Xe).get(X.envMap||be),ke=X.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,Ge=!!W.attributes.tangent&&(!!X.normalMap||X.anisotropy>0),Fe=!!W.morphAttributes.position,it=!!W.morphAttributes.normal,gt=!!W.morphAttributes.color;let Lt=Si;X.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(Lt=_.toneMapping);const St=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,_t=St!==void 0?St.length:0,Oe=he.get(X),Rt=p.state.lights;if(tt===!0&&(K===!0||R!==S)){const Zt=R===S&&X.id===T;pe.setState(X,R,Zt)}let lt=!1;X.version===Oe.__version?(Oe.needsLights&&Oe.lightsStateVersion!==Rt.state.version||Oe.outputColorSpace!==De||k.isBatchedMesh&&Oe.batching===!1||!k.isBatchedMesh&&Oe.batching===!0||k.isBatchedMesh&&Oe.batchingColor===!0&&k.colorTexture===null||k.isBatchedMesh&&Oe.batchingColor===!1&&k.colorTexture!==null||k.isInstancedMesh&&Oe.instancing===!1||!k.isInstancedMesh&&Oe.instancing===!0||k.isSkinnedMesh&&Oe.skinning===!1||!k.isSkinnedMesh&&Oe.skinning===!0||k.isInstancedMesh&&Oe.instancingColor===!0&&k.instanceColor===null||k.isInstancedMesh&&Oe.instancingColor===!1&&k.instanceColor!==null||k.isInstancedMesh&&Oe.instancingMorph===!0&&k.morphTexture===null||k.isInstancedMesh&&Oe.instancingMorph===!1&&k.morphTexture!==null||Oe.envMap!==Ee||X.fog===!0&&Oe.fog!==de||Oe.numClippingPlanes!==void 0&&(Oe.numClippingPlanes!==pe.numPlanes||Oe.numIntersection!==pe.numIntersection)||Oe.vertexAlphas!==ke||Oe.vertexTangents!==Ge||Oe.morphTargets!==Fe||Oe.morphNormals!==it||Oe.morphColors!==gt||Oe.toneMapping!==Lt||Oe.morphTargetsCount!==_t)&&(lt=!0):(lt=!0,Oe.__version=X.version);let cn=Oe.currentProgram;lt===!0&&(cn=Cr(X,O,k));let $i=!1,ln=!1,Gs=!1;const Ct=cn.getUniforms(),pn=Oe.uniforms;if(Q.useProgram(cn.program)&&($i=!0,ln=!0,Gs=!0),X.id!==T&&(T=X.id,ln=!0),$i||S!==R){Q.buffers.depth.getReversed()&&R.reversedDepth!==!0&&(R._reversedDepth=!0,R.updateProjectionMatrix()),Ct.setValue(I,"projectionMatrix",R.projectionMatrix),Ct.setValue(I,"viewMatrix",R.matrixWorldInverse);const sn=Ct.map.cameraPosition;sn!==void 0&&sn.setValue(I,Se.setFromMatrixPosition(R.matrixWorld)),J.logarithmicDepthBuffer&&Ct.setValue(I,"logDepthBufFC",2/(Math.log(R.far+1)/Math.LN2)),(X.isMeshPhongMaterial||X.isMeshToonMaterial||X.isMeshLambertMaterial||X.isMeshBasicMaterial||X.isMeshStandardMaterial||X.isShaderMaterial)&&Ct.setValue(I,"isOrthographic",R.isOrthographicCamera===!0),S!==R&&(S=R,ln=!0,Gs=!0)}if(k.isSkinnedMesh){Ct.setOptional(I,k,"bindMatrix"),Ct.setOptional(I,k,"bindMatrixInverse");const Zt=k.skeleton;Zt&&(Zt.boneTexture===null&&Zt.computeBoneTexture(),Ct.setValue(I,"boneTexture",Zt.boneTexture,ge))}k.isBatchedMesh&&(Ct.setOptional(I,k,"batchingTexture"),Ct.setValue(I,"batchingTexture",k._matricesTexture,ge),Ct.setOptional(I,k,"batchingIdTexture"),Ct.setValue(I,"batchingIdTexture",k._indirectTexture,ge),Ct.setOptional(I,k,"batchingColorTexture"),k._colorsTexture!==null&&Ct.setValue(I,"batchingColorTexture",k._colorsTexture,ge));const mn=W.morphAttributes;if((mn.position!==void 0||mn.normal!==void 0||mn.color!==void 0)&&ue.update(k,W,cn),(ln||Oe.receiveShadow!==k.receiveShadow)&&(Oe.receiveShadow=k.receiveShadow,Ct.setValue(I,"receiveShadow",k.receiveShadow)),X.isMeshGouraudMaterial&&X.envMap!==null&&(pn.envMap.value=Ee,pn.flipEnvMap.value=Ee.isCubeTexture&&Ee.isRenderTargetTexture===!1?-1:1),X.isMeshStandardMaterial&&X.envMap===null&&O.environment!==null&&(pn.envMapIntensity.value=O.environmentIntensity),ln&&(Ct.setValue(I,"toneMappingExposure",_.toneMappingExposure),Oe.needsLights&&Of(pn,Gs),de&&X.fog===!0&&re.refreshFogUniforms(pn,de),re.refreshMaterialUniforms(pn,X,B,G,p.state.transmissionRenderTarget[R.id]),mo.upload(I,Rl(Oe),pn,ge)),X.isShaderMaterial&&X.uniformsNeedUpdate===!0&&(mo.upload(I,Rl(Oe),pn,ge),X.uniformsNeedUpdate=!1),X.isSpriteMaterial&&Ct.setValue(I,"center",k.center),Ct.setValue(I,"modelViewMatrix",k.modelViewMatrix),Ct.setValue(I,"normalMatrix",k.normalMatrix),Ct.setValue(I,"modelMatrix",k.matrixWorld),X.isShaderMaterial||X.isRawShaderMaterial){const Zt=X.uniformsGroups;for(let sn=0,Ho=Zt.length;sn<Ho;sn++){const Ci=Zt[sn];te.update(Ci,cn),te.bind(Ci,cn)}}return cn}function Of(R,O){R.ambientLightColor.needsUpdate=O,R.lightProbe.needsUpdate=O,R.directionalLights.needsUpdate=O,R.directionalLightShadows.needsUpdate=O,R.pointLights.needsUpdate=O,R.pointLightShadows.needsUpdate=O,R.spotLights.needsUpdate=O,R.spotLightShadows.needsUpdate=O,R.rectAreaLights.needsUpdate=O,R.hemisphereLights.needsUpdate=O}function kf(R){return R.isMeshLambertMaterial||R.isMeshToonMaterial||R.isMeshPhongMaterial||R.isMeshStandardMaterial||R.isShadowMaterial||R.isShaderMaterial&&R.lights===!0}this.getActiveCubeFace=function(){return b},this.getActiveMipmapLevel=function(){return y},this.getRenderTarget=function(){return A},this.setRenderTargetTextures=function(R,O,W){const X=he.get(R);X.__autoAllocateDepthBuffer=R.resolveDepthBuffer===!1,X.__autoAllocateDepthBuffer===!1&&(X.__useRenderToTexture=!1),he.get(R.texture).__webglTexture=O,he.get(R.depthTexture).__webglTexture=X.__autoAllocateDepthBuffer?void 0:W,X.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(R,O){const W=he.get(R);W.__webglFramebuffer=O,W.__useDefaultFramebuffer=O===void 0};const Bf=I.createFramebuffer();this.setRenderTarget=function(R,O=0,W=0){A=R,b=O,y=W;let X=!0,k=null,de=!1,be=!1;if(R){const Ee=he.get(R);if(Ee.__useDefaultFramebuffer!==void 0)Q.bindFramebuffer(I.FRAMEBUFFER,null),X=!1;else if(Ee.__webglFramebuffer===void 0)ge.setupRenderTarget(R);else if(Ee.__hasExternalTextures)ge.rebindTextures(R,he.get(R.texture).__webglTexture,he.get(R.depthTexture).__webglTexture);else if(R.depthBuffer){const Fe=R.depthTexture;if(Ee.__boundDepthTexture!==Fe){if(Fe!==null&&he.has(Fe)&&(R.width!==Fe.image.width||R.height!==Fe.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");ge.setupDepthRenderbuffer(R)}}const ke=R.texture;(ke.isData3DTexture||ke.isDataArrayTexture||ke.isCompressedArrayTexture)&&(be=!0);const Ge=he.get(R).__webglFramebuffer;R.isWebGLCubeRenderTarget?(Array.isArray(Ge[O])?k=Ge[O][W]:k=Ge[O],de=!0):R.samples>0&&ge.useMultisampledRTT(R)===!1?k=he.get(R).__webglMultisampledFramebuffer:Array.isArray(Ge)?k=Ge[W]:k=Ge,L.copy(R.viewport),D.copy(R.scissor),z=R.scissorTest}else L.copy(ce).multiplyScalar(B).floor(),D.copy(Re).multiplyScalar(B).floor(),z=Je;if(W!==0&&(k=Bf),Q.bindFramebuffer(I.FRAMEBUFFER,k)&&X&&Q.drawBuffers(R,k),Q.viewport(L),Q.scissor(D),Q.setScissorTest(z),de){const Ee=he.get(R.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_CUBE_MAP_POSITIVE_X+O,Ee.__webglTexture,W)}else if(be){const Ee=O;for(let ke=0;ke<R.textures.length;ke++){const Ge=he.get(R.textures[ke]);I.framebufferTextureLayer(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0+ke,Ge.__webglTexture,W,Ee)}}else if(R!==null&&W!==0){const Ee=he.get(R.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,Ee.__webglTexture,W)}T=-1},this.readRenderTargetPixels=function(R,O,W,X,k,de,be,De=0){if(!(R&&R.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ee=he.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&be!==void 0&&(Ee=Ee[be]),Ee){Q.bindFramebuffer(I.FRAMEBUFFER,Ee);try{const ke=R.textures[De],Ge=ke.format,Fe=ke.type;if(!J.textureFormatReadable(Ge)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!J.textureTypeReadable(Fe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}O>=0&&O<=R.width-X&&W>=0&&W<=R.height-k&&(R.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+De),I.readPixels(O,W,X,k,Ne.convert(Ge),Ne.convert(Fe),de))}finally{const ke=A!==null?he.get(A).__webglFramebuffer:null;Q.bindFramebuffer(I.FRAMEBUFFER,ke)}}},this.readRenderTargetPixelsAsync=async function(R,O,W,X,k,de,be,De=0){if(!(R&&R.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ee=he.get(R).__webglFramebuffer;if(R.isWebGLCubeRenderTarget&&be!==void 0&&(Ee=Ee[be]),Ee)if(O>=0&&O<=R.width-X&&W>=0&&W<=R.height-k){Q.bindFramebuffer(I.FRAMEBUFFER,Ee);const ke=R.textures[De],Ge=ke.format,Fe=ke.type;if(!J.textureFormatReadable(Ge))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!J.textureTypeReadable(Fe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const it=I.createBuffer();I.bindBuffer(I.PIXEL_PACK_BUFFER,it),I.bufferData(I.PIXEL_PACK_BUFFER,de.byteLength,I.STREAM_READ),R.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+De),I.readPixels(O,W,X,k,Ne.convert(Ge),Ne.convert(Fe),0);const gt=A!==null?he.get(A).__webglFramebuffer:null;Q.bindFramebuffer(I.FRAMEBUFFER,gt);const Lt=I.fenceSync(I.SYNC_GPU_COMMANDS_COMPLETE,0);return I.flush(),await Yd(I,Lt,4),I.bindBuffer(I.PIXEL_PACK_BUFFER,it),I.getBufferSubData(I.PIXEL_PACK_BUFFER,0,de),I.deleteBuffer(it),I.deleteSync(Lt),de}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(R,O=null,W=0){const X=Math.pow(2,-W),k=Math.floor(R.image.width*X),de=Math.floor(R.image.height*X),be=O!==null?O.x:0,De=O!==null?O.y:0;ge.setTexture2D(R,0),I.copyTexSubImage2D(I.TEXTURE_2D,W,0,0,be,De,k,de),Q.unbindTexture()};const Hf=I.createFramebuffer(),Vf=I.createFramebuffer();this.copyTextureToTexture=function(R,O,W=null,X=null,k=0,de=null){de===null&&(k!==0?(vr("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),de=k,k=0):de=0);let be,De,Ee,ke,Ge,Fe,it,gt,Lt;const St=R.isCompressedTexture?R.mipmaps[de]:R.image;if(W!==null)be=W.max.x-W.min.x,De=W.max.y-W.min.y,Ee=W.isBox3?W.max.z-W.min.z:1,ke=W.min.x,Ge=W.min.y,Fe=W.isBox3?W.min.z:0;else{const mn=Math.pow(2,-k);be=Math.floor(St.width*mn),De=Math.floor(St.height*mn),R.isDataArrayTexture?Ee=St.depth:R.isData3DTexture?Ee=Math.floor(St.depth*mn):Ee=1,ke=0,Ge=0,Fe=0}X!==null?(it=X.x,gt=X.y,Lt=X.z):(it=0,gt=0,Lt=0);const _t=Ne.convert(O.format),Oe=Ne.convert(O.type);let Rt;O.isData3DTexture?(ge.setTexture3D(O,0),Rt=I.TEXTURE_3D):O.isDataArrayTexture||O.isCompressedArrayTexture?(ge.setTexture2DArray(O,0),Rt=I.TEXTURE_2D_ARRAY):(ge.setTexture2D(O,0),Rt=I.TEXTURE_2D),I.pixelStorei(I.UNPACK_FLIP_Y_WEBGL,O.flipY),I.pixelStorei(I.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),I.pixelStorei(I.UNPACK_ALIGNMENT,O.unpackAlignment);const lt=I.getParameter(I.UNPACK_ROW_LENGTH),cn=I.getParameter(I.UNPACK_IMAGE_HEIGHT),$i=I.getParameter(I.UNPACK_SKIP_PIXELS),ln=I.getParameter(I.UNPACK_SKIP_ROWS),Gs=I.getParameter(I.UNPACK_SKIP_IMAGES);I.pixelStorei(I.UNPACK_ROW_LENGTH,St.width),I.pixelStorei(I.UNPACK_IMAGE_HEIGHT,St.height),I.pixelStorei(I.UNPACK_SKIP_PIXELS,ke),I.pixelStorei(I.UNPACK_SKIP_ROWS,Ge),I.pixelStorei(I.UNPACK_SKIP_IMAGES,Fe);const Ct=R.isDataArrayTexture||R.isData3DTexture,pn=O.isDataArrayTexture||O.isData3DTexture;if(R.isDepthTexture){const mn=he.get(R),Zt=he.get(O),sn=he.get(mn.__renderTarget),Ho=he.get(Zt.__renderTarget);Q.bindFramebuffer(I.READ_FRAMEBUFFER,sn.__webglFramebuffer),Q.bindFramebuffer(I.DRAW_FRAMEBUFFER,Ho.__webglFramebuffer);for(let Ci=0;Ci<Ee;Ci++)Ct&&(I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,he.get(R).__webglTexture,k,Fe+Ci),I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,he.get(O).__webglTexture,de,Lt+Ci)),I.blitFramebuffer(ke,Ge,be,De,it,gt,be,De,I.DEPTH_BUFFER_BIT,I.NEAREST);Q.bindFramebuffer(I.READ_FRAMEBUFFER,null),Q.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else if(k!==0||R.isRenderTargetTexture||he.has(R)){const mn=he.get(R),Zt=he.get(O);Q.bindFramebuffer(I.READ_FRAMEBUFFER,Hf),Q.bindFramebuffer(I.DRAW_FRAMEBUFFER,Vf);for(let sn=0;sn<Ee;sn++)Ct?I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,mn.__webglTexture,k,Fe+sn):I.framebufferTexture2D(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,mn.__webglTexture,k),pn?I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,Zt.__webglTexture,de,Lt+sn):I.framebufferTexture2D(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,Zt.__webglTexture,de),k!==0?I.blitFramebuffer(ke,Ge,be,De,it,gt,be,De,I.COLOR_BUFFER_BIT,I.NEAREST):pn?I.copyTexSubImage3D(Rt,de,it,gt,Lt+sn,ke,Ge,be,De):I.copyTexSubImage2D(Rt,de,it,gt,ke,Ge,be,De);Q.bindFramebuffer(I.READ_FRAMEBUFFER,null),Q.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else pn?R.isDataTexture||R.isData3DTexture?I.texSubImage3D(Rt,de,it,gt,Lt,be,De,Ee,_t,Oe,St.data):O.isCompressedArrayTexture?I.compressedTexSubImage3D(Rt,de,it,gt,Lt,be,De,Ee,_t,St.data):I.texSubImage3D(Rt,de,it,gt,Lt,be,De,Ee,_t,Oe,St):R.isDataTexture?I.texSubImage2D(I.TEXTURE_2D,de,it,gt,be,De,_t,Oe,St.data):R.isCompressedTexture?I.compressedTexSubImage2D(I.TEXTURE_2D,de,it,gt,St.width,St.height,_t,St.data):I.texSubImage2D(I.TEXTURE_2D,de,it,gt,be,De,_t,Oe,St);I.pixelStorei(I.UNPACK_ROW_LENGTH,lt),I.pixelStorei(I.UNPACK_IMAGE_HEIGHT,cn),I.pixelStorei(I.UNPACK_SKIP_PIXELS,$i),I.pixelStorei(I.UNPACK_SKIP_ROWS,ln),I.pixelStorei(I.UNPACK_SKIP_IMAGES,Gs),de===0&&O.generateMipmaps&&I.generateMipmap(Rt),Q.unbindTexture()},this.initRenderTarget=function(R){he.get(R).__webglFramebuffer===void 0&&ge.setupRenderTarget(R)},this.initTexture=function(R){R.isCubeTexture?ge.setTextureCube(R,0):R.isData3DTexture?ge.setTexture3D(R,0):R.isDataArrayTexture||R.isCompressedArrayTexture?ge.setTexture2DArray(R,0):ge.setTexture2D(R,0),Q.unbindTexture()},this.resetState=function(){b=0,y=0,A=null,Q.reset(),ve.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Gn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=rt._getDrawingBufferColorSpace(e),t.unpackColorSpace=rt._getUnpackColorSpace()}}function pl(s,e=!1){const t=s[0].index!==null,n=new Set(Object.keys(s[0].attributes)),i=new Set(Object.keys(s[0].morphAttributes)),r={},o={},a=s[0].morphTargetsRelative,c=new wt;let l=0;for(let h=0;h<s.length;++h){const u=s[h];let f=0;if(t!==(u.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const d in u.attributes){if(!n.has(d))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+'. All geometries must have compatible attributes; make sure "'+d+'" attribute exists among all geometries, or in none of them.'),null;r[d]===void 0&&(r[d]=[]),r[d].push(u.attributes[d]),f++}if(f!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". Make sure all geometries have the same number of attributes."),null;if(a!==u.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const d in u.morphAttributes){if(!i.has(d))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+".  .morphAttributes must be consistent throughout all geometries."),null;o[d]===void 0&&(o[d]=[]),o[d].push(u.morphAttributes[d])}if(e){let d;if(t)d=u.index.count;else if(u.attributes.position!==void 0)d=u.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+h+". The geometry must have either an index or a position attribute"),null;c.addGroup(l,d,h),l+=d}}if(t){let h=0;const u=[];for(let f=0;f<s.length;++f){const d=s[f].index;for(let m=0;m<d.count;++m)u.push(d.getX(m)+h);h+=s[f].attributes.position.count}c.setIndex(u)}for(const h in r){const u=eu(r[h]);if(!u)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" attribute."),null;c.setAttribute(h,u)}for(const h in o){const u=o[h][0].length;if(u===0)break;c.morphAttributes=c.morphAttributes||{},c.morphAttributes[h]=[];for(let f=0;f<u;++f){const d=[];for(let x=0;x<o[h].length;++x)d.push(o[h][x][f]);const m=eu(d);if(!m)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+h+" morphAttribute."),null;c.morphAttributes[h].push(m)}}return c}function eu(s){let e,t,n,i=-1,r=0;for(let l=0;l<s.length;++l){const h=s[l];if(e===void 0&&(e=h.array.constructor),e!==h.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=h.itemSize),t!==h.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=h.normalized),n!==h.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=h.gpuType),i!==h.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;r+=h.count*t}const o=new e(r),a=new yt(o,t,n);let c=0;for(let l=0;l<s.length;++l){const h=s[l];if(h.isInterleavedBufferAttribute){const u=c/t;for(let f=0,d=h.count;f<d;f++)for(let m=0;m<t;m++){const x=h.getComponent(f,m);a.setComponent(f+u,m,x)}}else o.set(h.array,c);c+=h.count*t}return i!==void 0&&(a.gpuType=i),a}function tu(s,e){if(e===_d)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),s;if(e===Mc||e===Ou){let t=s.getIndex();if(t===null){const o=[],a=s.getAttribute("position");if(a!==void 0){for(let c=0;c<a.count;c++)o.push(c);s.setIndex(o),t=s.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),s}const n=t.count-2,i=[];if(e===Mc)for(let o=1;o<=n;o++)i.push(t.getX(0)),i.push(t.getX(o)),i.push(t.getX(o+1));else for(let o=0;o<n;o++)o%2===0?(i.push(t.getX(o)),i.push(t.getX(o+1)),i.push(t.getX(o+2))):(i.push(t.getX(o+2)),i.push(t.getX(o+1)),i.push(t.getX(o)));i.length/3!==n&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");const r=s.clone();return r.setIndex(i),r.clearGroups(),r}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),s}class y_ extends Bs{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new T_(t)}),this.register(function(t){return new E_(t)}),this.register(function(t){return new N_(t)}),this.register(function(t){return new z_(t)}),this.register(function(t){return new F_(t)}),this.register(function(t){return new R_(t)}),this.register(function(t){return new C_(t)}),this.register(function(t){return new P_(t)}),this.register(function(t){return new L_(t)}),this.register(function(t){return new S_(t)}),this.register(function(t){return new I_(t)}),this.register(function(t){return new A_(t)}),this.register(function(t){return new U_(t)}),this.register(function(t){return new D_(t)}),this.register(function(t){return new w_(t)}),this.register(function(t){return new O_(t)}),this.register(function(t){return new k_(t)})}load(e,t,n,i){const r=this;let o;if(this.resourcePath!=="")o=this.resourcePath;else if(this.path!==""){const l=lr.extractUrlBase(e);o=lr.resolveURL(l,this.path)}else o=lr.extractUrlBase(e);this.manager.itemStart(e);const a=function(l){i?i(l):console.error(l),r.manager.itemError(e),r.manager.itemEnd(e)},c=new df(this.manager);c.setPath(this.path),c.setResponseType("arraybuffer"),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(l){try{r.parse(l,o,function(h){t(h),r.manager.itemEnd(e)},a)}catch(h){a(h)}},n,a)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,i){let r;const o={},a={},c=new TextDecoder;if(typeof e=="string")r=JSON.parse(e);else if(e instanceof ArrayBuffer)if(c.decode(new Uint8Array(e,0,4))===Mf){try{o[nt.KHR_BINARY_GLTF]=new B_(e)}catch(u){i&&i(u);return}r=JSON.parse(o[nt.KHR_BINARY_GLTF].content)}else r=JSON.parse(c.decode(e));else r=e;if(r.asset===void 0||r.asset.version[0]<2){i&&i(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}const l=new Q_(r,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});l.fileLoader.setRequestHeader(this.requestHeader);for(let h=0;h<this.pluginCallbacks.length;h++){const u=this.pluginCallbacks[h](l);u.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),a[u.name]=u,o[u.name]=!0}if(r.extensionsUsed)for(let h=0;h<r.extensionsUsed.length;++h){const u=r.extensionsUsed[h],f=r.extensionsRequired||[];switch(u){case nt.KHR_MATERIALS_UNLIT:o[u]=new b_;break;case nt.KHR_DRACO_MESH_COMPRESSION:o[u]=new H_(r,this.dracoLoader);break;case nt.KHR_TEXTURE_TRANSFORM:o[u]=new V_;break;case nt.KHR_MESH_QUANTIZATION:o[u]=new G_;break;default:f.indexOf(u)>=0&&a[u]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+u+'".')}}l.setExtensions(o),l.setPlugins(a),l.parse(n,i)}parseAsync(e,t){const n=this;return new Promise(function(i,r){n.parse(e,t,i,r)})}}function M_(){let s={};return{get:function(e){return s[e]},add:function(e,t){s[e]=t},remove:function(e){delete s[e]},removeAll:function(){s={}}}}const nt={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"};class w_{constructor(e){this.parser=e,this.name=nt.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){const e=this.parser,t=this.parser.json.nodes||[];for(let n=0,i=t.length;n<i;n++){const r=t[n];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){const t=this.parser,n="light:"+e;let i=t.cache.get(n);if(i)return i;const r=t.json,c=((r.extensions&&r.extensions[this.name]||{}).lights||[])[e];let l;const h=new Me(16777215);c.color!==void 0&&h.setRGB(c.color[0],c.color[1],c.color[2],nn);const u=c.range!==void 0?c.range:0;switch(c.type){case"directional":l=new mf(h),l.target.position.set(0,0,-1),l.add(l.target);break;case"point":l=new bm(h),l.distance=u;break;case"spot":l=new Mm(h),l.distance=u,c.spot=c.spot||{},c.spot.innerConeAngle=c.spot.innerConeAngle!==void 0?c.spot.innerConeAngle:0,c.spot.outerConeAngle=c.spot.outerConeAngle!==void 0?c.spot.outerConeAngle:Math.PI/4,l.angle=c.spot.outerConeAngle,l.penumbra=1-c.spot.innerConeAngle/c.spot.outerConeAngle,l.target.position.set(0,0,-1),l.add(l.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+c.type)}return l.position.set(0,0,0),kn(l,c),c.intensity!==void 0&&(l.intensity=c.intensity),l.name=t.createUniqueName(c.name||"light_"+e),i=Promise.resolve(l),t.cache.add(n,i),i}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){const t=this,n=this.parser,r=n.json.nodes[e],a=(r.extensions&&r.extensions[this.name]||{}).light;return a===void 0?null:this._loadLight(a).then(function(c){return n._getNodeRef(t.cache,a,c)})}}class b_{constructor(){this.name=nt.KHR_MATERIALS_UNLIT}getMaterialType(){return Hi}extendParams(e,t,n){const i=[];e.color=new Me(1,1,1),e.opacity=1;const r=t.pbrMetallicRoughness;if(r){if(Array.isArray(r.baseColorFactor)){const o=r.baseColorFactor;e.color.setRGB(o[0],o[1],o[2],nn),e.opacity=o[3]}r.baseColorTexture!==void 0&&i.push(n.assignTexture(e,"map",r.baseColorTexture,Ut))}return Promise.all(i)}}class S_{constructor(e){this.parser=e,this.name=nt.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){const i=this.parser.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=i.extensions[this.name].emissiveStrength;return r!==void 0&&(t.emissiveIntensity=r),Promise.resolve()}}class T_{constructor(e){this.parser=e,this.name=nt.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Nn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];if(o.clearcoatFactor!==void 0&&(t.clearcoat=o.clearcoatFactor),o.clearcoatTexture!==void 0&&r.push(n.assignTexture(t,"clearcoatMap",o.clearcoatTexture)),o.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=o.clearcoatRoughnessFactor),o.clearcoatRoughnessTexture!==void 0&&r.push(n.assignTexture(t,"clearcoatRoughnessMap",o.clearcoatRoughnessTexture)),o.clearcoatNormalTexture!==void 0&&(r.push(n.assignTexture(t,"clearcoatNormalMap",o.clearcoatNormalTexture)),o.clearcoatNormalTexture.scale!==void 0)){const a=o.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new le(a,a)}return Promise.all(r)}}class E_{constructor(e){this.parser=e,this.name=nt.KHR_MATERIALS_DISPERSION}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Nn}extendMaterialParams(e,t){const i=this.parser.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=i.extensions[this.name];return t.dispersion=r.dispersion!==void 0?r.dispersion:0,Promise.resolve()}}class A_{constructor(e){this.parser=e,this.name=nt.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Nn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];return o.iridescenceFactor!==void 0&&(t.iridescence=o.iridescenceFactor),o.iridescenceTexture!==void 0&&r.push(n.assignTexture(t,"iridescenceMap",o.iridescenceTexture)),o.iridescenceIor!==void 0&&(t.iridescenceIOR=o.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),o.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=o.iridescenceThicknessMinimum),o.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=o.iridescenceThicknessMaximum),o.iridescenceThicknessTexture!==void 0&&r.push(n.assignTexture(t,"iridescenceThicknessMap",o.iridescenceThicknessTexture)),Promise.all(r)}}class R_{constructor(e){this.parser=e,this.name=nt.KHR_MATERIALS_SHEEN}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Nn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[];t.sheenColor=new Me(0,0,0),t.sheenRoughness=0,t.sheen=1;const o=i.extensions[this.name];if(o.sheenColorFactor!==void 0){const a=o.sheenColorFactor;t.sheenColor.setRGB(a[0],a[1],a[2],nn)}return o.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=o.sheenRoughnessFactor),o.sheenColorTexture!==void 0&&r.push(n.assignTexture(t,"sheenColorMap",o.sheenColorTexture,Ut)),o.sheenRoughnessTexture!==void 0&&r.push(n.assignTexture(t,"sheenRoughnessMap",o.sheenRoughnessTexture)),Promise.all(r)}}class C_{constructor(e){this.parser=e,this.name=nt.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Nn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];return o.transmissionFactor!==void 0&&(t.transmission=o.transmissionFactor),o.transmissionTexture!==void 0&&r.push(n.assignTexture(t,"transmissionMap",o.transmissionTexture)),Promise.all(r)}}class P_{constructor(e){this.parser=e,this.name=nt.KHR_MATERIALS_VOLUME}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Nn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];t.thickness=o.thicknessFactor!==void 0?o.thicknessFactor:0,o.thicknessTexture!==void 0&&r.push(n.assignTexture(t,"thicknessMap",o.thicknessTexture)),t.attenuationDistance=o.attenuationDistance||1/0;const a=o.attenuationColor||[1,1,1];return t.attenuationColor=new Me().setRGB(a[0],a[1],a[2],nn),Promise.all(r)}}class L_{constructor(e){this.parser=e,this.name=nt.KHR_MATERIALS_IOR}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Nn}extendMaterialParams(e,t){const i=this.parser.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=i.extensions[this.name];return t.ior=r.ior!==void 0?r.ior:1.5,Promise.resolve()}}class I_{constructor(e){this.parser=e,this.name=nt.KHR_MATERIALS_SPECULAR}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Nn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];t.specularIntensity=o.specularFactor!==void 0?o.specularFactor:1,o.specularTexture!==void 0&&r.push(n.assignTexture(t,"specularIntensityMap",o.specularTexture));const a=o.specularColorFactor||[1,1,1];return t.specularColor=new Me().setRGB(a[0],a[1],a[2],nn),o.specularColorTexture!==void 0&&r.push(n.assignTexture(t,"specularColorMap",o.specularColorTexture,Ut)),Promise.all(r)}}class D_{constructor(e){this.parser=e,this.name=nt.EXT_MATERIALS_BUMP}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Nn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];return t.bumpScale=o.bumpFactor!==void 0?o.bumpFactor:1,o.bumpTexture!==void 0&&r.push(n.assignTexture(t,"bumpMap",o.bumpTexture)),Promise.all(r)}}class U_{constructor(e){this.parser=e,this.name=nt.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){const n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:Nn}extendMaterialParams(e,t){const n=this.parser,i=n.json.materials[e];if(!i.extensions||!i.extensions[this.name])return Promise.resolve();const r=[],o=i.extensions[this.name];return o.anisotropyStrength!==void 0&&(t.anisotropy=o.anisotropyStrength),o.anisotropyRotation!==void 0&&(t.anisotropyRotation=o.anisotropyRotation),o.anisotropyTexture!==void 0&&r.push(n.assignTexture(t,"anisotropyMap",o.anisotropyTexture)),Promise.all(r)}}class N_{constructor(e){this.parser=e,this.name=nt.KHR_TEXTURE_BASISU}loadTexture(e){const t=this.parser,n=t.json,i=n.textures[e];if(!i.extensions||!i.extensions[this.name])return null;const r=i.extensions[this.name],o=t.options.ktx2Loader;if(!o){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,r.source,o)}}class z_{constructor(e){this.parser=e,this.name=nt.EXT_TEXTURE_WEBP}loadTexture(e){const t=this.name,n=this.parser,i=n.json,r=i.textures[e];if(!r.extensions||!r.extensions[t])return null;const o=r.extensions[t],a=i.images[o.source];let c=n.textureLoader;if(a.uri){const l=n.options.manager.getHandler(a.uri);l!==null&&(c=l)}return n.loadTextureImage(e,o.source,c)}}class F_{constructor(e){this.parser=e,this.name=nt.EXT_TEXTURE_AVIF}loadTexture(e){const t=this.name,n=this.parser,i=n.json,r=i.textures[e];if(!r.extensions||!r.extensions[t])return null;const o=r.extensions[t],a=i.images[o.source];let c=n.textureLoader;if(a.uri){const l=n.options.manager.getHandler(a.uri);l!==null&&(c=l)}return n.loadTextureImage(e,o.source,c)}}class O_{constructor(e){this.name=nt.EXT_MESHOPT_COMPRESSION,this.parser=e}loadBufferView(e){const t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){const i=n.extensions[this.name],r=this.parser.getDependency("buffer",i.buffer),o=this.parser.options.meshoptDecoder;if(!o||!o.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return r.then(function(a){const c=i.byteOffset||0,l=i.byteLength||0,h=i.count,u=i.byteStride,f=new Uint8Array(a,c,l);return o.decodeGltfBufferAsync?o.decodeGltfBufferAsync(h,u,f,i.mode,i.filter).then(function(d){return d.buffer}):o.ready.then(function(){const d=new ArrayBuffer(h*u);return o.decodeGltfBuffer(new Uint8Array(d),h,u,f,i.mode,i.filter),d})})}else return null}}class k_{constructor(e){this.name=nt.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){const t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;const i=t.meshes[n.mesh];for(const l of i.primitives)if(l.mode!==_n.TRIANGLES&&l.mode!==_n.TRIANGLE_STRIP&&l.mode!==_n.TRIANGLE_FAN&&l.mode!==void 0)return null;const o=n.extensions[this.name].attributes,a=[],c={};for(const l in o)a.push(this.parser.getDependency("accessor",o[l]).then(h=>(c[l]=h,c[l])));return a.length<1?null:(a.push(this.parser.createNodeMesh(e)),Promise.all(a).then(l=>{const h=l.pop(),u=h.isGroup?h.children:[h],f=l[0].count,d=[];for(const m of u){const x=new qe,g=new C,p=new bn,M=new C(1,1,1),v=new ii(m.geometry,m.material,f);for(let _=0;_<f;_++)c.TRANSLATION&&g.fromBufferAttribute(c.TRANSLATION,_),c.ROTATION&&p.fromBufferAttribute(c.ROTATION,_),c.SCALE&&M.fromBufferAttribute(c.SCALE,_),v.setMatrixAt(_,x.compose(g,p,M));for(const _ in c)if(_==="_COLOR_0"){const w=c[_];v.instanceColor=new bc(w.array,w.itemSize,w.normalized)}else _!=="TRANSLATION"&&_!=="ROTATION"&&_!=="SCALE"&&m.geometry.setAttribute(_,c[_]);ut.prototype.copy.call(v,m),this.parser.assignFinalMaterial(v),d.push(v)}return h.isGroup?(h.clear(),h.add(...d),h):d[0]}))}}const Mf="glTF",Js=12,nu={JSON:1313821514,BIN:5130562};class B_{constructor(e){this.name=nt.KHR_BINARY_GLTF,this.content=null,this.body=null;const t=new DataView(e,0,Js),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==Mf)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");const i=this.header.length-Js,r=new DataView(e,Js);let o=0;for(;o<i;){const a=r.getUint32(o,!0);o+=4;const c=r.getUint32(o,!0);if(o+=4,c===nu.JSON){const l=new Uint8Array(e,Js+o,a);this.content=n.decode(l)}else if(c===nu.BIN){const l=Js+o;this.body=e.slice(l,l+a)}o+=a}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}}class H_{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=nt.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){const n=this.json,i=this.dracoLoader,r=e.extensions[this.name].bufferView,o=e.extensions[this.name].attributes,a={},c={},l={};for(const h in o){const u=Cc[h]||h.toLowerCase();a[u]=o[h]}for(const h in e.attributes){const u=Cc[h]||h.toLowerCase();if(o[h]!==void 0){const f=n.accessors[e.attributes[h]],d=Ts[f.componentType];l[u]=d.name,c[u]=f.normalized===!0}}return t.getDependency("bufferView",r).then(function(h){return new Promise(function(u,f){i.decodeDracoFile(h,function(d){for(const m in d.attributes){const x=d.attributes[m],g=c[m];g!==void 0&&(x.normalized=g)}u(d)},a,l,nn,f)})})}}class V_{constructor(){this.name=nt.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){return(t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0||(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),e.needsUpdate=!0),e}}class G_{constructor(){this.name=nt.KHR_MESH_QUANTIZATION}}class wf extends Sr{constructor(e,t,n,i){super(e,t,n,i)}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,r=e*i*3+i;for(let o=0;o!==i;o++)t[o]=n[r+o];return t}interpolate_(e,t,n,i){const r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=a*2,l=a*3,h=i-t,u=(n-t)/h,f=u*u,d=f*u,m=e*l,x=m-l,g=-2*d+3*f,p=d-f,M=1-g,v=p-f+u;for(let _=0;_!==a;_++){const w=o[x+_+a],b=o[x+_+c]*h,y=o[m+_+a],A=o[m+_]*h;r[_]=M*w+v*b+g*y+p*A}return r}}const W_=new bn;class X_ extends wf{interpolate_(e,t,n,i){const r=super.interpolate_(e,t,n,i);return W_.fromArray(r).normalize().toArray(r),r}}const _n={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6},Ts={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},iu={9728:tn,9729:on,9984:Pu,9985:lo,9986:tr,9987:Vn},su={33071:Pn,33648:yo,10497:ci},Ea={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},Cc={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},_i={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},q_={CUBICSPLINE:void 0,LINEAR:gr,STEP:mr},Aa={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function Y_(s){return s.DefaultMaterial===void 0&&(s.DefaultMaterial=new Dt({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:ai})),s.DefaultMaterial}function zi(s,e,t){for(const n in t.extensions)s[n]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[n]=t.extensions[n])}function kn(s,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(s.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function j_(s,e,t){let n=!1,i=!1,r=!1;for(let l=0,h=e.length;l<h;l++){const u=e[l];if(u.POSITION!==void 0&&(n=!0),u.NORMAL!==void 0&&(i=!0),u.COLOR_0!==void 0&&(r=!0),n&&i&&r)break}if(!n&&!i&&!r)return Promise.resolve(s);const o=[],a=[],c=[];for(let l=0,h=e.length;l<h;l++){const u=e[l];if(n){const f=u.POSITION!==void 0?t.getDependency("accessor",u.POSITION):s.attributes.position;o.push(f)}if(i){const f=u.NORMAL!==void 0?t.getDependency("accessor",u.NORMAL):s.attributes.normal;a.push(f)}if(r){const f=u.COLOR_0!==void 0?t.getDependency("accessor",u.COLOR_0):s.attributes.color;c.push(f)}}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(c)]).then(function(l){const h=l[0],u=l[1],f=l[2];return n&&(s.morphAttributes.position=h),i&&(s.morphAttributes.normal=u),r&&(s.morphAttributes.color=f),s.morphTargetsRelative=!0,s})}function K_(s,e){if(s.updateMorphTargets(),e.weights!==void 0)for(let t=0,n=e.weights.length;t<n;t++)s.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){const t=e.extras.targetNames;if(s.morphTargetInfluences.length===t.length){s.morphTargetDictionary={};for(let n=0,i=t.length;n<i;n++)s.morphTargetDictionary[t[n]]=n}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function Z_(s){let e;const t=s.extensions&&s.extensions[nt.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+Ra(t.attributes):e=s.indices+":"+Ra(s.attributes)+":"+s.mode,s.targets!==void 0)for(let n=0,i=s.targets.length;n<i;n++)e+=":"+Ra(s.targets[n]);return e}function Ra(s){let e="";const t=Object.keys(s).sort();for(let n=0,i=t.length;n<i;n++)e+=t[n]+":"+s[t[n]]+";";return e}function Pc(s){switch(s){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function $_(s){return s.search(/\.jpe?g($|\?)/i)>0||s.search(/^data\:image\/jpeg/)===0?"image/jpeg":s.search(/\.webp($|\?)/i)>0||s.search(/^data\:image\/webp/)===0?"image/webp":s.search(/\.ktx2($|\?)/i)>0||s.search(/^data\:image\/ktx2/)===0?"image/ktx2":"image/png"}const J_=new qe;class Q_{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new M_,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,i=-1,r=!1,o=-1;if(typeof navigator<"u"){const a=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(a)===!0;const c=a.match(/Version\/(\d+)/);i=n&&c?parseInt(c[1],10):-1,r=a.indexOf("Firefox")>-1,o=r?a.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||n&&i<17||r&&o<98?this.textureLoader=new pf(this.options.manager):this.textureLoader=new Tm(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new df(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),this.options.crossOrigin==="use-credentials"&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){const n=this,i=this.json,r=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(o){return o._markDefs&&o._markDefs()}),Promise.all(this._invokeAll(function(o){return o.beforeRoot&&o.beforeRoot()})).then(function(){return Promise.all([n.getDependencies("scene"),n.getDependencies("animation"),n.getDependencies("camera")])}).then(function(o){const a={scene:o[0][i.scene||0],scenes:o[0],animations:o[1],cameras:o[2],asset:i.asset,parser:n,userData:{}};return zi(r,a,i),kn(a,i),Promise.all(n._invokeAll(function(c){return c.afterRoot&&c.afterRoot(a)})).then(function(){for(const c of a.scenes)c.updateMatrixWorld();e(a)})}).catch(t)}_markDefs(){const e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let i=0,r=t.length;i<r;i++){const o=t[i].joints;for(let a=0,c=o.length;a<c;a++)e[o[a]].isBone=!0}for(let i=0,r=e.length;i<r;i++){const o=e[i];o.mesh!==void 0&&(this._addNodeRef(this.meshCache,o.mesh),o.skin!==void 0&&(n[o.mesh].isSkinnedMesh=!0)),o.camera!==void 0&&this._addNodeRef(this.cameraCache,o.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;const i=n.clone(),r=(o,a)=>{const c=this.associations.get(o);c!=null&&this.associations.set(a,c);for(const[l,h]of o.children.entries())r(h,a.children[l])};return r(n,i),i.name+="_instance_"+e.uses[t]++,i}_invokeOne(e){const t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){const i=e(t[n]);if(i)return i}return null}_invokeAll(e){const t=Object.values(this.plugins);t.unshift(this);const n=[];for(let i=0;i<t.length;i++){const r=e(t[i]);r&&n.push(r)}return n}getDependency(e,t){const n=e+":"+t;let i=this.cache.get(n);if(!i){switch(e){case"scene":i=this.loadScene(t);break;case"node":i=this._invokeOne(function(r){return r.loadNode&&r.loadNode(t)});break;case"mesh":i=this._invokeOne(function(r){return r.loadMesh&&r.loadMesh(t)});break;case"accessor":i=this.loadAccessor(t);break;case"bufferView":i=this._invokeOne(function(r){return r.loadBufferView&&r.loadBufferView(t)});break;case"buffer":i=this.loadBuffer(t);break;case"material":i=this._invokeOne(function(r){return r.loadMaterial&&r.loadMaterial(t)});break;case"texture":i=this._invokeOne(function(r){return r.loadTexture&&r.loadTexture(t)});break;case"skin":i=this.loadSkin(t);break;case"animation":i=this._invokeOne(function(r){return r.loadAnimation&&r.loadAnimation(t)});break;case"camera":i=this.loadCamera(t);break;default:if(i=this._invokeOne(function(r){return r!=this&&r.getDependency&&r.getDependency(e,t)}),!i)throw new Error("Unknown type: "+e);break}this.cache.add(n,i)}return i}getDependencies(e){let t=this.cache.get(e);if(!t){const n=this,i=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(i.map(function(r,o){return n.getDependency(e,o)})),this.cache.add(e,t)}return t}loadBuffer(e){const t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[nt.KHR_BINARY_GLTF].body);const i=this.options;return new Promise(function(r,o){n.load(lr.resolveURL(t.uri,i.path),r,void 0,function(){o(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){const t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(n){const i=t.byteLength||0,r=t.byteOffset||0;return n.slice(r,r+i)})}loadAccessor(e){const t=this,n=this.json,i=this.json.accessors[e];if(i.bufferView===void 0&&i.sparse===void 0){const o=Ea[i.type],a=Ts[i.componentType],c=i.normalized===!0,l=new a(i.count*o);return Promise.resolve(new yt(l,o,c))}const r=[];return i.bufferView!==void 0?r.push(this.getDependency("bufferView",i.bufferView)):r.push(null),i.sparse!==void 0&&(r.push(this.getDependency("bufferView",i.sparse.indices.bufferView)),r.push(this.getDependency("bufferView",i.sparse.values.bufferView))),Promise.all(r).then(function(o){const a=o[0],c=Ea[i.type],l=Ts[i.componentType],h=l.BYTES_PER_ELEMENT,u=h*c,f=i.byteOffset||0,d=i.bufferView!==void 0?n.bufferViews[i.bufferView].byteStride:void 0,m=i.normalized===!0;let x,g;if(d&&d!==u){const p=Math.floor(f/d),M="InterleavedBuffer:"+i.bufferView+":"+i.componentType+":"+p+":"+i.count;let v=t.cache.get(M);v||(x=new l(a,p*d,i.count*d/h),v=new xp(x,d/h),t.cache.add(M,v)),g=new $c(v,c,f%d/h,m)}else a===null?x=new l(i.count*c):x=new l(a,f,i.count*c),g=new yt(x,c,m);if(i.sparse!==void 0){const p=Ea.SCALAR,M=Ts[i.sparse.indices.componentType],v=i.sparse.indices.byteOffset||0,_=i.sparse.values.byteOffset||0,w=new M(o[1],v,i.sparse.count*p),b=new l(o[2],_,i.sparse.count*c);a!==null&&(g=new yt(g.array.slice(),g.itemSize,g.normalized)),g.normalized=!1;for(let y=0,A=w.length;y<A;y++){const T=w[y];if(g.setX(T,b[y*c]),c>=2&&g.setY(T,b[y*c+1]),c>=3&&g.setZ(T,b[y*c+2]),c>=4&&g.setW(T,b[y*c+3]),c>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}g.normalized=m}return g})}loadTexture(e){const t=this.json,n=this.options,r=t.textures[e].source,o=t.images[r];let a=this.textureLoader;if(o.uri){const c=n.manager.getHandler(o.uri);c!==null&&(a=c)}return this.loadTextureImage(e,r,a)}loadTextureImage(e,t,n){const i=this,r=this.json,o=r.textures[e],a=r.images[t],c=(a.uri||a.bufferView)+":"+o.sampler;if(this.textureCache[c])return this.textureCache[c];const l=this.loadImageSource(t,n).then(function(h){h.flipY=!1,h.name=o.name||a.name||"",h.name===""&&typeof a.uri=="string"&&a.uri.startsWith("data:image/")===!1&&(h.name=a.uri);const f=(r.samplers||{})[o.sampler]||{};return h.magFilter=iu[f.magFilter]||on,h.minFilter=iu[f.minFilter]||Vn,h.wrapS=su[f.wrapS]||ci,h.wrapT=su[f.wrapT]||ci,h.generateMipmaps=!h.isCompressedTexture&&h.minFilter!==tn&&h.minFilter!==on,i.associations.set(h,{textures:e}),h}).catch(function(){return null});return this.textureCache[c]=l,l}loadImageSource(e,t){const n=this,i=this.json,r=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(u=>u.clone());const o=i.images[e],a=self.URL||self.webkitURL;let c=o.uri||"",l=!1;if(o.bufferView!==void 0)c=n.getDependency("bufferView",o.bufferView).then(function(u){l=!0;const f=new Blob([u],{type:o.mimeType});return c=a.createObjectURL(f),c});else if(o.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");const h=Promise.resolve(c).then(function(u){return new Promise(function(f,d){let m=f;t.isImageBitmapLoader===!0&&(m=function(x){const g=new Ft(x);g.needsUpdate=!0,f(g)}),t.load(lr.resolveURL(u,r.path),m,void 0,d)})}).then(function(u){return l===!0&&a.revokeObjectURL(c),kn(u,o),u.userData.mimeType=o.mimeType||$_(o.uri),u}).catch(function(u){throw console.error("THREE.GLTFLoader: Couldn't load texture",c),u});return this.sourceCache[e]=h,h}assignTexture(e,t,n,i){const r=this;return this.getDependency("texture",n.index).then(function(o){if(!o)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(o=o.clone(),o.channel=n.texCoord),r.extensions[nt.KHR_TEXTURE_TRANSFORM]){const a=n.extensions!==void 0?n.extensions[nt.KHR_TEXTURE_TRANSFORM]:void 0;if(a){const c=r.associations.get(o);o=r.extensions[nt.KHR_TEXTURE_TRANSFORM].extendTexture(o,a),r.associations.set(o,c)}}return i!==void 0&&(o.colorSpace=i),e[t]=o,o})}assignFinalMaterial(e){const t=e.geometry;let n=e.material;const i=t.attributes.tangent===void 0,r=t.attributes.color!==void 0,o=t.attributes.normal===void 0;if(e.isPoints){const a="PointsMaterial:"+n.uuid;let c=this.cache.get(a);c||(c=new Wi,Wn.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,c.sizeAttenuation=!1,this.cache.add(a,c)),n=c}else if(e.isLine){const a="LineBasicMaterial:"+n.uuid;let c=this.cache.get(a);c||(c=new Zu,Wn.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,this.cache.add(a,c)),n=c}if(i||r||o){let a="ClonedMaterial:"+n.uuid+":";i&&(a+="derivative-tangents:"),r&&(a+="vertex-colors:"),o&&(a+="flat-shading:");let c=this.cache.get(a);c||(c=n.clone(),r&&(c.vertexColors=!0),o&&(c.flatShading=!0),i&&(c.normalScale&&(c.normalScale.y*=-1),c.clearcoatNormalScale&&(c.clearcoatNormalScale.y*=-1)),this.cache.add(a,c),this.associations.set(c,this.associations.get(n))),n=c}e.material=n}getMaterialType(){return Dt}loadMaterial(e){const t=this,n=this.json,i=this.extensions,r=n.materials[e];let o;const a={},c=r.extensions||{},l=[];if(c[nt.KHR_MATERIALS_UNLIT]){const u=i[nt.KHR_MATERIALS_UNLIT];o=u.getMaterialType(),l.push(u.extendParams(a,r,t))}else{const u=r.pbrMetallicRoughness||{};if(a.color=new Me(1,1,1),a.opacity=1,Array.isArray(u.baseColorFactor)){const f=u.baseColorFactor;a.color.setRGB(f[0],f[1],f[2],nn),a.opacity=f[3]}u.baseColorTexture!==void 0&&l.push(t.assignTexture(a,"map",u.baseColorTexture,Ut)),a.metalness=u.metallicFactor!==void 0?u.metallicFactor:1,a.roughness=u.roughnessFactor!==void 0?u.roughnessFactor:1,u.metallicRoughnessTexture!==void 0&&(l.push(t.assignTexture(a,"metalnessMap",u.metallicRoughnessTexture)),l.push(t.assignTexture(a,"roughnessMap",u.metallicRoughnessTexture))),o=this._invokeOne(function(f){return f.getMaterialType&&f.getMaterialType(e)}),l.push(Promise.all(this._invokeAll(function(f){return f.extendMaterialParams&&f.extendMaterialParams(e,a)})))}r.doubleSided===!0&&(a.side=Et);const h=r.alphaMode||Aa.OPAQUE;if(h===Aa.BLEND?(a.transparent=!0,a.depthWrite=!1):(a.transparent=!1,h===Aa.MASK&&(a.alphaTest=r.alphaCutoff!==void 0?r.alphaCutoff:.5)),r.normalTexture!==void 0&&o!==Hi&&(l.push(t.assignTexture(a,"normalMap",r.normalTexture)),a.normalScale=new le(1,1),r.normalTexture.scale!==void 0)){const u=r.normalTexture.scale;a.normalScale.set(u,u)}if(r.occlusionTexture!==void 0&&o!==Hi&&(l.push(t.assignTexture(a,"aoMap",r.occlusionTexture)),r.occlusionTexture.strength!==void 0&&(a.aoMapIntensity=r.occlusionTexture.strength)),r.emissiveFactor!==void 0&&o!==Hi){const u=r.emissiveFactor;a.emissive=new Me().setRGB(u[0],u[1],u[2],nn)}return r.emissiveTexture!==void 0&&o!==Hi&&l.push(t.assignTexture(a,"emissiveMap",r.emissiveTexture,Ut)),Promise.all(l).then(function(){const u=new o(a);return r.name&&(u.name=r.name),kn(u,r),t.associations.set(u,{materials:e}),r.extensions&&zi(i,u,r),u})}createUniqueName(e){const t=mt.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){const t=this,n=this.extensions,i=this.primitiveCache;function r(a){return n[nt.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(a,t).then(function(c){return ru(c,a,t)})}const o=[];for(let a=0,c=e.length;a<c;a++){const l=e[a],h=Z_(l),u=i[h];if(u)o.push(u.promise);else{let f;l.extensions&&l.extensions[nt.KHR_DRACO_MESH_COMPRESSION]?f=r(l):f=ru(new wt,l,t),i[h]={primitive:l,promise:f},o.push(f)}}return Promise.all(o)}loadMesh(e){const t=this,n=this.json,i=this.extensions,r=n.meshes[e],o=r.primitives,a=[];for(let c=0,l=o.length;c<l;c++){const h=o[c].material===void 0?Y_(this.cache):this.getDependency("material",o[c].material);a.push(h)}return a.push(t.loadGeometries(o)),Promise.all(a).then(function(c){const l=c.slice(0,c.length-1),h=c[c.length-1],u=[];for(let d=0,m=h.length;d<m;d++){const x=h[d],g=o[d];let p;const M=l[d];if(g.mode===_n.TRIANGLES||g.mode===_n.TRIANGLE_STRIP||g.mode===_n.TRIANGLE_FAN||g.mode===void 0)p=r.isSkinnedMesh===!0?new _p(x,M):new st(x,M),p.isSkinnedMesh===!0&&p.normalizeSkinWeights(),g.mode===_n.TRIANGLE_STRIP?p.geometry=tu(p.geometry,Ou):g.mode===_n.TRIANGLE_FAN&&(p.geometry=tu(p.geometry,Mc));else if(g.mode===_n.LINES)p=new Ep(x,M);else if(g.mode===_n.LINE_STRIP)p=new el(x,M);else if(g.mode===_n.LINE_LOOP)p=new Ap(x,M);else if(g.mode===_n.POINTS)p=new Ss(x,M);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+g.mode);Object.keys(p.geometry.morphAttributes).length>0&&K_(p,r),p.name=t.createUniqueName(r.name||"mesh_"+e),kn(p,r),g.extensions&&zi(i,p,g),t.assignFinalMaterial(p),u.push(p)}for(let d=0,m=u.length;d<m;d++)t.associations.set(u[d],{meshes:e,primitives:d});if(u.length===1)return r.extensions&&zi(i,u[0],r),u[0];const f=new We;r.extensions&&zi(i,f,r),t.associations.set(f,{meshes:e});for(let d=0,m=u.length;d<m;d++)f.add(u[d]);return f})}loadCamera(e){let t;const n=this.json.cameras[e],i=n[n.type];if(!i){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return n.type==="perspective"?t=new Kt(Xd.radToDeg(i.yfov),i.aspectRatio||1,i.znear||1,i.zfar||2e6):n.type==="orthographic"&&(t=new hl(-i.xmag,i.xmag,i.ymag,-i.ymag,i.znear,i.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),kn(t,n),Promise.resolve(t)}loadSkin(e){const t=this.json.skins[e],n=[];for(let i=0,r=t.joints.length;i<r;i++)n.push(this._loadNodeShallow(t.joints[i]));return t.inverseBindMatrices!==void 0?n.push(this.getDependency("accessor",t.inverseBindMatrices)):n.push(null),Promise.all(n).then(function(i){const r=i.pop(),o=i,a=[],c=[];for(let l=0,h=o.length;l<h;l++){const u=o[l];if(u){a.push(u);const f=new qe;r!==null&&f.fromArray(r.array,l*16),c.push(f)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[l])}return new Mp(a,c)})}loadAnimation(e){const t=this.json,n=this,i=t.animations[e],r=i.name?i.name:"animation_"+e,o=[],a=[],c=[],l=[],h=[];for(let u=0,f=i.channels.length;u<f;u++){const d=i.channels[u],m=i.samplers[d.sampler],x=d.target,g=x.node,p=i.parameters!==void 0?i.parameters[m.input]:m.input,M=i.parameters!==void 0?i.parameters[m.output]:m.output;x.node!==void 0&&(o.push(this.getDependency("node",g)),a.push(this.getDependency("accessor",p)),c.push(this.getDependency("accessor",M)),l.push(m),h.push(x))}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(c),Promise.all(l),Promise.all(h)]).then(function(u){const f=u[0],d=u[1],m=u[2],x=u[3],g=u[4],p=[];for(let v=0,_=f.length;v<_;v++){const w=f[v],b=d[v],y=m[v],A=x[v],T=g[v];if(w===void 0)continue;w.updateMatrix&&w.updateMatrix();const S=n._createAnimationTracks(w,b,y,A,T);if(S)for(let L=0;L<S.length;L++)p.push(S[L])}const M=new fm(r,void 0,p);return kn(M,i),M})}createNodeMesh(e){const t=this.json,n=this,i=t.nodes[e];return i.mesh===void 0?null:n.getDependency("mesh",i.mesh).then(function(r){const o=n._getNodeRef(n.meshCache,i.mesh,r);return i.weights!==void 0&&o.traverse(function(a){if(a.isMesh)for(let c=0,l=i.weights.length;c<l;c++)a.morphTargetInfluences[c]=i.weights[c]}),o})}loadNode(e){const t=this.json,n=this,i=t.nodes[e],r=n._loadNodeShallow(e),o=[],a=i.children||[];for(let l=0,h=a.length;l<h;l++)o.push(n.getDependency("node",a[l]));const c=i.skin===void 0?Promise.resolve(null):n.getDependency("skin",i.skin);return Promise.all([r,Promise.all(o),c]).then(function(l){const h=l[0],u=l[1],f=l[2];f!==null&&h.traverse(function(d){d.isSkinnedMesh&&d.bind(f,J_)});for(let d=0,m=u.length;d<m;d++)h.add(u[d]);return h})}_loadNodeShallow(e){const t=this.json,n=this.extensions,i=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];const r=t.nodes[e],o=r.name?i.createUniqueName(r.name):"",a=[],c=i._invokeOne(function(l){return l.createNodeMesh&&l.createNodeMesh(e)});return c&&a.push(c),r.camera!==void 0&&a.push(i.getDependency("camera",r.camera).then(function(l){return i._getNodeRef(i.cameraCache,r.camera,l)})),i._invokeAll(function(l){return l.createNodeAttachment&&l.createNodeAttachment(e)}).forEach(function(l){a.push(l)}),this.nodeCache[e]=Promise.all(a).then(function(l){let h;if(r.isBone===!0?h=new ju:l.length>1?h=new We:l.length===1?h=l[0]:h=new ut,h!==l[0])for(let u=0,f=l.length;u<f;u++)h.add(l[u]);if(r.name&&(h.userData.name=r.name,h.name=o),kn(h,r),r.extensions&&zi(n,h,r),r.matrix!==void 0){const u=new qe;u.fromArray(r.matrix),h.applyMatrix4(u)}else r.translation!==void 0&&h.position.fromArray(r.translation),r.rotation!==void 0&&h.quaternion.fromArray(r.rotation),r.scale!==void 0&&h.scale.fromArray(r.scale);if(!i.associations.has(h))i.associations.set(h,{});else if(r.mesh!==void 0&&i.meshCache.refs[r.mesh]>1){const u=i.associations.get(h);i.associations.set(h,{...u})}return i.associations.get(h).nodes=e,h}),this.nodeCache[e]}loadScene(e){const t=this.extensions,n=this.json.scenes[e],i=this,r=new We;n.name&&(r.name=i.createUniqueName(n.name)),kn(r,n),n.extensions&&zi(t,r,n);const o=n.nodes||[],a=[];for(let c=0,l=o.length;c<l;c++)a.push(i.getDependency("node",o[c]));return Promise.all(a).then(function(c){for(let h=0,u=c.length;h<u;h++)r.add(c[h]);const l=h=>{const u=new Map;for(const[f,d]of i.associations)(f instanceof Wn||f instanceof Ft)&&u.set(f,d);return h.traverse(f=>{const d=i.associations.get(f);d!=null&&u.set(f,d)}),u};return i.associations=l(r),r})}_createAnimationTracks(e,t,n,i,r){const o=[],a=e.name?e.name:e.uuid,c=[];_i[r.path]===_i.weights?e.traverse(function(f){f.morphTargetInfluences&&c.push(f.name?f.name:f.uuid)}):c.push(a);let l;switch(_i[r.path]){case _i.weights:l=Is;break;case _i.rotation:l=Ds;break;case _i.translation:case _i.scale:l=Us;break;default:switch(n.itemSize){case 1:l=Is;break;case 2:case 3:default:l=Us;break}break}const h=i.interpolation!==void 0?q_[i.interpolation]:gr,u=this._getArrayFromAccessor(n);for(let f=0,d=c.length;f<d;f++){const m=new l(c[f]+"."+_i[r.path],t.array,u,h);i.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(m),o.push(m)}return o}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){const n=Pc(t.constructor),i=new Float32Array(t.length);for(let r=0,o=t.length;r<o;r++)i[r]=t[r]*n;t=i}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(n){const i=this instanceof Ds?X_:wf;return new i(this.times,this.values,this.getValueSize()/3,n)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}function e1(s,e,t){const n=e.attributes,i=new fi;if(n.POSITION!==void 0){const a=t.json.accessors[n.POSITION],c=a.min,l=a.max;if(c!==void 0&&l!==void 0){if(i.set(new C(c[0],c[1],c[2]),new C(l[0],l[1],l[2])),a.normalized){const h=Pc(Ts[a.componentType]);i.min.multiplyScalar(h),i.max.multiplyScalar(h)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;const r=e.targets;if(r!==void 0){const a=new C,c=new C;for(let l=0,h=r.length;l<h;l++){const u=r[l];if(u.POSITION!==void 0){const f=t.json.accessors[u.POSITION],d=f.min,m=f.max;if(d!==void 0&&m!==void 0){if(c.setX(Math.max(Math.abs(d[0]),Math.abs(m[0]))),c.setY(Math.max(Math.abs(d[1]),Math.abs(m[1]))),c.setZ(Math.max(Math.abs(d[2]),Math.abs(m[2]))),f.normalized){const x=Pc(Ts[f.componentType]);c.multiplyScalar(x)}a.max(c)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}i.expandByVector(a)}s.boundingBox=i;const o=new qn;i.getCenter(o.center),o.radius=i.min.distanceTo(i.max)/2,s.boundingSphere=o}function ru(s,e,t){const n=e.attributes,i=[];function r(o,a){return t.getDependency("accessor",o).then(function(c){s.setAttribute(a,c)})}for(const o in n){const a=Cc[o]||o.toLowerCase();a in s.attributes||i.push(r(n[o],a))}if(e.indices!==void 0&&!s.index){const o=t.getDependency("accessor",e.indices).then(function(a){s.setIndex(a)});i.push(o)}return rt.workingColorSpace!==nn&&"COLOR_0"in n&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${rt.workingColorSpace}" not supported.`),kn(s,e),e1(s,e,t),Promise.all(i).then(function(){return e.targets!==void 0?j_(s,e.targets,t):s})}const He=Math.PI*2,Tr=(s,e=0,t=1)=>Math.max(e,Math.min(t,s)),Ke=(s,e,t)=>s+(e-s)*t,ot=(s,e,t)=>{const n=Tr((t-s)/(e-s));return n*n*(3-2*n)};function Ve(s,e=0,t=0){let n=Math.imul(s|0,374761393)^Math.imul(e|0,668265263)^Math.imul(t|0,1274126177);return n=Math.imul(n^n>>>13,1274126177),((n^n>>>16)>>>0)/4294967296}function Fn(s){let e=s|0;return()=>{e+=1831565813;let t=e;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}}function Qt(s,e,t=0){const n=Math.floor(s),i=Math.floor(e),r=s-n,o=e-i,a=r*r*(3-2*r),c=o*o*(3-2*o);return Ke(Ke(Ve(n,i,t),Ve(n+1,i,t),a),Ke(Ve(n,i+1,t),Ve(n+1,i+1,t),a),c)}function ou(s,e,t=0){return Qt(s,e,t)*.58+Qt(s*2.03,e*2.03,t+1)*.28+Qt(s*4.07,e*4.07,t+2)*.14}class hi{constructor(){this.p=[],this.n=[],this.u=[],this.c=[],this.i=[]}vertex(e,t,n,i){const r=this.p.length/3;return this.p.push(...e),this.n.push(...t),this.u.push(...n),this.c.push(...i),r}quad(e,t,n,i,r,o=[0,0,1,1],a=[1,1,1]){const c=this.p.length/3;this.vertex(e,r,[o[0],o[1]],a),this.vertex(t,r,[o[2],o[1]],a),this.vertex(n,r,[o[2],o[3]],a),this.vertex(i,r,[o[0],o[3]],a),this.i.push(c,c+1,c+2,c,c+2,c+3)}tube(e,t,n,i,r=7,o=[1,1,1],a=0){const c=new C(...e),l=new C(...t),h=l.clone().sub(c),u=h.length();h.normalize();const f=new C(0,1,0);Math.abs(h.y)>.96&&f.set(1,0,0),f.cross(h).normalize();const d=h.clone().cross(f).normalize();c.addScaledVector(h,-.025),l.addScaledVector(h,.025);const m=this.p.length/3;for(let x=0;x<=r;x++){let g=x/r*He;const p=f.clone().multiplyScalar(Math.cos(g)).addScaledVector(d,Math.sin(g)),M=1+Math.sin(g*5)*.07;if(this.vertex(c.clone().addScaledVector(p,n*M).toArray(),p.toArray(),[x/r*1.5,a],o),this.vertex(l.clone().addScaledVector(p,i*M).toArray(),p.toArray(),[x/r*1.5,a+u*.52],o),x<r){const v=m+x*2;this.i.push(v,v+2,v+1,v+2,v+3,v+1)}}}plane(e,t,n,i,r=0,o=[0,0,.5,.5],a=[1,1,1]){const c=new bn().setFromEuler(new wn(r,i,0)),l=new C(0,0,1).applyQuaternion(c).toArray(),h=(u,f)=>new C(u,f,0).applyQuaternion(c).add(new C(...e)).toArray();this.quad(h(-t/2,-n/2),h(t/2,-n/2),h(t/2,n/2),h(-t/2,n/2),l,o,a)}geometry(){const e=new wt;return e.setAttribute("position",new Ye(this.p,3)),e.setAttribute("normal",new Ye(this.n,3)),e.setAttribute("uv",new Ye(this.u,2)),e.setAttribute("color",new Ye(this.c,3)),e.setIndex(this.i),e.computeBoundingSphere(),e}}function bf(s,e,t,n,i,r=!1){const o=new C(...t).sub(new C(...e)).normalize(),a=new C(0,1,0).cross(o).normalize(),c=o.clone().cross(a).normalize();for(const[l,h,u]of[[e,n,-1],[t,i,1]]){const f=new C(...l).addScaledVector(o,u*.03),d=o.clone().multiplyScalar(u).toArray(),m=r?.76:0;for(let x=0;x<24;x++){const g=x/24*He,p=(x+1)/24*He,M=(_,w)=>{const b=h*w*(1+Math.sin(_*5)*.035);return f.clone().addScaledVector(a,Math.cos(_)*b).addScaledVector(c,Math.sin(_)*b).toArray()},v=s.p.length/3;for(const[_,w]of[[g,m],[g,1],[p,1],[p,m]])s.vertex(M(_,w),d,[.5+Math.cos(_)*w*.5,.5+Math.sin(_)*w*.5],[1,1,1]);s.i.push(v,v+1,v+2,v,v+2,v+3)}}}function t1(){const s=new hi,e=Fn(154);for(let t=0;t<18;t++){const n=e()*He,i=Math.sqrt(e())*.52,r=Math.cos(n)*i,o=Math.sin(n)*i,a=.38+e()*.62,c=.0035+e()*.005,l=Math.sin(n),h=Math.cos(n);for(let u=0;u<3;u++){const f=u/3,d=(u+1)/3,m=c*(1-f),x=c*(1-d),g=(p,M,v)=>[r+l*p*p*a*.38+h*M*v,a*p,o+h*p*p*a*.38-l*M*v];s.quad(g(f,-1,m),g(f,1,m),g(d,1,x),g(d,-1,x),[h,.3,-l],[0,f,1,d],[.54+f*.38,.6+f*.3,.35+f*.3])}if(t<3){const u=r+l*a*.38,f=o+h*a*.38;for(let d=0;d<5;d++){const m=a+d*.025,x=.013*(1-d/6);s.plane([u,m,f],x*2,.06,n,.2,[0,0,1,1],[.7,.61,.42])}}}return s.geometry()}function Sf(){const s=new Un(.24,.24,2,2);s.rotateX(-Math.PI/2);const e=s.attributes.position;for(let t=0;t<e.count;t++)e.setY(t,.013*Math.pow(e.getZ(t)/.12,2)+Math.sin(e.getX(t)*16)*.006);return s.computeVertexNormals(),s.setAttribute("color",new Ye(new Array(e.count*3).fill(1),3)),s}function n1(){const s=Sf(),e=new hi,t=Fn(819),n=s.attributes.position,i=s.attributes.normal,r=s.attributes.uv,o=s.index.array;for(let a=0;a<34;a++){const c=new qe().compose(new C(t()-.5,.008+t()*.055,t()-.5),new bn().setFromEuler(new wn((t()-.5)*.45,t()*He,(t()-.5)*.4)),new C().setScalar(.46+t()*.4)),l=new $e().getNormalMatrix(c),h=e.p.length/3,u=new Me([15713413,14132846,13141329,13219961,15250549][a%5]);for(let f=0;f<n.count;f++)e.vertex(new C().fromBufferAttribute(n,f).applyMatrix4(c).toArray(),new C().fromBufferAttribute(i,f).applyMatrix3(l).normalize().toArray(),[r.getX(f),r.getY(f)],u.toArray());for(const f of o)e.i.push(h+f)}return s.dispose(),e.geometry()}function i1(s){const e=new Do(1,2),t=e.attributes.position,n=[];for(let r=0;r<t.count;r++){let o=t.getX(r),a=t.getY(r),c=t.getZ(r),l=1+Math.sin(o*11+c*4)*.12+Math.sin(c*7+a*6)*.12;t.setXYZ(r,o*l,a*l*.76,c*l);const h=new Me().setRGB(.7+Math.max(0,a)*.25,.74+Math.max(0,a)*.24,.57+Math.max(0,a)*.3);n.push(...h.toArray())}e.setAttribute("color",new Ye(n,3));const i=[];for(let r=0;r<t.count;r++)i.push(t.getX(r)*.6,t.getZ(r)*.6+t.getY(r)*.5);return e.setAttribute("uv",new Ye(i,2)),e.computeVertexNormals(),e}const Lc=Math.PI*2,au=(s,e)=>{let t=s-e;for(;t>Math.PI;)t-=Lc;for(;t<-Math.PI;)t+=Lc;return t};function cu(s,e,t,n,i){const r=[0,.16],o=[],a=150,c=i()*10;for(let h=0;h<=a;h++){const u=-Math.PI+h/a*Lc;let f=e,d=0;for(const[m,x,g]of s){const p=Math.abs(au(u,m))/g;if(p<1){const M=e+(x-e)*Math.pow(1-p,1.35);M>f&&(f=M,d=1-p)}}f*=1+n*Math.pow(Math.max(0,Math.sin(u*t+c)),2)*Math.min(1,d*3),Math.abs(au(u,Math.PI))<.25&&(f=Math.min(f,e*.7)),o.push(r[0]+f*Math.sin(u),r[1]-f*Math.cos(u))}const l=s.map(([h,u])=>[r[0],r[1],r[0]+.85*u*Math.sin(h),r[1]-.85*u*Math.cos(h)]);return{pts:o,veins:l,stem:[r[0],r[1],.02,.5]}}function ps(s,e,t){const o=[],a=[];for(let l=0;l<=90;l++){const h=l/90;a.push([s(h),.3+(-.5-.3)*h])}for(const[l,h]of a)o.push(l,h);for(let l=a.length-1;l>=0;l--)o.push(-a[l][0]*(.94+.06*t()),a[l][1]);const c=[[0,.3,0,-.5+.03]];for(let l=1;l<=e;l++){const h=(l-.4)/(e+.4),u=.3+(-.5-.3)*h,f=s(Math.min(1,h+.08))*.92;c.push([0,u,f,u+(-.5-.3)*.1],[0,u,-f,u+(-.5-.3)*.1])}return{pts:o,veins:c,stem:[0,.3,0,.5]}}function s1(s,e){switch(s){case"maple":{const t=()=>.92+.16*e();return cu([[0,.66*t(),.5],[1.05,.6*t(),.44],[-1.05,.6*t(),.44],[2,.34*t(),.4],[-2,.34*t(),.4]],.15,9,.12,e)}case"redmaple":{const t=()=>.92+.16*e();return cu([[0,.6*t(),.62],[.95,.5*t(),.55],[-.95,.5*t(),.55],[1.9,.22,.4],[-1.9,.22,.4]],.2,26,.06,e)}case"oak":{const t=3+Math.floor(e()*2),n=.25+e()*.2;return ps(i=>.34*Math.pow(Math.sin(Math.PI*Math.pow(i,.85)),.7)*(.5+.5*Math.pow(Math.abs(Math.cos(Math.PI*(t*i+n))),.6))+.012,t,e)}case"redoak":{const t=3+Math.floor(e()*2);return ps(n=>.36*Math.pow(Math.sin(Math.PI*Math.pow(n,.8)),.6)*(.3+.7*Math.pow(Math.abs(Math.cos(Math.PI*(t*n+.3))),2.6))+.014,t,e)}case"beech":return ps(t=>.24*Math.pow(Math.sin(Math.PI*t),.85)*(1+.035*Math.sin(t*Math.PI*22))+.004,8,e);case"birch":return ps(t=>.33*Math.pow(t+.02,.35)*Math.pow(1-t,.95)*1.75*(1+.05*Math.abs(Math.sin(t*Math.PI*16))),6,e);case"aspen":return ps(t=>.4*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.02)),.6)*(1+.03*Math.abs(Math.sin(t*Math.PI*14))),4,e);case"ginkgo":{const t=[0,.22],n=[t[0],t[1]],i=60;for(let o=0;o<=i;o++){const a=-.95+o/i*1.9;let c=.62*(1-.18*Math.abs(a))*(1+.025*Math.sin(a*40));c-=.2*Math.exp(-Math.pow(a/.06,2)),n.push(t[0]+c*Math.sin(a),t[1]-c*Math.cos(a))}const r=[];for(let o=-4;o<=4;o++){const a=o*.2;r.push([t[0],t[1],t[0]+.56*Math.sin(a),t[1]-.56*Math.cos(a)])}return{pts:n,veins:r,stem:[0,.22,0,.5]}}case"needle":default:return ps(t=>.03*Math.sin(Math.PI*t)+.004,0,e)}}function r1(s){const e=new Path2D,t=s.pts;e.moveTo(t[0],t[1]);for(let n=2;n<t.length;n+=2)e.lineTo(t[n],t[n+1]);return e.closePath(),e}function ml(s){let e=s>>>0;return()=>{e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}class o1{constructor(e){this.f=ml(e)}next(){return this.f()}range(e,t){return e+(t-e)*this.f()}int(e){return Math.floor(this.f()*e)}chance(e){return this.f()<e}pick(e){return e[Math.floor(this.f()*e.length)]}sign(){return this.f()<.5?-1:1}gauss(){let e=0;for(let t=0;t<4;t++)e+=this.f();return(e-2)*.866}}const Oi=new Uint8Array(512),go=new Float32Array(16),xo=new Float32Array(16);for(let s=0;s<16;s++){const e=s/16*Math.PI*2+.13;go[s]=Math.cos(e),xo[s]=Math.sin(e)}{const s=ml(20261016),e=Array.from({length:256},(t,n)=>n);for(let t=255;t>0;t--){const n=Math.floor(s()*(t+1)),i=e[t];e[t]=e[n],e[n]=i}for(let t=0;t<512;t++)Oi[t]=e[t&255]}const a1=.5*(Math.sqrt(3)-1),Qs=(3-Math.sqrt(3))/6;function c1(s,e){const t=(s+e)*a1,n=Math.floor(s+t),i=Math.floor(e+t),r=(n+i)*Qs,o=s-n+r,a=e-i+r,c=o>a?1:0,l=1-c,h=o-c+Qs,u=a-l+Qs,f=o-1+2*Qs,d=a-1+2*Qs,m=n&255,x=i&255;let g=0,p,M;return p=.5-o*o-a*a,p>0&&(M=Oi[m+Oi[x]]&15,p*=p,g+=p*p*(go[M]*o+xo[M]*a)),p=.5-h*h-u*u,p>0&&(M=Oi[m+c+Oi[x+l]]&15,p*=p,g+=p*p*(go[M]*h+xo[M]*u)),p=.5-f*f-d*d,p>0&&(M=Oi[m+1+Oi[x+1]]&15,p*=p,g+=p*p*(go[M]*f+xo[M]*d)),99*g}const Ic=["maple","redmaple","oak","beech","birch","aspen","ginkgo","japanese","spruce","pine","larch","sumac"],Vi=4,Dc=3,l1=512,h1=s=>Ic.indexOf(s),u1={maple:{leaf:"maple",size:.17,pairs:!0,nodes:7,twigs:6,petiole:.07,droop:.2},redmaple:{leaf:"redmaple",size:.15,pairs:!0,nodes:8,twigs:6,petiole:.06,droop:.15},oak:{leaf:"redoak",size:.19,pairs:!1,nodes:7,twigs:6,petiole:.025,droop:.1,whorl:!0},beech:{leaf:"beech",size:.13,pairs:!1,nodes:11,twigs:7,petiole:.012,droop:.12,flat:!0},birch:{leaf:"birch",size:.11,pairs:!1,nodes:11,twigs:8,petiole:.025,droop:.45},aspen:{leaf:"aspen",size:.11,pairs:!1,nodes:10,twigs:8,petiole:.05,droop:.25},ginkgo:{leaf:"ginkgo",size:.12,pairs:!1,nodes:10,twigs:7,petiole:.04,droop:.2,spur:!0},japanese:{leaf:"maple",size:.11,pairs:!0,nodes:9,twigs:8,petiole:.05,droop:.3,fine:!0},sumac:{leaf:"beech",size:.1,pairs:!0,nodes:12,twigs:6,petiole:0,droop:.35,compound:!0}};function lu(s){const e=document.createElement("canvas");return e.width=e.height=s,e.getContext("2d",{willReadFrequently:!0})}function Ao(s,e,t,n,i,r){const o=[];let a=s,c=e,l=t;for(let h=0;h<=r;h++)o.push([a,c,l]),l+=i/r,a+=Math.cos(l)*n/r,c+=Math.sin(l)*n/r;return o}function Tf(s,e,t,n,i){for(let r=1;r<t.length;r++){const o=n+(i-n)*(r/t.length);for(const[a,c]of[[s,"rgb(58,0,0)"],[e,"#fff"]])a.strokeStyle=c,a.lineWidth=o,a.lineCap="round",a.beginPath(),a.moveTo(t[r-1][0],t[r-1][1]),a.lineTo(t[r][0],t[r][1]),a.stroke()}}function f1(s,e,t,n,i,r,o,a,c){const{cc:l,cm:h}=s,u=e+Math.cos(n)*r*s.S,f=t+Math.sin(n)*r*s.S;if(r>0)for(const[b,y]of[[l,"rgb(74,0,0)"],[h,"#fff"]])b.strokeStyle=y,b.lineWidth=1.6,b.beginPath(),b.moveTo(e,t),b.lineTo(u,f),b.stroke();const d=i*s.S*(.82+.36*c()),m=n+Math.PI/2,x=u+Math.cos(n)*d*.5,g=f+Math.sin(n)*d*.5,p=.8+.2*c(),M=b=>b.setTransform(d*p*Math.cos(m),d*p*Math.sin(m),-d*Math.sin(m),d*Math.cos(m),x,g),v=.72+.28*c(),_=Math.round(255*c()),w=b=>Math.round(255*Math.min(1,b));M(l),l.fillStyle=`rgb(${w(v*.92)},${_},255)`,l.fill(a),c()<.6&&(l.save(),l.scale(.6,.72),l.translate((c()-.5)*.2,(c()-.5)*.2),l.fillStyle=`rgb(${w(v*1.05)},${_},255)`,l.fill(a),l.restore()),l.strokeStyle=`rgba(${w(v*.55)},${_},255,0.5)`,l.lineWidth=1.4/d,l.stroke(a),l.strokeStyle=`rgba(${w(v*.8)},${_},255,0.7)`,l.lineWidth=1.1/d,l.beginPath();for(const[b,y,A,T]of o.veins)l.moveTo(b,y),l.lineTo(A,T);l.stroke(),M(h),h.fillStyle="#fff",h.fill(a);for(const b of[l,h])b.setTransform(1,0,0,1,0,0)}function d1(s,e,t){const n=u1[e],i=s.S,r=[];for(let l=0;l<5;l++){const h=s1(n.leaf,t);r.push({sh:h,path:r1(h)})}const o=Ao(i*.5,i*.98,-Math.PI/2+(t()-.5)*.3,i*.86,(t()-.5)*.5,24),a=[o];for(let l=0;l<n.twigs;l++){const h=o[Math.floor(4+l/n.twigs*16+t()*2)],u=l%2?1:-1,f=h[2]+u*(.6+t()*.5);a.push(Ao(h[0],h[1],f,i*(.26+t()*.18)*(1-l/(n.twigs*1.6)),-u*(.2+t()*.4),12))}for(const l of a)Tf(s.cc,s.cm,l,l===o?i*.013:i*.008,i*.004);const c=[];for(const l of a){const h=l===o?n.nodes+2:n.nodes;for(let u=1;u<=h;u++){const f=Math.min(l.length-1,Math.floor(u/h*(l.length-1))),[d,m,x]=l[f],g=n.pairs?[-1,1]:[u%2?1:-1];for(const p of g){const M=n.compound?1.35:.75+t()*.6,v=x+p*M+n.droop*(t()-.3);c.push([d,m,v,u/h])}if(u===h&&c.push([d,m,x+(t()-.5)*.3,1]),n.spur&&t()<.6)for(let p=0;p<3;p++)c.push([d,m,x+(p-1)*.7+(t()-.5)*.4,u/h])}}c.sort((l,h)=>l[3]-h[3]);for(const[l,h,u,f]of c){const{sh:d,path:m}=r[Math.floor(t()*r.length)],x=n.size*(.75+.35*f);f1(s,l,h,u,x,n.petiole,d,m,t)}}function p1(s,e,t){const n=s.S,{cc:i,cm:r}=s,o=e==="spruce",a=e==="larch",c=Ao(n*.5,n*.99,-Math.PI/2+(t()-.5)*.2,n*.92,(t()-.5)*.3,30),l=[c],h=o?9:a?7:5;for(let u=0;u<h;u++){const f=c[Math.floor(3+u/h*24)];for(const d of[-1,1]){const m=n*(.32-.2*(u/h))*(.8+.4*t());l.push(Ao(f[0],f[1],f[2]+d*(.75+t()*.3),m,-d*.15,10))}}for(const u of l)Tf(i,r,u,u===c?n*.012:n*.006,n*.003);for(const u of l)for(let f=0;f<u.length;f++){const[d,m,x]=u[f];if(a){if(f%2)continue;const g=14;for(let p=0;p<g;p++){const M=x+(p/g-.5)*2.6+(t()-.5)*.3,v=n*(.035+.02*t());Ca(s,d,m,M,v,n*.004,t)}}else if(o)for(const g of[-1,1,-1,1]){const p=x+g*(.9+t()*.6),M=n*(.03+.015*t());Ca(s,d,m,p,M,n*.0055,t)}else{if(f<u.length-4)continue;for(let g=0;g<18;g++){const p=x+(g/18-.5)*2.2+(t()-.5)*.2,M=n*(.1+.04*t());Ca(s,d,m,p,M,n*.004,t)}}}}function Ca(s,e,t,n,i,r,o){const{cc:a,cm:c}=s,l=e+Math.cos(n)*i,h=t+Math.sin(n)*i,u=Math.round(255*(.65+.35*o())),f=Math.round(255*o());for(const[d,m]of[[a,`rgb(${u},${f},255)`],[c,"#fff"]])d.strokeStyle=m,d.lineWidth=r,d.lineCap="round",d.beginPath(),d.moveTo(e,t),d.lineTo(l,h),d.stroke()}function m1(s=3){const e=l1,t=e*Vi,n=e*Dc,i=new Uint8Array(t*n*4),r=ml(s);for(let a=0;a<Ic.length;a++){const c=Ic[a],l={S:e,cc:lu(e),cm:lu(e)};for(const m of[l.cc,l.cm])m.fillStyle="#000",m.fillRect(0,0,e,e);c==="spruce"||c==="pine"||c==="larch"?p1(l,c,r):d1(l,c,r);const h=l.cc.getImageData(0,0,e,e).data,u=l.cm.getImageData(0,0,e,e).data,f=a%Vi*e,d=Math.floor(a/Vi)*e;for(let m=0;m<e;m++)for(let x=0;x<e;x++){const g=(m*e+x)*4,p=((d+m)*t+f+x)*4,M=u[g],v=M>0?255/M:0;i[p]=Math.min(255,h[g]*v),i[p+1]=Math.min(255,h[g+1]*v),i[p+2]=h[g+2]*v>128?255:0,i[p+3]=M}}g1(i,t,n,6);const o=new Jc(i,t,n,fn);return o.flipY=!1,o.magFilter=on,o.minFilter=Vn,o.generateMipmaps=!0,o.anisotropy=4,o.colorSpace=ni,o.wrapS=o.wrapT=Pn,o.needsUpdate=!0,o}function g1(s,e,t,n){const i=new Uint8Array(s.length),r=new Uint8Array(e*t);for(let a=0;a<e*t;a++)r[a]=s[a*4+3]>0?1:0;const o=new Uint8Array(e*t);for(let a=0;a<n;a++){i.set(s),o.set(r);for(let c=1;c<t-1;c++){let l=c*e;for(let h=1;h<e-1;h++){if(l=c*e+h,r[l])continue;const u=r[l+1],f=r[l-1],d=r[l+e],m=r[l-e],x=u+f+d+m;if(!x)continue;let g=0,p=0,M=0;if(u){const _=(l+1)*4;g+=s[_],p+=s[_+1],M+=s[_+2]}if(f){const _=(l-1)*4;g+=s[_],p+=s[_+1],M+=s[_+2]}if(d){const _=(l+e)*4;g+=s[_],p+=s[_+1],M+=s[_+2]}if(m){const _=(l-e)*4;g+=s[_],p+=s[_+1],M+=s[_+2]}const v=l*4;i[v]=g/x,i[v+1]=p/x,i[v+2]=M/x,o[l]=1}}s.set(i),r.set(o)}}function gl(s,e=0,t=0){const n=s*.037-e*.004-t*.002,i=.42+.32*(.5+.5*Math.sin(n))+.26*Math.pow(.5+.5*Math.sin(n*2.73+1.9),3),r=.5+.5*Math.sin(s*.0057+Math.sin(s*.0019));return{gust:i,cloud:r,sun:1-r*.27}}const Ef={value:.65},hu="varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",x1=`
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
}`;class v1{constructor(e,t,n){this.renderer=e,this.camera=t,this.sun=n,this.target=new Dn(1,1,{type:li,depthBuffer:!1}),this.material=new Xt({vertexShader:hu,fragmentShader:x1,depthTest:!1,depthWrite:!1,uniforms:{depthTex:{value:null},shadowTex:{value:null},invProjection:{value:t.projectionMatrixInverse},cameraWorld:{value:t.matrixWorld},shadowMatrix:{value:n.shadow.matrix},cameraPos:{value:t.position},sunDirection:{value:new C},lightColor:{value:new Me},baseHeight:{value:0},density:{value:.003},enabled:{value:0}}}),this.scene=new bo,this.scene.add(new st(new Un(2,2),this.material)),this.postCamera=new Lo,this.exposureTargets=[0,1].map(()=>new Dn(1,1,{type:li,depthBuffer:!1})),this.exposureIndex=0,this.first=!0,this.lastTime=0,this.exposureMaterial=new Xt({vertexShader:hu,depthTest:!1,depthWrite:!1,uniforms:{sceneTex:{value:null},depthTex:{value:null},previous:{value:this.exposureTargets[0].texture},blend:{value:1}},fragmentShader:"uniform sampler2D sceneTex;uniform sampler2D depthTex;uniform sampler2D previous;uniform float blend;varying vec2 vUv;void main(){float sum=0.,weights=0.;for(int j=0;j<4;j++)for(int i=0;i<6;i++){vec2 uv=vec2(.12+float(i)*.152,.1+float(j)*.21);vec3 c=texture2D(sceneTex,uv).rgb;float w=texture2D(depthTex,uv).x>.99999?.15:1.;sum+=log(max(.004,dot(c,vec3(.2126,.7152,.0722))))*w;weights+=w;}float average=exp(sum/max(weights,1.));float target=clamp(pow(.16/average,.36),.9,1.5);float old=clamp(texture2D(previous,vec2(.5)).r,.9,1.5);gl_FragColor=vec4(mix(old,target,blend),0.,0.,1.);}"}),this.exposureScene=new bo,this.exposureScene.add(new st(new Un(2,2),this.exposureMaterial))}resize(e,t){this.target.setSize(Math.max(2,Math.round(e/2)),Math.max(2,Math.round(t/2)))}render(e,t,n,i){const r=this.material.uniforms;r.depthTex.value=e,r.shadowTex.value=this.sun.shadow.map?.texture,r.enabled.value=r.shadowTex.value?1:0,r.sunDirection.value.copy(t),r.lightColor.value.copy(this.sun.color).multiplyScalar(this.sun.intensity*.9),r.baseHeight.value=n,r.density.value=i,this.renderer.setRenderTarget(this.target),this.renderer.render(this.scene,this.postCamera)}adapt(e,t,n){const i=this.exposureMaterial.uniforms;return i.sceneTex.value=e,i.depthTex.value=t,i.previous.value=this.exposureTargets[this.exposureIndex].texture,i.blend.value=this.first?1:1-Math.exp(-Math.max(0,Math.min(.15,n-this.lastTime))*1.1),this.exposureIndex=1-this.exposureIndex,this.renderer.setRenderTarget(this.exposureTargets[this.exposureIndex]),this.renderer.render(this.exposureScene,this.postCamera),this.first=!1,this.lastTime=n,this.exposureTargets[this.exposureIndex].texture}}function Ht(s,e){const t=-e-225+Math.sin(s*.003)*100+Math.sin(s*.008+Math.sin(e*.004)*1.2)*46+Math.sin(s*.0012+e*.0027)*35;return ot(-60,400,t)}function Ai(s,e){const t=Ht(s,e),n=.5+.25*Math.sin(s*.11+Math.sin(e*.061)*2)+.25*Math.sin(e*.13+s*.032);return ot(.25,.65,t+(n-.5)*.24)}function Er(s,e){const t=Ht(s,e),n=Ai(s,e),i=.5+.5*Math.sin(s*.021+Math.sin(e*.017)*1.7);return{cold:t,cover:n,exposure:i,powder:n*(.12+.24*(1-i)),name:t<.08?"autumn":t<.75?"first snow":"winter"}}const zo=`
float forestCold(vec2 p){if(p.y>16.)return 0.;if(p.y< -806.)return 1.;float latitude=-p.y-225.+sin(p.x*.003)*100.+sin(p.x*.008+sin(p.y*.004)*1.2)*46.+sin(p.x*.0012+p.y*.0027)*35.;return smoothstep(-60.,400.,latitude);}
float forestSnow(vec2 p){float cold=forestCold(p);if(cold<.13)return 0.;if(cold>.77)return 1.;float snowPattern=.5+.25*sin(p.x*.11+sin(p.y*.061)*2.)+.25*sin(p.y*.13+p.x*.032);return smoothstep(.25,.65,cold+(snowPattern-.5)*.24);}
`;function xs(s,e="solid"){const t=s.onBeforeCompile,n=s.customProgramCacheKey(),i=e==="deciduous"||e==="retained";return s.onBeforeCompile=r=>{t(r),r.vertexShader="varying vec3 vWinterWorld; varying vec3 vWinterNormal;"+(i?"attribute vec2 aLeaf;varying float vWinterLeaf;":"")+`
`+r.vertexShader,r.vertexShader=r.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
   mat4 winterMatrix=modelMatrix;
   #ifdef USE_INSTANCING
   winterMatrix=modelMatrix*instanceMatrix;
   #endif
   vWinterWorld=(winterMatrix*vec4(position,1.)).xyz;
   vWinterNormal=normalize(mat3(winterMatrix)*normal);
   ${i?"vWinterLeaf=aLeaf.y;":""}
  `),r.fragmentShader=zo+"varying vec3 vWinterWorld;varying vec3 vWinterNormal;"+(i?"varying float vWinterLeaf;":"")+`
`+r.fragmentShader,r.fragmentShader=r.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
   ${e==="retained"?"if(vWinterLeaf<.83)discard;":e==="deciduous"?"if(vWinterLeaf<smoothstep(.16,.78,forestCold(vWinterWorld.xz))*.998)discard;":""}
  `),r.fragmentShader=r.fragmentShader.replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
   float coldCover=forestSnow(vWinterWorld.xz);
   float snowFacing=smoothstep(${e==="needle"?".02,.62":".38,.82"},vWinterNormal.y);
   float snowPatch=coldCover>.01?.84+.16*sin(vWinterWorld.x*3.7+sin(vWinterWorld.z*4.1)):1.;
   float coating=coldCover*snowFacing*snowPatch*${e==="needle"?".64":"1."};
   ${e==="plant"?"float winterFade=forestCold(vWinterWorld.xz);float faded=dot(diffuseColor.rgb,vec3(.3,.5,.2));diffuseColor.rgb=mix(diffuseColor.rgb,faded*vec3(1.10,.95,.73),winterFade*.88);":""}
   ${e==="needle"?"diffuseColor.rgb*=1.-forestCold(vWinterWorld.xz)*.42;":""}
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.73,.83,.89),coating*.96);
   roughnessFactor=mix(roughnessFactor,.84,coating);
  `)},s.customProgramCacheKey=()=>n+"-winter-"+e,s}function uu(s,e=!1){const t=new hf({depthPacking:ku,map:s.map,alphaMap:s.alphaMap,alphaTest:s.alphaTest,side:Et});return t.onBeforeCompile=n=>{n.vertexShader=`attribute vec2 aLeaf;varying float vWinterLeaf;varying vec2 vWinterXZ;
`+n.vertexShader,n.vertexShader=n.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
   vec4 winterP=vec4(position,1.);
   #ifdef USE_INSTANCING
   winterP=instanceMatrix*winterP;
   #endif
   vWinterXZ=(modelMatrix*winterP).xz;vWinterLeaf=aLeaf.y;
  `),n.fragmentShader=zo+`varying float vWinterLeaf;varying vec2 vWinterXZ;
`+n.fragmentShader,n.fragmentShader=n.fragmentShader.replace("#include <alphatest_fragment>",`#include <alphatest_fragment>
if(vWinterLeaf<${e?".83":"smoothstep(.16,.78,forestCold(vWinterXZ))*.998"})discard;`)},t}const Pa=[15250492,13072418,12469534,15125079,10301216,13404964,8491076,14000971],en={time:{value:0},player:{value:new C},sun:{value:new C(-.65,.5,.3).normalize()}},La={active:!1};function xl(s){const e=new Io(s);return e.colorSpace=Ut,e.anisotropy=8,e}function _1(s,e){if(s.beginPath(),e===0)[[0,-1],[.14,-.61],[.36,-.76],[.34,-.43],[.73,-.57],[.57,-.21],[.95,-.18],[.67,.07],[.78,.29],[.38,.25],[.32,.55],[.09,.48],[0,.77],[-.09,.48],[-.32,.55],[-.38,.25],[-.78,.29],[-.67,.07],[-.95,-.18],[-.57,-.21],[-.73,-.57],[-.34,-.43],[-.36,-.76],[-.14,-.61]].forEach((n,i)=>i?s.lineTo(...n):s.moveTo(...n));else if(e===1){s.moveTo(0,-1);for(let t=0;t<=24;t++){let n=t/24*Math.PI;const i=Math.sin(n)*(.74+t%2*.07);s.lineTo(i,-Math.cos(n))}for(let t=24;t>=0;t--){let n=t/24*Math.PI;const i=Math.sin(n)*(.74+t%2*.07);s.lineTo(-i,-Math.cos(n))}}else{s.moveTo(0,-1);for(let t=0;t<=18;t++){const n=t/18*Math.PI;s.lineTo(Math.sin(n)*(.56+.17*Math.cos(n*12)),-Math.cos(n))}for(let t=18;t>=0;t--){const n=t/18*Math.PI;s.lineTo(-Math.sin(n)*(.56+.17*Math.cos(n*12)),-Math.cos(n))}}s.closePath()}function Ia(s,e,t,n,i,r,o,a=0){s.save(),s.translate(e,t),s.rotate(i),s.scale(n,n);const c=66+o()*19+a,l=44+o()*13,h=s.createLinearGradient(-.6,-.6,.7,.8);h.addColorStop(0,`hsl(${l},55%,${c+8}%)`),h.addColorStop(.48,`hsl(${l-3},61%,${c}%)`),h.addColorStop(1,`hsl(${l-9},54%,${c-19}%)`),_1(s,r),s.fillStyle=h,s.fill(),s.save(),s.clip();for(let u=0;u<18;u++)s.beginPath(),s.ellipse(o()*1.7-.85,o()*1.7-.85,.012+o()*.09,.01+o()*.045,o()*He,0,He),s.fillStyle=`rgba(72,48,18,${o()*.13})`,s.fill();s.lineWidth=.019,s.strokeStyle="rgba(78,54,20,.3)",s.beginPath(),s.moveTo(0,.95),s.lineTo(0,-.96);for(let u=0;u<7;u++){let f=.55-u*.22;s.moveTo(0,f),s.lineTo(.6-Math.abs(f)*.2,f-.35),s.moveTo(0,f),s.lineTo(-(.6-Math.abs(f)*.2),f-.35)}s.stroke(),s.lineWidth=.008,s.strokeStyle="rgba(255,240,157,.42)",s.beginPath(),s.moveTo(.02,.9),s.lineTo(.02,-.94),s.stroke(),s.restore(),s.lineWidth=.025,s.strokeStyle="#877248",s.beginPath(),s.moveTo(0,.6),s.quadraticCurveTo(.05,.9,.07,1.08),s.stroke(),s.restore()}function y1(){const s=document.createElement("canvas");s.width=2048,s.height=1024;const e=s.getContext("2d"),t=Fn(221);for(let n=0;n<4;n++){const i=n%2*1024,r=Math.floor(n/2)*512;if(e.save(),e.translate(i,r),n<3){e.strokeStyle="#695333",e.lineCap="round";for(let o=0;o<9;o++){const a=90+o*93,c=365-Math.sin(o/8*Math.PI)*190;e.lineWidth=3.3,e.beginPath(),e.moveTo(500,490),e.quadraticCurveTo(500,250,a,c-75),e.stroke();for(let l=0;l<13;l++){const h=l/13,u=500+(a-500)*h+(t()-.5)*105,f=470+(c-470)*h+(t()-.5)*94;Ia(e,u,f,21+t()*21,t()*He,n,t)}}for(let o=0;o<36;o++){let a=t()*He,c=Math.sqrt(t());Ia(e,510+Math.cos(a)*c*455,240+Math.sin(a)*c*195,18+t()*26,t()*He,n,t)}}else for(let o=0;o<8;o++)Ia(e,90+o*118,250,65+o%3*8,(t()-.5)*.8,o%3,t);e.restore()}return xl(s)}function M1(){const s=document.createElement("canvas");s.width=512,s.height=1024;const e=s.getContext("2d"),t=Fn(720631),n=e.createImageData(512,1024);for(let r=0;r<1024;r++)for(let o=0;o<512;o++){const a=(r*512+o)*4,c=Math.sin(o*.051)*3+Math.sin(o*.147+r*.003)*1.6,l=(t()-.5)*12,h=Math.sin(r*.15+o*.014)*1.7,u=204+c+l+h;n.data[a]=u+5,n.data[a+1]=u+3,n.data[a+2]=u-5,n.data[a+3]=255}e.putImageData(n,0,0);for(let r=0;r<65;r++){const o=t()*512,a=t()*1024,c=10+t()*68,l=3+t()*19,h=e.createRadialGradient(o,a,0,o,a,c);h.addColorStop(0,`rgba(118,103,77,${.03+t()*.065})`),h.addColorStop(1,"rgba(118,103,77,0)"),e.fillStyle=h,e.save(),e.translate(o,a),e.scale(1,l/c),e.translate(-o,-a),e.fillRect(o-c,a-c,c*2,c*2),e.restore()}for(let r=0;r<1050;r++){const o=t()*512,a=t()*1024,c=2+Math.pow(t(),3)*42,l=.35+t()*1.8;e.strokeStyle=`rgba(53,50,41,${.18+t()*.42})`,e.lineWidth=l,e.beginPath(),e.moveTo(o,a),e.quadraticCurveTo(o+c*.5,a+(t()-.5)*2.8,o+c,a+(t()-.5)*1.4),e.stroke(),c>18&&(e.strokeStyle="rgba(245,240,220,.54)",e.lineWidth=.9,e.beginPath(),e.moveTo(o+1,a+l+1),e.lineTo(o+c*.82,a+l+1),e.stroke())}for(let r=0;r<23;r++){const o=t()*512,a=t()*1024,c=13+t()*37,l=3+t()*7;e.beginPath(),e.moveTo(o-c,a);for(let h=1;h<=8;h++){const u=h/8;e.lineTo(o-c+u*c*2,a-Math.sin(u*Math.PI)*l*(.45+t()*.6))}for(let h=7;h>=0;h--){const u=h/8;e.lineTo(o-c+u*c*2,a+Math.sin(u*Math.PI)*l*(.24+t()*.36))}e.closePath(),e.fillStyle=`rgba(38,37,32,${.72+t()*.21})`,e.fill(),e.strokeStyle="rgba(237,234,216,.87)",e.lineWidth=1.2,e.stroke(),e.beginPath(),e.moveTo(o-c*.8,a+l*.9),e.quadraticCurveTo(o,a+l*1.6,o+c*.8,a+l*.6),e.strokeStyle="rgba(129,118,94,.53)",e.lineWidth=.8,e.stroke()}const i=xl(s);return i.wrapS=i.wrapT=ci,i.repeat.set(1,2),i}function w1(){const s=document.createElement("canvas");s.width=s.height=256;const e=s.getContext("2d"),t=Fn(3842);e.fillStyle="#a5946c",e.fillRect(0,0,256,256);for(let n=0;n<15e3;n++)e.fillStyle=`rgba(45,35,20,${t()*.14})`,e.fillRect(t()*256,t()*256,1+t()*2,1+t()*2);for(let n=0;n<47;n++){e.beginPath();for(let i=0;i<=120;i++){const r=i/120*He,o=n*2.8+Math.sin(r*3+n*.09)*2+Math.sin(r*7)*.6,a=124+Math.cos(r)*o,c=132+Math.sin(r)*o*.96;i?e.lineTo(a,c):e.moveTo(a,c)}e.strokeStyle=`rgba(62,43,22,${.13+t()*.2})`,e.lineWidth=.4+t()*.7,e.stroke()}for(let n=0;n<5;n++){const i=t()*He;e.strokeStyle="rgba(39,28,17,.6)",e.lineWidth=.4+t(),e.beginPath(),e.moveTo(128+Math.cos(i)*128,128+Math.sin(i)*128),e.lineTo(128+Math.cos(i+.04)*75,128+Math.sin(i+.04)*75),e.lineTo(128+Math.cos(i-.02)*49,128+Math.sin(i-.02)*49),e.stroke()}return xl(s)}function yi(s,e=.1,t=!1,n=!1){return s.onBeforeCompile=i=>{i.uniforms.uWind=Ef,i.uniforms.uTime=en.time,i.uniforms.uPlayer=en.player,i.uniforms.uSun=en.sun,i.vertexShader=`uniform float uWind;uniform float uTime; uniform vec3 uPlayer; varying vec3 vForestWorld;
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
#include <opaque_fragment>`)},s.customProgramCacheKey=()=>`forest-${e}-${t}-${n}`,s}async function b1(s){const e=new pf,t="./textures/",n=new y_,i=n.loadAsync("./models/fern/fern.gltf"),r=n.loadAsync("./models/grass/grass.gltf"),o=n.loadAsync("./models/rocks/rocks-game.glb"),a=n.loadAsync("./models/cliff/cliff.gltf"),c=new Map,l=(te,U=!0)=>(c.has(te)||c.set(te,e.loadAsync(t+te).then(ie=>(U&&(ie.colorSpace=Ut),ie.wrapS=ie.wrapT=ci,ie.anisotropy=Math.min(12,s.capabilities.getMaxAnisotropy()),ie))),c.get(te)),[h,u,f,d,m,x,g,p,M,v,_]=await Promise.all([l("floor.jpg"),l("floor-normal.jpg",!1),l("bark.jpg"),l("bark-normal.jpg",!1),l("rock.jpg"),l("rock-normal.jpg",!1),l("moss.jpg"),l("floor-height.png",!1),l("floor-ao.jpg",!1),l("cliff.jpg"),l("cliff-normal.jpg",!1),l("leafy_grass.jpg"),l("leafy_grass-normal.jpg",!1),l("rocky_trail_02.jpg"),l("rocky_trail_02-normal.jpg",!1),l("dry_riverbed_rock.jpg"),l("dry_riverbed_rock-normal.jpg",!1),l("october-leaf-sprays.png"),l("fir-twig_diff.jpg"),l("fir-twig_alpha.png",!1),l("fir-twig_nor_gl.jpg",!1),l("fern-alpha.png",!1),l("fallen-maple-v1.png"),l("snow.jpg"),l("snow-normal.jpg",!1)]);p.anisotropy=2,M.anisotropy=4,u.anisotropy=4,v.anisotropy=4,_.anisotropy=4;const w=y1();w.anisotropy=8;const b=m1();b.anisotropy=8;const[y,A,T,S,L,D]=await Promise.all([l("leafy_grass.jpg"),l("leafy_grass-normal.jpg",!1),l("rocky_trail_02.jpg"),l("rocky_trail_02-normal.jpg",!1),l("dry_riverbed_rock.jpg"),l("dry_riverbed_rock-normal.jpg",!1)]),[z,N]=await Promise.all([l("snow.jpg"),l("snow-normal.jpg",!1)]),F=new Dt({map:h,normalMap:u,normalScale:new le(.65,.65),roughness:.95,vertexColors:!0});F.onBeforeCompile=te=>{Object.assign(te.uniforms,{snowMap:{value:z},snowNormal:{value:N},meadowMap:{value:y},meadowN:{value:A},pathMap:{value:T},pathN:{value:S},pebbleMap:{value:L},pebbleN:{value:D},mossMap:{value:g},heightMap:{value:p},groundAO:{value:M},cliffMap:{value:v},cliffNormal:{value:_}}),te.vertexShader=`attribute vec4 seasonTone;varying vec4 vSeasonTone;attribute vec4 habitat;attribute float groundDrift;varying float vDrift; varying vec4 vHabitat;varying vec3 vGround; varying vec3 vTerrainNormal;
`+te.vertexShader,te.vertexShader=te.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
vSeasonTone=seasonTone;vGround=position; vTerrainNormal=normal; vHabitat=habitat;vDrift=groundDrift;`),te.fragmentShader=zo+`uniform sampler2D snowMap;uniform sampler2D snowNormal;varying vec4 vSeasonTone;varying float vDrift;varying vec4 vHabitat;uniform sampler2D meadowMap;uniform sampler2D meadowN;uniform sampler2D pathMap;uniform sampler2D pathN;uniform sampler2D pebbleMap;uniform sampler2D pebbleN;varying vec3 vGround;varying vec3 vTerrainNormal;uniform sampler2D mossMap;uniform sampler2D heightMap;uniform sampler2D groundAO;uniform sampler2D cliffMap;uniform sampler2D cliffNormal;
`+te.fragmentShader,te.fragmentShader=te.fragmentShader.replace("#include <map_fragment>",`
      vec2 forestUV=vMapUv;
      vec3 worldView=normalize(cameraPosition-vGround);
      vec3 surfaceN=normalize(vTerrainNormal);
      float cliffAmount=smoothstep(.2,.68,1.-surfaceN.y)*(1.-smoothstep(.03,.15,vDrift)*smoothstep(.25,.55,surfaceN.y));
      if(distance(cameraPosition,vGround)<17. && cliffAmount<.3 && forestSnow(vGround.xz)<.9){
        vec3 dp1=dFdx(vGround),dp2=dFdy(vGround);vec2 duv1=dFdx(vMapUv),duv2=dFdy(vMapUv);
        vec3 T=normalize(dp1*duv2.y-dp2*duv1.y),B=normalize(-dp1*duv2.x+dp2*duv1.x);
        vec2 shift=vec2(dot(worldView,T),dot(worldView,B))/max(.23,dot(worldView,surfaceN))*.019/9.;
        float layer=0.;for(int i=0;i<9;i++){if(layer>=1.-texture2D(heightMap,forestUV).r)break;forestUV-=shift;layer+=1./9.;}
      }
      vec3 weights=pow(abs(surfaceN),vec3(4.));weights/=dot(weights,vec3(1.));
      float snow=forestSnow(vGround.xz)*smoothstep(.38,.85,surfaceN.y);
      vec3 soil=vec3(0.);
      if(snow<.999){
      vec3 leafColor=texture2D(map,forestUV).rgb;float leafLum=dot(leafColor,vec3(.2126,.7152,.0722));
      leafColor=mix(leafColor,leafLum*vec3(1.65,1.03,.43),.52);
      leafColor=mix(leafColor,leafLum*vec3(1.44,1.09,.46),vSeasonTone.x*.73);
      leafColor=mix(leafColor,leafLum*vec3(1.48,.75,.38),vSeasonTone.y*.37);
      leafColor=mix(leafColor,leafLum*vec3(1.08,.9,.64),vSeasonTone.z*.38);
      float occlusion=mix(.62,1.,texture2D(groundAO,forestUV).r);
      float patches=sin(vGround.x*.12+sin(vGround.z*.083)*2.)*sin(vGround.z*.15+sin(vGround.x*.11));
      vec3 green=texture2D(mossMap,vGround.xz*.5).rgb;
      leafColor=mix(leafColor,green,smoothstep(.48,.9,patches)*(.4+vSeasonTone.w*.35));

      vec3 rockColor=leafColor;if(cliffAmount>.01)rockColor=texture2D(cliffMap,vGround.yz*.3).rgb*weights.x+texture2D(cliffMap,vGround.xz*.3).rgb*weights.y+texture2D(cliffMap,vGround.xy*.3).rgb*weights.z;
      soil=mix(leafColor*occlusion,texture2D(meadowMap,vGround.xz*.24).rgb*vec3(.85,.87,.61),vHabitat.x);
      soil=mix(soil,texture2D(pebbleMap,vGround.xz*.5).rgb,vHabitat.z*.85);
      soil=mix(soil,texture2D(pathMap,vGround.xz*.4).rgb,vHabitat.y*.93);
      rockColor*=vec3(.68,.8,.76);rockColor=mix(rockColor,green*.7,vHabitat.z*.22);
      soil=mix(soil,rockColor,max(cliffAmount,vHabitat.w*.25));
      }
      if(snow>.001){
       vec3 snowTex=texture2D(snowMap,vGround.xz*.48).rgb;
       snowTex=mix(snowTex,vec3(dot(snowTex,vec3(.333))),.8)*vec3(.85,.96,1.02);
       snowTex*=.92+.08*sin(vGround.x*.31+sin(vGround.z*.23)*1.5);
       soil=mix(soil,snowTex,snow);
      }
      diffuseColor.rgb*=soil;
    `),te.fragmentShader=te.fragmentShader.replace("#include <roughnessmap_fragment>",`#include <roughnessmap_fragment>
roughnessFactor=mix(roughnessFactor,.91,snow);`),te.fragmentShader=te.fragmentShader.replace("#include <normal_fragment_maps>",`if(snow<.999){
`+Qe.normal_fragment_maps.replaceAll("vNormalMapUv","forestUV")+`
      vec3 detailN=texture2D(meadowN,vGround.xz*.24).xyz*2.-1.;detailN=mix(detailN,texture2D(pebbleN,vGround.xz*.5).xyz*2.-1.,vHabitat.z);detailN=mix(detailN,texture2D(pathN,vGround.xz*.4).xyz*2.-1.,vHabitat.y);
      vec3 dn=normalize(surfaceN+vec3(detailN.x,0.,detailN.y)*.5);normal=normalize(mix(normal,mat3(viewMatrix)*dn,max(vHabitat.x,max(vHabitat.z,vHabitat.y))));
      if(cliffAmount>.01){vec3 nx=texture2D(cliffNormal,vGround.yz*.3).xyz*2.-1.,ny=texture2D(cliffNormal,vGround.xz*.3).xyz*2.-1.,nz=texture2D(cliffNormal,vGround.xy*.3).xyz*2.-1.;
      vec3 stoneN=normalize(vec3(nx.z*sign(surfaceN.x),nx.x,nx.y)*weights.x+vec3(ny.x,ny.z*sign(surfaceN.y),ny.y)*weights.y+vec3(nz.x,nz.y,nz.z*sign(surfaceN.z))*weights.z);
      normal=normalize(mix(normal,mat3(viewMatrix)*stoneN,cliffAmount*.85));}
      }
      if(snow>.001){vec3 snowN=texture2D(snowNormal,vGround.xz*.48).xyz*2.-1.;
      normal=normalize(mix(normal,mat3(viewMatrix)*normalize(surfaceN+vec3(snowN.x,0.,snowN.y)*.48),snow));}

    `)};const V=new Dt({map:f,normalMap:d,normalScale:new le(.9,.9),color:15853515,roughness:1,vertexColors:!0}),G=M1(),B=new Dt({map:G,bumpMap:G,bumpScale:.012,roughness:.94,vertexColors:!0}),$=yi(new Dt({map:b,alphaTest:.28,side:Et,roughness:.9,metalness:0,vertexColors:!0}),.14,!0),fe=$.onBeforeCompile;$.onBeforeCompile=te=>{fe(te),te.fragmentShader=te.fragmentShader.replace("#include <map_fragment>",`#ifdef USE_MAP
      vec4 leafSample=texture2D(map,vMapUv);float shade=.52+leafSample.r*.78;vec3 pigment=mix(vec3(.22,.14,.065),vec3(shade),smoothstep(.2,.8,leafSample.b));pigment*=mix(vec3(.83,.91,.72),vec3(1.14,1.,.78),leafSample.g);diffuseColor*=vec4(pigment,leafSample.a);
      #endif`)},$.customProgramCacheKey=()=>"botanical-season-v4",$.alphaToCoverage=!0;const ce=await l("october-leaf-sprays.png");ce.wrapS=ce.wrapT=Pn;const Re=yi(new Dt({map:ce,bumpMap:ce,bumpScale:.025,alphaTest:.42,side:Et,roughness:.91,vertexColors:!0}),.12,!0);Re.alphaToCoverage=!0;const Je=Re.onBeforeCompile;Re.onBeforeCompile=te=>{Je(te),te.fragmentShader=te.fragmentShader.replace("#include <map_fragment>","vec4 texel=texture2D(map,vMapUv);float lum=dot(texel.rgb,vec3(.2126,.7152,.0722));vec3 pigment=mix(texel.rgb,vec3(.12+sqrt(max(0.,lum))*.72),.92);diffuseColor*=vec4(pigment,texel.a);")},Re.customProgramCacheKey=()=>"october-photographic-sprays";const[ct,tt,K]=await Promise.all([l("fir-twig_diff.jpg"),l("fir-twig_alpha.png",!1),l("fir-twig_nor_gl.jpg",!1)]),ne=yi(new Dt({map:ct,alphaMap:tt,normalMap:K,normalScale:new le(.7,.7),alphaTest:.36,alphaToCoverage:!0,side:Et,roughness:.94,vertexColors:!0}),.065,!0),Se=ne.onBeforeCompile;ne.onBeforeCompile=te=>{Se(te),te.fragmentShader=te.fragmentShader.replace("#include <map_fragment>","vec4 texel=texture2D(map,vMapUv);float lum=dot(texel.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb*=mix(texel.rgb,vec3(lum)*1.75,.92)*3.4;")},ne.customProgramCacheKey=()=>"scanned-conifer-needles";const Le=await i;Le.scene.updateMatrixWorld(!0);let Te;Le.scene.traverse(te=>{te.isMesh&&!Te&&(Te=te)});const Ze=Te.geometry.clone().applyMatrix4(Te.matrixWorld);Ze.computeBoundingBox();const ft=Ze.boundingBox,I=ft.getSize(new C),se=ft.getCenter(new C);Ze.translate(-se.x,-ft.min.y,-se.z),Ze.scale(1/I.y,1/I.y,1/I.y);const Z=yi(Te.material.clone(),.12,!0,!0);Z.color.setRGB(2.1,2.1,1.65),Z.roughness=1,Z.side=Et,Z.normalScale.set(.55,.55),Z.alphaMap=await l("fern-alpha.png",!1),Z.alphaMap.flipY=!1,Z.alphaTest=.45;const J=new Dt({map:m,normalMap:x,normalScale:new le(.8,.8),roughness:.97,vertexColors:!0});J.onBeforeCompile=te=>{te.vertexShader=`varying vec3 vStone; varying vec3 vStoneNormal;
`+te.vertexShader,te.vertexShader=te.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
    mat4 stoneMatrix=modelMatrix;
    #ifdef USE_INSTANCING
    stoneMatrix=modelMatrix*instanceMatrix;
    #endif
    vStone=(stoneMatrix*vec4(position,1.)).xyz;vStoneNormal=normalize(mat3(stoneMatrix)*normal);
  `),te.fragmentShader=`varying vec3 vStone; varying vec3 vStoneNormal;
`+te.fragmentShader,te.fragmentShader=te.fragmentShader.replace("#include <map_fragment>",`vec3 weights=pow(abs(vStoneNormal),vec3(4.));weights/=dot(weights,vec3(1.));
    vec3 triplanar=texture2D(map,vStone.yz*.38).rgb*weights.x+texture2D(map,vStone.xz*.38).rgb*weights.y+texture2D(map,vStone.xy*.38).rgb*weights.z;
    diffuseColor.rgb*=triplanar;`)};const Q=new Dt({map:w1(),roughness:.97,side:Et}),me=new Dt({map:f,normalMap:d,color:7563856,roughness:1}),he=await l("fallen-maple-v1.png");he.wrapS=he.wrapT=Pn;const ge=new Dt({map:he,alphaTest:.38,side:Et,roughness:.96,vertexColors:!0});ge.onBeforeCompile=te=>{te.fragmentShader=te.fragmentShader.replace("#include <map_fragment>","vec4 texel=texture2D(map,vMapUv);float lum=dot(texel.rgb,vec3(.2126,.7152,.0722));diffuseColor*=vec4(mix(texel.rgb,vec3(.12+sqrt(max(lum,0.))*.78),.88),texel.a);")};const Xe=new Dt({color:10636328,roughness:.88,vertexColors:!0}),Be=new Dt({map:v,normalMap:_,normalScale:new le(.9,.9),roughness:.87,vertexColors:!0}),P=await r;P.scene.updateMatrixWorld(!0);const E=[],H=await e.loadAsync("./models/grass/alpha.png");H.flipY=!1;let q=0;P.scene.traverse(te=>{if(!te.isMesh)return;const U=q++;if(![0,6].includes(U))return;const ie=te.geometry.clone().applyMatrix4(te.matrixWorld);ie.computeBoundingBox();const oe=ie.boundingBox,_e=oe.getCenter(new C),ae=oe.max.y-oe.min.y;ie.translate(-_e.x,-oe.min.y,-_e.z);const ee=.48;ie.scale(ee/ae,ee/ae,ee/ae);const we=yi(te.material.clone(),.18,!0,!0);we.map=te.material.map,we.alphaMap=H,we.alphaTest=.42,we.side=Et,we.roughness=1,we.color.setRGB(2.3,2.25,1.75),we.emissive.set(2698515),we.emissiveIntensity=.22,we.aoMap=null,we.normalScale?.set(.55,.55),E.push({geometry:ie,material:we})});const re=E[0].material;for(let te=0;te<2;te++){const U=new hi,ie=te===0?[.2,.91,.5,.745]:[.57,.9,.83,.747];for(let _e=0;_e<3;_e++)U.plane([0,.28,0],1.15,.56,_e*Math.PI/3,.06,ie,[1,1,1]);const oe=re.clone();yi(oe,.18,!0,!0),oe.normalMap=null,oe.color.setRGB(2.3,2.25,1.75),oe.emissive.set(2698515),oe.emissiveIntensity=.22,oe.aoMap=null,E.push({geometry:U.geometry(),material:oe})}const j=yi(new Dt({color:16777215,side:Et,vertexColors:!0,roughness:1}),.25,!0,!0),Ie=new an(1,10,6,0,Math.PI*2,0,Math.PI*.5),pe=await o;pe.scene.updateMatrixWorld(!0);const Ae=[];pe.scene.traverse(te=>{if(!te.isMesh)return;const U=te.geometry.clone().applyMatrix4(te.matrixWorld);U.computeBoundingBox();const ie=U.boundingBox,oe=ie.getCenter(new C),_e=ie.getSize(new C),ae=1/Math.max(_e.x,_e.z);U.translate(-oe.x,-ie.min.y,-oe.z),U.scale(ae,ae,ae);const ee=te.material.clone();ee.roughness=.94,ee.normalScale?.set(.8,.8),U.computeBoundingBox(),Ae.push({geometry:U,material:ee,height:U.boundingBox.max.y})});const Ce=await a;Ce.scene.updateMatrixWorld(!0);let ue;Ce.scene.traverse(te=>{if(!te.isMesh||ue)return;const U=te.geometry.clone().applyMatrix4(te.matrixWorld);U.rotateX(.62),U.computeBoundingBox();const ie=U.boundingBox,oe=ie.getSize(new C),_e=ie.getCenter(new C);U.translate(-_e.x,-ie.min.y,-ie.max.z),U.scale(1/oe.y,1/oe.y,1/oe.y);const ae=te.material.clone();ae.roughness=.88,ae.normalScale?.set(.85,.85),ue={geometry:U,material:ae,width:oe.x/oe.y,depth:oe.z/oe.y}});const xe=Re.clone();xe.onBeforeCompile=Re.onBeforeCompile,xe.customProgramCacheKey=Re.customProgramCacheKey,xs(xe,"retained"),xe.userData.winterDepth=uu(xe,!0);const ze=ne.clone();ze.onBeforeCompile=ne.onBeforeCompile,ze.customProgramCacheKey=ne.customProgramCacheKey;for(const te of[$,Re,ze])xs(te,"deciduous"),te.userData.winterDepth=uu(te);xs(ne,"needle");for(const te of[V,B,J,me,Q,Be,...Ae.map(U=>U.material),ue.material])xs(te);for(const te of[Z,j,...E.map(U=>U.material)])xs(te,"plant");const Ne=new Dt({map:z,normalMap:N,normalScale:new le(.27,.27),color:14609909,emissive:5399928,emissiveIntensity:.16,roughness:.87}),ve=new Nn({color:9024710,roughness:.19,metalness:.1,clearcoat:.8,clearcoatRoughness:.14});return{retainedLeaf:xe,snowCap:Ne,ice:ve,larch:ze,cliffPart:ue,needle:ne,grassParts:E,grass:j,shelfGeometry:Ie,ground:F,trunk:V,birch:B,leaf:$,leafPhoto:Re,fern:Z,fernGeometry:Ze,rockParts:Ae,stone:J,wood:me,cutWood:Q,fallen:ge,mushroomCap:Xe,atlas:w,cliffFace:Be}}const oo=[["blueice","The blue tarn",1,32,"pond"],["spruceisland","Spruce island",3,33,"island"],["snowbirch","The white colonnade",1,30,"grove"],["frostwillows","Willows in hoarfrost",1,25,"grove"],["sprucehall","The snow vault",3,28,"aisle"],["pinebowl","The sheltered pines",3,31,"bowl"],["larchghosts","Bare larch ridge",5,30,"ridge"],["redrowan","Berries in the snow",2,25,"grove"],["icegrotto","The blue grotto",4,27,"hollow"],["iceorgan","The ice organ",5,27,"stone"],["frostarch","The frost arch",5,25,"ruin"],["windcolumns","Wind carved pillars",5,29,"stone"],["snowdunes","The sleeping dunes",0,38,"dunes"],["sastrugi","Wind combed snow",5,34,"ridge"],["cornice","The curved escarpment",5,32,"ridge"],["whitepass","The narrow white pass",5,29,"hollow"],["hotspring","The breathing pool",4,29,"pond"],["thawgarden","The thaw garden",4,25,"pond"],["reedice","Reeds under ice",0,31,"marsh"],["icebells","The ringing shore",5,30,"pond"],["snoworchard","The sleeping orchard",1,29,"grove"],["winterhearth","A chimney in the snow",3,26,"ruin"],["buriedchapel","The roofless chapel",3,30,"ruin"],["froststairs","Steps through the firs",3,28,"steps"],["fallenfir","The fallen fir",3,29,"log"],["rootcave","The root shelter",3,27,"hollow"],["deerhollow","The deer hollow",0,33,"bowl"],["harewarren","Tracks in the junipers",0,28,"meadow"],["foxrocks","The fox ledges",5,27,"stone"],["owlsentinel","The owl tree",3,31,"grove"],["starpond","The star pond",1,35,"pond"],["icegarden","The ice garden",5,28,"stone"],["snowamphitheatre","The white amphitheatre",5,34,"bowl"],["silveravenue","The silver avenue",1,30,"aisle"],["cedarshelter","The cedar shelter",3,28,"grove"],["wintercairns","Cairns above the clouds",5,28,"ridge"],["frostfen","The frost fen",0,35,"marsh"],["snowbridge","The snow covered causeway",1,31,"pond"],["moonstones","The pale stone circle",5,29,"stone"],["lastleaves","The last copper leaves",2,28,"grove"]].map(([s,e,t,n,i])=>({kind:s,name:e,type:t,radius:n,shape:i,winter:!0})),Hn=56,Ti=420,yn=256,oi=11,fu=[["mirrorpond","Copper mirror",2,28,"pond"],["island","An island of red maples",2,29,"island"],["birchhall","The white woods",1,28,"grove"],["aspenwheel","Quaking aspen hollow",1,26,"grove"],["scarletaisle","Scarlet passage",2,21,"aisle"],["beechcathedral","Old beech canopy",3,24,"grove"],["ginkgo","Golden fan grove",6,23,"grove"],["orchard","The overgrown orchard",0,26,"grove"],["ferngully","Fern gully",4,23,"hollow"],["mossgrotto","Moss grotto",4,21,"hollow"],["splitrock","The split granite",5,20,"stone"],["bouldergarden","Glacial boulder garden",5,27,"stone"],["basalt","The stone organ",5,22,"stone"],["overlook","Heather ridge",5,27,"ridge"],["standingstones","Sleeping stones",6,22,"stone"],["stonearch","The last doorway",2,22,"ruin"],["ruinedgarden","The garden that returned",4,25,"ruin"],["hearthruin","The old hearth",3,21,"ruin"],["oldsteps","Forgotten stair",4,21,"steps"],["hollowgiant","The hollow giant",3,22,"log"],["windfall","Windfall clearing",0,28,"log"],["leafbowl","A bowl of copper leaves",6,24,"bowl"],["mushroomring","The quiet ring",3,20,"grove"],["berrycopse","Rowan and rosehips",2,22,"grove"],["heather","The violet hillside",5,25,"ridge"],["meadowoak","The meadow oak",0,34,"meadow"],["cedarpond","The dark green pool",4,28,"pond"],["reedmarsh","A reed filled hollow",0,29,"marsh"],["larchridge","Golden larch ridge",5,28,"ridge"],["spring","The hidden spring",4,22,"pond"],["rootgate","The roots of an ancient tree",3,22,"grove"],["amphitheatre","The autumn amphitheatre",2,29,"bowl"],["maplegarden","A garden of small maples",2,25,"grove"],["pineglade","The scented pine glade",3,26,"grove"],["silvermeadow","Silver grass meadow",0,34,"meadow"],["cairntrail","The cairn trail",5,22,"stone"]].map(([s,e,t,n,i])=>({kind:s,name:e,type:t,radius:n,shape:i}));function S1(s){return Math.round(s/Ti)}function Ns(s,e=0){return e*Ti-4+Math.sin(s*.017+e*2)*12+Math.sin(s*.043+e)*3+Math.sin(s*.12+e*3)*1.15}function vl(s,e=0){const t=Math.round((s+64)/yn),n=t*yn-64;return{id:e+":"+t,x:Ns(n,e),z:n,low:-t*oi,high:(1-t)*oi,index:e,k:t,width:3.4+Ve(e,t,72)*2.8}}function Sn(s,e){const t=S1(s),n=vl(e,t),i=e-n.z,r=Ns(e,t),o=Math.exp(-Math.pow((i-15)/17,2)),a=3.4+Math.sin(e*.023+t)*.7+o*7+(Qt(e*.093,t,507)-.5)*1.8*ot(4,14,Math.abs(i)),c=n.low+(i<-.6?oi:i>1.8?0:oi*(1-ot(-.6,1.8,i)));return{index:t,f:n,v:i,x:r,d:Math.abs(s-r),width:a,level:c,pool:o}}function Af(s,e){const t=Sn(s,e),n=t.f,i=t.v,r=n.low+oi*(1-ot(-31,22,i)),o=ot(57,185,t.d)*(14+ou(s*.008,e*.009,71)*43);let a=r+1.1+ou(s*.023,e*.023,13)*4.2+o+Math.pow(Qt(s*.018+Qt(e*.01,0,72)*2,e*.015,73),2)*o*.7+Qt(s*.13,e*.13,65)*.28;const c=1-ot(9,31,t.d),l=(Qt(s*.14,n.z*.19,777)-.5)*5*ot(5,19,t.d),h=1-ot(-2+l,2.7+l,i);a=Ke(a,n.low+oi*h+1+Qt(s*.17,e*.14,54)*1.5,c*(1-ot(12,32,Math.abs(i))));const u=Qt(s*.29,e*.23,529),f=(1-ot(t.width+3,t.width+10+u*4,t.d))*ot(12,28,Math.abs(i));a=Ke(a,t.level+.48+Qt(s*.18,e*.21,587)*.75,f);const d=t.level-(.35+t.pool*1.9)-(1-ot(0,t.width,t.d))*.58+Qt(s*.6,e*.43,512)*.14;return Ke(d,a,ot(t.width*.66,t.width+4.1+u*1.6,t.d))}const ms=new Map;function Rf(s,e){const t=s+","+e;if(ms.has(t))return ms.get(t);let n=s*106+(Ve(s,e,40)-.5)*34,i=e*112+(Ve(s,e,41)-.5)*38,r=Math.floor(Ve(s,e,842)*fu.length);s===0&&e===0&&(n=55,i=-10,r=0),s===-1&&e===0&&(n=-67,i=3,r=2),s===-1&&e===-1&&(n=-67,i=-105,r=15),s===0&&e===-1&&(n=43,i=-120,r=9),s===1&&e===0&&(n=145,i=6,r=13),s===0&&e===1&&(n=39,i=107,r=25);const o=Ht(n,i),a=o>.42+Ve(s,e,918)*.18,c=((s*11+e*17)%oo.length+oo.length)%oo.length,l=a?oo[c]:fu[r],h=Sn(n,i),u=["pond","island","marsh"].includes(l.shape);(u||a)&&h.d<(a?l.radius+12:36)&&(n=h.x+(n<h.x?-1:1)*(a?l.radius+16:43));const f=l.radius*(.88+Ve(s,e,43)*.27),d=Ve(s,e,48)*He,m={...l,id:t,gx:s,gz:e,x:n,z:i,rx:f*1.12,rz:f*(1+Ve(s,e,44)*.24),radius:f,angle:d,ca:Math.cos(d),sa:Math.sin(d),seed:Ve(s,e,45)*1e8,variant:Ve(s,e,46),pond:u,pondRX:f*.57,pondRZ:f*.69,region:Qt(n*.0017,i*.0017,391),h:Af(n,i)};return m.water=m.h-.6,m.depth=m.shape==="marsh"?.55:["spring","hotspring","thawgarden"].includes(m.kind)?1.05:2.25,ms.set(t,m),ms.size>600&&ms.delete(ms.keys().next().value),m}function _l(s,e,t=190){const n=[],i=Math.round(s/106),r=Math.round(e/112);for(let o=-2;o<=2;o++)for(let a=-2;a<=2;a++){const c=Rf(i+a,r+o);Math.hypot(c.x-s,c.z-e)<t&&n.push(c)}return n}let du=1e9,pu=1e9,ao=[];function Ki(s,e){const t=Math.round(s/106),n=Math.round(e/112);if(t!==du||n!==pu){du=t,pu=n,ao=[];for(let o=-1;o<=1;o++)for(let a=-1;a<=1;a++)ao.push(Rf(t+a,n+o))}let i=ao[0],r=1/0;for(const o of ao){const a=((s-o.x)/o.rx)**2+((e-o.z)/o.rz)**2;a<r&&(i=o,r=a)}return i}function yl(s,e,t){const n=e-s.x,i=t-s.z;return{u:n*s.ca+i*s.sa,v:-n*s.sa+i*s.ca}}function Vs(s,e,t){const n=yl(s,e,t);return Math.hypot(n.u/s.pondRX,n.v/s.pondRZ)*(1+.045*Math.sin(Math.atan2(n.v,n.u)*5+s.variant*20))}function ui(s,e){const t=Ki(s,e),n=Math.hypot((s-t.x)/t.rx,(e-t.z)/t.rz),i=1-ot(.65,1.65,n);return{site:t,type:t.type,weight:i,meadow:t.type===0?i:0,birch:t.type===1?i:0,maple:t.type===2?i:0,old:t.type===3?i:0,fern:t.type===4?i:0,rock:t.type===5?i:0,leaves:t.type===6?i:0}}function Cf(s,e){const t=Math.round(s/Ti),n=Math.round((e-60)/yn),i=n*yn+45+Ve(t,n,732)*32,r=Ns(i,t),o=Sn(r,i).width+12;return Math.abs(e-i)+ot(o,o+14,Math.abs(s-r))*40}function Yi(s,e){const t=Sn(s,e),n=t.x+17+Math.sin(e*.034+t.index)*5,i=t.x-22+Math.sin(e*.021)*7,r=Math.round(e/112)*112+18+Math.sin(s*.028)*13,o=Ki(s,e),a=yl(o,s,e),c=Math.abs(a.u-Math.sin(a.v*.075+o.variant)*2.8),l=ot(o.radius,o.radius+13,Math.abs(a.v)),h=o.pond?Math.abs(Vs(o,s,e)-1.39)*o.radius:c+l*20;return Math.min(Cf(s,e),Math.abs(s-n),Math.abs(s-i)*1.25,Math.abs(e-r)*1.1,h)}function Uc(s,e){const t=ui(s,e);if(t.meadow>.3||t.rock>.5||t.site.pond)return 0;const n=Math.round(s/19),i=Math.round(e/19),r=n*19+(Ve(n,i,411)-.5)*9,o=i*19+(Ve(n,i,412)-.5)*9,a=Math.exp(-Math.pow((s-r)/(2.2+Ve(n,i,414)*2.8),2)-Math.pow((e-o)/2.5,2)),c=Math.pow(Math.max(0,(Qt(s*.075,e*.075,555)-.51)/.49),2.3);return(1-Ht(s,e))*(c*.35+a*(Ve(n,i,413)>.65||t.leaves>.5?.85+t.leaves*.55:0))*ot(.7,2.4,Yi(s,e))}function Ue(s,e){let t=Af(s,e);const n=ui(s,e),i=n.site,r=Sn(s,e),o=yl(i,s,e),a=Math.hypot(o.u/i.rx,o.v/i.rz),c=ot(r.width+4,r.width+12,r.d),l=(1-ot(.6,1.5,a))*c;let h=i.h+(Qt(s*.075,e*.075,321)-.5)*.35;if(i.shape==="dunes"&&(h+=Math.pow(.5+.5*Math.sin(o.u*.19+Math.sin(o.v*.08)),2)*2.4),i.kind==="sastrugi"&&(h+=Math.sin(o.u*.36+o.v*.14)*.23),i.shape==="ridge"&&(h+=Math.sin(o.u*.055)*2.5+o.v*.08),i.shape==="hollow"&&(h-=2*(1-ot(4,22,Math.hypot(o.u,o.v)))),i.shape==="bowl"&&(h-=2.2*(1-ot(3,22,Math.hypot(o.u,o.v)))),i.shape==="steps"&&(h+=o.v*.14),t=Ke(t,h,l*.82),i.pond){const u=Vs(i,s,e);let f=i.water-i.depth*(1-ot(.2,1.01,u));i.shape==="island"&&(f=Ke(f,i.water+1.8,1-ot(.16,.37,u))),t=Ke(t,f,1-ot(.92,1.23,u))}return t-=.1*(1-ot(.5,2.4,Yi(s,e))),t+Uc(s,e)*c+Er(s,e).powder*ot(.05,.7,t-zt(s,e))*(.5+.5*ot(.5,2.5,Yi(s,e)))}function ji(s,e){return new C(Ue(s-.22,e)-Ue(s+.22,e),.44,Ue(s,e-.22)-Ue(s,e+.22)).normalize()}function zt(s,e){const t=Ki(s,e);return t.pond&&Vs(t,s,e)<1.26?t.water:Sn(s,e).level}function Nc(s,e){const t=Ue(s,e);if(Xi(s,e).frozen)return"ice";if(t<zt(s,e))return"water";if(Ai(s,e)>.5)return Yi(s,e)<1.3?"packed-snow":"snow";const n=ui(s,e);return Yi(s,e)<1.1?"dirt":n.meadow>.45?"grass":ji(s,e).y<.75||n.rock>.6?"stone":"leaves"}function T1(s,e,t){const n=Sn(s,e),i=Ki(s,e),r=i.pond&&Vs(i,s,e)<1.26,o=r?i.water:n.level,a=Math.max(0,o-Ue(s,e)),c=a>.04&&(r||n.d<n.width+4),l=r?0:(1-ot(2.4,6.8,Math.abs(s-n.f.x)))*(1-ot(3,10,Math.abs(e-n.f.z-2.5)))*Tr((n.f.high-t+2)/3);return{level:o,depth:c?a:0,swimming:c&&a>1.4,underwater:c&&t<o-.05,spray:l,inPond:r}}function Pf(s,e){const t=Ht(s,e);if(t<.46)return 0;const n=Ki(s,e),i=Sn(s,e),r=n.pond?Vs(n,s,e):9,o=ot(.46,.82,t);return r<1.26?["hotspring","thawgarden"].includes(n.kind)?o*ot(.87,1.25,r):o:o*ot(.22,.76,i.d/i.width)*ot(12,35,Math.abs(i.v))}function Xi(s,e){const t=Pf(s,e),n=zt(s,e),i=n-Ue(s,e);return{strength:t,level:n+.075,frozen:t>.52&&i>.035}}const E1="varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",A1=`
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
}`;class R1{constructor(e){this.renderer=new __({canvas:e,antialias:!0,powerPreference:"high-performance",alpha:!1}),this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.3)),this.renderer.setSize(innerWidth,innerHeight),this.renderer.outputColorSpace=Ut,this.renderer.toneMapping=Ru,this.renderer.toneMappingExposure=1.05,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Eu,this.renderer.shadowMap.autoUpdate=!1,this.scene=new bo,this.scene.fog=new Zc(10729921,.0021),this.camera=new Kt(67,innerWidth/innerHeight,.07,1450),this.camera.rotation.order="YXZ",this.hemi=new _m(11848927,10189128,.82),this.scene.add(this.hemi),this.sun=new mf(16768941,2.8),this.sun.castShadow=!0,this.sun.shadow.mapSize.set(2048,2048),this.sun.shadow.camera.left=-49,this.sun.shadow.camera.right=49,this.sun.shadow.camera.top=49,this.sun.shadow.camera.bottom=-49,this.sun.shadow.camera.near=1,this.sun.shadow.camera.far=180,this.sun.shadow.bias=-18e-5,this.sun.shadow.normalBias=.065,this.sun.shadow.radius=2,this.scene.add(this.sun,this.sun.target),this.sky(),this.air=new v1(this.renderer,this.camera,this.sun),this.target=new Dn(innerWidth,innerHeight,{type:li,depthBuffer:!0,samples:2}),this.target.depthTexture=new tl(innerWidth,innerHeight),this.target.depthTexture.type=Ei,this.postScene=new bo,this.postCamera=new Lo,this.post=new Xt({uniforms:{exposureTex:{value:null},airTex:{value:this.air.target.texture},projectionInverse:{value:this.camera.projectionMatrixInverse},cameraWorld:{value:this.camera.matrixWorld},fogBase:{value:0},mist:{value:.4},fogColor:{value:new Me(12699068)},sceneTex:{value:this.target.texture},depthTex:{value:this.target.depthTexture},sunScreen:{value:new le},sunVisible:{value:1},clock:{value:0},wetness:{value:0},spray:{value:0},underwater:{value:0},resolution:{value:new le(innerWidth,innerHeight)}},vertexShader:E1,fragmentShader:A1,depthTest:!1,depthWrite:!1}),this.postScene.add(new st(new Un(2,2),this.post)),this.ticks=0,this.quality="high",this.shadowAt=new C(999,999,999),this.size(),window.addEventListener("resize",()=>this.size())}async loadSky(){this.scene.background=new Me(10863829),this.skydome.visible=!0}sky(){const e=new Xt({side:Wt,depthWrite:!1,uniforms:{sunDirection:en.sun,uTime:en.time,winter:{value:0}},vertexShader:"varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:`
    uniform vec3 sunDirection;uniform float uTime;uniform float winter;varying vec3 vDir;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);float dotSun=max(0.,dot(d,sunDirection));vec3 low=vec3(.49,.63,.73),high=vec3(.055,.21,.40);low=mix(low,vec3(.63,.73,.84),winter);high=mix(high,vec3(.11,.29,.49),winter);vec3 col=mix(low,high,pow(h,.6));col+=vec3(.6,.37,.13)*pow(dotSun,7.)*.45;col+=vec3(1.8,1.3,.7)*pow(dotSun,1000.);vec2 p=d.xz/max(.12,d.y)*1.2+vec2(uTime*.0017,uTime*.0008);float cloud=noise(p)*.6+noise(p*2.8)*.26+noise(p*7.5)*.14;float wisps=smoothstep(.46,.77,cloud)*smoothstep(.02,.3,h)*.49;col=mix(col,vec3(.88,.89,.86),wisps);gl_FragColor=vec4(col,1.);}`});this.skydome=new st(new an(1300,32,16),e),this.skydome.renderOrder=-100,this.scene.add(this.skydome)}size(){const e=this.quality==="high"?Math.min(devicePixelRatio,1.3)*(this.renderScale||1):this.quality==="ultra"?Math.min(devicePixelRatio*1.25,1.8):Math.min(devicePixelRatio,1)*.8;this.renderer.setPixelRatio(e),this.renderer.setSize(innerWidth,innerHeight),this.target.setSize(Math.round(innerWidth*e),Math.round(innerHeight*e)),this.air.resize(Math.round(innerWidth*e),Math.round(innerHeight*e)),this.camera.aspect=innerWidth/innerHeight,this.camera.updateProjectionMatrix(),this.post.uniforms.resolution.value.set(innerWidth*e,innerHeight*e)}observeFrame(e){if(this.quality!=="high"||e>150||(this.frameWindow??=[],this.frameWindow.push(e),this.frameWindow.length<150))return;this.frameWindow.sort((r,o)=>r-o);const t=this.frameWindow[112],n=this.frameWindow[142];this.frameWindow.length=0;const i=this.renderScale||1;t>23?(this.renderScale=Math.max(.78,i-.075),this.quickWindows=0):n<17.4?(this.quickWindows=(this.quickWindows||0)+1,this.quickWindows>=8&&(this.renderScale=Math.min(1,i+.025),this.quickWindows=0)):this.quickWindows=0,this.renderScale&&Math.abs(this.renderScale-i)>.001&&this.size()}setWetness(e,t,n){this.post.uniforms.wetness.value=e,this.post.uniforms.spray.value=t,this.post.uniforms.underwater.value=n?1:0}detail(){return this.quality=this.quality==="high"?"ultra":this.quality==="ultra"?"balanced":"high",this.size(),this.quality}render(e){const t=e/2400,n=gl(e,this.camera.position.x,this.camera.position.z);Ef.value=n.gust,en.sun.value.set(-.18+Math.sin(t)*.16,.43+Math.sin(t*.7)*.1,-.78).normalize();const i=Ht(this.camera.position.x,this.camera.position.z);this.cold=this.cold===void 0?i:Ke(this.cold,i,.025),this.skydome.material.uniforms.winter.value=this.cold,this.sun.intensity=Ke(3.8,2.8,this.cold)*n.sun,this.sun.color.set(16769198).lerp(new Me(16771795),this.cold),this.hemi.color.set(11848927).lerp(new Me(11324393),this.cold),this.hemi.groundColor.set(10189128).lerp(new Me(8887723),this.cold),this.hemi.intensity=Ke(1.1,1.32,this.cold)+(1-n.sun)*.55,this.scene.fog.color.set(10729921).lerp(new Me(11847897),this.cold),this.scene.fog.density=Ke(.0021,.0026,this.cold),this.post.uniforms.fogColor.value.set(12699068).lerp(new Me(11848413),this.cold);const r=ui(this.camera.position.x,this.camera.position.z),o=r.fern*.6+(r.site.pond?.4:0);this.post.uniforms.mist.value=.27+o+(.5+.5*Math.sin(e*.006))*.19,this.post.uniforms.fogBase.value=Ue(this.camera.position.x,this.camera.position.z)+1.7;const a=this.camera;this.skydome.position.copy(a.position);const l=a.position.clone().addScaledVector(en.sun.value,200).project(a);if(this.post.uniforms.sunScreen.value.set(l.x*.5+.5,l.y*.5+.5),this.post.uniforms.sunVisible.value=l.z<1?1:0,this.post.uniforms.clock.value=e,a.position.distanceToSquared(this.shadowAt)>.36||this.ticks%18===0){const f=Math.round(a.position.x*8)/8,d=Math.round(a.position.z*8)/8;this.sun.target.position.set(f,a.position.y+5,d),this.sun.position.copy(this.sun.target.position).addScaledVector(en.sun.value,90),this.renderer.shadowMap.needsUpdate=!0,this.shadowAt.copy(a.position)}this.renderer.setRenderTarget(this.target),this.renderer.render(this.scene,a);const h=this.renderer.info.render.calls,u=this.renderer.info.render.triangles;return this.air.render(this.target.depthTexture,en.sun.value,this.post.uniforms.fogBase.value,65e-5+o*7e-4),this.post.uniforms.exposureTex.value=this.air.adapt(this.target.texture,this.target.depthTexture,e),this.renderer.setRenderTarget(null),this.renderer.render(this.postScene,this.postCamera),this.ticks++,{calls:h,tris:u}}}class C1{constructor(e,t,n){this.world=t,this.tracks=[],this.puffs=[],this.sheds=new Map,this.stepSide=1,this.shedCount=0,this.lastCell="",this.springs=[],this.time=0,this.dummy=new ut;const i=document.createElement("canvas");i.width=i.height=32;const r=i.getContext("2d"),o=r.createRadialGradient(16,16,0,16,16,16);o.addColorStop(0,"rgba(255,255,255,1)"),o.addColorStop(.35,"rgba(255,255,255,.85)"),o.addColorStop(1,"rgba(255,255,255,0)"),r.fillStyle=o,r.fillRect(0,0,32,32);const a=new Io(i);this.flakes=new Ss(new wt,new Wi({map:a,color:15134975,size:.047,transparent:!0,opacity:.8,depthWrite:!1})),this.flakes.geometry.setAttribute("position",new yt(new Float32Array(1100*3),3)),this.flakes.frustumCulled=!1,this.flakes.userData.skipReflection=!0,e.add(this.flakes),this.powder=new Ss(new wt,new Wi({map:a,color:14543861,size:.12,transparent:!0,opacity:.48,depthWrite:!1})),this.powder.geometry.setAttribute("position",new yt(new Float32Array(600*3),3)),this.powder.frustumCulled=!1,this.powder.userData.skipReflection=!0,e.add(this.powder),this.steam=new Ss(new wt,new Wi({map:a,color:13885407,size:2.2,transparent:!0,opacity:.13,depthWrite:!1})),this.steam.geometry.setAttribute("position",new yt(new Float32Array(360),3)),this.steam.frustumCulled=!1,this.steam.userData.skipReflection=!0,e.add(this.steam);const c=new Xt({transparent:!0,depthWrite:!1,polygonOffset:!0,polygonOffsetFactor:-1,side:Et,vertexColors:!0,vertexShader:"varying vec2 vUv;varying vec3 vInfo;void main(){vUv=uv;vInfo=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}",fragmentShader:`varying vec2 vUv;varying vec3 vInfo;void main(){
    vec2 p=(vUv-.5)*2.;
    float boot=length(vec2(p.x/mix(.44,.68,smoothstep(-.7,.28,p.y)),p.y*1.08));
    float hoof=min(length((p-vec2(.27,0.))*vec2(3.2,1.6)),length((p+vec2(.27,0.))*vec2(3.2,1.6)));
    float hare=min(length((p-vec2(.35,.25))*vec2(3.8,1.8)),length((p-vec2(-.35,.25))*vec2(3.8,1.8)));
    hare=min(hare,min(length((p-vec2(.22,-.55))*vec2(4.5,4.)),length((p-vec2(-.22,-.55))*vec2(4.5,4.))));
    float paw=length((p-vec2(0.,-.22))*vec2(1.8,2.4));
    for(int i=0;i<4;i++){float k=float(i),x=(k-1.5)*.32,y=.23+sin(k/3.*3.14159)*.23;paw=min(paw,length((p-vec2(x,y))*5.));}
    float d=vInfo.g<.5?boot:vInfo.g<1.5?hoof:vInfo.g<2.5?hare:paw;
    float inside=1.-smoothstep(.63,.83,d),rim=smoothstep(.76,.85,d)*(1.-smoothstep(.85,1.,d));
    float tread=step(.7,fract(p.y*8.))*inside*.045*(1.-step(.5,vInfo.g));
    vec3 col=mix(vec3(.16,.25,.32),vec3(.65,.75,.82),rim);gl_FragColor=vec4(col,(inside*.24+rim*.065+tread)*vInfo.r);
   }`}),l=new Un(.23,.36);l.rotateX(-Math.PI/2),this.prints=new ii(l,c,1500),this.prints.instanceMatrix.setUsage(vs),this.prints.setColorAt(0,new Me(1,0,0)),this.prints.count=0,this.prints.frustumCulled=!1,this.prints.userData.skipReflection=!0,e.add(this.prints)}step(e,t,n,i){if(!["snow","packed-snow"].includes(n))return;this.stepSide*=-1;const r=e.x+Math.cos(e.yaw)*this.stepSide*.105,o=e.z-Math.sin(e.yaw)*this.stepSide*.105,a=new C(this.world.walkHeight(r-.15,o)-this.world.walkHeight(r+.15,o),.3,this.world.walkHeight(r,o-.15)-this.world.walkHeight(r,o+.15)).normalize();this.tracks.push({x:r,z:o,y:this.world.walkHeight(r,o)+.016,angle:e.yaw,time:t,size:1,animal:0,nx:a.x,ny:a.y,nz:a.z}),this.puff(r,this.world.walkHeight(r,o)+.035,o,i?16:9,.9,i?.8:.4)}animalTrack(e,t,n,i,r=1,o="deer"){if(Ai(e,t)<.5||Xi(e,t).frozen)return;const a=ji(e,t);this.tracks.push({x:e,z:t,y:Ue(e,t)+.018,angle:n,time:i,size:r,animal:o==="deer"?1:o==="hare"?2:3,nx:a.x,ny:a.y,nz:a.z})}puff(e,t,n,i,r=1.3,o=1){for(let a=0;a<i;a++){const c=Math.random()*He;this.puffs.push({x:e+(Math.random()-.5)*.3,y:t,z:n+(Math.random()-.5)*.3,vx:Math.cos(c)*o,vy:(.3+Math.random())*o,vz:Math.sin(c)*o,life:r})}this.puffs=this.puffs.slice(-600)}update(e,t,n){this.time=t;const i=Er(n.x,n.z),r=gl(t,n.x,n.z),o=i.cold*(.23+.52*r.cloud+.2*i.exposure);this.flakes.visible=i.cold>.1;const a=this.flakes.geometry.attributes.position,c=Math.floor(1100*o);this.flakes.geometry.setDrawRange(0,c);for(let m=0;m<c;m++){const x=n.x+((Ve(m,3)*70+t*(.28+r.gust*.5)-n.x)%70+70)%70-35,g=n.z+((Ve(m,4)*70+t*.13-n.z)%70+70)%70-35,p=n.y+((Ve(m,5)*27-t*(.28+Ve(m,6)*.4))%27+27)%27-6;a.setXYZ(m,x+Math.sin(t*.6+m)*.45,p,g+Math.sin(t*.45+m)*.2)}a.needsUpdate=!0;const l=Math.floor(n.x/30)+","+Math.floor(n.z/30);l!==this.lastCell&&(this.lastCell=l,this.springs=_l(n.x,n.z,100).filter(m=>["hotspring","thawgarden"].includes(m.kind)));const h=this.steam.geometry.attributes.position;let u=0;for(const m of this.springs)for(let x=0;x<30;x++){const g=(Ve(x,m.gx,839)+t*.065)%1,p=Ve(x,m.gz,954)*He,M=Math.sqrt(Ve(x,8))*m.pondRX*.8;h.setXYZ(u++,m.x+Math.cos(p)*M+g*1.8,m.water+.3+g*2.7,m.z+Math.sin(p)*M+g*.7)}if(this.steam.geometry.setDrawRange(0,u),h.needsUpdate=!0,i.cover>.55)for(const m of this.world.trees)![4,9].includes(m.species)||Math.hypot(m.x-n.x,m.z-n.z)>2.3||t-(this.sheds.get(m.id)??-200)<45||(this.sheds.set(m.id,t),this.shedCount++,this.puff(m.x,m.y+3.3*m.scale,m.z,100,2.7,.55),this.audio?.snowFallAt(m.x,m.y+2,m.z));for(const[m,x]of this.sheds)t-x>120&&this.sheds.delete(m);const f=this.powder.geometry.attributes.position;this.puffs=this.puffs.filter(m=>m.life>0);for(let m=0;m<this.puffs.length;m++){const x=this.puffs[m];x.life-=e,x.vy-=e*1.9,x.x+=x.vx*e,x.y+=x.vy*e,x.z+=x.vz*e,x.y<Ue(x.x,x.z)&&(x.life=0),f.setXYZ(m,x.x,x.y,x.z)}this.powder.geometry.setDrawRange(0,this.puffs.length),f.needsUpdate=!0;const d=this.tracks.filter(m=>t-m.time<300&&Math.hypot(m.x-n.x,m.z-n.z)<600);this.tracks=[...d.filter(m=>!m.animal).slice(-900),...d.filter(m=>m.animal).slice(-600)],this.prints.count=this.tracks.length,this.tracks.forEach((m,x)=>{const g=this.dummy;g.position.set(m.x,m.y,m.z),g.quaternion.setFromUnitVectors(new C(0,1,0),new C(m.nx,m.ny,m.nz)),g.rotateY(m.angle),g.scale.setScalar(m.size),g.updateMatrix(),this.prints.setMatrixAt(x,g.matrix),this.prints.setColorAt(x,new Me(Tr((300-t+m.time)/40),m.animal,0))}),this.prints.instanceMatrix.needsUpdate=!0,this.prints.instanceColor&&(this.prints.instanceColor.needsUpdate=!0)}inspect(){return{snowflakes:this.flakes.geometry.drawRange.count,footprints:this.tracks.filter(e=>!e.animal).length,animalTracks:this.tracks.filter(e=>e.animal).length,snowSheds:this.shedCount,steamPools:this.springs.length}}}class Fo extends st{constructor(e,t={}){super(e),this.isReflector=!0,this.type="Reflector",this.forceUpdate=!1,this.camera=new Kt;const n=this,i=t.color!==void 0?new Me(t.color):new Me(8355711),r=t.textureWidth||512,o=t.textureHeight||512,a=t.clipBias||0,c=t.shader||Fo.ReflectorShader,l=t.multisample!==void 0?t.multisample:4,h=new Mi,u=new C,f=new C,d=new C,m=new qe,x=new C(0,0,-1),g=new at,p=new C,M=new C,v=new at,_=new qe,w=this.camera,b=new Dn(r,o,{samples:l,type:li}),y=new Xt({name:c.name!==void 0?c.name:"unspecified",uniforms:qu.clone(c.uniforms),fragmentShader:c.fragmentShader,vertexShader:c.vertexShader});y.uniforms.tDiffuse.value=b.texture,y.uniforms.color.value=i,y.uniforms.textureMatrix.value=_,this.material=y,this.onBeforeRender=function(A,T,S){if(f.setFromMatrixPosition(n.matrixWorld),d.setFromMatrixPosition(S.matrixWorld),m.extractRotation(n.matrixWorld),u.set(0,0,1),u.applyMatrix4(m),p.subVectors(f,d),p.dot(u)>0===!0&&this.forceUpdate===!1)return;p.reflect(u).negate(),p.add(f),m.extractRotation(S.matrixWorld),x.set(0,0,-1),x.applyMatrix4(m),x.add(d),M.subVectors(f,x),M.reflect(u).negate(),M.add(f),w.position.copy(p),w.up.set(0,1,0),w.up.applyMatrix4(m),w.up.reflect(u),w.lookAt(M),w.far=S.far,w.updateMatrixWorld(),w.projectionMatrix.copy(S.projectionMatrix),_.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),_.multiply(w.projectionMatrix),_.multiply(w.matrixWorldInverse),_.multiply(n.matrixWorld),h.setFromNormalAndCoplanarPoint(u,f),h.applyMatrix4(w.matrixWorldInverse),g.set(h.normal.x,h.normal.y,h.normal.z,h.constant);const D=w.projectionMatrix;v.x=(Math.sign(g.x)+D.elements[8])/D.elements[0],v.y=(Math.sign(g.y)+D.elements[9])/D.elements[5],v.z=-1,v.w=(1+D.elements[10])/D.elements[14],g.multiplyScalar(2/g.dot(v)),D.elements[2]=g.x,D.elements[6]=g.y,D.elements[10]=g.z+1-a,D.elements[14]=g.w,n.visible=!1;const z=A.getRenderTarget(),N=A.xr.enabled,F=A.shadowMap.autoUpdate;A.xr.enabled=!1,A.shadowMap.autoUpdate=!1,A.setRenderTarget(b),A.state.buffers.depth.setMask(!0),A.autoClear===!1&&A.clear(),A.render(T,w),A.xr.enabled=N,A.shadowMap.autoUpdate=F,A.setRenderTarget(z);const V=S.viewport;V!==void 0&&A.state.viewport(V),n.visible=!0,this.forceUpdate=!1},this.getRenderTarget=function(){return b},this.dispose=function(){b.dispose(),n.material.dispose()}}}Fo.ReflectorShader={name:"ReflectorShader",uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null}},vertexShader:`
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

		}`};const Da="float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.),f.x),f.y);}float fb(vec2 p){return n2(p)*.6+n2(p*2.13)*.27+n2(p*4.1)*.13;}";class P1{constructor(e,t){this.scene=e,this.materials=t,this.group=new We,e.add(this.group),this.surfaces=[],this.falls=[],this.sources=[],this.frame=0,this.key="",this.ripples=Array.from({length:8},()=>new at(0,0,-100,0)),this.rippleIndex=0,this.makeMaterials()}makeMaterials(){this.sheetMaterial=new Xt({side:Et,transparent:!0,depthWrite:!1,uniforms:{time:en.time},vertexShader:"varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:`uniform float time;varying vec2 vUv;varying vec3 vWorld;${Da}${zo}
 void main(){float travel=sqrt(max(.001,vUv.y));vec2 p=vec2(vUv.x*36.,travel*13.-time*8.6);float threads=fb(p*vec2(1.,.45));float broken=fb(p*vec2(2.2,.9)+17.);float edge=smoothstep(0.,.055,vUv.x)*smoothstep(1.,.945,vUv.x);float grain=n2(vec2(vUv.x*135.,travel*87.-time*32.));float streams=smoothstep(.12,.48,fb(vec2(vWorld.x*1.4,3.7)));float a=(.035+smoothstep(.27,.74,threads)*.63)*edge*(.76+grain*.36)*streams*(1.-forestCold(vWorld.xz)*smoothstep(.18,.44,abs(vUv.x-.5))*.83);vec3 c=mix(vec3(.11,.18,.16),vec3(.63,.75,.71),smoothstep(.29,.73,threads));c+=pow(broken,5.)*.24+pow(grain,8.)*.07;gl_FragColor=vec4(c,a);#include <tonemapping_fragment>
 #include <colorspace_fragment>}`.replace(";#include",`;
#include`)}),this.sprayMaterial=new Wi({color:14807018,size:.07,transparent:!0,opacity:.5,depthWrite:!1,sizeAttenuation:!0});const e=document.createElement("canvas");e.width=e.height=64;const t=e.getContext("2d"),n=t.createRadialGradient(32,32,0,32,32,32);n.addColorStop(0,"rgba(255,255,255,.7)"),n.addColorStop(.3,"rgba(255,255,255,.35)"),n.addColorStop(1,"rgba(255,255,255,0)"),t.fillStyle=n,t.fillRect(0,0,64,64),this.mistMap=new Io(e),this.sprayMaterial.map=this.mistMap,this.sprayMaterial.alphaTest=.015,this.mistMaterial=new Wi({map:this.mistMap,color:13886174,size:3.7,transparent:!0,opacity:.17,depthWrite:!1}),this.foamMaterial=new Xt({transparent:!0,depthWrite:!1,side:Et,uniforms:{time:en.time},vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:`varying vec2 vUv;uniform float time;${Da}void main(){vec2 q=(vUv-.5)*2.;float d=length(q*vec2(1.,.74));float n=fb(vUv*vec2(17.,24.)-vec2(0.,time*.8));float a=(1.-smoothstep(.2,1.,d))*smoothstep(.38,.72,n)*.32;gl_FragColor=vec4(.75,.87,.82,a);}`})}surface(e,t,n,i,r=null){const o=r?r.water:-t*oi,a=new hi,c=r?72:Math.ceil((i-n)/1.5),l=r?72:20;for(let g=0;g<=c;g++){const p=n+(i-n)*g/c,M=Sn(e*Ti,p);for(let v=0;v<=l;v++){const _=v/l*2-1,w=r?r.x+_*r.radius*1.05:M.x+_*(M.width+4);if(a.vertex([w,-p,0],[0,0,1],[w,p],[1,1,1]),v<l&&g<c){const b=g*(l+1)+v;a.i.push(b,b+1,b+l+1,b+1,b+l+2,b+l+1)}}}const h=a.geometry(),u=new Float32Array(h.attributes.position.count);for(let g=0;g<u.length;g++)u[g]=r&&Vs(r,h.attributes.position.getX(g),-h.attributes.position.getY(g))>1.23?0:Math.max(0,o-Ue(h.attributes.position.getX(g),-h.attributes.position.getY(g)));h.setAttribute("waterDepth",new yt(u,1));const f=new Float32Array(u.length);for(let g=0;g<f.length;g++)f[g]=Pf(h.attributes.position.getX(g),-h.attributes.position.getY(g));h.setAttribute("iceStrength",new yt(f,1));const d=new Fo(h,{textureWidth:512,textureHeight:512,clipBias:.002});d.rotation.x=-Math.PI/2,d.position.y=o+.018;const m=d.material;Object.assign(m.uniforms,{hasReflection:{value:0},time:en.time,sunDirection:en.sun,ripples:{value:this.ripples},flow:{value:r?.025:.19}}),m.vertexShader="uniform mat4 textureMatrix;varying vec4 vCoord;varying vec3 vWorld;varying float vDepth;varying float vIce;attribute float iceStrength;attribute float waterDepth;void main(){vCoord=textureMatrix*vec4(position,1.);vWorld=(modelMatrix*vec4(position,1.)).xyz;vDepth=waterDepth;vIce=iceStrength;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",m.fragmentShader=`uniform float hasReflection;uniform sampler2D tDiffuse;uniform float time;uniform float flow;uniform vec3 sunDirection;uniform vec4 ripples[8];varying vec4 vCoord;varying vec3 vWorld;varying float vDepth;varying float vIce;${Da}
  void main(){if(vDepth<.008)discard;vec2 p=vWorld.xz*.65-vec2(time*flow*.16,time*flow);float h=fb(p),hx=fb(p+vec2(.04,0.)),hy=fb(p+vec2(0.,.04));vec2 grad=vec2(h-hx,h-hy)*.23;
  for(int i=0;i<8;i++){float age=time-ripples[i].z;if(age>0.&&age<3.4){vec2 d=vWorld.xz-ripples[i].xy;float len=length(d);float ring=sin((len-age*1.9)*24.)*exp(-pow((len-age*1.9)*3.,2.))*(1.-age/3.4);grad+=normalize(d+vec2(.0001))*ring*.013;}}
  float frozen=smoothstep(.46,.56,vIce);grad*=1.-frozen*.98;vec3 normal=normalize(vec3(grad.x,1.,grad.y)),view=normalize(cameraPosition-vWorld);float fresnel=.025+.975*pow(1.-max(0.,dot(normal,view)),5.);vec4 coord=vCoord;coord.xy+=grad*.085*coord.w;vec2 reflectionUV=coord.xy/coord.w;float valid=hasReflection*smoothstep(0.,.045,min(min(reflectionUV.x,reflectionUV.y),min(1.-reflectionUV.x,1.-reflectionUV.y)));vec3 reflected=mix(vec3(.12,.18,.19),texture2DProj(tDiffuse,coord).rgb,valid);vec3 body=mix(vec3(.085,.095,.048),vec3(.012,.043,.031),smoothstep(0.,2.3,vDepth));vec3 c=mix(body,reflected,clamp(fresnel+.22,0.,.98));float spec=pow(max(0.,dot(normal,normalize(sunDirection+view))),200.);c+=vec3(1.,.85,.53)*spec*.65;float edgeFoam=(1.-smoothstep(.02,.24,vDepth))*smoothstep(.58,.79,fb(vWorld.xz*3.-vec2(time*.12,time*.45)));c=mix(c,vec3(.7,.78,.67),edgeFoam*.5);if(frozen>.001){
    vec2 fractured=vWorld.xz*.19+vec2(fb(vWorld.xz*.34),fb(vWorld.zx*.31+17.))*.19;
    vec2 cell=floor(fractured),f=fract(fractured);float nearest=10.,second=10.;
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 q=vec2(float(i),float(j)),randomPoint=vec2(hash21(cell+q),hash21(cell+q+91.));float d=length(q+randomPoint-f);if(d<nearest){second=nearest;nearest=d;}else second=min(second,d);}
    float crack=(1.-smoothstep(.001,.006,second-nearest))*(.26+.74*smoothstep(.24,.72,fb(vWorld.xz*.8)));
    float fine=(1.-smoothstep(.003,.012,abs(sin(vWorld.x*.74+sin(vWorld.z*.37)*3.1))))*smoothstep(.53,.76,fb(vWorld.xz*.39));
    vec2 bubbleCell=floor(vWorld.xz*2.3),bubble=fract(vWorld.xz*2.3)-vec2(hash21(bubbleCell+3.),hash21(bubbleCell+89.));float trapped=(1.-smoothstep(.018,.05,length(bubble)))*step(.88,hash21(bubbleCell));
    float snow=smoothstep(.58,.81,fb(vWorld.xz*.13))* .72;
    vec3 ice=mix(vec3(.095,.22,.29),vec3(.35,.52,.59),fresnel*.7+.15);
    ice=mix(ice,reflected,.19+fresnel*.25);ice+=vec3(.28,.4,.44)*(crack*.45+fine*.12+trapped*.35);ice=mix(ice,vec3(.64,.76,.83),snow);
    c=mix(c,ice,frozen);
  }
  gl_FragColor=vec4(c,mix(smoothstep(0.,.23,vDepth)*.92,smoothstep(.008,.085,vDepth),frozen));#include <tonemapping_fragment>
  #include <colorspace_fragment>}`.replace(";#include",`;
#include`),m.transparent=!0,m.depthWrite=!0,m.side=Wt,d.renderOrder=1;const x=d.onBeforeRender;d.onBeforeRender=(...g)=>{if(La.active||(d.userData.visibleFrame=this.frame,this.didReflect===this.frame))return;const p=d===this.closest;if(!d.userData.fresh&&!(p&&this.frame%2===0)&&!(this.frame%2===1&&this.frame-(d.userData.reflectedAt||0)>12)||g[2].position.y<o||Math.abs(g[2].position.y-o)>55)return;this.didReflect=this.frame,d.userData.fresh=!1,d.userData.reflectedAt=this.frame,La.active=!0;const M=g[0].shadowMap.needsUpdate;g[0].shadowMap.needsUpdate=!1,this.surfaces.forEach(w=>w.visible=!1);const v=[],_=[];g[1].traverse(w=>{w.userData.reflectionGeometry&&w.geometry!==w.userData.reflectionGeometry&&(v.push([w,w.geometry]),w.geometry=w.userData.reflectionGeometry),w.userData.skipReflection&&w.visible&&(_.push(w),w.visible=!1)});try{x.call(d,...g),m.uniforms.hasReflection.value=1}finally{for(const[w,b]of v)w.geometry=b;for(const w of _)w.visible=!0;this.surfaces.forEach(w=>w.visible=!0),g[0].shadowMap.needsUpdate=M,La.active=!1}},d.userData.fresh=!0,d.userData.level=o,d.userData.midZ=(n+i)/2,d.userData.midX=r?r.x:Ns((n+i)/2,e),d.userData.start=n,d.userData.end=i,d.userData.index=e,d.userData.radius=r?.radius||0,d.userData.pondId=r?.id,this.group.add(d),this.surfaces.push(d)}waterfall(e){const t=Fn(e.k*15+e.index*381+756),n=new hi,i=e.width,r=38,o=42;for(let M=0;M<=r;M++){const v=M/r;for(let _=0;_<=o;_++){const w=_/o*2-1,b=e.x+w*i,y=e.z-.65+v*2.9+Math.sin(w*6)*.14*v,A=e.high-oi*v*v,T=(Math.sin(w*37)*.28+Math.sin(w*63)*.16)*v;if(n.vertex([b,A,y+T],[0,.18,1],[_/o,v*v],[1,1,1]),_<o&&M<r){const S=M*(o+1)+_;n.i.push(S,S+1,S+o+1,S+1,S+o+2,S+o+1)}}}const a=Ht(e.x,e.z);if(a>.4){const M=new wi(1,.035,1,9,5);M.translate(0,-.5,0);const v=24,_=new ii(M,this.materials.ice,v),w=new ut;for(let b=0;b<v;b++){const y=b%2?1:-1,A=(2.7+Ve(b,e.k,829)*7.6)*a;w.position.set(e.x+y*i*(.5+Ve(b,e.k,930)*.64),e.high+.18,e.z-.1+Ve(b,5)*.9),w.scale.set(.14+Ve(b,8)*.36,A,.13+Ve(b,2)*.24),w.updateMatrix(),_.setMatrixAt(b,w.matrix)}_.castShadow=!0,this.group.add(_)}const c=new st(n.geometry(),this.sheetMaterial);c.renderOrder=2,this.group.add(c);const l=new st(n.geometry(),this.sheetMaterial);l.position.z=-.27,l.scale.x=1,this.group.add(l);const h=420,u=new Float32Array(h*3),f=[];for(let M=0;M<h;M++)f.push({u:(t()*2-1)*i,p:t(),s:.8+t()*.7});const d=new wt;d.setAttribute("position",new yt(u,3));const m=new Ss(d,this.sprayMaterial);m.frustumCulled=!1,this.group.add(m);const x=new wt;x.setAttribute("position",new yt(new Float32Array(105),3));const g=new Ss(x,this.mistMaterial);g.frustumCulled=!1,this.group.add(g);const p=new st(new Un(i*2.5,7),this.foamMaterial);p.rotation.x=-Math.PI/2,p.position.set(e.x,e.low+.045,e.z+4.1),p.renderOrder=3,this.group.add(p),this.falls.push({f:e,seeds:f,spray:m,mist:g}),this.sources.push({id:e.id,x:e.x,y:e.low+2,z:e.z+2,cold:a})}rebuild(e,t){const n=Math.round(e/Ti),i=Math.floor((t+64)/yn),r=n+","+i;if(r!==this.key){this.key=r;for(const o of[...this.group.children])this.group.remove(o),o.geometry?.dispose(),o.isReflector&&o.dispose();this.surfaces=[],this.falls=[],this.sources=[],this.pondKey="";for(let o=n-1;o<=n+1;o++)for(let a=i-1;a<=i+1;a++)Math.abs(o*Ti-e)>310||(this.surface(o,a,a*yn-64+1.8,(a+1)*yn-64-.6),this.waterfall(vl(a*yn-64,o)))}}syncPonds(e,t){const n=Math.floor(e/56)+","+Math.floor(t/56);if(n===this.pondKey)return;this.pondKey=n;const i=_l(e,t,200).filter(o=>o.pond),r=new Set(i.map(o=>o.id));for(const o of[...this.surfaces])o.userData.pondId&&!r.has(o.userData.pondId)&&(this.group.remove(o),o.geometry.dispose(),o.dispose(),this.surfaces.splice(this.surfaces.indexOf(o),1));for(const o of i)this.surfaces.some(a=>a.userData.pondId===o.id)||this.surface(0,0,o.z-o.radius*1.05,o.z+o.radius*1.05,o)}splash(e,t,n){this.ripples[this.rippleIndex++%8].set(e,t,n,1)}update(e,t){this.frame++,this.rebuild(t.x,t.z),this.syncPonds(t.x,t.z);const n=i=>{const r=i.userData,o=r.pondId?r.midZ:Math.max(r.start,Math.min(r.end,t.z)),a=r.pondId?r.midX:Ns(o,r.index),c=a-t.x,l=o-t.z,h=Math.max(0,Math.hypot(c,l)-r.radius*.65),u=(-Math.sin(t.yaw)*c-Math.cos(t.yaw)*l)/Math.max(1,Math.hypot(c,l));return h+Math.abs(r.level-t.y)*2+(u<-.15?80:0)+(this.frame-(r.visibleFrame||0)>2?200:0)};this.closest=[...this.surfaces].sort((i,r)=>n(i)-n(r))[0];for(const i of this.falls){const{f:r,seeds:o}=i,a=i.spray.geometry.attributes.position;for(let l=0;l<o.length;l++){const h=o[l],u=(h.p+e*.63*h.s)%1,f=r.high-oi*u*u,d=Math.sin(l*63)*.25*u;a.setXYZ(l,r.x+h.u+d,f,r.z-.6+u*3.1+Math.sin(l*83)*.5*u)}a.needsUpdate=!0;const c=i.mist.geometry.attributes.position;for(let l=0;l<c.count;l++){const h=(l/c.count+e*.12)%1;c.setXYZ(l,r.x+Math.sin(l*817)*r.width*(.8+h),r.low+.3+h*2.6,r.z+2+h*5+Math.sin(l*35)*1.5)}c.needsUpdate=!0}}}const bt={SUGAR_A:4,SUGAR_B:5,RED_A:6,RED_B:7,BIRCH:8,ASPEN:9,OAK_A:10,OAK_B:11,BEECH:12,SPRUCE:13,PINE:14,LARCH:15,GINKGO:16,JAPANESE:17,SUMAC:18,BARE:22,SUGAR_C:23,OAK_C:24,BLUEBERRY:25},vt={SUGAR:0,RED:1,BIRCH:2,ASPEN:3,OAK:4,BEECH:5,SPRUCE:6,PINE:7,LARCH:8,SNAG:9,GINKGO:10,JAPANESE:11,SUMAC:12,HAZEL:13,BLUEBERRY:14,SAPLING:15},In=Math.PI*2,qt=[];qt[vt.SUGAR]={name:"sugar maple",kind:"maple",bark:"maple",h:[14,21],base:[.18,.28],width:[.68,.88],shape:"round",points:400,cards:560,card:[1.25,1.65],trunk:.34,up:.1,variants:3,rows:[bt.SUGAR_A,bt.SUGAR_B,bt.SUGAR_C],lumpy:.4};qt[vt.RED]={name:"red maple",kind:"redmaple",bark:"beech",h:[12,18],base:[.2,.32],width:[.52,.7],shape:"oval",points:340,cards:480,card:[1.15,1.5],trunk:.27,up:.18,variants:3,rows:[bt.RED_A,bt.RED_B,bt.SUGAR_C],lumpy:.42};qt[vt.BIRCH]={name:"birch",kind:"birch",bark:"birch",h:[12,18],base:[.24,.38],width:[.42,.58],shape:"oval",points:300,cards:430,card:[1.05,1.35],trunk:.17,up:.02,excurrent:.55,variants:3,rows:[bt.BIRCH],lumpy:.36,droop:.35};qt[vt.ASPEN]={name:"aspen",kind:"aspen",bark:"aspen",h:[13,20],base:[.36,.5],width:[.34,.46],shape:"column",points:270,cards:380,card:[1,1.3],trunk:.19,up:.22,excurrent:.75,variants:3,rows:[bt.ASPEN,bt.BIRCH],lumpy:.34};qt[vt.OAK]={name:"oak",kind:"oak",bark:"oak",h:[13,19],base:[.18,.26],width:[.85,1.05],shape:"spread",points:420,cards:560,card:[1.3,1.7],trunk:.42,up:-.04,variants:3,rows:[bt.OAK_A,bt.OAK_B,bt.OAK_C],lumpy:.45};qt[vt.BEECH]={name:"beech",kind:"beech",bark:"beech",h:[14,20],base:[.16,.26],width:[.72,.92],shape:"round",points:400,cards:540,card:[1.2,1.55],trunk:.32,up:.06,variants:2,rows:[bt.BEECH],lumpy:.38};qt[vt.SPRUCE]={name:"spruce",kind:"spruce",bark:"spruce",conifer:"spruce",h:[16,26],base:[.06,.14],width:[.28,.36],trunk:.3,variants:3,rows:[bt.SPRUCE]};qt[vt.PINE]={name:"pine",kind:"pine",bark:"pine",conifer:"pine",h:[16,24],base:[.32,.46],width:[.36,.46],trunk:.33,variants:2,rows:[bt.PINE]};qt[vt.LARCH]={name:"larch",kind:"larch",bark:"spruce",conifer:"larch",h:[15,22],base:[.14,.24],width:[.26,.34],trunk:.26,variants:2,rows:[bt.LARCH]};qt[vt.SNAG]={name:"dead tree",kind:"maple",bark:"oak",h:[9,16],base:[.36,.5],width:[.4,.6],shape:"oval",points:110,cards:0,card:[1,1],trunk:.28,up:.15,variants:2,rows:[bt.BARE],lumpy:.3,dead:!0};qt[vt.GINKGO]={name:"ginkgo",kind:"ginkgo",bark:"maple",h:[12,18],base:[.28,.4],width:[.46,.62],shape:"oval",points:300,cards:470,card:[1.1,1.4],trunk:.28,up:.25,excurrent:.4,variants:2,rows:[bt.GINKGO],lumpy:.4};qt[vt.JAPANESE]={name:"japanese maple",kind:"japanese",bark:"beech",h:[5,8],base:[.14,.24],width:[1,1.3],shape:"dome",points:300,cards:380,card:[.85,1.1],trunk:.13,up:0,variants:2,rows:[bt.JAPANESE],lumpy:.42};qt[vt.SUMAC]={name:"sumac",kind:"sumac",bark:"beech",h:[2.2,4],base:[.12,.25],width:[.75,1.05],shape:"dome",points:140,cards:120,card:[.62,.85],trunk:.05,up:.3,variants:2,rows:[bt.SUMAC],lumpy:.3,shrub:!0};qt[vt.HAZEL]={name:"witch hazel",kind:"beech",bark:"beech",h:[2,3.6],base:[.08,.2],width:[.85,1.15],shape:"dome",points:140,cards:120,card:[.6,.85],trunk:.05,up:.2,variants:2,rows:[bt.BIRCH,bt.ASPEN],lumpy:.3,shrub:!0};qt[vt.BLUEBERRY]={name:"blueberry",kind:"beech",bark:"beech",h:[.8,1.5],base:[.05,.15],width:[1.1,1.5],shape:"dome",points:90,cards:70,card:[.4,.55],trunk:.025,up:.15,variants:2,rows:[bt.BLUEBERRY],lumpy:.25,shrub:!0};qt[vt.SAPLING]={name:"young maple",kind:"maple",bark:"beech",h:[2.6,4.6],base:[.2,.35],width:[.55,.75],shape:"oval",points:120,cards:100,card:[.6,.8],trunk:.05,up:.25,variants:2,rows:[bt.SUGAR_A,bt.SUGAR_C,bt.RED_A],lumpy:.3,shrub:!0};function mu(s,e){switch(s){case"oval":return Math.pow(Math.sin(Math.PI*Math.min(1,e)),.55);case"column":return(e<.82?1:Math.sqrt(Math.max(0,(1-e)/.18)))*(.65+.35*Math.sin(Math.PI*e));case"spread":return Math.pow(Math.sin(Math.PI*Math.pow(Math.min(1,e),.6)),.45);case"dome":return Math.sqrt(Math.max(0,1-Math.pow(e,1.6)))*(.7+.3*Math.min(1,e*4));default:return Math.pow(Math.sin(Math.PI*Math.pow(Math.min(1,e),.85)),.7)}}class Lf{constructor(){this.x=[],this.y=[],this.z=[],this.parent=[],this.r=[],this.kids=[]}add(e,t,n,i){const r=this.x.length;return this.x.push(e),this.y.push(t),this.z.push(n),this.parent.push(i),this.kids.push([]),i>=0&&this.kids[i].push(r),r}get n(){return this.x.length}}function L1(s,e){const t=e.range(s.h[0],s.h[1]),n=t*e.range(s.base[0],s.base[1]),i=t*e.range(s.width[0],s.width[1])*.5,r=e.range(-1,1)*t*.04,o=e.range(-1,1)*t*.04,a=e.int(1e4),c=[],l=3+e.int(4);for(let N=0;N<l;N++){const F=e.range(.25,.85),V=mu(s.shape,F),G=e.next()*In,B=i*V*e.range(.25,.8);c.push([Math.cos(G)*B+r*F,n+F*(t-n),Math.sin(G)*B+o*F,i*e.range(.42,.7)*(.6+.4*V)])}const h=[];let u=0;for(;h.length<s.points*3&&u++<6e4;){const N=e.next(),F=n+N*(t-n),V=mu(s.shape,N),G=e.next()*In,B=Math.sqrt(e.next())*i*V*1.12,$=Math.cos(G)*B+r*N,fe=Math.sin(G)*B+o*N;let ce=!1;for(const[Je,ct,tt,K]of c){const ne=$-Je,Se=(F-ct)*1.25,Le=fe-tt;if(ne*ne+Se*Se+Le*Le<K*K){ce=!0;break}}!ce&&e.next()>.18||.5+.5*c1($*.32+a,fe*.32+F*.27-a)<s.lumpy*e.next()*1.6||h.push($,F,fe)}const f=h.length/3,d=new Lf,m=Math.max(.36,t/42),x=n+(t-n)*(s.excurrent?s.excurrent:.12);let g=d.add(0,0,0,-1);const p=Math.max(3,Math.round(x/m));for(let N=1;N<=p;N++){const F=N/p;g=d.add(r*F*.6+e.range(-.04,.04),x*F,o*F*.6+e.range(-.04,.04),g)}const M=i*1.05+2.2,v=m*2.3,_=M*M,w=v*v,b=new Int32Array(f).fill(-1),y=new Float32Array(f).fill(1e9),A=new Uint8Array(f).fill(1),T=N=>{for(let F=0;F<f;F++){if(!A[F])continue;const V=h[F*3],G=h[F*3+1],B=h[F*3+2];for(let $=N;$<d.n;$++){const fe=V-d.x[$],ce=G-d.y[$],Re=B-d.z[$],Je=fe*fe+ce*ce+Re*Re;Je<y[F]&&(y[F]=Je,b[F]=$)}y[F]<w&&(A[F]=0)}};T(0);const S=new Float32Array(4096),L=new Float32Array(4096),D=new Float32Array(4096),z=new Uint16Array(4096);for(let N=0;N<90;N++){const F=d.n;if(F>4e3)break;S.fill(0,0,F),L.fill(0,0,F),D.fill(0,0,F),z.fill(0,0,F);let V=!1;for(let G=0;G<f;G++){if(!A[G]||y[G]>_)continue;const B=b[G],$=h[G*3]-d.x[B],fe=h[G*3+1]-d.y[B],ce=h[G*3+2]-d.z[B],Re=Math.sqrt($*$+fe*fe+ce*ce)||1;S[B]+=$/Re,L[B]+=fe/Re,D[B]+=ce/Re,z[B]++,V=!0}if(!V)break;for(let G=0;G<F;G++){if(!z[G])continue;let B=S[G]/z[G],$=L[G]/z[G]+s.up,fe=D[G]/z[G];s.droop&&d.y[G]>n&&($-=s.droop*Math.min(1,Math.hypot(d.x[G],d.z[G])/i)*.5),B+=e.range(-.12,.12),fe+=e.range(-.12,.12),$+=e.range(-.08,.08);const ce=Math.sqrt(B*B+$*$+fe*fe);ce<.05||d.add(d.x[G]+B/ce*m,d.y[G]+$/ce*m,d.z[G]+fe/ce*m,G)}if(d.n===F)break;T(F)}return{S:d,H:t,cb:n,cr:i,cx:r*.5,cz:o*.5,D:m}}function I1(s,e,t,n){for(let l=0;l<4;l++)for(let h=1;h<s.n;h++){const u=s.kids[h];if(!u.length)continue;const f=s.parent[h];let d=0,m=0,x=0;for(const g of u)d+=s.x[g],m+=s.y[g],x+=s.z[g];d/=u.length,m/=u.length,x/=u.length,s.x[h]=.5*s.x[h]+.25*(s.x[f]+d),s.y[h]=.5*s.y[h]+.25*(s.y[f]+m),s.z[h]=.5*s.z[h]+.25*(s.z[f]+x)}const i=new Float32Array(s.n),r=.011*(t/18);for(let l=s.n-1;l>=0;l--){const h=s.kids[l];if(!h.length){i[l]=r;continue}let u=0;for(const f of h)u+=Math.pow(i[f],2.35);i[l]=Math.pow(u,1/2.35)}const a=e.trunk*(t/18)/i[0],c=i[0];for(let l=0;l<s.n;l++){const h=.5+.5*Math.sqrt(i[l]/c);i[l]=Math.max(.006,i[l]*Math.pow(a,h))}s.r=i}function D1(s,e){const t=e.range(s.h[0],s.h[1]),n=t*e.range(s.base[0],s.base[1]),i=t*e.range(s.width[0],s.width[1])*.5,r=new Lf,o=e.range(-1,1)*.3,a=e.range(-1,1)*.3,c=[],l=Math.round(t/.8);let h=r.add(0,0,0,-1);c.push(h);for(let p=1;p<=l;p++){const M=p/l;h=r.add(o*M*M,t*M,a*M*M,h),c.push(h)}const u=s.conifer,f=u==="pine"?1.1:u==="larch"?.72:.62,d=[];let m=e.next()*In;for(let p=n;p<t-.6;p+=f*e.range(.8,1.2)){const M=(p-n)/(t-n),v=c[Math.min(c.length-1,Math.round(p/t*l))],_=u==="pine"?4+e.int(2):5+e.int(2);m+=.7+e.next();for(let w=0;w<_;w++){if(u==="pine"&&e.chance(.25))continue;const b=m+w/_*In+e.range(-.3,.3);let y=i*(u==="pine"?(.55+.45*(1-M))*e.range(.7,1.15):Math.pow(1-M,.95)*e.range(.85,1.15))+.25;const A=e.range(-.16,.12),T=u==="pine"?.18:u==="larch"?-.05:-.3,S=u==="spruce"?.25:.1,L=5;let D=v,z=r.x[v],N=p,F=r.z[v];const V=[];for(let G=1;G<=L;G++){const B=G/L,$=T+(S-T)*B*B+A*Math.sin(B*Math.PI);z+=Math.cos(b)*Math.cos($)*(y/L),F+=Math.sin(b)*Math.cos($)*(y/L),N+=Math.sin($)*(y/L),D=r.add(z,N,F,D),V.push(D)}d.push({pts:V,a:b,L:y,t:M})}}const x=new Float32Array(r.n),g=s.trunk*(t/20);for(let p=0;p<c.length;p++)x[c[p]]=Math.max(.03,g*Math.pow(1-p/c.length,.9));for(const p of d)p.pts.forEach((M,v)=>{x[M]=Math.max(.008,.06*Math.min(1,p.L/4)*(1-v/p.pts.length))});return r.r=x,{S:r,H:t,cb:n,cr:i,cx:o*.5,cz:a*.5,branches:d,trunkIdx:c}}class Ml{constructor(){this.p=[],this.n=[],this.uv=[],this.w=[],this.l=[],this.idx=[],this.v=0}vert(e,t,n,i,r,o,a,c,l,h,u,f=0,d=0,m=0){return this.p.push(e,t,n),this.n.push(i,r,o),this.uv.push(a,c),this.w.push(l,h,u),this.l.push(f,d,m),this.v++}geometry(e){const t=new wt;return t.setAttribute("position",new Ye(this.p,3)),t.setAttribute("normal",new Ye(this.n,3)),t.setAttribute("uv",new Ye(this.uv,2)),t.setAttribute("aWind",new Ye(this.w,3)),e&&t.setAttribute("aLeaf",new Ye(this.l,3)),t.setIndex(this.v>65535?new Kc(this.idx,1):new jc(this.idx,1)),t.computeBoundingSphere(),t}}const U1=.9,N1=1.8;function gu(s,e,t,n,i){const r=new Ml,o=[[0,-1]],a=new C,c=new C,l=new C,h=new C;for(;o.length;){const[u,f]=o.pop();if(s.r[u]<t)continue;const d=[];f>=0&&d.push(f);let m=u;for(;;){d.push(m);const w=s.kids[m];if(!w.length)break;let b=w[0];for(const y of w)s.r[y]>s.r[b]&&(b=y);for(const y of w)y!==b&&o.push([y,m]);if(s.r[b]<t)break;m=b}if(d.length<2)continue;const x=s.r[d[f>=0?1:0]],g=Math.max(3,Math.min(12,Math.round((x>.2?11:x>.08?8:x>.03?6:4)*n))),p=Math.max(1,Math.round(In*x/U1)),M=i.next()*In;let v=i.next()*3;c.set(0,0,0);let _=r.v;for(let w=0;w<d.length;w++){const b=d[w],y=d[Math.max(0,w-1)],A=d[Math.min(d.length-1,w+1)];a.set(s.x[A]-s.x[y],s.y[A]-s.y[y],s.z[A]-s.z[y]).normalize(),w===0?(h.set(Math.abs(a.y)<.9?0:1,Math.abs(a.y)<.9?1:0,0),c.crossVectors(a,h).normalize()):c.addScaledVector(a,-c.dot(a)).normalize(),l.crossVectors(a,c);let T=f>=0&&w===0?Math.min(s.r[b]*.85,s.r[d[1]]*1.15):s.r[b];if((b===0||f<0&&w<3)&&(T*=1+.28*Math.exp(-Math.max(0,s.y[b])/.7)),w===d.length-1&&!s.kids[b].length&&(T*=.3),w>0){const D=d[w-1];v+=Math.hypot(s.x[b]-s.x[D],s.y[b]-s.y[D],s.z[b]-s.z[D])/N1}const S=Math.max(0,s.y[b]/e),L=1-Math.min(1,s.r[b]/.12);for(let D=0;D<=g;D++){const z=D/g*In,N=Math.cos(z),F=Math.sin(z),V=c.x*N+l.x*F,G=c.y*N+l.y*F,B=c.z*N+l.z*F;r.vert(s.x[b]+V*T,s.y[b]+G*T,s.z[b]+B*T,V,G,B,D/g*p,v,S,L,M)}if(w>0){const D=_+(w-1)*(g+1),z=_+w*(g+1);for(let N=0;N<g;N++)r.idx.push(D+N,z+N,D+N+1,D+N+1,z+N,z+N+1)}}}return r.geometry(!1)}function If(s){const e=h1(s),t=e%Vi,n=Math.floor(e/Vi),i=.004;return[t/Vi+i,n/Dc+i,(t+1)/Vi-i,(n+1)/Dc-i]}function vo(s,e,t,n,i,r,o,a,c,l,h,u,f,d,m,x=1){const g=new C().crossVectors(r,i).normalize(),p=new C().crossVectors(g,r).normalize(),M=o*.5*x,v=o*.08,_=o*.92,[w,b,y,A]=a,T=c?y:w,S=c?w:y,L=[[-M,-v,T,A],[M,-v,S,A],[M,_,S,b],[-M,_,T,b]],D=s.v;for(const[z,N,F,V]of L){const G=e+g.x*z+p.x*N,B=t+g.y*z+p.y*N,$=n+g.z*z+p.z*N;s.vert(G,B,$,l.x,l.y,l.z,F,V,Math.max(0,B/d),1,m,h,u,f)}s.idx.push(D,D+1,D+2,D,D+2,D+3)}function xu(s,e,t,n,i,r){const o=new Ml;if(!i)return o.geometry(!0);const{H:a,cb:c,cr:l}=t,h=t.cx,u=c+(a-c)*.5,f=t.cz,d=(a-c)*.5,m=[];for(let _=1;_<s.n;_++)s.r[_]<.045&&s.y[_]>c*.85&&m.push(_);if(!m.length)return o.geometry(!0);const x=If(e.kind),g=new C,p=new C,M=new C,v=new C;for(let _=0;_<i;_++){const w=m[n.int(m.length)],b=s.parent[w],y=s.kids[w].length===0,A=.28,T=s.x[w]+n.range(-A,A),S=s.y[w]+n.range(-A,A),L=s.z[w]+n.range(-A,A);M.set((T-h)/l,(S-u)/d,(L-f)/l);const D=Math.min(1.2,M.length());M.normalize(),g.set(s.x[w]-s.x[b],s.y[w]-s.y[b],s.z[w]-s.z[b]).normalize(),g.lerp(M,.35).normalize(),p.set(M.x+n.range(-.9,.9),M.y+n.range(-.7,.9),M.z+n.range(-.9,.9)).normalize(),Math.abs(p.dot(g))>.92&&p.set(-g.z,g.x,g.y).normalize(),v.copy(M).lerp(p,.3).normalize();const z=Math.min(1,.35+.65*Math.pow(Math.min(1,D),1.4))*(.82+.18*Math.min(1,(S-c)/(a-c)+.3)),N=n.range(e.card[0],e.card[1])*r*(y?1:.88);vo(o,T,S,L,g,p,N,x,n.chance(.5),v,z,n.next(),Math.min(1,Math.max(0,(S-c)/(a-c)))*.7+.3*Math.min(1,D),a,n.next()*In)}return o.geometry(!0)}function vu(s,e,t,n,i,r){const o=new Ml,{H:a,cb:c,cr:l,branches:h}=t,u=If(e.kind),f=new C,d=new C,m=new C,x=new C,g=e.conifer==="pine"?1.3:1.05;let p=0;for(const v of h){const _=v.pts;for(let w=1;w<_.length;w++){if(p++%i)continue;const b=_[w],y=_[w-1];if(e.conifer==="pine"&&w<_.length-2)continue;f.set(s.x[b]-s.x[y],s.y[b]-s.y[y],s.z[b]-s.z[y]).normalize(),x.set(-f.z,0,f.x).normalize(),d.crossVectors(f,x).normalize(),d.y<0&&d.negate(),d.x+=n.range(-.25,.25),d.z+=n.range(-.25,.25),d.normalize();const A=s.x[b]-t.cx,T=s.z[b]-t.cz,S=Math.hypot(A,T)||1;m.set(A/S,.75,T/S).normalize();const D=.4+.6*Math.min(1,S/Math.max(.5,l*(1-(s.y[b]-c)/(a-c))+.3)),z=(s.y[b]-c)/(a-c),N=g*n.range(.85,1.15)*r,F=s.x[y],V=s.y[y],G=s.z[y];vo(o,F,V,G,f,d,N,u,n.chance(.5),m,D,n.next(),z,a,n.next()*In,.75),vo(o,F+f.x*.19,V+f.y*.19,G+f.z*.19,f,x,N*.95,u,n.chance(.5),m,D*.9,n.next(),z,a,n.next()*In,.75)}}const M=t.trunkIdx[t.trunkIdx.length-1];for(let v=0;v<3;v++){const _=v/3*Math.PI;d.set(Math.cos(_),0,Math.sin(_)),f.set(0,1,0),vo(o,s.x[M],s.y[M]-1.4,s.z[M],f,d,1.6*r,u,v%2===0,m.set(0,1,0),1,n.next(),1,a,n.next()*In,.6)}return o.geometry(!0)}function z1(s,e,t=!1){const n=qt[s],i=t?{...n,points:Math.round(n.points*1.5),cards:Math.round(n.cards*1.7),width:[n.width[0]*1.12,n.width[1]*1.12],base:[n.base[0]*.8,n.base[1]*.8],lumpy:n.lumpy*.8}:n,r=new o1(1e3+s*97+e*13);let o;i.conifer?o=D1(i,r):(o=L1(i,r),I1(o.S,i,o.H));const a=o.S,c=gu(a,o.H,Math.min(.027,a.r[0]*.12),.7,r),l=gu(a,o.H,Math.min(.075,a.r[0]*.4),.5,r);let h,u;return i.conifer?(h=vu(a,i,o,r,1,1.4),u=vu(a,i,o,r,2,1.8)):(h=xu(a,i,o,r,Math.round(i.cards*1.65),.78),u=xu(a,i,o,r,Math.round(i.cards*.5),1.3)),{skeleton:a,spId:s,variant:e,sp:i,H:o.H,crownBase:o.cb,crownR:o.cr,trunkR:a.r[0]*1.15,bark0:c,bark1:l,leaves0:h,leaves1:u}}const Df=[vt.SUGAR,vt.BIRCH,vt.OAK,vt.BEECH,vt.SPRUCE,vt.ASPEN,vt.LARCH,vt.GINKGO,vt.JAPANESE,vt.PINE,vt.SNAG,vt.HAZEL],F1=Df.length;function O1(s,e){const t=z1(Df[s],e),n=t.skeleton,i=[0,2,1,4,-1,5,-1,-1,6,-1,-1,7][s];if(i>=0)for(const u of[t.leaves0,t.leaves1]){const f=u.attributes.uv;for(let d=0;d<f.count;d++){const m=f.getX(d)*4%1,x=f.getY(d)*3%1;f.setXY(d,(i%4+m)/4,(2-Math.floor(i/4)-x)/2)}}if([4,6,9].includes(s))for(const u of[t.leaves0,t.leaves1]){const f=u.attributes.uv,d=[[.172,.022,.422,.322],[.643,.02,.958,.373],[.285,.407,.654,.786],[.629,.439,.977,.841]];for(let m=0;m<f.count;m++){const x=f.getX(m)*4%1,g=f.getY(m)*3%1,p=d[Math.floor(u.attributes.aLeaf.getY(m)*3.99)];f.setXY(m,p[0]+x*(p[2]-p[0]),1-p[1]-g*(p[3]-p[1]))}}const r=[];for(let u=1;u<n.n;u++){const f=n.parent[u],d=n.x[u]-n.x[f],m=n.y[u]-n.y[f],x=n.z[u]-n.z[f];n.y[u]>1.3&&n.y[u]<6.5&&n.r[u]>.025&&n.r[u]<.12&&Math.abs(m)<Math.hypot(d,x)*.7&&r.push({x:n.x[u],y:n.y[u]+n.r[u]*.8,z:n.z[u]})}const o=[];if([4,9].includes(s))for(let u=1;u<n.n;u++){const f=n.parent[u],d=n.x[u]-n.x[f],m=n.y[u]-n.y[f],x=n.z[u]-n.z[f],g=Math.hypot(d,m,x);if(n.y[u]<2.1||n.r[u]<.009||n.r[u]>.11||Math.abs(m)>Math.hypot(d,x)*.7||u%3)continue;const p=new an(1,9,5,0,Math.PI*2,0,Math.PI*.56),M=p.attributes.position;for(let v=0;v<M.count;v++){const _=M.getX(v),w=M.getY(v),b=M.getZ(v),y=1+Math.sin(_*6+b*5+u)*.1+Math.sin(b*8-_*3)*.07;M.setXYZ(v,_*y,w*y,b*y)}p.computeVertexNormals(),p.scale(.14+g*.2,.09+g*.075,g*.56+.16),p.rotateY(Math.atan2(d,x)),p.translate((n.x[u]+n.x[f])*.5,(n.y[u]+n.y[f])*.5+n.r[u]+.1,(n.z[u]+n.z[f])*.5),o.push(p)}const a=o.length?pl(o):null;o.forEach(u=>u.dispose());const c=[];let l=0;for(;l!==void 0;)c.push({x:n.x[l],y:n.y[l],z:n.z[l],r:n.r[l]}),l=n.kids[l].reduce((u,f)=>u===void 0||n.r[f]>n.r[u]?f:u,void 0);const h=(u,f)=>{const d=u.attributes.position.count,m=new Float32Array(d*3);for(let x=0;x<d;x++){const g=f?.32+.68*Math.pow(u.attributes.aLeaf.getX(x),.8):1,p=f?u.attributes.aLeaf.getY(x):.5;m[x*3]=g*(.91+p*.18),m[x*3+1]=g*(.85+p*.22),m[x*3+2]=g*(.78+p*.2)}return u.setAttribute("color",new yt(m,3)),u};return{species:s,perches:r,snow:a,near:{wood:h(t.bark0,!1),leaf:h(t.leaves0,!0),radius:t.trunkR,height:t.H,trunk:c},far:{wood:h(t.bark1,!1),leaf:h(t.leaves1,!0),radius:t.trunkR,height:t.H,trunk:c}}}function k1(s,e){const{r:t,out:n,point:i,tree:r,stone:o,plant:a,bed:c,ring:l,block:h,beam:u,log:f,wall:d,bench:m}=e,x=(v,_,w=2,b=.16,y=4,A=null)=>{const T=i(v,_);n.ice.push({...T,y:A??Ue(T.x,T.z)+y,length:w,radius:b})},g=(v=4,_=13,w=s.radius*.85,b=1)=>l(v,_,w,b),p=(v=4)=>{for(let _=0;_<19;_++){const w=_/19*He,b=1.55+t()*.25;r(Math.cos(w)*s.pondRX*b,Math.sin(w)*s.pondRZ*b,_%5===0?1:v,.7+t()*.55)}for(let _=0;_<17;_++){const w=_/17*He;o(Math.cos(w)*s.pondRX*1.12,Math.sin(w)*s.pondRZ*1.12,1.2+t()*1.6,.5+t(),1.3+t())}},M=(v,_,w=10,b=5,y=5)=>{const A=i(v,_),T=Ue(A.x,A.z);n.stones.push({...A,y:T-.25,sx:w,sy:b,sz:y,variant:1,rot:-s.angle,style:"arch"});for(const S of[-1,1])o(v+S*w*.44,_,w*.24,b*.45,y*1.13);for(let S=0;S<23;S++)x(v-w*.34+S*w*.68/22,_-y*.46,.65+t()*1.85,.06+t()*.09,b,T+b*.84)};switch(s.kind){case"blueice":p(1);for(let v=0;v<5;v++)r(-s.radius*.8+v*3,-s.radius*.62,4,.9+v*.1);m(s.pondRX*1.45,2);break;case"spruceisland":p(1),r(0,0,4,1.65),r(3,1,9,.55),o(-2,1,3,1.8,2.8),f(-s.pondRX*.9,s.pondRZ*.85,-s.pondRX*.4,s.pondRZ*1.2,.4);break;case"snowbirch":for(let v=-3;v<=3;v++)for(let _=-3;_<=3;_++)(Math.abs(v)>0||Math.abs(_)>1)&&r(v*7+t(),_*7+t(),1,.9+t()*.4);f(-16,-5,-12,9,.4),c("reed",45,23);break;case"frostwillows":for(let v=0;v<11;v++){const _=v/11*He;r(Math.cos(_)*16,Math.sin(_)*16,11,1.6+t()*.6)}o(-6,0,5,1.5,4),c("reed",70,24);break;case"sprucehall":for(let v=0;v<9;v++)for(const _ of[-1,1])r(_*(7+Math.sin(v*.7)*1.5),-24+v*6,4,1.35+t()*.22);for(let v=0;v<7;v++)o((v%2?1:-1)*12,-19+v*6,3,1.7,2.4);break;case"pinebowl":g(9,17,27,1.1),g(4,8,18,.7),f(-13,6,9,10,.65),c("berry",40,9,-7,-4);break;case"larchghosts":for(let v=0;v<17;v++)r(-24+v*3,Math.sin(v*.4)*7,6,.7+t()*.65);for(let v=0;v<8;v++)o(-20+v*5,12+t()*4,2.4,1.4,3);c("heather",60,26);break;case"redrowan":g(1,14,24,.85);for(let v=0;v<7;v++){const _=v/7*He;r(Math.cos(_)*11,Math.sin(_)*11,11,1.7),c("berry",22,3,Math.cos(_)*11,Math.sin(_)*11)}c("berry",60,18);break;case"icegrotto":M(0,4,15,6.6,8),o(0,12,12,7,5);for(let v=0;v<25;v++)x(-7+t()*14,9+t()*2,2+t()*3,.12+t()*.17,7);g(4,11,26,1.05);break;case"iceorgan":for(let v=0;v<25;v++){const _=-19+v*1.6,w=7+Math.sin(v*.37)*4,b=4+Math.sin(v*.13+1)*5;o(_,w,1.65,b,3,"column"),x(_,w-1.15,b*.8,.32,b,n.stones.at(-1).y+b*.8)}g(6,10,27,.9);break;case"frostarch":M(0,0,13,6,4.5),d(-7,0,-20,0,3),d(7,0,18,0,2),g(1,14,24,1.1),c("heather",55,22);break;case"windcolumns":for(let v=0;v<9;v++){const _=v*2.399,w=7+Math.sqrt(t())*14;o(Math.cos(_)*w,Math.sin(_)*w,2+t(),5+t()*6,2.5,"column")}for(let v=0;v<8;v++)r(-20+v*5,22,9,.55+t()*.3);break;case"snowdunes":for(let v=0;v<9;v++)r(-30+v*8,25+t()*6,9,.4+t()*.35),o(-25+v*6,-27+t()*3,1.6,.65,2.5);c("reed",35,33);break;case"sastrugi":for(let v=0;v<5;v++)f(-20+v*9,12,-15+v*9,19,.22);for(let v=0;v<8;v++)r(22,-25+v*7,9,.4+t()*.3);o(-10,-8,5,2.7,3);break;case"cornice":for(let v=0;v<19;v++){const _=.15+v/18*Math.PI*1.35;o(Math.cos(_)*21,Math.sin(_)*21,5,4+Math.sin(v*.17)*5,4)}r(-11,-8,9,1.3),r(-16,-12,9,.8),m(-7,-10);break;case"whitepass":for(let v=0;v<9;v++)for(const _ of[-1,1])o(_*(7+Math.sin(v*.8)*2),-24+v*6,6,5+t()*6,6),v%2===0&&r(_*14,-24+v*6,4,1.1);for(let v=0;v<15;v++)x(-5,-18+v*3,.8+t(),.1,4);break;case"hotspring":p(4),M(-s.pondRX*1.15,0,8,3.5,5),c("fern",65,8,-s.pondRX*1.4,1);for(let v=0;v<6;v++)o(s.pondRX*1.25,-6+v*2.5,2,1.1,2);break;case"thawgarden":p(1);for(let v=0;v<3;v++)d(-s.pondRX*1.3-v*2,-10,-s.pondRX*1.3-v*2,10,1+v);c("fern",80,7,-s.pondRX*1.55,0),r(s.pondRX*1.5,0,9,1.7);break;case"reedice":p(1);for(let v=0;v<190;v++){const _=t()*He,w=.75+t()*.43;a(Math.cos(_)*s.pondRX*w,Math.sin(_)*s.pondRZ*w,"reed",.8+t()*.6)}f(-20,-12,-13,2,.5);break;case"icebells":p(6);for(let v=0;v<18;v++){const _=.15+v/18*Math.PI*1.1,w=Math.cos(_)*s.pondRX*1.2,b=Math.sin(_)*s.pondRZ*1.2;o(w,b,3,3+t()*3,3),x(w,b-1,1.4+t()*2,.13,4.5,n.stones.at(-1).y+n.stones.at(-1).sy*.8)}break;case"snoworchard":for(let v=-3;v<=3;v++)for(let _=-2;_<=2;_++)t()>.2&&r(v*7,_*9,8,.65+t()*.22);d(-25,-23,25,-23,2),m(0,21),c("berry",55,27);break;case"winterhearth":d(-7,-7,-7,8,3),d(7,-7,7,8,2),d(-7,-7,7,-7,2);for(let v=0;v<11;v++)h(0,-7,2,.55,1.6,v*.53);g(4,13,25,1.1),f(3,12,13,16,.45);break;case"buriedchapel":d(-10,-17,-10,17,5),d(10,-17,10,17,4),d(-10,-17,10,-17,6),d(-10,17,-4,17,3),d(4,17,10,17,3);for(let v=0;v<7;v++)u(-10,-15+v*4,-10,-15+v*4,2.5,5,.11),u(10,-15+v*4,10,-15+v*4,2,4.5,.11);r(-15,-13,4,1.5),r(16,11,1,1.3);break;case"froststairs":for(let v=0;v<21;v++)if(h(0,-22+v*2,4.6,.2,2,.08),v%3===0)for(const _ of[-1,1])r(_*7,-22+v*2,4,.9+t()*.45);o(-6,18,5,4,4);break;case"fallenfir":f(-18,-4,16,6,1);for(let v=0;v<12;v++){const _=-16+v*2.6;u(_,-3+v*.7,_+2,(v%2?1:-1)*8+v*.5,.65,.15,.12)}g(4,15,27,1.25),c("berry",25,6,-10,11);break;case"rootcave":M(0,2,11,4.5,7),r(-6,1,2,1.65);for(let v=0;v<8;v++)u(-7,1,-12+Math.cos(v)*5,Math.sin(v)*8,1.5,.12,.22);g(4,9,25,1.1);break;case"deerhollow":for(let v=0;v<23;v++){const _=v/23*He;r(Math.cos(_)*30,Math.sin(_)*30,4,1.1+t()*.3)}c("berry",80,28),c("reed",45,11),f(-22,12,-10,20,.55);break;case"harewarren":for(let v=0;v<16;v++){const _=v*2.399,w=6+t()*18;r(Math.cos(_)*w,Math.sin(_)*w,4,.2+t()*.2),o(Math.cos(_)*w+1,Math.sin(_)*w,1.4,1,1.7)}c("berry",75,26);break;case"foxrocks":for(let v=0;v<3;v++)for(let _=0;_<6;_++)o(-16+_*6,-8+v*7,5.5,1.5+v*1.5,5);r(-21,10,9,1.1),g(1,8,26,.85);break;case"owlsentinel":r(-3,-4,10,2.2),r(6,2,4,1.4),g(4,14,30,1.15),f(-14,8,6,15,.65),c("reed",45,26);break;case"starpond":p(1);for(let v=0;v<5;v++){const _=v/5*He;o(Math.cos(_)*s.pondRX*1.25,Math.sin(_)*s.pondRZ*1.25,4,2.2,3),r(Math.cos(_)*s.radius,Math.sin(_)*s.radius,4,1.1)}break;case"icegarden":for(let v=0;v<21;v++){const _=v*2.399,w=5+Math.sqrt(t())*18,b=1+t()*4;o(Math.cos(_)*w,Math.sin(_)*w,2,b,2);for(let y=0;y<4;y++)x(Math.cos(_)*w+(y-1.5)*.36,Math.sin(_)*w-.8,b*.7,.1+t()*.1,b,n.stones.at(-1).y+b*.8)}g(6,9,28,.8);break;case"snowamphitheatre":for(let v=0;v<4;v++)for(let _=0;_<17;_++){const w=-.3+_/16*Math.PI*1.5,b=12+v*4;o(Math.cos(w)*b,Math.sin(w)*b,3.4,1.2+v*.35,3.4)}r(-9,-12,4,1.5),c("reed",35,30);break;case"silveravenue":for(let v=0;v<11;v++)for(const _ of[-1,1])r(_*(4.8+v*.13),-28+v*5.6,5,.9+t()*.35);o(-12,0,3,1.5,4),c("heather",60,27);break;case"cedarshelter":g(4,12,18,1.7),g(9,9,28,1),f(-9,5,9,8,.7),r(0,-9,4,1.55),c("berry",30,10);break;case"wintercairns":for(let v=0;v<7;v++)for(let _=0;_<5;_++){const w=i((v%2?1:-1)*6,-24+v*8);n.stones.push({...w,y:Ue(w.x,w.z)+_*.32,sx:1.3-_*.2,sy:.5,sz:1.2-_*.18,rot:t()*He,variant:_%4,style:"stack"})}for(let v=0;v<7;v++)r(22,-21+v*7,6,.7+t()*.4);break;case"frostfen":for(let v=0;v<260;v++){const _=t()*He,w=.85+t()*.45;a(Math.cos(_)*s.pondRX*w,Math.sin(_)*s.pondRZ*w,"reed",.8+t())}for(let v=0;v<9;v++)r(-s.radius*.8+v*7,s.radius*.65,1,.65+t()*.45);break;case"snowbridge":p(1);for(let v=0;v<25;v++){const _=i(0,-s.pondRZ*1.4+v*s.pondRZ*2.8/24);n.decks.push({..._,y:Math.max(s.water+.38,Ue(_.x,_.z)+.08),w:2.7,h:.22,d:s.pondRZ*2.8/24+.06,rot:-s.angle})}for(let v=0;v<9;v++)for(const _ of[-1,1]){const w=i(_*1.4,-s.pondRZ*1.35+v*s.pondRZ*2.7/8);n.beams.push({a:[w.x,s.water-.1,w.z],b:[w.x,s.water+1.1,w.z],r:.065})}break;case"moonstones":for(let v=0;v<7;v++){const _=v/7*He;o(Math.cos(_)*14,Math.sin(_)*14,2.3,3.5+v*.4,1.7)}g(1,21,28,1),c("heather",40,22);break;case"lastleaves":g(4,13,27,1.1);for(let v=0;v<7;v++){const _=v/7*He;r(Math.cos(_)*11,Math.sin(_)*11,3,.95)}c("berry",95,23),m(0,9);break;default:throw new Error("Winter arrangement missing: "+s.kind)}s.pond||c(s.type===5?"heather":"reed",18,s.radius*.9)}const gs=new Map;function B1(s){if(gs.has(s.id))return gs.get(s.id);const e=Fn(s.seed),t={trees:[],stones:[],logs:[],blocks:[],beams:[],plants:[],fungi:[],ice:[],decks:[]},n=(x,g)=>({x:s.x+x*s.ca-g*s.sa,z:s.z+x*s.sa+g*s.ca}),i=(x,g,p,M=1)=>{const v=n(x,g),_=Ue(v.x,v.z);_<zt(v.x,v.z)+.12||ji(v.x,v.z).y<.72||Cf(v.x,v.z)<3.5||t.trees.push({...v,y:_-.05,species:p,scale:M,rot:e()*He,variant:Math.floor(e()*3),color:e(),id:s.id+":authored:"+t.trees.length})},r=(x,g,p=2,M=p*.7,v=p,_="scan")=>{const w=n(x,g),b=Math.min(...[[0,0],[-p*.38,-v*.38],[p*.38,-v*.38],[-p*.38,v*.38],[p*.38,v*.38]].map(([y,A])=>Ue(w.x+y,w.z+A)));t.stones.push({...w,y:b-.1,sx:p,sy:M,sz:v,rot:e()*He,variant:Math.floor(e()*4),style:_})},o=(x,g,p="fern",M=1)=>{const v=n(x,g),_=Ue(v.x,v.z);_<zt(v.x,v.z)-.25&&p!=="reed"||t.plants.push({...v,y:_,kind:p,scale:M,rot:e()*He})},a=(x,g,p,M=0,v=0)=>{for(let _=0;_<g;_++){const w=e()*He,b=Math.sqrt(e())*p;o(M+Math.cos(w)*b,v+Math.sin(w)*b,x,.55+e()*.9)}},c=(x,g,p,M=1)=>{for(let v=0;v<g;v++){const _=v/g*He+(e()-.5)*.17,w=p*(.9+e()*.18);i(Math.cos(_)*w,Math.sin(_)*w,x,M*(.85+e()*.3))}},l=(x,g,p,M,v,_=0,w=0)=>{const b=n(x,g),y=Ue(b.x,b.z);t.blocks.push({...b,y:y+_+M*.5-.06,w:p,h:M,d:v,rot:-s.angle+w})},h=(x,g,p,M,v=.5,_=v,w=.12)=>{const b=n(x,g),y=n(p,M);t.beams.push({a:[b.x,Ue(b.x,b.z)+v,b.z],b:[y.x,Ue(y.x,y.z)+_,y.z],r:w})},u=(x,g,p,M,v=.6,_=!1)=>{const w=n(x,g),b=n(p,M);t.logs.push({x:w.x,z:w.z,ex:b.x,ez:b.z,r:v,hollow:_})},f=(x,g,p=12,M=3)=>{for(let v=0;v<p;v++){const _=e()*He,w=Math.sqrt(e())*M,b=n(x+Math.cos(_)*w,g+Math.sin(_)*w);t.fungi.push({...b,y:Ue(b.x,b.z),scale:.16+e()*.25,color:e()})}},d=(x,g,p,M,v=2)=>{const _=Math.ceil(Math.hypot(p-x,M-g)/1.05),w=-Math.atan2(M-g,p-x);for(let b=0;b<v;b++)for(let y=0;y<_;y++){const A=(y+.5+b%2*.3)/_;A>1||e()<b*.14||l(x+(p-x)*A,g+(M-g)*A,1.08,.48,.62,b*.46,w+(e()-.5)*.05)}},m=(x,g)=>{for(let p=0;p<4;p++)h(x-1.4,g+p*.12,x+1.4,g+p*.12,.52,.52,.085);for(const p of[-1,1])h(x+p,g,x+p,g,.02,.48,.12),h(x+p,g+.42,x+p,g+.42,.02,1,.07);h(x-1.4,g+.45,x+1.4,g+.45,.88,.88,.1)};if(s.winter)k1(s,{r:e,out:t,point:n,tree:i,stone:r,plant:o,bed:a,ring:c,block:l,beam:h,log:u,wall:d,bench:m});else switch(s.kind){case"mirrorpond":case"island":case"cedarpond":case"spring":case"reedmarsh":{const x=s.kind==="cedarpond"?4:s.kind==="spring"?1:0,g=s.kind==="spring"?9:15;for(let p=0;p<g;p++){const M=p/g*He,v=1.42+e()*.25;i(Math.cos(M)*s.pondRX*v,Math.sin(M)*s.pondRZ*v,p%4===0?1:x,.82+e()*.38)}s.kind==="island"&&(i(0,0,8,1.4),i(2,-1,1,.7),r(0,1,2.2,1.2,2));for(let p=0;p<14;p++){const M=e()*He;r(Math.cos(M)*s.pondRX*1.15,Math.sin(M)*s.pondRZ*1.15,.6+e()*1.7,.45+e()*.9,1+e())}for(let p=0;p<(s.kind==="reedmarsh"?150:55);p++){const M=e()*He,v=.96+e()*.15;o(Math.cos(M)*s.pondRX*v,Math.sin(M)*s.pondRZ*v,"reed",.65+e()*.8)}u(-s.pondRX*.8,s.pondRZ*.85,-s.pondRX*.28,s.pondRZ*1.2,.32),a("fern",35,7,-s.pondRX*1.4,0),s.kind==="mirrorpond"&&m(s.pondRX*1.3,4);break}case"birchhall":case"aspenwheel":{const x=s.kind==="birchhall"?1:5;for(let g=0;g<34;g++){const p=g*2.399,M=5+Math.sqrt(e())*20;i(Math.cos(p)*M,Math.sin(p)*M,x,.85+e()*.42)}a("fern",70,23),u(-12,10,-4,14,.36),f(-6,13);break}case"scarletaisle":for(let x=0;x<9;x++)for(const g of[-1,1])i(g*(5+Math.sin(x*.8)*1.4),-23+x*5,8,1.25+e()*.55);a("berry",45,23);break;case"beechcathedral":c(3,7,15,1.55),i(-3,-6,3,1.65),a("fern",75,23),f(7,8,25,5);break;case"ginkgo":c(7,9,13,1.15),i(-4,1,7,1.3),a("gold",55,22),f(3,-9);break;case"orchard":for(let x=-2;x<=2;x++)for(let g=-2;g<=2;g++)e()>.18&&i(x*8+(e()-.5)*2,g*8+(e()-.5)*2,8,.7+e()*.35);d(-21,-18,-21,18,1),a("flower",90,24),m(6,0);break;case"ferngully":for(let x=0;x<8;x++)for(const g of[-1,1])r(g*(6+e()*2),-19+x*5,3+e()*2,1.3+e()*2,2.8),i(g*12,-20+x*6,x%3===0?4:3,.7+e()*.5);a("fern",180,24),u(-8,-5,8,1,.7),f(-7,-4,20,3);break;case"mossgrotto":{for(const p of[-1,1])r(p*5,1,6,6,8),r(p*7,7,7,4,6),i(p*11,-3,3,1.3);const x=n(0,4),g=Ue(x.x,x.z);t.stones.push({...x,y:g+4.5,sx:13,sy:2.2,sz:6,rot:-s.angle,variant:1,style:"lintel"}),r(0,10,10,7,5),a("fern",120,15,0,-1),f(4,5,30,4);break}case"splitrock":r(-3.6,0,6.3,7.7,9),r(3.8,1,6.6,8.8,9),r(-5,7,3.4,2.2,4),a("fern",50,12),c(4,8,22,.9);break;case"bouldergarden":for(let x=0;x<18;x++){const g=x*2.399,p=5+e()*18;r(Math.cos(g)*p,Math.sin(g)*p,2+e()*7,1.4+e()*5,2+e()*4)}a("heather",110,26),c(6,12,25,1);break;case"basalt":for(let x=0;x<26;x++){const g=-18+x*1.4,p=5+Math.sin(x*.42)*4;r(g,p,1.4,2+e()*7,1.5,"column")}a("heather",100,22),c(6,9,26,1);break;case"overlook":case"heather":case"larchridge":case"cairntrail":{const x=s.kind==="larchridge"?6:9;for(let g=0;g<12;g++){const p=1.2+g*.3;i(Math.cos(p)*26,Math.sin(p)*23,x,.7+e()*.6)}a("heather",170,27);for(let g=0;g<7;g++)r(-13+g*4,9+Math.sin(g)*4,2+e()*2,.7+e()*1.8,2.1);if(s.kind==="overlook"&&m(-4,-7),s.kind==="cairntrail")for(let g=0;g<5;g++)for(let p=0;p<4;p++){const M=n((g%2?1:-1)*5,-16+g*8),v=Ue(M.x,M.z);t.stones.push({...M,y:v+p*.24,sx:1-p*.18,sy:.45,sz:1-p*.18,variant:p%4,rot:e()*He,style:"stack"})}break}case"standingstones":for(let x=0;x<10;x++){const g=x/10*He;r(Math.cos(g)*11,Math.sin(g)*11,1.4,3+e()*2,1.2)}c(0,11,26,1.1),f(0,0,35,5);break;case"stonearch":{const x=n(0,0),g=Ue(x.x,x.z),p=3.1;for(const M of[-1,1])for(let v=0;v<5;v++){const _=n(M*p,0);t.blocks.push({..._,y:g+v*.61+.3,w:.85,h:.65,d:1.35,rot:-s.angle})}for(let M=0;M<13;M++){const v=M/12*Math.PI,_=n(Math.cos(v)*p,0);t.blocks.push({..._,y:g+2.75+Math.sin(v)*p,w:.82,h:.8,d:1.3,rot:-s.angle,roll:v-Math.PI/2})}d(-3,-.3,-15,-.3,3),d(3,0,13,0,2),a("fern",70,20),i(-12,7,8,1.6),c(0,10,25,1.1);break}case"ruinedgarden":d(-12,-13,-12,13,3),d(12,-13,12,13,2),d(-12,-13,12,-13,4),d(-12,13,-4,13,2),d(4,13,12,13,2);for(const x of[-1,1])for(let g=0;g<3;g++)i(x*7,-7+g*7,8,.8),a("flower",28,3,x*7,-7+g*7);a("fern",70,23),m(0,-8);break;case"hearthruin":d(-6,-5,-6,6,3),d(6,-5,6,6,2),d(-6,-5,6,-5,3);for(let x=0;x<6;x++)l(-1,-5,2.8,.56,1.5,x*.54);a("fern",80,18),f(4,-4,15),i(10,6,3,1.4);break;case"oldsteps":for(let x=0;x<14;x++)l(0,-10+x*1.45,4.4,.22,1.45,.06),r(-3.4,-10+x*1.45,1.2,.7,1.5);a("fern",100,22),i(0,16,3,1.4);break;case"hollowgiant":u(-12,-2,11,4,1.5,!0),i(-17,-3,3,1.7),a("fern",110,22),f(7,5,38,4);break;case"windfall":for(let x=0;x<6;x++)u(-17+x*5,-7+e()*7,-12+x*5,4+e()*9,.4+e()*.5);c(3,10,28,1.2),a("flower",110,27),f(-6,4,24,5);break;case"leafbowl":c(0,15,23,1.2),c(8,7,14,.9),u(8,-4,13,5,.45),f(-8,8,20,3);break;case"mushroomring":c(3,8,21,1.15);for(let x=0;x<45;x++){const g=x/45*He,p=n(Math.cos(g)*6.5,Math.sin(g)*6.5);t.fungi.push({...p,y:Ue(p.x,p.z),scale:.19+e()*.24,color:e()})}a("fern",90,24),u(-15,-5,-9,4,.6);break;case"berrycopse":c(0,11,25,.85),a("berry",130,24),i(0,0,11,2.2),f(9,5);break;case"meadowoak":case"silvermeadow":i(-6,-4,s.kind==="meadowoak"?2:5,1.65),c(5,15,34,1),a("flower",150,31);for(let x=0;x<6;x++)r(-15+e()*30,-20+e()*40,1+e(),.6,1.4);break;case"rootgate":i(-2,0,3,2.1),i(4,2,3,1.7),u(-7,5,9,7,.7),a("fern",150,26),f(0,4,40,8);break;case"amphitheatre":for(let x=0;x<3;x++)for(let g=0;g<13;g++){const p=.2+g/12*Math.PI*1.6,M=10+x*4;r(Math.cos(p)*M,Math.sin(p)*M,2.6,1+x*.3,2)}c(8,14,29,1.25),a("flower",100,25);break;case"maplegarden":c(8,12,16,1.15),i(0,-3,8,1.5);for(let x=0;x<8;x++)r(-14+x*4,9+Math.sin(x)*3,1.8,.9,1.4);a("fern",95,23),m(0,10);break;case"pineglade":c(9,12,23,1.15),i(-3,-2,9,1.5),a("gold",75,22),u(-8,5,4,9,.55),f(-4,5,30,5);break}return s.winter||a(s.type===5?"heather":s.type===0?"flower":"fern",24,s.radius*1.1),gs.set(s.id,t),gs.size>180&&gs.delete(gs.keys().next().value),t}function H1(s,e){const t=e*yn+45+Ve(s,e,732)*32,n=Ns(t,s),i=Sn(n,t),r=i.width+7;return{id:s+":"+e,x:n,z:t,half:r,left:Ue(n-r,t)+.05,right:Ue(n+r,t)+.05,level:i.level}}function Ua(s,e){const t=Math.max(0,Math.min(1,(e-s.x+s.half)/(2*s.half)));return s.left+(s.right-s.left)*t+Math.sin(t*Math.PI)*.75}const er=new C;function xn(s,e,t,n,i,r){const o=2*Math.PI*i/4,a=Math.max(r-2*i,0),c=Math.PI/4;er.copy(e),er[n]=0,er.normalize();const l=.5*o/(o+a),h=1-er.angleTo(s)/c;return Math.sign(er[t])===1?h*l:a/(o+a)+l+l*(1-h)}class wl extends Fs{constructor(e=1,t=1,n=1,i=2,r=.1){const o=i*2+1;if(r=Math.min(e/2,t/2,n/2,r),super(1,1,1,o,o,o),this.type="RoundedBoxGeometry",this.parameters={width:e,height:t,depth:n,segments:i,radius:r},o===1)return;const a=this.toNonIndexed();this.index=null,this.attributes.position=a.attributes.position,this.attributes.normal=a.attributes.normal,this.attributes.uv=a.attributes.uv;const c=new C,l=new C,h=new C(e,t,n).divideScalar(2).subScalar(r),u=this.attributes.position.array,f=this.attributes.normal.array,d=this.attributes.uv.array,m=u.length/6,x=new C,g=.5/o;for(let p=0,M=0;p<u.length;p+=3,M+=2)switch(c.fromArray(u,p),l.copy(c),l.x-=Math.sign(l.x)*g,l.y-=Math.sign(l.y)*g,l.z-=Math.sign(l.z)*g,l.normalize(),u[p+0]=h.x*Math.sign(c.x)+l.x*r,u[p+1]=h.y*Math.sign(c.y)+l.y*r,u[p+2]=h.z*Math.sign(c.z)+l.z*r,f[p+0]=l.x,f[p+1]=l.y,f[p+2]=l.z,Math.floor(p/m)){case 0:x.set(1,0,0),d[M+0]=xn(x,l,"z","y",r,n),d[M+1]=1-xn(x,l,"y","z",r,t);break;case 1:x.set(-1,0,0),d[M+0]=1-xn(x,l,"z","y",r,n),d[M+1]=1-xn(x,l,"y","z",r,t);break;case 2:x.set(0,1,0),d[M+0]=1-xn(x,l,"x","z",r,e),d[M+1]=xn(x,l,"z","x",r,n);break;case 3:x.set(0,-1,0),d[M+0]=1-xn(x,l,"x","z",r,e),d[M+1]=1-xn(x,l,"z","x",r,n);break;case 4:x.set(0,0,1),d[M+0]=1-xn(x,l,"x","y",r,e),d[M+1]=1-xn(x,l,"y","x",r,t);break;case 5:x.set(0,0,-1),d[M+0]=xn(x,l,"x","y",r,e),d[M+1]=1-xn(x,l,"y","x",r,t);break}}static fromJSON(e){return new wl(e.width,e.height,e.depth,e.segments,e.radius)}}function Gi(s,e){const t=new Me(e),n=new Float32Array(s.attributes.position.count*3);for(let i=0;i<n.length;i+=3)n[i]=t.r,n[i+1]=t.g,n[i+2]=t.b;return s.setAttribute("color",new yt(n,3)),s}function V1(s){const e=s.map(n=>n.index?n.toNonIndexed():n),t=pl(e);return new Set([...s,...e]).forEach(n=>n.dispose()),t}function G1(){const s=new rf;s.moveTo(-.5,-.12),s.lineTo(-.51,.42),s.bezierCurveTo(-.53,.83,-.27,1.02,0,1),s.bezierCurveTo(.3,1.03,.54,.83,.5,.41),s.lineTo(.5,-.12),s.lineTo(.28,-.12),s.lineTo(.28,.37),s.bezierCurveTo(.28,.62,.17,.74,0,.73),s.bezierCurveTo(-.18,.75,-.28,.6,-.28,.36),s.lineTo(-.28,-.12),s.closePath();const e=new ol(s,{depth:1,steps:2,curveSegments:12,bevelEnabled:!0,bevelThickness:.035,bevelSize:.028,bevelSegments:3});e.translate(0,0,-.5);const t=e.attributes.position;for(let n=0;n<t.count;n++){const i=t.getX(n),r=t.getY(n),o=t.getZ(n);t.setXYZ(n,i+Math.sin(r*17+o*7)*.008,r+Math.sin(i*21+o*5)*.015,o+Math.sin(i*19+r*13)*.018)}return e.computeVertexNormals(),Gi(e,13748661)}function co(s){const e=new hi,t=Fn(s==="reed"?712:s==="berry"?241:517),n=[];for(let i=0;i<(s==="reed"?8:s==="berry"?7:12);i++){const r=t()*He,o=t()*.38,a=Math.cos(r)*o,c=Math.sin(r)*o,l=s==="reed"?.65+t()*.7:.19+t()*.43;if(e.tube([a,0,c],[a+Math.sin(r)*.12,l,c+Math.cos(r)*.12],.008,.002,3,[.35,.39,.17]),s==="reed"){for(let h=0;h<4;h++){const u=l*(.1+h*.16),f=r+h*2.4,d=Math.cos(f),m=Math.sin(f),x=.23+t()*.28;for(let g=0;g<5;g++){const p=g/5,M=(g+1)/5,v=(_,w)=>[a+d*_*x-m*w*.017*(1-_),u+Math.sin(_*2)*x*.7,c+m*_*x+d*w*.017*(1-_)];e.quad(v(p,-1),v(p,1),v(M,1),v(M,-1),[-m,.6,d],[0,p,1,M],[.43,.46,.24])}}if(i%3===0){const h=new nl(.022,.14,3,7);h.translate(a+Math.sin(r)*.12,l-.045,c+Math.cos(r)*.12),n.push(Gi(h,6770747))}}else{for(let h=0;h<4;h++){const u=l*(.25+h*.18),f=r+h*2.4,d=Math.sin(f)*.1,m=Math.cos(f)*.1;e.quad([a-.012,u,c],[a+.012,u,c],[a+d+.025,u+.07,c+m],[a+d-.025,u+.07,c+m],[0,.7,1],[0,0,1,1],s==="berry"?[.3,.38,.11]:[.37,.38,.17])}for(let h=0;h<5;h++){const u=new Do(s==="berry"?.026:.028,0);u.scale(1,s==="heather"?1.9:1,1),u.translate(a+Math.sin(r)*.12+Math.sin(h*2.4)*.04,l-h*.032,c+Math.cos(r)*.12+Math.cos(h*2.4)*.04),n.push(Gi(u,s==="berry"?13847337:s==="heather"?9597842:13617056))}}}return n.push(e.geometry()),V1(n)}class W1{constructor(e){this.w=e,this.box=new wl(1,1,1,2,.08),Gi(this.box,13748661),this.reed=co("reed"),this.heather=co("heather"),this.flower=co("flower"),this.berry=co("berry"),this.plantMaterial=yi(new Dt({vertexColors:!0,roughness:.96,side:Et}),.2,!0,!0),this.stemMaterial=new Dt({color:14075813,roughness:.95}),this.stem=new wi(.09,.12,.8,7),this.stem.translate(0,.4,0),this.cap=new al([new le(0,1),new le(.22,.99),new le(.46,.86),new le(.53,.69),new le(.48,.62),new le(.12,.71)],14),Gi(this.cap,16777215),this.sphere=new an(1,12,8),this.loaded=[],this.icicle=new wi(1,.018,1,7,4),this.icicle.translate(0,-.5,0),xs(this.plantMaterial,"plant")}draw(e,t){const n=this.w,i=_l(e,t,175),r=[],o=[],a=[],c=[],l=[],h=[],u=[],f=[];this.loaded=i.map(y=>({id:y.id,name:y.name,kind:y.kind,x:y.x,z:y.z}));for(const y of i){const A=B1(y);u.push(...A.ice),f.push(...A.decks),r.push(...A.stones),o.push(...A.blocks),a.push(...A.beams),c.push(...A.logs),l.push(...A.plants.filter(T=>Math.hypot(T.x-e,T.z-t)<75)),h.push(...A.fungi.filter(T=>Math.hypot(T.x-e,T.z-t)<42))}n.instance(this.box,n.m.wood,f,(y,A)=>{A.position.set(y.x,y.y,y.z),A.rotation.y=y.rot,A.scale.set(y.w,y.h,y.d)},!0);const d=[];for(let y=0;y<n.m.rockParts.length;y++){const A=n.m.rockParts[y],T=n.instance(A.geometry,A.material,r.filter(S=>S.variant%n.m.rockParts.length===y&&S.style!=="column"&&S.style!=="arch"),(S,L)=>{L.position.set(S.x,S.y,S.z),L.rotation.y=S.rot,L.scale.set(S.sx,S.sy/Math.max(.1,A.height),S.sz)},!0);T&&d.push(T)}const m=n.instance(this.box,n.m.stone,r.filter(y=>y.style==="column"),(y,A)=>{A.position.set(y.x,y.y+y.sy*.5-.2,y.z),A.rotation.y=y.rot,A.scale.set(y.sx,y.sy,y.sz)},!0);m&&d.push(m),this.arch??=G1();const x=r.filter(y=>y.style==="arch"),g=n.instance(this.arch,n.m.stone,x,(y,A)=>{A.position.set(y.x,y.y,y.z),A.rotation.y=y.rot,A.scale.set(y.sx,y.sy,y.sz)},!0);g&&d.push(g);const p=new zm,M=[];for(const y of d)y.updateWorldMatrix(!0,!1);for(const y of u){p.set(new C(y.x,y.y+12,y.z),new C(0,-1,0));const A=Ue(y.x,y.z),T=p.intersectObjects(d,!1).find(S=>S.point.y>A+1.3&&Math.abs(S.point.y-y.y)<4);T&&M.push({...y,y:T.point.y-.04,length:Math.min(y.length,T.point.y-A-.2)})}n.instance(this.icicle,n.m.ice,M,(y,A)=>{A.position.set(y.x,y.y,y.z),A.scale.set(y.radius,y.length,y.radius)},!0);for(const y of r)if(y.style==="arch")for(const A of[-1,1])n.colliders.push({x:y.x+Math.cos(y.rot)*y.sx*.39*A,z:y.z-Math.sin(y.rot)*y.sx*.39*A,r:Math.min(y.sx*.17,y.sz*.48),topY:y.y+y.sy});else y.style!=="lintel"&&n.colliders.push({x:y.x,z:y.z,r:Math.min(y.sx,y.sz)*.46,topY:y.y+y.sy});n.instance(this.box,n.m.stone,o,(y,A)=>{A.position.set(y.x,y.y,y.z),A.rotation.set(0,y.rot,y.roll||0),A.scale.set(y.w,y.h,y.d)},!0);for(const y of o)n.colliders.push({x:y.x,z:y.z,r:Math.min(y.w,y.d)*.47,topY:y.y+y.h*.5,bottomY:y.y-y.h*.5});const v=new hi;for(const y of a){v.tube(y.a,y.b,y.r,y.r*.93,7,[.7,.65,.5]);const A=Math.hypot(y.b[0]-y.a[0],y.b[2]-y.a[2]),T=Math.max(1,Math.ceil(A/.5));for(let S=0;S<=T;S++){const L=S/T,D=Ke(y.a[0],y.b[0],L),z=Ke(y.a[2],y.b[2],L);n.colliders.push({x:D,z,r:y.r+.17,topY:Ke(y.a[1],y.b[1],L)+y.r,bottomY:Ke(y.a[1],y.b[1],L)-y.r})}}for(const y of c){const A=Ue(y.x,y.z)+y.r*.72,T=Ue(y.ex,y.ez)+y.r*.72;if(bf(n.logEnds,[y.x,A,y.z],[y.ex,T,y.ez],y.r,y.r*.88,y.hollow),y.hollow){const S=new C(y.ex-y.x,T-A,y.ez-y.z),L=S.length(),D=new bn().setFromUnitVectors(new C(0,1,0),S.normalize()),z=new wi(y.r*.88,y.r,L,18,1,!0),N=z.attributes.uv;for(let ce=0;ce<N.count;ce++)N.setXY(ce,N.getX(ce)*y.r*5,N.getY(ce)*L*.52);Gi(z,16777215),z.applyQuaternion(D),z.translate((y.x+y.ex)*.5,(A+T)*.5,(y.z+y.ez)*.5);const F=n.m.trunk.clone();F.side=Et;const V=new st(z,F);V.castShadow=V.receiveShadow=!0,V.userData.ownGeometry=!0,V.userData.ownMaterial=!0,n.draw.add(V);const G=new wi(y.r*.88*.76,y.r*.76,L,18,1,!0),B=G.attributes.uv;for(let ce=0;ce<B.count;ce++)B.setXY(ce,B.getX(ce)*y.r*5,B.getY(ce)*L*.52);Gi(G,10194549),G.applyQuaternion(D),G.translate((y.x+y.ex)*.5,(A+T)*.5,(y.z+y.ez)*.5);const $=n.m.trunk.clone();$.side=Wt;const fe=new st(G,$);fe.receiveShadow=!0,fe.userData.ownGeometry=fe.userData.ownMaterial=!0,n.draw.add(fe);for(let ce=0;ce<=1;ce+=.05)for(const Re of[-1,1])n.colliders.push({x:Ke(y.x,y.ex,ce)+S.z*y.r*.85*Re,z:Ke(y.z,y.ez,ce)-S.x*y.r*.85*Re,r:.26})}else{v.tube([y.x,A,y.z],[y.ex,T,y.ez],y.r,y.r*.83,12,[.65,.69,.52]);for(let S=0;S<=1;S+=.09)n.colliders.push({x:Ke(y.x,y.ex,S),z:Ke(y.z,y.ez,S),r:y.r+.2,topY:Ke(A,T,S)+y.r})}if(!y.hollow)for(let S=0;S<5;S++){const L=.15+S*.14,D=Ke(y.x,y.ex,L),z=Ke(y.z,y.ez,L),N=Ke(A,T,L);v.tube([D,N,z],[D+Math.sin(S*9)*1.4,N+.4,z+Math.cos(S*9)*1.4],y.r*.2,.025,6,[.55,.58,.44])}}n.bridges=[];const _=Math.round(e/Ti),w=Math.round((t-60)/yn);for(let y=_-1;y<=_+1;y++)for(let A=w-1;A<=w+1;A++){const T=H1(y,A);if(Math.hypot(T.x-e,T.z-t)>175)continue;n.bridges.push(T);const S=Math.ceil(T.half*2/.28);for(let L=0;L<=S;L++){const D=T.x-T.half+L/S*T.half*2,z=Ua(T,D);for(let N of[-1,1])if(L%9===0&&(v.tube([D,z-.25,T.z+N*1.35],[D,z+1,T.z+N*1.35],.075,.065,7,[.8,.75,.6]),n.colliders.push({x:D,z:T.z+N*1.47,r:.25})),L<S){const F=T.x-T.half+(L+1)/S*T.half*2;v.tube([D,z+.82,T.z+N*1.35],[F,Ua(T,F)+.82,T.z+N*1.35],.055,.055,5,[.75,.7,.57])}o.push({x:D,z:T.z,y:z-.05,w:.29,h:.16,d:2.55,rot:0,bridge:!0})}}this.walkable=[...o.filter(y=>!y.bridge&&y.h<.4),...f],n.instance(this.box,n.m.wood,o.filter(y=>y.bridge),(y,A)=>{A.position.set(y.x,y.y,y.z),A.scale.set(y.w,y.h,y.d)},!0);const b=new st(v.geometry(),n.m.trunk);b.castShadow=b.receiveShadow=!0,b.userData.ownGeometry=!0,n.draw.add(b);for(const y of["reed","heather","flower","berry"])n.instance(this[y],this.plantMaterial,l.filter(A=>A.kind===y),(A,T)=>{T.position.set(A.x,A.y-.02,A.z),T.rotation.y=A.rot,T.scale.setScalar(A.scale)},!1);n.instance(n.ferns,n.m.fern,l.filter(y=>y.kind==="fern"||y.kind==="gold"),(y,A)=>(A.position.set(y.x,y.y-.03,y.z),A.rotation.y=y.rot,A.scale.setScalar(y.scale*.75),new Me(y.kind==="gold"?13409355:10266218))),n.instance(this.stem,this.stemMaterial,h,(y,A)=>{A.position.set(y.x,y.y,y.z),A.scale.setScalar(y.scale)}),n.instance(this.cap,n.m.mushroomCap,h,(y,A)=>(A.position.set(y.x,y.y,y.z),A.scale.setScalar(y.scale),new Me(y.color>.65?14072209:y.color>.3?11700821:15124632)))}surface(e,t){for(const n of this.w.bridges)if(Math.abs(t-n.z)<1.3&&Math.abs(e-n.x)<=n.half+.18)return Ai(e,t)>.65?"packed-snow":"wood";return this.height(e,t)>Ue(e,t)+.12?Ai(e,t)>.65?"packed-snow":"stone":null}height(e,t){let n=Ue(e,t);for(const i of this.walkable||[]){const r=e-i.x,o=t-i.z,a=r*Math.cos(i.rot)-o*Math.sin(i.rot),c=r*Math.sin(i.rot)+o*Math.cos(i.rot);Math.abs(a)<i.w*.5&&Math.abs(c)<i.d*.5&&(n=Math.max(n,i.y+i.h*.5+.015))}for(const i of this.w.bridges)Math.abs(t-i.z)<1.3&&Math.abs(e-i.x)<=i.half+.18&&(n=Math.max(n,Ua(i,e)+.035));return n}}function Uf(){const s=new Worker(new URL(""+new URL("generation-worker-BL7qFmaz.js",import.meta.url).href,import.meta.url),{type:"module"}),e=new Map;let t=0;return s.onmessage=({data:n})=>{const i=e.get(n.id);e.delete(n.id),n.error?i?.reject(new Error(n.error)):i?.resolve(n.result)},s.onerror=n=>{for(const i of e.values())i.reject(new Error(n.message));e.clear()},{worker:s,request(n,i){const r=++t,o=new Promise((a,c)=>{e.set(r,{resolve:a,reject:c}),s.postMessage({id:r,kind:n,args:i})});return o.catch(()=>{}),o}}}function X1(s,e){const t=Uf(),n=Math.floor(s/Hn),i=Math.floor(e/Hn),r=new Map,o=[];for(let h=-3;h<=3;h++)for(let u=-3;u<=3;u++)o.push({tx:n+u,tz:i+h,d:u*u+h*h});o.sort((h,u)=>h.d-u.d);for(const{tx:h,tz:u}of o)r.set(h+","+u,t.request("tile",{tx:h,tz:u}));const a=n*Hn,c=i*Hn,l=Promise.all([t.request("terrain",{x0:a-1120,z0:c-1120,size:2240,res:112,far:!0}),t.request("distant",{x:a,z:c})]);return l.catch(()=>{}),{generator:t,tiles:r,far:l,x:a,z:c}}class q1{constructor(e,t,n){this.scene=e,this.m=t,this.prepared=n,this.generator=n?.generator||Uf(),this.tiles=new Map,this.cx=999,this.cz=999,this.center=new C,this.draw=new We,e.add(this.draw),this.chunks=new We,e.add(this.chunks),this.colliders=[],this.bridges=[],this.trees=[],this.perches=[],this.rebuilds=0,this.frame=0,this.prototypes=[];for(let i=0;i<F1;i++)for(let r=0;r<3;r++)this.prototypes.push(O1(i,r));this.protoCount=this.prototypes.length,this.scenery=new W1(this),this.grass=t1(),this.ferns=t.fernGeometry,this.leaf=Sf(),this.rock=i1(),this.rivers=new P1(e,t),this.winter=new C1(e,this,t),this.createFalling(),this.carpet=new ii(n1(),t.fallen,650),this.carpet.receiveShadow=!0,this.carpet.userData.skipReflection=!0,this.carpet.count=0,this.carpetCenter=new le(999,999),e.add(this.carpet)}terrainFromData(e,t=!1){const n=new wt;for(const[r,o]of Object.entries(e.attributes))n.setAttribute(r,new yt(o.array,o.itemSize));n.setIndex(new yt(e.index,1)),n.computeBoundingSphere();const i=new st(n,this.m.ground);return i.receiveShadow=!t,i}async makeTile(e,t){const n=e+","+t,i=await(this.prepared?.tiles.get(n)||this.generate("tile",{tx:e,tz:t}));return this.prepared?.tiles.delete(n),i.mesh=this.terrainFromData(i.terrain),delete i.terrain,this.chunks.add(i.mesh),i}generate(e,t){return this.generator.request(e,t)}prepareTreeVisibility(e,t){e&&(e.userData.trees=t,e.userData.fullMatrices=e.instanceMatrix.array.slice(),e.userData.fullColors=e.instanceColor?.array.slice(),e.userData.visibleIds=[-1],e.instanceMatrix.setUsage(vs),e.instanceColor&&e.instanceColor.setUsage(vs))}updateTreeVisibility(e){const t=Math.atan(Math.tan(67*Math.PI/360)*(innerWidth/innerHeight))+.18,n=Math.cos(t),i=-Math.sin(e.yaw),r=-Math.cos(e.yaw);for(const o of[this.draw,this.farTrees])if(o)for(const a of o.children){const c=a.userData;if(!c.trees)continue;const l=[];for(let h=0;h<c.trees.length;h++){const u=c.trees[h],f=u.x-e.x,d=u.z-e.z,m=Math.hypot(f,d);(m<78||f*i+d*r>m*n-18*(u.scale||u.s||1))&&l.push(h)}if(!(l.length===c.visibleIds.length&&l.every((h,u)=>h===c.visibleIds[u]))){for(let h=0;h<l.length;h++){const u=l[h];a.instanceMatrix.array.set(c.fullMatrices.subarray(u*16,u*16+16),h*16),c.fullColors&&a.instanceColor.array.set(c.fullColors.subarray(u*3,u*3+3),h*3)}a.count=l.length,a.instanceMatrix.needsUpdate=!0,a.instanceColor&&(a.instanceColor.needsUpdate=!0),c.visibleIds=l}}}instance(e,t,n,i,r=!1){if(!n.length)return;const o=new ii(e,t,n.length),a=new ut;return n.forEach((c,l)=>{a.position.set(0,0,0),a.rotation.set(0,0,0),a.scale.set(1,1,1);const h=i(c,a);a.updateMatrix(),o.setMatrixAt(l,a.matrix),h&&o.setColorAt(l,h)}),o.castShadow=r,o.receiveShadow=!0,o.userData.skipReflection=t===this.m.fern||t===this.m.grass||this.m.grassParts.some(c=>c.material===t),o.computeBoundingSphere(),this.draw.add(o),o}rebuildDraw(e,t){for(const m of[...this.draw.children])this.draw.remove(m),m.isInstancedMesh&&m.dispose(),m.userData.ownGeometry&&m.geometry.dispose(),m.userData.ownMaterial&&m.material.dispose();const n=Array.from({length:this.protoCount*2},()=>[]),i=[],r=[],o=[],a=[],c=[];this.colliders=[],this.trees=[],this.perches=[],this.logEnds=new hi;for(const m of this.tiles.values()){for(const x of m.trees){const g=Math.hypot(x.x-e,x.z-t);g>235||(this.trees.push(x),n[x.species*3+x.variant+(g>66?this.protoCount:0)].push(x),g<100&&this.colliders.push({x:x.x,z:x.z,r:this.prototypes[x.species*3+x.variant].near.radius*x.scale+.25}))}for(const x of m.rocks)Math.hypot(x.x-e,x.z-t)<120&&i.push(x);for(const x of m.flora)Math.hypot(x.x-e,x.z-t)<64&&r.push(x);for(const x of m.grass)Math.hypot(x.x-e,x.z-t)<69&&o.push(x);for(const x of m.litter)Math.hypot(x.x-e,x.z-t)<38&&a.push(x);for(const x of m.logs)Math.hypot(x.x-e,x.z-t)<115&&c.push(x)}const l=(m,x)=>{x.position.set(m.x,m.y,m.z),x.rotation.y=m.rot,x.scale.set(m.scale*(.85+m.color*.35),m.scale,m.scale*(.85+m.color*.35))};for(let m=0;m<this.protoCount*2;m++){const x=this.prototypes[m%this.protoCount],g=m<this.protoCount?x.near:x.far,p=n[m],M=[4,9].includes(x.species)?p:p.filter(w=>Ht(w.x,w.z)<.8),v=this.instance(g.wood,[1,5].includes(x.species)?this.m.birch:this.m.trunk,p,l,m<this.protoCount),_=this.instance(g.leaf,x.species===6?this.m.larch:[4,9].includes(x.species)?this.m.needle:[7,10].includes(x.species)?this.m.leaf:this.m.leafPhoto,M,(w,b)=>{l(w,b);const y=ui(w.x,w.z),A=w.species===1||w.species===5||w.species===7?[15976766,15848550,15382348]:w.species===4||w.species===9?[5667670,4353879,7505498]:w.species===6?[14397262,14992746,11119964]:w.species===8?[12795947,12074297,14841669]:w.species===3?[13602117,14332524,12089401]:w.species===2?[11635792,12876092,10190670]:y.maple>.4?[15237432,12995367,14457923]:[15316303,13204537,14721879];return new Me(A[Math.floor(w.color*A.length)])},m<this.protoCount);if(v&&(v.userData.reflectionGeometry=x.far.wood),_&&(_.userData.reflectionGeometry=x.far.leaf,_.customDepthMaterial=_.material.userData.winterDepth),x.species===3){const w=p.filter(y=>Ht(y.x,y.z)>.7&&Ki(y.x,y.z).kind==="lastleaves"),b=this.instance(g.leaf,this.m.retainedLeaf,w,(y,A)=>(l(y,A),new Me(11893059)),m<this.protoCount);b&&(b.customDepthMaterial=this.m.retainedLeaf.userData.winterDepth,this.prepareTreeVisibility(b,w))}if(x.snow){const w=p.filter(y=>Ai(y.x,y.z)>.3),b=this.instance(x.snow,this.m.snowCap,w,l,m<this.protoCount);this.prepareTreeVisibility(b,w)}this.prepareTreeVisibility(v,p),this.prepareTreeVisibility(_,M)}for(let m=0;m<this.m.rockParts.length;m++){const x=this.m.rockParts[m];this.instance(x.geometry,x.material,i.filter(g=>g.variant%this.m.rockParts.length===m),(g,p)=>{p.position.set(g.x,g.y,g.z),p.scale.set(g.s,g.s*(.75+Ve(g.x,g.z)*.55),g.s),p.rotation.y=g.rot},!0)}for(const m of i)m.s>1.5&&this.colliders.push({x:m.x,z:m.z,r:m.s*.52,topY:m.y+m.s*.5}),m.s>1&&m.s<2.8&&this.perches.push({id:"rock:"+m.x.toFixed(2)+","+m.z.toFixed(2),x:m.x,y:m.y+m.s*this.m.rockParts[m.variant%this.m.rockParts.length].height*.8,z:m.z});this.instance(this.ferns,this.m.fern,r,(m,x)=>{x.position.set(m.x,m.y,m.z),x.scale.setScalar(m.s),x.rotation.y=m.rot});for(let m=0;m<this.m.grassParts.length;m++){const x=this.m.grassParts[m];this.instance(x.geometry,x.material,o.filter((g,p)=>Math.hypot(g.x-e,g.z-t)<13?p%4===m:p%2+2===m),(g,p)=>(p.position.set(g.x,g.y,g.z),p.quaternion.setFromUnitVectors(new C(0,1,0),new C(g.nx,g.ny,g.nz)),p.rotateY(g.rot),p.scale.set(g.s,g.s*(g.meadow?1.35:1),g.s),new Me(g.meadow?14735276:12963737)))}this.instance(this.grass,this.m.grass,o.filter(m=>m.meadow&&Math.hypot(m.x-e,m.z-t)<42),(m,x)=>(x.position.set(m.x,m.y,m.z),x.rotation.y=m.rot,x.scale.set(m.s*.85,m.s*1.05,m.s*.85),new Me().setRGB(.83+m.color*.27,.68+m.color*.22,.35+m.color*.16))),this.instance(this.leaf,this.m.fallen,a,(m,x)=>(x.position.set(m.x,m.y,m.z),x.quaternion.setFromUnitVectors(new C(0,1,0),ji(m.x,m.z)),x.rotateY(m.rot),x.scale.setScalar(m.s),new Me(Pa[Math.floor(m.c*8)])));const h=new hi;for(const m of c){const x=Ue(m.x,m.z)+m.r*.65,g=Ue(m.ex,m.ez)+m.r*.65;h.tube([m.x,x,m.z],[m.ex,g,m.ez],m.r,m.r*.8,12,[.7,.74,.66]),bf(this.logEnds,[m.x,x,m.z],[m.ex,g,m.ez],m.r,m.r*.8);const p=Math.hypot(m.ex-m.x,m.ez-m.z);for(let M=0;M<3;M++){const v=.25+M*.23,_=Ke(m.x,m.ex,v),w=Ke(m.z,m.ez,v),b=Ke(x,g,v);h.tube([_,b,w],[_+.7,b+.28,w-.6],m.r*.2,.025,6,[.7,.7,.6])}for(let M=0;M<Math.ceil(p);M++){const v=M/Math.ceil(p);this.colliders.push({x:Ke(m.x,m.ex,v),z:Ke(m.z,m.ez,v),r:m.r+.2,topY:Ke(x,g,v)+m.r})}this.perches.push({id:"log:"+m.x.toFixed(2),x:Ke(m.x,m.ex,.25),y:Ke(x,g,.25)+m.r,z:Ke(m.z,m.ez,.25)})}const u=new st(h.geometry(),this.m.trunk);u.receiveShadow=u.castShadow=!0,u.userData.ownGeometry=!0,this.draw.add(u);const f=[];for(const m of c)for(let x=0;x<6;x++){const g=.15+x*.1;f.push({x:Ke(m.x,m.ex,g)+m.r*.8,z:Ke(m.z,m.ez,g),y:Ke(Ue(m.x,m.z),Ue(m.ex,m.ez),g)+m.r*.8,r:.1+Ve(x,m.x)*.13})}this.instance(this.m.shelfGeometry,this.m.mushroomCap,f,(m,x)=>{x.position.set(m.x,m.y,m.z),x.scale.set(m.r,m.r*.25,m.r*.7)}),this.landmarks(e,t);const d=new st(this.logEnds.geometry(),this.m.cutWood);d.receiveShadow=!0,d.userData.ownGeometry=!0,this.draw.add(d),this.rebuilds++}landmarks(e,t){this.scenery.draw(e,t);const n=[],i=Math.round(e/Ti),r=Math.round((t+64)/yn);for(let o=r-1;o<=r+1;o++){const a=vl(o*yn-64,i);if(Math.hypot(e-a.x,t-a.z)>165)continue;const c=this.m.cliffPart;for(const l of[-1,1]){const h=12.8+Ve(o,l,892)*.6,u=c.width*h,f=new st(c.geometry,c.material);f.position.set(a.x+l*(a.width+u*.46),a.low-1.2,a.z+3.3),f.scale.set(l*h,h,h*.84),f.rotation.y=l*.12,f.castShadow=f.receiveShadow=!0,this.draw.add(f);for(let d=0;d<12;d++){const m=a.x+l*(a.width+.7+d*1.35);this.colliders.push({x:m,z:a.z+2.8,r:.9,topY:a.high+.7})}}for(const l of[-1,1])for(let h=0;h<8;h++){const u=a.x+l*(a.width+6+h*3.6),f=a.z+5+Math.sin(h*2.3)*2,d=5+Ve(o,h,121)*4,m=Math.min(...[[0,0],[-d*.4,0],[d*.4,0],[0,-d*.4],[0,d*.4]].map(([x,g])=>Ue(u+x,f+g)));n.push({x:u,y:m-.12,z:f,sx:d,sy:3+Ve(h,o,141)*4,sz:d*.8,rot:Ve(h,o,123)*He})}}for(let o=0;o<this.m.rockParts.length;o++){const a=this.m.rockParts[o];this.instance(a.geometry,a.material,n.filter((c,l)=>l%this.m.rockParts.length===o),(c,l)=>{l.position.set(c.x,c.y,c.z),l.rotation.y=c.rot,l.scale.set(c.sx,c.sy,c.sz)},!0)}for(const o of n)this.colliders.push({x:o.x,z:o.z,r:Math.min(o.sx,o.sz)*.43,topY:o.y+o.sy*.6});for(const o of this.trees){if(Math.hypot(o.x-e,o.z-t)>85)continue;const a=this.prototypes[o.species*3+o.variant],c=a.perches;if(!c.length)continue;const l=Math.min(2,c.length),h=o.scale*(.85+o.color*.35);for(let u=0;u<l;u++){const f=c[Math.floor(Ve(o.x+u,o.z,733)*c.length)],d=f.x*h,m=f.z*h;this.perches.push({id:"branch:"+o.id+":"+u,x:o.x+d*Math.cos(o.rot)+m*Math.sin(o.rot),y:o.y+f.y*o.scale,z:o.z-d*Math.sin(o.rot)+m*Math.cos(o.rot)})}}}async rebuildFar(e,t){const n=this.prepared?.far&&this.prepared.x===e&&this.prepared.z===t,[i,r]=await(n?this.prepared.far:Promise.all([this.generate("terrain",{x0:e-1120,z0:t-1120,size:2240,res:112,far:!0}),this.generate("distant",{x:e,z:t})]));n&&(this.prepared.far=null);const o=this.terrainFromData(i,!0),a=new We,c=[14326089,15058522,11831891,12684109,5075026,14730600,13940320,15058521,12536373,5994067,10850160,12427355];for(let l=0;l<12;l++){const h=r.filter(d=>d.species===l);if(!h.length)continue;const u=this.prototypes[l*3].far,f=l===6?this.m.larch:[4,9].includes(l)?this.m.needle:[7,10].includes(l)?this.m.leaf:this.m.leafPhoto;for(const[d,m,x]of[[u.wood,[1,5].includes(l)?this.m.birch:this.m.trunk,!1],[u.leaf,f,!0]]){const g=x&&![4,9].includes(l)?h.filter(v=>Ht(v.x,v.z)<.8):h,p=new ii(d,m,g.length),M=new ut;g.forEach((v,_)=>{M.position.set(v.x,v.y,v.z),M.scale.setScalar(v.s),M.rotation.y=v.rot,M.updateMatrix(),p.setMatrixAt(_,M.matrix),x&&p.setColorAt(_,new Me(c[l]))}),p.computeBoundingSphere(),this.prepareTreeVisibility(p,g),a.add(p)}}if(this.far&&(this.scene.remove(this.far),this.far.geometry.dispose()),this.farTrees){this.scene.remove(this.farTrees);for(const l of this.farTrees.children)l.dispose()}this.far=o,this.farTrees=a,this.scene.add(o,a)}trunkPoint(e,t){const n=this.prototypes[e.species*3+e.variant].near.trunk,i=(t-e.y)/e.scale;let r=1;for(;r<n.length-1&&n[r].y<i;)r++;const o=n[r-1],a=n[r],c=Math.max(0,Math.min(1,(i-o.y)/(a.y-o.y))),l=e.scale*(.85+e.color*.35),h=Ke(o.x,a.x,c)*l,u=Ke(o.z,a.z,c)*l;return{x:e.x+h*Math.cos(e.rot)+u*Math.sin(e.rot),z:e.z-h*Math.sin(e.rot)+u*Math.cos(e.rot),r:Ke(o.r,a.r,c)*l}}walkHeight(e,t){const n=Xi(e,t);return Math.max(this.scenery.height(e,t),n.frozen?n.level:-1/0)}walkSurface(e,t){return this.scenery.surface(e,t)}move(e,t,n,i){let r=e+n,o=t+i,a=this.walkHeight(e,t);for(const c of this.colliders){if(c.bottomY!==void 0&&c.bottomY>a+1.8||c.topY!==void 0&&a>c.topY-.1)continue;const l=Math.hypot(r-c.x,o-c.z);l<c.r&&l>1e-4&&(r=c.x+(r-c.x)/l*c.r,o=c.z+(o-c.z)/l*c.r)}return this.walkHeight(r,o)-a>.3&&(this.walkHeight(r,t)-a>.3&&(r=e),this.walkHeight(e,o)-a>.3&&(o=t)),{x:r,z:o}}async init(e,t){await this.stream(e,t,!0)}async stream(e,t){const n=Math.floor(e/Hn),i=Math.floor(t/Hn);if(this.streaming||n===this.cx&&i===this.cz)return;this.streaming=!0,this.cx=n,this.cz=i;const r=[];for(let a=-3;a<=3;a++)for(let c=-3;c<=3;c++){const l=n+c,h=i+a;r.push({tx:l,tz:h,key:l+","+h,d:c*c+a*a})}r.sort((a,c)=>a.d-c.d);const o=new Set(r.map(a=>a.key));for(const[a,c]of this.tiles)o.has(a)||(this.chunks.remove(c.mesh),c.mesh.geometry.dispose(),this.tiles.delete(a));for(const a of r)this.tiles.has(a.key)||(this.tiles.set(a.key,await this.makeTile(a.tx,a.tz)),await new Promise(c=>requestAnimationFrame(c)));this.rebuildDraw(e,t),await this.rebuildFar(n*Hn,i*Hn),this.center.set(e,0,t),this.streaming=!1}createFalling(){this.fallCount=180,this.falling=new ii(this.leaf,this.m.fallen,this.fallCount),this.falling.instanceMatrix.setUsage(vs),this.falling.frustumCulled=!1,this.scene.add(this.falling),this.leafParticles=[];const e=Fn(445);for(let t=0;t<this.fallCount;t++)this.leafParticles.push({x:e()*60-30,y:e()*18,z:e()*60-30,s:.35+e()*.4,phase:e()*He,rate:.28+e()*.6}),this.falling.setColorAt(t,new Me(Pa[t%8]));this.kicks=[],this.kickMesh=new ii(this.leaf,this.m.fallen,120),this.kickMesh.instanceMatrix.setUsage(vs),this.kickMesh.frustumCulled=!1,this.scene.add(this.kickMesh),this.kickMesh.count=0,this.dummy=new ut}kick(e,t,n,i){const r=7+Math.floor(Uc(e,t)*17);for(let o=0;o<r;o++){const a=Math.random()*He,c=Math.random()*.55;this.kicks.push({x:e+Math.cos(a)*c,y:Ue(e,t)+.07,z:t+Math.sin(a)*c,vx:n*.24+Math.cos(a),vz:i*.24+Math.sin(a),vy:.6+Math.random()*1.5,life:1.2+Math.random(),rot:Math.random()*He,color:Pa[o%8]})}this.kicks.length>120&&this.kicks.splice(0,this.kicks.length-120)}updateCarpet(e,t){const n=Math.round(e/5)*5,i=Math.round(t/5)*5;if(this.carpetCenter.x===n&&this.carpetCenter.y===i)return;this.carpetCenter.set(n,i);const r=new ut;let o=0;for(let a=-13;a<=13;a++)for(let c=-13;c<=13;c++){if(c*c+a*a>169)continue;const l=n+c,h=i+a,u=Ue(l,h),f=ui(l,h),d=ji(l,h);Ai(l,h)>.35||u<zt(l,h)+.1||d.y<.84||f.meadow>.4||Yi(l,h)<1||(r.position.set(l,u+.02,h),r.quaternion.setFromUnitVectors(new C(0,1,0),d),r.rotateY(Ve(l,h,177)*He),r.scale.setScalar(.75+Uc(l,h)*.23),r.updateMatrix(),this.carpet.setMatrixAt(o,r.matrix),this.carpet.setColorAt(o++,new Me(f.birch>.3||f.leaves>.4?16371568:f.maple>.3?15776145:14140834)))}this.carpet.count=o,this.carpet.instanceMatrix.needsUpdate=!0,this.carpet.instanceColor&&(this.carpet.instanceColor.needsUpdate=!0),this.carpet.computeBoundingSphere()}update(e,t,n){this.frame++,this.frame%6===0&&this.updateCarpet(n.x,n.z),!this.streaming&&(Math.floor(n.x/Hn)!==this.cx||Math.floor(n.z/Hn)!==this.cz)&&this.stream(n.x,n.z),!this.streaming&&Math.hypot(n.x-this.center.x,n.z-this.center.z)>24&&(this.rebuildDraw(n.x,n.z),this.center.set(n.x,0,n.z)),this.updateTreeVisibility(n),this.rivers.update(t,n),this.winter.update(e,t,n);const i=this.dummy;for(let r=0;r<this.fallCount;r++){const o=this.leafParticles[r];let a=((o.x+t*.4-n.x+30)%60+60)%60-30+n.x,c=((o.z+t*.13-n.z+30)%60+60)%60-30+n.z;(o.floor===void 0||Math.abs(a-(o.floorX??a))+Math.abs(c-(o.floorZ??c))>5||r%12===this.frame%12)&&(o.floorTarget=Ue(a,c),o.floorX=a,o.floorZ=c,o.floor===void 0&&(o.floor=o.floorTarget)),o.floor+=(o.floorTarget-o.floor)*Math.min(1,e*6);const l=o.floor+((o.y-t*o.rate)%18+18)%18;a+=Math.sin(t*.6+o.phase),c+=Math.cos(t*.55+o.phase)*.6,i.position.set(a,l,c),i.rotation.set(t*.8+o.phase,t*.5+o.phase,Math.sin(t*1.6+o.phase)*.8),i.scale.setScalar(o.s*(1-Ht(a,c))),i.updateMatrix(),this.falling.setMatrixAt(r,i.matrix)}this.falling.instanceMatrix.needsUpdate=!0;for(const r of this.kicks){r.life-=e,r.vy-=e*3.4,r.x+=r.vx*e,r.y+=r.vy*e,r.z+=r.vz*e;const o=Ue(r.x,r.z)+.04;r.y<o&&(r.y=o,r.vy=0,r.vx*=.85,r.vz*=.85)}this.kicks=this.kicks.filter(r=>r.life>0),this.kickMesh.count=this.kicks.length,this.kicks.forEach((r,o)=>{i.position.set(r.x,r.y,r.z),i.rotation.set(r.vy===0?0:t*4,r.rot+t*.9,0),i.scale.setScalar(.55*Math.min(1,r.life*2)),i.updateMatrix(),this.kickMesh.setMatrixAt(o,i.matrix),this.kickMesh.setColorAt(o,new Me(r.color))}),this.kickMesh.instanceMatrix.needsUpdate=!0,this.kickMesh.instanceColor&&(this.kickMesh.instanceColor.needsUpdate=!0)}}class Y1{constructor(){this.ctx=null,this.enabled=!0,this.steps=0,this.samples=[],this.buffers={},this.peak=0,this.animals=new Map,this.falls=new Map,this.audibleFalls=[],this.calls=[]}async start(){if(this.ctx){await this.ctx.resume();return}const e=this.ctx=new AudioContext;this.master=e.createGain(),this.master.gain.value=this.enabled?.65:0,this.filter=e.createBiquadFilter(),this.filter.type="lowpass",this.filter.frequency.value=19e3,this.master.connect(this.filter).connect(e.destination),this.analyser=e.createAnalyser(),this.analyser.fftSize=256,this.filter.connect(this.analyser),this.wave=new Float32Array(256),this.noise=e.createBuffer(1,e.sampleRate*4,e.sampleRate);const t=this.noise.getChannelData(0);for(let o=0;o<t.length;o++)t[o]=(Math.random()*2-1)*.2;const n=e.createBufferSource(),i=e.createBiquadFilter(),r=e.createGain();n.buffer=this.noise,n.loop=!0,i.type="lowpass",i.frequency.value=650,r.gain.value=.035,n.connect(i).connect(r).connect(this.master),n.start(),this.wind=r,this.windFilter=i,this.initializing=Promise.all([["snow","snow-footsteps.ogg"],["windTrees","wind-trees.ogg"],["windGrass","wind-grass.ogg"],["footsteps","leaf-footsteps.mp3"],["leaf0","leaves01.ogg"],["leaf1","leaves02.ogg"],["stone","gravel01.ogg"],["wood","wood01.ogg"],["wood2","wood02.ogg"],["wood3","wood03.ogg"],["mud","mud02.ogg"],["rockStep","stone01.ogg"],["robin","robin.mp3"],["robinAlt","robin-alt.mp3"],["blackbird","blackbird.mp3"],["cascade","cascade.mp3"],["stream","stream.mp3"],["splash","splash.mp3"]].map(async([o,a])=>{try{const c=await fetch("./audio/"+a);if(!c.ok)throw Error(a);this.buffers[o]=await e.decodeAudioData(await c.arrayBuffer())}catch{console.warn("Sound unavailable",a)}})).then(()=>this.samples=Object.values(this.buffers)),await e.resume()}setEnabled(e){this.enabled=e,this.ctx&&this.master.gain.setTargetAtTime(e?.65:0,this.ctx.currentTime,.12)}pause(){this.ctx?.suspend()}panner(e,t,n,i=3,r=38){const o=this.ctx.createPanner();return o.panningModel="HRTF",o.distanceModel="inverse",o.refDistance=i,o.maxDistance=r,o.rolloffFactor=1.8,o.positionX.value=e,o.positionY.value=t,o.positionZ.value=n,o.connect(this.master),o}play(e,t=.2,n=1,i=this.master,r=0,o=null){if(!this.ctx||this.ctx.state!=="running"||!e)return;const a=this.ctx.createBufferSource(),c=this.ctx.createGain();a.buffer=e,a.playbackRate.value=n;const l=this.ctx.currentTime,h=(o??Math.max(.01,e.duration-r))/n;return c.gain.setValueAtTime(0,l),c.gain.linearRampToValueAtTime(t,l+.006),c.gain.setValueAtTime(t,l+Math.max(.007,h-.045)),c.gain.linearRampToValueAtTime(0,l+h),a.connect(c).connect(i),o===null?a.start(l,r):a.start(l,r,o),a.addEventListener("ended",()=>{a.disconnect(),c.disconnect()},{once:!0}),a}step(e,t,n=!1,i="leaves",r=0,o=!1){if(!this.ctx||this.ctx.state!=="running")return;this.steps++;const a=o?.34:1,c=i==="water";if(this.lastSurface=i,i==="snow"||i==="packed-snow"){this.snowSteps=(this.snowSteps||0)+1;const h=this.steps*7%16;this.play(this.buffers.snow,(n?.24:.18)*a,i==="packed-snow"?1.17:.93+Math.random()*.09,this.master,h*.8,.56);return}if(i==="ice"){this.play(this.buffers.rockStep,.055*a,1.22+Math.random()*.12);return}if(c){this.play(this.buffers.splash,.14*a,.8+Math.random()*.35);return}if(i==="leaves"&&this.buffers.footsteps){let h=Math.floor(Math.random()*12);h===this.lastFoot&&(h=(h+5)%12),this.lastFoot=h,this.play(this.buffers.footsteps,(n?.34:.25)*a,.94+Math.random()*.12,this.master,.075+h*.735,.53),r>.2&&this.play(this.buffers.splash,r*.025,1.5);return}const l=i==="leaves"?this.buffers["leaf"+this.steps%2]:i==="wood"?this.buffers[["wood","wood2","wood3"][this.steps%3]]:i==="grass"||i==="dirt"?this.buffers.mud:this.buffers.rockStep;this.play(l,(i==="grass"?.1:i==="leaves"?.25:.14)*a,.87+Math.random()*.24),r>.2&&this.play(this.buffers.splash,r*.032,1.5)}splashAt(e,t,n,i=.08){if(!this.ctx||this.ctx.state!=="running")return;const r=this.panner(e,t,n,2,28),o=this.play(this.buffers.splash,i,1.2,r);o?o.addEventListener("ended",()=>r.disconnect(),{once:!0}):r.disconnect()}rustleAt(e,t,n,i=.07){if(!this.ctx||this.ctx.state!=="running")return;const r=this.panner(e,t,n,2,25),o=this.play(this.buffers.leaf0,i,1.45,r);o?o.addEventListener("ended",()=>r.disconnect(),{once:!0}):r.disconnect()}iceStep(e,t,n,i,r){if(!this.ctx||this.ctx.state!=="running"||this.steps%4!==0)return;const o=this.ctx,a=this.panner(e+Math.sin(e)*3,t,n+Math.cos(n)*3,3,23),c=o.createOscillator(),l=o.createGain(),h=o.currentTime;c.type="sine",c.frequency.setValueAtTime(160+Math.abs(Math.sin(e*.12+n*.06))*190,h),c.frequency.exponentialRampToValueAtTime(55,h+.65),l.gain.setValueAtTime(0,h),l.gain.linearRampToValueAtTime(r?.007:i?.021:.014,h+.025),l.gain.exponentialRampToValueAtTime(1e-4,h+.85),c.connect(l).connect(a),c.start(),c.stop(h+.9),c.onended=()=>{c.disconnect(),l.disconnect(),a.disconnect()},this.iceTones=(this.iceTones||0)+1}snowFallAt(e,t,n){if(!this.ctx||this.ctx.state!=="running")return;const i=this.panner(e,t,n,3,25),r=this.play(this.buffers.snow,.2,.65,i,1.6,.56);r?r.addEventListener("ended",()=>i.disconnect(),{once:!0}):i.disconnect()}owlCall(e,t){if(!this.ctx||this.ctx.state!=="running")return;const n=this.ctx;let i=this.animals.get(e);i||(i=this.panner(t.x,t.y,t.z,5,50),this.animals.set(e,i));const r=n.currentTime;for(let o=0;o<3;o++){const a=n.createOscillator(),c=n.createGain(),l=r+[0,.4,.62][o],h=o===0?.26:.17;a.type="sine",a.frequency.setValueAtTime(430+o*9,l),a.frequency.linearRampToValueAtTime(380+o*5,l+h),c.gain.setValueAtTime(0,l),c.gain.linearRampToValueAtTime(.09,l+.04),c.gain.exponentialRampToValueAtTime(1e-4,l+h),a.connect(c).connect(i),a.start(l),a.stop(l+h+.01),a.onended=()=>{a.disconnect(),c.disconnect()}}this.calls.push({id:e,kind:"owl",...t,time:r}),this.calls=this.calls.slice(-20)}call(e,t,n){if(t==="owl"){this.owlCall(e,n);return}if(!this.ctx||this.ctx.state!=="running")return;let i=this.animals.get(e);i||(i=this.panner(n.x,n.y,n.z,4,34),this.animals.set(e,i)),this.play(this.buffers[t==="blackbird"?"blackbird":Math.random()<.5?"robin":"robinAlt"],.17,.96+Math.random()*.07,i),this.calls.push({id:e,x:n.x,y:n.y,z:n.z,time:this.ctx.currentTime}),this.calls.length>20&&this.calls.shift()}moveAnimal(e,t,n,i){const r=this.animals.get(e);r&&(r.positionX.value=t,r.positionY.value=n,r.positionZ.value=i)}removeAnimal(e){this.animals.get(e)?.disconnect(),this.animals.delete(e)}waterLoop(e,t,n=6){if(!t)return null;const i=this.ctx,r=i.createBufferSource(),o=i.createBiquadFilter(),a=i.createGain(),c=this.panner(e.x,e.y,e.z,n,52);return o.type="highpass",o.frequency.value=420,r.buffer=t,r.loop=!0,a.gain.value=0,r.connect(o).connect(a).connect(c),r.start(0,Math.random()*Math.min(8,t.duration)),{source:r,gain:a,pan:c,filter:o}}canopyLoop(e,t,n,i){if(!e)return null;const r=this.ctx,o=r.createBufferSource(),a=r.createGain(),c=this.panner(t,n,i,10,65);return o.buffer=e,o.loop=!0,a.gain.value=0,o.connect(a).connect(c),o.start(0,Math.random()*e.duration),{source:o,gain:a,pan:c}}updateCanopy(e,t,n){const i=this.ctx,r=ui(t.x,t.z),o=gl(e,t.x,t.z);if(!this.canopy&&this.buffers.windTrees&&(this.canopy=Array.from({length:3},()=>this.canopyLoop(this.buffers.windTrees,t.x,t.y+7,t.z)),this.grassLoop=this.canopyLoop(this.buffers.windGrass,t.x,t.y-.8,t.z)),!!this.canopy){if(!this.canopyAt||e-this.canopyAt>2.5){this.canopyAt=e;const a=n.trees.filter(c=>Math.hypot(c.x-t.x,c.z-t.z)<34).sort((c,l)=>Math.hypot(c.x-t.x,c.z-t.z)-Math.hypot(l.x-t.x,l.z-t.z));this.rustlers=[a[0],a[Math.min(3,a.length-1)],a[Math.min(7,a.length-1)]]}if(this.canopy.forEach((a,c)=>{const l=this.rustlers?.[c];a.gain.gain.setTargetAtTime(l?(.11+o.gust*.3)*(1-r.meadow*.35)*(1-Ht(t.x,t.z)*.73):0,i.currentTime,1.2),l&&(a.pan.positionX.setTargetAtTime(l.x,i.currentTime,1.1),a.pan.positionY.setTargetAtTime(l.y+7*l.scale,i.currentTime,1.1),a.pan.positionZ.setTargetAtTime(l.z,i.currentTime,1.1))}),this.grassLoop){const a=this.grassLoop;a.pan.positionX.value=t.x+5,a.pan.positionY.value=t.y-1,a.pan.positionZ.value=t.z-4,a.gain.gain.setTargetAtTime(r.meadow*(.12+o.gust*.36)*(1-Ht(t.x,t.z)*.87),i.currentTime,1.2)}}}update(e,t,n,i){if(!this.ctx||this.ctx.state!=="running")return;const r=this.ctx,o=r.listener;for(const[f,d]of Object.entries({positionX:t.x,positionY:t.y,positionZ:t.z,forwardX:-Math.sin(t.yaw)*Math.cos(t.pitch),forwardY:Math.sin(t.pitch),forwardZ:-Math.cos(t.yaw)*Math.cos(t.pitch),upX:0,upY:1,upZ:0}))o[f].setValueAtTime(d,r.currentTime);this.filter.frequency.setTargetAtTime(i.underwater?650:19e3,r.currentTime,.12);const a=.72+Math.sin(e*.071)*.21+Math.sin(e*.173)*.09;this.updateCanopy(e,t,n),this.wind.gain.setTargetAtTime((.008+Ht(t.x,t.z)*.06*Er(t.x,t.z).exposure*(1-ui(t.x,t.z).old*.65))*a,r.currentTime,.8),this.windFilter.frequency.setTargetAtTime(480+a*250+Ht(t.x,t.z)*550,r.currentTime,.8);const c=new Set;this.audibleFalls=[];for(const f of n.rivers.sources){const d=Math.hypot(f.x-t.x,f.z-t.z,f.y-t.y);if(d>56)continue;c.add(f.id);let m=this.falls.get(f.id);if(!m){if(m=this.waterLoop(f,this.buffers.cascade),!m)continue;this.falls.set(f.id,m)}const x=Math.pow(Math.max(0,1-d/52),2);m.gain.gain.setTargetAtTime(x*.32*(1-(f.cold||0)*.7),r.currentTime,.25),x>.001&&this.audibleFalls.push({id:f.id,distance:d,gain:x*.32*(1-(f.cold||0)*.7)})}for(const[f,d]of this.falls)c.has(f)||(d.source.stop(),d.source.disconnect(),d.filter.disconnect(),d.gain.disconnect(),d.pan.disconnect(),this.falls.delete(f));this.springLoops??=new Map;const l=new Set;for(const f of n.winter.springs){const d=Math.hypot(f.x-t.x,f.z-t.z);if(d>32)continue;l.add(f.id);let m=this.springLoops.get(f.id);m||(m=this.waterLoop({x:f.x,y:f.water,z:f.z},this.buffers.stream,4),m&&this.springLoops.set(f.id,m)),m?.gain.gain.setTargetAtTime(Math.pow(Math.max(0,1-d/32),2)*.08,r.currentTime,.5)}for(const[f,d]of this.springLoops)l.has(f)||(d.source.stop(),d.source.disconnect(),d.filter.disconnect(),d.gain.disconnect(),d.pan.disconnect(),this.springLoops.delete(f));const h=Sn(t.x,t.z);this.stream||(this.stream=this.waterLoop({x:h.x,y:h.level,z:t.z},this.buffers.stream,2)),this.stream&&(this.stream.pan.positionX.value=h.x,this.stream.pan.positionY.value=h.level,this.stream.pan.positionZ.value=t.z,this.stream.gain.gain.setTargetAtTime(Math.pow(Math.max(0,1-h.d/17),2)*.11*(1-Ht(t.x,t.z)*.7),r.currentTime,.3)),this.analyser.getFloatTimeDomainData(this.wave);let u=0;for(const f of this.wave)u=Math.max(u,Math.abs(f));this.peak=Math.max(this.peak,u)}}const j1=new an(1,16,10);function K1(){const s=document.createElement("canvas");s.width=s.height=256;const e=s.getContext("2d"),t=Fn(713);e.fillStyle="#b8afa0",e.fillRect(0,0,256,256);for(let i=0;i<22e3;i++){const r=100+t()*150;e.strokeStyle=`rgba(${r},${r},${r},.4)`,e.lineWidth=.5,e.beginPath();const o=t()*256,a=t()*256;e.moveTo(o,a),e.lineTo(o+(t()-.5)*3,a+2+t()*6),e.stroke()}const n=new Io(s);return n.colorSpace=Ut,n.wrapS=n.wrapT=ci,n}const Z1=new Dt({map:K1(),vertexColors:!0,roughness:.96}),Zi=new Dt({color:1052685,roughness:.21});function Pe(s,e,t,n,i,r,o,a=0){const c=j1.clone();c.scale(n,i,r),c.rotateX(a),c.translate(s,e,t);const l=new Me(o),h=[];for(let u=0;u<c.attributes.position.count;u++){const f=c.attributes.normal.getY(u);h.push(l.r*(.84+.16*Math.max(0,f)),l.g*(.84+.16*Math.max(0,f)),l.b*(.84+.16*Math.max(0,f)))}return c.setAttribute("color",new Ye(h,3)),c}function ht(s,e=Z1){const t=pl(s,!1);s.forEach(i=>i.dispose());const n=new st(t,e);return n.castShadow=!0,n}function dn(s,e,t,n,i){const r=new C(...s),o=new C(...e),a=o.clone().sub(r),c=new wi(n,t,a.length(),8,1);c.applyQuaternion(new bn().setFromUnitVectors(new C(0,1,0),a.normalize())),c.translate(...r.add(o).multiplyScalar(.5).toArray());const l=new Me(i),h=[];for(let u=0;u<c.attributes.position.count;u++)h.push(l.r,l.g,l.b);return c.setAttribute("color",new Ye(h,3)),c}function _u(s=!1){const e=new We,t=new We;e.add(t);const n=s?4340529:8680537,i=s?3617580:6576712;t.add(ht([Pe(0,.17,0,.076,.106,.135,n,-.35),Pe(0,.19,.083,.067,.075,.058,s?5589305:13267258)]));const r=new We;r.position.set(0,.275,.085),t.add(r),r.add(ht([Pe(0,0,0,.061,.064,.061,n),Pe(0,0,.043,.048,.041,.018,s?4603441:12940351),dn([0,.002,.05],[0,-.003,.099],.013,.001,s?13344826:4010532)]));for(let l of[-1,1]){const h=new st(new an(.009,10,8),Zi);h.position.set(l*.052,.016,.023),r.add(h)}const o=[];for(let l of[-1,1]){const h=new We;h.position.set(l*.055,.21,-.015),t.add(h);const u=[Pe(l*.024,-.025,-.025,.032,.075,.13,i,.3)];for(let f=0;f<7;f++)u.push(Pe(l*(.023+f*.004),-.025-f*.004,-.065-f*.011,.009,.009,.085,i,.3));h.add(ht(u)),o.push(h),t.add(ht([dn([l*.027,.1,.03],[l*.028,.027,.037],.005,.003,6375214),dn([l*.028,.027,.037],[l*.035,.012,.083],.003,.001,6375214),dn([l*.028,.027,.037],[l*.048,.012,.059],.003,.001,6375214)]))}const a=new We;a.position.set(0,.14,-.09);const c=[];for(let l=0;l<5;l++)c.push(Pe((l-2)*.013,0,-.085,.013,.008,.11,i,-.12));return a.add(ht(c)),t.add(a),{root:e,body:t,wings:o,tail:a,head:r,kind:"bird"}}function $1(){const s=new We,e=new We;s.add(e);const t=10118977;e.add(ht([Pe(0,.24,-.025,.107,.155,.18,t,-.3),Pe(0,.2,.065,.075,.115,.08,12163445,-.3)]));const i=new We;i.position.set(0,.35,.13),e.add(i),i.add(ht([Pe(0,0,0,.069,.074,.086,t),Pe(0,-.02,.07,.04,.038,.052,11043938),Pe(-.045,.076,-.008,.022,.048,.015,t,-.12),Pe(.045,.076,-.008,.022,.048,.015,t,-.12),Pe(0,-.015,.116,.015,.013,.011,3353634)]));for(let u of[-1,1]){const f=new st(new an(.012,12,8),Zi);f.position.set(u*.06,.015,.045),i.add(f)}const r=[];for(let u of[-1,1])for(let f=0;f<2;f++){const d=new We;d.position.set(u*.07,.17,f?-.13:.1),d.add(ht([Pe(u*.014,-.035,0,f?.066:.027,f?.08:.065,f?.07:.026,t),Pe(u*.01,-.13,.035,.024,.019,.058,7689017)])),e.add(d),r.push(d)}const o=new We;o.position.set(0,.19,-.17),e.add(o);const a=new Ju([new C(0,0,0),new C(.01,.16,-.16),new C(.025,.37,-.19),new C(.02,.55,-.05)]),c=new cl(a,28,.1,12,!1),l=c.attributes.position,h=[];for(let u=0;u<=28;u++){const f=u/28,d=a.getPointAt(f),m=(.055+Math.sin(f*Math.PI)*.078)*Math.sqrt(1-f*.55);for(let x=0;x<=12;x++){const g=u*13+x,p=new C().fromBufferAttribute(l,g).sub(d).normalize();l.setXYZ(g,d.x+p.x*m,d.y+p.y*m,d.z+p.z*m);const M=new Me(x%4===0?12094046:t);M.multiplyScalar(.86+Math.max(0,p.y)*.14),h.push(M.r,M.g,M.b)}}return c.setAttribute("color",new Ye(h,3)),c.computeVertexNormals(),o.add(ht([c])),{root:s,body:e,head:i,legs:r,tail:o,kind:"squirrel"}}function yu(s=!1){const e=new We,t=new We;e.add(t);const n=10059878,i=13022880,r=5326393;t.add(ht([Pe(0,1.03,0,.26,.35,.64,n),Pe(0,1.1,.48,.18,.43,.22,n,-.45),Pe(0,.98,-.52,.21,.27,.15,i)]));const o=new We;o.position.set(0,1.54,.61),t.add(o),o.add(ht([Pe(0,0,.055,.11,.16,.2,n,.25),Pe(0,-.09,.22,.072,.075,.16,n,.3),Pe(0,-.12,.355,.065,.04,.036,r),Pe(-.16,.16,-.005,.065,.16,.027,n,-.25),Pe(.16,.16,-.005,.065,.16,.027,n,-.25)]));for(let l of[-1,1]){const h=new st(new an(.018,10,8),Zi);if(h.position.set(l*.104,.013,.155),o.add(h),s){const u=[];for(let f=0;f<4;f++)u.push(dn([l*(.065+f*.025),.13+f*.09,-f*.07],[l*(.09+f*.025),.22+f*.09,-.07-f*.07],.018-f*.003,.015-f*.003,10721658)),f>0&&u.push(dn([l*(.07+f*.025),.17+f*.09,-.04-f*.07],[l*(.12+f*.035),.35+f*.09,.04-f*.07],.012,.002,10721658));o.add(ht(u))}}const a=[];for(let l of[-1,1])for(let h=0;h<2;h++){const u=new We;u.position.set(l*.16,1.02,h?-.4:.4),u.add(ht([dn([0,0,0],[0,-.46,h?.06:-.04],.067,.035,n),dn([0,-.46,h?.06:-.04],[0,-.94,.02],.033,.019,n),Pe(0,-.955,.055,.04,.055,.075,r)])),t.add(u),a.push(u)}const c=new We;return c.position.set(0,1.15,-.59),c.add(ht([Pe(0,0,-.08,.07,.045,.16,i,-.5)])),t.add(c),{root:e,body:t,head:o,legs:a,tail:c,kind:"deer"}}function Mu(s=!1){const e=new We,t=new We;e.add(t);const n=s?15198690:9404516;t.add(ht([Pe(0,.25,-.06,.105,.16,.23,n),Pe(0,.22,.08,.08,.12,.12,s?15921381:11575424)]));const i=new We;i.position.set(0,.36,.15),i.add(ht([Pe(0,0,0,.063,.075,.085,n),Pe(0,-.025,.075,.044,.031,.04,s?14671572:10720636),Pe(-.031,.15,-.015,.024,.16,.018,n,-.2),Pe(.031,.15,-.015,.024,.16,.018,n,-.2),Pe(-.031,.16,.001,.011,.11,.007,7953743),Pe(.031,.16,.001,.011,.11,.007,7953743)])),t.add(i);for(const a of[-1,1]){const c=new st(new an(.01,8,6),Zi);c.position.set(a*.057,.02,.034),i.add(c)}const r=[];for(const a of[-1,1])for(let c=0;c<2;c++){const l=new We;l.position.set(a*.07,.2,c?-.19:.12),l.add(ht([Pe(0,-.08,.02,c?.055:.023,.09,.055,n),Pe(0,-.17,.07,.025,.025,c?.105:.06,n)])),t.add(l),r.push(l)}const o=new We;return o.add(ht([Pe(0,.24,-.28,.04,.05,.05,13616296)])),t.add(o),{root:e,body:t,head:i,legs:r,tail:o}}function J1(){const s=new We,e=new We;s.add(e),e.add(ht([Pe(0,.32,0,.16,.28,.15,10525838),Pe(0,.3,.08,.13,.22,.09,14012862)]));const t=new We;t.position.set(0,.62,.03),e.add(t),t.add(ht([Pe(0,0,0,.17,.16,.14,10920335),Pe(-.074,.005,.105,.082,.1,.03,14012862),Pe(.074,.005,.105,.082,.1,.03,14012862),dn([0,0,.13],[0,-.06,.17],.02,.002,5852732)]));for(const r of[-1,1]){const o=new st(new an(.027,10,8),Zi);o.position.set(r*.074,.013,.134),t.add(o),e.add(ht([dn([r*.07,.12,.01],[r*.08,0,.045],.025,.012,10063729),dn([r*.08,.02,.045],[r*.11,.005,.11],.01,.002,4406578)]))}const n=[];for(const r of[-1,1]){const o=new We;o.position.set(r*.12,.46,0),o.add(ht([Pe(r*.04,-.12,-.03,.06,.25,.13,7960427,.18)])),e.add(o),n.push(o)}const i=new We;return i.position.set(0,.19,-.1),i.add(ht([Pe(0,0,-.1,.07,.025,.17,8354664)])),e.add(i),{root:s,body:e,head:t,wings:n,tail:i}}function Q1(){const s=new We,e=new We;s.add(e);const t=10904885;e.add(ht([Pe(0,.48,0,.13,.18,.38,t),Pe(0,.48,.28,.1,.22,.12,t,-.3),Pe(0,.37,.27,.08,.12,.1,13154718)]));const n=new We;n.position.set(0,.67,.31),e.add(n),n.add(ht([Pe(0,0,.03,.082,.086,.12,t),Pe(0,-.02,.145,.047,.037,.12,t),Pe(0,-.025,.242,.022,.019,.022,2630429),Pe(-.057,.11,-.003,.031,.094,.019,t),Pe(.057,.11,-.003,.031,.094,.019,t)]));for(const o of[-1,1]){const a=new st(new an(.009,8,6),Zi);a.position.set(o*.071,.012,.076),n.add(a)}const i=[];for(const o of[-1,1])for(let a=0;a<2;a++){const c=new We;c.position.set(o*.085,.47,a?-.25:.25),c.add(ht([dn([0,0,0],[0,-.28,a?.04:-.01],.038,.02,t),dn([0,-.28,0],[0,-.45,.025],.02,.013,4470827),Pe(0,-.45,.05,.024,.025,.05,4470827)])),e.add(c),i.push(c)}const r=new We;return r.position.set(0,.46,-.32),r.add(ht([Pe(0,-.04,-.24,.075,.083,.29,t,-.16),Pe(0,-.075,-.48,.052,.06,.095,13024420,-.16)])),e.add(r),{root:s,body:e,head:n,legs:i,tail:r}}function ey(){const s=new We,e=new We;s.add(e),e.add(ht([Pe(0,.095,0,.12,.12,.25,9212292),Pe(0,.16,.13,.095,.13,.1,7754567),Pe(0,.26,.19,.055,.105,.058,3430730)]));const t=new We;t.position.set(0,.34,.21),e.add(t),t.add(ht([Pe(0,0,0,.064,.068,.084,2643016),Pe(0,-.015,.096,.041,.016,.065,12229698)]));for(const r of[-1,1]){const o=new st(new an(.007,8,6),Zi);o.position.set(r*.055,.015,.034),t.add(o)}const n=[];for(const r of[-1,1]){const o=new We;o.position.set(r*.09,.15,0),o.add(ht([Pe(r*.02,0,-.05,.044,.061,.2,6840142),Pe(r*.045,.01,-.06,.014,.043,.07,4085112)])),e.add(o),n.push(o)}const i=new We;return i.add(ht([Pe(0,.11,-.25,.07,.033,.08,4145723)])),e.add(i),{root:s,body:e,head:t,wings:n,tail:i}}class ty{constructor(e,t,n){this.scene=e,this.world=t,this.audio=n,this.animals=new Map,this.spawned=new Set,this.tick=0,this.spooks={bird:0,squirrel:0,deer:0,hare:0,fox:0},this.calls=0,this.templates={robin:_u(!1),blackbird:_u(!0),squirrel:$1(),deer:yu(!1),stag:yu(!0),hare:Mu(),snowhare:Mu(!0),owl:J1(),fox:Q1(),duck:ey()},this.lastCell="",this.events=[],this.tracks=[];const i=new Xt({transparent:!0,depthWrite:!1,side:Et,vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}",fragmentShader:"varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float d=min(length((p-vec2(.26,0.))*vec2(2.8,1.3)),length((p+vec2(.26,0.))*vec2(2.8,1.3)));gl_FragColor=vec4(.08,.055,.028,(1.-smoothstep(.65,1.,d))*.3);}"}),r=new Un(.17,.23);r.rotateX(-Math.PI/2),this.trackMesh=new ii(r,i,180),this.trackMesh.instanceMatrix.setUsage(vs),this.trackMesh.count=0,this.trackMesh.frustumCulled=!1,e.add(this.trackMesh),this.dummy=new ut}model(e){const t=this.templates[e],n=t.root.clone(!0),i=new Map,r=(o,a)=>{i.set(o,a),o.children.forEach((c,l)=>r(c,a.children[l]))};return r(t.root,n),{root:n,body:i.get(t.body),head:i.get(t.head),tail:i.get(t.tail),legs:t.legs?.map(o=>i.get(o)),wings:t.wings?.map(o=>i.get(o))}}spawn(e,t){const n=Math.floor(e.x/30),i=Math.floor(e.z/30),r=n+","+i;if(r!==this.lastCell){this.lastCell=r;for(let o=-3;o<=3;o++)for(let a=-3;a<=3;a++){const c=n+a,l=i+o,h=c+","+l;if(this.spawned.has(h))continue;const u=Fn(Ve(c,l,373)*1e8),f=c*30+5+u()*20,d=l*30+5+u()*20,m=ui(f,d),x=Ue(f,d),g=m.site.pond&&x<zt(f,d)-.25&&!Xi(f,d).frozen;if(!g&&(x<zt(f,d)+.2||ji(f,d).y<.8))continue;this.spawned.add(h);let p=g?"duck":m.meadow>.4?u()<.58?"deer":"hare":u()<.12?"fox":u()<.58?"robin":"squirrel";Ht(f,d)>.6&&!g&&(m.site.kind==="deerhollow"?p="deer":m.site.kind==="harewarren"?p="hare":m.site.kind==="foxrocks"?p="fox":m.site.kind==="owlsentinel"||p==="robin"&&u()<.27?p="owl":p==="squirrel"&&u()<.6&&(p="hare")),p==="robin"&&u()<.3&&(p="blackbird");const M=p==="duck"?2+Math.floor(u()*2):p==="deer"?2+Math.floor(u()*3):p==="robin"?1+Math.floor(u()*2):1;for(let v=0;v<M;v++){let _=f+v*2.1,w=d+v*1.8,b=Ue(_,w);g&&(b=zt(_,w)+.015);const y=p==="robin"||p==="blackbird"||p==="owl"||g;if(y&&!g){const S=this.world.perches.filter(L=>!L.id.startsWith("rock:")&&![...this.animals.values()].some(D=>D.bird&&Math.hypot(D.x-L.x,D.z-L.z)<.7)).filter(L=>Math.hypot(L.x-_,L.z-w)<14);if(S.length){const L=S[Math.floor(u()*S.length)];_=L.x,b=L.y,w=L.z}}if(!g&&b<zt(_,w)+.2||g&&Ue(_,w)>zt(_,w)-.1)continue;const A=this.model(p==="deer"&&u()<.35?"stag":p==="hare"&&Ht(_,w)>.6?"snowhare":p),T={id:h+":"+v,kind:p,bird:y,waterBird:g,model:A,x:_,y:b,z:w,home:{x:_,z:w},yaw:u()*He,phase:u()*He,state:"idle",next:t+2+u()*9,callAt:t+2+u()*12,callCount:0,spooked:!1,age:0,target:null,trackX:_,trackZ:w};A.root.position.set(_,b,w),A.root.rotation.y=T.yaw,A.root.scale.setScalar(y?1.15:p==="deer"?.85+u()*.18:1),this.scene.add(A.root),this.animals.set(T.id,T)}}for(const[o,a]of this.animals)Math.hypot(a.x-e.x,a.z-e.z)>140&&(this.audio.removeAnimal(o),this.scene.remove(a.model.root),this.animals.delete(o));for(const o of this.spawned){const[a,c]=o.split(",").map(Number);Math.hypot(a*30+15-e.x,c*30+15-e.z)>175&&this.spawned.delete(o)}}}targetAway(e,t){if(e.waterBird){const r=[];for(let o=0;o<24;o++){const a=o/24*He,c=e.x+Math.sin(a)*13,l=e.z+Math.cos(a)*13;!Xi(c,l).frozen&&Ue(c,l)<zt(c,l)-.2&&r.push({x:c,z:l,y:zt(c,l)+.015})}return r.sort((o,a)=>Math.hypot(a.x-t.x,a.z-t.z)-Math.hypot(o.x-t.x,o.z-t.z)),r[0]||{x:e.x,z:e.z,y:zt(e.x,e.z)+.015}}let n=e.bird?this.world.perches.filter(r=>!r.id.startsWith("rock:")&&![...this.animals.values()].some(o=>o.bird&&Math.hypot(o.x-r.x,o.z-r.z)<.7)):this.world.trees;if(n=n.filter(r=>{const o=Math.hypot(r.x-e.x,r.z-e.z);return o>10&&o<32&&Math.hypot(r.x-t.x,r.z-t.z)>18}),n.length){n.sort((o,a)=>Math.hypot(o.x-e.x,o.z-e.z)-Math.hypot(a.x-e.x,a.z-e.z));const r=n[0];return{x:r.x,y:e.bird?r.y:Ue(r.x,r.z),z:r.z,tree:e.bird?null:r}}const i=Math.atan2(e.x-t.x,e.z-t.z)+(Ve(Math.floor(e.x),Math.floor(e.z),97)-.5)*1.4;return{x:e.x+Math.sin(i)*24,z:e.z+Math.cos(i)*24,y:0}}update(e,t,n,i){if(!i)return;this.tick++,this.spawn(n,t);const r=Math.hypot(n.vx,n.vz);for(const o of this.animals.values()){const a=Math.hypot(o.x-n.x,o.z-n.z),c=o.model;if(c.root.visible=a<(o.bird?46:85),a>85)continue;o.age+=e,o.state,o.state;const l=o.waterBird?r>3?14:r<1.5?4:7:o.bird?r>3?11:r<1.5?2.7:4.3:o.kind==="squirrel"?r>3?13:r<1.5?3.4:5:r>3?25:r<1.5?6.5:12;if(a<l&&o.state!=="fly"&&o.state!=="flee"&&o.state!=="climb"&&o.state!=="tree"&&o.state!=="descend"&&(o.state=o.bird?"fly":"flee",o.target=this.targetAway(o,n),o.origin={x:o.x,y:o.y,z:o.z},o.age=0,o.spooked=!0,this.spooks[o.bird?"bird":o.kind]++,o.waterBird&&this.audio.splashAt(o.x,o.y,o.z,.16),this.audio.rustleAt(o.x,o.y,o.z,o.bird?.06:.13),this.events.push({kind:o.kind,type:"flee",distance:a,time:t}),this.events.length>20&&this.events.shift()),o.state==="fly"){const h=Tr(o.age/3.1),u=h*h*(3-2*h);o.x=Ke(o.origin.x,o.target.x,u),o.z=Ke(o.origin.z,o.target.z,u);const f=o.target.y||Ue(o.target.x,o.target.z)+.02;o.y=Ke(o.origin.y,f,u)+Math.sin(h*Math.PI)*5,o.yaw=Math.atan2(o.target.x-o.origin.x,o.target.z-o.origin.z),c.body.rotation.x=-.15;for(let d=0;d<2;d++)c.wings[d].rotation.z=(d?1:-1)*(1+Math.sin(t*(o.kind==="owl"?18:43)+o.phase)*.85),c.wings[d].rotation.y=(d?1:-1)*.8;h>=1&&(o.state="idle",o.age=0,o.next=t+6,o.callAt=t+6+Ve(o.x,o.z)*10,c.body.rotation.x=0,c.wings.forEach(d=>d.rotation.set(0,0,0)))}else if(o.state==="flee"||o.state==="wander"){const h=o.state==="flee",u=o.target.x-o.x,f=o.target.z-o.z,d=Math.hypot(u,f),m=h?o.kind==="squirrel"?5:6.5:o.kind==="deer"?.5:.8;if(d>.6){const x=Math.min(d,m*e),g=o.x+u/d*x,p=o.z+f/d*x;if(Ue(g,p)>zt(g,p)+.1){const v=this.world.move(o.x,o.z,g-o.x,p-o.z);o.x=v.x,o.z=v.z}else o.target={x:o.x,z:o.z};o.yaw=Math.atan2(u,f),o.y=Ue(o.x,o.z);const M=Math.max(0,Math.sin(o.age*(h?18:8)));c.body.position.y=h?M*(o.kind==="deer"?.12:o.kind==="hare"?.18:.06):0,c.legs?.forEach((v,_)=>v.rotation.x=Math.sin(o.age*(h?18:8)+_%2*Math.PI)*(h?.8:.25)),this.tick%45===0&&a<22&&this.audio.rustleAt(o.x,o.y,o.z,.07)}(d<1||o.age>7)&&(h&&d<1&&o.kind==="squirrel"&&o.target.tree?(o.state="climb",o.tree=o.target.tree,o.y=Ue(o.tree.x,o.tree.z),o.climbAngle=o.yaw+Math.PI):(o.state="idle",o.next=t+3+Ve(o.x,o.z)*6,c.body.position.y=0,c.legs?.forEach(x=>x.rotation.x=0)),o.age=0)}else if(o.state==="climb")o.y+=e*2.7,c.body.rotation.x=-1.1,c.tail.rotation.x=.3,(o.age>1.8||o.y>o.tree.y+this.world.prototypes[o.tree.species*3+o.tree.variant].near.height*o.tree.scale*.55)&&(o.state="tree",o.next=t+20);else if(o.state==="tree")t>o.next&&a>12&&(o.state="descend",o.age=0);else if(o.state==="descend")o.y-=e*1.8,c.body.rotation.x=1.1,o.y<=Ue(o.x,o.z)&&(o.y=Ue(o.x,o.z),o.state="idle",o.next=t+8,c.body.rotation.x=0);else{if(c.body.position.y=Math.sin(t*2+o.phase)*.004,o.bird?(c.head.rotation.y=Math.sin(Math.floor(t*1.4+o.phase))*.35,c.tail.rotation.x=Math.sin(t*3+o.phase)*.08,!o.waterBird&&t>o.callAt&&a<34&&(this.audio.call(o.id,o.kind,{x:o.x,y:o.y+.28,z:o.z}),o.callAt=t+(o.kind==="owl"?24:8)+Ve(Math.floor(t),o.x)*18,o.callCount++,this.calls++)):(c.head.rotation.x=o.kind==="deer"?Math.sin(t*.45+o.phase)*.45+.2:Math.sin(t*2+o.phase)*.1,c.head.rotation.y=Math.sin(t*.72+o.phase)*.27,c.tail.rotation.z=Math.sin(t*2+o.phase)*(o.kind==="squirrel"?.1:.03)),o.bird&&!o.waterBird&&t>o.next+27&&a>7){const h=this.world.perches.filter(u=>!u.id.startsWith("rock:")&&![...this.animals.values()].some(f=>f.bird&&Math.hypot(f.x-u.x,f.z-u.z)<.7)).filter(u=>Math.hypot(u.x-o.x,u.z-o.z)>7&&Math.hypot(u.x-o.x,u.z-o.z)<22);h.length?(o.target=h[Math.floor(Ve(o.x,Math.floor(t),38)*h.length)],o.origin={x:o.x,y:o.y,z:o.z},o.state="fly",o.age=0):o.next=t+12}if(!o.bird&&t>o.next){const h=Ve(Math.floor(t),o.x)*He,u=o.x+Math.sin(h)*4,f=o.z+Math.cos(h)*4;Ue(u,f)>zt(u,f)+.2&&(o.state="wander",o.target={x:u,z:f},o.age=0),o.next=t+5+Ve(o.x,t)*9}}if(!o.bird&&Math.hypot(o.x-o.trackX,o.z-o.trackZ)>(o.kind==="deer"?.75:.32)&&o.state!=="tree"&&o.state!=="climb"){const h=Sn(o.x,o.z);this.world.winter.animalTrack(o.x,o.z,o.yaw,t,o.kind==="deer"?.8:o.kind==="hare"?.65:.48,o.kind),(Yi(o.x,o.z)<2.5||h.d<h.width+7)&&this.tracks.push({x:o.x,z:o.z,angle:o.yaw,size:o.kind==="deer"?1:.4,time:t}),o.trackX=o.x,o.trackZ=o.z}if(!o.bird&&(o.state==="idle"||o.state==="wander"||o.state==="flee"))for(const h of this.animals.values()){if(h===o||h.bird||h.state==="climb"||h.state==="tree"||h.state==="descend")continue;const u=o.x-h.x,f=o.z-h.z,d=Math.hypot(u,f),m=(o.kind==="deer"?.95:.28)+(h.kind==="deer"?.95:.28);if(d>.001&&d<m){const x=(m-d)*.55,g=this.world.move(o.x,o.z,u/d*x,f/d*x);Ue(g.x,g.z)>zt(g.x,g.z)+.1&&(o.x=g.x,o.z=g.z,o.y=Ue(o.x,o.z))}}if(o.state==="climb"||o.state==="tree"||o.state==="descend"){const h=this.world.trunkPoint(o.tree,o.y+.28),u=h.r+.23;o.x=h.x+Math.sin(o.climbAngle)*u,o.z=h.z+Math.cos(o.climbAngle)*u}if(o.waterBird&&o.state!=="fly"){const h=o.phase+t*.11,u=o.x+Math.sin(h)*e*.21,f=o.z+Math.cos(h)*e*.21;!Xi(u,f).frozen&&Ue(u,f)<zt(u,f)-.12&&(o.x=u,o.z=f,o.yaw=h),o.y=zt(o.x,o.z)+Math.sin(t*1.8+o.phase)*.008,this.tick%85===0&&a<32&&this.world.rivers.splash(o.x,o.z,t)}c.root.position.set(o.x,o.y,o.z),c.root.rotation.y=o.yaw,this.audio.moveAnimal(o.id,o.x,o.y+.25,o.z)}this.tracks=this.tracks.filter(o=>t-o.time<70&&Ai(o.x,o.z)<.5).slice(-180),this.trackMesh.count=this.tracks.length,this.tracks.forEach((o,a)=>{const c=this.dummy;c.position.set(o.x,Ue(o.x,o.z)+.023,o.z),c.quaternion.setFromUnitVectors(new C(0,1,0),ji(o.x,o.z)),c.rotateY(o.angle),c.scale.setScalar(o.size),c.updateMatrix(),this.trackMesh.setMatrixAt(a,c.matrix)}),this.trackMesh.instanceMatrix.needsUpdate=!0}inspect(e){return{tracks:this.tracks.length,count:this.animals.size,calls:this.calls,spooks:{...this.spooks},nearby:[...this.animals.values()].map(t=>({id:t.id,kind:t.kind,x:t.x,y:t.y,z:t.z,state:t.state,calls:t.callCount,distance:Math.hypot(t.x-e.x,t.z-e.z)})).sort((t,n)=>t.distance-n.distance).slice(0,12),events:this.events}}}const Ar=document.querySelector("#forest"),wr=document.querySelector("#enter"),Oo=document.querySelector("#error"),Gt=new Set,It=new Y1;let rn=!1,Ro=!1,Ms=!matchMedia("(prefers-reduced-motion: reduce)").matches,Tt,At,_o,Vt={},sr=0,Y={x:40,z:6,y:Ue(40,6)+1.69,yaw:-.785,pitch:.025,vx:0,vz:0,vy:0,distance:0},vn=0,Co=performance.now(),Na=0,hr=[],zc={},wu=0,bu=0;try{const s=JSON.parse(localStorage.getItem("autumn:walk:v4")||"null");s&&[s.x,s.z,s.yaw,s.pitch].every(Number.isFinite)&&(Y={...Y,...s},Y.y=Ue(Y.x,Y.z)+1.69)}catch{}function bl(){try{localStorage.setItem("autumn:walk:v4",JSON.stringify({x:Y.x,z:Y.z,yaw:Y.yaw,pitch:Y.pitch}))}catch{}}function ko(){rn=!1,Gt.clear(),Y.vx=Y.vz=0,document.body.classList.remove("walking"),wr.textContent="Continue walking",It.pause(),bl()}async function Nf(){if(Ro){await It.start();try{await Ar.requestPointerLock()}catch{Oo.textContent="Click the forest to use the mouse. Escape releases it."}}}wr.addEventListener("click",Nf);Ar.addEventListener("click",()=>{rn||Nf()});document.addEventListener("pointerlockchange",()=>{rn=document.pointerLockElement===Ar,rn?(document.body.classList.add("walking"),It.start(),Co=performance.now(),Oo.textContent=""):ko()});document.addEventListener("mousemove",s=>{rn&&(Y.yaw-=s.movementX*.00165,Y.pitch=Tr(Y.pitch-s.movementY*.00165,-1.42,1.42))});window.addEventListener("keydown",s=>{if(s.code==="Escape"&&rn){document.exitPointerLock(),ko();return}["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","ShiftLeft","ShiftRight","ControlLeft","ControlRight"].includes(s.code)&&(rn&&s.preventDefault(),Gt.add(s.code))});window.addEventListener("keyup",s=>Gt.delete(s.code));window.addEventListener("blur",()=>{Gt.clear(),Y.vx=Y.vz=0,document.pointerLockElement&&document.exitPointerLock()});document.addEventListener("visibilitychange",()=>{document.hidden&&(Gt.clear(),document.pointerLockElement&&document.exitPointerLock(),ko())});window.addEventListener("pagehide",bl);document.querySelector("#sound").onclick=s=>{It.setEnabled(!It.enabled),s.target.textContent=It.enabled?"Sound on":"Sound off",s.target.setAttribute("aria-pressed",String(It.enabled))};document.querySelector("#quality").onclick=s=>{Tt&&(s.target.textContent="Detail: "+Tt.detail())};document.querySelector("#sway").textContent=Ms?"Walking motion on":"Walking motion off";document.querySelector("#sway").onclick=s=>{Ms=!Ms,s.target.textContent=Ms?"Walking motion on":"Walking motion off",s.target.setAttribute("aria-pressed",String(Ms))};document.querySelector("#full").onclick=()=>{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{})};Ar.addEventListener("webglcontextlost",s=>{s.preventDefault(),ko(),Oo.textContent="The graphics connection was interrupted. Reload to continue from your last position."});function Su(){const s=T1(Y.x,Y.z,Y.y),e=Xi(Y.x,Y.z);return e.frozen&&At.walkHeight(Y.x,Y.z)>=e.level-.02?{...s,depth:0,swimming:!1,underwater:!1,frozen:!0}:At.walkHeight(Y.x,Y.z)>s.level+.06&&At.walkHeight(Y.x,Y.z)>Ue(Y.x,Y.z)+.12?{...s,depth:0,swimming:!1,underwater:!1}:s}function zf(s){requestAnimationFrame(zf),s=performance.now();const e=Math.max(0,(s-Co)/1e3),t=Math.min(.15,e);if(Co=s,document.hidden||!Ro)return;if(!rn){if(s-bu<140)return;bu=s}if(vn+=t,en.time.value=vn,rn&&vn>4&&Tt.observeFrame(e*1e3),rn){const r=t,o=Math.ceil(r/.025);for(let a=0;a<o;a++){const c=r/o;let l=(Gt.has("KeyW")||Gt.has("ArrowUp")?1:0)-(Gt.has("KeyS")||Gt.has("ArrowDown")?1:0),h=(Gt.has("KeyD")?1:0)-(Gt.has("KeyA")?1:0);Gt.has("ArrowLeft")&&(Y.yaw+=c*1.1),Gt.has("ArrowRight")&&(Y.yaw-=c*1.1);const u=Math.hypot(l,h);u>0&&(l/=u,h/=u),Vt=Su();const f=Er(Y.x,Y.z),d=At.walkSurface(Y.x,Y.z)||Nc(Y.x,Y.z),m=Gt.has("ShiftLeft")||Gt.has("ShiftRight"),x=Gt.has("ControlLeft")||Gt.has("ControlRight"),g=(x?1.15:m?4.6:2.7)*(Vt.swimming?.46:Vt.depth>.15?.61:d==="snow"?1-f.powder*.46:1),p=(h*Math.cos(Y.yaw)-l*Math.sin(Y.yaw))*g,M=(-l*Math.cos(Y.yaw)-h*Math.sin(Y.yaw))*g,v=1-Math.exp(-c*(Vt.frozen?u?6.5:8.5:u?15:22));Y.vx+=(p-Y.vx)*v,Y.vz+=(M-Y.vz)*v;const _=At.move(Y.x,Y.z,Y.vx*c,Y.vz*c+(Vt.depth>1.2?.16+Vt.spray*.5:0)*c),w=Math.hypot(_.x-Y.x,_.z-Y.z);if(Y.x=_.x,Y.z=_.z,Y.distance+=w,Na+=w,Na>(Vt.swimming?1.3:m?1.05:.86)){Na=0;const y=At.walkSurface(Y.x,Y.z)||Nc(Y.x,Y.z);It.step(Y.x,Y.z,m,y,sr,x),At.winter.step(Y,vn,y,m),y==="ice"&&It.iceStep(Y.x,Y.y-1.69,Y.z,m,x),y==="water"&&At.rivers.splash(Y.x,Y.z,vn),y==="leaves"&&At.kick(Y.x-Math.sin(Y.yaw)*.32,Y.z-Math.cos(Y.yaw)*.32,Y.vx,Y.vz)}Vt=Su(),sr=Math.max(sr-c*.018,Vt.spray,Vt.depth>.7?.8:0);const b=Math.max(At.walkHeight(Y.x,Y.z)+1.69,Vt.swimming?Vt.level+.34:-1/0);Vt.swimming?(Y.vy+=(b-Y.y)*c*12,Y.vy*=Math.exp(-c*4),Y.y+=Y.vy*c):Y.y>b+.16?(Y.vy-=c*9.81,Y.y+=Y.vy*c,Y.y<b&&(Y.y=b,Y.vy=0)):(Y.y+=(b-Y.y)*(1-Math.exp(-c*16)),Y.vy=0),vn-wu>8&&(bl(),wu=vn)}}const n=Math.min(1,Math.hypot(Y.vx,Y.vz)),i=rn&&Ms?Math.sin(Y.distance*ny/.86)*.014*n:0;Tt.camera.position.set(Y.x,Y.y+i,Y.z),Tt.camera.rotation.set(Y.pitch,Y.yaw,0),en.player.value.copy(Tt.camera.position),At.update(t,vn,Y),_o.update(t,vn,Y,rn),It.update(vn,Y,At,Vt),Tt.setWetness(sr,Vt.spray||0,Vt.underwater||!1),zc=Tt.render(vn),rn&&(hr.push(e*1e3),hr.length>1200&&hr.shift())}const ny=Math.PI*2;async function iy(){Tt=new R1(Ar);const s=X1(Y.x,Y.z),[e]=await Promise.all([b1(Tt.renderer),Tt.loadSky()]);At=new q1(Tt.scene,e,s),At.winter.audio=It,await At.init(Y.x,Y.z),_o=new ty(Tt.scene,At,It),_o.spawn(Y,vn),Y.y=At.walkHeight(Y.x,Y.z)+1.69,Tt.camera.position.set(Y.x,Y.y,Y.z),Tt.camera.rotation.set(Y.pitch,Y.yaw,0),Tt.renderer.shadowMap.needsUpdate=!0,await Tt.renderer.compileAsync(Tt.scene,Tt.camera),Tt.render(0),Ro=!0,wr.disabled=!1,wr.textContent="Walk",Co=performance.now(),requestAnimationFrame(zf),window.AUTUMN=Object.freeze({inspect:()=>{const t=[...hr].sort((i,r)=>i-r),n=Ki(Y.x,Y.z);return{ready:Ro,walking:rn,position:{x:Y.x,y:Y.y,z:Y.z},yaw:Y.yaw,pitch:Y.pitch,distance:Y.distance,steps:It.steps,frames:hr.length,medianMs:t[Math.floor(t.length*.5)]||0,p95Ms:t[Math.floor(t.length*.95)]||0,drawCalls:zc.calls,triangles:zc.tris,tiles:At.tiles.size,objects:Tt.renderer.info.memory,nearestPlace:n.name,places:At.scenery.loaded,placeDistance:Math.hypot(Y.x-n.x,Y.z-n.z),streamRebuilds:At.rebuilds,season:Er(Y.x,Y.z),winter:At.winter.inspect(),surface:At.walkSurface(Y.x,Y.z)||Nc(Y.x,Y.z),water:{...Vt,wetness:sr},wildlife:_o.inspect(Y),audio:{falls:It.audibleFalls,calls:It.calls,state:It.ctx?.state||"not started",enabled:It.enabled,peak:It.peak,snowSteps:It.snowSteps||0,iceTones:It.iceTones||0,lastSurface:It.lastSurface,samples:It.samples.filter(Boolean).length},quality:Tt.quality,renderScale:Tt.renderScale||1,renderSize:{width:Tt.target.width,height:Tt.target.height},leafParticles:At.fallCount,kickedLeaves:At.kicks.length,hasHUD:document.body.classList.contains("walking")?getComputedStyle(document.querySelector("#veil")).visibility!=="hidden":!1}}})}iy().catch(s=>{console.error(s),wr.textContent="Unable to load",Oo.textContent="The forest could not load. Reload to try again. "+s.message});
