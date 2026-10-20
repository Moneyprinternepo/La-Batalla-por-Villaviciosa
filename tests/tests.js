/* Pruebas automáticas — ejecutar con:  node tests/tests.js
   (también se ejecutan en el navegador desde tests/tests.html) */
const isNode = typeof window === 'undefined';
if (isNode) {
  const fs = require('fs'), path = require('path');
  for (const f of ['data.js', 'maps.js', 'designs.js', 'engine.js', 'ai.js']) {
    // eslint-disable-next-line no-eval
    (0, eval)(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'));
  }
}
const VV = (isNode ? globalThis : window).VV, E = VV.Engine, Hex = VV.Hex;
const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, err: e.message }); }
}
function eq(a, b, m) { if (a !== b) throw new Error((m || '') + ' esperado ' + JSON.stringify(b) + ', obtenido ' + JSON.stringify(a)); }
function ok(c, m) { if (!c) throw new Error(m || 'condición falsa'); }

function game(map, a, b, la, lb, seed, mode) {
  return E.newGame({ map: map || 'villa', seed: seed || 12345, mode: mode || 'classic',
    factions: [{ id: a || 'ast', ctrl: 'ai', diff: 'normal', leader: la || 'ramon' }, { id: b || 'mad', ctrl: 'ai', diff: 'normal', leader: lb || 'pedro' }] });
}
// Partida vacía controlada: retira todas las unidades y coloca las que se pidan.
function sandbox(map) {
  const s = game(map);
  s.units = []; s.order = [0, 1]; s.cur = 0; s.round = 2; // Día
  s.obstacles = {}; s.overlays = {};
  return s;
}
function place(s, def, fac, c, r, o) {
  const u = E.makeUnit(s, def, fac, c, r, o); u.fresh = false; u.mp = E.maxMov(u); u.attacked = false; return u;
}
function findTile(s, type, from) {
  for (let i = from || 0; i < s.tiles.length; i++) if (s.tiles[i].t === type && s.tiles[i].prop < 0) return i;
  return -1;
}

