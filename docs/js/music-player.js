/* ═══════════════════════════════════════════════════════════════
   js/music-player.js — Player audio ambiance Jaharta
   - Deux pistes en rotation automatique
   - Lecture continue entre les pages via sessionStorage
   - Player fixe en bas à droite, au-dessus du bouton debug
   ═══════════════════════════════════════════════════════════════ */

(function () {
  /* Attendre que le DOM soit prêt avant d'injecter le player */
  function _init() {

  const TRACKS = [
    'https://firebasestorage.googleapis.com/v0/b/jaharta-rp.firebasestorage.app/o/audio%2FThe%20Rebel%20Path.mp3?alt=media&token=3401b5b9-6c2e-47e7-a982-5fd0e8dff5bc',
    'https://firebasestorage.googleapis.com/v0/b/jaharta-rp.firebasestorage.app/o/audio%2F%C3%B8fdream%20-%20thelema%20(slowed%20%26%20bass%20boosted).mp3?alt=media&token=e42405d3-bcd9-4ff5-974e-622d79215bce',
  ];

  /* ── État persisté en sessionStorage (survit à la navigation) ── */
  const SK = 'jmp_state';
  function load() {
    try { return JSON.parse(sessionStorage.getItem(SK)) || {}; } catch { return {}; }
  }
  function save(s) {
    try { sessionStorage.setItem(SK, JSON.stringify(s)); } catch {}
  }

  let st       = load();
  let trackIdx = st.trackIdx ?? 0;
  let volume   = st.volume   ?? 0.35;
  let muted    = st.muted    !== false; /* muted par défaut */
  let playing  = false;

  /* ── Sauvegarder la position avant navigation ── */
  window.addEventListener('beforeunload', () => {
    save({
      trackIdx,
      volume,
      muted,
      currentTime : audio.currentTime,
      wasPlaying  : playing,
    });
  });

  /* ── Élément audio ── */
  const audio   = new Audio();
  audio.volume  = muted ? 0 : volume;
  audio.preload = 'auto';

  function loadTrack(idx, startTime) {
    audio.src         = TRACKS[idx % TRACKS.length];
    audio.currentTime = 0;
    if (startTime > 0) {
      audio.addEventListener('loadedmetadata', function seek() {
        audio.currentTime = Math.min(startTime, audio.duration - 0.1);
        audio.removeEventListener('loadedmetadata', seek);
      });
    }
  }

  audio.addEventListener('ended', () => {
    trackIdx = (trackIdx + 1) % TRACKS.length;
    loadTrack(trackIdx, 0);
    audio.play().catch(() => {});
    save({ trackIdx, volume, muted, currentTime: 0, wasPlaying: true });
  });

  audio.addEventListener('error', () => {
    const c = audio.error?.code;
    if (c === 3 || c === 4) {
      /* Decode error ou format non supporté → essayer la piste suivante */
      trackIdx = (trackIdx + 1) % TRACKS.length;
      loadTrack(trackIdx, 0);
      if (playing) audio.play().catch(() => {});
    }
  });

  /* ── CSS ── */
  const style = document.createElement('style');
  style.textContent = `
    #jmp {
      position: fixed;
      /* Au-dessus du bouton debug (bottom:16px) avec marge */
      bottom: 70px;
      right: 20px;
      z-index: 8000;
      display: flex;
      align-items: center;
      font-family: 'Share Tech Mono', monospace;
    }
    #jmp:hover #jmp-panel { opacity:1; transform:translateX(0); pointer-events:all; }

    #jmp-btn {
      width: 42px;
      height: 42px;
      background: rgba(4,6,15,0.92);
      border: 1px solid rgba(0,245,255,0.3);
      color: #00f5ff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      clip-path: polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0% 100%,0% 8px);
      flex-shrink: 0;
      position: relative;
      transition: border-color .2s, box-shadow .2s;
    }
    #jmp-btn:hover { border-color:#00f5ff; box-shadow:0 0 16px rgba(0,245,255,0.25); }
    #jmp-btn svg { width:16px; height:16px; }

    /* Barres d'onde animation lecture */
    #jmp-wave {
      display: flex; align-items: flex-end; gap: 2px;
      height: 14px; position: absolute; bottom: 6px;
      left: 50%; transform: translateX(-50%);
      opacity: 0; transition: opacity .3s;
    }
    #jmp-btn.playing #jmp-wave { opacity: 1; }
    #jmp-btn.playing svg { opacity: 0.2; }
    #jmp-wave span {
      display:block; width:2px; background:#00f5ff;
      border-radius:1px; animation: jmp-bar 1.1s ease-in-out infinite;
    }
    #jmp-wave span:nth-child(1){height:5px; animation-delay:0s}
    #jmp-wave span:nth-child(2){height:10px;animation-delay:.15s}
    #jmp-wave span:nth-child(3){height:7px; animation-delay:.3s}
    #jmp-wave span:nth-child(4){height:12px;animation-delay:.1s}
    #jmp-wave span:nth-child(5){height:5px; animation-delay:.25s}
    @keyframes jmp-bar {
      0%,100%{transform:scaleY(1);opacity:.7}
      50%{transform:scaleY(.3);opacity:1}
    }

    /* Panneau étendu au hover */
    #jmp-panel {
      display: flex; align-items: center; gap: 10px;
      background: rgba(4,6,15,0.92);
      border: 1px solid rgba(0,245,255,0.2); border-right: none;
      padding: 0 14px; height: 42px;
      opacity: 0; transform: translateX(12px);
      pointer-events: none;
      transition: opacity .25s, transform .25s;
      white-space: nowrap;
    }
    #jmp-label {
      font-size:.52rem; letter-spacing:.18em;
      color:rgba(0,245,255,0.5); text-transform:uppercase; user-select:none;
    }
    #jmp-vol {
      -webkit-appearance:none; appearance:none;
      width:72px; height:2px;
      background:rgba(0,245,255,0.2); outline:none; cursor:pointer;
    }
    #jmp-vol::-webkit-slider-thumb {
      -webkit-appearance:none; width:10px; height:10px;
      background:#00f5ff;
      clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%);
      cursor:pointer;
    }
    #jmp-vol::-moz-range-thumb {
      width:10px; height:10px; background:#00f5ff; border:none; cursor:pointer;
    }
    #jmp-mute {
      font-size:.65rem; color:rgba(0,245,255,0.45); cursor:pointer;
      background:none; border:none; padding:0; line-height:1;
      transition:color .2s; font-family:'Share Tech Mono',monospace;
    }
    #jmp-mute:hover { color:#00f5ff; }
    @media(max-width:600px){
      #jmp { bottom:66px; right:14px; }
      #jmp-panel { display:none; }
    }
  `;
  document.head.appendChild(style);

  /* ── HTML ── */
  const wrap = document.createElement('div');
  wrap.id = 'jmp';
  wrap.innerHTML = `
    <div id="jmp-panel">
      <span id="jmp-label">AMBIANCE</span>
      <input type="range" id="jmp-vol" min="0" max="1" step="0.01" value="${volume}" title="Volume">
      <button id="jmp-mute">${muted ? 'OFF' : 'ON'}</button>
    </div>
    <button id="jmp-btn" title="Musique d'ambiance">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
      </svg>
      <div id="jmp-wave">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
    </button>
  `;
  document.body.appendChild(wrap);

  const btn     = document.getElementById('jmp-btn');
  const volEl   = document.getElementById('jmp-vol');
  const muteBtn = document.getElementById('jmp-mute');

  function setPlaying(v) {
    playing = v;
    btn.classList.toggle('playing', v);
  }
  function syncMute() {
    audio.volume = muted ? 0 : volume;
    muteBtn.textContent = muted ? 'OFF' : 'ON';
    muteBtn.style.color = muted ? 'rgba(0,245,255,0.25)' : 'rgba(0,245,255,0.8)';
  }

  /* ── Charger la piste (reprendre si même session) ── */
  loadTrack(trackIdx, st.currentTime || 0);
  syncMute();

  /* ── Reprendre automatiquement si on naviguait en jouant ── */
  if (st.wasPlaying) {
    const tryResume = async () => {
      try {
        muted = false;
        syncMute();
        await audio.play();
        setPlaying(true);
      } catch { /* bloqué — l'utilisateur devra cliquer */ }
      document.removeEventListener('click',    tryResume);
      document.removeEventListener('keydown',  tryResume);
      document.removeEventListener('touchend', tryResume);
    };
    /* Tentative immédiate puis sur premier interact */
    audio.addEventListener('canplay', function tryOnce() {
      audio.removeEventListener('canplay', tryOnce);
      tryResume();
    });
    document.addEventListener('click',    tryResume, { passive: true });
    document.addEventListener('keydown',  tryResume, { passive: true });
    document.addEventListener('touchend', tryResume, { passive: true });
  }

  /* ── Click bouton play/pause ── */
  btn.addEventListener('click', async () => {
    if (!playing) {
      muted = false;
      syncMute();
      try {
        await audio.play();
        setPlaying(true);
      } catch (e) {
        console.error('[MusicPlayer] play() échoué:', e.name, e.message);
        btn.style.borderColor = '#ff006e';
        setTimeout(() => { btn.style.borderColor = ''; }, 3000);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
    save({ trackIdx, volume, muted, currentTime: audio.currentTime, wasPlaying: playing });
  });

  muteBtn.addEventListener('click', e => {
    e.stopPropagation();
    muted = !muted;
    syncMute();
    if (!muted && !playing) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
    save({ trackIdx, volume, muted, currentTime: audio.currentTime, wasPlaying: playing });
  });

  volEl.addEventListener('input', e => {
    volume = parseFloat(e.target.value);
    if (!muted) audio.volume = volume;
    save({ trackIdx, volume, muted, currentTime: audio.currentTime, wasPlaying: playing });
  });

  /* ── Autoplay : tenter immédiatement, sinon attendre premier interact ── */
  if (!st.wasPlaying) {
    const tryFirst = async (e) => {
      if (e && document.getElementById('jmp')?.contains(e.target)) return;
      document.removeEventListener('click',    tryFirst);
      document.removeEventListener('keydown',  tryFirst);
      document.removeEventListener('touchend', tryFirst);
      try {
        muted = false; syncMute();
        await audio.play();
        setPlaying(true);
        save({ trackIdx, volume, muted: false, currentTime: 0, wasPlaying: true });
      } catch { /* bloqué par le browser — l'interact va le déclencher */ }
    };
    /* Tenter directement dès que l'audio est prêt */
    audio.addEventListener('canplay', function onReady() {
      audio.removeEventListener('canplay', onReady);
      tryFirst(null);
    }, { once: true });
    /* Fallback : premier interact utilisateur */
    document.addEventListener('click',    tryFirst, { passive: true });
    document.addEventListener('keydown',  tryFirst, { passive: true });
    document.addEventListener('touchend', tryFirst, { passive: true });
  }

  } /* fin _init */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init, { once: true });
  } else {
    _init();
  }

})();
