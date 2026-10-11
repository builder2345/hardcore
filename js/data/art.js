'use strict';
/*
 아트 배정표. 그림은 전부 ansimuz(Luis Zuno)의 퍼블릭 도메인 'Legacy Collection'.
 - FACE: 원본 스프라이트가 바라보는 방향 (1 = 오른쪽, -1 = 왼쪽)
 - MOB_ART: 몬스터 id → 스프라이트 키, 상태별 애니메이션, 배율, 색조
 - TILESETS: 테마별 16px 타일 칸 좌표 [열, 행]
 - BG: 테마별 시차 배경 레이어
*/
HC.FACE = {
  hero: 1, skeleton: -1, skeletonC: -1, hound: -1, lizard: 1, thing: -1, ogre: -1, wolf: 1, toad: 1, demon: -1, dragon: -1,
  vampire: 1, raider: 1, ninja: 1, spider: 1, sghost: -1, burnghoul: -1, fireskull: -1, hellbeast: -1, nightmare: -1,
  cghost: 1, cghostH: 1, wizard: -1, crow: -1, eye: -1, treant: 1, witch: 1, centaur: 1, angel: 1, gato: -1, reaper: -1,
  werewolf: 1, oldman: 1, woman: -1, bearded: 1, hatman: 1,
};

// 색조: colorize(색을 덧입힘) / gray / dark / bright
HC.TINTS = {
  corrupt: { mode: 'colorize', color: '#8a46d8', amt: 0.55 },
  stone: { mode: 'colorize', color: '#a8a8b8', amt: 0.85 },
  stoneDark: { mode: 'colorize', color: '#6e6a80', amt: 0.85 },
  ghost: { mode: 'colorize', color: '#7ea0ff', amt: 0.7 },
  pale: { mode: 'colorize', color: '#e8eef0', amt: 0.75 },
  mirror: { mode: 'colorize', color: '#c8e4ff', amt: 0.6 },
  shade: { mode: 'colorize', color: '#3a3050', amt: 0.8 },
  bronze: { mode: 'colorize', color: '#c89048', amt: 0.55 },
  rock: { mode: 'colorize', color: '#8a7a6a', amt: 0.7 },
  lava: { mode: 'colorize', color: '#ff7a30', amt: 0.55 },
  venom: { mode: 'colorize', color: '#b8e040', amt: 0.55 },
  blood: { mode: 'colorize', color: '#c02030', amt: 0.55 },
  night: { mode: 'colorize', color: '#40304a', amt: 0.7 },
  rot: { mode: 'colorize', color: '#4a6a30', amt: 0.5 },
  wood: { mode: 'colorize', color: '#8a6a40', amt: 0.6 },
  ember: { mode: 'colorize', color: '#ff5a2a', amt: 0.4 },
  frost: { mode: 'colorize', color: '#bfefff', amt: 0.5 },
};

