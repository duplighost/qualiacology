import{r as e}from"./rolldown-runtime-s-yswqyj.js";import{i as t,r as n}from"./framework-djphiq1u.js";var r=e(t(),1),i=1e3,a=1001,o=1002,s=1003,c=1004,l=1005,u=1006,d=1007,f=1008,p=1009,m=1010,h=1011,g=1012,_=1013,v=1014,y=1015,b=1016,x=1017,S=1018,C=1020,w=35902,T=35899,E=1021,D=1022,O=1023,k=1026,A=1027,j=1028,ee=1029,M=1030,te=1031,ne=1033,N=33776,re=33777,ie=33778,ae=33779,oe=35840,se=35841,ce=35842,le=35843,P=36196,ue=37492,F=37496,de=37488,fe=37489,pe=37490,me=37491,he=37808,ge=37809,_e=37810,ve=37811,ye=37812,be=37813,xe=37814,Se=37815,Ce=37816,we=37817,Te=37818,Ee=37819,De=37820,Oe=37821,ke=36492,Ae=36494,je=36495,Me=36283,I=36284,Ne=36285,Pe=36286,Fe=2300,L=2301,Ie=2302,R=2303,Le=2400,Re=2401,ze=2402,Be=3200,Ve=`srgb`,He=`srgb-linear`,Ue=`linear`,We=`srgb`,Ge=7680,Ke=35044,qe=35048,Je=2e3;function Ye(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function Xe(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function Ze(e){return document.createElementNS(`http://www.w3.org/1999/xhtml`,e)}function Qe(){let e=Ze(`canvas`);return e.style.display=`block`,e}var $e={},et=null;function tt(...e){let t=`THREE.`+e.shift();et?et(`log`,t,...e):console.log(t,...e)}function nt(e){let t=e[0];if(typeof t==`string`&&t.startsWith(`TSL:`)){let t=e[1];t&&t.isStackTrace?e[0]+=` `+t.getLocation():e[1]=`Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.`}return e}function z(...e){e=nt(e);let t=`THREE.`+e.shift();if(et)et(`warn`,t,...e);else{let n=e[0];n&&n.isStackTrace?console.warn(n.getError(t)):console.warn(t,...e)}}function B(...e){e=nt(e);let t=`THREE.`+e.shift();if(et)et(`error`,t,...e);else{let n=e[0];n&&n.isStackTrace?console.error(n.getError(t)):console.error(t,...e)}}function rt(...e){let t=e.join(` `);t in $e||($e[t]=!0,z(...e))}function it(e,t,n){return new Promise(function(r,i){function a(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:i();break;case e.TIMEOUT_EXPIRED:setTimeout(a,n);break;default:r()}}setTimeout(a,n)})}var at={0:1,2:6,4:7,3:5,1:0,6:2,7:4,5:3},ot=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let r=n[e];if(r!==void 0){let e=r.indexOf(t);e!==-1&&r.splice(e,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let t=n.slice(0);for(let n=0,r=t.length;n<r;n++)t[n].call(this,e);e.target=null}}},st=`00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff`.split(`.`),ct=1234567,lt=Math.PI/180,ut=180/Math.PI;function dt(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(st[e&255]+st[e>>8&255]+st[e>>16&255]+st[e>>24&255]+`-`+st[t&255]+st[t>>8&255]+`-`+st[t>>16&15|64]+st[t>>24&255]+`-`+st[n&63|128]+st[n>>8&255]+`-`+st[n>>16&255]+st[n>>24&255]+st[r&255]+st[r>>8&255]+st[r>>16&255]+st[r>>24&255]).toLowerCase()}function V(e,t,n){return Math.max(t,Math.min(n,e))}function ft(e,t){return(e%t+t)%t}function pt(e,t,n,r,i){return r+(e-t)*(i-r)/(n-t)}function mt(e,t,n){return e===t?0:(n-e)/(t-e)}function ht(e,t,n){return(1-n)*e+n*t}function gt(e,t,n,r){return ht(e,t,1-Math.exp(-n*r))}function _t(e,t=1){return t-Math.abs(ft(e,t*2)-t)}function vt(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*(3-2*e))}function yt(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*e*(e*(e*6-15)+10))}function bt(e,t){return e+Math.floor(Math.random()*(t-e+1))}function xt(e,t){return e+Math.random()*(t-e)}function St(e){return e*(.5-Math.random())}function Ct(e){e!==void 0&&(ct=e);let t=ct+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function wt(e){return e*lt}function Tt(e){return e*ut}function Et(e){return(e&e-1)==0&&e!==0}function Dt(e){return 2**Math.ceil(Math.log(e)/Math.LN2)}function Ot(e){return 2**Math.floor(Math.log(e)/Math.LN2)}function kt(e,t,n,r,i){let a=Math.cos,o=Math.sin,s=a(n/2),c=o(n/2),l=a((t+r)/2),u=o((t+r)/2),d=a((t-r)/2),f=o((t-r)/2),p=a((r-t)/2),m=o((r-t)/2);switch(i){case`XYX`:e.set(s*u,c*d,c*f,s*l);break;case`YZY`:e.set(c*f,s*u,c*d,s*l);break;case`ZXZ`:e.set(c*d,c*f,s*u,s*l);break;case`XZX`:e.set(s*u,c*m,c*p,s*l);break;case`YXY`:e.set(c*p,s*u,c*m,s*l);break;case`ZYZ`:e.set(c*m,c*p,s*u,s*l);break;default:z(`MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: `+i)}}function At(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}function jt(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw Error(`THREE.MathUtils: Invalid component type.`)}}var Mt={DEG2RAD:lt,RAD2DEG:ut,generateUUID:dt,clamp:V,euclideanModulo:ft,mapLinear:pt,inverseLerp:mt,lerp:ht,damp:gt,pingpong:_t,smoothstep:vt,smootherstep:yt,randInt:bt,randFloat:xt,randFloatSpread:St,seededRandom:Ct,degToRad:wt,radToDeg:Tt,isPowerOfTwo:Et,ceilPowerOfTwo:Dt,floorPowerOfTwo:Ot,setQuaternionFromProperEuler:kt,normalize:jt,denormalize:At},H=class e{static{e.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error(`THREE.Vector2: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error(`THREE.Vector2: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=V(this.x,e.x,t.x),this.y=V(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=V(this.x,e,t),this.y=V(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(V(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(V(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Nt=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let s=n[r+0],c=n[r+1],l=n[r+2],u=n[r+3],d=i[a+0],f=i[a+1],p=i[a+2],m=i[a+3];if(u!==m||s!==d||c!==f||l!==p){let e=s*d+c*f+l*p+u*m;e<0&&(d=-d,f=-f,p=-p,m=-m,e=-e);let t=1-o;if(e<.9995){let n=Math.acos(e),r=Math.sin(n);t=Math.sin(t*n)/r,o=Math.sin(o*n)/r,s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o}else{s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o;let e=1/Math.sqrt(s*s+c*c+l*l+u*u);s*=e,c*=e,l*=e,u*=e}}e[t]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,i,a){let o=n[r],s=n[r+1],c=n[r+2],l=n[r+3],u=i[a],d=i[a+1],f=i[a+2],p=i[a+3];return e[t]=o*p+l*u+s*f-c*d,e[t+1]=s*p+l*d+c*u-o*f,e[t+2]=c*p+l*f+o*d-s*u,e[t+3]=l*p-o*u-s*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o(n/2),l=o(r/2),u=o(i/2),d=s(n/2),f=s(r/2),p=s(i/2);switch(a){case`XYZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`YXZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`ZXY`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`ZYX`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`YZX`:this._x=d*l*u+c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u-d*f*p;break;case`XZY`:this._x=d*l*u-c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u+d*f*p;break;default:z(`Quaternion: .setFromEuler() encountered an unknown order: `+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],s=t[9],c=t[2],l=t[6],u=t[10],d=n+o+u;if(d>0){let e=.5/Math.sqrt(d+1);this._w=.25/e,this._x=(l-s)*e,this._y=(i-c)*e,this._z=(a-r)*e}else if(n>o&&n>u){let e=2*Math.sqrt(1+n-o-u);this._w=(l-s)/e,this._x=.25*e,this._y=(r+a)/e,this._z=(i+c)/e}else if(o>u){let e=2*Math.sqrt(1+o-n-u);this._w=(i-c)/e,this._x=(r+a)/e,this._y=.25*e,this._z=(s+l)/e}else{let e=2*Math.sqrt(1+u-n-o);this._w=(a-r)/e,this._x=(i+c)/e,this._y=(s+l)/e,this._z=.25*e}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(V(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,s=t._y,c=t._z,l=t._w;return this._x=n*l+a*o+r*c-i*s,this._y=r*l+a*s+i*o-n*c,this._z=i*l+a*c+n*s-r*o,this._w=a*l-n*o-r*s-i*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,i=-i,a=-a,o=-o);let s=1-t;if(o<.9995){let e=Math.acos(o),c=Math.sin(e);s=Math.sin(s*e)/c,t=Math.sin(t*e)/c,this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this._onChangeCallback()}else this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},U=class e{static{e.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error(`THREE.Vector3: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error(`THREE.Vector3: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Ft.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Ft.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,s=e.w,c=2*(a*r-o*n),l=2*(o*t-i*r),u=2*(i*n-a*t);return this.x=t+s*c+a*u-o*l,this.y=n+s*l+o*c-i*u,this.z=r+s*u+i*l-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=V(this.x,e.x,t.x),this.y=V(this.y,e.y,t.y),this.z=V(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=V(this.x,e,t),this.y=V(this.y,e,t),this.z=V(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(V(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,s=t.z;return this.x=r*s-i*o,this.y=i*a-n*s,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Pt.copy(this).projectOnVector(e),this.sub(Pt)}reflect(e){return this.sub(Pt.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(V(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Pt=new U,Ft=new Nt,W=class e{static{e.prototype.isMatrix3=!0}constructor(e,t,n,r,i,a,o,s,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c)}set(e,t,n,r,i,a,o,s,c){let l=this.elements;return l[0]=e,l[1]=r,l[2]=o,l[3]=t,l[4]=i,l[5]=s,l[6]=n,l[7]=a,l[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],s=n[6],c=n[1],l=n[4],u=n[7],d=n[2],f=n[5],p=n[8],m=r[0],h=r[3],g=r[6],_=r[1],v=r[4],y=r[7],b=r[2],x=r[5],S=r[8];return i[0]=a*m+o*_+s*b,i[3]=a*h+o*v+s*x,i[6]=a*g+o*y+s*S,i[1]=c*m+l*_+u*b,i[4]=c*h+l*v+u*x,i[7]=c*g+l*y+u*S,i[2]=d*m+f*_+p*b,i[5]=d*h+f*v+p*x,i[8]=d*g+f*y+p*S,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8];return t*a*l-t*o*c-n*i*l+n*o*s+r*i*c-r*a*s}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=l*a-o*c,d=o*s-l*i,f=c*i-a*s,p=t*u+n*d+r*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=u*m,e[1]=(r*c-l*n)*m,e[2]=(o*n-r*a)*m,e[3]=d*m,e[4]=(l*t-r*s)*m,e[5]=(r*i-o*t)*m,e[6]=f*m,e[7]=(n*s-c*t)*m,e[8]=(a*t-n*i)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){let s=Math.cos(i),c=Math.sin(i);return this.set(n*s,n*c,-n*(s*a+c*o)+a+e,-r*c,r*s,-r*(-c*a+s*o)+o+t,0,0,1),this}scale(e,t){return rt(`Matrix3: .scale() is deprecated. Use .makeScale() instead.`),this.premultiply(It.makeScale(e,t)),this}rotate(e){return rt(`Matrix3: .rotate() is deprecated. Use .makeRotation() instead.`),this.premultiply(It.makeRotation(-e)),this}translate(e,t){return rt(`Matrix3: .translate() is deprecated. Use .makeTranslation() instead.`),this.premultiply(It.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<9;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},It=new W,Lt=new W().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Rt=new W().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function zt(){let e={enabled:!0,workingColorSpace:He,spaces:{},convert:function(e,t,n){return this.enabled===!1||t===n||!t||!n?e:(this.spaces[t].transfer===`srgb`&&(e.r=Vt(e.r),e.g=Vt(e.g),e.b=Vt(e.b)),this.spaces[t].primaries!==this.spaces[n].primaries&&(e.applyMatrix3(this.spaces[t].toXYZ),e.applyMatrix3(this.spaces[n].fromXYZ)),this.spaces[n].transfer===`srgb`&&(e.r=Ht(e.r),e.g=Ht(e.g),e.b=Ht(e.b)),e)},workingToColorSpace:function(e,t){return this.convert(e,this.workingColorSpace,t)},colorSpaceToWorking:function(e,t){return this.convert(e,t,this.workingColorSpace)},getPrimaries:function(e){return this.spaces[e].primaries},getTransfer:function(e){return e===``?Ue:this.spaces[e].transfer},getToneMappingMode:function(e){return this.spaces[e].outputColorSpaceConfig.toneMappingMode||`standard`},getLuminanceCoefficients:function(e,t=this.workingColorSpace){return e.fromArray(this.spaces[t].luminanceCoefficients)},define:function(e){Object.assign(this.spaces,e)},_getMatrix:function(e,t,n){return e.copy(this.spaces[t].toXYZ).multiply(this.spaces[n].fromXYZ)},_getDrawingBufferColorSpace:function(e){return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(e=this.workingColorSpace){return this.spaces[e].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(t,n){return rt(`ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace().`),e.workingToColorSpace(t,n)},toWorkingColorSpace:function(t,n){return rt(`ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking().`),e.colorSpaceToWorking(t,n)}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],r=[.3127,.329];return e.define({[He]:{primaries:t,whitePoint:r,transfer:Ue,toXYZ:Lt,fromXYZ:Rt,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:Ve},outputColorSpaceConfig:{drawingBufferColorSpace:Ve}},[Ve]:{primaries:t,whitePoint:r,transfer:We,toXYZ:Lt,fromXYZ:Rt,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:Ve}}}),e}var Bt=zt();function Vt(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}function Ht(e){return e<.0031308?e*12.92:1.055*e**.41666-.055}var Ut,Wt=class{static getDataURL(e,t=`image/png`){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>`u`)return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Ut===void 0&&(Ut=Ze(`canvas`)),Ut.width=e.width,Ut.height=e.height;let t=Ut.getContext(`2d`);e instanceof ImageData?t.putImageData(e,0,0):t.drawImage(e,0,0,e.width,e.height),n=Ut}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let t=Ze(`canvas`);t.width=e.width,t.height=e.height;let n=t.getContext(`2d`);n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let e=0;e<i.length;e++)i[e]=Vt(i[e]/255)*255;return n.putImageData(r,0,0),t}else if(e.data){let t=e.data.slice(0);for(let e=0;e<t.length;e++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[e]=Math.floor(Vt(t[e]/255)*255):t[e]=Vt(t[e]);return{data:t,width:e.width,height:e.height}}else return z(`ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.`),e}},Gt=0,Kt=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,`id`,{value:Gt++}),this.uuid=dt(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<`u`&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t===null?e.set(0,0,0):e.set(t.width,t.height,t.depth||0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:``},r=this.data;if(r!==null){let e;if(Array.isArray(r)){e=[];for(let t=0,n=r.length;t<n;t++)r[t].isDataTexture?e.push(qt(r[t].image)):e.push(qt(r[t]))}else e=qt(r);n.url=e}return t||(e.images[this.uuid]=n),n}};function qt(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap?Wt.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(z(`Texture: Unable to serialize Texture.`),{})}var Jt=0,Yt=new U,Xt=class e extends ot{constructor(t=e.DEFAULT_IMAGE,n=e.DEFAULT_MAPPING,r=a,i=a,o=u,s=f,c=O,l=p,d=e.DEFAULT_ANISOTROPY,m=``){super(),this.isTexture=!0,Object.defineProperty(this,`id`,{value:Jt++}),this.uuid=dt(),this.name=``,this.source=new Kt(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=r,this.wrapT=i,this.magFilter=o,this.minFilter=s,this.anisotropy=d,this.format=c,this.internalFormat=null,this.type=l,this.offset=new H(0,0),this.repeat=new H(1,1),this.center=new H(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new W,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=m,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Yt).x}get height(){return this.source.getSize(Yt).y}get depth(){return this.source.getSize(Yt).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){z(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){z(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:`Texture`,generator:`Texture.toJSON`},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:`dispose`})}transformUv(e){if(this.mapping!==300)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case i:e.x-=Math.floor(e.x);break;case a:e.x=e.x<0?0:1;break;case o:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x-=Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case i:e.y-=Math.floor(e.y);break;case a:e.y=e.y<0?0:1;break;case o:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y-=Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Xt.DEFAULT_IMAGE=null,Xt.DEFAULT_MAPPING=300,Xt.DEFAULT_ANISOTROPY=1;var Zt=class e{static{e.prototype.isVector4=!0}constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error(`THREE.Vector4: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error(`THREE.Vector4: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w===void 0?1:e.w,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i,a=.01,o=.1,s=e.elements,c=s[0],l=s[4],u=s[8],d=s[1],f=s[5],p=s[9],m=s[2],h=s[6],g=s[10];if(Math.abs(l-d)<a&&Math.abs(u-m)<a&&Math.abs(p-h)<a){if(Math.abs(l+d)<o&&Math.abs(u+m)<o&&Math.abs(p+h)<o&&Math.abs(c+f+g-3)<o)return this.set(1,0,0,0),this;t=Math.PI;let e=(c+1)/2,s=(f+1)/2,_=(g+1)/2,v=(l+d)/4,y=(u+m)/4,b=(p+h)/4;return e>s&&e>_?e<a?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(e),r=v/n,i=y/n):s>_?s<a?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(s),n=v/r,i=b/r):_<a?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(_),n=y/i,r=b/i),this.set(n,r,i,t),this}let _=Math.sqrt((h-p)*(h-p)+(u-m)*(u-m)+(d-l)*(d-l));return Math.abs(_)<.001&&(_=1),this.x=(h-p)/_,this.y=(u-m)/_,this.z=(d-l)/_,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=V(this.x,e.x,t.x),this.y=V(this.y,e.y,t.y),this.z=V(this.z,e.z,t.z),this.w=V(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=V(this.x,e,t),this.y=V(this.y,e,t),this.z=V(this.z,e,t),this.w=V(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(V(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},Qt=class extends ot{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:u,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Zt(0,0,e,t),this.scissorTest=!1,this.viewport=new Zt(0,0,e,t),this.textures=[];let r=new Xt({width:e,height:t,depth:n.depth}),i=n.count;for(let e=0;e<i;e++)this.textures[e]=r.clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:u,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let e=0;e<this.textures.length;e++)this.textures[e].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,i=this.textures.length;r<i;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let n=Object.assign({},e.textures[t].image);this.textures[t].source=new Kt(n)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:`dispose`})}},$t=class extends Qt{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},en=class extends Xt{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=s,this.minFilter=s,this.wrapR=a,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}},tn=class extends Xt{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=s,this.minFilter=s,this.wrapR=a,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},nn=class e{static{e.prototype.isMatrix4=!0}constructor(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h)}set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=i,g[5]=a,g[9]=o,g[13]=s,g[2]=c,g[6]=l,g[10]=u,g[14]=d,g[3]=f,g[7]=p,g[11]=m,g[15]=h,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,r=1/rn.setFromMatrixColumn(e,0).length(),i=1/rn.setFromMatrixColumn(e,1).length(),a=1/rn.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),s=Math.cos(r),c=Math.sin(r),l=Math.cos(i),u=Math.sin(i);if(e.order===`XYZ`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=-s*u,t[8]=c,t[1]=n+r*c,t[5]=e-i*c,t[9]=-o*s,t[2]=i-e*c,t[6]=r+n*c,t[10]=a*s}else if(e.order===`YXZ`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e+i*o,t[4]=r*o-n,t[8]=a*c,t[1]=a*u,t[5]=a*l,t[9]=-o,t[2]=n*o-r,t[6]=i+e*o,t[10]=a*s}else if(e.order===`ZXY`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e-i*o,t[4]=-a*u,t[8]=r+n*o,t[1]=n+r*o,t[5]=a*l,t[9]=i-e*o,t[2]=-a*c,t[6]=o,t[10]=a*s}else if(e.order===`ZYX`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=r*c-n,t[8]=e*c+i,t[1]=s*u,t[5]=i*c+e,t[9]=n*c-r,t[2]=-c,t[6]=o*s,t[10]=a*s}else if(e.order===`YZX`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=i-e*u,t[8]=r*u+n,t[1]=u,t[5]=a*l,t[9]=-o*l,t[2]=-c*l,t[6]=n*u+r,t[10]=e-i*u}else if(e.order===`XZY`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=-u,t[8]=c*l,t[1]=e*u+i,t[5]=a*l,t[9]=n*u-r,t[2]=r*u-n,t[6]=o*l,t[10]=i*u+e}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(on,e,sn)}lookAt(e,t,n){let r=this.elements;return un.subVectors(e,t),un.lengthSq()===0&&(un.z=1),un.normalize(),cn.crossVectors(n,un),cn.lengthSq()===0&&(Math.abs(n.z)===1?un.x+=1e-4:un.z+=1e-4,un.normalize(),cn.crossVectors(n,un)),cn.normalize(),ln.crossVectors(un,cn),r[0]=cn.x,r[4]=ln.x,r[8]=un.x,r[1]=cn.y,r[5]=ln.y,r[9]=un.y,r[2]=cn.z,r[6]=ln.z,r[10]=un.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],O=r[13],k=r[2],A=r[6],j=r[10],ee=r[14],M=r[3],te=r[7],ne=r[11],N=r[15];return i[0]=a*x+o*T+s*k+c*M,i[4]=a*S+o*E+s*A+c*te,i[8]=a*C+o*D+s*j+c*ne,i[12]=a*w+o*O+s*ee+c*N,i[1]=l*x+u*T+d*k+f*M,i[5]=l*S+u*E+d*A+f*te,i[9]=l*C+u*D+d*j+f*ne,i[13]=l*w+u*O+d*ee+f*N,i[2]=p*x+m*T+h*k+g*M,i[6]=p*S+m*E+h*A+g*te,i[10]=p*C+m*D+h*j+g*ne,i[14]=p*w+m*O+h*ee+g*N,i[3]=_*x+v*T+y*k+b*M,i[7]=_*S+v*E+y*A+b*te,i[11]=_*C+v*D+y*j+b*ne,i[15]=_*w+v*O+y*ee+b*N,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15],_=s*f-c*d,v=o*f-c*u,y=o*d-s*u,b=a*f-c*l,x=a*d-s*l,S=a*u-o*l;return t*(m*_-h*v+g*y)-n*(p*_-h*b+g*x)+r*(p*v-m*b+g*S)-i*(p*y-m*x+h*S)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[1],a=e[5],o=e[9],s=e[2],c=e[6],l=e[10];return t*(a*l-o*c)-n*(i*l-o*s)+r*(i*c-a*s)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=t*o-n*a,v=t*s-r*a,y=t*c-i*a,b=n*s-r*o,x=n*c-i*o,S=r*c-i*s,C=l*m-u*p,w=l*h-d*p,T=l*g-f*p,E=u*h-d*m,D=u*g-f*m,O=d*g-f*h,k=_*O-v*D+y*E+b*T-x*w+S*C;if(k===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let A=1/k;return e[0]=(o*O-s*D+c*E)*A,e[1]=(r*D-n*O-i*E)*A,e[2]=(m*S-h*x+g*b)*A,e[3]=(d*x-u*S-f*b)*A,e[4]=(s*T-a*O-c*w)*A,e[5]=(t*O-r*T+i*w)*A,e[6]=(h*y-p*S-g*v)*A,e[7]=(l*S-d*y+f*v)*A,e[8]=(a*D-o*T+c*C)*A,e[9]=(n*T-t*D-i*C)*A,e[10]=(p*x-m*y+g*_)*A,e[11]=(u*y-l*x-f*_)*A,e[12]=(o*w-a*E-s*C)*A,e[13]=(t*E-n*w+r*C)*A,e[14]=(m*v-p*b-h*_)*A,e[15]=(l*b-u*v+d*_)*A,this}scale(e){let t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,s=e.z,c=i*a,l=i*o;return this.set(c*a+n,c*o-r*s,c*s+r*o,0,c*o+r*s,l*o+n,l*s-r*a,0,c*s-r*o,l*s+r*a,i*s*s+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,i=t._x,a=t._y,o=t._z,s=t._w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let i=this.determinantAffine();if(i===0)return n.set(1,1,1),t.identity(),this;let a=rn.set(r[0],r[1],r[2]).length(),o=rn.set(r[4],r[5],r[6]).length(),s=rn.set(r[8],r[9],r[10]).length();i<0&&(a=-a),an.copy(this);let c=1/a,l=1/o,u=1/s;return an.elements[0]*=c,an.elements[1]*=c,an.elements[2]*=c,an.elements[4]*=l,an.elements[5]*=l,an.elements[6]*=l,an.elements[8]*=u,an.elements[9]*=u,an.elements[10]*=u,t.setFromRotationMatrix(an),n.x=a,n.y=o,n.z=s,this}makePerspective(e,t,n,r,i,a,o=Je,s=!1){let c=this.elements,l=2*i/(t-e),u=2*i/(n-r),d=(t+e)/(t-e),f=(n+r)/(n-r),p,m;if(s)p=i/(a-i),m=a*i/(a-i);else if(o===2e3)p=-(a+i)/(a-i),m=-2*a*i/(a-i);else if(o===2001)p=-a/(a-i),m=-a*i/(a-i);else throw Error(`THREE.Matrix4.makePerspective(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=Je,s=!1){let c=this.elements,l=2/(t-e),u=2/(n-r),d=-(t+e)/(t-e),f=-(n+r)/(n-r),p,m;if(s)p=1/(a-i),m=a/(a-i);else if(o===2e3)p=-2/(a-i),m=-(a+i)/(a-i);else if(o===2001)p=-1/(a-i),m=-i/(a-i);else throw Error(`THREE.Matrix4.makeOrthographic(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<16;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},rn=new U,an=new nn,on=new U(0,0,0),sn=new U(1,1,1),cn=new U,ln=new U,un=new U,dn=new nn,fn=new Nt,G=class e{constructor(t=0,n=0,r=0,i=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,i=r[0],a=r[4],o=r[8],s=r[1],c=r[5],l=r[9],u=r[2],d=r[6],f=r[10];switch(t){case`XYZ`:this._y=Math.asin(V(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-l,f),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(d,c),this._z=0);break;case`YXZ`:this._x=Math.asin(-V(l,-1,1)),Math.abs(l)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(s,c)):(this._y=Math.atan2(-u,i),this._z=0);break;case`ZXY`:this._x=Math.asin(V(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(s,i));break;case`ZYX`:this._y=Math.asin(-V(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(s,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case`YZX`:this._z=Math.asin(V(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-l,c),this._y=Math.atan2(-u,i)):(this._x=0,this._y=Math.atan2(o,f));break;case`XZY`:this._z=Math.asin(-V(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-l,f),this._y=0);break;default:z(`Euler: .setFromRotationMatrix() encountered an unknown order: `+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return dn.makeRotationFromQuaternion(e),this.setFromRotationMatrix(dn,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return fn.setFromEuler(this),this.setFromQuaternion(fn,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};G.DEFAULT_ORDER=`XYZ`;var pn=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!=0}},mn=0,hn=new U,gn=new Nt,_n=new nn,vn=new U,yn=new U,bn=new U,xn=new Nt,Sn=new U(1,0,0),Cn=new U(0,1,0),wn=new U(0,0,1),Tn={type:`added`},En={type:`removed`},Dn={type:`childadded`,child:null},On={type:`childremoved`,child:null},kn=class e extends ot{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,`id`,{value:mn++}),this.uuid=dt(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new U,n=new G,r=new Nt,i=new U(1,1,1);function a(){r.setFromEuler(n,!1)}function o(){n.setFromQuaternion(r,void 0,!1)}n._onChange(a),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new nn},normalMatrix:{value:new W}}),this.matrix=new nn,this.matrixWorld=new nn,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new pn,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return gn.setFromAxisAngle(e,t),this.quaternion.multiply(gn),this}rotateOnWorldAxis(e,t){return gn.setFromAxisAngle(e,t),this.quaternion.premultiply(gn),this}rotateX(e){return this.rotateOnAxis(Sn,e)}rotateY(e){return this.rotateOnAxis(Cn,e)}rotateZ(e){return this.rotateOnAxis(wn,e)}translateOnAxis(e,t){return hn.copy(e).applyQuaternion(this.quaternion),this.position.add(hn.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Sn,e)}translateY(e){return this.translateOnAxis(Cn,e)}translateZ(e){return this.translateOnAxis(wn,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(_n.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?vn.copy(e):vn.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),yn.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?_n.lookAt(yn,vn,this.up):_n.lookAt(vn,yn,this.up),this.quaternion.setFromRotationMatrix(_n),r&&(_n.extractRotation(r.matrixWorld),gn.setFromRotationMatrix(_n),this.quaternion.premultiply(gn.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this?(B(`Object3D.add: object can't be added as a child of itself.`,e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Tn),Dn.child=e,this.dispatchEvent(Dn),Dn.child=null):B(`Object3D.add: object not an instance of THREE.Object3D.`,e),this)}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(En),On.child=e,this.dispatchEvent(On),On.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),_n.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),_n.multiply(e.parent.matrixWorld)),e.applyMatrix4(_n),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Tn),Dn.child=e,this.dispatchEvent(Dn),Dn.child=null,this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(yn,e,bn),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(yn,xn,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,r=e.z,i=this.matrix.elements;i[12]+=t-i[0]*t-i[4]*n-i[8]*r,i[13]+=n-i[1]*t-i[5]*n-i[9]*r,i[14]+=r-i[2]*t-i[6]*n-i[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let e=this.children;for(let t=0,r=e.length;t<r;t++)e[t].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e==`string`,n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:`Object`,generator:`Object3D.toJSON`});let r={};r.uuid=this.uuid,r.type=this.type,this.name!==``&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),this.static!==!1&&(r.static=this.static),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type=`InstancedMesh`,r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type=`BatchedMesh`,r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox?e.boundingBox.toJSON():void 0,boundingSphere:e.boundingSphere?e.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(e=>({...e})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function i(t,n){return t[n.uuid]===void 0&&(t[n.uuid]=n.toJSON(e)),n.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);let t=this.geometry.parameters;if(t!==void 0&&t.shapes!==void 0){let n=t.shapes;if(Array.isArray(n))for(let t=0,r=n.length;t<r;t++){let r=n[t];i(e.shapes,r)}else i(e.shapes,n)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let t=[];for(let n=0,r=this.material.length;n<r;n++)t.push(i(e.materials,this.material[n]));r.material=t}else r.material=i(e.materials,this.material);if(this.children.length>0){r.children=[];for(let t=0;t<this.children.length;t++)r.children.push(this.children[t].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let t=0;t<this.animations.length;t++){let n=this.animations[t];r.animations.push(i(e.animations,n))}}if(t){let t=a(e.geometries),r=a(e.materials),i=a(e.textures),o=a(e.images),s=a(e.shapes),c=a(e.skeletons),l=a(e.animations),u=a(e.nodes);t.length>0&&(n.geometries=t),r.length>0&&(n.materials=r),i.length>0&&(n.textures=i),o.length>0&&(n.images=o),s.length>0&&(n.shapes=s),c.length>0&&(n.skeletons=c),l.length>0&&(n.animations=l),u.length>0&&(n.nodes=u)}return n.object=r,n;function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot===null?null:e.pivot.clone(),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t=0;t<e.children.length;t++){let n=e.children[t];this.add(n.clone())}return this}};kn.DEFAULT_UP=new U(0,1,0),kn.DEFAULT_MATRIX_AUTO_UPDATE=!0,kn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var An=class extends kn{constructor(){super(),this.isGroup=!0,this.type=`Group`}},jn={type:`move`},Mn=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new An,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new An,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new U,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new U),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new An,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new U,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new U,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:`connected`,data:e}),this}disconnect(e){return this.dispatchEvent({type:`disconnected`,data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,i=null,a=null,o=this._targetRay,s=this._grip,c=this._hand;if(e&&t.session.visibilityState!==`visible-blurred`){if(c&&e.hand){a=!0;for(let r of e.hand.values()){let e=t.getJointPose(r,n),i=this._getHandJoint(c,r);e!==null&&(i.matrix.fromArray(e.transform.matrix),i.matrix.decompose(i.position,i.rotation,i.scale),i.matrixWorldNeedsUpdate=!0,i.jointRadius=e.radius),i.visible=e!==null}let r=c.joints[`index-finger-tip`],i=c.joints[`thumb-tip`],o=r.position.distanceTo(i.position),s=.02,l=.005;c.inputState.pinching&&o>s+l?(c.inputState.pinching=!1,this.dispatchEvent({type:`pinchend`,handedness:e.handedness,target:this})):!c.inputState.pinching&&o<=s-l&&(c.inputState.pinching=!0,this.dispatchEvent({type:`pinchstart`,handedness:e.handedness,target:this}))}else s!==null&&e.gripSpace&&(i=t.getPose(e.gripSpace,n),i!==null&&(s.matrix.fromArray(i.transform.matrix),s.matrix.decompose(s.position,s.rotation,s.scale),s.matrixWorldNeedsUpdate=!0,i.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(i.linearVelocity)):s.hasLinearVelocity=!1,i.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(i.angularVelocity)):s.hasAngularVelocity=!1,s.eventsEnabled&&s.dispatchEvent({type:`gripUpdated`,data:e,target:this})));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&i!==null&&(r=i),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(jn)))}return o!==null&&(o.visible=r!==null),s!==null&&(s.visible=i!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new An;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},Nn={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Pn={h:0,s:0,l:0},Fn={h:0,s:0,l:0};function In(e,t,n){return n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var K=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let t=e;t&&t.isColor?this.copy(t):typeof t==`number`?this.setHex(t):typeof t==`string`&&this.setStyle(t)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Ve){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Bt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=Bt.workingColorSpace){return this.r=e,this.g=t,this.b=n,Bt.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=Bt.workingColorSpace){if(e=ft(e,1),t=V(t,0,1),n=V(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,i=2*n-r;this.r=In(i,r,e+1/3),this.g=In(i,r,e),this.b=In(i,r,e-1/3)}return Bt.colorSpaceToWorking(this,r),this}setStyle(e,t=Ve){function n(t){t!==void 0&&parseFloat(t)<1&&z(`Color: Alpha component of `+e+` will be ignored.`)}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i,a=r[1],o=r[2];switch(a){case`rgb`:case`rgba`:if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseInt(i[1],10))/100,Math.min(100,parseInt(i[2],10))/100,Math.min(100,parseInt(i[3],10))/100,t);break;case`hsl`:case`hsla`:if(i=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:z(`Color: Unknown color model `+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let n=r[1],i=n.length;if(i===3)return this.setRGB(parseInt(n.charAt(0),16)/15,parseInt(n.charAt(1),16)/15,parseInt(n.charAt(2),16)/15,t);if(i===6)return this.setHex(parseInt(n,16),t);z(`Color: Invalid hex color `+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Ve){let n=Nn[e.toLowerCase()];return n===void 0?z(`Color: Unknown color `+e):this.setHex(n,t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Vt(e.r),this.g=Vt(e.g),this.b=Vt(e.b),this}copyLinearToSRGB(e){return this.r=Ht(e.r),this.g=Ht(e.g),this.b=Ht(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Ve){return Bt.workingToColorSpace(Ln.copy(this),e),Math.round(V(Ln.r*255,0,255))*65536+Math.round(V(Ln.g*255,0,255))*256+Math.round(V(Ln.b*255,0,255))}getHexString(e=Ve){return(`000000`+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Bt.workingColorSpace){Bt.workingToColorSpace(Ln.copy(this),t);let n=Ln.r,r=Ln.g,i=Ln.b,a=Math.max(n,r,i),o=Math.min(n,r,i),s,c,l=(o+a)/2;if(o===a)s=0,c=0;else{let e=a-o;switch(c=l<=.5?e/(a+o):e/(2-a-o),a){case n:s=(r-i)/e+(r<i?6:0);break;case r:s=(i-n)/e+2;break;case i:s=(n-r)/e+4;break}s/=6}return e.h=s,e.s=c,e.l=l,e}getRGB(e,t=Bt.workingColorSpace){return Bt.workingToColorSpace(Ln.copy(this),t),e.r=Ln.r,e.g=Ln.g,e.b=Ln.b,e}getStyle(e=Ve){Bt.workingToColorSpace(Ln.copy(this),e);let t=Ln.r,n=Ln.g,r=Ln.b;return e===`srgb`?`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`:`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`}offsetHSL(e,t,n){return this.getHSL(Pn),this.setHSL(Pn.h+e,Pn.s+t,Pn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Pn),e.getHSL(Fn);let n=ht(Pn.h,Fn.h,t),r=ht(Pn.s,Fn.s,t),i=ht(Pn.l,Fn.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Ln=new K;K.NAMES=Nn;var Rn=class e{constructor(e,t=25e-5){this.isFogExp2=!0,this.name=``,this.color=new K(e),this.density=t}clone(){return new e(this.color,this.density)}toJSON(){return{type:`FogExp2`,name:this.name,color:this.color.getHex(),density:this.density}}},zn=class extends kn{constructor(){super(),this.isScene=!0,this.type=`Scene`,this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new G,this.environmentIntensity=1,this.environmentRotation=new G,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},Bn=new U,Vn=new U,Hn=new U,Un=new U,Wn=new U,Gn=new U,Kn=new U,qn=new U,Jn=new U,Yn=new U,Xn=new Zt,Zn=new Zt,Qn=new Zt,$n=class e{constructor(e=new U,t=new U,n=new U){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),Bn.subVectors(e,t),r.cross(Bn);let i=r.lengthSq();return i>0?r.multiplyScalar(1/Math.sqrt(i)):r.set(0,0,0)}static getBarycoord(e,t,n,r,i){Bn.subVectors(r,t),Vn.subVectors(n,t),Hn.subVectors(e,t);let a=Bn.dot(Bn),o=Bn.dot(Vn),s=Bn.dot(Hn),c=Vn.dot(Vn),l=Vn.dot(Hn),u=a*c-o*o;if(u===0)return i.set(0,0,0),null;let d=1/u,f=(c*s-o*l)*d,p=(a*l-o*s)*d;return i.set(1-f-p,p,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,Un)===null?!1:Un.x>=0&&Un.y>=0&&Un.x+Un.y<=1}static getInterpolation(e,t,n,r,i,a,o,s){return this.getBarycoord(e,t,n,r,Un)===null?(s.x=0,s.y=0,`z`in s&&(s.z=0),`w`in s&&(s.w=0),null):(s.setScalar(0),s.addScaledVector(i,Un.x),s.addScaledVector(a,Un.y),s.addScaledVector(o,Un.z),s)}static getInterpolatedAttribute(e,t,n,r,i,a){return Xn.setScalar(0),Zn.setScalar(0),Qn.setScalar(0),Xn.fromBufferAttribute(e,t),Zn.fromBufferAttribute(e,n),Qn.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Xn,i.x),a.addScaledVector(Zn,i.y),a.addScaledVector(Qn,i.z),a}static isFrontFacing(e,t,n,r){return Bn.subVectors(n,t),Vn.subVectors(e,t),Bn.cross(Vn).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Bn.subVectors(this.c,this.b),Vn.subVectors(this.a,this.b),Bn.cross(Vn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,r,i,a){return e.getInterpolation(t,this.a,this.b,this.c,n,r,i,a)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,r=this.b,i=this.c,a,o;Wn.subVectors(r,n),Gn.subVectors(i,n),qn.subVectors(e,n);let s=Wn.dot(qn),c=Gn.dot(qn);if(s<=0&&c<=0)return t.copy(n);Jn.subVectors(e,r);let l=Wn.dot(Jn),u=Gn.dot(Jn);if(l>=0&&u<=l)return t.copy(r);let d=s*u-l*c;if(d<=0&&s>=0&&l<=0)return a=s/(s-l),t.copy(n).addScaledVector(Wn,a);Yn.subVectors(e,i);let f=Wn.dot(Yn),p=Gn.dot(Yn);if(p>=0&&f<=p)return t.copy(i);let m=f*c-s*p;if(m<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(n).addScaledVector(Gn,o);let h=l*p-f*u;if(h<=0&&u-l>=0&&f-p>=0)return Kn.subVectors(i,r),o=(u-l)/(u-l+(f-p)),t.copy(r).addScaledVector(Kn,o);let g=1/(h+m+d);return a=m*g,o=d*g,t.copy(n).addScaledVector(Wn,a).addScaledVector(Gn,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},er=class{constructor(e=new U(1/0,1/0,1/0),t=new U(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(nr.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(nr.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=nr.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute(`position`);if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let t=0,n=r.count;t<n;t++)e.isMesh===!0?e.getVertexPosition(t,nr):nr.fromBufferAttribute(r,t),nr.applyMatrix4(e.matrixWorld),this.expandByPoint(nr);else e.boundingBox===void 0?(n.boundingBox===null&&n.computeBoundingBox(),rr.copy(n.boundingBox)):(e.boundingBox===null&&e.computeBoundingBox(),rr.copy(e.boundingBox)),rr.applyMatrix4(e.matrixWorld),this.union(rr)}let r=e.children;for(let e=0,n=r.length;e<n;e++)this.expandByObject(r[e],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,nr),nr.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(ur),dr.subVectors(this.max,ur),ir.subVectors(e.a,ur),ar.subVectors(e.b,ur),or.subVectors(e.c,ur),sr.subVectors(ar,ir),cr.subVectors(or,ar),lr.subVectors(ir,or);let t=[0,-sr.z,sr.y,0,-cr.z,cr.y,0,-lr.z,lr.y,sr.z,0,-sr.x,cr.z,0,-cr.x,lr.z,0,-lr.x,-sr.y,sr.x,0,-cr.y,cr.x,0,-lr.y,lr.x,0];return!mr(t,ir,ar,or,dr)||(t=[1,0,0,0,1,0,0,0,1],!mr(t,ir,ar,or,dr))?!1:(fr.crossVectors(sr,cr),t=[fr.x,fr.y,fr.z],mr(t,ir,ar,or,dr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,nr).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(nr).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(tr[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),tr[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),tr[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),tr[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),tr[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),tr[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),tr[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),tr[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(tr),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},tr=[new U,new U,new U,new U,new U,new U,new U,new U],nr=new U,rr=new er,ir=new U,ar=new U,or=new U,sr=new U,cr=new U,lr=new U,ur=new U,dr=new U,fr=new U,pr=new U;function mr(e,t,n,r,i){for(let a=0,o=e.length-3;a<=o;a+=3){pr.fromArray(e,a);let o=i.x*Math.abs(pr.x)+i.y*Math.abs(pr.y)+i.z*Math.abs(pr.z),s=t.dot(pr),c=n.dot(pr),l=r.dot(pr);if(Math.max(-Math.max(s,c,l),Math.min(s,c,l))>o)return!1}return!0}var hr=new U,gr=new H,_r=0,vr=class extends ot{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw TypeError(`THREE.BufferAttribute: array should be a Typed Array.`);this.isBufferAttribute=!0,Object.defineProperty(this,`id`,{value:_r++}),this.name=``,this.array=e,this.itemSize=t,this.count=e===void 0?0:e.length/t,this.normalized=n,this.usage=Ke,this.updateRanges=[],this.gpuType=y,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,i=this.itemSize;r<i;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)gr.fromBufferAttribute(this,t),gr.applyMatrix3(e),this.setXY(t,gr.x,gr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)hr.fromBufferAttribute(this,t),hr.applyMatrix3(e),this.setXYZ(t,hr.x,hr.y,hr.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)hr.fromBufferAttribute(this,t),hr.applyMatrix4(e),this.setXYZ(t,hr.x,hr.y,hr.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)hr.fromBufferAttribute(this,t),hr.applyNormalMatrix(e),this.setXYZ(t,hr.x,hr.y,hr.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)hr.fromBufferAttribute(this,t),hr.transformDirection(e),this.setXYZ(t,hr.x,hr.y,hr.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=At(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=jt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=At(t,this.array)),t}setX(e,t){return this.normalized&&(t=jt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=At(t,this.array)),t}setY(e,t){return this.normalized&&(t=jt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=At(t,this.array)),t}setZ(e,t){return this.normalized&&(t=jt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=At(t,this.array)),t}setW(e,t){return this.normalized&&(t=jt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=jt(t,this.array),n=jt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=jt(t,this.array),n=jt(n,this.array),r=jt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e*=this.itemSize,this.normalized&&(t=jt(t,this.array),n=jt(n,this.array),r=jt(r,this.array),i=jt(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=i,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==``&&(e.name=this.name),this.usage!==35044&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:`dispose`})}},yr=class extends vr{constructor(e,t,n){super(new Uint16Array(e),t,n)}},br=class extends vr{constructor(e,t,n){super(new Uint32Array(e),t,n)}},q=class extends vr{constructor(e,t,n){super(new Float32Array(e),t,n)}},xr=new er,Sr=new U,Cr=new U,wr=class{constructor(e=new U,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t===void 0?xr.setFromPoints(e).getCenter(n):n.copy(t);let r=0;for(let t=0,i=e.length;t<i;t++)r=Math.max(r,n.distanceToSquared(e[t]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius*=e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Sr.subVectors(e,this.center);let t=Sr.lengthSq();if(t>this.radius*this.radius){let e=Math.sqrt(t),n=(e-this.radius)*.5;this.center.addScaledVector(Sr,n/e),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Cr.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Sr.copy(e.center).add(Cr)),this.expandByPoint(Sr.copy(e.center).sub(Cr))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Tr=0,Er=new nn,Dr=new kn,Or=new U,kr=new er,Ar=new er,jr=new U,Mr=class e extends ot{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,`id`,{value:Tr++}),this.uuid=dt(),this.name=``,this.type=`BufferGeometry`,this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Ye(e)?br:yr)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let t=new W().getNormalMatrix(e);n.applyNormalMatrix(t),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Er.makeRotationFromQuaternion(e),this.applyMatrix4(Er),this}rotateX(e){return Er.makeRotationX(e),this.applyMatrix4(Er),this}rotateY(e){return Er.makeRotationY(e),this.applyMatrix4(Er),this}rotateZ(e){return Er.makeRotationZ(e),this.applyMatrix4(Er),this}translate(e,t,n){return Er.makeTranslation(e,t,n),this.applyMatrix4(Er),this}scale(e,t,n){return Er.makeScale(e,t,n),this.applyMatrix4(Er),this}lookAt(e){return Dr.lookAt(e),Dr.updateMatrix(),this.applyMatrix4(Dr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Or).negate(),this.translate(Or.x,Or.y,Or.z),this}setFromPoints(e){let t=this.getAttribute(`position`);if(t===void 0){let t=[];for(let n=0,r=e.length;n<r;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}this.setAttribute(`position`,new q(t,3))}else{let n=Math.min(e.length,t.count);for(let r=0;r<n;r++){let n=e[r];t.setXYZ(r,n.x,n.y,n.z||0)}e.length>t.count&&z(`BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.`),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new er);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){B(`BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.`,this),this.boundingBox.set(new U(-1/0,-1/0,-1/0),new U(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];kr.setFromBufferAttribute(n),this.morphTargetsRelative?(jr.addVectors(this.boundingBox.min,kr.min),this.boundingBox.expandByPoint(jr),jr.addVectors(this.boundingBox.max,kr.max),this.boundingBox.expandByPoint(jr)):(this.boundingBox.expandByPoint(kr.min),this.boundingBox.expandByPoint(kr.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&B(`BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.`,this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new wr);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){B(`BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.`,this),this.boundingSphere.set(new U,1/0);return}if(e){let n=this.boundingSphere.center;if(kr.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];Ar.setFromBufferAttribute(n),this.morphTargetsRelative?(jr.addVectors(kr.min,Ar.min),kr.expandByPoint(jr),jr.addVectors(kr.max,Ar.max),kr.expandByPoint(jr)):(kr.expandByPoint(Ar.min),kr.expandByPoint(Ar.max))}kr.getCenter(n);let r=0;for(let t=0,i=e.count;t<i;t++)jr.fromBufferAttribute(e,t),r=Math.max(r,n.distanceToSquared(jr));if(t)for(let i=0,a=t.length;i<a;i++){let a=t[i],o=this.morphTargetsRelative;for(let t=0,i=a.count;t<i;t++)jr.fromBufferAttribute(a,t),o&&(Or.fromBufferAttribute(e,t),jr.add(Or)),r=Math.max(r,n.distanceToSquared(jr))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&B(`BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`,this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){B(`BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)`);return}let n=t.position,r=t.normal,i=t.uv,a=this.getAttribute(`tangent`);(a===void 0||a.count!==n.count)&&(a=new vr(new Float32Array(4*n.count),4),this.setAttribute(`tangent`,a));let o=[],s=[];for(let e=0;e<n.count;e++)o[e]=new U,s[e]=new U;let c=new U,l=new U,u=new U,d=new H,f=new H,p=new H,m=new U,h=new U;function g(e,t,r){c.fromBufferAttribute(n,e),l.fromBufferAttribute(n,t),u.fromBufferAttribute(n,r),d.fromBufferAttribute(i,e),f.fromBufferAttribute(i,t),p.fromBufferAttribute(i,r),l.sub(c),u.sub(c),f.sub(d),p.sub(d);let a=1/(f.x*p.y-p.x*f.y);isFinite(a)&&(m.copy(l).multiplyScalar(p.y).addScaledVector(u,-f.y).multiplyScalar(a),h.copy(u).multiplyScalar(f.x).addScaledVector(l,-p.x).multiplyScalar(a),o[e].add(m),o[t].add(m),o[r].add(m),s[e].add(h),s[t].add(h),s[r].add(h))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)g(e.getX(t+0),e.getX(t+1),e.getX(t+2))}let v=new U,y=new U,b=new U,x=new U;function S(e){b.fromBufferAttribute(r,e),x.copy(b);let t=o[e];v.copy(t),v.sub(b.multiplyScalar(b.dot(t))).normalize(),y.crossVectors(x,t);let n=y.dot(s[e])<0?-1:1;a.setXYZW(e,v.x,v.y,v.z,n)}for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)S(e.getX(t+0)),S(e.getX(t+1)),S(e.getX(t+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute(`position`);if(t!==void 0){let n=this.getAttribute(`normal`);if(n===void 0||n.count!==t.count)n=new vr(new Float32Array(t.count*3),3),this.setAttribute(`normal`,n);else for(let e=0,t=n.count;e<t;e++)n.setXYZ(e,0,0,0);let r=new U,i=new U,a=new U,o=new U,s=new U,c=new U,l=new U,u=new U;if(e)for(let d=0,f=e.count;d<f;d+=3){let f=e.getX(d+0),p=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,f),i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,m),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),o.fromBufferAttribute(n,f),s.fromBufferAttribute(n,p),c.fromBufferAttribute(n,m),o.add(l),s.add(l),c.add(l),n.setXYZ(f,o.x,o.y,o.z),n.setXYZ(p,s.x,s.y,s.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let e=0,o=t.count;e<o;e+=3)r.fromBufferAttribute(t,e+0),i.fromBufferAttribute(t,e+1),a.fromBufferAttribute(t,e+2),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),n.setXYZ(e+0,l.x,l.y,l.z),n.setXYZ(e+1,l.x,l.y,l.z),n.setXYZ(e+2,l.x,l.y,l.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)jr.fromBufferAttribute(e,t),jr.normalize(),e.setXYZ(t,jr.x,jr.y,jr.z)}toNonIndexed(){function t(e,t){let n=e.array,r=e.itemSize,i=e.normalized,a=new n.constructor(t.length*r),o=0,s=0;for(let i=0,c=t.length;i<c;i++){o=e.isInterleavedBufferAttribute?t[i]*e.data.stride+e.offset:t[i]*r;for(let e=0;e<r;e++)a[s++]=n[o++]}return new vr(a,r,i)}if(this.index===null)return z(`BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.`),this;let n=new e,r=this.index.array,i=this.attributes;for(let e in i){let a=i[e],o=t(a,r);n.setAttribute(e,o)}let a=this.morphAttributes;for(let e in a){let i=[],o=a[e];for(let e=0,n=o.length;e<n;e++){let n=o[e],a=t(n,r);i.push(a)}n.morphAttributes[e]=i}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let e=0,t=o.length;e<t;e++){let t=o[e];n.addGroup(t.start,t.count,t.materialIndex)}return n}toJSON(){let e={metadata:{version:4.7,type:`BufferGeometry`,generator:`BufferGeometry.toJSON`}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?`BufferGeometry`:this.type,this.name!==``&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let t=this.parameters;for(let n in t)t[n]!==void 0&&(e[n]=t[n]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let t in n){let r=n[t];e.data.attributes[t]=r.toJSON(e.data)}let r={},i=!1;for(let t in this.morphAttributes){let n=this.morphAttributes[t],a=[];for(let t=0,r=n.length;t<r;t++){let r=n[t];a.push(r.toJSON(e.data))}a.length>0&&(r[t]=a,i=!0)}i&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let r=e.attributes;for(let e in r){let n=r[e];this.setAttribute(e,n.clone(t))}let i=e.morphAttributes;for(let e in i){let n=[],r=i[e];for(let e=0,i=r.length;e<i;e++)n.push(r[e].clone(t));this.morphAttributes[e]=n}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let e=0,t=a.length;e<t;e++){let t=a[e];this.addGroup(t.start,t.count,t.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let s=e.boundingSphere;return s!==null&&(this.boundingSphere=s.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:`dispose`})}},Nr=0,Pr=class extends ot{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,`id`,{value:Nr++}),this.uuid=dt(),this.name=``,this.type=`Material`,this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new K(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ge,this.stencilZFail=Ge,this.stencilZPass=Ge,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){z(`Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){z(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector2&&n&&n.isVector2||r&&r.isEuler&&n&&n.isEuler||r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:`Material`,generator:`Material.toJSON`}};n.uuid=this.uuid,n.type=this.type,this.name!==``&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==1&&(n.blending=this.blending),this.side!==0&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==204&&(n.blendSrc=this.blendSrc),this.blendDst!==205&&(n.blendDst=this.blendDst),this.blendEquation!==100&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==3&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==519&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==7680&&(n.stencilFail=this.stencilFail),this.stencilZFail!==7680&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==7680&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==`round`&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==`round`&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(t){let t=r(e.textures),i=r(e.images);t.length>0&&(n.textures=t),i.length>0&&(n.images=i)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new K().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors==`number`?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let t=e.normalScale;Array.isArray(t)===!1&&(t=[t,t]),this.normalScale=new H().fromArray(t)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new H().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let e=t.length;n=Array(e);for(let r=0;r!==e;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:`dispose`})}set needsUpdate(e){e===!0&&this.version++}},Fr=new U,Ir=new U,Lr=new U,Rr=new U,zr=new U,Br=new U,Vr=new U,Hr=class{constructor(e=new U,t=new U(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Fr)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Fr.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Fr.copy(this.origin).addScaledVector(this.direction,t),Fr.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Ir.copy(e).add(t).multiplyScalar(.5),Lr.copy(t).sub(e).normalize(),Rr.copy(this.origin).sub(Ir);let i=e.distanceTo(t)*.5,a=-this.direction.dot(Lr),o=Rr.dot(this.direction),s=-Rr.dot(Lr),c=Rr.lengthSq(),l=Math.abs(1-a*a),u,d,f,p;if(l>0)if(u=a*s-o,d=a*o-s,p=i*l,u>=0)if(d>=-p)if(d<=p){let e=1/l;u*=e,d*=e,f=u*(u+a*d+2*o)+d*(a*u+d+2*s)+c}else d=i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;else d=-i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;else d<=-p?(u=Math.max(0,-(-a*i+o)),d=u>0?-i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c):d<=p?(u=0,d=Math.min(Math.max(-i,-s),i),f=d*(d+2*s)+c):(u=Math.max(0,-(a*i+o)),d=u>0?i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c);else d=a>0?-i:i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(Ir).addScaledVector(Lr,d),f}intersectSphere(e,t){Fr.subVectors(e.center,this.origin);let n=Fr.dot(this.direction),r=Fr.dot(Fr)-n*n,i=e.radius*e.radius;if(r>i)return null;let a=Math.sqrt(i-r),o=n-a,s=n+a;return s<0?null:o<0?this.at(s,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,i,a,o,s,c=1/this.direction.x,l=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),l>=0?(i=(e.min.y-d.y)*l,a=(e.max.y-d.y)*l):(i=(e.max.y-d.y)*l,a=(e.min.y-d.y)*l),n>a||i>r||((i>n||isNaN(n))&&(n=i),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-d.z)*u,s=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,s=(e.min.z-d.z)*u),n>s||o>r)||((o>n||n!==n)&&(n=o),(s<r||r!==r)&&(r=s),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,Fr)!==null}intersectTriangle(e,t,n,r,i){zr.subVectors(t,e),Br.subVectors(n,e),Vr.crossVectors(zr,Br);let a=this.direction.dot(Vr),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;Rr.subVectors(this.origin,e);let s=o*this.direction.dot(Br.crossVectors(Rr,Br));if(s<0)return null;let c=o*this.direction.dot(zr.cross(Rr));if(c<0||s+c>a)return null;let l=-o*Rr.dot(Vr);return l<0?null:this.at(l/a,i)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Ur=class extends Pr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type=`MeshBasicMaterial`,this.color=new K(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new G,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},Wr=new nn,Gr=new Hr,Kr=new wr,qr=new U,Jr=new U,Yr=new U,Xr=new U,Zr=new U,Qr=new U,$r=new U,ei=new U,J=class extends kn{constructor(e=new Mr,t=new Ur){super(),this.isMesh=!0,this.type=`Mesh`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}getVertexPosition(e,t){let n=this.geometry,r=n.attributes.position,i=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(i&&o){Qr.set(0,0,0);for(let n=0,r=i.length;n<r;n++){let r=o[n],s=i[n];r!==0&&(Zr.fromBufferAttribute(s,e),a?Qr.addScaledVector(Zr,r):Qr.addScaledVector(Zr.sub(t),r))}t.add(Qr)}return t}raycast(e,t){let n=this.geometry,r=this.material,i=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Kr.copy(n.boundingSphere),Kr.applyMatrix4(i),Gr.copy(e.ray).recast(e.near),!(Kr.containsPoint(Gr.origin)===!1&&(Gr.intersectSphere(Kr,qr)===null||Gr.origin.distanceToSquared(qr)>(e.far-e.near)**2))&&(Wr.copy(i).invert(),Gr.copy(e.ray).applyMatrix4(Wr),!(n.boundingBox!==null&&Gr.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Gr)))}_computeIntersections(e,t,n){let r,i=this.geometry,a=this.material,o=i.index,s=i.attributes.position,c=i.attributes.uv,l=i.attributes.uv1,u=i.attributes.normal,d=i.groups,f=i.drawRange;if(o!==null)if(Array.isArray(a))for(let i=0,s=d.length;i<s;i++){let s=d[i],p=a[s.materialIndex],m=Math.max(s.start,f.start),h=Math.min(o.count,Math.min(s.start+s.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=o.getX(i),d=o.getX(i+1),f=o.getX(i+2);r=ni(this,p,e,n,c,l,u,a,d,f),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=s.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),s=Math.min(o.count,f.start+f.count);for(let d=i,f=s;d<f;d+=3){let i=o.getX(d),s=o.getX(d+1),f=o.getX(d+2);r=ni(this,a,e,n,c,l,u,i,s,f),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}else if(s!==void 0)if(Array.isArray(a))for(let i=0,o=d.length;i<o;i++){let o=d[i],p=a[o.materialIndex],m=Math.max(o.start,f.start),h=Math.min(s.count,Math.min(o.start+o.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=i,s=i+1,d=i+2;r=ni(this,p,e,n,c,l,u,a,s,d),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=o.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),o=Math.min(s.count,f.start+f.count);for(let s=i,d=o;s<d;s+=3){let i=s,o=s+1,d=s+2;r=ni(this,a,e,n,c,l,u,i,o,d),r&&(r.faceIndex=Math.floor(s/3),t.push(r))}}}};function ti(e,t,n,r,i,a,o,s){let c;if(c=t.side===1?r.intersectTriangle(o,a,i,!0,s):r.intersectTriangle(i,a,o,t.side===0,s),c===null)return null;ei.copy(s),ei.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(ei);return l<n.near||l>n.far?null:{distance:l,point:ei.clone(),object:e}}function ni(e,t,n,r,i,a,o,s,c,l){e.getVertexPosition(s,Jr),e.getVertexPosition(c,Yr),e.getVertexPosition(l,Xr);let u=ti(e,t,n,r,Jr,Yr,Xr,$r);if(u){let e=new U;$n.getBarycoord($r,Jr,Yr,Xr,e),i&&(u.uv=$n.getInterpolatedAttribute(i,s,c,l,e,new H)),a&&(u.uv1=$n.getInterpolatedAttribute(a,s,c,l,e,new H)),o&&(u.normal=$n.getInterpolatedAttribute(o,s,c,l,e,new U),u.normal.dot(r.direction)>0&&u.normal.multiplyScalar(-1));let t={a:s,b:c,c:l,normal:new U,materialIndex:0};$n.getNormal(Jr,Yr,Xr,t.normal),u.face=t,u.barycoord=e}return u}var ri=class extends Xt{constructor(e=null,t=1,n=1,r,i,a,o,c,l=s,u=s,d,f){super(null,a,o,c,l,u,r,i,d,f),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},ii=class extends vr{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},ai=new nn,oi=new nn,si=[],ci=new er,li=new nn,ui=new J,di=new wr,Y=class extends J{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new ii(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let e=0;e<n;e++)this.setMatrixAt(e,li)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new er),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ai),ci.copy(e.boundingBox).applyMatrix4(ai),this.boundingBox.union(ci)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new wr),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ai),di.copy(e.boundingSphere).applyMatrix4(ai),this.boundingSphere.union(di)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,i=e*(n.length+1)+1;for(let e=0;e<n.length;e++)n[e]=r[i+e]}raycast(e,t){let n=this.matrixWorld,r=this.count;if(ui.geometry=this.geometry,ui.material=this.material,ui.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),di.copy(this.boundingSphere),di.applyMatrix4(n),e.ray.intersectsSphere(di)!==!1))for(let i=0;i<r;i++){this.getMatrixAt(i,ai),oi.multiplyMatrices(n,ai),ui.matrixWorld=oi,ui.raycast(e,si);for(let e=0,n=si.length;e<n;e++){let n=si[e];n.instanceId=i,n.object=this,t.push(n)}si.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new ii(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){let n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new ri(new Float32Array(r*this.count),r,this.count,j,y));let i=this.morphTexture.source.data.data,a=0;for(let e=0;e<n.length;e++)a+=n[e];let o=this.geometry.morphTargetsRelative?1:1-a,s=r*e;return i[s]=o,i.set(n,s+1),this}updateMorphTargets(){}dispose(){this.dispatchEvent({type:`dispose`}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}},fi=new U,pi=new U,mi=new W,hi=class{constructor(e=new U(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let r=fi.subVectors(n,t).cross(pi.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let r=e.delta(fi),i=this.normal.dot(r);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/i;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(r,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||mi.getNormalMatrix(e),r=this.coplanarPoint(fi).applyMatrix4(e),i=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(i),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},gi=new wr,_i=new H(.5,.5),vi=new U,yi=class{constructor(e=new hi,t=new hi,n=new hi,r=new hi,i=new hi,a=new hi){this.planes=[e,t,n,r,i,a]}set(e,t,n,r,i,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(i),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Je,n=!1){let r=this.planes,i=e.elements,a=i[0],o=i[1],s=i[2],c=i[3],l=i[4],u=i[5],d=i[6],f=i[7],p=i[8],m=i[9],h=i[10],g=i[11],_=i[12],v=i[13],y=i[14],b=i[15];if(r[0].setComponents(c-a,f-l,g-p,b-_).normalize(),r[1].setComponents(c+a,f+l,g+p,b+_).normalize(),r[2].setComponents(c+o,f+u,g+m,b+v).normalize(),r[3].setComponents(c-o,f-u,g-m,b-v).normalize(),n)r[4].setComponents(s,d,h,y).normalize(),r[5].setComponents(c-s,f-d,g-h,b-y).normalize();else if(r[4].setComponents(c-s,f-d,g-h,b-y).normalize(),t===2e3)r[5].setComponents(c+s,f+d,g+h,b+y).normalize();else if(t===2001)r[5].setComponents(s,d,h,y).normalize();else throw Error(`THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: `+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),gi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),gi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(gi)}intersectsSprite(e){return gi.center.set(0,0,0),gi.radius=.7071067811865476+_i.distanceTo(e.center),gi.applyMatrix4(e.matrixWorld),this.intersectsSphere(gi)}intersectsSphere(e){let t=this.planes,n=e.center,r=-e.radius;for(let e=0;e<6;e++)if(t[e].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let r=t[n];if(vi.x=r.normal.x>0?e.max.x:e.min.x,vi.y=r.normal.y>0?e.max.y:e.min.y,vi.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(vi)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},bi=class extends Pr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type=`LineBasicMaterial`,this.color=new K(16777215),this.map=null,this.linewidth=1,this.linecap=`round`,this.linejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},xi=new U,Si=new U,Ci=new nn,wi=new Hr,Ti=new wr,Ei=new U,Di=new U,Oi=class extends kn{constructor(e=new Mr,t=new bi){super(),this.isLine=!0,this.type=`Line`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let e=1,r=t.count;e<r;e++)xi.fromBufferAttribute(t,e-1),Si.fromBufferAttribute(t,e),n[e]=n[e-1],n[e]+=xi.distanceTo(Si);e.setAttribute(`lineDistance`,new q(n,1))}else z(`Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ti.copy(n.boundingSphere),Ti.applyMatrix4(r),Ti.radius+=i,e.ray.intersectsSphere(Ti)===!1)return;Ci.copy(r).invert(),wi.copy(e.ray).applyMatrix4(Ci);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=this.isLineSegments?2:1,l=n.index,u=n.attributes.position;if(l!==null){let n=Math.max(0,a.start),r=Math.min(l.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=l.getX(i),r=l.getX(i+1),a=ki(this,e,wi,s,n,r,i);a&&t.push(a)}if(this.isLineLoop){let i=l.getX(r-1),a=l.getX(n),o=ki(this,e,wi,s,i,a,r-1);o&&t.push(o)}}else{let n=Math.max(0,a.start),r=Math.min(u.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=ki(this,e,wi,s,i,i+1,i);n&&t.push(n)}if(this.isLineLoop){let i=ki(this,e,wi,s,r-1,n,r-1);i&&t.push(i)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function ki(e,t,n,r,i,a,o){let s=e.geometry.attributes.position;if(xi.fromBufferAttribute(s,i),Si.fromBufferAttribute(s,a),n.distanceSqToSegment(xi,Si,Ei,Di)>r)return;Ei.applyMatrix4(e.matrixWorld);let c=t.ray.origin.distanceTo(Ei);if(!(c<t.near||c>t.far))return{distance:c,point:Di.clone().applyMatrix4(e.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:e}}var Ai=class extends Pr{constructor(e){super(),this.isPointsMaterial=!0,this.type=`PointsMaterial`,this.color=new K(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},ji=new nn,Mi=new Hr,Ni=new wr,Pi=new U,Fi=class extends kn{constructor(e=new Mr,t=new Ai){super(),this.isPoints=!0,this.type=`Points`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ni.copy(n.boundingSphere),Ni.applyMatrix4(r),Ni.radius+=i,e.ray.intersectsSphere(Ni)===!1)return;ji.copy(r).invert(),Mi.copy(e.ray).applyMatrix4(ji);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=n.index,l=n.attributes.position;if(c!==null){let n=Math.max(0,a.start),i=Math.min(c.count,a.start+a.count);for(let a=n,o=i;a<o;a++){let n=c.getX(a);Pi.fromBufferAttribute(l,n),Ii(Pi,n,s,r,e,t,this)}}else{let n=Math.max(0,a.start),i=Math.min(l.count,a.start+a.count);for(let a=n,o=i;a<o;a++)Pi.fromBufferAttribute(l,a),Ii(Pi,a,s,r,e,t,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function Ii(e,t,n,r,i,a,o){let s=Mi.distanceSqToPoint(e);if(s<n){let n=new U;Mi.closestPointToPoint(e,n),n.applyMatrix4(r);let c=i.ray.origin.distanceTo(n);if(c<i.near||c>i.far)return;a.push({distance:c,distanceToRay:Math.sqrt(s),point:n,index:t,face:null,faceIndex:null,barycoord:null,object:o})}}var Li=class extends Xt{constructor(e=[],t=301,n,r,i,a,o,s,c,l){super(e,t,n,r,i,a,o,s,c,l),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Ri=class extends Xt{constructor(e,t,n,r,i,a,o,s,c){super(e,t,n,r,i,a,o,s,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},zi=class extends Xt{constructor(e,t,n=v,r,i,a,o=s,c=s,l,u=k,d=1){if(u!==1026&&u!==1027)throw Error(`THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat`);super({width:e,height:t,depth:d},r,i,a,o,c,u,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Kt(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},Bi=class extends zi{constructor(e,t=v,n=301,r,i,a=s,o=s,c,l=k){let u={width:e,height:e,depth:1},d=[u,u,u,u,u,u];super(e,e,t,n,r,i,a,o,c,l),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Vi=class extends Xt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},Hi=class e extends Mr{constructor(e=1,t=1,n=1,r=1,i=1,a=1){super(),this.type=`BoxGeometry`,this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:i,depthSegments:a};let o=this;r=Math.floor(r),i=Math.floor(i),a=Math.floor(a);let s=[],c=[],l=[],u=[],d=0,f=0;p(`z`,`y`,`x`,-1,-1,n,t,e,a,i,0),p(`z`,`y`,`x`,1,-1,n,t,-e,a,i,1),p(`x`,`z`,`y`,1,1,e,n,t,r,a,2),p(`x`,`z`,`y`,1,-1,e,n,-t,r,a,3),p(`x`,`y`,`z`,1,-1,e,t,n,r,i,4),p(`x`,`y`,`z`,-1,-1,e,t,-n,r,i,5),this.setIndex(s),this.setAttribute(`position`,new q(c,3)),this.setAttribute(`normal`,new q(l,3)),this.setAttribute(`uv`,new q(u,2));function p(e,t,n,r,i,a,p,m,h,g,_){let v=a/h,y=p/g,b=a/2,x=p/2,S=m/2,C=h+1,w=g+1,T=0,E=0,D=new U;for(let a=0;a<w;a++){let o=a*y-x;for(let s=0;s<C;s++)D[e]=(s*v-b)*r,D[t]=o*i,D[n]=S,c.push(D.x,D.y,D.z),D[e]=0,D[t]=0,D[n]=m>0?1:-1,l.push(D.x,D.y,D.z),u.push(s/h),u.push(1-a/g),T+=1}for(let e=0;e<g;e++)for(let t=0;t<h;t++){let n=d+t+C*e,r=d+t+C*(e+1),i=d+(t+1)+C*(e+1),a=d+(t+1)+C*e;s.push(n,r,a),s.push(r,i,a),E+=6}o.addGroup(f,E,_),f+=E,d+=T}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},Ui=class e extends Mr{constructor(e=1,t=1,n=4,r=8,i=1){super(),this.type=`CapsuleGeometry`,this.parameters={radius:e,height:t,capSegments:n,radialSegments:r,heightSegments:i},t=Math.max(0,t),n=Math.max(1,Math.floor(n)),r=Math.max(3,Math.floor(r)),i=Math.max(1,Math.floor(i));let a=[],o=[],s=[],c=[],l=t/2,u=Math.PI/2*e,d=t,f=2*u+d,p=n*2+i,m=r+1,h=new U,g=new U;for(let _=0;_<=p;_++){let v=0,y=0,b=0,x=0;if(_<=n){let t=_/n,r=t*Math.PI/2;y=-l-e*Math.cos(r),b=e*Math.sin(r),x=-e*Math.cos(r),v=t*u}else if(_<=n+i){let r=(_-n)/i;y=-l+r*t,b=e,x=0,v=u+r*d}else{let t=(_-n-i)/n,r=t*Math.PI/2;y=l+e*Math.sin(r),b=e*Math.cos(r),x=e*Math.sin(r),v=u+d+t*u}let S=Math.max(0,Math.min(1,v/f)),C=0;_===0?C=.5/r:_===p&&(C=-.5/r);for(let e=0;e<=r;e++){let t=e/r,n=t*Math.PI*2,i=Math.sin(n),a=Math.cos(n);g.x=-b*a,g.y=y,g.z=b*i,o.push(g.x,g.y,g.z),h.set(-b*a,x,b*i),h.normalize(),s.push(h.x,h.y,h.z),c.push(t+C,S)}if(_>0){let e=(_-1)*m;for(let t=0;t<r;t++){let n=e+t,r=e+t+1,i=_*m+t,o=_*m+t+1;a.push(n,r,i),a.push(r,o,i)}}}this.setIndex(a),this.setAttribute(`position`,new q(o,3)),this.setAttribute(`normal`,new q(s,3)),this.setAttribute(`uv`,new q(c,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.height,t.capSegments,t.radialSegments,t.heightSegments)}},Wi=class e extends Mr{constructor(e=1,t=32,n=0,r=Math.PI*2){super(),this.type=`CircleGeometry`,this.parameters={radius:e,segments:t,thetaStart:n,thetaLength:r},t=Math.max(3,t);let i=[],a=[],o=[],s=[],c=new U,l=new H;a.push(0,0,0),o.push(0,0,1),s.push(.5,.5);for(let i=0,u=3;i<=t;i++,u+=3){let d=n+i/t*r;c.x=e*Math.cos(d),c.y=e*Math.sin(d),a.push(c.x,c.y,c.z),o.push(0,0,1),l.x=(a[u]/e+1)/2,l.y=(a[u+1]/e+1)/2,s.push(l.x,l.y)}for(let e=1;e<=t;e++)i.push(e,e+1,0);this.setIndex(i),this.setAttribute(`position`,new q(a,3)),this.setAttribute(`normal`,new q(o,3)),this.setAttribute(`uv`,new q(s,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.segments,t.thetaStart,t.thetaLength)}},Gi=class e extends Mr{constructor(e=1,t=1,n=1,r=32,i=1,a=!1,o=0,s=Math.PI*2){super(),this.type=`CylinderGeometry`,this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:i,openEnded:a,thetaStart:o,thetaLength:s};let c=this;r=Math.floor(r),i=Math.floor(i);let l=[],u=[],d=[],f=[],p=0,m=[],h=n/2,g=0;_(),a===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(l),this.setAttribute(`position`,new q(u,3)),this.setAttribute(`normal`,new q(d,3)),this.setAttribute(`uv`,new q(f,2));function _(){let a=new U,_=new U,v=0,y=(t-e)/n;for(let c=0;c<=i;c++){let l=[],g=c/i,v=g*(t-e)+e;for(let e=0;e<=r;e++){let t=e/r,i=t*s+o,c=Math.sin(i),m=Math.cos(i);_.x=v*c,_.y=-g*n+h,_.z=v*m,u.push(_.x,_.y,_.z),a.set(c,y,m).normalize(),d.push(a.x,a.y,a.z),f.push(t,1-g),l.push(p++)}m.push(l)}for(let n=0;n<r;n++)for(let r=0;r<i;r++){let a=m[r][n],o=m[r+1][n],s=m[r+1][n+1],c=m[r][n+1];(e>0||r!==0)&&(l.push(a,o,c),v+=3),(t>0||r!==i-1)&&(l.push(o,s,c),v+=3)}c.addGroup(g,v,0),g+=v}function v(n){let i=p,a=new H,m=new U,_=0,v=n===!0?e:t,y=n===!0?1:-1;for(let e=1;e<=r;e++)u.push(0,h*y,0),d.push(0,y,0),f.push(.5,.5),p++;let b=p;for(let e=0;e<=r;e++){let t=e/r*s+o,n=Math.cos(t),i=Math.sin(t);m.x=v*i,m.y=h*y,m.z=v*n,u.push(m.x,m.y,m.z),d.push(0,y,0),a.x=n*.5+.5,a.y=i*.5*y+.5,f.push(a.x,a.y),p++}for(let e=0;e<r;e++){let t=i+e,r=b+e;n===!0?l.push(r,r+1,t):l.push(r+1,r,t),_+=3}c.addGroup(g,_,n===!0?1:2),g+=_}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},Ki=class e extends Gi{constructor(e=1,t=1,n=32,r=1,i=!1,a=0,o=Math.PI*2){super(0,e,t,n,r,i,a,o),this.type=`ConeGeometry`,this.parameters={radius:e,height:t,radialSegments:n,heightSegments:r,openEnded:i,thetaStart:a,thetaLength:o}}static fromJSON(t){return new e(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}},qi=class e extends Mr{constructor(e=[],t=[],n=1,r=0){super(),this.type=`PolyhedronGeometry`,this.parameters={vertices:e,indices:t,radius:n,detail:r};let i=[],a=[];o(r),c(n),l(),this.setAttribute(`position`,new q(i,3)),this.setAttribute(`normal`,new q(i.slice(),3)),this.setAttribute(`uv`,new q(a,2)),r===0?this.computeVertexNormals():this.normalizeNormals();function o(e){let n=new U,r=new U,i=new U;for(let a=0;a<t.length;a+=3)f(t[a+0],n),f(t[a+1],r),f(t[a+2],i),s(n,r,i,e)}function s(e,t,n,r){let i=r+1,a=[];for(let r=0;r<=i;r++){a[r]=[];let o=e.clone().lerp(n,r/i),s=t.clone().lerp(n,r/i),c=i-r;for(let e=0;e<=c;e++)e===0&&r===i?a[r][e]=o:a[r][e]=o.clone().lerp(s,e/c)}for(let e=0;e<i;e++)for(let t=0;t<2*(i-e)-1;t++){let n=Math.floor(t/2);t%2==0?(d(a[e][n+1]),d(a[e+1][n]),d(a[e][n])):(d(a[e][n+1]),d(a[e+1][n+1]),d(a[e+1][n]))}}function c(e){let t=new U;for(let n=0;n<i.length;n+=3)t.x=i[n+0],t.y=i[n+1],t.z=i[n+2],t.normalize().multiplyScalar(e),i[n+0]=t.x,i[n+1]=t.y,i[n+2]=t.z}function l(){let e=new U;for(let t=0;t<i.length;t+=3){e.x=i[t+0],e.y=i[t+1],e.z=i[t+2];let n=h(e)/2/Math.PI+.5,r=g(e)/Math.PI+.5;a.push(n,1-r)}p(),u()}function u(){for(let e=0;e<a.length;e+=6){let t=a[e+0],n=a[e+2],r=a[e+4];Math.max(t,n,r)>.9&&Math.min(t,n,r)<.1&&(t<.2&&(a[e+0]+=1),n<.2&&(a[e+2]+=1),r<.2&&(a[e+4]+=1))}}function d(e){i.push(e.x,e.y,e.z)}function f(t,n){let r=t*3;n.x=e[r+0],n.y=e[r+1],n.z=e[r+2]}function p(){let e=new U,t=new U,n=new U,r=new U,o=new H,s=new H,c=new H;for(let l=0,u=0;l<i.length;l+=9,u+=6){e.set(i[l+0],i[l+1],i[l+2]),t.set(i[l+3],i[l+4],i[l+5]),n.set(i[l+6],i[l+7],i[l+8]),o.set(a[u+0],a[u+1]),s.set(a[u+2],a[u+3]),c.set(a[u+4],a[u+5]),r.copy(e).add(t).add(n).divideScalar(3);let d=h(r);m(o,u+0,e,d),m(s,u+2,t,d),m(c,u+4,n,d)}}function m(e,t,n,r){r<0&&e.x===1&&(a[t]=e.x-1),n.x===0&&n.z===0&&(a[t]=r/2/Math.PI+.5)}function h(e){return Math.atan2(e.z,-e.x)}function g(e){return Math.atan2(-e.y,Math.sqrt(e.x*e.x+e.z*e.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.vertices,t.indices,t.radius,t.detail)}},Ji=class e extends qi{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,r=1/n,i=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-r,-n,0,-r,n,0,r,-n,0,r,n,-r,-n,0,-r,n,0,r,-n,0,r,n,0,-n,0,-r,n,0,-r,-n,0,r,n,0,r];super(i,[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9],e,t),this.type=`DodecahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Yi=class{constructor(){this.type=`Curve`,this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){z(`Curve: .getPoint() not implemented.`)}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,r=this.getPoint(0),i=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),i+=n.distanceTo(r),t.push(i),r=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),r=0,i=n.length,a;a=t||e*n[i-1];let o=0,s=i-1,c;for(;o<=s;)if(r=Math.floor(o+(s-o)/2),c=n[r]-a,c<0)o=r+1;else if(c>0)s=r-1;else{s=r;break}if(r=s,n[r]===a)return r/(i-1);let l=n[r],u=n[r+1]-l,d=(a-l)/u;return(r+d)/(i-1)}getTangent(e,t){let n=1e-4,r=e-n,i=e+n;r<0&&(r=0),i>1&&(i=1);let a=this.getPoint(r),o=this.getPoint(i),s=t||(a.isVector2?new H:new U);return s.copy(o).sub(a).normalize(),s}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new U,r=[],i=[],a=[],o=new U,s=new nn;for(let t=0;t<=e;t++){let n=t/e;r[t]=this.getTangentAt(n,new U)}i[0]=new U,a[0]=new U;let c=Number.MAX_VALUE,l=Math.abs(r[0].x),u=Math.abs(r[0].y),d=Math.abs(r[0].z);l<=c&&(c=l,n.set(1,0,0)),u<=c&&(c=u,n.set(0,1,0)),d<=c&&n.set(0,0,1),o.crossVectors(r[0],n).normalize(),i[0].crossVectors(r[0],o),a[0].crossVectors(r[0],i[0]);for(let t=1;t<=e;t++){if(i[t]=i[t-1].clone(),a[t]=a[t-1].clone(),o.crossVectors(r[t-1],r[t]),o.length()>2**-52){o.normalize();let e=Math.acos(V(r[t-1].dot(r[t]),-1,1));i[t].applyMatrix4(s.makeRotationAxis(o,e))}a[t].crossVectors(r[t],i[t])}if(t===!0){let t=Math.acos(V(i[0].dot(i[e]),-1,1));t/=e,r[0].dot(o.crossVectors(i[0],i[e]))>0&&(t=-t);for(let n=1;n<=e;n++)i[n].applyMatrix4(s.makeRotationAxis(r[n],t*n)),a[n].crossVectors(r[n],i[n])}return{tangents:r,normals:i,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:`Curve`,generator:`Curve.toJSON`}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},Xi=class extends Yi{constructor(e=0,t=0,n=1,r=1,i=0,a=Math.PI*2,o=!1,s=0){super(),this.isEllipseCurve=!0,this.type=`EllipseCurve`,this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=r,this.aStartAngle=i,this.aEndAngle=a,this.aClockwise=o,this.aRotation=s}getPoint(e,t=new H){let n=t,r=Math.PI*2,i=this.aEndAngle-this.aStartAngle,a=Math.abs(i)<2**-52;for(;i<0;)i+=r;for(;i>r;)i-=r;i<2**-52&&(i=a?0:r),this.aClockwise===!0&&!a&&(i===r?i=-r:i-=r);let o=this.aStartAngle+e*i,s=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let e=Math.cos(this.aRotation),t=Math.sin(this.aRotation),n=s-this.aX,r=c-this.aY;s=n*e-r*t+this.aX,c=n*t+r*e+this.aY}return n.set(s,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},Zi=class extends Xi{constructor(e,t,n,r,i,a){super(e,t,n,n,r,i,a),this.isArcCurve=!0,this.type=`ArcCurve`}};function Qi(){let e=0,t=0,n=0,r=0;function i(i,a,o,s){e=i,t=o,n=-3*i+3*a-2*o-s,r=2*i-2*a+o+s}return{initCatmullRom:function(e,t,n,r,a){i(t,n,a*(n-e),a*(r-t))},initNonuniformCatmullRom:function(e,t,n,r,a,o,s){let c=(t-e)/a-(n-e)/(a+o)+(n-t)/o,l=(n-t)/o-(r-t)/(o+s)+(r-n)/s;c*=o,l*=o,i(t,n,c,l)},calc:function(i){let a=i*i,o=a*i;return e+t*i+n*a+r*o}}}var $i=new U,ea=new U,ta=new Qi,na=new Qi,ra=new Qi,ia=class extends Yi{constructor(e=[],t=!1,n=`centripetal`,r=.5){super(),this.isCatmullRomCurve3=!0,this.type=`CatmullRomCurve3`,this.points=e,this.closed=t,this.curveType=n,this.tension=r}getPoint(e,t=new U){let n=t,r=this.points,i=r.length,a=(i-+!this.closed)*e,o=Math.floor(a),s=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/i)+1)*i:s===0&&o===i-1&&(o=i-2,s=1);let c,l;this.closed||o>0?c=r[(o-1)%i]:(ea.subVectors(r[0],r[1]).add(r[0]),c=ea);let u=r[o%i],d=r[(o+1)%i];if(this.closed||o+2<i?l=r[(o+2)%i]:($i.subVectors(r[i-1],r[i-2]).add(r[i-1]),l=$i),this.curveType===`centripetal`||this.curveType===`chordal`){let e=this.curveType===`chordal`?.5:.25,t=c.distanceToSquared(u)**+e,n=u.distanceToSquared(d)**+e,r=d.distanceToSquared(l)**+e;n<1e-4&&(n=1),t<1e-4&&(t=n),r<1e-4&&(r=n),ta.initNonuniformCatmullRom(c.x,u.x,d.x,l.x,t,n,r),na.initNonuniformCatmullRom(c.y,u.y,d.y,l.y,t,n,r),ra.initNonuniformCatmullRom(c.z,u.z,d.z,l.z,t,n,r)}else this.curveType===`catmullrom`&&(ta.initCatmullRom(c.x,u.x,d.x,l.x,this.tension),na.initCatmullRom(c.y,u.y,d.y,l.y,this.tension),ra.initCatmullRom(c.z,u.z,d.z,l.z,this.tension));return n.set(ta.calc(s),na.calc(s),ra.calc(s)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new U().fromArray(n))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function aa(e,t,n,r,i){let a=(r-t)*.5,o=(i-n)*.5,s=e*e,c=e*s;return(2*n-2*r+a+o)*c+(-3*n+3*r-2*a-o)*s+a*e+n}function oa(e,t){let n=1-e;return n*n*t}function sa(e,t){return 2*(1-e)*e*t}function ca(e,t){return e*e*t}function la(e,t,n,r){return oa(e,t)+sa(e,n)+ca(e,r)}function ua(e,t){let n=1-e;return n*n*n*t}function da(e,t){let n=1-e;return 3*n*n*e*t}function fa(e,t){return 3*(1-e)*e*e*t}function pa(e,t){return e*e*e*t}function ma(e,t,n,r,i){return ua(e,t)+da(e,n)+fa(e,r)+pa(e,i)}var ha=class extends Yi{constructor(e=new H,t=new H,n=new H,r=new H){super(),this.isCubicBezierCurve=!0,this.type=`CubicBezierCurve`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new H){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(ma(e,r.x,i.x,a.x,o.x),ma(e,r.y,i.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},ga=class extends Yi{constructor(e=new U,t=new U,n=new U,r=new U){super(),this.isCubicBezierCurve3=!0,this.type=`CubicBezierCurve3`,this.v0=e,this.v1=t,this.v2=n,this.v3=r}getPoint(e,t=new U){let n=t,r=this.v0,i=this.v1,a=this.v2,o=this.v3;return n.set(ma(e,r.x,i.x,a.x,o.x),ma(e,r.y,i.y,a.y,o.y),ma(e,r.z,i.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},_a=class extends Yi{constructor(e=new H,t=new H){super(),this.isLineCurve=!0,this.type=`LineCurve`,this.v1=e,this.v2=t}getPoint(e,t=new H){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new H){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},va=class extends Yi{constructor(e=new U,t=new U){super(),this.isLineCurve3=!0,this.type=`LineCurve3`,this.v1=e,this.v2=t}getPoint(e,t=new U){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new U){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ya=class extends Yi{constructor(e=new H,t=new H,n=new H){super(),this.isQuadraticBezierCurve=!0,this.type=`QuadraticBezierCurve`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new H){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(la(e,r.x,i.x,a.x),la(e,r.y,i.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ba=class extends Yi{constructor(e=new U,t=new U,n=new U){super(),this.isQuadraticBezierCurve3=!0,this.type=`QuadraticBezierCurve3`,this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new U){let n=t,r=this.v0,i=this.v1,a=this.v2;return n.set(la(e,r.x,i.x,a.x),la(e,r.y,i.y,a.y),la(e,r.z,i.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},xa=Object.freeze({__proto__:null,ArcCurve:Zi,CatmullRomCurve3:ia,CubicBezierCurve:ha,CubicBezierCurve3:ga,EllipseCurve:Xi,LineCurve:_a,LineCurve3:va,QuadraticBezierCurve:ya,QuadraticBezierCurve3:ba,SplineCurve:class extends Yi{constructor(e=[]){super(),this.isSplineCurve=!0,this.type=`SplineCurve`,this.points=e}getPoint(e,t=new H){let n=t,r=this.points,i=(r.length-1)*e,a=Math.floor(i),o=i-a,s=r[a===0?a:a-1],c=r[a],l=r[a>r.length-2?r.length-1:a+1],u=r[a>r.length-3?r.length-1:a+2];return n.set(aa(o,s.x,c.x,l.x,u.x),aa(o,s.y,c.y,l.y,u.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(n.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let n=this.points[t];e.points.push(n.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let n=e.points[t];this.points.push(new H().fromArray(n))}return this}}}),Sa=class e extends qi{constructor(e=1,t=0){let n=(1+Math.sqrt(5))/2,r=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1];super(r,[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1],e,t),this.type=`IcosahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Ca=class e extends qi{constructor(e=1,t=0){super([1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2],e,t),this.type=`OctahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},wa=class e extends Mr{constructor(e=1,t=1,n=1,r=1){super(),this.type=`PlaneGeometry`,this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let i=e/2,a=t/2,o=Math.floor(n),s=Math.floor(r),c=o+1,l=s+1,u=e/o,d=t/s,f=[],p=[],m=[],h=[];for(let e=0;e<l;e++){let t=e*d-a;for(let n=0;n<c;n++){let r=n*u-i;p.push(r,-t,0),m.push(0,0,1),h.push(n/o),h.push(1-e/s)}}for(let e=0;e<s;e++)for(let t=0;t<o;t++){let n=t+c*e,r=t+c*(e+1),i=t+1+c*(e+1),a=t+1+c*e;f.push(n,r,a),f.push(r,i,a)}this.setIndex(f),this.setAttribute(`position`,new q(p,3)),this.setAttribute(`normal`,new q(m,3)),this.setAttribute(`uv`,new q(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}},Ta=class e extends Mr{constructor(e=.5,t=1,n=32,r=1,i=0,a=Math.PI*2){super(),this.type=`RingGeometry`,this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:r,thetaStart:i,thetaLength:a},n=Math.max(3,n),r=Math.max(1,r);let o=[],s=[],c=[],l=[],u=e,d=(t-e)/r,f=new U,p=new H;for(let e=0;e<=r;e++){for(let e=0;e<=n;e++){let r=i+e/n*a;f.x=u*Math.cos(r),f.y=u*Math.sin(r),s.push(f.x,f.y,f.z),c.push(0,0,1),p.x=(f.x/t+1)/2,p.y=(f.y/t+1)/2,l.push(p.x,p.y)}u+=d}for(let e=0;e<r;e++){let t=e*(n+1);for(let e=0;e<n;e++){let r=e+t,i=r,a=r+n+1,s=r+n+2,c=r+1;o.push(i,a,c),o.push(a,s,c)}}this.setIndex(o),this.setAttribute(`position`,new q(s,3)),this.setAttribute(`normal`,new q(c,3)),this.setAttribute(`uv`,new q(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.innerRadius,t.outerRadius,t.thetaSegments,t.phiSegments,t.thetaStart,t.thetaLength)}},Ea=class e extends Mr{constructor(e=1,t=32,n=16,r=0,i=Math.PI*2,a=0,o=Math.PI){super(),this.type=`SphereGeometry`,this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:i,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let s=Math.min(a+o,Math.PI),c=0,l=[],u=new U,d=new U,f=[],p=[],m=[],h=[];for(let f=0;f<=n;f++){let g=[],_=f/n,v=a+_*o,y=e*Math.cos(v),b=Math.sqrt(e*e-y*y),x=0;f===0&&a===0?x=.5/t:f===n&&s===Math.PI&&(x=-.5/t);for(let e=0;e<=t;e++){let n=e/t,a=r+n*i;u.x=-b*Math.cos(a),u.y=y,u.z=b*Math.sin(a),p.push(u.x,u.y,u.z),d.copy(u).normalize(),m.push(d.x,d.y,d.z),h.push(n+x,1-_),g.push(c++)}l.push(g)}for(let e=0;e<n;e++)for(let r=0;r<t;r++){let t=l[e][r+1],i=l[e][r],o=l[e+1][r],c=l[e+1][r+1];(e!==0||a>0)&&f.push(t,i,c),(e!==n-1||s<Math.PI)&&f.push(i,o,c)}this.setIndex(f),this.setAttribute(`position`,new q(p,3)),this.setAttribute(`normal`,new q(m,3)),this.setAttribute(`uv`,new q(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}},Da=class e extends qi{constructor(e=1,t=0){super([1,1,1,-1,-1,1,-1,1,-1,1,-1,-1],[2,1,0,0,3,2,1,3,0,2,3,1],e,t),this.type=`TetrahedronGeometry`,this.parameters={radius:e,detail:t}}static fromJSON(t){return new e(t.radius,t.detail)}},Oa=class e extends Mr{constructor(e=1,t=.4,n=12,r=48,i=Math.PI*2,a=0,o=Math.PI*2){super(),this.type=`TorusGeometry`,this.parameters={radius:e,tube:t,radialSegments:n,tubularSegments:r,arc:i,thetaStart:a,thetaLength:o},n=Math.floor(n),r=Math.floor(r);let s=[],c=[],l=[],u=[],d=new U,f=new U,p=new U;for(let s=0;s<=n;s++){let m=a+s/n*o;for(let a=0;a<=r;a++){let o=a/r*i;f.x=(e+t*Math.cos(m))*Math.cos(o),f.y=(e+t*Math.cos(m))*Math.sin(o),f.z=t*Math.sin(m),c.push(f.x,f.y,f.z),d.x=e*Math.cos(o),d.y=e*Math.sin(o),p.subVectors(f,d).normalize(),l.push(p.x,p.y,p.z),u.push(a/r),u.push(s/n)}}for(let e=1;e<=n;e++)for(let t=1;t<=r;t++){let n=(r+1)*e+t-1,i=(r+1)*(e-1)+t-1,a=(r+1)*(e-1)+t,o=(r+1)*e+t;s.push(n,i,o),s.push(i,a,o)}this.setIndex(s),this.setAttribute(`position`,new q(c,3)),this.setAttribute(`normal`,new q(l,3)),this.setAttribute(`uv`,new q(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}},ka=class e extends Mr{constructor(e=new ba(new U(-1,-1,0),new U(-1,1,0),new U(1,1,0)),t=64,n=1,r=8,i=!1){super(),this.type=`TubeGeometry`,this.parameters={path:e,tubularSegments:t,radius:n,radialSegments:r,closed:i};let a=e.computeFrenetFrames(t,i);this.tangents=a.tangents,this.normals=a.normals,this.binormals=a.binormals;let o=new U,s=new U,c=new H,l=new U,u=[],d=[],f=[],p=[];m(),this.setIndex(p),this.setAttribute(`position`,new q(u,3)),this.setAttribute(`normal`,new q(d,3)),this.setAttribute(`uv`,new q(f,2));function m(){for(let e=0;e<t;e++)h(e);h(i===!1?t:0),_(),g()}function h(i){l=e.getPointAt(i/t,l);let c=a.normals[i],f=a.binormals[i];for(let e=0;e<=r;e++){let t=e/r*Math.PI*2,i=Math.sin(t),a=-Math.cos(t);s.x=a*c.x+i*f.x,s.y=a*c.y+i*f.y,s.z=a*c.z+i*f.z,s.normalize(),d.push(s.x,s.y,s.z),o.x=l.x+n*s.x,o.y=l.y+n*s.y,o.z=l.z+n*s.z,u.push(o.x,o.y,o.z)}}function g(){for(let e=1;e<=t;e++)for(let t=1;t<=r;t++){let n=(r+1)*(e-1)+(t-1),i=(r+1)*e+(t-1),a=(r+1)*e+t,o=(r+1)*(e-1)+t;p.push(n,i,o),p.push(i,a,o)}}function _(){for(let e=0;e<=t;e++)for(let n=0;n<=r;n++)c.x=e/t,c.y=n/r,f.push(c.x,c.y)}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON();return e.path=this.parameters.path.toJSON(),e}static fromJSON(t){return new e(new xa[t.path.type]().fromJSON(t.path),t.tubularSegments,t.radius,t.radialSegments,t.closed)}};function Aa(e){let t={};for(let n in e){t[n]={};for(let r in e[n]){let i=e[n][r];if(Ma(i))i.isRenderTargetTexture?(z(`UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().`),t[n][r]=null):t[n][r]=i.clone();else if(Array.isArray(i))if(Ma(i[0])){let e=[];for(let t=0,n=i.length;t<n;t++)e[t]=i[t].clone();t[n][r]=e}else t[n][r]=i.slice();else t[n][r]=i}}return t}function ja(e){let t={};for(let n=0;n<e.length;n++){let r=Aa(e[n]);for(let e in r)t[e]=r[e]}return t}function Ma(e){return e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture||e.isQuaternion)}function Na(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function Pa(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:Bt.workingColorSpace}var Fa={clone:Aa,merge:ja},Ia=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,La=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Ra=class extends Pr{constructor(e){super(),this.isShaderMaterial=!0,this.type=`ShaderMaterial`,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Ia,this.fragmentShader=La,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Aa(e.uniforms),this.uniformsGroups=Na(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let n in this.uniforms){let r=this.uniforms[n].value;r&&r.isTexture?t.uniforms[n]={type:`t`,value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[n]={type:`c`,value:r.getHex()}:r&&r.isVector2?t.uniforms[n]={type:`v2`,value:r.toArray()}:r&&r.isVector3?t.uniforms[n]={type:`v3`,value:r.toArray()}:r&&r.isVector4?t.uniforms[n]={type:`v4`,value:r.toArray()}:r&&r.isMatrix3?t.uniforms[n]={type:`m3`,value:r.toArray()}:r&&r.isMatrix4?t.uniforms[n]={type:`m4`,value:r.toArray()}:t.uniforms[n]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let e in this.extensions)this.extensions[e]===!0&&(n[e]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let r=e.uniforms[n];switch(this.uniforms[n]={},r.type){case`t`:this.uniforms[n].value=t[r.value]||null;break;case`c`:this.uniforms[n].value=new K().setHex(r.value);break;case`v2`:this.uniforms[n].value=new H().fromArray(r.value);break;case`v3`:this.uniforms[n].value=new U().fromArray(r.value);break;case`v4`:this.uniforms[n].value=new Zt().fromArray(r.value);break;case`m3`:this.uniforms[n].value=new W().fromArray(r.value);break;case`m4`:this.uniforms[n].value=new nn().fromArray(r.value);break;default:this.uniforms[n].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let t in e.extensions)this.extensions[t]=e.extensions[t];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},za=class extends Ra{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type=`RawShaderMaterial`}},Ba=class extends Pr{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type=`MeshStandardMaterial`,this.defines={STANDARD:``},this.color=new K(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new K(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new H(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new G,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:``},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},Va=class extends Ba{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:``,PHYSICAL:``},this.type=`MeshPhysicalMaterial`,this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new H(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,`reflectivity`,{get:function(){return V(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new K(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new K(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new K(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:``,PHYSICAL:``},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}},Ha=class extends Pr{constructor(e){super(),this.isMeshLambertMaterial=!0,this.type=`MeshLambertMaterial`,this.color=new K(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new K(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new H(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new G,this.combine=0,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},Ua=class extends Pr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type=`MeshDepthMaterial`,this.depthPacking=Be,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Wa=class extends Pr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type=`MeshDistanceMaterial`,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function Ga(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT==`number`?new t(e):Array.prototype.slice.call(e)}var Ka=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r===void 0?new t.constructor(n):r,this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],i=t[n-1];validate_interval:{seek:{let a;linear_scan:{forward_scan:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<i)break forward_scan;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(i=r,r=t[++n],e<r)break seek}a=t.length;break linear_scan}if(!(e>=i)){let o=t[1];e<o&&(n=2,i=o);for(let a=n-2;;){if(i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===a)break;if(r=i,i=t[--n-1],e>=i)break seek}a=n,n=0;break linear_scan}break validate_interval}for(;n<a;){let r=n+a>>>1;e<t[r]?a=r:n=r+1}if(r=t[n],i=t[n-1],i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,i,r)}return this.interpolate_(n,i,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r;for(let e=0;e!==r;++e)t[e]=n[i+e];return t}interpolate_(){throw Error(`THREE.Interpolant: Call to abstract method.`)}intervalChanged_(){}},qa=class extends Ka{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Le,endingEnd:Le}}intervalChanged_(e,t,n){let r=this.parameterPositions,i=e-2,a=e+1,o=r[i],s=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case Re:i=e,o=2*t-n;break;case ze:i=r.length-2,o=t+r[i]-r[i+1];break;default:i=e,o=n}if(s===void 0)switch(this.getSettings_().endingEnd){case Re:a=e,s=2*n-t;break;case ze:a=1,s=n+r[1]-r[0];break;default:a=e-1,s=t}let c=(n-t)*.5,l=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(s-n),this._offsetPrev=i*l,this._offsetNext=a*l}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(r-t),m=p*p,h=m*p,g=-d*h+2*d*m-d*p,_=(1+d)*h+(-1.5-2*d)*m+(-.5+d)*p+1,v=(-1-f)*h+(1.5+f)*m+.5*p,y=f*h-f*m;for(let e=0;e!==o;++e)i[e]=g*a[l+e]+_*a[c+e]+v*a[s+e]+y*a[u+e];return i}},Ja=class extends Ka{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=(n-t)/(r-t),u=1-l;for(let e=0;e!==o;++e)i[e]=a[c+e]*u+a[s+e]*l;return i}},Ya=class extends Ka{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},Xa=class extends Ka{interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this.inTangents,u=this.outTangents;if(!l||!u){let e=(n-t)/(r-t),l=1-e;for(let t=0;t!==o;++t)i[t]=a[c+t]*l+a[s+t]*e;return i}let d=o*2,f=e-1;for(let p=0;p!==o;++p){let o=a[c+p],m=a[s+p],h=f*d+p*2,g=u[h],_=u[h+1],v=e*d+p*2,y=l[v],b=l[v+1],x=(n-t)/(r-t),S,C,w,T,E;for(let e=0;e<8;e++){S=x*x,C=S*x,w=1-x,T=w*w,E=T*w;let e=E*t+3*T*x*g+3*w*S*y+C*r-n;if(Math.abs(e)<1e-10)break;let i=3*T*(g-t)+6*w*x*(y-g)+3*S*(r-y);if(Math.abs(i)<1e-10)break;x-=e/i,x=Math.max(0,Math.min(1,x))}i[p]=E*o+3*T*x*_+3*w*S*b+C*m}return i}},Za=class{constructor(e,t,n,r){if(e===void 0)throw Error(`THREE.KeyframeTrack: track name is undefined`);if(t===void 0||t.length===0)throw Error(`THREE.KeyframeTrack: no keyframes in track named `+e);this.name=e,this.times=Ga(t,this.TimeBufferType),this.values=Ga(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Ga(e.times,Array),values:Ga(e.values,Array)};let t=e.getInterpolation();t!==e.DefaultInterpolation&&(n.interpolation=t)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Ya(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Ja(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new qa(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new Xa(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case Fe:t=this.InterpolantFactoryMethodDiscrete;break;case L:t=this.InterpolantFactoryMethodLinear;break;case Ie:t=this.InterpolantFactoryMethodSmooth;break;case R:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let t=`unsupported interpolation for `+this.ValueTypeName+` keyframe track named `+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(t);return z(`KeyframeTrack:`,t),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Fe;case this.InterpolantFactoryMethodLinear:return L;case this.InterpolantFactoryMethodSmooth:return Ie;case this.InterpolantFactoryMethodBezier:return R}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e}return this}trim(e,t){let n=this.times,r=n.length,i=0,a=r-1;for(;i!==r&&n[i]<e;)++i;for(;a!==-1&&n[a]>t;)--a;if(++a,i!==0||a!==r){i>=a&&(a=Math.max(a,1),i=a-1);let e=this.getValueSize();this.times=n.slice(i,a),this.values=this.values.slice(i*e,a*e)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(B(`KeyframeTrack: Invalid value size in track.`,this),e=!1);let n=this.times,r=this.values,i=n.length;i===0&&(B(`KeyframeTrack: Track is empty.`,this),e=!1);let a=null;for(let t=0;t!==i;t++){let r=n[t];if(typeof r==`number`&&isNaN(r)){B(`KeyframeTrack: Time is not a valid number.`,this,t,r),e=!1;break}if(a!==null&&a>r){B(`KeyframeTrack: Out of order keys.`,this,t,r,a),e=!1;break}a=r}if(r!==void 0&&Xe(r))for(let t=0,n=r.length;t!==n;++t){let n=r[t];if(isNaN(n)){B(`KeyframeTrack: Value is not a valid number.`,this,t,n),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===Ie,i=e.length-1,a=1;for(let o=1;o<i;++o){let i=!1,s=e[o];if(s!==e[o+1]&&(o!==1||s!==e[0]))if(r)i=!0;else{let e=o*n,r=e-n,a=e+n;for(let o=0;o!==n;++o){let n=t[e+o];if(n!==t[r+o]||n!==t[a+o]){i=!0;break}}}if(i){if(o!==a){e[a]=e[o];let r=o*n,i=a*n;for(let e=0;e!==n;++e)t[i+e]=t[r+e]}++a}}if(i>0){e[a]=e[i];for(let e=i*n,r=a*n,o=0;o!==n;++o)t[r+o]=t[e+o];++a}return a===e.length?(this.times=e,this.values=t):(this.times=e.slice(0,a),this.values=t.slice(0,a*n)),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,r}};Za.prototype.ValueTypeName=``,Za.prototype.TimeBufferType=Float32Array,Za.prototype.ValueBufferType=Float32Array,Za.prototype.DefaultInterpolation=L;var Qa=class extends Za{constructor(e,t,n){super(e,t,n)}};Qa.prototype.ValueTypeName=`bool`,Qa.prototype.ValueBufferType=Array,Qa.prototype.DefaultInterpolation=Fe,Qa.prototype.InterpolantFactoryMethodLinear=void 0,Qa.prototype.InterpolantFactoryMethodSmooth=void 0;var $a=class extends Za{constructor(e,t,n,r){super(e,t,n,r)}};$a.prototype.ValueTypeName=`color`;var eo=class extends Za{constructor(e,t,n,r){super(e,t,n,r)}};eo.prototype.ValueTypeName=`number`;var to=class extends Ka{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=(n-t)/(r-t),c=e*o;for(let e=c+o;c!==e;c+=4)Nt.slerpFlat(i,0,a,c-o,a,c,s);return i}},no=class extends Za{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new to(this.times,this.values,this.getValueSize(),e)}};no.prototype.ValueTypeName=`quaternion`,no.prototype.InterpolantFactoryMethodSmooth=void 0;var ro=class extends Za{constructor(e,t,n){super(e,t,n)}};ro.prototype.ValueTypeName=`string`,ro.prototype.ValueBufferType=Array,ro.prototype.DefaultInterpolation=Fe,ro.prototype.InterpolantFactoryMethodLinear=void 0,ro.prototype.InterpolantFactoryMethodSmooth=void 0;var io=class extends Za{constructor(e,t,n,r){super(e,t,n,r)}};io.prototype.ValueTypeName=`vector`;var ao={enabled:!1,files:{},add:function(e,t){this.enabled!==!1&&(oo(e)||(this.files[e]=t))},get:function(e){if(this.enabled!==!1&&!oo(e))return this.files[e]},remove:function(e){delete this.files[e]},clear:function(){this.files={}}};function oo(e){try{let t=e.slice(e.indexOf(`:`)+1);return new URL(t).protocol===`blob:`}catch{return!1}}var so=new class{constructor(e,t,n){let r=this,i=!1,a=0,o=0,s,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(e){o++,i===!1&&r.onStart!==void 0&&r.onStart(e,a,o),i=!0},this.itemEnd=function(e){a++,r.onProgress!==void 0&&r.onProgress(e,a,o),a===o&&(i=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(e){r.onError!==void 0&&r.onError(e)},this.resolveURL=function(e){return e=e.normalize(`NFC`),s?s(e):e},this.setURLModifier=function(e){return s=e,this},this.addHandler=function(e,t){return c.push(e,t),this},this.removeHandler=function(e){let t=c.indexOf(e);return t!==-1&&c.splice(t,2),this},this.getHandler=function(e){for(let t=0,n=c.length;t<n;t+=2){let n=c[t],r=c[t+1];if(n.global&&(n.lastIndex=0),n.test(e))return r}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||=new AbortController,this._abortController}},co=class{constructor(e){this.manager=e===void 0?so:e,this.crossOrigin=`anonymous`,this.withCredentials=!1,this.path=``,this.resourcePath=``,this.requestHeader={},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(r,i){n.load(e,r,t,i)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};co.DEFAULT_MATERIAL_NAME=`__DEFAULT`;var lo=new WeakMap,uo=class extends co{constructor(e){super(e)}load(e,t,n,r){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let i=this,a=ao.get(`image:${e}`);if(a!==void 0){if(a.complete===!0)i.manager.itemStart(e),setTimeout(function(){t&&t(a),i.manager.itemEnd(e)},0);else{let e=lo.get(a);e===void 0&&(e=[],lo.set(a,e)),e.push({onLoad:t,onError:r})}return a}let o=Ze(`img`);function s(){l(),t&&t(this);let n=lo.get(this)||[];for(let e=0;e<n.length;e++){let t=n[e];t.onLoad&&t.onLoad(this)}lo.delete(this),i.manager.itemEnd(e)}function c(t){l(),r&&r(t),ao.remove(`image:${e}`);let n=lo.get(this)||[];for(let e=0;e<n.length;e++){let r=n[e];r.onError&&r.onError(t)}lo.delete(this),i.manager.itemError(e),i.manager.itemEnd(e)}function l(){o.removeEventListener(`load`,s,!1),o.removeEventListener(`error`,c,!1)}return o.addEventListener(`load`,s,!1),o.addEventListener(`error`,c,!1),e.slice(0,5)!==`data:`&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),ao.add(`image:${e}`,o),i.manager.itemStart(e),o.src=e,o}},fo=class extends co{constructor(e){super(e)}load(e,t,n,r){let i=new Xt,a=new uo(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(e){i.image=e,i.needsUpdate=!0,t!==void 0&&t(i)},n,r),i}},po=class extends kn{constructor(e,t=1){super(),this.isLight=!0,this.type=`Light`,this.color=new K(e),this.intensity=t}dispose(){this.dispatchEvent({type:`dispose`})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}},mo=class extends po{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type=`HemisphereLight`,this.position.copy(kn.DEFAULT_UP),this.updateMatrix(),this.groundColor=new K(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){let t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}},ho=new nn,go=new U,_o=new U,vo=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new H(512,512),this.mapType=p,this.map=null,this.mapPass=null,this.matrix=new nn,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new yi,this._frameExtents=new H(1,1),this._viewportCount=1,this._viewports=[new Zt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;go.setFromMatrixPosition(e.matrixWorld),t.position.copy(go),_o.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(_o),t.updateMatrixWorld(),ho.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ho,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===2001||t.reversedDepth?n.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(ho)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},yo=new U,bo=new Nt,xo=new U,So=class extends kn{constructor(){super(),this.isCamera=!0,this.type=`Camera`,this.matrixWorldInverse=new nn,this.projectionMatrix=new nn,this.projectionMatrixInverse=new nn,this.coordinateSystem=Je,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(yo,bo,xo),xo.x===1&&xo.y===1&&xo.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(yo,bo,xo.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(yo,bo,xo),xo.x===1&&xo.y===1&&xo.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(yo,bo,xo.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Co=new U,wo=new H,To=new H,Eo=class extends So{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type=`PerspectiveCamera`,this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=ut*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(lt*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return ut*2*Math.atan(Math.tan(lt*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Co.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Co.x,Co.y).multiplyScalar(-e/Co.z),Co.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Co.x,Co.y).multiplyScalar(-e/Co.z)}getViewSize(e,t){return this.getViewBounds(e,wo,To),t.subVectors(To,wo)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(lt*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let e=a.fullWidth,o=a.fullHeight;i+=a.offsetX*r/e,t-=a.offsetY*n/o,r*=a.width/e,n*=a.height/o}let o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},Do=class extends vo{constructor(){super(new Eo(90,1,.5,500)),this.isPointLightShadow=!0}},Oo=class extends po{constructor(e,t,n=0,r=2){super(e,t),this.isPointLight=!0,this.type=`PointLight`,this.distance=n,this.decay=r,this.shadow=new Do}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}},ko=class extends So{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type=`OrthographicCamera`,this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,i=n-e,a=n+e,o=r+t,s=r-t;if(this.view!==null&&this.view.enabled){let e=(this.right-this.left)/this.view.fullWidth/this.zoom,t=(this.top-this.bottom)/this.view.fullHeight/this.zoom;i+=e*this.view.offsetX,a=i+e*this.view.width,o-=t*this.view.offsetY,s=o-t*this.view.height}this.projectionMatrix.makeOrthographic(i,a,o,s,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},Ao=class extends vo{constructor(){super(new ko(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},jo=class extends po{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type=`DirectionalLight`,this.position.copy(kn.DEFAULT_UP),this.updateMatrix(),this.target=new kn,this.shadow=new Ao}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){let t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}},Mo=-90,No=1,Po=class extends kn{constructor(e,t,n){super(),this.type=`CubeCamera`,this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Eo(Mo,No,e,t);r.layers=this.layers,this.add(r);let i=new Eo(Mo,No,e,t);i.layers=this.layers,this.add(i);let a=new Eo(Mo,No,e,t);a.layers=this.layers,this.add(a);let o=new Eo(Mo,No,e,t);o.layers=this.layers,this.add(o);let s=new Eo(Mo,No,e,t);s.layers=this.layers,this.add(s);let c=new Eo(Mo,No,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,r,i,a,o,s]=t;for(let e of t)this.remove(e);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),i.up.set(0,0,-1),i.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),s.up.set(0,1,0),s.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),i.up.set(0,0,1),i.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),s.up.set(0,-1,0),s.lookAt(0,0,-1);else throw Error(`THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: `+e);for(let e of t)this.add(e),e.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[i,a,o,s,c,l]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let m=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let h=!1;h=e.isWebGLRenderer===!0?e.state.buffers.depth.getReversed():e.reversedDepthBuffer,e.setRenderTarget(n,0,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,i),e.setRenderTarget(n,1,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,4,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=m,e.setRenderTarget(n,5,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(u,d,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},Fo=class extends Eo{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}},Io=class{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(e){this._document=e,e.hidden!==void 0&&(this._pageVisibilityHandler=Lo.bind(this),e.addEventListener(`visibilitychange`,this._pageVisibilityHandler,!1))}disconnect(){this._pageVisibilityHandler!==null&&(this._document.removeEventListener(`visibilitychange`,this._pageVisibilityHandler),this._pageVisibilityHandler=null),this._document=null}getDelta(){return this._delta/1e3}getElapsed(){return this._elapsed/1e3}getTimescale(){return this._timescale}setTimescale(e){return this._timescale=e,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(e){return this._pageVisibilityHandler!==null&&this._document.hidden===!0?this._delta=0:(this._previousTime=this._currentTime,this._currentTime=(e===void 0?performance.now():e)-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta),this}};function Lo(){this._document.hidden===!1&&this.reset()}var Ro=`\\[\\]\\.:\\/`,zo=RegExp(`[`+Ro+`]`,`g`),Bo=`[^`+Ro+`]`,Vo=`[^`+Ro.replace(`\\.`,``)+`]`,Ho=`((?:WC+[\\/:])*)`.replace(`WC`,Bo),Uo=`(WCOD+)?`.replace(`WCOD`,Vo),Wo=`(?:\\.(WC+)(?:\\[(.+)\\])?)?`.replace(`WC`,Bo),Go=`\\.(WC+)(?:\\[(.+)\\])?`.replace(`WC`,Bo),Ko=RegExp(`^`+Ho+Uo+Wo+Go+`$`),qo=[`material`,`materials`,`bones`,`map`],Jo=class{constructor(e,t,n){let r=n||Yo.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,i=n.length;r!==i;++r)n[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},Yo=class e{constructor(t,n,r){this.path=n,this.parsedPath=r||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,r){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,r):new e(t,n,r)}static sanitizeNodeName(e){return e.replace(/\s/g,`_`).replace(zo,``)}static parseTrackName(e){let t=Ko.exec(e);if(t===null)throw Error(`THREE.PropertyBinding: Cannot parse trackName: `+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(`.`);if(r!==void 0&&r!==-1){let e=n.nodeName.substring(r+1);qo.indexOf(e)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=e)}if(n.propertyName===null||n.propertyName.length===0)throw Error(`THREE.PropertyBinding: can not parse propertyName from trackName: `+e);return n}static findNode(e,t){if(t===void 0||t===``||t===`.`||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(e){for(let r=0;r<e.length;r++){let i=e[r];if(i.name===t||i.uuid===t)return i;let a=n(i.children);if(a)return a}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let t=this.node,n=this.parsedPath,r=n.objectName,i=n.propertyName,a=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){z(`PropertyBinding: No target node found for track: `+this.path+`.`);return}if(r){let e=n.objectIndex;switch(r){case`materials`:if(!t.material){B(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.materials){B(`PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.`,this);return}t=t.material.materials;break;case`bones`:if(!t.skeleton){B(`PropertyBinding: Can not bind to bones as node does not have a skeleton.`,this);return}t=t.skeleton.bones;for(let n=0;n<t.length;n++)if(t[n].name===e){e=n;break}break;case`map`:if(`map`in t){t=t.map;break}if(!t.material){B(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.map){B(`PropertyBinding: Can not bind to material.map as node.material does not have a map.`,this);return}t=t.material.map;break;default:if(t[r]===void 0){B(`PropertyBinding: Can not bind to objectName of node undefined.`,this);return}t=t[r]}if(e!==void 0){if(t[e]===void 0){B(`PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.`,this,t);return}t=t[e]}}let o=t[i];if(o===void 0){let e=n.nodeName;B(`PropertyBinding: Trying to update property for track: `+e+`.`+i+` but it wasn't found.`,t);return}let s=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?s=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(s=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i===`morphTargetInfluences`){if(!t.geometry){B(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.`,this);return}if(!t.geometry.morphAttributes){B(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.`,this);return}t.morphTargetDictionary[a]!==void 0&&(a=t.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=a}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Yo.Composite=Jo,Yo.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},Yo.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},Yo.prototype.GetterByBindingType=[Yo.prototype._getValue_direct,Yo.prototype._getValue_array,Yo.prototype._getValue_arrayElement,Yo.prototype._getValue_toArray],Yo.prototype.SetterByBindingTypeAndVersioning=[[Yo.prototype._setValue_direct,Yo.prototype._setValue_direct_setNeedsUpdate,Yo.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Yo.prototype._setValue_array,Yo.prototype._setValue_array_setNeedsUpdate,Yo.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Yo.prototype._setValue_arrayElement,Yo.prototype._setValue_arrayElement_setNeedsUpdate,Yo.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Yo.prototype._setValue_fromArray,Yo.prototype._setValue_fromArray_setNeedsUpdate,Yo.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Xo=new nn,Zo=class{constructor(e,t,n=0,r=1/0){this.ray=new Hr(e,t),this.near=n,this.far=r,this.camera=null,this.layers=new pn,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,t.projectionMatrix.elements[14]).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):B(`Raycaster: Unsupported camera type: `+t.type)}setFromXRController(e){return Xo.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Xo),this}intersectObject(e,t=!0,n=[]){return $o(e,this,n,t),n.sort(Qo),n}intersectObjects(e,t=!0,n=[]){for(let r=0,i=e.length;r<i;r++)$o(e[r],this,n,t);return n.sort(Qo),n}};function Qo(e,t){return e.distance-t.distance}function $o(e,t,n,r){let i=!0;if(e.layers.test(t.layers)&&e.raycast(t,n)===!1&&(i=!1),i===!0&&r===!0){let r=e.children;for(let e=0,i=r.length;e<i;e++)$o(r[e],t,n,!0)}}(class e{static{e.prototype.isMatrix2=!0}constructor(e,t,n,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,r){let i=this.elements;return i[0]=e,i[2]=t,i[1]=n,i[3]=r,this}});function es(e,t,n,r){let i=ts(r);switch(n){case E:return e*t;case j:return e*t/i.components*i.byteLength;case ee:return e*t/i.components*i.byteLength;case M:return e*t*2/i.components*i.byteLength;case te:return e*t*2/i.components*i.byteLength;case D:return e*t*3/i.components*i.byteLength;case O:return e*t*4/i.components*i.byteLength;case ne:return e*t*4/i.components*i.byteLength;case N:case re:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case ie:case ae:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case se:case le:return Math.max(e,16)*Math.max(t,8)/4;case oe:case ce:return Math.max(e,8)*Math.max(t,8)/2;case P:case ue:case de:case fe:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case F:case pe:case me:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case he:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case ge:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case _e:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case ve:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case ye:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case be:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case xe:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case Se:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case Ce:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case we:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case Te:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case Ee:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case De:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case Oe:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case ke:case Ae:case je:return Math.ceil(e/4)*Math.ceil(t/4)*16;case Me:case I:return Math.ceil(e/4)*Math.ceil(t/4)*8;case Ne:case Pe:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw Error(`Unable to determine texture byte length for ${n} format.`)}function ts(e){switch(e){case p:case m:return{byteLength:1,components:1};case g:case h:case b:return{byteLength:2,components:1};case x:case S:return{byteLength:2,components:4};case v:case _:case y:return{byteLength:4,components:1};case w:case T:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`register`,{detail:{revision:`185`}})),typeof window<`u`&&(window.__THREE__?z(`WARNING: Multiple instances of Three.js being imported.`):window.__THREE__=`185`);function ns(){let e=null,t=!1,n=null,r=null;function i(t,a){n(t,a),r=e.requestAnimationFrame(i)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function rs(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var is={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
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
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
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
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
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
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
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
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
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
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
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
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
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
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
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
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
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
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
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
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
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
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
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
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
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
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
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
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
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
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
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
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
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
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
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
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
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
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
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
		return 0.5 / max( gv + gl, EPSILON );
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
	vec3 f0 = material.specularColorBlended;
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
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
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
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
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
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
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
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
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
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
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
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
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
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
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
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
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
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
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
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
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
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
	#ifdef DOUBLE_SIDED
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
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
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
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
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
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
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
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
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
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
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
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
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
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
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
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
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
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
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
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
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
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
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
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
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
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
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
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
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
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
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
}`,depth_frag:`#if DEPTH_PACKING == 3200
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
}`,distance_vert:`#define DISTANCE
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
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
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
}`,linedashed_frag:`uniform vec3 diffuse;
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
}`,meshbasic_vert:`#include <common>
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
}`,meshbasic_frag:`uniform vec3 diffuse;
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
}`,meshlambert_vert:`#define LAMBERT
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
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
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
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
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
}`,meshmatcap_vert:`#define MATCAP
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
}`,meshmatcap_frag:`#define MATCAP
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
}`,meshnormal_vert:`#define NORMAL
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
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
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
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
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
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
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
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
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
}`,meshphysical_vert:`#define STANDARD
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
}`,meshphysical_frag:`#define STANDARD
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
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
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
}`,meshtoon_vert:`#define TOON
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
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
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
}`,points_vert:`uniform float size;
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
}`,points_frag:`uniform vec3 diffuse;
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
}`,shadow_vert:`#include <common>
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
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
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
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
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
}`,sprite_frag:`uniform vec3 diffuse;
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
}`},X={common:{diffuse:{value:new K(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new W},alphaMap:{value:null},alphaMapTransform:{value:new W},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new W}},envmap:{envMap:{value:null},envMapRotation:{value:new W},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new W}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new W}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new W},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new W},normalScale:{value:new H(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new W},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new W}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new W}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new W}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new K(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new U},probesMax:{value:new U},probesResolution:{value:new U}},points:{diffuse:{value:new K(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new W},alphaTest:{value:0},uvTransform:{value:new W}},sprite:{diffuse:{value:new K(16777215)},opacity:{value:1},center:{value:new H(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new W},alphaMap:{value:null},alphaMapTransform:{value:new W},alphaTest:{value:0}}},as={basic:{uniforms:ja([X.common,X.specularmap,X.envmap,X.aomap,X.lightmap,X.fog]),vertexShader:is.meshbasic_vert,fragmentShader:is.meshbasic_frag},lambert:{uniforms:ja([X.common,X.specularmap,X.envmap,X.aomap,X.lightmap,X.emissivemap,X.bumpmap,X.normalmap,X.displacementmap,X.fog,X.lights,{emissive:{value:new K(0)},envMapIntensity:{value:1}}]),vertexShader:is.meshlambert_vert,fragmentShader:is.meshlambert_frag},phong:{uniforms:ja([X.common,X.specularmap,X.envmap,X.aomap,X.lightmap,X.emissivemap,X.bumpmap,X.normalmap,X.displacementmap,X.fog,X.lights,{emissive:{value:new K(0)},specular:{value:new K(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:is.meshphong_vert,fragmentShader:is.meshphong_frag},standard:{uniforms:ja([X.common,X.envmap,X.aomap,X.lightmap,X.emissivemap,X.bumpmap,X.normalmap,X.displacementmap,X.roughnessmap,X.metalnessmap,X.fog,X.lights,{emissive:{value:new K(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:is.meshphysical_vert,fragmentShader:is.meshphysical_frag},toon:{uniforms:ja([X.common,X.aomap,X.lightmap,X.emissivemap,X.bumpmap,X.normalmap,X.displacementmap,X.gradientmap,X.fog,X.lights,{emissive:{value:new K(0)}}]),vertexShader:is.meshtoon_vert,fragmentShader:is.meshtoon_frag},matcap:{uniforms:ja([X.common,X.bumpmap,X.normalmap,X.displacementmap,X.fog,{matcap:{value:null}}]),vertexShader:is.meshmatcap_vert,fragmentShader:is.meshmatcap_frag},points:{uniforms:ja([X.points,X.fog]),vertexShader:is.points_vert,fragmentShader:is.points_frag},dashed:{uniforms:ja([X.common,X.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:is.linedashed_vert,fragmentShader:is.linedashed_frag},depth:{uniforms:ja([X.common,X.displacementmap]),vertexShader:is.depth_vert,fragmentShader:is.depth_frag},normal:{uniforms:ja([X.common,X.bumpmap,X.normalmap,X.displacementmap,{opacity:{value:1}}]),vertexShader:is.meshnormal_vert,fragmentShader:is.meshnormal_frag},sprite:{uniforms:ja([X.sprite,X.fog]),vertexShader:is.sprite_vert,fragmentShader:is.sprite_frag},background:{uniforms:{uvTransform:{value:new W},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:is.background_vert,fragmentShader:is.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new W}},vertexShader:is.backgroundCube_vert,fragmentShader:is.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:is.cube_vert,fragmentShader:is.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:is.equirect_vert,fragmentShader:is.equirect_frag},distance:{uniforms:ja([X.common,X.displacementmap,{referencePosition:{value:new U},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:is.distance_vert,fragmentShader:is.distance_frag},shadow:{uniforms:ja([X.lights,X.fog,{color:{value:new K(0)},opacity:{value:1}}]),vertexShader:is.shadow_vert,fragmentShader:is.shadow_frag}};as.physical={uniforms:ja([as.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new W},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new W},clearcoatNormalScale:{value:new H(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new W},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new W},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new W},sheen:{value:0},sheenColor:{value:new K(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new W},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new W},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new W},transmissionSamplerSize:{value:new H},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new W},attenuationDistance:{value:0},attenuationColor:{value:new K(0)},specularColor:{value:new K(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new W},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new W},anisotropyVector:{value:new H},anisotropyMap:{value:null},anisotropyMapTransform:{value:new W}}]),vertexShader:is.meshphysical_vert,fragmentShader:is.meshphysical_frag};var os={r:0,b:0,g:0},ss=new nn,cs=new W;cs.set(-1,0,0,0,1,0,0,0,1);function ls(e,t,n,r,i,a){let o=new K(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&(i.isCubeTexture||i.mapping===306)?(l===void 0&&(l=new J(new Hi(1,1,1),new Ra({name:`BackgroundCubeMaterial`,uniforms:Aa(as.backgroundCube.uniforms),vertexShader:as.backgroundCube.vertexShader,fragmentShader:as.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,`envMap`,{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(ss.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isCubeTexture&&i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(cs),l.material.toneMapped=Bt.getTransfer(i.colorSpace)!==We,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new J(new wa(2,2),new Ra({name:`BackgroundMaterial`,uniforms:Aa(as.background.uniforms),vertexShader:as.background.vertexShader,fragmentShader:as.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,`map`,{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=Bt.getTransfer(i.colorSpace)!==We,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(os,Pa(e)),n.buffers.color.setClear(os.r,os.g,os.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function us(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.stride,p=s.offset;if(t.isInstancedInterleavedBuffer){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function ds(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function fs(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return!(t!==1023&&r.convert(t)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT))}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&n!==1015&&!i)}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(z(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.logarithmicDepthBuffer===!0,f=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`);n.reversedDepthBuffer===!0&&f===!1&&z(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:f,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function ps(e){let t=this,n=null,r=0,i=!1,a=!1,o=new hi,s=new W,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var ms=4,hs=[.125,.215,.35,.446,.526,.582],gs=20,_s=256,vs=new ko,ys=new K,bs=null,xs=0,Ss=0,Cs=!1,ws=new U,Ts=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=ws}=i;bs=this._renderer.getRenderTarget(),xs=this._renderer.getActiveCubeFace(),Ss=this._renderer.getActiveMipmapLevel(),Cs=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(e,n,r,s,o),t>0&&this._blur(s,0,0,t),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Ms(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=js(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(bs,xs,Ss),this._renderer.xr.enabled=Cs,e.scissorTest=!1,Os(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),bs=this._renderer.getRenderTarget(),xs=this._renderer.getActiveCubeFace(),Ss=this._renderer.getActiveMipmapLevel(),Cs=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:u,minFilter:u,generateMipmaps:!1,type:b,format:O,colorSpace:He,depthBuffer:!1},r=Ds(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ds(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Es(r)),this._blurMaterial=As(r,e,t),this._ggxMaterial=ks(r,e,t)}return r}_compileMaterial(e){let t=new J(new Mr,e);this._renderer.compile(t,vs)}_sceneToCubeUV(e,t,n,r,i){let a=new Eo(90,1,t,n),o=[1,-1,1,1,1,1],s=[1,1,1,-1,-1,-1],c=this._renderer,l=c.autoClear,u=c.toneMapping;c.getClearColor(ys),c.toneMapping=0,c.autoClear=!1,c.state.buffers.depth.getReversed()&&(c.setRenderTarget(r),c.clearDepth(),c.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new J(new Hi,new Ur({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1})));let d=this._backgroundBox,f=d.material,p=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,p=!0):(f.color.copy(ys),p=!0);for(let t=0;t<6;t++){let n=t%3;n===0?(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x+s[t],i.y,i.z)):n===1?(a.up.set(0,0,o[t]),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y+s[t],i.z)):(a.up.set(0,o[t],0),a.position.set(i.x,i.y,i.z),a.lookAt(i.x,i.y,i.z+s[t]));let l=this._cubeSize;Os(r,n*l,t>2?l:0,l,l),c.setRenderTarget(r),p&&c.render(d,a),c.render(e,a)}c.toneMapping=u,c.autoClear=l,e.background=m}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Ms()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=js());let i=r?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=i;let o=i.uniforms;o.envMap.value=e;let s=this._cubeSize;Os(t,0,0,3*s,2*s),n.setRenderTarget(t),n.render(a,vs)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let r=this._lodMeshes.length;for(let t=1;t<r;t++)this._applyGGXFilter(e,t-1,t);t.autoClear=n}_applyGGXFilter(e,t,n){let r=this._renderer,i=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let s=a.uniforms,c=n/(this._lodMeshes.length-1),l=t/(this._lodMeshes.length-1),u=Math.sqrt(c*c-l*l)*(0+c*1.25),{_lodMax:d}=this,f=this._sizeLods[n],p=3*f*(n>d-ms?n-d+ms:0),m=4*(this._cubeSize-f);s.envMap.value=e.texture,s.roughness.value=u,s.mipInt.value=d-t,Os(i,p,m,3*f,2*f),r.setRenderTarget(i),r.render(o,vs),s.envMap.value=i.texture,s.roughness.value=0,s.mipInt.value=d-n,Os(e,p,m,3*f,2*f),r.setRenderTarget(e),r.render(o,vs)}_blur(e,t,n,r,i){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,`latitudinal`,i),this._halfBlur(a,e,n,n,r,`longitudinal`,i)}_halfBlur(e,t,n,r,i,a,o){let s=this._renderer,c=this._blurMaterial;a!==`latitudinal`&&a!==`longitudinal`&&B(`blur direction must be either latitudinal or longitudinal!`);let l=this._lodMeshes[r];l.material=c;let u=c.uniforms,d=this._sizeLods[n]-1,f=isFinite(i)?Math.PI/(2*d):2*Math.PI/(2*gs-1),p=i/f,m=isFinite(i)?1+Math.floor(3*p):gs;m>gs&&z(`sigmaRadians, ${i}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${gs}`);let h=[],g=0;for(let e=0;e<gs;++e){let t=e/p,n=Math.exp(-t*t/2);h.push(n),e===0?g+=n:e<m&&(g+=2*n)}for(let e=0;e<h.length;e++)h[e]=h[e]/g;u.envMap.value=e.texture,u.samples.value=m,u.weights.value=h,u.latitudinal.value=a===`latitudinal`,o&&(u.poleAxis.value=o);let{_lodMax:_}=this;u.dTheta.value=f,u.mipInt.value=_-n;let v=this._sizeLods[r];Os(t,3*v*(r>_-ms?r-_+ms:0),4*(this._cubeSize-v),3*v,2*v),s.setRenderTarget(t),s.render(l,vs)}};function Es(e){let t=[],n=[],r=[],i=e,a=e-ms+1+hs.length;for(let o=0;o<a;o++){let a=2**i;t.push(a);let s=1/a;o>e-ms?s=hs[o-e+ms-1]:o===0&&(s=0),n.push(s);let c=1/(a-2),l=-c,u=1+c,d=[l,l,u,l,u,u,l,l,u,u,l,u],f=new Float32Array(108),p=new Float32Array(72),m=new Float32Array(36);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0];f.set(r,18*e),p.set(d,12*e);let i=[e,e,e,e,e,e];m.set(i,6*e)}let h=new Mr;h.setAttribute(`position`,new vr(f,3)),h.setAttribute(`uv`,new vr(p,2)),h.setAttribute(`faceIndex`,new vr(m,1)),r.push(new J(h,null)),i>ms&&i--}return{lodMeshes:r,sizeLods:t,sigmas:n}}function Ds(e,t,n){let r=new $t(e,t,n);return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.scissorTest=!0,r}function Os(e,t,n,r,i){e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i)}function ks(e,t,n){return new Ra({name:`PMREMGGXConvolution`,defines:{GGX_SAMPLES:_s,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Ns(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function As(e,t,n){let r=new Float32Array(gs),i=new U(0,1,0);return new Ra({name:`SphericalGaussianBlur`,defines:{n:gs,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:Ns(),fragmentShader:`

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
		`,blending:0,depthTest:!1,depthWrite:!1})}function js(){return new Ra({name:`EquirectangularToCubeUV`,uniforms:{envMap:{value:null}},vertexShader:Ns(),fragmentShader:`

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
		`,blending:0,depthTest:!1,depthWrite:!1})}function Ms(){return new Ra({name:`CubemapToCubeUV`,uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Ns(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Ns(){return`

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
	`}var Ps=class extends $t{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new Li(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},r=new Hi(5,5,5),i=new Ra({name:`CubemapFromEquirect`,uniforms:Aa(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new J(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=u),new Po(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}};function Fs(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304)if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}else{let r=n.image;if(r&&r.height>0){let i=new Ps(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}else return null}}return n}function o(t){if(t&&t.isTexture){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new Ts(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new Ts(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function Is(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&rt(`WebGLRenderer: `+e+` extension not supported.`),t}}}function Ls(e,t,n,r){let i={},a=new WeakMap;function o(e){let s=e.target;s.index!==null&&t.remove(s.index);for(let e in s.attributes)t.remove(s.attributes[e]);s.removeEventListener(`dispose`,o),delete i[s.id];let c=a.get(s);c&&(t.remove(c),a.delete(s)),r.releaseStatesOfGeometry(s),s.isInstancedBufferGeometry===!0&&delete s._maxInstanceCount,n.memory.geometries--}function s(e,t){return i[t.id]===!0?t:(t.addEventListener(`dispose`,o),i[t.id]=!0,n.memory.geometries++,t)}function c(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function l(e){let n=[],r=e.index,i=e.attributes.position,o=0;if(i===void 0)return;if(r!==null){let e=r.array;o=r.version;for(let t=0,r=e.length;t<r;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];n.push(r,i,i,a,a,r)}}else{let e=i.array;o=i.version;for(let t=0,r=e.length/3-1;t<r;t+=3){let e=t+0,r=t+1,i=t+2;n.push(e,r,r,i,i,e)}}let s=new(i.count>=65535?br:yr)(n,1);s.version=o;let c=a.get(e);c&&t.remove(c),a.set(e,s)}function u(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&l(e)}else l(e);return a.get(e)}return{get:s,update:c,getWireframeAttribute:u}}function Rs(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function zs(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:B(`WebGLInfo: Unknown draw mode:`,r);break}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function Bs(e,t,n){let r=new WeakMap,i=new Zt;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let h=new Float32Array(p*m*4*u),g=new en(h,p,m,u);g.type=y,g.needsUpdate=!0;let _=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*_;e===!0&&(i.fromBufferAttribute(r,t),h[d+s+0]=i.x,h[d+s+1]=i.y,h[d+s+2]=i.z,h[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),h[d+s+4]=i.x,h[d+s+5]=i.y,h[d+s+6]=i.z,h[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),h[d+s+8]=i.x,h[d+s+9]=i.y,h[d+s+10]=i.z,h[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:g,size:new H(p,m)},r.set(o,d);function v(){g.dispose(),r.delete(o),o.removeEventListener(`dispose`,v)}o.addEventListener(`dispose`,v)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function Vs(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var Hs={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function Us(e,t,n,r,i,a){let o=new $t(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,depthTexture:i?new zi(t,n):void 0}),s=new $t(t,n,{type:b,depthBuffer:!1,stencilBuffer:!1}),c=new Mr;c.setAttribute(`position`,new q([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute(`uv`,new q([0,2,0,0,2,0],2));let l=new za({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),u=new J(c,l),d=new ko(-1,1,1,-1,0,1),f=null,p=null,m=!1,h,g=null,_=[],v=!1;this.setSize=function(e,t){o.setSize(e,t),s.setSize(e,t);for(let n=0;n<_.length;n++){let r=_[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){_=e,v=_.length>0&&_[0].isRenderPass===!0;let t=o.width,n=o.height;for(let e=0;e<_.length;e++){let r=_[e];r.setSize&&r.setSize(t,n)}},this.begin=function(e,t){if(m||e.toneMapping===0&&_.length===0)return!1;if(g=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return v===!1&&e.setRenderTarget(o),h=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return v},this.end=function(e,t){e.toneMapping=h,m=!0;let n=o,r=s;for(let i=0;i<_.length;i++){let a=_[i];if(a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1)){let e=n;n=r,r=e}}if(f!==e.outputColorSpace||p!==e.toneMapping){f=e.outputColorSpace,p=e.toneMapping,l.defines={},Bt.getTransfer(f)===`srgb`&&(l.defines.SRGB_TRANSFER=``);let t=Hs[p];t&&(l.defines[t]=``),l.needsUpdate=!0}l.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(g),e.render(u,d),g=null,m=!1},this.isCompositing=function(){return m},this.dispose=function(){o.depthTexture&&o.depthTexture.dispose(),o.dispose(),s.dispose(),c.dispose(),l.dispose()}}var Ws=new Xt,Gs=new zi(1,1),Ks=new en,qs=new tn,Js=new Li,Ys=[],Xs=[],Zs=new Float32Array(16),Qs=new Float32Array(9),$s=new Float32Array(4);function ec(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=Ys[i];if(a===void 0&&(a=new Float32Array(i),Ys[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function tc(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function nc(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function rc(e,t){let n=Xs[t];n===void 0&&(n=new Int32Array(t),Xs[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function ic(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function ac(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(tc(n,t))return;e.uniform2fv(this.addr,t),nc(n,t)}}function oc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(tc(n,t))return;e.uniform3fv(this.addr,t),nc(n,t)}}function sc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(tc(n,t))return;e.uniform4fv(this.addr,t),nc(n,t)}}function cc(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(tc(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),nc(n,t)}else{if(tc(n,r))return;$s.set(r),e.uniformMatrix2fv(this.addr,!1,$s),nc(n,r)}}function lc(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(tc(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),nc(n,t)}else{if(tc(n,r))return;Qs.set(r),e.uniformMatrix3fv(this.addr,!1,Qs),nc(n,r)}}function uc(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(tc(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),nc(n,t)}else{if(tc(n,r))return;Zs.set(r),e.uniformMatrix4fv(this.addr,!1,Zs),nc(n,r)}}function dc(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function fc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(tc(n,t))return;e.uniform2iv(this.addr,t),nc(n,t)}}function pc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(tc(n,t))return;e.uniform3iv(this.addr,t),nc(n,t)}}function mc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(tc(n,t))return;e.uniform4iv(this.addr,t),nc(n,t)}}function hc(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function gc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(tc(n,t))return;e.uniform2uiv(this.addr,t),nc(n,t)}}function _c(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(tc(n,t))return;e.uniform3uiv(this.addr,t),nc(n,t)}}function vc(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(tc(n,t))return;e.uniform4uiv(this.addr,t),nc(n,t)}}function yc(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;this.type===e.SAMPLER_2D_SHADOW?(Gs.compareFunction=n.isReversedDepthBuffer()?518:515,a=Gs):a=Ws,n.setTexture2D(t||a,i)}function bc(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||qs,i)}function xc(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTextureCube(t||Js,i)}function Sc(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||Ks,i)}function Cc(e){switch(e){case 5126:return ic;case 35664:return ac;case 35665:return oc;case 35666:return sc;case 35674:return cc;case 35675:return lc;case 35676:return uc;case 5124:case 35670:return dc;case 35667:case 35671:return fc;case 35668:case 35672:return pc;case 35669:case 35673:return mc;case 5125:return hc;case 36294:return gc;case 36295:return _c;case 36296:return vc;case 35678:case 36198:case 36298:case 36306:case 35682:return yc;case 35679:case 36299:case 36307:return bc;case 35680:case 36300:case 36308:case 36293:return xc;case 36289:case 36303:case 36311:case 36292:return Sc}}function wc(e,t){e.uniform1fv(this.addr,t)}function Tc(e,t){let n=ec(t,this.size,2);e.uniform2fv(this.addr,n)}function Ec(e,t){let n=ec(t,this.size,3);e.uniform3fv(this.addr,n)}function Dc(e,t){let n=ec(t,this.size,4);e.uniform4fv(this.addr,n)}function Oc(e,t){let n=ec(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function kc(e,t){let n=ec(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function Ac(e,t){let n=ec(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function jc(e,t){e.uniform1iv(this.addr,t)}function Mc(e,t){e.uniform2iv(this.addr,t)}function Nc(e,t){e.uniform3iv(this.addr,t)}function Pc(e,t){e.uniform4iv(this.addr,t)}function Fc(e,t){e.uniform1uiv(this.addr,t)}function Ic(e,t){e.uniform2uiv(this.addr,t)}function Lc(e,t){e.uniform3uiv(this.addr,t)}function Rc(e,t){e.uniform4uiv(this.addr,t)}function zc(e,t,n){let r=this.cache,i=t.length,a=rc(n,i);tc(r,a)||(e.uniform1iv(this.addr,a),nc(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?Gs:Ws;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function Bc(e,t,n){let r=this.cache,i=t.length,a=rc(n,i);tc(r,a)||(e.uniform1iv(this.addr,a),nc(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||qs,a[e])}function Vc(e,t,n){let r=this.cache,i=t.length,a=rc(n,i);tc(r,a)||(e.uniform1iv(this.addr,a),nc(r,a));for(let e=0;e!==i;++e)n.setTextureCube(t[e]||Js,a[e])}function Hc(e,t,n){let r=this.cache,i=t.length,a=rc(n,i);tc(r,a)||(e.uniform1iv(this.addr,a),nc(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||Ks,a[e])}function Uc(e){switch(e){case 5126:return wc;case 35664:return Tc;case 35665:return Ec;case 35666:return Dc;case 35674:return Oc;case 35675:return kc;case 35676:return Ac;case 5124:case 35670:return jc;case 35667:case 35671:return Mc;case 35668:case 35672:return Nc;case 35669:case 35673:return Pc;case 5125:return Fc;case 36294:return Ic;case 36295:return Lc;case 36296:return Rc;case 35678:case 36198:case 36298:case 36306:case 35682:return zc;case 35679:case 36299:case 36307:return Bc;case 35680:case 36300:case 36308:case 36293:return Vc;case 36289:case 36303:case 36311:case 36292:return Hc}}var Wc=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Cc(t.type)}},Gc=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Uc(t.type)}},Kc=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},qc=/(\w+)(\])?(\[|\.)?/g;function Jc(e,t){e.seq.push(t),e.map[t.id]=t}function Yc(e,t,n){let r=e.name,i=r.length;for(qc.lastIndex=0;;){let a=qc.exec(r),o=qc.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){Jc(n,l===void 0?new Wc(s,e,t):new Gc(s,e,t));break}else{let e=n.map[s];e===void 0&&(e=new Kc(s),Jc(n,e)),n=e}}}var Xc=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);Yc(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function Zc(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var Qc=37297,$c=0;function el(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var tl=new W;function nl(e){Bt._getMatrix(tl,Bt.workingColorSpace,e);let t=`mat3( ${tl.elements.map(e=>e.toFixed(4))} )`;switch(Bt.getTransfer(e)){case Ue:return[t,`LinearTransferOETF`];case We:return[t,`sRGBTransferOETF`];default:return z(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function rl(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+el(e.getShaderSource(t),r)}else return i}function il(e,t){let n=nl(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( value.rgb * ${n[0]}, value.a ) );`,`}`].join(`
`)}var al={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function ol(e,t){let n=al[t];return n===void 0?(z(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var sl=new U;function cl(){return Bt.getLuminanceCoefficients(sl),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${sl.x.toFixed(4)}, ${sl.y.toFixed(4)}, ${sl.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function ll(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(fl).join(`
`)}function ul(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function dl(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function fl(e){return e!==``}function pl(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function ml(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var hl=/^[ \t]*#include +<([\w\d./]+)>/gm;function gl(e){return e.replace(hl,vl)}var _l=new Map;function vl(e,t){let n=is[t];if(n===void 0){let e=_l.get(t);if(e!==void 0)n=is[e],z(`WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.`,t,e);else throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`)}return gl(n)}var yl=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function bl(e){return e.replace(yl,xl)}function xl(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function Sl(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var Cl={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function wl(e){return Cl[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var Tl={301:`ENVMAP_TYPE_CUBE`,302:`ENVMAP_TYPE_CUBE`,306:`ENVMAP_TYPE_CUBE_UV`};function El(e){return e.envMap===!1?`ENVMAP_TYPE_CUBE`:Tl[e.envMapMode]||`ENVMAP_TYPE_CUBE`}var Dl={302:`ENVMAP_MODE_REFRACTION`};function Ol(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Dl[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var kl={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function Al(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:kl[e.combine]||`ENVMAP_BLENDING_NONE`}function jl(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(2**n,112)),texelHeight:r,maxMip:n}}function Ml(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=wl(n),l=El(n),u=Ol(n),d=Al(n),f=jl(n),p=ll(n),m=ul(a),h=i.createProgram(),g,_,v=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(fl).join(`
`),g.length>0&&(g+=`
`),_=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(fl).join(`
`),_.length>0&&(_+=`
`)):(g=[Sl(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(fl).join(`
`),_=[Sl(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,f?`#define CUBEUV_TEXEL_WIDTH `+f.texelWidth:``,f?`#define CUBEUV_TEXEL_HEIGHT `+f.texelHeight:``,f?`#define CUBEUV_MAX_MIP `+f.maxMip+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.numLightProbeGrids>0?`#define USE_LIGHT_PROBES_GRID`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:is.tonemapping_pars_fragment,n.toneMapping===0?``:ol(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,is.colorspace_pars_fragment,il(`linearToOutputTexel`,n.outputColorSpace),cl(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(fl).join(`
`)),o=gl(o),o=pl(o,n),o=ml(o,n),s=gl(s),s=pl(s,n),s=ml(s,n),o=bl(o),s=bl(s),n.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,g=[p,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+g,_=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+_);let y=v+g+o,b=v+_+s,x=Zc(i,i.VERTEX_SHADER,y),S=Zc(i,i.FRAGMENT_SHADER,b);i.attachShader(h,x),i.attachShader(h,S),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(h,0,`position`):i.bindAttribLocation(h,0,n.index0AttributeName),i.linkProgram(h);function C(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(h)||``,r=i.getShaderInfoLog(x)||``,a=i.getShaderInfoLog(S)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(h,i.LINK_STATUS)===!1)if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,h,x,S);else{let e=rl(i,x,`vertex`),n=rl(i,S,`fragment`);B(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(h,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}else o===``?(s===``||c===``)&&(u=!1):z(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:g},fragmentShader:{log:c,prefix:_}})}i.deleteShader(x),i.deleteShader(S),w=new Xc(i,h),T=dl(i,h)}let w;this.getUniforms=function(){return w===void 0&&C(this),w};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let E=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(h,Qc)),E},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(h),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=$c++,this.cacheKey=t,this.usedTimes=1,this.program=h,this.vertexShader=x,this.fragmentShader=S,this}var Nl=0,Pl=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Fl(e),t.set(e,n)),n}},Fl=class{constructor(e){this.id=Nl++,this.code=e,this.usedTimes=0}};function Il(e){return e===1030||e===37490||e===36285}function Ll(e,t,n,r,i,a){let o=new pn,s=new Pl,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f=r.precision,p={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function m(e){return c.add(e),e===0?`uv`:`uv${e}`}function h(i,o,l,u,h,g){let _=u.fog,v=h.geometry,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,b=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,x=t.get(i.envMap||y,b),S=x&&x.mapping===306?x.image.height:null,C=p[i.type];i.precision!==null&&(f=r.getMaxPrecision(i.precision),f!==i.precision&&z(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,f,`instead.`));let w=v.morphAttributes.position||v.morphAttributes.normal||v.morphAttributes.color,T=w===void 0?0:w.length,E=0;v.morphAttributes.position!==void 0&&(E=1),v.morphAttributes.normal!==void 0&&(E=2),v.morphAttributes.color!==void 0&&(E=3);let D,O,k,A;if(C){let e=as[C];D=e.vertexShader,O=e.fragmentShader}else{D=i.vertexShader,O=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),k=e.id,A=t.id}let j=e.getRenderTarget(),ee=e.state.buffers.depth.getReversed(),M=h.isInstancedMesh===!0,te=h.isBatchedMesh===!0,ne=!!i.map,N=!!i.matcap,re=!!x,ie=!!i.aoMap,ae=!!i.lightMap,oe=!!i.bumpMap&&i.wireframe===!1,se=!!i.normalMap,ce=!!i.displacementMap,le=!!i.emissiveMap,P=!!i.metalnessMap,ue=!!i.roughnessMap,F=i.anisotropy>0,de=i.clearcoat>0,fe=i.dispersion>0,pe=i.iridescence>0,me=i.sheen>0,he=i.transmission>0,ge=F&&!!i.anisotropyMap,_e=de&&!!i.clearcoatMap,ve=de&&!!i.clearcoatNormalMap,ye=de&&!!i.clearcoatRoughnessMap,be=pe&&!!i.iridescenceMap,xe=pe&&!!i.iridescenceThicknessMap,Se=me&&!!i.sheenColorMap,Ce=me&&!!i.sheenRoughnessMap,we=!!i.specularMap,Te=!!i.specularColorMap,Ee=!!i.specularIntensityMap,De=he&&!!i.transmissionMap,Oe=he&&!!i.thicknessMap,ke=!!i.gradientMap,Ae=!!i.alphaMap,je=i.alphaTest>0,Me=!!i.alphaHash,I=!!i.extensions,Ne=0;i.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(Ne=e.toneMapping);let Pe={shaderID:C,shaderType:i.type,shaderName:i.name,vertexShader:D,fragmentShader:O,defines:i.defines,customVertexShaderID:k,customFragmentShaderID:A,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:f,batching:te,batchingColor:te&&h._colorsTexture!==null,instancing:M,instancingColor:M&&h.instanceColor!==null,instancingMorph:M&&h.morphTexture!==null,outputColorSpace:j===null?e.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:Bt.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:ne,matcap:N,envMap:re,envMapMode:re&&x.mapping,envMapCubeUVHeight:S,aoMap:ie,lightMap:ae,bumpMap:oe,normalMap:se,displacementMap:ce,emissiveMap:le,normalMapObjectSpace:se&&i.normalMapType===1,normalMapTangentSpace:se&&i.normalMapType===0,packedNormalMap:se&&i.normalMapType===0&&Il(i.normalMap.format),metalnessMap:P,roughnessMap:ue,anisotropy:F,anisotropyMap:ge,clearcoat:de,clearcoatMap:_e,clearcoatNormalMap:ve,clearcoatRoughnessMap:ye,dispersion:fe,iridescence:pe,iridescenceMap:be,iridescenceThicknessMap:xe,sheen:me,sheenColorMap:Se,sheenRoughnessMap:Ce,specularMap:we,specularColorMap:Te,specularIntensityMap:Ee,transmission:he,transmissionMap:De,thicknessMap:Oe,gradientMap:ke,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Ae,alphaTest:je,alphaHash:Me,combine:i.combine,mapUv:ne&&m(i.map.channel),aoMapUv:ie&&m(i.aoMap.channel),lightMapUv:ae&&m(i.lightMap.channel),bumpMapUv:oe&&m(i.bumpMap.channel),normalMapUv:se&&m(i.normalMap.channel),displacementMapUv:ce&&m(i.displacementMap.channel),emissiveMapUv:le&&m(i.emissiveMap.channel),metalnessMapUv:P&&m(i.metalnessMap.channel),roughnessMapUv:ue&&m(i.roughnessMap.channel),anisotropyMapUv:ge&&m(i.anisotropyMap.channel),clearcoatMapUv:_e&&m(i.clearcoatMap.channel),clearcoatNormalMapUv:ve&&m(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ye&&m(i.clearcoatRoughnessMap.channel),iridescenceMapUv:be&&m(i.iridescenceMap.channel),iridescenceThicknessMapUv:xe&&m(i.iridescenceThicknessMap.channel),sheenColorMapUv:Se&&m(i.sheenColorMap.channel),sheenRoughnessMapUv:Ce&&m(i.sheenRoughnessMap.channel),specularMapUv:we&&m(i.specularMap.channel),specularColorMapUv:Te&&m(i.specularColorMap.channel),specularIntensityMapUv:Ee&&m(i.specularIntensityMap.channel),transmissionMapUv:De&&m(i.transmissionMap.channel),thicknessMapUv:Oe&&m(i.thicknessMap.channel),alphaMapUv:Ae&&m(i.alphaMap.channel),vertexTangents:!!v.attributes.tangent&&(se||F),vertexNormals:!!v.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!v.attributes.color&&v.attributes.color.itemSize===4,pointsUvs:h.isPoints===!0&&!!v.attributes.uv&&(ne||Ae),fog:!!_,useFog:i.fog===!0,fogExp2:!!_&&_.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||v.attributes.normal===void 0&&se===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:ee,skinning:h.isSkinnedMesh===!0,hasPositionAttribute:v.attributes.position!==void 0,morphTargets:v.morphAttributes.position!==void 0,morphNormals:v.morphAttributes.normal!==void 0,morphColors:v.morphAttributes.color!==void 0,morphTargetsCount:T,morphTextureStride:E,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:g.length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:Ne,decodeVideoTexture:ne&&i.map.isVideoTexture===!0&&Bt.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:le&&i.emissiveMap.isVideoTexture===!0&&Bt.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:I&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(I&&i.extensions.multiDraw===!0||te)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return Pe.vertexUv1s=c.has(1),Pe.vertexUv2s=c.has(2),Pe.vertexUv3s=c.has(3),c.clear(),Pe}function g(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(_(n,t),v(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function _(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapCubeUVHeight),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.morphAttributeCount),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function v(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function y(e){let t=p[e.type],n;if(t){let e=as[t];n=Fa.clone(e.uniforms)}else n=e.uniforms;return n}function b(t,n){let r=u.get(n);return r===void 0?(r=new Ml(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function x(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function S(e){s.remove(e)}function C(){s.dispose()}return{getParameters:h,getProgramCacheKey:g,getUniforms:y,acquireProgram:b,releaseProgram:x,releaseShaderCache:S,programs:l,dispose:C}}function Rl(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function zl(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Bl(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Vl(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.push(u):a.transparent===!0?i.push(u):n.push(u)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t,a){n.length>1&&n.sort(e||zl),r.length>1&&r.sort(t||Bl),i.length>1&&i.sort(t||Bl),a&&(n.reverse(),r.reverse(),i.reverse())}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function Hl(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new Vl,e.set(t,[i])):n>=r.length?(i=new Vl,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function Ul(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={direction:new U,color:new K};break;case`SpotLight`:n={position:new U,direction:new U,color:new K,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new U,color:new K,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new U,skyColor:new K,groundColor:new K};break;case`RectAreaLight`:n={color:new K,position:new U,halfWidth:new U,halfHeight:new U};break}return e[t.id]=n,n}}}function Wl(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new H};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new H};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new H,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[t.id]=n,n}}}var Gl=0;function Kl(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function ql(e){let t=new Ul,n=Wl(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new U);let i=new U,a=new nn,o=new nn;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0;i.sort(Kl);for(let e=0,y=i.length;e<y;e++){let y=i[e],b=y.color,x=y.intensity,S=y.distance,C=null;if(y.shadow&&y.shadow.map&&(C=y.shadow.map.texture.format===1030?y.shadow.map.texture:y.shadow.map.depthTexture||y.shadow.map.texture),y.isAmbientLight)a+=b.r*x,o+=b.g*x,s+=b.b*x;else if(y.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(y.sh.coefficients[e],x);v++}else if(y.isDirectionalLight){let e=t.get(y);if(e.color.copy(y.color).multiplyScalar(y.intensity),y.castShadow){let e=y.shadow,t=n.get(y);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[c]=t,r.directionalShadowMap[c]=C,r.directionalShadowMatrix[c]=y.shadow.matrix,p++}r.directional[c]=e,c++}else if(y.isSpotLight){let e=t.get(y);e.position.setFromMatrixPosition(y.matrixWorld),e.color.copy(b).multiplyScalar(x),e.distance=S,e.coneCos=Math.cos(y.angle),e.penumbraCos=Math.cos(y.angle*(1-y.penumbra)),e.decay=y.decay,r.spot[u]=e;let i=y.shadow;if(y.map&&(r.spotLightMap[g]=y.map,g++,i.updateMatrices(y),y.castShadow&&_++),r.spotLightMatrix[u]=i.matrix,y.castShadow){let e=n.get(y);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[u]=e,r.spotShadowMap[u]=C,h++}u++}else if(y.isRectAreaLight){let e=t.get(y);e.color.copy(b).multiplyScalar(x),e.halfWidth.set(y.width*.5,0,0),e.halfHeight.set(0,y.height*.5,0),r.rectArea[d]=e,d++}else if(y.isPointLight){let e=t.get(y);if(e.color.copy(y.color).multiplyScalar(y.intensity),e.distance=y.distance,e.decay=y.decay,y.castShadow){let e=y.shadow,t=n.get(y);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[l]=t,r.pointShadowMap[l]=C,r.pointShadowMatrix[l]=y.shadow.matrix,m++}r.point[l]=e,l++}else if(y.isHemisphereLight){let e=t.get(y);e.skyColor.copy(y.color).multiplyScalar(x),e.groundColor.copy(y.groundColor).multiplyScalar(x),r.hemi[f]=e,f++}}d>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=X.LTC_FLOAT_1,r.rectAreaLTC2=X.LTC_FLOAT_2):(r.rectAreaLTC1=X.LTC_HALF_1,r.rectAreaLTC2=X.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let y=r.hash;(y.directionalLength!==c||y.pointLength!==l||y.spotLength!==u||y.rectAreaLength!==d||y.hemiLength!==f||y.numDirectionalShadows!==p||y.numPointShadows!==m||y.numSpotShadows!==h||y.numSpotMaps!==g||y.numLightProbes!==v)&&(r.directional.length=c,r.spot.length=u,r.rectArea.length=d,r.point.length=l,r.hemi.length=f,r.directionalShadow.length=p,r.directionalShadowMap.length=p,r.pointShadow.length=m,r.pointShadowMap.length=m,r.spotShadow.length=h,r.spotShadowMap.length=h,r.directionalShadowMatrix.length=p,r.pointShadowMatrix.length=m,r.spotLightMatrix.length=h+g-_,r.spotLightMap.length=g,r.numSpotLightShadowsWithMaps=_,r.numLightProbes=v,y.directionalLength=c,y.pointLength=l,y.spotLength=u,y.rectAreaLength=d,y.hemiLength=f,y.numDirectionalShadows=p,y.numPointShadows=m,y.numSpotShadows=h,y.numSpotMaps=g,y.numLightProbes=v,r.version=Gl++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=t.matrixWorldInverse;for(let t=0,f=e.length;t<f;t++){let f=e[t];if(f.isDirectionalLight){let e=r.directional[n];e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),n++}else if(f.isSpotLight){let e=r.spot[c];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),c++}else if(f.isRectAreaLight){let e=r.rectArea[l];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),o.identity(),a.copy(f.matrixWorld),a.premultiply(d),o.extractRotation(a),e.halfWidth.set(f.width*.5,0,0),e.halfHeight.set(0,f.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),l++}else if(f.isPointLight){let e=r.point[s];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),s++}else if(f.isHemisphereLight){let e=r.hemi[u];e.direction.setFromMatrixPosition(f.matrixWorld),e.direction.transformDirection(d),u++}}}return{setup:s,setupView:c,state:r}}function Jl(e){let t=new ql(e),n=[],r=[],i=[];function a(e){d.camera=e,n.length=0,r.length=0,i.length=0}function o(e){n.push(e)}function s(e){r.push(e)}function c(e){i.push(e)}function l(){t.setup(n)}function u(e){t.setupView(n,e)}let d={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:d,setupLights:l,setupLightsView:u,pushLight:o,pushShadow:s,pushLightProbeGrid:c}}function Yl(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new Jl(e),t.set(n,[a])):r>=i.length?(a=new Jl(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var Xl=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Zl=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Ql=[new U(1,0,0),new U(-1,0,0),new U(0,1,0),new U(0,-1,0),new U(0,0,1),new U(0,0,-1)],$l=[new U(0,-1,0),new U(0,-1,0),new U(0,0,1),new U(0,0,-1),new U(0,-1,0),new U(0,-1,0)],eu=new nn,tu=new U,nu=new U;function ru(e,t,n){let r=new yi,i=new H,a=new H,o=new Zt,c=new Ua,l=new Wa,d={},f=n.maxTextureSize,p={0:1,1:0,2:2},m=new Ra({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new H},radius:{value:4}},vertexShader:Xl,fragmentShader:Zl}),h=m.clone();h.defines.HORIZONTAL_PASS=1;let g=new Mr;g.setAttribute(`position`,new vr(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new J(g,m),x=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let S=this.type;this.render=function(t,n,c){if(x.enabled===!1||x.autoUpdate===!1&&x.needsUpdate===!1||t.length===0)return;this.type===2&&(z(`WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.`),this.type=1);let l=e.getRenderTarget(),d=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),m=e.state;m.setBlending(0),m.buffers.depth.getReversed()===!0?m.buffers.color.setClear(0,0,0,0):m.buffers.color.setClear(1,1,1,1),m.buffers.depth.setTest(!0),m.setScissorTest(!1);let h=S!==this.type;h&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let l=0,d=t.length;l<d;l++){let d=t[l],p=d.shadow;if(p===void 0){z(`WebGLShadowMap:`,d,`has no shadow.`);continue}if(p.autoUpdate===!1&&p.needsUpdate===!1)continue;i.copy(p.mapSize);let g=p.getFrameExtents();i.multiply(g),a.copy(p.mapSize),(i.x>f||i.y>f)&&(i.x>f&&(a.x=Math.floor(f/g.x),i.x=a.x*g.x,p.mapSize.x=a.x),i.y>f&&(a.y=Math.floor(f/g.y),i.y=a.y*g.y,p.mapSize.y=a.y));let _=e.state.buffers.depth.getReversed();if(p.camera._reversedDepth=_,p.map===null||h===!0){if(p.map!==null&&(p.map.depthTexture!==null&&(p.map.depthTexture.dispose(),p.map.depthTexture=null),p.map.dispose()),this.type===3){if(d.isPointLight){z(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}p.map=new $t(i.x,i.y,{format:M,type:b,minFilter:u,magFilter:u,generateMipmaps:!1}),p.map.texture.name=d.name+`.shadowMap`,p.map.depthTexture=new zi(i.x,i.y,y),p.map.depthTexture.name=d.name+`.shadowMapDepth`,p.map.depthTexture.format=k,p.map.depthTexture.compareFunction=null,p.map.depthTexture.minFilter=s,p.map.depthTexture.magFilter=s}else d.isPointLight?(p.map=new Ps(i.x),p.map.depthTexture=new Bi(i.x,v)):(p.map=new $t(i.x,i.y),p.map.depthTexture=new zi(i.x,i.y,v)),p.map.depthTexture.name=d.name+`.shadowMap`,p.map.depthTexture.format=k,this.type===1?(p.map.depthTexture.compareFunction=_?518:515,p.map.depthTexture.minFilter=u,p.map.depthTexture.magFilter=u):(p.map.depthTexture.compareFunction=null,p.map.depthTexture.minFilter=s,p.map.depthTexture.magFilter=s);p.camera.updateProjectionMatrix()}let x=p.map.isWebGLCubeRenderTarget?6:1;for(let t=0;t<x;t++){if(p.map.isWebGLCubeRenderTarget)e.setRenderTarget(p.map,t),e.clear();else{t===0&&(e.setRenderTarget(p.map),e.clear());let n=p.getViewport(t);o.set(a.x*n.x,a.y*n.y,a.x*n.z,a.y*n.w),m.viewport(o)}if(d.isPointLight){let e=p.camera,n=p.matrix,r=d.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),tu.setFromMatrixPosition(d.matrixWorld),e.position.copy(tu),nu.copy(e.position),nu.add(Ql[t]),e.up.copy($l[t]),e.lookAt(nu),e.updateMatrixWorld(),n.makeTranslation(-tu.x,-tu.y,-tu.z),eu.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),p._frustum.setFromProjectionMatrix(eu,e.coordinateSystem,e.reversedDepth)}else p.updateMatrices(d);r=p.getFrustum(),T(n,c,p.camera,d,this.type)}p.isPointLightShadow!==!0&&this.type===3&&C(p,c),p.needsUpdate=!1}S=this.type,x.needsUpdate=!1,e.setRenderTarget(l,d,p)};function C(n,r){let a=t.update(_);m.defines.VSM_SAMPLES!==n.blurSamples&&(m.defines.VSM_SAMPLES=n.blurSamples,h.defines.VSM_SAMPLES=n.blurSamples,m.needsUpdate=!0,h.needsUpdate=!0),n.mapPass===null&&(n.mapPass=new $t(i.x,i.y,{format:M,type:b})),m.uniforms.shadow_pass.value=n.map.depthTexture,m.uniforms.resolution.value=n.mapSize,m.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,a,m,_,null),h.uniforms.shadow_pass.value=n.mapPass.texture,h.uniforms.resolution.value=n.mapSize,h.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,a,h,_,null)}function w(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?l:c,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=d[e];r===void 0&&(r={},d[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,E)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?p[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function T(n,i,a,o,s){if(n.visible===!1)return;if(n.layers.test(i.layers)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&s===3)&&(!n.frustumCulled||r.intersectsObject(n))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let r=t.update(n),c=n.material;if(Array.isArray(c)){let t=r.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=c[u.materialIndex];if(d&&d.visible){let t=w(n,d,o,s);n.onBeforeShadow(e,n,i,a,r,t,u),e.renderBufferDirect(a,null,r,t,n,u),n.onAfterShadow(e,n,i,a,r,t,u)}}}else if(c.visible){let t=w(n,c,o,s);n.onBeforeShadow(e,n,i,a,r,t,null),e.renderBufferDirect(a,null,r,t,n,null),n.onAfterShadow(e,n,i,a,r,t,null)}}let c=n.children;for(let e=0,t=c.length;e<t;e++)T(c[e],i,a,o,s)}function E(e){e.target.removeEventListener(`dispose`,E);for(let t in d){let n=d[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function iu(e,t){function n(){let t=!1,n=new Zt,r=null,i=new Zt(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?P(e.DEPTH_TEST):ue(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=at[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?P(e.STENCIL_TEST):ue(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c=new WeakMap,l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new K(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,ee=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),M=!1,te=0,ne=e.getParameter(e.VERSION);ne.indexOf(`WebGL`)===-1?ne.indexOf(`OpenGL ES`)!==-1&&(te=parseFloat(/^OpenGL ES (\d)/.exec(ne)[1]),M=te>=2):(te=parseFloat(/^WebGL (\d)/.exec(ne)[1]),M=te>=1);let N=null,re={},ie=e.getParameter(e.SCISSOR_BOX),ae=e.getParameter(e.VIEWPORT),oe=new Zt().fromArray(ie),se=new Zt().fromArray(ae);function ce(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let le={};le[e.TEXTURE_2D]=ce(e.TEXTURE_2D,e.TEXTURE_2D,1),le[e.TEXTURE_CUBE_MAP]=ce(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),le[e.TEXTURE_2D_ARRAY]=ce(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),le[e.TEXTURE_3D]=ce(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),P(e.DEPTH_TEST),o.setFunc(3),_e(!1),ve(1),P(e.CULL_FACE),he(0);function P(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function ue(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function F(t,n){return f[t]===n?!1:(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function de(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function fe(t){return h===t?!1:(e.useProgram(t),h=t,!0)}let pe={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};pe[103]=e.MIN,pe[104]=e.MAX;let me={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function he(t,n,r,i,a,o,s,c,l,u){if(t===0){g===!0&&(ue(e.BLEND),g=!1);return}if(g===!1&&(P(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:B(`WebGLState: Invalid blending: `,t);break}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:B(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:B(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:B(`WebGLState: Invalid blending: `,t);break}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}return}a||=n,o||=r,s||=i,(n!==v||a!==x)&&(e.blendEquationSeparate(pe[n],pe[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(me[r],me[i],me[o],me[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function ge(t,n){t.side===2?ue(e.CULL_FACE):P(e.CULL_FACE);let r=t.side===1;n&&(r=!r),_e(r),t.blending===1&&t.transparent===!1?he(0):he(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),be(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?P(e.SAMPLE_ALPHA_TO_COVERAGE):ue(e.SAMPLE_ALPHA_TO_COVERAGE)}function _e(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function ve(t){t===0?ue(e.CULL_FACE):(P(e.CULL_FACE),t!==O&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),O=t}function ye(t){t!==k&&(M&&e.lineWidth(t),k=t)}function be(t,n,r){t?(P(e.POLYGON_OFFSET_FILL),(A!==n||j!==r)&&(A=n,j=r,o.getReversed()&&(n=-n),e.polygonOffset(n,r))):ue(e.POLYGON_OFFSET_FILL)}function xe(t){t?P(e.SCISSOR_TEST):ue(e.SCISSOR_TEST)}function Se(t){t===void 0&&(t=e.TEXTURE0+ee-1),N!==t&&(e.activeTexture(t),N=t)}function Ce(t,n,r){r===void 0&&(r=N===null?e.TEXTURE0+ee-1:N);let i=re[r];i===void 0&&(i={type:void 0,texture:void 0},re[r]=i),(i.type!==t||i.texture!==n)&&(N!==r&&(e.activeTexture(r),N=r),e.bindTexture(t,n||le[t]),i.type=t,i.texture=n)}function we(){let t=re[N];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function Te(){try{e.compressedTexImage2D(...arguments)}catch(e){B(`WebGLState:`,e)}}function Ee(){try{e.compressedTexImage3D(...arguments)}catch(e){B(`WebGLState:`,e)}}function De(){try{e.texSubImage2D(...arguments)}catch(e){B(`WebGLState:`,e)}}function Oe(){try{e.texSubImage3D(...arguments)}catch(e){B(`WebGLState:`,e)}}function ke(){try{e.compressedTexSubImage2D(...arguments)}catch(e){B(`WebGLState:`,e)}}function Ae(){try{e.compressedTexSubImage3D(...arguments)}catch(e){B(`WebGLState:`,e)}}function je(){try{e.texStorage2D(...arguments)}catch(e){B(`WebGLState:`,e)}}function Me(){try{e.texStorage3D(...arguments)}catch(e){B(`WebGLState:`,e)}}function I(){try{e.texImage2D(...arguments)}catch(e){B(`WebGLState:`,e)}}function Ne(){try{e.texImage3D(...arguments)}catch(e){B(`WebGLState:`,e)}}function Pe(t){return d[t]===void 0?e.getParameter(t):d[t]}function Fe(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function L(t){oe.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),oe.copy(t))}function Ie(t){se.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),se.copy(t))}function R(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),r.set(t,i))}function Le(t,n){let r=l.get(n).get(t);c.get(n)!==r&&(e.uniformBlockBinding(n,r,t.__bindingPointIndex),c.set(n,r))}function Re(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},N=null,re={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new K(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,oe.set(0,0,e.canvas.width,e.canvas.height),se.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:P,disable:ue,bindFramebuffer:F,drawBuffers:de,useProgram:fe,setBlending:he,setMaterial:ge,setFlipSided:_e,setCullFace:ve,setLineWidth:ye,setPolygonOffset:be,setScissorTest:xe,activeTexture:Se,bindTexture:Ce,unbindTexture:we,compressedTexImage2D:Te,compressedTexImage3D:Ee,texImage2D:I,texImage3D:Ne,pixelStorei:Fe,getParameter:Pe,updateUBOMapping:R,uniformBlockBinding:Le,texStorage2D:je,texStorage3D:Me,texSubImage2D:De,texSubImage3D:Oe,compressedTexSubImage2D:ke,compressedTexSubImage3D:Ae,scissor:L,viewport:Ie,reset:Re}}function au(e,t,n,r,p,m,h){let g=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,_=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),v=new H,y=new WeakMap,b=new Set,x,S=new WeakMap,C=!1;try{C=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function w(e,t){return C?new OffscreenCanvas(e,t):Ze(`canvas`)}function T(e,t,n){let r=1,i=Pe(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1)if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);x===void 0&&(x=w(n,a));let o=t?w(n,a):x;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),z(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}else return`data`in e&&z(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e;return e}function E(e){return e.generateMipmaps}function D(t){e.generateMipmap(t)}function O(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function k(n,r,i,a,o,s=!1){if(n!==null){if(e[n]!==void 0)return e[n];z(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let c;a&&(c=t.get(`EXT_texture_norm16`),c||z(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=r;if(r===e.RED&&(i===e.FLOAT&&(l=e.R32F),i===e.HALF_FLOAT&&(l=e.R16F),i===e.UNSIGNED_BYTE&&(l=e.R8),i===e.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===e.SHORT&&c&&(l=c.R16_SNORM_EXT)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.R8UI),i===e.UNSIGNED_SHORT&&(l=e.R16UI),i===e.UNSIGNED_INT&&(l=e.R32UI),i===e.BYTE&&(l=e.R8I),i===e.SHORT&&(l=e.R16I),i===e.INT&&(l=e.R32I)),r===e.RG&&(i===e.FLOAT&&(l=e.RG32F),i===e.HALF_FLOAT&&(l=e.RG16F),i===e.UNSIGNED_BYTE&&(l=e.RG8),i===e.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===e.SHORT&&c&&(l=c.RG16_SNORM_EXT)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RG8UI),i===e.UNSIGNED_SHORT&&(l=e.RG16UI),i===e.UNSIGNED_INT&&(l=e.RG32UI),i===e.BYTE&&(l=e.RG8I),i===e.SHORT&&(l=e.RG16I),i===e.INT&&(l=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGB8UI),i===e.UNSIGNED_SHORT&&(l=e.RGB16UI),i===e.UNSIGNED_INT&&(l=e.RGB32UI),i===e.BYTE&&(l=e.RGB8I),i===e.SHORT&&(l=e.RGB16I),i===e.INT&&(l=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(l=e.RGBA16UI),i===e.UNSIGNED_INT&&(l=e.RGBA32UI),i===e.BYTE&&(l=e.RGBA8I),i===e.SHORT&&(l=e.RGBA16I),i===e.INT&&(l=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===e.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===e.UNSIGNED_INT_5_9_9_9_REV&&(l=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(l=e.R11F_G11F_B10F)),r===e.RGBA){let t=s?Ue:Bt.getTransfer(o);i===e.FLOAT&&(l=e.RGBA32F),i===e.HALF_FLOAT&&(l=e.RGBA16F),i===e.UNSIGNED_BYTE&&(l=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===e.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===e.UNSIGNED_SHORT_4_4_4_4&&(l=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(l=e.RGB5_A1)}return(l===e.R16F||l===e.R32F||l===e.RG16F||l===e.RG32F||l===e.RGBA16F||l===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),l}function j(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,z(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function ee(e,t){return E(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps!==void 0&&e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function M(e){let t=e.target;t.removeEventListener(`dispose`,M),ne(t),t.isVideoTexture&&y.delete(t),t.isHTMLTexture&&b.delete(t)}function te(e){let t=e.target;t.removeEventListener(`dispose`,te),re(t)}function ne(e){let t=r.get(e);if(t.__webglInit===void 0)return;let n=e.source,i=S.get(n);if(i){let r=i[t.__cacheKey];r.usedTimes--,r.usedTimes===0&&N(e),Object.keys(i).length===0&&S.delete(n)}r.remove(e)}function N(t){let n=r.get(t);e.deleteTexture(n.__webglTexture);let i=t.source,a=S.get(i);delete a[n.__cacheKey],h.memory.textures--}function re(t){let n=r.get(t);if(t.depthTexture&&(t.depthTexture.dispose(),r.remove(t.depthTexture)),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let i=t.textures;for(let t=0,n=i.length;t<n;t++){let n=r.get(i[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),h.memory.textures--),r.remove(i[t])}r.remove(t)}let ie=0;function ae(){ie=0}function oe(){return ie}function se(e){ie=e}function ce(){let e=ie;return e>=p.maxTextures&&z(`WebGLTextures: Trying to use `+e+` texture units while this GPU supports only `+p.maxTextures),ie+=1,e}function le(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function P(t,i){let a=r.get(t);if(t.isVideoTexture&&I(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)z(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)z(`WebGLRenderer: Texture marked for update but image is incomplete`);else{ye(a,t,i);return}}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+i)}function ue(t,i){let a=r.get(t);if(t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version){ye(a,t,i);return}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+i)}function F(t,i){let a=r.get(t);if(t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version){ye(a,t,i);return}n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+i)}function de(t,i){let a=r.get(t);if(t.isCubeDepthTexture!==!0&&t.version>0&&a.__version!==t.version){be(a,t,i);return}n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+i)}let fe={[i]:e.REPEAT,[a]:e.CLAMP_TO_EDGE,[o]:e.MIRRORED_REPEAT},pe={[s]:e.NEAREST,[c]:e.NEAREST_MIPMAP_NEAREST,[l]:e.NEAREST_MIPMAP_LINEAR,[u]:e.LINEAR,[d]:e.LINEAR_MIPMAP_NEAREST,[f]:e.LINEAR_MIPMAP_LINEAR},me={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function he(n,i){if(i.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(i.magFilter===1006||i.magFilter===1007||i.magFilter===1005||i.magFilter===1008||i.minFilter===1006||i.minFilter===1007||i.minFilter===1005||i.minFilter===1008)&&z(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,fe[i.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,fe[i.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,fe[i.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,pe[i.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,pe[i.minFilter]),i.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,me[i.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(i.magFilter===1003||i.minFilter!==1005&&i.minFilter!==1008||i.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(i.anisotropy>1||r.get(i).__currentAnisotropy){let a=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,a.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(i.anisotropy,p.getMaxAnisotropy())),r.get(i).__currentAnisotropy=i.anisotropy}}}function ge(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,M));let i=n.source,a=S.get(i);a===void 0&&(a={},S.set(i,a));let o=le(n);if(o!==t.__cacheKey){a[o]===void 0&&(a[o]={texture:e.createTexture(),usedTimes:0},h.memory.textures++,r=!0),a[o].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&N(n)),t.__cacheKey=o,t.__webglTexture=a[o].texture}return r}function _e(e,t,n){return Math.floor(Math.floor(e/n)/t)}function ve(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=_e(n.start,r.width,4),c=_e(t.start,r.width,4);n.start<=i+1&&a===c&&_e(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=n.getParameter(e.UNPACK_ROW_LENGTH),l=n.getParameter(e.UNPACK_SKIP_PIXELS),u=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;n.pixelStorei(e.UNPACK_SKIP_PIXELS,u),n.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,c),n.pixelStorei(e.UNPACK_SKIP_PIXELS,l),n.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function ye(t,i,a){let o=e.TEXTURE_2D;(i.isDataArrayTexture||i.isCompressedArrayTexture)&&(o=e.TEXTURE_2D_ARRAY),i.isData3DTexture&&(o=e.TEXTURE_3D);let s=ge(t,i),c=i.source;n.bindTexture(o,t.__webglTexture,e.TEXTURE0+a);let l=r.get(c);if(c.version!==l.__version||s===!0){if(n.activeTexture(e.TEXTURE0+a),!(typeof ImageBitmap<`u`&&i.image instanceof ImageBitmap)){let t=Bt.getPrimaries(Bt.workingColorSpace),r=i.colorSpace===``?null:Bt.getPrimaries(i.colorSpace),a=i.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,i.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,i.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,a)}n.pixelStorei(e.UNPACK_ALIGNMENT,i.unpackAlignment);let t=T(i.image,!1,p.maxTextureSize);t=Ne(i,t);let r=m.convert(i.format,i.colorSpace),u=m.convert(i.type),d=k(i.internalFormat,r,u,i.normalized,i.colorSpace,i.isVideoTexture);he(o,i);let f,h=i.mipmaps,g=i.isVideoTexture!==!0,_=l.__version===void 0||s===!0,v=c.dataReady,y=ee(i,t);if(i.isDepthTexture)d=j(i.format===A,i.type),_&&(g?n.texStorage2D(e.TEXTURE_2D,1,d,t.width,t.height):n.texImage2D(e.TEXTURE_2D,0,d,t.width,t.height,0,r,u,null));else if(i.isDataTexture)if(h.length>0){g&&_&&n.texStorage2D(e.TEXTURE_2D,y,d,h[0].width,h[0].height);for(let t=0,i=h.length;t<i;t++)f=h[t],g?v&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,f.width,f.height,r,u,f.data):n.texImage2D(e.TEXTURE_2D,t,d,f.width,f.height,0,r,u,f.data);i.generateMipmaps=!1}else g?(_&&n.texStorage2D(e.TEXTURE_2D,y,d,t.width,t.height),v&&ve(i,t,r,u)):n.texImage2D(e.TEXTURE_2D,0,d,t.width,t.height,0,r,u,t.data);else if(i.isCompressedTexture)if(i.isCompressedArrayTexture){g&&_&&n.texStorage3D(e.TEXTURE_2D_ARRAY,y,d,h[0].width,h[0].height,t.depth);for(let a=0,o=h.length;a<o;a++)if(f=h[a],i.format!==1023)if(r!==null)if(g){if(v)if(i.layerUpdates.size>0){let t=es(f.width,f.height,i.format,i.type);for(let o of i.layerUpdates){let i=f.data.subarray(o*t/f.data.BYTES_PER_ELEMENT,(o+1)*t/f.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,a,0,0,o,f.width,f.height,1,r,i)}i.clearLayerUpdates()}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,a,0,0,0,f.width,f.height,t.depth,r,f.data)}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,a,d,f.width,f.height,t.depth,0,f.data,0,0);else z(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`);else g?v&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,a,0,0,0,f.width,f.height,t.depth,r,u,f.data):n.texImage3D(e.TEXTURE_2D_ARRAY,a,d,f.width,f.height,t.depth,0,r,u,f.data)}else{g&&_&&n.texStorage2D(e.TEXTURE_2D,y,d,h[0].width,h[0].height);for(let t=0,a=h.length;t<a;t++)f=h[t],i.format===1023?g?v&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,f.width,f.height,r,u,f.data):n.texImage2D(e.TEXTURE_2D,t,d,f.width,f.height,0,r,u,f.data):r===null?z(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):g?v&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,f.width,f.height,r,f.data):n.compressedTexImage2D(e.TEXTURE_2D,t,d,f.width,f.height,0,f.data)}else if(i.isDataArrayTexture)if(g){if(_&&n.texStorage3D(e.TEXTURE_2D_ARRAY,y,d,t.width,t.height,t.depth),v)if(i.layerUpdates.size>0){let a=es(t.width,t.height,i.format,i.type);for(let o of i.layerUpdates){let i=t.data.subarray(o*a/t.data.BYTES_PER_ELEMENT,(o+1)*a/t.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,o,t.width,t.height,1,r,u,i)}i.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,t.width,t.height,t.depth,r,u,t.data)}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,d,t.width,t.height,t.depth,0,r,u,t.data);else if(i.isData3DTexture)g?(_&&n.texStorage3D(e.TEXTURE_3D,y,d,t.width,t.height,t.depth),v&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,t.width,t.height,t.depth,r,u,t.data)):n.texImage3D(e.TEXTURE_3D,0,d,t.width,t.height,t.depth,0,r,u,t.data);else if(i.isFramebufferTexture){if(_)if(g)n.texStorage2D(e.TEXTURE_2D,y,d,t.width,t.height);else{let i=t.width,a=t.height;for(let t=0;t<y;t++)n.texImage2D(e.TEXTURE_2D,t,d,i,a,0,r,u,null),i>>=1,a>>=1}}else if(i.isHTMLTexture){if(`texElementImage2D`in e){let n=e.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),t.parentNode!==n){n.appendChild(t),b.add(i),n.onpaint=e=>{let t=e.changedElements;for(let e of b)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(e.texElementImage2D.length===3)e.texElementImage2D(e.TEXTURE_2D,e.RGBA8,t);else{let n=e.RGBA,r=e.RGBA,i=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,0,n,r,i,t)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(h.length>0){if(g&&_){let t=Pe(h[0]);n.texStorage2D(e.TEXTURE_2D,y,d,t.width,t.height)}for(let t=0,i=h.length;t<i;t++)f=h[t],g?v&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,r,u,f):n.texImage2D(e.TEXTURE_2D,t,d,r,u,f);i.generateMipmaps=!1}else if(g){if(_){let r=Pe(t);n.texStorage2D(e.TEXTURE_2D,y,d,r.width,r.height)}v&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,r,u,t)}else n.texImage2D(e.TEXTURE_2D,0,d,r,u,t);E(i)&&D(o),l.__version=c.version,i.onUpdate&&i.onUpdate(i)}t.__version=i.version}function be(t,i,a){if(i.image.length!==6)return;let o=ge(t,i),s=i.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+a);let c=r.get(s);if(s.version!==c.__version||o===!0){n.activeTexture(e.TEXTURE0+a);let t=Bt.getPrimaries(Bt.workingColorSpace),r=i.colorSpace===``?null:Bt.getPrimaries(i.colorSpace),l=i.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,i.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,i.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,i.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,l);let u=i.isCompressedTexture||i.image[0].isCompressedTexture,d=i.image[0]&&i.image[0].isDataTexture,f=[];for(let e=0;e<6;e++)!u&&!d?f[e]=T(i.image[e],!0,p.maxCubemapSize):f[e]=d?i.image[e].image:i.image[e],f[e]=Ne(i,f[e]);let h=f[0],g=m.convert(i.format,i.colorSpace),_=m.convert(i.type),v=k(i.internalFormat,g,_,i.normalized,i.colorSpace),y=i.isVideoTexture!==!0,b=c.__version===void 0||o===!0,x=s.dataReady,S=ee(i,h);he(e.TEXTURE_CUBE_MAP,i);let C;if(u){y&&b&&n.texStorage2D(e.TEXTURE_CUBE_MAP,S,v,h.width,h.height);for(let t=0;t<6;t++){C=f[t].mipmaps;for(let r=0;r<C.length;r++){let a=C[r];i.format===1023?y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,a.width,a.height,g,_,a.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,v,a.width,a.height,0,g,_,a.data):g===null?z(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):y?x&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,a.width,a.height,g,a.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,v,a.width,a.height,0,a.data)}}}else{if(C=i.mipmaps,y&&b){C.length>0&&S++;let t=Pe(f[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,S,v,t.width,t.height)}for(let t=0;t<6;t++)if(d){y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,f[t].width,f[t].height,g,_,f[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,f[t].width,f[t].height,0,g,_,f[t].data);for(let r=0;r<C.length;r++){let i=C[r].image[t].image;y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,v,i.width,i.height,0,g,_,i.data)}}else{y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,g,_,f[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,g,_,f[t]);for(let r=0;r<C.length;r++){let i=C[r];y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,g,_,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,v,g,_,i.image[t])}}}E(i)&&D(e.TEXTURE_CUBE_MAP),c.__version=s.version,i.onUpdate&&i.onUpdate(i)}t.__version=i.version}function xe(t,i,a,o,s,c){let l=m.convert(a.format,a.colorSpace),u=m.convert(a.type),d=k(a.internalFormat,l,u,a.normalized,a.colorSpace),f=r.get(i),p=r.get(a);if(p.__renderTarget=i,!f.__hasExternalTextures){let t=Math.max(1,i.width>>c),r=Math.max(1,i.height>>c);s===e.TEXTURE_3D||s===e.TEXTURE_2D_ARRAY?n.texImage3D(s,c,d,t,r,i.depth,0,l,u,null):n.texImage2D(s,c,d,t,r,0,l,u,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),Me(i)?g.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,o,s,p.__webglTexture,0,je(i)):(s===e.TEXTURE_2D||s>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&s<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,o,s,p.__webglTexture,c),n.bindFramebuffer(e.FRAMEBUFFER,null)}function Se(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=j(n.stencilBuffer,a),s=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;Me(n)?g.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,je(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,je(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,s,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let a=t[i],o=m.convert(a.format,a.colorSpace),s=m.convert(a.type),c=k(a.internalFormat,o,s,a.normalized,a.colorSpace);Me(n)?g.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,je(n),c,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,je(n),c,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,c,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function Ce(t,i,a){let o=i.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(i.depthTexture&&i.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let s=r.get(i.depthTexture);if(s.__renderTarget=i,(!s.__webglTexture||i.depthTexture.image.width!==i.width||i.depthTexture.image.height!==i.height)&&(i.depthTexture.image.width=i.width,i.depthTexture.image.height=i.height,i.depthTexture.needsUpdate=!0),o){if(s.__webglInit===void 0&&(s.__webglInit=!0,i.depthTexture.addEventListener(`dispose`,M)),s.__webglTexture===void 0){s.__webglTexture=e.createTexture(),n.bindTexture(e.TEXTURE_CUBE_MAP,s.__webglTexture),he(e.TEXTURE_CUBE_MAP,i.depthTexture);let t=m.convert(i.depthTexture.format),r=m.convert(i.depthTexture.type),a;i.depthTexture.format===1026?a=e.DEPTH_COMPONENT24:i.depthTexture.format===1027&&(a=e.DEPTH24_STENCIL8);for(let n=0;n<6;n++)e.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0,a,i.width,i.height,0,t,r,null)}}else P(i.depthTexture,0);let c=s.__webglTexture,l=je(i),u=o?e.TEXTURE_CUBE_MAP_POSITIVE_X+a:e.TEXTURE_2D,d=i.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(i.depthTexture.format===1026)Me(i)?g.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,d,u,c,0,l):e.framebufferTexture2D(e.FRAMEBUFFER,d,u,c,0);else if(i.depthTexture.format===1027)Me(i)?g.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,d,u,c,0,l):e.framebufferTexture2D(e.FRAMEBUFFER,d,u,c,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function we(t){let i=r.get(t),a=t.isWebGLCubeRenderTarget===!0;if(i.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(i.__depthDisposeCallback&&i.__depthDisposeCallback(),e){let t=()=>{delete i.__boundDepthTexture,delete i.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),i.__depthDisposeCallback=t}i.__boundDepthTexture=e}if(t.depthTexture&&!i.__autoAllocateDepthBuffer)if(a)for(let e=0;e<6;e++)Ce(i.__webglFramebuffer[e],t,e);else{let e=t.texture.mipmaps;e&&e.length>0?Ce(i.__webglFramebuffer[0],t,0):Ce(i.__webglFramebuffer,t,0)}else if(a){i.__webglDepthbuffer=[];for(let r=0;r<6;r++)if(n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[r]),i.__webglDepthbuffer[r]===void 0)i.__webglDepthbuffer[r]=e.createRenderbuffer(),Se(i.__webglDepthbuffer[r],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=i.__webglDepthbuffer[r];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else{let r=t.texture.mipmaps;if(r&&r.length>0?n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer),i.__webglDepthbuffer===void 0)i.__webglDepthbuffer=e.createRenderbuffer(),Se(i.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,r=i.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,r),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,r)}}n.bindFramebuffer(e.FRAMEBUFFER,null)}function Te(t,n,i){let a=r.get(t);n!==void 0&&xe(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),i!==void 0&&we(t)}function Ee(t){let i=t.texture,a=r.get(t),o=r.get(i);t.addEventListener(`dispose`,te);let s=t.textures,c=t.isWebGLCubeRenderTarget===!0,l=s.length>1;if(l||(o.__webglTexture===void 0&&(o.__webglTexture=e.createTexture()),o.__version=i.version,h.memory.textures++),c){a.__webglFramebuffer=[];for(let t=0;t<6;t++)if(i.mipmaps&&i.mipmaps.length>0){a.__webglFramebuffer[t]=[];for(let n=0;n<i.mipmaps.length;n++)a.__webglFramebuffer[t][n]=e.createFramebuffer()}else a.__webglFramebuffer[t]=e.createFramebuffer()}else{if(i.mipmaps&&i.mipmaps.length>0){a.__webglFramebuffer=[];for(let t=0;t<i.mipmaps.length;t++)a.__webglFramebuffer[t]=e.createFramebuffer()}else a.__webglFramebuffer=e.createFramebuffer();if(l)for(let t=0,n=s.length;t<n;t++){let n=r.get(s[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),h.memory.textures++)}if(t.samples>0&&Me(t)===!1){a.__webglMultisampledFramebuffer=e.createFramebuffer(),a.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,a.__webglMultisampledFramebuffer);for(let n=0;n<s.length;n++){let r=s[n];a.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,a.__webglColorRenderbuffer[n]);let i=m.convert(r.format,r.colorSpace),o=m.convert(r.type),c=k(r.internalFormat,i,o,r.normalized,r.colorSpace,t.isXRRenderTarget===!0),l=je(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,l,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,a.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(a.__webglDepthRenderbuffer=e.createRenderbuffer(),Se(a.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(c){n.bindTexture(e.TEXTURE_CUBE_MAP,o.__webglTexture),he(e.TEXTURE_CUBE_MAP,i);for(let n=0;n<6;n++)if(i.mipmaps&&i.mipmaps.length>0)for(let r=0;r<i.mipmaps.length;r++)xe(a.__webglFramebuffer[n][r],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,r);else xe(a.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);E(i)&&D(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(l){for(let i=0,o=s.length;i<o;i++){let o=s[i],c=r.get(o),l=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(l=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(l,c.__webglTexture),he(l,o),xe(a.__webglFramebuffer,t,o,e.COLOR_ATTACHMENT0+i,l,0),E(o)&&D(l)}n.unbindTexture()}else{let r=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(r=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(r,o.__webglTexture),he(r,i),i.mipmaps&&i.mipmaps.length>0)for(let n=0;n<i.mipmaps.length;n++)xe(a.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,r,n);else xe(a.__webglFramebuffer,t,i,e.COLOR_ATTACHMENT0,r,0);E(i)&&D(r),n.unbindTexture()}t.depthBuffer&&we(t)}function De(e){let t=e.textures;for(let i=0,a=t.length;i<a;i++){let a=t[i];if(E(a)){let t=O(e),i=r.get(a).__webglTexture;n.bindTexture(t,i),D(t),n.unbindTexture()}}}let Oe=[],ke=[];function Ae(t){if(t.samples>0){if(Me(t)===!1){let i=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,c=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,l=r.get(t),u=i.length>1;if(u)for(let t=0;t<i.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,l.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,l.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,l.__webglMultisampledFramebuffer);let d=t.texture.mipmaps;d&&d.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,l.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,l.__webglFramebuffer);for(let n=0;n<i.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(s|=e.STENCIL_BUFFER_BIT)),u){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,l.__webglColorRenderbuffer[n]);let t=r.get(i[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),_===!0&&(Oe.length=0,ke.length=0,Oe.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.resolveDepthBuffer===!1&&(Oe.push(c),ke.push(c),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,ke)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,Oe))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),u)for(let t=0;t<i.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,l.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,l.__webglColorRenderbuffer[t]);let a=r.get(i[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,l.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,l.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.resolveDepthBuffer===!1&&_){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function je(e){return Math.min(p.maxSamples,e.samples)}function Me(e){let n=r.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function I(e){let t=h.render.frame;y.get(e)!==t&&(y.set(e,t),e.update())}function Ne(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(Bt.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&z(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):B(`WebGLTextures: Unsupported texture color space:`,n)),t}function Pe(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(v.width=e.naturalWidth||e.width,v.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(v.width=e.displayWidth,v.height=e.displayHeight):(v.width=e.width,v.height=e.height),v}this.allocateTextureUnit=ce,this.resetTextureUnits=ae,this.getTextureUnits=oe,this.setTextureUnits=se,this.setTexture2D=P,this.setTexture2DArray=ue,this.setTexture3D=F,this.setTextureCube=de,this.rebindTextures=Te,this.setupRenderTarget=Ee,this.updateRenderTargetMipmap=De,this.updateMultisampleRenderTarget=Ae,this.setupDepthRenderbuffer=we,this.setupFrameBufferTexture=xe,this.useMultisampledRTT=Me,this.isReversedDepthBuffer=function(){return n.buffers.depth.getReversed()}}function ou(e,t){function n(n,r=``){let i,a=Bt.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779)if(a===`srgb`)if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===35840||n===35841||n===35842||n===35843)if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491)if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821)if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===36492||n===36494||n===36495)if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===36283||n===36284||n===36285||n===36286)if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var su=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,cu=`
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

}`,lu=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Vi(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new Ra({vertexShader:su,fragmentShader:cu,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new J(new wa(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},uu=class extends ot{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,l=null,u=null,d=null,f=null,m=null,h=typeof XRWebGLBinding<`u`,g=new lu,_={},y=t.getContextAttributes(),b=null,x=null,S=[],w=[],T=new H,E=null,D=new Eo;D.viewport=new Zt;let j=new Eo;j.viewport=new Zt;let ee=[D,j],M=new Fo,te=null,ne=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=S[e];return t===void 0&&(t=new Mn,S[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=S[e];return t===void 0&&(t=new Mn,S[e]=t),t.getGripSpace()},this.getHand=function(e){let t=S[e];return t===void 0&&(t=new Mn,S[e]=t),t.getHandSpace()};function N(e){let t=w.indexOf(e.inputSource);if(t===-1)return;let n=S[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function re(){r.removeEventListener(`select`,N),r.removeEventListener(`selectstart`,N),r.removeEventListener(`selectend`,N),r.removeEventListener(`squeeze`,N),r.removeEventListener(`squeezestart`,N),r.removeEventListener(`squeezeend`,N),r.removeEventListener(`end`,re),r.removeEventListener(`inputsourceschange`,ie);for(let e=0;e<S.length;e++){let t=w[e];t!==null&&(w[e]=null,S[e].disconnect(t))}te=null,ne=null,g.reset();for(let e in _)delete _[e];e.setRenderTarget(b),f=null,d=null,u=null,r=null,x=null,F.stop(),n.isPresenting=!1,e.setPixelRatio(E),e.setSize(T.width,T.height,!1),n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&z(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&z(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return d===null?f:d},this.getBinding=function(){return u===null&&h&&(u=new XRWebGLBinding(r,t)),u},this.getFrame=function(){return m},this.getSession=function(){return r},this.setSession=async function(l){if(r=l,r!==null){if(b=e.getRenderTarget(),r.addEventListener(`select`,N),r.addEventListener(`selectstart`,N),r.addEventListener(`selectend`,N),r.addEventListener(`squeeze`,N),r.addEventListener(`squeezestart`,N),r.addEventListener(`squeezeend`,N),r.addEventListener(`end`,re),r.addEventListener(`inputsourceschange`,ie),y.xrCompatible!==!0&&await t.makeXRCompatible(),E=e.getPixelRatio(),e.getSize(T),h&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;y.depth&&(o=y.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=y.stencil?A:k,a=y.stencil?C:v);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};u=this.getBinding(),d=u.createProjectionLayer(s),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),x=new $t(d.textureWidth,d.textureHeight,{format:O,type:p,depthTexture:new zi(d.textureWidth,d.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:y.stencil,colorSpace:e.outputColorSpace,samples:y.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{let n={antialias:y.antialias,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:i};f=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),x=new $t(f.framebufferWidth,f.framebufferHeight,{format:O,type:p,colorSpace:e.outputColorSpace,stencilBuffer:y.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}x.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),F.setContext(r),F.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function ie(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=w.indexOf(n);r>=0&&(w[r]=null,S[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=w.indexOf(n);if(r===-1){for(let e=0;e<S.length;e++)if(e>=w.length){w.push(n),r=e;break}else if(w[e]===null){w[e]=n,r=e;break}if(r===-1)break}let i=S[r];i&&i.connect(n)}}let ae=new U,oe=new U;function se(e,t,n){ae.setFromMatrixPosition(t.matrixWorld),oe.setFromMatrixPosition(n.matrixWorld);let r=ae.distanceTo(oe),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;if(t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert(),i[10]===-1)e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse);else{let t=o+m,n=s+m,i=f-h,a=p+(r-h),u=c*s/n*t,d=l*s/n*t;e.projectionMatrix.makePerspective(i,a,u,d,t,n),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}}function ce(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;g.texture!==null&&(g.depthNear>0&&(t=g.depthNear),g.depthFar>0&&(n=g.depthFar)),M.near=j.near=D.near=t,M.far=j.far=D.far=n,(te!==M.near||ne!==M.far)&&(r.updateRenderState({depthNear:M.near,depthFar:M.far}),te=M.near,ne=M.far),M.layers.mask=e.layers.mask|6,D.layers.mask=M.layers.mask&-5,j.layers.mask=M.layers.mask&-3;let i=e.parent,a=M.cameras;ce(M,i);for(let e=0;e<a.length;e++)ce(a[e],i);a.length===2?se(M,D,j):M.projectionMatrix.copy(D.projectionMatrix),le(e,M,i)};function le(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=ut*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return M},this.getFoveation=function(){if(!(d===null&&f===null))return s},this.setFoveation=function(e){s=e,d!==null&&(d.fixedFoveation=e),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=e)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(M)},this.getCameraTexture=function(e){return _[e]};let P=null;function ue(t,i){if(l=i.getViewerPose(c||a),m=i,l!==null){let t=l.views;f!==null&&(e.setRenderTargetFramebuffer(x,f.framebuffer),e.setRenderTarget(x));let i=!1;t.length!==M.cameras.length&&(M.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(f!==null)a=f.getViewport(r);else{let t=u.getViewSubImage(d,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(x,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(x))}let o=ee[n];o===void 0&&(o=new Eo,o.layers.enable(n),o.viewport=new Zt,ee[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(M.matrix.copy(o.matrix),M.matrix.decompose(M.position,M.quaternion,M.scale)),i===!0&&M.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&h){u=n.getBinding();let e=u.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&g.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&h){e.state.unbindTexture(),u=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=_[n];e||(e=new Vi,_[n]=e);let t=u.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<S.length;e++){let t=w[e],n=S[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}P&&P(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),m=null}let F=new ns;F.setAnimationLoop(ue),this.setAnimationLoop=function(e){P=e},this.dispose=function(){}}},du=new nn,fu=new W;fu.set(-1,0,0,0,1,0,0,0,1);function pu(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,Pa(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(du.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(fu),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessRange[0],e.iridescenceThicknessMaximum.value=t.iridescenceThicknessRange[1],t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function mu(e,t,n,r){let i={},a={},o=[],s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(e,t){let n=t.program;r.uniformBlockBinding(e,n)}function l(e,n){let o=i[e.id];o===void 0&&(g(e),o=u(e),i[e.id]=o,e.addEventListener(`dispose`,v));let s=n.program;r.updateUBOMapping(e,s);let c=t.render.frame;a[e.id]!==c&&(f(e),a[e.id]=c)}function u(t){let n=d();t.__bindingPointIndex=n;let r=e.createBuffer(),i=t.__size,a=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,r),e.bufferData(e.UNIFORM_BUFFER,i,a),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,n,r),r}function d(){for(let e=0;e<s;e++)if(o.indexOf(e)===-1)return o.push(e),e;return B(`WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.`),0}function f(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)p(t[n],e,n,a);else p(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(t,n,r,i){if(h(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=_(i);m(i,t.__data,e),typeof i!=`number`&&typeof i!=`boolean`&&!i.isMatrix3&&!ArrayBuffer.isView(i)&&(e+=a.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function m(e,t,n){typeof e==`number`||typeof e==`boolean`?t[0]=e:e.isMatrix3?(t[0]=e.elements[0],t[1]=e.elements[1],t[2]=e.elements[2],t[3]=0,t[4]=e.elements[3],t[5]=e.elements[4],t[6]=e.elements[5],t[7]=0,t[8]=e.elements[6],t[9]=e.elements[7],t[10]=e.elements[8],t[11]=0):ArrayBuffer.isView(e)?t.set(new e.constructor(e.buffer,e.byteOffset,t.length)):e.toArray(t,n)}function h(e,t,n,r){let i=e.value,a=t+`_`+n;if(r[a]===void 0)return typeof i==`number`||typeof i==`boolean`?r[a]=i:ArrayBuffer.isView(i)?r[a]=i.slice():r[a]=i.clone(),!0;{let e=r[a];if(typeof i==`number`||typeof i==`boolean`){if(e!==i)return r[a]=i,!0}else if(ArrayBuffer.isView(i))return!0;else if(e.equals(i)===!1)return e.copy(i),!0}return!1}function g(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let e=0,t=r.length;e<t;e++){let t=r[e],i=Array.isArray(t.value)?t.value:[t.value];for(let e=0,r=i.length;e<r;e++){let r=i[e],a=_(r),o=n%16,s=o%a.boundary,c=o+s;n+=s,c!==0&&16-c<a.storage&&(n+=16-c),t.__data=new Float32Array(a.storage/Float32Array.BYTES_PER_ELEMENT),t.__offset=n,n+=a.storage}}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function _(e){let t={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(t.boundary=4,t.storage=4):e.isVector2?(t.boundary=8,t.storage=8):e.isVector3||e.isColor?(t.boundary=16,t.storage=12):e.isVector4?(t.boundary=16,t.storage=16):e.isMatrix3?(t.boundary=48,t.storage=48):e.isMatrix4?(t.boundary=64,t.storage=64):e.isTexture?z(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(t.boundary=16,t.storage=e.byteLength):z(`WebGLRenderer: Unsupported uniform value type.`,e),t}function v(t){let n=t.target;n.removeEventListener(`dispose`,v);let r=o.indexOf(n.__bindingPointIndex);o.splice(r,1),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function y(){for(let t in i)e.deleteBuffer(i[t]);o=[],i={},a={}}return{bind:c,update:l,dispose:y}}var hu=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),gu=null;function _u(){return gu===null&&(gu=new ri(hu,16,16,M,b),gu.name=`DFG_LUT`,gu.minFilter=u,gu.magFilter=u,gu.wrapS=a,gu.wrapT=a,gu.generateMipmaps=!1,gu.needsUpdate=!0),gu}var vu=class{constructor(e={}){let{canvas:t=Qe(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:c=!1,powerPreference:l=`default`,failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:m=p}=e;this.isWebGLRenderer=!0;let h;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);h=n.getContextAttributes().alpha}else h=a;let _=m,y=new Set([ne,te,ee]),w=new Set([p,v,g,C,x,S]),T=new Uint32Array(4),E=new Int32Array(4),D=new U,O=null,k=null,A=[],j=[],M=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let N=this,re=!1,ie=null,ae=null,oe=null,se=null;this._outputColorSpace=Ve;let ce=0,le=0,P=null,ue=-1,F=null,de=new Zt,fe=new Zt,pe=null,me=new K(0),he=0,ge=t.width,_e=t.height,ve=1,ye=null,be=null,xe=new Zt(0,0,ge,_e),Se=new Zt(0,0,ge,_e),Ce=!1,we=new yi,Te=!1,Ee=!1,De=new nn,Oe=new U,ke=new Zt,Ae={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},je=!1;function Me(){return P===null?ve:1}let I=n;function Ne(e,n){return t.getContext(e,n)}try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r185`),t.addEventListener(`webglcontextlost`,ct,!1),t.addEventListener(`webglcontextrestored`,lt,!1),t.addEventListener(`webglcontextcreationerror`,ut,!1),I===null){let t=`webgl2`;if(I=Ne(t,e),I===null)throw Ne(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}}catch(e){throw B(`WebGLRenderer: `+e.message),e}let Pe,Fe,L,Ie,R,Le,Re,ze,Be,He,Ue,We,Ge,Ke,qe,Ye,Xe,Ze,$e,et,nt,rt,at;function ot(){Pe=new Is(I),Pe.init(),nt=new ou(I,Pe),Fe=new fs(I,Pe,e,nt),L=new iu(I,Pe),Fe.reversedDepthBuffer&&d&&L.buffers.depth.setReversed(!0),ae=I.createFramebuffer(),oe=I.createFramebuffer(),se=I.createFramebuffer(),Ie=new zs(I),R=new Rl,Le=new au(I,Pe,L,R,Fe,nt,Ie),Re=new Fs(N),ze=new rs(I),rt=new us(I,ze),Be=new Ls(I,ze,Ie,rt),He=new Vs(I,Be,ze,rt,Ie),Ze=new Bs(I,Fe,Le),qe=new ps(R),Ue=new Ll(N,Re,Pe,Fe,rt,qe),We=new pu(N,R),Ge=new Hl,Ke=new Yl(Pe),Xe=new ls(N,Re,L,He,h,s),Ye=new ru(N,He,Fe),at=new mu(I,Ie,Fe,L),$e=new ds(I,Pe,Ie),et=new Rs(I,Pe,Ie),Ie.programs=Ue.programs,N.capabilities=Fe,N.extensions=Pe,N.properties=R,N.renderLists=Ge,N.shadowMap=Ye,N.state=L,N.info=Ie}ot(),_!==1009&&(M=new Us(_,t.width,t.height,o,r,i));let st=new uu(N,I);this.xr=st,this.getContext=function(){return I},this.getContextAttributes=function(){return I.getContextAttributes()},this.forceContextLoss=function(){let e=Pe.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=Pe.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return ve},this.setPixelRatio=function(e){e!==void 0&&(ve=e,this.setSize(ge,_e,!1))},this.getSize=function(e){return e.set(ge,_e)},this.setSize=function(e,n,r=!0){if(st.isPresenting){z(`WebGLRenderer: Can't change size while VR device is presenting.`);return}ge=e,_e=n,t.width=Math.floor(e*ve),t.height=Math.floor(n*ve),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),M!==null&&M.setSize(t.width,t.height),this.setViewport(0,0,e,n)},this.getDrawingBufferSize=function(e){return e.set(ge*ve,_e*ve).floor()},this.setDrawingBufferSize=function(e,n,r){ge=e,_e=n,ve=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(_===1009){B(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);return}if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){z(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}M.setEffects(e||[])},this.getCurrentViewport=function(e){return e.copy(de)},this.getViewport=function(e){return e.copy(xe)},this.setViewport=function(e,t,n,r){e.isVector4?xe.set(e.x,e.y,e.z,e.w):xe.set(e,t,n,r),L.viewport(de.copy(xe).multiplyScalar(ve).round())},this.getScissor=function(e){return e.copy(Se)},this.setScissor=function(e,t,n,r){e.isVector4?Se.set(e.x,e.y,e.z,e.w):Se.set(e,t,n,r),L.scissor(fe.copy(Se).multiplyScalar(ve).round())},this.getScissorTest=function(){return Ce},this.setScissorTest=function(e){L.setScissorTest(Ce=e)},this.setOpaqueSort=function(e){ye=e},this.setTransparentSort=function(e){be=e},this.getClearColor=function(e){return e.copy(Xe.getClearColor())},this.setClearColor=function(){Xe.setClearColor(...arguments)},this.getClearAlpha=function(){return Xe.getClearAlpha()},this.setClearAlpha=function(){Xe.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(P!==null){let t=P.texture.format;e=y.has(t)}if(e){let e=P.texture.type,t=w.has(e),n=Xe.getClearColor(),r=Xe.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(T[0]=i,T[1]=a,T[2]=o,T[3]=r,I.clearBufferuiv(I.COLOR,0,T)):(E[0]=i,E[1]=a,E[2]=o,E[3]=r,I.clearBufferiv(I.COLOR,0,E))}else r|=I.COLOR_BUFFER_BIT}t&&(r|=I.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=I.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&I.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),ie=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,ct,!1),t.removeEventListener(`webglcontextrestored`,lt,!1),t.removeEventListener(`webglcontextcreationerror`,ut,!1),Xe.dispose(),Ge.dispose(),Ke.dispose(),R.dispose(),Re.dispose(),He.dispose(),rt.dispose(),at.dispose(),Ue.dispose(),st.dispose(),st.removeEventListener(`sessionstart`,gt),st.removeEventListener(`sessionend`,_t),vt.stop()};function ct(e){e.preventDefault(),tt(`WebGLRenderer: Context Lost.`),re=!0}function lt(){tt(`WebGLRenderer: Context Restored.`),re=!1;let e=Ie.autoReset,t=Ye.enabled,n=Ye.autoUpdate,r=Ye.needsUpdate,i=Ye.type;ot(),Ie.autoReset=e,Ye.enabled=t,Ye.autoUpdate=n,Ye.needsUpdate=r,Ye.type=i}function ut(e){B(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function dt(e){let t=e.target;t.removeEventListener(`dispose`,dt),V(t)}function V(e){ft(e),R.remove(e)}function ft(e){let t=R.get(e).programs;t!==void 0&&(t.forEach(function(e){Ue.releaseProgram(e)}),e.isShaderMaterial&&Ue.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=Ae);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=Ot(e,t,n,r,i);L.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Be.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;rt.setup(i,r,s,n,c);let h,g=$e;if(c!==null&&(h=ze.get(c),g=et,g.setIndex(h)),i.isMesh)r.wireframe===!0?(L.setLineWidth(r.wireframeLinewidth*Me()),g.setMode(I.LINES)):g.setMode(I.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),L.setLineWidth(e*Me()),i.isLineSegments?g.setMode(I.LINES):i.isLineLoop?g.setMode(I.LINE_LOOP):g.setMode(I.LINE_STRIP)}else i.isPoints?g.setMode(I.POINTS):i.isSprite&&g.setMode(I.TRIANGLES);if(i.isBatchedMesh)if(Pe.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?ze.get(c).bytesPerElement:1,o=R.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(I,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function pt(e,t,n){e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,wt(e,t,n),e.side=0,e.needsUpdate=!0,wt(e,t,n),e.side=2):wt(e,t,n)}this.compile=function(e,t,n=null){n===null&&(n=e),k=Ke.get(n),k.init(t),j.push(k),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(k.pushLight(e),e.castShadow&&k.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(k.pushLight(e),e.castShadow&&k.pushShadow(e))}),k.setupLights();let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let t=e.material;if(t)if(Array.isArray(t))for(let i=0;i<t.length;i++){let a=t[i];pt(a,n,e),r.add(a)}else pt(t,n,e),r.add(t)}),k=j.pop(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){if(r.forEach(function(e){R.get(e).currentProgram.isReady()&&r.delete(e)}),r.size===0){t(e);return}setTimeout(n,10)}Pe.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let mt=null;function ht(e){mt&&mt(e)}function gt(){vt.stop()}function _t(){vt.start()}let vt=new ns;vt.setAnimationLoop(ht),typeof self<`u`&&vt.setContext(self),this.setAnimationLoop=function(e){mt=e,st.setAnimationLoop(e),e===null?vt.stop():vt.start()},st.addEventListener(`sessionstart`,gt),st.addEventListener(`sessionend`,_t),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){B(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(re===!0)return;ie!==null&&ie.renderStart(e,t);let n=st.enabled===!0&&st.isPresenting===!0,r=M!==null&&(P===null||n)&&M.begin(N,P);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),st.enabled===!0&&st.isPresenting===!0&&(M===null||M.isCompositing()===!1)&&(st.cameraAutoUpdate===!0&&st.updateCamera(t),t=st.getCamera()),e.isScene===!0&&e.onBeforeRender(N,e,t,P),k=Ke.get(e,j.length),k.init(t),k.state.textureUnits=Le.getTextureUnits(),j.push(k),De.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),we.setFromProjectionMatrix(De,Je,t.reversedDepth),Ee=this.localClippingEnabled,Te=qe.init(this.clippingPlanes,Ee),O=Ge.get(e,A.length),O.init(),A.push(O),st.enabled===!0&&st.isPresenting===!0){let e=N.xr.getDepthSensingMesh();e!==null&&yt(e,t,-1/0,N.sortObjects)}yt(e,t,0,N.sortObjects),O.finish(),N.sortObjects===!0&&O.sort(ye,be,t.reversedDepth),je=st.enabled===!1||st.isPresenting===!1||st.hasDepthSensing()===!1,je&&Xe.addToRenderList(O,e),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Te===!0&&qe.beginShadows();let i=k.state.shadowsArray;if(Ye.render(i,e,t),Te===!0&&qe.endShadows(),(r&&M.hasRenderPass())===!1){let n=O.opaque,r=O.transmissive;if(k.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];xt(n,r,e,a)}je&&Xe.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];bt(O,e,n,n.viewport)}}else r.length>0&&xt(n,r,e,t),je&&Xe.render(e),bt(O,e,t)}P!==null&&le===0&&(Le.updateMultisampleRenderTarget(P),Le.updateRenderTargetMipmap(P)),r&&M.end(N),e.isScene===!0&&e.onAfterRender(N,e,t),rt.resetDefaultState(),ue=-1,F=null,j.pop(),j.length>0?(k=j[j.length-1],Le.setTextureUnits(k.state.textureUnits),Te===!0&&qe.setGlobalState(N.clippingPlanes,k.state.camera)):k=null,A.pop(),O=A.length>0?A[A.length-1]:null,ie!==null&&ie.renderEnd()};function yt(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLightProbeGrid)k.pushLightProbeGrid(e);else if(e.isLight)k.pushLight(e),e.castShadow&&k.pushShadow(e);else if(e.isSprite){if(!e.frustumCulled||we.intersectsSprite(e)){r&&ke.setFromMatrixPosition(e.matrixWorld).applyMatrix4(De);let t=He.update(e),i=e.material;i.visible&&O.push(e,t,i,n,ke.z,null)}}else if((e.isMesh||e.isLine||e.isPoints)&&(!e.frustumCulled||we.intersectsObject(e))){let t=He.update(e),i=e.material;if(r&&(e.boundingSphere===void 0?(t.boundingSphere===null&&t.computeBoundingSphere(),ke.copy(t.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),ke.copy(e.boundingSphere.center)),ke.applyMatrix4(e.matrixWorld).applyMatrix4(De)),Array.isArray(i)){let r=t.groups;for(let a=0,o=r.length;a<o;a++){let o=r[a],s=i[o.materialIndex];s&&s.visible&&O.push(e,t,s,n,ke.z,o)}}else i.visible&&O.push(e,t,i,n,ke.z,null)}}let i=e.children;for(let e=0,a=i.length;e<a;e++)yt(i[e],t,n,r)}function bt(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;k.setupLightsView(n),Te===!0&&qe.setGlobalState(N.clippingPlanes,n),r&&L.viewport(de.copy(r)),i.length>0&&St(i,t,n),a.length>0&&St(a,t,n),o.length>0&&St(o,t,n),L.buffers.depth.setTest(!0),L.buffers.depth.setMask(!0),L.buffers.color.setMask(!0),L.setPolygonOffset(!1)}function xt(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(k.state.transmissionRenderTarget[r.id]===void 0){let e=Pe.has(`EXT_color_buffer_half_float`)||Pe.has(`EXT_color_buffer_float`);k.state.transmissionRenderTarget[r.id]=new $t(1,1,{generateMipmaps:!0,type:e?b:p,minFilter:f,samples:Math.max(4,Fe.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Bt.workingColorSpace})}let a=k.state.transmissionRenderTarget[r.id],o=r.viewport||de;a.setSize(o.z*N.transmissionResolutionScale,o.w*N.transmissionResolutionScale);let s=N.getRenderTarget(),c=N.getActiveCubeFace(),l=N.getActiveMipmapLevel();N.setRenderTarget(a),N.getClearColor(me),he=N.getClearAlpha(),he<1&&N.setClearColor(16777215,.5),N.clear(),je&&Xe.render(n);let u=N.toneMapping;N.toneMapping=0;let d=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),k.setupLightsView(r),Te===!0&&qe.setGlobalState(N.clippingPlanes,r),St(e,n,r),Le.updateMultisampleRenderTarget(a),Le.updateRenderTargetMipmap(a),Pe.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,Ct(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(Le.updateMultisampleRenderTarget(a),Le.updateRenderTargetMipmap(a))}N.setRenderTarget(s,c,l),N.setClearColor(me,he),d!==void 0&&(r.viewport=d),N.toneMapping=u}function St(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&Ct(o,t,n,s,l,c)}}function Ct(e,t,n,r,i,a){e.onBeforeRender(N,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(N,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,N.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,N.renderBufferDirect(n,t,r,i,e,a),i.side=2):N.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(N,t,n,r,i,a)}function wt(e,t,n){t.isScene!==!0&&(t=Ae);let r=R.get(e),i=k.state.lights,a=k.state.shadowsArray,o=i.state.version,s=Ue.getParameters(e,i.state,a,t,n,k.state.lightProbeGridArray),c=Ue.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=Re.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,dt),l=new Map,r.programs=l);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return Et(e,s),d}else s.uniforms=Ue.getUniforms(e),ie!==null&&e.isNodeMaterial&&ie.build(e,n,s),e.onBeforeCompile(s,N),d=Ue.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=qe.uniform),Et(e,s),r.needsLights=At(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.lightProbeGrid=k.state.lightProbeGridArray.length>0,r.currentProgram=d,r.uniformsList=null,d}function Tt(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=Xc.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function Et(e,t){let n=R.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function Dt(e,t){if(e.length===0)return null;if(e.length===1)return e[0].texture===null?null:e[0];D.setFromMatrixPosition(t.matrixWorld);for(let t=0,n=e.length;t<n;t++){let n=e[t];if(n.texture!==null&&n.boundingBox.containsPoint(D))return n}return null}function Ot(e,t,n,r,i){t.isScene!==!0&&(t=Ae),Le.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=P===null?N.outputColorSpace:P.isXRRenderTarget===!0?P.texture.colorSpace:Bt.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=Re.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(P===null||P.isXRRenderTarget===!0)&&(h=N.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=R.get(r),y=k.state.lights;if(Te===!0&&(Ee===!0||e!==F)){let t=e===F&&r.id===ue;qe.setState(r,e,t)}let b=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version?b=!0:v.outputColorSpace===s?i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i.colorTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i.colorTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?b=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==qe.numPlanes||v.numIntersection!==qe.numIntersection)?b=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.toneMapping===h&&v.morphTargetsCount===_?!!v.lightProbeGrid!=k.state.lightProbeGridArray.length>0&&(b=!0):b=!0:b=!0:b=!0:(b=!0,v.__version=r.version);let x=v.currentProgram;b===!0&&(x=wt(r,t,i),ie&&r.isNodeMaterial&&ie.onUpdateProgram(r,x,v));let S=!1,C=!1,w=!1,T=x.getUniforms(),E=v.uniforms;if(L.useProgram(x.program)&&(S=!0,C=!0,w=!0),r.id!==ue&&(ue=r.id,C=!0),v.needsLights){let e=Dt(k.state.lightProbeGridArray,i);v.lightProbeGrid!==e&&(v.lightProbeGrid=e,C=!0)}if(S||F!==e){L.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),T.setValue(I,`projectionMatrix`,e.projectionMatrix),T.setValue(I,`viewMatrix`,e.matrixWorldInverse);let t=T.map.cameraPosition;t!==void 0&&t.setValue(I,Oe.setFromMatrixPosition(e.matrixWorld)),Fe.logarithmicDepthBuffer&&T.setValue(I,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&T.setValue(I,`isOrthographic`,e.isOrthographicCamera===!0),F!==e&&(F=e,C=!0,w=!0)}if(v.needsLights&&(y.state.directionalShadowMap.length>0&&T.setValue(I,`directionalShadowMap`,y.state.directionalShadowMap,Le),y.state.spotShadowMap.length>0&&T.setValue(I,`spotShadowMap`,y.state.spotShadowMap,Le),y.state.pointShadowMap.length>0&&T.setValue(I,`pointShadowMap`,y.state.pointShadowMap,Le)),i.isSkinnedMesh){T.setOptional(I,i,`bindMatrix`),T.setOptional(I,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),T.setValue(I,`boneTexture`,e.boneTexture,Le))}i.isBatchedMesh&&(T.setOptional(I,i,`batchingTexture`),T.setValue(I,`batchingTexture`,i._matricesTexture,Le),T.setOptional(I,i,`batchingIdTexture`),T.setValue(I,`batchingIdTexture`,i._indirectTexture,Le),T.setOptional(I,i,`batchingColorTexture`),i._colorsTexture!==null&&T.setValue(I,`batchingColorTexture`,i._colorsTexture,Le));let D=n.morphAttributes;if((D.position!==void 0||D.normal!==void 0||D.color!==void 0)&&Ze.update(i,n,x),(C||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,T.setValue(I,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(E.envMapIntensity.value=t.environmentIntensity),E.dfgLUT!==void 0&&(E.dfgLUT.value=_u()),C){if(T.setValue(I,`toneMappingExposure`,N.toneMappingExposure),v.needsLights&&kt(E,w),a&&r.fog===!0&&We.refreshFogUniforms(E,a),We.refreshMaterialUniforms(E,r,ve,_e,k.state.transmissionRenderTarget[e.id]),v.needsLights&&v.lightProbeGrid){let e=v.lightProbeGrid;E.probesSH.value=e.texture,E.probesMin.value.copy(e.boundingBox.min),E.probesMax.value.copy(e.boundingBox.max),E.probesResolution.value.copy(e.resolution)}Xc.upload(I,Tt(v),E,Le)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(Xc.upload(I,Tt(v),E,Le),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&T.setValue(I,`center`,i.center),T.setValue(I,`modelViewMatrix`,i.modelViewMatrix),T.setValue(I,`normalMatrix`,i.normalMatrix),T.setValue(I,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];at.update(n,x),at.bind(n,x)}}return x}function kt(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function At(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return ce},this.getActiveMipmapLevel=function(){return le},this.getRenderTarget=function(){return P},this.setRenderTargetTextures=function(e,t,n){let r=R.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),R.get(e.texture).__webglTexture=t,R.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=R.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){P=e,ce=t,le=n;let r=null,i=!1,a=!1;if(e){let o=R.get(e);if(o.__useDefaultFramebuffer!==void 0){L.bindFramebuffer(I.FRAMEBUFFER,o.__webglFramebuffer),de.copy(e.viewport),fe.copy(e.scissor),pe=e.scissorTest,L.viewport(de),L.scissor(fe),L.setScissorTest(pe),ue=-1;return}else if(o.__webglFramebuffer===void 0)Le.setupRenderTarget(e);else if(o.__hasExternalTextures)Le.rebindTextures(e,R.get(e.texture).__webglTexture,R.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&R.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);Le.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=R.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&Le.useMultisampledRTT(e)===!1?R.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,de.copy(e.viewport),fe.copy(e.scissor),pe=e.scissorTest}else de.copy(xe).multiplyScalar(ve).floor(),fe.copy(Se).multiplyScalar(ve).floor(),pe=Ce;if(n!==0&&(r=ae),L.bindFramebuffer(I.FRAMEBUFFER,r)&&L.drawBuffers(e,r),L.viewport(de),L.scissor(fe),L.setScissorTest(pe),i){let r=R.get(e.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=R.get(e.textures[t]);I.framebufferTextureLayer(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=R.get(e.texture);I.framebufferTexture2D(I.FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,t.__webglTexture,n)}ue=-1},this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){B(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=R.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c){L.bindFramebuffer(I.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;if(e.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+s),!Fe.textureFormatReadable(c)){B(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(!Fe.textureTypeReadable(l)){B(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&I.readPixels(t,n,r,i,nt.convert(c),nt.convert(l),a)}finally{let e=P===null?null:R.get(P).__webglFramebuffer;L.bindFramebuffer(I.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=R.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o]),c)if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){L.bindFramebuffer(I.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;if(e.textures.length>1&&I.readBuffer(I.COLOR_ATTACHMENT0+s),!Fe.textureFormatReadable(l))throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(!Fe.textureTypeReadable(u))throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let d=I.createBuffer();I.bindBuffer(I.PIXEL_PACK_BUFFER,d),I.bufferData(I.PIXEL_PACK_BUFFER,a.byteLength,I.STREAM_READ),I.readPixels(t,n,r,i,nt.convert(l),nt.convert(u),0);let f=P===null?null:R.get(P).__webglFramebuffer;L.bindFramebuffer(I.FRAMEBUFFER,f);let p=I.fenceSync(I.SYNC_GPU_COMMANDS_COMPLETE,0);return I.flush(),await it(I,p,4),I.bindBuffer(I.PIXEL_PACK_BUFFER,d),I.getBufferSubData(I.PIXEL_PACK_BUFFER,0,a),I.deleteBuffer(d),I.deleteSync(p),a}else throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;Le.setTexture2D(e,0),I.copyTexSubImage2D(I.TEXTURE_2D,n,0,0,o,s,i,a),L.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=nt.convert(t.format),_=nt.convert(t.type),v;t.isData3DTexture?(Le.setTexture3D(t,0),v=I.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(Le.setTexture2DArray(t,0),v=I.TEXTURE_2D_ARRAY):(Le.setTexture2D(t,0),v=I.TEXTURE_2D),L.activeTexture(I.TEXTURE0),L.pixelStorei(I.UNPACK_FLIP_Y_WEBGL,t.flipY),L.pixelStorei(I.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),L.pixelStorei(I.UNPACK_ALIGNMENT,t.unpackAlignment);let y=L.getParameter(I.UNPACK_ROW_LENGTH),b=L.getParameter(I.UNPACK_IMAGE_HEIGHT),x=L.getParameter(I.UNPACK_SKIP_PIXELS),S=L.getParameter(I.UNPACK_SKIP_ROWS),C=L.getParameter(I.UNPACK_SKIP_IMAGES);L.pixelStorei(I.UNPACK_ROW_LENGTH,h.width),L.pixelStorei(I.UNPACK_IMAGE_HEIGHT,h.height),L.pixelStorei(I.UNPACK_SKIP_PIXELS,l),L.pixelStorei(I.UNPACK_SKIP_ROWS,u),L.pixelStorei(I.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=R.get(e),r=R.get(t),h=R.get(n.__renderTarget),g=R.get(r.__renderTarget);L.bindFramebuffer(I.READ_FRAMEBUFFER,h.__webglFramebuffer),L.bindFramebuffer(I.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,R.get(e).__webglTexture,i,d+n),I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,R.get(t).__webglTexture,a,m+n)),I.blitFramebuffer(l,u,o,s,f,p,o,s,I.DEPTH_BUFFER_BIT,I.NEAREST);L.bindFramebuffer(I.READ_FRAMEBUFFER,null),L.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||R.has(e)){let n=R.get(e),r=R.get(t);L.bindFramebuffer(I.READ_FRAMEBUFFER,oe),L.bindFramebuffer(I.DRAW_FRAMEBUFFER,se);for(let e=0;e<c;e++)w?I.framebufferTextureLayer(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):I.framebufferTexture2D(I.READ_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,n.__webglTexture,i),T?I.framebufferTextureLayer(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):I.framebufferTexture2D(I.DRAW_FRAMEBUFFER,I.COLOR_ATTACHMENT0,I.TEXTURE_2D,r.__webglTexture,a),i===0?T?I.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):I.copyTexSubImage2D(v,a,f,p,l,u,o,s):I.blitFramebuffer(l,u,o,s,f,p,o,s,I.COLOR_BUFFER_BIT,I.NEAREST);L.bindFramebuffer(I.READ_FRAMEBUFFER,null),L.bindFramebuffer(I.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?I.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?I.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):I.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?I.texSubImage2D(I.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?I.compressedTexSubImage2D(I.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):I.texSubImage2D(I.TEXTURE_2D,a,f,p,o,s,g,_,h);L.pixelStorei(I.UNPACK_ROW_LENGTH,y),L.pixelStorei(I.UNPACK_IMAGE_HEIGHT,b),L.pixelStorei(I.UNPACK_SKIP_PIXELS,x),L.pixelStorei(I.UNPACK_SKIP_ROWS,S),L.pixelStorei(I.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps&&I.generateMipmap(v),L.unbindTexture()},this.initRenderTarget=function(e){R.get(e).__webglFramebuffer===void 0&&Le.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?Le.setTextureCube(e,0):e.isData3DTexture?Le.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?Le.setTexture2DArray(e,0):Le.setTexture2D(e,0),L.unbindTexture()},this.resetState=function(){ce=0,le=0,P=null,L.reset(),rt.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return Je}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Bt._getDrawingBufferColorSpace(e),t.unpackColorSpace=Bt._getUnpackColorSpace()}},yu={name:`CopyShader`,uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`},bu=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error(`THREE.Pass: .render() must be implemented in derived pass.`)}dispose(){}},xu=new ko(-1,1,1,-1,0,1),Su=new class extends Mr{constructor(){super(),this.setAttribute(`position`,new q([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute(`uv`,new q([0,2,0,0,2,0],2))}},Cu=class{constructor(e){this._mesh=new J(Su,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,xu)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}},wu=class extends bu{constructor(e,t=`tDiffuse`){super(),this.textureID=t,this.uniforms=null,this.material=null,e instanceof Ra?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=Fa.clone(e.uniforms),this.material=new Ra({name:e.name===void 0?`unspecified`:e.name,defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new Cu(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},Tu=class extends bu{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){let r=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),i.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),i.buffers.stencil.setClear(o),i.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(r.EQUAL,1,4294967295),i.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),i.buffers.stencil.setLocked(!0)}},Eu=class extends bu{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}},Du=class{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){let n=e.getSize(new H);this._width=n.width,this._height=n.height,t=new $t(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:b}),t.texture.name=`EffectComposer.rt1`}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name=`EffectComposer.rt2`,this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new wu(yu),this.copyPass.material.blending=0,this.timer=new Io}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());let t=this.renderer.getRenderTarget(),n=!1;for(let t=0,r=this.passes.length;t<r;t++){let r=this.passes[t];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(t),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),r.needsSwap){if(n){let t=this.renderer.getContext(),n=this.renderer.state.buffers.stencil;n.setFunc(t.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),n.setFunc(t.EQUAL,1,4294967295)}this.swapBuffers()}Tu!==void 0&&(r instanceof Tu?n=!0:r instanceof Eu&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new H);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let n=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(n,r),this.renderTarget2.setSize(n,r);for(let e=0;e<this.passes.length;e++)this.passes[e].setSize(n,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}},Ou=class extends bu{constructor(e,t,n=null,r=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=r,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new K}render(e,t,n){let r=e.autoClear;e.autoClear=!1;let i,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==1&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}},ku={name:`LuminosityHighPassShader`,uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new K(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			float v = luminance( texel.xyz );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`},Au=class e extends bu{constructor(e,t=1,n,r){super(),this.strength=t,this.radius=n,this.threshold=r,this.resolution=e===void 0?new H(256,256):new H(e.x,e.y),this.clearColor=new K(0,0,0),this.needsSwap=!1,this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let i=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new $t(i,a,{type:b}),this.renderTargetBright.texture.name=`UnrealBloomPass.bright`,this.renderTargetBright.texture.generateMipmaps=!1;for(let e=0;e<this.nMips;e++){let t=new $t(i,a,{type:b});t.texture.name=`UnrealBloomPass.h`+e,t.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(t);let n=new $t(i,a,{type:b});n.texture.name=`UnrealBloomPass.v`+e,n.texture.generateMipmaps=!1,this.renderTargetsVertical.push(n),i=Math.round(i/2),a=Math.round(a/2)}let o=ku;this.highPassUniforms=Fa.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new Ra({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];let s=[6,10,14,18,22];i=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let e=0;e<this.nMips;e++)this.separableBlurMaterials.push(this._getSeparableBlurMaterial(s[e])),this.separableBlurMaterials[e].uniforms.invSize.value=new H(1/i,1/a),i=Math.round(i/2),a=Math.round(a/2);this.compositeMaterial=this._getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;let c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new U(1,1,1),new U(1,1,1),new U(1,1,1),new U(1,1,1),new U(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,this.copyUniforms=Fa.clone(yu.uniforms),this.blendMaterial=new Ra({uniforms:this.copyUniforms,vertexShader:yu.vertexShader,fragmentShader:yu.fragmentShader,premultipliedAlpha:!0,blending:2,depthTest:!1,depthWrite:!1,transparent:!0}),this._oldClearColor=new K,this._oldClearAlpha=1,this._basic=new Ur,this._fsQuad=new Cu(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this._basic.dispose(),this._fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(n,r);for(let e=0;e<this.nMips;e++)this.renderTargetsHorizontal[e].setSize(n,r),this.renderTargetsVertical[e].setSize(n,r),this.separableBlurMaterials[e].uniforms.invSize.value=new H(1/n,1/r),n=Math.round(n/2),r=Math.round(r/2)}render(t,n,r,i,a){t.getClearColor(this._oldClearColor),this._oldClearAlpha=t.getClearAlpha();let o=t.autoClear;t.autoClear=!1,t.setClearColor(this.clearColor,0),a&&t.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this._fsQuad.material=this._basic,this._basic.map=r.texture,t.setRenderTarget(null),t.clear(),this._fsQuad.render(t)),this.highPassUniforms.tDiffuse.value=r.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this._fsQuad.material=this.materialHighPassFilter,t.setRenderTarget(this.renderTargetBright),t.clear(),this._fsQuad.render(t);let s=this.renderTargetBright;for(let n=0;n<this.nMips;n++)this._fsQuad.material=this.separableBlurMaterials[n],this.separableBlurMaterials[n].uniforms.colorTexture.value=s.texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionX,t.setRenderTarget(this.renderTargetsHorizontal[n]),t.clear(),this._fsQuad.render(t),this.separableBlurMaterials[n].uniforms.colorTexture.value=this.renderTargetsHorizontal[n].texture,this.separableBlurMaterials[n].uniforms.direction.value=e.BlurDirectionY,t.setRenderTarget(this.renderTargetsVertical[n]),t.clear(),this._fsQuad.render(t),s=this.renderTargetsVertical[n];this._fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,t.setRenderTarget(this.renderTargetsHorizontal[0]),t.clear(),this._fsQuad.render(t),this._fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,a&&t.state.buffers.stencil.setTest(!0),this.renderToScreen?(t.setRenderTarget(null),this._fsQuad.render(t)):(t.setRenderTarget(r),this._fsQuad.render(t)),t.setClearColor(this._oldClearColor,this._oldClearAlpha),t.autoClear=o}_getSeparableBlurMaterial(e){let t=[],n=e/3;for(let r=0;r<e;r++)t.push(.39894*Math.exp(-.5*r*r/(n*n))/n);return new Ra({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new H(.5,.5)},direction:{value:new H(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				#include <common>

				varying vec2 vUv;

				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {

					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;

					for ( int i = 1; i < KERNEL_RADIUS; i ++ ) {

						float x = float( i );
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += ( sample1 + sample2 ) * w;

					}

					gl_FragColor = vec4( diffuseSum, 1.0 );

				}`})}_getCompositeMaterial(e){return new Ra({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`

				varying vec2 vUv;

				void main() {

					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

				}`,fragmentShader:`

				varying vec2 vUv;

				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor( const in float factor ) {

					float mirrorFactor = 1.2 - factor;
					return mix( factor, mirrorFactor, bloomRadius );

				}

				void main() {

					// 3.0 for backwards compatibility with previous alpha-based intensity
					vec3 bloom = 3.0 * bloomStrength * (
						lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture2D( blurTexture1, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture2D( blurTexture2, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture2D( blurTexture3, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture2D( blurTexture4, vUv ).rgb +
						lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture2D( blurTexture5, vUv ).rgb
					);

					float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
					gl_FragColor = vec4( bloom, bloomAlpha );

				}`})}};Au.BlurDirectionX=new H(1,0),Au.BlurDirectionY=new H(0,1);var ju={name:`OutputShader`,uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`},Mu=class extends bu{constructor(){super(),this.isOutputPass=!0,this.uniforms=Fa.clone(ju.uniforms),this.material=new za({name:ju.name,uniforms:this.uniforms,vertexShader:ju.vertexShader,fragmentShader:ju.fragmentShader}),this._fsQuad=new Cu(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,n){this.uniforms.tDiffuse.value=n.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},Bt.getTransfer(this._outputColorSpace)===`srgb`&&(this.material.defines.SRGB_TRANSFER=``),this._toneMapping===1?this.material.defines.LINEAR_TONE_MAPPING=``:this._toneMapping===2?this.material.defines.REINHARD_TONE_MAPPING=``:this._toneMapping===3?this.material.defines.CINEON_TONE_MAPPING=``:this._toneMapping===4?this.material.defines.ACES_FILMIC_TONE_MAPPING=``:this._toneMapping===6?this.material.defines.AGX_TONE_MAPPING=``:this._toneMapping===7?this.material.defines.NEUTRAL_TONE_MAPPING=``:this._toneMapping===5&&(this.material.defines.CUSTOM_TONE_MAPPING=``),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}},Nu=new U;function Pu(e,t,n,r,i,a){let o=2*Math.PI*i/4,s=Math.max(a-2*i,0),c=Math.PI/4;Nu.copy(t),Nu[r]=0,Nu.normalize();let l=.5*o/(o+s),u=1-Nu.angleTo(e)/c;return Math.sign(Nu[n])===1?u*l:s/(o+s)+l+l*(1-u)}var Z=class e extends Hi{constructor(e=1,t=1,n=1,r=2,i=.1){let a=r*2+1;if(i=Math.min(e/2,t/2,n/2,i),super(1,1,1,a,a,a),this.type=`RoundedBoxGeometry`,this.parameters={width:e,height:t,depth:n,segments:r,radius:i},a===1)return;let o=this.toNonIndexed();this.index=null,this.attributes.position=o.attributes.position,this.attributes.normal=o.attributes.normal,this.attributes.uv=o.attributes.uv;let s=new U,c=new U,l=new U(e,t,n).divideScalar(2).subScalar(i),u=this.attributes.position.array,d=this.attributes.normal.array,f=this.attributes.uv.array,p=u.length/6,m=new U,h=.5/a;for(let r=0,a=0;r<u.length;r+=3,a+=2)switch(s.fromArray(u,r),c.copy(s),c.x-=Math.sign(c.x)*h,c.y-=Math.sign(c.y)*h,c.z-=Math.sign(c.z)*h,c.normalize(),u[r+0]=l.x*Math.sign(s.x)+c.x*i,u[r+1]=l.y*Math.sign(s.y)+c.y*i,u[r+2]=l.z*Math.sign(s.z)+c.z*i,d[r+0]=c.x,d[r+1]=c.y,d[r+2]=c.z,Math.floor(r/p)){case 0:m.set(1,0,0),f[a+0]=Pu(m,c,`z`,`y`,i,n),f[a+1]=1-Pu(m,c,`y`,`z`,i,t);break;case 1:m.set(-1,0,0),f[a+0]=1-Pu(m,c,`z`,`y`,i,n),f[a+1]=1-Pu(m,c,`y`,`z`,i,t);break;case 2:m.set(0,1,0),f[a+0]=1-Pu(m,c,`x`,`z`,i,e),f[a+1]=Pu(m,c,`z`,`x`,i,n);break;case 3:m.set(0,-1,0),f[a+0]=1-Pu(m,c,`x`,`z`,i,e),f[a+1]=1-Pu(m,c,`z`,`x`,i,n);break;case 4:m.set(0,0,1),f[a+0]=1-Pu(m,c,`x`,`y`,i,e),f[a+1]=1-Pu(m,c,`y`,`x`,i,t);break;case 5:m.set(0,0,-1),f[a+0]=Pu(m,c,`x`,`y`,i,e),f[a+1]=1-Pu(m,c,`y`,`x`,i,t);break}}static fromJSON(t){return new e(t.width,t.height,t.depth,t.segments,t.radius)}},Fu=class extends zn{constructor(){super(),this.name=`RoomEnvironment`,this.position.y=-3.5;let e=new Hi;e.deleteAttribute(`uv`);let t=new Ba({side:1}),n=new Ba,r=new Oo(16777215,900,28,2);r.position.set(.418,16.199,.3),this.add(r);let i=new J(e,t);i.position.set(-.757,13.219,.717),i.scale.set(31.713,28.305,28.591),this.add(i);let a=new Y(e,n,6),o=new kn;o.position.set(-10.906,2.009,1.846),o.rotation.set(0,-.195,0),o.scale.set(2.328,7.905,4.651),o.updateMatrix(),a.setMatrixAt(0,o.matrix),o.position.set(-5.607,-.754,-.758),o.rotation.set(0,.994,0),o.scale.set(1.97,1.534,3.955),o.updateMatrix(),a.setMatrixAt(1,o.matrix),o.position.set(6.167,.857,7.803),o.rotation.set(0,.561,0),o.scale.set(3.927,6.285,3.687),o.updateMatrix(),a.setMatrixAt(2,o.matrix),o.position.set(-2.017,.018,6.124),o.rotation.set(0,.333,0),o.scale.set(2.002,4.566,2.064),o.updateMatrix(),a.setMatrixAt(3,o.matrix),o.position.set(2.291,-.756,-2.621),o.rotation.set(0,-.286,0),o.scale.set(1.546,1.552,1.496),o.updateMatrix(),a.setMatrixAt(4,o.matrix),o.position.set(-2.193,-.369,-5.547),o.rotation.set(0,.516,0),o.scale.set(3.875,3.487,2.986),o.updateMatrix(),a.setMatrixAt(5,o.matrix),this.add(a);let s=new J(e,Iu(50));s.position.set(-16.116,14.37,8.208),s.scale.set(.1,2.428,2.739),this.add(s);let c=new J(e,Iu(50));c.position.set(-16.109,18.021,-8.207),c.scale.set(.1,2.425,2.751),this.add(c);let l=new J(e,Iu(17));l.position.set(14.904,12.198,-1.832),l.scale.set(.15,4.265,6.331),this.add(l);let u=new J(e,Iu(43));u.position.set(-.462,8.89,14.52),u.scale.set(4.38,5.441,.088),this.add(u);let d=new J(e,Iu(20));d.position.set(3.235,11.486,-12.541),d.scale.set(2.5,2,.1),this.add(d);let f=new J(e,Iu(100));f.position.set(0,20,0),f.scale.set(1,.1,1),this.add(f)}dispose(){let e=new Set;this.traverse(t=>{t.isMesh&&(e.add(t.geometry),e.add(t.material))});for(let t of e)t.dispose()}};function Iu(e){return new Ha({color:0,emissive:16777215,emissiveIntensity:e})}function Lu(e,t=!1){let n=e[0].index!==null,r=new Set(Object.keys(e[0].attributes)),i=new Set(Object.keys(e[0].morphAttributes)),a={},o={},s=e[0].morphTargetsRelative,c=new Mr,l=0;for(let u=0;u<e.length;++u){let d=e[u],f=0;if(n!==(d.index!==null))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.`),null;for(let e in d.attributes){if(!r.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure "`+e+`" attribute exists among all geometries, or in none of them.`),null;a[e]===void 0&&(a[e]=[]),a[e].push(d.attributes[e]),f++}if(f!==r.size)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. Make sure all geometries have the same number of attributes.`),null;if(s!==d.morphTargetsRelative)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. .morphTargetsRelative must be consistent throughout all geometries.`),null;for(let e in d.morphAttributes){if(!i.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`.  .morphAttributes must be consistent throughout all geometries.`),null;o[e]===void 0&&(o[e]=[]),o[e].push(d.morphAttributes[e])}if(t){let e;if(n)e=d.index.count;else if(d.attributes.position!==void 0)e=d.attributes.position.count;else return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. The geometry must have either an index or a position attribute`),null;c.addGroup(l,e,u),l+=e}}if(n){let t=0,n=[];for(let r=0;r<e.length;++r){let i=e[r].index;for(let e=0;e<i.count;++e)n.push(i.getX(e)+t);t+=e[r].attributes.position.count}c.setIndex(n)}for(let e in a){let t=Ru(a[e]);if(!t)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` attribute.`),null;c.setAttribute(e,t)}for(let e in o){let t=o[e][0].length;if(t!==0){c.morphAttributes=c.morphAttributes||{},c.morphAttributes[e]=[];for(let n=0;n<t;++n){let t=[];for(let r=0;r<o[e].length;++r)t.push(o[e][r][n]);let r=Ru(t);if(!r)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` morphAttribute.`),null;c.morphAttributes[e].push(r)}}}return c}function Ru(e){let t,n,r,i=-1,a=0;for(let o=0;o<e.length;++o){let s=e[o];if(t===void 0&&(t=s.array.constructor),t!==s.array.constructor)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.`),null;if(n===void 0&&(n=s.itemSize),n!==s.itemSize)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.`),null;if(r===void 0&&(r=s.normalized),r!==s.normalized)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.`),null;if(i===-1&&(i=s.gpuType),i!==s.gpuType)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.`),null;a+=s.count*n}let o=new t(a),s=new vr(o,n,r),c=0;for(let t=0;t<e.length;++t){let r=e[t];if(r.isInterleavedBufferAttribute){let e=c/n;for(let t=0,i=r.count;t<i;t++)for(let i=0;i<n;i++){let n=r.getComponent(t,i);s.setComponent(t+e,i,n)}}else o.set(r.array,c);c+=r.count*n}return i!==void 0&&(s.gpuType=i),s}var zu=new Map,Bu=e=>{let t=zu.get(e);if(t)return t;let n=new fo().loadAsync(e).catch(t=>{throw zu.delete(e),t});return zu.set(e,n),n},Vu=(e,t,n,r,a)=>{let o=e.clone();return o.name=t,o.wrapS=i,o.wrapT=i,o.repeat.set(n[0],n[1]),o.colorSpace=r,o.minFilter=f,o.magFilter=u,o.anisotropy=a,o.needsUpdate=!0,o},Hu=(e,t,n)=>{if(typeof window>`u`||typeof document>`u`||typeof Image>`u`){n.mode=`headless-fallback`;return}let r=[];e.forEach(e=>{n.requested+=1,r.push(Bu(e.colorUrl).then(r=>{e.material.map=Vu(r,`${e.label}-color`,e.repeat,Ve,t),e.material.needsUpdate=!0,n.loaded+=1}).catch(()=>{n.failed.push(`${e.label}:color`)}));let i=e.heightUrl;i&&(n.requested+=1,r.push(Bu(i).then(r=>{e.material.bumpMap=Vu(r,`${e.label}-height`,e.repeat,``,t),e.material.bumpScale=e.bumpScale??0,e.material.needsUpdate=!0,n.loaded+=1}).catch(()=>{n.failed.push(`${e.label}:height`)})))}),Promise.all(r).then(()=>{n.mode=n.failed.length===0?`ready`:`partial-fallback`})},Uu=[{x:0,z:72,elevation:7.2},{x:0,z:58,elevation:6.1},{x:-12,z:48,elevation:3.6},{x:-25,z:31,elevation:-2.8},{x:-17,z:6,elevation:-4.2},{x:8,z:-2,elevation:-.2},{x:34,z:-8,elevation:5.4},{x:18,z:-27,elevation:2.7},{x:-19,z:-48,elevation:-1.5},{x:-7,z:-78,elevation:2.4},{x:2,z:-112,elevation:7.4}],Wu=[[{x:0,z:58,elevation:6.1},{x:25,z:42,elevation:4.8},{x:34,z:-8,elevation:5.4}],[{x:-25,z:31,elevation:-2.8},{x:-48,z:4,elevation:2.2},{x:-19,z:-48,elevation:-1.5}],[{x:34,z:-8,elevation:5.4},{x:52,z:-51,elevation:-1.1},{x:-19,z:-48,elevation:-1.5}],[{x:-25,z:31,elevation:-2.8},{x:-17,z:6,elevation:-4.2},{x:8,z:-2,elevation:-.2}]],Gu=(e,t,n)=>Math.max(t,Math.min(n,e)),Ku=(e,t,n)=>e+(t-e)*n,qu=(e,t,n)=>{let r=Gu((n-e)/(t-e),0,1);return r*r*(3-2*r)},Ju=(e,t,n)=>{let r=1/0,i=e[0].elevation,a=e[0].x,o=e[0].z;for(let s=0;s<e.length-1;s+=1){let c=e[s],l=e[s+1],u=l.x-c.x,d=l.z-c.z,f=u*u+d*d,p=f>0?Gu(((t-c.x)*u+(n-c.z)*d)/f,0,1):0,m=Ku(c.x,l.x,p),h=Ku(c.z,l.z,p),g=t-m,_=n-h,v=g*g+_*_;v<r&&(r=v,i=Ku(c.elevation,l.elevation,p),a=m,o=h)}return{distance:Math.sqrt(r),elevation:i,x:a,z:o}},Yu=(e,t)=>Ju(Uu,e,t).distance,Xu=(e,t,n,r,i,a,o=.68)=>1-qu(o,1,Math.hypot((e-n)/i,(t-r)/a)),Zu=(e,t,n,r,i,a)=>{let o=Math.hypot(e-n,t-r);return qu(i-2,i+1.5,o)*(1-qu(a-2,a,o))},Qu=(e,t,n)=>{let r=e,i=qu(101,139,Math.hypot(t*.92,n));r+=i*i*24;let a=Xu(t,n,0,67,29,24);r=Ku(r,7.2,a*.92);let o=Xu(t,n,-25,31,18,16,.62);r=Ku(r,-2.8,o*.96),r+=Zu(t,n,-25,31,17,28)*4.4;let s=Xu(t,n,34,-8,25,21);r=Ku(r,5.4,s*.9);let c=Xu(t,n,-19,-48,14,13,.55);r=Ku(r,-1.5,c*.96),r+=Zu(t,n,-19,-48,13,21)*3.1,r+=Zu(t,n,-19,-48,21,31)*6.7;let l=Xu(t,n,-21,-96,11,35,.4),u=Xu(t,n,23,-96,12,35,.4);r+=(l+u)*12.5;for(let e of Wu){let i=Ju(e,t,n),a=1-qu(2.2,5.2,i.distance);r=Ku(r,i.elevation,a*.78)}let d=Ju(Uu,t,n),f=1-qu(3.2,7.3,d.distance);return r=Ku(r,d.elevation,f*.94),r},$u=class{constructor(e){this.state=e>>>0}next(){this.state+=1831565813;let e=this.state;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}range(e,t){return Ku(e,t,this.next())}},ed=(e,t,n,r)=>{let i=new $u(r),a=[],o=[],s=[];e.forEach((s,c)=>{let l=c/(e.length-1),u=Math.sin(l*Math.PI)*i.range(-.08,.08),d=Math.sin(l*Math.PI)*i.range(-.06,.06);for(let e=0;e<t;e+=1){let f=e/t*Math.PI*2+l*n,p=1+Math.sin(e*2.73+c*1.17+r)*.045+i.range(-.025,.025);a.push(u+Math.cos(f)*s*p,l,d+Math.sin(f)*s*p),o.push(e/t,l)}});for(let n=0;n<e.length-1;n+=1)for(let e=0;e<t;e+=1){let r=(e+1)%t,i=n*t+e,a=n*t+r,o=(n+1)*t+e,c=(n+1)*t+r;s.push(i,o,a,a,o,c)}let c=new Mr;return c.setAttribute(`position`,new q(a,3)),c.setAttribute(`uv`,new q(o,2)),c.setIndex(s),c.computeVertexNormals(),c.computeBoundingSphere(),c},td=()=>{let e=new Mr;return e.setAttribute(`position`,new q([0,1,0,.62,.08,0,0,-1,0,-.62,.08,0,0,0,.18],3)),e.setAttribute(`uv`,new q([.5,1,1,.54,.5,0,0,.54,.5,.5],2)),e.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]),e.computeVertexNormals(),e.computeBoundingBox(),e.computeBoundingSphere(),e},nd=(e,t=3)=>{let n=[];for(let r=0;r<e.length-1;r+=1){let i=e[r],a=e[r+1],o=Math.hypot(a.x-i.x,a.z-i.z),s=Math.max(1,Math.ceil(o/t));for(let e=0;e<s;e+=1){let t=e/s;n.push({x:Ku(i.x,a.x,t),z:Ku(i.z,a.z,t)})}}let r=e[e.length-1];return n.push({x:r.x,z:r.z}),n},rd=(e,t,n,r=.065,i=0)=>{let a=nd(e),o=[],s=[],c=[],l=0;a.forEach((e,c)=>{let u=a[Math.max(0,c-1)],d=a[Math.min(a.length-1,c+1)],f=d.x-u.x,p=d.z-u.z,m=Math.max(.001,Math.hypot(f,p)),h=-p/m,g=f/m;c>0&&(l+=Math.hypot(e.x-a[c-1].x,e.z-a[c-1].z));for(let a of[-1,1]){let c=e.x+h*(i+t*.5*a),u=e.z+g*(i+t*.5*a);o.push(c,n(c,u)+r,u),s.push(a<0?0:1,l/8)}});for(let e=0;e<a.length-1;e+=1){let t=e*2,n=t+1,r=t+2,i=t+3;c.push(t,r,n,n,r,i)}let u=new Mr;return u.setAttribute(`position`,new q(o,3)),u.setAttribute(`uv`,new q(s,2)),u.setIndex(c),u.computeVertexNormals(),u},id=[{x:-14,z:76,width:4.8,height:8.5,depth:4,yaw:.65},{x:15,z:76,width:5.4,height:9.4,depth:4.5,yaw:-.6},{x:-15,z:63,width:4.4,height:7.6,depth:3.8,yaw:.9},{x:15,z:61,width:4.8,height:8.2,depth:4,yaw:-.85},{x:-42,z:39,width:5.4,height:10.5,depth:4.5,yaw:1.05},{x:-40,z:23,width:4.8,height:8.8,depth:4.2,yaw:1.5},{x:-29,z:13,width:5.2,height:9.8,depth:4.4,yaw:2.55},{x:-12,z:18,width:5.8,height:11.2,depth:4.8,yaw:-2.4},{x:2,z:26,width:5,height:9.2,depth:4.2,yaw:-1.7},{x:-34,z:48,width:5.6,height:10.2,depth:4.8,yaw:-.2},{x:10,z:17,width:6.2,height:9.8,depth:5.2,yaw:.7},{x:51,z:-4,width:6.8,height:12.5,depth:5.5,yaw:-1.2},{x:41,z:-25,width:5.8,height:10.4,depth:4.8,yaw:-2.5},{x:12,z:-38,width:5.2,height:8.6,depth:4.5,yaw:2.1},{x:-36,z:-39,width:5.2,height:9.8,depth:4.5,yaw:1.1},{x:-36,z:-58,width:5.8,height:11.5,depth:4.8,yaw:1.85},{x:8,z:-66,width:5.4,height:10.8,depth:4.6,yaw:-1.85},{x:10,z:-50,width:4.8,height:8.4,depth:4.1,yaw:-1.1}],ad=[{x:-49,z:43,radius:3.3,height:29,yaw:.4,variant:0},{x:57,z:13,radius:4.1,height:38,yaw:-.2,variant:1},{x:49,z:-21,radius:3.6,height:31,yaw:.8,variant:0},{x:-43,z:-58,radius:3.5,height:28,yaw:-.6,variant:1},{x:-13,z:-106,radius:4.7,height:47,yaw:.2,variant:0},{x:16,z:-108,radius:5.1,height:53,yaw:-.35,variant:1},{x:-24,z:-91,radius:3.4,height:35,yaw:.7,variant:1},{x:25,z:-94,radius:3.6,height:38,yaw:-.7,variant:0}],od=[{x:-8.5,z:65,length:21,height:6.5,thickness:1.5,yaw:0},{x:8.5,z:65,length:21,height:6.5,thickness:1.5,yaw:0},{x:-41,z:31,length:15,height:6.2,thickness:1.4,yaw:0},{x:-9,z:31,length:13,height:6.2,thickness:1.4,yaw:0},{x:-25,z:48,length:13,height:5.5,thickness:1.3,yaw:Math.PI/2},{x:-26,z:14,length:11,height:5,thickness:1.2,yaw:Math.PI/2},{x:50,z:-9,length:25,height:8.5,thickness:1.8,yaw:.2},{x:29,z:-23,length:19,height:7.2,thickness:1.5,yaw:1.05},{x:-39,z:-48,length:15,height:7.5,thickness:1.5,yaw:0},{x:1,z:-48,length:14,height:7.5,thickness:1.5,yaw:0},{x:-13,z:-94,length:33,height:10,thickness:2,yaw:0},{x:14,z:-94,length:33,height:10,thickness:2,yaw:0}],sd=[{x:0,z:68,radius:7,height:9.5,yaw:0},{x:0,z:57.5,radius:6.4,height:8.5,yaw:0},{x:-25,z:49,radius:6,height:7.5,yaw:0},{x:-7,z:31,radius:5.5,height:7,yaw:Math.PI/2},{x:18,z:0,radius:5.5,height:7.5,yaw:.7},{x:34,z:12,radius:6.5,height:9,yaw:0},{x:0,z:-36,radius:6,height:8.2,yaw:-.5},{x:-19,z:-29,radius:6.2,height:8.5,yaw:0},{x:-7,z:-77,radius:7,height:10,yaw:.2},{x:-18,z:-97,radius:6.2,height:11,yaw:.08}],cd=[new H(0,67),new H(-25,31),new H(34,-8),new H(-19,-48),new H(2,-104)],ld=e=>{let t=0,n=0,r=0;return e.traverse(e=>{if(!(e instanceof J))return;t+=1;let i=Array.isArray(e.material)?e.material.length:1;n+=i;let a=e.geometry.getAttribute(`position`),o=e.geometry.index?e.geometry.index.count/3:a?a.count/3:0,s=e instanceof Y?e.count:1;r+=o*s}),{meshes:t,estimatedDrawCalls:n,estimatedTriangles:Math.round(r)}},ud=e=>{let t=e.colliders.length,n=e.shootables.length,r=new An;r.name=`vanta-breathing-city`;let i={intake:new An,forum:new An,breathworks:new An,quietCourt:new An,crown:new An};i.intake.name=`district-intake-gate`,i.forum.name=`district-nacre-forum`,i.breathworks.name=`district-breathworks`,i.quietCourt.name=`district-quiet-court`,i.crown.name=`district-suture-crown`,r.add(i.intake,i.forum,i.breathworks,i.quietCourt,i.crown);let a=e.quality===`low`?7:e.quality===`high`?9:11,o=e.quality===`low`?24:e.quality===`high`?36:48,s=new $u(12679825),c=new nn,l=new Nt,u=new U,d=new U,f=new Ba({color:14078143,roughness:.82,metalness:.04,envMapIntensity:.48}),p=new Ba({color:15656401,roughness:.78,metalness:.04,envMapIntensity:.52}),m=new Ba({color:7305327,roughness:.8,metalness:.04,envMapIntensity:.34}),h=new Ba({color:12897475,roughness:.86,metalness:.13,envMapIntensity:.42}),g=new Ba({color:12109502,roughness:.58,metalness:.5,envMapIntensity:.64}),_=new Va({color:593426,roughness:.32,metalness:.16,clearcoat:.24,clearcoatRoughness:.3,envMapIntensity:.68}),v=new Ba({color:12946843,emissive:1770765,emissiveIntensity:.14,roughness:.6,metalness:0,side:2}),y=new Ba({color:1581857,emissive:5400625,emissiveIntensity:.3,roughness:.42,metalness:.48}),b=new Ba({color:8094072,roughness:.9,metalness:.03,polygonOffset:!0,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),x=new Ba({color:6647657,roughness:.9,metalness:.05,polygonOffset:!0,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),S=new Ba({color:3425085,emissive:11782760,emissiveIntensity:.24,roughness:.52,metalness:.36,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),C=new Ba({color:1911077,emissive:13033331,emissiveIntensity:.64,roughness:.5,metalness:.14}),w=new Ba({color:462863,emissive:1253914,emissiveIntensity:.32,roughness:.72,metalness:.12,side:1}),T=new Ur({transparent:!0,opacity:0,depthWrite:!1,colorWrite:!1}),E=new Va({color:2783092,emissive:1460808,emissiveIntensity:.34,roughness:.24,metalness:.08,clearcoat:.55,clearcoatRoughness:.2,transparent:!0,opacity:.84,depthWrite:!1}),D={mode:`loading`,requested:0,loaded:0,failed:[]};r.userData.authoredTextures=D;let O=e.quality===`low`?2:e.quality===`high`?4:8;Hu([{label:`nacre-civic-carapace`,material:f,colorUrl:`/vanta-9/textures/civic-carapace.webp`,heightUrl:e.quality===`low`?void 0:`/vanta-9/textures/civic-carapace-height.webp`,repeat:[2.35,3.8],bumpScale:.1},{label:`pale-nacre-civic-carapace`,material:p,colorUrl:`/vanta-9/textures/civic-carapace.webp`,heightUrl:e.quality===`low`?void 0:`/vanta-9/textures/civic-carapace-height.webp`,repeat:[1.7,3.05],bumpScale:.085},{label:`tissue-living-membrane`,material:v,colorUrl:`/vanta-9/textures/living-membrane.webp`,repeat:[1.45,3.45]},{label:`foundation-pressure-strata`,material:h,colorUrl:`/vanta-9/textures/pressure-foundation.webp`,repeat:[3.15,4.85]},{label:`oxidized-pressure-strata`,material:g,colorUrl:`/vanta-9/textures/pressure-foundation.webp`,repeat:[5.2,2.75]}],O,D);let k=(t,n,r)=>{e.colliders.push({x:t,z:n,radius:r})},A=(e,t,n,r,i)=>{let a=Math.max(2,Math.ceil(Math.hypot(n,r)/Math.max(.8,i*1.35)));for(let o=0;o<=a;o+=1){let s=o/a;k(e-n*.5+n*s,t-r*.5+r*s,i)}},j=t=>{t.userData.surface=t.userData.surface??`civilization`,e.shootables.push(t)},ee=new J(rd(Uu,6.6,e.terrainHeight,.075),b);ee.name=`resonance-spine`,ee.receiveShadow=!0,r.add(ee),j(ee),Wu.forEach((t,n)=>{let i=new J(rd(t,n===3?3.8:4.3,e.terrainHeight),x);i.name=`secondary-route-${n+1}`,i.receiveShadow=!0,r.add(i),j(i)});let M=[{width:.42,offset:0},{width:.16,offset:-2.72},{width:.16,offset:2.72}].map(({width:t,offset:n},i)=>{let a=new J(rd(Uu,t,e.terrainHeight,.108+i*.002,n),S);return a.name=i===0?`spine-signal-suture`:`spine-edge-inlay-${i}`,a.receiveShadow=!0,r.add(a),j(a),a});e.accentLights.push(M[0]);let te=nd(Uu,6.4),ne=new Y(new Z(1,1,1,1,.08),g,te.length);te.forEach((t,n)=>{let r=te[Math.max(0,n-1)],i=te[Math.min(te.length-1,n+1)],a=Math.atan2(i.x-r.x,i.z-r.z);d.set(t.x,e.terrainHeight(t.x,t.z)+.105,t.z),l.setFromEuler(new G(0,a,0)),u.set(n%5==0?6:5.4,.045,.13),c.compose(d,l,u),ne.setMatrixAt(n,c)}),ne.instanceMatrix.needsUpdate=!0,ne.receiveShadow=!0,ne.name=`spine-expansion-seams`,r.add(ne),j(ne);let N=new Y(new Z(1,1,1,3,.08),h,od.length);od.forEach((t,n)=>{let r=e.terrainHeight(t.x,t.z);d.set(t.x,r+t.height*.5,t.z),l.setFromEuler(new G(0,t.yaw,0)),u.set(t.thickness,t.height,t.length),c.compose(d,l,u),N.setMatrixAt(n,c);let i=Math.sin(t.yaw)*t.length,a=Math.cos(t.yaw)*t.length;A(t.x,t.z,i,a,t.thickness*.48+.38)}),N.instanceMatrix.needsUpdate=!0,N.castShadow=!0,N.receiveShadow=!0,N.name=`city-retaining-walls`,r.add(N),j(N);let re=[],ie=[],ae=[],oe=[],se=[],ce=[],le=[],P=[];od.forEach((t,n)=>{let r=e.terrainHeight(t.x,t.z),i=Math.max(3,Math.ceil(t.length/5.2)),a=t.length/i;for(let e=0;e<i;e+=1){let i=-t.length*.5+a*(e+.5);for(let n of[-1,1]){let o=n*(t.thickness*.5+.075),s=t.x+Math.sin(t.yaw)*i+Math.cos(t.yaw)*o,c=t.z+Math.cos(t.yaw)*i-Math.sin(t.yaw)*o;re.push({x:s,y:r+t.height*(e%2==0?.49:.53),z:c,yaw:t.yaw,sx:.12,sy:t.height*(e%2==0?.68:.58),sz:a*.36});let l=e%2==0?.35:.62;ie.push({x:s+Math.cos(t.yaw)*n*.085,y:r+t.height*l,z:c-Math.sin(t.yaw)*n*.085,yaw:t.yaw,sx:.1,sy:t.height*(e%2==0?.23:.18),sz:a*.38});let u=i-a*(e%2==0?.38:-.38);ae.push({x:t.x+Math.sin(t.yaw)*u+Math.cos(t.yaw)*n*(t.thickness*.5+.3),y:r+t.height*.47,z:t.z+Math.cos(t.yaw)*u-Math.sin(t.yaw)*n*(t.thickness*.5+.3),yaw:t.yaw+n*.08,sx:.42+e%3*.08,sy:t.height*(.68+e%2*.08),sz:.48}),oe.push({x:s+Math.cos(t.yaw)*n*.18,y:r+t.height*(l+(e%2==0?.16:.13)),z:c-Math.sin(t.yaw)*n*.18,yaw:t.yaw,sx:.42,sy:.13,sz:a*.42})}let o=.72+(e+n)%3*.42;P.push({x:t.x+Math.sin(t.yaw)*i,y:r+t.height-.04,z:t.z+Math.cos(t.yaw)*i,yaw:t.yaw,sx:t.thickness*.72,sy:o,sz:a*(e%2==0?.3:.18)})}for(let e of[.28,.67]){se.push({x:t.x,y:r+t.height*e,z:t.z,yaw:t.yaw,sx:t.thickness+.34,sy:.11,sz:t.length*.84});for(let n of[-1,1]){let i=n*t.length*.43;ce.push({x:t.x+Math.sin(t.yaw)*i,y:r+t.height*e,z:t.z+Math.cos(t.yaw)*i,yaw:t.yaw+n*.3,sx:.36,sy:.52,sz:.32})}}for(let e of[-.44,0,.44]){let n=e*t.length;for(let e of[-1,1]){let i=e*(t.thickness*.5+.48);le.push({x:t.x+Math.sin(t.yaw)*n+Math.cos(t.yaw)*i,y:r+t.height*.28,z:t.z+Math.cos(t.yaw)*n-Math.sin(t.yaw)*i,yaw:t.yaw+Math.PI*.25,sx:.78,sy:t.height*.56,sz:.72})}}});let ue=[{id:`reservoir-intake`,x:-17,z:6,height:.78},{id:`shared-distribution-hub`,x:-9,z:9,height:.92},{id:`forum-service`,x:-25,z:31,height:.84},{id:`forum-habitation`,x:-29,z:13,height:.76},{id:`east-habitation`,x:2,z:26,height:.78},{id:`breathworks-source`,x:43,z:-5,height:1.08},{id:`bay-transfer`,x:30,z:-4,height:.82},{id:`utility-house`,x:51,z:-4,height:.9},{id:`dock-warehouse`,x:41,z:-25,height:.84},{id:`court-service`,x:-19,z:-48,height:.76},{id:`crown-service`,x:2,z:-102,height:.9}];ue.forEach((t,n)=>{ce.push({x:t.x,y:e.terrainHeight(t.x,t.z)+t.height,z:t.z,yaw:n*.73,sx:.46+n%2*.08,sy:.62+n%3*.1,sz:.46+(n+1)%2*.08})});let F=(e,t,n,i,a=!0)=>{let o=new Y(t,n,i.length);return i.forEach((e,t)=>{d.set(e.x,e.y,e.z),l.setFromEuler(new G(0,e.yaw,0)),u.set(e.sx,e.sy,e.sz),c.compose(d,l,u),o.setMatrixAt(t,c)}),o.instanceMatrix.needsUpdate=!0,o.castShadow=a,o.receiveShadow=!0,o.name=e,r.add(o),j(o),o},de=F(`retaining-wall-inset-panels`,new Gi(1,1,1,6),f,re,!1),fe=[new K(15918538),new K(13359568),new K(14861495),new K(16117720)];re.forEach((e,t)=>{de.setColorAt(t,fe[t%fe.length])}),de.instanceColor&&(de.instanceColor.needsUpdate=!0),F(`retaining-wall-shadow-recesses`,new Hi(1,1,1),_,ie,!1),F(`retaining-wall-layered-shell-fins`,new Gi(.34,.62,1,5),m,ae,!1),F(`retaining-wall-occlusion-ledges`,new Gi(.6,1,1,5),p,oe,!1),F(`retaining-wall-biological-seams`,new Z(1,1,1,1,.06),y,se,!1),F(`retaining-wall-conduit-junction-organs`,new Sa(1,1),y,ce,!1),F(`retaining-wall-ground-buttresses`,new Gi(.58,1,1,4),g,le,!1),F(`retaining-wall-broken-crownline`,ed([.74,1,.76,.16],5,.32,49665),f,P,!1);let pe=new J(new Gi(8.8,9.2,.18,e.quality===`low`?12:18),g);pe.name=`intake-branching-decompression-plaza`,pe.position.set(0,e.terrainHeight(0,57.5)+.085,57.5),pe.receiveShadow=!0,pe.userData.traversalSurface=!0,i.intake.add(pe),j(pe);let me=[],he=[],ge=[];for(let t of[-1,1]){let n=t*7.68,r=62.5,i=e.terrainHeight(n,r);me.push({x:n,y:i+1.55,z:r,yaw:Math.PI/2,sx:2.25,sy:3.1,sz:.22});for(let e of[-1.35,1.35])he.push({x:n,y:i+1.65,z:r+e,yaw:Math.PI/2,sx:.3,sy:3.45,sz:.3});he.push({x:n,y:i+3.35,z:r,yaw:Math.PI/2,sx:2.85,sy:.3,sz:.34}),ge.push({x:n-t*.17,y:i+2.2,z:r+.7,yaw:Math.PI/2,sx:.55,sy:.12,sz:.12})}let _e=F(`intake-sealed-service-apertures`,new Z(1,1,1,2,.08),_,me,!1);i.intake.attach(_e);let ve=F(`intake-decompression-door-frames`,new Gi(.68,1,1,5),m,he,!1);i.intake.attach(ve);let ye=F(`intake-pressure-indicators`,new Z(1,1,1,1,.04),C,ge,!1);i.intake.attach(ye),e.accentLights.push(ye);for(let t of e.quality===`low`?[]:[-1,1]){let n=t*6.95,r=62.5,a=new Oo(12441226,2.35,7.5,2);a.name=`intake-airlock-bounce-${t<0?`west`:`east`}`,a.position.set(n,e.terrainHeight(n,r)+2.75,r),i.intake.add(a)}let be=new Y(ed([.18,.54,.31,.76,.27,.62,.22,.39,.08,.025],5,1.14,1735278),v,24),xe=new U(0,1,0),Se=new U,Ce=0;for(let t of[-1,1]){for(let n=0;n<8;n+=1){let r=53.5+n*3.45,i=t*(7.45+n%3*.13);d.set(i,e.terrainHeight(i,r)-.02,r),l.setFromEuler(new G(0,n*.67+t*.2,t*.11)),u.set(.58+n%3*.14,2.4+n%4*.48,.52+(n+1)%3*.12),c.compose(d,l,u),be.setMatrixAt(Ce,c),Ce+=1}for(let n=0;n<4;n+=1){let r=55+n*6.1,i=t*7.35;d.set(i,e.terrainHeight(i,r)+.08,r),Se.set(-t,.06,n%2==0?.32:-.25).normalize(),l.setFromUnitVectors(xe,Se),u.set(.48,2.3+n*.18,.42),c.compose(d,l,u),be.setMatrixAt(Ce,c),Ce+=1}}be.instanceMatrix.needsUpdate=!0,be.castShadow=!1,be.receiveShadow=!0,be.name=`intake-biological-foundation-fusion`,i.intake.add(be),j(be);let we=ed([.68,.92,1,.96,.8,.53,.15],a,.32,334353),Te=new Hi(1,1,.16),Ee=new Oa(1,.07,6,e.quality===`low`?16:24),De=new Y(we,f,id.length),Oe=new Y(Te,_,id.length),ke=new Y(Ee,y,id.length),Ae=new Y(new Oa(1,.035,5,e.quality===`low`?14:20),g,id.length*3),je=[],Me=[],I=new Y(new Hi(1,1,.18),C,id.length),Ne=new Y(new Hi(1,1,1),w,6),Pe=new Y(new Z(1,1,.12,2,.05),C,6),Fe=new Set([4,5,6,7,8,9,10,11,12,13,14,17]);id.forEach((t,n)=>{let r=Fe.has(n),a=n<6,o=e.terrainHeight(t.x,t.z);d.set(t.x,o,t.z),l.setFromEuler(new G(0,t.yaw,0)),u.set(r?.001:t.width,r?.001:t.height,r?.001:t.depth),c.compose(d,l,u),De.setMatrixAt(n,c);let s=Math.sin(t.yaw),f=Math.cos(t.yaw);d.set(t.x+s*t.depth*.92,o+1.45,t.z+f*t.depth*.92),l.setFromEuler(new G(0,t.yaw,0)),u.set(a||r?.001:1.45,a||r?.001:2.9,a||r?.001:1),c.compose(d,l,u),Oe.setMatrixAt(n,c),d.set(t.x,o+t.height*.68,t.z),l.setFromEuler(new G(Math.PI/2,t.yaw*.35,0)),u.setScalar(r?.001:t.width*.54),c.compose(d,l,u),ke.setMatrixAt(n,c);for(let e=0;e<3;e+=1){d.set(t.x,o+t.height*(.25+e*.205),t.z),l.setFromEuler(new G(Math.PI/2,t.yaw,0));let i=.83-e*.1;u.set(r?.001:t.width*i,r?.001:t.depth*i,r?.001:1),c.compose(d,l,u),Ae.setMatrixAt(n*3+e,c)}let p=Math.cos(t.yaw),m=-Math.sin(t.yaw),h=t.x+s*t.depth*.95,g=t.z+f*t.depth*.95;if(a&&(d.set(h+s*.48,o+1.58,g+f*.48),l.setFromEuler(new G(0,t.yaw,0)),u.set(r?.001:2.08,r?.001:3.12,r?.001:1.2),c.compose(d,l,u),Ne.setMatrixAt(n,c),d.set(h+s*.015,o+1.64,g+f*.015),u.set(r?.001:1.12,r?.001:1.72,r?.001:1),c.compose(d,l,u),Pe.setMatrixAt(n,c),!r&&(n===4||n===0&&e.quality===`ultra`))){let e=new Oo(12967302,1.65,5.2,2);e.name=`dwelling-recess-bounce-${n+1}`,e.position.set(h+s*.7,o+2.05,g+f*.7),(n<4?i.intake:i.forum).add(e)}if(!r){for(let e of[-1,1])je.push({x:h+p*1.05*e,y:o+1.55,z:g+m*1.05*e,yaw:t.yaw,sx:.23,sy:3.2,sz:.3});je.push({x:h,y:o+3.12,z:g,yaw:t.yaw,sx:2.55,sy:.24,sz:.42}),Me.push({x:t.x+s*t.depth*1.09,y:o+.075,z:t.z+f*t.depth*1.09,yaw:t.yaw,sx:2.9,sy:.15,sz:1.5})}d.set(h+s*.17,o+2.35,g+f*.17),l.setFromEuler(new G(0,t.yaw,0)),u.set(r?1.35:.72,r?.24:.12,1),c.compose(d,l,u),I.setMatrixAt(n,c),r||k(t.x,t.z,Math.max(t.width,t.depth)*.48)});for(let e of[De,Oe,ke,Ae,I,Ne,Pe])e.instanceMatrix.needsUpdate=!0,e.castShadow=e===De,e.receiveShadow=!0,r.add(e),j(e);De.name=`shell-dwellings`,Oe.name=`occupied-doorways`,ke.name=`dwelling-relay-rings`,Ae.name=`dwelling-structural-belts`,I.name=`dwelling-occupancy-slits`,Ne.name=`dwelling-shallow-interior-recesses`,Pe.name=`dwelling-motivated-recess-fixtures`;let L=[{index:4,kind:`courtyard-habitat`},{index:5,kind:`market-service-row`},{index:6,kind:`courtyard-habitat`},{index:7,kind:`archive-workshop`},{index:8,kind:`market-service-row`},{index:9,kind:`dock-warehouse`},{index:10,kind:`market-service-row`},{index:11,kind:`pressure-utility-house`},{index:12,kind:`dock-warehouse`},{index:13,kind:`archive-workshop`},{index:14,kind:`courtyard-habitat`},{index:17,kind:`archive-workshop`}],Ie=[],R=[],Le=[],Re=[];L.forEach(({index:t,kind:n})=>{let r=id[t],i=e.terrainHeight(r.x,r.z),a=Math.cos(r.yaw),o=-Math.sin(r.yaw),s=Math.sin(r.yaw),c=Math.cos(r.yaw),l=(e,t)=>({x:r.x+a*e+s*t,z:r.z+o*e+c*t}),u=(e,t,n,a,o,s)=>{let c=l(e,t);Ie.push({x:c.x,y:i+n,z:c.z,yaw:r.yaw,sx:a,sy:o,sz:s})},d=(e,t,n,a,o,s)=>{let c=l(e,t);R.push({x:c.x,y:i+n,z:c.z,yaw:r.yaw,sx:a,sy:o,sz:s})},f=(e,t,n,a,o,s)=>{let c=l(e,t);Le.push({x:c.x,y:i+n,z:c.z,yaw:r.yaw,sx:a,sy:o,sz:s})},p=(e,t,n,a,o,s)=>{let c=l(e,t);Re.push({x:c.x,y:i+n,z:c.z,yaw:r.yaw,sx:a,sy:o,sz:s})},m=(e,t,n=.46)=>{let r=Math.max(.62,n);for(let n=0;n<=6;n+=1){let i=l((n/6-.5)*(e-.7),-t*.5+.25);k(i.x,i.z,r)}for(let n of[-1,1])for(let i=0;i<=4;i+=1){let a=(i/4-.5)*(t-.7),o=l(n*(e*.5-.24),a);k(o.x,o.z,r)}},h=(e,t,n,a)=>{let o=l(0,t*.5+.62);Me.push({x:o.x,y:i+.09,z:o.z,yaw:r.yaw,sx:n+1.3,sy:.18,sz:1.45});for(let e of[-1,1]){let o=l(e*n*.55,t*.5+.04);je.push({x:o.x,y:i+a*.5,z:o.z,yaw:r.yaw,sx:.28,sy:a,sz:.34})}let s=l(0,t*.5+.04);return je.push({x:s.x,y:i+a,z:s.z,yaw:r.yaw,sx:n+.7,sy:.3,sz:.42}),e};if(n===`courtyard-habitat`){u(0,0,.02,7,.5,6),u(0,-2.72,2.45,6.7,4.8,.5),u(-3.25,0,2.45,.5,4.8,5.8),u(3.25,0,2.45,.5,4.8,5.8),u(0,0,4.72,7.1,.38,6.1),u(0,2.45,2.72,5.9,.32,1.35),d(0,-2.42,2.35,5.7,3.7,.14),d(-2.45,-1.1,2.55,.12,1.2,1.8),d(2.45,-1.1,2.55,.12,1.2,1.8),f(0,-.45,.72,2.15,.72,1.05),f(-2.25,.2,.46,1.45,.46,.62),f(2.25,.2,.46,1.45,.46,.62),p(0,-1.95,3.75,2.8,.12,.16),h(7,6,2.45,3.25);let e=l(0,3.12);je.push({x:e.x,y:i+3.38,z:e.z,yaw:r.yaw,sx:5.6,sy:.16,sz:.18});for(let e of[-2.6,-1.3,0,1.3,2.6]){let t=l(e,3.12);je.push({x:t.x,y:i+3.02,z:t.z,yaw:r.yaw,sx:.14,sy:.9,sz:.16})}m(7,6)}else if(n===`market-service-row`){let e=5.6;u(0,0,.02,9,.46,e),u(0,-2.55,2.05,8.7,4,.42),u(-4.18,0,2.05,.42,4,5.4),u(4.18,0,2.05,.42,4,5.4),u(0,.2,3.92,9.2,.34,6.2);for(let e of[-1.48,1.48])u(e,-.2,1.72,.24,3.25,4.35);for(let e of[-2.95,0,2.95])u(e,2.12,.9,2.45,1.38,.48),d(e,-2.3,2.05,2.35,2.75,.12),f(e,.65,1.85,1.45,1.2,.68),p(e,-2.02,3.15,1.5,.12,.16);h(9,e,3.2,3.05),m(9,e,.44)}else if(n===`pressure-utility-house`){let e=7.2,t=6.6;u(0,0,-.02,e,.62,t),u(0,-3.05,2.68,6.9,5.25,.5),u(-3.34,0,2.68,.5,5.25,6.25),u(3.34,0,2.68,.5,5.25,6.25),u(0,0,5.16,7.3,.44,6.7),u(0,2.92,1.05,5.2,.32,1.8),u(-2.05,-1.7,5.72,1.45,1.15,1.6),u(2.05,-1.7,5.72,1.45,1.15,1.6),d(0,-2.72,2.6,5.65,4.1,.14),f(-2.05,-1.35,1.35,1.25,2.3,1.2),f(0,-1.35,1.05,1.45,1.7,1.2),f(2.05,-1.35,1.35,1.25,2.3,1.2),f(0,1.15,.92,3.25,.82,.82),p(0,-2.42,4.22,3.6,.14,.18),h(e,t,2.8,3.6),m(e,t,.5)}else if(n===`dock-warehouse`){let e=7.2;u(0,0,-.06,10,.66,e),u(0,-3.32,3.1,9.65,6,.5),u(-4.72,0,3.1,.5,6,6.9),u(4.72,0,3.1,.5,6,6.9),u(0,0,6.02,10.2,.48,7.35),u(0,3.7,.56,9.6,.72,2.05),u(0,3.45,5.08,9.2,.52,.5),d(-2.35,-3.02,2.7,4.15,4.7,.14),d(2.35,-3.02,2.7,4.15,4.7,.14);for(let e of[-3.45,0,3.45])f(e,-1.65,1.05,1.55,1.85,1.3),p(e,-2.62,4.92,1.9,.13,.18);f(0,1.35,.9,3.4,.78,1.05),h(10,e,5.8,4.85),m(10,e,.54)}else{let e=6.6,t=5.2;u(0,0,-.02,e,.54,t),u(0,-2.36,2.72,6.3,5.3,.48),u(-3.05,0,2.72,.48,5.3,5),u(3.05,0,2.72,.48,5.3,5),u(0,0,5.24,6.7,.42,5.3),u(0,.15,2.82,6.05,.3,4.4),u(0,2.42,3.02,5.4,.3,1.25),d(0,-2.08,1.78,5.2,2.65,.14),d(0,-2.08,4.05,5.2,1.45,.14),f(-2.25,-1.15,1.65,.82,2.65,1.65),f(2.25,-1.15,1.65,.82,2.65,1.65),f(0,.65,.76,2.2,.72,1.05),p(0,-1.82,4.52,2.9,.13,.17),h(e,t,2.5,3.35);let n=l(0,2.98);je.push({x:n.x,y:i+3.58,z:n.z,yaw:r.yaw,sx:5.05,sy:.16,sz:.18}),m(e,t)}}),F(`dwelling-threshold-frames`,new Hi(1,1,1),m,je,!1),F(`dwelling-grounding-pads`,new Z(1,1,1,2,.06),h,Me,!1);let ze=F(`functional-building-typologies-open-room-structure`,new Hi(1,1,1),h,Ie);ze.userData.functionalTypologies=[`courtyard-habitat`,`market-service-row`,`pressure-utility-house`,`dock-warehouse`,`archive-workshop`],ze.userData.traversableInteriors=!0,ze.userData.collisionPolicy=`barrier-walls-with-open-thresholds`;let Be=F(`functional-building-deep-interior-room-planes`,new Hi(1,1,1),_,R,!1);Be.userData.collisionPolicy=`nonphysical-deep-room-interior`,Be.userData.nonPhysicalCollision=!0;let Ve=F(`functional-building-interior-furniture-and-tools`,new Hi(1,1,1),g,Le,!1);Ve.userData.fixtureRoles=[`communal-tables`,`benches`,`market-stock`,`machine-cabinets`,`warehouse-shelving`,`archive-storage`],Ve.userData.collisionPolicy=`nonphysical-readable-interior-furniture`,Ve.userData.nonPhysicalCollision=!0;let He=F(`functional-building-interior-task-lighting`,new Hi(1,1,1),C,Re,!1);He.userData.collisionPolicy=`nonphysical-motivated-interior-light`,He.userData.nonPhysicalCollision=!0,e.accentLights.push(He),e.accentLights.push(I,Pe);let Ue=[ed([.72,.95,.82,1,.65,.74,.38,.06],a,1.05,462849),ed([.82,1,.74,.88,.52,.62,.28,.04],a,-.84,462850)].map((e,t)=>new Y(e,t===0?_:f,ad.filter(e=>e.variant===t).length)),We=new Y(new Oa(1,.055,6,e.quality===`low`?18:28),y,ad.length),Ge=new Y(new Oa(1,.045,5,e.quality===`low`?16:24),m,ad.length*3),Ke=[],Je=[0,0];ad.forEach((t,n)=>{let r=e.terrainHeight(t.x,t.z);d.set(t.x,r,t.z),l.setFromEuler(new G(0,t.yaw,0)),u.set(t.radius,t.height,t.radius*.82),c.compose(d,l,u),Ue[t.variant].setMatrixAt(Je[t.variant],c),Je[t.variant]+=1,d.set(t.x,r+t.height*.64,t.z),l.setFromEuler(new G(Math.PI/2+.1,t.yaw,.12)),u.setScalar(t.radius*1.45),c.compose(d,l,u),We.setMatrixAt(n,c);for(let e=0;e<3;e+=1){let i=.19+e*.2;d.set(t.x,r+t.height*i,t.z),l.setFromEuler(new G(Math.PI/2,t.yaw,0));let a=t.radius*(1.04-e*.1);u.set(a,a*.84,1),c.compose(d,l,u),Ge.setMatrixAt(n*3+e,c)}for(let e=0;e<4;e+=1){let n=t.yaw+e/4*Math.PI*2;Ke.push({x:t.x+Math.sin(n)*t.radius*.72,y:r+t.height*.11,z:t.z+Math.cos(n)*t.radius*.72,yaw:n,sx:t.radius*.38,sy:t.height*.22,sz:t.radius*1.05})}k(t.x,t.z,t.radius*.78)});for(let e of[...Ue,We,Ge])e.instanceMatrix.needsUpdate=!0,e.castShadow=!0,e.receiveShadow=!0,r.add(e),j(e);We.castShadow=!1,Ge.castShadow=!1,Ue[0].name=`choir-tower-family-a`,Ue[1].name=`choir-tower-family-b`,We.name=`tower-relays`,Ge.name=`tower-occupied-level-bands`,F(`tower-grounding-fins`,new Hi(1,1,1),g,Ke,!1),e.accentLights.push(We);let Ye=new Y(new Oa(1,.12,7,e.quality===`low`?18:28,Math.PI),h,sd.length);sd.forEach((t,n)=>{let r=e.terrainHeight(t.x,t.z);d.set(t.x,r,t.z),l.setFromEuler(new G(0,t.yaw,0)),u.set(n<2?.001:t.radius,n<2?.001:t.height,n<2?.001:t.radius*.62),c.compose(d,l,u),Ye.setMatrixAt(n,c);let i=Math.cos(t.yaw)*t.radius,a=-Math.sin(t.yaw)*t.radius;k(t.x+i,t.z+a,.78),k(t.x-i,t.z-a,.78)}),Ye.instanceMatrix.needsUpdate=!0,Ye.castShadow=!0,Ye.receiveShadow=!0,Ye.name=`resonance-arcades`,r.add(Ye),j(Ye);let Xe=e.quality===`low`?9:13,Ze=new Y(new Gi(.26,.42,1,5),m,sd.length*Xe),Qe=new U(0,1,0),$e=new U;sd.forEach((t,n)=>{let r=e.terrainHeight(t.x,t.z);for(let e=0;e<Xe;e+=1){let i=e/(Xe-1),a=n<2,o=(a?Gu(i+Math.sin(e*2.17+n)*.014+(i>.5?.012:-.018),0,1):i)*Math.PI,s=Math.cos(o)*t.radius+(a?(i-.5)*.72:0),f=a?(i-.5)*.88+Math.sin(e*1.73+n)*.16:0;d.set(t.x+Math.cos(t.yaw)*s,r+Math.sin(o)*t.height+f,t.z-Math.sin(t.yaw)*s),$e.set(Math.cos(t.yaw)*-Math.sin(o)*t.radius,Math.cos(o)*t.height,-Math.sin(t.yaw)*-Math.sin(o)*t.radius).normalize(),l.setFromUnitVectors(Qe,$e),u.set((e===0||e===Xe-1?1.32:.92)*(a&&e%3==0?1.22:1),Math.PI*((t.radius+t.height)*.5)/(Xe-1)*(a&&e%2==0?.62:.78),a&&e%4==1?1.36:1),c.compose(d,l,u),Ze.setMatrixAt(n*Xe+e,c)}}),Ze.instanceMatrix.needsUpdate=!0,Ze.castShadow=!0,Ze.receiveShadow=!0,Ze.name=`arcade-segmented-load-ribs`,r.add(Ze),j(Ze),sd.slice(0,2).forEach((t,n)=>{let r=e.terrainHeight(t.x,t.z),a=new J(new ka(new ia(Array.from({length:11},(e,n)=>{let i=n/10,a=i*Math.PI,o=Math.cos(a)*t.radius+(i-.5)*.72+Math.sin(i*Math.PI*3)*.16;return new U(t.x+Math.cos(t.yaw)*o,r+Math.sin(a)*t.height+(i-.5)*.88,t.z-Math.sin(t.yaw)*o)})),e.quality===`low`?30:46,n===0?.1:.085,5,!1),y);a.name=`intake-asymmetric-load-tendon-${n+1}`,a.castShadow=!1,a.receiveShadow=!0,a.userData.collisionPolicy=`nonphysical-overhead-tendon`,a.userData.nonPhysicalCollision=!0,i.intake.add(a),j(a)});let et=[9.5,14.5].map((t,n)=>{let r=new J(new Oa(t,n===0?.2:.16,7,e.quality===`low`?36:56,Math.PI*(n===0?1.18:1.42)),n===0?y:g);return r.rotation.set(Math.PI/2,0,n===0?-.48:.62),r.position.set(-25,e.terrainHeight(-25,31)+.12+n*.06,31),r.receiveShadow=!0,i.forum.add(r),j(r),r});et[0].name=`forum-allocation-queue-channel`,et[1].name=`forum-asymmetric-audience-bench`,et.forEach(e=>{e.userData.collisionPolicy=`step-over`,e.userData.nonPhysicalCollision=!0});let tt=new An;tt.name=`forum-public-pressure-exchange`,tt.userData.civicFunction=`public-memory-ledger-and-reservoir-allocation`,i.forum.add(tt);let nt=e.terrainHeight(-25,31),z=new J(new Gi(4.85,5.45,1.25,12),f);z.name=`forum-central-public-service-dais`,z.position.set(-25,nt+.325,31),z.castShadow=!0,z.receiveShadow=!0,z.userData.civicFunction=`public-congregation-allocation-and-auditable-service`,z.userData.collisionPolicy=`step-over`,z.userData.nonPhysicalCollision=!0,tt.add(z),j(z);let B=new Y(new Gi(1,1.08,1,7),g,9);for(let t=0;t<9;t+=1){let n=t%3,r=Math.floor(t/3),i=-26.65+n*1.62,a=28.7+r*2.16;d.set(i,e.terrainHeight(i,a)+1.03,a),l.setFromEuler(new G(0,(n-1)*.07+(r-1)*.025,0)),u.set(1.24+(n===1?.12:0),.16,.72+r*.08),c.compose(d,l,u),B.setMatrixAt(t,c)}B.instanceMatrix.needsUpdate=!0,B.castShadow=!0,B.receiveShadow=!0,B.name=`forum-public-allocation-ledger-plates`,B.userData.collisionPolicy=`step-over`,B.userData.nonPhysicalCollision=!0,tt.add(B),j(B);let rt=new J(new Z(.42,4.95,10.5,3,.18),_);rt.name=`forum-ledger-occupied-recess`,rt.position.set(-31.2,nt+2.075,31),rt.castShadow=!0,rt.receiveShadow=!0,rt.userData.traversalBarrier=!0,rt.userData.collisionPolicy=`barrier`,tt.add(rt),j(rt);let it=new Y(ed([.26,.62,.4,.88,.48,.72,.24,.035],6,.78,15733485),m,5);[{x:-30.75,z:26.7,height:5.8,yaw:.42},{x:-31.3,z:29,height:6.8,yaw:-.2},{x:-31.55,z:31.5,height:7.4,yaw:.26},{x:-31.2,z:34,height:6.5,yaw:-.36},{x:-30.6,z:36.3,height:5.5,yaw:.5}].forEach((t,n)=>{let r=e.terrainHeight(t.x,t.z);d.set(t.x,r-.3,t.z),l.setFromEuler(new G(0,t.yaw,n*.035)),u.set(.95+n%2*.15,t.height+.3,.72),c.compose(d,l,u),it.setMatrixAt(n,c),k(t.x,t.z,.58)}),it.instanceMatrix.needsUpdate=!0,it.castShadow=!0,it.receiveShadow=!0,it.name=`forum-ledger-shell-fins`,tt.add(it),j(it);let at=[3.55,4.1,4.7,5.3,5.78],ot=new Y(new Gi(.55,.82,1,6),h,at.length),st=new Y(new Z(1,1,.12,2,.05),C,at.length),ct=[];at.forEach((t,n)=>{let r=5.2,i=Math.sin(t),a=Math.cos(t),o=-25+i*r,s=31+a*r,f=e.terrainHeight(o,s);d.set(o,f+.72,s),l.setFromEuler(new G(0,t+Math.PI,0)),u.set(.78,1.44,.72),c.compose(d,l,u),ot.setMatrixAt(n,c),d.set(o-i*.64,f+1.02,s-a*.64),u.set(.72,.24,1),c.compose(d,l,u),st.setMatrixAt(n,c);let p=-26.65+n%3*1.62,m=28.7+Math.floor(n/3)*2.16,h=o-i*.92,g=s-a*.92,_=p-h,v=m-g;ct.push({x:(h+p)*.5,y:e.terrainHeight((h+p)*.5,(g+m)*.5)+.115,z:(g+m)*.5,yaw:Math.atan2(_,v),sx:.14,sy:.035,sz:Math.hypot(_,v)})});for(let t of[-28.7,-21.3])for(let n=0;n<3;n+=1){let r=36.2+n*2.55;ct.push({x:t,y:e.terrainHeight(t,r)+.12,z:r,yaw:0,sx:.62,sy:.035,sz:2.15})}for(let e of[ot,st])e.instanceMatrix.needsUpdate=!0,e.castShadow=!0,e.receiveShadow=!0,tt.add(e),j(e);ot.name=`forum-public-allocation-consoles`,ot.userData.traversalBarrier=!0,ot.userData.collisionPolicy=`barrier`,st.name=`forum-inhabited-allocation-readouts`,st.userData.collisionPolicy=`nonphysical-fixture`,st.userData.nonPhysicalCollision=!0,e.accentLights.push(st);let lt=F(`forum-visible-allocation-transfer-channels`,new Hi(1,1,1),S,ct,!1);lt.userData.civicFunction=`routes-public-offerings-into-auditable-allocation-plates`,lt.userData.collisionPolicy=`nonphysical-surface-marking`,lt.userData.nonPhysicalCollision=!0,i.forum.attach(lt);let ut=[1.18,1.56,1.94,3.52,3.9,4.28,4.66,5.04,5.42],dt=[];for(let t=0;t<2;t+=1)ut.forEach((n,r)=>{let i=t===0?10.2:13.3,a=-25+Math.sin(n)*i,o=31+Math.cos(n)*i,s=e.terrainHeight(a,o),c=.72+t*.44;dt.push({x:a,y:s-.3+c*.5,z:o,yaw:n,sx:2.1+r%2*.2,sy:c,sz:.92}),k(a,o,.92)});let V=F(`forum-tiered-audience-and-queue-lanes`,new Z(1,1,1,2,.07),h,dt,!1);V.userData.traversalBarrier=!0,V.userData.collisionPolicy=`barrier`,V.userData.circulationBreaks=`open-northeast-arrival-and-southeast-departure-aisles`,i.forum.attach(V);let ft=F(`forum-overhead-civic-identity-frame`,new Z(1,1,1,2,.08),p,[{x:-29.1,y:nt+3.35,z:25.8,yaw:0,sx:.56,sy:7.3,sz:.72},{x:-20.9,y:nt+3.35,z:25.8,yaw:0,sx:.56,sy:7.3,sz:.72},{x:-25,y:nt+6.85,z:25.8,yaw:0,sx:8.75,sy:.58,sz:.74}]);ft.userData.traversalBarrier=!0,ft.userData.collisionPolicy=`barrier`,i.forum.attach(ft),k(-29.1,25.8,.48),k(-20.9,25.8,.48);let pt=new J(new Z(14.5,.62,7.4,3,.14),p);pt.name=`forum-continuous-public-service-canopy`,pt.position.set(-25,nt+6.24,30.5),pt.castShadow=!0,pt.receiveShadow=!0,pt.userData.collisionPolicy=`nonphysical-overhead-civic-canopy`,pt.userData.nonPhysicalCollision=!0,tt.add(pt),j(pt);let mt=F(`forum-overhead-allocation-identity-glyphs`,new Hi(1,1,1),C,Array.from({length:5},(e,t)=>({x:-27.6+t*1.3,y:nt+6.86+(t===2?.12:0),z:25.4,yaw:0,sx:t===2?.78:.5,sy:t===2?.28:.18,sz:.08})),!1);mt.userData.collisionPolicy=`nonphysical-overhead-signage`,mt.userData.nonPhysicalCollision=!0,i.forum.attach(mt);let ht=new Y(new Hi(1,1,1),C,7);for(let e=0;e<7;e+=1){let t=27.1+e*1.3;d.set(-31.18,nt+1.35+e%3*.62,t),l.identity(),u.set(1.15,.24+e%2*.1,.62),c.compose(d,l,u),ht.setMatrixAt(e,c)}ht.instanceMatrix.needsUpdate=!0,ht.name=`forum-ledger-inhabited-apertures`,ht.userData.facadeDepth=`deep-ledger-service-bays-behind-structural-fins`,ht.userData.collisionPolicy=`nonphysical-interior-bay`,ht.userData.nonPhysicalCollision=!0,tt.add(ht),j(ht),e.accentLights.push(ht);for(let e of[28.2,34.1]){let t=new Oo(10148040,2.1,7.5,2);t.name=`forum-public-ledger-bounce-${e}`,t.position.set(-29.5,nt+2.4,e),tt.add(t)}let gt=[8,14,21].map((t,n)=>{let r=new J(new Oa(t,.16+n*.04,7,e.quality===`low`?32:52,Math.PI*(n===1?1.34:1.52)),n===1?_:g);return r.rotation.set(Math.PI/2,0,[-.74,.24,.92][n]),r.position.set(-19,e.terrainHeight(-19+t,-48)+.14,-48),r.receiveShadow=!0,i.quietCourt.add(r),j(r),r});gt[0].name=`quiet-court-inner-procession`,gt[1].name=`quiet-court-middle-procession`,gt[2].name=`quiet-court-outer-procession`,gt.forEach(e=>{e.userData.collisionPolicy=`step-over`,e.userData.nonPhysicalCollision=!0});let _t=new Y(new Z(1,1,1,2,.08),h,12),vt=[],yt=[],bt=[{radius:10.4,start:.18},{radius:14.2,start:2.2},{radius:17.1,start:4.22}];for(let t=0;t<12;t+=1){let n=Math.floor(t/4),r=t%4,i=bt[n],a=i.start+r*.34,o=i.radius,s=-19+Math.sin(a)*o,f=-48+Math.cos(a)*o,p=e.terrainHeight(s,f),m=2.18+r%2*.24,h=.86+n*.44;d.set(s,p-.3+h*.5,f),l.setFromEuler(new G(0,a,0)),u.set(m,h,.92),c.compose(d,l,u),_t.setMatrixAt(t,c),vt.push({x:s,y:p-.3+h+.055,z:f,yaw:a,sx:m*.86,sy:.09,sz:.62});let g=o-1.02,_=-19+Math.sin(a)*g,v=-48+Math.cos(a)*g;yt.push({x:_,y:e.terrainHeight(_,v)+.17,z:v,yaw:a,sx:m*.94,sy:.34,sz:.28}),k(s,f,1.05)}_t.instanceMatrix.needsUpdate=!0,_t.castShadow=!0,_t.receiveShadow=!0,_t.name=`quiet-court-maintained-crescent-seating`,_t.userData.traversalBarrier=!0,_t.userData.collisionPolicy=`barrier`,i.quietCourt.add(_t),j(_t);let xt=F(`quiet-court-maintained-seat-inlays`,new Z(1,1,1,1,.05),v,vt,!1);xt.userData.collisionPolicy=`nonphysical-seat-inlay`,xt.userData.nonPhysicalCollision=!0,i.quietCourt.attach(xt);let St=F(`quiet-court-tribunal-seat-curbs`,new Hi(1,1,1),g,yt,!1);St.userData.collisionPolicy=`nonphysical-seating-curb`,St.userData.nonPhysicalCollision=!0,i.quietCourt.attach(St);let Ct=[];bt.forEach(t=>{for(let n of[t.start-.15,t.start+1.17]){let r=-19+Math.sin(n)*t.radius,i=-48+Math.cos(n)*t.radius;Ct.push({x:r,y:e.terrainHeight(r,i)+1.05,z:i,yaw:n,sx:.14,sy:2.1,sz:.14})}});let wt=F(`quiet-court-aisle-break-rails`,new Gi(1,1.18,1,6),m,Ct,!1);wt.userData.collisionPolicy=`nonphysical-aisle-boundary-fixture`,wt.userData.nonPhysicalCollision=!0,i.quietCourt.attach(wt);let Tt=e.terrainHeight(-19,-48),Et=new J(new Gi(3.05,3.38,.7,a),h);Et.name=`quiet-court-communal-witness-basin`,Et.position.set(-19,Tt+.05,-48),Et.scale.set(1.38,1,1),Et.castShadow=!0,Et.receiveShadow=!0,Et.userData.civicFunction=`maintained-social-memory-and-ritual-offerings`,Et.userData.collisionPolicy=`step-over`,Et.userData.nonPhysicalCollision=!0,i.quietCourt.add(Et),j(Et);let Dt=new J(ed([.92,1,.78,.88,.42,.08],Math.max(7,a),.36,464820),_),Ot=-50.45,kt=e.terrainHeight(-19,Ot);Dt.name=`quiet-court-institutional-witness-lectern`,Dt.position.set(-19,kt-.3,Ot),Dt.scale.set(.92,3.5,.82),Dt.castShadow=!1,Dt.receiveShadow=!0,Dt.userData.collisionPolicy=`nonphysical-tribunal-focus`,Dt.userData.nonPhysicalCollision=!0,i.quietCourt.add(Dt),j(Dt);let At=F(`quiet-court-witness-status-aperture`,new Hi(1,1,1),C,[{x:-19,y:kt+2.08,z:Ot+.82,yaw:0,sx:.46,sy:1.18,sz:.08}],!1);At.userData.collisionPolicy=`nonphysical-institutional-signage`,At.userData.nonPhysicalCollision=!0,i.quietCourt.attach(At);let jt=new Y(new Gi(.2,.36,.045,6),C,7);for(let e=0;e<7;e+=1){let t=e*2.17,n=.48+e%3*.46;d.set(-19+Math.sin(t)*n,Tt+.43,-48+Math.cos(t)*n),l.setFromEuler(new G(0,t,0)),u.setScalar(.72+e%3*.18),c.compose(d,l,u),jt.setMatrixAt(e,c)}jt.instanceMatrix.needsUpdate=!0,jt.castShadow=!1,jt.receiveShadow=!0,jt.name=`quiet-court-tended-offering-residue`,jt.userData.collisionPolicy=`nonphysical-cultural-residue`,jt.userData.nonPhysicalCollision=!0,i.quietCourt.add(jt),j(jt);let Mt=(t,n,i,a,s,f=r,p=`nonphysical`)=>{let m=new ia(n.map(([t,n])=>new U(t,e.terrainHeight(t,n)+s,n))),h=new J(new ka(m,o,i,7,!1),a);if(h.name=t,h.castShadow=!0,h.receiveShadow=!0,f.add(h),j(h),h.userData.collisionPolicy=p,p===`barrier`){let e=Math.max(1,Math.ceil(m.getLength()/3.2)),n=new Y(new Gi(1,1,1,6),T,e),r=new U(0,1,0),a=new U;for(let t=0;t<e;t+=1){let o=m.getPoint(t/e),s=m.getPoint((t+1)/e);a.copy(s).sub(o),d.copy(o).add(s).multiplyScalar(.5),l.setFromUnitVectors(r,a.clone().normalize()),u.set(i*.82,a.length(),i*.82),c.compose(d,l,u),n.setMatrixAt(t,c)}n.instanceMatrix.needsUpdate=!0,n.name=`${t}-segmented-collision-proxy`,n.userData.traversalBarrier=!0,n.userData.collisionPolicy=`barrier`,n.userData.collisionProxyFor=t,n.visible=!1,f.add(n)}else h.userData.nonPhysicalCollision=!0;return h};Mt(`forum-reservoir-conduit`,[[-9,9],[-17,6],[-18,15],[-23,23],[-25,31]],.19,E,.16,i.forum,`step-over`),Mt(`breathworks-feed-line`,[[-9,9],[-2,18],[17,17],[34,10],[48,7],[59,11],[64,9]],.26,y,1.15,i.breathworks,`barrier`),Mt(`quiet-court-return-line`,[[34,-8],[22,-27],[3,-42],[-19,-48],[-29,-66],[-30,-84],[-24,-100],[-15,-108]],.24,y,.58,i.quietCourt,`barrier`),[[{x:-17,z:6,elevation:-4.2},{x:-18,z:16,elevation:-3.8},{x:-25,z:31,elevation:-2.8}],[{x:52,z:-51,elevation:-1.1},{x:45,z:-33,elevation:1.8},{x:34,z:-8,elevation:5.4}]].forEach((t,n)=>{let i=new J(rd(t,n===0?1.7:2.1,e.terrainHeight,.11),E);i.name=`constructed-water-channel-${n+1}`,i.userData.collisionPolicy=`nonphysical-fluid`,i.userData.nonPhysicalCollision=!0,i.renderOrder=2,r.add(i)});let Pt=new J(new Wi(1,e.quality===`low`?24:e.quality===`high`?36:48),E);Pt.name=`forum-ground-reservoir`,Pt.userData.collisionPolicy=`nonphysical-fluid`,Pt.userData.nonPhysicalCollision=!0,Pt.rotation.x=-Math.PI/2,Pt.scale.set(8.6,6.2,1),Pt.position.set(-17,e.terrainHeight(-17,6)+.13,6),Pt.renderOrder=2,i.forum.add(Pt);let Ft=new U(-23,0,13),W=new U(-9,0,1),It=W.clone().sub(Ft),Lt=Math.hypot(It.x,It.z),Rt=Math.atan2(It.x,It.z),zt=new Y(new Z(1,1,1,2,.08),g,6);for(let t=0;t<6;t+=1){let n=(t+.5)/6,r=Ku(Ft.x,W.x,n),i=Ku(Ft.z,W.z,n);d.set(r,e.terrainHeight(r,i)+.19,i),l.setFromEuler(new G(0,Rt,0)),u.set(t===0||t===5?4.2:3.5,.24,Lt/6*.92),c.compose(d,l,u),zt.setMatrixAt(t,c)}zt.instanceMatrix.needsUpdate=!0,zt.castShadow=!0,zt.receiveShadow=!0,zt.name=`reservoir-ground-level-ramp-deck`,zt.userData.traversalSurface=!0,i.forum.add(zt),j(zt);let Bt=[],Vt=Math.cos(Rt),Ht=-Math.sin(Rt);for(let t=0;t<=6;t+=1){let n=t/6,r=Ku(Ft.x,W.x,n),i=Ku(Ft.z,W.z,n);for(let t of[-1,1]){let n=r+Vt*t*1.55,a=i+Ht*t*1.55;Bt.push({x:n,y:e.terrainHeight(r,i)+.86,z:a})}}let Ut=new Y(new Gi(.08,.13,1,6),m,Bt.length);Bt.forEach((e,t)=>{d.set(e.x,e.y,e.z),l.identity(),u.set(1,1.35,1),c.compose(d,l,u),Ut.setMatrixAt(t,c)}),Ut.instanceMatrix.needsUpdate=!0,Ut.castShadow=!0,Ut.name=`reservoir-bridge-posts`,Ut.userData.traversalBarrier=!0,i.forum.add(Ut),j(Ut);let Wt=new Y(new Gi(1,1,1,6),y,12),Gt=new U,Kt=new U(0,1,0);for(let t=0;t<6;t+=1)for(let n=0;n<2;n+=1){let r=n===0?-1:1,i=t/6,a=(t+1)/6,o=new U(Ku(Ft.x,W.x,i)+Vt*r*1.55,0,Ku(Ft.z,W.z,i)+Ht*r*1.55),s=new U(Ku(Ft.x,W.x,a)+Vt*r*1.55,0,Ku(Ft.z,W.z,a)+Ht*r*1.55);o.y=e.terrainHeight(Ku(Ft.x,W.x,i),Ku(Ft.z,W.z,i))+1.52,s.y=e.terrainHeight(Ku(Ft.x,W.x,a),Ku(Ft.z,W.z,a))+1.52,Gt.copy(s).sub(o),d.copy(o).add(s).multiplyScalar(.5),l.setFromUnitVectors(Kt,Gt.clone().normalize()),u.set(.055,Gt.length(),.055),c.compose(d,l,u),Wt.setMatrixAt(t*2+n,c)}Wt.instanceMatrix.needsUpdate=!0,Wt.castShadow=!0,Wt.name=`reservoir-bridge-handrails`,Wt.userData.traversalBarrier=!0,i.forum.add(Wt),j(Wt);let qt=[.08,.92].map(t=>{let n=Ku(Ft.x,W.x,t),r=Ku(Ft.z,W.z,t);return{x:n+Vt*2.1,y:e.terrainHeight(n,r)+.62,z:r+Ht*2.1,yaw:Rt,sx:.55,sy:1.2,sz:.42}}),Jt=F(`reservoir-access-controls`,new Z(1,1,1,2,.08),C,qt);Jt.userData.traversalBarrier=!0,Jt.userData.collisionPolicy=`barrier`,e.accentLights.push(Jt);let Yt=new An;Yt.name=`constructed-reservoir-cargo-bay`,Yt.userData.civicFunction=`shoreline-loading-mooring-and-water-allocation-logistics`,i.forum.add(Yt);let Xt=[{x:-26.1,z:2.1,yaw:0,sx:.8,sz:2.4},{x:-26.2,z:5.2,yaw:0,sx:.8,sz:2.4},{x:-26.1,z:8.3,yaw:0,sx:.8,sz:2.4},{x:-25.7,z:11.2,yaw:-.18,sx:.8,sz:2.1},{x:-8.1,z:3,yaw:0,sx:.8,sz:2.3},{x:-7.9,z:6.2,yaw:0,sx:.8,sz:2.3},{x:-8.2,z:9.5,yaw:.12,sx:.8,sz:2.2},{x:-21.2,z:-.1,yaw:Math.PI/2,sx:.8,sz:2.4},{x:-17.5,z:-.35,yaw:Math.PI/2,sx:.8,sz:2.4},{x:-13.8,z:-.15,yaw:Math.PI/2,sx:.8,sz:2.4},{x:30,z:-26,yaw:0,sx:.9,sz:3.35},{x:30,z:-22,yaw:0,sx:.9,sz:3.35},{x:30,z:-18,yaw:0,sx:.9,sz:3.35},{x:30,z:-4,yaw:0,sx:.9,sz:3.35},{x:30,z:0,yaw:0,sx:.9,sz:3.35},{x:30,z:4,yaw:0,sx:.9,sz:3.35}].map(t=>({x:t.x,y:e.terrainHeight(t.x,t.z)+.2,z:t.z,yaw:t.yaw,sx:t.sx,sy:1.25,sz:t.sz})),Zt=F(`reservoir-bay-engineered-shore-bulkheads`,new Z(1,1,1,2,.08),h,Xt);Zt.userData.traversalBarrier=!0,Zt.userData.collisionPolicy=`barrier`,Yt.attach(Zt),Xt.forEach(e=>k(e.x,e.z,.48));let Qt=F(`reservoir-bay-loading-platforms`,new Z(1,1,1,2,.08),g,[{x:-27.6,z:6.4,yaw:.02,sx:3.4,sz:8.2},{x:-6.8,z:6.5,yaw:-.03,sx:3.4,sz:7.4},{x:32.2,z:-22,yaw:0,sx:4.2,sz:9.2},{x:32.2,z:1,yaw:0,sx:4.2,sz:9.2}].map(t=>({x:t.x,y:e.terrainHeight(t.x,t.z)+.04,z:t.z,yaw:t.yaw,sx:t.sx,sy:.58,sz:t.sz})),!1);Qt.userData.traversalSurface=!0,Qt.userData.collisionPolicy=`step-over`,Yt.attach(Qt);let $t=F(`reservoir-bay-luminous-fluid-berths`,new Z(1,1,1,2,.08),E,[{x:27.25,z:-22},{x:27.25,z:1}].map(t=>({x:t.x,y:e.terrainHeight(t.x,t.z)+.18,z:t.z,yaw:0,sx:7.2,sy:.08,sz:10.8})),!1);$t.userData.collisionPolicy=`nonphysical-reservoir-berth-surface`,$t.userData.nonPhysicalCollision=!0,$t.renderOrder=2,Yt.attach($t);let en=[{x:-28.2,z:6.4,direction:1,span:3.5},{x:-6.2,z:6.5,direction:-1,span:3.5},{x:34,z:-7,direction:-1,span:14.5},{x:25,z:7,direction:1,span:5.2}],tn=[];en.forEach(t=>{let n=e.terrainHeight(t.x,t.z);for(let e of[-t.span*.5,t.span*.5])tn.push({x:t.x,y:n+2.55,z:t.z+e,yaw:0,sx:.48,sy:5.6,sz:.48}),k(t.x,t.z+e,.42);tn.push({x:t.x,y:n+5.25,z:t.z,yaw:0,sx:.58,sy:.46,sz:t.span+.62},{x:t.x+t.direction*2.65,y:n+5.5,z:t.z,yaw:Math.PI/2,sx:.34,sy:.36,sz:5.7})});let rn=F(`reservoir-bay-twin-loading-gantries`,new Hi(1,1,1),p,tn);rn.userData.traversalBarrier=!0,rn.userData.collisionPolicy=`barrier`,Yt.attach(rn);let an=[];en.forEach(t=>{let n=e.terrainHeight(t.x,t.z);an.push({x:t.x+t.direction*4.6,y:n+4.05,z:t.z,yaw:0,sx:.08,sy:2.9,sz:.08},{x:t.x+t.direction*4.6,y:n+2.56,z:t.z,yaw:0,sx:.32,sy:.22,sz:.32})});let on=F(`reservoir-bay-hoist-cables-and-hooks`,new Gi(1,1,1,6),y,an,!1);on.userData.collisionPolicy=`nonphysical-overhead-hoist`,on.userData.nonPhysicalCollision=!0,Yt.attach(on);let sn=F(`reservoir-bay-mooring-posts`,new Gi(.64,1,1,7),m,[[-24.9,2.1],[-24.8,9.8],[-25.3,12.3],[-12.5,11.4],[-9.6,9.6],[-7.2,3],[30.9,-24],[30.9,-20],[30.9,-2],[30.9,2]].map(([t,n],r)=>({x:t,y:e.terrainHeight(t,n)+.62,z:n,yaw:r*.28,sx:.38,sy:1.5,sz:.38})),!1);sn.userData.collisionPolicy=`nonphysical-mooring-fixture`,sn.userData.nonPhysicalCollision=!0,Yt.attach(sn);let cn=[[-30.2,2.8],[-30.4,6.1],[-30.1,9.4],[-4.1,3.1],[-3.9,7],[-4.3,10.2],[25.8,-28],[25.8,-24],[25.8,2.3],[25.8,6.3]],ln=F(`reservoir-bay-ribbed-storage-cells`,new Z(1,1,1,2,.08),g,cn.map(([t,n],r)=>({x:t,y:e.terrainHeight(t,n)+.72,z:n,yaw:r%2==0?.06:-.08,sx:1.55,sy:1.45+r%3*.18,sz:2.15})),!1);ln.userData.traversalBarrier=!0,ln.userData.collisionPolicy=`barrier`,Yt.attach(ln),cn.forEach(([e,t])=>k(e,t,.92));let un=e.terrainHeight(43,-5),dn=un+5.25,fn=un+4.15,pn=new J(new Z(2.6,.42,21,3,.12),h);pn.position.set(40.65,fn,-5),pn.castShadow=!0,pn.receiveShadow=!0,pn.name=`breathworks-elevated-circulation-tier`,pn.userData.traversalSurface=!0,pn.userData.traversalCeiling=!0,pn.userData.accessRoute=`breathworks-gantry-vertebral-access-ramp`,i.breathworks.add(pn),j(pn);let mn=new Y(new Z(1,1,1,2,.07),g,9);for(let t=0;t<7;t+=1){let n=-14+t*3;d.set(43,e.terrainHeight(43,n)+.105,n),l.identity(),u.set(6.8,.2,2.68),c.compose(d,l,u),mn.setMatrixAt(t,c)}for(let t=0;t<2;t+=1){let n=t===0?-16.5:6.5;d.set(42.3,e.terrainHeight(42.3,n)+.08,n),l.setFromEuler(new G(t===0?-.035:.035,0,0)),u.set(5.4,.16,3.2),c.compose(d,l,u),mn.setMatrixAt(7+t,c)}mn.instanceMatrix.needsUpdate=!0,mn.castShadow=!0,mn.receiveShadow=!0,mn.name=`breathworks-open-bay-floor-and-exits`,mn.userData.traversalSurface=!0,mn.userData.accessRoute=`terrain-flush-north-and-south-exits`,i.breathworks.add(mn),j(mn);let hn=new U(31,0,-26),gn=new U(39.35,0,-14.2),_n=e.terrainHeight(hn.x,hn.z)+.18,vn=fn+.21,yn=Math.max(0,vn-_n),bn=Math.hypot(gn.x-hn.x,gn.z-hn.z),xn=Math.max(9,Math.ceil(yn/.31)+1,Math.ceil(bn/.86)+1),Sn=Math.atan2(gn.x-hn.x,gn.z-hn.z),Cn=new Y(new Gi(1,1.08,1,7),g,xn),wn=new Y(ed([.42,.78,1,.62,.08],6,.44,435313),v,xn);for(let t=0;t<xn;t+=1){let n=t/(xn-1),r=Ku(hn.x,gn.x,n),i=Ku(hn.z,gn.z,n),a=Ku(_n,vn+.015,n);d.set(r,a-.09,i),l.setFromEuler(new G(0,Sn+Math.sin(t*1.7)*.025,0)),u.set(1.42+t%3*.08,.18,1.05+(t+1)%3*.08),c.compose(d,l,u),Cn.setMatrixAt(t,c);let o=e.terrainHeight(r,i),s=Math.max(.12,a-.18-o);d.set(r,o,i),l.setFromEuler(new G(0,Sn+t*.41,0)),u.set(.56,s,.5),c.compose(d,l,u),wn.setMatrixAt(t,c)}Cn.instanceMatrix.needsUpdate=!0,Cn.castShadow=!0,Cn.receiveShadow=!0,Cn.name=`breathworks-gantry-vertebral-access-ramp`,Cn.userData.traversalSurface=!0,Cn.userData.accessRoute=`ground-to-breathworks-gantry`,i.breathworks.add(Cn),j(Cn),wn.instanceMatrix.needsUpdate=!0,wn.castShadow=!0,wn.receiveShadow=!0,wn.name=`breathworks-ramp-foundation-roots`,wn.userData.traversalSurface=!0,wn.userData.collisionPolicy=`support`,i.breathworks.add(wn),j(wn);let Tn=[];for(let e of[39.32,41.98]){Tn.push({x:e,y:fn+1.04,z:-5,yaw:0,sx:.11,sy:.12,sz:20.2});for(let t=0;t<6;t+=1)Tn.push({x:e,y:fn+.62,z:-14.2+t*3.68,yaw:0,sx:.13,sy:1.3,sz:.13})}let En=F(`breathworks-maintenance-gallery-rails`,new Hi(1,1,1),m,Tn,!1);En.userData.collisionPolicy=`nonphysical-gallery-safety-rail`,En.userData.nonPhysicalCollision=!0,i.breathworks.attach(En);let Dn=41.7,On=4.85,kn=e.terrainHeight(Dn,On),jn=Math.max(2.4,fn-kn-.15),Mn=[{x:Dn-.56,y:kn+jn*.5,z:On,yaw:0,sx:.12,sy:jn,sz:.14},{x:Dn+.56,y:kn+jn*.5,z:On,yaw:0,sx:.12,sy:jn,sz:.14},...Array.from({length:8},(e,t)=>({x:Dn,y:kn+.42+t*((jn-.65)/7),z:On-.02,yaw:0,sx:1.18,sy:.09,sz:.12}))],Nn=F(`breathworks-secondary-gallery-access-ladder`,new Hi(1,1,1),g,Mn,!1);Nn.userData.accessRoute=`ground-service-lane-to-maintenance-gallery`,Nn.userData.collisionPolicy=`nonphysical-climb-signifier`,Nn.userData.nonPhysicalCollision=!0,i.breathworks.attach(Nn);let Pn=new Gi(.42,.68,1,a),Fn=[[39.9,-14],[46.1,-14],[46.1,-9.5],[46.1,-5],[39.9,4],[46.1,4]],In=new Y(Pn,g,Fn.length);Fn.forEach(([t,n],r)=>{let i=e.terrainHeight(t,n),a=.35,o=dn-i+a;d.set(t,i-a+o*.5,n),l.setFromEuler(new G(0,r%2*Math.PI*.25,0)),u.set(1,o,1),c.compose(d,l,u),In.setMatrixAt(r,c),k(t,n,.66)}),In.instanceMatrix.needsUpdate=!0,In.castShadow=!0,In.receiveShadow=!0,In.name=`breathworks-open-bay-load-columns`,In.userData.traversalBarrier=!0,i.breathworks.add(In),j(In);let Ln=[],Rn=[];for(let t=0;t<4;t+=1){let n=-13.1+t*5.4;t!==2&&(Ln.push({x:46.5,y:e.terrainHeight(46.5,n)+2.05,z:n,yaw:0,sx:.28,sy:3.8,sz:4.35}),A(46.5,n,0,4.35,.42)),Rn.push({x:43,y:dn-.34,z:n,yaw:0,sx:6.9,sy:.32,sz:.34})}let zn=F(`breathworks-service-spine-panels`,new Z(1,1,1,2,.08),f,Ln);zn.userData.traversalBarrier=!0,i.breathworks.attach(zn);let Bn=F(`breathworks-roof-crossbeams`,new Z(1,1,1,2,.08),m,Rn);Bn.userData.traversalCeiling=!0,i.breathworks.attach(Bn);let Vn=[],Hn=[];[-11.5,-7.8,-1.9,2.1].forEach((t,n)=>{let r=-5+t,i=e.terrainHeight(45.95,r);Vn.push({x:45.92,y:i+(n%2==0?1.05:.82),z:r,yaw:0,sx:.68,sy:n%2==0?1.9:1.35,sz:n%2==0?2.1:1.55}),Hn.push({x:45.54,y:i+(n%2==0?1.35:.92),z:r,yaw:Math.PI/2,sx:.11,sy:.16,sz:n%2==0?1.25:.82})});let Un=F(`breathworks-service-anatomy`,new Z(1,1,1,2,.09),_,Vn);Un.userData.traversalBarrier=!0,Un.userData.collisionPolicy=`barrier`,i.breathworks.attach(Un);let Wn=F(`breathworks-inhabited-status-slits`,new Z(1,1,1,1,.04),C,Hn);i.breathworks.attach(Wn),e.accentLights.push(Wn);let Gn=new J(new Z(3.8,.18,1.25,2,.08),m);Gn.name=`breathworks-inhabited-workbench`,Gn.position.set(42.65,e.terrainHeight(42.65,.8)+1.1,.8),Gn.castShadow=!0,Gn.receiveShadow=!0,Gn.userData.traversalBarrier=!0,Gn.userData.collisionPolicy=`barrier`,i.breathworks.add(Gn),j(Gn);let Kn=e.terrainHeight(42.65,.8),qn=F(`breathworks-workbench-root-legs`,new Gi(.42,.62,1,5),g,[-1.35,1.35].map(e=>({x:42.65+e,y:Kn+.51,z:.8,yaw:e<0?-.18:.18,sx:.44,sy:1.02,sz:.52})));qn.userData.traversalBarrier=!0,qn.userData.collisionPolicy=`barrier`,i.breathworks.attach(qn);let Jn=[{x:43.7,z:-10.8,height:2.65,radius:1.18,phase:0},{x:43.65,z:-5,height:3.35,radius:1.26,phase:2.15},{x:43.7,z:3.55,height:2.85,radius:1.2,phase:4.3}].map(t=>({...t,base:e.terrainHeight(t.x,t.z)})),Yn=new Y(ed([.7,1,.74,1.04,.72,1,.68,.28],Math.max(7,a),.3,12456197),v,Jn.length),Xn=new Y(new Gi(1,1.22,1,6),m,Jn.length);Yn.instanceMatrix.setUsage(qe),Xn.instanceMatrix.setUsage(qe);let Zn=new nn,Qn=new U,$n=new Nt,er=new U,tr=e=>{Jn.forEach((t,n)=>{let r=Math.sin(e*1.42+t.phase)*.055,i=t.height*(1+r),a=.3;Qn.set(t.x,t.base-a,t.z),$n.setFromEuler(new G(0,n*.43-.25,0)),er.set(t.radius*(1-r*.42),i+a,t.radius*(1-r*.42)),Zn.compose(Qn,$n,er),Yn.setMatrixAt(n,Zn);let o=1.22-r*t.height*.72;Qn.set(t.x,t.base+i+o*.5-.1,t.z),$n.identity(),er.set(.24,o,.24),Zn.compose(Qn,$n,er),Xn.setMatrixAt(n,Zn)}),Yn.instanceMatrix.needsUpdate=!0,Xn.instanceMatrix.needsUpdate=!0};tr(0),Yn.onBeforeRender=()=>{tr((typeof performance>`u`?Date.now():performance.now())*.001)},Yn.castShadow=!0,Yn.receiveShadow=!0,Yn.name=`breathworks-active-counterphase-bellows`,Yn.userData.cityMotion=`three-phase-respiratory-compression-cycle`,Yn.userData.traversalBarrier=!0,Yn.userData.collisionPolicy=`barrier`,Xn.castShadow=!1,Xn.receiveShadow=!0,Xn.name=`breathworks-visible-piston-strokes`,Xn.userData.collisionPolicy=`nonphysical-moving-mechanism`,Xn.userData.nonPhysicalCollision=!0,i.breathworks.add(Yn,Xn),j(Yn),j(Xn),Jn.forEach(e=>k(e.x,e.z,.92));let nr=F(`breathworks-bellows-ground-saddles`,new Gi(1,1.18,1,8),g,Jn.map((e,t)=>({x:e.x,y:e.base+.015,z:e.z,yaw:t*.31,sx:e.radius*1.36,sy:.34,sz:e.radius*1.36})),!1);nr.userData.traversalBarrier=!0,nr.userData.collisionPolicy=`support`,i.breathworks.attach(nr);let rr=(t,n,r)=>new U(t,e.terrainHeight(t,n)+r,n),ir=[[rr(45.55,-12.35,3.85),rr(45.55,4.75,3.85)],[rr(48,7,1.55),rr(45.55,4.75,3.85)],...Jn.map(e=>[rr(45.55,e.z,3.85),new U(e.x,e.base+e.height+.55,e.z)])],ar=new Y(new Gi(1,1,1,6),y,ir.length);ir.forEach(([e,t],n)=>{Gt.copy(t).sub(e),d.copy(e).add(t).multiplyScalar(.5),l.setFromUnitVectors(Kt,Gt.clone().normalize());let r=n<2?.17:.12;u.set(r,Gt.length(),r),c.compose(d,l,u),ar.setMatrixAt(n,c)}),ar.instanceMatrix.needsUpdate=!0,ar.castShadow=!1,ar.receiveShadow=!0,ar.name=`breathworks-connected-feed-manifold`,ar.userData.collisionPolicy=`nonphysical-overhead-service`,ar.userData.nonPhysicalCollision=!0,i.breathworks.add(ar),j(ar);let or=new Gi(1,1,.12,12);or.rotateZ(Math.PI/2);let sr=new Y(or,_,Jn.length),cr=[];Jn.forEach((t,n)=>{d.set(45.28,e.terrainHeight(45.28,t.z)+2.55,t.z),l.identity(),u.setScalar(.62+n*.05),c.compose(d,l,u),sr.setMatrixAt(n,c),cr.push({x:45.17,y:e.terrainHeight(45.17,t.z)+2.55,z:t.z,yaw:0,sx:.08,sy:.52,sz:.055},{x:45.12,y:e.terrainHeight(45.12,t.z-.42)+1.42,z:t.z-.42,yaw:0,sx:.07,sy:.1,sz:.28},{x:45.12,y:e.terrainHeight(45.12,t.z+.42)+1.42,z:t.z+.42,yaw:0,sx:.07,sy:.1,sz:.28})}),sr.instanceMatrix.needsUpdate=!0,sr.castShadow=!1,sr.receiveShadow=!0,sr.name=`breathworks-pressure-meter-faces`,sr.userData.collisionPolicy=`nonphysical-service-fixture`,sr.userData.nonPhysicalCollision=!0,i.breathworks.add(sr),j(sr);let lr=F(`breathworks-meter-needles-and-live-status-slits`,new Hi(1,1,1),C,cr,!1);lr.userData.collisionPolicy=`nonphysical-instrument-readout`,lr.userData.nonPhysicalCollision=!0,i.breathworks.attach(lr);let ur=F(`breathworks-kept-clear-maintenance-lane`,new Hi(1,1,1),S,Array.from({length:6},(t,n)=>{let r=-12.2+n*3;return{x:40.95,y:e.terrainHeight(40.95,r)+.125,z:r,yaw:0,sx:.2,sy:.025,sz:1.02}}),!1);ur.userData.accessRoute=`unobstructed-ramp-to-service-bay-and-south-exit`,ur.userData.collisionPolicy=`nonphysical-surface-marking`,ur.userData.nonPhysicalCollision=!0,i.breathworks.attach(ur);let dr=F(`breathworks-organized-maintenance-trays`,new Z(1,1,1,1,.04),g,[[-1.18,-.28],[-.42,.25],[.48,-.24],[1.22,.24]].map(([e,t],n)=>({x:42.65+e,y:Kn+1.25,z:.8+t,yaw:n%2==0?-.08:.11,sx:.48,sy:.12,sz:.38})),!1);dr.userData.collisionPolicy=`nonphysical-maintenance-tools`,dr.userData.nonPhysicalCollision=!0,i.breathworks.attach(dr);let fr=new Gi(1.46,1.68,.86,12);fr.rotateZ(Math.PI/2);let pr=new Y(fr,h,Jn.length),mr=new Oa(1.05,.16,6,18);mr.rotateY(Math.PI/2);let hr=new Y(mr,C,Jn.length);Jn.forEach((e,t)=>{let n=e.base+2.25;d.set(45.18,n,e.z),l.setFromEuler(new G(0,0,t*.04)),u.setScalar(.96+t*.055),c.compose(d,l,u),pr.setMatrixAt(t,c),d.set(44.72,n,e.z),l.identity(),u.setScalar(.92+t*.045),c.compose(d,l,u),hr.setMatrixAt(t,c)}),pr.instanceMatrix.needsUpdate=!0,pr.castShadow=!0,pr.receiveShadow=!0,pr.name=`breathworks-three-turbine-filter-housings`,pr.userData.traversalBarrier=!0,pr.userData.collisionPolicy=`barrier`,hr.instanceMatrix.needsUpdate=!0,hr.castShadow=!1,hr.receiveShadow=!0,hr.name=`breathworks-visible-filter-intake-rings`,hr.userData.collisionPolicy=`nonphysical-rotor-filter-face`,hr.userData.nonPhysicalCollision=!0,i.breathworks.add(pr,hr),j(pr),j(hr);let gr=Jn.map((t,n)=>({x:48.35,z:t.z,base:e.terrainHeight(48.35,t.z),height:[8.4,10.6,9.2][n]})),_r=new Y(ed([.9,1,.82,.94,.78,.88,.68],8,.18,15179863),g,gr.length),vr=new Oa(.84,.13,6,14);vr.rotateX(Math.PI/2);let yr=new Y(vr,m,gr.length);gr.forEach((e,t)=>{d.set(e.x,e.base-.4,e.z),l.setFromEuler(new G(0,t*.36,0)),u.set(.82,e.height+.4,.82),c.compose(d,l,u),_r.setMatrixAt(t,c),d.set(e.x,e.base+e.height,e.z),l.identity(),u.setScalar(1),c.compose(d,l,u),yr.setMatrixAt(t,c),k(e.x,e.z,.62)}),_r.instanceMatrix.needsUpdate=!0,_r.castShadow=!0,_r.receiveShadow=!0,_r.name=`breathworks-functional-exhaust-stacks`,_r.userData.traversalBarrier=!0,_r.userData.collisionPolicy=`barrier`,yr.instanceMatrix.needsUpdate=!0,yr.castShadow=!1,yr.receiveShadow=!0,yr.name=`breathworks-exhaust-stack-collars`,yr.userData.collisionPolicy=`nonphysical-overhead-fixture`,yr.userData.nonPhysicalCollision=!0,i.breathworks.add(_r,yr),j(_r),j(yr);let br=[];Jn.forEach((e,t)=>{let n=gr[t];br.push([new U(45.72,e.base+3.1,e.z),new U(46.75,e.base+5.15,e.z)],[new U(46.75,e.base+5.15,e.z),new U(n.x,n.base+Math.min(6.2,n.height*.68),n.z)])}),br.push([new U(46.75,e.terrainHeight(46.75,-11.8)+5.15,-11.8),new U(46.75,e.terrainHeight(46.75,4.45)+5.15,4.45)]);let q=new Y(new Gi(1,1,1,8),y,br.length);br.forEach(([e,t],n)=>{Gt.copy(t).sub(e),d.copy(e).add(t).multiplyScalar(.5),l.setFromUnitVectors(Kt,Gt.clone().normalize());let r=n===br.length-1?.42:.31;u.set(r,Gt.length(),r),c.compose(d,l,u),q.setMatrixAt(n,c)}),q.instanceMatrix.needsUpdate=!0,q.castShadow=!1,q.receiveShadow=!0,q.name=`breathworks-large-supply-and-exhaust-duct-trunks`,q.userData.collisionPolicy=`nonphysical-overhead-industrial-duct`,q.userData.nonPhysicalCollision=!0,i.breathworks.add(q),j(q);for(let e=0;e<1;e+=1){let t=new Oo(13098108,5.5,11,2);t.name=`breathworks-local-bounce-${e+1}`,t.position.set(42,un+3.3,-9+e*8),i.breathworks.add(t)}let xr=ed([.76,1,.92,.94,.74,.38,.08],a,.55,741031),Sr=[{x:52,z:4,height:13,radius:3.2},{x:53,z:-10,height:17,radius:3.7},{x:43,z:-18,height:11,radius:2.8}],Cr=new Y(xr,v,Sr.length);Sr.forEach((t,n)=>{let r=e.terrainHeight(t.x,t.z),i=.35;d.set(t.x,r-i,t.z),l.setFromEuler(new G(0,n*.8,0)),u.set(t.radius,t.height+i,t.radius),c.compose(d,l,u),Cr.setMatrixAt(n,c),k(t.x,t.z,t.radius*.62)}),Cr.instanceMatrix.needsUpdate=!0,Cr.castShadow=!0,Cr.receiveShadow=!0,Cr.name=`breathworks-pressure-organs`,i.breathworks.add(Cr),j(Cr);let wr=[{x:1,z:-88,width:8.5,depth:4.2},{x:1.2,z:-94,width:11.5,depth:4.8},{x:1.5,z:-100.5,width:15.5,depth:5.2},{x:1.8,z:-107.5,width:19.5,depth:5.8},{x:2,z:-115,width:24,depth:6.2}],Tr=new Y(new Z(1,1,1,2,.09),p,wr.length),Er=[new K(12699837),new K(13815739),new K(12109761)];wr.forEach((t,n)=>{let r=e.terrainHeight(t.x,t.z),i=.55+n*.0355;d.set(t.x,r-.3+i*.5,t.z),l.identity(),u.set(t.width,i,t.depth),c.compose(d,l,u),Tr.setMatrixAt(n,c),Tr.setColorAt(n,Er[n%Er.length])}),Tr.instanceMatrix.needsUpdate=!0,Tr.instanceColor&&(Tr.instanceColor.needsUpdate=!0),Tr.castShadow=!0,Tr.receiveShadow=!0,Tr.name=`suture-crown-stepped-approach`,Tr.userData.traversalSurface=!0,Tr.userData.accessRoute=`terrain-connected-suture-crown-ground-approach`,i.crown.add(Tr),j(Tr);let Dr=Array.from({length:10},(e,t)=>{let n=-80.2-t*3.45;return{x:Ku(-7,2,Gu((-78-n)/34,0,1)),z:n,width:6.4+t*.9,depth:2.42}}),Or=F(`suture-crown-modular-processional-deck`,new Z(1,1,1,2,.06),p,Dr.map(t=>({x:t.x,y:e.terrainHeight(t.x,t.z)+.22,z:t.z,yaw:0,sx:t.width,sy:.36,sz:t.depth})),!1);Or.userData.traversalSurface=!0,Or.userData.accessRoute=`constructed-crown-processional-deck`,Or.userData.collisionPolicy=`step-over`,Or.userData.nonPhysicalCollision=!0,i.crown.attach(Or);let kr=F(`suture-crown-processional-edge-curbs`,new Hi(1,1,1),m,[...Dr,...wr].flatMap(t=>[-1,1].map(n=>({x:t.x+n*(t.width*.5-.24),y:e.terrainHeight(t.x,t.z)+.64,z:t.z,yaw:0,sx:.48,sy:.78,sz:t.depth*.92}))),!1);kr.userData.collisionPolicy=`nonphysical-processional-route-edge`,kr.userData.nonPhysicalCollision=!0,i.crown.attach(kr);let Ar=ad.slice(4).map(e=>({x:e.x,z:e.z,radius:e.radius*1.45})),jr=new Y(new Gi(1,1.2,1,a),g,Ar.length);Ar.forEach((t,n)=>{let r=e.terrainHeight(t.x,t.z);d.set(t.x,r+.7,t.z),l.setFromEuler(new G(0,n*.31,0)),u.set(t.radius,2.2,t.radius),c.compose(d,l,u),jr.setMatrixAt(n,c)}),jr.instanceMatrix.needsUpdate=!0,jr.castShadow=!0,jr.receiveShadow=!0,jr.name=`suture-crown-tower-foundations`,i.crown.add(jr),j(jr);let Mr=e.terrainHeight(2,-102),Nr=[{x:-4.2,y:Mr+4,z:-102,yaw:0,sx:2,sy:8.8,sz:2.3},{x:8.2,y:Mr+4,z:-102,yaw:0,sx:2,sy:8.8,sz:2.3},{x:2,y:Mr+8.25,z:-102,yaw:0,sx:14.2,sy:1.05,sz:2.2},{x:-7.2,y:Mr+2.35,z:-102.7,yaw:.18,sx:1,sy:5.5,sz:3.8},{x:11.2,y:Mr+2.35,z:-102.7,yaw:-.18,sx:1,sy:5.5,sz:3.8}],Pr=F(`suture-crown-assembled-threshold`,new Z(1,1,1,3,.12),f,Nr);Pr.userData.traversalBarrier=!0,i.crown.attach(Pr),k(-4.2,-102,1.1),k(8.2,-102,1.1),k(-7.2,-102.7,.7),k(11.2,-102.7,.7);let Fr=[[-3.15,-101.82],[7.15,-101.82],[-8,-102.3],[12,-102.3]].map(([e,t],n)=>({x:e,y:Mr+(n<2?4.4:2.8),z:t,yaw:0,sx:n<2?.18:.14,sy:n<2?2.9:1.8,sz:.18})),Ir=F(`suture-crown-signal-apertures`,new Z(1,1,1,1,.04),C,Fr);i.crown.attach(Ir),e.accentLights.push(Ir);let Lr=new J(new Z(27.5,.72,2.1,3,.12),_);Lr.name=`suture-crown-occupied-skybridge`,Lr.position.set(1.5,e.terrainHeight(1.5,-107)+15.5,-107),Lr.rotation.z=0,Lr.castShadow=!0,Lr.receiveShadow=!0,Lr.userData.traversalCeiling=!0,Lr.userData.collisionPolicy=`decorative-overhead-ceiling-not-gameplay`,Lr.userData.accessibleGameplaySurface=!1,i.crown.add(Lr),j(Lr);let Rr=[{x:-10.6,z:-107},{x:13.6,z:-107}],zr=new Y(ed([1.28,1.06,.76,.9,.66,.48],Math.max(8,a),.16,12587749),p,Rr.length);Rr.forEach((t,n)=>{let r=e.terrainHeight(t.x,t.z),i=.45,a=Lr.position.y-.36-r+i;d.set(t.x,r-i,t.z),l.setFromEuler(new G(0,n===0?.18:-.18,0)),u.set(1.42,a,1.18),c.compose(d,l,u),zr.setMatrixAt(n,c),k(t.x,t.z,1.05)}),zr.instanceMatrix.needsUpdate=!0,zr.castShadow=!0,zr.receiveShadow=!0,zr.name=`suture-crown-skybridge-load-transfer-piers`,zr.userData.traversalBarrier=!0,zr.userData.collisionPolicy=`barrier`,i.crown.add(zr),j(zr);let Br=[{x:-10.6,z:-107,sx:4.4,sz:3.8},{x:13.6,z:-107,sx:4.4,sz:3.8},{x:-4.2,z:-102,sx:3.5,sz:3.1},{x:8.2,z:-102,sx:3.5,sz:3.1}],Vr=F(`suture-crown-explicit-ground-footings`,new Z(1,1,1,2,.1),g,Br.map((t,n)=>({x:t.x,y:e.terrainHeight(t.x,t.z),z:t.z,yaw:n<2?.05*(n===0?1:-1):0,sx:t.sx,sy:.7,sz:t.sz})),!1);Vr.userData.collisionPolicy=`support`,i.crown.attach(Vr);let Hr=F(`suture-crown-civic-insignia-fan`,ed([.72,1,.62,.82,.26,.035],7,.42,798295),m,[3.2,4.15,5.05,4.1,3.15].map((e,t)=>({x:-1.2+t*1.6,y:Mr+8.35,z:-102.05,yaw:(t-2)*-.12,sx:.48,sy:e,sz:.42})),!1);Hr.userData.collisionPolicy=`nonphysical-overhead-insignia`,Hr.userData.nonPhysicalCollision=!0,i.crown.attach(Hr);let Wr=[];for(let e=0;e<8;e+=1)Wr.push({x:-9+e*3,y:Lr.position.y,z:-105.91,yaw:0,sx:1.45,sy:.18,sz:.12});let Gr=F(`suture-crown-skybridge-windows`,new Z(1,1,1,1,.04),C,Wr);i.crown.attach(Gr),e.accentLights.push(Gr);let Kr=new An;Kr.name=`suture-crown-terminal-civic-hall`,Kr.userData.civicFunction=`vertical-seat-of-allocation-memory-and-city-governance`,i.crown.add(Kr);let qr=-108,Jr=e.terrainHeight(2,qr),Yr=new J(new Z(34,2.2,8,3,.16),g);Yr.name=`suture-crown-terminal-retaining-foundation`,Yr.position.set(2,Jr+.5,qr),Yr.castShadow=!0,Yr.receiveShadow=!0,Yr.userData.traversalBarrier=!0,Yr.userData.collisionPolicy=`barrier`,Kr.add(Yr),j(Yr),A(2,qr,32,0,.88);let Xr=[{x:-13.5,height:34,width:3.8},{x:-8.2,height:29,width:3},{x:-3.5,height:24,width:2.4},{x:7.5,height:24,width:2.4},{x:12.2,height:29,width:3},{x:17.5,height:34,width:3.8}],Zr=F(`suture-crown-layered-facade-pylons`,new Z(1,1,1,3,.11),f,Xr.map((e,t)=>({x:e.x,y:Jr-.5+(e.height+.5)*.5,z:qr+1.45-t%2*.38,yaw:(t-2.5)*-.035,sx:e.width,sy:e.height+.5,sz:3.15+t%2*.55})));Zr.userData.traversalBarrier=!0,Zr.userData.collisionPolicy=`barrier`,Kr.attach(Zr),Xr.forEach(e=>k(e.x,qr+1.4,e.width*.38));let Qr=new J(new Z(9.3,12.8,2.8,3,.16),_);Qr.name=`suture-crown-deep-inset-terminal-threshold`,Qr.position.set(2,Jr+6.1,qr+4.28),Qr.castShadow=!1,Qr.receiveShadow=!0,Qr.userData.traversalBarrier=!0,Qr.userData.collisionPolicy=`barrier`,Qr.userData.facadeDepth=`deep-terminal-vestibule-and-civic-threshold`,Kr.add(Qr),j(Qr),A(2,qr+4.28,8.2,0,.72);let $r=[[-15.8,qr+5.8],[-10.4,qr+5.6],[-5.9,qr+5.45],[9.9,qr+5.45],[14.4,qr+5.6],[19.8,qr+5.8]],ei=$r.map(([e],t)=>{let n=e<2?e+2.1:e-2.1,r=[29,24,20,20,24,29][t];return new U(n,Jr+r,qr+1.6)}),ti=new Y(new Gi(1,1.12,1,7),h,$r.length);$r.forEach(([t,n],r)=>{let i=new U(t,e.terrainHeight(t,n)-.35,n),a=ei[r];Gt.copy(a).sub(i),d.copy(i).add(a).multiplyScalar(.5),l.setFromUnitVectors(Kt,Gt.clone().normalize()),u.set(.46,Gt.length(),.46),c.compose(d,l,u),ti.setMatrixAt(r,c)}),ti.instanceMatrix.needsUpdate=!0,ti.castShadow=!0,ti.receiveShadow=!0,ti.name=`suture-crown-grounded-facade-buttress-ribs`,ti.userData.collisionPolicy=`nonphysical-sloped-structural-rib`,ti.userData.nonPhysicalCollision=!0,Kr.add(ti),j(ti);let ni=[];Xr.forEach((e,t)=>{let n=e.height>=32?6:e.height>=28?5:4;for(let r=0;r<n;r+=1)ni.push({x:e.x,y:Jr+3.4+r*4.4,z:qr+3.35-t%2*.24,yaw:0,sx:e.width*.48,sy:1.9,sz:1.28})});let ri=F(`suture-crown-facade-clerestory-openings`,new Z(1,1,1,1,.05),_,ni,!1);ri.userData.collisionPolicy=`nonphysical-facade-opening`,ri.userData.facadeDepth=`occupied-recesses-with-deep-side-returns`,ri.userData.nonPhysicalCollision=!0,Kr.attach(ri);let ii=new J(new Z(17.5,.58,3.4,3,.12),p);ii.name=`suture-crown-public-address-balcony`,ii.position.set(2,Jr+18.2,qr+5.35),ii.castShadow=!0,ii.receiveShadow=!0,ii.userData.collisionPolicy=`decorative-overhead-balcony-not-gameplay`,ii.userData.nonPhysicalCollision=!0,Kr.add(ii),j(ii);let ai=[{x:2,y:Jr+19.12,z:qr+7.02,yaw:Math.PI/2,sx:.12,sy:.12,sz:16.2},...Array.from({length:7},(e,t)=>({x:-5.2+t*2.4,y:Jr+18.76,z:qr+7.02,yaw:0,sx:.14,sy:1.28,sz:.14}))],oi=F(`suture-crown-balcony-rail-and-bays`,new Hi(1,1,1),m,ai,!1);oi.userData.collisionPolicy=`nonphysical-overhead-balcony-fixture`,oi.userData.nonPhysicalCollision=!0,Kr.attach(oi);let si=F(`suture-crown-terminal-vertical-crown-ribs`,ed([.68,1,.72,.86,.48,.1,.02],8,.3,13044337),m,[7,9.5,12.5,15,12.5,9.5,7].map((e,t)=>({x:-6.4+t*2.8,y:Jr+26,z:qr+1.7,yaw:(t-3)*-.08,sx:.72,sy:e,sz:.62})),!1);si.userData.collisionPolicy=`nonphysical-terminal-crown-silhouette`,si.userData.nonPhysicalCollision=!0,Kr.attach(si);let ci=F(`suture-crown-emissive-clerestory-band`,new Hi(1,1,1),C,Array.from({length:9},(e,t)=>({x:-7.2+t*2.3,y:Jr+27.4+Math.sin(t*1.2)*.32,z:qr+4.35,yaw:0,sx:t===4?.92:.58,sy:2.8+t%3*.45,sz:.12})),!1);ci.userData.collisionPolicy=`nonphysical-emissive-civic-crown`,ci.userData.nonPhysicalCollision=!0,Kr.attach(ci);let li=[{x:-17.1,z:qr+9.3,yaw:.04},{x:21.1,z:qr+9.3,yaw:-.04}],ui=F(`suture-crown-terminal-retaining-walls`,new Z(1,1,1,2,.11),h,li.map(t=>({x:t.x,y:e.terrainHeight(t.x,t.z)+2.15,z:t.z,yaw:t.yaw,sx:2.2,sy:5.1,sz:16.5})));ui.userData.traversalBarrier=!0,ui.userData.collisionPolicy=`barrier`,Kr.attach(ui),li.forEach(e=>A(e.x,e.z,0,15.5,.76));let di=F(`suture-crown-central-route-hierarchy-inlays`,new Hi(1,1,1),S,Dr.map((t,n)=>{let r=t.z;return{x:t.x,y:e.terrainHeight(t.x,r)+.415,z:r,yaw:0,sx:Math.min(3.6,t.width*.56),sy:.045,sz:t.depth*(n%2==0?.84:.7)}}),!1);di.userData.accessRoute=`quiet-court-to-terminal-threshold-processional-axis`,di.userData.collisionPolicy=`nonphysical-route-marking`,di.userData.nonPhysicalCollision=!0,i.crown.attach(di);let fi=(t,n,r)=>new U(t,e.terrainHeight(t,n)+r,n),pi=[[fi(-8.5,62,5.1),fi(0,68,8.2)],[fi(8.5,62,5.1),fi(0,68,8.2)],[fi(39.9,-14,4.2),fi(45.7,-12,3.2)],[fi(39.9,-5,4.2),fi(45.7,-6,3.2)],[fi(39.9,4,4.2),fi(45.7,1,3.2)],[fi(-4.2,-102,7.2),new U(-10.5,Lr.position.y-.3,-107)],[fi(8.2,-102,7.2),new U(12.5,Lr.position.y-.3,-107)],[new U(-11,Lr.position.y+.25,-107),fi(-13,-106,27)],[new U(13.5,Lr.position.y+.25,-107),fi(16,-108,31)]],mi=[[[-9,9],[4,11],[18,7],[30,-4],[43,-5]],[[-9,9],[-17,16],[-25,31]],[[-9,9],[-20,11],[-29,13]],[[-9,9],[-3,18],[2,26]],[[43,-5],[51,-4]],[[43,-5],[45,-15],[41,-25]],[[30,-4],[22,-20],[5,-38],[-19,-48],[-12,-64],[-7,-78],[-2,-93],[2,-102]]],hi=[];mi.forEach((e,t)=>{for(let n=0;n<e.length-1;n+=1){let r=e[n],i=e[n+1],a=.58+t%3*.11;hi.push([fi(r[0],r[1],a),fi(i[0],i[1],a)])}});let gi=[...pi,...hi],_i=new Y(new Gi(1,1,1,6),y,gi.length);gi.forEach(([e,t],n)=>{Gt.copy(t).sub(e),d.copy(e).add(t).multiplyScalar(.5),l.setFromUnitVectors(Kt,Gt.clone().normalize());let r=n<2?.075:n<5?.055:n<pi.length?.085:.14+n%3*.025;u.set(r,Gt.length(),r),c.compose(d,l,u),_i.setMatrixAt(n,c)}),_i.instanceMatrix.needsUpdate=!0,_i.castShadow=!1,_i.name=`city-structural-and-utility-network`,_i.userData.utilityNetwork=`breathworks-reservoir-forum-habitation-bay-court-crown`,_i.userData.collisionPolicy=`nonphysical-raised-service-conduit`,_i.userData.nonPhysicalCollision=!0,r.add(_i),j(_i),r.userData.utilityGraph={source:`breathworks-source`,sharedHub:`shared-distribution-hub`,nodes:ue.map(e=>e.id),sinks:[`forum-service`,`forum-habitation`,`east-habitation`,`utility-house`,`dock-warehouse`,`court-service`,`crown-service`]};let vi=[];nd(Uu,11).forEach((e,t)=>{t%2==0&&e.z>-72&&vi.push(e)}),vi.push({x:-36,z:31},{x:-14,z:31},{x:27,z:-8},{x:43,z:-8},{x:-28,z:-48},{x:-10,z:-48});let yi=new Gi(.055,.11,1,6),bi=new Ea(.22,8,6),xi=new Y(yi,_,vi.length),Si=new Y(bi,C,vi.length);vi.forEach((t,n)=>{let r=e.terrainHeight(t.x,t.z),i=1.8+n%3*.34;d.set(t.x,r+i*.5,t.z),l.identity(),u.set(1,i,1),c.compose(d,l,u),xi.setMatrixAt(n,c),d.y=r+i,u.setScalar(n%4==0?1.3:1),c.compose(d,l,u),Si.setMatrixAt(n,c)});for(let e of[xi,Si])e.instanceMatrix.needsUpdate=!0,e.castShadow=!1,r.add(e),j(e);xi.name=`street-lamp-stems`,Si.name=`street-lamp-bellglass`,xi.userData.collisionPolicy=`nonphysical-thin-fixture`,xi.userData.nonPhysicalCollision=!0,Si.userData.collisionPolicy=`nonphysical-fixture`,Si.userData.nonPhysicalCollision=!0,e.accentLights.push(Si);let Ci=new Hi(1,1,1),wi=e.quality===`low`?14:e.quality===`high`?22:30,Ti=[{x:-34,z:27,yaw:.08,sx:2.4,sy:1.05,sz:.72},{x:-34,z:30,yaw:-.06,sx:2.2,sy:.82,sz:.68},{x:-33.5,z:34,yaw:.12,sx:1.4,sy:1.7,sz:.8},{x:-20,z:36,yaw:-.18,sx:1.8,sy:1.25,sz:.8},{x:-27,z:22,yaw:.3,sx:1.3,sy:1.5,sz:.74},{x:-23,z:25,yaw:-.2,sx:2.1,sy:.72,sz:.7},{x:-25,z:-54,yaw:.08,sx:2.2,sy:.72,sz:.72},{x:-13,z:-53,yaw:-.12,sx:2.2,sy:.72,sz:.72},{x:-27,z:-45,yaw:.4,sx:1.2,sy:1.35,sz:.78},{x:-10,z:-44,yaw:-.36,sx:1.1,sy:1.25,sz:.72},{x:47,z:-13,yaw:.04,sx:1.5,sy:2.1,sz:.82},{x:48,z:2,yaw:-.03,sx:1.5,sy:2.1,sz:.82},{x:39,z:-16,yaw:.06,sx:2.6,sy:.82,sz:.86},{x:39,z:5,yaw:-.06,sx:2.6,sy:.82,sz:.86},{x:53,z:-10,yaw:.2,sx:1.35,sy:1.6,sz:.85},{x:47,z:-24,yaw:-.3,sx:1.9,sy:1.1,sz:.8},{x:27,z:-26,yaw:.02,sx:2.1,sy:1.25,sz:.86},{x:25,z:9,yaw:-.04,sx:2.4,sy:1.05,sz:.82},{x:-31,z:14,yaw:.22,sx:1.5,sy:1.55,sz:.82},{x:4,z:23,yaw:-.18,sx:1.45,sy:1.5,sz:.8},{x:-11,z:73,yaw:.1,sx:1.3,sy:1.45,sz:.74},{x:11,z:70,yaw:-.12,sx:1.3,sy:1.45,sz:.74},{x:-10,z:-98,yaw:.05,sx:1.7,sy:1.3,sz:.82},{x:14,z:-98,yaw:-.05,sx:1.7,sy:1.3,sz:.82}],Ei=new Y(Ci,g,wi+Ti.length),Di=[new H(-33,5),new H(-1,7),new H(58,-5),new H(53,-22)];for(let t=0;t<wi;t+=1){let n=Di[t%Di.length],r=s.range(0,Math.PI*2),i=s.range(2.4,6.8),a=n.x+Math.sin(r)*i,o=n.y+Math.cos(r)*i,f=s.range(.6,1.3);d.set(a,e.terrainHeight(a,o)+f*.5,o),l.setFromEuler(new G(s.range(-.08,.08),s.range(0,Math.PI*2),s.range(-.08,.08))),u.set(s.range(.7,1.35),f,s.range(.8,1.5)),c.compose(d,l,u),Ei.setMatrixAt(t,c)}Ti.forEach((t,n)=>{let r=e.terrainHeight(t.x,t.z);d.set(t.x,r+t.sy*.5,t.z),l.setFromEuler(new G(0,t.yaw,0)),u.set(t.sx,t.sy,t.sz),c.compose(d,l,u),Ei.setMatrixAt(wi+n,c)}),Ei.instanceMatrix.needsUpdate=!0,Ei.castShadow=!0,Ei.receiveShadow=!0,Ei.name=`city-daily-life-furniture-tools-storage-and-logistics`,Ei.userData.fixtureRoles=[`food-and-water-lockers`,`market-counters`,`communal-worktables`,`maintenance-tool-cabinets`,`refuse-and-recycling-cells`,`dock-transfer-cargo`],Ei.userData.collisionPolicy=`step-over-furniture-and-authored-logistics-clusters`,Ei.userData.nonPhysicalCollision=!0,r.add(Ei),j(Ei);let Oi=e.quality===`low`?14:22,ki=new Y(new Ta(.42,.65,6),S,Oi);for(let t=0;t<Oi;t+=1){let n=cd[t%cd.length],r=s.range(0,Math.PI*2),i=s.range(4.5,13),a=n.x+Math.sin(r)*i,o=n.y+Math.cos(r)*i;d.set(a,e.terrainHeight(a,o)+.125,o),l.setFromEuler(new G(-Math.PI/2,0,s.range(-Math.PI,Math.PI))),u.setScalar(s.range(.55,1.25)),c.compose(d,l,u),ki.setMatrixAt(t,c)}ki.instanceMatrix.needsUpdate=!0,ki.name=`district-maintenance-seals-and-cultural-residue`,ki.userData.collisionPolicy=`nonphysical-surface-marking`,ki.userData.nonPhysicalCollision=!0,r.add(ki),j(ki);let Ai=ed([.12,.34,.2,.47,.25,.61,.31,.52,.22,.055],Math.max(6,a-1),1.42,987297),ji=[[-6.4,82,6.8,.72],[6.3,80,5.4,.58],[-6.4,76,4.2,.5],[6.3,73,7.2,.78],[-6.2,69,5.8,.64],[6.1,66,3.4,.44],[-6.2,62,7.6,.82],[6.2,59,4.8,.55],[-6.1,56,3.1,.42],[6.1,53,6.2,.68],[-12.5,86,7.8,.86],[12.5,86,6.5,.72],[-38,31,6.8,.78],[-36,40,5.2,.62],[-29,45,7.4,.84],[-12,34,4.4,.52],[-14,23,6.1,.7],[-22,17,3.6,.46],[-34,19,7.7,.88],[-43,35,5.7,.66],[-40,44,4.1,.5],[-9,25,6.9,.76],[-29,12,5.1,.58],[-43,27,3.2,.44],[22,-8,5.8,.68],[24,2,3.4,.44],[30,7,7.1,.8],[40,7,5.2,.62],[47,3,6.7,.74],[48,-8,4.2,.5],[46,-17,7.6,.84],[38,-22,5.5,.64],[29,-20,3.1,.42],[22,-16,6.3,.72],[55,-16,7.8,.88],[57,1,4.7,.54],[-42,-55,6.8,.76],[-41,-36,4.2,.5],[-34,-30,7.2,.82],[4,-34,5.3,.62],[6,-45,3.5,.44],[4,-60,7.7,.86],[-16,-69,5.8,.66],[-34,-65,4.6,.54],[-46,-51,7.1,.8],[-43,-40,3.2,.42],[-18,-82,5.2,.62],[20,-83,7.5,.84],[-21,-91,3.4,.44],[23,-92,6.4,.72],[-20,-100,7.8,.88],[24,-101,4.3,.52],[-22,-110,6.9,.78],[25,-111,3.1,.42],[-21,-119,5.7,.66],[25,-120,7.3,.82],[-19,-129,4.5,.54],[23,-130,6.2,.7]],Mi=(e,t)=>Math.min(Yu(e,t),...Wu.map(n=>Ju(n,e,t).distance)),Ni=ji.filter(([e,t])=>Mi(e,t)>5.8),Pi=e.quality===`low`?28:e.quality===`high`?44:58,Fi=Math.min(Pi,Ni.length),Ii=Array.from({length:Fi},(e,t)=>Ni[Math.floor(t*Ni.length/Fi)]),Li=new Y(Ai,v,Fi),Ri=new Y(Ai,p,Fi),zi=new Y(td(),v,Fi*2),Bi=new Y(new Sa(.2,1),C,Fi);Ii.forEach(([t,n,r,i],a)=>{let o=e.terrainHeight(t,n),s=a%7*.73+Math.floor(a/7)*.19;d.set(t,o,n),l.setFromEuler(new G((a%3-1)*.035,s,(a%5-2)*.028)),u.set(i,r,i*(.72+a%3*.08)),c.compose(d,l,u),Li.setMatrixAt(a,c),d.y+=.06,u.set(i*.32,r*.94,i*.27),c.compose(d,l,u),Ri.setMatrixAt(a,c),k(t,n,Math.max(.28,i*.42));for(let e=0;e<2;e+=1){let f=s+e*2.42+a%2*.23,p=r*(.63+e*.18);d.set(t+Math.sin(f)*i*.24,o+p,n+Math.cos(f)*i*.24),l.setFromEuler(new G(e===0?-.12:.18,f,(e===0?-.2:.24)+(a%3-1)*.07)),u.set(i*(1.24+e*.16),i*(.68+e*.1),1),c.compose(d,l,u),zi.setMatrixAt(a*2+e,c)}let f=s+1.1;d.set(t+Math.sin(f)*i*.72,o+r*.77,n+Math.cos(f)*i*.72),l.setFromEuler(new G(0,f,0)),u.setScalar(.72+a%4*.12),c.compose(d,l,u),Bi.setMatrixAt(a,c)});for(let e of[Li,Ri])e.instanceMatrix.needsUpdate=!0,e.castShadow=!1,e.receiveShadow=!0,r.add(e),j(e);Li.name=`cultivated-district-flora-segmented-stalks`,Ri.name=`cultivated-district-flora-civic-cores`,zi.instanceMatrix.needsUpdate=!0,zi.castShadow=!1,zi.receiveShadow=!0,zi.name=`cultivated-district-polygon-canopies`,zi.userData.collisionPolicy=`nonphysical-canopy`,zi.userData.nonPhysicalCollision=!0,r.add(zi),j(zi),Bi.instanceMatrix.needsUpdate=!0,Bi.castShadow=!1,Bi.name=`cultivated-district-occupancy-pods`,Bi.userData.collisionPolicy=`nonphysical-fixture`,Bi.userData.nonPhysicalCollision=!0,r.add(Bi),j(Bi),e.accentLights.push(Bi);let Vi=new Y(new Sa(.36,1),C,5);[[37,-5,7.1],[43,-5,7.1],[-28,31,2.4],[-16,-48,2.8],[-12,-90,4.6]].forEach(([t,n,r],i)=>{d.set(t,e.terrainHeight(t,n)+r,n),l.setFromEuler(new G(0,i*.8,0)),u.setScalar(i<2?1.25:1),c.compose(d,l,u),Vi.setMatrixAt(i,c)}),Vi.instanceMatrix.needsUpdate=!0,Vi.name=`occupied-service-orbs`,Vi.userData.cityMotion=`rail-and-district-patrol`,Vi.userData.collisionPolicy=`nonphysical-mobile`,Vi.userData.nonPhysicalCollision=!0,r.add(Vi),j(Vi),e.accentLights.push(Vi);let Ui=[{x:-31.2,z:31,radius:2.8},{x:-25,z:31,radius:2.45},{x:-19,z:-48,radius:3.2},...bt.map(e=>{let t=e.start+.51;return{x:-19+Math.sin(t)*e.radius,z:-48+Math.cos(t)*e.radius,radius:2.35}}),...Jn.map(e=>({x:e.x,z:e.z,radius:e.radius*1.42})),...en.map(e=>({x:e.x,z:e.z,radius:1.65})),...Fn.map(([e,t])=>({x:e,z:t,radius:.82})),...gr.map(e=>({x:e.x,z:e.z,radius:1.08})),...Sr.map(e=>({x:e.x,z:e.z,radius:e.radius*.72})),...L.map(({index:e})=>({x:id[e].x,z:id[e].z,radius:Math.max(2.4,Math.min(4.2,Math.max(id[e].width,id[e].depth)*.54))})),{x:42.65,z:.8,radius:2.05},...Ar.map(e=>({x:e.x,z:e.z,radius:Math.min(3.2,e.radius*.82)})),...Rr.map(e=>({x:e.x,z:e.z,radius:1.85})),...Br.slice(2).map(e=>({x:e.x,z:e.z,radius:1.75})),{x:2,z:qr+4.25,radius:3.2},{x:-11.2,z:qr+1.5,radius:2.6},{x:15.2,z:qr+1.5,radius:2.6}],Ki=new Ur({color:462863,transparent:!0,opacity:.14,depthWrite:!1,toneMapped:!0}),qi=new Y(new Wi(1,12),Ki,Ui.length);return Ui.forEach((t,n)=>{d.set(t.x,e.terrainHeight(t.x,t.z)+.026,t.z),l.setFromEuler(new G(-Math.PI/2,0,n%5*.37)),u.set(t.radius,t.radius*(.68+n%3*.07),1),c.compose(d,l,u),qi.setMatrixAt(n,c)}),qi.instanceMatrix.needsUpdate=!0,qi.castShadow=!1,qi.receiveShadow=!1,qi.renderOrder=1,qi.name=`civic-hero-structure-contact-patches`,qi.userData.collisionPolicy=`nonphysical-subtle-contact-shading`,qi.userData.nonPhysicalCollision=!0,r.add(qi),r.userData.civilization={name:`The Breathing City`,route:Uu,districts:[`Intake Gate`,`Nacre Forum`,`Breathworks`,`Quiet Court`,`Suture Crown`],buildingTypologies:[`shell dwelling`,`courtyard habitat`,`market service row`,`pressure utility house`,`dock warehouse`,`archive workshop`,`communications tower`],habitationSystems:[`open-front rooms and deep interior bays`,`balconies and maintained thresholds`,`market counters and communal worktables`,`food water tool and refuse storage`,`street lighting and occupied signage`,`reservoir berths and cargo transfer`]},e.scene.add(r),{root:r,districts:i,cost:{...ld(r),collidersAdded:e.colliders.length-t,shootablesAdded:e.shootables.length-n}}},dd=Math.PI*2,Q=1.72,fd=.08,pd=.34,md=6.4,hd=.42,gd=.08,_d=.48,vd=47,yd=Math.cos(Mt.degToRad(vd)),bd=.32,xd=8,Sd=.001,Cd=5,wd=1.1,Td=4.5,Ed=.08,Dd=280,Od=new U(-.55,.32,-.77).normalize(),kd=new U,Ad=new U,jd=new U,Md=new Nt,Nd=(e,t,n)=>Math.max(t,Math.min(n,e)),Pd=(e,t,n)=>e+(t-e)*n,Fd=(e,t,n,r)=>Mt.damp(e,t,n,r),Id=(e,t,n)=>{let r=Nd((n-e)/(t-e),0,1);return r*r*(3-2*r)},Ld=class{constructor(e=9565349){this.state=e>>>0}next(){return this.state=this.state*1664525+1013904223>>>0,this.state/4294967296}range(e,t){return Pd(e,t,this.next())}pick(e){return e[Math.floor(this.next()*e.length)]}},Rd=class{constructor(){this.context=null,this.master=null,this.ambience=[],this.noiseBuffer=null}start(){if(this.context){this.context.resume();return}let e=window.AudioContext||window.webkitAudioContext;e&&(this.context=new e,this.master=this.context.createGain(),this.master.gain.value=.72,this.master.connect(this.context.destination),this.noiseBuffer=this.makeNoise(2.5),this.startAmbience())}makeNoise(e){if(!this.context)return null;let t=Math.floor(this.context.sampleRate*e),n=this.context.createBuffer(1,t,this.context.sampleRate),r=n.getChannelData(0),i=0;for(let e=0;e<t;e+=1){let t=Math.random()*2-1;i=i*.82+t*.18,r[e]=i}return n}startAmbience(){if(!this.context||!this.master||!this.noiseBuffer)return;let e=this.context,t=e.createBufferSource();t.buffer=this.noiseBuffer,t.loop=!0;let n=e.createBiquadFilter();n.type=`bandpass`,n.frequency.value=430,n.Q.value=.38;let r=e.createGain();r.gain.value=.055,t.connect(n).connect(r).connect(this.master),t.start();let i=e.createGain();i.gain.value=.026,i.connect(this.master),[41.2,61.8,103].forEach((t,n)=>{let r=e.createOscillator();r.type=n===2?`sine`:`triangle`,r.frequency.value=t,r.detune.value=n*7-4,r.connect(i),r.start(),this.ambience.push(r)}),this.ambience.push(t,r,i)}shot(){if(!this.context||!this.master||!this.noiseBuffer)return;let e=this.context,t=e.currentTime,n=e.createBufferSource();n.buffer=this.noiseBuffer;let r=e.createBiquadFilter();r.type=`bandpass`,r.frequency.setValueAtTime(1850,t),r.frequency.exponentialRampToValueAtTime(380,t+.11),r.Q.value=.65;let i=e.createGain();i.gain.setValueAtTime(1e-4,t),i.gain.exponentialRampToValueAtTime(.34,t+.003),i.gain.exponentialRampToValueAtTime(1e-4,t+.13),n.connect(r).connect(i).connect(this.master),n.start(t,Math.random()*1.8,.15);let a=e.createOscillator();a.type=`sine`,a.frequency.setValueAtTime(112,t),a.frequency.exponentialRampToValueAtTime(42,t+.12);let o=e.createGain();o.gain.setValueAtTime(.24,t),o.gain.exponentialRampToValueAtTime(1e-4,t+.14),a.connect(o).connect(this.master),a.start(t),a.stop(t+.16)}hit(e=!1){if(!this.context||!this.master)return;let t=this.context,n=t.currentTime;[e?1120:820,e?1590:1230].forEach((e,r)=>{let i=t.createOscillator();i.type=`sine`,i.frequency.setValueAtTime(e,n),i.frequency.exponentialRampToValueAtTime(e*.76,n+.045);let a=t.createGain();a.gain.setValueAtTime(r===0?.055:.035,n),a.gain.exponentialRampToValueAtTime(1e-4,n+.06),i.connect(a).connect(this.master),i.start(n),i.stop(n+.07)})}reload(){this.click(220,.08,.12),window.setTimeout(()=>this.click(510,.06,.08),520),window.setTimeout(()=>this.click(310,.09,.1),1080)}enemyShot(){if(!this.context||!this.master)return;let e=this.context,t=e.currentTime,n=e.createOscillator();n.type=`sawtooth`,n.frequency.setValueAtTime(260,t),n.frequency.exponentialRampToValueAtTime(82,t+.24);let r=e.createBiquadFilter();r.type=`lowpass`,r.frequency.value=880;let i=e.createGain();i.gain.setValueAtTime(.055,t),i.gain.exponentialRampToValueAtTime(1e-4,t+.25),n.connect(r).connect(i).connect(this.master),n.start(t),n.stop(t+.26)}pulse(e=72,t=.1,n=.42){if(!this.context||!this.master)return;let r=this.context,i=r.currentTime,a=r.createOscillator();a.type=`sine`,a.frequency.setValueAtTime(e,i),a.frequency.exponentialRampToValueAtTime(e*.52,i+n);let o=r.createGain();o.gain.setValueAtTime(t,i),o.gain.exponentialRampToValueAtTime(1e-4,i+n),a.connect(o).connect(this.master),a.start(i),a.stop(i+n+.01)}click(e,t,n){if(!this.context||!this.master)return;let r=this.context.currentTime,i=this.context.createOscillator();i.type=`square`,i.frequency.value=e;let a=this.context.createGain();a.gain.setValueAtTime(t,r),a.gain.exponentialRampToValueAtTime(1e-4,r+n),i.connect(a).connect(this.master),i.start(r),i.stop(r+n)}dispose(){this.ambience.forEach(e=>{try{`stop`in e&&typeof e.stop==`function`&&e.stop(),e.disconnect()}catch{}}),this.ambience=[],this.context?.close(),this.context=null,this.master=null}},zd=class{constructor(e){this.scene=new zn,this.camera=new Eo(72,1,.06,520),this.renderer=null,this.composer=null,this.bloom=null,this.sunLight=null,this.sunTarget=new kn,this.shadowFocus=new U(1/0,1/0,1/0),this.raf=0,this.rng=new Ld,this.audio=new Rd,this.raycaster=new Zo,this.shootables=[],this.colliders=[],this.colliderGrid=new Map,this.colliderProxyKeys=new Set,this.instanceColliderCount=0,this.lastPlayerContacts=0,this.lastPlayerContactLabels=[],this.lastSafePlayerPosition=null,this.collisionRecoveryCount=0,this.maxDepenetrationCorrection=0,this.enemies=[],this.anchors=[],this.particles=[],this.bolts=[],this.tracers=[],this.ambientMotes=null,this.waterMaterials=[],this.animatedMaterials=[],this.cityRoot=null,this.cityTexturePolishComplete=!1,this.weaponRig=new An,this.weaponBody=new An,this.weaponBolt=new An,this.weaponMagazine=new An,this.weaponSupportHand=new An,this.weaponHeatMaterial=null,this.muzzle=new kn,this.muzzleFlash=null,this.muzzleLight=null,this.casingOrigin=new kn,this.accentLights=[],this.keys=new Set,this.pointerLocked=!1,this.started=!1,this.paused=!1,this.ended=!1,this.disposed=!1,this.fatal=null,this.debugApi=void 0,this.autoplay=typeof window<`u`&&new URLSearchParams(window.location.search).has(`autotest`),this.forceTouch=typeof window<`u`&&new URLSearchParams(window.location.search).has(`touch`),this.cinematic=typeof window<`u`&&new URLSearchParams(window.location.search).has(`cinematic`),this.captureMode=typeof window<`u`&&new URLSearchParams(window.location.search).has(`capture`),this.adsCapture=typeof window<`u`&&new URLSearchParams(window.location.search).has(`ads`),this.missionTest=typeof window<`u`&&new URLSearchParams(window.location.search).has(`missiontest`),this.movementTest=typeof window<`u`&&new URLSearchParams(window.location.search).has(`movementtest`),this.collisionTest=typeof window<`u`&&new URLSearchParams(window.location.search).has(`collisiontest`),this.cityTest=typeof window<`u`&&[`citytest`,`traversaltest`].some(e=>new URLSearchParams(window.location.search).has(e)),this.tourView=typeof window<`u`?new URLSearchParams(window.location.search).get(`tour`):null,this.tourClean=typeof window<`u`&&new URLSearchParams(window.location.search).has(`clean`),this.quality=`ultra`,this.player={position:new U(0,0,72),velocity:new U,yaw:0,pitch:-.055,health:100,armor:3,grounded:!0,bob:0,step:0,recoilPitch:0,recoilYaw:0,damageFlash:0,lastDamage:-99,slide:0,slideCooldown:0,jumpQueued:!1},this.weapon={ammo:36,reserve:144,magSize:36,fireHeld:!1,ads:!1,adsAmount:0,cooldown:0,reloading:!1,reloadTime:0,recoil:0,heat:0,shots:0,hits:0,hitmarker:0},this.touch={moveId:-1,lookId:-1,moveOrigin:new H,lookLast:new H,move:new H},this.mission={anchorsDestroyed:0,kills:0,complete:!1,startTime:0,endTime:0,extractionTime:0},this.lastFrame=performance.now(),this.fps=60,this.frameMs=16.7,this.frameAccumulator=0,this.frameCount=0,this.perfTimer=0,this.simAccumulator=0,this.hudTimer=0,this.lowFpsTimer=0,this.titleTime=0,this.worldTime=0,this.messageTimer=0,this.subtitleTimer=0,this.controlsTimer=0,this.threatLevel=0,this.onResizeBound=()=>this.resize(),this.onMouseMoveBound=e=>this.onMouseMove(e),this.onMouseDownBound=e=>this.onMouseDown(e),this.onMouseUpBound=e=>this.onMouseUp(e),this.onKeyDownBound=e=>this.onKeyDown(e),this.onKeyUpBound=e=>this.onKeyUp(e),this.onPointerLockBound=()=>this.onPointerLockChange(),this.onContextMenuBound=e=>e.preventDefault(),this.root=e;let t=e.querySelector(`[data-canvas]`);if(!t)throw Error(`Missing render host.`);this.canvasHost=t}async init(){try{this.configureRenderer(),this.buildWorld(),this.finalizeWorldColliders(),this.buildWeapon(),this.bindInput(),this.tourView&&this.prepareTourView(this.tourView),this.resize(),this.updateHUD(!0),this.camera.position.copy(this.player.position),this.camera.rotation.order=`YXZ`,this.root.dataset.ready=`true`,document.body.dataset.vantaReady=`true`,this.root.querySelector(`[data-boot]`)?.classList.add(`is-hidden`),this.installDebugAPI(),this.lastFrame=performance.now(),this.raf=requestAnimationFrame(e=>this.frame(e)),(this.autoplay||this.cinematic||this.missionTest||this.movementTest||this.collisionTest||this.cityTest||this.tourView)&&window.setTimeout(()=>this.start(),120),this.autoplay&&window.setTimeout(()=>this.runAutotest(),700),this.missionTest&&window.setTimeout(()=>this.runMissionTest(),700),this.movementTest&&window.setTimeout(()=>this.runMovementTest(),700),this.collisionTest&&window.setTimeout(()=>this.runCollisionTest(),700),this.cityTest&&window.setTimeout(()=>this.runCityTest(),700)}catch(e){this.fail(e)}}prepareTourView(e){let t={intake:{x:-3,z:73,yaw:.27,pitch:-.045},forum:{x:-15,z:42,yaw:.738,pitch:-.035},bridge:{x:-21.8,z:12,yaw:-.86,pitch:-.08},breathworks:{x:34,z:-8,yaw:-1.52,pitch:-.035},bay:{x:43,z:-7,yaw:1.57,pitch:-.015},court:{x:-2,z:-29,yaw:.73,pitch:-.055},crown:{x:-7,z:-77,yaw:-.2,pitch:-.09},reverse:{x:-19,z:-48,yaw:-2.965,pitch:-.035}},n=t[e]??t.intake;this.player.position.set(n.x,this.terrainHeight(n.x,n.z)+Q,n.z),this.player.velocity.set(0,0,0),this.player.yaw=n.yaw,this.player.pitch=n.pitch,this.player.grounded=!0,this.lastSafePlayerPosition=null,this.player.health=100,this.player.armor=3,this.enemies.forEach(e=>{e.wakeRadius=0,e.cooldown=999}),this.bolts.length=0,this.setQuality(`high`),this.root.dataset.tour=e in t?e:`intake`,document.body.dataset.vantaTour=this.root.dataset.tour}configureRenderer(){let e=new vu({antialias:!0,alpha:!1,powerPreference:`high-performance`,stencil:!1});e.setClearColor(462871,1),e.outputColorSpace=Ve,e.toneMapping=4,e.toneMappingExposure=.82,e.shadowMap.enabled=!0,e.shadowMap.type=1,e.setPixelRatio(Math.min(window.devicePixelRatio||1,this.getPixelRatioCap())),e.domElement.className=`vanta-renderer`,e.domElement.setAttribute(`aria-label`,`Playable first-person view of planet Vanta Nine`),e.domElement.tabIndex=0,this.canvasHost.appendChild(e.domElement),this.renderer=e;let t=new Fu,n=new Ts(e);this.scene.environment=n.fromScene(t,.035).texture,this.scene.environmentIntensity=.58,t.dispose(),n.dispose();let r=new Du(e);r.addPass(new Ou(this.scene,this.camera));let i=new Au(new H(1,1),.16,.36,1.24);r.addPass(i),r.addPass(new Mu),this.composer=r,this.bloom=i}getPixelRatioCap(){return this.quality===`low`?.72:this.quality===`high`?.9:1.15}buildWorld(){this.scene.fog=new Rn(2506055,.0058),this.buildSky(),this.buildLights(),this.buildTerrain(),this.buildWater();let e=ud({scene:this.scene,quality:this.quality,terrainHeight:(e,t)=>this.terrainHeight(e,t),colliders:this.colliders,shootables:this.shootables,accentLights:this.accentLights});this.cityRoot=e.root,this.polishCivilizationMaterials(e.root),this.scene.userData.civilizationCost=e.cost,this.buildDistantCrown(),this.buildHeroMonument(),this.buildRockFields(),this.buildLungReefs(),this.buildFlora(),this.buildChoirAnchors(),this.buildAmbientMotes(),this.buildEnemies()}buildSky(){let e=new Ea(420,56,32),t=new Ra({side:1,depthWrite:!1,uniforms:{uTime:{value:0},uTop:{value:new K(330521)},uMid:{value:new K(1521477)},uHorizon:{value:new K(10118e3)},uSun:{value:Od.clone()}},vertexShader:`
        varying vec3 vWorldPosition;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldPosition = world.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,fragmentShader:`
        uniform float uTime;
        uniform vec3 uTop;
        uniform vec3 uMid;
        uniform vec3 uHorizon;
        uniform vec3 uSun;
        varying vec3 vWorldPosition;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.,0.)), f.x),
                     mix(hash(i + vec2(0.,1.)), hash(i + vec2(1.,1.)), f.x), f.y);
        }
        float fbm(vec2 p) {
          float value = 0.0;
          value += noise(p) * 0.56;
          p = p * 2.03 + vec2(3.1, -1.7);
          value += noise(p) * 0.28;
          p = p * 2.07 + vec2(-2.4, 4.3);
          value += noise(p) * 0.14;
          return value;
        }
        void main() {
          vec3 ray = normalize(vWorldPosition - cameraPosition);
          float elevation = clamp(ray.y * .5 + .5, 0.0, 1.0);
          float horizon = pow(1.0 - abs(ray.y), 4.0);
          vec3 color = mix(uHorizon, uMid, smoothstep(.46, .64, elevation));
          color = mix(color, uTop, smoothstep(.61, .96, elevation));
          color = mix(color, vec3(.19, .28, .31), horizon * .18);

          vec2 skyUv = vec2(
            atan(ray.z, ray.x) / 6.2831853 + .5,
            asin(clamp(ray.y, -1.0, 1.0)) / 3.1415926 + .5
          );
          vec2 drift = vec2(uTime * .0015, -uTime * .00045);
          float cloud = fbm(skyUv * vec2(5.4, 2.8) + drift);
          float cloudBand =
            smoothstep(.47, .79, cloud) *
            smoothstep(.46, .68, elevation) *
            (1.0 - smoothstep(.88, 1.0, elevation));
          color = mix(color, vec3(.18, .34, .38), cloudBand * .19);

          float sunDot = max(dot(ray, normalize(uSun)), 0.0);
          float sunCore = pow(sunDot, 1500.0);
          float sunCorona = pow(sunDot, 115.0);
          float sunHaze = pow(sunDot, 9.0);
          color += vec3(1.0, .56, .34) * sunCore * 3.6;
          color += vec3(.92, .34, .29) * sunCorona * .62;
          color += vec3(.42, .16, .22) * sunHaze * .14;

          float auroraField =
            fbm(skyUv * vec2(9.0, 3.2) - drift * 2.1) *
            fbm(skyUv * vec2(4.1, 5.7) + vec2(2.7, 1.3));
          float aurora =
            smoothstep(.46, .69, auroraField) *
            smoothstep(.61, .78, elevation) *
            (1.0 - smoothstep(.95, 1.0, elevation));
          color += vec3(.035, .34, .31) * aurora * .18;

          vec2 starGrid = skyUv * vec2(760.0, 380.0);
          vec2 starCell = floor(starGrid);
          vec2 starLocal = fract(starGrid) - .5;
          float starSeed = hash(starCell);
          float starShape = smoothstep(.075, .008, length(starLocal));
          float star =
            step(.99735, starSeed) *
            starShape *
            smoothstep(.63, .84, elevation);
          float twinkle = .78 + .22 * sin(uTime * (.7 + starSeed * 1.6) + starSeed * 31.0);
          color += mix(vec3(.48, .69, .78), vec3(.95, .76, .67), hash(starCell + 9.0)) *
            star * twinkle * 1.3;

          float dither = hash(gl_FragCoord.xy + uTime) - .5;
          color += dither / 380.0;
          gl_FragColor = vec4(color, 1.0);
        }
      `});this.animatedMaterials.push(t),this.scene.add(new J(e,t));let n=new Ba({color:6253954,emissive:1120043,emissiveIntensity:.18,roughness:.9,envMapIntensity:.22});this.addSurfaceDetail(n,19857,5.5,.11);let r=new J(new Sa(24,5),n);r.position.set(-122,108,-248),r.scale.set(1,.93,1),this.scene.add(r);let i=new J(new Ea(10,32,18),new Ur({color:1313578,fog:!1}));i.position.set(76,62,-215),this.scene.add(i);let a=new J(new Ta(11.4,14.2,64),new Ur({color:16741278,transparent:!0,opacity:.34,side:2,blending:2,depthWrite:!1,fog:!1}));a.position.copy(i.position),a.lookAt(this.camera.position),this.scene.add(a);let o=new Ba({color:2506587,emissive:659490,emissiveIntensity:.22,roughness:.94,envMapIntensity:.16,fog:!1});this.addSurfaceDetail(o,29124,7,.08);let s=new J(new Ea(47,48,24),o);s.position.set(188,92,-310),this.scene.add(s);let c=new J(new Ta(60,84,96),new Ur({color:8368295,transparent:!0,opacity:.09,side:2,depthWrite:!1,fog:!1}));c.position.copy(s.position),c.rotation.set(.32,.18,-.38),this.scene.add(c)}buildLights(){let e=new mo(7977153,1773850,.4);this.scene.add(e);let t=new jo(16763306,1.72);t.position.copy(Od).multiplyScalar(180),this.scene.add(this.sunTarget),t.target=this.sunTarget,t.castShadow=!0,t.shadow.mapSize.set(1024,1024),t.shadow.camera.left=-48,t.shadow.camera.right=48,t.shadow.camera.top=48,t.shadow.camera.bottom=-48,t.shadow.camera.near=1,t.shadow.camera.far=190,t.shadow.bias=-3e-4,t.shadow.normalBias=.012,t.shadow.radius=1.35,this.scene.add(t),this.sunLight=t,this.updateSunShadowFocus(!0);let n=new jo(5488323,.24);n.position.set(80,40,-110),this.scene.add(n)}updateSunShadowFocus(e=!1){if(!this.sunLight)return;let t=96/(this.sunLight.shadow.mapSize.x||1024),n=Math.round(this.player.position.x/t)*t,r=Math.round(this.player.position.z/t)*t,i=Math.round((this.terrainHeight(n,r)+1.2)/t)*t;!e&&Math.abs(n-this.shadowFocus.x)<t&&Math.abs(i-this.shadowFocus.y)<t&&Math.abs(r-this.shadowFocus.z)<t||(this.shadowFocus.set(n,i,r),this.sunTarget.position.copy(this.shadowFocus),this.sunLight.position.copy(this.shadowFocus).addScaledVector(Od,180),this.sunTarget.updateMatrixWorld())}terrainHeight(e,t){let n=Math.sin(e*.022)*Math.cos(t*.018)*3.35+Math.sin((e+t)*.047)*1.3,r=Math.sin(e*.13+t*.03)*.2+Math.cos(t*.11-e*.025)*.18,i=-4.6*Math.exp(-(e*e/2500+t*t/5400)),a=2.4*Id(45,105,t),o=4.2*Id(55,125,-t);return Qu(n+r+i+a+o,e,t)}movementBasis(e,t,n){t.set(-Math.sin(e),0,-Math.cos(e)),n.set(Math.cos(e),0,-Math.sin(e))}terrainGradient(e,t){let n=bd;return{dx:(this.terrainHeight(e+n,t)-this.terrainHeight(e-n,t))/(n*2),dz:(this.terrainHeight(e,t+n)-this.terrainHeight(e,t-n))/(n*2)}}terrainNormalY(e,t){let{dx:n,dz:r}=this.terrainGradient(e,t);return 1/Math.sqrt(1+n*n+r*r)}isWalkableNormal(e){return e>=yd}terrainSlopeDegrees(e,t){return Mt.radToDeg(Math.acos(Nd(this.terrainNormalY(e,t),-1,1)))}colliderCellKey(e,t){return`${e}:${t}`}addColliderToGrid(e){let t=Math.max(pd,e.radius),n=Math.floor((e.x-t)/xd),r=Math.floor((e.x+t)/xd),i=Math.floor((e.z-t)/xd),a=Math.floor((e.z+t)/xd);for(let t=n;t<=r;t+=1)for(let n=i;n<=a;n+=1){let r=this.colliderCellKey(t,n),i=this.colliderGrid.get(r);i?i.push(e):this.colliderGrid.set(r,[e])}}nearbyColliders(e,t,n=pd){let r=[],i=new Set,a=Math.floor((e-n)/xd),o=Math.floor((e+n)/xd),s=Math.floor((t-n)/xd),c=Math.floor((t+n)/xd);for(let e=a;e<=o;e+=1)for(let t=s;t<=c;t+=1){let n=this.colliderGrid.get(this.colliderCellKey(e,t));if(n)for(let e of n)i.has(e)||(i.add(e),r.push(e))}return r}colliderProxyKey(e){let t=(e,t)=>Math.round(e/t),n=((e.yaw??0)%Math.PI+Math.PI)%Math.PI;return[t(e.x,.05),t(e.z,.05),t(e.halfX??e.radius,.05),t(e.halfZ??e.radius,.05),t(n,Mt.degToRad(2)),t(e.minY??0,.1),t(e.maxY??0,.1)].join(`:`)}normalizeCollider(e){let t=this.terrainHeight(e.x,e.z),n=Number.isFinite(e.minY)?e.minY:t-.18,r=Nd(1.8+e.radius*1.8,2.2,12),i=Number.isFinite(e.maxY)?Math.max(n+.08,e.maxY):t+r;return{...e,minY:n,maxY:i,yaw:e.yaw??0,supportsPlayer:e.supportsPlayer??!1}}verticalOverlapRatio(e,t){let n=e.minY,r=e.maxY,i=t.minY,a=t.maxY;return Math.max(0,Math.min(r,a)-Math.max(n,i))/Math.max(.001,Math.min(r-n,a-i))}isDuplicateProxy(e,t){let n=Math.hypot(e.x-t.x,e.z-t.z),r=Math.min(e.radius,t.radius);if(t.source===`authored`)return n<=Math.min(.42,Math.max(.1,r*.22))&&t.radius>=e.radius*.58&&this.verticalOverlapRatio(e,t)>.45;if(t.source!==`instance`&&t.source!==`traversal`||n>Math.min(.32,Math.max(.07,r*.16))||this.verticalOverlapRatio(e,t)<.62)return!1;let i=(e.halfX??e.radius)*(e.halfZ??e.radius),a=(t.halfX??t.radius)*(t.halfZ??t.radius);if(Math.min(i,a)/Math.max(.001,Math.max(i,a))<.52)return!1;if(e.halfX!==void 0&&e.halfZ!==void 0&&t.halfX!==void 0&&t.halfZ!==void 0){let n=Math.abs((e.yaw??0)-(t.yaw??0));if(Math.min(n%Math.PI,Math.PI-n%Math.PI)>Mt.degToRad(8))return!1}return!0}registerWorldCollider(e){let t=this.normalizeCollider(e);if(!(!Number.isFinite(t.x)||!Number.isFinite(t.z)||!Number.isFinite(t.radius)||t.radius<=0)){if(t.source!==`authored`){let e=this.colliderProxyKey(t);if(this.colliderProxyKeys.has(e)||this.nearbyColliders(t.x,t.z,t.radius).some(e=>this.isDuplicateProxy(t,e)))return;t.proxyKey=e,this.colliderProxyKeys.add(e)}this.colliders.push(t),this.addColliderToGrid(t),t.source===`instance`&&(this.instanceColliderCount+=1)}}traversalColliderRole(e){if(e.name===`resonance-spine`||e.name.startsWith(`secondary-route-`))return null;let t=new Set([`breathworks-maintenance-gantry`,`breathworks-elevated-circulation-tier`,`breathworks-open-bay-floor-and-exits`,`reservoir-ground-level-ramp-deck`]);return e.userData.traversalSurface===!0||t.has(e.name)?`surface`:e.userData.traversalBarrier===!0?`barrier`:e.userData.traversalCeiling===!0?`ceiling`:null}finalizeWorldColliders(){let e=this.colliders.slice();this.colliders.length=0,this.colliderGrid.clear(),this.colliderProxyKeys.clear(),this.instanceColliderCount=0,e.forEach(e=>this.registerWorldCollider({...e,source:`authored`})),this.scene.updateMatrixWorld(!0);let t=new nn,n=new nn,r=new er,i=new U,a=new U,o=new Nt,s=new U,c=new G(0,0,0,`YXZ`),l=new U,u=new U,d=new U;this.scene.traverse(e=>{let f=this.traversalColliderRole(e),p=f!==null;if(e instanceof J&&!(e instanceof Y)&&p){let t=e.geometry;t.boundingBox||t.computeBoundingBox();let n=t.boundingBox;if(n){let t=n.max.x-n.min.x,p=n.max.z-n.min.z;r.copy(n).applyMatrix4(e.matrixWorld),r.getCenter(i),e.matrixWorld.decompose(s,o,a),c.setFromQuaternion(o,`YXZ`);let m=Math.max(.08,Math.abs(t*a.x)*.5),h=Math.max(.08,Math.abs(p*a.z)*.5),g=c.y;if(l.set(1,0,0).applyQuaternion(o),u.set(0,1,0).applyQuaternion(o),d.set(0,0,1).applyQuaternion(o),Math.abs(u.y)<.85){let e=n.max.y-n.min.y,r=[{axis:l,extent:Math.abs(t*a.x)*.5},{axis:u,extent:Math.abs(e*a.y)*.5},{axis:d,extent:Math.abs(p*a.z)*.5}],i=r.reduce((e,t)=>{let n=e.extent*Math.hypot(e.axis.x,e.axis.z);return t.extent*Math.hypot(t.axis.x,t.axis.z)>n?t:e}),o=Math.hypot(i.axis.x,i.axis.z);if(o>1e-5){let e=i.axis.x/o,t=i.axis.z/o,n=-t,a=e;m=Math.max(.04,r.reduce((n,r)=>n+Math.abs(r.axis.x*e+r.axis.z*t)*r.extent,0)),h=Math.max(.04,r.reduce((e,t)=>e+Math.abs(t.axis.x*n+t.axis.z*a)*t.extent,0)),g=Math.atan2(-t,e)}}this.registerWorldCollider({x:i.x,z:i.z,radius:Math.hypot(m,h),halfX:m,halfZ:h,yaw:g,minY:r.min.y,maxY:r.max.y,supportsPlayer:f===`surface`,source:`traversal`,label:e.name})}return}if(!(e instanceof Y)||e.count<=0)return;let m=e.geometry;m.boundingBox||m.computeBoundingBox();let h=m.boundingBox;if(!h)return;let g=h.max.x-h.min.x,_=h.max.y-h.min.y,v=h.max.z-h.min.z;if(!(g<=0||_<=0||v<0||!p&&Math.max(g,v)>18))for(let m=0;m<e.count;m+=1){e.getMatrixAt(m,t),n.multiplyMatrices(e.matrixWorld,t),n.decompose(s,o,a),r.copy(h).applyMatrix4(n),r.getCenter(i);let y=r.max.y-r.min.y;if(!p&&y<1.45)continue;let b=Math.max(.08,Math.abs(g*a.x)*.5),x=Math.max(.08,Math.abs(v*a.z)*.5);c.setFromQuaternion(o,`YXZ`);let S=c.y;if(l.set(1,0,0).applyQuaternion(o),u.set(0,1,0).applyQuaternion(o),d.set(0,0,1).applyQuaternion(o),p&&Math.abs(u.y)<.85){let e=Math.abs(g*a.x)*.5,t=Math.abs(_*a.y)*.5,n=Math.abs(v*a.z)*.5,r=[{axis:l,extent:e},{axis:u,extent:t},{axis:d,extent:n}],i=r.reduce((e,t)=>{let n=e.extent*Math.hypot(e.axis.x,e.axis.z);return t.extent*Math.hypot(t.axis.x,t.axis.z)>n?t:e}),o=Math.hypot(i.axis.x,i.axis.z);if(o>1e-5){let e=i.axis.x/o,t=i.axis.z/o,n=-t,a=e;b=Math.max(.04,r.reduce((n,r)=>n+Math.abs(r.axis.x*e+r.axis.z*t)*r.extent,0)),x=Math.max(.04,r.reduce((e,t)=>e+Math.abs(t.axis.x*n+t.axis.z*a)*t.extent,0)),S=Math.atan2(-t,e)}}let C=Math.hypot(b,x);if(!p&&(C<.14||C>5.5))continue;let w=this.terrainHeight(i.x,i.z);!p&&(r.max.y<w+.5||r.min.y>w+1.1)||this.registerWorldCollider({x:i.x,z:i.z,radius:C,halfX:b,halfZ:x,yaw:S,minY:r.min.y,maxY:r.max.y,supportsPlayer:f===`surface`,source:p?`traversal`:`instance`,label:e.name||`instanced-proxy`})}})}colliderBlocksPlayer(e,t,n,r){let i=e.minY,a=e.maxY;return!(n<=i+Sd||t>=a-Sd||r&&e.supportsPlayer&&a>=t-.035&&a<=t+hd+gd+Sd)}horizontalOverlap(e,t,n,r=pd){let i=t-e.x,a=n-e.z;if(e.halfX!==void 0&&e.halfZ!==void 0){let t=Math.cos(e.yaw??0),n=Math.sin(e.yaw??0),o=t*i-n*a,s=n*i+t*a,c=Nd(o,-e.halfX,e.halfX),l=Nd(s,-e.halfZ,e.halfZ);return Math.hypot(o-c,s-l)<=r+Sd}return Math.hypot(i,a)<=e.radius+r}overlapContact(e,t){let n=e.x-t.x,r=e.z-t.z;if(t.halfX!==void 0&&t.halfZ!==void 0){let e=Math.cos(t.yaw??0),i=Math.sin(t.yaw??0),a=e*n-i*r,o=i*n+e*r,s=Nd(a,-t.halfX,t.halfX),c=Nd(o,-t.halfZ,t.halfZ),l=a-s,u=o-c,d=Math.hypot(l,u),f=0,p=0,m=0;if(d>Sd){if(d>=pd)return null;f=l/d,p=u/d,m=pd-d}else{let e=t.halfX-Math.abs(a),n=t.halfZ-Math.abs(o);e<n?(f=a>=0?1:-1,m=pd+e):(p=o>=0?1:-1,m=pd+n)}return{normalX:e*f+i*p,normalZ:-i*f+e*p,depth:m}}let i=Math.hypot(n,r),a=t.radius+pd;return i>=a?null:i<=Sd?{normalX:1,normalZ:0,depth:a}:{normalX:n/i,normalZ:r/i,depth:a-i}}projectVelocityFromContact(e,t,n){let r=e.x*t+e.z*n;r<0&&(e.x-=t*r,e.z-=n*r)}depenetratePlayer(e,t,n,r,i){let a=[];for(let o=0;o<4;o+=1){let o=!1,s=this.nearbyColliders(e.x,e.z,pd);for(let c of s){if(!this.colliderBlocksPlayer(c,t,n,r))continue;let s=this.overlapContact(e,c);s&&(e.x+=s.normalX*(s.depth+Sd),e.z+=s.normalZ*(s.depth+Sd),this.projectVelocityFromContact(i,s.normalX,s.normalZ),a.push({collider:c,normalX:s.normalX,normalZ:s.normalZ,toi:0}),o=!0)}if(!o)break}return a}sweepAgainstCollider(e,t,n,r,i){let a=e-i.x,o=t-i.z;if(i.halfX===void 0||i.halfZ===void 0){let e=i.radius+pd,t=n*n+r*r;if(t<=1e-12)return null;let s=a*a+o*o-e*e;if(s<=0)return null;let c=a*n+o*r;if(c>=0)return null;let l=c*c-t*s;if(l<0)return null;let u=(-c-Math.sqrt(l))/t;if(u<0||u>1)return null;let d=a+n*u,f=o+r*u,p=Math.hypot(d,f);return p<=Sd?null:{collider:i,normalX:d/p,normalZ:f/p,toi:u}}let s=Math.cos(i.yaw??0),c=Math.sin(i.yaw??0),l=s*a-c*o,u=c*a+s*o,d=s*n-c*r,f=c*n+s*r,p=1/0,m=0,h=0,g=(e,t,n)=>{e<-Sd||e>1+Sd||e>=p||d*t+f*n>=-Sd||(p=Nd(e,0,1),m=t,h=n)};if(Math.abs(d)>1e-10)for(let e of[-1,1]){let t=(e*(i.halfX+pd)-l)/d,n=u+f*t;Math.abs(n)<=i.halfZ+Sd&&g(t,e,0)}if(Math.abs(f)>1e-10)for(let e of[-1,1]){let t=(e*(i.halfZ+pd)-u)/f,n=l+d*t;Math.abs(n)<=i.halfX+Sd&&g(t,0,e)}let _=d*d+f*f;if(_>1e-12)for(let e of[-1,1])for(let t of[-1,1]){let n=e*i.halfX,r=t*i.halfZ,a=l-n,o=u-r,s=a*d+o*f,c=a*a+o*o-pd*pd;if(c<=0||s>=0)continue;let p=s*s-_*c;if(p<0)continue;let m=(-s-Math.sqrt(p))/_,h=l+d*m,v=u+f*m;e*h<i.halfX-Sd||t*v<i.halfZ-Sd||g(m,(h-n)/pd,(v-r)/pd)}return Number.isFinite(p)?{collider:i,normalX:s*m+c*h,normalZ:-c*m+s*h,toi:p}:null}sweepPlayerHorizontal(e,t,n,r,i,a,o,s){let c=new U(e,0,t),l=this.depenetratePlayer(c,i,a,o,s),u=n,d=r;for(let e=0;e<Cd;e+=1){let e=Math.hypot(u,d);if(e<=1e-8)break;let t=c.x+u*.5,n=c.z+d*.5,r=this.nearbyColliders(t,n,e*.5+pd),f=null;for(let e of r){if(!this.colliderBlocksPlayer(e,i,a,o))continue;let t=this.sweepAgainstCollider(c.x,c.z,u,d,e);t&&(!f||t.toi<f.toi)&&(f=t)}if(!f){c.x+=u,c.z+=d,u=0,d=0;break}let p=Math.max(0,f.toi-Sd/e);c.x+=u*p,c.z+=d*p,c.x+=f.normalX*Sd,c.z+=f.normalZ*Sd;let m=Math.max(0,1-f.toi);u*=m,d*=m;let h=u*f.normalX+d*f.normalZ;h<0&&(u-=f.normalX*h,d-=f.normalZ*h),this.projectVelocityFromContact(s,f.normalX,f.normalZ),l.push(f)}let f=this.depenetratePlayer(c,i,a,o,s);l.push(...f);let p=c.x,m=c.z;return c.x=Nd(c.x,-128,128),c.z=Nd(c.z,-128,126),c.x!==p&&s.x*(p-c.x)>0&&(s.x=0),c.z!==m&&s.z*(m-c.z)>0&&(s.z=0),{position:c,contacts:l}}resolvePlayerCollisions(e,t,n,r=!1){let i=new U;return this.depenetratePlayer(e,t,n,r,i).length}supportSurfacesAt(e,t){let n=[],r=this.terrainNormalY(e,t);this.isWalkableNormal(r)&&n.push({height:this.terrainHeight(e,t),normalY:r,collider:null});for(let r of this.nearbyColliders(e,t,pd+.1))!r.supportsPlayer||!this.horizontalOverlap(r,e,t,pd*.55)||n.push({height:r.maxY,normalY:1,collider:r});return n}findSupportSurface(e,t,n,r=hd,i=_d){return this.supportSurfacesAt(e,t).filter(e=>e.height<=n+r+(e.collider?.supportsPlayer?gd:0)+Sd&&e.height>=n-i-Sd).sort((e,t)=>t.height-e.height)[0]??null}isPlayerPositionClear(e,t,n,r=!0){let i=new U(e,0,t),a=n+Q+fd;return!this.nearbyColliders(e,t,pd+.1).some(e=>this.colliderBlocksPlayer(e,n,a,r)&&!!this.overlapContact(i,e))}findSafeSupportPosition(e,t,n,r=!1){let i=[{x:e,z:t,distance:0}],a=this.lastSafePlayerPosition;if(a){let n=Math.hypot(a.x-e,a.z-t);n<=Td*1.5&&i.push({x:a.x,z:a.z,distance:n})}let o=.45;for(let n=o;n<=Td+Sd;n+=o)for(let r=0;r<24;r+=1){let a=r/24*dd;i.push({x:e+Math.cos(a)*n,z:t+Math.sin(a)*n,distance:n})}let s=r?1/0:hd+_d,c=null;for(let e of i){let t=this.supportSurfacesAt(e.x,e.z).sort((e,t)=>Math.abs(e.height-n)-Math.abs(t.height-n));for(let r of t){let t=Math.abs(r.height-n);if(t>s||!this.isPlayerPositionClear(e.x,e.z,r.height,!0))continue;let i=e.distance+t*.08;(!c||i<c.score)&&(c={position:new U(e.x,r.height+Q,e.z),score:i});break}}return c?.position??null}rememberSafePlayerPosition(){if(!this.player.grounded)return;let e=this.player.position.y-Q,t=this.findSupportSurface(this.player.position.x,this.player.position.z,e,.09,.09);!t||!this.isPlayerPositionClear(this.player.position.x,this.player.position.z,t.height,!0)||(this.lastSafePlayerPosition||=new U,this.lastSafePlayerPosition.set(this.player.position.x,t.height+Q,this.player.position.z))}recoverPlayerIfBelowTerrain(e){let t=this.terrainHeight(this.player.position.x,this.player.position.z),n=this.player.position.y-Q;if(n>=t-Ed)return!1;let r=t-n,i=this.terrainNormalY(this.player.position.x,this.player.position.z);if(r<=hd+Sd)return this.recordCollisionCorrection(r),this.player.position.y=t+Q+Sd,this.player.velocity.y=0,this.player.grounded=this.isWalkableNormal(i),this.player.grounded?this.rememberSafePlayerPosition():this.applySteepSlopeSlide(this.player.position.x,this.player.position.z,e),!0;this.recordCollisionRecovery(r);let a=this.findSafeSupportPosition(this.player.position.x,this.player.position.z,n,!0);return a?(this.player.position.copy(a),this.player.velocity.set(0,0,0),this.player.grounded=!0,this.rememberSafePlayerPosition(),!0):(this.player.position.y=t+Q+Sd,this.player.velocity.y=0,this.player.grounded=this.isWalkableNormal(i),this.player.grounded?this.rememberSafePlayerPosition():this.applySteepSlopeSlide(this.player.position.x,this.player.position.z,e),!0)}terrainBarrierNormal(e,t,n,r){let{dx:i,dz:a}=this.terrainGradient(e,t),o=Math.hypot(i,a);if(o>1e-5)return{x:-i/o,z:-a/o};let s=Math.hypot(n,r)||1;return{x:-n/s,z:-r/s}}projectHorizontalAgainstNormal(e,t,n,r){let i=e*n+t*r;return i<0?{x:e-n*i,z:t-r*i}:{x:e,z:t}}recordCollisionCorrection(e){!Number.isFinite(e)||e<0||(this.maxDepenetrationCorrection=Math.max(this.maxDepenetrationCorrection,e))}recordCollisionRecovery(e){this.collisionRecoveryCount+=1,this.recordCollisionCorrection(e)}movePlayerHorizontal(e,t,n,r){let i=this.player.position.x,a=this.player.position.z,o=this.player.position.y-Q,s=this.player.position.y+fd,c=this.player.velocity.clone(),l=c.clone(),u=this.sweepPlayerHorizontal(i,a,e,t,o,s,n,l),d=Math.hypot(e,t),f=Math.hypot(u.position.x-i,u.position.z-a),p=this.terrainHeight(i,a),m=this.terrainHeight(u.position.x,u.position.z),h=u.contacts.some(e=>e.toi<=Sd),g=h?Math.hypot(u.position.x-(i+e),u.position.z-(a+t)):0;this.recordCollisionCorrection(g);let _=Math.abs(m-p)>hd+_d;if(h&&(f>d+wd||_)){this.recordCollisionRecovery(g);let e=this.findSafeSupportPosition(i,a,o);if(e){this.player.position.copy(e),this.player.velocity.set(0,0,0),this.player.grounded=!0,this.lastPlayerContacts=u.contacts.length,this.lastPlayerContactLabels=u.contacts.map(e=>e.collider.label??e.collider.source??`unknown`),this.rememberSafePlayerPosition();return}this.player.position.x=i,this.player.position.z=a,this.player.velocity.set(0,0,0),this.player.position.y=p+Q+Sd;let t=this.terrainNormalY(i,a);this.player.grounded=this.isWalkableNormal(t),this.player.grounded||this.applySteepSlopeSlide(i,a,r),this.lastPlayerContacts=u.contacts.length,this.lastPlayerContactLabels=u.contacts.map(e=>e.collider.label??e.collider.source??`unknown`);return}let v=this.terrainHeight(u.position.x,u.position.z),y=this.terrainNormalY(u.position.x,u.position.z);if(v>o+(n?hd:Sd)||v>=o-_d&&!this.isWalkableNormal(y)){let r=this.terrainBarrierNormal(u.position.x,u.position.z,e,t),d=this.projectHorizontalAgainstNormal(e,t,r.x,r.z);l=c.clone();let f=this.projectHorizontalAgainstNormal(l.x,l.z,r.x,r.z);l.x=f.x,l.z=f.z,u=this.sweepPlayerHorizontal(i,a,d.x,d.z,o,s,n,l)}if(this.player.position.x=u.position.x,this.player.position.z=u.position.z,this.player.velocity.x=l.x,this.player.velocity.z=l.z,this.lastPlayerContacts=u.contacts.length,this.lastPlayerContactLabels=u.contacts.map(e=>e.collider.label??e.collider.source??`unknown`),n){let e=this.findSupportSurface(this.player.position.x,this.player.position.z,o);e?(this.player.position.y=e.height+Q,this.player.velocity.y=0,this.player.grounded=!0):this.player.grounded=!1}Number.isFinite(this.player.position.x+this.player.position.z+this.player.velocity.x+this.player.velocity.z+r)||(this.player.position.x=i,this.player.position.z=a,this.player.velocity.x=0,this.player.velocity.z=0)}applySteepSlopeSlide(e,t,n){let{dx:r,dz:i}=this.terrainGradient(e,t),a=Math.hypot(r,i);if(a<=1e-6)return;let o=1/Math.sqrt(1+a*a),s=20.5*Math.sqrt(Math.max(0,1-o*o));this.player.velocity.x+=-r/a*s*n,this.player.velocity.z+=-i/a*s*n;let c=Math.hypot(this.player.velocity.x,this.player.velocity.z);c>9.5&&(this.player.velocity.x=this.player.velocity.x/c*9.5,this.player.velocity.z=this.player.velocity.z/c*9.5)}resolvePlayerVertical(e){if(this.recoverPlayerIfBelowTerrain(e))return;let t=this.player.position.y,n=t-Q,r=t+fd;this.player.velocity.y-=20.5*e;let i=t+this.player.velocity.y*e,a=i-Q,o=i+fd;if(this.player.velocity.y>0){let e=1/0;for(let t of this.nearbyColliders(this.player.position.x,this.player.position.z,pd+.1)){let n=t.minY;r<=n+Sd&&o>=n-Sd&&this.horizontalOverlap(t,this.player.position.x,this.player.position.z,pd)&&(e=Math.min(e,n))}if(Number.isFinite(e)){this.player.position.y=e-fd-Sd,this.player.velocity.y=0,this.player.grounded=!1;return}this.player.position.y=i,this.player.grounded=!1;return}let s=this.supportSurfacesAt(this.player.position.x,this.player.position.z).filter(e=>n>=e.height-Sd&&a<=e.height+Sd).sort((e,t)=>t.height-e.height)[0];if(s){this.player.position.y=s.height+Q,this.player.velocity.y=0,this.player.grounded=!0;return}let c=this.terrainHeight(this.player.position.x,this.player.position.z),l=this.terrainNormalY(this.player.position.x,this.player.position.z);if(a<=c+Sd&&!this.isWalkableNormal(l)){this.player.position.y=c+Q+Sd,this.player.velocity.y=0,this.player.grounded=!1,this.applySteepSlopeSlide(this.player.position.x,this.player.position.z,e);return}this.player.position.y=i,this.player.grounded=!1}addSurfaceDetail(e,t,n=3,r=.06){let a=document.createElement(`canvas`);a.width=192,a.height=192;let o=a.getContext(`2d`);if(!o)return;let s=new Ld(t),c=o.createImageData(192,192);for(let e=0;e<36864;e+=1){let t=e%192,n=Math.floor(e/192),r=Math.sin(n*.22+Math.sin(t*.035)*3.4)*18+Math.sin((t+n)*.06)*7,i=s.range(-34,34),a=Nd(146+r+i,38,228);c.data[e*4]=a,c.data[e*4+1]=a,c.data[e*4+2]=a,c.data[e*4+3]=255}o.putImageData(c,0,0),o.globalAlpha=.62,o.strokeStyle=`#252525`;for(let e=0;e<18;e+=1){let e=s.range(0,192),t=s.range(0,192);o.lineWidth=s.range(.4,1.5),o.beginPath(),o.moveTo(e,t),o.bezierCurveTo(e+s.range(-18,18),t+s.range(4,20),e+s.range(-12,22),t+s.range(20,42),e+s.range(-8,28),t+s.range(35,70)),o.stroke()}o.globalAlpha=1;let l=new Ri(a);l.wrapS=i,l.wrapT=i,l.repeat.set(n,n),l.colorSpace=``,this.renderer&&(l.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy())),e.bumpMap=l,e.bumpScale=r,e.needsUpdate=!0}makeTerrainTexture(){let e=document.createElement(`canvas`);e.width=512,e.height=512;let t=e.getContext(`2d`);if(!t)return null;let n=t.createImageData(512,512),r=n.data,a=new Ld(43295);for(let e=0;e<512*512;e+=1){let t=e%512,n=Math.floor(e/512),i=Math.sin(t*.018+Math.sin(n*.013)*2.1)*.5+Math.cos(n*.021-Math.sin(t*.009)*1.7)*.32,o=Math.sin(t*.084+n*.026+Math.sin(n*.037)*2.4)*.5,s=Math.sin(t*.51+n*.37)*.18+(a.next()-.5)*.34,c=i*17+o*9+s*14;r[e*4]=Nd(196+c*.84,154,231),r[e*4+1]=Nd(202+c,158,237),r[e*4+2]=Nd(197+c*.76,152,229),r[e*4+3]=255}t.putImageData(n,0,0),t.globalCompositeOperation=`multiply`,t.globalAlpha=.16,t.strokeStyle=`#38433f`;for(let e=0;e<26;e+=1){let e=a.range(0,512),n=a.range(0,512);t.lineWidth=a.range(.6,2.1),t.beginPath(),t.moveTo(e,n),t.bezierCurveTo(e+a.range(-28,28),n+a.range(12,48),e+a.range(-38,38),n+a.range(45,92),e+a.range(-30,30),n+a.range(85,145)),t.stroke()}t.globalAlpha=1,t.globalCompositeOperation=`source-over`;let o=new Ri(e);return o.wrapS=i,o.wrapT=i,o.repeat.set(5.5,5.5),o.colorSpace=Ve,this.renderer&&(o.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy())),o}makeTerrainHeightTexture(){let e=document.createElement(`canvas`);e.width=384,e.height=384;let t=e.getContext(`2d`);if(!t)return null;let n=t.createImageData(384,384),r=n.data,a=new Ld(30234);for(let e=0;e<384*384;e+=1){let t=e%384,n=Math.floor(e/384),i=Math.sin(t*.12+Math.sin(n*.046)*2.4)*.5+.5,o=Math.sin((t+n)*.29+Math.cos(t*.071)*1.7)*.5+.5,s=a.next(),c=Nd(102+i*64+o*38+s*22,0,255);r[e*4]=c,r[e*4+1]=c,r[e*4+2]=c,r[e*4+3]=255}t.putImageData(n,0,0);let o=new Ri(e);return o.wrapS=i,o.wrapT=i,o.repeat.set(28,28),o.colorSpace=``,this.renderer&&(o.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy())),o}makeTerrainRoughnessTexture(){let e=document.createElement(`canvas`);e.width=256,e.height=256;let t=e.getContext(`2d`);if(!t)return null;let n=t.createImageData(256,256),r=n.data,a=new Ld(20970);for(let e=0;e<256*256;e+=1){let t=e%256,n=Math.floor(e/256),i=Math.sin(t*.063+Math.sin(n*.029)*1.8)*9+Math.cos(n*.087-t*.021)*6,o=Math.max(0,Math.sin(t*.017+n*.011)*.5+.5)**7*17,s=Nd(238+i-o+a.range(-8,8),196,255);r[e*4]=s,r[e*4+1]=s,r[e*4+2]=s,r[e*4+3]=255}t.putImageData(n,0,0);let o=new Ri(e);return o.wrapS=i,o.wrapT=i,o.repeat.set(12,12),o.colorSpace=``,this.renderer&&(o.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy())),o}buildTerrain(){let e=new wa(Dd,Dd,this.quality===`low`?100:150,this.quality===`low`?100:150),t=e.attributes.position,n=[],r=new K(1386540),i=new K(6578778),a=new K(9537399),o=new K(8159607),s=new K(9670787),c=new K(5133648),l=new K(1055003),u=[{x:0,z:67,radius:28},{x:-25,z:31,radius:25},{x:34,z:-8,radius:29},{x:-19,z:-48,radius:25},{x:2,z:-104,radius:34}];for(let e=0;e<t.count;e+=1){let d=t.getX(e),f=-t.getY(e),p=this.terrainHeight(d,f);t.setZ(e,p);let m=Id(-6,10,p),h=r.clone().lerp(i,m);h.lerp(a,Id(6,17,p)*.58);let g=Math.sin(d*.027+Math.sin(f*.019)*1.7)*.5+Math.cos(f*.031-d*.014)*.31+Math.sin((d+f)*.074)*.12,_=1-this.terrainNormalY(d,f);h.multiplyScalar(.91+g*.1-_*.42);let v=Yu(d,f),y=1-Id(4.5,16,v),b=1-Id(1.6,5.6,v);h.lerp(o,y*.34),h.lerp(s,b*(.22+(Math.sin(d*.22-f*.17)*.5+.5)*.08));let x=0,S=0;for(let e of u){let t=Math.hypot(d-e.x,f-e.z)/e.radius;x=Math.max(x,1-Id(.34,1.08,t)),S=Math.max(S,Id(.48,.7,t)*(1-Id(.78,1.02,t)))}h.lerp(c,x*.18),h.multiplyScalar(1-S*.1);let C=Math.sin(d*.18+f*.11+Math.sin(f*.037)*2.2)*.5+.5;C>.92&&h.lerp(l,Id(.92,1,C)*.38),n.push(h.r,h.g,h.b)}e.setAttribute(`color`,new q(n,3)),e.computeVertexNormals(),e.rotateX(-Math.PI/2);let d=new J(e,new Ba({color:16777215,map:this.makeTerrainTexture(),bumpMap:this.makeTerrainHeightTexture(),bumpScale:.032,roughnessMap:this.makeTerrainRoughnessTexture(),vertexColors:!0,roughness:.95,metalness:0,envMapIntensity:.18}));d.receiveShadow=!0,d.userData.surface=`terrain`,this.scene.add(d),this.shootables.push(d),this.player.position.y=this.terrainHeight(this.player.position.x,this.player.position.z)+Q}makeRouteSurfaceTextures(){let e=document.createElement(`canvas`),t=document.createElement(`canvas`),n=document.createElement(`canvas`);[e,t,n].forEach(e=>{e.width=384,e.height=384});let r=e.getContext(`2d`),a=t.getContext(`2d`),o=n.getContext(`2d`);if(!r||!a||!o)return null;let s=r.createImageData(384,384),c=a.createImageData(384,384),l=o.createImageData(384,384),u=new Ld(499988);for(let e=0;e<384*384;e+=1){let t=e%384,n=Math.floor(e/384),r=Math.abs(t/383-.5)*2,i=1-Id(.06,.86,r),a=Id(.66,1,r),o=Math.exp(-(((r-.43)/.12)**2))*.78+Math.exp(-((r/.18)**2))*.26,d=Math.sin(n/384*dd*3+Math.sin(t*.025)*1.8)*.5+.5,f=Math.max(0,Math.sin(t*.031+n*.019)*Math.cos(n*.043-t*.014))**4,p=u.range(-8,8),m=i*9+o*d*11-a*18-f*15+p;s.data[e*4]=Nd(112+m*.9,68,142),s.data[e*4+1]=Nd(121+m,72,151),s.data[e*4+2]=Nd(113+m*.72,67,140),s.data[e*4+3]=255;let h=Nd(132+(Math.sin(t*.51+n*.17)*18+Math.cos(n*.63-t*.23)*11+u.range(-19,19))-f*28,54,202);c.data[e*4]=h,c.data[e*4+1]=h,c.data[e*4+2]=h,c.data[e*4+3]=255;let g=Nd(242-i*15-o*d*11+p,196,255);l.data[e*4]=g,l.data[e*4+1]=g,l.data[e*4+2]=g,l.data[e*4+3]=255}r.putImageData(s,0,0),a.putImageData(c,0,0),o.putImageData(l,0,0);let d=(e,t,n,r,a)=>{let o=new Ri(e);return o.name=t,o.wrapS=i,o.wrapT=i,o.repeat.set(r,a),o.colorSpace=n,this.renderer&&(o.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy())),o};return{color:d(e,`route-wear-color`,Ve,1,.28),height:d(t,`route-wear-height`,``,2.3,1.25),roughness:d(n,`route-wear-roughness`,``,1,.42)}}makeContactFadeTexture(){let e=document.createElement(`canvas`);e.width=256,e.height=256;let t=e.getContext(`2d`);if(!t)return null;let n=t.createImageData(256,256),r=new Ld(12602055);for(let e=0;e<256*256;e+=1){let t=e%256/255*2-1,i=Math.floor(e/256)/255*2-1,a=Math.atan2(i,t),o=Math.sin(a*5+.7)*.055+Math.sin(a*11-1.2)*.025,s=Nd((1-Id(.08,.97,Math.hypot(t,i)*(1+o)))*(.82+Math.sin(t*17+i*11)*.06+Math.sin(i*31-t*7)*.035+r.range(-.035,.035))*255,0,255);n.data[e*4]=s,n.data[e*4+1]=s,n.data[e*4+2]=s,n.data[e*4+3]=255}t.putImageData(n,0,0);let i=new Ri(e);return i.name=`civic-contact-falloff`,i.colorSpace=``,i.minFilter=f,i.magFilter=u,i}polishCivilizationMaterials(e){let t=new Map;e.traverse(e=>{e instanceof Oo&&(e.intensity*=.78,e.distance*=.92),e instanceof J&&(Array.isArray(e.material)?e.material:[e.material]).forEach(n=>{let r=t.get(n)??new Set;r.add(e.name.toLowerCase()),t.set(n,r)})}),t.forEach((e,t)=>{if(!(t instanceof Ba||t instanceof Va))return;let n=[...e].join(` `),r=/signal|inlay|readout|aperture|meter|bellglass|occup|interior|core/.test(n),i=t.transparent||t.opacity<.99;Math.max(t.color.r,t.color.g,t.color.b)>.58&&!r?t.color.lerp(new K(9409674),.3).multiplyScalar(.9):!r&&!i&&t.color.multiplyScalar(.94),t.emissive&&(t.emissive.multiplyScalar(r?.72:.52),t.emissiveIntensity=Math.min(t.emissiveIntensity,r?.52:.26)),i?t.roughness=Math.max(t.roughness,.31):t.roughness=Math.max(t.roughness,t.metalness>.42?.46:.7),t.envMapIntensity=Math.min(t.envMapIntensity,t.metalness>.42?.58:.38),t instanceof Va&&(t.clearcoat=Math.min(t.clearcoat,.38),t.clearcoatRoughness=Math.max(t.clearcoatRoughness,.24)),t.dithering=!0,t.needsUpdate=!0});let n=this.makeRouteSurfaceTextures();if(n){let t=new Set;e.traverse(e=>{e instanceof J&&(e.name!==`resonance-spine`&&!e.name.startsWith(`secondary-route-`)||(Array.isArray(e.material)?e.material:[e.material]).forEach(e=>{e instanceof Ba&&t.add(e)}))}),t.forEach(e=>{e.color.set(15922157),e.map=n.color,e.bumpMap=n.height,e.bumpScale=.026,e.roughnessMap=n.roughness,e.roughness=.94,e.metalness=.015,e.envMapIntensity=.18,e.needsUpdate=!0})}let r=e.getObjectByName(`civic-hero-structure-contact-patches`);if(r instanceof Y){let e=Array.isArray(r.material)?r.material[0]:r.material;r.material=new Ba({color:1055257,alphaMap:this.makeContactFadeTexture(),transparent:!0,opacity:.7,depthWrite:!1,roughness:1,metalness:0,envMapIntensity:0,polygonOffset:!0,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),r.renderOrder=2,e.dispose()}e.userData.renderPolish={materialHierarchy:!0,routeWear:!!n,contactFalloff:!!r}}refreshCivilizationTexturePolish(){if(this.cityTexturePolishComplete||!this.cityRoot)return;let e=this.cityRoot.userData.authoredTextures;if(!e||e.mode===`loading`)return;let t=new Set,n=new Set;this.cityRoot.traverse(e=>{e instanceof J&&(Array.isArray(e.material)?e.material:[e.material]).forEach(e=>{(e instanceof Ba||e instanceof Va)&&n.add(e)})}),n.forEach(e=>{[e.map,e.bumpMap].forEach(e=>{if(!e||t.has(e))return;t.add(e);let n=e.name.toLowerCase();if(n.includes(`civic-carapace`)||n.includes(`pressure-strata`)||n.includes(`living-membrane`)){let t=n.includes(`pressure-strata`)?1.32:1.2;e.repeat.multiplyScalar(t),e.needsUpdate=!0}}),e.bumpMap?.name.toLowerCase().includes(`civic-carapace`)&&(e.bumpScale=Math.min(e.bumpScale,.052)),e.needsUpdate=!0}),this.cityTexturePolishComplete=!0,this.cityRoot.userData.renderPolish.textureScale=!0}buildGroundVeins(){let e=new Va({color:856599,metalness:.66,roughness:.24,clearcoat:.68,clearcoatRoughness:.17,envMapIntensity:1.25}),t=new Va({color:7280433,emissive:2819863,emissiveIntensity:.34,metalness:.04,roughness:.38,clearcoat:.24}),n=this.quality===`low`?11:22;for(let r=0;r<n;r+=1){let n=this.rng.range(-104,104),i=this.rng.range(-100,105),a=this.rng.range(0,dd),o=this.rng.range(5,18),s=[];for(let e=0;e<5;e+=1){let t=e/4,c=n+Math.sin(a)*o*(t-.5)+Math.sin(t*Math.PI*2+r)*.7,l=i+Math.cos(a)*o*(t-.5)+Math.cos(t*Math.PI*1.6-r)*.55;s.push(new U(c,this.terrainHeight(c,l)+.055,l))}let c=new J(new ka(new ia(s),24,this.rng.range(.045,.13),6,!1),r%5==0?t:e);c.receiveShadow=!0,c.userData.surface=`glass`,this.scene.add(c),this.shootables.push(c)}}buildWater(){[{x:-17,z:6,radius:17,color:5169361},{x:52,z:-51,radius:11,color:14837972}].forEach(({x:e,z:t,radius:n,color:r},i)=>{let a=this.terrainHeight(e,t)+.34,o=new Wi(n,72),s=new Ra({transparent:!0,depthWrite:!1,side:2,blending:1,uniforms:{uTime:{value:i*4.7},uColor:{value:new K(r)},uDepth:{value:new K(465713)}},vertexShader:`
          varying vec2 vUv;
          varying vec3 vWorld;
          void main() {
            vUv = uv;
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,fragmentShader:`
          uniform float uTime;
          uniform vec3 uColor;
          uniform vec3 uDepth;
          varying vec2 vUv;
          varying vec3 vWorld;
          void main() {
            vec2 p = vUv - .5;
            float edge = 1.0 - smoothstep(.34, .5, length(p));
            float wave = sin(vWorld.x * .7 + uTime * .8) * sin(vWorld.z * .58 - uTime * .62);
            float caustic = pow(.5 + .5 * sin(vWorld.x * 1.8 + sin(vWorld.z * 1.2 + uTime)), 8.0);
            vec3 color = mix(uDepth, uColor, .18 + wave * .045 + caustic * .34);
            float alpha = edge * (.72 + wave * .04);
            gl_FragColor = vec4(color, alpha);
          }
        `});this.waterMaterials.push(s);let c=new J(o,s);c.rotation.x=-Math.PI/2,c.position.set(e,a,t),c.renderOrder=2,this.scene.add(c)})}buildDistantCrown(){let e=new Ba({color:2435654,roughness:.94,metalness:.13,envMapIntensity:.38}),t=new Ba({color:3490906,roughness:.84,metalness:.2,emissive:1057086,emissiveIntensity:.55});this.addSurfaceDetail(e,22545,2.2,.16),this.addSurfaceDetail(t,22546,2.4,.12);let n=this.quality===`low`?12:20;for(let r=0;r<n;r+=1){let i=r/n*dd+this.rng.range(-.07,.07),a=this.rng.range(122,190),o=this.rng.range(26,92),s=this.rng.range(5,17),c=new J(this.makeOrganicSpire(o,s,22016+r*91),this.rng.next()>.7?t:e);c.position.set(Math.sin(i)*a,this.terrainHeight(Math.sin(i)*a,Math.cos(i)*a)+o*.48,Math.cos(i)*a),c.rotation.y=this.rng.range(0,dd),c.castShadow=r<12,c.receiveShadow=!0,this.scene.add(c)}}makeOrganicSpire(e,t,n){let r=new Ld(n),i=[],a=[],o=[],s=r.range(-1.1,1.1),c=r.range(-.095,.095)*e,l=r.range(-.075,.075)*e,u=r.range(0,dd);for(let o=0;o<=11;o+=1){let d=o/11,f=(1-d)**.78,p=.78+Math.sin(d*Math.PI*r.range(2.2,4.2)+u)*.17,m=Math.max(.035,t*f*p),h=Math.sin(d*Math.PI*.8)*c,g=Math.sin(d*Math.PI)*l;for(let t=0;t<7;t+=1){let r=t/7*dd+d*s,o=1+Math.sin(t*4.17+n)*.075;i.push(h+Math.cos(r)*m*o,d*e-e*.5,g+Math.sin(r)*m*(.74+d*.16)),a.push(t/7,d)}}for(let e=0;e<11;e+=1)for(let t=0;t<7;t+=1){let n=(t+1)%7,r=e*7+t,i=e*7+n,a=(e+1)*7+t,s=(e+1)*7+n;o.push(r,a,i,i,a,s)}let d=new Mr;return d.setAttribute(`position`,new q(i,3)),d.setAttribute(`uv`,new q(a,2)),d.setIndex(o),d.computeVertexNormals(),d}makeFractureShardGeometry(e){let t=new Ld(e),n=[],r=[],i=[],a=t.range(-.34,.34),o=t.range(-.28,.28),s=t.range(-.85,.85),c=[.28,.72,1,.82,.55,.28,.035];for(let i=0;i<7;i+=1){let l=i/6,u=Math.sin(l*Math.PI)*a,d=Math.sin(l*Math.PI*.86)*o;for(let a=0;a<7;a+=1){let o=a/7*dd+l*s,f=.78+t.range(-.14,.2)+Math.sin(a*2.71+e)*.09,p=c[i]*f;n.push(u+Math.cos(o)*p,l*2-1,d+Math.sin(o)*p*t.range(.66,.92)),r.push(a/7,l)}}for(let e=0;e<6;e+=1)for(let t=0;t<7;t+=1){let n=(t+1)%7,r=e*7+t,a=e*7+n,o=(e+1)*7+t,s=(e+1)*7+n;i.push(r,o,a,a,o,s)}let l=new Mr;return l.setAttribute(`position`,new q(n,3)),l.setAttribute(`uv`,new q(r,2)),l.setIndex(i),l.computeVertexNormals(),l}buildHeroMonument(){let e=new An,t=-112,n=this.terrainHeight(2,t);e.position.set(2,n,t),e.name=`suture-crown-superstructure`;let r=new Va({color:1581352,roughness:.34,metalness:.54,clearcoat:.22,clearcoatRoughness:.4,envMapIntensity:1.05}),i=new Ba({color:7630691,roughness:.78,metalness:.08,emissive:1515040,emissiveIntensity:.2}),a=new Ba({color:8116157,emissive:5502932,emissiveIntensity:1.12,roughness:.24,metalness:.18});this.addSurfaceDetail(r,378641,3.6,.045),this.addSurfaceDetail(i,378642,4.8,.085);let o=new Z(1,1,1,3,.1),s=new Y(o,r,27),c=new Y(o,a,27),l=new nn,u=new U,d=new Nt,f=new U;for(let e=0;e<3;e+=1){let t=e/3*dd+Math.PI/6;for(let n=0;n<9;n+=1){let r=e*9+n,i=n/8,a=7.2-i*3.6,o=7.4;u.set(Math.sin(t)*a,4.2+n*7.15,Math.cos(t)*a),d.setFromEuler(new G(Math.cos(t)*.045,-t+Math.PI/2+i*.08,-Math.sin(t)*.045)),f.set(2.05-i*.72,o,2.55-i*.95),l.compose(u,d,f),s.setMatrixAt(r,l);let p=u.clone().add(new U(-Math.sin(t)*1.18,.1,-Math.cos(t)*1.18));f.set(.12,o*.84,.16),l.compose(p,d,f),c.setMatrixAt(r,l)}}s.instanceMatrix.needsUpdate=!0,s.castShadow=!0,s.receiveShadow=!0,s.name=`crown-segmented-pylons`,c.instanceMatrix.needsUpdate=!0,c.name=`crown-service-light-seams`,e.add(s,c),this.shootables.push(s,c),this.accentLights.push(c);let p=new Y(new Gi(1,1,1,9),i,5);[10,23,36,49,62].forEach((e,t)=>{u.set(0,e,0),d.setFromEuler(new G(0,t*.23+Math.PI/9,0));let n=8.8-t*.78;f.set(n,t===0?1.2:.62,n),l.compose(u,d,f),p.setMatrixAt(t,l)}),p.instanceMatrix.needsUpdate=!0,p.castShadow=!0,p.receiveShadow=!0,p.name=`crown-civic-decks`,p.userData.traversalSurface=!0,e.add(p),this.shootables.push(p);let m=new Y(new Gi(.18,.28,1,6),r,36),h=new U(0,1,0),g=new U,_=0;for(let e=0;e<6;e+=1){let t=12+e*9.6,n=6.75-e*.48;for(let e=0;e<3;e+=1){let r=e/3*dd+Math.PI/6,i=(e+1)/3*dd+Math.PI/6,a=new U(Math.sin(r)*n,t-2.4,Math.cos(r)*n),o=a.clone().setY(t+2.4),s=new U(Math.sin(i)*n,t-2.4,Math.cos(i)*n),c=[[a,s.clone().setY(t+2.4)],[s,o]];for(let[e,t]of c){g.subVectors(t,e);let n=g.length();u.addVectors(e,t).multiplyScalar(.5),d.setFromUnitVectors(h,g.normalize()),f.set(1,n,1),l.compose(u,d,f),m.setMatrixAt(_,l),_+=1}}}m.instanceMatrix.needsUpdate=!0,m.castShadow=!0,m.name=`crown-cross-bracing`,e.add(m),this.shootables.push(m);let v=new J(new Z(6.4,5.5,6.4,5,.65),i);v.position.y=68,v.rotation.y=Math.PI/4,v.castShadow=!0,v.name=`crown-signal-chamber`,v.userData.traversalCeiling=!0,e.add(v),this.shootables.push(v);for(let e=0;e<3;e+=1){let r=e/3*dd+Math.PI/6;this.colliders.push({x:2+Math.sin(r)*6.4,z:t+Math.cos(r)*6.4,radius:1.45,minY:n,maxY:n+72})}let y=new J(new Gi(.12,1.25,112,12,1,!0),new Ur({color:7011305,transparent:!0,opacity:0,side:2,blending:2,depthWrite:!1}));y.position.y=96,y.name=`crown-transmission-beam`,e.add(y),this.scene.add(e)}buildRockFields(){let e=new Va({color:1119516,roughness:.26,metalness:.08,clearcoat:.38,clearcoatRoughness:.24,envMapIntensity:.9}),t=new Ba({color:7368037,roughness:.88,metalness:.03,emissive:2698028,emissiveIntensity:.16,envMapIntensity:.52});this.addSurfaceDetail(e,31249,3.2,.045),this.addSurfaceDetail(t,31250,4.4,.1);let n=this.quality===`low`?28:46,r=[this.makeFractureShardGeometry(28945),this.makeFractureShardGeometry(28946),this.makeFractureShardGeometry(28947)],i=r.map(t=>new Y(t,e,Math.ceil(n/r.length))),a=[0,0,0];i.forEach(e=>{e.castShadow=!0,e.receiveShadow=!0});let o=new nn,s=new Nt,c=new U,l=new U;for(let e=0;e<n;e+=1){let t=0,n=0,r=0;do t=this.rng.range(-128,128),n=this.rng.range(-118,115),r+=1;while(r<9&&(Math.hypot(t,n-72)<28||Math.hypot(t+25,n-47)<18||Yu(t,n)<9||Math.hypot(t+25,n-31)<23||Math.hypot(t-34,n+8)<27||Math.hypot(t+19,n+48)<25||Math.hypot(t-2,n+104)<27||Math.sin(t*.41+n*.29)*.5+.5<.73));let u=this.rng.range(.55,3.8);l.set(t,this.terrainHeight(t,n)+u*.7,n),s.setFromEuler(new G(this.rng.range(-.3,.3),this.rng.range(0,dd),this.rng.range(-.3,.3))),c.set(u*this.rng.range(.55,.95),u*this.rng.range(1.2,3.1),u*this.rng.range(.48,.82)),o.compose(l,s,c);let d=e%i.length;i[d].setMatrixAt(a[d],o),a[d]+=1,u>2.4&&Math.hypot(t,n-72)<95&&this.colliders.push({x:t,z:n,radius:u*.62})}i.forEach((e,t)=>{e.count=a[t],e.instanceMatrix.needsUpdate=!0,this.scene.add(e),this.shootables.push(e)}),[{x:-26,z:46,scale:.62,yaw:-.68},{x:27,z:42,scale:.66,yaw:.72},{x:-43,z:18,scale:.74,yaw:-.58},{x:44,z:-25,scale:.88,yaw:.48},{x:-20,z:-69,scale:1.15,yaw:-.22}].forEach((e,n)=>{let r=new An;r.position.set(e.x,this.terrainHeight(e.x,e.z)+.3,e.z),r.rotation.y=e.yaw,r.scale.setScalar(e.scale);for(let e=0;e<4;e+=1){let i=new Oa(7.2+e*1.4,.58+e*.07,7,34,Math.PI*1.14),a=i.attributes.position;for(let e=0;e<a.count;e+=1){let t=Math.sin(e*1.17+n*2.1)*(.035+e%5*.004);a.setX(e,a.getX(e)*(1+t)),a.setZ(e,a.getZ(e)*(1-t*.8))}i.computeVertexNormals();let o=new J(i,t);o.rotation.set(Math.PI/2,.08*e,-.55),o.position.set(e*1.7-2.3,e*.12,e*-.7),o.castShadow=!0,o.receiveShadow=!0,o.userData.surface=`nacre`,r.add(o),this.shootables.push(o)}this.scene.add(r);for(let t of[-1,1]){let n=t*5.6*e.scale;this.colliders.push({x:e.x+Math.cos(e.yaw)*n,z:e.z-Math.sin(e.yaw)*n,radius:.82*e.scale,minY:this.terrainHeight(e.x,e.z),maxY:this.terrainHeight(e.x,e.z)+14*e.scale})}});let u=new Va({color:8854850,emissive:3739942,emissiveIntensity:.24,roughness:.62,metalness:0,clearcoat:.04,transmission:0,thickness:.3,side:2});this.addSurfaceDetail(u,35600,2.6,.075),[[-12,56,3.8,5.4],[14,47,4.2,5.5],[-42,13,5.8,8.2],[42,-29,4.8,7.2]].forEach(([e,t,n,r],i)=>{let a=new wa(n,r,8,12),o=a.attributes.position;for(let e=0;e<o.count;e+=1){let t=o.getX(e),a=o.getY(e),s=Nd(a/r+.5,0,1),c=.1+Math.sin(s*Math.PI)**.72*.9;o.setX(e,t*c+Math.sin(s*Math.PI*2.4+i)*n*.075),o.setZ(e,Math.sin(t*.7+i)*.34+Math.sin(a*.42-i)*.18)}a.computeVertexNormals();let s=new J(a,u);s.position.set(e,this.terrainHeight(e,t)+r*.5,t),s.rotation.y=i*1.4+.45,s.castShadow=!0,s.userData.surface=`membrane`,this.scene.add(s),this.shootables.push(s),this.colliders.push({x:e,z:t,radius:Math.hypot(n*.45,.18),halfX:n*.45,halfZ:.18,yaw:s.rotation.y,minY:this.terrainHeight(e,t),maxY:this.terrainHeight(e,t)+r})})}buildLungReefs(){let e=new Va({color:7303533,roughness:.74,metalness:.08,clearcoat:.14,clearcoatRoughness:.7,envMapIntensity:.62}),t=new Va({color:2300452,emissive:2755612,emissiveIntensity:.34,roughness:.44,metalness:.16,clearcoat:.28,clearcoatRoughness:.42}),n=new Va({color:4986157,emissive:2951707,emissiveIntensity:.32,roughness:.56,metalness:0,clearcoat:.1,side:2,transparent:!0,opacity:.44,depthWrite:!1}),r=new Ba({color:9806955,emissive:9414986,emissiveIntensity:.42,roughness:.43,metalness:.12});this.addSurfaceDetail(e,36433,3.8,.1),this.addSurfaceDetail(t,36434,2.9,.05),this.addSurfaceDetail(n,36435,2.4,.042),[{x:-61,z:14,height:18,radius:5.2,yaw:-.34,scale:1},{x:64,z:9,height:23,radius:6.1,yaw:.48,scale:1.08},{x:-57,z:-72,height:27,radius:7.2,yaw:-.82,scale:1.15},{x:73,z:-66,height:20,radius:5.7,yaw:.76,scale:.94},{x:56,z:70,height:15,radius:4.4,yaw:.28,scale:.86}].forEach((i,a)=>{let o=new An,s=this.terrainHeight(i.x,i.z)+.15;o.position.set(i.x,s,i.z),o.rotation.y=i.yaw,o.scale.setScalar(i.scale);let c=[];for(let n=0;n<2;n+=1){let r=[];for(let e=0;e<=20;e+=1){let t=e/20,o=t*Math.PI*3.05+n*Math.PI+a*.61,s=i.radius*(.92-t*.34)*(.9+Math.sin(t*Math.PI*4.2+a)*.1);r.push(new U(Math.sin(o)*s,t*i.height+Math.sin(t*Math.PI)*1.15,Math.cos(o)*s*.7))}c.push(r);let l=new J(new ka(new ia(r),this.quality===`low`?42:68,n===0?.34:.24,8,!1),n===0?e:t);l.castShadow=a<3,l.receiveShadow=!0,l.userData.surface=n===0?`nacre`:`membrane`,o.add(l),this.shootables.push(l),r.forEach((e,t)=>{if(t%4!=0)return;let r=Math.cos(i.yaw),a=Math.sin(i.yaw),o=i.x+(e.x*r+e.z*a)*i.scale,c=i.z+(-e.x*a+e.z*r)*i.scale,l=s+e.y*i.scale;this.colliders.push({x:o,z:c,radius:(n===0?.52:.43)*i.scale,minY:l-.62*i.scale,maxY:l+.62*i.scale})})}let l=[],u=[];for(let e=2;e<18;e+=3){let t=c[0][e],n=c[1][e],r=c[0][e+2];[t,n,r,n,c[1][e+2],r].forEach(e=>{l.push(e.x,e.y,e.z)}),u.push(0,0,1,0,0,1,1,0,1,1,0,1)}let d=new Mr;d.setAttribute(`position`,new q(l,3)),d.setAttribute(`uv`,new q(u,2)),d.computeVertexNormals();let f=new J(d,n);f.castShadow=a<3,f.userData.surface=`membrane`,o.add(f),this.shootables.push(f);let p=new J(new Oa(i.radius*.68,.22,8,42),r);p.position.y=i.height*.93,p.rotation.set(Math.PI/2-.18,.12,a*.42),p.scale.y=.62,p.castShadow=a<3,o.add(p),this.scene.add(o)})}makeSailGeometry(){let e=new wa(1,1,2,5);e.translate(0,.5,0);let t=e.attributes.position;for(let e=0;e<t.count;e+=1){let n=t.getX(e),r=t.getY(e),i=Math.sin(Nd(r,0,1)*Math.PI)*.5+.48;t.setX(e,n*i),t.setZ(e,Math.sin(r*Math.PI)*.24+n*n*.13)}return e.computeVertexNormals(),e}buildFlora(){let e=this.makeSailGeometry(),t=new Ba({color:9276287,roughness:.7,metalness:.02,side:2,emissive:3224124,emissiveIntensity:.17}),n=new Va({color:10101572,roughness:.38,metalness:0,side:2,emissive:3870756,emissiveIntensity:.55,clearcoat:.2});this.addSurfaceDetail(t,35857,2.1,.055),this.addSurfaceDetail(n,35858,2.8,.035);let r=[new H(-17,6),new H(52,-51),new H(-6,30)],i=[new H(-61,14),new H(64,9),new H(-57,-72),new H(73,-66),new H(56,70)],a=(e,t)=>{let n=r.reduce((n,r)=>Math.max(n,Math.exp(-((e-r.x)**2+(t-r.y)**2)/720)),0),a=i.reduce((n,r)=>Math.max(n,Math.exp(-((e-r.x)**2+(t-r.y)**2)/980)),0),o=(Math.sin(e*.41+t*.29)*.5+.5)**3.2,s=Id(1,9,this.terrainHeight(e,t));return Nd(.08+n*.21+a*.5+o*.28+s*.08,.08,.96)},o=(e,t)=>r.reduce((n,r)=>Math.max(n,Math.exp(-((e-r.x)**2+(t-r.y)**2)/620)),0),s=this.quality===`low`?78:138,c=new Y(e,t,s),l=new Y(e,n,s),u=new nn,d=new nn,f=new Nt,p=new U,m=new U;for(let e=0;e<s;e+=1){let t=0,n=0,r=0;for(let e=0;e<7&&(t=this.rng.range(-115,115),n=this.rng.range(-105,108),r=a(t,n),!(this.rng.next()<r));e+=1);Math.hypot(t,n-72)<15&&(t+=t>=0?17:-17,n-=8),Math.hypot(t+25,n-44)<11&&(t+=t>=-25?14:-14,n-=7),Yu(t,n)<this.rng.range(7.5,12)&&(t+=Math.sign(t||1)*this.rng.range(8,18));let i=this.rng.range(2.4,7.8)*(.82+r*.48);p.set(t,this.terrainHeight(t,n),n),f.setFromEuler(new G(this.rng.range(-.08,.08),-.62+Math.sin(t*.026+n*.018)*.22+this.rng.range(-.38,.38),this.rng.range(-.18,.18))),m.set(this.rng.range(.6,1.45),i,1),u.compose(p,f,m),c.setMatrixAt(e,u),m.multiplyScalar(.84),p.y+=.03,p.x+=.025,d.compose(p,f,m),l.setMatrixAt(e,d)}c.instanceMatrix.needsUpdate=!0,l.instanceMatrix.needsUpdate=!0,c.castShadow=!0,c.receiveShadow=!0,l.renderOrder=1,this.scene.add(l,c);let h=new Ki(.08,1,5,3);h.translate(0,.5,0);let g=new Ba({color:2569272,emissive:11920223,emissiveIntensity:.55,roughness:.55}),_=this.quality===`low`?160:280,v=new Y(h,g,_);for(let e=0;e<_;e+=1){let t=0,n=0;for(let e=0;e<7;e+=1){t=this.rng.range(-120,120),n=this.rng.range(-115,112);let e=1-Id(-2,5,this.terrainHeight(t,n));if(this.rng.next()<.08+o(t,n)*.76+e*.2)break}let r=this.rng.range(.18,1.35);p.set(t,this.terrainHeight(t,n),n),f.setFromEuler(new G(this.rng.range(-.3,.3),this.rng.range(0,dd),this.rng.range(-.25,.25))),m.set(this.rng.range(.45,1.4),r,this.rng.range(.45,1.4)),u.compose(p,f,m),v.setMatrixAt(e,u)}v.instanceMatrix.needsUpdate=!0,this.scene.add(v);let y=new Ba({color:2962240,roughness:.62}),b=new Va({color:8254673,emissive:5439444,emissiveIntensity:.85,roughness:.22,metalness:.22,clearcoat:.8,transparent:!0,opacity:.82}),x=this.quality===`low`?22:36;for(let e=0;e<x;e+=1){let e=0,t=0;for(let n=0;n<8&&(e=this.rng.range(-105,105),t=this.rng.range(-100,102),!(this.rng.next()<.1+o(e,t)*.86));n+=1);let n=this.terrainHeight(e,t),r=new An,i=this.rng.range(.7,2.3),a=new J(new Gi(.05,.12,i,6),y);a.position.y=i*.5;let s=new J(new Ea(this.rng.range(.22,.48),12,8,0,dd,0,Math.PI*.6),b);s.scale.y=.68,s.position.y=i,s.rotation.x=Math.PI,r.add(a,s),r.position.set(e,n,t),this.scene.add(r),this.accentLights.push(s)}}buildChoirAnchors(){let e=[new U(-48,0,4),new U(52,0,-51),new U(-27,0,-70)],t=new Va({color:1316897,metalness:.78,roughness:.24,clearcoat:.85,clearcoatRoughness:.18,envMapIntensity:1.35}),n=new Ba({color:2647647,emissive:5439458,emissiveIntensity:.62,roughness:.16,metalness:.36});this.addSurfaceDetail(t,36881,3.1,.04),e.forEach((e,r)=>{e.y=this.terrainHeight(e.x,e.z)+3.8;let i=new An;i.position.copy(e);let a=new J(new Sa(2.4,1),t);a.scale.set(.78,1.5,.78),a.castShadow=!0;let o=new J(new Sa(.82,3),n.clone());o.position.z=1.52,o.renderOrder=2;let s=new Va({color:9182525,emissive:3803421,emissiveIntensity:.52,roughness:.34,metalness:.04,clearcoat:.28,clearcoatRoughness:.3,side:2}),c=new Ba({color:12104095,roughness:.72,metalness:.12,emissive:2431520,emissiveIntensity:.18});this.addSurfaceDetail(s,36897+r,2.4,.045),this.addSurfaceDetail(c,36913+r,3.8,.07);let l=new J(new Oa(1.04,.27,10,36),t);l.position.z=1.27,l.scale.y=1.18,l.castShadow=!0,i.add(l);for(let e=0;e<6;e+=1){let n=new J(new Ea(2.45+e%2*.25,16,10,-.52,1.05,.23,2.35),e%3==1?c:t),a=e/6*dd+r*.23;n.rotation.set(Math.sin(a)*.23,a-Math.PI/2,Math.cos(a)*.18),n.position.set(Math.sin(a)*.68,e%2*.28-.12,Math.cos(a)*.68),n.scale.set(.72,1.24+e%2*.18,.7),n.castShadow=!0,i.add(n)}for(let e=0;e<5;e+=1){let n=e/5*dd+r*.47,a=3.6+e%2*1.1,o=new J(new ka(new ia([new U(Math.sin(n)*.5,-1.35,Math.cos(n)*.5),new U(Math.sin(n+.28)*1.4,-2.35,Math.cos(n+.28)*1.4),new U(Math.sin(n-.16)*a,-3.66,Math.cos(n-.16)*a)]),18,.13+e%2*.035,7,!1),e%2?s:t);o.castShadow=!0,i.add(o)}let u=[];for(let e=0;e<3;e+=1){let r=t.clone();r.emissive.setHex(671547),r.emissiveIntensity=.65;let a=new J(new Oa(2.9+e*.72,.21,10,54),r),o=n.clone();o.emissiveIntensity=.62;let s=new J(new Oa(2.9+e*.72,.032,7,54),o);s.renderOrder=2,a.add(s),a.rotation.set(Math.PI/2+e*.5,e*.7,e*.23),i.add(a),u.push(a)}let d=new J(new Gi(.08,.82,62,12,1,!0),new Ur({color:6419935,transparent:!0,opacity:0,side:2,blending:2,depthWrite:!1}));d.position.y=31;let f=new Oo(4653028,.28,10,2);f.position.y=1,i.add(a,o,d,f);let p={group:i,core:o,rings:u,beam:d,light:f,health:220,maxHealth:220,destroyed:!1,hitFlash:0,position:e.clone()};i.traverse(e=>{e instanceof J&&(e.userData.anchor=p,e.userData.surface=`choir`,this.shootables.push(e))});let m=new J(new Wi(3.1,32),new Ur({color:197895,transparent:!0,opacity:.32,depthWrite:!1}));m.rotation.x=-Math.PI/2,m.position.y=-3.72,i.add(m),this.anchors.push(p),this.scene.add(i),this.colliders.push({x:e.x,z:e.z,radius:2.25})})}buildAmbientMotes(){let e=this.quality===`low`?140:360,t=new Float32Array(e*3),n=new Float32Array(e*3);for(let r=0;r<e;r+=1){let e=this.rng.range(-100,100),i=this.rng.range(-100,100);t[r*3]=e,t[r*3+1]=this.terrainHeight(e,i)+this.rng.range(.2,21),t[r*3+2]=i;let a=this.rng.next()>.18?new K(14216825):new K(9169389);n[r*3]=a.r,n[r*3+1]=a.g,n[r*3+2]=a.b}let r=new Mr;r.setAttribute(`position`,new vr(t,3)),r.setAttribute(`color`,new vr(n,3));let i=document.createElement(`canvas`);i.width=32,i.height=32;let a=i.getContext(`2d`);if(a){let e=a.createRadialGradient(16,16,0,16,16,16);e.addColorStop(0,`rgba(255,255,255,0.9)`),e.addColorStop(.18,`rgba(255,255,255,0.58)`),e.addColorStop(.52,`rgba(255,255,255,0.14)`),e.addColorStop(1,`rgba(255,255,255,0)`),a.fillStyle=e,a.fillRect(0,0,32,32)}let o=new Ri(i);o.colorSpace=Ve,o.minFilter=f,o.magFilter=u;let s=new Ai({size:this.quality===`low`?.24:.34,sizeAttenuation:!0,vertexColors:!0,transparent:!0,opacity:.38,map:o,alphaTest:.015,blending:2,depthWrite:!1});this.ambientMotes=new Fi(r,s),this.scene.add(this.ambientMotes)}buildEnemies(){[[[-9,-4],[14,-8],[30,10]],[[-10,4],[7,10],[12,-6]],[[-12,-2],[9,3],[3,-12],[-5,12]]].forEach((e,t)=>{e.forEach(([n,r],i)=>{let a=this.anchors[t].position,o=t===2&&i===e.length-1?`warden`:`stalker`;this.createEnemy(new U(a.x+n,0,a.z+r),o,t)})})}createEnemy(e,t,n){e.y=this.terrainHeight(e.x,e.z)+(t===`warden`?2.8:2.15);let r=new An;r.position.copy(e);let i=new Va({color:t===`warden`?2961463:2239285,metalness:.52,roughness:.34,clearcoat:.48,clearcoatRoughness:.25,envMapIntensity:1.05,emissive:527122,emissiveIntensity:.4}),a=new Ba({color:t===`warden`?12103061:10263441,roughness:.62,metalness:.12,emissive:2167842,emissiveIntensity:.25}),o=new Ba({color:t===`warden`?16742039:13629316,emissive:t===`warden`?16717647:11075406,emissiveIntensity:2.35,roughness:.18,metalness:.38});this.addSurfaceDetail(i,41217+this.enemies.length*17,2.7,.028),this.addSurfaceDetail(a,41218+this.enemies.length*19,3.3,.055);let s=new J(t===`warden`?new Ji(1.6,1):new Sa(1.1,1),i);s.scale.set(t===`warden`?1.1:1.25,.7,t===`warden`?1.18:1.6),s.castShadow=!0;let c=new J(new Ea(t===`warden`?1.48:1.06,16,10,0,dd,0,Math.PI*.48),a);c.rotation.x=Math.PI,c.position.y=.28,c.scale.set(1,.48,1.2),c.castShadow=!0;let l=new J(new Ea(t===`warden`?.52:.34,18,12),o);l.position.set(0,-.05,t===`warden`?1.34:1.18);let u=[],d=t===`warden`?6:4;for(let e=0;e<d;e+=1){let n=new J(new Ki(t===`warden`?.34:.22,t===`warden`?2.5:1.65,4),e%2==0?a:i),o=e/d*dd;n.position.set(Math.sin(o)*(t===`warden`?1.3:.88),.1,Math.cos(o)*(t===`warden`?1.3:.88)),n.rotation.z=Math.sin(o)*1.18,n.rotation.x=Math.cos(o)*-1.18,n.castShadow=!0,u.push(n),r.add(n)}let f=new J(new Z(t===`warden`?1.65:1.05,.13,.12,3,.05),o);if(f.position.set(0,.46,t===`warden`?1.2:.98),r.add(s,c,l,f),t===`warden`)for(let e=0;e<4;e+=1){let t=e/4*dd+.35,n=new J(new ka(new ia([new U(Math.sin(t)*.72,-.35,Math.cos(t)*.72),new U(Math.sin(t+.28)*1.08,-1.02,Math.cos(t+.28)*1.08),new U(Math.sin(t-.22)*1.42,-1.86,Math.cos(t-.22)*1.42)]),14,.085,6,!1),e%2?i:a);n.castShadow=!0,r.add(n)}let p={id:this.enemies.length+1,kind:t,group:r,core:l,shell:s,fins:u,health:t===`warden`?340:108,maxHealth:t===`warden`?340:108,speed:t===`warden`?2.35:this.rng.range(3.1,4.35),phase:this.rng.range(0,dd),cooldown:this.rng.range(2.8,4.2),wakeRadius:n===0?68:58,dead:!1,deathTime:0,hitFlash:0,anchorIndex:n};r.traverse(e=>{e instanceof J&&(e.userData.enemy=p,e.userData.surface=`enemy`,this.shootables.push(e))});let m=new J(new Wi(t===`warden`?2.4:1.65,24),new Ur({color:132101,transparent:!0,opacity:t===`warden`?.38:.29,depthWrite:!1}));return m.rotation.x=-Math.PI/2,m.position.y=-(t===`warden`?2.75:2.1),r.add(m),l.userData.weakpoint=!0,f.userData.weakpoint=!0,this.enemies.push(p),this.scene.add(r),p}weaponMaterial(e,t,n,r={}){return new Va({color:e,metalness:t,roughness:n,clearcoat:.18,clearcoatRoughness:.34,envMapIntensity:.78,depthTest:!0,depthWrite:!0,...r})}makeWeaponDetailTexture(){let e=document.createElement(`canvas`);e.width=384,e.height=384;let t=e.getContext(`2d`);if(!t)return null;let n=t.createImageData(384,384),r=new Ld(13993);for(let e=0;e<384*384;e+=1){let t=e%384,i=Math.floor(e/384),a=r.range(-11,11),o=Math.sin(t*.23+Math.sin(i*.019)*2.1)*4+Math.sin(t*.81-i*.037)*2,s=Math.max(0,Math.sin(t*.014+i*.009)*.5+.5)**8*7,c=Nd(214+a+o-s,174,242);n.data[e*4]=c,n.data[e*4+1]=c,n.data[e*4+2]=c,n.data[e*4+3]=255}t.putImageData(n,0,0),t.globalAlpha=.16,t.strokeStyle=`#606664`,t.lineWidth=1;for(let e=0;e<34;e+=1){let e=r.range(0,384),n=r.range(0,384);t.beginPath(),t.moveTo(e,n),t.lineTo(e+r.range(5,34),n+r.range(-1.5,1.5)),t.stroke()}t.globalAlpha=1;let a=new Ri(e);return a.wrapS=i,a.wrapT=i,a.repeat.set(3.4,3.4),a.colorSpace=Ve,this.renderer&&(a.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy())),a}batchWeaponMeshGroup(e,t,n=[]){let r=new Set(n),i=[],a=e=>{[...e.children].forEach(e=>{r.has(e)||e===this.muzzleFlash||(e instanceof J&&!Array.isArray(e.material)&&e.geometry&&i.push(e),a(e))})};if(a(e),i.length<2)return;e.updateWorldMatrix(!0,!0);let o=e.matrixWorld.clone().invert(),s=new Map;i.forEach(e=>{let t=Object.keys(e.geometry.attributes).sort().join(`,`),n=[e.material.uuid,e.renderOrder,e.geometry.index?`indexed`:`plain`,t].join(`|`),r=s.get(n)??{material:e.material,renderOrder:e.renderOrder,meshes:[],geometries:[]},i=e.geometry.clone();i.applyMatrix4(o.clone().multiply(e.matrixWorld)),r.meshes.push(e),r.geometries.push(i),s.set(n,r)});let c=0;s.forEach(n=>{if(n.geometries.length<2){n.geometries.forEach(e=>e.dispose());return}let r=Lu(n.geometries,!1);if(n.geometries.forEach(e=>e.dispose()),!r)return;let i=n.meshes.some(e=>e.castShadow),a=n.meshes.some(e=>e.receiveShadow);n.meshes.forEach(e=>{e.removeFromParent(),e.geometry.dispose()});let o=new J(r,n.material);o.name=`${t}-material-batch-${++c}`,o.renderOrder=n.renderOrder,o.castShadow=i,o.receiveShadow=a,o.frustumCulled=!1,e.add(o)})}buildWeapon(){this.scene.add(this.camera),this.camera.add(this.weaponRig),this.weaponRig.add(this.weaponBody);let e=this.weaponMaterial(1515814,.78,.42,{clearcoat:.1,clearcoatRoughness:.44,envMapIntensity:.64}),t=this.weaponMaterial(4609114,.84,.34,{clearcoat:.08,envMapIntensity:.78}),n=this.weaponMaterial(7830391,.9,.3,{clearcoat:.08,envMapIntensity:.88}),r=this.weaponMaterial(5857362,.12,.66,{clearcoat:.1,envMapIntensity:.46}),i=this.weaponMaterial(593168,.02,.9,{clearcoat:0,envMapIntensity:.54}),a=this.weaponMaterial(6889786,.28,.48,{clearcoat:.24,clearcoatRoughness:.38,emissive:1508106,emissiveIntensity:.18}),o=this.weaponMaterial(6977874,.16,.38,{clearcoat:.3,clearcoatRoughness:.28,emissive:8893261,emissiveIntensity:.32}),s=this.weaponMaterial(5465179,.02,.79,{clearcoat:0,envMapIntensity:.64}),c=this.weaponMaterial(1911596,.01,.91,{clearcoat:0,envMapIntensity:.34});this.weaponHeatMaterial=o;let l=this.makeWeaponDetailTexture(),u=l?.clone()??null;u&&(u.colorSpace=``,u.needsUpdate=!0),[e,t,n,r,i,a,s,c].forEach(e=>{e.map=l,e.bumpMap=u,e.bumpScale=e===s||e===c?.018:.009,e.needsUpdate=!0});let d=(e,t,n,r=.025,i=[0,0,0],a=this.weaponBody)=>{let o=new J(new Z(e[0],e[1],e[2],4,Math.min(r,Math.min(...e)*.22)),n);return o.position.set(...t),o.rotation.set(...i),o.renderOrder=100,a.add(o),o},f=(e,t,n,r,i,a=14,o=[Math.PI/2,0,0],s=this.weaponBody)=>{let c=new J(new Gi(e,t,n,a),i);return c.position.set(...r),c.rotation.set(...o),c.renderOrder=100,s.add(c),c},p=(e,t,n,r,i,a=this.weaponBody)=>{let o=new J(new Ui(e,t,4,10),r);return o.position.set(...n),o.rotation.set(...i),o.renderOrder=100,a.add(o),o},m=(e,t,n,r,i=8,a=24,o=this.weaponBody)=>{let s=new J(new Oa(e,t,i,a),r);return s.position.set(...n),s.renderOrder=101,o.add(s),s},h=f(.18,.155,.62,[0,.065,-.07],e,8);h.scale.set(.95,1,.62),h.rotation.z=Math.PI/8,d([.215,.085,.31],[0,.188,-.075],t,.026),d([.12,.028,.58],[0,.242,-.19],e,.007),d([.27,.085,.25],[0,-.045,-.275],r,.034,[.025,0,0]),d([.225,.065,.11],[0,-.01,-.435],t,.025,[.08,0,0]),d([.028,.12,.29],[-.172,.055,-.045],a,.009),d([.016,.032,.17],[-.188,.105,-.035],o,.005),d([.018,.024,.24],[.169,.13,-.28],n,.005);let g=f(.158,.135,.66,[0,.015,-.79],r,8);g.scale.set(1.12,1,.72),g.rotation.z=Math.PI/8,m(.142,.017,[0,.015,-.5],t,6,20).scale.y=.72,m(.135,.014,[0,.015,-.78],t,6,20).scale.y=.72,m(.126,.017,[0,.015,-1.08],t,6,20).scale.y=.72,d([.115,.028,.62],[0,.17,-.78],e,.007),d([.17,.028,.46],[0,-.12,-.78],i,.009);for(let e=0;e<5;e+=1){let n=-.58-e*.105;d([.014,.055,.064],[-.177,.05,n],i,.004,[0,0,-.12]),d([.01,.012,.058],[-.185,.053,n],t,.002)}for(let e=0;e<4;e+=1)d([.138,.02,.03],[0,.193,-.58-e*.13],n,.004);f(.057,.063,.56,[0,.015,-1.34],t,18),f(.094,.104,.16,[0,.015,-1.09],e,14),m(.071,.011,[0,.015,-1.15],n,8,24),f(.094,.088,.24,[0,.015,-1.7],t,14),m(.082,.014,[0,.015,-1.59],e,8,24),m(.078,.012,[0,.015,-1.822],n,8,24);for(let e=0;e<2;e+=1)d([.022,.062,.056],[-.092,.015,-1.655-e*.09],i,.003),d([.062,.018,.056],[0,.104,-1.655-e*.09],i,.003);let _=new J(new Wi(.063,20),new Ur({color:131843,depthTest:!0,depthWrite:!0}));_.position.set(0,.015,-1.832),_.renderOrder=102,this.weaponBody.add(_),d([.1,.036,.07],[.025,.125,.215],i,.013,[.03,0,0]),d([.09,.026,.06],[0,-.04,.21],t,.009),d([.02,.075,.08],[-.07,.02,.215],e,.007,[0,0,-.1]);let v=d([.125,.28,.145],[.012,-.195,.1],i,.038,[-.24,0,0]);v.name=`weapon-pistol-grip`;for(let e=0;e<4;e+=1)d([.132,.016,.02],[.012,-.12-e*.047,.08+e*.011],t,.004,[-.24,0,0]);let y=new J(new Oa(.09,.014,8,26,Math.PI*1.5),e);y.position.set(0,-.12,.02),y.rotation.z=-.78,y.renderOrder=101,this.weaponBody.add(y),f(.012,.014,.09,[-.015,-.13,.015],n,8,[Math.PI/2,.32,0]);let b=f(.12,.105,.17,[0,-.11,-.13],t,8,[0,0,0]);b.scale.z=.74,b.rotation.y=Math.PI/8,d([.23,.025,.16],[0,-.19,-.13],n,.006),this.weaponMagazine.position.set(0,-.245,-.13),this.weaponMagazine.rotation.x=-.13,this.weaponMagazine.name=`resonance-cell-magazine`,this.weaponBody.add(this.weaponMagazine),d([.17,.31,.17],[0,0,0],e,.034,[0,0,0],this.weaponMagazine),d([.186,.05,.185],[0,-.155,0],i,.018,[0,0,0],this.weaponMagazine),d([.014,.22,.115],[-.089,.005,-.015],r,.004,[0,0,0],this.weaponMagazine);for(let e=0;e<3;e+=1)d([.014,.025,.073],[-.099,.06-e*.067,-.025],o,.003,[0,0,0],this.weaponMagazine);d([.024,.13,.3],[-.177,.07,-.07],i,.007),d([.014,.012,.31],[-.193,.14,-.07],t,.003),d([.014,.012,.31],[-.193,-.002,-.07],t,.003),d([.014,.13,.012],[-.193,.07,.087],n,.003),d([.014,.13,.012],[-.193,.07,-.227],n,.003),this.weaponBolt.name=`reciprocating-bolt`,this.weaponBody.add(this.weaponBolt),d([.012,.076,.19],[-.195,.067,-.085],n,.004,[0,0,0],this.weaponBolt),d([.014,.026,.06],[-.202,.085,-.148],e,.003,[0,0,0],this.weaponBolt),f(.03,.03,.15,[-.232,.135,.015],n,10,[0,0,Math.PI/2]);for(let e=0;e<3;e+=1)f(e===0?.035:.016,e===0?.035:.016,.016,[-.193,e===0?-.01:.13,.12-e*.17],e===0?a:n,12,[0,0,Math.PI/2]);d([.012,.055,.1],[-.186,-.01,.225],t,.004);let x=d([.21,.055,.25],[0,.3,-.26],e,.018);d([.027,.17,.055],[-.096,.45,-.315],t,.009,[-.03,0,-.025]),d([.027,.17,.055],[.096,.45,-.315],t,.009,[-.03,0,.025]),d([.205,.025,.055],[0,.535,-.315],e,.008),d([.19,.022,.055],[0,.377,-.315],n,.006);let S=new J(new wa(.16,.125),new Ur({color:7067857,transparent:!0,opacity:.23,blending:1,depthTest:!1,depthWrite:!1,side:2}));S.position.set(0,.456,-.305),S.renderOrder=102,this.weaponBody.add(S);let C=new J(new wa(.012,.115),new Ur({color:14155775,transparent:!0,opacity:.42,blending:2,depthTest:!1,depthWrite:!1,side:2}));C.position.set(-.045,.456,-.298),C.rotation.z=-.55,C.renderOrder=103,this.weaponBody.add(C);let w=new J(new Ta(.009,.014,20),new Ur({color:14155646,transparent:!0,opacity:.92,blending:2,depthTest:!1,depthWrite:!1}));w.position.set(0,.456,-.29),w.renderOrder=106,this.weaponBody.add(w),d([.15,.018,.08],[0,.345,-.31],n,.005),x.userData.optic=!0;for(let t=0;t<5;t+=1)d([.135,.012,.028],[0,.265,.025-t*.075],e,.003);let T=new J(new ka(new ia([new U(-.18,-.075,-.14),new U(-.185,.01,-.31),new U(-.19,.075,-.48),new U(-.172,.09,-.68)]),18,.011,6,!1),o);T.renderOrder=103,this.weaponBody.add(T);for(let e=0;e<5;e+=1){let t=f(.013,.013,.012,[-.187,e%2==0?.135:-.035,.1-e*.17],n,10,[0,0,Math.PI/2]);t.renderOrder=101}let E=document.createElement(`canvas`);E.width=256,E.height=64;let D=E.getContext(`2d`);if(D){D.clearRect(0,0,256,64),D.font=`700 22px monospace`,D.letterSpacing=`3px`,D.fillStyle=`#d4ed83`,D.fillText(`HCT-9 // 36`,10,38),D.fillStyle=`#7d273e`,D.fillRect(10,48,88,3);let e=new Ri(E);e.colorSpace=Ve;let t=new J(new wa(.27,.067),new Ur({map:e,transparent:!0,depthTest:!1,depthWrite:!1,side:2}));t.position.set(-.19,.02,.09),t.rotation.y=-Math.PI/2,t.renderOrder=104,this.weaponBody.add(t)}p(.12,.52,[-.37,-.36,-.48],c,[-.91,.03,-.22]),f(.13,.125,.095,[-.325,-.2,-.64],a,12,[-.91,.03,-.22]),this.weaponSupportHand.position.set(-.235,-.025,-.74),this.weaponSupportHand.rotation.set(.04,.02,-.08),this.weaponSupportHand.name=`support-hand`,this.weaponBody.add(this.weaponSupportHand),d([.19,.155,.24],[0,0,0],s,.052,[.1,.04,-.06],this.weaponSupportHand),p(.03,.14,[-.045,.055,.08],s,[.1,.18,-.82],this.weaponSupportHand);for(let e=0;e<4;e+=1)p(.024,.072,[-.04+e*.018,-.012-e*.018,-.075+e*.043],s,[.04,.02,.42],this.weaponSupportHand),d([.044,.027,.045],[-.062+e*.014,.056-e*.018,-.078+e*.043],t,.008,[.08,0,-.06],this.weaponSupportHand);d([.185,.029,.18],[-.006,.085,-.01],t,.011,[.1,.04,-.06],this.weaponSupportHand),d([.012,.035,.16],[-.101,.015,-.005],a,.004,[.1,.04,-.06],this.weaponSupportHand),p(.125,.54,[.08,-.36,.3],c,[-.56,.05,.16]),f(.135,.13,.095,[.015,-.22,.2],a,12,[-.56,.05,.16]),p(.07,.1,[-.03,-.13,.24],s,[.02,0,.1]);let O=new An;O.position.set(-.065,.025,.28),O.rotation.set(-.12,-.05,.07),O.name=`firing-hand`,this.weaponBody.add(O),d([.19,.21,.21],[0,0,0],s,.052,[0,0,0],O),p(.025,.14,[-.045,.055,-.105],s,[.08,-.08,Math.PI/2],O);for(let e=0;e<4;e+=1)p(.022,.095,[-.065+e*.043,-.055,-.025+e*.008],s,[.04,-.08,.12],O),d([.037,.026,.04],[-.066+e*.043,.078,-.035],t,.008,[0,0,0],O);d([.185,.028,.155],[-.003,.095,0],t,.012,[0,0,0],O);let k=new Oo(11062984,.36,3.1,2);k.position.set(-.42,.58,.35),k.layers.set(1),this.camera.add(k);let A=new Oo(15047547,.16,3.4,2);A.position.set(.62,.12,-1.25),A.layers.set(1),this.camera.add(A),this.muzzle.position.set(0,.015,-1.85),this.weaponBody.add(this.muzzle),this.casingOrigin.position.set(-.2,.09,-.08),this.weaponBody.add(this.casingOrigin);let j=new Ur({color:16771248,transparent:!0,opacity:0,blending:2,depthTest:!1,depthWrite:!1,side:2}),ee=new J(new Ca(.19,0),j);ee.position.copy(this.muzzle.position),ee.scale.set(1,1,1.7),ee.renderOrder=110,this.weaponBody.add(ee),this.muzzleFlash=ee;let M=new Oo(16751688,0,7,2);M.position.copy(this.muzzle.position),this.weaponBody.add(M),this.muzzleLight=M,this.weaponRig.position.set(.48,-.44,-.78),this.weaponRig.rotation.set(-.015,-.025,-.025),this.weaponBody.scale.setScalar(.54),this.batchWeaponMeshGroup(this.weaponMagazine,`resonance-cell`),this.batchWeaponMeshGroup(this.weaponBolt,`reciprocating-bolt`),this.batchWeaponMeshGroup(this.weaponSupportHand,`support-hand`),this.batchWeaponMeshGroup(this.weaponBody,`weapon-static`,[this.weaponMagazine,this.weaponBolt,this.weaponSupportHand,this.muzzle]),this.weaponRig.traverse(e=>e.layers.set(1))}bindInput(){window.addEventListener(`resize`,this.onResizeBound),window.addEventListener(`mousemove`,this.onMouseMoveBound),window.addEventListener(`mousedown`,this.onMouseDownBound),window.addEventListener(`mouseup`,this.onMouseUpBound),window.addEventListener(`keydown`,this.onKeyDownBound),window.addEventListener(`keyup`,this.onKeyUpBound),window.addEventListener(`blur`,()=>this.clearHeldInput()),document.addEventListener(`pointerlockchange`,this.onPointerLockBound),document.addEventListener(`contextmenu`,this.onContextMenuBound),this.root.querySelector(`[data-start]`)?.addEventListener(`click`,()=>{this.start()}),this.root.querySelector(`[data-resume]`)?.addEventListener(`click`,()=>{this.resume()}),this.root.querySelector(`[data-restart]`)?.addEventListener(`click`,()=>{window.location.reload()}),this.root.querySelector(`[data-replay]`)?.addEventListener(`click`,()=>{window.location.reload()}),(this.forceTouch||window.matchMedia(`(pointer: coarse)`).matches||navigator.maxTouchPoints>0)&&this.root.classList.add(`has-touch`),this.bindTouchControls()}bindTouchControls(){let e=this.root.querySelector(`[data-stick]`),t=this.root.querySelector(`[data-look]`),n=this.root.querySelector(`[data-fire]`),r=this.root.querySelector(`[data-ads]`),i=this.root.querySelector(`[data-jump]`),a=this.root.querySelector(`[data-reload]`),o=this.root.querySelector(`[data-stick-knob]`);if(!e||!t||!n||!r||!i||!a||!o)return;let s=()=>{this.touch.moveId=-1,this.touch.move.set(0,0),o.style.transform=`translate3d(0,0,0)`};e.addEventListener(`pointerdown`,t=>{this.started&&(t.preventDefault(),e.setPointerCapture(t.pointerId),this.touch.moveId=t.pointerId,this.touch.moveOrigin.set(t.clientX,t.clientY))}),e.addEventListener(`pointermove`,e=>{if(e.pointerId!==this.touch.moveId)return;e.preventDefault();let t=e.clientX-this.touch.moveOrigin.x,n=e.clientY-this.touch.moveOrigin.y,r=Math.max(1,Math.hypot(t,n)),i=Math.min(46,r);this.touch.move.set(t/r*(i/46),-n/r*(i/46)),o.style.transform=`translate3d(${this.touch.move.x*46}px,${-this.touch.move.y*46}px,0)`}),e.addEventListener(`pointerup`,s),e.addEventListener(`pointercancel`,s),e.addEventListener(`lostpointercapture`,s);let c=e=>{e.pointerId===this.touch.lookId&&(this.touch.lookId=-1)};t.addEventListener(`pointerdown`,e=>{this.started&&(e.preventDefault(),t.setPointerCapture(e.pointerId),this.touch.lookId=e.pointerId,this.touch.lookLast.set(e.clientX,e.clientY))}),t.addEventListener(`pointermove`,e=>{if(e.pointerId!==this.touch.lookId)return;e.preventDefault();let t=e.clientX-this.touch.lookLast.x,n=e.clientY-this.touch.lookLast.y;this.touch.lookLast.set(e.clientX,e.clientY),this.applyLook(t*1.22,n*1.22)}),t.addEventListener(`pointerup`,c),t.addEventListener(`pointercancel`,c),t.addEventListener(`lostpointercapture`,c);let l=(e,t,n)=>{e.addEventListener(`pointerdown`,n=>{n.preventDefault(),e.setPointerCapture(n.pointerId),t()}),[`pointerup`,`pointercancel`,`lostpointercapture`].forEach(t=>{e.addEventListener(t,e=>{e.preventDefault(),n()})})};l(n,()=>{this.weapon.fireHeld=!0},()=>{this.weapon.fireHeld=!1}),l(r,()=>{this.weapon.ads=!0},()=>{this.weapon.ads=!1}),i.addEventListener(`pointerdown`,e=>{e.preventDefault(),this.player.jumpQueued=!0}),a.addEventListener(`pointerdown`,e=>{e.preventDefault(),this.beginReload()})}start(){if(!(this.disposed||this.fatal))if(this.started)this.paused&&this.resume();else{if(this.started=!0,this.mission.startTime=performance.now(),this.controlsTimer=7,this.root.classList.add(`is-playing`),this.root.querySelector(`[data-intro]`)?.classList.add(`is-hidden`),this.root.querySelector(`[data-hud]`)?.classList.add(`is-visible`),this.audio.start(),this.showMessage(`DIRECTIVE: SILENCE THE CHOIR`,3.2),this.showSubtitle(`HECATE: Signal source ahead. Three anchors. Make them quiet.`,4.4),this.tourView&&this.tourClean){let e=this.root.querySelector(`[data-hud]`);e&&(e.style.visibility=`hidden`);for(let e of[`[data-intro]`,`[data-boot]`,`[data-message]`,`[data-subtitle]`]){let t=this.root.querySelector(e);t&&(t.style.display=`none`)}}this.shouldUsePointerLock()&&this.requestPointerLockSafe()}}resume(){!this.started||this.ended||(this.paused=!1,this.root.classList.remove(`is-paused`),this.root.querySelector(`[data-pause]`)?.classList.remove(`is-visible`),this.lastFrame=performance.now(),this.shouldUsePointerLock()&&this.requestPointerLockSafe())}shouldUsePointerLock(){return!this.forceTouch&&!window.matchMedia(`(pointer: coarse)`).matches&&!(navigator.maxTouchPoints>0)&&!this.autoplay&&!this.cinematic&&!this.missionTest&&!this.movementTest&&!this.collisionTest&&!this.cityTest&&!this.tourView}requestPointerLockSafe(){let e=this.renderer?.domElement;if(e?.requestPointerLock)try{let t=e.requestPointerLock();t&&typeof t.catch==`function`&&t.catch(()=>{})}catch{}}pause(){!this.started||this.ended||this.autoplay||this.forceTouch||(this.paused=!0,this.clearHeldInput(),this.root.classList.add(`is-paused`),this.root.querySelector(`[data-pause]`)?.classList.add(`is-visible`),document.pointerLockElement&&document.exitPointerLock())}onPointerLockChange(){this.pointerLocked=document.pointerLockElement===this.renderer?.domElement,this.started&&!this.pointerLocked&&!this.paused&&!this.ended&&this.shouldUsePointerLock()&&this.pause()}onMouseMove(e){!this.started||this.paused||this.ended||!this.pointerLocked&&!this.autoplay&&!this.cinematic||this.applyLook(e.movementX,e.movementY)}applyLook(e,t){let n=this.weapon.ads?.00125:.00168;this.player.yaw-=e*n,this.player.pitch-=t*n,this.player.pitch=Nd(this.player.pitch,-1.43,1.38)}onMouseDown(e){!this.started||this.paused||this.ended||(e.button===0&&(this.weapon.fireHeld=!0),e.button===2&&(this.weapon.ads=!0))}onMouseUp(e){e.button===0&&(this.weapon.fireHeld=!1),e.button===2&&(this.weapon.ads=!1)}onKeyDown(e){if(e.code===`Escape`&&this.started&&!this.autoplay){this.paused?this.resume():this.pause();return}!this.started||this.paused||this.ended||(this.keys.add(e.code),this.controlsTimer=0,e.code===`Space`&&(e.preventDefault(),this.player.jumpQueued=!0),e.code===`KeyR`&&this.beginReload(),(e.code===`ControlLeft`||e.code===`KeyC`)&&this.player.grounded&&this.player.slideCooldown<=0&&Math.hypot(this.player.velocity.x,this.player.velocity.z)>5.6&&(this.player.slide=.62,this.player.slideCooldown=1.05))}onKeyUp(e){this.keys.delete(e.code)}clearHeldInput(){this.keys.clear(),this.weapon.fireHeld=!1,this.weapon.ads=!1,this.touch.move.set(0,0)}frame(e){if(this.disposed||!this.renderer||!this.composer)return;let t=Math.min(.06,Math.max(.001,(e-this.lastFrame)/1e3));if(this.lastFrame=e,this.worldTime+=t,this.titleTime+=t,this.frameAccumulator+=t,this.frameCount+=1,this.perfTimer+=t,this.perfTimer>=.75&&(this.frameMs=this.frameAccumulator/this.frameCount*1e3,this.fps=Math.round(1e3/Math.max(1,this.frameMs)),this.frameAccumulator=0,this.frameCount=0,this.perfTimer=0,this.governQuality()),this.started&&!this.paused&&!this.ended){this.simAccumulator+=t;let e=1/60,n=0;for(;this.simAccumulator>=e&&n<4;)this.update(e),this.simAccumulator-=e,n+=1;n===4&&(this.simAccumulator=0)}else this.started||this.updateTitle(t);this.updateEnvironment(t),this.camera.layers.set(0),this.composer.render(),this.renderer.autoClear=!1,this.renderer.clearDepth(),this.camera.layers.set(1),this.renderer.render(this.scene,this.camera),this.camera.layers.set(0),this.renderer.autoClear=!0,this.raf=requestAnimationFrame(e=>this.frame(e))}updateTitle(e){let t=this.player.position,n=Math.sin(this.titleTime*.18)*.32;this.camera.position.set(t.x+n,t.y+Math.sin(this.titleTime*.31)*.035,t.z),this.camera.rotation.set(-.065+Math.sin(this.titleTime*.22)*.006,Math.sin(this.titleTime*.16)*.024,0,`YXZ`),this.weaponRig.position.x=Fd(this.weaponRig.position.x,.42,4,e)}update(e){this.updatePlayer(e),this.updateWeapon(e),this.updateEnemies(e),this.updateBolts(e),this.updateParticles(e),this.updateMission(e),this.updateHUD(!1,e)}updatePlayer(e){let t=!!this.keys.has(`KeyW`)-+!!this.keys.has(`KeyS`)+this.touch.move.y,n=!!this.keys.has(`KeyD`)-+!!this.keys.has(`KeyA`)+this.touch.move.x,r=Math.hypot(t,n);r>.18&&(this.controlsTimer=0);let i=r>1?t/r:t,a=r>1?n/r:n,o=kd,s=Ad;this.movementBasis(this.player.yaw,o,s);let c=jd.set(0,0,0).addScaledVector(o,i).addScaledVector(s,a);c.lengthSq()>1&&c.normalize();let l=this.keys.has(`ShiftLeft`)&&i>.35&&!this.weapon.ads&&!this.weapon.reloading,u=this.weapon.ads?3.65:l?7.25:5.25;this.player.slide>0&&(this.player.slide=Math.max(0,this.player.slide-e),u=Pd(4.3,8.1,this.player.slide/.62),c.lengthSq()<.05&&c.copy(o)),this.player.slideCooldown=Math.max(0,this.player.slideCooldown-e);let d=this.player.grounded?32:6;this.player.velocity.x=Fd(this.player.velocity.x,c.x*u,d,e),this.player.velocity.z=Fd(this.player.velocity.z,c.z*u,d,e),this.player.jumpQueued&&(this.player.grounded&&(this.player.velocity.y=md,this.player.grounded=!1,this.audio.pulse(86,.035,.12)),this.player.jumpQueued=!1),this.movePlayerHorizontal(this.player.velocity.x*e,this.player.velocity.z*e,this.player.grounded,e),this.player.grounded||this.resolvePlayerVertical(e),this.rememberSafePlayerPosition();let f=Math.hypot(this.player.velocity.x,this.player.velocity.z);this.player.grounded&&f>.4&&(this.player.bob+=e*f*(l?1.62:1.25));let p=(this.player.grounded?Nd(f/7.2,0,1):0)*(this.weapon.ads?.25:1),m=this.player.slide>0?.34:0,h=this.player.position.y-m+Math.abs(Math.sin(this.player.bob*2))*.014*p;this.camera.position.set(this.player.position.x+Math.sin(this.player.bob)*.01*p,h,this.player.position.z),this.player.recoilPitch=Fd(this.player.recoilPitch,0,13,e),this.player.recoilYaw=Fd(this.player.recoilYaw,0,15,e),this.camera.rotation.set(this.player.pitch+this.player.recoilPitch,this.player.yaw+this.player.recoilYaw,Fd(this.camera.rotation.z,-a*.006-(this.player.slide>0?.012:0),7,e),`YXZ`);let g=this.weapon.ads?58:l?76:72;this.camera.fov=Fd(this.camera.fov,g,this.weapon.ads?15:8,e),this.camera.updateProjectionMatrix(),performance.now()/1e3-this.player.lastDamage>5&&this.player.health<100&&(this.player.health=Math.min(100,this.player.health+5.5*e)),this.player.damageFlash=Math.max(0,this.player.damageFlash-e*2.6)}updateWeapon(e){this.weapon.cooldown=Math.max(0,this.weapon.cooldown-e),this.weapon.heat=Math.max(0,this.weapon.heat-e*1.4),this.weapon.hitmarker=Math.max(0,this.weapon.hitmarker-e),this.weapon.recoil=Fd(this.weapon.recoil,0,18,e),this.weapon.adsAmount=Fd(this.weapon.adsAmount,this.weapon.ads&&!this.weapon.reloading?1:0,this.weapon.ads?15:12,e),this.weapon.reloading?(this.weapon.reloadTime-=e,this.weapon.reloadTime<=0&&this.finishReload()):this.weapon.fireHeld&&this.weapon.cooldown<=0&&this.player.slide<.5&&(this.weapon.ammo>0?this.fireWeapon():this.beginReload());let t=Math.hypot(this.player.velocity.x,this.player.velocity.z),n=this.keys.has(`ShiftLeft`)&&t>5.7&&!this.weapon.ads&&!this.weapon.reloading,r=this.weapon.reloading?1-Nd(this.weapon.reloadTime/1.46,0,1):0,i=this.weapon.reloading?Math.sin(r*Math.PI)*.52:0,a=Pd(.48,0,this.weapon.adsAmount),o=Pd(-.44,-.246,this.weapon.adsAmount)-(n?.09:0)-i*.16,s=Pd(-.78,-1.02,this.weapon.adsAmount)+this.weapon.recoil*.07;this.weaponRig.position.x=Fd(this.weaponRig.position.x,a,17,e),this.weaponRig.position.y=Fd(this.weaponRig.position.y,o,14,e),this.weaponRig.position.z=Fd(this.weaponRig.position.z,s,18,e),this.weaponRig.rotation.x=Fd(this.weaponRig.rotation.x,n?-.34:Pd(-.015,0,this.weapon.adsAmount)+i*.16-this.weapon.recoil*.1,15,e),this.weaponRig.rotation.y=Fd(this.weaponRig.rotation.y,Pd(-.025,0,this.weapon.adsAmount)-i*.38,14,e),this.weaponRig.rotation.z=Fd(this.weaponRig.rotation.z,n?-.25:Pd(-.025,0,this.weapon.adsAmount)+i*.58,14,e);let c=(this.player.grounded?Nd(t/7.25,0,1):0)*Pd(1,.12,this.weapon.adsAmount),l=Math.sin(this.player.bob),u=Math.cos(this.player.bob*2);this.weaponBody.position.x=Fd(this.weaponBody.position.x,l*.014*c,18,e),this.weaponBody.position.y=Fd(this.weaponBody.position.y,-Math.abs(u)*.009*c,18,e),this.weaponBody.position.z=Fd(this.weaponBody.position.z,u*.006*c,16,e),this.weaponBody.rotation.x=Fd(this.weaponBody.rotation.x,u*.006*c,16,e),this.weaponBody.rotation.y=Fd(this.weaponBody.rotation.y,-l*.009*c,16,e),this.weaponBody.rotation.z=Fd(this.weaponBody.rotation.z,-l*.012*c,16,e);let d=this.weapon.reloading?Id(.12,.38,r)*(1-Id(.62,.9,r)):0;this.weaponMagazine.position.set(-d*.12,-.245-d*.36,-.13+d*.11),this.weaponMagazine.rotation.set(-.13+d*.38,d*.14,-d*.32);let f=this.weapon.reloading?Id(.08,.3,r)*(1-Id(.7,.94,r)):0;if(this.weaponSupportHand.position.set(-.235+f*.2,-.025-f*.2,-.74+f*.48),this.weaponSupportHand.rotation.set(.04+f*.24,.02-f*.16,-.08-f*.2),this.weaponBolt.position.z=Fd(this.weaponBolt.position.z,this.weapon.recoil*.115,34,e),this.weaponHeatMaterial&&(this.weaponHeatMaterial.emissiveIntensity=.28+this.weapon.heat*.48),this.muzzleFlash){let t=this.muzzleFlash.material;t.opacity=Fd(t.opacity,0,32,e),this.muzzleFlash.scale.multiplyScalar(.01**e)}this.muzzleLight&&(this.muzzleLight.intensity=Fd(this.muzzleLight.intensity,0,42,e))}fireWeapon(){this.controlsTimer=0,--this.weapon.ammo,this.weapon.shots+=1,this.weapon.cooldown=1/12,this.weapon.recoil=Math.min(1,this.weapon.recoil+.58),this.weapon.heat=Math.min(1.5,this.weapon.heat+.19);let e=this.weapon.shots%12,t=[-.09,.07,.11,-.04,.14,.02,-.13,.1,.16,-.07,.03,.12];if(this.player.recoilPitch+=Mt.degToRad(this.weapon.shots===1?.62:.46),this.player.recoilYaw+=Mt.degToRad(t[e]),this.audio.shot(),this.muzzleFlash){let e=this.muzzleFlash.material;e.opacity=.95;let t=this.rng.range(.85,1.45);this.muzzleFlash.scale.set(t,t,t*1.7),this.muzzleFlash.rotation.set(this.rng.range(-.5,.5),this.rng.range(-.5,.5),this.rng.range(0,dd))}this.muzzleLight&&(this.muzzleLight.intensity=5.6),this.weapon.shots%3==0&&this.spawnCasing();let n=new U;this.camera.getWorldDirection(n);let r=new U(1,0,0).applyQuaternion(this.camera.quaternion),i=new U(0,1,0).applyQuaternion(this.camera.quaternion),a=Math.hypot(this.player.velocity.x,this.player.velocity.z),o=(this.weapon.ads?.0016+a*35e-5:.012+a*.0014)*(1+this.weapon.heat*.24);n.addScaledVector(r,this.rng.range(-o,o)).addScaledVector(i,this.rng.range(-o,o)).normalize(),this.raycaster.set(this.camera.position,n),this.raycaster.near=.1,this.raycaster.far=190;let s=this.raycaster.intersectObjects(this.shootables,!1).find(e=>e.object.visible),c=new U;this.muzzle.getWorldPosition(c);let l=this.camera.position.clone().addScaledVector(n,this.raycaster.far);if(s){l=s.point.clone();let e=s.object.userData.enemy,t=s.object.userData.anchor;if(e&&!e.dead){let t=!!s.object.userData.weakpoint;this.damageEnemy(e,t?54:34,s.point,n,t)}else if(t&&!t.destroyed){let e=s.object===t.core;this.damageAnchor(t,e?38:24,s.point,n)}else this.spawnImpact(s.point,s.face?.normal?.clone().transformDirection(s.object.matrixWorld)??n.clone().negate(),s.object.userData.surface===`membrane`?14110568:11138255,s.object.userData.surface===`membrane`?12:7)}(this.weapon.shots%3==0||s)&&this.spawnTracer(c,l),this.updateHUD(!0)}damageEnemy(e,t,n,r,i){e.health-=t,e.hitFlash=1,e.group.position.addScaledVector(r,.045),this.weapon.hits+=1,this.weapon.hitmarker=.095,this.root.querySelector(`[data-hitmarker]`)?.classList.toggle(`is-critical`,i),this.root.querySelector(`[data-hitmarker]`)?.classList.add(`is-visible`),this.audio.hit(i),this.spawnImpact(n,r.clone().negate(),i?16121781:12580718,10),e.health<=0&&this.killEnemy(e,r,i)}killEnemy(e,t,n){e.dead||(e.dead=!0,e.deathTime=0,e.health=0,this.mission.kills+=1,this.audio.pulse(n?142:108,.075,.2),e.group.userData.deathVelocity=t.clone().multiplyScalar(n?4.5:2.4).add(new U(0,2.2,0)),e.group.traverse(e=>{e instanceof J&&(e.userData.enemy=void 0)}),this.spawnBurst(e.group.position.clone(),n?15400859:10678136,e.kind===`warden`?28:18,e.kind===`warden`?5.4:3.6),this.showMessage(e.kind===`warden`?`WARDEN COLLAPSED`:`HUNTER ERASED`,1.2))}damageAnchor(e,t,n,r){e.health-=t,e.hitFlash=1,this.weapon.hits+=1,this.weapon.hitmarker=.095,this.root.querySelector(`[data-hitmarker]`)?.classList.remove(`is-critical`),this.root.querySelector(`[data-hitmarker]`)?.classList.add(`is-visible`),this.audio.hit(!0),this.spawnImpact(n,r.clone().negate(),6488035,14),e.health<=0&&this.destroyAnchor(e)}destroyAnchor(e){if(e.destroyed)return;e.destroyed=!0,e.health=0,this.mission.anchorsDestroyed+=1,e.beam.visible=!1,e.light.intensity=0,e.core.visible=!1;let t=e.group.position.clone();e.rings.forEach((e,n)=>{e.userData.anchor=void 0,e.removeFromParent(),this.scene.add(e),e.position.copy(t),e.rotation.set(this.rng.range(0,dd),this.rng.range(0,dd),0),this.particles.push({object:e,velocity:new U(this.rng.range(-4,4),this.rng.range(3,7),this.rng.range(-4,4)),gravity:7,life:2.4+n*.15,maxLife:2.4+n*.15,startScale:1,endScale:.45,spin:new U(this.rng.range(-3,3),this.rng.range(-3,3),this.rng.range(-3,3))})}),this.audio.pulse(48,.28,1.2),this.spawnBurst(t,5963748,46,7.5),this.root.classList.add(`anchor-pulse`),window.setTimeout(()=>this.root.classList.remove(`anchor-pulse`),420),this.showMessage(`CHOIR ANCHOR ${this.mission.anchorsDestroyed} // SILENCED`,2.5),this.showSubtitle(this.mission.anchorsDestroyed<3?`HECATE: Harmonic collapse confirmed. ${3-this.mission.anchorsDestroyed} source${3-this.mission.anchorsDestroyed==1?``:`s`} remain.`:`HECATE: All anchors are dark. Wait—your suit is still receiving.`,4),this.updateHUD(!0)}beginReload(){this.weapon.reloading||this.weapon.ammo>=this.weapon.magSize||this.weapon.reserve<=0||(this.weapon.reloading=!0,this.weapon.reloadTime=this.weapon.ammo===0?1.68:1.46,this.weapon.fireHeld=!1,this.audio.reload(),this.showMessage(`RESONANCE CELL // CYCLING`,1.1))}finishReload(){let e=this.weapon.magSize-this.weapon.ammo,t=Math.min(e,this.weapon.reserve);this.weapon.ammo+=t,this.weapon.reserve-=t,this.weapon.reloading=!1,this.weapon.reloadTime=0,this.updateHUD(!0)}spawnTracer(e,t){let n=new Oi(new Mr().setFromPoints([e,t]),new bi({color:15335357,transparent:!0,opacity:.82,blending:2,depthWrite:!1}));n.renderOrder=5,this.scene.add(n),this.tracers.push({line:n,life:.045,maxLife:.045})}spawnCasing(){if(this.particles.length>180)return;let e=new Ba({color:12629134,metalness:.82,roughness:.28}),t=new J(new Gi(.008,.01,.04,8),e);this.casingOrigin.getWorldPosition(t.position),this.camera.getWorldQuaternion(Md);let n=new U(this.rng.range(2.5,3.4),this.rng.range(1.6,2.4),this.rng.range(-.7,.4)).applyQuaternion(Md);this.scene.add(t),this.particles.push({object:t,velocity:n,gravity:8.5,life:1.05,maxLife:1.05,startScale:1,endScale:1,spin:new U(this.rng.range(-15,15),this.rng.range(-15,15),this.rng.range(-15,15))})}spawnImpact(e,t,n,r){let i=new Ur({color:n,transparent:!0,opacity:.82,blending:2,depthWrite:!1}),a=new J(new Ta(.025,.11,12),i);a.position.copy(e).addScaledVector(t,.025),a.quaternion.setFromUnitVectors(new U(0,0,1),t),this.scene.add(a),this.particles.push({object:a,velocity:new U,gravity:0,life:.22,maxLife:.22,startScale:1,endScale:2.2,spin:new U,fadeMaterial:i}),this.spawnBurst(e,n,r,3.2,t)}spawnBurst(e,t,n,r,i){let a=Math.min(n,Math.max(0,210-this.particles.length));for(let n=0;n<a;n+=1){let n=this.rng.range(.01,.048),a=new Ur({color:t,transparent:!0,opacity:this.rng.range(.55,1),blending:2,depthWrite:!1}),o=new J(this.rng.next()>.55?new Da(n):new Ea(n*.65,5,4),a);o.position.copy(e);let s=new U(this.rng.range(-1,1),this.rng.range(-.25,1.4),this.rng.range(-1,1));i&&s.addScaledVector(i,this.rng.range(.5,1.6)),s.normalize().multiplyScalar(this.rng.range(r*.3,r)),this.scene.add(o);let c=this.rng.range(.28,.82);this.particles.push({object:o,velocity:s,gravity:this.rng.range(1.5,6),life:c,maxLife:c,startScale:1,endScale:0,spin:new U(this.rng.range(-8,8),this.rng.range(-8,8),this.rng.range(-8,8)),fadeMaterial:a})}}updateEnemies(e){let t=1/0;for(let n of this.enemies){if(n.dead){n.deathTime+=e;let t=n.group.userData.deathVelocity;if(t){t.y-=9.2*e,n.group.position.addScaledVector(t,e);let r=this.terrainHeight(n.group.position.x,n.group.position.z)+.42;n.group.position.y<=r&&(n.group.position.y=r,t.multiplyScalar(.74),t.y=Math.abs(t.y)*.12,n.group.rotation.z=Fd(n.group.rotation.z,Math.PI*.48,5,e))}n.deathTime>5?n.group.visible=!1:n.deathTime>3.5&&n.group.scale.multiplyScalar(.14**e);continue}let r=kd.copy(this.player.position).sub(n.group.position),i=r.length();t=Math.min(t,i);let a=this.anchors[n.anchorIndex];if(!(i<n.wakeRadius||a.destroyed||n.health<n.maxHealth)){n.group.position.y=this.terrainHeight(n.group.position.x,n.group.position.z)+(n.kind===`warden`?2.8:2.15)+Math.sin(this.worldTime*1.2+n.phase)*.18,n.group.rotation.y+=e*.16;continue}let o=n.kind===`warden`?19:15,s=i>o+4?1:i<o-4?-.7:0;r.y=0,r.normalize();let c=Ad.set(-r.z,0,r.x),l=Math.sin(this.worldTime*(n.kind===`warden`?.48:.78)+n.phase)*(n.kind===`warden`?.35:.8),u=jd.copy(r).multiplyScalar(s).addScaledVector(c,l).normalize();i<48&&n.group.position.addScaledVector(u,n.speed*e),n.group.position.x=Nd(n.group.position.x,-126,126),n.group.position.z=Nd(n.group.position.z,-126,124);let d=this.terrainHeight(n.group.position.x,n.group.position.z)+(n.kind===`warden`?2.8:2.15)+Math.sin(this.worldTime*2.2+n.phase)*.24;n.group.position.y=Fd(n.group.position.y,d,8,e);let f=Math.atan2(this.player.position.x-n.group.position.x,this.player.position.z-n.group.position.z);n.group.rotation.y=Fd(n.group.rotation.y,f,5,e),n.group.rotation.z=Math.sin(this.worldTime*1.8+n.phase)*.055,n.fins.forEach((t,r)=>{t.rotation.y+=e*(r%2==0?1:-1)*(n.kind===`warden`?.8:1.4)}),n.core.scale.setScalar(1+Math.sin(this.worldTime*5.4+n.phase)*.12+n.hitFlash*.22),n.hitFlash=Math.max(0,n.hitFlash-e*5.5);let p=n.shell.material;p.emissiveIntensity=.4+n.hitFlash*2.4,n.cooldown-=e,i<42&&i>4&&n.cooldown<=0&&(this.enemyFire(n,i),n.cooldown=n.kind===`warden`?this.rng.range(1.25,1.75):this.rng.range(1.65,2.65))}this.threatLevel=t<12?1:t<24?.72:t<45?.38:0}enemyFire(e,t){let n=e.group.position.clone();n.y+=e.kind===`warden`?.2:0;let r=this.player.position.clone();r.y-=.15;let i=Pd(1.8,.24,Nd((42-t)/38,0,1));r.x+=this.rng.range(-i,i),r.y+=this.rng.range(-i*.45,i*.45),r.z+=this.rng.range(-i,i);let a=r.sub(n).normalize().multiplyScalar(e.kind===`warden`?29:35),o=new Ur({color:e.kind===`warden`?16729455:12119928,blending:2,transparent:!0,opacity:.92,depthWrite:!1}),s=new J(new Ea(e.kind===`warden`?.16:.09,8,6),o);s.position.copy(n),this.scene.add(s),this.bolts.push({mesh:s,velocity:a,life:2.2,damage:e.kind===`warden`?22:14}),this.audio.enemyShot(),this.spawnBurst(n,e.kind===`warden`?16729455:12119928,5,1.8)}updateBolts(e){for(let t=this.bolts.length-1;t>=0;--t){let n=this.bolts[t];n.life-=e,n.mesh.position.addScaledVector(n.velocity,e),n.mesh.scale.setScalar(1+Math.sin(this.worldTime*22+t)*.22);let r=n.mesh.position.distanceTo(this.camera.position),i=this.terrainHeight(n.mesh.position.x,n.mesh.position.z)+.05;r<.62?(this.damagePlayer(n.damage,n.mesh.position),this.spawnBurst(n.mesh.position,16736637,14,3.2),this.removeBolt(t)):(n.mesh.position.y<=i||n.life<=0)&&(this.spawnBurst(n.mesh.position,12971911,6,1.9),this.removeBolt(t))}}removeBolt(e){let[t]=this.bolts.splice(e,1);t.mesh.removeFromParent(),t.mesh.geometry.dispose(),t.mesh.material.dispose()}damagePlayer(e,t){let n=e;this.player.armor>0&&(n*=.48,--this.player.armor,this.audio.pulse(188,.09,.12)),this.player.health=Math.max(0,this.player.health-n),this.player.lastDamage=performance.now()/1e3,this.player.damageFlash=1;let r=Math.atan2(t.x-this.player.position.x,t.z-this.player.position.z)-this.player.yaw,i=this.root.querySelector(`[data-damage]`);i&&i.style.setProperty(`--damage-angle`,`${Mt.radToDeg(r)}deg`),this.audio.pulse(52,.12,.25),navigator.vibrate&&navigator.vibrate(34),this.player.health<=0&&this.playerDied(),this.updateHUD(!0)}playerDied(){this.ended||(this.ended=!0,this.weapon.fireHeld=!1,this.showMessage(`VANGUARD SIGNAL LOST`,2),this.root.classList.add(`is-dead`),this.audio.pulse(37,.22,1.1),document.pointerLockElement&&document.exitPointerLock(),window.setTimeout(()=>{this.disposed||window.location.reload()},1450))}updateParticles(e){for(let t=this.particles.length-1;t>=0;--t){let n=this.particles[t];n.life-=e,n.velocity.y-=n.gravity*e,n.object.position.addScaledVector(n.velocity,e),n.object.rotation.x+=n.spin.x*e,n.object.rotation.y+=n.spin.y*e,n.object.rotation.z+=n.spin.z*e;let r=1-Nd(n.life/n.maxLife,0,1),i=Pd(n.startScale,n.endScale,r);n.object.scale.setScalar(i),n.fadeMaterial&&(n.fadeMaterial.opacity=(1-r)*.88),n.life<=0&&(n.object.removeFromParent(),n.object instanceof J&&(n.object.geometry.dispose(),Array.isArray(n.object.material)?n.object.material.forEach(e=>e.dispose()):n.object.material.dispose()),this.particles.splice(t,1))}for(let t=this.tracers.length-1;t>=0;--t){let n=this.tracers[t];n.life-=e;let r=n.line.material;r.opacity=Nd(n.life/n.maxLife,0,1)*.82,n.life<=0&&(n.line.removeFromParent(),n.line.geometry.dispose(),r.dispose(),this.tracers.splice(t,1))}}updateEnvironment(e){this.updateSunShadowFocus(),this.refreshCivilizationTexturePolish(),this.animatedMaterials.forEach(e=>{e.uniforms.uTime&&(e.uniforms.uTime.value=this.worldTime)}),this.waterMaterials.forEach((e,t)=>{e.uniforms.uTime.value=this.worldTime+t*3.7}),this.ambientMotes&&(this.ambientMotes.rotation.y+=e*.004,this.ambientMotes.position.y=Math.sin(this.worldTime*.16)*.24),this.accentLights.forEach((e,t)=>{let n=1+Math.sin(this.worldTime*1.8+t*1.73)*.035;e.scale.setScalar(n)}),this.anchors.forEach((t,n)=>{if(t.destroyed)return;t.group.position.y=t.position.y+Math.sin(this.worldTime*1.22+n)*.16,t.rings.forEach((t,n)=>{t.rotation.x+=e*(.32+n*.08),t.rotation.y+=e*(n%2==0?.48:-.39)}),t.core.rotation.x+=e*.34,t.core.rotation.y+=e*.52,t.core.scale.setScalar(1+Math.sin(this.worldTime*3.2+n)*.08+t.hitFlash*.25);let r=t.core.material;r.emissiveIntensity=1.28+t.hitFlash*2.1,t.hitFlash=Math.max(0,t.hitFlash-e*5);let i=t.beam.material;i.opacity=0}),this.messageTimer=Math.max(0,this.messageTimer-e),this.subtitleTimer=Math.max(0,this.subtitleTimer-e),this.controlsTimer=Math.max(0,this.controlsTimer-e),this.messageTimer<=0&&this.root.querySelector(`[data-message]`)?.classList.remove(`is-visible`),this.subtitleTimer<=0&&this.root.querySelector(`[data-subtitle]`)?.classList.remove(`is-visible`),this.root.querySelector(`[data-controls]`)?.classList.toggle(`is-visible`,this.controlsTimer>0),this.root.querySelector(`[data-hitmarker]`)?.classList.toggle(`is-visible`,this.weapon.hitmarker>0),this.root.style.setProperty(`--damage`,this.player.damageFlash.toFixed(3)),this.root.style.setProperty(`--low-health`,Nd((42-this.player.health)/42,0,1).toFixed(3))}updateMission(e){this.mission.anchorsDestroyed===3&&!this.mission.complete&&(this.mission.extractionTime<=0?(this.mission.extractionTime=4.2,this.showMessage(`THE CHOIR IS SILENT`,3.6),this.root.classList.add(`mission-collapse`)):(this.mission.extractionTime-=e,this.mission.extractionTime<=0&&this.completeMission()))}completeMission(){if(this.mission.complete)return;this.mission.complete=!0,this.mission.endTime=performance.now(),this.ended=!0,this.clearHeldInput(),document.pointerLockElement&&document.exitPointerLock(),this.root.querySelector(`[data-end]`)?.classList.add(`is-visible`),this.root.classList.add(`is-complete`);let e=this.root.querySelector(`[data-stat-kills]`),t=this.root.querySelector(`[data-stat-accuracy]`),n=this.root.querySelector(`[data-stat-time]`);if(e&&(e.textContent=String(this.mission.kills).padStart(2,`0`)),t&&(t.textContent=`${Math.round(this.weapon.hits/Math.max(1,this.weapon.shots)*100)}%`),n){let e=Math.floor((this.mission.endTime-this.mission.startTime)/1e3);n.textContent=`${String(Math.floor(e/60)).padStart(2,`0`)}:${String(e%60).padStart(2,`0`)}`}this.audio.pulse(56,.18,1.5)}updateHUD(e=!1,t=0){if(this.hudTimer-=t,!e&&this.hudTimer>0)return;this.hudTimer=.08;let n=(e,t)=>{let n=this.root.querySelector(e);n&&n.textContent!==t&&(n.textContent=t)};n(`[data-ammo]`,String(this.weapon.ammo).padStart(2,`0`)),n(`[data-reserve]`,String(this.weapon.reserve).padStart(3,`0`)),n(`[data-health]`,String(Math.ceil(this.player.health)).padStart(3,`0`)),n(`[data-objective-detail]`,`${this.mission.anchorsDestroyed} / 3 SILENCED`),this.mission.anchorsDestroyed===3&&n(`[data-objective]`,`SURVIVE THE LAST NOTE`),this.root.querySelector(`[data-health-fill]`)?.style.setProperty(`--fill`,`${Nd(this.player.health,0,100)}%`),this.root.querySelector(`[data-ammo-bars]`)?.style.setProperty(`--ammo`,`${this.weapon.ammo/this.weapon.magSize*100}%`);let r=this.root.querySelector(`[data-armor]`);r&&r.querySelectorAll(`i`).forEach((e,t)=>{e.classList.toggle(`is-active`,t<this.player.armor)});let i=(Mt.radToDeg(this.player.yaw)%360+360)%360;n(`[data-bearing]`,String(Math.round(i)).padStart(3,`0`));let a=[`N`,`NE`,`E`,`SE`,`S`,`SW`,`W`,`NW`][Math.round(i/45)%8];n(`[data-heading]`,a);let o=this.root.querySelector(`[data-threat]`);o?.style.setProperty(`--threat`,this.threatLevel.toFixed(2)),o?.classList.toggle(`is-visible`,this.threatLevel>.1);let s=this.root.querySelector(`[data-crosshair]`);s?.style.setProperty(`--spread`,`${5+(this.weapon.ads?0:6)+this.weapon.heat*4}px`),s?.classList.toggle(`is-ads`,this.weapon.adsAmount>.65),document.body.dataset.vantaState=JSON.stringify(this.snapshot())}showMessage(e,t=1.5){let n=this.root.querySelector(`[data-message]`);n&&(n.textContent=e,n.classList.add(`is-visible`),this.messageTimer=t)}showSubtitle(e,t=3.5){let n=this.root.querySelector(`[data-subtitle]`);n&&(n.textContent=e,n.classList.add(`is-visible`),this.subtitleTimer=t)}governQuality(){!this.started||this.quality===`low`||performance.now()-this.mission.startTime<8e3||(this.fps<43?this.lowFpsTimer+=.75:this.lowFpsTimer=Math.max(0,this.lowFpsTimer-1.5),this.lowFpsTimer>4.5&&(this.setQuality(this.quality===`ultra`?`high`:`low`),this.lowFpsTimer=0,this.showMessage(`RENDER SCALE ADAPTED // SIGNAL STABLE`,1.8)))}setQuality(e){this.quality=e,this.renderer&&(this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,this.getPixelRatioCap())),this.renderer.shadowMap.enabled=e!==`low`,this.bloom&&(this.bloom.enabled=e!==`low`,this.bloom.strength=e===`ultra`?.16:.12),this.ambientMotes&&(this.ambientMotes.visible=e!==`low`),this.resize())}resize(){if(!this.renderer||!this.composer)return;let e=Math.max(1,this.canvasHost.clientWidth),t=Math.max(1,this.canvasHost.clientHeight);this.renderer.setSize(e,t,!1),this.composer.setSize(e,t),this.camera.aspect=e/t,this.camera.updateProjectionMatrix(),this.weaponBody.scale.setScalar(e<600?.6:.7)}runMovementDiagnostics(){let e=this.colliders,t=this.colliderGrid,n=this.colliderProxyKeys,r=this.colliders.length,i=this.instanceColliderCount,a=this.player.position.clone(),o=this.player.velocity.clone(),s=this.player.yaw,c=this.player.pitch,l=this.player.grounded,u=this.player.bob,d=this.player.step,f=this.player.health,p=this.player.damageFlash,m=this.player.lastDamage,h=this.player.recoilPitch,g=this.player.recoilYaw,_=this.player.slide,v=this.player.slideCooldown,y=this.player.jumpQueued,b=new Set(this.keys),x=this.touch.move.clone(),S=this.weapon.ads,C=this.weapon.reloading,w=this.camera.position.clone(),T=this.camera.quaternion.clone(),E=this.camera.fov,D=this.lastPlayerContacts,O=this.controlsTimer,k=[],A=new U(0,1,0);try{this.colliders=[],this.colliderGrid=new Map,this.colliderProxyKeys=new Set,this.weapon.ads=!1,this.weapon.reloading=!1,this.touch.move.set(0,0);for(let e of[`forward`,`strafe`])for(let t of[0,Math.PI/2,Math.PI,-Math.PI/2]){this.player.position.set(0,this.terrainHeight(0,72)+Q,72),this.player.velocity.set(0,0,0),this.player.yaw=t,this.player.grounded=!0,this.player.slide=0,this.player.slideCooldown=0,this.player.jumpQueued=!1,this.keys.clear(),this.keys.add(e===`forward`?`KeyW`:`KeyD`);for(let e=0;e<60;e+=1)this.updatePlayer(1/60);let n=new U(this.player.position.x-0,0,this.player.position.z-72),r=n.length(),i=new U(e===`forward`?0:1,0,e===`forward`?-1:0).applyAxisAngle(A,t),a=r>1e-6?n.dot(i)/r:-1,o=r>1e-6?Math.abs(n.x*i.z-n.z*i.x)/r:1,s=r>3.8&&a>.985&&o<.18;k.push({input:e,yaw:Number(t.toFixed(4)),distance:Number(r.toFixed(3)),alignment:Number(a.toFixed(4)),lateralError:Number(o.toFixed(4)),pass:s})}}finally{this.colliders=e,this.colliderGrid=t,this.colliderProxyKeys=n,this.player.position.copy(a),this.player.velocity.copy(o),this.player.yaw=s,this.player.pitch=c,this.player.grounded=l,this.player.bob=u,this.player.step=d,this.player.health=f,this.player.damageFlash=p,this.player.lastDamage=m,this.player.recoilPitch=h,this.player.recoilYaw=g,this.player.slide=_,this.player.slideCooldown=v,this.player.jumpQueued=y,this.keys.clear(),b.forEach(e=>this.keys.add(e)),this.touch.move.copy(x),this.weapon.ads=S,this.weapon.reloading=C,this.camera.position.copy(w),this.camera.quaternion.copy(T),this.camera.fov=E,this.camera.updateProjectionMatrix(),this.lastPlayerContacts=D,this.controlsTimer=O}let j=this.terrainSlopeDegrees(a.x,a.z),ee=this.nearbyColliders(a.x,a.z,pd+1).length;return{pass:k.every(e=>e.pass)&&i>0,cases:k,colliders:{total:r,instance:i,nearby:ee},terrain:{slopeDegrees:Number(j.toFixed(2)),walkable:j<=vd}}}runCollisionDiagnostics(){let e=this.colliders,t=this.colliderGrid,n=this.colliderProxyKeys,r=this.instanceColliderCount,i=this.player.position.clone(),a=this.player.velocity.clone(),o=this.player.grounded,s=this.lastPlayerContacts,c=[...this.lastPlayerContactLabels],l=this.player.yaw,u=this.player.pitch,d=this.player.bob,f=this.player.step,p=this.player.slide,m=this.player.slideCooldown,h=this.player.jumpQueued,g=this.player.health,_=this.player.damageFlash,v=this.player.lastDamage,y=this.player.recoilPitch,b=this.player.recoilYaw,x=new Set(this.keys),S=this.touch.move.clone(),C=this.weapon.ads,w=this.weapon.reloading,T=this.camera.position.clone(),E=this.camera.quaternion.clone(),D=this.camera.fov,O=this.controlsTimer,k=this.collisionRecoveryCount,A=this.maxDepenetrationCorrection,j=this.lastSafePlayerPosition?.clone()??null,ee=e.every(e=>Number.isFinite(e.minY)&&Number.isFinite(e.maxY)&&e.maxY>e.minY),M=e.some(e=>e.source===`traversal`&&e.label===`reservoir-bridge-posts`&&!e.supportsPlayer)&&e.some(e=>e.source===`traversal`&&e.label===`reservoir-bridge-handrails`&&!e.supportsPlayer)&&e.some(e=>e.source===`traversal`&&e.label===`breathworks-roof-crossbeams`&&!e.supportsPlayer)&&e.some(e=>e.source===`traversal`&&e.label===`crown-signal-chamber`&&!e.supportsPlayer)&&!e.some(e=>e.label===`resonance-spine`||e.label?.startsWith(`secondary-route-`)),te=[];this.scene.traverse(e=>{e instanceof J&&!(e instanceof Y)&&(e.userData.traversalBarrier===!0||e.userData.traversalCeiling===!0)&&e.name&&te.push(e.name)});let ne=te.length>0&&te.every(t=>e.some(e=>e.source===`traversal`&&e.label===t&&Number.isFinite(e.halfX)&&Number.isFinite(e.halfZ)&&Number.isFinite(e.minY)&&Number.isFinite(e.maxY))),N=!0,re=`none`;for(let e=1;e<12;e+=1){let t=e/12,n=Pd(-23,-9,t),r=Pd(13,1,t),i=this.terrainHeight(n,r),a=this.findSupportSurface(n,r,i,hd,_d),o=a?this.nearbyColliders(n,r,pd+.1).filter(e=>this.colliderBlocksPlayer(e,a.height,a.height+Q+fd,!0)&&!!this.overlapContact(new U(n,0,r),e)):[];if(!a||o.length>0){N=!1;let t=o.map(e=>`${e.label??e.source}:${e.halfX?.toFixed(2)??`c`}/${e.halfZ?.toFixed(2)??e.radius.toFixed(2)}@${e.yaw?.toFixed(2)??`0`} y=${e.minY?.toFixed(2)}..${e.maxY?.toFixed(2)}`).join(`,`)||`no-support`;re=`sample=${e} x=${n.toFixed(2)} z=${r.toFixed(2)} support=${a?.height.toFixed(2)??`none`} blocking=${t}`;break}}let ie=[],ae=!1,oe=0,se=0,ce={recoveries:0,maxCorrection:0,maxHeightDiscontinuity:0},le=()=>{this.colliders=[],this.colliderGrid=new Map,this.colliderProxyKeys=new Set,this.instanceColliderCount=0},P=(e,t,n)=>ie.push({name:e,pass:t,detail:n});this.collisionRecoveryCount=0,this.maxDepenetrationCorrection=0;try{let e=Math.hypot(14,-12),t=14/e,n=-12/e,r=-t,i=(e,t=0)=>({x:Pd(-23,-9,e)+n*t,z:Pd(13,1,e)+r*t}),a=i(1/12),o=this.terrainHeight(a.x,a.z),s=this.findSupportSurface(a.x,a.z,o,hd,_d);this.lastSafePlayerPosition=null;let c=this.findSafeSupportPosition(a.x,a.z,s?.height??o)??new U(a.x,(s?.height??o)+Q,a.z);this.player.position.copy(c),this.player.velocity.set(0,0,0),this.player.grounded=!0;let l=this.collisionRecoveryCount,u=[{...i(.2),contact:!1,jump:!1},{...i(.38,-.45),contact:!1,jump:!1},{...i(.48),contact:!1,jump:!1},{...i(.68),contact:!1,jump:!0},{...i(.76,1.2),contact:!0,jump:!1},{...i(.88),contact:!1,jump:!1},{...i(1),contact:!1,jump:!1},{...i(.82,-.45),contact:!1,jump:!1},{...i(.68),contact:!1,jump:!1},{...i(.52),contact:!1,jump:!0},{...i(.32),contact:!1,jump:!1},{...a,contact:!1,jump:!1},{x:c.x,z:c.z,contact:!1,jump:!1}],d=0,f=0,p=0,m=0,h=new Set,g=1/0,_=0,v=this.player.position.y-Q;for(let e=0;e<780&&d<u.length;e+=1){let e=u[d],t=e.x-this.player.position.x,a=e.z-this.player.position.z,o=Math.hypot(t,a),s=h.has(d);if(e.jump&&o<.3&&!s&&this.player.grounded)this.player.velocity.x=0,this.player.velocity.z=0,this.player.velocity.y=md,this.player.grounded=!1,h.add(d),m+=1;else if(!e.contact&&o<.24&&(!e.jump||s&&this.player.grounded&&f>4)){d+=1,f=0;continue}let c=t/Math.max(o,1e-6),l=a/Math.max(o,1e-6),y=e.contact?3.2:4.4;this.player.velocity.x=Fd(this.player.velocity.x,c*y,this.player.grounded?28:7,1/60),this.player.velocity.z=Fd(this.player.velocity.z,l*y,this.player.grounded?28:7,1/60),this.movePlayerHorizontal(this.player.velocity.x/60,this.player.velocity.z/60,this.player.grounded,1/60),this.player.grounded||this.resolvePlayerVertical(1/60),this.rememberSafePlayerPosition();let b=this.player.position.y-Q,x=this.terrainHeight(this.player.position.x,this.player.position.z);if(g=Math.min(g,b-x),_=Math.max(_,Math.abs(b-v)),v=b,f+=1,e.contact&&this.lastPlayerContacts>0){let e=i(.76);(this.player.position.x-e.x)*n+(this.player.position.z-e.z)*r>.8&&(p+=this.lastPlayerContacts,d+=1,f=0)}if(f>150)break}let y=this.collisionRecoveryCount-l,b=Math.hypot(this.player.position.x-c.x,this.player.position.z-c.z),x=this.nearbyColliders(this.player.position.x,this.player.position.z,pd+.45).filter(e=>this.colliderBlocksPlayer(e,this.player.position.y-Q,this.player.position.y+fd,this.player.grounded)&&!!this.overlapContact(this.player.position,e)).map(e=>e.label??e.source??`unknown`).slice(0,6);ce={recoveries:y,maxCorrection:this.maxDepenetrationCorrection,maxHeightDiscontinuity:_},P(`city-traversal-controller`,d>=u.length&&b<.55&&p>0&&m>=2&&y===0&&g>=-Ed-Sd&&_<.65&&this.maxDepenetrationCorrection<.55,`waypoints=${d}/${u.length} return=${b.toFixed(3)} railContacts=${p} jumps=${m} minClearance=${g.toFixed(3)} maxHeightStep=${_.toFixed(3)} correction=${this.maxDepenetrationCorrection.toFixed(3)} recoveries=${y} pos=${this.player.position.x.toFixed(3)},${this.player.position.z.toFixed(3)} grounded=${this.player.grounded} contacts=${this.lastPlayerContacts}:${this.lastPlayerContactLabels.join(`|`)||`none`} blocking=${x.join(`|`)||`none`}`);let S=this.terrainHeight(19,8);this.lastSafePlayerPosition=null,this.player.position.set(19,S+Q,8),this.player.velocity.set(0,0,0),this.player.grounded=!0;for(let e=0;e<12;e+=1)this.movePlayerHorizontal(0,0,this.player.grounded,1/60),this.player.grounded||this.resolvePlayerVertical(1/60),this.rememberSafePlayerPosition();let C=Math.hypot(this.player.position.x-19,this.player.position.z-8),w=this.terrainHeight(this.player.position.x,this.player.position.z),T=C<2&&this.player.position.y-Q>=w-Ed&&Number.isFinite(this.player.position.y);this.player.position.y=w+Q-3,this.player.velocity.set(0,-20,0),this.player.grounded=!1,this.resolvePlayerVertical(1/60);let E=this.terrainHeight(this.player.position.x,this.player.position.z),D=this.player.position.y-Q>=E-Ed&&Number.isFinite(this.player.position.y);le();let O=this.terrainHeight(19,8);this.registerWorldCollider({x:19,z:8,radius:2,minY:O-.5,maxY:O+4,source:`test`}),this.lastSafePlayerPosition=null,this.player.position.set(19,O+Q,8),this.player.velocity.set(0,0,0),this.player.grounded=!0,this.movePlayerHorizontal(0,0,!0,1/60);let k=Math.hypot(this.player.position.x-19,this.player.position.z-8),A=this.player.position.y-Q,j=this.terrainHeight(this.player.position.x,this.player.position.z),ee=k<=Td+Sd&&Math.abs(j-O)<=hd+_d+Sd&&A>=j-Ed&&this.isPlayerPositionClear(this.player.position.x,this.player.position.z,A,!0);P(`embedded-terrain-recovery`,T&&D&&ee,`tourDrift=${C.toFixed(3)} tourFeet=${w.toFixed(3)} recovered=${D} boundedShift=${k.toFixed(3)} clear=${ee} bridge=${re}`),le(),this.registerWorldCollider({x:0,z:0,radius:.7,minY:-.2,maxY:3,source:`test`});let M=new U(4,0,0),te=this.sweepPlayerHorizontal(-2,0,4,0,0,Q+fd,!1,M),ne=Math.hypot(te.position.x,te.position.z);P(`circle-block`,te.contacts.length>0&&ne>=.7+pd-.002&&te.position.x<0&&Math.abs(M.x)<.01,`x=${te.position.x.toFixed(3)} separation=${ne.toFixed(3)} contacts=${te.contacts.length}`),le();let N=Math.PI/4;this.registerWorldCollider({x:0,z:0,radius:Math.hypot(1.6,.25),halfX:1.6,halfZ:.25,yaw:N,minY:-.2,maxY:3,source:`test`});let ie=Math.cos(N),oe=-Math.sin(N),se=Math.sin(N),ue=Math.cos(N),F=se*(.25+pd+.7)-ie*.8,de=ue*(.25+pd+.7)-oe*.8,fe=-se*1.5+ie*1.4,pe=-ue*1.5+oe*1.4,me=new U(fe,0,pe),he=this.sweepPlayerHorizontal(F,de,fe,pe,0,Q+fd,!1,me),ge=he.position.x-F,_e=he.position.z-de,ve=ge*ie+_e*oe,ye=Math.sin(N)*he.position.x+Math.cos(N)*he.position.z;P(`rotated-obb-slide`,he.contacts.length>0&&ve>.9&&ye>=.25+pd-.003&&Math.abs(me.x*se+me.z*ue)<.01,`tangent=${ve.toFixed(3)} localZ=${ye.toFixed(3)} contacts=${he.contacts.length}`),le();let be=0,xe=0,Se=1;for(let e=-118;e<=118;e+=3)for(let t=-118;t<=118;t+=3){let n=this.terrainNormalY(e,t);n<Se&&(Se=n,be=e,xe=t)}let Ce=!1,we=``;if(this.isWalkableNormal(Se)){let e=Math.cos(Mt.degToRad(vd+1)),t=Math.cos(Mt.degToRad(vd-1));Ce=!this.isWalkableNormal(e)&&this.isWalkableNormal(t),we=`threshold-fallback maxTerrainSlope=${Mt.radToDeg(Math.acos(Se)).toFixed(2)}`}else{let e=this.terrainHeight(be,xe);this.player.position.set(be,e+Q+.25,xe),this.player.velocity.set(0,-4,0),this.player.grounded=!1,this.resolvePlayerVertical(.1);let t=Math.hypot(this.player.velocity.x,this.player.velocity.z);Ce=!this.player.grounded&&this.player.position.y>=e+Q-Sd&&t>.01,we=`slope=${Mt.radToDeg(Math.acos(Se)).toFixed(2)} grounded=${this.player.grounded} slide=${t.toFixed(3)}`}P(`steep-slope-reject`,Ce,we);let Te=be,Ee=xe,De=be,Oe=xe,ke=1,Ae=[[1.8,0],[-1.8,0],[0,1.8],[0,-1.8],[1.27,1.27],[1.27,-1.27],[-1.27,1.27],[-1.27,-1.27]];for(let e=-116;e<=116;e+=3)for(let t=-116;t<=116;t+=3){let n=this.terrainNormalY(e,t);if(this.isWalkableNormal(n))for(let[n,r]of Ae){let i=e+n,a=t+r,o=this.terrainNormalY(i,a),s=this.terrainHeight(i,a)-this.terrainHeight(e,t);!this.isWalkableNormal(o)&&s>hd&&o<ke&&(Te=e,Ee=t,De=i,Oe=a,ke=o)}}let je=De-Te,Me=Oe-Ee,I=Math.hypot(je,Me)||1,Ne=this.terrainHeight(Te,Ee),Pe=this.terrainHeight(De,Oe)-Ne;this.player.position.set(Te,Ne+Q,Ee),this.player.velocity.set(0,0,0),this.player.yaw=Math.atan2(-je/I,-Me/I),this.player.grounded=!0,this.player.jumpQueued=!1,this.player.slide=0,this.player.slideCooldown=0,this.lastSafePlayerPosition=null,this.weapon.ads=!1,this.weapon.reloading=!1,this.touch.move.set(0,0),this.keys.clear(),this.keys.add(`KeyW`);let Fe=this.collisionRecoveryCount,L=1/0,Ie=-1/0,R=1,Le=1/0,Re=-1/0,ze=1/0,Be=-1/0,Ve=!0;for(let e=0;e<300;e+=1){(e===18||e===108||e===198)&&(this.player.jumpQueued=!0),this.updatePlayer(1/60);let t=this.terrainHeight(this.player.position.x,this.player.position.z),n=this.player.position.y-Q-t;L=Math.min(L,n),Ie=Math.max(Ie,n),R=Math.min(R,this.terrainNormalY(this.player.position.x,this.player.position.z)),Le=Math.min(Le,this.player.position.y),Re=Math.max(Re,this.player.position.y);let r=this.player.position.y-Q-Ne;ze=Math.min(ze,r),Be=Math.max(Be,r),Ve&&=Number.isFinite(this.player.position.x+this.player.position.y+this.player.position.z)}this.keys.delete(`KeyW`);let He=this.collisionRecoveryCount-Fe,Ue=Math.hypot(this.player.position.x-Te,this.player.position.z-Ee),We=Mt.radToDeg(Math.acos(Nd(R,-1,1))),Ge=md*md/(2*20.5),Ke=Math.max(1.25,Pe+Ge+.2);P(`sustained-steep-controller`,Ve&&He===0&&L>=-Ed-Sd&&Ie<3&&(Ie>.2||Ue>1&&Ie<=Ed+Sd)&&Re-Le<9&&Pe>hd&&Be<Ke&&Ue<42&&We>=vd-3&&ke<yd,`seconds=5 slope=${We.toFixed(2)} targetSlope=${Mt.radToDeg(Math.acos(Nd(ke,-1,1))).toFixed(2)} targetRise=${Pe.toFixed(3)} feetDelta=${ze.toFixed(3)}..${Be.toFixed(3)} elevationBound=${Ke.toFixed(3)} clearance=${L.toFixed(3)}..${Ie.toFixed(3)} ySpan=${(Re-Le).toFixed(3)} distance=${Ue.toFixed(3)} recoveries=${He}`),le();let qe=this.terrainHeight(-1,72),Je=qe+.3;this.registerWorldCollider({x:0,z:72,radius:Math.hypot(.45,.65),halfX:.45,halfZ:.65,minY:qe-.1,maxY:Je,supportsPlayer:!0,source:`test`}),this.player.position.set(-1,qe+Q,72),this.player.velocity.set(4,0,0),this.player.grounded=!0,this.movePlayerHorizontal(1.1,0,!0,1/60);let Ye=this.player.position.y-Q;P(`step-up-snap`,this.player.grounded&&Math.abs(Ye-Je)<.004&&this.player.position.x>-.2,`x=${this.player.position.x.toFixed(3)} feet=${Ye.toFixed(3)} top=${Je.toFixed(3)}`),le(),this.registerWorldCollider({x:0,z:0,radius:.6,minY:0,maxY:.55,source:`test`});let Xe=new U(4,0,0),Ze=this.sweepPlayerHorizontal(-2,0,4,0,.7,.7+Q+fd,!1,Xe);P(`bounded-jump-over`,Ze.contacts.length===0&&Ze.position.x>1.99,`x=${Ze.position.x.toFixed(3)} contacts=${Ze.contacts.length} obstacleTop=0.550 feet=0.700`),le();let Qe=this.terrainHeight(0,0)+2.4,$e=Qe-.4;this.registerWorldCollider({x:0,z:0,radius:Math.hypot(2,2),halfX:2,halfZ:2,minY:$e,maxY:Qe,supportsPlayer:!0,source:`test`}),this.player.position.set(0,Qe+Q+.35,0),this.player.velocity.set(0,-5,0),this.player.grounded=!1,this.resolvePlayerVertical(.1),P(`platform-landing`,this.player.grounded&&Math.abs(this.player.position.y-Q-Qe)<.004&&this.player.velocity.y===0,`feet=${(this.player.position.y-Q).toFixed(3)} top=${Qe.toFixed(3)} grounded=${this.player.grounded}`),this.player.position.set(0,$e-fd-.25,0),this.player.velocity.set(0,7,0),this.player.grounded=!1,this.resolvePlayerVertical(.08);let et=this.player.position.y+fd;P(`ceiling-contact`,!this.player.grounded&&Math.abs(et-($e-Sd))<.004&&this.player.velocity.y===0,`head=${et.toFixed(3)} underside=${$e.toFixed(3)} velocityY=${this.player.velocity.y.toFixed(3)}`),le();let tt=this.terrainHeight(11,11),nt={x:11,z:11,radius:Math.hypot(.6,.4),halfX:.6,halfZ:.4,yaw:.3,minY:tt,maxY:tt+3,source:`instance`};this.registerWorldCollider(nt),this.registerWorldCollider({...nt}),ae=this.colliders.length===1}finally{this.colliders=e,this.colliderGrid=t,this.colliderProxyKeys=n,this.instanceColliderCount=r,this.player.position.copy(i),this.player.velocity.copy(a),this.player.grounded=o,this.lastPlayerContacts=s,this.lastPlayerContactLabels=c,this.player.yaw=l,this.player.pitch=u,this.player.bob=d,this.player.step=f,this.player.slide=p,this.player.slideCooldown=m,this.player.jumpQueued=h,this.player.health=g,this.player.damageFlash=_,this.player.lastDamage=v,this.player.recoilPitch=y,this.player.recoilYaw=b,this.keys.clear(),x.forEach(e=>this.keys.add(e)),this.touch.move.copy(S),this.weapon.ads=C,this.weapon.reloading=w,this.camera.position.copy(T),this.camera.quaternion.copy(E),this.camera.fov=D,this.camera.updateProjectionMatrix(),this.controlsTimer=O,this.lastSafePlayerPosition=j?.clone()??null,oe=this.collisionRecoveryCount,se=this.maxDepenetrationCorrection,this.collisionRecoveryCount=k,this.maxDepenetrationCorrection=A}let ue={finiteBounds:ee,duplicateProxySuppression:ae,taggedColliderRecognition:M,taggedBridgeClearance:N,regularTaggedCoverage:ne};return{pass:ie.every(e=>e.pass)&&ue.finiteBounds&&ue.duplicateProxySuppression&&ue.taggedColliderRecognition&&ue.taggedBridgeClearance&&ue.regularTaggedCoverage,cases:ie,invariants:ue,telemetry:{recoveries:oe,maxCorrection:Number(se.toFixed(4)),cityTraversal:{recoveries:ce.recoveries,maxCorrection:Number(ce.maxCorrection.toFixed(4)),maxHeightDiscontinuity:Number(ce.maxHeightDiscontinuity.toFixed(4))}}}}runMovementTest(){let e=this.runMovementDiagnostics();document.body.dataset.movementtest=e.pass?`done`:`failed`,document.body.dataset.movementtestResult=JSON.stringify(e)}runCollisionTest(){let e=this.runCollisionDiagnostics();document.body.dataset.collisiontest=e.pass?`done`:`failed`,document.body.dataset.collisiontestResult=JSON.stringify(e)}runCityTest(){let e=this.runCollisionDiagnostics(),t=e.cases.find(e=>e.name===`city-traversal-controller`),n=t?.pass===!0&&e.invariants.finiteBounds&&e.invariants.taggedColliderRecognition&&e.invariants.taggedBridgeClearance&&e.invariants.regularTaggedCoverage,r={pass:n,case:t??null,telemetry:e.telemetry.cityTraversal,invariants:e.invariants};document.body.dataset.citytest=n?`done`:`failed`,document.body.dataset.citytestResult=JSON.stringify(r)}installDebugAPI(){let e={snapshot:()=>this.snapshot(),start:()=>this.start(),teleport:(e,t)=>{let n=Nd(e,-124,124),r=Nd(t,-124,124);this.player.position.set(n,this.terrainHeight(n,r)+Q,r),this.player.velocity.set(0,0,0),this.player.grounded=!0,this.lastSafePlayerPosition=null,this.lastPlayerContacts=this.resolvePlayerCollisions(this.player.position,this.player.position.y-Q,this.player.position.y+fd,!0),this.player.position.y=this.terrainHeight(this.player.position.x,this.player.position.z)+Q,this.rememberSafePlayerPosition()},damageAnchor:(e,t=999)=>{let n=this.anchors[e];n&&this.damageAnchor(n,t,n.position.clone(),new U(0,1,0))},spawnEnemy:(e=`stalker`)=>{let t=new U;this.movementBasis(this.player.yaw,t,new U),this.createEnemy(this.player.position.clone().addScaledVector(t,14),e,0)},setQuality:e=>this.setQuality(e),setYaw:e=>{this.player.yaw=Number.isFinite(e)?e:this.player.yaw},movementDiagnostics:()=>this.runMovementDiagnostics(),collisionDiagnostics:()=>this.runCollisionDiagnostics()};this.debugApi=e,window.__vanta=e}snapshot(){let e=this.renderer?.info;return{ready:!!(this.renderer&&!this.fatal),started:this.started,paused:this.paused,fps:this.fps,frameMs:Number(this.frameMs.toFixed(2)),player:{x:Number(this.player.position.x.toFixed(2)),y:Number(this.player.position.y.toFixed(2)),z:Number(this.player.position.z.toFixed(2)),health:Number(this.player.health.toFixed(1)),armor:this.player.armor,grounded:this.player.grounded,speed:Number(Math.hypot(this.player.velocity.x,this.player.velocity.z).toFixed(2)),slopeDegrees:Number(this.terrainSlopeDegrees(this.player.position.x,this.player.position.z).toFixed(2)),contacts:this.lastPlayerContacts},weapon:{ammo:this.weapon.ammo,reserve:this.weapon.reserve,reloading:this.weapon.reloading,ads:this.weapon.ads,shots:this.weapon.shots,hits:this.weapon.hits},mission:{anchors:this.mission.anchorsDestroyed,enemies:this.enemies.filter(e=>!e.dead).length,kills:this.mission.kills,complete:this.mission.complete},renderer:{calls:e?.render.calls??0,triangles:e?.render.triangles??0,pixelRatio:this.renderer?.getPixelRatio()??0,quality:this.quality},collision:{total:this.colliders.length,instance:this.instanceColliderCount,nearby:this.nearbyColliders(this.player.position.x,this.player.position.z,pd+1).length,recoveries:this.collisionRecoveryCount,maxCorrection:Number(this.maxDepenetrationCorrection.toFixed(4))},fatal:this.fatal}}runAutotest(){if(!this.started||this.disposed)return;if(this.setQuality(`high`),this.player.position.set(-25,this.terrainHeight(-25,47)+Q,47),this.player.yaw=0,this.player.pitch=-.02,this.captureMode){let e=this.createEnemy(new U(-21.5,0,34),`warden`,0);e.health=800,e.maxHealth=800,e.wakeRadius=80,e.cooldown=.35,e.group.scale.setScalar(1.55);let t=e.group.position.x-this.player.position.x,n=e.group.position.z-this.player.position.z;this.player.yaw=-Math.atan2(t,-n),this.player.pitch=Math.atan2(e.group.position.y+.35-this.player.position.y,Math.hypot(t,n))}this.weapon.fireHeld=!0,this.captureMode&&(document.body.dataset.vantaCapture=`firing`,this.weapon.ads=this.adsCapture);let e=this.captureMode?2400:520;window.setTimeout(()=>{this.weapon.fireHeld=!1,this.keys.add(`KeyW`)},e),window.setTimeout(()=>{this.keys.delete(`KeyW`),this.weapon.ads=!0},e+530),window.setTimeout(()=>{this.weapon.ads=!1;let e=this.snapshot();document.body.dataset.autotest=`done`,document.body.dataset.autotestResult=JSON.stringify(e),this.captureMode&&(document.body.dataset.vantaCapture=`done`)},e+2080)}runMissionTest(){!this.started||this.disposed||(this.setQuality(`high`),this.enemies.forEach(e=>{e.wakeRadius=0,e.cooldown=99}),this.anchors.forEach((e,t)=>{window.setTimeout(()=>{this.damageAnchor(e,e.maxHealth+1,e.position.clone(),new U(0,1,0))},t*420)}),window.setTimeout(()=>{let e=this.snapshot();document.body.dataset.missiontest=e.mission.complete&&e.mission.anchors===3?`done`:`failed`,document.body.dataset.missiontestResult=JSON.stringify(e)},6100))}fail(e){let t=e instanceof Error?e.message:String(e);this.fatal=t,console.error(`[VANTA//9] Render initialization failed:`,e),this.root.classList.add(`has-error`),this.root.querySelector(`[data-error]`)?.classList.add(`is-visible`);let n=this.root.querySelector(`[data-error-copy]`);n&&(n.textContent=`WebGL could not establish a stable render link. Update your browser or enable hardware acceleration, then descend again.`),document.body.dataset.vantaFatal=t}dispose(){this.disposed||(this.disposed=!0,cancelAnimationFrame(this.raf),this.clearHeldInput(),window.removeEventListener(`resize`,this.onResizeBound),window.removeEventListener(`mousemove`,this.onMouseMoveBound),window.removeEventListener(`mousedown`,this.onMouseDownBound),window.removeEventListener(`mouseup`,this.onMouseUpBound),window.removeEventListener(`keydown`,this.onKeyDownBound),window.removeEventListener(`keyup`,this.onKeyUpBound),document.removeEventListener(`pointerlockchange`,this.onPointerLockBound),document.removeEventListener(`contextmenu`,this.onContextMenuBound),document.pointerLockElement===this.renderer?.domElement&&document.exitPointerLock(),this.audio.dispose(),this.scene.traverse(e=>{(e instanceof J||e instanceof Fi||e instanceof Oi)&&(e.geometry?.dispose(),(Array.isArray(e.material)?e.material:[e.material]).forEach(e=>{for(let t of Object.values(e))t instanceof Xt&&t.dispose();e.dispose()}))}),this.composer?.dispose(),this.renderer?.dispose(),this.renderer?.forceContextLoss(),this.renderer?.domElement.remove(),this.renderer=null,this.composer=null,window.__vanta===this.debugApi&&delete window.__vanta,this.debugApi=void 0)}},$=n();function Bd(){let e=(0,r.useRef)(null);return(0,r.useEffect)(()=>{if(!e.current)return;let t=new zd(e.current);return t.init(),()=>t.dispose()},[]),(0,$.jsxs)(`main`,{className:`game-shell`,ref:e,children:[(0,$.jsx)(`div`,{className:`game-canvas`,"data-canvas":!0,"aria-hidden":`true`}),(0,$.jsxs)(`div`,{className:`boot-screen`,"data-boot":!0,children:[(0,$.jsx)(`div`,{className:`boot-sigil`}),(0,$.jsx)(`p`,{children:`CALIBRATING EXOBIOSPHERE`}),(0,$.jsx)(`div`,{className:`boot-line`,children:(0,$.jsx)(`i`,{})})]}),(0,$.jsxs)(`section`,{className:`intro-screen`,"data-intro":!0,"aria-label":`Mission start`,children:[(0,$.jsx)(`div`,{className:`intro-noise`}),(0,$.jsxs)(`div`,{className:`intro-copy`,children:[(0,$.jsxs)(`div`,{className:`eyebrow`,children:[(0,$.jsx)(`span`,{children:`HECATE DESCENT // 09`}),(0,$.jsx)(`span`,{children:`UNKNOWN BIOSPHERE`})]}),(0,$.jsxs)(`h1`,{children:[`VANTA`,(0,$.jsx)(`span`,{children:`//9`})]}),(0,$.jsx)(`p`,{className:`intro-kicker`,children:`ENTER THE CHOIR`}),(0,$.jsx)(`p`,{className:`intro-brief`,children:`The planet began transmitting in our dead pilots' voices. Sever the three Choir Anchors. Do not answer back.`}),(0,$.jsxs)(`button`,{className:`deploy-button`,"data-start":!0,type:`button`,children:[(0,$.jsx)(`span`,{children:`DESCEND`}),(0,$.jsx)(`small`,{children:`CLICK TO DEPLOY`})]}),(0,$.jsxs)(`div`,{className:`intro-meta`,"aria-label":`Game features`,children:[(0,$.jsx)(`span`,{children:`FULL-SPECTRUM COMBAT`}),(0,$.jsx)(`span`,{children:`PROCEDURAL BIOSPHERE`}),(0,$.jsx)(`span`,{children:`HEADPHONES ADVISED`})]})]}),(0,$.jsxs)(`div`,{className:`planet-readout`,children:[(0,$.jsx)(`span`,{children:`VNT-009`}),(0,$.jsx)(`b`,{children:`03:17:44`}),(0,$.jsx)(`i`,{children:`ATM // BREATHABLE?`})]})]}),(0,$.jsxs)(`section`,{className:`hud`,"data-hud":!0,"aria-label":`Combat heads-up display`,children:[(0,$.jsx)(`div`,{className:`hud-scanlines`}),(0,$.jsxs)(`div`,{className:`mission-block`,children:[(0,$.jsxs)(`div`,{className:`mission-label`,children:[(0,$.jsx)(`i`,{}),`ACTIVE DIRECTIVE`]}),(0,$.jsx)(`strong`,{"data-objective":!0,children:`SEVER CHOIR ANCHORS`}),(0,$.jsx)(`span`,{"data-objective-detail":!0,children:`0 / 3 SILENCED`})]}),(0,$.jsxs)(`div`,{className:`compass`,"aria-hidden":`true`,children:[(0,$.jsx)(`span`,{children:`W`}),(0,$.jsx)(`span`,{children:`NW`}),(0,$.jsx)(`b`,{"data-heading":!0,children:`N`}),(0,$.jsx)(`span`,{children:`NE`}),(0,$.jsx)(`span`,{children:`E`}),(0,$.jsx)(`i`,{"data-bearing":!0,children:`000`})]}),(0,$.jsxs)(`div`,{className:`threat-indicator`,"data-threat":!0,children:[(0,$.jsx)(`i`,{}),(0,$.jsx)(`span`,{children:`CHOIR PRESENCE`})]}),(0,$.jsxs)(`div`,{className:`crosshair`,"data-crosshair":!0,children:[(0,$.jsx)(`i`,{}),(0,$.jsx)(`i`,{}),(0,$.jsx)(`i`,{}),(0,$.jsx)(`i`,{}),(0,$.jsx)(`b`,{})]}),(0,$.jsxs)(`div`,{className:`hitmarker`,"data-hitmarker":!0,children:[(0,$.jsx)(`i`,{}),(0,$.jsx)(`i`,{}),(0,$.jsx)(`i`,{}),(0,$.jsx)(`i`,{})]}),(0,$.jsxs)(`div`,{className:`health-panel`,children:[(0,$.jsxs)(`div`,{className:`operator-tag`,children:[(0,$.jsx)(`span`,{children:`VANGUARD`}),(0,$.jsx)(`b`,{children:`HECATE-1`})]}),(0,$.jsx)(`div`,{className:`health-bar`,children:(0,$.jsx)(`i`,{"data-health-fill":!0})}),(0,$.jsxs)(`div`,{className:`health-readout`,children:[(0,$.jsx)(`b`,{"data-health":!0,children:`100`}),(0,$.jsx)(`span`,{children:`VITAL`})]}),(0,$.jsxs)(`div`,{className:`armor-pips`,"data-armor":!0,"aria-label":`Armor`,children:[(0,$.jsx)(`i`,{}),(0,$.jsx)(`i`,{}),(0,$.jsx)(`i`,{})]})]}),(0,$.jsxs)(`div`,{className:`weapon-panel`,children:[(0,$.jsxs)(`div`,{className:`weapon-mode`,children:[(0,$.jsx)(`span`,{children:`R//36 RESONANCE`}),(0,$.jsx)(`b`,{children:`AUTO`})]}),(0,$.jsxs)(`div`,{className:`ammo`,children:[(0,$.jsx)(`strong`,{"data-ammo":!0,children:`36`}),(0,$.jsx)(`i`,{}),(0,$.jsx)(`span`,{"data-reserve":!0,children:`144`})]}),(0,$.jsx)(`div`,{className:`ammo-bars`,"data-ammo-bars":!0})]}),(0,$.jsxs)(`div`,{className:`controls-hint`,"data-controls":!0,children:[(0,$.jsxs)(`span`,{children:[(0,$.jsx)(`kbd`,{children:`WASD`}),` MOVE`]}),(0,$.jsxs)(`span`,{children:[(0,$.jsx)(`kbd`,{children:`SHIFT`}),` SPRINT`]}),(0,$.jsxs)(`span`,{children:[(0,$.jsx)(`kbd`,{children:`RMB`}),` FOCUS`]}),(0,$.jsxs)(`span`,{children:[(0,$.jsx)(`kbd`,{children:`R`}),` RELOAD`]})]}),(0,$.jsxs)(`div`,{className:`interact-prompt`,"data-prompt":!0,children:[(0,$.jsx)(`kbd`,{children:`E`}),(0,$.jsx)(`span`,{children:`INTERFACE`})]}),(0,$.jsx)(`div`,{className:`combat-message`,"data-message":!0,"aria-live":`polite`}),(0,$.jsx)(`div`,{className:`subtitles`,"data-subtitle":!0,"aria-live":`polite`})]}),(0,$.jsx)(`div`,{className:`damage-overlay`,"data-damage":!0}),(0,$.jsx)(`div`,{className:`low-health-overlay`,"data-low-health":!0}),(0,$.jsxs)(`div`,{className:`cinema-bars`,"data-cinema":!0,children:[(0,$.jsx)(`i`,{}),(0,$.jsx)(`i`,{})]}),(0,$.jsx)(`section`,{className:`pause-screen`,"data-pause":!0,"aria-label":`Game paused`,children:(0,$.jsxs)(`div`,{children:[(0,$.jsx)(`span`,{className:`eyebrow`,children:`HECATE DESCENT // PAUSED`}),(0,$.jsx)(`h2`,{children:`SIGNAL HELD`}),(0,$.jsx)(`p`,{children:`The Choir can wait. It has been waiting for centuries.`}),(0,$.jsx)(`button`,{type:`button`,"data-resume":!0,children:`RESUME DESCENT`}),(0,$.jsx)(`button`,{type:`button`,"data-restart":!0,children:`RESTART MISSION`}),(0,$.jsx)(`small`,{children:`ESC TO RETURN`})]})}),(0,$.jsxs)(`section`,{className:`end-screen`,"data-end":!0,"aria-label":`Mission complete`,children:[(0,$.jsx)(`div`,{className:`end-flare`}),(0,$.jsxs)(`div`,{children:[(0,$.jsx)(`span`,{className:`eyebrow`,children:`HECATE DESCENT // COMPLETE`}),(0,$.jsxs)(`h2`,{children:[`THE PLANET`,(0,$.jsx)(`br`,{}),`HEARD YOU.`]}),(0,$.jsx)(`p`,{"data-end-copy":!0,children:`Three anchors silenced. One signal remains—coming from inside your helmet.`}),(0,$.jsxs)(`div`,{className:`mission-stats`,children:[(0,$.jsxs)(`span`,{children:[(0,$.jsx)(`b`,{"data-stat-kills":!0,children:`00`}),` HUNTERS ERASED`]}),(0,$.jsxs)(`span`,{children:[(0,$.jsx)(`b`,{"data-stat-accuracy":!0,children:`00%`}),` ACCURACY`]}),(0,$.jsxs)(`span`,{children:[(0,$.jsx)(`b`,{"data-stat-time":!0,children:`00:00`}),` DESCENT TIME`]})]}),(0,$.jsx)(`button`,{type:`button`,"data-replay":!0,children:`DESCEND AGAIN`})]})]}),(0,$.jsxs)(`section`,{className:`error-screen`,"data-error":!0,"aria-live":`assertive`,children:[(0,$.jsx)(`span`,{children:`RENDER LINK SEVERED`}),(0,$.jsx)(`h2`,{children:`THE PLANET REFUSED THIS DEVICE.`}),(0,$.jsx)(`p`,{"data-error-copy":!0})]}),(0,$.jsxs)(`div`,{className:`touch-ui`,"data-touch":!0,"aria-label":`Touch controls`,children:[(0,$.jsx)(`div`,{className:`touch-stick`,"data-stick":!0,children:(0,$.jsx)(`i`,{"data-stick-knob":!0})}),(0,$.jsx)(`div`,{className:`touch-look`,"data-look":!0,"aria-label":`Look area`}),(0,$.jsx)(`button`,{className:`touch-fire`,"data-fire":!0,"aria-label":`Fire`,children:`FIRE`}),(0,$.jsx)(`button`,{className:`touch-ads`,"data-ads":!0,"aria-label":`Aim down sights`,children:`ADS`}),(0,$.jsx)(`button`,{className:`touch-jump`,"data-jump":!0,"aria-label":`Jump`,children:`↑`}),(0,$.jsx)(`button`,{className:`touch-reload`,"data-reload":!0,"aria-label":`Reload`,children:`R`})]})]})}export{Bd as default};