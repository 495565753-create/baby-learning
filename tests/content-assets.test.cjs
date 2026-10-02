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
for (const file of ['books.js', 'books-extra.js', 'story-art-map.js', 'recognition-data.js', 'voice-map.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
}
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

test('每张认知卡、找图题和鼓励语都有对应的新版录音', () => {
  const data = context.RECOGNITION;
  const manifest = readJson('voice-recognition-v1/manifest.json');
  const texts = data.categories.flatMap(category => category.items.flatMap(item => [item.text, `请找出，${item.word}。`]));
  texts.push(...data.praise.map(p => p.text), '差一点，再看一看。', '找对啦！');
  assert.equal(texts.length, 490);
  for (const text of texts) {
    assert.ok(manifest.files[text], text);
    assert.equal(context.VOICE_MAP[`zh|${text}`], `${manifest.files[text].file}?v=1`, text);
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

test('20类认知图集和轻量分类封面全部可读取', () => {
  const manifest = readJson('assets/recognition-v1/manifest.json');
  assert.equal(manifest.count, context.RECOGNITION.categories.length);
  for (const category of context.RECOGNITION.categories) {
    const record = manifest.files.find(x => x.category === category.id);
    assert.ok(record, category.id);
    for (const file of [record.file, record.cover]) {
      const bytes = fs.readFileSync(path.join(root, file));
      assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', file);
    }
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, record.file))).digest('hex'), record.sha256);
  }
});
