/* «Кубик льда»: сумма или разность на мгновение замерзает — слагаемые сокращать нельзя.
 *   MG.ice([el, el, ...], { key })  — els: всё, что входит в сумму (слагаемые, знаки, скобки).
 *   Промис завершается, когда лёд растаял. Повторный вызов с тем же key во время анимации игнорируется.
 */
(() => {
  'use strict';
  const MG = window.MG;
  const NS = 'http://www.w3.org/2000/svg';
  const rnd = MG.rnd;

  const style = document.createElement('style');
  style.textContent = `
    .ice-cube {
      position: fixed; z-index: 55; pointer-events: none; overflow: hidden;
      background:
        linear-gradient(135deg, rgba(240, 251, 255, .5) 0%, rgba(168, 218, 248, .3) 46%, rgba(196, 234, 255, .5) 100%);
      border: 1.5px solid rgba(255, 255, 255, .85);
      box-shadow:
        inset 3px 3px 0 rgba(255, 255, 255, .55),
        inset -3px -3px 0 rgba(86, 160, 226, .35),
        inset 0 0 18px rgba(255, 255, 255, .55),
        0 10px 22px rgba(70, 140, 215, .32);
      backdrop-filter: blur(.8px) saturate(1.3) brightness(1.05);
      -webkit-backdrop-filter: blur(.8px) saturate(1.3) brightness(1.05);
    }
    .ice-cube::before {            /* верхняя грань: трапеция, как у настоящего кубика */
      content: ''; position: absolute; left: 0; right: 0; top: 0; height: 17%;
      background: linear-gradient(180deg, rgba(255, 255, 255, .7), rgba(255, 255, 255, .12));
      clip-path: polygon(0 0, 100% 0, calc(100% - 9px) 100%, 9px 100%);
    }
    .ice-cube::after {             /* косая грань-преломление */
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(115deg, rgba(255, 255, 255, .32) 0 22%, rgba(255, 255, 255, 0) 22% 62%, rgba(120, 190, 240, .2) 62% 100%);
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
    }
    .ice-cube svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .ice-glare {
      position: absolute; top: -20%; bottom: -20%; width: 14%; left: 0;
      background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, .7), rgba(255, 255, 255, 0));
      transform: skewX(-22deg);
    }
    .ice-drop {
      position: fixed; z-index: 54; pointer-events: none; width: 7px; height: 10px;
      background: radial-gradient(circle at 35% 30%, #fff, #7dc4f3 70%);
      border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%;
    }
    .frozen { color: #4c86bd !important; text-shadow: 0 0 .3em rgba(170, 220, 255, .95); transition: color .3s, text-shadow .3s; }
  `;
  document.head.append(style);

  const running = new Set();

  function cracks(w, h) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    const mkLine = (x0, y0, x1, y1, width) => {
      const steps = 4;
      let d = `M${x0} ${y0}`;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        d += ` L${(x0 + (x1 - x0) * t + rnd(-5, 5)).toFixed(1)} ${(y0 + (y1 - y0) * t + rnd(-5, 5)).toFixed(1)}`;
      }
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', 'rgba(255,255,255,.85)');
      p.setAttribute('stroke-width', width);
      p.setAttribute('stroke-linecap', 'butt');
      p.setAttribute('stroke-linejoin', 'miter');
      svg.append(p);
      return p;
    };
    const lines = [];
    for (let i = 0; i < 3; i++) {
      const x0 = rnd(0.1, 0.9) * w;
      const fromTop = Math.random() < 0.5;
      const y0 = fromTop ? 0 : h;
      const x1 = x0 + rnd(-0.18, 0.18) * w;
      const y1 = y0 + (fromTop ? 1 : -1) * rnd(0.35, 0.6) * h;
      lines.push(mkLine(x0, y0, x1, y1, 1.3));
      lines.push(mkLine((x0 + x1) / 2, (y0 + y1) / 2, (x0 + x1) / 2 + rnd(-0.12, 0.12) * w, (y0 + y1) / 2 + (fromTop ? 1 : -1) * rnd(0.1, 0.2) * h, 1.1));
    }
    for (let i = 0; i < 6; i++) {                   // пузырьки воздуха внутри льда
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', (rnd(0.06, 0.94) * w).toFixed(1));
      c.setAttribute('cy', (rnd(0.15, 0.9) * h).toFixed(1));
      c.setAttribute('r', rnd(1.2, 3).toFixed(1));
      c.setAttribute('fill', 'rgba(255,255,255,.55)');
      c.setAttribute('stroke', 'rgba(255,255,255,.8)');
      c.setAttribute('stroke-width', '.6');
      svg.append(c);
    }
    return { svg, lines };
  }

  function ice(els, { key = 'ice' } = {}) {
    const live = els.filter((e) => e && e.isConnected);
    if (!live.length || running.has(key)) return Promise.resolve();
    running.add(key);

    const rects = live.map((e) => e.getBoundingClientRect());
    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const fs = parseFloat(getComputedStyle(live[0]).fontSize) || 40;
    const padX = fs * 0.32;
    const padY = fs * 0.12;
    const w = right - left + padX * 2;
    const h = bottom - top + padY * 2;
    const radius = Math.min(5, h * 0.07);

    const cube = document.createElement('div');
    cube.className = 'ice-cube';
    Object.assign(cube.style, {
      left: `${left - padX}px`, top: `${top - padY}px`, width: `${w}px`, height: `${h}px`, borderRadius: `${radius}px`,
    });
    const { svg, lines } = cracks(w, h);
    const glare = document.createElement('i');
    glare.className = 'ice-glare';
    cube.append(svg, glare);
    document.body.append(cube);

    const frozen = live.filter((e) => e.classList.contains('token') || e.classList.contains('glyph'));
    frozen.forEach((e) => e.classList.add('frozen'));
    lines.forEach((l) => { l.style.opacity = '0'; });

    return (async () => {
      const T = MG.T;
      // 1. замерзание: лёд «нарастает» слева направо
      await cube.animate([
        { clipPath: `inset(0 100% 0 0 round ${radius}px)`, opacity: 0.4 },
        { clipPath: `inset(0 0 0 0 round ${radius}px)`, opacity: 1 },
      ], { duration: T(420), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' }).finished.catch(() => {});

      MG.burst(cube, '#bfe6ff', 14);
      MG.burst(cube, '#ffffff', 8);
      lines.forEach((l, i) => l.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T(300), delay: T(i * 70), fill: 'forwards' }));

      // 2. «дрожь» от холода и блик по поверхности
      frozen.forEach((e) => e.animate([
        { translate: '0 0' }, { translate: '-2px 0' }, { translate: '2px 0' }, { translate: '-1.5px 0' }, { translate: '0 0' },
      ], { duration: T(360), easing: 'ease-out' }));
      cube.animate([
        { rotate: '0deg' }, { rotate: '-0.7deg' }, { rotate: '0.7deg' }, { rotate: '0deg' },
      ], { duration: T(360), easing: 'ease-in-out' });
      glare.animate([{ left: '-30%' }, { left: '120%' }], { duration: T(900), delay: T(120), easing: 'ease-in-out' });

      await new Promise((r) => setTimeout(r, T(1300)));

      // 3. оттаивание: кубик оседает и стекает каплями
      frozen.forEach((e) => e.classList.remove('frozen'));
      for (let i = 0; i < 7; i++) {
        const d = document.createElement('i');
        d.className = 'ice-drop';
        d.style.left = `${left - padX + rnd(0.08, 0.92) * w}px`;
        d.style.top = `${top - padY + h - 6}px`;
        document.body.append(d);
        d.animate([
          { transform: 'translateY(0) scale(.6)', opacity: 0.95 },
          { transform: `translateY(${rnd(40, 110)}px) scale(1)`, opacity: 0 },
        ], { duration: T(rnd(550, 900)), delay: T(rnd(0, 250)), easing: 'cubic-bezier(.5,0,1,.6)', fill: 'both' })
          .onfinish = () => d.remove();
      }
      cube.style.transformOrigin = '50% 100%';
      await cube.animate([
        { opacity: 1, transform: 'scaleY(1)', filter: 'blur(0)' },
        { opacity: 0, transform: 'scaleY(.55)', filter: 'blur(3px)' },
      ], { duration: T(700), easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});

      cube.remove();
      running.delete(key);
    })();
  }

  MG.ice = ice;
})();
