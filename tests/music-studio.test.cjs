const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'kids-music-studio.js'), 'utf8');

function load(options = {}) {
  let clock = 0, nextId = 0, resolveResume;
  const timers = new Map(), storage = new Map(), sounds = [], gains = [], contexts = [], spoken = [];
  const param = value => ({ value, cancelScheduledValues() {}, setValueAtTime(n) { this.value = n; }, linearRampToValueAtTime(n) { this.value = n; }, setTargetAtTime(n) { this.value = n; } });
  const audioNode = () => ({ connect() {}, disconnect() {} });
  class Context {
    constructor() { this.state = options.suspended ? 'suspended' : 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; contexts.push(this); }
    async resume() { if (options.deferredResume) await new Promise(resolve => { resolveResume = resolve; }); this.state = 'running'; }
    createGain() { const gain = { ...audioNode(), gain: param(1) }; gains.push(gain); return gain; }
    createDynamicsCompressor() { return { ...audioNode(), threshold: param(0), knee: param(0), ratio: param(0), attack: param(0), release: param(0) }; }
    createWaveShaper() { return { ...audioNode() }; }
    createBuffer(channels, length, rate) { return { length, duration: length / rate, rate, data: null, copyToChannel(values) { this.data = values; } }; }
    createBufferSource() { const sound = { ...audioNode(), buffer: null, stopped: false, start() { this.at = clock / 1000; sounds.push(this); }, stop() { this.stopped = true; this.onended?.(); } }; return sound; }
  }
  const root = {
    Float32Array, Math, Date, JSON, AudioContext: Context,
    performance: { now: () => clock },
    setTimeout(fn, delay) { const id = ++nextId; timers.set(id, { fn, at: clock + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    localStorage: { getItem: key => storage.get(key) || null, setItem(key, value) { if (options.storageFailure) throw Error('quota'); storage.set(key, value); } },
    document: { querySelector() { return null; }, hidden: false },
    speak: text => spoken.push(text), stopAudio() {}, state: { muted: false }
  };
  root.window = root; vm.runInNewContext(source, root); const api = root.MUSIC_STUDIO, t = api._test; t.mountTest();
  function tick(ms) {
    const target = clock + ms; let count = 0;
    while (true) {
      const due = [...timers].filter(([, item]) => item.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break; if (++count > 5000) throw Error('runaway timer'); clock = due[1].at; timers.delete(due[0]); due[1].fn();
    }
    clock = target; contexts.forEach(context => { context.currentTime = clock / 1000; });
  }
  return { root, api, t, timers, sounds, gains, contexts, spoken, storage, tick, resolve: () => resolveResume?.() };
}

function touchSurface(env, withBody = true) {
  const listenerNodes = new Set(), classes = new Set();
  function surface(extra = {}) {
    const handlers = new Map();
    const node = {
      handlers,
      addEventListener(type, callback, options) { const entries = handlers.get(type) || []; entries.push({ callback, options }); handlers.set(type, entries); },
      removeEventListener(type, callback) { handlers.set(type, (handlers.get(type) || []).filter(entry => entry.callback !== callback)); },
      dispatch(type, event = {}) { for (const entry of handlers.get(type) || []) entry.callback({ currentTarget: node, ...event }); },
      ...extra
    };
    listenerNodes.add(node); return node;
  }
  const piano = surface({ captures: new Set(), setPointerCapture(id) { this.captures.add(id); }, releasePointerCapture(id) { this.captures.delete(id); } });
  const keys = [60, 62, 64, 65, 67, 69, 71, 72].map(note => {
    const key = surface({ tagName: 'BUTTON', dataset: { msNote: String(note) }, classList: { add() {}, remove() {} }, closest(selector) { return selector === '[data-ms-note]' ? this : null; } });
    return key;
  });
  const status = { textContent: '' }, studio = {
    matches: selector => selector === '[data-music-studio]',
    contains: node => keys.includes(node),
    querySelector(selector) { if (selector === '[data-ms-piano]') return piano; if (selector === '[data-ms-status]') return status; return keys.find(key => selector === `[data-ms-note="${key.dataset.msNote}"]`) || null; },
    querySelectorAll: selector => selector === '[data-ms-note]' ? keys : []
  };
  const documentNode = surface(); env.root.document.addEventListener = documentNode.addEventListener; env.root.document.removeEventListener = documentNode.removeEventListener;
  const rootNode = surface(); env.root.addEventListener = rootNode.addEventListener; env.root.removeEventListener = rootNode.removeEventListener;
  let hit = keys[0]; env.root.document.elementFromPoint = () => hit;
  if (withBody) env.root.document.body = { classList: { add: name => classes.add(name), remove: name => classes.delete(name) } };
  env.api.mount(studio);
  return { piano, keys, studio, status, classes, documentNode, rootNode, listenerNodes, hit: key => { hit = key; } };
}

const flushPress = async () => { await Promise.resolve(); await Promise.resolve(); };

test('song library contains fifty complete tunes with eight sourced historical melodies', () => {
  const { t, api } = load();
  assert.equal(api.songs.length, 50); assert.equal(api.songs.filter(song => song.source).length, 8);
  assert.equal(new Set(api.songs.map(song => song.id)).size, 50);
  for (const song of t.data.SONGS) {
    assert.ok(song.notes.length >= 20, song.id); assert.ok(song.notes.every(note => Number.isFinite(note.beats) && note.beats > 0 && note.beats <= 4));
    const seq = t.timeline(song.notes, song.tempo); assert.equal(seq.events[0].at, 0); assert.ok(seq.duration >= 10);
    seq.events.slice(1).forEach((event, index) => assert.ok(event.at > seq.events[index].at));
  }
  assert.deepEqual(Array.from(t.data.SONGS[0].notes.slice(0, 7), item => item.note), [60, 60, 67, 67, 69, 69, 67]);
  assert.ok(t.data.SONGS.find(song => song.id === 'brother').notes.some(item => item.note === 55));
});

test('three synthesized instruments have useful default level, clean edges, finite samples and bounded mix', () => {
  const { t } = load();
  for (const instrument of t.data.INSTRUMENTS) {
    const audio = t.synthesis(60, .7, instrument.id, 22050);
    const peak = Math.max(...audio.map(Math.abs));
    assert.ok(peak * .7 > .3, instrument.id); assert.ok(peak < 1); assert.equal(audio[0], 0); assert.ok(Math.abs(audio.at(-1)) < .001);
    assert.ok(audio.every(Number.isFinite));
    const mix = Array.from(audio, sample => t.limiting(sample * 8)); assert.ok(mix.every(sample => Math.abs(sample) <= .92));
  }
  assert.equal(t.frequency(69), 440); assert.ok(Math.abs(t.frequency(60) - 261.6255653) < .00001);
  const drum = t.drumSynthesis(.22, 22050); assert.equal(drum[0], 0); assert.ok(drum.every(Number.isFinite));
});

test('song timing schedules every note then stops; replacing the song cancels all old notes', async () => {
  const env = load(); env.t.setSong('star'); await env.t.playSong();
  const spec = env.t.timeline(env.t.data.SONGS[0].notes, 100); env.tick(spec.duration * 1000 + 200);
  assert.equal(env.sounds.length, spec.events.length); assert.equal(env.t.getState().transport, '');
  assert.ok(Math.abs(env.sounds[1].at - .6) < .00001);
  await env.t.playSong(); env.tick(1000); const count = env.sounds.length; env.api.stopPlayback(); env.tick(120000);
  assert.equal(env.sounds.length, count); assert.equal(env.t.stats().timers, 0); assert.equal(env.t.stats().nodes, 0); assert.ok(env.sounds.every(sound => sound.stopped));
});

test('mute and leaving while iOS audio is resuming never emit a stale note or restart', async () => {
  const env = load({ suspended: true, deferredResume: true });
  const pending = env.t.playSong(); env.api.setMuted(true); env.resolve(); await pending;
  assert.equal(env.sounds.length, 0); assert.equal(env.t.stats().timers, 0); env.api.setMuted(false); env.tick(120000); assert.equal(env.sounds.length, 0);
  await env.t.playSong(); env.api.stop(); env.tick(120000); assert.equal(env.t.stats().mounted, false); assert.equal(env.t.stats().timers, 0); assert.equal(env.t.stats().nodes, 0);
});

test('multi-touch style note voices are independent and key-up before resume cancels the note', async () => {
  const env = load(); await env.t.press(60, 'finger-a'); await env.t.press(64, 'finger-b');
  assert.equal(env.t.stats().nodes, 2); env.t.lift('finger-a'); assert.equal(env.t.stats().nodes, 1); assert.equal(env.sounds[1].stopped, false); env.t.lift('finger-b'); assert.equal(env.t.stats().nodes, 0);
  const slow = load({ suspended: true, deferredResume: true }); const pending = slow.t.press(60, 'quick'); slow.t.lift('quick'); slow.resolve(); await pending; assert.equal(slow.sounds.length, 0);
});

test('shared C boundary keys do not unexpectedly change the chosen octave', async () => {
  const env = load(); env.t.updateOctave(1); await env.t.press(72, 'high-c'); assert.equal(env.t.getState().octave, 1); env.t.lift('high-c');
  env.t.updateOctave(-1); await env.t.press(60, 'low-c'); assert.equal(env.t.getState().octave, -1); env.t.lift('low-c');
});

test('a held recording note that ends naturally preserves its full three second duration', async () => {
  const env = load(); env.t.startRecording(); await env.t.press(60, 'long'); env.tick(3060); env.sounds[0].onended(); env.t.lift('long'); env.t.finishRecording();
  assert.equal(env.t.getState().events[0].duration, 3); assert.equal(env.t.stats().nodes, 0);
});

test('recording captures note timing, held durations and instruments and replays the same events', async () => {
  const env = load(); env.t.startRecording(); env.tick(200); await env.t.press(60, 'a'); env.tick(350); env.t.lift('a'); env.tick(450); await env.t.press(67, 'b'); env.tick(700); env.t.lift('b'); env.t.finishRecording();
  const saved = env.t.getState(); assert.equal(saved.events.length, 2); assert.ok(Math.abs(saved.events[0].at - .2) < .00001); assert.ok(Math.abs(saved.events[1].at - 1) < .00001);
  assert.ok(Math.abs(saved.events[0].duration - .35) < .00001); assert.ok(Math.abs(saved.events[1].duration - .7) < .00001);
  const before = env.sounds.length; await env.t.replay(); env.tick(2000); assert.equal(env.sounds.length - before, 2); assert.ok(Math.abs(env.sounds[before + 1].at - env.sounds[before].at - .8) < .00001);
  assert.equal(env.t.getState().transport, ''); assert.equal(env.t.stats().timers, 0);
});

test('composer beats preserve empty beats and drums, repeat exactly, and stop on edits or mute', async () => {
  const env = load(); env.t.setMode('compose'); env.t.setTempo(120);
  env.t.selectStep(1); env.t.putNote(null); env.t.toggleDrum(1); const state = env.t.getState(), loop = env.t.loopTimeline(state.grid, 120);
  assert.equal(loop[1].note, null); assert.equal(loop[1].drum, true); assert.equal(loop[7].at, 3.5);
  await env.t.playLoop(); env.tick(4100); assert.equal(env.t.getState().transport, 'loop'); assert.ok(env.sounds.length >= 10);
  env.t.setTempo(80); assert.equal(env.t.getState().transport, ''); assert.equal(env.t.stats().timers, 0);
  await env.t.playLoop(); env.tick(100); env.api.setMuted(true); const count = env.sounds.length; env.tick(30000); assert.equal(env.sounds.length, count); assert.equal(env.t.stats().nodes, 0);
});

test('local works can be named, reopened, updated, removed; switching type cannot overwrite another work', async () => {
  const env = load(); const gridId = env.t.saveWork('grid', '我的彩虹歌'); assert.equal(env.t.readWorks().length, 1); assert.equal(env.t.readWorks()[0].name, '我的彩虹歌');
  env.t.putNote(72); assert.equal(env.t.loadWork(gridId), true); assert.equal(env.t.getState().grid.notes[0], 60);
  env.t.setState({ events: [{ at: 0, note: 60, duration: .5, instrument: 'piano' }], duration: .5 }); const recordId = env.t.saveWork('record', '<我的琴声>');
  assert.notEqual(recordId, gridId); assert.equal(env.t.readWorks().length, 2); assert.match(env.api.render(), /&lt;我的琴声&gt;/);
  env.t.loadWork(recordId); assert.equal(env.t.getState().mode, 'play'); assert.equal(env.t.getState().events[0].note, 60);
  env.t.saveWork('record', '新名字'); assert.equal(env.t.readWorks().length, 2); assert.equal(env.t.readWorks()[0].name, '新名字');
  assert.equal(env.t.deleteWork(gridId, true), true); assert.equal(env.t.readWorks().length, 1);
});

test('storage failure is reported without claiming saved and corrupt event data never loads', () => {
  const env = load({ storageFailure: true }); assert.equal(env.t.saveWork('grid', '试试'), false); assert.match(env.t.getState().status, /没有保存成功/); assert.equal(env.spoken.length, 0);
  const normal = load(); normal.storage.set(normal.t.data.STORAGE, JSON.stringify([{ id: 'bad', name: 'oops', instrument: 'piano', type: 'record', duration: 1, events: [{ at: -1, note: 60, duration: .5, instrument: 'piano' }] }])); assert.equal(normal.t.readWorks().length, 0);
  assert.equal(normal.t.loadWork('bad'), false);
});

test('follow mode waits for the target note, accepts wrong-note exploration and advances without a score', async () => {
  const env = load(); await env.t.playSong(true); assert.equal(env.t.getState().followIndex, 0); assert.equal(env.t.stats().timers, 0);
  await env.t.press(62, 'wrong', false); assert.equal(env.t.getState().followIndex, 0); await env.t.press(60, 'right', false); assert.equal(env.t.getState().followIndex, 1);
  env.api.stopPlayback(); assert.equal(env.t.getState().following, false);
});

test('volume clamps and updates the live gain; stop clears recording and all playback resources', async () => {
  const env = load(); await env.t.press(60, 'key'); assert.equal(env.gains[0].gain.value, .7); env.t.setVolume(200); assert.equal(env.gains[0].gain.value, 1); env.t.setVolume(-2); assert.equal(env.gains[0].gain.value, 0);
  env.t.startRecording(); env.api.stop(); const stats = env.t.stats(); assert.equal(stats.nodes, 0); assert.equal(stats.timers, 0); assert.equal(stats.pressed, 0); assert.equal(env.t.getState().recording, false);
  assert.doesNotMatch(env.t.getState().status, /正在录音/);
});

test('native long-press selection, context menus and touch scrolling are suppressed only on the piano', () => {
  const env = load(), ui = touchSurface(env), input = { tagName: 'INPUT', closest: selector => selector.includes('input') ? input : null };
  for (const type of ['contextmenu', 'selectstart', 'dragstart', 'touchstart', 'touchmove']) {
    let prevented = 0;
    ui.piano.dispatch(type, { target: ui.keys[0], cancelable: true, preventDefault() { prevented++; } }); assert.equal(prevented, 1, type);
    ui.piano.dispatch(type, { target: input, cancelable: true, preventDefault() { prevented++; } }); assert.equal(prevented, 1, `${type}: editable input`);
    ui.piano.dispatch(type, { target: ui.keys[0], cancelable: false, preventDefault() { prevented++; } }); assert.equal(prevented, 1, `${type}: non-cancelable`);
    assert.equal(ui.documentNode.handlers.has(type), false, `${type}: no global suppression`);
  }
  assert.equal(ui.piano.handlers.get('touchstart')[0].options.passive, false); assert.equal(ui.piano.handlers.get('touchmove')[0].options.passive, false);
  env.api.stop(); assert.equal(ui.piano.handlers.get('contextmenu').length, 0); assert.equal(ui.piano.handlers.get('touchstart').length, 0);
});

test('long-press suppression preserves multi-finger sliding and releases canceled or lost captures', async () => {
  const env = load(), ui = touchSurface(env), event = id => ({ pointerId: id, target: ui.keys[0], clientX: 1, clientY: 1, preventDefault() {} });
  ui.hit(ui.keys[0]); ui.piano.dispatch('pointerdown', event(1)); await flushPress();
  ui.hit(ui.keys[2]); ui.piano.dispatch('pointerdown', event(2)); await flushPress(); assert.equal(env.t.stats().nodes, 2); assert.equal(env.t.stats().pointers, 2);
  let contextPrevented = false; ui.piano.dispatch('contextmenu', { target: ui.keys[0], preventDefault() { contextPrevented = true; } }); assert.equal(contextPrevented, true); assert.equal(env.t.stats().nodes, 2);
  ui.hit(ui.keys[4]); ui.piano.dispatch('pointermove', event(1)); await flushPress(); assert.equal(env.t.stats().nodes, 2); assert.equal(env.sounds.length, 3);
  ui.piano.dispatch('lostpointercapture', event(1)); assert.equal(env.t.stats().nodes, 1); assert.equal(env.t.stats().pointers, 1);
  ui.piano.dispatch('pointercancel', event(2)); assert.equal(env.t.stats().nodes, 0); assert.equal(env.t.stats().pointers, 0); assert.equal(env.t.stats().pressed, 0);
});

test('mouse context-menu and middle clicks never sound a note, while touch, pen and left click still work', async () => {
  const env = load(), ui = touchSurface(env), event = (pointerType, button, pointerId) => ({ pointerType, button, pointerId, target: ui.keys[0], clientX: 1, clientY: 1, preventDefault() {} });
  for (const button of [1, 2]) ui.piano.dispatch('pointerdown', event('mouse', button, button));
  await flushPress(); assert.equal(env.sounds.length, 0); assert.equal(env.t.stats().pointers, 0); assert.equal(env.t.stats().pressed, 0);
  for (const [pointerType, button, pointerId] of [['mouse', 0, 3], ['touch', 0, 4], ['pen', 0, 5]]) {
    ui.piano.dispatch('pointerdown', event(pointerType, button, pointerId)); await flushPress(); ui.piano.dispatch('pointerup', event(pointerType, button, pointerId));
  }
  assert.equal(env.sounds.length, 3); assert.equal(env.t.stats().nodes, 0); assert.equal(env.t.stats().pointers, 0);
});

test('rotation releases held pointers and stale resumed notes but keeps recording and automatic playback', async () => {
  const env = load(), ui = touchSurface(env); env.t.startRecording();
  ui.piano.dispatch('pointerdown', { pointerId: 1, pointerType: 'touch', button: 0, clientX: 1, clientY: 1, preventDefault() {} }); await flushPress(); env.tick(700); const recordingTimers = env.t.stats().timers;
  ui.rootNode.dispatch('orientationchange'); assert.equal(env.t.getState().recording, true); assert.equal(env.t.stats().nodes, 0); assert.equal(env.t.stats().pointers, 0); assert.equal(ui.piano.captures.size, 0); assert.ok(Math.abs(env.t.getState().events[0].duration - .7) < .00001);
  assert.equal(env.t.stats().timers, recordingTimers); assert.ok(recordingTimers > 0); env.t.finishRecording(); await env.t.playSong(); const timers = env.t.stats().timers;
  ui.rootNode.dispatch('orientationchange'); assert.equal(env.t.getState().transport, 'song'); assert.equal(env.t.stats().timers, timers);
  const slow = load({ suspended: true, deferredResume: true }), slowUi = touchSurface(slow); slow.t.startRecording(); slowUi.piano.dispatch('pointerdown', { pointerId: 8, pointerType: 'touch', button: 0, clientX: 1, clientY: 1, preventDefault() {} });
  slowUi.rootNode.dispatch('orientationchange'); slow.resolve(); await flushPress(); assert.equal(slow.sounds.length, 0); assert.equal(slow.t.getState().recording, true);
});

test('keyboard and assistive button activation still play, while text fields and IME keep their normal keys', async () => {
  const env = load(), ui = touchSurface(env), input = { tagName: 'INPUT' }, editor = { tagName: 'DIV', closest: selector => selector.includes('contenteditable') ? editor : null };
  let prevented = 0;
  for (const target of [input, editor]) ui.documentNode.dispatch('keydown', { key: 'a', target, preventDefault() { prevented++; } });
  ui.documentNode.dispatch('keydown', { key: 'a', target: ui.keys[0], isComposing: true, preventDefault() { prevented++; } }); await flushPress(); assert.equal(env.sounds.length, 0); assert.equal(prevented, 0);
  ui.documentNode.dispatch('keydown', { key: 'a', target: ui.keys[0], preventDefault() { prevented++; } }); await flushPress(); assert.equal(env.sounds.length, 1); assert.equal(prevented, 1);
  ui.documentNode.dispatch('keyup', { key: 'a' }); assert.equal(env.t.stats().nodes, 0);
  ui.keys[2].dispatch('click', { detail: 0 }); await flushPress(); assert.equal(env.sounds.length, 2); assert.equal(env.t.stats().pressed, 0);
});

test('music-only body class is mounted and removed without altering another page, including no-body environments', () => {
  const env = load(), ui = touchSurface(env); ui.classes.add('playing-mini-game'); assert.equal(ui.classes.has('playing-music-studio'), true);
  env.api.stop(); assert.equal(ui.classes.has('playing-music-studio'), false); assert.equal(ui.classes.has('playing-mini-game'), true);
  const minimal = load(), minimalUi = touchSurface(minimal, false); assert.equal(minimal.t.stats().mounted, true); assert.doesNotThrow(() => minimal.api.stop()); assert.ok(minimalUi.piano);
  for (const mode of ['play', 'songs', 'compose']) { env.t.setState({ mode }); assert.match(env.api.render(), new RegExp(`data-ms-view="${mode}"`)); }
});
