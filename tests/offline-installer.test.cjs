const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash, webcrypto} = require('node:crypto');
const {MessageChannel} = require('node:worker_threads');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'offline/installer.js'), 'utf8');
const origin = 'https://leyman.cn';
const version = '1234567890abcdef';
const oldVersion = 'fedcba0987654321';
const cacheName = 'guolicheng-offline-' + version;
const oldCacheName = 'guolicheng-offline-' + oldVersion;
const readyUrl = origin + '/offline/ready.json';
const sha = body => createHash('sha256').update(body).digest('hex');
const absolute = value => typeof value === 'string' ? new URL(value, origin + '/offline/').href : value.url;

function fixture(count = 12) {
  const bodies = new Map();
  const files = Array.from({length: count}, (_, i) => {
    const url = i === 0 ? '/offline/play.html' : '/voice-test/lesson-' + i + '.mp3';
    const body = Buffer.from('verified offline content ' + i + '\n'.repeat(i + 1));
    bodies.set(origin + url, body);
    return {url, bytes: body.byteLength, sha256: sha(body)};
  });
  return {bodies, manifest: {version, files, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0)}};
}

function control(id, initial = {}) {
  const listeners = new Map();
  return {
    id, textContent: '', hidden: false, disabled: false, value: 0, ...initial,
    addEventListener(type, handler) { listeners.set(type, handler); },
    click() {
      assert.equal(this.disabled, false, id + ' must be enabled before a user clicks it');
      const handler = listeners.get('click');
      assert.ok(handler, id + ' has a user action');
      return handler({type: 'click', target: this});
    }
  };
}

async function waitFor(predicate, description) {
  const deadline = Date.now() + 3000;
  while (!predicate()) {
    if (Date.now() > deadline) assert.fail('Timed out: ' + description);
    await new Promise(resolve => setTimeout(resolve, 2));
  }
}

