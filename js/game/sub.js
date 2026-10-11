'use strict';
// 도시 서브컨텐츠 로직: 방치 채집, 제작, 강화, 영약, 요리, 혈문, 위령비, 서약, 은신처, 상점, 교환.
HC.soulActives = function (soul) {
  const d = HC.getMob(soul.id);
  if (!d || !d.soul) return [];
  const c = d.soul.colors[soul.color] || d.soul.colors[0];
  if (c.all) return c.all.slice();
  return c.a ? [c.a] : [];
};

HC.Sub = (function () {
  const U = HC.U;
  const S = () => HC.G.save;

  // ── 지불 ──
  function count(id) { return S().stash[id] || 0; }
  function has(mats, kron) {
    const s = S();
    if (kron && s.kron < kron) return false;
    for (const k in mats || {}) if (k !== 'kron' && count(k) < mats[k]) return false;
    return true;
  }
  function pay(mats, kron) {
    if (!has(mats, kron)) return false;
    const s = S();
    if (kron) s.kron -= kron;
    for (const k in mats || {}) if (k !== 'kron') { s.stash[k] -= mats[k]; if (s.stash[k] <= 0) delete s.stash[k]; }
    return true;
  }
  function give(id, n) { const s = S(); s.stash[id] = (s.stash[id] || 0) + n; }
  function costText(mats, kron) {
    const parts = [];
    if (kron) parts.push('<span class="' + (S().kron >= kron ? 'ok' : 'no') + '">' + U.fmt(kron) + ' 크론</span>');
    for (const k in mats || {}) {
      if (k === 'kron') continue;
      const it = HC.ITEMS[k];
      parts.push('<span class="' + (count(k) >= mats[k] ? 'ok' : 'no') + '">' + (it ? it.n : k) + ' ' + count(k) + '/' + mats[k] + '</span>');
    }
    return parts.join(' · ');
  }
  function stats() { return HC.Stats.compute(S(), {}); }

  // ── 채집 ──
  function workerCap() { return HC.BASE_WORKERS + (S().sub.hideout.quarters || 0); }
  function idleCapH() { return HC.BASE_IDLE_CAP + (S().sub.hideout.store || 0) * 2; }
  function siteRate(site) {
    const s = S(), g = s.sub.gather[site];
    const def = HC.GATHER[site];
    const res = def.res.find((r) => r.id === g.target) || def.res[0];
    const gp = stats().m.gatherPct || 0;
    return res.rate * (1 + 0.04 * (g.lv - 1)) * (1 + 0.25 * g.tool) * (1 + gp);
  }
  function addGather(site, units) {
    const s = S(), g = s.sub.gather[site];
    const def = HC.GATHER[site];
    const res = def.res.find((r) => r.id === g.target) || def.res[0];
    give(res.id, units);
    g.exp += units * res.exp;
    let up = false;
    while (g.exp >= HC.gatherExpNeed(g.lv)) { g.exp -= HC.gatherExpNeed(g.lv); g.lv++; up = true; }
    if (up && HC.UI && HC.G.player) HC.UI.toast(def.n + ' ' + def.verb + ' 숙련 ' + g.lv, 2);
    return res.id;
  }
  function simulate(sec) {
    const s = S();
    const gains = {};
    for (const site in HC.GATHER) {
      const n = s.sub.workers[site] || 0;
      if (!n) continue;
      const g = s.sub.gather[site];
      g.acc = (g.acc || 0) + siteRate(site) * n * sec / 60;
      const units = Math.floor(g.acc);
      if (units > 0) { g.acc -= units; const id = addGather(site, units); gains[id] = (gains[id] || 0) + units; }
    }
    return gains;
  }
  let lastReal = Date.now();
  function tick() {
    const s = S();
    if (!s) return;
    const now = Date.now();
    const dt = Math.min(10, (now - lastReal) / 1000);
    lastReal = now;
    simulate(dt);
    s.sub.lastTick = now;
  }
  function offline() {
    const s = S();
    const now = Date.now();
    lastReal = now;
    let sec = (now - (s.sub.lastTick || now)) / 1000;
    if (sec < 60) { s.sub.lastTick = now; return null; }
    const cap = idleCapH() * 3600;
    const capped = sec > cap;
    sec = Math.min(sec, cap);
    const gains = simulate(sec);
    s.sub.lastTick = now;
    return { sec, capped, gains };
  }
  function manual(site) {
    const s = S(), g = s.sub.gather[site];
    const now = Date.now();
    const left = 45 - (now - (g.manualAt || 0)) / 1000;
    if (left > 0) return { ok: false, msg: Math.ceil(left) + '초 뒤에 다시 할 수 있다' };
    g.manualAt = now;
    const units = Math.max(1, Math.round(siteRate(site) * 3));
    const id = addGather(site, units);
    return { ok: true, msg: HC.ITEMS[id].n + ' ' + units + '개를 얻었다' };
  }
  function hire() {
    const s = S(), w = s.sub.workers;
    if (w.hired >= workerCap()) return { ok: false, msg: '숙소가 비좁다. 은신처에서 일꾼 숙소를 늘려라' };
    const c = HC.workerCost(w.hired);
    if (!pay({}, c)) return { ok: false, msg: '크론이 모자라다' };
    w.hired++;
    return { ok: true, msg: '일꾼을 하나 더 들였다' };
  }
  function assigned() { const w = S().sub.workers; return (w.mine || 0) + (w.wood || 0) + (w.fish || 0); }
  function assign(site, d) {
    const w = S().sub.workers;
    if (d > 0 && assigned() >= w.hired) return { ok: false, msg: '남는 일꾼이 없다' };
    if (d < 0 && (w[site] || 0) <= 0) return { ok: false };
    simulate(0);
    w[site] = (w[site] || 0) + d;
    return { ok: true };
  }
  function setTarget(site, id) {
    const g = S().sub.gather[site];
    const r = HC.GATHER[site].res.find((x) => x.id === id);
    if (!r || g.lv < r.lv) return { ok: false, msg: '숙련 ' + (r ? r.lv : '?') + ' 필요' };
    g.acc = 0; g.target = id;
    return { ok: true };
  }
  function toolUp(site) {
    const g = S().sub.gather[site];
    if (g.tool >= 8) return { ok: false, msg: '더 좋은 도구는 없다' };
    const c = HC.toolCost(g.tool);
    if (!pay({ [c.mat]: c.n }, c.kron)) return { ok: false, msg: '재료가 모자라다' };
    g.tool++;
    return { ok: true, msg: HC.GATHER[site].tool + ' +' + g.tool };
  }

  // ── 대장간 ──
  function craftGear(kind, sub, tier) {
    const c = HC.smithCost(kind, tier);
    if (!pay(c.mats, c.kron)) return { ok: false, msg: '재료가 모자라다' };
    const g = kind === 'weapon' ? HC.Gear.weapon(sub, tier) : HC.Gear.armor(sub, tier);
    S().gear.push(g);
    return { ok: true, msg: HC.Gear.name(g) + ' 완성', g };
  }
  function craftAcc(id) {
    const A = HC.ACCS[id];
    if (!pay(A.cost, A.kron)) return { ok: false, msg: '재료가 모자라다' };
    const g = HC.Gear.acc(id);
    S().gear.push(g);
    return { ok: true, msg: A.n + ' 완성', g };
  }
  function findGear(uid) {
    const s = S();
    for (const k in s.equip) if (s.equip[k] && s.equip[k].uid === uid) return { g: s.equip[k], slot: k };
    const g = s.gear.find((x) => x.uid === uid);
    return g ? { g, slot: null } : null;
  }
  function enhance(uid, protect) {
    const f = findGear(uid);
    if (!f) return { ok: false };
    const g = f.g;
    if (g.enh >= 10) return { ok: false, msg: '이미 한계까지 강화되었다' };
    const tier = g.kind === 'acc' ? 4 : g.tier;
    const c = HC.enhCost({ tier, enh: g.enh });
    const mats = { [c.ore]: c.n };
    if (protect) mats.riftStone = 1;
    if (!pay(mats, c.kron)) return { ok: false, msg: '재료가 모자라다' };
    const rate = HC.ENH_RATE[g.enh];
    if (Math.random() < rate) {
      g.enh++;
      return { ok: true, msg: '강화 성공! +' + g.enh, good: true };
    }
    // 실패
    if (g.enh >= 7 && !protect && Math.random() < 0.3) {
      const s = S();
      if (f.slot) s.equip[f.slot] = null; else s.gear = s.gear.filter((x) => x.uid !== uid);
      if (f.slot === 'weapon') s.equip.weapon = HC.Gear.weapon('axe', 1);
      return { ok: true, msg: '강화 실패… 장비가 부서졌다', bad: true, broke: true };
    }
    if (g.enh >= 4 && !protect) { g.enh--; return { ok: true, msg: '강화 실패. 단계가 떨어졌다 (+' + g.enh + ')', bad: true }; }
    return { ok: true, msg: '강화 실패', bad: true };
  }
  function equip(uid) {
    const s = S();
    const g = s.gear.find((x) => x.uid === uid);
    if (!g) return { ok: false };
    let slot = g.kind === 'weapon' ? 'weapon' : g.kind === 'armor' ? g.slot : HC.ACCS[g.id].slot;
    const old = s.equip[slot];
    s.gear = s.gear.filter((x) => x.uid !== uid);
    if (old) s.gear.push(old);
    s.equip[slot] = g;
    return { ok: true };
  }
  function unequip(slot) {
    const s = S();
    if (slot === 'weapon') return { ok: false, msg: '맨손으로 나락에 갈 셈인가' };
    const g = s.equip[slot];
    if (!g) return { ok: false };
    if (slot === 'relic1' || slot === 'relic2') { s.relics.push(g); s.equip[slot] = null; return { ok: true }; }
    s.gear.push(g); s.equip[slot] = null;
    return { ok: true };
  }
  function equipRelic(id) {
    const s = S();
    const i = s.relics.indexOf(id);
    if (i < 0) return { ok: false };
    let slot = !s.equip.relic1 ? 'relic1' : !s.equip.relic2 ? 'relic2' : 'relic1';
    if (s.equip[slot]) s.relics.push(s.equip[slot]);
    s.relics.splice(s.relics.indexOf(id), 1);
    s.equip[slot] = id;
    return { ok: true };
  }

  // ── 연금 / 요리 / 혈문 / 위령비 ──
  function elixirUp(id) {
    const s = S(), e = HC.ELIXIRS.find((x) => x.id === id);
    const lv = s.sub.elixirs[id] || 0;
    if (lv >= e.max) return { ok: false, msg: '최대 단계' };
    if (s.maxFloor < e.floor) return { ok: false, msg: e.floor + '층에 다녀와야 재료를 안다' };
    const c = HC.elixirCost(e, lv);
    if (!pay(c.mats, c.kron)) return { ok: false, msg: '재료가 모자라다' };
    s.sub.elixirs[id] = lv + 1;
    return { ok: true, msg: e.n + ' ' + (lv + 1) + '단계' };
  }
  function brew(id) {
    const b = HC.BREWS.find((x) => x.id === id);
    const s = S();
    if (!pay(b.mats, b.kron)) return { ok: false, msg: '재료가 모자라다' };
    if (HC.ITEMS[id].cat === 'potion') {
      const st = stats();
      const total = (s.potions.smallPotion || 0) + (s.potions.bigPotion || 0);
      const room = Math.max(0, st.belt - total);
      const add = Math.min(room, b.out);
      s.potions[id] = (s.potions[id] || 0) + add;
      if (b.out - add > 0) s.stash[id] = (s.stash[id] || 0) + (b.out - add);
    } else s.items[id] = (s.items[id] || 0) + b.out;
    return { ok: true, msg: HC.ITEMS[id].n + ' ' + b.out + '개 완성' };
  }
  function mealUp(id) {
    const s = S(), m = HC.MEALS.find((x) => x.id === id);
    const lv = s.sub.meals[id] || 0;
    if (lv >= HC.MEAL_MAX) return { ok: false, msg: '최대 단계' };
    if (!pay(HC.mealCost(m, lv), 0)) return { ok: false, msg: '재료가 모자라다' };
    s.sub.meals[id] = lv + 1;
    return { ok: true, msg: m.n + ' ' + (lv + 1) + '단계' };
  }
  function tattooUnlocked(t) { return !t.design || (S().sub.tattoos[t.id] || 0) > 0 || count(t.design) > 0; }
  function tattooUp(id) {
    const s = S(), t = HC.TATTOOS.find((x) => x.id === id);
    const lv = s.sub.tattoos[id] || 0;
    if (lv >= HC.TATTOO_MAX) return { ok: false, msg: '최대 단계' };
    if (!tattooUnlocked(t)) return { ok: false, msg: '도안이 없다' };
    const c = HC.tattooCost(t, lv);
    const mats = { [t.mat]: c.n };
    if (t.design && lv === 0) mats[t.design] = 1;
    if (!pay(mats, c.kron)) return { ok: false, msg: '재료가 모자라다' };
    s.sub.tattoos[id] = lv + 1;
    return { ok: true, msg: t.n + ' ' + (lv + 1) + '단계' };
  }
  function statueNeed(lv) { return lv + 1; }
  function statueDeposit(id) {
    const s = S(), st = HC.STATUES.find((x) => x.id === id);
    const lv = s.sub.statues[id] || 0;
    if (lv >= HC.STATUE_MAX) return { ok: false, msg: '최대 단계' };
    const need = statueNeed(lv);
    if (!pay({ [st.frag]: need }, 0)) return { ok: false, msg: '파편이 모자라다' };
    s.sub.statues[id] = lv + 1;
    return { ok: true, msg: st.n + ' ' + (lv + 1) + '단계' };
  }

  // ── 영혼 / 신앙 / 서약 ──
  function absorb(from, idx) {
    const G = HC.G, s = S();
    const list = from === 'run' ? G.run.orbs : s.soulOrbs;
    const orb = list[idx];
    if (!orb) return { ok: false };
    if (s.souls.length >= s.level) return { ok: false, msg: '영혼 슬롯이 가득 찼다 (레벨 ' + s.level + ' = ' + s.level + '칸). 레벨을 올리거나 영혼 제단에서 지워라' };
    if (s.souls.some((x) => x.id === orb.id)) return { ok: false, msg: '같은 몬스터의 영혼은 둘 이상 담을 수 없다' };
    list.splice(idx, 1);
    s.souls.push({ id: orb.id, color: orb.color });
    for (const a of HC.soulActives(orb)) {
      const empty = s.skillSlots.indexOf(null);
      if (empty >= 0 && !s.skillSlots.includes(a)) s.skillSlots[empty] = a;
    }
    if (G.player) G.player.statDirty = true;
    HC.UI.dirty = true;
    return { ok: true, msg: U.josa(HC.World.soulName(orb.id, orb.color), '을', '를') + ' 흡수했다' };
  }
  function removeSoul(i) {
    const s = S();
    const so = s.souls[i];
    if (!so) return { ok: false };
    const d = HC.getMob(so.id);
    const cost = 150 * (10 - d.grade) * (10 - d.grade);
    if (!pay({}, cost)) return { ok: false, msg: U.fmt(cost) + ' 크론이 필요하다' };
    s.souls.splice(i, 1);
    const acts = HC.soulActives(so);
    s.skillSlots = s.skillSlots.map((x) => (acts.includes(x) ? null : x));
    if (HC.G.player) HC.G.player.statDirty = true;
    HC.UI.dirty = true;
    return { ok: true, msg: '영혼을 지웠다. 그 자리가 텅 비었다' };
  }
  function soulRemoveCost(so) { const d = HC.getMob(so.id); return 150 * (10 - d.grade) * (10 - d.grade); }
  function availableSkills() {
    const out = [];
    for (const so of S().souls) for (const a of HC.soulActives(so)) if (!out.includes(a)) out.push(a);
    return out;
  }
  function setSlot(slot, id) {
    const s = S();
    const i = s.skillSlots.indexOf(id);
    if (i >= 0) s.skillSlots[i] = s.skillSlots[slot];
    s.skillSlots[slot] = id;
    HC.UI.dirty = true;
  }
  function offer(idx) {
    const s = S(), orb = s.soulOrbs[idx];
    if (!orb) return { ok: false };
    const d = HC.getMob(orb.id);
    const f = HC.faithFor(d.grade);
    s.soulOrbs.splice(idx, 1);
    s.sub.faith += f;
    return { ok: true, msg: '신앙 +' + f };
  }
  function oathUp(id) {
    const s = S(), o = HC.OATHS.find((x) => x.id === id);
    const lv = s.sub.oaths[id] || 0;
    if (lv >= HC.OATH_MAX) return { ok: false, msg: '최대 단계' };
    const cost = lv === 0 ? o.unlock : HC.oathLvCost(lv);
    if (s.sub.faith < cost) return { ok: false, msg: '신앙이 모자라다' };
    s.sub.faith -= cost;
    s.sub.oaths[id] = lv + 1;
    return { ok: true, msg: lv === 0 ? U.josa(o.n, '을', '를') + ' 배웠다' : o.n + ' ' + (lv + 1) + '단계' };
  }
  function oathToggle(id) {
    const s = S();
    const slots = 1 + (s.sub.hideout.shrine || 0);
    const eq = s.sub.oathEquip;
    if (eq.includes(id)) { s.sub.oathEquip = eq.filter((x) => x !== id); return { ok: true, msg: '서약을 거두었다' }; }
    if (!(s.sub.oaths[id] > 0)) return { ok: false };
    if (eq.length >= slots) eq.shift();
    eq.push(id);
    return { ok: true, msg: '서약을 맺었다' };
  }

  // ── 은신처 ──
  function hideoutUp(id) {
    const s = S(), h = HC.HIDEOUT.find((x) => x.id === id);
    const lv = s.sub.hideout[id] || 0;
    if (lv >= h.max) return { ok: false, msg: '더 늘릴 수 없다' };
    const c = h.cost(lv);
    const kron = Math.floor(c.kron || 0);
    const mats = Object.assign({}, c); delete mats.kron;
    if (!pay(mats, kron)) return { ok: false, msg: '재료가 모자라다' };
    s.sub.hideout[id] = lv + 1;
    return { ok: true, msg: h.n + ' ' + (lv + 1) + '단계' };
  }

  // ── 상점 / 교환 ──
  function stoneRate() { const g = HC.Stats.grade(S()).grade; return Math.round(10 * (1 + 0.06 * (9 - g))); }
  function sellStones(n) {
    const s = S();
    n = Math.min(n, s.stones || 0);
    if (n <= 0) return { ok: false, msg: '팔 흑석이 없다' };
    const k = Math.floor(n * stoneRate() * (1 + (stats().m.kronPct || 0)));
    s.stones -= n; s.kron += k;
    return { ok: true, msg: '흑석 ' + U.fmt(n) + '개 → ' + U.fmt(k) + ' 크론' };
  }
  function sellMat(id, n) {
    const s = S(), it = HC.ITEMS[id];
    n = Math.min(n, count(id));
    if (n <= 0) return { ok: false };
    const price = it.sell != null ? it.sell : it.price;
    s.stash[id] -= n; if (s.stash[id] <= 0) delete s.stash[id];
    s.kron += price * n;
    return { ok: true, msg: it.n + ' ' + n + '개 → ' + U.fmt(price * n) + ' 크론' };
  }
  function orbPrice(orb) { const d = HC.getMob(orb.id); const base = [0, 900000, 300000, 90000, 30000, 10000, 3500, 1200, 450, 160][d.grade] || 100; return d.soul && d.soul.rainbow ? base * 3 : base; }
  function sellOrb(idx) {
    const s = S(), orb = s.soulOrbs[idx];
    if (!orb) return { ok: false };
    const p = orbPrice(orb);
    s.soulOrbs.splice(idx, 1); s.kron += p;
    return { ok: true, msg: '영혼을 팔았다 → ' + U.fmt(p) + ' 크론' };
  }
  function sellGear(uid) {
    const s = S(), g = s.gear.find((x) => x.uid === uid);
    if (!g) return { ok: false };
    const p = HC.Gear.sellPrice(g);
    s.gear = s.gear.filter((x) => x.uid !== uid); s.kron += p;
    return { ok: true, msg: HC.Gear.name(g) + ' → ' + U.fmt(p) + ' 크론' };
  }
  function sellRelic(id) {
    const s = S(), i = s.relics.indexOf(id);
    if (i < 0) return { ok: false };
    s.relics.splice(i, 1); s.kron += 25000;
    return { ok: true, msg: '각인 유물을 넘겼다 → 25,000 크론' };
  }
  function buy(id, n) {
    const s = S(), it = HC.ITEMS[id];
    const cost = it.price * n;
    if (it.cat === 'potion') {
      const st = stats();
      const total = (s.potions.smallPotion || 0) + (s.potions.bigPotion || 0);
      if (total + n > st.belt) return { ok: false, msg: '물약 거치대가 가득 찼다 (' + st.belt + '개)' };
    }
    if (!pay({}, cost)) return { ok: false, msg: '크론이 모자라다' };
    if (it.cat === 'potion') s.potions[id] = (s.potions[id] || 0) + n; else s.items[id] = (s.items[id] || 0) + n;
    return { ok: true, msg: it.n + ' ' + n + '개 구입' };
  }
  function moveStashPotions() {
    const s = S(), st = stats();
    let moved = 0;
    for (const id of ['bigPotion', 'smallPotion']) {
      while ((s.stash[id] || 0) > 0 && (s.potions.smallPotion || 0) + (s.potions.bigPotion || 0) < st.belt) { s.stash[id]--; s.potions[id] = (s.potions[id] || 0) + 1; moved++; }
      if (s.stash[id] <= 0) delete s.stash[id];
    }
    return moved;
  }
  function healCost() { return 120 * S().maxFloor * S().maxFloor; }
  function heal() {
    const s = S();
    if (!s.wounded) return { ok: false, msg: '다친 데가 없다' };
    if (!pay({}, healCost())) return { ok: false, msg: '크론이 모자라다' };
    s.wounded = false;
    if (HC.G.player) HC.G.player.statDirty = true;
    return { ok: true, msg: '상처를 꿰맸다' };
  }
  function buyHint(key, cost) {
    const s = S();
    if (s.hints[key]) return { ok: false };
    if (!pay({}, cost)) return { ok: false, msg: '크론이 모자라다' };
    s.hints[key] = true;
    return { ok: true, msg: '정보를 샀다' };
  }

  return {
    count, has, pay, give, costText, stats,
    workerCap, idleCapH, siteRate, tick, offline, manual, hire, assign, assigned, setTarget, toolUp,
    craftGear, craftAcc, enhance, equip, unequip, equipRelic, findGear,
    elixirUp, brew, mealUp, tattooUnlocked, tattooUp, statueNeed, statueDeposit,
    absorb, removeSoul, soulRemoveCost, availableSkills, setSlot, offer, oathUp, oathToggle,
    hideoutUp, stoneRate, sellStones, sellMat, orbPrice, sellOrb, sellGear, sellRelic, buy, moveStashPotions, healCost, heal, buyHint,
  };
})();
