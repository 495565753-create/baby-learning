/* 果粒橙小朋友 · 认一认独立交互模块 */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'kid-recognition-progress-v1';
  const DATA_VERSION = 2;
  const LESSON_KEY = 'recognition';
  const LEVELS = [
    { id: 1, icon: '🌱', title: '第一站', text: '先认识身边的我' },
    { id: 2, icon: '🚲', title: '第二站', text: '再去吃饭和出门' },
    { id: 3, icon: '🏫', title: '第三站', text: '看看学习和社区' },
    { id: 4, icon: '🌍', title: '第四站', text: '探索自然和安全' },
    { id: 5, icon: '✨', title: '第五站', text: '和家人认识科技与世界' }
  ];
  const ui = {
    active: false,
    mode: 'hub',
    categoryId: '',
    itemIndex: 0,
    dailyIndex: 0,
    reviewing: false,
    quizLocked: false,
    wrongKey: '',
    timer: 0,
    praiseText: ''
  };
  const swipe = {
    pointerId: null,
    card: null,
    startX: 0,
    startY: 0,
    axis: '',
    blockUntil: 0,
    suppressClickUntil: 0
  };
  let progress = null;

  function data() {
    return root.RECOGNITION || { version: 'missing', categories: [], praise: [] };
  }

  function today() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function safeJson(value, fallback) {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  }

  function uniqueStrings(values) {
    return [...new Set(Array.isArray(values) ? values.filter(x => typeof x === 'string') : [])];
  }

  function loadProgress() {
    const empty = { version: DATA_VERSION, recognized: [], favorites: [], daily: null };
    let saved = empty;
    try { saved = safeJson(localStorage.getItem(STORAGE_KEY) || 'null', empty) || empty; } catch (_) {}
    progress = {
      version: DATA_VERSION,
      recognized: uniqueStrings(saved.recognized),
      favorites: uniqueStrings(saved.favorites),
      daily: saved.version === DATA_VERSION && saved.daily && typeof saved.daily === 'object' ? saved.daily : null
    };
    return progress;
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      return true;
    } catch (_) {
      return false;
    }
  }

  function rootState() {
    try { return typeof state !== 'undefined' ? state : null; } catch (_) { return null; }
  }

  function escapeHtml(value) {
    try { if (typeof esc === 'function') return esc(value); } catch (_) {}
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function stopSpeaking() {
    try { if (typeof stopAudio === 'function') stopAudio(); } catch (_) {}
  }

  function speak(text, onend) {
    stopSpeaking();
    try {
      if (typeof playSpoken === 'function') {
        playSpoken(text, 'zh-CN', onend || null);
        return;
      }
    } catch (_) {}
    if (root.speechSynthesis && root.SpeechSynthesisUtterance) {
      const utterance = new root.SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.82;
      utterance.pitch = 1.06;
      utterance.onend = () => onend?.();
      root.speechSynthesis.cancel();
      root.speechSynthesis.speak(utterance);
    } else {
      onend?.();
    }
  }

  function rerender() {
    resetCategorySwipe();
    try {
      if (typeof render === 'function') {
        render();
        return;
      }
    } catch (_) {}
    const host = root.document?.querySelector?.('#app');
    if (host) {
      host.innerHTML = ui.mode === 'hub' ? renderHub() : renderLesson();
      afterRender();
    }
  }

  function navigate(page, push) {
    try {
      if (typeof go === 'function') {
        go(page, null, push);
        return;
      }
    } catch (_) {}
    rerender();
  }

  function setRootLesson() {
    const shared = rootState();
    if (shared) shared.learn = LESSON_KEY;
  }

  function allEntries() {
    const rows = [];
    data().categories.forEach(category => {
      category.items.forEach((item, index) => rows.push({
        key: `${category.id}/${item.id}`,
        category,
        item,
        index
      }));
    });
    return rows;
  }

  function entryFromKey(key) {
    const slash = String(key || '').indexOf('/');
    if (slash < 1) return null;
    const category = data().categories.find(x => x.id === key.slice(0, slash));
    if (!category) return null;
    const itemId = key.slice(slash + 1);
    const index = category.items.findIndex(x => x.id === itemId);
    return index < 0 ? null : { key, category, item: category.items[index], index };
  }

  function categoryById(id) {
    return data().categories.find(x => x.id === id) || null;
  }

  function hash(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i++) {
      value ^= text.charCodeAt(i);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  function seededOrder(list, seedText) {
    return list.slice().sort((a, b) => {
      const av = hash(`${seedText}|${a.key || a}`);
      const bv = hash(`${seedText}|${b.key || b}`);
      return av - bv || String(a.key || a).localeCompare(String(b.key || b));
    });
  }

  function makeQuestions(entries, date) {
    const questions = [];
    const canQuiz = entry => entry.category.id !== 'family' && entry.category.quiz !== false && entry.item.quiz !== false;
    const safeEntries = entries.filter(canQuiz);
    const fallbackEntries = allEntries().filter(canQuiz);
    const questionTargets = seededOrder(safeEntries.length >= 3 ? safeEntries : fallbackEntries, `${date}|targets`).slice(0, 3);
    questionTargets.forEach((target, questionIndex) => {
      let distractors = safeEntries.filter(x => x.key !== target.key && x.category.id !== target.category.id);
      if (distractors.length < 2) distractors = fallbackEntries.filter(x => x.key !== target.key && x.category.id !== target.category.id);
      if (distractors.length < 2) distractors = fallbackEntries.filter(x => x.key !== target.key);
      distractors = seededOrder(distractors, `${date}|${target.key}|options`).slice(0, 2);
      const options = seededOrder([target, ...distractors], `${date}|${questionIndex}|mix`).map(x => x.key);
      questions.push({ target: target.key, options });
    });
    return questions;
  }

  function makeDaily(date) {
    const known = new Set(progress.recognized);
    const entries = allEntries();
    const fresh = entries.filter(x => !known.has(x.key));
    const source = fresh;
    const selected = [];
    const used = new Set();
    LEVELS.map(level => level.id).forEach(level => {
      const levelEntries = source.filter(x => x.category.level === level);
      const categoryIds = seededOrder(
        [...new Set(levelEntries.map(x => x.category.id))],
        `${date}|level-${level}|categories`
      );
      const queues = categoryIds.map(categoryId => seededOrder(
        levelEntries.filter(x => x.category.id === categoryId),
        `${date}|level-${level}|${categoryId}`
      ));
      let round = 0;
      let added = true;
      while (selected.length < 6 && added) {
        added = false;
        queues.forEach(queue => {
          const entry = queue[round];
          if (entry && selected.length < 6 && !used.has(entry.key)) {
            selected.push(entry);
            used.add(entry.key);
            added = true;
          }
        });
        round += 1;
      }
    });
    if (selected.length < 6) {
      seededOrder(entries, `${date}|fill`).forEach(entry => {
        if (selected.length < 6 && !used.has(entry.key)) {
          selected.push(entry);
          used.add(entry.key);
        }
      });
    }
    return {
      date,
      ids: selected.map(x => x.key),
      seen: [],
      questions: makeQuestions(selected, date),
      quizIndex: 0,
      correct: 0,
      complete: false,
      rewarded: false,
      praiseId: ''
    };
  }

  function normalizeDaily() {
    const date = today();
    const daily = progress.daily;
    const valid = daily && daily.date === date && Array.isArray(daily.ids) && daily.ids.length === 6 &&
      daily.ids.every(key => entryFromKey(key)) && Array.isArray(daily.questions) && daily.questions.length === 3;
    if (!valid) {
      progress.daily = makeDaily(date);
      saveProgress();
    } else {
      daily.seen = uniqueStrings(daily.seen).filter(key => daily.ids.includes(key));
      daily.quizIndex = Math.max(0, Math.min(3, Number(daily.quizIndex) || 0));
      daily.correct = Math.max(0, Math.min(3, Number(daily.correct) || 0));
      daily.complete = Boolean(daily.complete);
      daily.rewarded = Boolean(daily.rewarded);
    }
    return progress.daily;
  }

  function init() {
    if (!progress) loadProgress();
    normalizeDaily();
    return api;
  }

  function atlasStyle(category, index) {
    const col = index % 4;
    const row = Math.floor(index / 4);
    return `--know-atlas:url('assets/recognition-v1/${category.id}.webp');--know-x:${col * 100 / 3}%;--know-y:${row * 50}%;`;
  }

  function picture(entry, className) {
    const direct = className === 'know-category-picture' ? entry.category.cover : entry.item.image;
    if (direct) return `<img class="know-picture know-modern-picture ${className || ''}" src="${escapeHtml(direct)}" loading="lazy" decoding="async" alt="${escapeHtml(entry.item.word)}">`;
    if (className === 'know-category-picture') return `<img class="know-picture know-category-picture" src="assets/recognition-v1/covers/${entry.category.id}.webp" loading="lazy" decoding="async" alt="${escapeHtml(entry.item.word)}">`;
    return `<span class="know-picture ${className || ''}" style="${atlasStyle(entry.category, entry.index)}" role="img" aria-label="${escapeHtml(entry.item.word)}"></span>`;
  }

  function recognizedSet() {
    init();
    return new Set(progress.recognized);
  }

  function markRecognized(key) {
    init();
    if (!entryFromKey(key) || progress.recognized.includes(key)) return;
    progress.recognized.push(key);
    saveProgress();
  }

  function progressFor(category) {
    const known = recognizedSet();
    return category.items.reduce((count, item) => count + (known.has(`${category.id}/${item.id}`) ? 1 : 0), 0);
  }

  function renderFavoriteStrip() {
    const entries = progress.favorites.map(entryFromKey).filter(Boolean);
    if (!entries.length) return '';
    return `<section class="know-favorites" aria-labelledby="knowFavoriteTitle">
      <div class="know-section-title"><span>❤️</span><div><h2 id="knowFavoriteTitle">我喜欢的</h2><p>点图片，再看一次</p></div></div>
      <div class="know-favorite-row">${entries.map(entry => `<button class="know-favorite" onclick="KNOW.actions.openFavorite('${entry.key}')" aria-label="再看${escapeHtml(entry.item.word)}">${picture(entry)}<b>${escapeHtml(entry.item.word)}</b></button>`).join('')}</div>
    </section>`;
  }

  function renderCategory(category) {
    const first = { category, item: category.items[0], index: 0 };
    const done = progressFor(category);
    return `<button class="know-category" onclick="KNOW.openCategory('${category.id}')" aria-label="打开${escapeHtml(category.title)}，已经认识${done}个">
      ${picture(first, 'know-category-picture')}
      <span class="know-category-copy"><b>${category.icon} ${escapeHtml(category.title)}</b><small>${done ? `会 ${done} 个` : '来看看'}</small></span>
      <span class="know-category-arrow" aria-hidden="true">›</span>
    </button>`;
  }

  function renderHub() {
    init();
    ui.active = false;
    ui.mode = 'hub';
    const daily = progress.daily;
    const seenCount = daily.seen.length;
    const finished = daily.complete;
    const totalKnown = progress.recognized.length;
    return `<section class="know-page know-hub">
      <div class="know-welcome">
        <span class="know-teacher" aria-hidden="true">👩🏻‍🏫</span>
        <div><small>果粒橙老师</small><h1>今天认什么？</h1><p>看图片，点一下，我读给你听。</p></div>
        <span class="know-total">⭐ 会 ${totalKnown} 个</span>
      </div>
      <button class="know-daily" onclick="KNOW.openDaily()">
        <span class="know-daily-icon">${finished ? '🏆' : '🎒'}</span>
        <span class="know-daily-copy"><small>今天的小任务</small><b>${finished ? '今天完成啦！' : '今天看 6 张卡片'}</b><span>${finished ? '再看看也可以' : '看卡片，再玩 3 题'}</span></span>
        <span class="know-daily-progress"><strong>${finished ? '✓' : seenCount}</strong><small>${finished ? '完成' : '/ 6'}</small></span>
      </button>
      ${renderFavoriteStrip()}
      <section class="know-modern-feature" aria-labelledby="knowModernTitle">
        <div class="know-section-title"><span>✨</span><div><h2 id="knowModernTitle">科技和世界</h2><p>先看科技，再看屏幕，最后认识地球与和平</p></div></div>
        <div class="know-modern-grid">${data().categories.filter(category => category.modern).map(renderCategory).join('')}</div>
      </section>
      <div class="know-route-title"><span>🗺️</span><div><h2>自由看一看</h2><p>从第一站开始，会更轻松</p></div></div>
      ${LEVELS.map(level => {
        const categories = data().categories.filter(category => category.level === level.id);
        if (!categories.length) return '';
        return `<section class="know-level know-level-${level.id}">
          <div class="know-level-head"><span>${level.icon}</span><div><b>${level.title}</b><small>${level.text}</small></div></div>
          <div class="know-category-grid">${categories.map(renderCategory).join('')}</div>
        </section>`;
      }).join('')}
    </section>`;
  }

  function openLesson(mode) {
    ui.active = true;
    ui.mode = mode;
    ui.reviewing = false;
    ui.quizLocked = false;
    ui.wrongKey = '';
    setRootLesson();
    navigate('lesson', true);
  }

  function openCategory(categoryId, index) {
    init();
    const category = categoryById(categoryId);
    if (!category) return;
    ui.categoryId = categoryId;
    ui.itemIndex = Math.max(0, Math.min(category.items.length - 1, Number(index) || 0));
    openLesson('category');
    speakEntry(currentCategoryEntry());
  }

  function openDaily() {
    init();
    const daily = progress.daily;
    if (daily.complete) {
      ui.praiseText = praiseForDaily(daily);
      openLesson('done');
      speak(ui.praiseText);
      return;
    }
    const firstUnseen = daily.ids.findIndex(key => !daily.seen.includes(key));
    if (firstUnseen >= 0) {
      ui.dailyIndex = firstUnseen;
      openLesson('daily');
      speakEntry(currentDailyEntry());
    } else {
      openLesson('quiz');
      actions.speakQuestion();
    }
  }

  function openModern(topic) {
    init();
    const categories = data().categories.filter(category => category.modern);
    const chosen = categories.find(category => category.id === topic);
    if (chosen) return openCategory(chosen.id);
    for (const category of categories) {
      const query = String(topic || '').replace(/\s/g, '').toLowerCase();
      const index = category.items.findIndex(item => item.id === topic || (query && item.word.replace(/\s/g, '').toLowerCase() === query) || (query === 'ai' && item.word.startsWith('AI ')));
      if (index >= 0) return openCategory(category.id, index);
    }
    if (categories.length) openCategory(categories[0].id);
  }

  function openFavorites() {
    init();
    openLesson('favorites');
  }

  function renderFavorites() {
    const entries = progress.favorites.map(entryFromKey).filter(Boolean);
    return `<section class="know-page know-favorites-page">
      ${lessonNav('❤️ 我喜欢的')}
      <div class="know-favorites-intro"><span aria-hidden="true">❤️</span><h1>我喜欢的卡片</h1><p>${entries.length ? '点一张，老师再讲给你听。' : '看卡片时点一下小爱心，就能放到这里。'}</p></div>
      ${entries.length ? `<div class="know-favorites-grid">${entries.map(entry => `<button class="know-favorite" onclick="KNOW.actions.openFavorite('${entry.key}')" aria-label="再看${escapeHtml(entry.item.word)}">${picture(entry)}<b>${escapeHtml(entry.item.word)}</b></button>`).join('')}</div>` : `<button class="know-listen" onclick="KNOW.backRoot()">🗺️ 去认一认</button>`}
    </section>`;
  }

  function summary() {
    init();
    const entries = allEntries();
    const keys = new Set(entries.map(entry => entry.key));
    return {
      totalItems: entries.length,
      totalCategories: data().categories.length,
      recognizedCount: progress.recognized.filter(key => keys.has(key)).length,
      favoritesCount: progress.favorites.filter(key => keys.has(key)).length,
      dailyLearned: progress.daily.seen.length,
      dailyTarget: progress.daily.ids.length,
      dailyDone: progress.daily.complete
    };
  }

  function lessonNav(label) {
    return `<nav class="know-lesson-nav" aria-label="认一认导航">
      <button onclick="KNOW.backRoot()" aria-label="返回认一认首页"><span>←</span><b>认一认</b></button>
      <strong>${escapeHtml(label)}</strong>
      <button class="know-nav-home" onclick="KNOW.actions.goHome()" aria-label="回到首页">🏠</button>
    </nav>`;
  }

  function renderCategoryLesson() {
    const category = categoryById(ui.categoryId) || data().categories[0];
    if (!category) return renderMissing();
    ui.categoryId = category.id;
    ui.itemIndex = Math.max(0, Math.min(category.items.length - 1, ui.itemIndex));
    const item = category.items[ui.itemIndex];
    const key = `${category.id}/${item.id}`;
    const entry = { category, item, index: ui.itemIndex, key };
    const favorite = progress.favorites.includes(key);
    const known = progress.recognized.includes(key);
    return `<section class="know-page know-lesson-page">
      ${lessonNav(`${category.icon} ${category.title}`)}
      <div class="know-card-count"><span>${known ? '✓ 见过啦' : '新朋友'}</span><small class="know-swipe-hint" aria-hidden="true"><i>👈</i><b>左右滑</b><i>👉</i></small><b>${ui.itemIndex + 1} / ${category.items.length}</b></div>
      <article class="know-big-card know-swipe-card" data-know-category-swipe aria-label="${escapeHtml(item.word)}，可以左右滑动切换">
        <button class="know-image-button" onclick="KNOW.actions.speakCurrent(event)" aria-label="听${escapeHtml(item.word)}的介绍">${picture(entry, 'know-big-picture')}<span>🔊 点图片听一听</span></button>
        <div class="know-word-row"><h1>${escapeHtml(item.word)}</h1><button class="know-heart ${favorite ? 'is-favorite' : ''}" aria-pressed="${favorite}" onclick="KNOW.actions.toggleFavorite()" aria-label="${favorite ? '取消收藏' : '收藏'}${escapeHtml(item.word)}">${favorite ? '❤️' : '🤍'}</button></div>
        <p>${escapeHtml(item.text)}</p>
        <button class="know-listen" onclick="KNOW.actions.speakCurrent()">🔊 听老师说</button>
      </article>
      <div class="know-turns">
        <button onclick="KNOW.actions.turn(-1)"><span>←</span><b>上一个</b></button>
        <button onclick="KNOW.actions.turn(1)"><b>下一个</b><span>→</span></button>
      </div>
    </section>`;
  }

  function renderDailyLesson() {
    const daily = progress.daily;
    const key = daily.ids[Math.max(0, Math.min(5, ui.dailyIndex))];
    const entry = entryFromKey(key);
    if (!entry) return renderMissing();
    const seen = daily.seen.includes(key);
    const favorite = progress.favorites.includes(key);
    return `<section class="know-page know-lesson-page know-daily-page">
      ${lessonNav('🎒 今天的小任务')}
      <div class="know-daily-dots" aria-label="今天六张卡片的进度">${daily.ids.map((id, index) => `<i class="${daily.seen.includes(id) ? 'done' : ''} ${index === ui.dailyIndex ? 'now' : ''}">${daily.seen.includes(id) ? '✓' : index + 1}</i>`).join('')}</div>
      <div class="know-teacher-tip"><span>👩🏻‍🏫</span><p>${seen ? '这位朋友已经见过啦，再听一次也很好。' : '看图片，听老师介绍，认识后点下一张。'}</p></div>
      <article class="know-big-card">
        <button class="know-image-button" onclick="KNOW.actions.speakDaily()" aria-label="听${escapeHtml(entry.item.word)}的介绍">${picture(entry, 'know-big-picture')}<span>🔊 点图片听一听</span></button>
        <div class="know-word-row"><h1>${escapeHtml(entry.item.word)}</h1><button class="know-heart ${favorite ? 'is-favorite' : ''}" aria-pressed="${favorite}" onclick="KNOW.actions.toggleDailyFavorite()" aria-label="${favorite ? '取消收藏' : '收藏'}${escapeHtml(entry.item.word)}">${favorite ? '❤️' : '🤍'}</button></div>
        <p>${escapeHtml(entry.item.text)}</p>
        <button class="know-listen" onclick="KNOW.actions.speakDaily()">🔊 听老师说</button>
      </article>
      <button class="know-next" onclick="KNOW.actions.nextDaily()">${ui.reviewing ? (ui.dailyIndex === daily.ids.length - 1 ? '复习完成' : '再看下一张') : (seen ? '继续下一张' : '认识啦，下一张')} <span>→</span></button>
    </section>`;
  }

  function renderQuiz() {
    init();
    const daily = progress.daily;
    if (daily.complete || daily.quizIndex >= daily.questions.length) return renderDone();
    const question = daily.questions[daily.quizIndex];
    const target = entryFromKey(question.target);
    const options = question.options.map(entryFromKey).filter(Boolean);
    if (!target || options.length !== 3) return renderMissing();
    return `<section class="know-page know-quiz-page">
      ${lessonNav('👀 小眼睛挑战')}
      <div class="know-quiz-head">
        <span class="know-quiz-teacher">👩🏻‍🏫</span>
        <div><small>第 ${daily.quizIndex + 1} / 3 题</small><h1>请找出：${escapeHtml(target.item.word)}</h1><button onclick="KNOW.actions.speakQuestion()">🔊 再听一遍</button></div>
      </div>
      <div class="know-quiz-dots">${daily.questions.map((_, i) => `<i class="${i < daily.quizIndex ? 'done' : ''} ${i === daily.quizIndex ? 'now' : ''}"></i>`).join('')}</div>
      <div class="know-quiz-grid">${options.map(entry => `<button class="know-quiz-choice ${ui.wrongKey === entry.key ? 'wrong' : ''}" onclick="KNOW.actions.answer('${entry.key}')" ${ui.quizLocked ? 'disabled' : ''} aria-label="${escapeHtml(entry.item.word)}">${picture(entry)}<b>${escapeHtml(entry.item.word)}</b><span aria-hidden="true"></span></button>`).join('')}</div>
      <p class="know-quiz-message" id="knowQuizMessage" aria-live="polite">看一看，再点图片</p>
    </section>`;
  }

  function praiseForDaily(daily) {
    const praises = data().praise || [];
    if (!praises.length) return '今天的认一认完成啦，你观察得真仔细！';
    const saved = praises.find(item => item.id === daily.praiseId);
    if (saved) return saved.text;
    return praises[hash(daily.date) % praises.length].text;
  }

  function renderDone() {
    init();
    const daily = progress.daily;
    const praise = ui.praiseText || praiseForDaily(daily);
    return `<section class="know-page know-done-page">
      ${lessonNav('🏆 今天完成啦')}
      <div class="know-confetti" aria-hidden="true"><i>⭐</i><i>🌟</i><i>✨</i></div>
      <div class="know-done-card"><span class="know-done-teacher">👩🏻‍🏫</span><h1>太棒啦！</h1><p>${escapeHtml(praise)}</p><div class="know-done-stars">⭐</div><small>今天得到一颗小星星</small><button class="know-listen" onclick="KNOW.actions.speakPraise()">🔊 听老师表扬</button></div>
      <div class="know-done-actions"><button class="primary" onclick="KNOW.backRoot()">🗺️ 继续看一看</button><button onclick="KNOW.actions.reviewDaily()">🖼️ 再看今天的卡片</button></div>
    </section>`;
  }

  function renderMissing() {
    return `<section class="know-page know-missing">${lessonNav('认一认')}<div><span>🧩</span><h1>图片朋友正在排队</h1><button onclick="KNOW.backRoot()">回去看一看</button></div></section>`;
  }

  function renderLesson() {
    init();
    if (ui.mode === 'favorites') return renderFavorites();
    if (ui.mode === 'daily') return renderDailyLesson();
    if (ui.mode === 'quiz') return renderQuiz();
    if (ui.mode === 'done') return renderDone();
    return renderCategoryLesson();
  }

  function currentCategoryEntry() {
    const category = categoryById(ui.categoryId);
    if (!category) return null;
    const index = Math.max(0, Math.min(category.items.length - 1, ui.itemIndex));
    return { key: `${category.id}/${category.items[index].id}`, category, item: category.items[index], index };
  }

  function currentDailyEntry() {
    const daily = progress?.daily;
    return daily ? entryFromKey(daily.ids[ui.dailyIndex]) : null;
  }

  function speakEntry(entry) {
    if (!entry) return;
    markRecognized(entry.key);
    speak(entry.item.text);
  }

  function toggleFavoriteKey(key) {
    init();
    if (!entryFromKey(key)) return;
    const index = progress.favorites.indexOf(key);
    if (index >= 0) progress.favorites.splice(index, 1);
    else progress.favorites.unshift(key);
    progress.favorites = progress.favorites.slice(0, 24);
    saveProgress();
    rerender();
  }

  function nextDaily() {
    init();
    const daily = progress.daily;
    if (ui.reviewing) {
      stopSpeaking();
      if (ui.dailyIndex < daily.ids.length - 1) {
        ui.dailyIndex += 1;
        rerender();
        speakEntry(currentDailyEntry());
      } else {
        ui.reviewing = false;
        ui.mode = 'done';
        ui.praiseText = praiseForDaily(daily);
        rerender();
        speak(ui.praiseText);
      }
      return;
    }
    const key = daily.ids[ui.dailyIndex];
    markRecognized(key);
    if (!daily.seen.includes(key)) daily.seen.push(key);
    saveProgress();
    const unseen = daily.ids.findIndex((id, index) => index > ui.dailyIndex && !daily.seen.includes(id));
    const anyUnseen = unseen >= 0 ? unseen : daily.ids.findIndex(id => !daily.seen.includes(id));
    if (anyUnseen >= 0) {
      ui.dailyIndex = anyUnseen;
      stopSpeaking();
      rerender();
      speakEntry(currentDailyEntry());
      return;
    }
    ui.mode = 'quiz';
    ui.quizLocked = false;
    ui.wrongKey = '';
    stopSpeaking();
    rerender();
    actions.speakQuestion();
  }

  function finishDaily() {
    const daily = progress.daily;
    if (daily.complete) return;
    daily.complete = true;
    daily.quizIndex = 3;
    daily.ids.forEach(markRecognized);
    const praises = data().praise || [];
    const praise = praises.length ? praises[hash(daily.date) % praises.length] : { id: 'done', text: '今天的认一认完成啦，你观察得真仔细！' };
    daily.praiseId = praise.id;
    ui.praiseText = praise.text;
    let shouldReward = false;
    if (!daily.rewarded) {
      daily.rewarded = true;
      shouldReward = saveProgress();
    } else {
      saveProgress();
    }
    if (shouldReward) {
      try { if (typeof reward === 'function') reward(); } catch (_) {}
    }
    ui.mode = 'done';
    ui.quizLocked = false;
    rerender();
    speak(praise.text);
  }

  function nextQuiz() {
    clearTimeout(ui.timer);
    ui.timer = 0;
    const shared = rootState();
    if (shared && (shared.page !== 'lesson' || shared.learn !== LESSON_KEY)) return;
    const daily = progress.daily;
    if (daily.quizIndex >= daily.questions.length) finishDaily();
    else {
      ui.quizLocked = false;
      ui.wrongKey = '';
      rerender();
      actions.speakQuestion();
    }
  }

  function answer(key) {
    init();
    const daily = progress.daily;
    if (ui.quizLocked || daily.complete) return;
    const question = daily.questions[daily.quizIndex];
    if (!question || !question.options.includes(key)) return;
    if (key !== question.target) {
      ui.wrongKey = key;
      const button = root.document?.querySelector?.(`.know-quiz-choice[onclick*="${key}"]`);
      button?.classList.add('wrong');
      const message = root.document?.querySelector?.('#knowQuizMessage');
      if (message) message.textContent = '差一点，再看一看';
      speak('差一点，再看一看。');
      clearTimeout(ui.timer);
      ui.timer = setTimeout(() => {
        ui.wrongKey = '';
        button?.classList.remove('wrong');
      }, 650);
      return;
    }
    ui.quizLocked = true;
    ui.wrongKey = '';
    for (const choice of root.document?.querySelectorAll?.('.know-quiz-choice, .know-quiz-head button') || []) choice.disabled = true;
    daily.quizIndex += 1;
    daily.correct += 1;
    markRecognized(key);
    saveProgress();
    const button = [...(root.document?.querySelectorAll?.('.know-quiz-choice') || [])].find(node => node.getAttribute('onclick')?.includes(`'${key}'`));
    button?.classList.add('right');
    const message = root.document?.querySelector?.('#knowQuizMessage');
    if (message) message.textContent = daily.quizIndex >= 3 ? '三题都完成啦！' : '找对啦！';
    if (daily.quizIndex >= daily.questions.length) {
      finishDaily();
      return;
    }
    clearTimeout(ui.timer);
    ui.timer = setTimeout(nextQuiz, 4000);
    speak('找对啦！', nextQuiz);
  }

  function turn(delta) {
    resetCategorySwipe();
    const category = categoryById(ui.categoryId);
    if (!category) return;
    stopSpeaking();
    ui.itemIndex = (ui.itemIndex + Number(delta) + category.items.length) % category.items.length;
    rerender();
    speakEntry(currentCategoryEntry());
  }

  function backRoot() {
    const shared = rootState();
    const ownsLesson = shared
      ? shared.page === 'lesson' && shared.learn === LESSON_KEY && ui.active
      : ui.active;
    if (!ownsLesson) return false;
    clearTimeout(ui.timer);
    ui.timer = 0;
    resetCategorySwipe(true);
    stopSpeaking();
    ui.active = false;
    ui.mode = 'hub';
    ui.reviewing = false;
    if (shared && Array.isArray(shared.stack) && shared.stack.at(-1)?.page === 'learn') shared.stack.pop();
    navigate('learn', false);
    return true;
  }

  function goHome() {
    clearTimeout(ui.timer);
    ui.timer = 0;
    resetCategorySwipe(true);
    stopSpeaking();
    ui.active = false;
    ui.mode = 'hub';
    ui.reviewing = false;
    navigate('home', true);
  }

  function reviewDaily() {
    init();
    ui.dailyIndex = 0;
    ui.reviewing = true;
    ui.mode = 'daily';
    ui.active = true;
    rerender();
    speakEntry(currentDailyEntry());
  }

  function openFavorite(key) {
    const entry = entryFromKey(key);
    if (entry) openCategory(entry.category.id, entry.index);
  }

  function swipeTurnFor(dx, dy, width) {
    const x = Number(dx) || 0;
    const y = Number(dy) || 0;
    const cardWidth = Math.max(1, Number(width) || 300);
    const threshold = Math.max(44, Math.min(72, cardWidth * 0.18));
    if (Math.abs(x) < threshold || Math.abs(x) < Math.abs(y) * 1.2) return 0;
    return x < 0 ? 1 : -1;
  }

  function swipeAllowed() {
    const shared = rootState();
    return Boolean(ui.active && ui.mode === 'category' && (!shared || (shared.page === 'lesson' && shared.learn === LESSON_KEY)));
  }

  function resetCategorySwipe(full) {
    const card = swipe.card;
    const pointerId = swipe.pointerId;
    swipe.pointerId = null;
    swipe.card = null;
    swipe.axis = '';
    if (card) {
      try {
        if (pointerId !== null && card.hasPointerCapture?.(pointerId)) card.releasePointerCapture(pointerId);
      } catch (_) {}
      card.classList?.remove('is-swiping');
      card.style?.removeProperty('--know-swipe-x');
    }
    if (full) {
      swipe.blockUntil = 0;
      swipe.suppressClickUntil = 0;
    }
  }

  function swipePointerDown(event) {
    if (!swipeAllowed() || Date.now() < swipe.blockUntil || event.isPrimary === false || (event.button != null && event.button !== 0)) return;
    if (event.target?.closest?.('.know-heart, .know-listen')) return;
    resetCategorySwipe();
    swipe.pointerId = event.pointerId;
    swipe.card = event.currentTarget;
    swipe.startX = event.clientX;
    swipe.startY = event.clientY;
  }

  function swipePointerMove(event) {
    if (event.pointerId !== swipe.pointerId || !swipe.card) return;
    const dx = event.clientX - swipe.startX;
    const dy = event.clientY - swipe.startY;
    if (!swipe.axis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        resetCategorySwipe();
        return;
      }
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      swipe.axis = 'x';
      swipe.card.classList?.add('is-swiping');
      try { swipe.card.setPointerCapture?.(event.pointerId); } catch (_) {}
    }
    if (swipe.axis !== 'x') return;
    if (event.cancelable) event.preventDefault();
    const offset = Math.max(-86, Math.min(86, dx));
    swipe.card.style?.setProperty('--know-swipe-x', `${offset}px`);
  }

  function swipePointerEnd(event) {
    if (event.pointerId !== swipe.pointerId || !swipe.card) return;
    const card = swipe.card;
    const dx = event.clientX - swipe.startX;
    const dy = event.clientY - swipe.startY;
    const wasHorizontal = swipe.axis === 'x' && Math.abs(dx) >= 12;
    const delta = wasHorizontal ? swipeTurnFor(dx, dy, card.getBoundingClientRect?.().width) : 0;
    resetCategorySwipe();
    if (!wasHorizontal) return;
    if (event.cancelable) event.preventDefault();
    swipe.blockUntil = Date.now() + 240;
    swipe.suppressClickUntil = Date.now() + 420;
    if (delta) turn(delta);
  }

  function swipePointerCancel(event) {
    if (event.pointerId === swipe.pointerId) resetCategorySwipe();
  }

  function bindCategorySwipe(card) {
    if (!card || card.dataset?.knowSwipeBound === '1') return false;
    if (card.dataset) card.dataset.knowSwipeBound = '1';
    card.addEventListener?.('pointerdown', swipePointerDown);
    card.addEventListener?.('pointermove', swipePointerMove, { passive: false });
    card.addEventListener?.('pointerup', swipePointerEnd);
    card.addEventListener?.('pointercancel', swipePointerCancel);
    card.addEventListener?.('lostpointercapture', swipePointerCancel);
    return true;
  }

  function afterRender() {
    const shared = rootState();
    const isOpen = Boolean(shared && shared.page === 'lesson' && shared.learn === LESSON_KEY && ui.active);
    if (shared && !isOpen) {
      clearTimeout(ui.timer);
      ui.timer = 0;
    }
    const body = root.document?.body;
    body?.classList?.toggle('recognition-lesson-open', isOpen);
    if (isOpen && ui.mode === 'category') {
      const card = root.document?.querySelector?.('[data-know-category-swipe]');
      if (swipe.card && swipe.card !== card) resetCategorySwipe();
      bindCategorySwipe(card);
    } else resetCategorySwipe(true);
    return isOpen;
  }

  const actions = {
    speakCurrent(event) {
      if (event && Date.now() < swipe.suppressClickUntil) {
        event.preventDefault?.();
        return;
      }
      speakEntry(currentCategoryEntry());
    },
    speakDaily() { speakEntry(currentDailyEntry()); },
    speakQuestion() {
      init();
      if (ui.quizLocked) return;
      const question = progress.daily.questions[progress.daily.quizIndex];
      const target = question ? entryFromKey(question.target) : null;
      if (target) speak(`请找出，${target.item.word}。`);
    },
    speakPraise() { speak(ui.praiseText || praiseForDaily(progress.daily)); },
    turn,
    nextDaily,
    answer,
    toggleFavorite() {
      const entry = currentCategoryEntry();
      if (entry) toggleFavoriteKey(entry.key);
    },
    toggleDailyFavorite() {
      const entry = currentDailyEntry();
      if (entry) toggleFavoriteKey(entry.key);
    },
    openFavorite,
    reviewDaily,
    goHome
  };

  const api = {
    init,
    renderHub,
    renderLesson,
    renderQuiz,
    renderDone,
    openCategory,
    openDaily,
    openModern,
    openFavorites,
    summary,
    backRoot,
    afterRender,
    isActive() { return ui.active; },
    actions,
    _test: {
      atlasStyle,
      entryFromKey,
      swipeTurnFor,
      bindCategorySwipe,
      getProgress() { init(); return JSON.parse(JSON.stringify(progress)); },
      reset() { resetCategorySwipe(true); progress = null; Object.assign(ui, { active: false, mode: 'hub', categoryId: '', itemIndex: 0, dailyIndex: 0, reviewing: false, quizLocked: false, wrongKey: '', praiseText: '' }); }
    }
  };

  root.KNOW = api;
})(window);
