'use strict';
// 키보드 입력. 메이플식 배치: 방향키 이동/등반, 스페이스·C 점프, X 공격, Z 회피, A S D F 스킬.
HC.Input = (function () {
  const down = new Set();
  const pressed = new Set();
  const released = new Set();
  const BIND = {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    jump: ['Space', 'KeyC'],
    attack: ['KeyX'],
    dash: ['KeyZ', 'ShiftLeft', 'ShiftRight'],
    s1: ['KeyA'], s2: ['KeyS'], s3: ['KeyD'], s4: ['KeyF'],
    potion: ['KeyQ'],
    interact: ['KeyE'],
    rest: ['KeyR'],
    inv: ['KeyI', 'Tab'],
    souls: ['KeyK'],
    map: ['KeyM'],
    menu: ['Escape'],
    talisman: ['KeyT'],
  };
  const codeToAct = {};
  for (const act in BIND) for (const c of BIND[act]) (codeToAct[c] = codeToAct[c] || []).push(act);

  const BLOCK = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab']);
  let enabled = true;

  function isTyping(e) {
    const t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  window.addEventListener('keydown', (e) => {
    if (isTyping(e)) return;
    if (BLOCK.has(e.code)) e.preventDefault();
    const acts = codeToAct[e.code];
    if (!acts) return;
    for (const a of acts) {
      if (!down.has(a)) pressed.add(a);
      down.add(a);
    }
    if (HC.Audio) HC.Audio.unlock();
  });
  window.addEventListener('keyup', (e) => {
    const acts = codeToAct[e.code];
    if (!acts) return;
    for (const a of acts) { down.delete(a); released.add(a); }
  });
  window.addEventListener('blur', () => { down.clear(); });

  return {
    BIND,
    held(a) { return enabled && down.has(a); },
    hit(a) { return enabled && pressed.has(a); },
    up(a) { return enabled && released.has(a); },
    // UI용: enabled 여부와 무관하게 이번 프레임에 눌렸는지
    rawHit(a) { return pressed.has(a); },
    consume(a) { pressed.delete(a); },
    endFrame() { pressed.clear(); released.clear(); },
    setEnabled(v) { enabled = v; if (!v) down.clear(); },
    get enabled() { return enabled; },
  };
})();
