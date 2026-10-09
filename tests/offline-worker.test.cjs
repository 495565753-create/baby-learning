// Exercises the isolated worker with real Response/Request bodies and persistent
// fake CacheStorage. No browser, server, or live service is needed for these checks.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {createHash, webcrypto} = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '..', 'offline', 'sw.js'), 'utf8');
const ORIGIN = 'https://leyman.cn';
const V1 = '1234567890abcdef';
const V2 = 'abcdef1234567890';
const key = value => typeof value === 'string' ? value : value.url;
const hash = value => createHash('sha256').update(value).digest('hex');

function storage() {
  const records = new Map();
  return {
    records,
    async keys() {return [...records.keys()];},
    async open(name) {
      if (!records.has(name)) records.set(name, new Map());
      const cache = records.get(name);
      return {
        async match(request) {return cache.get(key(request))?.clone();},
        async put(request, response) {cache.set(key(request), response.clone());},
        async delete(request) {return cache.delete(key(request));},
        async keys() {return [...cache.keys()].map(url => new Request(url));}
      };
    }
  };
}

function harness(shared) {
  const state = shared || {caches: storage(), online: true, network: new Map(), calls: [],
    clients: new Map([
      ['offline', {url: ORIGIN + '/offline/play.html?section=games'}],
      ['installer', {url: ORIGIN + '/offline/index.html'}],
      ['normal', {url: ORIGIN + '/?section=stories'}]
    ]), claimCount: 0, skipCount: 0};
  const listeners = new Map();
  const networkFetch = async (request, options) => {
    const url = key(request);
    state.calls.push({url, options, method: request.method || 'GET'});
    if (!state.online) throw new TypeError('Network offline');
    const response = state.network.get(url);
    if (!response) return new Response('network:' + url, {status: 404});
    return response.clone();
  };
  const self = {
    location: {origin: ORIGIN},
    clients: {
      async get(id) {return state.clients.get(id);},
      async claim() {state.claimCount++;}
    },
    async skipWaiting() {state.skipCount++;},
    addEventListener(name, fn) {listeners.set(name, fn);}
  };
  const context = vm.createContext({self, caches: state.caches, fetch: networkFetch,
    Request, Response, Headers, URL, crypto: webcrypto, Uint8Array, console});
  vm.runInContext(source, context, {filename: 'offline/sw.js'});
  return {
    state,
    reboot() {return harness(state);},
    async lifecycle(name) {
      const waits = [];
      listeners.get(name)({waitUntil(promise) {waits.push(promise);}});
      await Promise.all(waits);
    },
    async message(data) {
      const waits = [], replies = [];
      listeners.get('message')({data, ports: [{postMessage(value) {replies.push(value);}}],
        waitUntil(promise) {waits.push(promise);}});
      await Promise.all(waits);
      assert.equal(replies.length, 1);
      return JSON.parse(JSON.stringify(replies[0]));
    },
    async request(url, options = {}) {
      const request = options.navigate ? {
        url: new URL(url, ORIGIN).href, mode: 'navigate', method: options.method || 'GET',
        headers: new Headers(options.headers), cache: options.cache || 'default'
      } : new Request(new URL(url, ORIGIN), {method: options.method || 'GET',
        headers: options.headers, cache: options.cache || 'default'});
      let promise;
      listeners.get('fetch')({request, clientId: options.clientId || 'offline',
        respondWith(value) {promise = value;}});
      return {handled: !!promise, response: promise ? await promise : await networkFetch(request)};
    }
  };
}

async function putVersion(h, version = V1, label = 'old') {
  const bodies = new Map([
    ['/offline/index.html', '<html>installer-' + label + '</html>'],
    ['/offline/play.html', '<html>play-' + label + '</html>'],
    ['/offline/installer.js', 'installer-' + label],
    ['/offline/installer.css', '.installer-' + label + '{}'],
    ['/app-assets/app-1111111111111111.js', 'bundle-' + label],
    ['/voice/test.mp3', '0123456789abcdefghij'],
    ['/art/test.webp', 'picture-' + label]
  ]);
  const files = [...bodies].map(([url, body]) => ({url,
    bytes: Buffer.byteLength(body), sha256: hash(body)}));
  const data = {version, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), files};
  const cache = await h.state.caches.open('guolicheng-offline-' + version);
  for (const [url, body] of bodies) {
    await cache.put(ORIGIN + url, new Response(body, {headers: {'Content-Type':
      url.endsWith('.mp3') ? 'audio/mpeg' : url.endsWith('.html') ? 'text/html' : 'text/plain'}}));
  }
  await cache.put(ORIGIN + '/offline/ready.json', new Response(JSON.stringify({version,
    totalFiles: files.length, totalBytes: data.totalBytes}), {headers: {'Content-Type': 'application/json'}}));
  h.state.network.set(ORIGIN + '/offline/assets.json', new Response(JSON.stringify(data), {
    headers: {'Content-Type': 'application/json'}}));
  return {cache, data, bodies};
}

