const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');

const root = path.resolve(__dirname, '..');
const assetRoot = path.join(root, 'app-assets');

// Keep this list independent from build-web.cjs. A source accidentally omitted from
// the builder must fail here even if the generated manifest is internally valid.
const scriptInputs = [
  'books.js', 'books-extra.js', 'books-new-adventures.js', 'story-art-map.js',
  'books-tablet-stories.js', 'courses.js', 'voice-map.js', 'modern-voice-map.js',
  'challenge-voice-map.js', 'video-voice-map.js', 'recognition-data.js', 'recognition.js',
  'kids-new-games.js', 'kids-challenge-games.js', 'kids-videos-data.js',
  'kids-home.js', 'creative-voice-map.js', 'kids-art-studio.js',
  'kids-music-studio.js', 'kids-writing-data.js', 'kids-writing.js',
  'writing-voice-map.js', 'tablet-story-voice-map.js', 'kid.js'
];
const styleInputs = [
  'kid.css', 'recognition.css', 'kids-new-games.css', 'glass-ui.css',
  'kids-home.css', 'kids-challenge-games.css', 'kids-art-studio.css',
  'kids-music-studio.css', 'kids-writing.css', 'tablet-ui.css'
];
const sections = {
  games: /class="game-home"/,
  learn: /class="know-page know-hub"/,
  stories: /class="book-grid"/,
  school: /class="school-page school-/,
  videos: /class="video-page"/,
  writing: /data-writing-studio/
};
const homeIntro = '首页有学写字、故事、认一认、小游戏、老师课堂、画画音乐，还有小影院。点一张喜欢的卡片吧。';
const videoIntro = '小影院里有佩奇、汪汪队，还有科普小短片。请爸爸妈妈陪你一起看。点卡片去央视网，看完回到小乐园。';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function manifest() {
  return readJson('app-assets/manifest.json');
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function classList() {
  const values = new Set();
  return {
    add(...names) { names.forEach(name => values.add(name)); },
    remove(...names) { names.forEach(name => values.delete(name)); },
    contains(name) { return values.has(name); },
    toggle(name, force) {
      const next = force === undefined ? !values.has(name) : Boolean(force);
      if (next) values.add(name); else values.delete(name);
      return next;
    }
  };
}

function element(id = '') {
  return {
    id,
    classList: classList(),
    dataset: {},
    hidden: false,
    innerHTML: '',
    textContent: '',
    src: '',
    style: {},
    addEventListener() {},
    removeEventListener() {},
    insertAdjacentHTML(_where, html) { this.innerHTML += html; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    matches() { return false; },
    closest() { return null; },
    remove() {},
    setAttribute(name, value) { this[name] = String(value); },
    removeAttribute(name) { this[name] = ''; }
  };
}

function browserContext(section = 'home') {
  const nodes = {
    '#app': element('app'),
    '#player': element('player'),
    '#backBtn': element('backBtn'),
    '#homeBtn': element('homeBtn'),
    '#soundBtn': element('soundBtn'),
    '#bottomNav': element('bottomNav'),
    '#stars': element('stars')
  };
  const nav = ['home', 'school', 'stories', 'learn', 'games'].map(go => {
    const node = element(); node.dataset.go = go; return node;
  });
  const storage = new Map();
  const timers = new Map();
  const played = [];
  const synthesized = [];
  let timerId = 0;
  const query = section === 'home' ? '' : `?section=${section}`;
  const location = {
    href: `https://leyman.cn/${query}`,
    search: query,
    reload() {}
  };
  const document = {
    body: element('body'),
    activeElement: null,
    hidden: false,
    querySelector(selector) { return nodes[selector] || null; },
    querySelectorAll(selector) { return selector === '#bottomNav button' ? nav : []; },
    getElementById(id) { return nodes[`#${id}`] || null; },
    addEventListener() {},
    removeEventListener() {},
    createElement(tag) { return element(tag); }
  };
  const player = nodes['#player'];
  player.pause = () => {};
  player.play = () => { played.push(player.src); return Promise.resolve(); };
  const speechSynthesis = {
    speaking: false,
    paused: false,
    speak(utterance) { synthesized.push(utterance.text); },
    cancel() {},
    pause() { this.paused = true; },
    resume() { this.paused = false; }
  };
  class SpeechSynthesisUtterance {
    constructor(text) { this.text = text; }
  }
  const context = {
    console,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    location,
    history: {
      state: null,
      replaceState(state, _title, href) {
        this.state = state;
        const next = new URL(href);
        location.href = next.href;
        location.search = next.search;
      }
    },
    document,
    navigator: { vibrate() {} },
    screen: { orientation: { addEventListener() {}, removeEventListener() {} } },
    speechSynthesis,
    SpeechSynthesisUtterance,
    localStorage: {
      getItem(key) { return storage.has(`local:${key}`) ? storage.get(`local:${key}`) : null; },
      setItem(key, value) { storage.set(`local:${key}`, String(value)); },
      removeItem(key) { storage.delete(`local:${key}`); }
    },
    sessionStorage: {
      getItem(key) { return storage.has(`session:${key}`) ? storage.get(`session:${key}`) : null; },
      setItem(key, value) { storage.set(`session:${key}`, String(value)); },
      removeItem(key) { storage.delete(`session:${key}`); }
    },
    innerWidth: 390,
    innerHeight: 844,
    scrollX: 0,
    scrollY: 0,
    scrollTo(x, y) { this.scrollX = Number(x) || 0; this.scrollY = Number(y) || 0; },
    requestAnimationFrame() { return 0; },
    cancelAnimationFrame() {},
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearInterval(id) { timers.delete(id); },
    addEventListener() {},
    removeEventListener() {},
    Image: class {},
    File: class {},
    atob(value) { return Buffer.from(value, 'base64').toString('binary'); }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  return { context, nodes, player, played, synthesized };
}

function runSources(section = 'home') {
  const harness = browserContext(section);
  for (const file of scriptInputs) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), harness.context, {
      filename: file,
      timeout: 5000
    });
  }
  return harness;
}

