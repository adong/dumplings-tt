/* 中文 for TT Dumpling Shop: the words on the page, the toasts, the story card, the shop upgrades and the ? panel
   (Kit.lang, from kit/lang.js). Simple words: Tommy is 5. The kids' names, Foxy and Froggy, and the game's own name stay
   in English on purpose. The couplets and the 福 on the shop's wall are drawn in js/world.js. */
(function () {
  const L = Kit.lang;
  const title = window.DS_TITLE;
  const words = title.split(' ');
  L.keep(['TEDDY', 'TOMMY', 'FOXY', 'FROGGY', 'Teddy', 'Tommy', title, words.slice(0, -2).join(' '), words.slice(-2).join(' '), 'Esc']);

  const FILLING = { CABBAGE: '白菜', MEAT: '肉', CARROT: '胡萝卜', SHRIMP: '虾仁', EGG: '鸡蛋', MUSHROOM: '蘑菇', PEANUT: '花生', 'RED BEAN': '红豆', SESAME: '芝麻' };
  const FOOD = { JIAOZI: '饺子', TANGYUAN: '汤圆', BAOZI: '包子', 'SPRING ROLL': '春卷' };
  const UPGRADE = { 'RED LANTERNS': '红灯笼', 'GOLDEN ROLLING PIN': '金擀面杖', 'BIG STOVE': '大灶台', 'LION DANCE': '舞狮' };
  const TREAT = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };

  L.add(Object.assign({}, FILLING, UPGRADE, {
    // home
    'Pick a day': '选一天', "Who's cooking?": '谁来包？', 'BOTH': '一起包',
    'Teddy cooks': 'Teddy 来包', 'Tommy cooks': 'Tommy 来包', 'Teddy and Tommy cook': 'Teddy 和 Tommy 一起包',
    'Easy': '简单', 'Normal': '普通', 'EASY': '简单', 'NORMAL': '普通',
    'DUMPLING DAY': '包饺子', 'PRETTY PLEATS': '漂亮褶子', 'GOLD INGOTS': '金元宝', 'STEAMED BUNS': '蒸包子',
    'SPRING ROLLS': '炸春卷', "NEW YEAR'S EVE": '除夕夜', 'LANTERN FESTIVAL': '元宵节',
    'The story': '过年包饺子的故事', 'The story (B)': '过年包饺子的故事 (B)', 'Shop upgrades': '升级小店', 'Shop upgrades (U)': '升级小店 (U)',
    'Open the shop!': '开张啦！', 'Open the shop! (Enter)': '开张啦！(回车)',
    // in the shop
    'Pause': '暂停', 'Pause (P)': '暂停 (P)', 'Sound (M)': '声音 (M)', 'Sound on or off': '声音 开 / 关',
    'Call your brother': '叫兄弟来帮忙', 'High five': '击掌', 'Serve': '端上去',
    'ROLL THE WRAPPER!': '擀皮！', 'ROLL A DOUGH BALL!': '揉个小面团！', 'ADD THE FILLING!': '放馅！', 'PICK THE SHAPE!': '选个样子！',
    'PINCH IT CLOSED!': '捏紧！', 'PINCH THE PLEATS!': '捏褶子！', 'FOLD THE GOLD INGOT!': '包成元宝！', 'ROLL IT ROUND!': '搓成圆圆的汤圆！',
    'TWIST THE TOP!': '捏个漂亮的顶！', 'ROLL IT UP!': '卷起来！', 'COOK IT!': '煮、蒸还是炸？',
    'THE POT IS FULL! SERVE FIRST!': '锅里满啦！先端上去！', 'THE STEAMER IS FULL! SERVE FIRST!': '蒸笼满啦！先端上去！',
    'THE WOK IS FULL! SERVE FIRST!': '炒锅满啦！先端上去！', 'SERVE THE PLATE!': '端上去！', 'WAITING FOR GUESTS…': '等客人来…',
    'CRESCENT': '月牙', 'PLEATS': '褶子', 'GOLD INGOT': '元宝', 'BOIL': '煮', 'STEAM': '蒸', 'FRY': '炸', 'PINCH': '捏', 'ROLL': '擀',
    'OOPS! LOOK AT THE SHAPE!': '哎呀！看看是什么样子！', 'OOPS! LOOK AT THE ORDER!': '哎呀！看看客人要什么！',
    '🍽️ READY! SERVE IT!': '🍽️ 好啦！快端上去！', 'TOO SOFT! SERVE IT QUICK!': '煮太久啦！快端上去！',
    '✋ HIGH FIVE!': '✋ 击掌！', '🏮 OPEN!': '🧧 开张啦！', '🎉 ALL SERVED!': '🎉 全都端上啦！', '🌙 CLOSING TIME!': '🌙 打烊啦！',
    // pause, results
    'Keep cooking': '继续包', 'Start the day again': '重新开始', 'Days': '选一天', 'Play again': '再玩一次', 'Next day': '下一天',
    "LET'S TRY AGAIN!": '再来一次吧！', 'GOOD TRY!': '加油！', 'GREAT JOB!': '真棒！', 'WONDERFUL!': '太棒啦！',
    'GUESTS SERVED': '招待的客人', 'COINS TODAY': '今天赚的金币', 'LUCKY COIN FOUND!': '吃到幸运硬币啦！', 'COINS IN THE SHOP': '小店的金币', 'NEW BEST!': '新纪录！',
    // the story
    'DUMPLINGS FOR THE NEW YEAR': '过年包饺子', 'Back a page': '上一页', 'Next page': '下一页', 'Close the story': '关上故事',
    "At Chinese New Year, the whole family comes home. On New Year's Eve everyone sits down together for a big, happy dinner.":
      '过年啦，一家人都回家团圆。除夕晚上，大家坐在一起吃热热闹闹的年夜饭。',
    'Before dinner, everyone makes jiaozi together: roll the wrapper thin, put in the filling, and pinch it closed.':
      '吃饭前，大家一起包饺子：擀皮，放馅，再捏紧。',
    'Jiaozi look like little gold ingots, called yuanbao, so they wish everyone a rich new year. Some families hide a coin in one dumpling. Whoever finds it gets extra luck!':
      '饺子长得像金元宝，祝大家新年发大财。有的人家会把一枚硬币包进饺子里，谁吃到，谁就最有福气！',
    'Spring rolls look like little gold bars and welcome the spring. Soft, fluffy baozi buns come out of the bamboo steamer.':
      '春卷像一根根小金条，欢迎春天来。软软胖胖的包子，从竹蒸笼里蒸出来。',
    'Fifteen days later is the Lantern Festival. Families eat round, sweet tangyuan, because round means everyone is together.':
      '过了十五天就是元宵节。大家吃圆圆甜甜的汤圆，圆圆的就是团团圆圆。',
    // the shop upgrades
    'SHOP UPGRADES': '升级小店', 'Close the shop': '关上', 'Buy': '买', 'Bought': '买好了',
    'Guests wait longer.': '客人愿意多等一会儿。', 'One less roll for every wrapper.': '每张皮少擀一下。',
    'Food cooks faster.': '做熟得更快。', 'Guests tip one more coin.': '客人多给一个金币。',
    // the ? panel (js/keys.js)
    'Teddy (left)': 'Teddy（左边）', 'Tommy (right)': 'Tommy（右边）',
    'tap the picture buttons': '点图片按钮', 'serve a plate 🍽️': '端上去 🍽️', 'pick a day': '选一天', 'level 🐣 / 🔥': '难度 🐣 / 🔥',
    'who cooks': '谁来包', 'open the shop! · again': '开张！· 再来', 'the story · shop upgrades': '故事 · 升级小店',
    'Each guest asks in pictures: the dumpling, the filling and how to cook it. Roll, fill, fold, cook, then serve! In 1 player, 1 2 3 and Space work too, and T calls your brother; with 2 players, T is a high five.':
      '客人用图片点菜：要什么饺子、什么馅、怎么做熟。擀皮、放馅、包好、做熟，再端上去！一个人玩时 1 2 3 和空格键也能用，T 叫兄弟来帮忙；两个人玩时，T 是击掌。',
    "Tap the big picture buttons at the bottom, then 🍽️ to serve. Tap your brother's face to call him.":
      '点下面的大图片按钮，再点 🍽️ 端上去。点兄弟的头像叫他来帮忙。',
  }));

  L.rule(/^(\d+) (.+) (JIAOZI|TANGYUAN|BAOZI|SPRING ROLL)$/, (m, n, f, food) => `${n}个${FILLING[f] || f}${FOOD[food]}`);
  L.rule(/^(\S+) XIE XIE! THANK YOU!$/, '$1 谢谢！');
  L.rule(/^(\S+) SEE YOU NEXT TIME!$/, '$1 下次再来！');
  L.rule(/^(\S+) TOO HUNGRY, BYE!$/, '$1 太饿啦，拜拜！');
  L.rule(/^🪙 LUCKY COIN! \+(\d+)$/, '🪙 吃到幸运硬币！+$1');
  L.rule(/^(\S+) SAYS: I'LL FOLD THE NEXT THREE!$/, '$1 说：下面三个我来包！');
  L.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA) FROM (.+)!$/, (m, emoji, item, who) => `${emoji} ${who} 给你${TREAT[item]}！`);
  L.rule(/^(\S+) (RED LANTERNS|GOLDEN ROLLING PIN|BIG STOVE|LION DANCE)!$/, (m, e, u) => `${e} ${UPGRADE[u]}！`);
})();
