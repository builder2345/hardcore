'use strict';
// 구역 구성(맵·오브젝트·포탈), 몬스터 스폰, 드랍.
HC.World = (function () {
  const U = HC.U, TS = HC.TS, M = HC.Map;

  // 층별 구역 레이아웃
  function zoneShape(floor, zid) {
    const F = HC.FLOORS[floor];
    if (zid === 'hub') return { w: 116, h: 40, flatCenter: 8 };
    if (zid === 'lair') return { arena: true, w: 64, h: 30 };
    if (zid === 'rift') return { arena: true, w: 60, h: 30 };
    const br = F.branches[zid[0]];
    const deep = zid[1] === '2';
    switch (br.shape) {
      case 'tall': return { w: 64 + (deep ? 8 : 0), h: 92 + (deep ? 14 : 0), vertical: true };
      case 'deep': return { w: 84, h: 70 + (deep ? 10 : 0), vertical: true };
      default: return { w: 170 + (deep ? 30 : 0), h: 42 };
    }
  }

  // 구역 연결: 각 포탈 {kind, to, label}
  function links(floor, zid) {
    const F = HC.FLOORS[floor];
    if (zid === 'hub') return [
      { side: 'left', to: 'W1', label: F.branches.W.n },
      { side: 'right', to: 'E1', label: F.branches.E.n },
      { side: 'top', to: 'N1', label: F.branches.N.n },
      { side: 'pit', to: 'S1', label: F.branches.S.n },
    ];
    const d = zid[0], n = zid[1];
    const back = n === '1' ? 'hub' : d + '1';
    const fwd = n === '1' ? d + '2' : null;
    const sides = { W: ['right', 'left'], E: ['left', 'right'], N: ['bottom', 'top'], S: ['top', 'bottom'] }[d];
    const out = [{ side: sides[0], to: back, label: back === 'hub' ? F.hub : F.branches[d].n }];
    if (fwd) out.push({ side: sides[1], to: fwd, label: F.branches[d].n + ' 깊은 곳' });
    else out.push({ side: sides[1], stone: true, label: '포탈 비석' });
    return out;
  }

  function placeAt(z, side, rng) {
    const W = z.w;
    if (side === 'left') return M.groundPos(z, 4);
    if (side === 'right') return M.groundPos(z, W - 5);
    if (side === 'top') {
      const s = M.highestSeg(z, W / 2);
      if (s) return { x: Math.floor((s.x0 + s.x1) / 2) * TS + TS / 2, y: s.y * TS };
      return M.groundPos(z, W >> 1);
    }
    if (side === 'bottom') {
      // 지면 중앙 근처
      return M.groundPos(z, Math.floor(W * 0.5) + (rng ? rng.int(-6, 6) : 0));
    }
    if (side === 'pit') return M.groundPos(z, Math.floor(W * 0.5) + 14);
    return M.groundPos(z, W >> 1);
  }

  // 구역 생성 (결정적)
  function build(floor, zid, run) {
    const F = HC.FLOORS[floor];
    const theme = HC.THEMES[zid === 'lair' ? 'abyss' : zid === 'rift' ? (HC.FLOORS[floor].rift.theme === 'blood' ? 'blood' : HC.FLOORS[floor].rift.theme) : F.theme];
    const sh = zoneShape(floor, zid);
    const seed = U.hash('f' + floor + '-' + zid);
    const rng = U.RNG(seed ^ 0xabc);
    let z;
    if (sh.arena) {
      z = M.flat({ w: sh.w, h: sh.h, ceiling: theme.bg !== 'waste', plats: [[8, 16, sh.h - 9, 12], [sh.w - 17, sh.w - 9, sh.h - 9, sh.w - 13], [sh.w / 2 - 5, sh.w / 2 + 5, sh.h - 14, 0]] });
    } else {
      z = M.generate({
        seed, w: sh.w, h: sh.h, ceiling: theme.bg === 'cave' || theme.bg === 'forest', vertical: !!sh.vertical,
        platDensity: sh.vertical ? 0.72 : 0.6, ropeChance: sh.vertical ? 0.45 : 0.32,
        pits: floor >= 2 && !sh.vertical && zid !== 'hub' ? [1, 3] : null, spikes: floor >= 2,
        flatCenter: sh.flatCenter, hills: floor === 2 ? 2 : 1,
      });
    }
    z.seed = seed; z.id = zid; z.floor = floor; z.theme = theme; z.name = zoneName(floor, zid);
    z.safeX = null;
    // 포탈
    if (!sh.arena) {
      for (const L of links(floor, zid)) {
        const pos = placeAt(z, L.side, rng);
        if (L.stone) {
          const active = run && run.stoneZone === zid;
          z.portals.push({ kind: 'stone', x: pos.x, y: pos.y, active: active && floor < HC.MAX_FLOOR, label: active ? (floor < HC.MAX_FLOOR ? (floor + 1) + '층으로 가는 포탈' : '닫힌 포탈 (아직 더 깊은 곳은 열리지 않았다)') : '돌덩이가 된 비석' });
        } else z.portals.push({ kind: L.side === 'pit' || L.side === 'bottom' ? 'down' : L.side === 'top' ? 'up' : 'edge', side: L.side, x: pos.x, y: pos.y, to: L.to, label: L.label });
      }
    } else {
      z.portals.push({ kind: 'exit', x: (sh.w - 6) * TS, y: (sh.h - 4) * TS, to: null, label: '출구', hidden: true });
    }
    if (zid === 'hub') {
      const c = M.groundPos(z, Math.floor(z.w / 2));
      z.objects.push({ type: 'campfire', x: c.x, y: c.y, light: 130 });
      z.safeX = c.x;
      const g = M.groundPos(z, Math.floor(z.w / 2) - 14);
      z.portals.push({ kind: 'lair', x: g.x, y: g.y, to: 'lair', label: HC.getMob(F.lord.id).n + '의 제단', hidden: true });
    }
    // 오브젝트
    if (!sh.arena) populateObjects(z, F, zid, rng, run);
    else {
      // 아레나 조명
      for (const fx of [6, sh.w - 7]) { const gp = M.groundPos(z, fx); z.objects.push({ type: 'brazier', x: gp.x, y: gp.y, light: 110 }); }
    }
    z.canvas = HC.Render.buildTiles(z, theme);
    z.bg = HC.Render.buildBackground(theme, seed);
    return z;
  }

  function zoneName(floor, zid) {
    const F = HC.FLOORS[floor];
    if (zid === 'hub') return F.hub;
    if (zid === 'lair') return HC.getMob(F.lord.id).n + '의 제단';
    if (zid === 'rift') return '열극: ' + F.rift.n;
    return F.branches[zid[0]].n + (zid[1] === '2' ? ' 깊은 곳' : '');
  }

  function randSpawn(z, rng, pred) {
    for (let i = 0; i < 40; i++) {
      const s = z.spawns[Math.floor((rng ? rng() : Math.random()) * z.spawns.length)];
      if (!s) return null;
      if (!pred || pred(s)) return s;
    }
    return null;
  }

  function nearPortal(z, s, d) { return z.portals.some((p) => Math.abs(p.x - s.x) < (d || 60) && Math.abs(p.y - s.y) < 40); }

  function populateObjects(z, F, zid, rng, run) {
    const o = F.objects || {};
    const used = [];
    const ok = (s) => !nearPortal(z, s, 70) && !used.some((u) => Math.abs(u.x - s.x) < 40 && Math.abs(u.y - s.y) < 20) && (z.safeX == null || Math.abs(s.x - z.safeX) > 60);
    const isHub = zid === 'hub';
    const scale = isHub ? 0.5 : 1;
    function put(type, n, extra) {
      for (let i = 0; i < Math.round(n * scale); i++) {
        const s = randSpawn(z, rng, ok);
        if (!s) continue;
        used.push(s);
        z.objects.push(Object.assign({ type, x: s.x, y: s.y, id: type + i + '_' + zid }, extra || {}));
      }
    }
    if (o.crystal) put('crystal', o.crystal, { hp: 3, light: 70 });
    if (o.rock) put('rock', o.rock, { hp: 4 });
    if (o.totem) put('totem', o.totem, { hp: 4, light: 40 });
    if (o.herb) put('herb', o.herb, { herb: F.herb });
    if (o.hidden) put('hidden', o.hidden);
    // 테마별 고정 광원
    if (F.theme === 'forest') put('lantern', 4, { light: 90 });
    if (F.theme === 'spire') put('starShard', 4, { light: 80 });
    if (F.theme === 'waste') put('brazier', 2, { light: 100 });
    if (F.theme === 'cave') put('crystalSmall', 6, { light: 50 });
    // 이미 부순 오브젝트 반영
    if (run && run.broken) z.objects = z.objects.filter((ob) => !run.broken[ob.id]);
  }

  // ── 스폰 ──
  function spawnMob(def, x, y, o) {
    const G = HC.G;
    if (!def) return null;
    const e = HC.Enemy.create(def, x, y, o);
    if (e.hanging) {
      // 위쪽 발판 밑에 매달기
      const tx = Math.floor(x / TS);
      let ty = Math.floor((y - 8) / TS);
      while (ty > 1 && !M.isPlat(G.zone, tx, ty) && !M.isSolid(G.zone, tx, ty)) ty--;
      if (ty > 1 && y - (ty + 1) * TS > 60) e.y = (ty + 1) * TS + 4; else { e.hanging = false; e.y = y - e.h; }
    }
    if (e.flying) e.y -= 40;
    G.enemies.push(e);
    G.save.seen[def.id] = true;
    return e;
  }

  function mobTable(floor, zid) {
    const F = HC.FLOORS[floor];
    if (zid === 'hub') return F.hubMobs;
    if (zid === 'lair' || zid === 'rift') return {};
    return F.branches[zid[0]].mobs;
  }

  function capFor(z) {
    const F = HC.FLOORS[z.floor];
    if (z.id === 'lair' || z.id === 'rift') return 0;
    // 맵 넓이(세로 맵은 높이까지)에 비례
    const span = z.w * Math.max(1, z.h / 42);
    let cap = Math.round(span / (z.id === 'hub' ? 24 : 14) * F.density);
    cap = U.clamp(cap, 3, z.id === 'hub' ? 6 : 18);
    if (HC.Descent.isNight()) cap = Math.round(cap * 1.3);
    return cap;
  }

  function spawnWave(z, initial) {
    const G = HC.G, p = G.player;
    const table = mobTable(z.floor, z.id);
    const ids = Object.keys(table);
    if (!ids.length) return;
    const cap = capFor(z);
    const alive = G.enemies.filter((e) => !e.dead && !e.boss && !e.elite && !e.summoner).length;
    let need = cap - alive;
    if (!initial) need = Math.min(need, 3);
    while (need > 0) {
      need--;
      const id = U.weighted(ids, (k) => table[k]);
      let def = HC.getMob(id);
      if (G.run && G.run.lordAwake && G.run.floor === z.floor) def = HC.getMob(id + '_c');
      const s = randSpawn(z, null, (s) => (Math.abs(s.x - (p.x + p.w / 2)) > (initial ? 200 : 300) || Math.abs(s.y - p.y) > 200) && !nearPortal(z, s, 90) && (z.safeX == null || Math.abs(s.x - z.safeX) > 150));
      if (!s) continue;
      const pack = def.pack ? Math.min(U.randi(def.pack[0], def.pack[1]), need + 1) : 1;
      need -= pack - 1;
      for (let k = 0; k < pack; k++) spawnMob(def, s.x + k * 14, s.y, { spawnT: initial ? 0 : 0.6 });
    }
  }

  // ── 드랍 ──
  function addDrop(type, x, y, data) {
    const d = Object.assign({ type, x, y, vx: U.rand(-60, 60), vy: U.rand(-220, -120), w: 6, h: 6, t: 0, onGround: false }, data || {});
    HC.G.drops.push(d);
    return d;
  }

  function dropLoot(e, minimal) {
    const G = HC.G, def = e.def, st = G.player.st;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    if (G.scene !== 'descent') return;
    // 흑석
    const n = Math.round(U.randi(def.stone[0], def.stone[1]) * st.stoneDrop);
    if (n > 0) addDrop('stone', cx, cy, { n });
    if (minimal) return;
    // 영혼
    if (def.soul) {
      let ch = def.soul.drop * st.soulDrop;
      if (G.run.lordAwake && def.corrupt) ch *= 1.0;
      if (Math.random() < ch) {
        const colors = def.soul.colors;
        const ci = Math.floor(Math.random() * colors.length);
        addDrop('soul', cx, cy - 6, { id: def.baseId || def.id, color: ci, hex: colors[ci].hex, vy: -160 });
        if (e.boss || e.elite) HC.UI.toast('영혼이 떨어졌다 — ' + soulName(def.baseId || def.id, ci), 2.5);
      }
    }
    // 재료
    for (const dr of def.drops || []) {
      if (dr.id === 'relic') {
        if (Math.random() < dr.ch) addDrop('relic', cx, cy, { id: rollRelic() });
        continue;
      }
      if (Math.random() < dr.ch * (HC.ITEMS[dr.id] && HC.ITEMS[dr.id].cat === 'rare' ? 1 : st.matDrop)) {
        const k = dr.n ? U.randi(dr.n[0], dr.n[1]) : 1;
        addDrop('item', cx + U.rand(-6, 6), cy, { id: dr.id, n: k });
      }
    }
    // 층별 위령 파편 (드물게)
    const F = HC.FLOORS[G.run.floor];
    if (!e.boss && Math.random() < (e.elite ? 0 : 0.006)) addDrop('item', cx, cy, { id: F.frag, n: 1 });
  }

  function rollRelic() {
    const G = HC.G;
    const owned = new Set(G.save.relics.concat([G.save.equip.relic1, G.save.equip.relic2].filter(Boolean)));
    const pool = Object.keys(HC.RELICS).filter((k) => !owned.has(k));
    return pool.length ? U.pick(pool) : null;
  }

  function soulName(id, ci) {
    const d = HC.getMob(id);
    if (!d || !d.soul) return '?';
    const c = d.soul.colors[ci] || d.soul.colors[0];
    return c.c + ' ' + d.n + '의 영혼';
  }

  function updateDrops(dt, z) {
    const G = HC.G, p = G.player;
    for (let i = G.drops.length - 1; i >= 0; i--) {
      const d = G.drops[i];
      d.t += dt;
      if (!d.onGround) {
        d.vy = Math.min(500, d.vy + 900 * dt);
        HC.Phys.move(z, d, dt);
        d.vx *= 0.98;
        if (d.onGround) d.vx = 0;
      }
      if (d.type === 'soul' && Math.random() < 0.3) HC.FX.soulWisp(d.x + 3, d.y, d.hex || '#ffffff');
      if (p.dead) continue;
      const dist = U.dist(d.x + 3, d.y + 3, U.cx(p), U.cy(p));
      if (d.t > 0.4 && dist < 60 && d.type === 'stone') { d.x += (U.cx(p) - d.x) * Math.min(1, dt * 8); d.y += (U.cy(p) - d.y) * Math.min(1, dt * 8); }
      if (d.t > 0.35 && dist < 16) {
        if (pickup(d)) G.drops.splice(i, 1);
      } else if (d.t > 90 && d.type !== 'soul' && d.type !== 'relic') G.drops.splice(i, 1);
    }
  }

  function pickup(d) {
    const G = HC.G, run = G.run;
    if (!run) return true;
    if (d.type === 'stone') { run.stones += d.n; HC.Audio.play('pickup'); HC.FX.text(d.x, d.y - 6, '흑석 +' + d.n, '#9a8ab8', 9); HC.UI.dirty = true; return true; }
    if (d.type === 'soul') {
      run.orbs.push({ id: d.id, color: d.color });
      HC.Audio.play('soul');
      HC.UI.banner('영혼 획득', soulName(d.id, d.color) + ' — [K]에서 흡수할 수 있다', d.hex || '#ffffff', 2.2);
      HC.UI.dirty = true;
      return true;
    }
    if (d.type === 'relic') {
      if (!d.id) { run.bag.riftStone = (run.bag.riftStone || 0) + 1; return true; }
      run.relics.push(d.id);
      HC.Audio.play('soul');
      const r = HC.RELICS[d.id];
      HC.UI.banner('각인 유물 No.' + r.no, r.n + ' — ' + r.d, '#e0c080', 3);
      return true;
    }
    if (d.type === 'item') {
      const bag = run.bag;
      const slots = Object.keys(bag).filter((k) => bag[k] > 0).length;
      if (!bag[d.id] && slots >= G.player.st.bag) {
        if (!d.warned || G.time - d.warned > 3) { HC.UI.toast('가방이 가득 찼다 (' + slots + '칸)', 1.2); d.warned = G.time; }
        return false;
      }
      bag[d.id] = (bag[d.id] || 0) + d.n;
      HC.Audio.play('pickup');
      const it = HC.ITEMS[d.id];
      HC.FX.text(d.x, d.y - 6, (it ? it.n : d.id) + (d.n > 1 ? ' ×' + d.n : ''), it ? it.col : '#fff', 9);
      HC.UI.dirty = true;
      return true;
    }
    return true;
  }

  function drawDrops(ctx, cam, t) {
    for (const d of HC.G.drops) {
      const x = Math.round(d.x - cam.x), y = Math.round(d.y - cam.y + Math.sin(t * 3 + d.x) * (d.onGround ? 1 : 0));
      if (d.type === 'stone') {
        ctx.fillStyle = '#2a2236'; ctx.fillRect(x, y + 1, 6, 5);
        ctx.fillStyle = '#7a6aa0'; ctx.fillRect(x + 1, y, 4, 2);
        ctx.fillStyle = '#c0b0ff'; ctx.fillRect(x + 2, y + 2, 1, 1);
      } else if (d.type === 'soul') {
        const r = 4 + Math.sin(t * 6) * 0.8;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = U.colorAlpha(d.hex || '#ffffff', 0.3); ctx.beginPath(); ctx.arc(x + 3, y, r + 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = d.hex || '#ffffff'; ctx.beginPath(); ctx.arc(x + 3, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, y - 2, 2, 2);
        ctx.restore();
      } else if (d.type === 'relic') {
        ctx.fillStyle = '#e0c080'; ctx.fillRect(x, y, 7, 7); ctx.fillStyle = '#3a2a10'; ctx.fillRect(x + 2, y + 2, 3, 3);
        if (Math.random() < 0.2) HC.FX.soulWisp(d.x + 3, d.y, '#e0c080');
      } else {
        const it = HC.ITEMS[d.id];
        ctx.fillStyle = it ? it.col : '#aaa'; ctx.fillRect(x, y + 1, 6, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x + 1, y + 1, 2, 1);
      }
    }
  }

  // ── 오브젝트 ──
  function hitObjects(box, atk) {
    const G = HC.G, z = G.zone;
    let any = false;
    for (const o of z.objects) {
      if (!(o.type === 'crystal' || o.type === 'rock' || o.type === 'totem') || o.dead) continue;
      if (atk.hit.has(o)) continue;
      const ob = { x: o.x - 8, y: o.y - 20, w: 16, h: 20 };
      if (!U.overlap(box, ob)) continue;
      atk.hit.add(o);
      o.hp--; o.shake = 0.2;
      HC.FX.sparks(o.x, o.y - 10, o.type === 'crystal' ? ['#62c8ff', '#ffffff'] : ['#a09080', '#ffffff'], 6);
      HC.Audio.play('hit');
      any = true;
      if (o.hp <= 0) breakObject(o);
    }
    return any;
  }

  function breakObject(o) {
    const G = HC.G, run = G.run;
    o.dead = true; o.light = 0;
    HC.Audio.play('break');
    HC.FX.burst(o.x, o.y - 10, 18, o.type === 'crystal' ? ['#62c8ff', '#a0e0ff'] : o.type === 'totem' ? ['#5a4a30', '#a0ff80'] : ['#8a7a6a', '#5a5048'], { min: 60, max: 200 });
    if (run) {
      run.broken[o.id] = true;
      run.objBroken[o.type] = (run.objBroken[o.type] || 0) + 1;
      if (o.type === 'crystal') { addDrop('item', o.x, o.y - 10, { id: 'blueShard', n: U.randi(1, 3) }); if (Math.random() < 0.4) addDrop('item', o.x, o.y - 10, { id: 'glowMoss', n: 1 }); }
      if (o.type === 'rock') { addDrop('item', o.x, o.y - 10, { id: 'golemCore', n: 1 }); addDrop('stone', o.x, o.y - 10, { n: U.randi(4, 10) }); }
      if (o.type === 'totem') { addDrop('item', o.x, o.y - 10, { id: 'crowFeather', n: U.randi(1, 2) }); addDrop('stone', o.x, o.y - 10, { n: U.randi(6, 14) }); }
      HC.Descent.onObjectBroken(o);
    }
    const z = G.zone;
    z.objects = z.objects.filter((x) => x !== o);
  }

  function interactObjects(p) {
    const G = HC.G, z = G.zone, run = G.run;
    for (const o of z.objects) {
      if (Math.abs(o.x - U.cx(p)) > 18 || Math.abs(o.y - (p.y + p.h)) > 24) continue;
      if (o.type === 'herb') {
        const bag = run.bag;
        const slots = Object.keys(bag).filter((k) => bag[k] > 0).length;
        if (!bag[o.herb] && slots >= p.st.bag) { HC.UI.toast('가방이 가득 찼다', 1); return true; }
        bag[o.herb] = (bag[o.herb] || 0) + U.randi(1, 2);
        run.broken[o.id] = true;
        z.objects = z.objects.filter((x) => x !== o);
        HC.Audio.play('pickup');
        HC.FX.text(o.x, o.y - 12, HC.ITEMS[o.herb].n, HC.ITEMS[o.herb].col, 10);
        HC.UI.dirty = true;
        return true;
      }
      if (o.type === 'hidden' && o.found) {
        run.broken[o.id] = true;
        z.objects = z.objects.filter((x) => x !== o);
        HC.Audio.play('soul');
        HC.FX.burst(o.x, o.y - 6, 20, ['#ffe0a0', '#ffffff'], { g: -50, min: 30, max: 120, glow: true });
        const F = HC.FLOORS[run.floor];
        const roll = Math.random();
        addDrop('stone', o.x, o.y - 8, { n: U.randi(15, 30) * run.floor });
        if (roll < 0.05) addDrop('relic', o.x, o.y - 8, { id: rollRelic() });
        else if (roll < 0.35) addDrop('item', o.x, o.y - 8, { id: F.frag, n: U.randi(1, 2) });
        else if (roll < 0.6) addDrop('item', o.x, o.y - 8, { id: 'scarMark', n: 1 });
        else addDrop('item', o.x, o.y - 8, { id: U.pick(['design_rage', 'design_fang', 'design_venom', 'design_scale', 'design_root']), n: 1 });
        HC.UI.toast('숨은 조각을 파냈다', 1.6);
        return true;
      }
      if (o.type === 'campfire') { HC.Descent.toggleRest(); return true; }
    }
    return false;
  }

  function updateObjects(dt, z, t) {
    const p = HC.G.player;
    for (const o of z.objects) {
      if (o.shake) o.shake = Math.max(0, o.shake - dt);
      if (o.type === 'hidden' && !o.found) {
        const r = 40 + p.st.s.per * 0.8 * (p.st.detect ? 2 : 1);
        if (U.dist(o.x, o.y, U.cx(p), p.y + p.h) < r) { o.found = true; HC.UI.toast('무언가 묻혀 있다… [E]', 1.6); HC.Audio.play('ui'); }
      }
      if (o.type === 'campfire' && Math.random() < 0.6) HC.FX.p({ x: o.x + U.rand(-4, 4), y: o.y - 6, vx: U.rand(-10, 10), vy: U.rand(-60, -30), life: U.rand(0.4, 0.9), s: U.randi(1, 2), col: U.pick(['#ffb040', '#ff7020', '#ffe080']), g: -20, glow: true });
      if (o.type === 'brazier' && Math.random() < 0.4) HC.FX.p({ x: o.x + U.rand(-3, 3), y: o.y - 16, vy: U.rand(-50, -20), life: 0.6, s: 1, col: U.pick(['#ff9040', '#ffd080']), g: -20, glow: true });
    }
  }

  function drawObjects(ctx, cam, t) {
    const z = HC.G.zone;
    for (const o of z.objects) {
      const x = Math.round(o.x - cam.x + (o.shake ? U.rand(-1, 1) : 0)), y = Math.round(o.y - cam.y);
      if (x < -60 || x > HC.VW + 60 || y < -80 || y > HC.VH + 60) continue;
      switch (o.type) {
        case 'crystal':
          ctx.fillStyle = '#1a3a4a'; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 4, y - 18); ctx.lineTo(x + 1, y - 10); ctx.lineTo(x + 5, y - 22); ctx.lineTo(x + 8, y); ctx.fill();
          ctx.fillStyle = '#62c8ff'; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x - 4, y - 15); ctx.lineTo(x - 1, y); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + 5, y - 19); ctx.lineTo(x + 7, y); ctx.fill();
          ctx.fillStyle = '#d0f4ff'; ctx.fillRect(x + 4, y - 15, 1, 4);
          break;
        case 'crystalSmall':
          ctx.fillStyle = '#62c8ff'; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x, y - 8); ctx.lineTo(x + 3, y); ctx.fill();
          break;
        case 'rock':
          ctx.fillStyle = '#4a3e36'; ctx.fillRect(x - 9, y - 14, 18, 14); ctx.fillStyle = '#6a5a4a'; ctx.fillRect(x - 9, y - 14, 18, 2);
          ctx.strokeStyle = '#ffb060'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 3, y - 14); ctx.lineTo(x, y - 8); ctx.lineTo(x - 2, y - 2); ctx.stroke();
          break;
        case 'totem':
          ctx.fillStyle = '#2a2016'; ctx.fillRect(x - 3, y - 26, 6, 26); ctx.fillStyle = '#4a3a24'; ctx.fillRect(x - 6, y - 24, 12, 8);
          HC.Draw.eyeGlow(ctx, x - 3, y - 21, '#a0ff80', 1); HC.Draw.eyeGlow(ctx, x + 2, y - 21, '#a0ff80', 1);
          break;
        case 'herb': {
          const it = HC.ITEMS[o.herb];
          ctx.fillStyle = '#2a3a2a'; ctx.fillRect(x - 1, y - 6, 1, 6); ctx.fillRect(x + 2, y - 5, 1, 5);
          ctx.fillStyle = it.col; ctx.fillRect(x - 2, y - 8, 3, 3); ctx.fillRect(x + 1, y - 7, 3, 2);
          if (Math.random() < 0.05) HC.FX.soulWisp(o.x, o.y - 6, it.col);
          break;
        }
        case 'hidden':
          if (o.found) { ctx.fillStyle = '#5a4a30'; ctx.fillRect(x - 5, y - 2, 10, 2); if (Math.random() < 0.3) HC.FX.soulWisp(o.x + U.rand(-4, 4), o.y - 2, '#ffe0a0'); }
          break;
        case 'campfire':
          ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 8, y - 3, 16, 3); ctx.fillRect(x - 6, y - 5, 12, 2);
          ctx.fillStyle = '#ff8030'; ctx.beginPath(); ctx.moveTo(x - 5, y - 4); ctx.lineTo(x, y - 14 - Math.sin(t * 12) * 2); ctx.lineTo(x + 5, y - 4); ctx.fill();
          ctx.fillStyle = '#ffd060'; ctx.beginPath(); ctx.moveTo(x - 2, y - 4); ctx.lineTo(x, y - 9 - Math.sin(t * 15) * 2); ctx.lineTo(x + 2, y - 4); ctx.fill();
          break;
        case 'brazier':
          ctx.fillStyle = '#3a3230'; ctx.fillRect(x - 2, y - 14, 4, 14); ctx.fillRect(x - 6, y - 16, 12, 3);
          ctx.fillStyle = '#ff8030'; ctx.fillRect(x - 4, y - 20 - Math.sin(t * 10), 8, 4);
          break;
        case 'lantern':
          ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x, y - 30, 1, 30); ctx.fillRect(x - 4, y - 30, 9, 1);
          ctx.fillStyle = '#d0ffc0'; ctx.fillRect(x + 3, y - 28, 3, 4);
          break;
        case 'starShard':
          ctx.fillStyle = '#c9b8ff'; ctx.beginPath(); ctx.moveTo(x, y - 14 + Math.sin(t * 2) * 2); ctx.lineTo(x + 4, y - 7); ctx.lineTo(x, y); ctx.lineTo(x - 4, y - 7); ctx.fill();
          break;
        default: break;
      }
    }
  }

  return { build, zoneName, spawnMob, spawnWave, capFor, addDrop, dropLoot, updateDrops, drawDrops, hitObjects, interactObjects, updateObjects, drawObjects, soulName, rollRelic, randSpawn, links };
})();
