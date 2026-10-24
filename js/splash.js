/* ============================================================================
 *  Dawn Flower — procedural SVG animation
 *  Single SVG container 402×874, GSAP Timeline, 3.00s cycle, repeat: -1
 *
 *  Copyright (c) 2026 Gleb Nezhdanov. All rights reserved.
 *  Proprietary work. Reproduction, distribution, and creation of derivative
 *  works without written permission of the copyright holder are prohibited.
 *  See LICENSE for details.
 *
 *  All geometry is pure mathematical interpolation of parameters.
 *  No frame-by-frame swapping: attributes are dynamically computed on every tick:
 *  d / x / y / width / height / rx / ry / transform / stroke-width.
 * ==========================================================================*/

/* Math Game: используется как экран загрузки (<svg id="splash-svg">).
 * Режим зафиксирован — hybrid; переключатель режимов и фон-прямоугольник убраны
 * (фон рисует CSS-градиент #splash, чтобы цветок был по центру на любом экране). */

(function () {
  'use strict';

  /* --------------------------------------------------------------------- *
   *  1. UNITS AND KEY VALUES DERIVED FROM 1.svg … 8.svg
   * --------------------------------------------------------------------- */

  // Base composition module:
  // 1.svg / 7.svg / 8.svg  ->  49.2116   (designated as "50" in Figma)
  // 2.svg … 6.svg          ->  30
  const U_BIG = 49.2116;
  const U_SMALL = 30;

  const K = 0.5522847498307936;   // Magic constant for cubic bezier arc approximation


  // Palette (extracted from source assets)
  const COLOR = {
    mainA: '#278CBA',   // Primary blue
    mainB: '#FF6F20',   // Primary orange
    outA: '#FF955B',   // Secondary light orange
    outB: '#4CB5E5',   // Secondary light blue
    square: '#FFF3E5',   // Squares
    stroke: '#000000'
  };

  /* --------------------------------------------------------------------- *
   *  2. PATH GENERATOR
   *
   *  All eight shapes in the composition share the same primitive:
   *  a rectangle with TWO opposite corners rounded —
   *  bottom-left (rBL) and top-right (rTR).
   *
   *      rTR = 0            rTR = h              rTR = h, rBL = h
   *      ┌────────┐         ┌─────╮              ╭─────╮
   *      │        │         │     │              │     ╯
   *      ╰────────┘         ╰─────┘              ╰─────╯
   *      frames 1–6         extrusions           frame 7 (rosette)
   * --------------------------------------------------------------------- */

  function cornerRect(x0, y0, x1, y1, rBL, rTR) {
    const w = x1 - x0;
    const h = y1 - y0;
    const lim = Math.min(w, h);

    rBL = Math.max(0, Math.min(rBL, lim));
    rTR = Math.max(0, Math.min(rTR, lim));

    let d = 'M' + x0 + ' ' + y0;

    // Top edge -> top-right rounded corner
    d += 'L' + (x1 - rTR) + ' ' + y0;
    if (rTR > 0.001) {
      d += 'C' + (x1 - rTR + K * rTR) + ' ' + y0 +
        ' ' + x1 + ' ' + (y0 + rTR - K * rTR) +
        ' ' + x1 + ' ' + (y0 + rTR);
    }

    // Right edge downward
    d += 'L' + x1 + ' ' + y1;

    // Bottom edge -> bottom-left rounded corner
    d += 'L' + (x0 + rBL) + ' ' + y1;
    if (rBL > 0.001) {
      d += 'C' + (x0 + rBL - K * rBL) + ' ' + y1 +
        ' ' + x0 + ' ' + (y1 - rBL + K * rBL) +
        ' ' + x0 + ' ' + (y1 - rBL);
    }

    // Left edge upward and close path
    d += 'L' + x0 + ' ' + y0 + 'Z';
    return d;
  }

  /* --------------------------------------------------------------------- *
   *  3. DOM SVG CONSTRUCTION
   *
   *  Layer order (bottom to top):
   *     background -> extruded petals -> squares -> main petals -> core
   *
   *  The entire scene is placed in a coordinate system rotated by 45°,
   *  allowing internal calculations in axis-aligned coordinates.
   * --------------------------------------------------------------------- */

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  const svg = document.getElementById('splash-svg');
  if (!svg || typeof gsap === 'undefined') return;

  // --- Scene -------------------------------------------------------------
  const scene = el('g', { transform: 'translate(201 437) rotate(45)' });
  svg.appendChild(scene);

  const backDisc = el('circle', { cx: 0, cy: 0, fill: COLOR.stroke });
  scene.appendChild(backDisc);

  const gOuter = el('g', { id: 'outerLeaves' });   // Extruded petals
  const gSquares = el('g', { id: 'squares' });   // Extruded squares
  const gMain = el('g', { id: 'mainLeaves' });   // Main petals
  scene.appendChild(gOuter);
  scene.appendChild(gSquares);
  scene.appendChild(gMain);

  const strokeAttrs = {
    stroke: COLOR.stroke,
    'stroke-width': 10,
    'stroke-linejoin': 'miter',
    'stroke-miterlimit': 4
  };

  // Four rotational slots: k * 90 deg around center
  const SLOTS = [0, 90, 180, 270];

  const mainLeaves = [];
  const outerLeaves = [];
  const squares = [];

  SLOTS.forEach((deg, k) => {
    const wrapO = el('g', { transform: 'rotate(' + deg + ')' });
    const pO = el('path', Object.assign({
      fill: (k % 2 === 0) ? COLOR.outA : COLOR.outB
    }, strokeAttrs));
    wrapO.appendChild(pO);
    gOuter.appendChild(wrapO);
    outerLeaves.push(pO);

    const wrapS = el('g', { transform: 'rotate(' + deg + ')' });
    const rS = el('rect', Object.assign({ fill: COLOR.square }, strokeAttrs));
    wrapS.appendChild(rS);
    gSquares.appendChild(wrapS);
    squares.push(rS);

    const wrapM = el('g', { transform: 'rotate(' + deg + ')' });
    const pM = el('path', Object.assign({
      fill: (k % 2 === 0) ? COLOR.mainA : COLOR.mainB
    }, strokeAttrs));
    wrapM.appendChild(pM);
    gMain.appendChild(wrapM);
    mainLeaves.push(pM);
  });

  // --- Center square core (always on top) --------------------------------
  const core = el('rect', Object.assign({ fill: COLOR.square }, strokeAttrs));
  scene.appendChild(core);

  const allStroked = mainLeaves.concat(outerLeaves, squares, [core]);

  /* --------------------------------------------------------------------- *
   *  4. STATE (interpolated by GSAP)
   * --------------------------------------------------------------------- */

  const S = {
    u: U_BIG,        // Module: central square side & petal thickness
    len: U_BIG * 2,    // Petal length
    rIn: U_BIG,        // Inner (near) corner radius
    rOut: 0,            // Outer (far) corner radius
    p: 0,            // Secondary shape extrusion: 0 = hidden, 1 = extruded
    mainRot: 0,            // Primary ring rotation (deg)
    outRot: 0,             // Outer ring rotation (deg)
    coreRound: 0           // Central core rounding: 0 = square, 1 = circle
  };

  const clamp01 = v => v < 0 ? 0 : (v > 1 ? 1 : v);

  /* --------------------------------------------------------------------- *
   *  MODE SELECTION: 'hybrid', 'morph', 'rotating', 'nostroke', or 'original'
   * --------------------------------------------------------------------- */
  const currentMode = 'hybrid';

  let tl = null;

  function getHybridCoreRound(t) {
    if (t >= 2.14 && t < 2.57) {
      // Rotation 3: smooth morph from square (0) to circle (1), staying circle at rosette peak
      const p = (t - 2.14) / (2.57 - 2.14);
      return 0.5 * (1 - Math.cos(Math.PI * p));
    } else if (t >= 2.57 && t < 2.85) {
      // Rotation 4: smooth return from circle (1) back to square (0) as flower closes
      const p = (t - 2.57) / (2.85 - 2.57);
      return 0.5 * (1 + Math.cos(Math.PI * p));
    }
    return 0;
  }

  /* --------------------------------------------------------------------- *
   *  5. RENDER: State -> SVG Attributes
   * --------------------------------------------------------------------- */

  function render() {
    const u = S.u;
    const c = u / 2;          // Half side of central square
    const t = u;              // Petal thickness
    const L = S.len;          // Petal length
    const sw = u / 3;          // Stroke width: 10px at u=30, 16.4px at u=49.21

    const animTime = tl ? (tl.time() % 3.0001) : 0;
    let effMode = currentMode;
    if (currentMode === 'hybrid') {
      if (animTime < 1.29 || animTime >= 2.85) {
        // Rotation 1 (0.86 - 1.29) and loop rest/reset: No-Stroke Square
        effMode = 'nostroke';
      } else if (animTime < 2.14) {
        // Rotation 2 (1.29 - 1.71) and elongation (1.71 - 2.14): Rotating Square
        effMode = 'rotating';
      } else {
        // Rotation 3 (2.14 - 2.57) and Rotation 4 (2.57 - 2.85): Circle Morph
        effMode = 'morph';
      }
    }

    const isOriginal = (effMode === 'original');
    const isRotating = (effMode === 'rotating');
    const isNoStroke = (effMode === 'nostroke');
    const activeCoreRound = (currentMode === 'hybrid') ? getHybridCoreRound(animTime) : S.coreRound;

    // Only strict original hides the backing disc
    if (currentMode === 'original') {
      backDisc.setAttribute('display', 'none');
    } else {
      backDisc.removeAttribute('display');
      backDisc.setAttribute('r', u * 0.93);
    }

    // --- Main petals (base slot k = 0) -----------------------------------
    // Rectangle [-c, -c+L] × [-c-t, -c]
    const dMain = cornerRect(-c, -c - t, -c + L, -c, S.rIn, S.rOut);

    // --- Extruded petals -------------------------------------------------
    // At p = 0 congruent to main petal -> fully hidden;
    // At p = 1 shifted outward by exactly thickness t
    const off = S.p * t;
    const dOut = cornerRect(-c, -c - t - off, -c + L, -c - off,
      (1 - S.p) * t,          // Near corner radius transitions…
      t);                     // …into far corner radius

    // --- Extruded squares ------------------------------------------------
    // At p = 0 completely concealed behind main petal
    const sqX = c + S.p * t;

    // In frame 7 outer rounding cuts into the far petal corner,
    // which would expose the hidden square — fade out squares
    const sqOpacity = clamp01(1 - S.rOut / (0.12 * u));

    for (let i = 0; i < 4; i++) {
      mainLeaves[i].setAttribute('d', dMain);
      outerLeaves[i].setAttribute('d', dOut);

      const q = squares[i];
      q.setAttribute('x', sqX);
      q.setAttribute('y', -c - t);
      q.setAttribute('width', t);
      q.setAttribute('height', t);
      q.setAttribute('opacity', sqOpacity);
    }

    // --- Center core -----------------------------------------------------
    if (isNoStroke) {
      // No-stroke square: matches exact visible cream fill size of original central square (u - sw)
      const cu = u - sw;
      const cc = cu / 2;
      core.removeAttribute('transform');
      core.setAttribute('x', -cc);
      core.setAttribute('y', -cc);
      core.setAttribute('width',  cu);
      core.setAttribute('height', cu);
      core.setAttribute('rx', 0);
      core.setAttribute('ry', 0);
    } else if (isOriginal || isRotating) {
      // Original Figma square (sharp corners rx=0, ry=0, constant size)
      core.setAttribute('x', -c);
      core.setAttribute('y', -c);
      core.setAttribute('width',  u);
      core.setAttribute('height', u);
      core.setAttribute('rx', 0);
      core.setAttribute('ry', 0);

      if (isRotating) {
        // Modification of Original: central square rotates with shapes
        core.setAttribute('transform', 'rotate(' + S.mainRot + ')');
      } else {
        core.removeAttribute('transform');
      }
    } else {
      // Circle morph mode: expands into slightly bigger circle during rotation, calibrated -1.8px
      core.removeAttribute('transform');
      const coreScale = 1 + 0.04 * activeCoreRound;
      const cu = u * coreScale;
      const cc = cu / 2;
      core.setAttribute('x', -cc);
      core.setAttribute('y', -cc);
      core.setAttribute('width',  cu);
      core.setAttribute('height', cu);
      const coreR = activeCoreRound * cc;
      core.setAttribute('rx', coreR);
      core.setAttribute('ry', coreR);
    }

    // --- Rotations -------------------------------------------------------
    // rotate() around origin (0, 0), which is the center of the core
    gMain.setAttribute('transform', 'rotate(' + S.mainRot + ')');
    gSquares.setAttribute('transform', 'rotate(' + S.outRot + ')');
    gOuter.setAttribute('transform', 'rotate(' + S.outRot + ')');

    // --- Stroke width ----------------------------------------------------
    for (let i = 0; i < allStroked.length; i++) {
      allStroked[i].setAttribute('stroke-width', sw);
    }

    if (isNoStroke) {
      core.setAttribute('stroke', 'none');
      core.setAttribute('stroke-width', 0);
    } else {
      core.setAttribute('stroke', COLOR.stroke);
      if (effMode === 'morph') {
        // Central circle gets a thinner stroke as it expands
        const coreSw = sw * (1 - 0.30 * activeCoreRound);
        core.setAttribute('stroke-width', coreSw);
      } else {
        core.setAttribute('stroke-width', sw);
      }
    }
  }

  /* --------------------------------------------------------------------- *
   *  6. TIMELINE — 3.00s seamless loop
   *
   *   frame  t, s    u        len   rIn    rOut   p   mainRot  outRot
   *   ------------------------------------------------------------------
   *     1    0.00    49.21   2u    u      0      0     0        0
   *     2    0.43    30      2u    u      0      0     0        0
   *     3    0.86    30      2u    u      0      1     0        0
   *     4    1.29    30      2u    u      0      1    90        0
   *     5    1.71    30      2u    u      0      1   180       90
   *     6    2.14    30      3u    u      0      1   180       90
   *     7    2.57    49.21   2u    u      u      0   270      180
   *     8    2.85    49.21   2u    u      0      0   360      270
   *     1    3.00    49.21   2u    u      0      0   360      360
   * --------------------------------------------------------------------- */

  const EASE = 'power1.inOut';

  tl = gsap.timeline({
    repeat: -1,
    defaults: { ease: EASE },
    onUpdate: render
  });

  // Slow down animation by 30% (speed 0.7)
  tl.timeScale(0.7);

  // Phase 1 -> 2 (0.00 - 0.43): Compression. Square 49.21 -> 30, petals -> 60×30
  tl.to(S, {
    duration: 0.43,
    u: U_SMALL, len: U_SMALL * 2, rIn: U_SMALL
  }, 0);

  // Phase 2 -> 3 (0.43 - 0.86): Extrude secondary rectangles and squares
  tl.to(S, { duration: 0.43, p: 1 }, 0.43);

  // Phase 3 -> 4 (0.86 - 1.29): Rotate primary petals 90 degrees clockwise
  tl.to(S, { duration: 0.43, mainRot: 90 }, 0.86);
  tl.to(S, { duration: 0.215, coreRound: 1, ease: 'sine.inOut' }, 0.86);
  tl.to(S, { duration: 0.215, coreRound: 0, ease: 'sine.inOut' }, 1.075);

  // Phase 4 -> 5 (1.29 - 1.71): Rotate all petals 90 degrees
  tl.to(S, { duration: 0.42, mainRot: 180, outRot: 90 }, 1.29);
  tl.to(S, { duration: 0.21, coreRound: 1, ease: 'sine.inOut' }, 1.29);
  tl.to(S, { duration: 0.21, coreRound: 0, ease: 'sine.inOut' }, 1.50);

  // Phase 5 -> 6 (1.71 - 2.14): Elongate 2u -> 3u (covering squares)
  tl.to(S, { duration: 0.43, len: U_SMALL * 3 }, 1.71);

  // Phase 6 -> 7 (2.14 - 2.57): Expand thickness and radii into circular rosette.
  // Secondary shapes retract slightly faster to prevent poking through rounded corners.
  tl.to(S, { duration: 0.24, p: 0 }, 2.14);
  tl.to(S, {
    duration: 0.43,
    u: U_BIG, len: U_BIG * 2, rIn: U_BIG, rOut: U_BIG,
    mainRot: 270, outRot: 180
  }, 2.14);
  tl.to(S, { duration: 0.215, coreRound: 1, ease: 'sine.inOut' }, 2.14);
  tl.to(S, { duration: 0.215, coreRound: 0, ease: 'sine.inOut' }, 2.355);

  // Phase 7 -> 8 (2.57 - 2.85): Radii retract to zero — silhouette returns to square
  tl.to(S, { duration: 0.28, rOut: 0, mainRot: 360, outRot: 270 }, 2.57);
  tl.to(S, { duration: 0.14, coreRound: 1, ease: 'sine.inOut' }, 2.57);
  tl.to(S, { duration: 0.14, coreRound: 0, ease: 'sine.inOut' }, 2.71);

  // Phase 8 -> 1 (2.85 - 3.00): Seamless loop reset.
  tl.set(S, { outRot: 0, coreRound: 0 }, 2.90);

  render();

  window.MG_splash = { timeline: tl, cycle: 3.0 / 0.7 };
})();

