/* Режим «Десятичные дроби → Уравнения → Пропорции с запятой» (decprop).
 * Пример: 0,8 : x = 1,2 : 3 — пишется сразу дробями 0,8/x = 1,2/3.
 *   1) Джокер — на одну дробь: числитель и знаменатель умножаются на 10, 100 или 1000 (наименьшее, чтобы ушли запятые);
 *   2) гарпун — сам сдвигает запятые (8/10x = 12/30);
 *   3) дальше всё как в «Пропорциях» (pp.js): конвейер, стаканчики, топор, кувалда, ластик. Ответ — целый x.
 * Этапы (по 2 задачи): 1 — один знак, ×10; 2 — два знака, ×100; 3 — разное число знаков, ×1000; 4 — всё вместе. */
(() => {
  'use strict';
  const MG = window.MG;
  const { ri, gcd, factorize } = MG;
  const DQ = MG.deceq;
  const TOTAL = 8;
  const lvlOf = (s) => Math.min(4, 1 + Math.floor(s / 2));

  /* число с k знаками после запятой: m / 10^k → '0,15' */
  const fmt = (m, k) => { if (!k) return String(m); const s = String(m).padStart(k + 1, '0'); return `${s.slice(0, -k)},${s.slice(-k)}`; };
  const scaled = (s, k) => Number(DQ.times(s, k));
  /* число ровно с k знаками (последняя цифра не 0) */
  function rnd(k, max) {
    for (;;) { const m = ri(2, max); if (!k || m % 10) return fmt(m, k); }
  }

  /* x и произведения справа (после конвейера) для проверки ширины */
  function solve(sp) {
    const kL = Math.max(...sp.lnums.map(DQ.decs)), kR = Math.max(...sp.rnums.map(DQ.decs));
    const S = (s, k) => scaled(s, k);
    let N, D;
    if (sp.type === 'D') { N = S(sp.p, kL) * S(sp.d, kR); D = S(sp.a, kL) * S(sp.c, kR); }
    else if (sp.type === 'A') { N = S(sp.b, kL) * S(sp.c, kR); D = S(sp.a, kL) * S(sp.d, kR); }
    else { N = S(sp.b, kR) * S(sp.c, kL); D = S(sp.a, kR) * S(sp.d, kL); }   // B: c/d = a·x/b — x справа
    return { N, D, x: N / D, big: Math.max(...sp.lnums.map((s) => S(s, kL)), ...sp.rnums.map((s) => S(s, kR))) };
  }
  function spec(type, a, b, c, d, p) {
    const sp = { type, a, b, c, d, p };
    if (type === 'A') { sp.lnums = [a, b]; sp.rnums = [c, d]; }
    else if (type === 'B') { sp.lnums = [c, d]; sp.rnums = [a, b]; }
    else { sp.lnums = [p, a]; sp.rnums = [c, d]; }
    const r = solve(sp);
    Object.assign(sp, { N: r.N, D: r.D, x: r.x, big: r.big, key: [type, a, b, c, d, p].join('|') });
    return sp;
  }
  const ok = (sp, maxF) => Number.isInteger(sp.x) && sp.x >= 2 && sp.x <= 15 && gcd(sp.N, sp.D) > 1
    && factorize(sp.N).length <= maxF && factorize(sp.D).length <= maxF && sp.big <= 9999
    && [...sp.lnums, ...sp.rnums].some((s) => s.includes(','))
    && DQ.val(sp.lnums[0]) !== DQ.val(sp.lnums[1]) && DQ.val(sp.rnums[0]) !== DQ.val(sp.rnums[1])   // не 2,5/2,5
    && sp.N <= 3000;

  const STAGE = [
    { k: [1], types: ['A', 'D'], mix: false, maxF: 5, max: 30 },
    { k: [2], types: ['A', 'B'], mix: false, maxF: 5, max: 60 },
    { k: [3], types: ['B', 'D'], mix: true, maxF: 6, max: 40 },
    { k: [1, 2, 3], types: ['A', 'B', 'D'], mix: true, maxF: 6, max: 90 },
  ];
  /* одна дробь: числа с k знаками; mix — у одного из чисел знаков меньше (или целое) */
  function pair(k, mix, max) {
    const k2 = mix ? ri(0, k - 1) : k;
    const s1 = rnd(k, max), s2 = rnd(k2, k2 ? max : 9);
    return ri(0, 1) ? [s1, s2] : [s2, s1];
  }
  function gen(stage, lastKey) {
    const S = STAGE[stage - 1];
    for (let i = 0; i < 20000; i++) {
      const type = S.types[ri(0, S.types.length - 1)];
      const k = S.k[ri(0, S.k.length - 1)];
      /* дробь с x и дробь без x; одна из них может быть без запятых (кроме этапа 3) */
      const kx = stage === 3 ? k : ri(0, 1) ? k : 0, ko = stage === 3 || !kx ? k : ri(0, 1) ? k : 0;
      const [xa, xb] = kx ? pair(kx, S.mix, S.max) : [String(ri(1, 9)), String(ri(2, 12))];
      const [oa, ob] = ko ? pair(ko, S.mix, S.max) : [String(ri(2, 20)), String(ri(2, 20))];
      const a = ri(0, 4) ? xa : '1';                   // иногда просто x (это 1·x)
      let sp;
      if (type === 'D') sp = spec('D', a, null, oa, ob, xb);
      else sp = spec(type, a, xb, oa, ob, null);
      if (sp.key === lastKey || !ok(sp, S.maxF)) continue;
      return sp;
    }
    return spec('D', '1', null, '1,2', '3', '0,8');
  }

  /* первая задача каждого этапа — проверенная; вторая — случайная с теми же правилами */
  const FIRST = [
    spec('D', '1', null, '1,2', '3', '0,8'),          // 0,8 : x = 1,2 : 3  →  8/10x = 12/30  →  x = 2
    null, null, null,
  ];
  function pick({ solved, lastKey }) {
    const st = lvlOf(solved);
    if (solved % 2 === 0 && FIRST[st - 1] && FIRST[st - 1].key !== lastKey) return FIRST[st - 1];
    return gen(st, lastKey);
  }

  MG.decpropGen = { gen, spec, ok, STAGE, solve };    // для проверки примеров
  MG.ppBuild({ name: 'decprop', p: 'dp', dec: true, pick, levelOf: lvlOf, total: TOTAL });
})();
