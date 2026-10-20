/* LA BATALLA POR VILLAVICIOSA — audio.js
   Efectos retro y banda sonora original de inspiración asturiana, generadas con
   Web Audio: gaita con ornamentos (floreos), roncón continuo, cuerdas lentas,
   tambor y reverberación de sala. Compás de 3/4 a 66 pulsaciones por minuto. */
(function (G) {
  const VV = G.VV;
  const AU = (VV.Audio = { vol: 0.6, sfxOn: true, musicOn: true, muted: false });
  let ctx = null, master = null, musicGain = null, sfxGain = null, rev = null, revGain = null, timer = null;
  let nextT = 0, evIdx = 0, loopStart = 0;

  function impulse(sec, decay) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  AU.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = G.AudioContext || G.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
    rev = ctx.createConvolver(); rev.buffer = impulse(3.2, 2.6); revGain = ctx.createGain(); revGain.gain.value = 0.42; rev.connect(revGain); revGain.connect(master);
    musicGain = ctx.createGain(); musicGain.connect(master); musicGain.connect(rev);
    sfxGain = ctx.createGain(); sfxGain.connect(master);
    AU.apply();
    if (AU.musicOn) AU.startMusic();
  };
  AU.apply = function () { if (!master) return; master.gain.value = AU.muted ? 0 : AU.vol; musicGain.gain.value = AU.musicOn ? 0.5 : 0; sfxGain.gain.value = AU.sfxOn ? 1 : 0; };
  AU.toggleMute = function () { AU.muted = !AU.muted; AU.apply(); return AU.muted; };
  const N = n => 440 * Math.pow(2, (n - 69) / 12);

  /* ---------- Efectos ---------- */
  function tone(f, t0, dur, type, vol, dest, slide) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfxGain); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, vol, freq, q, dest) {
    const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = q || 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol || 0.3, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest || sfxGain); src.start(t0);
  }
  AU.sfx = function (name) {
    if (!ctx || !AU.sfxOn || AU.muted) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'select': tone(660, t, 0.07, 'triangle', 0.07, null, 990); break;
      case 'move': noise(t, 0.05, 0.06, 450, 2); break;
      case 'hit': noise(t, 0.14, 0.3, 800, 0.7); tone(110, t, 0.14, 'triangle', 0.18, null, 55); break;
      case 'miss': noise(t, 0.2, 0.1, 2400, 3); break;
      case 'throw': tone(520, t, 0.14, 'triangle', 0.07, null, 980); break;
      case 'levelup': [62, 66, 69, 74, 78].forEach((n, k) => tone(N(n), t + k * 0.1, 0.35, 'triangle', 0.12)); break;
      case 'capture': tone(N(69), t, 0.15, 'triangle', 0.1); tone(N(76), t + 0.14, 0.35, 'triangle', 0.1); break;
      case 'recruit': [62, 69, 74].forEach((n, k) => tone(N(n), t + k * 0.09, 0.2, 'triangle', 0.12)); break;
      case 'summon': tone(300, t, 0.6, 'sine', 0.16, null, 900); tone(450, t + 0.05, 0.55, 'triangle', 0.07, null, 1350); break;
      case 'ability': [81, 86, 90].forEach((n, k) => tone(N(n), t + k * 0.06, 0.16, 'triangle', 0.08)); break;
      case 'death': tone(280, t, 0.5, 'triangle', 0.12, null, 70); break;
      case 'turn': tone(N(69), t, 0.5, 'sine', 0.1); tone(N(76), t + 0.16, 0.6, 'sine', 0.08); break;
      case 'quake': noise(t, 0.7, 0.4, 110, 0.5); tone(55, t, 0.6, 'sawtooth', 0.1, null, 38); break;
      case 'victory': [62, 69, 74, 78, 81, 78, 86].forEach((n, k) => tone(N(n), t + k * 0.18, 0.4, 'triangle', 0.12)); break;
      case 'defeat': [69, 65, 62, 57].forEach((n, k) => tone(N(n), t + k * 0.28, 0.5, 'triangle', 0.12)); break;
      case 'coin': tone(N(88), t, 0.06, 'triangle', 0.08); tone(N(93), t + 0.07, 0.14, 'triangle', 0.08); break;
      case 'event': [69, 72, 76, 81].forEach((n, k) => tone(N(n), t + k * 0.12, 0.3, 'triangle', 0.08)); break;
    }
  };

  /* ---------- Música ----------
     La melodía está en La eólico con séptima natural (modo frecuente en la gaita),
     en 3/4. Cada frase dura cuatro compases; las secciones se encadenan:
     introducción, tema A, tema B, interludio de roncón y tambor, A con variación,
     B con final y coda. Unos 2 minutos y 20 segundos antes de repetir. */
  const BEAT = 60 / 66;
  const A1 = [[69, 2], [71, 0.5], [72, 0.5], [74, 1.5], [72, 0.5], [71, 1], [69, 1], [67, 1], [69, 1], [64, 3]];
  const A2 = [[69, 2], [71, 0.5], [72, 0.5], [74, 1], [76, 1], [77, 1], [76, 1.5], [74, 0.5], [72, 1], [74, 3]];
  const A3 = [[76, 2], [74, 0.5], [72, 0.5], [71, 1.5], [72, 0.5], [74, 1], [72, 1], [71, 1], [67, 1], [69, 3]];
  const B1 = [[76, 1], [79, 2], [77, 1], [76, 1], [74, 1], [76, 2], [72, 1], [74, 3]];
  const B2 = [[72, 1], [74, 1], [76, 1], [77, 2], [76, 1], [74, 1], [72, 1], [71, 1], [69, 3]];
  const B3 = [[79, 2], [77, 0.5], [76, 0.5], [77, 1.5], [76, 0.5], [74, 1], [72, 1], [74, 1], [71, 1], [69, 3]];
  const C1 = [[64, 3], [67, 2], [69, 1], [71, 3], [69, 3]];
  const C2 = [[72, 2], [71, 1], [69, 3], [67, 2], [64, 1], [69, 3]];
  // acordes por compás (raíz, tipo)
  const H_A = [['A', 'm'], ['G', 'M'], ['F', 'M'], ['E', 'm'], ['A', 'm'], ['G', 'M'], ['F', 'M'], ['G', 'M']];
  const H_A3 = [['C', 'M'], ['G', 'M'], ['F', 'M'], ['A', 'm']];
  const H_B = [['C', 'M'], ['D', 'm'], ['C', 'M'], ['G', 'M'], ['F', 'M'], ['G', 'M'], ['E', 'm'], ['A', 'm']];
  const ROOT = { A: 57, B: 59, C: 48, D: 50, E: 52, F: 53, G: 55 };
  const SECTIONS = [
    { mel: null, harm: [['A', 'm'], ['A', 'm'], ['G', 'M'], ['A', 'm']], drone: 1, drum: 0, pad: 1 },
    { mel: [A1, A2], harm: H_A, drone: 1, drum: 1, pad: 1 },
    { mel: [B1, B2], harm: H_B, drone: 1, drum: 1, pad: 1, swell: 1 },
    { mel: [C1, C2], harm: [['A', 'm'], ['G', 'M'], ['F', 'M'], ['E', 'm'], ['A', 'm'], ['F', 'M'], ['G', 'M'], ['A', 'm']], drone: 1, drum: 2, pad: 1, low: 1 },
    { mel: [A1, A3], harm: H_A.slice(0, 4).concat(H_A3), drone: 1, drum: 1, pad: 1 },
    { mel: [B1, B3], harm: H_B, drone: 1, drum: 1, pad: 1, swell: 1 },
    { mel: null, harm: [['A', 'm'], ['F', 'M'], ['G', 'M'], ['A', 'm']], drone: 1, drum: 0, pad: 1 }
  ];
  // Precalcula una lista de eventos con su instante en pulsos
  const EVENTS = (() => {
    const ev = []; let beat = 0;
    SECTIONS.forEach((sec, si) => {
      const bars = sec.harm.length;
      sec.harm.forEach((h, b) => ev.push({ t: beat + b * 3, k: 'chord', h, low: sec.low, swell: sec.swell }));
      if (sec.drone) ev.push({ t: beat, k: 'drone', len: bars * 3 });
      for (let b = 0; b < bars; b++) {
        if (sec.drum === 1) { ev.push({ t: beat + b * 3, k: 'kick' }); if (b % 2 === 1) ev.push({ t: beat + b * 3 + 2, k: 'roll' }); }
        if (sec.drum === 2) { ev.push({ t: beat + b * 3, k: 'kick', soft: 1 }); ev.push({ t: beat + b * 3 + 1.5, k: 'tap' }); }
      }
      if (sec.mel) {
        let t = beat;
        sec.mel.forEach(ph => ph.forEach(([n, d]) => { ev.push({ t, k: 'note', n: sec.low ? n - 12 : n, d, low: sec.low }); t += d; }));
      }
      beat += bars * 3;
    });
    ev.total = beat; ev.sort((a, b) => a.t - b.t); return ev;
  })();

  function chanter(f, t0, dur, vol, grace) {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(), pk = ctx.createBiquadFilter();
    o1.type = 'sawtooth'; o2.type = 'square'; o1.frequency.setValueAtTime(f, t0); o2.frequency.setValueAtTime(f * 1.002, t0);
    if (grace) { o1.frequency.setValueAtTime(grace, t0); o2.frequency.setValueAtTime(grace, t0); o1.frequency.setValueAtTime(f, t0 + 0.055); o2.frequency.setValueAtTime(f * 1.002, t0 + 0.055); }
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t0); lg.gain.linearRampToValueAtTime(f * 0.006, t0 + Math.min(0.6, dur * 0.6));
    lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.7; pk.type = 'peaking'; pk.frequency.value = 1400; pk.gain.value = 5; pk.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.04); g.gain.setValueAtTime(vol, t0 + dur - 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.05);
    o1.connect(lp); o2.connect(lp); lp.connect(pk); pk.connect(g); g.connect(musicGain);
    [o1, o2, lfo].forEach(o => { o.start(t0); o.stop(t0 + dur + 0.1); });
  }
  function drone(t0, dur) {
    [[45, 0.05], [57, 0.022]].forEach(([n, v]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = N(n); lp.type = 'lowpass'; lp.frequency.value = 520;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 1.2); g.gain.setValueAtTime(v, t0 + dur - 1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.4);
      o.connect(lp); lp.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + dur + 0.5);
    });
  }
  function chord(t0, dur, [r, q], low, swell) {
    const root = ROOT[r], iv = q === 'm' ? [0, 3, 7, 12] : [0, 4, 7, 12];
    iv.forEach((d, i) => [-6, 6].forEach(det => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = N(root + d + (low ? -12 : 0)); o.detune.value = det;
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(swell ? 500 : 700, t0); if (swell) lp.frequency.linearRampToValueAtTime(1400, t0 + dur * 0.7);
      const v = (i === 0 ? 0.016 : 0.011);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.9);
      o.connect(lp); lp.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + dur + 1);
    }));
    // bajo
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = N(root - 12);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + dur + 0.1);
  }
  function kick(t0, soft) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(95, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.35);
    g.gain.setValueAtTime(soft ? 0.18 : 0.3, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5); o.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + 0.55);
    noise(t0, 0.25, soft ? 0.03 : 0.05, 180, 0.8, musicGain);
  }
  function roll(t0) { for (let i = 0; i < 6; i++) noise(t0 + i * BEAT / 6, 0.08, 0.02 + i * 0.006, 1800, 1.4, musicGain); }

  function schedule() {
    if (!ctx) return;
    const ahead = ctx.currentTime + 0.6;
    while (true) {
      if (evIdx >= EVENTS.length) { evIdx = 0; loopStart += EVENTS.total * BEAT; }
      const e = EVENTS[evIdx], t = loopStart + e.t * BEAT;
      if (t > ahead) break;
      evIdx++;
      if (t < ctx.currentTime - 0.05) continue;
      switch (e.k) {
        case 'note': {
          const dur = e.d * BEAT * 0.97, grace = e.d >= 1 && Math.random() < 0.55 ? N(e.n + (Math.random() < 0.5 ? 2 : 5)) : null;
          chanter(N(e.n), t, dur, e.low ? 0.05 : 0.065, grace);
          break;
        }
        case 'drone': drone(t, e.len * BEAT); break;
        case 'chord': chord(t, 3 * BEAT, e.h, e.low, e.swell); break;
        case 'kick': kick(t, e.soft); break;
        case 'roll': roll(t); break;
        case 'tap': noise(t, 0.09, 0.03, 900, 1.2, musicGain); break;
      }
    }
  }
  AU.startMusic = function () { if (!ctx || timer) return; loopStart = ctx.currentTime + 0.2; evIdx = 0; timer = setInterval(schedule, 120); schedule(); };
  AU.stopMusic = function () { clearInterval(timer); timer = null; };
  AU.musicLength = () => EVENTS.total * BEAT;
})(typeof window !== 'undefined' ? window : globalThis);
