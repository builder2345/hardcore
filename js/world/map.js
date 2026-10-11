'use strict';
// 타일 맵과 절차적 구역 생성기.
// 좌우 이동 + 발판 + 밧줄(사다리)로 위아래를 오가는 메이플식 횡스크롤 구조.
HC.TS = 16;
HC.T = { EMPTY: 0, SOLID: 1, PLAT: 2, SPIKE: 3 };

HC.Map = (function () {
  const T = HC.T, TS = HC.TS, U = HC.U;

  function create(w, h) {
    return { w, h, tiles: new Uint8Array(w * h), ropes: [], portals: [], spawns: [], decor: [], objects: [], segs: [] };
  }
  function get(z, tx, ty) {
    if (tx < 0 || tx >= z.w) return T.SOLID;
    if (ty < 0) return T.EMPTY;
    if (ty >= z.h) return T.SOLID;
    return z.tiles[ty * z.w + tx];
  }
  function set(z, tx, ty, v) {
    if (tx < 0 || tx >= z.w || ty < 0 || ty >= z.h) return;
    z.tiles[ty * z.w + tx] = v;
  }
  function isSolid(z, tx, ty) { const t = get(z, tx, ty); return t === T.SOLID || t === T.SPIKE; }
  function isPlat(z, tx, ty) { return get(z, tx, ty) === T.PLAT; }
  // 서 있을 수 있는 표면인가 (위가 비어 있고 자신이 단단하거나 발판)
  function isStandable(z, tx, ty) {
    const t = get(z, tx, ty);
    return (t === T.SOLID || t === T.PLAT) && !isSolid(z, tx, ty - 1) && !isSolid(z, tx, ty - 2);
  }

  function ropeAt(z, px, py) {
    for (const r of z.ropes) {
      const rx = r.x * TS + TS / 2;
      if (Math.abs(px - rx) <= 7 && py >= r.y0 * TS - 4 && py <= (r.y1 + 1) * TS) return r;
    }
    return null;
  }

  // 지면 아래로 스캔해 처음 만나는 표면 행
  function surfaceBelow(z, tx, ty) {
    for (let y = Math.max(0, ty); y < z.h; y++) {
      const t = get(z, tx, y);
      if (t === T.SOLID || t === T.PLAT || t === T.SPIKE) return y;
    }
    return z.h;
  }

  /**
   * 구역 생성.
   * o: { seed, w, h, ceiling, platDensity, ropeChance, pits, spikes, flatCenter, maxTiers, hills }
   */
  function generate(o) {
    const rng = U.RNG(o.seed);
    const W = o.w, H = o.h;
    const z = create(W, H);
    const base = H - 5;
    const ground = new Array(W);
    let h = base;
    let x = 0;
    const hills = o.hills == null ? 2 : o.hills;
    while (x < W) {
      const len = rng.int(6, 15);
      for (let i = 0; i < len && x < W; i++) ground[x++] = h;
      if (x > 8 && x < W - 10) h = U.clamp(h + rng.int(-hills, hills), base - 4, base + 1);
    }
    // 가장자리와 중앙은 평탄하게 (포탈·모닥불 자리)
    for (let i = 0; i < 9; i++) { ground[i] = ground[9]; ground[W - 1 - i] = ground[W - 10]; }
    if (o.flatCenter) {
      const c = Math.floor(W / 2), r = o.flatCenter;
      const hh = ground[c];
      for (let i = c - r; i <= c + r; i++) ground[i] = hh;
    }
    // 구덩이 (가시)
    const pitCols = new Set();
    if (o.pits) {
      const n = rng.int(o.pits[0], o.pits[1]);
      for (let k = 0; k < n; k++) {
        const pw = rng.int(3, 4);
        const px = rng.int(16, W - 20);
        let ok = true;
        if (o.flatCenter && Math.abs(px - W / 2) < o.flatCenter + 6) ok = false;
        for (let i = px - 2; i < px + pw + 2; i++) if (pitCols.has(i)) ok = false;
        // 양옆 지면 높이가 비슷한 곳에만 판다 (한쪽이 절벽이면 빠져나올 수 없다)
        for (let i = px - 3; i < px + pw + 3; i++) if (Math.abs(ground[i] - ground[px - 1]) > 1) ok = false;
        if (!ok) continue;
        const lvl = Math.max(ground[px - 1], ground[px + pw]) + 3;
        for (let i = px; i < px + pw; i++) { ground[i] = Math.min(H - 2, lvl); pitCols.add(i); }
      }
    }
    for (let cx = 0; cx < W; cx++) {
      for (let y = ground[cx]; y < H; y++) set(z, cx, y, T.SOLID);
      if (pitCols.has(cx) && o.spikes) set(z, cx, ground[cx], T.SPIKE);
    }
    // 천장 (동굴형)
    const ceil = new Array(W).fill(-1);
    if (o.ceiling) {
      let c = rng.int(1, 2);
      for (let cx = 0; cx < W; cx++) {
        if (rng() < 0.18) c = U.clamp(c + rng.int(-1, 1), 0, 3);
        ceil[cx] = c;
        let extra = 0;
        if (rng() < 0.06) extra = rng.int(1, 3); // 종유석
        for (let y = 0; y <= c + extra; y++) set(z, cx, y, T.SOLID);
        ceil[cx] = c + extra;
      }
    }
    // 좌우 벽
    for (let y = 0; y < H; y++) { set(z, 0, y, T.SOLID); set(z, W - 1, y, T.SOLID); }
    z.ground = ground;

    // 발판 층(tier) 쌓기: 각 열의 최상단 표면을 기억하고, 그보다 4~5칸 위에 발판을 놓는다.
    const surf = ground.slice();
    const minRow = o.ceiling ? 5 : 3;
    const maxTiers = o.maxTiers || 99;
    const dens = o.platDensity == null ? 0.62 : o.platDensity;
    const ropeCh = o.ropeChance == null ? 0.35 : o.ropeChance;
    let segId = 0;
    for (let t = 0; t < maxTiers; t++) {
      let placed = 0;
      let px = rng.int(2, 6);
      while (px < W - 5) {
        const len = rng.int(o.vertical ? 4 : 5, o.vertical ? 10 : 14);
        if (rng() < dens) {
          const xs = px, xe = Math.min(W - 3, px + len);
          let m = 999;
          for (let i = xs; i <= xe; i++) m = Math.min(m, surf[i]);
          const gap = rng.int(4, 5);
          const y = m - gap;
          let ok = y >= minRow;
          if (ok && o.ceiling) for (let i = xs; i <= xe; i++) if (y - 3 <= ceil[i]) { ok = false; break; }
          if (ok) {
            for (let i = xs; i <= xe; i++) set(z, i, y, T.PLAT);
            const seg = { id: segId++, x0: xs, x1: xe, y, tier: t };
            z.segs.push(seg);
            if (rng() < ropeCh || (t > 0 && o.vertical && rng() < 0.5)) {
              const rx = rng.int(xs + 1, Math.max(xs + 1, xe - 1));
              const bottom = surf[rx] - 1;
              if (bottom > y) z.ropes.push({ x: rx, y0: y, y1: bottom });
            }
            for (let i = xs; i <= xe; i++) surf[i] = y;
            placed++;
          }
        }
        px += len + rng.int(o.vertical ? 1 : 2, o.vertical ? 5 : 7);
      }
      if (!placed) break;
    }
    // 고립된 높은 발판으로 가는 보조 밧줄: 바로 아래 표면이 6칸 이상 떨어진 발판에 밧줄 추가
    for (const s of z.segs) {
      let near = false;
      for (let i = s.x0; i <= s.x1 && !near; i++) {
        const b = surfaceBelow(z, i, s.y + 1);
        if (b - s.y <= 6) near = true;
      }
      if (!near) {
        const rx = Math.floor((s.x0 + s.x1) / 2);
        z.ropes.push({ x: rx, y0: s.y, y1: surfaceBelow(z, rx, s.y + 1) - 1 });
      }
    }
    z.surf = surf;
    collectSpawns(z);
    return z;
  }

  function collectSpawns(z) {
    z.spawns = [];
    for (let x = 2; x < z.w - 2; x++) {
      for (let y = 1; y < z.h; y++) {
        const t = get(z, x, y);
        if ((t === T.SOLID || t === T.PLAT) && isStandable(z, x, y) && get(z, x, y) !== T.SPIKE) {
          z.spawns.push({ x: x * TS + TS / 2, y: y * TS, tx: x, ty: y, plat: t === T.PLAT });
        }
      }
    }
  }

  // 수작업 평지 맵 (도시, 아레나)
  function flat(o) {
    const z = create(o.w, o.h);
    const g = o.h - (o.groundDepth || 4);
    for (let x = 0; x < o.w; x++) for (let y = g; y < o.h; y++) set(z, x, y, T.SOLID);
    for (let y = 0; y < o.h; y++) { set(z, 0, y, T.SOLID); set(z, o.w - 1, y, T.SOLID); }
    if (o.ceiling) for (let x = 0; x < o.w; x++) for (let y = 0; y < 2; y++) set(z, x, y, T.SOLID);
    z.ground = new Array(o.w).fill(g);
    if (o.plats) for (const p of o.plats) {
      for (let i = p[0]; i <= p[1]; i++) set(z, i, p[2], T.PLAT);
      z.segs.push({ id: z.segs.length, x0: p[0], x1: p[1], y: p[2], tier: 0 });
      if (p[3]) z.ropes.push({ x: p[3], y0: p[2], y1: g - 1 });
    }
    collectSpawns(z);
    return z;
  }

  // 표면 위 특정 열의 서 있을 위치(px)
  // 천장(위에서부터 이어진 고체)은 건너뛰고, 위가 비어 있는 첫 지면을 찾는다
  function groundPos(z, tx) {
    for (let y = 1; y < z.h; y++) {
      const t = get(z, tx, y);
      if ((t === T.SOLID || t === T.SPIKE) && !isSolid(z, tx, y - 1)) return { x: tx * TS + TS / 2, y: y * TS };
    }
    return { x: tx * TS + TS / 2, y: (z.h - 1) * TS };
  }
  function highestSeg(z, nearX) {
    let best = null;
    for (const s of z.segs) {
      if (!best || s.y < best.y || (s.y === best.y && nearX != null && Math.abs((s.x0 + s.x1) / 2 - nearX) < Math.abs((best.x0 + best.x1) / 2 - nearX))) best = s;
    }
    return best;
  }

  return { create, get, set, isSolid, isPlat, isStandable, ropeAt, surfaceBelow, generate, flat, groundPos, highestSeg, collectSpawns };
})();
