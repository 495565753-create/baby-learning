const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const context = {};
context.window = context;
vm.createContext(context);
for (const file of ['books.js', 'books-extra.js', 'story-art-map.js', 'recognition-data.js', 'voice-map.js', 'modern-voice-map.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
}
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

test('所有固定配音映射都指向可读取的音频文件，不能留下失效旧链接', () => {
  for (const [text, file] of Object.entries(context.VOICE_MAP)) {
    assert.equal(typeof file, 'string', text);
    const asset = path.join(root, file.split('?')[0]);
    assert.ok(fs.existsSync(asset), `${text}: ${file}`);
    assert.ok(fs.statSync(asset).size > 1000, file);
  }
});

test('538条认知正文、找图题和鼓励语分别完整对应旧库和独立现代录音', () => {
  const data = context.RECOGNITION;
  const legacy = readJson('voice-recognition-v1/manifest.json');
  const modern = readJson('voice-modern-v1/manifest.json');
  const cardTexts = categories => categories.flatMap(category => category.items.flatMap(item => [item.text, `请找出，${item.word}。`]));
  const legacyTexts = cardTexts(data.categories.filter(category => !category.modern));
  legacyTexts.push(...data.praise.map(p => p.text), '差一点，再看一看。', '找对啦！');
  const modernTexts = cardTexts(data.categories.filter(category => category.modern));
  const all = [...legacyTexts, ...modernTexts];
  assert.equal(legacyTexts.length, 490);
  assert.equal(modernTexts.length, 48);
  assert.equal(all.length, 538);
  assert.equal(new Set(all).size, 538, '两个配音批次不得有重复正文');
  assert.deepEqual(new Set(Object.keys(legacy.files)), new Set(legacyTexts), '旧490条不得丢失或混入新录音');
  assert.equal(modern.card_count, 24);
  assert.equal(modern.text_count, 53, '48条新卡正文/问题及5条首页提示');
  assert.equal(Object.keys(modern.files).length, 53);
  for (const [texts, manifest, folder] of [[legacyTexts, legacy, 'voice-recognition-v1/'], [modernTexts, modern, 'voice-modern-v1/']]) {
    for (const text of texts) {
      const record = manifest.files[text];
      assert.ok(record, text);
      assert.equal(record.spoken, text);
      assert.ok(record.file.startsWith(folder), `${text}: ${record.file}`);
      assert.equal(context.VOICE_MAP[`zh|${text}`], `${record.file}?v=1`, text);
      assert.ok(fs.statSync(path.join(root, record.file)).size > 1000, record.file);
    }
  }
  const modernOnly = new Set(modernTexts);
  const helpers = Object.keys(modern.files).filter(text => !modernOnly.has(text));
  assert.equal(helpers.length, 5);
  for (const text of helpers) {
    const record = modern.files[text];
    assert.equal(context.VOICE_MAP[`zh|${text}`], `${record.file}?v=1`, text);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, record.file))).digest('hex'), record.sha256);
  }
});

test('所有故事正文都有录音，新录音文件可读取且映射保留语言前缀', () => {
  for (const book of context.BOOKS) {
    for (const page of book.pages) assert.ok(context.VOICE_MAP[`zh|${page.text}`], `${book.id}: ${page.text}`);
  }
  for (const folder of ['voice-recognition-v1', 'voice-extra-story-v1', 'voice-story-safety-v1']) {
    const manifest = readJson(`${folder}/manifest.json`);
    assert.equal(manifest.voice, 'zh-CN-XiaoxiaoNeural');
    assert.equal(Object.keys(manifest.files).length, manifest.text_count);
    for (const [text, record] of Object.entries(manifest.files)) {
      assert.equal(record.spoken, text);
      assert.equal(context.VOICE_MAP[`zh|${text}`], `${record.file}?v=1`, text);
      assert.ok(fs.statSync(path.join(root, record.file)).size > 1000, record.file);
    }
  }
});

test('94本故事每页使用新插图，图像清单与真实文件一致', () => {
  const manifest = readJson('art/story-refresh-v1/manifest.json');
  assert.equal(context.BOOKS.length, 94);
  assert.equal(manifest.book_count, context.BOOKS.length);
  const expected = new Set();
  for (const book of context.BOOKS) {
    assert.equal(book.reillustrated, true, book.id);
    assert.equal(book.cover, book.pages[0].img, book.id);
    for (const page of book.pages) expected.add(page.img);
  }
  assert.equal(expected.size, 454);
  assert.equal(manifest.page_count, expected.size);
  for (const record of manifest.files) {
    assert.ok(expected.delete(record.file), record.file);
    const bytes = fs.readFileSync(path.join(root, record.file));
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), record.sha256, record.file);
  }
  assert.equal(expected.size, 0);
});

test('原20类图集完整，新3类24张独立SVG与清单真实文件一致', () => {
  const legacyCategories = context.RECOGNITION.categories.filter(category => !category.modern);
  const modernCategories = context.RECOGNITION.categories.filter(category => category.modern);
  assert.equal(legacyCategories.length, 20);
  assert.equal(modernCategories.length, 3);
  const manifest = readJson('assets/recognition-v1/manifest.json');
  assert.equal(manifest.count, legacyCategories.length);
  assert.deepEqual(new Set(manifest.files.map(record => record.category)), new Set(legacyCategories.map(category => category.id)), '旧图集目录与原20分类一一匹配');
  for (const category of legacyCategories) {
    assert.equal(category.items.length, 12, category.id);
    const record = manifest.files.find(x => x.category === category.id);
    assert.ok(record, category.id);
    for (const file of [record.file, record.cover]) {
      const bytes = fs.readFileSync(path.join(root, file));
      assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', file);
    }
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, record.file))).digest('hex'), record.sha256);
  }
  const newManifest = readJson('assets/recognition-modern-v1/manifest.json');
  assert.equal(newManifest.category_count, 3);
  assert.equal(newManifest.item_count, 24);
  assert.equal(newManifest.files.length, 24);
  const expected = new Map(modernCategories.flatMap(category => {
    assert.equal(category.items.length, 8, category.id);
    assert.equal(category.cover, category.items[0].image, category.id);
    return category.items.map(item => [item.image, {category:category.id, item:item.id, word:item.word}]);
  }));
  assert.equal(expected.size, 24, '每张现代卡使用自己的插图');
  for (const record of newManifest.files) {
    const source = expected.get(record.file);
    assert.ok(source, record.file);
    assert.deepEqual({category:record.category, item:record.item, word:record.word}, source);
    const bytes = fs.readFileSync(path.join(root, record.file));
    assert.match(bytes.toString(), /<svg[^>]*viewBox="0 0 360 360"/);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), record.sha256, record.file);
    assert.equal(bytes.length, record.bytes, record.file);
    expected.delete(record.file);
  }
  assert.equal(expected.size, 0, '现代图像清单不能漏卡');
});
