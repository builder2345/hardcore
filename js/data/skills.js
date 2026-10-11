'use strict';
// 스탯 정의, 영혼에서 얻는 액티브/패시브 스킬 라이브러리.
HC.STATS = {
  str: { n: '근력', d: '물리 피해량 (1당 +1.5%)' },
  agi: { n: '민첩성', d: '공격 속도·이동 속도' },
  flx: { n: '유연성', d: '회피율·치명타율 소폭, 회피 무적 시간' },
  end: { n: '지구력', d: '기력 최대치와 회복 속도' },
  vit: { n: '생명력', d: '최대 체력 (1당 +7)' },
  bon: { n: '골강도', d: '물리 피해 감소, 경직 저항' },
  cut: { n: '절삭력', d: '적 방어력 관통' },
  res: { n: '항마력', d: '마법 피해 감소' },
  wil: { n: '정신력', d: '상태이상(공포·중독·출혈·둔화) 저항' },
  spr: { n: '혼력', d: '영혼 스킬 피해 (1당 +1%). 레벨이 오르면 함께 오른다' },
  per: { n: '인지력', d: '치명타 피해, 어둠·안개 속 시야, 숨은 조각 탐지' },
  reg: { n: '재생력', d: '초당 체력 재생' },
  rec: { n: '수복력', d: '모든 회복 효과 배율. 영혼으로는 얻을 수 없다' },
};
HC.STAT_ORDER = ['str', 'agi', 'flx', 'end', 'vit', 'bon', 'cut', 'res', 'wil', 'spr', 'per', 'reg', 'rec'];

// 보너스(mod) 키 → 표시 이름
HC.MOD_NAMES = {
  dmgPct: '피해', hpPct: '최대 체력', aspdPct: '공격 속도', movePct: '이동 속도', skillDmg: '스킬 피해',
  crit: '치명타 확률', critDmg: '치명타 피해', physDR: '물리 피해 감소', magDR: '마법 피해 감소', lifesteal: '흡혈',
  regen: '초당 재생', healPct: '회복량', staPct: '기력 최대치', staRegenPct: '기력 회복', dodge: '회피율', cdr: '재사용 대기 감소',
  soulDrop: '영혼 출현율', stoneDrop: '흑석 획득', expPct: '경험치', matDrop: '재료 획득', dmgTaken: '받는 피해',
  dmgVsElite: '이형·보스 피해', vision: '시야', pen: '방어 관통', statusRes: '상태이상 저항', potionPct: '물약 회복량',
  eliteChance: '이형 출현 확률', kronPct: '크론 수입', gatherPct: '채집량', idleCap: '방치 한도(시간)', atkFlat: '무기 공격력',
  hpFlat: '최대 체력', bagSlots: '가방 칸', basicDmg: '기본 공격 피해', fearRes: '공포 저항', dashCost: '회피 기력 소모',
};
HC.MOD_PCT = new Set(['dmgPct', 'hpPct', 'aspdPct', 'movePct', 'skillDmg', 'crit', 'critDmg', 'physDR', 'magDR', 'lifesteal', 'healPct', 'staPct', 'staRegenPct', 'dodge', 'cdr', 'soulDrop', 'stoneDrop', 'expPct', 'matDrop', 'dmgTaken', 'dmgVsElite', 'statusRes', 'potionPct', 'eliteChance', 'kronPct', 'gatherPct', 'basicDmg', 'fearRes', 'dashCost']);

HC.modText = function (k, v) {
  const n = HC.MOD_NAMES[k] || HC.STATS[k] && HC.STATS[k].n || k;
  if (HC.STATS[k]) return n + ' ' + (v >= 0 ? '+' : '') + Math.round(v * 10) / 10;
  if (HC.MOD_PCT.has(k)) return n + ' ' + (v >= 0 ? '+' : '') + Math.round(v * 1000) / 10 + '%';
  return n + ' ' + (v >= 0 ? '+' : '') + Math.round(v * 10) / 10;
};

