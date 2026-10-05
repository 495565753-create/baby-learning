/* Explicit, resumable download. Nothing large is fetched just by opening a page. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const cachePrefix = 'guolicheng-offline-';
  let manifest, registration, activeVersion = null, running = false, paused = false;
  let completed = 0, completedBytes = 0, locks = [];
  const mb = bytes => (bytes / 1000000).toFixed(1) + ' MB';
  const status = text => { $('downloadStatus').textContent = text; };
  const digest = async body => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', body)), byte => byte.toString(16).padStart(2, '0')).join('');
  const key = file => new URL(file.url, location.origin).href;
  function showEntryHelp(message) {
    // A weak connection may return the previous installer HTML with this newer script.
    const help = $('entryHelp'), description = $('entryMessage');
    if (help) help.hidden = false;
    if (description) description.textContent = message;
    $('downloadButton').hidden = true;
    $('downloadProgress').hidden = true;
    $('sizeInfo').textContent = '请从正式网页准备离线内容，下载好的旧版会保留。';
    status(help ? message : message + ' 正式入口：https://leyman.cn/offline/');
  }
  function withSetupTimeout(prepare) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('离线准备暂时没有完成。')), 15000);
      Promise.resolve().then(prepare).then(resolve, reject).finally(() => clearTimeout(timer));
    });
  }
  async function command(type, extra) {
    const worker = registration.active;
    if (!worker) throw new Error('离线功能还没准备好，请再试一次。');
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('内容检查暂时没有完成，请再试一次。')); }, 180000);
      channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
      worker.postMessage(Object.assign({ type }, extra), [channel.port2]);
    });
  }
  async function isValid(response, file) {
    if (!response || response.status !== 200) return false;
    const body = await response.arrayBuffer();
    return body.byteLength === file.bytes && await digest(body) === file.sha256;
  }
  function progress() {
    const percentage = Math.min(100, completedBytes / manifest.totalBytes * 100);
    $('downloadProgress').value = percentage;
    status(`已下载 ${mb(completedBytes)} / ${mb(manifest.totalBytes)} · ${completed} / ${manifest.files.length} 项（${Math.floor(percentage)}%）`);
  }
  async function unlock() {
    for (const item of locks) { try { await item.release(); } catch {} }
    locks = [];
  }
  async function keepAwake() {
    try { if (navigator.wakeLock) locks.push(await navigator.wakeLock.request('screen')); } catch {}
  }
  async function downloadFile(cache, file, previousCache) {
    if (await isValid(await cache.match(key(file)), file)) return;
    if (previousCache) {
      const previous = await previousCache.match(key(file));
      if (previous && await isValid(previous.clone(), file)) {
        await cache.put(key(file), previous);
        return;
      }
    }
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (paused) return;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 45000);
        try {
          const response = await fetch(key(file), { cache: 'no-store', signal: controller.signal });
          if (response.status !== 200) throw new Error('下载连接暂时中断。');
          if (!await isValid(response.clone(), file)) throw new Error('有一项内容需要重新下载。');
          await cache.put(key(file), response);
          return;
        } finally { clearTimeout(timer); }
      } catch (error) {
        lastError = error;
        if (error.name === 'QuotaExceededError') throw new Error('平板空间不足，请释放空间后继续下载。');
      }
    }
    throw lastError || new Error('下载没有完成，请继续下载。');
  }
  async function start() {
    if (running || !manifest) return;
    running = true; paused = false; completed = 0; completedBytes = 0;
    $('downloadProgress').value = 0;
    $('downloadButton').disabled = true; $('pauseButton').hidden = false; $('pauseButton').disabled = false;
    status('正在核对已下载内容，中断过也可以接着下载…');
    await keepAwake();
    try {
      try { await navigator.storage?.persist?.(); } catch {}
      const cache = await caches.open(cachePrefix + manifest.version);
      const previousCache = activeVersion && activeVersion !== manifest.version ? await caches.open(cachePrefix + activeVersion) : null;
      let next = 0, failure = null;
      const jobs = Array.from({ length: 4 }, async () => {
        while (!paused && !failure && next < manifest.files.length) {
          const file = manifest.files[next++];
          try {
            await downloadFile(cache, file, previousCache);
            if (paused) break;
            completed++; completedBytes += file.bytes; progress();
          } catch (error) { failure = error; }
        }
      });
      await Promise.all(jobs);
      if (failure) throw failure;
      if (paused) { status('已暂停。下载好的内容保留了，点“继续下载”就能接着来。'); return; }
      status('全部内容已下载，正在最后检查，请稍等…');
      const ready = { version: manifest.version, totalFiles: manifest.files.length, totalBytes: manifest.totalBytes };
      await cache.put(new URL('ready.json', location.href).href, new Response(JSON.stringify(ready), { headers: { 'Content-Type': 'application/json' } }));
      const result = await command('ACTIVATE_VERSION', { version: manifest.version });
      if (!result.ok) throw new Error('最后检查没有完成，已下载的内容保留了，请继续下载。');
      activeVersion = result.version;
      $('downloadProgress').value = 100; $('playButton').hidden = false;
      $('savedVersion').hidden = false; $('savedVersion').textContent = '这台设备已备好完整离线内容。';
      status('全部下载完成，可以离线玩了。');
      // Delete only older app-owned content after a complete new version is active.
      for (const name of await caches.keys()) {
        if (/^guolicheng-offline-[a-f0-9]{16}$/.test(name) && name !== cachePrefix + activeVersion) await caches.delete(name);
      }
    } catch (error) {
      const message = error?.name === 'QuotaExceededError' ? '平板空间不足，请释放空间后继续下载。' : error?.message || '下载暂时中断。';
      status(message + ' 已下载的内容会保留，请保持联网后继续。');
    } finally {
      running = false; $('pauseButton').hidden = true; $('downloadButton').disabled = false;
      $('downloadButton').textContent = activeVersion === manifest.version ? '重新检查离线内容' : '继续下载';
      await unlock();
    }
  }
  async function setup() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone) $('appleSteps').hidden = true;
    if (location.protocol === 'file:') {
      showEntryHelp('这是电脑里的本地文件。请点“打开正式下载入口”，或用 iPad 扫下面的二维码。');
      return;
    }
    if (!('serviceWorker' in navigator) || !('caches' in window) || !window.isSecureContext) {
      showEntryHelp('当前页面不能保存离线内容。请用 Safari 打开正式下载入口，添加到主屏幕后再下载。');
      return;
    }
    try {
      registration = await withSetupTimeout(async () => {
        await navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' });
        return navigator.serviceWorker.ready;
      });
      const previous = await command('STATUS');
      if (previous.ready) {
        activeVersion = previous.activeVersion || previous.version;
        $('playButton').hidden = false; $('savedVersion').hidden = false;
        $('savedVersion').textContent = '已有离线版，随时可以进入乐园。';
        $('sizeInfo').textContent = `已下载完整离线内容，约 ${mb(previous.totalBytes)}。外部视频仍需联网。`;
        $('downloadProgress').value = 100;
        status('离线内容已备好，可以开始玩。');
      }
      const response = await fetch('assets.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('暂时无法检查新版内容。');
      manifest = await response.json();
      if (!/^[a-f0-9]{16}$/.test(manifest.version) || !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.some(f => !f.url.startsWith('/') || f.url.startsWith('//') || f.url.includes('..') || !Number.isSafeInteger(f.bytes) || f.bytes < 0 || !/^[a-f0-9]{64}$/.test(f.sha256)) || manifest.files.reduce((n,f)=>n+f.bytes,0)!==manifest.totalBytes) throw new Error('离线内容清单需要重新检查。');
      $('sizeInfo').textContent = `完整内容约 ${mb(manifest.totalBytes)}。不包含外部网站视频。`;
      $('downloadButton').disabled = false;
      $('downloadButton').textContent = activeVersion === manifest.version ? '重新检查离线内容' : activeVersion ? '下载新版（旧版仍可玩）' : '下载全部，准备离线玩';
      if (activeVersion !== manifest.version) {
        const cache = await caches.open(cachePrefix + manifest.version);
        if ((await cache.keys()).length) { $('downloadButton').textContent = '继续下载'; status('发现上次下载的内容，可以继续。'); }
      }
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota) $('storageInfo').textContent = `建议至少留 ${mb(manifest.totalBytes * 2)} 可用空间，便于下载和以后更新。`;
      } catch {}
    } catch (error) {
      if (activeVersion) {
        $('downloadButton').textContent = '联网后可检查新版';
        status('当前没有联网，已下载的离线版仍然可以玩。');
      } else {
        showEntryHelp('离线准备暂时没有完成。请检查网络后点“重新准备”，也可以打开正式下载入口。');
        if ($('setupRetry')) $('setupRetry').hidden = false;
      }
    }
  }
  $('downloadButton').addEventListener('click', start);
  $('setupRetry')?.addEventListener('click', () => location.reload());
  $('pauseButton').addEventListener('click', () => { paused = true; $('pauseButton').disabled = true; status('正在暂停，下载好的内容会保留…'); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && running) keepAwake(); });
  setup();
})();
