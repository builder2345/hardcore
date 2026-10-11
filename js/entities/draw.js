'use strict';
// 절차적 몸체 렌더러. 실루엣과 빛나는 눈을 중심으로 어둡게 그린다.
HC.Draw = (function () {
  const U = HC.U;

  function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function eyeGlow(ctx, x, y, col, s) {
    s = s || 1;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = U.colorAlpha(col, 0.35);
    ctx.fillRect(Math.round(x - s), Math.round(y - s), 2 * s + 1, 2 * s + 1);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), s, s);
  }

  // 무기 그리기: 손 위치(hx,hy)에서 각도 ang 방향으로
  function weapon(ctx, kind, hx, hy, ang, scale, col) {
    ctx.save();
    ctx.translate(Math.round(hx), Math.round(hy));
    ctx.rotate(ang);
    const s = scale || 1;
    const metal = col || '#9a9aa2', dark = '#3a3026';
    switch (kind) {
      case 'blade': R(ctx, 0, -1, 3 * s, 2, dark); R(ctx, 3 * s, -1.5, 10 * s, 3, metal); R(ctx, 3 * s, -1.5, 10 * s, 1, '#d0d0d8'); break;
      case 'spear': R(ctx, -6 * s, -1, 30 * s, 2, '#6a5236'); ctx.fillStyle = metal; ctx.beginPath(); ctx.moveTo(24 * s, -3); ctx.lineTo(31 * s, 0); ctx.lineTo(24 * s, 3); ctx.fill(); break;
      case 'pick': R(ctx, 0, -1, 12 * s, 2, '#6a5236'); R(ctx, 10 * s, -5 * s, 3, 10 * s, metal); break;
      case 'cleaver': R(ctx, 0, -1, 4 * s, 3, dark); R(ctx, 4 * s, -4 * s, 13 * s, 8 * s, metal); R(ctx, 4 * s, -4 * s, 13 * s, 1, '#c8c8cc'); R(ctx, 10 * s, 0, 3, 2, '#5a1010'); break;
      case 'scythe': R(ctx, -8 * s, -1, 34 * s, 2, '#2a2030'); ctx.fillStyle = '#b8a8d8'; ctx.beginPath(); ctx.moveTo(25 * s, 0); ctx.quadraticCurveTo(22 * s, -16 * s, 6 * s, -18 * s); ctx.quadraticCurveTo(18 * s, -12 * s, 23 * s, 0); ctx.fill(); break;
      case 'staff': R(ctx, -8 * s, -1, 28 * s, 2, '#4a3a2a'); eyeGlow(ctx, 20 * s, -1, col || '#a0ff80', 2); break;
      case 'greatsword': R(ctx, -2, -1.5, 6 * s, 3, dark); R(ctx, 2 * s, -4 * s, 2, 8 * s, '#6a6a70'); R(ctx, 4 * s, -2.5 * s, 26 * s, 5 * s, metal); R(ctx, 4 * s, -2.5 * s, 26 * s, 1, '#e0e0e8'); break;
      case 'daggers': R(ctx, 0, -1, 2, 2, dark); R(ctx, 2, -1, 8 * s, 2, metal); break;
      case 'shield': R(ctx, 2, -9 * s, 5 * s, 18 * s, '#5a4a3a'); R(ctx, 3, -8 * s, 3 * s, 16 * s, metal); break;
      case 'axe': R(ctx, -2, -1, 16 * s, 2, '#5a4026'); ctx.fillStyle = metal; ctx.beginPath(); ctx.moveTo(10 * s, -2); ctx.lineTo(16 * s, -7 * s); ctx.lineTo(17 * s, 4 * s); ctx.lineTo(10 * s, 2); ctx.fill(); break;
      case 'mace': R(ctx, -2, -1, 15 * s, 2, '#5a4026'); R(ctx, 12 * s, -4 * s, 7 * s, 8 * s, metal); R(ctx, 13 * s, -5 * s, 2, 10 * s, metal); R(ctx, 16 * s, -5 * s, 2, 10 * s, metal); break;
      case 'pspear': R(ctx, -8 * s, -1, 40 * s, 2, '#5a4026'); ctx.fillStyle = metal; ctx.beginPath(); ctx.moveTo(32 * s, -3); ctx.lineTo(41 * s, 0); ctx.lineTo(32 * s, 3); ctx.fill(); break;
      case 'pgreatsword': R(ctx, -3, -1.5, 6, 3, dark); R(ctx, 2, -4, 2, 8, '#6a6a70'); R(ctx, 4, -2.5, 23 * s, 5, metal); R(ctx, 4, -2.5, 23 * s, 1, '#e8e8f0'); break;
      default: break;
    }
    ctx.restore();
  }

  // 팔 각도: 상태별
  function armAngle(e) {
    const st = e.anim;
    if (st === 'windup') return -2.4 + Math.sin(e.animT * 40) * 0.05;
    if (st === 'attack') return U.lerp(-1.6, 0.9, Math.min(1, e.animT / 0.12));
    if (st === 'hurt') return -1.8;
    return 1.15 + Math.sin(e.animT * 3) * 0.05;
  }

  function humanoid(ctx, e, b, t) {
    const H = b.h, W = b.w;
    const walk = e.anim === 'walk' ? Math.sin(t * 12) : 0;
    const hunch = (b.hunch || 0) * 4;
    const legH = H * 0.36, torH = H * 0.4, headS = Math.max(5, H * 0.24);
    const c = b.c, c2 = b.c2;
    const ghost = b.ghost;
    if (ghost) ctx.globalAlpha *= 0.75;
    // 망토
    if (b.cape) {
      ctx.fillStyle = U.shade(c2, -0.2);
      ctx.beginPath(); ctx.moveTo(-W * 0.2 + hunch, -legH - torH); ctx.lineTo(-W * 0.7 - Math.abs(walk) * 3, -2); ctx.lineTo(W * 0.1, -legH * 0.6); ctx.fill();
    }
    // 꼬리
    if (b.tail) { ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-W * 0.2, -legH); ctx.lineTo(-W * 0.9, -2 + Math.sin(t * 4) * 2); ctx.lineTo(-W * 0.15, -legH + 4); ctx.fill(); }
    // 다리 / 로브
    if (b.robe) {
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.moveTo(-W * 0.35 + hunch * 0.5, -legH - 2); ctx.lineTo(W * 0.35 + hunch * 0.5, -legH - 2); ctx.lineTo(W * 0.55 + walk, 0); ctx.lineTo(-W * 0.55 - walk, 0); ctx.fill();
      R(ctx, -W * 0.55, -2, W * 1.1, 2, U.shade(c2, -0.3));
    } else if (b.hanged && e.hanging) {
      R(ctx, -W * 0.22, -legH, 3, legH, c2); R(ctx, W * 0.05, -legH, 3, legH - 1, c2);
    } else {
      R(ctx, -W * 0.3 + walk * 3, -legH, Math.max(2, W * 0.24), legH, c2);
      R(ctx, W * 0.05 - walk * 3, -legH, Math.max(2, W * 0.24), legH, U.shade(c2, -0.15));
    }
    // 몸통
    const tw = W * (b.fat ? 1.0 : 0.72);
    R(ctx, -tw / 2 + hunch * 0.6, -legH - torH, tw, torH, c);
    if (b.armor || b.stone) { R(ctx, -tw / 2 + hunch * 0.6, -legH - torH, tw, 3, U.shade(c, 0.25)); R(ctx, -tw / 2 + hunch * 0.6 + 2, -legH - torH + 5, tw - 4, 2, U.shade(c, 0.15)); }
    if (b.fat) { ctx.fillStyle = U.shade(c, 0.08); ctx.beginPath(); ctx.ellipse(hunch * 0.6 + 2, -legH - torH * 0.4, tw * 0.45, torH * 0.45, 0, 0, Math.PI * 2); ctx.fill(); }
    // 머리
    const hx = hunch + W * 0.05, hy = -legH - torH - headS + (b.hunch || 0) * 3;
    R(ctx, hx - headS / 2, hy, headS, headS, U.shade(c, 0.05));
    if (b.robe) { ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(hx - headS / 2 - 2, hy + headS); ctx.lineTo(hx, hy - 4); ctx.lineTo(hx + headS / 2 + 2, hy + headS); ctx.fill(); }
    if (b.horns) { ctx.fillStyle = '#d8d0c0'; ctx.beginPath(); ctx.moveTo(hx - headS / 2, hy + 2); ctx.lineTo(hx - headS / 2 - 3, hy - 6); ctx.lineTo(hx - headS / 2 + 2, hy); ctx.fill(); ctx.beginPath(); ctx.moveTo(hx + headS / 2, hy + 2); ctx.lineTo(hx + headS / 2 + 3, hy - 6); ctx.lineTo(hx + headS / 2 - 2, hy); ctx.fill(); }
    if (b.crown) { ctx.fillStyle = b.embers ? '#ff7030' : '#c8a040'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(hx - headS / 2 + i * headS / 3, hy); ctx.lineTo(hx - headS / 2 + i * headS / 3 + headS / 6, hy - 4); ctx.lineTo(hx - headS / 2 + (i + 1) * headS / 3, hy); ctx.fill(); } }
    if (b.halo) { ctx.strokeStyle = 'rgba(255,240,190,0.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(hx, hy - 4, headS * 0.7, 2, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (b.hanged && e.hanging) R(ctx, hx, hy - 60, 1, 60, '#6a5a40');
    // 눈
    const eyeY = hy + headS * 0.38;
    eyeGlow(ctx, hx + headS * 0.15, eyeY, b.eye, 1);
    if (!b.robe) eyeGlow(ctx, hx + headS * 0.38, eyeY, b.eye, 1);
    if (b.mirror) { ctx.fillStyle = 'rgba(220,240,255,0.25)'; ctx.fillRect(-W / 2, -H, W, H); }
    // 팔 + 무기
    const ang = armAngle(e);
    const sx = hunch * 0.6 + tw * 0.25, sy = -legH - torH + 3;
    const armL = Math.max(5, H * 0.3);
    const hx2 = sx + Math.cos(ang) * armL, hy2 = sy + Math.sin(ang) * armL;
    ctx.strokeStyle = U.shade(c, -0.1); ctx.lineWidth = Math.max(2, W * 0.18);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx2, hy2); ctx.stroke();
    if (b.wpn && b.wpn !== 'none') {
      const wsc = H / 24;
      if (b.wpn === 'shield') { weapon(ctx, 'shield', sx + 4, sy + 6, 0, wsc); weapon(ctx, 'blade', hx2, hy2, ang + 0.2, wsc); }
      else if (b.wpn === 'daggers') { weapon(ctx, 'daggers', hx2, hy2, ang, wsc); weapon(ctx, 'daggers', hx2 - 4, hy2 + 2, ang + 0.6, wsc); }
      else weapon(ctx, b.wpn, hx2, hy2, ang + (b.wpn === 'spear' || b.wpn === 'staff' || b.wpn === 'scythe' ? -0.3 : 0), wsc, b.wpn === 'staff' ? b.eye : null);
    } else {
      // 맨손: 갈고리 손톱
      R(ctx, hx2 - 1, hy2 - 1, 3, 3, U.shade(c, 0.2));
    }
    if (ghost) ctx.globalAlpha /= 0.75;
  }

  function beast(ctx, e, b, t) {
    const W = b.w, H = b.h;
    const run = e.anim === 'walk' || e.anim === 'attack' ? t * 16 : 0;
    const c = b.c, c2 = b.c2;
    // 꼬리
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-W * 0.42, -H * 0.7); ctx.lineTo(-W * 0.62, -H * 0.85 + Math.sin(t * 6) * 2); ctx.lineTo(-W * 0.4, -H * 0.55); ctx.fill();
    // 다리
    for (let i = 0; i < 4; i++) {
      const lx = -W * 0.32 + (i % 2) * W * 0.1 + (i >= 2 ? W * 0.45 : 0);
      const sw = Math.sin(run + i * 1.6) * 3;
      R(ctx, lx + sw, -H * 0.42, 3, H * 0.42, i % 2 ? c2 : U.shade(c2, -0.2));
    }
    // 몸통
    const crouch = e.anim === 'windup' ? 3 : 0;
    R(ctx, -W * 0.42, -H * 0.85 + crouch, W * 0.75, H * 0.48, c);
    R(ctx, -W * 0.42, -H * 0.85 + crouch, W * 0.75, 2, U.shade(c, 0.2));
    if (b.mane) { ctx.fillStyle = U.shade(c, 0.25); ctx.beginPath(); ctx.moveTo(W * 0.05, -H * 0.9 + crouch); ctx.lineTo(W * 0.35, -H * 1.05 + crouch); ctx.lineTo(W * 0.3, -H * 0.4 + crouch); ctx.fill(); }
    // 머리
    const hx = W * 0.28, hy = -H * 0.95 + crouch;
    R(ctx, hx, hy, W * 0.22, H * 0.36, c);
    const jaw = e.anim === 'attack' || e.anim === 'windup' ? 3 : 0;
    R(ctx, hx + W * 0.18, hy + H * 0.12, W * 0.18, H * 0.12, U.shade(c, -0.1));
    R(ctx, hx + W * 0.18, hy + H * 0.24 + jaw, W * 0.16, H * 0.08, U.shade(c2, -0.1));
    if (jaw) { R(ctx, hx + W * 0.2, hy + H * 0.24, 1, 2, '#e0e0d0'); R(ctx, hx + W * 0.28, hy + H * 0.24, 1, 2, '#e0e0d0'); }
    R(ctx, hx + 1, hy - 3, 3, 4, c2);
    eyeGlow(ctx, hx + W * 0.14, hy + H * 0.1, b.eye, 1);
  }

  function crawler(ctx, e, b, t) {
    const W = b.w, H = b.h;
    const walk = e.anim === 'walk' ? t * 14 : 0;
    const c = b.c, c2 = b.c2;
    for (let i = 0; i < 6; i++) {
      const lx = -W * 0.3 + (i % 3) * W * 0.22;
      const sw = Math.sin(walk + i) * 2;
      ctx.strokeStyle = c2; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx, -H * 0.45); ctx.lineTo(lx + sw - 3, -H * 0.6); ctx.lineTo(lx + sw - 5, 0); ctx.stroke();
    }
    R(ctx, -W * 0.38, -H * 0.75, W * 0.7, H * 0.4, c);
    for (let i = 0; i < 4; i++) R(ctx, -W * 0.36 + i * W * 0.17, -H * 0.75, 1, H * 0.4, U.shade(c, -0.3));
    // 집게
    const pinch = e.anim === 'attack' ? 0 : 2;
    R(ctx, W * 0.3, -H * 0.62, W * 0.16, 3, c2);
    R(ctx, W * 0.44, -H * 0.72 - pinch, 4, 3, c); R(ctx, W * 0.44, -H * 0.48 + pinch, 4, 3, c);
    eyeGlow(ctx, W * 0.28, -H * 0.72, b.eye, 1);
    if (b.crown) { ctx.fillStyle = '#c8a040'; ctx.fillRect(W * 0.18, -H * 0.85, 8, 2); }
    // 꼬리
    if (b.tail) {
      const raise = e.anim === 'windup' ? 1 : 0;
      ctx.strokeStyle = c; ctx.lineWidth = Math.max(3, H * 0.22);
      ctx.beginPath(); ctx.moveTo(-W * 0.36, -H * 0.6);
      ctx.quadraticCurveTo(-W * 0.65, -H * (1.6 + raise * 0.3), -W * 0.1 + raise * 6, -H * (1.55 + raise * 0.4));
      ctx.stroke();
      eyeGlow(ctx, -W * 0.08 + raise * 6, -H * (1.55 + raise * 0.4), '#c0ff60', 2);
    }
  }

  function flyer(ctx, e, b, t) {
    const W = b.w, H = b.h;
    const bob = Math.sin(t * 5) * 2;
    const c = b.c, c2 = b.c2;
    ctx.translate(0, bob);
    if (b.wings === 'cloak') {
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.moveTo(-W * 0.5, -H * 0.9); ctx.lineTo(W * 0.4, -H * 0.9);
      for (let i = 0; i <= 5; i++) ctx.lineTo(W * 0.5 - i * W * 0.2, -H * 0.1 + (i % 2) * 5 + Math.sin(t * 8 + i) * 2);
      ctx.fill();
      R(ctx, -W * 0.3, -H, W * 0.6, H * 0.35, c);
      eyeGlow(ctx, W * 0.05, -H * 0.82, b.eye, 1); eyeGlow(ctx, W * 0.22, -H * 0.82, b.eye, 1);
      if (b.crown) { ctx.fillStyle = '#ff7030'; ctx.fillRect(-W * 0.25, -H - 3, W * 0.5, 2); }
    } else if (b.wings === 'bird' || b.wings === 'angel') {
      const flap = Math.sin(t * (b.wings === 'angel' ? 4 : 14));
      const wc = b.wings === 'angel' ? '#e8e4f0' : c2;
      ctx.fillStyle = wc;
      ctx.beginPath(); ctx.moveTo(-W * 0.1, -H * 0.6); ctx.lineTo(-W * 0.7, -H * 0.6 - flap * H * 0.6); ctx.lineTo(-W * 0.4, -H * 0.4); ctx.fill();
      if (b.broken) { ctx.fillStyle = '#6a6080'; ctx.beginPath(); ctx.moveTo(W * 0.1, -H * 0.6); ctx.lineTo(W * 0.5, -H * 0.3 - flap * H * 0.2); ctx.lineTo(W * 0.25, -H * 0.4); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(W * 0.0, -H * 0.62); ctx.lineTo(W * 0.4, -H * 0.62 - flap * H * 0.55); ctx.lineTo(W * 0.25, -H * 0.42); ctx.fill(); }
      R(ctx, -W * 0.25, -H * 0.7, W * 0.5, H * 0.4, c);
      if (b.face || b.wings === 'angel') { R(ctx, W * 0.05, -H * 0.95, W * 0.25, H * 0.28, U.shade(c, 0.15)); eyeGlow(ctx, W * 0.2, -H * 0.85, b.eye, 1); }
      else { R(ctx, W * 0.2, -H * 0.72, W * 0.18, H * 0.2, c); ctx.fillStyle = '#c0a040'; ctx.fillRect(W * 0.38, -H * 0.66, 3, 2); eyeGlow(ctx, W * 0.28, -H * 0.68, b.eye, 1); }
      if (b.eyes) for (let i = 0; i < 6; i++) eyeGlow(ctx, -W * 0.2 + (i % 3) * W * 0.15, -H * 0.62 + Math.floor(i / 3) * 4, b.eye, 1);
      if (b.halo) { ctx.strokeStyle = 'rgba(255,240,190,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(W * 0.17, -H * 1.02, 6, 2, 0, 0, Math.PI * 2); ctx.stroke(); }
      // 다리
      R(ctx, -2, -H * 0.3, 2, 6, c2); R(ctx, 3, -H * 0.3, 2, 6, c2);
    }
  }

  function golem(ctx, e, b, t) {
    const W = b.w, H = b.h;
    const walk = e.anim === 'walk' ? Math.sin(t * 7) : 0;
    const c = b.c, c2 = b.c2;
    R(ctx, -W * 0.35 + walk * 2, -H * 0.3, W * 0.28, H * 0.3, c2);
    R(ctx, W * 0.07 - walk * 2, -H * 0.3, W * 0.28, H * 0.3, U.shade(c2, -0.15));
    R(ctx, -W * 0.5, -H * 0.85, W, H * 0.58, c);
    R(ctx, -W * 0.5, -H * 0.85, W, 3, U.shade(c, 0.2));
    ctx.strokeStyle = U.shade(c, -0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-W * 0.2, -H * 0.8); ctx.lineTo(-W * 0.05, -H * 0.6); ctx.lineTo(-W * 0.18, -H * 0.4); ctx.stroke();
    R(ctx, -W * 0.15, -H, W * 0.38, H * 0.18, U.shade(c, 0.05));
    eyeGlow(ctx, W * 0.08, -H * 0.93, b.eye, 1); eyeGlow(ctx, W * 0.16, -H * 0.93, b.eye, 1);
    if (b.core) eyeGlow(ctx, 0, -H * 0.6, b.eye, 3);
    const up = e.anim === 'windup' ? -H * 0.35 : e.anim === 'attack' ? H * 0.05 : 0;
    R(ctx, W * 0.42, -H * 0.82 + up, W * 0.3, H * 0.45, U.shade(c, -0.08));
    R(ctx, -W * 0.72, -H * 0.8, W * 0.26, H * 0.42, U.shade(c, -0.15));
  }

  function tree(ctx, e, b, t) {
    const W = b.w, H = b.h;
    const c = b.c, c2 = b.c2;
    const sway = Math.sin(t * 1.5) * 2;
    ctx.fillStyle = c2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-W * 0.2 + i * W * 0.13, -H * 0.2); ctx.lineTo(-W * 0.55 + i * W * 0.35 + Math.sin(t * 3 + i) * 2, 0); ctx.lineTo(-W * 0.1 + i * W * 0.13, -H * 0.15); ctx.fill(); }
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(-W * 0.32, -H * 0.15); ctx.lineTo(-W * 0.22 + sway, -H); ctx.lineTo(W * 0.22 + sway, -H); ctx.lineTo(W * 0.32, -H * 0.15); ctx.fill();
    ctx.strokeStyle = U.shade(c, -0.35); ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-W * 0.18 + i * W * 0.12, -H * 0.2); ctx.lineTo(-W * 0.12 + i * W * 0.1 + sway, -H * 0.95); ctx.stroke(); }
    // 가지 팔
    const up = e.anim === 'windup' ? -0.9 : e.anim === 'attack' ? 0.5 : 0;
    ctx.strokeStyle = c; ctx.lineWidth = Math.max(3, W * 0.12);
    ctx.beginPath(); ctx.moveTo(W * 0.15 + sway, -H * 0.75); ctx.lineTo(W * 0.6 + sway, -H * (0.55 - up * 0.3)); ctx.lineTo(W * 0.75, -H * (0.3 - up * 0.3)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-W * 0.15 + sway, -H * 0.8); ctx.lineTo(-W * 0.55, -H * 0.95); ctx.lineTo(-W * 0.7, -H * 1.05); ctx.stroke();
    // 얼굴
    R(ctx, -W * 0.08 + sway, -H * 0.72, W * 0.3, 3, '#000');
    eyeGlow(ctx, sway, -H * 0.8, b.eye, b.giant ? 3 : 1); eyeGlow(ctx, W * 0.14 + sway, -H * 0.8, b.eye, b.giant ? 3 : 1);
    R(ctx, -W * 0.02 + sway, -H * 0.66, W * 0.18, H * 0.05, '#050302');
    if (b.heart) eyeGlow(ctx, sway, -H * 0.45, '#ff5030', b.giant ? 5 : 2);
  }

  // 지렁이형 (재앙). e.segs = [{x,y}...] 월드 좌표.
  function worm(ctx, e, b, t, cam) {
    if (!e.segs) return;
    const n = e.segs.length;
    for (let i = n - 1; i >= 0; i--) {
      const s = e.segs[i];
      const r = (b.h * 0.5) * (1 - i / (n * 1.6));
      const x = s.x - cam.x, y = s.y - cam.y;
      ctx.fillStyle = i % 2 ? b.c : U.shade(b.c, 0.08);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = U.colorAlpha(b.c2, 0.75);
      ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.7); ctx.lineTo(x, y - r * 1.35); ctx.lineTo(x + r * 0.4, y - r * 0.7); ctx.fill();
    }
    // 머리
    const h = e.segs[0];
    const hx = h.x - cam.x, hy = h.y - cam.y;
    const dir = e.facing;
    ctx.fillStyle = U.shade(b.c, 0.12);
    ctx.beginPath(); ctx.arc(hx, hy, b.h * 0.55, 0, Math.PI * 2); ctx.fill();
    const open = e.anim === 'attack' || e.anim === 'windup' ? 0.6 : 0.2;
    ctx.fillStyle = '#050508';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, b.h * 0.5, dir > 0 ? -open : Math.PI - open, dir > 0 ? open : Math.PI + open); ctx.fill();
    ctx.fillStyle = '#e8f0f0';
    for (let k = 0; k < 5; k++) {
      const a = (dir > 0 ? 0 : Math.PI) + (k - 2) * open * 0.5;
      ctx.fillRect(hx + Math.cos(a) * b.h * 0.42, hy + Math.sin(a) * b.h * 0.42, 2, 2);
    }
    for (let k = -1; k <= 1; k += 2) eyeGlow(ctx, hx - dir * b.h * 0.15, hy + k * b.h * 0.25 - 4, b.eye, 2);
  }

  // ── 플레이어 ──
  function player(ctx, p, t) {
    const gear = p.look;
    const giant = p.giant ? 1.35 : 1;
    ctx.scale(giant, giant);
    const walk = p.anim === 'walk' ? Math.sin(t * 13) : 0;
    const air = !p.onGround && p.state !== 'climb';
    const skin = '#c8a080', hair = '#2a1a10';
    const armor = gear.armorCol || '#4a3a2a', armorHi = U.shade(armor, 0.25);
    const climb = p.state === 'climb';
    // 털망토
    ctx.fillStyle = '#3a2e22';
    ctx.beginPath(); ctx.moveTo(-3, -24); ctx.lineTo(-9 - Math.abs(walk) * 2 - (air ? 3 : 0), -6 + (air ? -4 : 0)); ctx.lineTo(1, -12); ctx.fill();
    // 다리
    if (climb) {
      const c = Math.sin(t * 10) * (p.vy !== 0 ? 3 : 0);
      R(ctx, -4, -11 + c, 3, 11, '#2a2420'); R(ctx, 1, -11 - c, 3, 11, '#221c18');
    } else if (air) {
      R(ctx, -4, -10, 3, 8, '#2a2420'); R(ctx, 1, -11, 3, 7, '#221c18');
    } else {
      R(ctx, -4 + walk * 3, -10, 3, 10, '#2a2420'); R(ctx, 1 - walk * 3, -10, 3, 10, '#221c18');
    }
    // 몸통
    R(ctx, -5, -21, 11, 12, armor);
    R(ctx, -5, -21, 11, 2, armorHi);
    R(ctx, -5, -12, 11, 2, '#2a1a10');
    // 머리
    R(ctx, -3, -28, 7, 7, skin);
    R(ctx, -4, -29, 8, 3, hair); R(ctx, -4, -27, 2, 6, hair);
    if (gear.helm) { R(ctx, -4, -30, 9, 4, gear.helmCol); R(ctx, 2, -27, 3, 1, gear.helmCol); }
    R(ctx, 2, -25, 1, 1, '#100808');
    // 팔 + 무기
    let ang;
    const atk = p.atkAnim;
    if (climb) ang = -2.0;
    else if (atk) {
      const k = atk.t / atk.dur;
      const W = atk.wtype;
      if (W === 'spear' || W === 'daggers') ang = k < 0.35 ? U.lerp(0.4, -0.2, k / 0.35) : U.lerp(-0.1, 0.05, (k - 0.35) / 0.65);
      else ang = k < 0.35 ? U.lerp(-2.6, -2.9, k / 0.35) : U.lerp(-2.6, 1.0, U.easeOut(Math.min(1, (k - 0.35) / 0.3)));
      if (atk.air && W !== 'spear') ang = k < 0.3 ? -2.4 : U.lerp(-2.4, 1.6, Math.min(1, (k - 0.3) / 0.3));
    } else if (p.state === 'dash') ang = 2.4;
    else if (p.drinking > 0) ang = -1.2;
    else ang = 1.25 + Math.sin(t * 2.5) * 0.06;
    const sx = 1, sy = -19;
    const hx = sx + Math.cos(ang) * 8, hy = sy + Math.sin(ang) * 8;
    ctx.strokeStyle = skin; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
    if (p.drinking > 0) { R(ctx, hx - 1, hy - 4, 3, 5, '#d03030'); }
    else {
      const wt = gear.wtype || 'axe';
      const kind = wt === 'spear' ? 'pspear' : wt === 'greatsword' ? 'pgreatsword' : wt === 'daggers' ? 'daggers' : wt === 'mace' ? 'mace' : 'axe';
      const offAng = (wt === 'spear' || wt === 'daggers') && atk ? 0 : -0.2;
      weapon(ctx, kind, hx, hy, ang + offAng, 1, gear.wCol);
      if (wt === 'daggers') weapon(ctx, 'daggers', -3 + Math.cos(ang + 0.8) * 6, -18 + Math.sin(ang + 0.8) * 6, ang + 0.8, 1, gear.wCol);
    }
    if (gear.gloves) R(ctx, hx - 1, hy - 1, 3, 3, gear.glovesCol);
  }

  // 몬스터 스프라이트 상태 → [애니메이션, 시작, 끝]
  function artSpec(art, state) {
    let spec = art.anims[state] || (state === 'hurt' ? art.anims.idle : null) || art.anims.walk || art.anims.idle;
    if (typeof spec === 'string') return [spec, null, null];
    return spec;
  }
  function spriteBody(ctx, e, cam, t, fx) {
    if (!HC.Assets.ready) return false;
    const art = HC.MOB_ART[e.def.baseId || e.def.id];
    if (!art) return false;
    let state = e.anim || 'idle';
    if (e.spawnT > 0 && art.anims.spawn) state = 'spawn';
    const [an, f0, f1] = artSpec(art, state);
    let frame;
    if (state === 'spawn') { const m = HC.Spr.meta(art.k, an); frame = m ? Math.min(m.n - 1, Math.floor((1 - e.spawnT / 0.6) * m.n)) : 0; }
    else frame = HC.Spr.frameAt(art.k, an, e.animT * (state === 'attack' ? 1.4 : 1), f0, f1);
    const tint = e.def.corrupt ? 'corrupt' : art.tint;
    const x = e.x + e.w / 2 - cam.x, y = e.y + e.h - cam.y;
    const alpha = (e.alpha != null ? e.alpha : 1) * (art.alpha || 1);
    return HC.Spr.draw(ctx, art.k, an, frame, x, y, e.facing, { scale: (art.scale || 1) * (e.bodyScale || 1), tint, flash: fx && fx.flash, red: fx && fx.red, alpha });
  }

  // e: 엔티티, kind = body.t
  function body(ctx, e, cam, t, fx) {
    if (spriteBody(ctx, e, cam, t, fx)) return;
    const b = e.def.body;
    if (fx && (fx.flash || fx.red) && 'filter' in ctx) ctx.filter = fx.flash ? 'brightness(3)' : 'brightness(1.8) sepia(1) saturate(6) hue-rotate(-30deg)';
    if (b.t === 'worm') { worm(ctx, e, b, t, cam); ctx.filter = 'none'; return; }
    const ox = Math.round(e.x + e.w / 2 - cam.x), oy = Math.round(e.y + e.h - cam.y);
    ctx.save();
    ctx.translate(ox, oy);
    if (e.facing < 0) ctx.scale(-1, 1);
    if (e.bodyScale && e.bodyScale !== 1) ctx.scale(e.bodyScale, e.bodyScale);
    if (e.alpha != null) ctx.globalAlpha = e.alpha;
    switch (b.t) {
      case 'humanoid': humanoid(ctx, e, b, t); break;
      case 'beast': beast(ctx, e, b, t); break;
      case 'crawler': crawler(ctx, e, b, t); break;
      case 'flyer': flyer(ctx, e, b, t); break;
      case 'golem': golem(ctx, e, b, t); break;
      case 'tree': tree(ctx, e, b, t); break;
      default: R(ctx, -e.w / 2, -e.h, e.w, e.h, b.c);
    }
    ctx.restore();
    if ('filter' in ctx) ctx.filter = 'none';
    ctx.globalAlpha = 1;
  }

  // 플레이어 스프라이트 (고딕 영웅)
  function playerSprite(ctx, p, cam, t) {
    if (!HC.Assets.ready || !HC.SPRITE_META.hero) return false;
    let an = 'idle', fr = 0;
    const x = p.x + p.w / 2 - cam.x, y = p.y + p.h - cam.y;
    if (p.state === 'climb') {
      an = 'climb'; fr = 3 + (Math.floor(p.y / 10) % 3);
    } else if (p.atkAnim && p.atk) {
      const k = Math.min(0.999, p.atkAnim.t / p.atkAnim.dur);
      if (p.atkAnim.air) { an = 'jumpAttack'; fr = 2 + Math.floor(k * 4); } else { an = 'attack'; fr = Math.floor(k * 6); }
    } else if (p.atkAnim) { an = 'attack'; fr = 3 + (Math.floor(t * 20) % 3); }
    else if (p.state === 'hurt') { an = 'hurt'; fr = Math.floor(t * 10) % 3; }
    else if (p.state === 'dash') { an = 'run'; fr = 5; }
    else if (p.drinking > 0) { an = 'crouch'; fr = 1; }
    else if (!p.onGround) { an = 'jump'; fr = p.vy < -250 ? 0 : p.vy < -60 ? 1 : p.vy < 120 ? 2 : p.vy < 400 ? 3 : 4; }
    else if (p.anim === 'walk') { an = 'run'; fr = HC.Spr.frameAt('hero', 'run', t); }
    else { an = 'idle'; fr = HC.Spr.frameAt('hero', 'idle', t); }
    const o = { scale: p.giant ? 1.35 : 1, tint: p.giant ? 'bronze' : null, flash: p.flash > 0 ? 0.7 : 0 };
    if (p.iframe > 0 && p.state !== 'dash' && Math.floor(t * 20) % 2 === 0) o.alpha = 0.45;
    if (p.state === 'dash') o.alpha = 0.65;
    return HC.Spr.draw(ctx, 'hero', an, fr, x, y, p.facing, o);
  }

  return { body, player, playerSprite, weapon, R, eyeGlow };
})();
