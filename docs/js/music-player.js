/* ═══════════════════════════════════════════════════════════════
   js/music-player.js — Player audio ambiance Jaharta v6
   ═══════════════════════════════════════════════════════════════
   FIX : URLs Firebase sans token (format public), retry + fallback,
         meilleure gestion des erreurs de chargement audio.
   ═══════════════════════════════════════════════════════════════ */
(function () {

  /* ── Tracks ──
     Format public Firebase Storage : sans token d'accès.
     Si vos fichiers sont en accès public dans les Storage Rules,
     les URLs ?alt=media suffisent sans &token=xxx.
     Sinon, régénérez les tokens dans la console Firebase. */
  var TRACKS = [
    'https://firebasestorage.googleapis.com/v0/b/jaharta-rp.firebasestorage.app/o/audio%2FThe%20Rebel%20Path.mp3?alt=media',
    'https://firebasestorage.googleapis.com/v0/b/jaharta-rp.firebasestorage.app/o/audio%2F%C3%B8fdream%20-%20thelema%20(slowed%20%26%20bass%20boosted).mp3?alt=media',
  ];

  /* ── State ── */
  var SK = 'jmp';
  function loadSt() { try { return JSON.parse(sessionStorage.getItem(SK)) || {}; } catch(e) { return {}; } }
  function saveSt() {
    try { sessionStorage.setItem(SK, JSON.stringify({ idx:idx, vol:vol, muted:muted, time:audio.currentTime, playing:playing })); } catch(e) {}
  }
  var st      = loadSt();
  var idx     = st.idx   || 0;
  var vol     = st.vol   != null ? st.vol : 0.35;
  var muted   = st.muted !== false;
  var playing = false;
  var loadError = false;
  var retryCount = 0;
  var MAX_RETRIES = 2;

  /* ── Audio ── */
  var audio   = new Audio();
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';
  audio.volume  = muted ? 0 : vol;

  function loadTrack(trackIdx) {
    audio.src = TRACKS[trackIdx % TRACKS.length];
    loadError = false;
    updateUI();
  }

  loadTrack(idx);

  if (st.time > 2) {
    audio.addEventListener('loadedmetadata', function() {
      if (audio.duration > st.time) audio.currentTime = st.time;
    }, { once: true });
  }

  /* Track ended → next */
  audio.addEventListener('ended', function() {
    idx = (idx + 1) % TRACKS.length;
    retryCount = 0;
    loadTrack(idx);
    audio.play().catch(function(){});
  });

  /* Error handling → retry with token fallback, then skip track */
  audio.addEventListener('error', function() {
    console.warn('[JMP] Erreur chargement audio, piste:', idx, 'tentative:', retryCount + 1);
    loadError = true;
    updateUI();

    if (retryCount < MAX_RETRIES) {
      retryCount++;
      // Retry after a short delay
      setTimeout(function() {
        loadTrack(idx);
        if (playing) audio.play().catch(function(){});
      }, 1500);
    } else {
      // Skip to next track
      console.warn('[JMP] Piste inaccessible, passage à la suivante');
      retryCount = 0;
      idx = (idx + 1) % TRACKS.length;
      loadTrack(idx);
      if (playing) {
        setTimeout(function() {
          audio.play().catch(function(){});
        }, 500);
      }
    }
  });

  /* Can play → clear error state */
  audio.addEventListener('canplay', function() {
    loadError = false;
    retryCount = 0;
    updateUI();
  });

  window.addEventListener('beforeunload', saveSt);

  /* ── CSS ── */
  var s = document.createElement('style');
  s.textContent = [
    '#jmp{position:fixed;bottom:70px;right:20px;z-index:90000;display:flex;align-items:center;font-family:"Exo 2","Share Tech Mono",monospace}',
    '#jmp:hover #jmp-panel{opacity:1;transform:translateX(0);pointer-events:all}',
    '#jmp-btn{width:44px;height:44px;background:rgba(6,6,12,.96);border:1px solid rgba(0,240,255,.5);color:#00f0ff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;transition:border-color .2s,box-shadow .2s;border-radius:2px;backdrop-filter:blur(10px)}',
    '#jmp-btn:hover{border-color:#00f0ff;box-shadow:0 0 20px rgba(0,240,255,.3),0 0 40px rgba(0,240,255,.1)}',
    '#jmp-btn svg{width:16px;height:16px;transition:opacity .3s}',
    '#jmp-btn.playing svg{opacity:.15}',
    '#jmp-btn.error{border-color:rgba(255,48,48,.5);color:#ff3030}',
    '#jmp-btn.loading{border-color:rgba(0,240,255,.3);animation:jmpPulse 1.5s ease-in-out infinite}',
    '@keyframes jmpPulse{0%,100%{opacity:1}50%{opacity:.4}}',
    '#jmp-wave{display:flex;align-items:flex-end;gap:2px;height:14px;position:absolute;bottom:6px;left:50%;transform:translateX(-50%);opacity:0;transition:opacity .3s}',
    '#jmp-btn.playing #jmp-wave{opacity:1}',
    '#jmp-wave span{display:block;width:2px;background:linear-gradient(180deg,#00f0ff,#b44aff);border-radius:1px;animation:jbar 1.1s ease-in-out infinite}',
    '#jmp-wave span:nth-child(1){height:5px;animation-delay:0s}',
    '#jmp-wave span:nth-child(2){height:10px;animation-delay:.15s}',
    '#jmp-wave span:nth-child(3){height:7px;animation-delay:.3s}',
    '#jmp-wave span:nth-child(4){height:12px;animation-delay:.1s}',
    '#jmp-wave span:nth-child(5){height:5px;animation-delay:.25s}',
    '@keyframes jbar{0%,100%{transform:scaleY(1);opacity:.7}50%{transform:scaleY(.3);opacity:1}}',
    '#jmp-panel{display:flex;align-items:center;gap:10px;background:rgba(6,6,12,.92);border:1px solid rgba(0,240,255,.2);border-right:none;padding:0 14px;height:44px;opacity:0;transform:translateX(12px);pointer-events:none;transition:opacity .25s,transform .25s;white-space:nowrap;border-radius:2px 0 0 2px;backdrop-filter:blur(10px)}',
    '#jmp-label{font-size:.52rem;letter-spacing:.18em;color:rgba(0,240,255,.5);text-transform:uppercase;user-select:none;font-family:"Rajdhani",sans-serif;font-weight:500}',
    '#jmp-vol{-webkit-appearance:none;appearance:none;width:72px;height:2px;background:rgba(0,240,255,.2);outline:none;cursor:pointer;border-radius:1px}',
    '#jmp-vol::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;background:#00f0ff;border-radius:2px;cursor:pointer;box-shadow:0 0 6px rgba(0,240,255,.4)}',
    '#jmp-mute{font-size:.6rem;color:rgba(0,240,255,.45);cursor:pointer;background:none;border:none;padding:2px 4px;line-height:1;transition:color .2s;font-family:"Rajdhani",sans-serif;font-weight:600;letter-spacing:.1em}',
    '#jmp-mute:hover{color:#00f0ff}',
    '#jmp-skip{font-size:.55rem;color:rgba(180,74,255,.5);cursor:pointer;background:none;border:none;padding:2px 4px;line-height:1;transition:color .2s;font-family:"Rajdhani",sans-serif;font-weight:600}',
    '#jmp-skip:hover{color:#b44aff}',
    '@media(max-width:600px){#jmp{bottom:66px;right:14px}#jmp-panel{display:none}}',
  ].join('');
  document.head.appendChild(s);

  /* ── HTML ── */
  var wrap = document.createElement('div');
  wrap.id = 'jmp';
  wrap.innerHTML =
    '<div id="jmp-panel">' +
      '<span id="jmp-label">AMBIANCE</span>' +
      '<input type="range" id="jmp-vol" min="0" max="1" step="0.01" value="' + vol + '">' +
      '<button id="jmp-mute">-</button>' +
      '<button id="jmp-skip" title="Piste suivante">▸▸</button>' +
    '</div>' +
    '<button id="jmp-btn" title="Musique">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
        '<path d="M9 18V5l12-2v13"/>' +
        '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' +
      '</svg>' +
      '<div id="jmp-wave"><span></span><span></span><span></span><span></span><span></span></div>' +
    '</button>';

  document.body.appendChild(wrap);

  var btn     = document.getElementById('jmp-btn');
  var volEl   = document.getElementById('jmp-vol');
  var muteBtn = document.getElementById('jmp-mute');
  var skipBtn = document.getElementById('jmp-skip');

  function setPlaying(v) { playing = v; updateUI(); saveSt(); }

  function updateUI() {
    btn.classList.toggle('playing', playing);
    btn.classList.toggle('error', loadError);
    btn.classList.toggle('loading', !loadError && audio.readyState < 3 && playing);
  }

  function syncMute() {
    audio.volume = muted ? 0 : vol;
    muteBtn.textContent = muted ? 'OFF' : 'ON';
    muteBtn.style.color = muted ? 'rgba(0,240,255,.25)' : 'rgba(0,240,255,.9)';
  }
  syncMute();

  function doPlay() {
    muted = false; syncMute();
    return audio.play().then(function() { setPlaying(true); }).catch(function(e) {
      console.warn('[JMP]', e.message);
      // If blocked by autoplay policy, wait for interaction
      if (e.name === 'NotAllowedError') {
        setPlaying(false);
      }
    });
  }

  btn.addEventListener('click', function() {
    if (!playing) {
      if (audio.readyState < 3) {
        btn.classList.add('loading');
        audio.addEventListener('canplay', function() {
          btn.classList.remove('loading');
          doPlay();
        }, { once: true });
        if (!audio.src || loadError) {
          retryCount = 0;
          loadTrack(idx);
        }
        audio.load();
      } else {
        doPlay();
      }
    } else {
      audio.pause(); setPlaying(false);
    }
  });

  muteBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    muted = !muted; syncMute();
    if (!muted && !playing) audio.play().then(function(){ setPlaying(true); }).catch(function(){});
    saveSt();
  });

  skipBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    idx = (idx + 1) % TRACKS.length;
    retryCount = 0;
    loadTrack(idx);
    if (playing) {
      audio.play().catch(function(){});
    }
    saveSt();
  });

  volEl.addEventListener('input', function(e) {
    vol = parseFloat(e.target.value);
    if (!muted) audio.volume = vol;
    saveSt();
  });

  /* ── Autoplay : reprendre si session en cours ── */
  if (st.playing) {
    audio.addEventListener('canplay', function() {
      muted = false; syncMute();
      audio.play().then(function(){ setPlaying(true); }).catch(function(){});
    }, { once: true });
  }

  /* ── Premier visit : jouer au premier interact ── */
  if (!st.playing) {
    function tryPlay(e) {
      if (wrap.contains(e.target)) return;
      document.removeEventListener('click',    tryPlay);
      document.removeEventListener('keydown',  tryPlay);
      document.removeEventListener('touchend', tryPlay);
      muted = false; syncMute();
      if (audio.readyState >= 3) {
        audio.play().then(function(){ setPlaying(true); }).catch(function(){});
      } else {
        audio.addEventListener('canplay', function() {
          audio.play().then(function(){ setPlaying(true); }).catch(function(){});
        }, { once: true });
        audio.load();
      }
    }
    document.addEventListener('click',    tryPlay, { passive: true });
    document.addEventListener('keydown',  tryPlay, { passive: true });
    document.addEventListener('touchend', tryPlay, { passive: true });
  }

})();
