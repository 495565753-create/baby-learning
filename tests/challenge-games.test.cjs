const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const dir = path.join(__dirname, '..');

function load() {
  let time = 0, nextId = 1;
  const timers = new Map(), spoken = [], finished = [];
  const root = { console, Date, Math, Set, Map, JSON, document: { querySelector() { return null; } }, speak(text) { spoken.push(text); }, finishMiniGame(text) { finished.push(text); }, setTimeout(fn, delay) { const id = nextId++; timers.set(id, { fn, at: time + (delay || 0) }); return id; }, clearTimeout(id) { timers.delete(id); } };
  root.window = root;
  for (const name of ['kids-new-games.js', 'kids-challenge-games.js']) vm.runInNewContext(fs.readFileSync(path.join(dir, name), 'utf8'), root, { filename: name });
  function flushAll(limit = 100) { let count = 0; while (timers.size) { assert.ok(count++ < limit, 'scheduled interactions settle'); const [id, next] = [...timers].sort((a, b) => a[1].at - b[1].at)[0]; timers.delete(id); time = next.at; next.fn(); } }
  return { root, api: root.CHALLENGE_GAMES, t: root.CHALLENGE_GAMES._test, spoken, finished, timers, flushAll };
}

test('challenge facade preserves six old games and exports four spoken challenges', () => {
  const { root, api } = load();
  assert.equal(root.NEW_GAMES.entries.length, 10);
  assert.equal(root.NEW_GAMES.entries.filter(entry => entry.category === 'swipe').length, 6);
  for (const entry of api.entries) { assert.equal(entry.category, 'challenge'); assert.ok(api.texts.includes(entry.help)); assert.match(root.NEW_GAMES.render(entry.id), new RegExp(`data-cg-game="${entry.id}"`)); }
  assert.match(root.NEW_GAMES.render('ngWaterGarden'), /data-ng-game="ngWaterGarden"/);
});

test('all robot routes stay on the board, avoid stones, collect all stars, and end at home', () => {
  const env = load();
  env.api.render('cgRobotRoute');
  Array.from(env.t.data.ROBOT_LEVELS).forEach((spec, level) => {
    env.t.changeLevel(level);
    assert.equal(env.t.runRobot(), false, 'cannot finish without the required route');
    assert.equal(env.t.routeCell(-1), false);
    assert.equal(env.t.routeCell(spec.walls[0]), false);
    assert.equal(env.t.getState().path.length, 1);
    Array.from(spec.route).slice(1).forEach((at, index) => {
      assert.equal(env.t.adjacent(spec.route[index], at, spec.size), true);
      assert.equal(env.t.routeCell(at), true, `${level}: move to ${at}`);
    });
    assert.ok(spec.stars.every(at => env.t.getState().path.includes(at)));
    assert.equal(env.t.runRobot(), true);
    assert.equal(env.t.routeCell(spec.start), false, 'editing is locked during animation');
    env.flushAll();
    assert.equal(env.t.getState().done, true);
  });
  assert.equal(env.finished.length, 1, 'one final reward after the final level');
});

test('robot can retract one path step without directional buttons', () => {
  const { api, t } = load(); api.render('cgRobotRoute');
  assert.equal(t.routeCell(8), true); assert.equal(t.routeCell(4), true);
  assert.equal(t.routeCell(8), true); assert.deepEqual(t.getState().path, [12, 8]);
  assert.equal(t.undo(), true); assert.deepEqual(t.getState().path, [12]);
});

test('sliding boards are legal solvable scrambles and hints reach the exact target', () => {
  const env = load(); env.api.render('cgSlidePuzzle');
  Array.from(env.t.data.SLIDE_LEVELS).forEach((spec, level) => {
    env.t.changeLevel(level);
    const tiles = env.t.getState().tiles;
    assert.deepEqual([...tiles].sort((a, b) => a - b), Array.from({ length: spec.size ** 2 }, (_, i) => i));
    assert.equal(env.t.slideSolved(tiles), false);
    const far = tiles.findIndex((_, at) => at !== tiles.indexOf(0) && !env.t.adjacent(at, tiles.indexOf(0), spec.size));
    assert.equal(env.t.slideMove(far), false);
    assert.deepEqual(env.t.getState().tiles, tiles, 'invalid moves cannot corrupt the board');
    let moves = 0;
    while (!env.t.getState().done) { assert.ok(moves++ < 32); const before = env.t.getState().tiles, blank = before.indexOf(0); const hint = env.t.puzzleHint(before, spec.size); assert.ok(env.t.adjacent(hint, blank, spec.size)); assert.equal(env.t.hint(), true); }
    assert.equal(env.t.slideSolved(env.t.getState().tiles), true); env.flushAll();
  });
  assert.equal(env.finished.length, 1);
});

