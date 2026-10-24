/* Неудачный запуск ракеты: числа разлетаются по разным траекториям, возвращаются на место и взрываются.
 *   MG.scatter(el, { color, delay, duration }) → Promise, завершается, когда число вернулось и взорвалось.
 */
(() => {
  'use strict';
  const MG = window.MG;
  const rnd = MG.rnd;
  const FLAME = ['#fbbf24', '#f97316', '#ffffff'];

  function scatter(el, { color = '#ef4444', delay = 0, duration = 1500 } = {}) {
    return new Promise((resolve) => {
      const g = MG.ghost(el);
      const r = el.getBoundingClientRect();
      const x0 = r.left + r.width / 2;
      const y0 = r.top + r.height / 2;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const clampX = (x) => Math.max(40, Math.min(W - 40, x));
      const clampY = (y) => Math.max(40, Math.min(H - 40, y));

      // два случайных «полюса»: кубическая кривая из точки в саму себя даёт петлю
      const a1 = rnd(0, Math.PI * 2);
      const a2 = a1 + rnd(1.7, 3.5) * (Math.random() < 0.5 ? 1 : -1);
      const d1 = rnd(170, 330);
      const d2 = rnd(170, 330);
      const c1 = [clampX(x0 + Math.cos(a1) * d1), clampY(y0 + Math.sin(a1) * d1 * 0.85)];
      const c2 = [clampX(x0 + Math.cos(a2) * d2), clampY(y0 + Math.sin(a2) * d2 * 0.85)];
      const spin = (Math.random() < 0.5 ? -1 : 1) * rnd(360, 900);

      el.style.opacity = '0';
      g.style.filter = `drop-shadow(0 0 10px ${color})`;
      g.style.zIndex = 60;

      const t0 = performance.now() + MG.T(delay);
      const dur = MG.T(duration);
      let finished = false;
      let lastEmit = 0;
      const done = () => {
        if (finished) return;
        finished = true;
        g.remove();
        el.style.opacity = '';
        MG.explode(el, color);
        MG.shake(el);
        resolve();
      };

      function frame(now) {
        if (finished) return;
        if (now < t0) { requestAnimationFrame(frame); return; }
        const u = Math.min(1, (now - t0) / dur);
        const t = u < 0.5 ? 2 * u * u : 1 - ((-2 * u + 2) ** 2) / 2;     // плавный разгон и торможение
        const m = 1 - t;
        const x = m * m * m * x0 + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * x0;
        const y = m * m * m * y0 + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * y0;
        const sc = 1 - 0.3 * Math.sin(Math.PI * t);
        g.style.transform = `translate(${x - x0}px, ${y - y0}px) rotate(${spin * Math.sin(Math.PI * t)}deg) scale(${sc})`;

        if (now - lastEmit > 18 && u < 0.97) {                       // искры позади числа
          lastEmit = now;
          for (let k = 0; k < 2; k++) {
            const p = document.createElement('i');
            const s = 5 + Math.random() * 7;
            p.className = 'trail';
            Object.assign(p.style, {
              left: `${x - s / 2 + (Math.random() - 0.5) * 10}px`,
              top: `${y - s / 2 + (Math.random() - 0.5) * 10}px`,
              width: `${s}px`,
              height: `${s}px`,
              background: FLAME[Math.floor(Math.random() * FLAME.length)],
            });
            document.body.append(p);
            p.animate([
              { transform: 'translate(0,0) scale(1)', opacity: 0.95 },
              { transform: `translate(${(Math.random() - 0.5) * 18}px, ${(Math.random() - 0.5) * 18}px) scale(0)`, opacity: 0 },
            ], { duration: MG.T(380 + Math.random() * 320), easing: 'ease-out' }).onfinish = () => p.remove();
          }
        }
        if (u < 1) requestAnimationFrame(frame); else done();
      }
      requestAnimationFrame(frame);
      setTimeout(done, MG.T(delay + duration) + 700);              // страховка для фоновой вкладки
    });
  }

  MG.scatter = scatter;
})();