/*
 anims: 게임 상태 → [스프라이트 애니메이션, 시작 프레임, 끝 프레임(포함)] 또는 문자열
  idle / walk / windup / attack / hurt / spawn
*/
HC.MOB_ART = {
  // 1층
  goblin: { k: 'skeleton', anims: { idle: ['walk', 0, 0], walk: 'walk', windup: ['walk', 3, 3], attack: ['walk', 4, 7], spawn: 'rise' } },
  goblinSpear: { k: 'skeletonC', anims: { idle: ['walk', 0, 0], walk: 'walk', windup: ['walk', 3, 3], attack: ['walk', 4, 7], spawn: 'rise' } },
  fangWolf: { k: 'hound', anims: { idle: 'idle', walk: 'walk', windup: ['jump', 0, 1], attack: 'run' } },
  gnome: { k: 'lizard', scale: 1.4, anims: { idle: 'idle', walk: 'walk', windup: ['attack', 0, 1], attack: 'attack', hurt: 'hurt' } },
  ghoul: { k: 'thing', anims: { idle: ['walk', 0, 0], walk: 'walk', windup: ['walk', 2, 2], attack: 'walk' } },
  urg: { k: 'ogre', anims: { idle: 'idle', walk: 'walk', windup: ['attack', 0, 2], attack: ['attack', 3, 6] } },
  whiteFang: { k: 'wolf', scale: 1.5, tint: 'frost', anims: { idle: ['run', 0, 0], walk: 'run', windup: ['run', 1, 1], attack: 'run' } },
  gnomeQueen: { k: 'toad', scale: 1.15, anims: { idle: 'idle', walk: 'jump', windup: ['attack', 0, 1], attack: ['attack', 2, 2] } },
  bloatGhoul: { k: 'thing', scale: 1.9, tint: 'rot', anims: { idle: ['walk', 0, 0], walk: 'walk', windup: ['walk', 2, 2], attack: 'walk' } },
  varges: { k: 'demon', anims: { idle: 'idle', walk: 'idle', windup: ['attack', 0, 5], attack: ['attack', 6, 17] } },
  grumar: { k: 'dragon', scale: 2, tint: 'frost', anims: { idle: 'idle', walk: 'idle', windup: ['breath', 0, 2], attack: ['breath', 3, 6] } },
  kalamus: { k: 'vampire', anims: { idle: 'idle', walk: 'idle', windup: 'idle', attack: 'idle' } },
  // 2층
  lizardman: { k: 'raider', anims: { idle: ['walk', 0, 0], walk: ['walk', 5, 8], windup: ['walk', 1, 1], attack: ['walk', 2, 4] } },
  scorpion: { k: 'spider', scale: 1.5, anims: { idle: ['walk', 0, 0], walk: 'walk', windup: ['walk', 1, 1], attack: 'walk' } },
  ashWraith: { k: 'sghost', anims: { idle: 'fly', walk: 'fly', windup: 'fly', attack: 'fly' } },
  rockGolem: { k: 'ogre', tint: 'rock', anims: { idle: 'idle', walk: 'walk', windup: ['attack', 0, 2], attack: ['attack', 3, 6] } },
  selkis: { k: 'spider', scale: 2.6, tint: 'venom', anims: { idle: ['walk', 0, 0], walk: 'walk', windup: ['walk', 1, 1], attack: 'walk' } },
  ashSoul: { k: 'fireskull', anims: { idle: 'fly', walk: 'fly', windup: 'fly', attack: 'fly' } },
  golemCoreElite: { k: 'ogre', scale: 1.35, tint: 'lava', anims: { idle: 'idle', walk: 'walk', windup: ['attack', 0, 2], attack: ['attack', 3, 6] } },
  lizardChief: { k: 'ninja', scale: 1.2, tint: 'ember', anims: { idle: ['walk', 0, 0], walk: ['walk', 5, 8], windup: ['walk', 1, 2], attack: ['walk', 3, 4] } },
  agdax: { k: 'hellbeast', scale: 1.6, anims: { idle: 'idle', walk: 'idle', windup: ['breath', 0, 1], attack: ['breath', 2, 3] } },
  barkus: { k: 'nightmare', scale: 1.7, tint: 'ember', anims: { idle: 'idle', walk: 'run', windup: 'idle', attack: 'run' } },
  demus: { k: 'hero', scale: 1.25, tint: 'bronze', anims: { idle: 'idle', walk: 'run', windup: ['attack', 0, 1], attack: ['attack', 2, 5], hurt: 'hurt' } },
  // 3층
  hanged: { k: 'cghost', anims: { idle: 'fly', walk: 'fly', windup: 'fly', attack: 'fly' } },
  mistWitch: { k: 'wizard', anims: { idle: 'idle', walk: 'idle', windup: ['attack', 0, 4], attack: ['attack', 5, 9] } },
  treant: { k: 'treant', anims: { idle: 'idle', walk: 'idle', windup: 'idle', attack: 'idle' } },
  crow: { k: 'crow', anims: { idle: 'fly', walk: 'fly', windup: 'fly', attack: 'fly' } },
  voicelessWitch: { k: 'wizard', scale: 1.4, tint: 'pale', anims: { idle: 'idle', walk: 'idle', windup: ['attack', 0, 4], attack: ['attack', 5, 9] } },
  thousandEyeCrow: { k: 'eye', scale: 2, anims: { idle: 'fly', walk: 'fly', windup: 'fly', attack: 'fly' } },
  oldHeart: { k: 'treant', scale: 1.45, tint: 'blood', anims: { idle: 'idle', walk: 'idle', windup: 'idle', attack: 'idle' } },
  morwina: { k: 'witch', scale: 1.4, anims: { idle: 'idle', walk: 'idle', windup: 'idle', attack: 'idle' } },
  ygd: { k: 'treant', scale: 2.4, tint: 'night', anims: { idle: 'idle', walk: 'idle', windup: 'idle', attack: 'idle' } },
  eilen: { k: 'cghostH', scale: 1.5, tint: 'pale', anims: { idle: 'fly', walk: 'fly', windup: 'fly', attack: 'fly' } },
  // 4층
  statueGuard: { k: 'hero', tint: 'stone', anims: { idle: 'idle', walk: 'run', windup: ['attack', 0, 1], attack: ['attack', 2, 5], hurt: 'hurt' } },
  harpy: { k: 'werewolf', anims: { idle: 'idle', walk: 'run', windup: ['jump', 0, 0], attack: ['jump', 1, 1] } },
  phantomKnight: { k: 'hero', tint: 'ghost', alpha: 0.85, anims: { idle: 'idle', walk: 'run', windup: ['attack', 0, 1], attack: ['attack', 2, 5], hurt: 'hurt' } },
  shadowAssassin: { k: 'ninja', tint: 'shade', anims: { idle: ['walk', 0, 0], walk: ['walk', 5, 8], windup: ['walk', 1, 2], attack: ['walk', 3, 4] } },
  fallenSentinel: { k: 'hero', scale: 1.5, tint: 'stoneDark', anims: { idle: 'idle', walk: 'run', windup: ['attack', 0, 1], attack: ['attack', 2, 5], hurt: 'hurt' } },
  nightBlade: { k: 'ninja', scale: 1.25, tint: 'blood', anims: { idle: ['walk', 0, 0], walk: ['walk', 5, 8], windup: ['walk', 1, 2], attack: ['walk', 3, 4] } },
  orden: { k: 'centaur', scale: 1.3, anims: { idle: 'idle', walk: 'idle', windup: 'idle', attack: 'idle' } },
  seraphiel: { k: 'angel', scale: 1.25, anims: { idle: 'idle', walk: 'idle', windup: ['attack', 0, 0], attack: ['attack', 1, 2] } },
  doppel: { k: 'hero', tint: 'mirror', anims: { idle: 'idle', walk: 'run', windup: ['attack', 0, 1], attack: ['attack', 2, 5], hurt: 'hurt' } },
  doppelShade: { k: 'hero', tint: 'shade', alpha: 0.85, anims: { idle: 'idle', walk: 'run', windup: ['attack', 0, 1], attack: ['attack', 2, 5] } },
  dummy: { k: 'skeleton', tint: 'wood', anims: { idle: ['walk', 0, 0], walk: ['walk', 0, 0] } },
};

