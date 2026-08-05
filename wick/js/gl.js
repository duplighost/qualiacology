// gl.js — a small, opinionated WebGL2 layer: programs with reflected uniforms,
// float render targets, ping-pong pairs, MRT, and async PBO readback.

export const VS_QUAD = `#version 300 es
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FMT = {
  rgba16f: ['RGBA16F', 'RGBA', 'FLOAT'],
  rg16f: ['RG16F', 'RG', 'FLOAT'],
  r16f: ['R16F', 'RED', 'FLOAT'],
  rgba32f: ['RGBA32F', 'RGBA', 'FLOAT'],
  rgba8: ['RGBA8', 'RGBA', 'UNSIGNED_BYTE'],
};

let _texId = 0;

export class GLX {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', {
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
      powerPreference: 'high-performance', desynchronized: false,
    });
    if (!gl) throw new Error('WebGL2 is not available in this browser.');
    this.gl = gl;
    this.canvas = canvas;
    this.extColorFloat = gl.getExtension('EXT_color_buffer_float');
    this.extLinearFloat = gl.getExtension('OES_texture_float_linear');
    this.extLinearHalf = gl.getExtension('OES_texture_half_float_linear'); // core in WebGL2, harmless
    if (!this.extColorFloat) throw new Error('EXT_color_buffer_float is required (float render targets).');
    this.vao = gl.createVertexArray();
    this._progs = new Map();
    this._mrtFbos = new Map();
    this.drawCalls = 0;
  }

  // ---------------------------------------------------------------- programs
  prog(fsSrc, vsSrc = VS_QUAD) {
    const key = vsSrc.length + '|' + fsSrc.length + '|' + fsSrc;
    let p = this._progs.get(key);
    if (p) return p;
    p = this._link(vsSrc, fsSrc);
    this._progs.set(key, p);
    return p;
  }

  _compile(type, src) {
    const gl = this.gl;
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      const numbered = src.split('\n').map((l, i) => String(i + 1).padStart(4) + '| ' + l).join('\n');
      throw new Error('shader compile failed:\n' + log + '\n' + numbered);
    }
    return sh;
  }

  _link(vsSrc, fsSrc) {
    const gl = this.gl;
    const vs = this._compile(gl.VERTEX_SHADER, vsSrc);
    const fs = this._compile(gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed: ' + gl.getProgramInfoLog(prog));
    gl.deleteShader(vs); gl.deleteShader(fs);
    const u = Object.create(null);
    const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(prog, i);
      const base = info.name.replace(/\[0\]$/, '');
      u[base] = { loc: gl.getUniformLocation(prog, info.name), type: info.type, size: info.size };
    }
    return { prog, u };
  }

  setUniforms(p, vals) {
    const gl = this.gl;
    let unit = 0;
    for (const k in vals) {
      const slot = p.u[k];
      if (!slot) continue;
      const v = vals[k];
      switch (slot.type) {
        case gl.SAMPLER_2D: {
          const tex = v && v.tex ? v.tex : v;
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.uniform1i(slot.loc, unit);
          unit++;
          break;
        }
        case gl.FLOAT: Array.isArray(v) || ArrayBuffer.isView(v) ? gl.uniform1fv(slot.loc, v) : gl.uniform1f(slot.loc, v); break;
        case gl.FLOAT_VEC2: gl.uniform2fv(slot.loc, v); break;
        case gl.FLOAT_VEC3: gl.uniform3fv(slot.loc, v); break;
        case gl.FLOAT_VEC4: gl.uniform4fv(slot.loc, v); break;
        case gl.INT: case gl.BOOL: Array.isArray(v) ? gl.uniform1iv(slot.loc, v) : gl.uniform1i(slot.loc, v | 0); break;
        case gl.INT_VEC2: gl.uniform2iv(slot.loc, v); break;
        default: break;
      }
    }
  }

  // ---------------------------------------------------------------- textures
  texture(w, h, fmtName = 'rgba16f', filter = 'linear', wrap = 'clamp', data = null) {
    const gl = this.gl;
    const [ifmt, fmt, type] = FMT[fmtName];
    let f = filter === 'linear' ? gl.LINEAR : gl.NEAREST;
    if (fmtName === 'rgba32f' && !this.extLinearFloat) f = gl.NEAREST;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    const wm = wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wm);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap === 'repeat' ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl[ifmt], w, h, 0, gl[fmt], gl[type], data);
    t.__id = ++_texId;
    return t;
  }

  target(w, h, fmtName = 'rgba16f', filter = 'linear', wrap = 'clamp', data = null) {
    const gl = this.gl;
    const tex = this.texture(w, h, fmtName, filter, wrap, data);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('incomplete FBO (' + fmtName + ' ' + w + 'x' + h + '): 0x' + st.toString(16));
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo, w, h, fmt: fmtName };
  }

  double(w, h, fmtName = 'rgba16f', filter = 'linear', wrap = 'clamp') {
    const a = this.target(w, h, fmtName, filter, wrap);
    const b = this.target(w, h, fmtName, filter, wrap);
    return {
      a, b, w, h,
      get read() { return this.a; },
      get write() { return this.b; },
      swap() { const t = this.a; this.a = this.b; this.b = t; },
    };
  }

  upload(tex, w, h, fmtName, data) {
    const gl = this.gl;
    const [ifmt, fmt, type] = FMT[fmtName];
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl[ifmt], w, h, 0, gl[fmt], gl[type], data);
  }

  // ------------------------------------------------------------------- draw
  /** Draw a fullscreen triangle with `p` into `dst` (null = canvas). */
  draw(p, dst, uniforms, opts) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fbo : null);
    const w = dst ? dst.w : gl.drawingBufferWidth;
    const h = dst ? dst.h : gl.drawingBufferHeight;
    if (opts && opts.viewport) gl.viewport(opts.viewport[0], opts.viewport[1], opts.viewport[2], opts.viewport[3]);
    else gl.viewport(0, 0, w, h);
    gl.useProgram(p.prog);
    if (uniforms) this.setUniforms(p, uniforms);
    if (opts && opts.blend) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); }
    else gl.disable(gl.BLEND);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    this.drawCalls++;
  }

  /** Multiple render targets. `dsts` is an array of targets of matching size. */
  drawMRT(p, dsts, uniforms) {
    const gl = this.gl;
    const key = dsts.map((d) => d.tex.__id).join(',');
    let fbo = this._mrtFbos.get(key);
    if (!fbo) {
      fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      for (let i = 0; i < dsts.length; i++)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, dsts[i].tex, 0);
      gl.drawBuffers(dsts.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
      const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('incomplete MRT FBO: 0x' + st.toString(16));
      this._mrtFbos.set(key, fbo);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.drawBuffers(dsts.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
    }
    gl.viewport(0, 0, dsts[0].w, dsts[0].h);
    gl.useProgram(p.prog);
    if (uniforms) this.setUniforms(p, uniforms);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    this.drawCalls++;
  }

  /** Draw N GL_POINTS with a vertex shader that pulls from a texture via gl_VertexID. */
  drawPoints(p, dst, count, uniforms, blend = true) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fbo : null);
    gl.viewport(0, 0, dst ? dst.w : gl.drawingBufferWidth, dst ? dst.h : gl.drawingBufferHeight);
    gl.useProgram(p.prog);
    if (uniforms) this.setUniforms(p, uniforms);
    if (blend) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); } else gl.disable(gl.BLEND);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
    this.drawCalls++;
  }

  clear(dst, r = 0, g = 0, b = 0, a = 1) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fbo : null);
    gl.viewport(0, 0, dst ? dst.w : gl.drawingBufferWidth, dst ? dst.h : gl.drawingBufferHeight);
    gl.disable(gl.BLEND);
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}

/**
 * Async readback of a small float target using pixel-pack buffers + fences.
 * Falls back to a synchronous readPixels if fences misbehave.
 * Latency is 1-3 frames, which is invisible for wind forces on a body with drag.
 */
export class AsyncReader {
  constructor(glx, w, h, slots = 3) {
    this.glx = glx; this.w = w; this.h = h;
    const gl = glx.gl;
    this.slots = [];
    for (let i = 0; i < slots; i++) {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, w * h * 4 * 4, gl.STREAM_READ);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      this.slots.push({ buf, sync: null, pending: false });
    }
    this.next = 0;
    this.data = new Float32Array(w * h * 4);
    this.scratch = new Float32Array(w * h * 4);
    this.everRead = false;
    this.broken = false;
  }

  /** Kick off a read of `target` and harvest any completed earlier read. */
  update(target) {
    const gl = this.glx.gl;
    if (this.broken) return this._sync(target);
    // harvest
    for (const s of this.slots) {
      if (!s.pending || !s.sync) continue;
      const st = gl.clientWaitSync(s.sync, 0, 0);
      if (st === gl.ALREADY_SIGNALED || st === gl.CONDITION_SATISFIED) {
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, s.buf);
        gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.scratch);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        this.data.set(this.scratch);
        this.everRead = true;
        gl.deleteSync(s.sync); s.sync = null; s.pending = false;
      } else if (st === gl.WAIT_FAILED) {
        gl.deleteSync(s.sync); s.sync = null; s.pending = false; this.broken = true;
        return this._sync(target);
      }
    }
    // issue
    const s = this.slots[this.next];
    this.next = (this.next + 1) % this.slots.length;
    if (s.pending) return; // all in flight; skip this frame
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, s.buf);
    gl.readPixels(0, 0, this.w, this.h, gl.RGBA, gl.FLOAT, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    s.sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    s.pending = true;
    gl.flush();
  }

  /** Release the pixel-pack buffers and any pending fences. */
  dispose() {
    const gl = this.glx.gl;
    for (const s of this.slots) {
      if (s.sync) gl.deleteSync(s.sync);
      gl.deleteBuffer(s.buf);
    }
    this.slots = [];
  }

  /** Force a synchronous read right now (used by deterministic test stepping). */
  readNow(target) { this._sync(target); }

  _sync(target) {
    const gl = this.glx.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.readPixels(0, 0, this.w, this.h, gl.RGBA, gl.FLOAT, this.scratch);
    this.data.set(this.scratch);
    this.everRead = true;
  }
}
