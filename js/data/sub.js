'use strict';
// 도시 서브컨텐츠 정의 (IDLEON식 성장 요소를 어두운 톤으로 옮김)

// 레벨 → 누적 경험치 (원작처럼 레벨업이 매우 느리다)
HC.EXP_TABLE = [0, 0, 60, 230, 620, 1450, 3100, 6200, 11500, 20000, 34000, 56000, 90000];
HC.MAX_LEVEL = 12;

// 탐색자 등급: 영혼에 새긴 영혼의 총량으로 정해진다 (원작: 등급은 영혼에 새겨진 정수의 총량)
HC.GRADES = [
  { g: 9, need: 0 }, { g: 8, need: 3 }, { g: 7, need: 8 }, { g: 6, need: 20 }, { g: 5, need: 50 },
  { g: 4, need: 120 }, { g: 3, need: 260 }, { g: 2, need: 520 }, { g: 1, need: 1000 },
];
HC.soulWeight = (grade) => Math.pow(2, 9 - grade);

// ── 채집지 ──
HC.GATHER = {
  mine: { n: '폐갱도', verb: '채굴', tool: '곡괭이', res: [
    { id: 'ironOre', lv: 1, rate: 2.2, exp: 2 }, { id: 'darkIron', lv: 6, rate: 1.3, exp: 5 },
    { id: 'bloodCrystal', lv: 14, rate: 0.7, exp: 12 }, { id: 'stigmaOre', lv: 24, rate: 0.35, exp: 30 }] },
  wood: { n: '고사목 숲', verb: '벌채', tool: '도끼', res: [
    { id: 'deadWood', lv: 1, rate: 2.4, exp: 2 }, { id: 'blackOak', lv: 6, rate: 1.3, exp: 5 },
    { id: 'boneWood', lv: 14, rate: 0.7, exp: 12 }, { id: 'soulWood', lv: 24, rate: 0.35, exp: 30 }] },
  fish: { n: '검은 우물', verb: '낚시', tool: '낚싯대', res: [
    { id: 'blindCatfish', lv: 1, rate: 2.0, exp: 2 }, { id: 'wellEel', lv: 6, rate: 1.2, exp: 5 },
    { id: 'paleAngler', lv: 14, rate: 0.65, exp: 12 }, { id: 'ghostFish', lv: 24, rate: 0.33, exp: 30 }] },
};
HC.gatherExpNeed = (lv) => Math.floor(30 * Math.pow(lv, 1.75));
HC.workerCost = (n) => Math.floor(250 * Math.pow(2.3, n));
HC.toolCost = (lv) => ({ kron: Math.floor(300 * Math.pow(2.4, lv)), mat: ['ironOre', 'darkIron', 'bloodCrystal', 'stigmaOre'][Math.min(3, Math.floor(lv / 2))], n: 10 + lv * 6 });

// ── 대장간 제작 비용 ──
HC.smithCost = function (kind, tier) {
  const ore = [null, 'ironOre', 'ironOre', 'darkIron', 'bloodCrystal', 'stigmaOre'][tier];
  const wood = [null, 'deadWood', 'deadWood', 'blackOak', 'boneWood', 'soulWood'][tier];
  const mob = [null, 'goblinEar', 'gnomeHeart', 'lizardScale', 'heartwood', 'phantomSteel'][tier];
  const k = kind === 'weapon' ? 1 : 0.7;
  const c = {};
  c[ore] = Math.ceil((6 + tier * 3) * k);
  c[wood] = Math.ceil((3 + tier * 2) * k);
  c[mob] = Math.ceil((4 + tier * 2) * k);
  if (tier >= 4) c.scarMark = tier === 4 ? 4 : 6;
  if (tier >= 5) c.lordSigil = 2;
  return { mats: c, kron: Math.floor([0, 80, 450, 2600, 13000, 60000][tier] * k) };
};
HC.enhCost = function (g) {
  const tier = g.tier || 3;
  const ore = [null, 'ironOre', 'ironOre', 'darkIron', 'bloodCrystal', 'stigmaOre'][tier];
  return { kron: Math.floor(60 * tier * Math.pow(g.enh + 1, 1.7)), ore, n: 3 + g.enh * 2 };
};
HC.ENH_RATE = [1, 0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.22, 0.15];

