const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadRecognition(custom = {}) {
  const values = new Map();
  const sandbox = {
    console,
    Date,
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { values.set(key, String(value)); },
      removeItem(key) { values.delete(key); }
    }
  };
  Object.assign(sandbox, custom);
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'recognition-data.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'recognition.js'), 'utf8'), sandbox);
  return sandbox;
}

test('认一认数据固定为20类、每类12项，240项名称和id不重复', () => {
  const { RECOGNITION } = loadRecognition();
  assert.equal(RECOGNITION.version, 'recognition-v1-20261002b');
  assert.equal(RECOGNITION.categories.length, 20);
  const ids = [];
  const words = [];
  RECOGNITION.categories.forEach(category => {
    assert.equal(category.items.length, 12, category.id);
    assert.ok([1, 2, 3, 4].includes(category.level), category.id);
    category.items.forEach(item => {
      ids.push(item.id);
      words.push(item.word);
      assert.ok(item.text.length >= 20 && item.text.length <= 45, `${item.word}: ${item.text.length}`);
    });
  });
  assert.equal(ids.length, 240);
  assert.equal(new Set(ids).size, 240);
  assert.equal(new Set(words).size, 240);
});

test('固定图集顺序和必需对象完整', () => {
  const { RECOGNITION } = loadRecognition();
  const expected = {
    self_body: ['头发','眼睛','耳朵','鼻子','嘴巴','牙齿','手','手指','手臂','脚','膝盖','肚子'],
    family: ['宝宝','妈妈','爸爸','爷爷','奶奶','外公','外婆','哥哥','姐姐','弟弟','妹妹','老师'],
    clothes: ['T恤','裤子','裙子','外套','毛衣','袜子','鞋子','帽子','围巾','手套','雨衣','睡衣'],
    home: ['床','枕头','被子','沙发','桌子','椅子','衣柜','台灯','时钟','镜子','门','窗户'],
    toys: ['玩具','积木','拼图','皮球','玩偶','陀螺','沙包','跳绳','魔方','小鼓','画板','泡泡棒'],
    fruits: ['苹果','香蕉','橙子','梨','草莓','葡萄','西瓜','桃子','菠萝','猕猴桃','樱桃','芒果'],
    vegetables: ['西红柿','黄瓜','胡萝卜','土豆','白菜','西兰花','南瓜','玉米','茄子','甜椒','豌豆','蘑菇'],
    foods: ['米饭','面条','馒头','饺子','面包','鸡蛋','牛奶','酸奶','豆腐','鱼肉','鸡肉','蛋糕'],
    vehicles: ['汽车','公交车','校车','出租车','救护车','消防车','火车','地铁','自行车','摩托车','轮船','飞机'],
    outdoors: ['草地','操场','公园','游乐场','沙滩','山坡','小路','桥','池塘','河流','森林','花园'],
    school_tools: ['书包','书本','铅笔','橡皮','尺子','彩笔','剪刀','胶棒','文具盒','笔记本','黑板','地球仪'],
    digital: ['电脑','手机','手机壳','平板电脑','键盘','鼠标','显示器','耳机','相机','充电器','遥控器','打印机'],
    community: ['超市','医院','学校','图书馆','邮局','银行','消防站','警察局','菜市场','餐厅','理发店','公交站'],
    colors: ['红色','橙色','黄色','绿色','蓝色','紫色','粉色','棕色','黑色','白色','灰色','金色'],
    numbers: ['一','二','三','四','五','六','七','八','九','十','十一','十二'],
    animals: ['小狗','小猫','兔子','熊猫','大象','长颈鹿','斑马','狮子','老虎','猴子','松鼠','刺猬'],
    little_life: ['蝴蝶','蜜蜂','瓢虫','蜻蜓','蚂蚁','蜘蛛','蜗牛','毛毛虫','青蛙','小鸟','鸭子','金鱼'],
    sky_weather: ['太阳','月亮','星星','白云','雨滴','雪花','彩虹','闪电','大风','雾','冰雹','霜'],
    safety: ['红绿灯','斑马线','安全带','头盔','救生圈','灭火器','烟雾报警器','插座','热水壶','药品','香烟','酒'],
    hygiene: ['牙刷','牙膏','毛巾','香皂','洗手液','梳子','水杯','口罩','体温计','创可贴','垃圾桶','纸巾']
  };
  const actual = JSON.parse(JSON.stringify(
    Object.fromEntries(RECOGNITION.categories.map(category => [category.id, category.items.map(item => item.word)]))
  ));
  assert.deepEqual(actual, expected);
});

test('香烟和酒使用中性安全说明', () => {
  const { RECOGNITION } = loadRecognition();
  const safety = RECOGNITION.categories.find(category => category.id === 'safety');
  const cigarette = safety.items.find(item => item.word === '香烟').text;
  const alcohol = safety.items.find(item => item.word === '酒').text;
  assert.match(cigarette, /伤害身体|不要触碰|远离/);
  assert.match(alcohol, /小朋友不能品尝|大人/);
  assert.doesNotMatch(cigarette + alcohol, /好喝|酷|漂亮|尝一尝/);
});

test('每日任务为6张跨类别卡和3道三图题，题目排除亲属图', () => {
  const sandbox = loadRecognition();
  sandbox.KNOW.renderHub();
  const progress = sandbox.KNOW._test.getProgress();
  assert.equal(progress.daily.ids.length, 6);
  assert.equal(new Set(progress.daily.ids).size, 6);
  assert.ok(new Set(progress.daily.ids.map(key => key.split('/')[0])).size >= 5);
  assert.equal(progress.daily.questions.length, 3);
  progress.daily.questions.forEach(question => {
    assert.equal(question.options.length, 3);
    assert.equal(new Set(question.options).size, 3);
    assert.ok(question.options.includes(question.target));
    assert.notEqual(question.target.split('/')[0], 'family');
    question.options.forEach(key => assert.notEqual(key.split('/')[0], 'family'));
  });
});