async function activate(h, version = V1) {
  const result = await h.message({type: 'ACTIVATE_VERSION', version, requestId: 'activation'});
  assert.equal(result.ok, true, result.error);
  assert.equal(result.version, version);
  assert.equal(result.requestId, 'activation');
  assert.equal(result.type, 'ACTIVATE_VERSION_RESULT');
  return result;
}

test('worker lifecycle claims its declared scope without any downloads', async () => {
  const h = harness();
  await h.lifecycle('install');
  await h.lifecycle('activate');
  assert.equal(h.state.claimCount, 1);
  assert.equal(h.state.skipCount, 1);
  assert.equal(h.state.calls.length, 0);
  assert.equal((await h.message({type: 'STATUS'})).ready, false);
});

test('complete copy activates, status is exact, and active version survives worker restart', async () => {
  const h = harness(), {data} = await putVersion(h);
  const result = await activate(h);
  assert.equal(result.totalFiles, data.files.length);
  assert.equal(result.totalBytes, data.totalBytes);
  const manifestFetch = h.state.calls.find(call => call.url.endsWith('/offline/assets.json'));
  assert.equal(manifestFetch.options.cache, 'no-store');
  h.state.online = false;
  const restarted = h.reboot();
  const status = await restarted.message({type: 'STATUS', requestId: 'status'});
  assert.equal(status.ready, true);
  assert.equal(status.activeVersion, V1);
  assert.equal(status.totalFiles, data.files.length);
  assert.equal(status.requestId, 'status');
  const {response} = await restarted.request('/offline/play.html', {navigate: true});
  assert.equal(await response.text(), '<html>play-old</html>');
});

test('missing or corrupt downloaded file cannot replace the previous ready copy', async () => {
  const h = harness();
  await putVersion(h);
  await activate(h);
  const next = await putVersion(h, V2, 'new');
  await next.cache.delete(ORIGIN + '/art/test.webp');
  let result = await h.message({type: 'ACTIVATE_VERSION', version: V2});
  assert.equal(result.ok, false);
  assert.match(result.error, /还没下载齐/);
  assert.equal(result.activeVersion, V1);
  await next.cache.put(ORIGIN + '/art/test.webp', new Response('picture-BAD'));
  result = await h.message({type: 'ACTIVATE_VERSION', version: V2});
  assert.equal(result.ok, false);
  assert.match(result.error, /校验未通过/);
  assert.equal((await h.message({type: 'STATUS'})).version, V1);
  h.state.online = false;
  assert.equal(await (await h.request('/offline/play.html', {navigate: true})).response.text(),
    '<html>play-old</html>');
  assert.ok((await h.state.caches.keys()).includes('guolicheng-offline-' + V1));
});

test('a new complete copy switches atomically and keeps the old cache', async () => {
  const h = harness();
  await putVersion(h);
  await activate(h);
  await putVersion(h, V2, 'new');
  await activate(h, V2);
  h.state.online = false;
  assert.equal(await (await h.request('/offline/play.html?section=stories', {navigate: true})).response.text(),
    '<html>play-new</html>');
  assert.ok((await h.state.caches.keys()).includes('guolicheng-offline-' + V1));
  assert.equal((await h.reboot().message({type: 'STATUS'})).version, V2);
});

test('activation rejects invalid version, stale manifest, and incorrect completion marker', async () => {
  const h = harness(), {cache, data} = await putVersion(h);
  assert.equal((await h.message({type: 'ACTIVATE_VERSION', version: '../main'})).ok, false);
  assert.equal(h.state.calls.length, 0);
  assert.equal((await h.message({type: 'ACTIVATE_VERSION', version: V2})).ok, false);
  await cache.put(ORIGIN + '/offline/ready.json', new Response(JSON.stringify({version: V1,
    totalFiles: data.files.length - 1, totalBytes: data.totalBytes})));
  assert.equal((await h.message({type: 'ACTIVATE_VERSION', version: V1})).ok, false);
  assert.equal((await h.message({type: 'STATUS'})).ready, false);
});

