// Preserve classic script order and public onclick names while cutting startup requests.
// Run: node build-web.cjs --esbuild /path/to/node_modules/esbuild
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const root = __dirname;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const argument = process.argv.indexOf('--esbuild');
const esbuild = require(argument >= 0 ? path.resolve(process.argv[argument + 1]) : 'esbuild');
const scripts = [
  'books.js', 'books-extra.js', 'books-new-adventures.js', 'story-art-map.js',
  'books-tablet-stories.js', 'courses.js', 'voice-map.js', 'modern-voice-map.js',
  'challenge-voice-map.js', 'video-voice-map.js', 'recognition-data.js', 'recognition.js',
  'kids-new-games.js', 'kids-challenge-games.js', 'kids-videos-data.js',
  'kids-home.js', 'creative-voice-map.js', 'kids-art-studio.js',
  'kids-music-studio.js', 'kids-writing-data.js', 'kids-writing.js',
  'writing-voice-map.js', 'tablet-story-voice-map.js', 'kid.js'
];
const styles = [
  'kid.css', 'recognition.css', 'kids-new-games.css', 'glass-ui.css',
  'kids-home.css', 'kids-challenge-games.css', 'kids-art-studio.css',
  'kids-music-studio.css', 'kids-writing.css', 'tablet-ui.css'
];
const destination = path.join(root, 'app-assets');
fs.mkdirSync(destination, { recursive: true });
function bundle(files, extension) {
  const inputs = files.map(file => {
    const contents = fs.readFileSync(path.join(root, file));
    return { file, bytes: contents.length, sha256: sha(contents) };
  });
  const source = files.map(file => fs.readFileSync(path.join(root, file), 'utf8'))
    .join(extension === 'js' ? '\n;\n' : '\n');
  const output = esbuild.transformSync(source, {
    loader: extension, target: ['es2020'], minifyWhitespace: true,
    minifySyntax: true, minifyIdentifiers: false, legalComments: 'none',
    charset: 'utf8'
  }).code;
  const contents = Buffer.from(output);
  const file = `app-${sha(contents).slice(0, 16)}.${extension}`;
  fs.writeFileSync(path.join(destination, file), contents);
  return { file: `app-assets/${file}`, sha256: sha(contents), bytes: contents.length,
    gzip_bytes: zlib.gzipSync(contents).length, inputs };
}
const js = bundle(scripts, 'js');
const css = bundle(styles, 'css');
const manifest = { format: 1, js, css };
fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/  <link rel="stylesheet"[^>]*>\n/g, '');
html = html.replace('  <title>', `  <link rel="stylesheet" href="${css.file}">\n  <title>`);
html = html.replace(/  <script[^>]*src="[^"]+"[^>]*><\/script>\n/g, '');
html = html.replace('</body>', `  <script defer src="${js.file}" onerror="document.getElementById('startupMessage').textContent='小乐园还没有打开，请再试一次';document.getElementById('startupRetry').hidden=false"></script>\n</body>`);
fs.writeFileSync(path.join(root, 'index.html'), html);
// Only remove reproducible bundle outputs owned by this builder.
for (const file of fs.readdirSync(destination)) {
  if (/^app-[a-f0-9]{16}\.(js|css)$/.test(file) && ![path.basename(js.file), path.basename(css.file)].includes(file)) {
    fs.unlinkSync(path.join(destination, file));
  }
}
console.log(JSON.stringify({ js: js.file, css: css.file,
  startup_asset_requests: 2, gzip_bytes: js.gzip_bytes + css.gzip_bytes }));
