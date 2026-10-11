'use strict';
// 구역 시각 테마. 어둡고 채도가 낮은 팔레트에 한두 가지 발광색만 둔다.
HC.THEMES = {
  city: {
    sky: ['#0b0d12', '#151a22', '#1d222b'], rock: '#24262b', rockDark: '#141518', lip: '#4a4c52', lipHi: '#6b6d72',
    plat: '#3a3128', platHi: '#5a4a38', rope: '#7a6a4e', dark: 0.45, fog: null, light: '#f2a54a', bg: 'city', rain: true,
  },
  cave: { // 1층 청석 동굴
    sky: ['#05070b', '#0a0f17', '#0c1420'], rock: '#1a2029', rockDark: '#0c0f14', lip: '#2c4a5c', lipHi: '#5fb6d6',
    plat: '#2b2f36', platHi: '#45607a', rope: '#6d6352', dark: 0.84, fog: null, light: '#62c8ff', bg: 'cave', crystals: true,
  },
  waste: { // 2층 잿바위 황무지
    sky: ['#140c0a', '#2a1712', '#4a2618'], rock: '#2d2420', rockDark: '#17110e', lip: '#5c4334', lipHi: '#94684a',
    plat: '#3a2e26', platHi: '#7a5a40', rope: '#7d6a50', dark: 0.5, fog: null, light: '#ff8a3c', bg: 'waste', ash: true,
  },
  forest: { // 3층 곡소리 숲
    sky: ['#06090a', '#0c1412', '#121c19'], rock: '#1c211d', rockDark: '#0d100e', lip: '#2f3d2d', lipHi: '#5a7052',
    plat: '#2b2721', platHi: '#4f4536', rope: '#5e5644', dark: 0.72, fog: '#9fb3a6', light: '#b8f0a0', bg: 'forest', mist: true,
  },
  spire: { // 4층 뒤집힌 첨탑
    sky: ['#07060d', '#100d1d', '#1a1530'], rock: '#24212e', rockDark: '#121019', lip: '#46405e', lipHi: '#a9a1d6',
    plat: '#2e2a3a', platHi: '#6f669a', rope: '#8a7f6a', dark: 0.66, fog: null, light: '#c9b8ff', bg: 'spire', stars: true,
  },
  abyss: { // 층주의 제단
    sky: ['#030205', '#0b0610', '#140a1c'], rock: '#18121e', rockDark: '#09060c', lip: '#3a2050', lipHi: '#9a5cd0',
    plat: '#231a2c', platHi: '#5c3a7a', rope: '#5a4a5a', dark: 0.85, fog: null, light: '#b066ff', bg: 'abyss',
  },
  blood: { // 열극 (피의 성채 등)
    sky: ['#0a0203', '#1a0608', '#2a0a0e'], rock: '#2a1416', rockDark: '#12080a', lip: '#5a1a20', lipHi: '#c0303a',
    plat: '#2a1a1c', platHi: '#6a2a30', rope: '#5a3a3a', dark: 0.75, fog: null, light: '#ff3b4a', bg: 'blood',
  },
};
