'use strict';
/*
 몬스터 정의.
 grade: 9(최하)~1. kind: normal | elite(이형) | lord(층주) | calamity(층의 재앙) | guardian(열극의 파수꾼)
 attacks: 적 공격 라이브러리(entities/enemy.js)의 타입과 수치.
 soul: 영혼. colors마다 다른 액티브를 준다. rainbow면 모든 액티브.
*/
HC.MOBS = {};
(function () {
  const M = HC.MOBS;
  function def(id, o) { o.id = id; M[id] = o; }

  // ═══════════ 1층 청석 동굴 (9등급) ═══════════
  def('goblin', {
    n: '잔귀', grade: 9, floor: 1, kind: 'normal', ai: 'walker',
    body: { t: 'humanoid', w: 12, h: 20, c: '#4b5a3c', c2: '#2c3324', eye: '#ff4a20', wpn: 'blade', hunch: 0.3 },
    hp: 55, atk: 26, def: 2, spd: 72, aggro: 170, exp: 6, stone: [1, 2],
    attacks: [{ t: 'swipe', mult: 1, range: 20, windup: 0.42, cd: 1.3 }],
    soul: { drop: 0.025, stats: { str: 2, agi: 3, wil: -1 }, colors: [{ c: '잿빛', hex: '#a8a8a8', a: 'ambush' }, { c: '붉은', hex: '#e04030', a: 'frenzyCry' }], passive: 'pack' },
    drops: [{ id: 'goblinEar', ch: 0.35 }], card: { k: 'dmgPct', v: 0.01 },
  });
  def('goblinSpear', {
    n: '잔귀 투창병', grade: 9, floor: 1, kind: 'normal', ai: 'ranged', keep: 120,
    body: { t: 'humanoid', w: 12, h: 20, c: '#5a4a38', c2: '#30281e', eye: '#ffa020', wpn: 'spear', hunch: 0.2 },
    hp: 45, atk: 24, def: 1, spd: 62, aggro: 230, exp: 7, stone: [1, 2],
    attacks: [{ t: 'throw', mult: 1, speed: 300, gravity: 320, windup: 0.62, cd: 2.4, range: 260, sprite: 'spear' }, { t: 'swipe', mult: 0.8, range: 18, windup: 0.4, cd: 1.6 }],
    soul: { drop: 0.025, stats: { agi: 3, per: 2, bon: -1 }, colors: [{ c: '갈색', hex: '#a07848', a: 'javelin' }, { c: '녹색', hex: '#60b050', a: 'venomJavelin' }], passive: 'keenEye' },
    drops: [{ id: 'goblinEar', ch: 0.3 }], card: { k: 'crit', v: 0.004 },
  });
  def('fangWolf', {
    n: '칼이빨 늑대', grade: 9, floor: 1, kind: 'normal', ai: 'walker',
    body: { t: 'beast', w: 24, h: 14, c: '#3c3c46', c2: '#22222a', eye: '#ffd040' },
    hp: 70, atk: 28, def: 2, spd: 125, aggro: 200, exp: 8, stone: [1, 2],
    attacks: [{ t: 'lunge', mult: 1.2, speed: 340, dur: 0.34, windup: 0.5, cd: 2.2, range: 130 }, { t: 'swipe', mult: 0.9, range: 18, windup: 0.32, cd: 1.1 }],
    soul: { drop: 0.025, stats: { agi: 4, flx: 2, vit: -2 }, colors: [{ c: '회색', hex: '#909098', a: 'rend' }, { c: '검은', hex: '#404050', a: 'wolfStride' }], passive: 'bloodScent' },
    drops: [{ id: 'wolfFang', ch: 0.35 }], card: { k: 'movePct', v: 0.008 },
  });
  def('gnome', {
    n: '굴토인', grade: 9, floor: 1, kind: 'normal', ai: 'burrower',
    body: { t: 'humanoid', w: 11, h: 16, c: '#6a5a40', c2: '#3a3020', eye: '#80e0ff', wpn: 'pick', hunch: 0.4 },
    hp: 60, atk: 32, def: 5, spd: 55, aggro: 180, exp: 8, stone: [1, 3],
    attacks: [{ t: 'burrow', mult: 1.3, windup: 0.7, cd: 4.2, range: 220 }, { t: 'swipe', mult: 0.9, range: 16, windup: 0.45, cd: 1.5 }],
    soul: { drop: 0.025, stats: { bon: 3, per: 3, agi: -1 }, colors: [{ c: '황토', hex: '#b08848', a: 'earthSpike' }, { c: '청색', hex: '#62c8ff', a: 'crystalHide' }], passive: 'tremor' },
    drops: [{ id: 'gnomeHeart', ch: 0.3 }], card: { k: 'physDR', v: 0.004 },
  });
  def('ghoul', {
    n: '썩은 송장', grade: 9, floor: 1, kind: 'normal', ai: 'walker',
    body: { t: 'humanoid', w: 13, h: 22, c: '#56664a', c2: '#2c3626', eye: '#c8ff60', wpn: 'none', hunch: 0.6 },
    hp: 120, atk: 30, def: 4, spd: 46, aggro: 150, exp: 10, stone: [1, 3],
    attacks: [{ t: 'swipe', mult: 1, range: 18, windup: 0.5, cd: 1.5, status: { poison: [4, 0.18] } }, { t: 'lunge', mult: 1.1, speed: 220, dur: 0.3, windup: 0.6, cd: 3.5, range: 70 }],
    soul: { drop: 0.025, stats: { vit: 4, reg: 2, agi: -2 }, colors: [{ c: '녹색', hex: '#70a040', a: 'rotBreath' }, { c: '보라', hex: '#9050a0', a: 'corpseFeast' }], passive: 'rotBlood' },
    drops: [{ id: 'rotFlesh', ch: 0.4 }], card: { k: 'hpPct', v: 0.01 },
  });
  // 이형 (1층)
  def('urg', {
    n: '무덤지기 오우거 우르그', grade: 7, floor: 1, kind: 'elite', ai: 'walker', poise: 140,
    body: { t: 'humanoid', w: 20, h: 32, c: '#5a3a2a', c2: '#2a1a12', eye: '#ff2000', wpn: 'cleaver', hunch: 0.3, horns: true },
    hp: 950, atk: 46, def: 6, spd: 88, aggro: 260, exp: 120, stone: [18, 28],
    attacks: [
      { t: 'swipe', mult: 1, range: 30, h: 30, windup: 0.55, cd: 1.4 },
      { t: 'leap', mult: 1.6, radius: 55, windup: 0.6, cd: 5, range: 220 },
      { t: 'summon', mob: 'goblin', count: 2, cd: 12, max: 4, windup: 0.8 },
    ],
    soul: { drop: 0.35, stats: { str: 8, bon: 5, vit: 5, agi: -2 }, colors: [{ c: '붉은', hex: '#e03020', a: 'warCry' }, { c: '잿빛', hex: '#a09080', a: 'groundSlam' }], passive: 'chief' },
    drops: [{ id: 'scarMark', ch: 1, n: [1, 2] }, { id: 'design_rage', ch: 0.25 }, { id: 'frag1', ch: 0.3 }], card: { k: 'dmgPct', v: 0.02 },
  });
  def('whiteFang', {
    n: '흰 송곳니', grade: 7, floor: 1, kind: 'elite', ai: 'walker', poise: 120,
    body: { t: 'beast', w: 34, h: 20, c: '#c4c4cc', c2: '#8a8a96', eye: '#60c8ff', mane: true },
    hp: 800, atk: 44, def: 4, spd: 175, aggro: 280, exp: 120, stone: [18, 28],
    attacks: [
      { t: 'lunge', mult: 1.3, speed: 420, dur: 0.36, windup: 0.42, cd: 2, range: 170 },
      { t: 'combo', mult: 0.8, hits: 3, range: 26, windup: 0.4, interval: 0.16, cd: 3.5, status: { bleed: [3, 0.15] } },
      { t: 'summon', mob: 'fangWolf', count: 2, cd: 14, max: 3, windup: 0.9, howl: true },
    ],
    soul: { drop: 0.35, stats: { agi: 8, flx: 6, str: 3, vit: -3 }, colors: [{ c: '흰', hex: '#f0f0f0', a: 'chainBite' }, { c: '은빛', hex: '#c8d0ff', a: 'moonDash' }], passive: 'nightHunter' },
    drops: [{ id: 'scarMark', ch: 1, n: [1, 2] }, { id: 'design_fang', ch: 0.25 }, { id: 'frag1', ch: 0.3 }], card: { k: 'aspdPct', v: 0.015 },
  });
  def('gnomeQueen', {
    n: '굴토 두꺼비 여왕', grade: 7, floor: 1, kind: 'elite', ai: 'burrower', poise: 160,
    body: { t: 'humanoid', w: 16, h: 24, c: '#7a6a50', c2: '#40352a', eye: '#60e8ff', wpn: 'pick', hunch: 0.3, crown: true },
    hp: 1050, atk: 50, def: 10, spd: 70, aggro: 250, exp: 130, stone: [20, 30],
    attacks: [
      { t: 'burrow', mult: 1.5, windup: 0.55, cd: 3.2, range: 260 },
      { t: 'nova', mult: 0.8, count: 10, speed: 200, windup: 0.7, cd: 5, sprite: 'shard', col: '#62c8ff' },
      { t: 'spikes', mult: 1.2, count: 6, step: 24, windup: 0.6, cd: 6, col: '#62c8ff' },
    ],
    soul: { drop: 0.35, stats: { bon: 8, per: 5, res: 4, agi: -3 }, colors: [{ c: '청색', hex: '#62c8ff', a: 'crystalBurst' }, { c: '황토', hex: '#b08848', a: 'tunnelStrike' }], passive: 'crystalSkin' },
    drops: [{ id: 'scarMark', ch: 1, n: [1, 2] }, { id: 'blueShard', ch: 1, n: [3, 6] }, { id: 'frag1', ch: 0.3 }], card: { k: 'physDR', v: 0.01 },
  });
  def('bloatGhoul', {
    n: '부패한 거인 송장', grade: 7, floor: 1, kind: 'elite', ai: 'walker', poise: 220,
    body: { t: 'humanoid', w: 26, h: 36, c: '#4a5a40', c2: '#283020', eye: '#c8ff60', wpn: 'none', hunch: 0.5, fat: true },
    hp: 1100, atk: 52, def: 8, spd: 42, aggro: 220, exp: 140, stone: [22, 32],
    attacks: [
      { t: 'swipe', mult: 1.1, range: 30, h: 34, windup: 0.6, cd: 1.6, status: { poison: [5, 0.2] } },
      { t: 'slam', mult: 1.5, radius: 70, windup: 0.9, cd: 5, status: { poison: [6, 0.25] }, col: '#80c040' },
      { t: 'cast', mult: 0.9, radius: 36, windup: 1.0, cd: 6, count: 3, range: 260, status: { poison: [5, 0.25] }, col: '#80c040', linger: 2.5 },
    ],
    soul: { drop: 0.35, stats: { vit: 12, reg: 6, bon: 4, agi: -4, flx: -3 }, colors: [{ c: '녹색', hex: '#70a040', a: 'plagueBurst' }, { c: '붉은', hex: '#c05050', a: 'fleshArmor' }], passive: 'plagueProof' },
    drops: [{ id: 'scarMark', ch: 1, n: [1, 2] }, { id: 'rotFlesh', ch: 1, n: [4, 8] }, { id: 'frag1', ch: 0.3 }], card: { k: 'hpPct', v: 0.02 },
  });
  // 층주 (1층)
  def('varges', {
    n: '심연을 걷는 자 바르게스', grade: 5, floor: 1, kind: 'lord', ai: 'boss', poise: 9999, flying: true,
    body: { t: 'humanoid', w: 22, h: 46, c: '#2e2240', c2: '#160e1e', eye: '#c060ff', wpn: 'scythe', hunch: 0.1, robe: true, horns: true },
    hp: 4500, atk: 72, def: 10, spd: 90, aggro: 999, exp: 650, stone: [120, 160],
    phases: [
      { hp: 1, attacks: [
        { t: 'swipe', mult: 1.2, range: 44, h: 40, windup: 0.6, cd: 1.6 },
        { t: 'cast', mult: 1.0, radius: 40, windup: 0.9, cd: 3.5, count: 2, range: 400, col: '#a050ff' },
        { t: 'teleport', cd: 6, windup: 0.4 },
        { t: 'bolt', mult: 0.8, count: 3, spread: 0.3, speed: 220, homing: 2.2, windup: 0.6, cd: 4.5, col: '#b070ff', mag: true },
      ] },
      { hp: 0.6, enter: 'roar', attacks: [
        { t: 'spikes', mult: 1.2, count: 9, step: 28, windup: 0.7, cd: 5, col: '#9040e0' },
        { t: 'summon', mob: 'goblin', corrupt: true, count: 2, cd: 14, max: 3, windup: 1 },
        { t: 'roar', fear: 2, radius: 220, windup: 0.8, cd: 16 },
      ] },
      { hp: 0.3, enter: 'roar', speed: 1.25, attacks: [
        { t: 'beam', mult: 1.8, len: 420, h: 18, windup: 1.0, dur: 0.6, cd: 7, col: '#c070ff' },
        { t: 'rain', mult: 0.9, count: 12, windup: 0.8, cd: 8, spread: 360, col: '#a050ff' },
      ] },
    ],
    soul: { drop: 0.6, stats: { spr: 15, wil: 10, str: 10, res: 8, vit: 8 }, colors: [{ c: '심연', hex: '#5a2a8a', a: 'abyssMist' }, { c: '보라', hex: '#a040ff', a: 'terrorMark' }], passive: 'abyssBlood' },
    drops: [{ id: 'lordSigil', ch: 1, n: [1, 1] }, { id: 'scarMark', ch: 1, n: [3, 5] }, { id: 'design_abyss', ch: 0.5 }, { id: 'frag1', ch: 1, n: [2, 3] }], card: { k: 'skillDmg', v: 0.04 },
  });
  // 층의 재앙 (1층)
  def('grumar', {
    n: '결정 포식룡 그루마르', grade: 3, floor: 1, kind: 'calamity', ai: 'boss', poise: 9999,
    body: { t: 'beast', w: 120, h: 70, c: '#20303c', c2: '#62c8ff', eye: '#d0f4ff' },
    hp: 22000, atk: 135, def: 26, spd: 110, aggro: 999, exp: 4200, stone: [600, 900],
    phases: [
      { hp: 1, attacks: [
        { t: 'beam', mult: 1.4, len: 380, h: 22, windup: 0.9, dur: 0.6, cd: 4.5, col: '#9adfff' },
        { t: 'leap', mult: 1.6, radius: 80, windup: 0.7, cd: 5, range: 420 },
        { t: 'swipe', mult: 1.3, range: 60, h: 50, windup: 0.6, cd: 2.2 },
        { t: 'charge', mult: 1.3, speed: 380, dur: 1.0, windup: 0.8, cd: 6 },
      ] },
      { hp: 0.55, enter: 'roar', speed: 1.15, attacks: [
        { t: 'rain', mult: 0.9, count: 18, windup: 1.0, cd: 7, spread: 420, col: '#8ad8ff' },
        { t: 'roar', fear: 0, radius: 300, windup: 0.9, cd: 18, stun: 1.2 },
        { t: 'spikes', mult: 1.1, count: 12, step: 30, windup: 0.8, cd: 6, col: '#62c8ff' },
        { t: 'nova', mult: 0.8, count: 16, speed: 230, windup: 0.8, cd: 6, sprite: 'shard', col: '#62c8ff' },
      ] },
    ],
    soul: { drop: 1, stats: { bon: 25, vit: 20, str: 15, agi: -5 }, colors: [{ c: '청백', hex: '#bfefff', a: 'devour', all: ['devour', 'crystalRain'] }], passive: 'devourer' },
    drops: [{ id: 'calamityHeart', ch: 1, n: [1, 1] }, { id: 'relic', ch: 0.5 }, { id: 'blueShard', ch: 1, n: [20, 30] }], card: { k: 'hpPct', v: 0.05 },
  });
  // 열극의 파수꾼 (1층: 피의 성채)
  def('kalamus', {
    n: '핏빛 성주 칼라무스', grade: 6, floor: 1, kind: 'guardian', ai: 'boss', poise: 9999,
    body: { t: 'humanoid', w: 16, h: 34, c: '#2a0a12', c2: '#120408', eye: '#ff2030', wpn: 'none', cape: true, crown: true },
    hp: 2600, atk: 62, def: 8, spd: 110, aggro: 999, exp: 700, stone: [80, 120],
    phases: [
      { hp: 1, attacks: [
        { t: 'teleport', cd: 4, windup: 0.35 },
        { t: 'swipe', mult: 1.1, range: 30, windup: 0.4, cd: 1.2, status: { bleed: [3, 0.15] } },
        { t: 'throw', mult: 1.2, speed: 520, gravity: 0, windup: 0.5, cd: 2.6, range: 500, sprite: 'lance', col: '#ff3040', count: 1 },
      ] },
      { hp: 0.5, enter: 'roar', speed: 1.2, attacks: [
        { t: 'bolt', mult: 0.6, count: 6, spread: 1.2, speed: 200, homing: 3, windup: 0.7, cd: 5, sprite: 'bat', col: '#a02030' },
        { t: 'rain', mult: 0.9, count: 14, windup: 0.9, cd: 7, spread: 360, col: '#ff2040' },
      ] },
    ],
    soul: { drop: 0.33, rainbow: true, stats: { str: 8, spr: 8, agi: 6, reg: 4 }, colors: [{ c: '무지개', hex: '#ffffff', all: ['bloodLance', 'batSwarm', 'bloodPact'] }], passive: 'vampire' },
    drops: [{ id: 'riftStone', ch: 0.66 }, { id: 'relic', ch: 0.33 }], card: { k: 'lifesteal', v: 0.005 },
  });

  // ═══════════ 2층 잿바위 황무지 (8~7등급) ═══════════
  def('lizardman', {
    n: '잿빛 약탈자', grade: 8, floor: 2, kind: 'normal', ai: 'walker',
    body: { t: 'humanoid', w: 13, h: 24, c: '#5a6040', c2: '#30351f', eye: '#ffcc30', wpn: 'spear', hunch: 0.25, tail: true },
    hp: 200, atk: 50, def: 9, spd: 85, aggro: 200, exp: 24, stone: [3, 6],
    attacks: [{ t: 'swipe', mult: 1, range: 34, h: 10, windup: 0.45, cd: 1.3 }, { t: 'lunge', mult: 1.25, speed: 360, dur: 0.3, windup: 0.55, cd: 2.8, range: 140 }],
    soul: { drop: 0.022, stats: { agi: 5, str: 4, res: -2 }, colors: [{ c: '황갈', hex: '#c0a060', a: 'pierce' }, { c: '녹색', hex: '#80a070', a: 'scaleGuard' }], passive: 'coldBlood' },
    drops: [{ id: 'lizardScale', ch: 0.35 }], card: { k: 'critDmg', v: 0.01 },
  });
  def('scorpion', {
    n: '독니 거미', grade: 8, floor: 2, kind: 'normal', ai: 'walker', poise: 30,
    body: { t: 'crawler', w: 26, h: 14, c: '#3e2c20', c2: '#1e140e', eye: '#ff6020', tail: true },
    hp: 220, atk: 48, def: 18, spd: 72, aggro: 180, exp: 26, stone: [3, 6],
    attacks: [{ t: 'swipe', mult: 1, range: 22, windup: 0.4, cd: 1.3 }, { t: 'swipe', mult: 1.1, range: 44, h: 26, windup: 0.65, cd: 2.6, status: { poison: [5, 0.2] }, sting: true }, { t: 'charge', mult: 1.2, speed: 280, dur: 0.7, windup: 0.6, cd: 5 }],
    soul: { drop: 0.022, stats: { bon: 6, cut: 3, agi: -2 }, colors: [{ c: '독녹', hex: '#90d060', a: 'venomSting' }, { c: '적갈', hex: '#806040', a: 'shellCharge' }], passive: 'carapace' },
    drops: [{ id: 'scorpShell', ch: 0.35 }], card: { k: 'physDR', v: 0.005 },
  });
  def('ashWraith', {
    n: '잿빛 망령', grade: 7, floor: 2, kind: 'normal', ai: 'flyer',
    body: { t: 'flyer', w: 14, h: 22, c: '#6a6060', c2: '#3a3434', eye: '#ffa040', wings: 'cloak' },
    hp: 170, atk: 52, def: 3, spd: 95, aggro: 230, exp: 30, stone: [3, 7],
    attacks: [{ t: 'bolt', mult: 1, count: 1, speed: 210, homing: 1.4, windup: 0.6, cd: 2.4, col: '#ffa040', mag: true }, { t: 'swoop', mult: 1.1, speed: 300, windup: 0.5, cd: 3.5, range: 160 }],
    soul: { drop: 0.022, stats: { spr: 6, res: 5, vit: -4 }, colors: [{ c: '청회', hex: '#a0c0ff', a: 'spiritBolt' }, { c: '흰', hex: '#d0d8e0', a: 'fade' }], passive: 'wraithTouch' },
    drops: [{ id: 'ashEssence', ch: 0.35 }], card: { k: 'skillDmg', v: 0.01 },
  });
  def('rockGolem', {
    n: '바위껍질 오우거', grade: 7, floor: 2, kind: 'normal', ai: 'walker', poise: 90,
    body: { t: 'golem', w: 22, h: 30, c: '#5a5048', c2: '#33302b', eye: '#ff9040' },
    hp: 420, atk: 66, def: 22, spd: 40, aggro: 170, exp: 36, stone: [4, 8],
    attacks: [{ t: 'swipe', mult: 1, range: 26, h: 28, windup: 0.7, cd: 1.8 }, { t: 'slam', mult: 1.3, radius: 54, windup: 0.95, cd: 4.5, col: '#c08050' }, { t: 'throw', mult: 1.2, speed: 280, gravity: 420, windup: 0.9, cd: 4, range: 280, sprite: 'rock' }],
    soul: { drop: 0.022, stats: { bon: 8, vit: 8, agi: -4, flx: -3 }, colors: [{ c: '회갈', hex: '#8a7a6a', a: 'boulder' }, { c: '황색', hex: '#c0a080', a: 'giantForm' }], passive: 'stoneSkin' },
    drops: [{ id: 'golemCore', ch: 0.3 }], card: { k: 'hpPct', v: 0.01 },
  });
  def('selkis', {
    n: '독니 여왕 셀키스', grade: 6, floor: 2, kind: 'elite', ai: 'walker', poise: 260,
    body: { t: 'crawler', w: 40, h: 22, c: '#4a3a16', c2: '#2a200a', eye: '#b0ff60', tail: true, crown: true },
    hp: 2400, atk: 88, def: 26, spd: 95, aggro: 280, exp: 420, stone: [40, 60],
    attacks: [
      { t: 'swipe', mult: 1.1, range: 52, h: 30, windup: 0.6, cd: 1.6, status: { poison: [6, 0.25] }, sting: true },
      { t: 'throw', mult: 0.9, count: 3, spread: 0.25, speed: 420, gravity: 0, windup: 0.6, cd: 3.2, range: 400, sprite: 'needle', col: '#b0ff60', status: { poison: [5, 0.2] } },
      { t: 'charge', mult: 1.4, speed: 380, dur: 0.8, windup: 0.6, cd: 5 },
      { t: 'summon', mob: 'scorpion', count: 2, cd: 15, max: 3, windup: 0.9 },
    ],
    soul: { drop: 0.35, stats: { cut: 8, bon: 8, agi: 4, wil: 4 }, colors: [{ c: '연두', hex: '#b0ff60', a: 'queenSting' }, { c: '금빛', hex: '#e0c060', a: 'bladeStorm' }], passive: 'executioner' },
    drops: [{ id: 'scarMark', ch: 1, n: [2, 3] }, { id: 'design_venom', ch: 0.25 }, { id: 'frag2', ch: 0.3 }], card: { k: 'pen', v: 1 },
  });
  def('ashSoul', {
    n: '잿바람의 혼', grade: 6, floor: 2, kind: 'elite', ai: 'flyer', poise: 200,
    body: { t: 'flyer', w: 24, h: 34, c: '#8a7a70', c2: '#4a403a', eye: '#ff7030', wings: 'cloak', crown: true },
    hp: 2000, atk: 88, def: 10, spd: 120, aggro: 300, exp: 420, stone: [40, 60],
    attacks: [
      { t: 'bolt', mult: 0.8, count: 5, spread: 0.6, speed: 230, homing: 1.6, windup: 0.7, cd: 3.2, col: '#ff8040', mag: true },
      { t: 'swoop', mult: 1.3, speed: 380, windup: 0.5, cd: 3, range: 220 },
      { t: 'cast', mult: 1.1, radius: 44, windup: 0.9, cd: 4.5, count: 3, range: 320, col: '#ff7030', mag: true, status: { burn: [3, 0.2] } },
    ],
    soul: { drop: 0.35, stats: { spr: 10, res: 8, flx: 5, vit: -4 }, colors: [{ c: '잿빛', hex: '#a08070', a: 'ashVeil' }, { c: '청회', hex: '#a0c0ff', a: 'spiritBolt' }], passive: 'ashborn' },
    drops: [{ id: 'scarMark', ch: 1, n: [2, 3] }, { id: 'ashEssence', ch: 1, n: [4, 8] }, { id: 'frag2', ch: 0.3 }], card: { k: 'magDR', v: 0.01 },
  });
  def('golemCoreElite', {
    n: '용암 심장 오우거', grade: 6, floor: 2, kind: 'elite', ai: 'walker', poise: 400,
    body: { t: 'golem', w: 34, h: 44, c: '#4a4038', c2: '#2a241f', eye: '#ffb060', core: true },
    hp: 3400, atk: 95, def: 36, spd: 38, aggro: 260, exp: 460, stone: [45, 65],
    attacks: [
      { t: 'slam', mult: 1.4, radius: 80, windup: 1.0, cd: 4, col: '#ffb060' },
      { t: 'beam', mult: 1.5, len: 360, h: 14, windup: 1.1, dur: 0.5, cd: 6, col: '#ffb060' },
      { t: 'throw', mult: 1.3, speed: 300, gravity: 420, windup: 0.8, cd: 3.5, range: 320, sprite: 'rock', count: 2, spread: 0.2 },
    ],
    soul: { drop: 0.35, stats: { bon: 12, vit: 10, res: 6, agi: -5 }, colors: [{ c: '주황', hex: '#ffb060', a: 'coreBeam' }, { c: '황색', hex: '#c0a080', a: 'giantForm' }], passive: 'statue' },
    drops: [{ id: 'scarMark', ch: 1, n: [2, 3] }, { id: 'golemCore', ch: 1, n: [3, 5] }, { id: 'frag2', ch: 0.3 }], card: { k: 'physDR', v: 0.012 },
  });
  def('lizardChief', {
    n: '약탈자 두목', grade: 6, floor: 2, kind: 'elite', ai: 'walker', poise: 220,
    body: { t: 'humanoid', w: 18, h: 32, c: '#4a5a30', c2: '#283018', eye: '#ff5020', wpn: 'greatsword', hunch: 0.2, tail: true, horns: true },
    hp: 2600, atk: 92, def: 20, spd: 105, aggro: 300, exp: 440, stone: [42, 62],
    attacks: [
      { t: 'combo', mult: 0.9, hits: 3, range: 34, windup: 0.5, interval: 0.22, cd: 2.6 },
      { t: 'lunge', mult: 1.4, speed: 420, dur: 0.35, windup: 0.5, cd: 3, range: 180 },
      { t: 'leap', mult: 1.6, radius: 60, windup: 0.6, cd: 6, range: 260 },
    ],
    soul: { drop: 0.35, stats: { str: 10, agi: 6, cut: 5 }, colors: [{ c: '금빛', hex: '#e0c060', a: 'bladeStorm' }, { c: '황갈', hex: '#c0a060', a: 'pierce' }], passive: 'gladiator' },
    drops: [{ id: 'scarMark', ch: 1, n: [2, 3] }, { id: 'design_scale', ch: 0.25 }, { id: 'frag2', ch: 0.3 }], card: { k: 'dmgPct', v: 0.02 },
  });
  def('agdax', {
    n: '재의 왕관 아그닥스', grade: 4, floor: 2, kind: 'lord', ai: 'boss', poise: 9999,
    body: { t: 'humanoid', w: 26, h: 50, c: '#2a1a14', c2: '#140c08', eye: '#ff6020', wpn: 'greatsword', hunch: 0.1, crown: true, embers: true },
    hp: 16000, atk: 115, def: 24, spd: 95, aggro: 999, exp: 2600, stone: [300, 420],
    phases: [
      { hp: 1, attacks: [
        { t: 'combo', mult: 1, hits: 2, range: 46, h: 44, windup: 0.6, interval: 0.3, cd: 2.2 },
        { t: 'cast', mult: 1.2, radius: 34, windup: 0.9, cd: 3.5, count: 4, range: 420, col: '#ff6020', status: { burn: [3, 0.2] } },
        { t: 'charge', mult: 1.3, speed: 420, dur: 0.8, windup: 0.8, cd: 6 },
      ] },
      { hp: 0.6, enter: 'roar', attacks: [
        { t: 'rain', mult: 0.9, count: 16, windup: 0.9, cd: 7, spread: 420, col: '#ff7030', status: { burn: [3, 0.2] } },
        { t: 'summon', mob: 'lizardman', corrupt: true, count: 2, cd: 15, max: 3, windup: 1 },
      ] },
      { hp: 0.3, enter: 'roar', speed: 1.2, attacks: [
        { t: 'nova', mult: 0.9, count: 18, speed: 240, windup: 0.8, cd: 5, sprite: 'ember', col: '#ff7030' },
        { t: 'leap', mult: 1.8, radius: 90, windup: 0.7, cd: 6, range: 400 },
      ] },
    ],
    soul: { drop: 0.6, stats: { str: 14, res: 12, spr: 12, vit: 10, wil: 6 }, colors: [{ c: '화염', hex: '#ff6020', a: 'ashCrown' }, { c: '잿빛', hex: '#a08070', a: 'ashVeil' }], passive: 'ashborn' },
    drops: [{ id: 'lordSigil', ch: 1, n: [1, 2] }, { id: 'scarMark', ch: 1, n: [4, 6] }, { id: 'frag2', ch: 1, n: [2, 3] }, { id: 'design_ash', ch: 0.5 }], card: { k: 'dmgPct', v: 0.04 },
  });
  def('barkus', {
    n: '재를 달리는 악몽 바르쿠스', grade: 2, floor: 2, kind: 'calamity', ai: 'boss', poise: 9999,
    body: { t: 'beast', w: 120, h: 80, c: '#3a2a20', c2: '#ff7a30', eye: '#ffd080' },
    hp: 60000, atk: 240, def: 45, spd: 150, aggro: 999, exp: 16000, stone: [1500, 2200],
    phases: [
      { hp: 1, attacks: [
        { t: 'charge', mult: 1.4, speed: 480, dur: 1.3, windup: 0.75, cd: 4 },
        { t: 'leap', mult: 1.6, radius: 90, windup: 0.6, cd: 5, range: 500 },
        { t: 'cast', mult: 1.1, radius: 40, windup: 0.9, cd: 4, count: 4, range: 500, col: '#ff7030', status: { burn: [3, 0.2] } },
      ] },
      { hp: 0.5, enter: 'roar', speed: 1.2, attacks: [
        { t: 'spikes', mult: 1.2, count: 14, step: 32, windup: 0.8, cd: 5, col: '#ff8040' },
        { t: 'rain', mult: 1, count: 20, windup: 1, cd: 7, spread: 480, col: '#ff7030', status: { burn: [3, 0.2] } },
        { t: 'nova', mult: 0.8, count: 18, speed: 240, windup: 0.8, cd: 5, sprite: 'ember', col: '#ff7030' },
      ] },
    ],
    soul: { drop: 1, stats: { vit: 30, str: 22, bon: 20, end: 15 }, colors: [{ c: '잿불', hex: '#ffb070', a: 'sandMaw', all: ['shellCharge', 'ashCrown'] }], passive: 'sandwalker' },
    drops: [{ id: 'calamityHeart', ch: 1, n: [1, 2] }, { id: 'relic', ch: 0.5 }], card: { k: 'hpPct', v: 0.05 },
  });
  def('demus', {
    n: '패배를 모르는 투사 데무스', grade: 5, floor: 2, kind: 'guardian', ai: 'boss', poise: 9999,
    body: { t: 'humanoid', w: 18, h: 34, c: '#5a5040', c2: '#2e2820', eye: '#ffd060', wpn: 'shield', armor: true },
    hp: 6000, atk: 100, def: 32, spd: 100, aggro: 999, exp: 2800, stone: [250, 350],
    phases: [
      { hp: 1, attacks: [
        { t: 'charge', mult: 1.3, speed: 400, dur: 0.6, windup: 0.6, cd: 4, stun: 0.6 },
        { t: 'combo', mult: 0.7, hits: 5, range: 40, windup: 0.6, interval: 0.12, cd: 4, aoe: true },
        { t: 'throw', mult: 0.6, speed: 380, gravity: 200, windup: 0.6, cd: 6, range: 400, sprite: 'net', status: { stun: 1.0 } },
      ] },
      { hp: 0.5, enter: 'roar', speed: 1.25, attacks: [
        { t: 'leap', mult: 1.6, radius: 70, windup: 0.6, cd: 4, range: 400 },
      ] },
    ],
    soul: { drop: 0.33, rainbow: true, stats: { str: 10, bon: 10, end: 8, agi: 5 }, colors: [{ c: '무지개', hex: '#ffffff', all: ['shieldBash', 'bladeStorm', 'pierce'] }], passive: 'gladiator' },
    drops: [{ id: 'riftStone', ch: 0.66, n: [1, 2] }, { id: 'relic', ch: 0.33 }], card: { k: 'dmgPct', v: 0.02 },
  });

  // ═══════════ 3층 곡소리 숲 (6~5등급) ═══════════
  def('hanged', {
    n: '목매단 망자', grade: 6, floor: 3, kind: 'normal', ai: 'hanger',
    body: { t: 'humanoid', w: 12, h: 24, c: '#5a5a50', c2: '#2a2a24', eye: '#e0e0a0', wpn: 'none', hunch: 0.1, hanged: true },
    hp: 520, atk: 105, def: 12, spd: 60, aggro: 160, exp: 72, stone: [6, 10],
    attacks: [{ t: 'swipe', mult: 1, range: 20, windup: 0.5, cd: 1.5 }, { t: 'lunge', mult: 1.2, speed: 260, dur: 0.3, windup: 0.6, cd: 3, range: 90, status: { slow: [2, 0.3] } }],
    soul: { drop: 0.02, stats: { wil: 6, spr: 5, vit: 4, agi: -3 }, colors: [{ c: '갈색', hex: '#a09070', a: 'noose' }, { c: '붉은', hex: '#c05050', a: 'fleshArmor' }], passive: 'hangman' },
    drops: [{ id: 'noose', ch: 0.35 }], card: { k: 'statusRes', v: 0.01 },
  });
  def('mistWitch', {
    n: '안개 마녀', grade: 5, floor: 3, kind: 'normal', ai: 'ranged', keep: 150,
    body: { t: 'humanoid', w: 12, h: 26, c: '#2a3a30', c2: '#141e18', eye: '#a0ff80', wpn: 'staff', robe: true, hunch: 0.35 },
    hp: 450, atk: 110, def: 6, spd: 70, aggro: 260, exp: 92, stone: [7, 12],
    attacks: [
      { t: 'bolt', mult: 1, count: 1, speed: 230, homing: 1.8, windup: 0.7, cd: 2.6, col: '#a060ff', mag: true, status: { slow: [3, 0.35] } },
      { t: 'teleport', cd: 7, windup: 0.4 },
      { t: 'summon', mob: 'crow', count: 1, cd: 12, max: 2, windup: 0.8 },
    ],
    soul: { drop: 0.02, stats: { spr: 10, res: 6, vit: -5 }, colors: [{ c: '보라', hex: '#a060ff', a: 'hexBolt' }, { c: '녹색', hex: '#70b060', a: 'crowStorm' }], passive: 'witchCurse' },
    drops: [{ id: 'witchEye', ch: 0.3 }, { id: 'mistCap', ch: 0.2 }], card: { k: 'skillDmg', v: 0.012 },
  });
  def('treant', {
    n: '뒤틀린 수목인', grade: 5, floor: 3, kind: 'normal', ai: 'walker', poise: 160,
    body: { t: 'tree', w: 24, h: 40, c: '#3a3020', c2: '#1e1810', eye: '#c0ff60' },
    hp: 1200, atk: 135, def: 32, spd: 32, aggro: 170, exp: 110, stone: [9, 15],
    attacks: [{ t: 'swipe', mult: 1, range: 40, h: 36, windup: 0.75, cd: 1.9 }, { t: 'spikes', mult: 1.1, count: 6, step: 24, windup: 0.8, cd: 5, col: '#6a8050' }, { t: 'slam', mult: 1.2, radius: 60, windup: 1.0, cd: 6, col: '#6a8050' }],
    soul: { drop: 0.02, stats: { vit: 12, reg: 6, bon: 6, agi: -6 }, colors: [{ c: '녹색', hex: '#6a8050', a: 'rootSpike' }, { c: '갈색', hex: '#7a6a50', a: 'barkSkin' }], passive: 'rootbound' },
    drops: [{ id: 'heartwood', ch: 0.35 }], card: { k: 'hpPct', v: 0.012 },
  });
  def('crow', {
    n: '검은 까마귀', grade: 6, floor: 3, kind: 'normal', ai: 'flyer', pack: [2, 4],
    body: { t: 'flyer', w: 12, h: 10, c: '#18181e', c2: '#0a0a0e', eye: '#ff3030', wings: 'bird' },
    hp: 240, atk: 85, def: 4, spd: 150, aggro: 240, exp: 50, stone: [4, 8],
    attacks: [{ t: 'swoop', mult: 1, speed: 360, windup: 0.4, cd: 2.2, range: 180 }],
    soul: { drop: 0.02, stats: { agi: 8, per: 6, bon: -4 }, colors: [{ c: '검은', hex: '#303040', a: 'crowStorm' }, { c: '붉은', hex: '#ff3030', a: 'murderEye' }], passive: 'crowEyes' },
    drops: [{ id: 'crowFeather', ch: 0.4 }], card: { k: 'crit', v: 0.005 },
  });
  def('voicelessWitch', {
    n: '목소리 없는 마녀', grade: 5, floor: 3, kind: 'elite', ai: 'ranged', keep: 180, poise: 300,
    body: { t: 'humanoid', w: 16, h: 34, c: '#1e2a24', c2: '#0c1410', eye: '#ffffff', wpn: 'staff', robe: true, hunch: 0.2, horns: true },
    hp: 6000, atk: 160, def: 14, spd: 90, aggro: 320, exp: 1300, stone: [70, 100],
    attacks: [
      { t: 'bolt', mult: 0.8, count: 5, spread: 0.7, speed: 240, homing: 2, windup: 0.7, cd: 3, col: '#a060ff', mag: true },
      { t: 'teleport', cd: 4, windup: 0.3 },
      { t: 'cast', mult: 1.1, radius: 40, windup: 0.9, cd: 4, count: 3, range: 360, col: '#90ff70', mag: true },
      { t: 'roar', fear: 1, radius: 200, windup: 0.8, cd: 12, stun: 1.0 },
    ],
    soul: { drop: 0.35, stats: { spr: 16, res: 10, wil: 8, vit: -6 }, colors: [{ c: '창백', hex: '#e0e8e0', a: 'wail' }, { c: '보라', hex: '#a060ff', a: 'hexBolt' }], passive: 'ironWill' },
    drops: [{ id: 'scarMark', ch: 1, n: [3, 4] }, { id: 'design_hex', ch: 0.25 }, { id: 'frag3', ch: 0.35 }], card: { k: 'magDR', v: 0.015 },
  });
  def('thousandEyeCrow', {
    n: '천 개의 눈', grade: 5, floor: 3, kind: 'elite', ai: 'flyer', poise: 250,
    body: { t: 'flyer', w: 30, h: 24, c: '#14141c', c2: '#08080c', eye: '#ff2020', wings: 'bird', eyes: true },
    hp: 5000, atk: 155, def: 10, spd: 170, aggro: 340, exp: 1250, stone: [65, 95],
    attacks: [
      { t: 'swoop', mult: 1.3, speed: 440, windup: 0.4, cd: 2, range: 260 },
      { t: 'summon', mob: 'crow', count: 3, cd: 12, max: 5, windup: 0.7 },
      { t: 'bolt', mult: 0.6, count: 8, spread: 6.28, speed: 200, homing: 0.6, windup: 0.8, cd: 5, sprite: 'needle', col: '#ff4040' },
    ],
    soul: { drop: 0.35, stats: { agi: 12, per: 12, flx: 8, bon: -6 }, colors: [{ c: '붉은', hex: '#ff3030', a: 'murderEye' }, { c: '검은', hex: '#303040', a: 'crowStorm' }], passive: 'thousandEyes' },
    drops: [{ id: 'scarMark', ch: 1, n: [3, 4] }, { id: 'crowFeather', ch: 1, n: [5, 9] }, { id: 'frag3', ch: 0.35 }], card: { k: 'crit', v: 0.012 },
  });
  def('oldHeart', {
    n: '고목의 심장', grade: 5, floor: 3, kind: 'elite', ai: 'walker', poise: 500,
    body: { t: 'tree', w: 34, h: 54, c: '#4a3a24', c2: '#241c10', eye: '#ff9040', heart: true },
    hp: 8500, atk: 165, def: 40, spd: 34, aggro: 260, exp: 1400, stone: [80, 110],
    attacks: [
      { t: 'spikes', mult: 1.1, count: 10, step: 26, windup: 0.8, cd: 4, col: '#80a060', status: { bleed: [4, 0.15] } },
      { t: 'slam', mult: 1.3, radius: 90, windup: 1.0, cd: 5, col: '#80a060' },
      { t: 'swipe', mult: 1.1, range: 50, h: 46, windup: 0.8, cd: 2 },
    ],
    soul: { drop: 0.35, stats: { vit: 18, reg: 10, bon: 10, agi: -6 }, colors: [{ c: '녹색', hex: '#80a060', a: 'thornBurst' }, { c: '갈색', hex: '#7a6a50', a: 'barkSkin' }], passive: 'oldHeart' },
    drops: [{ id: 'scarMark', ch: 1, n: [3, 4] }, { id: 'heartwood', ch: 1, n: [4, 7] }, { id: 'frag3', ch: 0.35 }, { id: 'design_root', ch: 0.25 }], card: { k: 'healPct', v: 0.02 },
  });
  def('morwina', {
    n: '뒤틀린 숲의 어미 모르위나', grade: 3, floor: 3, kind: 'lord', ai: 'boss', poise: 9999,
    body: { t: 'humanoid', w: 26, h: 56, c: '#1a2620', c2: '#0a120e', eye: '#d0ffb0', wpn: 'staff', robe: true, horns: true, hunch: 0.2 },
    hp: 40000, atk: 200, def: 32, spd: 100, aggro: 999, exp: 9500, stone: [700, 1000],
    phases: [
      { hp: 1, attacks: [
        { t: 'bolt', mult: 0.8, count: 5, spread: 0.8, speed: 240, homing: 2, windup: 0.7, cd: 3, col: '#a0ff80', mag: true },
        { t: 'spikes', mult: 1.1, count: 12, step: 28, windup: 0.8, cd: 4.5, col: '#6a8050' },
        { t: 'teleport', cd: 5, windup: 0.4 },
      ] },
      { hp: 0.6, enter: 'roar', attacks: [
        { t: 'summon', mob: 'crow', corrupt: true, count: 3, cd: 14, max: 4, windup: 1 },
        { t: 'cast', mult: 1.1, radius: 46, windup: 0.9, cd: 4, count: 4, range: 420, col: '#90ff70', mag: true },
        { t: 'roar', fear: 2, radius: 300, windup: 0.9, cd: 14 },
      ] },
      { hp: 0.3, enter: 'roar', speed: 1.25, attacks: [
        { t: 'beam', mult: 1.6, len: 480, h: 22, windup: 1, dur: 0.6, cd: 6, col: '#b0ff90', mag: true },
        { t: 'rain', mult: 0.9, count: 18, windup: 0.9, cd: 7, spread: 460, col: '#90ff70' },
      ] },
    ],
    soul: { drop: 0.6, stats: { spr: 22, res: 16, wil: 14, vit: 10 }, colors: [{ c: '녹색', hex: '#80a060', a: 'thornBurst' }, { c: '창백', hex: '#e0e8e0', a: 'wail' }], passive: 'motherRoot' },
    drops: [{ id: 'lordSigil', ch: 1, n: [2, 3] }, { id: 'scarMark', ch: 1, n: [6, 9] }, { id: 'frag3', ch: 1, n: [2, 4] }], card: { k: 'skillDmg', v: 0.04 },
  });
  def('ygd', {
    n: '울부짖는 고목 이그드', grade: 1, floor: 3, kind: 'calamity', ai: 'boss', poise: 9999, rooted: true,
    body: { t: 'tree', w: 70, h: 110, c: '#2a2218', c2: '#0e0a06', eye: '#ff5030', heart: true, giant: true },
    hp: 150000, atk: 440, def: 70, spd: 20, aggro: 999, exp: 60000, stone: [4000, 6000],
    phases: [
      { hp: 1, attacks: [
        { t: 'spikes', mult: 1.1, count: 16, step: 30, windup: 0.9, cd: 3.5, col: '#80a060' },
        { t: 'swipe', mult: 1.2, range: 90, h: 80, windup: 1.0, cd: 2.5 },
        { t: 'summon', mob: 'treant', count: 1, cd: 18, max: 2, windup: 1.2 },
      ] },
      { hp: 0.5, enter: 'roar', speed: 1.2, attacks: [
        { t: 'rain', mult: 1, count: 24, windup: 1, cd: 6, spread: 560, col: '#a07040' },
        { t: 'roar', fear: 3, radius: 600, windup: 1, cd: 12, stun: 1.5 },
        { t: 'beam', mult: 1.8, len: 600, h: 26, windup: 1.2, dur: 0.7, cd: 7, col: '#ff6030' },
      ] },
    ],
    soul: { drop: 1, stats: { vit: 40, reg: 20, bon: 25, spr: 20, agi: -8 }, colors: [{ c: '고목', hex: '#b08850', a: 'rootSpike', all: ['rootSpike', 'thornBurst', 'barkSkin'] }], passive: 'oldHeart' },
    drops: [{ id: 'calamityHeart', ch: 1, n: [2, 3] }, { id: 'relic', ch: 0.6 }], card: { k: 'hpPct', v: 0.06 },
  });
  def('eilen', {
    n: '백색 사제 에일렌', grade: 4, floor: 3, kind: 'guardian', ai: 'boss', poise: 9999,
    body: { t: 'humanoid', w: 14, h: 34, c: '#d8d4c4', c2: '#8a8676', eye: '#ffffff', wpn: 'staff', robe: true, halo: true },
    hp: 16000, atk: 190, def: 26, spd: 95, aggro: 999, exp: 10500, stone: [600, 900],
    phases: [
      { hp: 1, attacks: [
        { t: 'beam', mult: 1.4, len: 460, h: 18, windup: 0.9, dur: 0.5, cd: 4.5, col: '#fff0c0', mag: true },
        { t: 'teleport', cd: 4, windup: 0.3 },
        { t: 'cast', mult: 1.1, radius: 40, windup: 0.8, cd: 3.5, count: 3, range: 420, col: '#fff0c0', mag: true },
      ] },
      { hp: 0.5, enter: 'roar', speed: 1.25, attacks: [
        { t: 'rain', mult: 0.9, count: 20, windup: 0.9, cd: 6, spread: 460, col: '#fff0c0', mag: true },
        { t: 'nova', mult: 0.8, count: 20, speed: 220, windup: 0.7, cd: 5, sprite: 'orb', col: '#fff0c0', mag: true },
      ] },
    ],
    soul: { drop: 0.33, rainbow: true, stats: { spr: 16, res: 14, wil: 12, per: 6 }, colors: [{ c: '무지개', hex: '#ffffff', all: ['judgement', 'hexBolt', 'fade'] }], passive: 'starBless' },
    drops: [{ id: 'riftStone', ch: 0.66, n: [1, 3] }, { id: 'relic', ch: 0.33 }], card: { k: 'cdr', v: 0.01 },
  });

  // ═══════════ 4층 뒤집힌 첨탑 (4~3등급) ═══════════
  def('statueGuard', {
    n: '석상 파수병', grade: 4, floor: 4, kind: 'normal', ai: 'walker', poise: 200,
    body: { t: 'humanoid', w: 16, h: 30, c: '#76767e', c2: '#3a3a40', eye: '#c0b0ff', wpn: 'spear', armor: true, stone: true },
    hp: 1300, atk: 200, def: 45, spd: 50, aggro: 200, exp: 240, stone: [14, 22],
    attacks: [{ t: 'swipe', mult: 1, range: 46, h: 12, windup: 0.6, cd: 1.6 }, { t: 'combo', mult: 0.8, hits: 2, range: 46, windup: 0.6, interval: 0.25, cd: 3.2 }],
    soul: { drop: 0.018, stats: { bon: 14, vit: 10, agi: -6 }, colors: [{ c: '회색', hex: '#b0b0c0', a: 'stoneSpear' }, { c: '흰', hex: '#e0e0e8', a: 'petrify' }], passive: 'statue' },
    drops: [{ id: 'statueChip', ch: 0.35 }], card: { k: 'physDR', v: 0.006 },
  });
  def('harpy', {
    n: '달 없는 늑대인간', grade: 4, floor: 4, kind: 'normal', ai: 'flyer',
    body: { t: 'flyer', w: 18, h: 20, c: '#6a5a7a', c2: '#3a3046', eye: '#ffe060', wings: 'bird', face: true },
    hp: 1000, atk: 185, def: 22, spd: 135, aggro: 260, exp: 220, stone: [12, 20],
    attacks: [{ t: 'swoop', mult: 1.1, speed: 400, windup: 0.45, cd: 2.4, range: 220 }, { t: 'throw', mult: 0.7, count: 3, spread: 0.3, speed: 380, gravity: 0, windup: 0.6, cd: 3, range: 320, sprite: 'needle', col: '#d0c8ff' }],
    soul: { drop: 0.018, stats: { agi: 12, flx: 8, vit: -5 }, colors: [{ c: '보라', hex: '#c0b0e0', a: 'diveTalon' }, { c: '흰', hex: '#e0e0ff', a: 'galeFeather' }], passive: 'harpy' },
    drops: [{ id: 'harpyPlume', ch: 0.35 }], card: { k: 'movePct', v: 0.01 },
  });
  def('phantomKnight', {
    n: '유령 기사', grade: 3, floor: 4, kind: 'normal', ai: 'walker', poise: 160,
    body: { t: 'humanoid', w: 16, h: 32, c: '#4a5a7a', c2: '#26304a', eye: '#80c0ff', wpn: 'greatsword', armor: true, ghost: true },
    hp: 1600, atk: 220, def: 35, spd: 92, aggro: 240, exp: 340, stone: [18, 28],
    attacks: [{ t: 'combo', mult: 0.8, hits: 3, range: 40, windup: 0.5, interval: 0.22, cd: 2.5 }, { t: 'lunge', mult: 1.3, speed: 440, dur: 0.32, windup: 0.5, cd: 3.2, range: 180 }],
    soul: { drop: 0.018, stats: { str: 14, bon: 8, wil: 8, agi: 4 }, colors: [{ c: '청색', hex: '#9ab0ff', a: 'phantomSlash' }, { c: '회색', hex: '#c0c0c0', a: 'shieldBash' }], passive: 'knightOath' },
    drops: [{ id: 'phantomSteel', ch: 0.3 }], card: { k: 'dmgPct', v: 0.012 },
  });
  def('shadowAssassin', {
    n: '그림자 자객', grade: 3, floor: 4, kind: 'normal', ai: 'walker',
    body: { t: 'humanoid', w: 11, h: 26, c: '#16121f', c2: '#08060e', eye: '#ff3070', wpn: 'daggers', hunch: 0.25 },
    hp: 1100, atk: 230, def: 18, spd: 155, aggro: 260, exp: 330, stone: [18, 28],
    attacks: [{ t: 'teleport', cd: 4.5, windup: 0.3, behind: true }, { t: 'combo', mult: 0.6, hits: 3, range: 22, windup: 0.32, interval: 0.1, cd: 1.8, status: { bleed: [3, 0.1] } }, { t: 'lunge', mult: 1.2, speed: 480, dur: 0.25, windup: 0.4, cd: 2.6, range: 150 }],
    soul: { drop: 0.018, stats: { agi: 14, flx: 10, cut: 8, vit: -6 }, colors: [{ c: '검은', hex: '#6050a0', a: 'shadowStep' }, { c: '붉은', hex: '#ff3030', a: 'murderEye' }], passive: 'assassin' },
    drops: [{ id: 'shadowSilk', ch: 0.3 }], card: { k: 'critDmg', v: 0.015 },
  });
  def('fallenSentinel', {
    n: '타락한 감시자', grade: 3, floor: 4, kind: 'elite', ai: 'walker', poise: 900,
    body: { t: 'humanoid', w: 24, h: 46, c: '#5a5464', c2: '#2a2632', eye: '#ff60a0', wpn: 'spear', armor: true, stone: true, horns: true },
    hp: 16000, atk: 300, def: 55, spd: 60, aggro: 300, exp: 4200, stone: [200, 280],
    attacks: [
      { t: 'combo', mult: 0.9, hits: 3, range: 60, h: 14, windup: 0.6, interval: 0.25, cd: 2.6 },
      { t: 'slam', mult: 1.3, radius: 90, windup: 1, cd: 5, col: '#c0b0ff' },
      { t: 'spikes', mult: 1.1, count: 10, step: 30, windup: 0.8, cd: 5, col: '#c0b0ff' },
    ],
    soul: { drop: 0.35, stats: { bon: 20, vit: 16, res: 10 }, colors: [{ c: '회색', hex: '#b0b0c0', a: 'stoneSpear' }, { c: '흰', hex: '#e0e0e8', a: 'petrify' }], passive: 'ironWill' },
    drops: [{ id: 'scarMark', ch: 1, n: [4, 6] }, { id: 'statueChip', ch: 1, n: [4, 8] }, { id: 'frag4', ch: 0.4 }], card: { k: 'physDR', v: 0.015 },
  });
  def('nightBlade', {
    n: '밤의 칼날', grade: 3, floor: 4, kind: 'elite', ai: 'walker', poise: 500,
    body: { t: 'humanoid', w: 13, h: 30, c: '#0e0a16', c2: '#04020a', eye: '#ff1050', wpn: 'daggers', hunch: 0.2, cape: true },
    hp: 12000, atk: 330, def: 30, spd: 190, aggro: 340, exp: 4300, stone: [200, 280],
    attacks: [
      { t: 'teleport', cd: 2.6, windup: 0.25, behind: true },
      { t: 'combo', mult: 0.6, hits: 5, range: 26, windup: 0.3, interval: 0.09, cd: 2, status: { bleed: [4, 0.15] } },
      { t: 'throw', mult: 0.6, count: 3, spread: 0.2, speed: 520, gravity: 0, windup: 0.4, cd: 3, range: 400, sprite: 'needle', col: '#ff3070' },
    ],
    soul: { drop: 0.35, stats: { agi: 18, flx: 14, cut: 12, vit: -8 }, colors: [{ c: '검은', hex: '#6050a0', a: 'shadowStep' }, { c: '청색', hex: '#9ab0ff', a: 'phantomSlash' }], passive: 'mirror' },
    drops: [{ id: 'scarMark', ch: 1, n: [4, 6] }, { id: 'shadowSilk', ch: 1, n: [4, 7] }, { id: 'frag4', ch: 0.4 }, { id: 'design_shadow', ch: 0.25 }], card: { k: 'critDmg', v: 0.03 },
  });
  def('orden', {
    n: '첨탑의 왕 오르덴', grade: 2, floor: 4, kind: 'lord', ai: 'boss', poise: 9999,
    body: { t: 'humanoid', w: 26, h: 52, c: '#3a3450', c2: '#1a1626', eye: '#e0d0ff', wpn: 'greatsword', armor: true, crown: true, cape: true },
    hp: 90000, atk: 360, def: 60, spd: 100, aggro: 999, exp: 42000, stone: [2500, 3500],
    phases: [
      { hp: 1, attacks: [
        { t: 'combo', mult: 0.9, hits: 3, range: 54, h: 50, windup: 0.6, interval: 0.26, cd: 2.4 },
        { t: 'beam', mult: 1.4, len: 520, h: 20, windup: 0.9, dur: 0.5, cd: 5, col: '#e8e0ff' },
        { t: 'leap', mult: 1.6, radius: 80, windup: 0.6, cd: 5, range: 500 },
      ] },
      { hp: 0.6, enter: 'roar', attacks: [
        { t: 'rain', mult: 0.9, count: 20, windup: 0.9, cd: 6, spread: 520, col: '#e8e0ff' },
        { t: 'summon', mob: 'phantomKnight', corrupt: true, count: 1, cd: 18, max: 2, windup: 1 },
      ] },
      { hp: 0.3, enter: 'roar', speed: 1.3, attacks: [
        { t: 'nova', mult: 0.8, count: 22, speed: 250, windup: 0.8, cd: 5, sprite: 'orb', col: '#e8e0ff' },
        { t: 'spikes', mult: 1.1, count: 14, step: 32, windup: 0.7, cd: 5, col: '#c0b0ff' },
      ] },
    ],
    soul: { drop: 0.6, stats: { str: 22, bon: 18, spr: 18, vit: 16, wil: 12 }, colors: [{ c: '별빛', hex: '#e8e0ff', a: 'starfall' }, { c: '흰', hex: '#fff0c0', a: 'judgement' }], passive: 'spireKing' },
    drops: [{ id: 'lordSigil', ch: 1, n: [3, 4] }, { id: 'scarMark', ch: 1, n: [8, 12] }, { id: 'frag4', ch: 1, n: [2, 4] }], card: { k: 'dmgPct', v: 0.05 },
  });
  def('seraphiel', {
    n: '추락한 별 세라피엘', grade: 1, floor: 4, kind: 'calamity', ai: 'boss', poise: 9999, flying: true,
    body: { t: 'flyer', w: 40, h: 58, c: '#d8d0e8', c2: '#6a6080', eye: '#ffffff', wings: 'angel', halo: true, broken: true },
    hp: 350000, atk: 760, def: 110, spd: 140, aggro: 999, exp: 260000, stone: [12000, 18000],
    phases: [
      { hp: 1, attacks: [
        { t: 'beam', mult: 1.3, len: 640, h: 22, windup: 0.9, dur: 0.6, cd: 4, col: '#fff8e0' },
        { t: 'swoop', mult: 1.2, speed: 460, windup: 0.6, cd: 3.5, range: 500 },
        { t: 'throw', mult: 0.6, count: 7, spread: 0.8, speed: 420, gravity: 0, windup: 0.6, cd: 3, range: 600, sprite: 'needle', col: '#ffffff' },
      ] },
      { hp: 0.6, enter: 'roar', speed: 1.15, attacks: [
        { t: 'rain', mult: 0.9, count: 28, windup: 1, cd: 5, spread: 640, col: '#fff0c0' },
        { t: 'nova', mult: 0.7, count: 24, speed: 240, windup: 0.8, cd: 5, sprite: 'orb', col: '#ffffff' },
      ] },
      { hp: 0.25, enter: 'roar', speed: 1.3, attacks: [
        { t: 'roar', fear: 3, radius: 800, windup: 1, cd: 12, stun: 1.2 },
      ] },
    ],
    soul: { drop: 1, stats: { spr: 30, agi: 20, flx: 20, str: 20, res: 20 }, colors: [{ c: '타락', hex: '#fff0d0', a: 'judgement', all: ['judgement', 'starfall', 'diveTalon'] }], passive: 'fallenWing' },
    drops: [{ id: 'calamityHeart', ch: 1, n: [3, 5] }, { id: 'relic', ch: 0.7 }], card: { k: 'dmgPct', v: 0.08 },
  });
  def('doppel', {
    n: '거울 속의 자', grade: 2, floor: 4, kind: 'guardian', ai: 'boss', poise: 9999,
    body: { t: 'humanoid', w: 12, h: 26, c: '#b8c8d8', c2: '#5a6a7a', eye: '#ffffff', wpn: 'blade', mirror: true },
    hp: 40000, atk: 320, def: 55, spd: 160, aggro: 999, exp: 46000, stone: [2200, 3000],
    phases: [
      { hp: 1, attacks: [
        { t: 'combo', mult: 0.7, hits: 3, range: 28, windup: 0.3, interval: 0.12, cd: 1.4 },
        { t: 'lunge', mult: 1.2, speed: 520, dur: 0.28, windup: 0.35, cd: 2.2, range: 220 },
        { t: 'teleport', cd: 3, windup: 0.25, behind: true },
      ] },
      { hp: 0.5, enter: 'roar', speed: 1.3, attacks: [
        { t: 'throw', mult: 0.8, count: 3, spread: 0.2, speed: 560, gravity: 0, windup: 0.4, cd: 2.5, range: 500, sprite: 'needle', col: '#c0e0ff' },
        { t: 'summon', mob: 'doppelShade', count: 2, cd: 12, max: 2, windup: 0.8 },
      ] },
    ],
    soul: { drop: 0.33, rainbow: true, stats: { agi: 12, str: 12, spr: 12, flx: 10 }, colors: [{ c: '무지개', hex: '#ffffff', all: ['mirrorImage', 'shadowStep', 'phantomSlash'] }], passive: 'mirror' },
    drops: [{ id: 'riftStone', ch: 0.66, n: [2, 3] }, { id: 'relic', ch: 0.33 }], card: { k: 'dodge', v: 0.01 },
  });
  def('doppelShade', {
    n: '거울 그림자', grade: 3, floor: 4, kind: 'normal', ai: 'walker', summonOnly: true,
    body: { t: 'humanoid', w: 12, h: 26, c: '#6a7a8a', c2: '#3a4a5a', eye: '#ffffff', wpn: 'blade', mirror: true },
    hp: 1500, atk: 220, def: 30, spd: 150, aggro: 999, exp: 100, stone: [5, 10],
    attacks: [{ t: 'combo', mult: 0.6, hits: 2, range: 24, windup: 0.35, interval: 0.12, cd: 1.6 }],
    soul: null, drops: [],
  });
})();

