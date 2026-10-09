const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const dir = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(dir, 'kid.js'), 'utf8');

function extract(name) {
  const start = source.indexOf(`function ${name}(`); assert.notEqual(start, -1, name);
  const line = source.slice(start, source.indexOf('\n', start));
  assert.ok(line.endsWith('}'), `${name} should remain a complete extracted function`); return line;
}
function navigation(page = 'games') {
  const calls = [], classes = new Set(), controls = new Map();
  const control = id => { if (!controls.has(id)) { const own = new Set(); controls.set(id, { classList: { toggle(name, active) { if (active) own.add(name); else own.delete(name); } }, classes: own, textContent: '' }); } return controls.get(id); };
  const state = { page, stack: [], stars: 4, book: null, pageNo: 0, gameTimeouts: [17, 19], gameTimer: 9, readerAuto: true, readerPaused: true };
  const appEl = { innerHTML: '', insertAdjacentHTML() { calls.push('legacy-game-nav'); } };
  const context = {
    state, appEl, URL, location: { href: 'https://leyman.cn/?v=example&section=games#resume' },
    history: { state: null, replaceState(_, __, url) { context.location.href = url; calls.push('url'); } },
    document: { body: { classList: { toggle(name, active) { if (active) classes.add(name); else classes.delete(name); } } }, querySelectorAll: () => [] },
    $: control,
    ART_STUDIO: { stop: () => calls.push('art-stop') }, MUSIC_STUDIO: { stop: () => calls.push('music-stop') },
    WRITING: { stop: () => calls.push('writing-stop'), render() { calls.push('writing-render'); return '<writing />'; }, mount(container) { assert.equal(container, appEl); calls.push('writing-mount'); } },
    NEW_GAMES: { entries: [], stop: () => calls.push('games-stop') }, KNOW: { afterRender: () => calls.push('recognition-after-render') },
    HOME: { renderVideos: () => '<videos />' },
    clearInterval: id => calls.push(`interval:${id}`), clearTimeout: id => calls.push(`timeout:${id}`), stopAudio: () => calls.push('voice-stop'),
    rememberGameMenu: () => calls.push('remember-games'), rememberStoryMenu: () => calls.push('remember-stories'),
    scrollTo: () => calls.push('scroll-top'), restoreGameMenu: () => calls.push('restore-games'), restoreStoryMenu: () => calls.push('restore-stories'),
    creativeGameHelp: () => calls.push('legacy-creative-help'), creativeGameNav: () => '<legacy-nav />',
    renderHome() { calls.push('home-render'); return '<home />'; },
    localStorage: { getItem: () => null }, speak: text => calls.push(['speak', text]), BOOKS: []
  };
  for (const name of ['School', 'Classroom', 'Stories', 'Reader', 'Learn', 'Lesson', 'Games', 'Game', 'Create', 'Coloring', 'Draw', 'Piano']) context[`render${name}`] = () => `<${name.toLowerCase()} />`;
  context.window = context; vm.createContext(context); vm.runInContext(['syncGameMenuUrl', 'stopInteractiveGame', 'render', 'go'].map(extract).join('\n'), context);
  return { context, calls, classes, controls, state, appEl };
}
function loadWritingAndHome(context) { for (const file of ['kids-writing-data.js', 'kids-writing.js', 'kids-home.js']) vm.runInContext(fs.readFileSync(path.join(dir, file), 'utf8'), context); }

test('writing navigation stops the previous activity and voice before rendering and mounting the writing board', () => {
  for (const previous of ['games', 'piano', 'reader']) {
    const env = navigation(previous); env.context.go('writing');
    assert.equal(env.state.page, 'writing'); assert.equal(env.state.stack.at(-1).page, previous);
    assert.equal(env.state.gameTimer, null); assert.equal(env.state.gameTimeouts.length, 0);
    for (const action of ['art-stop', 'music-stop', 'writing-stop', 'games-stop', 'interval:9', 'timeout:17', 'timeout:19', 'voice-stop']) assert.ok(env.calls.indexOf(action) < env.calls.indexOf('writing-render'), `${previous}: ${action}`);
    assert.ok(env.calls.indexOf('writing-render') < env.calls.indexOf('writing-mount'));
    assert.equal(env.calls.includes('legacy-game-nav'), false); assert.equal(env.calls.includes('legacy-creative-help'), false);
    assert.equal(env.classes.has('playing-writing-studio'), true); assert.equal(env.classes.has('playing-mini-game'), false);
    assert.equal(env.controls.get('#backBtn').classes.has('hidden'), true); assert.equal(env.controls.get('#bottomNav').classes.has('hidden'), true);
    assert.equal(new URL(env.context.location.href).searchParams.get('section'), 'writing'); assert.equal(new URL(env.context.location.href).searchParams.get('v'), 'example');
    if (previous === 'reader') { assert.equal(env.state.readerAuto, false); assert.equal(env.state.readerPaused, false); }
  }
});