function browser(options = {}) {
  const data = options.data || fixture();
  const nodes = Object.fromEntries(['downloadStatus', 'downloadProgress', 'downloadButton',
    'pauseButton', 'playButton', 'savedVersion', 'appleSteps', 'sizeInfo', 'storageInfo']
    .map(id => [id, control(id)]));
  nodes.downloadButton.disabled = true;
  nodes.pauseButton.hidden = nodes.playButton.hidden = nodes.savedVersion.hidden = true;
  const fetches = [], commands = [], registrations = [], puts = [], deleted = [];
  const stores = new Map(), channels = new Set();
  let activeFetches = 0, maxFetches = 0;
  let wakeRequests = 0, wakeReleases = 0;

  function store(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  }

  const caches = {
    async open(name) {
      const entries = store(name);
      return {
        async match(request) { return entries.get(absolute(request))?.clone(); },
        async put(request, response) {
          const url = absolute(request);
          if (options.beforePut) await options.beforePut({name, url, response});
          puts.push({name, url});
          entries.set(url, response.clone());
        },
        async keys() { return Array.from(entries.keys(), url => new Request(url)); }
      };
    },
    async keys() { return Array.from(stores.keys()); },
    async delete(name) { deleted.push(name); return stores.delete(name); }
  };

  if (options.preload) {
    for (const [name, entries] of options.preload) {
      for (const [url, response] of entries) store(name).set(absolute(url), response.clone());
    }
  }

  const registration = {
    active: {
      postMessage(message, ports) {
        const port = ports[0];
        channels.add(port);
        const record = {message: JSON.parse(JSON.stringify(message)),
          keys: Array.from(store(cacheName).keys()),
          ready: store(cacheName).get(readyUrl)?.clone()};
        commands.push(record);
        Promise.resolve().then(async () => {
          if (options.command) return options.command(message, record);
          return message.type === 'STATUS'
            ? {ok: true, ready: Boolean(options.oldActive), activeVersion: options.oldActive ? oldVersion : null,
              totalFiles: options.oldActive ? data.manifest.files.length : 0,
              totalBytes: options.oldActive ? (options.oldBytes ?? data.manifest.totalBytes) : 0}
            : {ok: true, version: message.version};
        }).then(result => { port.postMessage(result); port.close(); channels.delete(port); });
      }
    }
  };

  const navigator = {
    standalone: false,
    serviceWorker: {
      async register(script, settings) {
        registrations.push({script, settings: JSON.parse(JSON.stringify(settings))});
        return registration;
      },
      ready: Promise.resolve(registration)
    },
    storage: {
      async persist() { return true; },
      async estimate() { return {quota: 2_000_000_000, usage: 0}; }
    },
    wakeLock: {async request() { wakeRequests++; return {async release() { wakeReleases++; }}; }}
  };

  async function fetch(request, settings = {}) {
    const url = absolute(request);
    fetches.push({url, cache: settings.cache});
    if (url === origin + '/offline/assets.json') {
      if (options.manifestFailure) throw new TypeError('offline');
      return new Response(JSON.stringify(data.manifest), {headers: {'Content-Type': 'application/json'}});
    }
    assert.ok(data.bodies.has(url), 'installer must fetch only files in the current manifest: ' + url);
    activeFetches++;
    maxFetches = Math.max(maxFetches, activeFetches);
    try {
      if (options.fetchAsset) return await options.fetchAsset(url, data.bodies.get(url), settings);
      await new Promise(resolve => setTimeout(resolve, 8));
      return new Response(data.bodies.get(url));
    } finally { activeFetches--; }
  }

  const document = {
    hidden: false,
    getElementById(id) { assert.ok(nodes[id], 'known installer control: ' + id); return nodes[id]; },
    addEventListener() {}
  };
  const context = {document, navigator, caches, fetch, crypto: webcrypto, URL, Request, Response,
    Uint8Array, MessageChannel, AbortController, setTimeout, clearTimeout, console,
    location: {origin, href: origin + '/offline/'},
    matchMedia() { return {matches: false}; }, isSecureContext: true};
  context.window = context;
  vm.runInNewContext(source, context, {filename: 'offline/installer.js'});

  return {
    data, nodes, stores, fetches, commands, registrations, puts, deleted,
    get maxFetches() { return maxFetches; },
    get wakeRequests() { return wakeRequests; },
    get wakeReleases() { return wakeReleases; },
    async initialized() {
      await waitFor(() => options.manifestFailure
        ? /当前没有联网/.test(nodes.downloadStatus.textContent)
        : nodes.downloadButton.disabled === false, 'installer preparation');
    },
    start() { return nodes.downloadButton.click(); },
    async cached(url, name = cacheName) { return stores.get(name)?.get(absolute(url))?.clone(); },
    close() { for (const port of channels) port.close(); }
  };
}

function assetRequests(app) {
  return app.fetches.filter(request => request.url !== origin + '/offline/assets.json');
}

test('opening the installer prepares only its manifest and an isolated worker, without eager library downloads', async t => {
  const app = browser({data: fixture(2800)});
  t.after(() => app.close());
  await app.initialized();
  assert.deepEqual(app.registrations, [{script: 'sw.js', settings: {scope: './', updateViaCache: 'none'}}]);
  assert.deepEqual(app.commands.map(item => item.message), [{type: 'STATUS'}]);
  assert.deepEqual(app.fetches, [{url: origin + '/offline/assets.json', cache: 'no-store'}]);
  assert.equal(app.puts.length, 0);
  assert.equal(app.nodes.playButton.hidden, true);
  assert.equal(app.nodes.downloadProgress.value, 0);
  assert.match(app.nodes.downloadButton.textContent, /下载全部/);
});

