'use strict';
/*
 강하(던전 진행) 로직.
 - 층마다 닫히는 시각이 정해져 있고, 닫히면 나락이 탐색자를 도시로 뱉어낸다 (전리품 유지).
 - 죽으면 들고 있던 것을 전부 잃고 중상을 입은 채 도시에서 깨어난다.
 - 이형(엘리트) < 층주 < 층의 재앙. 열극에는 파수꾼.
*/
HC.Descent = (function () {
  const U = HC.U, TS = HC.TS;
  const DAY = () => HC.DAY_SEC;

  function newRun(floor) {
    const G = HC.G, save = G.save;
    const run = {
      floor, startFloor: floor, t: 0, closeAt: 0,
      zone: 'hub', prevZone: null, stoneZone: null,
      stones: 0, bag: {}, orbs: [], relics: [],
      potions: Object.assign({}, save.potions),
      kills: {}, floorKills: 0, totalKills: 0, broken: {}, objBroken: {}, burst: {},
      elites: {}, lordAwake: false, lordKilled: false, lordField: null, lordHp: null,
      calamity: { state: 'none' }, rift: { state: 'none' }, weather: null,
      tonic: false, torchT: 0, exp: 0, resting: false, lastHour: -1, lastDay: 0,
      mobAtkMult: 1, log: [], spawnT: 4, fieldT: 0, events: [],
    };
    if (save.items.battleTonic > 0) { save.items.battleTonic--; run.tonic = true; }
    return run;
  }

  function initFloor(run, floor) {
    const G = HC.G, F = HC.FLOORS[floor];
    run.floor = floor; run.t = 0;
    const st = HC.Stats.compute(G.save, { run });
    run.closeAt = (F.days + (st.extraDay || 0)) * DAY();
    run.stoneZone = U.pick(['W2', 'E2', 'N2', 'S2']);
    run.floorKills = 0; run.broken = {}; run.objBroken = {}; run.burst = {}; run.elites = {};
    run.lordAwake = false; run.lordKilled = false; run.lordField = F.lord.field; run.lordHp = null;
    run.calamity = { state: 'none' }; run.rift = { state: 'none' }; run.weather = null;
    run.lastHour = -1; run.lastDay = 0;
    // 층의 재앙: 층주를 쓰러뜨린 적이 있어야 깨어날 수 있다
    const C = F.calamity;
    const lordDone = (G.save.flags.lordKilled[floor] || 0) > 0;
    if ((!C.needLord || lordDone) && Math.random() < C.chance) scheduleCalamity(run, U.rand(0.3, 1.5) * DAY());
    // 열극
    if (Math.random() < F.rift.chance) run.rift = { state: 'pending', at: U.rand(0.4, Math.max(0.6, F.days - 2)) * DAY() };
    G.save.maxFloor = Math.max(G.save.maxFloor, floor);
    G.save.stats.bestFloor = Math.max(G.save.stats.bestFloor || 1, floor);
  }

  function scheduleCalamity(run, at) {
    const zones = ['W1', 'W2', 'E1', 'E2', 'N1', 'N2', 'S1', 'S2'];
    run.calamity = { state: 'pending', at: run.t + at, zone: U.pick(zones), hp: null };
  }

  function start(floor, resume) {
    const G = HC.G;
    G.scene = 'descent';
    HC.Combat.reset();
    G.drops = []; G.pzones = [];
    HC.FX.clear();
    if (resume) {
      G.run = resume;
      G.player = HC.Player.create();
      HC.Player.look(G.player, G.save);
      HC.Player.recalc(G.player);
      G.player.hp = Math.max(1, Math.min(G.player.st.maxHp, resume.hp || G.player.st.maxHp));
      enterZone(resume.zone, null);
      HC.UI.banner(HC.FLOORS[resume.floor].n, '중단했던 강하를 이어간다', '#a0a0b0', 2.5);
    } else {
      G.run = newRun(floor);
      initFloor(G.run, floor);
      G.player = HC.Player.create();
      HC.Player.look(G.player, G.save);
      HC.Player.recalc(G.player);
      G.player.hp = G.player.st.maxHp; G.player.sta = G.player.st.maxSta;
      G.save.stats.descents++;
      enterZone('hub', null);
      const F = HC.FLOORS[floor];
      HC.UI.banner(floor + '층 ' + F.n, F.desc, '#c8c0b0', 4);
      if (G.save.wounded) HC.UI.toast('중상을 입은 몸이다. 최대 체력 -25%', 3);
      if (G.run.tonic) HC.UI.toast('투지의 영약을 마셨다. 피해 +15%', 2.5);
    }
    HC.Audio.ambience(HC.FLOORS[G.run.floor].amb);
    HC.UI.dirty = true;
    checkpoint();
  }

  function enterZone(zid, fromZid) {
    const G = HC.G, run = G.run, p = G.player;
    HC.Combat.reset();
    G.drops = [];
    G.pzones = [];
    G.enemies = [];
    G.boss = null;
    run.prevZone = fromZid;
    run.zone = zid;
    run.resting = false;
    const z = HC.World.build(run.floor, zid, run);
    G.zone = z;
    // 등장 위치
    let pos = null;
    if (fromZid) {
      const back = z.portals.find((pt) => pt.to === fromZid);
      if (back) pos = { x: back.x, y: back.y };
    }
    if (!pos) {
      const fire = z.objects.find((o) => o.type === 'campfire');
      pos = fire ? { x: fire.x + 24, y: fire.y } : { x: z.portals[0] ? z.portals[0].x : z.w * TS / 2, y: z.portals[0] ? z.portals[0].y : z.h * TS / 2 };
    }
    if (zid === 'lair' || zid === 'rift') pos = HC.Map.groundPos(z, 6);
    if (zid === 'lair') for (const pt of z.portals) if (pt.kind === 'exit') { pt.hidden = false; pt.label = '제단에서 물러난다'; pt.x = HC.Map.groundPos(z, 3).x; }
    p.x = pos.x - p.w / 2; p.y = pos.y - p.h; p.vx = 0; p.vy = 0; p.state = 'normal'; p.rope = null; p.act = null;
    p.iframe = 1.2;
    // 층주 제단 입구
    const lairP = z.portals.find((pt) => pt.kind === 'lair');
    if (lairP) lairP.hidden = !run.lordAwake;
    // 열극 입구
    if (run.rift.state === 'open' && run.rift.zone === zid) {
      z.portals.push({ kind: 'rift', x: run.rift.x, y: run.rift.y, to: 'rift', label: '붉은 열극. 한번 들어가면 파수꾼을 죽여야 나온다' });
    }
    // 보스 배치
    if (zid === 'lair' && run.lordAwake) spawnBoss(HC.FLOORS[run.floor].lord.id, 'lord');
    if (zid === 'rift') spawnBoss(HC.FLOORS[run.floor].rift.guardian, 'guardian');
    if (run.calamity.state === 'active' && run.calamity.zone === zid) spawnBoss(HC.FLOORS[run.floor].calamity.id, 'calamity');
    // 몬스터
    HC.World.spawnWave(z, true);
    G.cam = G.cam || HC.Render.Camera();
    HC.Render.updateCamera(G.cam, z, p, 0.016, true);
    HC.UI.zoneName(z.name);
    const amb = zid === 'lair' ? 'lord' : zid === 'rift' ? 'rift' : (run.lordAwake ? 'lord' : HC.FLOORS[run.floor].amb);
    HC.Audio.ambience(amb);
    HC.UI.dirty = true;
    HC.UI.bossBar(null);
  }

  function spawnBoss(id, kind) {
    const G = HC.G, z = G.zone, run = G.run, p = G.player;
    const def = HC.getMob(id);
    let x;
    if (kind === 'calamity') {
      // 입구에서 먼 곳
      const far = HC.World.randSpawn(z, null, (s) => Math.abs(s.x - (p.x + p.w / 2)) > 320 && !s.plat);
      x = far ? far.x : z.w * TS * 0.7;
    } else x = z.w * TS * 0.65;
    const gp = HC.Map.groundPos(z, Math.floor(x / TS));
    const e = HC.World.spawnMob(def, gp.x, gp.y, { aggro: true, spawnT: 1.2 });
    if (kind === 'lord' && run.lordHp) e.hp = run.lordHp;
    if (kind === 'calamity' && run.calamity.hp) e.hp = run.calamity.hp;
    G.boss = e;
    HC.UI.bossBar(e);
    if (kind === 'calamity') {
      HC.UI.banner('층의 재앙', def.n, '#ff3040', 3.5);
      HC.Audio.play('alarm');
      HC.Render.shake(G.cam, 9, 1.2);
    } else if (kind === 'lord') {
      HC.UI.banner('층주', def.n, '#b070ff', 3);
      HC.Audio.play('roar');
    } else {
      HC.UI.banner('열극의 파수꾼', def.n, '#ff5060', 3);
      HC.Audio.play('roar');
    }
    return e;
  }

  function isNight() {
    const run = HC.G.run;
    if (!run) return false;
    return (run.t % DAY()) / DAY() >= HC.NIGHT_FROM;
  }

  function lights(z) {
    const out = [];
    for (const o of z.objects) if (o.light) out.push(o);
    for (const pt of z.portals) if (!pt.hidden && (pt.kind !== 'stone' || pt.active)) out.push({ x: pt.x, y: pt.y - 16, light: 60 });
    return out;
  }
  function nearLight(p, r) {
    const z = HC.G.zone;
    for (const L of lights(z)) if (U.dist(L.x, L.y - 10, U.cx(p), U.cy(p)) < (r || L.light * 0.75)) return true;
    return false;
  }
  function skillsSealed(p) {
    const run = HC.G.run;
    return run && run.lordAwake && run.lordField === 'abyssFog' && !nearLight(p);
  }

  function awakenLord() {
    const G = HC.G, run = G.run, F = HC.FLOORS[run.floor];
    run.lordAwake = true;
    const def = HC.getMob(F.lord.id);
    HC.Audio.play('alarm');
    HC.Render.shake(G.cam, 8, 1.5);
    const fieldTxt = { abyssFog: '심연의 안개가 깔렸다. 빛에서 멀어지면 영혼 스킬이 봉인된다.', ashStorm: '잿빛 폭풍이 분다. 시야가 좁아지고 회복이 반감된다.', wailing: '숲이 곡을 한다. 빛이 없는 곳에 머물면 공포가 쌓인다.', starfall: '하늘에서 별이 떨어진다. 붉은 표식을 피하라.' }[run.lordField];
    HC.UI.banner(U.josa(def.n, '이', '가') + ' 깨어났다', fieldTxt, '#b070ff', 5);
    HC.UI.log('층주 ' + U.josa(def.n, '이', '가') + ' 깨어났다. 몬스터들이 잠식됐다.');
    // 현재 구역 몬스터 잠식
    for (const e of G.enemies.slice()) {
      if (e.dead || e.boss || e.elite || e.def.corrupt || e.def.summonOnly) continue;
      const c = HC.getMob(e.def.id + '_c');
      if (!c) continue;
      e.dead = true; e.deathT = 0.6;
      HC.FX.burst(U.cx(e), U.cy(e), 10, ['#9040e0', '#20102a'], { g: -40 });
      HC.World.spawnMob(c, U.cx(e), e.y + e.h, { aggro: e.aggro, spawnT: 0.5 });
    }
    const lp = G.zone.portals.find((pt) => pt.kind === 'lair');
    if (lp) lp.hidden = false;
    HC.Audio.ambience('lord');
    HC.G.save.seen[def.id] = true;
  }

  function hourTick(run) {
    const G = HC.G, F = HC.FLOORS[run.floor];
    const day = Math.floor(run.t / DAY()) + 1;
    // 층주
    const L = F.lord;
    if (!run.lordAwake && !run.lordKilled && day >= L.day && run.floorKills >= L.kills && Math.random() < L.chance) awakenLord();
    // 층의 재앙 (밤에 낮은 확률)
    const C = F.calamity;
    if (run.calamity.state === 'none' && isNight() && (!C.needLord || (G.save.flags.lordKilled[run.floor] || 0) > 0 || run.lordKilled) && Math.random() < C.nightChance) scheduleCalamity(run, 0);
    // 날씨
    if (F.weather && !run.weather && Math.random() < 0.03) {
      run.weather = { kind: F.weather, until: run.t + DAY() * 0.4 };
      HC.UI.banner('잿바람', '잿빛 바람이 황야를 덮는다. 시야가 좁아진다.', '#c0a080', 3);
    }
    // 휴식 중 기습
    if (run.resting && Math.random() < 0.06) {
      run.resting = false;
      HC.UI.banner('기습', '잠든 사이 무언가 다가왔다', '#ff4040', 2);
      const p = G.player;
      const table = Object.keys(F.hubMobs);
      for (let i = 0; i < U.randi(2, 3); i++) {
        let d = HC.getMob(U.pick(table));
        if (run.lordAwake) d = HC.getMob(d.id + '_c');
        HC.World.spawnMob(d, U.cx(p) + (i % 2 ? 1 : -1) * U.rand(60, 120), p.y + p.h, { aggro: true, spawnT: 0.4 });
      }
      HC.Audio.play('alarm');
    }
  }

  function update(dt) {
    const G = HC.G, run = G.run, p = G.player, z = G.zone;
    if (!run || p.dead) return;
    const F = HC.FLOORS[run.floor];
    const speed = run.resting ? 12 : 1;
    run.t += dt * speed;
    if (run.torchT > 0) { run.torchT -= dt * speed; if (run.torchT <= 0) { p.statDirty = true; HC.UI.toast('횃불이 꺼졌다', 1.5); } }
    // 휴식
    if (run.resting) {
      HC.Player.heal(p, p.st.maxHp * 0.025 * dt, 'regen');
      p.sta = p.st.maxSta;
      if (G.enemies.some((e) => !e.dead && e.aggro && U.dist(e.x, e.y, p.x, p.y) < 260)) { run.resting = false; HC.UI.toast('적이 가까이 있다. 휴식이 깨졌다.', 1.5); }
      if (HC.Input.rawHit('left') || HC.Input.rawHit('right') || HC.Input.rawHit('jump') || HC.Input.rawHit('attack') || HC.Input.rawHit('rest')) { run.resting = false; HC.Input.consume('rest'); }
    }
    // 시간
    const hour = Math.floor(run.t / (DAY() / 24));
    if (hour !== run.lastHour) { run.lastHour = hour; hourTick(run); HC.UI.dirty = true; }
    const day = Math.floor(run.t / DAY()) + 1;
    if (day !== run.lastDay) {
      if (run.lastDay) HC.UI.toast(day + '일차. 층이 닫히기까지 ' + Math.max(0, Math.ceil((run.closeAt - run.t) / DAY())) + '일', 2.2);
      run.lastDay = day;
    }
    if (run.weather && run.t >= run.weather.until) { run.weather = null; HC.UI.toast('잿바람이 잦아들었다', 1.5); }
    // 층의 재앙 등장
    if (run.calamity.state === 'pending' && run.t >= run.calamity.at) {
      run.calamity.state = 'active';
      const def = HC.getMob(F.calamity.id);
      HC.G.save.seen[def.id] = true;
      HC.Audio.play('alarm');
      HC.Render.shake(G.cam, 10, 2);
      HC.UI.banner('층의 재앙', U.josa(def.n, '이', '가') + ' ' + HC.World.zoneName(run.floor, run.calamity.zone) + '에 나타났다', '#ff3040', 5);
      HC.UI.log('층의 재앙 ' + U.josa(def.n, '이', '가') + ' ' + HC.World.zoneName(run.floor, run.calamity.zone) + '에 나타났다');
      if (run.zone === run.calamity.zone) spawnBoss(def.id, 'calamity');
    }
    // 열극
    if (run.rift.state === 'pending' && run.t >= run.rift.at) {
      const zones = ['W1', 'W2', 'E1', 'E2', 'N1', 'N2', 'S1', 'S2'];
      const zid = U.pick(zones);
      const tmp = HC.World.build(run.floor, zid, run);
      const s = HC.World.randSpawn(tmp, null, (s) => !s.plat);
      run.rift = { state: 'open', zone: zid, x: s ? s.x : tmp.w * TS / 2, y: s ? s.y : (tmp.h - 5) * TS, closeAt: run.t + DAY() * 1.5 };
      HC.UI.banner('열극', HC.World.zoneName(run.floor, zid) + ' 어딘가에서 붉은 열극이 열렸다', '#ff5060', 4);
      HC.UI.log(HC.World.zoneName(run.floor, zid) + '에 ' + U.josa(F.rift.n, '이', '가') + ' 열렸다. 하루 반 뒤에 닫힌다');
      if (run.zone === zid) z.portals.push({ kind: 'rift', x: run.rift.x, y: run.rift.y, to: 'rift', label: '붉은 열극. 한번 들어가면 파수꾼을 죽여야 나온다' });
    }
    if (run.rift.state === 'open' && run.t >= run.rift.closeAt) {
      run.rift.state = 'closed';
      z.portals = z.portals.filter((pt) => pt.kind !== 'rift');
      HC.UI.toast('열극이 닫혔다', 2);
    }
    // 층주 필드 효과
    if (run.lordAwake && run.zone !== 'rift') {
      run.fieldT += dt;
      const lord = HC.getMob(F.lord.id);
      if (run.lordField === 'wailing' && run.fieldT > 7) { run.fieldT = 0; if (!nearLight(p)) HC.Player.addFear(p, 1); }
      if (run.lordField === 'starfall' && run.fieldT > 5.5) {
        run.fieldT = U.rand(0, 1.5);
        const x = U.cx(p) + U.rand(-30, 30);
        const sy = HC.Map.surfaceBelow(z, Math.floor(x / TS), Math.floor((p.y + 4) / TS)) * TS;
        HC.Combat.hazard({ kind: 'star', x: x - 24, y: sy - 40, w: 48, h: 40, delay: 1.1, dur: 0.15, dmg: lord.atk * 0.55, col: '#e8e0ff', owner: null, knock: 260 });
      }
    }
    // 재스폰
    run.spawnT -= dt;
    if (run.spawnT <= 0) { run.spawnT = isNight() ? 5 : 7; HC.World.spawnWave(z, false); }
    // 층이 닫힘
    if (run.t >= run.closeAt) { endRun('closed'); return; }
    // 휴식 중엔 재생 표시
  }

  // ── 처치 ──
  function onKill(e) {
    const G = HC.G, run = G.run, save = G.save, p = G.player;
    if (!run) return;
    const id = e.def.baseId || e.def.id;
    run.kills[id] = (run.kills[id] || 0) + 1;
    run.floorKills++; run.totalKills++;
    save.kills[e.def.id] = (save.kills[e.def.id] || 0) + 1;
    if (e.def.corrupt) save.kills[id] = (save.kills[id] || 0) + 0; // 장부는 원종과 잠식종 별도
    const exp = Math.round(e.def.exp * p.st.expMult);
    run.exp += exp;
    HC.Game.gainExp(exp);
    // 장부 별 갱신 알림
    const before = HC.Stats.cardStars(e.def.id, save.kills[e.def.id] - 1), after = HC.Stats.cardStars(e.def.id, save.kills[e.def.id]);
    if (after > before) { HC.UI.toast('사냥 장부: ' + e.def.n + ' ★' + after, 2); p.statDirty = true; }
    // 보스 처리
    const F = HC.FLOORS[run.floor];
    if (e.def.kind === 'lord') {
      run.lordAwake = false; run.lordKilled = true; run.lordHp = null;
      save.flags.lordKilled[run.floor] = (save.flags.lordKilled[run.floor] || 0) + 1;
      HC.UI.banner(U.josa(e.def.n, '을', '를') + ' 쓰러뜨렸다', '층을 덮고 있던 잠식이 걷힌다', '#d0a0ff', 4);
      HC.UI.log('층주 ' + e.def.n + ' 처치');
      revealExit();
      HC.UI.bossBar(null);
      HC.Audio.ambience(F.amb);
    } else if (e.def.kind === 'calamity') {
      run.calamity.state = 'dead';
      save.flags.calamityKilled[run.floor] = (save.flags.calamityKilled[run.floor] || 0) + 1;
      HC.UI.banner('층의 재앙을 쓰러뜨렸다', e.def.n, '#ff8090', 5);
      HC.UI.log('층의 재앙 ' + e.def.n + ' 처치');
      HC.UI.bossBar(null);
    } else if (e.def.kind === 'guardian') {
      run.rift.state = 'done';
      save.flags.guardianKilled[run.floor] = (save.flags.guardianKilled[run.floor] || 0) + 1;
      HC.UI.banner('파수꾼을 쓰러뜨렸다', '열극의 출구가 열렸다', '#ff8090', 4);
      HC.UI.log('파수꾼 ' + e.def.n + ' 처치');
      revealExit();
      HC.UI.bossBar(null);
    } else if (e.def.kind === 'elite') {
      run.elites[e.def.id] = 'killed';
      HC.UI.banner('이형을 쓰러뜨렸다', e.def.n, '#ffa060', 3);
      HC.UI.log('이형 ' + e.def.n + ' 처치');
    }
    if (e.boss || e.elite) { G.hitstop = 0.25; HC.Render.shake(G.cam, 8, 0.6); }
    // 이형 출현 조건
    if (e.def.kind === 'normal') checkElites(e, id);
  }

  function checkElites(e, id) {
    const G = HC.G, run = G.run, p = G.player;
    const F = HC.FLOORS[run.floor];
    if (run.zone === 'lair' || run.zone === 'rift') return;
    // 폭발적 처치 기록
    const arr = run.burst[id] = (run.burst[id] || []);
    arr.push(run.t);
    while (arr.length && run.t - arr[0] > 40) arr.shift();
    for (const el of F.elites) {
      if (run.elites[el.id]) continue;
      const c = el.cond;
      if (c.mob && c.mob !== id) continue;
      let ok = false;
      switch (c.type) {
        case 'kills': ok = (run.kills[id] || 0) >= c.n; break;
        case 'night': ok = isNight(); break;
        case 'objects': ok = (run.objBroken[c.obj] || 0) >= c.n; break;
        case 'status': ok = !!p.status[c.status]; break;
        case 'burst': ok = arr.filter((t) => run.t - t <= c.window).length >= c.n; break;
        case 'weather': ok = !!(run.weather && run.weather.kind === c.weather); break;
        default: break;
      }
      if (!ok) continue;
      if (Math.random() < el.chance * p.st.eliteChance) { spawnElite(el, e); return; }
    }
  }

  function spawnElite(el, near) {
    const G = HC.G, run = G.run, p = G.player, z = G.zone;
    run.elites[el.id] = 'spawned';
    const def = HC.getMob(el.id);
    const s = HC.World.randSpawn(z, null, (s) => Math.abs(s.x - U.cx(p)) > 90 && Math.abs(s.x - U.cx(p)) < 260 && Math.abs(s.y - (p.y + p.h)) < 120) || { x: U.cx(near), y: near.y + near.h };
    const e = HC.World.spawnMob(def, s.x, s.y, { aggro: true, spawnT: 1.0, noHang: true });
    HC.UI.banner(U.josa(def.n, '이', '가') + ' 나타났다', '', '#ff6040', 3);
    HC.UI.log('이형 ' + U.josa(def.n, '이', '가') + ' 나타났다');
    HC.Audio.play('roar');
    HC.Render.shake(G.cam, 6, 0.8);
    HC.FX.ring(U.cx(e), U.cy(e), 60, '#ff6040', 0.6, 3);
    G.save.hints['elite_' + el.id] = true;
    HC.UI.bossBar(e);
  }

  function revealExit() {
    const z = HC.G.zone;
    for (const pt of z.portals) if (pt.kind === 'exit') { pt.hidden = false; HC.FX.ring(pt.x, pt.y - 16, 40, '#ffffff', 0.6, 2); }
  }

  function onObjectBroken(o) {
    const run = HC.G.run;
    if (o.type === 'crystal' && run.objBroken.crystal === 3) HC.UI.toast('동굴 깊은 곳에서 무언가 화를 낸다…', 2);
  }

  // ── 상호작용 ──
  function portalNear(p) {
    const z = HC.G.zone;
    for (const pt of z.portals) {
      if (pt.hidden) continue;
      if (Math.abs(pt.x - U.cx(p)) < 16 && Math.abs(pt.y - (p.y + p.h)) < 26) return pt;
    }
    return null;
  }

  function interact() {
    const G = HC.G, p = G.player, run = G.run;
    if (p.dead || p.state === 'climb') return false;
    const pt = portalNear(p);
    if (pt) {
      if (pt.kind === 'stone') {
        if (!pt.active) { HC.UI.toast(pt.label, 1.5); return true; }
        nextFloor();
        return true;
      }
      if (pt.kind === 'rift') {
        run.rift.state = 'inside';
        run.rift.returnZone = run.zone;
        HC.Audio.play('portal');
        HC.UI.fade(() => enterZone('rift', run.zone));
        return true;
      }
      if (pt.kind === 'exit') {
        leaveSaveBoss();
        HC.Audio.play('portal');
        if (run.zone === 'rift') { const back = run.rift.returnZone || 'hub'; HC.UI.fade(() => enterZone(back, null)); }
        else HC.UI.fade(() => enterZone('hub', 'lair'));
        return true;
      }
      if (pt.kind === 'lair' && run.zone === 'hub') {
        if (G.boss && !G.boss.dead) return true;
        HC.Audio.play('portal');
        HC.UI.fade(() => { enterZone('lair', 'hub'); checkpoint(); });
        return true;
      }
      if (pt.to) {
        // 보스 체력 보존
        if (run.zone === 'lair' && G.boss && !G.boss.dead) run.lordHp = G.boss.hp;
        if (G.boss && !G.boss.dead && G.boss.def.kind === 'calamity') run.calamity.hp = G.boss.hp;
        HC.Audio.play('portal');
        const from = run.zone;
        HC.UI.fade(() => { enterZone(pt.to, from); checkpoint(); });
        return true;
      }
    }
    if (run && HC.World.interactObjects(p)) return true;
    return false;
  }

  function leaveSaveBoss() {
    const G = HC.G, run = G.run;
    if (!G.boss || G.boss.dead) return;
    if (G.boss.def.kind === 'lord') run.lordHp = G.boss.hp;
    if (G.boss.def.kind === 'calamity') run.calamity.hp = G.boss.hp;
  }

  function toggleRest() {
    const G = HC.G, run = G.run, p = G.player;
    if (run.zone !== 'hub') return;
    const fire = G.zone.objects.find((o) => o.type === 'campfire');
    if (!fire || Math.abs(fire.x - U.cx(p)) > 40) { HC.UI.toast('모닥불 곁에서만 쉴 수 있다', 1.2); return; }
    if (G.enemies.some((e) => !e.dead && e.aggro && U.dist(e.x, e.y, p.x, p.y) < 260)) { HC.UI.toast('적이 가까이 있어 쉴 수 없다', 1.2); return; }
    run.resting = !run.resting;
    if (run.resting) HC.UI.toast('모닥불 곁에서 쉰다. 시간이 빠르게 흐른다. (움직이면 깬다)', 2.5);
  }

  function nextFloor() {
    const G = HC.G, run = G.run;
    if (run.floor >= HC.MAX_FLOOR) return;
    HC.Audio.play('portal');
    HC.UI.fade(() => {
      leaveSaveBoss();
      initFloor(run, run.floor + 1);
      enterZone('hub', null);
      const F = HC.FLOORS[run.floor];
      HC.UI.banner(run.floor + '층 ' + F.n, F.desc, '#c8c0b0', 4);
      HC.UI.log(run.floor + '층 진입');
      HC.Audio.ambience(F.amb);
      checkpoint();
    }, 1.2);
  }

  function tryTalisman() {
    const G = HC.G, p = G.player;
    if (G.save.items.talisman <= 0) { HC.UI.toast('탈출 부적이 없다', 1); return; }
    if (p.talismanT > 0) return;
    if (G.zone.id === 'rift') { HC.UI.toast('열극 안에서는 부적이 듣지 않는다', 1.5); return; }
    p.talismanT = 6;
    HC.UI.toast('탈출 부적에 집중한다… (6초, 맞으면 끊긴다)', 2);
  }
  function escape() {
    const G = HC.G;
    G.save.items.talisman--;
    G.save.stats.escapes = (G.save.stats.escapes || 0) + 1;
    endRun('escape');
  }

  function checkpoint() {
    const G = HC.G, run = G.run;
    if (!run || G.scene !== 'descent') return;
    const snap = Object.assign({}, run);
    snap.hp = G.player ? G.player.hp : null;
    snap.events = [];
    if (snap.zone === 'rift' || snap.zone === 'lair') snap.zone = 'hub';
    G.save.run = JSON.parse(JSON.stringify(snap));
    HC.Game.save();
  }

  // 강하 종료: 'closed'(층이 닫힘), 'escape'(부적), 'death'
  function endRun(reason) {
    const G = HC.G, run = G.run, save = G.save;
    if (!run || run.ended) return;
    run.ended = true;
    const res = {
      reason, floor: run.floor, day: Math.floor(run.t / DAY()) + 1, stones: run.stones, bag: Object.assign({}, run.bag),
      orbs: run.orbs.slice(), relics: run.relics.slice(), exp: run.exp, kills: run.totalKills, log: run.log.slice(), killer: G.player && G.player.lastHitBy,
    };
    if (reason !== 'death') {
      save.stones = (save.stones || 0) + run.stones;
      for (const k in run.bag) save.stash[k] = (save.stash[k] || 0) + run.bag[k];
      for (const o of run.orbs) save.soulOrbs.push(o);
      for (const r of run.relics) if (r) save.relics.push(r);
      save.wounded = false;
      save.potions = Object.assign({}, run.potions);
    } else {
      save.stats.deaths++;
      save.wounded = true;
      const cur = HC.EXP_TABLE[save.level] || 0, nxt = HC.Stats.nextExp(save.level);
      if (isFinite(nxt)) { const loss = Math.round((nxt - cur) * 0.12); save.exp = Math.max(cur, save.exp - loss); res.expLoss = loss; }
      save.potions = { smallPotion: 0, bigPotion: 0 };
    }
    save.run = null;
    save.cycle++;
    HC.Game.save();
    G.run = null;
    HC.Game.toCity(res);
  }

  return { start, enterZone, update, onKill, onObjectBroken, isNight, nearLight, skillsSealed, interact, portalNear, toggleRest, tryTalisman, escape, endRun, checkpoint, awakenLord, lights, spawnBoss, leaveSaveBoss };
})();
