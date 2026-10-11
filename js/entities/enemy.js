'use strict';
// 적 AI와 공격 라이브러리. 일반 몬스터부터 층의 재앙까지 같은 공격 타입을 조합해서 쓴다.
// 모든 공격은 '예고(붉은 번쩍임/표식) → 발동 → 경직' 순서. 예고는 공정하게, 피해는 무겁게.
HC.Enemy = (function () {
  const U = HC.U, TS = HC.TS;
  const GRAV = 1400;

  function hitboxSize(b) {
    switch (b.t) {
      case 'beast': return [b.w * 0.8, b.h];
      case 'crawler': return [b.w * 0.75, b.h * 0.8];
      case 'flyer': return [b.w * 0.7, b.h * 0.8];
      case 'golem': return [b.w * 0.9, b.h];
      case 'tree': return [b.w * 0.6, b.h * 0.95];
      case 'worm': return [b.h * 0.9, b.h * 0.9];
      default: return [Math.max(10, b.w * 0.8), b.h];
    }
  }

  function create(def, x, y, o) {
    o = o || {};
    const b = def.body;
    const [w, h] = hitboxSize(b);
    const scale = o.scale || 1;
    const atks = def.attacks || [];
    const e = {
      def, id: def.id, x: x - w / 2, y: y - h, w, h, vx: 0, vy: 0, facing: Math.random() < 0.5 ? -1 : 1, onGround: false,
      hp: def.hp * scale, maxHp: def.hp * scale, atk: def.atk, defense: def.def, spd: def.spd * U.rand(0.92, 1.08),
      kind: def.kind, boss: def.kind === 'lord' || def.kind === 'calamity' || def.kind === 'guardian', elite: def.kind === 'elite',
      state: 'idle', anim: 'idle', animT: Math.random() * 5, aggro: !!o.aggro, lostT: 0,
      cds: atks.map(() => U.rand(0.6, 1.8)), cur: null, phase: 0, speedMult: 1,
      poise: def.poise || 0, poiseV: 0, stagger: 0, status: {}, flash: 0, dead: false, deathT: 0,
      patrolDir: Math.random() < 0.5 ? -1 : 1, patrolT: U.rand(1, 3), jumpCd: 0, spawnT: o.spawnT == null ? 0.5 : o.spawnT,
      flying: def.ai === 'flyer' || !!def.flying, burrowed: false, hanging: def.ai === 'hanger' && !o.noHang,
      invuln: 0, summons: [], hoverT: Math.random() * 6, uid: Math.random().toString(36).slice(2),
      summoner: o.summoner || null, alpha: null, home: x,
    };
    if (def.ai === 'boss') {
      e.phaseAtks = def.phases[0].attacks.slice();
      e.cds = e.phaseAtks.map(() => U.rand(0.8, 2));
      e.aggro = true;
    }
    if (b.t === 'worm') {
      e.segs = [];
      for (let i = 0; i < (b.segs || 8); i++) e.segs.push({ x: x, y: y - h / 2 });
      e.trail = [];
    }
    if (e.hanging) { e.y = y; }
    return e;
  }

  function attacksOf(e) { return e.def.ai === 'boss' ? e.phaseAtks : e.def.attacks; }

  // ── 공격 시작 조건 ──
  function inRange(e, a, p) {
    const dx = (p.x + p.w / 2) - (e.x + e.w / 2), dy = (p.y + p.h / 2) - (e.y + e.h / 2);
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const reach = e.w / 2 + p.w / 2;
    switch (a.t) {
      case 'swipe': return adx <= reach + a.range && ady < Math.max(30, (a.h || e.h) * 0.8);
      case 'combo': return adx <= reach + a.range + 6 && ady < Math.max(30, (a.h || e.h) * 0.8);
      case 'lunge': return adx <= (a.range || 140) && adx > 30 && ady < 36;
      case 'charge': return adx <= 420 && ady < 50;
      case 'leap': return adx <= (a.range || 240) && adx > 40;
      case 'throw': case 'bolt': return adx <= (a.range || 300) && ady < 220;
      case 'burrow': return adx <= (a.range || 220) && ady < 160;
      case 'slam': return adx <= (a.radius || 50) * 0.85 && ady < 50;
      case 'cast': return adx <= (a.range || 300) && ady < 260;
      case 'swoop': return adx <= (a.range || 180) && ady < 200;
      case 'summon': { const alive = e.summons.filter((s) => !s.dead).length; return alive < (a.max || 3) && adx < 400; }
      case 'spikes': return adx <= (a.count || 5) * (a.step || 26) + 20 && ady < 60;
      case 'beam': return ady < 50 && adx < (a.len || 300);
      case 'rain': return adx < 500;
      case 'nova': return adx < 260 && ady < 200;
      case 'teleport': return adx > 70 || (a.behind && adx < 200);
      case 'roar': return adx < (a.radius || 200) * 0.9;
      default: return false;
    }
  }

  function surfaceY(z, x, fromY) {
    const tx = Math.floor(x / TS);
    const ty = HC.Map.surfaceBelow(z, tx, Math.max(0, Math.floor(fromY / TS)));
    return ty * TS;
  }

  function begin(e, a, idx, p, z) {
    const G = HC.G;
    const c = { a, idx, t: 0, phase: 'windup', wind: a.windup || 0.5, hits: 0, data: {} };
    e.cur = c;
    e.vx = 0;
    const pcx = p.x + p.w / 2;
    if (!a.behind) e.facing = pcx >= e.x + e.w / 2 ? 1 : -1;
    switch (a.t) {
      case 'leap': c.data.tx = pcx; break;
      case 'cast': {
        c.data.pts = [];
        for (let i = 0; i < (a.count || 1); i++) {
          const x = i === 0 ? pcx : pcx + U.rand(-110, 110);
          c.data.pts.push({ x, y: surfaceY(z, x, p.y) });
        }
        for (const pt of c.data.pts) HC.Combat.hazard({ kind: 'blast', x: pt.x - a.radius, y: pt.y - a.radius * 1.3, w: a.radius * 2, h: a.radius * 1.3, delay: c.wind, dur: 0.18, dmg: e.atk * a.mult, mag: a.mag, status: a.status, col: a.col || '#ff4040', owner: e, linger: a.linger });
        break;
      }
      case 'spikes': {
        const n = a.count || 5, step = a.step || 26;
        for (let i = 0; i < n; i++) {
          const x = e.x + e.w / 2 + e.facing * (e.w / 2 + 12 + i * step);
          const sy = surfaceY(z, x, e.y + e.h - 8);
          if (Math.abs(sy - (e.y + e.h)) > 80) continue;
          HC.Combat.hazard({ kind: 'spike', x: x - 9, y: sy - 36, w: 18, h: 36, delay: c.wind + i * 0.07, dur: 0.22, dmg: e.atk * a.mult, status: a.status, col: a.col || '#c0a080', owner: e, knock: 220 });
        }
        break;
      }
      case 'beam': {
        const len = a.len || 300, h = a.h || 16;
        const by = e.y + e.h * 0.45 - h / 2;
        const bx = e.facing > 0 ? e.x + e.w / 2 : e.x + e.w / 2 - len;
        c.data.beam = HC.Combat.hazard({ kind: 'beam', x: bx, y: by, w: len, h, delay: c.wind, dur: a.dur || 0.5, dmg: e.atk * a.mult, mag: a.mag, col: a.col || '#ff5050', owner: e, dir: e.facing, knock: 260 });
        break;
      }
      case 'rain': {
        const n = a.count || 10;
        for (let i = 0; i < n; i++) {
          const x = i < 2 ? pcx + U.rand(-20, 20) : pcx + U.rand(-(a.spread || 300) / 2, (a.spread || 300) / 2);
          const sy = surfaceY(z, x, Math.max(0, p.y - 120));
          HC.Combat.hazard({ kind: 'drop', x: x - 10, y: sy - 30, w: 20, h: 30, delay: c.wind + U.rand(0, 0.7), dur: 0.15, dmg: e.atk * a.mult, mag: a.mag, status: a.status, col: a.col || '#ff6060', owner: e });
        }
        break;
      }
      case 'slam': {
        const r = a.radius || 50;
        c.data.h = HC.Combat.hazard({ kind: 'slam', x: e.x + e.w / 2 - r, y: e.y + e.h - 34, w: r * 2, h: 40, delay: c.wind, dur: 0.15, dmg: e.atk * a.mult, mag: a.mag, status: a.status, col: a.col || '#ff5040', owner: e, knock: 260 });
        break;
      }
      case 'burrow': c.data.sub = 'dig'; c.data.t2 = 0; break;
      case 'teleport': e.invuln = Math.max(e.invuln, c.wind + 0.2); break;
      case 'roar': HC.FX.ring(e.x + e.w / 2, e.y + e.h / 2, 30, '#ffffff', c.wind, 1); break;
      default: break;
    }
    if (e.boss || e.elite) HC.Audio.play('telegraph');
  }

  function meleeBox(e, range, h) {
    h = h || e.h * 0.8;
    const cy = e.y + e.h * 0.5;
    const w = range + 6;
    return { x: e.facing > 0 ? e.x + e.w - 4 : e.x + 4 - w, y: cy - h / 2, w, h };
  }

  function fire(e, c, p, z) {
    const a = c.a;
    const G = HC.G;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    switch (a.t) {
      case 'swipe': c.box = meleeBox(e, a.range, a.h); c.dmg = e.atk * a.mult; c.active = 0.12; HC.Audio.play('swing', e.boss); break;
      case 'combo': c.box = meleeBox(e, a.range, a.h); c.dmg = e.atk * a.mult; c.active = 0.1; c.hitDone = false; e.vx = e.facing * 70; HC.Audio.play('swing'); break;
      case 'lunge': case 'charge':
        e.vx = e.facing * a.speed; c.active = a.dur; c.dmg = e.atk * a.mult; c.moveBox = true;
        HC.Audio.play('dash');
        break;
      case 'leap': {
        const dx = U.clamp(c.data.tx - cx, -a.range || -260, a.range || 260);
        e.vy = -440; e.vx = dx / 0.62; e.onGround = false; c.active = 2; c.leaping = true; c.dmg = e.atk * a.mult;
        break;
      }
      case 'throw': case 'bolt': {
        const n = a.count || 1;
        for (let i = 0; i < n; i++) {
          const spread = n > 1 ? (i / (n - 1) - 0.5) * (a.spread || 0.3) * (a.spread > 3 ? 1 : 2) : 0;
          let vx, vy;
          const sp = a.speed || 300;
          if (a.spread && a.spread > 3) { // 원형
            const ang = (i / n) * Math.PI * 2;
            vx = Math.cos(ang) * sp; vy = Math.sin(ang) * sp;
          } else if (a.gravity) {
            const dx = pcx - cx, dy = pcy - cy;
            const g = a.gravity;
            const disc = sp ** 4 - g * (g * dx * dx + 2 * -dy * sp * sp);
            let ang = disc >= 0 ? Math.atan((sp * sp - Math.sqrt(disc)) / (g * Math.abs(dx) + 0.001)) : Math.PI / 4;
            ang += spread;
            vx = Math.sign(dx || e.facing) * Math.cos(ang) * sp; vy = -Math.sin(ang) * sp;
          } else {
            const ang = Math.atan2(pcy - cy, pcx - cx) + spread;
            vx = Math.cos(ang) * sp; vy = Math.sin(ang) * sp;
          }
          HC.Combat.proj({ owner: 'e', src: e, x: cx + e.facing * e.w * 0.4, y: cy - 4, vx, vy, g: a.gravity || 0, r: a.sprite === 'rock' ? 7 : 4, dmg: e.atk * a.mult, mag: a.mag || a.t === 'bolt', status: a.status, sprite: a.sprite || (a.t === 'bolt' ? 'orb' : 'spear'), col: a.col || '#ffa040', homing: a.homing || 0, life: 4, knock: a.sprite === 'rock' ? 260 : 140 });
        }
        HC.Audio.play('projectile');
        break;
      }
      case 'nova': {
        const n = a.count || 12;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2;
          HC.Combat.proj({ owner: 'e', src: e, x: cx, y: cy, vx: Math.cos(ang) * (a.speed || 220), vy: Math.sin(ang) * (a.speed || 220), g: 0, r: 4, dmg: e.atk * a.mult, mag: a.mag, sprite: a.sprite || 'orb', col: a.col || '#ff6040', life: 3 });
        }
        HC.FX.ring(cx, cy, 40, a.col || '#ff6040', 0.3, 2);
        HC.Audio.play('explode');
        break;
      }
      case 'swoop': {
        const ang = Math.atan2(pcy - cy, pcx - cx);
        e.vx = Math.cos(ang) * (a.speed || 300); e.vy = Math.sin(ang) * (a.speed || 300);
        c.active = 0.55; c.dmg = e.atk * a.mult; c.moveBox = true;
        HC.Audio.play('dash');
        break;
      }
      case 'summon': {
        const n = a.count || 1;
        for (let i = 0; i < n; i++) {
          const id = a.corrupt ? a.mob + '_c' : a.mob;
          const d = HC.getMob(id);
          if (!d) continue;
          const sx = cx + U.rand(-70, 70);
          const s = HC.World.spawnMob(d, sx, e.y + e.h, { aggro: true, summoner: e, noHang: true });
          if (s) e.summons.push(s);
        }
        if (a.howl) HC.UI.toast(e.def.n + '의 울음소리가 동굴을 울린다', 1.4);
        HC.FX.ring(cx, e.y + e.h, 50, '#a040ff', 0.5, 2);
        break;
      }
      case 'burrow': break; // 별도 진행
      case 'teleport': {
        let tx;
        if (a.behind) tx = pcx - p.facing * 40;
        else tx = pcx + (Math.random() < 0.5 ? -1 : 1) * U.rand(90, 160);
        tx = U.clamp(tx, TS * 2, z.w * TS - TS * 2);
        let ty = surfaceY(z, tx, Math.max(0, p.y - 40));
        if (ty >= z.h * TS - TS) ty = p.y + p.h;
        HC.FX.burst(cx, cy, 14, ['#20102a', '#5a3080'], { g: -40, min: 20, max: 90 });
        e.x = tx - e.w / 2; e.y = ty - e.h; e.vx = 0; e.vy = 0;
        if (e.flying) e.y -= 40;
        e.facing = pcx >= e.x + e.w / 2 ? 1 : -1;
        HC.FX.burst(tx, ty - e.h / 2, 14, ['#20102a', '#5a3080'], { g: -40, min: 20, max: 90 });
        break;
      }
      case 'roar': {
        HC.Audio.play('roar');
        HC.FX.ring(cx, cy, a.radius || 200, '#ffffff', 0.5, 3);
        if (G.save.settings.shake) HC.Render.shake(G.cam, 6, 0.6);
        const d = U.dist(cx, cy, pcx, pcy);
        if (d < (a.radius || 200)) {
          if (a.fear) HC.Player.addFear(p, a.fear);
          if (a.stun && p.iframe <= 0) HC.Player.applyStatus(p, 'stun', a.stun);
        }
        break;
      }
      default: break;
    }
  }

  // 공격 진행. true면 끝.
  function runAttack(e, dt, p, z) {
    const c = e.cur, a = c.a;
    c.t += dt;
    if (c.phase === 'windup') {
      e.anim = 'windup';
      // 일부 공격은 예고 중 플레이어를 추적
      if (a.t === 'swipe' || a.t === 'combo' || a.t === 'lunge' || a.t === 'charge' || a.t === 'throw' || a.t === 'bolt' || a.t === 'swoop') {
        if (c.t < c.wind * 0.6) e.facing = (p.x + p.w / 2) >= (e.x + e.w / 2) ? 1 : -1;
      }
      if (a.t === 'burrow') return runBurrow(e, c, dt, p, z);
      if (a.t === 'teleport' && e.alpha == null) e.alpha = 1;
      if (a.t === 'teleport') e.alpha = Math.max(0.1, 1 - c.t / c.wind);
      if (e.flying && a.t !== 'swoop') { e.vx *= 0.9; e.vy *= 0.9; }
      if (c.t >= c.wind) { c.phase = 'active'; c.t = 0; fire(e, c, p, z); if (a.t === 'teleport') e.alpha = null; }
      return false;
    }
    if (c.phase === 'active') {
      e.anim = 'attack';
      if (a.t === 'burrow') return runBurrow(e, c, dt, p, z);
      // 근접 판정
      if (c.box && !c.hitDone) {
        if (U.overlap(c.box, p)) { c.hitDone = true; HC.Combat.enemyHitsPlayer(e, c.dmg, { status: a.status, mag: a.mag, knock: a.t === 'combo' ? 120 : 200 }); }
      }
      if (c.moveBox && !c.hitDone && U.overlap(e, p)) {
        c.hitDone = true;
        HC.Combat.enemyHitsPlayer(e, c.dmg, { status: a.status, knock: 240, stun: a.stun });
        if (a.stun) HC.Player.applyStatus(p, 'stun', a.stun);
      }
      if (a.t === 'charge' || a.t === 'lunge') {
        if (e.hitWall || (e.onGround && !HC.Phys.supportAt(z, e.x + e.w / 2 + e.facing * (e.w / 2 + 4), e.y + e.h) && !e.flying)) { e.vx = 0; c.active = Math.min(c.active, c.t); }
        if (a.t === 'charge' && Math.random() < 0.6) HC.FX.dust(e.x + e.w / 2, e.y + e.h, 1);
      }
      if (a.t === 'leap') {
        if (c.t > 0.1 && e.onGround) {
          const r = a.radius || 50;
          HC.Combat.hazard({ kind: 'slam', x: e.x + e.w / 2 - r, y: e.y + e.h - 34, w: r * 2, h: 40, delay: 0, dur: 0.12, dmg: c.dmg, owner: e, col: '#ffffff', knock: 280 });
          HC.FX.dust(e.x + e.w / 2, e.y + e.h, 16);
          HC.FX.ring(e.x + e.w / 2, e.y + e.h, r, '#d0c0a0', 0.3, 2);
          HC.Audio.play('explode');
          if (HC.G.save.settings.shake) HC.Render.shake(HC.G.cam, 5, 0.3);
          e.vx = 0;
          c.active = c.t;
        }
      }
      if (a.t === 'combo') {
        const iv = a.interval || 0.15;
        if (c.t >= c.active + iv) {
          c.hits++;
          if (c.hits < (a.hits || 3)) { c.t = 0; e.facing = (p.x + p.w / 2) >= (e.x + e.w / 2) ? 1 : -1; fire(e, c, p, z); return false; }
        }
      }
      const act = c.active == null ? 0.05 : c.active;
      if (c.t >= act + (a.t === 'combo' ? (a.interval || 0.15) : 0)) {
        c.phase = 'recover'; c.t = 0;
        if (a.t === 'lunge' || a.t === 'charge') e.vx *= 0.2;
        if (a.t === 'swoop') { e.vx *= 0.3; e.vy = -120; }
      }
      return false;
    }
    // 경직
    e.anim = 'idle';
    const rec = a.recover != null ? a.recover : (a.t === 'charge' ? 0.7 : e.boss ? 0.45 : 0.55);
    if (!e.flying) e.vx = U.approach(e.vx, 0, 900 * dt);
    if (c.t >= rec / (e.speedMult || 1)) {
      e.cds[c.idx] = (a.cd || 2) * U.rand(0.85, 1.15) / (e.speedMult || 1);
      e.cur = null;
      return true;
    }
    return false;
  }

  // 잠복 → 플레이어 밑으로 이동 → 예고 → 분출
  function runBurrow(e, c, dt, p, z) {
    const a = c.a, d = c.data;
    d.t2 += dt;
    const big = a.big || 0;
    if (d.sub === 'dig') {
      e.anim = 'windup';
      if (Math.random() < 0.5) HC.FX.dust(e.x + e.w / 2, e.y + e.h, 2);
      if (d.t2 > 0.35) { d.sub = 'travel'; d.t2 = 0; e.burrowed = true; e.invuln = 99; }
      return false;
    }
    if (d.sub === 'travel') {
      const tx = p.x + p.w / 2;
      const cx = e.x + e.w / 2;
      const sp = (e.boss ? 380 : 260);
      e.x += U.clamp(tx - cx, -sp * dt, sp * dt);
      const sy = surfaceY(z, e.x + e.w / 2, Math.max(0, p.y - 10));
      e.y = sy - e.h;
      if (Math.random() < 0.6) HC.FX.dust(e.x + e.w / 2, sy, 1);
      if (Math.abs(tx - cx) < 8 || d.t2 > 1.1) {
        d.sub = 'tele'; d.t2 = 0;
        const w = big ? big * 2 : 28;
        d.h = HC.Combat.hazard({ kind: 'erupt', x: e.x + e.w / 2 - w / 2, y: sy - (big ? big * 1.6 : 52), w, h: big ? big * 1.6 : 52, delay: a.windup || 0.7, dur: 0.18, dmg: e.atk * a.mult, owner: e, col: '#c0a070', knock: 320 });
      }
      return false;
    }
    if (d.sub === 'tele') {
      if (Math.random() < 0.8) HC.FX.dust(e.x + e.w / 2 + U.rand(-10, 10), e.y + e.h, 1);
      if (d.t2 >= (a.windup || 0.7)) {
        d.sub = 'out'; d.t2 = 0; e.burrowed = false; e.invuln = 0;
        e.vy = big ? -620 : -320; e.onGround = false;
        HC.FX.dust(e.x + e.w / 2, e.y + e.h, 18);
        HC.Audio.play('explode');
        if (big && HC.G.save.settings.shake) HC.Render.shake(HC.G.cam, 7, 0.4);
      }
      return false;
    }
    if (d.sub === 'out') {
      e.anim = 'attack';
      if (d.t2 > 0.4 && e.onGround) { c.phase = 'recover'; c.t = 0; }
      if (d.t2 > 2) { c.phase = 'recover'; c.t = 0; }
      return false;
    }
    return false;
  }

  function chooseAttack(e, p) {
    const atks = attacksOf(e);
    if (!atks || !atks.length) return -1;
    const cand = [];
    for (let i = 0; i < atks.length; i++) if (e.cds[i] <= 0 && inRange(e, atks[i], p)) cand.push(i);
    if (!cand.length) return -1;
    return U.pick(cand);
  }

  function update(e, dt, z, p) {
    const G = HC.G;
    e.animT += dt;
    if (e.spawnT > 0) { e.spawnT -= dt; }
    e.flash = Math.max(0, e.flash - dt);
    e.invuln = Math.max(0, e.invuln - dt);
    if (e.dead) { e.deathT += dt; return; }
    // 상태이상
    let slow = 1;
    for (const k in e.status) {
      const s = e.status[k];
      s.t -= dt;
      if (k === 'bleed' || k === 'poison' || k === 'burn' || k === 'dot') {
        s.tick = (s.tick || 0) + dt;
        if (s.tick >= 0.5) { s.tick -= 0.5; HC.Combat.damageEnemy(e, Math.max(1, Math.round(s.dps * 0.5)), { dot: true, col: k === 'poison' ? '#90d060' : k === 'burn' ? '#ff9040' : '#d05050' }); }
      }
      if (k === 'slow') slow = Math.min(slow, 1 - s.v);
      if (s.t <= 0) delete e.status[k];
    }
    if (e.dead) return;
    if (e.def.ai === 'dummy') { e.status = {}; e.anim = 'idle'; e.facing = (p.x > e.x) ? 1 : -1; physics(e, dt, z); return; }
    if (e.status.stun) { e.anim = 'hurt'; e.vx = U.approach(e.vx, 0, 600 * dt); physics(e, dt, z); return; }
    for (let i = 0; i < e.cds.length; i++) e.cds[i] -= dt * slow;
    e.jumpCd -= dt;

    // 보스 페이즈
    if (e.def.ai === 'boss') {
      const ph = e.def.phases;
      const ratio = e.hp / e.maxHp;
      while (e.phase + 1 < ph.length && ratio <= ph[e.phase + 1].hp) {
        e.phase++;
        const P = ph[e.phase];
        for (const a of P.attacks) { e.phaseAtks.push(a); e.cds.push(U.rand(1, 2.5)); }
        if (P.speed) e.speedMult = P.speed;
        e.cur = null; e.alpha = null; e.burrowed = false;
        e.invuln = 1.2;
        HC.Audio.play('roar');
        HC.FX.ring(e.x + e.w / 2, e.y + e.h / 2, 160, '#ffffff', 0.6, 3);
        if (G.save.settings.shake) HC.Render.shake(G.cam, 8, 0.8);
        HC.UI.toast(e.def.n + ' — 광폭해진다', 2);
        e.stagger = 1.0;
      }
    }

    // 경직 중
    if (e.stagger > 0) {
      e.stagger -= dt;
      e.anim = 'hurt';
      if (!e.flying) e.vx = U.approach(e.vx, 0, 700 * dt);
      else { e.vx *= 0.9; e.vy *= 0.9; }
      physics(e, dt, z);
      return;
    }

    // 매달린 시체
    if (e.hanging) {
      e.anim = 'idle';
      const dx = Math.abs((p.x + p.w / 2) - (e.x + e.w / 2));
      if (dx < 26 && p.y > e.y && p.y - e.y < 220) {
        e.hanging = false; e.dropping = true; e.vy = 50; e.aggro = true;
        HC.Audio.play('telegraph');
      }
      return;
    }
    if (e.dropping) {
      e.vy += GRAV * dt; e.y += e.vy * dt;
      HC.Phys.move(z, e, 0);
      if (e.onGround || HC.Phys.pointSolid(z, e.x + e.w / 2, e.y + e.h + 1) || HC.Map.isPlat(z, Math.floor((e.x + e.w / 2) / TS), Math.floor((e.y + e.h + 1) / TS))) {
        e.dropping = false;
        HC.Combat.hazard({ kind: 'slam', x: e.x + e.w / 2 - 26, y: e.y + e.h - 30, w: 52, h: 34, delay: 0, dur: 0.12, dmg: e.atk * 1.3, owner: e, col: '#ffffff', knock: 260 });
        HC.FX.dust(e.x + e.w / 2, e.y + e.h, 10);
      }
      if (e.y > z.h * TS) e.dead = true;
      return;
    }

    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2, ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
    const dx = pcx - ecx, dy = pcy - ecy, dist = Math.hypot(dx, dy);
    // 어그로
    if (!e.aggro) {
      if (!p.dead && dist < e.def.aggro && Math.abs(dy) < 110 && HC.Phys.lineOfSight(z, ecx, ecy, pcx, pcy)) { e.aggro = true; HC.Combat.alertNearby(e); }
    } else if (!e.boss) {
      if (dist > 560 || p.dead) { e.lostT += dt; if (e.lostT > 4) { e.aggro = false; e.lostT = 0; } } else e.lostT = 0;
    }

    if (e.cur) { runAttack(e, dt * (e.speedMult || 1), p, z); physics(e, dt, z, e.cur && e.cur.leaping); return; }

    if (!e.aggro || p.dead || HC.G.cutscene) { patrol(e, dt, z); physics(e, dt, z); return; }

    // 공격 선택
    const idx = chooseAttack(e, p);
    if (idx >= 0 && (!e.boss || dist < 700)) { begin(e, attacksOf(e)[idx], idx, p, z); physics(e, dt, z); return; }

    // 이동
    const spd = e.spd * slow * (e.speedMult || 1);
    if (e.flying) {
      e.hoverT += dt;
      const keep = e.def.keep || 0;
      const tx = pcx - Math.sign(dx || 1) * (keep || 40), ty = pcy - 55 + Math.sin(e.hoverT * 2) * 18;
      const ax = tx - ecx, ay = ty - ecy;
      const al = Math.hypot(ax, ay) || 1;
      const want = Math.min(spd, al * 3);
      e.vx = U.approach(e.vx, ax / al * want, 500 * dt);
      e.vy = U.approach(e.vy, ay / al * want, 500 * dt);
      e.facing = dx >= 0 ? 1 : -1;
      e.anim = 'walk';
    } else if (e.def.rooted) {
      e.vx = 0; e.facing = dx >= 0 ? 1 : -1; e.anim = 'idle';
    } else {
      e.facing = dx >= 0 ? 1 : -1;
      const keep = e.def.keep || 0;
      let want = 0;
      const stopAt = e.w / 2 + p.w / 2 + 6;
      if (keep && Math.abs(dx) < keep) want = -e.facing * spd * 0.8;
      else if (Math.abs(dx) > stopAt + (keep ? 60 : 0)) want = e.facing * spd;
      // 가장자리
      if (want !== 0 && e.onGround) {
        const ahead = e.x + e.w / 2 + Math.sign(want) * (e.w / 2 + 4);
        if (!HC.Phys.supportAt(z, ahead, e.y + e.h)) {
          if (!(dy > 40 && Math.sign(want) === Math.sign(dx))) want = 0;
        }
      }
      e.vx = U.approach(e.vx, want, 900 * dt);
      if (e.onGround && e.jumpCd <= 0) {
        if (e.hitWall && want !== 0) { e.vy = -400; e.jumpCd = 1.0; }
        else if (dy < -48 && Math.abs(dx) < 110 && Math.abs(dy) < 120) { e.vy = -480; e.vx = e.facing * spd * 0.6; e.jumpCd = 1.4 + Math.random(); }
        else if (dy > 48 && e.groundTile === HC.T.PLAT && Math.abs(dx) < 80) { e.dropping2 = 0.25; e.jumpCd = 1; }
      }
      e.anim = Math.abs(e.vx) > 10 ? 'walk' : 'idle';
    }
    physics(e, dt, z);
  }

  function patrol(e, dt, z) {
    if (e.flying) {
      e.hoverT += dt;
      e.vx = Math.sin(e.hoverT * 0.7) * e.spd * 0.3;
      e.vy = Math.cos(e.hoverT * 1.3) * 20;
      e.facing = e.vx >= 0 ? 1 : -1;
      e.anim = 'walk';
      return;
    }
    if (e.def.rooted) { e.vx = 0; return; }
    e.patrolT -= dt;
    if (e.patrolT <= 0) {
      e.patrolT = U.rand(1.5, 4);
      e.patrolDir = Math.random() < 0.3 ? 0 : (Math.random() < 0.5 ? -1 : 1);
    }
    let want = e.patrolDir * e.spd * 0.35;
    if (want && e.onGround) {
      const ahead = e.x + e.w / 2 + Math.sign(want) * (e.w / 2 + 4);
      if (!HC.Phys.supportAt(z, ahead, e.y + e.h) || e.hitWall) { e.patrolDir *= -1; want = 0; }
    }
    if (Math.abs(e.x - e.home) > 260 && Math.sign(e.home - e.x) !== Math.sign(want)) { e.patrolDir = Math.sign(e.home - e.x); }
    e.vx = U.approach(e.vx, want, 600 * dt);
    if (want) e.facing = Math.sign(want);
    e.anim = Math.abs(e.vx) > 5 ? 'walk' : 'idle';
  }

  function physics(e, dt, z, leaping) {
    if (e.burrowed) return;
    if (e.flying) {
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.x = U.clamp(e.x, TS, z.w * TS - TS - e.w);
      e.y = U.clamp(e.y, TS, z.h * TS - TS * 2 - e.h);
      if (HC.Phys.pointSolid(z, e.x + e.w / 2, e.y + e.h / 2)) { e.y -= 60 * dt; }
      return;
    }
    e.vy = Math.min(800, e.vy + GRAV * dt);
    e.dropping = !!(e.dropping2 > 0);
    if (e.dropping2 > 0) e.dropping2 -= dt;
    e.stepUp = true;
    HC.Phys.move(z, e, dt);
    // 지렁이 몸통 따라가기
    if (e.segs) {
      e.trail.unshift({ x: e.x + e.w / 2, y: e.y + e.h / 2 });
      if (e.trail.length > e.segs.length * 5) e.trail.length = e.segs.length * 5;
      for (let i = 0; i < e.segs.length; i++) {
        const t = e.trail[Math.min(e.trail.length - 1, i * 5)];
        e.segs[i].x = t.x; e.segs[i].y = t.y + Math.sin(e.animT * 6 + i) * 2;
      }
    }
  }

  function draw(ctx, e, cam, t) {
    if (e.burrowed) return;
    if (e.dead) {
      const k = e.deathT / 0.6;
      if (k >= 1) return;
      ctx.globalAlpha = 1 - k;
    }
    if (e.spawnT > 0) ctx.globalAlpha = Math.min(ctx.globalAlpha, 1 - e.spawnT / 0.5);
    const tele = e.cur && e.cur.phase === 'windup';
    const fl = e.flash > 0 || (tele && Math.floor(t * 16) % 2 === 0);
    if (fl && 'filter' in ctx) ctx.filter = e.flash > 0 ? 'brightness(3)' : 'brightness(1.8) sepia(1) saturate(6) hue-rotate(-30deg)';
    HC.Draw.body(ctx, e, cam, t);
    if ('filter' in ctx) ctx.filter = 'none';
    ctx.globalAlpha = 1;
    // 잠식종 / 보스 오라
    if ((e.def.corrupt || e.boss) && !e.dead && Math.random() < (e.boss ? 0.6 : 0.25)) HC.FX.soulWisp(e.x + Math.random() * e.w, e.y + e.h * Math.random(), e.def.corrupt ? '#9040e0' : e.def.body.eye);
    // 예고 표식 (이형/보스)
    if (tele && (e.boss || e.elite)) {
      const x = Math.round(e.x + e.w / 2 - cam.x), y = Math.round(e.y - 10 - cam.y);
      ctx.fillStyle = '#ff3030'; ctx.fillRect(x - 1, y - 6, 3, 5); ctx.fillRect(x - 1, y + 1, 3, 2);
    }
  }

  return { create, update, draw, hitboxSize };
})();
