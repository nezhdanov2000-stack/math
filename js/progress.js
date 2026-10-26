/* Полоска прогресса под шапкой: каждая решённая задача — 1/8 пути (12–13 %).
 * Четыре зоны по 25 % со своим пейзажем: джунгли → деревня → город → космос. */
(() => {
  'use strict';
  const STEPS = 8;
  const ZONES = [
    { sky: 'linear-gradient(#8fb0e8 0 62%, #5fae6e 62%)', items: ['🌴', '🌿', '🌳', '🌴', '🦜', '🌳', '🌴', '🌿', '🌳', '🌴', '🌳', '🌴', '🌿'], y: [0, 5, 2, 0, -9, 3, 1, 5, 0, 2, 0, 3, 5], goal: '🐒' },
    { sky: 'linear-gradient(#f8c9a0 0 62%, #6fb27a 62%)', items: ['🏠', '🌲', '🏡', '🌲', '🏠', '🌳', '🏡', '🌲', '🏠', '🌲', '🏡', '🌳', '🏠'], y: [0, 3, 0, 4, 1, 3, 0, 4, 0, 3, 1, 4, 0], goal: '👱' },
    { sky: 'linear-gradient(#8fa8dc 0 66%, #f3c89d 66%)', items: ['🏢', '🏬', '🏪', '🏢', '🏗️', '🏬', '🏢', '🏪', '🏬', '🏢', '🏬', '🏢', '🏪'], y: [0, 0, 3, 0, 0, 0, 1, 3, 0, 0, 1, 0, 3], goal: '👩‍🎓' },
    { sky: 'linear-gradient(#6a6a6a, #8a8a8a)', items: ['🌕', '⭐', '🚀', '🌍', '✨', '🌕', '🪐', '⭐', '🛸', '🌕', '✨', '🌍', '⭐'], y: [-6, 8, -2, 0, -10, 6, 2, -8, -4, 7, -9, 3, 8], goal: '🤖' },
  ];

  const HATCH = [['#7a4a22', '#a2692f'], ['#e8700a', '#ff9d3f'], ['#12c257', '#6bf0a2'], ['#1478ff', '#6db6ff']];
  const top = document.querySelector('.top'), solvedEl = document.getElementById('solved');
  if (!top || !solvedEl) return;

  const css = document.createElement('style');
  css.textContent = `
    .pgbar { position: relative; flex: 1 0 100%; display: flex; align-items: center; gap: 12px; padding: 2px 4px 5px; }
    .pg-track { position: relative; flex: 1; height: 32px; border: 3px solid #1d1d1f; border-radius: 8px; background: #ecece6; box-shadow: 0 3px 0 #1d1d1f; overflow: hidden; transition: box-shadow .4s, border-color .4s; }
    .pg-track::before { content: ''; position: absolute; inset: 0; border-radius: 5px; box-shadow: inset 0 3px 0 rgba(0,0,0,.12); z-index: 3; pointer-events: none; }
    .pg-scene { position: absolute; inset: 0; clip-path: inset(0 100% 0 0 round 0 5px 5px 0); transition: clip-path .85s cubic-bezier(.34,1.45,.5,1); }
    .pg-scene { background: linear-gradient(135deg, var(--hs, rgba(255,255,255,.16)) 25%, transparent 25% 50%, var(--hs, rgba(255,255,255,.16)) 50% 75%, transparent 75%) 0 0 / 8px 8px, var(--hb, #2a2a2e); }
    .pg-art { position: absolute; inset: 0; opacity: 0; transition: opacity .35s; }
    .pgbar.grow .pg-art { opacity: 1; }
    .pg-scene.snap, .pg-scene.snap * { transition: none !important; }
    .pg-scene::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 100%; background: linear-gradient(rgba(255,255,255,.28), rgba(255,255,255,0) 45%, rgba(0,0,0,.14)); z-index: 2; }
    .pg-scene::after { content: ''; position: absolute; top: 3px; left: 8px; right: 8px; height: 4px; border-radius: 4px; background: rgba(255,255,255,.55); z-index: 2; }
    .pg-scene i { position: absolute; bottom: 3px; font-style: normal; font-size: 16px; line-height: 1; transform: translateY(var(--y, 0px)); filter: drop-shadow(0 2px 0 rgba(0,0,0,.18)); }
    .pg-shine { position: absolute; top: -10%; bottom: -10%; width: 36px; left: -60px; transform: skewX(-22deg); background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.75), rgba(255,255,255,0)); z-index: 2; opacity: 0; }
    .pg-shine.go { animation: pgShine .9s ease-out; }
    .pg-goal { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 20px; line-height: 1; z-index: 4; filter: drop-shadow(0 2px 0 rgba(0,0,0,.2)); }
    .pg-goal.hop { animation: pgHop .65s cubic-bezier(.3,.7,.4,1); }
    .pg-goal.pop { animation: pgPop .9s ease; }
    .pg-pct { min-width: 3.6ch; text-align: right; font-weight: 900; font-size: 1.05rem; color: #1d1d1f; font-variant-numeric: tabular-nums; transition: color .3s; }
    .pgbar.full .pg-track { border-color: #8a5a00; box-shadow: 0 3px 0 #8a5a00, 0 0 0 3px rgba(255,200,40,.45); }
    .pgbar.full .pg-pct { color: #c47a00; }
    .pg-crown { position: absolute; right: 34px; top: -8px; font-size: 18px; transform: rotate(14deg) scale(0); transform-origin: 50% 100%; transition: transform .5s cubic-bezier(.3,1.8,.5,1); z-index: 5; pointer-events: none; }
    .pgbar.full .pg-crown { transform: rotate(14deg) scale(1); }
    .pg-chip { position: absolute; z-index: 6; pointer-events: none; padding: 2px 8px; border-radius: 10px; background: #1d1d1f; color: #fff; font-weight: 900; font-size: .8rem; white-space: nowrap; }
    .pg-conf { position: absolute; z-index: 6; pointer-events: none; width: 8px; height: 12px; border-radius: 2px; }

    @keyframes pgShine { 0% { opacity: 1; left: -60px; } 100% { opacity: 1; left: 105%; } }
    @keyframes pgHop { 0% { transform: translateY(-50%); } 30% { transform: translateY(calc(-50% - 9px)) scale(1.2, .9) rotate(-8deg); } 55% { transform: translateY(-50%) scale(.92, 1.08); } 100% { transform: translateY(-50%); } }
    @keyframes pgPop { 0% { transform: translateY(-50%) scale(.2) rotate(-40deg); } 55% { transform: translateY(-50%) scale(1.7) rotate(12deg); } 100% { transform: translateY(-50%); } }
    @media (prefers-reduced-motion: reduce) { .pg-scene { transition: none; } .pg-shine, .pg-goal { animation: none !important; } }
  `;
  document.head.append(css);

  const box = document.createElement('div');
  box.className = 'pgbar';
  box.innerHTML = '<div class="pg-track"><div class="pg-scene snap"></div><i class="pg-shine"></i><span class="pg-goal"></span></div><span class="pg-crown">👑</span><b class="pg-pct">0%</b>';
  top.append(box);
  const track = box.querySelector('.pg-track'), scene = box.querySelector('.pg-scene'), shine = box.querySelector('.pg-shine'),
    goal = box.querySelector('.pg-goal'), pctEl = box.querySelector('.pg-pct');
  let growT = 0, zone = -1, prev = 0, shown = 0, raf = 0;
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function countTo(v) {
    cancelAnimationFrame(raf);
    const from = shown, t0 = performance.now(), dur = calm ? 0 : 650;
    const step = (t) => {
      const k = dur ? Math.min(1, (t - t0) / dur) : 1;
      shown = Math.round(from + (v - from) * (1 - Math.pow(1 - k, 3)));
      pctEl.textContent = `${shown}%`;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function chip(text) {
    const r = box.getBoundingClientRect(), t = track.getBoundingClientRect(), pct = parseFloat(scene.dataset.pct || 0);
    const c = Object.assign(document.createElement('span'), { className: 'pg-chip', textContent: text });
    c.style.left = `${t.left - r.left + t.width * pct / 100 - 18}px`;
    c.style.top = `${t.top - r.top - 4}px`;
    box.append(c);
    c.animate([{ transform: 'translateY(6px) scale(.6)', opacity: 0 }, { transform: 'translateY(-8px) scale(1.1)', opacity: 1, offset: .25 }, { transform: 'translateY(-26px) scale(1)', opacity: 0 }], { duration: 1000, easing: 'ease-out' }).onfinish = () => c.remove();
  }

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
    const pct = Math.min(100, Math.floor(n * 100 / STEPS));
    const gain = pct > prev, instant = !gain;
    const z = Math.min(ZONES.length - 1, Math.max(0, Math.ceil(pct / 25) - 1));
    scene.classList.toggle('snap', instant);
    scene.style.setProperty('--hb', HATCH[z][0]);
    scene.style.setProperty('--hs', HATCH[z][1]);
    if (z !== zone) {
      const Z = ZONES[z];
      scene.innerHTML = `<div class="pg-art" style="background:${Z.sky}">${Z.items.map((e, i) => `<i style="left:${1 + i * 7.4}%;--y:${Z.y[i]}px">${e}</i>`).join('')}</div>`;
      goal.textContent = Z.goal;
      if (zone !== -1 && gain) { restart(goal, 'pop'); confetti(16); }
      zone = z;
    } else if (gain) restart(goal, 'hop');
    scene.dataset.pct = pct;
    scene.style.clipPath = `inset(0 ${100 - pct}% 0 0 round 0 5px 5px 0)`;
    if (gain) { box.classList.add('grow'); clearTimeout(growT); growT = setTimeout(() => box.classList.remove('grow'), 1000); restart(shine, 'go'); chip(`+${pct - prev}%`); if (pct === 100) setTimeout(() => confetti(26), 450); }
    box.classList.toggle('full', pct === 100);
    if (instant) { cancelAnimationFrame(raf); shown = pct; pctEl.textContent = `${pct}%`; } else countTo(pct);
    prev = pct;
  }
  if (window.MutationObserver) new MutationObserver(render).observe(solvedEl, { childList: true, characterData: true, subtree: true });
  render();
})();
