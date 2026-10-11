'use strict';
// 도시 건물·메뉴 패널 (DOM). 패널이 열려 있는 동안 게임은 멈춘다.
HC.Panels = (function () {
  const U = HC.U, E = U.esc;
  let root, cur = null, arg = null;
  const tabs = {};
  let confirmKey = null;
  let flash = null;

  const S = () => HC.G.save;
  const ITEM = (id) => HC.ITEMS[id] || { n: id, col: '#999' };

  function init() {
    root = document.getElementById('panel');
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
  }

  function isOpen() { return !!cur; }

  function open(id, a) {
    cur = id; arg = a; confirmKey = null; flash = null;
    HC.G.paused = true;
    HC.Input.setEnabled(false);
    render();
    root.classList.add('show');
    root.scrollTop = 0;
  }
  function close() {
    if (!cur || cur === 'title') return;
    cur = null; arg = null;
    root.classList.remove('show');
    root.innerHTML = '';
    HC.G.paused = false;
    HC.Input.setEnabled(true);
    HC.UI.dirty = true;
    if (HC.G.player) HC.G.player.statDirty = true;
    HC.Game.save();
  }

  function hotkeys() {
    const I = HC.Input;
    if (I.rawHit('menu')) { if (cur) { if (cur !== 'title') close(); } else open('menu'); return; }
    if (cur && cur !== 'title' && cur !== 'result' && cur !== 'intro') {
      if ((I.rawHit('inv') && cur === 'inv') || (I.rawHit('souls') && cur === 'souls') || (I.rawHit('map') && cur === 'map')) { close(); return; }
    }
    if (cur) return;
    if (HC.G.player && HC.G.player.dead) return;
    if (I.rawHit('inv')) open('inv');
    else if (I.rawHit('souls')) open('souls');
    else if (I.rawHit('map')) open('map');
  }

  // ── 렌더링 ──
  function tabBar(id, list) {
    if (!tabs[id] || !list.some((t) => t[0] === tabs[id])) tabs[id] = list[0][0];
    return '<div class="tabs">' + list.map((t) => '<button class="tab' + (tabs[id] === t[0] ? ' on' : '') + '" data-a="tab" data-v="' + id + ':' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
  }
  function row(title, desc, cost, actions, extra) {
    return '<div class="row' + (extra && extra.cls ? ' ' + extra.cls : '') + '"><div class="row-main"><div class="row-title">' + title + '</div>' +
      (desc ? '<div class="row-desc">' + desc + '</div>' : '') + (cost ? '<div class="row-cost">' + cost + '</div>' : '') + '</div>' +
      '<div class="row-act">' + (actions || '') + '</div></div>';
  }
  function btn(label, a, v, o) {
    o = o || {};
    return '<button class="btn' + (o.cls ? ' ' + o.cls : '') + '"' + (o.dis ? ' disabled' : '') + ' data-a="' + a + '" data-v="' + E(v == null ? '' : v) + '">' + label + '</button>';
  }
  function bar(k, col) { return '<div class="mini-bar"><i style="width:' + (U.clamp(k, 0, 1) * 100).toFixed(1) + '%;background:' + (col || '#b08850') + '"></i></div>'; }
  function modsText(mods) { return Object.keys(mods).map((k) => HC.modText(k, mods[k])).join(', '); }
  function statLine(stats) {
    return Object.keys(stats).map((k) => '<span class="' + (stats[k] >= 0 ? 'pos' : 'neg') + '">' + HC.STATS[k].n + ' ' + (stats[k] >= 0 ? '+' : '') + stats[k] + '</span>').join(' ');
  }

  function render() {
    if (!cur) return;
    const b = BUILD[cur];
    if (!b) { root.innerHTML = ''; return; }
    const o = b(arg);
    if (cur === 'title') { root.className = 'panel show title-mode'; root.innerHTML = o.body; return; }
    root.className = 'panel show' + (o.wide ? ' wide' : '');
    const kron = S() ? '<span class="pk">크론 <b>' + U.fmt(S().kron) + '</b></span><span class="pk">흑석 <b>' + U.fmt(S().stones || 0) + '</b></span>' : '';
    root.innerHTML = '<div class="pbox">' +
      '<header class="phead"><div><h2>' + o.title + '</h2>' + (o.sub ? '<p class="psub">' + o.sub + '</p>' : '') + '</div>' +
      '<div class="pright">' + (o.noRes ? '' : kron) + (o.noClose ? '' : '<button class="xbtn" data-a="close" aria-label="닫기">✕</button>') + '</div></header>' +
      (flash ? '<div class="pflash ' + (flash.bad ? 'bad' : 'good') + '">' + E(flash.msg) + '</div>' : '') +
      '<div class="pbody">' + o.body + '</div></div>';
  }

  function onInput(ev) {
    const t = ev.target;
    if (t.id === 'vol') { HC.Audio.setVolume(Number(t.value) / 100); S().settings.vol = Number(t.value) / 100; }
  }

  function onClick(ev) {
    const t = ev.target.closest('[data-a]');
    if (!t || t.disabled) return;
    const a = t.dataset.a, v = t.dataset.v;
    HC.Audio.unlock();
    HC.Audio.play('ui');
    const f = ACT[a];
    if (!f) return;
    const r = f(v, t);
    if (r && r.msg) flash = { msg: r.msg, bad: r.ok === false || r.bad };
    else if (r === undefined || (r && r.ok)) { /* 유지 */ }
    if (r && r.ok && r.msg) HC.Audio.play(r.bad ? 'fail' : 'success');
    if (r && r.ok === false && r.msg) HC.Audio.play('fail');
    if (cur) render();
    if (S()) { HC.UI.dirty = true; if (HC.G.player) HC.G.player.statDirty = true; }
  }

  // ── 행동 ──
  const ACT = {
    close: () => { close(); },
    tab: (v) => { const [p, t] = v.split(':'); tabs[p] = t; confirmKey = null; flash = null; },
    newgame: () => {
      if (HC.Save.load() && confirmKey !== 'new') { confirmKey = 'new'; return; }
      cur = null; root.classList.remove('show'); HC.Input.setEnabled(true); HC.G.paused = false;
      HC.Audio.unlock();
      HC.Game.newGame();
    },
    cont: () => { cur = null; root.classList.remove('show'); HC.Input.setEnabled(true); HC.G.paused = false; HC.Audio.unlock(); HC.Game.continueGame(); },
    howto: () => { tabs.title = tabs.title === 'howto' ? 'main' : 'howto'; },
    descend: (v) => {
      const f = Number(v);
      const s = S();
      if (confirmKey !== 'desc' + f) {
        const warn = [];
        if (s.wounded) warn.push('중상');
        if ((s.potions.smallPotion || 0) + (s.potions.bigPotion || 0) === 0) warn.push('물약 없음');
        if (warn.length) { confirmKey = 'desc' + f; return { ok: false, msg: '경고: ' + warn.join(', ') + '. 그래도 내려가려면 한 번 더 누른다.' }; }
      }
      HC.Game.toDescent(f);
    },
    sellStones: (v) => HC.Sub.sellStones(v === 'all' ? Infinity : Number(v)),
    sellMat: (v) => { const [id, n] = v.split(':'); return HC.Sub.sellMat(id, n === 'all' ? Infinity : Number(n)); },
    sellOrb: (v) => { if (confirmKey !== 'orb' + v) { confirmKey = 'orb' + v; return; } confirmKey = null; return HC.Sub.sellOrb(Number(v)); },
    sellGear: (v) => { if (confirmKey !== 'gear' + v) { confirmKey = 'gear' + v; return; } confirmKey = null; return HC.Sub.sellGear(v); },
    sellRelic: (v) => { if (confirmKey !== 'rel' + v) { confirmKey = 'rel' + v; return; } confirmKey = null; return HC.Sub.sellRelic(v); },
    buy: (v) => { const [id, n] = v.split(':'); return HC.Sub.buy(id, Number(n)); },
    heal: () => HC.Sub.heal(),
    beltFill: () => { const n = HC.Sub.moveStashPotions(); return { ok: n > 0, msg: n ? '물약 ' + n + '개를 거치대에 꽂았다' : '옮길 물약이 없거나 거치대가 가득 찼다' }; },
    craftW: (v) => { const [t, tier] = v.split(':'); return HC.Sub.craftGear('weapon', t, Number(tier)); },
    craftA: (v) => { const [sl, tier] = v.split(':'); return HC.Sub.craftGear('armor', sl, Number(tier)); },
    craftAcc: (v) => HC.Sub.craftAcc(v),
    enh: (v) => { const r = HC.Sub.enhance(v, !!tabs.protect); return r; },
    protect: () => { tabs.protect = !tabs.protect; },
    tool: (v) => HC.Sub.toolUp(v),
    equip: (v) => HC.Sub.equip(v),
    unequip: (v) => HC.Sub.unequip(v),
    equipRelic: (v) => HC.Sub.equipRelic(v),
    elixir: (v) => HC.Sub.elixirUp(v),
    brew: (v) => HC.Sub.brew(v),
    meal: (v) => HC.Sub.mealUp(v),
    tattoo: (v) => HC.Sub.tattooUp(v),
    statue: (v) => HC.Sub.statueDeposit(v),
    absorb: (v) => { const [from, i] = v.split(':'); return HC.Sub.absorb(from, Number(i)); },
    removeSoul: (v) => { if (confirmKey !== 'rm' + v) { confirmKey = 'rm' + v; return; } confirmKey = null; return HC.Sub.removeSoul(Number(v)); },
    slot: (v) => { const [sl, id] = v.split(':'); HC.Sub.setSlot(Number(sl), id); },
    clearSlot: (v) => { S().skillSlots[Number(v)] = null; HC.UI.dirty = true; },
    pickSlot: (v) => { tabs.pickSlot = Number(v); },
    offer: (v) => { if (confirmKey !== 'off' + v) { confirmKey = 'off' + v; return; } confirmKey = null; return HC.Sub.offer(Number(v)); },
    oathUp: (v) => HC.Sub.oathUp(v),
    oathToggle: (v) => HC.Sub.oathToggle(v),
    hideout: (v) => HC.Sub.hideoutUp(v),
    hire: () => HC.Sub.hire(),
    assign: (v) => { const [site, d] = v.split(':'); return HC.Sub.assign(site, Number(d)); },
    target: (v) => { const [site, id] = v.split(':'); return HC.Sub.setTarget(site, id); },
    manual: (v) => HC.Sub.manual(v),
    hint: (v) => { const [key, c] = v.split('|'); return HC.Sub.buyHint(key, Number(c)); },
    useItem: (v) => useItem(v),
    mute: () => { const m = HC.Audio.toggleMute(); S().settings.muted = m; },
    shake: () => { S().settings.shake = !S().settings.shake; },
    exportSave: () => { tabs.exportStr = HC.Save.exportStr(S()); },
    importSave: () => {
      const ta = document.getElementById('import-box');
      const s = ta && HC.Save.importStr(ta.value);
      if (!s) return { ok: false, msg: '저장 문자열을 읽지 못했다' };
      HC.G.save = s; HC.Game.save(); close(); HC.Game.toCity(null);
      return { ok: true, msg: '불러왔다' };
    },
    wipe: () => {
      if (confirmKey !== 'wipe') { confirmKey = 'wipe'; return; }
      HC.Save.wipe(); location.reload();
    },
    toTitle: () => {
      if (HC.G.scene === 'descent' && HC.G.run) HC.Descent.checkpoint();
      HC.Game.save(); location.reload();
    },
    talisman: () => { close(); HC.Descent.tryTalisman(); },
    travel: (v) => {
      const d = HC.G.zone.doors && HC.G.zone.doors.find((x) => x.id === v);
      if (d) { HC.G.player.x = d.x - HC.G.player.w / 2; HC.Render.updateCamera(HC.G.cam, HC.G.zone, HC.G.player, 0.016, true); close(); open(v); }
    },
    goSite: () => { close(); open('gather'); },
  };

  function useItem(id) {
    const G = HC.G, s = S(), p = G.player;
    if (!s.items[id]) return { ok: false, msg: '없다' };
    if (id === 'torch') {
      if (G.scene !== 'descent') return { ok: false, msg: '나락에서만 쓴다' };
      s.items.torch--; G.run.torchT = HC.DAY_SEC; p.statDirty = true;
      return { ok: true, msg: '횃불을 밝혔다 (하루 동안 시야 +60)' };
    }
    if (id === 'antidote') {
      s.items.antidote--;
      delete p.status.poison; delete p.status.bleed; delete p.status.burn;
      HC.Player.addBuff(p, { id: 'antidote', n: '해독', dur: 8, mods: {}, col: '#80c060' });
      p.st.immune.add('poison');
      setTimeout(() => { if (HC.G.player) HC.G.player.statDirty = true; }, 8000);
      return { ok: true, msg: '해독제를 마셨다' };
    }
    return { ok: false };
  }

  // ── 패널 내용 ──
  const BUILD = {};

  BUILD.title = () => {
    const has = !!HC.Save.load();
    const howto = tabs.title === 'howto';
    return { body:
      '<div class="title-wrap"><div class="title-fog"></div>' +
      '<div class="title-inner">' +
      '<p class="t-eyebrow">하드코어 횡스크롤 생존기</p>' +
      '<h1 class="t-title">나락 강하</h1>' +
      '<p class="t-lead">강하 광장의 석문 아래로 내려가면 층이 닫힐 때까지 버텨야 돌아올 수 있다.<br>거기서 죽으면 가져간 건 전부 나락 몫이 된다.</p>' +
      (!HC.Assets.ready ? '<p class="t-load">그림을 불러오는 중… <span id="load-pct">' + Math.round(HC.Assets.progress * 100) + '%</span></p>' : howto ? controlsHtml() :
        '<div class="t-btns">' +
        (has ? btn('이어하기', 'cont', '', { cls: 'primary' }) : '') +
        btn(confirmKey === 'new' ? '정말 처음부터? 기존 기록이 지워진다' : '새로 시작', 'newgame', '', { cls: has ? (confirmKey === 'new' ? 'danger' : '') : 'primary' }) +
        btn('조작법', 'howto', '') +
        '</div>') +
      (howto ? '<div class="t-btns">' + btn('돌아가기', 'howto', '') + '</div>' : '') +
      '<p class="t-foot">키보드 전용 · 소리는 첫 입력 후 켜진다</p>' +
      '</div></div>' };
  };

  function controlsHtml() {
    return '<div class="controls">' +
      '<div><kbd>←</kbd><kbd>→</kbd> 이동</div><div><kbd>Space</kbd>/<kbd>C</kbd> 점프 · 공중에서 한 번 더</div>' +
      '<div><kbd>↑</kbd><kbd>↓</kbd> 밧줄 오르내리기 · <kbd>↑</kbd> 포탈/문</div><div><kbd>↓</kbd>+<kbd>Space</kbd> 발판 아래로</div>' +
      '<div><kbd>X</kbd> 공격 (연타 시 콤보)</div><div><kbd>Z</kbd>/<kbd>Shift</kbd> 회피 (무적, 기력 소모)</div>' +
      '<div><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><kbd>F</kbd> 영혼 스킬</div><div><kbd>Q</kbd> 물약 · <kbd>T</kbd> 탈출 부적</div>' +
      '<div><kbd>E</kbd> 채집/파내기 · <kbd>R</kbd> 모닥불 휴식</div><div><kbd>I</kbd> 장비·가방 · <kbd>K</kbd> 영혼 · <kbd>M</kbd> 지도 · <kbd>Esc</kbd> 메뉴</div>' +
      '</div>';
  }

  BUILD.intro = () => ({ title: '카르덴', sub: '회색 비가 그치지 않는 도시', noRes: true, body:
    '<div class="prose">' +
    '<p>카르덴 사람들은 나락에서 캐 온 걸로 먹고산다. 도시 오른쪽 끝 강하 광장의 석문을 넘으면 1층 청석 동굴로 떨어진다.</p>' +
    '<p>층은 정해진 날수가 지나면 닫힌다. 그때까지 버틴 사람은 짐을 진 채로 도시에 내던져지고, 버티지 못한 사람은 가진 걸 몽땅 잃고 치료소에서 눈을 뜬다. 몸도 성하지 않아서 다음번엔 체력이 깎인 채로 내려가야 한다.</p>' +
    '<p>몬스터를 잡으면 흑석이 나오고, 운이 좋으면 영혼도 떨어진다. 영혼을 몸에 담으면 그 몬스터의 힘을 얻는데, 달갑지 않은 것까지 딸려 온다. 몇 개까지 담을 수 있는지는 레벨에 달렸다.</p>' +
    '<p>내려가기 전에 잡화점에서 물약부터 챙겨라. 손이 덜 풀렸으면 왼쪽 훈련 인형이라도 두들기고.</p>' +
    '</div>' + controlsHtml() + '<div class="t-btns">' + btn('나간다', 'close', '', { cls: 'primary' }) + '</div>' });

  BUILD.offline = (o) => {
    const gains = Object.keys(o.gains).map((k) => ITEM(k).n + ' ' + U.fmt(o.gains[k])).join(', ') || '없음 (일꾼을 배치하지 않았다)';
    return { title: '자리를 비운 사이', sub: U.fmtTime(o.sec) + (o.capped ? ' (저장고 한도 ' + HC.Sub.idleCapH() + '시간까지만)' : ''), body:
      '<div class="prose"><p>일꾼들이 쉬지 않고 일했다.</p><p><b>' + E(gains) + '</b></p></div><div class="t-btns">' + btn('확인', 'close', '', { cls: 'primary' }) + '</div>' };
  };

  BUILD.result = (r) => {
    const reasonTxt = { closed: '층이 닫혔다. 나락이 당신을 도시로 뱉어냈다.', escape: '탈출 부적이 타오르고, 당신은 도시의 돌바닥 위에 쓰러져 있었다.', death: '당신은 나락에서 죽었다. 눈을 떴을 때는 도시의 치료소였다.' }[r.reason];
    const lost = r.reason === 'death';
    const bagTxt = Object.keys(r.bag).map((k) => ITEM(k).n + ' ' + r.bag[k]).join(', ') || '없음';
    const orbCount = {};
    for (const o of r.orbs) { const n = HC.World.soulName(o.id, o.color); orbCount[n] = (orbCount[n] || 0) + 1; }
    const orbTxt = Object.keys(orbCount).map((n) => n + (orbCount[n] > 1 ? ' ×' + orbCount[n] : '')).join(', ') || '없음';
    const relTxt = r.relics.filter(Boolean).map((id) => 'No.' + HC.RELICS[id].no + ' ' + HC.RELICS[id].n).join(', ');
    return { title: lost ? '사망' : r.reason === 'escape' ? '탈출' : '귀환', sub: r.floor + '층 · ' + r.day + '일차 · 처치 ' + r.kills, body:
      '<div class="prose result ' + (lost ? 'lost' : '') + '"><p>' + reasonTxt + (lost && r.killer ? ' (' + E(r.killer) + ')' : '') + '</p>' +
      '<dl class="kv"><dt>흑석</dt><dd>' + (lost ? '<s>' + U.fmt(r.stones) + '</s> 잃음' : U.fmt(r.stones)) + '</dd>' +
      '<dt>재료</dt><dd>' + (lost ? '<s>' + E(bagTxt) + '</s>' : E(bagTxt)) + '</dd>' +
      '<dt>영혼 구슬</dt><dd>' + (lost ? '<s>' + E(orbTxt) + '</s>' : E(orbTxt)) + '</dd>' +
      (relTxt ? '<dt>각인 유물</dt><dd>' + (lost ? '<s>' + E(relTxt) + '</s>' : E(relTxt)) + '</dd>' : '') +
      '<dt>경험치</dt><dd>+' + U.fmt(r.exp) + (r.expLoss ? ' · 사망으로 -' + U.fmt(r.expLoss) : '') + '</dd></dl>' +
      (r.log && r.log.length ? '<div class="loglist">' + r.log.slice(-8).map((l) => '<div>' + E(l) + '</div>').join('') + '</div>' : '') +
      (lost ? '<p class="warn">중상: 다음 강하에서 최대 체력 -25%. 잡화점에서 치료할 수 있다. 물약도 모두 잃었다.</p>' : '<p>흑석은 교환소에서 크론으로 바꾼다. 영혼 구슬은 영혼 제단에서 흡수하거나 바칠 수 있다.</p>') +
      '</div><div class="t-btns">' + btn('확인', 'close', '', { cls: 'primary' }) + '</div>' };
  };

  // 강하 광장
  BUILD.descent = () => {
    const s = S();
    let h = '<div class="prose"><p>거대한 석문 안에서 소용돌이가 돈다. 어느 층으로 내려갈지 정한다. 한 번 닿은 층부터는 바로 내려갈 수 있다.</p></div>';
    const belt = (s.potions.smallPotion || 0) + (s.potions.bigPotion || 0);
    h += '<div class="checks">' +
      '<span class="' + (belt ? 'ok' : 'no') + '">물약 ' + belt + '/' + HC.Sub.stats().belt + '</span>' +
      '<span class="' + (s.wounded ? 'no' : 'ok') + '">' + (s.wounded ? '중상 (최대 체력 -25%)' : '몸 상태 양호') + '</span>' +
      '<span class="' + (s.skillSlots.some(Boolean) ? 'ok' : 'mid') + '">영혼 스킬 ' + s.skillSlots.filter(Boolean).length + '/4</span>' +
      '<span>탈출 부적 ' + (s.items.talisman || 0) + '</span><span>횃불 ' + (s.items.torch || 0) + '</span>' + (s.items.battleTonic ? '<span class="ok">투지의 영약 (자동 사용)</span>' : '') +
      '</div>';
    for (let f = 1; f <= HC.MAX_FLOOR; f++) {
      const F = HC.FLOORS[f];
      const open = f <= s.maxFloor;
      const lord = HC.getMob(F.lord.id), cal = HC.getMob(F.calamity.id);
      const lk = s.flags.lordKilled[f] || 0, ck = s.flags.calamityKilled[f] || 0;
      const info = F.grade + ' · ' + F.days + '일 뒤 닫힘<br>' + E(F.desc) +
        '<br><span class="dim">층주 ' + (s.seen[lord.id] ? E(lord.n) : '???') + (lk ? ' (처치 ' + lk + ')' : '') + ' · 재앙 ' + (s.seen[cal.id] ? E(cal.n) : '???') + (ck ? ' (처치 ' + ck + ')' : '') + '</span>';
      h += row('<span class="floor-no">' + f + '층</span> ' + E(F.n), info, null, open ? btn(confirmKey === 'desc' + f ? '그래도 강하' : '강하', 'descend', f, { cls: confirmKey === 'desc' + f ? 'danger' : 'primary' }) : '<span class="lock">아직 닿지 못했다</span>', { cls: open ? '' : 'locked' });
    }
    return { title: '강하 광장', sub: '주기 ' + s.cycle + ' · 지금까지 ' + s.stats.descents + '번 내려갔고 ' + s.stats.deaths + '번 죽었다', body: h };
  };

  // 교환소
  BUILD.exchange = () => {
    const s = S();
    let h = tabBar('exchange', [['stone', '흑석'], ['mat', '재료'], ['orb', '영혼 구슬'], ['gear', '장비'], ['relic', '각인 유물']]);
    const t = tabs.exchange;
    if (t === 'stone') {
      const g = HC.Stats.grade(s).grade;
      h += '<div class="prose"><p>흑석 1개당 <b>' + HC.Sub.stoneRate() + ' 크론</b>. 탐색자 등급이 높을수록 줄도 짧고 값도 좋다. (현재 ' + g + '등급)</p></div>';
      h += row('보유 흑석 ' + U.fmt(s.stones || 0) + '개', null, null, btn('100개', 'sellStones', 100, { dis: (s.stones || 0) < 100 }) + btn('전부 팔기', 'sellStones', 'all', { cls: 'primary', dis: !s.stones }));
    } else if (t === 'mat') {
      const ids = Object.keys(s.stash).filter((k) => s.stash[k] > 0 && HC.ITEMS[k]);
      if (!ids.length) h += '<p class="empty">창고가 비었다.</p>';
      for (const id of ids) {
        const it = ITEM(id);
        h += row('<i class="dot" style="background:' + it.col + '"></i>' + E(it.n) + ' <span class="cnt">×' + U.fmt(s.stash[id]) + '</span>', E(it.d || ''), '개당 ' + U.fmt(it.sell != null ? it.sell : it.price) + ' 크론',
          btn('1개', 'sellMat', id + ':1') + btn('전부', 'sellMat', id + ':all'));
      }
    } else if (t === 'orb') {
      if (!s.soulOrbs.length) h += '<p class="empty">흡수하지 않은 영혼 구슬이 없다.</p>';
      s.soulOrbs.forEach((o, i) => {
        const d = HC.getMob(o.id);
        h += row('<i class="dot" style="background:' + d.soul.colors[o.color].hex + '"></i>' + E(HC.World.soulName(o.id, o.color)), d.grade + '등급', U.fmt(HC.Sub.orbPrice(o)) + ' 크론', btn(confirmKey === 'orb' + i ? '정말 판다' : '팔기', 'sellOrb', i, { cls: confirmKey === 'orb' + i ? 'danger' : '' }));
      });
    } else if (t === 'gear') {
      if (!s.gear.length) h += '<p class="empty">보관 중인 장비가 없다. (착용 중인 장비는 팔 수 없다)</p>';
      for (const g of s.gear) h += row(E(HC.Gear.name(g)), null, U.fmt(HC.Gear.sellPrice(g)) + ' 크론', btn(confirmKey === 'gear' + g.uid ? '정말 판다' : '팔기', 'sellGear', g.uid, { cls: confirmKey === 'gear' + g.uid ? 'danger' : '' }));
    } else {
      if (!s.relics.length) h += '<p class="empty">보관 중인 각인 유물이 없다.</p>';
      for (const id of s.relics) { const r = HC.RELICS[id]; h += row('No.' + r.no + ' ' + E(r.n), E(r.d), '25,000 크론', btn(confirmKey === 'rel' + id ? '정말 넘긴다' : '넘기기', 'sellRelic', id, { cls: confirmKey === 'rel' + id ? 'danger' : '' })); }
    }
    return { title: '교환소', sub: '나락에서 가져온 것은 여기서 돈이 된다', body: h };
  };

  // 잡화점
  BUILD.shop = () => {
    const s = S(), st = HC.Sub.stats();
    const g = HC.Stats.grade(s).grade;
    const belt = (s.potions.smallPotion || 0) + (s.potions.bigPotion || 0);
    let h = '<div class="checks"><span>물약 거치대 ' + belt + '/' + st.belt + '</span>' + ((s.stash.smallPotion || s.stash.bigPotion) ? '<span>창고의 물약 ' + ((s.stash.smallPotion || 0) + (s.stash.bigPotion || 0)) + '</span>' : '') + '</div>';
    if (s.stash.smallPotion || s.stash.bigPotion) h += row('창고의 물약을 거치대로', null, null, btn('옮기기', 'beltFill', ''));
    for (const e of HC.SHOP) {
      const it = ITEM(e.id);
      const locked = e.grade && g > e.grade;
      const have = it.cat === 'potion' ? (s.potions[e.id] || 0) : (s.items[e.id] || 0);
      h += row('<i class="dot" style="background:' + it.col + '"></i>' + E(it.n) + ' <span class="cnt">보유 ' + have + '</span>', E(it.d), U.fmt(it.price) + ' 크론' + (locked ? ' · ' + e.grade + '등급 이상' : ''),
        locked ? '<span class="lock">등급 부족</span>' : btn('1개', 'buy', e.id + ':1') + (it.price < 500 ? btn('5개', 'buy', e.id + ':5') : ''));
    }
    h += '<h3 class="sec">치료</h3>';
    h += row('상처 꿰매기', s.wounded ? '중상을 치료한다. 치료하지 않으면 다음 강하를 무사히 마칠 때까지 남는다.' : '다친 데가 없다.', s.wounded ? U.fmt(HC.Sub.healCost()) + ' 크론' : null, btn('치료', 'heal', '', { dis: !s.wounded }));
    return { title: '잡화점', sub: '물약, 해독제, 횃불, 그리고 비싼 탈출 부적', body: h };
  };

  // 대장간
  BUILD.smith = () => {
    const s = S();
    let h = tabBar('smith', [['weapon', '무기 제작'], ['armor', '방어구 제작'], ['acc', '장신구'], ['enh', '강화'], ['tool', '채집 도구']]);
    const t = tabs.smith;
    const maxTier = Math.min(5, s.maxFloor + 1);
    if (t === 'weapon') {
      h += '<div class="prose"><p>무기 종류마다 손맛이 다르다. 대검은 느리고 넓게, 쌍단검은 빠르게, 창은 길게, 철퇴는 단단한 적에게.</p></div>';
      for (let tier = 1; tier <= maxTier; tier++) {
        h += '<h3 class="sec">' + HC.TIERS[tier].n + ' (' + tier + '단계)</h3>';
        const c = HC.smithCost('weapon', tier);
        for (const type in HC.WTYPES) {
          const W = HC.WTYPES[type];
          const dmg = Math.round(HC.TIERS[tier].w * W.dmg);
          h += row(E(HC.TIERS[tier].n + ' ' + W.n), '공격력 ' + dmg + ' · 속도 ×' + W.spd + ' · 사거리 ' + W.reach + ' · ' + E(W.d), HC.Sub.costText(c.mats, c.kron), btn('제작', 'craftW', type + ':' + tier, { dis: !HC.Sub.has(c.mats, c.kron) }));
        }
      }
    } else if (t === 'armor') {
      for (let tier = 1; tier <= maxTier; tier++) {
        h += '<h3 class="sec">' + HC.TIERS[tier].n + ' (' + tier + '단계)</h3>';
        const c = HC.smithCost('armor', tier);
        for (const sl in HC.ASLOTS) {
          const m = HC.Gear.mods({ kind: 'armor', slot: sl, tier, enh: 0 });
          h += row(E(HC.TIERS[tier].n + ' ' + HC.ASLOTS[sl].n), modsText(m), HC.Sub.costText(c.mats, c.kron), btn('제작', 'craftA', sl + ':' + tier, { dis: !HC.Sub.has(c.mats, c.kron) }));
        }
      }
    } else if (t === 'acc') {
      for (const id in HC.ACCS) {
        const A = HC.ACCS[id];
        h += row(E(A.n) + ' <span class="tag">' + (A.slot === 'ring' ? '반지' : '목걸이') + '</span>', modsText(A.mods), HC.Sub.costText(A.cost, A.kron), btn('제작', 'craftAcc', id, { dis: !HC.Sub.has(A.cost, A.kron) }));
      }
    } else if (t === 'enh') {
      h += '<div class="prose"><p>강화 단계마다 장비 능력 +8%. +4부터는 실패하면 단계가 떨어지고, +7부터는 실패할 때 30% 확률로 부서진다. 열극석을 쓰면 실패해도 아무 일도 없다.</p></div>';
      h += row('열극석 보호 ' + (tabs.protect ? '<b class="pos">켜짐</b>' : '꺼짐'), '보유 열극석 ' + (s.stash.riftStone || 0), null, btn(tabs.protect ? '끄기' : '켜기', 'protect', ''));
      const list = [];
      for (const k in s.equip) if (s.equip[k] && typeof s.equip[k] === 'object') list.push([s.equip[k], k]);
      for (const g of s.gear) list.push([g, null]);
      for (const [g, slot] of list) {
        const tier = g.kind === 'acc' ? 4 : g.tier;
        const c = HC.enhCost({ tier, enh: g.enh });
        const mats = { [c.ore]: c.n }; if (tabs.protect) mats.riftStone = 1;
        h += row(E(HC.Gear.name(g)) + (slot ? ' <span class="tag on">착용</span>' : ''), g.enh >= 10 ? '최대 강화' : '성공 확률 ' + Math.round(HC.ENH_RATE[g.enh] * 100) + '%', g.enh >= 10 ? null : HC.Sub.costText(mats, c.kron), btn('강화', 'enh', g.uid, { dis: g.enh >= 10 || !HC.Sub.has(mats, c.kron) }));
      }
    } else {
      for (const site in HC.GATHER) {
        const g = s.sub.gather[site], def = HC.GATHER[site];
        const c = HC.toolCost(g.tool);
        h += row(E(def.tool) + ' +' + g.tool, def.n + ' 채집량 +' + g.tool * 25 + '% → +' + (g.tool + 1) * 25 + '%', g.tool >= 8 ? '최고 단계' : HC.Sub.costText({ [c.mat]: c.n }, c.kron), btn('개량', 'tool', site, { dis: g.tool >= 8 || !HC.Sub.has({ [c.mat]: c.n }, c.kron) }));
      }
    }
    return { title: '대장간', sub: '망치 소리가 비보다 크다', body: h, wide: true };
  };

  BUILD.alchemy = () => {
    const s = S();
    let h = tabBar('alchemy', [['elixir', '영약 솥'], ['brew', '양조']]);
    if (tabs.alchemy === 'elixir') {
      h += '<div class="prose"><p>솥에 재료를 부어 영약을 끓인다. 한 번 끓인 영약의 기운은 몸에 영원히 남는다.</p></div>';
      for (const e of HC.ELIXIRS) {
        const lv = s.sub.elixirs[e.id] || 0;
        const locked = s.maxFloor < e.floor;
        const c = HC.elixirCost(e, lv);
        h += row(E(e.n) + ' <span class="cnt">' + lv + '/' + e.max + '</span>', HC.modText(e.k, e.per * lv) + ' → ' + HC.modText(e.k, e.per * (lv + 1)) + bar(lv / e.max, '#70b080'),
          locked ? e.floor + '층 재료 필요' : lv >= e.max ? '완성' : HC.Sub.costText(c.mats, c.kron), btn('끓이기', 'elixir', e.id, { dis: locked || lv >= e.max || !HC.Sub.has(c.mats, c.kron) }));
      }
    } else {
      for (const b of HC.BREWS) {
        const it = ITEM(b.id);
        h += row(E(it.n) + ' ×' + b.out, E(it.d), HC.Sub.costText(b.mats, b.kron), btn('양조', 'brew', b.id, { dis: !HC.Sub.has(b.mats, b.kron) }));
      }
    }
    return { title: '연금 공방', sub: '썩은 살점도 끓이면 약이 된다', body: h };
  };

  BUILD.cook = () => {
    const s = S();
    let h = '<div class="prose"><p>먹은 것은 몸이 기억한다. 요리 단계가 오를 때마다 영구적인 힘이 붙는다. 재료는 우물과 나락에서 구한다.</p></div>';
    for (const m of HC.MEALS) {
      const lv = s.sub.meals[m.id] || 0;
      const c = HC.mealCost(m, lv);
      h += row(E(m.n) + ' <span class="cnt">' + lv + '/' + HC.MEAL_MAX + '</span>', HC.modText(m.k, m.per * lv) + ' → ' + HC.modText(m.k, m.per * (lv + 1)) + bar(lv / HC.MEAL_MAX, '#c08050'),
        lv >= HC.MEAL_MAX ? '완성' : HC.Sub.costText(c, 0), btn('요리', 'meal', m.id, { dis: lv >= HC.MEAL_MAX || !HC.Sub.has(c, 0) }));
    }
    return { title: '취사장', sub: '연기가 낮게 깔린다', body: h };
  };

  BUILD.tattoo = () => {
    const s = S();
    let h = '<div class="prose"><p>살갗에 피로 새기는 문양. 기본 혈문 넷 말고는 이형이 떨어뜨리는 혈문 도안이 있어야 새길 수 있다.</p></div>';
    for (const t of HC.TATTOOS) {
      const lv = s.sub.tattoos[t.id] || 0;
      const un = HC.Sub.tattooUnlocked(t);
      const c = HC.tattooCost(t, lv);
      const mats = { [t.mat]: c.n }; if (t.design && lv === 0) mats[t.design] = 1;
      h += row(E(t.n) + ' <span class="cnt">' + lv + '/' + HC.TATTOO_MAX + '</span>', HC.modText(t.k, t.per * lv) + ' → ' + HC.modText(t.k, t.per * (lv + 1)),
        !un ? '도안 필요: ' + ITEM(t.design).n : lv >= HC.TATTOO_MAX ? '완성' : HC.Sub.costText(mats, c.kron), btn('새기기', 'tattoo', t.id, { dis: !un || lv >= HC.TATTOO_MAX || !HC.Sub.has(mats, c.kron) }), { cls: un ? '' : 'locked' });
    }
    return { title: '혈문 각인소', sub: '바늘이 뼈에 닿는 소리', body: h };
  };

  BUILD.statue = () => {
    const s = S();
    let h = '<div class="prose"><p>나락에서 죽은 이들의 위령비. 몬스터가 드물게 떨어뜨리는 위령 파편을 바치면 위령비가 당신을 굽어본다.</p></div>';
    for (const st of HC.STATUES) {
      const lv = s.sub.statues[st.id] || 0;
      const need = HC.Sub.statueNeed(lv);
      h += row(E(st.n) + ' <span class="cnt">' + lv + '/' + HC.STATUE_MAX + '</span>', HC.modText(st.k, st.per * lv) + (st.k2 ? ', ' + HC.modText(st.k2, st.per * lv) : '') + bar(lv / HC.STATUE_MAX, '#9090a8'),
        lv >= HC.STATUE_MAX ? '완성' : HC.Sub.costText({ [st.frag]: need }, 0), btn('바치기', 'statue', st.id, { dis: lv >= HC.STATUE_MAX || !HC.Sub.has({ [st.frag]: need }, 0) }));
    }
    return { title: '위령비 광장', sub: '이름 없는 석상들이 줄지어 서 있다', body: h };
  };

  function soulCard(so, i, removable) {
    const d = HC.getMob(so.id);
    const c = d.soul.colors[so.color] || d.soul.colors[0];
    const P = HC.PASSIVES[d.soul.passive];
    const acts = HC.soulActives(so).map((a) => '<b>' + E(HC.SKILLS[a].n) + '</b> (' + E(HC.SKILLS[a].d) + ' 재사용 ' + HC.SKILLS[a].cd + '초)').join('<br>');
    const cost = HC.Sub.soulRemoveCost(so);
    return row('<i class="dot" style="background:' + c.hex + '"></i>' + E(HC.World.soulName(so.id, so.color)) + ' <span class="tag">' + d.grade + '등급</span>',
      statLine(d.soul.stats) + '<br>패시브 <b>' + E(P.n) + '</b>: ' + E(P.d) + '<br>액티브 ' + acts, removable ? '지우기 ' + U.fmt(cost) + ' 크론' : null,
      removable ? btn(confirmKey === 'rm' + i ? '정말 지운다' : '지우기', 'removeSoul', i, { cls: confirmKey === 'rm' + i ? 'danger' : '' }) : '');
  }
  function orbRow(o, i, from, canOffer) {
    const d = HC.getMob(o.id);
    const c = d.soul.colors[o.color] || d.soul.colors[0];
    const P = HC.PASSIVES[d.soul.passive];
    const acts = HC.soulActives(o).map((a) => E(HC.SKILLS[a].n)).join(', ');
    const dup = S().souls.some((x) => x.id === o.id);
    return row('<i class="dot" style="background:' + c.hex + '"></i>' + E(HC.World.soulName(o.id, o.color)) + ' <span class="tag">' + d.grade + '등급</span>',
      statLine(d.soul.stats) + '<br>패시브 ' + E(P.n) + ' · 액티브 ' + acts + (dup ? '<br><span class="neg">같은 몬스터의 영혼을 이미 담고 있다</span>' : ''), null,
      btn('흡수', 'absorb', from + ':' + i, { cls: 'primary', dis: dup }) + (canOffer ? btn(confirmKey === 'off' + i ? '정말 바친다' : '바치기 (+' + HC.faithFor(d.grade) + ')', 'offer', i, { cls: confirmKey === 'off' + i ? 'danger' : '' }) : ''));
  }
  function skillSlotsHtml() {
    const s = S();
    const avail = HC.Sub.availableSkills();
    const keys = ['A', 'S', 'D', 'F'];
    let h = '<div class="slots-edit">';
    for (let i = 0; i < 4; i++) {
      const id = s.skillSlots[i];
      const sk = id && HC.SKILLS[id];
      h += '<button class="slot-e' + (tabs.pickSlot === i ? ' on' : '') + '" data-a="pickSlot" data-v="' + i + '" style="--c:' + (sk ? sk.col : '#444') + '"><kbd>' + keys[i] + '</kbd>' + (sk ? E(sk.n) : '비어 있음') + '</button>';
    }
    h += '</div>';
    if (tabs.pickSlot != null) {
      h += '<p class="hint">' + keys[tabs.pickSlot] + ' 슬롯에 넣을 스킬을 고른다.</p><div class="pick">';
      for (const a of avail) h += btn(E(HC.SKILLS[a].n), 'slot', tabs.pickSlot + ':' + a, { cls: s.skillSlots[tabs.pickSlot] === a ? 'on' : '' });
      h += btn('비우기', 'clearSlot', tabs.pickSlot) + '</div>';
    }
    if (!avail.length) h += '<p class="empty">흡수한 영혼이 없어 쓸 수 있는 스킬이 없다.</p>';
    return h;
  }

  BUILD.altar = () => {
    const s = S();
    let h = tabBar('altar', [['soul', '영혼'], ['orb', '보관 중인 구슬'], ['skill', '스킬 슬롯'], ['oath', '서약']]);
    const t = tabs.altar;
    if (t === 'soul') {
      h += '<div class="prose"><p>담은 영혼 <b>' + s.souls.length + '/' + s.level + '</b>. 레벨이 오를 때마다 한 칸씩 늘어난다. 영혼을 지우면 그 영혼은 사라진다.</p></div>';
      if (!s.souls.length) h += '<p class="empty">아직 아무 영혼도 담지 않았다.</p>';
      s.souls.forEach((so, i) => { h += soulCard(so, i, true); });
    } else if (t === 'orb') {
      h += '<div class="prose"><p>흡수하지 않은 영혼 구슬. 흡수해도 되고, 제단에 바쳐 신앙으로 바꿔도 된다. 서약은 신앙으로 맺는다.</p></div>';
      if (!s.soulOrbs.length) h += '<p class="empty">보관 중인 구슬이 없다.</p>';
      s.soulOrbs.forEach((o, i) => { h += orbRow(o, i, 'save', true); });
    } else if (t === 'skill') {
      h += skillSlotsHtml();
    } else {
      const slots = 1 + (s.sub.hideout.shrine || 0);
      h += '<div class="prose"><p>신앙 <b>' + U.fmt(s.sub.faith) + '</b> · 동시에 맺을 수 있는 서약 ' + slots + '개. 서약은 축복과 저주를 함께 준다.</p></div>';
      for (const o of HC.OATHS) {
        const lv = s.sub.oaths[o.id] || 0;
        const on = s.sub.oathEquip.includes(o.id);
        const good = Object.keys(o.good).map((k) => k === 'killHeal' ? '처치 시 체력 ' + Math.round((o.good[k][0] + o.good[k][1] * Math.max(0, lv - 1)) * 1000) / 10 + '% 회복' : HC.modText(k, o.good[k][0] + o.good[k][1] * Math.max(0, lv - 1))).join(', ');
        const bad = Object.keys(o.bad).map((k) => k === 'mobAtk' ? '몬스터 공격력 +' + o.bad[k] * 100 + '%' : k === 'noRegen' ? '재생 불가' : HC.modText(k, o.bad[k])).join(', ');
        const cost = lv === 0 ? o.unlock : HC.oathLvCost(lv);
        h += row(E(o.n) + (lv ? ' <span class="cnt">' + lv + '/' + HC.OATH_MAX + '</span>' : '') + (on ? ' <span class="tag on">맺음</span>' : ''), '<span class="pos">' + good + '</span><br><span class="neg">' + bad + '</span>',
          lv >= HC.OATH_MAX ? null : '신앙 ' + cost, (lv < HC.OATH_MAX ? btn(lv ? '깊게 하기' : '배우기', 'oathUp', o.id, { dis: s.sub.faith < cost }) : '') + (lv ? btn(on ? '거두기' : '맺기', 'oathToggle', o.id, { cls: on ? '' : 'primary' }) : ''));
      }
    }
    return { title: '영혼 제단', sub: '영혼을 담고, 지우고, 바친다', body: h, wide: true };
  };

  BUILD.souls = () => {
    const G = HC.G, s = S();
    let h = tabBar('souls', [['orb', '구슬'], ['soul', '담은 영혼'], ['skill', '스킬 슬롯']]);
    const t = tabs.souls;
    const inRun = G.scene === 'descent' && G.run;
    if (t === 'orb') {
      const list = inRun ? G.run.orbs : s.soulOrbs;
      h += '<div class="prose"><p>담은 영혼 <b>' + s.souls.length + '/' + s.level + '</b>. ' + (inRun ? '이번 강하에서 주운 구슬이다. 죽으면 흡수하지 않은 구슬은 사라진다.' : '보관 중인 구슬.') + '</p></div>';
      if (!list.length) h += '<p class="empty">구슬이 없다.</p>';
      list.forEach((o, i) => { h += orbRow(o, i, inRun ? 'run' : 'save', false); });
    } else if (t === 'soul') {
      if (!s.souls.length) h += '<p class="empty">아직 아무 영혼도 담지 않았다.</p>';
      s.souls.forEach((so, i) => { h += soulCard(so, i, false); });
    } else h += skillSlotsHtml();
    return { title: '영혼', sub: '영혼에 새겨진 것들', body: h, wide: true };
  };

  BUILD.inv = () => {
    const G = HC.G, s = S();
    const inRun = G.scene === 'descent' && G.run;
    let h = tabBar('inv', [['equip', '장비'], ['bag', inRun ? '가방' : '창고'], ['use', '소모품'], ['stat', '능력치']]);
    const t = tabs.inv;
    if (t === 'equip') {
      const names = { weapon: '무기', helm: '투구', body: '갑옷', gloves: '장갑', boots: '장화', ring: '반지', neck: '목걸이', relic1: '유물 1', relic2: '유물 2' };
      for (const k in names) {
        const g = s.equip[k];
        let nm = '—', desc = '';
        if (g && (k === 'relic1' || k === 'relic2')) { const r = HC.RELICS[g]; nm = 'No.' + r.no + ' ' + r.n; desc = r.d; }
        else if (g) { nm = HC.Gear.name(g); desc = g.kind === 'weapon' ? '공격력 ' + Math.round(HC.Gear.weaponDmg(g)) + ' · ' + HC.WTYPES[g.type].d : modsText(HC.Gear.mods(g)); }
        h += row('<span class="slotname">' + names[k] + '</span> ' + E(nm), E(desc), null, g && !inRun && k !== 'weapon' ? btn('벗기', 'unequip', k) : '');
      }
      if (!inRun) {
        h += '<h3 class="sec">보관 중인 장비</h3>';
        if (!s.gear.length) h += '<p class="empty">없다. 대장간에서 만든다.</p>';
        for (const g of s.gear) h += row(E(HC.Gear.name(g)), g.kind === 'weapon' ? '공격력 ' + Math.round(HC.Gear.weaponDmg(g)) + ' · ' + HC.WTYPES[g.type].d : modsText(HC.Gear.mods(g)), null, btn('착용', 'equip', g.uid, { cls: 'primary' }));
        if (s.relics.length) {
          h += '<h3 class="sec">보관 중인 각인 유물</h3>';
          for (const id of s.relics) { const r = HC.RELICS[id]; h += row('No.' + r.no + ' ' + E(r.n), E(r.d), null, btn('착용', 'equipRelic', id, { cls: 'primary' })); }
        }
      } else h += '<p class="hint">장비는 도시에서만 바꿀 수 있다.</p>';
    } else if (t === 'bag') {
      const bag = inRun ? G.run.bag : s.stash;
      const ids = Object.keys(bag).filter((k) => bag[k] > 0);
      if (inRun) h += '<div class="prose"><p>가방 ' + ids.length + '/' + G.player.st.bag + '칸 · 흑석 ' + U.fmt(G.run.stones) + ' · 영혼 구슬 ' + G.run.orbs.length + (G.run.relics.length ? ' · 각인 유물 ' + G.run.relics.length : '') + '. 죽으면 전부 잃는다.</p></div>';
      if (!ids.length) h += '<p class="empty">비었다.</p>';
      h += '<div class="grid-items">' + ids.map((k) => { const it = ITEM(k); return '<div class="gi" title="' + E(it.d || '') + '"><i class="dot" style="background:' + it.col + '"></i>' + E(it.n) + ' <b>' + U.fmt(bag[k]) + '</b></div>'; }).join('') + '</div>';
    } else if (t === 'use') {
      const belt = inRun ? G.run.potions : s.potions;
      h += row('붉은 물약 ×' + (belt.smallPotion || 0) + ' · 진한 붉은 물약 ×' + (belt.bigPotion || 0), 'Q로 마신다. 체력이 40% 아래면 진한 물약부터.', null, '');
      for (const id of ['antidote', 'torch', 'talisman', 'battleTonic']) {
        const it = ITEM(id);
        const n = s.items[id] || 0;
        let act = '';
        if (inRun && n && (id === 'antidote' || id === 'torch')) act = btn('사용', 'useItem', id, { cls: 'primary' });
        if (inRun && n && id === 'talisman') act = btn('집중 시작', 'talisman', '', { cls: 'danger' });
        h += row(E(it.n) + ' ×' + n, E(it.d), null, act);
      }
    } else {
      const st = G.player ? G.player.st : HC.Sub.stats();
      let tb = '<table class="stats"><tbody>';
      for (const k of HC.STAT_ORDER) tb += '<tr><th>' + HC.STATS[k].n + '</th><td>' + Math.round(st.s[k]) + '</td><td class="dim">' + E(HC.STATS[k].d) + '</td></tr>';
      tb += '</tbody></table>';
      const d = [
        ['최대 체력', st.maxHp], ['기력', st.maxSta], ['무기 공격력', Math.round(st.atk)], ['물리 배율', '×' + st.physMult.toFixed(2)], ['스킬 배율', '×' + st.skillMult.toFixed(2)],
        ['공격 속도', '×' + st.aspd.toFixed(2)], ['치명타', (st.crit * 100).toFixed(1) + '% / ×' + st.critDmg.toFixed(2)], ['회피율', (st.dodge * 100).toFixed(1) + '%'],
        ['물리 피해 감소', (st.physDR * 100).toFixed(1) + '%'], ['마법 피해 감소', (st.magDR * 100).toFixed(1) + '%'], ['상태이상 저항', (st.statusRes * 100).toFixed(0) + '%'],
        ['방어 관통', Math.round(st.pen)], ['초당 재생', st.regen.toFixed(1)], ['회복 배율', '×' + st.heal.toFixed(2)], ['시야', Math.round(st.vision)], ['흡혈', (st.lifesteal * 100).toFixed(1) + '%'],
      ];
      tb += '<table class="stats derived"><tbody>' + d.map((x) => '<tr><th>' + x[0] + '</th><td>' + x[1] + '</td></tr>').join('') + '</tbody></table>';
      h += tb;
    }
    return { title: inRun ? '장비 · 가방' : '장비 · 창고', sub: 'Lv.' + s.level + ' · ' + HC.Stats.grade(s).grade + '등급 탐색자', body: h, wide: t === 'stat' };
  };

  BUILD.guild = () => {
    const s = S();
    const gr = HC.Stats.grade(s);
    let h = tabBar('guild', [['me', '탐색자'], ['cards', '사냥 장부'], ['info', '정보상'], ['rec', '기록']]);
    const t = tabs.guild;
    if (t === 'me') {
      const nextG = HC.GRADES.find((g) => g.g === gr.grade - 1);
      const cur = HC.EXP_TABLE[s.level] || 0, nxt = HC.Stats.nextExp(s.level);
      h += '<dl class="kv big">' +
        '<dt>탐색자 등급</dt><dd>' + gr.grade + '등급 <span class="dim">(영혼량 ' + gr.q + (nextG ? ' · 다음 등급까지 ' + (nextG.need - gr.q) : '') + ')</span></dd>' +
        '<dt>레벨</dt><dd>' + s.level + (isFinite(nxt) ? ' <span class="dim">(' + U.fmt(s.exp - cur) + ' / ' + U.fmt(nxt - cur) + ')</span>' : ' (최고)') + bar(isFinite(nxt) ? (s.exp - cur) / (nxt - cur) : 1, '#d0b070') + '</dd>' +
        '<dt>영혼 슬롯</dt><dd>' + s.souls.length + ' / ' + s.level + '</dd>' +
        '<dt>최고 도달</dt><dd>' + s.maxFloor + '층</dd>' +
        '<dt>강하 / 사망 / 탈출</dt><dd>' + s.stats.descents + ' / ' + s.stats.deaths + ' / ' + (s.stats.escapes || 0) + '</dd></dl>' +
        '<div class="prose"><p>등급은 몸에 담은 영혼이 얼마나 무거운지로 정해진다. 강한 놈의 영혼일수록 훨씬 무겁다. 등급이 오르면 교환소 시세가 좋아지고 잡화점도 더 좋은 물건을 꺼내 온다.</p></div>';
    } else if (t === 'cards') {
      h += '<div class="prose"><p>잡은 수만큼 그 몬스터를 안다. 별이 오를 때마다 영구 보너스가 붙는다.</p></div>';
      for (let f = 1; f <= HC.MAX_FLOOR; f++) {
        const mobs = Object.values(HC.MOBS).filter((m) => m.floor === f && m.card && s.seen[m.id]);
        if (!mobs.length) continue;
        h += '<h3 class="sec">' + f + '층 · ' + HC.FLOORS[f].n + '</h3><div class="cards">';
        for (const m of mobs) {
          const k = s.kills[m.id] || 0;
          const st = HC.Stats.cardStars(m.id, k);
          const steps = HC.cardSteps(m.kind);
          const nxt = steps[st];
          h += '<div class="card k-' + m.kind + '"><div class="c-n">' + E(m.n) + '</div><div class="c-s">' + '★'.repeat(st) + '<span class="dim">' + '☆'.repeat(4 - st) + '</span></div>' +
            '<div class="c-b">' + HC.modText(m.card.k, m.card.v * Math.max(1, st)) + (st ? '' : ' (★1부터)') + '</div><div class="c-k">처치 ' + U.fmt(k) + (nxt ? ' / ' + nxt : '') + '</div></div>';
        }
        h += '</div>';
      }
    } else if (t === 'info') {
      h += '<div class="prose"><p>정보상이 낡은 수첩을 넘긴다. "공짜는 없어." 이미 마주친 것들은 저절로 적혀 있다.</p></div>';
      for (let f = 1; f <= Math.min(HC.MAX_FLOOR, s.maxFloor); f++) {
        const F = HC.FLOORS[f];
        h += '<h3 class="sec">' + f + '층 · ' + F.n + '</h3>';
        const items = F.elites.map((el) => ({ key: 'elite_' + el.id, n: '이형: ' + (s.seen[el.id] ? HC.getMob(el.id).n : '???'), hint: el.hint, cost: 150 * f * f }));
        items.push({ key: 'lord_' + f, n: '층주: ' + (s.seen[F.lord.id] ? HC.getMob(F.lord.id).n : '???'), hint: F.lord.hint, cost: 400 * f * f });
        items.push({ key: 'cal_' + f, n: '층의 재앙: ' + (s.seen[F.calamity.id] ? HC.getMob(F.calamity.id).n : '???'), hint: F.calamity.hint, cost: 800 * f * f });
        items.push({ key: 'rift_' + f, n: '열극: ' + F.rift.n, hint: F.rift.hint, cost: 300 * f * f });
        for (const it of items) {
          const known = s.hints[it.key] || (it.key.startsWith('elite_') && s.seen[it.key.slice(6)]);
          h += row(E(it.n), known ? E(it.hint) : '<span class="dim">알려지지 않았다</span>', known ? null : U.fmt(it.cost) + ' 크론', known ? '' : btn('산다', 'hint', it.key + '|' + it.cost, { dis: s.kron < it.cost }));
        }
      }
    } else {
      for (let f = 1; f <= HC.MAX_FLOOR; f++) {
        const F = HC.FLOORS[f];
        h += row(f + '층 · ' + E(F.n), '층주 처치 ' + (s.flags.lordKilled[f] || 0) + ' · 재앙 처치 ' + (s.flags.calamityKilled[f] || 0) + ' · 파수꾼 처치 ' + (s.flags.guardianKilled[f] || 0), null, '');
      }
    }
    return { title: '탐색자 길드', sub: '등급, 장부, 그리고 돈 받고 파는 소문', body: h, wide: true };
  };

  BUILD.gather = () => {
    const s = S(), w = s.sub.workers;
    let h = '<div class="prose"><p>일꾼을 채집지에 보내 두면 자리를 비운 사이에도 일한다 (저장고 한도 ' + HC.Sub.idleCapH() + '시간). 직접 일하면 45초마다 한 번 더 얻는다.</p></div>';
    h += row('일꾼 ' + w.hired + '/' + HC.Sub.workerCap() + ' · 배치 ' + HC.Sub.assigned() + ' · 쉬는 일꾼 ' + (w.hired - HC.Sub.assigned()), null, w.hired < HC.Sub.workerCap() ? '고용 ' + U.fmt(HC.workerCost(w.hired)) + ' 크론' : '숙소가 가득 찼다', btn('고용', 'hire', '', { dis: w.hired >= HC.Sub.workerCap() || s.kron < HC.workerCost(w.hired) }));
    for (const site in HC.GATHER) {
      const def = HC.GATHER[site], g = s.sub.gather[site];
      const rate = HC.Sub.siteRate(site);
      const n = w[site] || 0;
      const left = Math.max(0, 45 - (Date.now() - (g.manualAt || 0)) / 1000);
      h += '<div class="site"><div class="site-h"><h3>' + E(def.n) + '</h3><span>' + def.verb + ' 숙련 ' + g.lv + '</span>' + bar(g.exp / HC.gatherExpNeed(g.lv), '#80a0c0') + '</div>';
      h += '<div class="res">' + def.res.map((r) => btn(E(ITEM(r.id).n) + (g.lv < r.lv ? ' (숙련 ' + r.lv + ')' : ''), 'target', site + ':' + r.id, { cls: g.target === r.id ? 'on' : '', dis: g.lv < r.lv })).join('') + '</div>';
      h += '<div class="site-f"><span>일꾼 ' + n + '명 · 분당 ' + (rate * n).toFixed(1) + '개 (1명당 ' + rate.toFixed(2) + ')</span>' +
        btn('−', 'assign', site + ':-1', { dis: n <= 0 }) + btn('+', 'assign', site + ':1', { dis: HC.Sub.assigned() >= w.hired }) +
        btn(left > 0 ? '직접 ' + def.verb + ' (' + Math.ceil(left) + '초)' : '직접 ' + def.verb, 'manual', site, { dis: left > 0, cls: 'primary' }) + '</div></div>';
    }
    return { title: '채집 게시판', sub: '폐갱도, 고사목 숲, 검은 우물', body: h, wide: true };
  };

  BUILD.hideout = () => {
    const s = S();
    let h = '<div class="prose"><p>쥐가 들끓는 반지하 은신처. 손을 볼수록 살 만해진다.</p></div>';
    for (const x of HC.HIDEOUT) {
      const lv = s.sub.hideout[x.id] || 0;
      const c = x.cost(lv);
      const kron = Math.floor(c.kron || 0);
      const mats = Object.assign({}, c); delete mats.kron;
      h += row(E(x.n) + ' <span class="cnt">' + lv + '/' + x.max + '</span>', E(x.d), lv >= x.max ? '완성' : HC.Sub.costText(mats, kron), btn('공사', 'hideout', x.id, { dis: lv >= x.max || !HC.Sub.has(mats, kron) }));
    }
    return { title: '은신처', sub: '당신의 유일한 안전지대', body: h };
  };

  BUILD.map = () => {
    const G = HC.G;
    if (G.scene === 'city') {
      let h = '<div class="prose"><p>건물로 곧장 간다.</p></div><div class="pick">';
      for (const b of HC.City.BUILDINGS) h += btn(E(b.n), 'travel', b.id);
      h += '</div>';
      return { title: '카르덴 지도', body: h };
    }
    const run = G.run, F = HC.FLOORS[run.floor];
    const cell = (zid) => {
      const here = run.zone === zid || (run.zone === 'lair' && zid === 'hub') || (run.zone === 'rift' && run.rift.returnZone === zid);
      const marks = [];
      if (run.calamity.state === 'active' && run.calamity.zone === zid) marks.push('<span class="m-cal">재앙</span>');
      if (run.rift.state === 'open' && run.rift.zone === zid) marks.push('<span class="m-rift">열극</span>');
      return '<div class="mz' + (here ? ' here' : '') + '"><b>' + E(HC.World.zoneName(run.floor, zid)) + '</b>' + marks.join('') + (here ? '<span class="m-you">현재 위치</span>' : '') + '</div>';
    };
    const h = '<div class="fmap">' +
      '<div class="fm-n">' + cell('N2') + cell('N1') + '</div>' +
      '<div class="fm-mid">' + cell('W2') + cell('W1') + '<div class="mz hub' + (run.zone === 'hub' || run.zone === 'lair' ? ' here' : '') + '"><b>' + E(F.hub) + '</b>' + (run.lordAwake ? '<span class="m-lord">층주의 제단 열림</span>' : '') + (run.zone === 'hub' || run.zone === 'lair' ? '<span class="m-you">현재 위치</span>' : '') + '</div>' + cell('E1') + cell('E2') + '</div>' +
      '<div class="fm-s">' + cell('S1') + cell('S2') + '</div></div>' +
      '<div class="prose"><p>네 갈래 가장 깊은 곳 중 한 곳에만 ' + (run.floor < HC.MAX_FLOOR ? (run.floor + 1) + '층으로 가는 포탈 비석이 열려 있다. 나머지는 돌덩이다.' : '비석이 있지만, 더 깊은 곳은 아직 열리지 않았다.') + '</p></div>';
    return { title: run.floor + '층 · ' + F.n, sub: '처치 ' + run.floorKills + ' · ' + (Math.floor(run.t / HC.DAY_SEC) + 1) + '일차', body: h, wide: true };
  };

  BUILD.menu = () => {
    const s = S(), G = HC.G;
    let h = tabBar('menu', [['main', '메뉴'], ['keys', '조작법'], ['save', '저장']]);
    const t = tabs.menu;
    if (t === 'main') {
      h += '<div class="t-btns col">' + btn('계속하기', 'close', '', { cls: 'primary' }) + '</div>';
      h += row('음량', '<input type="range" id="vol" min="0" max="100" value="' + Math.round(HC.Audio.volume * 100) + '" aria-label="음량">', null, btn(HC.Audio.muted ? '소리 켜기' : '음소거', 'mute', ''));
      h += row('화면 흔들림', null, null, btn(s.settings.shake ? '켜짐' : '꺼짐', 'shake', ''));
      if (G.scene === 'descent') h += row('강하 중단', '지금 상태를 저장하고 제목 화면으로 나간다. 다시 들어오면 이 층의 강하 지점에서 이어간다.', null, btn('제목으로', 'toTitle', ''));
      else h += row('제목 화면', null, null, btn('제목으로', 'toTitle', ''));
    } else if (t === 'keys') h += controlsHtml();
    else {
      h += '<div class="prose"><p>저장은 이 브라우저에 자동으로 된다. 다른 곳으로 옮기려면 문자열로 내보낸다.</p></div>';
      h += row('내보내기', tabs.exportStr ? '<textarea class="ta" readonly>' + E(tabs.exportStr) + '</textarea>' : null, null, btn('문자열 만들기', 'exportSave', ''));
      h += row('불러오기', '<textarea id="import-box" class="ta" placeholder="저장 문자열을 붙여넣는다"></textarea>', null, btn('불러오기', 'importSave', ''));
      h += row('기록 삭제', '모든 진행이 사라진다.', null, btn(confirmKey === 'wipe' ? '정말 지운다' : '삭제', 'wipe', '', { cls: 'danger' }));
    }
    return { title: '메뉴', body: h };
  };

  function title(hasSave) {
    cur = 'title';
    HC.G.paused = true;
    HC.Input.setEnabled(false);
    render();
    root.classList.add('show');
  }

  function loading(k) { const el = document.getElementById('load-pct'); if (el) el.textContent = Math.round(k * 100) + '%'; }

  return { init, open, close, render, hotkeys, title, loading, isOpen, get cur() { return cur; } };
})();
