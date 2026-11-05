/* Режим «Десятичная → обыкновенная» (decfr), остров II «Перевод дробей» раздела «Десятичные дроби».
 * Инструмент — облако (rain), то же, что в 1 разделе (js/rain.js, MG.rain.play).
 *
 * 1) Пример «1,267».
 * 2) Берёшь облако и тапаешь по числу — появляется туча, из неё бьёт молния и выбивает запятую за экран.
 *    Идёт дождь: под числом появляется черта, в знаменателе вырастают горки земли — под единицей и под каждым
 *    местом нуля (сколько цифр после запятой). Из горок рывками вылезают зелёные ростки «1» и «0» и толкают
 *    черту с числом вверх (анимация единицы — rain.js), потом становятся цифрами: «1,267 = 1267/1000».
 * 3) Ведущие нули числителя тают: «0,035 = 35/1000». Целая часть остаётся в числителе, дробь не сокращаем.
 * 8 примеров в 4 стадии: 0,5 / 0,25 → 0,48 / 0,125 → с целой частью 1,267 → с нулями после запятой 0,035. */
(() => {
  'use strict';
  const MG = window.MG;
  const { $, T, sleep, ri, setStats, burst } = MG;
  const snd = (n, o) => { if (MG.snd && MG.snd.play) MG.snd.play(n, o); };

  const view = $('#bf-view');
  const world = $('#bf-world');
  const after = $('#bf-after');
  const resultText = $('#bf-resultText');
  const nextBtn = $('#bf-next');
  if (!view || !world) return;
  const hint = MG.hinter($('#bf-hint'));
  const NAME = 'decfr', TOOL = 'rain';
  const INK = '#1d1d1f';

  const css = document.createElement('style');
  css.textContent = `
    .bf-mode { justify-content: flex-start; gap: 6px; position: relative; }
    .bf-view { position: relative; width: min(100%, 460px); flex: 1 1 auto; min-height: 380px; overflow: hidden; }
    .bf-world { position: absolute; inset: 0; }
    .bf-frac { position: absolute; inset: 0; transition: translate .7s cubic-bezier(.4,0,.2,1), scale .7s cubic-bezier(.4,0,.2,1); }
    .bf-d { position: absolute; left: 0; top: 0; width: var(--cw); height: var(--rh); display: grid; place-items: center; font-weight: 900; font-size: calc(var(--cw) * .88); line-height: 1; color: ${INK}; transition: left .5s cubic-bezier(.4,0,.2,1), opacity .4s, scale .4s; }
    .bf-world.snap .bf-d, .bf-world.snap .bf-bar { transition: none; }
    .bf-d.gone { opacity: 0; scale: .4; }
    .bf-comma { position: absolute; left: 0; top: 0; width: calc(var(--cw) * .4); height: var(--rh); display: grid; place-items: end center; font-weight: 900; font-size: calc(var(--cw) * .88); line-height: 1.15; color: ${INK}; pointer-events: none; }
    .bf-hit { position: absolute; left: 0; top: 0; cursor: pointer; touch-action: manipulation; }
    .bf-bar { position: absolute; left: 0; top: 0; height: var(--bt); border-radius: 999px; background: ${INK}; transition: left .5s cubic-bezier(.4,0,.2,1), width .5s cubic-bezier(.4,0,.2,1); }
    .bf-pre .bf-bar { opacity: 0; }
    .bf-den { position: absolute; left: 0; top: 0; width: var(--cw); height: var(--rh); display: grid; place-items: center; font-weight: 900; font-size: calc(var(--cw) * .88); line-height: 1; color: ${INK}; transition: left .45s cubic-bezier(.4,0,.2,1), opacity .4s; }
    .bf-left { position: absolute; left: 0; top: 0; display: flex; align-items: center; white-space: nowrap; }
    .bf-left span { display: block; width: var(--cw); text-align: center; font-weight: 900; font-size: calc(var(--cw) * .88); line-height: var(--rh); color: ${INK}; }
    .bf-left span.c { width: calc(var(--cw) * .45); }
    .bf-mode .dc-say { translate: -50% 0; }
    .bf-mode .dc-say::after { top: -6px; bottom: auto; }
    .bf-mode .after { position: absolute; left: 50%; top: var(--bf-after, 60%); z-index: 7; width: min(92%, 380px); translate: -50% 10px; min-height: 0; }
    .bf-mode .after.show { translate: -50% 0; }
    body[data-tool="rain"] .stage .bf-hit { cursor: var(--cur-rain, pointer) !important; }
  `;
  document.head.append(css);

  /* ---------- примеры ---------- */
  const TOTAL = 8;
  let state = null, solved = 0, lastKey = '';
  const lvlOf = () => Math.min(4, 1 + Math.floor(solved / 2));
  const nz = () => String(ri(1, 9));
  const dg = () => String(ri(0, 9));

  function makeTask(str) {
    const [ip, fp] = str.split(',');
    const digits = (ip + fp).split('');
    const lead = Math.min(digits.length - 1, (digits.join('').match(/^0+/) || [''])[0].length);
    const num = digits.slice(lead).join(''), den = `1${'0'.repeat(fp.length)}`;
    return { str, ip, fp, digits, p0: ip.length, F: fp.length, lead, num, den };
  }
  function pick() {
    const L = lvlOf(), second = solved % 2 === 1;
    if (solved === 0 && !lastKey) return makeTask('0,5');
    for (let i = 0; i < 200; i++) {
      let s;
      if (L === 1) s = second ? `0,${nz()}${nz()}` : `0,${nz()}`;
      else if (L === 2) s = second ? `0,${nz()}${dg()}${nz()}` : `0,${nz()}${nz()}`;
      else if (L === 3) s = `${second ? ri(10, 99) : ri(1, 9)},${second ? nz() + nz() : nz() + dg() + nz()}`;
      else s = second ? `${ri(1, 9)},0${ri(0, 1) ? '0' : ''}${nz()}` : `0,0${ri(0, 1) ? dg() : ''}${nz()}`;
      if (s === lastKey) continue;
      return makeTask(s);
    }
    return makeTask('0,25');
  }

  /* ---------- геометрия: обычная дробь, как в 1 разделе ---------- */
  let G = null;
  function geom(tk) {
    const vw = Math.max(260, view.clientWidth), vh = Math.max(360, view.clientHeight);
    const N = tk.digits.length, W = Math.max(N, tk.F + 1) + 0.6;               // ширина дроби в клетках
    const leftU = tk.str.length - 1 + 0.45 + 1.2;                                // «1,267 =» в конце
    const cw = Math.max(18, Math.floor(Math.min(64, (vw - 24) / (W + 0.6), (vh - 40) / 4.6)));
    const rh = Math.round(cw * 1.3);
    /* цифра в клетке высотой rh занимает примерно от 0,24·rh до 0,735·rh; зазор у черты ~0,27 шрифта */
    const fs = cw * 0.88, g = fs * 0.27, bt = Math.max(3, cw * 0.085);
    const H = rh * 2.1;
    const numY = Math.max(16 + rh, Math.round(vh * 0.42 - H / 2));              // сверху — место для облака
    const barY = Math.round(numY + rh * 0.735 + g);
    const denY = Math.round(barY + bt + g - rh * 0.24);
    const Wc = W * cw, cx = Math.round(vw / 2);
    return { vw, vh, cw, rh, fs, bt, numY, barY, denY, Wc, cx, W, leftU, botY: denY + rh, lift: Math.round(rh * 0.68) };   // lift: до дождя число стоит ниже — его поднимет растущая единица
  }
  const numX0 = (st) => G.cx - (st.dEls.length - (st.cut || 0)) * G.cw / 2;
  const commaX = (st) => numX0(st) + st.task.p0 * G.cw;
  const denX0 = (n) => G.cx - n * G.cw / 2;

  const mk = (cls, txt, parent) => { const e = document.createElement('div'); e.className = cls; if (txt !== undefined) e.textContent = txt; (parent || world).append(e); return e; };

  function placeAll(st) {
    world.style.setProperty('--cw', `${G.cw}px`);
    world.style.setProperty('--rh', `${G.rh}px`);
    world.style.setProperty('--bt', `${G.bt}px`);
    const x0 = numX0(st);
    let k = 0;
    st.dEls.forEach((el, i) => { if (i < (st.cut || 0)) return; el.style.left = `${x0 + k * G.cw}px`; el.style.top = `${G.numY}px`; k += 1; });
    if (!st.commaGone) { st.comma.style.left = `${commaX(st) - G.cw * 0.2}px`; st.comma.style.top = `${G.numY}px`; }
    const nW = st.dEls.length - (st.cut || 0);
    Object.assign(st.hit.style, { left: `${x0 - G.cw * 0.3}px`, top: `${G.numY - G.rh * 0.4}px`, width: `${nW * G.cw + G.cw * 0.6}px`, height: `${G.botY - G.numY + G.rh * 0.4}px` });
    const dn = st.task.F + 1, N = st.dEls.length;
    const dx = st.denRight ? numX0(st) + (N - (st.cut || 0) - dn) * G.cw : denX0(dn);   // пока растут — каждый ноль под своей цифрой после запятой
    st.den.forEach((el, i) => { el.style.left = `${dx + i * G.cw}px`; el.style.top = `${G.denY}px`; });
    const bw = Math.max(nW, dn) * G.cw + G.cw * 0.3;                            // черта чуть шире самого длинного числа
    Object.assign(st.bar.style, { left: `${G.cx - bw / 2}px`, top: `${G.barY}px`, width: `${bw}px` });
    Object.assign(st.box.style, { left: `${G.cx - G.Wc / 2}px`, top: `${G.numY}px`, width: `${G.Wc}px`, height: `${G.botY - G.numY}px` });
    view.parentElement.style.setProperty('--bf-after', `${view.offsetTop + G.botY + 22}px`);
  }
  function layout(st) { G = geom(st.task); world.classList.add('snap'); placeAll(st); void world.offsetWidth; world.classList.remove('snap'); }

  /* ---------- раунд ---------- */
  function newRound() {
    window.dispatchEvent(new Event('mg:round'));
    const task = pick();
    lastKey = task.str;
    after.classList.remove('show');
    world.replaceChildren();
    world.classList.add('bf-pre');
    if (MG.tools.current()) MG.tools.clear();
    const st = { task, phase: 'pre', busy: false, denRight: true };
    state = st;
    st.frac = mk('bf-frac');
    st.bar = mk('bf-bar', undefined, st.frac);
    st.dEls = task.digits.map((d) => mk('bf-d', d, st.frac));
    st.comma = mk('bf-comma', ',', st.frac);
    st.den = Array.from({ length: task.F + 1 }, (_, i) => { const e = mk('bf-den', i ? '0' : '1', st.frac); e.style.visibility = 'hidden'; return e; });
    st.hit = mk('bf-hit', undefined, st.frac);
    st.box = mk('fracs', undefined, st.frac); st.box.style.cssText = 'position:absolute;pointer-events:none;';   // рамка для подсказки-пальца
    layout(st);
    [...st.dEls, st.comma].forEach((e) => { e.style.translate = `0 ${G.lift}px`; });   // число стоит у земли: его поднимет единица
    [...st.dEls, st.comma].forEach((e, i) => e.animate([{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { duration: T(350), delay: T(i * 30), easing: 'ease-out', fill: 'backwards' }));
    setStats(lvlOf(), solved);
    hint.set('Возьми облако и полей число дождём');
  }

  let sayT = 0;
  function bubble(text, ms = 2600) {
    world.querySelectorAll('.dc-say').forEach((e) => e.remove());
    clearTimeout(sayT);
    const b = mk('dc-say', text);
    b.style.left = `${G.vw / 2}px`; b.style.top = `${G.botY + 18}px`;
    sayT = setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 320); }, T(ms));
  }

  world.addEventListener('pointerdown', (e) => {
    const st = state;
    if (!st || st.busy || st.phase !== 'pre') return;
    if (!e.target.closest('.bf-hit, .bf-d, .bf-comma')) return;
    e.preventDefault();
    if (!MG.tools.need(TOOL)) return;
    rain(st);
  });

  /* ---------- дождь: растёт единица, краска смывается и стекает нулями ---------- */
  async function rain(st) {
    st.busy = true; st.phase = 'rain';
    world.querySelectorAll('.dc-say').forEach((e) => e.classList.add('out'));
    const R = (el) => el.getBoundingClientRect();
    const one = st.den[0], dr = R(one), first = R(st.dEls[0]), lastD = R(st.dEls[st.dEls.length - 1]);
    const soilTop = dr.top + dr.height * 0.88, mid = (first.left + lastD.right) / 2;
    const lift = G.lift;                                             // число уже стоит ниже на lift — единица толкает его вверх
    const group = [...st.dEls, st.comma, st.bar];                    // запятая едет вверх вместе с числом
    st.bar.style.translate = `0 ${lift}px`;
    world.classList.remove('bf-pre');                                // туча пришла — сразу под числом проводится черта
    st.bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: T(700), delay: T(250), easing: 'cubic-bezier(.3,0,.2,1)', fill: 'backwards' });
    st.lv = { from: lift, to: lift, t0: 0, ms: 1 };
    const move = (rem, ms) => {
      group.forEach((el) => {
        const from = el.style.translate || '0 0';
        el.style.translate = `0 ${rem}px`;
        if (ms) el.animate([{ translate: from }, { translate: `0 ${rem}px` }], { duration: ms, easing: 'cubic-bezier(.2,.9,.3,1.25)' });
      });
      st.lv = { from: liftNow(st), to: rem, t0: performance.now(), ms: ms || 1 };
      if (st.sprouts) st.sprouts.forEach((sp) => {                   // нули вылезают из своих горок вместе с единицей
        const from = sp.zero.style.translate || '0 0';
        sp.zero.style.translate = `0 ${rem}px`;
        if (ms) sp.zero.animate([{ translate: from }, { translate: `0 ${rem}px` }], { duration: ms, easing: 'cubic-bezier(.2,.9,.3,1.25)' });
        sp.soil.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${G.fs * 0.03}px) scale(1.04, .94)`, offset: .3 }, { transform: `translateX(${-G.fs * 0.03}px)`, offset: .6 }, { transform: 'none' }], { duration: T(260) });
      });
    };
    const cloudW = Math.max(G.fs * 1.25, (lastD.right - first.left) * 1.15);
    const cloudBottom = { x: mid, y: first.top - cloudW * 0.36 + cloudW * 0.2 };
    await MG.rain.play({
      fs: G.fs, cx: mid, rainX: mid, spread: lastD.right - first.left,
      cloudY: first.top - Math.max(G.fs * 1.25, (lastD.right - first.left) * 1.15) * 0.36,   // облако — над числом, не закрывая цифры
      digitEl: one, digitRect: dr,
      soilX: dr.left + dr.width / 2, soilTop, lift,
      endY: soilTop - G.fs * 0.1,
      onRain() { if (state === st) shimmer(st); },                 // дождь: цифры после запятой переливаются синим
      onStart() {                                                   // под чертой появляется земля: горка единицы и горки нулей — под цифрами
        if (state !== st) return;
        mounds(st, lift);
      },
      setLift(rem, ms) { if (state === st) move(rem, ms); },      // единица рывками толкает черту с числом вверх
      endLift() { if (state === st) { group.forEach((el) => { el.style.translate = ''; }); st.lv = { from: 0, to: 0, t0: 0, ms: 1 }; strike(st, cloudBottom); } },   // дробь выросла — молния выбивает запятую
      onReveal() {
        if (state !== st) return;
        one.style.visibility = '';
        one.animate([{ scale: '.4' }, { scale: '1.25', offset: 0.6 }, { scale: '1' }], { duration: T(360), easing: 'ease-out' });
        burst(one, '#16a34a', 10);
        zeros(st);                                                  // ростки-нули становятся цифрами
        unshimmer(st);
      },
    });
    if (state !== st) return;
    await st.morphed;
    await sleep(700);
    if (state !== st) return;
    finish(st);
  }
  /* текущий сдвиг числителя (по нему тянутся потёки) */
  function liftNow(st) {
    const v = st.lv;
    if (!v) return 0;
    const k = Math.min(1, (performance.now() - v.t0) / v.ms);
    return v.from + (v.to - v.from) * (1 - (1 - k) ** 3);
  }

  /* горки для нулей: такие же, как у единицы (rain.js), — по одной под каждым местом нуля в знаменателе.
     Из них, как и единица, рывками вылезают зелёные ростки-нули */
  const SOIL = `<svg viewBox="0 0 62 24" style="display:block;width:100%;height:100%;overflow:visible"><path d="M3 23 Q6 9 20 8 Q31 5 42 8 Q56 9 59 23 Z" fill="#b8893a" stroke="#6b4a14" stroke-width="2.4" stroke-linejoin="round"/>
    <circle cx="18" cy="16" r="1.8" fill="#7a5418"/><circle cx="31" cy="13" r="1.8" fill="#7a5418"/><circle cx="44" cy="16" r="1.8" fill="#7a5418"/></svg>`;
  /* переливы синего: цифры после запятой и ростки-нули мерцают в такт дождю */
  const BLUES = ['#2f6fe4', '#5b8cff', '#7c5cff', '#38bdf8'];
  const BLUE_KF = [{ color: BLUES[0] }, { color: BLUES[1] }, { color: BLUES[2] }, { color: BLUES[3] }, { color: BLUES[0] }];
  function shimmer(st) {
    st.shim = st.dEls.slice(st.task.p0).map((el, i) => {
      el.animate([{ color: INK }, { color: BLUES[0] }], { duration: T(500), delay: T(i * 160), fill: 'backwards' });
      return el.animate(BLUE_KF, { duration: T(1400), delay: T(i * 160), iterations: Infinity, easing: 'ease-in-out' });
    });
  }
  function unshimmer(st) {
    (st.shim || []).forEach((a) => a.cancel());
    st.shim = null;
    st.dEls.slice(st.task.p0).forEach((el, i) => el.animate([{ color: BLUES[1] }, { color: INK }], { duration: T(500), delay: T(i * 90), fill: 'backwards' }));
  }
  function mounds(st, lift) {
    const { cw, rh, fs } = G, sh = fs * 0.26, sw = fs * 0.7;
    const soilTop = G.denY + rh * 0.88;
    st.sprouts = st.den.slice(1).map((z, i) => {
      const x = parseFloat(z.style.left);
      const clip = mk('bf-clip', undefined, st.frac);                    // росток виден только над землёй
      Object.assign(clip.style, { position: 'absolute', left: `${x - fs * 0.3}px`, width: `${cw + fs * 0.6}px`, top: `${G.denY - fs * 2}px`, height: `${soilTop - (G.denY - fs * 2)}px`, overflow: 'hidden', pointerEvents: 'none' });
      const zero = mk('bf-den', '0', clip);
      Object.assign(zero.style, { left: `${fs * 0.3}px`, top: `${fs * 2}px`, color: BLUES[0], translate: `0 ${lift}px`, transition: 'none' });
      zero.animate(BLUE_KF, { duration: T(1400), delay: T(i * 160), iterations: Infinity, easing: 'ease-in-out' });   // ростки-нули переливаются синим
      const soil = mk('bf-soil', undefined, st.frac);
      soil.innerHTML = SOIL;
      Object.assign(soil.style, { position: 'absolute', width: `${sw}px`, height: `${sh}px`, left: `${x + cw / 2 - sw / 2}px`, top: `${soilTop - sh * 0.78}px`, transformOrigin: '50% 100%', pointerEvents: 'none' });
      soil.animate([{ scale: '1 0', opacity: 0 }, { scale: '1 1.15', opacity: 1, offset: .7 }, { scale: '1 1' }], { duration: T(600), delay: T(i * 90), easing: 'cubic-bezier(.3,1.2,.5,1)', fill: 'both' });
      return { clip, zero, soil, slot: z };
    });
  }
  /* единица выросла — ростки-нули становятся настоящими нулями, горки уходят */
  function zeros(st) {
    if (!st.sprouts) return;
    st.sprouts.forEach((sp, i) => {
      setTimeout(() => {
        if (state !== st) return;
        sp.slot.style.visibility = '';
        sp.slot.animate([{ scale: '.4' }, { scale: '1.25', offset: 0.6 }, { scale: '1' }], { duration: T(360), easing: 'ease-out' });
        burst(sp.slot, '#16a34a', 8);
        sp.clip.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(500), easing: 'ease-in', fill: 'forwards' }).onfinish = () => sp.clip.remove();
        sp.soil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(520), delay: T(150), fill: 'forwards' }).onfinish = () => sp.soil.remove();
      }, T(i * 90));
    });
    st.morphed = sleep(st.sprouts.length * 90 + 600);
  }

  /* молния из тучи бьёт в запятую: вспышка, искры, запятую подбрасывает и с вращением уносит за край экрана */
  function strike(st, from) {
    const cr = st.comma.getBoundingClientRect();
    const tx = cr.left + cr.width / 2, ty = cr.bottom - cr.height * 0.18;     // сама запятая — внизу своей клетки
    const fx = document.createElement('div');
    fx.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:75;';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%'); svg.style.overflow = 'visible';
    fx.append(svg);
    document.body.append(fx);
    const zig = (x0, y0, x1, y1, n, amp) => {
      let d = `M${x0.toFixed(1)} ${y0.toFixed(1)}`;
      for (let i = 1; i < n; i++) { const t = i / n; d += ` L${(x0 + (x1 - x0) * t + (Math.random() * 2 - 1) * amp * (1 - 0.5 * t)).toFixed(1)} ${(y0 + (y1 - y0) * t).toFixed(1)}`; }
      return `${d} L${x1.toFixed(1)} ${y1.toFixed(1)}`;
    };
    const fsz = G.fs;
    const draw = () => {
      const d = zig(from.x + (Math.random() - 0.5) * fsz * 0.4, from.y, tx, ty, 9, fsz * 0.32);
      const br = zig(from.x, from.y + (ty - from.y) * 0.4, from.x + (tx > from.x ? -1 : 1) * fsz * 0.6, from.y + (ty - from.y) * 0.75, 4, fsz * 0.15);
      svg.innerHTML = `<path d="${d}" fill="none" stroke="#facc15" stroke-width="${(fsz * 0.32).toFixed(1)}" stroke-linejoin="round" stroke-linecap="round" opacity=".6" style="filter:blur(4px)"/>
        <path d="${br}" fill="none" stroke="#f59e0b" stroke-width="${(fsz * 0.07).toFixed(1)}" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="${d}" fill="none" stroke="#f59e0b" stroke-width="${(fsz * 0.14).toFixed(1)}" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="${d}" fill="none" stroke="#fffbea" stroke-width="${(fsz * 0.06).toFixed(1)}" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${tx}" cy="${ty}" r="${(fsz * 0.3).toFixed(1)}" fill="#fff7c2" opacity=".85" style="filter:blur(3px)"/>`;
    };
    draw();
    snd('zap'); snd('boom');
    const flash = document.createElement('div');                       // вспышка по всему экрану
    flash.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:74;background:#fffbe0;';
    document.body.append(flash);
    flash.animate([{ opacity: 0.35 }, { opacity: 0 }], { duration: T(350), easing: 'ease-out', fill: 'forwards' }).onfinish = () => flash.remove();
    setTimeout(draw, T(70)); setTimeout(draw, T(150));                 // молния мерцает
    fx.animate([{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: T(320), fill: 'forwards' }).onfinish = () => fx.remove();
    burst(st.comma, '#fde047', 14);
    /* запятую подбрасывает и уносит */
    st.commaGone = true;
    const y0 = parseFloat((st.comma.style.translate || '0 0').split(' ')[1]) || 0, dir = Math.random() < 0.5 ? -1 : 1;
    st.comma.style.color = '#fde047';
    st.comma.animate([{ color: '#fffbea' }, { color: INK }], { duration: T(400), fill: 'forwards' });
    st.comma.animate([
      { translate: `0 ${y0}px`, rotate: '0deg', scale: '1' },
      { translate: `${dir * G.cw * 0.8}px ${y0 - G.rh * 1.1}px`, rotate: `${dir * 260}deg`, scale: '1.25', offset: 0.3 },
      { translate: `${dir * G.cw * 2.6}px ${y0 + G.vh}px`, rotate: `${dir * 900}deg`, scale: '1' }],
    { duration: T(1300), easing: 'cubic-bezier(.3,.6,.7,1)', fill: 'forwards' });
  }

  async function finish(st) {
    st.phase = 'done';
    const tk = st.task;
    /* числитель смыкается; ведущие нули не пишут: 0035 → 35 */
    for (let i = 0; i < tk.lead; i++) st.dEls[i].classList.add('gone');
    await sleep(tk.lead ? 380 : 100);
    if (state !== st) return;
    st.cut = tk.lead;
    st.denRight = false;                                             // знаменатель встаёт по центру под чертой
    placeAll(st);
    await sleep(560);
    if (state !== st) return;
    /* дробь отъезжает вправо, слева появляется исходный пример: 1,267 = 1267/1000 */
    const fw = Math.max(tk.num.length, tk.den.length) * G.cw + G.cw * 0.3;
    const sc = Math.min(1, (G.vw - 16) / (G.leftU * G.cw + fw));              // строка «1,267 = дробь» должна влезть в ширину
    const eqX0 = Math.round((G.vw - (G.leftU * G.cw + fw) * sc) / 2);
    const midY = G.barY + G.bt / 2;
    st.frac.style.transformOrigin = `${G.cx}px ${midY}px`;
    st.frac.style.scale = `${sc}`;
    st.frac.style.translate = `${eqX0 + (G.leftU * G.cw + fw / 2) * sc - G.cx}px 0`;
    const left = mk('bf-left');
    const sp = (t, c) => { const s = document.createElement('span'); s.textContent = t; if (c) s.className = c; left.append(s); return s; };
    tk.str.split('').forEach((ch) => sp(ch, ch === ',' ? 'c' : ''));
    sp('=');
    left.style.left = `${eqX0}px`; left.style.transformOrigin = '0 50%'; left.style.scale = `${sc}`; left.style.top = `${midY - G.rh / 2}px`;
    left.querySelectorAll('span').forEach((s, i) => s.animate([{ opacity: 0, translate: '-10px 0' }, { opacity: 1, translate: '0 0' }], { duration: T(350), delay: T(350 + i * 40), easing: 'ease-out', fill: 'backwards' }));
    setTimeout(() => {
      if (state !== st) return;
      [...st.dEls.slice(tk.lead), ...st.den].forEach((e, i) => e.animate([{ color: INK }, { color: '#16a34a', offset: 0.4 }, { color: '#16a34a' }], { duration: T(600), delay: T(i * 40), fill: 'forwards' }));
      snd('pop'); burst(st.den[st.den.length - 1], '#16a34a', 16);
    }, T(800));
    solved++;
    setStats(lvlOf(), solved);
    resultText.textContent = `${tk.str} = ${tk.num}/${tk.den}`;
    after.classList.add('show');
    if (solved >= TOTAL) setTimeout(offerDone, T(1200));
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  function offerDone() {
    if (document.querySelector('.so-ov')) return;
    const ov = document.createElement('div');
    ov.className = 'so-ov';
    ov.innerHTML = '<div class="skip-offer" role="dialog"><h3>Уровень пройден!</h3><p>Ты научился переводить десятичные дроби в обыкновенные. Идём дальше.</p><div class="so-row"><button type="button" class="so-go">На карту</button></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('.so-go').addEventListener('click', () => {
      try { localStorage.setItem(`mg.solved.${NAME}`, String(Math.max(TOTAL, solved))); } catch (err) { /* нет хранилища */ }
      ov.remove();
      const home = document.getElementById('home-btn');
      if (home) home.click();
    });
  }

  nextBtn.addEventListener('click', () => {
    if (solved >= TOTAL) { offerDone(); return; }
    const o = document.querySelector('.so-ov'); if (o) o.remove();
    newRound();
  });
  window.addEventListener('toolchange', (e) => {
    if (MG.active !== MG.modes[NAME] || e.detail.tool !== TOOL || !state || state.phase !== 'pre') return;
    bubble('Нажми на число — дождь смоет красную краску, и она стечёт в знаменатель нулями', 3200);
  });
  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (MG.active === MG.modes[NAME] && state && !state.busy && state.phase !== 'done') layout(state); }, 150);
  });

  MG.modes[NAME] = {
    total: TOTAL,
    levelUp() { solved = Math.min(TOTAL, (Math.floor(solved / 2) + 1) * 2); if (solved >= TOTAL) { setStats(lvlOf(), solved); offerDone(); return; } newRound(); },
    start() {
      if (MG.tools.current()) MG.tools.clear();
      if (!state) newRound(); else { setStats(lvlOf(), solved); layout(state); }
    },
    skip() { if (solved >= TOTAL) { offerDone(); return; } newRound(); },
    stop() { if (state && (state.busy || state.phase === 'done')) state = null; },
    /* подсказка-палец (coach.js): сначала взять облако, потом нажать на число */
    coachStep() {
      const st = state;
      if (!st || st.phase !== 'pre' || st.busy) return null;
      return { tool: TOOL, el: st.dEls[st.dEls.length - 1], text: 'Нажми на число — пойдёт дождь' };
    },
    _state: () => state,
  };
})();
