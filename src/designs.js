/* LA BATALLA POR VILLAVICIOSA — designs.js
   Diseño visual de cada nivel: constitución, piel, pelo, ropa por capas, tocados,
   objetos en mano y extras. Cada evolución cambia al menos tres elementos. */
(function (G) {
  const VV = G.VV;
  const SK = { fair: '#f1c9a6', light: '#e5b088', tan: '#c88d5e', brown: '#a2673b', dark: '#7a4824', stone: '#b5a690', zombie: '#a9c39a' };
  const HR = { blond: '#e6bd4e', gold: '#f2cf62', black: '#201c27', brown: '#5b3a22', dbrown: '#3a2416', grey: '#c9c9cf' };
  const D = {
    /* ---------------- ASTURES ---------------- */
    ramon: [
      { b: 'ath', skin: SK.fair, hair: ['short', HR.blond], face: 'happy', top: ['tee', '#f2f0ea'], legs: '#3b5ea8', shoes: ['sneak', '#e6e6e6'], hold: 'cup', wear: [['belt', '#4e342e', '#9aa3ad']] },
      { b: 'ath', skin: SK.fair, hair: ['quiff', HR.blond], face: 'happy', top: ['open', '#e4572e'], legs: '#2f4f8f', shoes: ['sneak', '#ffffff'], hold: 'cup', holdF: 'cup', head: [['sunglasses']], wear: [['belt', '#3e2723', '#d4af37'], ['chain']] },
      { b: 'ath', dh: 2, skin: SK.fair, hair: ['slick', HR.blond], beard: ['mustache', '#c79a35'], face: 'smug', top: ['shirt', '#f4f1ea'], legs: '#1f3d27', shoes: ['boots', '#3a2416'], hold: 'bigcup', head: [['corks']], wear: [['capecheck'], ['suit', '#2f5d3a', '#f4f1ea', '#d4af37'], ['belt', '#3e2723', '#d4af37']] }
    ],
    pilar: [
      { b: 'short', fem: 1, skin: SK.fair, hair: ['pony', HR.blond], face: 'happy', top: ['tee', '#ffffff'], legs: '#5d6d7e', shoes: ['sneak', '#ff8fab'], wear: [['jacket', '#a9d8ef', '#ffffff']], extra: ['hamsterPocket'] },
      { b: 'short', fem: 1, skin: SK.fair, hair: ['ponybig', HR.blond], face: 'happy', top: ['tee', '#fff6d5'], legs: '#4a5a6a', shoes: ['boots', '#8d6e63'], wear: [['jacket', '#3d8fc4', '#fff6d5'], ['bandolier'], ['gloves', '#8d6e63']], extra: ['hamsterG'] },
      { b: 'short', fem: 1, dh: 2, skin: SK.fair, hair: ['ponybig', HR.gold], face: 'smug', top: ['tee', '#fff6d5'], legs: '#3e4b58', shoes: ['boots', '#d4a92a'], hold: 'wheelbow', wear: [['cape', '#f2c12e', '#d4af37'], ['armor', '#b0bec5', '#f2c12e'], ['gloves', '#6d4c41']], extra: ['hamsterH'] }
    ],
    teresa: [
      { b: 'norm', fem: 1, skin: SK.light, hair: ['long', HR.black], face: 'angry', top: ['sport', '#5f6b73', '#e0e0e0'], legs: '#26262e', shoes: ['boots', '#5a3a22'] },
      { b: 'norm', fem: 1, skin: SK.light, hair: ['pony', HR.black], face: 'angry', top: ['tank', '#212121'], legs: '#212121', shoes: ['boots', '#4e342e'], wear: [['jacket', '#c62828', '#212121'], ['spikegloves']] },
      { b: 'muscle', fem: 1, skin: SK.light, hair: ['messy', HR.black], face: 'rage', top: ['tank', '#b71c1c'], legs: '#212121', shoes: ['boots', '#3e2723'], wear: [['pauldrons', '#6d4c41'], ['spikegloves'], ['belt', '#3e2723', '#9aa3ad']] }
    ],
    carlota: [
      { b: 'big', fem: 1, dh: 4, skin: SK.fair, hair: ['bun', HR.brown], face: 'neutral', top: ['tee', '#37474f'], legs: '#263238', shoes: ['sneak', '#eceff1'], wear: [['hoodie', '#37474f'], ['bigfists']] },
      { b: 'huge', fem: 1, dh: 2, skin: SK.fair, hair: ['bun', HR.brown], face: 'angry', top: ['tee', '#263238'], legs: '#263238', shoes: ['boots', '#3e2723'], wear: [['barrel'], ['pauldrons', '#6d4c41'], ['biggloves', '#c62828']] }
    ],
    tia_carlota: [
      { b: 'norm', fem: 1, skin: SK.light, hair: ['bob', HR.dbrown], face: 'smug', top: ['shirt', '#efebe9'], legs: '#3e2723', shoes: ['shoes', '#212121'], holdF: 'catalog', head: [['glasses', '#d81b60']], wear: [['jacket', '#8a5e4a', '#efebe9']], extra: ['cushion'] },
      { b: 'norm', fem: 1, skin: SK.light, hair: ['bob', HR.dbrown], face: 'smug', top: ['shirt', '#f5e6c8'], legs: '#1f1f2b', shoes: ['shoes', '#d4af37'], holdF: 'catalog_gold', head: [['glasses', '#d4af37'], ['wallcrown']], wear: [['suit', '#1f1f2b', '#f5e6c8', '#d4af37']], extra: ['lamp', 'mirror'] }
    ],
    tia_carmen: [
      { b: 'norm', fem: 1, skin: SK.light, hair: ['curly', HR.dbrown], face: 'smug', top: ['shirt', '#fff3c4'], legs: '#455a64', shoes: ['shoes', '#795548'], holdF: 'box', head: [['glasses', '#37474f']], wear: [['vest', '#e91e63']], extra: ['dice'] },
      { b: 'norm', fem: 1, skin: SK.light, hair: ['curly', HR.dbrown], face: 'smug', top: ['shirt', '#ffe082'], legs: '#455a64', shoes: ['shoes', '#795548'], hold: 'dicestaff', head: [['glasses', '#37474f'], ['dicecrown']], wear: [['boardcape'], ['robe', '#c2185b', '#ffd54f']], extra: ['hexes'] }
    ],
    pooh: [{ body: 'dog', stage: 0 }, { body: 'dog', stage: 1, aura: 'toxic' }, { body: 'dog', stage: 2, aura: 'toxic' }],

    /* ---------------- MADRILES ---------------- */
    pedro: [
      { b: 'tall', skin: SK.light, hair: ['short', HR.black], face: 'talk', top: ['tee', '#25252f'], legs: '#263238', shoes: ['shoes', '#111111'], hold: 'book' },
      { b: 'tall', skin: SK.light, hair: ['long', HR.black], face: 'talk', top: ['shirt', '#2a1d3f'], legs: '#1a0d33', shoes: ['shoes', '#111111'], hold: 'mic', wear: [['robe', '#4a148c', '#b39ddb']], extra: ['bookF'], aura: 'violet' },
      { b: 'tall', skin: SK.light, hair: ['melena', HR.black], face: 'smug', top: ['shirt', '#2a1d3f'], legs: '#1a0d33', shoes: ['shoes', '#d4af37'], hold: 'micgold', head: [['crown']], wear: [['cape', '#160b30', '#d4af37'], ['robe', '#311b92', '#d4af37']], aura: 'violet2' }
    ],
    carlos: [
      { b: 'norm', skin: SK.light, hair: ['messy', HR.dbrown], face: 'neutral', top: ['tee', '#5c6bc0'], legs: '#37474f', shoes: ['sneak', '#eeeeee'], holdF: 'notebook', wear: [['backpack']] },
      { b: 'norm', skin: SK.light, hair: ['messy', HR.dbrown], face: 'smug', top: ['shirt', '#e8e2d2'], legs: '#37474f', shoes: ['shoes', '#4e342e'], head: [['glasses', '#212121']], wear: [['coat', '#b49a6a', '#5c6bc0'], ['scarf', '#5c6bc0']], extra: ['typewriter', 'papers'] },
      { b: 'ath', skin: SK.light, hair: ['messy', HR.dbrown], face: 'smug', top: ['shirt', '#a5d6a7'], legs: '#1b5e20', shoes: ['boots', '#4e342e'], hold: 'pen', head: [['horns'], ['glasses', '#4dd0e1']], wear: [['cape', '#b71c1c', '#d4af37'], ['armor', '#2e7d32', '#a5d6a7'], ['pauldrons', '#2e7d32', 'metal']], extra: ['books'], aura: 'green' }
    ],
    guille: [
      { b: 'thin', skin: SK.fair, hair: ['short', HR.brown], face: 'tired', top: ['oversize', '#9e9e9e'], legs: '#455a64', shoes: ['sneak', '#fafafa'] },
      { b: 'muscle', dh: 4, skin: SK.fair, hair: ['messy', HR.brown], face: 'rage', top: ['torn', '#9e9e9e'], legs: '#37474f', shoes: ['sneak', '#fafafa'], wear: [['belt', '#3e2723', '#9aa3ad']], aura: 'red' }
    ],
    tia_maria: [
      { b: 'norm', fem: 1, skin: SK.light, hair: ['long', HR.black], face: 'smug', top: ['tee', '#b71c1c'], legs: '#1a1a1a', shoes: ['boots', '#b71c1c'], hold: 'vinyl', head: [['sunglasses']], wear: [['leather', '#212121', '#b71c1c'], ['scarf', '#d32f2f'], ['belt', '#212121', '#c9c9c9']] }
    ],
    tio_guillermo: [
      { b: 'big', skin: SK.light, hair: ['short', HR.grey], face: 'happy', top: ['shirt', '#efebe9'], legs: '#6d4c41', shoes: ['boots', '#3e2723'], hold: 'wineglass', head: [['aussie', 0]], wear: [['vest', '#a1887f']] },
      { b: 'big', skin: SK.light, hair: ['short', HR.grey], beard: ['bigmustache', '#d8d8de'], face: 'happy', top: ['shirt', '#efebe9'], legs: '#5d4037', shoes: ['boots', '#3e2723'], hold: 'wineglass', holdF: 'bottle', head: [['aussie', 1]], wear: [['vest', '#6d4c41']] },
      { b: 'huge', skin: SK.light, hair: ['short', HR.grey], beard: ['bigmustache', '#d8d8de'], face: 'happy', top: ['shirt', '#f3e5f5'], legs: '#4e342e', shoes: ['boots', '#3e2723'], hold: 'bottle', head: [['aussie', 2]], wear: [['capecheck'], ['barrelback'], ['vest', '#7b1f2a']], aura: 'wine' },
      { b: 'huge', skin: SK.light, hair: ['short', HR.grey], beard: ['bigmustache', '#d8d8de'], face: 'smug', top: ['shirt', '#efe0d0'], legs: '#3e2723', shoes: ['boots', '#212121'], hold: 'goldcup', head: [['aussie', 3]], wear: [['barrelback'], ['barrel']], aura: 'wine' },
      { b: 'huge', dh: 4, skin: SK.light, hair: ['short', HR.grey], beard: ['bigmustache', '#d8d8de'], face: 'smug', top: ['shirt', '#d4af37'], legs: '#4a0e16', shoes: ['boots', '#d4af37'], hold: 'goldcup', head: [['aussie', 4]], wear: [['cape', '#5e0b18', '#d4af37'], ['barrels2'], ['armor', '#7b1f2a', '#d4af37']], aura: 'wine2' }
    ],
    ponchu: [
      { b: 'ath', skin: SK.brown, hair: ['short', HR.black], face: 'shout', top: ['sport', '#1565c0', '#ffffff'], legs: '#212121', shoes: ['bigsneak', '#ffffff'] },
      { b: 'ath', skin: SK.brown, hair: ['short', HR.black], face: 'shout', top: ['tank', '#212121'], legs: '#424242', shoes: ['bigsneak', '#ffffff'], head: [['headband', '#d32f2f']], wear: [['gloves', '#d32f2f'], ['belt', '#d32f2f', '#212121']], aura: 'red' },
      { b: 'ath', dh: 2, skin: SK.brown, hair: ['messy', HR.black], face: 'shout', top: ['shirt', '#fafafa'], legs: '#f2f2f2', shoes: ['bare', SK.brown], head: [['headband', '#d4af37']], wear: [['gi', '#f6f3ea'], ['belt', '#d4af37', '#d4af37']], aura: 'electric' }
    ],
    dantart: [{ body: 'group', n: 1 }, { body: 'group', n: 2 }, { body: 'group', n: 3 }, { body: 'group', n: 4, aura: 'flag' }],

    /* ---------------- VERANEANTES ---------------- */
    santiago: [
      { b: 'big', dh: 4, skin: SK.light, hair: ['short', HR.black], face: 'neutral', top: ['tee', '#455a64'], legs: '#263238', shoes: ['shoes', '#212121'], head: [['glasses', '#212121']] },
      { b: 'huge', skin: SK.light, hair: ['short', HR.black], face: 'angry', top: ['tee', '#3a4a52'], legs: '#263238', shoes: ['boots', '#212121'], head: [['bigglasses', '#111111']], wear: [['armor', '#7d7d7d', '#a1887f'], ['pauldrons', '#795548']], aura: 'earth' },
      { b: 'huge', dh: 6, skin: SK.stone, hair: ['moss', '#5b8f30'], face: 'neutral', top: ['rock', '#8d8478', '#5d564d'], legs: '#6d665c', shoes: ['bare', '#7d766c'], head: [['bigglasses', '#111111']], wear: [['moss']], aura: 'earth' }
    ],
    mario: [
      { b: 'norm', skin: SK.light, hair: ['slick', HR.black], face: 'smug', top: ['shirt', '#fafafa'], legs: '#212121', shoes: ['shoes', '#111111'], hold: 'tray', wear: [['waiter', '#212121'], ['apron', '#f4f1ea']], extra: ['bills'] },
      { b: 'norm', skin: SK.light, hair: ['slick', HR.black], face: 'smug', top: ['shirt', '#fff8e1'], legs: '#212121', shoes: ['shoes', '#111111'], hold: 'tray', holdF: 'tray', wear: [['waiter', '#7b1fa2'], ['bowtie', '#d4af37']], extra: ['coins'] },
      { b: 'ath', skin: SK.light, hair: ['slick', HR.black], face: 'smug', top: ['shirt', '#fafafa'], legs: '#263238', shoes: ['shoes', '#d4af37'], hold: 'goldtray', wear: [['capebills'], ['suit', '#263238', '#fafafa', '#d4af37'], ['chain']], extra: ['register'], aura: 'gold' }
    ],
    chanchenchi: [
      { b: 'thin', dh: -4, skin: SK.brown, hair: ['short', HR.black], face: 'smug', top: ['tee', '#ff9800'], legs: '#37474f', shoes: ['sneak', '#fafafa'], hold: 'knife', head: [['cap', '#212121']] },
      { b: 'thin', dh: -4, skin: SK.brown, hair: ['short', HR.black], face: 'smug', top: ['tee', '#263238'], legs: '#212121', shoes: ['sneak', '#424242'], hold: 'knife', holdF: 'knife', wear: [['hoodie', '#263238'], ['hoodup', '#263238'], ['belt', '#5d4037', '#8d6e63']] },
      { b: 'thin', dh: -2, skin: SK.brown, hair: ['short', HR.black], face: 'eyes', top: ['shirt', '#120d1a'], legs: '#111111', shoes: ['boots', '#111111'], hold: 'knife', holdF: 'knife', wear: [['cloak', '#1a1a2e', '#4a148c']], aura: 'shadow' }
    ],
    kepa_nikola: [{ body: 'duo', stage: 0 }, { body: 'duo', stage: 1 }, { body: 'duo', stage: 2, aura: 'gold' }],
    tio_tony: [{ body: 'chair', stage: 0 }, { body: 'chair', stage: 1, aura: 'shout' }, { body: 'chair', stage: 2, aura: 'violet' }],
    castro: [
      { b: 'norm', skin: SK.tan, hair: ['slick', HR.black], face: 'smug', top: ['polo', '#f8bbd0'], legs: '#d7ccc8', shoes: ['shoes', '#6d4c41'], hold: 'cane', wear: [['sweater', '#1e88e5'], ['chain'], ['belt', '#6d4c41', '#d4af37']] },
      { b: 'norm', skin: SK.tan, hair: ['slick', HR.black], face: 'smug', top: ['shirt', '#f3e5f5'], legs: '#5d4037', shoes: ['boots', '#3e2723'], hold: 'cane', wear: [['cape', '#6a1b9a', '#d4af37'], ['jacket', '#c8a96a', '#6a1b9a'], ['epaulets']] },
      { b: 'ath', skin: SK.tan, hair: ['slick', HR.black], face: 'smug', top: ['shirt', '#4a148c'], legs: '#4a148c', shoes: ['boots', '#d4af37'], hold: 'cane', head: [['crown']], wear: [['bigcape', '#4a148c', '#d4af37'], ['armor', '#d4af37', '#4a148c'], ['jewels']], aura: 'glitter' }
    ],
    changel: [
      { b: 'norm', skin: SK.light, hair: ['slick', HR.dbrown], face: 'smug', top: ['shirt', '#e1bee7'], legs: '#6a1b9a', shoes: ['shoes', '#111111'], hold: 'rose', wear: [['suit', '#7b1fa2', '#e1bee7', '#4a148c']] },
      { b: 'norm', skin: SK.light, hair: ['quiff', HR.dbrown], face: 'smug', top: ['open', '#ab47bc'], legs: '#6a1b9a', shoes: ['shoes', '#d4af37'], hold: 'rose', wear: [['scarf', '#4a148c'], ['chain'], ['belt', '#4a148c', '#d4af37']], aura: 'music' },
      { b: 'ath', skin: SK.light, hair: ['quiff', HR.dbrown], face: 'smug', top: ['open', '#6a1b9a'], legs: '#4a148c', shoes: ['shoes', '#ffd54f'], head: [['crownS']], wear: [['cape', '#311b92', '#ffd54f'], ['sequin', '#6a1b9a', '#ffd54f'], ['chain']], aura: 'music' }
    ],

    /* ---------------- INVOCACIONES ---------------- */
    amiga: [{ b: 'short', fem: 1, skin: SK.fair, hair: ['pony', HR.brown], face: 'angry', top: ['sport', '#ef6c00', '#ffffff'], legs: '#263238', shoes: ['sneak', '#ffffff'] }],
    amiga2: [{ b: 'norm', fem: 1, skin: SK.fair, hair: ['bun', HR.blond], face: 'angry', top: ['tank', '#212121'], legs: '#263238', shoes: ['boots', '#3e2723'], wear: [['jacket', '#ad1457', '#212121'], ['spikegloves']] }],
    oyente: [{ b: 'norm', skin: SK.zombie, hair: ['messy', '#6d6d5d'], face: 'zombie', top: ['tee', '#7d8a6d'], legs: '#4d5545', shoes: ['shoes', '#333333'], armsOut: 1 }],
    boss: [{ b: 'ath', skin: SK.light, hair: ['short', HR.dbrown], face: 'shout', top: ['tee', '#f2f2f2'], legs: '#3b5ea8', shoes: ['boots', '#5d4037'], hold: 'guitar', head: [['bandana', '#c62828']], wear: [['leather', '#2b2b2b', '#f2f2f2'], ['belt', '#3e2723', '#c9c9c9']], ghost: 1 }],
    puma: [{ body: 'puma', stage: 0 }], puma2: [{ body: 'puma', stage: 1 }], puma3: [{ body: 'puma', stage: 2 }]
  };
  VV.DESIGN = D;
  for (const id in D) {
    const u = VV.UNITS[id]; if (!u) continue;
    D[id].forEach((sp, i) => { if (u.levels[i]) u.levels[i].sp = sp; });
  }
})(typeof window !== 'undefined' ? window : globalThis);
