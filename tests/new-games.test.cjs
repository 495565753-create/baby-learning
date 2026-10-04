const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(rootDir, 'kids-new-games.js'), 'utf8');
const styles = fs.readFileSync(path.join(rootDir, 'kids-new-games.css'), 'utf8');

function loadGames() {
  let nextTimer = 1;
  let clock = 0;
  const timers = new Map();
  const spoken = [];
  const finished = [];
  let rewards = 0;
  const sandbox = {
    console,
    Date: { now: () => clock },
    Math,
    Set,
    JSON,
    document: {
      querySelector() { return null; },
      elementFromPoint() { return null; },
      body: { insertAdjacentHTML() {} }
    },
    speak(text) { spoken.push(text); },
    finishMiniGame(text) { finished.push(text); },
    reward() { rewards += 1; },
    setTimeout(fn, delay = 0) {
      const id = nextTimer++;
      timers.set(id, { fn, at: clock + Number(delay || 0), id });
      return id;
    },
    clearTimeout(id) { timers.delete(id); }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'kids-new-games.js' });
  function flushOne() {
    const next = [...timers.values()].sort((a, b) => a.at - b.at || a.id - b.id)[0];
    if (!next) return false;
    timers.delete(next.id);
    clock = next.at;
    next.fn();
    return true;
  }
  function flushAll(limit = 100) {
    let count = 0;
    while (flushOne()) {
      count += 1;
      assert.ok(count < limit, 'timer loop should settle');
    }
    return count;
  }
  return { sandbox, api: sandbox.NEW_GAMES, spoken, finished, get rewards() { return rewards; }, timers, flushOne, flushAll };
}

test('exports six complete, uniquely named phone games and their spoken copy', () => {
  const { api } = loadGames();
  assert.equal(api.entries.length, 6);
  assert.equal(new Set(api.entries.map(game => game.id)).size, 6);
  for (const game of api.entries) {
    assert.match(game.id, /^ng[A-Z]/);
    assert.ok(game.title && game.icon && game.desc && game.action && game.help);
    assert.equal(game.category, 'swipe');
    assert.ok(api.texts.includes(game.help), `${game.id} help is included for prerecorded speech`);
    assert.match(api.render(game.id), new RegExp(`data-ng-game="${game.id}"`));
  }
  for (const line of ['先点小兔，再点胡萝卜。', '先点小兔，再点小房子。', '先把三根胡萝卜找齐。']) {
    assert.ok(api.texts.includes(line), `dynamic guidance is exported: ${line}`);
  }
});

test('water garden gives gentle feedback and completes exactly four ordered flowers', () => {
  const env = loadGames();
  const { api } = env;
  api.render('ngWaterGarden');
  const order = Array.from(api._test.data.WATER_ORDER);
  assert.equal(api._test.drop('water', `flower-${(order[0] + 1) % 4}`), false);
  assert.equal(api._test.getState().round, 0);
  assert.ok(env.spoken.includes('没关系，再找一找。'));
  order.forEach((flower, index) => {
    assert.equal(api._test.drop('water', `flower-${flower}`), true);
    if (index < order.length - 1) {
      assert.equal(api._test.getState().locked, true);
      assert.equal(env.flushOne(), true);
      assert.equal(api._test.getState().round, index + 1);
    }
  });
  env.flushAll();
  assert.equal(env.finished.length, 1);
  assert.match(env.finished[0], /四朵小花/);
  assert.deepEqual(api._test.getState().watered, order);
});

test('animal puzzle and bento both require all three matching pieces in all rounds', () => {
  for (const spec of [
    { id: 'ngAnimalPuzzle', rows: 'PUZZLES', keys: row => row.pieces.map(piece => piece[0]), finish: /三只小动物/ },
    { id: 'ngBentoChef', rows: 'BENTOS', keys: row => row.foods.map(food => food[0]), finish: /三份便当/ }
  ]) {
    const env = loadGames();
    const { api } = env;
    api.render(spec.id);
    const rounds = Array.from(api._test.data[spec.rows]);
    rounds.forEach((round, roundIndex) => {
      const keys = Array.from(spec.keys(round));
      assert.equal(api._test.drop(keys[0], keys[1]), false, 'wrong outline does not advance');
      keys.forEach(key => assert.equal(api._test.drop(key, key), true));
      if (roundIndex < rounds.length - 1) {
        env.flushOne();
        assert.equal(api._test.getState().round, roundIndex + 1);
      }
    });
    env.flushAll();
    assert.equal(env.finished.length, 1);
    assert.match(env.finished[0], spec.finish);
  }
});

