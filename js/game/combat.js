'use strict';
// 피해 계산, 투사체, 지면 위험(장판·가시·광선), 처치 처리.
HC.Combat = (function () {
  const U = HC.U;
  const G = () => HC.G;

  function reset() { HC.G.projs = []; HC.G.hazards = []; }
  function proj(o) { o.t = 0; o.hitSet = new Set(); o.pierce = o.pierce || 1; HC.G.projs.push(o); return o; }
  function hazard(o) { o.t = 0; o.hit = false; o.tick = 0; HC.G.hazards.push(o); return o; }

  function isNight() { const r = HC.G.run; return r ? HC.Descent.isNight() : false; }

  function nearbyCount(p, r) {
    let n = 0;
    for (const e of HC.G.enemies) if (!e.dead && U.dist(e.x, e.y, p.x, p.y) < r) n++;
    return n;
  }

  // 플레이어 → 적 피해
  function calc(p, e, base, o) {
    o = o || {};
    const st = p.st;
    let mult = 1;
    if (st.pack) mult += Math.min(st.pack[1], nearbyCount(p, 150) * st.pack[0]);
    if (st.vsBleed && e.status.bleed) mult += st.vsBleed;
    const hpR = p.hp / st.maxHp;
    for (const h of st.highHp) if (hpR >= h[0]) mult += h[1];
    for (const l of st.lowHp) if (hpR <= l[0]) mult += l[1];
    if (isNight()) for (const n of st.night) mult += n[0];
    for (const x of st.execute) if (e.hp / e.maxHp <= x[0]) mult += x[1];
    if (st.vsAir && (e.flying || !e.onGround)) mult += st.vsAir;
    if (st.backstab && e.facing === p.facing) mult += st.backstab;
    if (o.air && st.airDmg) mult += st.airDmg;
    if (st.killStack && p.killStacks.length) mult += p.killStacks.length * st.killStack[0];
    if (e.status.vuln) mult += e.status.vuln.v;
    if (e.boss || e.elite) mult *= st.vsElite;
    let dmg = base * mult;
    const crit = Math.random() < st.crit + (o.critBonus || 0);
    if (crit) dmg *= st.critDmg;
    const edef = Math.max(0, e.defense - st.pen);
    dmg *= 60 / (60 + edef);
    dmg *= U.rand(0.92, 1.08);
    return { dmg: Math.max(1, Math.round(dmg)), crit };
  }

  function damageEnemy(e, dmg, o) {
    o = o || {};
    if (e.dead) return;
    if (e.invuln > 0 || e.burrowed || e.spawnT > 0.2) {
      if (!o.dot) HC.FX.text(e.x + e.w / 2, e.y - 4, '무효', '#808080', 9);
      return;
    }
    e.hp -= dmg;
    e.aggro = true;
    e.flash = o.dot ? 0 : 0.08;
    const col = o.col || (o.crit ? '#ffd040' : o.skill ? '#a0d0ff' : '#ffffff');
    HC.FX.text(e.x + e.w / 2, e.y - 2, (o.crit ? '' : '') + dmg, col, o.dot ? 9 : o.crit ? 16 : 12, { bold: o.crit });
    if (!o.dot && HC.G.player && !o.noSteal) {
      const p = HC.G.player;
      if (p.st.lifesteal > 0) { p.stealAcc = (p.stealAcc || 0) + dmg * p.st.lifesteal; if (p.stealAcc >= 1) { HC.Player.heal(p, Math.floor(p.stealAcc), 'steal'); p.stealAcc -= Math.floor(p.stealAcc); } }
    }
    // 경직 / 넉백
    if (!o.dot && !o.noKnock && !e.boss) {
      const sp = o.stagger || 1;
      if (!e.poise) {
        e.stagger = Math.max(e.stagger, 0.22 * sp);
        if (e.cur && e.cur.phase !== 'active') { e.cur = null; e.alpha = null; }
        if (!e.flying) { e.vx = (o.dir || 0) * 110 * Math.min(2, sp); if (sp > 1.5) e.vy = -140; }
        else { e.vx = (o.dir || 0) * 140; }
      } else {
        e.poiseV += 10 * sp;
        if (e.poiseV >= e.poise) {
          e.poiseV = 0; e.stagger = 0.9; e.cur = null; e.alpha = null; e.burrowed = false; e.invuln = 0;
          HC.FX.text(e.x + e.w / 2, e.y - 14, '경직!', '#ffa040', 13, { bold: true });
          HC.FX.ring(e.x + e.w / 2, e.y + e.h / 2, 30, '#ffa040', 0.3, 2);
        }
      }
    }
    if (e.hp <= 0) kill(e);
  }

  function applyEnemyStatus(e, status, base) {
    if (!status || e.dead) return;
    for (const k in status) {
      const v = status[k];
      if (k === 'stun') { if (!e.boss) e.status.stun = { t: v }; else if (e.elite) e.status.stun = { t: v * 0.4 }; continue; }
      if (k === 'slow') { e.status.slow = { t: v[0], v: v[1] }; continue; }
      if (k === 'vuln') { e.status.vuln = { t: v[0], v: v[1] }; continue; }
      const dps = base * v[1];
      const cur = e.status[k];
      if (!cur || cur.dps <= dps) e.status[k] = { t: v[0], dps, tick: cur ? cur.tick : 0 };
      else cur.t = Math.max(cur.t, v[0]);
    }
  }

  function playerSwing(p, box) {
    const st = p.st, a = p.atk;
    const W = st.wtype;
    const stepMult = a.final ? (W.combo >= 4 ? 1.6 : 1.4) : 1 + a.step * 0.08;
    let any = false;
    for (const e of HC.G.enemies) {
      if (e.dead || a.hit.has(e.uid) || e.burrowed) continue;
      if (!U.overlap(box, e)) continue;
      a.hit.add(e.uid);
      const base = st.atk * st.physMult * st.basicMult * stepMult;
      const r = calc(p, e, base, { air: a.air });
      damageEnemy(e, r.dmg, { crit: r.crit, dir: p.facing, stagger: W.stagger * (a.final ? 1.7 : 1) });
      if (st.echo && Math.random() < st.echo && !e.dead) damageEnemy(e, Math.round(r.dmg * 0.6), { dir: p.facing, col: '#c0e0ff' });
      if (st.curse && Math.random() < st.curse[0]) e.status.vuln = { t: st.curse[2], v: st.curse[1] };
      HC.FX.sparks(U.cx(e) - p.facing * e.w * 0.3, box.y + box.h / 2, r.crit ? ['#ffe080', '#ffffff'] : ['#ffffff', '#d0d0d0'], r.crit ? 10 : 5);
      HC.FX.blood(U.cx(e), U.cy(e), p.facing, 4);
      any = true;
      HC.Audio.play('hit', r.crit);
      HC.G.hitstop = Math.max(HC.G.hitstop, r.crit ? 0.07 : a.final ? 0.06 : 0.04);
      if (a.final && HC.G.save.settings.shake) HC.Render.shake(HC.G.cam, 2.5, 0.12);
    }
    if (HC.World.hitObjects(box, a)) any = true;
    return any;
  }

  // 망령 기사 패시브: 회피로 지나가며 피해
  function dashSweep(p) {
    for (const e of HC.G.enemies) {
      if (e.dead || e.burrowed || p.dashHit.has(e.uid) || !U.overlap(p, e)) continue;
      p.dashHit.add(e.uid);
      const r = calc(p, e, p.st.atk * p.st.physMult * p.st.dashDmg);
      damageEnemy(e, r.dmg, { crit: r.crit, dir: p.facing, noKnock: true });
    }
  }

  // 스킬 피해
  function skillDamage(p, e, mult, o) {
    o = o || {};
    const st = p.st;
    const base = (st.atk * 0.7 + st.level * 6) * st.skillMult * mult;
    const r = calc(p, e, base, o);
    damageEnemy(e, r.dmg, { crit: r.crit, dir: o.dir || p.facing, skill: true, stagger: o.stagger || 1.2, noKnock: o.noKnock });
    if (o.status) applyEnemyStatus(e, o.status, base);
    return r;
  }

  function enemyHitsPlayer(e, raw, o) {
    const p = HC.G.player;
    if (!p || p.dead) return false;
    o = o || {};
    const dir = Math.sign((p.x + p.w / 2) - (e.x + e.w / 2)) || 1;
    return HC.Player.takeHit(p, raw * (HC.G.run && HC.G.run.mobAtkMult || 1), Object.assign({}, o, { srcEnt: e, dir, atk: e.atk, src: e.def.n }));
  }

  function alertNearby(e) {
    for (const o of HC.G.enemies) if (!o.dead && !o.aggro && U.dist(o.x, o.y, e.x, e.y) < 160) o.aggro = true;
  }

  function kill(e) {
    const Gm = HC.G;
    e.dead = true; e.deathT = 0; e.cur = null;
    HC.FX.ash(e.x, e.y, e.w, e.h, e.boss ? 120 : e.elite ? 50 : 20);
    HC.Audio.play('kill');
    if (e.def.summonOnly && !e.boss) { HC.World.dropLoot(e, true); return; }
    HC.World.dropLoot(e);
    const p = Gm.player;
    if (p && p.st.killHeal > 0) HC.Player.heal(p, p.st.maxHp * p.st.killHeal);
    if (p && p.st.killStack) {
      p.killStacks.push(Gm.time + p.st.killStack[2]);
      if (p.killStacks.length > p.st.killStack[1]) p.killStacks.shift();
    }
    if (Gm.scene === 'descent') HC.Descent.onKill(e);
  }

  function update(dt, z) {
    const Gm = HC.G, p = Gm.player;
    // 투사체
    for (let i = Gm.projs.length - 1; i >= 0; i--) {
      const q = Gm.projs[i];
      q.t += dt;
      if (q.homing) {
        let tgt = null;
        if (q.owner === 'e') tgt = p && !p.dead ? p : null;
        else { let bd = 260; for (const e of Gm.enemies) { if (e.dead || e.burrowed) continue; const d = U.dist(q.x, q.y, U.cx(e), U.cy(e)); if (d < bd) { bd = d; tgt = e; } } }
        if (tgt) {
          const ang = Math.atan2(U.cy(tgt) - q.y, U.cx(tgt) - q.x);
          const sp = Math.hypot(q.vx, q.vy);
          const cur = Math.atan2(q.vy, q.vx);
          let da = ang - cur; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
          const na = cur + U.clamp(da, -q.homing * dt, q.homing * dt);
          q.vx = Math.cos(na) * sp; q.vy = Math.sin(na) * sp;
        }
      }
      q.vy += (q.g || 0) * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      let dead = q.t > (q.life || 3);
      if (!dead && HC.Phys.pointSolid(z, q.x, q.y) && !q.ghost) { dead = true; HC.FX.sparks(q.x, q.y, q.col, 4); }
      if (!dead) {
        if (q.owner === 'e') {
          if (p && !p.dead && Math.abs(q.x - U.cx(p)) < p.w / 2 + q.r && Math.abs(q.y - U.cy(p)) < p.h / 2 + q.r) {
            if (HC.Player.takeHit(p, q.dmg * (Gm.run && Gm.run.mobAtkMult || 1), { mag: q.mag, status: q.status, dir: Math.sign(q.vx) || 1, srcEnt: q.src, atk: q.src ? q.src.atk : 20, src: q.src ? q.src.def.n : '투사체', knock: q.knock })) dead = true;
            else if (p.iframe > 0) { /* 통과 */ }
          }
        } else {
          for (const e of Gm.enemies) {
            if (e.dead || e.burrowed || q.hitSet.has(e.uid)) continue;
            if (Math.abs(q.x - U.cx(e)) < e.w / 2 + q.r && Math.abs(q.y - U.cy(e)) < e.h / 2 + q.r) {
              q.hitSet.add(e.uid);
              skillDamage(p, e, q.mult, { status: q.status, dir: Math.sign(q.vx) || p.facing, stagger: q.stagger || 1 });
              if (q.knock && !e.boss) { e.vx = Math.sign(q.vx) * q.knock; e.vy = -150; }
              HC.FX.sparks(q.x, q.y, q.col, 5);
              q.pierce--;
              if (q.pierce <= 0) { dead = true; break; }
            }
          }
        }
      }
      if (dead) Gm.projs.splice(i, 1);
    }
    // 지면 위험
    for (let i = Gm.hazards.length - 1; i >= 0; i--) {
      const h = Gm.hazards[i];
      h.t += dt;
      if (h.owner && h.owner.dead && h.t < h.delay && h.kind !== 'star') { Gm.hazards.splice(i, 1); continue; }
      const act = h.t >= h.delay && h.t < h.delay + h.dur;
      if (h.t >= h.delay && !h.fired) {
        h.fired = true;
        if (h.kind === 'spike' || h.kind === 'erupt' || h.kind === 'blast' || h.kind === 'drop' || h.kind === 'star') {
          HC.FX.burst(h.x + h.w / 2, h.y + h.h, h.kind === 'erupt' ? 14 : 6, [h.col, '#ffffff'], { angle: -Math.PI / 2, spread: 0.6, min: 80, max: 260, g: 500 });
          if (h.kind === 'blast' || h.kind === 'star') HC.Audio.play('explode');
        }
      }
      if (act && p && !p.dead && !h.hit && U.overlap(h, p)) {
        h.hit = true;
        const dir = Math.sign((p.x + p.w / 2) - (h.x + h.w / 2)) || 1;
        const o = { mag: h.mag, status: h.status, knock: h.knock || 200, dir: h.dir || dir, srcEnt: h.owner, atk: h.owner ? h.owner.atk : 30, src: h.owner ? h.owner.def.n : '나락' };
        HC.Player.takeHit(p, h.dmg * (Gm.run && Gm.run.mobAtkMult || 1), o);
      }
      // 장판 (지속)
      if (h.linger && h.t >= h.delay + h.dur) {
        if (!h.puddle) { h.puddle = true; h.pt = 0; }
        h.pt += dt; h.tick += dt;
        if (h.tick > 0.6 && p && U.overlap({ x: h.x, y: h.y + h.h - 12, w: h.w, h: 12 }, p)) { h.tick = 0; HC.Player.takeHit(p, h.dmg * 0.35, { mag: h.mag, status: h.status, knock: 0, srcEnt: h.owner, atk: h.owner ? h.owner.atk : 20, src: '장판' }); }
        if (h.pt > h.linger) { Gm.hazards.splice(i, 1); }
        continue;
      }
      if (h.t >= h.delay + h.dur) Gm.hazards.splice(i, 1);
    }
  }

  function drawProj(ctx, q, cam) {
    const x = Math.round(q.x - cam.x), y = Math.round(q.y - cam.y);
    const ang = Math.atan2(q.vy, q.vx);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    switch (q.sprite) {
      case 'spear': ctx.fillStyle = '#6a5236'; ctx.fillRect(-10, -1, 16, 2); ctx.fillStyle = q.col || '#c0c0c0'; ctx.fillRect(6, -2, 5, 4); break;
      case 'lance': ctx.fillStyle = q.col; ctx.globalCompositeOperation = 'lighter'; ctx.fillRect(-16, -2, 26, 4); ctx.fillRect(10, -3, 6, 6); ctx.globalCompositeOperation = 'source-over'; break;
      case 'rock': ctx.fillStyle = '#6a5e52'; ctx.beginPath(); ctx.arc(0, 0, q.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#8a7e70'; ctx.fillRect(-2, -3, 3, 2); break;
      case 'needle': ctx.fillStyle = q.col; ctx.fillRect(-6, -1, 10, 2); break;
      case 'shard': ctx.fillStyle = q.col; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -3); ctx.lineTo(-4, 3); ctx.fill(); break;
      case 'net': ctx.strokeStyle = '#c0b090'; ctx.lineWidth = 1; ctx.strokeRect(-6, -6, 12, 12); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke(); break;
      case 'bat': ctx.fillStyle = '#2a0a10'; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-4, -5 * Math.sin(q.t * 30)); ctx.lineTo(-2, 0); ctx.lineTo(-4, 5 * Math.sin(q.t * 30)); ctx.fill(); ctx.fillStyle = q.col; ctx.fillRect(2, -1, 1, 1); break;
      case 'crow': ctx.fillStyle = '#101018'; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-5, -6 * Math.sin(q.t * 25)); ctx.lineTo(-3, 0); ctx.lineTo(-5, 6 * Math.sin(q.t * 25)); ctx.fill(); ctx.fillStyle = '#ff3030'; ctx.fillRect(3, -1, 1, 1); break;
      case 'ember': ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = q.col; ctx.fillRect(-3, -2, 6, 4); ctx.globalCompositeOperation = 'source-over'; break;
      default: // orb
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = U.colorAlpha(q.col || '#ffffff', 0.35); ctx.beginPath(); ctx.arc(0, 0, q.r + 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = q.col || '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, q.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  function drawHazard(ctx, h, cam, t) {
    const x = Math.round(h.x - cam.x), y = Math.round(h.y - cam.y);
    const cx = x + h.w / 2, gy = y + h.h;
    if (h.t < h.delay) {
      // 예고: 바닥 표식 위주. 채운 사각형은 쓰지 않는다
      const k = h.t / h.delay;
      const pulse = 0.5 + 0.5 * Math.sin(t * 22);
      const a = 0.25 + k * 0.45;
      ctx.save();
      if (h.kind === 'beam') {
        ctx.fillStyle = 'rgba(255,50,50,' + (0.12 + 0.12 * pulse * k) + ')'; ctx.fillRect(x, y, h.w, h.h);
        ctx.fillStyle = 'rgba(255,90,80,' + a + ')'; ctx.fillRect(x, y + h.h / 2 - 1, h.w, 2);
        ctx.fillStyle = 'rgba(255,220,200,0.8)'; ctx.fillRect(h.dir < 0 ? x + h.w - Math.round(h.w * k) : x, y + h.h / 2, Math.round(h.w * k), 1);
      } else if (h.kind === 'drop' || h.kind === 'star') {
        ctx.strokeStyle = 'rgba(255,70,60,' + (0.35 + 0.4 * pulse) + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, gy - 1, h.w / 2 * (1.4 - k * 0.6) + 1, 3, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,60,50,' + a * 0.6 + ')'; ctx.beginPath(); ctx.ellipse(cx, gy - 1, h.w / 2 * k, 2, 0, 0, Math.PI * 2); ctx.fill();
      } else if (h.kind === 'spike') {
        ctx.fillStyle = 'rgba(255,70,50,' + a + ')';
        ctx.beginPath(); ctx.moveTo(cx - 5, gy); ctx.lineTo(cx, gy - 4 - k * 4); ctx.lineTo(cx + 5, gy); ctx.fill();
        ctx.fillStyle = 'rgba(255,200,170,' + (0.3 + 0.4 * pulse) + ')'; ctx.fillRect(cx - 6, gy - 1, 12, 1);
      } else {
        // slam / blast / erupt: 바닥 타원 + 차오르는 테두리
        const rx = h.w / 2, ry = Math.max(3, Math.min(8, h.w / 10));
        ctx.fillStyle = 'rgba(255,40,30,' + (0.10 + 0.18 * k) + ')';
        ctx.beginPath(); ctx.ellipse(cx, gy - ry * 0.6, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,90,70,' + (0.4 + 0.4 * pulse) + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, gy - ry * 0.6, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,220,190,0.75)';
        ctx.beginPath(); ctx.ellipse(cx, gy - ry * 0.6, rx * k, ry * k, 0, 0, Math.PI * 2); ctx.stroke();
        if (h.kind === 'blast') {
          const g = ctx.createLinearGradient(0, y, 0, gy);
          g.addColorStop(0, 'rgba(255,60,40,0)'); g.addColorStop(1, 'rgba(255,60,40,' + (0.08 + 0.12 * k) + ')');
          ctx.fillStyle = g; ctx.fillRect(x + h.w * 0.15, y, h.w * 0.7, h.h);
        }
      }
      ctx.restore();
      return;
    }
    if (h.puddle) {
      ctx.fillStyle = U.colorAlpha(h.col, 0.3 + 0.1 * Math.sin(t * 6));
      ctx.beginPath(); ctx.ellipse(cx, gy - 2, h.w / 2, 4, 0, 0, Math.PI * 2); ctx.fill();
      if (Math.random() < 0.3) HC.FX.p({ x: h.x + Math.random() * h.w, y: h.y + h.h - 4, vy: -20, life: 0.6, col: h.col, s: 1, g: -10 });
      return;
    }
    const k = Math.min(1, (h.t - h.delay) / Math.max(0.01, h.dur));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    switch (h.kind) {
      case 'spike': {
        ctx.fillStyle = h.col;
        const hh = h.h * Math.min(1, k * 3) * (1 - Math.max(0, k - 0.7));
        ctx.beginPath(); ctx.moveTo(x + 2, gy); ctx.lineTo(cx, gy - hh); ctx.lineTo(x + h.w - 2, gy); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(cx - 1, gy - hh, 1, hh * 0.6);
        break;
      }
      case 'erupt': {
        const hh = h.h * Math.min(1, k * 2.5);
        const g = ctx.createLinearGradient(0, gy - hh, 0, gy);
        g.addColorStop(0, U.colorAlpha(h.col, 0)); g.addColorStop(1, U.colorAlpha(h.col, 0.75));
        ctx.fillStyle = g; ctx.fillRect(x, gy - hh, h.w, hh);
        break;
      }
      case 'beam': {
        const th = h.h * (1 - k * 0.6);
        ctx.fillStyle = U.colorAlpha(h.col, 0.75 * (1 - k * 0.5)); ctx.fillRect(x, y + (h.h - th) / 2, h.w, th);
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(x, y + h.h / 2 - 1.5, h.w, 3);
        break;
      }
      case 'drop': case 'star': {
        ctx.fillStyle = U.colorAlpha(h.col, 0.95);
        const fy = U.lerp(y - 60, gy - 8, Math.min(1, k * 2));
        ctx.fillRect(cx - 2, fy - 14, 4, 14); ctx.fillRect(cx - 4, fy - 4, 8, 4);
        if (k > 0.45) { ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(cx, gy - 2, h.w / 2, 4, 0, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 'slam': {
        ctx.strokeStyle = U.colorAlpha(h.col, 0.9 * (1 - k)); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(cx, gy - 3, h.w / 2 * (0.5 + k * 0.6), 6 * (1 - k * 0.5), 0, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      default: { // blast
        const r = Math.max(h.w, h.h) * 0.55 * (0.4 + k * 0.7);
        const g = ctx.createRadialGradient(cx, gy - h.h * 0.4, 0, cx, gy - h.h * 0.4, r);
        g.addColorStop(0, 'rgba(255,255,255,' + 0.8 * (1 - k) + ')'); g.addColorStop(0.35, U.colorAlpha(h.col, 0.7 * (1 - k))); g.addColorStop(1, U.colorAlpha(h.col, 0));
        ctx.fillStyle = g; ctx.fillRect(cx - r, gy - h.h * 0.4 - r, r * 2, r * 2);
      }
    }
    ctx.restore();
  }

  function draw(ctx, cam, t) {
    for (const h of HC.G.hazards) drawHazard(ctx, h, cam, t);
    for (const q of HC.G.projs) drawProj(ctx, q, cam);
  }

  return { reset, proj, hazard, calc, damageEnemy, applyEnemyStatus, playerSwing, dashSweep, skillDamage, enemyHitsPlayer, alertNearby, kill, update, draw };
})();
