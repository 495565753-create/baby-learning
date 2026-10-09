/*
 * An isolated offline copy. This worker is registered with scope /offline/.
 * The installer owns downloading, verification, progress and retry. A completed
 * copy becomes active only after every manifest entry has been verified again.
 */
'use strict';

const CACHE_PREFIX = 'guolicheng-offline-';
const META_CACHE = 'guolicheng-offline-meta';
const MANIFEST_PATH = '/offline/assets.json';
const READY_PATH = '/offline/ready.json';
const ACTIVE_PATH = '/offline/active.json';
const INSTALLER_PATHS = new Set([
  '/offline/index.html', '/offline/installer.js', '/offline/installer.css'
]);
const PINNED_NAVIGATIONS = new Set(['/offline/play.html','/offline/artist.html']);
const ORIGIN = self.location.origin;
let activeCopy = null;
let loadingActive = null;
let activationQueue = Promise.resolve();

function absolute(pathname) {
  return new URL(pathname, ORIGIN).href;
}

function validVersion(value) {
  return typeof value === 'string' && /^[a-f0-9]{16}$/.test(value);
}

function manifestFiles(data) {
  if (!data || !validVersion(data.version) || !Array.isArray(data.files) ||
      !data.files.length || !Number.isSafeInteger(data.totalBytes) || data.totalBytes < 0) {
    throw new Error('离线资源清单不完整，请重新检查更新。');
  }
  const paths = new Set();
  let bytes = 0;
  const files = data.files.map(file => {
    if (!file || typeof file.url !== 'string' || !file.url.startsWith('/') ||
        file.url.startsWith('//') || !Number.isSafeInteger(file.bytes) || file.bytes < 0 ||
        !/^[a-f0-9]{64}$/.test(file.sha256 || '')) {
      throw new Error('离线资源清单格式不正确。');
    }
    const url = new URL(file.url, ORIGIN);
    if (url.origin !== ORIGIN || url.pathname !== file.url || url.search || url.hash ||
        [MANIFEST_PATH, READY_PATH, ACTIVE_PATH, '/offline/sw.js'].includes(file.url) ||
        paths.has(file.url)) {
      throw new Error('离线资源地址不正确或重复。');
    }
    paths.add(file.url);
    bytes += file.bytes;
    if (!Number.isSafeInteger(bytes)) throw new Error('离线资源大小不正确。');
    return {url: file.url, bytes: file.bytes, sha256: file.sha256};
  });
  if (bytes !== data.totalBytes) throw new Error('离线资源大小与清单不一致。');
  for (const required of ['/offline/index.html', '/offline/play.html',
    '/offline/installer.js', '/offline/installer.css']) {
    if (!paths.has(required)) throw new Error('离线安装页面缺少必要文件。');
  }
  return files;
}

function copyState(data, files) {
  return {
    version: data.version,
    totalFiles: files.length,
    totalBytes: data.totalBytes,
    files,
    byPath: new Map(files.map(file => [file.url, file]))
  };
}

async function currentCopy() {
  if (activeCopy) return activeCopy;
  if (!loadingActive) {
    loadingActive = (async () => {
      try {
        const response = await (await caches.open(META_CACHE)).match(absolute(ACTIVE_PATH));
        if (!response || !response.ok) return null;
        const data = await response.json();
        const files = manifestFiles(data);
        if (data.totalFiles !== files.length ||
            !(await caches.keys()).includes(CACHE_PREFIX + data.version)) return null;
        activeCopy = copyState(data, files);
        return activeCopy;
      } catch (_) {
        // A missing/evicted/corrupt copy is reported as unavailable; never delete
        // the user's other versions or saved drawings/music/learning progress.
        return null;
      }
    })();
  }
  return loadingActive;
}

