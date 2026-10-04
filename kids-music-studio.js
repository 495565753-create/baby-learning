(function (root) {
  'use strict';
  const STORAGE = 'kid-music-works-v1';
  const SCALE = [0, 2, 4, 5, 7, 9, 11, 12];
  const NAMES = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do↑'];
  const COLORS = ['#ed747a', '#edab61', '#dfbf46', '#5dbda0', '#60aada', '#898fd8', '#b08bcb', '#d783b2'];
  const INSTRUMENTS = [{ id: 'piano', icon: '🎹', name: '暖暖钢琴' }, { id: 'bell', icon: '🔔', name: '闪亮钟琴' }, { id: 'flute', icon: '🪈', name: '轻柔小笛' }];
  const TEXT = {
    help: '欢迎来到音乐小屋。滑过彩色琴键，就能弹出音乐。小歌库里可以听歌、跟着亮灯弹。小作曲家里，点音符和小鼓，做一首自己的歌吧。',
    play: '用小手点琴键，也可以滑过去弹。换一种乐器，听听声音有什么不同。',
    songs: '选一首喜欢的小歌。点听一听，可以听完整旋律。点跟着弹，慢慢点发亮的琴键。',
    compose: '先点一个小格子，再选一个音符。点小鼓，就能加上鼓点。做好以后，点循环听听，你就是小作曲家。',
    record: '小录音开始啦。弹一段你喜欢的音乐，弹完以后点完成。',
    saved: '你的音乐作品保存好啦。以后还可以打开，接着创作。',
    finished: '这首小歌弹完啦。你可以再听一次，或者弹自己的音乐。'
  };
  const sources = {
    twinkle: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2236',
    ode: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=528',
    bells: 'https://blogs.loc.gov/music/2010/12/jingle-bells/',
    jacques: 'https://www.loc.gov/item/jukebox-18041/',
    moon: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1111',
    oldTunes: 'https://www.gutenberg.org/files/25432/25432-h/25432-h.htm'
  };
  // Traditional / historical melodies only; these are fresh, single-voice arrangements, not recordings or copied modern arrangements.
  // Score tokens are C-major scale steps (1–8), with a :beat suffix. 0 is a rest; g is the lower G.
  function score(text) {
    return text.trim().split(/\s+/).map(token => {
      const [pitch, rawBeats] = token.split(':');
      return { note: pitch === '0' ? null : ({ g: 55, a: 57, b: 59 }[pitch] ?? 60 + SCALE[Number(pitch) - 1]), beats: Number(rawBeats || 1) };
    });
  }
  const SONGS = [
    { id: 'star', name: '小星星', icon: '⭐', tempo: 100, source: sources.twinkle, kind: '经典童谣', notes: score('1 1 5 5 6 6 5:2 4 4 3 3 2 2 1:2 5 5 4 4 3 3 2:2 5 5 4 4 3 3 2:2 1 1 5 5 6 6 5:2 4 4 3 3 2 2 1:2') },
    { id: 'brother', name: '两只老虎的旋律', icon: '🐯', tempo: 100, source: sources.jacques, kind: '法国传统旋律', notes: score('1 2 3 1 1 2 3 1 3 4 5:2 3 4 5:2 5:.5 6:.5 5:.5 4:.5 3 1 5:.5 6:.5 5:.5 4:.5 3 1 1 g 1:2 1 g 1:2') },
    { id: 'joy', name: '欢乐颂', icon: '🌼', tempo: 104, source: sources.ode, kind: '贝多芬旋律', notes: score('3 3 4 5 5 4 3 2 1 1 2 3 3:1.5 2:.5 2:2 3 3 4 5 5 4 3 2 1 1 2 3 2:1.5 1:.5 1:2 2 2 3 1 2 3:.5 4:.5 3 1 2 3:.5 4:.5 3 2 1 2 g:2 3 3 4 5 5 4 3 2 1 1 2 3 2:1.5 1:.5 1:2') },
    { id: 'jingle', name: '铃儿响叮当', icon: '🛷', tempo: 116, source: sources.bells, kind: '经典节日旋律', notes: score('3 3 3:2 3 3 3:2 3 5 1:1.5 2:.5 3:4 4 4 4:1.5 4:.5 4 3 3 3:.5 3:.5 3 2 2 3 2:2 5:2 3 3 3:2 3 3 3:2 3 5 1:1.5 2:.5 3:4 4 4 4:1.5 4:.5 4 3 3 3:.5 3:.5 5 5 4 2 1:4') },
    { id: 'bridge', name: '伦敦桥', icon: '🌉', tempo: 100, source: sources.oldTunes, kind: '英国传统童谣', notes: score('5:1.5 6:.5 5 4 3 4 5:2 2 3 4:2 3 4 5:2 5:1.5 6:.5 5 4 3 4 5:2 2:2 5:2 3 1:3') },
    { id: 'moon', name: '月光小歌', icon: '🌙', tempo: 86, source: sources.moon, kind: '法国传统童谣', notes: score('1 1 1 2 3:2 2:2 1 3 2 2 1:4 1 1 1 2 3:2 2:2 1 3 2 2 1:4 2 2 2 2 g:2 g:2 2 1 b a g:4 1 1 1 2 3:2 2:2 1 3 2 2 1:4') },
    { id: 'buns', name: '热热的小面包', icon: '🥐', tempo: 100, source: sources.oldTunes, kind: '英国传统童谣', notes: score('3 2 1:2 3 2 1:2 1:.5 1:.5 1:.5 1:.5 2:.5 2:.5 2:.5 2:.5 3 2 1:2 3 2 1:2 3 2 1:2 1:.5 1:.5 1:.5 1:.5 2:.5 2:.5 2:.5 2:.5 3 2 1:2') },
    { id: 'avignon', name: '桥上跳个舞', icon: '💃', tempo: 108, source: sources.oldTunes, kind: '法国传统童谣', notes: score('5 5 6 7 8 8 7 6 5 5 6 7 8:2 5:2 8 8 7 6 5 5 6 7 8 8 7 6 5:2 1:2 5 5 6 7 8 8 7 6 5 5 6 7 8:2 5:2 8 8 7 6 5 5 6 7 8 8 7 6 5:2 1:2') },
    { id: 'rainbow', name: '彩虹小路', icon: '🌈', tempo: 100, kind: '原创小旋律', notes: score('1 3 5 3 2 4 6 4 3 5 8 5 4 6 5:2 5:.5 6:.5 5 3 1 2 3 2:2 1 3 5 8 6 5 3 2 1:4') },
    { id: 'train', name: '小火车出发', icon: '🚂', tempo: 112, kind: '原创小旋律', notes: score('1:.5 1:.5 3 5:.5 5:.5 3 2:.5 2:.5 4 6:.5 6:.5 4 3:.5 3:.5 5 8:.5 8:.5 5 4 3 2:2 1:.5 1:.5 3 5:.5 5:.5 3 2:.5 2:.5 4 6:.5 6:.5 4 5 6 5 3 2 1:3') }
  ];
  const TEMPLATES = [
    { id: 'rainbow', title: '🌈 彩虹', notes: [60, 64, 67, 64, 62, 65, 69, 67], drums: [true, false, false, false, true, false, false, false] },
    { id: 'train', title: '🚂 火车', notes: [60, 60, 67, 67, 64, 64, 62, 60], drums: [true, false, true, false, true, false, true, false] },
    { id: 'moon', title: '🌙 月亮', notes: [60, null, 64, null, 67, null, 64, null], drums: [false, false, false, false, false, false, false, false] }
  ];
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const now = () => root.performance?.now?.() ?? Date.now();
  const baseState = () => ({ mode: 'play', instrument: 'piano', volume: 70, tempo: 100, octave: 0, songId: 'star', transport: '', recording: false, recordStart: 0, events: [], duration: 0, step: 0, grid: clone(TEMPLATES[0]), following: false, followIndex: 0, recordDirty: false, workId: null, workName: '', status: '滑过彩色琴键，弹出自己的音乐' });
  let state = baseState(), host = null, mounted = false, muted = false, context = null, master = null, token = 0, removers = [];
  const timers = new Set(), nodes = new Set(), pointers = new Map(), pressed = new Map(), bufferCache = new Map();
  const schedule = (fn, delay, run = token) => {
    const id = root.setTimeout(() => { timers.delete(id); if (mounted && run === token && !muted) fn(); }, Math.max(0, delay));
    timers.add(id); return id;
  };
  function message(text) { state.status = text; const el = host?.querySelector('[data-ms-status]'); if (el) el.textContent = text; }
  function say(text) { if (!muted && typeof root.speak === 'function') root.speak(text); }
  function cancelSpeech() { if (typeof root.stopAudio === 'function') root.stopAudio(); }
  function listen(el, event, fn, options) { if (!el?.addEventListener) return; el.addEventListener(event, fn, options); removers.push(() => el.removeEventListener(event, fn, options)); }
  function unbind() { removers.forEach(fn => fn()); removers = []; }
  function limiting(value) { return .92 * Math.tanh(value / .92); }
  function frequency(note) { return 440 * 2 ** ((note - 69) / 12); }
  function synthesis(note, duration = 1, instrument = 'piano', sampleRate = 44100) {
    const count = Math.ceil((duration + .06) * sampleRate), out = new Float32Array(count), f = frequency(note);
    const harmonics = instrument === 'bell' ? [[1, .64], [2, .20], [3, .11], [4, .05]] : instrument === 'flute' ? [[1, .88], [2, .08], [3, .04]] : [[1, .67], [2, .21], [3, .085], [4, .035]];
    for (let i = 0; i < count; i++) {
      const t = i / sampleRate, attack = clamp(t / (instrument === 'flute' ? .024 : .008), 0, 1), release = clamp((duration + .06 - t) / .06, 0, 1);
      const decay = instrument === 'flute' ? .90 - .14 * clamp(t / duration, 0, 1) : .2 + .8 * Math.exp(-t * (instrument === 'bell' ? 2.2 : 2.8));
      let wave = 0;
      for (const [multiple, strength] of harmonics) wave += strength * Math.sin(2 * Math.PI * f * multiple * t) * (instrument === 'piano' ? Math.exp(-t * (multiple - 1) * .65) : 1);
      out[i] = .88 * attack * release * decay * wave;
    }
    return out;
  }
  function drumSynthesis(duration = .22, sampleRate = 44100) {
    const out = new Float32Array(Math.ceil(duration * sampleRate));
    for (let i = 0; i < out.length; i++) { const t = i / sampleRate; out[i] = .72 * clamp(t / .004, 0, 1) * Math.exp(-t * 22) * Math.sin(2 * Math.PI * (65 * t + 2.8 * (1 - Math.exp(-t * 32)))); }
    return out;
  }
  async function ensureAudio(run) {
    if (muted || !mounted) return false;
    const C = root.AudioContext || root.webkitAudioContext;
    if (!C) { message('这个浏览器暂时不能弹琴，请换 Safari 或 Chrome 试试'); return false; }
    try {
      if (!context || context.state === 'closed') {
        context = new C(); bufferCache.clear(); master = context.createGain();
        const compressor = context.createDynamicsCompressor(), limiter = context.createWaveShaper();
        compressor.threshold.value = -9; compressor.knee.value = 8; compressor.ratio.value = 12; compressor.attack.value = .003; compressor.release.value = .18;
        const curve = new Float32Array(65536); for (let i = 0; i < curve.length; i++) curve[i] = limiting(i * 2 / (curve.length - 1) - 1);
        limiter.curve = curve; limiter.oversample = '2x'; master.connect(compressor); compressor.connect(limiter); limiter.connect(context.destination); master.gain.value = state.volume / 100;
      }
      if (context.state === 'suspended' || context.state === 'interrupted') await context.resume();
      return run === token && mounted && !muted && context.state === 'running';
    } catch { if (run === token) message('声音还没准备好，再点一个琴键试试'); return false; }
  }
  function audioBuffer(note, duration, instrument) {
    const key = `${note}|${duration}|${instrument}|${context.sampleRate}`;
    if (!bufferCache.has(key)) {
      const values = note === 'drum' ? drumSynthesis(duration, context.sampleRate) : synthesis(note, duration, instrument, context.sampleRate);
      const buffer = context.createBuffer(1, values.length, context.sampleRate); buffer.copyToChannel(values, 0);
      bufferCache.set(key, buffer); if (bufferCache.size > 80) bufferCache.delete(bufferCache.keys().next().value);
    }
    return bufferCache.get(key);
  }
  function emit(note, duration = .65, instrument = state.instrument) {
    if (muted || !mounted || !context || context.state !== 'running') return null;
    while (nodes.size >= 12) release(Array.from(nodes)[0], true);
    const source = context.createBufferSource(), gain = context.createGain(); source.buffer = audioBuffer(note, duration, instrument); source.connect(gain); gain.connect(master);
    const voice = { source, gain, note, ended: false, recordEvent: null, began: now() }; nodes.add(voice);
    source.onended = () => { if (voice.recordEvent && !voice.ended) voice.recordEvent.duration = clamp((now() - voice.began) / 1000, .08, 3); voice.ended = true; nodes.delete(voice); try { source.disconnect(); gain.disconnect(); } catch {} };
    source.start(); return voice;
  }
  function release(voice, immediately = false) {
    if (!voice || voice.ended) return;
    voice.ended = true; nodes.delete(voice);
    try { voice.gain.gain.cancelScheduledValues(context.currentTime); voice.gain.gain.setValueAtTime(voice.gain.gain.value, context.currentTime); voice.gain.gain.linearRampToValueAtTime(0, context.currentTime + (immediately ? 0 : .035)); voice.source.stop(context.currentTime + (immediately ? 0 : .04)); } catch {}
    if (immediately) try { voice.source.disconnect(); voice.gain.disconnect(); } catch {}
    if (voice.recordEvent) voice.recordEvent.duration = clamp((now() - voice.began) / 1000, .08, 3);
  }
  function finishRecording(notify = true) {
    if (!state.recording) return false;
    state.recording = false; state.duration = clamp((now() - state.recordStart) / 1000, .1, 120);
    nodes.forEach(voice => { if (voice.recordEvent) voice.recordEvent.duration = clamp((now() - voice.began) / 1000, .08, 3); });
    state.recordDirty = state.events.length > 0;
    if (notify) message(state.events.length ? `录好了 ${state.events.length} 个音符，点回放听听` : '还没有音符，点开始录音，再弹一弹');
    return true;
  }
  function halt() {
    token++; timers.forEach(id => root.clearTimeout(id)); timers.clear(); const wasRecording = state.recording; finishRecording(false);
    if (wasRecording) state.status = state.events.length ? `录好了 ${state.events.length} 个音符，点回放听听` : '录音已经停好啦，想弹时再点开始';
    nodes.forEach(voice => release(voice, true)); nodes.clear(); pointers.clear(); pressed.clear(); state.transport = ''; state.following = false;
    host?.querySelectorAll('.ms-key.is-lit,.ms-key.is-target,.ms-step.is-playing').forEach(el => el.classList.remove('is-lit', 'is-target', 'is-playing'));
  }
  function stop() { halt(); mounted = false; unbind(); host = null; }
  function setMuted(value) { muted = !!value; if (muted) { halt(); message('声音关掉啦。点上面的喇叭，可以再打开'); refreshControls(); } else if (mounted) message('声音打开啦，点琴键或播放试试'); }
  function setVolume(value) {
    state.volume = clamp(Number(value) || 0, 0, 100);
    if (master && context) { master.gain.cancelScheduledValues(context.currentTime); master.gain.setTargetAtTime(state.volume / 100, context.currentTime, .025); }
    const number = host?.querySelector('[data-ms-volume-value]'); if (number) number.textContent = `${state.volume}%`;
    const input = host?.querySelector('[data-ms-volume]'); if (input && Number(input.value) !== state.volume) input.value = state.volume;
  }
  const noteLabel = note => note == null ? '休息' : `${NAMES[SCALE.indexOf(((note - 60) % 12 + 12) % 12)] || 'do'}${note > 71 ? '↑' : note < 60 ? '↓' : ''}`;
  function noteIndex(note) { return SCALE.indexOf(((note - 60) % 12 + 12) % 12); }
  function pianoMarkup() {
    return `<div class="ms-piano-wrap"><div class="ms-piano-head"><strong>🎹 用手指滑着弹</strong><div class="ms-octaves" aria-label="音高">${[-1, 0, 1].map((oct, i) => `<button data-ms-octave="${oct}" aria-pressed="${state.octave === oct}">${['低音', '中音', '高音'][i]}</button>`).join('')}</div></div><div class="ms-piano" data-ms-piano aria-label="彩色小琴">${SCALE.map((pitch, i) => `<button type="button" class="ms-key" data-ms-note="${60 + 12 * state.octave + pitch}" data-ms-key-index="${i}" style="--key:${COLORS[i]}" aria-label="琴键 ${NAMES[i]}"><span>${['🍓', '🍊', '☀️', '🍀', '💧', '🫐', '🍇', '🌸'][i]}</span><b>${NAMES[i]}</b><small>${i + 1}</small></button>`).join('')}</div><p class="ms-keyboard-hint">电脑也可以按 A S D F G H J K 弹琴</p></div>`;
  }
  function controlsMarkup() {
    return `<div class="ms-sound-controls"><div class="ms-instruments" aria-label="选择乐器">${INSTRUMENTS.map(inst => `<button type="button" data-ms-instrument="${inst.id}" aria-pressed="${state.instrument === inst.id}"><span>${inst.icon}</span><b>${inst.name}</b></button>`).join('')}</div><label class="ms-volume"><span>🔊 音量 <b data-ms-volume-value>${state.volume}%</b></span><input data-ms-volume type="range" min="0" max="100" step="5" value="${state.volume}" aria-label="音乐音量"></label></div>`;
  }
  function recordMarkup() {
    return `<section class="ms-record-card"><div class="ms-card-heading"><div><strong>🎙️ 收集我的旋律</strong><small>录的是你弹的音符，不用麦克风</small></div><span data-ms-record-counter>${state.events.length ? `${state.events.length} 个音符` : '准备好啦'}</span></div><div class="ms-action-row"><button class="ms-primary" data-ms-record>${state.recording ? '■ 完成录音' : '● 开始录音'}</button><button data-ms-replay ${!state.events.length || state.recording ? 'disabled' : ''}>▶ 回放</button><button data-ms-save-record ${!state.events.length || state.recording ? 'disabled' : ''}>💾 保存</button></div></section>`;
  }
  function songsMarkup() {
    const selected = SONGS.find(song => song.id === state.songId) || SONGS[0];
    return `<section class="ms-song-player"><span class="ms-song-icon">${selected.icon}</span><div><strong>${selected.name}</strong><small>${selected.kind} · 完整小旋律</small></div><div class="ms-action-row"><button class="ms-primary" data-ms-listen>▶ 听一听</button><button data-ms-follow>✨ 跟着弹</button><button data-ms-stop>■ 停止</button></div><div class="ms-song-progress" data-ms-song-progress>点听一听，琴键会跟着发亮</div></section>${pianoMarkup()}<div class="ms-song-grid" aria-label="选择小歌">${SONGS.map(song => `<button data-ms-song="${song.id}" aria-pressed="${state.songId === song.id}"><span>${song.icon}</span><b>${song.name}</b><small>${song.kind}</small></button>`).join('')}</div>`;
  }
  function composerMarkup() {
    return `<section class="ms-composer"><div class="ms-card-heading"><div><strong>🎼 我的八拍小乐队</strong><small>点格子选音符，小鼓也能加入</small></div></div><div class="ms-template-row" aria-label="试一段音乐">${TEMPLATES.map(t => `<button data-ms-template="${t.id}">${t.title}</button>`).join('')}<button data-ms-clear-grid>🧹 空白</button></div><div class="ms-steps" aria-label="八拍旋律">${state.grid.notes.map((note, i) => `<div class="ms-step ${state.step === i ? 'is-selected' : ''}" data-ms-step-card="${i}"><button data-ms-step="${i}" aria-label="第 ${i + 1} 拍 ${noteLabel(note)}，选择这格" aria-pressed="${state.step === i}"><small>第 ${i + 1} 拍</small><b>${note == null ? '☁️' : ['🍓', '🍊', '☀️', '🍀', '💧', '🫐', '🍇', '🌸'][note === 72 ? 7 : noteIndex(note)]}</b><span>${noteLabel(note)}</span></button><button class="ms-drum-step" data-ms-drum="${i}" aria-label="第 ${i + 1} 拍加小鼓" aria-pressed="${state.grid.drums[i]}">🥁 ${state.grid.drums[i] ? '咚' : '＋'}</button></div>`).join('')}</div><p class="ms-compose-label">给第 <b>${state.step + 1}</b> 拍选一个音符</p><div class="ms-note-choices">${SCALE.map((pitch, i) => `<button data-ms-compose-note="${60 + pitch}" style="--key:${COLORS[i]}"><b>${NAMES[i]}</b><span>${['🍓', '🍊', '☀️', '🍀', '💧', '🫐', '🍇', '🌸'][i]}</span></button>`).join('')}<button class="ms-rest" data-ms-compose-rest>☁️<b>休息一拍</b></button></div><label class="ms-tempo"><span>🐢 慢一点 <b data-ms-tempo-value>${state.tempo} 拍 / 分</b> 快一点 🐇</span><input data-ms-tempo type="range" min="60" max="140" step="5" value="${state.tempo}" aria-label="小乐队速度"></label><div class="ms-action-row"><button class="ms-primary" data-ms-loop>▶ 循环听听</button><button data-ms-stop>■ 停止</button><button data-ms-save-grid>💾 保存小歌</button></div></section>`;
  }
  function readWorks() {
    try { const values = JSON.parse(root.localStorage?.getItem(STORAGE) || '[]'); return Array.isArray(values) ? values.filter(validWork).slice(0, 16) : []; } catch { return []; }
  }
  function validEvents(events) { return Array.isArray(events) && events.length <= 256 && events.every(event => Number.isFinite(event.at) && event.at >= 0 && event.at <= 120 && Number.isInteger(event.note) && event.note >= 36 && event.note <= 96 && Number.isFinite(event.duration) && event.duration >= .08 && event.duration <= 3 && INSTRUMENTS.some(inst => inst.id === event.instrument)); }
  function validGrid(grid) { return grid && Array.isArray(grid.notes) && grid.notes.length === 8 && grid.notes.every(note => note == null || SCALE.map(pitch => 60 + pitch).includes(note)) && Array.isArray(grid.drums) && grid.drums.length === 8 && grid.drums.every(value => typeof value === 'boolean'); }
  function validWork(work) {
    return work && typeof work.id === 'string' && typeof work.name === 'string' && work.name.length <= 32 && ['record', 'grid'].includes(work.type) && INSTRUMENTS.some(inst => inst.id === work.instrument) && (work.type === 'grid' ? validGrid(work.grid) && Number.isFinite(work.tempo) && work.tempo >= 60 && work.tempo <= 140 : validEvents(work.events) && work.events.length && Number.isFinite(work.duration) && work.duration >= 0 && work.duration <= 120);
  }
  function worksMarkup() {
    const works = readWorks();
    return `<section class="ms-works"><div class="ms-card-heading"><div><strong>💛 我的音乐作品</strong><small>只保存在这台设备，最多 16 首</small></div><span>${works.length} 首</span></div>${works.length ? `<div class="ms-work-list">${works.map(work => `<article class="ms-work"><span>${work.type === 'grid' ? '🎼' : '🎹'}</span><div><b>${esc(work.name)}</b><small>${work.type === 'grid' ? '八拍小乐队' : `${work.events.length} 个音符`}</small></div><div><button data-ms-load="${esc(work.id)}" aria-label="打开 ${esc(work.name)}">打开</button><button data-ms-delete="${esc(work.id)}" aria-label="删除 ${esc(work.name)}">🗑️</button></div></article>`).join('')}</div>` : '<p class="ms-empty">弹一段、编一段，再点保存<br>这里就会留下你的小歌</p>'}</section>`;
  }
  function render() {
    return `<section class="music-studio" data-music-studio><header class="ms-hero"><span>🎹</span><div><small>每个音符，都是你的想象</small><h2>我的音乐小屋</h2></div><button data-ms-help aria-label="听玩法">🔊</button></header><nav class="ms-tabs" aria-label="音乐玩法">${[['play', '🎹', '自由弹'], ['songs', '🎵', '小歌库'], ['compose', '🎼', '小作曲家']].map(([id, icon, name]) => `<button data-ms-mode="${id}" aria-pressed="${state.mode === id}"><span>${icon}</span><b>${name}</b></button>`).join('')}</nav>${controlsMarkup()}<p class="ms-status" data-ms-status role="status" aria-live="polite">${esc(state.status)}</p><div class="ms-panel">${state.mode === 'songs' ? songsMarkup() : state.mode === 'compose' ? composerMarkup() : `${pianoMarkup()}${recordMarkup()}`}</div>${worksMarkup()}<p class="ms-parent-note">音乐音量可以调大，也受手机侧边音量键影响。作品保存在这台设备；清理浏览器数据会清除作品。</p></section>`;
  }
  function paint() {
    if (!mounted || !host) return;
    unbind(); const holder = root.document.createElement('div'); holder.innerHTML = render();
    const next = holder.firstElementChild; host.replaceWith(next); host = next; bind(); refreshControls();
  }
  function refreshControls() {
    const record = host?.querySelector('[data-ms-record]'); if (record) { record.textContent = state.recording ? '■ 完成录音' : '● 开始录音'; record.classList.toggle('is-recording', state.recording); }
    const counter = host?.querySelector('[data-ms-record-counter]'); if (counter) counter.textContent = state.recording ? `🔴 ${state.events.length} 个音符` : state.events.length ? `${state.events.length} 个音符` : '准备好啦';
    for (const selector of ['[data-ms-replay]', '[data-ms-save-record]']) { const el = host?.querySelector(selector); if (el) el.disabled = !state.events.length || state.recording; }
    const loop = host?.querySelector('[data-ms-loop]'); if (loop) loop.textContent = state.transport === 'loop' ? '↻ 正在循环' : '▶ 循环听听';
  }
  function setMode(mode) {
    if (!['play', 'songs', 'compose'].includes(mode)) return false;
    halt(); cancelSpeech(); state.mode = mode; state.status = mode === 'play' ? '滑过彩色琴键，弹出自己的音乐' : mode === 'songs' ? '听一首，或者跟着发亮的琴键慢慢弹' : '选音符、加鼓点，编一首自己的小歌'; paint(); say(TEXT[mode]); return true;
  }
  function setInstrument(instrument) {
    if (!INSTRUMENTS.some(inst => inst.id === instrument)) return false;
    halt(); state.instrument = instrument; paint(); message(`换成${INSTRUMENTS.find(inst => inst.id === instrument).name}啦`); return true;
  }
  function updateOctave(octave) {
    if (![-1, 0, 1].includes(octave)) return;
    state.octave = octave;
    host?.querySelectorAll('[data-ms-key-index]').forEach(el => { const i = Number(el.dataset.msKeyIndex); el.dataset.msNote = String(60 + 12 * octave + SCALE[i]); });
    host?.querySelectorAll('[data-ms-octave]').forEach(el => el.setAttribute('aria-pressed', String(Number(el.dataset.msOctave) === octave)));
  }
  function highlight(note, className = 'is-lit', duration = 300) {
    if (!SCALE.some(pitch => note === 60 + 12 * state.octave + pitch)) { const octave = note < 60 ? -1 : note > 72 ? 1 : 0; updateOctave(octave); }
    const key = host?.querySelector(`[data-ms-note="${note}"]`); if (!key) return;
    key.classList.add(className); if (className === 'is-lit') schedule(() => key.classList.remove(className), duration);
  }
  function followTarget() {
    host?.querySelectorAll('.ms-key.is-target').forEach(el => el.classList.remove('is-target'));
    const song = SONGS.find(item => item.id === state.songId), target = song?.notes[state.followIndex];
    if (!target) { state.following = false; message(TEXT.finished); say(TEXT.finished); return; }
    if (target.note == null) { state.followIndex++; followTarget(); return; }
    highlight(target.note, 'is-target'); const progress = host?.querySelector('[data-ms-song-progress]'); if (progress) progress.textContent = `第 ${state.followIndex + 1} / ${song.notes.length} 个音符 · 点发亮的 ${noteLabel(target.note)}`;
    message('点发亮的琴键，慢慢弹，不着急');
  }
  async function press(note, keyId, sustain = true) {
    if (!Number.isInteger(note) || note < 36 || note > 96 || muted || !mounted) return null;
    if (state.transport) { halt(); refreshControls(); }
    cancelSpeech(); const run = token;
    const holder = { id: keyId, note, voice: null }; pressed.set(keyId, holder);
    if (!await ensureAudio(run) || pressed.get(keyId) !== holder) return null;
    const voice = emit(note, sustain ? 3 : .65); holder.voice = voice;
    if (state.recording && state.events.length < 256 && (now() - state.recordStart) <= 120000) {
      const event = { at: clamp((now() - state.recordStart) / 1000, 0, 120), note, duration: sustain ? .4 : .65, instrument: state.instrument }; state.events.push(event); if (voice) voice.recordEvent = event; refreshControls();
      if (state.events.length === 256) { finishRecording(); refreshControls(); }
    }
    highlight(note, 'is-lit', sustain ? 500 : 400);
    if (state.following) {
      const song = SONGS.find(item => item.id === state.songId); if (song.notes[state.followIndex]?.note === note) { state.followIndex++; followTarget(); }
    } else if (!state.recording) message(`你弹了 ${noteLabel(note)}，接着试试其他琴键`);
    if (!sustain) { pressed.delete(keyId); }
    return voice;
  }
  function lift(keyId) { const holder = pressed.get(keyId); pressed.delete(keyId); if (holder) release(holder.voice); }
  function timeline(notes, tempo) {
    let cursor = 0;
    const events = notes.map(item => { const event = { at: cursor, note: item.note, duration: item.beats * 60 / tempo * .9 }; cursor += item.beats * 60 / tempo; return event; });
    return { events, duration: cursor };
  }
  async function playSong(follow = false) {
    halt(); cancelSpeech(); const song = SONGS.find(item => item.id === state.songId) || SONGS[0]; const run = token;
    if (follow) { state.following = true; state.followIndex = 0; followTarget(); return true; }
    if (!await ensureAudio(run)) return false;
    state.transport = 'song'; const sequence = timeline(song.notes, song.tempo);
    message(`正在听《${song.name}》，琴键也会跟着亮`);
    sequence.events.forEach((event, index) => schedule(() => {
      if (event.note != null) { emit(event.note, event.duration); highlight(event.note, 'is-lit', event.duration * 1000); }
      const progress = host?.querySelector('[data-ms-song-progress]'); if (progress) progress.textContent = `${index + 1} / ${sequence.events.length} 个音符`;
    }, event.at * 1000, run));
    schedule(() => { state.transport = ''; message('小歌听完啦，跟着亮灯弹一遍吧'); }, (sequence.duration + .1) * 1000, run); return true;
  }
  function stopPlayback() { halt(); message('停下来啦。想继续时，再点播放'); refreshControls(); }
  function startRecording() {
    if (state.recording) { finishRecording(); nodes.forEach(voice => release(voice)); refreshControls(); return true; }
    halt(); cancelSpeech(); state.events = []; state.duration = 0; state.recordDirty = false; state.workId = null; state.workName = ''; state.recordStart = now(); state.recording = true;
    message('🔴 正在录音 · 弹完点完成'); say(TEXT.record); refreshControls();
    schedule(() => { finishRecording(); nodes.forEach(voice => release(voice)); refreshControls(); }, 120000); return true;
  }
  async function replay() {
    if (!state.events.length || state.recording) return false;
    halt(); cancelSpeech(); const run = token; if (!await ensureAudio(run)) return false;
    state.transport = 'record'; message('正在回放你的音乐');
    state.events.forEach(event => schedule(() => { emit(event.note, event.duration, event.instrument); highlight(event.note, 'is-lit', event.duration * 1000); }, event.at * 1000, run));
    const length = Math.max(state.duration, ...state.events.map(event => event.at + event.duration));
    schedule(() => { state.transport = ''; message('回放结束啦，这首旋律属于你'); }, (length + .1) * 1000, run); return true;
  }
  function selectStep(index) { if (!Number.isInteger(index) || index < 0 || index > 7) return false; state.step = index; paint(); return true; }
  function putNote(note) {
    if (note !== null && !SCALE.map(pitch => 60 + pitch).includes(note)) return false;
    halt(); state.grid.notes[state.step] = note; state.workId = null; paint(); message(note == null ? `第 ${state.step + 1} 拍，休息一下` : `第 ${state.step + 1} 拍放好 ${noteLabel(note)} 啦`);
    if (note != null) { const run = token; cancelSpeech(); ensureAudio(run).then(ready => { if (ready) emit(note, .45); }); } return true;
  }
  function toggleDrum(index) { if (!Number.isInteger(index) || index < 0 || index > 7) return false; halt(); state.grid.drums[index] = !state.grid.drums[index]; state.workId = null; paint(); return true; }
  function setTempo(value) { state.tempo = clamp(Number(value) || 100, 60, 140); const label = host?.querySelector('[data-ms-tempo-value]'); if (label) label.textContent = `${state.tempo} 拍 / 分`; if (state.transport === 'loop') { halt(); refreshControls(); message('速度换好啦，再点循环听听'); } }
  function useTemplate(id) { const template = TEMPLATES.find(item => item.id === id); if (!template) return false; halt(); state.grid = clone(template); state.step = 0; state.workId = null; state.workName = ''; paint(); message('小旋律准备好啦，改一改，就变成你的歌'); return true; }
  function loopTimeline(grid, tempo) { return grid.notes.map((note, index) => ({ at: index * 60 / tempo, note, drum: grid.drums[index], duration: 60 / tempo * .82 })); }
  async function playLoop() {
    halt(); cancelSpeech(); const run = token;
    if (!state.grid.notes.some(note => note !== null) && !state.grid.drums.some(Boolean)) { message('先放一个音符，或者加一个鼓点吧'); return false; }
    if (!await ensureAudio(run)) return false;
    state.transport = 'loop'; refreshControls(); message('你的小乐队开始啦 · 点停止可以停下来');
    const cycle = () => {
      if (!mounted || muted || run !== token) return;
      const events = loopTimeline(state.grid, state.tempo);
      events.forEach((event, index) => schedule(() => {
        host?.querySelectorAll('.ms-step.is-playing').forEach(el => el.classList.remove('is-playing')); host?.querySelector(`[data-ms-step-card="${index}"]`)?.classList.add('is-playing');
        if (event.note != null) emit(event.note, event.duration); if (event.drum) emit('drum', .22);
      }, event.at * 1000, run));
      schedule(cycle, 8 * 60 / state.tempo * 1000, run);
    };
    cycle(); return true;
  }
  function saveWork(type, name) {
    if (type === 'record' && (!state.events.length || state.recording)) return false;
    if (!['record', 'grid'].includes(type)) return false;
    if (type === 'grid' && !state.grid.notes.some(note => note !== null) && !state.grid.drums.some(Boolean)) { message('先放一个音符，或者加一个鼓点，再保存小歌吧'); return false; }
    const works = readWorks();
    const oldWork = works.find(item => item.id === state.workId), id = oldWork?.type === type ? oldWork.id : `music-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const work = { id, name: String(name || (type === 'grid' ? '我的小乐队' : '我的小旋律')).trim().slice(0, 32) || '我的小歌', type, instrument: state.instrument, saved: Date.now() };
    if (type === 'record') { work.events = clone(state.events); work.duration = clamp(state.duration, 0, 120); } else { work.grid = clone(state.grid); work.tempo = state.tempo; }
    const existing = works.findIndex(item => item.id === work.id); if (existing >= 0) works.splice(existing, 1);
    if (works.length >= 16) { message('已经有 16 首作品啦。先删掉一首，再保存新作品'); return false; }
    works.unshift(work);
    try { if (!root.localStorage) throw Error('storage'); root.localStorage.setItem(STORAGE, JSON.stringify(works)); state.workId = work.id; state.workName = work.name; state.recordDirty = false; paint(); message('作品保存在这台设备啦'); say(TEXT.saved); return work.id; } catch { message('这次没有保存成功，设备空间可能不够。音乐还在，可以再试一次'); return false; }
  }
  function nameDialog(type) {
    if (!host) return;
    halt(); paint();
    const panel = host.querySelector('[data-music-studio]') || host;
    const dialog = root.document.createElement('div'); dialog.className = 'ms-name-dialog'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', '给小歌起个名字');
    dialog.innerHTML = `<form><h3>💛 给小歌起个名字</h3><input maxlength="32" aria-label="作品名字" value="${esc(state.workName || (type === 'grid' ? '我的小乐队' : '我的小旋律'))}"><div class="ms-action-row"><button type="submit" class="ms-primary">💾 保存</button><button type="button" data-ms-cancel-name>返回</button></div><small>作品只保存在这台设备</small></form>`;
    panel.appendChild(dialog); const input = dialog.querySelector('input'), form = dialog.querySelector('form');
    listen(form, 'submit', event => { event.preventDefault(); saveWork(type, input.value); dialog.remove(); }); listen(dialog.querySelector('[data-ms-cancel-name]'), 'click', () => dialog.remove()); input.focus(); input.select();
  }
  function loadWork(id) {
    const work = readWorks().find(item => item.id === id); if (!work) return false;
    halt(); cancelSpeech(); state.workId = work.id; state.workName = work.name; state.instrument = work.instrument;
    if (work.type === 'record') { state.mode = 'play'; state.events = clone(work.events); state.duration = work.duration; state.recordDirty = false; } else { state.mode = 'compose'; state.grid = clone(work.grid); state.tempo = work.tempo; state.step = 0; }
    state.status = `打开《${work.name}》啦，可以继续创作`; paint(); return true;
  }
  function deleteWork(id, confirmed = false) {
    const work = readWorks().find(item => item.id === id); if (!work) return false;
    if (!confirmed && root.confirm && !root.confirm(`要删除《${work.name}》吗？`)) return false;
    try { root.localStorage.setItem(STORAGE, JSON.stringify(readWorks().filter(item => item.id !== id))); if (state.workId === id) { state.workId = null; state.workName = ''; } paint(); message('这首作品已经删除了'); return true; } catch { message('删除没有成功，请再试一次'); return false; }
  }
  function keyAt(event) {
    const element = root.document.elementFromPoint?.(event.clientX, event.clientY) || event.target;
    const key = element?.closest?.('[data-ms-note]'); return key && host?.contains(key) ? key : null;
  }
  function pointerDown(event) {
    const key = keyAt(event); if (!key) return;
    event.preventDefault(); if (state.transport) { halt(); refreshControls(); } const id = `pointer-${event.pointerId}`; pointers.set(event.pointerId, Number(key.dataset.msNote)); event.currentTarget.setPointerCapture?.(event.pointerId); press(Number(key.dataset.msNote), id);
  }
  function pointerMove(event) {
    if (!pointers.has(event.pointerId)) return;
    event.preventDefault(); const key = keyAt(event), old = pointers.get(event.pointerId), next = key ? Number(key.dataset.msNote) : null;
    if (old === next) return; const id = `pointer-${event.pointerId}`; lift(id); pointers.set(event.pointerId, next); if (next != null) press(next, id);
  }
  function pointerUp(event) { if (!pointers.has(event.pointerId)) return; pointers.delete(event.pointerId); lift(`pointer-${event.pointerId}`); try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch {} }
  function keyboardDown(event) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target?.tagName || '') || !['play', 'songs'].includes(state.mode)) return;
    const index = 'asdfghjk'.indexOf(event.key.toLowerCase()); if (index < 0) return; event.preventDefault(); press(60 + 12 * state.octave + SCALE[index], `keyboard-${event.key.toLowerCase()}`);
  }
  function keyboardUp(event) { lift(`keyboard-${event.key.toLowerCase()}`); }
  function bind() {
    host?.querySelectorAll('[data-ms-mode]').forEach(el => listen(el, 'click', () => setMode(el.dataset.msMode)));
    host?.querySelectorAll('[data-ms-instrument]').forEach(el => listen(el, 'click', () => setInstrument(el.dataset.msInstrument)));
    listen(host?.querySelector('[data-ms-volume]'), 'input', event => setVolume(event.target.value));
    listen(host?.querySelector('[data-ms-help]'), 'click', () => { halt(); refreshControls(); say(TEXT.help); });
    const piano = host?.querySelector('[data-ms-piano]'); listen(piano, 'pointerdown', pointerDown); listen(piano, 'pointermove', pointerMove); listen(piano, 'pointerup', pointerUp); listen(piano, 'pointercancel', pointerUp); listen(piano, 'lostpointercapture', pointerUp);
    host?.querySelectorAll('[data-ms-note]').forEach(el => listen(el, 'click', event => { if (event.detail === 0) press(Number(el.dataset.msNote), `accessible-${el.dataset.msNote}`, false); }));
    host?.querySelectorAll('[data-ms-octave]').forEach(el => listen(el, 'click', () => { halt(); updateOctave(Number(el.dataset.msOctave)); refreshControls(); }));
    host?.querySelectorAll('[data-ms-stop]').forEach(el => listen(el, 'click', stopPlayback));
    host?.querySelectorAll('[data-ms-song]').forEach(el => listen(el, 'click', () => { halt(); state.songId = el.dataset.msSong; paint(); message('小歌选好啦，点听一听或跟着弹'); }));
    listen(host?.querySelector('[data-ms-listen]'), 'click', () => playSong(false)); listen(host?.querySelector('[data-ms-follow]'), 'click', () => playSong(true));
    listen(host?.querySelector('[data-ms-record]'), 'click', startRecording); listen(host?.querySelector('[data-ms-replay]'), 'click', replay); listen(host?.querySelector('[data-ms-save-record]'), 'click', () => nameDialog('record'));
    host?.querySelectorAll('[data-ms-step]').forEach(el => listen(el, 'click', () => selectStep(Number(el.dataset.msStep))));
    host?.querySelectorAll('[data-ms-compose-note]').forEach(el => listen(el, 'click', () => putNote(Number(el.dataset.msComposeNote)))); listen(host?.querySelector('[data-ms-compose-rest]'), 'click', () => putNote(null));
    host?.querySelectorAll('[data-ms-drum]').forEach(el => listen(el, 'click', () => toggleDrum(Number(el.dataset.msDrum)))); host?.querySelectorAll('[data-ms-template]').forEach(el => listen(el, 'click', () => useTemplate(el.dataset.msTemplate)));
    listen(host?.querySelector('[data-ms-clear-grid]'), 'click', () => { halt(); state.grid = { notes: Array(8).fill(null), drums: Array(8).fill(false) }; state.step = 0; state.workId = null; state.workName = ''; paint(); message('空白乐谱准备好啦，选格子，放音符'); });
    listen(host?.querySelector('[data-ms-tempo]'), 'input', event => setTempo(event.target.value)); listen(host?.querySelector('[data-ms-loop]'), 'click', playLoop); listen(host?.querySelector('[data-ms-save-grid]'), 'click', () => nameDialog('grid'));
    host?.querySelectorAll('[data-ms-load]').forEach(el => listen(el, 'click', () => loadWork(el.dataset.msLoad))); host?.querySelectorAll('[data-ms-delete]').forEach(el => listen(el, 'click', () => deleteWork(el.dataset.msDelete)));
    listen(root.document, 'keydown', keyboardDown); listen(root.document, 'keyup', keyboardUp);
    listen(root.document, 'visibilitychange', () => { if (root.document.hidden) { halt(); refreshControls(); message('休息一下，回来再点播放'); } });
    listen(root, 'blur', () => { halt(); refreshControls(); }); listen(root, 'pagehide', stop);
  }
  function mount(container) {
    stop(); host = container?.matches?.('[data-music-studio]') ? container : container?.querySelector?.('[data-music-studio]');
    if (!host) return false; if (root.state && typeof root.state.muted === 'boolean') muted = root.state.muted; mounted = true; bind(); refreshControls();
    if (muted) message('声音关掉啦。点上面的喇叭，可以再打开'); else if (state.status.startsWith('声音关掉')) message('声音打开啦，点琴键或播放试试'); return true;
  }
  function reset() { const volume = state.volume; halt(); state = baseState(); state.volume = volume; paint(); message('新的音乐准备好啦，想怎么弹都可以'); return true; }
  root.MUSIC_STUDIO = {
    render, mount, stop, stopPlayback, reset, setMuted, helpText: TEXT.help, texts: Object.values(TEXT), songs: SONGS.map(({ id, name, icon, kind, source }) => ({ id, name, icon, kind, source })),
    _test: { score, timeline, synthesis, drumSynthesis, limiting, frequency, loopTimeline, validEvents, validWork, getState: () => clone(state), stats: () => ({ timers: timers.size, nodes: nodes.size, pointers: pointers.size, pressed: pressed.size, mounted, muted, token }), setMode, setVolume, setTempo, setInstrument, selectStep, putNote, toggleDrum, useTemplate, press, lift, playSong, playLoop, replay, startRecording, finishRecording, saveWork, loadWork, deleteWork, readWorks, updateOctave, pointerDown, pointerMove, pointerUp, setSong: id => { state.songId = id; }, data: { SONGS, TEMPLATES, SCALE, INSTRUMENTS, STORAGE }, mountTest: () => { mounted = true; }, setState: value => { Object.assign(state, value); }, stopPlayback }
  };
})(typeof window !== 'undefined' ? window : globalThis);
