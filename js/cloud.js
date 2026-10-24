/* Облако: выбранное число «заряжает» облако; облако перетаскивают к другой дроби,
 * из него льются числа, и в числителе и знаменателе они вырастают, как растения.
 *   MG.cloud.style(g)                       — оформить «призрак» перетаскиваемого числа как облако
 *   MG.cloud.rain(g, { frac, targets, value, color })
 *       g       — «призрак»-облако (position: fixed, как у перетаскивания)
 *       frac    — элемент дроби, над которой зависнет облако
 *       targets — спрятанные (opacity: 0) элементы, где вырастут числа
 *   Промис завершается, когда числа выросли.
 */
(() => {
  'use strict';
  const MG = window.MG;
  const rnd = (a, b) => a + Math.random() * (b - a);

  const CLOUD_PATH = 'M24 58 C9 58 3 41 15 34 C11 19 29 11 40 21 C46 6 71 7 75 23 C93 21 99 44 85 52 C90 59 81 62 76 58 Z';
  const cloudSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 70'>
    <path d='${CLOUD_PATH}' fill='#f3f8ff' stroke='#6f93bf' stroke-width='3' stroke-linejoin='round'/>
    <path d='M18 44 C14 38 20 31 26 32' fill='none' stroke='#ffffff' stroke-width='3' stroke-linecap='round'/>
    <path d='M42 17 C50 11 60 12 64 17' fill='none' stroke='#ffffff' stroke-width='3' stroke-linecap='round'/>
    <path d='M30 56 C50 60 70 60 80 55' fill='none' stroke='#bcd3ee' stroke-width='3' stroke-linecap='round'/></svg>`;
  const cloudUrl = `url("data:image/svg+xml,${encodeURIComponent(cloudSvg)}")`;

  const style = document.createElement('style');
  style.textContent = `
    .ghost.cloudy { overflow: visible; background: none; display: flex; align-items: center; justify-content: center; line-height: 1; padding: .7em 0 0; text-align: center; animation: cloudBob 2.2s ease-in-out infinite; }
    .ghost.cloudy::before { opacity: 0 !important; }
    .ghost.cloudy::after {
      content: ''; position: absolute; left: 50%; top: 52%; width: 4.29em; height: 3em; translate: -50% -50%;
      background: ${cloudUrl} center / contain no-repeat;
      filter: drop-shadow(0 8px 10px rgba(70, 110, 170, .35));
      z-index: -1; pointer-events: none;
    }
    @keyframes cloudBob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -.14em; } }
    .rain-drop {
      position: fixed; z-index: 59; pointer-events: none; font-weight: 900; line-height: 1;
      text-shadow: 0 0 6px rgba(255, 255, 255, .9);
    }
  `;
  document.head.append(style);

  async function rain(g, { frac, targets, value, color }) {
    const T = MG.T;
    const gr = g.getBoundingClientRect();
    const fr = frac.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(frac).fontSize) || 48;

    // 1. облако плывёт к дроби и зависает над ней
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(g.style.transform);
    const dx = m ? parseFloat(m[1]) : 0;
    const dy = m ? parseFloat(m[2]) : 0;
    const hx = fr.left + fr.width / 2;
    const hy = Math.max(60, fr.top - fs * 0.15);
    const tx = dx + (hx - (gr.left + gr.width / 2));
    const ty = dy + (hy - (gr.top + gr.height / 2));
    g.style.transition = 'none';
    await g.animate([
      { transform: g.style.transform || 'none' },
      { transform: `translate(${tx}px, ${ty}px) scale(1.05)` },
    ], { duration: T(480), easing: 'cubic-bezier(.3,.8,.3,1)', fill: 'forwards' }).finished.catch(() => {});

    // 2. дождь из выбранных чисел
    const cr = g.getBoundingClientRect();
    const gfs = parseFloat(getComputedStyle(g).fontSize) || fs;
    const cloudBottom = cr.top + cr.height / 2 + gfs * 1.5 * 0.85 * 1.05;      // нижний край облака
    const centers = targets.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height * 0.55 };
    });
    const drops = 16;
    for (let i = 0; i < drops; i++) {
      setTimeout(() => {
        const c = centers[i % centers.length];
        const d = document.createElement('i');
        d.className = 'rain-drop';
        d.textContent = value;
        d.style.color = color;
        d.style.fontSize = `${fs * rnd(0.28, 0.42)}px`;
        const x0 = cr.left + cr.width / 2 + rnd(-0.5, 0.5) * gfs * 1.6;
        d.style.left = `${x0}px`;
        d.style.top = `${cloudBottom}px`;
        document.body.append(d);
        const dxx = c.x + rnd(-fs * 0.25, fs * 0.25) - x0;
        const dyy = c.y - cloudBottom;
        d.animate([
          { transform: 'translate(0, 0) scale(.5)', opacity: 0 },
          { transform: `translate(${dxx * 0.2}px, ${dyy * 0.12}px) scale(1)`, opacity: 1, offset: 0.15 },
          { transform: `translate(${dxx}px, ${dyy}px) scale(.8)`, opacity: 0.9, offset: 0.92 },
          { transform: `translate(${dxx}px, ${dyy}px) scale(.2)`, opacity: 0 },
        ], { duration: T(rnd(520, 760)), easing: 'cubic-bezier(.5,0,.9,.6)' }).onfinish = () => d.remove();
      }, T(i * 55));
    }

    // 3. числа плавно вырастают на своих местах
    await MG.sleep(520);
    const grow = targets.map((el, i) => {
      const delay = T(i * 140);
      el.style.transformOrigin = '50% 100%';
      el.style.opacity = '';
      const a = el.animate([
        { scale: '0.04 0.02', rotate: '-8deg', opacity: 0 },
        { scale: '0.45 0.6', rotate: '5deg', opacity: 1, offset: 0.4 },
        { scale: '1.12 1.12', rotate: '-3deg', opacity: 1, offset: 0.78 },
        { scale: '1 1', rotate: '0deg', opacity: 1 },
      ], { duration: T(1500), delay, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' });
      a.onfinish = () => { el.style.transformOrigin = ''; };
      setTimeout(() => MG.burst(el, color, 6), delay + T(1300));
      return a.finished.catch(() => {});
    });

    // 4. облако растворяется
    g.animate([
      { transform: `translate(${tx}px, ${ty}px) scale(1.05)`, opacity: 1 },
      { transform: `translate(${tx}px, ${ty - 30}px) scale(1.25)`, opacity: 0 },
    ], { duration: T(700), delay: T(700), easing: 'ease-in', fill: 'forwards' })
      .onfinish = () => g.remove();

    await Promise.all(grow);
    await MG.sleep(250);
  }

  MG.cloud = {
    style: (g) => {
      g.classList.add('cloudy');
      g.style.fontSize = `${parseFloat(g.style.fontSize) * 0.42}px`;   // число внутри облака поменьше
    },
    rain,
  };
})();
