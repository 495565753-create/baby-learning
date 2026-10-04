const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function load(recent) {
  const calls = [];
  const context = {
    URL,
    localStorage: { getItem: () => recent },
    BOOKS: [{ id: 'story-one', title: '故事一', pages: [{}, {}, {}] }],
    state: { page: 'home', gameMenu: { category: 'swipe', y: 600 } },
    go(page) { context.state.page = page; calls.push(['go', page]); },
    showSubject(subject) { calls.push(['subject', subject, context.state.page]); },
    speak(text) { calls.push(['speak', text]); },
    openBook(id, page) { calls.push(['book', id, page]); },
    render() { context.html = context.HOME.renderVideos(); },
    KNOW: {
      summary: () => ({ dailyTarget: 6, dailyLearned: 2, favoritesCount: 1 }),
      openDaily: () => calls.push(['daily']),
      openModern: () => calls.push(['modern']),
      openFavorites: () => calls.push(['favorites'])
    }
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ['kids-videos-data.js', 'kids-home.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  return { context, calls, api: context.HOME };
}
test('home subject shortcuts enter the classroom route before choosing a subject', () => {
  const { api, calls } = load();
  api.openSubject('数学');
  assert.deepEqual(calls, [['go', 'school'], ['subject', '数学', 'school']]);
});
test('challenge shortcut resets the old menu position and selects the new category', () => {
  const { api, context, calls } = load();
  api.openChallenge();
  assert.equal(context.state.page, 'games');
  assert.equal(context.state.gameCategory, 'challenge');
  assert.equal(context.state.gameMenu.y, 0);
  assert.equal(context.state.gameMenu.category, 'challenge');
  assert.equal(calls[0][0], 'go');
});
test('daily, modern and favorites shortcuts invoke the public recognition API', () => {
  const { api, calls } = load();
  api.openDaily(); api.openModern(); api.openFavorites();
  assert.deepEqual(calls, [['daily'], ['modern'], ['favorites']]);
});
test('story resume validates saved data and clamps to the real book page range', () => {
  for (const value of ['broken JSON', JSON.stringify({ id: 'missing', page: 1 })]) {
    const { api, calls } = load(value); api.resumeStory(); assert.deepEqual(calls, []);
  }
  const { api, calls } = load(JSON.stringify({ id: 'story-one', title: '<script>', page: 999 }));
  assert.equal(api._test.readRecent().title, '故事一');
  api.resumeStory(); assert.deepEqual(calls, [['book', 'story-one', 2]]);
});
test('video topics do not mix handcraft entries into the everyday-life filter', () => {
  const { api, context } = load();
  api.selectVideoCategory('life');
  assert.equal((context.html.match(/class="video-card"/g) || []).length, 2);
  assert.match(context.html, /大卡车运东西/);
  assert.doesNotMatch(context.html, /冰棍棒|小帆船/);
  api.selectVideoCategory('craft');
  assert.equal((context.html.match(/class="video-card"/g) || []).length, 2);
  assert.match(context.html, /小帆船/);
});
test('video entries open only public HTTPS pages without exposing the parent tab', () => {
  const { api, context } = load();
  assert.equal(api._test.safeVideoUrl('javascript:alert(1)'), '');
  assert.equal(api._test.safeVideoUrl('https://private:password@example.com/'), '');
  assert.equal(api._test.safeVideoUrl('http://example.com/'), '');
  context.KIDS_VIDEOS.push({ url: 'javascript:alert(1)', title: 'invalid', category: 'life' });
  const html = api.renderVideos();
  assert.equal((html.match(/class="video-card"/g) || []).length, 11);
  assert.equal((html.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, 11);
  assert.doesNotMatch(html, /javascript:|<iframe|<video/);
});
