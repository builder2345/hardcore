'use strict';
// 도시 '카르덴'. 걸어 다니며 건물 문 앞에서 ↑ 로 들어간다.
HC.City = (function () {
  const U = HC.U, TS = HC.TS;
  const W = 200, H = 26;

  HC.MOBS.dummy = {
    id: 'dummy', n: '훈련 인형', grade: 9, kind: 'normal', ai: 'dummy', summonOnly: true,
    body: { t: 'golem', w: 16, h: 26, c: '#6a5a40', c2: '#3a3020', eye: '#2a2a2a' },
    hp: 1e9, atk: 0, def: 0, spd: 0, aggro: 0, exp: 0, stone: [0, 0], attacks: [], soul: null, drops: [],
  };

  // house: houses.png 영역 이름, flip: 좌우 반전
  const BUILDINGS = [
    { id: 'hideout', n: '은신처', x: 10, house: 'small' },
    { id: 'gather', n: '채집 게시판', x: 24, yard: true },
    { id: 'smith', n: '대장간', x: 38, house: 'wide', forge: true },
    { id: 'alchemy', n: '연금 공방', x: 54, house: 'small', flip: true },
    { id: 'cook', n: '취사장', x: 69, house: 'wide', flip: true },
    { id: 'shop', n: '잡화점', x: 84, house: 'big' },
    { id: 'exchange', n: '교환소', x: 100, house: 'big', flip: true },
    { id: 'guild', n: '탐색자 길드', x: 116, house: 'wide' },
    { id: 'tattoo', n: '혈문 각인소', x: 131, house: 'small' },
    { id: 'statue', n: '위령비 광장', x: 145, statues: true },
    { id: 'altar', n: '영혼 제단', x: 162, house: 'church' },
    { id: 'descent', n: '강하 광장', x: 186, gate: true },
  ];

  function drawProc(ctx, b, g) {
    // 그림이 없을 때 쓰는 단순 건물
    const bw = 160, bh = 120, x0 = b.x * TS - bw / 2;
    ctx.fillStyle = '#2a2420'; ctx.fillRect(x0, g - bh, bw, bh);
    ctx.fillStyle = '#1a1412'; ctx.beginPath(); ctx.moveTo(x0 - 8, g - bh); ctx.lineTo(x0 + bw / 2, g - bh - 40); ctx.lineTo(x0 + bw + 8, g - bh); ctx.fill();
    ctx.fillStyle = '#120e0a'; ctx.fillRect(b.x * TS - 10, g - 30, 20, 30);
  }

  function build() {
    const z = HC.Map.flat({ w: W, h: H, groundDepth: 4 });
    z.seed = 777; z.id = 'city'; z.floor = 0; z.name = '카르덴'; z.theme = HC.THEMES.city;
    z.doors = [];
    const g = (H - 4) * TS;
    const c = HC.Render.buildTiles(z, z.theme);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const houses = 'assets/props/houses.png', town = 'assets/props/town.png', cem = 'assets/props/cemetery.png';
    // 가로등과 소품 (건물 사이)
    for (let x = 4; x < W - 4; x += 15) {
      const lx = x * TS + 60;
      if (BUILDINGS.some((b) => Math.abs(b.x * TS - lx) < 90)) continue;
      if (!HC.Spr.part(ctx, town, HC.TOWN_PROPS.lamp, lx, g)) { ctx.fillStyle = '#1a1a1e'; ctx.fillRect(lx, g - 44, 2, 44); }
      z.objects.push({ type: 'lamp', x: lx, y: g - 90, light: 80 });
    }
    for (const b of BUILDINGS) {
      const cx = b.x * TS;
      if (b.gate) {
        // 강하 광장: 죽은 나무와 석문
        HC.Spr.part(ctx, cem, HC.CEM_PROPS.tree3, cx + 90, g);
        ctx.fillStyle = '#16161c'; ctx.fillRect(cx - 44, g - 130, 18, 130); ctx.fillRect(cx + 26, g - 130, 18, 130);
        ctx.fillRect(cx - 52, g - 144, 104, 16);
        ctx.fillStyle = '#2a2a34'; ctx.fillRect(cx - 44, g - 130, 3, 130); ctx.fillRect(cx + 26, g - 130, 3, 130); ctx.fillRect(cx - 52, g - 144, 104, 2);
        HC.Spr.part(ctx, cem, HC.CEM_PROPS.stone2, cx - 70, g);
        HC.Spr.part(ctx, cem, HC.CEM_PROPS.stone1, cx - 92, g);
        z.doors.push({ id: b.id, n: b.n, x: cx, y: g, gate: true });
        continue;
      }
      if (b.statues) {
        const keys = ['stone1', 'stone3', 'statue', 'stone4', 'stone2', 'stone5'];
        keys.forEach((k, i) => HC.Spr.part(ctx, cem, HC.CEM_PROPS[k], cx - 75 + i * 30, g));
        HC.Spr.part(ctx, cem, HC.CEM_PROPS.bush, cx + 100, g);
        z.doors.push({ id: b.id, n: b.n, x: cx, y: g });
        continue;
      }
      if (b.yard) {
        HC.Spr.part(ctx, town, HC.TOWN_PROPS.well, cx - 30, g);
        HC.Spr.part(ctx, town, HC.TOWN_PROPS.cart, cx + 40, g);
        HC.Spr.part(ctx, town, HC.TOWN_PROPS.sign, cx, g);
        HC.Spr.part(ctx, town, HC.TOWN_PROPS.crates, cx + 100, g);
        z.doors.push({ id: b.id, n: b.n, x: cx, y: g });
        continue;
      }
      if (!HC.Spr.part(ctx, houses, HC.HOUSES[b.house], cx, g + 2, { flip: b.flip })) drawProc(ctx, b, g);
      if (b.forge) {
        HC.Spr.part(ctx, town, HC.TOWN_PROPS.crate, cx + 120, g);
        ctx.fillStyle = '#3a3a40'; ctx.fillRect(cx - 120, g - 14, 22, 8); ctx.fillRect(cx - 114, g - 6, 10, 6);
        z.objects.push({ type: 'brazier', x: cx - 100, y: g, light: 90 });
      }
      if (b.house === 'big' || b.house === 'small') HC.Spr.part(ctx, town, HC.TOWN_PROPS.barrel, cx + (b.flip ? -1 : 1) * 70, g);
      z.doors.push({ id: b.id, n: b.n, x: cx, y: g });
    }
    for (const d of z.doors) z.objects.push({ type: 'door', x: d.x, y: d.y - 14, light: d.gate ? 130 : 60 });
    z.canvas = c;
    z.bg = HC.Render.buildBackground(z.theme, 99);
    // 마을 사람들
    z.npcs = [];
    const kinds = ['oldman', 'woman', 'bearded', 'hatman', 'woman', 'oldman'];
    kinds.forEach((k, i) => z.npcs.push({ k, x: (20 + i * 30 + Math.random() * 10) * TS, dir: Math.random() < 0.5 ? -1 : 1, walk: false, t: Math.random() * 3, at: 0 }));
    return z;
  }

  function updateNPCs(dt) {
    const z = HC.G.zone;
    if (!z.npcs) return;
    for (const n of z.npcs) {
      n.t -= dt; n.at += dt;
      if (n.t <= 0) { n.walk = Math.random() < 0.55; n.dir = Math.random() < 0.5 ? -1 : 1; n.t = 2 + Math.random() * 4; }
      if (n.walk) { n.x += n.dir * 22 * dt; if (n.x < 6 * TS || n.x > (W - 20) * TS) { n.dir *= -1; n.x = U.clamp(n.x, 6 * TS, (W - 20) * TS); } }
    }
  }
  function drawNPCs(ctx, cam, t) {
    const z = HC.G.zone;
    if (!z || !z.npcs || !HC.Assets.ready) return;
    const g = (H - 4) * TS;
    for (const n of z.npcs) {
      const an = n.walk ? 'walk' : 'idle';
      HC.Spr.draw(ctx, n.k, an, HC.Spr.frameAt(n.k, an, n.at), n.x - cam.x, g - cam.y, n.dir, { tint: 'night' });
    }
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
    const start = res ? 182 : 120;
    G.player.x = start * TS; G.player.y = (H - 4) * TS - G.player.h;
    G.player.facing = -1;
    // 훈련 인형
    HC.World.spawnMob(HC.MOBS.dummy, 19 * TS, (H - 4) * TS, { spawnT: 0 });
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
    updateNPCs(dt);
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
      const sx = (d.x - cam.x) * scale, sy = (d.y - (d.gate ? 160 : 60) - cam.y) * scale;
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

  return { enter, update, interact, doorNear, drawOverlay, drawNPCs, BUILDINGS };
})();
