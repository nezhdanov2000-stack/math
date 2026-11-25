/* Режим «Десятичные дроби → Уравнения → Перенос с запятой» (decshift): 1,5x + 0,7 = 2,2 + x.
 * Числа с запятой — обычные числа: всё как в «Переносе через «=»» (sh.js): вертолёт и барьер, молния, конвейер, молния.
 * 1,5x − x = 2,2 − 0,7  →  0,5x = 1,5  →  x = 1,5 / 0,5  →  x = 3. Ответ — целый x.
 * Этапы (по 2 задачи): 1 — один знак после запятой; 2 — два знака; 3 — разное число знаков; 4 — всё вместе. */
(() => {
  'use strict';
  const MG = window.MG;
  const { ri } = MG;
  const DQ = MG.deceq;
  const TOTAL = 8;
  const lvlOf = (s) => Math.min(4, 1 + Math.floor(s / 2));

  const fmt = (m, k) => { if (!k) return String(m); const s = String(m).padStart(k + 1, '0'); return `${s.slice(0, -k)},${s.slice(-k)}`; };
  function rnd(k, max) { for (;;) { const m = ri(2, max); if (!k || m % 10) return fmt(m, k); } }

  /* a·x + b = c + d·x  →  x = (c − b) / (a − d) */
  function spec(a, b, c, d, lx = true, rx = false) {
    const z = Math.max(...[a, b, c, d].map(DQ.decs));
    const S = (s) => Number(DQ.times(s, z));
    const A = S(a), B = S(b), C = S(c), D = S(d);
    return { a, b, c, d, lx, rx, z, x0: (C - B) / (A - D), A, B, C, D, key: [a, b, c, d].join('|') };
  }
  const ok = (sp) => sp.A > sp.D && Number.isInteger(sp.x0) && Math.abs(sp.x0) >= 2 && Math.abs(sp.x0) <= 12 && sp.C !== sp.B
    && Math.max(sp.A, sp.B, sp.C, sp.D) <= 2500 && [sp.a, sp.b, sp.c, sp.d].some((s) => s.includes(','));

  const FIRST = [
    spec('1,5', '0,7', '2,2', '1'),                  // 15x + 7 = 22 + 10x  →  x = 3
    spec('0,35', '0,12', '0,72', '0,15', true, true), // 35x + 12 = 72 + 15x  →  x = 3
    spec('0,125', '0,7', '0,4', '0,025', false),     // 125x + 700 = 400 + 25x  →  x = −3
    null,
  ];
  /* этап: сколько знаков у чисел; mix — у части чисел знаков меньше */
  const STAGE = [{ k: 1, mix: false, max: 40 }, { k: 2, mix: false, max: 90 }, { k: 3, mix: true, max: 300 }, { k: 3, mix: true, max: 400, any: true }];   // k — знаков после запятой
  function gen(stage, lastKey) {
    const S = STAGE[stage - 1];
    for (let i = 0; i < 40000; i++) {
      const k = S.any ? ri(2, 3) : S.k;
      const pk = () => (S.mix ? ri(0, k) : ri(0, 4) ? k : 0);
      const one = () => { const kk = pk(); return kk ? rnd(kk, Math.min(S.max, 10 ** (kk + 1) - 1)) : String(ri(1, 9)); };
      const d = ri(0, 3) ? one() : '1';
      const sp = spec(one(), one(), one(), d, Math.random() < 0.6, Math.random() < 0.4);
      if (S.mix && Math.max(...[sp.a, sp.b, sp.c, sp.d].map(DQ.decs)) !== k) continue;
      if (S.mix && new Set([sp.a, sp.b, sp.c, sp.d].map(DQ.decs)).size < 2) continue;   // разное число знаков
      if (sp.key === lastKey || !ok(sp)) continue;
      return sp;
    }
    return FIRST[0];
  }
  function pick({ solved, lastKey }) {
    const st = lvlOf(solved);
    if (solved % 2 === 0 && FIRST[st - 1] && FIRST[st - 1].key !== lastKey) return FIRST[st - 1];
    return gen(st, lastKey);
  }

  MG.decshiftGen = { gen, spec, ok };                 // для проверки примеров
  MG.shBuild({ name: 'decshift', p: 'ds', pick, levelOf: lvlOf, total: TOTAL });
})();