/*
 액티브 스킬. kind별 실행 로직은 game/skills.js.
 mult: 스킬 기본 위력 배율. 실제 피해 = (무기 공격력×0.7 + 레벨×6) × 혼력 배율 × mult
*/
HC.SKILLS = {
  // ── 1층 ──
  ambush: { n: '급습', kind: 'dashStrike', cd: 6, dist: 110, mult: 1.6, iframe: true, col: '#c8c8c8', d: '앞으로 짧게 돌진하며 베어낸다. 돌진 중 무적.' },
  frenzyCry: { n: '광란의 외침', kind: 'buff', cd: 22, dur: 8, mods: { dmgPct: 0.2, aspdPct: 0.15 }, col: '#ff5040', d: '8초간 피해 +20%, 공격 속도 +15%.' },
  javelin: { n: '투창', kind: 'proj', cd: 4, count: 1, speed: 520, mult: 1.4, pierce: 3, sprite: 'spear', col: '#b89a70', d: '창을 던져 적 3명까지 꿰뚫는다.' },
  venomJavelin: { n: '독창', kind: 'proj', cd: 6, count: 1, speed: 480, mult: 1.0, pierce: 1, status: { poison: [5, 0.25] }, sprite: 'spear', col: '#70c060', d: '독을 바른 창. 5초간 중독.' },
  rend: { n: '물어뜯기', kind: 'dashStrike', cd: 5, dist: 70, mult: 1.3, status: { bleed: [4, 0.3] }, col: '#b0b0b0', d: '물어뜯듯 덤벼들어 출혈을 입힌다.' },
  wolfStride: { n: '늑대 걸음', kind: 'buff', cd: 20, dur: 8, mods: { movePct: 0.3, dashCost: -0.5 }, col: '#606070', d: '8초간 이동 속도 +30%, 회피 기력 소모 -50%.' },
  earthSpike: { n: '흙송곳', kind: 'spikes', cd: 7, count: 5, step: 26, mult: 1.2, col: '#a08050', d: '앞으로 흙송곳이 연달아 솟구친다.' },
  crystalHide: { n: '결정 갑피', kind: 'buff', cd: 24, dur: 5, mods: { physDR: 0.35, magDR: 0.2 }, col: '#62c8ff', d: '5초간 물리 피해 -35%, 마법 피해 -20%.' },
  rotBreath: { n: '부패의 숨결', kind: 'cone', cd: 9, range: 80, mult: 0.5, dur: 3, status: { poison: [6, 0.35] }, col: '#70a040', d: '앞에 썩은 숨을 뿜어 지속 피해와 중독.' },
  corpseFeast: { n: '시체 먹기', kind: 'heal', cd: 30, pct: 0.18, dur: 2, col: '#9050a0', d: '2초에 걸쳐 최대 체력 18% 회복.' },
  // ── 1층 이형/층주/재앙/파수꾼 ──
  warCry: { n: '전쟁 함성', kind: 'stunAoe', cd: 16, radius: 90, stun: 1.6, mult: 0.4, col: '#ff4030', d: '주변 적을 1.6초간 경직시킨다.' },
  groundSlam: { n: '대지 강타', kind: 'leap', cd: 9, dist: 90, mult: 2.4, radius: 60, col: '#a09080', d: '도약해 내려찍어 주변을 강타.' },
  chainBite: { n: '연속 물기', kind: 'combo', cd: 7, hits: 3, interval: 0.14, mult: 0.9, lunge: 40, status: { bleed: [3, 0.2] }, col: '#e0e0e0', d: '세 번 연속 물어뜯는다.' },
  moonDash: { n: '달빛 질주', kind: 'dashStrike', cd: 8, dist: 150, mult: 1.8, iframe: true, col: '#d0d8ff', d: '번개처럼 내달려 지나는 적을 벤다. 무적.' },
  crystalBurst: { n: '결정 폭발', kind: 'nova', cd: 10, radius: 75, mult: 2.0, col: '#62c8ff', d: '몸에서 결정이 터져 나와 주변을 찢는다.' },
  tunnelStrike: { n: '땅굴 습격', kind: 'burrow', cd: 10, range: 220, mult: 2.2, col: '#a08050', d: '땅속으로 숨어 가까운 적의 발밑에서 솟구친다.' },
  plagueBurst: { n: '역병 분출', kind: 'nova', cd: 14, radius: 100, mult: 1.0, status: { poison: [8, 0.5] }, col: '#70a040', d: '역병을 터뜨려 넓게 중독.' },
  fleshArmor: { n: '살점 갑옷', kind: 'shield', cd: 26, pct: 0.22, dur: 10, col: '#c05050', d: '10초간 최대 체력 22%만큼 피해를 흡수.' },
  abyssMist: { n: '심연의 안개', kind: 'field', cd: 18, radius: 90, dur: 6, slow: 0.4, vuln: 0.2, col: '#7a3ac0', d: '안개 속 적은 40% 느려지고 받는 피해 +20%.' },
  terrorMark: { n: '공포 각인', kind: 'stunAoe', cd: 20, radius: 130, stun: 2.4, mult: 0.8, col: '#a040ff', d: '넓은 범위 적을 2.4초간 공포로 묶는다.' },
  devour: { n: '포식', kind: 'devour', cd: 12, range: 50, mult: 3.0, heal: 0.4, col: '#62c8ff', d: '앞의 적을 거대한 턱으로 물어 피해의 40%를 회복.' },
  crystalRain: { n: '결정 비', kind: 'rain', cd: 16, count: 10, radius: 160, mult: 1.1, col: '#8ad8ff', d: '주변 적들 위로 결정 파편을 쏟아붓는다.' },
  bloodLance: { n: '핏빛 창', kind: 'proj', cd: 5, count: 1, speed: 640, mult: 2.0, pierce: 99, sprite: 'lance', status: { bleed: [4, 0.3] }, col: '#ff3040', d: '모든 적을 관통하는 피의 창.' },
  batSwarm: { n: '박쥐 떼', kind: 'summon', cd: 14, count: 6, mult: 0.7, col: '#a02030', d: '적을 쫓는 박쥐 여섯 마리를 날린다.' },
  bloodPact: { n: '피의 계약', kind: 'buff', cd: 25, dur: 8, mods: { lifesteal: 0.2 }, col: '#ff2030', d: '8초간 피해의 20%를 흡혈.' },
  // ── 2층 ──
  pierce: { n: '꿰뚫기', kind: 'combo', cd: 5, hits: 1, interval: 0.1, mult: 2.0, lunge: 30, reach: 70, col: '#c0a060', d: '긴 사거리로 깊게 찌른다.' },
  scaleGuard: { n: '비늘 갑피', kind: 'buff', cd: 22, dur: 6, mods: { physDR: 0.3, crit: 0.1 }, col: '#80a070', d: '6초간 물리 피해 -30%, 치명타 +10%.' },
  venomSting: { n: '독침', kind: 'combo', cd: 6, hits: 2, interval: 0.18, mult: 1.0, lunge: 20, status: { poison: [6, 0.4] }, col: '#90d060', d: '독침으로 두 번 찌른다.' },
  shellCharge: { n: '갑각 돌진', kind: 'dashStrike', cd: 9, dist: 130, mult: 1.9, iframe: false, armor: true, col: '#806040', d: '경직 무시 상태로 들이받는다.' },
  spiritBolt: { n: '혼령 화살', kind: 'proj', cd: 6, count: 3, spread: 0.25, speed: 300, mult: 0.9, homing: 4, sprite: 'orb', col: '#a0c0ff', mag: true, d: '적을 쫓는 혼령 화살 셋.' },
  fade: { n: '흐려짐', kind: 'buff', cd: 22, dur: 4, mods: { dodge: 0.5 }, col: '#b0c0d0', d: '4초간 회피율 +50%.' },
  boulder: { n: '바위 투척', kind: 'proj', cd: 7, count: 1, speed: 380, mult: 2.4, pierce: 1, gravity: 600, sprite: 'rock', knock: 260, col: '#8a7a6a', d: '큰 바위를 던져 맞은 적을 날려버린다.' },
  giantForm: { n: '거인화', kind: 'buff', cd: 40, dur: 10, mods: { dmgPct: 0.4, physDR: 0.3, movePct: -0.15, aspdPct: -0.1 }, giant: true, col: '#c0a080', d: '10초간 몸집이 커진다. 피해 +40%, 물리 피해 -30%, 경직 무시. 대신 둔해진다.' },
  // ── 2층 상위 ──
  queenSting: { n: '여왕의 독침', kind: 'proj', cd: 6, count: 3, spread: 0.18, speed: 520, mult: 1.0, pierce: 1, status: { poison: [6, 0.5] }, sprite: 'needle', col: '#b0ff60', d: '맹독 침 세 개를 부채꼴로 쏜다.' },
  ashVeil: { n: '잿빛 장막', kind: 'field', cd: 18, radius: 110, dur: 6, slow: 0.3, vuln: 0.15, dot: 0.25, col: '#a08070', d: '재가 휘몰아쳐 적을 느리게 하고 태운다.' },
  coreBeam: { n: '핵 광선', kind: 'beam', cd: 14, len: 260, mult: 3.2, col: '#ffb060', d: '골렘의 핵에서 뜨거운 광선을 쏜다.' },
  ashCrown: { n: '재의 왕관', kind: 'nova', cd: 15, radius: 120, mult: 2.6, status: { burn: [4, 0.4] }, col: '#ff7030', d: '불붙은 재를 사방으로 폭발시킨다.' },
  sandMaw: { n: '모래 아가리', kind: 'burrow', cd: 12, range: 260, mult: 3.0, col: '#c0a070', d: '모래 속에서 적을 삼키듯 솟구친다.' },
  shieldBash: { n: '방패 강타', kind: 'dashStrike', cd: 7, dist: 80, mult: 2.0, stun: 1.0, armor: true, col: '#c0c0c0', d: '방패로 들이받아 1초 기절.' },
  bladeStorm: { n: '칼날 폭풍', kind: 'combo', cd: 12, hits: 6, interval: 0.1, mult: 0.7, lunge: 10, aoe: 55, col: '#e0e0e0', d: '주변을 여섯 번 베어낸다.' },
  // ── 3층 ──
  noose: { n: '올가미', kind: 'proj', cd: 8, count: 1, speed: 420, mult: 1.2, pierce: 1, status: { stun: 1.4 }, sprite: 'orb', col: '#a09070', d: '올가미를 던져 맞은 적을 묶는다.' },
  hexBolt: { n: '저주탄', kind: 'proj', cd: 5, count: 1, speed: 360, mult: 1.5, homing: 3, status: { vuln: [5, 0.2] }, sprite: 'orb', col: '#a060ff', mag: true, d: '맞은 적이 받는 피해 +20% (5초).' },
  rootSpike: { n: '뿌리 창', kind: 'spikes', cd: 8, count: 7, step: 24, mult: 1.6, status: { slow: [3, 0.4] }, col: '#6a8050', d: '뿌리가 연달아 솟아 적을 꿰고 늦춘다.' },
  barkSkin: { n: '나무껍질', kind: 'buff', cd: 26, dur: 8, mods: { physDR: 0.25, regen: 6 }, col: '#7a6a50', d: '8초간 물리 피해 -25%, 초당 6 재생.' },
  crowStorm: { n: '까마귀 폭풍', kind: 'summon', cd: 12, count: 9, mult: 0.6, col: '#303040', d: '까마귀 아홉 마리가 적을 쪼아댄다.' },
  murderEye: { n: '살육의 눈', kind: 'buff', cd: 24, dur: 8, mods: { crit: 0.25, critDmg: 0.3 }, col: '#ff3030', d: '8초간 치명타 +25%, 치명타 피해 +30%.' },
  wail: { n: '곡소리', kind: 'stunAoe', cd: 18, radius: 140, stun: 2.0, mult: 1.2, col: '#90b0a0', d: '울음소리로 주변 적을 얼어붙게 한다.' },
  thornBurst: { n: '가시 폭발', kind: 'nova', cd: 12, radius: 110, mult: 2.8, status: { bleed: [5, 0.4] }, col: '#80a060', d: '가시가 사방으로 터져 출혈.' },
  // ── 4층 ──
  stoneSpear: { n: '석창 찌르기', kind: 'combo', cd: 6, hits: 2, interval: 0.2, mult: 1.8, lunge: 40, reach: 64, col: '#b0b0c0', d: '긴 석창으로 두 번 찌른다.' },
  petrify: { n: '석화 피부', kind: 'buff', cd: 30, dur: 6, mods: { physDR: 0.45, movePct: -0.2 }, giant: false, col: '#a0a0b0', d: '6초간 물리 피해 -45%.' },
  diveTalon: { n: '급강하 발톱', kind: 'leap', cd: 8, dist: 120, mult: 2.6, radius: 50, col: '#c0b0e0', d: '높이 뛰어올라 발톱으로 내리꽂는다.' },
  galeFeather: { n: '돌풍 깃털', kind: 'proj', cd: 6, count: 5, spread: 0.35, speed: 460, mult: 0.8, pierce: 2, sprite: 'needle', col: '#d0c8ff', d: '깃털 다섯 개를 흩뿌린다.' },
  phantomSlash: { n: '망령 베기', kind: 'combo', cd: 9, hits: 4, interval: 0.12, mult: 1.1, lunge: 60, col: '#9ab0ff', d: '앞으로 미끄러지며 네 번 벤다.' },
  shadowStep: { n: '그림자 걸음', kind: 'blink', cd: 8, range: 200, mult: 2.8, col: '#6050a0', d: '가까운 적의 등 뒤로 순간이동해 찌른다.' },
  starfall: { n: '낙성', kind: 'rain', cd: 15, count: 14, radius: 200, mult: 1.6, col: '#e8e0ff', d: '별빛 파편이 주변 적에게 쏟아진다.' },
  judgement: { n: '심판의 빛', kind: 'beam', cd: 16, len: 340, mult: 4.0, col: '#fff0c0', mag: true, d: '앞을 꿰뚫는 거대한 빛줄기.' },
  mirrorImage: { n: '거울상', kind: 'buff', cd: 28, dur: 8, mods: { dmgPct: 0.25, dodge: 0.2 }, col: '#c0e0ff', d: '8초간 분신이 공격을 흉내 낸다. 피해 +25%, 회피 +20%.' },
};

