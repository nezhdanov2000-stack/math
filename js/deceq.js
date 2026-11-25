/* Общий шаг «уравнение с запятыми → уравнение с целыми» для режимов острова IV «Десятичные дроби → Уравнения»
 * (decprop — пропорции, decshift — перенос через «=»; сами режимы — pp.js и sh.js через build()).
 *
 *   MG.deceq.decs('0,125') → 3;   MG.deceq.val('0,15') → 0.15;   MG.deceq.times('0,15', 2) → '15'
 *   MG.deceq.need(['1,5', '0,25', '7']) → 100 — наименьший множитель 10…, после которого запятых не останется
 *   MG.deceq.joker({ n, d, headHTML, ansHTML, from, frac, need, longest, say, onLay, onDrop }) → Promise<held | null>
 *       планшет «на что умножаем» (MG.clip.askMul) + карта-джокер в руке (MG.joker.hold); onLay(card, v) — карту положили
 *   MG.deceq.lay(card, frac, targets, v) — карта отдаёт число меткам «·10» (MG.joker.lay)
 *   MG.deceq.tag(v) — метка «·100» (спрятана, ждёт карту)
 *   MG.deceq.harp(el, str, z, tag) → Promise<'15'> — гарпун сам: единица из метки летит гарпуном к запятой,
 *       каждый ноль подтягивает запятую на цифру вправо (не хватает цифр — серый 0), в конце запятая падает,
 *       нули впереди исчезают. Анимация идёт прямо в el (его текст заменяется цифрами), метка tag тает.
 *   MG.deceq.coachMul(need) — шаг пальца на открытом планшете (клавиша / галочка) или null */
