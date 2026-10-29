// Cached photographic spaghetti sculptures. Each coloured part is filled with
// the generated food photographs; the contours are individual shaded noodles.
export function buildSprites(materials) {
  const SIZE = 512, TAU = Math.PI * 2;
  const colours = [
    ['#95601d','#ffe8a0'],['#51321a','#efc783'],['#9c8050','#fff2c8'],
    ['#264017','#bcc77b'],['#2d5b77','#badbef'],['#b6a57d','#fff9d9'],
    ['#621e14','#f7a08a'],['#12314b','#8eb9e4'],['#9a6c28','#ffe9aa'],['#131710','#9a9c82']
  ];
  const canvases = [];
  let canvas, c, pats;
  function begin() {
    canvas = document.createElement('canvas'); canvas.width = canvas.height = SIZE;
    c = canvas.getContext('2d'); c.lineCap='round'; c.lineJoin='round';
    pats = materials.map((m,i) => {
      const p = c.createPattern(m,'repeat');
      const s = i<6 ? .37 : .32;
      if (p && p.setTransform) p.setTransform(new DOMMatrix().scale(s));
      return p;
    });
  }
  function path(d) { return typeof d === 'string' ? new Path2D(d) : d; }
  function photo(d, mat, shade=.27) {
    const p=path(d);c.save();
    c.shadowColor='rgba(35,24,10,.30)';c.shadowBlur=8;c.shadowOffsetX=3;c.shadowOffsetY=5;
    c.fillStyle=pats[mat]||colours[mat][0];c.fill(p);c.shadowColor='transparent';
    c.clip(p);
    const g=c.createLinearGradient(100,50,390,470);
    g.addColorStop(0,'rgba(255,247,205,.10)');g.addColorStop(.42,'rgba(255,255,255,0)');g.addColorStop(1,`rgba(25,20,5,${shade})`);
    c.fillStyle=g;c.fillRect(0,0,SIZE,SIZE);c.restore();
  }
  function strand(d, mat=0, w=8, opacity=1) {
    const p=path(d);c.save();c.globalAlpha=opacity;c.lineCap='round';c.lineJoin='round';
    c.shadowColor='rgba(18,16,5,.35)';c.shadowBlur=w*.3;c.shadowOffsetX=w*.14;c.shadowOffsetY=w*.22;
    c.lineWidth=w+2;c.strokeStyle=colours[mat][0];c.stroke(p);
    c.shadowColor='transparent';c.lineWidth=w;c.strokeStyle=pats[mat]||colours[mat][1];c.stroke(p);
    c.translate(-w*.16,-w*.18);c.lineWidth=w*.22;c.strokeStyle=colours[mat][1];c.globalAlpha=opacity*.65;c.stroke(p);c.restore();
  }
  function oval(x,y,rx,ry,mat,rotate=0) {
    const p=new Path2D();p.ellipse(x,y,rx,ry,rotate,0,TAU);photo(p,mat);return p;
  }
  function loop(x,y,rx,ry,mat=0,w=7,angle=0) {
    const p=new Path2D();p.ellipse(x,y,rx,ry,angle,0,TAU);strand(p,mat,w);return p;
  }
  function curls(clip,mat,cx,cy,rx,ry,count=12) {
    c.save();c.clip(path(clip));
    for(let j=0;j<count;j++){
      const a=j*2.39996323, r=.25+.75*Math.sqrt((j+.5)/count);
      const x=cx+Math.cos(a)*rx*r,y=cy+Math.sin(a)*ry*r;
      const p=new Path2D();p.moveTo(x-15,y+5);p.bezierCurveTo(x-25,y-18,x+20,y-20,x+18,y+3);p.bezierCurveTo(x+17,y+24,x-6,y+20,x-3,y+5);
      strand(p,mat,4.4,.7);
    }c.restore();
  }
  function eye(x,y,rx=16,ry=24) {
    oval(x,y,rx,ry,5);loop(x,y,rx-2,ry-2,5,4);
    oval(x+4,y+1,rx*.35,ry*.68,9);strand(`M ${x+3} ${y-ry*.42} Q ${x} ${y} ${x+4} ${y+ry*.46}`,9,4);
  }
  function finish() {
    const d=c.getImageData(0,0,SIZE,SIZE).data;let l=SIZE,t=SIZE,r=0,b=0;
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(d[(y*SIZE+x)*4+3]>14){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}
    l=Math.max(0,l-2);t=Math.max(0,t-2);r=Math.min(SIZE-1,r+2);b=Math.min(SIZE-1,b+2);
    const out=document.createElement('canvas');out.width=r-l+1;out.height=b-t+1;out.getContext('2d').drawImage(canvas,l,t,out.width,out.height,0,0,out.width,out.height);canvases.push(out);
  }

  // Both plumbers share the same sculpture. Only clothing and the cap
  // initial change; faces, hair and hands keep their photographic materials.
  function plumber(shirtMaterial, overallMaterial, initial) {
  begin();
  const backLeg='M 192 353 C 159 363 157 409 137 431 C 127 451 149 466 171 460 L 227 403 L 246 365 Z';
  const frontLeg='M 262 358 C 278 365 280 398 285 434 C 288 457 323 460 336 442 L 332 383 L 307 352 Z';
  photo(backLeg,overallMaterial);photo(frontLeg,overallMaterial);
  photo('M 138 422 C 112 422 97 438 99 455 C 99 476 146 480 180 465 L 190 447 C 177 434 158 427 138 422 Z',9);
  photo('M 287 427 C 281 439 282 463 300 469 L 367 470 C 392 462 382 443 359 439 L 328 428 Z',9);
  strand('M 107 458 Q 139 472 177 455',9,8);strand('M 294 458 Q 330 468 373 459',9,8);
  const torso='M 190 249 C 155 263 150 305 160 345 Q 172 381 215 385 L 294 379 Q 328 362 326 309 L 308 266 L 257 247 Z';
  photo(torso,shirtMaterial);curls(torso,shirtMaterial,235,311,70,60,17);
  const rearArm='M 170 268 C 145 268 128 291 117 320 C 112 339 134 358 155 344 L 195 300 Z';
  photo(rearArm,shirtMaterial);strand('M 163 282 Q 137 301 133 330',shirtMaterial,8);
  oval(125,347,27,28,8,-.35);loop(125,347,19,20,8,6);strand('M 110 351 Q 126 366 138 350',8,5);
  const bib='M 189 270 L 208 265 L 219 313 L 285 312 L 291 265 L 312 271 L 316 323 Q 337 353 312 385 Q 266 405 202 388 Q 174 366 186 333 Z';
  photo(bib,overallMaterial);strand('M 202 275 Q 207 304 209 325 L 294 324 Q 301 296 301 276',overallMaterial,9);
  strand('M 195 359 Q 246 378 312 358',overallMaterial,6);curls(bib,overallMaterial,252,355,57,35,13);
  loop(214,324,7,8,0,5);loop(292,324,7,8,0,5);
  const frontArm='M 307 274 Q 341 283 346 313 L 370 325 Q 384 344 366 357 Q 349 364 333 344 L 305 324 Z';
  photo(frontArm,shirtMaterial);strand('M 322 288 Q 337 314 351 332',shirtMaterial,9);
  oval(377,341,28,26,8,.38);loop(377,341,20,18,8,6);strand('M 364 346 Q 375 354 390 344',8,5);
  const head='M 215 119 C 184 138 180 189 196 223 Q 213 256 248 265 L 291 261 Q 322 247 326 224 L 357 217 Q 379 202 356 185 L 333 180 L 332 144 L 283 116 Z';
  photo(head,8);curls(head,8,247,185,53,47,11);
  photo('M 202 128 Q 175 141 185 188 L 202 206 L 224 181 L 224 143 Z',9);
  oval(220,195,25,30,8);loop(217,195,15,20,8,7);
  strand('M 221 185 Q 204 193 220 208',8,5);
  eye(313,169,11,18);
  const nose='M 325 179 Q 363 170 379 189 Q 390 210 364 222 Q 338 229 322 210 Z';photo(nose,8);strand('M 331 187 Q 354 179 370 193',8,7);
  const moustache='M 260 216 Q 274 202 286 215 Q 302 204 314 217 Q 329 205 339 217 L 345 233 Q 329 247 314 234 Q 298 248 284 236 Q 268 243 256 231 Z';photo(moustache,9);
  for(let k=0;k<6;k++)strand(`M ${266+k*12} 215 Q ${267+k*12} 233 ${276+k*12} 232`,9,7);
  const cap='M 181 134 C 161 104 180 66 213 51 Q 263 28 304 57 Q 326 74 329 112 L 365 123 Q 382 137 364 146 L 315 151 Q 266 136 213 144 Z';
  photo(cap,shirtMaterial);curls(cap,shirtMaterial,251,93,66,32,13);strand('M 185 129 Q 241 110 310 130 Q 343 142 367 134',shirtMaterial,11);
  strand('M 194 105 Q 206 64 249 57 Q 288 50 310 85',shirtMaterial,6);
  oval(265,87,25,24,5);loop(265,87,22,21,5,5);
  strand(initial === 'L' ? 'M 254 77 L 254 98 L 277 98' : 'M 251 98 L 251 77 L 265 91 L 278 77 L 278 98',shirtMaterial,4.5);
  finish();
  }

  // 0 — red-capped, moustached plumber. Facing right.
  plumber(6,7,'M');

  // 1 — the brown mushroom creature.
  begin();
  photo('M 133 358 Q 92 351 66 387 Q 39 428 85 444 Q 131 456 184 426 L 205 386 Z',9);
  photo('M 334 357 Q 379 349 419 382 Q 463 423 423 443 Q 375 460 317 426 L 297 387 Z',9);
  strand('M 75 421 Q 115 443 169 414',9,10);strand('M 339 414 Q 394 446 430 423',9,10);
  const lower='M 168 269 Q 133 323 157 386 Q 183 424 257 420 Q 331 424 360 382 Q 373 332 341 280 Z';
  photo(lower,8);curls(lower,8,257,351,85,57,22);
  const capG='M 59 298 C 86 240 108 124 174 82 Q 251 39 327 81 C 397 122 419 236 453 293 Q 459 327 418 342 Q 353 346 318 322 Q 248 305 193 325 Q 138 351 81 334 Q 49 325 59 298 Z';
  photo(capG,1);curls(capG,1,254,211,162,110,46);
  strand('M 64 309 Q 100 332 160 317 Q 253 290 335 318 Q 398 337 444 311',1,14);
  strand('M 107 219 Q 127 131 187 97 Q 252 67 316 98 Q 370 130 394 212',1,7,.7);
  eye(194,256,34,51);eye(319,256,34,51);
  strand('M 145 208 Q 181 211 217 232',9,15);strand('M 299 232 Q 333 208 366 209',9,15);
  strand('M 219 352 Q 256 334 293 353',9,7);
  finish();

  // Shared turtle sculpture. Only the shell changes material; the head,
  // limbs and feet retain their natural golden spaghetti colour.
  function turtle(shellMaterial) {
  begin();
  const shell='M 253 111 Q 347 55 418 132 Q 464 184 454 284 Q 449 352 382 382 L 264 365 Q 221 312 220 241 Q 219 159 253 111 Z';
  photo(shell,shellMaterial);curls(shell,shellMaterial,340,237,92,133,45);
  for(let k=0;k<5;k++)strand(`M ${252+k*10} ${130+k*8} C ${330+k*7} ${79+k*13} ${450-k*8} ${154+k*4} ${423-k*10} ${293-k*3} Q ${405-k*6} ${351-k*7} ${352-k*7} ${351-k*7}`,shellMaterial,8,.8);
  strand('M 264 118 Q 232 190 245 285 Q 255 350 308 374',5,16);
  const body='M 174 198 Q 229 194 261 231 L 285 298 Q 299 364 256 392 Q 198 418 162 376 L 146 306 Z';
  photo(body,8);curls(body,8,215,302,57,76,22);
  const arm='M 190 254 Q 146 245 118 273 Q 100 293 126 310 Q 154 319 190 300 Z';photo(arm,8);strand('M 131 283 Q 155 268 181 277',8,8);
  const neck='M 157 142 Q 137 193 153 249 Q 167 269 190 247 L 210 171 Z';photo(neck,8);strand('M 169 160 Q 158 209 172 239',8,8);
  const headK='M 89 102 Q 72 116 67 143 L 43 161 Q 28 184 54 201 L 128 213 Q 179 211 192 174 Q 207 128 171 98 Q 124 78 89 102 Z';
  photo(headK,8);curls(headK,8,126,153,57,40,14);strand('M 47 180 Q 80 199 124 187',8,7);
  eye(116,119,19,31);eye(153,122,16,28);
  const footA='M 177 362 Q 148 376 117 405 Q 97 436 131 448 Q 163 462 218 428 L 231 392 Z';photo(footA,8);strand('M 124 432 Q 163 444 206 415',8,9);
  const footB='M 270 358 Q 298 378 332 399 Q 352 414 338 435 Q 315 452 273 427 L 238 388 Z';photo(footB,8);strand('M 278 405 Q 314 436 337 418',8,8);
  finish();
  }

  // 2 — green-shell turtle, facing left.
  turtle(3);

  // 3 — coin formed from nested individual golden strands.
  begin();
  for(let k=0;k<7;k++)loop(256,256,128-k*12,195-k*12,0,12.5);
  strand('M 250 146 Q 236 255 250 363',0,13);strand('M 270 144 Q 257 253 269 364',0,10);
  finish();

  // 4 — red mushroom with cream spaghetti spots.
  begin();
  const stem='M 176 265 Q 155 311 159 394 Q 165 439 255 444 Q 343 440 353 393 L 333 269 Z';
  photo(stem,5);curls(stem,5,255,362,80,62,22);
  const mush='M 58 272 C 59 178 127 68 251 55 C 380 60 452 174 458 268 Q 455 312 407 319 Q 251 340 102 318 Q 61 313 58 272 Z';
  photo(mush,6);curls(mush,6,254,209,166,104,44);
  oval(249,139,62,61,5,.04);loop(249,139,50,50,5,8);
  oval(115,250,41,47,5,-.38);loop(115,250,31,36,5,8,-.38);
  oval(393,244,43,49,5,.37);loop(393,244,32,38,5,8,.37);
  strand('M 64 286 Q 97 314 154 311 Q 263 330 404 308 Q 439 302 451 282',6,12);
  strand('M 230 359 Q 224 377 230 397',9,11);strand('M 283 359 Q 277 379 283 398',9,11);
  finish();

  // 5 — concentric noodle flower.
  begin();
  strand('M 255 244 Q 246 332 258 437',3,24);
  const leafL='M 253 378 Q 171 388 117 323 Q 188 293 246 348 Z';
  const leafR='M 258 380 Q 343 380 396 314 Q 328 298 266 347 Z';
  photo(leafL,3);photo(leafR,3);
  strand('M 133 328 Q 193 331 245 370',3,9);strand('M 272 366 Q 326 331 381 320',3,9);
  for(let k=0;k<5;k++)loop(256,177,148-k*12,110-k*10,k<2?6:k<4?5:8,14);
  oval(256,178,82,57,8);curls('M 174 121 L 338 121 L 338 235 L 174 235 Z',8,256,178,70,43,15);
  loop(256,177,81,57,8,10);strand('M 232 163 L 232 191',9,10);strand('M 278 163 L 278 191',9,10);
  finish();

  // 6 — star-shaped bundle, with coiled edges.
  begin();
  const star='M 255 34 Q 269 25 280 59 L 324 169 L 449 177 Q 487 179 459 204 L 365 282 L 399 408 Q 409 446 376 425 L 255 354 L 135 425 Q 102 445 112 408 L 147 282 L 51 205 Q 25 180 63 177 L 188 169 L 231 58 Q 242 28 255 34 Z';
  photo(star,0);curls(star,0,256,253,178,188,60);
  strand('M 256 47 L 316 180 L 452 190 L 352 278 L 384 413 L 256 340 L 127 413 L 161 279 L 61 192 L 197 180 Z',0,12);
  strand('M 256 78 L 306 191 L 419 200 L 340 274 L 365 386 L 256 326 L 149 386 L 174 274 L 94 202 L 207 192 Z',0,8);
  strand('M 229 226 Q 222 250 229 277',9,13);strand('M 282 226 Q 276 250 282 277',9,13);
  finish();

  // 7 — a dense ball of curled cooked noodles.
  begin();
  const ball=oval(256,256,192,185,5);curls(ball,0,256,256,176,168,82);
  c.save();c.clip(ball);
  for(let j=0;j<15;j++){
    const a=j*2.39,xx=256+Math.cos(a)*130,yy=256+Math.sin(a)*124;
    loop(xx,yy,41+j%3*6,30+j%4*6,j%3===0?5:0,8,j*.6);
  }c.restore();
  loop(256,256,187,180,0,9);finish();

  // 8 — a pipe plant: spinach-spaghetti jaws, pale noodle teeth and a
  // braided green stem. The open mouth is itself dark spaghetti.
  begin();
  const plantStem='M 238 223 C 227 287 243 331 233 381 Q 223 423 235 474 L 279 474 Q 265 423 282 380 C 295 325 272 280 279 223 Z';
  photo(plantStem,3);curls(plantStem,3,258,352,23,113,18);
  for(let k=0;k<5;k++)strand(`M ${242+k*7} 239 C ${231+k*7} 307 ${251+k*6} 341 ${239+k*7} 393 Q ${232+k*7} 438 ${244+k*6} 472`,3,8,.9);
  const plantLeafL='M 247 371 Q 187 377 146 337 Q 123 316 117 286 Q 180 286 218 321 Q 239 342 247 371 Z';
  const plantLeafR='M 269 403 Q 333 405 375 364 Q 399 340 400 309 Q 338 312 299 348 Q 279 369 269 403 Z';
  photo(plantLeafL,3);photo(plantLeafR,3);
  curls(plantLeafL,3,185,330,55,35,12);curls(plantLeafR,3,339,358,56,35,12);
  strand('M 128 296 Q 169 326 237 365',3,10);
  strand('M 390 319 Q 341 360 280 395',3,10);
  strand('M 154 309 Q 167 340 210 350',3,5);
  strand('M 374 332 Q 355 369 315 379',3,5);
  const plantMouth='M 150 68 Q 204 32 260 54 Q 319 31 373 70 L 372 184 Q 353 259 263 282 Q 169 265 139 190 Z';
  photo(plantMouth,9,.4);curls(plantMouth,9,257,173,90,90,29);
  const jawL='M 248 275 C 169 276 118 226 113 165 Q 108 108 149 66 Q 164 51 178 53 L 236 147 L 263 196 Q 228 185 191 184 Q 206 219 250 231 Z';
  const jawR='M 264 275 C 343 275 394 226 399 164 Q 404 108 363 66 Q 348 51 334 53 L 276 147 L 250 196 Q 284 185 321 184 Q 306 219 262 231 Z';
  photo(jawL,3);photo(jawR,3);
  curls(jawL,3,179,174,55,96,25);curls(jawR,3,333,174,55,96,25);
  strand('M 174 60 Q 192 103 219 142 L 251 188 Q 218 179 188 181',5,13);
  strand('M 338 60 Q 320 103 293 142 L 261 188 Q 294 179 324 181',5,13);
  strand('M 151 72 Q 119 113 123 164 Q 129 224 183 250 Q 220 269 249 264',3,10);
  strand('M 361 72 Q 393 113 389 164 Q 383 224 329 250 Q 292 269 263 264',3,10);
  // Teeth are folded strands, with a visible round cross-section.
  for(let k=0;k<4;k++){
    const xx=190+k*16, yy=96+k*25;
    strand(`M ${xx-5} ${yy-9} Q ${xx+24} ${yy-8} ${xx+11} ${yy+14} Q ${xx+5} ${yy+11} ${xx+1} ${yy+2}`,5,7);
    const xr=512-xx;
    strand(`M ${xr+5} ${yy-9} Q ${xr-24} ${yy-8} ${xr-11} ${yy+14} Q ${xr-5} ${yy+11} ${xr-1} ${yy+2}`,5,7);
  }
  // Cream pasta coils make the familiar markings on both green jaws.
  for(const [xx,yy,rx,ry] of [[145,147,14,19],[164,213,17,14],[189,93,9,13],[218,251,15,9],[367,147,14,19],[348,213,17,14],[323,93,9,13],[294,251,15,9]]){
    loop(xx,yy,rx,ry,5,8);loop(xx,yy,rx*.48,ry*.48,5,5);
  }
  loop(257,260,30,13,3,9);finish();

  // 9 — red-shell variant, cached separately to avoid recolouring its body.
  turtle(6);

  // 10 — green-capped second player with pale spaghetti overalls.
  plumber(3,5,'L');

  // Bowser is a stacked food sculpture, facing left. The shell, muzzle,
  // horns, teeth and cuffs are all separate photographed noodle bundles.
  function bowser(open=false) {
    begin();
    const tail='M 367 330 Q 430 345 465 303 Q 469 374 414 394 L 355 376 Z';
    photo(tail,8);strand('M 381 356 Q 433 375 457 323',8,10);
    const shell='M 295 118 C 358 63 444 110 471 194 Q 500 272 444 355 Q 408 397 329 372 L 262 305 L 259 197 Z';
    photo(shell,3);curls(shell,3,371,247,103,128,52);
    for(let k=0;k<5;k++)strand(`M ${291+k*9} ${139+k*5} C ${361+k*7} ${83+k*10} ${458-k*5} ${145+k*6} ${445-k*9} ${274-k*4} Q ${428-k*8} ${347-k*7} ${360-k*9} ${358-k*7}`,3,8,.9);
    strand('M 299 120 C 258 159 256 254 285 311 Q 318 366 383 378 Q 430 371 453 331',5,17);
    function spike(x,y,dx,dy,w=20) {
      const q=`M ${x-w} ${y+8} Q ${x-8} ${y-8} ${x+dx} ${y+dy} Q ${x+14} ${y-7} ${x+w} ${y+8} Q ${x} ${y+23} ${x-w} ${y+8} Z`;
      photo(q,5);strand(`M ${x-w+5} ${y+8} Q ${x-5} ${y-9} ${x+dx} ${y+dy} Q ${x+7} ${y-7} ${x+w-5} ${y+8}`,5,6);loop(x,y+9,w*.85,10,5,6);
    }
    spike(333,124,-8,-58,19);spike(389,139,15,-55,20);spike(445,191,39,-28,18);spike(454,257,42,3,19);spike(426,324,30,30,17);
    const rearLeg='M 313 350 Q 361 343 383 380 L 401 418 Q 423 439 403 458 Q 367 476 327 449 L 286 400 Z';
    photo(rearLeg,8);curls(rearLeg,8,345,407,49,45,13);
    const body='M 209 186 Q 250 176 287 202 Q 322 241 339 305 Q 359 362 325 405 Q 277 435 211 410 Q 169 390 163 334 L 171 242 Z';
    photo(body,8);curls(body,8,248,305,76,111,33);
    const belly='M 192 231 Q 228 217 263 238 Q 302 281 308 347 Q 308 395 270 410 Q 223 416 190 384 Q 169 329 176 279 Z';
    photo(belly,5);for(let k=0;k<6;k++)strand(`M ${182-k*.4} ${265+k*23} Q ${229+k*2} ${281+k*23} ${279+k*5} ${267+k*23}`,0,9,.82);
    const backArm='M 289 244 Q 330 220 353 253 Q 372 276 354 305 Q 337 330 306 312 L 270 286 Z';
    photo(backArm,8);curls(backArm,8,322,272,41,33,12);
    loop(337,292,29,18,9,14,-.55);loop(337,292,30,18,9,5,-.55);
    for(const [x,y]of[[349,280],[343,296],[330,306]])spike(x,y,7,-16,7);
    const frontLeg='M 187 358 Q 225 351 249 381 L 239 421 Q 230 450 186 465 Q 143 478 117 458 Q 98 444 116 426 L 153 403 Z';
    photo(frontLeg,8);curls(frontLeg,8,185,420,53,43,17);strand('M 126 445 Q 166 460 212 430',8,10);
    for(const [x,y]of[[127,450],[153,458],[181,454],[349,451],[375,454],[400,444]]){
      photo(`M ${x-9} ${y-8} Q ${x-13} ${y+10} ${x-23} ${y+16} Q ${x+3} ${y+20} ${x+8} ${y+1} Z`,5);
      strand(`M ${x-6} ${y-5} Q ${x-5} ${y+10} ${x-18} ${y+15}`,5,5);
    }
    // Spaghetti hair and paired curved horn bundles behind the head.
    for(let k=0;k<5;k++)strand(`M ${205+k*13} ${154-k*5} Q ${184+k*16} ${105-k*7} ${213+k*14} ${67+k*5} Q ${220+k*16} ${114-k*2} ${247+k*11} ${149+k*4}`,6,13);
    const hornL='M 130 130 Q 98 93 123 47 Q 131 83 164 94 L 177 131 Z';
    const hornR='M 222 127 Q 248 82 226 37 Q 213 79 184 95 L 184 137 Z';
    photo(hornL,5);photo(hornR,5);
    for(let k=0;k<4;k++){strand(`M ${139+k*6} 122 Q ${110+k*7} ${86+k*2} 123 51`,5,6);strand(`M ${216-k*6} 121 Q ${241-k*8} ${79+k*3} 226 42`,5,6);}
    const head='M 110 118 Q 137 91 185 101 Q 232 107 246 157 L 236 214 Q 210 250 150 251 L 97 222 L 85 173 Z';
    photo(head,8);curls(head,8,166,173,68,61,27);
    // Heavy brow is red spaghetti; pupils are black spaghetti coils.
    oval(137,145,20,28,5);oval(184,145,18,27,5);
    oval(129,148,8,18,9);oval(176,148,7,18,9);
    strand('M 104 121 Q 133 117 153 139',6,15);strand('M 168 139 Q 190 119 215 126',6,15);
    const mouthY=open?244:228,lower=open?300:271;
    const mouth=`M 53 205 Q 93 198 137 211 L 185 226 Q 192 ${lower-12} 151 ${lower} L 72 ${lower-9} Q 45 ${lower-15} 44 ${mouthY} Z`;
    photo(mouth,9,.4);curls(mouth,9,111,(mouthY+lower)/2,57,(lower-mouthY)/2,15);
    const muzzle='M 93 172 Q 62 165 43 187 L 23 206 Q 18 224 47 234 L 128 239 Q 163 234 164 212 Q 158 180 128 176 Z';
    photo(muzzle,8);curls(muzzle,8,91,207,59,23,15);strand('M 30 213 Q 75 230 137 219',8,9);
    oval(62,190,6,4,9,-.1);oval(101,184,6,4,9,-.05);
    const jaw=`M 55 ${lower-14} Q 110 ${lower+3} 170 ${lower-20} Q 175 ${lower+9} 144 ${lower+15} L 85 ${lower+12} Q 58 ${lower+5} 55 ${lower-14} Z`;
    photo(jaw,8);strand(`M 63 ${lower-2} Q 111 ${lower+12} 158 ${lower-5}`,8,9);
    for(const [x,y,d]of[[66,234,open?21:15],[99,238,open?23:15],[132,236,open?18:12]]){
      photo(`M ${x-7} ${y-4} L ${x+7} ${y-4} Q ${x+8} ${y+8} ${x-3} ${y+d} Z`,5);strand(`M ${x-3} ${y} L ${x-2} ${y+d-3}`,5,4);
    }
    if(open){strand(`M 85 ${lower-6} Q 113 ${lower-27} 141 ${lower-7}`,6,11);for(const x of[74,151])strand(`M ${x} ${lower+1} Q ${x-7} ${lower-15} ${x+2} ${lower-22}`,5,7);}
    // The near arm frames the belly without obscuring the open mouth.
    const nearArm='M 191 286 Q 160 275 139 295 L 118 322 Q 98 329 91 346 Q 89 368 117 381 Q 144 389 163 368 L 207 331 Z';
    photo(nearArm,8);curls(nearArm,8,151,330,46,38,15);strand('M 189 299 Q 164 309 148 335',8,10);
    loop(137,340,28,18,9,14,-.55);for(const [x,y]of[[116,333],[132,350],[150,354]])spike(x,y,-3,-15,7);
    for(let k=0;k<3;k++)strand(`M ${99+k*14} ${362+k*3} Q ${86+k*14} ${373+k*3} ${91+k*14} ${384+k*3}`,5,7);
    finish();
  }

  // 11 — Bowser, closed jaw; 15 below is the matching open-jaw pose.
  bowser(false);

  // 12 — the mushroom retainer, with a food-photo cap and noodle vest.
  begin();
  photo('M 164 361 Q 138 391 112 418 Q 97 442 122 457 Q 155 475 215 450 L 229 408 Z',9);
  photo('M 295 375 Q 336 386 380 420 Q 411 446 382 461 Q 348 479 292 448 L 273 411 Z',9);
  const toadBody='M 185 294 Q 250 274 317 298 L 343 373 Q 343 415 307 434 Q 257 448 200 430 Q 168 410 167 369 Z';
  photo(toadBody,5);curls(toadBody,5,255,365,75,63,23);
  photo('M 189 295 Q 206 289 220 292 L 213 374 Q 194 400 176 389 L 168 342 Z',7);
  photo('M 291 293 Q 315 288 328 309 L 342 369 Q 345 395 318 391 L 292 368 Z',7);
  strand('M 214 298 Q 204 342 205 379',0,8);strand('M 294 297 Q 301 342 312 383',0,8);
  oval(147,350,31,30,8,-.4);loop(147,350,22,21,8,7);oval(362,349,31,30,8,.4);loop(362,349,22,21,8,7);
  const toadHead='M 164 199 Q 246 176 334 203 L 339 261 Q 333 314 259 329 Q 190 325 170 281 Z';
  photo(toadHead,8);curls(toadHead,8,252,262,72,52,22);
  const toadCap='M 63 202 C 53 123 120 51 251 42 C 380 45 449 118 452 202 Q 446 245 393 250 Q 250 266 112 247 Q 65 240 63 202 Z';
  photo(toadCap,5);curls(toadCap,5,255,152,162,96,39);
  oval(254,123,66,63,6);loop(254,123,55,52,6,9);oval(104,199,34,43,6,-.35);loop(104,199,26,33,6,7,-.35);oval(405,197,32,43,6,.35);loop(405,197,24,33,6,7,.35);
  strand('M 69 219 Q 114 251 252 251 Q 390 251 447 219',5,11);
  strand('M 223 268 Q 218 282 223 295',9,10);strand('M 282 268 Q 277 282 282 295',9,10);
  strand('M 240 310 Q 253 318 267 308',9,5);finish();

  // 13 — axe-shaped coil. Even the cutting edge is folded pale spaghetti.
  begin();
  for(let k=0;k<6;k++)strand(`M ${216+k*9} 469 Q ${203+k*9} 324 ${223+k*9} 153 Q ${228+k*8} 98 ${218+k*9} 54`,k%2?0:1,12);
  const axeHead='M 240 87 Q 316 79 376 39 Q 435 116 428 195 Q 381 268 292 248 L 238 215 Z';
  photo(axeHead,5);curls(axeHead,5,332,153,85,89,31);
  for(let k=0;k<6;k++)strand(`M ${251+k*8} ${103+k*15} Q ${330+k*6} ${100+k*15} ${379+k*5} ${60+k*21}`,5,10);
  strand('M 376 45 Q 425 112 422 187 Q 378 258 295 242',5,14);
  loop(252,164,38,33,0,10);loop(252,164,23,20,0,8);
  strand('M 218 160 Q 254 136 284 159 Q 266 185 223 177',1,8);finish();

  // 14 — hot noodle coil. Its glow is lighting, not a flame-shaped surface.
  begin();
  const hot=oval(256,256,193,190,6);curls(hot,6,256,256,175,174,61);
  for(let k=0;k<8;k++)loop(256,256,183-k*18,180-k*18,k%3===0?6:k%3===1?0:5,13,k*.21);
  for(let k=0;k<10;k++){const a=k*2.4;loop(256+Math.cos(a)*118,256+Math.sin(a)*111,28,23,k%2?0:6,10,a);}
  loop(256,256,31,29,5,12);finish();

  // 15 — Bowser's breathing pose uses the same silhouette and materials.
  bowser(true);

  // The new material palettes are installed only after the original sixteen
  // sculptures are complete. Existing actor pixels and texture scales stay intact.
  colours[21]=['#082c41','#95dbe5'];
  colours[22]=['#b67361','#fff3dc'];
  colours[23]=['#91561b','#fff2b0'];
  colours[24]=['#465d70','#e7f3f6'];

  // 16 — a pale spaghetti Blooper. Separate animated tentacles are added by
  // the aquatic renderer; the photographed hood and eye folds remain crisp.
  begin();
  const blooperHood='M 253 37 C 224 48 197 103 163 152 Q 135 192 112 224 Q 91 250 114 278 Q 146 301 182 286 L 186 333 Q 216 360 251 347 Q 286 363 323 335 L 328 288 Q 367 303 397 276 Q 418 253 398 225 Q 368 189 343 150 C 310 99 287 49 264 37 Q 259 33 253 37 Z';
  photo(blooperHood,5,.21);curls(blooperHood,5,256,198,135,126,44);
  for(let k=0;k<5;k++)strand(`M ${249+(k-2)*7} ${50+k*2} C ${239+(k-2)*15} 107 ${208+(k-2)*24} 175 ${157+(k-2)*14} 253`,5,9,.8);
  for(let k=0;k<5;k++)strand(`M ${263+(k-2)*7} ${49+k*2} C ${276+(k-2)*15} 110 ${306+(k-2)*24} 177 ${357+(k-2)*14} 253`,5,9,.8);
  const eyeFold='M 153 232 Q 202 211 256 226 Q 308 210 363 234 L 345 271 Q 303 296 256 278 Q 209 296 167 271 Z';
  photo(eyeFold,9,.18);strand('M 162 235 Q 208 220 255 236 Q 303 220 354 236',5,11);
  eye(218,253,22,29);eye(294,253,22,29);
  strand('M 166 280 Q 202 302 256 291 Q 307 302 345 280',5,13);
  for(let k=0;k<6;k++){
    const x=182+k*29,side=k<3?-1:1;
    strand(`M ${x} 318 C ${x+side*12} 350 ${x-side*14} 370 ${x+side*6} 398 Q ${x+side*25} 424 ${x+side*35} 401`,5,15-k%2*2);
    strand(`M ${x+4} 326 C ${x+side*15} 352 ${x-side*8} 373 ${x+side*10} 393`,22,4,.55);
  }
  finish();

  // Both Cheep Cheep sculptures face left. Body colour changes, while the
  // curled lips, pale belly, photographed fins and black noodle pupils agree.
  function cheepCheep(bodyMaterial){
    begin();
    const tail='M 353 217 Q 400 164 453 151 Q 442 205 463 237 Q 448 255 461 298 Q 412 303 355 269 Z';
    photo(tail,22,.25);
    for(let k=0;k<5;k++)strand(`M 358 244 Q ${405+k*4} ${196+k*21} ${450-k*2} ${164+k*31}`,5,9,.85);
    const dorsal='M 218 147 Q 232 86 266 62 Q 277 114 310 129 Q 331 119 341 103 Q 347 150 327 176 Z';
    photo(dorsal,22,.22);strand('M 225 150 Q 244 105 264 75 Q 275 128 314 143 Q 330 141 337 123',5,10);
    for(let k=0;k<5;k++)strand(`M ${240+k*18} 158 Q ${250+k*18} ${120+k*4} ${265+k*15} ${91+k*10}`,22,7);
    const body='M 99 199 Q 123 132 203 119 C 283 96 355 145 378 220 Q 403 300 349 357 Q 305 404 224 402 Q 142 400 109 340 Q 79 280 99 199 Z';
    photo(body,bodyMaterial,.26);curls(body,bodyMaterial,238,255,135,132,46);
    for(let k=0;k<5;k++)strand(`M ${155+k*12} ${146+k*4} C ${249+k*14} ${112+k*8} ${362-k*4} ${171+k*15} ${363-k*8} ${261+k*13} Q ${351-k*8} ${350-k*2} ${277-k*7} ${377-k*7}`,bodyMaterial,8,.75);
    const belly='M 115 250 Q 136 293 193 316 Q 248 341 314 327 Q 339 327 351 339 Q 319 397 244 407 Q 161 416 123 361 Q 99 327 101 281 Z';
    photo(belly,5,.20);curls(belly,5,228,361,106,41,22);strand('M 116 277 Q 177 352 305 343 Q 328 340 341 346',5,10);
    const nearFin='M 263 246 Q 304 222 337 251 Q 305 274 308 308 Q 270 302 247 275 Z';
    photo(nearFin,22,.18);strand('M 256 260 Q 295 248 325 252',5,10);strand('M 260 270 Q 287 276 300 299',5,9);
    const lowerFin='M 222 390 Q 248 427 297 440 Q 286 412 291 385 Z';photo(lowerFin,22,.20);strand('M 228 397 Q 254 419 285 433',5,9);
    eye(153,208,32,45);strand('M 119 169 Q 149 146 179 171',5,11);
    const lip='M 93 244 Q 57 238 45 263 Q 28 291 54 311 Q 73 326 105 309 L 119 284 Q 105 263 93 244 Z';
    photo(lip,8,.19);loop(76,279,29,22,8,12);oval(76,279,18,11,9);loop(76,277,22,13,8,7);
    strand('M 119 316 Q 140 326 150 316',bodyMaterial,7);
    finish();
  }

  // 17 — red Cheep Cheep, shared by swimming and leaping fish.
  cheepCheep(6);
  // 18 — gray Cheep Cheep, with its own cool spaghetti body photograph.
  cheepCheep(24);

  // New palettes are installed after all nineteen retained sculptures. Their
  // existing geometry, texture scales and pixels are deliberately untouched.
  colours[25]=['#050d1d','#b4d5f3'];
  colours[26]=['#241c12','#c6a471'];
  colours[27]=['#776d53','#fff7d5'];
  colours[28]=['#152a06','#bdd586'];

  function hammerShape(cx,cy,scale=1,angle=0){
    c.save();c.translate(cx,cy);c.rotate(angle);c.scale(scale,scale);
    for(let k=0;k<4;k++)strand(`M ${-13+k*8} 130 Q ${-19+k*8} 42 ${-12+k*8} -45`,k%2?1:8,10);
    const head='M -91 -108 Q -98 -118 -84 -124 L 83 -124 Q 98 -120 96 -105 L 90 -50 Q 86 -38 72 -39 L -80 -39 Q -96 -43 -94 -58 Z';
    photo(head,26,.19);curls(head,26,0,-80,82,34,19);
    for(let k=0;k<6;k++)strand(`M ${-80+k*30} -113 Q ${-86+k*30} -81 ${-79+k*30} -48`,27,7,.85);
    strand('M -89 -108 Q -13 -116 86 -111',27,8);
    strand('M -89 -48 Q -5 -37 87 -47',26,8);
    loop(0,-54,24,14,8,8);c.restore();
  }

  // 19/20 — a helmeted Hammer Bro, facing left. The second sculpture lifts
  // the throwing arm, while the helmet, shell and feet keep their silhouette.
  function hammerBro(throwing=false){
    begin();
    const shell='M 279 179 Q 345 133 400 180 C 451 222 456 304 414 356 Q 382 395 326 380 L 273 327 L 263 245 Z';
    photo(shell,28,.25);curls(shell,28,352,274,78,94,35);
    for(let k=0;k<4;k++)strand(`M ${291+k*12} ${193+k*6} C ${352+k*10} ${156+k*10} ${427-k*5} ${208+k*10} ${418-k*11} ${290+k*10} Q ${405-k*10} ${356-k*5} ${350-k*8} ${366-k*5}`,28,9,.9);
    strand('M 290 183 Q 258 245 279 312 Q 300 362 349 382',27,16);
    const rearLeg='M 287 337 Q 326 333 345 364 L 355 405 Q 388 411 401 431 Q 412 454 385 464 L 307 464 Q 280 454 283 431 L 268 376 Z';
    photo(rearLeg,8);curls(rearLeg,8,328,407,48,49,17);
    photo('M 295 419 Q 348 405 383 428 Q 410 443 388 459 L 307 463 Q 285 451 295 419 Z',28,.19);
    strand('M 303 449 Q 340 458 391 446',27,8);
    const torso='M 194 216 Q 232 193 276 213 Q 309 247 315 304 Q 326 364 286 391 Q 240 413 190 388 Q 159 361 164 311 L 167 254 Z';
    photo(torso,8);curls(torso,8,240,307,68,89,29);
    const chest='M 192 241 Q 221 225 252 242 Q 284 274 288 335 Q 287 376 253 387 Q 215 394 188 366 Q 172 326 177 281 Z';
    photo(chest,27,.19);
    for(let k=0;k<5;k++)strand(`M ${181+k*.8} ${268+k*22} Q ${227+k*2} ${280+k*22} ${270+k*3} ${266+k*22}`,8,8,.85);
    const frontLeg='M 188 352 Q 224 342 246 372 L 230 415 Q 222 449 178 464 L 114 463 Q 91 451 106 431 L 147 409 Z';
    photo(frontLeg,8);curls(frontLeg,8,176,410,53,43,17);
    photo('M 117 424 Q 153 405 191 418 L 215 441 Q 202 463 170 469 L 112 466 Q 87 452 117 424 Z',28,.19);
    strand('M 112 450 Q 153 467 202 447',27,9);
    const neck='M 169 172 Q 158 200 173 249 Q 192 269 214 247 L 232 181 Z';
    photo(neck,8);strand('M 182 188 Q 176 222 192 248',8,8);
    const head='M 126 95 Q 103 112 101 147 L 70 164 Q 49 182 60 202 Q 75 222 122 224 L 165 216 Q 212 204 223 163 Q 234 120 202 96 Q 164 73 126 95 Z';
    photo(head,8);curls(head,8,141,164,69,48,24);
    strand('M 63 190 Q 92 211 140 198',8,9);oval(81,175,5,4,9);oval(104,168,5,4,9);
    eye(143,129,20,29);eye(183,132,17,27);
    const helmet='M 96 118 Q 81 88 104 59 Q 135 29 181 38 Q 232 42 250 84 L 257 121 Q 230 146 197 138 L 171 115 L 109 131 Z';
    photo(helmet,28,.22);curls(helmet,28,172,89,74,44,24);
    strand('M 99 117 Q 129 96 172 105 Q 211 134 249 117',27,13);
    strand('M 109 83 Q 136 43 177 49 Q 215 52 235 85',28,8);
    for(let k=0;k<5;k++)strand(`M ${130+k*21} ${52+k%2*5} Q ${119+k*24} ${77+k*3} ${128+k*22} ${103+k*4}`,28,8,.85);
    strand('M 210 135 Q 222 176 199 204',27,9);
    // Back arm and held hammer sit above the shell, leaving the face readable.
    if(throwing){
      const arm='M 284 232 Q 309 218 310 187 L 294 152 Q 291 130 312 123 Q 333 119 341 146 L 348 196 Q 346 244 311 267 Z';
      photo(arm,8);curls(arm,8,321,194,25,55,13);strand('M 299 244 Q 333 224 328 177 L 314 142',8,9);
      hammerShape(311,107,.64,-.35);oval(313,151,24,23,8);loop(313,151,17,16,8,7);
    }else{
      const arm='M 279 244 Q 313 218 338 242 L 359 277 Q 373 296 359 311 Q 338 324 321 305 L 292 283 Z';
      photo(arm,8);curls(arm,8,326,273,37,33,14);strand('M 294 251 Q 321 240 345 284',8,9);
      hammerShape(356,255,.64,-.22);oval(351,294,24,23,8);loop(351,294,17,16,8,7);
    }
    const armFront='M 184 262 Q 160 251 137 274 L 120 297 Q 105 309 115 328 Q 128 344 148 333 L 189 308 Z';
    photo(armFront,8);strand('M 177 273 Q 147 280 132 313',8,10);oval(123,322,24,23,8);loop(123,322,17,16,8,6);
    finish();
  }
  hammerBro(false);
  hammerBro(true);

  // 21 — an airborne hammer made from a dark noodle bundle tied to a handle.
  begin();hammerShape(256,231,1.65,.34);finish();

  // New sculptures are appended after all twenty-two retained actors. The
  // photographs, paths and pixel bounds above remain exactly as delivered.
  function spinyEggShape(cx,cy,r=1){
    c.save();c.translate(cx,cy);c.scale(r,r);
    // Each spine is a tapered bundle of pale spaghetti, with a folded strand
    // following its contour; there are no painted plastic spikes.
    for(let j=0;j<8;j++){
      const a=j*TAU/8-.16,dx=Math.cos(a),dy=Math.sin(a),nx=-dy,ny=dx;
      const ax=dx*111+nx*29,ay=dy*111+ny*29,bx=dx*111-nx*29,by=dy*111-ny*29;
      const tx=dx*184+nx*7,ty=dy*184+ny*7;
      for(let k=-2;k<=2;k++){
        const spread=k*10,reach=176-Math.abs(k)*12,tipX=dx*reach+nx*(k*2+5),tipY=dy*reach+ny*(k*2+5);
        strand(`M ${dx*106+nx*spread} ${dy*106+ny*spread} Q ${dx*142+nx*(spread*.64+8)} ${dy*142+ny*(spread*.64+8)} ${tipX} ${tipY}`,5,8-Math.abs(k)*.7);
      }
    }
    oval(0,0,132,130,6);loop(0,0,123,122,6,12);curls('M -131 0 A 131 130 0 1 0 131 0 A 131 130 0 1 0 -131 0',6,0,0,120,117,31);
    for(let k=0;k<4;k++){
      const a=k*TAU/4+.4,px=Math.cos(a)*74,py=Math.sin(a)*74;
      strand(`M ${px-20} ${py+18} Q ${px-28} ${py-24} ${px+3} ${py-31} Q ${px+22} ${py-7} ${px+13} ${py+23}`,5,12);
    }
    loop(-19,-11,67,82,6,8,-.35);c.restore();
  }

  function lakitu(throwing=false){
    begin();
    const shell='M 249 186 Q 294 143 348 178 Q 394 212 381 289 Q 371 331 321 345 L 264 317 L 239 243 Z';
    photo(shell,3,.26);curls(shell,3,311,254,62,78,24);
    for(let k=0;k<4;k++)strand(`M ${261+k*13} ${195+k*4} Q ${352+k*2} ${153+k*15} ${364-k*11} ${261+k*10} Q ${350-k*7} ${310-k*5} ${310-k*6} ${327-k*6}`,3,8,.9);
    strand('M 260 192 Q 235 237 255 292 Q 270 329 312 342',5,14);
    const body='M 177 188 Q 222 163 261 197 Q 285 229 283 295 Q 295 336 251 359 Q 207 375 168 341 Q 143 302 151 254 Z';
    photo(body,8,.23);curls(body,8,214,279,57,72,22);
    const belly='M 172 232 Q 203 207 230 234 Q 255 267 251 314 Q 243 345 213 346 Q 179 342 167 311 Z';
    photo(belly,5,.18);for(let k=0;k<4;k++)strand(`M ${169+k} ${254+k*21} Q 204 ${266+k*21} ${239+k*2} ${252+k*21}`,8,7,.85);
    const face='M 161 89 Q 199 63 239 92 Q 267 112 264 151 L 246 187 Q 224 214 185 205 L 147 191 Q 121 190 109 173 Q 100 155 117 143 L 137 137 Q 134 108 161 89 Z';
    photo(face,8,.2);curls(face,8,196,143,61,49,22);
    strand('M 113 163 Q 131 185 170 179',8,8);
    // The goggles are coiled black noodles around pale spaghetti eyes.
    eye(173,121,24,31);eye(222,122,22,30);
    loop(173,121,28,34,9,7);loop(222,122,26,33,9,7);
    strand('M 199 114 Q 197 109 195 117',9,8);
    strand('M 142 105 Q 132 111 132 128',9,7);strand('M 248 117 Q 257 128 254 144',9,7);
    strand('M 176 81 Q 182 62 196 68 Q 202 80 194 87',8,8);
    strand('M 198 81 Q 212 61 220 74 Q 224 84 214 90',8,8);
    if(throwing){
      const arm='M 253 227 Q 284 210 286 176 L 275 143 Q 269 126 284 116 Q 302 106 313 123 L 328 168 Q 334 219 291 252 Z';
      photo(arm,8,.2);strand('M 266 235 Q 312 211 304 169 L 292 130',8,10);
      spinyEggShape(332,82,.31);oval(296,139,23,24,8);loop(296,139,16,16,8,6);
    }else{
      const arm='M 262 242 Q 287 225 310 247 L 325 280 Q 331 303 311 312 Q 288 316 279 293 L 257 272 Z';
      photo(arm,8,.2);strand('M 271 250 Q 294 247 308 282',8,10);oval(307,297,22,23,8);loop(307,297,15,16,8,6);
    }
    const nearArm='M 170 229 Q 142 220 126 246 L 118 277 Q 113 297 131 305 Q 149 313 162 294 L 182 261 Z';
    photo(nearArm,8,.2);strand('M 160 240 Q 136 245 134 281',8,9);oval(133,294,22,23,8);loop(133,294,14,16,8,6);
    const cloud='M 67 359 Q 55 321 85 306 Q 110 290 136 312 Q 145 280 177 282 Q 204 280 224 305 Q 251 279 279 298 Q 309 276 337 301 Q 370 281 391 312 Q 426 300 443 328 Q 465 346 447 373 Q 474 404 449 430 Q 435 456 401 449 Q 377 476 343 458 Q 313 477 284 462 Q 252 481 223 460 Q 192 481 160 461 Q 127 474 104 451 Q 68 460 54 430 Q 36 405 55 385 Q 46 367 67 359 Z';
    photo(cloud,5,.18);curls(cloud,5,253,381,188,75,63);
    for(const[x,y,rx,ry]of[[87,365,29,28],[129,341,32,28],[178,327,29,26],[239,334,31,25],[298,328,28,26],[355,335,31,27],[410,356,28,28]])loop(x,y,rx,ry,5,7,.2);
    strand('M 64 421 Q 88 441 115 429 Q 145 455 178 441 Q 210 458 242 445 Q 271 461 305 445 Q 339 460 369 442 Q 413 454 445 420',5,10);
    oval(229,381,9,21,9);oval(285,381,9,21,9);
    strand('M 227 369 Q 224 383 230 393',9,6);strand('M 283 369 Q 280 383 286 393',9,6);
    strand('M 239 412 Q 256 425 274 412',9,5);
    finish();
  }
  // 22/23 — Lakitu, seated in a cloud of pale noodle coils; facing left.
  lakitu(false);lakitu(true);

  // 24 — the compact spinning Spiny egg, made from red and cream strands.
  begin();spinyEggShape(256,256,1.16);finish();

  // 25 — a low, four-footed Spiny. The shell and its long folded spines
  // share the same food photographs as the egg that hatches into it.
  begin();
  for(const[x,y,rot]of[[183,369,-.3],[355,364,.24],[413,374,.3],[249,398,-.15]]){
    oval(x,y,42,28,8,rot);loop(x,y,34,21,8,7,rot);strand(`M ${x-29} ${y+9} Q ${x} ${y+25} ${x+29} ${y+7}`,8,7);
  }
  const spinyShell='M 136 274 Q 145 191 224 160 Q 307 129 383 178 Q 451 221 454 308 Q 456 354 414 374 L 190 376 Q 128 353 136 274 Z';
  photo(spinyShell,6,.25);curls(spinyShell,6,293,267,145,99,46);
  strand('M 147 324 Q 186 354 264 354 Q 369 366 444 330',5,16);
  for(let k=0;k<4;k++)strand(`M ${174+k*15} ${238-k*13} Q ${278+k*7} ${137+k*10} ${405-k*6} ${218+k*16} Q ${437-k*8} ${264+k*6} ${427-k*14} ${322+k*4}`,6,9,.9);
  for(const[x,y,dx,dy]of[[177,234,-43,-84],[228,191,-22,-105],[292,178,6,-111],[356,197,38,-106],[406,249,54,-78],[256,277,-16,-80],[350,286,27,-77]]){
    const tipX=x+dx,tipY=y+dy;
    for(let k=-2;k<=2;k++){
      const reach=1-Math.abs(k)*.105,px=x+dx*reach+k*2,py=y+dy*reach+Math.abs(k)*2;
      strand(`M ${x+k*8} ${y+8} C ${x+k*7+dx*.23} ${y+dy*.3} ${x+dx*.72+k*4+5} ${y+dy*.72} ${px} ${py}`,5,8-Math.abs(k)*.8);
    }
  }
  const spinyHead='M 81 267 Q 113 242 151 263 Q 181 281 177 318 Q 172 357 133 367 L 86 359 Q 50 352 49 324 Q 44 297 63 283 Z';
  photo(spinyHead,8,.22);curls(spinyHead,8,114,311,53,43,18);
  eye(96,284,16,24);eye(133,280,14,23);strand('M 76 260 Q 94 256 110 270',6,9);strand('M 123 263 Q 137 248 151 258',6,8);
  strand('M 57 327 Q 84 350 122 334',8,9);strand('M 72 330 Q 90 337 106 329',9,4.5);
  oval(118,389,46,28,8,-.24);loop(118,389,36,21,8,8,-.24);strand('M 84 398 Q 119 416 155 394',8,7);
  finish();

  // 26 — the World 3 castle's Buzzy Beetle disguise: a navy noodle dome
  // with golden feet, pale coiled rim and a small golden spaghetti face.
  begin();
  for(const[x,y,rot]of[[200,390,-.2],[368,393,.2]]){oval(x,y,55,31,8,rot);loop(x,y,44,23,8,8,rot);}
  const buzzyShell='M 104 297 Q 91 212 148 146 Q 214 78 301 103 Q 392 126 427 211 Q 457 286 424 345 Q 383 387 274 383 Q 145 382 110 341 Z';
  photo(buzzyShell,7,.3);curls(buzzyShell,7,271,250,159,132,58);
  for(let k=0;k<6;k++)strand(`M ${126+k*13} ${268-k*18} C ${111+k*15} ${157-k*4} ${237+k*12} ${93+k*5} ${319+k*12} ${139+k*10} Q ${427-k*3} ${204+k*14} ${416-k*9} ${329+k*3}`,7,10,.85);
  strand('M 109 328 Q 185 370 275 367 Q 367 374 423 334',5,17);
  const buzzyFace='M 65 305 Q 87 283 122 296 Q 145 308 147 338 Q 144 366 117 377 L 73 373 Q 44 367 46 343 Q 42 318 65 305 Z';
  photo(buzzyFace,8,.21);curls(buzzyFace,8,94,337,44,35,15);eye(95,311,14,21);strand('M 48 348 Q 72 370 109 354',8,8);
  oval(125,398,52,29,8,-.24);loop(125,398,42,21,8,8,-.24);oval(309,410,50,27,8,.15);loop(309,410,39,19,8,8,.15);
  finish();
  // 27 — Bullet Bill: a compact cylinder of black spaghetti with a pale
  // noodle fist and eye. The rounded black strands are food, including the
  // apparent barrel, trailing rim and expressive brow. Facing left.
  begin();
  const billBody='M 431 143 L 230 141 C 139 141 76 180 69 252 C 64 328 133 371 230 370 L 431 369 Q 447 352 446 326 L 446 187 Q 447 159 431 143 Z';
  photo(billBody,9,.34);curls(billBody,9,264,254,184,112,54);
  for(let k=0;k<7;k++){
    const yy=164+k*28;
    strand(`M ${418-k%2*8} ${yy} C 328 ${yy-9} 225 ${yy-4} 164 ${yy+3} Q 91 ${yy+10} ${84+k*4} ${247+k*11}`,9,11,.9);
  }
  // The back ring is several closed noodle coils rather than metal plating.
  for(let k=0;k<4;k++)strand(`M ${421+k*5} ${151+k*3} Q ${447+k*2} 253 ${421+k*5} ${360-k*3}`,9,12-k,.95);
  strand('M 206 148 Q 122 162 104 216 Q 81 286 133 329',9,12);
  const billEye='M 119 195 Q 147 178 184 193 L 180 247 Q 155 264 130 248 Z';
  photo(billEye,5,.12);strand('M 122 199 Q 151 190 180 196',5,9);
  oval(139,227,11,23,9,-.18);strand('M 131 210 Q 134 230 139 245',9,6);
  strand('M 110 183 Q 142 176 190 195',9,18);
  const billArm='M 236 285 Q 271 292 280 327 Q 279 351 250 365 L 202 345 L 200 308 Z';
  photo(billArm,9,.3);strand('M 250 302 Q 274 329 247 349',9,12);
  const billFist='M 170 291 Q 148 270 132 287 Q 113 283 105 303 Q 86 305 91 330 Q 77 351 98 372 Q 104 399 133 396 L 207 399 Q 236 390 240 367 L 233 324 Q 222 299 199 299 Z';
  photo(billFist,5,.2);curls(billFist,5,163,347,66,51,20);
  for(const [xx,yy]of[[111,319],[132,308],[155,310],[178,318]])strand(`M ${xx} ${yy} Q ${xx-9} ${yy+18} ${xx+1} ${yy+35} Q ${xx+8} ${yy+43} ${xx+17} ${yy+36}`,5,12);
  strand('M 108 378 Q 149 392 201 381 Q 224 373 222 349',5,13);
  strand('M 175 354 Q 177 328 196 326 Q 212 327 217 347',5,14);
  finish();
  // 28 — daylight Buzzy Beetle: the source black shell palette.
  // The blue World 3 disguise and underground sculpture at26 stay intact.
  {
  begin();
  for(const[x,y,rot]of[[200,390,-.2],[368,393,.2]]){oval(x,y,55,31,8,rot);loop(x,y,44,23,8,8,rot);}
  const buzzyShell='M 104 297 Q 91 212 148 146 Q 214 78 301 103 Q 392 126 427 211 Q 457 286 424 345 Q 383 387 274 383 Q 145 382 110 341 Z';
  photo(buzzyShell,9,.3);curls(buzzyShell,9,271,250,159,132,58);
  for(let k=0;k<6;k++)strand(`M ${126+k*13} ${268-k*18} C ${111+k*15} ${157-k*4} ${237+k*12} ${93+k*5} ${319+k*12} ${139+k*10} Q ${427-k*3} ${204+k*14} ${416-k*9} ${329+k*3}`,9,10,.85);
  strand('M 109 328 Q 185 370 275 367 Q 367 374 423 334',5,17);
  const buzzyFace='M 65 305 Q 87 283 122 296 Q 145 308 147 338 Q 144 366 117 377 L 73 373 Q 44 367 46 343 Q 42 318 65 305 Z';
  photo(buzzyFace,8,.21);curls(buzzyFace,8,94,337,44,35,15);eye(95,311,14,21);strand('M 48 348 Q 72 370 109 354',8,8);
  oval(125,398,52,29,8,-.24);loop(125,398,42,21,8,8,-.24);oval(309,410,50,27,8,.15);loop(309,410,39,19,8,8,.15);
  finish();
  }
  return canvases;
}