test('writing navigation back home stops writing before the home render and clears the writing URL and layout', () => {
  const env = navigation(); env.context.go('writing'); env.calls.length = 0; env.context.go('home');
  assert.equal(env.state.page, 'home'); assert.ok(env.calls.indexOf('writing-stop') < env.calls.indexOf('home-render')); assert.ok(env.calls.indexOf('voice-stop') < env.calls.indexOf('home-render'));
  assert.equal(env.calls.includes('writing-mount'), false); assert.equal(env.appEl.innerHTML, '<home />');
  assert.equal(env.classes.has('playing-writing-studio'), false); assert.equal(env.controls.get('#bottomNav').classes.has('hidden'), false);
  const url = new URL(env.context.location.href); assert.equal(url.searchParams.has('section'), false); assert.equal(url.searchParams.get('v'), 'example'); assert.equal(url.hash, '#resume');
});

test('home banner reaches writing through the actual navigation action and keeps six primary activity cards and writing in the expandable learning menu', () => {
  const env = navigation('home'); vm.runInContext(fs.readFileSync(path.join(dir, 'kids-home.js'), 'utf8'), env.context);
  const html = env.context.HOME.render(), banner = html.match(/<button\b[^>]*class="home-writing-banner"[^>]*>/);
  assert.ok(banner); const action = banner[0].match(/onclick="([^"]+)"/); assert.ok(action);
  assert.equal((html.match(/class="big-card home-function-card"/g) || []).length, 6);
  const cards = [...html.matchAll(/class="big-card home-function-card" data-home-function="([^"]+)"/g)].map(match => match[1]); assert.equal(new Set(cards).size, 6); assert.ok(cards.includes('drawing')); assert.ok(cards.includes('pet')); assert.ok(cards.includes('garden')); assert.ok(cards.includes('stories'));
  vm.runInContext(action[1], env.context); assert.equal(env.state.page, 'writing'); assert.ok(env.calls.includes('writing-mount'));
});

test('all writing instructions, completion meanings and the live home introduction map to checked female clips and matching durations', () => {
  const preserved = 'zh|以前的声音', context = { VOICE_MAP: { [preserved]: 'preserved.mp3' }, localStorage: { getItem: () => null }, speak(text) { context.lastSpoken = text; } };
  context.window = context; vm.createContext(context); loadWritingAndHome(context);
  context.HOME.introduce(); assert.equal(typeof context.lastSpoken, 'string');
  const texts = [...context.WRITING.texts, context.lastSpoken]; assert.equal(context.WRITING.texts.length, 65); assert.equal(new Set(texts).size, 66);
  const mapFile = path.join(dir, 'writing-voice-map.js'); assert.ok(fs.existsSync(mapFile), 'checked writing voice map must be published with the feature'); vm.runInContext(fs.readFileSync(mapFile, 'utf8'), context);
  assert.equal(context.VOICE_MAP[preserved], 'preserved.mp3');
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'voice-writing-v1/manifest.json'), 'utf8'));
  assert.equal(manifest.voice, 'zh-CN-XiaoxiaoNeural'); assert.equal(manifest.objective_qa_passed, true); assert.equal(manifest.asr_content_check_passed, true); assert.equal(manifest.text_count, texts.length);
  assert.deepEqual(Object.keys(manifest.files).sort(), Array.from(texts).sort());
  for (const text of texts) {
    const record = manifest.files[text]; assert.ok(record, text); assert.equal(record.spoken, text); assert.ok(record.file.startsWith('voice-writing-v1/'));
    assert.equal(context.VOICE_MAP[`zh|${text}`]?.split('?')[0], record.file, text);
    const bytes = fs.readFileSync(path.join(dir, record.file)); assert.ok(bytes.length > 1000, record.file); assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), record.sha256, text);
    assert.equal(record.qa.fully_decoded, true, text); assert.equal(record.qa.clipped_samples, 0, text); assert.ok(Number.isFinite(record.qa.duration_seconds) && record.qa.duration_seconds > 0, text);
    assert.equal(record.qa.sample_rate, 24000); assert.equal(record.qa.channels, 1); assert.ok(record.qa.peak_dbfs < 0);
    assert.equal(context.WRITING_VOICE_DURATIONS[text], record.qa.duration_seconds, `animation must use the checked duration: ${text}`);
  }
});
