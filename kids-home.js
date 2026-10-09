/* Direct, picture-led home shortcuts and a curated external video shelf. */
(function (root) {
  'use strict';
  const INTRO = '首页有学写字、故事、认一认、小游戏、老师课堂、画画音乐，还有小影院。点一张喜欢的卡片吧。';
  const CHALLENGE = '小挑战来啦。先选喜欢的游戏，再试试更难的关卡。慢慢想，随时都能重新玩。';
  const VIDEO_INTRO = '小影院里有佩奇、汪汪队，还有科普小短片。请爸爸妈妈陪你一起看。点卡片去央视网，看完回到小乐园。';
  let videoCategory = 'all';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  function readRecent() {
    try {
      const recent = JSON.parse(root.localStorage.getItem('kid-recent-v2') || 'null');
      const book = (root.BOOKS || []).find(item => item.id === recent?.id);
      if (!book) return null;
      return { id: book.id, title: book.title, page: Math.min(Math.max(0, Math.floor(Number(recent.page) || 0)), book.pages.length - 1) };
    } catch { return null; }
  }
  function summary() {
    try { return root.KNOW?.summary?.() || {}; } catch { return {}; }
  }
  function render() {
    const cards = [
      ['🐰','宠物小屋','照顾小伙伴',"COZY.open('pet')",'pet'],
      ['🌱','小小菜园','种菜，收获啦',"COZY.open('garden')",'garden'],
      ['🎨','小小画家','跟着画，自由画','HOME.openArtist()','drawing'],
      ['👑','公主换装','打扮我的公主',"openGame('princess')",'princess'],
      ['📚','听故事','打开就连着讲',"go('stories')",'stories'],
      ['🧩','精选游戏','滑滑，动脑筋',"go('games')",'games']
    ];
    const recent=readRecent();
    return `<section class="home-dashboard home-simple"><div class="hero home-hero"><div><small class="home-greeting">你好，果粒橙小朋友</small><h1>今天想玩什么呀？</h1><p>选一张大卡片，点一下就进去</p></div><button class="home-guide" onclick="HOME.introduce()" aria-label="听首页介绍"><span aria-hidden="true">🐰</span><b>听介绍</b></button></div>
      <div class="home-simple-grid">${cards.map(([icon,title,description,action,name])=>`<button class="big-card home-function-card" data-home-function="${name}" onclick="${action}"><span class="icon" aria-hidden="true">${icon}</span><b>${title}</b><small>${description}</small></button>`).join('')}</div>
      <details class="home-more"><summary>🌈 学一学，还有音乐和动画 <span>⌄</span></summary><div class="home-more-grid"><button onclick="go('learn')">🔎 <b>认一认</b></button><button onclick="go('school')">👩‍🏫 <b>老师课堂</b></button><button class="home-writing-banner" onclick="go('writing')">✍️ <b>学写字</b></button><button onclick="go('piano')">🎹 <b>音乐小琴</b></button><button onclick="HOME.openModern()">🤖 <b>科技世界</b></button><button onclick="go('videos')">🎬 <b>小影院</b></button></div></details>
      ${recent?`<button class="continue home-continue" onclick="HOME.resumeStory()"><span class="resume-icon">📖</span><span><b>接着听故事</b><small>${escape(recent.title)}</small></span><span class="play">▶</span></button>`:''}
    </section>`;
  }
  function videoEntries() {
    const data = Array.isArray(root.KIDS_VIDEOS) ? root.KIDS_VIDEOS : root.KIDS_VIDEOS?.entries || [];
    return data.filter(entry => safeVideoUrl(entry.url));
  }
  function safeVideoUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }
  function renderVideos() {
    const priority = { peppa: 0, paw: 1 };
    const categories = [...(root.KIDS_VIDEO_CATEGORIES || [])].sort((a, b) => (priority[a.id] ?? 2) - (priority[b.id] ?? 2));
    if (videoCategory !== 'all' && !categories.some(category => category.id === videoCategory)) videoCategory = 'all';
    const all = videoEntries();
    const shown = all.filter(entry => videoCategory === 'all' || (entry.category || entry.topic) === videoCategory);
    return `<section class="video-page"><div class="video-welcome"><div><small>果粒橙小影院</small><h1>一起看动画，发现世界</h1><p>佩奇 · 汪汪队 · 科普小短片</p></div><button class="home-guide video-guide" onclick="HOME.introduceVideos()" aria-label="听小影院介绍"><span aria-hidden="true">🎬</span><b>听介绍</b><i aria-hidden="true">🔊</i></button></div>
      <p class="video-parent-note">点卡片会打开视频所在的网站。看完关闭视频页，就能回到小乐园；第三方页面可能有广告或推荐内容。</p>
      <div class="video-filters" role="tablist" aria-label="视频分类">${[{ id: 'all', title: '全部', icon: '🎬' }, ...categories].map(category => `<button role="tab" aria-selected="${category.id === videoCategory}" class="${category.id === videoCategory ? 'active' : ''}" data-video-category="${escape(category.id)}" onclick="HOME.selectVideoCategory(this.dataset.videoCategory)">${escape(category.icon || '▶️')} ${escape(category.title)}</button>`).join('')}</div>
      <div class="video-grid">${shown.map(entry => `<a class="video-card" data-video-topic="${escape(entry.category || entry.topic)}" href="${escape(safeVideoUrl(entry.url))}" target="_blank" rel="noopener noreferrer" aria-label="打开${escape(entry.source)}视频：${escape(entry.title)}"><div class="video-poster" aria-hidden="true"><span>${escape(entry.icon || '🔬')}</span><i>▶</i></div><div class="video-card-copy"><small>${escape(entry.source)}${entry.durationLabel ? ` · ${escape(entry.durationLabel)}` : ''}</small><h2>${escape(entry.title)}</h2><p>${escape(entry.description)}</p>${entry.question ? `<div class="video-question">一起想想：${escape(entry.question)}</div>` : ''}<strong>去${escape(entry.source)}看 ↗</strong></div></a>`).join('')}</div>
      ${shown.length ? '' : '<p class="video-empty">视频正在准备中，先去看看故事和认知卡片吧。</p>'}
      <button class="wide-btn video-home" onclick="go('home')">🏠 回到小乐园</button></section>`;
  }
  root.HOME = {
    render, renderVideos,
    openArtist() { root.stopAudio?.(); root.location.href=root.location.pathname.startsWith('/offline/')?'/offline/artist.html':'/little-artist/index.html'; },
    introduce() { root.speak?.(INTRO); },
    introduceVideos() { root.speak?.(VIDEO_INTRO); },
    openDaily() { root.KNOW?.openDaily ? root.KNOW.openDaily() : root.go('learn'); },
    openModern() { root.KNOW?.openModern ? root.KNOW.openModern() : root.go('learn'); },
    openFavorites() { root.KNOW?.openFavorites ? root.KNOW.openFavorites() : root.go('learn'); },
    openChallenge() {
      if (root.state) { root.state.gameCategory = 'challenge'; root.state.gameMenu = { category: 'challenge', y: 0, rail: 0 }; }
      root.go('games');
      root.speak?.(CHALLENGE);
    },
    openSubject(subject) { root.go('school'); root.showSubject(subject); },
    resumeStory() { const recent = readRecent(); if (recent) root.openBook(recent.id, recent.page); },
    selectVideoCategory(id) { videoCategory = id; root.render(); },
    _test: { readRecent, safeVideoUrl, videoEntries }
  };
})(window);
