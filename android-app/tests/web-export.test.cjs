const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/main/assets/web-export.js'), 'utf8');
function setup() {
  const listeners = {}, sent = [], alerts = [], port = { close() { this.closed = true; }, start() {}, postMessage(data) { sent.push(JSON.parse(data)); } };
  const context = { location: { origin: 'https://leyman.cn' }, document: { addEventListener(type, callback) { listeners[type] = callback; }, removeEventListener(type, callback) { if (listeners[type] === callback) delete listeners[type]; } }, addEventListener(type, callback) { listeners[type] = callback; }, removeEventListener(type, callback) { if (listeners[type] === callback) delete listeners[type]; }, alert: message => alerts.push(message), fetch: async () => ({ blob: async () => ({ size: 12 }) }), FileReader: class { readAsDataURL() { this.result = 'data:audio/wav;base64,UklGRgAAAABXQVZF'; this.onload(); } } };
  context.window = context; vm.createContext(context); vm.runInContext(source.replace('__GC_EXPORT_TOKEN__', 'guolicheng-export-v1:test-token'), context);
  function connect(parent = null, trusted = true, token = 'guolicheng-export-v1:test-token') { listeners.message({ origin: 'null', source: parent, isTrusted: trusted, data: token, ports: [port] }); }
  function click(href = 'data:image/png;base64,iVBORw0KGgoBAAAA', trusted = true) {
    let prevented = false, stopped = false;
    listeners.click({ isTrusted: trusted, target: { closest: () => ({ href, download: '我的画.png' }) }, preventDefault() { prevented = true; }, stopImmediatePropagation() { stopped = true; } });
    return { prevented, stopped };
  }
  return { listeners, sent, alerts, port, connect, click, context };
}
test('export channel accepts only the nonce-bearing native handshake and user clicks', () => {
  const env = setup(); env.connect({}); assert.equal(env.click().prevented, false);
  env.connect(null, false); assert.equal(env.click().prevented, false);
  env.connect(null, true, 'guolicheng-export-v1:wrong-token'); assert.equal(env.click().prevented, false);
  env.connect(); assert.equal(env.click(undefined, false).prevented, false); assert.equal(env.sent.length, 0);
  assert.deepEqual(env.click(), { prevented: true, stopped: true }); assert.equal(env.sent.length, 1); assert.equal(env.sent[0].type, 'save'); assert.equal(env.sent[0].mime, 'image/png');
  assert.equal(env.click('https://leyman.cn/file.png').prevented, false);
  env.context.__guolichengExportDispose(); assert.equal(env.port.closed, true); assert.equal(env.listeners.click, undefined); assert.equal(env.listeners.message, undefined);
});
test('owned blob exports are converted and oversized payloads show a retry message without native messages', async () => {
  const env = setup(); env.connect(); env.click('blob:https://evil.test/something'); await Promise.resolve(); assert.equal(env.sent.length, 0);
  env.click('blob:https://leyman.cn/music'); await new Promise(resolve => setImmediate(resolve)); assert.equal(env.sent[0].mime, 'audio/wav');
  env.click('data:image/png;base64,' + 'A'.repeat(22369625)); assert.equal(env.sent.length, 1); assert.equal(env.alerts.length, 1);
  env.context.fetch = async () => ({ blob: async () => ({ size: 16777217 }) });
  env.click('blob:https://leyman.cn/too-large'); await new Promise(resolve => setImmediate(resolve)); assert.equal(env.sent.length, 1); assert.equal(env.alerts.length, 2);
});
