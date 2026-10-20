/* LA BATALLA POR VILLAVICIOSA — renderer.js
   Dibuja el tablero, las unidades, los efectos y el ciclo día/noche.
   Las animaciones son promesas: la lógica ya está resuelta por el motor y aquí
   solo se representa. */
(function (G) {
  const VV = G.VV, E = VV.Engine, ART = VV.Art;
  const { S, SQ } = ART.HEX;
  const R = (VV.Render = {
    s: null, cv: null, ctx: null, terrain: null, cam: { x: 0, y: 0, z: 1 }, vis: new Map(), anims: [], parts: [], floats: [], projs: [], specials: [],
    hl: {}, hover: -1, tint: [255, 255, 255, 0], tintT: null, shake: 0, time: 0, speed: 1, grid: false, zoc: false, reduced: false, selId: null, dpr: 1
  });
  const SPR = 1.12, HW = 32, FY = 72;

  R.attach = function (cv) {
    R.cv = cv; R.ctx = cv.getContext('2d');
    const ro = () => R.resize(); G.addEventListener('resize', ro); R.resize();
    requestAnimationFrame(R.loop);
  };
  R.resize = function () {
    if (!R.cv) return;
    const b = R.cv.parentElement.getBoundingClientRect();
    R.dpr = Math.min(2, G.devicePixelRatio || 1);
    R.cv.width = Math.max(10, Math.round(b.width * R.dpr)); R.cv.height = Math.max(10, Math.round(b.height * R.dpr));
    R.cv.style.width = b.width + 'px'; R.cv.style.height = b.height + 'px';
    R.vw = b.width; R.vh = b.height; R.clampCam();
  };
  R.setState = function (s) {
    R.s = s; R.terrain = ART.renderTerrain(s); R.vis = new Map(); R.parts = []; R.floats = []; R.projs = []; R.specials = []; R.hl = {};
    const mcv = document.getElementById('mini'); const [w0, h0] = ART.mapSize(s); if (mcv) { mcv.width = 300; mcv.height = Math.round(300 * h0 / w0); }
    R.mini = ART.minimap(s, 300, Math.round(300 * h0 / w0)); R.lights = ART.lightSpots(s);
    const tod = VV.TOD[E.tod(s)]; R.tint = tod.tint.slice(); R.tintT = null;
    const [mw, mh] = ART.mapSize(s); R.mw = mw; R.mh = mh;
    R.gridCv = null;
  };
  R.clampCam = function () {
    if (!R.s) return; const z = R.cam.z;
    const vw = R.vw / z, vh = R.vh / z, pad = 80;
    R.cam.x = Math.max(-pad, Math.min(R.mw - vw + pad, R.cam.x)); R.cam.y = Math.max(-pad - 40, Math.min(R.mh - vh + pad, R.cam.y));
    if (vw > R.mw + pad * 2) R.cam.x = (R.mw - vw) / 2; if (vh > R.mh + pad * 2) R.cam.y = (R.mh - vh) / 2;
  };
  R.centerOn = function (c, r, smooth) {
    const [x, y] = ART.hexCenter(c, r), z = R.cam.z;
    const tx = x - R.vw / z / 2, ty = y - R.vh / z / 2;
    if (!smooth) { R.cam.x = tx; R.cam.y = ty; R.clampCam(); return Promise.resolve(); }
    const sx = R.cam.x, sy = R.cam.y;
    return R.tween(380, p => { const e = p * p * (3 - 2 * p); R.cam.x = sx + (tx - sx) * e; R.cam.y = sy + (ty - sy) * e; R.clampCam(); });
  };
  R.isVisible = function (c, r) {
    const [x, y] = ART.hexCenter(c, r), z = R.cam.z;
    return x > R.cam.x + 60 && x < R.cam.x + R.vw / z - 60 && y > R.cam.y + 60 && y < R.cam.y + R.vh / z - 60;
  };
  R.zoomAt = function (f, sx, sy) {
    const z0 = R.cam.z, z1 = Math.max(0.45, Math.min(2.2, z0 * f));
    const wx = R.cam.x + sx / z0, wy = R.cam.y + sy / z0;
    R.cam.z = z1; R.cam.x = wx - sx / z1; R.cam.y = wy - sy / z1; R.clampCam();
  };
  R.screenToIdx = function (sx, sy) {
    const s = R.s; if (!s) return -1;
    const wx = R.cam.x + sx / R.cam.z, wy = R.cam.y + sy / R.cam.z;
    const c0 = Math.round((wx - S) / (1.5 * S));
    let best = -1, bd = 1e9;
    for (let c = c0 - 1; c <= c0 + 1; c++) {
      if (c < 0 || c >= s.W) continue;
      const r0 = Math.round((wy - SQ / 2 - (c & 1) * SQ / 2) / SQ);
      for (let r = r0 - 1; r <= r0 + 1; r++) {
        if (r < 0 || r >= s.H) continue;
        const [x, y] = ART.hexCenter(c, r), d = (x - wx) ** 2 + (y - wy) ** 2;
        if (d < bd) { bd = d; best = r * s.W + c; }
      }
    }
    return bd < S * S * 1.1 ? best : -1;
  };

  /* ---------- Animación ---------- */
  R.tween = function (ms, fn) {
    return new Promise(res => {
      const dur = Math.max(1, ms * R.speed);
      if (R.speed <= 0.01) { fn(1); res(); return; }
      R.anims.push({ t0: performance.now(), dur, fn, res });
    });
  };
  R.wait = ms => R.tween(ms, () => {});
  R.visOf = function (u) {
    let v = R.vis.get(u.id);
    if (!v) {
      const [x, y] = ART.hexCenter(u.x, u.y);
      const keepE = R.s.factions[u.fac].keep[0] > R.s.W / 2;
      v = { x, y, dx: 0, dy: 0, alpha: 1, flash: 0, flashCol: '#ff3b3b', frame: null, face: keepE ? -1 : 1, scale: 1, lock: false, hp: null, lvl: null, gone: false };
      R.vis.set(u.id, v);
    }
    return v;
  };
  R.part = function (x, y, col, n, o) {
    if (R.reduced && n > 6) n = 6;
    o = o || {};
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, sp = (o.speed || 1.6) * (0.4 + Math.random());
      R.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0.8), life: 0, max: (o.life || 700) * (0.6 + Math.random() * 0.6), col: Array.isArray(col) ? col[k % col.length] : col, size: o.size || 3, grav: o.grav == null ? 0.04 : o.grav });
    }
  };
  R.float = function (text, x, y, col, size, dur) { R.floats.push({ text, x, y, col: col || '#fff', size: size || 16, t0: performance.now(), dur: (dur || 1100) * Math.max(0.5, R.speed) }); };
  R.proj = function (kind, x0, y0, x1, y1, ms, arc) {
    return new Promise(res => R.projs.push({ kind, x0, y0, x1, y1, t0: performance.now(), dur: Math.max(1, ms * R.speed), res, arc: arc == null ? 26 : arc }));
  };
  R.special = function (kind, x, y, ms, extra) { const sp = { kind, x, y, t0: performance.now(), dur: ms * Math.max(0.4, R.speed), extra: extra || {} }; R.specials.push(sp); };
  R.setTod = function (idx) { R.tintT = { from: R.tint.slice(), to: VV.TOD[idx].tint.slice(), t0: performance.now(), dur: 1400 }; };

  /* ---------- Dibujo de proyectiles ---------- */
  const pcache = {};
  function projSprite(kind) {
    if (pcache[kind]) return pcache[kind];
    const cv = ART.mk(16, 16), g = ART.P(cv.getContext('2d'));
    switch (kind) {
      case 'cup': case 'cup2': g.r(5, 3, 6, 9, '#e3f2f6'); g.r(5, 6, 6, 6, '#e8b73a'); g.r(5, 3, 6, 1, '#fff'); break;
      case 'cupbig': g.r(3, 2, 10, 8, '#f2c12e'); g.r(4, 3, 8, 3, '#e8b73a'); g.r(7, 10, 2, 3, '#b8860b'); g.r(5, 13, 6, 1, '#b8860b'); break;
      case 'hamster': case 'hamster2': case 'hamster3': ART.hamster(g, 5, 6, kind === 'hamster2' ? 'goggles' : kind === 'hamster3' ? 'helmet' : null); break;
      case 'cushion': g.r(3, 5, 10, 7, '#f48fb1'); g.r(4, 6, 3, 2, '#fce4ec'); g.p(2, 5, '#ad1457'); g.p(13, 11, '#ad1457'); break;
      case 'dice': g.r(4, 4, 8, 8, '#fafafa'); g.p(6, 6, '#222'); g.p(9, 9, '#222'); g.p(6, 9, '#222'); g.p(9, 6, '#222'); break;
      case 'vomit': g.circ(8, 8, 4, '#9ccc65'); g.circ(6, 7, 2, '#c5e1a5'); g.p(11, 11, '#558b2f'); break;
      case 'papers': g.r(4, 3, 8, 10, '#fafafa'); for (let k = 0; k < 4; k++) g.r(5, 5 + k * 2, 6, 1, '#9e9e9e'); break;
      case 'vinyl': g.circ(8, 8, 6, '#111'); g.circ(8, 8, 2, '#e53935'); break;
      case 'notes': g.r(6, 3, 1, 8, '#ffd54f'); g.r(4, 10, 3, 3, '#ffd54f'); g.r(6, 3, 5, 2, '#ffd54f'); g.r(10, 3, 1, 7, '#ffd54f'); g.r(8, 9, 3, 3, '#ffd54f'); break;
      case 'wine': g.r(6, 3, 4, 8, '#1b5e20'); g.r(7, 1, 2, 2, '#1b5e20'); g.r(6, 6, 4, 2, '#fff8e1'); break;
      case 'coins': g.r(4, 6, 5, 5, '#f2c12e'); g.r(8, 3, 5, 5, '#f2c12e'); g.p(5, 7, '#fff59d'); g.p(9, 4, '#fff59d'); break;
      case 'tray': g.r(1, 7, 14, 3, '#cfd8dc'); g.r(3, 6, 10, 1, '#fff'); break;
      case 'relic': g.r(4, 3, 8, 10, '#d4af37'); g.r(6, 5, 4, 3, '#2e7d32'); g.p(7, 10, '#e53935'); break;
      case 'hearts': g.r(4, 5, 3, 3, '#ec407a'); g.r(9, 5, 3, 3, '#ec407a'); g.r(5, 8, 6, 2, '#ec407a'); g.r(7, 10, 2, 2, '#ec407a'); break;
      case 'ring': g.circ(8, 8, 5, '#e53935', 2); g.p(3, 8, '#fff'); g.p(13, 8, '#fff'); break;
      case 'rocks': g.r(4, 6, 4, 4, '#8d6e63'); g.r(9, 4, 3, 3, '#a1887f'); g.r(8, 10, 3, 3, '#6d4c41'); break;
      case 'chair': g.r(4, 2, 2, 12, '#9e9e9e'); g.r(4, 8, 9, 2, '#9e9e9e'); g.r(11, 8, 2, 6, '#9e9e9e'); g.r(4, 2, 7, 2, '#e53935'); break;
      case 'glint': g.r(7, 2, 2, 12, '#e0f7fa'); g.r(2, 7, 12, 2, '#e0f7fa'); g.r(7, 7, 2, 2, '#fff'); break;
      case 'barrel': g.r(3, 3, 10, 10, '#8d5a2b'); g.r(3, 5, 10, 1, '#4e2c12'); g.r(3, 10, 10, 1, '#4e2c12'); break;
      default: g.circ(8, 8, 3, '#fff59d');
    }
    pcache[kind] = cv; return cv;
  }
  R.projSprite = projSprite;

  /* ---------- Bucle principal ---------- */
  R.loop = function (t) {
    requestAnimationFrame(R.loop);
    R.time = t;
    // avanzar animaciones
    for (let k = R.anims.length - 1; k >= 0; k--) {
      const a = R.anims[k], p = Math.max(0, Math.min(1, (t - a.t0) / a.dur));
      try { a.fn(p); } catch (e) { console.error(e); }
      if (p >= 1) { R.anims.splice(k, 1); a.res(); }
    }
    if (!R.s || !R.ctx || R.hidden) return;
    R.draw(t);
  };

  function hexFill(ctx, i, fill, stroke, lw) {
    const s = R.s, [x, y] = ART.hexCenter(i % s.W, Math.floor(i / s.W));
    ART.hexPath(ctx, x, y, S - 1.5);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }

  R.draw = function (t) {
    const s = R.s, ctx = R.ctx, z = R.cam.z, dpr = R.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = s.mapId === 'villa' ? '#3c362f' : '#2f4a2b'; ctx.fillRect(0, 0, R.cv.width, R.cv.height);
    let shx = 0, shy = 0;
    if (R.shake > 0 && !R.reduced) { shx = (Math.random() - 0.5) * R.shake; shy = (Math.random() - 0.5) * R.shake; R.shake *= 0.9; if (R.shake < 0.3) R.shake = 0; }
    ctx.setTransform(z * dpr, 0, 0, z * dpr, (-R.cam.x * z + shx) * dpr, (-R.cam.y * z + shy) * dpr);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(R.terrain, 0, 0);
    // agua animada
    if (s.mapId === 'xiringuelu' || true) {
      ctx.fillStyle = 'rgba(160,210,240,0.22)';
      s.tiles.forEach((tt, i) => { if (tt.t !== 'water') return; const [x, y] = ART.hexCenter(i % s.W, Math.floor(i / s.W)); const o = Math.sin(t / 600 + i) * 8; ctx.fillRect(x - 14 + o, y + 4, 10, 2); });
    }
    // capas sobre el terreno
    for (const k in s.overlays) {
      const o = s.overlays[k], i = +k, [x, y] = ART.hexCenter(i % s.W, Math.floor(i / s.W));
      if (o.puddle) { ctx.fillStyle = 'rgba(120,170,210,0.65)'; ctx.fillRect(x - 18, y - 4, 26, 9); ctx.fillRect(x - 6, y + 6, 18, 6); ctx.fillStyle = 'rgba(220,240,255,0.7)'; ctx.fillRect(x - 12, y - 2, 6, 2); }
      if (o.sticky) { ctx.fillStyle = 'rgba(140,200,70,0.8)'; ctx.fillRect(x - 16, y - 8, 30, 16); ctx.fillRect(x - 22, y - 2, 8, 6); ctx.fillRect(x + 12, y + 4, 9, 6); ctx.fillStyle = 'rgba(210,240,150,0.9)'; ctx.fillRect(x - 10, y - 5, 6, 3); }
    }
    // propiedades: base de color del propietario (las banderas se dibujan con las unidades)
    s.props.forEach(p => {
      if (p.owner < 0) return; const [x, y] = ART.hexCenter(p.c, p.r), F = VV.FACTIONS[s.factions[p.owner].id];
      ctx.strokeStyle = F.col; ctx.globalAlpha = 0.55; ctx.lineWidth = 3; ART.hexPath(ctx, x, y, S - 3); ctx.stroke(); ctx.globalAlpha = 1;
    });
    // rejilla y resaltados
    if (R.grid) { ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < s.tiles.length; i++) { const [x, y] = ART.hexCenter(i % s.W, Math.floor(i / s.W)); ART.hexPath(ctx, x, y, S); ctx.stroke(); } }
    const H = R.hl;
    if (H.zoc) H.zoc.forEach(i => hexFill(ctx, i, 'rgba(200,40,40,0.13)'));
    if (H.reach) H.reach.forEach(i => hexFill(ctx, i, 'rgba(255,250,225,0.22)', 'rgba(255,250,225,0.35)', 1));
    if (H.recruit) H.recruit.forEach(i => hexFill(ctx, i, 'rgba(90,220,255,0.28)', '#5ad8ff', 2));
    if (H.abil) H.abil.forEach(i => hexFill(ctx, i, 'rgba(255,205,60,0.28)', '#ffcd3c', 2.5));
    if (H.picked) H.picked.forEach(i => hexFill(ctx, i, 'rgba(255,120,40,0.4)', '#ff7a28', 3));
    if (H.threat) H.threat.forEach(i => hexFill(ctx, i, 'rgba(220,50,40,0.16)'));
    if (H.hoverThreat) H.hoverThreat.forEach(i => hexFill(ctx, i, 'rgba(220,50,40,0.13)'));
    if (H.attack) H.attack.forEach(i => hexFill(ctx, i, 'rgba(255,75,58,0.18)', '#ff4b3a', 3));
    if (H.area) H.area.forEach(i => hexFill(ctx, i, 'rgba(255,80,60,0.18)'));
    if (R.selId != null) { const u = E.byId(s, R.selId); if (u) { const pulse = 0.6 + 0.4 * Math.sin(t / 220); hexFill(ctx, E.uIdx(s, u), null, 'rgba(255,214,90,' + pulse + ')', 3); } }
    if (R.hover >= 0) hexFill(ctx, R.hover, null, 'rgba(255,255,255,0.7)', 1.5);
    // obstáculos y unidades ordenados por profundidad
    const draws = [];
    s.props.forEach(p => { const [x, y] = ART.hexCenter(p.c, p.r); draws.push({ y: y + 15, f: () => drawFlag(ctx, s, p, x, y, t) }); });
    for (const k in s.obstacles) { const i = +k, o = s.obstacles[k], [x, y] = ART.hexCenter(i % s.W, Math.floor(i / s.W)); draws.push({ y, f: () => drawObstacle(ctx, o, x, y) }); }
    for (const u of s.units) {
      const v = R.visOf(u);
      if (v.gone) continue;
      if (u.dead && !v.lock && !v.dying) { v.gone = true; continue; }
      if (!v.lock) { const [hx, hy] = ART.hexCenter(u.x, u.y); v.x += (hx - v.x) * 0.25; v.y += (hy - v.y) * 0.25; }
      draws.push({ y: v.y + v.dy, f: () => drawUnit(ctx, u, v, t) });
    }
    draws.sort((a, b) => a.y - b.y).forEach(d => d.f());
    // efectos especiales bajo el tinte
    drawSpecials(ctx, t);
    // tinte día/noche
    if (R.tintT) { const p = Math.max(0, Math.min(1, (t - R.tintT.t0) / R.tintT.dur)); R.tint = R.tintT.from.map((a, k) => a + (R.tintT.to[k] - a) * p); if (p >= 1) R.tintT = null; }
    const [tr, tg, tb, ta] = R.tint;
    if (ta > 0.005) {
      ctx.fillStyle = `rgba(${tr | 0},${tg | 0},${tb | 0},${ta})`; ctx.fillRect(-200, -200, R.mw + 400, R.mh + 400);
      const night = Math.max(0, (ta - 0.2) / 0.36);
      if (night > 0 && tb > tr) {
        ctx.globalCompositeOperation = 'lighter';
        for (const [lx, ly, rad] of R.lights) { const gr = ctx.createRadialGradient(lx, ly, 0, lx, ly, rad); gr.addColorStop(0, `rgba(255,190,100,${0.42 * night})`); gr.addColorStop(1, 'rgba(255,190,100,0)'); ctx.fillStyle = gr; ctx.fillRect(lx - rad, ly - rad, rad * 2, rad * 2); }
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    // ruta prevista
    if (H.path && H.path.length > 1) {
      ctx.fillStyle = '#fff3c4';
      H.path.forEach((i, k) => { if (!k) return; const [x, y] = ART.hexCenter(i % s.W, Math.floor(i / s.W)); ctx.fillRect(x - 3, y - 3, 6, 6); });
      const last = H.path[H.path.length - 1], [x, y] = ART.hexCenter(last % s.W, Math.floor(last / s.W));
      ctx.font = 'bold 14px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#1c1424'; ctx.strokeText(H.pathCost, x, y + 22); ctx.fillStyle = '#fff3c4'; ctx.fillText(H.pathCost, x, y + 22);
    }
    // partículas, proyectiles y textos
    for (let k = R.parts.length - 1; k >= 0; k--) {
      const p = R.parts[k]; p.life += 16; p.x += p.vx; p.y += p.vy; p.vy += p.grav;
      if (p.life > p.max) { R.parts.splice(k, 1); continue; }
      ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (let k = R.projs.length - 1; k >= 0; k--) {
      const p = R.projs[k], q = Math.max(0, Math.min(1, (t - p.t0) / p.dur));
      const x = p.x0 + (p.x1 - p.x0) * q, y = p.y0 + (p.y1 - p.y0) * q - Math.sin(q * Math.PI) * p.arc;
      if (p.kind === 'talk' || p.kind === 'shout') {
        ctx.strokeStyle = p.kind === 'shout' ? '#ffcc80' : '#d1c4e9'; ctx.lineWidth = 3;
        for (let w = 0; w < 3; w++) { ctx.beginPath(); ctx.arc(p.x0, p.y0, 10 + (q * 50 + w * 14), -0.5 + Math.atan2(p.y1 - p.y0, p.x1 - p.x0), 0.5 + Math.atan2(p.y1 - p.y0, p.x1 - p.x0)); ctx.stroke(); }
        if (p.kind === 'talk') { ctx.font = 'bold 12px "Pixelify Sans", monospace'; ctx.fillStyle = '#ede7f6'; ctx.fillText('bla bla', x, y - 10); }
      } else {
        const sp = projSprite(p.kind); ctx.save(); ctx.translate(x, y); ctx.rotate(q * 8 * (p.kind.startsWith('hamster') ? 0.2 : 1)); ctx.drawImage(sp, -12, -12, 24, 24); ctx.restore();
        if (p.kind.startsWith('hamster') && Math.random() < 0.8) R.part(x, y, ['#ffd54f', '#fff59d'], 1, { speed: 0.3, life: 400, up: 0, grav: 0 });
        if (p.kind === 'vomit' && Math.random() < 0.6) R.part(x, y, '#9ccc65', 1, { speed: 0.4, life: 300 });
      }
      if (q >= 1) { R.projs.splice(k, 1); p.res(); }
    }
    for (let k = R.floats.length - 1; k >= 0; k--) {
      const f = R.floats[k], q = Math.max(0, (t - f.t0) / f.dur);
      if (q >= 1) { R.floats.splice(k, 1); continue; }
      ctx.globalAlpha = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
      ctx.font = `bold ${f.size}px "Pixelify Sans", monospace`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#1c1424';
      ctx.strokeText(f.text, f.x, f.y - q * 34); ctx.fillStyle = f.col; ctx.fillText(f.text, f.x, f.y - q * 34);
    }
    ctx.globalAlpha = 1;
  };

  function drawFlag(ctx, s, p, x, y, t) {
    const own = p.owner >= 0, F = own ? VV.FACTIONS[s.factions[p.owner].id] : null;
    const px = x + 20, top = y - 74, base = y - 26, w = 26, h = 17;
    ctx.fillStyle = '#1a120c'; ctx.fillRect(px - 1, top - 2, 4, base - top + 2); ctx.fillStyle = '#7a5a3a'; ctx.fillRect(px, top, 2, base - top);
    ctx.fillStyle = '#d9a62e'; ctx.fillRect(px - 1, top - 4, 4, 3);
    const col = own ? F.col : '#e8e2d2', acc = own ? F.accent : '#9a948a';
    const wave = k => Math.sin(t / 260 + k * 0.45 + p.c) * 2.2 * (k / 8);
    ctx.beginPath(); ctx.moveTo(px + 2, top + 1);
    for (let k = 0; k <= 8; k++) ctx.lineTo(px + 2 + k * w / 8, top + 1 + wave(k));
    for (let k = 8; k >= 0; k--) ctx.lineTo(px + 2 + k * w / 8, top + 1 + h + wave(k));
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a120c'; ctx.stroke();
    ctx.fillStyle = acc; ctx.fillRect(px + 7, top + 4 + wave(3), 9, 3); ctx.fillRect(px + 10, top + 1 + wave(3), 3, 9);
    if (!own) { ctx.fillStyle = '#6d675e'; ctx.font = 'bold 9px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.fillText('?', px + 13, top + 12 + wave(5)); }
  }
  function drawObstacle(ctx, o, x, y) {
    const img = ART.obstacle(o.kind);
    ctx.drawImage(img, x - HW * SPR, y + 18 - FY * SPR, 64 * SPR, 76 * SPR);
    if (o.hp < o.max) { ctx.fillStyle = '#1c1424'; ctx.fillRect(x - 16, y + 20, 32, 5); ctx.fillStyle = '#ffb74d'; ctx.fillRect(x - 15, y + 21, 30 * o.hp / o.max, 3); }
  }

  const tintCache = new Map();
  function tinted(spr, col) {
    let m = tintCache.get(spr); if (!m) { m = {}; tintCache.set(spr, m); }
    if (m[col]) return m[col];
    const cv = ART.mk(spr.width, spr.height), c = cv.getContext('2d');
    c.drawImage(spr, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = col; c.fillRect(0, 0, cv.width, cv.height);
    m[col] = cv; return cv;
  }
  const bbCache = new Map();
  function topOf(spr) { if (!bbCache.has(spr)) bbCache.set(spr, ART.bbox(spr)); return bbCache.get(spr); }
  const AURA = {
    bubbles: ['#e1f5fe', '#b3e5fc'], gold: ['#ffd54f', '#fff59d'], red: ['#ff5252', '#ff8a80'], glitter: ['#f8bbd0', '#fff59d', '#b3e5fc'],
    hex: ['#ffca28', '#66bb6a', '#8d6e63'], toxic: ['#76ff03', '#b2ff59'], violet: ['#b388ff', '#7c4dff'], violet2: ['#b388ff', '#7c4dff', '#ea80fc'],
    green: ['#69f0ae', '#b9f6ca'], wine: ['#c2185b', '#880e4f'], wine2: ['#c2185b', '#ffd54f'], electric: ['#80d8ff', '#ffff8d'],
    flag: ['#d4af37', '#8c1c3a'], earth: ['#a1887f', '#795548'], shadow: ['#311b92', '#1a1a2e'], shout: ['#ffcc80'], music: ['#ea80fc', '#ffd54f'], vet: ['#ffd54f']
  };

  function drawUnit(ctx, u, v, t) {
    const s = R.s, d = VV.UNITS[u.def], lvl = v.lvl != null ? v.lvl : u.lvl;
    const L = d.levels[lvl];
    const idleF = Math.floor(t / 520 + u.id * 0.37) % 2 ? 'idle1' : 'idle0';
    const spr = ART.sprite(u.def, lvl, v.frame || idleF, u.vet);
    const sc = SPR * v.scale, x = v.x + v.dx, y = v.y + v.dy, fy = y + 18;
    const F = VV.FACTIONS[s.factions[u.fac].id];
    ctx.globalAlpha = v.alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, fy - 1, 17 * v.scale, 6 * v.scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = F.col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, fy - 1, 19, 7, 0, 0, Math.PI * 2); ctx.stroke();
    // aura
    const aura = L.sp.aura || (u.vet ? 'vet' : null);
    if (aura && !u.dead && Math.random() < (R.reduced ? 0.05 : 0.22)) R.part(x + (Math.random() - 0.5) * 30, fy - 10 - Math.random() * 40, AURA[aura] || '#fff', 1, { speed: 0.25, up: 0.5, grav: -0.005, life: 900, size: 2 });
    if (u.leader) { ctx.fillStyle = '#2b2118'; ctx.fillRect(x - 20 * v.face, fy - 70, 2, 46); ctx.fillStyle = F.col; const wv = Math.sin(t / 250) * 2; ctx.fillRect(x - 20 * v.face + (v.face > 0 ? -14 : 2), fy - 70 + wv * 0.3, 14, 10); ctx.fillStyle = '#f2c12e'; ctx.fillRect(x - 20 * v.face + (v.face > 0 ? -10 : 5), fy - 67, 6, 2); ctx.fillRect(x - 20 * v.face + (v.face > 0 ? -10 : 5), fy - 69, 1, 2); ctx.fillRect(x - 20 * v.face + (v.face > 0 ? -7 : 8), fy - 69, 1, 2); ctx.fillRect(x - 20 * v.face + (v.face > 0 ? -5 : 10), fy - 69, 1, 2); }
    const bob = v.frame === 'atk' ? 0 : 0;
    ctx.save();
    if (L.sp.ghost) { ctx.globalAlpha = v.alpha * (0.78 + 0.12 * Math.sin(t / 200)); ctx.shadowColor = '#b388ff'; ctx.shadowBlur = 12; }
    if (v.face < 0) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
    if (aura === 'shadow') { ctx.globalAlpha = v.alpha * 0.25; ctx.drawImage(spr, x - HW * sc - 8, fy - FY * sc, 64 * sc, 76 * sc); ctx.globalAlpha = v.alpha; }
    ctx.drawImage(spr, x - HW * sc, fy - FY * sc + bob, 64 * sc, 76 * sc);
    if (v.flash > 0) { ctx.globalAlpha = v.flash * v.alpha; ctx.drawImage(tinted(spr, v.flashCol), x - HW * sc, fy - FY * sc, 64 * sc, 76 * sc); v.flash = Math.max(0, v.flash - 0.06); }
    ctx.restore();
    ctx.globalAlpha = v.alpha;
    // barras
    const bb = topOf(spr), topY = fy - FY * sc + bb.y0 * sc - 10;
    const mh = E.maxHp(u), hp = v.hp != null ? v.hp : u.hp, w = 34;
    ctx.fillStyle = '#1c1424'; ctx.fillRect(x - w / 2 - 1, topY - 1, w + 2, 7);
    const fr = Math.max(0, hp / mh); ctx.fillStyle = fr > 0.6 ? '#5ccf5c' : fr > 0.3 ? '#f2c12e' : '#ef4f3a'; ctx.fillRect(x - w / 2, topY, w * fr, 3);
    const nx = E.xpNext(u); if (nx) { ctx.fillStyle = '#b388ff'; ctx.fillRect(x - w / 2, topY + 3, w * Math.min(1, u.xp / nx), 2); }
    ctx.fillStyle = F.col; ctx.fillRect(x - w / 2 - 6, topY - 1, 5, 7);
    // estados
    u.st.forEach((st, k) => { ctx.fillStyle = '#1c1424'; ctx.fillRect(x - w / 2 + k * 7 - 1, topY + 6, 7, 7); ctx.fillStyle = VV.STATUS[st.id].col; ctx.fillRect(x - w / 2 + k * 7, topY + 7, 5, 5); });
    if (u.armed) { ctx.fillStyle = '#ffd54f'; ctx.fillRect(x + w / 2 + 2, topY, 4, 4); }
    // indicador de unidad disponible
    if (R.showReady && u.fac === E.curFac(s) && !u.fresh && (u.mp > 0 || !u.attacked) && !u.dead) {
      const by = topY - 9 + Math.sin(t / 200) * 1.5; ctx.fillStyle = u.attacked ? '#9e9e9e' : '#ffffff';
      ctx.fillRect(x - 3, by, 6, 2); ctx.fillRect(x - 2, by + 2, 4, 2); ctx.fillRect(x - 1, by + 4, 2, 1);
    }
    if (u.summon) { const left = Math.max(0, Math.ceil((u.summon.until - s.turnIndex) / s.order.length)); ctx.font = 'bold 10px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#4a148c'; ctx.fillRect(x + 15, fy - 14, 12, 12); ctx.fillStyle = '#f3e5f5'; ctx.fillText(String(left), x + 21, fy - 4); }
    ctx.globalAlpha = 1;
  }

  function drawSpecials(ctx, t) {
    for (let k = R.specials.length - 1; k >= 0; k--) {
      const sp = R.specials[k], q = Math.max(0, (t - sp.t0) / sp.dur);
      if (q >= 1) { R.specials.splice(k, 1); continue; }
      const { x, y } = sp;
      ctx.save();
      switch (sp.kind) {
        case 'quake': ctx.strokeStyle = `rgba(60,40,20,${1 - q})`; ctx.lineWidth = 3; for (let a = 0; a < 7; a++) { ctx.beginPath(); ctx.moveTo(x, y + 14); let px = x, py = y + 14; for (let s2 = 0; s2 < 5; s2++) { px += Math.cos(a * 0.9) * 12 * q * 2; py += Math.sin(a * 0.9) * 6 * q * 2 + (s2 % 2 ? 3 : -3); ctx.lineTo(px, py); } ctx.stroke(); } break;
        case 'clock': ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#ede7f6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y - 40, 34, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x + Math.cos(q * 40) * 26, y - 40 + Math.sin(q * 40) * 26); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x + Math.cos(q * 4) * 16, y - 40 + Math.sin(q * 4) * 16); ctx.stroke();
          ctx.fillStyle = 'rgba(80,40,140,0.5)'; ctx.fillRect(x - 22, y - 120, 44, 40); ctx.fillRect(x - 28, y - 130, 56, 10); ctx.fillRect(x - 26, y - 82, 8, 18); ctx.fillRect(x + 18, y - 82, 8, 18); break;
        case 'dance': ctx.globalAlpha = 1 - q; for (let a = 0; a < 8; a++) { const ang = a / 8 * Math.PI * 2 + q * 6; ctx.fillStyle = a % 2 ? '#ea80fc' : '#ffd54f'; ctx.fillRect(x + Math.cos(ang) * 50 - 3, y - 20 + Math.sin(ang) * 26 - 3, 6, 6); } break;
        case 'shout': ctx.strokeStyle = `rgba(255,204,128,${1 - q})`; ctx.lineWidth = 4; for (let w = 0; w < 3; w++) { ctx.beginPath(); ctx.arc(x, y - 20, 20 + (q * 90 + w * 20), 0, Math.PI * 2); ctx.stroke(); } break;
        case 'muscle': ctx.globalAlpha = 1 - q; ctx.fillStyle = '#ff7043'; for (let a = 0; a < 10; a++) { const ang = a / 10 * Math.PI * 2; ctx.fillRect(x + Math.cos(ang) * q * 70, y - 30 + Math.sin(ang) * q * 50, 8, 4); } break;
        case 'vomit': ctx.globalAlpha = (1 - q) * 0.75; ctx.fillStyle = '#8bc34a'; for (let a = 0; a < 9; a++) { const r2 = 20 + q * 50; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r2 * 0.8, y - 10 + Math.sin(a * 1.7) * r2 * 0.4, 14 + a % 3 * 4, 0, Math.PI * 2); ctx.fill(); } break;
        case 'evolve': ctx.globalAlpha = Math.sin(q * Math.PI); const gr = ctx.createLinearGradient(x, y - 140, x, y + 20); gr.addColorStop(0, 'rgba(255,240,170,0)'); gr.addColorStop(1, 'rgba(255,230,120,0.8)'); ctx.fillStyle = gr; ctx.fillRect(x - 24, y - 140, 48, 160); break;
        case 'band': { // la charanga cruza el prao
          const row = sp.extra.row, [x0, yy] = ART.hexCenter(0, row), x1 = ART.hexCenter(R.s.W - 1, row)[0], bx = x0 + (x1 - x0) * q;
          for (let m = 0; m < 6; m++) { const mx = bx - m * 26, by = yy + 14 + Math.sin(t / 90 + m) * 3; ctx.fillStyle = ['#e53935', '#fdd835', '#1e88e5'][m % 3]; ctx.fillRect(mx - 6, by - 26, 12, 16); ctx.fillStyle = '#f2cba8'; ctx.fillRect(mx - 4, by - 34, 8, 8); ctx.fillStyle = '#212121'; ctx.fillRect(mx - 5, by - 10, 4, 8); ctx.fillRect(mx + 1, by - 10, 4, 8); ctx.fillStyle = '#d4af37'; ctx.fillRect(mx + 6, by - 24, 8, 5); }
          if (Math.random() < 0.3) R.part(bx, yy - 30, ['#ffd54f', '#ea80fc'], 1, { speed: 0.6, up: 1, grav: -0.01, life: 700 });
          break; }
        case 'rain': ctx.strokeStyle = 'rgba(180,210,240,0.5)'; ctx.lineWidth = 1.5; for (let a = 0; a < 140; a++) { const rx = (ART.hash(a, 1, 3) * R.mw + t * 0.05) % R.mw, ry = (ART.hash(a, 2, 3) * R.mh + t * 0.6) % R.mh; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 10); ctx.stroke(); } break;
        case 'ring': ctx.strokeStyle = sp.extra.col || '#ffd54f'; ctx.globalAlpha = 1 - q; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y + 16, 10 + q * 60, 4 + q * 22, 0, 0, Math.PI * 2); ctx.stroke(); break;
      }
      ctx.restore();
    }
  }

  /* ---------- Minimapa ---------- */
  R.drawMini = function (cv) {
    if (!R.s || !R.mini) return;
    const c = cv.getContext('2d'), k = R.mini.k;
    c.clearRect(0, 0, cv.width, cv.height); c.drawImage(R.mini.cv, 0, 0);
    R.s.props.forEach(p => { const [x, y] = ART.hexCenter(p.c, p.r); c.fillStyle = p.owner >= 0 ? VV.FACTIONS[R.s.factions[p.owner].id].accent : '#fff'; c.fillRect(x * k - 3, y * k - 3, 6, 6); c.strokeStyle = '#1c1424'; c.strokeRect(x * k - 3, y * k - 3, 6, 6); });
    R.s.units.forEach(u => { if (u.dead) return; const [x, y] = ART.hexCenter(u.x, u.y); c.fillStyle = VV.FACTIONS[R.s.factions[u.fac].id].col; c.fillRect(x * k - (u.leader ? 4 : 2.5), y * k - (u.leader ? 4 : 2.5), u.leader ? 8 : 5, u.leader ? 8 : 5); });
    c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.strokeRect(R.cam.x * k, R.cam.y * k, R.vw / R.cam.z * k, R.vh / R.cam.z * k);
  };
})(typeof window !== 'undefined' ? window : globalThis);
