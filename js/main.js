'use strict';
// 게임 루프와 장면 관리.
HC.G = {
  save: null, scene: 'title', zone: null, player: null, enemies: [], projs: [], hazards: [], pzones: [], drops: [],
  cam: null, run: null, boss: null, time: 0, hitstop: 0, cutscene: false, paused: false, deathT: 0,
};

HC.Game = (function () {
  const U = HC.U, G = HC.G, I = HC.Input;
  let screen, sctx, overlay, octx, low, lctx;
  let last = 0, subT = 0, saveT = 0;
  let scale = 1, dpr = 1;

  function setup() {
    screen = document.getElementById('screen');
    overlay = document.getElementById('overlay');
    sctx = screen.getContext('2d');
    octx = overlay.getContext('2d');
    low = HC.Render.mk(HC.VW, HC.VH);
    lctx = low.getContext('2d');
    window.addEventListener('resize', resize);
    resize();
  }

  function resize() {
    const wrap = document.getElementById('game');
    const W = wrap.clientWidth, H = wrap.clientHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    let s = Math.min(W / HC.VW, H / HC.VH);
    if (s >= 2) s = Math.floor(s * 2) / 2;
    const cw = Math.round(HC.VW * s), ch = Math.round(HC.VH * s);
    for (const c of [screen, overlay]) {
      c.style.width = cw + 'px'; c.style.height = ch + 'px';
      c.style.left = Math.round((W - cw) / 2) + 'px'; c.style.top = Math.round((H - ch) / 2) + 'px';
    }
    screen.width = HC.VW * 2; screen.height = HC.VH * 2;
    overlay.width = Math.round(cw * dpr); overlay.height = Math.round(ch * dpr);
    scale = overlay.width / HC.VW;
    const hud = document.getElementById('hud');
    hud.style.width = cw + 'px'; hud.style.height = ch + 'px';
    hud.style.left = Math.round((W - cw) / 2) + 'px'; hud.style.top = Math.round((H - ch) / 2) + 'px';
    hud.style.setProperty('--u', (cw / 640) + 'px');
    document.documentElement.style.setProperty('--u', (cw / 640) + 'px');
  }

  function save() {
    if (!G.save) return;
    G.save.sub.lastTick = Date.now();
    HC.Save.write(G.save);
  }

  function newGame() {
    G.save = HC.Save.fresh();
    save();
    toCity(null);
    HC.Panels.open('intro');
  }

  function continueGame() {
    const s = HC.Save.load();
    if (!s) { newGame(); return; }
    G.save = s;
    const off = HC.Sub.offline();
    if (s.run) {
      HC.Descent.start(s.run.floor, s.run);
    } else toCity(null);
    if (off) HC.Panels.open('offline', off);
  }

  function toCity(res) {
    G.deathT = 0;
    HC.City.enter(res);
    if (res) HC.Panels.open('result', res);
    save();
  }

  function toDescent(floor) {
    HC.Panels.close();
    HC.UI.fade(() => HC.Descent.start(floor), 1.2);
  }

  function gainExp(n) {
    const s = G.save;
    if (s.level >= HC.MAX_LEVEL) return;
    s.exp += n;
    while (s.level < HC.MAX_LEVEL && s.exp >= HC.EXP_TABLE[s.level + 1]) {
      s.level++;
      HC.Audio.play('levelup');
      HC.UI.banner('레벨 ' + s.level, '영혼이 한 겹 더 깊어졌다. 영혼 슬롯 ' + s.level + '칸, 혼력 상승', '#ffe0a0', 3);
      if (G.player) { G.player.statDirty = true; HC.Player.recalc(G.player); G.player.hp = G.player.st.maxHp; }
      HC.FX.burst(G.player.x + 6, G.player.y + 13, 40, ['#ffe0a0', '#ffffff'], { g: -80, min: 40, max: 160, glow: true });
    }
    HC.UI.dirty = true;
  }

  function playerDied() {
    const p = G.player;
    if (p.dead) return;
    p.dead = true;
    G.deathT = 0;
    HC.Audio.play('death');
    HC.FX.blood(p.x + p.w / 2, p.y + p.h / 2, 0, 40);
    HC.FX.ash(p.x, p.y, p.w, p.h, 40);
    HC.UI.death(p.lastHitBy);
  }

  function step(dt) {
    let sdt = dt;
    if (G.hitstop > 0) { G.hitstop -= dt; sdt = dt * 0.07; }
    const p = G.player, z = G.zone;
    if (p.dead) {
      sdt *= 0.3;
      G.deathT += dt;
      if (G.deathT > 3 && G.scene === 'descent') { HC.Descent.endRun('death'); return; }
    }
    G.time += sdt;
    HC.Player.update(p, sdt, z);
    for (const e of G.enemies) HC.Enemy.update(e, sdt, z, p);
    for (let i = G.enemies.length - 1; i >= 0; i--) if (G.enemies[i].dead && G.enemies[i].deathT > 0.7) G.enemies.splice(i, 1);
    if (G.boss && G.boss.dead && G.boss.deathT > 0.7) G.boss = null;
    HC.Combat.update(sdt, z);
    HC.Skills.update(sdt);
    HC.World.updateDrops(sdt, z);
    HC.World.updateObjects(sdt, z, G.time);
    HC.FX.update(sdt);
    if (G.scene === 'descent') HC.Descent.update(sdt);
    else HC.City.update(sdt);
    if (!G.player || G.scene === 'title') return;
    // 상호작용
    if (!p.dead && I.enabled) {
      if (I.hit('up') || I.hit('interact')) {
        const used = G.scene === 'descent' ? HC.Descent.interact() : HC.City.interact();
        if (used) { I.consume('up'); }
      }
      if (I.hit('rest') && G.scene === 'descent') HC.Descent.toggleRest();
    }
    HC.Render.updateCamera(G.cam, z, p, dt);
  }

  function darknessNow() {
    const z = G.zone, th = z.theme;
    let d = th.dark;
    const run = G.run;
    if (run) {
      if (HC.Descent.isNight() && th.bg !== 'cave') d += 0.15;
      if (HC.Descent.isNight() && th.bg === 'cave') d += 0.04;
      if (run.lordAwake) d += run.lordField === 'ashStorm' ? 0.28 : 0.08;
      if (run.weather) d += 0.2;
    }
    return U.clamp(d, 0, 0.97);
  }

  function render() {
    const z = G.zone, cam = G.cam, p = G.player;
    if (!z || !cam) { sctx.fillStyle = '#050507'; sctx.fillRect(0, 0, screen.width, screen.height); octx.clearRect(0, 0, overlay.width, overlay.height); return; }
    const t = G.time;
    const c = { x: Math.round(cam.x + cam.ox), y: Math.round(cam.y + cam.oy) };
    const ctx = lctx;
    ctx.imageSmoothingEnabled = false;
    HC.Render.drawBackground(ctx, z.bg, c, z.h);
    ctx.drawImage(z.canvas, -c.x, -c.y);
    drawPortals(ctx, c, t);
    HC.World.drawObjects(ctx, c, t);
    if (G.scene === 'city') HC.City.drawNPCs(ctx, c, t);
    HC.World.drawDrops(ctx, c, t);
    for (const e of G.enemies) HC.Enemy.draw(ctx, e, c, t);
    HC.Player.draw(ctx, p, c, t);
    HC.Combat.draw(ctx, c, t);
    HC.Skills.draw(ctx, c, t);
    HC.FX.draw(ctx, c);
    // 작은 체력바 (일반 몬스터)
    for (const e of G.enemies) {
      if (e.dead || e.burrowed || e.boss || e.def.ai === 'dummy' || e.hp >= e.maxHp || e.elite) continue;
      const x = Math.round(e.x + e.w / 2 - 9 - c.x), y = Math.round(e.y - 6 - c.y);
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x - 1, y - 1, 20, 4);
      ctx.fillStyle = e.def.corrupt ? '#a050ff' : '#c03030'; ctx.fillRect(x, y, Math.max(0, Math.round(18 * e.hp / e.maxHp)), 2);
    }
    // 조명
    const lights = [];
    const vis = p.st.vision * ((G.run && (G.run.weather || (G.run.lordAwake && G.run.lordField === 'ashStorm'))) ? 0.6 : 1);
    lights.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, r: vis, i: 1 });
    for (const o of z.objects) if (o.light) lights.push({ x: o.x, y: o.y - 12, r: o.light, c: o.type === 'campfire' || o.type === 'brazier' || o.type === 'lamp' || o.type === 'door' ? '#ff9a40' : z.theme.light, ci: 0.16 });
    for (const pt of z.portals) if (!pt.hidden) lights.push({ x: pt.x, y: pt.y - 16, r: 70, c: portalCol(pt), ci: 0.25 });
    for (const d of G.drops) if (d.type === 'soul') lights.push({ x: d.x, y: d.y, r: 36, c: d.hex, ci: 0.3 });
    for (const q of G.projs) if (q.sprite === 'orb' || q.sprite === 'lance' || q.sprite === 'ember') lights.push({ x: q.x, y: q.y, r: 28, c: q.col, ci: 0.25 });
    for (const e of G.enemies) if ((e.boss || e.elite || e.def.corrupt) && !e.dead && !e.burrowed) lights.push({ x: e.x + e.w / 2, y: e.y + e.h * 0.4, r: e.boss ? 120 : e.elite ? 70 : 34, i: e.boss ? 0.85 : 0.6, c: e.def.body.eye, ci: 0.14 });
    HC.Render.drawLighting(ctx, c, darknessNow(), lights, G.run && G.run.lordAwake ? 'rgba(8,2,14,1)' : null);
    // 안개 (3층)
    if (z.theme.mist) drawMist(ctx, c, t);
    if (G.run && (G.run.weather || (G.run.lordAwake && G.run.lordField === 'ashStorm'))) {
      ctx.fillStyle = 'rgba(80,60,50,0.18)'; ctx.fillRect(0, 0, HC.VW, HC.VH);
      for (let i = 0; i < 3; i++) HC.FX.p({ x: c.x + HC.VW + 10, y: c.y + Math.random() * HC.VH, vx: -U.rand(200, 360), vy: U.rand(-20, 40), life: 2.5, s: U.randi(1, 2), col: 'rgba(160,140,120,0.5)', g: 0 });
    }
    // 화면으로 확대
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(low, 0, 0, screen.width, screen.height);
    // 오버레이
    octx.clearRect(0, 0, overlay.width, overlay.height);
    HC.FX.drawTexts(octx, c, scale);
    drawLabels(octx, c, scale);
    if (G.scene === 'city') HC.City.drawOverlay(octx, c, scale);
  }

  function drawMist(ctx, c, t) {
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const x = ((i * 220 - (c.x * 0.5 + t * (8 + i * 3))) % 1100 + 1100) % 1100 - 240;
      const y = 120 + Math.sin(t * 0.3 + i) * 40 + i * 30 - (c.y * 0.1 % 60);
      const g = ctx.createRadialGradient(x + 120, y, 10, x + 120, y, 180);
      g.addColorStop(0, 'rgba(150,170,160,0.10)'); g.addColorStop(1, 'rgba(150,170,160,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 60, y - 180, 360, 360);
    }
    ctx.restore();
  }

  function portalCol(pt) {
    switch (pt.kind) {
      case 'stone': return pt.active ? '#b080ff' : '#404048';
      case 'lair': return '#a040ff';
      case 'rift': return '#ff3040';
      case 'exit': return '#ffffff';
      default: return G.zone.theme.light;
    }
  }

  function drawPortals(ctx, c, t) {
    const z = G.zone;
    for (const pt of z.portals) {
      if (pt.hidden) continue;
      const x = Math.round(pt.x - c.x), y = Math.round(pt.y - c.y);
      if (x < -60 || x > HC.VW + 60 || y < -80 || y > HC.VH + 60) continue;
      const col = portalCol(pt);
      if (pt.kind === 'stone') {
        ctx.fillStyle = '#2a2a32'; ctx.fillRect(x - 7, y - 34, 14, 34); ctx.fillRect(x - 10, y - 4, 20, 4);
        ctx.beginPath(); ctx.moveTo(x - 7, y - 34); ctx.lineTo(x, y - 42); ctx.lineTo(x + 7, y - 34); ctx.fill();
        if (pt.active) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = U.colorAlpha(col, 0.5 + 0.3 * Math.sin(t * 4));
          for (let i = 0; i < 4; i++) ctx.fillRect(x - 3, y - 30 + i * 7, 6, 3);
          const g = ctx.createRadialGradient(x, y - 20, 2, x, y - 20, 30);
          g.addColorStop(0, U.colorAlpha(col, 0.35)); g.addColorStop(1, U.colorAlpha(col, 0));
          ctx.fillStyle = g; ctx.fillRect(x - 30, y - 50, 60, 60);
          ctx.restore();
          if (Math.random() < 0.3) HC.FX.soulWisp(pt.x + U.rand(-8, 8), pt.y - 10, col);
        } else { ctx.fillStyle = '#18181c'; ctx.fillRect(x - 4, y - 26, 8, 2); ctx.fillRect(x - 2, y - 18, 5, 1); }
        continue;
      }
      if (pt.kind === 'rift') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,40,60,0.8)';
        ctx.beginPath(); ctx.moveTo(x, y - 44); ctx.lineTo(x + 5 + Math.sin(t * 9) * 2, y - 24); ctx.lineTo(x + 2, y); ctx.lineTo(x - 4 + Math.sin(t * 7) * 2, y - 20); ctx.fill();
        ctx.restore();
        if (Math.random() < 0.6) HC.FX.p({ x: pt.x + U.rand(-4, 4), y: pt.y - U.rand(0, 40), vx: U.rand(-20, 20), vy: U.rand(-30, 10), life: 0.6, s: 1, col: '#ff3040', glow: true });
        continue;
      }
      // 일반 이동문 / 위아래 / 제단 / 출구
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y - 18, 2, x, y - 18, 24);
      g.addColorStop(0, U.colorAlpha(col, 0.55)); g.addColorStop(1, U.colorAlpha(col, 0));
      ctx.fillStyle = g; ctx.fillRect(x - 24, y - 44, 48, 48);
      ctx.strokeStyle = U.colorAlpha(col, 0.7); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x, y - 16, 8 + Math.sin(t * 3) * 1, 16, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = U.colorAlpha(col, 0.9);
      if (pt.kind === 'up') { ctx.beginPath(); ctx.moveTo(x - 4, y - 14); ctx.lineTo(x, y - 20); ctx.lineTo(x + 4, y - 14); ctx.fill(); }
      if (pt.kind === 'down') { ctx.beginPath(); ctx.moveTo(x - 4, y - 18); ctx.lineTo(x, y - 12); ctx.lineTo(x + 4, y - 18); ctx.fill(); }
      if (pt.kind === 'edge') { const d = pt.side === 'left' ? -1 : 1; ctx.beginPath(); ctx.moveTo(x - 3 * d, y - 20); ctx.lineTo(x + 3 * d, y - 16); ctx.lineTo(x - 3 * d, y - 12); ctx.fill(); }
    }
  }

  function drawLabels(o, c, s) {
    const p = G.player, z = G.zone;
    o.textAlign = 'center'; o.textBaseline = 'middle';
    // 이형/보스 이름표
    for (const e of G.enemies) {
      if (e.dead || e.burrowed || !(e.elite || e.boss)) continue;
      if (G.boss === e) continue;
      const x = (e.x + e.w / 2 - c.x) * s, y = (e.y - 14 - c.y) * s;
      const fs = Math.round(s * 4.6);
      o.font = '800 ' + fs + 'px "Nanum Myeongjo", serif';
      o.lineWidth = Math.max(2, fs / 4); o.strokeStyle = 'rgba(0,0,0,0.9)';
      o.strokeText(e.def.n, x, y); o.fillStyle = '#ff9070'; o.fillText(e.def.n, x, y);
      const bw = 40 * s, bh = 2.2 * s;
      o.fillStyle = 'rgba(0,0,0,0.8)'; o.fillRect(x - bw / 2 - 1, y + fs * 0.7, bw + 2, bh + 2);
      o.fillStyle = '#d04030'; o.fillRect(x - bw / 2, y + fs * 0.7 + 1, bw * Math.max(0, e.hp / e.maxHp), bh);
    }
    if (G.scene !== 'descent' || p.dead) return;
    // 포탈 안내
    const pt = HC.Descent.portalNear(p);
    if (pt) {
      const x = (pt.x - c.x) * s, y = (pt.y - 54 - c.y) * s;
      const fs = Math.round(s * 4.8);
      o.font = '700 ' + fs + 'px "Noto Sans KR", sans-serif';
      o.lineWidth = Math.max(2, fs / 4); o.strokeStyle = 'rgba(0,0,0,0.9)';
      o.strokeText(pt.label, x, y); o.fillStyle = '#f0e6d0'; o.fillText(pt.label, x, y);
      const hint = pt.kind === 'stone' && !pt.active ? '' : '[↑] 들어가기';
      if (hint) { o.font = '500 ' + Math.round(fs * 0.85) + 'px "Noto Sans KR", sans-serif'; o.strokeText(hint, x, y + fs * 1.2); o.fillStyle = '#c0b8a8'; o.fillText(hint, x, y + fs * 1.2); }
    }
    // 오브젝트 안내
    for (const ob of z.objects) {
      if (Math.abs(ob.x - U.cx(p)) > 18 || Math.abs(ob.y - (p.y + p.h)) > 24) continue;
      let txt = null;
      if (ob.type === 'herb') txt = '[E] ' + HC.ITEMS[ob.herb].n + ' 채집';
      else if (ob.type === 'hidden' && ob.found) txt = '[E] 파내기';
      else if (ob.type === 'campfire') txt = G.run.resting ? '쉬는 중… (움직이면 깬다)' : '[R] 모닥불 곁에서 쉬기 (시간 가속)';
      if (!txt) continue;
      const x = (ob.x - c.x) * s, y = (ob.y - 30 - c.y) * s;
      const fs = Math.round(s * 4.4);
      o.font = '600 ' + fs + 'px "Noto Sans KR", sans-serif';
      o.lineWidth = Math.max(2, fs / 4); o.strokeStyle = 'rgba(0,0,0,0.9)';
      o.strokeText(txt, x, y); o.fillStyle = '#ffe8c0'; o.fillText(txt, x, y);
    }
  }

  function frame(ts) {
    const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
    last = ts;
    try {
      if (G.save) {
        subT += dt; saveT += dt;
        if (subT >= 1) { subT = 0; HC.Sub.tick(); }
        if (saveT >= 20 && G.scene === 'city') { saveT = 0; save(); }
      }
      if (G.scene !== 'title' && G.player) {
        HC.Panels.hotkeys();
        if (!G.paused) step(dt);
        render();
        HC.UI.update(dt);
      } else render();
    } catch (err) {
      console.error(err);
      HC.UI.error(err);
    }
    I.endFrame();
    requestAnimationFrame(frame);
  }

  function init() {
    setup();
    HC.UI.init();
    HC.Panels.init();
    const s = HC.Save.load();
    HC.Panels.title(!!s);
    HC.Assets.load((k) => HC.Panels.loading(k), () => HC.Panels.render());
    requestAnimationFrame((ts) => { last = ts; frame(ts); });
    window.addEventListener('beforeunload', () => {
      if (G.save) {
        if (G.scene === 'descent' && G.run) HC.Descent.checkpoint();
        save();
      }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.save) { if (G.scene === 'descent' && G.run) HC.Descent.checkpoint(); save(); } });
  }

  return { init, save, newGame, continueGame, toCity, toDescent, gainExp, playerDied, resize, get scale() { return scale; } };
})();

window.addEventListener('DOMContentLoaded', () => HC.Game.init());
