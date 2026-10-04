const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const native = fs.readFileSync(path.join(__dirname, '../src/main/java/cn/leyman/guolicheng/MainActivity.java'), 'utf8');
const website = fs.readFileSync(path.join(__dirname, '../../kid.js'), 'utf8');
const backScript = JSON.parse(native.match(/web\.evaluateJavascript\(("(?:\\.|[^"\\])*"), result ->/)[1]);
const pauseScript = JSON.parse(native.match(/if \(pausedWithPage\) web\.evaluateJavascript\(("(?:\\.|[^"\\])*"), null\)/)[1]);
const resumeScript = JSON.parse(native.match(/if \(pausedWithPage && UrlPolicy\.isOwn\(web\.getUrl\(\)\)\) web\.evaluateJavascript\(("(?:\\.|[^"\\])*"), null\)/)[1]);
function extracted(name) { const start = website.indexOf(`function ${name}(`); assert.ok(start >= 0); return website.slice(start, website.indexOf('\n', start)); }
function context(page) {
  const calls = [], env = { calls, render: () => calls.push('render'), stopAudio: () => calls.push('voice-stop'), stopInteractiveGame: () => calls.push('game-stop'), rememberGameMenu: () => calls.push('remember-games'), rememberStoryMenu: () => calls.push('remember-stories'), go: next => { env.state.page = next; } };
  env.window = env; vm.createContext(env);
  vm.runInContext(`const state = {page:${JSON.stringify(page)}, stack:[{page:'games'}], readerAuto:true, readerPaused:true};`, env);
  // Use the production export rather than assuming a global lexical state is a Window property.
  const exportStatement = website.match(/window\.state\s*=\s*state\s*;/); assert.ok(exportStatement, 'production must expose its SPA navigation state');
  vm.runInContext(exportStatement[0] + extracted('leaveReader') + '\n' + extracted('back'), env);
  return env;
}
test('Android back delegates to the real website SPA back for stories, piano and games', () => {
  for (const page of ['reader', 'piano', 'game']) {
    const env = context(page); assert.equal(vm.runInContext(backScript, env), 'handled');
    assert.equal(env.state.page, 'games'); assert.ok(env.calls.includes('render')); assert.ok(env.calls.includes('voice-stop'));
    if (page === 'reader') { assert.equal(env.state.readerAuto, false); assert.equal(env.state.readerPaused, false); }
  }
  const home = context('home'); assert.equal(vm.runInContext(backScript, home), 'home'); assert.equal(home.calls.length, 0);
  const arcade = { window: {} }; vm.createContext(arcade); assert.equal(vm.runInContext(backScript, arcade), 'document');
});
test('native pause cancels reader autoplay, voices and interactive nodes without navigating away', () => {
  const env = context('reader'); vm.runInContext(pauseScript, env);
  assert.equal(env.state.page, 'reader'); assert.equal(env.state.readerAuto, false); assert.equal(env.state.readerPaused, false);
  assert.deepEqual(env.calls, ['voice-stop', 'game-stop']);
});
test('returning from a save dialog preserves the legacy coloring DOM and re-mounts stopped studios', () => {
  const coloring = context('coloring'); coloring.state.colorUndo = [{ pixels: 'painted' }];
  vm.runInContext(pauseScript, coloring); vm.runInContext(resumeScript, coloring);
  assert.equal(coloring.calls.includes('render'), false); assert.equal(coloring.state.colorUndo[0].pixels, 'painted');
  for (const page of ['piano', 'draw', 'writing', 'game']) {
    const env = context(page); vm.runInContext(pauseScript, env); vm.runInContext(resumeScript, env);
    assert.deepEqual(env.calls, ['voice-stop', 'game-stop', 'render']);
  }
});
