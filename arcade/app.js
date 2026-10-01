(() => {
  'use strict';

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const controls = document.getElementById('game-controls');
  const overlay = document.getElementById('game-overlay');
  const voice = document.getElementById('pocket-voice');
  const listenButton = document.getElementById('listen-button');
  let resumeMusicAfterVoice = false;
  const gameNames = {
    car: {title:'星邮快递', kicker:'🚚 开小车', description:'按住前进，把星星信送进邮箱。', foot:'手机按住前进或后退；飞起来时松手，稳稳落地。', instructions:'按住前进，让小邮车翻过小坡。快飞起来时松开一点，别让车翻倒。把星星信送到邮箱，就过关啦！'},
    rings: {title:'旋环工坊', kicker:'⭕ 转一转', description:'轻点圆环，把开口转到星星。', foot:'点圆环直接转；也可以先选圆环，再点左右转动。', instructions:'轻点一个圆环，它就会转一格。把每一层的开口都转到上面的星星，就成功啦！'},
    colony: {title:'森林搬搬队', kicker:'🐜 搬积木', description:'选一个颜色，把外圈色块搬走。', foot:'先搬能碰到外边的颜色，一层一层清空画布。', instructions:'先选一种颜色，小队会搬走外边能碰到的同色方块。把画布上的方块全部搬完，就过关啦！'},
    parking: {title:'车车出逃', kicker:'🚗 挪车车', description:'顺着车身滑动，让红车到出口。', foot:'先点一辆车，再顺着车身方向滑动。', instructions:'先点一辆车，再顺着车身方向滑动。挪开挡路的车，让红色小车开到右边出口。'},
    bubbles: {title:'泡泡星球', kicker:'🫧 打泡泡', description:'发射泡泡，三个同色就会消失。', foot:'轻点画面瞄准；下方按钮可以换泡泡颜色。', instructions:'轻点画面瞄准并发射泡泡。三个同色泡泡碰在一起就会消失。把泡泡全部清掉吧！'},
    stack: {title:'云上叠塔', kicker:'🏗️ 叠高高', description:'看准重合的时候，轻点放下方块。', foot:'轻点画面或“放下方块”，把每一层稳稳叠好。', instructions:'方块左右移动时，看准它和下面一层重合的时刻，轻点画面把它放下。稳稳叠到目标层数，就过关啦！'}
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

  function updateListenButton(speaking=false) {
    listenButton.classList.toggle('speaking', speaking);
    listenButton.querySelector('span').textContent = speaking ? '👩‍🏫' : '🔊';
    listenButton.querySelector('strong').textContent = speaking ? '老师在讲' : '听玩法';
    listenButton.setAttribute('aria-label', speaking ? '正在讲当前游戏玩法，点一下重新播放' : '听老师讲当前游戏玩法');
  }

  function finishInstructions() {
    updateListenButton(false);
    if (resumeMusicAfterVoice && !app.muted) app.audioCtx?.resume().catch?.(() => {});
    resumeMusicAfterVoice = false;
  }

  function playInstructions(id=app.gameId) {
    if (!gameNames[id]) return;
    try {
      voice.pause();
      voice.currentTime = 0;
      voice.src = `voice/pocket-${id}-intro.mp3?v=1`;
      resumeMusicAfterVoice ||= Boolean(app.audioCtx && app.audioCtx.state === 'running' && !app.muted);
      if (resumeMusicAfterVoice) app.audioCtx.suspend().catch?.(() => {});
      updateListenButton(true);
      voice.play().catch(finishInstructions);
    } catch (_) { finishInstructions(); }
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
    if (scroll) playInstructions(id);
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
  listenButton.addEventListener('click', () => playInstructions());
  voice.addEventListener('ended', finishInstructions);
  voice.addEventListener('error', finishInstructions);
  document.getElementById('help-button').addEventListener('click', () => {
    const game = app.game;
    if (!game) return;
    app.showOverlay({icon:'👩‍🏫', title:'这样玩', message:gameNames[app.gameId].instructions, primary:'我会啦，开始玩', secondary:'重玩本关', onPrimary:()=>{}, onSecondary:()=>game.restart()});
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
