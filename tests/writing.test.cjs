const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const dir = path.join(__dirname, '..');
const data = fs.readFileSync(path.join(dir, 'kids-writing-data.js'), 'utf8');
const source = fs.readFileSync(path.join(dir, 'kids-writing.js'), 'utf8');

function load(options = {}) {
  let clock = 0, nextId = 0, rewards = 0, stoppedAudio = 0;
  const timers = new Map(), stored = new Map(), spoken = [], navigated = [];
  const root = { performance: { now: () => clock }, setTimeout(fn, delay) { const id = ++nextId; timers.set(id, { fn, at: clock + delay }); return id; }, clearTimeout: id => timers.delete(id),
    localStorage: { getItem: key => stored.get(key) || null, setItem(key, value) { if (options.storageFailure) throw Error('quota'); stored.set(key, value); } },
    speak: text => spoken.push(text), stopAudio() { stoppedAudio++; }, reward: () => { rewards++; }, go: page => navigated.push(page), document: { hidden: false } };
  root.window = root; vm.runInNewContext(data, root); vm.runInNewContext(source, root); const api = root.WRITING, t = api._test; t.mountTest();
  function tick(ms) { const until = clock + ms; let count = 0; while (true) { const first = [...timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0]; if (!first) break; if (++count > 5000) throw Error('runaway animation'); clock = first[1].at; timers.delete(first[0]); first[1].fn(); } clock = until; }
  return { root, api, t, timers, stored, spoken, navigated, tick, rewards: () => rewards, stoppedAudio: () => stoppedAudio };
}

function dom(env, initialRect = { left: 0, top: 0, width: 400, height: 400 }) {
  let rect = initialRect, currentBoard, currentHost;
  function node(extra = {}) { const listeners = new Map(), attributes = new Map(); return { listeners, attributes, style: {}, textContent: '', addEventListener(type, fn) { const list = listeners.get(type) || []; list.push(fn); listeners.set(type, list); }, removeEventListener(type, fn) { listeners.set(type, (listeners.get(type) || []).filter(item => item !== fn)); }, setAttribute(name, value) { attributes.set(name, value); }, dispatch(type, event = {}) { for (const fn of listeners.get(type) || []) fn({ currentTarget: this, ...event }); }, ...extra }; }
  function studio() {
    const board = node({ captured: new Set(), getBoundingClientRect: () => rect, setPointerCapture(id) { this.captured.add(id); }, releasePointerCapture(id) { this.captured.delete(id); } });
    const parts = new Map([['[data-ws-board]', board], ...['status', 'live-trace', 'demo-hand', 'demo-trace', 'home', 'menu', 'help', 'demo', 'stop-demo', 'redo', 'again', 'meaning', 'previous'].map(name => [`[data-ws-${name}]`, node()])]);
    const result = node({ matches: selector => selector === '[data-writing-studio]', querySelector: selector => parts.get(selector) || null, querySelectorAll: () => [], replaceWith(next) { currentHost = next; } });
    currentBoard = board; currentHost = result; return result;
  }
  const documentNode = node(), rootNode = node(); env.root.document.addEventListener = documentNode.addEventListener; env.root.document.removeEventListener = documentNode.removeEventListener; env.root.addEventListener = rootNode.addEventListener; env.root.removeEventListener = rootNode.removeEventListener;
  env.root.document.createElement = () => ({ set innerHTML(value) { this.firstElementChild = studio(); } });
  env.api.mount(studio()); return { board: () => currentBoard, host: () => currentHost, documentNode, rootNode, setRect: value => { rect = value; }, event(point, pointerId = 1) { const side = Math.min(rect.width, rect.height); return { pointerId, pointerType: 'touch', button: 0, clientX: rect.left + (rect.width - side) / 2 + point[0] * side / 400, clientY: rect.top + (rect.height - side) / 2 + point[1] * side / 400, preventDefault() {} }; } };
}
function trace(ui, points, canceled = false) { ui.board().dispatch('pointerdown', ui.event(points[0])); points.slice(1).forEach(point => ui.board().dispatch('pointermove', ui.event(point))); ui.board().dispatch(canceled ? 'pointercancel' : 'pointerup', ui.event(points.at(-1))); }

test('all ten data lessons are valid independent writing paths and every correct path completes', () => {
  const { root, t } = load(); assert.equal(root.WRITING_LESSONS.length, 10);
  for (const lesson of root.WRITING_LESSONS) {
    assert.equal(lesson.coordinateSize, 400); assert.ok(lesson.guide && lesson.meaning && lesson.completion);
    for (const stroke of lesson.strokes) {
      for (let i = 1; i < stroke.points.length; i++) assert.ok(Math.hypot(stroke.points[i][0] - stroke.points[i - 1][0], stroke.points[i][1] - stroke.points[i - 1][1]) <= 12);
      const geometry = t.geometry(stroke.points), session = t.beginTrace(geometry, stroke.points[0]); assert.ok(session);
      stroke.points.slice(1).forEach(point => assert.equal(t.advanceTrace(session, point).accepted, true, `${lesson.id}: ${point}`));
      assert.equal(t.traceComplete(session, stroke.points.at(-1)), true, lesson.id);
    }
  }
});

