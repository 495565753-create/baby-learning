(() => {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const controls = document.getElementById('game-controls');
  const overlay = document.getElementById('game-overlay');
  const gameNames = {
    car: {title:'星邮快递', kicker:'01 / 物理闯关', description:'轻踩油门、稳住车身，把一封星星信送到终点。', foot:'电脑按 ← → / A D，手机按住下方按钮。翻车后可立即重试。'},
    rings: {title:'旋环工坊', kicker:'02 / 空间解谜', description:'转动机关，让每一层的缺口对准星标。', foot:'点选圆环后使用下方按钮，也可直接轻点圆环使它顺时针转动。'},
    colony: {title:'森林搬搬队', kicker:'03 / 治愈解压', description:'选择颜色，派小队搬走画布边缘的色块。', foot:'点选颜色即可派出小队。先清理外层，再逐步搬出整幅像素画。'},
    parking: {title:'车车出逃', kicker:'04 / 挪车解谜', description:'移动车辆，给红色小车腾出一条出口。', foot:'点一辆车选中，再点方向按钮；也可以沿着车的方向滑动。'},
    bubbles: {title:'泡泡星球', kicker:'05 / 泡泡消除', description:'把同色泡泡凑成三个，让整片星空变清爽。', foot:'点击画面瞄准并发射。下方按钮可切换当前泡泡颜色。'},
    stack: {title:'云上叠塔', kicker:'06 / 节奏挑战', description:'看准时机落下一层，建一座直上云端的小塔。', foot:'点击画面或下方按钮放下方块；电脑也可以按空格。'}
  };

  const app = {
    canvas, ctx, controls,
    game: null,
    gameId: null,
    muted: localStorage.getItem('pocket-muted') === 'yes',
    audioCtx: null,
    musicTimer: null,
    musicIndex: 0,
    nextNoteTime: 0,
    showOverlay({icon='✦', title, message, primary='下一关 →', secondary='再玩一次', onPrimary, onSecondary}) {
      document.getElementById('overlay-icon').textContent = icon;
      document.getElementById('overlay-title').textContent = title;
      document.getElementById('overlay-message').textContent = message;
      document.getElementById('overlay-primary').textContent = primary;
      document.getElementById('overlay-secondary').textContent = secondary;
      document.getElementById('overlay-primary').onclick = () => { app.hideOverlay(); onPrimary?.(); };
      document.getElementById('overlay-secondary').onclick = () => { app.hideOverlay(); onSecondary?.(); };
      overlay.classList.remove('hidden');
    },
    hideOverlay() { overlay.classList.add('hidden'); },
    setStatus(message) { document.getElementById('game-status').textContent = message; },
    setLevel(level) { document.getElementById('level-chip').textContent = `第 ${level} 关`; },
    setScore(message) { document.getElementById('score-chip').textContent = message; },
    sound(frequency=520, duration=.08, type='sine') {
      try { navigator.vibrate?.(12); } catch (_) { /* Vibration is optional. */ }
      if (app.muted) return;
      try {
        unlockAudio();
        if (!app.audioCtx) return;
        const oscillator = app.audioCtx.createOscillator();
        const gain = app.audioCtx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, app.audioCtx.currentTime);
        gain.gain.setValueAtTime(.045, app.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(.001, app.audioCtx.currentTime + duration);
        oscillator.connect(gain).connect(app.audioCtx.destination);
        oscillator.start();
        oscillator.stop(app.audioCtx.currentTime + duration);
      } catch (_) { /* Sound is optional. */ }
    }
  };

  const melody = [60,64,67,64,62,65,69,65,60,64,67,72,69,65,62,67];
  function musicTick() {
    if (!app.audioCtx || app.muted || document.hidden || app.audioCtx.state !== 'running') return;
    const ctx = app.audioCtx;
    if (app.nextNoteTime < ctx.currentTime) app.nextNoteTime = ctx.currentTime + .05;
    while (app.nextNoteTime < ctx.currentTime + .7) {
      const note = melody[app.musicIndex % melody.length];
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
      gain.gain.setValueAtTime(.0001, app.nextNoteTime);
      gain.gain.exponentialRampToValueAtTime(.012, app.nextNoteTime + .04);
      gain.gain.exponentialRampToValueAtTime(.0001, app.nextNoteTime + .34);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(app.nextNoteTime);
      oscillator.stop(app.nextNoteTime + .36);
      app.musicIndex++;
      app.nextNoteTime += .39;
    }
  }
  function unlockAudio() {
    if (app.muted) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      app.audioCtx ||= new AudioContext();
      if (app.audioCtx.state === 'suspended') app.audioCtx.resume();
      if (!app.musicTimer) app.musicTimer = setInterval(musicTick, 250);
      musicTick();
    } catch (_) { /* Audio is optional. */ }
  }

  function updateSoundButton() {
    const button = document.getElementById('sound-toggle');
    button.innerHTML = app.muted ? '♪ <span>音乐关</span>' : '♪ <span>音乐开</span>';
    button.setAttribute('aria-pressed', String(!app.muted));
    button.setAttribute('aria-label', app.muted ? '开启背景音乐和操作音效' : '关闭背景音乐和操作音效');
  }

  function selectGame(id, scroll=true) {
    if (!window.PocketGames?.[id]) return;
    app.game?.destroy?.();
    app.hideOverlay();
    app.gameId = id;
    app.game = new window.PocketGames[id](app);
    document.querySelectorAll('.game-card').forEach(card => {
      const active = card.dataset.game === id;
      card.classList.toggle('active', active);
      card.setAttribute('aria-pressed', String(active));
    });
    document.getElementById('play-kicker').textContent = gameNames[id].kicker;
    document.getElementById('play-title').textContent = gameNames[id].title;
    document.getElementById('play-description').textContent = gameNames[id].description;
    document.getElementById('under-game-text').textContent = gameNames[id].foot;
    controls.replaceChildren();
    app.game.start();
    history.replaceState(null, '', `#${id}`);
    if (scroll) document.getElementById('play').scrollIntoView({behavior:'smooth', block:'start'});
  }

  document.querySelectorAll('.game-card').forEach(card => card.addEventListener('click', () => selectGame(card.dataset.game)));
  document.getElementById('brand-link').addEventListener('click', event => {
    event.preventDefault();
    document.getElementById('home').scrollIntoView({behavior:'smooth'});
  });
  document.getElementById('sound-toggle').addEventListener('click', () => {
    app.muted = !app.muted;
    localStorage.setItem('pocket-muted', app.muted ? 'yes' : 'no');
    if (!app.muted) { app.nextNoteTime = 0; unlockAudio(); }
    updateSoundButton();
  });
  window.addEventListener('pointerdown', unlockAudio, {capture:true});
  window.addEventListener('keydown', unlockAudio, {capture:true});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) app.nextNoteTime = 0; });
  document.getElementById('restart-button').addEventListener('click', () => { app.hideOverlay(); app.game?.restart(); });
  document.getElementById('help-button').addEventListener('click', () => {
    const game = app.game;
    if (!game) return;
    app.showOverlay({icon:'?', title:'怎么玩', message:game.helpText, primary:'明白了，开始玩', secondary:'重玩本关', onPrimary:()=>{}, onSecondary:()=>game.restart()});
  });
  canvas.addEventListener('pointerdown', event => {
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * canvas.width / bounds.width;
    const y = (event.clientY - bounds.top) * canvas.height / bounds.height;
    if (app.game?.pointerUp) canvas.setPointerCapture?.(event.pointerId);
    app.game?.pointerDown?.(x,y,event);
  });
  canvas.addEventListener('pointermove', event => {
    const bounds = canvas.getBoundingClientRect();
    app.game?.pointerMove?.((event.clientX - bounds.left) * canvas.width / bounds.width,(event.clientY - bounds.top) * canvas.height / bounds.height,event);
  });
  canvas.addEventListener('pointerup', event => {
    const bounds = canvas.getBoundingClientRect();
    app.game?.pointerUp?.((event.clientX - bounds.left) * canvas.width / bounds.width,(event.clientY - bounds.top) * canvas.height / bounds.height,event);
  });
  canvas.addEventListener('pointercancel', () => app.game?.pointerCancel?.());
  window.addEventListener('keydown', event => {
    if (!overlay.classList.contains('hidden')) {
      return;
    }
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(event.key)) event.preventDefault();
    app.game?.keyDown?.(event);
  });
  window.addEventListener('keyup', event => app.game?.keyUp?.(event));
  window.addEventListener('blur', () => app.game?.blur?.());

  let previous = performance.now();
  function frame(now) {
    const dt = Math.min(.033, (now - previous) / 1000 || .016);
    previous = now;
    if (app.game) {
      if (overlay.classList.contains('hidden')) app.game.update(dt);
      app.game.render(ctx);
    }
    requestAnimationFrame(frame);
  }
  updateSoundButton();
  selectGame(Object.prototype.hasOwnProperty.call(gameNames,location.hash.slice(1)) ? location.hash.slice(1) : 'car', false);
  requestAnimationFrame(frame);
})();
