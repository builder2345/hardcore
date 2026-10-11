'use strict';
// 재료·소모품·장비·각인 유물.
HC.ITEMS = {};
(function () {
  const I = HC.ITEMS;
  function mat(id, n, price, d, col, cat) { I[id] = { id, n, price, d, col: col || '#a0a0a0', cat: cat || 'mat' }; }
  // 1층
  mat('goblinEar', '잔귀의 귀', 6, '말린 귀. 혈문 각인 재료.', '#7a8a5a');
  mat('wolfFang', '칼이빨', 8, '늑대의 칼날 같은 송곳니.', '#d0d0c0');
  mat('gnomeHeart', '흙심장', 9, '굴토인의 굳은 심장. 흙냄새가 난다.', '#8a6a40');
  mat('rotFlesh', '썩은 살점', 5, '송장의 살. 비위만 버티면 요리에도 연금에도 들어간다.', '#6a7a4a');
  mat('blueShard', '청석 파편', 12, '청석 결정 조각. 은은하게 빛난다.', '#62c8ff');
  mat('glowMoss', '청석 이끼', 7, '결정 근처에서 자라는 이끼. 물약의 기본 재료.', '#5ab0a0', 'herb');
  // 2층
  mat('lizardScale', '녹슨 견갑', 22, '약탈자들이 어깨에 걸치던 쇳조각. 녹을 벗기면 쓸 만하다.', '#8a9a60');
  mat('scorpShell', '거미 갑각', 26, '독이 배어 있는 갑각.', '#6a4a30');
  mat('ashEssence', '망령의 재', 30, '흩어진 망령이 남긴 재.', '#a09890');
  mat('golemCore', '오우거 심장석', 34, '오우거 가슴에 박혀 있던 돌. 아직 따뜻하다.', '#ffb060');
  mat('emberHerb', '잿꽃', 18, '재 속에서 피는 꽃.', '#ff7040', 'herb');
  // 3층
  mat('noose', '썩은 밧줄', 60, '목매단 시체의 밧줄.', '#8a7a5a');
  mat('witchEye', '마녀의 눈', 85, '아직도 깜빡인다.', '#a0ff80');
  mat('heartwood', '뒤틀린 심재', 90, '수목인의 심재. 무겁고 단단하다.', '#7a5a30');
  mat('crowFeather', '검은 깃털', 55, '빛을 먹는 깃털.', '#303040');
  mat('mistCap', '안개버섯', 45, '안개를 머금은 버섯.', '#c0d0c0', 'herb');
  // 4층
  mat('statueChip', '석상 조각', 160, '살아 있던 돌.', '#a0a0b0');
  mat('harpyPlume', '늑대인간 갈기', 150, '은빛이 도는 뻣뻣한 털. 비린내가 빠지지 않는다.', '#c0b0e0');
  mat('phantomSteel', '망령 강철', 220, '반쯤 투명한 금속.', '#9ab0ff');
  mat('shadowSilk', '그림자 비단', 210, '손에 쥐면 사라질 것 같다.', '#504060');
  mat('starMoss', '별이끼', 120, '떨어진 별빛에서 자란 이끼.', '#e8e0ff', 'herb');
  // 공통 희귀
  mat('scarMark', '흉터 표식', 150, '이형을 쓰러뜨린 증거. 고급 제작 재료.', '#e06040', 'rare');
  mat('lordSigil', '층주의 인장', 2500, '층주가 남긴 인장. 손에 쥐면 차갑다.', '#c080ff', 'rare');
  mat('calamityHeart', '재앙의 심장', 20000, '아직 뛰고 있다.', '#ff3050', 'rare');
  mat('riftStone', '열극석', 1800, '열극의 파수꾼에게서만 나온다. 강화 보호에 쓰인다.', '#ff4060', 'rare');
  mat('abyssAsh', '나락의 재', 40, '잠식종이 남긴 검은 재.', '#6a4a8a', 'rare');
  // 위령 파편
  mat('frag1', '청석 위령 파편', 80, '위령비에 바치는 파편 (1층).', '#7ab8d0', 'frag');
  mat('frag2', '잿빛 위령 파편', 180, '위령비에 바치는 파편 (2층).', '#c09070', 'frag');
  mat('frag3', '안개 위령 파편', 400, '위령비에 바치는 파편 (3층).', '#a0c0b0', 'frag');
  mat('frag4', '별빛 위령 파편', 900, '위령비에 바치는 파편 (4층).', '#d0c8ff', 'frag');
  // 혈문 도안
  const designs = { design_rage: '분노', design_fang: '송곳니', design_abyss: '심연', design_venom: '독침', design_scale: '비늘', design_ash: '재', design_hex: '저주', design_root: '뿌리', design_shadow: '그림자' };
  for (const k in designs) mat(k, '혈문 도안: ' + designs[k], 300, '혈문 각인소에 가져가면 새 혈문을 새길 수 있다.', '#d04040', 'design');
  // 채집
  mat('ironOre', '철광석', 4, '폐갱도의 흔한 광석.', '#8a8a8a', 'ore');
  mat('darkIron', '흑철', 14, '검게 녹슨 듯한 철.', '#4a4a5a', 'ore');
  mat('bloodCrystal', '혈수정', 45, '붉은 맥이 흐르는 수정.', '#c03040', 'ore');
  mat('stigmaOre', '성흔석', 140, '누군가의 상처가 굳은 돌.', '#e0c0ff', 'ore');
  mat('deadWood', '고사목', 3, '말라 죽은 나무.', '#7a6a50', 'wood');
  mat('blackOak', '검은 참나무', 12, '검게 변한 참나무.', '#3a3020', 'wood');
  mat('boneWood', '뼈나무', 40, '뼈처럼 하얀 나무.', '#e0d8c0', 'wood');
  mat('soulWood', '혼백목', 130, '울음소리가 나는 나무.', '#a0c0d0', 'wood');
  mat('blindCatfish', '눈먼 메기', 4, '검은 우물의 눈 없는 메기.', '#6a6a5a', 'fish');
  mat('wellEel', '우물 장어', 13, '끈적이는 장어.', '#4a5a4a', 'fish');
  mat('paleAngler', '창백한 아귀', 42, '스스로 빛을 낸다.', '#d0d0b0', 'fish');
  mat('ghostFish', '망령어', 135, '반쯤 비치는 물고기.', '#b0d0e0', 'fish');

  // 소모품
  I.smallPotion = { id: 'smallPotion', n: '붉은 물약', cat: 'potion', heal: 0.35, price: 60, sell: 15, d: '1.2초에 걸쳐 최대 체력 35% 회복.', col: '#d03030' };
  I.bigPotion = { id: 'bigPotion', n: '진한 붉은 물약', cat: 'potion', heal: 0.65, price: 280, sell: 60, d: '1.2초에 걸쳐 최대 체력 65% 회복.', col: '#ff2040' };
  I.antidote = { id: 'antidote', n: '해독제', cat: 'consum', price: 45, sell: 10, d: '중독·출혈·화상 해제, 8초간 면역. (Q로 물약 대신 쓰려면 가방에서)', col: '#80c060' };
  I.torch = { id: 'torch', n: '횃불', cat: 'consum', price: 30, sell: 6, d: '나락에서 하루 동안 시야 +60.', col: '#ffa040' };
  I.talisman = { id: 'talisman', n: '탈출 부적', cat: 'consum', price: 1800, sell: 300, d: 'T: 6초간 집중하면 가진 것을 들고 도시로 빠져나온다. 피격 시 끊긴다.', col: '#e0d080' };
  I.battleTonic = { id: 'battleTonic', n: '투지의 영약', cat: 'consum', price: 0, sell: 120, d: '이번 강하 동안 피해 +15%. 강하 시작 시 자동 사용.', col: '#ff6040' };
})();

