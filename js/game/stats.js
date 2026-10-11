'use strict';
// 모든 출처(레벨·영혼·장비·유물·서브컨텐츠·버프)의 보너스를 합쳐 파생 능력치를 계산한다.
HC.Stats = (function () {
  const U = HC.U;

  function cardStars(id, kills) {
    const d = HC.getMob(id);
    if (!d || !kills) return 0;
    const steps = HC.cardSteps(d.kind);
    let s = 0;
    for (const t of steps) if (kills >= t) s++;
    return s;
  }

  function grade(save) {
    let q = 0;
    for (const s of save.souls) { const d = HC.getMob(s.id); if (d) q += HC.soulWeight(d.grade); }
    let g = 9;
    for (const G of HC.GRADES) if (q >= G.need) g = G.g;
    return { grade: g, q };
  }

  function hideoutLv(save, id) { return save.sub.hideout[id] || 0; }

  /**
   * extra: { buffs:[{mods}], run:{tonic, torch}, wounded }
   */
  function compute(save, extra) {
    extra = extra || {};
    const s = { str: 10, agi: 10, flx: 10, end: 10, vit: 10, bon: 10, cut: 0, res: 5, wil: 5, spr: 0, per: 10, reg: 0, rec: 100 };
    const m = {};
    const fl = { immune: new Set(), passives: [], extraJump: 0, onKillHeal: 0, lowHp: [], extraDay: 0, beltMinus: 0, mobAtk: 0, noRegen: false, killHeal: 0 };
    function add(mods, mult) {
      mult = mult == null ? 1 : mult;
      for (const k in mods) {
        const v = mods[k] * mult;
        if (k in s) s[k] += v; else m[k] = (m[k] || 0) + v;
      }
    }
    // 레벨이 오르면 혼력도 오른다
    const L = save.level;
    s.spr += L <= 5 ? (L - 1) * 5 : 20 + (L - 5) * 12;
    s.vit += (L - 1) * 1;
    // 영혼
    for (const so of save.souls) {
      const d = HC.getMob(so.id);
      if (!d || !d.soul) continue;
      add(d.soul.stats);
      const p = HC.PASSIVES[d.soul.passive];
      if (p) {
        fl.passives.push(p);
        if (p.mods) add(p.mods);
        if (p.immune) for (const i of p.immune) fl.immune.add(i);
        if (p.extraJump) fl.extraJump += p.extraJump;
        if (p.lowHp) fl.lowHp.push(p.lowHp);
      }
    }
    // 장비
    const eq = save.equip;
    for (const slot of ['helm', 'body', 'gloves', 'boots', 'ring', 'neck', 'weapon']) if (eq[slot]) add(HC.Gear.mods(eq[slot]));
    for (const slot of ['relic1', 'relic2']) {
      const r = eq[slot] && HC.RELICS[eq[slot]];
      if (!r) continue;
      if (r.mods) add(r.mods);
      if (r.immune) for (const i of r.immune) fl.immune.add(i);
      if (r.extraJump) fl.extraJump += r.extraJump;
      if (r.onKillHeal) fl.onKillHeal += r.onKillHeal;
      if (r.lowHp) fl.lowHp.push(r.lowHp);
      if (r.extraDay) fl.extraDay += r.extraDay;
      if (r.beltMinus) fl.beltMinus += r.beltMinus;
    }
    // 사냥 장부
    for (const id in save.kills) {
      const d = HC.getMob(id);
      if (!d || !d.card) continue;
      const st = cardStars(id, save.kills[id]);
      if (st) add({ [d.card.k]: d.card.v * st });
    }
    const sub = save.sub;
    for (const e of HC.ELIXIRS) { const lv = sub.elixirs[e.id] || 0; if (lv) add({ [e.k]: e.per * lv }); }
    for (const me of HC.MEALS) { const lv = sub.meals[me.id] || 0; if (lv) add({ [me.k]: me.per * lv }); }
    for (const t of HC.TATTOOS) { const lv = sub.tattoos[t.id] || 0; if (lv) add({ [t.k]: t.per * lv }); }
    for (const st of HC.STATUES) {
      const lv = sub.statues[st.id] || 0;
      if (lv) { add({ [st.k]: st.per * lv }); if (st.k2) add({ [st.k2]: st.per * lv }); }
    }
    for (const h of HC.HIDEOUT) { const lv = hideoutLv(save, h.id); if (lv && (h.k === 'hpPct' || h.k === 'basicDmg')) add({ [h.k]: h.per * lv }); }
    for (const id of sub.oathEquip) {
      const o = HC.OATHS.find((x) => x.id === id);
      const lv = sub.oaths[id] || 0;
      if (!o || !lv) continue;
      for (const k in o.good) {
        const v = o.good[k][0] + o.good[k][1] * (lv - 1);
        if (k === 'killHeal') fl.killHeal += v; else add({ [k]: v });
      }
      for (const k in o.bad) {
        if (k === 'mobAtk') fl.mobAtk += o.bad[k];
        else if (k === 'noRegen') fl.noRegen = true;
        else add({ [k]: o.bad[k] });
      }
    }
    // 이번 강하 한정 효과
    if (extra.run) {
      if (extra.run.tonic) add({ dmgPct: 0.15 });
      if (extra.run.torchT > 0) add({ vision: 60 });
    }
    if (extra.buffs) for (const b of extra.buffs) if (b.mods) add(b.mods);

    // ── 파생 ──
    const w = eq.weapon;
    const W = w ? HC.WTYPES[w.type] : HC.WTYPES.axe;
    const st = { s, m, fl, weapon: w, wtype: W };
    st.level = L;
    st.maxHp = Math.max(30, Math.round((110 + s.vit * 7 + (L - 1) * 12 + (m.hpFlat || 0)) * (1 + (m.hpPct || 0)) * (extra.wounded ? 0.75 : 1)));
    st.maxSta = Math.round((100 + s.end * 1.5) * (1 + (m.staPct || 0)));
    st.staRegen = Math.max(5, (30 + s.end * 0.6) * (1 + (m.staRegenPct || 0)));
    st.atk = HC.Gear.weaponDmg(w) + (m.atkFlat || 0);
    st.physMult = (1 + Math.max(-0.5, s.str) * 0.015) * (1 + (m.dmgPct || 0));
    st.basicMult = 1 + (m.basicDmg || 0);
    st.aspd = U.clamp((1 + s.agi * 0.004) * (1 + (m.aspdPct || 0)) * W.spd, 0.45, 2.4);
    st.move = 150 * U.clamp(1 + s.agi * 0.0012 + (m.movePct || 0), 0.6, 1.7);
    st.crit = U.clamp(0.05 + s.flx * 0.002 + s.per * 0.001 + (m.crit || 0), 0, 0.8);
    st.critDmg = 1.5 + s.per * 0.006 + (m.critDmg || 0);
    st.dodge = U.clamp(s.flx * 0.0012 + (m.dodge || 0), 0, 0.5);
    const bonDR = Math.max(0, s.bon) / (Math.max(0, s.bon) + 160);
    st.physDR = U.clamp(1 - (1 - bonDR) * (1 - (m.physDR || 0)), 0, 0.8);
    st.magDR = U.clamp(1 - (1 - Math.max(0, s.res) / (Math.max(0, s.res) + 150)) * (1 - (m.magDR || 0)), 0, 0.8);
    st.dmgTaken = 1 + (m.dmgTaken || 0);
    st.statusRes = U.clamp(Math.max(0, s.wil) / (Math.max(0, s.wil) + 100) + (m.statusRes || 0), 0, 0.85);
    st.fearRes = U.clamp(st.statusRes * 0.5 + (m.fearRes || 0), 0, 0.8);
    st.skillMult = (1 + Math.max(0, s.spr) * 0.01) * (1 + (m.skillDmg || 0));
    st.pen = Math.max(0, s.cut) + (m.pen || 0);
    st.regen = fl.noRegen ? 0 : Math.max(0, s.reg * 0.15 + (m.regen || 0));
    st.heal = Math.max(0.1, s.rec / 100 * (1 + (m.healPct || 0)));
    st.potion = Math.max(0.1, 1 + (m.potionPct || 0));
    st.vision = Math.max(40, 85 + s.per * 1.3 + (m.vision || 0));
    st.dashIframe = 0.17 + Math.max(0, s.flx) * 0.0007;
    st.dashCost = Math.max(5, 24 * (1 + (m.dashCost || 0)));
    st.lifesteal = m.lifesteal || 0;
    st.cdr = U.clamp(m.cdr || 0, 0, 0.5);
    st.soulDrop = 1 + (m.soulDrop || 0);
    st.stoneDrop = 1 + (m.stoneDrop || 0);
    st.matDrop = 1 + (m.matDrop || 0);
    st.expMult = 1 + (m.expPct || 0);
    st.vsElite = 1 + (m.dmgVsElite || 0);
    st.eliteChance = 1 + (m.eliteChance || 0);
    st.jumps = 2 + fl.extraJump;
    st.knockRes = U.clamp(Math.max(0, s.bon) / 300, 0, 0.7);
    // 조건부 패시브 정리
    const P = fl.passives;
    st.pack = P.find((p) => p.pack) ? P.find((p) => p.pack).pack : null;
    st.vsBleed = P.reduce((a, p) => a + (p.vsBleed || 0), 0);
    st.highHp = P.filter((p) => p.highHp).map((p) => p.highHp);
    st.night = P.filter((p) => p.night).map((p) => p.night);
    st.reflect = P.reduce((a, p) => a + (p.reflect || 0), 0);
    st.poisonRes = P.reduce((a, p) => a + (p.poisonRes || 0), 0);
    st.lowRegen = P.filter((p) => p.lowRegen).map((p) => p.lowRegen);
    st.execute = P.filter((p) => p.execute).map((p) => p.execute);
    st.killStack = P.find((p) => p.killStack) ? P.find((p) => p.killStack).killStack : null;
    st.curse = P.find((p) => p.curse) ? P.find((p) => p.curse).curse : null;
    st.still = P.reduce((a, p) => a + (p.still || 0), 0);
    st.vsAir = P.reduce((a, p) => a + (p.vsAir || 0), 0);
    st.echo = P.reduce((a, p) => a + (p.echo || 0), 0);
    st.dashDmg = P.reduce((a, p) => a + (p.dashDmg || 0), 0);
    st.airDmg = P.reduce((a, p) => a + (p.airDmg || 0), 0);
    st.noKnock = P.some((p) => p.noKnock);
    st.backstab = P.reduce((a, p) => a + (p.backstab || 0), 0);
    st.detect = P.some((p) => p.detect);
    st.lowHp = fl.lowHp.concat(P.filter((p) => p.lowHp).map((p) => p.lowHp));
    st.killHeal = fl.onKillHeal + fl.killHeal;
    st.mobAtk = 1 + fl.mobAtk;
    st.belt = HC.BASE_BELT + hideoutLv(save, 'belt') - fl.beltMinus;
    st.bag = HC.BASE_BAG + hideoutLv(save, 'bag') * 4;
    st.immune = fl.immune;
    st.extraDay = fl.extraDay;
    return st;
  }

  function nextExp(level) { return HC.EXP_TABLE[Math.min(HC.EXP_TABLE.length - 1, level + 1)] || Infinity; }

  return { compute, cardStars, grade, nextExp, hideoutLv };
})();