test('manifest rejects unsafe, duplicated, mismatched, and cyclic resources', async () => {
  for (const mutate of [
    data => {data.files[0].url = '//elsewhere.test/index.html';},
    data => {data.files[0].url = '/offline/../index.html';},
    data => {data.files[0].url = '/offline/sw.js';},
    data => {data.files[0].url = '/offline/assets.json';},
    data => {data.files[0].url = '/offline/index.html?tracking=1';},
    data => {data.files[0].url = data.files[1].url;},
    data => {data.totalBytes++;},
    data => {data.files[0].sha256 = 'not-a-hash';}
  ]) {
    const h = harness(), {data} = await putVersion(h);
    mutate(data);
    h.state.network.set(ORIGIN + '/offline/assets.json', new Response(JSON.stringify(data)));
    assert.equal((await h.message({type: 'ACTIVATE_VERSION', version: V1})).ok, false);
    assert.equal((await h.message({type: 'STATUS'})).ready, false);
  }
});

test('offline app navigation ignores section queries; assets accept only a v cache buster', async () => {
  const h = harness();
  await putVersion(h);
  await activate(h);
  h.state.online = false;
  for (const [url, expected] of [
    ['/offline/play.html?section=games&v=abc', 'play-old']
  ]) {
    const {response} = await h.request(url, {navigate: true});
    assert.match(await response.text(), new RegExp(expected));
  }
  assert.equal(await (await h.request('/voice/test.mp3?v=1')).response.text(), '0123456789abcdefghij');
  assert.equal(await (await h.request('/art/test.webp?v=58e084e')).response.text(), 'picture-old');
  for (const url of ['/voice/test.mp3?token=secret', '/voice/test.mp3?v=1&other=2', '/voice/test.mp3?v=']) {
    await assert.rejects(h.request(url), /Network offline/);
  }
});

test('normal live homepage, ordinary clients, non-GET, and external video are never served offline', async () => {
  const h = harness();
  await putVersion(h);
  await activate(h);
  h.state.network.set(ORIGIN + '/?section=games', new Response('live homepage'));
  let result = await h.request('/?section=games', {navigate: true});
  assert.equal(result.handled, false);
  assert.equal(await result.response.text(), 'live homepage');
  result = await h.request('/voice/test.mp3', {clientId: 'normal'});
  assert.equal(result.response.status, 404);
  result = await h.request('/voice/test.mp3', {method: 'POST'});
  assert.equal(result.handled, false);
  result = await h.request('https://tv.cctv.com/official-video.shtml');
  assert.equal(result.handled, false);
  assert.equal(result.response.status, 404);
});

test('installer stays network-first, falls back offline, and does not cache failed responses', async () => {
  const h = harness();
  await putVersion(h);
  await activate(h);
  h.state.network.set(ORIGIN + '/offline/index.html', new Response('latest installer'));
  assert.equal(await (await h.request('/offline/index.html', {navigate: true})).response.text(),
    'latest installer');
  h.state.network.set(ORIGIN + '/offline/index.html', new Response('bad gateway', {status: 502}));
  assert.match(await (await h.request('/offline/index.html', {navigate: true})).response.text(), /installer-old/);
  h.state.online = false;
  assert.match(await (await h.request('/offline/', {navigate: true})).response.text(), /installer-old/);
  assert.equal(await (await h.request('/offline/installer.js', {clientId: 'installer'})).response.text(),
    'installer-old');
  const empty = harness();
  empty.state.online = false;
  const unavailable = await empty.request('/offline/index.html', {navigate: true});
  assert.equal(unavailable.response.status, 503);
  assert.match(await unavailable.response.text(), /先把小乐园下载完整/);
});

