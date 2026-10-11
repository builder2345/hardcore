'use strict';
// WebAudio 합성 효과음. 외부 음원 없이 노이즈·저음 위주로 묵직한 타격감을 만든다.
HC.Audio = (function () {
  let ctx = null, master = null, sfxGain = null, ambGain = null;
  let noiseBuf = null;
  let vol = 0.6, muted = false;
  let amb = null, pending = null;
  const last = {};

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : vol; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(comp);
    ambGain = ctx.createGain(); ambGain.gain.value = 0.25; ambGain.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function unlock() {
    const fresh = !ctx;
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (fresh && ctx && pending && !muted) ambience(pending);
  }

  function throttle(name, ms) {
    const t = performance.now();
    if (last[name] && t - last[name] < ms) return true;
    last[name] = t;
    return false;
  }

  function noise(dur, freq, q, gain, type, when) {
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq; f.Q.value = q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
    return f;
  }
  function tone(type, f0, f1, dur, gain, when) {
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  const S = {
    swing(heavy) { if (throttle('swing', 40)) return; noise(heavy ? 0.22 : 0.14, heavy ? 900 : 1600, 0.8, heavy ? 0.35 : 0.25, 'bandpass'); },
    hit(crit) {
      if (throttle('hit', 25)) return;
      tone('sine', crit ? 160 : 120, 40, 0.18, 0.7);
      noise(0.12, crit ? 2600 : 1800, 1, 0.5, 'lowpass');
      if (crit) tone('square', 900, 300, 0.08, 0.12);
    },
    hurt() { tone('sawtooth', 180, 60, 0.25, 0.35); noise(0.2, 600, 1, 0.5); },
    heavyHurt() { tone('sine', 80, 30, 0.5, 0.9); noise(0.4, 400, 0.7, 0.7); },
    kill() { if (throttle('kill', 40)) return; noise(0.35, 500, 0.6, 0.35); tone('sine', 90, 35, 0.3, 0.4); },
    jump() { if (throttle('jump', 60)) return; noise(0.08, 900, 1, 0.12, 'highpass'); },
    land() { if (throttle('land', 80)) return; noise(0.08, 300, 1, 0.2); },
    dash() { noise(0.18, 2200, 0.5, 0.25, 'bandpass'); },
    pickup() { if (throttle('pick', 50)) return; tone('triangle', 900, 1300, 0.08, 0.15); },
    soul() { tone('sine', 300, 900, 0.6, 0.35); tone('triangle', 450, 1350, 0.6, 0.2, 0.08); },
    levelup() { [0, 0.1, 0.2, 0.32].forEach((w, i) => tone('triangle', 260 * (1 + i * 0.25), 270 * (1 + i * 0.25), 0.4, 0.2, w)); },
    portal() { tone('sine', 120, 600, 0.7, 0.3); noise(0.6, 1200, 2, 0.15, 'bandpass'); },
    roar() { tone('sawtooth', 70, 40, 1.4, 0.6); noise(1.4, 300, 0.5, 0.6); tone('square', 55, 35, 1.2, 0.25); },
    alarm() { [0, 0.5, 1.0].forEach((w) => { tone('sine', 55, 50, 0.45, 0.8, w); noise(0.4, 200, 1, 0.4, 'lowpass', w); }); },
    telegraph() { if (throttle('tele', 90)) return; tone('triangle', 500, 700, 0.07, 0.07); },
    block() { tone('square', 700, 500, 0.06, 0.12); },
    potion() { tone('sine', 500, 300, 0.3, 0.2); noise(0.25, 800, 3, 0.1, 'bandpass'); },
    ui() { if (throttle('ui', 40)) return; tone('triangle', 660, 640, 0.05, 0.08); },
    fail() { tone('square', 200, 90, 0.35, 0.2); },
    success() { tone('triangle', 520, 780, 0.25, 0.2); tone('triangle', 780, 1040, 0.3, 0.15, 0.1); },
    explode() { noise(0.6, 400, 0.6, 0.8); tone('sine', 70, 25, 0.6, 0.8); },
    projectile() { if (throttle('proj', 60)) return; noise(0.12, 2000, 2, 0.12, 'bandpass'); },
    death() { tone('sawtooth', 220, 30, 2.2, 0.5); noise(2.0, 300, 0.4, 0.5); },
    step() { if (throttle('step', 230)) return; noise(0.05, 220, 1, 0.07); },
    break() { noise(0.3, 1800, 0.6, 0.4); tone('triangle', 1200, 400, 0.2, 0.1); },
  };

  // 층별 저음 드론
  function ambience(kind) {
    if (!ctx) return;
    stopAmbience();
    const cfg = {
      city: [55, 82.4, 'sine', 300],
      f1: [41.2, 61.7, 'sine', 220],
      f2: [46.2, 69.3, 'triangle', 180],
      f3: [36.7, 55, 'sine', 160],
      f4: [49, 73.4, 'triangle', 260],
      lord: [32.7, 34.6, 'sawtooth', 120],
      rift: [43.6, 46.2, 'sawtooth', 150],
    }[kind];
    if (!cfg) return;
    const nodes = [];
    const g = ctx.createGain(); g.gain.value = 0; g.connect(ambGain);
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + 2);
    for (const f of [cfg[0], cfg[1]]) {
      const o = ctx.createOscillator(); o.type = cfg[2]; o.frequency.value = f;
      const lf = ctx.createOscillator(); lf.frequency.value = 0.07 + Math.random() * 0.05;
      const lg = ctx.createGain(); lg.gain.value = f * 0.02;
      lf.connect(lg); lg.connect(o.frequency);
      const og = ctx.createGain(); og.gain.value = 0.12;
      const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cfg[3];
      o.connect(fl); fl.connect(og); og.connect(g);
      o.start(); lf.start();
      nodes.push(o, lf);
    }
    // 바람/동굴 공기 소리
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = kind === 'city' ? 900 : 350; nf.Q.value = 0.6;
    const ng = ctx.createGain(); ng.gain.value = kind === 'city' ? 0.12 : 0.06;
    src.connect(nf); nf.connect(ng); ng.connect(g); src.start();
    nodes.push(src);
    amb = { g, nodes };
  }
  function stopAmbience() {
    if (!amb || !ctx) return;
    const a = amb; amb = null;
    a.g.gain.cancelScheduledValues(ctx.currentTime);
    a.g.gain.setValueAtTime(a.g.gain.value, ctx.currentTime);
    a.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
    setTimeout(() => { for (const n of a.nodes) { try { n.stop(); } catch (e) { /* 무시 */ } } a.g.disconnect(); }, 1200);
  }

  return {
    unlock,
    play(name, arg) { if (!ctx || muted) return; const f = S[name]; if (f) f(arg); },
    ambience(kind) { pending = kind; if (!muted) ambience(kind); },
    stopAmbience,
    setVolume(v) { vol = v; if (master) master.gain.value = muted ? 0 : vol; },
    get volume() { return vol; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : vol;
      if (!muted && !amb && pending) ambience(pending);
      return muted;
    },
    get muted() { return muted; },
  };
})();
