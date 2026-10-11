'use strict';
// 영혼 액티브 스킬 실행.
HC.Skills = (function () {
  const U = HC.U;

  function zone(o) { o.t = 0; o.hitSet = new Set(); o.tick = 0; HC.G.pzones.push(o); return o; }

  function nearestEnemy(p, range, pred) {
    let best = null, bd = range;
    for (const e of HC.G.enemies) {
      if (e.dead || e.burrowed || e.spawnT > 0.2) continue;
      if (pred && !pred(e)) continue;
      const d = U.dist(U.cx(p), U.cy(p), U.cx(e), U.cy(e));
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function aoe(p, cx, cy, r, mult, o) {
    o = o || {};
    let n = 0;
    for (const e of HC.G.enemies) {
      if (e.dead || e.burrowed) continue;
      const ex = U.clamp(cx, e.x, e.x + e.w), ey = U.clamp(cy, e.y, e.y + e.h);
      if (U.dist(cx, cy, ex, ey) <= r) {
        n++;
        HC.Combat.skillDamage(p, e, mult, { status: o.status, dir: Math.sign(U.cx(e) - cx) || p.facing, stagger: 1.6 });
        if (o.stun) HC.Combat.applyEnemyStatus(e, { stun: o.stun });
      }
    }
    return n;
  }

  function cast(p, slot) {
    const G = HC.G, save = G.save;
    const id = save.skillSlots[slot];
    if (!id) return;
    const sk = HC.SKILLS[id];
    if (!sk) return;
    if (p.skillCd[slot] > 0) { HC.UI.toast(sk.n + ' 재사용 대기 ' + p.skillCd[slot].toFixed(1) + '초', 0.7); return; }
    if (p.act || p.state === 'climb' || p.state === 'dash') return;
    if (G.scene === 'descent' && HC.Descent.skillsSealed(p)) { HC.UI.toast('심연의 안개가 영혼을 봉인했다. 빛 가까이로 가라.', 1.4); HC.Audio.play('fail'); return; }
    p.skillCd[slot] = sk.cd * (1 - p.st.cdr);
    p.atk = null; p.atkAnim = null;
    const cx = U.cx(p), cy = U.cy(p);
    HC.FX.ring(cx, cy, 22, sk.col, 0.3, 2);
    HC.Audio.play('swing', true);
    switch (sk.kind) {
      case 'dashStrike': {
        const sp = 560;
        p.act = { kind: 'dash', t: 0, dur: sk.dist / sp, sp, lock: true, iframe: !!sk.iframe, armor: !!sk.armor, hit: new Set(), sk };
        HC.Audio.play('dash');
        break;
      }
      case 'buff':
        HC.Player.addBuff(p, { id: sk.id, dur: sk.dur, mods: sk.mods, giant: sk.giant, col: sk.col, n: sk.n });
        HC.FX.burst(cx, cy, 16, [sk.col, '#ffffff'], { g: -80, min: 30, max: 100, glow: true });
        if (sk.giant) { HC.Audio.play('roar'); HC.Render.shake(G.cam, 4, 0.3); }
        break;
      case 'proj': {
        const n = sk.count || 1;
        for (let i = 0; i < n; i++) {
          const spr = n > 1 ? (i / (n - 1) - 0.5) * (sk.spread || 0.3) * 2 : 0;
          const ang = (p.facing > 0 ? 0 : Math.PI) + spr * p.facing - (sk.gravity ? 0.35 * p.facing : 0) * 0;
          let vx = Math.cos(ang) * sk.speed, vy = Math.sin(ang) * sk.speed;
          if (sk.gravity) vy = -sk.speed * 0.45;
          HC.Combat.proj({ owner: 'p', x: cx + p.facing * 8, y: cy - 4, vx, vy, g: sk.gravity || 0, r: sk.sprite === 'rock' ? 7 : 4, mult: sk.mult, pierce: sk.pierce || 1, status: sk.status, sprite: sk.sprite || 'orb', col: sk.col, homing: sk.homing || 0, life: 2.5, knock: sk.knock || 0, stagger: 1.4 });
        }
        HC.Audio.play('projectile');
        break;
      }
      case 'combo':
        p.act = { kind: 'combo', t: 0, n: 0, lock: true, sk, next: 0.05, hit: null };
        break;
      case 'spikes': {
        for (let i = 0; i < sk.count; i++) {
          const x = cx + p.facing * (24 + i * sk.step);
          const sy = HC.Map.surfaceBelow(G.zone, Math.floor(x / HC.TS), Math.floor((p.y + p.h - 8) / HC.TS)) * HC.TS;
          if (Math.abs(sy - (p.y + p.h)) > 70) continue;
          zone({ kind: 'spike', x: x - 10, y: sy - 34, w: 20, h: 34, delay: 0.08 + i * 0.07, dur: 0.2, mult: sk.mult, status: sk.status, col: sk.col });
        }
        break;
      }
      case 'nova':
        aoe(p, cx, cy, sk.radius, sk.mult, { status: sk.status });
        HC.FX.ring(cx, cy, sk.radius, sk.col, 0.4, 3);
        HC.FX.burst(cx, cy, 30, [sk.col, '#ffffff'], { min: 80, max: 260, g: 100, glow: true });
        HC.Audio.play('explode');
        HC.Render.shake(G.cam, 3, 0.2);
        break;
      case 'cone':
        zone({ kind: 'cloud', x: p.facing > 0 ? p.x + p.w : p.x - sk.range, y: p.y - 10, w: sk.range, h: p.h + 16, delay: 0, dur: sk.dur, tickRate: 0.5, mult: sk.mult, status: sk.status, col: sk.col });
        break;
      case 'heal':
        p.heals.push({ total: p.st.maxHp * sk.pct, t: sk.dur, dur: sk.dur });
        HC.FX.burst(cx, cy, 14, [sk.col, '#ffffff'], { g: -60, min: 20, max: 70, glow: true });
        break;
      case 'shield':
        p.shield = Math.round(p.st.maxHp * sk.pct); p.shieldT = sk.dur;
        HC.FX.ring(cx, cy, 24, sk.col, 0.5, 3);
        break;
      case 'field':
        zone({ kind: 'field', x: cx - sk.radius, y: cy - sk.radius * 0.6, w: sk.radius * 2, h: sk.radius * 1.2, delay: 0, dur: sk.dur, tickRate: 0.5, slow: sk.slow, vuln: sk.vuln, dot: sk.dot, col: sk.col });
        break;
      case 'summon': {
        for (let i = 0; i < sk.count; i++) {
          const ang = -Math.PI / 2 + U.rand(-1.2, 1.2);
          HC.Combat.proj({ owner: 'p', x: cx, y: cy - 6, vx: Math.cos(ang) * 200 + p.facing * 80, vy: Math.sin(ang) * 200, g: 0, r: 4, mult: sk.mult, pierce: 1, sprite: id === 'batSwarm' ? 'bat' : 'crow', col: sk.col, homing: 7, life: 3.5, stagger: 0.6 });
        }
        break;
      }
      case 'leap':
        p.vy = -430; p.vx = p.facing * sk.dist / 0.55; p.onGround = false;
        p.act = { kind: 'leap', t: 0, lock: true, sk, armor: true };
        break;
      case 'burrow': {
        const e = nearestEnemy(p, sk.range);
        if (!e) { p.skillCd[slot] = 0.5; HC.UI.toast('가까이에 노릴 적이 없다', 0.8); return; }
        p.act = { kind: 'burrow', t: 0, lock: true, iframe: true, target: e, sk };
        HC.FX.dust(cx, p.y + p.h, 10);
        break;
      }
      case 'devour': {
        const box = { x: p.facing > 0 ? p.x + p.w - 4 : p.x + 4 - sk.range, y: p.y - 6, w: sk.range, h: p.h + 12 };
        let healed = 0;
        for (const e of G.enemies) {
          if (e.dead || e.burrowed || !U.overlap(box, e)) continue;
          const r = HC.Combat.skillDamage(p, e, sk.mult, { stagger: 2 });
          healed += r.dmg * sk.heal;
        }
        if (healed) HC.Player.heal(p, healed);
        HC.FX.burst(box.x + box.w / 2, cy, 20, [sk.col, '#ffffff'], { min: 60, max: 180 });
        HC.Audio.play('hit', true);
        break;
      }
      case 'rain': {
        const targets = G.enemies.filter((e) => !e.dead && !e.burrowed && U.dist(cx, cy, U.cx(e), U.cy(e)) < sk.radius);
        for (let i = 0; i < sk.count; i++) {
          const e = targets.length ? targets[i % targets.length] : null;
          const x = e ? U.cx(e) + U.rand(-10, 10) : cx + U.rand(-sk.radius, sk.radius);
          const yb = e ? e.y + e.h : p.y + p.h;
          zone({ kind: 'shard', x: x - 8, y: yb - 40, w: 16, h: 40, delay: 0.1 + i * 0.07, dur: 0.12, mult: sk.mult, col: sk.col });
        }
        break;
      }
      case 'blink': {
        const e = nearestEnemy(p, sk.range);
        if (!e) { p.skillCd[slot] = 0.5; HC.UI.toast('가까이에 노릴 적이 없다', 0.8); return; }
        HC.FX.burst(cx, cy, 12, ['#20102a', sk.col], { g: -40 });
        const side = e.facing > 0 ? -1 : 1;
        p.x = U.cx(e) + side * (e.w / 2 + 8) - p.w / 2;
        p.y = e.y + e.h - p.h;
        p.facing = -side;
        p.vx = 0; p.vy = 0;
        p.iframe = Math.max(p.iframe, 0.3);
        HC.Combat.skillDamage(p, e, sk.mult, { stagger: 2 });
        HC.FX.sparks(U.cx(e), U.cy(e), [sk.col, '#ffffff'], 12);
        HC.Audio.play('hit', true);
        break;
      }
      case 'beam':
        zone({ kind: 'beam', x: p.facing > 0 ? cx : cx - sk.len, y: cy - 8, w: sk.len, h: 16, delay: 0.15, dur: 0.35, mult: sk.mult, col: sk.col });
        p.act = { kind: 'hold', t: 0, dur: 0.4, lock: true, sk };
        HC.Audio.play('explode');
        break;
      case 'stunAoe':
        aoe(p, cx, cy, sk.radius, sk.mult, { stun: sk.stun });
        HC.FX.ring(cx, cy, sk.radius, sk.col, 0.5, 3);
        HC.Audio.play('roar');
        HC.Render.shake(G.cam, 4, 0.3);
        break;
      default: break;
    }
    HC.UI.dirty = true;
  }

  function updateAct(p, dt, z) {
    const a = p.act, sk = a.sk;
    a.t += dt;
    const G = HC.G;
    switch (a.kind) {
      case 'dash': {
        p.vx = p.facing * a.sp; p.vy = 0;
        if (a.iframe) p.iframe = Math.max(p.iframe, 0.05);
        const box = { x: p.x - 6, y: p.y - 4, w: p.w + 12, h: p.h + 8 };
        for (const e of G.enemies) {
          if (e.dead || e.burrowed || a.hit.has(e.uid) || !U.overlap(box, e)) continue;
          a.hit.add(e.uid);
          HC.Combat.skillDamage(p, e, sk.mult, { status: sk.status, stagger: 1.5 });
          if (sk.stun) HC.Combat.applyEnemyStatus(e, { stun: sk.stun });
          HC.FX.sparks(U.cx(e), U.cy(e), [sk.col, '#ffffff'], 8);
          HC.Audio.play('hit');
        }
        HC.FX.p({ x: U.cx(p), y: p.y + U.rand(2, p.h - 2), vx: -p.vx * 0.1, life: 0.3, s: 2, col: U.colorAlpha(sk.col, 0.7) });
        if (a.t >= a.dur || p.hitWall) { p.act = null; p.vx *= 0.3; }
        break;
      }
      case 'combo': {
        const reach = sk.reach || p.st.wtype.reach + 10;
        p.vx = U.approach(p.vx, 0, 900 * dt);
        if (a.t >= a.next) {
          a.n++;
          a.next = a.t + sk.interval;
          p.vx = p.facing * (sk.lunge || 0) * 3;
          const box = sk.aoe ? { x: U.cx(p) - sk.aoe, y: p.y - 10, w: sk.aoe * 2, h: p.h + 20 } : { x: p.facing > 0 ? p.x + p.w - 4 : p.x + 4 - reach, y: p.y - 2, w: reach, h: p.h + 4 };
          let hit = false;
          for (const e of G.enemies) {
            if (e.dead || e.burrowed || !U.overlap(box, e)) continue;
            HC.Combat.skillDamage(p, e, sk.mult, { status: sk.status, stagger: 1 });
            hit = true;
          }
          p.atkAnim = { t: 0.15, dur: 0.3, wtype: p.st.weapon ? p.st.weapon.type : 'axe' };
          HC.Audio.play(hit ? 'hit' : 'swing');
          HC.FX.p({ x: box.x + box.w / 2, y: box.y + box.h / 2, life: 0.15, s: 3, col: sk.col, glow: true });
          if (sk.aoe) HC.FX.ring(U.cx(p), U.cy(p), sk.aoe, sk.col, 0.15, 2);
          if (hit) G.hitstop = Math.max(G.hitstop, 0.03);
          if (a.n >= sk.hits) { a.endAt = a.t + 0.15; }
        }
        if (a.endAt && a.t >= a.endAt) { p.act = null; p.atkAnim = null; }
        break;
      }
      case 'leap':
        if (a.t > 0.1 && p.onGround) {
          aoe(p, U.cx(p), p.y + p.h - 6, sk.radius, sk.mult);
          HC.FX.ring(U.cx(p), p.y + p.h, sk.radius, sk.col, 0.35, 3);
          HC.FX.dust(U.cx(p), p.y + p.h, 18);
          HC.Audio.play('explode');
          HC.Render.shake(G.cam, 5, 0.3);
          p.act = null; p.vx = 0;
        } else if (a.t > 2) p.act = null;
        break;
      case 'burrow': {
        p.iframe = Math.max(p.iframe, 0.05);
        if (a.t >= 0.35 && !a.done) {
          a.done = true;
          const e = a.target;
          if (e && !e.dead) {
            p.x = U.cx(e) - p.w / 2; p.y = e.y + e.h - p.h;
            aoe(p, U.cx(p), p.y + p.h - 10, 44, sk.mult);
            HC.FX.burst(U.cx(p), p.y + p.h, 20, ['#a08050', '#605040'], { angle: -Math.PI / 2, spread: 0.6, min: 100, max: 300, g: 600 });
            HC.Audio.play('explode');
            p.vy = -320;
          }
        }
        if (a.t >= 0.5) p.act = null;
        break;
      }
      case 'hold':
        p.vx = 0;
        if (a.t >= a.dur) p.act = null;
        break;
      default: p.act = null;
    }
  }

  function update(dt) {
    const G = HC.G, p = G.player;
    for (let i = G.pzones.length - 1; i >= 0; i--) {
      const zn = G.pzones[i];
      zn.t += dt;
      const active = zn.t >= zn.delay && zn.t < zn.delay + zn.dur;
      if (active) {
        if (zn.tickRate) {
          zn.tick -= dt;
          if (zn.tick <= 0) {
            zn.tick = zn.tickRate;
            for (const e of G.enemies) {
              if (e.dead || e.burrowed || !U.overlap(zn, e)) continue;
              if (zn.kind === 'field') {
                e.status.slow = { t: 0.7, v: zn.slow || 0 };
                if (zn.vuln) e.status.vuln = { t: 0.7, v: zn.vuln };
                if (zn.dot) HC.Combat.skillDamage(p, e, zn.dot, { noKnock: true, stagger: 0 });
              } else HC.Combat.skillDamage(p, e, zn.mult, { status: zn.status, noKnock: true, stagger: 0.3 });
            }
          }
        } else if (!zn.fired) {
          zn.fired = true;
          for (const e of G.enemies) {
            if (e.dead || e.burrowed || zn.hitSet.has(e.uid) || !U.overlap(zn, e)) continue;
            zn.hitSet.add(e.uid);
            HC.Combat.skillDamage(p, e, zn.mult, { status: zn.status, stagger: 1.2 });
          }
          HC.FX.burst(zn.x + zn.w / 2, zn.y + zn.h, 6, [zn.col, '#ffffff'], { angle: -Math.PI / 2, spread: 0.5, min: 80, max: 220, g: 400 });
        }
      }
      if (zn.t >= zn.delay + zn.dur) G.pzones.splice(i, 1);
    }
  }

  function draw(ctx, cam, t) {
    for (const zn of HC.G.pzones) {
      if (zn.t < zn.delay) continue;
      const k = (zn.t - zn.delay) / zn.dur;
      const x = Math.round(zn.x - cam.x), y = Math.round(zn.y - cam.y);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      if (zn.kind === 'spike' || zn.kind === 'shard') {
        ctx.fillStyle = zn.col;
        const hh = zn.h * Math.min(1, k * 4) * (1 - Math.max(0, k - 0.7) * 2);
        ctx.beginPath(); ctx.moveTo(x, y + zn.h); ctx.lineTo(x + zn.w / 2, y + zn.h - hh); ctx.lineTo(x + zn.w, y + zn.h); ctx.fill();
      } else if (zn.kind === 'beam') {
        ctx.fillStyle = U.colorAlpha(zn.col, 0.7 * (1 - k)); ctx.fillRect(x, y, zn.w, zn.h);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)) + ')'; ctx.fillRect(x, y + zn.h / 2 - 2, zn.w, 4);
      } else if (zn.kind === 'cloud' || zn.kind === 'field') {
        ctx.fillStyle = U.colorAlpha(zn.col, 0.18 + 0.06 * Math.sin(t * 5));
        ctx.beginPath(); ctx.ellipse(x + zn.w / 2, y + zn.h / 2, zn.w / 2, zn.h / 2, 0, 0, Math.PI * 2); ctx.fill();
        if (Math.random() < 0.4) HC.FX.p({ x: zn.x + Math.random() * zn.w, y: zn.y + Math.random() * zn.h, vy: -10, life: 0.6, s: 2, col: zn.col, g: -10 });
      }
      ctx.restore();
    }
  }

  return { cast, updateAct, update, draw, nearestEnemy };
})();