test('explicit download verifies complete responses, caps work at four, and activates only with the exact completed ready record', async t => {
  const pendingBodies = [];
  let holdBodies = true;
  const app = browser({data: fixture(15), fetchAsset: async (_url, body) => {
    await new Promise(resolve => setTimeout(resolve, 8));
    // A response can arrive before its entire body. Partial stream data must
    // never be accepted into a playable copy just because headers arrived.
    const split = Math.floor(body.byteLength / 2);
    return new Response(new ReadableStream({start(controller) {
      controller.enqueue(body.subarray(0, split));
      const finish = () => { controller.enqueue(body.subarray(split)); controller.close(); };
      if (holdBodies) pendingBodies.push(finish); else finish();
    }}));
  }});
  t.after(() => app.close());
  await app.initialized();
  const downloading = app.start();
  await waitFor(() => pendingBodies.length === 4, 'first responses waiting for their remaining body');
  assert.equal(app.puts.length, 0, 'partial response bodies cannot be cached as complete');
  assert.equal(app.commands.some(item => item.message.type === 'ACTIVATE_VERSION'), false);
  assert.equal(app.nodes.playButton.hidden, true);
  holdBodies = false;
  pendingBodies.splice(0).forEach(finish => finish());
  await downloading;
  assert.equal(app.maxFetches, 4);
  assert.equal(assetRequests(app).length, app.data.manifest.files.length);
  assert.ok(assetRequests(app).every(request => request.cache === 'no-store'));
  const activation = app.commands.find(item => item.message.type === 'ACTIVATE_VERSION');
  assert.ok(activation, 'only a fully downloaded version can request activation');
  assert.deepEqual(activation.message, {type: 'ACTIVATE_VERSION', version});
  assert.deepEqual(await activation.ready.json(), {
    version, totalFiles: app.data.manifest.files.length, totalBytes: app.data.manifest.totalBytes
  });
  for (const file of app.data.manifest.files) {
    assert.ok(activation.keys.includes(origin + file.url), 'file existed before activation: ' + file.url);
    const response = await app.cached(file.url);
    const body = Buffer.from(await response.arrayBuffer());
    assert.equal(body.byteLength, file.bytes);
    assert.equal(sha(body), file.sha256);
  }
  assert.equal(app.nodes.downloadProgress.value, 100);
  assert.equal(app.nodes.playButton.hidden, false);
  assert.equal(app.nodes.savedVersion.hidden, false);
  assert.match(app.nodes.downloadStatus.textContent, /全部下载完成，可以离线玩了/);
  assert.equal(app.wakeReleases, app.wakeRequests);
});

test('resume reuses only verified cached files and replaces an equal-length corrupt response', async t => {
  const data = fixture(7);
  const good = data.manifest.files[0];
  const corrupt = data.manifest.files[1];
  const app = browser({data, preload: [[cacheName, [
    [good.url, new Response(data.bodies.get(origin + good.url))],
    [corrupt.url, new Response(Buffer.alloc(corrupt.bytes, 65))]
  ]]]});
  t.after(() => app.close());
  await app.initialized();
  assert.match(app.nodes.downloadButton.textContent, /继续下载/);
  await app.start();
  const requests = assetRequests(app).map(item => item.url);
  assert.equal(requests.includes(origin + good.url), false, 'a valid cached file needs no network request');
  assert.equal(requests.filter(url => url === origin + corrupt.url).length, 1, 'a corrupt cached file must be redownloaded');
  assert.equal(requests.length, data.manifest.files.length - 1);
  assert.equal(app.nodes.downloadProgress.value, 100);
  assert.equal(app.nodes.playButton.hidden, false);
  assert.equal(sha(Buffer.from(await (await app.cached(corrupt.url)).arrayBuffer())), corrupt.sha256);
});

test('pause keeps in-flight verified files but never exposes a partial first copy, and continue skips them', async t => {
  const pending = [];
  let hold = true;
  const app = browser({data: fixture(9), fetchAsset: async (_url, body) => {
    if (hold) await new Promise(resolve => pending.push(resolve));
    return new Response(body);
  }});
  t.after(() => app.close());
  await app.initialized();
  const first = app.start();
  await waitFor(() => pending.length === 4, 'four in-flight downloads before pause');
  app.nodes.pauseButton.click();
  hold = false;
  pending.splice(0).forEach(resolve => resolve());
  await first;
  assert.equal(assetRequests(app).length, 4);
  assert.equal(app.commands.some(item => item.message.type === 'ACTIVATE_VERSION'), false);
  assert.equal(await app.cached('/offline/ready.json'), undefined);
  assert.equal(app.nodes.playButton.hidden, true);
  assert.match(app.nodes.downloadStatus.textContent, /已暂停/);
  assert.match(app.nodes.downloadButton.textContent, /继续下载/);
  for (const file of app.data.manifest.files.slice(0, 4)) assert.ok(await app.cached(file.url));
  await app.start();
  const requests = assetRequests(app).map(item => item.url);
  assert.equal(requests.length, 9, 'resume downloads only the five files that were not saved');
  assert.equal(new Set(requests).size, 9);
  assert.equal(app.commands.filter(item => item.message.type === 'ACTIVATE_VERSION').length, 1);
  assert.equal(app.nodes.playButton.hidden, false);
  assert.equal(app.nodes.downloadProgress.value, 100);
});

