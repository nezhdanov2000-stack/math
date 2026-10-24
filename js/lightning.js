/* Молния: бьёт с неба в указанные элементы, а на их местах «вырастают» числа.
 *   MG.lightning([el1, el2], { color })  — элементы должны быть спрятаны (opacity: 0);
 *   промис завершается, когда молния ударила в последний из них, и каждый элемент появляется в момент удара.
 */
(() => {
  'use strict';
  const MG = window.MG;
  const NS = 'http://www.w3.org/2000/svg';
  const rnd = MG.rnd;

  /* зубчатая линия от (x0,y0) до (x1,y1) */
  function zigzag(x0, y0, x1, y1, steps, amp) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const pts = [[x0, y0]];
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const off = rnd(-1, 1) * amp * (1 - 0.55 * t);
      pts.push([x0 + dx * t + px * off, y0 + dy * t + py * off]);
    }
    pts.push([x1, y1]);
    return pts;
  }
  const toPath = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

  function addPath(svg, d, color, width, blur) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', color);
    p.setAttribute('stroke-width', width);
    p.setAttribute('stroke-linejoin', 'miter');
    p.setAttribute('stroke-linecap', 'round');
    if (blur) p.style.filter = `blur(${blur}px)`;
    svg.append(p);
    return p;
  }

  function reveal(el, color) {
    el.style.opacity = '';
    el.animate([
      { scale: '.45', opacity: 0, filter: 'brightness(3) drop-shadow(0 0 16px #fde047)' },
      { scale: '1.22', opacity: 1, filter: 'brightness(1.7) drop-shadow(0 0 12px #fde047)', offset: 0.35 },
      { scale: '1', opacity: 1, filter: 'brightness(1) drop-shadow(0 0 0 transparent)' },
    ], { duration: MG.T(620), easing: MG.EASE });
    MG.burst(el, '#facc15', 10);
    MG.burst(el, color || '#fde047', 6);
  }

  function lightning(els, { color, reveal: doReveal = true } = {}) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    Object.assign(svg.style, { position: 'fixed', left: 0, top: 0, zIndex: 80, pointerEvents: 'none' });
    document.body.append(svg);

    const flash = document.createElement('div');
    Object.assign(flash.style, {
      position: 'fixed', inset: 0, zIndex: 79, pointerEvents: 'none',
      background: 'radial-gradient(circle at 50% 40%, rgba(255,251,200,.55), rgba(255,240,150,.2))', opacity: 0,
    });
    document.body.append(flash);

    const DRAW = MG.T(120);
    const GAP = MG.T(90);
    const all = els.map((el, i) => new Promise((resolve) => {
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        const x1 = r.left + r.width / 2;
        const y1 = r.top + r.height / 2;
        const x0 = Math.max(24, Math.min(W - 24, x1 + rnd(-160, 160)));
        const main = zigzag(x0, -12, x1, y1, 10, Math.max(26, Math.min(70, y1 * 0.12)));
        let d = toPath(main);
        // пара боковых ответвлений
        for (let k = 0; k < 2; k++) {
          const s = main[2 + Math.floor(Math.random() * (main.length - 5))];
          const side = Math.random() < 0.5 ? -1 : 1;
          d += ' ' + toPath(zigzag(s[0], s[1], s[0] + side * rnd(40, 110), s[1] + rnd(50, 120), 4, 16));
        }
        const g = document.createElementNS(NS, 'g');
        svg.append(g);
        const layers = [
          addPath(g, d, 'rgba(250,204,21,.55)', 16, 7),
          addPath(g, d, '#fde047', 5.5),
          addPath(g, d, '#ffffff', 2.4),
        ];
        layers.forEach((p) => {
          const len = p.getTotalLength();
          p.style.strokeDasharray = len;
          p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: DRAW, easing: 'ease-in', fill: 'forwards' });
        });
        g.animate([
          { opacity: 1 }, { opacity: 0.35, offset: 0.25 }, { opacity: 1, offset: 0.4 },
          { opacity: 0.5, offset: 0.6 }, { opacity: 0 },
        ], { duration: MG.T(560), delay: DRAW, easing: 'linear', fill: 'both' });

        setTimeout(() => {
          if (doReveal) reveal(el, color);
          else { MG.burst(el, '#facc15', 12); MG.burst(el, '#ffffff', 8); }
          flash.animate([{ opacity: 0 }, { opacity: 1, offset: 0.18 }, { opacity: 0 }], { duration: MG.T(320), easing: 'ease-out' });
          document.body.animate([
            { translate: '0 0' }, { translate: '-4px 2px' }, { translate: '4px -2px' }, { translate: '-2px 1px' }, { translate: '0 0' },
          ], { duration: MG.T(240) });
          resolve();
        }, DRAW);
      }, i * GAP);
    }));

    return Promise.all(all).then(() => {
      setTimeout(() => { svg.remove(); flash.remove(); }, MG.T(700));
    });
  }

  MG.lightning = lightning;
})();
