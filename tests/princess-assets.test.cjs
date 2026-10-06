const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const saved = new Map();
const context = {localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'princess.js'),'utf8'),context);
const inspect = expression => vm.runInContext(expression, context);

test('each of the ten princesses has two packaged expressions and a greeting', () => {
  const characters = inspect('princessCharacters.map(c=>c.id)');
  assert.equal(characters.length, 10);
  for (const id of characters) {
    const greeting = path.join(root, 'princess-voices', `${id}-hello.mp3`);
    for (const expression of ['face','cry']) {
      const face = path.join(root, 'princess-assets', `${id}-${expression}-v3.png`);
      assert.ok(fs.statSync(face).size > 100_000, `${id} ${expression}`);
    }
    assert.ok(fs.statSync(greeting).size > 10_000, `${id} greeting`);
    inspect(`princessState.character=${JSON.stringify(id)}`);
    assert.match(inspect('princessSvg()'), new RegExp(`princess-assets/${id}-face-v3\\.png`));
    inspect(`princessState[${JSON.stringify(id)}].expression=1`);
    assert.match(inspect('princessSvg()'), new RegExp(`princess-assets/${id}-cry-v3\\.png`));
  }
});

test('all wardrobe categories can be changed and each princess keeps her own outfit', () => {
  const counts = inspect('Object.fromEntries(Object.entries(princessWardrobe).map(([k,v])=>[k,v.length]))');
  assert.equal(counts.dress, 40);
  assert.equal(counts.hair, 12);
  assert.equal(counts.expression, 2);
  assert.ok(counts.head >= 20 && counts.scene >= 12);
  inspect("princessState.character='ice'; princessState.ice.dress=39; princessPersist()");
  inspect("princessState.character='snow'; princessState.snow.dress=0; princessPersist()");
  const outfits = JSON.parse(saved.get('kid-princess-v2'));
  assert.equal(outfits.ice.dress, 39);
  assert.equal(outfits.snow.dress, 0);
});

test('every accessory card previews its actual shape and renders without broken SVG values', () => {
  const categories = ['head','necklace','earrings','wand','shoes','cape','bag','scene','expression'];
  for (const category of categories) {
    const count = inspect(`princessWardrobe[${JSON.stringify(category)}].length`);
    for (let index = 0; index < count; index++) {
      const preview = inspect(`princessChoicePreview(${JSON.stringify(category)},princessWardrobe[${JSON.stringify(category)}][${index}],${index})`);
      assert.doesNotMatch(preview, /NaN|undefined|\[object Object\]/, `${category} ${index}`);
      if (index > 0 || ['scene','shoes','expression'].includes(category))
        assert.match(preview, /<svg\b/, `${category} ${index} lacks an illustrated preview`);
      inspect(`princessState.snow[${JSON.stringify(category)}]=${index}`);
      const stage = inspect('princessSvg()');
      assert.doesNotMatch(stage, /NaN|undefined|\[object Object\]/, `${category} ${index} stage`);
    }
  }
});

function voiceEnvironment() {
  const attempts = [], fallbacks = [];
  const environment = {
    localStorage: {getItem: () => null, setItem: () => {}},
    window: {},
    state: {muted: false, page: 'game', game: 'princess'},
    voiceRun: 0,
    document: {querySelector: () => ({classList: {add: () => {}}})},
    render: () => {},
    player: {
      src: '', onerror: null,
      play() {
        return new Promise((resolve, reject) => attempts.push({resolve, reject, src: this.src, error: this.onerror}));
      }
    },
    stopAudio() { environment.voiceRun++; environment.player.onerror = null; environment.player.src = ''; },
    fallbackSpeech(text, language, onend, run) { fallbacks.push({text, language, run}); }
  };
  vm.createContext(environment);
  vm.runInContext(fs.readFileSync(path.join(root, 'princess.js'), 'utf8'), environment);
  return {environment, attempts, fallbacks, call: code => vm.runInContext(code, environment)};
}

const flushVoice = async () => { await Promise.resolve(); await Promise.resolve(); };

test('successful princess playback keeps the selected fixed audio and never starts fallback speech', async () => {
  const {attempts, fallbacks, call} = voiceEnvironment();
  call("princessState.character='ice'; princessPlayVoice()");
  assert.equal(attempts[0].src, 'princess-voices/ice-hello.mp3');
  attempts[0].resolve();
  await flushVoice();
  assert.equal(fallbacks.length, 0);
  call("princessState.character='belle'; princessState.step=1; princessPlayVoice()");
  assert.equal(attempts[1].src, 'princess-voices/friend-reply.mp3');
  attempts[1].resolve();
  await flushVoice();
  assert.equal(fallbacks.length, 0);
});

test('a current failed princess recording falls back once even when both error callbacks fire', async () => {
  const {environment, attempts, fallbacks, call} = voiceEnvironment();
  call('princessPlayVoice()');
  attempts[0].error();
  attempts[0].reject(new Error('Audio unavailable'));
  await flushVoice();
  assert.equal(fallbacks.length, 1);
  assert.match(fallbacks[0].text, /我是白雪公主/);
  assert.equal(fallbacks[0].language, 'zh-CN');
  assert.equal(fallbacks[0].run, environment.voiceRun);
});

test('late princess playback failures remain silent after exit, closing, switching or muting', async t => {
  const changes = [
    ['exit the game', "state.page='games'"],
    ['open another game', "state.game='snakeFruit'"],
    ['choose another princess', "princessState.character='ice'"],
    ['advance the greeting', 'princessState.step=1'],
    ['mute', 'state.muted=true'],
    ['stop audio without changing the page', 'stopAudio()'],
    ['close the princess dialog', 'princessClose()'],
    ['switch through the public princess action', "princessSwitch('ice')"]
  ];
  for (const [name, change] of changes) {
    await t.test(name, async () => {
      const {attempts, fallbacks, call} = voiceEnvironment();
      call('princessPlayVoice()');
      call(change);
      attempts[0].error();
      attempts[0].reject(new Error('Interrupted playback'));
      await flushVoice();
      assert.equal(fallbacks.length, 0);
    });
  }
});

test('replaying the same princess invalidates old failures while the new recording may still fall back', async () => {
  const {environment, attempts, fallbacks, call} = voiceEnvironment();
  call('princessPlayVoice()');
  call('princessPlayVoice()');
  attempts[0].error();
  attempts[0].reject(new Error('Interrupted old playback'));
  await flushVoice();
  assert.equal(fallbacks.length, 0);
  attempts[1].reject(new Error('Current audio unavailable'));
  await flushVoice();
  assert.equal(fallbacks.length, 1);
  assert.equal(fallbacks[0].run, environment.voiceRun);
});
