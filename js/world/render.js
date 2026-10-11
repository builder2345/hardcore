'use strict';
// 지형/배경 사전 렌더링, 카메라, 조명.
HC.VW = 640; HC.VH = 360;

HC.Render = (function () {
  const TS = HC.TS, T = HC.T, U = HC.U, M = HC.Map;

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // ── 지형 ──────────────────────────────────────────
  // 타일셋 그림으로 지형을 그린다. 실패하면 false
  function buildTilesArt(z, th, c) {
    const key = HC.THEME_TILES && HC.THEME_TILES[th.bg];
    const ts = key && HC.TILESETS[key];
    const img = ts && HC.Assets.get(ts.img);
    if (!img) return false;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const solidAt = (x, y) => { const t = M.get(z, x, y); return t === T.SOLID || t === T.SPIKE; };
    const pick = (list, x, y) => list[(U.hash(x + ':' + y + ':' + (z.seed || 1)) >>> 3) % list.length];
    const cell = (cc, px, py, sh) => g.drawImage(img, cc[0] * TS, cc[1] * TS, TS, sh || TS, px, py, TS, sh || TS);
    for (let ty = 0; ty < z.h; ty++) {
      for (let tx = 0; tx < z.w; tx++) {
        const t = z.tiles[ty * z.w + tx];
        const px = tx * TS, py = ty * TS;
        if (t === T.SOLID || t === T.SPIKE) {
          const up = !solidAt(tx, ty - 1), lf = !solidAt(tx - 1, ty), rt = !solidAt(tx + 1, ty), dn = !solidAt(tx, ty + 1) && ty + 1 < z.h;
          const under = !up && !solidAt(tx, ty - 2) && ts.under;
          let cc;
          if (up) cc = lf && ts.tl ? pick(ts.tl, tx, ty) : rt && ts.tr ? pick(ts.tr, tx, ty) : pick(ts.top, tx, ty);
          else if (dn && ts.bottom) cc = pick(ts.bottom, tx, ty);
          else if (under) cc = pick(ts.under, tx, ty);
          else if (lf && ts.left) cc = pick(ts.left, tx, ty);
          else if (rt && ts.right) cc = pick(ts.right, tx, ty);
          else {
            let deep = solidAt(tx, ty - 3) && solidAt(tx - 1, ty) && solidAt(tx + 1, ty);
            cc = deep && ts.deep ? pick(ts.deep, tx, ty) : pick(ts.fill, tx, ty);
          }
          cell(cc, px, py);
          if (dn && !ts.bottom) { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(px, py + TS - 3, TS, 3); }
          if (up && ts.deco && (U.hash(tx + '/' + ty) % 3 === 0)) cell(pick(ts.deco, tx, ty), px, py - TS);
          if (t === T.SPIKE) {
            if (ts.spikeUp) cell(pick(ts.spikeUp, tx, ty), px, py - TS);
            else {
              g.fillStyle = '#c8c0b0';
              for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(px + i * 4, py); g.lineTo(px + i * 4 + 2, py - 7); g.lineTo(px + i * 4 + 4, py); g.fill(); }
              g.fillStyle = '#6a2020'; g.fillRect(px, py - 1, TS, 1);
            }
          }
        } else if (t === T.PLAT) {
          const cc = pick(ts.top, tx, ty);
          g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(px, py + 7, TS, 3);
          cell(cc, px, py, 8);
          const left = M.get(z, tx - 1, ty) !== T.PLAT, right = M.get(z, tx + 1, ty) !== T.PLAT;
          g.fillStyle = 'rgba(0,0,0,0.55)';
          if (left) g.fillRect(px, py, 1, 8);
          if (right) g.fillRect(px + TS - 1, py, 1, 8);
        }
      }
    }
    drawRopes(g, z, th);
    return true;
  }

  function drawRopes(g, z, th) {
    for (const r of z.ropes) {
      const x = r.x * TS + TS / 2;
      g.fillStyle = U.shade(th.rope, -0.4); g.fillRect(x - 1, r.y0 * TS - 2, 3, (r.y1 - r.y0 + 1) * TS + 2);
      g.fillStyle = th.rope; g.fillRect(x - 1, r.y0 * TS - 2, 2, (r.y1 - r.y0 + 1) * TS + 2);
      g.fillStyle = U.shade(th.rope, 0.25);
      for (let y = r.y0 * TS; y < (r.y1 + 1) * TS; y += 7) g.fillRect(x - 1, y, 2, 1);
      g.fillStyle = '#3a3530'; g.fillRect(x - 3, r.y0 * TS - 3, 7, 3);
    }
  }

  function buildTiles(z, th) {
    const c = mk(z.w * TS, z.h * TS);
    if (buildTilesArt(z, th, c)) return c;
    const g = c.getContext('2d');
    const rng = U.RNG((z.seed || 7) ^ 0x51ed);
    const solidAt = (x, y) => { const t = M.get(z, x, y); return t === T.SOLID || t === T.SPIKE; };
    for (let ty = 0; ty < z.h; ty++) {
      for (let tx = 0; tx < z.w; tx++) {
        const t = z.tiles[ty * z.w + tx];
        const px = tx * TS, py = ty * TS;
        if (t === T.SOLID || t === T.SPIKE) {
          let depth = 0;
          for (let k = 1; k <= 4; k++) if (solidAt(tx, ty - k) && solidAt(tx, ty + k) || (solidAt(tx, ty - k) && ty + k >= z.h)) depth++; else break;
          const exposedTop = !solidAt(tx, ty - 1);
          const exposedL = !solidAt(tx - 1, ty), exposedR = !solidAt(tx + 1, ty), exposedB = !solidAt(tx, ty + 1) && ty + 1 < z.h;
          g.fillStyle = depth >= 3 && !exposedL && !exposedR ? th.rockDark : th.rock;
          g.fillRect(px, py, TS, TS);
          // 질감
          for (let i = 0; i < 3; i++) {
            g.fillStyle = rng() < 0.5 ? U.shade(th.rock, -0.35) : U.shade(th.rock, 0.12);
            g.fillRect(px + rng.int(0, 14), py + rng.int(0, 14), rng.int(1, 3), 1);
          }
          if (exposedL) { g.fillStyle = U.shade(th.rock, -0.45); g.fillRect(px, py, 2, TS); }
          if (exposedR) { g.fillStyle = U.shade(th.rock, -0.45); g.fillRect(px + TS - 2, py, 2, TS); }
          if (exposedB) { g.fillStyle = U.shade(th.rock, -0.5); g.fillRect(px, py + TS - 3, TS, 3);
            if (rng() < 0.25) { g.fillStyle = th.rock; const sx = px + rng.int(3, 11); g.beginPath(); g.moveTo(sx - 3, py + TS); g.lineTo(sx + 3, py + TS); g.lineTo(sx, py + TS + rng.int(4, 9)); g.fill(); }
          }
          if (exposedTop) {
            g.fillStyle = th.lip; g.fillRect(px, py, TS, 4);
            g.fillStyle = th.lipHi; g.fillRect(px, py, TS, 1);
            // 풀/이끼/결정 조각
            for (let i = 0; i < 3; i++) if (rng() < 0.5) {
              g.fillStyle = rng() < 0.3 ? th.lipHi : th.lip;
              g.fillRect(px + rng.int(0, 14), py - rng.int(1, 3), 1, rng.int(1, 3));
            }
            if (t === T.SPIKE) {
              g.fillStyle = '#b8b0a0';
              for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(px + i * 4, py); g.lineTo(px + i * 4 + 2, py - 7); g.lineTo(px + i * 4 + 4, py); g.fill(); }
              g.fillStyle = '#6a2020'; g.fillRect(px, py - 1, TS, 1);
            }
          }
        } else if (t === T.PLAT) {
          g.fillStyle = U.shade(th.plat, -0.4); g.fillRect(px, py + 5, TS, 2);
          g.fillStyle = th.plat; g.fillRect(px, py, TS, 5);
          g.fillStyle = th.platHi; g.fillRect(px, py, TS, 1);
          if (rng() < 0.3) { g.fillStyle = U.shade(th.plat, -0.3); g.fillRect(px + rng.int(2, 12), py + 2, 2, 1); }
          const left = M.get(z, tx - 1, ty) !== T.PLAT, right = M.get(z, tx + 1, ty) !== T.PLAT;
          if (left || right || tx % 3 === 0) {
            g.fillStyle = U.shade(th.plat, -0.25);
            g.fillRect(px + (left ? 1 : right ? 12 : 7), py + 5, 3, 5);
          }
        }
      }
    }
    // 밧줄
    for (const r of z.ropes) {
      const x = r.x * TS + TS / 2;
      g.fillStyle = U.shade(th.rope, -0.4); g.fillRect(x - 1, r.y0 * TS - 2, 3, (r.y1 - r.y0 + 1) * TS + 2);
      g.fillStyle = th.rope; g.fillRect(x - 1, r.y0 * TS - 2, 2, (r.y1 - r.y0 + 1) * TS + 2);
      g.fillStyle = U.shade(th.rope, 0.25);
      for (let y = r.y0 * TS; y < (r.y1 + 1) * TS; y += 7) g.fillRect(x - 1, y, 2, 1);
      g.fillStyle = '#3a3530'; g.fillRect(x - 3, r.y0 * TS - 3, 7, 3);
    }
    return c;
  }

  // ── 배경 ──────────────────────────────────────────
  function buildBackground(th, seed) {
    const B = HC.BG && HC.BG[th.bg];
    if (B && B.layers.every((L) => HC.Assets.get(L.img))) {
      const layers = B.layers.map((L) => ({ img: HC.Assets.get(L.img), f: L.f, y: L.y, top: topColor(HC.Assets.get(L.img)) }));
      return { art: true, sky: B.sky, layers };
    }
    const rng = U.RNG(seed || 1);
    const W = 1280, H = 360;
    const sky = mk(HC.VW, HC.VH);
    const sg = sky.getContext('2d');
    const grad = sg.createLinearGradient(0, 0, 0, HC.VH);
    grad.addColorStop(0, th.sky[0]); grad.addColorStop(0.6, th.sky[1]); grad.addColorStop(1, th.sky[2]);
    sg.fillStyle = grad; sg.fillRect(0, 0, HC.VW, HC.VH);
    const layers = [];
    const far = mk(W, H), mid = mk(W, H);
    const fg = far.getContext('2d'), mg = mid.getContext('2d');
    const farC = U.shade(th.sky[2], 0.06), midC = U.shade(th.sky[1], -0.2);
    switch (th.bg) {
      case 'cave':
      case 'abyss':
      case 'blood': {
        // 원경: 거대한 종유석과 석순
        fg.fillStyle = farC;
        for (let x = 0; x < W; x += rng.int(30, 70)) {
          const w = rng.int(20, 60), h = rng.int(60, 170);
          fg.beginPath(); fg.moveTo(x - w / 2, 0); fg.lineTo(x + w / 2, 0); fg.lineTo(x + rng.int(-6, 6), h); fg.fill();
          const h2 = rng.int(50, 140);
          fg.beginPath(); fg.moveTo(x - w / 2 + 15, H); fg.lineTo(x + w / 2 + 15, H); fg.lineTo(x + 15 + rng.int(-6, 6), H - h2); fg.fill();
        }
        if (th.bg === 'cave') {
          // 멀리서 빛나는 결정
          for (let i = 0; i < 26; i++) {
            const x = rng.int(0, W), y = rng.int(140, 330), s = rng.int(3, 8);
            const gl = fg.createRadialGradient(x, y, 0, x, y, s * 5);
            gl.addColorStop(0, 'rgba(98,200,255,0.18)'); gl.addColorStop(1, 'rgba(98,200,255,0)');
            fg.fillStyle = gl; fg.fillRect(x - s * 5, y - s * 5, s * 10, s * 10);
            fg.fillStyle = 'rgba(120,210,255,0.45)';
            fg.beginPath(); fg.moveTo(x, y - s * 2); fg.lineTo(x + s / 2, y); fg.lineTo(x - s / 2, y); fg.fill();
          }
        } else if (th.bg === 'abyss') {
          for (let i = 0; i < 6; i++) {
            const x = rng.int(0, W), y = rng.int(60, 260), r = rng.int(30, 90);
            fg.strokeStyle = 'rgba(160,90,220,0.10)'; fg.lineWidth = 2;
            fg.beginPath(); fg.arc(x, y, r, 0, Math.PI * 2); fg.stroke();
          }
        } else {
          // 피의 성채: 성벽과 깃발
          fg.fillStyle = U.shade(th.sky[2], 0.1);
          for (let x = 0; x < W; x += 160) {
            const h = rng.int(120, 200);
            fg.fillRect(x + 20, H - h, 60, h);
            for (let k = 0; k < 4; k++) fg.fillRect(x + 20 + k * 16, H - h - 10, 9, 10);
            fg.fillStyle = 'rgba(140,20,30,0.35)'; fg.fillRect(x + 44, H - h + 20, 12, 40); fg.fillStyle = U.shade(th.sky[2], 0.1);
          }
        }
        mg.fillStyle = midC;
        for (let x = 0; x < W; x += rng.int(50, 110)) {
          const w = rng.int(14, 34), h = rng.int(30, 90);
          mg.beginPath(); mg.moveTo(x - w / 2, 0); mg.lineTo(x + w / 2, 0); mg.lineTo(x, h); mg.fill();
        }
        break;
      }
      case 'waste': {
        // 붉은 해와 메사
        const sx = 900, sy = 120;
        const sun = fg.createRadialGradient(sx, sy, 0, sx, sy, 120);
        sun.addColorStop(0, 'rgba(255,120,60,0.35)'); sun.addColorStop(0.3, 'rgba(200,70,30,0.15)'); sun.addColorStop(1, 'rgba(120,30,10,0)');
        fg.fillStyle = sun; fg.fillRect(sx - 130, sy - 130, 260, 260);
        fg.fillStyle = 'rgba(255,140,80,0.5)'; fg.beginPath(); fg.arc(sx, sy, 22, 0, Math.PI * 2); fg.fill();
        fg.fillStyle = farC;
        let x = 0;
        while (x < W) {
          const w = rng.int(80, 200), h = rng.int(60, 140);
          fg.beginPath(); fg.moveTo(x, H); fg.lineTo(x + 15, H - h); fg.lineTo(x + w - 15, H - h); fg.lineTo(x + w, H); fg.fill();
          x += w + rng.int(10, 60);
        }
        mg.fillStyle = midC;
        for (let x2 = 0; x2 < W; x2 += rng.int(60, 140)) {
          const w = rng.int(10, 26), h = rng.int(60, 130);
          mg.beginPath(); mg.moveTo(x2 - w, H); mg.lineTo(x2 - w / 3, H - h); mg.lineTo(x2 + w / 3, H - h + 8); mg.lineTo(x2 + w, H); mg.fill();
        }
        break;
      }
      case 'forest': {
        fg.fillStyle = farC;
        for (let x = 0; x < W; x += rng.int(18, 40)) {
          const w = rng.int(4, 10);
          fg.fillRect(x, 0, w, H);
          for (let k = 0; k < 4; k++) {
            const by = rng.int(30, 250), bl = rng.int(10, 40), dir = rng() < 0.5 ? -1 : 1;
            fg.save(); fg.translate(x + w / 2, by); fg.rotate(dir * rng.range(0.4, 1.0)); fg.fillRect(0, -1, bl, 2); fg.restore();
          }
        }
        mg.fillStyle = midC;
        for (let x = 0; x < W; x += rng.int(60, 120)) {
          const w = rng.int(10, 18);
          mg.fillRect(x, 0, w, H);
          // 매달린 형체
          if (rng() < 0.4) {
            const hy = rng.int(90, 160), hx = x + w + rng.int(10, 30);
            mg.fillRect(hx, 0, 1, hy);
            mg.fillRect(hx - 3, hy, 7, 14); mg.beginPath(); mg.arc(hx, hy - 3, 4, 0, Math.PI * 2); mg.fill();
            mg.fillRect(hx - 2, hy + 14, 2, 10); mg.fillRect(hx + 1, hy + 14, 2, 10);
          }
          for (let k = 0; k < 3; k++) {
            const by = rng.int(40, 200), bl = rng.int(20, 50), dir = rng() < 0.5 ? -1 : 1;
            mg.save(); mg.translate(x + w / 2, by); mg.rotate(dir * rng.range(0.5, 1.1)); mg.fillRect(0, -2, bl, 3); mg.restore();
          }
        }
        break;
      }
      case 'spire': {
        for (let i = 0; i < 220; i++) {
          fg.fillStyle = 'rgba(220,210,255,' + rng.range(0.15, 0.7) + ')';
          fg.fillRect(rng.int(0, W), rng.int(0, H), 1, 1);
        }
        fg.fillStyle = farC;
        for (let x = 0; x < W; x += rng.int(90, 180)) {
          const w = rng.int(26, 50), h = rng.int(120, 260);
          fg.fillRect(x, 0, w, h);
          fg.beginPath(); fg.moveTo(x, h); fg.lineTo(x + w, h); fg.lineTo(x + w / 2, h + 50); fg.fill();
          fg.fillStyle = 'rgba(200,180,255,0.25)';
          for (let k = 0; k < 5; k++) fg.fillRect(x + rng.int(4, w - 6), rng.int(10, h - 10), 3, 5);
          fg.fillStyle = farC;
        }
        mg.fillStyle = midC;
        for (let i = 0; i < 18; i++) {
          const x = rng.int(0, W), y = rng.int(20, 320), s = rng.int(6, 18);
          mg.beginPath(); mg.moveTo(x - s, y); mg.lineTo(x + s, y - 2); mg.lineTo(x + s / 2, y + s); mg.lineTo(x - s / 3, y + s * 0.8); mg.fill();
        }
        break;
      }
      case 'city': {
        // 달과 구름
        fg.fillStyle = 'rgba(200,210,230,0.25)'; fg.beginPath(); fg.arc(980, 70, 26, 0, Math.PI * 2); fg.fill();
        const halo = fg.createRadialGradient(980, 70, 10, 980, 70, 110);
        halo.addColorStop(0, 'rgba(180,190,220,0.12)'); halo.addColorStop(1, 'rgba(180,190,220,0)');
        fg.fillStyle = halo; fg.fillRect(860, -40, 240, 240);
        fg.fillStyle = farC;
        for (let x = 0; x < W; x += rng.int(40, 90)) {
          const w = rng.int(30, 60), h = rng.int(90, 210);
          fg.fillRect(x, H - h, w, h);
          fg.beginPath(); fg.moveTo(x - 4, H - h); fg.lineTo(x + w / 2, H - h - rng.int(30, 70)); fg.lineTo(x + w + 4, H - h); fg.fill();
          fg.fillStyle = 'rgba(242,165,74,0.35)';
          for (let k = 0; k < 4; k++) if (rng() < 0.6) fg.fillRect(x + rng.int(4, w - 8), H - h + rng.int(10, h - 20), 3, 4);
          fg.fillStyle = farC;
        }
        mg.fillStyle = midC;
        for (let x = 0; x < W; x += rng.int(70, 130)) {
          const w = rng.int(50, 100), h = rng.int(50, 110);
          mg.fillRect(x, H - h, w, h);
          mg.beginPath(); mg.moveTo(x - 6, H - h); mg.lineTo(x + w / 2, H - h - 34); mg.lineTo(x + w + 6, H - h); mg.fill();
        }
        break;
      }
    }
    layers.push({ c: far, f: 0.15 }, { c: mid, f: 0.35 });
    return { sky, layers };
  }

  // 레이어 맨 윗줄 색 (불투명할 때만). file:// 에서 막히면 null
  const topCache = new Map();
  function topColor(im) {
    if (topCache.has(im)) return topCache.get(im);
    let col = null;
    try {
      const c = mk(im.width, 1), g = c.getContext('2d');
      g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, im.width, 1).data;
      let r = 0, gg = 0, b = 0, n = 0, op = 0;
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 200) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; } op++; }
      if (n > op * 0.9) col = 'rgb(' + Math.round(r / n) + ',' + Math.round(gg / n) + ',' + Math.round(b / n) + ')';
    } catch (e) { col = null; }
    topCache.set(im, col);
    return col;
  }

  function drawBackground(ctx, bg, cam, zoneH) {
    if (bg.art) {
      ctx.fillStyle = bg.sky; ctx.fillRect(0, 0, HC.VW, HC.VH);
      const vy = zoneH ? U.clamp(cam.y / Math.max(1, zoneH * TS - HC.VH), 0, 1) : 1;
      for (const L of bg.layers) {
        const im = L.img, w = im.width, h = im.height;
        let ox = -((cam.x * L.f) % w); if (ox > 0) ox -= w;
        if (L.y === 'tile') {
          let oy = -((cam.y * L.f) % h); if (oy > 0) oy -= h;
          for (let y = oy; y < HC.VH; y += h) for (let x = ox; x < HC.VW; x += w) ctx.drawImage(im, Math.floor(x), Math.floor(y));
        } else {
          const y = HC.VH - h + Math.round((1 - vy) * 30 * (1 + L.f * 2));
          if (L.top && y > 0) { ctx.fillStyle = L.top; ctx.fillRect(0, 0, HC.VW, y + 1); }
          for (let x = ox; x < HC.VW; x += w) ctx.drawImage(im, Math.floor(x), y);
        }
      }
      return;
    }
    ctx.drawImage(bg.sky, 0, 0);
    const vy = zoneH ? U.clamp(cam.y / Math.max(1, zoneH * TS - HC.VH), 0, 1) : 0.5;
    for (const L of bg.layers) {
      const w = L.c.width;
      let ox = -((cam.x * L.f) % w);
      if (ox > 0) ox -= w;
      const oy = (0.5 - vy) * 40 * L.f;
      for (let x = ox; x < HC.VW; x += w) ctx.drawImage(L.c, Math.floor(x), Math.floor(oy));
    }
  }

  // ── 카메라 ───────────────────────────────────────
  function Camera() {
    return { x: 0, y: 0, shakeT: 0, shakeA: 0, ox: 0, oy: 0, look: 0 };
  }
  function updateCamera(cam, z, target, dt, snap) {
    const W = z.w * TS, H = z.h * TS;
    cam.look = U.lerp(cam.look, (target.facing || 1) * 40, Math.min(1, dt * 2));
    let tx = target.x + target.w / 2 - HC.VW / 2 + cam.look;
    let ty = target.y + target.h / 2 - HC.VH / 2 - 20;
    tx = W <= HC.VW ? (W - HC.VW) / 2 : U.clamp(tx, 0, W - HC.VW);
    ty = H <= HC.VH ? (H - HC.VH) / 2 : U.clamp(ty, 0, H - HC.VH);
    if (snap) { cam.x = tx; cam.y = ty; } else {
      cam.x = U.lerp(cam.x, tx, Math.min(1, dt * 7));
      cam.y = U.lerp(cam.y, ty, Math.min(1, dt * 6));
    }
    if (cam.shakeT > 0) {
      cam.shakeT -= dt;
      const a = cam.shakeA * Math.max(0, cam.shakeT) * 4;
      cam.ox = (Math.random() * 2 - 1) * Math.min(a, cam.shakeA);
      cam.oy = (Math.random() * 2 - 1) * Math.min(a, cam.shakeA);
    } else { cam.ox = cam.oy = 0; }
  }
  function shake(cam, amp, t) { cam.shakeA = Math.max(cam.shakeA * (cam.shakeT > 0 ? 1 : 0), amp); cam.shakeT = Math.max(cam.shakeT, t || 0.25); }

  // ── 조명 ─────────────────────────────────────────
  let lightC = null, lightG = null;
  function drawLighting(ctx, cam, darkness, lights, tint) {
    if (darkness <= 0.01) return;
    if (!lightC) { lightC = mk(HC.VW, HC.VH); lightG = lightC.getContext('2d'); }
    const g = lightG;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, HC.VW, HC.VH);
    g.fillStyle = tint || 'rgba(2,3,6,1)';
    g.globalAlpha = darkness;
    g.fillRect(0, 0, HC.VW, HC.VH);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-out';
    for (const L of lights) {
      const x = L.x - cam.x, y = L.y - cam.y;
      if (x < -L.r || x > HC.VW + L.r || y < -L.r || y > HC.VH + L.r) continue;
      const gr = g.createRadialGradient(x, y, 0, x, y, L.r);
      const a = L.i == null ? 1 : L.i;
      gr.addColorStop(0, 'rgba(0,0,0,' + a + ')');
      gr.addColorStop(0.5, 'rgba(0,0,0,' + a * 0.6 + ')');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(x - L.r, y - L.r, L.r * 2, L.r * 2);
    }
    ctx.drawImage(lightC, 0, 0);
    // 색광
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      if (!L.c) continue;
      const x = L.x - cam.x, y = L.y - cam.y, r = L.r * 0.7;
      if (x < -r || x > HC.VW + r || y < -r || y > HC.VH + r) continue;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, U.colorAlpha(L.c, (L.ci || 0.18)));
      gr.addColorStop(1, U.colorAlpha(L.c, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  return { mk, buildTiles, buildBackground, drawBackground, Camera, updateCamera, shake, drawLighting };
})();
