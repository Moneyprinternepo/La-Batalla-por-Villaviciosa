/* LA BATALLA POR VILLAVICIOSA — engine.js
   Lógica pura (sin DOM). Cada acción devuelve una lista de eventos que la
   interfaz reproduce como animaciones. */
(function (G) {
  const VV = G.VV;
  const E = (VV.Engine = {});

  /* ---------- RNG reproducible (mulberry32) ---------- */
  E.rand = function (s) {
    let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* ---------- Hexágonos (odd-q) ---------- */
  const Hex = (VV.Hex = {
    toCube(c, r) { const x = c, z = r - ((c - (c & 1)) >> 1); return [x, -x - z, z]; },
    fromCube(x, y, z) { return [x, z + ((x - (x & 1)) >> 1)]; },
    dist(c1, r1, c2, r2) {
      const a = Hex.toCube(c1, r1), b = Hex.toCube(c2, r2);
      return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
    },
    DIRS: [[1, -1, 0], [1, 0, -1], [0, 1, -1], [-1, 1, 0], [-1, 0, 1], [0, -1, 1]],
    neighbors(c, r) {
      const a = Hex.toCube(c, r);
      return Hex.DIRS.map(d => Hex.fromCube(a[0] + d[0], a[1] + d[1], a[2] + d[2]));
    }
  });
  E.Hex = Hex;

  const inB = (s, c, r) => c >= 0 && r >= 0 && c < s.W && r < s.H;
  const I = (s, c, r) => r * s.W + c;
  const CR = (s, i) => [i % s.W, Math.floor(i / s.W)];
  E.idx = I; E.cr = CR; E.inBounds = inB;
  E.neighborsIdx = function (s, i) {
    const [c, r] = CR(s, i);
    return Hex.neighbors(c, r).filter(([x, y]) => inB(s, x, y)).map(([x, y]) => I(s, x, y));
  };
  E.distIdx = (s, a, b) => { const [c1, r1] = CR(s, a), [c2, r2] = CR(s, b); return Hex.dist(c1, r1, c2, r2); };

  /* ---------- Definiciones derivadas de unidad ---------- */
  const D = u => VV.UNITS[u.def];
  const LV = u => D(u).levels[u.lvl];
  E.def = D; E.lvlDef = LV;
  E.unitLevel = u => (D(u).kind === 'summon' ? 0 : u.lvl + 1);
  E.maxHp = u => LV(u).hp + (u.leader ? 10 : 0) + (u.vet || 0) * 3;
  E.maxMov = u => LV(u).mov;
  E.weapons = function (u) {
    const w = LV(u).w.map(x => Object.assign({}, x));
    if (u.def === 'tia_maria' && u.vet >= 2) w.forEach(x => { if (x.t === 'psi') x.d += 1; });
    return w;
  };
  E.abilities = function (u) {
    const d = D(u), out = [];
    for (let i = 0; i <= u.lvl; i++) (d.levels[i].ab || []).forEach(a => {
      const A = VV.ABIL[a];
      if (A.replaces) { const k = out.indexOf(A.replaces); if (k >= 0) out.splice(k, 1); }
      if (!out.includes(a)) out.push(a);
    });
    return out;
  };
  E.hasAbil = (u, id) => E.abilities(u).includes(id);
  E.passive = function (u, key) {
    for (const a of E.abilities(u)) { const A = VV.ABIL[a]; if (A.kind === 'passive' && A[key] != null) return A; }
    return null;
  };
  E.resist = function (u) {
    const d = D(u), r = Object.assign({}, VV.RES[d.arch]);
    Object.assign(r, d.res || {});
    for (let i = 0; i <= u.lvl; i++) Object.assign(r, d.levels[i].res || {});
    return r;
  };
  E.xpNext = function (u) {
    const d = D(u);
    if (d.kind === 'summon') return null;
    const L = LV(u);
    if (L.xp) return L.xp;
    const vc = d.vetCost || [40, 50, 60];
    return (u.vet || 0) < 3 ? vc[u.vet || 0] : null;
  };
  E.unitName = u => LV(u).name;
  E.isMaxLevel = u => !LV(u).xp;

  /* ---------- Estados ---------- */
  E.hasStatus = (u, id) => u.st.some(x => x.id === id);
  E.statusVal = (u, id) => { const x = u.st.find(z => z.id === id); return x ? x.val || 0 : 0; };
  E.addStatus = function (s, u, id, rounds, val) {
    const until = s.turnIndex + s.order.length * (rounds || 1);
    const ex = u.st.find(x => x.id === id);
    if (ex) { ex.until = Math.max(ex.until, until); if (val != null) ex.val = Math.max(ex.val || 0, val); }
    else u.st.push({ id, until, val: val || 0 });
  };

  /* ---------- Construcción de partida ---------- */
  E.buildMap = function (s, mapId) {
    const M = VV.MAPS[mapId];
    s.mapId = mapId; s.H = M.rows.length; s.W = M.rows[0].length;
    s.tiles = []; s.props = []; s.obstacles = {}; s.overlays = {};
    M.rows.forEach((row, r) => {
      if (row.length !== s.W) throw new Error('Fila de mapa irregular ' + r);
      [...row].forEach((ch, c) => {
        const Lg = VV.LEGEND[ch];
        if (!Lg) throw new Error('Carácter de mapa desconocido ' + ch);
        const t = { t: Lg.t, ch, prop: -1 };
        if (Lg.prop) {
          const K = VV.PROPKINDS[Lg.prop];
          t.prop = s.props.length;
          s.props.push({ c, r, kind: Lg.prop, name: (M.names && M.names[c + ',' + r]) || Lg.prop, gold: K.gold, heal: K.heal, def: K.def || 0, bar: !!K.bar, owner: -1, firstBy: null });
        }
        s.tiles.push(t);
        if (Lg.obstacle) s.obstacles[r * s.W + c] = { kind: 'tables', hp: 12, max: 12, owner: -1, until: 1e9 };
      });
    });
  };

  // cfg: {map, factions:[{id, ctrl, diff, leader}], mode, roundLimit, seed}
  E.newGame = function (cfg) {
    const s = {
      v: 1, seed: cfg.seed >>> 0, rng: cfg.seed >>> 0, mode: cfg.mode || 'classic', roundLimit: cfg.roundLimit || 30,
      units: [], nextId: 1, round: 1, turnIndex: 0, cur: 0, winner: null, log: [], dom: {}, fogless: true
    };
    E.buildMap(s, cfg.map);
    s.factions = cfg.factions.map((f, i) => ({
      id: f.id, ctrl: f.ctrl, diff: f.diff || 'normal', gold: VV.ECON.startGold, alive: true,
      uniques: [f.leader], leaderId: 0, keep: VV.MAPS[cfg.map].keeps[i], killGoldRound: 0, name: VV.FACTIONS[f.id].n
    }));
    s.factions.forEach((f, i) => {
      const u = E.makeUnit(s, cfg.factions[i].leader, i, f.keep[0], f.keep[1], { leader: true });
      f.leaderId = u.id;
    });
    // Orden de turno: facción inicial aleatoria con la semilla
    const n = s.factions.length, first = Math.floor(E.rand(s) * n);
    s.order = []; for (let k = 0; k < n; k++) s.order.push((first + k) % n);
    s.cur = 0;
    const ev = [];
    E.beginTurn(s, ev);
    return s;
  };

  E.makeUnit = function (s, defId, fac, c, r, opts) {
    opts = opts || {};
    const u = { id: s.nextId++, def: defId, fac, lvl: 0, xp: 0, vet: 0, x: c, y: r, mp: 0, attacked: true, cd: {}, used: {},
      st: [], leader: !!opts.leader, summon: opts.summon || null, armed: null, moved: false, rested: false, flags: {}, fresh: true };
    u.hp = E.maxHp(u);
    s.units.push(u);
    return u;
  };

  /* ---------- Consultas ---------- */
  E.living = s => s.units.filter(u => !u.dead);
  E.unitAt = function (s, c, r) { for (const u of s.units) if (!u.dead && u.x === c && u.y === r) return u; return null; };
  E.unitAtIdx = (s, i) => { const [c, r] = CR(s, i); return E.unitAt(s, c, r); };
  E.byId = (s, id) => s.units.find(u => u.id === id && !u.dead) || null;
  E.curFac = s => s.order[s.cur];
  E.enemies = (s, a, b) => a !== b;
  E.tod = s => (s.round - 1) % 6;
  E.uIdx = (s, u) => I(s, u.x, u.y);

  E.isPassable = function (s, i) {
    const T = VV.TERRAIN[s.tiles[i].t];
    return T.cost < 99 && !s.obstacles[i];
  };
  E.isFree = (s, i) => E.isPassable(s, i) && !E.unitAtIdx(s, i);

  E.moveCost = function (s, u, i) {
    const tt = s.tiles[i].t, T = VV.TERRAIN[tt];
    if (T.cost >= 99 || s.obstacles[i]) return 99;
    let c = T.cost;
    const A = VV.ARCH[D(u).arch];
    if (A.cost[tt] != null) c = Math.max(1, c + A.cost[tt]);
    const ov = s.overlays[i];
    if (ov) { if (ov.puddle) c += 1; if (ov.sticky) c += 1; }
    if (E.hasStatus(u, 'pringado')) c += 1;
    return c;
  };

  E.defense = function (s, u, i) {
    if (i == null) i = E.uIdx(s, u);
    const t = s.tiles[i], tt = t.t, T = VV.TERRAIN[tt], d = D(u), A = VV.ARCH[d.arch];
    let v = T.def + (A.def[tt] || 0);
    if (A.cap && !T.castle) v = Math.min(v, A.cap);
    if (d.terrainBonus) {
      if (d.terrainBonus.open && T.open) v += d.terrainBonus.open;
      if (d.terrainBonus.dance && tt === 'dance') v += d.terrainBonus.dance;
    }
    if (t.prop >= 0 && s.props[t.prop].def) v += s.props[t.prop].def;
    v += (d.defBonus || 0) + E.statusVal(u, 'evasivo');
    return Math.max(10, Math.min(70, v));
  };

  E.zocSet = function (s, fac) {
    const z = new Set();
    for (const e of s.units) {
      if (e.dead || e.fac === fac || E.unitLevel(e) < 1) continue;
      for (const n of E.neighborsIdx(s, E.uIdx(s, e))) z.add(n);
    }
    return z;
  };

  /* ---------- Movimiento: Dijkstra con zonas de control ---------- */
  E.reachable = function (s, u, mpOverride) {
    const mp = mpOverride != null ? mpOverride : u.mp;
    const start = E.uIdx(s, u), zoc = E.zocSet(s, u.fac);
    const skirm = !!E.passive(u, 'skirmishOnce') && !u.flags.skirmUsed;
    const best = new Map(), parent = new Map(), out = new Map();
    const open = [{ i: start, used: 0, cost: 0 }];
    best.set(start * 2, 0);
    while (open.length) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (open[k].cost < open[bi].cost) bi = k;
      const n = open.splice(bi, 1)[0];
      const key = n.i * 2 + n.used;
      if (n.cost > (best.get(key) ?? Infinity)) continue;
      const occ = E.unitAtIdx(s, n.i);
      const canEnd = n.i === start || !occ;
      const prev = out.get(n.i);
      if (canEnd && (!prev || prev.cost > n.cost)) out.set(n.i, { cost: n.cost, key, zoc: zoc.has(n.i), used: n.used });
      // ¿Debe detenerse aquí?
      let used = n.used;
      if (n.i !== start && zoc.has(n.i)) {
        if (skirm && used === 0) used = 1; else continue;
      }
      for (const nb of E.neighborsIdx(s, n.i)) {
        const o = E.unitAtIdx(s, nb);
        if (o && o.fac !== u.fac) continue;
        const c = E.moveCost(s, u, nb);
        if (c >= 99) continue;
        const nc = n.cost + c;
        if (nc > mp) continue;
        const nk = nb * 2 + used;
        if (nc < (best.get(nk) ?? Infinity)) { best.set(nk, nc); parent.set(nk, key); open.push({ i: nb, used, cost: nc }); }
      }
    }
    out.parent = parent;
    return out;
  };
  E.pathTo = function (reach, dest) {
    const e = reach.get(dest); if (!e) return null;
    const path = []; let k = e.key;
    while (k != null) { path.unshift(k >> 1); k = reach.parent.get(k); }
    return path;
  };

  E.moveUnit = function (s, u, dest) {
    const ev = [];
    if (u.fac !== E.curFac(s) || u.mp <= 0) return { err: 'La unidad no puede moverse.' };
    const reach = E.reachable(s, u);
    const e = reach.get(dest);
    if (!e || dest === E.uIdx(s, u)) return { err: 'Destino inalcanzable.' };
    const path = E.pathTo(reach, dest);
    const [c, r] = CR(s, dest);
    u.x = c; u.y = r; u.mp -= e.cost; u.moved = true;
    const skirm = !!E.passive(u, 'skirmishOnce');
    const zoc = E.zocSet(s, u.fac);
    let zocHits = 0; for (let k = 1; k < path.length; k++) if (zoc.has(path[k])) zocHits++;
    if (skirm && zocHits > 0 && !u.flags.skirmUsed) {
      u.flags.skirmUsed = true; if (zocHits > 1 || zoc.has(dest) && zocHits > 1) u.mp = 0;
    } else if (zoc.has(dest)) u.mp = 0;
    ev.push({ type: 'move', id: u.id, path });
    if (path.slice(1).some(i => s.overlays[i] && s.overlays[i].sticky)) { E.addStatus(s, u, 'pringado', 1); ev.push({ type: 'status', id: u.id, st: 'pringado' }); }
    const t = s.tiles[dest];
    if (t.prop >= 0) {
      const p = s.props[t.prop];
      if (p.owner !== u.fac) {
        const prevOwner = p.owner; p.owner = u.fac; u.mp = 0;
        ev.push({ type: 'capture', id: u.id, prop: t.prop, from: prevOwner });
        if (p.firstBy == null && D(u).kind !== 'summon') { p.firstBy = u.id; u.xp += 3; ev.push({ type: 'xp', id: u.id, n: 3 }); E.checkLevel(s, u, ev); }
      }
    }
    return { ev };
  };

  /* ---------- Combate ---------- */
  E.todMul = function (s, u) {
    const law = VV.TOD[E.tod(s)].law, al = D(u).align;
    if (al === 'l') return 1 + 0.25 * law;
    if (al === 'c') return 1 - 0.25 * law;
    return 1;
  };
  E.attackerMul = function (s, u, w) {
    let m = 1;
    for (const x of u.st) { const S = VV.STATUS[x.id]; if (S.dmg) m *= S.dmg; }
    const p = E.passive(u, 'nearSummonMelee');
    if (p && w.r === 'm') {
      const near = E.neighborsIdx(s, E.uIdx(s, u)).some(i => { const a = E.unitAtIdx(s, i); return a && a.summon && a.summon.by === u.id; });
      if (near) m *= 1 + p.nearSummonMelee;
    }
    return m;
  };
  E.damage = function (s, a, d, base, type, w, extraMul) {
    const res = E.resist(d)[type] || 0;
    let v = base * E.todMul(s, a) * (1 - res / 100) * E.attackerMul(s, a, w || { r: 'x' }) * (extraMul || 1);
    if (E.hasStatus(d, 'protegido')) v *= 0.8;
    return Math.max(1, Math.round(v));
  };
  E.cth = function (s, a, d, acc) {
    let v = 100 - E.defense(s, d) + (acc || 0);
    if (E.hasStatus(a, 'avergonzado')) v -= 10;
    return Math.max(20, Math.min(90, v));
  };
  E.armFor = (u, w) => (u.armed && (u.armed.range === 'any' || u.armed.range === w.r) ? u.armed : null);

  E.counterIndex = function (s, a, d, w) {
    const dw = E.weapons(d); let bi = -1, bv = -1;
    dw.forEach((x, k) => {
      if (x.r !== w.r) return;
      const v = E.damage(s, d, a, x.d, x.t, x) * x.s * E.cth(s, d, a, 0);
      if (v > bv) { bv = v; bi = k; }
    });
    return bi;
  };

  E.combatParams = function (s, a, d, wi) {
    const aw = E.weapons(a)[wi]; if (!aw) return null;
    const arm = E.armFor(a, aw);
    const di = E.counterIndex(s, a, d, aw);
    const dw = di >= 0 ? E.weapons(d)[di] : null;
    return {
      aw, dw, di,
      aDmg: E.damage(s, a, d, aw.d, aw.t, aw, arm && arm.dmgMul), aStr: aw.s, aCth: E.cth(s, a, d, arm && arm.acc),
      dDmg: dw ? E.damage(s, d, a, dw.d, dw.t, dw) : 0, dStr: dw ? dw.s : 0, dCth: dw ? E.cth(s, d, a, 0) : 0, arm
    };
  };

  // Distribución exacta de PV tras el combate (programación dinámica)
  E.predict = function (s, a, d, wi) {
    const P = E.combatParams(s, a, d, wi); if (!P) return null;
    let dist = new Map([[a.hp * 10000 + d.hp, 1]]);
    const n = Math.max(P.aStr, P.dStr);
    const step = (attacker) => {
      const nd = new Map();
      for (const [k, p] of dist) {
        const ah = Math.floor(k / 10000), dh = k % 10000;
        if (ah <= 0 || dh <= 0) { nd.set(k, (nd.get(k) || 0) + p); continue; }
        const hit = attacker ? P.aCth / 100 : P.dCth / 100;
        const k2 = attacker ? ah * 10000 + Math.max(0, dh - P.aDmg) : Math.max(0, ah - P.dDmg) * 10000 + dh;
        nd.set(k2, (nd.get(k2) || 0) + p * hit);
        nd.set(k, (nd.get(k) || 0) + p * (1 - hit));
      }
      dist = nd;
    };
    for (let k = 0; k < n; k++) { if (k < P.aStr) step(true); if (k < P.dStr) step(false); }
    let aDead = 0, dDead = 0, aExp = 0, dExp = 0;
    for (const [k, p] of dist) {
      const ah = Math.floor(k / 10000), dh = k % 10000;
      if (ah <= 0) aDead += p; if (dh <= 0) dDead += p; aExp += p * ah; dExp += p * dh;
    }
    return Object.assign(P, { aDead, dDead, aExp, dExp });
  };

  E.canAttack = function (s, a, d) {
    return a && d && !a.dead && !d.dead && a.fac === E.curFac(s) && d.fac !== a.fac && !a.attacked &&
      Hex.dist(a.x, a.y, d.x, d.y) === 1 && E.weapons(a).length > 0;
  };

  E.attack = function (s, a, d, wi) {
    if (!E.canAttack(s, a, d)) return { err: 'Ataque no permitido.' };
    const P = E.combatParams(s, a, d, wi); if (!P) return { err: 'Arma no válida.' };
    const ev = [{ type: 'combat', att: a.id, def: d.id, aw: P.aw, dw: P.dw }];
    let aHits = 0, dHits = 0, lastHitDmg = 0;
    const n = Math.max(P.aStr, P.dStr);
    for (let k = 0; k < n && !a.dead && !d.dead; k++) {
      if (k < P.aStr) {
        const hit = E.rand(s) * 100 < P.aCth;
        if (hit) { d.hp -= P.aDmg; aHits++; lastHitDmg = P.aDmg; }
        ev.push({ type: 'strike', from: a.id, to: d.id, hit, dmg: hit ? P.aDmg : 0, w: P.aw, hp: Math.max(0, d.hp) });
        if (d.hp <= 0) break;
      }
      if (k < P.dStr) {
        const hit = E.rand(s) * 100 < P.dCth;
        if (hit) { a.hp -= P.dDmg; dHits++; }
        ev.push({ type: 'strike', from: d.id, to: a.id, hit, dmg: hit ? P.dDmg : 0, w: P.dw, hp: Math.max(0, a.hp) });
        if (a.hp <= 0) break;
      }
    }
    a.attacked = true; a.mp = 0;
    // Efectos preparados (arm)
    if (P.arm) {
      const arm = P.arm; a.armed = null;
      if (aHits > 0 && d.hp > 0 && arm.onHit) { E.addStatus(s, d, arm.onHit, 1); ev.push({ type: 'status', id: d.id, st: arm.onHit }); }
      if (aHits > 0 && arm.steal) E.steal(s, a, d.fac, arm.steal, ev);
      if (aHits > 0 && arm.splash) {
        const others = E.neighborsIdx(s, E.uIdx(s, d)).map(i => E.unitAtIdx(s, i)).filter(x => x && x.fac !== a.fac && x !== d && !x.dead);
        if (others.length) {
          others.sort((x, y) => x.hp - y.hp);
          const o = others[0], dm = Math.max(1, Math.round(lastHitDmg * arm.splash));
          o.hp -= dm; ev.push({ type: 'splash', from: a.id, to: o.id, dmg: dm, hp: Math.max(0, o.hp) });
          if (o.hp <= 0) E.kill(s, o, a, ev, P.aw.t);
        }
      }
    }
    // Pasivas por número de golpes
    const tr = E.passive(a, 'trig');
    if (tr && tr.trig.range === P.aw.r && aHits >= tr.trig.minHits && d.hp > 0) { E.addStatus(s, d, tr.trig.status, 1); ev.push({ type: 'status', id: d.id, st: tr.trig.status }); }
    // Experiencia y bajas
    E.combatXP(s, a, d, aHits, dHits, ev, P.aw.t, P.dw ? P.dw.t : null);
    return { ev };
  };

  E.combatXP = function (s, a, d, aHits, dHits, ev, aType, dType) {
    const killXP = u => Math.max(4, 8 * E.unitLevel(u));
    const gain = (u, n) => { if (D(u).kind === 'summon' || n <= 0) return; u.xp += n; ev.push({ type: 'xp', id: u.id, n }); };
    const madBonus = u => {
      if (D(u).kind === 'summon') return 0;
      if (s.factions[u.fac].id === 'mad' && u.flags.madRound !== s.round) { u.flags.madRound = s.round; return 1; }
      return 0;
    };
    let aGain = aHits + madBonus(a), dGain = dHits + madBonus(d);
    if (d.hp <= 0 && !d.dead) { aGain += killXP(d); E.kill(s, d, a, ev, aType); } else if (d.hp > 0) dGain += 2;
    if (a.hp <= 0 && !a.dead) { dGain += killXP(a); E.kill(s, a, d, ev, dType); } else if (a.hp > 0) aGain += 2;
    if (!a.dead) { gain(a, aGain); E.checkLevel(s, a, ev); }
    if (!d.dead) { gain(d, dGain); E.checkLevel(s, d, ev); }
  };

  E.steal = function (s, u, fromFac, n, ev) {
    const f = s.factions[fromFac], amt = Math.min(n, f.gold);
    if (amt <= 0) return;
    f.gold -= amt; s.factions[u.fac].gold += amt;
    ev.push({ type: 'gold', id: u.id, n: amt, fac: u.fac });
  };

  E.kill = function (s, u, killer, ev, dmgType) {
    if (u.dead) return;
    u.dead = true; u.hp = 0;
    ev.push({ type: 'death', id: u.id, by: killer ? killer.id : null });
    if (killer && !killer.dead) {
      const io = E.passive(killer, 'onKill');
      if (io && dmgType === io.onKill.t) {
        const o = io.onKill;
        const active = s.units.filter(x => !x.dead && x.summon && x.summon.by === killer.id && x.summon.group === o.group).length;
        if (active < o.max && killer.flags.summonTurn !== s.turnIndex) {
          const spot = E.neighborsIdx(s, E.uIdx(s, killer)).find(i => E.isFree(s, i));
          if (spot != null) { killer.flags.summonTurn = s.turnIndex; E.spawnSummon(s, killer, o.minion, o.group, o.dur, spot, ev); }
        }
      }
      const kg = E.passive(killer, 'killGold');
      if (kg && killer.flags.killGoldRound !== s.round) {
        killer.flags.killGoldRound = s.round; s.factions[killer.fac].gold += kg.killGold;
        ev.push({ type: 'gold', id: killer.id, n: kg.killGold, fac: killer.fac });
      }
    }
    if (u.leader) {
      s.factions[u.fac].alive = false;
      ev.push({ type: 'eliminated', fac: u.fac });
      E.checkWinner(s, ev);
    }
  };

  E.checkLevel = function (s, u, ev) {
    if (u.dead) return;
    const nx = E.xpNext(u); if (nx == null || u.xp < nx) return;
    const d = D(u), from = u.lvl, fromName = E.unitName(u);
    u.xp -= nx;
    if (d.levels[u.lvl].xp && u.lvl < d.levels.length - 1) {
      u.lvl++; u.hp = E.maxHp(u);
      ev.push({ type: 'levelup', id: u.id, from, to: u.lvl, fromName, toName: E.unitName(u) });
    } else {
      u.vet = (u.vet || 0) + 1; u.hp = E.maxHp(u);
      ev.push({ type: 'veteran', id: u.id, vet: u.vet, name: E.unitName(u) });
    }
    if (E.xpNext(u) == null) u.xp = 0;
  };

  /* ---------- Habilidades ---------- */
  E.abilityState = function (s, u, id) {
    const A = VV.ABIL[id];
    if (!A || A.kind === 'passive') return { ok: false, why: 'Pasiva' };
    if (u.fac !== E.curFac(s)) return { ok: false, why: 'No es tu turno' };
    if (u.fresh) return { ok: false, why: 'Recién llegada' };
    if (E.hasStatus(u, 'silenciado')) return { ok: false, why: 'Silenciado' };
    if (A.once && u.used[id]) return { ok: false, why: 'Ya usada en esta batalla' };
    if (u.cd[id] > 0) return { ok: false, why: 'Recarga: ' + u.cd[id] + ' turno' + (u.cd[id] > 1 ? 's' : '') };
    if (A.kind === 'arm' && u.armed) return { ok: false, why: 'Ya preparada' };
    if (A.kind !== 'arm' && u.attacked) return { ok: false, why: 'Ya ha actuado' };
    const T = E.abilityTargets(s, u, id);
    if (T.mode !== 'self' && !T.list.length) return { ok: false, why: 'Sin objetivos válidos' };
    return { ok: true };
  };

  E.abilityTargets = function (s, u, id) {
    const A = VV.ABIL[id], here = E.uIdx(s, u);
    const adj = E.neighborsIdx(s, here);
    const enemyAt = i => { const x = E.unitAtIdx(s, i); return x && x.fac !== u.fac ? x : null; };
    switch (A.kind) {
      case 'arm': case 'buff': case 'heal': return { mode: 'self', list: [] };
      case 'healAlly': return { mode: 'tiles', list: adj.filter(i => { const x = E.unitAtIdx(s, i); return x && x.fac === u.fac && x.hp < E.maxHp(x); }), need: 1 };
      case 'debuff': return { mode: 'tiles', list: adj.filter(i => enemyAt(i)), need: 1 };
      case 'summon': {
        const L = adj.filter(i => E.isFree(s, i));
        const active = s.units.filter(x => !x.dead && x.summon && x.summon.by === u.id && x.summon.group === A.group).length;
        return { mode: 'tiles', list: (active < A.max || A.replace) ? L : [], need: 1 };
      }
      case 'barricade': {
        const active = Object.values(s.obstacles).filter(o => o.by === u.id).length;
        const room = Math.max(0, Math.min(A.count, A.maxActive - active));
        return { mode: room > 1 ? 'multi' : 'tiles', list: room ? adj.filter(i => E.isFree(s, i)) : [], need: room };
      }
      case 'sticky': return { mode: 'tiles', list: adj.filter(i => E.isFree(s, i) && !(s.overlays[i] && s.overlays[i].sticky)), need: 1 };
      case 'leap': {
        const L = [];
        for (let i = 0; i < s.tiles.length; i++) {
          const dd = E.distIdx(s, here, i);
          if (dd < 1 || dd > A.range || !E.isFree(s, i)) continue;
          if (dd === 2) {
            const mids = adj.filter(m => E.distIdx(s, m, i) === 1);
            if (!mids.some(m => VV.TERRAIN[s.tiles[m].t].cost < 99 && !s.obstacles[m])) continue;
          }
          if (A.then && A.then !== 'normal') {
            if (!E.neighborsIdx(s, i).some(n => enemyAt(n))) continue;
          }
          L.push(i);
        }
        return { mode: 'leap', list: L, need: 1 };
      }
      case 'attack': {
        if (A.target === 'all_adj') { const L = adj.filter(i => enemyAt(i)); return { mode: 'self', list: L, auto: L }; }
        if (A.target === 'radius2') {
          const L = []; for (const x of s.units) if (!x.dead && x.fac !== u.fac && Hex.dist(u.x, u.y, x.x, x.y) <= 2) L.push(E.uIdx(s, x));
          return { mode: 'self', list: L, auto: L };
        }
        if (A.target === 'range2') {
          const L = [];
          for (const x of s.units) {
            if (x.dead || x.fac === u.fac) continue;
            const dd = Hex.dist(u.x, u.y, x.x, x.y);
            if (dd < 1 || dd > 2) continue;
            if (dd === 2) {
              const ti = E.uIdx(s, x), mids = adj.filter(m => E.distIdx(s, m, ti) === 1);
              if (!mids.some(m => s.tiles[m].t !== 'wall')) continue;
            }
            L.push(E.uIdx(s, x));
          }
          return { mode: 'tiles', list: L, need: 1 };
        }
        if (A.target === 'two') return { mode: 'multi', list: adj.filter(i => enemyAt(i)), need: 2 };
        return { mode: 'tiles', list: adj.filter(i => enemyAt(i)), need: 1 };
      }
    }
    return { mode: 'self', list: [] };
  };

  E.spawnSummon = function (s, owner, minionId, group, dur, spot, ev) {
    const up = E.passive(owner, 'upgrade');
    if (up && up.upgrade[minionId]) minionId = up.upgrade[minionId];
    const [c, r] = CR(s, spot);
    const m = E.makeUnit(s, minionId, owner.fac, c, r, { summon: { by: owner.id, group, until: s.turnIndex + s.order.length * dur } });
    m.mp = 0; m.attacked = true;
    ev.push({ type: 'summon', id: m.id, by: owner.id });
    return m;
  };

  // Golpes de una habilidad ofensiva (sin contraataque)
  function specialStrikes(s, u, target, dmg, type, str, ev, acc, w) {
    let hits = 0;
    for (let k = 0; k < str && !target.dead; k++) {
      const hit = E.rand(s) * 100 < E.cth(s, u, target, acc || 0);
      const dm = hit ? E.damage(s, u, target, dmg, type, w || { r: 'x' }) : 0;
      if (hit) { target.hp -= dm; hits++; }
      ev.push({ type: 'strike', from: u.id, to: target.id, hit, dmg: dm, w: { t: type, fx: null }, hp: Math.max(0, target.hp), special: true });
      if (target.hp <= 0) break;
    }
    return hits;
  }

  E.pushUnit = function (s, a, d, ev) {
    if (d.dead) return;
    const ca = Hex.toCube(a.x, a.y), cd = Hex.toCube(d.x, d.y);
    const [nc, nr] = Hex.fromCube(2 * cd[0] - ca[0], 2 * cd[1] - ca[1], 2 * cd[2] - ca[2]);
    if (!inB(s, nc, nr)) return;
    const ni = I(s, nc, nr);
    if (!E.isFree(s, ni) || E.moveCost(s, d, ni) >= 99) return;
    const from = E.uIdx(s, d); d.x = nc; d.y = nr;
    ev.push({ type: 'push', id: d.id, from, to: ni });
  };

  E.useAbility = function (s, u, id, targets) {
    targets = targets || [];
    const st = E.abilityState(s, u, id);
    if (!st.ok) return { err: st.why };
    const A = VV.ABIL[id], T = E.abilityTargets(s, u, id);
    for (const t of (A.kind === 'leap' ? targets.slice(0, 1) : targets)) if (!T.list.includes(t)) return { err: 'Objetivo no válido.' };
    if (T.mode !== 'self' && targets.length < 1) return { err: 'Falta el objetivo.' };
    const ev = [{ type: 'ability', id: u.id, abil: id }];
    const enemyAt = i => { const x = E.unitAtIdx(s, i); return x && x.fac !== u.fac ? x : null; };
    const offensive = A.kind === 'attack' || A.kind === 'debuff';
    let xpGain = 0;
    switch (A.kind) {
      case 'arm': u.armed = Object.assign({ src: id }, A.arm); break;
      case 'buff':
        if (A.status) { E.addStatus(s, u, A.status, 1); ev.push({ type: 'status', id: u.id, st: A.status }); }
        if (A.evasion) { E.addStatus(s, u, 'evasivo', 1, A.evasion); ev.push({ type: 'status', id: u.id, st: 'evasivo' }); }
        break;
      case 'heal': { const h = Math.min(A.amount, E.maxHp(u) - u.hp); u.hp += h; ev.push({ type: 'heal', id: u.id, n: h }); break; }
      case 'healAlly': { const x = E.unitAtIdx(s, targets[0]); const h = Math.min(A.amount, E.maxHp(x) - x.hp); x.hp += h; ev.push({ type: 'heal', id: x.id, n: h }); xpGain = 1; break; }
      case 'debuff': { const x = enemyAt(targets[0]); E.addStatus(s, x, A.status, 1); ev.push({ type: 'status', id: x.id, st: A.status, from: u.id });
        if (A.arm) u.armed = Object.assign({ src: id }, A.arm); xpGain = 1; break; }
      case 'summon': {
        if (A.replace) s.units.forEach(x => { if (!x.dead && x.summon && x.summon.by === u.id && x.summon.group === A.group) { x.dead = true; ev.push({ type: 'vanish', id: x.id }); } });
        const m = E.spawnSummon(s, u, A.minion, A.group, A.dur, targets[0], ev);
        if (A.inspireOnEnter) E.living(s).forEach(x => { if (x.fac === u.fac && x !== m && Hex.dist(x.x, x.y, m.x, m.y) <= A.inspireOnEnter) { E.addStatus(s, x, 'inspirado', 1); ev.push({ type: 'status', id: x.id, st: 'inspirado' }); } });
        break;
      }
      case 'barricade':
        for (const t of targets.slice(0, T.need)) {
          s.obstacles[t] = { kind: 'barricade', hp: A.hp, max: A.hp, owner: u.fac, by: u.id, until: s.turnIndex + s.order.length * A.dur };
          ev.push({ type: 'barricade', at: t, by: u.id });
        }
        break;
      case 'sticky':
        s.overlays[targets[0]] = Object.assign(s.overlays[targets[0]] || {}, { sticky: s.turnIndex + s.order.length * 2 });
        ev.push({ type: 'sticky', at: targets[0], by: u.id });
        break;
      case 'leap': {
        const from = E.uIdx(s, u), [c, r] = CR(s, targets[0]);
        u.x = c; u.y = r; if (!A.free) u.mp = 0; u.moved = true;
        ev.push({ type: 'leap', id: u.id, from, to: targets[0], fx: A.fx });
        const t = s.tiles[targets[0]];
        if (t.prop >= 0 && s.props[t.prop].owner !== u.fac) { const pr = s.props[t.prop].owner; s.props[t.prop].owner = u.fac; ev.push({ type: 'capture', id: u.id, prop: t.prop, from: pr }); }
        if (A.then && A.then !== 'normal') {
          const tgt = targets[1] != null ? enemyAt(targets[1]) : null;
          const cand = tgt && Hex.dist(tgt.x, tgt.y, u.x, u.y) === 1 ? tgt :
            E.neighborsIdx(s, targets[0]).map(enemyAt).filter(Boolean).sort((a, b) => a.hp - b.hp)[0];
          if (cand) {
            const h = specialStrikes(s, u, cand, A.then.d, A.then.t, A.then.s, ev);
            xpGain += h + 2; E.afterSpecial(s, u, [cand], ev, A.then.t);
          }
          u.attacked = true;
        }
        break;
      }
      case 'attack': {
        let tlist;
        if (A.target === 'all_adj' || A.target === 'radius2') tlist = T.auto.map(enemyAt).filter(Boolean);
        else tlist = targets.map(enemyAt).filter(Boolean).slice(0, A.target === 'two' ? 2 : 1);
        if (!tlist.length) return { err: 'Sin objetivos.' };
        let healHits = 0;
        for (const tgt of tlist) {
          let dmg, type, str, w = null;
          if (A.custom) { dmg = A.custom.d; type = A.custom.t; str = A.custom.s; }
          else { w = E.weapons(u).find(x => x.r === A.weapon) || E.weapons(u)[0]; dmg = w.d; type = w.t; str = w.s; }
          ev.push({ type: 'specialHit', id: u.id, to: tgt.id, fx: A.fx });
          let hits = specialStrikes(s, u, tgt, dmg, type, str, ev, 0, w);
          if (A.extraPerSummon && !tgt.dead) {
            const friends = s.units.filter(x => !x.dead && x.summon && x.summon.by === u.id && x.summon.group === A.extraPerSummon.group);
            for (const f of friends) {
              if (tgt.dead) break;
              const hit = E.rand(s) * 100 < E.cth(s, f, tgt, 0);
              const dm = hit ? E.damage(s, f, tgt, A.extraPerSummon.d, A.extraPerSummon.t) : 0;
              if (hit) { tgt.hp -= dm; hits++; }
              ev.push({ type: 'strike', from: f.id, to: tgt.id, hit, dmg: dm, w: { t: 'imp', fx: 'fist' }, hp: Math.max(0, tgt.hp), special: true });
            }
          }
          xpGain += hits;
          if (hits > 0) healHits++;
          if (!tgt.dead && tgt.hp > 0) {
            if (A.onHit && hits > 0) { E.addStatus(s, tgt, A.onHit, 1); ev.push({ type: 'status', id: tgt.id, st: A.onHit }); }
            if (A.minHits && hits >= A.minHits) { E.addStatus(s, tgt, A.minStatus, 1); ev.push({ type: 'status', id: tgt.id, st: A.minStatus }); }
            if (A.push && hits > 0) E.pushUnit(s, u, tgt, ev);
          }
          if (A.sticky) {
            const spots = E.neighborsIdx(s, E.uIdx(s, tgt)).filter(i => E.isFree(s, i)).slice(0, A.sticky);
            for (const sp of spots) { s.overlays[sp] = Object.assign(s.overlays[sp] || {}, { sticky: s.turnIndex + s.order.length * 2 }); ev.push({ type: 'sticky', at: sp, by: u.id }); }
          }
        }
        if (A.healPerTarget && healHits) { const h = Math.min(A.healMax, A.healPerTarget * healHits, E.maxHp(u) - u.hp); if (h > 0) { u.hp += h; ev.push({ type: 'heal', id: u.id, n: h }); } }
        xpGain += 2;
        E.afterSpecial(s, u, tlist, ev, A.custom ? A.custom.t : (E.weapons(u).find(x => x.r === A.weapon) || {}).t);
        break;
      }
    }
    if (A.cd) u.cd[id] = A.cd;
    if (A.once) u.used[id] = true;
    if (A.kind !== 'arm' && !(A.kind === 'leap' && A.then === 'normal')) u.attacked = true;
    if (offensive) u.mp = 0;
    if (xpGain && !u.dead) { u.xp += xpGain; ev.push({ type: 'xp', id: u.id, n: xpGain }); E.checkLevel(s, u, ev); }
    return { ev };
  };

  E.afterSpecial = function (s, u, tlist, ev, type) {
    for (const t of tlist) {
      if (t.hp <= 0 && !t.dead) { u.xp += Math.max(4, 8 * E.unitLevel(t)); E.kill(s, t, u, ev, type); }
      else if (!t.dead && D(t).kind !== 'summon') { t.xp += 2; E.checkLevel(s, t, ev); }
    }
  };

  // Romper mesas o barricadas enemigas: los objetos no esquivan.
  E.canBreak = function (s, u, i) {
    const o = s.obstacles[i];
    if (!o || u.attacked || u.fac !== E.curFac(s) || u.fresh) return false;
    if (E.distIdx(s, E.uIdx(s, u), i) !== 1) return false;
    if (o.owner === u.fac) return false;
    if (o.kind === 'tables') return E.weapons(u).some(w => w.t === 'imp' && w.r === 'm');
    return E.weapons(u).length > 0;
  };
  E.breakObstacle = function (s, u, i) {
    if (!E.canBreak(s, u, i)) return { err: 'No puede romper ese obstáculo.' };
    const o = s.obstacles[i];
    const ws = E.weapons(u).filter(w => o.kind !== 'tables' || (w.t === 'imp' && w.r === 'm'));
    const w = ws.sort((a, b) => b.d * b.s - a.d * a.s)[0];
    const dmg = Math.round(w.d * w.s * E.todMul(s, u));
    o.hp -= dmg; u.attacked = true; u.mp = 0;
    const ev = [{ type: 'smash', id: u.id, at: i, dmg, w }];
    if (o.hp <= 0) { delete s.obstacles[i]; ev.push({ type: 'obstacleGone', at: i, kind: o.kind }); }
    return { ev };
  };

  /* ---------- Reclutamiento ---------- */
  E.castleTiles = function (s, keepIdx) {
    const seen = new Set([keepIdx]), q = [keepIdx], out = [];
    while (q.length) {
      const i = q.shift();
      for (const n of E.neighborsIdx(s, i)) {
        if (seen.has(n)) continue;
        if (VV.TERRAIN[s.tiles[n].t].castle) { seen.add(n); q.push(n); out.push(n); }
      }
    }
    return out;
  };
  E.recruitSpots = function (s, fac) {
    const f = s.factions[fac], L = E.byId(s, f.leaderId);
    if (!L || s.tiles[E.uIdx(s, L)].t !== 'keep') return [];
    return E.castleTiles(s, E.uIdx(s, L)).filter(i => E.isFree(s, i));
  };
  E.recruitList = function (s, fac) {
    const f = s.factions[fac], fd = VV.FACTIONS[f.id];
    const list = [];
    VV.HEROES[f.id].forEach(id => list.push({ id, unique: true, avail: true }));
    fd.generics.forEach(id => list.push({ id, unique: false, avail: true }));
    return list.map(x => Object.assign(x, { cost: VV.UNITS[x.id].cost }));
  };
  E.recruit = function (s, fac, defId, spot) {
    if (fac !== E.curFac(s)) return { err: 'No es tu turno.' };
    const f = s.factions[fac], ud = VV.UNITS[defId];
    if (!ud || ud.fac !== f.id || ud.kind === 'summon') return { err: 'Unidad no reclutable.' };
    if (f.gold < ud.cost) return { err: 'Oro insuficiente.' };
    const spots = E.recruitSpots(s, fac);
    if (!spots.length) return { err: 'El comandante debe estar en la casilla de mando con espacio libre.' };
    if (spot == null) spot = spots[0];
    if (!spots.includes(spot)) return { err: 'Casilla de reclutamiento no válida.' };
    f.gold -= ud.cost;
    if (ud.kind === 'hero') f.uniques.push(defId);
    const [c, r] = CR(s, spot);
    const u = E.makeUnit(s, defId, fac, c, r);
    u.mp = 0; u.attacked = true;
    return { ev: [{ type: 'recruit', id: u.id, fac }], unit: u };
  };

  /* ---------- Economía ---------- */
  E.income = function (s, fac) {
    const f = s.factions[fac];
    const props = s.props.filter(p => p.owner === fac);
    const propGold = props.reduce((a, p) => a + p.gold, 0);
    const bonus = f.id === 'ver' ? Math.floor(props.length / 2) : 0;
    const upkeep = E.living(s).filter(u => u.fac === fac && !u.leader && !u.summon).reduce((a, u) => a + E.unitLevel(u), 0);
    return { base: VV.ECON.base, props: propGold, nprops: props.length, bonus, upkeep, total: VV.ECON.base + propGold + bonus - upkeep };
  };

  /* ---------- Turnos ---------- */
  E.beginTurn = function (s, ev) {
    s.turnIndex++;
    const fac = E.curFac(s), f = s.factions[fac];
    // Caducidades globales
    for (const u of s.units) if (!u.dead) u.st = u.st.filter(x => x.until > s.turnIndex);
    for (const u of s.units) if (!u.dead && u.summon && u.summon.until <= s.turnIndex) { u.dead = true; ev.push({ type: 'vanish', id: u.id }); }
    for (const k of Object.keys(s.obstacles)) if (s.obstacles[k].until <= s.turnIndex) { ev.push({ type: 'obstacleGone', at: +k, kind: s.obstacles[k].kind }); delete s.obstacles[k]; }
    for (const k of Object.keys(s.overlays)) {
      const o = s.overlays[k];
      if (o.sticky && o.sticky <= s.turnIndex) delete o.sticky;
      if (o.puddle && o.puddle <= s.turnIndex) delete o.puddle;
      if (!o.sticky && !o.puddle) delete s.overlays[k];
    }
    // Ingresos (desde la segunda ronda)
    if (s.round > 1 && f.alive) {
      const inc = E.income(s, fac);
      f.gold = Math.max(0, f.gold + inc.total);
      ev.push({ type: 'income', fac, n: inc.total });
    }
    for (const u of s.units) {
      if (u.dead || u.fac !== fac) continue;
      u.fresh = false;
      for (const k in u.cd) if (u.cd[k] > 0) u.cd[k]--;
      // Curación
      const t = s.tiles[E.uIdx(s, u)];
      let heal = 0;
      if (t.prop >= 0 && s.props[t.prop].heal) { heal = s.props[t.prop].heal; if (f.id === 'ast' && s.props[t.prop].owner === fac) heal += 1; }
      else if (u.rested) heal = 2;
      heal = Math.min(heal, f.id === 'ast' ? 9 : 8, E.maxHp(u) - u.hp);
      if (heal > 0) { u.hp += heal; ev.push({ type: 'heal', id: u.id, n: heal }); }
      // Afinidad con las barricas (Tío Guillermo)
      const tp = E.passive(u, 'tavernXP');
      if (tp && t.prop >= 0 && s.props[t.prop].bar && s.props[t.prop].owner === fac && (u.flags.tavernRound == null || s.round - u.flags.tavernRound >= 2)) {
        u.flags.tavernRound = s.round; u.xp += tp.tavernXP; ev.push({ type: 'xp', id: u.id, n: tp.tavernXP }); E.checkLevel(s, u, ev);
      }
      u.mp = Math.max(0, E.maxMov(u) + (E.hasStatus(u, 'agotado') ? -1 : 0) + (E.hasStatus(u, 'temazo') ? 1 : 0));
      u.attacked = false; u.moved = false; u.flags.skirmUsed = false;
    }
    ev.push({ type: 'turn', fac, round: s.round });
    return ev;
  };

  E.endTurn = function (s) {
    const ev = [];
    if (s.winner != null) return { ev };
    const fac = E.curFac(s);
    for (const u of s.units) if (!u.dead && u.fac === fac) u.rested = !u.moved && !u.attacked;
    s.units = s.units.filter(u => !u.dead);
    // Siguiente facción viva
    let guard = 0;
    do {
      s.cur++;
      if (s.cur >= s.order.length) { s.cur = 0; E.endRound(s, ev); if (s.winner != null) return { ev }; }
    } while (!s.factions[E.curFac(s)].alive && ++guard < 10);
    E.beginTurn(s, ev);
    return { ev };
  };

  E.endRound = function (s, ev) {
    // Dominio de la Villa
    if (s.mode === 'domination') {
      s.factions.forEach((f, i) => {
        if (!f.alive) return;
        const n = s.props.filter(p => p.owner === i).length;
        s.dom[i] = n >= 4 ? (s.dom[i] || 0) + 1 : 0;
        if (s.dom[i] >= 2 && s.winner == null) { s.winner = i; ev.push({ type: 'win', fac: i, why: 'Dominio de la Villa' }); }
      });
      if (s.winner != null) return;
    }
    if (s.round >= s.roundLimit) {
      const sc = s.factions.map((f, i) => E.score(s, i));
      let bi = 0; sc.forEach((x, i) => { if (x.total > sc[bi].total) bi = i; });
      s.winner = bi; ev.push({ type: 'win', fac: bi, why: 'Límite de rondas: puntuación', scores: sc });
      return;
    }
    s.round++;
    ev.push({ type: 'round', round: s.round, tod: E.tod(s) });
    E.runEvents(s, ev);
  };

  E.score = function (s, fac) {
    const props = s.props.filter(p => p.owner === fac).length;
    const units = E.living(s).filter(u => u.fac === fac && !u.summon);
    const levels = units.reduce((a, u) => a + E.unitLevel(u), 0);
    const gold = s.factions[fac].gold;
    return { props, units: units.length, levels, gold, total: props * 10 + units.length * 5 + levels * 4 + Math.floor(gold / 5) };
  };
  E.SCORE_FORMULA = '10 × propiedades + 5 × unidades vivas + 4 × niveles + oro ÷ 5';

  E.checkWinner = function (s, ev) {
    const alive = s.factions.map((f, i) => (f.alive ? i : -1)).filter(i => i >= 0);
    if (alive.length === 1 && s.winner == null) { s.winner = alive[0]; ev.push({ type: 'win', fac: alive[0], why: 'Comandante enemigo derrotado' }); }
  };

  /* ---------- Eventos del escenario ---------- */
  E.upcomingEvent = function (s) {
    for (let r = s.round; r <= s.round + 5; r++) { const e = VV.eventsForRound(s.mapId, r); if (e.length) return { round: r, ids: e }; }
    return null;
  };
  E.runEvents = function (s, ev) {
    const M = VV.MAPS[s.mapId], ids = VV.eventsForRound(s.mapId, s.round);
    const nf = s.order.length;
    for (const id of ids) {
      const hit = [];
      if (id === 'mercau') {
        const p = s.props.find(x => x.kind === 'abastos');
        if (p && p.owner >= 0) { s.factions[p.owner].gold += 3; hit.push({ fac: p.owner, gold: 3 }); }
      } else if (id === 'orbayu') {
        const streets = []; s.tiles.forEach((t, i) => { if (t.t === 'street' && !E.unitAtIdx(s, i)) streets.push(i); });
        const pick = []; const pool = streets.slice();
        for (let k = 0; k < 10 && pool.length; k++) pick.push(pool.splice(Math.floor(E.rand(s) * pool.length), 1)[0]);
        pick.forEach(i => { s.overlays[i] = Object.assign(s.overlays[i] || {}, { puddle: s.turnIndex + nf * 2 + 1 }); });
        hit.push({ tiles: pick });
      } else if (id === 'campanada' || id === 'subidon') {
        const c = id === 'campanada' ? M.teatro : M.stage;
        E.living(s).forEach(u => { if (Hex.dist(u.x, u.y, c[0], c[1]) <= 2) { E.addStatus(s, u, 'inspirado', 1); hit.push({ id: u.id, st: 'inspirado' }); } });
      } else if (id === 'charanga') {
        E.living(s).forEach(u => { if (u.y === M.charanga) { E.addStatus(s, u, 'mareado', 1); hit.push({ id: u.id, st: 'mareado' }); } });
      } else if (id === 'temazo') {
        E.living(s).forEach(u => { if (s.tiles[E.uIdx(s, u)].t === 'dance') { E.addStatus(s, u, 'temazo', 1); hit.push({ id: u.id, st: 'temazo' }); } });
      } else if (id === 'barralibre') {
        const bars = new Set();
        s.props.forEach(p => { if (p.bar) { const i = I(s, p.c, p.r); bars.add(i); E.neighborsIdx(s, i).forEach(n => bars.add(n)); } });
        E.living(s).forEach(u => { if (bars.has(E.uIdx(s, u))) { const h = Math.min(3, E.maxHp(u) - u.hp); if (h > 0) { u.hp += h; hit.push({ id: u.id, heal: h }); } } });
      }
      ev.push({ type: 'event', ev: id, hit });
    }
  };

  /* ---------- Acción genérica (usada por la IA y la interfaz) ---------- */
  E.perform = function (s, a) {
    if (s.winner != null) return { err: 'Partida terminada.' };
    const u = a.unit != null ? E.byId(s, a.unit) : null;
    switch (a.type) {
      case 'move': return u ? E.moveUnit(s, u, a.to) : { err: 'Sin unidad' };
      case 'attack': { const d = E.byId(s, a.target); return u && d ? E.attack(s, u, d, a.weapon) : { err: 'Sin objetivo' }; }
      case 'ability': return u ? E.useAbility(s, u, a.abil, a.targets) : { err: 'Sin unidad' };
      case 'recruit': return E.recruit(s, E.curFac(s), a.def, a.spot);
      case 'break': return u ? E.breakObstacle(s, u, a.at) : { err: 'Sin unidad' };
      case 'end': return E.endTurn(s);
    }
    return { err: 'Acción desconocida' };
  };

  /* ---------- Guardado ---------- */
  E.serialize = s => JSON.stringify(s);
  E.deserialize = function (str) {
    const s = JSON.parse(str);
    if (!s || !s.tiles || !s.units || !s.factions) throw new Error('Partida dañada');
    // Las claves numéricas de objetos vuelven como texto: se normalizan.
    const ob = {}; for (const k in s.obstacles) ob[+k] = s.obstacles[k]; s.obstacles = ob;
    const ov = {}; for (const k in s.overlays) ov[+k] = s.overlays[k]; s.overlays = ov;
    return s;
  };
})(typeof window !== 'undefined' ? window : globalThis);
