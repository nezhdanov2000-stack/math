/* Дождевое облако: иконка инструмента и анимация «дождь поливает целое — под ним вырастает единица».
 *   MG.rain.icon
 *   MG.rain.play({ fs, cx, cloudY, soilX, soilY, endY, onRise, onReveal }) → Promise
 *     cx, cloudY — центр облака (над целым); soilX, soilY — где в знаменателе вырастает росток (низ цифры)
 *     onRise()   — целое поднимается в числитель, появляется дробная черта
 *     onReveal() — росток превращается в цифру 1
 */
(() => {
  'use strict';
  const MG = window.MG;
  const { T, sleep } = MG;

  const CLOUD = 'M24 50 C9 50 3 34 15 27 C11 13 29 5 40 14 C46 0 71 1 75 16 C93 14 99 37 85 45 C90 52 81 55 76 50 Z';
  const cloudSvg = (id) => `<svg viewBox="0 0 100 62" stroke-linejoin="round" overflow="visible">
    <defs><radialGradient id="${id}" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#fbf9ff"/><stop offset=".55" stop-color="#d9d0ff"/><stop offset="1" stop-color="#b3a6f5"/></radialGradient></defs>
    <path d="${CLOUD}" fill="url(#${id})" stroke="#8a7be8" stroke-width="2.4"/>
    <path d="M22 22 C26 15 33 13 38 16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/></svg>`;

  const icon = `<svg viewBox="0 0 48 48" stroke-linejoin="round" stroke-linecap="round">
    <g transform="translate(2 3) scale(.44)">
      <defs><radialGradient id="rainIc" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#fbf9ff"/><stop offset=".55" stop-color="#d9d0ff"/><stop offset="1" stop-color="#b3a6f5"/></radialGradient></defs>
      <path d="${CLOUD}" fill="url(#rainIc)" stroke="#8a7be8" stroke-width="3.2"/>
      <path d="M22 22 C26 15 33 13 38 16" fill="none" stroke="#fff" stroke-width="4" opacity=".85"/>
    </g>
    <path d="M13 34 L11 41 M23 34 L21 43 M33 34 L31 41" stroke="#4f46e5" stroke-width="3.2" fill="none"/>
    <path d="M18 38 L17 42.5 M28 37 L27 41" stroke="#818cf8" stroke-width="2.6" fill="none"/></svg>`;

  const style = document.createElement('style');
  style.textContent = `
    .rain-fx { position: fixed; inset: 0; pointer-events: none; z-index: 70; }
    .rain-fx > * { position: absolute; }
    .rain-fx .cloud svg { display: block; width: 100%; height: auto; overflow: visible; filter: drop-shadow(0 .06em .09em rgba(100, 90, 200, .25)); }
    .rain-fx .drop { width: 5px; border-radius: 4px; background: linear-gradient(180deg, rgba(129, 140, 248, 0), #6366f1 55%, #4f46e5); opacity: 0; }
    .rain-fx .soil svg, .rain-fx .sprout svg { display: block; width: 100%; height: 100%; overflow: visible; }
  `;
  document.head.append(style);

  const mk = (cls, css) => { const el = document.createElement('div'); el.className = cls; Object.assign(el.style, css); return el; };

  async function play(o) {
    const { fs } = o;
    const fx = mk('rain-fx', {});
    document.body.append(fx);
    const cw = fs * 1.25;
    const cloud = mk('cloud', { width: `${cw}px`, left: `${o.cx - cw / 2}px`, top: `${o.cloudY - cw * 0.31}px` });
    cloud.innerHTML = cloudSvg(`rc${Math.random().toString(36).slice(2, 7)}`);
    fx.append(cloud);
    const appear = cloud.animate([{ scale: '.3', opacity: 0 }, { scale: '1.08', opacity: 1, offset: .6 }, { scale: '1', opacity: 1 }],
      { duration: T(700), easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'forwards' });
    await appear.finished.catch(() => {});
    const bob = cloud.animate([{ translate: '0 0' }, { translate: `0 ${-fs * 0.06}px` }, { translate: '0 0' }],
      { duration: T(1800), iterations: Infinity, easing: 'ease-in-out' });

    // дождь
    const top = o.cloudY + cw * 0.22;
    const drops = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const h = fs * (0.2 + Math.random() * 0.12);
      const x = (o.rainX ?? o.cx) + (Math.random() - 0.5) * cw * 0.5;
      const d = mk('drop', { height: `${h}px`, left: `${x}px`, top: `${top}px` });
      fx.append(d);
      const dist = Math.max(10, o.endY - top - h);
      drops.push(d.animate([
        { transform: 'translateY(0)', opacity: 0 },
        { opacity: 1, offset: .12 },
        { transform: `translateY(${dist}px)`, opacity: 1, offset: .88 },
        { transform: `translateY(${dist}px)`, opacity: 0 },
      ], { duration: T(750 + Math.random() * 250), delay: T(Math.random() * 700), iterations: Infinity, easing: 'linear' }));
    }
    await sleep(T(1300));

    // целое садится на черту у земли; в знаменателе появляется земля
    const dg = o.digitRect, cs = getComputedStyle(o.digitEl);
    const sh = fs * 0.26, sw = fs * 0.7;
    o.onStart();
    const wrapTop = dg.top - fs * 2;
    const wrap = mk('clip', { left: `${dg.left - fs * 0.3}px`, width: `${dg.width + fs * 0.6}px`, top: `${wrapTop}px`, height: `${o.soilTop - wrapTop}px`, overflow: 'hidden' });
    const sprout = mk('sprout', { position: 'absolute', left: `${fs * 0.3}px`, top: `${fs * 2}px`, width: `${dg.width}px`, height: `${dg.height}px`,
      font: cs.font, lineHeight: cs.lineHeight, color: '#2f9e44', display: 'flex', alignItems: 'center', justifyContent: 'center',
      translate: `0 ${o.lift}px` });
    sprout.textContent = '1';
    wrap.append(sprout);
    fx.append(wrap);
    const soil = mk('soil', { width: `${sw}px`, height: `${sh}px`, left: `${o.soilX - sw / 2}px`, top: `${o.soilTop - sh * 0.78}px`, transformOrigin: '50% 100%' });
    soil.innerHTML = `<svg viewBox="0 0 62 24"><path d="M3 23 Q6 9 20 8 Q31 5 42 8 Q56 9 59 23 Z" fill="#b8893a" stroke="#6b4a14" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="18" cy="16" r="1.8" fill="#7a5418"/><circle cx="31" cy="13" r="1.8" fill="#7a5418"/><circle cx="44" cy="16" r="1.8" fill="#7a5418"/></svg>`;
    fx.append(soil);
    soil.animate([{ scale: '1 0', opacity: 0 }, { scale: '1 1.15', opacity: 1, offset: .7 }, { scale: '1 1' }],
      { duration: T(600), easing: 'cubic-bezier(.3,1.2,.5,1)', fill: 'both' });
    await sleep(T(950));

    // единица рывками вылезает из земли и поднимает черту вместе с целым
    const N = 6;
    let cur = o.lift;
    for (let k = 1; k <= N; k++) {
      const rem = o.lift * (1 - k / N);
      const ms = T(190);
      o.setLift(rem, ms);
      sprout.animate([{ translate: `0 ${cur}px` }, { translate: `0 ${rem}px` }], { duration: ms, easing: 'cubic-bezier(.2,.9,.3,1.25)' });
      sprout.style.translate = `0 ${rem}px`;
      soil.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${fs * 0.03}px) scale(1.04, .94)`, offset: .3 }, { transform: `translateX(${-fs * 0.03}px)`, offset: .6 }, { transform: 'none' }],
        { duration: T(260) });
      cur = rem;
      await sleep(T(190 + 300));
    }
    o.endLift();
    await sleep(T(150));

    // росток становится цифрой 1
    o.onReveal();
    wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(500), easing: 'ease-in', fill: 'forwards' });
    soil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(520), delay: T(150), fill: 'forwards' });
    drops.forEach((a) => a.cancel());
    [...fx.querySelectorAll('.drop')].forEach((d) => d.remove());
    bob.cancel();
    const away = cloud.animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: `${fs * 0.5}px ${-fs * 0.5}px`, scale: '.7' }],
      { duration: T(800), delay: T(250), easing: 'ease-in', fill: 'forwards' });
    await away.finished.catch(() => {});
    await sleep(T(300));
    fx.remove();
  }

  MG.rain = { icon, play };
})();
