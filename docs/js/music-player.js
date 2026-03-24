/* ═══════════════════════════════════════════════════════════════
   js/music-player.js — Player audio ambiance Jaharta
   ═══════════════════════════════════════════════════════════════ */

(function () {

  const TRACKS = [
    'https://firebasestorage.googleapis.com/v0/b/jaharta-rp.firebasestorage.app/o/audio%2FThe%20Rebel%20Path.mp3?alt=media&token=3401b5b9-6c2e-47e7-a982-5fd0e8dff5bc',
    'https://firebasestorage.googleapis.com/v0/b/jaharta-rp.firebasestorage.app/o/audio%2F%C3%B8fdream%20-%20thelema%20(slowed%20%26%20bass%20boosted).mp3?alt=media&token=e42405d3-bcd9-4ff5-974e-622d79215bce',
  ];

  /* ── State (sessionStorage = survit à la navigation) ── */
  const SK = 'jmp';
  function load() { try { return JSON.parse(sessionStorage.getItem(SK)) || {}; } catch { return {}; } }
  function save() {
    try {
      sessionStorage.setItem(SK, JSON.stringify({
        idx: trackIdx, vol: volume, muted: muted,
        time: audio.currentTime, playing: playing
      }));
    } catch {}
  }

  let st       = load();
  let trackIdx = st.idx   ?? 0;
  let volume   = st.vol   ?? 0.35;
  let muted    = st.muted !== false;
  let playing  = false;

  /* ── Audio ── */
  const audio   = new Audio();
  audio.volume  = muted ? 0 : volume;
  audio.preload = 'auto';
  audio.src     = TRACKS[trackIdx % TRACKS.length];

  /* Reprendre au bon timestamp si on naviguait */
  if (st.time > 0) {
    audio.addEventListener('loadedmetadata', function () {
      audio.currentTime = Math.min(st.time, audio.duration - 0.5);
    }, { once: true });
  }

  /* Track suivante à la fin */
  audio.addEventListener('ended', () => {
    trackIdx = (trackIdx + 1) % TRACKS.length;
    audio.src = TRACKS[trackIdx];
    audio.play().catch(() => {});
  });

  /* Erreur → piste suivante */
  audio.addEventListener('error', () => {
    if (audio.error && (audio.error.code === 3 || audio.error.code === 4)) {
      trackIdx = (trackIdx + 1) % TRACKS.length;
      audio.src = TRACKS[trackIdx];
      if (playing) audio.play().catch(() => {});
    }
  });

  /* Sauvegarder avant de quitter */
  window.addEventListener('beforeunload', save);

  /* ── CSS ── */
  const style = document.createElement('style');
  style.textContent = `
#jmp{position:fixed;bottom:70px;right:20px;z-index:8000;display:flex;align-items:center;font-family:'Share Tech Mono',monospace;}
#jmp:hover #jmp-panel{opacity:1;transform:translateX(0);pointer-events:all;}
#jmp-btn{width:42px;height:42px;background:rgba(4,6,15,0.92);border:1px solid rgba(0,245,255,0.35);color:#00f5ff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;transition:border-color .2s,box-shadow .2s;clip-path:polygon(8px 0%,100% 0%,100% calc(100% - 8px),calc(100% - 8px) 100%,0% 100%,0% 8px);}
#jmp-btn:hover{border-color:#00f5ff;box-shadow:0 0 16px rgba(0,245,255,0.3);}
#jmp-btn svg{width:16px;height:16px;transition:opacity .3s;}
#jmp-btn.playing svg{opacity:0.15;}
#jmp-wave{display:flex;align-items:flex-end;gap:2px;height:14px;position:absolute;bottom:6px;left:50%;transform:translateX(-50%);opacity:0;transition:opacity .3s;}
#jmp-btn.playing #jmp-wave{opacity:1;}
#jmp-wave span{display:block;width:2px;background:#00f5ff;border-radius:1px;animation:jmpbar 1.1s ease-in-out infinite;}
#jmp-wave span:nth-child(1){height:5px;animation-delay:0s}
#jmp-wave span:nth-child(2){height:10px;animation-delay:.15s}
#jmp-wave span:nth-child(3){height:7px;animation-delay:.3s}
#jmp-wave span:nth-child(4){height:12px;animation-delay:.1s}
#jmp-wave span:nth-child(5){height:5px;animation-delay:.25s}
@keyframes jmpbar{0%,100%{transform:scaleY(1);opacity:.7}50%{transform:scaleY(.3);opacity:1}}
#jmp-panel{display:flex;align-items:center;gap:10px;background:rgba(4,6,15,0.92);border:1px solid rgba(0,245,255,0.2);border-right:none;padding:0 14px;height:42px;opacity:0;transform:translateX(12px);pointer-events:none;transition:opacity .25s,transform .25s;white-space:nowrap;}
#jmp-label{font-size:.52rem;letter-spacing:.18em;color:rgba(0,245,255,0.5);text-transform:uppercase;user-select:none;}
#jmp-vol{-webkit-appearance:none;appearance:none;width:72px;height:2px;background:rgba(0,245,255,0.2);outline:none;cursor:pointer;}
#jmp-vol::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;background:#00f5ff;clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%);cursor:pointer;}
#jmp-vol::-moz-range-thumb{width:10px;height:10px;background:#00f5ff;border:none;cursor:pointer;}
#jmp-mute{font-size:.65rem;color:rgba(0,245,255,0.45);cursor:pointer;background:none;border:none;padding:0;line-height:1;transition:color .2s;font-family:'Share Tech Mono',monospace;}
#jmp-mute:hover{color:#00f5ff;}
@media(max-width:600px){#jmp{bottom:66px;right:14px;}#jmp-panel{display:none;}}
  `;

  /* ── HTML ── */
  const wrap = document.createElement('div');
  wrap.id = 'jmp';
  wrap.innerHTML = `
    <div id="jmp-panel">
      <span id="jmp-label">AMBIANCE</span>
      <input type="range" id="jmp-vol" min="0" max="1" step="0.01" value="${volume}">
      <button id="jmp-mute">-</button>
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

  function inject() {
    document.head.appendChild(style);
    document.body.appendChild(wrap);

    const btn     = document.getElementById('jmp-btn');
    const volEl   = document.getElementById('jmp-vol');
    const muteBtn = document.getElementById('jmp-mute');

    function setPlaying(v) {
      playing = v;
      btn.classList.toggle('playing', v);
      save();
    }

    function syncMute() {
      audio.volume = muted ? 0 : volume;
      muteBtn.textContent = muted ? 'OFF' : 'ON';
      muteBtn.style.color = muted ? 'rgba(0,245,255,0.25)' : 'rgba(0,245,255,0.9)';
    }
    syncMute();

    /* Click play/pause */
    btn.addEventListener('click', async () => {
      if (!playing) {
        muted = false;
        syncMute();
        try {
          await audio.play();
          setPlaying(true);
        } catch (e) {
          console.error('[JMP] play failed:', e.message);
          btn.style.borderColor = '#ff006e';
          setTimeout(() => { btn.style.borderColor = ''; }, 2000);
        }
      } else {
        audio.pause();
        setPlaying(false);
      }
    });

    /* Mute */
    muteBtn.addEventListener('click', e => {
      e.stopPropagation();
      muted = !muted;
      syncMute();
      if (!muted && !playing) {
        audio.play().then(() => setPlaying(true)).catch(() => {});
      }
      save();
    });

    /* Volume */
    volEl.addEventListener('input', e => {
      volume = parseFloat(e.target.value);
      if (!muted) audio.volume = volume;
      save();
    });

    /* Autoplay : reprendre si la session dit qu'on jouait */
    if (st.playing) {
      audio.addEventListener('canplay', function once() {
        audio.removeEventListener('canplay', once);
        muted = false;
        syncMute();
        audio.play().then(() => setPlaying(true)).catch(() => {});
      }, { once: true });
    }

    /* Premier visit : jouer au premier interact */
    if (!st.playing) {
      const tryPlay = async (e) => {
        if (document.getElementById('jmp').contains(e.target)) return;
        document.removeEventListener('click',    tryPlay);
        document.removeEventListener('keydown',  tryPlay);
        document.removeEventListener('touchend', tryPlay);
        try {
          muted = false;
          syncMute();
          await audio.play();
          setPlaying(true);
        } catch {}
      };
      document.addEventListener('click',    tryPlay, { passive: true });
      document.addEventListener('keydown',  tryPlay, { passive: true });
      document.addEventListener('touchend', tryPlay, { passive: true });
    }
  }

  /* Injecter quand le DOM est prêt */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
  }

})();
