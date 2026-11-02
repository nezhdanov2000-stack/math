/* Планшет для ручного разбиения числа: после 50 % прогресса кувалда не делит число сама —
 * пользователь вводит два множителя. MG.clip.ask(n, fromEl) → Promise<[a, b] | null>. */
(() => {
  'use strict';
  window.MG = window.MG || {};

  const css = document.createElement('style');
  css.textContent = `
    .clip-ov { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; background: rgba(12,10,28,.5); animation: clFade .2s both; }
    .clip-ov.out { animation: clFadeOut .22s both; }
    .clip { position: relative; width: min(90vw, 360px); padding: 38px 14px 16px; border-radius: 24px; background: linear-gradient(#a8744a, #78492a); box-shadow: 0 5px 0 #4a2b15, 0 22px 44px rgba(0,0,0,.45), inset 0 0 0 2px rgba(255,235,200,.18); transform-origin: var(--ox, 50%) var(--oy, 30%); animation: clPop .42s cubic-bezier(.3,1.35,.5,1) both; }
    .clip-ov.out .clip { animation: clAway .22s ease-in both; }
    .clip .metal { position: absolute; left: 50%; top: -14px; width: 118px; height: 46px; margin-left: -59px; border-radius: 12px 12px 8px 8px; background: linear-gradient(#f4f4f4, #a9adb4 55%, #d8dade); box-shadow: 0 3px 0 #4a4d55, inset 0 0 0 2px rgba(255,255,255,.55); }
    .clip .metal::before, .clip .metal::after { content: ''; position: absolute; top: 16px; width: 12px; height: 12px; border-radius: 50%; background: radial-gradient(#6b6e76 35%, #c9ccd3 40%); box-shadow: 0 1px 0 #fff; }
    .clip .metal::before { left: 14px; } .clip .metal::after { right: 14px; }
    .clip .paper { position: relative; padding: 18px 12px 16px; border-radius: 8px; background: #fff8e7 repeating-linear-gradient(#fff8e7 0 27px, #f0dcc0 27px 28px); box-shadow: inset 0 3px 6px rgba(0,0,0,.12); clip-path: polygon(0 0, calc(100% - 56px) 0, calc(100% - 49px) 9px, calc(100% - 41px) 3px, calc(100% - 33px) 15px, calc(100% - 24px) 8px, calc(100% - 15px) 24px, calc(100% - 7px) 17px, 100% 34px, 100% 100%, 0 100%); --pen: #5a463c; --hand: 'Caveat', 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive; font-family: var(--hand); color: var(--pen); }
    .clip .sk { filter: url(#clPencil); }
    .clip-w .sk { filter: url(#clPencil); }
    .clip .top { display: flex; align-items: center; justify-content: center; gap: 22px; font-weight: 700; font-size: 3.8rem; line-height: 1; }
    .clip .top .hm { width: 54px; height: 54px; transform-origin: 80% 85%; animation: clHit 1.6s ease-in-out infinite; }
    .clip .top .hm svg { width: 100%; height: 100%; }
    .clip .doodle { display: flex; justify-content: center; margin: 2px 0 0; opacity: .9; }
    .clip-w .doodle { display: flex; justify-content: center; margin: 2px 0 0; opacity: .9; }
    .clip .doodle svg { width: 120px; height: 14px; }
    .clip-w .doodle svg { width: 120px; height: 14px; }
    .clip .pv { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 22px 0 0; font-weight: 700; font-size: 1.9rem; line-height: 1; color: var(--pen); opacity: .55; }
    .clip-w .pv { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 22px 0 0; font-weight: 700; font-size: 1.9rem; line-height: 1; color: var(--pen); opacity: .55; }
    .clip .doodle.hid { display: none; }
    .clip-w .doodle.hid { display: none; }
    .clip .pvf { display: inline-flex; flex-direction: column; align-items: center; gap: 3px; }
    .clip-w .pvf { display: inline-flex; flex-direction: column; align-items: center; gap: 3px; }
    .clip .pvf .pvn { min-width: 1.3em; text-align: center; }
    .clip-w .pvf .pvn { min-width: 1.3em; text-align: center; }
    .clip .pvf .pvl { align-self: stretch; height: 0; border-top: 2.5px solid var(--pen); margin: 3px 0 2px; }
    .clip-w .pvf .pvl { align-self: stretch; height: 0; border-top: 2.5px solid var(--pen); margin: 3px 0 2px; }
    .clip .pvb { display: grid; place-items: center; min-width: 1.25em; height: 1.25em; padding: 0 4px; box-sizing: border-box; border: 2.5px dashed rgba(90,70,60,.55); border-radius: 12px 9px 13px 8px / 9px 13px 8px 12px; transition: background .15s, border-color .15s; }
    .clip-w .pvb { display: grid; place-items: center; min-width: 1.25em; height: 1.25em; padding: 0 4px; box-sizing: border-box; border: 2.5px dashed rgba(90,70,60,.55); border-radius: 12px 9px 13px 8px / 9px 13px 8px 12px; transition: background .15s, border-color .15s; }
    .clip .pvb.on { border-style: solid; border-color: #3d63d9; color: #24409e; background: repeating-linear-gradient(135deg, rgba(61,99,217,.14) 0 1.500px, rgba(255,255,255,.65) 1.500px 6px); }
    .clip-w .pvb.on { border-style: solid; border-color: #3d63d9; color: #24409e; background: repeating-linear-gradient(135deg, rgba(61,99,217,.14) 0 1.500px, rgba(255,255,255,.65) 1.500px 6px); }
    .clip .pv ~ .eq { margin: 21px 0 0; }
    .clip-w .pv ~ .eq { margin: 21px 0 0; }
    .clip .pv ~ .msg { min-height: 0; height: 0; position: relative; top: 2px; }
    .clip-w .pv ~ .msg { min-height: 0; height: 0; position: relative; top: 2px; }
    .clip .pv ~ .pad { margin-top: 26px; }
    .clip-w .pv ~ .pad { margin-top: 26px; }
    .clip .ef { display: inline-flex; flex-direction: column; align-items: center; gap: 4px; }
    .clip-w .ef { display: inline-flex; flex-direction: column; align-items: center; gap: 4px; }
    .clip .ef .en { display: flex; align-items: center; gap: 6px; padding: 0 4px 6px; border-bottom: 3px solid var(--pen); }
    .clip-w .ef .en { display: flex; align-items: center; gap: 6px; padding: 0 4px 6px; border-bottom: 3px solid var(--pen); }
    .clip .ef .ed { line-height: 1; }
    .clip-w .ef .ed { line-height: 1; }
    .clip .eq.sm .ef .bx { min-width: 40px; width: 40px; height: 42px; padding: 0; line-height: 1; font-size: 1.9rem; text-align: center; border-radius: 16px 13px 17px 12px / 13px 17px 12px 16px; }
    .clip-w .eq.sm .ef .bx { min-width: 40px; width: 40px; height: 42px; padding: 0; line-height: 1; font-size: 1.9rem; text-align: center; border-radius: 16px 13px 17px 12px / 13px 17px 12px 16px; }
    .clip .ld { transform-origin: 50% 0; }
    .clip-w .ld { transform-origin: 50% 0; }
    .clip .ld-l .lr { height: 44px; transition: height .3s ease; }
    .clip-w .ld-l .lr { height: 44px; transition: height .3s ease; }
    .clip .ld-l .lr.old { height: 22px; }
    .clip-w .ld-l .lr.old { height: 22px; }
    .clip .ld-l .lr .lc, .clip .ld-l .lr .ldg { transition: font-size .3s ease, height .3s ease, opacity .3s; }
    .clip-w .ld-l .lr .lc, .clip-w .ld-l .lr .ldg { transition: font-size .3s ease, height .3s ease, opacity .3s; }
    .clip .ld .lr.old .lc { height: 22px; font-size: 1.3rem; }
    .clip-w .ld .lr.old .lc { height: 22px; font-size: 1.3rem; }
    .clip .ld .lr.old .ldg { height: 22px; font-size: 1.3rem; }
    .clip-w .ld .lr.old .ldg { height: 22px; font-size: 1.3rem; }
    .clip .ld .lr.old .lc.p::after { font-size: 1.1rem; left: -12px; }
    .clip-w .ld .lr.old .lc.p::after { font-size: 1.1rem; left: -12px; }
    .clip .ld .lr.old .lc.done { opacity: .75; }
    .clip-w .ld .lr.old .lc.done { opacity: .75; }
    .clip .ld.us { justify-content: center; align-items: flex-start; }
    .clip-w .ld.us { justify-content: center; align-items: flex-start; }
    .clip .ad-d { height: 44px; margin-top: 44px; display: flex; align-items: center; padding-right: 8px; }
    .clip-w .ad-d { height: 44px; margin-top: 44px; display: flex; align-items: center; padding-right: 8px; }
    .clip .ad-m { padding-top: 0; }
    .clip-w .ad-m { padding-top: 0; }
    .clip .ad-qrow { display: grid; grid-template-columns: repeat(var(--L), var(--cw, 34px)); height: 44px; padding-left: 8px; align-items: center; }
    .clip-w .ad-qrow { display: grid; grid-template-columns: repeat(var(--L), var(--cw, 34px)); height: 44px; padding-left: 8px; align-items: center; }
    .clip .ad-qrow .lc { width: auto; }
    .clip-w .ad-qrow .lc { width: auto; }
    .clip .ad-drow { display: grid; grid-template-columns: repeat(var(--L), var(--cw, 34px)); height: 44px; align-items: center; box-sizing: content-box; border-top: 3.5px solid #161616; border-left: 3.5px solid #161616; border-radius: 14px 0 0 0; padding: 0 8px 0 4.5px; margin-top: -3.5px; margin-bottom: 3.5px; }
    .clip-w .ad-drow { display: grid; grid-template-columns: repeat(var(--L), var(--cw, 34px)); height: 44px; align-items: center; box-sizing: content-box; border-top: 3.5px solid #161616; border-left: 3.5px solid #161616; border-radius: 14px 0 0 0; padding: 0 8px 0 4.5px; margin-top: -3.5px; margin-bottom: 3.5px; }
    .clip .ad-work { padding-left: 8px; }
    .clip-w .ad-work { padding-left: 8px; }
    .clip .tabs { position: absolute; left: 20px; top: 0; height: 40px; z-index: 3; display: flex; align-items: flex-end; gap: 3px; pointer-events: none; }
    .clip .tab { pointer-events: auto; position: relative; width: 34px; height: 28px; padding: 0; border: 2.5px solid #5a463c; border-bottom: 0; border-radius: 9px 11px 2px 2px / 11px 9px 2px 2px; font: 800 1.35rem/1 var(--hand); color: rgba(22,22,22,.6); cursor: pointer; -webkit-tap-highlight-color: transparent; box-shadow: inset 0 -6px 8px rgba(0,0,0,.05), 0 -1px 0 rgba(255,255,255,.4); transition: height .18s cubic-bezier(.3,1.4,.5,1), color .15s; }
    .clip .tab.t1 { background: #d9e6f6; transform: rotate(-1.2deg); transform-origin: 50% 100%; }
    .clip .tab.t3 { background: #dcebd3; transform: rotate(-.8deg); transform-origin: 50% 100%; }
    .clip .tab.t2 { background: #f6dcd2; transform: rotate(1.4deg); transform-origin: 50% 100%; }
    .clip .tab.on { height: 34px; color: #161616; }
    .clip .tab:not(.on):active { height: 30px; }
    .clip .tab::after { content: ''; position: absolute; left: 7px; right: 7px; top: 4px; height: 0; border-top: 1.5px solid rgba(90,70,60,.25); }
    .clip .pane { padding-top: 14px; min-height: 200px; box-sizing: border-box; }
    .clip-w .pane { padding-top: 14px; min-height: 200px; box-sizing: border-box; }
    .clip .pane[hidden] { display: none; }
    .clip-w .pane[hidden] { display: none; }
    .clip .pane.p3 .pv { margin-top: 4px; }
    .clip-w .pane.p3 .pv { margin-top: 4px; }
    .clip .pane.p1:not([hidden]) { display: flex; flex-direction: column; }
    .clip-w .pane.p1:not([hidden]) { display: flex; flex-direction: column; }
    .clip .pv1[hidden] { display: none; }
    .clip-w .pv1[hidden] { display: none; }
    .clip .pv1 { margin: 2px 0 8px; padding-top: 0; font-size: 1.4rem; gap: 7px; }
    .clip-w .pv1 { margin: 2px 0 8px; padding-top: 0; font-size: 1.4rem; gap: 7px; }
    .clip .pv1 .pvb { min-width: 1.2em; height: 1.2em; }
    .clip-w .pv1 .pvb { min-width: 1.2em; height: 1.2em; }
    .clip .ld { display: flex; justify-content: center; align-items: flex-start; gap: 0; --pen: #161616; color: #161616; font-weight: 800; font-size: 2.2rem; line-height: 1; padding-top: 4px; }
    .clip-w .ld { display: flex; justify-content: center; align-items: flex-start; gap: 0; --pen: #161616; color: #161616; font-weight: 800; font-size: 2.2rem; line-height: 1; padding-top: 4px; }
    .clip .ld-l { display: grid; grid-auto-rows: auto; grid-template-columns: repeat(var(--L), var(--cw, 34px)); }
    .clip-w .ld-l { display: grid; grid-auto-rows: auto; grid-template-columns: repeat(var(--L), var(--cw, 34px)); }
    .clip .ld-l .lr { display: grid; grid-template-columns: repeat(var(--L), var(--cw, 34px)); grid-column: 1 / -1; align-items: center; position: relative; }
    .clip-w .ld-l .lr { display: grid; grid-template-columns: repeat(var(--L), var(--cw, 34px)); grid-column: 1 / -1; align-items: center; position: relative; }
    .clip .ldg { display: grid; place-items: center; height: 44px; }
    .clip-w .ldg { display: grid; place-items: center; height: 44px; }
    .clip .ldg.drop { color: #3d63d9; animation: clPop .35s cubic-bezier(.3,1.35,.5,1) both; }
    .clip-w .ldg.drop { color: #3d63d9; animation: clPop .35s cubic-bezier(.3,1.35,.5,1) both; }
    .clip .ld-r { margin-left: 4px; padding-left: 12px; border-left: 3.5px solid #161616; min-width: 74px; }
    .clip-w .ld-r { margin-left: 4px; padding-left: 12px; border-left: 3.5px solid #161616; min-width: 74px; }
    .clip .ld-d { height: 44px; display: grid; align-items: center; padding-bottom: 0; border-bottom: 3.5px solid #161616; margin-left: -12px; padding-left: 12px; margin-right: 0; }
    .clip-w .ld-d { height: 44px; display: grid; align-items: center; padding-bottom: 0; border-bottom: 3.5px solid #161616; margin-left: -12px; padding-left: 12px; margin-right: 0; }
    .clip .ld-q { display: flex; gap: 2px; height: 44px; align-items: center; margin-left: -4px; }
    .clip-w .ld-q { display: flex; gap: 2px; height: 44px; align-items: center; margin-left: -4px; }
    .clip .ld .lc { min-width: 0; width: auto; height: 38px; padding: 0 3px; font-size: 2.2rem; line-height: 1; border-width: 2.5px; border-radius: 12px 9px 13px 8px / 9px 13px 8px 12px; box-sizing: border-box; display: grid; place-items: center; text-align: center; font-weight: 800; color: #161616; }
    .clip-w .ld .lc { min-width: 0; width: auto; height: 38px; padding: 0 3px; font-size: 2.2rem; line-height: 1; border-width: 2.5px; border-radius: 12px 9px 13px 8px / 9px 13px 8px 12px; box-sizing: border-box; display: grid; place-items: center; text-align: center; font-weight: 800; color: #161616; }
    .clip .ld .lc::after { display: none; }
    .clip-w .ld .lc::after { display: none; }
    .clip .ld .ld-q .lc { width: 34px; }
    .clip-w .ld .ld-q .lc { width: 34px; }
    .clip .ld .lc.done { border-color: transparent; background: none; box-shadow: none; }
    .clip-w .ld .lc.done { border-color: transparent; background: none; box-shadow: none; }
    .clip .ld .lc.p.done { border-radius: 0; border-bottom: 3.5px solid #161616; }
    .clip-w .ld .lc.p.done { border-radius: 0; border-bottom: 3.5px solid #161616; }
    .clip .ld .lc.p::after { display: block; content: '−'; position: absolute; inset: auto auto auto -17px; width: auto; border: 0; transform: none; font-size: 1.6rem; font-weight: 700; color: #161616; }
    .clip-w .ld .lc.p::after { display: block; content: '−'; position: absolute; inset: auto auto auto -17px; width: auto; border: 0; transform: none; font-size: 1.6rem; font-weight: 700; color: #161616; }
    .clip .ld .lc.p { position: relative; }
    .clip-w .ld .lc.p { position: relative; }
    .clip .ld .lc.p, .clip .ld .lc.r { justify-self: stretch; padding: 0; grid-template-columns: repeat(var(--n, 1), 1fr); }
    .clip-w .ld .lc.p, .clip-w .ld .lc.r { justify-self: stretch; padding: 0; grid-template-columns: repeat(var(--n, 1), 1fr); }
    .clip .ld .lc .dg1 { display: grid; place-items: center; text-align: center; min-width: 0; }
    .clip-w .ld .lc .dg1 { display: grid; place-items: center; text-align: center; min-width: 0; }
    .clip .ld .lc.on .dg1.cr::before { content: ''; width: 3px; height: 28px; border-radius: 2px; background: #3556d6; animation: clCaret 1s steps(1) infinite; }
    .clip-w .ld .lc.on .dg1.cr::before { content: ''; width: 3px; height: 28px; border-radius: 2px; background: #3556d6; animation: clCaret 1s steps(1) infinite; }
    .clip .ld .lc.pop { animation: clPop .3s cubic-bezier(.3,1.35,.5,1) both; }
    .clip-w .ld .lc.pop { animation: clPop .3s cubic-bezier(.3,1.35,.5,1) both; }
    .clip .eq.sm { --pen: #161616; color: #161616; font-weight: 800; }
    .clip-w .eq.sm { --pen: #161616; color: #161616; font-weight: 800; }
    .clip .eq.sm .bx:not(.on) { color: #161616; border-color: #161616; border-width: 3px; }
    .clip-w .eq.sm .bx:not(.on) { color: #161616; border-color: #161616; border-width: 3px; }
    .clip .eq.sm { font-size: 2.1rem; gap: 8px; flex-wrap: nowrap; }
    .clip-w .eq.sm { font-size: 2.1rem; gap: 8px; flex-wrap: nowrap; }
    .clip .eq.sm .bx { min-width: 54px; height: 58px; }
    .clip-w .eq.sm .bx { min-width: 54px; height: 58px; }
    .clip .eq { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 14px 0 4px; font-weight: 700; font-size: 3.4rem; line-height: 1; }
    .clip-w .eq { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 14px 0 4px; font-weight: 700; font-size: 3.4rem; line-height: 1; }
    .clip .bx { position: relative; min-width: 64px; height: 68px; padding: 0 8px; box-sizing: border-box; display: grid; place-items: center; border: 2.5px solid var(--pen); border-radius: 22px 17px 24px 16px / 17px 24px 16px 22px; background: rgba(255,255,255,.55); color: #3a2c26; font-family: inherit; font-weight: 700; font-size: 3.5rem; line-height: 1; cursor: pointer; transition: background .15s; -webkit-tap-highlight-color: transparent; }
    .clip-w .bx { position: relative; min-width: 64px; height: 68px; padding: 0 8px; box-sizing: border-box; display: grid; place-items: center; border: 2.5px solid var(--pen); border-radius: 22px 17px 24px 16px / 17px 24px 16px 22px; background: rgba(255,255,255,.55); color: #3a2c26; font-family: inherit; font-weight: 700; font-size: 3.5rem; line-height: 1; cursor: pointer; transition: background .15s; -webkit-tap-highlight-color: transparent; }
    .clip .bx::after, .clip .k::after { content: ''; position: absolute; inset: -3px 2px 2px -2px; border: 1.5px solid rgba(90,70,60,.28); border-radius: 22px 18px 24px 17px / 18px 24px 17px 22px; transform: rotate(.7deg); pointer-events: none; }
    .clip-w .bx::after, .clip-w .k::after { content: ''; position: absolute; inset: -3px 2px 2px -2px; border: 1.5px solid rgba(90,70,60,.28); border-radius: 22px 18px 24px 17px / 18px 24px 17px 22px; transform: rotate(.7deg); pointer-events: none; }
    .clip .bx.on { border-color: #3d63d9; color: #24409e; background: repeating-linear-gradient(135deg, rgba(61,99,217,.14) 0 1.500px, rgba(255,255,255,.65) 1.500px 6px); }
    .clip-w .bx.on { border-color: #3d63d9; color: #24409e; background: repeating-linear-gradient(135deg, rgba(61,99,217,.14) 0 1.500px, rgba(255,255,255,.65) 1.500px 6px); }
    .clip .bx.on::after { border-color: rgba(53,86,214,.5); }
    .clip-w .bx.on::after { border-color: rgba(53,86,214,.5); }
    .clip .bx.on:empty::before { content: ''; width: 3px; height: 36px; border-radius: 2px; background: #3556d6; animation: clCaret 1s steps(1) infinite; }
    .clip-w .bx.on:empty::before { content: ''; width: 3px; height: 36px; border-radius: 2px; background: #3556d6; animation: clCaret 1s steps(1) infinite; }
    .clip .bx.bad { animation: clShake .4s; border-color: #d6362d; }
    .clip-w .bx.bad { animation: clShake .4s; border-color: #d6362d; }
    .clip .msg { min-height: 1.3em; text-align: center; font-weight: 700; font-size: 1.35rem; line-height: 1; color: #d6362d; }
    .clip .pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 8px; padding: 0 6px; }
    .clip .k { position: relative; height: 64px; padding: 0; border: 2.5px solid var(--pen); border-radius: 20px 24px 17px 23px / 23px 17px 24px 20px; background: rgba(255,255,255,.55); color: #3a2c26; font-family: inherit; font-weight: 700; font-size: 3.5rem; line-height: 1; padding: 0 9px 2px 0; cursor: pointer; display: grid; place-items: center; -webkit-tap-highlight-color: transparent; transition: background .1s, transform .1s; }
    .clip .k:nth-child(3n+1) { transform: rotate(-1.2deg); } .clip .k:nth-child(3n+2) { transform: rotate(.8deg); } .clip .k:nth-child(3n) { transform: rotate(-.5deg); }
    .clip .k:active { background: repeating-linear-gradient(135deg, rgba(90,70,60,.2) 0 1.500px, rgba(255,255,255,.55) 1.500px 6px); transform: scale(.95); }
    .clip .k svg { width: 40px; height: 40px; display: block; overflow: visible; }
    .clip .k.go::after { border-color: rgba(42,143,85,.5); }
    .clip .cls { z-index: 5; position: absolute; top: 8px; right: 14px; width: 46px; height: 46px; padding: 0; border: 0; background: transparent; cursor: pointer; display: grid; place-items: center; -webkit-tap-highlight-color: transparent; transition: transform .1s; }
    .clip .cls:active { transform: scale(.85); }
    .clip .cls svg { width: 30px; height: 30px; display: block; overflow: visible; }
    .clip .ink2 { opacity: .5; }
    .clip .top .hm { position: relative; }
    .clip .top .hm.swing { animation: clSwing .55s cubic-bezier(.5,0,.6,1) forwards; }
    .clip .top .hm.broke { animation: none; }
    .clip .top .hm.respawn { animation: clRespawn .5s cubic-bezier(.3,1.8,.5,1); }
    .clip .hh { position: absolute; inset: 0; }
    .clip .hh svg { width: 100%; height: 100%; display: block; }
    .clip .hh.a { clip-path: polygon(0 0, 100% 0, 100% 50%, 85% 57%, 70% 46%, 55% 56%, 40% 45%, 25% 55%, 10% 47%, 0 53%); animation: clHalfA .95s cubic-bezier(.4,0,.8,.6) forwards; }
    .clip .hh.b { clip-path: polygon(0 53%, 10% 47%, 25% 55%, 40% 45%, 55% 56%, 70% 46%, 85% 57%, 100% 50%, 100% 100%, 0 100%); animation: clHalfB .95s cubic-bezier(.4,0,.8,.6) forwards; }
    .clip .bang { position: absolute; left: -14px; top: 2px; translate: var(--dx, -60px) var(--dy, 14px); width: 46px; height: 46px; pointer-events: none; animation: clBang .45s ease-out forwards; }
    @keyframes clSwing { 0% { transform: rotate(0); } 34% { transform: rotate(34deg) translate(10px, -8px); } 62%, 100% { transform: translate(var(--dx, -60px), var(--dy, 14px)) rotate(-38deg); } }
    @keyframes clHalfA { 0% { transform: translate(var(--dx, -60px), var(--dy, 14px)) rotate(-38deg); opacity: 1; } 100% { transform: translate(calc(var(--dx, -60px) - 34px), calc(var(--dy, 14px) + 64px)) rotate(-120deg); opacity: 0; } }
    @keyframes clHalfB { 0% { transform: translate(var(--dx, -60px), var(--dy, 14px)) rotate(-38deg); opacity: 1; } 100% { transform: translate(calc(var(--dx, -60px) + 26px), calc(var(--dy, 14px) + 80px)) rotate(50deg); opacity: 0; } }
    @keyframes clJolt { 0% { transform: none; } 18% { transform: translateX(-6px) scale(.9, 1.06) rotate(-4deg); } 45% { transform: translateX(4px) rotate(2deg); } 100% { transform: none; } }
    .clip .top .sk.hit { animation: clJolt .45s ease-out; }
    @keyframes clBang { 0% { transform: scale(.2); opacity: 0; } 30% { opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
    @keyframes clRespawn { 0% { transform: scale(0) rotate(-30deg); } 100% { transform: none; } }
    .so-ov { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 20px; background: rgba(12,10,28,.55); animation: clFade .2s both; }
    .so-ov.out { animation: clFadeOut .22s both; }
    .skip-offer { padding: 20px 18px 18px; width: min(320px, 100%); border: 3px solid #1d1d1f; border-radius: 16px; background: #fff; box-shadow: 0 4px 0 #1d1d1f; text-align: center; font-weight: 700; color: #1d1d1f; animation: clPop .4s cubic-bezier(.3,1.35,.5,1) both; }
    .skip-offer h3 { margin: 0 0 6px; font-size: 1.3rem; font-weight: 900; }
    .skip-offer p { margin: 0 0 16px; font-size: 1rem; line-height: 1.3; }
    .skip-offer .so-row { display: flex; gap: 10px; justify-content: center; }
    .skip-offer button { flex: 1; padding: 11px 10px; border: 3px solid #1d1d1f; border-radius: 12px; font-family: inherit; font-weight: 900; font-size: 1rem; cursor: pointer; box-shadow: 0 3px 0 #1d1d1f; transition: transform .08s, box-shadow .08s; }
    .skip-offer button:active { transform: translateY(3px); box-shadow: 0 0 0 #1d1d1f; }
    .skip-offer .so-go { background: #3fbf6d; color: #fff; } .skip-offer .so-stay { background: #fff; color: #1d1d1f; }
    @keyframes clFade { from { opacity: 0; } } @keyframes clFadeOut { to { opacity: 0; } }
    @keyframes clPop { 0% { transform: scale(.2) rotate(-6deg); opacity: 0; } 100% { transform: none; opacity: 1; } }
    @keyframes clAway { to { transform: scale(.3) translateY(-30px); opacity: 0; } }
    @keyframes clHit { 0%, 55%, 100% { transform: rotate(0); } 70% { transform: rotate(-32deg); } 82% { transform: rotate(8deg); } }
    @keyframes clCaret { 50% { opacity: 0; } }
    @keyframes clShake { 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }
    /* кувалда: планшет выезжает снизу, экран сдвигается — без всплывающего окна */
    .clip-ov.dock { display: block; background: none; animation: none; }
    .clip-ov.dock.out { animation: none; }
    .clip-ov.dock .clip { position: fixed; left: 50%; bottom: 0; width: min(96vw, 380px); translate: -50% 0; padding: 30px 12px calc(10px + env(safe-area-inset-bottom)); border-radius: 24px 24px 0 0; animation: clDockIn .6s cubic-bezier(.3,1.15,.4,1) both; }
    .clip-ov.dock.out .clip { animation: clDockOut .35s ease-in both; }
    .clip-ov.dock .clip .paper { padding: 10px 10px 12px; }
    .clip-ov.dock .top { font-size: 2.6rem; gap: 14px; }
    .clip-ov.dock .top .hm { width: 38px; height: 38px; }
    .clip-ov.dock .doodle { display: none; }
    .clip-ov.dock .eq { margin-top: 8px; }
    .clip-ov.dock .pad { gap: 9px; margin-top: 6px; }
    .clip-ov.dock .k { height: 58px; font-size: 2.8rem; line-height: 1; padding: 0; }
    .clip-ov.dock.dv .clip { padding-top: 40px; }
    .clip-ov.dock.dv .k { height: 58px; }
    .clip-ov.dock.dv .pad { gap: 6px; margin-top: 4px; }
    .clip-ov.dock.dv .clip { padding-top: 38px; }
    .clip-ov.dock.dv .clip > .cls { top: 8px; right: 22px; width: 40px; height: 30px; border: 2.5px solid #5a463c; border-bottom: 0; border-radius: 9px 11px 2px 2px / 11px 9px 2px 2px; background: #f6c9c3; box-shadow: inset 0 -6px 8px rgba(0,0,0,.05), 0 -1px 0 rgba(255,255,255,.4); transform: rotate(1.2deg); transform-origin: 50% 100%; }
    .clip-ov.dock.dv .clip > .cls:active { transform: rotate(1.2deg) scale(.92); }
    .clip-ov.dock.dv .clip > .cls svg { width: 15px; height: 15px; }
    .clip-ov.dock .paper { clip-path: none; }
    .clip-ov.dock.dv .pane { min-height: 0; padding-top: 6px; }
    .clip-ans { position: absolute; left: 100%; top: 50%; translate: 0 -50%; margin-left: 10px; display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 1.5rem; line-height: 1; color: #161616; white-space: nowrap; animation: clFade .4s both; pointer-events: none; }
    .clip-ans .pvf { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; }
    .clip-ans .pvl { align-self: stretch; border-top: 3px solid #161616; margin: 2px 0; }
    .clip-ans .pvb { display: grid; place-items: center; min-width: 1.2em; height: 1.2em; padding: 0 3px; box-sizing: border-box; border: 2.5px dashed rgba(22,22,22,.4); border-radius: 10px 8px 11px 7px; color: #161616; }
    .clip-ans .pvb.on { border-style: solid; border-color: #3d63d9; color: #24409e; background: repeating-linear-gradient(135deg, rgba(61,99,217,.14) 0 1.5px, rgba(255,255,255,.65) 1.5px 6px); }
    .clip-w { padding: 14px 12px 12px;  }
    .clip-w .cw-head { display: flex; align-items: center; justify-content: center; gap: 14px; padding-bottom: 14px; font-family: var(--ui-font, 'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif); font-weight: 900; font-size: 2.3rem; line-height: 1; color: #1d1d1f; }
    .clip-w .cw-head .clip-ans { position: static; translate: none; margin: 0; font-size: 2.3rem; gap: 12px; animation: none; font-family: inherit; }
    .clip-w .cw-head .pvf { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; }
    .clip-w .cw-head .pvl { align-self: stretch; border-top: 3px solid #161616; margin: 2px 0; }
    .clip-w .cw-head .pvn { min-width: 1em; text-align: center; }
    .clip-w .cw-head::before { content: none; }
    .clip-w .cw-head .pe { order: -0; }
    .clip-w .cw-body { flex: 1; display: flex; flex-direction: column; justify-content: center; min-height: 0; }
    .clip-w { position: fixed; left: 50%; translate: -50% 0; width: min(94vw, 360px); z-index: 61; box-sizing: border-box; visibility: hidden; --pen: #161616; --hand: 'Caveat', 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive; font-family: var(--hand); color: #161616; display: flex; flex-direction: column; justify-content: center;  }
    .clip-w .sk { filter: url(#clPencil); }
    .clip-ov.dock.dv .clip { padding-top: 40px; }
    @keyframes clDockIn { from { translate: -50% 105%; } }
    @keyframes clDockOut { to { translate: -50% 105%; } }
    @media (max-height: 700px) { .clip-ov.dock .k, .clip-ov.dock.dv .k { height: 46px; font-size: 2.3rem; } }
    @media (prefers-reduced-motion: reduce) { .clip, .clip .top .hm { animation: none; } }
  `;
  document.head.append(css);

  function ask(n, fromEl, opt = {}) {
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'clip-ov dock';
      const hm = (MG.tools && MG.tools.icon) ? MG.tools.icon(opt.icon || 'hammer') : '';
      ov.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="clPencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter></svg>
        <div class="clip" role="dialog" aria-label="${opt.label || 'Впиши два множителя'}"><div class="metal"></div><div class="paper">
        <button class="cls" type="button" aria-label="Закрыть"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round"><path class="ink2" pathLength="1" d="M5.500 6.500C9.500 9.500 14 14 19 19.500" stroke="#d6362d" stroke-width="1.400"/><path class="ink" pathLength="1" d="M5 5.500C9 9 14 13.500 18.500 19" stroke="#d6362d" stroke-width="3"/><path class="ink b" pathLength="1" d="M19 5C15 9 10.500 14 5.500 19.500" stroke="#d6362d" stroke-width="3"/></svg></button>
        ${opt.preview ? '' : `<div class="top"><span class="sk">${n}</span><span class="hm">${hm}</span></div>`}
        <div class="sk">
        <div class="doodle${opt.preview ? ' hid' : ''}"><svg viewBox="0 0 120 14" fill="none" stroke="#c9825b" stroke-width="2" stroke-linecap="round"><path d="M4 8C14 2 22 13 32 7S50 3 60 8 78 12 88 6 106 4 116 8"/></svg></div>
        ${opt.preview ? `<div class="pv"><span class="pvf"><span class="pvn t">${opt.preview.n}</span><span class="pvl"></span><span class="pvn">${opt.preview.d}</span></span><span class="pe">=</span><span class="pvb" data-i="0"></span><span class="pvf"><span class="pvb" data-i="1"></span><span class="pvl"></span><span class="pvn">${opt.preview.d}</span></span></div>` : ''}
        <div class="eq${opt.eq ? ' sm' : ''}">${opt.eq || `<span>${n}</span><span>=</span><button class="bx on" type="button" data-i="0" aria-label="Первый множитель"></button><span>×</span><button class="bx" type="button" data-i="1" aria-label="Второй множитель"></button>`}</div>
        <div class="msg"></div>
        <div class="pad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((d) => `<button class="k" type="button" data-d="${d}">${d}</button>`).join('')}<button class="k go" type="button" aria-label="Принять"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path class="ink2" pathLength="1" d="M4.500 13.500C7 14.500 8.500 16.500 10 19.500 12.500 13 16 8.500 21 5" stroke="#2a8f55" stroke-width="1.400"/><path class="ink" pathLength="1" d="M4 12.500C6.500 13.500 8.500 16 9.800 19 12 12.500 15.500 8 20.500 4.500" stroke="#2a8f55" stroke-width="3.200"/></svg></button><button class="k" type="button" data-d="0">0</button><button class="k er" type="button" data-d="x" aria-label="Стереть"><svg viewBox="0 0 24 24" fill="none" stroke="#5a463c" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5.500 3.500 12 9 18.500H20.500V5.500Z"/><path d="M12.500 9.500 17 14.500M17 9.500 12.500 14.500"/></svg></button></div>
        </div></div></div>`;
      const board = ov.querySelector('.clip');
      if (fromEl) {
        const r = fromEl.getBoundingClientRect();
        board.style.setProperty('--ox', `${r.left + r.width / 2 - (innerWidth - Math.min(innerWidth * 0.9, 360)) / 2}px`);
        board.style.setProperty('--oy', `${r.top + r.height / 2 - innerHeight * 0.2}px`);
      }
      document.body.append(ov);
      /* камера: сдвигаем экран вверх, чтобы число осталось видно над планшетом */
      const stg = fromEl && fromEl.closest('.stage');
      const scEl = fromEl ? (fromEl.closest('.fraction, #fraction') || fromEl) : null;
      if (stg) {
        const tabTop = innerHeight - board.offsetHeight, r = fromEl.getBoundingClientRect();
        const fr = (fromEl.closest('.fraction, #fraction') || fromEl).getBoundingClientRect();
        const top = Math.min(r.top, fr.top), bot = Math.max(r.bottom, fr.bottom);
        const sh = Math.max(0, top - 150);
        const avail = tabTop - 24 - 150, sc = Math.min(1, avail / Math.max(1, bot - top));
        stg.style.transition = 'transform .6s cubic-bezier(.3,1.15,.4,1)';
        stg.style.transform = sh > 0 ? `translateY(${-sh}px)` : '';
        if (sc < 1) { scEl.style.transformOrigin = '50% 0'; scEl.style.transition = 'scale .6s cubic-bezier(.3,1.15,.4,1)'; scEl.style.scale = String(sc); }
        board.dataset.cam = sh;
      }
      const boxes = [...ov.querySelectorAll('.bx')], msg = ov.querySelector('.msg'), vals = ['', ''];
      let cur = 0, done = false;
      const maxLen = opt.maxLen || String(n).length;
      const pbs = [...ov.querySelectorAll('.pvb')];
      const paint = () => {
        boxes.forEach((b, i) => { b.textContent = vals[i]; b.classList.toggle('on', i === cur); });
        pbs.forEach((b, i) => { b.textContent = vals[i]; b.classList.toggle('on', i === cur); });
      };
      const close = (res) => {
        if (done) return; done = true;
        document.removeEventListener('keydown', onKey, true);
        ov.classList.add('out');
        if (scEl && scEl.style.scale) { scEl.style.scale = ''; setTimeout(() => { scEl.style.transition = ''; scEl.style.transformOrigin = ''; }, 650); }
        if (stg && stg.style.transform) { stg.style.transform = ''; setTimeout(() => { stg.style.transition = ''; }, 650); }
        setTimeout(() => ov.remove(), 380);
        resolve(res);
      };
      const type = (d) => {
        msg.textContent = '';
        if (d === 'x') { vals[cur] = vals[cur].slice(0, -1); }
        else if (vals[cur].length < maxLen) { vals[cur] = (vals[cur] + d).replace(/^0+(?=\d)/, ''); }
        paint();
      };
      const hmEl = ov.querySelector('.hm');   // в режиме с превью шапки нет
      let breaking = false;
      function breakHammer() {
        if (!hmEl || breaking) return;
        breaking = true;
        const html = hmEl.innerHTML;
        const numEl = ov.querySelector('.top .sk');
        const r1 = hmEl.getBoundingClientRect(), r2 = numEl.getBoundingClientRect();
        hmEl.style.setProperty('--dx', `${Math.round(r2.right - 4 - r1.left - r1.width * 0.38)}px`);
        hmEl.style.setProperty('--dy', `${Math.round(r2.top + r2.height * 0.5 - r1.top - r1.height * 0.3)}px`);
        hmEl.classList.add('swing');
        setTimeout(() => {
          numEl.classList.remove('hit'); void numEl.offsetWidth; numEl.classList.add('hit');
          hmEl.classList.remove('swing');
          hmEl.classList.add('broke');
          hmEl.innerHTML = `<span class="hh a">${html}</span><span class="hh b">${html}</span><svg class="bang" viewBox="0 0 46 46" fill="none" stroke="#e8a21a" stroke-width="3" stroke-linecap="round"><path d="M23 3V12M23 34V43M3 23H12M34 23H43M9 9 15 15M31 31 37 37M37 9 31 15M15 31 9 37"/></svg>`;
        }, 340);
        setTimeout(() => {
          hmEl.innerHTML = html;
          hmEl.classList.remove('broke');
          hmEl.classList.add('respawn');
          setTimeout(() => { hmEl.classList.remove('respawn'); breaking = false; }, 520);
        }, 1500);
      }
      const submit = () => {
        const a = +vals[0], b = +vals[1];
        let bad = '';
        if (opt.check) bad = opt.check(vals, a, b);
        else if (!vals[0] || !vals[1]) bad = 'Впиши оба множителя';
        else if (a < 2 || b < 2) bad = 'Множители должны быть больше 1';
        else if (a * b !== n) bad = `${a} × ${b} = ${a * b}, а нужно ${n}`;
        if (bad) {
          msg.textContent = bad;
          if (vals[0] && vals[1]) breakHammer();
          boxes.forEach((x) => { x.classList.remove('bad'); void x.offsetWidth; x.classList.add('bad'); });
          return;
        }
        close([a, b]);
      };
      function onKey(e) {
        if (/^\d$/.test(e.key)) { type(e.key); e.preventDefault(); }
        else if (e.key === 'Backspace') { type('x'); e.preventDefault(); }
        else if (e.key === 'Enter') { submit(); e.preventDefault(); }
        else if (e.key === 'Escape') { close(null); e.preventDefault(); }
        else if (e.key === 'Tab') { cur = 1 - cur; paint(); e.preventDefault(); }
        e.stopPropagation();
      }
      document.addEventListener('keydown', onKey, true);
      boxes.forEach((b, i) => b.addEventListener('click', () => { cur = i; paint(); }));
      ov.querySelectorAll('.k[data-d]').forEach((k) => k.addEventListener('click', () => type(k.dataset.d)));
      ov.querySelector('.go').addEventListener('click', submit);
      ov.querySelector('.cls').addEventListener('click', () => close(null));
      ov.addEventListener('pointerdown', (e) => { if (e.target === ov) close(null); });
      paint();
    });
  }


  /* ============================================================
   * Планшет «целое и остаток»: вкладка I — деление уголком, вкладка II — формула
   * ============================================================ */
  function askDiv(n, d, fromEl) {
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.className = 'clip-ov dock dv';
      ov.innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="clPencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter></svg>
        <div class="clip" role="dialog" aria-label="Впиши целое и остаток"><div class="metal"></div>
        <div class="tabs"><button class="tab t1 on" type="button" data-t="1" aria-label="Деление уголком">I</button><button class="tab t2" type="button" data-t="2" aria-label="Деление по-американски">II</button><button class="tab t3" type="button" data-t="3" aria-label="Формула">III</button></div>
        <div class="paper">
        <button class="cls" type="button" aria-label="Закрыть"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round"><path class="ink2" pathLength="1" d="M5.500 6.500C9.500 9.500 14 14 19 19.500" stroke="#d6362d" stroke-width="1.400"/><path class="ink" pathLength="1" d="M5 5.500C9 9 14 13.500 18.500 19" stroke="#d6362d" stroke-width="3"/><path class="ink b" pathLength="1" d="M19 5C15 9 10.500 14 5.500 19.500" stroke="#d6362d" stroke-width="3"/></svg></button>
        <div class="sk">
        <div class="pane p1"><div class="ld"></div></div>
        <div class="pane p2" hidden><div class="ld"></div></div>
        <div class="pane p3" hidden>
          <div class="eq sm"><span class="ef"><span class="en">${n}</span><span class="ed">${d}</span></span><span>=</span><span class="ef"><span class="en"><span>${d}</span><span>×</span><button class="bx on" type="button" data-i="0" aria-label="Целое"></button><span>+</span><button class="bx" type="button" data-i="1" aria-label="Остаток"></button></span><span class="ed">${d}</span></span></div>
        </div>
        <div class="msg m2"></div>
        <div class="pad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((d) => `<button class="k" type="button" data-d="${d}">${d}</button>`).join('')}<button class="k go" type="button" aria-label="Принять"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path class="ink2" pathLength="1" d="M4.500 13.500C7 14.500 8.500 16.500 10 19.500 12.500 13 16 8.500 21 5" stroke="#2a8f55" stroke-width="1.400"/><path class="ink" pathLength="1" d="M4 12.500C6.500 13.500 8.500 16 9.800 19 12 12.500 15.500 8 20.500 4.500" stroke="#2a8f55" stroke-width="3.200"/></svg></button><button class="k" type="button" data-d="0">0</button><button class="k er" type="button" data-d="x" aria-label="Стереть"><svg viewBox="0 0 24 24" fill="none" stroke="#5a463c" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5.500 3.500 12 9 18.500H20.500V5.500Z"/><path d="M12.500 9.500 17 14.500M17 9.500 12.500 14.500"/></svg></button></div>
        </div></div></div>`;
      const board = ov.querySelector('.clip');
      board.append(ov.querySelector('.cls'));      // крестик — на рамке планшета, а не на листе
      if (fromEl) {
        const r = fromEl.getBoundingClientRect();
        board.style.setProperty('--ox', `${r.left + r.width / 2 - (innerWidth - Math.min(innerWidth * 0.9, 360)) / 2}px`);
        board.style.setProperty('--oy', `${r.top + r.height / 2 - innerHeight * 0.2}px`);
      }
      document.body.append(ov);
      /* вычисления — на экране под дробью, на планшете остаются вкладки и клавиши */
      const work = document.createElement('div');
      work.className = 'clip-w';
      work.innerHTML = `<div class="cw-head"><span class="pvf cw-f"><span class="pvn">${n}</span><span class="pvl"></span><span class="pvn">${d}</span></span></div><div class="cw-body"><div class="sk"></div></div>`;
      ov.querySelectorAll('.pane').forEach((pn) => work.querySelector('.sk').append(pn));
      ov.append(work);
      /* камера: сдвигаем экран вверх, чтобы дробь осталась видна над планшетом */
      const stg = fromEl && fromEl.closest('.stage');
      let curSh = 0;
      /* дробь на экране прячется — её вместе с ответом показывает карточка над планшетом */
      /* дробь с экрана плавно уменьшается и переезжает в шапку карточки (и обратно при закрытии) */
      const EASE = 'cubic-bezier(.3,1.15,.4,1)';
      const flipVec = () => {
        const head = work.querySelector('.cw-f');
        if (!fromEl || !head) return null;
        const sr = fromEl.getBoundingClientRect(), tr = head.getBoundingClientRect();
        const sc = (parseFloat(getComputedStyle(fromEl).fontSize) / parseFloat(getComputedStyle(head).fontSize)) || 1;
        return { head, t: `translate(${(sr.left + sr.width / 2) - (tr.left + tr.width / 2)}px, ${(sr.top + sr.height / 2) - (tr.top + tr.height / 2)}px) scale(${sc})` };
      };
      let flown = false;
      const cam = () => {
        const tabTop = innerHeight - board.offsetHeight;
        const top = Math.max(150, innerHeight * 0.17);
        work.style.top = `${top}px`; work.style.height = 'auto'; work.style.minHeight = `${Math.min(300, Math.max(200, tabTop - top - 14))}px`;
        if (flown) return;
        flown = true;
        const v = flipVec();
        work.style.visibility = 'visible';
        if (v) v.head.animate([{ transform: v.t }, { transform: 'none' }], { duration: 650, easing: EASE });
        work.querySelectorAll('.cw-body, .clip-ans').forEach((e) => e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 380, fill: 'backwards' }));
        if (fromEl) { fromEl.style.transition = 'none'; fromEl.style.opacity = '0'; }
      };
      const msg = ov.querySelector('.msg');
      const P = [null, ov.querySelector('.p1'), ov.querySelector('.p2'), ov.querySelector('.p3')];
      /* ответ пишется не на планшете, а на экране — справа от дроби */
      const ans = document.createElement('div');
      ans.className = 'clip-ans';
      ans.innerHTML = `<span class="pe">=</span><span class="pvb" data-i="0"></span><span class="pvf"><span class="pvb" data-i="1"></span><span class="pvl"></span><span class="pvn">${d}</span></span>`;
      work.querySelector('.cw-head').append(ans);
      const pv1 = [...ans.querySelectorAll('.pvb')];
      let tab = 1, done = false;
      const say = (t) => { msg.textContent = t || ''; };
      const PH = 190;
      const finish = (res) => setTimeout(() => close(res), 650);

      /* ---------- деление уголком: kind 'ru' (российское) или 'us' (американское) ---------- */
      const digs = String(n).split('').map(Number), L = digs.length;
      let first = 1, cur0 = digs[0];
      while (cur0 < d && first < L) { cur0 = cur0 * 10 + digs[first]; first++; }
      const steps = [];
      { let cur = cur0, end = first - 1;
        for (;;) {
          const q = Math.floor(cur / d), prod = q * d, rem = cur - prod;
          steps.push({ cur, q, prod, rem, end });
          if (end + 1 >= L) break;
          cur = rem * 10 + digs[end + 1]; end += 1;
        } }
      const quotient = Number(steps.map((s) => s.q).join('')), remainder = steps[steps.length - 1].rem;
      const cw = L >= 6 ? 30 : 34;

      function makeLong(kind, pane) {
        const us = kind === 'us';
        pane.style.height = `${PH}px`;
        const ld = pane.querySelector('.ld');
        const cells = [];        // порядок ввода: цифра частного → произведение → остаток
        steps.forEach((s, i) => {
          cells.push({ kind: 'q', i, exp: String(s.q), hint: `Сколько раз ${d} помещается в ${s.cur}?` });
          cells.push({ kind: 'p', i, exp: String(s.prod), hint: `${d} × ${s.q} = ?` });
          cells.push({ kind: 'r', i, exp: String(s.rem), hint: `${s.cur} − ${s.prod} = ?` });
        });
        let ci = 0;
        const digRow = digs.map((g, i) => `<span class="ldg" style="grid-column:${i + 1}">${g}</span>`).join('');
        let left, qBox;
        if (us) {
          ld.classList.add('us');
          ld.innerHTML = `<div class="ad-d">${d}</div><div class="ad-m" style="--L:${L};--cw:${cw}px"><div class="ad-qrow"></div><div class="ad-drow">${digRow}</div><div class="ld-l ad-work"></div></div>`;
          left = ld.querySelector('.ad-work'); qBox = ld.querySelector('.ad-qrow');
        } else {
          ld.innerHTML = `<div class="ld-l" style="--L:${L};--cw:${cw}px"><div class="lr lt">${digRow}</div></div><div class="ld-r"><div class="ld-d">${d}</div><div class="ld-q"></div></div>`;
          left = ld.querySelector('.ld-l'); qBox = ld.querySelector('.ld-q');
        }
        const paintPv = () => {
          pv1[0].textContent = cells.filter((c) => c.kind === 'q' && c.ok).map((c) => c.exp).join('');
          const last = cells[cells.length - 1];
          pv1[1].textContent = last.ok ? last.exp : '';
        };
        function mount(c) {                       // ячейка появляется, когда до неё дошла очередь
          const s = steps[c.i];
          const el = document.createElement('button');
          el.type = 'button'; el.className = `bx lc ${c.kind}`; el.dataset.k = c.kind;
          c.el = el; c.val = '';
          if (c.kind === 'q') {
            if (us) el.style.gridColumn = `${s.end + 1}`;
            qBox.append(el);
          } else {
            const len = c.exp.length;
            const row = document.createElement('div'); row.className = 'lr'; row.dataset.r = `${c.kind}${c.i}`;
            el.style.gridColumn = `${s.end - len + 2} / span ${len}`;
            row.dataset.step = c.i; row.dataset.k = c.kind;
            row.append(el); left.append(row);
          }
          el.classList.add('pop');
        }
        function refreshRows(active) {
          let h = us ? 88 : 44;
          left.querySelectorAll('.lr:not(.lt)').forEach((row) => {
            const j = +row.dataset.step, full = j === active || (row.dataset.k === 'r' && j === active - 1);
            row.classList.toggle('old', !full);
            h += full ? 44 : 22;
          });
          const sc = Math.min(1, (PH - 6) / h);
          ld.style.transform = sc < 1 ? `scale(${sc.toFixed(3)})` : '';
        }
        function paintCell() {
          cells.forEach((c, i) => {
            if (!c.el) return;
            if (c.kind === 'q') c.el.textContent = c.val;
            else {                                   // каждая цифра — в своём столбце, под цифрами делимого
              const len = c.exp.length;
              c.el.style.setProperty('--n', len);
              c.el.innerHTML = Array.from({ length: len }, (_, k) => `<span class="dg1${i === ci && !c.ok && k === c.val.length ? ' cr' : ''}">${c.val[k] || ''}</span>`).join('');
            }
            c.el.classList.toggle('on', i === ci && !c.ok);
          });
        }
        function advance() {
          const c = cells[ci];
          c.ok = true; c.el.classList.add('done'); c.el.classList.remove('on'); paintPv();
          if (c.kind === 'r') {
            const s = steps[c.i];
            if (c.i + 1 < steps.length) {                      // следующая цифра сносится вниз
              const dn = document.createElement('span');
              dn.className = 'ldg drop'; dn.textContent = digs[s.end + 1]; dn.style.gridColumn = `${s.end + 2}`;
              c.el.parentElement.append(dn);
            }
          }
          ci += 1;
          if (ci >= cells.length) { finish([quotient, remainder]); return; }
          mount(cells[ci]); refreshRows(cells[ci].i); paintCell();
        }
        function submit() {
          const c = cells[ci]; if (!c || c.ok) return;
          if (c.val === c.exp) { say(''); advance(); return; }
          say(c.val ? `Не так. ${c.hint}` : c.hint);
          c.el.classList.remove('bad'); void c.el.offsetWidth; c.el.classList.add('bad');
          c.val = ''; paintCell();
        }
        function type(dg) {
          const c = cells[ci]; if (!c || c.ok) return;
          if (dg === 'x') c.val = c.val.slice(0, -1);
          else if (c.val.length < c.exp.length) c.val += dg;
          paintCell();
          if (dg !== 'x' && c.val.length === c.exp.length) setTimeout(submit, 180);
        }
        mount(cells[0]); refreshRows(0); paintCell();
        return { type, submit, paintPv };
      }
      const LD = [null, makeLong('ru', P[1]), makeLong('us', P[2])];

      /* ---------- вкладка III: формула ---------- */
      const boxes = [...ov.querySelectorAll('.eq .bx')], pbs = pv1, vals = ['', ''];
      let cur2 = 0;
      const maxLen = String(n).length;
      const paint2 = () => {
        boxes.forEach((b, i) => { b.textContent = vals[i]; b.classList.toggle('on', i === cur2); });
        pbs.forEach((b, i) => { b.textContent = vals[i]; b.classList.toggle('on', i === cur2); });
      };
      function submit3() {
        const a = +vals[0], b = +vals[1];
        let bad = '';
        if (!vals[0] || !vals[1]) bad = 'Впиши целое и остаток';
        else if (a * d + b !== n) bad = `${a} × ${d} + ${b} = ${a * d + b}, а нужно ${n}`;
        else if (b >= d) bad = `Остаток ${b} ещё не меньше ${d} — можно взять ещё`;
        if (bad) {
          say(bad);
          boxes.forEach((x) => { x.classList.remove('bad'); void x.offsetWidth; x.classList.add('bad'); });
          return;
        }
        close([a, b]);
      }
      boxes.forEach((b, i) => b.addEventListener('click', () => { cur2 = i; paint2(); }));
      paint2();

      /* ---------- общее ---------- */
      P[3].style.height = `${PH}px`;
      const setTab = (t) => {
        tab = t; say('');
        for (let i = 1; i <= 3; i++) P[i].hidden = t !== i;
        if (t < 3) LD[t].paintPv(); else paint2();
        ov.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', +b.dataset.t === t));
        requestAnimationFrame(cam);
      };
      ov.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setTab(+b.dataset.t)));
      const type = (dg) => {
        say('');
        if (tab < 3) { LD[tab].type(dg); return; }
        if (dg === 'x') vals[cur2] = vals[cur2].slice(0, -1);
        else if (vals[cur2].length < maxLen) vals[cur2] = (vals[cur2] + dg).replace(/^0+(?=\d)/, '');
        paint2();
      };
      requestAnimationFrame(cam);
      const submit = () => (tab < 3 ? LD[tab].submit() : submit3());
      const close = (res) => {
        if (done) return; done = true;
        document.removeEventListener('keydown', onKey, true);
        ov.classList.add('out');
        const v = flipVec();
        work.querySelectorAll('.cw-body, .clip-ans').forEach((e) => e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }));
        if (v) v.head.animate([{ transform: 'none' }, { transform: v.t }], { duration: 420, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
        setTimeout(() => { if (fromEl) { fromEl.style.opacity = ''; fromEl.style.transition = ''; } work.style.visibility = 'hidden'; }, v ? 400 : 0);
        setTimeout(() => ov.remove(), 450);
        resolve(res);
      };
      function onKey(e) {
        if (/^\d$/.test(e.key)) { type(e.key); e.preventDefault(); }
        else if (e.key === 'Backspace') { type('x'); e.preventDefault(); }
        else if (e.key === 'Enter') { submit(); e.preventDefault(); }
        else if (e.key === 'Escape') { close(null); e.preventDefault(); }
        else if (e.key === 'Tab' && tab === 3) { cur2 = 1 - cur2; paint2(); e.preventDefault(); }
        e.stopPropagation();
      }
      document.addEventListener('keydown', onKey, true);
      ov.querySelectorAll('.k[data-d]').forEach((k) => k.addEventListener('click', () => type(k.dataset.d)));
      ov.querySelector('.go').addEventListener('click', submit);
      ov.querySelector('.cls').addEventListener('click', () => close(null));
      ov.addEventListener('pointerdown', (e) => { if (e.target === ov) close(null); });
    });
  }

  /* тестовый переключатель: ручное разбиение сразу, без 50 % прогресса */
  const KEYT = 'mg.test.manual';
  const forced = () => { try { return localStorage.getItem(KEYT) === '1'; } catch (e) { return false; } };
  const setForced = (v) => { try { localStorage.setItem(KEYT, v ? '1' : '0'); } catch (e) { /* нет хранилища */ } };
  /* ручной режим: включён тестовой кнопкой или решено 2 задачи (стадия «человек»), начиная с 3-й */
  const isManual = (from = 2) => forced() || !(MG.active === MG.modes.cancel) || (parseInt((document.getElementById('solved') || {}).textContent, 10) || 0) >= from;

  MG.clip = { ask, askDiv, forced, setForced, isManual };
})();
