/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button (top left).
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: window.DS_TITLE,
  cols: ['Teddy (left)', 'Tommy (right)'],
  keys: [
    ['tap the picture buttons', 'A S D', '← ↓ →'],
    ['serve a plate 🍽️', 'W', '↑ or Enter'],
    ['call your brother · high five', 'T', 'T'],
    ['pick a day', 'A D', '← →'],
    ['level 🐣 / 🔥', 'W S', '↑ ↓'],
    ['who cooks', '1 2 3', '1 2 3'],
    ['open the shop! · again', 'Enter or Space', 'Enter or Space'],
    ['the story · shop upgrades', 'B · U', 'B · U'],
    ['pause', 'P or Esc', 'P or Esc'],
    ['sound on / off', 'M', 'M'],
  ],
  note: 'Each guest asks in pictures: the dumpling, the filling and how to cook it. Roll, fill, fold, cook, then serve! In 1 player, 1 2 3 and Space work too, and T calls your brother; with 2 players, T is a high five.',
  touch: 'Tap the big picture buttons at the bottom, then 🍽️ to serve. Tap your brother\'s face to call him.',
  button: { top: 'calc(env(safe-area-inset-top, 0px) + 10px)', left: 'max(10px, env(safe-area-inset-left, 0px))' },
});
// The language button goes right under the ? button, and the kit's speaker under that: a column in the top left corner,
// left of the order cards and away from the picture buttons at the bottom.
Kit.lang.setup({ button: { top: 'calc(env(safe-area-inset-top, 0px) + 58px)', left: 'max(10px, env(safe-area-inset-left, 0px))' } });
Kit.sound.setup({ button: { top: 'calc(env(safe-area-inset-top, 0px) + 106px)', left: 'max(10px, env(safe-area-inset-left, 0px))' } });
