'use strict';
// HUD (DOM). 체력/기력/경험치, 스킬 슬롯, 층 시간, 보스 체력, 배너, 토스트.
HC.UI = (function () {
  const U = HC.U;
  const $ = (id) => document.getElementById(id);
  let el = {};
  let toasts = [];
  let bannerT = 0;
  let zoneT = 0;
  let boss = null;
  let flashA = 0;
  const logLines = [];

  function init() {
    el = {
      hud: $('hud'), hp: $('hp-fill'), hpLag: $('hp-lag'), hpTxt: $('hp-txt'), sta: $('sta-fill'), exp: $('exp-fill'), lvl: $('lvl'),
      shield: $('shield-fill'), status: $('status'), buffs: $('buffs'),
      clock: $('clock'), floorName: $('floor-name'), events: $('events'),
      res: $('res'), skills: $('skills'), potion: $('potion'),
      bossWrap: $('boss'), bossName: $('boss-name'), bossFill: $('boss-fill'), bossLag: $('boss-lag'), bossTag: $('boss-tag'),
      banner: $('banner'), bannerT: $('banner-title'), bannerS: $('banner-sub'),
      toasts: $('toasts'), zone: $('zone-name'), flash: $('dmg-flash'), fade: $('fade'), log: $('log'),
      death: $('death'), deathSub: $('death-sub'), err: $('err'), keys: $('keys'),
    };
    el.lagHp = 1; el.lagBoss = 1;
  }

  function setW(node, k) { node.style.width = (U.clamp(k, 0, 1) * 100).toFixed(2) + '%'; }

  function update(dt) {
    const G = HC.G, p = G.player;
    if (!p || !p.st) return;
    const st = p.st;
    el.hud.classList.toggle('hidden', G.scene === 'title');
    const hpk = p.hp / st.maxHp;
    setW(el.hp, hpk);
    el.lagHp = el.lagHp > hpk ? Math.max(hpk, el.lagHp - dt * 0.5) : hpk;
    setW(el.hpLag, el.lagHp);
    el.hpTxt.textContent = Math.ceil(p.hp) + ' / ' + st.maxHp;
    el.hp.parentNode.classList.toggle('low', hpk < 0.3);
    setW(el.sta, p.sta / st.maxSta);
    setW(el.shield, p.shield / st.maxHp);
    const s = G.save;
    const cur = HC.EXP_TABLE[s.level] || 0, nxt = HC.Stats.nextExp(s.level);
    setW(el.exp, isFinite(nxt) ? (s.exp - cur) / (nxt - cur) : 1);
    // 상태이상
    let sh = '';
    for (const k in p.status) {
      const nm = { poison: '중독', bleed: '출혈', burn: '화상', slow: '둔화' }[k] || k;
      sh += '<span class="st st-' + k + '">' + nm + ' ' + p.status[k].t.toFixed(0) + '</span>';
    }
    if (p.fear > 0) sh += '<span class="st st-fear">공포 ' + p.fear + '/9</span>';
    if (G.run && G.run.lordAwake && G.run.lordField === 'abyssFog') sh += '<span class="st ' + (HC.Descent.skillsSealed(p) ? 'st-seal' : 'st-ok') + '">' + (HC.Descent.skillsSealed(p) ? '영혼 봉인' : '빛 속') + '</span>';
    if (G.save.wounded) sh += '<span class="st st-wound">중상</span>';
    if (p.talismanT > 0) sh += '<span class="st st-tal">탈출 집중 ' + p.talismanT.toFixed(1) + '</span>';
    if (el.status._h !== sh) { el.status.innerHTML = sh; el.status._h = sh; }
    let bh = '';
    for (const b of p.buffs) bh += '<span class="buff" style="--c:' + (b.col || '#fff') + '">' + U.esc(b.n || b.id) + ' ' + b.t.toFixed(0) + '</span>';
    if (el.buffs._h !== bh) { el.buffs.innerHTML = bh; el.buffs._h = bh; }

    // 층 시간
    if (G.scene === 'descent' && G.run) {
      const run = G.run, F = HC.FLOORS[run.floor];
      const day = Math.floor(run.t / HC.DAY_SEC) + 1;
      const frac = (run.t % HC.DAY_SEC) / HC.DAY_SEC;
      const hh = Math.floor(frac * 24), mm = Math.floor((frac * 24 - hh) * 60);
      const night = HC.Descent.isNight();
      const left = run.closeAt - run.t;
      const leftTxt = left > HC.DAY_SEC ? Math.floor(left / HC.DAY_SEC) + '일 ' + Math.floor((left % HC.DAY_SEC) / HC.DAY_SEC * 24) + '시간' : Math.floor(left / HC.DAY_SEC * 24) + '시간';
      el.floorName.textContent = run.floor + '층 · ' + F.n;
      const ck = day + '일차 ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + (night ? ' · 밤' : '') + (run.resting ? ' · 휴식 ×12' : '');
      el.clock.innerHTML = U.esc(ck) + ' <span class="close' + (left < HC.DAY_SEC ? ' urgent' : '') + '">닫히기까지 ' + leftTxt + '</span>';
      let ev = '';
      if (run.lordAwake) ev += '<span class="ev ev-lord">층주 각성 · 잠식</span>';
      if (run.calamity.state === 'active') ev += '<span class="ev ev-cal">재앙 · ' + U.esc(HC.World.zoneName(run.floor, run.calamity.zone)) + '</span>';
      if (run.rift.state === 'open') ev += '<span class="ev ev-rift">열극 · ' + U.esc(HC.World.zoneName(run.floor, run.rift.zone)) + '</span>';
      if (run.weather) ev += '<span class="ev ev-weather">잿바람</span>';
      if (el.events._h !== ev) { el.events.innerHTML = ev; el.events._h = ev; }
    } else {
      el.floorName.textContent = '카르덴';
      el.clock.textContent = '주기 ' + G.save.cycle + ' · 도시';
      if (el.events._h !== '') { el.events.innerHTML = ''; el.events._h = ''; }
    }
    if (HC.UI.dirty) { HC.UI.dirty = false; renderSlots(); }
    // 스킬 쿨다운
    for (let i = 0; i < 4; i++) {
      const node = el.skills.children[i];
      if (!node) continue;
      const id = G.save.skillSlots[i];
      const sk = id && HC.SKILLS[id];
      const cdEl = node.querySelector('.cd');
      if (sk && p.skillCd[i] > 0) { cdEl.style.height = (p.skillCd[i] / (sk.cd * (1 - st.cdr)) * 100) + '%'; cdEl.textContent = p.skillCd[i] >= 1 ? Math.ceil(p.skillCd[i]) : ''; }
      else { cdEl.style.height = '0%'; cdEl.textContent = ''; }
      node.classList.toggle('sealed', G.scene === 'descent' && HC.Descent.skillsSealed(p));
    }
    // 보스 바
    if (boss) {
      if (boss.dead && boss.deathT > 0.5) bossBar(null);
      else {
        const k = Math.max(0, boss.hp / boss.maxHp);
        setW(el.bossFill, k);
        el.lagBoss = el.lagBoss > k ? Math.max(k, el.lagBoss - dt * 0.25) : k;
        setW(el.bossLag, el.lagBoss);
      }
    }
    // 배너
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) el.banner.classList.remove('show'); }
    if (zoneT > 0) { zoneT -= dt; if (zoneT <= 0) el.zone.classList.remove('show'); }
    // 토스트
    for (let i = toasts.length - 1; i >= 0; i--) {
      toasts[i].t -= dt;
      if (toasts[i].t <= 0) { toasts[i].node.remove(); toasts.splice(i, 1); }
      else if (toasts[i].t < 0.3) toasts[i].node.style.opacity = toasts[i].t / 0.3;
    }
    // 피격 섬광
    if (flashA > 0) { flashA = Math.max(0, flashA - dt * 1.6); el.flash.style.opacity = flashA; }
    const lowHp = hpk < 0.25 && !p.dead;
    el.flash.classList.toggle('pulse', lowHp);
  }

  function renderSlots() {
    const G = HC.G, s = G.save, p = G.player;
    let h = '';
    const keys = ['A', 'S', 'D', 'F'];
    for (let i = 0; i < 4; i++) {
      const id = s.skillSlots[i];
      const sk = id && HC.SKILLS[id];
      h += '<div class="slot' + (sk ? '' : ' empty') + '" style="--c:' + (sk ? sk.col : '#333') + '" title="' + (sk ? U.esc(sk.n + ' — ' + sk.d) : '빈 슬롯') + '">' +
        '<span class="key">' + keys[i] + '</span><span class="nm">' + (sk ? U.esc(sk.n) : '—') + '</span><div class="cd"></div></div>';
    }
    el.skills.innerHTML = h;
    const belt = G.scene === 'descent' && G.run ? G.run.potions : s.potions;
    el.potion.innerHTML = '<span class="key">Q</span> 물약 <b>' + (belt.smallPotion || 0) + '</b>' + (belt.bigPotion ? ' · 진한 <b>' + belt.bigPotion + '</b>' : '') +
      (s.items.talisman ? ' <span class="sep">|</span> <span class="key">T</span> 부적 <b>' + s.items.talisman + '</b>' : '');
    // 자원
    if (G.scene === 'descent' && G.run) {
      const run = G.run;
      const slots = Object.keys(run.bag).filter((k) => run.bag[k] > 0).length;
      el.res.innerHTML = '<span class="r-stone">흑석 <b>' + U.fmt(run.stones) + '</b></span><span>영혼 <b>' + run.orbs.length + '</b></span><span>가방 <b>' + slots + '/' + (p ? p.st.bag : 0) + '</b></span>';
    } else {
      el.res.innerHTML = '<span class="r-kron">크론 <b>' + U.fmt(s.kron) + '</b></span><span class="r-stone">흑석 <b>' + U.fmt(s.stones || 0) + '</b></span><span>영혼 구슬 <b>' + s.soulOrbs.length + '</b></span>';
    }
    el.lvl.textContent = 'Lv.' + s.level + ' · ' + HC.Stats.grade(s).grade + '등급';
  }

  function banner(title, sub, col, dur) {
    el.bannerT.textContent = title;
    el.bannerS.textContent = sub || '';
    el.banner.style.setProperty('--c', col || '#e0d0b0');
    el.banner.classList.remove('show');
    void el.banner.offsetWidth;
    el.banner.classList.add('show');
    bannerT = dur || 2.5;
  }
  function toast(msg, dur) {
    if (toasts.length && toasts[toasts.length - 1].msg === msg) { toasts[toasts.length - 1].t = dur || 1.5; return; }
    const n = document.createElement('div');
    n.className = 'toast';
    n.textContent = msg;
    el.toasts.appendChild(n);
    toasts.push({ node: n, t: dur || 1.5, msg });
    if (toasts.length > 4) { toasts[0].node.remove(); toasts.shift(); }
  }
  function log(msg) {
    logLines.push(msg);
    if (logLines.length > 5) logLines.shift();
    el.log.innerHTML = logLines.map((l) => '<div>' + U.esc(l) + '</div>').join('');
    if (HC.G.run) HC.G.run.log.push(msg);
  }
  function zoneName(n) { el.zone.textContent = n; el.zone.classList.remove('show'); void el.zone.offsetWidth; el.zone.classList.add('show'); zoneT = 2.5; }
  function bossBar(e) {
    boss = e;
    if (!e) { el.bossWrap.classList.remove('show'); return; }
    el.bossName.textContent = e.def.n;
    el.bossTag.textContent = { lord: '층주', calamity: '층의 재앙', guardian: '열극의 파수꾼', elite: '이형' }[e.def.kind] || '';
    el.bossWrap.dataset.kind = e.def.kind;
    el.bossWrap.classList.add('show');
    el.lagBoss = e.hp / e.maxHp;
  }
  function flashDamage(a) { flashA = Math.max(flashA, a); el.flash.style.opacity = flashA; }
  function fade(cb, dur) {
    const f = el.fade;
    f.classList.add('on');
    HC.G.cutscene = true;
    setTimeout(() => {
      try { cb(); } catch (e) { console.error(e); error(e); }
      setTimeout(() => { f.classList.remove('on'); HC.G.cutscene = false; }, 120);
    }, (dur || 0.5) * 400);
  }
  function death(by) {
    el.deathSub.textContent = by ? by + '에게 쓰러졌다.' : '나락에서 쓰러졌다.';
    el.death.classList.add('show');
    setTimeout(() => el.death.classList.remove('show'), 3200);
  }
  function error(e) {
    el.err.textContent = '오류: ' + (e && e.message ? e.message : e);
    el.err.classList.add('show');
    setTimeout(() => el.err.classList.remove('show'), 6000);
  }

  return { init, update, banner, toast, log, zoneName, bossBar, flashDamage, fade, death, error, renderSlots, dirty: true };
})();
