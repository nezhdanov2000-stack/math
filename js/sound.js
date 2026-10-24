/* Звук: всё синтезируется в коде (Web Audio) — файлов нет, работает офлайн.
 *
 * Как это устроено
 *  — ядро (этот файл) грузится сразу после core.js и оборачивает общие эффекты
 *    (burst, shake, rocket, smash…), пока режимы ещё не успели их запомнить;
 *  — звуки инструментов (axe, press, bridge…) навешиваются на DOMContentLoaded
 *    (см. hookTools): режимы вызывают их через MG.<инструмент>.<функция> в момент
 *    действия, поэтому ничего в режимах менять не нужно;
 *  — MG.snd.play('имя') — прямой вызов, если нужен звук «от руки».
 *
 * iPhone / Safari
 *  — AudioContext можно запускать только из жеста: создаём и «будим» его при
 *    первом касании (unlock);
 *  — переключатель «Звонок/Без звука» по умолчанию глушит Web Audio. Лечим двумя
 *    способами: navigator.audioSession.type = 'playback' (iOS 17+) и тихий
 *    зацикленный <audio>-элемент (старые iOS) — оба безвредны, если не поддержаны;
 *  — при сворачивании приложения контекст усыпляем, при возврате будим
 *    (iOS сам переводит его в «interrupted» после звонка/Siri).
 */
