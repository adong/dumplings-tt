/* TT Dumpling Shop: the game. Home (pick a day, who cooks, how hard), the story card, the shop upgrades, a shop day
   (the orders along the top, each cook's picture buttons at the bottom, the stove timers, the brother's help) and the
   results. Exposes window.game for tests:
     game.start({ day, who, levels, seed })   who: 'teddy' | 'tommy' | 'both'; levels: { teddy, tommy }: 'easy' | 'normal'
     game.step(seconds)        advance at 60 steps a second (works in a hidden tab), then draw
     game.hold(true)           only game.step() moves time
     game.press(p, i) / game.serve(p) / game.buddy() / game.pause(bool) / game.home() / game.story(open) / game.shop(open)
     game.autopilot(kind)      'perfect' | 'kid' | 'idle' | null
     game.check()              the headless checks, with their proofs (js/checks.js)
     game.info()               state, the day, guests, coins, every board */
(function () {
  'use strict';
  const DS = window.DS;
  const D = DS.data;
  const $ = (id) => document.getElementById(id);
  const tr = (s) => Kit.lang.t(s);
  const sfx = DS.sfx;

  // ---------------------------------------------------------------- saved choices, coins and upgrades
  const STORE = 'dumplingShopTT.v1';
  const save = { day: 0, who: 'teddy', level: { teddy: 'easy', tommy: 'easy' }, stars: {}, best: {}, unlocked: 1, bank: null, up: {} };
  try { Object.assign(save, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) { /* storage blocked */ }
  function persist() { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch (e) { /* storage blocked */ } }
  const bank = DS.shop.bank(save.bank);

  const ROSTER = { teddy: Kit.roster.get('teddy'), tommy: Kit.roster.get('tommy') };
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE BOX'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];
  const STORY = [
    { art: '👨‍👩‍👦🏠🎆', text: 'At Chinese New Year, the whole family comes home. On New Year\'s Eve everyone sits down together for a big, happy dinner.' },
    { art: '🥟🤲😋', text: 'Before dinner, everyone makes jiaozi together: roll the wrapper thin, put in the filling, and pinch it closed.' },
    { art: '🥟🪙✨', text: 'Jiaozi look like little gold ingots, called yuanbao, so they wish everyone a rich new year. Some families hide a coin in one dumpling. Whoever finds it gets extra luck!' },
    { art: '🌸🥢🔥', text: 'Spring rolls look like little gold bars and welcome the spring. Soft, fluffy baozi buns come out of the bamboo steamer.' },
    { art: '🏮🌕🥣', text: 'Fifteen days later is the Lantern Festival. Families eat round, sweet tangyuan, because round means everyone is together.' },
  ];
  const SLOT_ORDER = [2, 0, 1, 3]; // order cards left to right, like the guests at the counter
  const BUSY = { pot: 'THE POT IS FULL! SERVE FIRST!', steamer: 'THE STEAMER IS FULL! SERVE FIRST!', wok: 'THE WOK IS FULL! SERVE FIRST!' };

  // ---------------------------------------------------------------- state
  let state = 'loading'; // home | open | play | finish | results
  let paused = false, held = false, storyOpen = false, shopOpen = false, storyPage = 0;
  let shop = null, players = ['teddy'];
  let pilot = null, pilotKind = null;
  let seq = null, fiveCool = 0, streak = 0;
  let openT = 0, finishT = 0, resultsShown = false, lastResult = null;
  let portraits = {};
  let lastNow = 0, clock = 0;
  const lastPress = [0, 0];
  const toastAt = {};
  let pads = [];
  const cards = {};
  const timers = {};

  // ---------------------------------------------------------------- setup
  function init() {
    DS.world.init($('game'));
    portraits = Kit.portraits([ROSTER.teddy, ROSTER.tommy], { size: 128 });
    homeUI();
    hudUI();
    window.addEventListener('resize', () => { DS.world.resize(); layout(); });
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', () => Kit.sound.init(), { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game.autoPause && (state === 'play' || state === 'open')) setPause(true);
    });
    Kit.sound.onMute((m) => { $('muteBtn').textContent = m ? '🔇' : '🔊'; });
    $('muteBtn').textContent = Kit.sound.isMuted() ? '🔇' : '🔊';
    Kit.lang.onChange(() => { DS.world.relabel(); refreshHome(); renderShop(); if (state === 'home') sceneForHome(); });
    goHome();
    $('loading').classList.add('hidden');
    setTimeout(() => $('loading').remove(), 500);
    lastNow = performance.now();
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- home
  function homeUI() {
    const words = window.DS_TITLE.split(' ');
    $('logo').querySelector('small').textContent = words.slice(0, -2).join(' ');
    $('logo').querySelector('big').textContent = words.slice(-2).join(' ');
    const days = $('days');
    D.DAYS.forEach((d, i) => {
      const b = document.createElement('button');
      b.className = 'day';
      b.setAttribute('role', 'radio');
      b.innerHTML = `<span class="pic">${DS.icons.html(d.icon)}</span><span class="nm"></span><span class="st"></span>`;
      b.querySelector('.nm').textContent = d.name;
      b.addEventListener('click', () => { if (i < save.unlocked) { save.day = i; persist(); refreshHome(); sceneForHome(); Kit.sound.click(); } else sfx.oops(); });
      days.appendChild(b);
    });
    for (const b of $('who').querySelectorAll('button')) {
      const imgs = b.querySelectorAll('img');
      if (b.dataset.who === 'both') { imgs[0].src = portraits.teddy; imgs[1].src = portraits.tommy; } else imgs[0].src = portraits[b.dataset.who];
      b.addEventListener('click', () => { save.who = b.dataset.who; persist(); refreshHome(); sceneForHome(); Kit.sound.click(); });
    }
    $('storyBtn').addEventListener('click', () => openStory(true));
    $('shopBtn').addEventListener('click', () => openShop(true));
    $('playBtn').addEventListener('click', () => startDay());
    $('sPrev').addEventListener('click', () => storyGo(-1));
    $('sNext').addEventListener('click', () => storyGo(1));
    $('sClose').addEventListener('click', () => openStory(false));
    $('shopClose').addEventListener('click', () => openShop(false));
    $('pResume').addEventListener('click', () => setPause(false));
    $('pRestart').addEventListener('click', () => { setPause(false); startDay(); });
    $('pHome').addEventListener('click', () => { setPause(false); goHome(); });
    $('rAgain').addEventListener('click', () => startDay());
    $('rNext').addEventListener('click', () => { if (save.day + 1 < save.unlocked) { save.day++; persist(); } startDay(); });
    $('rShop').addEventListener('click', () => openShop(true));
    $('rHome').addEventListener('click', () => goHome());
  }

  function refreshHome() {
    const btns = $('days').querySelectorAll('.day');
    D.DAYS.forEach((d, i) => {
      const b = btns[i];
      b.classList.toggle('on', i === save.day);
      b.classList.toggle('lock', i >= save.unlocked);
      b.setAttribute('aria-checked', i === save.day ? 'true' : 'false');
      const n = save.stars[d.id] || 0;
      b.querySelector('.st').textContent = i < save.unlocked ? '⭐'.repeat(n) : '';
    });
    for (const b of $('who').querySelectorAll('button')) b.classList.toggle('on', b.dataset.who === save.who);
    const lv = $('lvls');
    lv.innerHTML = '';
    const ids = save.who === 'both' ? ['teddy', 'tommy'] : [save.who];
    for (const id of ids) {
      const g = document.createElement('div');
      g.className = 'lvl';
      g.innerHTML = `<img alt="" src="${portraits[id]}"><button data-l="easy" aria-label="Easy"><span>🐣</span>EASY</button><button data-l="normal" aria-label="Normal"><span>🔥</span>NORMAL</button>`;
      for (const b of g.querySelectorAll('button')) {
        b.classList.toggle('on', save.level[id] === b.dataset.l);
        b.addEventListener('click', () => { save.level[id] = b.dataset.l; persist(); refreshHome(); Kit.sound.click(); });
      }
      lv.appendChild(g);
    }
    $('shopCoins').textContent = `🪙 ${bank.wallet}`;
  }

  function sceneForHome() {
    const ids = save.who === 'both' ? ['teddy', 'tommy'] : [save.who];
    players = ids;
    shop = null;
    DS.world.setup({ day: D.DAYS[save.day], players: ids, upgrades: save.up });
    layout();
  }

  function goHome() {
    state = 'home';
    paused = false;
    pilot = null;
    seq = null;
    clearHud();
    DS.world.endSignature();
    for (const id of ['hud', 'pads', 'buddyBtn', 'fiveBtn', 'results', 'pause']) $(id).classList.add('hidden');
    $('home').classList.remove('hidden');
    refreshHome();
    sceneForHome();
    Kit.sound.music('title');
  }

  // ---------------------------------------------------------------- a shop day
  function startDay(seed) {
    Kit.sound.init();
    if (save.day >= save.unlocked) save.day = 0;
    players = save.who === 'both' ? ['teddy', 'tommy'] : [save.who];
    shop = DS.shop.create({
      day: save.day, players: players.map((id) => ({ who: id, level: save.level[id] })),
      seed: seed === undefined ? Math.floor(Math.random() * 1e6) : seed, upgrades: save.up,
    });
    DS.world.setup({ day: D.DAYS[save.day], players, upgrades: save.up });
    DS.world.endSignature();
    if (pilotKind) pilot = DS.bots.make(pilotKind, shop, 9);
    clearHud();
    seq = null;
    streak = 0;
    paused = false;
    resultsShown = false;
    lastResult = null;
    for (const id of ['home', 'results', 'pause', 'story', 'shop']) $(id).classList.add('hidden');
    storyOpen = shopOpen = false;
    $('hud').classList.remove('hidden');
    padsUI();
    $('buddyBtn').classList.toggle('hidden', players.length > 1);
    $('fiveBtn').classList.toggle('hidden', players.length < 2);
    if (players.length === 1) $('buddyFace').src = portraits[Kit.roster.buddyFor(players[0])];
    state = 'open';
    openT = 0;
    big('🏮 OPEN!');
    sfx.open();
    Kit.sound.music('play');
    lastPress[0] = lastPress[1] = clock;
    layout();
  }

  function finish() {
    state = 'finish';
    finishT = 0;
    const r = shop.result;
    const day = D.DAYS[save.day];
    bank.deposit(save.day, r.coins);
    save.bank = bank.save();
    const before = save.best[day.id] || 0;
    const newBest = r.coins > before;
    if (newBest) save.best[day.id] = r.coins;
    save.stars[day.id] = Math.max(save.stars[day.id] || 0, r.stars);
    if (r.served > 0) save.unlocked = Math.min(D.DAYS.length, Math.max(save.unlocked, save.day + 2));
    persist();
    lastResult = Object.assign({ newBest, lucky: shop.ledger.some((l) => l.kind === 'lucky') }, r);
    players.forEach((_, i) => DS.world.signature(i));
    burst(r.stars >= 2 ? 160 : 90);
    sfx.win(r.stars);
    Kit.sound.music('over');
    for (const id of ['pads', 'buddyBtn', 'fiveBtn']) $(id).classList.add('hidden');
    big(r.stars === 3 ? '🎉 ALL SERVED!' : '🌙 CLOSING TIME!');
    layout();
  }

  function showResults() {
    resultsShown = true;
    state = 'results';
    const r = lastResult;
    $('rHead').textContent = ['LET\'S TRY AGAIN!', 'GOOD TRY!', 'GREAT JOB!', 'WONDERFUL!'][r.stars];
    $('rStars').innerHTML = [0, 1, 2].map((i) => `<i class="${i < r.stars ? '' : 'off'}" style="animation-delay:${0.15 + i * 0.2}s">⭐</i>`).join('');
    const rows = [
      ['🥟', 'GUESTS SERVED', `${r.served} / ${r.total}`],
      ['🪙', 'COINS TODAY', `+${r.coins}`],
    ];
    if (r.lucky) rows.push(['✨', 'LUCKY COIN FOUND!', '']);
    rows.push(['🏪', 'COINS IN THE SHOP', `${bank.wallet}`]);
    $('rRows').innerHTML = '';
    for (const [e, label, val] of rows) {
      const d = document.createElement('div');
      d.className = 'rrow';
      d.innerHTML = '<span></span><span class="lb"></span><b></b>';
      d.children[0].textContent = e;
      d.children[1].textContent = label;
      d.children[2].textContent = val;
      if (label === 'COINS TODAY' && r.newBest) { const n = document.createElement('span'); n.className = 'rnew'; n.textContent = 'NEW BEST!'; d.insertBefore(n, d.children[2]); }
      $('rRows').appendChild(d);
    }
    $('rNext').classList.toggle('hidden', save.day + 1 >= save.unlocked);
    $('results').classList.remove('hidden');
  }

  // ---------------------------------------------------------------- the brother (1P) and the high five (2P)
  function callBuddy() {
    if (!shop || (state !== 'play' && state !== 'open') || paused) return;
    Kit.sound.init();
    if (players.length > 1) { highFive(); return; }
    const entry = Kit.roster.get(Kit.roster.buddyFor(players[0]));
    DS.world.buddyIn(0, entry);
    sfx.buddy();
    const boxer = (entry.signature || [])[0] === 'boxing';
    seq = { t: 0, entry, stage: 0, sig: boxer ? 2.5 : 1.5 };
    $('buddyBtn').classList.add('here');
  }
  function seqTick(dt) {
    if (!seq) return;
    seq.t += dt;
    const name = seq.entry.name.toUpperCase();
    if (seq.stage === 0 && seq.t >= 0.8) {
      const [emoji, item] = TREATS[Math.floor(Math.random() * TREATS.length)];
      DS.world.toss(0, emoji);
      toast(`${emoji} ${item} FROM ${name}!`, 'treat');
      seq.stage = 1;
    } else if (seq.stage === 1 && seq.t >= seq.sig) {
      toast(`${name} SAYS: I'LL FOLD THE NEXT THREE!`, 'buddy');
      shop.helper(0, 3);
      DS.world.buddyMode(0, 'fold');
      seq.stage = 2;
    } else if (seq.stage === 2 && shop.players[0].helper.left === 0) {
      seq.stage = 3;
      seq.t3 = seq.t;
    } else if (seq.stage === 3 && seq.t - seq.t3 > 1.0) {
      DS.world.buddyMode(0, 'bye');
      seq.stage = 4;
    } else if (seq.stage === 4 && seq.t - seq.t3 > 2.2) {
      DS.world.buddyOut(0);
      $('buddyBtn').classList.remove('here');
      seq = null;
    }
  }
  function highFive() {
    if (fiveCool > 0) return;
    fiveCool = 1.2;
    DS.world.highFive();
    sfx.five();
    toast('✋ HIGH FIVE!', 'good');
  }

  // ---------------------------------------------------------------- the boards: picture buttons along the bottom
  function padsUI() {
    const root = $('pads');
    root.innerHTML = '';
    pads = players.map((id, p) => {
      const two = players.length > 1;
      const el = document.createElement('div');
      el.className = 'panel';
      if (two) el.style[p === 0 ? 'left' : 'right'] = 'max(8px, var(--safe-l))';
      else { el.style.left = '50%'; el.style.transform = 'translateX(-50%)'; }
      el.innerHTML = `<div class="step">${two ? `<img alt="" src="${portraits[id]}" style="width:30px;height:30px;border-radius:50%;border:2px solid #fff">` : ''}<span class="lbl"></span><span class="pips"></span></div><div class="tray"></div><div class="row"></div>`;
      root.appendChild(el);
      const P = { el, id, key: '', opts: [], serve: null, lbl: el.querySelector('.lbl'), pips: el.querySelector('.pips'), tray: el.querySelector('.tray'), row: el.querySelector('.row') };
      const sv = document.createElement('button');
      sv.className = 'serve';
      sv.setAttribute('aria-label', 'Serve');
      sv.innerHTML = `🍽️<kbd>${two ? (p === 0 ? 'W' : '↑') : '↵'}</kbd>`;
      sv.addEventListener('pointerdown', (e) => { e.preventDefault(); serve(p); });
      P.serve = sv;
      return P;
    });
    $('pads').classList.remove('hidden');
  }

  const KEYCAPS = { one: ['1', '2', '3'], teddy: ['A', 'S', 'D'], tommy: ['←', '↓', '→'] };
  function optPicture(v, o) {
    switch (v.stage) {
      case 'roll': return DS.icons.html(o.key === 'knead' ? 'knead' : save.up.pin ? 'goldpin' : 'pin');
      case 'fill': return DS.icons.html(D.FILLINGS[o.key]);
      case 'shape': return DS.icons.html(o.key);
      case 'pinch': return DS.icons.html(v.order.shape) + '<span class="badge">🤏</span>';
      case 'cook': return DS.icons.html(o.key);
      default: return '';
    }
  }
  function stepLabel(v, p) {
    switch (v.stage) {
      case 'roll': return v.order.food === 'tangyuan' ? 'ROLL A DOUGH BALL!' : 'ROLL THE WRAPPER!';
      case 'fill': return 'ADD THE FILLING!';
      case 'shape': return 'PICK THE SHAPE!';
      case 'pinch': return D.SHAPES[v.order.shape].verb;
      case 'cook': return v.busy ? BUSY[D.COOKS[v.order.cook].cooker] : 'COOK IT!';
      default: return shop && shop.ready(p).length ? 'SERVE THE PLATE!' : 'WAITING FOR GUESTS…';
    }
  }

  function updatePads() {
    if (!shop) return;
    pads.forEach((P, p) => {
      const v = shop.view(p);
      const key = `${v.stage}|${v.gid}|${v.opts.map((o) => o.key).join(',')}|${v.tray}`;
      if (key !== P.key) {
        P.key = key;
        P.row.innerHTML = '';
        const caps = players.length > 1 ? KEYCAPS[p === 0 ? 'teddy' : 'tommy'] : KEYCAPS.one;
        P.opts = v.opts.map((o, i) => {
          const b = document.createElement('button');
          b.className = 'opt';
          b.innerHTML = optPicture(v, o) + `<kbd>${caps[i]}</kbd>`;
          b.setAttribute('aria-label', optName(v, o));
          b.addEventListener('pointerdown', (e) => { e.preventDefault(); press(p, i); });
          P.row.appendChild(b);
          return b;
        });
        P.row.appendChild(P.serve);
        // the tray: one little picture for each dumpling on the plate
        P.tray.innerHTML = '';
        if (v.order) {
          const src = DS.icons.get(v.order.shape);
          for (let i = 0; i < v.count; i++) { const im = document.createElement('img'); im.src = src; im.alt = ''; P.tray.appendChild(im); }
        }
        P.tray.style.display = v.order ? '' : 'none';
      }
      const lbl = stepLabel(v, p);
      if (P.lbl.dataset.en !== lbl) { P.lbl.dataset.en = lbl; P.lbl.textContent = lbl; }
      const pipKey = v.need > 1 && (v.stage === 'roll' || v.stage === 'pinch') ? `${v.prog}/${v.need}` : '';
      if (P.pips.dataset.k !== pipKey) {
        P.pips.dataset.k = pipKey;
        P.pips.innerHTML = pipKey ? Array.from({ length: v.need }, (_, i) => `<i class="${i < v.prog ? 'on' : ''}"></i>`).join('') : '';
      }
      P.tray.querySelectorAll('img').forEach((im, i) => im.classList.toggle('on', i < v.tray));
      // a hint for the little one: on EASY the right picture glows after a moment
      const easy = save.level[players[p]] === 'easy';
      const hint = easy && clock - lastPress[p] > 2.5;
      v.opts.forEach((o, i) => P.opts[i] && P.opts[i].classList.toggle('hint', hint && o.right && v.opts.length > 1));
      P.serve.classList.toggle('on', shop.ready(p).length > 0);
    });
  }
  function optName(v, o) {
    if (v.stage === 'fill') return D.FILLINGS[o.key].name;
    if (v.stage === 'shape') return D.SHAPES[o.key].name;
    if (v.stage === 'cook') return D.COOKS[o.key].name;
    if (v.stage === 'pinch') return 'PINCH';
    return o.key === 'knead' ? 'ROLL' : 'ROLL';
  }

  function press(p, i) {
    if (!shop || state !== 'play' || paused) return;
    Kit.sound.init();
    lastPress[p] = clock;
    const r = shop.press(p, i);
    const b = pads[p] && pads[p].opts[i];
    if (b) {
      b.classList.add('down');
      setTimeout(() => b.classList.remove('down'), 110);
      if (r === 'oops') { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); }
    }
  }
  function serve(p, cooker) {
    if (!shop || state !== 'play' || paused) return;
    Kit.sound.init();
    lastPress[p] = clock;
    if (!shop.serve(p, cooker)) sfx.busy();
  }

  // ---------------------------------------------------------------- the HUD: order cards, stove timers, coins
  function hudUI() {
    $('pauseBtn').addEventListener('click', () => setPause(!paused));
    $('muteBtn').addEventListener('click', () => Kit.sound.toggleMute());
    $('buddyBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); callBuddy(); });
    $('fiveBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); callBuddy(); });
  }
  function clearHud() {
    for (const id in cards) { cards[id].remove(); delete cards[id]; }
    for (const c in timers) { timers[c].remove(); delete timers[c]; }
    $('toasts').innerHTML = '';
  }

  function updateHud() {
    if (!shop) return;
    $('coins').textContent = `🪙 ${shop.coins}`;
    const live = new Set();
    const showing = shop.guests.filter((g) => g.state === 'wait' || g.state === 'cooking' || g.state === 'ready');
    showing.sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
    showing.forEach((g, i) => {
      live.add(String(g.id));
      let c = cards[g.id];
      if (!c) {
        c = cards[g.id] = document.createElement('div');
        c.className = 'card';
        const od = g.order;
        c.innerHTML = `<span class="face"></span><div class="plate"><span class="pic">${DS.icons.html(od.shape)}</span><b>×${od.count}</b></div>` +
          `<div class="with"><span>${DS.icons.html(D.FILLINGS[od.filling])}</span><span>${DS.icons.html(od.cook)}</span></div><span class="who"></span><span class="bar"><i></i></span>`;
        c.querySelector('.face').textContent = D.GUEST_EMOJI[g.kind] || '🐼';
        c.setAttribute('aria-label', `${od.count} ${D.FILLINGS[od.filling].name} ${D.FOODS[od.food].name}`);
        $('orders').appendChild(c);
      }
      c.style.order = i;
      const f = g.patience / g.maxPatience;
      const bar = c.querySelector('.bar i');
      bar.style.transform = `scaleX(${f.toFixed(3)})`;
      bar.classList.toggle('low', f < 0.35);
      const who = c.querySelector('.who');
      const taker = g.state === 'wait' && g.taker !== null ? players[g.taker] : null;
      const whoKey = taker || (g.state === 'cooking' ? 'cook' : '');
      if (who.dataset.k !== whoKey) {
        who.dataset.k = whoKey;
        who.innerHTML = taker ? `<img alt="" src="${portraits[taker]}">` : g.state === 'cooking' ? '♨️' : '';
      }
      c.classList.toggle('mine', taker !== null);
      c.classList.toggle('ready', g.state === 'ready');
    });
    for (const id in cards) {
      if (!live.has(id)) {
        const c = cards[id];
        delete cards[id];
        c.classList.add('gone');
        setTimeout(() => c.remove(), 320);
      }
    }
    // timers over the stove, and the plate to tap when it's ready
    for (const c of ['pot', 'steamer', 'wok']) {
      const B = shop.cookers[c];
      let el = timers[c];
      if (!B) { if (el) { el.remove(); delete timers[c]; } continue; }
      if (!el) {
        el = timers[c] = document.createElement('button');
        el.className = 'timer';
        el.setAttribute('aria-label', 'Serve');
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); serve(B.p, c); });
        $('timers').appendChild(el);
      }
      const pos = DS.world.project(DS.world.cookerTop(c));
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
      el.style.setProperty('--k', Math.min(1, B.t / B.need).toFixed(3));
      el.classList.toggle('ready', B.ready);
      el.classList.toggle('over', B.over);
      const txt = B.ready ? '🍽️' : '♨️';
      if (el.textContent !== txt) el.textContent = txt;
    }
  }

  // ---------------------------------------------------------------- what happened in the shop
  function drain() {
    const evs = shop.events.splice(0);
    for (const e of evs) {
      DS.world.fx(e, shop);
      const g = e.gid !== undefined ? shop.guests[e.gid] : null;
      const face = g ? D.GUEST_EMOJI[g.kind] : '';
      switch (e.type) {
        case 'roll': sfx.roll(e.prog / e.need); break;
        case 'fill': sfx.fill(); break;
        case 'shape': sfx.pinch(0); break;
        case 'pinch': sfx.pinch(e.prog / e.need); break;
        case 'made': sfx.made(e.n); break;
        case 'oops':
          sfx.oops();
          once('oops' + e.p, 1.5, () => toast(e.stage === 'shape' ? 'OOPS! LOOK AT THE SHAPE!' : 'OOPS! LOOK AT THE ORDER!', 'oops'));
          break;
        case 'busy': sfx.busy(); once('busy' + e.p, 1.5, () => toast(BUSY[e.cooker], 'oops')); break;
        case 'cook': sfx.cook(e.cook); break;
        case 'ready': sfx.ready(); once('ready', 1.2, () => toast('🍽️ READY! SERVE IT!', 'good')); break;
        case 'overcook': toast('TOO SOFT! SERVE IT QUICK!', 'oops'); break;
        case 'serve': {
          streak++;
          sfx.serve(streak);
          const top = DS.world.guestTop(e.gid);
          if (top) coinPop(top, `+${e.price + e.tip} 🪙`);
          toast(`${face} XIE XIE! THANK YOU!`, 'thanks');
          $('coins').classList.remove('bump'); void $('coins').offsetWidth; $('coins').classList.add('bump');
          break;
        }
        case 'lucky': sfx.lucky(); toast(`🪙 LUCKY COIN! +${e.coins}`, 'good'); burst(50); break;
        case 'arrive': sfx.arrive(); break;
        case 'leave':
          sfx.bye(e.result);
          toast(e.result === 'kind' ? `${face} SEE YOU NEXT TIME!` : `${face} TOO HUNGRY, BYE!`, e.result === 'kind' ? 'thanks' : 'oops');
          break;
        case 'over': finish(); break;
        default: break;
      }
    }
  }
  function once(key, gap, fn) {
    if (toastAt[key] !== undefined && clock - toastAt[key] < gap) return;
    toastAt[key] = clock;
    fn();
  }

  // ---------------------------------------------------------------- the loop
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    if (held) return;
    tick(dt);
    DS.world.render();
  }

  function tick(dt) {
    const run = !paused && !storyOpen && !shopOpen;
    if (run) clock += dt;
    fiveCool = Math.max(0, fiveCool - dt);
    if (state === 'open' && run) { openT += dt; if (openT > 1.1) state = 'play'; }
    if (state === 'play' && run) {
      if (pilot) pilot(dt);
      shop.step(dt);
      seqTick(dt);
      drain();
    }
    if (state === 'finish') { finishT += dt; if (finishT > 2.8 && !resultsShown) showResults(); }
    const views = players.map((_, i) => (shop ? shop.view(i) : { stage: 'wait', opts: [], tray: 0, count: 0, order: null }));
    DS.world.sync(shop, views, run ? dt : 0);
    if (state === 'play' || state === 'open' || state === 'finish') { updatePads(); updateHud(); }
    fxTick(dt);
  }

  // ---------------------------------------------------------------- layout: where the 3D shop goes between the cards and the buttons
  function layout() {
    const w = window.innerWidth, h = window.innerHeight;
    if (state === 'home' || state === 'loading' || state === 'finish' || state === 'results') {
      if (w / h >= 1.1) DS.world.setPads({ top: 10, bottom: 20, left: 10, right: w * 0.6, tight: true });
      else DS.world.setPads({ top: 10, bottom: h * 0.62 + 10, left: 0, right: 0, tight: true });
      return;
    }
    // the cards are as tall as one would be; the buttons as tall as the tallest panel
    let top = 110, bottom = 150;
    const probe = document.createElement('div');
    probe.className = 'card';
    probe.style.visibility = 'hidden';
    probe.innerHTML = '<div class="plate"></div><div class="with"><span></span></div>';
    $('orders').appendChild(probe);
    top = probe.getBoundingClientRect().bottom + 6;
    probe.remove();
    if (pads.length) bottom = 0;
    for (const P of pads) { const r = P.el.getBoundingClientRect(); bottom = Math.max(bottom, r.height ? h - r.top + 4 : 150); }
    DS.world.setPads({ top, bottom: Math.max(90, bottom), left: 0, right: 0, tight: false });
  }

  // ---------------------------------------------------------------- pause, story, shop
  function setPause(on) {
    if (state !== 'play' && state !== 'open') on = false;
    paused = on;
    $('pause').classList.toggle('hidden', !on);
    Kit.sound.music(on ? 'pause' : state === 'home' ? 'title' : 'play');
  }

  function openStory(on) {
    storyOpen = on;
    $('story').classList.toggle('hidden', !on);
    if (on) { storyPage = 0; renderStory(); }
  }
  function storyGo(d) {
    storyPage = Math.max(0, Math.min(STORY.length - 1, storyPage + d));
    if (d > 0 && storyPage === STORY.length - 1 && $('sText').dataset.p === String(STORY.length - 1)) { openStory(false); return; }
    renderStory();
    Kit.sound.click();
  }
  function renderStory() {
    const pg = STORY[storyPage];
    const art = $('sArt');
    art.textContent = pg.art;
    art.style.animation = 'none'; void art.offsetWidth; art.style.animation = '';
    $('sText').textContent = pg.text;
    $('sText').dataset.p = String(storyPage);
    $('sDots').innerHTML = STORY.map((_, i) => `<i class="${i === storyPage ? 'on' : ''}"></i>`).join('');
  }

  function openShop(on) {
    shopOpen = on;
    $('shop').classList.toggle('hidden', !on);
    if (on) renderShop();
  }
  function renderShop() {
    $('wallet').textContent = `🪙 ${bank.wallet}`;
    const ups = $('ups');
    ups.innerHTML = '';
    D.UPGRADES.forEach((u, i) => {
      const row = document.createElement('div');
      row.className = 'up';
      row.innerHTML = `<span class="pic">${DS.icons.html(u)}</span><span class="tx"><b></b><span></span></span><button class="buy"></button>`;
      row.querySelector('.tx b').textContent = u.name;
      row.querySelector('.tx span').textContent = u.what;
      const b = row.querySelector('.buy');
      if (save.up[u.id]) { b.classList.add('owned'); b.textContent = '✔'; b.disabled = true; b.setAttribute('aria-label', 'Bought'); }
      else {
        b.innerHTML = `🪙 ${u.cost}<kbd>${i + 1}</kbd>`;
        b.setAttribute('aria-label', 'Buy');
        b.disabled = bank.wallet < u.cost;
        b.addEventListener('click', () => buy(u));
      }
      ups.appendChild(row);
    });
    $('shopCoins').textContent = `🪙 ${bank.wallet}`;
  }
  function buy(u) {
    if (save.up[u.id] || !bank.buy(u)) { sfx.oops(); return; }
    save.up[u.id] = true;
    save.bank = bank.save();
    persist();
    sfx.buy();
    toast(`${u.emoji || '✨'} ${u.name}!`, 'good');
    renderShop();
    refreshHome();
    if (state === 'home') sceneForHome();
  }

  // ---------------------------------------------------------------- keys
  const SLOT_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 };
  const TEDDY_KEYS = { KeyA: 0, KeyS: 1, KeyD: 2 };
  const TOMMY_KEYS = { ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2, KeyJ: 0, KeyK: 1, KeyL: 2 };
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.code;
    Kit.sound.init();
    if (k === 'KeyM') { Kit.sound.toggleMute(); return; }
    if (storyOpen) {
      if (k === 'ArrowRight' || k === 'KeyD' || k === 'Enter' || k === 'Space') storyGo(1);
      else if (k === 'ArrowLeft' || k === 'KeyA') storyGo(-1);
      else if (k === 'Escape' || k === 'KeyB') openStory(false);
      e.preventDefault();
      return;
    }
    if (shopOpen) {
      const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[k];
      if (n !== undefined && D.UPGRADES[n]) buy(D.UPGRADES[n]);
      else if (k === 'Escape' || k === 'KeyU' || k === 'Enter') openShop(false);
      e.preventDefault();
      return;
    }
    if (state === 'home') {
      const step = (d) => { let i = save.day + d; if (i >= 0 && i < save.unlocked) { save.day = i; persist(); refreshHome(); sceneForHome(); Kit.sound.click(); } };
      if (k === 'ArrowLeft' || k === 'KeyA') step(-1);
      else if (k === 'ArrowRight' || k === 'KeyD') step(1);
      else if (k === 'Digit1' || k === 'Digit2' || k === 'Digit3') { save.who = ['teddy', 'tommy', 'both'][+k.slice(-1) - 1]; persist(); refreshHome(); sceneForHome(); }
      else if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'KeyW' || k === 'KeyS') {
        const id = save.who === 'both' ? (k.startsWith('Arrow') ? 'tommy' : 'teddy') : save.who;
        save.level[id] = k === 'ArrowUp' || k === 'KeyW' ? 'easy' : 'normal';
        persist(); refreshHome();
      } else if (k === 'Enter' || k === 'Space') startDay();
      else if (k === 'KeyB') openStory(true);
      else if (k === 'KeyU') openShop(true);
      else return;
      e.preventDefault();
      return;
    }
    if (state === 'results') {
      if (k === 'Enter' || k === 'Space') startDay();
      else if (k === 'KeyN' && save.day + 1 < save.unlocked) { save.day++; persist(); startDay(); }
      else if (k === 'KeyU') openShop(true);
      else if (k === 'Escape' || k === 'KeyH') goHome();
      else return;
      e.preventDefault();
      return;
    }
    if (k === 'KeyP' || k === 'Escape') { setPause(!paused); e.preventDefault(); return; }
    if (paused) { if (k === 'Enter' || k === 'Space') setPause(false); e.preventDefault(); return; }
    if (state !== 'play' && state !== 'open') return;
    if (k === 'KeyT') { if (!e.repeat) callBuddy(); e.preventDefault(); return; }
    if (e.repeat) { e.preventDefault(); return; }
    const two = players.length > 1;
    if (two) {
      if (TEDDY_KEYS[k] !== undefined) press(0, TEDDY_KEYS[k]);
      else if (SLOT_KEYS[k] !== undefined) press(0, SLOT_KEYS[k]);
      else if (k === 'KeyW' || k === 'KeyE') serve(0);
      else if (TOMMY_KEYS[k] !== undefined) press(1, TOMMY_KEYS[k]);
      else if (k === 'ArrowUp' || k === 'Enter' || k === 'NumpadEnter' || k === 'KeyI') serve(1);
      else return;
    } else {
      const i = SLOT_KEYS[k] ?? TEDDY_KEYS[k] ?? TOMMY_KEYS[k] ?? (k === 'Space' ? 0 : undefined);
      if (i !== undefined) press(0, i);
      else if (k === 'Enter' || k === 'NumpadEnter' || k === 'KeyW' || k === 'ArrowUp' || k === 'KeyE' || k === 'KeyI') serve(0);
      else return;
    }
    e.preventDefault();
  }

  // ---------------------------------------------------------------- toasts, big words, coins, confetti
  function toast(text, cls) {
    const box = $('toasts');
    while (box.children.length > 2) box.firstChild.remove();
    const d = document.createElement('div');
    d.className = 'toast ' + (cls || '');
    d.textContent = text;
    box.appendChild(d);
    setTimeout(() => d.remove(), 2300);
  }
  function big(text) {
    const b = $('bigCount');
    b.textContent = text;
    b.classList.remove('anim'); void b.offsetWidth; b.classList.add('anim');
  }
  function coinPop(pos3, text) {
    const p = DS.world.project(pos3);
    const d = document.createElement('div');
    d.className = 'coinpop';
    d.textContent = text;
    d.style.left = `${p.x}px`;
    d.style.top = `${p.y}px`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1400);
  }

  const bits = [];
  function burst(n) {
    const w = window.innerWidth;
    const colors = ['#ffd400', '#e8382f', '#ff3d7f', '#18d4ff', '#3fe0b0', '#ffffff', '#ff8a1f'];
    for (let i = 0; i < n; i++) {
      bits.push({ x: w * (0.2 + Math.random() * 0.6), y: -10 - Math.random() * 120, vx: (Math.random() - 0.5) * 260, vy: 80 + Math.random() * 260,
        r: Math.random() * 6, vr: (Math.random() - 0.5) * 12, s: 6 + Math.random() * 7, c: colors[i % colors.length], t: 0 });
    }
  }
  function fxTick(dt) {
    const cv = $('fx');
    const w = window.innerWidth, h = window.innerHeight;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const g = cv.getContext('2d');
    g.clearRect(0, 0, w, h);
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.t += dt;
      b.vy += 300 * dt;
      b.vx *= 1 - 0.8 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.r += b.vr * dt;
      if (b.y > h + 20 || b.t > 6) { bits.splice(i, 1); continue; }
      g.save(); g.translate(b.x, b.y); g.rotate(b.r);
      g.fillStyle = b.c;
      g.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
      g.restore();
    }
  }

  // ---------------------------------------------------------------- for tests
  const game = window.game = {
    autoPause: true,
    start(o) {
      o = o || {};
      if (o.day !== undefined) { save.day = o.day; save.unlocked = Math.max(save.unlocked, o.day + 1); }
      if (o.who) save.who = o.who;
      if (o.levels) Object.assign(save.level, o.levels);
      startDay(o.seed === undefined ? 1 : o.seed);
      return game.info();
    },
    step(seconds) {
      const n = Math.max(1, Math.round((seconds || 0) * 60));
      for (let i = 0; i < n; i++) tick(1 / 60);
      DS.world.render();
      return game.info();
    },
    hold(on) { held = !!on; lastNow = performance.now(); },
    press(p, i) { press(p || 0, i || 0); },
    serve(p) { serve(p || 0); },
    buddy() { callBuddy(); },
    pause(on) { setPause(on === undefined ? !paused : !!on); },
    home() { goHome(); },
    story(on) { openStory(on !== false); },
    shop(on) { openShop(on !== false); },
    page(n) { storyPage = n; renderStory(); },
    autopilot(kind) { pilotKind = kind || null; pilot = kind && shop ? DS.bots.make(kind, shop, 9) : null; },
    check(o) { return DS.checks.run(Object.assign({ prove: true }, o)); },
    giveCoins(n) { bank.deposit(-1, n); save.bank = bank.save(); persist(); refreshHome(); renderShop(); },
    info() {
      return {
        state, paused, day: D.DAYS[save.day].id, players: players.slice(), t: shop ? +shop.t.toFixed(2) : 0,
        served: shop ? shop.served : 0, total: shop ? shop.total : 0, coins: shop ? shop.coins : 0, wallet: bank.wallet, up: Object.assign({}, save.up),
        guests: shop ? shop.guests.map((g) => `${g.kind}:${g.state}`) : [], boards: shop ? players.map((_, i) => shop.view(i).stage) : [],
        helper: shop ? shop.players.map((P) => P.helper.left) : [], buddy: !!seq, result: lastResult,
      };
    },
    get shopState() { return shop; },
    save,
  };

  let started = false;
  const boot = () => { if (!started) { started = true; init(); } };
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
})();