test('digest failures and incorrect full-body lengths are retried but never cached or activated', async t => {
  for (const failure of ['sha256', 'bytes']) {
    await t.test(failure, async subtest => {
      const data = fixture(1);
      const file = data.manifest.files[0];
      if (failure === 'bytes') { file.bytes++; data.manifest.totalBytes++; }
      const app = browser({data, fetchAsset: async (_url, body) =>
        new Response(failure === 'sha256' ? Buffer.alloc(body.byteLength, 88) : body)});
      subtest.after(() => app.close());
      await app.initialized();
      await app.start();
      assert.equal(assetRequests(app).length, 3);
      assert.equal(app.puts.length, 0);
      assert.equal(app.commands.some(item => item.message.type === 'ACTIVATE_VERSION'), false);
      assert.equal(await app.cached('/offline/ready.json'), undefined);
      assert.equal(app.nodes.playButton.hidden, true);
      assert.notEqual(app.nodes.downloadProgress.value, 100);
      assert.match(app.nodes.downloadStatus.textContent, /重新下载.*已下载的内容会保留/);
      assert.equal(app.nodes.downloadButton.disabled, false);
    });
  }
});

test('quota exhaustion cannot mark a copy complete or delete the playable old copy', async t => {
  const oldMarker = origin + '/offline/old-content.html';
  const app = browser({oldActive: true, preload: [[oldCacheName, [[oldMarker, new Response('old copy')]]]],
    beforePut: async ({url}) => {
      if (url !== readyUrl) { const error = new Error('quota'); error.name = 'QuotaExceededError'; throw error; }
    }});
  t.after(() => app.close());
  await app.initialized();
  await app.start();
  assert.match(app.nodes.downloadStatus.textContent, /平板空间不足/);
  assert.equal(app.commands.some(item => item.message.type === 'ACTIVATE_VERSION'), false);
  assert.equal(await app.cached('/offline/ready.json'), undefined);
  assert.equal(app.nodes.playButton.hidden, false, 'the already active old copy remains playable');
  assert.notEqual(app.nodes.downloadProgress.value, 100);
  assert.equal(app.nodes.downloadButton.disabled, false);
  assert.deepEqual(app.deleted, []);
  assert.equal(await (await app.cached(oldMarker, oldCacheName)).text(), 'old copy');
});

test('an active offline copy stays playable when a new manifest cannot be fetched', async t => {
  const app = browser({oldActive: true, oldBytes: 142_654_321, manifestFailure: true});
  t.after(() => app.close());
  await app.initialized();
  assert.equal(app.nodes.playButton.hidden, false);
  assert.equal(app.nodes.savedVersion.hidden, false);
  assert.match(app.nodes.downloadStatus.textContent, /当前没有联网，已下载的离线版仍然可以玩/);
  assert.equal(app.nodes.downloadButton.disabled, true);
  assert.equal(app.nodes.downloadButton.textContent, '联网后可检查新版');
  assert.equal(app.nodes.downloadProgress.value, 100);
  assert.match(app.nodes.sizeInfo.textContent, /已下载完整离线内容，约 142\.7 MB/);
  assert.doesNotMatch(app.nodes.sizeInfo.textContent, /正在检查|NaN/);
  assert.equal(assetRequests(app).length, 0);
  assert.equal(app.puts.length, 0);
  assert.deepEqual(app.deleted, []);
  assert.deepEqual(app.commands.map(item => item.message.type), ['STATUS']);
});

