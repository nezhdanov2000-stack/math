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
      <ellipse cx="200" cy="226" rx="178" ry="32" fill="#a5753f" stroke="#5e3f1e" stroke-width="3"/>
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
    .hm-back { display: none; align-self: flex-start; margin: 4px 0 0; border: 0; border-radius: 99px; padding: 8px 16px; font: inherit; font-weight: 800; color: #fff1cf; background: #5a3512; box-shadow: 0 3px 0 #2d1a08; cursor: pointer; }
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
    col.innerHTML = `<div class="hm-title">Математические игры</div><p class="hm-sub">Выбери остров</p>`;
    col.insertAdjacentHTML('beforeend', '<button class="hm-back" type="button">← Все острова</button>');
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
    root.replaceChildren(Object.assign(document.createElement('div'), { className: 'hm-sky' }), Object.assign(document.createElement('div'), { className: 'hm-stars' }), col);
    const dock = Object.assign(document.createElement('nav'), { className: 'hm-dock', innerHTML: TABS.map(([k, n]) => `<button type="button" data-tab="${k}">${IC[k]}<span>${n}</span></button>`).join('') });
    dock.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => (b.classList.contains('on') ? closeSheet() : openSheet(b.dataset.tab))));
    root.append(dock, Object.assign(document.createElement('div'), { className: 'hm-sheet' }));
    root.querySelectorAll('.pin').forEach((b) => b.addEventListener('click', () => MG.go && MG.go(b.dataset.mode)));
    const isles = [...col.querySelectorAll('.isle')];
    isles.forEach((sec, i) => sec.addEventListener('click', (e) => { if (!sec.classList.contains('open') && !e.target.closest('.pin')) openIsle(i); }));
    col.querySelector('.hm-back').addEventListener('click', closeIsle);
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
    if (tab === 'map') return `<h2>Разделы</h2><p>Выбери, что изучать.</p><div class="cards"><div class="cd go" data-act="close"><span class="em">➗</span><span>Дроби<small>4 острова · ${all.length} режимов — ты здесь</small></span></div><div class="cd off"><span class="em">⚖️</span><span>Уравнения<small>Скоро</small></span></div></div>`;
    if (tab === 'trophy') {
      const full = LEVELS.filter((l) => l.modes.every((m) => sol(m) >= goalOf(m.id))).length;
      const A = [['🌱', 'Первый шаг', 'Реши первую задачу', total >= 1], ['🔥', 'Разогрев', 'Реши 10 задач', total >= 10], ['🎯', 'Полсотни', 'Реши 50 задач', total >= 50], ['🏝️', 'Остров покорён', 'Закрой любой остров на 100%', full >= 1], ['👑', 'Мастер дробей', 'Закрой все острова', full === LEVELS.length]];
      return `<h2>Достижения и статистика</h2><p>Твой путь по островам.</p><div class="big"><div><b>${total}</b>решено</div><div><b>${Math.round(total / goal * 100)}%</b>прогресс</div><div><b>${full}/${LEVELS.length}</b>островов</div></div><div class="cards">${A.map(([e, t, d, ok]) => `<div class="cd${ok ? '' : ' off'}"><span class="em">${ok ? e : '🔒'}</span><span>${t}<small>${d}</small></span></div>`).join('')}</div><button class="rst sw" type="button">Ручное разбиение (тест): ${MG.clip && MG.clip.forced() ? 'включено' : 'выключено'} — нажми, чтобы сменить</button><button class="rst" type="button">Сбросить прогресс (для теста)</button>`;
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
    const swb = sh.querySelector('.rst.sw');
    if (swb) swb.onclick = () => { if (!MG.clip) return; MG.clip.setForced(!MG.clip.forced()); swb.textContent = `Ручное разбиение (тест): ${MG.clip.forced() ? 'включено' : 'выключено'} — нажми, чтобы сменить`; };
    const rst = sh.querySelector('.rst:not(.sw)');
    if (rst) rst.onclick = () => {
      if (!rst.classList.contains('ask')) { rst.classList.add('ask'); rst.textContent = 'Точно сбросить? Нажми ещё раз'; return; }
      try { Object.keys(localStorage).filter((k) => /^mg\.(solved|tut)/.test(k)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* нет хранилища */ }
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
  let busy = false, openI = -1, savedScroll = 0;
  const isleEls = () => [...root.querySelectorAll('.isle')];
  const restart = () => setTimeout(() => { startOrbit(); startJaws(); startRocket(); }, 560);
  function openIsle(i) {
    if (busy) return; busy = true;
    const els = isleEls(), col = root.querySelector('.hm-col');
    savedScroll = root.scrollTop; openI = i;
    els.forEach((s, k) => { if (k !== i) s.classList.add('fade'); });
    setTimeout(() => {
      els.forEach((s, k) => { if (k !== i) s.classList.add('gone'); });
      col.classList.add('zoomed'); root.scrollTop = 0;
      requestAnimationFrame(() => { els[i].classList.add('open'); dotsUpdate(); busy = false; restart(); });
    }, 260);
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
  function closeIsle() {
    if (busy || openI < 0) return; busy = true;
    const els = isleEls(), col = root.querySelector('.hm-col');
    els[openI].classList.remove('open'); col.classList.remove('zoomed');
    els.forEach((s) => s.classList.remove('gone'));
    root.scrollTop = savedScroll;
    requestAnimationFrame(() => { els.forEach((s) => s.classList.remove('fade')); });
    openI = -1; setTimeout(() => { busy = false; }, 300); restart();
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

  let built = false;
  function show() {
    if (!built) { build(); built = true; } else refresh();
    root.hidden = false;
    document.body.classList.add('is-home');
    root.scrollTop = 0;
    startOrbit(); startJaws(); startRocket();
  }
  function hide() { root.hidden = true; const sh = root.querySelector('.hm-sheet'); if (sh) sh.classList.remove('show'); document.body.classList.remove('is-home'); }

  MG.home = { show, hide, refresh };
})();
