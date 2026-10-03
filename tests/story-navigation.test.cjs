const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'kid.js'), 'utf8');

function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `missing ${name}`);
  const end = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, end < 0 ? source.length : end);
}

const storyStart = source.indexOf('const STORY_FILTERS=');
const storyEnd = source.indexOf('\nfunction pageVisual', storyStart);
assert.ok(storyStart >= 0 && storyEnd > storyStart, 'missing story directory block');
const storyDirectorySource = source.slice(storyStart, storyEnd);

function makeHarness(startPage = 'stories') {
  const values = new Map();
  const writes = [];
  const scrollCalls = [];
  const book = {
    id: 'paw_01', title: '小猫救援', group: 'paw', cover: 'cover.webp', reillustrated: true,
    pages: [{ text: '第一页', img: 'one.webp' }, { text: '第二页', img: 'two.webp' }]
  };
  const activeChip = {
    offsetLeft: 90, clientWidth: 90,
    getBoundingClientRect() { return { left: 40, right: 130 }; }
  };
  const rail = {
    scrollLeft: 71, clientWidth: 220,
    querySelector(selector) { return selector === '.chip.active' ? activeChip : null; },
    getBoundingClientRect() { return { left: 0, right: 220 }; },
    scrollTo(options) { this.scrollLeft = Number(options.left) || 0; }
  };
  const card = {
    dataset: { bookId: book.id },
    getBoundingClientRect() { return { top: 238 }; },
    closest(selector) { return selector === '.book' ? this : null; }
  };
  const grid = { querySelectorAll(selector) { return selector === '.book' ? [card] : []; } };
  const document = {
    activeElement: card,
    querySelector(selector) {
      if (selector === '.filters') return rail;
      if (selector === '.book-grid') return grid;
      return null;
    },
    querySelectorAll(selector) { return selector === '.book' ? [card] : []; }
  };
  const state = {
    page: startPage,
    stack: [],
    storyFilter: 'paw',
    storyMenu: { filter: 'paw' },
    book: null,
    pageNo: 0,
    muted: false,
    readerAuto: false,
    readerPaused: false,
    favs: [],
    stars: 0
  };
  let renders = 0;
  let stops = 0;
  let autoReads = 0;
  let rewards = 0;
  const context = {
    console,
    state,
    window: { BOOKS: [book], KNOW: null },
    document,
    appEl: { innerHTML: '' },
    sessionStorage: {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { values.set(key, String(value)); writes.push([key, String(value)]); }
    },
    localStorage: {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { values.set(key, String(value)); }
    },
    innerWidth: 390,
    scrollY: 620,
    scrollTo(x, y) { context.scrollY = y; scrollCalls.push([x, y]); },
    requestAnimationFrame(fn) { fn(); },
    $(selector) { return document.querySelector(selector); },
    esc(value) { return String(value); },
    shell(title, subtitle, body) { return `${title}|${subtitle}|${body}`; },
    thumb(item) { return `<img alt="${item.title}">`; },
    pageVisual() { return '<div class="story-picture"></div>'; },
    stopInteractiveGame() {},
    stopAudio() { stops += 1; },
    rememberGameMenu() {},
    creativeGameHelp() {},
    render() { renders += 1; },
    readAutoPage() { autoReads += 1; },
    reward() { rewards += 1; },
  };
  vm.createContext(context);
  vm.runInContext([
    functionSource('go'),
    functionSource('back'),
    storyDirectorySource,
    functionSource('renderReader'),
    functionSource('leaveReader'),
    functionSource('turn'),
    'globalThis.storyApi={go,back,renderStories,showBooks,rememberStoryMenu,restoreStoryMenu,openBook,renderReader,leaveReader,turn};'
  ].join('\n'), context);
  return {
    api: context.storyApi, state, context, book, rail, card, values, writes, scrollCalls,
    get renders() { return renders; },
    get stops() { return stops; },
    get autoReads() { return autoReads; },
    get rewards() { return rewards; }
  };
}

