/* TT Dumpling Shop: the 3D shop. A warm New Year dumpling shop seen from the street: the front counter with the
   rolling board, the cook (Teddy or Tommy) behind it, the brick stove at the back with the pot (boil), the bamboo
   steamer (steam) and the wok (fry), red couplets, lanterns and a window on the snow or the fireworks. The guests (the
   twelve zodiac animals, Foxy and Froggy) come in at the sides of the counter.
     DS.world.init(canvas)  .setup({ day, players, upgrades, slots })  .sync(shop, dt)  .fx(event)  .render()
     .project(v3) -> { x, y, on }  .cookerTop(c)  .guestTop(gid)  .setPads({ top, bottom })  .chefMode(i, mode) */
(function () {
  'use strict';
  const T = THREE;
  const DS = window.DS;
  const D = DS.data;
  const G = Kit.gfx;
  const { makeCanvas, toTexture, nameTag } = G;

  let renderer, scene, camera, canvas;
  let hemi, sun;
  const pads = { top: 90, bottom: 150, left: 0, right: 0, tight: false };
  let setupKey = '';
  let roomGroup = null;     // walls, stove, counter: rebuilt for each day
  let decor = {};           // lanterns, lion, the window, signs: kept to animate
  let chefs = [];           // [{ p, entry, x, mode, modeT, turn, board, tray, pin }]
  const cookers = {};       // pot | steamer | wok -> { group, top: Vector3, items, lid, fire, kind }
  const guests = {};        // gid -> { a, slot, ... }
  const flying = [];        // plates and treats in the air
  const puffs = [];         // steam and sparkle sprites
  let slotPos = [];
  let fitW = 4;
  let time = 0;
  let night = false;

  // ---------------------------------------------------------------- small helpers
  const mats = {};
  function lam(color, o) {
    const key = color + JSON.stringify(o || {});
    if (!mats[key]) mats[key] = new T.MeshLambertMaterial(Object.assign({ color }, o || {}));
    return mats[key];
  }
  function box(w, h, d, mat, x, y, z, parent) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (parent) parent.add(m);
    return m;
  }
  function cyl(rt, rb, h, mat, x, y, z, parent, seg) {
    const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 24), mat);
    m.position.set(x, y, z);
    if (parent) parent.add(m);
    return m;
  }
  function ball(r, mat, x, y, z, parent, seg) {
    const m = new T.Mesh(new T.SphereGeometry(r, seg || 16, Math.max(8, (seg || 16) * 0.75)), mat);
    m.position.set(x, y, z);
    if (parent) parent.add(m);
    return m;
  }
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (dt, r) => 1 - Math.exp(-r * dt);

  // ---------------------------------------------------------------- textures
  function woodTexture(c1, c2, planks) {
    const [c, g] = makeCanvas(256, 256);
    g.fillStyle = c1; g.fillRect(0, 0, 256, 256);
    const h = 256 / planks;
    for (let i = 0; i < planks; i++) {
      g.fillStyle = i % 2 ? c2 : c1;
      g.fillRect(0, i * h, 256, h - 3);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, i * h + h - 3, 256, 3);
      g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 2;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(0, i * h + 6 + k * 8); g.bezierCurveTo(80, i * h + 2 + k * 9, 160, i * h + 12 + k * 7, 256, i * h + 6 + k * 8); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect((i * 97) % 256, i * h, 3, h - 3);
    }
    return toTexture(c, true);
  }

  function brickTexture() {
    const [c, g] = makeCanvas(256, 128);
    g.fillStyle = '#d9cbb4'; g.fillRect(0, 0, 256, 128);
    for (let r = 0; r < 4; r++) for (let k = -1; k < 5; k++) {
      g.fillStyle = (r + k) % 3 ? '#b8553e' : '#a84a36';
      g.fillRect(k * 64 + (r % 2 ? 32 : 0) + 3, r * 32 + 3, 58, 26);
    }
    return toTexture(c, true);
  }

  function wallTexture() {
    const [c, g] = makeCanvas(512, 256);
    g.fillStyle = '#fff1d6'; g.fillRect(0, 0, 512, 256);
    // a soft pattern of round lucky clouds
    g.strokeStyle = 'rgba(232, 160, 90, .22)'; g.lineWidth = 5;
    for (let y = 30; y < 256; y += 80) for (let x = (y / 80) % 2 ? 60 : 20; x < 512; x += 110) {
      g.beginPath(); g.arc(x, y, 14, Math.PI, Math.PI * 2.6); g.stroke();
      g.beginPath(); g.arc(x + 26, y, 14, Math.PI * 0.4, Math.PI * 2); g.stroke();
    }
    return toTexture(c, true);
  }

  // red paper with gold: a couplet strip (characters in 中文, gold shapes in English)
  function redPaper(w, h, chars, vertical) {
    const [c, g] = makeCanvas(w, h);
    g.fillStyle = '#d8261c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffc21a'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    const n = chars.length;
    for (let i = 0; i < n; i++) {
      const cx = vertical ? w / 2 : (w / n) * (i + 0.5), cy = vertical ? (h / n) * (i + 0.5) : h / 2;
      const s = Math.min(vertical ? w : w / n, vertical ? h / n : h) * 0.72;
      g.fillStyle = '#ffc21a';
      if (Kit.lang.is('zh')) {
        g.font = `900 ${Math.round(s)}px "Kaiti SC", "STKaiti", "KaiTi", "Songti SC", serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(chars[i], cx, cy + s * 0.04);
      } else {
        // a little gold lucky knot in each square
        g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4);
        g.strokeStyle = '#ffc21a'; g.lineWidth = s * 0.1;
        g.strokeRect(-s * 0.28, -s * 0.28, s * 0.56, s * 0.56);
        g.fillRect(-s * 0.1, -s * 0.1, s * 0.2, s * 0.2);
        g.restore();
      }
    }
    return toTexture(c);
  }

  // the diamond on the wall: 福 upside down in 中文 ("luck has arrived"), an old gold coin in English
  function fuTexture() {
    const [c, g] = makeCanvas(256, 256);
    g.save(); g.translate(128, 128); g.rotate(Math.PI / 4);
    g.fillStyle = '#d8261c'; g.fillRect(-82, -82, 164, 164);
    g.strokeStyle = '#ffc21a'; g.lineWidth = 8; g.strokeRect(-72, -72, 144, 144);
    g.restore();
    g.save(); g.translate(128, 128);
    if (Kit.lang.is('zh')) {
      g.rotate(Math.PI);
      g.fillStyle = '#1b1a22';
      g.font = '900 120px "Kaiti SC", "STKaiti", "KaiTi", "Songti SC", serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('福', 0, 6);
    } else {
      g.fillStyle = '#ffc21a'; g.beginPath(); g.arc(0, 0, 54, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#d8261c'; g.fillRect(-16, -16, 32, 32);
      g.strokeStyle = '#b8860b'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
    return toTexture(c);
  }

  function skyTexture(isNight) {
    const [c, g] = makeCanvas(256, 128);
    const gr = g.createLinearGradient(0, 0, 0, 128);
    if (isNight) { gr.addColorStop(0, '#0d1240'); gr.addColorStop(1, '#3a2a6e'); } else { gr.addColorStop(0, '#9fd8ff'); gr.addColorStop(1, '#e8f6ff'); }
    g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    // rooftops across the street, with snow on them
    g.fillStyle = isNight ? '#1d1a33' : '#6b4a3a';
    for (let x = -20; x < 256; x += 70) {
      g.beginPath(); g.moveTo(x, 128); g.lineTo(x, 92); g.lineTo(x + 8, 84); g.lineTo(x + 58, 84); g.lineTo(x + 66, 92); g.lineTo(x + 66, 128); g.fill();
    }
    g.fillStyle = '#ffffff';
    for (let x = -20; x < 256; x += 70) g.fillRect(x + 6, 82, 54, 4);
    if (isNight) {
      g.fillStyle = '#ffe9a6';
      for (let i = 0; i < 26; i++) g.fillRect((i * 53) % 256, (i * 29) % 70, 2, 2);
      g.fillStyle = '#ffd35a';
      for (let x = 0; x < 256; x += 70) g.fillRect(x + 20, 100, 10, 8);
    } else {
      // plum blossom branch, a New Year flower
      g.strokeStyle = '#5a3a2a'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(256, 10); g.quadraticCurveTo(200, 30, 170, 20); g.stroke();
      g.fillStyle = '#ff7aa8';
      for (const [x, y] of [[180, 20], [200, 28], [222, 22], [240, 16]]) { g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = 0; i < 30; i++) { g.beginPath(); g.arc((i * 61) % 256, (i * 37) % 80, 1.6, 0, Math.PI * 2); g.fill(); }
    }
    return toTexture(c);
  }

  // ---------------------------------------------------------------- the guests: blocky zodiac animals
  const KINDS = {
    rat: { body: '#a9a9b8', ear: 'big', inner: '#ffc2d1', snout: '#ffc2d1', whiskers: true },
    ox: { body: '#8b5a3c', ear: 'side', inner: '#6a4029', snout: '#e8c9a0', horns: '#f4ecd8' },
    tiger: { body: '#ffa630', ear: 'round', inner: '#2a1a10', snout: '#fff4e0', stripes: '#2a1a10' },
    rabbit: { body: '#f4f1ec', ear: 'long', inner: '#ffb3c7' },
    dragon: { body: '#3fae5a', belly: '#ffe08a', horns: '#ffd400', spikes: '#e8382f', snout: '#7fd08a', whiskers: true },
    snake: { body: '#7ac74f', belly: '#e9f7c0', tongue: true, spots: '#4e9a2e' },
    horse: { body: '#b07040', ear: 'point', inner: '#7a4e2a', snout: '#e2b98b', mane: '#3a2418' },
    goat: { body: '#f4f1ec', ear: 'side', inner: '#e0d6c8', snout: '#ffd9cc', horns: '#c8b48a', beard: '#e0d6c8' },
    monkey: { body: '#9a6a3f', ear: 'round', inner: '#e7c49b', snout: '#e7c49b' },
    rooster: { body: '#ffffff', beak: '#ffb02e', comb: '#e8382f' },
    dog: { body: '#e0b27a', ear: 'flop', inner: '#a8703f', snout: '#fff1e0' },
    pig: { body: '#ffb3c7', ear: 'point', inner: '#ff8fab', snout: '#ff8fab' },
    fox: { body: '#ff8a3c', ear: 'point', inner: '#3a2418', snout: '#fff1e0', belly: '#fff1e0' },
    frog: { body: '#69c94e', ear: 'bump', belly: '#d8f5b0' },
    panda: { body: '#f4f4f4', ear: 'round', inner: '#1b1a22', patch: '#1b1a22' },
  };

  function makeAnimal(kind) {
    const k = KINDS[kind] || KINDS.panda;
    const root = new T.Group();
    const body = new T.Group();
    root.add(body);
    const mat = lam(k.body), dark = lam('#1b1a22'), white = lam('#ffffff');
    box(0.8, 0.8, 0.6, mat, 0, 0.6, 0, body);
    if (k.belly) box(0.56, 0.6, 0.05, lam(k.belly), 0, 0.58, 0.31, body);
    if (k.stripes) for (const y of [0.4, 0.7]) box(0.82, 0.08, 0.62, lam(k.stripes), 0, y, 0, body);
    if (k.spots) for (const [x, y] of [[-0.25, 0.8], [0.22, 0.45], [0.3, 0.85]]) box(0.12, 0.12, 0.62, lam(k.spots), x, y, 0, body);
    // a red New Year scarf
    box(0.84, 0.12, 0.64, lam('#e8382f'), 0, 0.98, 0, body);
    box(0.14, 0.26, 0.05, lam('#e8382f'), 0.2, 0.84, 0.33, body);
    for (const s of [-1, 1]) box(0.26, 0.2, 0.36, k.beak ? lam(k.beak) : mat, s * 0.2, 0.1, 0.06, body);
    const head = new T.Group();
    head.position.y = 1.36;
    body.add(head);
    box(0.74, 0.62, 0.62, mat, 0, 0, 0, head);
    for (const s of [-1, 1]) {
      if (k.patch) box(0.2, 0.18, 0.04, lam(k.patch), s * 0.16, 0.06, 0.31, head);
      box(0.09, 0.11, 0.04, dark, s * 0.16, 0.06, 0.33, head);
      box(0.035, 0.035, 0.02, white, s * 0.14, 0.09, 0.355, head);
      box(0.1, 0.05, 0.02, lam('#ff9fb0'), s * 0.26, -0.08, 0.32, head); // rosy cheeks
      if (k.ear === 'long') {
        box(0.16, 0.55, 0.1, mat, s * 0.18, 0.55, 0, head);
        box(0.08, 0.4, 0.02, lam(k.inner), s * 0.18, 0.55, 0.06, head);
      } else if (k.ear === 'round') {
        box(0.22, 0.2, 0.1, lam(k.inner || k.body), s * 0.28, 0.36, 0, head);
      } else if (k.ear === 'big') {
        box(0.32, 0.3, 0.08, mat, s * 0.34, 0.38, 0, head);
        box(0.2, 0.18, 0.02, lam(k.inner), s * 0.34, 0.38, 0.05, head);
      } else if (k.ear === 'point') {
        const e = box(0.2, 0.2, 0.08, lam(k.inner || k.body), s * 0.25, 0.34, 0, head);
        e.rotation.z = Math.PI / 4;
      } else if (k.ear === 'side') {
        box(0.24, 0.1, 0.12, lam(k.inner || k.body), s * 0.46, 0.14, 0, head);
      } else if (k.ear === 'flop') {
        box(0.14, 0.34, 0.12, lam(k.inner), s * 0.42, 0.02, 0, head);
      } else if (k.ear === 'bump') {
        box(0.22, 0.16, 0.22, mat, s * 0.2, 0.36, 0.08, head);
        box(0.1, 0.1, 0.04, dark, s * 0.2, 0.38, 0.2, head);
      }
      if (k.horns) {
        const h = box(0.08, 0.26, 0.08, lam(k.horns), s * 0.24, 0.42, -0.06, head);
        h.rotation.z = -s * 0.35;
      }
      if (k.whiskers) box(0.22, 0.02, 0.02, dark, s * 0.3, -0.12, 0.38, head);
    }
    if (k.spikes) for (const z of [-0.2, 0, 0.2]) { const sp = box(0.1, 0.16, 0.1, lam(k.spikes), 0, 0.36, z, head); sp.rotation.x = 0.4; }
    if (k.mane) box(0.16, 0.5, 0.5, lam(k.mane), 0, 0.12, -0.2, head);
    if (k.comb) { box(0.1, 0.22, 0.34, lam(k.comb), 0, 0.42, 0.06, head); box(0.1, 0.16, 0.06, lam(k.comb), 0, -0.3, 0.36, head); }
    if (k.beard) box(0.14, 0.2, 0.06, lam(k.beard), 0, -0.38, 0.28, head);
    if (k.beak) box(0.3, 0.1, 0.18, lam(k.beak), 0, -0.08, 0.38, head);
    if (k.snout) box(0.26, 0.16, 0.08, lam(k.snout), 0, -0.1, 0.34, head);
    if (k.tongue) box(0.06, 0.03, 0.14, lam('#e8382f'), 0, -0.2, 0.4, head);
    if (!k.beak) box(0.16, 0.05, 0.02, dark, 0, -0.17, 0.315, head);
    const arms = [];
    for (const s of [-1, 1]) {
      const arm = new T.Group();
      arm.position.set(s * 0.46, 0.92, 0);
      body.add(arm);
      box(0.16, 0.48, 0.16, mat, 0, -0.22, 0, arm);
      arms.push(arm);
    }
    return { root, body, head, arms, kind };
  }

  // ---------------------------------------------------------------- the food
  const DOUGH = '#f6ead0';
  function foodMat(color, shiny) {
    return shiny ? new T.MeshPhongMaterial({ color, shininess: 60, specular: 0x333333 }) : new T.MeshLambertMaterial({ color });
  }
  // one dumpling (or bun, ball, roll): a Group with userData.mats to recolour when it's cooked
  function makeFood(shape) {
    const g = new T.Group();
    const m = foodMat(shape === 'ball' ? '#ffffff' : DOUGH, true);
    g.userData.mats = [m];
    if (shape === 'crescent' || shape === 'pleats') {
      const b = ball(0.2, m, 0, 0.07, 0, g);
      b.scale.set(1.25, 0.7, 0.62);
      const crest = new T.Mesh(new T.TorusGeometry(0.2, 0.035, 6, 18, Math.PI), m);
      crest.position.y = -0.04;
      g.add(crest);
      if (shape === 'pleats') {
        for (let i = 0; i < 5; i++) {
          const a = Math.PI * (0.2 + i * 0.15);
          const p = box(0.05, 0.07, 0.09, m, Math.cos(a) * 0.2, -0.04 + Math.sin(a) * 0.2, 0, g);
          p.rotation.z = a - Math.PI / 2;
        }
      }
    } else if (shape === 'ingot') {
      const b = ball(0.17, m, 0, 0.09, 0.03, g);
      b.scale.set(1, 0.8, 0.95);
      for (const s of [-1, 1]) {
        const h = ball(0.085, m, s * 0.19, 0.15, -0.06, g, 10);
        h.scale.set(1, 1.2, 1);
      }
      const crest = new T.Mesh(new T.TorusGeometry(0.17, 0.03, 6, 16, Math.PI), m);
      crest.position.set(0, 0.05, -0.08);
      g.add(crest);
    } else if (shape === 'ball') {
      ball(0.12, m, 0, 0.11, 0, g);
    } else if (shape === 'bun') {
      const b = ball(0.22, m, 0, 0.1, 0, g, 18);
      b.scale.set(1, 0.72, 1);
      const tw = new T.Mesh(new T.TorusGeometry(0.06, 0.025, 6, 12), m);
      tw.rotation.x = Math.PI / 2;
      tw.position.y = 0.25;
      g.add(tw);
      ball(0.035, m, 0, 0.27, 0, g, 8);
    } else if (shape === 'roll') {
      const r = cyl(0.075, 0.075, 0.36, m, 0, 0.075, 0, g, 12);
      r.rotation.z = Math.PI / 2;
    }
    return g;
  }
  function cookFood(g, cook) {
    const c = cook === 'fry' ? '#e0a03a' : '#fffaf0';
    for (const m of g.userData.mats) m.color.set(c);
  }

  // ---------------------------------------------------------------- the room
  function buildRoom(o) {
    if (roomGroup) scene.remove(roomGroup);
    roomGroup = new T.Group();
    scene.add(roomGroup);
    decor = { lanterns: [], fire: [] };
    const two = o.players.length > 1;
    const cw = two ? 2.6 : 1.6; // half the front counter

    // floor and walls
    const floorTex = woodTexture('#c98d5a', '#bb8050', 8);
    floorTex.repeat.set(6, 4);
    const floor = new T.Mesh(new T.PlaneGeometry(40, 24), lam('#ffffff', { map: floorTex }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = 4;
    roomGroup.add(floor);
    const wallTex = wallTexture();
    wallTex.repeat.set(5, 2);
    const wall = new T.Mesh(new T.PlaneGeometry(40, 10), lam('#ffffff', { map: wallTex }));
    wall.position.set(0, 5, -3.6);
    roomGroup.add(wall);
    box(40, 1.3, 0.1, lam('#8e2a20'), 0, 0.65, -3.55, roomGroup); // dark red wainscot
    box(40, 0.12, 0.16, lam('#ffc21a'), 0, 1.32, -3.52, roomGroup);
    for (const s of [-1, 1]) {
      const side = new T.Mesh(new T.PlaneGeometry(14, 10), lam('#ffe8c2', { map: wallTex }));
      side.rotation.y = -s * Math.PI / 2;
      side.position.set(s * 9.5, 5, 3);
      roomGroup.add(side);
    }

    // the window across the street, with couplets around it
    const win = new T.Group();
    win.position.set(0, 3.55, -3.5);
    roomGroup.add(win);
    decor.sky = new T.Mesh(new T.PlaneGeometry(2.8, 1.4), new T.MeshBasicMaterial({ map: skyTexture(night) }));
    win.add(decor.sky);
    const frame = lam('#8e2a20');
    box(3.0, 0.12, 0.1, frame, 0, 0.76, 0.03, win); box(3.0, 0.12, 0.1, frame, 0, -0.76, 0.03, win);
    box(0.12, 1.6, 0.1, frame, -1.46, 0, 0.03, win); box(0.12, 1.6, 0.1, frame, 1.46, 0, 0.03, win);
    box(0.06, 1.4, 0.06, frame, 0, 0, 0.03, win); box(2.8, 0.06, 0.06, frame, 0, 0, 0.03, win);
    decor.signs = [];
    const sign = (chars, vertical, w, h, x, y) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshLambertMaterial({ map: redPaper(vertical ? 96 : 96 * chars.length, vertical ? 96 * chars.length : 96, chars, vertical) }));
      m.position.set(x, y, 0.06);
      m.userData.sign = { chars, vertical };
      win.add(m);
      decor.signs.push(m);
    };
    sign('新年快乐', true, 0.42, 1.68, -1.86, -0.05);
    sign('万事如意', true, 0.42, 1.68, 1.86, -0.05);
    sign('欢欢喜喜', false, 1.9, 0.46, 0, 1.12);
    decor.fu = [];
    for (const s of [-1, 1]) {
      const fu = new T.Mesh(new T.PlaneGeometry(1.1, 1.1), new T.MeshLambertMaterial({ map: fuTexture(), transparent: true }));
      fu.position.set(s * 3.7, 3.0, -3.48);
      roomGroup.add(fu);
      decor.fu.push(fu);
    }
    // fireworks outside on the night days
    decor.fireworks = [];

    // the brick stove (灶台) along the back wall
    const brick = brickTexture();
    brick.repeat.set(3, 1);
    const stove = box(7.4, 1.45, 1.2, lam('#ffffff', { map: brick }), 0, 0.725, -2.85, roomGroup);
    box(7.6, 0.12, 1.3, lam(o.upgrades.stove ? '#ffc21a' : '#e8e0d0'), 0, 1.5, -2.85, roomGroup);
    void stove;
    const spots = { pot: -2.3, steamer: 0, wok: 2.3 };
    for (const c of ['pot', 'steamer', 'wok']) {
      const x = spots[c];
      // the fire door in the stove's front
      box(0.7, 0.42, 0.04, lam('#1b1a22'), x, 0.6, -2.24, roomGroup);
      const f = box(0.52, o.upgrades.stove ? 0.34 : 0.22, 0.05, new T.MeshBasicMaterial({ color: '#ff8a1f' }), x, 0.55, -2.22, roomGroup);
      decor.fire.push(f);
      buildCooker(c, x, o.cooks.includes(cookFor(c)));
    }

    // the front counter
    const counterTex = woodTexture('#a8642e', '#9a5a28', 4);
    const front = box(cw * 2, 1.1, 1.0, lam('#ffffff', { map: counterTex }), 0, 0.55, 0, roomGroup);
    void front;
    box(cw * 2 + 0.16, 0.1, 1.12, lam('#e9c48f'), 0, 1.12, 0, roomGroup);
    box(cw * 2 + 0.02, 0.18, 0.04, lam('#d8261c'), 0, 0.86, 0.52, roomGroup);
    for (let x = -cw + 0.5; x < cw; x += 1.0) box(0.32, 0.32, 0.03, lam('#ffc21a'), x, 0.5, 0.52, roomGroup).rotation.z = Math.PI / 4;
    // a plate of mandarins (luck) and a little bowl of flour at the counter's ends
    const plate = cyl(0.3, 0.24, 0.05, lam('#ffffff'), -cw + 0.3, 1.2, 0.25, roomGroup);
    void plate;
    for (const [x, y, z] of [[-0.08, 0, 0], [0.08, 0, 0.04], [0, 0, -0.08], [0, 0.11, 0]]) ball(0.085, lam('#ff8a1f'), -cw + 0.3 + x, 1.31 + y, 0.25 + z, roomGroup, 10);
    ball(0.02, lam('#2f9e44'), -cw + 0.3, 1.5, 0.25, roomGroup, 6);

    // lanterns: two, or six with the upgrade
    const lx = o.upgrades.lanterns ? [-5.2, -3.4, -1.5, 1.5, 3.4, 5.2] : [-3.4, 3.4];
    for (const x of lx) decor.lanterns.push(lantern(x, o.upgrades.lanterns ? 4.6 : 4.5, x < 0 ? -2.2 : -2.2, o.upgrades.lanterns ? 1.1 : 0.9));
    // the lion dance head by the door
    if (o.upgrades.lion) decor.lion = lionHead(-(cw + 2.75), 0, -2.3);
    // a string of firecrackers on New Year's Eve
    if (o.day.id === 'eve') firecrackers(4.6, 4.6, -3.3);

    slotPos = [];
    const near = cw + 0.85, far = cw + 2.05;
    slotPos.push(new T.Vector3(-near, 0, 0.75), new T.Vector3(near, 0, 0.75), new T.Vector3(-far, 0, -0.35), new T.Vector3(far, 0, -0.35));
    fitW = far + 0.95;
  }

  const cookFor = (c) => ({ pot: 'boil', steamer: 'steam', wok: 'fry' })[c];

  function lantern(x, y, z, s) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    roomGroup.add(g);
    box(0.02, 0.6, 0.02, lam('#1b1a22'), 0, 0.3, 0, g);
    const body = ball(0.36, new T.MeshLambertMaterial({ color: '#e8382f', emissive: '#7a0d06' }), 0, -0.3, 0, g, 18);
    body.scale.set(1, 0.82, 1);
    cyl(0.2, 0.2, 0.08, lam('#ffc21a'), 0, 0.02, 0, g, 14);
    cyl(0.2, 0.2, 0.08, lam('#ffc21a'), 0, -0.6, 0, g, 14);
    for (let i = 0; i < 5; i++) box(0.03, 0.34, 0.03, lam('#ffc21a'), (i - 2) * 0.05, -0.82, 0, g);
    return g;
  }

  function lionHead(x, y, z) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.rotation.y = 0.35;
    roomGroup.add(g);
    const red = lam('#e8382f'), gold = lam('#ffc21a'), white = lam('#ffffff'), dark = lam('#1b1a22');
    box(0.5, 0.9, 0.4, lam('#ffc21a'), -0.2, 0.45, 0, g); box(0.5, 0.9, 0.4, lam('#ffc21a'), 0.2, 0.45, 0, g); // the legs under the costume
    const head = new T.Group();
    head.position.y = 1.4;
    g.add(head);
    box(1.0, 0.8, 0.8, red, 0, 0, 0, head);
    box(1.1, 0.18, 0.86, gold, 0, 0.42, 0, head);
    box(0.24, 0.2, 0.06, gold, 0, 0.62, 0.3, head); // horn
    for (const s of [-1, 1]) {
      box(0.26, 0.24, 0.06, white, s * 0.24, 0.12, 0.42, head);
      box(0.12, 0.14, 0.04, dark, s * 0.24, 0.12, 0.46, head);
      box(0.18, 0.5, 0.1, white, s * 0.56, -0.05, 0.1, head); // fluffy cheeks
    }
    box(0.6, 0.14, 0.1, white, 0, -0.32, 0.42, head); // teeth
    box(0.3, 0.12, 0.08, lam('#ff9fb0'), 0, -0.18, 0.44, head);
    const body = box(0.9, 0.6, 1.4, red, 0, 0.9, -0.8, g);
    body.rotation.x = 0.15;
    for (let i = 0; i < 4; i++) box(0.92, 0.06, 0.06, gold, 0, 1.05 - i * 0.12, -0.2 - i * 0.35, g);
    decor.lionHead = head;
    return g;
  }

  function firecrackers(x, y, z) {
    const g = new T.Group();
    g.position.set(x, y, z);
    roomGroup.add(g);
    box(0.03, 2.2, 0.03, lam('#c98a00'), 0, -1.1, 0, g);
    for (let i = 0; i < 10; i++) for (const s of [-1, 1]) {
      const c = cyl(0.05, 0.05, 0.22, lam('#e8382f'), s * 0.09, -0.2 - i * 0.19, 0, g, 8);
      c.rotation.z = s * 1.1;
    }
  }

  function buildCooker(c, x, on) {
    const top = 1.56;
    const g = new T.Group();
    g.position.set(x, top, -2.85);
    roomGroup.add(g);
    const K = { group: g, kind: c, on, items: [], top: new T.Vector3(x, top + 0.9, -2.85) };
    if (!on) {
      // not on today's menu: a jar and a plate of mandarins sit there instead
      cyl(0.26, 0.3, 0.5, lam('#2a7bd6'), -0.2, 0.25, 0, g, 14);
      cyl(0.18, 0.18, 0.08, lam('#ffffff'), -0.2, 0.54, 0, g, 14);
      cyl(0.3, 0.24, 0.05, lam('#ffffff'), 0.35, 0.03, 0.1, g, 16);
      for (const [dx, dy, dz] of [[-0.08, 0, 0], [0.08, 0, 0.04], [0, 0, -0.08], [0, 0.11, 0]]) ball(0.085, lam('#ff8a1f'), 0.35 + dx, 0.14 + dy, 0.1 + dz, g, 10);
      cookers[c] = K;
      return;
    }
    const metal = lam('#c9d3df'), dark = lam('#3a3a46');
    if (c === 'pot') {
      cyl(0.55, 0.48, 0.55, metal, 0, 0.27, 0, g, 24);
      cyl(0.48, 0.48, 0.04, lam('#9fd8ff', { transparent: true, opacity: 0.85 }), 0, 0.5, 0, g, 24);
      for (const s of [-1, 1]) box(0.16, 0.08, 0.12, lam('#9aa6b5'), s * 0.62, 0.45, 0, g);
      K.surface = 0.52;
    } else if (c === 'steamer') {
      const bam = lam('#e3b56b'), bam2 = lam('#c99a4e');
      cyl(0.48, 0.48, 0.12, metal, 0, 0.06, 0, g, 24);
      cyl(0.52, 0.52, 0.26, bam, 0, 0.25, 0, g, 24);
      cyl(0.53, 0.53, 0.04, bam2, 0, 0.36, 0, g, 24);
      cyl(0.52, 0.52, 0.26, bam, 0, 0.5, 0, g, 24);
      K.lid = new T.Group();
      K.lid.position.y = 0.63;
      g.add(K.lid);
      const lid = ball(0.53, bam2, 0, 0, 0, K.lid, 24);
      lid.scale.set(1, 0.32, 1);
      box(0.12, 0.1, 0.12, bam, 0, 0.18, 0, K.lid);
      K.surface = 0.38;
    } else if (c === 'wok') {
      const w = new T.Mesh(new T.SphereGeometry(0.6, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), dark);
      w.material = new T.MeshLambertMaterial({ color: '#3a3a46', side: T.DoubleSide });
      w.position.y = 0.6;
      g.add(w);
      cyl(0.5, 0.5, 0.02, lam('#d9a441', { transparent: true, opacity: 0.8 }), 0, 0.42, 0, g, 24);
      box(0.6, 0.08, 0.1, lam('#a86b34'), 0.85, 0.58, 0, g);
      K.surface = 0.44;
    }
    cookers[c] = K;
  }

  // ---------------------------------------------------------------- the cooks
  function makeChef(entry, x) {
    const p = Kit.people.build(entry.look);
    p.root.position.set(x, 0, -1.0);
    p.root.rotation.y = Math.PI;
    // a white apron with a red edge
    box(0.6, 0.66, 0.03, lam('#ffffff'), 0, 0.14, -0.2, p.hips);
    box(0.62, 0.06, 0.035, lam('#e8382f'), 0, -0.19, -0.2, p.hips);
    scene.add(p.root);
    const side = x <= 0 ? -1 : 1;
    const bx = x, bz = -0.12;
    const board = new T.Group();
    board.position.set(bx, 1.17, bz);
    scene.add(board);
    cyl(0.52, 0.52, 0.06, lam('#d8a86a'), 0, 0, 0, board, 28);
    const dough = ball(0.2, foodMat(DOUGH), 0, 0.15, 0, board, 20);
    const fill = ball(0.12, lam('#7fc94e'), 0, 0.1, 0, board, 12);
    fill.scale.y = 0.55;
    const pin = new T.Group();
    board.add(pin);
    const pinMat = lam(chefsUp.pin ? '#ffc21a' : '#e0a663');
    const pr = cyl(0.06, 0.06, 0.6, pinMat, 0, 0.09, 0, pin, 12);
    pr.rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) { const h = cyl(0.03, 0.03, 0.16, lam(chefsUp.pin ? '#e5a400' : '#a86b34'), s * 0.38, 0.09, 0, pin, 8); h.rotation.z = Math.PI / 2; }
    const tray = new T.Group();
    tray.position.set(x === 0 ? 1.0 : x + side * 1.0, 1.17, bz + 0.05);
    scene.add(tray);
    box(0.62, 0.04, 0.5, lam('#e3b56b'), 0, 0, 0, tray);
    for (const s of [-1, 1]) { box(0.66, 0.06, 0.04, lam('#c99a4e'), 0, 0.03, s * 0.26, tray); box(0.04, 0.06, 0.54, lam('#c99a4e'), s * 0.32, 0.03, 0, tray); }
    return { p, entry, x, mode: 'idle', modeT: 0, face: Math.PI, faceTo: Math.PI, board, dough, fill, pin, pinT: 9, tray, trayItems: [], shapeMesh: null, shapeKey: '', jump: 0, sig: 0, buddy: null };
  }
  let chefsUp = {};

  // ---------------------------------------------------------------- setup
  function init(cv) {
    canvas = cv;
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = T.sRGBEncoding;
    scene = new T.Scene();
    scene.background = new T.Color('#3a1d14');
    camera = new T.PerspectiveCamera(36, 1, 0.1, 100);
    hemi = new T.HemisphereLight(0xfff2dd, 0x8a5a40, 0.95);
    scene.add(hemi);
    sun = new T.DirectionalLight(0xffffff, 0.75);
    sun.position.set(3, 9, 7);
    scene.add(sun);
    const fill = new T.DirectionalLight(0xffd9a8, 0.3);
    fill.position.set(-5, 4, 3);
    scene.add(fill);
    resize();
  }

  function setup(o) {
    const key = JSON.stringify([o.day.id, o.players, o.upgrades, Kit.lang.get()]);
    night = !!o.day.night;
    chefsUp = o.upgrades || {};
    if (key !== setupKey) {
      setupKey = key;
      for (const c in cookers) delete cookers[c];
      buildRoom({ day: o.day, players: o.players, upgrades: o.upgrades || {}, cooks: o.day.cooks });
      for (const ch of chefs) { scene.remove(ch.p.root); scene.remove(ch.board); scene.remove(ch.tray); if (ch.buddy) scene.remove(ch.buddy.root); }
      chefs = [];
      const xs = o.players.length > 1 ? [-1.3, 1.3] : [0];
      o.players.forEach((id, i) => chefs.push(makeChef(Kit.roster.get(id), xs[i])));
    }
    hemi.intensity = night ? 0.8 : 0.95;
    scene.background.set(night ? '#1d1030' : '#3a1d14');
    clearGuests();
    for (const c in cookers) clearCooker(cookers[c]);
    for (const ch of chefs) { setTray(ch, 0, null); ch.mode = 'idle'; ch.sig = 0; buddyGone(ch); }
    for (const f of flying.splice(0)) scene.remove(f.obj);
    for (const p of puffs.splice(0)) scene.remove(p.obj);
    fit();
  }

  function relabel() {
    setupKey = setupKey.replace(/"(en|zh)"\]$/, `"${Kit.lang.get()}"]`);
    for (const m of decor.signs || []) { const u = m.userData.sign; m.material.map = redPaper(u.vertical ? 96 : 96 * u.chars.length, u.vertical ? 96 * u.chars.length : 96, u.chars, u.vertical); m.material.needsUpdate = true; }
    for (const m of decor.fu || []) { m.material.map = fuTexture(); m.material.needsUpdate = true; }
  }

  function clearGuests() {
    for (const id in guests) { scene.remove(guests[id].a.root); delete guests[id]; }
  }
  function clearCooker(K) {
    for (const it of K.items) K.group.remove(it);
    K.items = [];
    K.gid = null;
    if (K.lid) K.lid.position.y = 0.63;
  }

  // ---------------------------------------------------------------- camera: fit the shop between the top cards and the bottom buttons
  function setPads(p) { Object.assign(pads, p); fit(); }
  function resize() {
    if (!renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    fit();
  }
  const EL = 0.5;
  function fit() {
    if (!camera || !slotPos.length) return;
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.clearViewOffset();
    const target = new T.Vector3(0, 1.4, -1.0);
    const pts = [];
    const W = pads.tight ? fitW - 1.7 : fitW;
    for (const s of [-1, 1]) {
      pts.push(new T.Vector3(s * W, 2.5, -0.35), new T.Vector3(s * (W - 1.2), 2.5, 0.75), new T.Vector3(s * (W - 1.2), 0.9, 1.0));
      pts.push(new T.Vector3(s * 2.9, 2.4, -2.85), new T.Vector3(s * 1.4, 3.5, -3.5));
    }
    pts.push(new T.Vector3(0, 1.0, 0.6));
    const a0 = 1 - 2 * (h - pads.bottom) / h, a1 = 1 - 2 * pads.top / h; // the free band, in NDC y
    const b0 = -1 + 2 * (pads.left || 0) / w, b1 = 1 - 2 * (pads.right || 0) / w; // and in NDC x
    const v = new T.Vector3();
    const range = (d) => {
      camera.position.set(target.x, target.y + Math.sin(EL) * d, target.z + Math.cos(EL) * d);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const p of pts) { v.copy(p).project(camera); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      return { x0, x1, y0, y1 };
    };
    let lo = 3, hi = 80;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2, r = range(mid);
      if (r.x1 - r.x0 <= (b1 - b0) * 0.95 && r.y1 - r.y0 <= (a1 - a0) * 0.98) hi = mid; else lo = mid;
    }
    const r = range(hi);
    const up = ((a0 + a1) / 2 - (r.y0 + r.y1) / 2) * h / 2, right = ((b0 + b1) / 2 - (r.x0 + r.x1) / 2) * w / 2;
    camera.setViewOffset(w, h, -Math.round(right), Math.round(up), w, h);
    camera.updateProjectionMatrix();
  }

  function project(p) {
    const v = p.clone().project(camera);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight, on: v.z < 1 };
  }

  // ---------------------------------------------------------------- per frame: make the 3D match the shop
  function setTray(ch, n, order) {
    const key = order ? `${order.food}:${order.shape}:${n}` : '';
    if (ch.trayKey === key) return;
    ch.trayKey = key;
    for (const it of ch.trayItems) ch.tray.remove(it);
    ch.trayItems = [];
    for (let i = 0; i < n; i++) {
      const f = makeFood(order.shape);
      f.position.set(-0.15 + (i % 2) * 0.3, 0.03, (i < 2 ? -0.1 : 0.12));
      f.scale.setScalar(0.85);
      ch.tray.add(f);
      ch.trayItems.push(f);
    }
  }

  function syncBoard(ch, v, dt) {
    const roll = v.stage === 'roll', fillS = v.stage === 'fill' || v.stage === 'shape';
    const pinchS = v.stage === 'pinch';
    const k = v.need ? v.prog / v.need : 0;
    ch.dough.visible = roll || fillS || pinchS;
    ch.fill.visible = (v.stage === 'shape' || pinchS) && !!v.filling;
    if (v.filling) ch.fill.material = lam(D.FILLINGS[v.filling].color);
    let tx, ty;
    if (roll) {
      const big = v.order && v.order.food === 'tangyuan' ? 0 : 1;
      const r = big ? lerp(0.2, 0.44, k) : 0.16 + 0.03 * Math.sin(k * 9);
      tx = r / 0.2; ty = big ? lerp(0.8, 0.12, k) : 0.8;
    } else if (fillS) { tx = v.order && v.order.food === 'tangyuan' ? 0.85 : 2.2; ty = v.order && v.order.food === 'tangyuan' ? 0.4 : 0.12; }
    else if (pinchS) { tx = lerp(2.2, 1.2, k); ty = 0.12; }
    if (tx !== undefined) {
      const s = ch.dough.scale;
      const kk = ease(dt, 14);
      s.set(lerp(s.x, tx, kk), lerp(s.y, ty, kk), lerp(s.z, tx, kk));
      ch.dough.position.y = 0.03 + 0.2 * s.y;
    }
    // the folded shape grows as you pinch
    const shapeKey = pinchS && v.order ? v.order.shape : '';
    if (shapeKey !== ch.shapeKey) {
      if (ch.shapeMesh) ch.board.remove(ch.shapeMesh);
      ch.shapeMesh = shapeKey ? makeFood(shapeKey) : null;
      if (ch.shapeMesh) { ch.shapeMesh.position.y = 0.04; ch.board.add(ch.shapeMesh); }
      ch.shapeKey = shapeKey;
    }
    if (ch.shapeMesh) {
      const s = 0.3 + 1.2 * k;
      ch.shapeMesh.scale.setScalar(lerp(ch.shapeMesh.scale.x, s, ease(dt, 12)));
      ch.dough.visible = k < 0.99;
    }
    // the rolling pin rolls over the dough after each roll
    ch.pinT += dt;
    const rolling = ch.pinT < 0.35;
    const pz = rolling ? Math.sin(ch.pinT / 0.35 * Math.PI) * 0.22 : 0;
    ch.pin.position.set(roll ? 0 : 0.9, roll ? 0 : 0, roll ? pz + 0.0 : -0.25);
    ch.pin.visible = roll && !(v.order && v.order.food === 'tangyuan');
    ch.pin.position.y = roll ? 0.05 + (ch.dough.scale.y * 0.2) : 0;
    setTray(ch, v.tray, v.order);
  }

  function syncChef(ch, i, dt) {
    const p = ch.p;
    ch.modeT += dt;
    ch.jump = Math.max(0, ch.jump - dt);
    const k = ease(dt, 16);
    let mode = ch.mode;
    if (mode !== 'idle' && mode !== 'sig' && mode !== 'five' && ch.modeT > 0.45) { ch.mode = mode = 'idle'; }
    let face = Math.PI;
    if (mode === 'turn') face = 0.0 + (ch.turnX || 0);
    if (mode === 'five') face = ch.x < 0 ? -Math.PI / 2 : Math.PI / 2;
    ch.face = lerp(ch.face, face, ease(dt, 10));
    p.root.rotation.y = ch.face;
    const tt = time * 8;
    if (mode === 'sig') {
      const since = ch.modeT;
      const sig = ch.entry.signature || ['wave'];
      // Teddy: a boxing combo, then jump shots, one every 2.2 s; Tommy: the Y
      const c = since < 1.4 ? -1 : (since - 1.4) % 2.2;
      if (sig[0] === 'boxing') Kit.people.pose(p, c < 0 ? since * 7 : time * 3, c < 0 ? 'boxing' : 'jumpshot', k);
      else Kit.people.pose(p, time * 4, sig[0], k);
      const up = c >= 0 && c < 0.9 ? Math.sin(c / 0.9 * Math.PI) : 0;
      p.root.position.y = sig[0] === 'boxing' ? up * 0.5 : 0;
      if (ch.ball) {
        const fly = Math.max(0, c - 0.45);
        ch.ball.visible = c >= 0 && c < 1.6;
        ch.ball.position.set(ch.x, 2.75 + up * 0.5 + fly * 2.6 - fly * fly * 1.2, -1.0 + fly * 2.2);
      }
    } else if (mode === 'five') {
      Kit.people.pose(p, tt, ch.modeT < 0.5 ? 'jumpshot' : 'wave', k);
    } else if (mode === 'roll') {
      Kit.people.pose(p, tt, 'grab', k);
      p.armL.rotation.x += Math.sin(ch.modeT * 18) * 0.25;
      p.armR.rotation.x += Math.sin(ch.modeT * 18) * 0.25;
    } else if (mode === 'pinch' || mode === 'fill') {
      Kit.people.pose(p, tt, mode === 'fill' ? 'give' : 'grab', k);
      p.armL.rotation.z += Math.sin(ch.modeT * 30) * 0.12;
      p.armR.rotation.z -= Math.sin(ch.modeT * 30) * 0.12;
    } else if (mode === 'turn') {
      Kit.people.pose(p, tt, 'give', k);
    } else if (mode === 'oops') {
      Kit.people.pose(p, tt, 'stand', k);
      p.head.rotation.y = Math.sin(ch.modeT * 20) * 0.3;
    } else {
      Kit.people.pose(p, tt * 0.25, 'stand', k);
      p.head.rotation.y = lerp(p.head.rotation.y, Math.sin(time * 0.7 + i) * 0.15, k);
    }
    if (mode !== 'sig') p.root.position.y = ch.jump > 0 ? Math.sin((0.5 - ch.jump) / 0.5 * Math.PI) * 0.3 : 0;
    if (ch.buddy) syncBuddy(ch, dt);
  }

  // the called brother on his little stool beside the cook
  function buddyIn(ch, entry) {
    if (!ch.buddy || ch.buddy.entry.id !== entry.id) {
      buddyGone(ch);
      const p = Kit.people.build(entry.look);
      const stool = new T.Group();
      cyl(0.28, 0.3, 0.7, lam('#d8261c'), 0, 0.35, 0, stool, 14);
      stool.add(p.root);
      p.root.position.y = 0.7;
      p.root.rotation.y = Math.PI;
      const sx = ch.x + (ch.x <= 0 ? 0.95 : -0.95) * (ch.x === 0 ? -1 : 1);
      stool.position.set(ch.x === 0 ? -1.05 : sx, 0, -1.05);
      stool.scale.setScalar(0.01);
      scene.add(stool);
      ch.buddy = { entry, p, root: stool, t: 0, mode: 'hello', sc: entry.buddyScale || 0.75, out: false };
    }
    ch.buddy.mode = 'hello';
    ch.buddy.t = 0;
    ch.buddy.out = false;
    if (ch.buddy.entry.signature && ch.buddy.entry.signature[0] === 'boxing') {
      if (!ch.buddy.ball) { ch.buddy.ball = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture('🏀') })); ch.buddy.ball.scale.setScalar(0.4); scene.add(ch.buddy.ball); }
    }
  }
  function buddyGone(ch) {
    if (!ch.buddy) return;
    scene.remove(ch.buddy.root);
    if (ch.buddy.ball) scene.remove(ch.buddy.ball);
    ch.buddy = null;
  }
  function buddyMode(ch, mode) { if (ch.buddy) { ch.buddy.mode = mode; ch.buddy.t = 0; } }
  function syncBuddy(ch, dt) {
    const B = ch.buddy;
    B.t += dt;
    const p = B.p, k = ease(dt, 16);
    const target = B.out ? 0.01 : B.sc;
    const s = lerp(B.root.scale.x, target, ease(dt, B.out ? 10 : 7));
    B.root.scale.setScalar(s);
    if (B.out && s < 0.03) { buddyGone(ch); return; }
    const sig = B.entry.signature || ['wave'];
    if (B.mode === 'hello') {
      if (sig[0] === 'boxing') Kit.people.pose(p, B.t < 1.3 ? B.t * 7 : time * 3, B.t < 1.3 ? 'boxing' : 'jumpshot', k);
      else Kit.people.pose(p, time * 4, sig[0], k);
      p.root.position.y = 0.7 + (sig[0] === 'boxing' && B.t > 1.3 ? Math.max(0, Math.sin((B.t - 1.3) * 3.2)) * 0.4 : 0);
      if (B.ball) {
        B.ball.visible = B.t > 1.3 && B.t < 2.6;
        const wp = new T.Vector3();
        B.root.getWorldPosition(wp);
        B.ball.position.set(wp.x, wp.y + 2.3 * s + (B.t > 1.8 ? (B.t - 1.8) * 2 : 0), wp.z + (B.t > 1.8 ? (B.t - 1.8) * 1.5 : 0));
      }
    } else if (B.mode === 'fold') {
      Kit.people.pose(p, time * 8, 'grab', k);
      p.armL.rotation.z += Math.sin(B.t * 26) * 0.15;
      p.armR.rotation.z -= Math.sin(B.t * 26) * 0.15;
      p.root.position.y = 0.7;
      if (B.ball) B.ball.visible = false;
    } else {
      Kit.people.pose(p, time * 6, 'wave', k);
      p.root.position.y = 0.7;
      if (B.ball) B.ball.visible = false;
    }
  }

  function syncGuests(s, dt) {
    for (const g of s.guests) {
      let G1 = guests[g.id];
      if (g.state === 'gone') { if (G1) { scene.remove(G1.a.root); delete guests[g.id]; } continue; }
      if (!G1) {
        const a = makeAnimal(g.kind);
        a.root.scale.setScalar(1.05);
        scene.add(a.root);
        const pos = slotPos[g.slot];
        const side = pos.x < 0 ? -1 : 1;
        a.root.position.set(side * 10, 0, pos.z + 0.6);
        if (g.kind === 'fox' || g.kind === 'frog') {
          const tag = nameTag(Kit.lang.t(g.kind === 'fox' ? 'FOXY' : 'FROGGY'), g.kind === 'fox' ? '#ff9a6b' : '#9be37a');
          tag.position.y = 2.45;
          a.root.add(tag);
        }
        G1 = guests[g.id] = { a, slot: g.slot, side, hop: 0, plate: null, mood: 0 };
      }
      const a = G1.a, pos = slotPos[g.slot], root = a.root;
      const walking = g.state === 'walk' || g.state === 'leave';
      let tx = pos.x, tz = pos.z;
      if (g.state === 'walk') { const k = Math.min(1, g.stateT / DS.shop.WALK); tx = lerp(G1.side * 10, pos.x, 1 - (1 - k) * (1 - k)); tz = lerp(pos.z + 0.6, pos.z, k); }
      if (g.state === 'leave') { const k = Math.min(1, g.stateT / DS.shop.WALK); tx = lerp(pos.x, G1.side * 10, k * k); tz = pos.z + 0.6 * k; }
      root.position.x = tx;
      root.position.z = tz;
      // face the counter; walking, face the way you go
      let ry = Math.atan2(-pos.x * 0.55, 3.2 - pos.z);
      if (g.state === 'walk') ry = -G1.side * Math.PI / 2 * (1 - Math.min(1, g.stateT / DS.shop.WALK * 1.3)) + ry * Math.min(1, g.stateT / DS.shop.WALK * 1.3);
      if (g.state === 'leave') ry = G1.side * Math.PI / 2;
      root.rotation.y = lerp(root.rotation.y, ry, ease(dt, 10));
      G1.hop = Math.max(0, G1.hop - dt);
      let y = 0;
      if (walking) y = Math.abs(Math.sin(time * 11)) * 0.12;
      if (g.state === 'eating') y = Math.abs(Math.sin(time * 6)) * 0.08;
      if (G1.hop > 0) y = Math.sin((1 - G1.hop / 0.7) * Math.PI) * 0.6;
      root.position.y = y;
      // arms: up when happy, a wave goodbye, one forward while eating
      const [aL, aR] = a.arms;
      let l = 0, r = 0, lz = 0, rz = 0;
      if (G1.hop > 0) { l = r = -2.8; }
      else if (g.state === 'eating') { l = -1.3 + Math.sin(time * 6) * 0.3; r = -1.2; }
      else if (g.state === 'leave' && g.result) { r = -2.6; rz = Math.sin(time * 12) * 0.4; }
      else if (g.state === 'wait' || g.state === 'cooking' || g.state === 'ready') { l = Math.sin(time * 2 + g.id) * 0.1; r = -Math.sin(time * 2 + g.id) * 0.1; }
      else if (walking) { l = Math.sin(time * 11) * 0.6; r = -l; }
      aL.rotation.x = lerp(aL.rotation.x, l, ease(dt, 14)); aR.rotation.x = lerp(aR.rotation.x, r, ease(dt, 14));
      aL.rotation.z = lerp(aL.rotation.z, lz, ease(dt, 14)); aR.rotation.z = lerp(aR.rotation.z, rz, ease(dt, 14));
      // waiting a long time: a little droop; grumpy: a head shake
      const hungry = g.maxPatience ? 1 - g.patience / g.maxPatience : 0;
      a.head.rotation.x = lerp(a.head.rotation.x, g.state === 'wait' ? hungry * 0.25 : 0, ease(dt, 6));
      a.head.rotation.y = g.state === 'leave' && g.result === 'left' ? Math.sin(time * 14) * 0.25 : Math.sin(time * 1.3 + g.id) * 0.12;
      // the plate while eating
      if (G1.plate) {
        const P = G1.plate;
        if (!P.flying) {
          P.obj.position.set(root.position.x + Math.sin(root.rotation.y) * 0.55, 1.15 + root.position.y, root.position.z + Math.cos(root.rotation.y) * 0.55);
          // eat them one by one
          const eaten = Math.floor(Math.min(1, g.stateT / (DS.shop.EAT * 0.9)) * P.items.length);
          P.items.forEach((it, i) => { it.visible = i >= eaten; });
        }
        if (g.state === 'leave' || g.state === 'gone') { scene.remove(P.obj); G1.plate = null; }
      }
    }
  }

  function syncCookers(s, dt) {
    for (const c in cookers) {
      const K = cookers[c];
      if (!K.on) continue;
      const B = s.cookers[c];
      if (!B) { if (K.items.length) clearCooker(K); continue; }
      if (K.gid !== B.gid) {
        clearCooker(K);
        K.gid = B.gid;
        const n = B.items.length;
        B.items.forEach((d, i) => {
          const f = makeFood(d.shape);
          const a = (i / n) * Math.PI * 2;
          f.position.set(Math.cos(a) * (n > 1 ? 0.24 : 0), K.surface, Math.sin(a) * (n > 1 ? 0.2 : 0));
          f.rotation.y = a;
          f.userData.a = a;
          K.group.add(f);
          K.items.push(f);
        });
        K.cooked = false;
      }
      if (B.ready && !K.cooked) { K.cooked = true; for (const it of K.items) cookFood(it, B.cook); }
      // bob in the water, sizzle in the wok; the steamer's lid lifts when it's ready
      K.items.forEach((it, i) => {
        if (c === 'pot') it.position.y = K.surface + 0.02 + Math.sin(time * 5 + i * 1.7) * 0.03;
        if (c === 'wok') { it.position.y = K.surface + Math.abs(Math.sin(time * 18 + i)) * 0.02; it.rotation.y = it.userData.a + Math.sin(time * 9 + i) * 0.1; }
        if (c === 'steamer') it.visible = B.ready;
      });
      if (K.lid) K.lid.position.y = lerp(K.lid.position.y, B.ready ? 1.25 : 0.63, ease(dt, 6));
      if (K.lid) K.lid.position.x = lerp(K.lid.position.x, B.ready ? 0.55 : 0, ease(dt, 6));
      // steam
      K.steamT = (K.steamT || 0) + dt;
      const every = B.ready ? 0.09 : 0.22;
      if (K.steamT > every) {
        K.steamT = 0;
        const wp = new T.Vector3(K.group.position.x + (Math.random() - 0.5) * 0.6, K.group.position.y + 0.7, K.group.position.z + (Math.random() - 0.5) * 0.4);
        puff(wp, c === 'wok' && !B.ready ? '#ffe2a0' : '#ffffff', B.ready ? 0.55 : 0.4, 1.2);
      }
    }
  }

  function puff(pos, color, size, life, vel) {
    const m = new T.Sprite(new T.SpriteMaterial({ map: G.dotTexture(), color, transparent: true, opacity: 0.8, depthWrite: false }));
    m.position.copy(pos);
    m.scale.setScalar(size * 0.5);
    scene.add(m);
    puffs.push({ obj: m, t: 0, life, size, vel: vel || new T.Vector3((Math.random() - 0.5) * 0.3, 0.9, 0.1) });
  }

  function sync(s, views, dt) {
    time += dt;
    chefs.forEach((ch, i) => { if (views[i]) syncBoard(ch, views[i], dt); syncChef(ch, i, dt); });
    if (s) { syncGuests(s, dt); syncCookers(s, dt); }
    // flying things: plates to guests, treats to the cook
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      f.obj.position.lerpVectors(f.from, f.to, k);
      f.obj.position.y += Math.sin(k * Math.PI) * f.arc;
      if (f.spin) f.obj.rotation.y += dt * f.spin;
      if (k >= 1) {
        flying.splice(i, 1);
        if (f.done) f.done(); else scene.remove(f.obj);
      }
    }
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.t += dt;
      const k = p.t / p.life;
      p.obj.position.addScaledVector(p.vel, dt);
      p.obj.scale.setScalar(p.size * (0.5 + k));
      p.obj.material.opacity = 0.8 * (1 - k);
      if (k >= 1) { scene.remove(p.obj); p.obj.material.dispose(); puffs.splice(i, 1); }
    }
    // the lanterns sway, the lion bobs, the fire flickers
    decor.lanterns.forEach((l, i) => { l.rotation.z = Math.sin(time * 1.3 + i) * 0.06; });
    if (decor.lionHead) { decor.lionHead.rotation.x = Math.sin(time * 3) * 0.12; decor.lionHead.position.y = 1.4 + Math.abs(Math.sin(time * 3)) * 0.1; }
    decor.fire.forEach((f, i) => { f.scale.y = 0.8 + Math.sin(time * 13 + i * 2) * 0.2; f.material.color.setHSL(0.07 + Math.sin(time * 7 + i) * 0.02, 1, 0.55); });
    if (night && Math.random() < dt * 1.2) firework();
  }

  function firework() {
    const colors = ['#ffd400', '#ff3d7f', '#18d4ff', '#7df7c8', '#ff8a1f'];
    const c = colors[Math.floor(Math.random() * colors.length)];
    const x = (Math.random() - 0.5) * 2.4, y = 3.7 + Math.random() * 0.5;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      puff(new T.Vector3(x, y, -3.45), c, 0.18, 0.9, new T.Vector3(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0));
    }
  }

  // ---------------------------------------------------------------- reactions to the shop's events
  function chefMode(i, mode, extra) {
    const ch = chefs[i];
    if (!ch || ch.mode === 'sig') return;
    ch.mode = mode;
    ch.modeT = 0;
    if (extra) Object.assign(ch, extra);
  }

  function fx(e, s) {
    const ch = chefs[e.p];
    switch (e.type) {
      case 'roll': if (ch) { ch.pinT = 0; chefMode(e.p, 'roll'); puff(ch.board.position.clone().add(new T.Vector3(0, 0.15, 0)), '#ffffff', 0.25, 0.5); } break;
      case 'fill': chefMode(e.p, 'fill'); break;
      case 'shape': case 'pinch': chefMode(e.p, 'pinch'); break;
      case 'made':
        if (ch) {
          if (e.byBrother && ch.buddy) buddyMode(ch, 'fold');
          if (!e.byBrother) ch.jump = 0.3;
          sparkle(ch.tray.position.clone().add(new T.Vector3(0, 0.25, 0)), e.byBrother ? '#ffb02e' : '#ffffff');
        }
        break;
      case 'oops': chefMode(e.p, 'oops'); break;
      case 'cook': {
        const K = cookers[e.cooker];
        if (ch && K) {
          chefMode(e.p, 'turn', { turnX: (K.group.position.x - ch.x) * -0.25 });
          // the tray's dumplings fly into the pot
          const items = (s && s.cookers[e.cooker]) ? s.cookers[e.cooker].items : [];
          items.forEach((d, i) => {
            const f = makeFood(d.shape);
            scene.add(f);
            flying.push({ obj: f, from: ch.tray.position.clone(), to: new T.Vector3(K.group.position.x, K.group.position.y + 0.6, K.group.position.z), t: -i * 0.08, dur: 0.45, arc: 1.2, spin: 6 });
          });
          setTray(ch, 0, null);
        }
        break;
      }
      case 'serve': {
        const K = cookers[e.cooker], g = s && s.guests[e.gid], G1 = guests[e.gid];
        if (ch) chefMode(e.p, 'turn', { turnX: K ? (K.group.position.x - ch.x) * -0.25 : 0 });
        if (K && g && G1) {
          const plate = new T.Group();
          const big = g.order.food === 'tangyuan';
          const base = big ? cyl(0.3, 0.2, 0.18, lam('#e8f1ff'), 0, 0.09, 0, plate, 20) : cyl(0.36, 0.3, 0.05, lam('#ffffff'), 0, 0.02, 0, plate, 20);
          void base;
          cyl(0.37, 0.37, 0.02, lam('#2a7bd6'), 0, big ? 0.17 : 0.05, 0, plate, 20).scale.set(1, 1, 1);
          const items = [];
          K.items.forEach((it, i) => {
            const n = K.items.length;
            const a = (i / n) * Math.PI * 2;
            const f = makeFood(it.userData.shape || g.order.shape);
            cookFood(f, g.order.cook);
            f.scale.setScalar(0.8);
            f.position.set(Math.cos(a) * (n > 1 ? 0.15 : 0), big ? 0.1 : 0.04, Math.sin(a) * (n > 1 ? 0.13 : 0));
            plate.add(f);
            items.push(f);
          });
          clearCooker(K);
          scene.add(plate);
          const P = { obj: plate, items, flying: true };
          G1.plate = P;
          const to = new T.Vector3(G1.a.root.position.x, 1.2, G1.a.root.position.z + 0.5);
          flying.push({ obj: plate, from: new T.Vector3(K.group.position.x, K.group.position.y + 0.8, K.group.position.z), to, t: 0, dur: 0.7, arc: 1.4, done: () => { P.flying = false; G1.hop = 0.7; } });
        }
        break;
      }
      case 'lucky': {
        const G1 = guests[e.gid];
        if (G1) {
          const coin = new T.Sprite(new T.SpriteMaterial({ map: coinTexture(), transparent: true }));
          coin.scale.setScalar(0.7);
          scene.add(coin);
          const from = G1.a.root.position.clone().add(new T.Vector3(0, 2.0, 0));
          flying.push({ obj: coin, from, to: from.clone().add(new T.Vector3(0, 1.2, 0)), t: -0.7, dur: 1.4, arc: 0.3 });
          for (let i = 0; i < 14; i++) sparkle(from, '#ffd400');
        }
        break;
      }
      case 'take': break;
      case 'leave': { const G1 = guests[e.gid]; if (G1 && G1.plate) { scene.remove(G1.plate.obj); G1.plate = null; } break; }
      default: break;
    }
  }

  // the lucky coin: the drawn coin from js/icons.js once its picture decodes, a plain gold disc until then
  function coinTexture() {
    const [c, g] = makeCanvas(128, 128);
    g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.fill();
    const tex = toTexture(c);
    const img = new Image();
    img.onload = () => { g.clearRect(0, 0, 128, 128); g.drawImage(img, 0, 0); tex.needsUpdate = true; };
    img.src = DS.icons.get('coin');
    return tex;
  }

  function sparkle(pos, color) {
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      puff(pos.clone(), color, 0.16, 0.6, new T.Vector3(Math.cos(a) * 1.2, 1 + Math.random(), Math.sin(a) * 0.6));
    }
  }

  // a treat thrown from the brother to the cook
  function toss(i, emoji) {
    const ch = chefs[i];
    if (!ch || !ch.buddy) return;
    const sp = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture(emoji), transparent: true }));
    sp.scale.setScalar(0.45);
    scene.add(sp);
    const from = new T.Vector3();
    ch.buddy.root.getWorldPosition(from);
    from.y += 1.6;
    flying.push({ obj: sp, from, to: new T.Vector3(ch.x, 2.2, -1.0), t: 0, dur: 0.6, arc: 0.8, done: () => { scene.remove(sp); ch.jump = 0.5; } });
  }

  function signature(i) {
    const ch = chefs[i];
    if (!ch) return;
    ch.mode = 'sig';
    ch.modeT = 0;
    if ((ch.entry.signature || [])[0] === 'boxing' && !ch.ball) {
      ch.ball = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture('🏀') }));
      ch.ball.scale.setScalar(0.45);
      ch.ball.visible = false;
      scene.add(ch.ball);
    }
  }
  function endSignature() {
    for (const ch of chefs) { if (ch.mode === 'sig') { ch.mode = 'idle'; ch.modeT = 0; } if (ch.ball) ch.ball.visible = false; ch.p.root.position.y = 0; }
  }
  function highFive() {
    for (const ch of chefs) { ch.mode = 'five'; ch.modeT = 0; }
    setTimeout(() => { for (const ch of chefs) if (ch.mode === 'five') { ch.mode = 'idle'; ch.modeT = 0; } }, 1100);
    sparkle(new T.Vector3(0, 2.6, -1.0), '#ffd400');
    sparkle(new T.Vector3(0, 2.6, -1.0), '#ffffff');
  }

  function render() { renderer.render(scene, camera); }

  const cookerTop = (c) => (cookers[c] ? cookers[c].top : null);
  function guestTop(gid) { const G1 = guests[gid]; return G1 ? G1.a.root.position.clone().add(new T.Vector3(0, 2.3, 0)) : null; }
  function boardTop(i) { const ch = chefs[i]; return ch ? ch.board.position.clone().add(new T.Vector3(0, 0.3, 0)) : null; }

  DS.world = {
    init, setup, sync, fx, render, resize, setPads, project, cookerTop, guestTop, boardTop, relabel,
    chefMode, signature, endSignature, highFive, toss,
    buddyIn: (i, entry) => chefs[i] && buddyIn(chefs[i], entry),
    buddyMode: (i, m) => chefs[i] && buddyMode(chefs[i], m),
    buddyOut: (i) => { if (chefs[i] && chefs[i].buddy) chefs[i].buddy.out = true; },
    hasBuddy: (i) => !!(chefs[i] && chefs[i].buddy),
    makeAnimal, makeFood, KINDS,
  };
})();