// ── 연금: 영약 솥 (방치형 영구 강화) ──
HC.ELIXIRS = [
  { id: 'iron', n: '철피 영약', k: 'physDR', per: 0.004, max: 30, mats: { rotFlesh: 3, ironOre: 4 }, floor: 1 },
  { id: 'fury', n: '맹렬 영약', k: 'dmgPct', per: 0.01, max: 30, mats: { goblinEar: 3, glowMoss: 2 }, floor: 1 },
  { id: 'blood', n: '혈류 영약', k: 'hpPct', per: 0.01, max: 30, mats: { blindCatfish: 4, rotFlesh: 2 }, floor: 1 },
  { id: 'swift', n: '날랜 영약', k: 'aspdPct', per: 0.006, max: 30, mats: { wolfFang: 3, deadWood: 4 }, floor: 1 },
  { id: 'soul', n: '혼의 영약', k: 'skillDmg', per: 0.01, max: 30, mats: { ashEssence: 2, emberHerb: 2 }, floor: 2 },
  { id: 'greed', n: '탐욕 영약', k: 'stoneDrop', per: 0.02, max: 25, mats: { scorpShell: 2, darkIron: 3 }, floor: 2 },
  { id: 'hunt', n: '흡혼 영약', k: 'soulDrop', per: 0.015, max: 25, mats: { crowFeather: 2, mistCap: 2 }, floor: 3 },
  { id: 'breath', n: '숨결 영약', k: 'staRegenPct', per: 0.02, max: 25, mats: { wellEel: 3, emberHerb: 2 }, floor: 2 },
  { id: 'mend', n: '수복 영약', k: 'rec', per: 2, max: 25, mats: { heartwood: 2, paleAngler: 2 }, floor: 3 },
  { id: 'night', n: '야안 영약', k: 'vision', per: 3, max: 20, mats: { starMoss: 2, ghostFish: 1 }, floor: 4 },
];
HC.elixirCost = (e, lv) => {
  const m = {};
  const mul = 1 + Math.floor(lv * 0.7);
  for (const k in e.mats) m[k] = e.mats[k] * mul;
  return { mats: m, kron: Math.floor(40 * Math.pow(1.32, lv) * e.floor) };
};
HC.BREWS = [
  { id: 'smallPotion', out: 2, mats: { glowMoss: 2, blindCatfish: 1 }, kron: 10 },
  { id: 'antidote', out: 2, mats: { glowMoss: 1, rotFlesh: 1 }, kron: 5 },
  { id: 'torch', out: 3, mats: { deadWood: 2 }, kron: 0 },
  { id: 'bigPotion', out: 1, mats: { emberHerb: 2, wellEel: 1, glowMoss: 2 }, kron: 40 },
  { id: 'battleTonic', out: 1, mats: { mistCap: 2, paleAngler: 1, scarMark: 1 }, kron: 200 },
];

// ── 요리 ──
HC.MEALS = [
  { id: 'stew', n: '눈먼 메기 스튜', k: 'hpPct', per: 0.01, mats: { blindCatfish: 4, glowMoss: 1 } },
  { id: 'eel', n: '우물 장어 꼬치', k: 'aspdPct', per: 0.005, mats: { wellEel: 3, deadWood: 2 } },
  { id: 'smoke', n: '썩은 살 훈제', k: 'statusRes', per: 0.01, mats: { rotFlesh: 4, blackOak: 1 } },
  { id: 'angler', n: '아귀 맑은국', k: 'dmgPct', per: 0.01, mats: { paleAngler: 2, emberHerb: 2 } },
  { id: 'ghost', n: '망령어 회', k: 'skillDmg', per: 0.012, mats: { ghostFish: 2, mistCap: 2 } },
  { id: 'scale', n: '재비늘 구이', k: 'physDR', per: 0.003, mats: { lizardScale: 3, blackOak: 2 } },
  { id: 'porridge', n: '버섯 죽', k: 'regen', per: 0.3, mats: { mistCap: 3, blindCatfish: 2 } },
  { id: 'tea', n: '별이끼 차', k: 'cdr', per: 0.004, mats: { starMoss: 3, wellEel: 2 } },
];
HC.MEAL_MAX = 30;
HC.mealCost = (m, lv) => { const o = {}; const mul = 1 + Math.floor(lv / 3); for (const k in m.mats) o[k] = m.mats[k] * mul; return o; };

