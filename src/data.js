/* LA BATALLA POR VILLAVICIOSA — data.js
   Todas las tablas del juego: tipos de daño, estados, terrenos, arquetipos,
   facciones, unidades con sus evoluciones y habilidades. */
(function (G) {
  const VV = (G.VV = G.VV || {});

  VV.DMG = { imp: 'Impacto', cut: 'Corte', pro: 'Proyectil', psi: 'Psicológico', cha: 'Caos' };
  VV.DMG_ORDER = ['imp', 'cut', 'pro', 'psi', 'cha'];

  // Los estados del mismo tipo no se acumulan: solo renuevan duración.
  VV.STATUS = {
    mareado: { n: 'Mareado', d: '−20 % de daño infligido.', col: '#8bc34a', dmg: 0.8 },
    avergonzado: { n: 'Avergonzado', d: '−10 puntos de probabilidad de impacto.', col: '#f48fb1', acc: -10 },
    agotado: { n: 'Agotado', d: '−1 punto de movimiento en su siguiente turno.', col: '#90a4ae', mov: -1 },
    pringado: { n: 'Pringado', d: '+1 al coste de movimiento en cualquier terreno transitable.', col: '#9ccc65', cost: 1 },
    inspirado: { n: 'Inspirado', d: '+15 % de daño infligido.', col: '#ffca28', dmg: 1.15 },
    protegido: { n: 'Protegido', d: '−20 % de daño recibido.', col: '#4fc3f7', taken: 0.8 },
    silenciado: { n: 'Silenciado', d: 'No puede usar habilidades activas.', col: '#9575cd', silence: true },
    intimidado: { n: 'Intimidado', d: '−15 % de daño infligido.', col: '#ef5350', dmg: 0.85 },
    evasivo: { n: 'En guardia', d: 'Bonificación temporal de defensa.', col: '#26a69a' },
    temazo: { n: 'Temazo', d: '+1 punto de movimiento.', col: '#ff7043', mov: 1 }
  };

  VV.TERRAIN = {
    street: { n: 'Calle empedrada', cost: 1, def: 30 },
    plaza: { n: 'Plaza abierta', cost: 1, def: 20, open: true },
    grass: { n: 'Hierba del prao', cost: 1, def: 30, open: true },
    park: { n: 'Parque arbolado', cost: 2, def: 50 },
    alley: { n: 'Callejón estrecho', cost: 1, def: 40 },
    cover: { n: 'Edificio con cobertura', cost: 2, def: 50 },
    castle: { n: 'Fortaleza', cost: 1, def: 60, castle: true },
    keep: { n: 'Casilla de mando', cost: 1, def: 60, castle: true, keep: true },
    tavern: { n: 'Sidrería / caseta', cost: 1, def: 50 },
    mud: { n: 'Barro', cost: 3, def: 20 },
    puddle: { n: 'Charco', cost: 2, def: 20 },
    dance: { n: 'Pista de baile', cost: 1, def: 20, open: true },
    stage: { n: 'Escenario', cost: 1, def: 40 },
    sand: { n: 'Arena de playa', cost: 2, def: 30, open: true },
    rock: { n: 'Acantilado', cost: 99, def: 0 },
    tables: { n: 'Barrera de mesas', cost: 99, def: 0 },
    wall: { n: 'Edificio cerrado', cost: 99, def: 0 },
    water: { n: 'Agua profunda', cost: 99, def: 0 }
  };

  VV.ARCH = {
    infantry: { n: 'Infantería', cost: {}, def: {} },
    agile: { n: 'Ágil', cost: { park: -1, mud: -1, sand: -1 }, def: { park: 10 } },
    tank: { n: 'Tanque', cost: { park: 1, mud: 1, sand: 1 }, def: {}, cap: 50 },
    mystic: { n: 'Místico', cost: {}, def: { cover: 5 } },
    support: { n: 'Apoyo', cost: {}, def: { tavern: 5 } }
  };

  VV.RES = {
    infantry: { imp: 0, cut: 0, pro: 5, psi: 0, cha: 0 },
    agile: { imp: -10, cut: 0, pro: 10, psi: 0, cha: 0 },
    tank: { imp: 20, cut: 10, pro: 10, psi: -10, cha: 0 },
    mystic: { imp: -10, cut: 0, pro: 0, psi: 20, cha: 10 },
    support: { imp: 0, cut: 0, pro: 5, psi: 10, cha: 0 }
  };

  VV.TOD = [
    { n: 'Amanecer', law: 0, tint: [255, 170, 120, 0.16] },
    { n: 'Día', law: 1, tint: [255, 255, 255, 0] },
    { n: 'Tarde', law: 1, tint: [255, 205, 120, 0.08] },
    { n: 'Atardecer', law: 0, tint: [215, 95, 70, 0.24] },
    { n: 'Noche', law: -1, tint: [18, 28, 88, 0.42] },
    { n: 'Noche profunda', law: -1, tint: [8, 10, 48, 0.56] }
  ];
  VV.ALIGN = { l: 'Diurno', c: 'Nocturno', n: 'Neutral' };

  VV.FACTIONS = {
    ast: {
      n: 'Astures', col: '#3f8f4f', col2: '#2c6fa8', accent: '#f1e4b8',
      lore: 'Defensores de la Villa: sidra, familiares temibles y mascotas monstruosas.',
      bonus: 'Curan +1 PV extra en propiedades controladas (máximo 9 por turno).',
      generics: []
    },
    mad: {
      n: 'Madriles', col: '#8c1c3a', col2: '#4b2463', accent: '#d4af37',
      lore: 'Invasores con opinadores, escritores incomprendidos y discursos interminables.',
      bonus: '+1 XP en el primer combate de cada unidad por ronda.',
      generics: []
    },
    ver: {
      n: 'Veraneantes', col: '#14a39b', col2: '#ff7a5c', accent: '#ffd84d',
      lore: 'Personajes inclasificables que consideran la Villa su territorio estival.',
      bonus: '+1 oro adicional por cada dos propiedades controladas.',
      generics: []
    }
  };

  VV.ECON = { startGold: 75, base: 6, perProp: 2 };

  /* ---------------- HABILIDADES ----------------
     kind: arm (prepara el siguiente ataque), buff, heal, healAlly, debuff,
     summon, barricade, sticky, attack (ataque especial), leap, passive. */
  const A = (VV.ABIL = {});
  const ab = (id, o) => (A[id] = Object.assign({ id }, o));
  ab('ronda_bienvenida', { n: 'Ronda de bienvenida', kind: 'arm', cd: 3, arm: { range: 'd', onHit: 'mareado' }, d: 'El siguiente ataque a distancia aplica Mareado si acierta al menos un golpe.' });
  ab('ronda_doble', { n: 'Ronda doble', kind: 'arm', cd: 4, arm: { range: 'd', splash: 0.25 }, d: 'En el siguiente ataque a distancia, el último golpe acertado salpica un 25 % de su daño a otro enemigo adyacente al objetivo.' });
  ab('ultima_ronda', { n: 'La Última Ronda', kind: 'arm', once: true, ult: true, arm: { range: 'd', dmgMul: 1.25, onHit: 'mareado' }, d: 'Una vez por batalla: el siguiente ataque a distancia gana +25 % de daño y aplica Mareado si conecta.' });
  ab('rebote_puchi', { n: 'Rebote de Puchi', kind: 'arm', cd: 3, arm: { range: 'd', acc: 10 }, d: '+10 puntos de precisión en el siguiente ataque a distancia.' });
  ab('puchi_bumeran', { n: 'Puchi Bumerán', kind: 'passive', trig: { range: 'd', minHits: 2, status: 'agotado' }, d: 'Si acierta dos o más golpes a distancia, aplica Agotado.' });
  ab('puchi_supersonico', { n: 'Puchi Supersónico', kind: 'attack', cd: 4, ult: true, target: 'range2', weapon: 'd', fx: 'hamster', d: 'Ataca a distancia a un enemigo a dos hexágonos con línea de visión. No recibe represalia.' });
  ab('chavales', { n: '¡CHAVALES, VENID!', kind: 'summon', cd: 3, minion: 'amiga', group: 'amiga', max: 2, dur: 3, d: 'Invoca a una amiga (16 PV, 5×2 impacto) durante tres rondas. Máximo dos.' });
  ab('pandilla', { n: 'Pandilla organizada', kind: 'passive', upgrade: { amiga: 'amiga2' }, nearSummonMelee: 0.1, d: 'Las amigas pasan a 21 PV y 6×2. +10 % de daño cuerpo a cuerpo con una amiga adyacente.' });
  ab('todas_a_una', { n: 'TODAS A UNA', kind: 'attack', cd: 4, ult: true, target: 'adj', weapon: 'm', extraPerSummon: { group: 'amiga', d: 5, t: 'imp' }, fx: 'fist', d: 'Golpea con su arma cuerpo a cuerpo y cada amiga activa añade un golpe de 5 de impacto.' });
  ab('aqui_no_pasa', { n: 'Aquí no pasa nadie', kind: 'buff', cd: 3, status: 'protegido', evasion: 10, d: 'Gana Protegido y +10 de defensa hasta su siguiente turno.' });
  ab('terremoto', { n: 'Terremoto de Charlotte', kind: 'attack', cd: 4, ult: true, target: 'all_adj', custom: { d: 12, s: 1, t: 'imp' }, fx: 'quake', d: 'Un golpe de 12 de impacto a todos los enemigos adyacentes, con tiradas independientes.' });
  ab('cambio_deco', { n: 'Cambio de decoración', kind: 'barricade', cd: 4, count: 1, hp: 15, maxActive: 3, dur: 3, d: 'Coloca una barricada decorativa de 15 PV en una casilla adyacente durante tres rondas.' });
  ab('reforma_integral', { n: 'REFORMA INTEGRAL', kind: 'barricade', cd: 4, ult: true, count: 2, hp: 20, maxActive: 3, dur: 3, replaces: 'cambio_deco', d: 'Coloca dos barricadas de 20 PV adyacentes (máximo tres propias activas).' });
  ab('te_toca_perder', { n: 'Te toca perder', kind: 'debuff', cd: 3, status: 'agotado', d: 'Aplica Agotado a un enemigo adyacente.' });
  ab('monopolio', { n: 'MONOPOLIO FAMILIAR', kind: 'debuff', cd: 4, ult: true, status: 'intimidado', arm: { range: 'any', steal: 3 }, d: 'Aplica Intimidado a un enemigo adyacente; si su siguiente ataque acierta, roba hasta 3 de oro.' });
  ab('accidente', { n: 'Accidente doméstico', kind: 'sticky', cd: 4, count: 1, d: 'Crea una casilla pringosa adyacente durante dos rondas (+1 de coste y aplica Pringado).' });
  ab('vomito_mutante', { n: 'Vómito mutante', kind: 'passive', trig: { range: 'd', minHits: 2, status: 'pringado' }, d: 'Su ataque a distancia aplica Pringado si acierta dos o más golpes.' });
  ab('cataclismo', { n: 'CATACLISMO GASTROINTESTINAL', kind: 'attack', cd: 5, ult: true, target: 'adj', custom: { d: 10, s: 2, t: 'cha' }, sticky: 2, fx: 'vomit', d: 'Ataque de caos 10×2 a un enemigo adyacente y dos casillas pringosas a su alrededor.' });
  ab('interlocutor', { n: 'Interlocutor cautivo', kind: 'passive', onKill: { t: 'psi', minion: 'oyente', group: 'oyente', max: 2, dur: 3 }, d: 'Si elimina a un enemigo con daño psicológico, crea un Oyente Zombi adyacente durante tres rondas (máximo dos).' });
  ab('monologo', { n: 'Monólogo interminable', kind: 'debuff', cd: 4, status: 'silenciado', d: 'Silencia a un enemigo adyacente durante una ronda.' });
  ab('conferencia', { n: 'CONFERENCIA DE TRES HORAS', kind: 'attack', cd: 5, ult: true, target: 'radius2', custom: { d: 7, s: 1, t: 'psi' }, onHit: 'agotado', fx: 'clock', d: '7 de daño psicológico a todos los enemigos a dos hexágonos o menos; Agotado a quien reciba el golpe.' });
  ab('primer_borrador', { n: 'Primer borrador', kind: 'arm', cd: 3, arm: { range: 'd', acc: 10 }, d: '+10 de probabilidad de impacto en su siguiente ataque psicológico a distancia.' });
  ab('spoiler', { n: 'Spoiler innecesario', kind: 'debuff', cd: 4, status: 'avergonzado', d: 'Aplica Avergonzado a un enemigo adyacente.' });
  ab('trilogia', { n: 'LA TRILOGÍA INTERMINABLE', kind: 'attack', cd: 5, ult: true, target: 'adj', custom: { d: 8, s: 3, t: 'psi' }, minHits: 2, minStatus: 'silenciado', fx: 'papers', d: 'Tres golpes psicológicos de 8; si dos aciertan, Silenciado.' });
  ab('dejame', { n: 'Déjame tranquilo', kind: 'debuff', cd: 3, status: 'agotado', d: 'Aplica Agotado a un enemigo adyacente.' });
  ab('te_he_dicho', { n: '¿TE HE DICHO QUE PARES?', kind: 'attack', cd: 4, ult: true, target: 'adj', custom: { d: 18, s: 1, t: 'imp' }, push: true, fx: 'muscle', d: 'Golpe de 18 de impacto; si conecta, empuja al enemigo un hexágono.' });
  ab('boss', { n: 'INVOCAR A EL BOSS', kind: 'summon', once: true, ult: true, minion: 'boss', group: 'boss', max: 1, dur: 3, inspireOnEnter: 1, d: 'Una vez por batalla invoca a El Boss, leyenda rockera genérica, durante tres rondas. Inspira a los aliados adyacentes.' });
  ab('cata', { n: 'Cata estratégica', kind: 'buff', cd: 3, status: 'inspirado', d: 'Gana Inspirado durante una ronda.' });
  ab('barrica', { n: 'Barrica rodante', kind: 'attack', cd: 4, target: 'adj', custom: { d: 11, s: 2, t: 'imp' }, onHit: 'agotado', fx: 'barrel', d: 'Ataque de 11×2 impacto que aplica Agotado si conecta.' });
  ab('bodega', { n: 'Bodega interminable', kind: 'heal', cd: 4, amount: 6, d: 'Se cura 6 PV usando su acción.' });
  ab('gran_cosecha', { n: 'LA GRAN COSECHA', kind: 'attack', cd: 5, ult: true, target: 'all_adj', custom: { d: 12, s: 2, t: 'imp' }, healPerTarget: 3, healMax: 12, fx: 'barrel', d: '12×2 de impacto a todos los adyacentes; se cura 3 PV por objetivo alcanzado (máx. 12).' });
  ab('tabernero', { n: 'Afinidad con las barricas', kind: 'passive', tavernXP: 3, d: '+3 XP al empezar turno en una barra o sidrería controlada (una vez cada dos rondas).' });
  ab('beber', { n: 'Beber vino', kind: 'drink', cd: 2, xp: 7, amount: 4, d: 'Da un trago largo: gana 7 XP y cura 4 PV, pero queda Mareado una ronda. Así asciende de Tío Guillermo a Emperador del Tempranillo.' });
  ab('brindis', { n: 'Brindis de victoria', kind: 'passive', killInspire: 1, d: 'Cuando elimina a un enemigo, sus aliados adyacentes quedan Inspirados.' });
  ab('inspiracion', { n: 'Musa literaria', kind: 'passive', leadership: 0.15, d: 'Los aliados adyacentes hacen +15 % de daño.' });
  ab('piedra', { n: 'Cuerpo de piedra', kind: 'passive', regen: 4, d: 'Recupera 4 PV al empezar cada turno, aunque haya combatido.' });
  ab('concierto', { n: 'Concierto de cabecera', kind: 'passive', heals: 4, d: 'Los aliados adyacentes recuperan 4 PV al empezar su turno.' });
  ab('grito_guerra', { n: 'Grito de guerra', kind: 'buff', cd: 3, status: 'inspirado', d: 'Gana Inspirado durante una ronda.' });
  ab('patada_circular', { n: 'Patada circular', kind: 'attack', cd: 4, target: 'two', custom: { d: 8, s: 2, t: 'imp' }, fx: 'kick', d: 'Ataca a dos enemigos adyacentes con 8×2 impacto cada uno.' });
  ab('patada_estrato', { n: 'PATADA ESTRATOSFÉRICA', kind: 'leap', cd: 5, ult: true, range: 2, then: { d: 12, s: 2, t: 'imp' }, fx: 'kick', d: 'Salta a un hexágono libre a dos casillas y golpea con 12×2 a un enemigo adyacente al destino.' });
  ab('relevo', { n: 'Relevo familiar', kind: 'buff', cd: 3, status: 'protegido', d: 'Gana Protegido durante una ronda.' });
  ab('familia', { n: 'FAMILIA NUMEROSA', kind: 'attack', cd: 5, ult: true, target: 'adj', custom: { d: 7, s: 4, t: 'imp' }, minHits: 3, minStatus: 'intimidado', fx: 'fist', d: 'Cuatro golpes de 7 de impacto; si tres conectan, Intimidado.' });
  ab('muro', { n: 'Muro humano', kind: 'buff', cd: 3, status: 'protegido', d: 'Gana Protegido durante una ronda.' });
  ab('aplastamiento', { n: 'Aplastamiento controlado', kind: 'attack', cd: 4, target: 'adj', custom: { d: 12, s: 2, t: 'imp' }, onHit: 'agotado', fx: 'quake', d: '12×2 de impacto; aplica Agotado si conecta.' });
  ab('montana', { n: 'SE VIENE LA MONTAÑA', kind: 'attack', cd: 5, ult: true, target: 'all_adj', custom: { d: 13, s: 1, t: 'imp' }, fx: 'quake', d: 'Golpea a todos los enemigos adyacentes con 13 de impacto.' });
  ab('cuenta_cerrada', { n: 'Cuenta cerrada', kind: 'passive', killGold: 2, d: 'Al eliminar a un enemigo, +2 de oro para su facción (una vez por ronda).' });
  ab('cambio_exacto', { n: 'Cambio exacto', kind: 'arm', cd: 4, arm: { range: 'd', steal: 3 }, d: 'Si su siguiente ataque a distancia conecta, roba hasta 3 de oro.' });
  ab('enterrado', { n: 'ENTERRADO EN DINERO', kind: 'attack', cd: 5, ult: true, target: 'adj', custom: { d: 10, s: 3, t: 'pro' }, minHits: 2, minStatus: 'agotado', fx: 'coins', d: '10×3 de proyectil; si acierta dos golpes, Agotado.' });
  ab('escurridizo', { n: 'Escurridizo', kind: 'passive', skirmishOnce: true, d: 'Ignora una zona de control enemiga por turno.' });
  ab('desaparecer', { n: 'Desaparecer entre la gente', kind: 'buff', cd: 4, evasion: 15, d: '+15 de defensa hasta su siguiente turno.' });
  ab('no_me_has_visto', { n: 'NO ME HAS VISTO', kind: 'leap', cd: 5, ult: true, range: 2, then: 'normal', fx: 'shadow', d: 'Se desplaza a un hexágono libre a dos casillas y después puede atacar con normalidad.' });
  ab('llave_vasca', { n: 'Llave vasca', kind: 'arm', cd: 3, arm: { range: 'any', onHit: 'agotado' }, d: 'Si su siguiente ataque conecta, aplica Agotado.' });
  ab('suplex', { n: 'SUPLEX INTERCONTINENTAL', kind: 'attack', cd: 5, ult: true, target: 'adj', custom: { d: 16, s: 2, t: 'imp' }, push: true, fx: 'quake', d: '16×2 de impacto; si acierta, empuja al objetivo una casilla.' });
  ab('tu_ven_aqui', { n: '¡Tú, ven aquí!', kind: 'debuff', cd: 3, status: 'intimidado', d: 'Aplica Intimidado a un enemigo adyacente.' });
  ab('bronca', { n: 'Bronca monumental', kind: 'attack', cd: 4, target: 'two', custom: { d: 7, s: 1, t: 'psi' }, fx: 'shout', d: '7 de daño psicológico a hasta dos enemigos adyacentes.' });
  ab('brujaaa', { n: 'BRUJAAAAAA', kind: 'attack', cd: 5, ult: true, target: 'all_adj', custom: { d: 10, s: 2, t: 'psi' }, onHit: 'silenciado', fx: 'shout', d: '10×2 psicológico a todos los adyacentes; Silenciado a quien reciba un golpe.' });
  ab('puma', { n: 'Puma de diseño', kind: 'summon', cd: 4, minion: 'puma', group: 'puma', max: 1, dur: 3, d: 'Invoca un puma de 18 PV y 6×2 corte durante tres rondas. Máximo uno.' });
  ab('pedigri', { n: 'Pedigrí imperial', kind: 'passive', upgrade: { puma: 'puma2' }, d: 'Su puma pasa a 25 PV y 8×2 corte.' });
  ab('felino', { n: 'FELINO DE ALTA CUNA', kind: 'summon', cd: 5, ult: true, minion: 'puma3', group: 'puma', max: 1, dur: 3, replace: true, d: 'Invoca un puma imperial de 35 PV y 10×2 corte; sustituye al puma activo.' });
  ab('pasito', { n: 'Pasito lateral', kind: 'buff', cd: 3, evasion: 15, d: '+15 de defensa durante una ronda.' });
  ab('vuelta', { n: 'Vuelta imposible', kind: 'leap', cd: 4, range: 1, free: true, then: 'normal', fx: 'dance', d: 'Se desplaza a una casilla adyacente sin coste y puede atacar si no lo había hecho.' });
  ab('bachata', { n: 'BACHATA APOCALÍPTICA', kind: 'attack', cd: 5, ult: true, target: 'all_adj', custom: { d: 9, s: 1, t: 'imp' }, onHit: 'avergonzado', zoom: true, fx: 'dance', d: '9 de impacto a todos los adyacentes; Avergonzado a los alcanzados.' });

  /* ---------------- UNIDADES ---------------- */
  const U = (VV.UNITS = {});
  const W = (n, r, d, s, t, fx) => ({ n, r, d, s, t, fx });
  const L = (name, hp, mov, xp, w, ab, extra) => Object.assign({ name, hp, mov, xp, w, ab: ab || [] }, extra || {});
  const def = (id, o) => (U[id] = Object.assign({ id }, o));

  // Paletas de piel y pelo
  const SK = { fair: '#f2cba8', light: '#e7b48b', tan: '#c98e5d', brown: '#a8693c', dark: '#7d4a26', zombie: '#a8c49a' };
  const HR = { blond: '#ecc24a', black: '#1d1a24', brown: '#5b3a22', dbrown: '#3a2416', grey: '#c8c8ce', white: '#f4f4f0' };

  // ---------- ASTURES ----------
  def('ramon', { fac: 'ast', kind: 'hero', arch: 'infantry', align: 'n', cost: 22, res: { pro: 15 }, cls: 'Guerrero escanciador',
    desc: 'Nadie sabe cuántas copas le quedan. Probablemente ni él.', fx: 'cup',
    levels: [
      L('Ramón', 36, 5, 26, [W('Vaso en la frente', 'm', 5, 2, 'imp', 'fist'), W('Lanzamiento de copa', 'd', 6, 3, 'pro', 'cup')], ['ronda_bienvenida']),
      L('Raymon', 46, 5, 38, [W('Vaso en la frente', 'm', 7, 2, 'imp', 'fist'), W('Lanzamiento de copa', 'd', 8, 3, 'pro', 'cup2')], ['ronda_doble']),
      L('Don Ramón', 60, 5, null, [W('Vaso en la frente', 'm', 9, 2, 'imp', 'fist'), W('Lanzamiento de copa', 'd', 11, 3, 'pro', 'cupbig')], ['ultima_ronda'])
    ] });

  def('pilar', { fac: 'ast', kind: 'hero', arch: 'agile', align: 'n', cost: 22, defBonus: 10, cls: 'Arquera de hámster',
    desc: 'Puchi no pidió participar en esta guerra. Ahora es artillería.', fx: 'hamster',
    levels: [
      L('Pilar', 32, 6, 25, [W('Puñetín', 'm', 3, 2, 'imp', 'fist'), W('¡Puchi, vuela!', 'd', 8, 3, 'pro', 'hamster')], ['rebote_puchi']),
      L('Pilarina', 36, 7, 40, [W('Puñetín', 'm', 4, 2, 'imp', 'fist'), W('¡Puchi, vuela!', 'd', 9, 3, 'pro', 'hamster2')], ['puchi_bumeran']),
      L('La Pilu', 48, 7, null, [W('Puñetín', 'm', 5, 2, 'imp', 'fist'), W('¡Puchi, vuela!', 'd', 11, 3, 'pro', 'hamster3')], ['puchi_supersonico'])
    ] });

  def('teresa', { fac: 'ast', kind: 'hero', arch: 'agile', align: 'n', cost: 16, cls: 'Berserker invocadora',
    desc: 'Si escuchas «¡CHAVALES!», ya es demasiado tarde.', fx: 'fist', res: { cut: -15 }, terrainBonus: { open: 5 },
    levels: [
      L('Teresa', 36, 7, 26, [W('Hostia de confianza', 'm', 8, 2, 'imp', 'fist')], ['chavales']),
      L('Terelu', 44, 7, 40, [W('Hostia de confianza', 'm', 10, 2, 'imp', 'fist')], ['pandilla']),
      L('Tereso', 58, 8, null, [W('Hostia de confianza', 'm', 12, 3, 'imp', 'fist')], ['todas_a_una'])
    ] });

  def('carlota', { fac: 'ast', kind: 'hero', arch: 'tank', align: 'l', cost: 23, defBonus: -10, cls: 'Tanque y luchadora de puños',
    desc: 'La mejor negociación empieza con un puñetazo.', fx: 'fist', res: { imp: 20 },
    levels: [
      L('Carlota', 52, 4, 32, [W('Puñetazo de Carlota', 'm', 10, 2, 'imp', 'fist')], ['aqui_no_pasa']),
      L('Charlotte', 72, 4, null, [W('Puñetazo de Charlotte', 'm', 14, 3, 'imp', 'fist')], ['terremoto'])
    ] });

  def('tia_carlota', { fac: 'ast', kind: 'hero', arch: 'support', align: 'n', cost: 23, res: { imp: 10 }, cls: 'Maga decoradora',
    desc: 'Te va a reformar la casa. Y la cara.', fx: 'cushion',
    levels: [
      L('Tía Carlota', 35, 5, 27, [W('Lámpara contundente', 'm', 5, 2, 'imp', 'fist'), W('Cojines a domicilio', 'd', 6, 3, 'pro', 'cushion')], ['cambio_deco']),
      L('CEO de Inzu Deco', 49, 5, null, [W('Lámpara contundente', 'm', 6, 2, 'imp', 'fist'), W('Cojines a domicilio', 'd', 9, 3, 'pro', 'cushion')], ['reforma_integral'])
    ] });

  def('tia_carmen', { fac: 'ast', kind: 'hero', arch: 'support', align: 'n', cost: 17, cls: 'Controladora táctica',
    desc: 'Nunca aceptes jugar una partida con ella.', fx: 'dice',
    levels: [
      L('Tía Carmen', 34, 5, 27, [W('Tablero en la cara', 'm', 4, 2, 'imp', 'fist'), W('Dados del Catán', 'd', 7, 3, 'psi', 'dice')], ['te_toca_perder']),
      L('La Mamen', 47, 5, null, [W('Tablero en la cara', 'm', 5, 2, 'imp', 'fist'), W('Dados del Catán', 'd', 8, 3, 'psi', 'dice')], ['monopolio'])
    ] });

  def('pooh', { fac: 'ast', kind: 'hero', arch: 'agile', align: 'c', cost: 20, defBonus: 10, cls: 'Bestia mutante del caos',
    desc: 'Pesa tres kilos. Aparentemente contiene un demonio.', fx: 'vomit', res: { cha: 20 },
    levels: [
      L('Pooh', 29, 7, 25, [W('Espasmo inesperado', 'm', 5, 2, 'imp', 'bite'), W('Vómito traicionero', 'd', 6, 3, 'cha', 'vomit')], ['accidente']),
      L('El Pooh', 38, 7, 36, [W('Espasmo inesperado', 'm', 6, 2, 'imp', 'bite'), W('Vómito traicionero', 'd', 8, 3, 'cha', 'vomit')], ['vomito_mutante']),
      L('El Puchín', 55, 8, null, [W('Espasmo inesperado', 'm', 8, 3, 'imp', 'bite'), W('Vómito traicionero', 'd', 10, 3, 'cha', 'vomit')], ['cataclismo'])
    ] });

  // ---------- MADRILES ----------
  def('pedro', { fac: 'mad', kind: 'hero', arch: 'mystic', align: 'c', cost: 27, cls: 'Nigromante de la chapa',
    desc: 'Su arma más poderosa es una conversación sin final.', fx: 'talk',
    levels: [
      L('Pedro', 32, 5, 30, [W('Codazo explicativo', 'm', 3, 2, 'imp', 'fist'), W('Dar la chapa', 'd', 7, 3, 'psi', 'talk')], ['interlocutor']),
      L('El Peter', 43, 5, 42, [W('Codazo explicativo', 'm', 4, 2, 'imp', 'fist'), W('Dar la chapa', 'd', 9, 3, 'psi', 'talk')], ['monologo'], { res: { psi: 30 } }),
      L('Pedrito Melenas, el Rey de las Nenas', 57, 5, null, [W('Codazo explicativo', 'm', 5, 2, 'imp', 'fist'), W('Dar la chapa', 'd', 11, 3, 'psi', 'talk')], ['conferencia'], { res: { psi: 30 } })
    ] });

  def('carlos', { fac: 'mad', kind: 'hero', arch: 'mystic', align: 'n', cost: 22, cls: 'Escritor hechicero',
    desc: 'Ha escrito doce novelas. Nadie ha terminado la primera.', fx: 'papers',
    levels: [
      L('Carlos', 31, 5, 25, [W('Golpe de manuscrito', 'm', 4, 2, 'imp', 'papers'), W('Escribir un libro malo', 'd', 7, 3, 'psi', 'papers')], ['primer_borrador']),
      L('Carlangas', 38, 5, 40, [W('Golpe de manuscrito', 'm', 4, 2, 'imp', 'papers'), W('Escribir un libro malo', 'd', 8, 3, 'psi', 'papers')], ['spoiler']),
      L('Carlitos Gormiti, el Rey de las Titis', 51, 5, null, [W('Golpe de manuscrito', 'm', 6, 2, 'imp', 'papers'), W('Escribir un libro malo', 'd', 10, 3, 'psi', 'papers')], ['trilogia'])
    ] });

  def('guille', { fac: 'mad', kind: 'hero', arch: 'infantry', align: 'l', cost: 17, defBonus: 5, res: { cut: -10 }, cls: 'Berserker de transformación',
    desc: 'Solo quería que parasen.', fx: 'fist',
    levels: [
      L('Guille', 30, 6, 25, [W('Oye, ¿puedes parar?', 'm', 6, 3, 'imp', 'fist')], ['dejame']),
      L('Guilletón', 66, 5, null, [W('Oye, ¿puedes parar?', 'm', 13, 3, 'imp', 'fist')], ['te_he_dicho'])
    ] });

  def('tia_maria', { fac: 'mad', kind: 'hero', arch: 'support', align: 'n', cost: 29, cls: 'Sacerdotisa del rock',
    desc: 'No necesita un ejército cuando tiene un concierto.', fx: 'vinyl', vetCost: [25, 35, 45],
    levels: [
      L('Tía María', 38, 5, null, [W('Vinilo arrojadizo', 'm', 4, 2, 'imp', 'vinyl'), W('Rock del Boss', 'd', 7, 3, 'psi', 'notes')], ['boss'])
    ] });

  def('tio_guillermo', { fac: 'mad', kind: 'hero', arch: 'tank', align: 'n', cost: 20, defBonus: -10, cls: 'Titán del vino',
    desc: 'La Gran Reserva nunca se rinde.', fx: 'wine',
    levels: [
      L('Tío Guillermo', 36, 4, 20, [W('Sombrerazo australiano', 'm', 6, 2, 'imp', 'fist'), W('Brindis rotundo', 'd', 4, 2, 'psi', 'wine')], ['tabernero']),
      L('Guillermo Reserva', 54, 4, 28, [W('Sombrerazo australiano', 'm', 9, 2, 'imp', 'fist'), W('Brindis rotundo', 'd', 6, 2, 'psi', 'wine')], ['cata']),
      L('Don Guillermo Crianza', 62, 4, 38, [W('Sombrerazo australiano', 'm', 11, 2, 'imp', 'fist'), W('Brindis rotundo', 'd', 7, 2, 'psi', 'wine')], ['barrica']),
      L('Guillermo Gran Reserva', 72, 4, 52, [W('Sombrerazo australiano', 'm', 12, 3, 'imp', 'fist'), W('Brindis rotundo', 'd', 8, 2, 'psi', 'wine')], ['bodega']),
      L('Emperador del Tempranillo', 84, 5, null, [W('Sombrerazo australiano', 'm', 14, 3, 'imp', 'fist'), W('Brindis rotundo', 'd', 9, 3, 'psi', 'wine')], ['gran_cosecha'], { res: { psi: 10 } })
    ] });

  def('ponchu', { fac: 'mad', kind: 'hero', arch: 'agile', align: 'c', cost: 24, defBonus: 10, cls: 'Monje de combate',
    desc: 'Pide silencio gritando.', fx: 'kick',
    levels: [
      L('Ponchu', 33, 6, 28, [W('Patada voladora', 'm', 8, 2, 'imp', 'kick'), W('GRITAR MUY FUERTE', 'd', 5, 2, 'psi', 'shout')], ['grito_guerra']),
      L('El Ponch', 44, 7, 40, [W('Patada voladora', 'm', 10, 2, 'imp', 'kick'), W('GRITAR MUY FUERTE', 'd', 6, 3, 'psi', 'shout')], ['patada_circular']),
      L('Alfonso Escribano', 59, 7, null, [W('Patada voladora', 'm', 12, 3, 'imp', 'kick'), W('GRITAR MUY FUERTE', 'd', 8, 3, 'psi', 'shout')], ['patada_estrato'])
    ] });

  def('dantart', { fac: 'mad', kind: 'hero', arch: 'infantry', align: 'n', cost: 14, defBonus: 5, cls: 'Unidad colectiva',
    desc: 'Uno solo es peligroso. Cuatro requieren un seguro.', fx: 'fist',
    levels: [
      L('Los Dantart (1/4)', 27, 6, 20, [W('Golpe de hermano', 'm', 6, 3, 'imp', 'fist')], []),
      L('Los Dantart (2/4)', 38, 6, 30, [W('Golpe de hermano', 'm', 6, 4, 'imp', 'fist')], ['relevo']),
      L('Los Dantart (3/4)', 51, 6, 40, [W('Golpe de hermano', 'm', 7, 4, 'imp', 'fist'), W('Bombardeo fraternal', 'd', 5, 2, 'pro', 'rocks')], []),
      L('Los Dantart (4/4)', 66, 6, null, [W('Golpe de hermano', 'm', 8, 5, 'imp', 'fist'), W('Bombardeo fraternal', 'd', 7, 3, 'pro', 'rocks')], ['familia'], { res: { imp: 10 } })
    ] });

  // ---------- VERANEANTES ----------
  def('santiago', { fac: 'ver', kind: 'hero', arch: 'tank', align: 'l', cost: 27, defBonus: -15, cls: 'Superpesado',
    desc: 'Una montaña con gafas.', fx: 'quake',
    levels: [
      L('Santiago Vidao', 62, 3, 30, [W('Pisotón monumental', 'm', 11, 2, 'imp', 'quake')], ['muro']),
      L('Santi Apisonadora', 74, 3, 42, [W('Pisotón monumental', 'm', 13, 2, 'imp', 'quake')], ['aplastamiento']),
      L('La Montaña de Maliayo', 91, 3, null, [W('Pisotón monumental', 'm', 15, 3, 'imp', 'quake')], ['montana'], { res: { imp: 25 } })
    ] });

  def('mario', { fac: 'ver', kind: 'hero', arch: 'support', align: 'n', cost: 25, res: { pro: 15 }, cls: 'Mercader guerrero',
    desc: 'La cuenta siempre llega.', fx: 'coins',
    levels: [
      L('Mario de la Avenida', 35, 5, 27, [W('Bandejazo', 'm', 5, 2, 'imp', 'tray'), W('Lluvia de propinas', 'd', 7, 3, 'pro', 'coins')], ['cuenta_cerrada']),
      L('Mario Propina', 45, 5, 40, [W('Bandejazo', 'm', 6, 2, 'imp', 'tray'), W('Lluvia de propinas', 'd', 9, 3, 'pro', 'coins')], ['cambio_exacto']),
      L('El Señor de la Avenida', 58, 6, null, [W('Bandejazo', 'm', 8, 2, 'imp', 'tray'), W('Lluvia de propinas', 'd', 11, 3, 'pro', 'coins')], ['enterrado'])
    ] });

  def('chanchenchi', { fac: 'ver', kind: 'hero', arch: 'agile', align: 'n', cost: 23, defBonus: 10, cls: 'Asesino escaramuzador',
    desc: 'Si lo ves, es porque ya se ha ido.', fx: 'knife', res: { imp: -15 },
    levels: [
      L('Chanchenchi', 30, 7, 26, [W('Navajita relámpago', 'm', 8, 3, 'cut', 'knife'), W('Reflejo metálico', 'd', 4, 2, 'psi', 'glint')], ['escurridizo']),
      L('El Chanche', 39, 8, 36, [W('Navajita relámpago', 'm', 9, 3, 'cut', 'knife'), W('Reflejo metálico', 'd', 5, 2, 'psi', 'glint')], ['desaparecer']),
      L('La Sombra del Prao', 50, 8, null, [W('Navajita relámpago', 'm', 12, 3, 'cut', 'knife'), W('Reflejo metálico', 'd', 6, 3, 'psi', 'glint')], ['no_me_has_visto'])
    ] });

  def('kepa_nikola', { fac: 'ver', kind: 'hero', arch: 'infantry', align: 'n', cost: 19, res: { imp: 10 }, cls: 'Luchadores de equipo',
    desc: 'La negociación acaba en suplex.', fx: 'quake',
    levels: [
      L('Kepa & Nikola', 43, 5, 32, [W('Suplex fraternal', 'm', 9, 2, 'imp', 'quake')], ['llave_vasca']),
      L('Los Hermanos del Suplex', 55, 5, 40, [W('Suplex fraternal', 'm', 12, 2, 'imp', 'quake'), W('Silla de campeonato', 'd', 5, 2, 'pro', 'chair')], []),
      L('La Dupla Imparable', 70, 5, null, [W('Suplex fraternal', 'm', 13, 3, 'imp', 'quake'), W('Silla de campeonato', 'd', 6, 2, 'pro', 'chair')], ['suplex'])
    ] });

  def('tio_tony', { fac: 'ver', kind: 'hero', arch: 'support', align: 'n', cost: 20, defBonus: -5, cls: 'Oráculo de los improperios',
    desc: 'Su vocabulario es un arma de destrucción masiva.', fx: 'shout', res: { psi: 20 },
    levels: [
      L('Tío Tony', 39, 4, 25, [W('Bastón imperativo', 'm', 5, 2, 'imp', 'fist'), W('¡BRUJA!', 'd', 8, 2, 'psi', 'shout')], ['tu_ven_aqui']),
      L('Don Tony, el Oráculo', 49, 4, 40, [W('Bastón imperativo', 'm', 6, 2, 'imp', 'fist'), W('¡BRUJA!', 'd', 10, 3, 'psi', 'shout')], ['bronca']),
      L('Tony, Azote de Brujas', 65, 5, null, [W('Bastón imperativo', 'm', 7, 2, 'imp', 'fist'), W('¡BRUJA!', 'd', 12, 3, 'psi', 'shout')], ['brujaaa'])
    ] });

  def('castro', { fac: 'ver', kind: 'hero', arch: 'mystic', align: 'n', cost: 25, res: { cha: 10 }, cls: 'Invocador aristocrático',
    desc: 'Su puma tiene mejor pedigrí que tú.', fx: 'relic',
    levels: [
      L('Castro', 34, 5, 27, [W('Bastón de señorito', 'm', 5, 2, 'imp', 'fist'), W('Reliquia carísima', 'd', 7, 3, 'pro', 'relic')], ['puma']),
      L('Lord del Puma', 45, 6, 40, [W('Bastón de señorito', 'm', 7, 2, 'imp', 'fist'), W('Reliquia carísima', 'd', 9, 3, 'pro', 'relic')], ['pedigri']),
      L('Emperador del Brilli-Brilli', 58, 6, null, [W('Bastón de señorito', 'm', 9, 2, 'imp', 'fist'), W('Reliquia carísima', 'd', 11, 3, 'pro', 'relic')], ['felino'])
    ] });

  def('changel', { fac: 'ver', kind: 'hero', arch: 'agile', align: 'c', cost: 21, defBonus: 5, cls: 'Bailarín guerrero',
    desc: 'Puede que pierdas la batalla, pero no el ritmo.', fx: 'dance', terrainBonus: { dance: 10 },
    levels: [
      L('Changel', 32, 7, 26, [W('Zapateo mortal', 'm', 7, 3, 'imp', 'kick'), W('Mirada de bachata', 'd', 4, 2, 'psi', 'hearts')], ['pasito']),
      L('Changel Sensual', 41, 7, 38, [W('Zapateo mortal', 'm', 9, 3, 'imp', 'kick'), W('Mirada de bachata', 'd', 6, 2, 'psi', 'hearts')], ['vuelta']),
      L('El Rey de la Bachata', 54, 8, null, [W('Zapateo mortal', 'm', 11, 3, 'imp', 'kick'), W('Mirada de bachata', 'd', 8, 3, 'psi', 'hearts')], ['bachata'])
    ] });

  // ---------- INVOCACIONES (nivel 0, sin mantenimiento ni zona de control) ----------
  function minion(id, fac, name, arch, hp, mov, w, desc) {
    def(id, { fac, kind: 'summon', arch, align: 'n', cost: 0, cls: 'Invocación', desc, levels: [L(name, hp, mov, null, w, [])] });
  }
  minion('amiga', 'ast', 'Amiga de Teresa', 'infantry', 16, 6, [W('Empujón solidario', 'm', 5, 2, 'imp', 'fist')], 'Ha venido porque la llamaron a gritos.');
  minion('amiga2', 'ast', 'Amiga Organizada', 'infantry', 21, 6, [W('Empujón solidario', 'm', 6, 2, 'imp', 'fist')], 'La pandilla ya tiene grupo de mensajes.');
  minion('oyente', 'mad', 'Oyente Zombi', 'mystic', 16, 4, [W('Asentir sin escuchar', 'm', 4, 2, 'psi', 'talk')], 'Lleva tres horas escuchando a Pedro. Ya no vuelve.');
  minion('boss', 'mad', 'El Boss', 'support', 22, 5, [W('Riff del Boss', 'd', 7, 2, 'psi', 'notes')], 'Una leyenda del rock genérica e inventada. Nadie sabe de dónde ha salido.');
  minion('puma', 'ver', 'Puma de Diseño', 'agile', 18, 6, [W('Zarpazo de diseño', 'm', 6, 2, 'cut', 'claw')], 'Tiene más seguidores que tú.');
  minion('puma2', 'ver', 'Puma con Pedigrí', 'agile', 25, 6, [W('Zarpazo de diseño', 'm', 8, 2, 'cut', 'claw')], 'Collar ceremonial y certificado de origen.');
  minion('puma3', 'ver', 'Puma Imperial', 'agile', 35, 6, [W('Zarpazo imperial', 'm', 10, 2, 'cut', 'claw')], 'Armadura dorada. Desprecio absoluto.');

  /* ---------- Rasgos únicos ---------- */
  VV.WSPECIAL = {
    marksman: { n: 'Puntería', d: 'Al atacar, nunca baja del 60 % de probabilidad de impacto.' },
    drain: { n: 'Absorber', d: 'Recupera la mitad del daño que inflige.' },
    charge: { n: 'Carga', d: 'Al atacar con ella, ambos bandos hacen el doble de daño.' },
    backstab: { n: 'Por la espalda', d: 'Daño doble si hay un aliado al otro lado del objetivo.' },
    firststrike: { n: 'Primer golpe', d: 'Golpea siempre primero, también al defenderse.' },
    dice: { n: 'Azar', d: 'Siempre 55 % de probabilidad de impacto, sin importar el terreno.' }
  };
  const special = (id, wname, sp, fromLvl) => U[id].levels.forEach((L, i) => { if (i >= (fromLvl || 0)) L.w.forEach(w => { if (w.n === wname) w.sp = sp; }); });
  special('pilar', '¡Puchi, vuela!', 'marksman');
  special('pedro', 'Dar la chapa', 'drain');
  special('ponchu', 'Patada voladora', 'charge');
  special('chanchenchi', 'Navajita relámpago', 'backstab');
  special('guille', 'Oye, ¿puedes parar?', 'firststrike', 1);
  special('tia_carmen', 'Dados del Catán', 'dice');
  const trait = (id, ab) => U[id].levels[0].ab.unshift(ab);
  trait('ramon', 'brindis'); trait('carlos', 'inspiracion'); trait('santiago', 'piedra'); trait('tia_maria', 'concierto'); trait('tio_guillermo', 'beber');

  VV.HEROES = { ast: [], mad: [], ver: [] };
  Object.values(U).forEach(u => { if (u.kind === 'hero') VV.HEROES[u.fac].push(u.id); });

  /* ---------------- MENSAJES HUMORÍSTICOS ---------------- */
  VV.QUIPS = {
    ramon: ['Ramón ha lanzado una copa. Nadie sabe de dónde la sacó.', 'Ramón pide otra ronda.'],
    pilar: ['Puchi ha vuelto sano y salvo.', 'Puchi aterriza, se sacude y pide pipas.'],
    teresa: ['Se ha oído un «¡CHAVALES!» a lo lejos.'],
    carlota: ['Carlota no negocia.'],
    tia_carlota: ['Tía Carlota ha cambiado la decoración sin preguntar.'],
    tia_carmen: ['La Mamen ha monopolizado la partida.', 'Tía Carmen exige que se respeten las reglas.'],
    pooh: ['Pooh está sufriendo una transformación preocupante.', 'Pooh parece arrepentido. No lo está.'],
    pedro: ['Pedro sigue hablando.', 'Pedro ha empezado otra anécdota.'],
    carlos: ['Carlos ha leído el capítulo uno. Otra vez.'],
    guille: ['Guille ha solicitado que paren.'],
    tia_maria: ['Tía María ha subido el volumen.'],
    tio_guillermo: ['Tío Guillermo ha descorchado algo con mucha crianza.'],
    ponchu: ['Ponchu ha pedido silencio. A gritos.'],
    dantart: ['Los Dantart llegan de uno en uno. Por ahora.'],
    santiago: ['El suelo tiembla: Santiago se ha movido.'],
    mario: ['Mario trae la cuenta.'],
    chanchenchi: ['¿Has visto a Chanchenchi? Exacto.'],
    kepa_nikola: ['Kepa y Nikola han resuelto el debate con un suplex.'],
    tio_tony: ['Tío Tony ha detectado otra bruja.'],
    castro: ['Castro ha comentado el precio de su reliquia.'],
    changel: ['Changel se ha venido arriba.']
  };
})(typeof window !== 'undefined' ? window : globalThis);