test('sliding undo restores a whole previous board', () => {
  const { api, t } = load(); api.render('cgSlidePuzzle'); t.changeLevel(2);
  const before = t.getState().tiles, blank = before.indexOf(0), at = before.findIndex((_, i) => t.adjacent(i, blank, 3));
  assert.equal(t.slideMove(at), true); assert.equal(t.undo(), true); assert.deepEqual(t.getState().tiles, before);
});

test('memory accepts input after demonstration only, tolerates mistakes, and rewards once', () => {
  const env = load(); env.api.render('cgMemoryLights');
  for (let level = 0; level < 3; level++) {
    env.t.changeLevel(level);
    const sequence = env.t.data.LIGHT_LEVELS[level];
    assert.equal(env.t.pressLight(sequence[0]), false);
    assert.equal(env.t.watchLights(), true); assert.equal(env.t.pressLight(sequence[0]), false);
    env.flushAll(); assert.equal(env.t.getState().phase, 'answer');
    assert.equal(env.t.pressLight((sequence[0] + 1) % 4), false); assert.equal(env.t.getState().phase, 'ready');
    env.t.watchLights(); env.flushAll();
    Array.from(sequence).forEach(at => assert.equal(env.t.pressLight(at), true));
    assert.equal(env.t.getState().done, true); env.flushAll();
    assert.equal(env.t.pressLight(sequence[0]), false);
  }
  assert.equal(env.finished.length, 1);
});

test('logic garden preserves clues and rejects duplicates in either row or column', () => {
  const env = load(); env.api.render('cgLogicGarden');
  for (let level = 0; level < 3; level++) {
    env.t.changeLevel(level); const initial = env.t.getState(), spec = env.t.data.LOGIC_LEVELS[level];
    const fixed = initial.clues.findIndex(Boolean); assert.equal(env.t.logicPlace(fixed, 1), false);
    const firstEmpty = initial.values.indexOf(0), row = Math.floor(firstEmpty / spec.size), col = firstEmpty % spec.size;
    const duplicateAt = initial.values.findIndex((value, at) => value && (Math.floor(at / spec.size) === row || at % spec.size === col));
    assert.equal(env.t.logicPlace(firstEmpty, initial.values[duplicateAt]), false);
    assert.deepEqual(env.t.getState().values, initial.values);
    while (!env.t.getState().done) assert.equal(env.t.hint(), true);
    const final = env.t.getState();
    for (let at = 0; at < final.values.length; at++) { assert.equal(env.t.logicCanPlace(final.values, spec.size, at, final.values[at]), true); if (initial.clues[at]) assert.equal(final.values[at], initial.clues[at]); }
    env.flushAll();
  }
  assert.equal(env.finished.length, 1);
});

test('stop and changing difficulty cancel pending demos, animation, and stale rewards', () => {
  const env = load(); env.api.render('cgMemoryLights'); env.t.watchLights(); assert.ok(env.timers.size);
  env.root.NEW_GAMES.stop(); assert.equal(env.timers.size, 0); env.flushAll(); assert.equal(env.t.getState(), null);
  env.api.render('cgRobotRoute'); Array.from(env.t.data.ROBOT_LEVELS[0].route).slice(1).forEach(at => env.t.routeCell(at)); env.t.runRobot();
  env.t.changeLevel(2); env.flushAll(); assert.equal(env.t.getState().level, 2); assert.equal(env.t.getState().done, false); assert.equal(env.finished.length, 0);
});

test('every challenge voice maps to its fully checked clip and keeps older narration', () => {
  const env = load();
  env.root.VOICE_MAP = { 'zh|older narration': 'older-clip.mp3' };
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'challenge-voice-map.js'), 'utf8'), env.root);
  assert.equal(env.root.VOICE_MAP['zh|older narration'], 'older-clip.mp3');
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'voice-challenge-v1', 'manifest.json'), 'utf8'));
  assert.equal(manifest.voice, 'zh-CN-XiaoxiaoNeural');
  assert.equal(manifest.objective_qa_passed, true);
  assert.equal(manifest.asr_content_check_passed, true);
  assert.equal(manifest.text_count, env.api.texts.length);
  assert.deepEqual(Object.keys(manifest.files).sort(), Array.from(env.api.texts).sort());
  for (const text of env.api.texts) {
    const clip = manifest.files[text];
    assert.equal(env.root.VOICE_MAP[`zh|${text}`], `${clip.file}?v=1`);
    assert.equal(clip.spoken, text);
    assert.equal(clip.qa.fully_decoded, true);
    assert.equal(clip.qa.clipped_samples, 0);
    assert.ok(clip.qa.peak_dbfs <= -.3);
    const audio = fs.readFileSync(path.join(dir, clip.file));
    assert.ok(audio.length > 1000);
    assert.equal(crypto.createHash('sha256').update(audio).digest('hex'), clip.sha256);
  }
  assert.equal(fs.readdirSync(path.join(dir, 'voice-challenge-v1')).filter(file => file.endsWith('.mp3')).length, env.api.texts.length);
});
