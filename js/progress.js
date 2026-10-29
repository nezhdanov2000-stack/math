/* Полоска прогресса под шапкой: каждая решённая задача — 1/8 пути (12–13 %).
 * Четыре зоны по 25 % со своим пейзажем: джунгли → деревня → город → космос. */
(() => {
  'use strict';
  window.MG = window.MG || {};
  const STEPS_DEFAULT = 8;
  /* «Сокращение чисел»: 12 задач — четыре стадии по три (обезьяна, человек, профессор, робот) */
  const stepsNow = () => { const m = document.getElementById('mode-cancel'); return m && !m.hidden ? 12 : STEPS_DEFAULT; };

  /* Свои SVG вместо эмодзи — одинаково на Windows, iPhone и Android */
  const ART = {
    palm: '<path d="M11 22.5 12.6 22.5C12.6 17 13.2 13 13.8 10L11.9 10C11.9 13 11.1 17 11 22.5Z" fill="#b27a3f"/><path d="M12.8 10C9.5 6 5 6 2.5 9.5 6 8 9.5 8.5 12.8 10Z" fill="#2fa84f"/><path d="M12.8 10C16 6 20.5 6 23 9.5 19.500 8 16 8.500 12.800 10Z" fill="#2fa84f"/><path d="M12.8 10C9.800 6.500 10 3 12.800 2 15.600 3 15.800 6.500 12.800 10Z" fill="#43c466"/><circle cx="12.8" cy="10.8" r="1.4" fill="#7a4a1e"/>',
    bush: '<circle cx="7" cy="16" r="5" fill="#3cb55a"/><circle cx="17" cy="17" r="4.600" fill="#3cb55a"/><circle cx="12.500" cy="13.500" r="6" fill="#4ccb6a"/><path d="M8 11.500C9 10 10.500 9.500 12 9.500" stroke="#b9f5c8" fill="none"/>',
    tree: '<rect x="10.800" y="14" width="2.600" height="8.500" rx="1" fill="#b27a3f"/><circle cx="12" cy="9.500" r="7.200" fill="#35b556"/><path d="M7.500 8C8 5.500 10 4.200 12 4.200" stroke="#b9f5c8" fill="none"/>',
    parrot: '<path d="M7 19 4 23" stroke="#2fa84f" stroke-width="2.600"/><ellipse cx="11.500" cy="14" rx="5" ry="7.500" fill="#ef4b4b"/><path d="M10 12C6 12.500 6 18.500 10.500 19.500 12.500 17.500 12.500 14 10 12Z" fill="#2f7df0"/><circle cx="14" cy="7" r="4" fill="#ef4b4b"/><path d="M17.500 6.500 21.500 8.500 17.500 10Z" fill="#ffb21f"/><circle cx="14.800" cy="6.200" r="1" fill="#fff" stroke="none"/>',
    house: '<rect x="4" y="11" width="16" height="11" fill="#f6dcae"/><path d="M2 11.500 12 3 22 11.500Z" fill="#e5483f"/><rect x="10" y="15" width="4.200" height="7" fill="#9b5e2a"/><rect x="5.500" y="13.500" width="3" height="3" fill="#8fd0ff"/><rect x="15.700" y="13.500" width="3" height="3" fill="#8fd0ff"/>',
    house2: '<rect x="4" y="11" width="16" height="11" fill="#ffd2b0"/><rect x="15.500" y="3.500" width="3" height="6" fill="#c9764a"/><path d="M2 11.500 12 3.500 22 11.500Z" fill="#f08a2c"/><rect x="9.500" y="14.500" width="5" height="7.500" fill="#7a4a1e"/><circle cx="7" cy="15.500" r="1.800" fill="#8fd0ff"/><circle cx="17" cy="15.500" r="1.800" fill="#8fd0ff"/>',
    pine: '<rect x="11" y="18" width="2.400" height="4.500" fill="#9b5e2a"/><path d="M12 2 18 10H6Z" fill="#2fa456"/><path d="M12 6 19.500 15H4.500Z" fill="#35b55e"/><path d="M12 10.500 21 20H3Z" fill="#3cc468"/>',
    bldgA: '<rect x="6" y="3" width="12" height="19.500" fill="#a9b9d6"/><g fill="#ffe27a" stroke="none"><rect x="8.500" y="6" width="2.600" height="2.600"/><rect x="13" y="6" width="2.600" height="2.600"/><rect x="8.500" y="11" width="2.600" height="2.600"/><rect x="13" y="11" width="2.600" height="2.600"/></g><rect x="10.300" y="17" width="3.400" height="5.500" fill="#566a8f"/>',
    bldgB: '<rect x="3" y="10" width="9.500" height="12.500" fill="#cfd7e6"/><rect x="12.500" y="3" width="8.500" height="19.500" fill="#7f9fd8"/><g fill="#ffe27a" stroke="none"><rect x="5" y="12.500" width="2.200" height="2.200"/><rect x="8.500" y="12.500" width="2.200" height="2.200"/><rect x="14.500" y="6" width="2" height="2"/><rect x="18" y="6" width="2" height="2"/><rect x="14.500" y="11" width="2" height="2"/><rect x="18" y="11" width="2" height="2"/></g>',
    shop: '<rect x="3.500" y="10" width="17" height="12.500" fill="#fff0cf"/><path d="M2.500 6.500H21.500L20.500 11H3.500Z" fill="#e5483f"/><path d="M8.200 6.500 7.500 11M12 6.500V11M15.800 6.500 16.500 11" stroke="#fff" fill="none"/><rect x="5.500" y="14" width="6" height="5" fill="#8fd0ff"/><rect x="14" y="14" width="4.500" height="8.500" fill="#566a8f"/>',
    crane: '<rect x="3" y="20.500" width="9" height="2" fill="#7b8794"/><rect x="6.500" y="4" width="3.200" height="17" fill="#ffc933"/><rect x="2" y="3" width="20" height="3" fill="#ffc933"/><path d="M18.500 6V12.500" fill="none"/><rect x="15.500" y="12.500" width="6" height="4.500" fill="#9aa7b8"/>',
    moon: '<circle cx="12" cy="12" r="9.500" fill="#f1dfa2"/><circle cx="8.500" cy="9.500" r="2" fill="#d8c27a"/><circle cx="15.500" cy="14.500" r="2.600" fill="#d8c27a"/><circle cx="10" cy="16.500" r="1.200" fill="#d8c27a"/>',
    star: '<path d="M12 2.500 14.600 9 21.500 9.500 16.200 14 17.900 21 12 17.200 6.100 21 7.800 14 2.500 9.500 9.400 9Z" fill="#ffd23f"/>',
    rocket: '<path d="M12 1.500C16.500 5.500 16.500 13 15.300 18H8.700C7.500 13 7.500 5.500 12 1.500Z" fill="#f4f6fa"/><circle cx="12" cy="9.500" r="2.400" fill="#4aa8ff"/><path d="M8.700 13.500 4.500 18.500 8.700 17.500ZM15.300 13.500 19.500 18.500 15.300 17.500Z" fill="#e5483f"/><path d="M9.800 18.500C10.500 22 11.200 22.500 12 23 12.800 22.500 13.500 22 14.200 18.500Z" fill="#ff9a1f"/>',
    earth: '<circle cx="12" cy="12" r="9.500" fill="#3f9bf0"/><path d="M6 7C9 5.500 11 7.500 10 10 8.500 11 6 10.500 5 9.500ZM13 13C16 12 19 14 18 17 16 19 13 18 12.500 16Z" fill="#4cc46a" stroke="none"/>',
    spark: '<path d="M12 2C12.800 8 14 11 22 12 14 13 12.800 16 12 22 11.200 16 10 13 2 12 10 11 11.200 8 12 2Z" fill="#fff3a0" stroke-width="1"/>',
    planet: '<circle cx="12" cy="12" r="6.300" fill="#f4a259"/><path d="M8.500 9C10.500 8 13 8 15 9" stroke="#c9742a" fill="none"/><ellipse cx="12" cy="12" rx="10.500" ry="3.200" transform="rotate(-20 12 12)" fill="none" stroke="#1d1d1f" stroke-width="2.600"/><ellipse cx="12" cy="12" rx="10.500" ry="3.200" transform="rotate(-20 12 12)" fill="none" stroke="#7fd4f5" stroke-width="1.200"/>',
    ufo: '<path d="M7 11C7 6.500 9 4 12 4S17 6.500 17 11Z" fill="#9fe0ff"/><ellipse cx="12" cy="12.500" rx="10" ry="3.800" fill="#c3cad6"/><circle cx="7" cy="12.800" r="1" fill="#ffd23f" stroke="none"/><circle cx="12" cy="13.800" r="1" fill="#ffd23f" stroke="none"/><circle cx="17" cy="12.800" r="1" fill="#ffd23f" stroke="none"/><path d="M9 17 7.500 21M15 17 16.500 21" stroke="#ffd23f" fill="none"/>',
    monkey: '<circle cx="3.800" cy="12.500" r="3.200" fill="#8a5a35"/><circle cx="20.200" cy="12.500" r="3.200" fill="#8a5a35"/><circle cx="12" cy="11.800" r="9" fill="#8a5a35"/><circle cx="3.800" cy="12.500" r="1.500" fill="#e8b98a" stroke="none"/><circle cx="20.200" cy="12.500" r="1.500" fill="#e8b98a" stroke="none"/><path d="M5.500 12C5.500 8.500 9 9 12 11.500 15 9 18.500 8.500 18.500 12 18.500 17.500 15.500 20 12 20S5.500 17.500 5.500 12Z" fill="#f1c99a"/><circle cx="9.300" cy="12" r="1.100" fill="#1d1d1f" stroke="none"/><circle cx="14.700" cy="12" r="1.100" fill="#1d1d1f" stroke="none"/><path d="M9.800 16.300Q12 18.200 14.200 16.300" fill="none"/>',
    boy: '<circle cx="12" cy="13" r="8.500" fill="#ffd9b0"/><path d="M3.800 11.500C3.500 5.500 8 3 12 3.500 16 3 20.500 5.500 20.200 11.500 17 9.500 14 8.500 12 7 10 8.500 7 9.500 3.800 11.500Z" fill="#f6c545"/><circle cx="9" cy="13.500" r="1.100" fill="#1d1d1f" stroke="none"/><circle cx="15" cy="13.500" r="1.100" fill="#1d1d1f" stroke="none"/><path d="M9.500 17Q12 19 14.500 17" fill="none"/>',
    grad: '<circle cx="12" cy="14.500" r="7.500" fill="#ffd9b0"/><path d="M4.500 12C4.500 17 6 21 6.500 21.500 5 18 5 14 5.500 12ZM19.500 12C19.500 17 18 21 17.500 21.500 19 18 19 14 18.500 12Z" fill="#7a4a1e"/><path d="M1.500 8 12 3.500 22.500 8 12 12.500Z" fill="#2d3748"/><path d="M6.500 10.500V14C6.500 15 17.500 15 17.500 14V10.500L12 12.800Z" fill="#2d3748"/><path d="M22 8V13" fill="none" stroke="#ffd23f"/><circle cx="9.500" cy="16.500" r="1" fill="#1d1d1f" stroke="none"/><circle cx="14.500" cy="16.500" r="1" fill="#1d1d1f" stroke="none"/><path d="M10 19.200Q12 20.700 14 19.200" fill="none"/>',
    robot: '<path d="M12 6V2.800" fill="none"/><circle cx="12" cy="2.500" r="1.700" fill="#ef4b4b"/><rect x="2" y="10" width="2.500" height="5" rx="1" fill="#ffc933"/><rect x="19.500" y="10" width="2.500" height="5" rx="1" fill="#ffc933"/><rect x="4" y="6" width="16" height="15" rx="4" fill="#c3cddd"/><rect x="6" y="9.500" width="12" height="5.500" rx="2.500" fill="#27304a"/><circle cx="9.500" cy="12.200" r="1.500" fill="#5cf0ff" stroke="none"/><circle cx="14.500" cy="12.200" r="1.500" fill="#5cf0ff" stroke="none"/><path d="M9 18H15" fill="none"/>',
    crown: '<path d="M3 19 2 7 8 12 12 4 16 12 22 7 21 19Z" fill="#ffc933"/><circle cx="12" cy="14.500" r="1.600" fill="#e5483f"/><circle cx="6.500" cy="15.500" r="1.100" fill="#4aa8ff" stroke="none"/><circle cx="17.500" cy="15.500" r="1.100" fill="#4aa8ff" stroke="none"/>',
  };
  const ico = (n) => `<svg viewBox="0 0 24 24" width="1em" height="1em" stroke="#1d1d1f" stroke-width="1.300" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${ART[n]}</svg>`;
  const ZONES = [
    { sky: 'linear-gradient(#8fb0e8 0 62%, #5fae6e 62%)', items: ['palm', 'bush', 'tree', 'palm', 'parrot', 'tree', 'palm', 'bush', 'tree', 'palm', 'tree', 'palm', 'bush'], y: [0, 5, 2, 0, -9, 3, 1, 5, 0, 2, 0, 3, 5], goal: 'monkey' },
    { sky: 'linear-gradient(#f8c9a0 0 62%, #6fb27a 62%)', items: ['house', 'pine', 'house2', 'pine', 'house', 'tree', 'house2', 'pine', 'house', 'pine', 'house2', 'tree', 'house'], y: [0, 3, 0, 4, 1, 3, 0, 4, 0, 3, 1, 4, 0], goal: 'boy' },
    { sky: 'linear-gradient(#8fa8dc 0 66%, #f3c89d 66%)', items: ['bldgA', 'bldgB', 'shop', 'bldgA', 'crane', 'bldgB', 'bldgA', 'shop', 'bldgB', 'bldgA', 'bldgB', 'bldgA', 'shop'], y: [0, 0, 3, 0, 0, 0, 1, 3, 0, 0, 1, 0, 3], goal: 'grad' },
    { sky: 'linear-gradient(#6a6a6a, #8a8a8a)', items: ['moon', 'star', 'rocket', 'earth', 'spark', 'moon', 'planet', 'star', 'ufo', 'moon', 'spark', 'earth', 'star'], y: [-6, 8, -2, 0, -10, 6, 2, -8, -4, 7, -9, 3, 8], goal: 'robot' },
  ];

  const HATCH = [['#7a4a22', '#a2692f'], ['#e8700a', '#ff9d3f'], ['#12c257', '#6bf0a2'], ['#1478ff', '#6db6ff']];
  const top = document.querySelector('.top'), solvedEl = document.getElementById('solved');
  if (!top || !solvedEl) return;

  const css = document.createElement('style');
  css.textContent = `
    .pgbar { position: relative; flex: 1 0 100%; display: flex; align-items: center; gap: 12px; margin-top: 4px; padding: 2px 4px 5px; }
    .pg-track { position: relative; height: 32px; border: 3px solid #1d1d1f; border-radius: 8px; background: #ecece6; box-shadow: 0 3px 0 #1d1d1f; overflow: hidden; transition: box-shadow .4s, border-color .4s; }
    .pg-track::before { content: ''; position: absolute; inset: 0; border-radius: 5px; box-shadow: inset 0 3px 0 rgba(0,0,0,.12); z-index: 3; pointer-events: none; }
    .pg-scene { position: absolute; inset: 0; clip-path: inset(0 100% 0 0 round 0 5px 5px 0); transition: clip-path .85s cubic-bezier(.34,1.45,.5,1); }
    .pg-scene { background: linear-gradient(135deg, var(--hs, rgba(255,255,255,.16)) 25%, transparent 25% 50%, var(--hs, rgba(255,255,255,.16)) 50% 75%, transparent 75%) 0 0 / 8px 8px, var(--hb, #2a2a2e); }
    .pg-art { position: absolute; inset: 0; opacity: 0; transition: opacity .35s; }
    .pgbar.grow .pg-art { opacity: 1; }
    .pg-scene.snap, .pg-scene.snap * { transition: none !important; }
    .pg-scene::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 100%; background: linear-gradient(rgba(255,255,255,.28), rgba(255,255,255,0) 45%, rgba(0,0,0,.14)); z-index: 2; }
    .pg-scene::after { content: ''; position: absolute; top: 3px; left: 8px; right: 8px; height: 4px; border-radius: 4px; background: rgba(255,255,255,.55); z-index: 2; }
    .pg-scene i, .pg-goal, .pg-crown { display: flex; }
    .pg-scene i { position: absolute; bottom: 3px; font-style: normal; font-size: 16px; line-height: 1; transform: translateY(var(--y, 0px)); filter: drop-shadow(0 2px 0 rgba(0,0,0,.18)); }
    .pg-shine { position: absolute; top: -10%; bottom: -10%; width: 36px; left: -60px; transform: skewX(-22deg); background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.75), rgba(255,255,255,0)); z-index: 2; opacity: 0; }
    .pg-shine.go { animation: pgShine .9s ease-out; }
    .pg-goal { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 20px; line-height: 1; z-index: 4; filter: drop-shadow(0 2px 0 rgba(0,0,0,.2)); }
    .pg-goal.hop { animation: pgHop .65s cubic-bezier(.3,.7,.4,1); }
    .pg-goal.pop { animation: pgPop .9s ease; }
    .pgbar.full .pg-track { border-color: #8a5a00; box-shadow: 0 3px 0 #8a5a00, 0 0 0 3px rgba(255,200,40,.45); }
    .pgbar #skip, .pg-lamp { flex: none; width: 40px; height: 40px; padding: 0; border: 0; border-radius: 12px; background: transparent; color: #1d1d1f; display: grid; place-items: center; cursor: pointer; box-shadow: none; transition: transform .12s, color .2s; -webkit-tap-highlight-color: transparent; }
    .pgbar #skip:active, .pg-lamp:active { transform: scale(.86); }
    .pgbar #skip svg, .pg-lamp svg { width: 30px; height: 30px; display: block; overflow: visible; }
    .pg-lamp svg path:first-child { fill: transparent; transition: fill .25s, filter .25s; }
    .pg-lamp.on svg path:first-child { fill: #ffd23f; filter: drop-shadow(0 0 5px rgba(255,200,40,.9)); }
    .pgbar #skip svg { transition: none; }
    .pgbar #skip.spin svg { animation: pgSpin .6s cubic-bezier(.3,.9,.3,1); }
    @keyframes pgSpin { 0% { transform: rotate(0); } 100% { transform: rotate(360deg); } }
    .pg-lamp.nudge { animation: pgNudge 1.8s ease-in-out infinite; }
    .pg-tip { position: absolute; right: 0; top: 100%; margin-top: 6px; z-index: 8; max-width: 230px; padding: 8px 12px; border-radius: 14px; background: #1d1d1f; color: #fff; font-weight: 800; font-size: .85rem; line-height: 1.25; box-shadow: 0 6px 16px rgba(0,0,0,.25); }
    @keyframes pgNudge { 0%, 70%, 100% { transform: rotate(0); } 76% { transform: rotate(-14deg) scale(1.1); } 84% { transform: rotate(12deg) scale(1.1); } 92% { transform: rotate(-6deg); } }
    .top .stats { flex: 1 0 100%; }
    .pg-mid { position: relative; flex: 1; min-width: 0; }
    .pg-crown { position: absolute; right: 6px; top: -9px; font-size: 18px; transform: rotate(14deg) scale(0); transform-origin: 50% 100%; transition: transform .5s cubic-bezier(.3,1.8,.5,1); z-index: 5; pointer-events: none; }
    .pgbar.full .pg-crown { transform: rotate(14deg) scale(1); }
    .pg-conf { position: absolute; z-index: 6; pointer-events: none; width: 8px; height: 12px; border-radius: 2px; }

    @keyframes pgShine { 0% { opacity: 1; left: -60px; } 100% { opacity: 1; left: 105%; } }
    @keyframes pgHop { 0% { transform: translateY(-50%); } 30% { transform: translateY(calc(-50% - 9px)) scale(1.2, .9) rotate(-8deg); } 55% { transform: translateY(-50%) scale(.92, 1.08); } 100% { transform: translateY(-50%); } }
    @keyframes pgPop { 0% { transform: translateY(-50%) scale(.2) rotate(-40deg); } 55% { transform: translateY(-50%) scale(1.7) rotate(12deg); } 100% { transform: translateY(-50%); } }
    @media (prefers-reduced-motion: reduce) { .pg-scene { transition: none; } .pg-shine, .pg-goal, .pgbar #skip svg { animation: none !important; } }
  `;
  document.head.append(css);

  const box = document.createElement('div');
  box.className = 'pgbar';
  box.innerHTML = '<div class="pg-mid"><div class="pg-track"><div class="pg-scene snap"></div><i class="pg-shine"></i><span class="pg-goal"></span></div><span class="pg-crown"></span></div><button class="pg-lamp" type="button" aria-label="Подсказка"></button>';
  const skipBtn = document.getElementById('skip');
  if (skipBtn) {
    skipBtn.classList.remove('ghost');
    skipBtn.setAttribute('aria-label', 'Другая задача');
    skipBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.800" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 0 1-14 5.300M4 12a8 8 0 0 1 14-5.300"/><path d="M19 3v4.500h-4.500M5 21v-4.500h4.500"/></svg>';
    box.prepend(skipBtn);
    skipBtn.addEventListener('click', () => { skipBtn.classList.remove('spin'); void skipBtn.offsetWidth; skipBtn.classList.add('spin'); });
  }
  const lamp = box.querySelector('.pg-lamp');
  lamp.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.400" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6.500 6.500 0 0 0-3.800 11.800c.6.500 1 1.200 1 2V17h5.600v-.2c0-.8.400-1.500 1-2A6.500 6.500 0 0 0 12 3Z" fill="#fff8d6"/></svg>';
  top.append(box);
  box.querySelector('.pg-crown').innerHTML = ico('crown');
  const track = box.querySelector('.pg-track'), scene = box.querySelector('.pg-scene'), shine = box.querySelector('.pg-shine'),
    goal = box.querySelector('.pg-goal');
  let growT = 0, zone = -1, prev = 0;
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function confetti(n) {
    const r = box.getBoundingClientRect(), t = goal.getBoundingClientRect();
    const cx = t.left - r.left + t.width / 2, cy = t.top - r.top + t.height / 2;
    const cols = ['#ff5a5f', '#ffc933', '#3fbf6d', '#4aa3ff', '#b36bff', '#ff8a3d'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'pg-conf';
      p.style.cssText = `left:${cx}px;top:${cy}px;background:${cols[i % cols.length]}`;
      box.append(p);
      const a = Math.PI * (1 + Math.random() * 1.0) , d = 40 + Math.random() * 70;
      p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d * 1.4 - 30}px,${Math.sin(a) * d}px) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: .55 }, { transform: `translate(${Math.cos(a) * d * 1.6 - 40}px,${Math.sin(a) * d + 50}px) rotate(${Math.random() * 900}deg)`, opacity: 0 }], { duration: 1100 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => p.remove();
    }
  }

  function render() {
    const n = Math.max(0, parseInt(solvedEl.textContent, 10) || 0);
    const pct = Math.min(100, Math.floor(n * 100 / stepsNow()));
    const gain = pct > prev, instant = !gain;
    const z = Math.min(ZONES.length - 1, Math.max(0, Math.ceil(pct / 25) - 1));
    scene.classList.toggle('snap', instant);
    scene.style.setProperty('--hb', HATCH[z][0]);
    scene.style.setProperty('--hs', HATCH[z][1]);
    if (z !== zone) {
      const Z = ZONES[z];
      scene.innerHTML = `<div class="pg-art" style="background:${Z.sky}">${Z.items.map((e, i) => `<i style="left:${1 + i * 7.4}%;--y:${Z.y[i]}px">${ico(e)}</i>`).join('')}</div>`;
      goal.innerHTML = ico(Z.goal);
      if (zone !== -1 && gain) { restart(goal, 'pop'); confetti(16); }
      zone = z;
    } else if (gain) restart(goal, 'hop');
    scene.dataset.pct = pct;
    scene.style.clipPath = `inset(0 ${100 - pct}% 0 0 round 0 5px 5px 0)`;
    if (gain) { box.classList.add('grow'); clearTimeout(growT); growT = setTimeout(() => box.classList.remove('grow'), 1000); restart(shine, 'go'); if (pct === 100) setTimeout(() => confetti(26), 450); }
    box.classList.toggle('full', pct === 100);
    prev = pct;
  }
  /* лампа: включает подсказки с курсором (режимы «Сокращение чисел» и «Выделить целое») */
  const KEYL = 'mg.tut.lamp';
  const used = () => { try { return !!localStorage.getItem(KEYL); } catch (e) { return true; } };
  const HINT_MODES = ['cancel', 'ext'];
  const hintMode = () => HINT_MODES.find((id) => { const m = document.getElementById('mode-' + id); return !!m && !m.hidden; }) || '';
  const inCancel = () => !!hintMode();
  const nudge = () => lamp.classList.toggle('nudge', !used() && inCancel() && !lamp.classList.contains('on'));
  let tipT = 0;
  function say(text) {
    box.querySelector('.pg-tip') && box.querySelector('.pg-tip').remove();
    const t = Object.assign(document.createElement('div'), { className: 'pg-tip', textContent: text });
    box.append(t); clearTimeout(tipT); tipT = setTimeout(() => t.remove(), 2600);
  }
  MG.hints = { on: false };
  lamp.addEventListener('click', () => {
    try { localStorage.setItem(KEYL, '1'); } catch (e) { /* нет хранилища */ }
    if (!inCancel()) { say('Для этого режима подсказок пока нет'); return; }
    MG.hints.on = !MG.hints.on;
    lamp.classList.toggle('on', MG.hints.on);
    nudge();
    window.dispatchEvent(new CustomEvent('mg:hints', { detail: { on: MG.hints.on } }));
  });
  /* новый пример: подсказка выключается, дальше игрок включает её лампой сам */
  /* на 4-м (планшет) и 7-м (молния) примерах подсказка тоже включается сама */
  window.addEventListener('mg:round', () => {
    if (MG.hints.on) setOn(false);
    setTimeout(() => { if (hintMode() === 'cancel' && [3, 6].includes(+solvedEl.textContent)) setOn(true); }, 60);
  });
  let autoFor = '';
  const setOn = (v) => { MG.hints.on = v; lamp.classList.toggle('on', v); window.dispatchEvent(new CustomEvent('mg:hints', { detail: { on: v } })); };
  setInterval(() => {
    const hm = hintMode();
    if (hm !== autoFor) {
      autoFor = hm;
      /* первая задача режима: подсказки включаются сами */
      if (hm && +solvedEl.textContent === 0 && !MG.hints.on) setOn(true);
    }
    if (!inCancel() && MG.hints.on) { MG.hints.on = false; lamp.classList.remove('on'); window.dispatchEvent(new CustomEvent('mg:hints', { detail: { on: false } })); }
    nudge();
  }, 500);
  if (window.MutationObserver) new MutationObserver(render).observe(solvedEl, { childList: true, characterData: true, subtree: true });
  render();
})();