// ── 장비 ──
HC.WTYPES = {
  axe: { n: '도끼', dmg: 1.0, spd: 1.0, reach: 30, h: 26, combo: 3, stagger: 1, d: '균형 잡힌 무기.' },
  greatsword: { n: '대검', dmg: 1.5, spd: 0.7, reach: 42, h: 32, combo: 2, stagger: 2.2, d: '느리지만 넓고 무겁다. 적을 크게 경직시킨다.' },
  mace: { n: '철퇴', dmg: 1.25, spd: 0.85, reach: 28, h: 26, combo: 3, stagger: 1.7, pen: 6, d: '방어 관통 +6. 단단한 적에게 강하다.' },
  spear: { n: '창', dmg: 0.95, spd: 0.95, reach: 52, h: 12, combo: 3, stagger: 0.9, d: '길고 좁은 찌르기.' },
  daggers: { n: '쌍단검', dmg: 0.58, spd: 1.65, reach: 22, h: 22, combo: 4, stagger: 0.5, crit: 0.06, d: '빠른 연타. 치명타 +6%.' },
};
HC.TIERS = [null,
  { n: '녹슨', w: 14, hp: 14, bon: 2, res: 1, col: '#8a7a6a' },
  { n: '철', w: 24, hp: 34, bon: 5, res: 3, col: '#a0a0a8' },
  { n: '흑철', w: 40, hp: 70, bon: 9, res: 6, col: '#5a5a70' },
  { n: '혈수정', w: 66, hp: 130, bon: 15, res: 10, col: '#c03040' },
  { n: '성흔', w: 105, hp: 220, bon: 24, res: 16, col: '#e0c0ff' },
];
HC.ASLOTS = {
  helm: { n: '투구', hp: 0.7, bon: 0.6, res: 0.8, extra: { per: 1 } },
  body: { n: '갑옷', hp: 1.6, bon: 1.2, res: 1.0, extra: { vit: 1 } },
  gloves: { n: '장갑', hp: 0.4, bon: 0.4, res: 0.4, extra: { str: 1.2, cut: 0.6 } },
  boots: { n: '장화', hp: 0.5, bon: 0.5, res: 0.5, extra: { agi: 1, flx: 0.8 } },
};
// 장신구 (고정 능력)
HC.ACCS = {
  scarRing: { n: '흉터 반지', slot: 'ring', mods: { str: 4, crit: 0.03 }, cost: { scarMark: 3, goblinEar: 10 }, kron: 1500 },
  fangNeck: { n: '송곳니 목걸이', slot: 'neck', mods: { agi: 5, movePct: 0.04 }, cost: { wolfFang: 12, scarMark: 2 }, kron: 1500 },
  shardRing: { n: '결정 반지', slot: 'ring', mods: { res: 6, bon: 4 }, cost: { blueShard: 20, scarMark: 2 }, kron: 1800 },
  scaleRing: { n: '비늘 반지', slot: 'ring', mods: { str: 6, physDR: 0.04 }, cost: { lizardScale: 15, scarMark: 4 }, kron: 6000 },
  ashNeck: { n: '망령 목걸이', slot: 'neck', mods: { spr: 10, skillDmg: 0.06 }, cost: { ashEssence: 15, scarMark: 4 }, kron: 6000 },
  eyeNeck: { n: '마녀의 눈 목걸이', slot: 'neck', mods: { spr: 16, crit: 0.05 }, cost: { witchEye: 12, scarMark: 6 }, kron: 25000 },
  heartRing: { n: '심재 반지', slot: 'ring', mods: { vit: 14, reg: 3 }, cost: { heartwood: 12, scarMark: 6 }, kron: 25000 },
  sigilRing: { n: '층주의 인장 반지', slot: 'ring', mods: { dmgPct: 0.08, hpPct: 0.08 }, cost: { lordSigil: 2, riftStone: 1 }, kron: 40000 },
  steelRing: { n: '망령 강철 반지', slot: 'ring', mods: { str: 18, pen: 8 }, cost: { phantomSteel: 10, scarMark: 8 }, kron: 90000 },
  heartNeck: { n: '재앙의 심장 목걸이', slot: 'neck', mods: { str: 8, agi: 8, vit: 8, spr: 8, dmgPct: 0.12 }, cost: { calamityHeart: 1, lordSigil: 2, riftStone: 2 }, kron: 150000 },
};
// 각인 유물. 파수꾼과 재앙에게서만 나온다.
HC.RELICS = {
  r0071: { no: '0071', n: '굶주린 손가락', mods: { hpPct: -0.1 }, onKillHeal: 0.03, d: '처치 시 체력 3% 회복. 최대 체력 -10%.' },
  r0213: { no: '0213', n: '반쯤 녹은 시계', mods: { cdr: 0.2, staRegenPct: -0.2 }, d: '스킬 재사용 대기 -20%. 기력 회복 -20%.' },
  r0444: { no: '0444', n: '네 번째 장례식의 종', mods: { physDR: 0.15, magDR: 0.15, movePct: -0.1 }, d: '받는 피해 -15%. 이동 속도 -10%.' },
  r0612: { no: '0612', n: '피에 젖은 일기장', mods: { stoneDrop: 0.35, dmgTaken: 0.1 }, d: '흑석 +35%. 받는 피해 +10%.' },
  r0807: { no: '0807', n: '눈알 사슬', mods: { crit: 0.12, critDmg: 0.25, vision: -30 }, d: '치명타 +12%, 치명타 피해 +25%. 시야 -30.' },
  r1103: { no: '1103', n: '거꾸로 뛰는 심장', lowHp: [0.3, 0.4], d: '체력 30% 이하일 때 피해 +40%.' },
  r1347: { no: '1347', n: '부러진 왕관', mods: { dmgVsElite: 0.25 }, d: '이형·층주·재앙·파수꾼에게 피해 +25%.' },
  r1520: { no: '1520', n: '썩지 않는 혀', immune: ['poison', 'bleed', 'burn'], d: '중독·출혈·화상 면역.' },
  r1909: { no: '1909', n: '빈 새장', extraJump: 1, d: '공중 점프 +1회.' },
  r2280: { no: '2280', n: '잿빛 모래시계', extraDay: 1, d: '층이 닫히기까지 +1일.' },
  r3112: { no: '3112', n: '열두 번째 손톱', mods: { aspdPct: 0.18, dmgPct: -0.08 }, d: '공격 속도 +18%. 피해 -8%.' },
  r4040: { no: '4040', n: '침묵하는 성배', mods: { potionPct: 0.6 }, beltMinus: 1, d: '물약 회복량 +60%. 물약 소지 한도 -1.' },
};

