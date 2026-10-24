/* ВАЖНО: инструмент «Рука» (hand) заменён на «Облако» (cloud) — не возвращай hand, иначе сломается домножение в common.js/borrow.js. */
/* Панель инструментов слева: в каждом режиме свой набор.
 *   MG.tools.use(режим)        — показать набор режима (вызывает app.js при переключении вкладки)
 *   MG.tools.need(id)          — true, если выбран нужный инструмент; иначе подсвечивает его и возвращает false
 *   MG.tools.auto(режим, map)  — если у текущего инструмента не осталось целей, выбрать тот, у кого они есть
 */
(() => {
  'use strict';
  const MG = window.MG;

  const ICONS = {
    hammer: `<svg viewBox="0 0 48 48"><g transform="rotate(40 24 24)">
      <rect x="21" y="14" width="6" height="31" rx="3" fill="#b7793f" stroke="#6b4423" stroke-width="1.6"/>
      <rect x="9" y="4" width="30" height="15" rx="3.5" fill="#9aa6b6" stroke="#3b4656" stroke-width="1.8"/>
      <rect x="9" y="9" width="30" height="3.4" fill="#dbe3ee" opacity=".8"/>
      <rect x="9" y="4" width="5" height="15" rx="2.5" fill="#6b7788" opacity=".55"/></g></svg>`,
    glove: `<svg viewBox="0 0 48 48" stroke-linecap="round" stroke-linejoin="round">
      <g transform="rotate(-32 24 24)">
        <rect x="5" y="14" width="38" height="21" rx="5" fill="#f8b4c3" stroke="#3b4656" stroke-width="2"/>
        <path d="M24 14 H38 a5 5 0 0 1 5 5 V30 a5 5 0 0 1 -5 5 H24 Z" fill="#5b86d8" stroke="#3b4656" stroke-width="2"/>
        <path d="M9 19.5 H20" stroke="#fde2e8" stroke-width="2.4" opacity=".9"/>
        <path d="M28 20 H39" stroke="#a9c3f5" stroke-width="2.2" opacity=".9"/>
      </g>
      <circle cx="9" cy="41" r="1.7" fill="#f8b4c3" stroke="#3b4656" stroke-width="1"/>
      <circle cx="15" cy="44" r="1.3" fill="#9ca3af" stroke="#3b4656" stroke-width=".8"/>
      <circle cx="4.5" cy="36" r="1.2" fill="#9ca3af" stroke="#3b4656" stroke-width=".8"/></svg>`,
    rocket: `<svg viewBox="0 0 48 48"><g transform="rotate(45 24 24)">
      <path d="M24 3 C33 12 33 27 29 37 H19 C15 27 15 12 24 3Z" fill="#eef2f7" stroke="#3b4656" stroke-width="1.8"/>
      <circle cx="24" cy="18" r="4.4" fill="#60a5fa" stroke="#3b4656" stroke-width="1.5"/>
      <path d="M19.4 29 L10.5 39 L19.2 36.6Z" fill="#ef4444" stroke="#3b4656" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M28.6 29 L37.5 39 L28.8 36.6Z" fill="#ef4444" stroke="#3b4656" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M20.5 37 H27.5 L24 46Z" fill="#f59e0b" stroke="#b45309" stroke-width="1.2" stroke-linejoin="round"/></g></svg>`,
    box: `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
      <polygon points="30,17 42,9 42,33 30,41" fill="#b98b55" stroke="#6b4423" stroke-width="2"/>
      <polygon points="6,17 18,9 42,9 30,17" fill="#e0bd8a" stroke="#6b4423" stroke-width="2"/>
      <rect x="6" y="17" width="24" height="24" rx="1.5" fill="#d2a468" stroke="#6b4423" stroke-width="2"/>
      <path d="M15 17 V28 L18 26 L21 28 V17" fill="#f2e4c4" stroke="#6b4423" stroke-width="1.5"/>
      <path d="M10 33 H20" stroke="#8a5f30" stroke-width="1.6" opacity=".7"/></svg>`,
    bolt: `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
      <path d="M29 2 L10 27 H21 L16 46 L38 18 H26.5 Z" fill="#facc15" stroke="#a16207" stroke-width="2"/>
      <path d="M28 7 L16 25 H24 L21 37" fill="none" stroke="#fff7b2" stroke-width="2" opacity=".85"/></svg>`,
    cloud: `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
      <path d="M13 31 C6 31 4 23 10 20 C9 13 17 9 22 14 C24 6 35 7 36.5 15 C43 14 46 23 40.5 27 C42 31 38 32 36 31 Z" fill="#f3f8ff" stroke="#5b7ea8" stroke-width="1.8"/>
      <path d="M12 24 C10 21 12.5 18.5 15 19" fill="none" stroke="#fff" stroke-width="1.8"/>
      <path d="M15.5 36 q1.6 2.6 0 4.2 q-1.6 -1.6 0 -4.2Z M24 38 q1.6 2.6 0 4.2 q-1.6 -1.6 0 -4.2Z M32.5 36 q1.6 2.6 0 4.2 q-1.6 -1.6 0 -4.2Z" fill="#60a5fa" stroke="#2563eb" stroke-width="1"/></svg>`,
    press: `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
      <rect x="0.8" y="21" width="7" height="6" fill="#aab5c4" stroke="#3b4656" stroke-width="1.4"/>
      <rect x="7" y="10" width="8" height="28" rx="2.2" fill="#8d99ab" stroke="#3b4656" stroke-width="1.6"/>
      <rect x="40.2" y="21" width="7" height="6" fill="#aab5c4" stroke="#3b4656" stroke-width="1.4"/>
      <rect x="33" y="10" width="8" height="28" rx="2.2" fill="#8d99ab" stroke="#3b4656" stroke-width="1.6"/>
      <path d="M13 13 V35 M35 13 V35" stroke="#facc15" stroke-width="2"/>
      <rect x="17" y="14" width="14" height="20" rx="3" fill="#fbbf24" stroke="#b45309" stroke-width="1.6"/>
      <circle cx="24" cy="19.5" r="1.7" fill="#7c2d12" stroke="none"/>
      <path d="M20.5 24 H27.5" stroke="#7c2d12" stroke-width="2"/>
      <circle cx="24" cy="28.5" r="1.7" fill="#7c2d12" stroke="none"/></svg>`,
    claw: `<svg viewBox="0 0 48 48">
      <line x1="24" y1="0" x2="24" y2="10" stroke="#3b4656" stroke-width="2.4" stroke-linecap="round"/>
      <rect x="21" y="8" width="6" height="6" rx="1.5" fill="#566377" stroke="#3b4656" stroke-width="1.2"/>
      <rect x="14" y="13" width="20" height="10" rx="4" fill="#aab6c6" stroke="#3b4656" stroke-width="1.6"/>
      <rect x="15.5" y="16.5" width="17" height="2.4" fill="#ef4444"/>
      <path d="M17 22 L9.5 31 L18 43" fill="none" stroke="#3b4656" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M17 22 L9.5 31 L18 43" fill="none" stroke="#cfd8e3" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M31 22 L38.5 31 L30 43" fill="none" stroke="#3b4656" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M31 22 L38.5 31 L30 43" fill="none" stroke="#cfd8e3" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="18" cy="43" r="2.2" fill="#ef4444" stroke="#3b4656" stroke-width="1"/>
      <circle cx="30" cy="43" r="2.2" fill="#ef4444" stroke="#3b4656" stroke-width="1"/></svg>`,
  };

  ICONS.axe = (window.MG.axe && (window.MG.axe.icon || window.MG.axe.svg)) || '<svg viewBox="0 0 48 48"></svg>';

  ICONS.joker = (window.MG.joker && window.MG.joker.icon) || '<svg viewBox="0 0 48 48"></svg>';

  ICONS.tread = (window.MG.tread && window.MG.tread.icon) || '<svg viewBox="0 0 48 48"></svg>';

  ICONS.bridge = (window.MG.bridge && window.MG.bridge.icon) || '<svg viewBox="0 0 48 48"></svg>';

  ICONS.fan = (window.MG.fan && window.MG.fan.icon) || '<svg viewBox="0 0 48 48"></svg>';

  ICONS.rain = (window.MG.rain && window.MG.rain.icon) || '<svg viewBox="0 0 48 48"></svg>';

  ICONS.teeth = (window.MG.teeth && window.MG.teeth.icon) || '<svg viewBox="0 0 48 48"></svg>';

  ICONS.conveyor = (window.MG.conveyor && window.MG.conveyor.icon) || '<svg viewBox="0 0 48 48"></svg>';

  ICONS.cups = (window.MG.cups && window.MG.cups.icon) || '<svg viewBox="0 0 48 48"></svg>';

  ICONS.heli = (window.MG.heli && window.MG.heli.icon) || '<svg viewBox="0 0 48 48"></svg>';

  const INFO = {
    hammer: { label: 'Кувалда', tip: 'разбивает число на множители', hot: [21, 10] },
    axe: { label: 'Топор', tip: 'срубает единицу в знаменателе — числитель падает', hot: [29, 18] },
    heli: { label: 'Вертолёт', tip: 'магнитом переставляет числа, отделяет целое от дроби и склеивает обратно', hot: [16, 8] },
    glove: { label: 'Ластик', tip: 'стирает пару одинаковых чисел: сверху и снизу у одной дроби', hot: [8, 24] },
    rocket: { label: 'Ракета', tip: 'выносит общий множитель за скобки', hot: [25, 7] },
    joker: { label: 'Джокер', tip: 'нажми на множитель — джокер станет числом; положи карту на дробь, и число появится сверху и снизу', hot: [24, 24] },
    cloud: { label: 'Облако', tip: 'схвати число и перетащи облако на дробь — числа вырастут в числителе и знаменателе', hot: [16, 16] },
    bolt: { label: 'Молния', tip: 'считает молнией: 2 · 3 → 6, 5 − 2 → 3', hot: [15, 30] },
    press: { label: 'Поршни', tip: 'сжимают дроби с одинаковыми знаменателями в одну', hot: [16, 16] },
    tread: { label: 'Беговая дорожка', tip: 'неправильная дробь бежит и сжигает лишнее — выходят целые', hot: [24, 40] },
    bridge: { label: 'Мост', tip: 'нажми на точку между дробями — мост соединит их в одну дробь', hot: [16, 14] },
    fan: { label: 'Вентилятор', tip: 'дует снизу: делитель переворачивается, а деление становится умножением', hot: [16, 16] },
    rain: { label: 'Облако', tip: 'польёт целое число дождём — под ним вырастет единица, и целое станет дробью', hot: [16, 14] },
    teeth: { label: 'Зубы', tip: 'дробь съедает целое число — оно уходит в числитель, и смешанное число становится дробью', hot: [8, 24] },
    conveyor: { label: 'Конвейер', tip: 'потяни число через знак «=» — конвейер перенесёт его на другую сторону', hot: [16, 20] },
    cups: { label: 'Стаканчики', tip: 'накрывают обе части уравнения и меняют их местами', hot: [16, 18] },
    box: { label: 'Коробка', tip: 'накрывает слагаемые — получаются скобки; нажми на скобки, и коробка откроется', hot: [16, 22] },
    claw: { label: 'Клешня', tip: 'отщипывает единицу от целого', hot: [16, 29] },
  };

  const SETS = {
    cancel: ['hammer', 'glove'],
    factor: ['hammer', 'rocket', 'glove', 'axe'],
    common: ['hammer', 'joker', 'press', 'bolt', 'glove'],
    big: ['hammer', 'joker', 'press', 'bolt', 'glove'],
    borrow: ['claw', 'joker', 'press', 'bolt', 'glove'],
    mul: ['bridge', 'hammer', 'glove'],
    div: ['fan', 'bridge', 'hammer', 'glove'],
    whole: ['rain', 'bridge', 'hammer', 'glove'],
    prop: ['conveyor', 'cups', 'axe', 'hammer', 'glove'],
    shift: ['heli', 'bolt', 'conveyor'],
    br: ['box', 'joker', 'press', 'bolt', 'rain', 'hammer', 'glove', 'rocket'],
    mixmd: ['teeth', 'fan', 'bridge', 'hammer', 'glove'],
    mixed: ['heli', 'hammer', 'tread', 'joker', 'press', 'bolt', 'glove'],
  };

  /* курсоры из тех же иконок */
  const root = document.documentElement;
  Object.entries(INFO).forEach(([id, inf]) => {
    if (!inf.hot) { root.style.setProperty('--cur-hand', 'grab'); return; }
    const svg = ICONS[id].replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" ');
    root.style.setProperty(`--cur-${id}`, `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${inf.hot[0]} ${inf.hot[1]}, pointer`);
  });

  const bar = document.createElement('aside');
  bar.className = 'toolbar';
  bar.setAttribute('aria-label', 'Инструменты');
  document.body.append(bar);

  let mode = null;
  let current = null;
  const offUntil = {};
  const lastByMode = {};
  let tipTimer = 0;

  function paintSelection() {
    bar.querySelectorAll('.tool').forEach((b) => {
      const on = b.dataset.id === current;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    document.body.dataset.tool = current || '';
  }

  function render() {
    bar.innerHTML = '';
    SETS[mode].forEach((id, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tool';
      b.dataset.id = id;
      b.title = `${INFO[id].label} — ${INFO[id].tip} (клавиша ${i + 1})`;
      b.innerHTML = `${ICONS[id]}<span>${INFO[id].label}</span><i class="key">${i + 1}</i>`;
      b.addEventListener('click', () => select(id));
      const left = (offUntil[id] || 0) - Date.now();
      if (left > 0) { b.classList.add('gone', 'icon-off'); b.style.setProperty('--dur', `${left}ms`); }
      bar.append(b);
    });
  }

  const isOff = (id) => (offUntil[id] || 0) > Date.now();

  function select(id) {
    if (!mode || !SETS[mode].includes(id)) return;
    if (isOff(id)) { need(id); return; }
    current = id;
    lastByMode[mode] = id;
    paintSelection();
    window.dispatchEvent(new CustomEvent('toolchange', { detail: { tool: id } }));
  }

  function use(name) {
    if (!SETS[name]) return;
    mode = name;
    render();
    current = lastByMode[name] && SETS[name].includes(lastByMode[name]) ? lastByMode[name] : SETS[name][0];
    paintSelection();
  }

  /* иконка рассыпается пылью — тот же эффект, что у чисел */
  function snapIcon(svg) {
    return new Promise((resolve) => {
      const r = svg.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', w);
      clone.setAttribute('height', h);
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        const pts = [];
        for (let y = 0; y < h; y += 2) {
          for (let x = 0; x < w; x += 2) {
            const i = (y * w + x) * 4;
            if (data[i + 3] > 110) pts.push([x, y, `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`]);
          }
        }
        pts.sort(() => Math.random() - 0.5);

        const glow = svg.animate([
          { filter: 'drop-shadow(0 0 0 rgba(251,191,36,0))', scale: '1' },
          { filter: 'drop-shadow(0 0 7px rgba(251,191,36,.95))', scale: '1.08' },
        ], { duration: MG.T(140), easing: 'ease-out', fill: 'forwards' });
        glow.onfinish = () => {
          const sweep = MG.T(560);
          const grad = 'linear-gradient(90deg, transparent 0%, transparent 40%, #000 60%, #000 100%)';
          svg.style.webkitMaskImage = grad; svg.style.maskImage = grad;
          svg.style.webkitMaskSize = '300% 100%'; svg.style.maskSize = '300% 100%';
          const a = svg.animate([
            { maskPosition: '100% 0', webkitMaskPosition: '100% 0' },
            { maskPosition: '0% 0', webkitMaskPosition: '0% 0' },
          ], { duration: sweep, easing: 'ease-in', fill: 'forwards' });
          const ps = Math.max(2.5, w / 17);
          pts.slice(0, 160).forEach(([px, py, color]) => {
            const d = document.createElement('i');
            d.className = 'dust';
            Object.assign(d.style, {
              left: `${r.left + px}px`, top: `${r.top + py}px`,
              width: `${ps}px`, height: `${ps}px`, background: color,
            });
            document.body.append(d);
            const dx = 50 + Math.random() * 150;
            const dy = -100 + Math.random() * 130;
            const rot = (Math.random() - 0.5) * 540;
            d.animate([
              { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
              { transform: `translate(${dx * 0.4}px, ${dy * 0.4}px) rotate(${rot * 0.4}deg) scale(1)`, opacity: 0.9, offset: 0.35 },
              { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(0)`, opacity: 0 },
            ], {
              duration: MG.T(800 + Math.random() * 700),
              delay: (px / w) * sweep * 0.8 + Math.random() * 60,
              easing: 'ease-out',
              fill: 'backwards',
            }).onfinish = () => d.remove();
          });
          a.onfinish = () => resolve();
        };
      };
      img.onerror = () => resolve();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
    });
  }

  function resetIcon(btn) {
    const sv = btn.querySelector('svg');
    if (!sv) return;
    sv.getAnimations().forEach((a) => a.cancel());
    ['maskImage', 'webkitMaskImage', 'maskSize', 'webkitMaskSize'].forEach((p) => { sv.style[p] = ''; });
  }

  function showTip(btn, text) {
    bar.querySelectorAll('.tool-tip').forEach((t) => t.remove());
    const tip = document.createElement('div');
    tip.className = 'tool-tip';
    tip.textContent = text;
    btn.append(tip);
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => tip.remove(), 2200);
  }

  function need(id) {
    if (current === id && !isOff(id)) return true;
    const btn = bar.querySelector(`.tool[data-id="${id}"]`);
    if (btn) {
      btn.classList.remove('nudge');
      void btn.offsetWidth;
      btn.classList.add('nudge');
      showTip(btn, isOff(id) ? `Инструмент «${INFO[id].label}» вернётся через пару секунд` : `Здесь нужен инструмент «${INFO[id].label}»`);
    }
    return false;
  }

  function auto(name, has) {
    if (name !== mode) return;
    if (has[current] && !isOff(current)) return;
    const next = SETS[mode].find((id) => has[id] && !isOff(id));
    if (!next) return;
    select(next);
    const btn = bar.querySelector(`.tool[data-id="${next}"]`);
    if (btn) { btn.classList.remove('swap'); void btn.offsetWidth; btn.classList.add('swap'); }
  }

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || !mode) return;
    const n = Number(e.key);
    if (n >= 1 && n <= SETS[mode].length) select(SETS[mode][n - 1]);
  });

  /* инструмент исчезает на ms миллисекунд (например, после ошибки) */
  function disable(id, ms) {
    if (!mode || !SETS[mode].includes(id)) return;
    offUntil[id] = Date.now() + ms;
    const btn = bar.querySelector(`.tool[data-id="${id}"]`);
    if (btn) {
      btn.style.setProperty('--dur', `${ms}ms`);
      btn.classList.remove('back', 'icon-off');
      btn.classList.add('gone');
      snapIcon(btn.querySelector('svg')).then(() => { if (isOff(id)) btn.classList.add('icon-off'); });
    }
    if (current === id) {
      const other = SETS[mode].find((x) => x !== id && !isOff(x));
      if (other) select(other);
    }
    setTimeout(() => {
      const b = bar.querySelector(`.tool[data-id="${id}"]`);
      if (b) {
        resetIcon(b);
        b.classList.remove('gone', 'icon-off');
        b.classList.add('back');
        setTimeout(() => b.classList.remove('back'), 700);
      }
    }, ms);
  }

  /* ластик стирает число: ездит туда-сюда, число стирается следом, крошки сыплются вниз */
  function erase(el, delay = 0) {
    return new Promise((resolve) => {
      const run = () => {
        const r = el.getBoundingClientRect();
        const fs = parseFloat(getComputedStyle(el).fontSize) || 48;
        const ew = Math.max(38, fs * 0.8);
        const er = document.createElement('div');
        er.className = 'eraser-fx';
        er.innerHTML = ICONS.glove.replace('<svg ', `<svg width="${ew}" height="${ew}" `);
        document.body.append(er);
        const cy = r.top + r.height * 0.58;
        const x0 = r.left - ew * 0.15;
        const span = r.width + ew * 0.3;
        const dur = MG.T(900);
        const t0 = performance.now();
        let lastCrumb = 0;
        const crumb = (x, y) => {
          const c = document.createElement('i');
          c.className = 'crumb';
          const s = 3 + Math.random() * 3.5;
          Object.assign(c.style, {
            left: `${x}px`, top: `${y}px`, width: `${s}px`, height: `${s * (0.6 + Math.random() * 0.6)}px`,
            background: Math.random() < 0.6 ? '#f8b4c3' : '#9ca3af',
          });
          document.body.append(c);
          const dx = (Math.random() - 0.5) * 50;
          c.animate([
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${dx}px, ${fs * 0.7 + Math.random() * 30}px) rotate(${(Math.random() - 0.5) * 540}deg)`, opacity: 0 },
          ], { duration: MG.T(600 + Math.random() * 400), easing: 'cubic-bezier(.3,0,.8,.6)' }).onfinish = () => c.remove();
        };
        (function frame(now) {
          const p = Math.min(1, (now - t0) / dur);
          const e = p * (2 - p) * 0.35 + p * 0.65;                 // чуть быстрее в начале
          const wob = Math.sin(p * Math.PI * 7) * ew * 0.28 * (1 - p * 0.4);
          const x = x0 + span * e + wob;
          const y = cy + Math.sin(p * Math.PI * 14) * 2.5;
          er.style.transform = `translate(${x - ew / 2}px, ${y - ew / 2}px) rotate(${wob > 0 ? -6 : 6}deg)`;
          const g = Math.max(0, Math.min(100, ((x0 + span * e - r.left) / r.width) * 100));
          const m = `linear-gradient(90deg, transparent ${g}%, #000 ${Math.min(100, g + 8)}%)`;
          el.style.webkitMaskImage = m; el.style.maskImage = m;
          if (now - lastCrumb > 45 && p < 0.97) { lastCrumb = now; crumb(x - ew * 0.25, y + ew * 0.2); crumb(x, y + ew * 0.25); }
          if (p < 1) requestAnimationFrame(frame);
          else {
            el.style.webkitMaskImage = 'linear-gradient(transparent, transparent)';
            el.style.maskImage = 'linear-gradient(transparent, transparent)';
            er.animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '14px -10px' }], { duration: MG.T(220), fill: 'forwards' })
              .onfinish = () => er.remove();
            resolve();
          }
        })(t0);
      };
      if (delay) setTimeout(run, MG.T(delay)); else run();
    });
  }
  MG.erase = erase;

  MG.tools = { use, need, auto, disable, pick: select, current: () => current };
})();