async function copyAvailable(copy) {
  if (!copy) return false;
  try {
    const name = CACHE_PREFIX + copy.version;
    if (!(await caches.keys()).includes(name)) return false;
    const cache = await caches.open(name);
    const keys = new Set((await cache.keys()).map(request => request.url));
    if (!copy.files.every(file => keys.has(absolute(file.url)))) return false;
    const response = await cache.match(absolute(READY_PATH));
    if (!response || !response.ok) return false;
    const ready = await response.json();
    return ready.version === copy.version && ready.totalFiles === copy.totalFiles &&
      ready.totalBytes === copy.totalBytes;
  } catch (_) {
    return false;
  }
}

async function sha256(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyFiles(cache, files) {
  // Bound memory use while checking large voice libraries on a tablet.
  let index = 0;
  async function checkNext() {
    while (index < files.length) {
      const file = files[index++];
      const response = await cache.match(absolute(file.url));
      if (!response || !response.ok || response.type === 'opaque') {
        throw new Error('离线文件还没下载齐：' + file.url);
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength !== file.bytes || await sha256(buffer) !== file.sha256) {
        throw new Error('离线文件校验未通过，请重新下载：' + file.url);
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(4, files.length)}, checkNext));
}

async function activateVersion(version) {
  if (!validVersion(version)) throw new Error('离线版本编号不正确。');
  const response = await fetch(absolute(MANIFEST_PATH), {cache: 'no-store'});
  if (!response.ok) throw new Error('暂时无法检查离线版本，请连网后重试。');
  const data = await response.json();
  if (data.version !== version) throw new Error('内容已更新，请重新检查最新离线版本。');
  const files = manifestFiles(data);
  const cacheName = CACHE_PREFIX + version;
  if (!(await caches.keys()).includes(cacheName)) throw new Error('离线文件还没下载。');
  const cache = await caches.open(cacheName);
  const readyResponse = await cache.match(absolute(READY_PATH));
  if (!readyResponse || !readyResponse.ok) throw new Error('离线下载尚未完成。');
  const ready = await readyResponse.json();
  if (ready.version !== version || ready.totalFiles !== files.length ||
      ready.totalBytes !== data.totalBytes) throw new Error('离线下载记录与版本不一致。');
  await verifyFiles(cache, files);
  const record = {version, totalFiles: files.length, totalBytes: data.totalBytes,
    files, activatedAt: new Date().toISOString()};
  // Commit persistent metadata before switching the in-memory version. Old
  // ready caches are kept; a failed update cannot replace the current copy.
  const meta = await caches.open(META_CACHE);
  await meta.put(absolute(ACTIVE_PATH), new Response(JSON.stringify(record), {
    headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'}
  }));
  activeCopy = copyState(record, files);
  loadingActive = Promise.resolve(activeCopy);
  return {ok: true, version, activeVersion: version,
    totalFiles: files.length, totalBytes: data.totalBytes, ready: true};
}

function reply(event, result, type) {
  const payload = {...result, type, requestId: event.data && event.data.requestId};
  if (event.ports && event.ports[0]) event.ports[0].postMessage(payload);
  else if (event.source && event.source.postMessage) event.source.postMessage(payload);
}

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'STATUS') {
    event.waitUntil((async () => {
      const copy = await currentCopy();
      reply(event, {ok: true, ready: await copyAvailable(copy), activeVersion: copy ? copy.version : null,
        version: copy ? copy.version : null, totalFiles: copy ? copy.totalFiles : 0,
        totalBytes: copy ? copy.totalBytes : 0}, 'STATUS_RESULT');
    })());
  } else if (data.type === 'ACTIVATE_VERSION') {
    const operation = activationQueue.then(() => activateVersion(data.version));
    activationQueue = operation.catch(() => {});
    event.waitUntil(operation.then(result => reply(event, result, 'ACTIVATE_VERSION_RESULT'))
      .catch(async error => {
        const copy = await currentCopy();
        reply(event, {ok: false, error: error.message || '离线版本检查失败。',
          activeVersion: copy ? copy.version : null}, 'ACTIVATE_VERSION_RESULT');
      }));
  }
});

