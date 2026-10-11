'use strict';
// 타일 충돌. 고체 타일은 사방에서 막고, 발판(PLAT)은 위에서 떨어질 때만 막는다.
HC.Phys = (function () {
  const TS = HC.TS, T = HC.T, M = HC.Map;

  function solid(z, tx, ty) { const t = M.get(z, tx, ty); return t === T.SOLID || t === T.SPIKE; }

  /**
   * e: {x,y,w,h,vx,vy} 좌상단 기준. opts.drop: 발판 통과 중.
   * 결과로 e.onGround, e.hitWall(-1/0/1), e.hitCeil, e.groundTile 설정
   */
  function move(z, e, dt) {
    e.hitWall = 0; e.hitCeil = false;
    const wasGround = e.onGround;
    e.onGround = false;
    // 가로
    let nx = e.x + e.vx * dt;
    if (e.vx !== 0) {
      const top = Math.floor((e.y + 1) / TS), bot = Math.floor((e.y + e.h - 1) / TS);
      if (e.vx > 0) {
        const tx = Math.floor((nx + e.w) / TS);
        for (let ty = top; ty <= bot; ty++) if (solid(z, tx, ty)) {
          // 한 칸 이하 턱은 자동으로 오른다 (지상에서만)
          if (wasGround && ty === bot && e.stepUp && !solid(z, tx, ty - 1) && !solid(z, tx, top - 1) && canFit(z, nx, e.y - TS, e)) { e.y = ty * TS - e.h; continue; }
          nx = tx * TS - e.w - 0.01; e.vx = 0; e.hitWall = 1; break;
        }
      } else {
        const tx = Math.floor(nx / TS);
        for (let ty = top; ty <= bot; ty++) if (solid(z, tx, ty)) {
          if (wasGround && ty === bot && e.stepUp && !solid(z, tx, ty - 1) && !solid(z, tx, top - 1) && canFit(z, nx, e.y - TS, e)) { e.y = ty * TS - e.h; continue; }
          nx = (tx + 1) * TS + 0.01; e.vx = 0; e.hitWall = -1; break;
        }
      }
    }
    e.x = nx;
    // 세로
    const prevBottom = e.y + e.h;
    let ny = e.y + e.vy * dt;
    const l = Math.floor((e.x + 1) / TS), r = Math.floor((e.x + e.w - 1) / TS);
    if (e.vy >= 0) {
      const newBottom = ny + e.h;
      const rowFrom = Math.floor((prevBottom - 0.5) / TS), rowTo = Math.floor(newBottom / TS);
      let landed = false;
      for (let ty = Math.max(rowFrom, 0); ty <= rowTo && !landed; ty++) {
        for (let tx = l; tx <= r; tx++) {
          const t = M.get(z, tx, ty);
          if (t === T.SOLID || t === T.SPIKE) {
            if (ty * TS >= prevBottom - 0.5 || ty === rowTo) { ny = ty * TS - e.h; landed = true; e.groundTile = t; break; }
          } else if (t === T.PLAT && !e.dropping && ty * TS >= prevBottom - 0.5) {
            ny = ty * TS - e.h; landed = true; e.groundTile = t; e.groundRow = ty; break;
          }
        }
      }
      if (landed) { e.vy = 0; e.onGround = true; }
    } else {
      const rowTo = Math.floor(ny / TS);
      for (let tx = l; tx <= r; tx++) if (solid(z, tx, rowTo)) {
        ny = (rowTo + 1) * TS + 0.01; e.vy = 0; e.hitCeil = true; break;
      }
    }
    e.y = ny;
    // 맵 밖으로 떨어짐 방지
    if (e.y > z.h * TS) { e.y = z.h * TS - e.h - TS; e.vy = 0; }
  }

  function canFit(z, x, y, e) {
    const l = Math.floor(x / TS), r = Math.floor((x + e.w - 1) / TS);
    const t = Math.floor(y / TS), b = Math.floor((y + e.h - 1) / TS);
    for (let ty = t; ty <= b; ty++) for (let tx = l; tx <= r; tx++) if (solid(z, tx, ty)) return false;
    return true;
  }

  // 발밑에 바로 지지 타일이 있는지 (가장자리 판단용)
  function supportAt(z, px, footY) {
    const tx = Math.floor(px / TS), ty = Math.floor((footY + 2) / TS);
    const t = M.get(z, tx, ty);
    return t === T.SOLID || t === T.PLAT || t === T.SPIKE;
  }

  function lineOfSight(z, x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(d / 8);
    for (let i = 1; i < n; i++) {
      const x = x0 + (x1 - x0) * (i / n), y = y0 + (y1 - y0) * (i / n);
      if (solid(z, Math.floor(x / TS), Math.floor(y / TS))) return false;
    }
    return true;
  }

  function pointSolid(z, x, y) { return solid(z, Math.floor(x / TS), Math.floor(y / TS)); }

  return { move, canFit, supportAt, lineOfSight, pointSolid, solid };
})();
