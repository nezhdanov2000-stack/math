/* Режим «Умножение на 10, 100, 1000…» (dec10), остров III раздела «Десятичные дроби».
 * Инструмент — гарпунное ружьё с катушкой (harpoon).
 *
 * 1) Выбираешь ружьё — оно выезжает справа от примера «12,74 × 10».
 * 2) Перетаскиваешь цифры множителя в ружьё: единица — это гарпун, каждый ноль — один оборот катушки
 *    (ручка делает полный оборот, счётчик +1). Забранные цифры в примере становятся серыми.
 * 3) Когда всё заряжено, тап по ружью — БУМ: гарпун летит влево и цепляет запятую (у целого числа она
 *    прячется в конце и проявляется). Стрелять незаряженным нельзя — ружьё щёлкает вхолостую.
 * 4) Каждый тап — катушка делает оборот, запятая подтягивается на одну цифру вправо, счётчик −1.
 *    Цифр не хватает — на пустом месте появляется 0 (серый, потом чернеет). Запятая в конце числа исчезает.
 * 5) Счётчик 0 — пример готов: «12,74 × 10 = 127,4».
 * 8 примеров: обезьяна — × 10 и × 100 (один пример с целым), человек — до 1000, профессор — до 10000,
 * робот — вперемешку до 10000 и с нулями.
 *
 * Тот же файл делает и режим «Деление на 10, 100, 1000…» (dec10d): синее ружьё выезжает слева,
 * гарпун летит вправо, катушка тянет запятую влево; не хватает цифр — слева появляются серые нули (3,5 : 100 = 0,035). */
