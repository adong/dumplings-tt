/* TT Dumpling Shop: the rules of one shop day, with no drawing (node runs it for the checks).
     const s = DS.shop.create({ day, players: [{ who, level }], seed, upgrades, plan?, tweak? })
     s.step(dt)            time passes: guests come in and wait, cookers cook, the brother folds
     s.view(p)             what player p's board is doing: { stage, opts: [{ key, right }], prog, need, tray, count, gid }
     s.press(p, i)         player p taps option i of his board: 'ok' | 'oops' | 'busy' | 'locked' | 'none'
     s.serve(p, cooker?)   player p serves a ready plate (that cooker's, or his own first): true when he did
     s.helper(p, n)        the brother makes the next n dumplings on p's board
     s.events              what happened, for the view and the sounds: drained by the game each frame
   A guest's order: { food, filling, shape, cook, count, line }. A dumpling being made goes
   roll -> fill -> (shape, jiaozi with a choice of shapes) -> pinch -> on the tray; a full tray goes to a cooker; a cooked
   plate is served. Coins go through s.ledger, so the checks can prove they add up. */
(function () {
  'use strict';
  const DS = window.DS;
  const D = DS.data;

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const WALK = 1.6;      // seconds to walk in, and out
  const EAT = 2.6;       // seconds to eat before waving goodbye
  const IDLE = 8;        // a guest whose cook hasn't tapped for this long starts to get hungry again
  const READY_WAIT = 6;  // a cooked plate keeps a guest happy this long before he gets hungry again

  // every possible order on a day: the checks use it to make each one
  function allOrders(day, level) {
    const out = [];
    day.menu.forEach((m, line) => {
      for (const filling of m.fillings) for (const shape of m.shapes) for (const cook of m.cooks) {
        out.push({ food: m.food, filling, shape, cook, count: D.FOODS[m.food].count[level], line });
      }
    });
    return out;
  }

  function create(o) {
    const day = o.dayData || D.DAYS[o.day];
    const tweak = o.tweak || {};
    const up = o.upgrades || {};
    const two = o.players.length > 1;
    const level = o.players.some((p) => p.level === 'easy') ? 'easy' : 'normal'; // the shop's pace: the easier one
    const TU = D.TUNE[level];
    const R = rng(o.seed || 1);
    const pick = (a) => a[Math.floor(R() * a.length)];
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    const s = {
      day, level, t: 0, events: [], guests: [], players: [], cookers: {}, ledger: [], coins: 0,
      over: false, result: null, served: 0, kind: 0, left: 0, slots: (two ? 3 : 2) + (level === 'normal' ? 1 : 0),
    };
    for (const c of day.cooks) s.cookers[D.COOKS[c].cooker] = null;
    const ev = (type, x) => s.events.push(Object.assign({ type, t: s.t }, x));

    // ---------------------------------------------------------------- the day's guests and their orders
    let plan = o.plan;
    if (!plan) {
      const n = day.guests[level] + (two ? 2 : 0);
      plan = [];
      for (let i = 0; i < n; i++) {
        const line = Math.floor(R() * day.menu.length), m = day.menu[line];
        plan.push({ food: m.food, filling: pick(m.fillings), shape: pick(m.shapes), cook: pick(m.cooks), count: D.FOODS[m.food].count[level], line });
      }
    }
    // who comes: Foxy and Froggy every day (the regulars), and zodiac animals for the rest
    const kinds = shuffle(D.GUESTS.slice());
    const who = plan.map((_, i) => kinds[i % kinds.length]);
    if (plan.length > 2) {
      who[1 + Math.floor(R() * Math.min(2, plan.length - 1))] = 'fox';
      const fr = Math.min(plan.length - 1, 3 + Math.floor(R() * (plan.length - 3)));
      who[who[fr] === 'fox' ? plan.length - 1 : fr] = 'frog';
    }
    // the hidden lucky coin: in one dumpling of one jiaozi plate, on lucky days
    let luckyGuest = -1, luckyIdx = -1;
    if (day.lucky) {
      const js = plan.map((p, i) => (p.food === 'jiaozi' ? i : -1)).filter((i) => i >= 0);
      if (js.length) { luckyGuest = pick(js); luckyIdx = Math.floor(R() * plan[luckyGuest].count); }
    }
    s.plan = plan;
    s.total = plan.length;
    let next = 0, nextAt = 1;

    // ---------------------------------------------------------------- the cooks
    o.players.forEach((p, i) => {
      s.players.push({ i, who: p.who, level: p.level, tune: D.TUNE[p.level], helper: { left: 0, t: 0 },
        board: { gid: null, tray: [], stage: 'wait', prog: 0, need: 0, filling: null, shape: null, opts: [], lock: 0, idle: 0 } });
    });

    const guest = (id) => s.guests[id];
    const orderOf = (b) => guest(b.gid).order;
    const cookerFor = (cook) => D.COOKS[cook].cooker;

    function setStage(P, stage) {
      const b = P.board, g = b.gid === null ? null : guest(b.gid), od = g && g.order;
      b.stage = stage;
      b.prog = 0;
      b.need = 1;
      if (stage === 'roll') {
        b.filling = b.shape = null;
        b.need = Math.max(1, P.tune.roll - (up.pin ? 1 : 0));
        b.opts = [{ key: D.FOODS[od.food].first, right: true }];
      } else if (stage === 'fill') {
        const line = day.menu[od.line];
        const others = shuffle(line.fillings.filter((f) => f !== od.filling));
        const extra = shuffle(Object.keys(D.FILLINGS).filter((f) => f !== od.filling && !others.includes(f)));
        const keys = [od.filling].concat(others, extra).slice(0, P.tune.options);
        if (tweak.noFilling && od.filling === tweak.noFilling) keys[0] = extra[0]; // proof: a menu that can't be made
        b.opts = shuffle(keys).map((k) => ({ key: k, right: k === od.filling }));
      } else if (stage === 'shape') {
        b.opts = day.menu[od.line].shapes.map((k) => ({ key: k, right: k === od.shape }));
      } else if (stage === 'pinch') {
        b.shape = od.shape;
        b.need = D.SHAPES[od.shape].pinch[P.level];
        b.opts = [{ key: 'pinch', right: true }];
      } else if (stage === 'cook') {
        b.opts = (tweak.cooks || day.cooks).map((k) => ({ key: k, right: k === od.cook }));
      } else {
        b.opts = [];
      }
    }

    function assign(P) {
      const b = P.board;
      b.gid = null;
      b.tray = [];
      const free = s.guests.filter((g) => g.state === 'wait' && g.taker === null);
      if (!free.length) { setStage(P, 'wait'); return; }
      free.sort((a, c) => a.arrived - c.arrived);
      const g = free[0];
      g.taker = P.i;
      b.gid = g.id;
      b.idle = 0;
      setStage(P, 'roll');
      ev('take', { p: P.i, gid: g.id });
    }

    function addDumpling(P, byBrother) {
      const b = P.board, g = guest(b.gid), od = g.order;
      const lucky = g.id === luckyGuest && b.tray.length === luckyIdx;
      b.tray.push({ filling: byBrother ? od.filling : b.filling, shape: od.shape, lucky });
      ev('made', { p: P.i, gid: g.id, n: b.tray.length, byBrother: !!byBrother, lucky });
      if (b.tray.length >= od.count) setStage(P, 'cook');
      else if (!byBrother) setStage(P, 'roll');
    }

    function nextAfterFill(P) {
      const od = orderOf(P.board);
      const line = day.menu[od.line];
      setStage(P, od.food === 'jiaozi' && line.shapes.length > 1 ? 'shape' : 'pinch');
    }

    s.view = function (pi) {
      const P = s.players[pi], b = P.board, g = b.gid === null ? null : guest(b.gid);
      return {
        stage: b.stage, opts: b.opts, prog: b.prog, need: b.need, tray: b.tray.length, count: g ? g.order.count : 0,
        gid: b.gid, order: g ? g.order : null, lock: b.lock, helper: P.helper.left, filling: b.filling,
        busy: b.stage === 'cook' && g ? s.cookers[cookerFor(g.order.cook)] !== null : false,
      };
    };

    s.press = function (pi, i) {
      const P = s.players[pi];
      if (!P || s.over) return 'none';
      const b = P.board;
      const op = b.opts[i];
      if (!op) return 'none';
      if (b.lock > 0) return 'locked';
      b.idle = 0;
      if (!op.right) {
        b.lock = P.tune.lockout;
        ev('oops', { p: pi, stage: b.stage, key: op.key });
        return 'oops';
      }
      const g = guest(b.gid);
      switch (b.stage) {
        case 'roll':
          b.prog++;
          ev('roll', { p: pi, prog: b.prog, need: b.need });
          if (b.prog >= b.need) setStage(P, 'fill');
          break;
        case 'fill':
          b.filling = op.key;
          ev('fill', { p: pi, key: op.key });
          nextAfterFill(P);
          break;
        case 'shape':
          ev('shape', { p: pi, key: op.key });
          setStage(P, 'pinch');
          break;
        case 'pinch':
          b.prog++;
          ev('pinch', { p: pi, prog: b.prog, need: b.need });
          if (b.prog >= b.need) addDumpling(P, false);
          break;
        case 'cook': {
          const c = cookerFor(g.order.cook);
          if (s.cookers[c]) { ev('busy', { p: pi, cooker: c }); return 'busy'; }
          const time = D.COOKS[g.order.cook].time * TU.cookScale * (up.stove ? 0.6 : 1);
          s.cookers[c] = { gid: g.id, p: pi, items: b.tray, cook: g.order.cook, t: 0, need: time, ready: false, readyT: 0, over: false };
          g.state = 'cooking';
          ev('cook', { p: pi, gid: g.id, cooker: c, cook: g.order.cook });
          assign(P);
          break;
        }
        default: return 'none';
      }
      return 'ok';
    };

    // the plates ready to serve, oldest first, player pi's own first
    s.ready = function (pi) {
      const out = [];
      for (const c in s.cookers) { const B = s.cookers[c]; if (B && B.ready) out.push({ c, B }); }
      out.sort((a, b) => ((a.B.p === pi ? 0 : 1) - (b.B.p === pi ? 0 : 1)) || (b.B.readyT - a.B.readyT));
      return out;
    };

    s.serve = function (pi, cooker) {
      if (s.over) return false;
      const r = s.ready(pi).find((x) => !cooker || x.c === cooker);
      if (!r) return false;
      const { c, B } = r;
      const g = guest(B.gid);
      const P = s.players[pi];
      if (P) P.board.idle = 0;
      const price = D.FOODS[g.order.food].price * B.items.length;
      const f = g.patience / g.maxPatience;
      let tip = B.over ? 0 : f > 0.6 ? 3 : f > 0.3 ? 2 : 1;
      if (up.lion) tip += 1;
      const lucky = B.items.some((d) => d.lucky) ? D.LUCKY_COINS : 0;
      const pay = (kind, amount) => {
        if (!amount) return;
        s.ledger.push({ t: s.t, gid: g.id, kind, amount });
        s.coins += amount;
      };
      pay('food', price);
      pay('tip', tip);
      if (tweak.tipLeak) s.coins += tip; // proof: a coin that skips the ledger
      pay('lucky', lucky);
      g.paid = price + tip + lucky;
      g.state = 'eating';
      g.stateT = 0;
      g.result = 'served';
      s.served++;
      s.cookers[c] = null;
      ev('serve', { p: pi, gid: g.id, cooker: c, price, tip, lucky, over: B.over });
      if (lucky) ev('lucky', { p: pi, gid: g.id, coins: lucky });
      return true;
    };

    s.helper = function (pi, n) {
      const P = s.players[pi];
      if (!P) return;
      P.helper.left = Math.min(9, P.helper.left + (n || 3));
      P.helper.t = 0;
    };

    function leave(g) {
      g.result = level === 'easy' && !tweak.grumpy ? 'kind' : 'left';
      if (g.result === 'kind') s.kind++; else s.left++;
      ev('leave', { gid: g.id, result: g.result });
      g.state = 'leave';
      g.stateT = 0;
      if (g.taker !== null) {
        const P = s.players[g.taker];
        if (P.board.gid === g.id) assign(P);
      }
      for (const c in s.cookers) if (s.cookers[c] && s.cookers[c].gid === g.id) s.cookers[c] = null;
    }

    function spawn() {
      const used = new Set(s.guests.filter((g) => g.state !== 'gone').map((g) => g.slot));
      let slot = -1;
      for (let i = 0; i < s.slots; i++) if (!used.has(i)) { slot = i; break; }
      if (slot < 0) return false;
      const id = s.guests.length;
      const patience = TU.patience * (up.lanterns ? 1.3 : 1);
      s.guests.push({ id, kind: who[id], order: plan[id], slot, state: 'walk', stateT: 0, arrived: 0, taker: null,
        patience, maxPatience: patience, result: null, paid: 0 });
      ev('arrive', { gid: id, slot });
      return true;
    }

    s.step = function (dt) {
      if (s.over) return;
      s.t += dt;
      // new guests, while there's a free spot at the counter
      if (next < plan.length && s.t >= nextAt && spawn()) { next++; nextAt = s.t + TU.gap * (0.8 + 0.4 * R()); }
      for (const g of s.guests) {
        g.stateT += dt;
        if (g.state === 'walk' && g.stateT >= WALK) { g.state = 'wait'; g.stateT = 0; g.arrived = s.t; ev('order', { gid: g.id }); }
        else if (g.state === 'eating' && g.stateT >= EAT) { g.state = 'leave'; g.stateT = 0; ev('bye', { gid: g.id }); }
        else if (g.state === 'leave' && g.stateT >= WALK) { g.state = 'gone'; }
        // hungry: waiting with nobody making it, or a cook who stopped tapping, or a cooked plate left on the stove
        let rate = 0;
        if (g.state === 'wait') {
          if (g.taker === null) rate = 1;
          else {
            const b = s.players[g.taker].board;
            const stuck = b.stage === 'cook' && s.cookers[cookerFor(g.order.cook)] !== null;
            rate = !tweak.frozen && b.idle > IDLE && !stuck ? 1 : 0;
          }
        } else if (g.state === 'ready') {
          const B = s.cookers[cookerFor(g.order.cook)];
          rate = B && B.readyT > READY_WAIT ? 1 : 0;
        }
        if (rate) {
          g.patience -= dt * rate;
          if (g.patience <= 0) { g.patience = 0; leave(g); }
        }
      }
      for (const P of s.players) {
        const b = P.board;
        if (b.lock > 0) b.lock = Math.max(0, b.lock - dt);
        if (b.gid === null) assign(P);
        else b.idle += dt;
        // the brother: one finished dumpling every so often, straight onto the tray
        if (P.helper.left > 0 && b.gid !== null && b.stage !== 'cook') {
          P.helper.t += dt;
          if (P.helper.t >= P.tune.helperEvery) {
            P.helper.t = 0;
            P.helper.left--;
            b.idle = 0;
            addDumpling(P, true);
          }
        }
      }
      for (const c in s.cookers) {
        const B = s.cookers[c];
        if (!B) continue;
        if (!B.ready) {
          B.t += dt;
          if (B.t >= B.need) { B.ready = true; guest(B.gid).state = 'ready'; ev('ready', { gid: B.gid, cooker: c, p: B.p }); }
        } else {
          B.readyT += dt;
          if (TU.overcook && !B.over && B.readyT > TU.overcook) { B.over = true; ev('overcook', { gid: B.gid, cooker: c }); }
        }
      }
      if (next >= plan.length && s.guests.every((g) => g.state === 'gone')) {
        s.over = true;
        const frac = s.served / s.total;
        s.result = { served: s.served, kind: s.kind, left: s.left, total: s.total, coins: s.coins,
          stars: frac >= 1 ? 3 : frac >= 0.6 ? 2 : s.served > 0 ? 1 : 0 };
        ev('over', s.result);
      }
    };

    return s;
  }

  // the shop's purse across days: every coin in or out is a line in the ledger
  function bank(saved) {
    const b = { wallet: 0, earned: 0, spent: 0, ledger: [] };
    if (saved) Object.assign(b, { wallet: saved.wallet | 0, earned: saved.earned | 0, spent: saved.spent | 0 });
    b.deposit = function (day, amount) {
      b.ledger.push({ kind: 'day', day, amount });
      b.earned += amount;
      b.wallet += amount;
    };
    b.buy = function (u) {
      if (b.wallet < u.cost) return false;
      b.ledger.push({ kind: 'buy', id: u.id, amount: -u.cost });
      b.spent += u.cost;
      b.wallet -= u.cost;
      return true;
    };
    b.save = () => ({ wallet: b.wallet, earned: b.earned, spent: b.spent });
    return b;
  }

  DS.shop = { create, bank, allOrders, rng, WALK, EAT };
})();