/* ---- управление экраном загрузки (Math Game) ------------------------------
 * Показываем один полный цикл анимации (~4.3 c) и ждём, пока загрузится игра;
 * потом плавно убираем. Касание пропускает заставку (после 1.2 c).
 * Повторный заход в той же вкладке/сессии заставку не показывает. */
(function () {
  'use strict';
  var el = document.getElementById('splash');
  if (!el) return;
  var tl = window.MG_splash && window.MG_splash.timeline;
  var shown = false;
  try { shown = sessionStorage.getItem('mg.splash') === '1'; sessionStorage.setItem('mg.splash', '1'); } catch (e) {}
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var t0 = performance.now(), loaded = document.readyState === 'complete', gone = false;
  var MIN = reduce ? 700 : (window.MG_splash ? window.MG_splash.cycle * 1000 : 0);

  function done() {
    if (gone) return; gone = true;
    el.classList.add('out');
    setTimeout(function () { if (tl) tl.kill(); el.remove(); }, 650);
  }
  function check() {
    if (gone) return;
    if (!tl || shown) return done();
    if (loaded && performance.now() - t0 >= MIN) done(); else setTimeout(check, 100);
  }
  if (!loaded) window.addEventListener('load', function () { loaded = true; }, { once: true });
  el.addEventListener('pointerdown', function () { if (loaded && performance.now() - t0 > 1200) done(); });
  check();
  setTimeout(done, 15000);   // страховка: заставка никогда не зависнет
})();