test('animal feeding accepts only the suitable food for all five animals', () => {
  const env = loadGames();
  const { api } = env;
  api.render('ngAnimalFeeding');
  const rounds = Array.from(api._test.data.FEED_ROUNDS);
  rounds.forEach((round, index) => {
    const wrong = Array.from(round.foods).find(food => food[0] !== round.right)[0];
    assert.equal(api._test.drop(wrong, 'animal'), false);
    assert.equal(api._test.drop(round.right, 'animal'), true);
    if (index < rounds.length - 1) env.flushOne();
  });
  env.flushAll();
  assert.equal(env.finished.length, 1);
  assert.match(env.finished[0], /每只小动物/);
});

test('bunny can collect carrots by continuous positions and reaches home for three rounds', () => {
  const env = loadGames();
  const { api } = env;
  api.render('ngBunnyTrail');
  const paths = Array.from(api._test.data.BUNNY_PATHS);
  paths.forEach((pathData, roundIndex) => {
    Array.from(pathData.carrots).forEach(point => assert.equal(api._test.bunnyMove(point[0], point[1]), true));
    assert.equal(api._test.getState().carrots.length, 3);
    assert.equal(api._test.bunnyMove(pathData.home[0], pathData.home[1]), true);
    if (roundIndex < paths.length - 1) {
      env.flushAll();
      assert.equal(api._test.getState().round, roundIndex, 'success waits for an explicit next-level choice');
      assert.equal(api._test.bunnyNext(), true);
      assert.equal(api._test.getState().round, roundIndex + 1);
      assert.equal(api._test.getState().carrots.length, 0);
    }
  });
  env.flushAll();
  assert.equal(env.finished.length, 1);
  assert.match(env.finished[0], /平安回到家/);
});

test('scratch game advances only after enough distinct surface cells are uncovered', () => {
  const env = loadGames();
  const { api } = env;
  api.render('ngRainbowReveal');
  for (let round = 0; round < 3; round += 1) {
    for (let y = 20; y < 320 && !api._test.getState().locked; y += 80) {
      for (let x = 20; x < 480 && !api._test.getState().locked; x += 80) api._test.scratch(x, y);
    }
    assert.ok(api._test.getState().covered.length >= 34, 'a meaningful area was erased');
    assert.equal(api._test.getState().locked, true);
    env.flushOne();
    if (round < 2) assert.equal(api._test.getState().round, round + 1);
  }
  env.flushAll();
  assert.equal(env.finished.length, 1);
  assert.match(env.finished[0], /三个藏起来的图案/);
});

test('stop cancels a pending round and the next render starts a fresh game', () => {
  const env = loadGames();
  const { api } = env;
  api.render('ngWaterGarden');
  const first = api._test.data.WATER_ORDER[0];
  api._test.drop('water', `flower-${first}`);
  assert.ok(env.timers.size > 0);
  api.stop();
  assert.equal(env.timers.size, 0);
  env.flushAll();
  assert.equal(env.finished.length, 0);
  api.render('ngWaterGarden');
  assert.equal(api._test.getState().round, 0);
  assert.deepEqual(api._test.getState().watered, []);
});

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach(name => this.values.add(name)); }
  remove(...names) { names.forEach(name => this.values.delete(name)); }
  toggle(name, force) {
    const add = force === undefined ? !this.values.has(name) : Boolean(force);
    if (add) this.values.add(name); else this.values.delete(name);
    return add;
  }
  contains(name) { return this.values.has(name); }
}

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, value); }
  removeProperty(name) { this.values.delete(name); }
}

class FakeElement {
  constructor(dataset = {}) {
    this.dataset = dataset;
    this.classList = new FakeClassList();
    this.style = new FakeStyle();
    this.listeners = new Map();
    this.captured = new Set();
    this.attributes = new Map();
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  dispatch(type, extra = {}) {
    const event = { type, pointerId: 7, clientX: 10, clientY: 10, isPrimary: true, preventDefault() {}, ...extra };
    for (const fn of [...(this.listeners.get(type) || [])]) fn(event);
  }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name); }
  closest(selector) { return selector === '[data-ng-target]' && this.dataset.ngTarget ? this : null; }
}