test('从分类故事进入和退出时保留目录，随后返回首页而不会回跳阅读器', () => {
  const h = makeHarness('stories');
  h.state.stack.push({ page: 'home', book: null, pageNo: 0 });

  h.api.openBook('paw_01', 0);
  assert.equal(h.state.page, 'reader');
  assert.deepEqual(h.state.stack.map(x => x.page), ['home', 'stories']);
  assert.equal(h.state.storyMenu.filter, 'paw');
  assert.equal(h.state.storyMenu.y, 620);
  assert.equal(h.state.storyMenu.rail, 71);
  assert.equal(h.state.storyMenu.cardId, 'paw_01');
  assert.equal(h.autoReads, 1, '打开故事仍会自动朗读');

  assert.equal(h.api.leaveReader(), true);
  assert.equal(h.state.page, 'stories');
  assert.deepEqual(h.state.stack.map(x => x.page), ['home']);
  assert.equal(h.state.readerAuto, false);
  h.api.back();
  assert.equal(h.state.page, 'home');
  assert.deepEqual(h.state.stack, []);
});

test('首页继续故事退出后回首页，末页读完也不会把reader重新压栈', () => {
  const fromHome = makeHarness('home');
  fromHome.api.openBook('paw_01', 1);
  assert.equal(fromHome.state.page, 'reader');
  assert.deepEqual(fromHome.state.stack.map(x => x.page), ['home']);
  assert.match(fromHome.api.renderReader(), /aria-label="返回首页"/);
  assert.match(fromHome.api.renderReader(), /aria-label="收藏小猫救援"/);
  fromHome.state.favs.push('paw_01');
  assert.match(fromHome.api.renderReader(), /aria-label="取消收藏小猫救援"/);
  fromHome.api.leaveReader();
  assert.equal(fromHome.state.page, 'home');
  assert.deepEqual(fromHome.state.stack, []);

  const finished = makeHarness('reader');
  finished.state.book = finished.book;
  finished.state.pageNo = 1;
  finished.state.stack.push({ page: 'stories', book: null, pageNo: 0 });
  assert.match(finished.api.renderReader(), /aria-label="返回故事屋"/);
  finished.api.turn(1);
  assert.equal(finished.rewards, 1);
  assert.equal(finished.state.page, 'stories');
  assert.deepEqual(finished.state.stack, []);

  const previous = makeHarness('reader');
  previous.state.book = previous.book;
  previous.state.pageNo = 1;
  previous.state.stack.push({ page: 'stories', book: null, pageNo: 0 });
  previous.api.turn(-1);
  assert.equal(previous.state.page, 'reader');
  assert.equal(previous.state.pageNo, 0, '上一页仍在阅读器内正常翻页');
  assert.deepEqual(previous.state.stack.map(x => x.page), ['stories']);
});

test('筛选、纵向位置和筛选轨道会保存并在故事目录恢复', () => {
  const h = makeHarness('stories');
  const html = h.api.renderStories('paw');
  assert.match(html, /role="tablist"/);
  assert.match(html, /role="tab" aria-selected="true" class="chip active" onclick="showBooks\('paw'\)"/);
  assert.match(html, /data-book-id="paw_01"/);

  h.api.showBooks('paw');
  assert.equal(h.state.storyFilter, 'paw');
  assert.equal(h.context.scrollY, 0);
  assert.equal(JSON.parse(h.values.get('kid-story-menu-v1')).filter, 'paw');

  h.context.scrollY = 574;
  h.rail.scrollLeft = 86;
  assert.equal(h.api.rememberStoryMenu('paw_01'), true);
  h.context.scrollY = 0;
  h.rail.scrollLeft = 0;
  h.api.restoreStoryMenu();
  assert.equal(h.context.scrollY, 574);
  assert.equal(h.rail.scrollLeft, 86);
  assert.deepEqual(h.scrollCalls.at(-1), [0, 574]);

  h.api.go('home');
  assert.equal(h.state.page, 'home');
  assert.deepEqual(h.state.stack.map(x => x.page), ['stories']);
  const saved = JSON.parse(h.values.get('kid-story-menu-v1'));
  assert.equal(saved.filter, 'paw');
  assert.equal(saved.y, 574);
  assert.equal(saved.rail, 86);
});
