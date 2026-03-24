/* ═══════════════════════════════════════════════════════════════
   js/music-player.js — Player audio ambiance Jaharta
   ═══════════════════════════════════════════════════════════════
   - Injecte un player fixe en bas à droite sur toutes les pages
   - Autoplay silencieux au premier chargement (muted par défaut)
   - Click sur l'icône → unmute + play (contourne les restrictions browser)
   - Persiste muted/volume dans localStorage
   - Source audio : configurer TRACK_URL ci-dessous
   ═══════════════════════════════════════════════════════════════ */

(function() {

  /* ── Config — remplacer par l'URL de la musique ── */
  const TRACKS = [
    /* Ajouter les URLs des fichiers audio Firebase Storage ou externes */
    /* Exemple : 'https://firebasestorage.googleapis.com/...' */
    'gs://jaharta-rp.firebasestorage.app/audio/The Rebel Path.mp3',
  ];

  /* Si aucune track configurée, ne pas afficher le player */
  if (!TRACKS.length) {
    console.info('[MusicPlayer] Aucune track configurée — player masqué.');
    return;
  }

  /* ── État persisté ── */
  const STORAGE_KEY = 'jaharta_music';
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
  function saveState(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
  }

  let state = loadState();
  let muted   = state.muted  !== false; /* muted par défaut */
  let volume  = state.volume ?? 0.35;
  let trackIdx = state.trackIdx ?? 0;
  let playing  = false;

  /* ── Élément audio ── */
  const audio = new Audio();
  audio.loop   = TRACKS.length === 1;
  audio.volume = muted ? 0 : volume;
  audio.src    = TRACKS[trackIdx % TRACKS.length];
  audio.preload = 'auto';

  /* Track suivante à la fin */
  audio.addEventListener('ended', () => {
    if (TRACKS.length > 1) {
      trackIdx = (trackIdx + 1) % TRACKS.length;
      audio.src = TRACKS[trackIdx];
      audio.play().catch(() => {});
    }
  });

  /* ── CSS injecté ── */
  const style = document.createElement('style');
  style.textContent = `
    #jmp {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 8000;
      display: flex;
      align-items: center;
      gap: 0;
      font-family: 'Share Tech Mono', monospace;
      transition: all .3s ease;
    }

    /* Panneau étendu (hover) */
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
    #jmp-btn:hover {
      border-color: #00f5ff;
      box-shadow: 0 0 16px rgba(0,245,255,0.25);
    }
    #jmp-btn svg { width: 16px; height: 16px; }

    /* Barre d'onde animée (visible si playing) */
    #jmp-wave {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 14px;
      position: absolute;
      bottom: 6px;
      left: 50%;
      transform: translateX(-50%);
      opacity: 0;
      transition: opacity .3s;
    }
    #jmp-btn.playing #jmp-wave { opacity: 1; }
    #jmp-btn.playing svg { opacity: 0.25; }
    #jmp-wave span {
      display: block;
      width: 2px;
      background: #00f5ff;
      border-radius: 1px;
      animation: jmp-bar 1.1s ease-in-out infinite;
    }
    #jmp-wave span:nth-child(1) { height: 5px;  animation-delay: 0s;    }
    #jmp-wave span:nth-child(2) { height: 10px; animation-delay: 0.15s; }
    #jmp-wave span:nth-child(3) { height: 7px;  animation-delay: 0.3s;  }
    #jmp-wave span:nth-child(4) { height: 12px; animation-delay: 0.1s;  }
    #jmp-wave span:nth-child(5) { height: 5px;  animation-delay: 0.25s; }
    @keyframes jmp-bar {
      0%,100% { transform: scaleY(1);   opacity: .7; }
      50%      { transform: scaleY(.3); opacity: 1;  }
    }

    /* Panneau volume + track */
    #jmp-panel {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(4,6,15,0.92);
      border: 1px solid rgba(0,245,255,0.2);
      border-right: none;
      padding: 0 14px;
      height: 42px;
      opacity: 0;
      transform: translateX(12px);
      pointer-events: none;
      transition: opacity .25s, transform .25s;
      white-space: nowrap;
    }

    #jmp-label {
      font-size: .52rem;
      letter-spacing: .18em;
      color: rgba(0,245,255,0.5);
      text-transform: uppercase;
      user-select: none;
    }

    #jmp-vol {
      -webkit-appearance: none;
      appearance: none;
      width: 72px;
      height: 2px;
      background: rgba(0,245,255,0.2);
      outline: none;
      cursor: pointer;
    }
    #jmp-vol::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 10px;
      height: 10px;
      background: #00f5ff;
      clip-path: polygon(50% 0%,100% 50%,50% 100%,0% 50%);
      cursor: pointer;
    }
    #jmp-vol::-moz-range-thumb {
      width: 10px;
      height: 10px;
      background: #00f5ff;
      border: none;
      cursor: pointer;
    }

    #jmp-mute {
      font-size: .65rem;
      color: rgba(0,245,255,0.45);
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      line-height: 1;
      transition: color .2s;
      font-family: 'Share Tech Mono', monospace;
    }
    #jmp-mute:hover { color: #00f5ff; }

    @media (max-width: 600px) {
      #jmp { bottom: 14px; right: 14px; }
      #jmp-panel { display: none; }
    }
  `;
  document.head.appendChild(style);

  /* ── HTML injecté ── */
  const wrap = document.createElement('div');
  wrap.id = 'jmp';
  wrap.innerHTML = `
    <div id="jmp-panel">
      <span id="jmp-label">AMBIANCE</span>
      <input type="range" id="jmp-vol" min="0" max="1" step="0.01" value="${volume}">
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

  const btn    = document.getElementById('jmp-btn');
  const volSlider = document.getElementById('jmp-vol');
  const muteBtn   = document.getElementById('jmp-mute');

  /* ── Helpers ── */
  function setPlaying(v) {
    playing = v;
    btn.classList.toggle('playing', v);
  }

  function syncMute() {
    audio.volume = muted ? 0 : volume;
    muteBtn.textContent = muted ? 'OFF' : 'ON';
    muteBtn.style.color = muted ? 'rgba(0,245,255,0.25)' : 'rgba(0,245,255,0.8)';
  }

  /* ── Événements ── */
  btn.addEventListener('click', async () => {
    if (!playing) {
      /* Premier click : unmute + play */
      muted = false;
      syncMute();
      try {
        await audio.play();
        setPlaying(true);
      } catch(e) {
        console.warn('[MusicPlayer] Autoplay bloqué:', e.message);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
    saveState({ muted, volume, trackIdx });
  });

  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    muted = !muted;
    syncMute();
    if (!muted && !playing) {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
    saveState({ muted, volume, trackIdx });
  });

  volSlider.addEventListener('input', (e) => {
    volume = parseFloat(e.target.value);
    if (!muted) audio.volume = volume;
    saveState({ muted, volume, trackIdx });
  });

  /* ── Init visuel ── */
  syncMute();

  /* ── Autoplay silencieux au chargement ── */
  /* Les navigateurs bloquent l'autoplay — on joue uniquement si l'utilisateur
     a déjà interagi (état sauvegardé = non muted depuis une session précédente) */
  if (!muted && state.muted === false) {
    window.addEventListener('click', function tryPlay() {
      audio.play().then(() => setPlaying(true)).catch(() => {});
      window.removeEventListener('click', tryPlay);
    }, { once: true });
  }

})();
