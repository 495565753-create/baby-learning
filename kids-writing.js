(function (root) {
  'use strict';
  const STORE = 'kid-writing-progress-v1', SIZE = 400, TOLERANCE = 27, START_RADIUS = 29, END_RADIUS = 30;
  const COPY = {
    help: '我们一起学写数字吧。先看小手怎么写，再从发亮的小点开始，顺着小路慢慢描。写好了，还能认识一个汉字。',
    start: '从发亮的小点开始，顺着小路慢慢写。',
    offPath: '小手离开小路啦，回到刚才的小点，继续慢慢写。',
    direction: '方向有一点不同，跟着小路向前写。',
    unfinished: '这一笔还没有写完。没关系，从小点再试一次。',
    canceled: '这一笔先停下来啦。从小点再写一次就好。',
    ready: '这一笔写到终点啦，松开小手就好。',
    nextStroke: '这一笔写好啦。再从新的小点开始，写下一笔。',
    again: '我们再写一次。先看示范，也可以直接从小点开始。',
    demo: '小手正在示范，看看它从哪里开始，往哪里写。',
    first: '先选一个数字，跟着小手练习吧。',
    finished: '写好啦，你把数字认真写出来了！'
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const clock = () => root.performance?.now?.() ?? Date.now();
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  function lessons() { return Array.isArray(root.WRITING_LESSONS) ? root.WRITING_LESSONS.filter(item => item && item.id && Array.isArray(item.strokes) && item.strokes.length && item.strokes.every(stroke => Array.isArray(stroke.points) && stroke.points.length >= 2)) : []; }
  function normalize(lesson) {
    if (!lesson) return null;
    const coordinateSize = Number(lesson.coordinateSize) || SIZE, ratio = SIZE / coordinateSize, word = lesson.word || {};
    return {
      ...lesson, number: Number(lesson.number), display: lesson.display || String(lesson.number), title: lesson.title || lesson.label || `数字 ${lesson.number}`,
      word: { char: word.char || lesson.character || '', pinyin: word.pinyin || lesson.pinyin || '', meaning: word.meaning || lesson.meaning || '', intro: word.intro || lesson.meaning || '', icon: word.icon || lesson.characterIcon || lesson.counting?.emoji || '🌟', svg: word.svg || lesson.characterSvg || '' },
      counting: lesson.counting || { emoji: '⭐', name: '星星', unit: '颗' },
      strokes: lesson.strokes.map(stroke => ({ ...stroke, points: stroke.points.map(point => [Number(point[0]) * ratio, Number(point[1]) * ratio]) }))
    };
  }
  function localDay(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  function readProgress() {
    try { const value = JSON.parse(root.localStorage?.getItem(STORE) || 'null'); if (value && value.version === 1 && value.completed && typeof value.completed === 'object' && !Array.isArray(value.completed) && Object.values(value.completed).every(item => item && typeof item.firstDay === 'string' && typeof item.lastDay === 'string')) return value; } catch {}
    return { version: 1, completed: {}, lastLesson: null };
  }
  let state = { lessonId: null, stroke: 0, traces: [], done: false, menu: false, demo: false, demoStroke: 0, demoProgress: 0, session: null, pointer: null, message: COPY.first, progressSaved: true };
  let host = null, board = null, mounted = false, generation = 0, removers = [];
  const timers = new Set(), geometryCache = new Map();
  function current() { const values = lessons(); return normalize(values.find(item => item.id === state.lessonId) || values[0]); }
  function speak(text) { if (text && typeof root.speak === 'function') root.speak(text); }
  function stopSpeech() { if (typeof root.stopAudio === 'function') root.stopAudio(); }
  function message(text, voice = false) { if (state.message === text && !voice) return; state.message = text; const output = host?.querySelector('[data-ws-status]'); if (output) output.textContent = text; if (voice) speak(text); }
  function listen(node, event, fn, options) { if (!node?.addEventListener) return; node.addEventListener(event, fn, options); removers.push(() => node.removeEventListener(event, fn, options)); }
  function unbind() { removers.forEach(fn => fn()); removers = []; }
  function later(fn, delay, run = generation) { const id = root.setTimeout(() => { timers.delete(id); if (mounted && run === generation) fn(); }, delay); timers.add(id); return id; }
  function cancelAnimation() { generation++; timers.forEach(id => root.clearTimeout(id)); timers.clear(); state.demo = false; const hand = host?.querySelector('[data-ws-demo-hand]'); if (hand) hand.style.display = 'none'; const trail = host?.querySelector('[data-ws-demo-trace]'); if (trail) trail.setAttribute('d', ''); }
  function releasePointer() { const pointer = state.pointer; state.pointer = null; if (pointer != null) try { board?.releasePointerCapture?.(pointer); } catch {} }
  function discardStroke() { releasePointer(); state.session = null; const trace = host?.querySelector('[data-ws-live-trace]'); if (trace) trace.setAttribute('d', ''); }
  function stop() { if (mounted) stopSpeech(); cancelAnimation(); discardStroke(); unbind(); mounted = false; board = null; host = null; }
  function ensureLesson() { const lesson = current(); if (lesson && state.lessonId !== lesson.id) { state.lessonId = lesson.id; state.stroke = 0; state.traces = []; state.done = false; } return lesson; }
  function linePath(points) { return points.length ? points.map((point, i) => `${i ? 'L' : 'M'}${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(' ') : ''; }
  function geometry(points) {
    const samples = [points[0].slice()], lengths = [0]; let total = 0;
    for (let i = 1; i < points.length; i++) { const a = points[i - 1], b = points[i], length = distance(a, b), divisions = Math.max(1, Math.ceil(length / 6)); for (let step = 1; step <= divisions; step++) { const point = [a[0] + (b[0] - a[0]) * step / divisions, a[1] + (b[1] - a[1]) * step / divisions]; total += distance(samples[samples.length - 1], point); samples.push(point); lengths.push(total); } }
    return { points: samples, lengths, total };
  }
  function strokeGeometry() { const lesson = current(); if (!lesson) return null; const key = `${lesson.id}:${state.stroke}`; if (!geometryCache.has(key)) geometryCache.set(key, geometry(lesson.strokes[state.stroke].points)); return geometryCache.get(key); }
  function atLength(path, arc) { const value = clamp(arc, 0, path.total); let i = 1; while (i < path.lengths.length && path.lengths[i] < value) i++; if (i >= path.points.length) return path.points[path.points.length - 1].slice(); const a = path.points[i - 1], b = path.points[i], span = path.lengths[i] - path.lengths[i - 1], part = span ? (value - path.lengths[i - 1]) / span : 0; return [a[0] + (b[0] - a[0]) * part, a[1] + (b[1] - a[1]) * part]; }
  function nearest(path, point, minimum, maximum) {
    let result = null;
    for (let i = 1; i < path.points.length; i++) {
      if (path.lengths[i] < minimum || path.lengths[i - 1] > maximum) continue;
      const a = path.points[i - 1], b = path.points[i], dx = b[0] - a[0], dy = b[1] - a[1], square = dx * dx + dy * dy;
      const fraction = square ? clamp(((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / square, 0, 1) : 0, projected = [a[0] + dx * fraction, a[1] + dy * fraction], arc = path.lengths[i - 1] + (path.lengths[i] - path.lengths[i - 1]) * fraction;
      if (arc < minimum || arc > maximum) continue; const gap = distance(point, projected);
      if (!result || gap < result.distance) result = { arc, point: projected, distance: gap };
    }
    return result;
  }
  function beginTrace(path, point) { if (!path || distance(point, path.points[0]) > START_RADIUS) return null; return { path, progress: 0, lastRaw: point.slice(), lastValid: path.points[0].slice(), drawn: [path.points[0].slice()], blocked: false, moves: 0, error: null }; }
  function advanceTrace(session, point) {
    if (!session || !point.every(Number.isFinite)) return { accepted: false, reason: 'start' };
    if (session.blocked) {
      if (distance(point, session.lastValid) > START_RADIUS) return { accepted: false, reason: session.error };
      session.blocked = false; session.lastRaw = point.slice(); session.error = null; return { accepted: true, recovered: true };
    }
    const old = session.lastRaw.slice(), steps = Math.max(1, Math.ceil(distance(old, point) / 5));
    for (let i = 1; i <= steps; i++) {
      const position = [old[0] + (point[0] - old[0]) * i / steps, old[1] + (point[1] - old[1]) * i / steps], target = nearest(session.path, position, Math.max(0, session.progress - 23), Math.min(session.path.total, session.progress + 18));
      const backward = target && target.arc < session.progress - 15;
      if (!target || target.distance > TOLERANCE || backward) { session.blocked = true; session.error = backward ? 'direction' : 'offPath'; session.lastRaw = point.slice(); return { accepted: false, reason: session.error }; }
      if (target.arc > session.progress) { session.progress = target.arc; session.lastValid = target.point.slice(); session.drawn.push(target.point.slice()); }
    }
    session.moves++; session.lastRaw = point.slice(); return { accepted: true };
  }
  function traceComplete(session, point) { return !!session && !session.blocked && session.moves > 0 && session.progress >= Math.max(session.path.total * .96, session.path.total - 15) && distance(point, session.path.points[session.path.points.length - 1]) <= END_RADIUS; }
  function clientPoint(event, rect) { const side = Math.min(rect.width, rect.height); if (!side || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null; return [(event.clientX - rect.left - (rect.width - side) / 2) * SIZE / side, (event.clientY - rect.top - (rect.height - side) / 2) * SIZE / side]; }
  function eventPoint(event) { return board ? clientPoint(event, board.getBoundingClientRect()) : null; }
  function safeSvg(value) { const checked = typeof value === 'string' ? value.replace(/\sxmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/gi, '') : ''; return /^\s*<svg[\s>]/i.test(checked) && !/<(?:script|foreignObject|iframe)|\son\w+\s*=|(?:javascript:|https?:|data:)|(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(checked) ? value : ''; }
  function menuMarkup() { const progress = readProgress(), today = localDay(); return `<div class="ws-number-menu" ${state.menu ? '' : 'hidden'} aria-label="选择数字或汉字">${lessons().map(lesson => `<button type="button" data-ws-number="${esc(lesson.id)}" aria-pressed="${state.lessonId === lesson.id}"><b>${esc(lesson.display || lesson.number)}</b><span>${progress.completed[lesson.id]?.lastDay === today ? '✅ 今天练过' : '✏️ 写一写'}</span></button>`).join('')}</div>`; }
  function navigation(lesson) { const values = lessons(), index = values.findIndex(item => item.id === lesson.id); return `<div class="ws-bottom-nav"><button type="button" data-ws-previous ${index <= 0 ? 'disabled' : ''}>← 上一个</button><button type="button" class="ws-primary" data-ws-next ${index >= values.length - 1 ? 'disabled' : ''}>下一个 →</button></div>`; }
  function practiceMarkup(lesson) {
    const active = lesson.strokes[state.stroke], start = active.points[0];
    return `<div class="ws-lesson-heading"><span class="ws-target-number">${esc(lesson.display)}</span><div><h3>${esc(lesson.title)}</h3><span class="ws-step-badge">第 ${state.stroke + 1} / ${lesson.strokes.length} 笔</span><p>${esc(active.hint || lesson.strokeHints?.[state.stroke] || COPY.start)}</p></div></div><p class="ws-status" data-ws-status role="status" aria-live="polite">${esc(state.message)}</p><div class="ws-board-frame"><svg class="ws-board" data-ws-board viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(lesson.title)}手指描写板"><rect class="ws-writing-paper" x="0" y="0" width="400" height="400" rx="22"/><path class="ws-midlines" d="M200 0V400 M0 200H400 M0 0L400 400 M400 0L0 400" fill="none"/>${lesson.strokes.map((stroke, i) => `<path class="${i < state.stroke ? 'ws-stroke-done' : 'ws-stroke-guide'} ${i === state.stroke ? 'ws-stroke-current' : ''}" d="${esc(linePath(stroke.points))}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}<path class="ws-live-trace" data-ws-live-trace d="" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path class="ws-demo-trace" data-ws-demo-trace d="" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle class="ws-start-dot" cx="${start[0]}" cy="${start[1]}" r="13"/><text class="ws-start-number" x="${start[0]}" y="${start[1] + 5}" text-anchor="middle">${state.stroke + 1}</text><g class="ws-demo-hand" data-ws-demo-hand style="display:none" aria-hidden="true"><circle cx="0" cy="0" r="23" class="ws-demo-halo"/><text x="0" y="10" text-anchor="middle">☝️</text></g></svg><p class="ws-board-caption">☝️ 在这里用手指写 · 从亮点开始</p></div><div class="ws-board-tools"><button type="button" class="ws-primary" data-ws-demo>☝️ 看示范</button><button type="button" data-ws-redo>↻ 这一笔重写</button><button type="button" data-ws-stop-demo>■ 停止</button></div>${navigation(lesson)}`;
  }
  function completionText(lesson) { return [lesson.completion, lesson.word.intro || lesson.word.meaning].filter(Boolean).join(''); }
  function doneMarkup(lesson) {
    const illustration = safeSvg(lesson.word.svg), progress = readProgress(), count = Object.values(progress.completed).filter(item => item?.lastDay === localDay()).length;
    return `<section class="ws-complete"><div class="ws-success-icon">🌟</div><h3>${esc(lesson.title)}写好啦！</h3><p class="ws-status" data-ws-status role="status">${esc(state.message)}</p><div class="ws-complete-number"><strong>${esc(lesson.display)}</strong><div><b>${lesson.number} ${esc(lesson.counting.unit)}${esc(lesson.counting.name)}</b><div class="ws-counting-icons" aria-label="${lesson.number}${esc(lesson.counting.unit)}${esc(lesson.counting.name)}">${Array.from({ length: clamp(lesson.number, 1, 10) }, () => `<span>${esc(lesson.counting.emoji)}</span>`).join('')}</div></div></div><article class="ws-character-card"><span class="ws-character-kicker">写好了，听听这个字的意思</span><div class="ws-character-main"><div><b class="ws-hanzi">${esc(lesson.word.char)}</b><span class="ws-pinyin">${esc(lesson.word.pinyin)}</span></div><div class="ws-character-picture">${illustration || `<span>${esc(lesson.word.icon)}</span>`}</div></div><p>${esc(lesson.word.meaning)}</p><button type="button" class="ws-primary" data-ws-meaning>🔊 听字的意思</button></article><div class="ws-complete-actions"><button type="button" data-ws-again>✏️ 再写一遍</button><button type="button" class="ws-primary" data-ws-next>${lesson.number === 10 ? '✍️ 接着学汉字' : '下一个 →'}</button></div><p class="ws-progress-note">${state.progressSaved ? `今天已经练过 ${count} 个字，继续慢慢练习吧。` : '这次先练习，之后再来写一写。'}</p></section>`;
  }
  function render() {
    const lesson = ensureLesson();
    if (!lesson) return '<section class="writing-studio" data-writing-studio><p>数字小课堂正在准备，请稍后再来。</p></section>';
    return `<section class="writing-studio" data-writing-studio data-ws-kind="${lesson.id.startsWith('hanzi-')?'hanzi':'number'}" data-ws-view="${state.done ? 'done' : 'practice'}"><header class="ws-hero"><span>✏️</span><div><small>看一看，描一描，再认识一个字</small><h2>学写字 · 小手写一写</h2></div></header><div class="ws-top-actions"><button type="button" data-ws-home>🏠 首页</button><button type="button" data-ws-menu aria-expanded="${state.menu}">🔢 数字与汉字</button><button type="button" data-ws-help>🔊 听玩法</button></div>${menuMarkup()}${state.done ? doneMarkup(lesson) : practiceMarkup(lesson)}</section>`;
  }
  function paint() { if (!mounted || !host) return; unbind(); const holder = root.document.createElement('div'); holder.innerHTML = render(); const next = holder.firstElementChild; host.replaceWith(next); host = next; board = host.querySelector('[data-ws-board]'); bind(); }
  function selectLesson(id, demo = true) {
    const lesson = lessons().find(item => item.id === id); if (!lesson) return false;
    cancelAnimation(); discardStroke(); stopSpeech(); state.lessonId = id; state.stroke = 0; state.traces = []; state.done = false; state.menu = false; state.message = COPY.start; state.progressSaved = true; paint();
    if (demo && mounted) demonstrate(); return true;
  }
  function selectNeighbor(direction) { const values = lessons(), index = values.findIndex(lesson => lesson.id === state.lessonId), next = index + direction; if (next < 0 || next >= values.length) { if (direction > 0) { state.menu = true; paint(); } return false; } return selectLesson(values[next].id); }
  function markComplete(day = localDay()) {
    const progress = readProgress(), old = progress.completed[state.lessonId], newForDay = !old || old.lastDay !== day;
    progress.completed[state.lessonId] = { firstDay: old?.firstDay || day, lastDay: day }; progress.lastLesson = state.lessonId;
    try { if (!root.localStorage) throw Error('storage'); root.localStorage.setItem(STORE, JSON.stringify(progress)); state.progressSaved = true; } catch { state.progressSaved = false; }
    if (newForDay && state.progressSaved && typeof root.reward === 'function') root.reward();
    return newForDay;
  }
  function finishLesson() { cancelAnimation(); discardStroke(); state.done = true; const lesson = current(); markComplete(); state.message = lesson.completion || COPY.finished; paint(); speak(completionText(lesson) || COPY.finished); }
  function pointerDown(event) {
    if (state.done || state.pointer != null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const point = eventPoint(event), path = strokeGeometry(); if (!point || !path) return; event.preventDefault();
    const session = beginTrace(path, point); if (!session) { if (!state.demo) message(COPY.start, true); return; }
    cancelAnimation(); stopSpeech(); state.session = session; state.pointer = event.pointerId; board?.setPointerCapture?.(event.pointerId); message(COPY.start); drawLive();
  }
  function drawLive() { const line = host?.querySelector('[data-ws-live-trace]'); if (line) line.setAttribute('d', linePath(state.session?.drawn || [])); }
  function pointerMove(event) {
    if (event.pointerId !== state.pointer || !state.session) return; event.preventDefault();
    const samples = event.getCoalescedEvents?.(), events = samples?.length ? samples : [event];
    for (const sample of events) { const point = eventPoint(sample); if (!point) continue; const result = advanceTrace(state.session, point); if (!result.accepted) message(result.reason === 'direction' ? COPY.direction : COPY.offPath); else if (traceComplete(state.session, point)) message(COPY.ready); else message(current().strokes[state.stroke].hint || COPY.start); }
    drawLive();
  }
  function pointerUp(event, canceled = false) {
    if (event.pointerId !== state.pointer || !state.session) return;
    const point = eventPoint(event), complete = !canceled && point && traceComplete(state.session, point), session = state.session; releasePointer(); state.session = null;
    if (!complete) { drawLive(); message(canceled ? COPY.canceled : COPY.unfinished, !canceled); return; }
    state.traces.push(session.drawn); state.stroke++;
    if (state.stroke >= current().strokes.length) finishLesson(); else { state.message = COPY.nextStroke; paint(); speak(current().strokes[state.stroke].hint || COPY.nextStroke); }
  }
  function stopDemonstration() { cancelAnimation(); stopSpeech(); message(COPY.start); }
  function demoDuration(path, hint) {
    const seconds = Number(root.WRITING_VOICE_DURATIONS?.[hint]), natural = clamp(path.total * 11, 2500, 4300);
    const spoken = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 + 250 : clamp(String(hint).replace(/[，。！？、,.!?\s]/g, '').length * 210 + 1200, 5500, 12000);
    return clamp(Math.max(natural, spoken), 2500, 15000);
  }
  function demonstrate() {
    const lesson = current(); if (!lesson || state.done || !mounted) return false;
    cancelAnimation(); discardStroke(); state.demo = true; state.demoStroke = state.stroke; state.demoProgress = 0; const run = generation; stopSpeech(); message(COPY.demo);
    const animateStroke = index => {
      if (run !== generation || !mounted) return; state.demoStroke = index; state.demoProgress = 0; const path = geometry(lesson.strokes[index].points), hint = lesson.strokes[index].hint || COPY.demo, started = clock(), duration = demoDuration(path, hint);
      stopSpeech(); speak(hint); message(hint);
      const frame = () => {
        if (run !== generation || !mounted) return; const fraction = clamp((clock() - started) / duration, 0, 1), arc = path.total * fraction, point = atLength(path, arc); state.demoProgress = fraction;
        const hand = host?.querySelector('[data-ws-demo-hand]'), trail = host?.querySelector('[data-ws-demo-trace]'); if (hand) { hand.style.display = ''; hand.setAttribute('transform', `translate(${point[0].toFixed(2)},${point[1].toFixed(2)})`); }
        if (trail) trail.setAttribute('d', linePath(path.points.filter((_, i) => path.lengths[i] <= arc).concat([point])));
        if (fraction < 1) later(frame, 16, run); else if (index < lesson.strokes.length - 1) later(() => animateStroke(index + 1), 550, run); else later(() => { cancelAnimation(); message(COPY.start); }, 500, run);
      }; frame();
    }; animateStroke(state.stroke); return true;
  }
  function redo() { cancelAnimation(); discardStroke(); stopSpeech(); message(COPY.start); drawLive(); }
  function reset() { const id = current()?.id; if (!id) return false; selectLesson(id, false); message(COPY.again); if (mounted) demonstrate(); return true; }
  function suppressCallout(event) { if (event.cancelable !== false) event.preventDefault(); }
  function bind() {
    listen(host?.querySelector('[data-ws-home]'), 'click', () => { stop(); stopSpeech(); root.go?.('home'); });
    listen(host?.querySelector('[data-ws-menu]'), 'click', () => { cancelAnimation(); discardStroke(); stopSpeech(); state.menu = !state.menu; paint(); });
    listen(host?.querySelector('[data-ws-help]'), 'click', () => { cancelAnimation(); discardStroke(); speak(COPY.help); });
    host?.querySelectorAll('[data-ws-number]').forEach(button => listen(button, 'click', () => selectLesson(button.dataset.wsNumber)));
    listen(host?.querySelector('[data-ws-previous]'), 'click', () => selectNeighbor(-1)); host?.querySelectorAll('[data-ws-next]').forEach(button => listen(button, 'click', () => selectNeighbor(1)));
    listen(host?.querySelector('[data-ws-demo]'), 'click', demonstrate); listen(host?.querySelector('[data-ws-stop-demo]'), 'click', stopDemonstration); listen(host?.querySelector('[data-ws-redo]'), 'click', redo); listen(host?.querySelector('[data-ws-again]'), 'click', reset);
    listen(host?.querySelector('[data-ws-meaning]'), 'click', () => { stopSpeech(); speak(current().word.intro || current().word.meaning); });
    listen(board, 'pointerdown', pointerDown); listen(board, 'pointermove', pointerMove); listen(board, 'pointerup', event => pointerUp(event)); listen(board, 'pointercancel', event => pointerUp(event, true)); listen(board, 'lostpointercapture', event => pointerUp(event, true));
    for (const event of ['contextmenu', 'selectstart', 'dragstart']) listen(board, event, suppressCallout); listen(board, 'touchstart', suppressCallout, { passive: false }); listen(board, 'touchmove', suppressCallout, { passive: false });
    const rest = () => { cancelAnimation(); discardStroke(); stopSpeech(); if (!state.done) message(COPY.canceled); };
    listen(root.document, 'visibilitychange', () => { if (root.document.hidden) rest(); }); listen(root, 'blur', rest); listen(root, 'orientationchange', rest); listen(root.screen?.orientation, 'change', rest); listen(root, 'pagehide', stop);
  }
  function mount(container) { stop(); host = container?.matches?.('[data-writing-studio]') ? container : container?.querySelector?.('[data-writing-studio]'); if (!host || !ensureLesson()) return false; board = host.querySelector('[data-ws-board]'); mounted = true; bind(); if (!state.done) demonstrate(); return true; }
  function texts() {
    const values = Object.values(COPY);
    for (const raw of lessons()) { const lesson = normalize(raw); values.push(lesson.guide, lesson.meaning, lesson.word.meaning, lesson.word.intro, lesson.completion, completionText(lesson), ...lesson.strokes.map(stroke => stroke.hint), ...(lesson.strokeHints || [])); }
    return [...new Set(values.filter(value => typeof value === 'string' && value.trim()))];
  }
  root.WRITING = { render, mount, stop, reset, helpText: COPY.help, get texts() { return texts(); },
    _test: { geometry, atLength, nearest, beginTrace, advanceTrace, traceComplete, clientPoint, normalize, demoDuration, localDay, readProgress, markComplete, selectLesson, selectNeighbor, demonstrate, stopDemonstration, pointerDown, pointerMove, pointerUp, redo, getState: () => clone({ ...state, session: state.session ? { progress: state.session.progress, blocked: state.session.blocked, moves: state.session.moves } : null }), stats: () => ({ timers: timers.size, mounted, generation, pointer: state.pointer }), mountTest: () => { mounted = true; ensureLesson(); }, data: { SIZE, TOLERANCE, START_RADIUS, END_RADIUS, STORE, COPY }, setState: values => Object.assign(state, values) }
  };
})(typeof window !== 'undefined' ? window : globalThis);