test('taps, starting in the middle, endpoint shortcuts, random scribbles and reversed loops never pass', () => {
  const { root, t } = load(), line = t.geometry(root.WRITING_LESSONS[0].strokes[0].points), loopPoints = root.WRITING_LESSONS[9].strokes[1].points, loop = t.geometry(loopPoints);
  assert.equal(t.beginTrace(line, [200, 200]), null); const tap = t.beginTrace(line, line.points[0]); assert.equal(t.traceComplete(tap, line.points[0]), false);
  const shortcut = t.beginTrace(loop, loop.points[0]); t.advanceTrace(shortcut, loop.points.at(-1)); assert.equal(t.traceComplete(shortcut, loop.points.at(-1)), false);
  const scribble = t.beginTrace(loop, loop.points[0]); [[10, 10], [380, 380], [180, 180], loop.points.at(-1)].forEach(point => t.advanceTrace(scribble, point)); assert.equal(t.traceComplete(scribble, loop.points.at(-1)), false);
  const backward = t.beginTrace(loop, loopPoints[0]); Array.from(loopPoints).reverse().slice(1).forEach(point => t.advanceTrace(backward, point)); assert.equal(t.traceComplete(backward, loopPoints[0]), false);
  assert.equal(t.beginTrace(line, line.points.at(-1)), null);
});

test('small finger offsets are accepted and leaving the path requires returning before continuing', () => {
  const { root, t } = load(), points = root.WRITING_LESSONS[0].strokes[0].points, line = t.geometry(points), offset = points.map(([x, y]) => [x + 18, y]);
  const forgiving = t.beginTrace(line, offset[0]); offset.slice(1).forEach(point => assert.equal(t.advanceTrace(forgiving, point).accepted, true)); assert.equal(t.traceComplete(forgiving, offset.at(-1)), true);
  const session = t.beginTrace(line, points[0]); points.slice(1, 10).forEach(point => t.advanceTrace(session, point));
  assert.equal(t.advanceTrace(session, [330, 170]).accepted, false); const progress = session.progress; assert.equal(t.advanceTrace(session, points.at(-1)).accepted, false); assert.equal(session.progress, progress);
  assert.equal(t.advanceTrace(session, session.lastValid).recovered, true); points.filter(point => point[1] > session.lastValid[1]).forEach(point => t.advanceTrace(session, point)); assert.equal(t.traceComplete(session, points.at(-1)), true);
});

test('pointer cancellation discards even a complete trace and number ten requires its two independent ordered strokes', () => {
  const env = load(), ui = dom(env); env.t.selectLesson('number-10', false); const lesson = env.root.WRITING_LESSONS[9];
  trace(ui, lesson.strokes[1].points); assert.equal(env.t.getState().stroke, 0); assert.equal(env.t.getState().done, false);
  trace(ui, lesson.strokes[0].points, true); assert.equal(env.t.getState().stroke, 0); assert.equal(env.rewards(), 0);
  trace(ui, lesson.strokes[0].points); assert.equal(env.t.getState().stroke, 1); assert.equal(env.t.getState().done, false);
  trace(ui, lesson.strokes[1].points); assert.equal(env.t.getState().done, true); assert.equal(env.rewards(), 1); assert.match(env.api.render(), /ws-hanzi/); assert.match(env.api.render(), /十/);
  const texts = Array.from(env.api.texts); env.spoken.forEach(text => assert.ok(texts.includes(text), text));
});

test('a childlike slightly wavering trace completes number ten one then zero without joining the two', () => {
  const env = load(), ui = dom(env, { left: 14, top: 230, width: 292, height: 292 }); env.t.selectLesson('number-10', false);
  const strokes = env.root.WRITING_LESSONS[9].strokes.map(stroke => stroke.points.map(([x, y], i) => [x + 8 * Math.sin(i * .12), y + 6 * Math.cos(i * .14)]));
  trace(ui, strokes[0]); assert.equal(env.t.getState().stroke, 1); assert.equal(env.t.getState().done, false); assert.equal(env.rewards(), 0);
  trace(ui, strokes[1]); assert.equal(env.t.getState().done, true); assert.equal(env.t.getState().traces.length, 2); assert.equal(env.rewards(), 1);
});

