/* Вентилятор: иконка инструмента и анимация «дует снизу».
 *   MG.fan.icon
 *   MG.fan.start({ x, y, fs, top }) → { stop(): Promise }
 *     x, y — центр вентилятора (под знаком и вторым числом), top — до какой высоты поднимаются струи ветра
 */
(() => {
  'use strict';
  const MG = window.MG;

  const blades = (cx, cy, rx, ry, dy, fill, stroke, sw) =>
    [0, 120, 240].map((a) => `<ellipse cx="${cx}" cy="${cy - dy}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${cx} ${cy})" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`).join('');

  const icon = `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
    <path d="M24 33 V40 M15 44 H33" stroke="#64748b" stroke-width="3" fill="none"/>
    <ellipse cx="24" cy="44" rx="10" ry="2.4" fill="#94a3b8" stroke="#64748b" stroke-width="1.4"/>
    <circle cx="24" cy="19" r="15" fill="#f1f5f9" fill-opacity=".7" stroke="#64748b" stroke-width="2"/>
    <circle cx="24" cy="19" r="9" fill="none" stroke="#94a3b8" stroke-width="1"/>
    ${blades(24, 19, 4.3, 7, 7, '#7dd3fc', '#0284c7', 1.3)}
    <circle cx="24" cy="19" r="3" fill="#475569" stroke="#334155" stroke-width="1"/>
    <circle cx="23.2" cy="18.2" r=".8" fill="#fff" opacity=".8"/></svg>`;

  const style = document.createElement('style');
  style.textContent = `
    .fan-fx { position: fixed; inset: 0; pointer-events: none; z-index: 70; }
    .fan-fx .fan { position: absolute; transform-origin: 50% 100%; }
    .fan-fx .fan svg { display: block; overflow: visible; }
    .fan-fx .wind { position: absolute; width: 7px; border-radius: 5px; opacity: 0;
      background: linear-gradient(180deg, transparent, rgba(96, 165, 250, .9) 40%, rgba(59, 130, 246, .95)); }
  `;
  document.head.append(style);

  function start(o) {
    const T = MG.T;
    const fs = o.fs;
    const size = fs * 1.5;
    const layer = document.createElement('div');
    layer.className = 'fan-fx';
    document.body.append(layer);

    const fan = document.createElement('div');
    fan.className = 'fan';
    const bl = (cx, cy, rx, ry, dy, fill, stroke, sw) => blades(cx, cy, rx, ry, dy, fill, stroke, sw);
    fan.innerHTML = `<svg viewBox="0 0 48 48" width="${size}" height="${size}" stroke-linejoin="round" stroke-linecap="round">
      <path d="M24 33 V40 M15 44 H33" stroke="#64748b" stroke-width="3" fill="none"/>
      <ellipse cx="24" cy="44" rx="10" ry="2.4" fill="#94a3b8" stroke="#64748b" stroke-width="1.4"/>
      <circle cx="24" cy="19" r="15" fill="#f1f5f9" fill-opacity=".85" stroke="#64748b" stroke-width="2"/>
      <circle cx="24" cy="19" r="9" fill="none" stroke="#94a3b8" stroke-width="1"/>
      <g class="rot" style="transform-box: view-box; transform-origin: 50% 39.6%">${bl(24, 19, 4.3, 7, 7, '#7dd3fc', '#0284c7', 1.3)}
        <circle cx="24" cy="19" r="3" fill="#475569" stroke="#334155" stroke-width="1"/></g></svg>`;
    // нижний край вентилятора стоит на уровне y + size/2
    Object.assign(fan.style, { left: `${o.x - size / 2}px`, top: `${o.y - size / 2}px`, width: `${size}px`, height: `${size}px` });
    layer.append(fan);
    fan.animate([{ opacity: 0, transform: 'translateY(26px) scale(.5)' }, { opacity: 1, transform: 'translateY(0) scale(1.06)', offset: 0.7 }, { opacity: 1, transform: 'none' }],
      { duration: T(480), easing: 'ease-out', fill: 'both' });
    const rot = fan.querySelector('.rot');
    // лопасти разгоняются и крутятся
    const spin = rot.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: T(260), iterations: Infinity, easing: 'linear' });
    spin.playbackRate = 0.15;
    const ramp = setInterval(() => { spin.playbackRate = Math.min(1, spin.playbackRate + 0.08); }, 40);

    // струи ветра поднимаются вверх, к знаку и дроби
    const winds = [];
    const n = 7;
    const reach = Math.max(40, o.y - size * 0.45 - o.top);
    for (let k = 0; k < n; k++) {
      const w = document.createElement('i');
      w.className = 'wind';
      const wx = o.x + (k - (n - 1) / 2) * (size * 0.16);
      const h = 26 + (k % 3) * 14;
      Object.assign(w.style, { left: `${wx}px`, top: `${o.y - size * 0.5 - h}px`, height: `${h}px` });
      layer.append(w);
      const a = w.animate([
        { transform: 'translateY(0)', opacity: 0 },
        { transform: `translateY(${-reach * 0.35}px)`, opacity: 0.9, offset: 0.25 },
        { transform: `translateY(${-reach}px)`, opacity: 0 },
      ], { duration: T(820 + (k % 4) * 90), delay: T(200 + k * 95), iterations: Infinity, easing: 'ease-out' });
      winds.push(a);
    }

    return {
      stop() {
        clearInterval(ramp);
        return new Promise((resolve) => {
          winds.forEach((a) => { a.pause(); });
          layer.querySelectorAll('.wind').forEach((w) => w.animate([{ opacity: getComputedStyle(w).opacity }, { opacity: 0 }], { duration: T(200), fill: 'forwards' }));
          const end = layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(380), delay: T(120), fill: 'forwards' });
          end.finished.catch(() => {}).then(() => { layer.remove(); resolve(); });
        });
      },
    };
  }

  MG.fan = { icon, start };
})();
