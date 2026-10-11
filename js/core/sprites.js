'use strict';
// 이미지 로더와 스프라이트 그리기. 색조/섬광은 합성(source-atop)으로 만들어 file:// 에서도 동작한다.
HC.Assets = (function () {
  const images = {};
  let total = 0, done = 0, ready = false;

  function urls() {
    const out = new Set();
    for (const k in HC.SPRITE_META) for (const a in HC.SPRITE_META[k]) out.add(HC.SPRITE_META[k][a].src);
    for (const f of HC.ASSET_FILES || []) out.add(f);
    return Array.from(out);
  }

  function load(onProgress, onDone) {
    const list = urls();
    total = list.length;
    if (!total) { ready = true; onDone && onDone(); return; }
    for (const src of list) {
      const im = new Image();
      im.onload = im.onerror = function (ev) {
        done++;
        if (ev.type === 'error') { delete images[src]; console.warn('이미지를 못 불렀다:', src); }
        onProgress && onProgress(done / total);
        if (done === total) { ready = true; onDone && onDone(); }
      };
      images[src] = im;
      im.src = src;
    }
  }

  function get(src) {
    const im = images[src];
    return im && im.complete && im.naturalWidth ? im : null;
  }

  return { load, get, get ready() { return ready; }, get progress() { return total ? done / total : 1; } };
})();

HC.Spr = (function () {
  const cache = {};

  function meta(key, anim) {
    const k = HC.SPRITE_META[key];
    return k ? k[anim] || null : null;
  }

  // 색조 입힌 스트립 (캐시)
  function variant(m, kind, tint) {
    const id = m.src + '|' + kind + '|' + (tint || '');
    if (cache[id]) return cache[id];
    const im = HC.Assets.get(m.src);
    if (!im) return null;
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    if (kind === 'tint') {
      const T = HC.TINTS[tint];
      if (T) { g.globalAlpha = T.amt * 0.85; g.fillStyle = T.color; g.fillRect(0, 0, c.width, c.height); }
    } else if (kind === 'white') { g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); }
    else if (kind === 'red') { g.fillStyle = '#ff2a1a'; g.fillRect(0, 0, c.width, c.height); }
    cache[id] = c;
    return c;
  }

  /**
   * 발 위치 (x, y)에 그린다.
   * o: { scale, tint, flash(0~1 흰색), red(0~1), alpha }
   */
  function draw(ctx, key, anim, frame, x, y, facing, o) {
    const m = meta(key, anim);
    if (!m) return false;
    o = o || {};
    const base = o.tint ? variant(m, 'tint', o.tint) : HC.Assets.get(m.src);
    if (!base) return false;
    const s = o.scale || 1;
    const f = ((frame % m.n) + m.n) % m.n;
    const flip = (facing || 1) !== (HC.FACE[key] || 1);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (flip) ctx.scale(-1, 1);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const dx = -m.ax * s, dy = -m.ay * s, dw = m.fw * s, dh = m.fh * s;
    ctx.drawImage(base, f * m.fw, 0, m.fw, m.fh, dx, dy, dw, dh);
    if (o.flash > 0) { const w = variant(m, 'white'); if (w) { ctx.globalAlpha = Math.min(1, o.flash); ctx.drawImage(w, f * m.fw, 0, m.fw, m.fh, dx, dy, dw, dh); } }
    if (o.red > 0) { const r = variant(m, 'red'); if (r) { ctx.globalAlpha = Math.min(1, o.red); ctx.drawImage(r, f * m.fw, 0, m.fw, m.fh, dx, dy, dw, dh); } }
    ctx.restore();
    return true;
  }

  function frameAt(key, anim, t, f0, f1) {
    const m = meta(key, anim);
    if (!m) return 0;
    const a = f0 == null ? 0 : f0, b = f1 == null ? m.n - 1 : Math.min(f1, m.n - 1);
    return a + Math.floor(t * m.fps) % (b - a + 1);
  }

  // 이미지 일부를 잘라 그리기 (소품)
  function part(ctx, src, rect, x, y, o) {
    const im = HC.Assets.get(src);
    if (!im) return false;
    o = o || {};
    const s = o.scale || 1;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.flip) { ctx.translate(Math.round(x + rect[2] * s / 2), Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(im, rect[0], rect[1], rect[2], rect[3], -rect[2] * s / 2, -rect[3] * s, rect[2] * s, rect[3] * s); }
    else ctx.drawImage(im, rect[0], rect[1], rect[2], rect[3], Math.round(x - rect[2] * s / 2), Math.round(y - rect[3] * s), rect[2] * s, rect[3] * s);
    ctx.restore();
    return true;
  }

  return { meta, draw, frameAt, variant, part };
})();
