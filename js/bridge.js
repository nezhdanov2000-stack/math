/* Мост: иконка инструмента и анимация «соединения дробей».
 *   MG.bridge.icon
 *   MG.bridge.play({ fs, dot, left, right, barY, barH, final, sun, ref, onSwap, onBar }) → Promise
 *     dot   — центр точки умножения между дробями
 *     left / right — края между чертами двух дробей (x), barY/barH — высота и толщина черт
 *     final — прямоугольник итоговой общей черты
 *     sun / ref — куда приземлятся солнце и отражение (точки умножения в числителе и знаменателе)
 *     onSwap — момент, когда числа переезжают в одну дробь; onBar — когда мост стал чертой
 */
(() => {
  'use strict';
  const MG = window.MG;

  // иконка инструмента: две зацепленные шестерёнки
  const gearPath = (cx, cy, R, teeth, rot) => {
    let p = '';
    for (let k = 0; k < teeth; k++) {
      const a = (k / teeth) * Math.PI * 2 + rot;
      const w = Math.PI / teeth;
      [[-0.52, 0.76], [-0.3, 1], [0.3, 1], [0.52, 0.76]].forEach(([f, r]) => {
        const ang = a + f * w * 1.9;
        p += `${p ? 'L' : 'M'}${(cx + Math.cos(ang) * R * r).toFixed(2)} ${(cy + Math.sin(ang) * R * r).toFixed(2)}`;
      });
    }
    return `${p}Z`;
  };
  const icon = `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
    <path d="${gearPath(17.5, 18, 14, 9, 0)}" fill="#cbbdf3" stroke="#7b66cf" stroke-width="1.6"/>
    <circle cx="17.5" cy="18" r="7.6" fill="#b7a6ea" stroke="#7b66cf" stroke-width="1.3"/>
    <circle cx="17.5" cy="18" r="3.5" fill="#9ca3af" stroke="#6b7280" stroke-width="1.2"/>
    <circle cx="16.4" cy="16.8" r="1.2" fill="#fff" opacity=".85"/>
    <path d="${gearPath(35, 33, 10.5, 7, 0.2)}" fill="#e0d7fa" stroke="#7b66cf" stroke-width="1.6"/>
    <circle cx="35" cy="33" r="5.4" fill="#cbbdf3" stroke="#7b66cf" stroke-width="1.2"/>
    <circle cx="35" cy="33" r="2.5" fill="#9ca3af" stroke="#6b7280" stroke-width="1.1"/>
    <circle cx="34.2" cy="32.2" r=".9" fill="#fff" opacity=".85"/></svg>`;

  const style = document.createElement('style');
  style.textContent = `
    .br-fx { position: fixed; inset: 0; pointer-events: none; z-index: 75; }
    .br-back { position: fixed; inset: 0; pointer-events: none; z-index: -1; }
    .br-leaf { position: absolute; transform-origin: 0 50%; }
    .br-leaf i { position: absolute; inset: 0; display: block; box-sizing: border-box; }
    .br-leaf .lf-stone { background: #c4b49a; border: 2px solid #5b4a36; border-radius: 3px; box-shadow: inset 0 2px 0 #e7dcc8; }
    .br-leaf .lf-ink { background: #1d1d1f; border-radius: 1px; }
    .br-fx .br { position: absolute; will-change: left, width, top, height; }
    .br-rail { position: absolute; left: 0; right: 0; top: -22%; height: 26%; border-top: 3px solid #4b5563; border-radius: 2px;
      background: repeating-linear-gradient(90deg, #4b5563 0 3px, transparent 3px 9px); }
    .br-body { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
    .br-flat { position: absolute; inset: 0; background: #1d1d1f; opacity: 0; }
    .br-orb { position: absolute; width: 0; height: 0; }
    .br-orb .gear { position: absolute; left: 0; top: 0; display: block; translate: -50% -50%; overflow: visible; }
    .br-orb .gdot { position: absolute; left: 0; top: 0; translate: -50% -50%; border-radius: 50%; background: #1d1d1f; opacity: 0; }
  `;
  document.head.append(style);

  function play(o) {
    const T = (x) => MG.T(x * 2.7);   // общий множитель замедления
    const { fs } = o;
    const layer = document.createElement('div');
    layer.className = 'br-fx';
    document.body.append(layer);

    const hB = fs * 0.42;
    const w0 = fs * 0.3;
    const span = Math.max(fs * 0.9, o.right - o.left + 8);
    const cx = o.dot.x;

    // «крестик» расходится на две створки разводного моста
    const cy = o.dot.y;
    const s = fs * 0.17;                        // половина размера крестика
    const g = o.right - o.left;                 // зазор между чертами дробей
    const lenUp = g / 2 + 1;
    const tCross = fs * 0.09, tUp = fs * 0.15, tFlat = o.barH || fs * 0.085;
    const PHI0 = 45, PHI1 = 55;
    const leaves = [false, true].map((mirror) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = `position:absolute;left:${cx}px;top:0;width:0;height:0;${mirror ? 'transform:scaleX(-1);' : ''}`;
      const el = document.createElement('div');
      el.className = 'br-leaf';
      el.innerHTML = '<i class="lf-stone"></i><i class="lf-ink"></i>';
      wrap.append(el);
      layer.append(wrap);
      const X = (x) => (mirror ? cx - x : x - cx);
      const st = (x, y, len, phi, t) => ({ left: `${X(x)}px`, top: `${y - t / 2}px`, width: `${len}px`, height: `${t}px`, rotate: `${-phi}deg` });
      const xCross = mirror ? cx + s : cx - s;
      const xHinge = mirror ? o.right : o.left;
      return {
        el, stone: el.children[0], ink: el.children[1],
        cross: st(xCross, cy + s, 2 * Math.SQRT2 * s, PHI0, tCross),
        up: st(xHinge, o.barY, lenUp, PHI1, tUp),
        down: st(xHinge, o.barY, lenUp, 0, tFlat),
      };
    });
    leaves.forEach((L) => {
      Object.assign(L.el.style, L.cross);
      L.stone.style.opacity = '0';
      // крестик → створки: расходятся к опорам, становятся каменными
      L.el.animate([L.cross, L.up], { duration: T(620), easing: 'cubic-bezier(.3,.75,.2,1)', fill: 'forwards' });
      L.stone.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T(380), delay: T(140), fill: 'forwards' });
      L.ink.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(380), delay: T(140), fill: 'forwards' });
    });

    // две шестерёнки выезжают из-под моста: одна вверх, другая (зеркально) вниз
    const G = fs * 0.64;
    const dotSize = fs * 0.14;
    const gearSvg = (() => {
      const teeth = 8, rIn = 0.76, rOut = 1;
      let p = '';
      for (let k = 0; k < teeth; k++) {
        const a = (k / teeth) * Math.PI * 2;
        const w = Math.PI / teeth;
        [[-0.52, rIn], [-0.3, rOut], [0.3, rOut], [0.52, rIn]].forEach(([f, r]) => {
          const ang = a + f * w * 1.9;
          p += `${p ? 'L' : 'M'}${(Math.cos(ang) * r).toFixed(3)} ${(Math.sin(ang) * r).toFixed(3)}`;
        });
      }
      return `<svg class="gear" viewBox="-1.1 -1.1 2.2 2.2" width="${G}" height="${G}">
        <path d="${p}Z" fill="#cbbdf3" stroke="#8a76d8" stroke-width=".07" stroke-linejoin="round"/>
        <circle r=".55" fill="#b7a6ea" stroke="#8a76d8" stroke-width=".05"/>
        <circle r=".25" fill="#9ca3af" stroke="#6b7280" stroke-width=".05"/>
        <circle cx="-.07" cy="-.08" r=".09" fill="#fff" opacity=".8"/></svg>`;
    })();
    const mkOrb = (cls, to) => {
      const isSun = cls === 'sun';
      const orb = document.createElement('div');
      orb.className = `br-orb ${cls}`;
      Object.assign(orb.style, { left: `${to.x}px`, top: `${to.y}px` });   // шестерёнки стоят на месте будущих точек
      orb.innerHTML = `${gearSvg}<i class="gdot"></i>`;
      const gear = orb.querySelector('.gear');
      const gdot = orb.querySelector('.gdot');
      Object.assign(gdot.style, { width: `${dotSize}px`, height: `${dotSize}px` });
      layer.insertBefore(orb, layer.firstChild);
      // появляются, когда створки уже подняты
      orb.animate([{ opacity: 0, scale: '.2' }, { opacity: 1, scale: '1.12', offset: 0.7 }, { opacity: 1, scale: '1' }],
        { duration: T(420), delay: T(420), easing: 'ease-out', fill: 'both' });
      // вращаются на месте в разные стороны, как зацепленные
      gear.animate([{ rotate: '0deg' }, { rotate: `${isSun ? 360 : -360}deg` }], { duration: T(1000), iterations: Infinity, easing: 'linear' });
      // в конце шестерёнка сжимается в точку умножения
      const at = { duration: T(320), delay: T(1480), fill: 'both', easing: 'ease-in' };   // после того как створки опустились
      gear.animate([{ scale: '1', opacity: 1 }, { scale: '.14', opacity: 0 }], at);
      gdot.animate([{ opacity: 0 }, { opacity: 1 }], { ...at, easing: 'linear' });
      return orb;
    };
    mkOrb('sun', o.sun);
    mkOrb('ref', o.ref);

    return new Promise((resolve) => {
      // створки опускаются и сходятся в монолитную черту дроби
      setTimeout(() => {
        if (o.onSwap) o.onSwap();
        leaves.forEach((L) => {
          L.el.animate([L.up, L.down], { duration: T(560), easing: 'cubic-bezier(.55,0,.3,1)', fill: 'forwards' });
          L.stone.animate([{ opacity: 1 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }], { duration: T(560), fill: 'forwards' });
          L.ink.animate([{ opacity: 0 }, { opacity: 0, offset: 0.55 }, { opacity: 1 }], { duration: T(560), fill: 'forwards' });
        });
      }, T(1250));
      setTimeout(() => {
        if (o.onBar) o.onBar({ span, cx });
        setTimeout(() => layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(260), fill: 'forwards' }).finished
          .catch(() => {}).then(() => { layer.remove(); resolve(); }), T(o.hold || 0));
      }, T(1790));
    });
  }

  MG.bridge = { icon, play };
})();