// 잠식종: 층주가 깨어나면 일반 몬스터가 나락에 잠식되어 강해진다
HC.corruptDef = function (base) {
  const d = Object.assign({}, base);
  d.id = base.id + '_c'; d.baseId = base.id;
  d.n = '잠식된 ' + base.n; d.grade = Math.max(1, base.grade - 3);
  d.hp = Math.round(base.hp * 3); d.atk = Math.round(base.atk * 2.1); d.def = base.def + 6;
  d.exp = base.exp * 3; d.stone = [base.stone[0] * 3, base.stone[1] * 3];
  d.spd = base.spd * 1.12;
  d.body = Object.assign({}, base.body, { c: HC.U.shade(base.body.c, -0.35), eye: '#c060ff', corrupt: true });
  d.corrupt = true;
  d.attacks = base.attacks.map((a) => Object.assign({}, a, { windup: a.windup * 0.85 }));
  d.soul = base.soul ? Object.assign({}, base.soul, { drop: base.soul.drop * 2 }) : null;
  d.drops = (base.drops || []).concat([{ id: 'abyssAsh', ch: 0.3 }]);
  return d;
};
HC.getMob = function (id) {
  if (HC.MOBS[id]) return HC.MOBS[id];
  if (id.endsWith('_c')) {
    const b = HC.MOBS[id.slice(0, -2)];
    if (b) { const d = HC.corruptDef(b); HC.MOBS[id] = d; return d; }
  }
  return null;
};