// ── 혈문 (각인) ──
HC.TATTOOS = [
  { id: 'str', n: '근력의 혈문', k: 'str', per: 1, mat: 'goblinEar' },
  { id: 'vit', n: '생명의 혈문', k: 'vit', per: 1, mat: 'rotFlesh' },
  { id: 'agi', n: '민첩의 혈문', k: 'agi', per: 1, mat: 'wolfFang' },
  { id: 'bon', n: '뼈의 혈문', k: 'bon', per: 1, mat: 'gnomeHeart' },
  { id: 'rage', n: '분노의 혈문', k: 'dmgPct', per: 0.008, mat: 'scarMark', design: 'design_rage' },
  { id: 'fang', n: '송곳니 혈문', k: 'crit', per: 0.003, mat: 'wolfFang', design: 'design_fang' },
  { id: 'abyss', n: '심연 혈문', k: 'spr', per: 1.5, mat: 'abyssAsh', design: 'design_abyss' },
  { id: 'venom', n: '독침 혈문', k: 'pen', per: 0.5, mat: 'scorpShell', design: 'design_venom' },
  { id: 'scale', n: '비늘 혈문', k: 'physDR', per: 0.003, mat: 'lizardScale', design: 'design_scale' },
  { id: 'ash', n: '재 혈문', k: 'res', per: 1, mat: 'ashEssence', design: 'design_ash' },
  { id: 'hex', n: '저주 혈문', k: 'skillDmg', per: 0.008, mat: 'witchEye', design: 'design_hex' },
  { id: 'root', n: '뿌리 혈문', k: 'reg', per: 0.4, mat: 'heartwood', design: 'design_root' },
  { id: 'shadow', n: '그림자 혈문', k: 'dodge', per: 0.002, mat: 'shadowSilk', design: 'design_shadow' },
];
HC.TATTOO_MAX = 40;
HC.tattooCost = (t, lv) => ({ kron: Math.floor(60 * Math.pow(1.25, lv)), n: t.mat === 'scarMark' ? 1 + Math.floor(lv / 6) : 2 + Math.floor(lv * 0.8) });

// ── 위령비 (석상) ──
HC.STATUES = [
  { id: 'hungry', n: '굶주린 자의 위령비', k: 'dmgPct', per: 0.01, frag: 'frag1' },
  { id: 'blind', n: '눈먼 자의 위령비', k: 'crit', per: 0.003, frag: 'frag1' },
  { id: 'burnt', n: '불탄 자의 위령비', k: 'hpPct', per: 0.01, frag: 'frag2' },
  { id: 'forgot', n: '잊힌 자의 위령비', k: 'expPct', per: 0.02, frag: 'frag2' },
  { id: 'hanged', n: '목맨 자의 위령비', k: 'skillDmg', per: 0.01, frag: 'frag3' },
  { id: 'fallen', n: '떨어진 자의 위령비', k: 'physDR', per: 0.004, frag: 'frag4', k2: 'magDR' },
];
HC.STATUE_MAX = 30;