// 테마별 타일 칸. top/fill/left/right/tl/tr/bottom/under 는 [열, 행] 후보 목록
HC.TILESETS = {
  cave: { img: 'assets/tiles/cave.png',
    top: [[2, 15], [3, 15], [4, 15], [5, 15], [9, 9], [11, 9], [13, 9], [15, 9]], fill: [[10, 2], [12, 2], [13, 3], [11, 11], [14, 12], [16, 16], [19, 16], [8, 16], [12, 13]],
    left: [[7, 11], [7, 12], [7, 13]], right: [[23, 11], [23, 12], [23, 13]], tl: [[7, 9]], tr: [[23, 9]], bottom: [[9, 5], [10, 5], [11, 5], [12, 5], [14, 5], [17, 5]] },
  waste: { img: 'assets/tiles/waste.png',
    top: [[3, 1], [4, 1]], fill: [[3, 3], [4, 3], [3, 4], [4, 4]], under: [[3, 2], [4, 2]], left: [[1, 3], [1, 4]], right: [[6, 3], [6, 4]], tl: [[1, 1]], tr: [[6, 1]], deep: [[3, 6]] },
  forest: { img: 'assets/tiles/forest.png',
    top: [[3, 2], [5, 2], [6, 2], [7, 2], [9, 2], [10, 2]], fill: [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3]], left: [[13, 3]], right: [[16, 3]], tl: [[13, 2]], tr: [[16, 2]],
    deco: [[4, 1], [5, 1], [8, 1], [9, 1]] },
  spire: { img: 'assets/tiles/spire.png',
    top: [[2, 2], [3, 2], [5, 2]], fill: [[2, 3], [3, 3], [5, 3], [13, 3], [14, 3], [16, 3], [17, 3]], deep: [[2, 5]] },
  abyss: { img: 'assets/tiles/abyss.png',
    top: [[3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [11, 7], [12, 7]], under: [[3, 8], [5, 8], [7, 8], [9, 8], [11, 8]], fill: [[3, 9], [5, 9], [7, 9], [9, 9], [11, 9], [4, 10], [8, 10]],
    left: [[2, 8], [2, 9], [2, 10]], right: [[13, 8], [13, 9], [13, 10]], tl: [[2, 7]], tr: [[13, 7]], spikeUp: [[6, 5], [7, 5]] },
  blood: { img: 'assets/tiles/blood.png',
    top: [[4, 4], [5, 4], [6, 4], [7, 4], [11, 4], [12, 4]], under: [[4, 5], [5, 5], [6, 5], [7, 5], [11, 5], [12, 5]], fill: [[1, 6], [2, 6], [11, 6], [12, 6], [19, 8], [20, 8]],
    tl: [[1, 4]], tr: [[2, 4]], left: [[1, 5]], right: [[2, 5]] },
  city: { img: 'assets/tiles/city.png',
    top: [[20, 9], [21, 9]], fill: [[20, 10], [21, 10]] },
};