/* 패시브. mods는 항상 적용, 그 외 키는 전투 중 조건 판정 */
HC.PASSIVES = {
  pack: { n: '무리 사냥꾼', d: '주변(150px) 적 1마리당 피해 +4% (최대 16%)', pack: [0.04, 0.16] },
  keenEye: { n: '눈썰미', d: '치명타 확률 +4%', mods: { crit: 0.04 } },
  bloodScent: { n: '피 냄새', d: '출혈 상태 적에게 피해 +15%', vsBleed: 0.15 },
  tremor: { n: '땅울림 감지', d: '인지력 +5, 숨은 조각을 더 멀리서 감지', mods: { per: 5 }, detect: true },
  rotBlood: { n: '썩은 피', d: '중독 피해 -50%, 재생력 +1', mods: { reg: 1 }, poisonRes: 0.5 },
  chief: { n: '두목의 위엄', d: '체력 70% 이상일 때 피해 +10%, 받는 피해 -10%', highHp: [0.7, 0.1, 0.1] },
  nightHunter: { n: '밤의 사냥꾼', d: '밤에 피해 +20%, 공격 속도 +10%', night: [0.2, 0.1] },
  crystalSkin: { n: '결정 피부', d: '피격 시 15% 확률로 결정 파편이 반격', reflect: 0.15 },
  plagueProof: { n: '부패 내성', d: '중독·출혈 면역, 최대 체력 +5%', mods: { hpPct: 0.05 }, immune: ['poison', 'bleed'] },
  abyssBlood: { n: '심연의 피', d: '공포 면역, 스킬 피해 +15%', mods: { skillDmg: 0.15 }, immune: ['fear'] },
  devourer: { n: '결정 포식자', d: '최대 체력 +25%, 골강도 +10', mods: { hpPct: 0.25, bon: 10 } },
  vampire: { n: '흡혈', d: '모든 피해의 3%를 흡혈', mods: { lifesteal: 0.03 } },
  coldBlood: { n: '냉혈', d: '치명타 피해 +20%', mods: { critDmg: 0.2 } },
  carapace: { n: '갑각', d: '물리 피해 -6%, 골강도 +4', mods: { physDR: 0.06, bon: 4 } },
  wraithTouch: { n: '망령의 손길', d: '스킬 피해 +10%', mods: { skillDmg: 0.1 } },
  stoneSkin: { n: '바위 피부', d: '물리 피해 -10%, 이동 속도 -5%', mods: { physDR: 0.1, movePct: -0.05 } },
  berserk: { n: '광포', d: '체력 35% 이하일 때 피해 +25%', lowHp: [0.35, 0.25] },
  tenacity: { n: '질긴 생명', d: '체력 35% 이하일 때 초당 5 재생', lowRegen: [0.35, 5] },
  executioner: { n: '처형자', d: '체력 30% 이하인 적에게 피해 +25%', execute: [0.3, 0.25] },
  ironWill: { n: '강철 의지', d: '상태이상 저항 +25%', mods: { statusRes: 0.25 } },
  gladiator: { n: '투사의 피', d: '처치할 때마다 10초간 피해 +4% (최대 5중첩)', killStack: [0.04, 5, 10] },
  shadow: { n: '그림자', d: '회피율 +8%', mods: { dodge: 0.08 } },
  witchCurse: { n: '저주술', d: '공격 시 12% 확률로 적이 받는 피해 +15% (4초)', curse: [0.12, 0.15, 4] },
  crowEyes: { n: '까마귀 눈', d: '시야 +40, 치명타 확률 +3%', mods: { vision: 40, crit: 0.03 } },
  rootbound: { n: '뿌리내림', d: '1초 이상 멈춰 있으면 받는 피해 -15%', still: 0.15 },
  hangman: { n: '교수인', d: '공중에 뜬 적에게 피해 +20%', vsAir: 0.2 },
  starBless: { n: '별의 축복', d: '스킬 재사용 대기 -15%', mods: { cdr: 0.15 } },
  fallenWing: { n: '타락한 날개', d: '공중 점프 +1회 (3단 점프)', extraJump: 1 },
  mirror: { n: '거울', d: '기본 공격이 8% 확률로 한 번 더 들어간다', echo: 0.08 },
  knightOath: { n: '망령 기사', d: '회피하며 지나간 적에게 피해', dashDmg: 0.8 },
  harpy: { n: '하피의 발톱', d: '공중 공격 피해 +25%', airDmg: 0.25 },
  statue: { n: '석상', d: '넉백 면역, 물리 피해 -5%', mods: { physDR: 0.05 }, noKnock: true },
  assassin: { n: '자객', d: '적의 등 뒤를 공격하면 피해 +30%', backstab: 0.3 },
  ashborn: { n: '재에서 난 자', d: '화상 면역, 피해 +8%', mods: { dmgPct: 0.08 }, immune: ['burn'] },
  sandwalker: { n: '모래 걷는 자', d: '이동 속도 +8%, 기력 회복 +20%', mods: { movePct: 0.08, staRegenPct: 0.2 } },
  motherRoot: { n: '어미 뿌리', d: '최대 체력 +15%, 재생력 +4', mods: { hpPct: 0.15, reg: 4 } },
  spireKing: { n: '첨탑의 왕', d: '모든 피해 +12%, 받는 피해 -8%', mods: { dmgPct: 0.12, physDR: 0.08 } },
  thousandEyes: { n: '천 개의 눈', d: '치명타 확률 +8%, 인지력 +10', mods: { crit: 0.08, per: 10 } },
  oldHeart: { n: '고목의 심장', d: '회복 효과 +20%, 생명력 +6', mods: { healPct: 0.2, vit: 6 } },
};