test('full audio and single byte ranges including suffix work entirely from cache', async () => {
  const h = harness();
  await putVersion(h);
  await activate(h);
  h.state.online = false;
  const full = (await h.request('/voice/test.mp3?v=1')).response;
  assert.equal(full.status, 200);
  assert.equal(full.headers.get('Accept-Ranges'), 'bytes');
  assert.equal(full.headers.get('Content-Length'), '20');
  assert.equal(await full.text(), '0123456789abcdefghij');
  for (const [range, expected, contentRange] of [
    ['bytes=0-3', '0123', 'bytes 0-3/20'],
    ['bytes=15-', 'fghij', 'bytes 15-19/20'],
    ['bytes=-4', 'ghij', 'bytes 16-19/20'],
    ['bytes=-100', '0123456789abcdefghij', 'bytes 0-19/20'],
    ['bytes=18-100', 'ij', 'bytes 18-19/20']
  ]) {
    const response = (await h.request('/voice/test.mp3?v=1', {headers: {Range: range}})).response;
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('Content-Range'), contentRange);
    assert.equal(response.headers.get('Accept-Ranges'), 'bytes');
    assert.equal(response.headers.get('Content-Length'), String(expected.length));
    assert.equal(response.headers.get('Content-Type'), 'audio/mpeg');
    assert.equal(await response.text(), expected);
  }
});

test('invalid or multiple audio ranges return 416 with resource length', async () => {
  const h = harness();
  await putVersion(h);
  await activate(h);
  h.state.online = false;
  for (const range of ['bytes=20-', 'bytes=5-2', 'bytes=-0', 'bytes=-', 'items=0-1',
    'bytes=0-1,3-4', 'bytes=99999999999999999999-', 'bytes=1 - 2']) {
    const response = (await h.request('/voice/test.mp3', {headers: {Range: range}})).response;
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get('Content-Range'), 'bytes */20');
    assert.equal(await response.text(), '');
  }
});

test('evicted listed files produce explicit errors without falling back to a mismatched online asset', async () => {
  const h = harness(), {cache} = await putVersion(h);
  await activate(h);
  await cache.delete(ORIGIN + '/offline/play.html');
  await cache.delete(ORIGIN + '/voice/test.mp3');
  h.state.network.set(ORIGIN + '/voice/test.mp3', new Response('different newest voice'));
  const before = h.state.calls.length;
  const page = (await h.request('/offline/play.html?section=stories', {navigate: true})).response;
  assert.equal(page.status, 503);
  assert.match(await page.text(), /离线安装页面/);
  const voice = (await h.request('/voice/test.mp3')).response;
  assert.equal(voice.status, 503);
  assert.equal(voice.headers.get('X-Offline-Missing'), '1');
  assert.equal(h.state.calls.length, before);
  const restarted = h.reboot();
  assert.equal((await restarted.message({type: 'STATUS'})).activeVersion, V1);
  assert.equal((await restarted.message({type: 'STATUS'})).ready, false);
});

test('installer no-store downloads get the newest same-path asset and never the old active body', async () => {
  const h = harness();
  await putVersion(h);
  await activate(h);
  h.state.network.set(ORIGIN + '/art/test.webp', new Response('newer picture'));
  const old = (await h.request('/art/test.webp', {clientId: 'installer'})).response;
  assert.equal(await old.text(), 'picture-old');
  const fresh = (await h.request('/art/test.webp', {clientId: 'installer', cache: 'no-store'})).response;
  assert.equal(await fresh.text(), 'newer picture');
  const stillOld = (await h.request('/art/test.webp')).response;
  assert.equal(await stillOld.text(), 'picture-old');
  h.state.online = false;
  await assert.rejects(h.request('/art/test.webp', {clientId: 'installer', cache: 'no-store'}), /Network offline/);
});

test('STATUS does not promise an offline copy after its cache or ready marker is evicted', async () => {
  const h = harness(), {cache} = await putVersion(h);
  await activate(h);
  await cache.delete(ORIGIN + '/offline/ready.json');
  assert.equal((await h.message({type: 'STATUS'})).ready, false);
  h.state.caches.records.delete('guolicheng-offline-' + V1);
  assert.equal((await h.message({type: 'STATUS'})).ready, false);
  assert.equal((await h.reboot().message({type: 'STATUS'})).ready, false);
  assert.ok(h.state.caches.records.has('guolicheng-offline-meta'));
});

test('unknown network failures do not create cached content', async () => {
  const h = harness();
  await putVersion(h);
  await activate(h);
  h.state.network.set(ORIGIN + '/unknown.png', new Response('server failed', {status: 503}));
  const response = (await h.request('/unknown.png')).response;
  assert.equal(response.status, 503);
  const active = await h.state.caches.open('guolicheng-offline-' + V1);
  assert.equal(await active.match(ORIGIN + '/unknown.png'), undefined);
  h.state.online = false;
  await assert.rejects(h.request('/unknown.png'), /Network offline/);
  assert.equal(await active.match(ORIGIN + '/unknown.png'), undefined);
});
