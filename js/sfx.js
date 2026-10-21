/* TT Dumpling Shop: the shop's sounds, all synthesised through Kit.sound (kit/sound.js), so the one mute switch covers
   them. A pentatonic ding for each step keeps it sounding like a festival. */
(function () {
  'use strict';
  const DS = window.DS;
  const S = Kit.sound;
  const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319];
  const note = (i, o) => S.tone(Object.assign({ type: 'triangle', f: PENTA[Math.max(0, Math.min(PENTA.length - 1, i))], dur: 0.16, vol: 0.12 }, o));

  DS.sfx = {
    roll(k) { S.hiss({ filter: 'lowpass', f: 900, to: 300, dur: 0.12, vol: 0.18 }); S.tone({ f: 120 + 60 * k, to: 90, dur: 0.08, vol: 0.12 }); },
    fill() { S.tone({ f: 300, to: 620, dur: 0.1, vol: 0.14 }); S.tone({ f: 200, to: 120, dur: 0.12, vol: 0.12, at: 0.06 }); },
    pinch(k) { note(Math.round(k * 4), { dur: 0.08, vol: 0.09, type: 'square', lp: 2200 }); },
    made(n) { note(2 + n); note(4 + n, { at: 0.08 }); },
    oops() { S.tone({ type: 'square', f: 220, to: 160, dur: 0.18, vol: 0.06, lp: 900 }); },
    cook(kind) {
      if (kind === 'fry') S.hiss({ filter: 'highpass', f: 3000, to: 6000, dur: 0.9, vol: 0.14, attack: 0.02 });
      else if (kind === 'steam') S.hiss({ f: 1600, to: 800, dur: 0.6, vol: 0.12, attack: 0.08 });
      else { S.tone({ f: 500, to: 180, dur: 0.18, vol: 0.18 }); S.hiss({ filter: 'lowpass', f: 1200, to: 300, dur: 0.3, vol: 0.14 }); }
    },
    ready() { note(5, { type: 'sine', vol: 0.18, dur: 0.3 }); note(7, { type: 'sine', vol: 0.16, dur: 0.4, at: 0.14 }); },
    serve(streak) { S.coin(streak || 0); },
    lucky() { [0, 2, 4, 5, 7].forEach((n, i) => note(n, { at: i * 0.08, vol: 0.16, dur: 0.22 })); S.powerup(); },
    arrive() { note(6, { type: 'sine', vol: 0.1, dur: 0.5 }); note(4, { type: 'sine', vol: 0.08, dur: 0.6, at: 0.12 }); },
    bye(kind) { if (kind === 'left') S.tone({ f: 330, to: 220, dur: 0.3, vol: 0.08 }); else { note(4, { vol: 0.08 }); note(2, { vol: 0.08, at: 0.1 }); } },
    busy() { S.tone({ type: 'square', f: 300, dur: 0.06, vol: 0.05 }); S.tone({ type: 'square', f: 300, dur: 0.06, vol: 0.05, at: 0.1 }); },
    buddy() { S.powerup(); },
    five() { S.hiss({ filter: 'highpass', f: 1800, dur: 0.08, vol: 0.4 }); S.tone({ f: 900, to: 1400, dur: 0.12, vol: 0.1 }); },
    open() { [0, 2, 4, 7].forEach((n, i) => note(n, { at: i * 0.1, vol: 0.14 })); },
    win(stars) { [0, 2, 4, 5, 7, 7].slice(0, 3 + stars).forEach((n, i) => note(n, { at: i * 0.12, vol: 0.16, dur: 0.25 })); },
    buy() { S.coin(4); S.powerup(); },
  };
})();
