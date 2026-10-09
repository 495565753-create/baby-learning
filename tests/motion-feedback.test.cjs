const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load({ reduced = false, saveData = false, hidden = false } = {}) {
  const nodes = new Map();
  const timers = [];
  const classes = new Set();
  const body = {
    children: [],
    classList: {
      toggle(name, value) { if (value) classes.add(name); else classes.delete(name); }
    },
    appendChild(child) { this.children.push(child); }
  };
  const counterClasses = new Set();
  nodes.set('stars', { classList: {
    add(name) { counterClasses.add(name); },
    remove(name) { counterClasses.delete(name); }
  } });
  const document = {
    body, hidden,
    getElementById(id) { return nodes.get(id) || null; },
    createElement() {
      const el = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; },
        remove() { body.children = body.children.filter(x => x !== el); nodes.delete(el.id); } };
      Object.defineProperty(el, 'id', { set(id) { this._id = id; nodes.set(id, this); }, get() { return this._id; } });
      return el;
    },
    addEventListener() {}
  };
  const window = {
    document,
    navigator: { connection: { saveData } },
    matchMedia() { return { matches: reduced }; },
    setTimeout(fn) { timers.push(fn); }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'motion-feedback.js'), 'utf8'), { window });
  return { motion: window.MOTION, body, classes, counterClasses, timers };
}

test('a reward shows one short celebration and removes it afterwards', () => {
  const ui = load();
  ui.motion.reward();
  assert.equal(ui.body.children.length, 1);
  assert.match(ui.body.children[0].innerHTML, /⭐/);
  assert.equal(ui.body.children[0].attributes['aria-hidden'], 'true');
  ui.timers.forEach(fn => fn());
  assert.equal(ui.body.children.length, 0);
});

test('reduced motion and data saver avoid particles', () => {
  for (const options of [{ reduced: true }, { saveData: true }, { hidden: true }]) {
    const ui = load(options);
    ui.motion.reward();
    assert.equal(ui.body.children.length, 0);
    assert.ok(ui.counterClasses.has('reward-count-pop'));
    if (options.saveData) assert.ok(ui.classes.has('motion-lite'));
    if (options.hidden) assert.ok(ui.classes.has('motion-paused'));
  }
});

test('page transitions animate once only when the destination changes', () => {
  const ui = load();
  const calls = [];
  const container = { firstElementChild: { animate(...args) { calls.push(args); } } };
  ui.motion.page('home', container);
  ui.motion.page('home', container);
  assert.equal(calls.length, 0);
  ui.motion.page('games', container);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].duration, 210);
  ui.motion.page('games', container);
  assert.equal(calls.length, 1);
  for (const options of [{ reduced: true }, { saveData: true }, { hidden: true }]) {
    const unavailable = load(options);
    unavailable.motion.page('home', container);
    unavailable.motion.page('games', container);
    assert.equal(calls.length, 1);
  }
});