function mountBunnyControls(env) {
  const { api } = env;
  api.render('ngBunnyTrail');
  const dom = {};
  function createStage() {
    const rootNode = new FakeElement({ ngGame: 'ngBunnyTrail' });
    const board = new FakeElement();
    const bunny = new FakeElement();
    const home = new FakeElement();
    const count = new FakeElement();
    const message = new FakeElement();
    const hint = new FakeElement();
    const next = new FakeElement();
    const restart = new FakeElement();
    const goalIcon = new FakeElement();
    const goalLabel = new FakeElement();
    const goalDetail = new FakeElement();
    const guide = new FakeElement();
    const guideLine = new FakeElement();
    const progress = Array.from({ length: 3 }, (_, index) => new FakeElement({ ngBunnyProgress: String(index) }));
    const carrots = Array.from({ length: 3 }, (_, index) => new FakeElement({ ngCarrot: String(index) }));
    board.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });
    rootNode.isConnected = true;
    rootNode.querySelector = selector => ({
      '[data-ng-bunny-board]': board,
      '[data-ng-bunny]': bunny,
      '[data-ng-home]': home,
      '[data-ng-carrot-count]': count,
      '[data-ng-message]': message,
      '[data-ng-bunny-hint]': hint,
      '[data-ng-bunny-next]': next,
      '[data-ng-bunny-restart]': restart,
      '[data-ng-bunny-goal-icon]': goalIcon,
      '[data-ng-bunny-goal-label]': goalLabel,
      '[data-ng-bunny-goal-detail]': goalDetail,
      '[data-ng-bunny-guide]': guide,
      '[data-ng-bunny-guide-line]': guideLine
    })[selector] || null;
    rootNode.querySelectorAll = selector => selector === '[data-ng-carrot]' ? carrots : selector === '[data-ng-bunny-progress]' ? progress : [];
    Object.defineProperty(rootNode, 'outerHTML', {
      set() {
        rootNode.isConnected = false;
        dom.stage = createStage();
      }
    });
    return { rootNode, board, bunny, home, count, message, carrots, hint, next, restart, goalIcon, goalLabel, goalDetail, guide, guideLine, progress };
  }
  dom.stage = createStage();
  const host = { querySelector: selector => selector.includes('data-ng-game') ? dom.stage.rootNode : null };
  assert.equal(api.mount('ngBunnyTrail', host), true);
  dom.startDrag = () => {
    const stage = dom.stage;
    const state = api._test.getState();
    stage.bunny.dispatch('pointerdown', { clientX: state.x, clientY: state.y });
    assert.equal(stage.board.hasPointerCapture(7), true);
    return stage;
  };
  dom.moveTo = (stage, point) => stage.board.dispatch('pointermove', { clientX: point[0], clientY: point[1] });
  return dom;
}

test('mounted bunny drag collects all carrots and survives synchronous round cleanup', () => {
  const env = loadGames();
  const { api } = env;
  const dom = mountBunnyControls(env);
  const paths = Array.from(api._test.data.BUNNY_PATHS);
  paths.forEach((pathData, roundIndex) => {
    const stage = dom.startDrag();
    for (const point of pathData.carrots) dom.moveTo(stage, point);
    assert.equal(api._test.getState().carrots.length, 3);
    assert.doesNotThrow(() => dom.moveTo(stage, pathData.home), 'finishing a real bound drag must not write to its cleared pointer');
    assert.equal(stage.board.hasPointerCapture(7), false, 'repaint releases the finishing pointer');
    assert.equal(stage.board.listeners.get('pointermove').size, 0, 'old board handlers are removed');
    assert.equal(api._test.getState().locked, true);
    if (roundIndex < paths.length - 1) {
      env.flushAll();
      assert.equal(api._test.getState().round, roundIndex, 'the success screen stays until next is tapped');
      dom.stage.next.dispatch('click');
      assert.equal(api._test.getState().round, roundIndex + 1);
      assert.equal(api._test.getState().carrots.length, 0);
      assert.equal(api._test.getState().done, false);
      assert.ok(dom.stage.board.listeners.get('pointermove').size > 0, 'next board is mounted');
    }
  });
  assert.equal(api._test.getState().done, true);
  env.flushAll();
  assert.equal(env.finished.length, 1);
  assert.match(env.finished[0], /平安回到家/);
});