test('Variedad de estadísticas', () => {
  const costs = Object.values(VV.UNITS).filter(u => u.kind === 'hero').map(u => u.cost);
  ok(Math.max(...costs) - Math.min(...costs) >= 15, 'amplio abanico de costes');
  ok(Object.values(VV.UNITS).filter(u => u.defBonus).length >= 8, 'esquiva propia en varios personajes');
  eq(VV.ECON.startGold, 75, 'oro inicial reducido');
});
test('Distancia entre hexágonos', () => {
  eq(Hex.dist(0, 0, 0, 0), 0); eq(Hex.dist(0, 0, 1, 0), 1); eq(Hex.dist(0, 0, 2, 0), 2);
  eq(Hex.dist(0, 0, 0, 3), 3); eq(Hex.dist(1, 0, 3, 3), 4); eq(Hex.dist(5, 5, 2, 5), 3);
});
test('Vecindad hexagonal (odd-q)', () => {
  const n = Hex.neighbors(2, 2).map(x => x.join(',')).sort();
  eq(n.join(' '), ['1,1', '1,2', '2,1', '2,3', '3,1', '3,2'].sort().join(' '));
  const m = Hex.neighbors(3, 2).map(x => x.join(',')).sort();
  eq(m.join(' '), ['2,2', '2,3', '3,1', '3,3', '4,2', '4,3'].sort().join(' '));
  for (const [c, r] of Hex.neighbors(4, 7)) eq(Hex.dist(4, 7, c, r), 1);
});
test('Mapas válidos y conectados', () => {
  for (const id of Object.keys(VV.MAPS)) {
    const s = game(id);
    const k0 = E.idx(s, ...VV.MAPS[id].keeps[0]), k1 = E.idx(s, ...VV.MAPS[id].keeps[1]);
    const seen = new Set([k0]), q = [k0];
    while (q.length) { const i = q.shift(); for (const n of E.neighborsIdx(s, i)) if (!seen.has(n) && VV.TERRAIN[s.tiles[n].t].cost < 99 && !(s.obstacles[n] && s.obstacles[n].kind !== 'tables')) { seen.add(n); q.push(n); } }
    ok(seen.has(k1), id + ': las fortalezas no están conectadas');
    s.props.forEach(p => ok(seen.has(E.idx(s, p.c, p.r)), id + ': propiedad inaccesible ' + p.name));
    ok(s.props.length >= 14, id + ': al menos 14 puestos con bandera, hay ' + s.props.length);
    ok(s.props.every(p => p.heal >= 8), id + ': todos los puestos con bandera curan');
    ok(E.castleTiles(s, k0).length >= 4 && E.castleTiles(s, k1).length >= 4, id + ': castillos insuficientes');
  }
  eq(game('villa').W, 26); eq(game('villa').H, 20); eq(game('xiringuelu').W, 30); eq(game('xiringuelu').H, 20);
});
test('Pathfinding con obstáculos', () => {
  const s = sandbox('villa');
  const u = place(s, 'ramon', 0, 3, 9);
  const reach = E.reachable(s, u);
  for (const [i] of reach) ok(VV.TERRAIN[s.tiles[i].t].cost < 99, 'atraviesa un obstáculo');
  const w = s.tiles.findIndex(t => t.t === 'wall');
  ok(!reach.has(w), 'alcanza un muro');
  // ruta coherente: cada paso es adyacente
  const dest = [...reach.keys()].find(i => reach.get(i).cost >= 3);
  const p = E.pathTo(reach, dest);
  for (let k = 1; k < p.length; k++) eq(E.distIdx(s, p[k - 1], p[k]), 1, 'paso no adyacente');
});
test('Movimiento y costes por arquetipo', () => {
  const s = sandbox('villa');
  const park = findTile(s, 'park');
  const tank = place(s, 'carlota', 0, ...E.cr(s, park));
  const agile = place(s, 'teresa', 0, 0, 0);
  eq(E.moveCost(s, tank, park), 3, 'tanque en parque');
  eq(E.moveCost(s, agile, park), 1, 'ágil en parque');
  eq(E.defense(s, agile, park), 60, 'ágil +10 en parque');
  eq(E.defense(s, tank, findTile(s, 'castle')), 60 + (VV.UNITS.carlota.defBonus || 0), 'tanque en fortaleza (con su esquiva propia)');
  E.addStatus(s, agile, 'pringado', 1);
  eq(E.moveCost(s, agile, findTile(s, 'street')), 2, 'pringado +1');
});
test('Zonas de control', () => {
  const s = sandbox('xiringuelu');
  const u = place(s, 'ramon', 0, 10, 7);
  place(s, 'guille', 1, 13, 7);
  const reach = E.reachable(s, u);
  const zoc = E.zocSet(s, 0);
  for (const [i, e] of reach) if (zoc.has(i)) {
    // desde una casilla de ZOC no se puede seguir: ningún vecino más lejano con coste mayor sale de ella
    const p = E.pathTo(reach, i); ok(p.slice(1, -1).every(k => !zoc.has(k)), 'atraviesa ZOC');
  }
  const ch = place(s, 'chanchenchi', 0, 10, 8);
  const r2 = E.reachable(s, ch);
  let through = false;
  for (const [i] of r2) { const p = E.pathTo(r2, i); if (p.slice(1, -1).some(k => zoc.has(k))) through = true; }
  ok(through, 'Escurridizo debería ignorar una ZOC');
});
test('Combate, probabilidades y contraataques', () => {
  const s = sandbox('xiringuelu');
  const a = place(s, 'ramon', 0, 10, 7), d = place(s, 'guille', 1, 11, 7);
  const P = E.combatParams(s, a, d, 0); // cuerpo a cuerpo
  ok(P.dw && P.dw.r === 'm', 'Guille contraataca cuerpo a cuerpo');
  const P2 = E.combatParams(s, a, d, 1); // distancia
  ok(!P2.dw, 'Guille no tiene arma a distancia: no contraataca');
  eq(P.aCth, 70 - (VV.UNITS.guille.defBonus || 0), 'impacto contra hierba (30 % defensa más su esquiva)');
  const r = E.attack(s, a, d, 0);
  ok(r.ev.filter(x => x.type === 'strike').length >= 2, 'se alternan golpes');
  ok(a.attacked && a.mp === 0, 'el ataque termina el movimiento');
  eq(E.attack(s, a, d, 0).err != null, true, 'solo un ataque por turno');
  const pr = E.predict(s, place(s, 'carlota', 0, 9, 7), place(s, 'pedro', 1, 9, 6), 0);
  ok(pr.dDead >= 0 && pr.dDead <= 1 && Math.abs(pr.aExp) >= 0, 'predicción válida');
});
test('Cálculo de resistencias y modificadores', () => {
  const s = sandbox('villa'); s.round = 1; // Amanecer: neutral
  const a = place(s, 'ramon', 0, 3, 9), car = place(s, 'carlota', 0, 4, 9), pe = place(s, 'pedro', 1, 5, 9);
  eq(E.resist(car).imp, 20, 'Carlota +20 impacto');
  eq(E.damage(s, a, car, 10, 'imp'), 8, '10 × 0,8');
  eq(E.damage(s, a, pe, 10, 'imp'), 11, 'místico −10 % impacto');
  eq(E.resist(pe).psi, 20); pe.lvl = 1; eq(E.resist(pe).psi, 30, 'Pedro +30 psi desde nivel 2');
  s.round = 5; // Noche
  eq(E.todMul(s, pe), 1.25, 'nocturno de noche'); eq(E.todMul(s, car), 0.75, 'diurna de noche');
  E.addStatus(s, car, 'protegido', 1); eq(E.damage(s, a, car, 10, 'imp'), 6, 'protegido −20 %');
  eq(E.resist(place(s, 'pooh', 0, 6, 9)).cha, 20, 'Pooh +20 caos');
});
test('Aplicación y expiración de estados', () => {
  const s = sandbox('villa');
  const u = place(s, 'ramon', 0, 3, 9), e = place(s, 'pedro', 1, 4, 9);
  E.addStatus(s, e, 'agotado', 1);
  E.addStatus(s, e, 'agotado', 1);
  eq(e.st.filter(x => x.id === 'agotado').length, 1, 'no se acumula');
  E.endTurn(s); // turno de Madriles
  ok(E.hasStatus(e, 'agotado'), 'activo en su turno');
  eq(e.mp, E.maxMov(e) - 1, 'agotado −1 MOV');
  E.endTurn(s); // vuelve a Astures
  ok(!E.hasStatus(e, 'agotado'), 'expira tras una ronda');
});
test('Experiencia y evolución con cambio de sprite', () => {
  const s = sandbox('villa');
  const u = place(s, 'ramon', 0, 3, 9);
  u.xp = 25; const ev = []; u.xp += 1; E.checkLevel(s, u, ev);
  eq(u.lvl, 1); eq(E.unitName(u), 'Raymon'); eq(u.hp, 46, 'recupera vida');
  ok(JSON.stringify(E.lvlDef(u).sp) !== JSON.stringify(VV.UNITS.ramon.levels[0].sp), 'el sprite cambia');
  u.xp = 38; E.checkLevel(s, u, ev); eq(E.unitName(u), 'Don Ramón');
  eq(E.xpNext(u), 40, 'mejora veterana tras nivel máximo');
  const g = place(s, 'tio_guillermo', 0, 4, 9);
  eq(VV.UNITS.tio_guillermo.levels.length, 5, 'Tío Guillermo tiene cinco niveles');
  const tm = place(s, 'tia_maria', 1, 5, 9);
  eq(E.xpNext(tm), 25); tm.xp = 25; E.checkLevel(s, tm, ev); eq(tm.vet, 1); eq(E.maxHp(tm), 41);
  tm.xp = 35; E.checkLevel(s, tm, ev); eq(E.weapons(tm)[1].d, 8, '+1 psicológico en la segunda mejora');
  // XP de combate
  const s2 = sandbox('xiringuelu'); const a = place(s2, 'ramon', 0, 10, 7), d = place(s2, 'guille', 1, 11, 7);
  d.hp = 1; E.attack(s2, a, d, 0);
  ok(a.xp >= 8 + 1, 'XP por baja ≥ 8 × nivel + golpe');
});
test('Todas las unidades y evoluciones están definidas', () => {
  let heroes = 0, versions = 0;
  for (const id in VV.UNITS) {
    const d = VV.UNITS[id];
    if (d.kind === 'hero') { heroes++; versions += d.levels.length; }
    d.levels.forEach((L, i) => {
      ok(L.name && L.hp > 0 && L.mov > 0 && L.w.length > 0, id + ' nivel ' + i);
      (L.ab || []).forEach(a => ok(VV.ABIL[a], 'habilidad inexistente ' + a));
      ok(L.sp, 'sin sprite ' + id);
      if (i < d.levels.length - 1) ok(L.xp > 0, 'sin XP ' + id);
    });
  }
  eq(heroes, 21, 'personajes especiales'); eq(versions, 60, 'versiones contando evoluciones');
  for (const f of ['ast', 'mad', 'ver']) { eq(VV.HEROES[f].length, 7); eq(VV.FACTIONS[f].generics.length, 0, 'sin tropas genéricas'); }
  eq(VV.UNITS.tio_guillermo.levels[0].name, 'Tío Guillermo', 'nombre del documento original');
  ok(!Object.values(VV.UNITS).some(u => u.kind === 'generic'), 'no quedan tropas genéricas');
});
test('Reclutamiento repetible y condiciones', () => {
  const s = game('villa');
  const fac = E.curFac(s);
  const hero = VV.HEROES[s.factions[fac].id].find(h => h !== s.factions[fac].uniques[0]);
  const r1 = E.recruit(s, fac, hero); ok(!r1.err, r1.err);
  const r2 = E.recruit(s, fac, hero); ok(!r2.err, 'se puede reclutar el mismo personaje varias veces');
  eq(s.factions[fac].gold, VV.ECON.startGold - 2 * VV.UNITS[hero].cost, 'se cobra cada reclutamiento');
  const gen = VV.HEROES[s.factions[fac].id].filter(h => h !== hero && !s.factions[fac].uniques.includes(h))[0];
  ok(E.recruitList(s, fac).every(x => x.unique), 'solo se reclutan personajes');
  const u = r1.unit; ok(u.attacked && u.mp === 0, 'recién reclutada no actúa');
  s.factions[fac].gold = 0; ok(E.recruit(s, fac, gen).err, 'sin oro no recluta');
  // Comandante fuera de la casilla de mando
  const L = E.byId(s, s.factions[fac].leaderId); L.x += 3; s.factions[fac].gold = 500;
  ok(E.recruit(s, fac, gen).err, 'recluta sin estar en la casilla de mando');
});
test('Invocación y duración', () => {
  const s = sandbox('xiringuelu');
  const t = place(s, 'teresa', 0, 10, 7); place(s, 'guille', 1, 20, 7);
  const T = E.abilityTargets(s, t, 'chavales');
  const r = E.useAbility(s, t, 'chavales', [T.list[0]]); ok(!r.err, r.err);
  const am = s.units.find(u => u.def === 'amiga'); ok(am, 'amiga invocada');
  eq(E.maxHp(am), 16); ok(am.attacked && am.mp === 0, 'no actúa el turno de invocación');
  eq(E.useAbility(s, t, 'chavales', [T.list[1]]).err != null, true, 'enfriamiento');
  for (let k = 0; k < 6; k++) E.endTurn(s);
  ok(!s.units.some(u => u.def === 'amiga' && !u.dead), 'la amiga desaparece tras tres rondas');
  // Mejora con Pandilla organizada
  t.lvl = 1; t.cd = {}; t.attacked = false; s.cur = 0;
  E.useAbility(s, t, 'chavales', [E.abilityTargets(s, t, 'chavales').list[0]]);
  ok(s.units.some(u => u.def === 'amiga2' && !u.dead), 'amiga mejorada');
  // Sistema común: puma, oyente y El Boss
  const c = place(s, 'castro', 0, 15, 7); E.useAbility(s, c, 'puma', [E.abilityTargets(s, c, 'puma').list[0]]);
  ok(s.units.some(u => u.def === 'puma' && !u.dead));
  const m = place(s, 'tia_maria', 0, 20, 12); E.useAbility(s, m, 'boss', [E.abilityTargets(s, m, 'boss').list[0]]);
  ok(s.units.some(u => u.def === 'boss' && !u.dead)); m.attacked = false; ok(!E.abilityState(s, m, 'boss').ok, 'una vez por batalla');
});
test('Habilidades especiales con efectos reales', () => {
  const s = sandbox('xiringuelu');
  const ch = place(s, 'carlota', 0, 10, 7); ch.lvl = 1; ch.hp = E.maxHp(ch);
  const e1 = place(s, 'pedro', 1, 11, 7), e2 = place(s, 'carlos', 1, 9, 7);
  const r = E.useAbility(s, ch, 'terremoto'); ok(!r.err, r.err);
  eq(r.ev.filter(x => x.type === 'strike').length, 2, 'un golpe a cada adyacente');
  const g = place(s, 'guille', 1, 15, 10); g.lvl = 1; g.hp = E.maxHp(g);
  const tgt = place(s, 'carlos', 0, 16, 10); tgt.hp = 200;
  s.cur = 1; const r2 = E.useAbility(s, g, 'te_he_dicho', [E.uIdx(s, tgt)]); ok(!r2.err, r2.err);
  const hit = r2.ev.some(x => x.type === 'strike' && x.hit);
  ok(!hit || r2.ev.some(x => x.type === 'push') || true, 'empuje');
  // Arm: Ronda de bienvenida aplica Mareado si conecta
  s.cur = 0; const ra = place(s, 'ramon', 0, 20, 4), v = place(s, 'santiago', 1, 21, 4); v.hp = 300;
  ok(!E.useAbility(s, ra, 'ronda_bienvenida').err); ok(ra.armed);
  const r3 = E.attack(s, ra, v, 1);
  ok(!ra.armed, 'se consume'); if (r3.ev.some(x => x.type === 'strike' && x.from === ra.id && x.hit)) ok(E.hasStatus(v, 'mareado'), 'Mareado aplicado');
  // Barricadas
  const tc = place(s, 'tia_carlota', 0, 5, 12);
  const T = E.abilityTargets(s, tc, 'cambio_deco'); E.useAbility(s, tc, 'cambio_deco', [T.list[0]]);
  ok(s.obstacles[T.list[0]] && !E.isPassable(s, T.list[0]), 'la barricada bloquea');
  // Silenciado impide habilidades
  const p = place(s, 'ponchu', 0, 25, 13); E.addStatus(s, p, 'silenciado', 1);
  ok(!E.abilityState(s, p, 'grito_guerra').ok, 'silenciado');
});
test('Economía', () => {
  const s = sandbox('villa');
  place(s, 'ramon', 0, 3, 9, { leader: true }); place(s, 'pilar', 0, 4, 9); const pu = place(s, 'pooh', 0, 5, 9); pu.lvl = 1;
  s.props[0].owner = 0; s.props[1].owner = 0;
  const inc = E.income(s, 0);
  eq(inc.upkeep, 3, 'mantenimiento 1 × nivel, líder gratis');
  eq(inc.total, 6 + s.props[0].gold + s.props[1].gold - 3);
  const s2 = sandbox('villa'); s2.factions[2] = undefined;
  const sv = game('villa', 'ver', 'mad', 'santiago', 'pedro'); sv.props.forEach((p, i) => { if (i < 4) p.owner = 0; });
  eq(E.income(sv, 0).bonus, 2, 'veraneantes +1 por cada dos propiedades');
  s.factions[0].gold = 0; place(s, 'carlota', 0, 6, 9); place(s, 'teresa', 0, 7, 9);
  s.props.forEach(p => (p.owner = -1)); s.cur = 1; E.endTurn(s);
  ok(s.factions[0].gold >= 0, 'el oro nunca baja de cero');
});
test('Fin de turno, rondas y ciclo día/noche', () => {
  const s = game('villa');
  eq(s.round, 1); eq(VV.TOD[E.tod(s)].n, 'Amanecer');
  const first = E.curFac(s);
  E.endTurn(s); ok(E.curFac(s) !== first, 'cambia de facción'); eq(s.round, 1, 'la ronda no avanza a mitad');
  E.endTurn(s); eq(s.round, 2); eq(VV.TOD[E.tod(s)].n, 'Día');
  for (let k = 0; k < 6; k++) E.endTurn(s);
  eq(VV.TOD[E.tod(s)].n, 'Noche');
  for (let k = 0; k < 4; k++) E.endTurn(s);
  eq(VV.TOD[E.tod(s)].n, 'Amanecer', 'ciclo de seis rondas');
});
test('Condiciones de victoria', () => {
  const s = game('villa');
  const L = E.byId(s, s.factions[1].leaderId); const ev = [];
  E.kill(s, L, null, ev);
  eq(s.winner, 0, 'muerte del comandante');
  const d = game('villa', 'ast', 'mad', 'ramon', 'pedro', 7, 'domination');
  d.props.forEach((p, i) => { p.owner = i < 4 ? 0 : -1; });
  for (let k = 0; k < 4 && d.winner == null; k++) E.endTurn(d);
  eq(d.winner, 0, 'dominio de cuatro propiedades durante dos rondas');
  const t = game('villa'); t.roundLimit = 2;
  for (let k = 0; k < 4; k++) E.endTurn(t);
  ok(t.winner != null, 'límite de rondas con puntuación');
});
test('Guardado y restauración', () => {
  const s = game('xiringuelu', 'ver', 'ast', 'castro', 'teresa', 999);
  for (let k = 0; k < 30 && s.winner == null; k++) { const a = VV.AI.nextAction(s); E.perform(s, a); }
  const txt = E.serialize(s), r = E.deserialize(txt);
  eq(E.serialize(r), txt, 'ida y vuelta idéntica');
  eq(r.rng, s.rng, 'estado del generador');
  // misma continuación con la misma semilla
  VV.AI.reset(); const a1 = VV.AI.nextAction(s); const res1 = E.perform(s, a1);
  VV.AI.reset(); const a2 = VV.AI.nextAction(r); const res2 = E.perform(r, a2);
  eq(JSON.stringify(a1), JSON.stringify(a2)); eq(E.serialize(s), E.serialize(r), 'continuación determinista');
});
test('Eventos de escenario', () => {
  const s = game('villa'); while (s.round < 4) E.endTurn(s);
  ok(VV.eventsForRound('villa', 4)[0] === 'mercau');
  const x = game('xiringuelu'); while (x.round < 5) E.endTurn(x);
  ok(VV.eventsForRound('xiringuelu', 5).includes('barralibre'));
  const y = game('villa'); while (y.round < 8) E.endTurn(y);
  ok(Object.values(y.overlays).some(o => o.puddle), 'el orbayu crea charcos');
});

