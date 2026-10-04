/* Original child-friendly challenges. See research/challenge-game-sources-20261004.md. */
(function (root) {
  'use strict';

  const entries = [
    { id: 'cgRobotRoute', title: '机器人送星星', icon: '🤖', desc: '先画路线，再让机器人收星星回家', category: 'think', action: '画路线', help: '从机器人开始，用手指画一条路。绕开石头，经过每一颗星星，再走到小房子。画好后，点开始走。也可以一个格子一个格子地点。' },
    { id: 'cgSlidePuzzle', title: '数字滑块挑战', icon: '🧩', desc: '滑动数字，让它们按顺序排好队', category: 'think', action: '滑一滑', help: '看看上面的小目标。把空格旁边的数字滑进空格，也可以点一下数字。从左到右，从上到下，把数字排好队。' },
    { id: 'cgMemoryLights', title: '记忆星灯', icon: '💡', desc: '看清亮灯顺序，再照着点一遍', category: 'think', action: '记一记', help: '点看一遍，先看清楚哪些小灯亮起来。等它们停下来，再按刚才的顺序点。记不住也没关系，可以再看一遍。' },
    { id: 'cgLogicGarden', title: '花园逻辑方格', icon: '🌻', desc: '横排竖排，图案都不重复', category: 'think', action: '想一想', help: '先点下面的一个图案，再点空格，也可以把图案拖进去。每一横排、每一竖排，都要有不同的图案。带小锁的图案已经放好，不能换。' }
  ];
  entries.forEach(entry => { entry.category = 'challenge'; });
  const byId = Object.fromEntries(entries.map(entry => [entry.id, entry]));
  const LEVEL_NAMES = ['🌱 小试', '🌿 进阶', '🌳 挑战'];
  const SYMBOLS = [
    { icon: '🍎', name: '苹果', color: '#ffe0d7' },
    { icon: '🌿', name: '叶子', color: '#d9f2de' },
    { icon: '💧', name: '水滴', color: '#dbeaff' },
    { icon: '☀️', name: '太阳', color: '#fff0b8' }
  ];
  const ROBOT_LEVELS = [
    { size: 4, start: 12, goal: 3, walls: [5, 6, 9, 10], stars: [8, 2], route: [12, 8, 4, 0, 1, 2, 3] },
    { size: 5, start: 20, goal: 4, walls: [6, 11, 16, 17, 18], stars: [10, 12, 3], route: [20, 15, 10, 5, 0, 1, 2, 3, 8, 7, 12, 13, 14, 9, 4] },
    { size: 5, start: 20, goal: 24, walls: [6, 11, 16, 21], stars: [0, 12, 3, 18], route: [20, 15, 10, 5, 0, 1, 2, 7, 12, 17, 22, 23, 18, 13, 8, 3, 4, 9, 14, 19, 24] }
  ];
  const SLIDE_LEVELS = [{ size: 2, seed: 11, steps: 5 }, { size: 3, seed: 39, steps: 10 }, { size: 3, seed: 107, steps: 22 }];
  const LIGHT_LEVELS = [[0, 1, 3], [2, 0, 3, 1], [1, 2, 0, 3, 2, 1]];
  const LOGIC_LEVELS = [{ size: 2, blanks: [1, 2] }, { size: 3, blanks: [1, 2, 3, 4, 8] }, { size: 4, blanks: [1, 2, 4, 6, 7, 8, 10, 13, 15] }];
  const COPY = {
    retry: '没关系，我们慢慢想。',
    routeStart: '先从机器人所在的格子开始。',
    routeNear: '接着画旁边的格子，就能连起来啦。',
    routeStone: '这是石头，试着绕过去。',
    routeReady: '路线画好啦，点开始走吧。',
    routeNeed: '先让路线经过每一颗星星，再走到小房子。',
    robotWalk: '机器人按照你的路线出发啦！',
    slideNear: '只能把空格旁边的数字移进空格。',
    slideHint: '老师帮你挪一步，接下来试试看。',
    watching: '先看小灯，我们等一下再点。',
    yourTurn: '轮到你啦，照着刚才的顺序点。',
    sequenceAgain: '没关系，再看一遍，慢慢记。',
    sequenceNeed: '先点看一遍，看看小灯的顺序。',
    logicSelect: '先选一个图案，再点空格。',
    logicDuplicate: '这一横排或竖排已经有它啦，试试别的。',
    logicLocked: '带小锁的图案已经放好，我们找空格吧。',
    logicHint: '老师帮你放一个，接下来试试看。',
    logicUndo: '先撤回一步，换一个图案试试。',
    stageDone: '这一关完成啦！你观察得很仔细，再试试下一关吧。',
    finalRobot: '机器人把星星送回家啦！你的路线规划真棒！',
    finalSlide: '数字都排好队啦！你是爱动脑筋的拼图小高手！',
    finalMemory: '亮灯顺序全都记住啦！你观察得认真，记得也很清楚！',
    finalLogic: '横着看、竖着看，图案都放对啦！你真会观察和思考！'
  };
  const finalCopy = { cgRobotRoute: COPY.finalRobot, cgSlidePuzzle: COPY.finalSlide, cgMemoryLights: COPY.finalMemory, cgLogicGarden: COPY.finalLogic };
  const categoryHelp = '小挑战来啦。先选喜欢的游戏，再试试更难的关卡。慢慢想，随时都能重新玩。';
  const texts = [...new Set(entries.map(entry => entry.help).concat(Object.values(COPY), categoryHelp))];
  let state = null;
  let host = null;
  let bindings = [];
  let timers = [];
  let epoch = 0;

  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  function say(text) { try { root.speak?.(text); } catch (_) {} }
  function on(node, type, handler, options) { if (!node?.addEventListener) return; node.addEventListener(type, handler, options); bindings.push(() => node.removeEventListener(type, handler, options)); }
  function unbind() { bindings.splice(0).forEach(fn => fn()); }
  function cancelTimers() { epoch++; timers.splice(0).forEach(id => root.clearTimeout(id)); }
  function later(fn, ms) { const version = epoch; const id = root.setTimeout(() => { timers = timers.filter(timer => timer !== id); if (version === epoch) fn(); }, ms); timers.push(id); return id; }
  function adjacent(a, b, size) { return Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && a < size * size && b < size * size && Math.abs(a % size - b % size) + Math.abs(Math.floor(a / size) - Math.floor(b / size)) === 1; }
  function solvedTiles(size) { return Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size)); }
  function slideSolved(tiles) { return tiles.every((value, index) => value === (index + 1) % tiles.length); }
  function scramble(size, seed, steps) {
    const tiles = solvedTiles(size);
    let previous = -1;
    const trace = [];
    for (let step = 0; step < steps; step++) {
      const blank = tiles.indexOf(0);
      const candidates = tiles.map((_, i) => i).filter(i => i !== previous && adjacent(i, blank, size));
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const next = candidates[seed % candidates.length];
      trace.push(next);
      [tiles[blank], tiles[next]] = [tiles[next], tiles[blank]];
      previous = blank;
    }
    if (slideSolved(tiles)) { const blank = tiles.indexOf(0); const next = tiles.findIndex((_, i) => adjacent(i, blank, size)); [tiles[blank], tiles[next]] = [tiles[next], tiles[blank]]; trace.push(next); }
    return { tiles, trace };
  }
  function logicCanPlace(values, size, index, value) {
    if (!Number.isInteger(index) || index < 0 || index >= size * size || !Number.isInteger(value) || value < 1 || value > size) return false;
    const row = Math.floor(index / size), col = index % size;
    return values.every((other, at) => at === index || other !== value || (Math.floor(at / size) !== row && at % size !== col));
  }
  function solveLogic(values, size) {
    const solution = values.slice();
    if (!solution.every((value, at) => !value || logicCanPlace(solution, size, at, value))) return null;
    const solve = () => { const index = solution.indexOf(0); if (index < 0) return true; for (let value = 1; value <= size; value++) { if (!logicCanPlace(solution, size, index, value)) continue; solution[index] = value; if (solve()) return true; solution[index] = 0; } return false; };
    return solve() ? solution : null;
  }
  function puzzleHint(tiles, size) {
    if (slideSolved(tiles)) return null;
    const heuristic = values => values.reduce((sum, value, index) => value ? sum + Math.abs(index % size - (value - 1) % size) + Math.abs(Math.floor(index / size) - Math.floor((value - 1) / size)) : sum, 0);
    const heap = [];
    const push = item => { heap.push(item); let at = heap.length - 1; while (at > 0) { const parent = (at - 1) >> 1; if (heap[parent].cost <= item.cost) break; heap[at] = heap[parent]; at = parent; } heap[at] = item; };
    const pop = () => { const first = heap[0], last = heap.pop(); if (heap.length) { let at = 0; while (at * 2 + 1 < heap.length) { let child = at * 2 + 1; if (child + 1 < heap.length && heap[child + 1].cost < heap[child].cost) child++; if (heap[child].cost >= last.cost) break; heap[at] = heap[child]; at = child; } heap[at] = last; } return first; };
    const key = values => values.join('');
    const best = new Map([[key(tiles), 0]]);
    push({ tiles: tiles.slice(), steps: 0, first: null, cost: heuristic(tiles) });
    let visits = 0;
    while (heap.length && visits++ < 200000) {
      const item = pop();
      if (item.steps !== best.get(key(item.tiles))) continue;
      if (slideSolved(item.tiles)) return item.first;
      const blank = item.tiles.indexOf(0);
      for (let at = 0; at < tiles.length; at++) {
        if (!adjacent(at, blank, size)) continue;
        const next = item.tiles.slice(); [next[blank], next[at]] = [next[at], next[blank]];
        const steps = item.steps + 1, nextKey = key(next);
        if (best.has(nextKey) && best.get(nextKey) <= steps) continue;
        best.set(nextKey, steps);
        push({ tiles: next, steps, first: item.first ?? at, cost: steps + heuristic(next) });
      }
    }
    return null;
  }
  function fresh(id, level = 0) {
    const common = { id, level, done: false, busy: false, message: '', selected: 0, history: [] };
    if (id === 'cgRobotRoute') return { ...common, path: [ROBOT_LEVELS[level].start], walkIndex: -1 };
    if (id === 'cgSlidePuzzle') { const spec = SLIDE_LEVELS[level]; return { ...common, tiles: scramble(spec.size, spec.seed, spec.steps).tiles, moves: 0 }; }
    if (id === 'cgMemoryLights') return { ...common, phase: 'ready', progress: 0, active: -1, demoStep: 0 };
    if (id === 'cgLogicGarden') { const spec = LOGIC_LEVELS[level]; const values = Array.from({ length: spec.size ** 2 }, (_, at) => (Math.floor(at / spec.size) + at % spec.size) % spec.size + 1); const clues = values.map((value, at) => spec.blanks.includes(at) ? 0 : value); return { ...common, values: clues.slice(), clues }; }
    return null;
  }
  function ensure(id) { if (!byId[id]) return null; if (!state || state.id !== id) { cancelTimers(); unbind(); state = fresh(id); } return state; }
  function node() { return host?.querySelector?.(`[data-cg-game="${state?.id || ''}"]`) || null; }
  function repaint() { const current = node(); if (!current?.isConnected) return; unbind(); current.outerHTML = render(state.id); mount(state.id, host); }
  function feedback(text, spoken = true) { if (!state) return; state.message = text; const label = node()?.querySelector?.('[data-cg-message]'); if (label) label.textContent = text; if (spoken) say(text); }
  function changeLevel(level) { if (!state || !Number.isInteger(level) || level < 0 || level > 2) return false; cancelTimers(); state = fresh(state.id, level); repaint(); return true; }
  function complete() {
    if (!state || state.done) return;
    state.done = true; state.busy = false;
    state.message = state.level === 2 ? finalCopy[state.id] : COPY.stageDone;
    repaint();
    if (state.level < 2) say(state.message);
    else { const own = state; later(() => { if (state === own) { if (typeof root.finishMiniGame === 'function') root.finishMiniGame(finalCopy[state.id]); else say(finalCopy[state.id]); } }, 450); }
  }
  function header(current) { const entry = byId[current.id]; return `<div class="cg-heading"><span aria-hidden="true">${entry.icon}</span><div><h2>${esc(entry.title)}</h2><p>${esc(entry.desc)}</p></div></div><div class="cg-levels" role="group" aria-label="选择难度">${LEVEL_NAMES.map((label, level) => `<button data-cg-level="${level}" class="${level === current.level ? 'active' : ''}" aria-pressed="${level === current.level}">${label}</button>`).join('')}</div>`; }
  function common(current, body) { return `<section class="lesson cg-game" data-cg-game="${current.id}">${header(current)}${body}<div class="cg-message" data-cg-message aria-live="polite">${esc(current.message || '先试一试，想一想也没关系')}</div>${current.done ? `<div class="cg-success"><span aria-hidden="true">🌟</span><b>完成这一关啦！</b>${current.level < 2 ? `<button data-cg-next>下一关 →</button>` : '<p>你是爱思考的小高手</p>'}</div>` : ''}</section>`; }
  function renderRobot(current) {
    const spec = ROBOT_LEVELS[current.level];
    const position = current.walkIndex >= 0 ? current.path[current.walkIndex] : spec.start;
    const picked = spec.stars.filter(at => current.path.includes(at)).length;
    const board = `<div class="cg-summary">⭐ 路线经过 ${picked} / ${spec.stars.length} 颗星星</div><div class="cg-route-grid" data-cg-route style="--cg-size:${spec.size}" aria-label="机器人路线画板">${Array.from({ length: spec.size ** 2 }, (_, at) => { const wall = spec.walls.includes(at), pathIndex = current.path.indexOf(at); const icon = at === position ? '🤖' : wall ? '🪨' : at === spec.goal ? '🏡' : spec.stars.includes(at) ? '⭐' : ''; return `<button data-cg-cell="${at}" class="cg-route-cell ${wall ? 'wall' : ''} ${pathIndex >= 0 ? 'planned' : ''} ${at === position ? 'robot' : ''}" ${wall ? 'aria-disabled="true"' : ''} aria-label="第${Math.floor(at / spec.size) + 1}行，第${at % spec.size + 1}列${icon ? '，' + (icon === '🤖' ? '机器人' : icon === '🪨' ? '石头' : icon === '🏡' ? '小房子' : '星星') : ''}"><span>${icon}</span>${pathIndex >= 0 && at !== spec.start ? `<i>${pathIndex}</i>` : ''}</button>`; }).join('')}</div><div class="cg-controls"><button data-cg-undo ${current.busy || current.done || current.path.length < 2 ? 'disabled' : ''}>↶ 撤一步</button><button class="primary" data-cg-run ${current.busy || current.done ? 'disabled' : ''}>${current.busy ? '🤖 正在走' : '▶ 开始走'}</button></div>`;
    return common(current, board);
  }
  function renderSlide(current) {
    const size = SLIDE_LEVELS[current.level].size;
    const target = solvedTiles(size).map(value => `<i>${value || '空'}</i>`).join('');
    return common(current, `<div class="cg-puzzle-goal"><span>排成这样</span><div style="--cg-size:${size}">${target}</div></div><div class="cg-slide-grid" style="--cg-size:${size}" aria-label="数字滑块拼图">${current.tiles.map((value, at) => `<button data-cg-tile="${at}" class="cg-slide-tile ${value ? '' : 'empty'} ${value && value === at + 1 ? 'aligned' : ''}" ${!value ? 'disabled' : ''} aria-label="${value ? `数字${value}` : '空格'}"><span>${value || '↔'}</span>${value ? '<i aria-hidden="true">⭐</i>' : '<small>空格</small>'}</button>`).join('')}</div><div class="cg-summary">小手移动了 ${current.moves} 次</div><div class="cg-controls"><button data-cg-undo ${current.done || !current.history.length ? 'disabled' : ''}>↶ 撤一步</button><button data-cg-hint ${current.done ? 'disabled' : ''}>💡 提示一步</button></div>`);
  }
  function renderMemory(current) {
    const sequence = LIGHT_LEVELS[current.level];
    return common(current, `<div class="cg-memory-status">${current.phase === 'watch' ? '👀 看小灯，先不点' : current.phase === 'answer' ? '☝️ 轮到你来点' : '👀 先看一遍亮灯顺序'}</div><div class="cg-sequence-dots" aria-label="记忆进度">${sequence.map((_, at) => `<i class="${at < current.progress ? 'done' : ''}">${at < current.progress ? '✓' : '·'}</i>`).join('')}</div><div class="cg-lights">${SYMBOLS.map((symbol, at) => `<button data-cg-light="${at}" class="cg-light ${current.active === at ? 'lit' : ''}" style="--cg-color:${symbol.color}" ${current.phase !== 'answer' || current.done ? 'disabled' : ''} aria-label="${symbol.name}小灯"><span>${symbol.icon}</span><b>${symbol.name}</b>${current.phase === 'watch' && current.active === at ? `<i>${current.demoStep}</i>` : ''}</button>`).join('')}</div><button class="cg-watch" data-cg-watch ${current.phase === 'watch' || current.done ? 'disabled' : ''}>👀 ${current.phase === 'ready' ? '看一遍' : '再看一遍'}</button>`);
  }
  function renderLogic(current) {
    const size = LOGIC_LEVELS[current.level].size;
    return common(current, `<div class="cg-logic-rule">↔ 横排不重复　↕ 竖排不重复</div><div class="cg-logic-grid" style="--cg-size:${size}" aria-label="花园逻辑方格">${current.values.map((value, at) => `<button data-cg-logic="${at}" class="cg-logic-cell ${current.clues[at] ? 'clue' : ''}" ${value ? `style="--cg-color:${SYMBOLS[value - 1].color}"` : ''} aria-label="第${Math.floor(at / size) + 1}行，第${at % size + 1}列，${value ? SYMBOLS[value - 1].name + (current.clues[at] ? '，已经固定' : '') : '空格'}"><span>${value ? SYMBOLS[value - 1].icon : '＋'}</span>${current.clues[at] ? '<i aria-hidden="true">🔒</i>' : ''}</button>`).join('')}</div><div class="cg-symbol-tray" role="group" aria-label="选择图案">${SYMBOLS.slice(0, size).map((symbol, at) => `<button data-cg-symbol="${at + 1}" style="--cg-color:${symbol.color}" class="${current.selected === at + 1 ? 'selected' : ''}" aria-label="选择${symbol.name}" aria-pressed="${current.selected === at + 1}"><span>${symbol.icon}</span><small>${symbol.name}</small></button>`).join('')}</div><div class="cg-controls"><button data-cg-undo ${current.done || !current.history.length ? 'disabled' : ''}>↶ 撤一步</button><button data-cg-hint ${current.done ? 'disabled' : ''}>💡 提示一步</button></div>`);
  }
  function render(id) { const current = ensure(id); if (!current) return ''; return id === 'cgRobotRoute' ? renderRobot(current) : id === 'cgSlidePuzzle' ? renderSlide(current) : id === 'cgMemoryLights' ? renderMemory(current) : renderLogic(current); }

  function routeCell(at, spoken = true) {
    if (state?.id !== 'cgRobotRoute' || state.busy || state.done) return false;
    const spec = ROBOT_LEVELS[state.level], last = state.path.at(-1);
    if (!Number.isInteger(at) || at < 0 || at >= spec.size ** 2 || at === last) return false;
    if (state.path.length > 1 && at === state.path.at(-2)) { state.path.pop(); updateRoute(); return true; }
    if (spec.walls.includes(at)) { if (spoken) feedback(COPY.routeStone); return false; }
    if (!adjacent(last, at, spec.size)) { if (spoken) feedback(COPY.routeNear); return false; }
    if (state.path.length >= 61) return false;
    state.path.push(at); state.message = at === spec.goal ? COPY.routeReady : ''; updateRoute(); return true;
  }
  function updateRoute() {
    const currentNode = node(); if (!currentNode) return;
    const position = state.walkIndex >= 0 ? state.path[state.walkIndex] : ROBOT_LEVELS[state.level].start;
    currentNode.querySelectorAll?.('[data-cg-cell]').forEach(cell => {
      const at = Number(cell.dataset.cgCell), step = state.path.indexOf(at);
      cell.classList.toggle('planned', step >= 0); cell.classList.toggle('robot', at === position);
      const spec = ROBOT_LEVELS[state.level];
      cell.querySelector('span').textContent = at === position ? '🤖' : spec.walls.includes(at) ? '🪨' : at === spec.goal ? '🏡' : spec.stars.includes(at) ? '⭐' : '';
      cell.querySelector('i')?.remove();
      if (step > 0) cell.insertAdjacentHTML('beforeend', `<i>${step}</i>`);
    });
    const spec = ROBOT_LEVELS[state.level], summary = currentNode.querySelector('.cg-summary');
    if (summary) summary.textContent = `⭐ 路线经过 ${spec.stars.filter(at => state.path.includes(at)).length} / ${spec.stars.length} 颗星星`;
    const undo = currentNode.querySelector('[data-cg-undo]'); if (undo) undo.disabled = state.busy || state.done || state.path.length < 2;
    feedback(state.message || '接着画旁边的格子，经过星星再回家', false);
  }
  function runRobot() {
    if (state?.id !== 'cgRobotRoute' || state.busy || state.done) return false;
    const spec = ROBOT_LEVELS[state.level];
    if (state.path.at(-1) !== spec.goal || !spec.stars.every(at => state.path.includes(at))) { feedback(COPY.routeNeed); return false; }
    state.busy = true; state.walkIndex = 0; state.message = COPY.robotWalk; repaint(); say(COPY.robotWalk);
    const own = state;
    const step = () => { if (state !== own) return; if (state.walkIndex === state.path.length - 1) { complete(); return; } state.walkIndex++; updateRoute(); later(step, 230); };
    later(step, 260); return true;
  }
  function slideMove(at, isHint = false) {
    if (state?.id !== 'cgSlidePuzzle' || state.done) return false;
    const size = SLIDE_LEVELS[state.level].size, blank = state.tiles.indexOf(0);
    if (!adjacent(at, blank, size)) { if (!isHint) feedback(COPY.slideNear); return false; }
    state.history.push(state.tiles.slice());
    [state.tiles[at], state.tiles[blank]] = [state.tiles[blank], state.tiles[at]]; state.moves++;
    state.message = isHint ? COPY.slideHint : '';
    if (slideSolved(state.tiles)) complete(); else repaint();
    if (isHint && !state.done) say(COPY.slideHint);
    return true;
  }
  function watchLights() {
    if (state?.id !== 'cgMemoryLights' || state.done || state.phase === 'watch') return false;
    cancelTimers(); state.phase = 'watch'; state.progress = 0; state.active = -1; state.demoStep = 0; state.message = COPY.watching; repaint();
    const own = state, sequence = LIGHT_LEVELS[state.level];
    sequence.forEach((light, at) => {
      later(() => { if (state !== own) return; state.active = light; state.demoStep = at + 1; updateLights(); }, 300 + at * 1000);
      later(() => { if (state !== own) return; state.active = -1; updateLights(); }, 1000 + at * 1000);
    });
    later(() => { if (state !== own) return; state.phase = 'answer'; state.active = -1; state.message = COPY.yourTurn; repaint(); say(COPY.yourTurn); }, 350 + sequence.length * 1000);
    return true;
  }
  function updateLights() {
    const current = node(); if (!current) return;
    current.querySelectorAll?.('[data-cg-light]').forEach(light => { const lit = Number(light.dataset.cgLight) === state.active; light.classList.toggle('lit', lit); light.querySelector('i')?.remove(); if (lit) light.insertAdjacentHTML('beforeend', `<i>${state.demoStep}</i>`); });
  }
  function pressLight(at) {
    if (state?.id !== 'cgMemoryLights' || state.done || !Number.isInteger(at) || at < 0 || at > 3) return false;
    if (state.phase !== 'answer') { feedback(COPY.sequenceNeed); return false; }
    const sequence = LIGHT_LEVELS[state.level];
    if (at !== sequence[state.progress]) { state.phase = 'ready'; state.progress = 0; state.active = -1; state.message = COPY.sequenceAgain; repaint(); say(COPY.sequenceAgain); return false; }
    state.progress++; state.active = at;
    if (state.progress === sequence.length) complete();
    else { repaint(); const own = state; later(() => { if (state === own && !state.done) { state.active = -1; updateLights(); } }, 220); }
    return true;
  }
  function logicPlace(at, value = state?.selected, isHint = false) {
    if (state?.id !== 'cgLogicGarden' || state.done) return false;
    const size = LOGIC_LEVELS[state.level].size;
    if (!Number.isInteger(at) || at < 0 || at >= size ** 2) return false;
    if (state.clues[at]) { feedback(COPY.logicLocked); return false; }
    if (!value) { feedback(COPY.logicSelect); return false; }
    if (!logicCanPlace(state.values, size, at, value)) { feedback(COPY.logicDuplicate); return false; }
    if (state.values[at] === value) return false;
    state.history.push(state.values.slice()); state.values[at] = value; state.message = isHint ? COPY.logicHint : '';
    if (state.values.every(Boolean)) complete(); else repaint();
    if (isHint && !state.done) say(COPY.logicHint);
    return true;
  }
  function undo() {
    if (!state || state.done || state.busy) return false;
    if (state.id === 'cgRobotRoute') { if (state.path.length < 2) return false; state.path.pop(); state.message = ''; updateRoute(); return true; }
    if (!state.history.length) return false;
    const values = state.history.pop();
    if (state.id === 'cgSlidePuzzle') state.tiles = values;
    else if (state.id === 'cgLogicGarden') state.values = values;
    else return false;
    state.message = ''; repaint(); return true;
  }
  function hint() {
    if (!state || state.done || state.busy) return false;
    if (state.id === 'cgSlidePuzzle') { const at = puzzleHint(state.tiles, SLIDE_LEVELS[state.level].size); return at == null ? false : slideMove(at, true); }
    if (state.id === 'cgLogicGarden') { const size = LOGIC_LEVELS[state.level].size, solution = solveLogic(state.values, size); if (!solution) { feedback(COPY.logicUndo); return false; } const at = state.values.indexOf(0); return at >= 0 && logicPlace(at, solution[at], true); }
    return false;
  }

  function bindRoute(current) {
    const board = current.querySelector('[data-cg-route]'); let pointer = null; let suppressClick = 0;
    const cellAt = event => { const box = board.getBoundingClientRect(), size = ROBOT_LEVELS[state.level].size; const x = event.clientX - box.left, y = event.clientY - box.top; if (x < 0 || y < 0 || x >= box.width || y >= box.height) return null; return Math.floor(y / box.height * size) * size + Math.floor(x / box.width * size); };
    on(board, 'pointerdown', event => { if (event.isPrimary === false || state.busy || state.done) return; const at = cellAt(event); if (at == null) return; event.preventDefault(); if (at !== state.path.at(-1) && !routeCell(at)) return; pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }; try { board.setPointerCapture(event.pointerId); } catch (_) {} });
    on(board, 'pointermove', event => { if (!pointer || event.pointerId !== pointer.id) return; event.preventDefault(); const own = pointer, distance = Math.hypot(event.clientX - own.x, event.clientY - own.y); if (distance > 4) own.moved = true; const steps = Math.max(1, Math.ceil(distance / 12)); for (let step = 1; step <= steps; step++) { const at = cellAt({ clientX: own.x + (event.clientX - own.x) * step / steps, clientY: own.y + (event.clientY - own.y) * step / steps }); if (at != null) routeCell(at, false); } own.x = event.clientX; own.y = event.clientY; }, { passive: false });
    const end = event => { if (!pointer || event.pointerId !== pointer.id) return; if (pointer.moved) suppressClick = Date.now() + 400; try { if (board.hasPointerCapture?.(event.pointerId)) board.releasePointerCapture(event.pointerId); } catch (_) {} pointer = null; };
    on(board, 'pointerup', end); on(board, 'pointercancel', end);
    on(board, 'click', event => { if (Date.now() < suppressClick) return; const cell = event.target.closest?.('[data-cg-cell]'); if (cell) routeCell(Number(cell.dataset.cgCell)); });
    on(current.querySelector('[data-cg-run]'), 'click', runRobot);
    bindings.push(() => { if (pointer) { try { board.releasePointerCapture(pointer.id); } catch (_) {} pointer = null; } });
  }
  function bindSlide(current) {
    let gesture = null, suppressClick = 0;
    current.querySelectorAll('[data-cg-tile]').forEach(tile => {
      on(tile, 'pointerdown', event => { if (event.isPrimary === false || state.done || !state.tiles[Number(tile.dataset.cgTile)]) return; const at = Number(tile.dataset.cgTile), blank = state.tiles.indexOf(0); if (!adjacent(at, blank, SLIDE_LEVELS[state.level].size)) return; event.preventDefault(); gesture = { id: event.pointerId, at, x: event.clientX, y: event.clientY }; try { tile.setPointerCapture(event.pointerId); } catch (_) {} });
      on(tile, 'pointermove', event => { if (!gesture || event.pointerId !== gesture.id) return; event.preventDefault(); const size = SLIDE_LEVELS[state.level].size, blank = state.tiles.indexOf(0); const directionX = blank % size - gesture.at % size, directionY = Math.floor(blank / size) - Math.floor(gesture.at / size); const projected = Math.max(0, Math.min(tile.getBoundingClientRect().width * .78, (event.clientX - gesture.x) * directionX + (event.clientY - gesture.y) * directionY)); tile.style.transform = `translate3d(${projected * directionX}px,${projected * directionY}px,0)`; tile.style.zIndex = '2'; }, { passive: false });
      on(tile, 'pointerup', event => { if (!gesture || event.pointerId !== gesture.id) return; const own = gesture; gesture = null; try { tile.releasePointerCapture(event.pointerId); } catch (_) {} tile.style.transform = ''; tile.style.zIndex = ''; const dx = event.clientX - own.x, dy = event.clientY - own.y, size = SLIDE_LEVELS[state.level].size, blank = state.tiles.indexOf(0); const directionX = blank % size - own.at % size, directionY = Math.floor(blank / size) - Math.floor(own.at / size); const projected = dx * directionX + dy * directionY; suppressClick = Date.now() + 400; if (Math.hypot(dx, dy) < 9 || projected > 9) slideMove(own.at); });
      on(tile, 'pointercancel', event => { if (gesture?.id === event.pointerId) { try { tile.releasePointerCapture(event.pointerId); } catch (_) {} tile.style.transform = ''; tile.style.zIndex = ''; gesture = null; } });
      on(tile, 'click', event => { if (Date.now() < suppressClick) { event.preventDefault(); return; } slideMove(Number(tile.dataset.cgTile)); });
    });
    bindings.push(() => { if (gesture) { const tile = current.querySelector(`[data-cg-tile="${gesture.at}"]`); try { tile?.releasePointerCapture?.(gesture.id); } catch (_) {} if (tile) { tile.style.transform = ''; tile.style.zIndex = ''; } gesture = null; } });
  }
  function bindLogic(current) {
    let gesture = null, suppressClick = 0;
    current.querySelectorAll('[data-cg-symbol]').forEach(symbol => {
      const select = () => { if (state.done) return; state.selected = Number(symbol.dataset.cgSymbol); current.querySelectorAll('[data-cg-symbol]').forEach(button => { const active = Number(button.dataset.cgSymbol) === state.selected; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); }); };
      on(symbol, 'click', () => { if (Date.now() >= suppressClick) select(); });
      on(symbol, 'pointerdown', event => { if (event.isPrimary === false || state.done) return; event.preventDefault(); select(); gesture = { id: event.pointerId, element: symbol, x: event.clientX, y: event.clientY, moved: false }; try { symbol.setPointerCapture(event.pointerId); } catch (_) {} });
      on(symbol, 'pointermove', event => { if (!gesture || gesture.element !== symbol || gesture.id !== event.pointerId) return; event.preventDefault(); const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y; if (Math.hypot(dx, dy) > 8) gesture.moved = true; symbol.style.transform = `translate3d(${dx}px,${dy}px,0) scale(1.05)`; symbol.classList.add('dragging'); }, { passive: false });
      const end = (event, cancel) => { if (!gesture || gesture.element !== symbol || gesture.id !== event.pointerId) return; const moved = gesture.moved; gesture = null; try { symbol.releasePointerCapture(event.pointerId); } catch (_) {} symbol.style.transform = ''; symbol.classList.remove('dragging'); if (moved && !cancel) { symbol.style.pointerEvents = 'none'; const cell = root.document?.elementFromPoint?.(event.clientX, event.clientY)?.closest?.('[data-cg-logic]'); symbol.style.pointerEvents = ''; suppressClick = Date.now() + 400; if (cell) logicPlace(Number(cell.dataset.cgLogic)); } };
      on(symbol, 'pointerup', event => end(event, false)); on(symbol, 'pointercancel', event => end(event, true));
    });
    current.querySelectorAll('[data-cg-logic]').forEach(cell => on(cell, 'click', () => logicPlace(Number(cell.dataset.cgLogic))));
    bindings.push(() => { if (gesture) { try { gesture.element.releasePointerCapture(gesture.id); } catch (_) {} gesture.element.style.transform = ''; gesture.element.classList.remove('dragging'); gesture = null; } });
  }
  function mount(id, parent) {
    unbind(); const current = ensure(id); host = parent || root.document; const game = node(); if (!current || !game) return false;
    game.querySelectorAll('[data-cg-level]').forEach(button => on(button, 'click', () => changeLevel(Number(button.dataset.cgLevel))));
    on(game.querySelector('[data-cg-next]'), 'click', () => changeLevel(state.level + 1));
    on(game.querySelector('[data-cg-undo]'), 'click', undo); on(game.querySelector('[data-cg-hint]'), 'click', hint);
    if (id === 'cgRobotRoute') bindRoute(game);
    else if (id === 'cgSlidePuzzle') bindSlide(game);
    else if (id === 'cgMemoryLights') { on(game.querySelector('[data-cg-watch]'), 'click', watchLights); game.querySelectorAll('[data-cg-light]').forEach(button => on(button, 'click', () => pressLight(Number(button.dataset.cgLight)))); }
    else bindLogic(game);
    return true;
  }
  function stop() { cancelTimers(); unbind(); state = null; host = null; }
  const api = { entries, render, mount, stop, texts, _test: { getState: () => state ? JSON.parse(JSON.stringify(state)) : null, changeLevel, routeCell, runRobot, slideMove, watchLights, pressLight, logicPlace, undo, hint, adjacent, slideSolved, scramble, puzzleHint, logicCanPlace, solveLogic, data: { ROBOT_LEVELS, SLIDE_LEVELS, LIGHT_LEVELS, LOGIC_LEVELS } } };
  root.CHALLENGE_GAMES = api;
  const original = root.NEW_GAMES;
  if (original) root.NEW_GAMES = { ...original, entries: original.entries.concat(entries), texts: original.texts.concat(texts), render: id => byId[id] ? render(id) : original.render(id), mount: (id, parent) => byId[id] ? mount(id, parent) : original.mount(id, parent), stop: () => { original.stop(); stop(); } };
})(window);
