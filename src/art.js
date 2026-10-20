/* LA BATALLA POR VILLAVICIOSA — art.js
   Pixel art programático con volumen:
   - Cada sprite se compone de formas (elipses, cápsulas, polígonos) con normales
     analíticas; se iluminan desde arriba a la izquierda y se cuantizan a rampas de
     cinco tonos con desplazamiento de tono (sombras frías, luces cálidas).
   - Oclusión de contacto entre piezas, luz de contorno cálida y contorno coloreado
     (sel-out), en la línea de los juegos tácticos de fantasía en pixel art.
   - Esqueleto posable (reposo A/B, preparación, golpe, dolor) y vestuario por capas.
   Los diseños de cada personaje están en designs.js. */
(function (G) {
  const VV = G.VV;
  const ART = (VV.Art = {});
  const SW = 64, SH = 76, GY = 72;
  Object.assign(ART, { SW, SH, GY });

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  ART.mk = mk;
  /* ---------- Color ---------- */
  function hex3(h) { return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; }
  function rgb(h) { h = hex3(h); const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hex(r, g, b) { return '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1); }
  function toHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
    return [h, s, l];
  }
  function fromHsl(h, s, l) {
    const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
  }
  function lerpHue(a, b, t) { let d = b - a; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; return (a + d * t + 1) % 1; }
  function sh(h, f) { const [r, g, b] = rgb(h); return f < 0 ? hex(r * (1 + f), g * (1 + f), b * (1 + f)) : hex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f); }
  function mix(a, b, t) { const A = rgb(a), B = rgb(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  Object.assign(ART, { sh, mix, rgb });
  const OFF = { cloth: [-0.27, -0.13, 0, 0.1, 0.19], skin: [-0.2, -0.1, 0, 0.07, 0.13], metal: [-0.33, -0.16, 0, 0.18, 0.36], hair: [-0.24, -0.12, 0, 0.1, 0.2],
    wood: [-0.24, -0.12, 0, 0.08, 0.16], leaf: [-0.24, -0.12, 0, 0.1, 0.2], stone: [-0.25, -0.12, 0, 0.09, 0.18], glass: [-0.18, -0.08, 0, 0.12, 0.25], fur: [-0.22, -0.1, 0, 0.05, 0.08] };
  const rcache = new Map();
  function ramp(base, kind) {
    const key = base + kind; if (rcache.has(key)) return rcache.get(key);
    const [h, s, l] = toHsl(rgb(base)), off = OFF[kind] || OFF.cloth;
    const r = off.map(d => {
      let hh = h, ss = s; const ll = l + d * (l < 0.18 ? 1.25 : 1);
      if (d < 0) { hh = lerpHue(h, kind === 'skin' ? 0.97 : 0.68, -d * 0.85); ss = Math.min(1, s + (-d) * 0.3); }
      else if (d > 0) { hh = lerpHue(h, 0.14, d * 0.6); ss = s * (1 - d * 0.5); }
      if (kind === 'cloth') ss *= 0.86;
      return hex(...fromHsl(hh, ss, Math.max(0.03, Math.min(0.97, ll))));
    });
    rcache.set(key, r); return r;
  }
  const mcache = new Map();
  function M(base, kind) { const k = base + '|' + (kind || 'cloth'); if (!mcache.has(k)) mcache.set(k, { r: ramp(base, kind || 'cloth'), kind: kind || 'cloth' }); return mcache.get(k); }
  function F(c) { const k = 'flat|' + c; if (!mcache.has(k)) mcache.set(k, { flat: true, c, r: [sh(c, -0.4), sh(c, -0.4), c, c, c] }); return mcache.get(k); }
  ART.M = M; ART.F = F;
  function hash(x, y, k) { let h = (x * 374761393 + y * 668265263 + (k || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  ART.hash = hash;

  /* ---------- Rasterizador de formas ---------- */
  const LX = -0.497, LY = -0.677, LZ = 0.542, BAYER = [0, 2, 3, 1];
  function Spr(w, h, k) { this.w = w; this.h = h; this.k = k || 1; this.s = []; }
  Spr.prototype.add = function (o) { this.s.push(o); return o; };
  Spr.prototype.ell = function (cx, cy, rx, ry, m, o) { return this.add(Object.assign({ t: 'e', cx, cy, rx, ry, m }, o)); };
  Spr.prototype.cap = function (x1, y1, x2, y2, r1, r2, m, o) { return this.add(Object.assign({ t: 'c', x1, y1, x2, y2, r1, r2: r2 == null ? r1 : r2, m }, o)); };
  Spr.prototype.poly = function (pts, m, o) { return this.add(Object.assign({ t: 'p', pts, m }, o)); };
  Spr.prototype.rect = function (x, y, w, h, m, o) { return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], m, Object.assign({ bev: 0.8 }, o)); };
  function bbox(s) {
    if (s.t === 'e') return [s.cx - s.rx, s.cy - s.ry, s.cx + s.rx, s.cy + s.ry];
    if (s.t === 'c') { const r = Math.max(s.r1, s.r2); return [Math.min(s.x1, s.x2) - r, Math.min(s.y1, s.y2) - r, Math.max(s.x1, s.x2) + r, Math.max(s.y1, s.y2) + r]; }
    let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of s.pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d];
  }
  function sample(s, x, y, out) {
    if (s.t === 'e') {
      const dx = (x - s.cx) / s.rx, dy = (y - s.cy) / s.ry, d = dx * dx + dy * dy; if (d > 1) return false;
      const R = s.round == null ? 1 : s.round; const nx = dx * R, ny = dy * R, nz = Math.sqrt(1 - d) + (1 - R); const L = Math.hypot(nx, ny, nz) || 1;
      out[0] = nx / L; out[1] = ny / L; out[2] = nz / L; out[3] = (1 - Math.sqrt(d)) * Math.min(s.rx, s.ry); return true;
    }
    if (s.t === 'c') {
      const vx = s.x2 - s.x1, vy = s.y2 - s.y1, ll = vx * vx + vy * vy || 1e-6;
      let t = ((x - s.x1) * vx + (y - s.y1) * vy) / ll; t = Math.max(0, Math.min(1, t));
      const px = s.x1 + vx * t, py = s.y1 + vy * t, r = s.r1 + (s.r2 - s.r1) * t, ex = x - px, ey = y - py, dd = Math.hypot(ex, ey);
      if (dd > r) return false;
      const nx = ex / r, ny = ey / r; out[0] = nx; out[1] = ny; out[2] = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)); out[3] = r - dd; return true;
    }
    const P = s.pts; let inside = false, best = 1e9, ox = 0, oy = 0;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
      const vx = xi - xj, vy = yi - yj, l2 = vx * vx + vy * vy || 1e-6; let t = ((x - xj) * vx + (y - yj) * vy) / l2; t = Math.max(0, Math.min(1, t));
      const cx = xj + vx * t, cy = yj + vy * t, d = Math.hypot(cx - x, cy - y); if (d < best) { best = d; ox = cx - x; oy = cy - y; }
    }
    if (!inside) return false;
    const bev = s.bev == null ? 2.2 : s.bev; let nx = 0, ny = 0, nz = 1;
    if (best < bev && best > 0) { const kk = 1 - best / bev; nx = ox / best * kk; ny = oy / best * kk; nz = Math.sqrt(1 - kk * kk); }
    if (s.cyl) { const bb = s._bb || (s._bb = bbox(s)); const c = (bb[0] + bb[2]) / 2, hw = (bb[2] - bb[0]) / 2 || 1; const cx = Math.max(-0.95, Math.min(0.95, (x - c) / hw)); nx = nx + cx * 0.75; nz = nz * Math.sqrt(1 - cx * cx); }
    const L = Math.hypot(nx, ny, nz) || 1; out[0] = nx / L; out[1] = ny / L; out[2] = nz / L; out[3] = best; return true;
  }
  Spr.prototype.render = function (opt) {
    opt = opt || {};
    const k = this.k, W = Math.round(this.w * k), H = Math.round(this.h * k), N = W * H;
    const id = new Int16Array(N).fill(-1), val = new Float32Array(N), nxb = new Float32Array(N), trim = new Uint8Array(N), n = [0, 0, 1, 0];
    this.s.forEach((s, si) => {
      const [a, b, c, d] = bbox(s), x0 = Math.max(0, Math.floor(a * k)), y0 = Math.max(0, Math.floor(b * k)), x1 = Math.min(W - 1, Math.ceil(c * k)), y1 = Math.min(H - 1, Math.ceil(d * k));
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
        if (!sample(s, (px + 0.5) / k, (py + 0.5) / k, n)) continue;
        const i = py * W + px; id[i] = si;
        val[i] = 0.08 + 0.98 * Math.max(0, n[0] * LX + n[1] * LY + n[2] * LZ) + (s.light || 0);
        nxb[i] = n[0]; trim[i] = s.trim && n[3] < (s.trimW || 0.95) ? 1 : 0;
      }
    });
    const cv = mk(W, H), ctx = cv.getContext('2d', { willReadFrequently: true }), im = ctx.createImageData(W, H), D = im.data;
    const rim = opt.rim === false ? null : (opt.rim || '#ffd9a6'), INK = '#130b12';
    const col = new Array(N);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const i = py * W + px, si = id[i]; if (si < 0) continue;
      const s = this.s[si], m = trim[i] ? s.trim : s.m;
      let c;
      if (m.flat) c = m.c;
      else {
        const lx = Math.floor(px / k), ly = Math.floor(py / k);
        let v = val[i] + (BAYER[(py & 1) * 2 + (px & 1)] - 1.5) * 0.03;
        if (m.kind !== 'metal' && m.kind !== 'glass') v += (hash(lx, ly, 11) - 0.5) * 0.11;
        let q = v < 0.33 ? 0 : v < 0.52 ? 1 : v < 0.7 ? 2 : v < 0.87 ? 3 : 4;
        if (m.kind === 'hair' && (lx * 2 + ly) % 4 === 0 && q > 0) q--;
        if (m.kind === 'hair' && (lx * 2 + ly) % 7 === 1 && q < 4 && v > 0.6) q++;
        if (m.kind === 'wood' && ly % 3 === 0 && q > 0) q--;
        if ((m.kind === 'stone' || m.kind === 'leaf' || m.kind === 'fur') && hash(lx, ly, 3) < 0.22 && q > 0) q--;
        if ((m.kind === 'leaf' || m.kind === 'fur') && hash(lx, ly, 5) > 0.86 && q < 4) q++;
        if (s.folds && (lx % s.folds === 0) && q > 0) q--;
        const up = py - Math.max(1, k >> 1);
        if (up >= 0) {
          const a1 = id[up * W + px], a2 = px > 0 ? id[up * W + px - 1] : -1;
          if ((a1 > si && !this.s[a1].m.flat && !this.s[a1].noAO) || (a2 > si && !this.s[a2].m.flat && !this.s[a2].noAO)) q = Math.max(0, q - 1);
        }
        c = m.r[q];
        if (m.kind === 'metal' && v > 0.93) c = mix(c, '#ffffff', 0.6);
        if (m.kind === 'glass' && v > 0.9) c = '#ffffff';
        if (rim && !s.noRim && nxb[i] > 0.15 && (px === W - 1 || id[i + 1] < 0)) c = mix(c, rim, 0.32);
      }
      col[i] = c;
    }
    // Líneas interiores: el borde de cada pieza superpuesta se oscurece donde toca otra pieza de distinto material
    const lw = Math.max(1, Math.round(k * 0.7));
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const i = py * W + px, si = id[i]; if (si < 0) continue;
      const s = this.s[si]; if (s.m.flat || s.noLine) continue;
      let line = false;
      for (let d = 1; d <= lw && !line; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
        const x = px + dx, y = py + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const sj = id[y * W + x];
        if (sj >= 0 && sj < si && this.s[sj].m !== s.m && !this.s[sj].m.flat && !this.s[sj].noLine) { line = true; break; }
      }
      if (line) col[i] = mix(s.m.r[0], INK, 0.45);
    }
    for (let i = 0; i < N; i++) { if (id[i] < 0) continue; const [r, g, b] = rgb(col[i]); D[i * 4] = r; D[i * 4 + 1] = g; D[i * 4 + 2] = b; D[i * 4 + 3] = this.s[id[i]].alpha ? Math.round(255 * this.s[id[i]].alpha) : 255; }
    if (opt.outline !== false) {
      const ink = rgb(INK), ow = Math.max(1, Math.round(k * 0.8));
      const solid = new Uint8Array(N); for (let i = 0; i < N; i++) solid[i] = id[i] >= 0 ? 1 : 0;
      for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
        const i = py * W + px; if (solid[i]) continue;
        let nb = -1;
        for (let d = 1; d <= ow && nb < 0; d++) {
          if (px >= d && solid[i - d]) nb = i - d; else if (px < W - d && solid[i + d]) nb = i + d; else if (py >= d && solid[i - W * d]) nb = i - W * d; else if (py < H - d && solid[i + W * d]) nb = i + W * d;
        }
        if (nb < 0) continue;
        const [r, g, b] = rgb(this.s[id[nb]].m.r[0]);
        D[i * 4] = r + (ink[0] - r) * 0.82; D[i * 4 + 1] = g + (ink[1] - g) * 0.82; D[i * 4 + 2] = b + (ink[2] - b) * 0.82; D[i * 4 + 3] = 255;
      }
    }
    ctx.putImageData(im, 0, 0);
    return cv;
  };
  ART.Spr = Spr;
  /* ---------- Pintor de píxeles simple (iconos y proyectiles) ---------- */
  function P(ctx) {
    return {
      ctx,
      r(x, y, w, h, c) { if (w <= 0 || h <= 0) return; ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
      p(x, y, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); },
      circ(cx, cy, rad, c, ring) { ctx.fillStyle = c; for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) { const d = x * x + y * y; if (d <= rad * rad + rad * 0.6 && (!ring || d >= (rad - ring) * (rad - ring))) ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1); } }
    };
  }
  ART.P = P;
  ART.hamster = function (g, x, y, gear) {
    g.r(x, y, 5, 4, '#d9a066'); g.r(x + 1, y + 2, 3, 2, '#f3dcb2'); g.p(x, y - 1, '#c48a4f'); g.p(x + 4, y - 1, '#c48a4f'); g.p(x + 3, y + 1, '#1c1424'); g.p(x + 5, y + 2, '#f48fb1');
    if (gear === 'goggles') { g.r(x + 2, y, 3, 1, '#5d4037'); g.p(x + 3, y, '#80deea'); }
    if (gear === 'helmet') { g.r(x, y - 2, 5, 2, '#b0bec5'); g.p(x + 2, y - 3, '#e53935'); g.r(x - 2, y + 1, 2, 3, '#f2c12e'); }
  };


  /* ---------- Constitución y esqueleto (vista frontal en tres cuartos) ---------- */
  const BUILDS = {
    thin: { H: 60, sw: 4.4, hw: 3.2, ar: 1.7, lr: 1.9, hs: 0.95 }, slim: { H: 52, sw: 4.7, hw: 3.4, ar: 1.9, lr: 2.2 },
    norm: { H: 53, sw: 5.3, hw: 3.8, ar: 2.1, lr: 2.5 }, ath: { H: 55, sw: 6.1, hw: 3.9, ar: 2.5, lr: 2.8 },
    tall: { H: 60, sw: 5.7, hw: 3.9, ar: 2.2, lr: 2.6 }, short: { H: 45, sw: 4.7, hw: 3.6, ar: 2, lr: 2.4, hs: 1.1 },
    big: { H: 58, sw: 7.3, hw: 5.8, ar: 3, lr: 3.3, belly: 5, hs: 1.05 }, huge: { H: 64, sw: 9.3, hw: 7.4, ar: 3.9, lr: 4.2, belly: 7, hs: 1.05 },
    muscle: { H: 62, sw: 9.6, hw: 5, ar: 3.5, lr: 3.9, hs: 1.0 }, kid: { H: 37, sw: 3.9, hw: 3, ar: 1.7, lr: 2, hs: 1.15 }
  };
  const POSES = {
    idle0: { lean: 0, bob: 0, arm: 'idle', step: 0 }, idle1: { lean: 0, bob: 0.7, arm: 'idle', step: 0, sway: 0.6 },
    wind: { lean: -1, bob: 0, arm: 'wind', step: 1 }, atk: { lean: 2.5, bob: 0.4, arm: 'atk', step: 3 }, hurt: { lean: -2.5, bob: 1, arm: 'hurt', step: -1 }
  };
  const SKN = '#e7b48b', GOLD = '#d9a62e';

  function skeleton(sp, pose, cx, opt) {
    const B = Object.assign({}, BUILDS[sp.b || 'norm']);
    if (sp.fem) { B.hw += 0.6; B.sw -= 0.5; }
    const H = B.H + (sp.dh || 0), gy = GY - (opt.lift || 0), P = POSES[pose] || POSES.idle0;
    const lean = P.lean, bob = P.bob;
    const up = opt.seated ? H * 0.47 - 15 : 0, Y = v => v + up;
    const hr = H * 0.088 * (B.hs || 1);
    const hipY = Y(gy - H * 0.47), kneeY = gy - H * 0.24, shY = Y(gy - H * 0.765 + bob), waistY = Y(gy - H * 0.585 + bob * 0.5);
    const neckY = shY - hr * 0.5, tx = cx + lean * 0.5;
    const head = [cx + lean * 0.8 + 0.5, neckY - hr * 0.92];
    const shN = [tx + B.sw, shY + 0.3], shF = [tx - B.sw, shY + 0.3];
    const hipN = [cx + B.hw * 0.55, hipY], hipF = [cx - B.hw * 0.55, hipY];
    const st = P.step || 0, wide = sp.stance === 'wide' ? 2 : 0;
    let footN = [cx + B.hw * 0.62 + 2.6 + wide + st, gy], footF = [cx - B.hw * 0.62 - 2.6 - wide - st * 0.4, gy];
    let kneeN = [(hipN[0] + footN[0]) / 2 + 0.7, kneeY], kneeF = [(hipF[0] + footF[0]) / 2 - 0.7, kneeY];
    if (opt.seated) { kneeN = [hipN[0] + 5, hipY + 1]; footN = [kneeN[0] + 1, gy - 2]; kneeF = [hipF[0] + 4, hipY]; footF = [kneeF[0] + 0.5, gy - 3]; }
    const ua = H * 0.16, fa = H * 0.145, sw = P.sway || 0;
    const mode = (near) => P.arm === 'idle' ? ((near ? sp.hold : sp.holdF) ? 'hold' : sp.armsOut ? 'zombie' : 'idle') : P.arm;
    const arm = (sh, m, near) => {
      const s = near ? 1 : -1; let el, ha;
      switch (m) {
        case 'hold': el = [sh[0] + s * 2.2, sh[1] + ua * 0.86]; ha = [el[0] + s * fa * 0.55, el[1] + fa * 0.5 + sw * 0.4]; break;
        case 'zombie': el = [sh[0] + s * 0.8 + 1, sh[1] + ua * 0.72]; ha = [sh[0] + (near ? 4.5 : 2.5), sh[1] + ua * 0.7 + sw * 0.5]; break;
        case 'wind': if (near) { el = [sh[0] + 3.4, sh[1] - ua * 0.45]; ha = [el[0] - 0.6, el[1] - fa * 0.85]; } else { el = [sh[0] - 2, sh[1] + ua * 0.78]; ha = [el[0] + fa * 0.3, el[1] + fa * 0.55]; } break;
        case 'atk': if (near) { el = [sh[0] + ua * 0.9, sh[1] + ua * 0.25]; ha = [el[0] + fa * 0.95, el[1] + fa * 0.05]; } else { el = [sh[0] - ua * 0.6, sh[1] + ua * 0.68]; ha = [el[0] - fa * 0.5, el[1] + fa * 0.55]; } break;
        case 'hurt': el = [sh[0] + s * 2.6, sh[1] + ua * 0.6]; ha = [el[0] + s * fa * 0.7, el[1] - fa * 0.15]; break;
        default: el = [sh[0] + s * 2.3, sh[1] + ua * 0.9]; ha = [el[0] + s * 2.6, el[1] + fa * 0.84 + sw];
      }
      return { sh, el, ha };
    };
    return { B, H, gy, hr, head, shN, shF, hipN, hipF, kneeN, kneeF, footN, footF, waistY, neckY, shY, hipY, lean, cx, tx, armN: arm(shN, mode(true), true), armF: arm(shF, mode(false), false), pose };
  }

  /* ---------- Figura humana ---------- */
  function figure(S, sp, pose, cx, opt) {
    opt = opt || {};
    const K = skeleton(sp, pose, cx, opt), B = K.B, hr = K.hr, hx = K.head[0], hy = K.head[1], tx = K.tx, fx = tx + 0.7;
    const skin = M(sp.skin || SKN, 'skin'), skinF = sp.skin || SKN, gold = M(GOLD, 'metal');
    const top = sp.top || ['tee', '#888888'];
    const shirt = M(top[1]), legs = M(sp.legs || '#37474f'), shoeC = (sp.shoes || [])[1] || '#2b2b2b', shoeK = (sp.shoes || [])[0] || 'shoes';
    const W = {}; (sp.wear || []).forEach(w => { W[w[0]] = w; });
    const coat = W.robe || W.cloak || W.coat || W.dress;
    const tr = c => (c ? M(c, 'metal') : null);
    const sleeveM = W.jacket ? M(W.jacket[1]) : W.suit ? M(W.suit[1]) : W.leather ? M(W.leather[1]) : W.coat ? M(W.coat[1]) : W.robe ? M(W.robe[1]) : W.cloak ? M(W.cloak[1]) : W.armor ? M(W.armor[1], 'metal') : W.gi ? M(W.gi[1]) : W.hoodie ? M(W.hoodie[1]) : W.sequin ? M(W.sequin[1]) : shirt;
    const sleeve = ['tank', 'none', 'torn', 'rock'].includes(top[0]) && sleeveM === shirt ? 0 : (['tee', 'polo', 'oversize', 'sport', 'open'].includes(top[0]) && sleeveM === shirt ? 0.5 : 1);
    const cuffM = W.robe && W.robe[2] ? M(W.robe[2], 'metal') : W.armor ? M(W.armor[2] || GOLD, 'metal') : W.suit && W.suit[3] ? null : null;
    const handM = W.gloves ? M(W.gloves[1]) : W.biggloves ? M(W.biggloves[1]) : W.spikegloves ? M('#2a2a32') : skin;
    const handR = (W.biggloves ? 2.1 : W.bigfists ? 1.8 : 1.12) * B.ar;
    const muscle = sp.b === 'muscle';
    // 1) Capa por detrás
    if (W.cape || W.bigcape || W.capecheck || W.capebills || W.boardcape) {
      const c = W.cape || W.bigcape, wide = W.bigcape ? 5 : 2.5, flap = pose === 'idle1' ? 1 : pose === 'atk' ? 3 : 0;
      const pts = [[K.shF[0] - 0.5, K.shY - 1.5], [K.shN[0] + 0.5, K.shY - 1.5], [K.shN[0] + wide + 1 - flap * 0.4, K.gy - 1], [K.cx + 1, K.gy + 0.2], [K.shF[0] - wide - 2 - flap, K.gy - 0.5]];
      const m = W.capecheck ? M('#c8372f') : W.capebills ? M('#5f9234') : W.boardcape ? M('#b98d36') : M(c[1]);
      S.poly(pts, m, { bev: 2.5, folds: 3, light: -0.08, trim: c && c[2] ? tr(c[2]) : W.capecheck ? null : gold, trimW: 0.9 });
      const capeObj = { t: 'p', pts }, inCape = (x, y) => sample(capeObj, x, y, [0, 0, 0, 0]);
      const bb = bbox(capeObj);
      for (let y = bb[1] + 2; y < bb[3] - 1; y += 3) for (let x = bb[0]; x < bb[2]; x += 3) {
        if (!inCape(x, y) || !inCape(x + 2.6, y + 2.6)) continue;
        const ix = Math.round(x / 3), iy = Math.round(y / 3);
        if (W.capecheck && (ix + iy) % 2) S.rect(x, y, 2.8, 2.8, M('#efe8dc'), { noAO: true, bev: 0.4, noLine: true });
        if (W.capebills && hash(ix, iy, 7) < 0.35) S.rect(x, y + 0.6, 2.8, 1.6, M('#2e5e1c'), { noAO: true, bev: 0.3, noLine: true });
        if (W.boardcape) S.rect(x + 0.2, y + 0.2, 2.6, 2.6, M(['#e8a325', '#3f9a44', '#8a6b5f', '#8f9ea6', '#d4433a'][(ix * 3 + iy * 2) % 5]), { noAO: true, bev: 0.5, noLine: true });
      }
    }
    if (W.barrelback) { S.cap(K.shF[0] - 3, K.shY - 5, K.shF[0] - 3, K.shY + 8, 5.2, 5.2, M('#8b5a2b', 'wood')); S.rect(K.shF[0] - 8.2, K.shY - 2, 10.4, 1.3, M('#5b5b66', 'metal')); S.rect(K.shF[0] - 8.2, K.shY + 5, 10.4, 1.3, M('#5b5b66', 'metal')); }
    if (W.barrels2) [[K.shF[0] - 2, K.shY - 7], [K.shN[0] + 2, K.shY - 7]].forEach(([x, y]) => { S.cap(x - 4, y, x + 4, y, 4.2, 4.2, M('#7b1f2a', 'wood')); S.rect(x - 1.8, y - 4.2, 1.3, 8.4, gold); S.rect(x + 1.6, y - 4.2, 1.3, 8.4, gold); });
    if (W.backpack) S.rect(K.shF[0] - 3, K.shY + 0.5, 4, K.H * 0.22, M('#6d4c41'), { bev: 1.5 });
    if (W.flagpole) { S.cap(K.shF[0] - 5, K.gy, K.shF[0] - 5, 4, 0.8, 0.8, M('#5d4037', 'wood')); S.poly([[K.shF[0] - 4, 5], [K.shF[0] + 9, 6], [K.shF[0] + 7, 13.5], [K.shF[0] - 4, 13]], M(W.flagpole[1] || '#8c1c3a'), { folds: 3, trim: gold }); S.ell(K.shF[0] + 2, 9.4, 2, 2, gold); }
    if (W.cloak || W.hoodup) S.ell(hx, hy - hr * 0.1, hr * 1.35, hr * 1.35, M((W.cloak || W.hoodup)[1]), { light: -0.15 });
    hairBack(S, sp, K);
    // 2) Piernas
    const legMat = W.robe || W.cloak ? M(coat[1]) : legs;
    const drawLeg = (hip, knee, foot, far) => {
      const o = { light: far ? -0.08 : 0 };
      S.cap(hip[0], hip[1], knee[0], knee[1], B.lr * 1.16, B.lr * 0.98, legMat, o);
      const ankle = [foot[0], foot[1] - 2.2];
      if (shoeK === 'boots') { const mid = [(knee[0] * 0.45 + ankle[0] * 0.55), (knee[1] * 0.45 + ankle[1] * 0.55)]; S.cap(knee[0], knee[1], mid[0], mid[1], B.lr * 0.98, B.lr * 0.9, legMat, o); S.cap(mid[0], mid[1] - 0.6, ankle[0], ankle[1], B.lr * 1.12, B.lr * 1.0, M(shoeC), Object.assign({ trim: sp.bootTrim ? gold : null, trimW: 0.6 }, o)); }
      else S.cap(knee[0], knee[1], ankle[0], ankle[1], B.lr * 0.98, B.lr * 0.8, shoeK === 'bare' ? skin : legMat, o);
      const big = shoeK === 'bigsneak' ? 1.4 : 1, dir = far ? -1 : 1;
      S.ell(foot[0] + dir * 0.9 * big, foot[1] - 1.4, (B.lr * 1.1 + 0.8) * big, 1.9 * big, shoeK === 'bare' ? skin : M(shoeC), Object.assign({ round: 0.6 }, o));
      if (shoeK === 'sneak' || shoeK === 'bigsneak') S.rect(foot[0] - B.lr * 1.1 * big + dir * 0.9 * big, foot[1] - 0.9, (B.lr * 2.2 + 1.6) * big, 0.8, F('#f2f2f2'));
    };
    if (!opt.seated || true) { drawLeg(K.hipF, K.kneeF, K.footF, true); drawLeg(K.hipN, K.kneeN, K.footN, false); }
    // 3) Brazo lejano (por detrás del torso)
    const drawArm = (A, far) => {
      const o = { light: far ? -0.12 : 0 }, ar = B.ar;
      const upM = sleeve ? sleeveM : skin, loM = sleeve === 1 ? sleeveM : skin;
      S.ell(A.sh[0], A.sh[1] + 0.3, ar * 1.3, ar * 1.3, upM, o);
      S.cap(A.sh[0], A.sh[1], A.el[0], A.el[1], ar * (muscle ? 1.35 : 1.08), ar * (muscle ? 1.0 : 0.98), upM, o);
      S.cap(A.el[0], A.el[1], A.ha[0], A.ha[1], ar * (muscle ? 1.08 : 0.96), ar * 0.82, loM, Object.assign({ trim: sleeve === 1 && cuffM ? cuffM : null, trimW: 0.5 }, o));
      if (W.wrist || W.gloves) S.cap(A.el[0] + (A.ha[0] - A.el[0]) * 0.65, A.el[1] + (A.ha[1] - A.el[1]) * 0.65, A.ha[0], A.ha[1], ar * 1.0, ar * 0.95, W.gloves ? M(W.gloves[1]) : M(W.wrist[1] || '#f2f2f2'), o);
      S.ell(A.ha[0], A.ha[1], handR, handR * 1.05, handM, o);
      if (W.spikegloves) { S.poly([[A.ha[0] - 1, A.ha[1] - handR], [A.ha[0], A.ha[1] - handR - 2.2], [A.ha[0] + 1, A.ha[1] - handR]], M('#cfd8dc', 'metal')); S.poly([[A.ha[0] + handR - 0.5, A.ha[1] - 1], [A.ha[0] + handR + 2, A.ha[1]], [A.ha[0] + handR - 0.5, A.ha[1] + 1]], M('#cfd8dc', 'metal')); }
    };
    drawArm(K.armF, true);
    if (sp.holdF) item(S, sp.holdF, K.armF, K, true);
    // 4) Torso
    const wHalf = B.sw * (sp.fem ? 0.66 : 0.8);
    const torsoPts = [[K.shF[0] - 0.4, K.shY - 1.2], [K.shN[0] + 0.4, K.shY - 1.2], [K.shN[0] + 0.9, K.shY + 2.2], [tx + wHalf, K.waistY], [tx + B.hw + 0.9, K.hipY + 1.6], [tx - B.hw - 0.9, K.hipY + 1.6], [tx - wHalf, K.waistY], [K.shF[0] - 0.9, K.shY + 2.2]];
    const torsoM = top[0] === 'none' ? skin : top[0] === 'rock' ? M(top[1], 'stone') : shirt;
    const ext = (pts, d) => pts.map(([x, y]) => [x + (x < tx ? -d : d), y - (y < K.shY + 1 ? d * 0.5 : 0)]);
    if (top[0] === 'oversize') S.poly(ext(torsoPts.map(([x, y]) => [x, y > K.hipY ? y + 4 : y]), 1.1), torsoM, { cyl: 1, folds: 4 });
    else S.poly(torsoPts, torsoM, { cyl: 1 });
    if (sp.fem && top[0] !== 'none') { S.ell(tx - wHalf * 0.45, K.shY + 4, wHalf * 0.5, 2.2, torsoM, { round: 0.8, noLine: true }); S.ell(tx + wHalf * 0.55, K.shY + 4, wHalf * 0.5, 2.2, torsoM, { round: 0.8, noLine: true }); }
    if (B.belly) S.ell(tx + 0.8, K.waistY + 2.2, B.belly * 0.9 + 3, K.H * 0.12, W.barrel ? M('#8b5a2b', 'wood') : (W.vest || W.waiter ? M((W.vest || W.waiter)[1]) : W.armor ? M(W.armor[1], 'metal') : torsoM), { noLine: !(W.vest || W.waiter) });
    if (top[0] === 'tank' || top[0] === 'torn') S.poly([[K.shF[0] + 1.5, K.shY - 1.2], [K.shN[0] - 1.5, K.shY - 1.2], [fx + 1.2, K.shY + 2.5], [fx - 1.2, K.shY + 2.5]], skin, { bev: 1 });
    if (top[0] === 'open') S.poly([[fx - 2.4, K.shY - 1.2], [fx + 2.4, K.shY - 1.2], [fx, K.waistY - 1]], skin, { bev: 1.2 });
    if (top[0] === 'torn') [[tx - 3, K.shY + 6, 1.6], [tx + 3, K.waistY - 1, 1.3], [tx - 1, K.hipY - 1, 1.4]].forEach(([x, y, r]) => S.ell(x, y, r * 1.4, r, skin));
    if (top[0] === 'rock') [[tx - 4, K.shY + 3, 2.6], [tx + 3, K.shY + 7, 3], [tx - 2, K.waistY + 2, 2.8], [tx + 4, K.hipY - 1, 2.3]].forEach(([x, y, r]) => S.ell(x, y, r * 1.3, r, M(top[2] || '#6c655c', 'stone')));
    if (top[0] === 'sport' && top[2]) S.rect(tx - wHalf - 0.6, K.shY + K.H * 0.085, wHalf * 2 + 1.2, 1.6, M(top[2]), { noLine: true });
    if (top[0] === 'polo') { S.poly([[fx - 2.2, K.shY - 1.4], [fx, K.shY + 2], [fx - 0.4, K.shY - 1.4]], M(sh(top[1], -0.12)), { bev: 0.6 }); S.poly([[fx + 2.2, K.shY - 1.4], [fx, K.shY + 2], [fx + 0.4, K.shY - 1.4]], M(sh(top[1], -0.12)), { bev: 0.6 }); }
    if (top[0] === 'shirt') S.poly([[fx - 1.4, K.shY - 1.3], [fx + 1.4, K.shY - 1.3], [fx, K.shY + 1.6]], skin, { bev: 0.6, noLine: true });
    // Faldones
    if (coat) {
      const w = coat, hem = W.coat ? K.kneeN[1] + 3 : W.dress ? K.kneeN[1] + 1 : K.gy - 1.2, fl = W.cloak ? 6 : W.robe ? 4.5 : 3;
      const top0 = W.cloak ? K.shY - 1 : K.waistY - 1;
      const pts = [[tx - wHalf - (W.cloak ? 3.2 : 0.6), top0], [tx + wHalf + (W.cloak ? 3.2 : 0.6), top0], [K.cx + B.hw + fl + K.lean * 0.3, hem], [K.cx + 1, hem + 0.6], [K.cx - B.hw - fl, hem]];
      S.poly(pts, M(w[1]), { cyl: 1, folds: 4, trim: w[2] ? tr(w[2]) : null, trimW: 1.0 });
      if (w[2] && !W.cloak) S.poly([[fx - 0.6, top0 + 1], [fx + 0.6, top0 + 1], [fx + 0.9, hem - 0.5], [fx - 0.9, hem - 0.5]], M(w[2], 'metal'), { bev: 0.5 });
      if (W.cloak) S.poly([[fx - 1.6, K.shY + 1], [fx + 1.6, K.shY + 1], [fx + 2.6, hem - 1], [fx - 2.6, hem - 1]], M(w[2] || '#120d1a'), { bev: 1, light: -0.2 });
      if (W.robe || W.cloak) { S.ell(K.footN[0] + 0.8, K.gy - 1, 2.2, 1.3, M(shoeC), { round: 0.5 }); S.ell(K.footF[0] - 0.8, K.gy - 1, 2.2, 1.3, M(shoeC), { round: 0.5, light: -0.1 }); }
    }
    // Prendas superiores
    const over = (c, kind, trim) => S.poly(ext(torsoPts, 0.7), M(c, kind), { cyl: 1, trim, trimW: 0.8 });
    const openFront = (w2) => S.poly([[fx - w2, K.shY - 1], [fx + w2, K.shY - 1], [fx + w2 * 0.8, K.hipY + 1], [fx - w2 * 0.8, K.hipY + 1]], torsoM, { bev: 0.8 });
    if (W.jacket) { over(W.jacket[1]); openFront(1.3); if (W.jacket[2]) { S.poly([[fx - 1.3, K.shY - 1], [fx - 2.8, K.shY + 1], [fx - 1.2, K.shY + 6]], M(W.jacket[2]), { bev: 0.6 }); S.poly([[fx + 1.3, K.shY - 1], [fx + 2.8, K.shY + 1], [fx + 1.2, K.shY + 6]], M(W.jacket[2]), { bev: 0.6 }); } }
    if (W.leather) { over(W.leather[1]); S.poly([[fx - 1.2, K.shY - 1], [fx + 1.2, K.shY - 1], [fx + 0.9, K.hipY], [fx - 0.9, K.hipY]], M(W.leather[2] || '#b71c1c'), { bev: 0.6 }); S.rect(fx + 1, K.shY, 0.55, K.hipY - K.shY, F('#c9c9c9')); }
    if (W.suit) { over(W.suit[1]); S.poly([[fx - 1.9, K.shY - 1.2], [fx + 1.9, K.shY - 1.2], [fx, K.shY + 6.5]], M(W.suit[2] || '#f4f4f4'), { bev: 0.6 }); S.poly([[fx - 0.6, K.shY - 0.4], [fx + 0.6, K.shY - 0.4], [fx + 0.7, K.shY + 6.5], [fx, K.shY + 7.6], [fx - 0.7, K.shY + 6.5]], M(W.suit[3] || '#8c1c3a'), { bev: 0.4 }); for (let i = 0; i < 2; i++) S.ell(fx + 2.6, K.shY + 7.5 + i * 2.6, 0.5, 0.5, gold, { noLine: true }); }
    if (W.vest || W.waiter) { const v = W.vest || W.waiter; S.poly([[K.shF[0] + 0.5, K.shY - 0.8], [fx - 0.6, K.shY + 1], [fx - 0.4, K.hipY + 1.2], [tx - B.hw - 1, K.hipY + 1.6], [tx - wHalf - 0.4, K.waistY]], M(v[1]), { cyl: 1 }); S.poly([[fx + 0.6, K.shY + 1], [K.shN[0] - 0.5, K.shY - 0.8], [tx + wHalf + 0.4, K.waistY], [tx + B.hw + 1, K.hipY + 1.6], [fx + 0.4, K.hipY + 1.2]], M(v[1]), { cyl: 1 }); for (let i = 0; i < 3; i++) S.ell(fx + 1.4, K.shY + 4 + i * 3, 0.55, 0.55, gold, { noLine: true }); }
    if (W.armor) { over(W.armor[1], 'metal', M(W.armor[2] || GOLD, 'metal')); const m2 = M(W.armor[2] || GOLD, 'metal'); S.rect(tx - wHalf - 0.2, K.waistY - 0.8, wHalf * 2 + 0.4, 1.6, m2); S.ell(fx, K.shY + 4.5, 2, 2, m2); S.poly([[tx - B.hw - 1.6, K.hipY + 1], [tx + B.hw + 1.6, K.hipY + 1], [tx + B.hw + 2.4, K.hipY + 5], [tx - B.hw - 2.4, K.hipY + 5]], M(W.armor[1], 'metal'), { bev: 1, trim: m2, trimW: 0.7 }); }
    if (W.barrel) { S.poly(ext(torsoPts, 1.3), M('#8b5a2b', 'wood'), { cyl: 1 }); [K.shY + 3, K.waistY, K.hipY].forEach(y => S.rect(K.shF[0] - 2.2, y - 0.7, K.shN[0] - K.shF[0] + 4.4, 1.4, M('#4c4c57', 'metal'))); }
    if (W.gi) { over(W.gi[1]); S.poly([[fx - 3, K.shY - 1.2], [fx + 2.6, K.waistY - 1], [fx + 1.6, K.waistY + 0.4], [fx - 3.6, K.shY + 0.6]], M(sh(W.gi[1], -0.1)), { bev: 0.6 }); }
    if (W.hoodie) { over(W.hoodie[1]); S.rect(fx - 3, K.waistY + 0.6, 6, 3.2, M(sh(W.hoodie[1], -0.1))); S.cap(fx - 1, K.shY, fx - 1.4, K.shY + 5, 0.3, 0.3, F('#dddddd')); S.cap(fx + 1, K.shY, fx + 1.4, K.shY + 5, 0.3, 0.3, F('#dddddd')); }
    if (W.sequin) { over(W.sequin[1], 'cloth', M(W.sequin[2] || '#ffd54f', 'metal')); for (let i = 0; i < 16; i++) S.rect(tx - wHalf + hash(i, 1, 4) * wHalf * 2, K.shY + hash(i, 2, 4) * (K.hipY - K.shY), 0.8, 0.8, F(W.sequin[2] || '#ffd54f')); }
    if (W.apron) S.poly([[fx - wHalf * 0.75, K.waistY + 1], [fx + wHalf * 0.75, K.waistY + 1], [fx + wHalf * 0.95, K.kneeN[1] + 2], [fx - wHalf * 0.95, K.kneeN[1] + 2]], M(W.apron[1] || '#f4f1ea'), { folds: 3 });
    if (W.belt) { S.rect(tx - B.hw - 1, K.hipY - 1.6, (B.hw + 1) * 2, 1.9, M(W.belt[1] || '#4e342e')); S.rect(fx - 1.1, K.hipY - 1.9, 2.2, 2.5, M(W.belt[2] || '#c9a227', 'metal')); }
    if (W.champbelt) { S.rect(tx - B.hw - 1.3, K.hipY - 2.2, (B.hw + 1.3) * 2, 2.7, M(W.champbelt[1] || GOLD, 'metal')); S.ell(fx, K.hipY - 0.9, 2.6, 2.1, M('#fff3b0', 'metal')); }
    if (W.bandolier) S.poly([[K.shN[0] - 1.5, K.shY - 1], [K.shN[0] + 0.5, K.shY], [tx - B.hw + 0.5, K.hipY + 0.5], [tx - B.hw - 1.5, K.hipY - 1]], M('#6d4c41'), { bev: 0.6 });
    if (W.chain) for (let i = 0; i < 7; i++) S.ell(fx - 3 + i, K.shY + 0.5 + Math.sin(i / 6 * Math.PI) * 3, 0.55, 0.55, M('#e2b53a', 'metal'), { noLine: true });
    if (W.sweater) { S.cap(K.shF[0] - 0.5, K.shY - 0.5, K.shN[0] + 0.5, K.shY - 0.5, 1.6, 1.6, M(W.sweater[1] || '#1e88e5')); S.cap(fx - 1, K.shY + 0.5, fx - 0.5, K.shY + 4, 1.1, 0.9, M(W.sweater[1] || '#1e88e5')); S.cap(fx + 1, K.shY + 0.5, fx + 0.6, K.shY + 4, 1.1, 0.9, M(W.sweater[1] || '#1e88e5')); }
    if (W.epaulets) [K.shN, K.shF].forEach(s => { S.ell(s[0], s[1] - 0.6, 2.6, 1.3, gold); for (let i = -1; i <= 1; i++) S.rect(s[0] + i * 1.2 - 0.25, s[1] + 0.4, 0.5, 1.8, F(GOLD)); });
    if (W.pauldrons) [K.shF, K.shN].forEach(s => S.ell(s[0], s[1] - 0.6, B.ar * 1.95, B.ar * 1.4, M(W.pauldrons[1], W.pauldrons[2] || 'cloth'), { trim: W.pauldrons[2] === 'metal' ? gold : null, trimW: 0.6 }));
    if (W.moss) [K.shF, K.shN].forEach((s, i) => S.ell(s[0], s[1] - 1.5, 3.2, 1.6, M('#6a9e3a', 'leaf')));
    if (W.jewels) [[-2, 3, '#e53935'], [2, 6, '#1e88e5'], [0, 9, '#43a047']].forEach(([dx, dy, c]) => S.ell(fx + dx, K.shY + dy, 0.9, 0.9, M(c, 'glass')));
    if (W.bowtie) { const c = M(W.bowtie[1] || GOLD); S.poly([[fx - 0.3, K.shY - 0.4], [fx - 2.4, K.shY - 1.6], [fx - 2.4, K.shY + 0.9]], c, { bev: 0.5 }); S.poly([[fx + 0.3, K.shY - 0.4], [fx + 2.4, K.shY - 1.6], [fx + 2.4, K.shY + 0.9]], c, { bev: 0.5 }); }
    // 5) Cuello y cabeza
    S.cap(hx - 0.3, K.neckY + 1.5, hx - 0.2, hy + hr * 0.55, hr * 0.42, hr * 0.38, skin, { light: -0.12 });
    if (W.scarf) { S.ell(K.tx + 0.5, K.neckY + 1.4, hr * 0.95, hr * 0.45, M(W.scarf[1])); S.cap(K.tx + 1.5, K.neckY + 2, K.tx + 2.6, K.neckY + 7.5, 1.2, 0.9, M(W.scarf[1])); }
    S.ell(hx - hr * 0.88, hy + hr * 0.08, hr * 0.2, hr * 0.32, skin, { light: -0.1 });
    S.ell(hx + hr * 0.9, hy + hr * 0.06, hr * 0.17, hr * 0.3, skin);
    S.ell(hx, hy, hr * 0.92, hr * 1.02, skin);
    S.ell(hx + hr * 0.06, hy + hr * 0.5, hr * 0.68, hr * 0.5, skin, { noAO: true, noLine: true });
    hairFront(S, sp, hx, hy, hr);
    face(S, sp, hx, hy, hr, skinF);
    headwear(S, sp, hx, hy, hr);
    if (W.cloak || W.hoodup) { const c = M((W.cloak || W.hoodup)[1]); S.poly([[hx - hr * 1.25, hy + hr * 0.9], [hx - hr * 1.15, hy - hr * 0.9], [hx - hr * 0.2, hy - hr * 1.45], [hx + hr * 0.9, hy - hr * 1.2], [hx + hr * 1.25, hy + hr * 0.9], [hx + hr * 0.8, hy + hr * 0.6], [hx + hr * 0.75, hy - hr * 0.55], [hx - hr * 0.7, hy - hr * 0.6], [hx - hr * 0.8, hy + hr * 0.6]], c, { bev: 1.6, trim: W.cloak && W.cloak[2] ? M(W.cloak[2]) : null, trimW: 0.5 }); }
    // 6) Brazo cercano y objetos
    drawArm(K.armN, false);
    if (sp.hold) item(S, sp.hold, K.armN, K, false);
    (sp.extra || []).forEach(x => extra(S, x, K));
    return { head: [hx, hy], hr, top: hy - hr * 1.4, K };
  }

  function face(S, sp, hx, hy, hr, skin) {
    const k = S.k, f = sp.face || 'neutral', ey = hy + hr * 0.02;
    const eN = hx + hr * 0.42, eF = hx - hr * 0.3;
    const eyeC = F('#160f18'), browC = F(sh((sp.hair && sp.hair[1]) || '#3a2a1c', -0.3));
    if (f === 'eyes') { S.ell(hx, hy + hr * 0.12, hr * 0.85, hr * 0.78, F('#0e0a14')); S.ell(eN, ey, 0.75, 0.55, F('#ffe066')); S.ell(eF, ey, 0.7, 0.5, F('#ffe066')); return; }
    const eye = x => {
      if (f === 'zombie') { S.rect(x - 0.6, ey - 0.6, 1.2, 1.2, F('#f2f2d8')); return; }
      if (f === 'tired') { S.rect(x - 0.7, ey, 1.4, 0.55, eyeC); return; }
      if (k >= 2) { S.rect(x - 0.7, ey - 0.6, 1.4, 1.25, F('#f4ede2')); S.rect(x - 0.3, ey - 0.6, 0.85, 1.25, F(sp.eyes || '#3b2a1e')); S.rect(x - 0.05, ey - 0.55, 0.3, 0.3, F('#ffffff')); }
      else { S.rect(x - 0.6, ey - 0.9, 1.2, 0.5, F(sh(skin, -0.32))); S.rect(x - 0.5, ey - 0.5, 1, 1.3, eyeC); }
    };
    eye(eN); eye(eF);
    const by = ey - hr * 0.36;
    if (f === 'angry' || f === 'rage' || f === 'shout') { S.poly([[eN - 1.1, by + 0.7], [eN + 1, by - 0.2], [eN + 1, by + 0.4], [eN - 1.1, by + 1.2]], browC, { bev: 0 }); S.poly([[eF - 1, by - 0.2], [eF + 1.1, by + 0.7], [eF + 1.1, by + 1.2], [eF - 1, by + 0.4]], browC, { bev: 0 }); }
    else if (f !== 'zombie') { S.rect(eN - 1, by, 2, 0.55, browC); S.rect(eF - 1, by + (f === 'smug' ? -0.3 : 0), 2, 0.55, browC); }
    S.rect(hx + hr * 0.12, hy + hr * 0.26, 0.6, 0.7, F(sh(skin, -0.22)));
    const my = hy + hr * 0.6, mx = hx + hr * 0.08, lip = F(mix(skin, '#6d1f24', 0.5));
    switch (f) {
      case 'happy': S.poly([[mx - 1.3, my - 0.4], [mx + 1.3, my - 0.4], [mx + 0.6, my + 0.6], [mx - 0.6, my + 0.6]], F('#5a1a1f'), { bev: 0 }); break;
      case 'shout': case 'rage': S.ell(mx, my + 0.1, 1.2, f === 'rage' ? 1.2 : 1, F('#3d0e14')); if (k >= 2) S.rect(mx - 0.9, my - 0.8, 1.8, 0.4, F('#f4f0e6')); break;
      case 'talk': S.ell(mx, my, 0.9, 0.6, F('#4a1219')); break;
      case 'smug': S.poly([[mx - 1.2, my + 0.2], [mx + 1.3, my - 0.6], [mx + 1.3, my - 0.1], [mx - 1.2, my + 0.7]], lip, { bev: 0 }); break;
      case 'zombie': S.ell(mx, my, 1, 0.8, F('#2a1a1a')); break;
      default: S.rect(mx - 0.9, my - 0.2, 1.8, 0.5, lip);
    }
    if (sp.beard) {
      const bc = M(sp.beard[1] || (sp.hair && sp.hair[1]) || '#4a3020', 'hair');
      if (sp.beard[0] === 'mustache') S.cap(mx - 1.7, my - 1, mx + 1.7, my - 1, 0.65, 0.65, bc);
      if (sp.beard[0] === 'bigmustache') { S.cap(mx - 2.6, my - 0.3, mx - 0.1, my - 1.1, 0.95, 1.1, bc); S.cap(mx + 0.1, my - 1.1, mx + 2.6, my - 0.3, 1.1, 0.95, bc); }
      if (sp.beard[0] === 'stubble') for (let i = 0; i < 6; i++) S.rect(hx - hr * 0.35 + i * hr * 0.15, hy + hr * (0.62 + (i % 2) * 0.18), 0.5, 0.5, F(sh(skin, -0.28)));
    }
  }

  function hairBack(S, sp, K) {
    if (!sp.hair) return;
    const [st, c] = sp.hair, m = M(c, 'hair'), hx = K.head[0], hy = K.head[1], hr = K.hr;
    switch (st) {
      case 'long': S.poly([[hx - hr * 1.1, hy - hr * 0.5], [hx + hr * 1.1, hy - hr * 0.5], [hx + hr * 1.25, K.shY + hr * 1.5], [hx - hr * 1.35, K.shY + hr * 1.6]], m, { bev: 1.5 }); break;
      case 'melena': S.ell(hx, hy - hr * 0.1, hr * 1.55, hr * 1.4, m); S.poly([[hx - hr * 1.6, hy], [hx + hr * 1.6, hy], [hx + hr * 1.9, K.waistY - 1], [hx - hr * 2.0, K.waistY]], m, { bev: 2 }); break;
      case 'pony': S.cap(hx - hr * 0.7, hy - hr * 0.7, hx - hr * 1.6, hy + hr * 1.5, hr * 0.5, hr * 0.24, m); break;
      case 'ponybig': S.cap(hx - hr * 0.7, hy - hr * 0.8, hx - hr * 1.9, hy + hr * 1.9, hr * 0.75, hr * 0.3, m); S.cap(hx - hr * 1.5, hy + hr * 0.5, hx - hr * 2.3, hy + hr * 2.3, hr * 0.45, hr * 0.2, m); break;
      case 'bob': S.ell(hx, hy + hr * 0.1, hr * 1.2, hr * 1.1, m); break;
      case 'bun': S.ell(hx - hr * 0.15, hy - hr * 1.15, hr * 0.62, hr * 0.55, m); break;
    }
  }
  function hairFront(S, sp, hx, hy, hr) {
    if (!sp.hair) return;
    const [st, c] = sp.hair, m = M(c, 'hair');
    if (st === 'bald') { S.ell(hx - hr * 0.86, hy - hr * 0.05, hr * 0.26, hr * 0.42, m); S.ell(hx + hr * 0.86, hy - hr * 0.05, hr * 0.22, hr * 0.38, m); return; }
    if (st === 'moss') { for (let i = 0; i < 6; i++) S.ell(hx - hr * 0.85 + i * hr * 0.34, hy - hr * 0.82 + (i % 2) * 0.6, hr * 0.42, hr * 0.32, M(c, 'leaf')); return; }
    S.ell(hx, hy - hr * 0.6, hr * 1.02, hr * 0.56, m);
    S.ell(hx - hr * 0.86, hy - hr * 0.18, hr * 0.27, hr * 0.48, m); S.ell(hx + hr * 0.88, hy - hr * 0.22, hr * 0.23, hr * 0.42, m);
    switch (st) {
      case 'quiff': S.ell(hx + hr * 0.2, hy - hr * 1.08, hr * 0.62, hr * 0.38, m); break;
      case 'slick': S.cap(hx - hr * 0.6, hy - hr * 0.95, hx + hr * 0.4, hy - hr * 0.98, 0.5, 0.4, F(sh(c, 0.45))); break;
      case 'messy': for (let i = 0; i < 6; i++) { const x = hx - hr * 0.95 + i * hr * 0.38; S.poly([[x - 1, hy - hr * 0.85], [x + 0.3, hy - hr * 1.38 - (i % 2) * 0.8], [x + 1.1, hy - hr * 0.85]], m, { bev: 0.6, noLine: true }); } break;
      case 'curly': for (let i = 0; i < 7; i++) S.ell(hx - hr * 1.0 + i * hr * 0.33, hy - hr * 0.98 + (i % 2) * 0.5, hr * 0.32, hr * 0.32, m, { noLine: true }); S.ell(hx - hr * 1.0, hy + hr * 0.2, hr * 0.35, hr * 0.5, m); S.ell(hx + hr * 1.0, hy + hr * 0.15, hr * 0.32, hr * 0.45, m); break;
      case 'bob': S.ell(hx - hr * 0.95, hy + hr * 0.25, hr * 0.32, hr * 0.7, m); S.ell(hx + hr * 0.95, hy + hr * 0.2, hr * 0.28, hr * 0.65, m); S.ell(hx + hr * 0.15, hy - hr * 0.62, hr * 0.85, hr * 0.32, m, { noLine: true }); break;
      case 'long': case 'melena': { const sc = st === 'melena' ? 1.25 : 1; S.cap(hx - hr * 0.92, hy - hr * 0.3, hx - hr * 1.05 * sc, hy + hr * 1.5, hr * 0.33 * sc, hr * 0.24, m); S.cap(hx + hr * 0.92, hy - hr * 0.35, hx + hr * 1.0 * sc, hy + hr * 1.4, hr * 0.3 * sc, hr * 0.22, m); S.ell(hx + hr * 0.25, hy - hr * 0.62, hr * 0.7, hr * 0.32, m, { noLine: true }); if (st === 'melena') S.ell(hx, hy - hr * 1.0, hr * 1.2, hr * 0.5, m); break; }
      case 'pony': case 'ponybig': S.ell(hx - hr * 0.7, hy - hr * 0.9, hr * 0.28, hr * 0.24, M('#d81b60')); break;
      case 'bun': S.rect(hx - hr * 0.5, hy - hr * 1.05, hr, hr * 0.15, M('#5d4037')); break;
    }
  }
  function headwear(S, sp, hx, hy, hr) {
    (sp.head || []).forEach(h => {
      const [k, a] = h;
      switch (k) {
        case 'aussie': {
          const n = +a || 0;
          if (n >= 4) { S.ell(hx, hy - hr * 0.62, hr * 2.2, hr * 0.42, M(GOLD, 'metal'), { round: 0.5 }); S.poly([[hx - hr * 1.2, hy - hr * 0.7], [hx - hr * 1.35, hy - hr * 2.4], [hx - hr * 0.6, hy - hr * 1.7], [hx, hy - hr * 2.8], [hx + hr * 0.6, hy - hr * 1.7], [hx + hr * 1.35, hy - hr * 2.4], [hx + hr * 1.2, hy - hr * 0.7]], M(GOLD, 'metal'), { bev: 1.4 }); S.ell(hx, hy - hr * 1.35, hr * 0.32, hr * 0.32, M('#c62828', 'glass')); S.rect(hx - hr * 1.15, hy - hr * 0.98, hr * 2.3, hr * 0.28, M('#7b1f2a')); break; }
          const col = n === 3 ? '#4e342e' : '#8d6e63';
          S.ell(hx, hy - hr * 0.62, hr * (1.6 + n * 0.28), hr * (0.38 + n * 0.04), M(col), { round: 0.45 });
          S.ell(hx, hy - hr * (1.04 + n * 0.08), hr * 0.9, hr * (0.55 + n * 0.1), M(sh(col, 0.08)));
          S.rect(hx - hr * 0.9, hy - hr * 0.9, hr * 1.8, hr * 0.24, M('#3e2723'));
          if (n >= 2) { S.cap(hx + hr * 0.6, hy - hr * 0.95, hx + hr * 1.4, hy - hr * 2.4, hr * 0.28, hr * 0.12, M('#e53935')); S.cap(hx + hr * 0.4, hy - hr * 0.95, hx + hr * 0.9, hy - hr * 2.0, hr * 0.22, hr * 0.1, M('#fdd835')); }
          if (n === 3) for (let i = 0; i < 4; i++) S.ell(hx - hr * 0.75 + i * hr * 0.5, hy - hr * 0.78, 0.6, 0.6, M(GOLD, 'metal'));
          break;
        }
        case 'crown': case 'crownS': {
          const s = k === 'crownS' ? 0.7 : 1, y = hy - hr * 0.95, x = hx + (k === 'crownS' ? hr * 0.2 : 0);
          S.poly([[x - hr * 0.85 * s, y], [x - hr * 0.95 * s, y - hr * 0.95 * s], [x - hr * 0.45 * s, y - hr * 0.5 * s], [x, y - hr * 1.15 * s], [x + hr * 0.45 * s, y - hr * 0.5 * s], [x + hr * 0.95 * s, y - hr * 0.95 * s], [x + hr * 0.85 * s, y]], M('#e9b93a', 'metal'), { bev: 1 });
          S.ell(x, y - hr * 0.3 * s, 0.8 * s + 0.2, 0.8 * s + 0.2, M('#c62828', 'glass'));
          break;
        }
        case 'corks': for (let i = 0; i < 5; i++) S.cap(hx - hr * 0.8 + i * hr * 0.4, hy - hr * 1.0, hx - hr * 0.8 + i * hr * 0.4, hy - hr * 1.7, 0.75, 0.7, M('#c8a26a', 'wood')); S.rect(hx - hr * 0.95, hy - hr * 1.05, hr * 1.9, hr * 0.25, M(GOLD, 'metal')); break;
        case 'wallcrown': ['#ef9a9a', '#a5d6a7', '#90caf9', '#fff59d'].forEach((c, i) => S.rect(hx - hr * 0.9 + i * hr * 0.46, hy - hr * 1.6 + (i % 2) * 0.6, hr * 0.42, hr * 0.7, M(c))); S.rect(hx - hr * 0.95, hy - hr * 0.95, hr * 1.9, hr * 0.25, M(GOLD, 'metal')); break;
        case 'dicecrown': for (let i = 0; i < 3; i++) { const x = hx - hr * 0.95 + i * hr * 0.7, y = hy - hr * 1.6; S.rect(x, y, hr * 0.6, hr * 0.6, M('#f5f5f5'), { bev: 0.6 }); S.rect(x + hr * 0.22, y + hr * 0.22, 0.6, 0.6, F('#222')); } break;
        case 'horns': S.cap(hx - hr * 0.75, hy - hr * 0.7, hx - hr * 1.5, hy - hr * 1.95, hr * 0.32, hr * 0.12, M('#e8e1c4')); S.cap(hx + hr * 0.75, hy - hr * 0.7, hx + hr * 1.5, hy - hr * 1.95, hr * 0.32, hr * 0.12, M('#e8e1c4')); S.ell(hx, hy - hr * 0.72, hr * 1.05, hr * 0.5, M('#2e7d32', 'metal'), { trim: M(GOLD, 'metal'), trimW: 0.5 }); break;
        case 'glasses': case 'bigglasses': {
          const c = F(a || '#222'), big = k === 'bigglasses' ? 1.35 : 1, ey = hy + hr * 0.02;
          [hx + hr * 0.42, hx - hr * 0.3].forEach(x => { S.rect(x - 1.1 * big, ey - 1 * big, 2.2 * big, 0.45, c); S.rect(x - 1.1 * big, ey + 0.7 * big, 2.2 * big, 0.45, c); S.rect(x - 1.2 * big, ey - 1 * big, 0.45, 2 * big, c); S.rect(x + 0.8 * big, ey - 1 * big, 0.45, 2 * big, c); });
          break;
        }
        case 'sunglasses': { const ey = hy; S.poly([[hx - hr * 0.75, ey - 1], [hx + hr * 0.85, ey - 1], [hx + hr * 0.75, ey + 0.9], [hx + hr * 0.15, ey + 0.6], [hx - hr * 0.65, ey + 0.9]], M('#151520', 'glass'), { bev: 0.6 }); break; }
        case 'headband': case 'bandana': { const c = M(a || '#d32f2f'); S.cap(hx - hr * 0.98, hy - hr * 0.48, hx + hr * 0.98, hy - hr * 0.52, hr * 0.22, hr * 0.22, c); S.cap(hx - hr * 0.9, hy - hr * 0.45, hx - hr * 1.9, hy + hr * 0.3, hr * 0.2, hr * 0.12, c); if (k === 'bandana') S.ell(hx, hy - hr * 0.8, hr * 1.0, hr * 0.48, c); break; }
        case 'cap': { const c = M(a || '#212121'); S.ell(hx, hy - hr * 0.72, hr * 1.02, hr * 0.6, c); S.ell(hx + hr * 0.3, hy - hr * 0.42, hr * 0.95, hr * 0.22, c, { round: 0.4 }); break; }
        case 'mask': { const c = M(a || '#e53935'); S.ell(hx, hy - hr * 0.02, hr * 0.98, hr * 1.06, c); [hx + hr * 0.42, hx - hr * 0.3].forEach(x => { S.ell(x, hy, 1.15, 0.8, F('#fafafa')); S.rect(x - 0.3, hy - 0.4, 0.6, 0.8, F('#111')); }); S.cap(hx, hy - hr * 0.95, hx, hy + hr * 0.6, 0.45, 0.45, F('#fafafa')); break; }
      }
    });
  }

  /* ---------- Objetos en mano ---------- */
  function hamsterAt(S, x, y, gear, s) {
    s = s || 1;
    S.ell(x, y, 2.6 * s, 2.1 * s, M('#d39a5f', 'fur')); S.ell(x + 0.4 * s, y + 0.8 * s, 1.5 * s, 1.0 * s, M('#f3dcb2', 'fur'));
    S.ell(x - 1.4 * s, y - 1.8 * s, 0.75 * s, 0.75 * s, M('#c88550', 'fur')); S.ell(x + 1.2 * s, y - 1.9 * s, 0.75 * s, 0.75 * s, M('#c88550', 'fur'));
    S.rect(x - 0.9 * s, y - 0.6 * s, 0.6, 0.8, F('#140c10')); S.rect(x + 0.8 * s, y - 0.6 * s, 0.6, 0.8, F('#140c10')); S.ell(x, y + 0.1 * s, 0.45, 0.4, F('#f48fb1'));
    if (gear === 'goggles') { S.cap(x - 2 * s, y - 0.6 * s, x + 2 * s, y - 0.6 * s, 0.45, 0.45, M('#5d4037')); S.ell(x - 0.7 * s, y - 0.6 * s, 0.85, 0.8, M('#80deea', 'glass')); S.ell(x + 0.9 * s, y - 0.6 * s, 0.85, 0.8, M('#80deea', 'glass')); }
    if (gear === 'helmet') { S.ell(x, y - 1.5 * s, 2.5 * s, 1.4 * s, M('#b0bec5', 'metal')); S.cap(x, y - 2.7 * s, x - 0.4, y - 3.9 * s, 0.4, 0.3, M('#e53935')); S.poly([[x - 2.5 * s, y - 0.6], [x - 5 * s, y + 1.5], [x - 2.4 * s, y + 2]], M('#f2c12e'), { bev: 0.6 }); }
  }
  ART.hamsterAt = hamsterAt;
  function die(S, x, y, s) { S.rect(x - s / 2, y - s / 2, s, s, M('#f6f3ec'), { bev: s * 0.25 }); S.rect(x - s * 0.3, y - s * 0.3, s * 0.18, s * 0.18, F('#222')); S.rect(x + s * 0.12, y + s * 0.12, s * 0.18, s * 0.18, F('#222')); }
  function item(S, it, A, K, far) {
    const x = A.ha[0], y = A.ha[1], o = far ? { light: -0.1 } : {}, sx = far ? -1 : 1;
    const dx = A.ha[0] - A.el[0], dy = A.ha[1] - A.el[1], L = Math.hypot(dx, dy) || 1, ux = dx / L;
    switch (it) {
      case 'cup': S.poly([[x - 1.6, y - 5], [x + 1.6, y - 5], [x + 1.2, y - 0.5], [x - 1.2, y - 0.5]], M('#dfeff5', 'glass'), Object.assign({ bev: 0.6 }, o)); S.poly([[x - 1.4, y - 3], [x + 1.4, y - 3], [x + 1.15, y - 0.8], [x - 1.15, y - 0.8]], M('#e2a93a', 'glass'), { bev: 0.4, noLine: true }); break;
      case 'bigcup': case 'goldcup': { const s = it === 'bigcup' ? 1.35 : 1; S.ell(x + 0.5, y - 6 * s, 3.4 * s, 2.6 * s, M('#e9b93a', 'metal')); S.ell(x + 0.5, y - 7.6 * s, 3 * s, 0.9 * s, M(it === 'goldcup' ? '#7a1b2c' : '#e2a93a')); S.cap(x + 0.5, y - 3.6 * s, x + 0.5, y - 0.8, 0.7 * s, 0.6, M('#c99a2e', 'metal')); S.ell(x + 0.5, y - 0.6, 2 * s, 0.7, M('#c99a2e', 'metal')); S.ell(x + 0.5, y - 6 * s, 0.8, 0.8, M('#c62828', 'glass')); break; }
      case 'wineglass': S.ell(x + 0.4, y - 5, 1.7, 1.6, M('#e8f2f6', 'glass')); S.ell(x + 0.4, y - 4.6, 1.4, 1.0, M('#7a1b2c', 'glass'), { noLine: true }); S.cap(x + 0.4, y - 3.4, x + 0.4, y - 0.6, 0.35, 0.35, M('#e8f2f6', 'glass')); S.ell(x + 0.4, y - 0.4, 1.4, 0.45, M('#e8f2f6', 'glass')); break;
      case 'bottle': S.cap(x, y - 1, x + sx * 1.2, y - 8, 1.5, 1.4, M('#1f5c2a', 'glass'), o); S.cap(x + sx * 1.2, y - 8, x + sx * 1.6, y - 11, 0.6, 0.6, M('#1f5c2a', 'glass')); S.rect(x - 1.3 + sx * 0.4, y - 5.2, 2.8, 2, F('#f3e3c3')); break;
      case 'wheelbow': { const cx = x + 3, cy = y - 3, r = 5.5; for (let i = 0; i < 12; i++) { const a1 = i / 12 * Math.PI * 2, a2 = (i + 1) / 12 * Math.PI * 2; S.cap(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, cx + Math.cos(a2) * r, cy + Math.sin(a2) * r, 0.7, 0.7, M('#9aa3ad', 'metal')); } for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI; S.cap(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.3, 0.3, M(GOLD, 'metal'), { noLine: true }); } S.ell(cx, cy, 1, 1, M(GOLD, 'metal')); break; }
      case 'tray': case 'goldtray': { const g = it === 'goldtray'; S.ell(x + sx * 1, y - 2, g ? 6 : 4.8, 1.1, M(g ? '#e9b93a' : '#c9d1d6', 'metal'), { round: 0.5 }); S.poly([[x - 0.5, y - 5.6], [x + 1.5, y - 5.6], [x + 1.2, y - 2.8], [x - 0.2, y - 2.8]], M('#dfeff5', 'glass'), { bev: 0.4 }); S.ell(x + sx * 3.2, y - 3.3, g ? 1.6 : 1.3, g ? 1.1 : 1, M(g ? '#7cb342' : '#e8b06a')); break; }
      case 'book': S.rect(x - 2.5, y - 6, 5, 6, M('#2b1550'), { bev: 1, trim: M(GOLD, 'metal'), trimW: 0.5 }); S.rect(x - 0.9, y - 4.4, 1.8, 2.2, F(GOLD)); break;
      case 'notebook': S.rect(x - 2, y - 5, 4.4, 5, M('#f4f1ea'), { bev: 0.6 }); for (let i = 0; i < 3; i++) S.rect(x - 1.4, y - 4 + i * 1.3, 3.2, 0.4, F('#7fa6d6')); break;
      case 'catalog': case 'catalog_gold': S.rect(x - 2.4, y - 6.5, 5, 6.5, M(it === 'catalog' ? '#26a69a' : '#e9b93a', it === 'catalog' ? 'cloth' : 'metal'), { bev: 1 }); S.rect(x - 1.4, y - 5.4, 3, 1.4, F('#fff')); S.rect(x - 1.4, y - 3.2, 3, 1.4, F('#ffcc80')); break;
      case 'box': S.rect(x - 4, y - 6, 8, 5, M('#b71c1c'), { bev: 1, trim: M(GOLD, 'metal'), trimW: 0.45 }); S.poly([[x - 1.6, y - 4.6], [x + 0.4, y - 5.4], [x + 2.2, y - 4.4], [x + 1.8, y - 2.4], [x - 0.2, y - 1.8], [x - 1.9, y - 2.8]], M('#f9a825')); break;
      case 'mic': case 'micgold': S.cap(x, y - 0.5, x + sx * 0.8, y - 5, 0.65, 0.55, M(it === 'micgold' ? GOLD : '#9aa3ad', 'metal')); S.ell(x + sx * 1, y - 6, 1.45, 1.45, M(it === 'micgold' ? '#3a1e5c' : '#2b2b2b', 'metal')); break;
      case 'megaphone': case 'bigmegaphone': { const s = it === 'bigmegaphone' ? 1.5 : 1; S.poly([[x, y - 2], [x + 6 * s, y - 4.5 * s], [x + 6 * s, y + 2.5 * s], [x, y + 1]], M(it === 'bigmegaphone' ? '#7b1fa2' : '#e53935'), { bev: 1.2, trim: it === 'bigmegaphone' ? M(GOLD, 'metal') : null }); S.ell(x + 6 * s, y - 1 * s, 0.9, 3.4 * s, M('#f4f4f4'), { round: 0.6 }); break; }
      case 'knife': { const bx = sx; S.rect(x - 0.7, y - 1.6, 1.4, 2.4, M('#4e342e', 'wood')); S.poly([[x - 0.6, y - 1.6], [x + 0.8, y - 1.6], [x + bx * 2.4 + 0.4, y - 7.5], [x + bx * 2.2 - 0.4, y - 7.2]], M('#d6f6ff', 'metal'), { bev: 0.6 }); break; }
      case 'cane': S.cap(x + sx * 0.5, y - 2, x + sx * 1.8, K.gy - 0.5, 0.55, 0.5, M('#4e342e', 'wood')); S.ell(x + sx * 0.3, y - 2.2, 1.25, 1.15, M(GOLD, 'metal')); break;
      case 'dicestaff': S.cap(x + 0.3, K.gy - 1, x + 0.6, y - 24, 0.75, 0.7, M('#6d4c41', 'wood')); die(S, x + 0.6, y - 27, 5.5); break;
      case 'guitar': S.ell(x - 3, y + 0.5, 3.6, 3.0, M('#c62828')); S.ell(x - 0.5, y - 2, 2.4, 2.1, M('#c62828')); S.ell(x - 2.4, y + 0.6, 1.1, 1.1, F('#1a1a1a')); S.cap(x, y - 2.5, x + 7, y - 10, 0.65, 0.6, M('#5d4037', 'wood')); S.rect(x + 6.4, y - 12, 2, 2.8, M('#212121')); break;
      case 'vinyl': S.ell(x + sx * 1.8, y - 2.5, 3.2, 3.2, M('#151515', 'glass'), { round: 0.3 }); S.ell(x + sx * 1.8, y - 2.5, 0.9, 0.9, F('#c62828')); break;
      case 'rose': S.cap(x, y, x + ux * 1, y - 5, 0.35, 0.3, M('#2e7d32')); S.ell(x + ux, y - 6, 1.5, 1.3, M('#d81b60')); break;
      case 'pen': S.poly([[x - 0.5, y], [x + 0.5, y], [x + 3, y - 9], [x + 1.4, y - 9.5]], M('#e9b93a', 'metal'), { bev: 0.6 }); S.poly([[x + 1.4, y - 9.5], [x + 3, y - 9], [x + 4.5, y - 12], [x + 1.8, y - 11]], M('#fff3d6'), { bev: 0.6 }); break;
    }
  }
  function extra(S, x, K) {
    const sN = K.shN, sF = K.shF;
    switch (x) {
      case 'hamsterPocket': hamsterAt(S, K.tx + 2.5, K.shY + 5.5, null, 0.8); break;
      case 'hamsterG': hamsterAt(S, sN[0] + 0.3, sN[1] - 3.4, 'goggles'); break;
      case 'hamsterH': hamsterAt(S, sN[0] + 0.3, sN[1] - 3.8, 'helmet'); break;
      case 'cushion': S.poly([[sF[0] - 12, sF[1] - 7], [sF[0] - 5, sF[1] - 8], [sF[0] - 4.4, sF[1] - 2], [sF[0] - 11.4, sF[1] - 1.6]], M('#f48fb1'), { bev: 2 }); S.ell(sF[0] - 12, sF[1] - 7, 0.8, 0.8, M('#ad1457')); break;
      case 'lamp': S.poly([[sF[0] - 13, sF[1] - 16], [sF[0] - 7, sF[1] - 16], [sF[0] - 5.5, sF[1] - 11], [sF[0] - 14.5, sF[1] - 11]], M('#fff2a8'), { bev: 1 }); S.cap(sF[0] - 10, sF[1] - 11, sF[0] - 10, sF[1] - 5, 0.6, 0.6, M('#c99a2e', 'metal')); S.ell(sF[0] - 10, sF[1] - 4.6, 2.4, 0.8, M('#c99a2e', 'metal')); break;
      case 'mirror': S.ell(sN[0] + 8, sN[1] - 14, 3.2, 4.4, M('#e9b93a', 'metal')); S.ell(sN[0] + 8, sN[1] - 14, 2.2, 3.4, M('#bfe6f5', 'glass')); break;
      case 'dice': die(S, sN[0] + 7, sN[1] - 9, 3.6); die(S, sF[0] - 6, sF[1] - 4, 3); break;
      case 'hexes': ['#f9a825', '#43a047', '#8d6e63'].forEach((c, i) => S.poly([[0, -2], [1.8, -1], [1.8, 1], [0, 2], [-1.8, 1], [-1.8, -1]].map(([a, b]) => [sF[0] - 8 + i * 3 + a, sF[1] - 12 + (i % 2) * 5 + b]), M(c), { bev: 0.8 })); break;
      case 'bookF': S.poly([[sF[0] - 13, sF[1] - 9], [sF[0] - 8, sF[1] - 10], [sF[0] - 3, sF[1] - 9], [sF[0] - 3, sF[1] - 4], [sF[0] - 8, sF[1] - 5], [sF[0] - 13, sF[1] - 4]], M('#f1ead8'), { bev: 1 }); S.rect(sF[0] - 8.3, sF[1] - 10, 0.6, 5, F('#4a148c')); break;
      case 'papers': [[-12, -10], [-8, 1], [9, -14], [11, -3]].forEach(([dx, dy], i) => S.poly([[0, 0], [4, -0.6], [4.4, 4.4], [0.4, 5]].map(([a, b]) => [K.tx + dx + a, sN[1] + dy + b + i % 2]), M('#f4f1ea'), { bev: 0.6 })); break;
      case 'typewriter': S.rect(sN[0] + 4, sN[1] - 13, 10, 5, M('#455a64', 'metal'), { bev: 1.2 }); S.rect(sN[0] + 5.4, sN[1] - 16, 7, 3, M('#f4f1ea')); break;
      case 'books': [['#c62828', -14, -6], ['#1e88e5', 10, -14], ['#fdd835', -9, -16]].forEach(([c, dx, dy]) => S.rect(K.tx + dx, sN[1] + dy, 5, 3.6, M(c), { bev: 1, trim: M(GOLD, 'metal'), trimW: 0.4 })); break;
      case 'coins': [[-11, -8], [-14, 1], [9, -12], [12, -2], [-5, -15]].forEach(([dx, dy]) => S.ell(K.tx + dx, sN[1] + dy, 1.5, 1.5, M('#e9b93a', 'metal'))); break;
      case 'register': S.rect(sF[0] - 15, sF[1] - 13, 9, 6, M('#78909c', 'metal'), { bev: 1 }); S.rect(sF[0] - 14, sF[1] - 16, 6, 3, M('#263238')); S.rect(sF[0] - 13.4, sF[1] - 15.2, 4.6, 1.1, F('#76ff03')); break;
      case 'bills': S.rect(K.tx + 2, K.shY + 4, 2.4, 2.8, M('#7cb342')); break;
    }
  }

  /* ---------- Cuerpos especiales ---------- */
  function dog(S, st, pose) {
    const a = pose === 'atk' ? 2.5 : pose === 'wind' ? -1 : pose === 'hurt' ? -2 : 0, b = pose === 'idle1' ? 0.6 : 0;
    const fur = M('#f3f1ea', 'fur'), furD = M('#d8d4ca', 'fur');
    if (st === 0) {
      const x = 28 + a, y = 63 + b;
      S.ell(x - 9, y - 4, 2, 2.2, fur);
      [[x - 6, 1], [x - 3, 0], [x + 3, 1], [x + 6, 0]].forEach(([lx, l], i) => S.cap(lx, y + 2, lx + 0.3, GY - 1, 1.5, 1.3, i % 2 ? fur : furD, { light: l ? -0.12 : 0 }));
      S.ell(x, y, 9.5, 5.6, fur); S.ell(x + 9, y - 6, 5.2, 4.8, fur); S.ell(x + 13, y - 4.4, 2.6, 2.1, fur);
      S.ell(x + 6, y - 5, 1.6, 3.2, furD); S.ell(x + 11.5, y - 5.6, 1.4, 2.8, furD);
      S.rect(x + 9.5, y - 7, 1.6, 0.5, F('#1b1320')); S.rect(x + 12.2, y - 7.2, 1.4, 0.5, F('#1b1320')); S.ell(x + 15.2, y - 5, 0.8, 0.7, F('#151015')); S.ell(x + 13.2, y - 2.2, 0.8, 1.4, M('#f48fb1'));
      return { head: [x + 9, y - 6], hr: 5 };
    }
    if (st === 1) {
      const x = 27 + a, y = 59 + b;
      for (let i = 0; i < 6; i++) S.cap(x - 9 - i * 1.8, y - 2 - Math.sin(i * 0.9) * 3, x - 10.8 - i * 1.8, y - 2 - Math.sin((i + 1) * 0.9) * 3, 0.9, 0.9, M('#7a1212'));
      S.poly([[x - 21, y - 7], [x - 18, y - 4], [x - 22, y - 2]], M('#5a0b0b'), { bev: 0.6 });
      [[x - 7, 1], [x - 3, 0], [x + 4, 1], [x + 8, 0]].forEach(([lx, l], i) => S.cap(lx, y + 3, lx + 0.4, GY - 1, 2, 1.6, i % 2 ? fur : furD, { light: l ? -0.12 : 0 }));
      S.ell(x, y, 11.5, 7, fur);
      for (let i = 0; i < 8; i++) S.poly([[x - 9 + i * 2.6, y - 5.5], [x - 8 + i * 2.6, y - 10 - (i % 2) * 2], [x - 7 + i * 2.6, y - 5.8]], fur, { bev: 0.6 });
      S.ell(x + 11, y - 7, 6.2, 5.8, fur); S.ell(x + 15.5, y - 4.8, 3, 2.4, fur);
      S.poly([[x + 7, y - 11], [x + 6.5, y - 16], [x + 9.5, y - 12]], fur); S.poly([[x + 12, y - 12], [x + 13.5, y - 17], [x + 14.5, y - 12]], fur);
      S.ell(x + 11.5, y - 8.2, 1.2, 1, F('#ffeb3b')); S.ell(x + 15, y - 8.5, 1.1, 0.9, F('#ffeb3b'));
      S.rect(x + 12, y - 3.6, 6, 1.6, F('#3a0f12')); for (let i = 0; i < 4; i++) S.poly([[x + 12.4 + i * 1.4, y - 3.6], [x + 13 + i * 1.4, y - 1.8], [x + 13.6 + i * 1.4, y - 3.6]], F('#fafafa'), { bev: 0 });
      return { head: [x + 11, y - 7], hr: 6 };
    }
    const x = 25 + a, y = 55 + b;
    for (let i = 0; i < 9; i++) S.cap(x - 13 - i * 2, y - Math.sin(i * 0.7) * 5, x - 15 - i * 2, y - Math.sin((i + 1) * 0.7) * 5, 1.2 - i * 0.08, 1.1 - i * 0.08, M('#3d0808'));
    [[x - 9, 1], [x - 3, 0], [x + 6, 1], [x + 12, 0]].forEach(([lx, l], i) => { S.cap(lx, y + 4, lx + 0.6, GY - 1.5, 3.2, 2.4, i % 2 ? fur : furD, { light: l ? -0.12 : 0 }); for (let c = 0; c < 3; c++) S.poly([[lx - 2 + c * 1.6, GY - 1], [lx - 1.4 + c * 1.6, GY + 1.5], [lx - 0.6 + c * 1.6, GY - 1]], F('#2b1d2e'), { bev: 0 }); });
    S.ell(x, y, 16, 10, fur);
    for (let i = 0; i < 10; i++) S.poly([[x - 12 + i * 2.6, y - 8], [x - 11 + i * 2.6, y - 14 - (i % 3)], [x - 10 + i * 2.6, y - 8.2]], fur, { bev: 0.6 });
    const headAt = (hx, hy, s) => {
      S.ell(hx, hy, 5.2 * s, 4.8 * s, fur); S.ell(hx + 4.2 * s, hy + 2 * s, 2.6 * s, 2.1 * s, fur);
      S.poly([[hx - 3 * s, hy - 3.5 * s], [hx - 3.6 * s, hy - 8 * s], [hx - 0.6 * s, hy - 4.2 * s]], fur); S.poly([[hx + 1.4 * s, hy - 4.2 * s], [hx + 3 * s, hy - 8.5 * s], [hx + 3.6 * s, hy - 3.8 * s]], fur);
      S.ell(hx + 0.6 * s, hy - 1 * s, 1.1 * s, 1 * s, F('#76ff03')); S.ell(hx + 3.6 * s, hy - 1.2 * s, 1 * s, 0.9 * s, F('#76ff03'));
      S.rect(hx + 1.2 * s, hy + 2.6 * s, 5 * s, 1.5 * s, F('#3a0f12')); for (let i = 0; i < 3; i++) S.poly([[hx + 1.6 * s + i * 1.5 * s, hy + 2.6 * s], [hx + 2.2 * s + i * 1.5 * s, hy + 4.2 * s], [hx + 2.8 * s + i * 1.5 * s, hy + 2.6 * s]], F('#fafafa'), { bev: 0 });
    };
    headAt(x + 7, y - 17, 0.85); headAt(x + 21, y - 14, 0.85); headAt(x + 14, y - 8, 1.15);
    return { head: [x + 14, y - 8], hr: 7 };
  }
  function puma(S, st, pose) {
    const a = pose === 'atk' ? 3 : pose === 'wind' ? -1.5 : pose === 'hurt' ? -2 : 0, b = pose === 'idle1' ? 0.5 : 0, x = 28 + a, y = 59 + b;
    const c = st === 2 ? '#d9a441' : '#c48c47', fur = M(c, 'fur'), furD = M(sh(c, -0.18), 'fur');
    for (let i = 0; i < 8; i++) S.cap(x - 11 - i * 1.6, y - 1 - Math.sin(i * 0.45) * 6, x - 12.6 - i * 1.6, y - 1 - Math.sin((i + 1) * 0.45) * 6, 1.3, 1.2, fur);
    [[x - 8, 1], [x - 4, 0], [x + 6, 1], [x + 10, 0]].forEach(([lx, l], i) => S.cap(lx, y + 2, lx + 1 + (pose === 'atk' && i > 1 ? 2 : 0), GY - 1, 2.2, 1.6, i % 2 ? fur : furD, { light: l ? -0.12 : 0 }));
    S.ell(x, y, 13, 6.2, fur); S.ell(x + 2, y + 2.5, 9, 3, M('#efd6a8', 'fur'));
    S.ell(x + 13, y - 6, 5.2, 4.6, fur); S.ell(x + 17, y - 4.4, 2.6, 2.1, M('#efd6a8', 'fur'));
    S.poly([[x + 9.5, y - 9], [x + 10, y - 12.5], [x + 12.4, y - 10]], fur); S.poly([[x + 14, y - 10.2], [x + 15.4, y - 13.2], [x + 16.4, y - 9.6]], fur);
    S.ell(x + 14, y - 7, 0.9, 0.8, F('#1b5e20')); S.ell(x + 17, y - 7.1, 0.8, 0.7, F('#1b5e20')); S.ell(x + 19.2, y - 4.6, 0.7, 0.6, F('#1b1320'));
    for (let i = 0; i < 4; i++) S.ell(x - 7 + i * 4, y - 2, 1, 0.6, F(sh(c, -0.3)));
    if (st >= 1) { S.cap(x + 9.5, y - 3, x + 12, y + 0.5, 1.2, 1.2, M(st === 2 ? '#d4af37' : '#6a1b9a', st === 2 ? 'metal' : 'cloth')); S.ell(x + 11.2, y + 1.6, 1.2, 1.2, M('#d4af37', 'metal')); }
    if (st === 2) { S.poly([[x - 8, y - 6], [x + 7, y - 6.5], [x + 8, y - 2], [x - 9, y - 1.5]], M('#e3b33c', 'metal'), { cyl: 1 }); S.ell(x + 12.6, y - 9.6, 3.2, 1.5, M('#e3b33c', 'metal')); S.ell(x + 12.6, y - 11, 0.8, 0.8, M('#c62828', 'glass')); }
    return { head: [x + 13, y - 6], hr: 5 };
  }
  function chair(S, st, pose) {
    const wc = st === 0 ? '#5f6b73' : st === 1 ? '#3e4a52' : '#3a1d6b', trim = st === 0 ? '#9aa3ad' : '#d4af37';
    if (st === 2) [[10, '#7b1fa2'], [50, '#c62828']].forEach(([px, c]) => { S.cap(px, GY - 2, px, 12, 0.7, 0.7, M('#5d4037', 'wood')); S.poly([[px + 0.6, 12], [px + 9, 13], [px + 7.5, 19], [px + 0.6, 19]], M(c), { folds: 3 }); S.ell(px + 4.5, 15.6, 1.4, 1.4, M('#d4af37', 'metal')); });
    S.cap(19, GY - 30, 19, GY - 12, 1.2, 1.2, M(wc, 'metal'));
    S.poly([[17, GY - 30], [24, GY - 30], [24, GY - 14], [17, GY - 14]], M(st === 2 ? '#4a148c' : '#3b3b44'), { bev: 1.2 });
    const sp = { b: 'norm', skin: '#e7b48b', hair: ['bald', '#d6d6dc'], beard: ['bigmustache', '#e6e6ea'], face: 'shout', top: ['shirt', '#efe8dc'],
      wear: [['jacket', st === 2 ? '#4a148c' : '#7a5a44', st === 2 ? '#d4af37' : '#5d4037']].concat(st >= 1 ? [['scarf', st === 2 ? '#ffd54f' : '#c62828']] : []),
      legs: '#4e342e', shoes: ['shoes', '#262626'], hold: st === 0 ? 'cane' : st === 1 ? 'megaphone' : 'bigmegaphone', head: st === 2 ? [['crownS']] : [] };
    const f = figure(S, sp, pose, 25, { seated: true });
    S.rect(16, GY - 15, 20, 2.2, M(wc, 'metal'));
    const cx = 21, cy = GY - 9, r = 9;
    for (let i = 0; i < 16; i++) { const a1 = i / 16 * Math.PI * 2, a2 = (i + 1) / 16 * Math.PI * 2; S.cap(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, cx + Math.cos(a2) * r, cy + Math.sin(a2) * r, 1.3, 1.3, M('#2a2a30', 'metal')); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI; S.cap(cx - Math.cos(a) * (r - 1), cy - Math.sin(a) * (r - 1), cx + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1), 0.35, 0.35, M(trim, 'metal')); }
    S.ell(cx, cy, 1.6, 1.6, M(trim, 'metal'));
    if (st >= 1) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; S.ell(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.5, 0.5, F(st === 2 ? '#e1bee7' : '#80deea')); }
    S.ell(37, GY - 2.4, 2.4, 2.4, M('#2a2a30', 'metal')); S.cap(33, GY - 12, 37, GY - 3, 0.8, 0.8, M(wc, 'metal'));
    if (st === 2) { S.poly([[14, GY - 18], [38, GY - 16], [36, GY - 10], [15, GY - 10]], M('#5e2a9e', 'metal'), { cyl: 1 }); S.rect(16, GY - 15, 20, 1, F('#d4af37')); }
    return f;
  }
  const DANT = [
    { b: 'kid', skin: '#f2cba8', hair: ['messy', '#eac14b'], face: 'happy', top: ['tee', '#ef6c00'], legs: '#37474f', shoes: ['sneak', '#f2f2f2'] },
    { b: 'kid', dh: 2, skin: '#f2cba8', hair: ['short', '#f2d46e'], face: 'smug', top: ['sport', '#1e88e5', '#ffffff'], legs: '#263238', shoes: ['sneak', '#e53935'] },
    { b: 'kid', dh: 1, skin: '#eec09a', hair: ['quiff', '#ddb03a'], face: 'angry', top: ['tee', '#43a047'], legs: '#4e342e', shoes: ['sneak', '#f2f2f2'] },
    { b: 'kid', fem: 1, skin: '#e2ad85', hair: ['pony', '#2a1a12'], face: 'angry', top: ['tee', '#f2e6d0'], wear: [['jacket', '#8c1c3a', '#d4af37']], legs: '#1d1d22', shoes: ['shoes', '#d4af37'] }
  ];
  function group(S, n, pose) {
    const pos = n === 1 ? [[30, 0]] : n === 2 ? [[22, 3], [38, 0]] : n === 3 ? [[17, 5], [43, 5], [30, 0]] : [[15, 7], [30, 8], [45, 7], [31, 0]];
    let last;
    pos.forEach(([cx, lift], k) => {
      const d = Object.assign({}, DANT[k]);
      if (n === 4) { d.wear = (d.wear || []).concat([['belt', '#5d4037', '#d4af37']]); if (k === 3) d.wear = d.wear.concat([['scarf', '#d4af37']]); }
      if (n === 4 && k === 1) d.wear = (d.wear || []).concat([['flagpole', '#8c1c3a']]);
      last = figure(S, d, pose, cx, { lift });
    });
    return last;
  }
  function duo(S, st, pose) {
    const mk1 = (c, mask) => ({ b: st ? 'ath' : 'short', dh: st ? 1 + st : 2, skin: '#d9a77c', hair: ['short', '#1d1a24'], face: 'angry', stance: 'wide', top: ['tank', c], legs: sh(c, -0.4), shoes: ['boots', '#1e1e24'],
      wear: [['wrist', '#f4f4f4']].concat(st >= 1 ? [['champbelt', st === 2 ? '#d4af37' : '#b0b8c0']] : [['belt', '#212121', '#9aa3ad']]).concat(st === 2 ? [['cape', sh(c, -0.25)]] : []),
      head: st >= 1 ? [['mask', mask]] : [] });
    figure(S, mk1(st === 2 ? '#1b5e20' : '#2e7d32', '#43a047'), pose, 40, { lift: 3 });
    return figure(S, mk1(st === 2 ? '#b71c1c' : '#e53935', '#e53935'), pose, 23, {});
  }

  /* ---------- API de sprites ---------- */
  function build(defId, lvl, frame, k) {
    const sp = VV.UNITS[defId].levels[lvl].sp || {}, S = new Spr(SW, SH, k || 1);
    let f;
    if (sp.body === 'dog') f = dog(S, sp.stage, frame);
    else if (sp.body === 'puma') f = puma(S, sp.stage, frame);
    else if (sp.body === 'chair') f = chair(S, sp.stage, frame);
    else if (sp.body === 'group') f = group(S, sp.n, frame);
    else if (sp.body === 'duo') f = duo(S, sp.stage, frame);
    else f = figure(S, sp, frame, 30, {});
    return { S, f, sp };
  }
  const cache = new Map();
  ART.sprite = function (defId, lvl, frame, vet) {
    frame = frame || 'idle0';
    const key = defId + ':' + lvl + ':' + frame + ':' + (vet || 0);
    if (cache.has(key)) return cache.get(key);
    const { S, sp } = build(defId, lvl, frame, 1);
    if (vet) for (let i = 0; i < vet; i++) S.poly([[0, -1.6], [0.5, -0.5], [1.6, -0.5], [0.7, 0.2], [1, 1.4], [0, 0.7], [-1, 1.4], [-0.7, 0.2], [-1.6, -0.5], [-0.5, -0.5]].map(([a, b]) => [4 + i * 4.2 + a * 1.3, 66 + b * 1.3]), M('#f2c12e', 'metal'), { bev: 0.6 });
    const cv = S.render({ rim: sp.ghost ? '#d1b3ff' : undefined });
    cache.set(key, cv);
    return cv;
  };
  ART.bbox = function (cv) {
    if (cv._bb) return cv._bb;
    const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data;
    let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return (cv._bb = { x0, y0, x1, y1 });
  };
  const pcache = new Map();
  function bust(defId, lvl, vet) {
    const key = defId + ':' + lvl + ':' + (vet || 0);
    if (pcache.has(key)) return pcache.get(key);
    const k = 3, { S, f } = build(defId, lvl, 'idle0', k);
    const cv = S.render({}), hx = f.head[0], hy = f.head[1], size = Math.max(19, f.hr * 4.6);
    const out = mk(Math.round(size * k), Math.round(size * k)), c = out.getContext('2d');
    c.drawImage(cv, Math.round((hx - size * 0.45) * k), Math.round((hy - size * 0.38) * k), out.width, out.height, 0, 0, out.width, out.height);
    pcache.set(key, out); return out;
  }
  ART.portrait = function (defId, lvl, vet, size) {
    size = size || 96;
    const d = VV.UNITS[defId], F0 = VV.FACTIONS[d.fac], src = bust(defId, lvl || 0, vet);
    const cv = mk(size, size), ctx = cv.getContext('2d');
    const gr = ctx.createRadialGradient(size * 0.55, size * 0.35, size * 0.1, size * 0.5, size * 0.5, size * 0.75);
    gr.addColorStop(0, sh(F0.col, 0.25)); gr.addColorStop(1, sh(F0.col, -0.62));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = size < src.width;
    ctx.drawImage(src, 0, 0, size, size);
    ctx.strokeStyle = F0.accent; ctx.lineWidth = Math.max(2, size / 30); ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth);
    return cv;
  };
  const hicache = new Map();
  ART.spriteHi = function (defId, lvl, frame, k) {
    const key = defId + ':' + lvl + ':' + (frame || 'idle0') + ':' + (k || 2);
    if (hicache.has(key)) return hicache.get(key);
    const { S, sp } = build(defId, lvl, frame || 'idle0', k || 2), cv = S.render({ rim: sp.ghost ? '#d1b3ff' : undefined });
    hicache.set(key, cv); return cv;
  };

  /* ---------- Obstáculos ---------- */
  ART.obstacle = function (kind) {
    const key = 'obs:' + kind; if (cache.has(key)) return cache.get(key);
    const S = new Spr(SW, SH, 1), wood = M('#9a643a', 'wood'), woodD = M('#6d4223', 'wood');
    if (kind === 'tables') {
      S.rect(8, 55, 3, 15, woodD); S.rect(52, 55, 3, 15, woodD); S.rect(5, 62, 54, 3, wood); S.cap(6, 66, 6, 71, 1, 1, woodD); S.cap(57, 66, 57, 71, 1, 1, woodD);
      S.poly([[6, 51], [58, 51], [60, 56], [4, 56]], wood, { bev: 1.4 });
      S.poly([[14, 45], [17, 45], [16.6, 50.5], [14.4, 50.5]], M('#dfeff5', 'glass'), { bev: 0.5 }); S.rect(14.3, 47.5, 2.4, 3, M('#e2a93a', 'glass'));
      S.cap(35, 50, 35.4, 42, 1.6, 1.4, M('#1f5c2a', 'glass')); S.ell(26, 49.5, 3, 1.2, M('#c9d1d6', 'metal'), { round: 0.5 });
    } else {
      S.poly([[6, 50], [44, 50], [46, 64], [4, 64]], M('#b2185a'), { cyl: 1 }); S.poly([[5, 42], [45, 42], [44, 51], [6, 51]], M('#c2185b'), { bev: 2 });
      S.ell(5, 55, 3.4, 8, M('#880e4f')); S.ell(45, 55, 3.4, 8, M('#880e4f'));
      S.ell(16, 53, 7, 3, M('#f8bbd0')); S.ell(32, 53, 7, 3, M('#f8bbd0')); S.cap(8, 64, 8, 69, 1, 1, woodD); S.cap(42, 64, 42, 69, 1, 1, woodD);
      S.cap(54, 70, 54, 30, 1, 1, M('#c99a2e', 'metal')); S.poly([[48, 22], [60, 22], [62, 31], [46, 31]], M('#fff2a8'), { bev: 1.5 }); S.ell(54, 71, 5, 1.4, M('#c99a2e', 'metal'));
    }
    const cv = S.render({}); cache.set(key, cv); return cv;
  };

  /* ---------- Terreno ---------- */
  const S0 = 36, SQ = Math.sqrt(3) * S0;
  ART.HEX = { S: S0, SQ };
  ART.hexCenter = (c, r) => [S0 + c * 1.5 * S0, SQ / 2 + r * SQ + (c & 1) * SQ / 2];
  ART.mapSize = s => [s.W * 1.5 * S0 + 0.5 * S0, s.H * SQ + SQ / 2];
  function hexPath(ctx, x, y, rad) { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; ctx.lineTo(x + rad * Math.cos(a), y + rad * Math.sin(a)); } ctx.closePath(); }
  ART.hexPath = hexPath;
  const BASE = {
    street: '#8f8475', plaza: '#c3b394', grass: '#4f8a38', park: '#3f7a2f', alley: '#6c6457', cover: '#968b79', castle: '#7d786e', keep: '#736e65',
    tavern: '#7f5f3f', mud: '#6c4a2d', puddle: '#5f7280', dance: '#c9a85a', stage: '#7a4e27', tables: '#4f8a38', wall: '#8f8475', water: '#25618d', roof: '#9a3d27'
  };
  ART.BASE = BASE;
  function blk(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  function texture(ctx, t, x, y) {
    const B = 3;
    for (let dy = -SQ / 2; dy < SQ / 2; dy += B) for (let dx = -S0; dx < S0; dx += B) {
      const hx = Math.floor((x + dx) / B), hy = Math.floor((y + dy) / B), n = hash(hx, hy, 1), n2 = hash(hx, hy, 2), px = x + dx, py = y + dy;
      switch (t) {
        case 'street': case 'alley': case 'cover': case 'wall': {
          const row = hy >> 1, off = (row % 2) * 2, gap = (hx + off) % 4 === 0 || hy % 2 === 0;
          if (gap) blk(ctx, px, py, B, B, t === 'alley' ? '#4e483f' : '#6f6556');
          else if (n < 0.2) blk(ctx, px, py, B, B, t === 'alley' ? '#7f7668' : '#a99d8a');
          else if (n > 0.88) blk(ctx, px, py, B, B, t === 'alley' ? '#5d564b' : '#7d7364'); break;
        }
        case 'plaza': if (hx % 7 === 0 || hy % 6 === 0) blk(ctx, px, py, B, B, '#9e8e70'); else if (n < 0.1) blk(ctx, px, py, B, B, '#d6c8a8'); else if (n > 0.93) blk(ctx, px, py, B, B, '#b3a283'); break;
        case 'grass': case 'park': case 'tables':
          if (n < 0.16) blk(ctx, px, py, B, B, t === 'park' ? '#2f6324' : '#3d742b'); else if (n < 0.27) blk(ctx, px, py, B, B, t === 'park' ? '#4c8a37' : '#67a446');
          else if (n2 < 0.012 && t === 'grass') blk(ctx, px, py, B, B, n < 0.6 ? '#fff3a0' : '#f6c2d4'); break;
        case 'castle': case 'keep': if (hy % 4 === 0 || (hx + (hy >> 2) * 3) % 6 === 0) blk(ctx, px, py, B, B, '#5c584f'); else if (n < 0.18) blk(ctx, px, py, B, B, '#99948a'); break;
        case 'tavern': if (hy % 3 === 0) blk(ctx, px, py, B, B, '#5d432a'); else if (n < 0.2) blk(ctx, px, py, B, B, '#99764d'); break;
        case 'mud': if (n < 0.24) blk(ctx, px, py, B, B, '#523620'); else if (n < 0.32) blk(ctx, px, py, B, B, '#8a6644'); else if (n2 < 0.035) blk(ctx, px, py, B, B, '#9fb3bf'); break;
        case 'dance': blk(ctx, px, py, B, B, ((hx >> 2) + (hy >> 2)) % 2 ? '#b98f40' : '#dcc07a'); break;
        case 'stage': if (hy % 3 === 0) blk(ctx, px, py, B, B, '#5d3a1a'); break;
        case 'water': if (n < 0.1) blk(ctx, px, py, B, B, '#3d7fb2'); else if (n < 0.17) blk(ctx, px, py, B, B, '#1d4f75'); break;
        case 'roof': if (hy % 3 === 0) blk(ctx, px, py, B, B, '#6f2818'); else if ((hx + (hy / 3 | 0)) % 4 === 0) blk(ctx, px, py, B, B, '#843321'); else if (n < 0.14) blk(ctx, px, py, B, B, '#b8543a'); break;
      }
    }
  }
  const deco = new Map();
  function decoSprite(key, w, h, fn) { if (deco.has(key)) return deco.get(key); const S = new Spr(w, h, 1); fn(S); const cv = S.render({ rim: '#ffe3b5' }); deco.set(key, cv); return cv; }
  function treeSpr(v) {
    return decoSprite('tree' + v, 40, 46, S => {
      const g = ['#2f6a2a', '#3a7a30', '#2d5f27'][v % 3];
      S.cap(20, 44, 20, 28, 2.2, 1.6, M('#5d3a1a', 'wood')); S.cap(20, 34, 26, 27, 1, 0.8, M('#5d3a1a', 'wood'));
      [[20, 20, 13, 10], [12, 25, 8, 7], [28, 24, 9, 7.5], [17, 12, 9, 7], [26, 15, 8, 7]].forEach(([x, y, rx, ry], i) => S.ell(x + (v % 2) * (i % 2 ? 1 : -1), y, rx, ry, M(i === 3 ? sh(g, 0.06) : g, 'leaf')));
    });
  }
  function houseSpr(v) {
    return decoSprite('house' + v, 60, 58, S => {
      const wall = ['#efe6cf', '#f3e3c3', '#e6d9c2', '#f1d9b5'][v % 4], roof = ['#b5452c', '#a63d27', '#c0532f'][v % 3];
      S.poly([[6, 22], [54, 22], [54, 56], [6, 56]], M(wall), { bev: 1.5 });
      S.rect(4, 20, 3, 37, M('#b8a98e', 'stone')); S.rect(53, 20, 3, 37, M('#b8a98e', 'stone'));
      S.poly([[1, 23], [30, 4], [59, 23]], M(roof), { bev: 2.5, folds: 3 });
      S.rect(10, 30, 40, 3, M('#6d4223', 'wood')); for (let i = 0; i < 9; i++) S.rect(11 + i * 4.6, 33, 1.2, 6, M('#6d4223', 'wood'));
      S.rect(10, 27, 40, 2, M('#5a3519', 'wood'));
      [[13, 41], [38, 41]].forEach(([x, y]) => { S.rect(x, y, 9, 10, M('#2e5d3a')); S.rect(x + 1.5, y + 1.5, 6, 4, M('#a7d4e6', 'glass')); });
      S.rect(26, 43, 8, 13, M('#5d3a1a', 'wood'));
      if (v % 3 === 0) S.rect(42, 6, 5, 10, M('#8a7f70', 'stone'));
      if (v % 4 === 1) [[16, 28], [34, 28]].forEach(([x, y]) => S.ell(x, y, 2.2, 1.6, M('#c62828', 'leaf')));
    });
  }
  function chigreSpr() {
    return decoSprite('chigre', 54, 50, S => {
      S.poly([[6, 18], [48, 18], [48, 48], [6, 48]], M('#f2e8d0'), { bev: 1.5 });
      S.poly([[2, 20], [27, 4], [52, 20]], M('#a63d27'), { bev: 2.5, folds: 3 });
      S.rect(22, 30, 10, 18, M('#2e7d32')); S.rect(9, 26, 9, 8, M('#2e5d3a')); S.rect(10.5, 27.5, 6, 5, M('#ffd78a', 'glass'));
      S.rect(35, 22, 12, 8, M('#6d4223', 'wood')); S.poly([[38, 23.5], [40.5, 23.5], [40, 28.5], [38.5, 28.5]], M('#dfeff5', 'glass'), { bev: 0.4 }); S.cap(44, 28.5, 44, 23.5, 1.2, 1, M('#1f5c2a', 'glass'));
      S.ell(10, 47, 4, 2.4, M('#7a4e27', 'wood')); S.ell(44, 47, 4, 2.4, M('#7a4e27', 'wood'));
    });
  }
  function casetaSpr(col) {
    return decoSprite('caseta' + col, 54, 46, S => {
      S.poly([[6, 18], [48, 18], [48, 44], [6, 44]], M('#a8743f', 'wood'), { bev: 1.2, folds: 5 });
      S.poly([[2, 6], [52, 6], [56, 19], [-2, 19]], M(col), { bev: 2, folds: 6 });
      for (let i = 0; i < 6; i++) S.poly([[1 + i * 9, 19], [6 + i * 9, 19], [3.5 + i * 9, 23]], M(i % 2 ? '#f4f4f4' : col));
      S.rect(10, 30, 34, 3, M('#6d4223', 'wood'));
      S.poly([[14, 25], [17, 25], [16.6, 30], [14.4, 30]], M('#dfeff5', 'glass'), { bev: 0.4 }); S.cap(26, 30, 26, 24, 1.4, 1.2, M('#1f5c2a', 'glass')); S.poly([[34, 25.5], [37, 25.5], [36.6, 30], [34.4, 30]], M('#dfeff5', 'glass'), { bev: 0.4 });
    });
  }
  function lampSpr() {
    return decoSprite('lamp', 12, 36, S => { S.cap(6, 35, 6, 9, 0.9, 0.8, M('#2b2b30', 'metal')); S.poly([[2, 4], [10, 4], [9, 10], [3, 10]], M('#2b2b30', 'metal'), { bev: 1 }); S.rect(3.6, 5.2, 4.8, 3.6, F('#ffe7a0')); S.ell(6, 35, 2.2, 0.9, M('#2b2b30', 'metal')); });
  }
  ART.lampSpots = function (s) {
    const L = [];
    if (s.mapId !== 'villa') return L;
    s.tiles.forEach((t, i) => { const c = i % s.W, r = Math.floor(i / s.W); if ((t.t === 'street' || t.t === 'plaza') && hash(c, r, 9) < 0.07) L.push([c, r]); });
    return L;
  };
  function shadowEll(ctx, x, y, rx, ry, a) { ctx.save(); ctx.fillStyle = `rgba(20,16,30,${a || 0.28})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }

  function drawLandmark(ctx, lm, cx, by, w) {
    const k = lm.k;
    const shade = (x, y, ww, hh) => { const g = ctx.createLinearGradient(x, y, x + ww, y); g.addColorStop(0, 'rgba(255,240,210,0.10)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(30,20,50,0.28)'); ctx.fillStyle = g; ctx.fillRect(x, y, ww, hh); };
    const R = (x, y, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
    const circ = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    if (k !== 'tent') shadowEll(ctx, cx + 14, by + 2, w * 0.52, 14, 0.3);
    if (k === 'iglesia') {
      const x = cx - w / 2 + 10, ww = w - 20;
      R(x, by - 100, ww, 100, '#c9b998'); for (let q = 0; q < ww; q += 9) for (let y = 0; y < 100; y += 7) R(x + q + ((y / 7) % 2) * 4, by - 100 + y, 8, 1, '#ab9b7a');
      R(x - 6, by - 112, ww + 12, 14, '#7f412d'); for (let q = 0; q < ww + 12; q += 5) R(x - 6 + q, by - 112, 1, 14, '#5f2f20');
      const top = by - 150; R(cx - 22, top, 44, 40, '#c4b391'); R(cx - 26, top + 36, 52, 4, '#a89878'); R(cx - 6, top - 10, 12, 12, '#c4b391'); R(cx - 1, top - 20, 2, 10, '#4a3528'); R(cx - 4, top - 16, 8, 2, '#4a3528');
      R(cx - 16, top + 10, 11, 20, '#251b14'); R(cx + 5, top + 10, 11, 20, '#251b14'); circ(cx - 10.5, top + 19, 4, '#b8862e'); circ(cx + 10.5, top + 19, 4, '#b8862e');
      shade(cx - 22, top, 44, 40);
      for (let a = 0; a < 4; a++) { const Rr = 30 - a * 6; ctx.fillStyle = a % 2 ? '#b4a27f' : '#d8c8a5'; ctx.beginPath(); ctx.arc(cx, by - 40, Rr, Math.PI, 0); ctx.lineTo(cx + Rr, by); ctx.lineTo(cx - Rr, by); ctx.fill(); }
      R(cx - 8, by - 40, 16, 40, '#3a271a'); ctx.fillStyle = '#3a271a'; ctx.beginPath(); ctx.arc(cx, by - 40, 8, Math.PI, 0); ctx.fill();
      circ(cx, by - 82, 9, '#8a7a5c'); circ(cx, by - 82, 6, '#4f75a0'); R(cx - 1, by - 88, 2, 12, '#8a7a5c'); R(cx - 6, by - 83, 12, 2, '#8a7a5c');
      for (let q = x + 8; q < x + ww - 8; q += 14) if (Math.abs(q - cx) > 36) R(q, by - 70, 6, 14, '#251b14');
      shade(x, by - 100, ww, 100);
    } else if (k === 'ayuntamiento') {
      const x = cx - w / 2 + 6, ww = w - 12;
      R(x, by - 92, ww, 92, '#e3cf9e'); R(x - 4, by - 100, ww + 8, 10, '#7f412d');
      for (let q = 0; q < ww - 4; q += 26) {
        ctx.fillStyle = '#33291f'; ctx.beginPath(); ctx.arc(x + 15 + q, by - 22, 10, Math.PI, 0); ctx.lineTo(x + 25 + q, by); ctx.lineTo(x + 5 + q, by); ctx.fill();
        R(x + 9 + q, by - 64, 12, 18, '#2a4554'); R(x + 10 + q, by - 63, 4, 6, '#5f8ca3'); R(x + 7 + q, by - 46, 16, 3, '#2b2b2b'); for (let z = 0; z < 16; z += 3) R(x + 7 + q + z, by - 52, 1, 6, '#2b2b2b');
      }
      R(cx - 18, by - 128, 36, 30, '#e8d6a8'); R(cx - 22, by - 132, 44, 6, '#7f412d');
      circ(cx, by - 112, 9, '#3e2723'); circ(cx, by - 112, 7.5, '#f6f1e2'); R(cx, by - 118, 1, 6, '#212121'); R(cx, by - 112, 5, 1, '#212121');
      R(cx + 26, by - 150, 2, 40, '#4a3528'); R(cx + 28, by - 150, 14, 9, '#1e66c0'); R(cx + 33, by - 148, 4, 5, '#ffcc00');
      shade(x, by - 92, ww, 92); shade(cx - 18, by - 128, 36, 30);
    } else if (k === 'teatro') {
      const x = cx - w / 2 + 6, ww = w - 12;
      R(x, by - 96, ww, 96, '#ead6a6'); R(x, by - 96, ww, 6, '#c08f42'); R(x, by - 50, ww, 4, '#c08f42');
      R(x - 4, by - 108, ww + 8, 14, '#343f4b'); for (let q = 0; q < ww + 8; q += 5) R(x - 4 + q, by - 108, 1, 14, '#262e37');
      for (let a = -1; a <= 1; a++) { const ax = cx + a * 40; ctx.fillStyle = '#41291b'; ctx.beginPath(); ctx.arc(ax, by - 30, 13, Math.PI, 0); ctx.lineTo(ax + 13, by); ctx.lineTo(ax - 13, by); ctx.fill(); R(ax - 9, by - 86, 18, 26, '#7c5a3c'); ctx.fillStyle = '#ead6a6'; ctx.beginPath(); ctx.arc(ax, by - 86, 9, Math.PI, 0); ctx.fill(); R(ax - 7, by - 84, 14, 22, '#a53328'); }
      ctx.fillStyle = '#5a3d1f'; ctx.font = 'bold 13px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.fillText('TEATRO RIERA', cx, by - 55);
      shade(x, by - 96, ww, 96);
    } else if (k === 'abastos') {
      const x = cx - w / 2 + 6, ww = w - 12;
      R(x, by - 70, ww, 70, '#ad5f2b'); for (let q = 0; q < ww; q += 6) for (let y = 0; y < 70; y += 4) R(x + q + ((y / 4) % 2) * 3, by - 70 + y, 5, 1, '#924e24');
      R(x - 4, by - 84, ww + 8, 16, '#46545c'); R(x - 4, by - 70, ww + 8, 2, '#2a343a');
      for (let q = 0; q < ww - 10; q += 30) { ctx.fillStyle = '#93bccf'; ctx.beginPath(); ctx.arc(x + 20 + q, by - 36, 11, Math.PI, 0); ctx.lineTo(x + 31 + q, by - 6); ctx.lineTo(x + 9 + q, by - 6); ctx.fill(); R(x + 19 + q, by - 47, 2, 41, '#333'); }
      ctx.fillStyle = '#fff3d6'; ctx.font = 'bold 12px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.fillText('MERCADO', cx, by - 73);
      shade(x, by - 70, ww, 70);
    } else if (k === 'hevia') {
      const x = cx - w / 2 + 4, ww = w - 8;
      R(x, by - 80, ww, 80, '#bfae8e'); for (let q = 0; q < ww; q += 10) for (let y = 0; y < 80; y += 8) R(x + q + ((y / 8) % 2) * 5, by - 80 + y, 9, 1, '#9f8e6c');
      R(x - 5, by - 94, ww + 10, 16, '#9a3d27'); R(x + 10, by - 46, ww - 20, 5, '#5d3a1a'); for (let q = 0; q < ww - 20; q += 5) R(x + 10 + q, by - 56, 1, 10, '#5d3a1a');
      R(cx - 10, by - 74, 20, 18, '#9e8a66'); R(cx - 7, by - 71, 14, 12, '#7a2a20'); R(cx - 3, by - 69, 6, 8, '#d4af37');
      R(cx - 7, by - 26, 14, 26, '#41291b'); R(x + 14, by - 70, 10, 14, '#2a4554'); R(x + ww - 24, by - 70, 10, 14, '#2a4554');
      shade(x, by - 80, ww, 80);
    } else if (k === 'stage') {
      const x = cx - w / 2 + 4, ww = w - 8;
      R(x, by - 34, ww, 34, '#6f4321'); for (let q = 0; q < ww; q += 6) R(x + q, by - 34, 1, 34, '#51301a');
      R(x + 10, by - 120, ww - 20, 86, '#181828'); for (let q = 0; q < 6; q++) R(x + 30 + q * ((ww - 60) / 5), by - 120, 4, 6, ['#ff4081', '#ffd740', '#40c4ff', '#69f0ae', '#ff6e40', '#e040fb'][q]);
      R(x + 4, by - 128, ww - 8, 8, '#3a3a3a'); for (let q = 0; q < ww - 8; q += 8) R(x + 4 + q, by - 128, 1, 8, '#1d1d1d');
      [x + 2, x + ww - 26].forEach(sx => { R(sx, by - 90, 24, 56, '#1d1d1d'); circ(sx + 12, by - 76, 7, '#3d3d3d'); circ(sx + 12, by - 50, 9, '#3d3d3d'); circ(sx + 12, by - 50, 3, '#6e6e6e'); });
      ctx.fillStyle = '#ffd740'; ctx.font = 'bold 15px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.fillText('ORQUESTA', cx, by - 80);
      shade(x, by - 128, ww, 128);
    } else if (k === 'barra') {
      R(cx - 90, by - 28, 180, 28, '#87552a'); R(cx - 92, by - 32, 184, 6, '#56361a');
      R(cx - 96, by - 64, 192, 16, '#2c6fd6'); for (let q = 0; q < 192; q += 12) R(cx - 96 + q, by - 64, 6, 16, '#f4f4f4');
      for (let q = -80; q < 80; q += 14) { R(cx + q, by - 42, 4, 10, '#dfeff5'); R(cx + q, by - 38, 4, 6, '#e2a93a'); }
      R(cx - 92, by - 48, 3, 20, '#56361a'); R(cx + 89, by - 48, 3, 20, '#56361a');
      ctx.fillStyle = '#fff8e1'; ctx.font = 'bold 13px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; ctx.fillText('LA GRAN BARRA', cx, by - 52);
      shade(cx - 96, by - 64, 192, 64);
    } else if (k === 'tent') {
      shadowEll(ctx, cx + 6, by - 4, 22, 6, 0.28);
      ctx.drawImage(barrelPile(), Math.round(cx - 24), Math.round(by - 46), 48, 42);
      if (lm.label) { ctx.font = 'bold 10px "Pixelify Sans", monospace'; ctx.textAlign = 'center'; const m = ctx.measureText(lm.label).width; ctx.fillStyle = 'rgba(30,20,10,0.78)'; ctx.fillRect(cx - m / 2 - 4, by - 62, m + 8, 13); ctx.fillStyle = '#fff3d6'; ctx.fillText(lm.label, cx, by - 52); }
    }
  }

  /* ---------- Terreno con bordes orgánicos ---------- */
  function vnoise(x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function hexAtWorld(s, wx, wy) {
    const c0 = Math.round((wx - S0) / (1.5 * S0)); let best = -1, bd = 1e9;
    for (let c = c0 - 1; c <= c0 + 1; c++) { if (c < 0 || c >= s.W) continue; const r0 = Math.round((wy - SQ / 2 - (c & 1) * SQ / 2) / SQ);
      for (let r = r0 - 1; r <= r0 + 1; r++) { if (r < 0 || r >= s.H) continue; const [x, y] = ART.hexCenter(c, r), d = (x - wx) ** 2 + (y - wy) ** 2; if (d < bd) { bd = d; best = r * s.W + c; } } }
    return best;
  }
  const PAL = {
    grass: [[70, 122, 50], [86, 140, 58], [60, 106, 44]], park: [[52, 96, 40], [62, 110, 46], [44, 82, 34]], street: [[148, 136, 120], [124, 113, 99], [98, 89, 78]],
    alley: [[132, 121, 106], [112, 102, 89], [90, 82, 72]], plaza: [[196, 180, 148], [176, 160, 130], [150, 136, 110]], castle: [[134, 128, 116], [112, 107, 97], [86, 82, 74]],
    tavern: [[150, 136, 120], [126, 114, 100], [100, 90, 80]], mud: [[112, 78, 48], [94, 64, 38], [128, 96, 64]], dance: [[214, 182, 110], [184, 148, 76], [160, 124, 60]],
    stage: [[130, 84, 44], [106, 66, 34], [84, 52, 26]], water: [[38, 98, 142], [30, 82, 124], [56, 122, 168]], sand: [[220, 206, 166], [196, 182, 142]]
  };
  function texCol(t, wx, wy, xir) {
    const bx = Math.floor(wx / 3), by = Math.floor(wy / 3), n = hash(bx, by, 1), n2 = hash(bx, by, 2);
    const low = vnoise(wx / 90, wy / 90, 7), mid = vnoise(wx / 24, wy / 24, 8);
    let k = t === 'keep' ? 'castle' : t === 'cover' || t === 'wall' ? (xir ? 'grass' : 'street') : t === 'tables' || t === 'puddle' ? 'grass' : t;
    if (k === 'tavern' && xir) k = 'grass';
    const P = PAL[k] || PAL.grass;
    let c = P[0];
    switch (k) {
      case 'grass': case 'park':
        c = mid > 0.62 ? P[1] : mid < 0.32 ? P[2] : P[0];
        if (n < 0.12) c = P[2]; else if (n > 0.9) c = P[1];
        if (k === 'grass' && n2 < 0.006) c = n < 0.5 ? [250, 236, 150] : [240, 190, 205];
        break;
      case 'street': case 'alley': case 'tavern': {
        const row = by >> 1, gap = ((bx + (row % 2) * 2) % 4 === 0) || by % 2 === 0;
        c = gap ? P[2] : (n < 0.3 ? P[1] : P[0]);
        if (!gap && n > 0.92) c = [Math.min(255, P[0][0] + 16), Math.min(255, P[0][1] + 14), Math.min(255, P[0][2] + 12)];
        break;
      }
      case 'plaza': c = (bx % 8 === 0 || by % 7 === 0) ? P[2] : n < 0.15 ? P[1] : P[0]; break;
      case 'castle': c = (by % 4 === 0 || (bx + (by >> 2) * 3) % 6 === 0) ? P[2] : n < 0.2 ? P[1] : P[0]; break;
      case 'mud': c = mid > 0.6 ? P[1] : n < 0.15 ? P[1] : n > 0.9 ? P[2] : P[0]; if (n2 < 0.03) c = [150, 170, 180]; break;
      case 'dance': c = ((bx >> 2) + (by >> 2)) % 2 ? P[1] : P[0]; if (n < 0.08) c = P[2]; break;
      case 'stage': c = by % 3 === 0 ? P[2] : P[0]; break;
      case 'water': { const w = vnoise(wx / 30 + 3, wy / 14, 9); c = w > 0.68 ? P[2] : w < 0.3 ? P[1] : P[0]; if (n < 0.04) c = [120, 170, 205]; break; }
    }
    const lf = 0.9 + low * 0.18;
    return [c[0] * lf, c[1] * lf, c[2] * lf];
  }
  function treeSpr2(v) {
    return decoSprite('tree2_' + v, 30, 38, S => {
      const g = ['#2f6a2a', '#3a7a30', '#2d5f27', '#355f2a'][v % 4];
      S.cap(15, 37, 15, 24, 1.8, 1.3, M('#5d3a1a', 'wood'));
      if (v % 3 === 2) { // abeto
        [[15, 10, 6, 6], [15, 17, 8.5, 6], [15, 24, 10.5, 6.5]].forEach(([x, y, w, h]) => S.poly([[x, y - h - 2], [x + w, y + h], [x - w, y + h]], M('#2b5a2a', 'leaf'), { bev: 2 }));
      } else [[15, 17, 11, 8.5], [9, 21, 6.5, 5.5], [21, 20, 7, 6], [13, 11, 7, 5.5], [19, 12, 6, 5]].forEach(([x, y, rx, ry], i) => S.ell(x + (v % 2) * (i % 2 ? 1 : -1), y, rx, ry, M(i === 3 ? sh(g, 0.07) : g, 'leaf')));
    });
  }
  function villageSpr(kind, v) {
    return decoSprite('vill' + kind + v, 58, 54, S => {
      if (kind === 'caseta') {
        const col = ['#2c6fd6', '#e8463a', '#2aa876', '#f2a72e', '#8e44ad'][v % 5];
        S.poly([[9, 24], [49, 24], [49, 50], [9, 50]], M('#a8743f', 'wood'), { bev: 1.2, folds: 5 });
        S.poly([[4, 12], [54, 12], [58, 25], [0, 25]], M(col), { bev: 2, folds: 6, trim: M('#f4f4f4'), trimW: 0.8 });
        for (let i = 0; i < 6; i++) S.poly([[2 + i * 9, 25], [8 + i * 9, 25], [5 + i * 9, 29]], M(i % 2 ? '#f4f4f4' : col));
        S.rect(13, 36, 32, 3, M('#6d4223', 'wood')); S.poly([[17, 31], [20, 31], [19.6, 36], [17.4, 36]], M('#dfeff5', 'glass'), { bev: 0.4 }); S.cap(29, 36, 29, 30, 1.4, 1.2, M('#1f5c2a', 'glass'));
        S.ell(12, 50, 3, 1.8, M('#7a4e27', 'wood')); S.ell(46, 50, 3, 1.8, M('#7a4e27', 'wood'));
        return;
      }
      // casería asturiana con corredor y hórreo al lado
      const wall = ['#efe6cf', '#f3e3c3', '#ead9bd'][v % 3];
      S.poly([[6, 22], [38, 22], [38, 50], [6, 50]], M(wall), { bev: 1.5 });
      S.rect(4, 20, 3, 31, M('#b8a98e', 'stone')); S.rect(37, 20, 3, 31, M('#b8a98e', 'stone'));
      S.poly([[1, 23], [22, 7], [43, 23]], M('#a63d27'), { bev: 2.5, folds: 3 });
      S.rect(8, 28, 28, 2.6, M('#6d4223', 'wood')); for (let i = 0; i < 7; i++) S.rect(9 + i * 4, 30.6, 1.1, 5, M('#6d4223', 'wood'));
      S.rect(18, 37, 8, 13, M('#2e5d3a')); S.rect(9, 38, 6, 6, M('#2e5d3a')); S.rect(10, 39, 4, 3.4, M('#ffd78a', 'glass'));
      // hórreo
      [[44, 50], [54, 50], [44, 44], [54, 44]].forEach(([x, y], i) => i < 2 && S.cap(x, y, x, 40, 1.2, 1.1, M('#9a8f80', 'stone')));
      S.rect(41, 33, 16, 8, M('#8a5a2c', 'wood'), { folds: 3 }); S.poly([[39, 34], [49, 26], [59, 34]], M('#a63d27'), { bev: 2 });
      S.rect(40, 40.4, 18, 1.4, M('#9a8f80', 'stone'));
    });
  }
  ART.villageSpr = villageSpr;
  function barrelPile() {
    return decoSprite('barrels', 48, 42, S => {
      const w = M('#8b5a2b', 'wood'), hoop = M('#4c4c57', 'metal');
      [[12, 34], [24, 34], [36, 34], [18, 22], [30, 22]].forEach(([x, y]) => { S.ell(x, y, 6, 6.5, w); S.rect(x - 6, y - 3, 12, 1.2, hoop, { noLine: true }); S.rect(x - 6, y + 2, 12, 1.2, hoop, { noLine: true }); S.ell(x, y, 2, 2.2, M('#6d4223', 'wood')); });
      S.rect(3, 40, 42, 2, M('#5d3a1a', 'wood'));
    });
  }

  ART.renderTerrain = function (s) {
    const [mw, mh] = ART.mapSize(s), Wp = Math.ceil(mw), Hp = Math.ceil(mh);
    const cv = mk(Wp, Hp), ctx = cv.getContext('2d');
    const xir = s.mapId === 'xiringuelu', B = 3;
    const im = ctx.createImageData(Wp, Hp), D = im.data;
    for (let by = 0; by < Hp; by += B) for (let bx = 0; bx < Wp; bx += B) {
      const cx = bx + 1.5, cy = by + 1.5;
      const wx = cx + (vnoise(cx / 34, cy / 34, 3) - 0.5) * 26, wy = cy + (vnoise(cx / 34 + 9, cy / 34, 4) - 0.5) * 26;
      const i = hexAtWorld(s, wx, wy); if (i < 0) continue;
      const t = s.tiles[i].t;
      let col = texCol(t, cx, cy, xir);
      if (t === 'water') { const j = hexAtWorld(s, wx + 7, wy + 7), j2 = hexAtWorld(s, wx - 7, wy - 7); if ((j >= 0 && s.tiles[j].t !== 'water') || (j2 >= 0 && s.tiles[j2].t !== 'water')) col = PAL.sand[hash(bx, by, 5) < 0.5 ? 0 : 1]; }
      for (let y = by; y < Math.min(Hp, by + B); y++) for (let x = bx; x < Math.min(Wp, bx + B); x++) { const p = (y * Wp + x) * 4; D[p] = col[0]; D[p + 1] = col[1]; D[p + 2] = col[2]; D[p + 3] = 255; }
    }
    ctx.putImageData(im, 0, 0);
    // rejilla tenue
    ctx.strokeStyle = 'rgba(20,16,10,0.08)'; ctx.lineWidth = 1;
    for (let i = 0; i < s.tiles.length; i++) { const [x, y] = ART.hexCenter(i % s.W, Math.floor(i / s.W)); hexPath(ctx, x, y, S0); ctx.stroke(); }
    const M0 = VV.MAPS[s.mapId], lmTiles = new Map();
    (M0.landmarks || []).forEach((lm, k) => lm.tiles.forEach(([c, r]) => lmTiles.set(r * s.W + c, k)));
    const items = [];
    s.tiles.forEach((t, i) => {
      const c = i % s.W, r = Math.floor(i / s.W), [x, y] = ART.hexCenter(c, r);
      if (lmTiles.has(i)) return;
      if (t.t === 'park') for (let k = 0; k < 3; k++) { const ox = [-12, 11, 0][k] + (hash(c, r, k) - 0.5) * 8, oy = [-8, -5, 9][k] + (hash(c, r, k + 4) - 0.5) * 6, v = Math.floor(hash(c, r, k + 9) * 4); items.push({ y: y + oy + 12, f: () => { shadowEll(ctx, x + ox + 6, y + oy + 13, 10, 3.5); ctx.drawImage(treeSpr2(v), Math.round(x + ox - 15), Math.round(y + oy - 24), 30, 38); } }); }
      if (t.t === 'wall' && !xir) items.push({ y: y + 18, f: () => { shadowEll(ctx, x + 10, y + 20, 30, 7); ctx.drawImage(houseSpr(c * 7 + r), Math.round(x - 32), Math.round(y - 42), 64, 62); } });
      if (t.t === 'wall' && xir) items.push({ y: y + 16, f: () => { shadowEll(ctx, x + 6, y + 14, 22, 6); ctx.drawImage(barrelPile(), Math.round(x - 24), Math.round(y - 28), 48, 42); } });
      if (t.prop >= 0 && (t.t === 'tavern')) { const kind = xir ? 'caseta' : 'caseria'; items.push({ y: y + 14, f: () => { shadowEll(ctx, x + 8, y + 17, 30, 7); ctx.drawImage(villageSpr(kind, c * 3 + r), Math.round(x - 35), Math.round(y - 48), 70, 65); } }); }
      if (t.t === 'cover' && t.prop < 0) items.push({ y: y + 10, f: () => { const col = ['#b5452c', '#2e7d32', '#1e5aa8'][(c + r) % 3]; blk(ctx, x - 22, y - 2, 44, 3, '#5d3a1a'); for (let q = 0; q < 5; q++) blk(ctx, x - 20 + q * 10, y + 1, 3, 13, '#5d3a1a'); blk(ctx, x - 26, y - 12, 52, 10, col); for (let q = 0; q < 52; q += 6) blk(ctx, x - 26 + q, y - 4, 3, 2, '#fafafa'); blk(ctx, x - 26, y - 12, 52, 2, sh(col, 0.25)); } });
      if (t.t === 'castle' || t.t === 'keep') items.push({ y: y + 6, f: () => { for (let q = -24; q <= 20; q += 11) { blk(ctx, x + q, y - SQ / 2 + 3, 7, 7, '#5c584f'); blk(ctx, x + q, y - SQ / 2 + 3, 7, 2, '#8a857a'); } if (t.t === 'keep') { shadowEll(ctx, x + 6, y + 6, 18, 5); blk(ctx, x - 12, y - 18, 24, 22, '#77726a'); blk(ctx, x + 6, y - 18, 6, 22, '#5e5a52'); blk(ctx, x - 14, y - 22, 28, 5, '#5c5850'); for (let q = -14; q < 14; q += 7) blk(ctx, x + q, y - 26, 4, 4, '#5c5850'); blk(ctx, x - 4, y - 8, 8, 12, '#2f261d'); } } });
    });
    ART.lampSpots(s).forEach(([c, r]) => { const [x, y] = ART.hexCenter(c, r); items.push({ y: y + 14, f: () => ctx.drawImage(lampSpr(), Math.round(x + 12), Math.round(y - 22), 12, 36) }); });
    (M0.landmarks || []).forEach(lm => {
      let x0 = 1e9, x1 = -1e9, y1 = -1e9;
      lm.tiles.forEach(([c, r]) => { const [x, y] = ART.hexCenter(c, r); x0 = Math.min(x0, x - S0); x1 = Math.max(x1, x + S0); y1 = Math.max(y1, y + SQ / 2); });
      items.push({ y: y1, f: () => drawLandmark(ctx, lm, (x0 + x1) / 2, y1 - 6, x1 - x0) });
    });
    if (xir) [3, 9].forEach(rr => {
      ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 1; ctx.beginPath(); for (let c = 3; c < s.W - 3; c++) { const [x, y] = ART.hexCenter(c, rr); ctx.lineTo(x, y - 46 + Math.sin(c) * 3); } ctx.stroke();
      for (let c = 3; c < s.W - 3; c++) { const [x, y] = ART.hexCenter(c, rr); const yy = y - 46 + Math.sin(c) * 3; ctx.fillStyle = ['#e53935', '#fdd835', '#1e88e5', '#43a047', '#fafafa'][c % 5]; ctx.beginPath(); ctx.moveTo(x - 5, yy); ctx.lineTo(x + 5, yy); ctx.lineTo(x, yy + 8); ctx.fill(); }
    });
    items.sort((a, b) => a.y - b.y).forEach(it => it.f());
    return cv;
  };
  ART.lightSpots = function (s) {
    const L = ART.lampSpots(s).map(([c, r]) => { const [x, y] = ART.hexCenter(c, r); return [x + 16, y - 16, 72]; });
    if (s.mapId === 'xiringuelu') for (const rr of [3, 9]) for (let c = 3; c < s.W - 3; c += 2) { const [x, y] = ART.hexCenter(c, rr); L.push([x, y - 44, 46]); }
    s.props.forEach(p => { if (p.bar || p.kind === 'escenario') { const [x, y] = ART.hexCenter(p.c, p.r); L.push([x, y - 10, 80]); } });
    return L;
  };
  ART.minimap = function (s, w, h) {
    const cv = mk(w, h), ctx = cv.getContext('2d');
    const [mw, mh] = ART.mapSize(s), k = Math.min(w / mw, h / mh);
    s.tiles.forEach((t, i) => { const [x, y] = ART.hexCenter(i % s.W, Math.floor(i / s.W)); ctx.fillStyle = t.t === 'wall' ? '#a8432a' : BASE[t.t]; ctx.fillRect((x - S0) * k, (y - SQ / 2) * k, 2 * S0 * k + 1, SQ * k + 1); });
    return { cv, k };
  };

  /* ---------- Escena del menú principal ---------- */
  ART.menuScene = function (ctx, w, h, t) {
    const px = Math.max(3, Math.round(Math.min(w, h) / 220));
    const R = (x, y, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); };
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#1d1f45'); sky.addColorStop(0.42, '#9e4a52'); sky.addColorStop(0.72, '#e39a55'); sky.addColorStop(1, '#f2cc86');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffe0a0'; ctx.beginPath(); ctx.arc(w * 0.78, h * 0.42, Math.round(h * 0.09), 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 50; k++) R(hash(k, 1, 1) * w, hash(k, 2, 1) * h * 0.32, px / 1.5, px / 1.5, 'rgba(255,255,230,' + (0.3 + 0.5 * Math.abs(Math.sin(t / 900 + k))) + ')');
    ctx.fillStyle = '#4a3b5c'; ctx.beginPath(); ctx.moveTo(0, h * 0.62); for (let x = 0; x <= w; x += px * 4) ctx.lineTo(x, h * 0.55 - Math.sin(x / 140) * 30 - Math.sin(x / 47) * 9); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    ctx.fillStyle = '#335a3a'; ctx.beginPath(); ctx.moveTo(0, h * 0.7); for (let x = 0; x <= w; x += px * 4) ctx.lineTo(x, h * 0.66 - Math.sin(x / 90 + 1) * 16); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    ctx.fillStyle = '#25618d'; ctx.fillRect(0, h * 0.9, w, h * 0.1);
    for (let k = 0; k < 30; k++) R((hash(k, 3, 1) * w + t * 0.02 * (k % 3 + 1)) % w, h * 0.91 + hash(k, 4, 1) * h * 0.08, px * 4, px / 2, '#7fb3d9');
    const base = h * 0.9;
    let x = -px * 10, k = 0;
    while (x < w) {
      const hw = px * (14 + Math.floor(hash(k, 5, 2) * 10)), hh = px * (12 + Math.floor(hash(k, 6, 2) * 14));
      const wall = ['#efe6cf', '#f3e3c3', '#e2d3b7', '#f1d9b5', '#d9c7a6'][k % 5];
      if (k === 6) {
        R(x, base - px * 34, px * 30, px * 34, '#c4b391'); R(x + px * 9, base - px * 50, px * 12, px * 16, '#c4b391'); R(x + px * 11, base - px * 46, px * 3, px * 5, '#2b2118'); R(x + px * 16, base - px * 46, px * 3, px * 5, '#2b2118');
        R(x + px * 14, base - px * 56, px * 2, px * 6, '#3e2723'); R(x - px, base - px * 36, px * 32, px * 3, '#7f412d'); R(x + px * 11, base - px * 14, px * 8, px * 14, '#3e2a1c');
        R(x + px * 22, base - px * 34, px * 8, px * 34, 'rgba(20,10,40,0.22)');
        x += px * 32; k++; continue;
      }
      R(x, base - hh, hw, hh, wall); R(x + hw - px * 3, base - hh, px * 3, hh, 'rgba(20,10,40,0.18)'); R(x - px, base - hh - px * 6, hw + px * 2, px * 6, '#9a3d27');
      for (let q = 0; q < hw + px * 2; q += px * 2) R(x - px + q, base - hh - px * 6, px / 2, px * 6, '#6f2818');
      R(x + px * 2, base - hh + px * 4, hw - px * 4, px, '#5d3a1a');
      for (let q = px * 3; q < hw - px * 3; q += px * 6) { const lit = hash(k, q, 7) < 0.45; R(x + q, base - hh + px * 6, px * 3, px * 4, lit ? '#ffd27a' : '#2e5d3a'); }
      if (hash(k, 8, 2) < 0.5) { const cx = x + hw - px * 4; R(cx, base - hh - px * 10, px * 3, px * 5, '#8a7f70');
        for (let s2 = 0; s2 < 5; s2++) { const life = ((t / 2600 + s2 / 5 + k * 0.13) % 1); R(cx + Math.sin(life * 6 + k) * px * 3, base - hh - px * 11 - life * px * 30, px * 2 * (1 + life), px * 2 * (1 + life), 'rgba(230,230,240,' + (0.5 * (1 - life)) + ')'); } }
      if (k % 4 === 2) { const fx = x + px * 4; R(fx, base - hh - px * 18, px / 2 + 1, px * 12, '#3e2723'); for (let q = 0; q < 8; q++) R(fx + px + q * px, base - hh - px * 18 + Math.sin(t / 320 + q * 0.7) * px, px, px * 4, q % 2 ? '#1e66c0' : '#ffcc00'); }
      x += hw + px; k++;
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let q = 0; q < 6; q++) { const lx = w * (0.08 + q * 0.17), ly = base - px * 4; const gr = ctx.createRadialGradient(lx, ly, 0, lx, ly, px * 16); gr.addColorStop(0, 'rgba(255,200,110,0.5)'); gr.addColorStop(1, 'rgba(255,200,110,0)'); ctx.fillStyle = gr; ctx.fillRect(lx - px * 16, ly - px * 16, px * 32, px * 32); }
    ctx.globalCompositeOperation = 'source-over';
  };
})(typeof window !== 'undefined' ? window : globalThis);
