const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function navigationHarness() {
  const stored = new Map();
  const frames = [];
  const scrolls = [];
  const positions = {
    390: { daily: 330, 'level-4:safety': 1650, 'modern:modern_tech': 350, 'level-5:modern_tech': 2500, 'favorite:world_peace/world_peace-03': 380 },
    844: { daily: 330, 'level-4:safety': 900, 'modern:modern_tech': 250, 'level-5:modern_tech': 1100, 'favorite:world_peace/world_peace-03': 380 }
  };
  let hub = null;
  const sandbox = {
    console, Date, setTimeout, clearTimeout,
    state: { page: 'learn', learn: '', stack: [] },
    innerWidth: 390,
    innerHeight: 844,
    scrollY: 0,
    requestAnimationFrame(callback) { frames.push(callback); },
    scrollTo(x, y) { sandbox.scrollY = y; scrolls.push([x, y]); },
    localStorage: {
      getItem(key) { return stored.get(key) || null; },
      setItem(key, value) { stored.set(key, String(value)); }
    },
    document: {
      activeElement: null,
      body: { classList: { toggle() {} } },
      querySelector(selector) {
        if (selector === '.know-hub') return hub;
        if (selector === '.topbar') return { getBoundingClientRect() { return { top: 0, bottom: 74, height: 74 }; } };
        if (selector === '#bottomNav') return { getBoundingClientRect() { return { top: sandbox.innerHeight - 76, bottom: sandbox.innerHeight, height: 76 }; } };
        return null;
      }
    },
    stopAudio() {},
    playSpoken() {}
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const name of ['recognition-data.js', 'recognition.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), sandbox);
  }
  sandbox.render = () => {
    const html = sandbox.state.page === 'learn' ? sandbox.KNOW.renderHub() : sandbox.state.page === 'lesson' ? sandbox.KNOW.renderLesson() : '';
    hub = null;
    if (sandbox.state.page === 'learn') {
      const entries = [...html.matchAll(/data-know-hub-entry="([^"]+)"/g)].map(match => {
        const id = match[1];
        const entry = {
          getAttribute(name) { return name === 'data-know-hub-entry' ? id : null; },
          getBoundingClientRect() {
            const top = (positions[sandbox.innerWidth]?.[id] || 0) - sandbox.scrollY;
            return { top, bottom: top + 108, height: 108 };
          },
          closest() { return entry; }
        };
        return entry;
      });
      hub = {
        contains(node) { return entries.includes(node); },
        querySelectorAll() { return entries; }
      };
    }
    // This is the order used by kid.js render(): reset first, module hooks second.
    sandbox.scrollTo(0, 0);
    sandbox.KNOW.afterRender();
  };
  sandbox.go = (page, data, push = true) => {
    if (push && page !== sandbox.state.page) sandbox.state.stack.push({ page: sandbox.state.page });
    sandbox.state.page = page;
    sandbox.render();
  };
  sandbox.render();
  function eventFor(id) {
    const entry = hub.querySelectorAll().find(node => node.getAttribute('data-know-hub-entry') === id);
    assert.ok(entry, `菜单中应有入口 ${id}`);
    return { currentTarget: entry };
  }
  return {
    sandbox, positions, scrolls, eventFor,
    setScroll(y) { sandbox.scrollY = y; },
    flush() { while (frames.length) frames.shift()(); },
    get frameCount() { return frames.length; }
  };
}

test('第四站返回原滚动位置，普通重绘不会再次拉回旧位置', () => {
  const h = navigationHarness();
  h.setScroll(1500);
  h.sandbox.KNOW.openCategory('safety', 0, h.eventFor('level-4:safety'));
  assert.equal(h.sandbox.scrollY, 0);
  assert.equal(h.sandbox.KNOW.backRoot(), true);
  assert.equal(h.sandbox.scrollY, 0, '等待 root render 的滚动重置完成');
  h.flush();
  assert.equal(h.sandbox.scrollY, 1500);
  h.setScroll(420);
  h.sandbox.render();
  h.flush();
  assert.equal(h.sandbox.scrollY, 0, '已消费的返回位置不能影响后来普通页面重绘');
});

test('转横屏后按原分类的屏幕位置恢复，而不是使用旧的长页面高度', () => {
  const h = navigationHarness();
  h.setScroll(1500); // 分类在屏幕上方 150px。
  h.sandbox.KNOW.openCategory('safety', 0, h.eventFor('level-4:safety'));
  h.sandbox.innerWidth = 844;
  h.sandbox.KNOW.backRoot();
  h.flush();
  assert.equal(h.sandbox.scrollY, 750);
});

