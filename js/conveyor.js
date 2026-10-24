/* Инструмент «Конвейер»: знак «=» превращается в ленту «/» (или «\»), число едет по ней
 * на другую сторону уравнения, а лента снова становится знаком «=».
 *   MG.conveyor.icon
 *   MG.conveyor.open({ fs, cx, cy, eqW, ang, eqEl }) → Promise<belt>
 *       belt.start / belt.end — точки, где число заезжает на ленту и съезжает с неё
 *       belt.close({ cx, cy }) — лента сворачивается обратно в «=» (в новом месте)
 */
(() => {
  'use strict';
  const MG = window.MG;
  const T = MG.T;

  const icon = `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
    <g transform="translate(24 25) rotate(-38) scale(.92) translate(-24 -26)">
    <rect x="4" y="29" width="40" height="11" rx="5.5" fill="#475569" stroke="#1f2937" stroke-width="1.8"/>
    <path d="M12 29 L8 40 M20 29 L16 40 M28 29 L24 40 M36 29 L32 40" stroke="#64748b" stroke-width="2.4" fill="none"/>
    <circle cx="9.5" cy="34.5" r="4.4" fill="#cbd5e1" stroke="#1f2937" stroke-width="1.6"/>
    <circle cx="38.5" cy="34.5" r="4.4" fill="#cbd5e1" stroke="#1f2937" stroke-width="1.6"/>
    <circle cx="9.5" cy="34.5" r="1.3" fill="#1f2937" stroke="none"/>
    <circle cx="38.5" cy="34.5" r="1.3" fill="#1f2937" stroke="none"/>
    <rect x="17" y="13" width="14" height="14.5" rx="2.2" fill="#fbbf24" stroke="#b45309" stroke-width="1.8"/>
    <path d="M17 18.5 H31" stroke="#b45309" stroke-width="1.4" fill="none"/>
    <path d="M7 22 H12 M9.6 19.4 L12.2 22 L9.6 24.6" stroke="#16a34a" stroke-width="2.2" fill="none"/>
    </g></svg>`;

  const style = document.createElement('style');
  style.textContent = `
    .cv-root { position: fixed; width: 0; height: 0; z-index: 60; pointer-events: none; }
    .cv-bar, .cv-belt { position: absolute; left: 0; top: 0; translate: -50% -50%; border-radius: 999px; }
    .cv-bar { background: var(--ink, #1f2937); }
    .cv-belt {
      background:
        repeating-linear-gradient(90deg, #3f4b5e 0 1.1em, #5a6a82 1.1em 2.2em);
      box-shadow: inset 0 .16em 0 rgba(255,255,255,.28), inset 0 -.16em 0 rgba(0,0,0,.28), 0 .1em .45em rgba(15,23,42,.35);
      animation: cvrun .55s linear infinite;
      border: .1em solid #1f2937;
      box-sizing: border-box;
    }
    .cv-belt::before, .cv-belt::after {
      content: ''; position: absolute; top: 50%; width: 1.5em; height: 1.5em; translate: 0 -50%;
      border-radius: 50%; background: radial-gradient(circle at 50% 50%, #1f2937 0 .22em, #cbd5e1 .24em);
      border: .1em solid #1f2937; box-sizing: border-box;
    }
    .cv-belt::before { left: -.55em; }
    .cv-belt::after { right: -.55em; }
    @keyframes cvrun { from { background-position-x: 0; } to { background-position-x: 2.2em; } }
  `;
  document.head.append(style);

  async function open(o) {
    const { fs, cx, cy, eqW, ang, eqEl } = o;
    const L = fs * 2.6;
    const th = fs * 0.24;
    const w0 = eqW * 0.85, h0 = eqW * 0.175, g0 = eqW * 0.4;
    const deg = (ang * 180) / Math.PI;
    const root = document.createElement('div');
    root.className = 'cv-root';
    root.style.left = `${cx}px`;
    root.style.top = `${cy}px`;
    const mk = (cls) => { const d = document.createElement('div'); d.className = cls; return d; };
    const b1 = mk('cv-bar'), b2 = mk('cv-bar'), belt = mk('cv-belt');
    [b1, b2].forEach((b) => { b.style.width = `${w0}px`; b.style.height = `${h0}px`; });
    belt.style.width = `${L}px`;
    belt.style.height = `${th}px`;
    belt.style.fontSize = `${th * 0.62}px`;
    belt.style.transform = `rotate(${deg}deg)`;
    belt.style.opacity = '0';
    root.append(belt, b1, b2);
    document.body.append(root);
    if (eqEl) eqEl.style.visibility = 'hidden';

    const ease = 'cubic-bezier(.5,0,.2,1)';
    const tf = (a, g) => `rotate(${a}deg) translateY(${g}px)`;
    const run = (el, kf, ms) => el.animate(kf, { duration: T(ms), easing: ease, fill: 'forwards' }).finished.catch(() => {});

    // «=» → «//»
    await Promise.all([
      run(b1, [{ transform: tf(0, -g0 / 2), width: `${w0}px` }, { transform: tf(deg, -g0 / 2), width: `${L}px` }], 420),
      run(b2, [{ transform: tf(0, g0 / 2), width: `${w0}px` }, { transform: tf(deg, g0 / 2), width: `${L}px` }], 420),
    ]);
    // «//» → «/» : полосы сливаются в ленту
    await Promise.all([
      run(b1, [{ transform: tf(deg, -g0 / 2), opacity: 1 }, { transform: tf(deg, 0), opacity: 0 }], 450),
      run(b2, [{ transform: tf(deg, g0 / 2), opacity: 1 }, { transform: tf(deg, 0), opacity: 0 }], 450),
      run(belt, [{ opacity: 0, scale: '1 .3' }, { opacity: 1, scale: '1 1' }], 450),
    ]);
    b1.style.opacity = b2.style.opacity = '0';
    belt.style.opacity = '1';

    const dx = Math.cos(ang), dy = Math.sin(ang);
    const k = L * 0.4;
    const api = {
      start: { x: cx - dx * k, y: cy - dy * k },
      end: { x: cx + dx * k, y: cy + dy * k },
      async close(o2) {
        const mx = o2.cx - cx, my = o2.cy - cy;
        const w1 = o2.eqW || eqW;
        const w1b = w1 * 0.85, h1 = w1 * 0.175, g1 = w1 * 0.4;
        b1.style.opacity = b2.style.opacity = '';
        const slide = root.animate([{ translate: '0 0' }, { translate: `${mx}px ${my}px` }],
          { duration: T(870), easing: ease, fill: 'forwards' });
        // «/» → «//»
        await Promise.all([
          run(belt, [{ opacity: 1 }, { opacity: 0 }], 420),
          run(b1, [{ transform: tf(deg, 0), opacity: 0 }, { transform: tf(deg, -g0 / 2), opacity: 1 }], 420),
          run(b2, [{ transform: tf(deg, 0), opacity: 0 }, { transform: tf(deg, g0 / 2), opacity: 1 }], 420),
        ]);
        // «//» → «=»
        await Promise.all([
          run(b1, [{ transform: tf(deg, -g0 / 2), width: `${L}px`, height: `${h0}px` },
            { transform: tf(0, -g1 / 2), width: `${w1b}px`, height: `${h1}px` }], 450),
          run(b2, [{ transform: tf(deg, g0 / 2), width: `${L}px`, height: `${h0}px` },
            { transform: tf(0, g1 / 2), width: `${w1b}px`, height: `${h1}px` }], 450),
        ]);
        await slide.finished.catch(() => {});
        if (eqEl) eqEl.style.visibility = '';
        root.remove();
      },
    };
    return api;
  }

  /* шестерёнка: крутится на ленте, а потом превращается в знак умножения */
  function gear(size) {
    const NS = 'http://www.w3.org/2000/svg';
    const teeth = 8;
    let d = '';
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const pt = (r, da) => `${(Math.cos(a + da) * r).toFixed(2)},${(Math.sin(a + da) * r).toFixed(2)}`;
      d += `${i ? 'L' : 'M'}${pt(8.2, -0.2)} L${pt(10.8, -0.12)} L${pt(10.8, 0.12)} L${pt(8.2, 0.2)} `;
      const b = a + Math.PI / teeth;
      d += `L${(Math.cos(b - 0.1) * 8.2).toFixed(2)},${(Math.sin(b - 0.1) * 8.2).toFixed(2)} L${(Math.cos(b + 0.1) * 8.2).toFixed(2)},${(Math.sin(b + 0.1) * 8.2).toFixed(2)} `;
    }
    d += 'Z';
    const wrap = document.createElement('div');
    Object.assign(wrap.style, { position: 'fixed', left: 0, top: 0, width: `${size}px`, height: `${size}px`, zIndex: 62, pointerEvents: 'none', translate: `${-size / 2}px ${-size / 2}px` });
    wrap.innerHTML = `<svg viewBox="-12 -12 24 24" width="${size}" height="${size}" overflow="visible" stroke-linejoin="round">
      <path d="${d}" fill="#c4b5fd" stroke="#7c6fe0" stroke-width="1.2"/>
      <circle r="5.2" fill="#a78bfa" stroke="#7c6fe0" stroke-width="1"/>
      <circle r="2.3" fill="#9ca3af" stroke="#6b7280" stroke-width=".8"/></svg>`;
    const svg = wrap.firstElementChild;
    const spin = svg.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: T(1300), iterations: Infinity });
    return { el: wrap, svg, spin };
  }

  MG.conveyor = { icon, open, gear };
})();
