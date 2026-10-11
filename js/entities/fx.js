'use strict';
// 파티클과 떠오르는 숫자.
HC.FX = (function () {
  const U = HC.U;
  const parts = [];
  const texts = [];
  const rings = [];
  const MAX = 900;

  function p(o) {
    if (parts.length >= MAX) parts.shift();
    o.life = o.max = o.life || 0.6;
    o.vx = o.vx || 0; o.vy = o.vy || 0; o.g = o.g == null ? 0 : o.g; o.drag = o.drag == null ? 0 : o.drag;
    o.s = o.s || 2;
    parts.push(o);
    return o;
  }
  function burst(x, y, n, col, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      const a = o.angle != null ? o.angle + U.rand(-(o.spread || 0.6), o.spread || 0.6) : Math.random() * Math.PI * 2;
      const sp = U.rand(o.min || 40, o.max || 160);
      p({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: U.rand(o.lmin || 0.25, o.lmax || 0.6), s: o.s || U.randi(1, 3), col: Array.isArray(col) ? U.pick(col) : col, g: o.g == null ? 300 : o.g, drag: o.drag || 2, glow: o.glow });
    }
  }
  function blood(x, y, dir, n) { burst(x, y, n || 8, ['#7a0a10', '#a01018', '#5a0608'], { angle: dir > 0 ? 0 : Math.PI, spread: 0.9, min: 60, max: 220, g: 500 }); }
  function sparks(x, y, col, n) { burst(x, y, n || 6, col || ['#ffe0a0', '#ffffff'], { min: 80, max: 260, g: 200, lmax: 0.3, s: 1, glow: true }); }
  function dust(x, y, n) { burst(x, y, n || 6, ['#5a5550', '#3a3632'], { angle: -Math.PI / 2, spread: 1.4, min: 10, max: 60, g: -10, lmax: 0.7, s: 2 }); }
  function ash(x, y, w, h, n) {
    for (let i = 0; i < (n || 24); i++) p({ x: x + Math.random() * w, y: y + Math.random() * h, vx: U.rand(-20, 20), vy: U.rand(-60, -10), life: U.rand(0.6, 1.4), s: U.randi(1, 3), col: U.pick(['#4a4642', '#2a2826', '#6a6460']), g: -20, drag: 1 });
  }
  function soulWisp(x, y, col) { p({ x: x + U.rand(-4, 4), y, vx: U.rand(-8, 8), vy: U.rand(-40, -15), life: U.rand(0.5, 1.0), s: U.randi(1, 2), col, g: -20, glow: true }); }
  function ring(x, y, r, col, life, w) { rings.push({ x, y, r0: 2, r, col, life: life || 0.35, max: life || 0.35, w: w || 2 }); }

  function text(x, y, txt, col, size, o) {
    o = o || {};
    texts.push({ x: x + U.rand(-4, 4), y, txt: String(txt), col: col || '#fff', size: size || 12, life: o.life || 0.9, max: o.life || 0.9, vy: o.vy || -38, bold: o.bold });
    if (texts.length > 80) texts.shift();
  }

  function update(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.life -= dt;
      if (q.life <= 0) { parts.splice(i, 1); continue; }
      q.vy += q.g * dt;
      if (q.drag) { q.vx *= 1 - Math.min(1, q.drag * dt); q.vy *= 1 - Math.min(1, q.drag * dt * 0.5); }
      q.x += q.vx * dt; q.y += q.vy * dt;
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.life -= dt;
      if (t.life <= 0) { texts.splice(i, 1); continue; }
      t.y += t.vy * dt; t.vy *= 1 - Math.min(1, dt * 2.5);
    }
    for (let i = rings.length - 1; i >= 0; i--) { rings[i].life -= dt; if (rings[i].life <= 0) rings.splice(i, 1); }
  }

  function draw(ctx, cam) {
    for (const q of parts) {
      const a = Math.max(0, q.life / q.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = q.col;
      const x = Math.round(q.x - cam.x), y = Math.round(q.y - cam.y);
      if (q.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.fillRect(x - 1, y - 1, q.s + 2, q.s + 2); ctx.globalCompositeOperation = 'source-over'; }
      ctx.fillRect(x, y, q.s, q.s);
    }
    ctx.globalAlpha = 1;
    for (const r of rings) {
      const t = 1 - r.life / r.max;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = r.col; ctx.lineWidth = r.w;
      ctx.beginPath(); ctx.arc(r.x - cam.x, r.y - cam.y, U.lerp(r.r0, r.r, U.easeOut(t)), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // 오버레이(고해상도) 텍스트
  function drawTexts(octx, cam, scale) {
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    for (const t of texts) {
      const a = Math.min(1, t.life / t.max * 2);
      const pop = t.life > t.max - 0.12 ? 1 + (t.life - (t.max - 0.12)) * 3 : 1;
      const fs = Math.round(t.size * scale * 0.5 * pop);
      octx.font = (t.bold ? '800 ' : '700 ') + fs + 'px "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
      const x = (t.x - cam.x) * scale, y = (t.y - cam.y) * scale;
      octx.globalAlpha = a;
      octx.lineWidth = Math.max(2, fs / 5);
      octx.strokeStyle = 'rgba(0,0,0,0.85)';
      octx.strokeText(t.txt, x, y);
      octx.fillStyle = t.col;
      octx.fillText(t.txt, x, y);
    }
    octx.globalAlpha = 1;
  }

  function clear() { parts.length = 0; texts.length = 0; rings.length = 0; }

  return { p, burst, blood, sparks, dust, ash, soulWisp, ring, text, update, draw, drawTexts, clear, parts };
})();
