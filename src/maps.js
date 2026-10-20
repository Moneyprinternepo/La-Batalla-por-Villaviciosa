/* LA BATALLA POR VILLAVICIOSA — maps.js
   Mapas en desplazamiento «odd-q» (columnas impares desplazadas hacia abajo). */
(function (G) {
  const VV = G.VV;

  // Leyenda común de caracteres → terreno (+ propiedad)
  VV.LEGEND = {
    '.': { t: 'street' }, ',': { t: 'plaza' }, g: { t: 'grass' }, T: { t: 'park' }, a: { t: 'alley' },
    b: { t: 'cover' }, '#': { t: 'wall' }, K: { t: 'keep' }, C: { t: 'castle' }, W: { t: 'water' },
    M: { t: 'mud' }, d: { t: 'dance' }, t: { t: 'grass', obstacle: 'tables' }, '=': { t: 'street' },
    S: { t: 'tavern', prop: 'sidreria' }, G: { t: 'plaza', prop: 'guevu' }, R: { t: 'cover', prop: 'palco' },
    I: { t: 'cover', prop: 'iglesia' }, A: { t: 'plaza', prop: 'abastos' }, c: { t: 'tavern', prop: 'caseta' },
    X: { t: 'tavern', prop: 'barra' }, E: { t: 'stage', prop: 'escenario' }, F: { t: 'grass', prop: 'banderines' }
  };

  VV.PROPKINDS = {
    sidreria: { gold: 2, heal: 8, bar: true, d: 'Puesto con bandera: cura 8 PV al empezar el turno y da 2 de oro por ronda.' },
    guevu: { gold: 4, heal: 8, d: 'Puesto con bandera: cura 8 PV y da 4 de oro por ronda. El corazón de la Villa.' },
    palco: { gold: 2, heal: 8, def: 5, d: 'Puesto con bandera: cura 8 PV, da oro y +5 de defensa a quien lo ocupa.' },
    iglesia: { gold: 2, heal: 8, d: 'Puesto con bandera: cura 8 PV al empezar el turno y da 2 de oro.' },
    abastos: { gold: 4, heal: 8, d: 'Puesto con bandera: cura 8 PV y da 4 de oro por ronda. Mercado de la Villa.' },
    caseta: { gold: 2, heal: 8, bar: true, d: 'Puesto con bandera: caseta de peña que cura 8 PV y da 2 de oro.' },
    barra: { gold: 3, heal: 8, bar: true, d: 'Puesto con bandera: la Gran Barra cura 8 PV y da 3 de oro.' },
    escenario: { gold: 2, heal: 8, def: 5, d: 'Puesto con bandera: cura 8 PV, da oro y +5 de defensa en la plataforma.' },
    banderines: { gold: 4, heal: 8, d: 'Puesto con bandera: cura 8 PV y da 4 de oro por ronda.' }
  };

  VV.MAPS = {
    villa: {
      n: 'La Villa',
      sub: 'Casco urbano de Villaviciosa junto a la ría: calles estrechas, soportales, parques y diecisiete puestos con bandera.',
      rows: [
        'WWWWWWWWWWWWWWWWWWWWWWWWWW',
        'WWggTTWWg..####..gWWTTggWW',
        'gggTTTg....####....gTTTggg',
        'gSgTTg..T..,I,,..T..gTTgSg',
        'ggg..a..TT.,,,,.TT..a..ggg',
        'g..##a##..S....S..##a##..g',
        '..b##..##a......a##..##b..',
        'gCC...a..########..a...CCg',
        'gCCT..b..##,,,,##..b..TCCg',
        'gKCTT...,,,,G,,,,,...TTCKg',
        'gCC.T...,,,,,,,,,,...T.CCg',
        'gg.....b..##,,##..b.....gg',
        'gS..##a..S##..##S..a##..Sg',
        'gg..##a............a##..gg',
        'TT.a..S##..####..##R..a.TT',
        'TTT..S.##..####..##.S..TTT',
        'gTT.....,,..A,..,,.....TTg',
        'ggTTg...,,.S..S.,,...gTTgg',
        'gggTTgg............ggTTggg',
        'ggggTTTggggggggggggTTTgggg'
      ],
      names: {
        '12,3': 'Entorno de Santa María de la Oliva', '12,9': 'Plaza del Güevu', '19,14': 'Palco del Riera', '12,16': 'Plaza de Abastos',
        '1,3': 'Sidrería El Culín Eterno', '24,3': 'Chigre La Pipa Alegre', '10,5': 'Casería de la Ría', '15,5': 'Chigre El Fondín',
        '1,12': 'Sidrería El Escanciador Dormido', '24,12': 'Casería Les Mazanes', '9,12': 'Chigre El Último Tren', '16,12': 'Sidrería La Pumarada',
        '6,14': 'Casería del Hórreo', '5,15': 'Chigre El Llagar', '20,15': 'Casería La Quintana', '11,17': 'Sidrería El Tonel', '14,17': 'Chigre La Espicha'
      },
      landmarks: [
        { k: 'iglesia', tiles: [[11, 1], [12, 1], [13, 1], [14, 1], [11, 2], [12, 2], [13, 2], [14, 2]] },
        { k: 'ayuntamiento', tiles: [[11, 7], [12, 7], [13, 7], [14, 7]] },
        { k: 'abastos', tiles: [[11, 14], [12, 14], [13, 14], [14, 14], [11, 15], [12, 15], [13, 15], [14, 15]] },
        { k: 'hevia', tiles: [[7, 14], [8, 14], [7, 15], [8, 15]] },
        { k: 'teatro', tiles: [[17, 14], [18, 14], [17, 15], [18, 15]] }
      ],
      keeps: [[1, 9], [24, 9]],
      teatro: [19, 14],
      events: 'villa'
    },
    xiringuelu: {
      n: 'El Xiringüelu',
      sub: 'Gran prao festivo inspirado en el Prau Salcéu de Pravia: campo abierto, río, barro y quince puestos con bandera.',
      rows: [
        'TTTgggggggggg####ggggggggggTTT',
        'TTggggcgggggg####ggggggcggggTT',
        'Tggg#ggggggdddEddddgggggg#gggT',
        'gggggggMMgggddddddgggMMggggggg',
        'gCCggMMMggggggggggggggMMMggCCg',
        'gKCgMMgggcggtggggtggcgggMMgCKg',
        'gCCggggggggggggggggggggggggCCg',
        'ggggggggggggggFggggggggggggggg',
        'ggTggcgggggMMggggMMgggggcggTgg',
        'gTTggggtggMMMggggMMMggtggggTTg',
        'gggggggtgggggttttgggggtggggggg',
        'ggggcgggggggt####tgggggggcgggg',
        'ggMMggggggggtgXbgtggggggggMMgg',
        'gMMMgggcgggggg..ggggggcgggMMMg',
        'gggggggggTTggggggggTTggggggggg',
        'ggTTgggggTTggcggcggTTgggggTTgg',
        'WWggggggWWWggggggggWWWggggggWW',
        'WWWWggWWWWWWWggggWWWWWWWggWWWW',
        'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
        'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW'
      ],
      names: {
        '6,1': 'Peña Les Copines', '23,1': 'Peña ¡Quién Trajo Esto!', '5,8': 'Peña del Últimu Culín', '24,8': 'Peña Desfase Controlado',
        '9,5': 'Peña La Gaita Rota', '20,5': 'Peña El Culete', '4,11': 'Peña Los del Fondo', '25,11': 'Peña Sidra y Sombra',
        '7,13': 'Peña El Prau Mojao', '22,13': 'Peña Los Ronceros', '13,15': 'Peña La Fartura', '16,15': 'Peña Madrugada Eterna',
        '14,2': 'Escenario de la Orquesta', '14,7': 'Zona de Banderines', '14,12': 'La Gran Barra'
      },
      landmarks: [
        { k: 'stage', tiles: [[13, 0], [14, 0], [15, 0], [16, 0], [13, 1], [14, 1], [15, 1], [16, 1]] },
        { k: 'barra', tiles: [[13, 11], [14, 11], [15, 11], [16, 11]] },
        { k: 'tent', tiles: [[4, 2]], label: '', col: '#2c6fd6' },
        { k: 'tent', tiles: [[25, 2]], label: '', col: '#e8463a' }
      ],
      keeps: [[1, 5], [28, 5]],
      stage: [14, 2],
      charanga: 7,
      events: 'xiringuelu'
    }
  };

  // Eventos programados: aparecen anunciados una ronda antes.
  VV.EVENTS = {
    mercau: { n: 'Mercau de la Villa', d: 'La Plaza de Abastos entrega +3 de oro adicionales a quien la controle.' },
    orbayu: { n: 'Orbayu asturianu', d: 'Aparecen charcos en algunas calles: +1 al coste de movimiento durante dos rondas.' },
    campanada: { n: 'Campanada del Riera', d: 'Las unidades a dos hexágonos o menos del Teatro Riera reciben Inspirado.' },
    subidon: { n: 'Subidón de la Orquesta', d: 'Las unidades a dos hexágonos o menos del escenario reciben Inspirado.' },
    charanga: { n: 'Avalancha de la Charanga', d: 'La charanga cruza el prao por la fila central: Mareado a quien se interponga.' },
    temazo: { n: 'Temazo de la Orquesta', d: 'Las unidades en la pista de baile reciben +1 de movimiento esta ronda.' },
    barralibre: { n: 'Barra Libre de Sidra Fantástica', d: 'Las unidades en barras y casetas, o junto a ellas, se curan 3 PV.' }
  };
  VV.eventsForRound = function (mapId, round) {
    const out = [];
    if (round < 2) return out;
    if (mapId === 'villa') {
      if (round % 4 === 0) out.push(['mercau', 'orbayu', 'campanada'][(round / 4 - 1) % 3]);
    } else {
      if (round % 4 === 0) out.push(['subidon', 'charanga', 'temazo'][(round / 4 - 1) % 3]);
      if (round % 5 === 0) out.push('barralibre');
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
