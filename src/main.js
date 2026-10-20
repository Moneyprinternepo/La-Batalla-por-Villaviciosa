/* LA BATALLA POR VILLAVICIOSA — main.js
   Pantallas, controles, paneles, reproducción de eventos y turnos de la IA. */
(function (G) {
  const VV = G.VV, E = VV.Engine, ART = VV.Art, R = VV.Render, AU = VV.Audio, AI = VV.AI;
  const $ = q => document.querySelector(q);
  const UI = (VV.UI = { s: null, cfg: null, mode: 'idle', busy: false, reach: null, abil: null, picked: [], leapDest: null, recruitDef: null, hoverId: null, quipTurn: -1, lastQuip: '' });
  const SAVE_KEY = 'vv_save_v1', SET_KEY = 'vv_settings_v1';
  const DEF_SET = { vol: 0.6, music: true, sfx: true, aiSpeed: 'rapida', grid: false, zoc: false, reduced: false, hints: true };
  UI.set = Object.assign({}, DEF_SET);
  try { Object.assign(UI.set, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (e) { /* sin almacenamiento */ }
  function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(UI.set)); } catch (e) { /* ignorado */ } }
  function applySettings() {
    AU.vol = UI.set.vol; AU.musicOn = UI.set.music; AU.sfxOn = UI.set.sfx; AU.apply();
    if (UI.set.music) AU.startMusic(); R.grid = UI.set.grid; R.reduced = UI.set.reduced || (G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'class') e.className = attrs[k]; else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]); else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    }
    kids.flat(Infinity).forEach(c => { if (c == null || c === false) return; e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); });
    return e;
  }
  UI.h = h;
  function app(el, ...k) { k.flat(Infinity).forEach(c => { if (c != null && c !== false) el.append(c); }); }
  function portrait(def, lvl, vet, size) { const src = ART.portrait(def, lvl || 0, vet || 0, size || 64); const c = ART.mk(src.width, src.height); c.getContext('2d').drawImage(src, 0, 0); c.className = 'pix'; return c; }
  function spriteCanvas(def, lvl, scale, frame) {
    const src = ART.spriteHi(def, lvl, frame || 'idle0', scale || 2), bb = ART.bbox(src), pad = 4 * (scale || 2);
    const w = bb.x1 - bb.x0 + 1 + pad * 2, hh = bb.y1 - bb.y0 + 1 + pad * 2, side = Math.max(w, hh * 0.84);
    const c = ART.mk(Math.round(side), Math.round(side / 0.84)), x = c.getContext('2d');
    x.drawImage(src, bb.x0 - pad, bb.y0 - pad, w, hh, Math.round((c.width - w) / 2), c.height - hh, w, hh);
    c.className = 'pix'; return c;
  }
  const facOf = (s, i) => VV.FACTIONS[s.factions[i].id];
  const unitById = id => UI.s && UI.s.units.find(u => u.id === id);
  const wDesc = w => `${w.d}×${w.s} ${VV.DMG[w.t].toLowerCase()}`;
  const pct = x => Math.round(x * 100) + ' %';

  /* ---------------- Pantallas ---------------- */
  UI.show = function (id) {
    document.querySelectorAll('.screen').forEach(e => e.classList.toggle('active', e.id === 'scr-' + id));
    UI.screen = id; R.hidden = id !== 'battle';
    if (id === 'battle') setTimeout(() => R.resize(), 0);
    if (id === 'menu') { $('#btn-continue').disabled = !hasSave(); }
  };
  function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.tm); toast.tm = setTimeout(() => t.classList.remove('on'), ms || 2400); }
  UI.toast = toast;

  /* ---------------- Modales ---------------- */
  let modalResolve = null;
  function openModal(content, cls) {
    const m = $('#modal'), card = $('#modal-card');
    card.className = 'modal-card ' + (cls || ''); card.innerHTML = ''; card.appendChild(content);
    m.classList.remove('hidden');
    const f = card.querySelector('[data-autofocus]') || card.querySelector('button'); if (f) setTimeout(() => f.focus(), 30);
    return new Promise(res => { modalResolve = res; });
  }
  function closeModal(val) { $('#modal').classList.add('hidden'); const r = modalResolve; modalResolve = null; if (r) r(val); }
  UI.closeModal = closeModal;
  function confirmBox(title, text, yes, no) {
    return openModal(h('div', { class: 'confirm' }, h('h3', {}, title), h('p', {}, text),
      h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: () => closeModal(false) }, no || 'Cancelar'), h('button', { class: 'btn', 'data-autofocus': 1, onclick: () => closeModal(true) }, yes || 'Aceptar'))));
  }

  /* ---------------- Menú ---------------- */
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  function menuLoop(t) {
    if (UI.screen === 'menu') {
      const cv = $('#menu-bg'), b = cv.getBoundingClientRect(), d = Math.min(2, G.devicePixelRatio || 1);
      if (cv.width !== Math.round(b.width * d)) { cv.width = Math.round(b.width * d); cv.height = Math.round(b.height * d); }
      const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false; ART.menuScene(ctx, cv.width, cv.height, t);
    }
    requestAnimationFrame(menuLoop);
  }

  /* ---------------- Preparación de partida ---------------- */
  const setup = { fac: 'ast', rival: 'mad', leader: 'ramon', rivalLeader: 'random', map: 'villa', diff: 'normal', mode: 'classic', players: 1, limit: true };
  function renderSetup() {
    const root = $('#setup-body'); root.innerHTML = '';
    const facCard = (id, key) => {
      const F = VV.FACTIONS[id], on = setup[key] === id, dis = key === 'rival' ? setup.fac === id : setup.rival === id && key === 'fac' && false;
      return h('button', { class: 'fac-card' + (on ? ' on' : ''), style: `--fc:${F.col};--fc2:${F.col2};--fa:${F.accent}`, 'aria-pressed': on, disabled: dis, onclick: () => {
        setup[key] = id;
        if (key === 'fac') { if (setup.rival === id) setup.rival = ['ast', 'mad', 'ver'].find(x => x !== id); setup.leader = VV.HEROES[id][0]; }
        renderSetup(); AU.sfx('select'); } },
        h('div', { class: 'fac-name' }, F.n), h('p', {}, F.lore), h('p', { class: 'bonus' }, F.bonus),
        h('div', { class: 'fac-faces' }, VV.HEROES[id].map(x => portrait(x, 0, 0, 40))));
    };
    root.appendChild(h('section', { class: 'setup-sec' }, h('h2', {}, 'Tu facción'), h('div', { class: 'fac-row' }, ['ast', 'mad', 'ver'].map(id => facCard(id, 'fac')))));
    root.appendChild(h('section', { class: 'setup-sec' }, h('h2', {}, 'Facción rival'), h('div', { class: 'fac-row' }, ['ast', 'mad', 'ver'].filter(x => x !== setup.fac).map(id => facCard(id, 'rival')))));
    const L = VV.UNITS[setup.leader];
    root.appendChild(h('section', { class: 'setup-sec' }, h('h2', {}, 'Comandante'),
      h('p', { class: 'muted' }, 'El comandante empieza en la fortaleza, recibe +10 PV y es el único que puede reclutar. Si cae, se pierde la batalla.'),
      h('div', { class: 'leader-grid' }, VV.HEROES[setup.fac].map(id => h('button', { class: 'leader' + (setup.leader === id ? ' on' : ''), 'aria-pressed': setup.leader === id, title: VV.UNITS[id].levels[0].name, onclick: () => { setup.leader = id; renderSetup(); AU.sfx('select'); } },
        portrait(id, 0, 0, 72), h('span', {}, VV.UNITS[id].levels[0].name)))),
      h('div', { class: 'leader-info' }, h('strong', {}, L.levels[0].name), ' ', h('em', {}, L.cls), h('p', {}, '«' + L.desc + '»'),
        h('p', { class: 'muted' }, `${L.levels[0].hp + 10} PV como comandante, ${L.levels[0].mov} MOV, ${L.levels.length} niveles de evolución, ${VV.ARCH[L.arch].n.toLowerCase()}.`))));
    const mapCard = id => {
      const M = VV.MAPS[id], tmp = {}; E.buildMap(tmp, id); const mm = ART.minimap(tmp, 220, 150).cv; mm.className = 'pix';
      return h('button', { class: 'map-card' + (setup.map === id ? ' on' : ''), 'aria-pressed': setup.map === id, onclick: () => { setup.map = id; renderSetup(); AU.sfx('select'); } }, mm, h('strong', {}, M.n), h('p', {}, M.sub));
    };
    root.appendChild(h('section', { class: 'setup-sec' }, h('h2', {}, 'Campo de batalla'), h('div', { class: 'map-row' }, Object.keys(VV.MAPS).map(mapCard))));
    const seg = (key, opts) => h('div', { class: 'seg', role: 'group' }, opts.map(([v, label]) => h('button', { class: setup[key] === v ? 'on' : '', 'aria-pressed': setup[key] === v, onclick: () => { setup[key] = v; renderSetup(); } }, label)));
    root.appendChild(h('section', { class: 'setup-sec opts' }, h('h2', {}, 'Reglas'),
      h('label', {}, 'Jugadores'), seg('players', [[1, 'Contra la IA'], [2, 'Dos jugadores en este equipo']]),
      h('label', {}, 'Dificultad de la IA'), seg('diff', [['easy', 'Fácil'], ['normal', 'Normal'], ['hard', 'Difícil']]),
      h('label', {}, 'Modo'), seg('mode', [['classic', 'Batalla clásica'], ['domination', 'Dominio de la Villa']]),
      h('label', {}, 'Límite de 30 rondas'), seg('limit', [[true, 'Activado'], [false, 'Sin límite']]),
      h('label', {}, 'Comandante rival'), h('select', { onchange: e => { setup.rivalLeader = e.target.value; } },
        h('option', { value: 'random' }, 'Al azar'), VV.HEROES[setup.rival].map(id => h('option', { value: id, selected: setup.rivalLeader === id ? '' : null }, VV.UNITS[id].levels[0].name)))));
    if (!VV.HEROES[setup.rival].includes(setup.rivalLeader)) setup.rivalLeader = 'random';
  }
  function startFromSetup() {
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    const rl = setup.rivalLeader === 'random' ? VV.HEROES[setup.rival][seed % 7] : setup.rivalLeader;
    const cfg = { map: setup.map, seed, mode: setup.mode, roundLimit: setup.limit ? 30 : 9999,
      factions: [{ id: setup.fac, ctrl: 'human', leader: setup.leader }, { id: setup.rival, ctrl: setup.players === 2 ? 'human' : 'ai', diff: setup.diff, leader: rl }] };
    UI.startGame(E.newGame(cfg), cfg);
  }

  /* ---------------- Batalla ---------------- */
  UI.startGame = function (s, cfg) {
    UI.s = s; UI.cfg = cfg; UI.mode = 'idle'; R.selId = null; R.hl = {}; AI.reset();
    R.setState(s); UI.show('battle'); UI.logs = []; UI.tab = UI.tab || 'info';
    setTimeout(() => {
      R.resize(); R.cam.z = R.vw < 700 ? 0.75 : 1.15;
      const f = s.factions.find(x => x.ctrl === 'human') || s.factions[0];
      R.centerOn(f.keep[0], f.keep[1]); refresh();
      log(`Comienza la batalla en ${VV.MAPS[s.mapId].n}. Empieza ${s.factions[E.curFac(s)].name}.`, 'sys');
      runTurn(true);
    }, 30);
  };
  function isHumanTurn() { const s = UI.s; return s && s.winner == null && s.factions[E.curFac(s)].ctrl === 'human'; }
  function speedFor() { return { normal: 1, rapida: 0.45, instantanea: 0.02 }[UI.set.aiSpeed] || 1; }

  async function runTurn(first) {
    const s = UI.s; if (!s) return;
    if (s.winner != null) return endGame();
    const f = s.factions[E.curFac(s)], F = VV.FACTIONS[f.id];
    R.showReady = f.ctrl === 'human';
    refresh();
    if (f.ctrl === 'human') {
      R.speed = 1;
      const humans = s.factions.filter(x => x.ctrl === 'human').length;
      if (humans > 1) await openModal(h('div', { class: 'confirm hotseat', style: `--fc:${F.col}` }, h('h3', {}, 'Turno de ' + F.n), h('p', {}, 'Pasa el control al jugador de ' + F.n + '.'), h('div', { class: 'row end' }, h('button', { class: 'btn', 'data-autofocus': 1, onclick: () => closeModal() }, 'Empezar turno'))));
      banner('Turno de ' + F.n, F.col);
      const L = E.byId(s, f.leaderId); if (L && !first) R.centerOn(L.x, L.y, true);
      autosave(); updateHint();
    } else {
      banner('Turno de ' + F.n + ' (IA)', F.col);
      aiTurn();
    }
  }

  async function aiTurn() {
    const s = UI.s; UI.busy = true; refresh();
    R.speed = speedFor();
    let guard = 0, errs = 0;
    await R.wait(350);
    while (s.winner == null && guard++ < 500 && UI.s === s) {
      if (UI.fast) R.speed = 0.15;
      const act = AI.nextAction(s);
      if (act.type === 'end') break;
      const u = act.unit != null ? E.byId(s, act.unit) : null;
      if (u && !R.isVisible(u.x, u.y) && R.speed > 0.05) await R.centerOn(u.x, u.y, true);
      const r = E.perform(s, act);
      if (r.err) { if (++errs > 6) break; continue; }
      await play(r.ev);
      refresh();
    }
    if (UI.s !== s) return;
    if (s.winner == null) { const r = E.endTurn(s); await play(r.ev); }
    UI.busy = false; UI.fast = false; R.speed = 1;
    runTurn();
  }

  async function humanEndTurn() {
    const s = UI.s; if (!isHumanTurn() || UI.busy) return;
    const idle = E.living(s).filter(u => u.fac === E.curFac(s) && !u.fresh && !u.attacked && u.mp > 0 && !u.summon);
    if (idle.length) { const ok = await confirmBox('¿Terminar el turno?', `Quedan ${idle.length} unidad${idle.length > 1 ? 'es' : ''} con movimiento y ataque disponibles.`, 'Terminar turno', 'Seguir jugando'); if (!ok) return; }
    deselect(); UI.busy = true;
    const r = E.endTurn(s); await play(r.ev); UI.busy = false;
    runTurn();
  }

  /* ---------------- Reproducción de eventos ---------------- */
  function prepare(ev) {
    const s = UI.s, seen = new Set();
    const lock = id => { const u = unitById(id); if (u) { const v = R.visOf(u); v.lock = true; return v; } return null; };
    for (const e of ev) {
      switch (e.type) {
        case 'move': { const v = lock(e.id); if (v) { const [x, y] = ART.hexCenter(...E.cr(s, e.path[0])); v.x = x; v.y = y; } break; }
        case 'strike': case 'splash': { const v = lock(e.to); lock(e.from); if (v && !seen.has(e.to)) { seen.add(e.to); v.hp = e.hp + e.dmg; } break; }
        case 'death': lock(e.id); break;
        case 'levelup': { const v = lock(e.id); if (v && v.lvl == null) v.lvl = e.from; break; }
        case 'summon': case 'recruit': { const v = lock(e.id); if (v) v.alpha = 0; break; }
        case 'push': case 'leap': { const v = lock(e.id); if (v) { const [x, y] = ART.hexCenter(...E.cr(s, e.from)); v.x = x; v.y = y; } break; }
      }
    }
  }
  function unlockAll() { for (const [, v] of R.vis) { v.lock = false; v.hp = null; v.lvl = null; v.frame = null; v.dx = 0; v.dy = 0; if (!v.dying) v.alpha = 1; } }
  function center(u) { const v = R.visOf(u); return [v.x, v.y]; }
  let curFx = null;
  async function play(ev) {
    prepare(ev);
    const s = UI.s;
    try {
      for (const e of ev) await playOne(e, s);
    } catch (err) { console.error(err); }
    unlockAll(); curFx = null;
    if (s.winner != null && !UI.ended) setTimeout(endGame, 400);
    refresh();
  }
  const sleep = ms => R.wait(ms);
  async function playOne(e, s) {
    const u = e.id != null ? unitById(e.id) : null;
    switch (e.type) {
      case 'move': {
        const v = R.visOf(u);
        for (let k = 1; k < e.path.length; k++) {
          const [x0, y0] = [v.x, v.y], [x1, y1] = ART.hexCenter(...E.cr(s, e.path[k]));
          if (Math.abs(x1 - x0) > 2) v.face = x1 > x0 ? 1 : -1;
          AU.sfx('move');
          await R.tween(115, p => { v.x = x0 + (x1 - x0) * p; v.y = y0 + (y1 - y0) * p; v.dy = -Math.sin(p * Math.PI) * 3; });
        }
        v.dy = 0; break;
      }
      case 'combat': {
        const a = unitById(e.att), d = unitById(e.def);
        if (a && d) { const va = R.visOf(a), vd = R.visOf(d); va.face = vd.x >= va.x ? 1 : -1; vd.face = -va.face; }
        if (a && E.def(a).kind === 'hero' && UI.quipTurn !== s.turnIndex && Math.random() < 0.4) {
          const q = VV.QUIPS[a.def]; if (q) { const txt = q[Math.floor(Math.random() * q.length)]; if (txt !== UI.lastQuip) { UI.lastQuip = txt; UI.quipTurn = s.turnIndex; log(txt, 'quip'); } }
        }
        curFx = null; break;
      }
      case 'specialHit': {
        curFx = e.fx; const a = unitById(e.id), d = unitById(e.to);
        if (a && d) { const va = R.visOf(a), vd = R.visOf(d); va.face = vd.x >= va.x ? 1 : -1; await specialFx(e.fx, a, d); }
        break;
      }
      case 'strike': {
        const a = unitById(e.from), d = unitById(e.to); if (!a || !d) break;
        const va = R.visOf(a), vd = R.visOf(d), w = e.w || {};
        const fx = w.fx || curFx || 'fist';
        const [ax, ay] = center(a), [dx, dy] = center(d);
        va.face = dx >= ax ? 1 : -1; va.frame = 'wind';
        const ranged = w.r === 'd' || (e.special && ['hamster', 'coins', 'papers', 'barrel', 'shout', 'vomit', 'clock'].includes(fx));
        if (ranged && fx !== 'quake') {
          AU.sfx('throw');
          await R.tween(110, p => { va.dx = -va.face * 3 * p; });
          va.frame = 'atk';
          const kind = { talk: 'talk', shout: 'shout', clock: 'talk' }[fx] || fx;
          await R.proj(kind, ax + va.face * 14, ay - 26, dx, dy - 22, Math.max(160, Math.hypot(dx - ax, dy - ay) * 2.2), kind === 'talk' || kind === 'shout' ? 0 : 26);
        } else {
          await R.tween(90, p => { va.dx = -(dx - ax) * 0.06 * p; });
          va.frame = 'atk';
          await R.tween(120, p => { va.dx = (dx - ax) * (0.38 * p - 0.06 * (1 - p)); va.dy = (dy - ay) * 0.38 * p - Math.sin(p * Math.PI) * (fx === 'kick' ? 10 : 2); });
        }
        if (e.hit) {
          vd.flash = 1; vd.flashCol = '#ff3b3b'; vd.hp = e.hp; vd.frame = 'hurt'; R.shake = Math.max(R.shake, e.dmg > 12 ? 7 : 4);
          R.float('−' + e.dmg, dx, dy - 40, '#ff6b5a', 18);
          R.part(dx, dy - 20, fxColors(fx), 10, { speed: 2 });
          AU.sfx('hit');
          await R.tween(120, p => { vd.dx = (1 - p) * (Math.random() - 0.5) * 6; });
        } else {
          R.float('Falla', dx, dy - 40, '#d7d7d7', 14); AU.sfx('miss');
          await R.tween(160, p => { vd.dx = Math.sin(p * Math.PI) * -va.face * 10; });
        }
        await R.tween(110, p => { va.dx *= (1 - p); va.dy *= (1 - p); });
        va.dx = va.dy = 0; vd.dx = 0; va.frame = null; vd.frame = null;
        if (fx.startsWith('hamster') && UI.puchiTurn !== UI.s.turnIndex + ':' + a.id) { UI.puchiTurn = UI.s.turnIndex + ':' + a.id; log('Puchi ha vuelto sano y salvo.', 'quip'); }
        break;
      }
      case 'splash': { const d = unitById(e.to); if (!d) break; const v = R.visOf(d); v.flash = 1; v.hp = e.hp; const [x, y] = center(d); R.float('−' + e.dmg, x, y - 40, '#ffb74d', 15); R.part(x, y - 20, ['#e8b73a', '#fff'], 8); await sleep(250); break; }
      case 'death': {
        const v = R.visOf(u); v.dying = true; AU.sfx('death'); const [x, y] = center(u);
        R.part(x, y - 20, ['#e0e0e0', '#bdbdbd', '#fff'], 16, { speed: 1.5, up: 1.2, grav: -0.01, life: 900 });
        await R.tween(520, p => { v.alpha = 1 - p; v.dy = -p * 22; });
        v.gone = true; v.dying = false;
        log(`${E.unitName(u)} abandona la batalla.`, 'death'); break;
      }
      case 'status': { if (!u) break; const [x, y] = center(u), S = VV.STATUS[e.st]; R.float(S.n, x, y - 58, S.col, 13, 1300); await sleep(160); break; }
      case 'xp': break;
      case 'levelup': await levelUpAnim(u, e); break;
      case 'veteran': { const [x, y] = center(u); R.float('¡Mejora veterana!', x, y - 60, '#ffd54f', 15, 1600); R.part(x, y - 30, ['#ffd54f', '#fff59d'], 24, { speed: 2.4 }); AU.sfx('levelup'); log(`${e.name} obtiene una mejora veterana (${e.vet}/3): +3 PV máximos.`, 'lvl'); await sleep(700); break; }
      case 'summon': case 'recruit': {
        const v = R.visOf(u), [x, y] = ART.hexCenter(u.x, u.y); v.x = x; v.y = y;
        AU.sfx(e.type === 'summon' ? 'summon' : 'recruit');
        R.special('ring', x, y, 700, { col: e.type === 'summon' ? '#e1bee7' : VV.FACTIONS[s.factions[u.fac].id].accent });
        R.part(x, y - 20, e.type === 'summon' ? ['#ffd54f', '#e1bee7', '#fff'] : ['#fff'], 18, { speed: 2 });
        await R.tween(380, p => { v.alpha = p; v.scale = 0.6 + 0.4 * p; }); v.scale = 1;
        log(e.type === 'summon' ? `Aparece ${E.unitName(u)}.` : `${s.factions[u.fac].name} recluta a ${E.unitName(u)}.`, 'sys'); break;
      }
      case 'capture': { const p = s.props[e.prop], [x, y] = ART.hexCenter(p.c, p.r), F = facOf(s, u.fac); AU.sfx('capture'); R.float('¡Capturada!', x, y - 50, F.accent, 14); R.part(x - 16, y - 34, [F.col, F.accent], 12); log(`${E.unitName(u)} captura ${p.name}.`, 'cap'); await sleep(250); break; }
      case 'gold': { const uu = unitById(e.id); if (uu) { const [x, y] = center(uu); R.float('+' + e.n + ' oro', x, y - 64, '#ffd54f', 14); } AU.sfx('coin'); log(`${s.factions[e.fac].name} obtiene ${e.n} de oro.`, 'gold'); break; }
      case 'heal': { if (!u || !e.n) break; const [x, y] = center(u); R.float('+' + e.n, x, y - 46, '#7ee787', 15); R.part(x, y - 20, ['#a5d6a7', '#e8f5e9'], 6, { up: 1.2, grav: -0.01 }); break; }
      case 'push': { const v = R.visOf(u), [x0, y0] = [v.x, v.y], [x1, y1] = ART.hexCenter(...E.cr(s, e.to)); R.shake = 6; await R.tween(220, p => { v.x = x0 + (x1 - x0) * p; v.y = y0 + (y1 - y0) * p; }); log(`${E.unitName(u)} sale despedido un hexágono.`, 'sys'); break; }
      case 'leap': {
        const v = R.visOf(u), [x0, y0] = [v.x, v.y], [x1, y1] = ART.hexCenter(...E.cr(s, e.to)); v.face = x1 >= x0 ? 1 : -1;
        if (e.fx === 'shadow') R.part(x0, y0 - 20, ['#311b92', '#1a1a2e'], 14);
        await R.tween(420, p => { v.x = x0 + (x1 - x0) * p; v.y = y0 + (y1 - y0) * p; v.dy = -Math.sin(p * Math.PI) * (e.fx === 'kick' ? 70 : 34); });
        v.dy = 0; R.shake = 4; break;
      }
      case 'vanish': { const v = R.visOf(u); v.dying = true; v.lock = true; const [x, y] = center(u); R.part(x, y - 20, ['#e1bee7', '#fff'], 10); await R.tween(380, p => { v.alpha = 1 - p; }); v.gone = true; v.dying = false; break; }
      case 'barricade': { const [x, y] = ART.hexCenter(...E.cr(s, e.at)); AU.sfx('summon'); R.part(x, y - 20, ['#f8bbd0', '#fff59d', '#b3e5fc'], 22, { speed: 2.4 }); log('Tía Carlota ha cambiado la decoración sin preguntar.', 'quip'); await sleep(300); break; }
      case 'sticky': { const [x, y] = ART.hexCenter(...E.cr(s, e.at)); R.part(x, y, ['#9ccc65', '#c5e1a5'], 14); await sleep(150); break; }
      case 'smash': { const a = unitById(e.id), v = R.visOf(a), [x, y] = ART.hexCenter(...E.cr(s, e.at)), [ax, ay] = center(a); v.frame = 'atk'; await R.tween(140, p => { v.dx = (x - ax) * 0.35 * p; v.dy = (y - ay) * 0.35 * p; }); R.part(x, y - 10, ['#8d5a2b', '#a1673a', '#fff'], 14, { speed: 2.5 }); AU.sfx('hit'); R.float('−' + e.dmg, x, y - 36, '#ffb74d', 15); await R.tween(110, p => { v.dx *= 1 - p; v.dy *= 1 - p; }); v.frame = null; break; }
      case 'obstacleGone': { const [x, y] = ART.hexCenter(...E.cr(s, e.at)); R.part(x, y - 10, ['#8d6e63', '#f8bbd0', '#fff'], 18, { speed: 2.4 }); if (e.kind === 'tables') log('Las mesas del prao han quedado hechas astillas.', 'sys'); break; }
      case 'ability': {
        const A = VV.ABIL[e.abil], [x, y] = center(u); AU.sfx('ability');
        R.float(A.n, x, y - 74, A.ult ? '#ffd54f' : '#fff3c4', A.ult ? 17 : 14, 1500);
        if (A.ult) { banner(A.n, facOf(s, u.fac).col, true); R.part(x, y - 30, ['#ffd54f', '#fff'], 20, { speed: 2.6 }); }
        log(`${E.unitName(u)} usa ${A.n}.`, A.ult ? 'ult' : 'abil');
        if (e.abil === 'monopolio') log('La Mamen ha monopolizado la partida.', 'quip');
        await sleep(A.ult ? 520 : 260); break;
      }
      case 'eliminated': log(`${s.factions[e.fac].name} ha perdido a su comandante.`, 'death'); break;
      case 'income': if (s.factions[e.fac].ctrl === 'human') log(`Ingresos de ${s.factions[e.fac].name}: ${e.n >= 0 ? '+' : ''}${e.n} de oro.`, 'gold'); break;
      case 'round': { R.setTod(e.tod); const T = VV.TOD[e.tod]; log(`Ronda ${e.round}: ${T.n.toLowerCase()}.`, 'sys'); if (T.law === -1 && VV.TOD[(e.tod + 5) % 6].law !== -1) log('Cae la noche. Las unidades nocturnas se crecen.', 'sys'); break; }
      case 'event': await eventAnim(e, s); break;
      case 'turn': break;
      case 'win': break;
    }
  }
  function fxColors(fx) {
    return { cup: ['#e8b73a', '#e3f2f6'], cup2: ['#e8b73a', '#e3f2f6'], cupbig: ['#f2c12e', '#fff59d'], hamster: ['#ffd54f', '#d9a066'], hamster2: ['#ffd54f'], hamster3: ['#ffd54f', '#fff'], vomit: ['#9ccc65', '#558b2f'], dice: ['#fafafa', '#ffca28'], papers: ['#fafafa', '#9e9e9e'], coins: ['#f2c12e', '#fff59d'], notes: ['#ffd54f', '#ea80fc'], hearts: ['#ec407a'], knife: ['#e0f7fa', '#fff'], claw: ['#fff', '#ffcc80'], wine: ['#8e1b2c', '#c2185b'], talk: ['#b39ddb'], shout: ['#ffcc80'] }[fx] || ['#fff3c4', '#ffb74d', '#fff'];
  }
  async function specialFx(fx, a, d) {
    const [x, y] = center(a), [dx, dy] = center(d);
    switch (fx) {
      case 'quake': R.special('quake', x, y, 900); R.shake = 12; AU.sfx('quake'); break;
      case 'clock': R.special('clock', x, y, 1300); break;
      case 'shout': R.special('shout', x, y, 900); break;
      case 'muscle': R.special('muscle', x, y, 700); R.shake = 9; R.part(x, y - 30, ['#9e9e9e', '#fff'], 16, { speed: 3 }); break;
      case 'vomit': R.special('vomit', dx, dy, 1200); break;
      case 'dance': {
        R.special('dance', x, y, 1300);
        const z0 = R.cam.z, cx0 = R.cam.x, cy0 = R.cam.y, z1 = Math.min(2.2, z0 * 1.18);
        await R.tween(320, p => { const z = z0 + (z1 - z0) * p; const wx = x, wy = y - 20; R.cam.z = z; R.cam.x = wx - (wx - cx0) * z0 / z; R.cam.y = wy - (wy - cy0) * z0 / z; });
        await R.wait(380);
        await R.tween(320, p => { const z = z1 + (z0 - z1) * p; R.cam.z = z; R.cam.x = cx0 + (R.cam.x - cx0) * (1 - p); R.cam.y = cy0 + (R.cam.y - cy0) * (1 - p); });
        R.cam.z = z0; R.cam.x = cx0; R.cam.y = cy0; break;
      }
      case 'barrel': R.part(dx, dy - 10, ['#8d5a2b', '#c2185b'], 12, { speed: 2 }); break;
      case 'coins': for (let k = 0; k < 18; k++) R.part(dx + (Math.random() - 0.5) * 50, dy - 90, ['#f2c12e', '#7cb342'], 1, { speed: 0.4, up: -1, grav: 0.12, life: 900, size: 4 }); break;
      case 'papers': R.part(dx, dy - 60, ['#fafafa', '#e0e0e0'], 18, { speed: 1.5, up: 0.3, grav: 0.03, life: 1200, size: 5 }); break;
      case 'kick': R.part(x, y - 20, ['#ff7043', '#ffd54f'], 12, { speed: 2 }); break;
      case 'shadow': R.part(x, y - 20, ['#311b92', '#1a1a2e'], 16); break;
      default: R.part(x, y - 30, ['#ffd54f', '#fff'], 12, { speed: 2 });
    }
    await sleep(240);
  }
  async function levelUpAnim(u, e) {
    const v = R.visOf(u), [x, y] = center(u);
    if (R.speed > 0.05) await R.centerOn(u.x, u.y, true);
    AU.sfx('levelup'); R.special('evolve', x, y, 1200);
    R.part(x, y - 30, ['#ffd54f', '#fff59d', '#fff'], 30, { speed: 2.6, up: 1.4, life: 1100 });
    if (u.def === 'pooh') log('Pooh está sufriendo una transformación preocupante.', 'quip');
    if (u.def === 'dantart') log('¡Ha llegado otro hermano Dantart!', 'quip');
    await R.tween(600, p => { v.scale = 1 + Math.sin(p * Math.PI) * 0.15; v.flash = p; v.flashCol = '#fff8dc'; });
    v.lvl = null; v.scale = 1; v.flash = 1; v.flashCol = '#ffffff';
    log(`${e.fromName} evoluciona a ${e.toName}.`, 'lvl');
    await levelCard(u, e);
  }
  function levelCard(u, e) {
    const d = E.def(u), A0 = d.levels[e.from], A1 = d.levels[e.to];
    const newAb = (A1.ab || []).map(a => VV.ABIL[a]).filter(Boolean);
    const diff = (a, b, label) => h('li', {}, h('span', {}, label), h('span', {}, String(a)), h('span', { class: 'arrow' }, '›'), h('strong', {}, String(b)));
    const auto = !isHumanTurn() || UI.set.aiSpeed === 'instantanea';
    const card = h('div', { class: 'levelcard' },
      h('h3', {}, '¡Evolución!'),
      h('div', { class: 'evo' }, h('figure', {}, spriteCanvas(u.def, e.from, 3), h('figcaption', {}, e.fromName)), h('div', { class: 'evo-arrow' }, '»'), h('figure', { class: 'new' }, spriteCanvas(u.def, e.to, 3), h('figcaption', {}, e.toName))),
      h('ul', { class: 'diffs' }, diff(A0.hp + (u.leader ? 10 : 0), A1.hp + (u.leader ? 10 : 0), 'PV'), diff(A0.mov, A1.mov, 'MOV'),
        A1.w.map((w, k) => diff(A0.w[k] ? wDesc(A0.w[k]) : '—', wDesc(w), w.n))),
      newAb.length ? h('div', { class: 'newab' }, newAb.map(a => h('p', {}, h('strong', {}, a.n + ': '), a.d))) : null,
      h('div', { class: 'row end' }, h('button', { class: 'btn', 'data-autofocus': 1, onclick: () => closeModal() }, 'Continuar')));
    const p = openModal(card, 'wide');
    if (auto) setTimeout(() => { if (modalResolve) closeModal(); }, Math.max(150, 2600 * R.speed));
    return p;
  }
  async function eventAnim(e, s) {
    const EV = VV.EVENTS[e.ev]; AU.sfx('event');
    banner(EV.n, '#c8a93a', true); log(`${EV.n}: ${EV.d}`, 'event');
    const M = VV.MAPS[s.mapId];
    if (e.ev === 'charanga') { R.special('band', 0, 0, 2600, { row: M.charanga }); log('¡La charanga! Quien estorbe acabará mareado.', 'quip'); await sleep(1200); }
    if (e.ev === 'orbayu') { R.special('rain', 0, 0, 2600); await sleep(900); }
    for (const x of e.hit) {
      if (x.id != null) { const u = unitById(x.id); if (!u) continue; const [px, py] = center(u); if (x.st) R.float(VV.STATUS[x.st].n, px, py - 58, VV.STATUS[x.st].col, 13); if (x.heal) R.float('+' + x.heal, px, py - 46, '#7ee787', 15); R.special('ring', px, py, 700); }
      if (x.gold) { const p = s.props.find(q => q.kind === 'abastos'), [px, py] = ART.hexCenter(p.c, p.r); R.float('+3 oro', px, py - 50, '#ffd54f', 16); }
    }
    await sleep(700);
  }

  /* ---------------- Banner, registro y consejos ---------------- */
  function banner(text, col, big) {
    const b = $('#banner'); b.textContent = text; b.style.setProperty('--bc', col || '#c8a93a');
    b.className = 'on' + (big ? ' big' : ''); clearTimeout(banner.tm); banner.tm = setTimeout(() => (b.className = ''), big ? 1700 : 1300);
    if (!big) AU.sfx('turn');
  }
  function log(text, cls) {
    UI.logs = UI.logs || []; UI.logs.push({ text, cls: cls || '', r: UI.s ? UI.s.round : 0 });
    if (UI.logs.length > 150) UI.logs.shift();
    if (UI.tab === 'log' && UI.screen === 'battle') renderSide();
    if (['quip', 'lvl', 'ult', 'event', 'death', 'cap'].includes(cls)) { const t = $('#ticker'); t.textContent = text; t.className = 'on ' + cls; clearTimeout(log.tm); log.tm = setTimeout(() => (t.className = ''), 3200); }
  }
  UI.log = log;
  function updateHint() { renderContext(); }
  /* ---------------- Selección e interacción ---------------- */
  function deselect() { R.selId = null; UI.mode = 'idle'; UI.abil = null; UI.picked = []; UI.leapDest = null; UI.recruitDef = null; UI.reach = null; R.hl = {}; refresh(); updateHint(); }
  function select(u) {
    const s = UI.s; R.selId = u.id; UI.mode = 'idle'; UI.abil = null; UI.picked = [];
    R.hl = {};
    const mine = isHumanTurn() && u.fac === E.curFac(s);
    const reach = E.reachable(s, u, mine ? u.mp : E.maxMov(u));
    UI.reach = mine ? reach : null;
    if (mine) R.hl.reach = [...reach.keys()].filter(i => i !== E.uIdx(s, u));
    else R.hl.threat = threatOf(u);
    if (mine && !u.attacked && !u.fresh) {
      const att = new Set();
      for (const e of E.living(s)) {
        if (e.fac === u.fac) continue;
        const ei = E.uIdx(s, e);
        if (E.distIdx(s, ei, E.uIdx(s, u)) === 1 || E.neighborsIdx(s, ei).some(n => reach.has(n) && (!E.unitAtIdx(s, n) || n === E.uIdx(s, u)))) att.add(ei);
      }
      R.hl.attack = [...att];
    }
    if (R.zocOn) R.hl.zoc = [...E.zocSet(s, u.fac)];
    AU.sfx('select'); refresh(); updateHint();
  }
  function threatOf(u) {
    const s = UI.s, reach = E.reachable(s, u, E.maxMov(u)), set = new Set();
    for (const i of reach.keys()) { set.add(i); E.neighborsIdx(s, i).forEach(n => set.add(n)); }
    return [...set];
  }
  function bestApproach(u, target) {
    const s = UI.s, reach = UI.reach; if (!reach) return null;
    let best = null, bv = -1e9;
    for (const n of E.neighborsIdx(s, E.uIdx(s, target))) {
      const e = reach.get(n); if (!e) continue;
      if (E.unitAtIdx(s, n) && n !== E.uIdx(s, u)) continue;
      const v = E.defense(s, u, n) - e.cost * 3 + (n === E.uIdx(s, u) ? 50 : 0);
      if (v > bv) { bv = v; best = n; }
    }
    return best;
  }
  async function act(action) {
    const s = UI.s;
    const r = E.perform(s, action);
    if (r.err) { toast(r.err); return null; }
    UI.busy = true; R.hl = Object.assign({}, R.hl, { path: null });
    await play(r.ev);
    UI.busy = false;
    return r;
  }
  async function onTileClick(i) {
    const s = UI.s; if (!s || UI.busy || !isHumanTurn()) return;
    AU.init();
    const fac = E.curFac(s), clicked = E.unitAtIdx(s, i), sel = R.selId != null ? E.byId(s, R.selId) : null;
    if (UI.mode === 'recruit') {
      if ((R.hl.recruit || []).includes(i)) { const def = UI.recruitDef; deselect(); await act({ type: 'recruit', def, spot: i }); afterAction(); }
      else deselect();
      return;
    }
    if (UI.mode === 'ability' && sel) return abilityClick(sel, i);
    if (clicked && clicked.fac === fac) { if (sel && sel.id === clicked.id) return deselect(); return select(clicked); }
    if (clicked && clicked.fac !== fac) {
      if (sel && sel.fac === fac && !sel.attacked && !sel.fresh) {
        if (E.distIdx(s, E.uIdx(s, sel), i) === 1) return openPreview(sel, clicked);
        const ap = bestApproach(sel, clicked);
        if (ap != null) {
          const r = await act({ type: 'move', unit: sel.id, to: ap });
          const u2 = r && E.byId(s, sel.id);
          if (u2 && E.byId(s, clicked.id) && E.distIdx(s, E.uIdx(s, u2), E.uIdx(s, clicked)) === 1) { select(u2); return openPreview(u2, clicked); }
          if (u2) select(u2); return;
        }
      }
      return select(clicked);
    }
    if (sel && sel.fac === fac && s.obstacles[i] && E.canBreak(s, sel, i)) {
      const o = s.obstacles[i];
      const ok = await confirmBox(o.kind === 'tables' ? 'Romper las mesas' : 'Destruir la barricada', `${E.unitName(sel)} usará su ataque de este turno para golpear el obstáculo. Los objetos no esquivan.`, 'Golpear', 'Cancelar');
      if (ok) { await act({ type: 'break', unit: sel.id, at: i }); afterAction(sel.id); }
      return;
    }
    if (sel && sel.fac === fac && UI.reach && UI.reach.has(i) && i !== E.uIdx(s, sel) && !E.unitAtIdx(s, i)) {
      await act({ type: 'move', unit: sel.id, to: i });
      afterAction(sel.id); return;
    }
    deselect();
  }
  function afterAction(id) {
    const s = UI.s; if (!s || s.winner != null) return;
    const u = id != null ? E.byId(s, id) : null;
    if (u && (u.mp > 0 || !u.attacked)) select(u); else deselect();
    refresh(); updateHint();
  }

  /* ---------------- Previsualización de combate ---------------- */
  async function openPreview(a, d) {
    const s = UI.s, ws = E.weapons(a);
    let best = 0, bv = -1e9;
    ws.forEach((w, k) => { const P = E.predict(s, a, d, k); const v = (d.hp - P.dExp) + P.dDead * 30 - (a.hp - P.aExp) * 0.7; if (v > bv) { bv = v; best = k; } });
    let wi = best;
    const body = h('div', { class: 'preview' });
    const render = () => {
      body.innerHTML = '';
      const P = E.predict(s, a, d, wi), Fa = facOf(s, a.fac), Fd = facOf(s, d.fac);
      const side = (u, F, hpExp, dead, label) => h('div', { class: 'pv-side', style: `--fc:${F.col}` }, portrait(u.def, u.lvl, u.vet, 72),
        h('div', {}, h('strong', {}, E.unitName(u)), h('div', { class: 'muted' }, label),
          h('div', { class: 'hpline' }, `PV ${u.hp}/${E.maxHp(u)}`, h('span', { class: 'muted' }, `  esperado ${Math.round(hpExp)}`)),
          h('div', { class: 'kill' + (dead > 0.4 ? ' hi' : '') }, `Probabilidad de caer: ${pct(dead)}`),
          h('div', { class: 'muted' }, `Defensa en ${VV.TERRAIN[s.tiles[E.uIdx(s, u)].t].n.toLowerCase()}: ${E.defense(s, u)} %`),
          u.st.length ? h('div', { class: 'chips' }, u.st.map(x => h('span', { class: 'chip', style: `--sc:${VV.STATUS[x.id].col}`, title: VV.STATUS[x.id].d }, VV.STATUS[x.id].n))) : null));
      body.appendChild(h('div', { class: 'pv-head' }, side(a, Fa, P.aExp, P.aDead, 'Atacante'), h('div', { class: 'vs' }, 'contra'), side(d, Fd, P.dExp, P.dDead, 'Defensor')));
      body.appendChild(h('div', { class: 'pv-weapons', role: 'radiogroup' }, ws.map((w, k) => {
        const Q = E.combatParams(s, a, d, k);
        return h('button', { class: 'pv-w' + (k === wi ? ' on' : ''), role: 'radio', 'aria-checked': k === wi, onclick: () => { wi = k; render(); } },
          h('span', { class: 'wn' }, w.n), h('span', {}, `${Q.aDmg}×${Q.aStr}`), h('span', { class: 'muted' }, VV.DMG[w.t] + (w.r === 'm' ? ', cuerpo a cuerpo' : ', a distancia') + (w.sp ? ', ' + VV.WSPECIAL[w.sp].n.toLowerCase() : '')), h('span', { class: 'cth' }, Q.aCth + ' %'),
          h('span', { class: 'counter' }, Q.dw ? `Represalia: ${Q.dw.n} ${Q.dDmg}×${Q.dStr} (${Q.dCth} %)` : 'Sin represalia'));
      })));
      const Q = E.combatParams(s, a, d, wi), res = E.resist(d)[Q.aw.t] || 0;
      const notes = [];
      notes.push(`Resistencia de ${E.unitName(d)} a ${VV.DMG[Q.aw.t].toLowerCase()}: ${res > 0 ? '+' : ''}${res} %.`);
      const tm = E.todMul(s, a); if (tm !== 1) notes.push(`${VV.TOD[E.tod(s)].n}: ${tm > 1 ? '+' : '−'}25 % de daño para ${E.unitName(a)}.`);
      if (Q.arm) notes.push('Habilidad preparada: ' + VV.ABIL[Q.arm.src].n + '.');
      body.appendChild(h('div', { class: 'pv-notes muted' }, notes.map(n => h('p', {}, n))));
      body.appendChild(h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: () => closeModal(false) }, 'Cancelar'), h('button', { class: 'btn danger', 'data-autofocus': 1, onclick: () => closeModal(true) }, 'Atacar')));
    };
    render();
    const ok = await openModal(body, 'wide');
    if (ok) { await act({ type: 'attack', unit: a.id, target: d.id, weapon: wi }); afterAction(a.id); }
  }

  /* ---------------- Habilidades ---------------- */
  async function startAbility(u, id) {
    const s = UI.s, A = VV.ABIL[id], st = E.abilityState(s, u, id);
    if (!st.ok) { toast(A.n + ': ' + st.why); return; }
    const T = E.abilityTargets(s, u, id);
    if (T.mode === 'self') {
      if (T.auto && T.auto.length) { R.hl = { area: T.auto }; }
      await act({ type: 'ability', unit: u.id, abil: id, targets: [] }); afterAction(u.id); return;
    }
    UI.mode = 'ability'; UI.abil = id; UI.picked = []; UI.leapDest = null;
    R.hl = { abil: T.list.slice(), picked: [] };
    toast(T.mode === 'multi' ? `Elige hasta ${T.need} objetivos y pulsa Confirmar.` : T.mode === 'leap' ? 'Elige la casilla de destino.' : 'Elige un objetivo resaltado.');
    refresh(); updateHint();
  }
  async function abilityClick(u, i) {
    const s = UI.s, id = UI.abil, A = VV.ABIL[id], T = E.abilityTargets(s, u, id);
    if (T.mode === 'leap') {
      if (UI.leapDest == null) {
        if (!T.list.includes(i)) return deselectAbility(u);
        UI.leapDest = i;
        if (A.then && A.then !== 'normal') {
          const en = E.neighborsIdx(s, i).filter(n => { const x = E.unitAtIdx(s, n); return x && x.fac !== u.fac; });
          R.hl = { abil: en, picked: [i] }; toast('Ahora elige a quién golpear tras el salto.'); refresh(); return;
        }
        UI.mode = 'idle'; await act({ type: 'ability', unit: u.id, abil: id, targets: [i] }); afterAction(u.id); return;
      }
      if (!(R.hl.abil || []).includes(i)) return deselectAbility(u);
      UI.mode = 'idle'; await act({ type: 'ability', unit: u.id, abil: id, targets: [UI.leapDest, i] }); afterAction(u.id); return;
    }
    if (!T.list.includes(i)) return deselectAbility(u);
    if (T.mode === 'multi') {
      const k = UI.picked.indexOf(i); if (k >= 0) UI.picked.splice(k, 1); else UI.picked.push(i);
      R.hl.picked = UI.picked.slice();
      if (UI.picked.length >= T.need) { const tg = UI.picked.slice(); UI.mode = 'idle'; await act({ type: 'ability', unit: u.id, abil: id, targets: tg }); afterAction(u.id); }
      else refresh();
      return;
    }
    UI.mode = 'idle'; await act({ type: 'ability', unit: u.id, abil: id, targets: [i] }); afterAction(u.id);
  }
  function deselectAbility(u) { UI.mode = 'idle'; UI.abil = null; UI.picked = []; select(u); }
  async function confirmMulti() { const u = E.byId(UI.s, R.selId); if (!u || !UI.picked.length) return; const tg = UI.picked.slice(), id = UI.abil; UI.mode = 'idle'; await act({ type: 'ability', unit: u.id, abil: id, targets: tg }); afterAction(u.id); }

  /* ---------------- Reclutamiento ---------------- */
  async function openRecruit() {
    const s = UI.s; if (!isHumanTurn() || UI.busy) return;
    const fac = E.curFac(s), f = s.factions[fac];
    const spots = E.recruitSpots(s, fac);
    if (!spots.length) { toast('El comandante debe estar en la casilla de mando y tener casillas de fortaleza libres.'); const L = E.byId(s, f.leaderId); if (L) { R.centerOn(L.x, L.y, true); select(L); } return; }
    const list = E.recruitList(s, fac);
    const card = h('div', { class: 'recruit' }, h('h3', {}, 'Reclutar personajes'), h('p', { class: 'muted' }, `Oro disponible: ${f.gold}. Puedes reclutar a cualquier personaje tantas veces como quieras; cada recluta actúa a partir de tu próximo turno y cuesta 1 de oro por nivel y ronda de mantenimiento.`),
      h('div', { class: 'rec-grid' }, list.map(x => {
        const d = VV.UNITS[x.id], L = d.levels[0], ok = x.avail && f.gold >= x.cost;
        return h('button', { class: 'rec' + (ok ? '' : ' off'), disabled: !ok, onclick: () => closeModal(x.id) },
          portrait(x.id, 0, 0, 64),
          h('div', { class: 'rec-info' }, h('strong', {}, L.name), h('span', { class: 'muted' }, d.cls),
            h('span', {}, `${L.hp} PV, ${L.mov} MOV`), h('span', { class: 'muted' }, L.w.map(w => `${w.n} ${w.d}×${w.s}`).join(', ')),
            d.defBonus ? h('span', { class: 'muted' }, `Esquiva propia ${d.defBonus > 0 ? '+' : ''}${d.defBonus} %`) : null),
          h('span', { class: 'cost' }, x.cost));
      })),
      h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: () => closeModal(null) }, 'Cerrar')));
    const id = await openModal(card, 'wide');
    if (!id) return;
    if (spots.length === 1) { await act({ type: 'recruit', def: id, spot: spots[0] }); refresh(); return; }
    UI.mode = 'recruit'; UI.recruitDef = id; R.selId = null; R.hl = { recruit: spots };
    toast('Elige una casilla de la fortaleza.'); updateHint();
  }

  /* ---------------- Paneles ---------------- */
  function todIcon(idx) {
    const c = ART.mk(20, 20), g = ART.P(c.getContext('2d'));
    if (VV.TOD[idx].law >= 0 && idx !== 3) { g.circ(10, 10, idx === 0 ? 5 : 6, idx === 0 ? '#ffb74d' : '#ffd54f'); for (let k = 0; k < 8; k++) g.r(10 + Math.cos(k * 0.785) * 9 - 1, 10 + Math.sin(k * 0.785) * 9 - 1, 2, 2, '#ffd54f'); }
    else if (idx === 3) { g.circ(10, 13, 6, '#ff7043'); g.r(0, 14, 20, 6, '#5c4a6e'); }
    else { g.circ(10, 10, 7, '#e3f2fd'); g.circ(13, 8, 6, idx === 5 ? '#14163a' : '#2b2f63'); g.p(4, 3, '#fff'); g.p(16, 16, '#fff'); }
    c.className = 'pix tod-ic'; return c;
  }
  function readyUnits(s, fac) { return E.living(s).filter(u => u.fac === fac && !u.fresh && (u.mp > 0 || !u.attacked)); }
  function refresh() {
    const s = UI.s; if (!s || UI.screen !== 'battle') return;
    const fac = E.curFac(s), f = s.factions[fac], F = VV.FACTIONS[f.id], tod = E.tod(s), T = VV.TOD[tod];
    const me = s.factions.findIndex(x => x.ctrl === 'human'), view = isHumanTurn() ? fac : (me >= 0 ? me : fac);
    const fv = s.factions[view], incV = E.income(s, view), up = E.upcomingEvent(s);
    const law = T.law === 1 ? 'diurnos +25 %' : T.law === -1 ? 'nocturnos +25 %' : 'sin bonificación';
    const top = $('#topbar'); top.innerHTML = '';
    app(top,
      h('div', { class: 'tb-round' }, h('strong', {}, 'Ronda ' + s.round), s.roundLimit < 999 ? h('span', { class: 'muted' }, ' de ' + s.roundLimit) : null),
      h('div', { class: 'tb-tod', title: 'Diurnas: +25 % de día y −25 % de noche. Nocturnas: al revés.' }, todIcon(tod), h('span', {}, T.n), h('span', { class: 'muted small' }, ' · ' + law)),
      h('div', { class: 'tb-fac', style: `--fc:${F.col}` }, h('span', { class: 'dot' }), f.ctrl === 'human' ? (s.factions.filter(x => x.ctrl === 'human').length > 1 ? 'Turno de ' + F.n : 'Tu turno') : 'Turno de ' + F.n),
      h('div', { class: 'tb-gold', title: `Base ${incV.base} + propiedades ${incV.props} + bonificación ${incV.bonus} − mantenimiento ${incV.upkeep} = ${incV.total} por ronda` },
        h('span', { class: 'coin' }), `${fv.gold}`, h('span', { class: 'muted' }, ` ${incV.total >= 0 ? '+' : ''}${incV.total}/ronda`)),
      h('div', { class: 'tb-props', title: 'Propiedades controladas por cada bando' }, s.factions.map((x, i) => h('span', { class: 'pp', style: `--fc:${VV.FACTIONS[x.id].col}` }, s.props.filter(p => p.owner === i).length)), h('span', { class: 'muted' }, ' de ' + s.props.length)),
      up ? h('div', { class: 'tb-event', title: up.ids.map(id => VV.EVENTS[id].d).join(' ') }, (up.round === s.round ? 'Ahora: ' : `Ronda ${up.round}: `) + up.ids.map(id => VV.EVENTS[id].n).join(' y ')) : null,
      s.mode === 'domination' ? h('div', { class: 'tb-dom', title: 'Gana quien controle 4 propiedades durante dos rondas completas seguidas.' }, 'Dominio ', s.factions.map((x, i) => h('span', { class: 'pp', style: `--fc:${VV.FACTIONS[x.id].col}` }, (s.dom[i] || 0) + '/2'))) : null,
      h('div', { class: 'tb-btns' },
        h('button', { class: 'icon', onclick: () => autosave(true) }, 'Guardar'),
        h('button', { class: 'icon', onclick: () => helpModal() }, 'Ayuda'),
        h('button', { class: 'icon', onclick: () => settingsModal() }, 'Ajustes'),
        h('button', { class: 'icon', onclick: async () => { if (await confirmBox('Volver al menú', 'La partida se guarda automáticamente al inicio de cada turno tuyo.', 'Salir', 'Cancelar')) { UI.s = null; UI.show('menu'); } } }, 'Menú')));
    // objetivo
    const enemyF = s.factions.findIndex((x, i) => i !== view && x.alive), EL = enemyF >= 0 ? E.byId(s, s.factions[enemyF].leaderId) : null;
    const goal = $('#goal'); goal.innerHTML = '';
    app(goal, h('span', { class: 'gl' }, 'Objetivo'), s.mode === 'domination' ? 'Controla 4 propiedades durante 2 rondas, o derrota a ' + (EL ? E.unitName(EL) : 'su comandante') : 'Derrota a ' + (EL ? E.unitName(EL) : 'su comandante') + ', comandante de ' + (enemyF >= 0 ? s.factions[enemyF].name : ''));
    goal.onclick = () => { if (EL) R.centerOn(EL.x, EL.y, true); };
    renderRoster(view); renderContext(); renderActs(); renderSide();
    R.drawMini($('#mini'));
  }
  function stateOf(u) {
    if (u.fresh) return ['Llega en tu próximo turno', 'new'];
    if (!u.attacked && u.mp > 0) return ['Lista', 'ready'];
    if (!u.attacked) return ['Puede atacar', 'part'];
    if (u.mp > 0) return ['Puede moverse', 'part'];
    return ['Ha actuado', 'done'];
  }
  function renderRoster(view) {
    const s = UI.s, el = $('#roster'); el.innerHTML = '';
    const mine = E.living(s).filter(u => u.fac === view).sort((a, b) => (b.leader - a.leader) || (!!a.summon - !!b.summon) || a.id - b.id);
    const human = isHumanTurn() && view === E.curFac(s);
    mine.forEach(u => {
      const [lab, cls] = human ? stateOf(u) : ['', ''];
      const b = h('button', { class: 'ru ' + cls + (R.selId === u.id ? ' on' : ''), title: E.unitName(u) + (lab ? ': ' + lab : ''), onclick: () => { R.centerOn(u.x, u.y, true); select(u); } },
        portrait(u.def, u.lvl, u.vet, 44),
        h('span', { class: 'rn' }, E.unitName(u).split(/[ ,]/)[0] === 'Los' ? 'Dantart' : E.unitName(u).split(',')[0]),
        h('span', { class: 'rhp' }, h('i', { style: `width:${Math.round(u.hp / E.maxHp(u) * 100)}%` })),
        u.leader ? h('span', { class: 'crown', title: 'Comandante' }) : null,
        human ? h('span', { class: 'rs' }, lab) : null);
      el.appendChild(b);
    });
    if (!mine.length) el.appendChild(h('p', { class: 'muted' }, 'Sin unidades.'));
  }
  function ctxText() {
    const s = UI.s, fac = E.curFac(s), F = VV.FACTIONS[s.factions[fac].id];
    if (!isHumanTurn()) return [`${F.n} está moviendo sus tropas.`, 'Puedes acelerar la IA o revisar cualquier unidad haciendo clic sobre ella.'];
    if (UI.mode === 'recruit') return ['Elige dónde aparece', 'Haz clic en una casilla azul de la fortaleza. Esc para cancelar.'];
    const sel = R.selId != null ? E.byId(s, R.selId) : null;
    if (UI.mode === 'ability' && sel) { const A = VV.ABIL[UI.abil], T = E.abilityTargets(s, sel, UI.abil); return [A.n, (T.mode === 'leap' ? (UI.leapDest == null ? 'Elige la casilla de destino (dorada).' : 'Elige a quién golpear tras el salto.') : T.mode === 'multi' ? `Elige hasta ${T.need} objetivos dorados y pulsa Confirmar.` : 'Elige un objetivo dorado.') + ' Esc para cancelar.']; }
    if (sel && sel.fac === fac) {
      const n = E.unitName(sel);
      if (sel.fresh) return [n, 'Acaba de llegar: podrá actuar en tu próximo turno.'];
      const adj = E.neighborsIdx(s, E.uIdx(s, sel)).some(i => { const x = E.unitAtIdx(s, i); return x && x.fac !== fac; });
      if (!sel.attacked && sel.mp > 0) return [n, `1. Muévete a una casilla iluminada (te quedan ${sel.mp} de movimiento). 2. Haz clic en un enemigo con marco rojo para atacar. También puedes usar una habilidad.`];
      if (!sel.attacked) return [n, adj ? 'Ya no puede moverse, pero puede atacar a un enemigo adyacente o usar una habilidad.' : 'No tiene enemigos al lado. Usa una habilidad o pasa a otra unidad.'];
      if (sel.mp > 0) return [n, `Ya ha atacado, pero aún puede moverse ${sel.mp}.`];
      return [n, 'Ya ha actuado este turno. Elige otra unidad en la barra de tu ejército.'];
    }
    if (sel) return [E.unitName(sel) + ' (rival)', 'El rojo muestra hasta dónde puede llegar a golpear en su turno.'];
    const ready = readyUnits(s, fac).length, spots = E.recruitSpots(s, fac).length, canRec = E.recruitList(s, fac).some(x => x.avail && x.cost <= s.factions[fac].gold);
    if (ready) return ['Tu turno', `Te ${ready === 1 ? 'queda 1 unidad' : 'quedan ' + ready + ' unidades'} por actuar. Elige una en el mapa o en la barra de tu ejército.` + (spots && canRec ? ' Tu comandante está en la fortaleza: puedes reclutar personajes.' : '')];
    return ['Tu turno', 'Todas tus unidades han actuado. Pulsa «Fin de turno».'];
  }
  function renderContext() {
    const s = UI.s; if (!s) return;
    const el = $('#context'); el.innerHTML = '';
    const [t, d] = ctxText();
    app(el, h('div', { class: 'ctx-t' }, t), h('p', { class: 'ctx-d' }, d));
    const sel = R.selId != null ? E.byId(s, R.selId) : null, fac = E.curFac(s);
    if (sel && isHumanTurn() && sel.fac === fac) {
      const bar = h('div', { class: 'abilbar' });
      E.abilities(sel).forEach(id => {
        const A = VV.ABIL[id]; if (A.kind === 'passive') return;
        const st = E.abilityState(s, sel, id), on = UI.abil === id && UI.mode === 'ability';
        bar.appendChild(h('button', { class: 'abil' + (A.ult ? ' ult' : '') + (on ? ' on' : ''), disabled: !st.ok && !on, title: A.d, onclick: () => on ? deselectAbility(sel) : startAbility(sel, id) },
          h('span', { class: 'an' }, A.n), h('span', { class: 'as' }, on ? 'Cancelar' : st.ok ? 'Usar' : st.why)));
      });
      if (UI.mode === 'ability' && E.abilityTargets(s, sel, UI.abil).mode === 'multi') bar.appendChild(h('button', { class: 'btn', disabled: !UI.picked.length, onclick: confirmMulti }, `Confirmar (${UI.picked.length})`));
      if (bar.children.length) el.appendChild(bar);
    }
  }
  function renderActs() {
    const s = UI.s, el = $('#acts'); el.innerHTML = '';
    if (isHumanTurn()) {
      const ready = readyUnits(s, E.curFac(s)).length;
      app(el, h('button', { class: 'btn', disabled: UI.busy, onclick: openRecruit, title: 'Atajo: R' }, 'Reclutar'),
        h('button', { class: 'btn end' + (ready ? '' : ' pulse'), disabled: UI.busy, onclick: humanEndTurn, title: 'Atajo: Espacio' }, 'Fin de turno', h('small', {}, ready ? `${ready} por actuar` : 'todo listo')));
    } else app(el, h('div', { class: 'ai-busy' }, h('span', { class: 'spin' }), 'Turno rival'), h('button', { class: 'btn ghost', onclick: () => { UI.fast = true; R.speed = 0.12; } }, 'Acelerar'));
  }
  function renderUnitPanel() { renderSide(); }
  function renderSide() {
    const s = UI.s; if (!s) return;
    const tabs = $('#tabs'); tabs.innerHTML = '';
    [['info', 'Ficha'], ['abil', 'Habilidades'], ['evo', 'Evolución'], ['log', 'Crónica']].forEach(([k, l]) => tabs.appendChild(h('button', { role: 'tab', class: UI.tab === k ? 'on' : '', 'aria-selected': UI.tab === k, onclick: () => { UI.tab = k; renderSide(); } }, l)));
    const sel = R.selId != null ? E.byId(s, R.selId) : null, u = sel || (UI.hoverId != null ? E.byId(s, UI.hoverId) : null);
    const P = $('#tabbody'); P.innerHTML = '';
    if (UI.tab === 'log') { const L = h('div', { class: 'loglist' }); (UI.logs || []).forEach(x => L.appendChild(h('p', { class: x.cls }, x.text))); P.appendChild(L); setTimeout(() => (P.scrollTop = P.scrollHeight), 0); return; }
    if (!u) {
      const fac = isHumanTurn() ? E.curFac(s) : Math.max(0, s.factions.findIndex(x => x.ctrl === 'human')), F = VV.FACTIONS[s.factions[fac].id];
      app(P, h('div', { class: 'empty' }, h('h3', {}, F.n), h('p', {}, F.lore), h('p', { class: 'muted' }, F.bonus),
        h('p', { class: 'muted' }, 'Haz clic en cualquier personaje, tuyo o rival, para ver aquí su ficha, sus habilidades y su árbol de evolución.')));
      return;
    }
    const d = E.def(u), F = facOf(s, u.fac);
    app(P, h('div', { class: 'up-head', style: `--fc:${F.col}` }, portrait(u.def, u.lvl, u.vet, 88),
      h('div', {}, h('h3', {}, E.unitName(u) + (u.vet ? ' ' + '★'.repeat(u.vet) : '')), h('div', { class: 'muted' }, `${F.n}, ${d.cls.toLowerCase()}`),
        h('div', {}, d.kind === 'summon' ? 'Invocación' : `Nivel ${u.lvl + 1} de ${d.levels.length}`, u.leader ? h('span', { class: 'tag' }, 'Comandante') : null))));
    if (UI.tab === 'info') tabInfo(P, u); else if (UI.tab === 'abil') tabAbil(P, u); else tabEvo(P, u);
  }
  function tabInfo(P, u) {
    const s = UI.s, d = E.def(u), t = s.tiles[E.uIdx(s, u)], nx = E.xpNext(u), res = E.resist(u);
    app(P, bar('PV', u.hp, E.maxHp(u), '#5ccf5c'),
      nx ? bar(E.isMaxLevel(u) ? 'XP veterano' : 'XP', u.xp, nx, '#b388ff') : h('div', { class: 'muted small' }, d.kind === 'summon' ? `Desaparece en ${Math.max(0, Math.ceil((u.summon.until - s.turnIndex) / s.order.length))} ronda(s).` : 'Experiencia al máximo.'),
      h('div', { class: 'stats' },
        h('span', {}, h('b', {}, 'MOV '), `${u.fac === E.curFac(s) ? u.mp : E.maxMov(u)}/${E.maxMov(u)}`),
        h('span', {}, h('b', {}, VV.ARCH[d.arch].n)), h('span', {}, h('b', {}, VV.ALIGN[d.align])), d.defBonus ? h('span', { title: 'Se suma a la defensa del terreno en cualquier casilla.' }, h('b', {}, 'Esquiva propia '), (d.defBonus > 0 ? '+' : '') + d.defBonus + ' %') : null,
        h('span', { title: 'Probabilidad de esquivar cada golpe en esta casilla.' }, h('b', {}, 'Defensa '), `${E.defense(s, u)} % (${VV.TERRAIN[t.t].n.toLowerCase()})`)),
      u.st.length ? h('div', { class: 'chips' }, u.st.map(x => h('span', { class: 'chip', style: `--sc:${VV.STATUS[x.id].col}`, title: VV.STATUS[x.id].d }, VV.STATUS[x.id].n + (x.id === 'evasivo' ? ' +' + x.val : '')))) : null,
      u.armed ? h('div', { class: 'armed' }, 'Preparada: ' + VV.ABIL[u.armed.src].n) : null,
      h('h4', {}, 'Ataques'),
      h('ul', { class: 'weap' }, E.weapons(u).map(w => h('li', {}, h('strong', {}, w.n), h('span', {}, `${w.d}×${w.s}`), h('span', { class: 'muted' }, `${VV.DMG[w.t]}, ${w.r === 'm' ? 'cuerpo a cuerpo' : 'a distancia'}${w.sp ? ', ' + VV.WSPECIAL[w.sp].n.toLowerCase() : ''}`)))),
      h('h4', {}, 'Resistencias'),
      h('div', { class: 'res' }, VV.DMG_ORDER.map(k => h('span', { class: res[k] > 0 ? 'pos' : res[k] < 0 ? 'neg' : '' }, VV.DMG[k] + ' ' + (res[k] > 0 ? '+' : '') + res[k] + ' %'))),
      h('p', { class: 'desc' }, '«' + d.desc + '»'));
  }
  function tabAbil(P, u) {
    const s = UI.s, d = E.def(u), own = isHumanTurn() && u.fac === E.curFac(s), current = E.abilities(u);
    let any = false;
    d.levels.forEach((L, i) => {
      if (!(L.ab || []).length) return; any = true;
      const sec = h('div', { class: 'ab-lvl' + (i > u.lvl ? ' locked' : '') }, h('div', { class: 'ab-lh' }, `Nivel ${i + 1}: ${L.name}`, i > u.lvl ? h('span', { class: 'lock' }, 'Bloqueada') : null));
      L.ab.forEach(id => {
        const A = VV.ABIL[id], have = current.includes(id), replaced = i <= u.lvl && !have;
        let status = '';
        if (i > u.lvl) status = 'Se desbloquea al evolucionar a ' + L.name;
        else if (replaced) status = 'Sustituida por una versión mejorada';
        else if (A.kind === 'passive') status = 'Pasiva: siempre activa';
        else { const st = E.abilityState(s, u, id); status = st.ok ? (A.once ? 'Disponible (una vez por batalla)' : `Disponible (recarga ${A.cd} turnos)`) : st.why; }
        const btn = own && have && A.kind !== 'passive' && E.abilityState(s, u, id).ok ? h('button', { class: 'btn small', onclick: () => startAbility(u, id) }, 'Usar') : null;
        sec.appendChild(h('div', { class: 'ab-item' + (A.ult ? ' ult' : '') }, h('div', { class: 'ab-top' }, h('strong', {}, A.n), btn), h('p', {}, A.d), h('span', { class: 'ab-st' }, status)));
      });
      P.appendChild(sec);
    });
    if (!any) P.appendChild(h('p', { class: 'muted' }, 'Este personaje no tiene habilidades especiales.'));
  }
  function tabEvo(P, u) {
    const d = E.def(u), nx = E.xpNext(u);
    d.levels.forEach((L, i) => {
      const st = i < u.lvl ? 'Superado' : i === u.lvl ? 'Nivel actual' : 'Por desbloquear';
      const prev = d.levels[i - 1];
      const news = (L.ab || []).map(a => VV.ABIL[a].n);
      app(P, h('div', { class: 'evo-card ' + (i < u.lvl ? 'past' : i === u.lvl ? 'cur' : 'next') },
        spriteCanvas(u.def, i, 1),
        h('div', { class: 'evo-i' }, h('div', { class: 'evo-h' }, h('strong', {}, L.name), h('span', { class: 'evo-st' }, st)),
          h('div', { class: 'small' }, `${L.hp + (u.leader ? 10 : 0)} PV, ${L.mov} MOV` + (prev ? ` (antes ${prev.hp + (u.leader ? 10 : 0)} PV)` : '')),
          h('div', { class: 'small muted' }, L.w.map(w => `${w.n} ${w.d}×${w.s}`).join(', ')),
          news.length ? h('div', { class: 'small' }, 'Nuevo: ' + news.join(', ')) : null,
          i === u.lvl && nx ? bar(E.isMaxLevel(u) ? 'Veterano' : 'Hacia el siguiente', u.xp, nx, '#b388ff') : null,
          i === u.lvl + 1 ? h('div', { class: 'small muted' }, `Necesita ${E.lvlDef(u).xp} XP. Se gana atacando (1 por golpe), sobreviviendo (2) y derrotando enemigos (8 por nivel).`) : null)));
    });
    if (E.isMaxLevel(u) && d.kind !== 'summon') P.appendChild(h('p', { class: 'small muted' }, `En nivel máximo puede ganar hasta tres mejoras veteranas (+3 PV cada una). Lleva ${u.vet || 0}.`));
  }
  function bar(label, v, max, col) {
    return h('div', { class: 'bar' }, h('span', { class: 'bl' }, label), h('span', { class: 'bt' }, h('i', { style: `width:${Math.max(0, Math.min(100, v / max * 100))}%;background:${col}` })), h('span', { class: 'bv' }, `${v}/${max}`));
  }
  function nextUnit() {
    const s = UI.s; if (!isHumanTurn()) return;
    const mine = E.living(s).filter(u => u.fac === E.curFac(s) && !u.fresh && (u.mp > 0 || !u.attacked));
    if (!mine.length) { toast('Todas tus unidades han actuado.'); return; }
    const k = (mine.findIndex(u => u.id === R.selId) + 1) % mine.length;
    const u = mine[k]; R.centerOn(u.x, u.y, true); select(u);
  }

  /* ---------------- Entrada en el mapa ---------------- */
  function bindMap() {
    const cv = $('#map'); let down = null, drag = false;
    const pos = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    cv.addEventListener('pointerdown', e => { if (e.button === 2) return; cv.setPointerCapture(e.pointerId); down = { p: pos(e), cam: { x: R.cam.x, y: R.cam.y } }; drag = false; AU.init(); });
    cv.addEventListener('pointermove', e => {
      const [x, y] = pos(e);
      if (down) {
        const dx = x - down.p[0], dy = y - down.p[1];
        if (drag || Math.hypot(dx, dy) > 7) { drag = true; R.cam.x = down.cam.x - dx / R.cam.z; R.cam.y = down.cam.y - dy / R.cam.z; R.clampCam(); hideTip(); return; }
      }
      onHover(R.screenToIdx(x, y), e);
    });
    cv.addEventListener('pointerup', e => { if (!down) return; const wasDrag = drag; down = null; drag = false; if (!wasDrag) { const [x, y] = pos(e); const i = R.screenToIdx(x, y); if (i >= 0) onTileClick(i); } });
    cv.addEventListener('pointerleave', () => { R.hover = -1; R.hl.hoverThreat = null; hideTip(); });
    cv.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = pos(e); R.zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, x, y); }, { passive: false });
    cv.addEventListener('contextmenu', e => { e.preventDefault(); cancel(); });
    $('#zoom-in').onclick = () => R.zoomAt(1.2, R.vw / 2, R.vh / 2);
    $('#zoom-out').onclick = () => R.zoomAt(1 / 1.2, R.vw / 2, R.vh / 2);
    const mini = $('#mini');
    mini.addEventListener('pointerdown', e => { const b = mini.getBoundingClientRect(), k = R.mini.k * (mini.width / b.width); const wx = (e.clientX - b.left) * (mini.width / b.width) / R.mini.k, wy = (e.clientY - b.top) * (mini.height / b.height) / R.mini.k; R.cam.x = wx - R.vw / R.cam.z / 2; R.cam.y = wy - R.vh / R.cam.z / 2; R.clampCam(); void k; });
    setInterval(() => { if (UI.screen === 'battle' && UI.s) R.drawMini(mini); }, 250);
  }
  function cancel() { if (UI.mode === 'ability' && R.selId != null) { const u = E.byId(UI.s, R.selId); if (u) return deselectAbility(u); } deselect(); }
  function hideTip() { $('#tip').classList.remove('on'); }
  function onHover(i, e) {
    const s = UI.s; if (!s) return;
    R.hover = i;
    if (i < 0) { hideTip(); return; }
    const t = s.tiles[i], T = VV.TERRAIN[t.t], u = E.unitAtIdx(s, i), sel = R.selId != null ? E.byId(s, R.selId) : null;
    // ruta prevista
    if (sel && UI.reach && UI.mode === 'idle' && isHumanTurn()) {
      let dest = null;
      if (UI.reach.has(i) && !u) dest = i;
      else if (u && u.fac !== sel.fac && !sel.attacked) dest = bestApproach(sel, u);
      if (dest != null && dest !== E.uIdx(s, sel)) { const p = E.pathTo(UI.reach, dest); R.hl.path = p; R.hl.pathCost = UI.reach.get(dest).cost; } else R.hl.path = null;
    }
    const prev = UI.hoverId; UI.hoverId = u ? u.id : null;
    if (prev !== UI.hoverId) {
      const selU = R.selId != null ? E.byId(s, R.selId) : null;
      if (u && u.fac !== E.curFac(s) && (!selU || selU.fac === E.curFac(s))) R.hl.hoverThreat = threatOf(u); else R.hl.hoverThreat = null;
      if (R.selId == null) renderSide();
    }
    const lines = [h('strong', {}, T.n)];
    if (T.cost < 99) {
      const ref = sel || u;
      if (ref) lines.push(h('div', {}, `Defensa de ${E.unitName(ref)}: ${E.defense(s, ref, i)} %, coste ${E.moveCost(s, ref, i)}`));
      else lines.push(h('div', {}, `Defensa ${T.def} %, coste ${T.cost}`));
    } else lines.push(h('div', { class: 'muted' }, 'Intransitable'));
    if (t.prop >= 0) { const p = s.props[t.prop]; lines.push(h('div', { class: 'tp-prop' }, p.name), h('div', { class: 'muted' }, VV.PROPKINDS[p.kind].d + ' Propietario: ' + (p.owner >= 0 ? s.factions[p.owner].name : 'nadie') + '.')); }
    if (s.obstacles[i]) { const o = s.obstacles[i]; lines.push(h('div', {}, (o.kind === 'tables' ? 'Mesas del prao' : 'Barricada decorativa') + ` (${o.hp}/${o.max} PV). Se rompen golpeándolas.`)); }
    const ov = s.overlays[i]; if (ov && ov.puddle) lines.push(h('div', {}, 'Charco del orbayu: +1 de coste.')); if (ov && ov.sticky) lines.push(h('div', {}, 'Casilla pringosa: +1 de coste y aplica Pringado.'));
    if (u) lines.push(h('div', { class: 'tp-unit' }, `${E.unitName(u)}: ${u.hp}/${E.maxHp(u)} PV`));
    const tip = $('#tip'); tip.innerHTML = ''; lines.forEach(l => tip.appendChild(l));
    const b = $('#mapwrap').getBoundingClientRect();
    let x = e.clientX - b.left + 16, y = e.clientY - b.top + 16; if (x > b.width - 240) x -= 260; if (y > b.height - 140) y -= 150;
    tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('on');
  }
  function bindKeys() {
    G.addEventListener('keydown', e => {
      if (!$('#modal').classList.contains('hidden')) { if (e.key === 'Escape') closeModal(null); return; }
      if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key.toLowerCase() === 'm') { const m = AU.toggleMute(); toast(m ? 'Sonido desactivado' : 'Sonido activado'); return; }
      if (UI.screen !== 'battle') return;
      const k = e.key.toLowerCase();
      if (e.key === ' ') { e.preventDefault(); humanEndTurn(); }
      else if (e.key === 'Escape') cancel();
      else if (k === 'h') { R.grid = !R.grid; UI.set.grid = R.grid; saveSettings(); }
      else if (k === 'r') openRecruit();
      else if (k === 'n') nextUnit();
      else if (k === 'z') { R.zocOn = !R.zocOn; toast(R.zocOn ? 'Zonas de control visibles al seleccionar' : 'Zonas de control ocultas'); }
      else if (e.key === '+' || e.key === '=') R.zoomAt(1.15, R.vw / 2, R.vh / 2);
      else if (e.key === '-') R.zoomAt(1 / 1.15, R.vw / 2, R.vh / 2);
      else if (e.key.startsWith('Arrow')) { const d = 60 / R.cam.z; if (e.key === 'ArrowLeft') R.cam.x -= d; if (e.key === 'ArrowRight') R.cam.x += d; if (e.key === 'ArrowUp') R.cam.y -= d; if (e.key === 'ArrowDown') R.cam.y += d; R.clampCam(); }
    });
  }

  /* ---------------- Guardado ---------------- */
  function autosave(manual) {
    const s = UI.s; if (!s) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, date: Date.now(), cfg: UI.cfg, state: s })); if (manual) toast('Partida guardada.'); }
    catch (e) { if (manual) toast('No se pudo guardar: el navegador no permite almacenamiento local.'); }
  }
  function loadSave() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      const s = E.deserialize(JSON.stringify(d.state));
      UI.startGame(s, d.cfg);
    } catch (e) { toast('No hay una partida guardada válida.'); }
  }

  /* ---------------- Fin de partida ---------------- */
  async function endGame() {
    const s = UI.s; if (!s || UI.ended === s) return; UI.ended = s;
    const w = s.winner, F = facOf(s, w), human = s.factions[w].ctrl === 'human';
    const solo = s.factions.filter(x => x.ctrl === 'human').length === 1;
    AU.sfx(!solo || human ? 'victory' : 'defeat');
    const scores = s.factions.map((f, i) => Object.assign({ name: f.name }, E.score(s, i)));
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignorado */ }
    const card = h('div', { class: 'endcard', style: `--fc:${F.col}` },
      h('h2', {}, solo ? (human ? '¡Victoria!' : 'Derrota') : 'Victoria de ' + F.n),
      h('p', {}, `${F.n} se hace con el control tras ${s.round} rondas.`),
      h('table', { class: 'scores' }, h('tr', {}, h('th', {}, 'Facción'), h('th', {}, 'Propiedades'), h('th', {}, 'Unidades'), h('th', {}, 'Niveles'), h('th', {}, 'Oro'), h('th', {}, 'Puntos')),
        scores.map(x => h('tr', {}, h('td', {}, x.name), h('td', {}, x.props), h('td', {}, x.units), h('td', {}, x.levels), h('td', {}, x.gold), h('td', {}, x.total)))),
      h('p', { class: 'muted small' }, 'Puntuación: ' + E.SCORE_FORMULA + '.'),
      h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: () => { closeModal(); UI.s = null; UI.show('menu'); } }, 'Menú principal'),
        h('button', { class: 'btn', 'data-autofocus': 1, onclick: () => { closeModal(); const c = Object.assign({}, UI.cfg, { seed: (Date.now() >>> 0) }); UI.startGame(E.newGame(c), c); } }, 'Revancha')));
    await sleep(600);
    openModal(card, 'wide');
  }

  /* ---------------- Ayuda y ajustes ---------------- */
  function helpContent() {
    const S = 22, SQ = Math.sqrt(3) * S;
    const cv = (w, hh) => { const c = ART.mk(w * 2, hh * 2); c.style.width = w + 'px'; c.style.height = hh + 'px'; c.className = 'pix help-ill'; const x = c.getContext('2d'); x.scale(2, 2); x.imageSmoothingEnabled = false; return [c, x]; };
    const hex = (x, cx, cy, fill, stroke, lw) => { ART.hexPath(x, cx, cy, S - 1); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw || 1.5; x.stroke(); } };
    const hc = (c, r, ox, oy) => [ox + S + c * 1.5 * S, oy + SQ / 2 + r * SQ + (c & 1) * SQ / 2];
    const spr = (x, def, lvl, cx, cy, sc, flip, frame) => { const s = ART.sprite(def, lvl, frame || 'idle0'); x.save(); if (flip) { x.translate(cx, 0); x.scale(-1, 1); x.translate(-cx, 0); } x.drawImage(s, cx - 32 * sc, cy - 72 * sc, 64 * sc, 76 * sc); x.restore(); };
    const label = (x, t, px, py, col, size, bg) => { x.font = `bold ${size || 11}px "Pixelify Sans", monospace`; x.textAlign = 'center'; if (bg) { const w = x.measureText(t).width + 8; x.fillStyle = bg; x.fillRect(px - w / 2, py - (size || 11), w, (size || 11) + 5); } x.lineWidth = 3; x.strokeStyle = '#1c1424'; x.strokeText(t, px, py); x.fillStyle = col || '#fff'; x.fillText(t, px, py); };
    const field = (x, cols, rows, ox, oy, terr) => { for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const [px, py] = hc(c, r, ox, oy); hex(x, px, py, ART.BASE[(terr && terr(c, r)) || 'grass'], 'rgba(0,0,0,0.25)', 1); } };
    const ills = {
      move() { const [c, x] = cv(230, 150); field(x, 7, 3, 4, 4, (cc, r) => (cc === 4 && r === 0) || (cc === 5 && r === 1) ? 'park' : 'grass');
        [[1, 1], [2, 0], [2, 1], [3, 1], [3, 2], [1, 0], [1, 2], [2, 2], [0, 1]].forEach(([cc, r]) => { const [px, py] = hc(cc, r, 4, 4); hex(x, px, py, 'rgba(255,250,225,0.45)', 'rgba(255,250,225,0.9)', 1); });
        x.fillStyle = '#fff3c4'; [[2, 1], [3, 1]].forEach(([cc, r]) => { const [px, py] = hc(cc, r, 4, 4); x.fillRect(px - 3, py - 3, 6, 6); });
        const [ux, uy] = hc(1, 1, 4, 4); hex(x, ux, uy, null, '#ffd65a', 2.5); spr(x, 'ramon', 0, ux, uy + 16, 0.95);
        label(x, '2', ...hc(3, 1, 4, 4).map((v, i) => v + (i ? 16 : 0)), '#fff3c4', 13); return c; },
      attack() { const [c, x] = cv(230, 150); field(x, 5, 3, 30, 4);
        const [a1, a2] = hc(1, 1, 30, 4), [b1, b2] = hc(2, 1, 30, 4); hex(x, b1, b2, 'rgba(255,75,58,0.22)', '#ff4b3a', 2.5); hex(x, a1, a2, null, '#ffd65a', 2.5);
        spr(x, 'pilar', 1, a1, a2 + 16, 0.95, false, 'atk'); spr(x, 'pedro', 0, b1, b2 + 16, 0.95, true);
        x.save(); x.translate(a1 + 22, a2 - 14); ART.hamster(ART.P(x), -2, -2, 'goggles'); x.restore();
        label(x, '70 %', b1, b2 - 34, '#fff3c4', 12, 'rgba(28,20,36,0.85)'); label(x, '−9', b1 + 24, b2 - 10, '#ff6b5a', 14); return c; },
      terrain() { const [c, x] = cv(230, 110); [['street', '30 %'], ['park', '50 %'], ['plaza', '20 %'], ['castle', '60 %']].forEach(([t, p], i) => { const px = 30 + i * 56, py = 46; hex(x, px, py, ART.BASE[t], '#1c1424', 1.5); if (t === 'park') { x.fillStyle = '#2f6a2a'; x.beginPath(); x.arc(px, py - 6, 11, 0, 7); x.fill(); x.fillStyle = '#5d3a1a'; x.fillRect(px - 2, py + 3, 4, 7); } label(x, p, px, py + 38, '#fff3c4', 12); label(x, VV.TERRAIN[t].n.split(' ')[0], px, py + 4, '#fff', 10); }); return c; },
      flags() { const [c, x] = cv(230, 120); x.fillStyle = '#4f8a38'; x.fillRect(0, 70, 230, 50);
        const v = ART.villageSpr('caseria', 1); x.drawImage(v, 6, 22, 64, 60); x.drawImage(v, 140, 22, 64, 60);
        const flag = (px, col, acc, q) => { x.fillStyle = '#1a120c'; x.fillRect(px, 6, 3, 40); x.fillStyle = col; x.fillRect(px + 3, 6, 22, 14); x.strokeStyle = '#1a120c'; x.lineWidth = 1.5; x.strokeRect(px + 3, 6, 22, 14); x.fillStyle = acc; x.fillRect(px + 9, 11, 10, 3); x.fillRect(px + 12, 8, 3, 9); if (q) label(x, '?', px + 14, 18, '#6d675e', 10); };
        flag(56, '#e8e2d2', '#9a948a', true); flag(190, VV.FACTIONS.ast.col, VV.FACTIONS.ast.accent);
        x.fillStyle = '#fff3c4'; x.font = 'bold 22px monospace'; x.textAlign = 'center'; x.fillText('→', 108, 58);
        label(x, '+8 PV', 172, 104, '#7ee787', 12); label(x, '+oro', 172, 117, '#ffd54f', 11); label(x, 'neutral', 40, 110, '#e8e2d2', 10); return c; },
      recruit() { const [c, x] = cv(230, 140); field(x, 6, 3, 10, 4, (cc, r) => (cc <= 2 ? 'castle' : 'grass'));
        const [kx, ky] = hc(1, 1, 10, 4); hex(x, kx, ky, ART.BASE.keep, '#ffd65a', 2);
        [[0, 0], [0, 1], [2, 0], [2, 1], [1, 2]].forEach(([cc, r]) => { const [px, py] = hc(cc, r, 10, 4); hex(x, px, py, 'rgba(90,220,255,0.35)', '#5ad8ff', 1.5); });
        spr(x, 'carlota', 0, kx, ky + 16, 0.9); const [px, py] = hc(2, 1, 10, 4); x.globalAlpha = 0.85; spr(x, 'pooh', 0, px, py + 16, 0.95); x.globalAlpha = 1;
        ['ramon', 'pilar', 'teresa'].forEach((id, i) => x.drawImage(ART.portrait(id, 0, 0, 30), 150 + i * 0, 10 + i * 36, 30, 30));
        label(x, 'R', 200, 62, '#fff3c4', 16, 'rgba(28,20,36,0.85)'); return c; },
      tod() { const [c, x] = cv(230, 90); VV.TOD.forEach((T, i) => { const px = 20 + i * 38, py = 36; const day = T.law >= 0 && i !== 3; x.fillStyle = i === 3 ? '#ff7043' : day ? '#ffd54f' : '#e3f2fd'; x.beginPath(); x.arc(px, py, 10, 0, 7); x.fill(); if (!day && i !== 3) { x.fillStyle = '#2b2f63'; x.beginPath(); x.arc(px + 4, py - 3, 9, 0, 7); x.fill(); } label(x, ['Alba', 'Día', 'Tarde', 'Ocaso', 'Noche', 'Oscura'][i], px, py + 26, '#fff', 9); label(x, T.law === 1 ? '☼+' : T.law === -1 ? '☾+' : '=', px, py + 40, T.law === 1 ? '#ffd54f' : T.law === -1 ? '#b3c7ff' : '#bbb', 10); }); return c; },
      evo() { const [c, x] = cv(230, 140); x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(0, 108, 230, 4);
        [0, 1, 2].forEach(i => { spr(x, 'pooh', i, 34 + i * 76, 112, 0.95); if (i < 2) label(x, '›', 72 + i * 76, 80, '#fff3c4', 18); });
        x.fillStyle = '#1c1424'; x.fillRect(20, 124, 190, 8); x.fillStyle = '#b388ff'; x.fillRect(21, 125, 130, 6); label(x, 'XP', 12, 132, '#c9a7ff', 9); return c; },
      zoc() { const [c, x] = cv(230, 140); field(x, 6, 3, 10, 4);
        const [ex, ey] = hc(3, 1, 10, 4); E.Hex.neighbors(3, 1).forEach(([cc, r]) => { if (cc < 0 || r < 0 || r > 2) return; const [px, py] = hc(cc, r, 10, 4); hex(x, px, py, 'rgba(220,50,40,0.3)', 'rgba(220,50,40,0.7)', 1); });
        spr(x, 'santiago', 0, ex, ey + 16, 0.9, true); const [ux, uy] = hc(1, 1, 10, 4); spr(x, 'teresa', 0, ux, uy + 16, 0.9);
        const [sx, sy] = hc(2, 1, 10, 4); label(x, 'ALTO', sx, sy + 4, '#ff8a80', 11, 'rgba(28,20,36,0.85)'); return c; }
    };
    const card = (n, title, ill, text) => h('article', { class: 'help-card' }, h('div', { class: 'hc-n' }, n), h('h3', {}, title), ills[ill](), h('p', {}, text));
    return h('div', { class: 'help' },
      h('h2', {}, 'Cómo jugar en nueve pasos'),
      h('p', { class: 'lead' }, 'Cada bando mueve todas sus unidades en su turno. Ganas si derrotas al comandante rival (o, en el modo Dominio, si controlas cuatro puestos durante dos rondas seguidas). Tu comandante empieza ya en nivel 3.'),
      h('div', { class: 'help-grid' },
        card(1, 'Elige y mueve', 'move', 'Haz clic en una unidad: las casillas claras son su alcance y el número indica lo que cuesta llegar. Haz clic en una de ellas para moverte.'),
        card(2, 'Ataca', 'attack', 'Haz clic en un enemigo con marco rojo. Verás la probabilidad de impacto, el daño por golpe, la represalia y la probabilidad de que caiga cada uno. Un ataque termina el movimiento.'),
        card(3, 'El terreno importa', 'terrain', 'El porcentaje es la probabilidad de esquivar. Los parques y casas protegen; las plazas y el barro dejan al descubierto. Cada personaje suma o resta su esquiva propia.'),
        card(4, 'Captura banderas', 'flags', 'Entra en un puesto con bandera para que ondee con tu color. Cada puesto cura 8 PV al empezar tu turno y te da oro en cada ronda.'),
        card(5, 'Recluta en la fortaleza', 'recruit', 'Con el comandante en la casilla de mando, pulsa R o «Reclutar» y elige una casilla azul. Puedes repetir personajes; llegan listos en tu siguiente turno.'),
        card(6, 'Día y noche', 'tod', 'Los diurnos pegan +25 % de día y −25 % de noche; los nocturnos al revés. El amanecer y el atardecer son neutrales.'),
        card(7, 'Gana experiencia y evoluciona', 'evo', 'Atacar, sobrevivir y derrotar enemigos llena la barra morada. Al llenarla, el personaje evoluciona: cambia de aspecto, recupera la vida y aprende habilidades.'),
        card(8, 'Zonas de control', 'zoc', 'Al entrar junto a un enemigo de nivel 1 o superior, tu unidad se detiene. Úsalo para bloquear pasos estrechos y proteger a tu comandante.'),
        h('article', { class: 'help-card wide' }, h('div', { class: 'hc-n' }, 9), h('h3', {}, 'Rasgos únicos'),
          h('ul', { class: 'traits' }, Object.entries(VV.WSPECIAL).map(([k, w]) => h('li', {}, h('strong', {}, w.n + ': '), w.d)).concat(
            ['brindis', 'inspiracion', 'piedra', 'concierto', 'beber'].map(k => h('li', {}, h('strong', {}, VV.ABIL[k].n + ': '), VV.ABIL[k].d)))))),
      h('h3', {}, 'Controles'),
      h('div', { class: 'keys' }, [['Clic', 'seleccionar, mover, atacar'], ['Clic dcho. / Esc', 'cancelar'], ['Rueda', 'zoom'], ['Arrastrar', 'mover la cámara'], ['Espacio', 'fin de turno'], ['R', 'reclutar'], ['N', 'siguiente unidad'], ['H', 'rejilla'], ['Z', 'zonas de control'], ['M', 'sonido']].map(([k, d]) => h('div', { class: 'key' }, h('kbd', {}, k), h('span', {}, d)))),
      h('h3', {}, 'Terrenos'),
      h('table', { class: 'terr' }, h('tr', {}, h('th', {}, 'Terreno'), h('th', {}, 'Coste'), h('th', {}, 'Defensa')), Object.entries(VV.TERRAIN).filter(([, t]) => t.cost < 99).map(([, t]) => h('tr', {}, h('td', {}, t.n), h('td', {}, t.cost), h('td', {}, t.def + ' %')))),
      h('p', { class: 'muted' }, 'Tanques: +1 de coste en parque, barro y arena; defensa máxima 50 % salvo en fortaleza. Ágiles: −1 de coste en parque, barro y arena y +10 de defensa en parque. Místicos: +5 en edificios. Apoyo: +5 en sidrerías y casetas.'));
  }
  function helpModal() { openModal(h('div', {}, helpContent(), h('div', { class: 'row end' }, h('button', { class: 'btn', 'data-autofocus': 1, onclick: () => closeModal() }, 'Cerrar'))), 'wide scroll'); }
  function settingsModal() {
    const S = UI.set;
    const chk = (key, label) => h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: S[key] ? '' : null, onchange: e => { S[key] = e.target.checked; saveSettings(); applySettings(); } }), label);
    openModal(h('div', { class: 'settings' }, h('h3', {}, 'Ajustes'),
      h('label', {}, 'Volumen general'), h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: S.vol, oninput: e => { S.vol = +e.target.value; saveSettings(); applySettings(); } }),
      chk('music', 'Música'), chk('sfx', 'Efectos de sonido'), chk('grid', 'Mostrar rejilla hexagonal'), chk('hints', 'Mostrar consejos en las primeras rondas'), chk('reduced', 'Reducir sacudidas y partículas'),
      h('label', {}, 'Velocidad de la IA'),
      h('select', { onchange: e => { S.aiSpeed = e.target.value; saveSettings(); } }, [['normal', 'Normal'], ['rapida', 'Rápida'], ['instantanea', 'Instantánea']].map(([v, l]) => h('option', { value: v, selected: S.aiSpeed === v ? '' : null }, l))),
      h('div', { class: 'row end' }, h('button', { class: 'btn', 'data-autofocus': 1, onclick: () => closeModal() }, 'Cerrar'))));
  }

  /* ---------------- Enciclopedia ---------------- */
  const ency = { tab: 'ast', id: 'ramon', lvl: 0, anim: null };
  function renderEncy() {
    const tabs = $('#ency-tabs'); tabs.innerHTML = '';
    [['ast', 'Astures'], ['mad', 'Madriles'], ['ver', 'Veraneantes'], ['sum', 'Invocaciones']].forEach(([k, l]) => tabs.appendChild(h('button', { class: ency.tab === k ? 'on' : '', 'aria-pressed': ency.tab === k, onclick: () => { ency.tab = k; const L = encyList(); ency.id = L[0]; ency.lvl = 0; renderEncy(); } }, l)));
    const list = $('#ency-list'); list.innerHTML = '';
    encyList().forEach(id => { const d = VV.UNITS[id]; list.appendChild(h('button', { class: 'ency-item' + (ency.id === id ? ' on' : ''), onclick: () => { ency.id = id; ency.lvl = 0; renderEncy(); } }, portrait(id, 0, 0, 44), h('span', {}, d.levels[0].name))); });
    renderEncyDetail();
  }
  function encyList() {
    if (['ast', 'mad', 'ver'].includes(ency.tab)) return VV.HEROES[ency.tab];
    return Object.keys(VV.UNITS).filter(id => VV.UNITS[id].kind === 'summon');
  }
  function renderEncyDetail() {
    const d = VV.UNITS[ency.id], L = d.levels[ency.lvl], F = VV.FACTIONS[d.fac], box = $('#ency-detail'); box.innerHTML = '';
    const res = Object.assign({}, VV.RES[d.arch], d.res || {}); for (let i = 0; i <= ency.lvl; i++) Object.assign(res, d.levels[i].res || {});
    const abl = []; for (let i = 0; i <= ency.lvl; i++) (d.levels[i].ab || []).forEach(a => { const A = VV.ABIL[a]; if (A.replaces) { const k = abl.indexOf(A.replaces); if (k >= 0) abl.splice(k, 1); } if (!abl.includes(a)) abl.push(a); });
    const stage = ART.mk(420, 300); stage.className = 'pix ency-stage';
    app(box,
      h('div', { class: 'ency-top', style: `--fc:${F.col}` },
        h('div', { class: 'ency-stage-wrap' }, stage,
          h('div', { class: 'lvlnav' }, h('button', { class: 'btn ghost', 'aria-label': 'Nivel anterior', disabled: ency.lvl === 0, onclick: () => { ency.lvl--; renderEncyDetail(); } }, '‹'),
            h('span', {}, `Nivel ${ency.lvl + 1} de ${d.levels.length}`), h('button', { class: 'btn ghost', 'aria-label': 'Nivel siguiente', disabled: ency.lvl === d.levels.length - 1, onclick: () => { ency.lvl++; renderEncyDetail(); } }, '›')),
          h('button', { class: 'btn', onclick: () => { ency.anim = { t0: performance.now() }; AU.init(); AU.sfx('throw'); } }, 'Probar ataque')),
        h('div', { class: 'ency-info' }, h('h2', {}, L.name), h('p', { class: 'muted' }, `${F.n}, ${d.cls.toLowerCase()}`), h('p', { class: 'desc' }, '«' + d.desc + '»'),
          h('div', { class: 'stats' }, h('span', {}, h('b', {}, 'PV '), L.hp), h('span', {}, h('b', {}, 'MOV '), L.mov), d.cost ? h('span', {}, h('b', {}, 'Coste '), d.cost) : null,
            h('span', {}, h('b', {}, 'XP '), L.xp || (d.kind === 'summon' ? '—' : 'Máximo')), h('span', {}, h('b', {}, VV.ARCH[d.arch].n)), h('span', {}, h('b', {}, VV.ALIGN[d.align])), d.defBonus ? h('span', {}, h('b', {}, 'Esquiva propia '), (d.defBonus > 0 ? '+' : '') + d.defBonus + ' %') : null),
          h('h4', {}, 'Ataques'), h('ul', { class: 'weap' }, L.w.map(w => h('li', {}, h('strong', {}, w.n), h('span', {}, `${w.d}×${w.s}`), h('span', { class: 'muted' }, `${VV.DMG[w.t]}, ${w.r === 'm' ? 'cuerpo a cuerpo' : 'a distancia'}${w.sp ? ', ' + VV.WSPECIAL[w.sp].n.toLowerCase() : ''}`)))),
          abl.length ? h('h4', {}, 'Habilidades') : null, h('ul', { class: 'abl' }, abl.map(a => h('li', {}, h('strong', {}, VV.ABIL[a].n), h('span', { class: 'muted' }, VV.ABIL[a].d)))),
          h('h4', {}, 'Resistencias'), h('div', { class: 'res' }, VV.DMG_ORDER.map(k => h('span', { class: res[k] > 0 ? 'pos' : res[k] < 0 ? 'neg' : '' }, VV.DMG[k] + ' ' + (res[k] > 0 ? '+' : '') + res[k] + ' %'))))),
      d.levels.length > 1 ? h('div', { class: 'evo-strip' }, h('h4', {}, 'Árbol de evolución'), h('div', { class: 'strip' }, d.levels.map((l, i) => [i ? h('span', { class: 'evo-arrow' }, '›') : null,
        h('button', { class: 'evo-step' + (i === ency.lvl ? ' on' : ''), onclick: () => { ency.lvl = i; renderEncyDetail(); } }, spriteCanvas(ency.id, i, 2), h('span', {}, l.name), l.xp ? h('small', { class: 'muted' }, l.xp + ' XP') : h('small', { class: 'muted' }, 'Máximo'))]))) : null);
    ency.stage = stage; ency.anim = null;
  }
  function encyLoop(t) {
    requestAnimationFrame(encyLoop);
    if (UI.screen !== 'ency' || !ency.stage) return;
    const c = ency.stage.getContext('2d'), d = VV.UNITS[ency.id], F = VV.FACTIONS[d.fac], W = 420, Hh = 300, gy = 262;
    c.imageSmoothingEnabled = false;
    const gr = c.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, ART.sh(F.col, -0.62)); gr.addColorStop(1, ART.sh(F.col, -0.25)); c.fillStyle = gr; c.fillRect(0, 0, W, Hh);
    const lg = c.createRadialGradient(140, 120, 10, 140, 140, 200); lg.addColorStop(0, 'rgba(255,230,180,0.22)'); lg.addColorStop(1, 'rgba(255,230,180,0)'); c.fillStyle = lg; c.fillRect(0, 0, W, Hh);
    c.fillStyle = ART.sh(F.col, -0.45); c.fillRect(0, gy, W, Hh - gy);
    for (let k = 0; k < W; k += 30) { c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(k, gy + 4, 15, Hh); }
    let frame = Math.floor(t / 560) % 2 ? 'idle1' : 'idle0', dx = 0, proj = null, q = 0;
    const L = d.levels[ency.lvl];
    if (ency.anim) {
      q = (t - ency.anim.t0) / 1000;
      if (q >= 1) ency.anim = null; else {
        const ranged = L.w.some(w => w.r === 'd');
        frame = q < 0.25 ? 'wind' : q < 0.75 ? 'atk' : 'idle0';
        if (ranged && q > 0.25) proj = (q - 0.25) / 0.6; else if (!ranged && q > 0.25) dx = Math.sin(Math.min(1, (q - 0.25) / 0.5) * Math.PI) * 50;
      }
    }
    const k = 3, spr = ART.spriteHi(ency.id, ency.lvl, frame, k);
    c.fillStyle = 'rgba(0,0,0,0.32)'; c.beginPath(); c.ellipse(150, gy, 60, 11, 0, 0, Math.PI * 2); c.fill();
    c.drawImage(spr, Math.round(150 - 32 * k + dx), gy - 72 * k);
    const g = ART.P ? null : null; void g;
    c.fillStyle = '#5a3a1e'; c.fillRect(345, 130, 7, gy - 130); c.fillRect(318, 150, 60, 7);
    c.fillStyle = '#e1c06b'; c.fillRect(331, 102, 34, 34); c.fillStyle = '#3b2a1a'; c.fillRect(339, 113, 5, 5); c.fillRect(352, 113, 5, 5);
    c.fillStyle = '#b8352a'; c.fillRect(334, 158, 28, 48); c.fillStyle = '#5a3a1e'; c.fillRect(326, 96, 50, 8);
    if (proj != null && proj <= 1) {
      const w = L.w.find(x => x.r === 'd'), kind = w.fx === 'talk' || w.fx === 'shout' ? 'notes' : w.fx;
      const x = 200 + (340 - 200) * proj, y = 150 - Math.sin(proj * Math.PI) * 50;
      c.save(); c.translate(x, y); c.rotate(proj * 6); c.drawImage(VV.Render.projSprite(kind), -20, -20, 40, 40); c.restore();
    }
    if (ency.anim && q > 0.7 && q < 0.9) { c.fillStyle = 'rgba(255,80,60,0.45)'; c.fillRect(326, 96, 50, 110); }
  }
  /* ---------------- Arranque ---------------- */
  function init() {
    applySettings();
    document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
      AU.init(); AU.sfx('select');
      const a = b.dataset.act;
      if (a === 'new') { renderSetup(); UI.show('setup'); }
      else if (a === 'continue') loadSave();
      else if (a === 'ency') { renderEncy(); UI.show('ency'); }
      else if (a === 'help') { const c = $('#help-body'); c.innerHTML = ''; c.appendChild(helpContent()); UI.show('help'); }
      else if (a === 'settings') settingsModal();
      else if (a === 'menu') UI.show('menu');
      else if (a === 'start') startFromSetup();
    }));
    $('#modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal' && !$('#modal-card').querySelector('.hotseat,.endcard')) closeModal(null); });
    R.attach($('#map'));
    bindMap(); bindKeys();
    UI.show('menu');
    requestAnimationFrame(menuLoop); requestAnimationFrame(encyLoop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