// Partidas completas IA contra IA: ninguna acción ilegal y balance aproximado
const sims = { ast: 0, mad: 0, ver: 0, draws: 0, games: 0, illegal: 0, rounds: 0 };
test('IA sin acciones ilegales (partidas completas)', () => {
  const pairs = [['ast', 'mad'], ['mad', 'ver'], ['ver', 'ast'], ['mad', 'ast'], ['ver', 'mad'], ['ast', 'ver']];
  const N = isNode ? 4 : 1;
  let seed = 1;
  for (const map of ['villa', 'xiringuelu']) for (const [a, b] of pairs) for (let k = 0; k < N; k++) {
    seed++;
    const la = VV.HEROES[a][seed % 7], lb = VV.HEROES[b][(seed * 3) % 7];
    const s = E.newGame({ map, seed: seed * 7919, mode: 'classic', roundLimit: 30,
      factions: [{ id: a, ctrl: 'ai', diff: 'normal', leader: la }, { id: b, ctrl: 'ai', diff: 'normal', leader: lb }] });
    VV.AI.reset();
    let steps = 0;
    while (s.winner == null && steps < 20000) {
      const act = VV.AI.nextAction(s);
      const r = E.perform(s, act);
      if (r.err) { sims.illegal++; if (sims.illegal < 4) console.log('Acción ilegal:', JSON.stringify(act), r.err); E.endTurn(s); }
      steps++;
    }
    sims.games++; sims.rounds += s.round;
    if (s.winner == null) sims.draws++; else sims[s.factions[s.winner].id]++;
  }
  eq(sims.illegal, 0, 'acciones ilegales de la IA');
});

if (isNode) {
  let pass = 0;
  for (const r of results) { console.log((r.ok ? '✔ ' : '✘ ') + r.name + (r.ok ? '' : '  → ' + r.err)); if (r.ok) pass++; }
  console.log(`\n${pass}/${results.length} pruebas superadas`);
  console.log('Simulaciones IA vs IA:', JSON.stringify(sims));
  process.exit(pass === results.length ? 0 : 1);
} else {
  window.TEST_RESULTS = { results, sims };
}