test('third bunny round can cancel a drag, resume, and exit before celebration', () => {
  const env = loadGames();
  const { api } = env;
  const dom = mountBunnyControls(env);
  const paths = Array.from(api._test.data.BUNNY_PATHS);
  for (const pathData of paths.slice(0, 2)) {
    const stage = dom.startDrag();
    for (const point of pathData.carrots) dom.moveTo(stage, point);
    dom.moveTo(stage, pathData.home);
    dom.stage.next.dispatch('click');
  }
  const third = paths[2];
  const cancelled = dom.startDrag();
  for (const point of third.carrots) dom.moveTo(cancelled, point);
  cancelled.board.dispatch('pointercancel');
  assert.equal(cancelled.board.hasPointerCapture(7), false);
  assert.equal(api._test.getState().carrots.length, 3, 'cancelling preserves collected carrots');
  assert.equal(api._test.getState().locked, false);
  const resumed = dom.startDrag();
  assert.doesNotThrow(() => dom.moveTo(resumed, third.home));
  assert.equal(api._test.getState().done, true);
  assert.ok(env.timers.size > 0, 'final celebration is pending');
  api.stop();
  assert.equal(env.timers.size, 0, 'exit cancels celebration');
  assert.equal(resumed.board.hasPointerCapture(7), false);
  env.flushAll();
  assert.equal(env.finished.length, 0, 'leaving must not later celebrate an old game');
  api.render('ngBunnyTrail');
  assert.equal(api._test.getState().round, 0);
  assert.deepEqual(api._test.getState().carrots, []);
});

test('mounted controls support tap selection and release a cancelled pointer', () => {
  const env = loadGames();
  const { api, sandbox } = env;
  api.render('ngWaterGarden');
  const sourceButton = new FakeElement({ ngSource: 'water' });
  const wrongTarget = new FakeElement({ ngTarget: 'flower-0' });
  const rightTarget = new FakeElement({ ngTarget: 'flower-1' });
  const message = new FakeElement();
  message.textContent = '';
  const rootNode = new FakeElement({ ngGame: 'ngWaterGarden' });
  rootNode.isConnected = true;
  rootNode.querySelectorAll = selector => selector === '[data-ng-source]' ? [sourceButton] : selector === '[data-ng-target]' ? [wrongTarget, rightTarget] : [];
  rootNode.querySelector = selector => selector === '[data-ng-message]' ? message : null;
  const host = { querySelector: selector => selector.includes('data-ng-game') ? rootNode : null };
  sandbox.document.elementFromPoint = () => wrongTarget;
  assert.equal(api.mount('ngWaterGarden', host), true);

  sourceButton.dispatch('pointerdown');
  assert.equal(sourceButton.captured.has(7), true);
  sourceButton.dispatch('pointercancel');
  assert.equal(sourceButton.captured.has(7), false);
  assert.equal(api._test.getState().round, 0);

  sourceButton.dispatch('click');
  assert.equal(api._test.getState().selected, 'water');
  wrongTarget.dispatch('click');
  assert.equal(api._test.getState().round, 0);
  assert.match(message.textContent, /没关系/);
  rightTarget.dispatch('click');
  assert.equal(api._test.getState().watered.length, 1);
  assert.equal(api._test.getState().locked, true);
  api.stop();
  assert.equal(sourceButton.listeners.get('pointerdown').size, 0);
});

test('mobile styles keep every board contained and gesture surfaces explicit', () => {
  assert.match(styles, /\.ng-game\s*\{[^}]*min-width:0;[^}]*overflow:hidden;/s);
  assert.match(styles, /touch-action:none/);
  assert.match(styles, /min-width:48px;\s*min-height:48px/);
  assert.match(styles, /@media \(max-width:330px\)/);
  for (const selector of ['.ng-garden-board', '.ng-puzzle-stage', '.ng-bento-box', '.ng-bunny-board', '.ng-scratch-board', '.ng-feed-stage']) {
    assert.ok(styles.includes(selector), `has scoped layout for ${selector}`);
  }
});