// 시차 배경: f = 이동 배율, y = 'bottom'(화면 아래에 붙임) | 'fill'(세로로 채움) | 'tile'(가로·세로 반복)
HC.BG = {
  cave: { sky: '#120e1a', layers: [{ img: 'assets/bg/cave_far.png', f: 0.06, y: 'tile' }, { img: 'assets/bg/cave_mid.png', f: 0.2, y: 'bottom' }] },
  waste: { sky: '#c06a70', layers: [{ img: 'assets/bg/waste_far.png', f: 0.03, y: 'bottom' }, { img: 'assets/bg/waste_mid.png', f: 0.12, y: 'bottom' }, { img: 'assets/bg/waste_near.png', f: 0.28, y: 'bottom' }] },
  forest: { sky: '#1c2a26', layers: [{ img: 'assets/bg/forest_far.png', f: 0.03, y: 'bottom' }, { img: 'assets/bg/forest_trees.png', f: 0.1, y: 'bottom' }, { img: 'assets/bg/forest_tree.png', f: 0.22, y: 'bottom' }, { img: 'assets/bg/forest_rocks.png', f: 0.34, y: 'bottom' }] },
  spire: { sky: '#0e1a1a', layers: [{ img: 'assets/bg/spire_hall.png', f: 0.14, y: 'bottom' }] },
  abyss: { sky: '#1a0c14', layers: [{ img: 'assets/bg/abyss_far.png', f: 0.1, y: 'tile' }] },
  blood: { sky: '#2a0818', layers: [{ img: 'assets/bg/blood_far.png', f: 0.03, y: 'bottom' }, { img: 'assets/bg/blood_mtn.png', f: 0.1, y: 'bottom' }, { img: 'assets/bg/blood_grave.png', f: 0.25, y: 'bottom' }] },
  city: { sky: '#1a2030', layers: [{ img: 'assets/bg/city_sky.png', f: 0, y: 'bottom' }, { img: 'assets/bg/city_clouds.png', f: 0.03, y: 'bottom' }, { img: 'assets/bg/city_mtn.png', f: 0.07, y: 'bottom' }, { img: 'assets/bg/city_far.png', f: 0.14, y: 'bottom' }, { img: 'assets/bg/city_town.png', f: 0.24, y: 'bottom' }] },
};
HC.THEME_TILES = { cave: 'cave', waste: 'waste', forest: 'forest', spire: 'spire', abyss: 'abyss', blood: 'blood', city: 'city' };

// 도시 건물 그림: houses.png 안의 잘라낼 영역 [x, y, w, h]
HC.HOUSES = {
  small: [32, 70, 167, 181], big: [239, 7, 207, 244], wide: [465, 74, 220, 177], church: [716, 2, 340, 254],
};
// props/town.png 안의 소품 영역
HC.TOWN_PROPS = {
  crates: [16, 12, 73, 68], crate: [16, 109, 39, 35], cart: [109, 82, 93, 75], sign: [123, 19, 35, 44], barrel: [172, 33, 24, 30], lamp: [223, 49, 35, 108], well: [269, 95, 65, 65],
};
// props/cemetery.png 안의 소품 (묘비·석상·죽은 나무 등)
HC.CEM_PROPS = {
  stone1: [19, 155, 21, 37], stone2: [59, 152, 27, 40], stone3: [109, 159, 27, 33], stone4: [157, 154, 19, 38],
  tree1: [193, 75, 166, 117], bush: [372, 127, 77, 65], stone5: [480, 163, 34, 29], statue: [530, 117, 63, 75], tree2: [608, 75, 166, 117], tree3: [784, 22, 176, 170],
};
