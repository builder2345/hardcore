'use strict';
// 도시 '카르덴'. 걸어 다니며 건물 문 앞에서 ↑ 로 들어간다.
HC.City = (function () {
  const U = HC.U, TS = HC.TS;
  const W = 160, H = 26;

  HC.MOBS.dummy = {
    id: 'dummy', n: '훈련 인형', grade: 9, kind: 'normal', ai: 'dummy', summonOnly: true,
    body: { t: 'golem', w: 16, h: 26, c: '#6a5a40', c2: '#3a3020', eye: '#2a2a2a' },
    hp: 1e9, atk: 0, def: 0, spd: 0, aggro: 0, exp: 0, stone: [0, 0], attacks: [], soul: null, drops: [],
  };

  const BUILDINGS = [
    { id: 'hideout', n: '은신처', x: 9, w: 9, h: 8, col: '#2a2420', roof: '#1a1412' },
    { id: 'gather', n: '채집 게시판', x: 22, w: 8, h: 6, col: '#2e2a22', roof: '#1e1a14' },
    { id: 'smith', n: '대장간', x: 35, w: 10, h: 8, col: '#30261e', roof: '#1c1612', forge: true },
    { id: 'alchemy', n: '연금 공방', x: 49, w: 9, h: 9, col: '#24282a', roof: '#16191a' },
    { id: 'cook', n: '취사장', x: 62, w: 8, h: 7, col: '#2c241c', roof: '#1a1510' },
    { id: 'shop', n: '잡화점', x: 74, w: 9, h: 8, col: '#2a2622', roof: '#1a1714' },
    { id: 'exchange', n: '교환소', x: 87, w: 10, h: 9, col: '#26242c', roof: '#16151c' },
    { id: 'guild', n: '탐색자 길드', x: 101, w: 12, h: 11, col: '#28241f', roof: '#181512' },
    { id: 'tattoo', n: '혈문 각인소', x: 117, w: 8, h: 7, col: '#2a1c1e', roof: '#1a1012' },
    { id: 'statue', n: '위령비 광장', x: 129, w: 9, h: 0, col: '#3a3a40', roof: '#2a2a30', statues: true },
    { id: 'altar', n: '영혼 제단', x: 141, w: 8, h: 12, col: '#221e28', roof: '#141018', spire: true },
    { id: 'descent', n: '강하 광장', x: 153, w: 5, h: 0, col: '#1a1a22', roof: '#1a1a22', gate: true },
  ];

  function build() {
    const z = HC.Map.flat({ w: W, h: H, groundDepth: 4 });
    z.seed = 777; z.id = 'city'; z.floor = 0; z.name = '카르덴'; z.theme = HC.THEMES.city;
    z.doors = [];
    const g = (H - 4) * TS;
    const c = HC.Render.buildTiles(z, z.theme);
    const ctx = c.getContext('2d');
    // 건물
    for (const b of BUILDINGS) {
      const x0 = b.x * TS - b.w * TS / 2;
      const bw = b.w * TS, bh = b.h * TS;
      if (b.gate) {
        // 강하 광장: 거대한 석문과 소용돌이
        ctx.fillStyle = '#18181e'; ctx.fillRect(b.x * TS - 44, g - 130, 18, 130); ctx.fillRect(b.x * TS + 26, g - 130, 18, 130);
        ctx.fillRect(b.x * TS - 50, g - 142, 100, 16);
        ctx.fillStyle = '#2a2a34'; ctx.fillRect(b.x * TS - 44, g - 130, 3, 130); ctx.fillRect(b.x * TS + 26, g - 130, 3, 130);
        z.doors.push({ id: b.id, n: b.n, x: b.x * TS, y: g, gate: true });
        continue;
      }
      if (b.statues) {
        for (let i = 0; i < 6; i++) {
          const sx = x0 + i * (bw / 5.5) + 4;
          ctx.fillStyle = '#3a3a42'; ctx.fillRect(sx, g - 10, 12, 10);
          ctx.fillStyle = '#4a4a54'; ctx.fillRect(sx + 3, g - 30, 6, 20); ctx.fillRect(sx + 2, g - 36, 8, 7);
        }
        z.doors.push({ id: b.id, n: b.n, x: b.x * TS, y: g });
        continue;
      }
      ctx.fillStyle = b.col; ctx.fillRect(x0, g - bh, bw, bh);
      ctx.fillStyle = U.shade(b.col, 0.12); ctx.fillRect(x0, g - bh, bw, 2);
      // 지붕
      ctx.fillStyle = b.roof;
      ctx.beginPath(); ctx.moveTo(x0 - 8, g - bh); ctx.lineTo(x0 + bw / 2, g - bh - (b.spire ? 70 : 34)); ctx.lineTo(x0 + bw + 8, g - bh); ctx.fill();
      // 창문
      for (let i = 0; i < Math.floor(b.w / 3); i++) {
        const wx = x0 + 8 + i * 48, wy = g - bh + 14;
        if (wx + 10 > x0 + bw - 6) break;
        ctx.fillStyle = Math.random() < 0.7 ? '#e8963c' : '#3a2a20'; ctx.fillRect(wx, wy, 9, 12);
        ctx.fillStyle = '#1a1410'; ctx.fillRect(wx + 4, wy, 1, 12); ctx.fillRect(wx, wy + 6, 9, 1);
      }
      // 문
      const dx = b.x * TS - 10;
      ctx.fillStyle = '#120e0a'; ctx.fillRect(dx, g - 30, 20, 30);
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(dx - 2, g - 32, 24, 3);
      ctx.fillStyle = 'rgba(232,150,60,0.35)'; ctx.fillRect(dx + 2, g - 28, 16, 28);
      if (b.forge) { ctx.fillStyle = '#ff6020'; ctx.fillRect(x0 + bw - 22, g - 18, 14, 8); ctx.fillStyle = '#4a4a50'; ctx.fillRect(x0 + bw + 6, g - 12, 16, 6); ctx.fillRect(x0 + bw + 10, g - 6, 8, 6); }
      z.doors.push({ id: b.id, n: b.n, x: b.x * TS, y: g });
    }
    // 가로등
    for (let x = 4; x < W - 4; x += 11) {
      const lx = x * TS;
      ctx.fillStyle = '#1a1a1e'; ctx.fillRect(lx, g - 44, 2, 44);
      ctx.fillRect(lx - 3, g - 46, 8, 3);
      ctx.fillStyle = '#ffb860'; ctx.fillRect(lx - 1, g - 43, 4, 4);
      z.objects.push({ type: 'lamp', x: lx + 1, y: g - 40, light: 70 });
    }
    for (const d of z.doors) z.objects.push({ type: 'door', x: d.x, y: d.y - 14, light: d.gate ? 120 : 55 });
    z.canvas = c;
    z.bg = HC.Render.buildBackground(z.theme, 99);
    return z;
  }

  function enter(res) {
    const G = HC.G;
    G.scene = 'city';
    G.run = null;
    HC.Combat.reset();
    G.drops = []; G.pzones = []; G.enemies = []; G.boss = null;
    HC.FX.clear();
    G.zone = build();
    G.player = HC.Player.create();
    HC.Player.look(G.player, G.save);
    HC.Player.recalc(G.player);
    G.player.hp = G.player.st.maxHp; G.player.sta = G.player.st.maxSta;
    const start = res ? 150 : 100;
    G.player.x = start * TS; G.player.y = (H - 4) * TS - G.player.h;
    G.player.facing = -1;
    // 훈련 인형
    HC.World.spawnMob(HC.MOBS.dummy, 15 * TS, (H - 4) * TS, { spawnT: 0 });
    G.cam = G.cam || HC.Render.Camera();
    HC.Render.updateCamera(G.cam, G.zone, G.player, 0.016, true);
    HC.Audio.ambience('city');
    HC.UI.zoneName('카르덴 — 회색 비가 내리는 도시');
    HC.UI.bossBar(null);
    HC.UI.dirty = true;
  }

  function doorNear(p) {
    const z = HC.G.zone;
    if (!z.doors) return null;
    for (const d of z.doors) if (Math.abs(d.x - U.cx(p)) < (d.gate ? 40 : 16)) return d;
    return null;
  }

  function interact() {
    const p = HC.G.player;
    const d = doorNear(p);
    if (!d) return false;
    HC.Audio.play('ui');
    HC.Panels.open(d.id);
    return true;
  }

  function update(dt) {
    const G = HC.G;
    // 훈련 인형은 항상 체력 복구
    for (const e of G.enemies) { if (e.def.ai === 'dummy') { e.hp = e.maxHp; e.dead = false; } }
    // 비
    const cam = G.cam;
    for (let i = 0; i < 4; i++) HC.FX.p({ x: cam.x + Math.random() * HC.VW, y: cam.y - 10, vx: -40, vy: 420, life: 0.9, s: 1, col: 'rgba(150,160,180,0.35)', g: 0 });
  }

  function drawOverlay(octx, cam, scale) {
    const z = HC.G.zone;
    if (!z.doors) return;
    octx.textAlign = 'center'; octx.textBaseline = 'middle';
    const p = HC.G.player;
    for (const d of z.doors) {
      const sx = (d.x - cam.x) * scale, sy = (d.y - (d.gate ? 150 : 50) - cam.y) * scale;
      if (sx < -200 || sx > octx.canvas.width + 200) continue;
      const near = Math.abs(d.x - U.cx(p)) < (d.gate ? 40 : 16);
      const fs = Math.round(scale * (near ? 6.5 : 5.5));
      octx.font = '700 ' + fs + 'px "Nanum Myeongjo", "Noto Serif KR", serif';
      octx.lineWidth = Math.max(2, fs / 4);
      octx.strokeStyle = 'rgba(0,0,0,0.85)';
      octx.strokeText(d.n, sx, sy);
      octx.fillStyle = near ? '#ffd9a0' : '#b8a890';
      octx.fillText(d.n, sx, sy);
      if (near) {
        const fs2 = Math.round(scale * 4.2);
        octx.font = '500 ' + fs2 + 'px "Noto Sans KR", sans-serif';
        octx.strokeText('[↑] 들어가기', sx, sy + fs * 1.3);
        octx.fillStyle = '#e8e0d0';
        octx.fillText('[↑] 들어가기', sx, sy + fs * 1.3);
      }
    }
  }

  return { enter, update, interact, doorNear, drawOverlay, BUILDINGS };
})();
