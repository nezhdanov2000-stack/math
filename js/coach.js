/* Подсказка-палец для первой задачи режима «Сокращение чисел»:
 * показывает, как пользоваться кувалдой и ластиком. Следит за состоянием на экране
 * и каждый раз показывает ближайший нужный шаг. После первой решённой задачи больше не появляется. */
(() => {
  'use strict';
  let active = false;
  window.addEventListener('mg:hints', (e) => { active = !!e.detail.on; if (!active) hide(); });

  const css = document.createElement('style');
  css.textContent = `
    .coach { position: fixed; z-index: 80; width: 0; height: 0; pointer-events: none; transition: left .55s cubic-bezier(.3,.8,.3,1), top .55s cubic-bezier(.3,.8,.3,1), opacity .3s; opacity: 0; }
    .coach.on { opacity: 1; }
    .coach .co-r { position: absolute; left: -26px; top: -26px; width: 52px; height: 52px; border-radius: 50%; border: 4px solid #f97316; animation: coRing 1.3s ease-out infinite; }
    .coach .fg { position: absolute; left: -3px; top: -3px; width: 42px; height: 56px; transform-origin: 3px 3px; filter: drop-shadow(0 4px 4px rgba(0,0,0,.3)); animation: coTap 1.3s ease-in-out infinite; }
    .coach .fg svg { display: block; width: 100%; height: 100%; }
        .coach .tip { position: fixed; left: 50%; transform: translateX(-50%); width: max-content; max-width: min(78vw, 280px); padding: 8px 14px; border-radius: 16px; background: #1d1d1f; color: #fff; font-weight: 800; font-size: .95rem; text-align: center; line-height: 1.25; box-shadow: 0 6px 16px rgba(0,0,0,.3); }
    @keyframes coTap { 0%, 100% { transform: translate(14px, 18px); } 40% { transform: translate(0, 0); } 52% { transform: scale(.88); } 64% { transform: scale(1); } }
    .toolbar { transition: transform .5s cubic-bezier(.3,.9,.3,1); }
    body.co-lift .toolbar { transform: translateY(-84px); }
    @keyframes coRing { 0%, 35% { transform: scale(.4); opacity: 0; } 50% { opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
  `;
  document.head.append(css);

  let el = null, lastKey = '';
  const ensure = () => {
    if (el && el.isConnected) return el;
    el = document.createElement('div');
    el.className = 'coach';
    el.innerHTML = '<i class="co-r"></i><span class="fg"><svg viewBox="0 0 24 32" stroke="#000" stroke-width="1.9" stroke-linejoin="round"><path d="M2 2V24L7.800 18.700L12.200 29L16.800 27L12.400 16.800H20.200Z" fill="#fff"/></svg></span><div class="tip"></div>';
    document.body.append(el);
    return el;
  };
  const lift = (on) => document.body.classList.toggle('co-lift', on);
  const hide = () => { if (el) el.classList.remove('on'); lastKey = ''; lift(false); };

  function point(target, text, key) {
    const c = ensure(), r = target.getBoundingClientRect();
    if (!r.width) { hide(); return; }
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dn = !!target.closest('.toolbar'), inClip = !!target.closest('.clip');
    lift(dn);
    c.style.left = `${Math.max(60, Math.min(innerWidth - 60, cx))}px`;
    c.style.top = `${cy}px`;
    const tip = c.querySelector('.tip'), fr = document.getElementById('fraction').getBoundingClientRect();
    if (inClip) { tip.style.top = 'auto'; const eq = document.querySelector('.clip .eq'); tip.style.bottom = `${innerHeight - (eq ? eq.getBoundingClientRect().top : r.top) + 8}px`; }
    else if (dn) { tip.style.top = 'auto'; tip.style.bottom = `${innerHeight - r.top + 70}px`; }
    else { tip.style.bottom = 'auto'; tip.style.top = `${Math.max(r.bottom, fr.bottom) + 56}px`; }
    if (key !== lastKey) { c.querySelector('.tip').textContent = text; lastKey = key; }
    c.classList.add('on');
  }

  /* планшет с клавиатурой: показываем, какие цифры нажимать и куда */
  function clipStep(ov) {
    const n = +ov.querySelector('.top .sk').textContent;
    let a = 2; while (n % a) a++;
    const want = [String(a), String(n / a)];
    const boxes = [...ov.querySelectorAll('.bx')];
    const vals = boxes.map((b) => b.textContent.trim());
    const key = (d) => ov.querySelector(`.k[data-d="${d}"]`);
    const i = vals[0] === want[0] ? (vals[1] === want[1] ? 2 : 1) : 0;
    if (i < 2 && !want[i].startsWith(vals[i])) { hide(); return; }       // ошибся — подсказка ждёт
    if (i === 2) { point(ov.querySelector('.k.go'), 'Готово — нажми галочку', 'cgo'); return; }
    if (i === 1 && !boxes[1].classList.contains('on')) { point(boxes[1], 'Теперь второй множитель — нажми на него', 'cb1'); return; }
    const d = want[i][vals[i].length];
    const txt = i === 0 ? `Впиши первый множитель: ${want[0]}` : `Впиши второй множитель: ${want[1]}`;
    point(key(d), txt, `ck${i}${vals[i].length}${d}`);
  }

  let fin = false;
  document.addEventListener('pointerdown', (e) => { if (e.target.closest && e.target.closest('.token') && lastKey.startsWith('g2')) { fin = true; hide(); } }, true);
  function tick() {
    const mode = document.getElementById('mode-cancel');
    if (!active || !mode || mode.hidden) { hide(); fin = false; return; }
    const after = document.getElementById('after');
    if (after && after.classList.contains('show')) { hide(); return; }
    const ov = document.querySelector('.clip-ov:not(.out)');
    if (ov) { clipStep(ov); return; }
    const toks = [...document.querySelectorAll('#num .token, #den .token')].filter((t) => !t.classList.contains('one'));
    const tool = document.body.dataset.tool;
    const toolBtn = (id) => document.querySelector(`.toolbar .tool[data-id="${id}"]`);
    const big = toks.find((t) => t.classList.contains('big') && !t.classList.contains('paired'));
    if (big) {
      if (tool !== 'hammer' && toolBtn('hammer')) point(toolBtn('hammer'), 'Начнём с кувалды — нажми на неё', 'hb');
      else if (MG.clip && MG.clip.isManual()) point(big, 'Нажми на число и впиши два множителя', `m${big.textContent}`);
      else point(big, 'Ударь кувалдой по числу — оно разобьётся на множители', `h${big.textContent}`);
      return;
    }
    const paired = toks.filter((t) => t.classList.contains('paired'));
    if (fin) { hide(); if (!paired.length) fin = false; return; }
    if (paired.length) {
      if (tool !== 'glove' && toolBtn('glove')) { point(toolBtn('glove'), 'Теперь возьми ластик — он сокращает одинаковые множители', 'gb'); return; }
      const sel = toks.find((t) => t.classList.contains('sel'));
      if (!sel) {
        const top = paired.find((t) => t.parentElement.id === 'num') || paired[0];
        point(top, 'Ластиком нажми на множитель сверху…', `g1${top.textContent}`);
      } else {
        const other = sel.parentElement.id === 'num' ? 'den' : 'num';
        const mate = paired.find((t) => t.parentElement.id === other && t.textContent === sel.textContent);
        if (mate) point(mate, '…и на такой же снизу — они сократятся', `g2${mate.textContent}`); else hide();
      }
      return;
    }
    hide();
  }
  setInterval(tick, 250);
})();
