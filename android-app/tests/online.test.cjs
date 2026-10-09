const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
test('online flavor follows the HTTPS website without bundled interception and preserves offline source', () => {
 const project=path.resolve(__dirname,'..'), build=fs.mkdtempSync(path.join(os.tmpdir(),'gc-online-test-'));
 const original=fs.readFileSync(path.join(project,'src/main/java/cn/leyman/guolicheng/MainActivity.java'),'utf8');
 try {
  execFileSync('python3',[path.join(project,'prepare-online.py'),project,build]);
  const source=fs.readFileSync(path.join(build,'online-MainActivity.java'),'utf8');
  assert.match(source,/HOME = "https:\/\/leyman.cn\/"/);
  const interception=source.slice(source.indexOf('shouldInterceptRequest'),source.indexOf('private WebResourceResponse missingAsset'));
  assert.match(interception,/return null/); assert.doesNotMatch(interception,/getAssets/);
  assert.match(source,/WebSettings.LOAD_DEFAULT/); assert.doesNotMatch(source,/web.clearCache/);
  assert.match(source,/ssl.cancel\(\)/); assert.doesNotMatch(source,/ssl.proceed/);
  assert.match(fs.readFileSync(path.join(build,'online-manifest.xml'),'utf8'),/versionCode="8"/);
  assert.equal(fs.readFileSync(path.join(project,'src/main/java/cn/leyman/guolicheng/MainActivity.java'),'utf8'),original);
 } finally { fs.rmSync(build,{recursive:true,force:true}); }
});