test('bunny goal and illustrated progress follow free collection and point home only when ready', () => {
  const env = loadGames();
  const { api } = env;
  const dom = mountBunnyControls(env);
  const pathData = api._test.data.BUNNY_PATHS[0];
  assert.equal(api._test.bunnyGoal().index, 0);
  const stage = dom.startDrag();
  dom.moveTo(stage, [76, 82]);
  dom.moveTo(stage, pathData.carrots[2]);
  assert.deepEqual(api._test.getState().carrots, [2], 'a different carrot may be collected without any penalty');
  assert.equal(stage.progress[2].classList.contains('collected'), true);
  assert.match(stage.progress[2].getAttribute('aria-label'), /已收好/);
  assert.equal(stage.goalIcon.textContent, '🥕');
  assert.equal(api._test.bunnyGoal().index, 0);
  assert.equal(stage.count.textContent, '1');
  for (const point of pathData.carrots.slice(0, 2)) dom.moveTo(stage, point);
  assert.equal(api._test.bunnyGoal().icon, '🏡');
  assert.equal(stage.goalIcon.textContent, '🏡');
  assert.equal(stage.home.classList.contains('ready'), true);
  assert.equal(stage.progress.filter(item => item.classList.contains('collected')).length, 3);
  assert.match(stage.goalLabel.textContent, /回家/);
});

test('bunny hint reveals a useful next target without moving the rabbit or giving away carrots', () => {
  const env = loadGames();
  const { api } = env;
  const dom = mountBunnyControls(env);
  const first = api._test.data.BUNNY_PATHS[0];
  for (const point of first.carrots) api._test.bunnyMove(...point);
  api._test.bunnyMove(...first.home);
  dom.stage.next.dispatch('click');
  const before = api._test.getState();
  assert.equal(before.round, 1);
  assert.equal(before.hintsEnabled, false);
  dom.stage.hint.dispatch('click');
  const after = api._test.getState();
  assert.equal(after.hintsEnabled, true);
  assert.equal(after.x, before.x);
  assert.equal(after.y, before.y);
  assert.deepEqual(after.carrots, before.carrots);
  assert.equal(dom.stage.guide.classList.contains('show'), true);
  assert.equal(dom.stage.carrots[0].classList.contains('target-now'), true);
  assert.ok(env.spoken.includes('先点小兔，再点胡萝卜。'));
});

test('touching the rabbit edge preserves the finger offset and keeps the whole rabbit on the board', () => {
  const env = loadGames();
  const { api } = env;
  const dom = mountBunnyControls(env);
  const stage = dom.stage;
  const before = api._test.getState();
  stage.bunny.dispatch('pointerdown', { clientX: before.x + 4, clientY: before.y + 5 });
  stage.board.dispatch('pointermove', { clientX: before.x + 10, clientY: before.y - 3 });
  assert.equal(api._test.getState().x, before.x + 6);
  assert.equal(api._test.getState().y, before.y - 8);
  stage.board.dispatch('pointerup');
  assert.equal(stage.board.hasPointerCapture(7), false);
  assert.equal(api._test.bunnyMove(NaN, 50), false);
  assert.equal(api._test.bunnyMove(300, -100), true);
  assert.equal(api._test.getState().x, 88);
  assert.equal(api._test.getState().y, 12);
});

test('bunny success waits without a countdown and next-level taps cannot skip an unfinished map', () => {
  const env = loadGames();
  const { api } = env;
  const dom = mountBunnyControls(env);
  assert.equal(api._test.bunnyNext(), false);
  assert.equal(api.render('ngBunnyTrail').includes('ng-bunny-stage-done'), false, 'the unfinished map keeps its original layout');
  const first = api._test.data.BUNNY_PATHS[0];
  for (const point of first.carrots) api._test.bunnyMove(...point);
  api._test.bunnyMove(...first.home);
  assert.equal(api._test.getState().roundComplete, true);
  assert.equal(env.timers.size, 0, 'a completed map schedules no automatic jump');
  env.flushAll();
  assert.equal(api._test.getState().round, 0);
  const completedMarkup = api.render('ngBunnyTrail');
  assert.match(completedMarkup, /data-ng-bunny-next/);
  assert.ok(completedMarkup.indexOf('ng-bunny-score') < completedMarkup.indexOf('ng-bunny-stage-done'), 'success follows the collection progress');
  assert.ok(completedMarkup.indexOf('data-ng-bunny-next') < completedMarkup.indexOf('data-ng-bunny-board'), 'the explicit next button is visible above the map on a phone');
  dom.stage.next.dispatch('click');
  assert.equal(api._test.getState().round, 1);
  assert.equal(api._test.getState().roundComplete, false);
  assert.equal(api.render('ngBunnyTrail').includes('ng-bunny-stage-done'), false, 'the new map removes the completed-stage action');
  dom.stage.next.dispatch('click');
  assert.equal(api._test.getState().round, 1, 'a second tap cannot skip the next level');
});

