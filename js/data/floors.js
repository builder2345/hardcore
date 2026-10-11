'use strict';
/*
 층 정의. 각 층은 '강하 지점'(허브)에서 동서남북 네 갈래로 뻗는다.
 네 갈래 끝 중 단 하나에만 다음 층으로 가는 '포탈 비석'이 열린다 (강하마다 무작위).
 days: 층이 닫히기까지의 일수. 닫히는 순간 나락이 탐색자를 도시로 뱉어낸다.

 이형(elite) 출현 조건 타입
  kills:   이번 강하에서 mob을 n마리 이상 잡은 뒤, mob 처치마다 chance
  night:   밤에 mob 처치 시 chance
  objects: obj를 n개 부순 뒤 mob 처치 시 chance
  status:  플레이어가 status 상태이상일 때 mob 처치 시 chance
  burst:   window초 안에 mob을 n마리 처치하면 chance
  weather: 날씨 weather 중 mob 처치 시 chance
*/
HC.FLOORS = [
  null,
  {
    id: 1, n: '청석 동굴', theme: 'cave', days: 7, grade: '9등급', amb: 'f1',
    hub: '청석 광장',
    desc: '푸른 결정이 희미하게 빛나는 동굴. 빛이 닿지 않는 곳은 완전한 어둠이다.',
    branches: {
      W: { n: '서쪽 굴토 갱도', mobs: { gnome: 5, goblin: 2 }, shape: 'wide' },
      E: { n: '동쪽 늑대 협곡', mobs: { fangWolf: 5, goblinSpear: 2 }, shape: 'wide' },
      N: { n: '북쪽 잔귀 소굴', mobs: { goblin: 5, goblinSpear: 3 }, shape: 'tall' },
      S: { n: '남쪽 송장 웅덩이', mobs: { ghoul: 5, gnome: 1 }, shape: 'deep' },
    },
    hubMobs: { goblin: 2, fangWolf: 1 },
    density: 1, objects: { crystal: 5, herb: 3, hidden: 1 }, herb: 'glowMoss', frag: 'frag1',
    elites: [
      { id: 'urg', branch: 'N', cond: { type: 'kills', mob: 'goblin', n: 25 }, chance: 0.06, hint: '잔귀를 오래 학살하면, 무리의 우두머리가 참지 못하고 나선다.' },
      { id: 'whiteFang', branch: 'E', cond: { type: 'night', mob: 'fangWolf' }, chance: 0.1, hint: '밤에 늑대를 죽이면, 그 울음을 듣고 흰 것이 온다.' },
      { id: 'gnomeQueen', branch: 'W', cond: { type: 'objects', obj: 'crystal', n: 3, mob: 'gnome' }, chance: 0.35, hint: '굴토인들은 청석 결정을 신성하게 여긴다. 세 개쯤 깨부수면 누군가 화를 낸다.' },
      { id: 'bloatGhoul', branch: 'S', cond: { type: 'status', status: 'poison', mob: 'ghoul' }, chance: 0.1, hint: '중독된 채로 송장을 쓰러뜨리면, 웅덩이 바닥의 것이 냄새를 맡는다.' },
    ],
    lord: { id: 'varges', day: 3, kills: 60, chance: 0.06, field: 'abyssFog', hint: '사흘째 이후 많은 피가 흐르면, 심연을 걷는 자가 깨어난다. 깨어나면 층 전체가 잠식된다.' },
    calamity: { id: 'grumar', chance: 0.06, needLord: true, nightChance: 0.02, hint: '층주가 한 번이라도 쓰러진 적이 있다면, 결정을 먹는 것이 굶주림에 몸을 뒤척인다.' },
    rift: { id: 'bloodKeep', n: '피의 성채', guardian: 'kalamus', theme: 'blood', chance: 0.22, hint: '강하 중 드물게 붉은 열극이 열린다. 들어가면 파수꾼을 죽이기 전엔 나올 수 없다.' },
  },
  {
    id: 2, n: '잿바위 황무지', theme: 'waste', days: 9, grade: '8~7등급', amb: 'f2',
    hub: '타다 남은 야영지',
    desc: '붉은 해가 지지 않는 잿빛 황야. 1층보다 몬스터가 훨씬 많이, 무리 지어 다닌다.',
    branches: {
      W: { n: '서쪽 전갈 둔덕', mobs: { scorpion: 5, lizardman: 2 }, shape: 'wide' },
      E: { n: '동쪽 비늘 부락', mobs: { lizardman: 5, ashWraith: 1 }, shape: 'wide' },
      N: { n: '북쪽 재의 고원', mobs: { ashWraith: 4, lizardman: 2 }, shape: 'tall' },
      S: { n: '남쪽 골렘 채석장', mobs: { rockGolem: 4, scorpion: 2 }, shape: 'deep' },
    },
    hubMobs: { lizardman: 2, scorpion: 1 },
    density: 1.35, objects: { rock: 4, herb: 3, hidden: 1 }, herb: 'emberHerb', frag: 'frag2', weather: 'ashstorm',
    elites: [
      { id: 'selkis', branch: 'W', cond: { type: 'burst', mob: 'scorpion', n: 3, window: 12 }, chance: 0.3, hint: '전갈 셋을 12초 안에 죽이면, 땅 밑의 여왕이 진동을 느낀다.' },
      { id: 'ashSoul', branch: 'N', cond: { type: 'weather', weather: 'ashstorm', mob: 'ashWraith' }, chance: 0.15, hint: '잿바람이 부는 동안 망령을 흩어놓으면, 바람 그 자체가 모습을 드러낸다.' },
      { id: 'golemCoreElite', branch: 'S', cond: { type: 'objects', obj: 'rock', n: 2, mob: 'rockGolem' }, chance: 0.4, hint: '금 간 바위를 두 개 부순 뒤 골렘을 쓰러뜨려라. 채석장 깊은 곳의 핵이 응답한다.' },
      { id: 'lizardChief', branch: 'E', cond: { type: 'night', mob: 'lizardman' }, chance: 0.1, hint: '밤에 비늘 전사를 죽이면, 족장이 직접 복수하러 온다.' },
    ],
    lord: { id: 'agdax', day: 3, kills: 90, chance: 0.06, field: 'ashStorm', hint: '재가 충분히 피에 젖으면 재의 왕관이 깨어난다. 잿빛 폭풍 속에선 시야가 좁아지고 회복이 반감된다.' },
    calamity: { id: 'barkus', chance: 0.06, needLord: true, nightChance: 0.015, hint: '층주를 쓰러뜨린 적이 있는 자가 황야에 오래 머물면, 모래 아래의 아가리가 열린다.' },
    rift: { id: 'sunkenArena', n: '가라앉은 투기장', guardian: 'demus', theme: 'waste', chance: 0.2, hint: '모래 속에 가라앉은 투기장에서, 패배를 모르는 자가 아직 싸우고 있다.' },
  },
  {
    id: 3, n: '곡소리 숲', theme: 'forest', days: 12, grade: '6~5등급', amb: 'f3',
    hub: '이끼 낀 제단',
    desc: '안개가 걷히지 않는 숲. 인지력이 낮으면 바로 앞도 보이지 않는다. 나뭇가지마다 무언가 매달려 있다.',
    branches: {
      W: { n: '서쪽 교수목 군락', mobs: { hanged: 5, crow: 2 }, shape: 'wide' },
      E: { n: '동쪽 마녀의 오솔길', mobs: { mistWitch: 4, crow: 2 }, shape: 'wide' },
      N: { n: '북쪽 까마귀 둥지', mobs: { crow: 6, mistWitch: 1 }, shape: 'tall' },
      S: { n: '남쪽 뒤틀린 뿌리', mobs: { treant: 4, hanged: 2 }, shape: 'deep' },
    },
    hubMobs: { crow: 2, hanged: 1 },
    density: 1.2, objects: { totem: 4, herb: 3, hidden: 1 }, herb: 'mistCap', frag: 'frag3',
    elites: [
      { id: 'voicelessWitch', branch: 'E', cond: { type: 'status', status: 'slow', mob: 'mistWitch' }, chance: 0.25, hint: '마녀의 저주(둔화)에 걸린 채로 마녀를 죽이면, 목소리를 잃은 자가 찾아온다.' },
      { id: 'thousandEyeCrow', branch: 'N', cond: { type: 'kills', mob: 'crow', n: 30 }, chance: 0.08, hint: '까마귀를 서른 마리 넘게 죽이면, 그 모든 눈이 당신을 기억한다.' },
      { id: 'oldHeart', branch: 'S', cond: { type: 'objects', obj: 'totem', n: 2, mob: 'treant' }, chance: 0.35, hint: '저주 토템 둘을 부순 뒤 수목인을 베어라. 숲의 심장이 뛰기 시작한다.' },
    ],
    lord: { id: 'morwina', day: 4, kills: 80, chance: 0.05, field: 'wailing', hint: '숲이 충분히 울면 어미가 깨어난다. 그 뒤로는 빛이 없는 곳에 서 있을수록 공포가 쌓인다.' },
    calamity: { id: 'ygd', chance: 0.05, needLord: true, nightChance: 0.012, hint: '숲의 어미가 쓰러진 적이 있다면, 가장 오래된 나무가 울부짖는다.' },
    rift: { id: 'whiteSanctum', n: '백색 성소', guardian: 'eilen', theme: 'spire', chance: 0.2, hint: '안개 속 하얀 열극. 그 안의 사제는 빛으로 사람을 태운다.' },
  },
  {
    id: 4, n: '뒤집힌 첨탑', theme: 'spire', days: 15, grade: '4~3등급', amb: 'f4',
    hub: '부서진 회랑',
    desc: '하늘에 거꾸로 매달린 탑. 끝없이 올라가고, 끝없이 떨어진다.',
    branches: {
      W: { n: '서쪽 석상 회랑', mobs: { statueGuard: 4, harpy: 2 }, shape: 'tall' },
      E: { n: '동쪽 망령 기사단', mobs: { phantomKnight: 4, shadowAssassin: 1 }, shape: 'wide' },
      N: { n: '북쪽 하피 첨탑', mobs: { harpy: 5, statueGuard: 1 }, shape: 'tall' },
      S: { n: '남쪽 그림자 낙하로', mobs: { shadowAssassin: 4, phantomKnight: 1 }, shape: 'deep' },
    },
    hubMobs: { harpy: 1, statueGuard: 1 },
    density: 1.1, objects: { herb: 3, hidden: 2 }, herb: 'starMoss', frag: 'frag4',
    elites: [
      { id: 'fallenSentinel', branch: 'W', cond: { type: 'kills', mob: 'statueGuard', n: 15 }, chance: 0.1, hint: '석상을 열다섯 넘게 부수면, 탑을 지키던 가장 오래된 감시자가 눈을 뜬다.' },
      { id: 'nightBlade', branch: 'S', cond: { type: 'night', mob: 'shadowAssassin' }, chance: 0.12, hint: '밤에 그림자 자객을 죽이면, 그들의 스승이 뒤에 서 있다.' },
    ],
    lord: { id: 'orden', day: 4, kills: 70, chance: 0.05, field: 'starfall', hint: '첨탑의 왕이 깨어나면 하늘에서 별이 떨어진다. 붉은 표식이 보이면 피하라.' },
    calamity: { id: 'seraphiel', chance: 0.05, needLord: true, nightChance: 0.01, hint: '왕이 쓰러진 탑에, 하늘에서 쫓겨난 것이 내려온다.' },
    rift: { id: 'mirrorRoom', n: '거울의 방', guardian: 'doppel', theme: 'spire', chance: 0.2, hint: '거울 속 당신은 당신보다 빠르다.' },
  },
];
HC.MAX_FLOOR = 4;
HC.DAY_SEC = 60;       // 나락 하루 = 실제 60초
HC.NIGHT_FROM = 0.7;   // 하루의 70% 이후는 밤
