/* Главное меню: карта с островами. Остров = раздел, точки на острове = режимы.
 *   MG.home.show()  — открыть карту      MG.home.refresh() — обновить значки «решено»
 * Режим открывается через MG.go(имя) (задаёт app.js). */
(() => {
  'use strict';
  const MG = window.MG;
  const root = document.getElementById('home');
  if (!root) return;

  const LEVELS = [
    { n: 'I', title: 'Сокращение дробей', cls: 'l1', modes: [
      { id: 'cancel', name: 'Сокращение чисел', icon: 'hammer', x: 68, y: 72 },
      { id: 'factor', name: 'Вынесение за скобки', icon: 'rocket', x: 64, y: 16 } ] },
    { n: 'II', title: 'Сложение и вычитание', cls: 'l2', modes: [
      { id: 'common', name: 'Общий знаменатель', icon: 'joker', x: 13, y: 68 },
      { id: 'big', name: 'Большие знаменатели', icon: 'press', x: 33, y: 47 },
      { id: 'borrow', name: 'Занять единицу', icon: 'claw', x: 50, y: 78 },
      { id: 'mixed', name: 'Смешанные числа', icon: 'heli', x: 68, y: 46 },
      { id: 'br', name: 'Дроби с переменными', icon: 'box', x: 87, y: 74 } ] },
    { n: 'III', title: 'Умножение и деление', cls: 'l3', modes: [
      { id: 'mul', name: 'Умножение дробей', icon: 'bridge', x: 14, y: 76 },
      { id: 'div', name: 'Деление дробей', icon: 'fan', x: 38, y: 54 },
      { id: 'whole', name: 'Целое × дробь', icon: 'rain', x: 66, y: 84 },
      { id: 'mixmd', name: 'Смешанные × ÷', icon: 'teeth', x: 84, y: 54 } ] },
    { n: 'IV', title: 'Уравнения', cls: 'l4', modes: [
      { id: 'prop', name: 'Пропорции', icon: 'cups', x: 28, y: 72 },
      { id: 'shift', name: 'Перенос через «=»', icon: 'conveyor', x: 72, y: 72 } ] },
  ];

  /* ---------- рисунки островов (SVG 400×300) ---------- */
  const pine = (x, y, s = 1, c = '#2f8f4e') => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="-6" width="6" height="12" fill="#6b4a2b"/><path d="M0 -58 L-17 -26 L-8 -26 L-22 2 L22 2 L8 -26 L17 -26Z" fill="${c}" stroke="#1c5a33" stroke-width="2.2" stroke-linejoin="round"/><path d="M0 -58 L8 -40 L0 -42Z M8 -26 L16 -8 L6 -10Z" fill="#fff" opacity=".13"/></g>`;
  const palm = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" stroke-linecap="round" stroke-linejoin="round"><path d="M0 0 Q6 -22 -2 -44" fill="none" stroke="#8a5a2e" stroke-width="5"/><path d="M-2 -44 Q-22 -50 -30 -38 M-2 -44 Q-16 -62 -34 -56 M-2 -44 Q10 -64 28 -58 M-2 -44 Q22 -48 32 -36 M-2 -44 Q2 -60 2 -66" fill="none" stroke="#2f9a4a" stroke-width="5"/></g>`;
  const defs = `<defs>
    <linearGradient id="gRock" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9b8f86"/><stop offset="1" stop-color="#6b5f5b"/></linearGradient>
    <linearGradient id="gUnder" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a6049"/><stop offset="1" stop-color="#43352a"/></linearGradient>
    <linearGradient id="gGrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78c158"/><stop offset="1" stop-color="#4c9a46"/></linearGradient>
    <linearGradient id="gSnow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfe3f7"/></linearGradient>
    <radialGradient id="gSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff4b0" stop-opacity=".95"/><stop offset=".55" stop-color="#ffd36b" stop-opacity=".45"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
  </defs>`;
  const under = (cx = 200, w = 175, h = 56) => `<path d="M${cx - w} 226 Q${cx - w + 14} ${226 + h} ${cx - 30} ${226 + h * 1.15} Q${cx} ${226 + h * 1.5} ${cx + 30} ${226 + h * 1.15} Q${cx + w - 14} ${226 + h} ${cx + w} 226Z" fill="url(#gUnder)" stroke="#33271d" stroke-width="3" stroke-linejoin="round"/><path d="M${cx - 60} 240 l6 14 M${cx + 10} 246 l5 16 M${cx + 70} 238 l-4 12" stroke="#33271d" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`;
  const grass = (cx = 200, w = 175) => `<ellipse cx="${cx}" cy="226" rx="${w}" ry="34" fill="url(#gGrass)" stroke="#2f6e33" stroke-width="3"/>`;
  const mountain = (x, base, hgt, w, snow = true) => {
    const t = base - hgt, l = x - w / 2, r = x + w / 2;
    return `<path d="M${l} ${base} L${x - w * 0.12} ${t + hgt * 0.08} Q${x} ${t - 6} ${x + w * 0.12} ${t + hgt * 0.08} L${r} ${base}Z" fill="url(#gRock)" stroke="#4a4140" stroke-width="3" stroke-linejoin="round"/>
    <path d="M${x + w * 0.02} ${t + 2} L${x + w * 0.12} ${t + hgt * 0.08} L${r} ${base} L${x + w * 0.12} ${base} Z" fill="#3b2f35" opacity=".28"/>
    ${snow ? `<path d="M${x - w * 0.19} ${t + hgt * 0.34} L${x - w * 0.12} ${t + hgt * 0.08} Q${x} ${t - 6} ${x + w * 0.12} ${t + hgt * 0.08} L${x + w * 0.2} ${t + hgt * 0.34} L${x + w * 0.1} ${t + hgt * 0.27} L${x + w * 0.04} ${t + hgt * 0.38} L${x - w * 0.03} ${t + hgt * 0.26} L${x - w * 0.1} ${t + hgt * 0.37}Z" fill="url(#gSnow)" stroke="#8fb0cf" stroke-width="2.4" stroke-linejoin="round"/>` : ''}`;
  };
  const cloud = (x, y, s = 1, o = 1) => `<g transform="translate(${x} ${y}) scale(${s})" opacity="${o}"><path d="M-46 0 Q-62 0 -58 -14 Q-54 -26 -40 -22 Q-36 -42 -14 -38 Q-2 -54 18 -40 Q40 -44 42 -22 Q62 -20 58 -4 Q56 4 44 4Z" fill="#fff" stroke="#c9d6ec" stroke-width="2.4" stroke-linejoin="round"/></g>`;
  const gear = (x, y, r, col) => { let d = ''; for (let i = 0; i < 8; i++) d += `<rect x="${-r * 0.2}" y="${-r * 1.2}" width="${r * 0.4}" height="${r * 0.5}" rx="1" transform="rotate(${i * 45})"/>`; return `<g transform="translate(${x} ${y})"><g class="spin" fill="${col}" stroke="#4b3a7a" stroke-width="1.6">${d}<circle r="${r}"/><circle r="${r * 0.4}" fill="#e9dcff"/></g></g>`; };

  const ART = {
    l1: () => `<svg viewBox="0 0 400 300" aria-hidden="true">${defs}${under()}${grass()}
      <path d="M40 232 Q70 214 110 224 Q106 244 70 246 Q42 246 40 232Z" fill="#43a3e8" stroke="#2468a8" stroke-width="3"/>
      ${mountain(205, 228, 170, 190)}
      <path d="M184 228 Q184 196 205 196 Q226 196 226 228Z" fill="#2a2024" stroke="#17100f" stroke-width="2.5"/>
      <g class="shk">${pine(96, 226, .95)}${pine(124, 232, .8, '#3aa05a')}</g>${palm(150, 232, .9)}${pine(300, 228, .85)}${pine(328, 224, 1.05, '#2a8248')}${pine(352, 226, .7)}
      ${cloud(110, 78, .8, .9)}
      <g class="zapc"><g transform="translate(330 78) scale(.85)"><path d="M-46 0 Q-62 0 -58 -14 Q-54 -26 -40 -22 Q-36 -42 -14 -38 Q-2 -54 18 -40 Q40 -44 42 -22 Q62 -20 58 -4 Q56 4 44 4Z" fill="#6a739f" stroke="#3c4470" stroke-width="2.6" stroke-linejoin="round"/></g></g>
      <g class="zap" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="268" cy="156" r="18" fill="#fff6b0" stroke="none" opacity=".75"/>
        <polyline points="328,88 314,108 325,110 300,134 311,136 268,156" stroke="#ffd23d" stroke-width="9" opacity=".55"/><polyline points="328,88 314,108 325,110 300,134 311,136 268,156" stroke="#fffbe0" stroke-width="3.6"/></g></svg>`,
    l2: () => `<svg viewBox="0 0 400 300" aria-hidden="true">${defs}${under(200, 170)}${grass(200, 170)}
      ${mountain(215, 230, 175, 215)}
      ${cloud(150, 150, 1.25, .92)}${cloud(280, 176, 1.1, .9)}${cloud(90, 210, .9, .95)}${cloud(322, 112, .8, .9)}
      <g stroke="#2a8cd6" stroke-width="2.2" stroke-linecap="round" opacity=".9"><path d="M110 170 l-3 6 M122 176 l-3 6 M134 168 l-3 6"/></g>
      ${pine(60, 232, .8)}${pine(342, 232, .8, '#3aa05a')}</svg>`,
    l3: () => `<svg viewBox="0 0 400 300" aria-hidden="true">${defs}<circle cx="120" cy="140" r="110" fill="url(#gSun)"/>${under(200, 178)}
      <ellipse cx="200" cy="226" rx="178" ry="32" fill="#a5753f" stroke="#5e3f1e" stroke-width="3"/>
      <path d="M70 228 L112 128 L136 150 L164 62 L190 120 L198 150 L200 228Z" fill="url(#gRock)" stroke="#4a4140" stroke-width="3" stroke-linejoin="round"/>
      <path d="M164 62 L190 120 L198 150 L200 228 L168 228 L168 110Z" fill="#3b2f35" opacity=".3"/>
      <path d="M252 228 L254 110 L286 28 L322 110 L344 228Z" fill="url(#gRock)" stroke="#4a4140" stroke-width="3" stroke-linejoin="round"/>
      <path d="M286 28 L322 110 L344 228 L290 228 L294 120Z" fill="#3b2f35" opacity=".3"/>
      <g fill="#8a7d77" stroke="#4a4140" stroke-width="2"><path d="M104 232 l8 -9 l12 5 l-2 10z"/></g>
      ${gear(218, 196, 14, '#b79cf0')}${gear(240, 176, 10, '#9f7ee8')}${gear(210, 168, 7, '#c9b4f5')}
      <g stroke="#3a2a14" stroke-width="2.6" stroke-linejoin="round">
        <path d="M190 150 L190 124 L198 114 L206 124 L206 150Z" fill="#8f6a3a"/><path d="M244 150 L244 124 L252 114 L260 124 L260 150Z" fill="#8f6a3a"/>
        <g class="leaf lf-l" style="transform-origin:200px 150px"><rect x="200" y="143" width="27" height="9" rx="2" fill="#c98f4a"/><path d="M208 143 v9 M216 143 v9 M224 143 v9" stroke-width="1.6" fill="none"/></g>
        <g class="leaf lf-r" style="transform-origin:250px 150px"><rect x="223" y="143" width="27" height="9" rx="2" fill="#c98f4a"/><path d="M226 143 v9 M234 143 v9 M242 143 v9" stroke-width="1.6" fill="none"/></g>
      </g>
      ${pine(52, 236, .6, '#4a9a52')}${pine(352, 238, .65, '#3a8a4c')}
      <path d="M0 196 q30 -10 70 0 t80 0" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".22"/></svg>`,
    l4: () => `<svg viewBox="0 0 400 300" aria-hidden="true">${defs}${under(200, 150, 64)}${grass(200, 150)}
      <g class="seesaw" style="transform-origin:200px 186px"><rect x="64" y="176" width="272" height="12" rx="6" fill="#e9b25a" stroke="#7a4f12" stroke-width="3"/>
        <rect x="76" y="166" width="62" height="10" rx="4" fill="#fff3d6" stroke="#7a4f12" stroke-width="2.4"/><rect x="262" y="166" width="62" height="10" rx="4" fill="#fff3d6" stroke="#7a4f12" stroke-width="2.4"/>
        <text x="107" y="160" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="34" fill="#fff" stroke="#233a7a" stroke-width="2" paint-order="stroke">2x</text>
        <text x="293" y="160" text-anchor="middle" font-family="Nunito,sans-serif" font-weight="900" font-size="34" fill="#fff" stroke="#233a7a" stroke-width="2" paint-order="stroke">7</text></g>
      <path d="M200 186 L172 226 L228 226Z" fill="#c9833a" stroke="#6e4311" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="200" cy="186" r="9" fill="#f6d27a" stroke="#6e4311" stroke-width="3"/>
      ${pine(70, 228, .7, '#3aa05a')}${pine(330, 228, .7)}${cloud(300, 90, .8, .9)}${cloud(88, 108, .7, .85)}</svg>`,
  };

  /* ---------- вёрстка ---------- */
  const css = document.createElement('style');
  css.textContent = `
    body.is-home .top, body.is-home .toolbar, body.is-home .stage { display: none !important; }
    body.is-home { background: #0f1d4d; }
    #home { position: fixed; inset: 0; overflow-y: auto; overflow-x: hidden; z-index: 30; -webkit-overflow-scrolling: touch; touch-action: pan-y;
      background: linear-gradient(180deg, #0f1d4d 0, #1f4aa8 18%, #4d63c6 34%, #8a64c4 46%, #e2733f 66%, #f3a444 84%, #f8d77c 100%); }
    #home[hidden] { display: none; }
    .hm-stars { position: absolute; inset: 0 0 auto 0; height: 38%; pointer-events: none; opacity: .9;
      background-image: radial-gradient(2px 2px at 12% 18%, #fff 50%, transparent 52%), radial-gradient(1.6px 1.6px at 78% 9%, #fff 50%, transparent 52%), radial-gradient(2px 2px at 44% 30%, #fff 50%, transparent 52%), radial-gradient(1.4px 1.4px at 90% 40%, #fff 50%, transparent 52%), radial-gradient(1.8px 1.8px at 25% 62%, #fff 50%, transparent 52%), radial-gradient(1.4px 1.4px at 62% 74%, #fff 50%, transparent 52%), radial-gradient(1.6px 1.6px at 5% 88%, #fff 50%, transparent 52%);
      animation: hmTw 4s ease-in-out infinite alternate; }
    @keyframes hmTw { from { opacity: .5; } to { opacity: 1; } }
    .hm-col { position: relative; max-width: 620px; margin: 0 auto; padding: calc(18px + env(safe-area-inset-top)) 14px calc(40px + env(safe-area-inset-bottom)); }
    .hm-title { text-align: center; font-weight: 900; font-size: clamp(1.5rem, 6vw, 2.2rem); color: #fff4d6; letter-spacing: .02em; -webkit-text-stroke: 1px rgba(40, 24, 8, .0); text-shadow: 0 3px 0 #7a4a14, 0 6px 14px rgba(0, 0, 0, .35); margin: 6px 0 2px; }
    .hm-sub { text-align: center; color: #cfe0ff; font-weight: 800; font-size: .95rem; margin: 0 0 6px; }
    .isle { position: relative; margin: 6px 0 18px; }
    .isle-art { position: relative; aspect-ratio: 4 / 3; width: 100%; }
    .isle-art > svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 14px 14px rgba(0, 0, 0, .28)); animation: hmFloat 6s ease-in-out infinite; }
    .isle:nth-child(odd) .isle-art > svg { animation-delay: -2.5s; }
    @keyframes hmFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
    .spin { animation: hmSpin 9s linear infinite; }
    @keyframes hmSpin { to { transform: rotate(360deg); } }
    .spin { transform-box: fill-box; transform-origin: center; }
    .leaf { animation-duration: 7s; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
    .lf-l { animation-name: hmLeafL; } .lf-r { animation-name: hmLeafR; }
    @keyframes hmLeafL { 0%, 38% { transform: rotate(0); } 52%, 82% { transform: rotate(-68deg); } 96%, 100% { transform: rotate(0); } }
    @keyframes hmLeafR { 0%, 38% { transform: rotate(0); } 52%, 82% { transform: rotate(68deg); } 96%, 100% { transform: rotate(0); } }
    .seesaw { animation: hmSee 4s ease-in-out infinite alternate; }
    @keyframes hmSee { from { transform: rotate(-5deg); } to { transform: rotate(5deg); } }
    .lv { position: absolute; top: 2%; z-index: 3; display: flex; align-items: center; gap: 10px; pointer-events: none; }
    .isle.r .lv { left: 1%; } .isle.l .lv { right: 1%; flex-direction: row-reverse; text-align: right; }
    .lv .num { font-weight: 900; font-size: clamp(2.6rem, 11vw, 4rem); line-height: 1; color: #fff1cf; -webkit-text-stroke: 7px #5a3512; paint-order: stroke fill; text-shadow: 0 5px 0 #5a3512; letter-spacing: .02em; }
    .lv .txt { font-weight: 900; color: #fff1cf; -webkit-text-stroke: 5px #5a3512; paint-order: stroke fill; font-size: clamp(1rem, 4.4vw, 1.5rem); line-height: 1.05; text-shadow: 0 3px 0 #5a3512; text-transform: uppercase; max-width: 9em; }
    .pin { position: absolute; z-index: 4; transform: translate(-50%, -50%); border: 0; background: none; padding: 0; cursor: pointer; display: flex; flex-direction: column; align-items: center; font: inherit; -webkit-tap-highlight-color: transparent; }
    .pin .dot { width: clamp(46px, 13vw, 64px); aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center; background: radial-gradient(circle at 35% 28%, #fffdf5, #ffe9ab 70%, #f6c860); border: 4px solid #5a3512; box-shadow: 0 5px 0 #5a3512, 0 10px 14px rgba(0, 0, 0, .3); transition: transform .18s cubic-bezier(.3, 1.6, .5, 1); }
    .pin:hover .dot, .pin:focus-visible .dot { transform: translateY(-3px) scale(1.08); }
    .pin:active .dot { transform: translateY(3px) scale(.96); box-shadow: 0 1px 0 #5a3512; }
    .pin .dot svg { width: 62%; height: 62%; overflow: visible; }
    .pin .nm { margin-top: 9px; padding: 2px 9px; border-radius: 99px; background: rgba(24, 16, 40, .72); color: #fff; font-weight: 800; font-size: clamp(.62rem, 2.5vw, .78rem); white-space: normal; text-align: center; line-height: 1.12; max-width: 7.6em; box-shadow: 0 2px 6px rgba(0, 0, 0, .3); }
    .pin .st { position: absolute; top: -6px; right: -8px; min-width: 22px; height: 22px; padding: 0 5px; border-radius: 99px; background: #3fbf6d; color: #fff; font-weight: 900; font-size: .72rem; display: grid; place-items: center; border: 2.5px solid #17653a; box-shadow: 0 2px 0 #17653a; }
    .pin .st[hidden] { display: none; }
    .hm-path { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; overflow: visible; }
    .deco { position: absolute; z-index: 3; width: clamp(28px, 8vw, 46px); pointer-events: none; animation: hmBob 3.4s ease-in-out infinite alternate; filter: drop-shadow(0 4px 4px rgba(0, 0, 0, .3)); }
    .deco.orbit { animation: none; transform: translate(-50%, -50%); filter: drop-shadow(0 6px 5px rgba(0, 0, 0, .35)); width: clamp(38px, 11vw, 60px); }
    .isle-art > svg { z-index: 1; }
    .deco.chop { animation: hmChop 1.9s ease-in-out infinite; transform-origin: 14% 90%; }
    @keyframes hmChop { 0% { transform: rotate(-4deg); } 55% { transform: rotate(-30deg); } 66% { transform: rotate(16deg); } 72% { transform: rotate(10deg); } 78% { transform: rotate(14deg); } 100% { transform: rotate(-4deg); } }
    .shk { transform-box: fill-box; transform-origin: 50% 100%; animation: hmShk 1.9s linear infinite; }
    @keyframes hmShk { 0%, 64% { transform: none; } 67% { transform: translateX(-2.5px) rotate(-1.6deg); } 71% { transform: translateX(2px) rotate(1.1deg); } 76% { transform: translateX(-1px) rotate(-.5deg); } 82%, 100% { transform: none; } }
    .zap { opacity: 0; animation: hmZap 7s linear infinite; }
    .zapc { animation: hmZapC 7s linear infinite; }
    @keyframes hmZap { 0%, 86% { opacity: 0; } 87% { opacity: 1; } 89% { opacity: .15; } 90% { opacity: 1; } 94% { opacity: .8; } 97%, 100% { opacity: 0; } }
    @keyframes hmZapC { 0%, 86% { filter: none; } 87%, 94% { filter: brightness(1.7); } 97%, 100% { filter: none; } }
    .deco svg { width: 100%; display: block; overflow: visible; }
    @keyframes hmBob { from { transform: translateY(-5px) rotate(-4deg); } to { transform: translateY(6px) rotate(4deg); } }
    .hm-foot { text-align: center; color: #5a3512; font-weight: 800; font-size: .85rem; opacity: .75; margin-top: 4px; }
    @media (prefers-reduced-motion: reduce) { .isle-art > svg, .deco, .spin, .seesaw, .leaf, .shk, .hm-stars { animation: none; } }
  `;
  document.head.append(css);

  /* значки вокруг островов: [иконка, x%, y%] */
  const DECO = {
    l1: [['axe', 12, 62, 'chop'], ['heli', 50, 40, 'orbit']],
    l2: [['rain', 24, 6], ['heli', 80, 30], ['box', 72, 70], ['joker', 3, 36]],
    l3: [['fan', 6, 72], ['rocket', 80, 12]],
    l4: [['conveyor', 10, 26], ['cups', 82, 38]],
  };
  const icon = (id) => (MG.tools && MG.tools.icon ? MG.tools.icon(id) : '') || '';

  const getSolved = (id) => { try { return +localStorage.getItem(`mg.solved.${id}`) || 0; } catch (e) { return 0; } };

  function build() {
    const col = document.createElement('div');
    col.className = 'hm-col';
    col.innerHTML = `<div class="hm-title">Математические игры</div><p class="hm-sub">Выбери остров и точку на нём</p>`;
    LEVELS.forEach((lv, i) => {
      const side = i % 2 ? 'l' : 'r';
      const sec = document.createElement('section');
      sec.className = `isle ${side}`;
      const pts = lv.modes.map((m) => `${m.x * 4},${m.y * 3}`);
      const path = false && lv.modes.length > 1 ? `<svg class="hm-path" viewBox="0 0 400 300" preserveAspectRatio="none"><polyline points="${pts.join(' ')}" fill="none" stroke="#fff6d8" stroke-width="5" stroke-dasharray="2 11" stroke-linecap="round" opacity=".85"/></svg>` : '';
      sec.innerHTML = `
        <div class="lv"><span class="num">${lv.n}</span><span class="txt">${lv.title}</span></div>
        <div class="isle-art">${ART[lv.cls]()}${path}
          ${DECO[lv.cls].map(([ic, x, y, fx], k) => `<div class="deco${fx ? ' ' + fx : ''}" style="left:${x}%;top:${y}%;animation-delay:${-k * 0.8}s">${icon(ic)}</div>`).join('')}
          ${lv.modes.map((m) => `<button class="pin" type="button" data-mode="${m.id}" style="left:${m.x}%;top:${m.y}%" aria-label="${m.name}"><span class="dot">${icon(m.icon)}</span><span class="nm">${m.name}</span><span class="st" hidden></span></button>`).join('')}
        </div>`;
      col.append(sec);
    });
    col.insertAdjacentHTML('beforeend', '<p class="hm-foot">Все режимы открыты — решай в любом порядке</p>');
    root.replaceChildren(Object.assign(document.createElement('div'), { className: 'hm-stars' }), col);
    root.querySelectorAll('.pin').forEach((b) => b.addEventListener('click', () => MG.go && MG.go(b.dataset.mode)));
    refresh();
  }

  function refresh() {
    root.querySelectorAll('.pin').forEach((b) => {
      const n = getSolved(b.dataset.mode), st = b.querySelector('.st');
      st.hidden = !n; st.textContent = n ? `✓${n}` : '';
    });
  }

  /* вертолёт облетает гору: эллипс, сзади горы он меньше и прячется за ней */
  let orbitAnim = null;
  function startOrbit() {
    const el = root.querySelector('.deco.orbit');
    if (!el || !el.parentElement || root.hidden) return;
    if (orbitAnim) orbitAnim.cancel();
    const W = el.parentElement.clientWidth, H = el.parentElement.clientHeight;
    const rx = W * 0.36, ry = H * 0.075, N = 72;
    const kf = [];
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const x = Math.cos(a) * rx, y = Math.sin(a) * ry;     // sin > 0 — перед горой
      const front = Math.sin(a) > 0;
      const dir = -Math.sin(a) > 0 ? -1 : 1;              // иконка смотрит носом влево: при полёте вправо отражаем
      const sc = front ? 1 : 0.78;
      kf.push({ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${dir * sc}, ${sc})`, zIndex: front ? 3 : 0 });
    }
    orbitAnim = el.animate(kf, { duration: 16000, iterations: Infinity, easing: 'linear' });
  }
  window.addEventListener('resize', () => { if (!root.hidden) startOrbit(); });

  let built = false;
  function show() {
    if (!built) { build(); built = true; } else refresh();
    root.hidden = false;
    document.body.classList.add('is-home');
    root.scrollTop = 0;
    startOrbit();
  }
  function hide() { root.hidden = true; document.body.classList.remove('is-home'); }

  MG.home = { show, hide, refresh };
})();
