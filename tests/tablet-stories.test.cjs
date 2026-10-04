const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const storySource = 'books-tablet-stories.js';
const artFolder = 'art/tablet-stories-v1/';
const voiceFolder = 'voice-tablet-stories-v1/';
const voiceMap = 'tablet-story-voice-map.js';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const chineseLength = text => (text.match(/\p{Script=Han}/gu) || []).length;

function load(context, file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
function library() {
  const context = {};
  context.window = context;
  vm.createContext(context);
  for (const file of ['books.js', 'books-extra.js', 'books-new-adventures.js', 'story-art-map.js']) load(context, file);
  return context;
}
const context = library();
const originalLibrary = JSON.stringify(context.BOOKS);
load(context, storySource);
const additions = Array.from(context.BOOKS_TABLET_STORIES);
const pages = additions.flatMap(book => Array.from(book.pages, (page, index) => ({ book, page, number: index + 1 })));

function assetBytes(file, folder) {
  assert.ok(file.startsWith(folder), `Asset must stay in its release folder: ${file}`);
  assert.equal(path.posix.normalize(file), file, `Non-canonical asset path: ${file}`);
  assert.ok(!file.includes('..') && !/[?#\\]/.test(file), `Invalid asset path: ${file}`);
  return fs.readFileSync(path.join(root, file));
}

// Read actual WebP dimensions so a stale manifest cannot pass with invented sizes.
function webpSize(bytes, file) {
  assert.ok(bytes.length >= 30, file);
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', file);
  assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', file);
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, `Truncated WebP: ${file}`);
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.subarray(offset, offset + 4).toString();
    const length = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    assert.ok(start + length <= bytes.length, `Truncated ${type} chunk: ${file}`);
    if (type === 'VP8X') {
      assert.ok(length >= 10, file);
      return [bytes.readUIntLE(start + 4, 3) + 1, bytes.readUIntLE(start + 7, 3) + 1];
    }
    if (type === 'VP8 ') {
      assert.ok(length >= 10, file);
      assert.deepEqual(Array.from(bytes.subarray(start + 3, start + 6)), [0x9d, 0x01, 0x2a], file);
      return [bytes.readUInt16LE(start + 6) & 0x3fff, bytes.readUInt16LE(start + 8) & 0x3fff];
    }
    if (type === 'VP8L') {
      assert.ok(length >= 5, file);
      assert.equal(bytes[start], 0x2f, file);
      const bits = bytes.readUInt32LE(start + 1);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    offset = start + length + (length % 2);
  }
  assert.fail(`WebP has no image frame: ${file}`);
}

test('four complete stories add two Peppa and two Paw adventures with substantial distinct pages', () => {
  assert.equal(additions.length, 4);
  assert.equal(context.BOOKS.length, 128);
  assert.equal(new Set(Array.from(context.BOOKS, book => book.id)).size, 128, 'Story IDs must be globally unique');
  assert.equal(new Set(Array.from(context.BOOKS, book => book.title)).size, 128, 'Story titles must be globally unique');
  for (const group of ['peppa', 'paw']) assert.equal(additions.filter(book => book.group === group).length, 2, group);
  assert.ok(additions.every(book => ['peppa', 'paw'].includes(book.group)), 'Unfinished series must not enter this release');
  assert.equal(new Set(pages.map(row => row.page.text)).size, 20, 'No duplicated or placeholder page text');
  for (const book of additions) {
    assert.match(book.id, /^tablet_story_(peppa|paw)_[a-z_]+$/);
    assert.equal(book.reillustrated, true, book.id);
    assert.equal(book.pages.length, 5, book.id);
    assert.equal(book.panels, 5, book.id);
    assert.equal(book.cover, `${artFolder}${book.id}/cover.webp`);
    assert.ok(Array.from(book.pages).reduce((sum, page) => sum + Array.from(page.text).length, 0) >= 400, `${book.id}: the whole story must contain at least 400 characters`);
    for (const [index, page] of Array.from(book.pages).entries()) {
      const count = Array.from(page.text).length;
      assert.ok(count >= 65 && count <= 120, `${book.id}, page ${index + 1}: ${count} characters`);
      assert.ok(chineseLength(page.text) >= 65, `${book.id}, page ${index + 1}: insufficient Chinese narration`);
      assert.equal(page.img, `${artFolder}${book.id}/page${index + 1}.webp`);
      assert.notEqual(page.img, book.cover, `${book.id}: cover must be independently illustrated`);
    }
  }
});

test('loading the story module twice preserves all prior books and never duplicates the library', () => {
  const previousBooks = Array.from(context.BOOKS).slice(0, 124);
  assert.equal(JSON.stringify(previousBooks), originalLibrary, 'Adding stories must not replace prior pages or art');
  const before = JSON.stringify(context.BOOKS);
  const references = Array.from(context.BOOKS);
  load(context, storySource);
  assert.equal(context.BOOKS.length, 128);
  assert.equal(JSON.stringify(context.BOOKS), before);
  for (let index = 0; index < references.length; index++) assert.equal(context.BOOKS[index], references[index], `Book reference ${index} changed`);
});

test('twenty story pictures and four independent covers match actual WebP dimensions, size and hashes', () => {
  const manifest = read(`${artFolder}manifest.json`);
  assert.equal(manifest.book_count, 4);
  assert.equal(manifest.page_count, 20);
  assert.equal(manifest.cover_count, 4);
  assert.equal(manifest.files.length, 24);
  assert.equal(manifest.tool, 'built-in image_gen');
  const expected = new Map();
  for (const book of additions) {
    expected.set(book.cover, { book: book.id, page: 'cover' });
    Array.from(book.pages).forEach((page, index) => expected.set(page.img, { book: book.id, page: index + 1 }));
  }
  assert.equal(expected.size, 24, 'Every page and cover must have a distinct image path');
  const uniqueHashes = new Set();
  for (const record of manifest.files) {
    const item = expected.get(record.file);
    assert.ok(item, `Unknown or duplicated image: ${record.file}`);
    assert.deepEqual({ book: record.book, page: record.page }, item);
    const bytes = assetBytes(record.file, artFolder);
    const size = webpSize(bytes, record.file);
    assert.deepEqual(size, record.size, record.file);
    assert.ok(size.every(value => value >= 430), `Tablet image too small: ${record.file}: ${size}`);
    assert.ok(bytes.length <= 250000, `Mobile image too large: ${record.file}: ${bytes.length} bytes`);
    assert.equal(digest(bytes), record.sha256, record.file);
    uniqueHashes.add(record.sha256);
    expected.delete(record.file);
  }
  assert.equal(expected.size, 0, 'No omitted page or cover');
  assert.equal(uniqueHashes.size, 24, 'The cover and all five pages must use different artwork');
});

test('all twenty current-source story pages have complete approved female recording assets', () => {
  const manifest = read(`${voiceFolder}manifest.json`);
  assert.equal(manifest.source, storySource);
  assert.equal(manifest.source_sha256, digest(fs.readFileSync(path.join(root, storySource))), 'Narration must match the current story source');
  assert.equal(manifest.generator, 'Microsoft Edge neural TTS');
  assert.equal(manifest.voice, 'zh-CN-XiaoxiaoNeural');
  assert.equal(manifest.rate, '-8%');
  assert.equal(manifest.pitch, '+0Hz');
  assert.equal(manifest.book_count, 4);
  assert.equal(manifest.text_count, 20);
  assert.equal(manifest.objective_qa_passed, true);
  assert.equal(manifest.asr_content_check_passed, true, 'Do not publish clips before transcription review');
  assert.equal(manifest.asr_reviewed_clips, 20, 'All twenty clips require review');
  assert.deepEqual(new Set(Object.keys(manifest.files)), new Set(pages.map(row => row.page.text)));
  const expectedFiles = new Set();
  for (const { book, page, number } of pages) {
    const record = manifest.files[page.text];
    assert.equal(record.spoken, page.text);
    assert.equal(record.book_id, book.id);
    assert.equal(record.page, number);
    assert.equal(record.text_sha256, digest(page.text));
    assert.equal(record.file, `${voiceFolder}${record.text_sha256.slice(0, 20)}.mp3`);
    const bytes = assetBytes(record.file, voiceFolder);
    assert.ok(bytes.length > 1000, record.file);
    assert.equal(digest(bytes), record.sha256, record.file);
    assert.ok(bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0), `Missing MP3 header: ${record.file}`);
    assert.equal(record.qa.fully_decoded, true, record.file);
    assert.equal(record.qa.clipped_samples, 0, record.file);
    assert.ok(record.qa.trailing_silence_seconds >= .4, `No sentence-ending pause: ${record.file}`);
    assert.ok(record.qa.duration_seconds >= 10 && record.qa.duration_seconds < 60, `Incomplete or unreasonable narration duration: ${record.file}`);
    expectedFiles.add(path.basename(record.file));
  }
  assert.equal(expectedFiles.size, 20, 'Each page must have its own recording');
  assert.deepEqual(new Set(fs.readdirSync(path.join(root, voiceFolder)).filter(file => file.endsWith('.mp3'))), expectedFiles, 'Unreleased or obsolete recordings must remain outside the release folder');
});

test('the twenty-clip voice overlay preserves the prior map object, language keys and old recordings', () => {
  const scope = library();
  load(scope, 'voice-map.js');
  const original = scope.VOICE_MAP;
  const entries = Object.entries(original);
  const oldKeys = new Set(entries.map(([key]) => key));
  load(scope, voiceMap);
  assert.equal(scope.VOICE_MAP, original, 'Other modules may retain the existing map reference');
  for (const [key, file] of entries) assert.equal(scope.VOICE_MAP[key], file, `Old narration changed: ${key}`);
  const addedKeys = Object.keys(scope.VOICE_MAP).filter(key => !oldKeys.has(key));
  assert.deepEqual(new Set(addedKeys), new Set(pages.map(row => `zh|${row.page.text}`)), 'No missing narration, unpublished series or unrelated sounds may enter this overlay');
  const manifest = read(`${voiceFolder}manifest.json`);
  for (const { page } of pages) assert.equal(scope.VOICE_MAP[`zh|${page.text}`], `${manifest.files[page.text].file}?v=1`);
  const before = JSON.stringify(scope.VOICE_MAP);
  load(scope, voiceMap);
  assert.equal(scope.VOICE_MAP, original);
  assert.equal(JSON.stringify(scope.VOICE_MAP), before, 'Loading a cached overlay twice must be harmless');
});

// Independent full ASR evidence lives in the external backup, not the website.
// Set TABLET_STORY_ASR_REVIEW for release auditing; the portable suite checks the
// approved twenty-clip manifest contract above without a machine-specific path.
test('the supplied independent ASR review approves exactly the published source and audio bytes', { skip: !process.env.TABLET_STORY_ASR_REVIEW }, () => {
  const report = JSON.parse(fs.readFileSync(process.env.TABLET_STORY_ASR_REVIEW, 'utf8'));
  const manifest = read(`${voiceFolder}manifest.json`);
  assert.equal(report.approved, true);
  assert.equal(report.expected_count, 20);
  assert.equal(report.completed_count, 20);
  assert.equal(report.approved_count, 20);
  assert.equal(report.needs_attention_count, 0);
  assert.equal(report.full_transcription_complete, true);
  assert.equal(report.source_sha256_verified, true);
  assert.equal(report.all_audio_sha256_verified, true);
  assert.equal(report.source_sha256, manifest.source_sha256);
  assert.equal(report.human_listening_claimed, false, 'Transcription evidence must not claim subjective human listening');
  assert.equal(report.records.length, 20);
  assert.deepEqual(new Set(report.records.map(record => record.expected)), new Set(pages.map(row => row.page.text)));
  for (const record of report.records) {
    const audio = manifest.files[record.expected];
    assert.equal(record.approved, true, record.expected);
    assert.equal(record.spoken, audio.spoken);
    assert.equal(record.book_id, audio.book_id);
    assert.equal(record.page, audio.page);
    assert.equal(record.file, audio.file);
    assert.equal(record.sha256, audio.sha256);
    assert.equal(record.sha256, digest(assetBytes(record.file, voiceFolder)));
    assert.ok(typeof record.transcript === 'string' && record.transcript.trim(), `Missing complete transcription: ${record.file}`);
    assert.ok(typeof record.reviewreason === 'string' && record.reviewreason.trim(), `No individual review reason: ${record.file}`);
  }
});
