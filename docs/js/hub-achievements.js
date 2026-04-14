/* ══════════════════════════════════════════════════════════════════════
   hub-achievements.js — Onglet Succès du Hub Jaharta

   Mode déterminé automatiquement :
     - Site normal (window._irpMode falsy) → succès NORMAL uniquement
     - Site IRP   (window._irpMode truthy) → succès IRP uniquement

   Containers :
     - Normal : #ach-container  (dans panel-succes)
     - IRP    : #irp-succes-container  (créé par hub-irp.js)
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var RANK_POINTS = {
    F:1,E:2,D:3,C:5,B:8,A:12,S:18,SS:25,SSS:35,X:50,T:70,G:100,'G+':140,Z:200
  };
  var RANK_COLORS = {
    F:'#6b7280',E:'#60a5fa',D:'#34d399',C:'#a78bfa',B:'#f472b6',A:'#fbbf24',
    S:'#f97316',SS:'#ef4444',SSS:'#dc2626',X:'#7c3aed',T:'#06b6d4',G:'#eab308',
    'G+':'#f59e0b',Z:'#ff0055'
  };
  var RANK_ORDER = ['F','E','D','C','B','A','S','SS','SSS','X','T','G','G+','Z'];
  var STAT_LABELS = {
    strength:'STR',agility:'AGI',speed:'SPD',intelligence:'INT',
    mana:'MANA',resistance:'RES',charisma:'CHA',aura:'AURA'
  };

  var _achDefs = null;
  var _userAch = null;
  var _allUsersAch = null;
  var _loaded = false;
  var _showingLeaderboard = false;

  function isIRP() { return !!window._irpMode; }
  function getLabel() { return isIRP() ? 'IRP' : 'NORMAL'; }

  function getContainer() {
    if (isIRP()) {
      return document.getElementById('irp-succes-container') || document.getElementById('ach-container');
    }
    return document.getElementById('ach-container');
  }

  /* ── Firestore loaders ── */
  async function loadDefs() {
    if (_achDefs) return _achDefs;
    try {
      var snap = await db.collection('config').doc('achievements_config').get();
      if (snap.exists) { _achDefs = snap.data(); return _achDefs; }
    } catch (_) {}
    _achDefs = { normal: {}, irp: {} };
    return _achDefs;
  }

  function getDefs() {
    if (!_achDefs) return {};
    return isIRP() ? (_achDefs.irp || {}) : (_achDefs.normal || {});
  }

  async function loadUser() {
    if (!window.UID) return {};
    try {
      var snap = await db.collection('achievements_user').doc(String(UID)).get();
      if (snap.exists) { _userAch = snap.data(); return _userAch; }
    } catch (_) {}
    _userAch = { unlocked: {}, stats: {} };
    return _userAch;
  }

  async function loadAll() {
    if (_allUsersAch) return _allUsersAch;
    try {
      var snaps = await db.collection('achievements_user').get();
      _allUsersAch = {};
      snaps.forEach(function (d) { _allUsersAch[d.id] = d.data(); });
    } catch (_) { _allUsersAch = {}; }
    return _allUsersAch;
  }

  function score(unlocked, defs) {
    var s = 0;
    Object.keys(unlocked || {}).forEach(function (a) { if (defs[a]) s += (RANK_POINTS[defs[a].rank] || 0); });
    return s;
  }

  function bStr(bonus) {
    if (!bonus) return '';
    return Object.entries(bonus).filter(function (e) { return e[1] > 0; })
      .map(function (e) { return '+' + e[1] + ' ' + (STAT_LABELS[e[0]] || e[0]); }).join(', ');
  }

  /* ══════════════════════════════════════════════════════════════════════
     RENDER — main achievement list (current mode only)
     ══════════════════════════════════════════════════════════════════════ */
  async function render() {
    var c = getContainer();
    if (!c) return;

    if (_showingLeaderboard) { await renderLB(); return; }

    if (!_loaded) {
      c.innerHTML = '<div class="ach-loading">Chargement des succès...</div>';
      await loadDefs();
      await loadUser();
      _loaded = true;
    }

    var defs = getDefs();
    var unlocked = (_userAch || {}).unlocked || {};
    var total = Object.keys(defs).length;
    var cnt = Object.keys(unlocked).filter(function (a) { return !!defs[a]; }).length;
    var sc = score(unlocked, defs);
    var label = getLabel();

    /* Group by rank */
    var byRank = {};
    RANK_ORDER.forEach(function (r) { byRank[r] = []; });
    Object.entries(defs).forEach(function (e) {
      var aid = e[0], d = e[1], r = d.rank || 'F';
      if (!byRank[r]) byRank[r] = [];
      byRank[r].push({ id: aid, ...d, isUnlocked: !!unlocked[aid] });
    });

    var h = '';

    /* Header */
    h += '<div class="ach-header">';
    h += '<div class="ach-stats">';
    h += '<div class="ach-stat-box"><div class="ach-stat-val">' + cnt + '/' + total + '</div><div class="ach-stat-label">Débloqués</div></div>';
    h += '<div class="ach-stat-box"><div class="ach-stat-val">' + sc + '</div><div class="ach-stat-label">Score</div></div>';
    h += '</div>';
    h += '<button class="ach-mode-btn ach-lb-btn" onclick="window._achToggleLB()">🏆 Leaderboard</button>';
    h += '</div>';

    /* Total bonus */
    var tb = {};
    Object.keys(unlocked).forEach(function (aid) {
      var d = defs[aid];
      if (d && d.bonus) Object.entries(d.bonus).forEach(function (e) { tb[e[0]] = (tb[e[0]] || 0) + e[1]; });
    });
    var be = Object.entries(tb).filter(function (e) { return e[1] > 0; });
    if (be.length) {
      h += '<div class="ach-total-bonus">Bonus ' + label + ' : ' +
        be.map(function (e) { return '<span class="ach-bonus-tag">+' + e[1] + ' ' + (STAT_LABELS[e[0]] || e[0]) + '</span>'; }).join(' ') + '</div>';
    }

    /* Rank sections */
    RANK_ORDER.forEach(function (rank) {
      var achs = byRank[rank];
      if (!achs || !achs.length) return;
      var col = RANK_COLORS[rank] || '#6b7280';
      var uir = achs.filter(function (a) { return a.isUnlocked; }).length;

      h += '<div class="ach-rank-section">';
      h += '<div class="ach-rank-header" style="border-color:' + col + '">';
      h += '<span class="ach-rank-badge" style="background:' + col + '">' + rank + '</span>';
      h += '<span class="ach-rank-title">Rang ' + rank + '</span>';
      h += '<span class="ach-rank-count">' + uir + '/' + achs.length + '</span>';
      h += '</div>';
      h += '<div class="ach-grid">';

      achs.forEach(function (a) {
        var lk = !a.isUnlocked;
        var cls = 'ach-card' + (lk ? ' locked' : '') + ' rank-' + rank.replace('+', 'plus');
        var icon = a.icon || null;
        var bonus = bStr(a.bonus);

        h += '<div class="' + cls + '" style="--rank-color:' + col + '">';
        h += '<div class="ach-card-icon">';
        if (icon && !lk) h += '<img src="' + icon + '" alt="" class="ach-icon-img">';
        else h += '<div class="ach-icon-placeholder">' + (lk ? '?' : '🏆') + '</div>';
        h += '</div>';
        h += '<div class="ach-card-info">';
        h += '<div class="ach-card-name">' + (lk ? '???' : a.name) + '</div>';
        h += '<div class="ach-card-desc">' + (lk ? 'Succès verrouillé' : a.desc) + '</div>';
        if (!lk && bonus) h += '<div class="ach-card-bonus">' + bonus + '</div>';
        h += '<div class="ach-card-type">' + (a.type === 'owner' ? '👑 Owner' : '⚡ Auto') + '</div>';
        h += '</div></div>';
      });

      h += '</div></div>';
    });

    c.innerHTML = h;
  }

  /* ══════════════════════════════════════════════════════════════════════
     LEADERBOARD — current mode only
     ══════════════════════════════════════════════════════════════════════ */
  async function renderLB() {
    var c = getContainer();
    if (!c) return;
    c.innerHTML = '<div class="ach-loading">Chargement du leaderboard...</div>';

    await loadDefs();
    var allU = await loadAll();
    var defs = getDefs();
    var label = getLabel();

    var scores = [];
    Object.entries(allU).forEach(function (e) {
      var uid = e[0], data = e[1], ul = data.unlocked || {};
      var s = score(ul, defs);
      var n = Object.keys(ul).filter(function (a) { return !!defs[a]; }).length;
      if (s > 0) scores.push({ uid: uid, score: s, count: n });
    });
    scores.sort(function (a, b) { return b.score - a.score; });

    /* Usernames */
    var names = {};
    try {
      var ps = await db.collection('players').get();
      ps.forEach(function (d) { var dd = d.data(); names[d.id] = dd.display_name || dd.username || ('User#' + d.id.slice(-4)); });
    } catch (_) {}

    var h = '';
    h += '<div class="ach-header"><button class="ach-mode-btn" onclick="window._achToggleLB()">← Retour aux succès</button></div>';
    h += '<div class="ach-lb-title">🏆 LEADERBOARD SUCCÈS — ' + label + '</div>';

    if (!scores.length) {
      h += '<div class="ach-lb-empty">Aucun joueur n\'a encore de succès.</div>';
    } else {
      h += '<div class="ach-lb-list">';
      var medals = ['🥇', '🥈', '🥉'];
      scores.slice(0, 25).forEach(function (s, i) {
        var medal = i < 3 ? medals[i] : (i + 1) + '.';
        var name = names[s.uid] || ('User#' + s.uid.slice(-4));
        var isMe = String(s.uid) === String(window.UID);
        var cls = 'ach-lb-row' + (i < 3 ? ' top3' : '') + (isMe ? ' me' : '');
        h += '<div class="' + cls + '">';
        h += '<span class="ach-lb-rank">' + medal + '</span>';
        h += '<span class="ach-lb-name">' + name + '</span>';
        h += '<span class="ach-lb-score">' + s.score + ' pts</span>';
        h += '<span class="ach-lb-count">' + s.count + ' succès</span>';
        h += '</div>';
      });
      h += '</div>';
    }
    c.innerHTML = h;
  }

  /* ── Public ── */
  window._achToggleLB = function () {
    _showingLeaderboard = !_showingLeaderboard;
    _allUsersAch = null;
    render();
  };
  window._achRefresh = function () {
    _showingLeaderboard = false;
    _loaded = false;
    _userAch = null;
    render();
  };

  /* ── Lazy loaders ── */
  /* Normal hub: LAZY.succes */
  if (typeof LAZY !== 'undefined') {
    LAZY.succes = render;
  }
  /* IRP hub: exposed for hub-irp.js override */
  window._renderAchievements = render;

})();
