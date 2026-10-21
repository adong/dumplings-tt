# TT Dumpling Shop

[![TT Dumpling Shop title screen](docs/screenshot.jpg)](https://adong.github.io/dumplings-tt/)

Press **?** any time (or tap the round **?** button in the top left corner) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

**中文：** 包饺子：过年啦！开一家小饺子店，看客人的图片点菜，擀皮、放馅、包成月牙、褶子或元宝，再煮、蒸或炸好端上去。后面还有汤圆、包子和春卷，赚金币升级小店，说不定还能吃到幸运硬币！

A New Year dumpling shop, starring Teddy and Tommy. The guests are the twelve zodiac animals, plus Foxy 🦊 and Froggy 🐸 who come every day, and they order in pictures: which dumpling, which filling, and how to cook it. Roll the wrapper, add the filling, fold it into a crescent, pleats or a gold ingot (yuanbao), boil it in the pot, steam it in the bamboo steamer or fry it in the wok, and serve. Later days add sweet tangyuan, fluffy baozi buns and crispy spring rolls, one dumpling hides a lucky coin, and the coins buy upgrades for the shop. Seven days, two levels, one or two cooks, and a short story card about why families make dumplings for the New Year.

It's built with Claude Code from plain JavaScript and Three.js, in the same style as Metro Surfer and the other Teddy & Tommy games. There are no image, model or audio files: the shop, the animals and the food are boxes, spheres and canvas textures, the pictures on the buttons are drawn on a canvas, Teddy and Tommy come from the shared kit (`kit/`), and every sound is synthesised.

The name lives in one place, [js/title.js](js/title.js). "TT Dumpling Shop" is a working title until Alan names it.

## Play

- **Double-click `index.html`.** It works offline, because Three.js and the kit are copied into `kit/`. Without internet the logo falls back from the Bungee font to Arial Black.
- **Send one file:** `dist/dumplings-tt.html` is the whole game in one file. AirDrop or email it, then open it in a browser.
- **Rebuild that file** after any edit: `python3 kit/tools/bundle.py . --name dumplings-tt`
- **Get kit updates** from `~/claude-games/kit`: `python3 ../kit/tools/sync.py .`, then rebuild.
- **On the home screen** pick a day, who cooks (TEDDY, TOMMY or BOTH), 🐣 EASY or 🔥 NORMAL for each brother, then ▶. 📖 opens the story and 🏪 the shop upgrades.
- **A day** opens with "OPEN!" and lasts until every guest of the day has come and gone: about a minute or two.
- **The end:** the cook does his signature move (Teddy's boxing combo, then his 🏀 jump shots; Tommy's Y with peace fingers ✌️) while confetti flies, then the results: ⭐⭐⭐ for serving every guest, the coins of the day (NEW BEST! when it's a record for that day), whether you found the lucky coin, and the coins in the shop. 🔁 plays the day again, ⏭️ the next day, 🏪 the upgrades, 🏠 home.
- **Saved per browser:** the day, who cooks, each brother's level, the stars and best coins of every day, which days are open, the shop's coins and its upgrades. `index.html` and `dist/dumplings-tt.html` each keep their own, because they're different ways of opening the game.

### Making a plate

- **The order card** at the top shows the guest's face, the dumpling and how many (×2), the filling, and the cooker. Its green bar is how hungry the guest is getting. Your face on a card means you're making that one; ♨️ means it's cooking; a glowing card means it's ready.
- **Your board** takes the oldest order by itself, and the picture buttons at the bottom always show just the next step:
  1. **Roll the wrapper** (擀皮): tap the rolling pin until the dough ball is a flat wrapper. For tangyuan you roll a little dough ball instead.
  2. **Add the filling** (馅): tap the picture that matches the order: cabbage, meat, carrot, shrimp, egg, mushroom, peanut, red bean or sesame.
  3. **Pick the shape** (jiaozi only, when the day has more than one): crescent, pleats or gold ingot (元宝).
  4. **Pinch it closed:** a few taps for the pleats, the ingot's corners, the bun's twisted top, the spring roll's roll or the round tangyuan.
  5. **Cook it** when the tray is full: the pot to boil (煮), the bamboo steamer to steam (蒸), or the wok to fry. Each cooker holds one plate; a timer shows over it.
  6. **Serve:** when it's ready, tap 🍽️ (over the cooker or next to your buttons). The guest catches the plate, eats, pays and says "XIE XIE! THANK YOU!".
- **While a plate cooks** your board already takes the next order, so a quick cook keeps two things going at once.
- **A wrong picture** just shakes ("OOPS! LOOK AT THE ORDER!") and costs a moment; nothing is wasted.
- **The lucky coin:** on the Gold Ingots, New Year's Eve and Lantern Festival days, one jiaozi of one plate secretly has a coin inside. Nobody knows which until the guest bites it: "🪙 LUCKY COIN!", 8 extra coins and confetti.

### Coins and the shop upgrades

Each piece costs 2 coins (jiaozi, tangyuan), 3 (a spring roll) or 4 (a baozi), and the guest tips 1 to 3 more, by how long they waited. Between days, 🏪 spends the coins:

| | Upgrade | Cost | What it does | In the shop |
|---|---|---|---|---|
| 🏮 | Red lanterns | 30 | guests wait 30 % longer | six big lanterns instead of two |
| ✨ | Golden rolling pin | 40 | one roll less for every wrapper | the pin turns gold |
| 🔥 | Big stove | 60 | food cooks 40 % faster | bigger flames, a gold stove top |
| 🦁 | Lion dance | 80 | every guest tips one more coin | a lion dance head bobbing by the stove |

### The days

| | Day | On the menu | Cookers |
|---|---|---|---|
| 1 | Dumpling Day | crescent jiaozi: cabbage or meat | pot |
| 2 | Pretty Pleats | crescents and pleats, with carrot too | pot, steamer |
| 3 | Gold Ingots | crescents, pleats and gold ingots, with shrimp; the lucky coin | pot, steamer |
| 4 | Steamed Buns | baozi (meat, cabbage, red bean) and jiaozi | pot, steamer |
| 5 | Spring Rolls | fried spring rolls (cabbage, carrot, mushroom) and jiaozi | pot, wok |
| 6 | New Year's Eve | every jiaozi, baozi and spring rolls, at night with fireworks and firecrackers; the lucky coin | all three |
| 7 | Lantern Festival | sweet tangyuan (peanut, red bean, sesame), jiaozi and baozi, at night; the lucky coin | pot, steamer |

A day opens once the day before has served at least one guest.

### EASY and NORMAL

| | 🐣 EASY (Tommy, 5) | 🔥 NORMAL (Teddy, 8) |
|---|---|---|
| rolling a wrapper | 3 taps | 5 taps |
| filling pictures to choose from | 2 | 3 |
| pinches | 1 or 2 | 2 to 4 |
| a plate | 2 jiaozi or tangyuan, 1 baozi | 3 jiaozi or tangyuan, 2 baozi |
| guests at the counter | 2 at a time, 4 to 6 a day | 3 at a time, 6 to 9 a day |
| how long a waiting guest stays | 80 s | 42 s |
| the right picture | glows after 2.5 s without a tap | no hint |
| a plate left on the stove | stays warm | after 10 s it's "TOO SOFT" and gets no tip |
| a guest who waits too long | waves "SEE YOU NEXT TIME!" | "TOO HUNGRY, BYE!" |

Guests only get hungry while nobody is working on their order: once you're making it, they wait happily, unless the cook stops tapping for 8 seconds or leaves a cooked plate on the stove. A guest who leaves takes nothing with them and the day goes on.

**2 players:** two cooks behind one long counter, sharing the guests and the stove. Each has his own board, his own buttons and his own level (Teddy can cook NORMAL while Tommy cooks EASY); the shop's pace follows the easier level, and two more guests come each day.

### The story

The 📖 button (or **B**) on the home screen opens a five-page story card in simple words: the family coming home for the New Year's Eve dinner, everyone making jiaozi together, why jiaozi look like gold ingots (yuanbao) and the hidden lucky coin, spring rolls like little gold bars and baozi from the bamboo steamer, and round tangyuan at the Lantern Festival because round means everyone is together. It reads in English (with the pinyin words jiaozi, yuanbao, baozi and tangyuan), or in 中文 after a tap on the language button. The shop itself has red couplets around the window and the upside-down 福 diamond in 中文 mode; in English mode they show gold lucky knots and an old gold coin instead, so no Chinese characters show in English.

## Controls

| Teddy (left, or anyone alone) | Tommy (right, or anyone alone) | Touch | |
|---|---|---|---|
| `A` `S` `D` | `←` `↓` `→` | the picture buttons | tap a picture (keys go left to right) |
| `W` | `↑` or `Enter` | 🍽️ | serve a ready plate |
| `T` | `T` | your brother's face (1 player) or ✋ (2 players) | call your brother · high five |
| `P` / `Esc` | | ⏸️ button | pause (▶ keep cooking, 🔁 start again, 🏠 days) |
| `M` | | 🔊 button | sound on / off |

On the home screen: `←` `→` (or `A` `D`) pick a day, `↑` `↓` the level (with both cooking, `W` `S` is Teddy's and `↑` `↓` Tommy's), `1` `2` `3` who cooks (Teddy, Tommy, both), `B` the story, `U` the shop upgrades (`1` to `4` buy), `Enter` or `Space` to open the shop. On the results, `Enter` plays again, `N` the next day, `U` the upgrades, `Esc` home.

- **1 player:** `1` `2` `3`, `A` `S` `D`, `←` `↓` `→` and `J` `K` `L` all tap the pictures, `Space` taps the first one (handy for rolling), and `Enter`, `W`, `↑` or `E` serve.
- **2 players:** Teddy's buttons are at the bottom left, Tommy's at the bottom right, each with his face on it; ✋ is in the middle.
- **Sizes:** the picture buttons are 64 to 112 px (58 px on a phone held sideways); the kit's buttons (?, A文 and the speaker on menus) are a column in the top left corner, left of the order cards and away from the buttons at the bottom.

## Companion

Call your brother any time, as often as you like: **T**, or tap his face (the round button at the bottom right). The brother comes from `Kit.roster.buddyFor`: Tommy when Teddy cooks, Teddy when Tommy cooks.

- **He pops up** on a little red stool beside the cook, at his buddy size (`buddyScale`), and says hello with his signature move: Teddy's boxing combo and his 🏀 jump shot, Tommy's Y with peace fingers.
- **He tosses a treat** (🍦 💧 🧃 🍪 🍉 🍌) to the cook: "🍪 COOKIE FROM TOMMY!".
- **Then he folds:** "TOMMY SAYS: I'LL FOLD THE NEXT THREE!". He makes the next three dumplings for your order, one about every second, straight onto the tray (with the right filling and shape, so they count). If your plate fills up, the rest go to the next order. His face glows while he's there; when he's done he waves and hops off.
- **Calling again** while he's there says hello again, brings another treat and adds three more dumplings (up to nine waiting).
- **With two players** both brothers are already cooking, so **T** (or ✋) is a high five: the two cooks turn to each other, hands up, and sparkles fly.

## How it was checked

Nobody listened (Alan works next to the sessions), so the game was tested muted and the sound was checked in code.

**Headless, in Node:** `node tools/check.js` runs the shop's own rules ([js/shop.js](js/shop.js), no drawing) with pretend cooks: a perfect one, a wobbly 5-year-old (slow, a wrong picture one time in four, forgets to serve) and one who does nothing. In the page the same checks run as `game.check()`. All pass, in about a quarter of a second:

- **recipes:** every order every day can have (each filling × shape × cooker on each menu line, on both levels: 234 orders) is made from scratch and served.
- **easyKind:** on EASY, every day with each pretend cook, 1 and 2 players, 3 seeds (126 days, 756 guests): every day ends, every guest is either served or waves goodbye kindly, nobody leaves grumpy, and the perfect and wobbly cooks serve everyone.
- **coins:** all seven days in a row on both levels, buying upgrades as soon as there's money: every coin of every day is in the ledger, each plate pays exactly its menu price, nobody pays without being served, the results show the same coins, and the shop's purse always equals what was earned minus what was spent (never below zero). The perfect cook can buy all four upgrades within the seven days.
- **normalOk:** on NORMAL a quick cook serves every guest of every day (so the harder level is fair).
- **The checks can fail:** each one is also run broken on purpose and must then fail: meat is never offered as a filling, Pretty Pleats loses its steamer, guests never get hungry once an order is started (the idle day never ends), EASY guests leave grumpy, a tip skips the ledger, NORMAL guests rush in and barely wait.

**In the Browser pane** (time driven by `game.step()`, because the hidden pane throttles `requestAnimationFrame`):

```js
localStorage.setItem('claudeGames.muted', '1')   // always, before anything plays; then reload
game.autoPause = false; game.hold(true)          // the hidden pane counts as a hidden tab; only game.step() moves time
game.start({ day: 6, who: 'both', levels: { teddy: 'normal', tommy: 'easy' }, seed: 11 })
game.autopilot('perfect')                        // or 'kid', 'idle', or null
game.step(10)                                    // advance 10 s at 60 steps a second, then draw
game.press(0, 1); game.serve(0); game.buddy(); game.pause(true); game.shop(true); game.story(true)
game.check()                                     // the headless checks, with their proofs
game.info()                                      // state, the day, guests, coins, every board
```

- **Flows:** a whole day by hand (roll, fill, pinch, boil, serve, the next guest), whole days with the pretend cooks on several days and both levels to the results (3 stars; an idle EASY day ending with every guest waving goodbye and 0 stars), the buddy (treat, "TOMMY SAYS", his dumplings landing on the tray), 2 players on the Lantern Festival, buying all four upgrades with the keys and seeing them in the shop, the story and pause.
- **Screens:** desktop, iPad landscape (1024 x 768, 2 players), phone portrait (390 x 844) and landscape (740 x 360). The camera fits the shop between the order cards and the buttons on every screen, and the kit's buttons never cover the order cards or the buttons.
- **中文:** with `Kit.lang.set('zh')`, the home screen, the ? panel, all five story pages, the shop upgrades, every day on both levels in 1 and 2 players (every step label, the order cards, toasts), the buddy, a wrong picture, pause, the high five, an idle EASY day's goodbyes and the results: `Kit.lang.untranslated()` is `[]` everywhere, and a planted English line is caught. In English mode a scan of every text node, title, aria-label and alt finds no Chinese except the kit's language button tooltip, which names the language a tap switches to. (The 🧧 red envelope emoji has 福 on it, so it's only used in 中文 text.)
- **Offline:** `index.html` and `dist/dumplings-tt.html` both open from `file://` in headless Chrome (the README screenshot is the single file at 1200 x 750).
- No console errors.

## Files

```
index.html          page, menus, order cards, picture buttons, overlays (CSS inline)
js/title.js         the game's name, in one place
js/recipes.js       the menu: fillings, shapes, cookers, foods, the seven days, upgrades, guests, EASY/NORMAL tuning (runs in Node)
js/shop.js          the rules of a shop day: guests and patience, each cook's board, cookers, serving, the lucky coin,
                    the brother's help, the coins ledger and the shop's purse (runs in Node)
js/checks.js        the pretend cooks, the headless checks and their proofs (game.check() and tools/check.js)
js/icons.js         the button and card pictures, drawn on a canvas (dumpling shapes, rolling pin, pot, steamer, wok...)
js/sfx.js           rolling, plops, pinches, sizzles, dings and coins, through Kit.sound
js/world.js         Three.js: the shop (stove, cookers, counter, couplets, lanterns, upgrades), the cooks and the buddy,
                    the zodiac guests, the dumplings and their animations, the camera fit
js/game.js          home, the story, the upgrade shop, the day loop, input, HUD, companion, results, window.game
js/keys.js          the keys the ? panel shows (Kit.help), and where the kit's buttons go
js/zh.js            中文 (Kit.lang); names and the game's name stay English
tools/check.js      the headless checks in Node
kit/                copy of ~/claude-games/kit; edit the kit there, not here
dist/dumplings-tt.html  the single-file build
```

## Not verified

- **The sound:** nobody has listened to the rolling, the sizzle, the dings or the music. Everything goes through `Kit.sound`, so the one mute switch covers it.
- **Real touch devices:** the picture buttons use pointer events, tested with scripted presses and in phone and iPad sizes, not with fingers on a real iPad or phone or in iOS Safari (two kids tapping at once is untested).
- **Frame rate on an iPad:** not timed on a device.
- **How hard it is for real kids:** EASY and NORMAL were tuned with pretend cooks, not by watching Teddy and Tommy cook. The phone held upright shows the shop fairly small (the guests stand at the counter's sides).
- **The emoji:** the fillings and the guests' faces are the device's own emoji; on an old iPad 🫘 (red bean) may not exist.
