const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sha256, localPath, loadModels, collectRuntimeAssets, cloneMainHTML } = require('../build-offline.cjs');
const root = path.resolve(__dirname, '..');

test('offline assets are resolved from current story and effective voice data', () => {
  const result = collectRuntimeAssets(root);
  const models = loadModels(root);
  assert.equal(result.books, models.BOOKS.length);
  assert.equal(result.pages, models.BOOKS.reduce((sum, book) => sum + book.pages.length, 0));
  assert.equal(result.voiceMappings, Object.keys(models.VOICE_MAP).length);
  assert.equal(result.modules.narration.files, new Set(Object.values(models.VOICE_MAP).map(localPath)).size);
  assert.equal(new Set(result.files).size, result.files.length);
  assert.deepEqual(result.files, [...result.files].sort());
  for (const book of models.BOOKS) {
    if (!book.reillustrated) continue;
    assert.ok(result.files.includes(localPath(book.cover)), book.cover);
    for (const page of book.pages) assert.ok(result.files.includes(localPath(page.img)), page.img);
  }
  for (const directory of ['assets', 'img/coloring', 'princess-assets', 'princess-voices']) {
    for (const file of fs.readdirSync(path.join(root, directory), { recursive: true })) {
      const absolute = path.join(root, directory, file);
      if (!fs.statSync(absolute).isFile() || !/\.(?:webp|svg|png|html|js|css|mp3)$/.test(file)) continue;
      assert.ok(result.files.includes(`${directory}/${file}`.split(path.sep).join('/')), file);
    }
  }
  assert.ok(!result.files.some(file => file.startsWith('arcade/')));
  assert.ok(result.files.includes('img/dino/dino_01/page1.webp'));
  assert.ok(!result.files.some(file => file.startsWith('audio/') || file.startsWith('voice-v3/') || file.endsWith('.py') || file.endsWith('generation-cache.json')));
});

test('main offline clone retains root assets and points to separate installation manifest', () => {
  const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const clone = cloneMainHTML(source);
  assert.match(clone, /<base href="\/">/);
  assert.match(clone, /rel="manifest" href="\/offline\/manifest\.webmanifest"/);
  assert.match(clone, /src="app-assets\/app-[a-f0-9]{16}\.js"/);
  assert.match(clone, /href="app-assets\/app-[a-f0-9]{16}\.css"/);
  assert.throws(() => cloneMainHTML('<head><base href="/"></head>'));
});

test('offline paths ignore known cache query parameters and reject remote resources', () => {
  assert.equal(localPath('voice-writing-v1/example.mp3?v=1'), 'voice-writing-v1/example.mp3');
  assert.equal(localPath('/assets/example.svg?v=2'), 'assets/example.svg');
  assert.throws(() => localPath('https://tv.cctv.com/video.mp4'));
  assert.throws(() => localPath('//remote.example/image.png'));
});

test('generated offline manifest is complete, deterministic and excludes self-references', t => {
  const file = path.join(root, 'offline/assets.json');
  if (!fs.existsSync(file)) { t.skip('Run build-offline.cjs after installer files are ready'); return; }
  const result = JSON.parse(fs.readFileSync(file));
  assert.equal(result.version, sha256(JSON.stringify(result.files)).slice(0, 16));
  assert.equal(result.totalBytes, result.files.reduce((sum, record) => sum + record.bytes, 0));
  assert.equal(new Set(result.files.map(record => record.url)).size, result.files.length);
  assert.deepEqual(result.files.map(record => record.url), result.files.map(record => record.url).sort());
  for (const record of result.files) {
    const contents = fs.readFileSync(path.join(root, record.url.slice(1)));
    assert.equal(contents.length, record.bytes, record.url);
    assert.equal(sha256(contents), record.sha256, record.url);
  }
  assert.ok(result.files.some(record => record.url === '/offline/index.html'));
  assert.ok(result.files.some(record => record.url === '/downloads/ipad-offline-qr.png'));
  assert.ok(!result.files.some(record => record.url.startsWith('/arcade/') || record.url.startsWith('/offline/arcade/')));
  assert.ok(!result.files.some(record => ['/offline/sw.js', '/offline/assets.json'].includes(record.url)));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'offline/manifest.webmanifest')));
  assert.equal(manifest.start_url, './index.html');
  assert.equal(manifest.scope, '/offline/');
  assert.equal(manifest.id, '/offline/');
  assert.equal(manifest.orientation, 'any');
});