test('replaying the current bunny map clears its collections, releases a drag, and cancels old celebration', () => {
  const env = loadGames();
  const { api } = env;
  const dom = mountBunnyControls(env);
  const paths = api._test.data.BUNNY_PATHS;
  for (const map of Array.from(paths).slice(0, 2)) {
    for (const point of map.carrots) api._test.bunnyMove(...point);
    api._test.bunnyMove(...map.home);
    dom.stage.next.dispatch('click');
  }
  const oldStage = dom.startDrag();
  dom.moveTo(oldStage, paths[2].carrots[0]);
  dom.stage.restart.dispatch('click');
  assert.equal(oldStage.board.hasPointerCapture(7), false);
  assert.equal(oldStage.board.listeners.get('pointermove').size, 0);
  assert.equal(api._test.getState().round, 2);
  assert.deepEqual(api._test.getState().carrots, []);
  assert.equal(api._test.getState().x, paths[2].start[0]);
  for (const point of paths[2].carrots) api._test.bunnyMove(...point);
  api._test.bunnyMove(...paths[2].home);
  assert.equal(api._test.getState().done, true);
  assert.ok(env.timers.size);
  assert.equal(api._test.bunnyRestart(), true);
  assert.equal(api._test.getState().round, 2);
  assert.equal(api._test.getState().done, false);
  assert.equal(env.timers.size, 0);
  env.flushAll();
  assert.equal(env.finished.length, 0);
});

test('a carrot tap works after a native-style drag even when WebKit emits no click', () => {
  const env = loadGames();
  const { api } = env;
  const dom = mountBunnyControls(env);
  const first = api._test.data.BUNNY_PATHS[0];
  const stage = dom.startDrag();
  dom.moveTo(stage, first.carrots[0]);
  stage.board.dispatch('pointerup');
  assert.equal(stage.board.hasPointerCapture(7), false);
  assert.equal(stage.bunny.classList.contains('dragging'), false);
  assert.deepEqual(api._test.getState().carrots, [0]);
  const target = stage.carrots[1];
  target.dispatch('pointerdown', { clientX: 57, clientY: 68 });
  target.dispatch('pointerup', { clientX: 58, clientY: 69 });
  assert.deepEqual(api._test.getState().carrots, [0, 1]);
  assert.equal(stage.count.textContent, '2');
  const pickups = env.spoken.filter(text => text === '找到胡萝卜啦！').length;
  target.dispatch('click', { detail: 1 });
  assert.equal(env.spoken.filter(text => text === '找到胡萝卜啦！').length, pickups, 'the compatibility click cannot collect or speak again');
  stage.carrots[2].dispatch('click', { detail: 0 });
  assert.equal(api._test.getState().carrots.length, 3, 'a keyboard click stays available during the compatibility guard');
});

test('one home tap produces one hint and its compatibility click cannot advance a new success screen', () => {
  const env = loadGames();
  const { api } = env;
  const dom = mountBunnyControls(env);
  dom.stage.bunny.dispatch('click', { detail: 0 });
  dom.stage.home.dispatch('pointerdown');
  dom.stage.home.dispatch('pointerup');
  dom.stage.home.dispatch('click', { detail: 1 });
  assert.equal(env.spoken.filter(text => text === '先把三根胡萝卜找齐。').length, 1);
  const first = api._test.data.BUNNY_PATHS[0];
  for (const point of first.carrots) api._test.bunnyMove(...point);
  const home = dom.stage.home;
  home.dispatch('pointerdown');
  home.dispatch('pointerup');
  assert.equal(api._test.getState().roundComplete, true);
  dom.stage.next.dispatch('click', { detail: 1 });
  assert.equal(api._test.getState().round, 0, 'a late compatibility click cannot hit the newly rendered next button');
  dom.stage.next.dispatch('pointerdown');
  dom.stage.next.dispatch('pointerup');
  assert.equal(api._test.getState().round, 1);
  const second = api._test.data.BUNNY_PATHS[1];
  for (const point of second.carrots) api._test.bunnyMove(...point);
  api._test.bunnyMove(...second.home);
  dom.stage.next.dispatch('click', { detail: 1 });
  assert.equal(api._test.getState().round, 1, 'the previous next gesture cannot later skip a second completed map');
  dom.stage.next.dispatch('click', { detail: 0 });
  assert.equal(api._test.getState().round, 2, 'keyboard next is still an explicit supported action');
});