function runBundle(section = 'home') {
  const harness = browserContext(section);
  const info = manifest();
  vm.runInContext(fs.readFileSync(path.join(root, info.js.file), 'utf8'), harness.context, {
    filename: info.js.file,
    timeout: 5000
  });
  return harness;
}

function gameIds(context) {
  const ids = new Set();
  for (const category of ['swipe', 'tap', 'find', 'think', 'challenge', 'create']) {
    context.state.page = 'games';
    context.state.gameCategory = category;
    context.render();
    for (const match of context.document.querySelector('#app').innerHTML.matchAll(/data-game-id="([^"]+)"/g)) ids.add(match[1]);
  }
  return [...ids].sort();
}

function resolvePath(object, dotted) {
  return dotted.split('.').reduce((value, key) => value?.[key], object);
}

function onclickCalls() {
  const files = ['index.html', 'kid.js', 'recognition.js', 'kids-home.js', 'kids-new-games.js', 'kids-challenge-games.js'];
  const source = files.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  const calls = new Set();
  for (const attribute of source.matchAll(/onclick=(['"])([\s\S]*?)\1/g)) {
    for (const call of attribute[2].matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/g)) calls.add(call[1]);
  }
  // This is evaluated while renderClassroom builds markup; it is not an onclick export.
  calls.delete('all.indexOf');
  return [...calls].sort();
}

test('content-hashed bundles exactly cover every required source and built byte', () => {
  const info = manifest();
  assert.equal(info.format, 1);
  for (const [kind, expected] of [['js', scriptInputs], ['css', styleInputs]]) {
    const record = info[kind];
    assert.match(record.file, new RegExp(`^app-assets/app-[a-f0-9]{16}\\.${kind}$`));
    assert.deepEqual(record.inputs.map(input => input.file), expected, `${kind} input order`);
    for (const input of record.inputs) {
      const bytes = fs.readFileSync(path.join(root, input.file));
      assert.equal(input.bytes, bytes.length, input.file);
      assert.equal(input.sha256, sha256(bytes), input.file);
    }
    const output = fs.readFileSync(path.join(root, record.file));
    assert.equal(record.bytes, output.length, record.file);
    assert.equal(record.sha256, sha256(output), record.file);
    assert.equal(path.basename(record.file), `app-${record.sha256.slice(0, 16)}.${kind}`);
    assert.equal(record.gzip_bytes, zlib.gzipSync(output).length, `${record.file} gzip bytes`);
  }
  const owned = fs.readdirSync(assetRoot).filter(file => /^app-[a-f0-9]{16}\.(?:js|css)$/.test(file)).sort();
  assert.deepEqual(owned, [path.basename(info.css.file), path.basename(info.js.file)].sort(), 'stale bundles must be removed');
});

test('built index loads only the two deferred app assets and exposes a working retry on failure', () => {
  const info = manifest();
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map(match => match[1]);
  const scripts = [...html.matchAll(/<script\b([^>]*)src="([^"]+)"([^>]*)><\/script>/g)];
  assert.deepEqual(styles, [info.css.file]);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0][2], info.js.file);
  const attributes = `${scripts[0][1]} ${scripts[0][3]}`;
  assert.match(attributes, /\bdefer\b/);
  const onerror = attributes.match(/onerror="([^"]+)"/)?.[1];
  assert.ok(onerror, 'bundle script needs a visible load-failure action');

  const message = { textContent: '正在打开小乐园…' };
  const retry = { hidden: true };
  vm.runInNewContext(onerror, { document: { getElementById: id => id === 'startupMessage' ? message : retry } });
  assert.equal(message.textContent, '小乐园还没有打开，请再试一次');
  assert.equal(retry.hidden, false);

  const retryHandler = html.match(/id="startupRetry"[^>]*onclick="([^"]+)"/)?.[1];
  let reloads = 0;
  assert.ok(retryHandler);
  vm.runInNewContext(retryHandler, { location: { reload() { reloads++; } } });
  assert.equal(reloads, 1);
});