test('coordinates stay correct at phone sizes, letterboxing and rotation; rotating mid-stroke never completes', () => {
  const env = load(), ui = dom(env, { left: 19, top: 150, width: 270, height: 270 }), points = env.root.WRITING_LESSONS[0].strokes[0].points;
  ui.board().dispatch('pointerdown', ui.event(points[0])); ui.board().dispatch('pointermove', ui.event(points[10])); assert.notEqual(env.t.stats().pointer, null);
  ui.setRect({ left: 100, top: 50, width: 600, height: 300 }); ui.rootNode.dispatch('orientationchange'); assert.equal(env.t.stats().pointer, null); assert.equal(env.t.getState().stroke, 0);
  const transformed = env.t.clientPoint(ui.event([200, 324]), { left: 100, top: 50, width: 600, height: 300 }); assert.deepEqual(Array.from(transformed), [200, 324]);
  trace(ui, points); assert.equal(env.t.getState().done, true);
});

test('automatic hand demonstration follows every stroke and stop or exit cancels all delayed work', () => {
  const env = load(), ui = dom(env), lesson = env.root.WRITING_LESSONS[9]; env.root.WRITING_VOICE_DURATIONS = { [lesson.strokes[0].hint]: 4.2, [lesson.strokes[1].hint]: 6 };
  env.t.selectLesson('number-10'); assert.equal(env.t.getState().demo, true); env.tick(4300); assert.equal(env.t.getState().demoStroke, 0); assert.equal(env.spoken.at(-1), lesson.strokes[0].hint);
  env.tick(900); assert.equal(env.t.getState().demoStroke, 1); assert.equal(env.spoken.at(-1), lesson.strokes[1].hint);
  env.tick(6800); assert.equal(env.t.getState().demo, false); assert.equal(env.t.stats().timers, 0); assert.equal(env.t.getState().stroke, 0); assert.equal(env.t.getState().done, false);
  env.t.demonstrate(); env.tick(300); const stopCount = env.stoppedAudio(); env.api.stop(); assert.ok(env.stoppedAudio() > stopCount); const spokenCount = env.spoken.length; env.tick(30000); assert.equal(env.t.stats().timers, 0); assert.equal(env.t.stats().mounted, false); assert.equal(env.spoken.length, spokenCount);
  assert.equal(ui.board().listeners.get('pointerdown').length, 0);
});

test('demonstration uses the checked voice duration with safe fallback and caps', () => {
  const env = load(), lesson = env.root.WRITING_LESSONS[0], path = env.t.geometry(lesson.strokes[0].points);
  assert.ok(env.t.demoDuration(path, lesson.strokes[0].hint) >= 5500); env.root.WRITING_VOICE_DURATIONS = { short: 5, long: 80, invalid: NaN };
  assert.equal(env.t.demoDuration(path, 'short'), 5250); assert.equal(env.t.demoDuration(path, 'long'), 15000); assert.ok(env.t.demoDuration(path, 'invalid') >= 5500);
});

test('local progress and stars count at most once per number per day, including repeated tracing', () => {
  const env = load(), ui = dom(env), points = env.root.WRITING_LESSONS[0].strokes[0].points; trace(ui, points); assert.equal(env.rewards(), 1);
  env.t.selectLesson('number-1', false); trace(ui, points); assert.equal(env.rewards(), 1); assert.equal(Object.keys(env.t.readProgress().completed).length, 1);
  env.t.markComplete('2099-10-05'); assert.equal(env.rewards(), 2); env.t.markComplete('2099-10-05'); assert.equal(env.rewards(), 2);
  const failure = load({ storageFailure: true }), failureUi = dom(failure); trace(failureUi, failure.root.WRITING_LESSONS[0].strokes[0].points); assert.equal(failure.t.getState().done, true); assert.equal(failure.t.getState().progressSaved, false); assert.equal(failure.rewards(), 0); assert.match(failure.api.render(), /这次先练习/);
  const corrupt = load(); corrupt.stored.set(corrupt.t.data.STORE, '{"version":1,"completed":[]}'); assert.equal(Object.keys(corrupt.t.readProgress().completed).length, 0);
});

test('number navigation and replaying hints preserve correct word meaning and original illustrations', () => {
  const env = load(), ui = dom(env); env.t.selectLesson('number-4', false); assert.equal(env.t.selectNeighbor(-1), true); assert.equal(env.t.getState().lessonId, 'number-3');
  env.t.selectLesson('number-4', false); env.root.WRITING_LESSONS[3].strokes.forEach(stroke => trace(ui, stroke.points));
  const html = env.api.render(); assert.match(html, /再认识一个汉字/); assert.match(html, /ws-hanzi">口/); assert.match(html, /<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/); assert.doesNotMatch(html, /口表示四/);
  ui.host().querySelector('[data-ws-meaning]').dispatch('click'); assert.equal(env.spoken.at(-1), env.root.WRITING_LESSONS[3].meaning);
  ui.host().querySelector('[data-ws-home]').dispatch('click'); assert.deepEqual(env.navigated, ['home']); assert.equal(env.t.stats().timers, 0);
});
