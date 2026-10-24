/* Поршни: слева и справа выезжают поршни и сжимают дроби, пока те не сольются в одну.
 *   MG.press(targets, { onPeak }) — targets: элементы (дроби и знаки), которые будут сжаты.
 *   В момент наибольшего сжатия вызывается onPeak(): там нужно мгновенно перестроить разметку
 *   (одна дробь вместо нескольких) и вернуть элементы, которые должны «выскочить» после сжатия.
 *   Промис завершается, когда поршни уехали обратно.
 */
(() => {
  'use strict';
  const MG = window.MG;

  const style = document.createElement('style');
  style.textContent = `
    .piston { position: fixed; z-index: 58; pointer-events: none; display: flex; align-items: center; will-change: transform; }
    .piston.right { flex-direction: row-reverse; }
    .p-rod {
      flex: 1; height: var(--rod, 26px);
      background:
        repeating-linear-gradient(90deg, transparent 0 90px, rgba(40, 50, 66, .28) 90px 95px),
        linear-gradient(180deg, #8996a8 0%, #eef2f7 34%, #aab5c4 62%, #6e7a8c 100%);
      border-top: 2px solid #3b4656; border-bottom: 2px solid #3b4656;
    }
    .p-head {
      position: relative; width: 34px; height: 100%;
      background: linear-gradient(90deg, #7b8799, #d4dbe5 42%, #8793a5);
      border: 2px solid #3b4656; border-radius: 7px;
      box-shadow: 0 8px 20px rgba(30, 40, 60, .35), inset 0 0 0 2px rgba(255, 255, 255, .35);
    }
    .piston.left .p-head { border-radius: 4px 9px 9px 4px; }
    .piston.right .p-head { border-radius: 9px 4px 4px 9px; }
    .p-head::before {                       /* предупреждающая полоса на рабочей грани */
      content: ''; position: absolute; top: 6px; bottom: 6px; width: 9px;
      background: repeating-linear-gradient(135deg, #facc15 0 7px, #1d1d1f 7px 14px);
      border-radius: 3px;
    }
    .piston.left .p-head::before { right: 5px; }
    .piston.right .p-head::before { left: 5px; }
    .p-head::after {                        /* болты */
      content: ''; position: absolute; width: 7px; height: 7px; border-radius: 50%;
      background: radial-gradient(circle at 35% 30%, #fff, #566174);
      top: 8px; box-shadow: 0 var(--bolt, 60px) 0 #566174;
    }
    .piston.left .p-head::after { left: 6px; }
    .piston.right .p-head::after { right: 6px; }
  `;
  document.head.append(style);

  const easeOut = (t) => 1 - (1 - t) ** 3;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
  const easeIn = (t) => t * t * t;

  function tween(ms, fn) {
    return new Promise((res) => {
      const d = MG.T(ms);
      const t0 = performance.now();
      (function frame(now) {
        const p = Math.min(1, (now - t0) / d);
        fn(p);
        if (p < 1) requestAnimationFrame(frame); else res();
      })(t0);
    });
  }

  async function press(targets, { onPeak } = {}) {
    const els = targets.filter((e) => e && e.isConnected);
    if (!els.length) { if (onPeak) await onPeak(); return; }

    const rects = els.map((e) => e.getBoundingClientRect());
    const L0 = Math.min(...rects.map((r) => r.left));
    const R0 = Math.max(...rects.map((r) => r.right));
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const cx = (L0 + R0) / 2;
    const cy = (top + bottom) / 2;
    const W0 = R0 - L0;
    const Wmin = Math.max(W0 * 0.3, 96);
    const H = Math.max(110, bottom - top + 36);
    const HEAD = 34;
    const GAP = 6;
    const vw = window.innerWidth;

    const mkPiston = (side) => {
      const p = document.createElement('div');
      p.className = `piston ${side}`;
      Object.assign(p.style, {
        top: `${cy - H / 2}px`, height: `${H}px`, width: `${vw + HEAD}px`,
        '--rod': `${Math.max(22, H * 0.22)}px`, '--bolt': `${H - 30}px`, left: '0px',
      });
      p.innerHTML = '<div class="p-rod"></div><div class="p-head"></div>';
      document.body.append(p);
      return p;
    };
    const left = mkPiston('left');
    const right = mkPiston('right');
    // x — положение рабочей грани головки (внутренний край)
    const setHeads = (xl, xr) => {
      left.style.transform = `translateX(${xl - (vw + HEAD)}px)`;
      right.style.transform = `translateX(${xr}px)`;
    };
    const farL = -HEAD - 40;
    const farR = vw + HEAD + 40;
    setHeads(farL, farR);

    // 1. поршни выезжают к краям дробей
    const touchL = L0 - GAP;
    const touchR = R0 + GAP;
    await tween(700, (p) => {
      const e = easeOut(p);
      setHeads(farL + (touchL - farL) * e, farR + (touchR - farR) * e);
    });

    // 2. сжатие: дроби сплющиваются вместе с расстоянием между головками
    els.forEach((el, i) => { el.style.transformOrigin = `${cx - rects[i].left}px 50%`; });
    await tween(1050, (p) => {
      const e = easeIO(p);
      const w = W0 + (Wmin - W0) * e;
      const sx = w / W0;
      const sy = 1 + (1 - sx) * 0.14;
      els.forEach((el) => { el.style.transform = `scale(${sx}, ${sy})`; });
      setHeads(cx - w / 2 - GAP, cx + w / 2 + GAP);
    });

    // 3. пик: вспышка, дроби сливаются в одну
    els.forEach((el) => { el.style.transform = ''; el.style.transformOrigin = ''; });
    const mark = document.createElement('div');
    Object.assign(mark.style, { position: 'fixed', left: `${cx - 20}px`, top: `${cy - 20}px`, width: '40px', height: '40px', pointerEvents: 'none' });
    document.body.append(mark);
    MG.explode(mark, '#fbbf24');
    mark.remove();
    document.body.animate([
      { translate: '0 0' }, { translate: '-5px 2px' }, { translate: '5px -2px' }, { translate: '-3px 1px' }, { translate: '0 0' },
    ], { duration: MG.T(260) });

    const popEls = (onPeak ? await onPeak() : null) || [];
    popEls.forEach((el) => {
      el.animate([
        { transform: 'scale(.25, 1.25)', opacity: 0.2 },
        { transform: 'scale(1.12, .92)', opacity: 1, offset: 0.55 },
        { transform: 'scale(1)', opacity: 1 },
      ], { duration: MG.T(620), easing: MG.EASE });
      MG.burst(el, '#fbbf24', 10);
    });

    // 4. поршни уезжают обратно
    const nowL = cx - Wmin / 2 - GAP;
    const nowR = cx + Wmin / 2 + GAP;
    await MG.sleep(160);
    await tween(700, (p) => {
      const e = easeIn(p);
      setHeads(nowL + (farL - nowL) * e, nowR + (farR - nowR) * e);
    });
    left.remove();
    right.remove();
  }

  MG.press = press;
})();