// 장비 생성/조회
HC.Gear = {
  uid() { return 'g' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); },
  weapon(type, tier) { return { uid: HC.Gear.uid(), kind: 'weapon', type, tier, enh: 0 }; },
  armor(slot, tier) { return { uid: HC.Gear.uid(), kind: 'armor', slot, tier, enh: 0 }; },
  acc(id) { return { uid: HC.Gear.uid(), kind: 'acc', id, enh: 0 }; },
  name(g) {
    if (!g) return '없음';
    const e = g.enh ? ' +' + g.enh : '';
    if (g.kind === 'weapon') return HC.TIERS[g.tier].n + ' ' + HC.WTYPES[g.type].n + e;
    if (g.kind === 'armor') return HC.TIERS[g.tier].n + ' ' + HC.ASLOTS[g.slot].n + e;
    if (g.kind === 'acc') return HC.ACCS[g.id].n + e;
    return '?';
  },
  enhMult(g) { return 1 + (g.enh || 0) * 0.08; },
  // 장비 하나가 주는 스탯/모드
  mods(g) {
    const out = {};
    if (!g) return out;
    const m = HC.Gear.enhMult(g);
    if (g.kind === 'armor') {
      const T = HC.TIERS[g.tier], S = HC.ASLOTS[g.slot];
      out.hpFlat = Math.round(T.hp * S.hp * m);
      out.bon = Math.round(T.bon * S.bon * m);
      out.res = Math.round(T.res * S.res * m);
      for (const k in S.extra) out[k] = (out[k] || 0) + Math.round(S.extra[k] * g.tier * 2 * m);
    } else if (g.kind === 'acc') {
      const A = HC.ACCS[g.id];
      for (const k in A.mods) out[k] = A.mods[k] * m;
    } else if (g.kind === 'weapon') {
      const W = HC.WTYPES[g.type];
      if (W.pen) out.pen = W.pen;
      if (W.crit) out.crit = W.crit;
    }
    return out;
  },
  weaponDmg(g) {
    if (!g) return 8;
    return HC.TIERS[g.tier].w * HC.WTYPES[g.type].dmg * HC.Gear.enhMult(g);
  },
  sellPrice(g) {
    if (g.kind === 'acc') return Math.floor((HC.ACCS[g.id].kron || 1000) * 0.3 * (1 + g.enh * 0.2));
    return Math.floor(40 * Math.pow(4.2, g.tier - 1) * (1 + g.enh * 0.25));
  },
};
