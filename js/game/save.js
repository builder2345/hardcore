'use strict';
// 저장 데이터. localStorage가 막혀 있어도 게임은 돌아가야 하므로 실패는 조용히 무시한다.
HC.Save = (function () {
  const KEY = 'naraak_save_v1';
  function fresh() {
    return {
      v: 1, created: Date.now(),
      level: 1, exp: 0,
      souls: [],                       // 흡수한 영혼 {id, color}
      skillSlots: [null, null, null, null],
      equip: { weapon: HC.Gear.weapon('axe', 1), helm: null, body: HC.Gear.armor('body', 1), gloves: null, boots: null, ring: null, neck: null, relic1: null, relic2: null },
      gear: [],                        // 보관 중인 장비
      relics: [],                      // 보관 중인 각인 유물 id
      kron: 400,
      stash: { glowMoss: 2 },          // 도시 창고 (재료)
      soulOrbs: [],                    // 흡수하지 않은 영혼 구슬 {id, color}
      potions: { smallPotion: 4, bigPotion: 0 },
      items: { antidote: 1, torch: 2, talisman: 0, battleTonic: 0 },
      wounded: false,
      maxFloor: 1,
      kills: {}, seen: {}, hints: {},
      flags: { lordKilled: {}, calamityKilled: {}, guardianKilled: {}, tutorial: false },
      sub: {
        gather: {
          mine: { lv: 1, exp: 0, tool: 0, target: 'ironOre', manualAt: 0, acc: 0 },
          wood: { lv: 1, exp: 0, tool: 0, target: 'deadWood', manualAt: 0, acc: 0 },
          fish: { lv: 1, exp: 0, tool: 0, target: 'blindCatfish', manualAt: 0, acc: 0 },
        },
        workers: { hired: 1, mine: 1, wood: 0, fish: 0 },
        lastTick: Date.now(),
        elixirs: {}, meals: {}, tattoos: {}, statues: {}, statueDep: {},
        faith: 0, oaths: {}, oathEquip: [], hideout: {},
      },
      stats: { descents: 0, deaths: 0, bestFloor: 1, playTime: 0, escapes: 0 },
      run: null,
      cycle: 1,
      settings: { vol: 0.6, muted: false, shake: true },
    };
  }
  function migrate(s) {
    const f = fresh();
    // 누락 필드 보충 (얕은 병합 + sub는 한 단계 더)
    for (const k in f) if (s[k] === undefined) s[k] = f[k];
    for (const k in f.sub) if (s.sub[k] === undefined) s.sub[k] = f.sub[k];
    for (const k in f.sub.gather) if (!s.sub.gather[k]) s.sub.gather[k] = f.sub.gather[k];
    for (const k in f.flags) if (s.flags[k] === undefined) s.flags[k] = f.flags[k];
    for (const k in f.equip) if (s.equip[k] === undefined) s.equip[k] = null;
    return s;
  }
  return {
    KEY,
    fresh,
    load() {
      const raw = HC.U.storage.get(KEY);
      if (!raw) return null;
      try { return migrate(JSON.parse(raw)); } catch (e) { return null; }
    },
    write(s) {
      try { return HC.U.storage.set(KEY, JSON.stringify(s)); } catch (e) { return false; }
    },
    wipe() { HC.U.storage.del(KEY); },
    exportStr(s) { try { return btoa(unescape(encodeURIComponent(JSON.stringify(s)))); } catch (e) { return ''; } },
    importStr(str) {
      try { return migrate(JSON.parse(decodeURIComponent(escape(atob(str.trim()))))); } catch (e) { return null; }
    },
  };
})();
