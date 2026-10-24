/* Беговая дорожка: неправильная дробь бежит и «сжигает лишнее» — на каждом круге из числителя уходит знаменатель, получается целое.
 *   MG.tread.icon                      — иконка для панели и курсора
 *   MG.tread.run(el, { n, d })         — анимация для элемента-дроби; Promise<{ badge: DOMRect }> (откуда вылетают целые)
 */
(() => {
  'use strict';
  const MG = window.MG;

  const icon = `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
    <path d="M20 34 L14.5 40.5 L8 43" stroke="#1e3a8a" stroke-width="7.6" fill="none"/><path d="M20 34 L14.5 40.5 L8 43" stroke="#3b82f6" stroke-width="4.2" fill="none"/>
    <path d="M27 34 L34.5 36.5 L33 43" stroke="#1e3a8a" stroke-width="7.6" fill="none"/><path d="M27 34 L34.5 36.5 L33 43" stroke="#2563eb" stroke-width="4.2" fill="none"/>
    <path d="M15 24.5 L5 30.5" stroke="#7c2d12" stroke-width="6.6" fill="none"/><path d="M15 24.5 L5 30.5" stroke="#fcd9b0" stroke-width="3.2" fill="none"/>
    <ellipse cx="24" cy="26" rx="12" ry="11.5" fill="#fb923c" stroke="#7c2d12" stroke-width="2.4"/><path d="M15.5 29.6 q8.5 4.4 17 0" fill="none" stroke="#fdba74" stroke-width="1.8"/><path d="M16 21 q3 -4 8 -4.4" fill="none" stroke="#fed7aa" stroke-width="2"/>
    <path d="M33 24 L39.5 20 L37 13.5" stroke="#7c2d12" stroke-width="6.6" fill="none"/><path d="M33 24 L39.5 20 L37 13.5" stroke="#fcd9b0" stroke-width="3.2" fill="none"/>
    <circle cx="27" cy="10.4" r="7" fill="#fcd9b0" stroke="#7c2d12" stroke-width="2.4"/><path d="M20.4 8.4 Q27 4.4 33.6 8.4 L33.4 10.4 Q27 7.4 20.6 10.4Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="1.4"/><circle cx="30.4" cy="12" r="1.2" fill="#1f2937" stroke="none"/><path d="M29 15.2 q2.2 1.4 3.8 0" fill="none" stroke="#7c2d12" stroke-width="1.4"/><path d="M19.6 6.8 q-2.4 3 0 5.2 q2.4 -2.4 0 -5.2z" fill="#38bdf8" stroke="#0369a1" stroke-width=".9"/></svg>`;

  const style = document.createElement('style');
  style.textContent = `
    .tm-belt { position: fixed; z-index: 40; pointer-events: none; height: 26px; border-radius: 13px; background: #374151;
      box-shadow: 0 6px 12px rgba(0,0,0,.28), inset 0 -4px 0 rgba(0,0,0,.25); overflow: hidden; transform-origin: 50% 50%; }
    .tm-belt::before { content: ''; position: absolute; inset: 6px 14px 10px; border-radius: 8px; opacity: .9;
      background: repeating-linear-gradient(90deg, #9ca3af 0 10px, #6b7280 10px 26px); animation: tmRun .13s linear infinite; }
    .tm-belt::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: #1f2937; }
    @keyframes tmRun { from { background-position: 0 0; } to { background-position: -26px 0; } }
    .tm-shoe { position: fixed; z-index: 41; pointer-events: none; width: 34px; height: 20px; }
    .tm-sweat { position: fixed; z-index: 41; pointer-events: none; width: 9px; height: 13px; border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%; background: #38bdf8; }
    .tm-badge { position: fixed; z-index: 42; pointer-events: none; min-width: 2.2em; padding: .1em .5em; border-radius: 999px; background: #f97316; color: #fff;
      font: 900 28px/1.2 inherit; font-family: inherit; text-align: center; box-shadow: 0 6px 14px rgba(249,115,22,.4); }
    body[data-tool="tread"] .stage, body[data-tool="tread"] .stage .mx-term { cursor: var(--cur-tread, pointer) !important; }
  `;
  document.head.append(style);

  const shoeSvg = '<svg viewBox="0 0 34 20"><path d="M2 17 V9 q0-4 5-4 h6 q4 0 6 4 l11 3 q4 1 4 5z" fill="#f97316" stroke="#9a3412" stroke-width="1.6" stroke-linejoin="round"/><path d="M2 17 H32" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M11 6.5 l3 3 M15 6.5 l3 3" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></svg>';

  async function run(el, { n, d }) {
    const { T, sleep, burst } = MG;
    const q = Math.floor(n / d);
    const r0 = el.getBoundingClientRect();
    const numrow = el.querySelector('.mx-numrow');
    const cx = r0.left + r0.width / 2;
    const bw = Math.max(r0.width + 90, 220);
    const beltTop = r0.bottom + 22;

    const belt = document.createElement('div');
    belt.className = 'tm-belt';
    Object.assign(belt.style, { left: `${cx - bw / 2}px`, top: `${beltTop}px`, width: `${bw}px` });
    document.body.append(belt);
    belt.animate([{ transform: 'scaleX(.1)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }], { duration: T(320), easing: 'cubic-bezier(.2,.9,.3,1)' });

    const shoes = [-1, 1].map((sg) => {
      const s = document.createElement('div');
      s.className = 'tm-shoe';
      s.innerHTML = shoeSvg;
      Object.assign(s.style, { left: `${cx + sg * 30 - 17}px`, top: `${beltTop - 14}px` });
      document.body.append(s);
      return s;
    });

    const badge = document.createElement('div');
    badge.className = 'tm-badge';
    badge.textContent = '0';
    Object.assign(badge.style, { left: `${cx + bw / 2 - 40}px`, top: `${beltTop - 54}px`, fontSize: '28px' });
    document.body.append(badge);
    badge.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: T(260), easing: 'cubic-bezier(.3,1.6,.5,1)' });
    await sleep(330);

    // бег: дробь подпрыгивает, ноги бегут
    const hop = el.animate([
      { transform: 'translateY(0) rotate(5deg) scaleY(.96)' }, { transform: 'translateY(-20px) rotate(9deg) scaleY(1.03)', offset: 0.5 }, { transform: 'translateY(0) rotate(5deg) scaleY(.96)' },
    ], { duration: T(190), iterations: Infinity, easing: 'ease-in-out' });
    shoes.forEach((s, i) => s.animate([
      { transform: 'translateX(-10px) translateY(0) rotate(0deg)' }, { transform: 'translateX(2px) translateY(-18px) rotate(-14deg)', offset: 0.5 }, { transform: 'translateX(-10px) translateY(0) rotate(0deg)' },
    ], { duration: T(190), iterations: Infinity, delay: i ? T(95) : 0, easing: 'ease-in-out' }));
    const sweat = setInterval(() => {
      const s = document.createElement('div');
      s.className = 'tm-sweat';
      const sx = r0.left + (Math.random() < 0.5 ? -8 : r0.width + 4);
      Object.assign(s.style, { left: `${sx}px`, top: `${r0.top + r0.height * 0.2}px` });
      document.body.append(s);
      s.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${sx < cx ? -26 : 26}px, 38px)`, opacity: 0 }], { duration: T(520), easing: 'ease-in' }).finished.then(() => s.remove()).catch(() => s.remove());
    }, Math.max(40, T(90)));

    // общая длительность бега одинакова для любой дроби: чем больше кругов, тем они короче (но не быстрее 280 мс)
    const lap = Math.max(280, 3800 / q);
    let cur = n;
    for (let i = 1; i <= q; i++) {
      await sleep(lap);
      cur -= d;
      if (numrow) numrow.innerHTML = `<span class="mx-n">${cur}</span>`;
      badge.textContent = String(i);
      badge.animate([{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: T(260), easing: 'cubic-bezier(.3,1.6,.5,1)' });
      // «сгоревшее» уходит вспышкой над дробью
      const br = el.getBoundingClientRect();
      const f = document.createElement('div');
      f.className = 'tm-sweat';
      Object.assign(f.style, { left: `${br.left + br.width / 2 - 14}px`, top: `${br.top}px`, width: '28px', height: '28px', borderRadius: '50%', background: '#f97316' });
      document.body.append(f);
      f.animate([{ transform: 'translate(0,0) scale(.6)', opacity: 1 }, { transform: `translate(${(r0.width / 2 + bw / 2 - 40) * 0.0 + (bw / 2 - 40)}px, ${beltTop - 54 - br.top}px) scale(.3)`, opacity: 0.2 }], { duration: T(380), easing: 'ease-in' }).finished.then(() => f.remove()).catch(() => f.remove());
    }
    await sleep(420);
    clearInterval(sweat);
    hop.cancel();
    const bRect = badge.getBoundingClientRect();
    burst(badge, '#f97316', 10);
    shoes.forEach((s) => s.remove());
    belt.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(260), fill: 'forwards' }).finished.then(() => belt.remove());
    badge.remove();
    return { badge: bRect };
  }

  MG.tread = { icon, run };
})();
