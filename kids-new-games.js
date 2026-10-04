/* 果粒橙小朋友 · 六款独立手机小游戏 */
(function (root) {
  'use strict';

  const GENTLE = '没关系，再找一找。';
  const SELECT_FIRST = '先选一个，再点它要去的地方。';
  const entries = [
    { id: 'ngWaterGarden', title: '小花浇水', icon: '🌷', desc: '把小水壶送到口渴的小花旁', category: 'swipe', action: '拖一拖', help: '按住小水壶，拖到闪闪的小花旁边。也可以先点水壶，再点小花。' },
    { id: 'ngAnimalPuzzle', title: '拼好小动物', icon: '🐰', desc: '把三块身体拼到一样的轮廓上', category: 'swipe', action: '拼一拼', help: '把三块小动物拼片，拖到一样形状的轮廓里。也可以先点拼片，再点轮廓。' },
    { id: 'ngBentoChef', title: '便当小厨师', icon: '🍱', desc: '照着小菜单把食物装进格子', category: 'swipe', action: '装一装', help: '看看上面的小菜单，把食物拖进一样图案的便当格。也可以先点食物，再点格子。' },
    { id: 'ngBunnyTrail', title: '小兔找家', icon: '🐇', desc: '带小兔收胡萝卜，再回到家', category: 'swipe', action: '滑一滑', help: '按住小兔沿着小路滑，收好三根胡萝卜，再去小房子。也可以先点小兔，再点胡萝卜。' },
    { id: 'ngRainbowReveal', title: '彩虹擦擦乐', icon: '🌈', desc: '用手指擦开云雾，找出图案', category: 'swipe', action: '擦一擦', help: '用手指在灰色云雾上来回擦一擦，藏起来的图案就会慢慢出现。' },
    { id: 'ngAnimalFeeding', title: '动物喂饭', icon: '🥕', desc: '把合适的食物送给小动物', category: 'swipe', action: '喂一喂', help: '看看小动物喜欢吃什么，把合适的食物拖到它面前。也可以先点食物，再点小动物。' }
  ];
  const entryById = Object.fromEntries(entries.map(entry => [entry.id, entry]));

  const WATER_FLOWERS = [
    { id: 'sun', name: '向日葵', seed: '🌱', bloom: '🌻' },
    { id: 'tulip', name: '郁金香', seed: '🌱', bloom: '🌷' },
    { id: 'daisy', name: '小雏菊', seed: '🌱', bloom: '🌼' },
    { id: 'rose', name: '小玫瑰', seed: '🌱', bloom: '🌹' }
  ];
  const WATERING_CAN_SVG = `<svg class="ng-watering-can-svg" viewBox="0 0 72 58" aria-hidden="true" focusable="false">
    <path class="ng-can-handle" d="M24 24V16C24 6 43 5 48 16v10"/>
    <path class="ng-can-body" d="M19 22h34v25c0 5-4 8-9 8H28c-5 0-9-3-9-8V22Z"/>
    <path class="ng-can-top" d="M17 20c0-3 3-5 6-5h26c4 0 6 2 6 5v5H17v-5Z"/>
    <path class="ng-can-spout" d="M19 28 8 32 3 42l6 3 7-8 8-2"/>
    <path class="ng-can-shine" d="M29 31h14M29 37h10"/>
    <path class="ng-can-water" d="M5 48c-3 4-3 7 0 8 3-1 3-4 0-8Zm8-2c-3 4-3 7 0 8 3-1 3-4 0-8Z"/>
  </svg>`;
  const WATER_ORDER = [1, 3, 0, 2];
  const PUZZLES = [
    { name: '小兔', icon: '🐰', color: '#f3c9d6', pieces: [['head', '🐰', '耳朵和脸'], ['body', '⚪', '圆肚子'], ['feet', '🐾', '小脚丫']] },
    { name: '熊猫', icon: '🐼', color: '#aeb7bd', pieces: [['head', '🐼', '圆圆的头'], ['body', '⚫', '胖肚子'], ['feet', '🐾', '小脚丫']] },
    { name: '小狮子', icon: '🦁', color: '#efb65f', pieces: [['head', '🦁', '鬃毛和脸'], ['body', '🟠', '金色身体'], ['feet', '🐾', '小脚丫']] }
  ];
  const BENTOS = [
    { name: '彩色便当', foods: [['rice', '🍙'], ['egg', '🥚'], ['broccoli', '🥦']] },
    { name: '野餐便当', foods: [['sandwich', '🥪'], ['apple', '🍎'], ['milk', '🥛']] },
    { name: '香香便当', foods: [['rice2', '🍚'], ['fish', '🐟'], ['carrot', '🥕']] }
  ];
  const BUNNY_PATHS = [
    { d: 'M13 82 C28 74 22 48 42 52 S64 78 70 49 S81 24 87 16', start: [13, 82], carrots: [[29, 58], [57, 68], [76, 38]], home: [87, 16] },
    { d: 'M13 18 C28 15 30 42 47 43 S66 22 71 52 S78 78 87 83', start: [13, 18], carrots: [[29, 31], [57, 34], [76, 65]], home: [87, 83] },
    { d: 'M13 78 C20 58 36 76 43 53 S53 20 68 33 S78 62 87 24', start: [13, 78], carrots: [[27, 66], [48, 38], [74, 45]], home: [87, 24] }
  ];
  const BUNNY_STAGES = ['跟着亮点', '自己找一找', '探索小路'];
  const SCRATCH_ROUNDS = [
    { name: '彩虹', icon: '🌈', colors: ['#ef6f7a', '#f4b34f', '#f4de68', '#71c991', '#65aee8'] },
    { name: '大星星', icon: '⭐', colors: ['#6cc5e8', '#8ed7bb', '#ffe073'] },
    { name: '爱心', icon: '💛', colors: ['#f2a7be', '#ffd7a1', '#fff0c8'] }
  ];
  const FEED_ROUNDS = [
    { animal: '🐰', name: '小兔', right: 'carrot', foods: [['carrot', '🥕'], ['fish', '🐟'], ['banana', '🍌']] },
    { animal: '🐵', name: '小猴', right: 'banana', foods: [['leaf', '🌿'], ['banana', '🍌'], ['milk', '🥛']] },
    { animal: '🐼', name: '熊猫', right: 'bamboo', foods: [['bamboo', '🎋'], ['bone', '🦴'], ['corn', '🌽']] },
    { animal: '🐱', name: '小猫', right: 'fish', foods: [['fish', '🐟'], ['grass', '🌿'], ['apple', '🍎']] },
    { animal: '🐮', name: '小牛', right: 'grass', foods: [['cookie', '🍪'], ['grass', '🌿'], ['carrot2', '🥕']] }
  ];

  const completionTexts = {
    ngWaterGarden: '四朵小花都喝到水啦，花园开满了花！',
    ngAnimalPuzzle: '三只小动物都拼好啦，你的小手真灵巧！',
    ngBentoChef: '三份便当都装好啦，你是细心的小厨师！',
    ngBunnyTrail: '小兔收好胡萝卜，平安回到家啦！',
    ngRainbowReveal: '三个藏起来的图案都擦出来啦！',
    ngAnimalFeeding: '每只小动物都吃到了喜欢的食物！'
  };
  const feedbackTexts = [
    GENTLE,
    SELECT_FIRST,
    '小花喝到水啦！',
    '这块拼对啦！',
    '食物装对格子啦！',
    '找到胡萝卜啦！',
    '小兔到家啦！',
    '先点小兔，再点胡萝卜。',
    '先点小兔，再点小房子。',
    '先把三根胡萝卜找齐。',
    '图案出现啦！',
    '小动物吃到喜欢的食物啦！'
  ];
  const texts = [...new Set(entries.map(entry => entry.help).concat(feedbackTexts, Object.values(completionTexts)))];

  let session = null;
  let mountedHost = null;
  let cleanups = [];
  let timers = [];
  let run = 0;
  // A touch action may repaint the map before WebKit sends its compatibility
  // click. Keep this guard across mounts, while allowing keyboard clicks.
  let bunnyCompatibilityClickUntil = 0;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function say(text) {
    try { if (typeof root.speak === 'function') root.speak(text); } catch (_) {}
  }

  function later(fn, ms) {
    const ownRun = run;
    const id = root.setTimeout(() => {
      timers = timers.filter(timer => timer !== id);
      if (ownRun === run) fn();
    }, ms);
    timers.push(id);
    return id;
  }

  function clearBindings() {
    cleanups.splice(0).forEach(cleanup => {
      try { cleanup(); } catch (_) {}
    });
  }

  function on(element, type, handler, options) {
    if (!element?.addEventListener) return;
    element.addEventListener(type, handler, options);
    cleanups.push(() => element.removeEventListener?.(type, handler, options));
  }

  function freshState(id) {
    const common = { id, round: 0, done: false, locked: false, selected: '', message: '' };
    if (id === 'ngWaterGarden') return { ...common, total: WATER_ORDER.length, watered: [] };
    if (id === 'ngAnimalPuzzle') return { ...common, total: PUZZLES.length, placed: [] };
    if (id === 'ngBentoChef') return { ...common, total: BENTOS.length, placed: [] };
    if (id === 'ngBunnyTrail') {
      const path = BUNNY_PATHS[0];
      return { ...common, total: BUNNY_PATHS.length, x: path.start[0], y: path.start[1], carrots: [], hintsEnabled: false, roundComplete: false };
    }
    if (id === 'ngRainbowReveal') return { ...common, total: SCRATCH_ROUNDS.length, covered: new Set() };
    if (id === 'ngAnimalFeeding') return { ...common, total: FEED_ROUNDS.length, fed: [] };
    return null;
  }

  function ensureState(id) {
    if (!entryById[id]) return null;
    if (!session || session.id !== id) session = freshState(id);
    return session;
  }

  function dots(current, total, inner) {
    return `<div class="ng-round-dots" aria-label="第 ${current + 1} 关，共 ${total} 关">${Array.from({ length: total }, (_, index) => `<i class="${index < current ? 'done' : ''} ${index === current ? 'now' : ''}">${inner && index === current ? inner : index < current ? '✓' : index + 1}</i>`).join('')}</div>`;
  }

  function gameHeader(state, prompt) {
    const entry = entryById[state.id];
    return `<div class="ng-head"><div><h2>${entry.icon} ${escapeHtml(entry.title)}</h2><p>${escapeHtml(prompt)}</p></div>${dots(Math.min(state.round, state.total - 1), state.total)}</div>`;
  }

  function message(state, fallback) {
    return `<div class="ng-message ${state.bad ? 'bad' : ''}" data-ng-message aria-live="polite">${escapeHtml(state.message || fallback)}</div>`;
  }

  function renderWater(state) {
    const activeIndex = WATER_ORDER[Math.min(state.round, WATER_ORDER.length - 1)];
    return `<section class="lesson ng-game ng-water" data-ng-game="${state.id}">
      ${gameHeader(state, '把水壶送到闪闪的小花旁')}
      <div class="ng-garden-board">
        <div class="ng-cloud" aria-hidden="true">☁️</div>
        <button class="ng-drag-source ng-water-can" data-ng-source="water" aria-label="小水壶"><span class="ng-water-can-art">${WATERING_CAN_SVG}</span><i aria-hidden="true">☝️</i></button>
        <div class="ng-flower-grid">${WATER_FLOWERS.map((flower, index) => {
          const done = state.watered.includes(index);
          const active = index === activeIndex && !done && !state.done;
          return `<button class="ng-target ng-flower ${done ? 'done' : ''} ${active ? 'active' : ''}" data-ng-target="flower-${index}" aria-label="${flower.name}${active ? '，请浇水' : ''}"><span>${done ? flower.bloom : flower.seed}</span><b>${done ? '开花啦' : active ? '需要水' : flower.name}</b>${active ? '<i aria-hidden="true">💧</i>' : ''}</button>`;
        }).join('')}</div>
      </div>${message(state, '先点水壶，再点闪闪的小花')}</section>`;
  }

  function puzzlePiece(piece, color, placed, target) {
    const [id, icon, label] = piece;
    if (target) return `<button class="ng-target ng-puzzle-slot ng-shape-${id} ${placed ? 'done' : ''}" data-ng-target="${id}" style="--ng-piece:${color}" aria-label="${label}的轮廓"><span class="${placed ? '' : 'ng-piece-hint'}">${icon}</span><b>${placed ? '放好啦' : label}</b></button>`;
    return `<button class="ng-drag-source ng-puzzle-piece ng-shape-${id}" data-ng-source="${id}" style="--ng-piece:${color}" aria-label="拼片，${label}"><span>${icon}</span><b>${label}</b></button>`;
  }

  function renderPuzzle(state) {
    const animal = PUZZLES[Math.min(state.round, PUZZLES.length - 1)];
    const pieces = animal.pieces.slice().sort((a, b) => ['body', 'feet', 'head'].indexOf(a[0]) - ['body', 'feet', 'head'].indexOf(b[0]));
    return `<section class="lesson ng-game ng-puzzle" data-ng-game="${state.id}">
      ${gameHeader(state, `帮忙拼好${animal.name}`)}
      <div class="ng-puzzle-stage">
        <div class="ng-puzzle-finished ${state.placed.length === 3 ? 'show' : ''}" aria-hidden="true">${animal.icon}</div>
        <div class="ng-puzzle-slots">${animal.pieces.map(piece => puzzlePiece(piece, animal.color, state.placed.includes(piece[0]), true)).join('')}</div>
      </div>
      <div class="ng-source-tray" aria-label="小动物拼片">${pieces.filter(piece => !state.placed.includes(piece[0])).map(piece => puzzlePiece(piece, animal.color, false, false)).join('') || '<span class="ng-tray-done">👏 拼好啦</span>'}</div>
      ${message(state, '找一样的形状，拖进去')}</section>`;
  }

  function renderBento(state) {
    const recipe = BENTOS[Math.min(state.round, BENTOS.length - 1)];
    return `<section class="lesson ng-game ng-bento" data-ng-game="${state.id}">
      ${gameHeader(state, '照着小菜单装便当')}
      <div class="ng-recipe"><small>今天的小菜单</small><div>${recipe.foods.map(food => `<span>${food[1]}</span>`).join('')}</div></div>
      <div class="ng-bento-box">${recipe.foods.map((food, index) => `<button class="ng-target ng-bento-cell ${state.placed.includes(food[0]) ? 'done' : ''}" data-ng-target="${food[0]}" aria-label="第${index + 1}格，放${food[1]}"><span>${food[1]}</span><b>${index + 1}</b></button>`).join('')}</div>
      <div class="ng-source-tray">${recipe.foods.filter(food => !state.placed.includes(food[0])).slice().reverse().map(food => `<button class="ng-drag-source ng-food" data-ng-source="${food[0]}" aria-label="食物${food[1]}">${food[1]}</button>`).join('') || '<span class="ng-tray-done">🍱 装好啦</span>'}</div>
      ${message(state, '把食物送到一样图案的格子')}</section>`;
  }

  function renderBunny(state) {
    const path = BUNNY_PATHS[Math.min(state.round, BUNNY_PATHS.length - 1)];
    const goal = bunnyGoal(state);
    const guided = state.round === 0 || state.hintsEnabled;
    return `<section class="lesson ng-game ng-bunny" data-ng-game="${state.id}">
      ${gameHeader(state, `第 ${state.round + 1} 关 · ${BUNNY_STAGES[state.round]}`)}
      <div class="ng-bunny-mission"><span data-ng-bunny-goal-icon aria-hidden="true">${goal.icon}</span><div><b data-ng-bunny-goal-label>${goal.label}</b><small data-ng-bunny-goal-detail>${goal.detail}</small></div><button data-ng-bunny-hint ${state.locked || state.done ? 'disabled' : ''} aria-label="小兔找家，给我一个提示">💡<small>提示</small></button></div>
      <div class="ng-bunny-score"><span>🥕 <b data-ng-carrot-count>${state.carrots.length}</b> / 3</span><div class="ng-bunny-collection" aria-label="胡萝卜收集进度">${path.carrots.map((_, index) => `<i data-ng-bunny-progress="${index}" class="${state.carrots.includes(index) ? 'collected' : ''}" aria-label="第${index + 1}根胡萝卜${state.carrots.includes(index) ? '已收好' : '还没收好'}">🥕</i>`).join('')}</div></div>
      ${state.roundComplete ? `<div class="ng-bunny-stage-done" role="status"><span aria-hidden="true">🏡 🌟</span><b>小兔到家啦！</b><button data-ng-bunny-next>下一关 →</button><small>准备好了再继续，也可以重玩这一关</small></div>` : ''}
      <div class="ng-bunny-board ${guided ? 'guided' : ''}" data-ng-bunny-board aria-label="小兔找家画板，可以自由拖动，没有倒计时">
        <svg class="ng-bunny-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="${path.d}"></path></svg>
        <svg class="ng-bunny-guide ${guided && !state.locked ? 'show' : ''}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" data-ng-bunny-guide><line data-ng-bunny-guide-line x1="${state.x}" y1="${state.y}" x2="${goal.point[0]}" y2="${goal.point[1]}"></line></svg>
        ${path.carrots.map((point, index) => `<button class="ng-carrot ${state.carrots.includes(index) ? 'picked' : ''} ${guided && goal.index === index ? 'target-now' : ''}" data-ng-carrot="${index}" style="left:${point[0]}%;top:${point[1]}%" ${state.carrots.includes(index) ? 'disabled' : ''} aria-label="胡萝卜${index + 1}${state.carrots.includes(index) ? '，已收好' : ''}">🥕</button>`).join('')}
        <button class="ng-bunny-home ${state.carrots.length === 3 ? 'ready' : ''}" data-ng-home style="left:${path.home[0]}%;top:${path.home[1]}%" aria-label="小兔的家">🏡${state.carrots.length === 3 ? '<i aria-hidden="true">✓</i>' : ''}</button>
        <button class="ng-bunny-player ${state.selected ? 'selected' : ''}" data-ng-bunny style="left:${state.x}%;top:${state.y}%" aria-label="小兔，按住拖动">🐇<i aria-hidden="true">☝️</i></button>
      </div><div class="ng-bunny-tools"><button data-ng-bunny-restart>↻ 重玩本关</button><span>自由滑动 · 可以慢慢来</span></div>${message(state, state.selected ? '现在点胡萝卜，或者拖着小兔走' : '按住小兔滑，也可以先点小兔')}</section>`;
  }

  function renderScratch(state) {
    const round = SCRATCH_ROUNDS[Math.min(state.round, SCRATCH_ROUNDS.length - 1)];
    const percent = Math.min(100, Math.round(state.covered.size / 34 * 100));
    return `<section class="lesson ng-game ng-scratch" data-ng-game="${state.id}">
      ${gameHeader(state, '手指擦一擦，猜猜藏着什么')}
      <div class="ng-scratch-progress"><span style="width:${percent}%"></span></div>
      <div class="ng-scratch-board" data-ng-scratch-board aria-label="擦擦画板，藏着${round.name}">
        <canvas class="ng-scratch-picture" data-ng-picture width="480" height="320"></canvas>
        <canvas class="ng-scratch-cover ${state.done ? 'revealed' : ''}" data-ng-cover width="480" height="320"></canvas>
        <span class="ng-scratch-hand" aria-hidden="true">☝️</span>
      </div>${message(state, '在灰色云雾上来回擦')}</section>`;
  }

  function renderFeed(state) {
    const round = FEED_ROUNDS[Math.min(state.round, FEED_ROUNDS.length - 1)];
    const fed = state.fed.includes(state.round);
    const wanted = round.foods.find(food => food[0] === round.right)[1];
    return `<section class="lesson ng-game ng-feed" data-ng-game="${state.id}">
      ${gameHeader(state, `给${round.name}送喜欢的食物`)}
      <div class="ng-feed-stage"><button class="ng-target ng-animal-target ${fed ? 'done' : ''}" data-ng-target="animal" aria-label="把食物送给${round.name}"><span>${round.animal}</span><b>${fed ? '吃饱啦' : `${round.name}饿啦`}</b><i class="ng-food-wish" aria-hidden="true">${fed ? '♥' : wanted}</i></button></div>
      <div class="ng-source-tray ng-food-choices">${fed ? '<span class="ng-tray-done">💛 谢谢你</span>' : round.foods.map(food => `<button class="ng-drag-source ng-food" data-ng-source="${food[0]}" aria-label="食物${food[1]}">${food[1]}</button>`).join('')}</div>
      ${message(state, '选一选，它喜欢吃什么？')}</section>`;
  }

  function render(id) {
    const state = ensureState(id);
    if (!state) return '<section class="lesson ng-game"><h2>🎮 游戏正在准备</h2></section>';
    if (id === 'ngWaterGarden') return renderWater(state);
    if (id === 'ngAnimalPuzzle') return renderPuzzle(state);
    if (id === 'ngBentoChef') return renderBento(state);
    if (id === 'ngBunnyTrail') return renderBunny(state);
    if (id === 'ngRainbowReveal') return renderScratch(state);
    return renderFeed(state);
  }

  function gameNode() {
    return mountedHost?.querySelector?.(`[data-ng-game="${session?.id || ''}"]`) || null;
  }

  function updateMessage(text, bad) {
    if (!session) return;
    session.message = text;
    session.bad = Boolean(bad);
    const node = gameNode()?.querySelector?.('[data-ng-message]');
    if (node) {
      node.textContent = text;
      node.classList?.toggle('bad', Boolean(bad));
    }
  }

  function gentle(text = GENTLE) {
    updateMessage(text, true);
    say(text);
  }

  function repaint() {
    const oldNode = gameNode();
    if (!oldNode || !oldNode.isConnected) return;
    clearBindings();
    oldNode.outerHTML = render(session.id);
    mount(session.id, mountedHost);
  }

  function showFallbackDone(text) {
    if (root.document?.querySelector?.('#ngGameCelebration')) return;
    try { if (typeof root.reward === 'function') root.reward(); } catch (_) {}
    say(text);
    root.document?.body?.insertAdjacentHTML?.('beforeend', `<div class="game-celebration" id="ngGameCelebration" role="dialog" aria-modal="true"><div><span>🌟</span><h2>完成啦！</h2><p>${escapeHtml(text)}</p><button class="celebrate-again" onclick="restartCurrentGame()">↻ 再玩一次</button><button class="celebrate-home" onclick="leaveGame()">🏠 换个游戏</button></div></div>`);
  }

  function finishAfter(messageText, wait = 360) {
    if (!session || session.done) return;
    const state = session;
    state.done = true;
    state.locked = true;
    repaint();
    later(() => {
      if (session !== state) return;
      if (typeof root.finishMiniGame === 'function') root.finishMiniGame(messageText);
      else showFallbackDone(messageText);
    }, wait);
  }

  function nextRound(reset) {
    if (!session || session.locked || session.done) return;
    const state = session;
    state.locked = true;
    repaint();
    later(() => {
      if (session !== state || state.done) return;
      state.round += 1;
      state.locked = false;
      state.selected = '';
      state.bad = false;
      reset(state);
      repaint();
    }, 480);
  }

  function applyMatch(source, target) {
    const state = session;
    if (!state || state.done || state.locked) return false;
    state.bad = false;
    if (state.id === 'ngWaterGarden') {
      const expected = WATER_ORDER[state.round];
      if (source !== 'water' || target !== `flower-${expected}`) { gentle(); return false; }
      state.watered.push(expected);
      state.message = '小花喝到水啦！';
      say(state.message);
      if (state.round === state.total - 1) finishAfter(completionTexts[state.id]);
      else nextRound(() => {});
      return true;
    }
    if (state.id === 'ngAnimalPuzzle') {
      if (source !== target || state.placed.includes(source)) { gentle(); return false; }
      state.placed.push(source);
      state.message = '这块拼对啦！';
      say(state.message);
      if (state.placed.length === 3) {
        if (state.round === state.total - 1) finishAfter(completionTexts[state.id], 520);
        else nextRound(current => { current.placed = []; });
      } else repaint();
      return true;
    }
    if (state.id === 'ngBentoChef') {
      if (source !== target || state.placed.includes(source)) { gentle(); return false; }
      state.placed.push(source);
      state.message = '食物装对格子啦！';
      say(state.message);
      if (state.placed.length === 3) {
        if (state.round === state.total - 1) finishAfter(completionTexts[state.id], 520);
        else nextRound(current => { current.placed = []; });
      } else repaint();
      return true;
    }
    if (state.id === 'ngAnimalFeeding') {
      const round = FEED_ROUNDS[state.round];
      if (target !== 'animal' || source !== round.right) { gentle(); return false; }
      state.fed.push(state.round);
      state.message = '小动物吃到喜欢的食物啦！';
      say(state.message);
      if (state.round === state.total - 1) finishAfter(completionTexts[state.id], 520);
      else nextRound(() => {});
      return true;
    }
    return false;
  }

  function selectSource(key, rootNode) {
    if (!session || session.locked || session.done) return;
    session.selected = key;
    rootNode?.querySelectorAll?.('[data-ng-source]').forEach(element => element.classList?.toggle('selected', element.dataset.ngSource === key));
    updateMessage('选好啦，再点它要去的地方', false);
  }

  function bindMatchControls(rootNode) {
    let drag = null;
    let suppressClickUntil = 0;
    const sources = [...(rootNode.querySelectorAll?.('[data-ng-source]') || [])];
    const targets = [...(rootNode.querySelectorAll?.('[data-ng-target]') || [])];
    const resetDrag = cancelled => {
      if (!drag) return;
      const { element, pointerId } = drag;
      try { if (element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId); } catch (_) {}
      element.classList?.remove('dragging');
      element.style?.removeProperty('transform');
      element.style?.removeProperty('z-index');
      drag = null;
      if (cancelled) updateMessage('可以慢慢来，再试一次', false);
    };
    sources.forEach(element => {
      on(element, 'pointerdown', event => {
        if (event.isPrimary === false || session?.locked || session?.done) return;
        event.preventDefault();
        selectSource(element.dataset.ngSource, rootNode);
        drag = { element, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        element.classList?.add('dragging');
        element.style?.setProperty('z-index', '12');
        try { element.setPointerCapture?.(event.pointerId); } catch (_) {}
      });
      on(element, 'pointermove', event => {
        if (!drag || drag.element !== element || drag.pointerId !== event.pointerId) return;
        event.preventDefault();
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (Math.hypot(dx, dy) > 6) drag.moved = true;
        element.style?.setProperty('transform', `translate3d(${dx}px,${dy}px,0) scale(1.08)`);
      }, { passive: false });
      on(element, 'pointerup', event => {
        if (!drag || drag.element !== element || drag.pointerId !== event.pointerId) return;
        event.preventDefault();
        const moved = drag.moved;
        if (moved) {
          element.style.pointerEvents = 'none';
          const target = root.document?.elementFromPoint?.(event.clientX, event.clientY)?.closest?.('[data-ng-target]');
          element.style.pointerEvents = '';
          suppressClickUntil = Date.now() + 360;
          const source = element.dataset.ngSource;
          resetDrag(false);
          if (target) applyMatch(source, target.dataset.ngTarget);
          else updateMessage('再靠近一点点就能放进去', false);
        } else resetDrag(false);
      });
      on(element, 'pointercancel', event => {
        if (drag?.element === element && drag.pointerId === event.pointerId) resetDrag(true);
      });
      on(element, 'click', event => {
        if (Date.now() < suppressClickUntil) { event.preventDefault(); return; }
        selectSource(element.dataset.ngSource, rootNode);
      });
    });
    targets.forEach(element => on(element, 'click', () => {
      if (!session?.selected) { gentle(SELECT_FIRST); return; }
      const source = session.selected;
      if (applyMatch(source, element.dataset.ngTarget)) session.selected = '';
    }));
    cleanups.push(() => resetDrag(false));
  }

  function currentBunnyPath() {
    return BUNNY_PATHS[Math.min(session?.round || 0, BUNNY_PATHS.length - 1)];
  }

  function bunnyGoal(state = session) {
    if (!state || state.id !== 'ngBunnyTrail') return null;
    const path = BUNNY_PATHS[Math.min(state.round, BUNNY_PATHS.length - 1)];
    const index = path.carrots.findIndex((_, at) => !state.carrots.includes(at));
    if (state.roundComplete || state.done) return { icon: '🏡', label: '小兔到家啦！', detail: '胡萝卜也都收好啦', point: path.home, index: -1 };
    if (index < 0) return { icon: '🏡', label: '现在回家吧', detail: '跟着亮亮的小房子走', point: path.home, index: -1 };
    return { icon: '🥕', label: `去找第 ${index + 1} 根胡萝卜`, detail: `还要收 ${3 - state.carrots.length} 根，再回家`, point: path.carrots[index], index };
  }

  function updateBunnyDom(rootNode) {
    if (!session || session.id !== 'ngBunnyTrail') return;
    const bunny = rootNode?.querySelector?.('[data-ng-bunny]');
    if (bunny) {
      bunny.style.left = `${session.x}%`;
      bunny.style.top = `${session.y}%`;
      bunny.classList?.toggle('selected', Boolean(session.selected));
    }
    const goal = bunnyGoal();
    const guided = session.round === 0 || session.hintsEnabled;
    rootNode?.querySelectorAll?.('[data-ng-carrot]').forEach(element => {
      const index = Number(element.dataset.ngCarrot);
      const collected = session.carrots.includes(index);
      element.classList?.toggle('picked', collected);
      element.disabled = collected;
      element.setAttribute?.('aria-label', `胡萝卜${index + 1}${collected ? '，已收好' : ''}`);
      element.classList?.toggle('target-now', guided && goal.index === index);
    });
    const count = rootNode?.querySelector?.('[data-ng-carrot-count]');
    if (count) count.textContent = String(session.carrots.length);
    rootNode?.querySelectorAll?.('[data-ng-bunny-progress]').forEach(element => {
      const index = Number(element.dataset.ngBunnyProgress);
      const collected = session.carrots.includes(index);
      element.classList?.toggle('collected', collected);
      element.setAttribute?.('aria-label', `第${index + 1}根胡萝卜${collected ? '已收好' : '还没收好'}`);
    });
    const home = rootNode?.querySelector?.('[data-ng-home]');
    home?.classList?.toggle('ready', session.carrots.length === 3);
    if (home) home.innerHTML = `🏡${session.carrots.length === 3 ? '<i aria-hidden="true">✓</i>' : ''}`;
    for (const [selector, text] of [['[data-ng-bunny-goal-icon]', goal.icon], ['[data-ng-bunny-goal-label]', goal.label], ['[data-ng-bunny-goal-detail]', goal.detail]]) {
      const node = rootNode?.querySelector?.(selector);
      if (node) node.textContent = text;
    }
    rootNode?.querySelector?.('[data-ng-bunny-guide]')?.classList?.toggle('show', guided && !session.locked);
    const guide = rootNode?.querySelector?.('[data-ng-bunny-guide-line]');
    for (const [attribute, value] of [['x1', session.x], ['y1', session.y], ['x2', goal.point[0]], ['y2', goal.point[1]]]) guide?.setAttribute?.(attribute, String(value));
  }

  function finishBunnyRound() {
    const state = session;
    if (!state || state.locked || state.done) return;
    state.message = '小兔到家啦！';
    say(state.message);
    if (state.round === state.total - 1) finishAfter(completionTexts[state.id], 520);
    else {
      state.roundComplete = true;
      state.locked = true;
      repaint();
    }
  }

  function nextBunnyRound() {
    const state = session;
    if (!state || state.id !== 'ngBunnyTrail' || !state.roundComplete || state.done || state.round >= state.total - 1) return false;
    state.round += 1;
    const next = BUNNY_PATHS[state.round];
    Object.assign(state, { x: next.start[0], y: next.start[1], carrots: [], selected: '', message: '', bad: false, locked: false, roundComplete: false, hintsEnabled: false });
    repaint();
    return true;
  }

  function restartBunnyRound() {
    if (!session || session.id !== 'ngBunnyTrail') return false;
    const round = session.round;
    run += 1;
    timers.splice(0).forEach(id => root.clearTimeout(id));
    session = freshState('ngBunnyTrail');
    session.round = round;
    const path = BUNNY_PATHS[round];
    session.x = path.start[0];
    session.y = path.start[1];
    root.document?.querySelector?.('#ngGameCelebration')?.remove?.();
    repaint();
    return true;
  }

  function hintBunny(rootNode = gameNode()) {
    if (!session || session.id !== 'ngBunnyTrail' || session.locked || session.done) return false;
    session.hintsEnabled = true;
    updateBunnyDom(rootNode);
    updateMessage(session.carrots.length === 3 ? '小房子亮起来啦，带小兔回家' : '看看亮起来的胡萝卜，带小兔去找它', false);
    say(session.carrots.length === 3 ? '先点小兔，再点小房子。' : '先点小兔，再点胡萝卜。');
    return true;
  }

  function bunnyMoveTo(x, y, rootNode) {
    const state = session;
    if (!state || state.id !== 'ngBunnyTrail' || state.done || state.locked) return false;
    const path = currentBunnyPath();
    if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return false;
    state.x = Math.max(12, Math.min(88, Number(x)));
    state.y = Math.max(12, Math.min(88, Number(y)));
    const previousCount = state.carrots.length;
    path.carrots.forEach((point, index) => {
      if (state.carrots.includes(index) || Math.hypot(state.x - point[0], state.y - point[1]) > 11) return;
      state.carrots.push(index);
      state.message = '找到胡萝卜啦！';
      say(state.message);
    });
    updateBunnyDom(rootNode);
    updateMessage(state.carrots.length > previousCount ? '找到胡萝卜啦！' : state.carrots.length === 3 ? '胡萝卜收好啦，去小房子' : '接着找胡萝卜，可以慢慢滑', false);
    if (state.carrots.length === 3 && Math.hypot(state.x - path.home[0], state.y - path.home[1]) <= 13) finishBunnyRound();
    return true;
  }

  function bindBunny(rootNode) {
    const board = rootNode.querySelector?.('[data-ng-bunny-board]');
    const bunny = rootNode.querySelector?.('[data-ng-bunny]');
    if (!board || !bunny) return;
    let pointer = null;
    const point = event => {
      const box = board.getBoundingClientRect();
      return [(event.clientX - box.left) / box.width * 100, (event.clientY - box.top) / box.height * 100];
    };
    const moveLine = event => {
      const activePointer = pointer;
      if (!activePointer) return;
      const next = point(event).map((value, index) => value + activePointer.offset[index]);
      const last = activePointer.last || next;
      const distance = Math.hypot(next[0] - last[0], next[1] - last[1]);
      const steps = Math.max(1, Math.ceil(distance / 3));
      for (let index = 1; index <= steps; index++) {
        if (!session || session.locked || session.done || pointer !== activePointer) break;
        bunnyMoveTo(last[0] + (next[0] - last[0]) * index / steps, last[1] + (next[1] - last[1]) * index / steps, rootNode);
      }
      // Arriving home repaints synchronously and releases this gesture.
      if (pointer === activePointer) activePointer.last = next;
    };
    on(bunny, 'pointerdown', event => {
      if (event.isPrimary === false || session?.locked || session?.done) return;
      event.preventDefault();
      session.selected = 'bunny';
      const pressed = point(event);
      pointer = { id: event.pointerId, last: [session.x, session.y], offset: [session.x - pressed[0], session.y - pressed[1]], moved: false };
      bunny.classList?.add('dragging', 'selected');
      try { board.setPointerCapture?.(event.pointerId); } catch (_) {}
    });
    on(board, 'pointermove', event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      if (event.pointerType === 'mouse' && event.buttons === 0) { end(event, false); return; }
      event.preventDefault();
      pointer.moved = true;
      moveLine(event);
    }, { passive: false });
    const end = (event, cancelled) => {
      if (!pointer || pointer.id !== event.pointerId) return;
      pointer = null;
      bunny.classList?.remove('dragging');
      try { if (board.hasPointerCapture?.(event.pointerId)) board.releasePointerCapture(event.pointerId); } catch (_) {}
      if (cancelled) updateMessage('小兔停好啦，可以接着走', false);
    };
    on(board, 'pointerup', event => end(event, false));
    on(board, 'pointercancel', event => end(event, true));
    on(board, 'lostpointercapture', event => end(event, true));
    on(bunny, 'click', () => {
      if (!session || session.locked || session.done) return;
      session.selected = 'bunny';
      bunny.classList?.add('selected');
      updateMessage('选好小兔啦，再点胡萝卜', false);
    });
    const bindTap = (element, action) => {
      if (!element) return;
      let pressed = null;
      on(element, 'pointerdown', event => {
        if (event.isPrimary === false || (event.button != null && event.button !== 0)) return;
        pressed = { id: event.pointerId, x: event.clientX, y: event.clientY };
      });
      on(element, 'pointerup', event => {
        if (!pressed || pressed.id !== event.pointerId) return;
        const started = pressed;
        pressed = null;
        bunnyCompatibilityClickUntil = Date.now() + 450;
        // Only a gesture begun on this target is a tap. A rabbit drag releases
        // on the board, so passing over a carrot never invokes this action.
        if (Math.hypot(event.clientX - started.x, event.clientY - started.y) > 24) return;
        action();
      });
      const cancel = event => { if (pressed?.id === event.pointerId) { pressed = null; bunnyCompatibilityClickUntil = Date.now() + 450; } };
      on(element, 'pointercancel', cancel);
      on(element, 'lostpointercapture', cancel);
      on(element, 'click', event => {
        if (event.detail !== 0 && Date.now() < bunnyCompatibilityClickUntil) { event.preventDefault(); return; }
        action();
      });
      cleanups.push(() => { pressed = null; });
    };
    rootNode.querySelectorAll?.('[data-ng-carrot]').forEach(element => bindTap(element, () => {
      if (!session || session.locked || session.done) return false;
      if (session.selected !== 'bunny') { gentle('先点小兔，再点胡萝卜。'); return false; }
      const index = Number(element.dataset.ngCarrot);
      if (session.carrots.includes(index)) return false;
      const pointValue = currentBunnyPath().carrots[index];
      return Boolean(pointValue && bunnyMoveTo(pointValue[0], pointValue[1], rootNode));
    }));
    bindTap(rootNode.querySelector?.('[data-ng-home]'), () => {
      if (!session || session.locked || session.done) return false;
      if (session.selected !== 'bunny') { gentle('先点小兔，再点小房子。'); return false; }
      if (session.carrots.length < 3) { gentle('先把三根胡萝卜找齐。'); return false; }
      const home = currentBunnyPath().home;
      return bunnyMoveTo(home[0], home[1], rootNode);
    });
    on(rootNode.querySelector?.('[data-ng-bunny-hint]'), 'click', () => hintBunny(rootNode));
    bindTap(rootNode.querySelector?.('[data-ng-bunny-next]'), nextBunnyRound);
    bindTap(rootNode.querySelector?.('[data-ng-bunny-restart]'), restartBunnyRound);
    cleanups.push(() => {
      if (pointer) {
        try { if (board.hasPointerCapture?.(pointer.id)) board.releasePointerCapture(pointer.id); } catch (_) {}
      }
      pointer = null;
      bunny.classList?.remove('dragging');
    });
  }

  function drawScratchPicture(canvas, round) {
    const context = canvas?.getContext?.('2d');
    if (!context) return;
    const data = SCRATCH_ROUNDS[round];
    context.clearRect(0, 0, 480, 320);
    context.fillStyle = data.colors[0];
    context.fillRect(0, 0, 480, 320);
    data.colors.slice(1).forEach((color, index) => {
      context.fillStyle = color;
      context.beginPath();
      context.arc(80 + index * 105, 72 + (index % 2) * 165, 82, 0, Math.PI * 2);
      context.fill();
    });
    context.fillStyle = '#fffdf5';
    context.beginPath();
    context.arc(240, 160, 105, 0, Math.PI * 2);
    context.fill();
    context.font = 'bold 132px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(data.icon, 240, 168);
  }

  function drawScratchCover(canvas) {
    const context = canvas?.getContext?.('2d');
    if (!context) return null;
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, 480, 320);
    context.fillStyle = '#c9d5dc';
    context.fillRect(0, 0, 480, 320);
    context.fillStyle = 'rgba(255,255,255,.55)';
    for (let y = 28; y < 320; y += 56) for (let x = 28; x < 480; x += 56) {
      context.beginPath();
      context.arc(x, y, 8, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = '#5d7180';
    context.font = 'bold 25px system-ui,sans-serif';
    context.textAlign = 'center';
    context.fillText('☝️', 240, 150);
    context.font = 'bold 18px system-ui,sans-serif';
    context.fillText('擦一擦', 240, 188);
    return context;
  }

  function markScratchCell(x, y) {
    if (!session || session.id !== 'ngRainbowReveal') return;
    const col = Math.max(0, Math.min(11, Math.floor(x / 40)));
    const row = Math.max(0, Math.min(7, Math.floor(y / 40)));
    for (let cy = row - 1; cy <= row + 1; cy++) for (let cx = col - 1; cx <= col + 1; cx++) {
      if (cx >= 0 && cx < 12 && cy >= 0 && cy < 8) session.covered.add(cy * 12 + cx);
    }
  }

  function scratchAt(x, y, context, rootNode) {
    const state = session;
    if (!state || state.id !== 'ngRainbowReveal' || state.done || state.locked) return false;
    markScratchCell(x, y);
    if (context) {
      context.save();
      context.globalCompositeOperation = 'destination-out';
      context.beginPath();
      context.arc(x, y, 31, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    const bar = rootNode?.querySelector?.('.ng-scratch-progress span');
    if (bar) bar.style.width = `${Math.min(100, Math.round(state.covered.size / 34 * 100))}%`;
    if (state.covered.size >= 34) {
      state.message = '图案出现啦！';
      say(state.message);
      state.locked = true;
      rootNode?.querySelector?.('[data-ng-cover]')?.classList?.add('revealed');
      updateMessage(state.message, false);
      later(() => {
        if (session !== state || state.done) return;
        if (state.round === state.total - 1) {
          state.locked = false;
          finishAfter(completionTexts[state.id], 120);
        } else {
          state.round += 1;
          state.covered = new Set();
          state.locked = false;
          state.message = '';
          repaint();
        }
      }, 600);
    }
    return true;
  }

  function bindScratch(rootNode) {
    const board = rootNode.querySelector?.('[data-ng-scratch-board]');
    const picture = rootNode.querySelector?.('[data-ng-picture]');
    const cover = rootNode.querySelector?.('[data-ng-cover]');
    if (!board || !cover) return;
    drawScratchPicture(picture, session.round);
    const context = drawScratchCover(cover);
    if (!context) return;
    session.covered.forEach(cell => {
      const x = (cell % 12) * 40 + 20;
      const y = Math.floor(cell / 12) * 40 + 20;
      context.save();
      context.globalCompositeOperation = 'destination-out';
      context.beginPath();
      context.arc(x, y, 28, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
    let pointer = null;
    const point = event => {
      const box = cover.getBoundingClientRect();
      return [(event.clientX - box.left) * 480 / box.width, (event.clientY - box.top) * 320 / box.height];
    };
    const stroke = event => {
      const next = point(event);
      const last = pointer?.last || next;
      const distance = Math.hypot(next[0] - last[0], next[1] - last[1]);
      const steps = Math.max(1, Math.ceil(distance / 18));
      for (let index = 1; index <= steps; index++) scratchAt(last[0] + (next[0] - last[0]) * index / steps, last[1] + (next[1] - last[1]) * index / steps, context, rootNode);
      if (pointer) pointer.last = next;
    };
    on(cover, 'pointerdown', event => {
      if (event.isPrimary === false || session.locked || session.done) return;
      event.preventDefault();
      pointer = { id: event.pointerId, last: point(event) };
      try { cover.setPointerCapture?.(event.pointerId); } catch (_) {}
      scratchAt(pointer.last[0], pointer.last[1], context, rootNode);
      board.classList?.add('started');
    });
    on(cover, 'pointermove', event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      event.preventDefault();
      stroke(event);
    }, { passive: false });
    const end = event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      try { if (cover.hasPointerCapture?.(event.pointerId)) cover.releasePointerCapture(event.pointerId); } catch (_) {}
      pointer = null;
    };
    on(cover, 'pointerup', end);
    on(cover, 'pointercancel', end);
    cleanups.push(() => {
      if (pointer) {
        try { if (cover.hasPointerCapture?.(pointer.id)) cover.releasePointerCapture(pointer.id); } catch (_) {}
      }
      pointer = null;
    });
  }

  function mount(id, host) {
    clearBindings();
    const state = ensureState(id);
    mountedHost = host || root.document;
    const node = gameNode();
    if (!state || !node) return false;
    if (id === 'ngBunnyTrail') bindBunny(node);
    else if (id === 'ngRainbowReveal') bindScratch(node);
    else bindMatchControls(node);
    return true;
  }

  function stop() {
    run += 1;
    clearBindings();
    timers.splice(0).forEach(id => root.clearTimeout(id));
    root.document?.querySelector?.('#ngGameCelebration')?.remove?.();
    session = null;
    mountedHost = null;
  }

  function snapshot() {
    if (!session) return null;
    const copy = { ...session };
    if (copy.covered instanceof Set) copy.covered = [...copy.covered];
    return JSON.parse(JSON.stringify(copy));
  }

  root.NEW_GAMES = {
    entries,
    render,
    mount,
    stop,
    texts,
    _test: {
      getState: snapshot,
      drop(source, target) { return applyMatch(source, target); },
      bunnyMove(x, y) { return bunnyMoveTo(x, y, null); },
      bunnyNext: nextBunnyRound,
      bunnyRestart: restartBunnyRound,
      bunnyHint: hintBunny,
      bunnyGoal() { return bunnyGoal(); },
      scratch(x, y) { return scratchAt(x, y, null, null); },
      data: { WATER_ORDER, PUZZLES, BENTOS, BUNNY_PATHS, SCRATCH_ROUNDS, FEED_ROUNDS }
    }
  };
})(window);