test('纵屏入口在568px，转844×390横屏后完整显示在顶栏和底栏之间', () => {
  const h = navigationHarness();
  h.setScroll(2500 - 568);
  h.sandbox.KNOW.openCategory('modern_tech', 0, h.eventFor('level-5:modern_tech'));
  h.sandbox.innerWidth = 844;
  h.sandbox.innerHeight = 390;
  h.sandbox.KNOW.backRoot();
  h.flush();
  const rect = h.eventFor('level-5:modern_tech').currentTarget.getBoundingClientRect();
  assert.equal(rect.top, 198);
  assert.ok(rect.top >= 74 + 8);
  assert.ok(rect.bottom <= 390 - 76 - 8);
});

test('宽度不变但可见高度缩小时，也不把入口恢复到屏幕下面', () => {
  const h = navigationHarness();
  h.setScroll(2500 - 568);
  h.sandbox.KNOW.openCategory('modern_tech', 0, h.eventFor('level-5:modern_tech'));
  h.sandbox.innerHeight = 390;
  h.sandbox.KNOW.backRoot();
  h.flush();
  const rect = h.eventFor('level-5:modern_tech').currentTarget.getBoundingClientRect();
  assert.equal(rect.top, 198);
  assert.ok(rect.bottom <= 390 - 76 - 8);
});

test('首次收藏新增菜单区域后，返回仍能看到原来的分类入口', () => {
  const h = navigationHarness();
  h.setScroll(1500);
  h.sandbox.KNOW.openCategory('safety', 0, h.eventFor('level-4:safety'));
  h.sandbox.KNOW.actions.toggleFavorite();
  // 新收藏区把后面的分类向下推，屏幕宽度不变。
  h.positions[390]['level-4:safety'] += 160;
  h.sandbox.KNOW.backRoot();
  h.flush();
  assert.equal(h.sandbox.scrollY, 1660);
});

for (const [id, before, expected] of [
  ['modern:modern_tech', 200, 100],
  ['level-5:modern_tech', 2350, 950]
]) {
  test(`重复的科技分类使用实际点击入口 ${id} 恢复`, () => {
    const h = navigationHarness();
    h.setScroll(before);
    h.sandbox.KNOW.openCategory('modern_tech', 0, h.eventFor(id));
    h.sandbox.innerWidth = 844;
    h.sandbox.KNOW.backRoot();
    h.flush();
    assert.equal(h.sandbox.scrollY, expected);
  });
}

test('每日任务和收藏卡入口也会恢复原位置', () => {
  const daily = navigationHarness();
  daily.setScroll(180);
  daily.sandbox.KNOW.openDaily(daily.eventFor('daily'));
  daily.sandbox.KNOW.backRoot();
  daily.flush();
  assert.equal(daily.sandbox.scrollY, 180);

  const favorite = navigationHarness();
  favorite.sandbox.KNOW.openCategory('world_peace', 2);
  favorite.sandbox.KNOW.actions.toggleFavorite();
  favorite.sandbox.KNOW.backRoot();
  favorite.flush();
  favorite.setScroll(250);
  favorite.sandbox.KNOW.actions.openFavorite('world_peace/world_peace-03', favorite.eventFor('favorite:world_peace/world_peace-03'));
  favorite.sandbox.innerWidth = 844;
  favorite.sandbox.KNOW.backRoot();
  favorite.flush();
  assert.equal(favorite.sandbox.scrollY, 250);
});

test('首页科技快捷入口不复用上次分类的滚动位置', () => {
  const h = navigationHarness();
  h.setScroll(1500);
  h.sandbox.KNOW.openCategory('safety', 0, h.eventFor('level-4:safety'));
  h.sandbox.KNOW.actions.goHome();
  h.setScroll(640);
  h.sandbox.KNOW.openModern('AI');
  h.sandbox.KNOW.backRoot();
  h.flush();
  assert.equal(h.sandbox.state.page, 'learn');
  assert.equal(h.sandbox.scrollY, 0);
});

test('返回尚未执行就离开页面，旧动画帧不能滚动新页面或后来重开的菜单', () => {
  const h = navigationHarness();
  h.setScroll(1500);
  h.sandbox.KNOW.openCategory('safety', 0, h.eventFor('level-4:safety'));
  h.sandbox.KNOW.backRoot();
  assert.equal(h.frameCount, 1);
  h.sandbox.go('games');
  h.setScroll(720);
  h.flush();
  assert.equal(h.sandbox.scrollY, 720);
  h.sandbox.go('learn');
  h.flush();
  assert.equal(h.sandbox.scrollY, 0);
});

test('旧返回帧不会覆盖马上打开并返回的新入口', () => {
  const h = navigationHarness();
  h.setScroll(1500);
  h.sandbox.KNOW.openCategory('safety', 0, h.eventFor('level-4:safety'));
  h.sandbox.KNOW.backRoot();
  h.setScroll(180);
  h.sandbox.KNOW.openDaily(h.eventFor('daily'));
  h.sandbox.KNOW.backRoot();
  h.flush();
  assert.equal(h.sandbox.scrollY, 180);
});