(() => {
  'use strict';
  const MG = window.MG;
  const { $, T, sleep, ri, setStats, burst } = MG;
  const snd = (n, o) => { if (MG.snd && MG.snd.play) MG.snd.play(n, o); };

  let cssDone = false;
  function build(cfg) {
  const NAME = cfg.name, TOOL = cfg.tool;
  let D = 1, nR = 0;                                                 // D = 1: умножение, запятая едет вправо; −1: деление, влево. Примеры чередуются
  const view = $(`#${cfg.p}-view`);
  const world = $(`#${cfg.p}-world`);
  const after = $(`#${cfg.p}-after`);
  const resultText = $(`#${cfg.p}-resultText`);
  const nextBtn = $(`#${cfg.p}-next`);
  if (!view || !world) return;
  const hint = MG.hinter($(`#${cfg.p}-hint`));

  if (!cssDone) {
  cssDone = true;
  const css = document.createElement('style');
  css.textContent = `
    .hp-mode { justify-content: flex-start; gap: 6px; position: relative; }
    .hp-view { position: relative; width: min(100%, 460px); flex: 1 1 auto; min-height: 360px; overflow: hidden; }
    .hp-world { position: absolute; inset: 0; }
    .hp-d { position: absolute; left: 0; top: 0; width: var(--cw); height: var(--rh); display: grid; place-items: center; font-weight: 900; font-size: calc(var(--cw) * .88); line-height: 1; color: #1d1d1f; transition: left .6s cubic-bezier(.4,0,.2,1), color .4s, opacity .4s; }
    .hp-world.snap .hp-d, .hp-world.snap .hp-x, .hp-world.snap .hp-comma { transition: none; }
    .hp-d.m { cursor: grab; touch-action: none; }
    .hp-d.took { color: #c9c9c3; cursor: default; }
    .hp-d.new { color: #b9b9b2; }
    .hp-d.dim { opacity: .25; }
    .hp-comma { position: absolute; left: 0; top: 0; width: calc(var(--cw) * .4); height: var(--rh); display: grid; place-items: end center; font-weight: 900; font-size: calc(var(--cw) * .88); line-height: 1.15; color: #1d1d1f; transition: left .5s cubic-bezier(.4,0,.2,1), opacity .3s; pointer-events: none; }
    .hp-comma.hid { opacity: 0; }
    .hp-comma.hook { color: #e0362d; }
    .hp-x { position: absolute; left: 0; top: 0; width: var(--cw); height: var(--rh); display: grid; place-items: center; font-weight: 900; font-size: calc(var(--cw) * .8); color: #1d1d1f; transition: left .6s cubic-bezier(.4,0,.2,1); }
    .hp-gun { position: absolute; left: 0; top: 0; z-index: 5; cursor: pointer; touch-action: none; transform: translateX(var(--hp-in, 400px)); transition: transform .8s cubic-bezier(.3,1.2,.4,1); }
    .hp-gun.in { transform: none; }
    .hp-gun svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .hp-gun .reel { transform-box: fill-box; transform-origin: center; }
    .hp-gun .harp { opacity: 0; transition: opacity .25s; }
    .hp-gun.loaded .harp { opacity: 1; }
    .hp-gun.shot .harp { opacity: 0; }
    .hp-reel { position: absolute; left: 0; top: 0; z-index: 6; cursor: pointer; touch-action: none; transform: translateX(var(--hp-in, 400px)); transition: transform .8s cubic-bezier(.3,1.2,.4,1), scale .45s cubic-bezier(.3,1.5,.5,1); }
    .hp-reel.in { transform: none; }
    .hp-fly-ring { position: fixed; z-index: 70; translate: -50% -50%; border: 3px solid #1d1d1f; border-radius: 50%; pointer-events: none; box-sizing: border-box; }
    .hp-wind { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; z-index: 70; pointer-events: none; overflow: visible; }
    .hp-ring { position: absolute; border: 3px solid #1d1d1f; border-radius: 50%; pointer-events: none; box-sizing: border-box; }
    .hp-reel.big { scale: 2; }
    .hp-reel svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .hp-reel .reel { transform-box: fill-box; transform-origin: center; }
    .hp-reel .lay { transition: stroke-width .5s ease-in-out, r .5s ease-in-out; }
    .hp-gun.gone { opacity: 0; transition: opacity .4s, transform .5s; transform: translateX(30%); pointer-events: none; }
    .hp-cnt { position: absolute; left: 50%; bottom: calc(100% + 14px); translate: -50% 0; min-width: 24px; height: 24px; padding: 0 5px; box-sizing: border-box; border: 2.5px solid #e0362d; border-radius: 8px; background: #fff; color: #e0362d; font-weight: 900; font-size: 14px; line-height: 19px; text-align: center; pointer-events: none; box-shadow: 0 2px 0 rgba(224,54,45,.35); }
    .hp-arrow { position: absolute; left: 0; top: 0; z-index: 6; pointer-events: none; }
    .hp-arrow svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .hp-line { position: absolute; inset: 0; z-index: 4; pointer-events: none; overflow: visible; }
    .hp-tag { position: absolute; z-index: 7; pointer-events: none; white-space: nowrap; padding: 2px 8px; border-radius: 8px; background: #1d1d1f; color: #fff; font-weight: 800; font-size: 13px; }
    .hp-fire { position: absolute; z-index: 7; translate: -50% 0; padding: 5px 14px 6px; border: 3px solid #1d1d1f; border-radius: 14px 8px 16px 10px; background: #ffd23f; color: #e0362d; font-family: inherit; font-weight: 900; font-size: 18px; line-height: 1; letter-spacing: .06em; box-shadow: 0 4px 0 #1d1d1f; rotate: -6deg; cursor: pointer; touch-action: manipulation; animation: hpFire .9s ease-in-out infinite; }
    .hp-fire:active { box-shadow: 0 1px 0 #1d1d1f; translate: -50% 3px; }
    @keyframes hpFire { 0%, 100% { scale: 1; } 50% { scale: 1.14; box-shadow: 0 4px 0 #1d1d1f, 0 0 0 7px rgba(255,210,63,.45); } }
    .hp-comma { transform-origin: 50% 82%; transition: left .5s cubic-bezier(.4,0,.2,1), opacity .3s, rotate .35s cubic-bezier(.3,1.6,.5,1), color .3s; }
    .hp-comma.lie { rotate: -90deg; scale: 1.35; }
    .hp-reel.big .hp-cnt { scale: .6; transform-origin: 50% 100%; bottom: calc(100% + 3px); }
    .hp-mode .dc-say { translate: -50% 0; }
    .hp-mode .dc-say::after { top: -6px; bottom: auto; }
    .hp-boom { position: absolute; z-index: 7; pointer-events: none; padding: 3px 10px; border: 3px solid #1d1d1f; border-radius: 12px 6px 14px 8px; background: #ffd23f; color: #e0362d; font-weight: 900; font-size: 16px; letter-spacing: .06em; box-shadow: 0 3px 0 #1d1d1f; rotate: -8deg; }
    .hp-fx { position: absolute; z-index: 7; pointer-events: none; overflow: visible; }
    .hp-gun.hot svg, .hp-reel.hot svg { filter: drop-shadow(0 0 7px rgba(255,200,40,.95)); }
    .hp-gun.ready, .hp-reel.ready { animation: hpReady 1.1s ease-in-out infinite; }
    @keyframes hpReady { 50% { filter: drop-shadow(0 0 7px rgba(224,54,45,.75)); } }
    .hp-cnt.flip { animation: hpFlip .35s ease-out; }
    @keyframes hpFlip { 0% { transform: rotateX(0); } 50% { transform: rotateX(90deg); } 100% { transform: rotateX(0); } }
    .hp-ghost { position: fixed; z-index: 70; pointer-events: none; translate: -50% -50%; font-weight: 900; color: #1d1d1f; text-shadow: 0 4px 8px rgba(0,0,0,.2); }
    .hp-res { position: absolute; left: 0; top: 0; display: flex; align-items: center; white-space: nowrap; transform-origin: 0 50%; }
    .hp-res span { display: block; width: var(--cw); text-align: center; font-weight: 900; font-size: calc(var(--cw) * .88); line-height: var(--rh); color: #1d1d1f; }
    .hp-res span.c { width: calc(var(--cw) * .45); }
    .hp-res .ans { color: var(--ok); }
    .hp-mode .after { position: absolute; left: 50%; top: var(--hp-after, 50%); z-index: 7; width: min(92%, 380px); translate: -50% 10px; min-height: 0; }
    .hp-mode .after.show { translate: -50% 0; }
    body[data-tool="harpoon"] .stage, body[data-tool="harpoon"] .stage .hp-d.m { cursor: var(--cur-harpoon, pointer) !important; }
    body[data-tool="harpoonB"] .stage, body[data-tool="harpoonB"] .stage .hp-d.m { cursor: var(--cur-harpoonB, pointer) !important; }
    .hp-comma.lie-r { rotate: 90deg; scale: 1.35; }
    .hp-world.dv .hp-gun.gone { transform: translateX(-30%); }
  `;
  document.head.append(css);
  }

  /* ружьё смотрит влево: ствол, жёлтая рукоять, катушка сверху; гарпун торчит из ствола, когда заряжен */
  const GUN = `<svg viewBox="0 0 84 44" stroke-linejoin="round" stroke-linecap="round">
    <g class="harp" fill="none" stroke="#1d1d1f" stroke-width="3"><path d="M1 21 H15"/><path d="M1 21 L7.5 26.5"/></g>
    <rect x="16" y="16.5" width="46" height="9" rx="3" fill="#7b8494" stroke="#2b2f3a" stroke-width="2"/>
    <path d="M20 19 H56" stroke="#d3d9e3" stroke-width="1.8"/>
    <path d="M29 16.5 V25.5 M53 16.5 V25.5" stroke="#4a4f5c" stroke-width="2.4"/>
    <rect x="12" y="15" width="6" height="12" rx="2" fill="#5b616e" stroke="#2b2f3a" stroke-width="2"/>
    <path d="M21 16.5 V12.5 H25 V16.5" fill="#5b616e" stroke="#2b2f3a" stroke-width="1.6"/>
    <path d="M57 15.5 H75 Q81 15.5 81 21.5 V24.5 Q81 26.5 79 26.5 H72 L69.7 40 Q69.2 42 67.2 42 H61.7 Q59.7 42 60.1 40 L62.7 26.5 H57Z" fill="#ff8a1f" stroke="#a84a00" stroke-width="2"/>
    <path d="M64 18.8 H77" stroke="#ffd2a1" stroke-width="2" opacity=".85"/>
    <path d="M63.6 27.6 L61.3 39.8 H64.4 L66.7 27.6Z" fill="#e8690a"/>
    <path d="M69.6 28 L67.9 37.5" stroke="#ffd2a1" stroke-width="1.6" opacity=".75"/>
    <path d="M62.6 27.8 Q62.1 30.2 60 30.7" fill="none" stroke="#1d1d1f" stroke-width="1.8"/>
  </svg>`;
  /* деление: ружьё смотрит вправо, рукоять синяя */
  const GUN_DIV = GUN.replace(/(<svg[^>]*>)/, '$1<g transform="translate(84 0) scale(-1 1)">').replace('</svg>', '</g></svg>')
      .replace('fill="#ff8a1f" stroke="#a84a00"', 'fill="#3f8cff" stroke="#1d4f9f"').replace(/#ffd2a1/g, '#d2e5ff').replace('#e8690a', '#2a6fd6');
  /* катушка — отдельно: стоит прямо на стволе, после попадания ружьё уходит, а катушка остаётся и подрастает */
  const REEL = `<svg viewBox="0 0 24 24" stroke-linejoin="round" stroke-linecap="round"><g class="reel">
    <circle cx="12" cy="12" r="10" fill="#d8dbe2" stroke="#2b2f3a" stroke-width="2"/>
    <circle class="lay" cx="12" cy="12" r="11.3" fill="none" stroke="#1d1d1f" stroke-width="1.6" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90 12 12)"/>
    <path d="M12 3 V21 M3 12 H21 M5.6 5.6 L18.4 18.4 M18.4 5.6 L5.6 18.4" stroke="#6b7080" stroke-width="1.2"/>
    <circle cx="12" cy="12" r="2.8" fill="#2b2f3a"/>
    <path d="M12 12 L19 5" stroke="#2b2f3a" stroke-width="2.2"/><circle cx="19.5" cy="4.5" r="2.4" fill="#e0362d" stroke="#2b2f3a" stroke-width="1.2"/></g></svg>`;
  const REEL_C = [42, 25.5], REEL_D = 15;                           // центр и диаметр катушки в координатах ружья (84×44)
  /* гарпун — это лежащая единица: остриё слева, зубец (флажок единицы) только снизу */
  const ARROW = `<svg viewBox="0 0 24 12" fill="none" stroke="#1d1d1f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 5 H23"/><path d="M1.5 5 L7.5 10.5"/></svg>`;
  const ARROW_DIV = ARROW.replace('<path d="M1.5 5 H23"/><path d="M1.5 5 L7.5 10.5"/>', '<path d="M22.5 5 H1"/><path d="M22.5 5 L16.5 10.5"/>');
  const sign = () => (D > 0 ? '×' : ':'), word = () => (D > 0 ? 'множителя' : 'делителя');

  /* ---------- примеры ---------- */
  const TOTAL = 8;
  let state = null, solved = 0, lastKey = '';
  const lvlOf = () => Math.min(4, 1 + Math.floor(solved / 2));

  function makeTask(str, z) {
    const [ip, fp = ''] = str.split(',');
    const digits = (ip + fp).split('');
    const p0 = ip.length, isInt = !fp;
    /* ответ */
    let d = digits.slice(), p = p0 + D * z;
    while (d.length < p) d.push('0');
    if (p < 1) { d = Array(1 - p).fill('0').concat(d); p = 1; }       // деление: слева дописываются нули — 0,035
    let I = d.slice(0, p).join('').replace(/^0+(?=\d)/, ''), F = d.slice(p).join('').replace(/0+$/, '');
    const ans = F ? `${I},${F}` : I;
    const off0 = D < 0 ? Math.max(0, z - p0 + 1) : 0;              // сколько пустых клеток оставить слева
    return { str, z, mult: `1${'0'.repeat(z)}`, digits, p0, isInt, ans, off0, N: D < 0 ? digits.length + off0 : Math.max(digits.length, p) };
  }
  const nz = () => String(ri(1, 9));
  const dg = () => String(ri(0, 9));
  function randDec(fl) { let f = ''; for (let i = 0; i < fl; i++) f += i === fl - 1 ? nz() : dg(); return `${ri(0, 1) ? ri(1, 99) : ri(1, 9)},${f}`; }
  function pick() {
    const L = lvlOf(), second = solved % 2 === 1;
    D = nR++ % 2 ? -1 : 1;                                          // умножить — поделить — умножить…
    if (solved === 0 && !lastKey) return makeTask('12,74', 1);
    for (let i = 0; i < 200; i++) {
      let t;
      if (L === 1) t = second ? makeTask(String(D < 0 ? ri(2, 999) : ri(2, 99)), ri(1, 2)) : makeTask(randDec(ri(1, 3)), ri(1, 2));
      else if (L === 2) t = makeTask(randDec(ri(1, 3)), ri(2, 3));
      else if (L === 3) t = makeTask(randDec(ri(1, 3)), ri(2, 4));
      else if (D < 0) t = ri(0, 1) ? makeTask(String(ri(10, 9999)), ri(2, 4)) : makeTask(randDec(ri(1, 2)), ri(3, 4));
      else t = ri(0, 2) ? makeTask(`0,${ri(0, 1) ? '0' : ''}${nz()}${ri(0, 1) ? nz() : ''}`, ri(2, 4)) : makeTask(randDec(1), ri(3, 4));
      if (`${t.str}x${t.mult}` === lastKey) continue;
      return t;
    }
    return makeTask('3,5', 2);
  }

  /* ---------- геометрия ---------- */
  let G = null;
  /* wide — выбран гарпун: у числа место под будущие цифры, справа ружьё; иначе пример записан как обычно */
  function geom(tk, wide) {
    const vw = Math.max(260, view.clientWidth), vh = Math.max(340, view.clientHeight);
    const unitsW = tk.N + 1.2 + tk.mult.length + 0.6 + 4.6;
    const cw = Math.max(16, Math.floor(Math.min(48, (vw - 16) / unitsW)));   // размер цифр одинаковый в обоих видах
    const rh = Math.round(cw * 1.3);
    const gunW = cw * 4.4, gunH = gunW * 44 / 84;
    const nCells = wide ? tk.N : tk.digits.length;
    const units = wide ? unitsW : nCells + 1.2 + tk.mult.length;
    const total = units * cw - 0.2 * cw;
    const y = Math.round(Math.min(vh * 0.3, 150));
    let x0 = Math.round((vw - total) / 2), gx;
    if (D < 0) { gx = wide ? x0 + 0.2 * cw : 6; if (wide) x0 = Math.round(gx + gunW + 0.6 * cw); }   // деление: ружьё слева
    const xMul = x0 + (nCells + 1.2) * cw;
    if (D > 0) gx = wide ? xMul + (tk.mult.length + 0.6) * cw : vw - gunW - 6;
    const gy = y + rh / 2 - gunH * 0.48;
    return { vw, vh, cw, rh, gunW, gunH, x0, y, xMul, gx, gy, nCells, wide };
  }
  const offN = () => (G.wide && state ? state.off || 0 : 0);           // деление: пустые клетки слева под будущие нули
  const cellX = (i) => G.x0 + (i + offN()) * G.cw;
  const commaX = (b) => G.x0 + (b + offN()) * G.cw;                       // граница между цифрами b−1 и b

  /* ---------- элементы ---------- */
  const mk = (cls, txt) => { const e = document.createElement('div'); e.className = cls; if (txt !== undefined) e.textContent = txt; world.append(e); return e; };
  function placeAll(st) {
    world.style.setProperty('--cw', `${G.cw}px`);
    world.style.setProperty('--rh', `${G.rh}px`);
    world.style.setProperty('--hp-in', `${D > 0 ? Math.round(G.vw - G.gx + 30) : -Math.round(G.gx + G.gunW + 30)}px`);   // ружьё и катушка въезжают вместе, одним куском
    st.dEls.forEach((el, i) => { el.style.left = `${cellX(i)}px`; el.style.top = `${G.y}px`; });
    st.comma.style.left = `${commaX(st.p) - G.cw * 0.2}px`; st.comma.style.top = `${G.y}px`;
    st.xEl.style.left = `${G.x0 + (G.nCells + 0.1) * G.cw}px`; st.xEl.style.top = `${G.y}px`;
    st.mEls.forEach((el, i) => { el.style.left = `${G.xMul + i * G.cw}px`; el.style.top = `${G.y}px`; });
    Object.assign(st.gun.style, { left: `${G.gx}px`, top: `${G.gy}px`, width: `${G.gunW}px`, height: `${G.gunH}px` });
    const rd = G.gunW * REEL_D / 84;
    Object.assign(st.reel.style, { left: `${reelX() - rd / 2}px`, top: `${reelY() - rd / 2}px`, width: `${rd}px`, height: `${rd}px` });
    if (st.arrow || st.hookK) placeArrow(st);
    view.parentElement.style.setProperty('--hp-after', `${view.offsetTop + G.y + G.rh + 30}px`);
  }
  /* кончик ствола и место гарпуна у запятой */
  const mxr = (x) => (D > 0 ? x : 84 - x);                          // зеркалим координаты ружья для деления
  const tipX = () => G.gx + G.gunW * mxr(12) / 84, tipY = () => G.gy + G.gunH * 21 / 44;
  const reelX = () => G.gx + G.gunW * mxr(REEL_C[0]) / 84, reelY = () => G.gy + G.gunH * REEL_C[1] / 44;
  /* гарпун и леска; st.sag — провис лески (в полёте и когда «звенит» после рывка) */
  function placeArrow(st, x) {
    const aw = G.cw * 0.9, ah = aw / 2;
    const c = x !== undefined ? x : commaX(st.p);                   // c — точка у запятой (остриё гарпуна)
    st.ax = c;
    const ax = D > 0 ? c - aw * 0.12 : c - aw * 0.88;
    const ay = G.y + G.rh * 0.78;
    if (st.arrow) Object.assign(st.arrow.style, { width: `${aw}px`, height: `${ah}px`, left: `${ax}px`, top: `${ay - ah / 2}px` });
    const fx = st.reelOnly ? reelX() : tipX(), fy = st.reelOnly ? reelY() : tipY();
    let ex = D > 0 ? ax + aw * 0.95 : ax + aw * 0.05, ey = ay;
    if (st.hookK) {                                                   // гарпун исчез — леска привязана к хвостику лежащей запятой
      const hx = c + D * G.cw * 0.22, hy = G.y + G.rh * 0.86;
      ex += (hx - ex) * st.hookK; ey += (hy - ey) * st.hookK;
    }
    const mx = (fx + ex) / 2, my = (fy + ey) / 2 + (st.sag || 0);
    st.line.innerHTML = `<path d="M${fx} ${fy} Q${mx} ${my} ${ex} ${ey}" fill="none" stroke="#4a4f5c" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  /* леска звенит: затухающие колебания провиса */
  function twang(st, amp, ms = 700) {
    const t0 = performance.now(), dur = T(ms);
    (function f(now) {
      if (state !== st || !(st.arrow || st.hookK)) return;
      const t = now - t0;
      st.sag = t >= dur ? 0 : amp * Math.exp(-t / (dur / 4)) * Math.cos(t / 38);
      placeArrow(st, st.ax);
      if (t < dur) requestAnimationFrame(f);
    })(t0);
  }
  /* искры-лучики вокруг точки */
  function sparks(x, y, color = '#ffd23f', n = 8, r = 18) {
    const sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sv.setAttribute('class', 'hp-fx'); sv.setAttribute('width', r * 4); sv.setAttribute('height', r * 4);
    sv.setAttribute('viewBox', `${-r * 2} ${-r * 2} ${r * 4} ${r * 4}`);
    let d = '';
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; d += `M${(Math.cos(a) * r * 0.55).toFixed(1)} ${(Math.sin(a) * r * 0.55).toFixed(1)} L${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)} `; }
    sv.innerHTML = `<path d="${d}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
    sv.style.left = `${x - r * 2}px`; sv.style.top = `${y - r * 2}px`;
    world.append(sv);
    sv.animate([{ scale: '.3', opacity: 1 }, { scale: '1.4', opacity: 0 }], { duration: T(450), easing: 'ease-out', fill: 'forwards' }).onfinish = () => sv.remove();
  }
  function puff(x, y, dx = -20) {
    const p = mk('dc-dust'), sz = 14 + Math.random() * 12;
    Object.assign(p.style, { width: `${sz}px`, height: `${sz}px`, left: `${x - sz / 2}px`, top: `${y - sz / 2}px` });
    p.animate([{ scale: '.3', opacity: 0 }, { scale: '1', opacity: .9, offset: 0.2 }, { scale: '1.8', opacity: 0, translate: `${dx}px -14px` }], { duration: T(700), easing: 'ease-out', fill: 'forwards' }).onfinish = () => p.remove();
  }
  const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* нет вибро */ } };

  function layout(st, anim) { G = geom(st.task, st.wide); if (!anim) world.classList.add('snap'); placeAll(st); void world.offsetWidth; world.classList.remove('snap'); }

  /* ---------- раунд ---------- */
  function newRound() {
    window.dispatchEvent(new Event('mg:round'));
    const task = pick();
    lastKey = `${task.str}x${task.mult}`;
    world.classList.toggle('dv', D < 0);
    after.classList.remove('show');
    world.replaceChildren();
    if (MG.tools.current()) MG.tools.clear();
    const st = { task, phase: 'load', busy: false, p: task.p0, loaded: 0, harp: false, cnt: 0, off: task.off0 };
    state = st;
    st.line = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); st.line.setAttribute('class', 'hp-line'); world.append(st.line);
    st.dEls = task.digits.map((d) => mk('hp-d', d));
    st.comma = mk(`hp-comma${task.isInt ? ' hid' : ''}`, ',');
    st.xEl = mk('hp-x', sign());
    st.mEls = task.mult.split('').map((d) => { const e = mk('hp-d m', d); return e; });
    st.gun = mk('hp-gun'); st.gun.innerHTML = D > 0 ? GUN : GUN_DIV;
    st.reel = mk('hp-reel'); st.reel.innerHTML = `${REEL}<span class="hp-cnt">0</span>`;
    layout(st);
    [...st.dEls, st.xEl, ...st.mEls].forEach((e, i) => e.animate([{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { duration: T(350), delay: T(i * 30), easing: 'ease-out', fill: 'backwards' }));
    setStats(lvlOf(), solved);
    hint.set('Выбери гарпунное ружьё');
  }

  let sayT = 0;
  function bubble(text, ms = 2600) {
    world.querySelectorAll('.dc-say').forEach((e) => e.remove());
    clearTimeout(sayT);
    const b = mk('dc-say', text);
    const fire = world.querySelector('.hp-fire');
    b.style.left = `${G.vw / 2}px`; b.style.top = `${Math.max(G.y + G.rh, G.gy + G.gunH, fire ? G.gy + G.gunH + 52 : 0) + 14}px`;
    sayT = setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 320); }, T(ms));
  }

  function gunIn(st) {
    if (st.gun.classList.contains('in')) return;
    st.wide = true; layout(st, true);                                // пример раздвигается — место для новых цифр и ружья
    st.gun.classList.add('in'); st.reel.classList.add('in');
    snd('whoosh', { dur: 0.6 });
    bubble(`Перетащи в ружьё цифры ${word()}: единица — гарпун, нули — обороты катушки`, 3200);
  }

  const setCnt = (st) => { st.reel.querySelector('.hp-cnt').textContent = st.cnt; };
  const spinReel = (st, turns = 1) => st.reel.querySelector('.reel').animate([{ rotate: '0deg' }, { rotate: `${turns * 360}deg` }], { duration: T(520 * turns), easing: 'ease-in-out' }).finished.catch(() => {});

  /* ---------- зарядка: перетаскиваем цифры множителя в ружьё ---------- */
  let drag = null;
  world.addEventListener('pointerdown', (e) => {
    const st = state;
    if (!st) return;
    const el = e.target.closest('.hp-d.m');
    if (el && !el.classList.contains('took') && st.phase === 'load') {
      e.preventDefault();
      if (!MG.tools.need(TOOL)) return;
      gunIn(st);
      const r = el.getBoundingClientRect();
      const g = document.createElement('div');
      g.className = 'hp-ghost'; g.textContent = el.textContent;
      Object.assign(g.style, { left: `${e.clientX}px`, top: `${e.clientY}px`, fontSize: `${r.height * 0.68}px` });
      document.body.append(g);
      g.animate([{ scale: '1', rotate: '0deg' }, { scale: '1.3', rotate: '-6deg' }], { duration: T(180), easing: 'ease-out', fill: 'forwards' });   // цифра «поднимается» в руке
      el.classList.add('took');
      drag = { st, el, g };
      try { world.setPointerCapture(e.pointerId); } catch (err) { /* нет захвата */ }
      snd('tick');
      return;
    }
    if (e.target.closest('.hp-gun, .hp-reel')) { e.preventDefault(); gunTap(st); }
  });
  const inZone = (st, x, y) => { const gr = st.gun.getBoundingClientRect(); return x > gr.left - 50 && x < gr.right + 30 && y > gr.top - 60 && y < gr.bottom + 50; };
  world.addEventListener('pointermove', (e) => {
    if (!drag) return;
    Object.assign(drag.g.style, { left: `${e.clientX}px`, top: `${e.clientY}px` });
    const hot = inZone(drag.st, e.clientX, e.clientY);              // ружьё подсвечивается, когда цифру можно отпустить
    drag.st.gun.classList.toggle('hot', hot); drag.st.reel.classList.toggle('hot', hot && drag.el.textContent === '0');
  });
  const endDrag = (e) => {
    if (!drag) return;
    const { st, el, g } = drag; drag = null;
    if (state !== st) { g.remove(); return; }
    st.gun.classList.remove('hot'); st.reel.classList.remove('hot');
    g.getAnimations().forEach((a) => a.cancel());
    if (inZone(st, e.clientX, e.clientY)) { load(st, el, g); return; }
    const r = el.getBoundingClientRect();
    snd('nope');
    g.animate([{ left: g.style.left, top: g.style.top }, { left: `${r.left + r.width / 2}px`, top: `${r.top + r.height / 2}px` }], { duration: T(350), easing: 'ease-in-out', fill: 'forwards' })
      .finished.catch(() => {}).then(() => { g.remove(); el.classList.remove('took'); });
    bubble('Цифру нужно бросить в ружьё', 1800);
  };
  world.addEventListener('pointerup', endDrag);
  world.addEventListener('pointercancel', endDrag);

  /* ноль летит к барабану одним плавным движением, касается его, лента размыкается,
     барабан (вместе с ручкой) делает оборот и наматывает её на себя */
  function windZero(st, g, x0, y0, gh) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'hp-wind');
    const band = document.createElementNS(NS, 'path'), wrap = document.createElementNS(NS, 'path');
    const sw = Math.max(2.5, gh * 0.11);
    const rr0 = st.reel.getBoundingClientRect(), lw = rr0.width * 1.6 / 24;   // толщина слоя на барабане
    [band, wrap].forEach((e) => { e.setAttribute('fill', 'none'); e.setAttribute('stroke', '#1d1d1f'); e.setAttribute('stroke-width', sw.toFixed(1)); e.setAttribute('stroke-linecap', 'round'); svg.append(e); });
    document.body.append(svg);
    g.style.opacity = '0';
    const reelG = st.reel.querySelector('.reel');
    const rr = st.reel.getBoundingClientRect(), cx = rr.left + rr.width / 2, cy = rr.top + rr.height / 2;
    const Rd = rr.width * 10.6 / 24;                                  // обод барабана
    const ax = cx, ay = cy - Rd;                                      // точка касания — верх барабана
    const rx = gh * 0.2, ry = gh * 0.29, N = 48;
    const loop = [];                                                  // лента-ноль: от нижней точки, влево и по кругу
    for (let i = 0; i <= N; i++) { const t = Math.PI / 2 + (i / N) * Math.PI * 2; loop.push([D * rx * Math.cos(t), ry * Math.sin(t)]); }
    const seg = [0]; for (let i = 1; i <= N; i++) seg.push(seg[i - 1] + Math.hypot(loop[i][0] - loop[i - 1][0], loop[i][1] - loop[i - 1][1]));
    const L = seg[N];
    const at = (d) => { let i = 1; while (i < N && seg[i] < d) i++; const k = (d - seg[i - 1]) / ((seg[i] - seg[i - 1]) || 1); return [loop[i - 1][0] + (loop[i][0] - loop[i - 1][0]) * k, loop[i - 1][1] + (loop[i][1] - loop[i - 1][1]) * k]; };
    const c1x = ax, c1y = ay - ry;                                    // центр нуля в момент касания
    const qx = (x0 + c1x) / 2 + (x0 < c1x ? -10 : 10), qy = Math.min(y0, c1y) - 30;
    const dist = Math.hypot(c1x - x0, c1y - y0);
    const tA = T(Math.max(220, Math.min(420, dist * 1.2))), tB = T(620), t0 = performance.now();
    const dir = [-D * Math.cos(0.42), -Math.sin(0.42)];                    // куда вытягивается разомкнутый хвост
    let ticked = false;
    return new Promise((res) => {
      const end = () => { svg.remove(); g.remove(); reelG.style.rotate = ''; res(); };
      (function frame(now) {
        if (state !== st) { end(); return; }
        const el = now - t0;
        if (el < tA) {                                                // полёт: разгон, без зависания
          const k = el / tA, p = Math.pow(k, 1.5), u = 1 - p;
          const x = u * u * x0 + 2 * u * p * qx + p * p * c1x, y = u * u * y0 + 2 * u * p * qy + p * p * c1y;
          const tilt = (1 - p) * 0.5;
          band.setAttribute('d', 'M' + loop.map(([lx, ly]) => `${(x + lx * Math.cos(tilt) - ly * Math.sin(tilt)).toFixed(1)} ${(y + lx * Math.sin(tilt) + ly * Math.cos(tilt)).toFixed(1)}`).join(' L') + 'Z');
          requestAnimationFrame(frame); return;
        }
        if (!ticked) { ticked = true; snd('tick'); buzz(10); }
        const u = Math.min(1, (el - tA) / tB), f = 1 - Math.pow(1 - u, 2.2);   // намотка: быстро в начале, мягко в конце
        const rot = D * f * 360;
        reelG.style.rotate = `${rot}deg`;                             // барабан с ручкой крутится
        /* свободная часть ленты: остаток петли, приставленный к барабану и распрямляющийся в хвост */
        const w = f * L, rest = L - w, open = Math.min(1, u * 2.2) * 0.75;
        const [sx, sy] = at(w), pts = [];
        const M = Math.max(2, Math.round(N * rest / L));
        for (let i = 0; i <= M; i++) {
          const d = w + (rest * i) / M, [lx, ly] = at(d);
          const px = ax + (lx - sx), py = ay + (ly - sy);
          const k = d - w, tx = ax + dir[0] * k, ty = ay + dir[1] * k;
          pts.push([px + (tx - px) * open, py + (ty - py) * open]);
        }
        band.setAttribute('stroke-width', (sw + (lw - sw) * Math.min(1, u * 1.6)).toFixed(2));   // лента утончается до толщины слоя
        band.setAttribute('d', rest > 0.5 ? 'M' + pts.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(' L') : '');
        /* намотанная часть лежит на ободе */
        const wa = Math.min(f * Math.PI * 2, Math.PI * 1.995), Rw = rr.width * 11.3 / 24;
        wrap.setAttribute('stroke-width', lw.toFixed(2)); wrap.setAttribute('stroke-linecap', 'butt');
        const a0 = -Math.PI / 2, a1 = a0 + D * wa;
        wrap.setAttribute('d', wa > 0.02 ? `M${(cx + Rw * Math.cos(a1)).toFixed(1)} ${(cy + Rw * Math.sin(a1)).toFixed(1)} A${Rw.toFixed(1)} ${Rw.toFixed(1)} 0 ${wa > Math.PI ? 1 : 0} ${D > 0 ? 0 : 1} ${(cx + Rw * Math.cos(a0)).toFixed(1)} ${(cy + Rw * Math.sin(a0)).toFixed(1)}` : '');
        if (u < 1) { requestAnimationFrame(frame); return; }
        st.reel.querySelector('.lay').style.transition = 'none';
        st.reel.querySelector('.lay').setAttribute('stroke-dasharray', '100 0'); st.reel.querySelector('.lay').style.strokeWidth = ''; st.reel.querySelector('.lay').style.r = '';   // лента осталась тонким слоем на барабане
        end();
      })(t0);
    });
  }

  /* зарядка: ноль наматывается лентой на барабан, единица ложится и входит в дуло */
  async function load(st, el, g) {
    st.loadingN = (st.loadingN || 0) + 1;
    const x0 = parseFloat(g.style.left), y0 = parseFloat(g.style.top), gh = g.getBoundingClientRect().height || 30;
    if (el.textContent === '1') {                                 // единица — гарпун: в дуло
      const gr = st.gun.getBoundingClientRect();
      const mx = gr.left + gr.width * mxr(12) / 84, my = gr.top + gr.height * 21 / 44;
      /* единица ложится на бок (против часовой — флажок становится зубцом снизу) и встаёт в дуло остриём вперёд */
      const L = gr.width * 14 / 84, sc = L / (gh * 0.72);
      const scl = (v) => (D > 0 ? `${v}` : `${-v} ${v}`);               // деление: единица зеркалится — остриё вправо, зубец снизу
      await g.animate([{ left: `${x0}px`, top: `${y0}px`, rotate: '0deg', scale: '1', color: '#1d1d1f' },
        { left: `${mx - D * L * 1.6}px`, top: `${my - gh * 0.6}px`, rotate: `${-45 * D}deg`, scale: scl((1 + sc) / 2), color: '#1d1d1f', offset: 0.45 },
        { left: `${mx - D * L * 1.1}px`, top: `${my + L * 0.12}px`, rotate: `${-90 * D}deg`, scale: scl(sc), color: '#1d1d1f', offset: 0.75 },
        { left: `${mx - D * L * 0.5}px`, top: `${my + L * 0.12}px`, rotate: `${-90 * D}deg`, scale: scl(sc), color: '#1d1d1f' }],
      { duration: T(700), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.catch(() => {});
      if (state !== st) { g.remove(); return; }
      st.harp = true;
      st.gun.classList.add('loaded');                             // на её месте — гарпун того же вида
      g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(160), fill: 'forwards' }).onfinish = () => g.remove();
      snd('pop');
      st.gun.animate([{ translate: '0 0' }, { translate: `${5 * D}px 0` }, { translate: '0 0' }], { duration: T(250) });
    } else {                                                       // ноль — замкнутая лента: размыкается и наматывается на барабан
      await windZero(st, g, x0, y0, gh);
      if (state !== st) return;
      st.cnt += 1; setCnt(st);
      const cntEl = st.reel.querySelector('.hp-cnt'); cntEl.classList.remove('flip'); void cntEl.offsetWidth; cntEl.classList.add('flip');
      snd('pop');
    }
    st.loadingN -= 1;
    st.loaded += 1;
    if (st.loaded === st.task.mult.length) {
      st.phase = 'aim';
      st.gun.classList.add('ready');
      hint.set('Ружьё заряжено — жми «БАХ!»');
      world.querySelectorAll('.dc-say').forEach((e) => e.classList.add('out'));
      const fb = document.createElement('button');
      fb.type = 'button'; fb.className = 'hp-fire'; fb.textContent = 'БАХ!';
      fb.style.left = `${Math.max(56, Math.min(G.gx + G.gunW * 0.5, G.vw - 56))}px`; fb.style.top = `${G.gy + G.gunH + 10}px`;
      world.append(fb); st.fire = fb;
      fb.animate([{ scale: '0', opacity: 0 }, { scale: '1.3', opacity: 1, offset: 0.6 }, { scale: '1' }], { duration: T(420), easing: 'ease-out' });
      fb.addEventListener('click', (e) => { e.stopPropagation(); gunTap(st); });
      fb.addEventListener('pointerdown', (e) => e.stopPropagation());
    }
  }


  /* ---------- выстрел и катушка ---------- */
  async function gunTap(st) {
    if (st.busy || st.loadingN) return;
    if (!MG.tools.need(TOOL)) return;
    if (st.phase === 'load') {                                     // не заряжено — щелчок вхолостую
      snd('nope');
      st.gun.animate([{ rotate: '0deg' }, { rotate: '-6deg' }, { rotate: '4deg' }, { rotate: '0deg' }], { duration: T(350) });
      bubble(st.harp ? 'Сначала заряди все нули' : `Сначала заряди ружьё: перетащи в него цифры ${word()}`, 2400);
      return;
    }
    if (st.phase === 'aim') { await shoot(st); return; }
    if (st.phase === 'pull') await pull(st);
  }

  async function shoot(st) {
    st.busy = true;
    const tk = st.task;
    if (tk.isInt) {                                                // у целого числа запятая прячется в конце — проявляется
      st.comma.classList.remove('hid');
      st.comma.animate([{ scale: '0' }, { scale: '1.5' }, { scale: '1' }], { duration: T(400) });
      bubble('У целого числа запятая стоит в конце', 1800);
      await sleep(500);
      if (state !== st) return;
    }
    snd('boom'); buzz(40);
    st.gun.classList.remove('ready');
    st.gun.classList.add('shot');
    /* отдача, вспышка и дымок у дула */
    st.gun.animate([{ transform: 'none' }, { transform: `translate(${14 * D}px, -4px) rotate(${-9 * D}deg)`, offset: 0.25 }, { transform: 'none' }], { duration: T(520), easing: 'cubic-bezier(.2,.8,.3,1)' });
    sparks(tipX(), tipY(), '#ffb21f', 10, 16);
    for (let i = 0; i < 3; i++) setTimeout(() => puff(tipX() - D * (6 + i * 8), tipY() - 4 + (i % 2) * 6, -D * (16 + i * 6)), T(i * 70));
    if (st.fire) {                                                   // кнопка «БАХ!» взрывается
      const fb = st.fire; st.fire = null;
      const r = fb.getBoundingClientRect(), wr = world.getBoundingClientRect();
      const bx = r.left - wr.left + r.width / 2, by = r.top - wr.top + r.height / 2;
      fb.style.animation = 'none'; fb.style.pointerEvents = 'none';
      fb.animate([{ scale: '1', opacity: 1 }, { scale: '1.5', opacity: 1, offset: 0.35, filter: 'brightness(1.4)' }, { scale: '1.9', opacity: 0 }], { duration: T(380), easing: 'ease-out', fill: 'forwards' }).onfinish = () => fb.remove();
      sparks(bx, by, '#ffb21f', 12, 30); sparks(bx, by, '#e0362d', 8, 20);
      puff(bx - 14, by, -18); puff(bx + 14, by, 18);
    }
    /* гарпун летит к запятой, леска разматывается с провисом */
    st.arrow = mk('hp-arrow'); st.arrow.innerHTML = D > 0 ? ARROW : ARROW_DIV;
    const aw = G.cw * 0.9, from = tipX() - D * aw * 0.88, to = commaX(st.p);
    st.sag = 0;
    placeArrow(st, from);
    const t0 = performance.now(), dur = T(420);
    await new Promise((res) => {
      (function fly(now) {
        if (state !== st) { res(); return; }
        const k = Math.min(1, (now - t0) / dur);
        st.sag = 26 * Math.sin(Math.PI * Math.min(1, k * 1.15));
        placeArrow(st, from + (to - from) * (1 - (1 - k) ** 2));
        if (k < 1) requestAnimationFrame(fly); else res();
      })(t0);
    });
    if (state !== st) return;
    /* попадание: искры, запятая вздрагивает, леска натягивается и звенит */
    buzz(25);
    const ay = G.y + G.rh * 0.78;
    sparks(commaX(st.p), ay, '#e0362d', 8, 15);
    st.comma.classList.add('hook', D > 0 ? 'lie' : 'lie-r');                          // запятая ложится на бок
    st.comma.animate([{ scale: '1' }, { scale: '1.5' }, { scale: '1' }], { duration: T(420) });
    snd('tick');
    {                                                                 // гарпун цепляется и исчезает, леска переходит на запятую
      const ar = st.arrow, h0 = performance.now(), hd = T(320);
      ar.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '.3' }], { duration: hd, easing: 'ease-in', fill: 'forwards' });
      ar.style.transformOrigin = '10% 50%';
      (function hk(now) {
        if (state !== st) return;
        st.hookK = Math.min(1, (now - h0) / hd);
        placeArrow(st, st.ax);
        if (st.hookK < 1) requestAnimationFrame(hk); else { ar.remove(); if (st.arrow === ar) st.arrow = null; }
      })(h0);
    }
    st.gun.classList.add('gone');                                  // ружьё уходит — остаётся катушка
    st.reel.classList.add('big');
    st.reelOnly = true;
    twang(st, 14, 800);
    await sleep(500);
    if (state !== st) return;
    st.reel.classList.add('ready');
    st.phase = 'pull'; st.busy = false;
    hint.set('Крути катушку — нажимай на неё');
    bubble(`Попал! Нажимай на катушку — она подтянет запятую на ${st.cnt} ${st.cnt === 1 ? 'цифру' : st.cnt < 5 ? 'цифры' : 'цифр'}`, 2600);
  }

  async function pull(st) {
    if (st.cnt <= 0) return;
    st.busy = true;
    st.reel.classList.remove('ready');
    snd('whoosh', { dur: 0.45 }); buzz(15);
    spinReel(st);
    st.reel.animate([{ rotate: '0deg' }, { rotate: '-8deg' }, { rotate: '0deg' }], { duration: T(400) });
    st.cnt -= 1; setCnt(st);
    const cntEl = st.reel.querySelector('.hp-cnt'); cntEl.classList.remove('flip'); void cntEl.offsetWidth; cntEl.classList.add('flip');
    const lay = st.reel.querySelector('.lay');                       // слой разматывается: его остаток — сколько оборотов осталось
    const lw = 1.6 * st.cnt / st.task.z;                             // слой тоньшает равномерно по всему кругу
    lay.style.transition = ''; lay.style.strokeWidth = `${lw.toFixed(2)}px`; lay.style.r = `${(10.5 + lw / 2).toFixed(2)}px`;
    /* цифр не хватает — на пустом месте появляется серый 0 */
    let crossed;                                                      // цифра, через которую перескакивает запятая
    if (D < 0) {
      crossed = st.dEls[st.p - 1];
      if (st.p === 1) {                                               // деление: слева кончились цифры — дописываем 0
        const z = mk('hp-d new', '0');
        st.dEls.unshift(z); st.off -= 1; st.p += 1;
        world.classList.add('snap'); placeAll(st); void world.offsetWidth; world.classList.remove('snap');
        z.animate([{ scale: '.2', opacity: 0 }, { scale: '1.2', opacity: 1 }, { scale: '1' }], { duration: T(380), easing: 'ease-out' });
        snd('pop');
      }
    } else if (st.p + 1 > st.dEls.length) {
      const z = mk('hp-d new', '0');
      st.dEls.push(z);
      world.classList.add('snap'); placeAll(st); void world.offsetWidth; world.classList.remove('snap');
      z.animate([{ scale: '.2', opacity: 0 }, { scale: '1.2', opacity: 1 }, { scale: '1' }], { duration: T(380), easing: 'ease-out' });
      snd('pop');
    }
    /* запятая подтягивается на одну цифру вправо, гарпун и леска — вместе с ней */
    if (D > 0) crossed = st.dEls[st.p];
    const a = commaX(st.p), b = commaX(st.p + D), t0 = performance.now(), dur = T(500);
    st.p += D;
    st.sag = -6;                                                      // леска натягивается
    st.comma.style.left = `${b - G.cw * 0.2}px`;
    st.comma.animate([{ translate: '0 0' }, { translate: '0 -12px', offset: 0.5 }, { translate: '0 0' }], { duration: dur, easing: 'ease-in-out' });
    if (crossed) setTimeout(() => crossed.animate([{ scale: '1 1' }, { scale: '1.15 .82' }, { scale: '.95 1.08' }, { scale: '1 1' }], { duration: T(380), easing: 'ease-out' }), dur * 0.35);
    await new Promise((res) => {
      (function go(now) {
        if (state !== st) { res(); return; }
        const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
        placeArrow(st, a + (b - a) * e);
        if (k < 1) requestAnimationFrame(go); else res();
      })(t0);
    });
    if (state !== st) return;
    snd('tick');
    twang(st, 7, 450);
    st.busy = false;
    if (st.cnt > 0) st.reel.classList.add('ready');
    if (st.cnt === 0) { await sleep(450); if (state === st) finish(st); }
  }

  /* ---------- конец примера ---------- */
  async function finish(st) {
    world.querySelectorAll('.dc-say').forEach((e) => e.classList.add('out'));
    st.phase = 'done'; st.busy = true;
    const tk = st.task;
    /* гарпун отцепляется и сматывается в катушку, серые нули чернеют */
    st.dEls.forEach((e) => e.classList.remove('new'));
    st.comma.classList.remove('hook', 'lie', 'lie-r');                       // запятая встаёт на место
    st.reel.classList.remove('ready');
    sparks(commaX(st.p) + D * G.cw * 0.2, G.y + G.rh * 0.74, '#9aa1ad', 6, 12);
    snd('whoosh', { dur: 0.5 });
    st.reel.querySelector('.reel').animate([{ rotate: '0deg' }, { rotate: '-1080deg' }], { duration: T(560), easing: 'ease-in' });
    const ax0 = st.ax, ax1 = reelX() - D * G.cw * 0.6, t0 = performance.now(), dur = T(520);
    st.sag = 10;
    await new Promise((res) => {
      (function back(now) {
        if (state !== st) { res(); return; }
        const k = Math.min(1, (now - t0) / dur), e = k * k;
        st.sag = 10 * (1 - k);
        placeArrow(st, ax0 + (ax1 - ax0) * e);
        if (k < 1) requestAnimationFrame(back); else res();
      })(t0);
    });
    if (state !== st) return;
    if (st.arrow) st.arrow.remove(); st.arrow = null; st.hookK = 0; st.line.innerHTML = '';
    st.reel.animate([{ scale: '2', opacity: 1 }, { scale: '2.4', opacity: 1, offset: 0.3 }, { scale: '0', opacity: 0 }], { duration: T(380), easing: 'ease-in', fill: 'forwards' });
    puff(reelX(), reelY(), 10); puff(reelX() + 8, reelY() - 6, 18);
    snd('pop');
    /* нули в конце дробной части не пишут (120 : 10 = 12) */
    let tz = 0;
    for (let i = st.dEls.length - 1; i >= st.p && st.dEls[i].textContent === '0'; i--) { st.dEls[i].classList.add('dim'); tz += 1; }
    const endI = st.dEls.length - tz;
    if (st.p >= endI) {                                             // запятая в конце — число целое: запятая падает
      st.comma.animate([{ translate: '0 0', opacity: 1 }, { translate: '0 18px', opacity: 0, rotate: '40deg' }], { duration: T(450), easing: 'ease-in', fill: 'forwards' });
      const tg = mk('hp-tag', 'целое число!');
      tg.style.left = `${commaX(st.p)}px`; tg.style.top = `${G.y - 30}px`;
      tg.animate([{ opacity: 0, translate: '-50% 8px' }, { opacity: 1, translate: '-50% 0', offset: 0.2 }, { opacity: 1, translate: '-50% -4px', offset: 0.8 }, { opacity: 0, translate: '-50% -12px' }], { duration: T(1300), fill: 'forwards' }).onfinish = () => tg.remove();
    }
    /* нули в начале числа не пишут (0,05 × 100 = 5) */
    let lead = 0;
    for (let i = 0; i < st.p - 1 && st.dEls[i].textContent === '0'; i++) { st.dEls[i].classList.add('dim'); lead = i + 1; }
    await sleep(800);
    if (state !== st) return;
    /* строка-результат: 12,74 × 10 = 127,4 — цифры ответа перелетают из готового числа */
    const res = mk('hp-res');
    const sp = (t, cls) => { const s2 = document.createElement('span'); s2.textContent = t; if (cls) s2.className = cls; res.append(s2); return s2; };
    const left = [];
    tk.str.split('').forEach((ch) => left.push(sp(ch, ch === ',' ? 'c' : '')));
    left.push(sp(sign())); tk.mult.split('').forEach((ch) => left.push(sp(ch))); left.push(sp('='));
    const ans = tk.ans.split('').map((ch) => sp(ch, ch === ',' ? 'ans c' : 'ans'));
    const w = res.offsetWidth, sc = Math.min(1, (G.vw - 16) / w);
    res.style.transform = `translate(${Math.round((G.vw - w * sc) / 2)}px, ${G.y}px) scale(${sc.toFixed(3)})`;
    const srcs = [];
    for (let i = lead; i < endI; i++) { if (i === st.p && st.p < endI) srcs.push(st.comma); srcs.push(st.dEls[i]); }
    ans.forEach((s2, i) => {
      const src = srcs[i];
      if (!src) return;
      const a = src.getBoundingClientRect(), b = s2.getBoundingClientRect();
      s2.style.transformOrigin = '0 0';
      s2.animate([{ transform: `translate(${(a.left - b.left) / sc}px, ${(a.top - b.top) / sc}px) scale(${(a.width / b.width).toFixed(3)}, ${(a.height / b.height).toFixed(3)})`, color: '#1d1d1f' },
        { transform: 'translate(0, -10px)', color: '#1d1d1f', offset: 0.75 }, { transform: 'none' }],
      { duration: T(750), delay: T(i * 40), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' });
    });
    [...st.dEls, st.comma, st.xEl, ...st.mEls, st.gun].forEach((e) => { e.getAnimations().forEach((a) => a.cancel()); e.style.opacity = '0'; });
    left.forEach((s2, i) => s2.animate([{ opacity: 0, translate: '0 8px' }, { opacity: 1, translate: '0 0' }], { duration: T(350), delay: T(250 + i * 30), easing: 'ease-out', fill: 'backwards' }));
    setTimeout(() => { if (state === st) { snd('pop'); burst(ans[ans.length - 1], '#16a34a', 16); } }, T(800 + ans.length * 40));
    solved++;
    setStats(lvlOf(), solved);
    resultText.textContent = `${tk.str} ${sign()} ${tk.mult} = ${tk.ans}`;
    after.classList.add('show');
    if (solved >= TOTAL) setTimeout(offerDone, T(900));
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  function offerDone() {
    if (document.querySelector('.so-ov')) return;
    const ov = document.createElement('div');
    ov.className = 'so-ov';
    ov.innerHTML = `<div class="skip-offer" role="dialog"><h3>Уровень пройден!</h3><p>${cfg.done}</p><div class="so-row"><button type="button" class="so-go">На карту</button></div></div>`;
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
    if (MG.active !== MG.modes[NAME] || e.detail.tool !== TOOL || !state || state.phase === 'done') return;
    gunIn(state);
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
    stop() { if (drag) { drag.g.remove(); drag.el.classList.remove('took'); drag = null; } if (state && (state.busy || state.loadingN || state.phase === 'done')) state = null; },
    _state: () => state,
  };
  }

  build({ name: 'dec10', tool: 'harpoon', p: 'hp', done: 'Ты научился умножать и делить на 10, 100 и 1000. Идём дальше.' });
})();