test('图集定位使用4列3行且图片框为正方形', () => {
  const sandbox = loadRecognition();
  const category = sandbox.RECOGNITION.categories[0];
  assert.match(sandbox.KNOW._test.atlasStyle(category, 0), /--know-x:0%;--know-y:0%/);
  assert.match(sandbox.KNOW._test.atlasStyle(category, 3), /--know-x:100%;--know-y:0%/);
  assert.match(sandbox.KNOW._test.atlasStyle(category, 4), /--know-x:0%;--know-y:50%/);
  assert.match(sandbox.KNOW._test.atlasStyle(category, 11), /--know-x:100%;--know-y:100%/);
  const css = fs.readFileSync(path.join(root, 'recognition.css'), 'utf8');
  assert.match(css, /aspect-ratio:\s*1;/);
  assert.match(css, /background-size:\s*400% 300%/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css, /@media \(orientation: landscape\)/);
});

function dailyHarness() {
  let day = '2026-10-02T10:00:00+08:00';
  const timers = new Map();
  let timerId = 0;
  let playback = null;
  let stars = 0;
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [day])); } }
  const sandbox = loadRecognition({
    Date: Clock,
    state: { page: 'learn', stack: [] },
    reward() { stars += 1; },
    stopAudio() { playback = null; },
    playSpoken(text, lang, onend) { playback = { text, onend }; },
    setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  sandbox.render = () => {
    if (sandbox.state.page === 'learn') sandbox.KNOW.renderHub();
    if (sandbox.state.page === 'lesson') sandbox.KNOW.renderLesson();
    sandbox.KNOW.afterRender();
  };
  sandbox.go = (page, data, push = true) => {
    if (push && page !== sandbox.state.page) sandbox.state.stack.push({page: sandbox.state.page});
    sandbox.state.page = page;
    sandbox.stopAudio();
    sandbox.render();
  };
  sandbox.render();
  return {
    sandbox, timers,
    setDay(value) { day = value; },
    get stars() { return stars; },
    get playback() { return playback; },
    ended() { const current = playback; playback = null; current?.onend?.(); }
  };
}

test('卡片自动讲解，答对反馈说完后才读下一题，退出取消跳题', () => {
  const h = dailyHarness();
  const { KNOW } = h.sandbox;
  KNOW.openDaily();
  assert.match(h.playback.text, /^这是/);
  for (let i = 0; i < 6; i++) KNOW.actions.nextDaily();
  const progress = KNOW._test.getProgress();
  assert.match(h.playback.text, /^请找出，/);
  KNOW.actions.answer(progress.daily.questions[0].target);
  assert.equal(h.playback.text, '找对啦！');
  assert.equal(h.timers.size, 1);
  h.ended();
  assert.equal(h.timers.size, 0);
  assert.equal(h.playback.text, `请找出，${KNOW._test.entryFromKey(progress.daily.questions[1].target).item.word}。`);
  KNOW.actions.answer(progress.daily.questions[1].target);
  assert.equal(h.timers.size, 1);
  h.sandbox.go('home');
  assert.equal(h.timers.size, 0);
  assert.equal(h.playback, null);
});

test('每日完整流程只奖励一次，刷新恢复，第二天更换学习内容', () => {
  const h = dailyHarness();
  const { KNOW } = h.sandbox;
  KNOW.openDaily();
  for (let i = 0; i < 6; i++) KNOW.actions.nextDaily();
  const original = KNOW._test.getProgress();
  const wrong = original.daily.questions[0].options.find(key => key !== original.daily.questions[0].target);
  KNOW.actions.answer(wrong);
  assert.equal(KNOW._test.getProgress().daily.quizIndex, 0);
  assert.equal(h.stars, 0);
  for (const question of original.daily.questions) {
    KNOW.actions.answer(question.target);
    h.ended();
  }
  assert.equal(h.stars, 1);
  assert.equal(KNOW._test.getProgress().daily.complete, true);
  KNOW.actions.reviewDaily();
  for (const key of original.daily.ids) {
    const entry = KNOW._test.entryFromKey(key);
    assert.equal(h.playback.text, entry.item.text);
    assert.match(KNOW.renderLesson(), new RegExp(`听${entry.item.word}的介绍`));
    KNOW.actions.nextDaily();
  }
  assert.match(KNOW.renderLesson(), /今天完成啦/);
  assert.equal(KNOW._test.getProgress().daily.quizIndex, 3);
  assert.equal(h.stars, 1);
  KNOW.backRoot(); KNOW.openDaily();
  assert.equal(h.stars, 1);
  KNOW._test.reset(); h.sandbox.go('learn'); KNOW.openDaily();
  assert.equal(KNOW._test.getProgress().daily.complete, true);
  assert.equal(h.stars, 1);
  h.setDay('2026-10-03T10:00:00+08:00');
  KNOW.backRoot();
  const tomorrow = KNOW._test.getProgress();
  assert.equal(tomorrow.daily.date, '2026-10-03');
  assert.equal(tomorrow.daily.complete, false);
  assert.equal(tomorrow.daily.rewarded, false);
  assert.notDeepEqual(tomorrow.daily.ids, original.daily.ids);
  assert.ok(tomorrow.recognized.length >= 6);
  assert.equal(h.stars, 1);
});
