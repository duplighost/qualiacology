// The last peal moves the existing landmark geometry; no duplicate bells or lights.
export class LoreBellAnswers {
  constructor(ctx) {
    this.ctx = ctx;
    this.actors = new Map();
    this.choir = 0;
    this.off = ctx.bus.on('morning:answer', e => this.answer(e?.id));
  }

  answer(id) {
    if (id !== 'gallowsfen' && id !== 'choir-vault') return;
    const index = id === 'choir-vault' ? this.choir++ % 5 : 0;
    const key = id + ':' + index;
    let actor = this.actors.get(key);
    if (!actor) {
      actor = this._bind(id, index);
      if (!actor) return;
      this.actors.set(key, actor);
    }
    actor.time = 0; actor.prev = 0; actor.active = true;
  }

  _bind(id, index) {
    const rec = this.ctx.systems.get('places')?.nodes.get(id);
    if (!rec?.solid?.geometry) return null;
    const fen = id === 'gallowsfen', c = rec.def.claim;
    const x = fen ? c.dx : 0, z = fen ? c.dz : 19 - index * 14;
    const h = fen ? c.dy : 14 + (index % 3) * 2.1;
    const pivotY = rec.padY + (fen ? h + 1 : 25);
    const pieces = [];
    for (const [mesh, glow] of [[rec.solid, false], [rec.glow, true]]) {
      if (!mesh?.geometry?.attributes?.position) continue;
      const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal, col = g.attributes.color;
      const ids = [], positions = [], normals = [];
      for (let v = 0; v < p.count; v++) {
        const px = p.getX(v), py = p.getY(v), pz = p.getZ(v);
        let part;
        if (fen) {
          // sites.steeple: the .04 m hanging chain, excluding the fixed .12 m bracket;
          // and the existing .8 m lamp pane directly below it.
          part = Math.abs(px - x) < (glow ? .401 : .051) && Math.abs(pz - z) < (glow ? .401 : .051) &&
            py >= rec.padY + h - (glow ? .01 : -.09) && py <= rec.padY + h + (glow ? .01 : 1.001);
        } else {
          // outer-destinations: copper skirt/rim and iron hanger/clapper/cage.
          // The stone rib shares the hanger's apex, so its vertices are excluded by colour.
          const copper = col && Math.abs(col.getX(v) - .114) < .00001 && Math.abs(col.getY(v) - .080) < .00001;
          const iron = col && Math.abs(col.getX(v) - .064) < .00001 && Math.abs(col.getY(v) - .072) < .00001;
          part = (glow || copper || iron) && Math.abs(px) < 1.72 && Math.abs(pz - z) < 1.72 &&
            py >= rec.padY + h - 1.8 && py <= rec.padY + 25.1;
        }
        if (!part) continue;
        ids.push(v); positions.push(px, py, pz);
        if (n) normals.push(n.getX(v), n.getY(v), n.getZ(v));
      }
      if (ids.length) pieces.push({ geometry: g, ids, positions: new Float32Array(positions), normals: new Float32Array(normals) });
    }
    if (!pieces.length) return null;
    return { id, index, x, pivotY, pieces, time: 0, prev: 0, active: false,
      rate: fen ? 3.1 : Math.sqrt(9.81 / (25 - h)), amplitude: fen ? .55 : .19, duration: fen ? 12 : 18 };
  }

  step(dt) {
    for (const a of this.actors.values()) {
      if (!a.active) continue;
      a.prev = a.time; a.time += dt;
      if (a.time >= a.duration) { a.active = false; this._paint(a, 0); }
    }
  }

  present(alpha = 1) {
    for (const a of this.actors.values()) {
      if (!a.active) continue;
      const t = a.prev + (a.time - a.prev) * alpha;
      const fade = Math.max(0, 1 - t / a.duration);
      this._paint(a, Math.sin(t * a.rate) * a.amplitude * fade * fade);
    }
  }

  _paint(a, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    for (const part of a.pieces) {
      const p = part.geometry.attributes.position, n = part.geometry.attributes.normal;
      for (let i = 0; i < part.ids.length; i++) {
        const v = part.ids[i], j = i * 3, x = part.positions[j] - a.x, y = part.positions[j + 1] - a.pivotY;
        p.setXYZ(v, a.x + x * c - y * s, a.pivotY + x * s + y * c, part.positions[j + 2]);
        if (n) { const nx = part.normals[j], ny = part.normals[j + 1]; n.setXYZ(v, nx * c - ny * s, nx * s + ny * c, part.normals[j + 2]); }
      }
      p.needsUpdate = true; if (n) n.needsUpdate = true;
    }
  }

  dispose() {
    this.off?.();
    for (const actor of this.actors.values()) this._paint(actor, 0);
    this.actors.clear();
  }
}
