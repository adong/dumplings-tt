/* TT Dumpling Shop: the headless checks, on the rules in js/shop.js with no drawing. In the page: game.check();
   in node: node tools/check.js. Each check also runs once with the rules broken on purpose, to prove it can fail.
     recipes    every order on every day can be made and served (and a broken menu is caught)
     easyKind   on EASY every guest is served or leaves kindly, and the day always ends, even with nobody playing
     coins      every coin is in the ledger, plates cost what the menu says, and the purse balances over all seven days
     normalOk   on NORMAL a quick cook serves every guest (so the harder level is fair, too)
   Also the bots the page's autopilot uses: DS.bots.make(kind, shop, seed), kind 'perfect' | 'kid' | 'idle'. */
(function () {
  'use strict';
  const DS = window.DS;
  const D = DS.data;

  // ---------------------------------------------------------------- bots: pretend cooks
  function make(kind, s, seed) {
    const R = DS.shop.rng(seed || 7);
    const wait = s.players.map(() => 0.3);
    return function tick(dt) {
      if (kind === 'idle') return;
      s.players.forEach((P, pi) => {
        wait[pi] -= dt;
        if (wait[pi] > 0) return;
        const kid = kind === 'kid';
        wait[pi] = kid ? 0.35 + 0.65 * R() : 0.15;
        if (s.ready(pi).length && (!kid || R() < 0.6)) { s.serve(pi); return; }
        const v = s.view(pi);
        if (!v.opts.length || v.lock > 0) return;
        let i = v.opts.findIndex((o) => o.right);
        if (kid && v.opts.length > 1 && R() < 0.25) i = Math.floor(R() * v.opts.length);
        s.press(pi, i);
      });
    };
  }

  function play(o, kind, limit) {
    const s = DS.shop.create(o);
    const tick = make(kind, s, (o.seed || 1) * 31 + 5);
    const dt = 0.05;
    while (!s.over && s.t < (limit || 1200)) { tick(dt); s.step(dt); }
    return s;
  }

  // ---------------------------------------------------------------- the checks
  function recipes(tweak, days) {
    const problems = [];
    let made = 0;
    (days || D.DAYS).forEach((day, di) => {
      for (const m of day.menu) {
        if (!D.FOODS[m.food]) problems.push(`${day.id}: no food ${m.food}`);
        for (const f of m.fillings) if (!D.FILLINGS[f]) problems.push(`${day.id}: no filling ${f}`);
        for (const sh of m.shapes) if (!D.SHAPES[sh]) problems.push(`${day.id}: no shape ${sh}`);
      }
      for (const level of ['easy', 'normal']) {
        for (const od of DS.shop.allOrders(day, level)) {
          const s = play({ dayData: day, players: [{ who: 'teddy', level }], seed: 3 + di, plan: [od], tweak }, 'perfect', 200);
          if (s.served === 1) made++;
          else problems.push(`${day.id} ${level}: ${od.count} ${od.filling} ${od.food} (${od.shape}, ${od.cook}) never served`);
        }
      }
    });
    return { ok: problems.length === 0, stat: `${made} orders made and served`, problems };
  }

  function easyKind(tweak, only) {
    const problems = [];
    let days = 0, served = 0, kind = 0, guests = 0;
    D.DAYS.forEach((day, di) => {
      for (const bot of only ? [only] : ['perfect', 'kid', 'idle']) {
        for (const players of [[{ who: 'tommy', level: 'easy' }], [{ who: 'teddy', level: 'normal' }, { who: 'tommy', level: 'easy' }]]) {
          for (let seed = 1; seed <= 3; seed++) {
            const s = play({ day: di, players, seed, tweak }, bot, 1500);
            days++;
            const tag = `${day.id} ${bot} ${players.length}P seed ${seed}`;
            if (!s.over) { problems.push(`${tag}: the day never ended (${s.guests.filter((g) => g.state !== 'gone').length} guests still in)`); continue; }
            for (const g of s.guests) {
              guests++;
              if (g.result === 'served') served++;
              else if (g.result === 'kind') kind++;
              else problems.push(`${tag}: guest ${g.id} (${g.kind}) left ${g.result}`);
            }
            if (bot !== 'idle' && s.served < s.total) problems.push(`${tag}: only ${s.served} of ${s.total} served`);
          }
        }
      }
    });
    return { ok: problems.length === 0, stat: `${days} EASY days: ${guests} guests, ${served} served, ${kind} left kindly`, problems };
  }

  function coins(tweak) {
    const problems = [];
    let serves = 0;
    for (const level of ['easy', 'normal']) {
      for (const bot of ['perfect', 'kid']) {
        const bank = DS.shop.bank();
        const up = {};
        D.DAYS.forEach((day, di) => {
          const s = play({ day: di, players: [{ who: 'teddy', level }], seed: 11 + di, upgrades: up, tweak }, bot, 1500);
          const tag = `${level} ${bot} ${day.id}`;
          const sum = s.ledger.reduce((a, l) => a + l.amount, 0);
          if (sum !== s.coins) problems.push(`${tag}: ledger says ${sum}, the day's coins say ${s.coins}`);
          for (const g of s.guests) {
            const lines = s.ledger.filter((l) => l.gid === g.id);
            const food = lines.filter((l) => l.kind === 'food').reduce((a, l) => a + l.amount, 0);
            if (g.result === 'served') {
              serves++;
              const want = D.FOODS[g.order.food].price * g.order.count;
              if (food !== want) problems.push(`${tag}: guest ${g.id} paid ${food} for food that costs ${want}`);
              if (lines.reduce((a, l) => a + l.amount, 0) !== g.paid) problems.push(`${tag}: guest ${g.id} paid ${g.paid}, ledger ${lines.length} lines`);
            } else if (lines.length) problems.push(`${tag}: guest ${g.id} paid without being served`);
          }
          if (!s.result || s.result.coins !== s.coins) problems.push(`${tag}: the results show different coins`);
          bank.deposit(di, s.coins);
          for (const u of D.UPGRADES) if (!up[u.id] && bank.buy(u)) up[u.id] = true;
          const purse = bank.ledger.reduce((a, l) => a + l.amount, 0);
          if (purse !== bank.wallet || bank.wallet !== bank.earned - bank.spent || bank.wallet < 0) {
            problems.push(`${tag}: purse ${bank.wallet}, ledger ${purse}, earned ${bank.earned} - spent ${bank.spent}`);
          }
        });
        if (bot === 'perfect' && Object.keys(up).length < D.UPGRADES.length) problems.push(`${level} ${bot}: could only buy ${Object.keys(up).join(', ')} in seven days`);
      }
    }
    return { ok: problems.length === 0, stat: `${serves} plates paid, purses balanced`, problems };
  }

  function normalOk(tweak) {
    const problems = [];
    let n = 0;
    D.DAYS.forEach((day, di) => {
      for (let seed = 1; seed <= 3; seed++) {
        const s = play({ day: di, players: [{ who: 'teddy', level: 'normal' }], seed, tweak }, 'perfect', 1500);
        n++;
        if (!s.over || s.served < s.total) problems.push(`${day.id} seed ${seed}: ${s.served} of ${s.total} served`);
      }
    });
    return { ok: problems.length === 0, stat: `${n} NORMAL days, every guest served`, problems };
  }

  // each check, broken on purpose: it must fail
  function broken() {
    const noSteam = D.DAYS.map((d) => Object.assign({}, d));
    noSteam[1].cooks = ['boil']; // PRETTY PLEATS without its steamer
    return [
      { name: 'recipes', why: 'meat never offered as a filling', run: () => recipes({ noFilling: 'meat' }, D.DAYS.slice(0, 1)) },
      { name: 'recipes', why: 'a day without its steamer', run: () => recipes(undefined, noSteam.slice(1, 2)) },
      { name: 'easyKind', why: 'guests never get hungry once an order is started', run: () => easyKind({ frozen: true }, 'idle') },
      { name: 'easyKind', why: 'EASY guests leave grumpy', run: () => easyKind({ grumpy: true }, 'idle') },
      { name: 'coins', why: 'a tip that skips the ledger', run: () => coins({ tipLeak: true }) },
      { name: 'normalOk', why: 'NORMAL guests rush in and barely wait', run: () => {
        const N = D.TUNE.normal, keep = [N.patience, N.gap];
        N.patience = 2; N.gap = 0.3;
        try { return normalOk(); } finally { [N.patience, N.gap] = keep; }
      } },
    ];
  }

  const CHECKS = { recipes, easyKind, coins, normalOk };

  function run(o) {
    o = o || {};
    const t0 = Date.now();
    const results = [];
    for (const name in CHECKS) {
      if (o.only && o.only !== name) continue;
      results.push(Object.assign({ name }, CHECKS[name]()));
    }
    const prove = [];
    if (o.prove !== false) {
      for (const b of broken()) {
        if (o.only && o.only !== b.name) continue;
        const r = b.run();
        prove.push({ name: b.name, why: b.why, caught: !r.ok, first: r.problems[0] || '(nothing caught)' });
      }
    }
    return { ok: results.every((r) => r.ok) && prove.every((p) => p.caught), results, prove, ms: Date.now() - t0 };
  }

  DS.bots = { make, play };
  DS.checks = { run, CHECKS };
})();