(function () {
  'use strict';
  const MG = window.MG;
  const LS = { sfx: 'mg.snd.sfx', music: 'mg.snd.music' };
  const getFlag = (k) => { try { return localStorage.getItem(k) !== '0'; } catch (e) { return true; } };
  const setFlag = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) {} };

  const state = { sfx: getFlag(LS.sfx), music: getFlag(LS.music), ready: false };
  let ctx = null, master = null, sfxBus = null, musBus = null, kit = null, noiseBuf = null;

  /* ------------------------------------------------------------------ *
   *  Набор «кирпичиков»: tone / noise / rotor. Привязан к (ctx, out),
   *  поэтому одни и те же звуки можно прогнать и в OfflineAudioContext (тесты).
   * ------------------------------------------------------------------ */
  function makeKit(c, out) {
    const noiseBuffer = () => {           // один буфер шума на контекст
      if (c.__nb) return c.__nb;
      const len = c.sampleRate * 2;
      const nb = c.createBuffer(1, len, c.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return (c.__nb = nb);
    };
    const exp = (p, v, t) => p.exponentialRampToValueAtTime(Math.max(v, 0.0001), t);

    /* тон: f → f2 (глайд), огибающая «атака → затухание» */
    function tone(t0, { f = 440, f2, dur = 0.2, type = 'sine', vol = 0.25, a = 0.006, det = 0, hold = 0 } = {}) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.detune.value = det;
      o.frequency.setValueAtTime(f, t0);
      if (f2) exp(o.frequency, f2, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + a);
      if (hold) g.gain.setValueAtTime(vol, t0 + a + hold);
      exp(g.gain, 0.0001, t0 + dur);
      o.connect(g); g.connect(out);
      o.start(t0); o.stop(t0 + dur + 0.05);
      return { o, g };
    }

    /* шум через фильтр: полоса f → f2 */
    function noise(t0, { dur = 0.2, vol = 0.2, type = 'bandpass', f = 1200, f2, q = 1, a = 0.004, fadeIn = 0 } = {}) {
      const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
      s.buffer = noiseBuffer(); s.loop = true;
      fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t0);
      if (f2) exp(fl.frequency, f2, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + (fadeIn || a));
      exp(g.gain, 0.0001, t0 + dur);
      s.connect(fl); fl.connect(g); g.connect(out);
      s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.05);
      return s;
    }

    /* ритмичный «винт»: шум, прорубаемый LFO (вертолёт, вентилятор, гусеницы) */
    function rotor(t0, { dur = 1, rate = 18, vol = 0.18, f = 500, f2, q = 0.8, type = 'bandpass', rate2 } = {}) {
      const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      s.buffer = noiseBuffer(); s.loop = true;
      fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t0);
      if (f2) exp(fl.frequency, f2, t0 + dur);
      g.gain.setValueAtTime(0, t0);
      lfo.type = 'square'; lfo.frequency.setValueAtTime(rate, t0);
      if (rate2) exp(lfo.frequency, rate2, t0 + dur);
      lg.gain.value = vol * 0.5;
      lfo.connect(lg); lg.connect(g.gain);
      const env = c.createGain();
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(1, t0 + Math.min(0.12, dur / 3));
      env.gain.setValueAtTime(1, t0 + dur - Math.min(0.2, dur / 3));
      env.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      s.connect(fl); fl.connect(g); g.connect(env); env.connect(out);
      s.start(t0, Math.random()); lfo.start(t0);
      s.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
    }

    const note = (n) => 440 * Math.pow(2, (n - 69) / 12);   // MIDI → Гц
    return { c, out, tone, noise, rotor, note };
  }

  /* ------------------------------------------------------------------ *
   *  Звуки. Каждый — функция (kit, t0, o). Времена — в секундах.
   * ------------------------------------------------------------------ */
  const S = {
    /* интерфейс */
    click: (k, t) => { k.tone(t, { f: 720, f2: 520, dur: 0.07, type: 'triangle', vol: 0.16 }); },
    pin: (k, t) => { k.tone(t, { f: 523, dur: 0.14, type: 'triangle', vol: 0.2 }); k.tone(t + 0.07, { f: 784, dur: 0.22, type: 'triangle', vol: 0.2 }); },
    back: (k, t) => { k.tone(t, { f: 660, f2: 400, dur: 0.16, type: 'triangle', vol: 0.18 }); },
    tool: (k, t) => { k.tone(t, { f: 900, f2: 1200, dur: 0.06, type: 'square', vol: 0.06 }); k.tone(t + 0.04, { f: 1500, dur: 0.1, type: 'sine', vol: 0.1 }); },
    pop: (k, t) => { k.tone(t, { f: 380, f2: 760, dur: 0.09, type: 'sine', vol: 0.14 }); },
    tick: (k, t) => { k.tone(t, { f: 980, dur: 0.05, type: 'sine', vol: 0.08 }); },
    spark: (k, t) => { [0, 0.05, 0.1].forEach((d, i) => k.tone(t + d, { f: 1568 * Math.pow(1.26, i), dur: 0.16, type: 'sine', vol: 0.08 })); },

    /* ошибка / «нельзя» */
    err: (k, t) => { k.tone(t, { f: 190, f2: 120, dur: 0.22, type: 'sawtooth', vol: 0.13 }); k.tone(t + 0.02, { f: 196, f2: 126, dur: 0.2, type: 'square', vol: 0.06 }); },
    nope: (k, t) => { k.tone(t, { f: 300, f2: 210, dur: 0.12, type: 'square', vol: 0.1 }); k.tone(t + 0.13, { f: 240, f2: 150, dur: 0.2, type: 'square', vol: 0.1 }); },

    /* задача решена */
    win: (k, t) => {
      [72, 76, 79, 84].forEach((n, i) => k.tone(t + i * 0.09, { f: k.note(n), dur: 0.34, type: 'triangle', vol: 0.2 }));
      k.tone(t + 0.36, { f: k.note(88), dur: 0.7, type: 'sine', vol: 0.16 });
      [96, 100, 103].forEach((n, i) => k.tone(t + 0.4 + i * 0.07, { f: k.note(n), dur: 0.35, type: 'sine', vol: 0.05 }));
    },

    /* общие эффекты */
    whoosh: (k, t, o = {}) => { const d = o.dur || 0.8; k.noise(t, { dur: d, vol: 0.2, f: 400, f2: 2600, q: 0.9, fadeIn: d * 0.5 }); k.tone(t, { f: 180, f2: 700, dur: d, type: 'sawtooth', vol: 0.04, a: d * 0.4 }); },
    boom: (k, t) => { k.tone(t, { f: 150, f2: 38, dur: 0.7, type: 'sine', vol: 0.5 }); k.noise(t, { dur: 0.6, vol: 0.38, type: 'lowpass', f: 1800, f2: 120, q: 0.7 }); k.noise(t, { dur: 0.12, vol: 0.2, type: 'highpass', f: 2500 }); },
    smash: (k, t) => { k.tone(t, { f: 120, f2: 50, dur: 0.3, type: 'sine', vol: 0.4 }); k.noise(t, { dur: 0.25, vol: 0.32, type: 'highpass', f: 1500, f2: 600 }); k.noise(t + 0.05, { dur: 0.35, vol: 0.2, type: 'bandpass', f: 900, f2: 300 }); },
    crumble: (k, t) => { for (let i = 0; i < 6; i++) k.noise(t + i * 0.05 + Math.random() * 0.03, { dur: 0.09, vol: 0.14, type: 'bandpass', f: 500 + Math.random() * 1800, q: 3 }); },

    /* инструменты */
    chop: (k, t) => {
      [0.52, 0.9, 1.3].forEach((d) => {
        k.noise(t + d - 0.2, { dur: 0.18, vol: 0.07, f: 300, f2: 1500, fadeIn: 0.15 });                 // замах
        k.tone(t + d, { f: 170, f2: 70, dur: 0.16, type: 'triangle', vol: 0.4 });                          // удар
        k.noise(t + d, { dur: 0.1, vol: 0.22, type: 'bandpass', f: 1200, q: 1.5 });
      });
      k.noise(t + 1.42, { dur: 0.3, vol: 0.2, type: 'highpass', f: 2000, f2: 800 });                      // раскол
      k.tone(t + 1.42, { f: 90, f2: 45, dur: 0.3, type: 'sine', vol: 0.3 });
    },
    press: (k, t) => {
      k.rotor(t, { dur: 0.7, rate: 14, vol: 0.12, f: 260, f2: 700, type: 'lowpass' });                    // завод
      k.tone(t + 0.7, { f: 120, f2: 360, dur: 1.0, type: 'sawtooth', vol: 0.06, a: 0.3 });                // нагнетание
      k.noise(t + 0.75, { dur: 1.0, vol: 0.12, f: 900, f2: 2200, fadeIn: 0.9 });
      k.tone(t + 1.78, { f: 95, f2: 36, dur: 0.5, type: 'sine', vol: 0.6 });                              // удар
      k.noise(t + 1.78, { dur: 0.25, vol: 0.28, type: 'lowpass', f: 1200, f2: 150 });
      k.noise(t + 2.0, { dur: 0.7, vol: 0.14, type: 'highpass', f: 3000 });                               // пар
    },
    bridge: (k, t) => {
      k.noise(t, { dur: 0.7, vol: 0.1, f: 500, f2: 250, q: 3 });                                           // скрип створок
      for (let i = 0; i < 9; i++) k.tone(t + 0.35 + i * 0.12, { f: 300 + (i % 2) * 90, dur: 0.05, type: 'square', vol: 0.05 }); // шестерни
      k.tone(t + 1.85, { f: 110, f2: 55, dur: 0.35, type: 'sine', vol: 0.45 });                           // створки легли
      k.noise(t + 1.85, { dur: 0.2, vol: 0.2, type: 'lowpass', f: 900, f2: 200 });
      k.tone(t + 2.25, { f: k.note(81), dur: 0.5, type: 'sine', vol: 0.18 });                              // «динь» — черта
      k.tone(t + 2.25, { f: k.note(88), dur: 0.5, type: 'sine', vol: 0.1 });
    },
    cups: (k, t) => {
      k.noise(t, { dur: 0.4, vol: 0.09, f: 500, f2: 1400, fadeIn: 0.2 });
      [0.1, 0.55, 0.95].forEach((d, i) => { k.tone(t + d, { f: 1320 + i * 90, dur: 0.22, type: 'sine', vol: 0.16 }); k.tone(t + d + 0.01, { f: 2640 + i * 180, dur: 0.12, type: 'sine', vol: 0.06 }); });
      k.tone(t + 1.3, { f: 300, f2: 620, dur: 0.14, type: 'sine', vol: 0.14 });
    },
    fan: (k, t) => {
      k.rotor(t, { dur: 1.6, rate: 22, vol: 0.14, f: 700, f2: 1500, q: 0.6, rate2: 40 });
      k.noise(t + 0.1, { dur: 1.5, vol: 0.12, type: 'lowpass', f: 600, f2: 1800, fadeIn: 0.9 });
      k.tone(t, { f: 90, f2: 260, dur: 1.5, type: 'sine', vol: 0.06, a: 0.7 });
    },
    rain: (k, t) => {
      k.noise(t, { dur: 0.8, vol: 0.12, f: 300, f2: 1200, fadeIn: 0.5 });
      k.noise(t + 0.5, { dur: 1.6, vol: 0.2, type: 'highpass', f: 3500, fadeIn: 0.5 });                   // шум дождя
      for (let i = 0; i < 18; i++) k.tone(t + 0.6 + i * 0.075 + Math.random() * 0.04, { f: 1800 + Math.random() * 1800, dur: 0.04, type: 'sine', vol: 0.04 });
      k.tone(t + 2.2, { f: k.note(86), dur: 0.4, type: 'sine', vol: 0.1 });
    },
    teeth: (k, t) => {
      [0.35, 0.65, 0.95].forEach((d) => {
        k.tone(t + d, { f: 260, f2: 120, dur: 0.07, type: 'square', vol: 0.18 });
        k.noise(t + d, { dur: 0.06, vol: 0.22, type: 'bandpass', f: 2600, q: 2 });
        k.tone(t + d + 0.1, { f: 300, f2: 160, dur: 0.05, type: 'square', vol: 0.1 });
      });
      k.noise(t + 1.15, { dur: 0.3, vol: 0.14, type: 'bandpass', f: 800, f2: 300 });                      // хруст
    },
    tread: (k, t) => {
      k.rotor(t, { dur: 1.3, rate: 12, vol: 0.28, f: 220, q: 0.9, type: 'lowpass' });
      k.tone(t, { f: 55, f2: 70, dur: 1.3, type: 'sawtooth', vol: 0.1 });
      for (let i = 0; i < 8; i++) k.noise(t + i * 0.16, { dur: 0.06, vol: 0.1, type: 'bandpass', f: 1800, q: 3 });
    },
    conveyor: (k, t) => {
      k.tone(t, { f: 120, f2: 70, dur: 0.3, type: 'square', vol: 0.12 });                                  // створка
      k.rotor(t + 0.25, { dur: 1.1, rate: 9, vol: 0.14, f: 300, q: 0.7, type: 'lowpass' });
      for (let i = 0; i < 6; i++) k.tone(t + 0.3 + i * 0.17, { f: 360 + (i % 2) * 70, dur: 0.045, type: 'square', vol: 0.05 });
    },
    heli: (k, t) => {
      k.rotor(t, { dur: 1.8, rate: 17, vol: 0.2, f: 420, q: 0.8 });
      k.tone(t, { f: 80, f2: 95, dur: 1.8, type: 'sawtooth', vol: 0.05, a: 0.4 });
    },
    zap: (k, t) => {
      k.noise(t, { dur: 0.3, vol: 0.34, type: 'highpass', f: 2000, f2: 6000, q: 0.5 });
      for (let i = 0; i < 7; i++) k.tone(t + i * 0.035, { f: 700 + Math.random() * 2600, f2: 300 + Math.random() * 600, dur: 0.05, type: 'sawtooth', vol: 0.09 });
      k.noise(t + 0.18, { dur: 1.0, vol: 0.3, type: 'lowpass', f: 400, f2: 70, q: 0.7, fadeIn: 0.15 });    // гром
      k.tone(t + 0.18, { f: 70, f2: 38, dur: 0.9, type: 'sine', vol: 0.3 });
    },
    ice: (k, t) => {
      [0, 0.04, 0.09, 0.15, 0.22].forEach((d, i) => k.tone(t + d, { f: 2400 - i * 280 + Math.random() * 200, dur: 0.22, type: 'sine', vol: 0.09 }));
      k.noise(t, { dur: 0.25, vol: 0.18, type: 'highpass', f: 4000 });
      k.noise(t + 0.2, { dur: 0.2, vol: 0.2, type: 'bandpass', f: 1800, q: 4 });
    },
    joker: (k, t) => {
      k.noise(t, { dur: 0.15, vol: 0.14, type: 'highpass', f: 2500, f2: 6000 });                          // шорох карты
      k.tone(t + 0.1, { f: k.note(79), dur: 0.2, type: 'triangle', vol: 0.12 });
      k.tone(t + 0.2, { f: k.note(86), dur: 0.3, type: 'triangle', vol: 0.12 });
    },
    flip: (k, t) => { k.noise(t, { dur: 0.09, vol: 0.12, type: 'highpass', f: 3000 }); k.tone(t, { f: 700, f2: 1000, dur: 0.06, type: 'triangle', vol: 0.08 }); },
    scatter: (k, t) => { for (let i = 0; i < 6; i++) { const d = t + i * 0.1 + Math.random() * 0.05; k.noise(d, { dur: 0.07, vol: 0.14, type: 'highpass', f: 2200 }); k.tone(d, { f: 500 + Math.random() * 600, f2: 160, dur: 0.1, type: 'sine', vol: 0.12 }); } },
    erase: (k, t) => { k.tone(t, { f: 1700, f2: 2300, dur: 0.14, type: 'sawtooth', vol: 0.04 }); k.noise(t, { dur: 0.16, vol: 0.12, type: 'bandpass', f: 3000, q: 2 }); },
  };

  /* ------------------------------------------------------------------ *
   *  Запуск контекста (iPhone) и шины
   * ------------------------------------------------------------------ */
  let silentEl = null;
  function keepAudioOnSilentSwitch() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (silentEl) return;
    try {
      /* 0,1 c тишины (WAV 8 кГц, моно) — зациклен: iOS считает страницу «медиа» и не глушит её */
      const n = 800, buf = new Uint8Array(44 + n), dv = new DataView(buf.buffer);
      const w = (o, s) => { for (let i = 0; i < s.length; i++) buf[o + i] = s.charCodeAt(i); };
      w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
      dv.setUint16(22, 1, true); dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
      w(36, 'data'); dv.setUint32(40, n, true); buf.fill(128, 44);
      let bin = ''; buf.forEach((b) => { bin += String.fromCharCode(b); });
      silentEl = new Audio('data:audio/wav;base64,' + btoa(bin));
      silentEl.loop = true; silentEl.volume = 0.01; silentEl.setAttribute('playsinline', '');
      const p = silentEl.play(); if (p && p.catch) p.catch(() => { silentEl = null; });
    } catch (e) { silentEl = null; }
  }

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || ctx) return;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new AC(); } catch (e2) { return; } }
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.2;
    sfxBus = ctx.createGain(); musBus = ctx.createGain();
    sfxBus.gain.value = state.sfx ? 1 : 0; musBus.gain.value = 0;
    sfxBus.connect(master); musBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    kit = makeKit(ctx, sfxBus);
    state.ready = true;
    musicKit = makeKit(ctx, musBus);
    applyMusic();
  }

  function unlock() {
    keepAudioOnSilentSwitch();
    if (!ctx) build();
    if (!ctx) return;
    if (ctx.state !== 'running') { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); }
    /* iOS: «пустой» звук внутри жеста окончательно размораживает контекст */
    try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); s.connect(ctx.destination); s.start(0); } catch (e) {}
  }

  ['pointerdown', 'touchend', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { ctx.suspend().catch(() => {}); if (silentEl) silentEl.pause(); }
    else { ctx.resume().catch(() => {}); if (silentEl) silentEl.play().catch(() => {}); }
  });
  window.addEventListener('pagehide', () => { if (ctx) ctx.suspend().catch(() => {}); });

  /* ------------------------------------------------------------------ *
   *  Воспроизведение
   * ------------------------------------------------------------------ */
  const GAIN = { smash: 0.6, boom: 0.65, press: 0.7, chop: 0.8, rain: 0.7, bridge: 0.8, zap: 0.8, heli: 1.8, tread: 1.6, fan: 1.5, whoosh: 1.5, tool: 1.4, tick: 1.4, erase: 1.5, crumble: 2 };
  const last = {};
  const GAP = { pop: 70, tick: 80, spark: 140, click: 40, flip: 60, whoosh: 120, crumble: 120, err: 120, nope: 150, scatter: 200, boom: 200, smash: 120 };
  function play(name, o) {
    if (!state.sfx || !kit || ctx.state !== 'running') return;
    const fn = S[name]; if (!fn) return;
    const now = performance.now();
    if (now - (last[name] || 0) < (GAP[name] || 0)) return;
    last[name] = now;
    try {
      const g = ctx.createGain(); g.gain.value = GAIN[name] || 1; g.connect(sfxBus);   // выравнивание громкости по звукам
      fn(makeKit(ctx, g), ctx.currentTime + 0.01, o || {});
    } catch (e) { /* звук не должен ломать игру */ }
  }

  /* ------------------------------------------------------------------ *
   *  Фоновая музыка: тихий генератив (C–Am–F–G, пентатоника), без файлов.
   *  Планировщик с упреждением: каждые 120 мс дописываем ноты на ближайшие 0,6 с.
   * ------------------------------------------------------------------ */
  let musicKit = null, musicTimer = null, nextT = 0, step = 0;
  const BPM = 84, EIGHTH = 60 / BPM / 2;
  const CHORDS = [
    { bass: 48, pad: [60, 64, 67], mel: [72, 74, 76, 79, 81] },   // C
    { bass: 45, pad: [57, 60, 64], mel: [72, 74, 76, 79, 81] },   // Am
    { bass: 41, pad: [57, 60, 65], mel: [72, 74, 77, 79, 81] },   // F
    { bass: 43, pad: [59, 62, 67], mel: [71, 74, 76, 79, 83] },   // G
  ];
  /* один шаг (восьмая) музыки: нужен и планировщику, и тестам (offline-рендер) */
  function musicStep(k, t, st) {
    const bar = Math.floor(st / 8) % 4, pos = st % 8, ch = CHORDS[bar];
    if (pos === 0) {
      const len = EIGHTH * 8;
      ch.pad.forEach((n, i) => {
        k.tone(t, { f: k.note(n), dur: len * 1.05, type: 'triangle', vol: 0.05, a: 0.5, det: i * 4 - 4 });
        k.tone(t, { f: k.note(n + 12), dur: len, type: 'sine', vol: 0.02, a: 0.6 });
      });
      k.tone(t, { f: k.note(ch.bass), dur: EIGHTH * 3.6, type: 'sine', vol: 0.16, a: 0.02 });
      k.tone(t + EIGHTH * 4, { f: k.note(ch.bass + 7), dur: EIGHTH * 3, type: 'sine', vol: 0.1, a: 0.02 });
    }
    /* арпеджио по аккорду + редкие ноты мелодии */
    if (pos % 2 === 0) {
      const n = ch.pad[(pos / 2) % 3] + 12;
      k.tone(t, { f: k.note(n), dur: 0.5, type: 'triangle', vol: 0.06, a: 0.004 });
    }
    if ((pos === 3 || pos === 6 || pos === 7) && Math.random() < 0.6) {
      const n = ch.mel[Math.floor(Math.random() * ch.mel.length)];
      k.tone(t, { f: k.note(n), dur: 0.7, type: 'sine', vol: 0.07, a: 0.01 });
      k.tone(t, { f: k.note(n + 12), dur: 0.4, type: 'sine', vol: 0.015, a: 0.01 });
    }
  }
  function scheduleMusic() {
    if (!musicKit || !ctx || ctx.state !== 'running') return;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.6) { musicStep(musicKit, nextT, step); nextT += EIGHTH; step++; }
  }
  function applyMusic() {
    if (!ctx || !musBus) return;
    const home = document.body.classList.contains('is-home');
    const target = state.music ? (home ? 0.55 : 0.3) : 0;
    musBus.gain.cancelScheduledValues(ctx.currentTime);
    musBus.gain.setTargetAtTime(target, ctx.currentTime, 0.4);
    if (state.music && !musicTimer) { nextT = 0; musicTimer = setInterval(scheduleMusic, 120); scheduleMusic(); }
    if (!state.music && musicTimer) { setTimeout(() => { if (!state.music && musicTimer) { clearInterval(musicTimer); musicTimer = null; } }, 900); }
  }
  new MutationObserver(applyMusic).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  /* ------------------------------------------------------------------ *
   *  Обёртки над общими эффектами (до того, как их запомнят режимы)
   * ------------------------------------------------------------------ */
  const wrap = (obj, key, fn) => {
    const orig = obj && obj[key];
    if (typeof orig !== 'function' || orig.__snd) return;
    const w = function (...a) { try { fn(...a); } catch (e) {} return orig.apply(this, a); };
    Object.assign(w, orig); w.__snd = true;
    obj[key] = w;
  };

  wrap(MG, 'burst', () => play('spark'));
  wrap(MG, 'popIn', () => play('pop'));
  wrap(MG, 'bump', () => play('tick'));
  wrap(MG, 'shake', () => play('err'));
  wrap(MG, 'indivisible', () => play('nope'));
  wrap(MG, 'rocket', () => play('whoosh', { dur: 0.85 }));
  wrap(MG, 'explode', () => play('boom'));
  wrap(MG, 'smash', () => play('smash'));
  wrap(MG, 'crumble', () => play('crumble'));
  let lastSolved = null;
  wrap(MG, 'setStats', (level, solved) => {
    const n = Number(solved);
    if (lastSolved !== null && n > lastSolved) setTimeout(() => play('win'), 250);
    lastSolved = n;
  });

  /* ------------------------------------------------------------------ *
   *  Инструменты: навешиваем после загрузки всех скриптов
   * ------------------------------------------------------------------ */
  function hookTools() {
    wrap(MG.axe, 'chop', () => play('chop'));
    if (typeof MG.press === 'function' && !MG.press.__snd) {
      const o = MG.press; const w = function (...a) { play('press'); return o.apply(this, a); };
      Object.assign(w, o); w.__snd = true; MG.press = w;
    }
    wrap(MG.bridge, 'play', () => play('bridge'));
    wrap(MG.cups, 'play', () => play('cups'));
    wrap(MG.fan, 'start', () => play('fan'));
    wrap(MG.rain, 'play', () => play('rain'));
    wrap(MG.teeth, 'play', () => play('teeth'));
    wrap(MG.tread, 'run', () => play('tread'));
    wrap(MG.conveyor, 'open', () => play('conveyor'));
    wrap(MG.heli, 'spawn', () => play('heli'));
    wrap(MG.joker, 'lay', () => play('joker'));
    wrap(MG.joker, 'setValue', () => play('flip'));
    wrap(MG, 'scatter', () => play('scatter'));
    wrap(MG, 'erase', () => play('erase'));
    ['ice', 'lightning'].forEach((n) => {
      const o = MG[n]; if (typeof o !== 'function' || o.__snd) return;
      const w = function (...a) { play(n === 'ice' ? 'ice' : 'zap'); return o.apply(this, a); };
      Object.assign(w, o); w.__snd = true; MG[n] = w;
    });
  }
  document.addEventListener('DOMContentLoaded', hookTools);
  if (document.readyState !== 'loading') hookTools();

  /* нажатия на кнопки */
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest && e.target.closest('button, .pin, [role="button"]');
    if (!t || t.closest('.snd-ctl')) return;
    if (t.classList.contains('pin')) play('pin');
    else if (t.id === 'home-btn') play('back');
    else if (t.closest('.toolbar')) play('tool');
    else play('click');
  }, { capture: true, passive: true });

  /* ------------------------------------------------------------------ *
   *  Кнопки «звук» и «музыка»
   * ------------------------------------------------------------------ */
  const ICON = {
    sfx: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.6l4.4 3.7V5.8L7.6 9.5z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path class="w" d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17.5V6.3l9-2v11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.8" cy="17.5" r="2.7" fill="currentColor"/><circle cx="15.8" cy="15.3" r="2.7" fill="currentColor"/></svg>',
  };
  function buildUI() {
    const box = document.createElement('div');
    box.className = 'snd-ctl';
    box.innerHTML = `<button type="button" class="snd-btn" data-k="sfx" aria-label="Звуки">${ICON.sfx}</button><button type="button" class="snd-btn" data-k="music" aria-label="Музыка">${ICON.music}</button>`;
    document.body.append(box);
    const sync = () => box.querySelectorAll('.snd-btn').forEach((b) => {
      const on = state[b.dataset.k];
      b.classList.toggle('off', !on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    box.addEventListener('click', (e) => {
      const b = e.target.closest('.snd-btn'); if (!b) return;
      const k = b.dataset.k;
      state[k] = !state[k]; setFlag(LS[k], state[k]);
      unlock();
      if (k === 'sfx' && sfxBus) sfxBus.gain.setTargetAtTime(state.sfx ? 1 : 0, ctx.currentTime, 0.02);
      if (k === 'music') applyMusic();
      sync();
      if (k === 'sfx' && state.sfx) play('pin');
    });
    sync();
  }
  const css = document.createElement('style');
  css.textContent = `
    .snd-ctl { position: fixed; z-index: 60; top: calc(8px + env(safe-area-inset-top)); right: 10px; display: flex; gap: 8px; }
    .snd-btn { width: 38px; height: 38px; padding: 0; display: grid; place-items: center; color: var(--ink, #1a1a1a); background: rgba(255, 255, 255, .88); border: 2px solid var(--ink, #1a1a1a); border-radius: 50%; cursor: pointer; box-shadow: 0 3px 0 var(--ink, #1a1a1a); transition: transform .12s, box-shadow .12s, opacity .2s; -webkit-tap-highlight-color: transparent; position: relative; }
    .snd-btn svg { width: 20px; height: 20px; }
    .snd-btn:active { transform: translateY(3px); box-shadow: 0 0 0 var(--ink, #1a1a1a); }
    .snd-btn.off { opacity: .6; }
    .snd-btn.off::after { content: ''; position: absolute; left: 7px; right: 7px; top: 50%; height: 3px; margin-top: -1.5px; background: var(--ink, #1a1a1a); border-radius: 2px; transform: rotate(-42deg); box-shadow: 0 0 0 2px rgba(255, 255, 255, .9); }
    body.is-home .snd-btn { background: rgba(255, 244, 214, .94); }`;
  document.head.append(css);
  if (document.body) buildUI(); else document.addEventListener('DOMContentLoaded', buildUI);

  MG.snd = { play, state, unlock, sounds: S, makeKit, musicStep, EIGHTH, _ctx: () => ctx };
})();
