'use strict';
// 플레이어: 이동(달리기/2단 점프/회피/밧줄/발판 통과), 기본 공격 콤보, 피격.
HC.Player = (function () {
  const U = HC.U, I = HC.Input, TS = HC.TS;
  const GRAV = 1500, JUMP_V = 465, DJUMP_V = 410, MAX_FALL = 720, CLIMB_V = 95;

  function create() {
    return {
      x: 0, y: 0, w: 14, h: 38, vx: 0, vy: 0, facing: 1, onGround: false,
      state: 'normal', hp: 100, sta: 100, jumpsUsed: 0, coyote: 0, jumpBuf: 0,
      dashT: 0, dashCd: 0, airDashUsed: false, staDelay: 0, iframe: 0, hurtT: 0,
      atk: null, comboStep: 0, comboWindow: 0, atkAnim: null,
      rope: null, dropping: 0,
      buffs: [], status: {}, fear: 0, fearT: 0, shield: 0, shieldT: 0,
      skillCd: [0, 0, 0, 0], act: null, drinking: 0, heals: [],
      stillT: 0, killStacks: [], talismanT: 0, giant: false,
      dead: false, anim: 'idle', animT: 0, st: null, look: {}, statDirty: true,
      lastHitBy: null, flash: 0, wasGround: false, fallV: 0,
    };
  }

  function look(p, save) {
    const w = save.equip.weapon;
    const lk = { wtype: w ? w.type : 'axe', wCol: w ? HC.TIERS[w.tier].col : '#8a7a6a' };
    if (save.equip.body) lk.armorCol = U.shade(HC.TIERS[save.equip.body.tier].col, -0.45);
    if (save.equip.helm) { lk.helm = true; lk.helmCol = U.shade(HC.TIERS[save.equip.helm.tier].col, -0.2); }
    if (save.equip.gloves) { lk.gloves = true; lk.glovesCol = U.shade(HC.TIERS[save.equip.gloves.tier].col, -0.3); }
    p.look = lk;
  }

  function recalc(p) {
    const G = HC.G;
    const oldMax = p.st ? p.st.maxHp : null;
    p.st = HC.Stats.compute(G.save, { buffs: p.buffs, run: G.run, wounded: G.save.wounded });
    if (oldMax && p.st.maxHp !== oldMax) p.hp = Math.min(p.st.maxHp, p.hp * (p.st.maxHp / oldMax));
    p.hp = Math.min(p.hp, p.st.maxHp);
    p.sta = Math.min(p.sta, p.st.maxSta);
    p.giant = p.buffs.some((b) => b.giant);
    p.statDirty = false;
  }

  function addBuff(p, b) {
    p.buffs = p.buffs.filter((x) => x.id !== b.id);
    p.buffs.push(Object.assign({ t: b.dur }, b));
    p.statDirty = true;
  }

  function heal(p, amt, src) {
    if (p.dead) return 0;
    let mult = p.st.heal;
    if (HC.G.run && HC.G.run.lordField === 'ashStorm' && HC.G.run.lordAwake) mult *= 0.5;
    const a = Math.max(0, Math.round(amt * mult));
    const before = p.hp;
    p.hp = Math.min(p.st.maxHp, p.hp + a);
    const got = p.hp - before;
    if (got >= 1 && src !== 'regen' && src !== 'steal') HC.FX.text(p.x + p.w / 2, p.y - 6, '+' + got, '#70e070', 11);
    return got;
  }

  function applyStatus(p, kind, dur, power, srcAtk) {
    if (p.st.immune.has(kind)) return;
    if (kind === 'poison' && p.st.poisonRes) power *= 1 - Math.min(0.9, p.st.poisonRes);
    const d = dur * (1 - p.st.statusRes);
    if (d <= 0.05) return;
    if (kind === 'stun') { p.hurtT = Math.max(p.hurtT, d); p.state = 'hurt'; return; }
    const cur = p.status[kind];
    const dps = kind === 'slow' ? power : (srcAtk || 20) * power;
    if (!cur || cur.t < d || (cur.dps || 0) < dps) p.status[kind] = { t: d, dps, tick: 0 };
  }

  function addFear(p, n) {
    const G = HC.G;
    if (p.st.immune.has('fear')) return;
    for (let i = 0; i < n; i++) if (Math.random() > p.st.fearRes) p.fear++;
    p.fearT = 0;
    if (p.fear >= 9) {
      p.fear = 0;
      HC.UI.banner('굴복', '공포가 아홉 겹 쌓였다. 몸이 말을 듣지 않는다.', '#a040ff');
      HC.Audio.play('heavyHurt');
      p.hurtT = 2.4; p.state = 'hurt';
      hurt(p, Math.round(p.st.maxHp * 0.55), { true: true, src: '공포' });
      HC.Render.shake(G.cam, 8, 0.6);
    } else if (n > 0) HC.FX.text(p.x + p.w / 2, p.y - 14, '공포 ' + p.fear, '#b070ff', 10);
  }

  // 순수 체력 감소 (방어 계산 이후)
  function hurt(p, dmg, o) {
    o = o || {};
    if (p.dead) return;
    if (p.shield > 0 && !o.true) {
      const ab = Math.min(p.shield, dmg);
      p.shield -= ab; dmg -= ab;
      if (ab > 0) HC.FX.text(p.x + p.w / 2, p.y - 4, '흡수 ' + Math.round(ab), '#e0a0a0', 9);
    }
    if (dmg <= 0) return;
    p.hp -= dmg;
    p.lastHitBy = o.src || p.lastHitBy;
    HC.FX.text(p.x + p.w / 2, p.y - 2, '-' + Math.round(dmg), o.dot ? '#d07070' : '#ff4040', o.dot ? 10 : 14, { bold: !o.dot });
    if (p.hp <= 0) { p.hp = 0; HC.Game.playerDied(); }
  }

  /**
   * 적의 공격에 맞음. raw: 방어 전 피해. o: {mag, status, knock, dir, fear, src, unblockable}
   */
  function takeHit(p, raw, o) {
    const G = HC.G;
    o = o || {};
    if (p.dead || p.iframe > 0 || (p.act && p.act.iframe)) return false;
    if (Math.random() < p.st.dodge && !o.unblockable) {
      HC.FX.text(p.x + p.w / 2, p.y - 8, '회피', '#c0e0ff', 11);
      p.iframe = 0.25;
      return false;
    }
    let dmg = raw * p.st.mobAtk;
    dmg *= o.mag ? (1 - p.st.magDR) : (1 - p.st.physDR);
    dmg *= p.st.dmgTaken;
    if (p.st.still && p.stillT > 1) dmg *= 1 - p.st.still;
    dmg = Math.max(1, Math.round(dmg * U.rand(0.92, 1.08)));
    const heavy = dmg > p.st.maxHp * 0.22;
    hurt(p, dmg, o);
    if (p.dead) return true;
    // 반사 (결정 피부)
    if (p.st.reflect && o.srcEnt && Math.random() < p.st.reflect && !o.srcEnt.dead) {
      HC.Combat.damageEnemy(o.srcEnt, Math.round(p.st.atk * 1.5 + 10), { crit: false, mag: true, noKnock: true });
      HC.FX.sparks(o.srcEnt.x + o.srcEnt.w / 2, o.srcEnt.y + o.srcEnt.h / 2, ['#62c8ff', '#ffffff'], 8);
    }
    if (o.status) for (const k in o.status) {
      const v = o.status[k];
      if (k === 'stun') applyStatus(p, 'stun', v);
      else applyStatus(p, k, v[0], v[1], o.atk);
    }
    if (o.fear) addFear(p, o.fear);
    else if (G.run && G.run.lordAwake && o.srcEnt && (o.srcEnt.def.corrupt || o.srcEnt.def.kind === 'lord')) addFear(p, 1);
    // 넉백·경직
    const armored = p.giant || (p.act && p.act.armor);
    const kn = p.st.noKnock || armored ? 0 : (o.knock == null ? 170 : o.knock) * (1 - p.st.knockRes);
    if (kn > 0) {
      p.vx = (o.dir || (p.facing * -1)) * kn;
      p.vy = Math.min(p.vy, -kn * 0.9);
      p.rope = null;
      if (p.state === 'climb') p.state = 'normal';
    }
    if (!armored) {
      p.hurtT = Math.max(p.hurtT, heavy ? 0.42 : 0.26) * (1 - p.st.knockRes * 0.5);
      p.state = 'hurt';
      p.atk = null; p.atkAnim = null;
      if (p.act && !p.act.armor) p.act = null;
      p.drinking = 0;
    }
    p.iframe = heavy ? 1.0 : 0.75;
    p.talismanT = 0;
    p.flash = 0.15;
    HC.FX.blood(p.x + p.w / 2, p.y + p.h / 2, -(o.dir || -p.facing) * -1, heavy ? 16 : 8);
    HC.Audio.play(heavy ? 'heavyHurt' : 'hurt');
    if (G.save.settings.shake) HC.Render.shake(G.cam, heavy ? 7 : 3.5, heavy ? 0.4 : 0.2);
    HC.UI.flashDamage(heavy ? 0.6 : 0.3);
    if (heavy) G.hitstop = Math.max(G.hitstop, 0.08);
    return true;
  }

  function onRopeCheck(p, z) {
    const cx = p.x + p.w / 2;
    return HC.Map.ropeAt(z, cx, p.y + p.h - 4) || HC.Map.ropeAt(z, cx, p.y + 6);
  }

  function startAttack(p) {
    const st = p.st, W = st.wtype;
    const air = !p.onGround && p.state !== 'climb';
    if (p.comboWindow <= 0) p.comboStep = 0;
    const step = p.comboStep % W.combo;
    const base = 0.4;
    const dur = (W === HC.WTYPES.greatsword ? 0.6 : base) / st.aspd * (step === W.combo - 1 ? 1.15 : 1);
    p.atk = { step, t: 0, dur, hit: new Set(), air, final: step === W.combo - 1 };
    p.atkAnim = { t: 0, dur, wtype: st.weapon ? st.weapon.type : 'axe', air };
    p.comboStep = step + 1;
    if (p.onGround) p.vx += p.facing * (W === HC.WTYPES.spear ? 90 : 60);
    HC.Audio.play('swing', W === HC.WTYPES.greatsword || W === HC.WTYPES.mace);
  }

  function atkBox(p) {
    const W = p.st.wtype;
    const g = p.giant ? 1.35 : 1;
    const reach = W.reach * g, h = W.h * g;
    const cy = p.y + p.h * 0.45 - (p.giant ? 6 : 0);
    const x = p.facing > 0 ? p.x + p.w - 2 : p.x + 2 - reach;
    return { x, y: cy - h / 2 + (p.atk && p.atk.air ? 4 : 0), w: reach, h };
  }

  function update(p, dt, z) {
    const G = HC.G;
    if (p.statDirty || !p.st) recalc(p);
    const st = p.st;
    p.animT += dt;
    // 버프
    let changed = false;
    for (let i = p.buffs.length - 1; i >= 0; i--) { p.buffs[i].t -= dt; if (p.buffs[i].t <= 0) { p.buffs.splice(i, 1); changed = true; } }
    if (p.killStacks.length) { p.killStacks = p.killStacks.filter((t) => t > G.time); }
    if (changed) recalc(p);
    // 상태이상
    for (const k in p.status) {
      const s = p.status[k];
      s.t -= dt;
      if (k !== 'slow') {
        s.tick += dt;
        if (s.tick >= 0.5) { s.tick -= 0.5; hurt(p, Math.max(1, Math.round(s.dps * 0.5)), { dot: true, src: k === 'poison' ? '독' : k === 'burn' ? '화상' : '출혈' }); }
      }
      if (s.t <= 0) delete p.status[k];
    }
    if (p.dead) return;
    // 공포 감소
    if (p.fear > 0) { p.fearT += dt; if (p.fearT > 12) { p.fear--; p.fearT = 0; } }
    // 재생 / 회복
    let reg = st.regen;
    for (const l of st.lowRegen) if (p.hp / st.maxHp <= l[0]) reg += l[1];
    if (reg > 0 && p.hp < st.maxHp) { p.regAcc = (p.regAcc || 0) + reg * dt; if (p.regAcc >= 1) { heal(p, Math.floor(p.regAcc), 'regen'); p.regAcc -= Math.floor(p.regAcc); } }
    for (let i = p.heals.length - 1; i >= 0; i--) {
      const h = p.heals[i];
      const amt = h.total * Math.min(dt, h.t) / h.dur;
      h.acc = (h.acc || 0) + amt;
      h.t -= dt;
      if (h.acc >= 1) { const a = Math.floor(h.acc); h.acc -= a; heal(p, a, 'regen'); }
      if (h.t <= 0) { if (h.acc > 0.5) heal(p, Math.round(h.acc), 'regen'); p.heals.splice(i, 1); }
    }
    if (p.shieldT > 0) { p.shieldT -= dt; if (p.shieldT <= 0) p.shield = 0; }
    // 타이머
    p.iframe = Math.max(0, p.iframe - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.comboWindow = Math.max(0, p.comboWindow - dt);
    p.flash = Math.max(0, p.flash - dt);
    p.dropping = Math.max(0, p.dropping - dt);
    for (let i = 0; i < 4; i++) p.skillCd[i] = Math.max(0, p.skillCd[i] - dt);
    if (p.staDelay > 0) p.staDelay -= dt; else p.sta = Math.min(st.maxSta, p.sta + st.staRegen * dt);
    if (Math.abs(p.vx) < 5 && p.onGround && !p.atk) p.stillT += dt; else p.stillT = 0;
    // 물약
    if (p.drinking > 0) {
      p.drinking -= dt;
      if (p.drinking <= 0 && p.pendingPotion) {
        const it = HC.ITEMS[p.pendingPotion];
        p.heals.push({ total: st.maxHp * it.heal * st.potion, t: 1.2, dur: 1.2 });
        HC.FX.burst(p.x + p.w / 2, p.y + 8, 10, ['#ff4050', '#ff8080'], { g: -60, min: 20, max: 60, glow: true });
        p.pendingPotion = null;
      }
    }
    // 탈출 부적 집중
    if (p.talismanT > 0) {
      p.talismanT -= dt;
      if (Math.random() < 0.5) HC.FX.soulWisp(p.x + U.rand(0, p.w), p.y + p.h, '#e0d080');
      if (p.talismanT <= 0) { HC.Descent.escape(); return; }
    }

    const slowF = p.status.slow ? 1 - Math.min(0.6, p.status.slow.dps) : 1;
    const move = st.move * slowF * (p.giant ? 0.92 : 1);
    const ctl = HC.Input.enabled && !G.cutscene;

    // 스킬 동작 진행 중이면 스킬이 움직임을 제어
    if (p.act) {
      HC.Skills.updateAct(p, dt, z);
      if (p.act && p.act.lock) { finishPhysics(p, dt, z, p.act.kind === 'dash'); return; }
    }

    if (p.state === 'hurt') {
      p.hurtT -= dt;
      p.vx = U.approach(p.vx, 0, 900 * dt);
      if (p.hurtT <= 0) p.state = 'normal';
      finishPhysics(p, dt, z);
      return;
    }

    const L = ctl && I.held('left'), Rt = ctl && I.held('right');
    const dir = (Rt ? 1 : 0) - (L ? 1 : 0);

    // ── 밧줄 ──
    if (p.state === 'climb') {
      const r = p.rope;
      p.vx = 0;
      let vy = 0;
      if (ctl && I.held('up')) vy = -CLIMB_V;
      if (ctl && I.held('down')) vy = CLIMB_V;
      p.vy = vy;
      p.y += vy * dt;
      p.anim = 'climb';
      const top = r.y0 * TS, bot = (r.y1 + 1) * TS;
      if (p.y + p.h <= top + 2) { p.y = top - p.h; p.state = 'normal'; p.rope = null; p.onGround = true; p.vy = 0; }
      else if (p.y + p.h >= bot && vy > 0) { p.state = 'normal'; p.rope = null; }
      if (ctl && I.hit('jump') && (dir !== 0)) {
        p.state = 'normal'; p.rope = null; p.vy = -300; p.vx = dir * move * 0.9; p.facing = dir; p.jumpsUsed = 1;
        HC.Audio.play('jump');
      }
      if (ctl && I.hit('attack')) { /* 밧줄 위에서는 공격 불가 */ }
      return;
    }

    // ── 회피 ──
    if (p.state === 'dash') {
      p.dashT -= dt;
      p.vy = 0;
      if (Math.random() < 0.7) HC.FX.p({ x: p.x + p.w / 2, y: p.y + U.rand(4, p.h - 4), vx: -p.vx * 0.1, life: 0.25, s: 2, col: 'rgba(200,210,230,0.5)' });
      if (st.dashDmg) HC.Combat.dashSweep(p);
      if (p.dashT <= 0) { p.state = 'normal'; p.vx *= 0.35; }
      finishPhysics(p, dt, z, true);
      return;
    }

    // ── 공격 진행 ──
    if (p.atk) {
      const a = p.atk;
      a.t += dt;
      p.atkAnim.t = a.t;
      const k = a.t / a.dur;
      if (k >= 0.32 && k <= 0.62) HC.Combat.playerSwing(p, atkBox(p));
      if (a.t >= a.dur) { p.atk = null; p.atkAnim = null; p.comboWindow = 0.35; }
    }

    // 가로 이동
    const attacking = !!p.atk && p.onGround;
    const target = dir * move * (attacking ? 0.2 : 1) * (p.drinking > 0 ? 0.4 : 1) * (p.talismanT > 0 ? 0 : 1);
    const accel = p.onGround ? 1900 : 1300;
    p.vx = U.approach(p.vx, target, accel * dt);
    if (dir && !p.atk) p.facing = dir;

    // 점프 버퍼 / 코요테
    if (p.onGround) { p.coyote = 0.09; p.jumpsUsed = 0; p.airDashUsed = false; } else p.coyote -= dt;
    if (ctl && I.hit('jump')) p.jumpBuf = 0.12; else p.jumpBuf -= dt;

    // 발판 내려가기 (↓ + 점프)
    if (p.jumpBuf > 0 && ctl && I.held('down') && p.onGround && p.groundTile === HC.T.PLAT) {
      p.dropping = 0.22; p.onGround = false; p.y += 2; p.jumpBuf = 0; p.vy = 60;
    } else if (p.jumpBuf > 0 && !p.atk && p.talismanT <= 0) {
      if (p.coyote > 0) {
        p.vy = -JUMP_V * (p.giant ? 0.92 : 1); p.coyote = 0; p.jumpBuf = 0; p.jumpsUsed = 1;
        HC.Audio.play('jump'); HC.FX.dust(p.x + p.w / 2, p.y + p.h, 4);
      } else if (p.jumpsUsed < st.jumps) {
        p.jumpsUsed = Math.max(2, p.jumpsUsed + 1);
        p.vy = -DJUMP_V; p.jumpBuf = 0;
        if (dir) p.vx = dir * move;
        HC.Audio.play('jump');
        HC.FX.ring(p.x + p.w / 2, p.y + p.h, 10, 'rgba(200,210,230,0.6)', 0.25, 1);
      }
    }
    // 메이플처럼 점프 높이는 고정 (짧게 눌러도 끝까지 뛴다)

    // 밧줄 잡기
    if (ctl && !p.atk && (I.held('up') || (I.held('down') && p.onGround))) {
      const r = onRopeCheck(p, z);
      if (r) {
        const feet = p.y + p.h, top = r.y0 * TS;
        const goingDown = !I.held('up');
        const atTop = Math.abs(feet - top) < 5;
        // 위로: 밧줄 꼭대기에 서 있을 때는 잡지 않는다 / 아래로: 꼭대기에서만 잡고 내려간다
        if ((!goingDown && !(atTop && p.onGround)) || (goingDown && atTop)) {
          p.state = 'climb'; p.rope = r; p.vx = 0; p.vy = 0;
          p.x = r.x * TS + TS / 2 - p.w / 2;
          if (goingDown) p.y += 6;
          p.atk = null; p.atkAnim = null;
          return;
        }
      }
    }

    // 회피
    if (ctl && I.hit('dash') && p.dashCd <= 0 && (p.onGround || !p.airDashUsed) && p.talismanT <= 0) {
      if (p.sta >= st.dashCost) {
        p.sta -= st.dashCost; p.staDelay = 0.5;
        p.state = 'dash'; p.dashT = 0.17; p.iframe = Math.max(p.iframe, st.dashIframe);
        p.dashCd = 0.32;
        const d = dir || p.facing;
        p.facing = d;
        p.vx = d * 440; p.vy = 0;
        if (!p.onGround) p.airDashUsed = true;
        p.atk = null; p.atkAnim = null; p.drinking = 0;
        p.dashHit = new Set();
        HC.Audio.play('dash');
        return;
      } else HC.UI.toast('기력이 부족하다', 0.8);
    }
    // 공격
    if (ctl && I.hit('attack') && !p.atk && p.drinking <= 0 && p.talismanT <= 0) startAttack(p);
    // 스킬
    if (ctl && p.drinking <= 0 && p.talismanT <= 0) for (let i = 0; i < 4; i++) if (I.hit('s' + (i + 1))) HC.Skills.cast(p, i);
    // 물약
    if (ctl && I.hit('potion')) usePotion(p);
    if (ctl && I.hit('talisman') && HC.G.scene === 'descent') HC.Descent.tryTalisman();

    finishPhysics(p, dt, z);
  }

  function usePotion(p) {
    const G = HC.G;
    if (p.drinking > 0 || p.state !== 'normal') return;
    const belt = G.scene === 'descent' ? G.run.potions : G.save.potions;
    let id = null;
    // 체력이 많이 빠졌으면 진한 물약부터
    if (belt.bigPotion > 0 && (p.hp / p.st.maxHp < 0.4 || !belt.smallPotion)) id = 'bigPotion';
    else if (belt.smallPotion > 0) id = 'smallPotion';
    else if (belt.bigPotion > 0) id = 'bigPotion';
    if (!id) { HC.UI.toast('물약이 없다', 1); return; }
    belt[id]--;
    p.drinking = 0.55; p.pendingPotion = id;
    HC.Audio.play('potion');
    HC.UI.dirty = true;
  }

  function finishPhysics(p, dt, z, noGrav) {
    if (!noGrav) p.vy = Math.min(MAX_FALL, p.vy + GRAV * dt);
    p.dropping = p.dropping || 0;
    const before = p.onGround;
    const vyBefore = p.vy;
    p.stepUp = true;
    HC.Phys.move(z, p, dt);
    if (p.dropping > 0) { /* 발판 통과 유지 */ }
    if (p.onGround && !before && vyBefore > 300) { HC.Audio.play('land'); HC.FX.dust(p.x + p.w / 2, p.y + p.h, 5); }
    // 가시
    if (p.onGround && p.groundTile === HC.T.SPIKE && p.iframe <= 0) {
      hurt(p, Math.round(p.st.maxHp * 0.18), { src: '가시' });
      p.vy = -420; p.iframe = 0.8; p.onGround = false;
      HC.FX.blood(p.x + p.w / 2, p.y + p.h, 0, 8);
      HC.Audio.play('hurt');
    }
    // 애니메이션 상태
    if (p.state === 'dash') p.anim = 'dash';
    else if (!p.onGround) p.anim = 'air';
    else if (Math.abs(p.vx) > 20) { p.anim = 'walk'; HC.Audio.play('step'); }
    else p.anim = 'idle';
  }

  function draw(ctx, p, cam, t) {
    if (p.dead) return;
    const ox = Math.round(p.x + p.w / 2 - cam.x), oy = Math.round(p.y + p.h - cam.y);
    if (!HC.Draw.playerSprite(ctx, p, cam, t)) {
      ctx.save();
      ctx.translate(ox, oy);
      if (p.facing < 0) ctx.scale(-1, 1);
      if (p.iframe > 0 && p.state !== 'dash' && Math.floor(t * 20) % 2 === 0) ctx.globalAlpha = 0.45;
      if (p.state === 'dash') ctx.globalAlpha = 0.6;
      HC.Draw.player(ctx, p, t);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // 공격 궤적 (스프라이트가 없을 때만)
    if (p.atk && !(HC.Assets.ready && HC.SPRITE_META.hero)) {
      const k = p.atk.t / p.atk.dur;
      if (k >= 0.3 && k <= 0.66) {
        const b = atkBox(p);
        const W = p.st.wtype;
        ctx.save();
        ctx.globalAlpha = 0.55 * (1 - Math.abs(k - 0.48) / 0.2);
        ctx.strokeStyle = p.atk.final ? '#ffe8c0' : '#d8dce8';
        ctx.lineWidth = p.atk.final ? 3 : 2;
        const cx = (p.facing > 0 ? p.x + p.w / 2 : p.x + p.w / 2) - cam.x, cy = b.y + b.h / 2 - cam.y;
        if (W === HC.WTYPES.spear) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + p.facing * b.w, cy); ctx.stroke(); }
        else {
          ctx.beginPath();
          const r = b.w * 0.9;
          const a0 = p.facing > 0 ? -1.3 : Math.PI + 1.3, a1 = p.facing > 0 ? 1.1 : Math.PI - 1.1;
          ctx.arc(cx, cy, r, Math.min(a0, a1), Math.max(a0, a1), p.facing < 0);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    // 보호막
    if (p.shield > 0) { ctx.strokeStyle = 'rgba(255,140,140,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox, oy - p.h / 2, 18, 0, Math.PI * 2); ctx.stroke(); }
  }

  return { create, update, draw, recalc, takeHit, hurt, heal, addBuff, applyStatus, addFear, look, atkBox, usePotion };
})();