test('a rejected final activation preserves the previous version and downloaded files without reporting success', async t => {
  const app = browser({data: fixture(5), oldActive: true,
    preload: [[oldCacheName, [['/offline/old-content.html', new Response('old copy')]]]],
    command(message) { return message.type === 'STATUS'
      ? {ok: true, ready: true, activeVersion: oldVersion, totalFiles: 5, totalBytes: 142_000_000}
      : {ok: false, error: 'version changed', activeVersion: oldVersion}; }});
  t.after(() => app.close());
  await app.initialized();
  await app.start();
  assert.equal(app.commands.filter(item => item.message.type === 'ACTIVATE_VERSION').length, 1);
  assert.equal(app.nodes.playButton.hidden, false);
  assert.match(app.nodes.downloadStatus.textContent, /最后检查没有完成/);
  assert.doesNotMatch(app.nodes.downloadStatus.textContent, /全部下载完成/);
  assert.deepEqual(app.deleted, []);
  assert.ok(await app.cached('/offline/old-content.html', oldCacheName));
  for (const file of app.data.manifest.files) assert.ok(await app.cached(file.url), 'download survives a failed activation');
  assert.equal(app.nodes.downloadButton.textContent, '继续下载');
});

test('a newer version reuses unchanged old files only after SHA verification and keeps the old copy until activation succeeds', async t => {
  for (const success of [true, false]) {
    await t.test(success ? 'successful activation' : 'rejected activation', async subtest => {
      const data = fixture(7);
      const unchanged = data.manifest.files[0];
      const changed = data.manifest.files[1];
      const previousBody = Buffer.alloc(changed.bytes, 66);
      assert.notEqual(sha(previousBody), changed.sha256, 'old and new same-length content differ by hash');
      let activationStarted = false, finishActivation;
      const app = browser({data, oldActive: true, preload: [
        [oldCacheName, [
          [unchanged.url, new Response(data.bodies.get(origin + unchanged.url))],
          [changed.url, new Response(previousBody)]
        ]],
        ['unrelated-site-cache', [['/unrelated', new Response('keep another app')]]]
      ], async command(message) {
        if (message.type === 'STATUS') return {ok: true, ready: true, activeVersion: oldVersion,
          totalFiles: 2, totalBytes: unchanged.bytes + changed.bytes};
        activationStarted = true;
        await new Promise(resolve => { finishActivation = resolve; });
        return success ? {ok: true, version} : {ok: false, error: 'new version rejected', activeVersion: oldVersion};
      }});
      subtest.after(() => app.close());
      await app.initialized();
      const download = app.start();
      await waitFor(() => activationStarted, 'updated copy has requested final activation');

      const requests = assetRequests(app).map(item => item.url);
      assert.equal(requests.includes(origin + unchanged.url), false, 'identical validated old content is copied without network');
      assert.equal(requests.filter(url => url === origin + changed.url).length, 1, 'an old same-length body with different SHA must be fetched');
      assert.equal(requests.length, data.manifest.files.length - 1);
      assert.equal(sha(Buffer.from(await (await app.cached(unchanged.url)).arrayBuffer())), unchanged.sha256);
      assert.equal(sha(Buffer.from(await (await app.cached(changed.url)).arrayBuffer())), changed.sha256);
      assert.equal(sha(Buffer.from(await (await app.cached(changed.url, oldCacheName)).arrayBuffer())), sha(previousBody));
      assert.equal(app.stores.has(oldCacheName), true, 'the old complete copy remains available during activation');
      assert.deepEqual(app.deleted, []);
      assert.deepEqual(await (await app.cached('/offline/ready.json')).json(), {
        version, totalFiles: data.manifest.files.length, totalBytes: data.manifest.totalBytes
      });

      finishActivation();
      await download;
      assert.equal(app.nodes.playButton.hidden, false);
      assert.equal(app.stores.has('unrelated-site-cache'), true, 'cleanup does not touch another app');
      if (success) {
        assert.deepEqual(app.deleted, [oldCacheName]);
        assert.equal(app.stores.has(oldCacheName), false);
        assert.match(app.nodes.downloadStatus.textContent, /全部下载完成，可以离线玩了/);
      } else {
        assert.deepEqual(app.deleted, []);
        assert.equal(app.stores.has(oldCacheName), true);
        assert.match(app.nodes.downloadStatus.textContent, /最后检查没有完成/);
        assert.doesNotMatch(app.nodes.downloadStatus.textContent, /全部下载完成/);
      }
    });
  }
});