test('cancelled or dragged destination presses do not turn into picks or count rabbit releases twice', () => {
  const env = loadGames();
  const { api } = env;
  const dom = mountBunnyControls(env);
  dom.stage.bunny.dispatch('click', { detail: 0 });
  const target = dom.stage.carrots[0];
  target.dispatch('pointerdown', { clientX: 29, clientY: 58 });
  target.dispatch('pointercancel');
  target.dispatch('pointerup', { clientX: 29, clientY: 58 });
  target.dispatch('click', { detail: 1 });
  assert.deepEqual(api._test.getState().carrots, []);
  target.dispatch('pointerdown', { clientX: 29, clientY: 58 });
  target.dispatch('pointerup', { clientX: 80, clientY: 58 });
  target.dispatch('click', { detail: 1 });
  assert.deepEqual(api._test.getState().carrots, []);
  const stage = dom.startDrag();
  dom.moveTo(stage, api._test.data.BUNNY_PATHS[0].carrots[0]);
  stage.board.dispatch('pointerup');
  const pickups = env.spoken.filter(text => text === '找到胡萝卜啦！').length;
  // No destination pointerdown occurred during that captured rabbit gesture.
  stage.carrots[1].dispatch('pointerup', { clientX: 57, clientY: 68 });
  assert.equal(api._test.getState().carrots.length, 1);
  assert.equal(env.spoken.filter(text => text === '找到胡萝卜啦！').length, pickups);
});

test('lost capture and an unpressed mouse move end a rabbit gesture without clearing its progress', () => {
  const env = loadGames();
  const { api } = env;
  const dom = mountBunnyControls(env);
  const stage = dom.startDrag();
  dom.moveTo(stage, api._test.data.BUNNY_PATHS[0].carrots[0]);
  stage.board.dispatch('lostpointercapture');
  assert.equal(stage.board.hasPointerCapture(7), false);
  assert.equal(stage.bunny.classList.contains('dragging'), false);
  const stopped = api._test.getState();
  stage.board.dispatch('pointermove', { clientX: 80, clientY: 20 });
  assert.equal(api._test.getState().x, stopped.x);
  assert.equal(api._test.getState().y, stopped.y);
  assert.deepEqual(api._test.getState().carrots, [0]);
  const resumed = dom.startDrag();
  resumed.board.dispatch('pointermove', { pointerType: 'mouse', buttons: 0, clientX: 80, clientY: 20 });
  assert.equal(resumed.board.hasPointerCapture(7), false);
  assert.equal(resumed.bunny.classList.contains('dragging'), false);
  assert.equal(api._test.getState().x, stopped.x);
  resumed.carrots[1].dispatch('pointerdown', { clientX: 57, clientY: 68 });
  resumed.carrots[1].dispatch('pointerup', { clientX: 57, clientY: 68 });
  assert.deepEqual(api._test.getState().carrots, [0, 1], 'a new destination tap works after abnormal capture loss');
});

test('rabbit board targets keep their coordinate center while pressed against the shared button effect', () => {
  const sharedStyles = fs.readFileSync(path.join(rootDir, 'kid.css'), 'utf8');
  assert.match(sharedStyles, /button:active\s*\{[^}]*transform:scale\(\.97\)/, 'exercise the actual shared press effect');
  const centeredPress = styles.match(/(\.ng-carrot:active,\s*\.ng-bunny-home:active,\s*\.ng-bunny-player:active)\s*\{([^}]+)\}/);
  assert.ok(centeredPress, 'each board button has a class plus active state, overriding button:active specificity');
  assert.match(centeredPress[2], /transform:translate\(-50%,-50%\) scale\(\.97\)/);
  assert.match(styles, /\.ng-bunny-player\.dragging:active\s*\{[^}]*transform:translate\(-50%,-50%\) scale\(1\.08\)/, 'the drag retains its finger offset and larger active shape');
  assert.equal(source.includes('BUNNY_TAP_TRACE') || source.includes('BUNNY_POINTER_TRACE'), false, 'temporary event diagnostics are removed before publication');
});
