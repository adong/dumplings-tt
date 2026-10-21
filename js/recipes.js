/* TT Dumpling Shop: the menu, the seven shop days and the shop upgrades. Plain data, no Three.js, so node can load it
   for the headless checks (tools/check.js). Words here are English; js/zh.js has the 中文. */
(function () {
  'use strict';
  const DS = window.DS = window.DS || {};

  // what goes inside. `icon` is drawn by js/icons.js when there's no good emoji for it
  const FILLINGS = {
    cabbage: { emoji: '🥬', name: 'CABBAGE', color: '#7fc94e' },
    meat: { emoji: '🥩', name: 'MEAT', color: '#c4705e' },
    carrot: { emoji: '🥕', name: 'CARROT', color: '#ff8a1f' },
    shrimp: { emoji: '🦐', name: 'SHRIMP', color: '#ff9f8a' },
    egg: { emoji: '🥚', name: 'EGG', color: '#ffd84a' },
    mushroom: { emoji: '🍄', name: 'MUSHROOM', color: '#9a6e4a' },
    peanut: { emoji: '🥜', name: 'PEANUT', color: '#d9a05b' },
    redbean: { emoji: '🫘', name: 'RED BEAN', color: '#8e2f2f' },
    sesame: { icon: 'sesame', name: 'SESAME', color: '#2b2730' },
  };

  // how it's closed up. `pinch` is how many pinches (taps) it takes on each level
  const SHAPES = {
    crescent: { name: 'CRESCENT', pinch: { easy: 1, normal: 2 }, verb: 'PINCH IT CLOSED!' },
    pleats: { name: 'PLEATS', pinch: { easy: 2, normal: 4 }, verb: 'PINCH THE PLEATS!' },
    ingot: { name: 'GOLD INGOT', pinch: { easy: 2, normal: 3 }, verb: 'FOLD THE GOLD INGOT!' },
    ball: { name: 'BALL', pinch: { easy: 2, normal: 3 }, verb: 'ROLL IT ROUND!' },
    bun: { name: 'BUN', pinch: { easy: 2, normal: 4 }, verb: 'TWIST THE TOP!' },
    roll: { name: 'ROLL', pinch: { easy: 2, normal: 3 }, verb: 'ROLL IT UP!' },
  };

  // the three cookers on the back stove. `time` is seconds to cook a plate
  const COOKS = {
    boil: { cooker: 'pot', name: 'BOIL', time: 5 },
    steam: { cooker: 'steamer', name: 'STEAM', time: 6 },
    fry: { cooker: 'wok', name: 'FRY', time: 4 },
  };

  // the foods. `count` is how many on a plate, `price` is coins for each one
  const FOODS = {
    jiaozi: { name: 'JIAOZI', price: 2, first: 'roll', count: { easy: 2, normal: 3 } },
    tangyuan: { name: 'TANGYUAN', price: 2, first: 'knead', count: { easy: 2, normal: 3 } },
    baozi: { name: 'BAOZI', price: 4, first: 'roll', count: { easy: 1, normal: 2 } },
    chunjuan: { name: 'SPRING ROLL', price: 3, first: 'roll', count: { easy: 2, normal: 2 } },
  };

  // the days. Each menu line: a food, its fillings, shapes and ways to cook it
  const J = (fillings, shapes, cooks) => ({ food: 'jiaozi', fillings, shapes, cooks });
  const DAYS = [
    { id: 'jiaozi', name: 'DUMPLING DAY', icon: 'crescent', guests: { easy: 4, normal: 6 },
      menu: [J(['cabbage', 'meat'], ['crescent'], ['boil'])] },
    { id: 'pleats', name: 'PRETTY PLEATS', icon: 'pleats', guests: { easy: 4, normal: 6 },
      menu: [J(['cabbage', 'meat', 'carrot'], ['crescent', 'pleats'], ['boil', 'steam'])] },
    { id: 'ingots', name: 'GOLD INGOTS', icon: 'ingot', guests: { easy: 5, normal: 7 }, lucky: true,
      menu: [J(['cabbage', 'meat', 'shrimp', 'carrot'], ['crescent', 'pleats', 'ingot'], ['boil', 'steam'])] },
    { id: 'baozi', name: 'STEAMED BUNS', icon: 'bun', guests: { easy: 5, normal: 7 },
      menu: [{ food: 'baozi', fillings: ['meat', 'cabbage', 'redbean'], shapes: ['bun'], cooks: ['steam'] },
        J(['cabbage', 'meat', 'egg'], ['crescent', 'pleats'], ['boil', 'steam'])] },
    { id: 'chunjuan', name: 'SPRING ROLLS', icon: 'roll', guests: { easy: 5, normal: 8 },
      menu: [{ food: 'chunjuan', fillings: ['cabbage', 'carrot', 'mushroom'], shapes: ['roll'], cooks: ['fry'] },
        J(['cabbage', 'meat', 'mushroom'], ['crescent', 'ingot'], ['boil'])] },
    { id: 'eve', name: "NEW YEAR'S EVE", icon: '🧨', guests: { easy: 6, normal: 8 }, lucky: true, night: true,
      menu: [J(['cabbage', 'meat', 'shrimp', 'egg'], ['crescent', 'pleats', 'ingot'], ['boil', 'steam']),
        { food: 'baozi', fillings: ['meat', 'redbean'], shapes: ['bun'], cooks: ['steam'] },
        { food: 'chunjuan', fillings: ['cabbage', 'carrot', 'mushroom'], shapes: ['roll'], cooks: ['fry'] }] },
    { id: 'lantern', name: 'LANTERN FESTIVAL', icon: '🏮', guests: { easy: 6, normal: 9 }, lucky: true, night: true,
      menu: [{ food: 'tangyuan', fillings: ['peanut', 'redbean', 'sesame'], shapes: ['ball'], cooks: ['boil'] },
        { food: 'tangyuan', fillings: ['peanut', 'redbean', 'sesame'], shapes: ['ball'], cooks: ['boil'] },
        J(['cabbage', 'meat', 'shrimp'], ['crescent', 'pleats', 'ingot'], ['boil', 'steam']),
        { food: 'baozi', fillings: ['meat', 'redbean'], shapes: ['bun'], cooks: ['steam'] }] },
  ];
  for (const d of DAYS) {
    // which cookers this day's stove has: only the ones its menu needs
    const c = new Set();
    for (const m of d.menu) for (const k of m.cooks) c.add(k);
    d.cooks = ['boil', 'steam', 'fry'].filter((k) => c.has(k));
  }

  // the shop upgrades, bought with coins between days
  const UPGRADES = [
    { id: 'lanterns', emoji: '🏮', name: 'RED LANTERNS', cost: 30, what: 'Guests wait longer.' },
    { id: 'pin', icon: 'pin', name: 'GOLDEN ROLLING PIN', cost: 40, what: 'One less roll for every wrapper.' },
    { id: 'stove', emoji: '🔥', name: 'BIG STOVE', cost: 60, what: 'Food cooks faster.' },
    { id: 'lion', emoji: '🦁', name: 'LION DANCE', cost: 80, what: 'Guests tip one more coin.' },
  ];

  // the guests: the twelve zodiac animals, plus Foxy and Froggy, who come every day
  const GUESTS = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];
  const GUEST_EMOJI = { rat: '🐭', ox: '🐮', tiger: '🐯', rabbit: '🐰', dragon: '🐲', snake: '🐍', horse: '🐴', goat: '🐐',
    monkey: '🐵', rooster: '🐔', dog: '🐶', pig: '🐷', fox: '🦊', frog: '🐸', panda: '🐼' };

  // the tuning, per level
  const TUNE = {
    easy: { roll: 3, options: 2, patience: 80, gap: 7, cookScale: 1, overcook: 0, lockout: 0.25, helperEvery: 1.1 },
    normal: { roll: 5, options: 3, patience: 42, gap: 4.5, cookScale: 1, overcook: 10, lockout: 0.7, helperEvery: 0.8 },
  };
  const LUCKY_COINS = 8;

  DS.data = { FILLINGS, SHAPES, COOKS, FOODS, DAYS, UPGRADES, GUESTS, GUEST_EMOJI, TUNE, LUCKY_COINS };
})();