test('EdgeOne immutable caching is restricted to hashed JavaScript and CSS assets', () => {
  const config = readJson('edgeone.json');
  assert.deepEqual(config.headers.map(rule => rule.source).sort(), ['/app-assets/*.css', '/app-assets/*.js']);
  for (const rule of config.headers) {
    assert.deepEqual(rule.headers, [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]);
  }
  assert.ok(config.headers.every(rule => !['/', '/*', '/index.html'].includes(rule.source)), 'HTML must not inherit immutable caching');
});

test('the minified whole bundle preserves data, feature APIs, every game and classic onclick exports', () => {
  const source = runSources();
  const built = runBundle();
  const actual = built.context;
  const expected = source.context;

  assert.equal(actual.BOOKS.length, 128);
  assert.equal(actual.BOOKS.reduce((sum, book) => sum + book.pages.length, 0), 654);
  assert.equal(actual.GRADE_ONE_COURSES.length, 60);
  assert.deepEqual(plain(actual.BOOKS), plain(expected.BOOKS));
  assert.deepEqual(plain(actual.GRADE_ONE_COURSES), plain(expected.GRADE_ONE_COURSES));
  assert.deepEqual(plain(actual.KIDS_VIDEOS), plain(expected.KIDS_VIDEOS));
  assert.deepEqual(plain(actual.NEW_GAMES.entries), plain(expected.NEW_GAMES.entries));

  const sourceGames = gameIds(expected);
  const builtGames = gameIds(actual);
  assert.equal(builtGames.length, 65);
  assert.deepEqual(builtGames, sourceGames);
  assert.ok(['ngWaterGarden', 'ngAnimalFeeding', 'cgRobotRoute', 'cgLogicGarden'].every(id => builtGames.includes(id)));

  const APIs = {
    HOME: ['render', 'renderVideos', 'introduce', 'introduceVideos', 'openDaily', 'openModern', 'openFavorites', 'openChallenge', 'openSubject', 'resumeStory', 'selectVideoCategory'],
    KNOW: ['init', 'renderHub', 'renderLesson', 'renderQuiz', 'renderDone', 'openCategory', 'openDaily', 'openModern', 'openFavorites', 'summary', 'backRoot', 'afterRender'],
    NEW_GAMES: ['render', 'mount', 'stop'],
    ART_STUDIO: ['render', 'mount', 'stop', 'reset'],
    MUSIC_STUDIO: ['render', 'mount', 'stop', 'reset'],
    WRITING: ['render', 'mount', 'stop', 'reset']
  };
  for (const [name, methods] of Object.entries(APIs)) {
    assert.ok(actual[name], name);
    assert.deepEqual(Object.keys(actual[name]).sort(), Object.keys(expected[name]).sort(), `${name} public shape`);
    for (const method of methods) assert.equal(typeof actual[name][method], 'function', `${name}.${method}`);
  }
  for (const call of onclickCalls()) assert.equal(typeof resolvePath(actual, call), 'function', `${call} must remain globally callable`);
});

test('all six public section deep links execute the whole bundle and render their real first screen', () => {
  for (const [section, marker] of Object.entries(sections)) {
    const { context, nodes } = runBundle(section);
    assert.equal(context.state.page, section, section);
    assert.match(nodes['#app'].innerHTML, marker, section);
    assert.doesNotMatch(nodes['#app'].innerHTML, /正在打开小乐园/, section);
    assert.equal(new URL(context.location.href).searchParams.get('section'), section, section);
  }
});

test('VOICE_MAP is complete after bundling and both home introductions play fixed female MP3s on the first tap', async () => {
  const source = runSources();
  const built = runBundle();
  assert.deepEqual(plain(built.context.VOICE_MAP), plain(source.context.VOICE_MAP));

  const cases = [
    [homeIntro, readJson('voice-writing-v1/manifest.json'), () => built.context.HOME.introduce()],
    [videoIntro, readJson('voice-home-video-v1/manifest.json'), () => built.context.HOME.introduceVideos()]
  ];
  for (const [text, voiceManifest, play] of cases) {
    assert.equal(voiceManifest.voice, 'zh-CN-XiaoxiaoNeural', text);
    const record = voiceManifest.files[text];
    assert.ok(record, text);
    const bytes = fs.readFileSync(path.join(root, record.file));
    assert.equal(sha256(bytes), record.sha256, record.file);
    assert.ok(bytes.length > 1000, record.file);
    assert.equal(built.context.VOICE_MAP[`zh|${text}`], `${record.file}?v=1`, text);
    play();
    await Promise.resolve();
    assert.equal(built.player.src, `${record.file}?v=1`, text);
  }
  assert.deepEqual(built.played, cases.map(([text, voiceManifest]) => `${voiceManifest.files[text].file}?v=1`));
  assert.deepEqual(built.synthesized, [], 'the first tap must not fall back to device speech synthesis');
});