// ── 서약 (기도: 축복과 저주를 함께 짊어진다) ──
HC.OATHS = [
  { id: 'blood', n: '피의 서약', unlock: 15, good: { dmgPct: [0.12, 0.03] }, bad: { dmgTaken: 0.15 } },
  { id: 'greed', n: '탐욕의 서약', unlock: 15, good: { stoneDrop: [0.3, 0.08], matDrop: [0.15, 0.04] }, bad: { hpPct: -0.15 } },
  { id: 'ascetic', n: '고행의 서약', unlock: 30, good: { soulDrop: [0.4, 0.1] }, bad: { potionPct: -0.4 } },
  { id: 'challenge', n: '도전의 서약', unlock: 30, good: { eliteChance: [1.0, 0.25], dmgVsElite: [0.1, 0.03] }, bad: { mobAtk: 0.2 } },
  { id: 'silence', n: '침묵의 서약', unlock: 50, good: { skillDmg: [0.3, 0.05] }, bad: { basicDmg: -0.25 } },
  { id: 'bulwark', n: '철벽의 서약', unlock: 50, good: { physDR: [0.15, 0.02] }, bad: { movePct: -0.12 } },
  { id: 'frenzy', n: '광기의 서약', unlock: 80, good: { aspdPct: [0.2, 0.03] }, bad: { staRegenPct: -0.3 } },
  { id: 'dead', n: '망자의 서약', unlock: 120, good: { killHeal: [0.03, 0.005] }, bad: { noRegen: 1, healPct: -0.3 } },
];
HC.OATH_MAX = 5;
HC.oathLvCost = (lv) => 20 * Math.pow(2, lv);
HC.faithFor = (grade) => [0, 400, 200, 120, 70, 40, 25, 15, 8, 4][grade] || 4;

// ── 은신처 ──
HC.HIDEOUT = [
  { id: 'bed', n: '침상', d: '최대 체력 +2%/단계', k: 'hpPct', per: 0.02, max: 5, cost: (lv) => ({ deadWood: 10 + lv * 15, blackOak: lv * 6, kron: 300 * Math.pow(2.5, lv) }) },
  { id: 'bag', n: '배낭 작업대', d: '가방 칸 +4/단계', k: 'bagSlots', per: 4, max: 5, cost: (lv) => ({ deadWood: 15 + lv * 10, wolfFang: 5 + lv * 5, kron: 400 * Math.pow(2.6, lv) }) },
  { id: 'quarters', n: '일꾼 숙소', d: '일꾼 상한 +1/단계', k: 'workerCap', per: 1, max: 6, cost: (lv) => ({ deadWood: 20 + lv * 15, ironOre: 15 + lv * 12, kron: 500 * Math.pow(2.4, lv) }) },
  { id: 'store', n: '저장고', d: '방치 채집 한도 +2시간/단계', k: 'idleCap', per: 2, max: 6, cost: (lv) => ({ blackOak: 6 + lv * 8, darkIron: 4 + lv * 6, kron: 800 * Math.pow(2.3, lv) }) },
  { id: 'belt', n: '물약 거치대', d: '물약 소지 한도 +1/단계', k: 'belt', per: 1, max: 4, cost: (lv) => ({ ironOre: 20 + lv * 15, blackOak: lv * 8, kron: 600 * Math.pow(2.8, lv) }) },
  { id: 'dummy', n: '훈련 인형', d: '기본 공격 피해 +3%/단계', k: 'basicDmg', per: 0.03, max: 5, cost: (lv) => ({ deadWood: 25 + lv * 20, goblinEar: 10 + lv * 10, kron: 700 * Math.pow(2.5, lv) }) },
  { id: 'shrine', n: '제단 확장', d: '서약 슬롯 +1', k: 'oathSlots', per: 1, max: 1, cost: () => ({ boneWood: 20, lordSigil: 1, kron: 30000 }) },
];

// ── 잡화점 ──
HC.SHOP = [
  { id: 'smallPotion' }, { id: 'antidote' }, { id: 'torch' }, { id: 'bigPotion', grade: 7 }, { id: 'talisman' },
];
HC.BASE_BELT = 5;
HC.BASE_BAG = 14;
HC.BASE_WORKERS = 2;
HC.BASE_IDLE_CAP = 8; // 시간

// 사냥 장부 별 단계 기준
HC.cardSteps = function (kind) {
  if (kind === 'elite') return [1, 3, 8, 20];
  if (kind === 'lord' || kind === 'guardian') return [1, 2, 5, 10];
  if (kind === 'calamity') return [1, 2, 3, 5];
  return [10, 60, 250, 1000];
};
