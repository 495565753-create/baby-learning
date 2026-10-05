// Build a separate, versioned offline catalogue after build-web.cjs.
// No backup-directory paths or generation-time timestamps enter the output.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const modelInputs = [
  'books.js', 'books-extra.js', 'books-new-adventures.js', 'story-art-map.js',
  'books-tablet-stories.js', 'voice-map.js', 'modern-voice-map.js',
  'challenge-voice-map.js', 'video-voice-map.js', 'creative-voice-map.js',
  'writing-voice-map.js', 'tablet-story-voice-map.js'
];

function assertFile(root, relative) {
  if (typeof relative !== 'string' || relative.startsWith('/') || relative.includes('\\') || relative.split('/').some(part => part === '..' || !part)) {
    throw new Error(`Invalid local asset path: ${relative}`);
  }
  const file = path.join(root, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Missing offline asset: ${relative}`);
  const resolved = fs.realpathSync(file);
  if (!resolved.startsWith(fs.realpathSync(root) + path.sep)) throw new Error(`Asset escapes project: ${relative}`);
  return file;
}

function localPath(raw) {
  const value = new URL(raw, 'https://offline.invalid/');
  if (value.origin !== 'https://offline.invalid' || value.username || value.password) throw new Error(`External asset cannot be bundled offline: ${raw}`);
  return decodeURIComponent(value.pathname).replace(/^\//, '');
}

function loadModels(root) {
  const context = { console };
  context.window = context;
  vm.createContext(context);
  for (const file of modelInputs) vm.runInContext(fs.readFileSync(assertFile(root, file), 'utf8'), context, { filename: file, timeout: 5000 });
  if (!Array.isArray(context.BOOKS) || !context.VOICE_MAP || typeof context.VOICE_MAP !== 'object') throw new Error('Story or voice data did not initialise');
  return context;
}

function walkMedia(root, folder, extensions) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && extensions.has(path.extname(entry.name))) files.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  }
  visit(path.join(root, folder));
  return files;
}

function validateBundle(root) {
  const bundle = JSON.parse(fs.readFileSync(assertFile(root, 'app-assets/manifest.json'), 'utf8'));
  for (const record of [bundle.js, bundle.css]) {
    if (!record || !/^app-assets\/app-[a-f0-9]{16}\.(js|css)$/.test(record.file)) throw new Error('Content-hashed browser bundle is required');
    if (sha256(fs.readFileSync(assertFile(root, record.file))) !== record.sha256) throw new Error(`Browser bundle hash differs: ${record.file}`);
    for (const input of record.inputs) {
      if (sha256(fs.readFileSync(assertFile(root, input.file))) !== input.sha256) throw new Error(`Browser bundle is stale; run build-web.cjs first: ${input.file}`);
    }
  }
  return bundle;
}

function collectRuntimeAssets(root) {
  const model = loadModels(root);
  const bundle = validateBundle(root);
  const groups = new Map();
  function add(file, group) {
    const relative = localPath(file);
    assertFile(root, relative);
    if (!groups.has(relative)) groups.set(relative, new Set());
    groups.get(relative).add(group);
  }
  for (const book of model.BOOKS) {
    if (book.reillustrated) {
      if (!book.cover || book.pages.some(page => !page.img)) throw new Error(`Reillustrated story is incomplete: ${book.id}`);
      add(book.cover, 'stories');
      book.pages.forEach(page => add(page.img, 'stories'));
    } else if (!book.artEmoji) {
      if (book.art || ['dino_01', 'dino_02'].includes(book.id) || ['peppa', 'paw'].includes(book.group)) {
        add(book.art || `art/${book.id}.${['peppa', 'paw'].includes(book.group) ? 'webp' : 'png'}`, 'stories');
      } else {
        const prefix = String(book.img_prefix || '').replace(/\/?$/, '/');
        add(book.pages[0]?.img || `${prefix}cover.webp`, 'stories');
        book.pages.forEach((page, index) => { if (!page.emoji) add(page.img || `${prefix}page${index + 1}.webp`, 'stories'); });
      }
    }
  }
  // VOICE_MAP is the current effective map, after later maps replace older voices.
  // Legacy page.audio fields are not consumed by the current story player.
  Object.values(model.VOICE_MAP).forEach(file => add(file, 'narration'));
  for (const file of walkMedia(root, 'assets', new Set(['.webp', '.svg']))) add(file, 'recognition');
  for (const file of walkMedia(root, 'img/coloring', new Set(['.png']))) add(file, 'coloring');
  for (const file of walkMedia(root, 'arcade', new Set(['.html', '.js', '.css', '.svg', '.mp3']))) add(file, 'arcade');
  for (const file of ['arcade/assets/fluent/LICENSE', 'arcade/voice/NOTICE.md']) add(file, 'licences');
  for (const file of ['img/icon-180.png', 'img/icon-512.png', 'img/dino/dino_01/page1.webp', bundle.js.file, bundle.css.file]) add(file, 'shell');
  const files = [...groups.keys()].sort();
  const modules = {};
  for (const [file, names] of groups) for (const name of names) {
    modules[name] ||= { files: 0, bytes: 0 };
    modules[name].files++;
    modules[name].bytes += fs.statSync(path.join(root, file)).size;
  }
  return { files, modules, books: model.BOOKS.length, pages: model.BOOKS.reduce((sum, book) => sum + book.pages.length, 0), voiceMappings: Object.keys(model.VOICE_MAP).length };
}

function cloneMainHTML(source) {
  if (/<base\b/i.test(source)) throw new Error('Main HTML already has a base URL; review offline clone');
  return source.replace(/<head>/i, '<head>\n  <base href="/">')
    .replace(/(<link\b[^>]*\brel=["']manifest["'][^>]*\bhref=)["'][^"']*["']/i, '$1"/offline/manifest.webmanifest"');
}

function cloneArcadeHTML(source, name = 'index') {
  if (!['index', 'kids', 'levels'].includes(name)) throw new Error(`Unknown offline arcade page: ${name}`);
  if (/<base\b/i.test(source)) throw new Error('Arcade HTML already has a base URL; review offline clone');
  let output = source.replace(/<head>/i, '<head>\n  <base href="/arcade/">');
  output = output.replace(/(<a\b[^>]*\bhref=)(["'])([^"']*)(\2)/gi, (all, prefix, quote, href) => {
    if (!href || /^(?:https?:|mailto:|tel:)/i.test(href)) return all;
    // A fragment-only href would otherwise resolve against /arcade/, leaving
    // the controlled offline page because this clone has a different base URL.
    if (href.startsWith('#')) return `${prefix}${quote}/offline/arcade/${name}.html${href}${quote}`;
    const target = new URL(href, 'https://offline.invalid/arcade/');
    if (target.origin !== 'https://offline.invalid') return all;
    let pathname = target.pathname;
    if (pathname === '/index.html' || pathname === '/') pathname = '/offline/play.html';
    else if (/^\/arcade\/(?:index|kids|levels)\.html$/.test(pathname)) pathname = '/offline' + pathname;
    else return all;
    return `${prefix}${quote}${pathname}${target.search}${target.hash}${quote}`;
  });
  return output;
}

function buildOffline(root = __dirname) {
  const runtime = collectRuntimeAssets(root);
  const offline = path.join(root, 'offline');
  fs.mkdirSync(path.join(offline, 'arcade'), { recursive: true });
  fs.writeFileSync(path.join(offline, 'play.html'), cloneMainHTML(fs.readFileSync(assertFile(root, 'index.html'), 'utf8')));
  for (const name of ['index', 'kids', 'levels']) fs.writeFileSync(path.join(offline, 'arcade', `${name}.html`), cloneArcadeHTML(fs.readFileSync(assertFile(root, `arcade/${name}.html`), 'utf8'), name));
  const manifest = {
    id: '/offline/', name: '果粒橙离线学习乐园', short_name: '果粒橙离线乐园',
    description: '完整下载后，故事、认知、课堂和小游戏可在没有网络时使用。外部视频需联网。',
    lang: 'zh-CN', start_url: './index.html', scope: '/offline/', display: 'standalone',
    orientation: 'any', background_color: '#eef4fb', theme_color: '#eef4fb',
    icons: [
      { src: '/img/icon-180.png', sizes: '180x180', type: 'image/png' },
      { src: '/img/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  };
  fs.writeFileSync(path.join(offline, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
  const files = new Set(runtime.files);
  for (const file of ['offline/index.html', 'offline/installer.js', 'offline/installer.css', 'offline/manifest.webmanifest', 'offline/play.html', 'offline/arcade/index.html', 'offline/arcade/kids.html', 'offline/arcade/levels.html']) {
    assertFile(root, file);
    files.add(file);
  }
  const records = [...files].sort().map(file => {
    const contents = fs.readFileSync(assertFile(root, file));
    return { url: '/' + file, bytes: contents.length, sha256: sha256(contents) };
  });
  const result = { version: sha256(JSON.stringify(records)).slice(0, 16), totalBytes: records.reduce((sum, file) => sum + file.bytes, 0), files: records };
  fs.writeFileSync(path.join(offline, 'assets.json'), JSON.stringify(result, null, 2) + '\n');
  return { version: result.version, totalBytes: result.totalBytes, files: records.length, books: runtime.books, pages: runtime.pages, voiceMappings: runtime.voiceMappings, modules: runtime.modules };
}

module.exports = { sha256, localPath, loadModels, validateBundle, collectRuntimeAssets, cloneMainHTML, cloneArcadeHTML, buildOffline };
if (require.main === module) console.log(JSON.stringify(buildOffline()));
