/* Режим «Десятичные дроби: сложение и вычитание» (decadd). Инструмент — башенный кран (crane).
 *
 * 1) Игрок выбирает кран — кран выезжает справа.
 * 2) Тянет число из примера: крюк берёт его за запятую и несёт за пальцем. Отпустил над лесами —
 *    кран опускает число на леса. Если запятая не над жёлтой меткой (не «запятая под запятой»),
 *    число шатается, запятая краснеет, и кран уносит его обратно. Второе число встаёт на первое.
 *    В вычитании большее число должно быть сверху — иначе кран меняет их местами.
 * 3) Пустые разряды справа заполняются нулями, у целого числа появляется запятая.
 * 4) Камера опускается: виден только пример в столбик, снизу выезжает планшет с клавишами.
 *    Игрок пишет ответ справа налево, разряд за разрядом; запятую ставит сам (клавиша «,»).
 *    Переносы (сложение) и «занять у соседа» (вычитание) рисуются над столбиком.
 * 8 примеров: четыре стадии по 2 (обезьяна, человек, профессор, робот).
 * Геометрия — в пикселях мира (G), всё пересчитывается в layout() по размеру сцены. */
(() => {
  'use strict';
  const MG = window.MG;
  const { $, T, sleep, ri, setStats, burst } = MG;
  const snd = (n, o) => { if (MG.snd && MG.snd.play) MG.snd.play(n, o); };

  const stage = $('#mode-decadd');
  const view = $('#dc-view');
  const world = $('#dc-world');
  const after = $('#dc-after');
  const resultText = $('#dc-resultText');
  const nextBtn = $('#dc-next');
  if (!view || !world) return;
  const hint = MG.hinter($('#dc-hint'));

  const css = document.createElement('style');
  css.textContent = `
    #mode-decadd { justify-content: flex-start; gap: 6px; position: relative; }
    #mode-decadd .hint { min-height: 2.6em; display: flex; align-items: center; justify-content: center; }
    .dc-view { position: relative; width: min(100%, 440px); flex: 1 1 auto; min-height: 380px; overflow: hidden; }
    .dc-world { position: absolute; left: 0; top: 0; width: 100%; transition: transform 1s cubic-bezier(.5,0,.25,1); }
    .dc-world.snap { transition: none; }
    .dc-site, .dc-crane { position: absolute; left: 0; top: 0; pointer-events: none; }
    .dc-site { z-index: 1; }
    .dc-site svg, .dc-crane svg { display: block; overflow: visible; }
    .dc-axis { opacity: 0; transition: opacity .25s; }
    .dc-scaf { opacity: 0; transform: translateY(60px) scaleY(.2); transform-box: fill-box; transform-origin: 50% 100%; transition: transform .6s cubic-bezier(.3,1.4,.5,1) .15s, opacity .3s .15s; }
    .dc-site.up .dc-scaf { opacity: 1; transform: none; }
    .dc-site.snap .dc-scaf { transition: none; }
    .dc-site.drag .dc-axis { opacity: 1; }
    .dc-site.dc-flash .dc-peg { animation: dcFlash .32s 4; }
    .dc-crane { z-index: 6; transform: translateX(120%); visibility: hidden; transition: transform .7s cubic-bezier(.5,0,.8,.4), visibility 0s .7s; }
    .dc-crane.in { transform: none; visibility: visible; transition: transform .9s cubic-bezier(.3,1.15,.4,1), visibility 0s; }
    .dc-crane.snap { transition: none; }
    .dc-num { position: absolute; left: 0; top: 0; z-index: 3; display: flex; height: var(--rh); font-weight: 900; font-size: calc(var(--cw) * .95); line-height: var(--rh); color: #1d1d1f; white-space: nowrap; touch-action: none; }
    .dc-num > span { display: block; text-align: center; }
    .dc-num .dc-d { width: var(--cw); }
    .dc-num .dc-c { width: var(--cc); transition: color .2s, opacity .2s; }
    .dc-num .dc-c.gh { opacity: 0; }
    .dc-num.free { cursor: grab; }
    .dc-num.carry { z-index: 5; filter: drop-shadow(0 7px 4px rgba(0,0,0,.2)); }
    .dc-num.carry .dc-c { color: #e8a21a; }
    .dc-num.carry .dc-c.gh { opacity: .65; }
    .dc-num.bad .dc-c { color: #d6362d; }
    .dc-num .zero { color: #3b8fd0; }
    .dc-op, .dc-sign { position: absolute; left: 0; top: 0; z-index: 3; width: calc(var(--cw) * 1.1); text-align: center; font-weight: 900; font-size: calc(var(--cw) * .95); line-height: var(--rh); color: #1d1d1f; }
    .dc-sign { width: var(--cw); opacity: 0; scale: .3; transition: opacity .3s, scale .4s cubic-bezier(.3,1.6,.5,1); }
    .dc-sign.on { opacity: 1; scale: 1; }
    .dc-ac { position: absolute; z-index: 3; width: var(--cw); height: var(--rh); text-align: center; font-weight: 900; font-size: calc(var(--cw) * .95); line-height: var(--rh); color: #24409e; }
    .dc-ac.cm { width: var(--cc); }
    .dc-ac::after { content: ''; position: absolute; left: 16%; right: 16%; bottom: 5px; border-bottom: 3px dashed rgba(29,29,31,.2); }
    .dc-ac.cm::after { left: 18%; right: 18%; }
    .dc-ac.on::after { border-bottom: 3px solid #3d63d9; }
    .dc-ac.on:empty::before { content: ''; position: absolute; left: 50%; top: 24%; width: 3px; height: 52%; margin-left: -1.5px; border-radius: 2px; background: #3556d6; animation: dcCaret 1s steps(1) infinite; }
    .dc-ac.full::after { display: none; }
    .dc-ac.bad { animation: dcShake .4s; }
    .dc-ac.bad::after { border-bottom-color: #d6362d; }
    .dc-ac.final { color: var(--ok); }
    .dc-band { position: absolute; z-index: 2; border-radius: 14px; background: rgba(79,107,237,.13); opacity: 0; transition: left .35s cubic-bezier(.3,.7,.2,1), width .35s, opacity .3s; pointer-events: none; }
    .dc-band.on { opacity: 1; }
    .dc-say { position: absolute; z-index: 8; left: 0; top: 0; width: max-content; max-width: min(84vw, 300px); padding: 8px 14px; border-radius: 16px; background: #1d1d1f; color: #fff; font-weight: 800; font-size: .95rem; line-height: 1.25; text-align: center; box-shadow: 0 6px 16px rgba(0,0,0,.25); pointer-events: none; translate: -50% -100%; animation: dcSay .35s cubic-bezier(.3,1.4,.5,1) both; }
    .dc-say.out { animation: dcSayOut .3s ease-in both; }
    .dc-say::after { content: ''; position: absolute; left: 50%; bottom: -6px; width: 12px; height: 12px; margin-left: -6px; background: #1d1d1f; transform: rotate(45deg); border-radius: 2px; }
    @keyframes dcSay { from { opacity: 0; scale: .6; } }
    @keyframes dcSayOut { to { opacity: 0; scale: .8; } }
    .dc-mark { position: absolute; z-index: 4; translate: -50% 0; font-weight: 900; font-size: calc(var(--cw) * .42); line-height: 1; color: #e8700a; pointer-events: none; animation: dcPop .4s cubic-bezier(.3,1.6,.5,1) both; }
    .dc-mark.dot { width: 9px; height: 9px; border-radius: 50%; background: #d6362d; }
    .dc-mark.ten { color: #d6362d; }
    #mode-decadd .after { position: absolute; left: 50%; top: var(--dc-after, 50%); z-index: 7; width: min(92%, 380px); translate: -50% 10px; min-height: 0; }
    .dc-res { position: absolute; left: 0; top: 0; z-index: 3; display: flex; align-items: center; height: var(--rh); transform-origin: 50% 50%; white-space: nowrap; }
    .dc-res .dc-num { position: static; }
    .dc-res .dc-op { position: static; }
    .dc-res .ans { color: var(--ok); }
    .dc-gnd { opacity: 0; transform: translateY(40px); transition: transform .5s cubic-bezier(.3,1.3,.5,1), opacity .3s; }
    .dc-site.up .dc-gnd { opacity: 1; transform: none; }
    .dc-site.snap .dc-gnd { transition: none; }
    #mode-decadd .after.show { translate: -50% 0; }
    .dc-tab { position: fixed; left: 50%; bottom: 0; z-index: 45; width: min(96vw, 380px); translate: -50% 0; animation: dcTabIn .6s cubic-bezier(.3,1.15,.4,1) both; }
    .dc-tab.out { animation: dcTabOut .35s ease-in both; pointer-events: none; }
    .dc-tab .clip { width: 100%; padding: 30px 12px calc(10px + env(safe-area-inset-bottom)); border-radius: 24px 24px 0 0; animation: none; }
    .dc-tab .clip .paper { padding: 10px 10px 12px; }
    .dc-tab .pencil { filter: url(#dcPencil); }
    .dc-tab .dc-pv { text-align: center; font-weight: 700; font-size: 1.9rem; line-height: 1.1; white-space: nowrap; color: var(--pen); }
    .dc-tab .dc-pv b { color: #3d63d9; letter-spacing: .03em; }
    .dc-tab .msg { min-height: 2.35em; margin: 4px 0 2px; font-size: 1.12rem; line-height: 1.12; display: flex; align-items: center; justify-content: center; }
    .dc-tab .pad { gap: 8px; margin-top: 2px; }
    .dc-tab .k { height: 48px; font-size: 2.7rem; }
    .dc-tab .k.z { grid-column: span 2; }
    .dc-tab .k.bad { animation: clShake .4s; }
    body[data-tool="crane"] .stage, body[data-tool="crane"] .stage .dc-num { cursor: var(--cur-crane, pointer) !important; }
    @keyframes dcFlash { 50% { opacity: .2; } }
    @keyframes dcCaret { 50% { opacity: 0; } }
    @keyframes dcShake { 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }
    @keyframes dcPop { 0% { scale: .2; opacity: 0; } 100% { scale: 1; opacity: 1; } }
    @keyframes dcTabIn { from { translate: -50% 105%; } }
    @keyframes dcTabOut { to { translate: -50% 105%; } }
    @media (max-height: 700px) { .dc-tab .k { height: 42px; font-size: 2.3rem; } .dc-tab .dc-pv { font-size: 1.6rem; } }
  `;
  document.head.append(css);

  /* ---------- примеры ---------- */
  const TOTAL = 8;
  let state = null, solved = 0, lastKey = '';
  const lvlOf = () => Math.min(4, 1 + Math.floor(solved / 2));

  const mk = (lo, hi, m) => {
    let frac = '';
    for (let i = 0; i < m; i++) frac += i === m - 1 ? ri(1, 9) : ri(0, 9);   // последняя цифра дроби — не ноль
    return { int: String(ri(lo, hi)), frac };
  };
  const str = (o) => o.int + (o.frac ? `,${o.frac}` : '');
  const num = (o) => +`${o.int}.${o.frac || 0}`;
  const fmtSign = (s) => (s === '+' ? '+' : '−');

  /* разряд q числа o (q ≥ 0 — целые: 0 единицы, 1 десятки; q < 0 — дробные: −1 десятые…);
   * пустой дробный разряд — 0 (его заполнят нулём), пустой целый — null */
  const dig = (o, q) => (q >= 0 ? (o.int.length - 1 - q >= 0 ? +o.int[o.int.length - 1 - q] : null) : (-q - 1 < o.frac.length ? +o.frac[-q - 1] : 0));

  function solve(top, bot, sign) {
    const F = Math.max(top.frac.length, bot.frac.length);
    const sc = (o) => Number(o.int + o.frac.padEnd(F, '0'));
    const S = sign === '+' ? sc(top) + sc(bot) : sc(top) - sc(bot);
    const s = String(S).padStart(F + 1, '0');
    const ai = s.slice(0, s.length - F).replace(/^0+(?=\d)/, ''), af = s.slice(s.length - F);
    const steps = [];
    let c = 0;
    for (let q = -F; q < ai.length; q++) {
      if (q === 0 && F > 0) steps.push({ kind: 'c', exp: ',' });
      const a = dig(top, q), b = dig(bot, q), av = a || 0, bv = b || 0;
      if (sign === '+') {
        const sum = av + bv + c;
        steps.push({ kind: 'd', q, a, b, cin: c, sum, exp: String(sum % 10), cout: sum >= 10 });
        c = sum >= 10 ? 1 : 0;
      } else {
        let t = av - c;
        const need = t < bv;
        if (need) t += 10;
        steps.push({ kind: 'd', q, a, b, cin: c, need, t, exp: String(t - bv) });
        c = need ? 1 : 0;
      }
    }
    return { F, ai, af, ans: ai + (F ? `,${af}` : ''), steps };
  }

  function makeTask(A, B, sign) {
    const r = solve(A, B, sign);
    const I = Math.max(A.int.length, B.int.length, r.ai.length);
    return { A, B, sign, F: r.F, I, ans: r.ans, af: r.af, steps: r.steps };
  }

  function pick() {
    const L = lvlOf();
    if (solved === 0 && !lastKey) return makeTask({ int: '2', frac: '74' }, { int: '12', frac: '1' }, '+');
    const first = solved % 2 === 0;
    for (let i = 0; i < 800; i++) {
      let A, B, sign = '+';
      const m1 = ri(1, 2), m2 = 3 - m1;
      if (L === 1) { A = mk(1, 19, m1); B = mk(1, 19, m2); }
      else if (L === 2) { A = mk(2, 29, m1); B = mk(2, 29, m2); }
      else if (L === 3) { sign = '-'; A = mk(6, 40, 1); B = mk(1, 9, 2); }
      else if (first) { sign = '-'; A = { int: String(ri(6, 30)), frac: '' }; B = mk(1, 5, 2); }   // целое минус дробь
      else { A = mk(2, 19, 3); B = mk(2, 19, ri(1, 2)); }
      if (sign === '+' && Math.random() < 0.5) [A, B] = [B, A];
      const t = makeTask(A, B, sign);
      const key = `${str(A)}${sign}${str(B)}`;
      if (key === lastKey || /0$/.test(t.af)) continue;
      const carries = t.steps.filter((s) => s.cout).length, borrows = t.steps.filter((s) => s.need).length;
      if (L === 1 && carries) continue;
      if (L === 2 && !carries) continue;
      if (L === 4 && sign === '+' && !carries) continue;
      if (sign === '-' && (!borrows || num(A) <= num(B))) continue;
      return t;
    }
    return makeTask({ int: '5', frac: '3' }, { int: '2', frac: '74' }, '-');
  }

  /* ---------- геометрия ---------- */
  let G = null;
  const qx = (q) => (q >= 0 ? G.commaX - G.cc / 2 - q * G.cw - G.cw / 2 : G.commaX + G.cc / 2 + (-q - 1) * G.cw + G.cw / 2);
  const rowTop = (slot) => G.DY - (slot + 1) * G.rh;
  const offOf = (o) => o.int.length * G.cw + G.cc / 2;          // от левого края числа до середины запятой
  const lenOf = (o) => o.int.length + o.frac.length;

  function geom(tk) {
    const vw = Math.max(260, view.clientWidth), vh = Math.max(360, view.clientHeight);
    const cols = tk.I + tk.F;
    let cw = Math.min(46, (vw - 26) / (lenOf(tk.A) + lenOf(tk.B) + 2.4), (vw - 86) / (cols + 1.3));
    cw = Math.max(22, Math.floor(cw));
    const cc = Math.round(cw * 0.5), rh = Math.round(cw * 1.28);
    const JY = 26, JB = JY + 14;
    const towerX = vw - 26;
    const gridW = cols * cw + cc;
    const gx = Math.max(cw * 1.3, Math.round((vw - 44 - gridW) / 2) + 6);
    const commaX = gx + tk.I * cw + cc / 2;
    const DY = Math.round(Math.max(vh - 150, JB + 110 + 3 * rh + 40));
    const ansY = DY + 14;
    const exprTop = Math.round(Math.min(JB + 86, DY - 3 * rh - 46));
    const ground = ansY + rh + 40;
    const colTop = DY - 2 * rh - Math.round(cw * 0.7);
    const camY = Math.max(0, colTop - 6);
    const WH = Math.max(vh, camY + vh + 10, ground + 60);
    return { vw, vh, cw, cc, rh, JY, JB, towerX, gridW, gx, commaX, DY, ansY, exprTop, ground, colTop, camY, WH,
      restX: towerX - 52, restY: JB + 44 };
  }

  /* ---------- сцена ---------- */
  let site = null, crane = null, CE = null;      // CE — элементы крана: тележка, трос, крюк
  const C = { tx: 0, hx: 0, hy: 0, tgt: null, tween: null, carry: null, in: false };
  const place = (el, x, y) => { el.style.transform = `translate(${x}px, ${y}px)`; };
  const span = (cls, t) => { const s = document.createElement('span'); s.className = cls; s.textContent = t; return s; };

  function numEl(o) {
    const el = document.createElement('div');
    el.className = 'dc-num';
    o.int.split('').forEach((d) => el.append(span('dc-d', d)));
    el.append(span(o.frac ? 'dc-c' : 'dc-c gh', ','));
    o.frac.split('').forEach((d) => el.append(span('dc-d', d)));
    return el;
  }

  function siteSvg() {
    const { vw, gx, gridW, DY, rh, cw, commaX, ansY, ground, WH } = G;
    const L = gx - 18, R = gx + gridW + 18;
    const bt = ansY + rh + 6;                       // раскосы — ниже строки ответа
    let br = '';
    const n = Math.max(2, Math.round((R - L) / 46));
    for (let i = 0; i < n; i++) { const x1 = L + 4 + i * (R - L - 8) / n, x2 = x1 + (R - L - 8) / n; br += `M${x1} ${ground} L${x2} ${bt} `; }
    return `<svg width="${vw}" height="${WH}" viewBox="0 0 ${vw} ${WH}">
      <g class="dc-gnd"><rect x="-20" y="${ground}" width="${vw + 40}" height="${WH - ground + 40}" fill="#d9c08f"/>
      <rect x="-20" y="${ground - 2}" width="${vw + 40}" height="9" fill="#6fbf5a" stroke="#3f8f3a" stroke-width="2"/></g>
      <g class="dc-scaf">
      <path class="dc-axis" d="M${commaX} ${DY} V${DY - 2 * rh - cw * 0.4}" stroke="#e8a21a" stroke-width="3" stroke-dasharray="6 6" stroke-linecap="round"/>
      <g stroke="#4a4f5c" stroke-width="1.6">
        <rect x="${L + 1}" y="${DY + 8}" width="6" height="${ground - DY - 8}" fill="#9aa1ad"/>
        <rect x="${R - 7}" y="${DY + 8}" width="6" height="${ground - DY - 8}" fill="#9aa1ad"/>
      </g>
      <path d="M${L + 4} ${bt} H${R - 4}" fill="none" stroke="#9aa1ad" stroke-width="4"/>
      <path d="${br}" stroke="#9aa1ad" stroke-width="2.6" fill="none"/>
      <rect x="${L - 4}" y="${DY}" width="${R - L + 8}" height="10" rx="2" fill="#c98f4a" stroke="#6b4423" stroke-width="2"/>
      <path d="M${L + 10} ${DY + 5} H${R - 10}" stroke="#a87035" stroke-width="1.4" stroke-dasharray="10 8"/>
      <g class="dc-peg"><path d="M${commaX - 8} ${DY + 10} L${commaX} ${DY - 1} L${commaX + 8} ${DY + 10}Z" fill="#ffd23f" stroke="#8a5a0a" stroke-width="2" stroke-linejoin="round"/></g>
      </g>
    </svg>`;
  }

  function craneSvg() {
    const { vw, JY, JB, towerX, ground, WH } = G;
    const tl = towerX - 10, tr = towerX + 10;
    let lat = '';
    for (let y = JB + 8; y < ground - 16; y += 18) lat += `M${tl} ${y} L${tr} ${y + 18} M${tr} ${y} L${tl} ${y + 18} `;
    let tr2 = '';
    for (let x = 6; x < vw + 60; x += 14) tr2 += `M${x} ${JB} L${x + 7} ${JY} L${x + 14} ${JB} `;
    return `<svg width="${vw}" height="${WH}" viewBox="0 0 ${vw} ${WH}" stroke-linejoin="round">
      <path d="M${tl - 14} ${ground + 2} L${tl} ${ground - 14} H${tr} L${tr + 14} ${ground + 2}Z" fill="#2f6fc4" stroke="#1d4f8f" stroke-width="2.6"/>
      <path d="${lat}" stroke="#2f6fc4" stroke-width="2" fill="none"/>
      <rect x="${tl}" y="${JB}" width="20" height="${ground - 14 - JB}" fill="none" stroke="#1d4f8f" stroke-width="3"/>
      <path d="M${tr + 6} ${ground - 14} V${JB + 30} M${tr + 13} ${ground - 14} V${JB + 30}" stroke="#8a93a6" stroke-width="1.6"/>
      <path d="${tr2}" stroke="#2f6fc4" stroke-width="2.2" fill="none"/>
      <path d="M6 ${JY} H${vw + 80} M6 ${JB} H${vw + 80}" stroke="#1d4f8f" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M${towerX - 8} ${JY} L${towerX} ${JY - 24} L${towerX + 8} ${JY}Z" fill="#2f6fc4" stroke="#1d4f8f" stroke-width="2.4"/>
      <path d="M${towerX} ${JY - 24} L8 ${JY} M${towerX} ${JY - 24} L${vw + 60} ${JY}" stroke="#4a4f5c" stroke-width="1.5" fill="none"/>
      <rect x="${tl - 26}" y="${JB + 3}" width="26" height="24" rx="4" fill="#3f84d8" stroke="#1d4f8f" stroke-width="2.4"/>
      <rect x="${tl - 22}" y="${JB + 7}" width="17" height="11" rx="2" fill="#cfe4f5" stroke="#1d4f8f" stroke-width="1.6"/>
      <g class="dc-tro"><rect x="-12" y="${JB - 2}" width="24" height="9" rx="2.5" fill="#4a4f5c"/><circle cx="-7" cy="${JB + 8}" r="2.6" fill="#33384a"/><circle cx="7" cy="${JB + 8}" r="2.6" fill="#33384a"/></g>
      <line class="dc-cable" stroke="#33384a" stroke-width="1.8"/>
      <g class="dc-hook"><path d="M-9 -19 h18 l-3.5 8 h-11Z" fill="#e8b923" stroke="#4a4f5c" stroke-width="1.8"/><path d="M0 -11 v5 q0 6 -6 6" fill="none" stroke="#4a4f5c" stroke-width="2.8" stroke-linecap="round"/></g>
    </svg>`;
  }

  function layout() {
    const st = state;
    if (!st) return;
    G = geom(st.task);
    world.style.height = `${G.WH}px`;
    world.style.setProperty('--cw', `${G.cw}px`);
    world.style.setProperty('--cc', `${G.cc}px`);
    world.style.setProperty('--rh', `${G.rh}px`);
    site.innerHTML = siteSvg();
    crane.innerHTML = craneSvg();
    CE = { tro: crane.querySelector('.dc-tro'), cable: crane.querySelector('.dc-cable'), hook: crane.querySelector('.dc-hook') };
    if (!C.carry && !C.tween) { C.hx = G.restX; C.hy = G.restY; C.tx = C.hx; }
    /* пример наверху */
    const tk = st.task, wA = lenOf(tk.A) * G.cw + G.cc, wS = G.cw * 1.1, wB = lenOf(tk.B) * G.cw + G.cc;
    const x0 = Math.max(4, Math.round((G.vw - 40 - (wA + wS + wB)) / 2));
    st.items[0].home = { x: x0, y: G.exprTop };
    st.items[1].home = { x: x0 + wA + wS, y: G.exprTop };
    place(st.opEl, x0 + wA, G.exprTop);
    st.items.forEach((it) => {
      if (it.where === 'expr') { it.x = it.home.x; it.y = it.home.y; place(it.el, it.x, it.y); }
      else if (it.where === 'slot') { it.x = G.commaX - offOf(it.op); it.y = rowTop(it.slot); place(it.el, it.x, it.y); }
      it.el.style.transformOrigin = `${offOf(it.op)}px 0px`;
    });
    if (st.signEl) placeSign(st);
    (st.cells || []).forEach((c) => placeCell(c));
    (st.marks || []).forEach((m) => placeMark(m));
    if (st.band) placeBand(st);
    if (st.resEl) placeRes(st);
    world.classList.add('snap');
    world.style.transform = st.cam ? `translateY(${-G.camY}px)` : '';
    void world.offsetWidth;
    world.classList.remove('snap');
  }

  /* ---------- кран ---------- */
  let raf = 0;
  const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2);
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!G || !CE) return;
    if (C.tween) {
      const w = C.tween, p = Math.min(1, (now - w.t0) / w.ms), e = ease(p);
      C.hx = w.x0 + (w.x1 - w.x0) * e; C.hy = w.y0 + (w.y1 - w.y0) * e;
      if (p >= 1) { C.tween = null; w.done(); }
    } else if (C.tgt) {
      C.hx += (C.tgt.x - C.hx) * 0.32; C.hy += (C.tgt.y - C.hy) * 0.32;
    }
    C.hx = Math.max(16, Math.min(G.towerX - 30, C.hx));
    C.hy = Math.max(G.JB + 34, Math.min(G.ground - 8, C.hy));
    C.tx += (C.hx - C.tx) * 0.2;
    const sw = Math.max(-14, Math.min(14, (C.hx - C.tx) * 0.35));
    CE.tro.setAttribute('transform', `translate(${C.tx.toFixed(1)} 0)`);
    CE.cable.setAttribute('x1', C.tx.toFixed(1)); CE.cable.setAttribute('y1', G.JB + 8);
    CE.cable.setAttribute('x2', C.hx.toFixed(1)); CE.cable.setAttribute('y2', (C.hy - 19).toFixed(1));
    CE.hook.setAttribute('transform', `translate(${C.hx.toFixed(1)} ${C.hy.toFixed(1)}) rotate(${(-sw * 0.6).toFixed(1)})`);
    if (C.carry) {
      const it = C.carry;
      it.x = C.hx - offOf(it.op); it.y = C.hy + 3;
      it.el.style.transform = `translate(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px) rotate(${(-sw * 0.5).toFixed(1)}deg)`;
    }
  }
  function moveHook(x, y, ms) {
    return new Promise((done) => {
      if (C.tween) C.tween.done();
      const d = Math.hypot(x - C.hx, y - C.hy);
      C.tween = { x0: C.hx, y0: C.hy, x1: x, y1: y, t0: performance.now(), ms: T(ms || Math.max(180, Math.min(650, d * 1.6))), done };
    });
  }
  let craneP = null;
  function craneIn() {
    if (C.in) return craneP || Promise.resolve();
    C.in = true;
    crane.classList.add('in');
    site.classList.add('up');                                    // леса встают вместе с краном
    snd('whoosh', { dur: 0.7 });
    craneP = sleep(900);
    return craneP;
  }
  function craneOut() {
    C.in = false; craneP = null;
    crane.classList.add('snap'); crane.classList.remove('in'); void crane.offsetWidth; crane.classList.remove('snap');
  }
  /* кран уезжает и инструмент снимается: в следующий раз кран появится только по нажатию на инструмент */
  function craneAway() {
    if (MG.tools.current() === 'crane') MG.tools.clear();
    if (!C.in) return;
    C.in = false; craneP = null;
    crane.classList.remove('in');
    snd('whoosh', { dur: 0.5 });
  }

  /* ---------- раунд ---------- */
  function clearWorld() {
    world.querySelectorAll('.dc-num, .dc-op, .dc-sign, .dc-ac, .dc-mark, .dc-band, .dc-say, .dc-res').forEach((e) => e.remove());
  }

  function newRound() {
    window.dispatchEvent(new Event('mg:round'));
    const task = pick();
    lastKey = `${str(task.A)}${task.sign}${str(task.B)}`;
    closeTab();
    after.classList.remove('show');
    clearWorld();
    C.carry = null; C.tgt = null; if (C.tween) C.tween.done();
    craneOut();
    site.classList.add('snap'); site.classList.remove('up'); void site.offsetWidth; site.classList.remove('snap');
    if (MG.tools.current() === 'crane') MG.tools.clear();
    const st = { task, items: [], phase: 'place', busy: false, drag: null, cells: [], marks: [], cam: false };
    st.items = [task.A, task.B].map((op) => { const el = numEl(op); el.classList.add('free'); world.append(el); return { op, el, where: 'expr', slot: -1, x: 0, y: 0 }; });
    st.opEl = Object.assign(document.createElement('div'), { className: 'dc-op', textContent: fmtSign(task.sign) });
    world.append(st.opEl);
    state = st;
    site.classList.remove('drag', 'dc-flash');
    layout();
    st.items.forEach((it) => it.el.animate([{ opacity: 0, translate: '0 14px' }, { opacity: 1, translate: '0 0' }], { duration: T(350), easing: 'ease-out' }));
    setStats(lvlOf(), solved);
    sayPlace();
  }

  function sayPlace() {
    const st = state;
    if (!st || st.phase !== 'place') return;
    const n = st.items.filter((i) => i.where === 'slot').length;
    const sub = st.task.sign === '-' ? ' В вычитании сверху — большее число.' : '';
    if (!C.in) hint.set('Выбери башенный кран — он перенесёт числа на строительные леса');
    else if (n === 0) hint.set(`Перетащи число краном на леса: запятая — над жёлтой меткой.${sub}`);
    else hint.set(`Теперь второе число — запятая точно под запятой.${sub}`);
  }

  /* ---------- перетаскивание ---------- */
  const toWorld = (e) => { const r = world.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const LIFT = () => G.rh + 22;                 // число висит над пальцем, чтобы его было видно

  async function onDown(e) {
    const st = state;
    if (!st || st.busy || st.phase !== 'place') return;
    const el = e.target.closest('.dc-num');
    const it = el && st.items.find((i) => i.el === el && i.where === 'expr');
    if (!it) return;
    e.preventDefault();
    if (!MG.tools.need('crane')) return;
    st.busy = true;
    const drag = st.drag = { it, up: false, p: toWorld(e) };
    try { view.setPointerCapture(e.pointerId); } catch (err) { /* нет захвата */ }
    await craneIn();
    if (state !== st) return;
    C.tgt = null;
    await moveHook(it.x + offOf(it.op), it.y - 3);         // крюк опускается к запятой
    if (state !== st) return;
    snd('tick');
    it.where = 'carry'; it.el.classList.remove('free'); it.el.classList.add('carry');
    C.carry = it;
    site.classList.add('drag');
    await moveHook(it.x + offOf(it.op), it.y - 30, 160);   // подняли
    if (state !== st) return;
    if (drag.up) { drop(st); return; }
    C.tgt = { x: drag.p.x, y: drag.p.y - LIFT() };
  }
  function onMove(e) {
    const st = state;
    if (!st || !st.drag) return;
    st.drag.p = toWorld(e);
    if (C.carry && C.tgt) C.tgt = { x: st.drag.p.x, y: st.drag.p.y - LIFT() };
  }
  function onUp() {
    const st = state;
    if (!st || !st.drag) return;
    st.drag.up = true;
    if (C.carry && C.tgt) drop(st);
  }

  async function drop(st) {
    const it = C.carry;
    st.drag = null; C.tgt = null;
    const slot = st.items.filter((i) => i.where === 'slot').length;
    const bottom = C.hy + 3 + G.rh;
    const inSite = C.hx > G.gx - 3 * G.cw && C.hx < G.gx + G.gridW + 3 * G.cw && bottom > rowTop(1) - G.rh * 0.6 && bottom < G.DY + G.rh * 1.6;
    if (!inSite) { await carryBack(st, it); return; }
    const k = Math.round((C.hx - G.commaX) / G.cw);
    const tx = G.commaX + k * G.cw, ty = rowTop(slot) - 3;
    await moveHook(tx, Math.min(C.hy, ty - 24), 260);
    if (state !== st) return;
    await moveHook(tx, ty, 300);
    if (state !== st) return;
    if (k !== 0) { await wrongPlace(st, it, k, slot); return; }
    /* число встало */
    C.carry = null;
    it.where = 'slot'; it.slot = slot;
    it.el.classList.remove('carry');
    it.x = G.commaX - offOf(it.op); it.y = rowTop(slot);
    place(it.el, it.x, it.y);
    it.el.animate([{ scale: '1.06 .9' }, { scale: '.97 1.04' }, { scale: '1 1' }], { duration: T(320), easing: 'ease-out' });
    snd('pop');
    site.classList.remove('drag');
    moveHook(G.restX, G.restY, 520);
    if (slot === 0) { st.busy = false; sayPlace(); return; }
    await assembled(st);
  }

  async function wrongPlace(st, it, k, slot) {
    const n = Math.abs(k), side = k > 0 ? 'вправо' : 'влево';
    const w = n === 1 ? 'разряд' : n < 5 ? 'разряда' : 'разрядов';
    const msg = `Запятая не над жёлтой меткой: число съехало ${side} на ${n} ${w}. Запятая — под запятой!`;
    hint.set(msg); bubble(msg, 3200);
    it.el.classList.add('bad');
    site.classList.add('dc-flash');
    snd('nope');
    await it.el.animate([{ rotate: '0deg' }, { rotate: `${k > 0 ? 8 : -8}deg` }, { rotate: `${k > 0 ? -5 : 5}deg` }, { rotate: `${k > 0 ? 3 : -3}deg` }, { rotate: '0deg' }],
      { duration: T(800), easing: 'ease-in-out' }).finished.catch(() => {});
    if (state !== st) return;
    await moveHook(C.hx, rowTop(slot) - 70, 320);
    if (state !== st) return;
    site.classList.remove('dc-flash');
    it.el.classList.remove('bad');
    await carryBack(st, it, true);
  }

  async function carryBack(st, it, keepHint) {
    await moveHook(it.home.x + offOf(it.op), it.home.y - 30, 520);
    if (state !== st) return;
    await moveHook(it.home.x + offOf(it.op), it.home.y - 3, 200);
    if (state !== st) return;
    C.carry = null;
    it.where = 'expr'; it.el.classList.remove('carry'); it.el.classList.add('free');
    it.x = it.home.x; it.y = it.home.y; place(it.el, it.x, it.y);
    site.classList.remove('drag');
    snd('tick');
    moveHook(G.restX, G.restY, 520);
    st.busy = false;
    if (!keepHint) sayPlace();
  }

  /* ---------- оба числа на лесах ---------- */
  function placeSign(st) { st.signEl.style.transform = `translate(${G.gx - G.cw * 1.25}px, ${G.DY - G.rh * 1.5}px)`; }
  async function assembled(st) {
    st.phase = 'fill';
    const tk = st.task;
    st.signEl = Object.assign(document.createElement('div'), { className: 'dc-sign', textContent: fmtSign(tk.sign) });
    world.append(st.signEl);
    placeSign(st);
    st.opEl.animate([{ opacity: 1 }, { opacity: 0.25 }], { duration: T(300), fill: 'forwards' });
    await sleep(200);
    if (state !== st) return;
    st.signEl.classList.add('on');
    snd('pop');
    await sleep(450);
    if (state !== st) return;
    let top = st.items.find((i) => i.slot === 1), bot = st.items.find((i) => i.slot === 0);
    if (tk.sign === '-' && num(top.op) < num(bot.op)) {
      hint.set('В вычитании сверху стоит большее число — кран меняет их местами');
      bubble('В вычитании сверху — большее число. Меняем местами!', 2600);
      snd('whoosh', { dur: 0.6 });
      const yT = rowTop(1), yB = rowTop(0), d = G.cw * 1.6;
      const arc = (it, y0, y1, dx) => it.el.animate([
        { transform: `translate(${it.x}px, ${y0}px)` }, { transform: `translate(${it.x + dx}px, ${(y0 + y1) / 2}px)` }, { transform: `translate(${it.x}px, ${y1}px)` }],
      { duration: T(1000), easing: 'ease-in-out' }).finished.catch(() => {});
      await Promise.all([arc(top, yT, yB, -d), arc(bot, yB, yT, d)]);
      if (state !== st) return;
      top.slot = 0; bot.slot = 1;
      [top, bot] = [bot, top];
      [top, bot].forEach((it) => { it.y = rowTop(it.slot); place(it.el, it.x, it.y); });
      await sleep(600);
      if (state !== st) return;
    }
    /* пустые разряды справа — нули; у целого числа появляется запятая */
    let zeros = 0;
    for (const it of [top, bot]) {
      const gh = it.el.querySelector('.dc-c.gh');
      if (gh && tk.F) {
        gh.classList.remove('gh');
        gh.animate([{ scale: '.2' }, { scale: '1.3' }, { scale: '1' }], { duration: T(380), easing: 'ease-out' });
        snd('tick');
        await sleep(300);
        if (state !== st) return;
      }
      for (let j = it.op.frac.length; j < tk.F; j++) {
        if (!zeros) { hint.set('Пустые разряды справа заполняем нулями'); bubble('Пустые разряды заполняем нулями', 2000); }
        const z = span('dc-d zero', '0');
        it.el.append(z);
        z.animate([{ scale: '.2', opacity: 0 }, { scale: '1.25', opacity: 1 }, { scale: '1' }], { duration: T(380), easing: 'ease-out' });
        snd('pop');
        zeros++;
        await sleep(330);
        if (state !== st) return;
      }
    }
    if (zeros) await sleep(500);
    if (state !== st) return;
    /* шаги счёта — уже по тому, как числа стоят в столбике */
    st.steps = solve(top.op, bot.op, tk.sign).steps;
    st.top = top; st.bot = bot;
    craneAway();                                                 // числа на месте — кран больше не нужен
    /* камера опускается к столбику */
    hint.set('Считаем в столбик: справа налево, разряд за разрядом');
    st.cam = true;
    world.style.transform = `translateY(${-G.camY}px)`;
    await sleep(1000);
    if (state !== st) return;
    st.cells = st.steps.map((s) => { const el = document.createElement('div'); el.className = `dc-ac${s.kind === 'c' ? ' cm' : ''}`; world.append(el); const c = { s, el }; placeCell(c); return c; });
    st.cells.forEach((c, i) => c.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T(300), delay: T(i * 40), fill: 'backwards' }));
    st.band = Object.assign(document.createElement('div'), { className: 'dc-band' });
    world.append(st.band);
    st.si = 0; st.miss = 0;
    st.phase = 'type';
    st.busy = false;
    paintCur(st);
    openTab(st);
  }

  const cellX = (s) => (s.kind === 'c' ? G.commaX - G.cc / 2 : qx(s.q) - G.cw / 2);
  function placeCell(c) { c.el.style.left = `${cellX(c.s)}px`; c.el.style.top = `${G.ansY}px`; }
  function placeBand(st) {
    const s = st.steps[Math.min(st.si, st.steps.length - 1)];
    const w = s.kind === 'c' ? G.cc : G.cw, top = rowTop(1) - G.cw * 0.6;
    Object.assign(st.band.style, { left: `${cellX(s)}px`, width: `${w}px`, top: `${top}px`, height: `${G.ansY + G.rh - top + 4}px` });
  }
  function placeMark(m) { m.el.style.left = `${qx(m.q)}px`; m.el.style.top = `${rowTop(1) - G.cw * (m.el.classList.contains('dot') ? 0.02 : 0.52)}px`; }
  function mark(st, q, cls, text) {
    const el = document.createElement('span');
    el.className = `dc-mark ${cls}`;
    el.textContent = text || '';
    world.append(el);
    const m = { q, el };
    st.marks.push(m); placeMark(m);
  }

  /* облачко с объяснением (общие подсказки .hint в игре скрыты) — над лесами, в координатах мира */
  let sayT = 0;
  function bubble(text, ms = 2800) {
    world.querySelectorAll('.dc-say').forEach((e) => e.remove());
    clearTimeout(sayT);
    if (!text || !G) return;
    const b = Object.assign(document.createElement('div'), { className: 'dc-say', textContent: text });
    const x = Math.min(G.vw - 160, Math.max(150, G.gx + G.gridW / 2));
    b.style.left = `${x}px`; b.style.top = `${rowTop(1) - G.cw * 0.7}px`;
    world.append(b);
    sayT = setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 320); }, T(ms));
  }

  function paintCur(st) {
    st.cells.forEach((c, i) => c.el.classList.toggle('on', i === st.si));
    if (st.si < st.steps.length) { placeBand(st); st.band.classList.add('on'); } else st.band.classList.remove('on');
    if (st.tab) {
      const shown = st.steps.map((s, i) => (i < st.si ? s.exp : '_')).reverse().join('');
      st.tab.querySelector('.dc-pv b').textContent = shown;
    }
  }

  /* ---------- планшет ---------- */
  function openTab(st) {
    const tk = st.task;
    const tab = document.createElement('div');
    tab.className = 'dc-tab';
    tab.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="dcPencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter></svg>
      <div class="clip" role="dialog" aria-label="Впиши ответ в столбик"><div class="metal"></div><div class="paper"><div class="pencil">
      <div class="dc-pv">${str(st.top.op)} ${fmtSign(tk.sign)} ${str(st.bot.op)} = <b></b></div>
      <div class="msg"></div>
      <div class="pad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((d) => `<button class="k" type="button" data-d="${d}">${d}</button>`).join('')}<button class="k" type="button" data-d="," aria-label="Запятая">,</button><button class="k z" type="button" data-d="0">0</button></div>
      </div></div></div>`;
    document.body.append(tab);
    st.tab = tab;
    tab.querySelectorAll('.k').forEach((k) => k.addEventListener('click', () => type(st, k.dataset.d, k)));
    paintCur(st);
  }
  function closeTab() {
    document.querySelectorAll('.dc-tab:not(.out)').forEach((t) => { t.classList.add('out'); setTimeout(() => t.remove(), 360); });
    if (state) state.tab = null;
  }
  const say = (st, t) => { if (st.tab) st.tab.querySelector('.msg').textContent = t || ''; };

  function hintFor(s, miss) {
    if (s.kind === 'c') return 'Здесь запятая — она встаёт точно под запятыми';
    if (s.need !== undefined) {                                  // вычитание
      const a = (s.a || 0) - s.cin, b = s.b || 0;
      const lead = s.cin ? `${s.a || 0} − 1 (заняли) = ${a}. ` : '';
      if (s.need) return miss > 1 ? `${lead}Не хватает — занимаем 1 у соседа: ${a + 10} − ${b} = ${s.exp}` : `${lead}${a} меньше ${b} — займи 1 у соседа слева: ${a + 10} − ${b} = ?`;
      return miss > 1 ? `${lead}${a} − ${b} = ${s.exp}` : `${lead}${a} − ${b} = ?`;
    }
    const parts = [s.a, s.b].filter((v) => v !== null);
    if (!parts.length) parts.push(0);
    const ex = `${parts.join(' + ')}${s.cin ? ' + 1 (перенос)' : ''}`;
    if (miss > 1) return s.sum >= 10 ? `${ex} = ${s.sum}: пишем ${s.exp}, а 1 переносим влево` : `${ex} = ${s.sum}`;
    return s.sum >= 10 ? `${ex} = ? Если больше 9 — пиши последнюю цифру, 1 переносится` : `${ex} = ?`;
  }

  async function type(st, ch, key) {
    if (state !== st || st.phase !== 'type' || st.lock) return;
    const s = st.steps[st.si], c = st.cells[st.si];
    if (ch !== s.exp) {
      st.miss += 1;
      snd('nope');
      say(st, ch === ',' ? 'Запятая стоит под запятыми — а здесь ещё цифра' : hintFor(s, st.miss));
      c.el.classList.remove('bad'); void c.el.offsetWidth; c.el.classList.add('bad');
      if (key) { key.classList.remove('bad'); void key.offsetWidth; key.classList.add('bad'); }
      return;
    }
    st.lock = true; st.miss = 0;
    say(st, '');
    c.el.classList.remove('on', 'bad');
    c.el.textContent = s.exp;
    c.el.classList.add('full');
    const fall = G.ansY - rowTop(1);
    c.el.animate([{ transform: `translateY(${-fall}px) scale(.7)`, opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: 'translateY(5px) scale(1.04, .94)', offset: 0.8 }, { transform: 'none' }],
      { duration: T(420), easing: 'cubic-bezier(.4,0,.6,1)' });
    snd(s.kind === 'c' ? 'tick' : 'pop');
    if (s.cout) mark(st, s.q + 1, '', '1');                    // перенос единицы в соседний разряд
    if (s.need !== undefined && (s.cin || s.need)) mark(st, s.q, 'ten', String((s.a || 0) - s.cin + (s.need ? 10 : 0)));   // сколько стало сверху
    if (s.need) mark(st, s.q + 1, 'dot', '');                   // точка над цифрой, у которой заняли
    st.si += 1;
    paintCur(st);
    await sleep(260);
    if (state !== st) return;
    st.lock = false;
    if (st.si >= st.steps.length) finish(st);
  }

  window.addEventListener('keydown', (e) => {
    const st = state;
    if (!st || st.phase !== 'type' || !st.tab || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^\d$/.test(e.key)) { type(st, e.key); e.preventDefault(); e.stopPropagation(); }
    else if (e.key === ',' || e.key === '.') { type(st, ','); e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* строка-результат на месте примера: 2,74 + 12,1 = 14,84 (ответ зелёный) */
  function placeRes(st) {
    const r = st.resEl;
    r.style.transform = 'none';
    const w = r.offsetWidth, room = G.vw - 16, sc = Math.min(1, room / w);
    r.style.transform = `translate(${Math.round((G.vw - w) / 2)}px, ${G.exprTop}px) scale(${sc.toFixed(3)})`;
    stage.style.setProperty('--dc-after', `${view.offsetTop + G.exprTop + G.rh + 26}px`);
  }

  async function finish(st) {
    st.phase = 'done';
    closeTab();
    st.band.classList.remove('on');
    hint.set('');
    await sleep(250);
    if (state !== st) return;
    st.cells.forEach((c, i) => setTimeout(() => { c.el.classList.add('final'); c.el.animate([{ scale: '1' }, { scale: '1.25' }, { scale: '1' }], { duration: T(320) }); }, T(i * 60)));
    burst(st.cells[st.cells.length - 1].el, '#16a34a', 14);
    burst(st.cells[0].el, '#16a34a', 10);
    const tk = st.task;
    solved++;
    setStats(lvlOf(), solved);
    await sleep(1100);
    if (state !== st) return;
    /* стройка уходит: столбик, леса, земля; камера возвращается к примеру */
    const gone = [...world.querySelectorAll('.dc-num, .dc-sign, .dc-ac, .dc-mark, .dc-band, .dc-say')];
    gone.forEach((e) => e.animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 30px' }], { duration: T(450), easing: 'ease-in', fill: 'forwards' }));
    site.classList.remove('up');
    st.cam = false;
    world.style.transform = '';
    snd('whoosh', { dur: 0.6 });
    await sleep(1000);
    if (state !== st) return;
    gone.forEach((e) => e.remove());
    st.opEl.remove();
    /* пример с ответом — на прежнем месте */
    const res = document.createElement('div');
    res.className = 'dc-res';
    const op = (t) => Object.assign(document.createElement('div'), { className: 'dc-op', textContent: t });
    const ansOp = { int: tk.ans.split(',')[0], frac: tk.ans.split(',')[1] || '' };
    const ansEl = numEl(ansOp); ansEl.classList.add('ans');
    res.append(numEl(tk.A), op(fmtSign(tk.sign)), numEl(tk.B), op('='), ansEl);
    world.append(res);
    st.resEl = res;
    placeRes(st);
    res.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T(350), easing: 'ease-out' });
    ansEl.animate([{ scale: '.3', opacity: 0 }, { scale: '1.15', opacity: 1 }, { scale: '1' }], { duration: T(500), delay: T(200), easing: 'ease-out', fill: 'backwards' });
    setTimeout(() => { if (state === st) burst(ansEl, '#16a34a', 14); }, T(450));
    resultText.textContent = `${str(tk.A)} ${fmtSign(tk.sign)} ${str(tk.B)} = ${tk.ans}`;
    after.classList.add('show');
    if (solved >= TOTAL) setTimeout(offerDone, T(900));
    setTimeout(() => nextBtn.focus({ preventScroll: true }), T(300));
  }

  function offerDone() {
    if (document.querySelector('.so-ov')) return;
    const ov = document.createElement('div');
    ov.className = 'so-ov';
    ov.innerHTML = '<div class="skip-offer" role="dialog"><h3>Уровень пройден!</h3><p>Ты научился складывать и вычитать десятичные дроби в столбик. Идём дальше.</p><div class="so-row"><button type="button" class="so-go">На карту</button></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('.so-go').addEventListener('click', () => {
      try { localStorage.setItem('mg.solved.decadd', String(Math.max(TOTAL, solved))); } catch (err) { /* нет хранилища */ }
      ov.remove();
      const home = document.getElementById('home-btn');
      if (home) home.click();
    });
  }

  /* ---------- сборка ---------- */
  site = Object.assign(document.createElement('div'), { className: 'dc-site' });
  crane = Object.assign(document.createElement('div'), { className: 'dc-crane' });
  world.append(site, crane);

  view.addEventListener('pointerdown', onDown);
  view.addEventListener('pointermove', onMove);
  view.addEventListener('pointerup', onUp);
  view.addEventListener('pointercancel', onUp);
  nextBtn.addEventListener('click', () => {
    if (solved >= TOTAL) { offerDone(); return; }
    const o = document.querySelector('.so-ov'); if (o) o.remove();
    newRound();
  });
  window.addEventListener('toolchange', (e) => {
    if (MG.active !== MG.modes.decadd || e.detail.tool !== 'crane') return;
    craneIn().then(() => sayPlace());
  });
  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (MG.active === MG.modes.decadd && state && !state.busy && !C.carry && state.phase !== 'fill') layout(); }, 150);
  });

  MG.modes.decadd = {
    total: TOTAL,
    levelUp() { solved = Math.min(TOTAL, (Math.floor(solved / 2) + 1) * 2); if (solved >= TOTAL) { setStats(lvlOf(), solved); offerDone(); return; } newRound(); },
    start() {
      craneOut();
      if (MG.tools.current() === 'crane') MG.tools.clear();
      if (state && state.phase === 'place' && !state.items.some((i) => i.where === 'slot')) site.classList.remove('up');
      if (!raf) raf = requestAnimationFrame(frame);
      if (!state) newRound();
      else { setStats(lvlOf(), solved); layout(); if (state.phase === 'type' && !state.tab) openTab(state); sayPlace(); }
    },
    skip() { if (solved >= TOTAL) { offerDone(); return; } newRound(); },
    stop() {
      cancelAnimationFrame(raf); raf = 0;
      const st = state;
      if (st) {
        if (C.carry) { const it = C.carry; C.carry = null; it.where = 'expr'; it.el.classList.remove('carry', 'bad'); it.el.classList.add('free'); }
        st.drag = null; st.lock = false;
        if (st.busy || st.phase === 'fill') state = null;    // недоигранная анимация — при возвращении новый пример
      }
      C.tgt = null; if (C.tween) C.tween.done();
      closeTab();
    },
    /* для теста */
    _state: () => state,
  };
})();
