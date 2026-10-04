const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const context = {setTimeout,clearTimeout};
context.window=context;
vm.createContext(context);
for (const file of ['books.js','books-extra.js','books-new-adventures.js','story-art-map.js','kids-new-games.js','voice-map.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const read = name => JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

test('30 longer original adventures add ten distinct books to each requested series',()=>{
  const books=context.BOOKS_ADVENTURES;
  assert.equal(books.length,30);
  assert.equal(context.BOOKS.length,124);
  assert.equal(new Set(context.BOOKS.map(book=>book.id)).size,124);
  assert.equal(new Set(context.BOOKS.map(book=>book.title)).size,124);
  for(const group of ['peppa','paw','zootopia']) assert.equal(books.filter(book=>book.group===group).length,10,group);
  for(const book of books){
    assert.equal(book.pages.length,6,book.id);
    assert.equal(book.reillustrated,true,book.id);
    assert.equal(book.cover,book.pages[0].img);
    const length=book.pages.reduce((sum,page)=>sum+Array.from(page.text).length,0);
    assert.ok(length>=440 && length<=600,`${book.id}: ${length}`);
    for(const page of book.pages) assert.ok(Array.from(page.text).length>=65 && Array.from(page.text).length<=115,book.id);
  }
  assert.equal(new Set(books.flatMap(book=>book.pages.map(page=>page.text))).size,180);
});

test('all 180 new illustrated pages are real mobile WebP assets matching their manifest',()=>{
  const manifest=read('art/adventures-v1/manifest.json');
  assert.equal(manifest.book_count,30);
  assert.equal(manifest.page_count,180);
  assert.equal(manifest.files.length,180);
  assert.equal(manifest.generator,'built-in image_gen');
  const expected=new Set(context.BOOKS_ADVENTURES.flatMap(book=>book.pages.map(page=>page.img)));
  for(const item of manifest.files){
    assert.ok(expected.delete(item.file),item.file);
    const bytes=fs.readFileSync(path.join(root,item.file));
    assert.equal(bytes.subarray(0,4).toString(),'RIFF');
    assert.equal(bytes.subarray(8,12).toString(),'WEBP');
    assert.equal(digest(bytes),item.sha256,item.file);
    assert.ok(item.size[0]>=430 && item.size[1]>=430,item.file);
    assert.ok(bytes.length<250000,`${item.file}: mobile image too large`);
  }
  assert.equal(expected.size,0);
  const unevenRows=manifest.files.filter(item=>item.book==='adventure_zootopia_05');
  assert.deepEqual(unevenRows.map(item=>item.crop_box.slice(1).filter((_,index)=>index%2===0)),[[0,438],[0,438],[446,923],[446,923],[931,1536],[931,1536]]);
});

test('every new story page and spoken game hint has matching checked female narration',()=>{
  const batches=[['voice-adventures-v1',180,'books-new-adventures.js',context.BOOKS_ADVENTURES.flatMap(book=>book.pages.map(page=>page.text))],['voice-new-games-v1',24,'kids-new-games.js',context.NEW_GAMES.texts]];
  for(const [folder,count,source,texts] of batches){
    const manifest=read(`${folder}/manifest.json`);
    assert.equal(manifest.voice,'zh-CN-XiaoxiaoNeural');
    assert.equal(manifest.rate,'-8%');
    assert.equal(manifest.pitch,'+0Hz');
    assert.equal(manifest.objective_qa_passed,true);
    assert.equal(manifest.text_count,count);
    assert.equal(manifest.source_sha256,digest(fs.readFileSync(path.join(root,source))));
    assert.equal(Object.keys(manifest.files).length,count);
    assert.equal(fs.readdirSync(path.join(root,folder)).filter(name=>name.endsWith('.mp3')).length,count);
    for(const text of texts){
      const item=manifest.files[text];
      assert.ok(item,text);
      assert.equal(item.spoken,text);
      assert.equal(context.VOICE_MAP[`zh|${text}`],`${item.file}?v=1`);
      const bytes=fs.readFileSync(path.join(root,item.file));
      assert.ok(bytes.length>1000,item.file);
      assert.equal(digest(bytes),item.sha256,item.file);
      assert.equal(item.qa.fully_decoded,true);
      assert.equal(item.qa.clipped_samples,0);
      assert.ok(item.qa.trailing_silence_seconds>=.4,item.file);
    }
  }
});
