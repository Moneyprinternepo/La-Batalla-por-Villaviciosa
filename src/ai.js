/* LA BATALLA POR VILLAVICIOSA — ai.js
   IA táctica: evalúa ataques (distribución exacta de PV), habilidades, captura,
   amenazas, economía y protección del comandante. Juega con las mismas reglas
   que el jugador: todas sus acciones pasan por Engine.perform. */
(function (G) {
  const VV = G.VV, E = VV.Engine, Hex = VV.Hex;
  const AI = (VV.AI = {});
  const mem = { turn: -1, pending: null, done: new Set(), recruits: 0 };

  const DIFF = {
    easy: { self: 0.45, threat: 0, noise: 0.35, lookAll: false, minScore: -2 },
    normal: { self: 0.8, threat: 0.35, noise: 0.06, lookAll: true, minScore: 0 },
    hard: { self: 1.0, threat: 0.7, noise: 0, lookAll: true, minScore: 0.5 }
  };

  function hash(a, b, c) { let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791); h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; }
  function noise(s, u, k, amp) { return amp ? 1 + (hash(s.turnIndex, u.id, k) * 2 - 1) * amp : 1; }

  function value(u) {
    if (u.leader) return 260;
    const d = E.def(u);
    if (d.kind === 'summon') return 9;
    return (d.cost || 14) * (1 + 0.45 * u.lvl);
  }

  function threatMap(s, fac) {
    const th = new Float32Array(s.tiles.length);
    for (const e of s.units) {
      if (e.dead || e.fac === fac) continue;
      const reach = E.reachable(s, e, E.maxMov(e));
      const best = Math.max(0, ...E.weapons(e).map(w => w.d * w.s * 0.6));
      const seen = new Set();
      for (const i of reach.keys()) for (const n of E.neighborsIdx(s, i)) seen.add(n);
      seen.add(E.uIdx(s, e));
      for (const i of seen) th[i] += best;
    }
    return th;
  }

  // Evalúa con la unidad colocada provisionalmente en «dest»
  function at(s, u, dest, fn) {
    const ox = u.x, oy = u.y; const [c, r] = E.cr(s, dest);
    u.x = c; u.y = r;
    try { return fn(); } finally { u.x = ox; u.y = oy; }
  }

  function binomAtLeast(n, p, k) {
    let tot = 0;
    for (let i = k; i <= n; i++) { let c = 1; for (let j = 0; j < i; j++) c = c * (n - j) / (j + 1); tot += c * Math.pow(p, i) * Math.pow(1 - p, n - i); }
    return tot;
  }

  function scoreAttack(s, u, d, wi, dest, cfg, th) {
    const P = at(s, u, dest, () => E.predict(s, u, d, wi));
    if (!P) return null;
    const vd = value(d), vu = value(u);
    const dealt = d.hp - P.dExp, taken = u.hp - P.aExp;
    let sc = dealt / E.maxHp(d) * vd * 0.55 + P.dDead * vd * 0.85 - (taken / E.maxHp(u)) * vu * cfg.self * 0.55 - P.aDead * vu * 1.25 * cfg.self;
    sc += at(s, u, dest, () => E.defense(s, u)) * 0.06;
    if (th) sc -= (th[dest] / E.maxHp(u)) * vu * cfg.threat * 0.25;
    if (u.leader) sc -= P.aDead * 400 + (th ? th[dest] : 0) * 0.6;
    const nx = E.xpNext(u);
    if (nx && P.dDead > 0.3 && u.xp + 8 >= nx) sc += 6;
    return { sc, P };
  }

  // Valor aproximado de una habilidad ofensiva desde «dest»
  function scoreAbility(s, u, id, dest, cfg) {
    const A = VV.ABIL[id];
    return at(s, u, dest, () => {
      const st = E.abilityState(s, u, id);
      if (!st.ok) return null;
      const T = E.abilityTargets(s, u, id);
      const tgts = (T.auto || T.list).map(i => E.unitAtIdx(s, i)).filter(x => x && x.fac !== u.fac);
      if (A.kind === 'debuff') {
        if (!tgts.length) return null;
        const t = tgts.sort((a, b) => value(b) - value(a))[0];
        return { sc: 4 + value(t) * 0.04, targets: [E.uIdx(s, t)] };
      }
      if (A.kind !== 'attack') return null;
      let list = tgts;
      if (A.target === 'two') list = tgts.sort((a, b) => a.hp - b.hp).slice(0, 2);
      else if (A.target === 'adj' || A.target === 'range2') list = tgts.sort((a, b) => a.hp - b.hp).slice(0, 1);
      if (!list.length) return null;
      let sc = 0;
      for (const t of list) {
        let dmg, type, str;
        if (A.custom) { dmg = A.custom.d; type = A.custom.t; str = A.custom.s; }
        else { const w = E.weapons(u).find(x => x.r === A.weapon) || E.weapons(u)[0]; dmg = w.d; type = w.t; str = w.s; }
        const dm = E.damage(s, u, t, dmg, type), p = E.cth(s, u, t, 0) / 100;
        let extra = 0;
        if (A.extraPerSummon) extra = s.units.filter(x => !x.dead && x.summon && x.summon.by === u.id).length;
        const need = Math.ceil(t.hp / dm);
        const pk = binomAtLeast(str + extra, p, Math.min(need, str + extra + 1));
        const exp = Math.min(t.hp, (str * dm + extra * 5) * p);
        sc += exp / E.maxHp(t) * value(t) * 0.55 + pk * value(t) * 0.85 + (A.onHit || A.minStatus ? 3 : 0) + (A.push ? 1 : 0);
      }
      return { sc: sc * (A.ult ? 0.95 : 1), targets: list.map(t => E.uIdx(s, t)) };
    });
  }

  function recruitChoice(s, fac, cfg) {
    const f = s.factions[fac];
    const list = E.recruitList(s, fac).filter(x => x.avail && x.cost <= f.gold);
    if (!list.length) return null;
    const dmgMix = { imp: 0, cut: 0, pro: 0, psi: 0, cha: 0 };
    E.living(s).forEach(u => { if (u.fac !== fac) E.weapons(u).forEach(w => (dmgMix[w.t] += w.d * w.s)); });
    const tot = Object.values(dmgMix).reduce((a, b) => a + b, 0) || 1;
    const mine = E.living(s).filter(u => u.fac === fac);
    let best = null, bv = -1e9;
    for (const x of list) {
      const d = VV.UNITS[x.id], L = d.levels[0];
      const res = Object.assign({}, VV.RES[d.arch], d.res || {});
      let rv = 0; for (const k in dmgMix) rv += (res[k] || 0) * dmgMix[k] / tot;
      const power = L.hp * 1.0 + Math.max(...L.w.map(w => w.d * w.s)) * 2.2 + L.mov * 2 + (L.ab.length ? 8 : 0) + d.levels.length * 3 + (d.defBonus || 0) * 0.9;
      let v = power / x.cost + rv * 0.06 + (x.unique ? 2.6 : 0);
      v -= mine.filter(u => u.def === x.id).length * 0.9;
      v *= noise(s, { id: x.cost * 7 + x.id.length }, 3, cfg.noise);
      if (v > bv) { bv = v; best = x; }
    }
    return best;
  }

  AI.nextAction = function (s) {
    if (s.winner != null) return { type: 'end' };
    const fac = E.curFac(s), f = s.factions[fac];
    const cfg = DIFF[f.diff] || DIFF.normal;
    if (mem.turn !== s.turnIndex) { mem.turn = s.turnIndex; mem.pending = null; mem.done = new Set(); mem.recruits = 0; }

    // 1) Acción encadenada pendiente
    if (mem.pending) {
      const p = mem.pending; mem.pending = null;
      return p;
    }
    const mine = E.living(s).filter(u => u.fac === fac);
    const foes = E.living(s).filter(u => u.fac !== fac);
    const leader = E.byId(s, f.leaderId);

    // 2) Reclutamiento
    const inc = E.income(s, fac);
    const army = mine.filter(u => !u.summon && !u.leader).length;
    if (leader && E.recruitSpots(s, fac).length && (inc.total > 1 || army < 4) && army < 14) {
      const ch = recruitChoice(s, fac, cfg);
      if (ch && (f.gold - ch.cost >= 0)) {
        const spots = E.recruitSpots(s, fac);
        // la casilla más cercana al enemigo
        const tgt = foes.length ? foes[0] : null;
        spots.sort((a, b) => tgt ? E.distIdx(s, a, E.uIdx(s, tgt)) - E.distIdx(s, b, E.uIdx(s, tgt)) : 0);
        mem.recruits++;
        return { type: 'recruit', def: ch.id, spot: spots[0] };
      }
    }

    const th = cfg.threat ? threatMap(s, fac) : null;

    // 3) Mejor ataque o habilidad ofensiva
    let best = null;
    for (const u of mine) {
      if (u.attacked || u.fresh) continue;
      const here = E.uIdx(s, u);
      let dests = [here];
      if (u.mp > 0 && !mem.done.has(u.id)) {
        const reach = E.reachable(s, u);
        dests = [...reach.keys()];
        if (u.leader) {
          const keepI = E.idx(s, f.keep[0], f.keep[1]);
          dests = dests.filter(i => E.distIdx(s, i, keepI) <= 4 || f.gold < 12);
        }
      }
      const abil = E.abilities(u).filter(a => { const A = VV.ABIL[a]; return A.kind === 'attack' || A.kind === 'debuff'; });
      for (const dest of dests) {
        const adjFoes = E.neighborsIdx(s, dest).map(i => E.unitAtIdx(s, i)).filter(x => x && x.fac !== fac && x !== u);
        const hasRange2 = abil.some(a => VV.ABIL[a].target === 'range2' || VV.ABIL[a].target === 'radius2');
        if (!adjFoes.length && !hasRange2) continue;
        for (const d of adjFoes) {
          const ws = E.weapons(u);
          for (let wi = 0; wi < ws.length; wi++) {
            const r = scoreAttack(s, u, d, wi, dest, cfg, th);
            if (!r) continue;
            const sc = r.sc * noise(s, u, dest * 7 + wi + d.id, cfg.noise);
            if (!best || sc > best.sc) best = { sc, u, dest, act: { type: 'attack', unit: u.id, target: d.id, weapon: wi }, w: ws[wi] };
          }
        }
        for (const a of abil) {
          const r = scoreAbility(s, u, a, dest, cfg);
          if (!r) continue;
          let sc = r.sc * noise(s, u, dest * 11 + a.length, cfg.noise);
          if (th) sc -= (th[dest] / E.maxHp(u)) * value(u) * cfg.threat * 0.25;
          if (u.leader) sc -= (th ? th[dest] : 0) * 0.6;
          if (!best || sc > best.sc) best = { sc, u, dest, act: { type: 'ability', unit: u.id, abil: a, targets: r.targets } };
        }
      }
    }
    if (best && best.sc > cfg.minScore) {
      const u = best.u, here = E.uIdx(s, u);
      // Preparar el ataque con una habilidad «arm» compatible
      if (best.act.type === 'attack') {
        const arm = E.abilities(u).find(a => {
          const A = VV.ABIL[a];
          return A.kind === 'arm' && (A.arm.range === 'any' || A.arm.range === best.w.r) && E.abilityState(s, u, a).ok && (!A.once || best.sc > 30);
        });
        if (arm && best.dest === here) { mem.pending = best.act; return { type: 'ability', unit: u.id, abil: arm }; }
      }
      if (best.dest !== here) {
        mem.done.add(u.id);
        mem.pending = best.act;
        return { type: 'move', unit: u.id, to: best.dest };
      }
      return best.act;
    }

    // 4) Saltos para llegar al combate (NO ME HAS VISTO, Vuelta imposible, Patada estratosférica)
    for (const u of mine) {
      if (u.attacked || u.fresh) continue;
      for (const a of E.abilities(u)) {
        const A = VV.ABIL[a];
        if (A.kind !== 'leap' || !E.abilityState(s, u, a).ok) continue;
        const T = E.abilityTargets(s, u, a);
        let bl = null;
        for (const i of T.list) {
          if (th && th[i] > E.maxHp(u) * 0.9) continue;
          const adj = E.neighborsIdx(s, i).map(n => E.unitAtIdx(s, n)).filter(x => x && x.fac !== fac);
          if (!adj.length) continue;
          const tgt = adj.sort((x, y) => x.hp - y.hp)[0];
          const v = value(tgt) / Math.max(1, tgt.hp);
          if (!bl || v > bl.v) bl = { v, i, tgt };
        }
        if (bl && (A.then !== 'normal' || u.mp === 0)) {
          if (A.then === 'normal') {
            const ws = E.weapons(u); let wi = 0, bv = -1;
            ws.forEach((w, k) => { const v = w.d * w.s; if (v > bv) { bv = v; wi = k; } });
            mem.pending = { type: 'attack', unit: u.id, target: bl.tgt.id, weapon: wi };
          }
          return { type: 'ability', unit: u.id, abil: a, targets: A.then === 'normal' ? [bl.i] : [bl.i, E.uIdx(s, bl.tgt)] };
        }
      }
    }

    // 5) Habilidades de apoyo
    for (const u of mine) {
      if (u.attacked || u.fresh) continue;
      const near = foes.filter(e => Hex.dist(e.x, e.y, u.x, u.y) <= 7);
      const close = foes.filter(e => Hex.dist(e.x, e.y, u.x, u.y) <= 3);
      for (const a of E.abilities(u)) {
        const A = VV.ABIL[a];
        if (!['summon', 'barricade', 'sticky', 'heal', 'healAlly', 'buff'].includes(A.kind)) continue;
        if (!E.abilityState(s, u, a).ok) continue;
        const T = E.abilityTargets(s, u, a);
        const toward = near.length ? near.reduce((m, e) => (Hex.dist(e.x, e.y, u.x, u.y) < Hex.dist(m.x, m.y, u.x, u.y) ? e : m)) : null;
        const sortToward = L => toward ? L.slice().sort((x, y) => E.distIdx(s, x, E.uIdx(s, toward)) - E.distIdx(s, y, E.uIdx(s, toward))) : L;
        if (A.kind === 'summon' && near.length && T.list.length) return { type: 'ability', unit: u.id, abil: a, targets: [sortToward(T.list)[0]] };
        if (A.kind === 'barricade' && close.length && T.list.length) return { type: 'ability', unit: u.id, abil: a, targets: sortToward(T.list).slice(0, T.need) };
        if (A.kind === 'sticky' && close.length && T.list.length) return { type: 'ability', unit: u.id, abil: a, targets: [sortToward(T.list)[0]] };
        if (A.kind === 'heal' && u.hp < E.maxHp(u) * 0.7) return { type: 'ability', unit: u.id, abil: a };
        if (A.kind === 'healAlly' && T.list.length) return { type: 'ability', unit: u.id, abil: a, targets: [T.list[0]] };
        if (A.kind === 'buff' && close.length && (u.mp === 0 || mem.done.has(u.id))) return { type: 'ability', unit: u.id, abil: a };
      }
    }

    // 6) Movimiento posicional
    for (const u of mine) {
      if (u.mp <= 0 || mem.done.has(u.id) || u.fresh) continue;
      mem.done.add(u.id);
      const mv = bestMove(s, u, f, fac, foes, cfg, th);
      if (mv != null && mv !== E.uIdx(s, u)) return { type: 'move', unit: u.id, to: mv };
    }

    // 7) Romper obstáculos enemigos adyacentes
    for (const u of mine) {
      if (u.attacked || u.fresh) continue;
      for (const n of E.neighborsIdx(s, E.uIdx(s, u))) if (s.obstacles[n] && s.obstacles[n].kind === 'barricade' && E.canBreak(s, u, n)) return { type: 'break', unit: u.id, at: n };
    }
    return { type: 'end' };
  };

  function bestMove(s, u, f, fac, foes, cfg, th) {
    const reach = E.reachable(s, u);
    const keepI = E.idx(s, f.keep[0], f.keep[1]);
    const goals = [];
    s.props.forEach(p => {
      if (p.owner === fac) return;
      goals.push({ i: E.idx(s, p.c, p.r), v: 14 + p.gold * 3 + (p.heal ? 3 : 0) + (p.owner >= 0 ? 6 : 0) });
    });
    foes.forEach(e => goals.push({ i: E.uIdx(s, e), v: e.leader ? 34 : 10 + (1 - e.hp / E.maxHp(e)) * 14 }));
    const hurt = u.hp < E.maxHp(u) * 0.42;
    if (hurt) s.props.forEach(p => { if (p.heal && (p.owner === fac || p.owner < 0)) goals.push({ i: E.idx(s, p.c, p.r), v: 40 }); });
    const cheapest = Math.min(...E.recruitList(s, fac).filter(x => x.avail).map(x => x.cost));
    let bi = null, bv = -1e9;
    for (const [i, e] of reach) {
      let v = 0;
      if (u.leader) {
        const wantKeep = f.gold >= cheapest;
        v = -E.distIdx(s, i, keepI) * (wantKeep ? 9 : 2) + E.defense(s, u, i) * 0.2 - (th ? th[i] * 1.2 : 0);
      } else {
        let g = -1e9;
        for (const go of goals) g = Math.max(g, go.v - E.distIdx(s, i, go.i) * 2.2);
        v = g + at(s, u, i, () => E.defense(s, u)) * 0.12;
        const t = s.tiles[i];
        if (t.prop >= 0 && s.props[t.prop].owner !== fac) v += 18;
        if (th) v -= (th[i] / E.maxHp(u)) * value(u) * cfg.threat * (hurt ? 0.6 : 0.2);
        // No bloquear el castillo propio
        if (VV.TERRAIN[t.t].castle && Hex.dist(f.keep[0], f.keep[1], ...E.cr(s, i)) <= 2) v -= 6;
      }
      v *= noise(s, u, i, cfg.noise);
      if (v > bv) { bv = v; bi = i; }
    }
    return bi;
  }

  AI.reset = function () { mem.turn = -1; mem.pending = null; mem.done = new Set(); };
})(typeof window !== 'undefined' ? window : globalThis);