(() => {
  'use strict';
  const MG = window.MG;
  const { T, sleep } = MG;
  const snd = (n, o) => { if (MG.snd && MG.snd.play) MG.snd.play(n, o); };

  const decs = (s) => { const f = String(s).split(',')[1]; return f ? f.length : 0; };
  const val = (s) => Number(String(s).replace(',', '.'));
  function times(s, z) {
    const [ip, fp = ''] = String(s).split(',');
    let d = ip + fp; const p = ip.length + z;
    while (d.length < p) d += '0';
    const I = d.slice(0, p).replace(/^0+(?=\d)/, ''), F = d.slice(p).replace(/0+$/, '');
    return F ? `${I},${F}` : I;
  }
  const need = (strs) => 10 ** Math.max(0, ...strs.map(decs));
  const znak = (n) => (n === 1 ? 'знак' : n < 5 ? 'знака' : 'знаков');

  const css = document.createElement('style');
  css.textContent = `
    .dq-m { display: inline-block; color: #d97706; font-weight: 900; margin-left: .06em; white-space: nowrap; font-size: .74em; }
    .dq-m i { font-style: normal; display: inline-block; }
    .sh-t > .dq-m { position: absolute; left: 50%; bottom: 88%; translate: -50% 0; margin: 0; font-size: .62em; }   /* в уравнении — над слагаемым: строка не растёт */
    .dq-d { display: inline-block; }
    .dq-d.new { color: #9aa1ad; }
    .dq-c { display: inline-block; color: #e0362d; }
    .dq-arrow { position: fixed; z-index: 63; pointer-events: none; translate: 0 -50%; }
    .dq-arrow svg { display: block; width: 100%; height: 100%; }
    .clip-w.mul .cw-head.eqh { flex-direction: column; gap: 10px; font-size: clamp(1.05rem, 5.4vw, 2rem); }
    .clip-w.mul .cw-head.eqh .clip-ans { font-size: inherit; gap: 6px; flex-wrap: wrap; justify-content: center; }
    .clip-w.mul .cw-head.eqh .cw-f { white-space: nowrap; }
  `;
  document.head.append(css);

  function checkMul(v, p, longest) {
    if (v === p) return true;
    if (![10, 100, 1000, 10000].includes(v)) return 'Умножай на 10, 100 или 1000 — тогда запятая просто сдвинется';
    const z = decs(longest);
    if (v < p) return `×${v} мало: у ${longest} ${z} ${znak(z)} после запятой — запятая не уйдёт`;
    return `Хватит ${p}: у ${longest} ${z} ${znak(z)} после запятой`;
  }

  /* планшет + карта в руке; пока планшет открыт — повторно не открываем */
  let asking = false;
  async function joker(o) {
    if (asking || MG.joker.holding()) return null;
    asking = true;
    let sl = null;
    const v = await MG.clip.askMul(o.n || '', o.d || '', o.from, {
      maxLen: 4, headHTML: o.headHTML, ansHTML: o.ansHTML,
      slot: (el) => { sl = MG.joker.slot(el); },
      onType: (x) => { if (sl) sl.set(x); },
    });
    asking = false;
    if (!v || !sl || (o.alive && !o.alive())) return null;
    const r = sl.rect();
    sl.hide();
    return MG.joker.hold(r, v, {
      frac: o.frac,
      check: (x) => checkMul(x, o.need, o.longest),
      onLay: (card, x) => o.onLay(card, x),
      say: o.say,
      onDrop: o.onDrop,
    });
  }

  function tag(v) {
    const t = document.createElement('span');
    t.className = 'dq-m';
    t.innerHTML = `<i>·</i>${String(v).split('').map((c) => `<i>${c}</i>`).join('')}`;
    t.style.opacity = '0';
    return t;
  }
  const lay = (card, frac, targets, v) => MG.joker.lay(card, { frac, targets, value: v, color: '#d97706' });

  /* гарпун из dec10.js — лежащая единица: остриё слева, зубец снизу */
  const ARROW = '<svg viewBox="0 0 24 12" fill="none" stroke="#1d1d1f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 5 H23"/><path d="M1.5 5 L7.5 10.5"/></svg>';

  /* FLIP: дети el плавно едут на новые места */
  function flip(el, fn, ms = 320) {
    const kids = [...el.children], first = new Map(kids.map((k) => [k, k.getBoundingClientRect()]));
    fn();
    [...el.children].forEach((k) => {
      const a = first.get(k); if (!a) return;
      const b = k.getBoundingClientRect(), dx = a.left - b.left;
      if (Math.abs(dx) > 0.5) k.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: T(ms), easing: 'cubic-bezier(.3,.7,.2,1)' });
    });
  }

  async function harp(el, str, z, tg, opt = {}) {
    const res = times(str, z);
    const [ip, fp = ''] = String(str).split(',');
    const ds = (ip + fp).split('').map((c) => { const s = document.createElement('span'); s.className = 'dq-d'; s.textContent = c; return s; });
    const comma = document.createElement('span'); comma.className = 'dq-c'; comma.textContent = ',';
    let p = ip.length;
    el.style.whiteSpace = 'nowrap';
    const put = () => el.replaceChildren(...ds.slice(0, p), comma, ...ds.slice(p));
    el.replaceChildren(...ds.slice(0, p), ...ds.slice(p));
    const fs = parseFloat(getComputedStyle(el).fontSize) || 30;
    if (!fp) {                                                       // у целого числа запятая прячется в конце — проявляется
      flip(el, put);
      comma.animate([{ scale: '0', opacity: 0 }, { scale: '1.5', opacity: 1 }, { scale: '1' }], { duration: T(380) });
      await sleep(400);
    } else put();
    if (opt.onGrow) opt.onGrow();
    const zs = tg ? [...tg.querySelectorAll('i')].slice(2) : [];
    const one = tg ? tg.querySelectorAll('i')[1] : null;
    /* единица метки ложится на бок и летит гарпуном к запятой */
    const arrow = document.createElement('div');
    arrow.className = 'dq-arrow';
    arrow.innerHTML = ARROW;
    const aw = fs * 0.9, ah = aw / 2;
    Object.assign(arrow.style, { width: `${aw}px`, height: `${ah}px` });
    const at = () => { const c = comma.getBoundingClientRect(); return { x: c.left + c.width * 0.5, y: c.top + c.height * 0.78 }; };
    const src = one ? one.getBoundingClientRect() : el.getBoundingClientRect();
    const s0 = { x: src.left + src.width / 2, y: src.top + src.height / 2 };
    Object.assign(arrow.style, { left: `${s0.x}px`, top: `${s0.y}px` });
    document.body.append(arrow);
    if (one) one.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(160), fill: 'forwards' });
    let a1 = at();
    snd('whoosh', { dur: 0.4 });
    await arrow.animate([{ left: `${s0.x}px`, top: `${s0.y}px`, rotate: '-90deg', opacity: 0.4 },
      { left: `${(s0.x + a1.x) / 2}px`, top: `${Math.min(s0.y, a1.y) - fs * 0.5}px`, rotate: '-20deg', opacity: 1, offset: 0.5 },
      { left: `${a1.x}px`, top: `${a1.y}px`, rotate: '0deg', opacity: 1 }], { duration: T(520), easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.catch(() => {});
    arrow.getAnimations().forEach((a) => a.cancel());
    Object.assign(arrow.style, { left: `${a1.x}px`, top: `${a1.y}px` });
    comma.animate([{ translate: '0 0' }, { translate: '2px 0' }, { translate: '0 0' }], { duration: T(200) });
    snd('pop');
    /* каждый ноль метки — оборот: запятая на цифру вправо */
    for (let i = 0; i < z; i++) {
      const zr = zs[i];
      if (zr) {
        const r = zr.getBoundingClientRect();
        zr.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate(${a1.x - (r.left + r.width / 2)}px, ${a1.y - (r.top + r.height / 2)}px) scale(.3)` }], { duration: T(260), easing: 'ease-in', fill: 'forwards' });
      }
      await sleep(200);
      if (p >= ds.length) {
        const s = document.createElement('span'); s.className = 'dq-d new'; s.textContent = '0';
        ds.push(s);
        flip(el, () => el.append(s));
        s.animate([{ scale: '.2', opacity: 0 }, { scale: '1.2', opacity: 1 }, { scale: '1' }], { duration: T(320), easing: 'ease-out' });
        if (opt.onGrow) opt.onGrow();
      }
      p += 1;
      flip(el, put, 300);
      comma.animate([{ translate: '0 0' }, { translate: '0 -10px', offset: 0.5 }, { translate: '0 0' }], { duration: T(300), easing: 'ease-in-out' });
      a1 = at();
      arrow.animate([{ left: arrow.style.left }, { left: `${a1.x}px` }], { duration: T(300), easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' });
      Object.assign(arrow.style, { left: `${a1.x}px`, top: `${a1.y}px` });
      snd('tick');
      await sleep(330);
    }
    /* гарпун отцепляется, метка тает */
    arrow.animate([{ opacity: 1 }, { opacity: 0, translate: '30% -50%' }], { duration: T(260), fill: 'forwards' }).onfinish = () => arrow.remove();
    if (tg) tg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(220), fill: 'forwards' });
    ds.forEach((d) => d.classList.remove('new'));
    await sleep(160);
    /* запятая в конце — число целое: запятая падает; нули впереди не пишут */
    if (p >= ds.length) {
      await comma.animate([{ translate: '0 0', opacity: 1 }, { translate: '0 .6em', opacity: 0, rotate: '40deg' }], { duration: T(360), easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
      flip(el, () => comma.remove());
    }
    const lead = [];
    for (let i = 0; i < ds.length - 1 && i < p - 1 && ds[i].textContent === '0'; i++) lead.push(ds[i]);
    if (lead.length) {
      await Promise.all(lead.map((d) => d.animate([{ opacity: 1 }, { opacity: 0, scale: '.5' }], { duration: T(260), fill: 'forwards' }).finished.catch(() => {})));
      flip(el, () => lead.forEach((d) => d.remove()));
    }
    if (opt.onGrow) opt.onGrow();
    await sleep(300);
    return res;
  }

  /* палец на планшете «на что умножаем»: набрать need и нажать галочку */
  function coachMul(p, z, longest) {
    const ov = document.querySelector('.clip-ov.mul:not(.out)');
    if (!ov) return null;
    const t = ov.dataset.v || '', ms = String(p);
    const key = t === ms ? ov.querySelector('.go') : ms.startsWith(t) ? ov.querySelector(`.k[data-d="${ms[t.length]}"]`) : ov.querySelector('.k[data-d="x"]');
    return { tool: 'joker', el: key, text: t === ms ? 'Готово — нажми галочку' : `Набери ${ms}: у ${longest} ${z} ${znak(z)} после запятой` };
  }

  /* все задачи режима решены: «Уровень пройден!» → на карту */
  function offerDone(name, total, solved, text) {
    if (document.querySelector('.so-ov')) return;
    const ov = document.createElement('div');
    ov.className = 'so-ov';
    ov.innerHTML = `<div class="skip-offer" role="dialog"><h3>Уровень пройден!</h3><p>${text}</p><div class="so-row"><button type="button" class="so-go">На карту</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('.so-go').addEventListener('click', () => {
      try { localStorage.setItem(`mg.solved.${name}`, String(Math.max(total, solved))); } catch (err) { /* нет хранилища */ }
      ov.remove();
      const home = document.getElementById('home-btn');
      if (home) home.click();
    });
  }

  MG.deceq = { offerDone, decs, val, times, need, znak, checkMul, joker, tag, lay, harp, coachMul, asking: () => asking };
})();
