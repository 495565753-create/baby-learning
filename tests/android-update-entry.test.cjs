const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'kid.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const updateTag = index.match(/<a\b[^>]*\bid="appUpdateBtn"[^>]*>/)?.[0];
assert.ok(updateTag, 'the actual page must contain its native update link');

function node(classes = '') {
  const values = new Set(classes.split(/\s+/).filter(Boolean));
  return {
    innerHTML: '', textContent: '',
    classList: {
      contains(value) { return values.has(value); },
      remove(value) { values.delete(value); },
      toggle(value, force) {
        const enabled = force === undefined ? !values.has(value) : force;
        if (enabled) values.add(value); else values.delete(value);
        return enabled;
      }
    }
  };
}

// Execute the real application startup, including its DOM visibility change,
// rather than testing a copied version parser or a source-text regular expression.
function startApp(userAgent, { missingNavigator = false, missingUpdateLink = false } = {}) {
  const elements = new Map(['app', 'player', 'backBtn', 'homeBtn', 'soundBtn', 'bottomNav', 'stars']
    .map(id => [`#${id}`, node()]));
  const updateLink = node(updateTag.match(/\bclass="([^"]*)"/)[1]);
  updateLink.href = updateTag.match(/\bhref="([^"]*)"/)[1];
  if (!missingUpdateLink) elements.set('#appUpdateBtn', updateLink);
  const context = {
    URL, URLSearchParams,
    location: { href: 'https://leyman.cn/', search: '' },
    localStorage: { getItem() { return null; } },
    sessionStorage: { getItem() { return null; } },
    document: {
      body: node(),
      querySelector(selector) { return elements.get(selector) || null; },
      querySelectorAll() { return []; }
    },
    HOME: { render() { return '<section id="ready-home">小乐园</section>'; } },
    scrollTo() {}
  };
  if (!missingNavigator) context.navigator = { userAgent };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'kid.js', timeout: 1000 });
  assert.match(elements.get('#app').innerHTML, /ready-home/, 'startup still renders the home page');
  return { updateLink, context };
}

test('the old online APK, older offline apps, iPad and ordinary browsers keep the native update link hidden', async t => {
  const unsupported = [
    ['online Android 1.0.0', 'Mozilla/5.0 Android GuolichengTablet/1.0.0'],
    ['offline Android 2.0.0', 'Mozilla/5.0 Android GuolichengTablet/2.0.0-Offline'],
    ['offline Android 2.2.0', 'Mozilla/5.0 Android GuolichengTablet/2.2.0-Offline'],
    ['last older minor version', 'Mozilla/5.0 Android GuolichengTablet/2.2.99-Offline'],
    ['iPad Safari', 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'],
    ['Android Chrome', 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0.0.0 Mobile Safari/537.36'],
    ['missing user agent', undefined]
  ];
  for (const [label, userAgent] of unsupported) await t.test(label, () => {
    assert.equal(startApp(userAgent).updateLink.classList.contains('hidden'), true);
  });
});

test('all native update versions from the first 2.3.0 release show the existing update action', async t => {
  for (const version of ['2.3.0', '2.3.1', '2.3.2', '2.3.12', '2.10.0', '3.0.0', '10.0.0']) {
    await t.test(version, () => {
      const { updateLink } = startApp(`Mozilla/5.0 Android GuolichengTablet/${version}-Offline`);
      assert.equal(updateLink.classList.contains('hidden'), false);
      assert.equal(updateLink.href, 'https://leyman.cn/offline/app-update');
    });
  }
  assert.equal(startApp('GuolichengTablet/2.3.0').updateLink.classList.contains('hidden'), false);
});

test('incomplete, prefixed, suffixed and noncanonical version tokens never enable the native action', async t => {
  for (const token of [
    'GuolichengTablet/', 'GuolichengTablet/2.3', 'GuolichengTablet/2.3.2.1',
    'GuolichengTablet/02.3.2', 'GuolichengTablet/2.03.2', 'GuolichengTablet/2.3.02',
    'NotGuolichengTablet/2.3.2', 'GuolichengTablet/2.3.2evil',
    'GuolichengTablet/2.3.2-Unknown', 'GuolichengTablet/2.3.2-OfflineExtra',
    'GuolichengTablet/2.-3.2', 'GuolichengTablet/9007199254740992.3.2'
  ]) await t.test(token, () => {
    assert.equal(startApp(`Mozilla/5.0 ${token}`).updateLink.classList.contains('hidden'), true);
  });
});

test('startup remains usable when navigator or the update element is absent', () => {
  assert.equal(startApp(undefined, { missingNavigator: true }).updateLink.classList.contains('hidden'), true);
  assert.doesNotThrow(() => startApp('GuolichengTablet/2.3.2-Offline', { missingUpdateLink: true }));
});
