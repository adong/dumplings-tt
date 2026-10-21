/* TT Dumpling Shop: the little pictures on the buttons and order cards, drawn on a canvas (no image files).
   DS.icons.get(key) returns a PNG data URL: the shapes (crescent, pleats, ingot, ball, bun, roll), the steps (pin, knead,
   pinch), the cookers (boil, steam, fry), sesame, the lucky coin. DS.icons.html(key) gives an <img> or the emoji. */
(function () {
  'use strict';
  const DS = window.DS;
  const D = DS.data;
  const INK = '#14121f', DOUGH = '#fbf2dc', DOUGH2 = '#ead9b4';
  const cache = {};

  function pen(g, w) { g.lineWidth = w || 6; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round'; }
  function blob(g, fill, path) { g.beginPath(); path(); g.fillStyle = fill; g.fill(); g.stroke(); }

  // a crescent: round on top, a flat curved bottom; `pleats` draws folds along the top
  function crescent(g, pleats, gold) {
    pen(g);
    blob(g, gold ? '#ffe9a6' : DOUGH, () => {
      g.moveTo(14, 84);
      g.bezierCurveTo(20, 18, 108, 18, 114, 84);
      g.bezierCurveTo(90, 100, 38, 100, 14, 84);
    });
    // the sealed edge
    g.beginPath();
    g.moveTo(22, 76);
    g.bezierCurveTo(30, 30, 98, 30, 106, 76);
    g.lineWidth = 3;
    g.strokeStyle = gold ? '#d9a63a' : DOUGH2;
    g.stroke();
    if (pleats) {
      pen(g, 4);
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (0.18 + i * 0.16);
        const x = 64 - Math.cos(a) * 44, y = 80 - Math.sin(a) * 46;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 5, y + 10, x + 2, y + 18); g.stroke();
      }
    }
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.beginPath(); g.ellipse(44, 52, 10, 6, -0.5, 0, Math.PI * 2); g.fill();
  }

  function ingot(g) {
    pen(g);
    // a gold-ingot dumpling: the two corners pinched together behind, a round full belly in front
    blob(g, '#fff0c2', () => {
      g.moveTo(10, 46);
      g.bezierCurveTo(14, 104, 114, 104, 118, 46);
      g.bezierCurveTo(104, 60, 92, 62, 86, 56);
      g.bezierCurveTo(80, 30, 48, 30, 42, 56);
      g.bezierCurveTo(36, 62, 24, 60, 10, 46);
    });
    blob(g, '#ffe08a', () => { g.ellipse(64, 74, 30, 16, 0, 0, Math.PI * 2); });
    g.fillStyle = 'rgba(255,255,255,.8)';
    g.beginPath(); g.ellipse(52, 68, 9, 5, -0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffd400';
    for (const [x, y] of [[20, 24], [108, 22], [64, 18]]) star(g, x, y, 7);
  }

  function star(g, x, y, r) {
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, k = i % 2 ? r * 0.35 : r; g.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); }
    g.closePath(); g.fill();
  }

  function bowl(g, soup) {
    pen(g);
    blob(g, soup, () => { g.ellipse(64, 70, 50, 14, 0, 0, Math.PI * 2); });
    blob(g, '#e8f1ff', () => { g.moveTo(14, 70); g.bezierCurveTo(18, 118, 110, 118, 114, 70); g.bezierCurveTo(96, 84, 32, 84, 14, 70); });
    g.strokeStyle = '#2a7bd6'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(24, 92); g.bezierCurveTo(50, 102, 78, 102, 104, 92); g.stroke();
  }

  function ball(g) {
    bowl(g, '#fff7e8');
    pen(g);
    for (const [x, y] of [[42, 60], [86, 60], [64, 50]]) {
      blob(g, '#ffffff', () => g.arc(x, y, 17, 0, Math.PI * 2));
      g.fillStyle = 'rgba(160,190,255,.35)'; g.beginPath(); g.arc(x + 5, y + 5, 8, 0, Math.PI * 2); g.fill();
    }
  }

  function bun(g) {
    pen(g);
    blob(g, '#fffaf0', () => { g.moveTo(12, 92); g.bezierCurveTo(10, 26, 118, 26, 116, 92); g.bezierCurveTo(90, 104, 38, 104, 12, 92); });
    pen(g, 4);
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (0.15 + i * 0.14);
      g.beginPath(); g.moveTo(64, 36); g.quadraticCurveTo(64 - Math.cos(a) * 26, 40 - Math.sin(a) * 4 + 14, 64 - Math.cos(a) * 34, 58); g.stroke();
    }
    g.fillStyle = INK; g.beginPath(); g.arc(64, 36, 5, 0, Math.PI * 2); g.fill();
  }

  function roll(g) {
    pen(g);
    for (const [y, r] of [[78, -0.25], [52, -0.25]]) {
      g.save(); g.translate(64, y); g.rotate(r);
      blob(g, '#f2b347', () => { g.roundRect ? g.roundRect(-50, -15, 100, 30, 15) : g.rect(-50, -15, 100, 30); });
      g.strokeStyle = '#b8741c'; g.lineWidth = 3;
      for (const x of [-26, 0, 26]) { g.beginPath(); g.moveTo(x - 6, -14); g.lineTo(x + 6, 14); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-40, -9, 70, 4);
      g.restore();
    }
  }

  function pin(g, gold) {
    pen(g);
    g.save(); g.translate(64, 64); g.rotate(-0.6);
    blob(g, gold ? '#ffcf3a' : '#e0a663', () => g.rect(-38, -15, 76, 30));
    blob(g, gold ? '#e5a400' : '#a86b34', () => g.rect(-58, -7, 20, 14));
    blob(g, gold ? '#e5a400' : '#a86b34', () => g.rect(38, -7, 20, 14));
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(-30, -9, 60, 5);
    g.restore();
  }

  function knead(g) {
    pen(g);
    blob(g, DOUGH, () => g.ellipse(64, 74, 40, 30, 0, 0, Math.PI * 2));
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(50, 62, 12, 7, -0.4, 0, Math.PI * 2); g.fill();
    pen(g, 5);
    for (const [x, y, d] of [[16, 30, 1], [112, 30, -1]]) { g.beginPath(); g.arc(x + d * 10, y + 10, 14, d > 0 ? Math.PI : -0.2, d > 0 ? Math.PI * 1.7 : 0.6); g.stroke(); }
  }

  function wrapper(g) {
    pen(g);
    blob(g, DOUGH, () => g.ellipse(64, 70, 54, 36, 0, 0, Math.PI * 2));
    g.strokeStyle = DOUGH2; g.lineWidth = 3;
    g.beginPath(); g.ellipse(64, 70, 40, 26, 0, 0, Math.PI * 2); g.stroke();
  }

  function pot(g) {
    pen(g);
    blob(g, '#c9d3df', () => { g.moveTo(18, 46); g.lineTo(24, 108); g.lineTo(104, 108); g.lineTo(110, 46); g.closePath(); });
    blob(g, '#9fd8ff', () => g.ellipse(64, 46, 46, 12, 0, 0, Math.PI * 2));
    blob(g, '#9aa6b5', () => g.rect(4, 54, 16, 10));
    blob(g, '#9aa6b5', () => g.rect(108, 54, 16, 10));
    g.fillStyle = '#ffffff';
    for (const [x, y, r] of [[46, 44, 5], [70, 40, 4], [86, 48, 3]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    pen(g, 4);
    for (const x of [44, 64, 84]) { g.beginPath(); g.moveTo(x, 30); g.bezierCurveTo(x - 8, 22, x + 8, 14, x, 6); g.stroke(); }
  }

  function steamer(g) {
    pen(g);
    blob(g, '#e3b56b', () => g.rect(16, 74, 96, 32));
    blob(g, '#e3b56b', () => g.rect(16, 46, 96, 30));
    blob(g, '#d19a4a', () => { g.moveTo(10, 46); g.bezierCurveTo(20, 14, 108, 14, 118, 46); g.closePath(); });
    g.strokeStyle = '#a8742c'; g.lineWidth = 3;
    for (const y of [60, 90]) { g.beginPath(); g.moveTo(20, y); g.lineTo(108, y); g.stroke(); }
    for (let x = 28; x < 108; x += 14) { g.beginPath(); g.moveTo(x, 50); g.lineTo(x, 104); g.stroke(); }
    pen(g, 4);
    g.beginPath(); g.moveTo(64, 22); g.lineTo(64, 14); g.stroke();
  }

  function wok(g) {
    pen(g);
    blob(g, '#ff7a1a', () => { g.moveTo(34, 112); g.lineTo(44, 92); g.lineTo(54, 106); g.lineTo(64, 88); g.lineTo(74, 106); g.lineTo(84, 92); g.lineTo(94, 112); g.closePath(); });
    blob(g, '#3a3a46', () => { g.moveTo(10, 50); g.bezierCurveTo(14, 104, 114, 104, 118, 50); g.closePath(); });
    blob(g, '#5b5b6a', () => g.ellipse(64, 50, 54, 12, 0, 0, Math.PI * 2));
    blob(g, '#a86b34', () => g.rect(104, 36, 22, 10));
    g.fillStyle = '#ffd34a';
    for (const [x, y] of [[44, 48], [60, 52], [78, 47], [90, 52]]) { g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill(); }
  }

  function sesame(g) {
    bowl(g, '#2b2730');
    g.fillStyle = '#fff8e0';
    for (const [x, y, r] of [[44, 68, 0.4], [60, 72, -0.3], [76, 67, 0.6], [88, 72, 0.1], [52, 64, -0.7], [70, 63, 0.2]]) {
      g.save(); g.translate(x, y); g.rotate(r); g.beginPath(); g.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }

  function coin(g) {
    pen(g);
    blob(g, '#ffd23a', () => g.arc(64, 64, 50, 0, Math.PI * 2));
    g.strokeStyle = '#c98a00'; g.lineWidth = 4;
    g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2); g.stroke();
    pen(g, 5);
    g.fillStyle = '#ffeaa0';
    g.beginPath(); g.rect(50, 50, 28, 28); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(40, 36, 10, 5, -0.6, 0, Math.PI * 2); g.fill();
  }

  // pinch: the shape with a pinching hand drawn over it is done in the page; here a plain fingers picture
  function pinch(g) {
    wrapper(g);
    pen(g, 5);
    g.fillStyle = '#ffd9b8';
    for (const s of [-1, 1]) {
      g.beginPath(); g.ellipse(64 + s * 16, 40, 10, 22, s * 0.5, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  }

  const DRAW = {
    crescent: (g) => crescent(g, false), pleats: (g) => crescent(g, true), ingot, ball, bun, roll,
    pin: (g) => pin(g, false), goldpin: (g) => pin(g, true), knead, wrapper, pinch,
    boil: pot, steam: steamer, fry: wok, sesame, coin,
  };

  function get(key) {
    if (cache[key]) return cache[key];
    if (!DRAW[key]) return '';
    const [c, g] = Kit.gfx.makeCanvas(128, 128);
    DRAW[key](g);
    cache[key] = c.toDataURL();
    return cache[key];
  }

  // the picture for a filling or upgrade or day: its emoji, or a drawn icon
  function html(thing) {
    if (typeof thing === 'string') thing = DRAW[thing] ? { icon: thing } : { emoji: thing };
    if (thing.icon) return `<img class="ico" src="${get(thing.icon)}" alt="">`;
    return `<span class="emo">${thing.emoji}</span>`;
  }

  DS.icons = { get, html, has: (k) => !!DRAW[k] };
})();
