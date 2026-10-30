/* Главное меню, два уровня:
 *   разделы (SECTIONS) — большие острова, собранные из кусков-подразделов;
 *   острова подразделов (LEVELS) — точки на острове = режимы.
 *   MG.home.show('sections' | 'islands') — открыть меню      MG.home.refresh() — обновить значки «решено»
 * Режим открывается через MG.go(имя) (задаёт app.js). */
(() => {
  'use strict';
  const MG = window.MG;
  const root = document.getElementById('home');
  if (!root) return;

  const LEVELS = [
    { n: 'I', title: 'Сокращение дробей', cls: 'l1', modes: [
      { id: 'cancel', name: 'Сокращение чисел', icon: 'hammer', x: 68, y: 72 },
      { id: 'ext', name: 'Выделить целое', icon: 'maw', x: 40, y: 40 },
      { id: 'factor', name: 'Вынесение за скобки', icon: 'rocket', x: 66, y: 10 } ] },
    { n: 'II', title: 'Сложение и вычитание', cls: 'l2', modes: [
      { id: 'common', name: 'Общий знаменатель', icon: 'joker', x: 32, y: 56 },
      { id: 'borrow', name: 'Занять единицу', icon: 'claw', x: 60, y: 42, lab: 'r' },
      { id: 'mixed', name: 'Смешанные числа', icon: 'heli', x: 38, y: 24, lab: 'r' },
      { id: 'br', name: 'Дроби с переменными', icon: 'box', x: 84, y: 71 } ] },
    { n: 'III', title: 'Умножение и деление', cls: 'l3', modes: [
      { id: 'mul', name: 'Умножение дробей', icon: 'gear1', x: 56, y: 56 },
      { id: 'div', name: 'Деление дробей', icon: 'fan', x: 65, y: 21 },
      { id: 'whole', name: 'Целое × дробь', icon: 'rain', x: 14, y: 41 },
      { id: 'mixmd', name: 'Смешанные × ÷', icon: 'teeth', x: 88, y: 66 } ] },
    { n: 'IV', title: 'Уравнения', cls: 'l4', modes: [
      { id: 'prop', name: 'Пропорции', icon: 'cups', x: 28, y: 72 },
      { id: 'shift', name: 'Перенос через «=»', icon: 'conveyor', x: 72, y: 72 } ] },
  ];

  /* ---------- разделы: самое главное меню ----------
   * Раздел — один большой остров. Его основа — остров первого подраздела (base),
   * остальные подразделы — куски (parts): пока подраздел не решён, кусок отколот и висит
   * в стороне; чем больше процент, тем ближе он подлетает; на 100% ждёт тапа (награда)
   * и защёлкивается. Кусок рисуется тем же SVG, что и остров подраздела (ART).
   * Новый раздел (например, «Десятичные дроби»): свой список островов + запись здесь.
   *   lvl        — номер острова подраздела в levels;
   *   cx, cy, s  — где стоит кусок, когда прикреплён: центр травы и масштаб (поле 1000×800);
   *   dx, dy     — куда он отлетает, пока не решён;  back — рисовать позади основы;
   *   tap        — сдвиг подсказки «Нажми!» по высоте (в единицах острова 400×300);
   *   open       — с какого прогресса основы кусок появляется (до этого на его месте облако).
   *                Кусок появляется и раньше, если у его подраздела уже есть хоть одна решённая задача. */
  /* раздел «Десятичные дроби»: пока только острова-заглушки, режимы появятся позже */
  const DEC_LEVELS = [
    { n: 'I', title: 'Сложение и вычитание', modes: [] },
    { n: 'II', title: 'Умножение', modes: [] },
    { n: 'III', title: 'Деление', modes: [] },
    { n: 'IV', title: 'Уравнения', modes: [] },
  ];
  const SECTIONS = [
    { id: 'fr', title: 'Обыкновенные дроби', levels: LEVELS,
      base: { lvl: 0, art: 'l1', cx: 500, cy: 470, s: 1.3 },
      parts: [
        { lvl: 3, art: 'beam', cx: 680, cy: 404, s: 0.72, dx: 0.45, dy: -0.9, back: true, tap: -150, open: 1 },
        { lvl: 1, art: 'l2', cx: 226, cy: 524, s: 0.8, dx: -0.16, dy: 1, open: 1 / 3 },
        { lvl: 2, art: 'l3', cx: 778, cy: 518, s: 0.8, dx: 0.16, dy: 1, open: 2 / 3 },
      ] },
    /* soon — остров ещё не нарисован: на его месте всегда облако */
    { id: 'dec', title: 'Десятичные дроби', levels: DEC_LEVELS,
      base: { lvl: 0, art: 'crane', cx: 500, cy: 470, s: 1.3 },
      parts: [
        { lvl: 3, soon: true, cx: 690, cy: 404, s: 0.72, dx: 0.45, dy: -0.9, back: true },
        { lvl: 1, soon: true, cx: 226, cy: 524, s: 0.8, dx: -0.16, dy: 1 },
        { lvl: 2, soon: true, cx: 778, cy: 518, s: 0.8, dx: 0.16, dy: 1 },
      ] },
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
  let bare = false;                                   // true — рисуем остров без земли (для острова раздела)
  const under = (cx = 200, w = 175, h = 56) => bare ? '' : `<path d="M${cx - w} 226 Q${cx - w + 14} ${226 + h} ${cx - 30} ${226 + h * 1.15} Q${cx} ${226 + h * 1.5} ${cx + 30} ${226 + h * 1.15} Q${cx + w - 14} ${226 + h} ${cx + w} 226Z" fill="url(#gUnder)" stroke="#33271d" stroke-width="3" stroke-linejoin="round"/><path d="M${cx - 60} 240 l6 14 M${cx + 10} 246 l5 16 M${cx + 70} 238 l-4 12" stroke="#33271d" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`;
  const grass = (cx = 200, w = 175) => bare ? '' : `<ellipse cx="${cx}" cy="226" rx="${w}" ry="34" fill="url(#gGrass)" stroke="#2f6e33" stroke-width="3"/>`;
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
      <clipPath id="cvClip"><path d="M185.5 227 Q185.5 198 205 198 Q224.5 198 224.5 227Z"/></clipPath>
      <g clip-path="url(#cvClip)"><g opacity=".6" transform="translate(205 227) scale(.44) translate(-205 -227)">
        <ellipse cx="205" cy="224" rx="17" ry="13" fill="#7f1d1d"/><ellipse cx="205" cy="228" rx="8.5" ry="4" fill="#f472b6"/>
        <circle class="cvb" cx="205" cy="216" r="4.4" fill="#f97316" stroke="#17100f" stroke-width="1.2"/>
        <g class="cvu"><path d="M184 196 H226 V200 L222.500 200 L219 212 L215.500 200 L212 200 L208.500 213 L205 200 L201.500 200 L198 213 L194.500 200 L191 200 L187.500 212 L184 200Z" fill="#fff" stroke="#17100f" stroke-width="1.2" stroke-linejoin="round"/></g>
        <g class="cvd"><path d="M184 231 H226 V227 L222.500 227 L219 216 L215.500 227 L212 227 L208.500 215 L205 227 L201.500 227 L198 215 L194.500 227 L191 227 L187.500 216 L184 227Z" fill="#fff" stroke="#17100f" stroke-width="1.2" stroke-linejoin="round"/></g>
      </g></g>
      <g class="shk">${pine(132, 228, .95)}${pine(154, 233, .78, '#3aa05a')}</g>${palm(171, 234, .8)}${pine(300, 228, .85)}${pine(328, 224, 1.05, '#2a8248')}${pine(352, 226, .7)}
      ${cloud(300, 78, .8, .9)}
      <g class="zapc"><g transform="translate(80 78) scale(.85)"><path d="M-46 0 Q-62 0 -58 -14 Q-54 -26 -40 -22 Q-36 -42 -14 -38 Q-2 -54 18 -40 Q40 -44 42 -22 Q62 -20 58 -4 Q56 4 44 4Z" fill="#6a739f" stroke="#3c4470" stroke-width="2.6" stroke-linejoin="round"/></g></g>
      <g class="zap" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="142" cy="156" r="18" fill="#fff6b0" stroke="none" opacity=".75"/>
        <polyline points="82,88 96,108 85,110 110,134 99,136 142,156" stroke="#ffd23d" stroke-width="9" opacity=".55"/><polyline points="82,88 96,108 85,110 110,134 99,136 142,156" stroke="#fffbe0" stroke-width="3.6"/></g></svg>`,
    l2: () => `<svg viewBox="0 0 400 300" aria-hidden="true">${defs}${under(200, 170)}${grass(200, 170)}
      <g stroke="#2b2f3f" stroke-width="3" stroke-linejoin="round">
        <rect x="138" y="64" width="24" height="108" fill="#8d8478"/><rect x="138" y="64" width="24" height="9" fill="#5d564f"/><rect x="138" y="96" width="24" height="7" fill="#5d564f"/>
        <rect x="170" y="84" width="22" height="88" fill="#8d8478"/><rect x="170" y="84" width="22" height="8" fill="#5d564f"/><rect x="170" y="112" width="22" height="7" fill="#5d564f"/>
        <rect x="104" y="150" width="104" height="78" fill="#5f6f90"/>
        <rect x="110" y="192" width="22" height="36" rx="3" fill="#2c3040"/><path d="M118 168 h18 v14 h-18z M146 168 h18 v14 h-18z M174 168 h18 v14 h-18z" fill="#a9d4f0" stroke-width="2.4"/>
        <path d="M196 120 L256 78 L316 120Z" fill="#3d4766"/>
        <rect x="198" y="118" width="116" height="110" fill="#a3abbd"/>
        <rect x="214" y="132" width="84" height="16" fill="#cfe4f5" stroke-width="2.4"/><path d="M228 132 v16 M242 132 v16 M256 132 v16 M270 132 v16 M284 132 v16" stroke-width="2" fill="none"/>
        <rect x="236" y="178" width="40" height="50" rx="3" fill="#586079"/><path d="M256 178 v50" stroke-width="2.4"/>
        <path d="M314 150 L352 176 L352 228 L314 228Z" fill="#6c86ad"/><path d="M322 164 l22 15 M322 184 l22 15" stroke="#b9dcf4" stroke-width="3" fill="none"/>
        <rect x="346" y="106" width="9" height="86" fill="#c4ccd8"/><rect x="342" y="102" width="17" height="7" rx="2" fill="#aab3c3"/>
        <rect x="200" y="94" width="14" height="24" fill="#8d8478"/>
      </g>
      ${gear(224, 202, 9, '#c9d0de')}${gear(290, 202, 7, '#c9d0de')}
      <g class="smoke"><circle class="pf p1" cx="150" cy="60" r="9"/><circle class="pf p2" cx="150" cy="60" r="9"/><circle class="pf p3" cx="150" cy="60" r="9"/><circle class="pf p1" cx="181" cy="80" r="8"/><circle class="pf p3" cx="181" cy="80" r="8"/></g>
      <rect x="60" y="222" width="280" height="9" rx="3" fill="#3a3d4c" stroke="#23252f" stroke-width="2.4"/>
      <g stroke="#6a4d27" stroke-width="2.4" stroke-linejoin="round">
        <rect class="bxA" x="112.5" y="206" width="17" height="16" fill="#d9a85d"/>
        <rect class="bxB" x="247.5" y="206" width="17" height="16" fill="#d9a85d"/>
      </g>
      <clipPath id="cpL"><rect x="46" y="194" width="154" height="46"/></clipPath><clipPath id="cpR"><rect x="200" y="194" width="154" height="46"/></clipPath>
      <g stroke="#2b2f3f" stroke-width="2.6" stroke-linejoin="round">
        <g clip-path="url(#cpL)"><g class="pst pst-l"><rect x="-32" y="210" width="122" height="10" fill="#aab3c3"/><rect x="90" y="198" width="15" height="34" rx="3" fill="#e8b923"/><path d="M92 204 l11 -3 M92 214 l11 -3 M92 224 l11 -3" stroke="#2b2f3f" stroke-width="3" fill="none"/></g></g>
        <g clip-path="url(#cpR)"><g class="pst pst-r"><rect x="310" y="210" width="122" height="10" fill="#aab3c3"/><rect x="295" y="198" width="15" height="34" rx="3" fill="#e8b923"/><path d="M297 204 l11 -3 M297 214 l11 -3 M297 224 l11 -3" stroke="#2b2f3f" stroke-width="3" fill="none"/></g></g>
        <rect x="44" y="198" width="34" height="36" rx="5" fill="#7b8396"/><rect x="322" y="198" width="34" height="36" rx="5" fill="#7b8396"/>
        <circle cx="61" cy="216" r="7" fill="#5c6478"/><circle cx="339" cy="216" r="7" fill="#5c6478"/>
      </g>
      <g class="psp" fill="#ffe27a" stroke="none"><circle cx="200" cy="206" r="9"/><path d="M200 192 l3 8 l9 -3 l-6 8 l9 3 l-10 2 l2 9 l-7 -7 l-7 7 l1 -9 l-10 -2 l9 -3 l-6 -8 l9 3z" fill="#fff6b0"/></g>
      ${cloud(70, 48, .75, .95)}<g class="snow" fill="#fff" opacity=".9"><circle cx="52" cy="76" r="2.2"/><circle cx="72" cy="82" r="2"/><circle cx="90" cy="74" r="2.2"/><circle cx="62" cy="90" r="1.8"/><circle cx="82" cy="94" r="1.8"/></g>
      ${pine(52, 238, .65)}${pine(356, 238, .65, '#3aa05a')}
      <g stroke="#6a4d27" stroke-width="2.6" stroke-linejoin="round"><g class="bxC"><rect x="187" y="198" width="26" height="24" fill="#e2b266"/><path d="M187 207 h26 M200 198 v9" fill="none" stroke-width="2"/></g></g>
      <g transform="translate(285 62)"><g class="hel"><line x1="0" y1="14" x2="0" y2="40" stroke="#33384a" stroke-width="2.2"/><path d="M-4 40 q4 7 8 0" fill="none" stroke="#33384a" stroke-width="2.6" stroke-linecap="round"/>${(((MG.tools && MG.tools.icon && MG.tools.icon('heli')) || '').replace('<svg ', '<svg x="-21" y="-24" width="42" height="42" '))}</g></g></svg>`,
    l3: () => `<svg viewBox="0 0 400 300" aria-hidden="true">${defs}<circle cx="120" cy="140" r="110" fill="url(#gSun)"/>${under(200, 178)}
      ${bare ? '' : '<ellipse cx="200" cy="226" rx="178" ry="32" fill="#a5753f" stroke="#5e3f1e" stroke-width="3"/>'}
      <path d="M70 228 L112 128 L136 150 L164 62 L190 120 L198 150 L200 228Z" fill="url(#gRock)" stroke="#4a4140" stroke-width="3" stroke-linejoin="round"/>
      <path d="M164 62 L190 120 L198 150 L200 228 L168 228 L168 110Z" fill="#3b2f35" opacity=".3"/>
      <path d="M252 228 L254 110 L286 28 L322 110 L344 228Z" fill="url(#gRock)" stroke="#4a4140" stroke-width="3" stroke-linejoin="round"/>
      <path d="M286 28 L322 110 L344 228 L290 228 L294 120Z" fill="#3b2f35" opacity=".3"/>
      <path d="M174 104 L192 104 L192 114 L186 124 L178 114Z" fill="#7a6a5e" stroke="#4a4140" stroke-width="2.2" stroke-linejoin="round"/><path d="M252 104 L296 104 L296 116 L262 120 L252 114Z" fill="#7a6a5e" stroke="#4a4140" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M292 112 L350 112 L347 126 L338 142 L333 164 L312 164 L316 132Z" fill="url(#gRock)" stroke="#4a4140" stroke-width="2.4" stroke-linejoin="round"/><path d="M336 118 L330 146 L326 164 L333 164 L338 142 L347 126Z" fill="#3b2f35" opacity=".3"/>
      <g class="castle" stroke="#4a3a33" stroke-width="2" stroke-linejoin="round">
        <path d="M286 100 L346 100 L350 112 L296 118Z" fill="#7a6a5e"/>
        <path d="M294 100 L338 100 L342 90 L290 90Z" fill="#9a8a7c"/>
        <rect x="296" y="72" width="40" height="19" fill="#d9c9a8"/>
        <rect x="302" y="38" width="22" height="53" fill="#e6d7b6"/>
        <path d="M299 40 L313 14 L327 40Z" fill="#c4553b"/>
        <path d="M313 14 v-8" stroke-width="2.2"/><path d="M313 6 l8 3 l-8 3z" fill="#f2c94c" stroke-width="1.4"/>
        <rect x="299" y="38" width="28" height="4" fill="#cdbb95"/>
        <path d="M307 60 v-9 a3 3 0 0 1 6 0 v9z M315 60 v-9 a3 3 0 0 1 6 0 v9z" fill="#5b4a6e" stroke-width="1.4"/>
        <path d="M298 91 v-9 a5 5 0 0 1 10 0 v9z" fill="#3a2a14" stroke-width="1.6"/><path d="M311 84 v-6 a2.5 2.5 0 0 1 5 0 v6z M318 84 v-6 a2.5 2.5 0 0 1 5 0 v6z M327 84 v-6 a2.5 2.5 0 0 1 5 0 v6z" fill="#5b4a6e" stroke-width="1.2"/>
        <rect x="330" y="52" width="12" height="39" fill="#d9c9a8"/><path d="M328 54 L336 36 L344 54Z" fill="#c4553b"/>
        <rect x="334" y="64" width="4" height="9" rx="2" fill="#5b4a6e" stroke-width="1.2"/>
      </g>
      <g fill="#8a7d77" stroke="#4a4140" stroke-width="2"><path d="M104 232 l8 -9 l12 5 l-2 10z"/></g>
      ${gear(224, 64, 11, '#b79cf0')}
      <g stroke="#3a2a14" stroke-width="2.6" stroke-linejoin="round">
        
        <g class="leaf lf-l" style="transform-origin:190px 104px"><rect x="190" y="98" width="36" height="9" rx="2" fill="#c98f4a"/><path d="M199 98 v9 M208 98 v9 M217 98 v9" stroke-width="1.6" fill="none"/></g>
        <g class="leaf lf-r" style="transform-origin:258px 104px"><rect x="222" y="98" width="36" height="9" rx="2" fill="#c98f4a"/><path d="M231 98 v9 M240 98 v9 M249 98 v9" stroke-width="1.6" fill="none"/></g>
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

  /* кусок «Уравнения» для острова раздела: только фиолетовый луч (тот самый «=», что встаёт
   * барьером в режиме «Перенос через =»). Остров «Уравнения» ещё в разработке. */
  ART.beam = () => {
    let sp = '';
    for (let i = 0; i < 9; i++) sp += `<circle class="bm-sp" cx="${186 + (i * 37) % 30}" cy="${210 - (i * 23) % 40}" r="${2.2 + (i % 3) * 0.9}" style="animation-delay:${(-i * 0.47).toFixed(2)}s"/>`;
    let st = '';
    for (let y = -330; y < 236; y += 26) st += `<rect x="186" y="${y}" width="28" height="4" rx="2"/>`;
    return `<svg viewBox="0 0 400 300" aria-hidden="true">${defs}
      <linearGradient id="bmBar" gradientUnits="userSpaceOnUse" x1="0" y1="-330" x2="0" y2="226"><stop offset="0" stop-color="#c4b5fd" stop-opacity="0"/><stop offset=".35" stop-color="#a78bfa"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>
      <linearGradient id="bmGlow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a78bfa" stop-opacity="0"/><stop offset=".5" stop-color="#c4b5fd" stop-opacity=".75"/><stop offset="1" stop-color="#a78bfa" stop-opacity="0"/></linearGradient>
      <linearGradient id="bmFade" gradientUnits="userSpaceOnUse" x1="0" y1="-330" x2="0" y2="226"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".4" stop-color="#fff" stop-opacity="1"/></linearGradient>
      <mask id="bmMask"><rect x="150" y="-340" width="100" height="580" fill="url(#bmFade)"/></mask>
      <clipPath id="bmClip"><rect x="186" y="-330" width="28" height="556"/></clipPath>
      ${under(200, 118, 46)}${grass(200, 118)}
      ${pine(118, 230, 0.62, '#3aa05a')}${pine(286, 231, 0.55)}
      <ellipse class="bm-pool" cx="200" cy="222" rx="44" ry="11" fill="#8b5cf6"/>
      <g mask="url(#bmMask)">
        <rect x="140" y="-330" width="120" height="556" fill="url(#bmGlow)" class="bm-glow"/>
        <rect x="186" y="-330" width="28" height="556" fill="#a78bfa" opacity=".16"/>
        <g clip-path="url(#bmClip)"><g class="bm-st" fill="#ddd6fe" opacity=".45">${st}</g></g>
        <rect x="174" y="-330" width="13" height="556" rx="6.5" fill="url(#bmBar)" stroke="#4c1d95" stroke-width="2.4"/>
        <rect x="213" y="-330" width="13" height="556" rx="6.5" fill="url(#bmBar)" stroke="#4c1d95" stroke-width="2.4"/>
      </g>
      <g fill="#ede9fe">${sp}</g>
      <path d="M168 224 Q168 212 182 212 L218 212 Q232 212 232 224Z" fill="#6b5f5b" stroke="#3b2f35" stroke-width="3" stroke-linejoin="round"/>
      <path d="M176 218 h16 M208 218 h16" stroke="#c4b5fd" stroke-width="3" stroke-linecap="round"/></svg>`;
  };


  /* остров I раздела «Десятичные дроби»: стройка. Кран забирает числа из-за острова целиком,
   * держа их за запятую-ручку, и кладёт на строительные леса: сначала зелёное 2,74, потом сверху красное 12,1
   * (запятая точно над запятой). Пустые разряды становятся нулями — овальными окнами. Потом справа налево,
   * разряд за разрядом, из-под лесов выкатывается ответ 14,84 — фундамент. Леса убирают, ручки исчезают,
   * появляются две крыши: целая и дробная части — два дома. Шар-баба их сносит, и всё сначала.
   * Вся анимация — CSS-кадры одного цикла (CR.T), координаты в единицах острова 400×300. */
  const CR = (() => {
    const T = 18, S = 26, C = 14, X0 = 40;
    const colX = [X0, X0 + S, X0 + 2 * S, X0 + 2 * S + C, X0 + 3 * S + C];   // десятки, единицы, запятая, десятые, сотые
    const AX = X0 + 2 * S + C / 2, R = colX[4] + S;                    // ось запятой — за неё держит крюк; правый край дома
    const FY = 198, GY = 172, RY = 146;                                // верх фундамента (лесов), зелёного и красного слоя
    const PICK = 222, PICKY = 216, CARRY = 84, BALLX = 175;            // где кран берёт числа (за островом), высота переноса
    const kf = (name, fr) => `@keyframes ${name} { ${fr.map(([p, v]) => `${p}% { ${v} }`).join(' ')} }`;
    const a = (rowTop) => rowTop + S - 15;                             // кончик крюка — над головкой запятой
    /* крюк: [%, x, y кончика] */
    const hook = [[0, PICK, a(PICKY)], [4, PICK, a(PICKY)], [12, PICK, a(CARRY)], [20, AX, a(CARRY)], [27, AX, a(GY)], [30, AX, a(GY)],
      [36, AX, a(CARRY)], [41, PICK, a(CARRY)], [45, PICK, a(PICKY)], [51, PICK, a(CARRY)], [58, AX, a(CARRY)], [64, AX, a(RY)], [66, AX, a(RY)],
      [71, AX, a(CARRY)], [96, AX, a(CARRY)], [96.1, PICK, a(CARRY)], [100, PICK, a(PICKY)]];
    const trolley = [[0, PICK], [12, PICK], [20, AX], [36, AX], [41, PICK], [51, PICK], [58, AX], [84, AX], [88, BALLX], [96, BALLX], [97, PICK], [100, PICK]];
    const load = (home, from, to) => [[0, `transform: translate(${PICK - AX}px, ${PICKY - home}px);`],
      ...hook.filter((h) => h[0] >= from && h[0] <= to).map(([p, x, y]) => [p, `transform: translate(${x - AX}px, ${y - a(home)}px);`]),
      [99.8, 'transform: translate(0px, 0px);'], [100, `transform: translate(${PICK - AX}px, ${PICKY - home}px);`]];
    /* разлёт при ударе шара (91%), перед ним — свой выход блока (pre) */
    const HIT = 91;
    const boom = (i, pre) => {
      const dx = -(50 + ((i * 37) % 70)), dy = -(30 + ((i * 53) % 60)), r = ((i * 71) % 140) - 70;
      return kf(`crB${i}`, [...(pre || [[0, 'opacity: 1; transform: none;']]), [HIT, 'opacity: 1; transform: none;'],
        [HIT + 3, `opacity: 1; transform: translate(${dx * 0.7}px, ${dy}px) rotate(${r * 0.6}deg);`],
        [HIT + 6, `opacity: 0; transform: translate(${dx}px, ${dy + 70}px) rotate(${r}deg);`], [100, `opacity: 0; transform: translate(${dx}px, ${dy + 70}px) rotate(${r}deg);`]]);
    };
    const pop = (p) => [[0, 'opacity: 0; transform: scale(.2);'], [p, 'opacity: 0; transform: scale(.2);'], [p + 2.5, 'opacity: 1; transform: scale(1.15);'], [p + 4, 'opacity: 1; transform: scale(1);']];
    /* разряд ответа сползает сверху вниз — из своего столбика верхних чисел в фундамент */
    const drop = (p) => {
      const d = RY - FY;
      return [[0, `opacity: 0; transform: translateY(${d}px) scale(.85);`], [p, `opacity: 0; transform: translateY(${d}px) scale(.85);`],
        [p + 0.8, `opacity: 1; transform: translateY(${d}px) scale(1.05);`], [p + 3, 'opacity: 1; transform: translateY(1px) scale(1);'],
        [p + 3.4, 'opacity: 1; transform: translateY(-2px) scale(1);'], [p + 3.8, 'opacity: 1; transform: none;']];
    };
    const base = `.cr-tro { animation: crTro ${T}s linear infinite; } .cr-hk { animation: crHk ${T}s ease-in-out infinite, crHkO ${T}s linear infinite; }
      .cr-g { animation: crG ${T}s ease-in-out infinite; } .cr-r { animation: crR ${T}s ease-in-out infinite; }
      .cr-hd { animation: crHd ${T}s linear infinite; } .cr-sc { transform-box: fill-box; transform-origin: 50% 100%; animation: crSc ${T}s ease-in-out infinite; }
      .cr-ball { transform-box: view-box; transform-origin: 0 0; animation: crBall ${T}s ease-in-out infinite; }
      .cr-bk { transform-box: fill-box; transform-origin: 50% 50%; } .cr-bk.rf { transform-origin: 50% 100%; }
      .cr-dust { transform-box: fill-box; transform-origin: center; opacity: 0; animation: crDust ${T}s ease-out infinite; }
      .cr-sp { transform-box: fill-box; transform-origin: center; opacity: 0; animation: crSp ${T}s ease-out infinite; }
      ${kf('crTro', trolley.map(([p, x]) => [p, `transform: translateX(${x}px);`]))}
      ${kf('crHk', hook.map(([p, x, y]) => [p, `transform: translate(${x}px, ${y}px);`]))}
      ${kf('crHkO', [[0, 'opacity: 1;'], [85, 'opacity: 1;'], [86, 'opacity: 0;'], [96.5, 'opacity: 0;'], [98, 'opacity: 1;'], [100, 'opacity: 1;']])}
      ${kf('crG', load(GY, 4, 30))} ${kf('crR', load(RY, 45, 66))}
      ${kf('crHd', [[0, 'opacity: 1;'], [82, 'opacity: 1;'], [84, 'opacity: 0;'], [99.8, 'opacity: 0;'], [100, 'opacity: 1;']])}
      ${kf('crSc', [[0, 'opacity: 1; transform: none;'], [80, 'opacity: 1; transform: none;'], [82.5, 'opacity: 0; transform: scaleY(.2);'], [98, 'opacity: 0; transform: scaleY(.2);'], [100, 'opacity: 1; transform: none;']])}
      ${kf('crBall', [[0, `opacity: 0; transform: translate(${BALLX}px, 40px) rotate(-60deg);`], [86, `opacity: 0; transform: translate(${AX}px, 40px) rotate(0deg);`], [88, `opacity: 1; transform: translate(${BALLX}px, 40px) rotate(-60deg);`],
        [HIT, `opacity: 1; transform: translate(${BALLX}px, 40px) rotate(0deg); animation-timing-function: ease-out;`], [HIT + 2, `opacity: 1; transform: translate(${BALLX}px, 40px) rotate(8deg);`], [HIT + 4, `opacity: 1; transform: translate(${BALLX}px, 40px) rotate(-22deg);`],
        [HIT + 6, `opacity: 0; transform: translate(${BALLX}px, 40px) rotate(-10deg);`], [100, `opacity: 0; transform: translate(${BALLX}px, 40px) rotate(-60deg);`]])}
      ${kf('crDust', [[0, 'opacity: 0; transform: scale(.3);'], [HIT - 0.1, 'opacity: 0; transform: scale(.3);'], [HIT + 0.5, 'opacity: .95; transform: scale(.8);'], [HIT + 6, 'opacity: 0; transform: scale(2.2);'], [100, 'opacity: 0; transform: scale(2.2);']])}
      ${kf('crSp', [[0, 'opacity: 0; transform: scale(.3);'], [84, 'opacity: 0; transform: scale(.3);'], [86, 'opacity: 1; transform: scale(1.3) rotate(45deg);'], [90, 'opacity: 0; transform: scale(1.6) rotate(90deg);'], [100, 'opacity: 0;']])}
      @media (prefers-reduced-motion: reduce) { .cr-tro, .cr-hk, .cr-g, .cr-r, .cr-hd, .cr-sc, .cr-bk, .cr-dust, .cr-sp, .cr-ball { animation: none !important; } .cr-ball, .cr-hd, .cr-hk, .cr-dust, .cr-sp, .cr-sc { display: none; } }`;
    let nb = 0, extra = '';
    /* блок, который разлетается от шара; pre — как он появляется (по умолчанию виден всегда) */
    const bk = (inner, pre, cls = '') => { const i = nb++; extra += boom(i, pre); return `<g class="cr-bk${cls ? ' ' + cls : ''}" style="animation: crB${i} ${T}s ease-in-out infinite">${inner}</g>`; };
    return { T, S, C, colX, AX, R, FY, GY, RY, bk, pop, drop, css: () => base + extra, reset: () => { nb = 0; extra = ''; } };
  })();
  const crStyle = document.createElement('style');
  document.head.append(crStyle);
  ART.crane = () => {
    CR.reset();
    const { S, colX, AX, R, FY, GY, RY, bk, pop, drop } = CR;
    const L = colX[0];
    const cell = (col, y, edge, inner) => { const x = colX[col]; return `<rect x="${x + 1.2}" y="${y + 1.2}" width="${S - 2.4}" height="${S - 2.4}" rx="3.5" fill="#efe9dd" stroke="${edge}" stroke-width="3"/>${inner(x)}`; };
    const digit = (col, y, ch, edge, txt) => cell(col, y, edge, (x) => `<text x="${x + S / 2}" y="${y + S / 2 + 7}" text-anchor="middle" font-family="Nunito,system-ui,sans-serif" font-weight="900" font-size="20" fill="${txt}">${ch}</text>`);
    const zero = (col, y, edge) => cell(col, y, edge, (x) => `<ellipse cx="${x + S / 2}" cy="${y + S / 2}" rx="6.2" ry="9" fill="#a9d4f0" stroke="#4a4f5c" stroke-width="2"/><path d="M${x + S / 2 - 2.5} ${y + S / 2 - 4} q1 -3 3 -3.4" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);
    /* запятая — обычная запятая между разрядами; за её головку и берётся крюк крана */
    const comma = (y, col) => `<circle cx="${AX}" cy="${y + S - 9}" r="5" fill="${col}"/><path d="M${AX + 4.4} ${y + S - 8} q0.6 7 -6 10.5" fill="none" stroke="${col}" stroke-width="3.6" stroke-linecap="round"/>`;
    const roof = (x1, x2) => `<path d="M${x1 - 4} ${RY} L${(x1 + x2) / 2} ${RY - 24} L${x2 + 4} ${RY}Z" fill="#e0663d" stroke="#5a2a1a" stroke-width="2.6" stroke-linejoin="round"/><path d="M${(x1 + x2) / 2 - 5} ${RY - 9} h10 v7 h-10z" fill="#a9d4f0" stroke="#5a2a1a" stroke-width="1.6"/>`;
    const layer = (cls, y, chars, edge, txt) => `<g class="${cls}">
      ${chars.map((ch, col) => (ch === null ? '' : bk(digit(col, y, ch, edge, txt)))).join('')}
      <g class="cr-hd">${comma(y, '#3b3f4a')}</g></g>`;
    /* строительные леса под слоями: стойки, настил, раскосы */
    let sc = `<rect x="${L - 6}" y="${FY - 3}" width="${R - L + 12}" height="5" rx="1.5" fill="#c98f4a" stroke="#6b4423" stroke-width="1.8"/>`;
    for (let x = L - 2; x <= R + 2; x += (R - L + 4) / 4) sc += `<rect x="${x - 2}" y="${FY + 2}" width="4" height="${S - 2}" fill="#9aa1ad" stroke="#4a4f5c" stroke-width="1.4"/>`;
    for (let i = 0; i < 4; i++) { const x1 = L - 2 + i * (R - L + 4) / 4, x2 = x1 + (R - L + 4) / 4; sc += `<path d="M${x1} ${FY + S - 2} L${x2} ${FY + 3}" stroke="#9aa1ad" stroke-width="2"/>`; }
    /* фундамент — ответ 14,84: разряды сползают из столбиков сверху вниз, справа налево (сотые → десятки) */
    const F = [[4, '4', 69], [3, '8', 71.2], [2, ',', 73.4], [1, '4', 75.6], [0, '1', 77.8]];
    const found = F.map(([col, ch, p]) => bk(ch === ',' ? comma(FY, '#3b3f4a')
      : cell(col, FY, '#6b7080', (x) => `<rect x="${x + 1.2}" y="${FY + 1.2}" width="${S - 2.4}" height="${S - 2.4}" rx="3.5" fill="#c9ccd3"/><text x="${x + S / 2}" y="${FY + S / 2 + 7}" text-anchor="middle" font-family="Nunito,system-ui,sans-serif" font-weight="900" font-size="20" fill="#2f333d">${ch}</text>`),
      drop(p))).join('');
    let tower = '';
    const TX = 262, TW = 22, TT = 44;
    for (let y = TT; y < 216; y += 16) tower += `M${TX} ${y} L${TX + TW} ${y + 16} M${TX + TW} ${y} L${TX} ${y + 16} `;
    const truss = (x1, x2, yt, yb) => {
      let z = '';
      for (let x = x1; x < x2 - 1; x += 12) z += `M${x} ${yb} L${x + 6} ${yt} L${x + 12} ${yb} `;
      return `<path d="${z}" stroke="#2f6fc4" stroke-width="2.2" fill="none"/><path d="M${x1} ${yt} H${x2} M${x1} ${yb} H${x2}" stroke="#1d4f8f" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
    };
    const cone = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-7 0 L-2.5 -19 L2.5 -19 L7 0Z" fill="#f97316" stroke="#7c2d12" stroke-width="1.8" stroke-linejoin="round"/><path d="M-5 -7 H5 M-3.6 -13 H3.6" stroke="#fff" stroke-width="2.8"/><rect x="-9.5" y="-1" width="19" height="3.5" rx="1" fill="#7c2d12"/></g>`;
    const svg = `<svg viewBox="0 0 400 300" aria-hidden="true">${defs}${under()}${grass()}
      <clipPath id="crCable"><rect x="-200" y="40" width="800" height="400"/></clipPath>
      <clipPath id="crBack"><path d="M-200 -400 H600 V226 H375 A175 34 0 0 0 25 226 H-200Z"/><rect x="-200" y="-400" width="${R + 202}" height="660"/></clipPath>
      <ellipse cx="170" cy="228" rx="140" ry="20" fill="#dcbb80" stroke="#a7834a" stroke-width="2.4"/>
      <rect x="${L - 8}" y="${FY + S}" width="${R - L + 16}" height="5" rx="2" fill="#9aa1ad" stroke="#4a4f5c" stroke-width="2"/>
      <g stroke-linejoin="round">
        <path d="M${TX - 12} 230 L${TX} 216 H${TX + TW} L${TX + TW + 12} 230Z" fill="#2f6fc4" stroke="#1d4f8f" stroke-width="2.6"/>
        <path d="${tower}" stroke="#2f6fc4" stroke-width="2" fill="none"/>
        <rect x="${TX}" y="${TT}" width="${TW}" height="${216 - TT}" fill="none" stroke="#1d4f8f" stroke-width="3.2"/>
        <path d="M${TX + TW + 6} 216 V70 M${TX + TW + 14} 216 V70 ${Array.from({ length: 10 }, (_, i) => `M${TX + TW + 6} ${80 + i * 14} h8`).join(' ')}" stroke="#8a93a6" stroke-width="1.6"/>
      </g>
      <g class="cr-sc">${sc}</g>
      <g clip-path="url(#crBack)">
        ${layer('cr-g', GY, [null, '2', null, '7', '4'], '#3f9a45', '#2f7a35')}
        ${layer('cr-r', RY, ['1', '2', null, '1', null], '#d0473d', '#b8322a')}
      </g>
      ${found}
      ${bk(zero(0, GY, '#3f9a45'), pop(66))}${bk(zero(4, RY, '#d0473d'), pop(66.5))}
      ${bk(roof(colX[0], colX[1] + S), pop(83), 'rf')}${bk(roof(colX[3], colX[4] + S), pop(83.6), 'rf')}
      <g fill="#fff6b0" stroke="#d99a0b" stroke-width="1.6"><path class="cr-sp" d="M${colX[1]} ${RY - 30} l2.5 -6 l2.5 6 l6 2.5 l-6 2.5 l-2.5 6 l-2.5 -6 l-6 -2.5Z"/><path class="cr-sp" d="M${colX[4]} ${RY - 26} l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2Z"/></g>
      <g stroke-linejoin="round">
        ${truss(70, TX + 6, 22, 34)}${truss(TX + 16, 362, 24, 34)}
        <path d="M${TX + 5} 22 L${TX + 11} -6 L${TX + 17} 22Z" fill="#2f6fc4" stroke="#1d4f8f" stroke-width="2.4"/>
        <path d="M${TX + 11} -6 L70 22 M${TX + 11} -6 L362 24" stroke="#4a4f5c" stroke-width="1.5" fill="none"/>
        <rect x="334" y="34" width="28" height="22" rx="2" fill="#9aa1ad" stroke="#4a4f5c" stroke-width="2.4"/><path d="M334 45 h28" stroke="#4a4f5c" stroke-width="1.4"/>
        <rect x="${TX + TW}" y="34" width="26" height="24" rx="3.5" fill="#3f84d8" stroke="#1d4f8f" stroke-width="2.4"/><rect x="${TX + TW + 4}" y="38" width="17" height="11" rx="2" fill="#cfe4f5" stroke="#1d4f8f" stroke-width="1.6"/>
        <rect x="${TX - 4}" y="34" width="${TW + 8}" height="10" rx="2" fill="#2f6fc4" stroke="#1d4f8f" stroke-width="2.2"/>
      </g>
      <g class="cr-tro"><rect x="-10" y="32" width="20" height="8" rx="2" fill="#4a4f5c"/></g>
      <g clip-path="url(#crCable)"><g clip-path="url(#crBack)"><g class="cr-hk">
        <path d="M0 -320 V-6" stroke="#33384a" stroke-width="1.8"/>
        <path d="M-5 -8 h10 l-2 5 h-6Z" fill="#e8b923" stroke="#4a4f5c" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M0 -3 v2 q0 5 -4 5" fill="none" stroke="#4a4f5c" stroke-width="2.2" stroke-linecap="round"/>
      </g></g></g>
      <g class="cr-ball"><path d="M0 0 V131" stroke="#4a4f5c" stroke-width="2.4" stroke-dasharray="4 2"/><circle cx="0" cy="145" r="15" fill="#5b616e" stroke="#2b2f3a" stroke-width="2.6"/><circle cx="-5" cy="139" r="4.5" fill="#fff" opacity=".35"/></g>
      ${[0, 1, 2, 3].map((i) => `<circle class="cr-dust" cx="${colX[4] + 22 - i * 9}" cy="${GY - 2 + (i % 2) * 18}" r="${9 + i * 2}" fill="#e7dcc6" stroke="#b9a882" stroke-width="1.6"/>`).join('')}
      ${cone(14, 240, 0.9)}${cone(216, 238)}${cone(236, 244, 0.8)}
      <g stroke="#6a4d27" stroke-width="2.2" stroke-linejoin="round"><rect x="306" y="212" width="30" height="18" rx="1.5" fill="#d9a85d"/><path d="M306 221 h30 M321 212 v18" fill="none" stroke-width="1.5"/>
        <rect x="338" y="202" width="26" height="28" rx="1.5" fill="#c9954d"/><path d="M338 216 h26" fill="none" stroke-width="1.5"/></g>
      ${pine(378, 232, 0.62, '#3aa05a')}
      ${cloud(60, 70, 0.5, 0.85)}</svg>`;
    crStyle.textContent = CR.css();
    return svg;
  };

  /* остров раздела целиком: основа + куски подразделов (вложенные SVG островов).
   * Землю (низ острова и верх: трава/песок) рисуем отдельно от построек: у оторванного куска своя земля
   * с обводкой, а прикреплённые куски сливаются с основой в одну монолитную землю — обводка только
   * по внешнему контуру (сначала все обводки, потом все заливки поверх). */
  const uid = (s, p) => s.replace(/id="([^"]+)"/g, `id="${p}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`);
  const nest = (art, cx, cy, s, p) => {
    bare = true;
    let svg;
    try { svg = ART[art](); } finally { bare = false; }
    return uid(svg, p).replace('<svg viewBox="0 0 400 300" aria-hidden="true">',
      `<svg x="${cx - 200 * s}" y="${cy - 226 * s}" width="${400 * s}" height="${300 * s}" viewBox="0 0 400 300" overflow="visible">`);
  };
  /* земля островов: ширина, глубина низа, верх (трава или песок) — как в ART */
  const GROUND = { l1: { w: 175, h: 56 }, l2: { w: 170, h: 56 }, l3: { w: 178, h: 56, ry: 32, top: 'sand' }, l4: { w: 150, h: 64 }, beam: { w: 118, h: 46 }, crane: { w: 175, h: 56 } };
  const TOPC = { grass: ['#2f6e33'], sand: ['#5e3f1e', '#a5753f'] };
  const underD = (w, h) => `M${200 - w} 226 Q${200 - w + 14} ${226 + h} 170 ${226 + h * 1.15} Q200 ${226 + h * 1.5} 230 ${226 + h * 1.15} Q${200 + w - 14} ${226 + h} ${200 + w} 226Z`;
  const STAR4 = 'M0 -14 L4 -4 L14 0 L4 4 L0 14 L-4 4 L-14 0 L-4 -4Z';
  function sectionSvg(sec, si) {
    const P = `s${si}`, B = sec.base;
    const at = (pc) => `translate(${(pc.cx - 200 * pc.s).toFixed(1)} ${(pc.cy - 226 * pc.s).toFixed(1)}) scale(${pc.s})`;
    const G = (pc) => GROUND[pc.art] || GROUND.l1;
    const topFill = (pc) => (G(pc).top === 'sand' ? TOPC.sand[1] : `url(#${P}gr)`);
    const topStroke = (pc) => (G(pc).top === 'sand' ? TOPC.sand[0] : TOPC.grass[0]);
    const cracks = `<path d="M140 240 l6 14 M210 246 l5 16 M270 238 l-4 12" stroke="#33271d" stroke-width="2.4" stroke-linecap="round" opacity=".5" fill="none"/>`;
    /* своя земля оторванного куска (с обводкой, едет вместе с ним) */
    const own = (pc) => `<g class="sx-own" transform="${at(pc)}"><path d="${underD(G(pc).w, G(pc).h)}" fill="url(#${P}un)" stroke="#33271d" stroke-width="3" stroke-linejoin="round"/>${cracks}<ellipse cx="200" cy="226" rx="${G(pc).w}" ry="${G(pc).ry || 34}" fill="${topFill(pc)}" stroke="${topStroke(pc)}" stroke-width="3"/></g>`;
    /* перемычка между куском и основой: полоса вдоль линии центров + низ под ней */
    const joint = (pt) => {
      const jx = (pt.cx + B.cx) / 2, jy = (pt.cy + B.cy) / 2, dx = B.cx - pt.cx, dy = B.cy - pt.cy;
      const len = Math.hypot(dx, dy) / 2, ang = (Math.atan2(dy, dx) * 180) / Math.PI, ry = Math.min(G(pt).ry || 34, 34) * pt.s * 0.95;
      const bot = Math.min(pt.cy + G(pt).h * 1.3 * pt.s, B.cy + G(B).h * 1.3 * B.s), hx = Math.abs(dx) / 2;
      return { s: pt.s, under: `<path d="M${(jx - hx).toFixed(1)} ${(jy - 4).toFixed(1)} Q${jx.toFixed(1)} ${(2 * bot - jy).toFixed(1)} ${(jx + hx).toFixed(1)} ${(jy - 4).toFixed(1)}Z"`,
        top: `<ellipse cx="${jx.toFixed(1)}" cy="${jy.toFixed(1)}" rx="${len.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${ang.toFixed(1)} ${jx.toFixed(1)} ${jy.toFixed(1)})"` };
    };
    /* общая монолитная земля: основа + прикреплённые куски (у неприкреплённых — display:none).
     * Прикреплённый кусок зарастает травой основы: песок под замком тоже становится зелёным. */
    const merged = () => {
      const items = [{ pc: B, k: -1 }, ...sec.parts.map((pt, k) => ({ pc: pt, k, j: joint(pt) })).filter((it) => !it.pc.soon)];
      const attr = (k) => (k < 0 ? '' : ` class="sx-m" data-k="${k}"`);
      const un = (pc, extra) => `<path transform="${at(pc)}" d="${underD(G(pc).w, G(pc).h)}" ${extra}/>`;
      const tp = (pc, extra) => `<ellipse transform="${at(pc)}" cx="200" cy="226" rx="${G(pc).w}" ry="${G(pc).ry || 34}" ${extra}/>`;
      const each = (fn) => items.map((it) => `<g${attr(it.k)}>${fn(it)}</g>`).join('');
      return `<g class="sx-ground" stroke-linejoin="round">
        <g fill="none" stroke="#33271d">${each(({ pc, j }) => un(pc, 'stroke-width="6"') + (j ? `${j.under} stroke-width="${(6 * j.s).toFixed(1)}"/>` : ''))}</g>
        <g fill="url(#${P}un)" stroke="none">${each(({ pc, j }) => un(pc, '') + (j ? `${j.under}/>` : ''))}</g>
        <g>${each(({ pc }) => `<g transform="${at(pc)}">${cracks}</g>`)}</g>
        <g fill="none">${each(({ pc, j }) => tp(pc, `stroke="${TOPC.grass[0]}" stroke-width="6"`) + (j ? `${j.top} stroke="#2f6e33" stroke-width="${(6 * j.s).toFixed(1)}"/>` : ''))}</g>
        <g stroke="none">${each(({ pc, j }) => (j ? `${j.top} fill="url(#${P}gr)"/>` : '') + tp(pc, `fill="url(#${P}gr)"`))}</g>
      </g>`;
    };
    const crumbs = (k) => `<g class="sx-crumbs" data-k="${k}">${[0, 1, 2].map((j) => `<g class="sx-cr"><g class="sx-cr-in" style="animation-delay:${-j * 0.9 - k}s"><path d="${['M-14 -4 L-4 -12 L12 -8 L14 4 L2 12 L-10 8Z', 'M-9 -3 L-2 -9 L9 -5 L8 5 L-3 8Z', 'M-6 -2 L0 -7 L7 -3 L5 5 L-4 5Z'][j]}" fill="#7a6049" stroke="#33271d" stroke-width="2.6" stroke-linejoin="round"/><path d="M-8 -4 L0 -9 L8 -5" fill="none" stroke="#4c9a46" stroke-width="3" stroke-linecap="round"/></g></g>`).join('')}</g>`;
    const part = (pt, k) => {
      const py = pt.cy + 98 * pt.s;
      return `<g class="sx-part" data-k="${k}" style="transform-origin:${pt.cx}px ${pt.cy}px"><g class="sx-rise"><g class="sx-bob" style="animation-delay:${(-k * 1.4).toFixed(1)}s">
        <ellipse class="sx-glow" cx="${pt.cx}" cy="${pt.cy - 50 * pt.s}" rx="${235 * pt.s}" ry="${180 * pt.s}" fill="url(#${P}gl)"/>
        ${own(pt)}
        ${nest(pt.art, pt.cx, pt.cy, pt.s, `${P}p${k}`)}
        <g class="sx-spk">${[[-1.05, -0.55, 0], [1.02, -0.2, 0.5], [-0.7, 0.3, 1]].map(([x, y, d]) => `<g transform="translate(${(pt.cx + x * 190 * pt.s).toFixed(0)} ${(pt.cy - 60 * pt.s + y * 150 * pt.s).toFixed(0)})"><path class="sx-tw" d="${STAR4}" fill="#fff6b0" stroke="#d99a0b" stroke-width="2" style="animation-delay:${d}s"/></g>`).join('')}</g>
        <g class="sx-pill" transform="translate(${pt.cx} ${py.toFixed(0)})"><rect x="-38" y="-19" width="76" height="38" rx="19"/><text y="8" text-anchor="middle">0%</text></g>
      </g></g></g>`;
    };
    /* облако-намёк на месте ещё не открытого куска (там, где кусок висит при 0%) */
    const fog = (pt, k) => {
      const [ux, uy] = unit(pt), fx = pt.cx + ux * FAR, fy = pt.cy + uy * FAR - 70 * pt.s, z = 2.1 * pt.s;
      const puff = (x, y, sc, c) => `<g transform="translate(${x} ${y}) scale(${sc})"><path d="M-46 0 Q-62 0 -58 -14 Q-54 -26 -40 -22 Q-36 -42 -14 -38 Q-2 -54 18 -40 Q40 -44 42 -22 Q62 -20 58 -4 Q56 4 44 4Z" fill="${c}" stroke="#c9d6ec" stroke-width="2.4" stroke-linejoin="round"/></g>`;
      return `<g class="sx-fog" data-k="${k}" transform="translate(${fx.toFixed(0)} ${fy.toFixed(0)}) scale(${z.toFixed(2)})"><g class="sx-fog-in">
        <g class="fg-l">${puff(-34, 10, 1, '#eef3fc')}${puff(-10, 34, 0.8, '#f7f9ff')}</g>
        <g class="fg-r">${puff(34, 2, 1.1, '#ffffff')}${puff(16, 32, 0.85, '#f3f6fd')}</g>
        <g class="fg-s">${[[-30, -10, 0], [36, -22, 0.6], [6, 22, 1.1]].map(([x, y, d]) => `<g transform="translate(${x} ${y}) scale(.55)"><path class="sx-tw" d="${STAR4}" fill="#fff6b0" stroke="#d99a0b" stroke-width="2.4" style="animation-delay:${d}s"/></g>`).join('')}</g>
      </g></g>`;
    };
    const parts = sec.parts.map((pt, k) => ({ pt, k }));
    const tapOf = (pt, k) => `<g class="sx-tap" data-k="${k}"><g transform="translate(${pt.cx} ${(pt.cy + (pt.tap || -205) * pt.s).toFixed(0)})"><g class="sx-tap-in"><path d="M-14 16 L14 16 L0 34Z" fill="#ffd23f" stroke="#5a3512" stroke-width="5" stroke-linejoin="round"/><rect x="-74" y="-30" width="148" height="50" rx="25" fill="#ffd23f" stroke="#5a3512" stroke-width="5"/><text y="8" text-anchor="middle">Нажми!</text></g></g></g>`;
    const draw = (list) => list.map(({ pt, k }) => (pt.soon ? fog(pt, k) : fog(pt, k) + crumbs(k) + part(pt, k))).join('');
    return `<svg class="sx-art" viewBox="0 50 1000 740" aria-hidden="true">
      <defs><radialGradient id="${P}gl"><stop offset="0" stop-color="#fff3a8" stop-opacity=".95"/><stop offset=".45" stop-color="#ffd23f" stop-opacity=".5"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient>
        <linearGradient id="${P}gr" gradientUnits="userSpaceOnUse" x1="0" y1="${B.cy - 70}" x2="0" y2="${B.cy + 80}"><stop offset="0" stop-color="#78c158"/><stop offset="1" stop-color="#4c9a46"/></linearGradient>
        <linearGradient id="${P}un" gradientUnits="userSpaceOnUse" x1="0" y1="${B.cy - 20}" x2="0" y2="${B.cy + 140}"><stop offset="0" stop-color="#7a6049"/><stop offset="1" stop-color="#43352a"/></linearGradient></defs>
      <g class="sx-world">
        ${merged()}
        ${draw(parts.filter((x) => x.pt.back))}
        <g class="sx-base">${nest(B.art, B.cx, B.cy, B.s, `${P}b`)}</g>
        <g class="sx-pill sx-bpill" transform="translate(${B.cx} ${(B.cy + 118 * B.s).toFixed(0)})"><rect x="-38" y="-19" width="76" height="38" rx="19"/><text y="8" text-anchor="middle">0%</text></g>
        ${draw(parts.filter((x) => !x.pt.back))}
        ${sec.parts.map((pt, k) => (pt.soon ? '' : tapOf(pt, k))).join('')}
      </g>
      <g class="sx-fx"></g></svg>`;
  }

  /* ---------- вёрстка ---------- */
  const css = document.createElement('style');
  css.textContent = `
    body.is-home .top, body.is-home .toolbar, body.is-home .stage { display: none !important; }
    body.is-home { background: #0e1a4a; }
    #home { position: fixed; inset: 0; overflow-y: auto; overflow-x: hidden; z-index: 30; -webkit-overflow-scrolling: touch; touch-action: pan-y;
      background: linear-gradient(180deg, #0e1a4a 0, #17348a 12%, #2360ae 24%, #4f9bd6 36%, #9fd0ee 45%, #d9dcee 52%, #f2dfc0 57%, #fbd774 63%, #f6b845 70%, #ec8b34 79%, #d65f22 89%, #9a4416 100%); }
    .hm-sky { position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background:
        radial-gradient(ellipse 90% 22% at 50% 60%, rgba(255, 231, 150, .6), rgba(255, 200, 90, .22) 55%, transparent 75%),
        radial-gradient(ellipse 38% 1.6% at 78% 47%, rgba(255, 255, 255, .5), transparent 72%),
        radial-gradient(ellipse 30% 1.3% at 18% 42%, rgba(255, 255, 255, .42), transparent 72%),
        radial-gradient(ellipse 44% 1.8% at 30% 55%, rgba(255, 246, 228, .55), transparent 72%),
        radial-gradient(ellipse 34% 1.4% at 84% 66%, rgba(255, 214, 150, .5), transparent 72%),
        radial-gradient(ellipse 120% 40% at 50% 112%, rgba(60, 20, 6, .45), transparent 70%); }
    #home[hidden] { display: none; }
    .hm-stars { position: fixed; inset: 0 0 auto 0; height: 40%; -webkit-mask-image: linear-gradient(#000 40%, transparent); mask-image: linear-gradient(#000 40%, transparent); pointer-events: none; opacity: .9;
      background-image: radial-gradient(2px 2px at 12% 18%, #fff 50%, transparent 52%), radial-gradient(1.6px 1.6px at 78% 9%, #fff 50%, transparent 52%), radial-gradient(2px 2px at 44% 30%, #fff 50%, transparent 52%), radial-gradient(1.4px 1.4px at 90% 40%, #fff 50%, transparent 52%), radial-gradient(1.8px 1.8px at 25% 62%, #fff 50%, transparent 52%), radial-gradient(1.4px 1.4px at 62% 74%, #fff 50%, transparent 52%), radial-gradient(1.6px 1.6px at 5% 88%, #fff 50%, transparent 52%);
      animation: hmTw 4s ease-in-out infinite alternate; }
    @keyframes hmTw { from { opacity: .5; } to { opacity: 1; } }
    .hm-col { position: relative; z-index: 1; max-width: 620px; margin: 0 auto; padding: calc(56px + env(safe-area-inset-top)) 14px calc(40px + env(safe-area-inset-bottom)); }
    .hm-title { text-align: center; font-weight: 900; font-size: clamp(1.5rem, 6vw, 2.2rem); color: #fff4d6; letter-spacing: .02em; -webkit-text-stroke: 1px rgba(40, 24, 8, .0); text-shadow: 0 3px 0 #7a4a14, 0 6px 14px rgba(0, 0, 0, .35); margin: 6px 0 2px; }
    .hm-sub { text-align: center; color: #cfe0ff; font-weight: 800; font-size: .95rem; margin: 0 0 6px; }
    .isle { position: relative; margin: 11% 0 0; }
    .hm-sub + .isle { margin-top: 10%; }
    .hm-foot { margin-top: 18%; }
    .isle-art { position: relative; aspect-ratio: 4 / 3; width: 78%; }
    .isle.r .isle-art { margin-left: auto; } .isle.l .isle-art { margin-right: auto; }
    .isle-art > svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 14px 14px rgba(0, 0, 0, .28)); animation: hmFloat 6s ease-in-out infinite; }
    .isle:nth-child(odd) .isle-art > svg { animation-delay: -2.5s; }
    @keyframes hmFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
    .spin { animation: hmSpin 9s linear infinite; }
    @keyframes hmSpin { to { transform: rotate(360deg); } }
    .pf { fill: #4a4d5a; opacity: 0; animation: hmSmoke 4.5s ease-out infinite; transform-box: fill-box; transform-origin: center; }
    .pf.p2 { animation-delay: -1.5s; } .pf.p3 { animation-delay: -3s; }
    @keyframes hmSmoke { 0% { transform: translate(0, 0) scale(.5); opacity: 0; } 15% { opacity: .7; } 100% { transform: translate(14px, -52px) scale(2.1); opacity: 0; } }
    .pst-l { animation: hmPstL 12s ease-in-out infinite; } .pst-r { animation: hmPstR 12s ease-in-out infinite; }
    @keyframes hmPstL { 0%, 42% { transform: translateX(0); } 56%, 59% { transform: translateX(80px); } 72%, 100% { transform: translateX(0); } }
    @keyframes hmPstR { 0%, 42% { transform: translateX(0); } 56%, 59% { transform: translateX(-80px); } 72%, 100% { transform: translateX(0); } }
    .psp { transform-box: fill-box; transform-origin: center; animation: hmPsp 12s linear infinite; opacity: 0; }
    @keyframes hmPsp { 0%, 55% { opacity: 0; transform: scale(.4); } 57% { opacity: 1; transform: scale(1.1); } 62%, 100% { opacity: 0; transform: scale(1.5); } }
    .bxA, .bxB, .bxC, .hel { transform-box: view-box; }
    .bxA, .bxB { opacity: 0; animation: 12s linear infinite; }
    .bxA { animation-name: hmBxA; transform-origin: 121px 214px; } .bxB { animation-name: hmBxB; transform-origin: 256px 214px; }
    @keyframes hmBxA { 0% { opacity: 0; transform: translateX(0) scale(.3); } 4% { opacity: 1; transform: translateX(0) scale(1); } 40% { opacity: 1; transform: translateX(55px) scale(1); } 51% { transform: translateX(55px) scale(1); animation-timing-function: ease-in-out; } 56% { opacity: 1; transform: translateX(72.5px) scale(1); } 56.5%, 100% { opacity: 0; transform: translateX(72.5px) scale(1); } }
    @keyframes hmBxB { 0% { opacity: 0; transform: translateX(0) scale(.3); } 4% { opacity: 1; transform: translateX(0) scale(1); } 40% { opacity: 1; transform: translateX(-32px) scale(1); } 51% { transform: translateX(-32px) scale(1); animation-timing-function: ease-in-out; } 56% { opacity: 1; transform: translateX(-49.5px) scale(1); } 56.5%, 100% { opacity: 0; transform: translateX(-49.5px) scale(1); } }
    .bxC { opacity: 0; transform-origin: 200px 222px; animation: hmBxC 12s ease-in-out infinite; }
    @keyframes hmBxC { 0%, 56% { opacity: 0; transform: translate(0, 0) scale(.5); } 58% { opacity: 1; transform: translate(0, 0) scale(1.15); } 60%, 72% { opacity: 1; transform: translate(0, 0) scale(1); } 78% { opacity: 1; transform: translate(85px, -96px) scale(1); } 90% { opacity: 1; transform: translate(-295px, -126px) scale(1); } 90.1%, 100% { opacity: 0; transform: translate(-295px, -126px) scale(1); } }
    .hel { animation: hmHel 12s ease-in-out infinite; }
    @keyframes hmHel { 0%, 54% { transform: translate(0, 0); } 66%, 72% { transform: translate(-85px, 96px); } 78% { transform: translate(0, 0); } 90% { transform: translate(-380px, -30px); } 90.1% { transform: translate(200px, -30px); } 100% { transform: translate(0, 0); } }
    .cvb { animation: hmCv 2.2s linear infinite; }
    @keyframes hmCv { from { transform: translateX(0); } to { transform: translateX(40px); } }
    .snow { animation: hmSnow 2.6s linear infinite; }
    @keyframes hmSnow { from { transform: translateY(-4px); opacity: 0; } 20% { opacity: .9; } to { transform: translateY(26px); opacity: 0; } }
    .spin { transform-box: fill-box; transform-origin: center; }
    .leaf { animation-duration: 7s; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
    .lf-l { animation-name: hmLeafL; } .lf-r { animation-name: hmLeafR; }
    @keyframes hmLeafL { 0%, 38% { transform: rotate(0); } 52%, 82% { transform: rotate(-68deg); } 96%, 100% { transform: rotate(0); } }
    @keyframes hmLeafR { 0%, 38% { transform: rotate(0); } 52%, 82% { transform: rotate(68deg); } 96%, 100% { transform: rotate(0); } }
    .cvu { animation: hmCvU 3s ease-in-out infinite; } .cvd { animation: hmCvD 3s ease-in-out infinite; }
    @keyframes hmCvU { 0%, 100% { transform: translateY(-2px); } 45% { transform: translateY(-6px); } 62%, 70% { transform: translateY(5px); } 85% { transform: translateY(-2px); } }
    @keyframes hmCvD { 0%, 100% { transform: translateY(2px); } 45% { transform: translateY(6px); } 62%, 70% { transform: translateY(-5px); } 85% { transform: translateY(2px); } }
    .cvb { transform-box: fill-box; transform-origin: center; opacity: 0; animation: hmCvB 3s ease-out infinite; }
    @keyframes hmCvB { 0%, 58% { opacity: 0; transform: translateY(6px) scale(.4); } 64% { opacity: 1; transform: translateY(-2px) scale(1); } 100% { opacity: 0; transform: translateY(-34px) scale(1.1); } }
    .seesaw { animation: hmSee 4s ease-in-out infinite alternate; }
    @keyframes hmSee { from { transform: rotate(-5deg); } to { transform: rotate(5deg); } }
    .lv { position: absolute; top: 2%; z-index: 3; display: flex; align-items: center; gap: 10px; pointer-events: none; }
    .isle.r .lv { left: 1%; } .isle.l .lv { right: 1%; flex-direction: row-reverse; text-align: right; }
    .lv .num { font-weight: 900; font-size: clamp(2.6rem, 11vw, 4rem); line-height: 1; color: #fff1cf; -webkit-text-stroke: 7px #5a3512; paint-order: stroke fill; text-shadow: 0 5px 0 #5a3512; letter-spacing: .02em; }
    .lv .txt { font-weight: 900; color: #fff1cf; -webkit-text-stroke: 5px #5a3512; paint-order: stroke fill; font-size: clamp(1rem, 4.4vw, 1.5rem); line-height: 1.05; text-shadow: 0 3px 0 #5a3512; text-transform: uppercase; max-width: 9em; }
    /* ряд режимов под островом: по порядку, с номерами */
    .modes { display: flex; flex-wrap: wrap; gap: 10px 6px; padding: 6px 2px 0; position: relative; z-index: 5; }
    .modes { justify-content: center; }
    .modes.n5 { max-width: 262px; margin: 0 auto; }
    .modes .pin { position: relative; transform: none; left: auto; top: auto; width: 4.6rem; }
    .modes .pin .dot { width: clamp(54px, 15vw, 64px); }
    .modes .pin .nm { margin-top: 7px; font-size: clamp(.58rem, 2.3vw, .72rem); max-width: 100%; }
    .modes .pin .no { position: absolute; top: -5px; left: calc(50% - clamp(23px, 6.5vw, 28px) - 6px); min-width: 20px; height: 20px; border-radius: 99px; display: grid; place-items: center; font-weight: 900; font-size: .72rem; color: #5a3512; background: #fff1cf; border: 2px solid #5a3512; box-shadow: 0 2px 0 #5a3512; z-index: 2; }
    .modes .pin .st { right: calc(50% - clamp(23px, 6.5vw, 28px) - 10px); }
    .pin { position: absolute; z-index: 4; transform: translate(-50%, -50%); border: 0; background: none; padding: 0; cursor: pointer; display: flex; flex-direction: column; align-items: center; font: inherit; -webkit-tap-highlight-color: transparent; }
    .pin .dot { width: clamp(36px, 10vw, 52px); aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center; background: radial-gradient(circle at 35% 28%, #fffdf5, #ffe9ab 70%, #f6c860); border: 4px solid #5a3512; box-shadow: 0 5px 0 #5a3512, 0 10px 14px rgba(0, 0, 0, .3); transition: transform .18s cubic-bezier(.3, 1.6, .5, 1); }
    .pin:hover .dot, .pin:focus-visible .dot { transform: translateY(-3px) scale(1.08); }
    .pin:active .dot { transform: translateY(3px) scale(.96); box-shadow: 0 1px 0 #5a3512; }
    .pin .dot svg { width: 62%; height: 62%; overflow: visible; }
    .pin .nm { margin-top: 9px; padding: 2px 7px; border-radius: 99px; background: rgba(24, 16, 40, .72); color: #fff; font-weight: 800; font-size: clamp(.56rem, 2.2vw, .72rem); white-space: normal; text-align: center; line-height: 1.12; max-width: 7.6em; box-shadow: 0 2px 6px rgba(0, 0, 0, .3); }
    .pin.sr .nm { position: absolute; left: 100%; top: 50%; transform: translateY(-50%); margin: 0 0 0 8px; }
    .pin .st { position: absolute; top: -6px; right: -8px; min-width: 22px; height: 22px; padding: 0 5px; border-radius: 99px; background: #3fbf6d; color: #fff; font-weight: 900; font-size: .72rem; display: grid; place-items: center; border: 2.5px solid #17653a; box-shadow: 0 2px 0 #17653a; }
    .pin .st[hidden] { display: none; }
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
    .deco.bigcloud { width: clamp(52px, 16vw, 80px); animation: hmDrift 7s ease-in-out infinite alternate; }
    .deco.bigcloud .cfx-r { animation: hmRain .9s linear infinite; }
    @keyframes hmDrift { from { transform: translateX(-6px); } to { transform: translateX(10px); } }
    @keyframes hmRain { 0% { transform: translateY(-6px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(14px); opacity: 0; } }
    .deco.rocketfx { animation: none; opacity: 0; z-index: 0; width: clamp(24px, 7vw, 38px); transform: translate(-50%, -50%) rotate(-45deg); filter: drop-shadow(0 0 5px #fb923c) drop-shadow(0 3px 3px rgba(0,0,0,.3)); }
    .rk-puff { position: absolute; z-index: 0; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%; background: radial-gradient(#fff, #d8dde8); pointer-events: none; opacity: 0; }
    .deco.jaw { width: clamp(24px, 6.5vw, 34px); animation: none; z-index: 2; filter: drop-shadow(0 0 2px #fff) drop-shadow(0 2px 2px rgba(0,0,0,.4)); }
    .deco.jaw svg { transform-origin: 50% 60%; animation: hmChomp .26s ease-in-out infinite alternate; }
    @keyframes hmChomp { from { transform: scaleY(1.05); } to { transform: scaleY(.28); } }
    .deco svg { width: 100%; display: block; overflow: visible; }
    @keyframes hmBob { from { transform: translateY(-5px) rotate(-4deg); } to { transform: translateY(6px) rotate(4deg); } }
    .hm-foot { text-align: center; color: #5a3512; font-weight: 800; font-size: .85rem; opacity: .75; margin-top: 4px; }
    @media (prefers-reduced-motion: reduce) { .isle-art > svg, .deco, .spin, .seesaw, .leaf, .shk, .pf, .cvb, .cvu, .cvd, .pst, .psp, .bxA, .bxB, .bxC, .hel, .snow, .hm-stars { animation: none; } }
    /* --- общий вид: острова + кольцо прогресса; по тапу остров приближается --- */
    .hm-col { padding-left: 22px; padding-right: 22px; }
    .isle-art { width: 62%; transition: width .5s cubic-bezier(.3,.8,.3,1); }
    .isle { transition: opacity .25s; }
    .isle:not(.open) { cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .isle.fade { opacity: 0; pointer-events: none; }
    .isle.gone { position: absolute; left: 0; right: 0; height: 0; margin: 0; overflow: hidden; visibility: hidden; pointer-events: none; }
    .isle.open .isle-art { width: 100%; }
    .modes { display: none; }
    .isle.open .modes { display: flex; animation: hmModesIn .5s .15s both; }
    @keyframes hmModesIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
    .prog { position: absolute; left: 6%; top: 30%; width: 24%; z-index: 5; text-align: center; pointer-events: none; transition: left .5s, top .5s, width .5s; color: #fff; }
    .isle.l .prog { left: 70%; }
    .isle.r.open .prog { left: 79%; top: 0; width: 20%; }
    .isle.l.open .prog { left: 1%; top: 0; width: 20%; }
    .isle.open { padding-top: 86px; }
    .isle.open .lv { top: 6px; }
    .prog svg { width: 100%; display: block; filter: drop-shadow(0 4px 4px rgba(0,0,0,.3)); }
    .prog .pc { font-weight: 900; font-size: 25px; fill: #fff; }
    .prog .tt { margin-top: 3px; display: inline-block; padding: 1px 8px; border-radius: 99px; background: rgba(24,16,40,.72); font-weight: 800; font-size: clamp(.56rem, 2.4vw, .72rem); }
    .isle.open .prog .tt { display: none; }
    .hm-back { position: relative; display: none; align-self: flex-start; margin: 4px 0 0; border: 0; border-radius: 99px; padding: 8px 16px; font: inherit; font-weight: 800; color: #fff1cf; background: #5a3512; box-shadow: 0 3px 0 #2d1a08; cursor: pointer; }
    .zoomed .hm-back { display: inline-block; }
    .zoomed .hm-sub, .zoomed .hm-foot { display: none; }
    .zoomed.hm-col { display: flex; flex-direction: column; min-height: 100vh; min-height: 100dvh; box-sizing: border-box; }
    .zoomed .isle.open { margin-top: 5%; flex: 1; display: flex; flex-direction: column; justify-content: space-evenly; }
        .isle.open .modes { margin: 0 auto; padding: 16px 6px 14px; border-radius: 26px; background: rgba(255, 255, 255, .16); box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .22); }
    .zoomed .isle-art { flex: none; }
    .zoomed .hm-title { display: none; }
        .hm-col { padding-bottom: calc(84px + env(safe-area-inset-bottom)); }
    .hm-dock { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: grid; grid-template-columns: repeat(4, 1fr); padding: 0 0 calc(env(safe-area-inset-bottom) * .45);
      background: linear-gradient(#a03804, #392013); box-shadow: 0 -3px 0 #1d1209, 0 -1px 0 3px rgba(255, 190, 110, .18), 0 -10px 26px rgba(40, 14, 2, .35), inset 0 2px 0 rgba(255, 205, 140, .28); }
    .hm-dock::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 100%; pointer-events: none; background: radial-gradient(ellipse 70% 120% at 50% 0, rgba(255, 190, 110, .16), transparent 70%); }
    .hm-dock button { position: relative; border: 0; background: none; font: inherit; color: #ffe9c4; font-weight: 800; font-size: .64rem; letter-spacing: .01em; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 7px 0 6px; border-radius: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; text-shadow: 0 2px 0 rgba(60, 22, 4, .6); transition: color .2s, transform .15s; }
    .hm-dock button + button::before { content: ''; position: absolute; left: 0; top: 14%; bottom: 14%; width: 2px; background: linear-gradient(transparent, rgba(29, 18, 9, .75) 25%, rgba(29, 18, 9, .75) 75%, transparent); box-shadow: 1px 0 0 rgba(255, 190, 110, .14); }
    .hm-dock button svg { width: 28px; height: 28px; filter: drop-shadow(0 3px 0 rgba(50, 18, 2, .55)); transition: transform .25s cubic-bezier(.3, 1.6, .5, 1); }
    .hm-dock button:active svg { transform: scale(.9); }
    .hm-dock button.on { color: #fff; }
    .hm-dock button.on svg { transform: translateY(-3px) scale(1.1); }
    .hm-dock button.on::after { content: ''; position: absolute; top: -3px; left: 22%; right: 22%; height: 4px; border-radius: 0 0 6px 6px; background: #ffd86b; box-shadow: 0 0 14px 2px rgba(255, 210, 100, .75); }
    .hm-sheet { position: fixed; inset: 0; z-index: 19; display: none; }
    .hm-sheet.show { display: block; }
    .hm-sheet .bd { position: absolute; inset: 0; background: rgba(10, 8, 30, .5); animation: hmFade .25s both; }
    .hm-sheet .pn { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); width: min(100%, 520px); max-height: 82dvh; overflow-y: auto; box-sizing: border-box; padding: 14px 18px calc(84px + env(safe-area-inset-bottom)); border-radius: 28px 28px 0 0; background: linear-gradient(#fff6df, #f6dfae); color: #4a2a12; box-shadow: 0 -6px 0 #5a3512, 0 -12px 30px rgba(0,0,0,.4); animation: hmUp .32s cubic-bezier(.2,.9,.3,1) both; }
    @keyframes hmUp { from { transform: translate(-50%, 100%); } to { transform: translate(-50%, 0); } }
    @keyframes hmFade { from { opacity: 0; } to { opacity: 1; } }
    .hm-sheet .gr { width: 44px; height: 5px; border-radius: 9px; background: #5a351255; margin: 0 auto 12px; }
    .hm-sheet h2 { margin: 0 0 4px; font-size: 1.35rem; font-weight: 900; }
    .hm-sheet p { margin: 0 0 12px; font-size: .9rem; opacity: .8; font-weight: 600; }
    .hm-sheet .cards { display: grid; gap: 10px; }
    .hm-sheet .cd { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 18px; background: #fff; box-shadow: 0 3px 0 #d9bb82, inset 0 0 0 2px #ecd49d; font-weight: 800; }
    .hm-sheet .rst { display: block; width: 100%; margin-top: 14px; padding: 11px; border: 0; border-radius: 16px; background: #fff; color: #b3261e; font: 800 .9rem inherit; box-shadow: 0 3px 0 #d9bb82, inset 0 0 0 2px #ecd49d; }
    .hm-sheet .rst.sw { color: #4a2a12; }
    .hm-sheet .rst.ask { background: #b3261e; color: #fff; }
    .hm-sheet .cd small { display: block; font-weight: 600; opacity: .7; font-size: .76rem; }
    .hm-sheet .cd .em { width: 42px; height: 42px; flex: none; display: grid; place-items: center; font-size: 1.5rem; border-radius: 14px; background: #ffe9ab; }
    .hm-sheet .cd.off { opacity: .55; filter: grayscale(.6); }
    .hm-sheet .cd.go { cursor: pointer; }
    .hm-sheet .big { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; text-align: center; }
    .hm-sheet .big div { padding: 10px 4px; border-radius: 16px; background: #fff; box-shadow: 0 3px 0 #d9bb82; font-size: .72rem; font-weight: 700; }
    .hm-sheet .big b { display: block; font-size: 1.5rem; font-weight: 900; color: #c4571a; }
    .hm-sheet .soon { text-align: center; padding: 18px 6px 6px; font-weight: 800; }
    .hm-sheet .soon .em { font-size: 3rem; display: block; margin-bottom: 4px; }
    .hm-sheet .x { position: absolute; right: 14px; top: 12px; width: 34px; height: 34px; border: 0; border-radius: 50%; background: #5a3512; color: #ffe9bf; font-size: 1.1rem; font-weight: 900; cursor: pointer; }
    .hm-sheet .pn.inv { background: linear-gradient(#4b2f1b, #2c190d); color: #ffe9c4; box-shadow: 0 -6px 0 #1d1209, 0 -12px 30px rgba(0,0,0,.5); }
    .hm-sheet .pn.inv .gr { background: #ffe9c455; }
    .inv-det { display: flex; gap: 14px; align-items: center; min-height: 92px; padding: 12px; margin-bottom: 12px; border-radius: 18px; background: rgba(0, 0, 0, .3); box-shadow: inset 0 0 0 2px rgba(255, 210, 140, .2); }
    .inv-det .ic { width: 64px; height: 64px; flex: none; padding: 8px; box-sizing: border-box; border-radius: 16px; background: radial-gradient(circle at 50% 35%, #6a4a2c, #35200f); box-shadow: inset 0 0 0 2px #ffd27a, 0 0 14px rgba(255, 200, 100, .35); }
    .inv-det .ic svg { width: 100%; height: 100%; display: block; }
    .inv-det h3 { margin: 0 0 3px; font-size: 1.1rem; font-weight: 900; color: #ffd86b; }
    .inv-det span { display: block; font-size: .8rem; font-weight: 600; line-height: 1.3; opacity: .92; }
    .inv-det em { display: block; margin-top: 5px; font-style: normal; font-size: .72rem; font-weight: 800; color: #9fd8ff; }
    .inv-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; }
    .slot { position: relative; aspect-ratio: 1; padding: 11px; border: 0; border-radius: 16px; cursor: pointer; background: radial-gradient(circle at 50% 30%, #5c3f25, #2e1b0d 80%); box-shadow: inset 0 0 0 2px #7b5532, inset 0 -5px 0 rgba(0,0,0,.35), 0 3px 0 #150c05; transition: transform .15s, box-shadow .2s; -webkit-tap-highlight-color: transparent; }
    .slot svg { width: 100%; height: 100%; display: block; filter: drop-shadow(0 2px 2px rgba(0,0,0,.5)); }
    .slot b { position: absolute; right: 5px; bottom: 4px; font-size: .62rem; font-weight: 900; color: #ffe9c4; text-shadow: 0 1px 0 #000, 0 0 3px #000; }
    .slot:active { transform: scale(.93); }
    .slot.sel { box-shadow: inset 0 0 0 3px #ffd86b, 0 0 16px rgba(255, 210, 100, .6), 0 3px 0 #150c05; }
    .noanim .isle-art, .noanim .prog { transition: none !important; }
    .isle { --sx: 0px; }
    .isle.sw { transition: opacity .2s, transform .2s; opacity: 0; transform: translateY(var(--sx)); }
    .isle.sw-in { transition: none; opacity: 0; transform: translateY(var(--sx)); }
    .isle.open { transition: opacity .22s, transform .22s; }
    .hm-dots { display: none; position: fixed; right: 8px; top: 50%; transform: translateY(-50%); flex-direction: column; align-items: center; gap: 10px; z-index: 6; }
    .zoomed .hm-dots { display: flex; }
    .hm-dots i { width: 10px; height: 10px; flex: none; border-radius: 99px; background: rgba(255,255,255,.45); box-shadow: 0 0 0 2px rgba(90,53,18,.55); transition: height .25s, background .25s; cursor: pointer; }
    .hm-dots i.on { height: 26px; background: #fff1cf; }
  `;
  document.head.append(css);

  /* значки вокруг островов: [иконка, x%, y%] */
  const DECO = {
    l1: [['axe', 21, 66, 'chop'], ['rocket', 82, 66, 'rocketfx']],
    l2: [],
    l3: [['cloudfx', 2, 18, 'bigcloud'], ['teeth', 24, 66, 'jaw'], ['teeth', 24, 74, 'jaw'], ['teeth', 24, 70, 'jaw'], ['teeth', 24, 68, 'jaw'], ['teeth', 24, 72, 'jaw']],
    l4: [['conveyor', 10, 26], ['cups', 82, 38]],
  };
  const GEAR1 = (() => { let d = ''; for (let i = 0; i < 8; i++) d += `<rect x="-4" y="-21" width="8" height="10" rx="2" transform="rotate(${i * 45})"/>`; return `<svg viewBox="-24 -24 48 48"><g fill="#a98cf0" stroke="#4b3a7a" stroke-width="2.4" stroke-linejoin="round">${d}<circle r="15"/></g><circle r="6" fill="#fff4d6" stroke="#4b3a7a" stroke-width="2.4"/></svg>`; })();
  const CLOUDFX = `<svg viewBox="0 0 120 90"><g class="cfx-r" stroke="#6f8be8" stroke-width="3.4" stroke-linecap="round"><path d="M34 52 l-4 12"/><path d="M52 54 l-4 12"/><path d="M70 52 l-4 12"/><path d="M88 54 l-4 12"/></g><path d="M22 48 Q6 48 10 34 Q14 22 28 26 Q32 8 54 12 Q66 -2 84 12 Q104 8 106 28 Q122 30 116 44 Q114 50 102 50Z" fill="#fff" stroke="#b9c7ea" stroke-width="3" stroke-linejoin="round"/></svg>`;
  const LOCAL = { gear1: GEAR1, cloudfx: CLOUDFX };
  const icon = (id) => LOCAL[id] || (MG.tools && MG.tools.icon ? MG.tools.icon(id) : '') || '';

  const getSolved = (id) => { try { return +localStorage.getItem(`mg.solved.${id}`) || 0; } catch (e) { return 0; } };

  function build() {
    const col = document.createElement('div');
    col.className = 'hm-col';
    col.innerHTML = `<div class="hm-title">${SECTIONS[0].title}</div><p class="hm-sub">Выбери остров</p>`;
    col.insertAdjacentHTML('beforeend', '<button class="hm-back" type="button">← Разделы<i class="gb">!</i></button>');
    let seq = 0;
    LEVELS.forEach((lv, i) => {
      const side = i % 2 ? 'l' : 'r';
      const sec = document.createElement('section');
      sec.className = `isle ${side}`;
      sec.innerHTML = `
        <div class="prog"></div>
        <div class="lv"><span class="num">${lv.n}</span><span class="txt">${lv.title}</span></div>
        <div class="isle-art">${ART[lv.cls]()}
          ${DECO[lv.cls].map(([ic, x, y, fx], k) => `<div class="deco${fx ? ' ' + fx : ''}" style="left:${x}%;top:${y}%;animation-delay:${-k * 0.8}s">${icon(ic)}</div>`).join('')}
        </div>
        <div class="modes${lv.modes.length > 4 ? ' n5' : ''}">${lv.modes.map((m) => `<button class="pin" type="button" data-mode="${m.id}" aria-label="${m.name}"><span class="dot">${icon(m.icon)}</span><span class="no">${++seq}</span><span class="nm">${m.name}</span><span class="st" hidden></span></button>`).join('')}</div>`;
      col.append(sec);
    });
    col.insertAdjacentHTML('beforeend', '<p class="hm-foot">Все режимы открыты — решай в любом порядке</p>');
    root.replaceChildren(Object.assign(document.createElement('div'), { className: 'hm-sky' }), Object.assign(document.createElement('div'), { className: 'hm-stars' }), buildSections(), col,
      Object.assign(document.createElement('div'), { className: 'sx-toast' }));
    const dock = Object.assign(document.createElement('nav'), { className: 'hm-dock', innerHTML: TABS.map(([k, n]) => `<button type="button" data-tab="${k}">${IC[k]}<span>${n}</span>${k === 'map' ? '<i class="gb">!</i>' : ''}</button>`).join('') });
    dock.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.tab === 'map') { goSections(); return; }            // «разделы» — самое главное меню
      if (b.classList.contains('on')) closeSheet(); else openSheet(b.dataset.tab);
    }));
    root.append(dock, Object.assign(document.createElement('div'), { className: 'hm-sheet' }));
    root.querySelectorAll('.pin').forEach((b) => b.addEventListener('click', () => MG.go && MG.go(b.dataset.mode)));
    const isles = [...col.querySelectorAll('.isle')];
    col.querySelector('.hm-back').addEventListener('click', goSections);
    col.insertAdjacentHTML('beforeend', `<div class="hm-dots">${LEVELS.map(() => '<i></i>').join('')}</div>`);
    col.querySelectorAll('.hm-dots i').forEach((d, k) => d.addEventListener('click', () => switchTo(k)));
    let sx = 0, sy = 0, st = 0, tracking = false;
    root.addEventListener('touchstart', (e) => { if (openI < 0 || e.touches.length !== 1 || e.target.closest('.hm-dock, .hm-sheet')) { tracking = false; return; } tracking = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now(); }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (!tracking) return; tracking = false;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      const atTop = root.scrollTop <= 2, atBot = root.scrollTop + root.clientHeight >= root.scrollHeight - 2;
      if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.4 && Date.now() - st < 900) {
        if (dy < 0 && atBot) switchTo(openI + 1); else if (dy > 0 && atTop) switchTo(openI - 1);
      }
    }, { passive: true });
    refresh();
  }

  const IC = {
    friends: '<svg viewBox="0 0 48 48"><circle cx="17" cy="15" r="7" fill="#7c5ae0" stroke="#2f1f6b" stroke-width="2.4"/><path d="M4 38c0-8 5-12 13-12s13 4 13 12z" fill="#6a46d4" stroke="#2f1f6b" stroke-width="2.4" stroke-linejoin="round"/><circle cx="33" cy="17" r="6.2" fill="#9a7cf0" stroke="#2f1f6b" stroke-width="2.4"/><path d="M26 28c2-1.5 4.500-2 7-2 7 0 11 3.500 11 11H30" fill="#8566e6" stroke="#2f1f6b" stroke-width="2.4" stroke-linejoin="round"/></svg>',
    map: '<svg viewBox="0 0 48 48"><path d="M5 11l13-4 12 4 13-4v30l-13 4-12-4-13 4z" fill="#58b8ee" stroke="#1d4f7a" stroke-width="2.4" stroke-linejoin="round"/><path d="M10 18c4-3 7-1 9 3s-1 7-5 8-6-3-4-11z M27 14c4-1 8 2 9 6s-3 5-5 9-5-1-6-6 0-8 2-9z" fill="#4fbf7a" stroke="#1d6a3a" stroke-width="1.8"/><path d="M18 7v30M30 11v30" stroke="#1d4f7a" stroke-width="1.6" opacity=".6"/></svg>',
    tools: '<svg viewBox="0 0 48 48"><rect x="6" y="22" width="36" height="20" rx="4" fill="#4e86c8" stroke="#1d3a66" stroke-width="2.4"/><rect x="6" y="28" width="36" height="3" fill="#1d3a66" opacity=".5"/><rect x="21" y="26" width="6" height="7" rx="1.5" fill="#ffd24a" stroke="#1d3a66" stroke-width="1.6"/><path d="M14 22V8M12 8h6l-1 6h-4zM24 22V6M20 6h8M33 22l5-14" stroke="#ffd24a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M14 22V8M24 22V6M33 22l5-14" stroke="#7a5a10" stroke-width=".8" fill="none" opacity=".5"/></svg>',
    trophy: '<svg viewBox="0 0 48 48"><path d="M14 6h20v14c0 7-4 11-10 11s-10-4-10-11z" fill="#ffc933" stroke="#8a5a0a" stroke-width="2.4" stroke-linejoin="round"/><path d="M14 10H6c0 8 3 12 9 13M34 10h8c0 8-3 12-9 13" fill="none" stroke="#8a5a0a" stroke-width="2.4" stroke-linecap="round"/><rect x="21" y="31" width="6" height="6" fill="#e6a416" stroke="#8a5a0a" stroke-width="2"/><rect x="13" y="37" width="22" height="6" rx="2" fill="#7c5ae0" stroke="#2f1f6b" stroke-width="2.4"/><path d="M19 10v10" stroke="#fff6c0" stroke-width="3" stroke-linecap="round" opacity=".8"/></svg>' };
  const TABS = [['friends', 'друзья'], ['map', 'разделы'], ['tools', 'инструменты'], ['trophy', 'достижения']];
  function sheetHtml(tab) {
    const all = LEVELS.flatMap((l) => l.modes), sol = (m) => Math.min(goalOf(m.id), getSolved(m.id));
    const total = all.reduce((a, m) => a + sol(m), 0), goal = all.reduce((a, m) => a + goalOf(m.id), 0);
    if (tab === 'trophy') {
      const full = LEVELS.filter((l) => l.modes.every((m) => sol(m) >= goalOf(m.id))).length;
      const A = [['🌱', 'Первый шаг', 'Реши первую задачу', total >= 1], ['🔥', 'Разогрев', 'Реши 10 задач', total >= 10], ['🎯', 'Полсотни', 'Реши 50 задач', total >= 50], ['🏝️', 'Остров покорён', 'Закрой любой остров на 100%', full >= 1], ['👑', 'Мастер дробей', 'Закрой все острова', full === LEVELS.length]];
      return `<h2>Достижения и статистика</h2><p>Твой путь по островам.</p><div class="big"><div><b>${total}</b>решено</div><div><b>${Math.round(total / goal * 100)}%</b>прогресс</div><div><b>${full}/${LEVELS.length}</b>островов</div></div><div class="cards">${A.map(([e, t, d, ok]) => `<div class="cd${ok ? '' : ' off'}"><span class="em">${ok ? e : '🔒'}</span><span>${t}<small>${d}</small></span></div>`).join('')}</div><button class="rst sw" type="button">Ручное разбиение (тест): ${MG.clip && MG.clip.forced() ? 'включено' : 'выключено'} — нажми, чтобы сменить</button><button class="rst sw tst" type="button">Тест: +25% островам II–IV</button><button class="rst" type="button">Сбросить прогресс (для теста)</button>`;
    }
    if (tab === 'friends') return '<h2>Друзья и кураторы</h2><div class="soon"><span class="em">👥</span>Скоро здесь появятся друзья, кураторы и общий рейтинг.</div>';
    const T = MG.tools || {}, INFO = T.info || {}, SETS = T.sets || {}, ids = Object.keys(INFO);
    const usedIn = (t) => all.map((m, i) => [i + 1, m]).filter(([, m]) => (SETS[m.id] || []).includes(t));
    return `<h2>Инвентарь</h2><p>${ids.length} инструментов. Нажми на ячейку, чтобы узнать, как работает; ×N — в скольких режимах он нужен.</p>
      <div class="inv-det"></div>
      <div class="inv-grid">${ids.map((t) => `<button class="slot" type="button" data-t="${t}" aria-label="${INFO[t].label}">${icon(t)}<b>×${usedIn(t).length}</b></button>`).join('')}</div>`;
  }
  function openSheet(tab) {
    const sh = root.querySelector('.hm-sheet');
    sh.innerHTML = `<div class="bd"></div><div class="pn"><div class="gr"></div><button class="x" type="button" aria-label="Закрыть">✕</button>${sheetHtml(tab)}</div>`;
    sh.classList.add('show');
    sh.querySelector('.pn').classList.toggle('inv', tab === 'tools');
    if (tab === 'tools') {
      const T = MG.tools || {}, INFO = T.info || {}, SETS = T.sets || {}, all = LEVELS.flatMap((l) => l.modes);
      const det = sh.querySelector('.inv-det'), slots = [...sh.querySelectorAll('.slot')];
      const pick = (t) => {
        slots.forEach((b) => b.classList.toggle('sel', b.dataset.t === t));
        const used = all.map((m, i) => [i + 1, m]).filter(([, m]) => (SETS[m.id] || []).includes(t));
        det.innerHTML = `<div class="ic">${icon(t)}</div><div><h3>${INFO[t].label}</h3><span>${INFO[t].tip}</span><em>Режимы: ${used.map(([n]) => '№' + n).join(', ')}</em></div>`;
      };
      slots.forEach((b) => { b.onclick = () => pick(b.dataset.t); });
      pick(slots[0] && slots[0].dataset.t);
    }
    root.querySelectorAll('.hm-dock button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    const swb = sh.querySelector('.rst.sw:not(.tst)');
    if (swb) swb.onclick = () => { if (!MG.clip) return; MG.clip.setForced(!MG.clip.forced()); swb.textContent = `Ручное разбиение (тест): ${MG.clip.forced() ? 'включено' : 'выключено'} — нажми, чтобы сменить`; };
    const tst = sh.querySelector('.rst.tst');
    if (tst) tst.onclick = () => {                                       // тест: куски острова раздела подлетают ближе
      SECTIONS[0].parts.forEach((pt) => LEVELS[pt.lvl].modes.forEach((m) => {
        const g = goalOf(m.id);
        try { localStorage.setItem(`mg.solved.${m.id}`, String(Math.min(g, getSolved(m.id) + Math.ceil(g / 4)))); } catch (e) { /* нет хранилища */ }
      }));
      closeSheet(); refresh();
      if (view === 'sections') refreshSections(true); else goSections();
    };
    const rst = sh.querySelector('.rst:not(.sw)');
    if (rst) rst.onclick = () => {
      if (!rst.classList.contains('ask')) { rst.classList.add('ask'); rst.textContent = 'Точно сбросить? Нажми ещё раз'; return; }
      try { Object.keys(localStorage).filter((k) => /^mg\.(solved|tut|isle)/.test(k)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* нет хранилища */ }
      location.reload();
    };
    sh.querySelector('.bd').onclick = sh.querySelector('.x').onclick = closeSheet;
    sh.querySelectorAll('[data-act=close]').forEach((e) => { e.onclick = closeSheet; });
  }
  function closeSheet() {
    root.querySelector('.hm-sheet').classList.remove('show');
    root.querySelectorAll('.hm-dock button').forEach((b) => b.classList.remove('on'));
  }
  const GOAL = 10;
  /* режимы острова «Сокращение дробей» — по 8 задач (4 стадии по 2) */
  /* «Общий знаменатель» — 12 задач (4 стадии по 3) */
  const goalOf = (id) => (['cancel', 'ext', 'factor'].includes(id) ? 8 : id === 'common' ? 12 : GOAL);
  const RC = 2 * Math.PI * 40;
  function ringSvg(done, total) {
    const f = total ? done / total : 0, full = f >= 1;
    return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="rgba(24,16,40,.78)" stroke="#5a3512" stroke-width="3"/><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="11"/><circle cx="50" cy="50" r="40" fill="none" stroke="${full ? '#ffd23f' : '#3fbf6d'}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${(RC * f).toFixed(1)} ${RC.toFixed(1)}" transform="rotate(-90 50 50)"/><text class="pc" x="50" y="58" text-anchor="middle">${Math.round(f * 100)}%</text></svg><span class="tt">${done}/${total}</span>`;
  }
  let busy = false, openI = -1;
  const isleEls = () => [...root.querySelectorAll('.isle')];
  const restart = () => setTimeout(() => { startOrbit(); startJaws(); startRocket(); }, 560);
  /* открыть остров подраздела сразу приближенным (списка островов больше нет: острова видны на острове раздела) */
  function openIsle(i) {
    const els = isleEls(), col = root.querySelector('.hm-col');
    i = Math.max(0, Math.min(LEVELS.length - 1, i));
    col.classList.add('zoomed', 'noanim');
    els.forEach((s, k) => { s.classList.remove('fade', 'sw', 'sw-in', 'open'); s.classList.toggle('gone', k !== i); s.style.setProperty('--sx', '0px'); });
    els[i].classList.add('open');
    openI = i; dotsUpdate(); root.scrollTop = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => col.classList.remove('noanim')));
    restart();
  }
  function dotsUpdate() { root.querySelectorAll('.hm-dots i').forEach((d, k) => d.classList.toggle('on', k === openI)); }
  function switchTo(k) {
    if (busy || openI < 0 || k < 0 || k >= LEVELS.length || k === openI) return; busy = true;
    const els = isleEls(), col = root.querySelector('.hm-col'), cur = els[openI], nxt = els[k], dir = k > openI ? 1 : -1;
    cur.style.setProperty('--sx', `${-dir * 50}px`); cur.classList.add('sw');
    setTimeout(() => {
      col.classList.add('noanim');
      cur.classList.remove('open', 'sw'); cur.classList.add('gone');
      nxt.classList.remove('gone', 'fade'); nxt.style.setProperty('--sx', `${dir * 50}px`); nxt.classList.add('sw-in', 'open');
      openI = k; dotsUpdate(); root.scrollTop = 0;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        nxt.classList.remove('sw-in'); nxt.style.setProperty('--sx', '0px'); col.classList.remove('noanim');
        busy = false; restart();
      }));
    }, 210);
  }
  function refresh() {
    root.querySelectorAll('.isle').forEach((sec, i) => {
      const ms = LEVELS[i].modes, done = ms.reduce((a, m) => a + Math.min(goalOf(m.id), getSolved(m.id)), 0);
      sec.querySelector('.prog').innerHTML = ringSvg(done, ms.reduce((a, m) => a + goalOf(m.id), 0));
    });
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
  const jawAnims = [];
  function startJaws() {
    jawAnims.splice(0).forEach((a) => a.cancel());
    if (root.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.querySelectorAll('.deco.jaw').forEach((el, i) => {
      const W = el.parentElement.clientWidth, D = W * 0.46;
      const dur = [7000, 9500, 5800, 8200, 6600][i % 5], ph = [-3500, 0, -2000, -5500, -1200][i % 5];
      const n = Math.max(3, Math.round(D / 34)), h = Math.max(9, W * 0.05), per = 8, kf = [];
      for (let leg = 0; leg < 2; leg++) {
        const f = leg ? 1 : -1;
        for (let k = 0; k <= n * per; k++) {
          if (leg && !k) continue;
          const u = k / (n * per), ph = (k % per) / per, air = Math.sin(Math.PI * ph);
          const x = D * (leg ? 1 - u : u), y = -h * air;
          const sq = ph === 0 ? 0.78 : 1 + 0.12 * air;            // приземление — сплющивается
          kf.push({ transform: `translate(${x}px, ${y}px) scale(${f * (2 - sq)}, ${sq})`, offset: (leg * 0.5) + u * 0.5 - (leg ? 0 : 0) });
        }
      }
      kf[0].offset = 0; kf[kf.length - 1].offset = 1;
      jawAnims.push(el.animate(kf, { duration: dur * 1.6, delay: ph, iterations: Infinity, easing: 'linear' }));
    });
  }
  /* ракета взлетает из леса справа и уходит вверх за край экрана */
  let rocketAnim = null, rocketTimer = 0;
  function startRocket() {
    clearTimeout(rocketTimer);
    if (rocketAnim) { rocketAnim.cancel(); rocketAnim = null; }
    const el = root.querySelector('.deco.rocketfx');
    if (!el || !el.parentElement || root.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const art = el.parentElement;
    if (!art.clientWidth) return;
    const launch = () => {
      if (root.hidden || !el.isConnected || !art.clientWidth) return;
      // остров I скрыт (открыт другой остров) — не летим, проверим позже
      if (el.closest('.isle.gone, .isle.fade')) { rocketTimer = setTimeout(launch, 4500); return; }
      el.getAnimations().forEach((a) => a.cancel());   // мерим позицию из исходной точки в лесу
      // высота подъёма — до верха страницы, а не до верха экрана: при прокрутке вниз
      // r.top становится отрицательным, и ракета летела вниз, к другим островам
      const r = el.getBoundingClientRect(), rr = root.getBoundingClientRect();
      const rise = Math.max(120, r.top - rr.top + root.scrollTop + r.height + 40);
      const T0 = 2600;
      const Y = 66, tf = 'translate(-50%, -50%) rotate(-45deg)';
      rocketAnim = el.animate([
        { top: `${Y}%`, transform: `${tf} scale(.5)`, opacity: 0, offset: 0 },
        { top: `calc(${Y}% - 6px)`, transform: `${tf} scale(1)`, opacity: 1, offset: .06 },
        { top: `calc(${Y}% - ${rise * .12}px)`, transform: `${tf} scale(1)`, opacity: 1, offset: .35 },
        { top: `calc(${Y}% - ${rise}px)`, transform: `${tf} scale(1)`, opacity: 1, offset: 1 },
      ], { duration: T0 + rise * 1.2, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' });
      const ex = el.offsetLeft, ey = el.offsetTop;
      for (let i = 0; i < 4; i++) {
        const p = document.createElement('i');
        p.className = 'rk-puff';
        p.style.left = `${ex + (i - 1.5) * 6}px`; p.style.top = `${ey + 6}px`;
        art.append(p);
        p.animate([{ opacity: .9, transform: 'scale(.4)' }, { opacity: 0, transform: `translate(${(i - 1.5) * 10}px, -12px) scale(2.2)` }], { duration: 1100, delay: i * 90, easing: 'ease-out' }).onfinish = () => p.remove();
      }
      // снимаем анимацию целиком: с fill: 'forwards' ракета оставалась видимой в конечной точке,
      // а следующий запуск мерил высоту от этой точки и обрывался на полпути
      rocketAnim.onfinish = () => { if (rocketAnim) rocketAnim.cancel(); rocketAnim = null; el.style.opacity = '0'; rocketTimer = setTimeout(launch, 4500); };
    };
    el.style.opacity = '0';
    rocketTimer = setTimeout(launch, 1200);
  }
  window.addEventListener('resize', () => { if (!root.hidden) { startOrbit(); startJaws(); startRocket(); } });


  /* ================= главное меню разделов ================= */
  const css2 = document.createElement('style');
  css2.textContent = `
    #home[data-view="sections"] .hm-col, #home[data-view="islands"] .sx-col { display: none; }
    .sx-col { position: relative; z-index: 1; max-width: 620px; margin: 0 auto; box-sizing: border-box; min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column;
      padding: calc(56px + env(safe-area-inset-top)) 14px calc(92px + env(safe-area-inset-bottom)); }
    .sx-sec + .sx-sec { margin-top: 8vh; }
    .sx-next { align-self: center; margin: 3vh 0 0; padding: 7px 16px; border: 0; border-radius: 99px; font: inherit; font-weight: 800; font-size: .85rem; color: #fff1cf; background: #5a3512; box-shadow: 0 3px 0 #2d1a08; cursor: pointer; animation: sxNext 1.4s ease-in-out infinite alternate; }
    @keyframes sxNext { from { transform: translateY(-3px); } to { transform: translateY(4px); } }
    .sx-sec { position: relative; flex: 1; display: flex; flex-direction: column; justify-content: center; cursor: pointer; -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; }
    .sx-head { position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 12px; margin: 4% 0 0; pointer-events: none; }
    .sx-ring { width: clamp(66px, 19vw, 92px); flex: none; text-align: center; color: #fff; }
    .sx-ring svg { width: 100%; display: block; filter: drop-shadow(0 4px 4px rgba(0,0,0,.3)); }
    .sx-ring .pc { font-weight: 900; font-size: 25px; fill: #fff; }
    .sx-ring .tt { margin-top: 3px; display: inline-block; padding: 1px 8px; border-radius: 99px; background: rgba(24,16,40,.72); font-weight: 800; font-size: clamp(.56rem, 2.4vw, .72rem); }
    .sx-name { font-weight: 900; color: #fff1cf; -webkit-text-stroke: 6px #5a3512; paint-order: stroke fill; font-size: clamp(1.3rem, 6.4vw, 2.1rem); line-height: 1.04; text-shadow: 0 4px 0 #5a3512; text-transform: uppercase; max-width: 8.5em; }
    .sx-stage { position: relative; width: 122%; margin: 0 -11%; max-width: calc((100vh - 300px) * 1.35); max-width: calc((100dvh - 300px) * 1.35); align-self: center; aspect-ratio: 1000 / 740; }
    .sx-stage > svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 16px 16px rgba(0, 0, 0, .3)); animation: hmFloat 6s ease-in-out infinite; }
    .sx-tip { position: relative; z-index: 2; align-self: center; margin: 2% 0 0; padding: 7px 16px; border-radius: 99px; background: rgba(255, 241, 207, .82); color: #5a3512; font-weight: 800; font-size: clamp(.72rem, 3.3vw, .9rem); text-align: center; box-shadow: 0 3px 0 rgba(90, 53, 18, .45); pointer-events: none; }
    .sx-tip.hot { background: #ffd23f; animation: sxPulse 1.1s ease-in-out infinite alternate; }
    @keyframes sxPulse { from { transform: scale(1); } to { transform: scale(1.05); } }
    .sx-part { cursor: pointer; }
    .sx-bob, .sx-cr-in, .sx-tw, .sx-tap-in { transform-box: fill-box; transform-origin: center; }
    .sx-bob { animation: sxBob 4.4s ease-in-out infinite alternate; }
    @keyframes sxBob { from { transform: translateY(-10px) rotate(-1.4deg); } to { transform: translateY(10px) rotate(1.4deg); } }
    .sx-cr-in { animation: sxBob 3.1s ease-in-out infinite alternate; }
    .sx-part.on .sx-bob, .sx-part.going .sx-bob { animation: none; }
    .sx-part.ready .sx-bob { animation: sxReady 1.5s ease-in-out infinite alternate; }
    @keyframes sxReady { from { transform: translateY(-5px); } to { transform: translateY(5px); } }
    .sx-glow, .sx-pill, .sx-spk { pointer-events: none; }
    .sx-tap { cursor: pointer; }
    .sx-glow { opacity: 0; }
    .sx-part.ready .sx-glow { animation: sxGlow 1.5s ease-in-out infinite alternate; }
    @keyframes sxGlow { from { opacity: .4; } to { opacity: 1; } }
    .sx-pill rect { fill: rgba(24, 16, 40, .8); stroke: #fff1cf; stroke-width: 3.5; }
    .sx-pill text { fill: #fff; font: 900 23px Nunito, system-ui, sans-serif; }
    .sx-tap text { fill: #5a3512; font: 900 27px Nunito, system-ui, sans-serif; }
    .sx-part.on .sx-pill, .sx-part.ready .sx-pill, .sx-part.going .sx-pill { display: none; }
    .sx-tap, .sx-spk { display: none; }
    .sx-part.on .sx-own { display: none; }
    .sx-part.hid, .sx-crumbs.hid, .sx-tap.hid, .sx-fog { display: none; }
    .sx-fog.show { display: inline; cursor: pointer; }
    .sx-fog-in { animation: sxFog 5s ease-in-out infinite alternate; }
    @keyframes sxFog { from { transform: translateX(-6px); } to { transform: translateX(6px); } }
    .sx-rise, .fg-l, .fg-r { transform-box: fill-box; transform-origin: 50% 100%; }
    .sx-part.ready .sx-spk, .sx-tap.ready { display: inline; }
    .sx-tap-in { animation: sxTap .8s ease-in-out infinite alternate; }
    @keyframes sxTap { from { transform: translateY(-8px); } to { transform: translateY(6px); } }
    .sx-tw { animation: sxTw 1.3s ease-in-out infinite; }
    @keyframes sxTw { 0%, 100% { transform: scale(.3) rotate(0); opacity: .2; } 50% { transform: scale(1.25) rotate(45deg); opacity: 1; } }
    .bm-sp { transform-box: fill-box; animation: bmRise 3.6s linear infinite; opacity: 0; }
    @keyframes bmRise { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: 1; } 80% { opacity: .8; } 100% { transform: translateY(-330px); opacity: 0; } }
    .bm-st { animation: bmFlow 1.6s linear infinite; }
    @keyframes bmFlow { from { transform: translateY(0); } to { transform: translateY(-26px); } }
    .bm-glow { animation: bmGlow 2.4s ease-in-out infinite alternate; }
    @keyframes bmGlow { from { opacity: .55; } to { opacity: 1; } }
    .bm-pool { animation: bmGlow 1.8s ease-in-out infinite alternate; }
    .sx-toast { position: fixed; left: 50%; top: calc(18% + env(safe-area-inset-top)); z-index: 40; width: max-content; max-width: 86vw; transform: translateX(-50%); opacity: 0; pointer-events: none; text-align: center;
      padding: 12px 22px 13px; border-radius: 24px; background: linear-gradient(#fff6df, #ffd86b); color: #5a3512; font-weight: 900; font-size: 1.05rem; line-height: 1.2; box-shadow: 0 5px 0 #5a3512, 0 12px 26px rgba(0, 0, 0, .35); border: 3px solid #5a3512; }
    .sx-toast small { display: block; margin-top: 3px; font-size: .78rem; font-weight: 800; opacity: .8; }
    .gb { display: none; position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%; font-style: normal; font-weight: 900; font-size: .75rem; line-height: 20px; text-align: center; color: #5a3512; background: #ffd23f; border: 2px solid #5a3512; box-shadow: 0 0 12px 3px rgba(255, 210, 63, .8); animation: sxPulse .7s ease-in-out infinite alternate; }
    .hm-dock .gb { top: 4px; right: calc(50% - 26px); }
    #home.gift-on .gb { display: block; }
    .tp { position: fixed; left: 10px; bottom: calc(76px + env(safe-area-inset-bottom)); z-index: 25; max-width: calc(100vw - 20px); font-family: inherit; }
    .tp button { font: inherit; font-weight: 800; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .tp-tg { border: 2px dashed #fff1cf; border-radius: 99px; padding: 6px 13px; background: rgba(24, 16, 40, .78); color: #fff1cf; font-size: .78rem; }
    .tp-box { display: none; margin-top: 6px; padding: 8px; border-radius: 16px; background: rgba(24, 16, 40, .88); box-shadow: 0 6px 18px rgba(0, 0, 0, .35); color: #fff; }
    .tp.open .tp-box { display: grid; gap: 6px; }
    .tp-row { display: flex; align-items: center; gap: 5px; font-size: .72rem; font-weight: 800; }
    .tp-n { width: 22px; text-align: center; color: #ffd23f; font-weight: 900; }
    .tp-t { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 8em; }
    .tp-p { width: 36px; text-align: right; color: #7ee0a0; }
    .tp-row button, .tp-act button { border: 0; border-radius: 9px; padding: 6px 7px; background: #fff1cf; color: #5a3512; font-size: .72rem; box-shadow: 0 2px 0 #5a3512; }
    .tp-row button:active, .tp-act button:active { transform: translateY(2px); box-shadow: none; }
    .tp-row button[data-d="1"] { background: #ffd23f; }
    .tp-act { display: flex; gap: 6px; margin-top: 2px; }
    .tp-act button { flex: 1; background: #f3c1b8; }
    @media (prefers-reduced-motion: reduce) { .sx-next, .sx-stage > svg, .sx-bob, .sx-cr-in, .sx-tw, .sx-tap-in, .bm-sp, .bm-st, .bm-glow, .bm-pool, .sx-tip.hot, .gb { animation: none !important; } .bm-sp { opacity: .7; } }
  `;
  document.head.append(css2);

  let view = 'sections';
  const NS = 'http://www.w3.org/2000/svg';
  const snd = (n, o) => { if (MG.snd && MG.snd.play) MG.snd.play(n, o); };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* нет хранилища */ } };
  const lvlDone = (lv) => lv.modes.reduce((a, m) => a + Math.min(goalOf(m.id), getSolved(m.id)), 0);
  const lvlGoal = (lv) => lv.modes.reduce((a, m) => a + goalOf(m.id), 0);
  const fracOf = (lv) => { const g = lvlGoal(lv); return g ? lvlDone(lv) / g : 0; };
  const pkey = (sec, pt) => `mg.isle.${sec.id}.${pt.lvl}`;               // '1' — кусок уже прикреплён
  const isOn = (sec, pt) => lsGet(pkey(sec, pt)) === '1';
  /* насколько далеко висит кусок: 0% — далеко, 99% — почти у берега, 100% — ждёт тапа рядом */
  const FAR = 170, NEAR = 50, READY = 24;
  const offFor = (p, on) => (on ? 0 : p >= 1 ? READY : NEAR + (FAR - NEAR) * (1 - p));
  const scFor = (p, on) => (on || p >= 1 ? 1 : 0.84 + 0.12 * p);
  const unit = (pt) => { const l = Math.hypot(pt.dx, pt.dy) || 1; return [pt.dx / l, pt.dy / l]; };
  const now = {};                                                        // `${si}.${k}` → { off, sc }
  const secBox = (si) => root.querySelector(`.sx-sec[data-s="${si}"]`);

  /* прикреплённый кусок: его земля становится частью общей монолитной земли основы */
  const fuse = (box, k, on) => box.querySelectorAll(`.sx-m[data-k="${k}"]`).forEach((e) => { e.style.display = on ? '' : 'none'; });
  function place(si, k, off, sc) {
    const sec = SECTIONS[si], pt = sec.parts[k], [ux, uy] = unit(pt), box = secBox(si);
    if (!box) return;
    const tf = `translate(${(ux * off).toFixed(1)}px, ${(uy * off).toFixed(1)}px)`;
    box.querySelector(`.sx-part[data-k="${k}"]`).style.transform = `${tf} scale(${sc.toFixed(3)})`;
    box.querySelector(`.sx-tap[data-k="${k}"]`).style.transform = tf;
    // камешки между берегом и куском: тем больше видно, чем шире щель
    const B = sec.base, x0 = pt.cx + (B.cx - pt.cx) * 0.3, y0 = pt.cy + (B.cy - pt.cy) * 0.3 + 30 * pt.s;
    box.querySelectorAll(`.sx-crumbs[data-k="${k}"] .sx-cr`).forEach((c, j) => {
      const t = [0.3, 0.58, 0.84][j], jit = [12, -14, 8][j];
      c.setAttribute('transform', `translate(${(x0 + ux * off * t - uy * jit).toFixed(1)} ${(y0 + uy * off * t + ux * jit).toFixed(1)})`);
      c.setAttribute('opacity', Math.max(0, Math.min(1, (off - 36) / 40)).toFixed(2));
    });
    now[`${si}.${k}`] = { off, sc };
  }
  const EASE = {
    back: (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2,
    out: (t) => 1 - (1 - t) ** 3,
    in: (t) => t * t * t,
  };
  const tweenTok = {};
  function tween(si, k, to, toSc, dur, ease) {
    return new Promise((res) => {
      const s = now[`${si}.${k}`] || { off: to, sc: toSc }, t0 = performance.now(), id = `${si}.${k}`, tok = (tweenTok[id] = (tweenTok[id] || 0) + 1);
      if (reduced() || dur <= 0) { place(si, k, to, toSc); res(); return; }
      const step = (t) => {
        if (tweenTok[id] !== tok) { res(); return; }                 // кусок уже повели новой анимацией
        const u = Math.min(1, (t - t0) / dur), e = ease(u);
        place(si, k, s.off + (to - s.off) * e, s.sc + (toSc - s.sc) * e);
        if (u < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  /* обновить острова разделов; animate — куски, чей процент вырос, подлетают ближе на глазах */
  function refreshSections(animate, quick) {
    let gifts = 0;
    SECTIONS.forEach((sec, si) => {
      const box = secBox(si);
      if (!box) return;
      box.querySelector('.sx-ring').innerHTML = ringSvg(sec.levels.reduce((a, l) => a + lvlDone(l), 0), sec.levels.reduce((a, l) => a + lvlGoal(l), 0));
      let delay = quick ? 60 : 450, ready = 0, on = 0, hidden = [], news = 0;
      const willOpen = animate && !reduced() ? sec.parts.filter((pt) => !pt.soon && lsGet(`${pkey(sec, pt)}.shown`) !== '1' && (isOn(sec, pt) || fracOf(sec.levels[pt.lvl]) > 0 || fracOf(sec.levels[sec.base.lvl || 0]) >= (pt.open || 0) - 1e-9)).length : 0;
      const baseP = fracOf(sec.levels[sec.base.lvl || 0]);
      const bp = box.querySelector('.sx-bpill');
      const building = !sec.levels.some((l) => l.modes.length);         // раздел ещё без режимов
      bp.style.display = baseP >= 1 || building ? 'none' : '';
      if (building) box.querySelector('.sx-ring .tt').textContent = 'скоро'; bp.querySelector('text').textContent = `${Math.floor(baseP * 100)}%`;
      sec.parts.forEach((pt, k) => {
        if (pt.soon) { box.querySelector(`.sx-fog[data-k="${k}"]`).classList.add('show'); hidden.push(pt); return; }   // остров ещё строится
        const p = fracOf(sec.levels[pt.lvl]), c = isOn(sec, pt), el = box.querySelector(`.sx-part[data-k="${k}"]`);
        /* ещё не открыт: вместо куска облако */
        const shownK = `${pkey(sec, pt)}.shown`, cr = box.querySelector(`.sx-crumbs[data-k="${k}"]`), tpk = box.querySelector(`.sx-tap[data-k="${k}"]`), fg = box.querySelector(`.sx-fog[data-k="${k}"]`);
        if (!(c || p > 0 || baseP >= (pt.open || 0) - 1e-9)) {
          [el, cr, tpk].forEach((e) => e.classList.add('hid')); fg.classList.add('show'); fuse(box, k, false);
          if (c) lsSet(pkey(sec, pt), '0');
          lsSet(shownK, '0'); lsSet(`${pkey(sec, pt)}.seen`, '0');
          hidden.push(pt);
          return;
        }
        const fresh = lsGet(shownK) !== '1';
        lsSet(shownK, '1');
        if (!fresh || !animate || reduced()) { [el, cr, tpk].forEach((e) => e.classList.remove('hid')); fg.classList.remove('show'); }
        if (c && p < 1) lsSet(pkey(sec, pt), '0');                       // прогресс сброшен — кусок снова отколот
        const att = c && p >= 1;
        el.classList.toggle('on', att); el.classList.toggle('ready', !att && p >= 1); el.classList.remove('going');
        fuse(box, k, att);
        box.querySelector(`.sx-tap[data-k="${k}"]`).classList.toggle('ready', !att && p >= 1);
        el.querySelector('.sx-pill text').textContent = `${Math.floor(p * 100)}%`;
        if (att) on++; else if (p >= 1) ready++;
        const seenK = `${pkey(sec, pt)}.seen`, seen = parseFloat(lsGet(seenK));
        const to = offFor(p, att), sc = scFor(p, att);
        if (fresh && animate && !reduced()) {                             // появление: сразу на своё место по проценту
          place(si, k, to, sc);
          reveal(si, k, delay, willOpen > 1); news++; delay += quick ? 300 : 700;
        } else if (animate && !att && seen < p && !reduced()) {
          place(si, k, offFor(seen, false), scFor(seen, false));
          const d = delay; delay += quick ? 120 : 380;
          setTimeout(() => {
            snd('whoosh', { dur: 0.6 });
            tween(si, k, to, sc, 1300, EASE.back).then(() => { if (p >= 1) snd('spark'); });
          }, d);
        } else place(si, k, to, sc);
        lsSet(seenK, String(p));
      });
      gifts += ready;
      const tip = box.querySelector('.sx-tip');
      tip.classList.toggle('hot', ready > 0);
      if (news > 1) setTimeout(() => toast(`Открыты новые острова: ${news}!<small>${sec.title}</small>`), (quick ? 60 : 450) + 620);
      const opening = hidden.filter((pt) => !pt.soon), nextOpen = opening.length ? Math.min(...opening.map((pt) => pt.open || 0)) : 0;
      tip.textContent = building ? 'Раздел строится — задачи появятся совсем скоро'
        : ready ? (ready > 1 ? 'Куски острова готовы — нажми на них!' : 'Кусок острова готов — нажми на него!')
        : opening.length ? `Реши «${sec.levels[sec.base.lvl || 0].title}» на ${Math.round(nextOpen * 100)}% — откроется новый остров`
        : on === sec.parts.length ? 'Все части острова на месте!' : 'Решай задачи — и куски острова подлетят ближе';
    });
    root.classList.toggle('gift-on', gifts > 0);
  }

  /* кусок впервые появляется: облако расходится, остров всплывает снизу */
  function reveal(si, k, d, many) {
    const sec = SECTIONS[si], pt = sec.parts[k], box = secBox(si), lv = sec.levels[pt.lvl];
    const el = box.querySelector(`.sx-part[data-k="${k}"]`), cr = box.querySelector(`.sx-crumbs[data-k="${k}"]`), tp = box.querySelector(`.sx-tap[data-k="${k}"]`), fg = box.querySelector(`.sx-fog[data-k="${k}"]`);
    [el, cr, tp].forEach((e) => e.classList.add('hid'));
    fg.classList.add('show');
    setTimeout(() => {
      if (!el.isConnected) return;
      snd('whoosh', { dur: 0.7 });
      const o = { duration: 700, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' };
      const a1 = fg.querySelector('.fg-l').animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(-90px, 6px) scale(1.2)', opacity: 0 }], o);
      fg.querySelector('.fg-r').animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(90px, -6px) scale(1.2)', opacity: 0 }], o);
      fg.querySelector('.fg-s').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
      [el, cr, tp].forEach((e) => e.classList.remove('hid'));
      el.querySelector('.sx-rise').animate([
        { transform: 'translateY(170px) scale(.4)', opacity: 0 },
        { transform: 'translateY(-16px) scale(1.05)', opacity: 1, offset: 0.62 },
        { transform: 'translateY(5px) scale(.98)', offset: 0.82 },
        { transform: 'none', opacity: 1 },
      ], { duration: 1150, easing: 'cubic-bezier(.25,.8,.35,1)' });
      cr.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 400, fill: 'backwards' });
      setTimeout(() => {
        snd('spark'); snd('pop');
        burst(box, pt.cx + unit(pt)[0] * (now[`${si}.${k}`] || { off: 0 }).off, pt.cy + unit(pt)[1] * (now[`${si}.${k}`] || { off: 0 }).off - 60 * pt.s, 9);
        if (!many) toast(`Открыт новый остров!<small>${lv.n}. ${lv.title}</small>`);
      }, 620);
      a1.onfinish = () => { fg.classList.remove('show'); fg.querySelectorAll('.fg-l, .fg-r, .fg-s').forEach((g) => g.getAnimations().forEach((a) => a.cancel())); };
    }, d);
  }
  /* звёзды разлетаются из точки (x, y) острова раздела */
  function burst(box, x, y, n) {
    if (reduced()) return;
    const fx = box.querySelector('.sx-fx');
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.05 + 0.9 * i / Math.max(1, n - 1)), r = 110 + Math.random() * 90;
      const g = document.createElementNS(NS, 'g'); g.setAttribute('transform', `translate(${x.toFixed(0)} ${y.toFixed(0)})`);
      const s = document.createElementNS(NS, 'path'); s.setAttribute('d', STAR4); s.setAttribute('fill', i % 3 ? '#ffe27a' : '#fff'); s.setAttribute('stroke', '#c98a0a'); s.setAttribute('stroke-width', '2');
      g.append(s); fx.append(g);
      s.style.transformBox = 'fill-box'; s.style.transformOrigin = 'center';
      s.animate([{ opacity: 1, transform: 'translate(0, 0) scale(.4)' }, { opacity: 1, transform: `translate(${(Math.cos(a) * r * 0.7).toFixed(0)}px, ${(Math.sin(a) * r * 0.7).toFixed(0)}px) scale(1.2) rotate(90deg)`, offset: 0.6 }, { opacity: 0, transform: `translate(${(Math.cos(a) * r).toFixed(0)}px, ${(Math.sin(a) * r + 30).toFixed(0)}px) scale(.5) rotate(180deg)` }],
        { duration: 1000, easing: 'cubic-bezier(.2,.8,.4,1)' }).onfinish = () => g.remove();
    }
  }

  /* награда: кусок подлетает и защёлкивается */
  async function attach(si, k) {
    if (busy) return; busy = true;
    const sec = SECTIONS[si], pt = sec.parts[k], box = secBox(si), el = box.querySelector(`.sx-part[data-k="${k}"]`);
    const c0 = now[`${si}.${k}`] || { off: READY, sc: 1 };
    el.classList.remove('ready'); el.classList.add('going');
    box.querySelector(`.sx-tap[data-k="${k}"]`).classList.remove('ready');
    snd('whoosh', { dur: 0.5 });
    await tween(si, k, c0.off + 34, 1.04, 260, EASE.out);              // замах
    await tween(si, k, 0, 1, 300, EASE.in);                              // рывок к берегу
    lsSet(pkey(sec, pt), '1');
    el.classList.remove('going'); el.classList.add('on');
    fuse(box, k, true);
    impact(si, k);
    const lv = sec.levels[pt.lvl];
    setTimeout(() => {
      const all = sec.parts.every((q) => isOn(sec, q));
      toast(all ? `Все части острова на месте!<small>${sec.title}</small>` : `Остров присоединён!<small>${lv.n}. ${lv.title}</small>`);
      refreshSections(false);
      busy = false;
    }, 380);
  }
  function impact(si, k) {
    const sec = SECTIONS[si], pt = sec.parts[k], B = sec.base, box = secBox(si);
    const x = pt.cx + (B.cx - pt.cx) * 0.42, y = pt.cy + (B.cy - pt.cy) * 0.42 + 8;
    snd('smash'); snd('crumble'); setTimeout(() => snd('win'), 170);
    try { if (navigator.vibrate) navigator.vibrate(35); } catch (e) { /* нет вибрации */ }
    if (reduced()) return;
    const fx = box.querySelector('.sx-fx'), world = box.querySelector('.sx-world');
    world.animate([{ transform: 'translate(0, 0)' }, { transform: 'translate(-8px, 6px)' }, { transform: 'translate(7px, -5px)' }, { transform: 'translate(-4px, 3px)' }, { transform: 'translate(2px, -1px)' }, { transform: 'translate(0, 0)' }], { duration: 440, easing: 'ease-out' });
    const el = box.querySelector(`.sx-part[data-k="${k}"]`);
    el.animate([{ scale: '1.06 .94' }, { scale: '.97 1.03' }, { scale: '1 1' }], { duration: 420, easing: 'ease-out' });
    const mk = (tag, a, parent = fx) => { const e = document.createElementNS(NS, tag); Object.entries(a).forEach(([n, v]) => e.setAttribute(n, v)); parent.append(e); return e; };
    const fin = (e, kf, o) => { e.style.transformBox = 'fill-box'; e.style.transformOrigin = 'center'; e.animate(kf, o).onfinish = () => e.remove(); };
    fin(mk('circle', { cx: x, cy: y, r: 110, fill: `url(#s${si}gl)` }), [{ opacity: 1, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(2.2)' }], { duration: 650, easing: 'ease-out' });
    fin(mk('circle', { cx: x, cy: y, r: 24, fill: 'none', stroke: '#ffe27a', 'stroke-width': 9 }), [{ opacity: 1, transform: 'scale(.3)' }, { opacity: 0, transform: 'scale(8)' }], { duration: 750, easing: 'cubic-bezier(.2,.7,.3,1)' });
    for (let i = 0; i < 14; i++) {
      const a = Math.PI * (i / 13) + (Math.random() - 0.5) * 0.3, r = 70 + Math.random() * 80;
      fin(mk('circle', { cx: x + (Math.random() - 0.5) * 50, cy: y + Math.random() * 16, r: 9 + Math.random() * 9, fill: i % 2 ? '#efe2c9' : '#d6c19b', stroke: '#8a6f4a', 'stroke-width': 2 }),
        [{ opacity: 0.95, transform: 'translate(0, 0) scale(.4)' }, { opacity: 0, transform: `translate(${(Math.cos(a) * r).toFixed(0)}px, ${(Math.sin(a) * r * 0.35 - 10).toFixed(0)}px) scale(1.7)` }],
        { duration: 800 + Math.random() * 300, easing: 'cubic-bezier(.15,.7,.3,1)' });
    }
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI * (0.08 + 0.84 * i / 11), r = 130 + Math.random() * 110;
      const g = mk('g', { transform: `translate(${x} ${y})` });
      const s = mk('path', { d: STAR4, fill: i % 3 ? '#ffe27a' : '#fff', stroke: '#c98a0a', 'stroke-width': 2 }, g);
      s.style.transformBox = 'fill-box'; s.style.transformOrigin = 'center';
      s.animate([{ opacity: 1, transform: 'translate(0, 0) scale(.4) rotate(0)' }, { opacity: 1, transform: `translate(${(Math.cos(a) * r * 0.7).toFixed(0)}px, ${(Math.sin(a) * r * 0.7).toFixed(0)}px) scale(1.3) rotate(90deg)`, offset: 0.6 }, { opacity: 0, transform: `translate(${(Math.cos(a) * r).toFixed(0)}px, ${(Math.sin(a) * r + 40).toFixed(0)}px) scale(.6) rotate(180deg)` }],
        { duration: 1100, easing: 'cubic-bezier(.2,.8,.4,1)' }).onfinish = () => g.remove();
    }
  }
  function toast(html) {
    const t = root.querySelector('.sx-toast');
    if (!t) return;
    t.innerHTML = html;
    t.getAnimations().forEach((a) => a.cancel());
    t.animate([
      { opacity: 0, transform: 'translate(-50%, 18px) scale(.7)' },
      { opacity: 1, transform: 'translate(-50%, 0) scale(1.08)', offset: 0.12 },
      { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: 0.2 },
      { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: 0.86 },
      { opacity: 0, transform: 'translate(-50%, -16px) scale(.95)' },
    ], { duration: 2800, easing: 'ease-out' });
  }

  /* переходы: раздел ↔ его острова (зум) */
  function setView(v) { view = v; root.dataset.view = v; }
  function resetZoom() {
    if (openI < 0) return;
    isleEls().forEach((s) => s.classList.remove('open', 'gone', 'fade', 'sw', 'sw-in'));
    root.querySelector('.hm-col').classList.remove('zoomed');
    openI = -1;
  }
  async function enterSection(si, lvl, ev) {
    if (busy) return; busy = true;
    const sx = root.querySelector('.sx-col'), col = root.querySelector('.hm-col');
    snd('pin');
    if (!reduced()) {
      const r = sx.getBoundingClientRect();
      sx.style.transformOrigin = ev ? `${ev.clientX - r.left}px ${ev.clientY - r.top}px` : '50% 50%';
      await sx.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.7)', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.55,0,.85,.35)' }).finished.catch(() => {});
    }
    setView('islands'); refresh(); openIsle(lvl >= 0 ? lvl : SECTIONS[si].base.lvl || 0);   // тап по основе — остров I
    if (!reduced()) col.animate([{ transform: 'scale(.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.2,.9,.3,1)' });
    busy = false;
  }
  async function goSections() {
    closeSheet();
    if (busy || view === 'sections') return;
    busy = true;
    const sx = root.querySelector('.sx-col'), col = root.querySelector('.hm-col');
    if (!reduced()) await col.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.8)', opacity: 0 }], { duration: 280, easing: 'cubic-bezier(.5,0,.8,.4)' }).finished.catch(() => {});
    resetZoom();
    setView('sections'); root.scrollTop = 0;
    if (!reduced()) { sx.style.transformOrigin = '50% 45%'; sx.animate([{ transform: 'scale(1.5)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.2,.9,.3,1)' }); }
    busy = false;
    refreshSections(true);
  }
  /* ---------- ТЕСТ: панель прогресса, чтобы смотреть анимации кусков (убрать перед релизом) ---------- */
  function setLvlFrac(lv, f) {
    lv.modes.forEach((m) => lsSet(`mg.solved.${m.id}`, String(Math.round(goalOf(m.id) * Math.max(0, Math.min(1, f))))));
  }
  function testPanel() {
    const sec = SECTIONS[0];
    const row = (lvl) => { const lv = sec.levels[lvl]; return `<div class="tp-row" data-l="${lvl}"><span class="tp-n">${lv.n}</span><span class="tp-t">${lv.title}</span><b class="tp-p"></b>
      <button type="button" data-d="-0.25">−25</button><button type="button" data-d="0.1">+10</button><button type="button" data-d="0.25">+25</button><button type="button" data-d="1">100%</button></div>`; };
    return `<div class="tp"><button type="button" class="tp-tg">Тест прогресса ▲</button><div class="tp-box">
      ${[0, ...sec.parts.map((pt) => pt.lvl)].sort((a, b) => a - b).map(row).join('')}
      <div class="tp-act"><button type="button" data-a="detach">Отколоть куски</button><button type="button" data-a="zero">Всё на 0%</button></div></div></div>`;
  }
  function tpSync(sx) {
    const sec = SECTIONS[0];
    sx.querySelectorAll('.tp-row').forEach((r) => { r.querySelector('.tp-p').textContent = `${Math.floor(fracOf(sec.levels[+r.dataset.l]) * 100)}%`; });
  }
  function bindTestPanel(sx) {
    const tp = sx.querySelector('.tp'), sec = SECTIONS[0];
    tp.addEventListener('click', (e) => {
      e.stopPropagation();                                              // не открывать раздел
      const b = e.target.closest('button');
      if (!b) return;
      if (b.classList.contains('tp-tg')) { const o = tp.classList.toggle('open'); b.textContent = o ? 'Тест прогресса ▼' : 'Тест прогресса ▲'; tpSync(sx); return; }
      if (busy) return;
      if (b.dataset.a === 'detach') sec.parts.forEach((pt) => { lsSet(pkey(sec, pt), '0'); lsSet(`${pkey(sec, pt)}.seen`, '0'); });
      else if (b.dataset.a === 'zero') { sec.levels.forEach((lv) => setLvlFrac(lv, 0)); sec.parts.forEach((pt) => lsSet(pkey(sec, pt), '0')); }
      else {
        const lv = sec.levels[+b.closest('.tp-row').dataset.l], d = +b.dataset.d;
        setLvlFrac(lv, d === 1 ? 1 : fracOf(lv) + d);
      }
      refresh(); refreshSections(true, true); tpSync(sx);
    });
  }
  function buildSections() {
    const sx = document.createElement('div');
    sx.className = 'sx-col';
    sx.innerHTML = `<div class="hm-title">Математические игры</div><p class="hm-sub">Выбери раздел</p>
      ${SECTIONS.map((sec, si) => `<section class="sx-sec" data-s="${si}" aria-label="${sec.title}">
        <div class="sx-head"><div class="sx-ring"></div><div class="sx-name">${sec.title}</div></div>
        <div class="sx-stage">${sectionSvg(sec, si)}</div>
        <p class="sx-tip"></p>${si < SECTIONS.length - 1 ? `<button class="sx-next" type="button" data-to="${si + 1}">${SECTIONS[si + 1].title} ↓</button>` : ''}</section>`).join('')}
      ${testPanel()}`;
    bindTestPanel(sx);
    sx.querySelectorAll('.sx-next').forEach((b) => b.addEventListener('click', (e) => {   // прокрутить к следующему разделу
      e.stopPropagation();
      const t = sx.querySelector(`.sx-sec[data-s="${b.dataset.to}"]`);
      root.scrollTo({ top: t.offsetTop - 20, behavior: reduced() ? 'auto' : 'smooth' });
    }));
    sx.querySelectorAll('.sx-sec').forEach((box) => box.addEventListener('click', (e) => {
      const tp = e.target.closest('.sx-tap'), si = +box.dataset.s;
      if (!SECTIONS[si].levels.some((l) => l.modes.length)) {           // раздел ещё без режимов
        snd('pop'); toast(`Скоро!<small>Раздел «${SECTIONS[si].title}» строится</small>`); return;
      }
      const part = e.target.closest('.sx-part') || (tp && box.querySelector(`.sx-part[data-k="${tp.dataset.k}"]`));
      const fg = e.target.closest('.sx-fog.show');                       // облако: остров ещё не открыт, но его режимы доступны
      if (fg) { enterSection(si, SECTIONS[si].parts[+fg.dataset.k].lvl, e); return; }
      if (part && part.classList.contains('ready')) { attach(si, +part.dataset.k); return; }
      if (part) { enterSection(si, SECTIONS[si].parts[+part.dataset.k].lvl, e); return; }   // открыть именно этот остров
      const gm = e.target.closest('.sx-m');                              // земля прикреплённого куска (в общей земле)
      if (gm) { enterSection(si, SECTIONS[si].parts[+gm.dataset.k].lvl, e); return; }
      enterSection(si, -1, e);
    }));
    return sx;
  }

  let built = false;
  /* v: 'sections' | 'islands'; mode — из какого режима вернулись (открываем его остров) */
  function show(v, mode) {
    if (!built) { build(); built = true; } else refresh();
    if (v === 'sections') resetZoom();
    setView(v || view);
    root.hidden = false;
    document.body.classList.add('is-home');
    if (view === 'islands') {
      const li = mode ? LEVELS.findIndex((l) => l.modes.some((m) => m.id === mode)) : -1;
      openIsle(li >= 0 ? li : openI >= 0 ? openI : 0);
    }
    root.scrollTop = 0;
    if (view === 'sections') refreshSections(true);
    startOrbit(); startJaws(); startRocket();
  }
  function hide() { root.hidden = true; const sh = root.querySelector('.hm-sheet'); if (sh) sh.classList.remove('show'); document.body.classList.remove('is-home'); }

  MG.home = { show, hide, refresh };
})();