function cachePath(url, navigation) {
  if (navigation && (PINNED_NAVIGATIONS.has(url.pathname) ||
      url.pathname === '/offline/' || url.pathname === '/offline/index.html')) {
    return url.pathname === '/offline/' ? '/offline/index.html' : url.pathname;
  }
  if (!url.search) return url.pathname;
  const entries = Array.from(url.searchParams.entries());
  if (entries.length === 1 && entries[0][0] === 'v' &&
      /^[a-zA-Z0-9._-]{1,64}$/.test(entries[0][1])) return url.pathname;
  return url.pathname + url.search;
}

async function fromOfflineClient(event) {
  if (event.request.mode === 'navigate') {
    return new URL(event.request.url).pathname.startsWith('/offline/');
  }
  if (!event.clientId) return false;
  const client = await self.clients.get(event.clientId);
  if (!client || !client.url) return false;
  const url = new URL(client.url);
  return url.origin === ORIGIN && url.pathname.startsWith('/offline/');
}

function missingResponse(navigation) {
  const message = '这份离线内容暂时不完整。请连网打开离线安装页面，重新检查并下载。';
  const body = navigation ? '<!doctype html><html lang="zh-CN"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>离线内容需要检查</title>' +
    '<body style="font:20px system-ui;padding:28px;line-height:1.7"><h1>先把小乐园下载完整</h1>' +
    '<p>' + message + '</p><a href="/offline/">回到离线安装页面</a></body></html>' : message;
  return new Response(body, {status: 503, headers: {
    'Content-Type': navigation ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Offline-Missing': '1'
  }});
}

function invalidRange(size) {
  return new Response(null, {status: 416, statusText: 'Range Not Satisfiable', headers: {
    'Content-Range': 'bytes */' + size, 'Accept-Ranges': 'bytes', 'Content-Length': '0'
  }});
}

async function audioResponse(response, range, size) {
  const headers = new Headers(response.headers);
  headers.delete('Content-Encoding');
  headers.set('Accept-Ranges', 'bytes');
  if (!range) {
    headers.set('Content-Length', String(size));
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match || (!match[1] && !match[2]) || size < 1) return invalidRange(size);
  let start, end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return invalidRange(size);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
        start >= size || end < start) return invalidRange(size);
    end = Math.min(end, size - 1);
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== size) return missingResponse(false);
  headers.set('Content-Type', headers.get('Content-Type') || 'audio/mpeg');
  headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + size);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(buffer.slice(start, end + 1), {status: 206,
    statusText: 'Partial Content', headers});
}

async function serve(event, url) {
  if (!await fromOfflineClient(event)) return fetch(event.request);
  // Installer checks/downloads explicitly request fresh bodies. Do not give a
  // new release an old cached file merely because both versions use this path.
  if (event.request.cache === 'no-store') return fetch(event.request);
  const navigation = event.request.mode === 'navigate';
  const path = cachePath(url, navigation);
  const copy = await currentCopy();
  const file = copy && copy.byPath.get(path);
  const cache = copy && file ? await caches.open(CACHE_PREFIX + copy.version) : null;
  const cached = cache ? await cache.match(absolute(path)) : null;
  if (INSTALLER_PATHS.has(path)) {
    try {
      const online = await fetch(event.request, {cache: 'no-store'});
      if (online.ok) return online;
      if (cached && cached.ok) return cached;
      return online;
    } catch (_) {
      return cached && cached.ok ? cached : missingResponse(navigation);
    }
  }
  if (file) {
    if (!cached || !cached.ok) return missingResponse(navigation);
    return file.url.toLowerCase().endsWith('.mp3') ?
      audioResponse(cached, event.request.headers.get('Range'), file.bytes) : cached;
  }
  if (navigation && PINNED_NAVIGATIONS.has(url.pathname)) return missingResponse(true);
  // Unknown requests stay online. Never cache errors or intercept external video.
  return fetch(event.request);
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== ORIGIN ||
      (event.request.mode === 'navigate' && !url.pathname.startsWith('/offline/'))) return;
  event.respondWith(serve(event, url));
});
