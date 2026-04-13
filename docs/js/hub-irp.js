/* ── Hub IRP — Transforme le hub en mode IRP ── */
/* Remplace les onglets et panels quand window._irpMode est actif */
/* Onglets IRP : Dashboard, Personnage, Inventaire, Gacha, Liens, Corruption, Seal, Cour, Universal IRP Shop, Paramètres */
(function () {
  'use strict';

  if (!window._irpMode) return; /* Ne rien faire si pas en mode IRP */

  /* Attendre que le hub soit prêt */
  function waitForHub() {
    if (!document.getElementById('hub-main')) {
      setTimeout(waitForHub, 50);
      return;
    }
    initIRPHub();
  }

  function initIRPHub() {
    /* ── Remplacer le titre de la page ── */
    document.title = 'JAHARTA IRP — Hub';
    var gateLogo = document.querySelector('.gate-logo');
    if (gateLogo) gateLogo.textContent = 'JAHARTA IRP';
    var gateSub = document.querySelector('.gate-sub');
    if (gateSub) gateSub.textContent = '// IRP NEXUS HUB ACCESS //';

    /* ── Remplacer la barre d'onglets ── */
    var hubTabs = document.querySelector('.hub-tabs');
    if (!hubTabs) return;

    var IRP_TABS = [
      { id: 'dashboard',   emoji: '🏠', label: 'Dashboard' },
      { id: 'personnage',  emoji: '👤', label: 'Personnage' },
      { id: 'inventaire',  emoji: '🎒', label: 'Inventaire' },
      { id: 'gacha',       emoji: '🎰', label: 'Gacha IRP' },
      { id: 'liens',       emoji: '⛓️', label: 'Liens' },
      { id: 'corruption',  emoji: '☠️', label: 'Corruption' },
      { id: 'seal',        emoji: '👁️', label: 'Seal' },
      { id: 'cour',        emoji: '👑', label: 'Cour' },
      { id: 'ushop',       emoji: '🛒', label: 'IRP Shop' },
      { id: 'parametres',  emoji: '⚙️', label: 'Paramètres' },
    ];

    var tabsHTML = '<a href="index.html" class="tab-btn" style="text-decoration:none;border-bottom:none;opacity:.55" title="Retour au site">← <span class="tab-text">Site</span></a>';
    tabsHTML += '<div style="width:1px;background:var(--border);margin:10px 0;flex-shrink:0"></div>';

    IRP_TABS.forEach(function (t, i) {
      var active = i === 0 ? ' active' : '';
      tabsHTML += '<button class="tab-btn' + active + '" onclick="showTab(\'' + t.id + '\')" id="tab-' + t.id + '">' +
        t.emoji + ' <span class="tab-text">' + t.label + '</span></button>';
    });
    hubTabs.innerHTML = tabsHTML;

    /* ── Cacher les panels normaux qui n'existent pas en IRP ── */
    var normalOnlyPanels = ['party', 'progression', 'titres', 'compagnons', 'monshop', 'shops'];
    normalOnlyPanels.forEach(function (id) {
      var panel = document.getElementById('panel-' + id);
      if (panel) panel.style.display = 'none';
    });

    /* ── Créer les panels IRP manquants ── */
    var hubMain = document.getElementById('hub-main');

    /* Panel Liens */
    if (!document.getElementById('panel-liens')) {
      var liensPanel = document.createElement('div');
      liensPanel.className = 'tab-panel';
      liensPanel.id = 'panel-liens';
      liensPanel.innerHTML = '<div class="sh"><span class="sh-num">05</span><span class="sh-title">Liens IRP</span><div class="sh-line"></div></div>' +
        '<div id="irp-liens-container"><div class="empty-state" style="text-align:center;padding:40px;color:var(--text2)">Chargement des liens...</div></div>';
      hubMain.appendChild(liensPanel);
    }

    /* Panel Corruption */
    if (!document.getElementById('panel-corruption')) {
      var corrPanel = document.createElement('div');
      corrPanel.className = 'tab-panel';
      corrPanel.id = 'panel-corruption';
      corrPanel.innerHTML = '<div class="sh"><span class="sh-num">06</span><span class="sh-title">Corruption</span><div class="sh-line"></div></div>' +
        '<div id="irp-corruption-container"><div class="empty-state" style="text-align:center;padding:40px;color:var(--text2)">Chargement...</div></div>';
      hubMain.appendChild(corrPanel);
    }

    /* Panel Seal */
    if (!document.getElementById('panel-seal')) {
      var sealPanel = document.createElement('div');
      sealPanel.className = 'tab-panel';
      sealPanel.id = 'panel-seal';
      sealPanel.innerHTML = '<div class="sh"><span class="sh-num">07</span><span class="sh-title">Seal of Dominion</span><div class="sh-line"></div></div>' +
        '<div id="irp-seal-container"><div class="empty-state" style="text-align:center;padding:40px;color:var(--text2)">Chargement...</div></div>';
      hubMain.appendChild(sealPanel);
    }

    /* Panel Cour */
    if (!document.getElementById('panel-cour')) {
      var courPanel = document.createElement('div');
      courPanel.className = 'tab-panel';
      courPanel.id = 'panel-cour';
      courPanel.innerHTML = '<div class="sh"><span class="sh-num">08</span><span class="sh-title">Cour</span><div class="sh-line"></div></div>' +
        '<div id="irp-cour-container"><div class="empty-state" style="text-align:center;padding:40px;color:var(--text2)">Chargement...</div></div>';
      hubMain.appendChild(courPanel);
    }

    /* ── Modifier le panel Gacha pour afficher Jahartites ── */
    var gachaPanel = document.getElementById('panel-gacha');
    if (gachaPanel) {
      /* Remplacer les mentions de Navarites par Jahartites dans le HTML existant */
      gachaPanel.querySelectorAll('*').forEach(function (el) {
        if (el.children.length === 0 && el.textContent.includes('Navarite')) {
          el.textContent = el.textContent.replace(/Navarites?/gi, 'Jahartites');
        }
      });
    }

    /* ── Modifier le panel Universal Shop ── */
    var ushopPanel = document.getElementById('panel-ushop');
    if (ushopPanel) {
      var ushopTitle = ushopPanel.querySelector('.sh-title');
      if (ushopTitle) ushopTitle.textContent = 'Universal IRP Shop';
    }

    /* ── Override du LAZY map pour les onglets IRP ── */
    /* On attend que hub-core.js ait défini LAZY */
    function overrideLazy() {
      if (typeof window.LAZY === 'undefined' && typeof LAZY === 'undefined') {
        setTimeout(overrideLazy, 50);
        return;
      }

      /* Les fonctions existantes restent pour dashboard, personnage, inventaire, gacha, ushop, parametres */
      /* On ajoute les nouvelles */

      /* Rendre LAZY accessible globalement si c'est une const locale */
      /* hub-core.js utilise const LAZY donc on ne peut pas le modifier directement */
      /* On override showTab à la place */

      var _originalShowTab = window.showTab;

      window.showTab = function (id) {
        /* Onglets IRP custom */
        if (id === 'liens') { renderIRPLiens(); }
        else if (id === 'corruption') { renderIRPCorruption(); }
        else if (id === 'seal') { renderIRPSeal(); }
        else if (id === 'cour') { renderIRPCour(); }

        /* Appeler le showTab original pour la gestion des panels/transitions */
        if (typeof _originalShowTab === 'function') {
          _originalShowTab(id);
        } else {
          /* Fallback si showTab n'est pas encore défini */
          var panels = document.querySelectorAll('.tab-panel');
          panels.forEach(function (p) { p.classList.remove('active'); });
          var target = document.getElementById('panel-' + id);
          if (target) target.classList.add('active');
          var btns = document.querySelectorAll('.tab-btn');
          btns.forEach(function (b) { b.classList.remove('active'); });
          var btn = document.getElementById('tab-' + id);
          if (btn) btn.classList.add('active');
        }
      };
    }
    overrideLazy();

    /* ── Remplacer le wallet display pour Jahartites ── */
    function overrideWallet() {
      /* Observer les changements dans le dashboard pour remplacer Navarites */
      var observer = new MutationObserver(function () {
        document.querySelectorAll('.wallet-label, .stat-label, .currency-name').forEach(function (el) {
          if (el.textContent.includes('Navarite')) {
            el.textContent = el.textContent.replace(/Navarites?/gi, 'Jahartites');
          }
        });
        document.querySelectorAll('.wallet-icon, .currency-icon').forEach(function (el) {
          if (el.getAttribute('alt') && el.getAttribute('alt').includes('Navarite')) {
            el.setAttribute('alt', el.getAttribute('alt').replace(/Navarites?/gi, 'Jahartites'));
          }
        });
      });
      observer.observe(document.getElementById('hub-main') || document.body, {
        childList: true, subtree: true, characterData: true
      });
    }
    overrideWallet();
  }

  /* ══════════════════════════════════════════════════════════════════════════
     RENDERERS IRP — Onglets exclusifs
     ══════════════════════════════════════════════════════════════════════════ */

  function _db() {
    return window._db; /* Firestore db instance from hub's Firebase init */
  }

  function _getDiscordId() {
    return window.DISCORD_ID || window._discordId || '';
  }

  function _getActiveIRPChar() {
    /* Cherche le perso IRP actif dans irp_active_characters/{discordId} */
    /* Utilise les globals du hub si disponibles, sinon fetch */
    return window._irpActiveChar || null;
  }

  /* ── Charger les données IRP au login ── */
  window._loadIRPHubData = async function () {
    if (!window._db) return;
    var discordId = _getDiscordId();
    if (!discordId) return;

    try {
      /* Importer les modules Firebase nécessaires */
      var firestore = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      var doc = firestore.doc;
      var getDoc = firestore.getDoc;
      var getDocs = firestore.getDocs;
      var collection = firestore.collection;
      var query = firestore.query;
      var where = firestore.where;
      var db = window._db;

      /* Perso IRP actif */
      var activeSnap = await getDoc(doc(db, 'irp_active_characters', discordId));
      if (activeSnap.exists()) {
        var activeData = activeSnap.data();
        var charId = activeData.character_id;
        if (charId) {
          var charSnap = await getDoc(doc(db, 'irp_characters', charId));
          if (charSnap.exists()) {
            window._irpActiveChar = { _id: charSnap.id, ...charSnap.data() };
          }
        }
      }

      /* Tous les bonds du perso actif */
      if (window._irpActiveChar) {
        var bondsSnap = await getDocs(query(
          collection(db, 'irp_bonds'),
          where('source_char_id', '==', window._irpActiveChar._id)
        ));
        window._irpBonds = [];
        bondsSnap.forEach(function (d) {
          window._irpBonds.push({ _id: d.id, ...d.data() });
        });

        /* Seal */
        var sealSnap = await getDoc(doc(db, 'irp_seals', window._irpActiveChar._id));
        window._irpSeal = sealSnap.exists() ? { _id: sealSnap.id, ...sealSnap.data() } : null;

        /* Seal targets */
        if (window._irpSeal) {
          var targetsSnap = await getDocs(query(
            collection(db, 'irp_seal_targets'),
            where('owner_char_id', '==', window._irpActiveChar._id)
          ));
          window._irpSealTargets = [];
          targetsSnap.forEach(function (d) {
            window._irpSealTargets.push({ _id: d.id, ...d.data() });
          });
        }

        /* Court */
        var courtSnap = await getDoc(doc(db, 'irp_courts', window._irpActiveChar._id));
        window._irpCourt = courtSnap.exists() ? { _id: courtSnap.id, ...courtSnap.data() } : null;

        /* Flesh marks on this char */
        var marksSnap = await getDoc(doc(db, 'irp_flesh_marks', window._irpActiveChar._id));
        window._irpFleshMarks = marksSnap.exists() ? (marksSnap.data().marks || []) : [];
      }
    } catch (e) {
      window._dbg?.warn('[IRP HUB] data load:', e.message);
    }
  };

  /* ── ONGLET LIENS ── */
  function renderIRPLiens() {
    var container = document.getElementById('irp-liens-container');
    if (!container) return;
    var bonds = window._irpBonds || [];
    var char = window._irpActiveChar;
    if (!char) { container.innerHTML = '<p style="color:var(--text2);text-align:center">Aucun personnage IRP actif.</p>'; return; }

    var GAUGE_LABELS = { affection: 'Affection', desire: 'Désir', hostility: 'Hostilité', ascendant: 'Ascendant', fixation: 'Fixation' };
    var GAUGE_COLORS = { affection: '#44BB77', desire: '#E91E8C', hostility: '#CC2222', ascendant: '#8A2E8D', fixation: '#3B3B98' };
    var GAUGES = ['affection', 'desire', 'hostility', 'ascendant', 'fixation'];

    if (bonds.length === 0) {
      container.innerHTML = '<p style="color:var(--text2);text-align:center;padding:40px">Aucun lien établi. Utilise le bot IRP pour créer des liens.</p>';
      return;
    }

    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;padding:16px 0">';
    bonds.forEach(function (b) {
      var tgtId = b.target_char_id || '';
      var tgtName = tgtId.substring(0, 8) + '...'; /* TODO: resolve name from cache */

      /* Dominant gauge */
      var dominant = GAUGES.reduce(function (a, c) { return (b[c] || 0) > (b[a] || 0) ? c : a; }, GAUGES[0]);
      var dominantVal = b[dominant] || 0;

      html += '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px">';
      html += '<div style="font-family:var(--font-h);font-size:0.75rem;letter-spacing:0.1em;color:var(--text);margin-bottom:12px">→ ' + tgtName + '</div>';

      GAUGES.forEach(function (g) {
        var val = b[g] || 0;
        var pct = Math.min(100, val / 10); /* 0-1000 → 0-100% */
        var locked = (b.locks || {})[g] ? ' 🔒' : '';
        html += '<div style="margin-bottom:6px">';
        html += '<div style="display:flex;justify-content:space-between;font-size:0.6rem;color:var(--text2);margin-bottom:2px">';
        html += '<span>' + GAUGE_LABELS[g] + locked + '</span><span>' + val + '</span></div>';
        html += '<div style="height:4px;background:var(--bg2);border-radius:2px;overflow:hidden">';
        html += '<div style="width:' + pct + '%;height:100%;background:' + GAUGE_COLORS[g] + ';border-radius:2px;transition:width 0.3s"></div>';
        html += '</div></div>';
      });

      /* Triangle indicator */
      var jc = b.jealousy_context;
      if (jc && (jc.tension || 0) >= 50) {
        html += '<div style="margin-top:8px;font-size:0.55rem;color:#dc143c">⚠️ Tension triangulaire</div>';
      }

      /* Corruption */
      var corr = b.corruption || 0;
      if (corr > 0) {
        html += '<div style="margin-top:4px;font-size:0.55rem;color:#8B008B">☠️ Corruption: ' + corr + '</div>';
      }

      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  /* ── ONGLET CORRUPTION ── */
  function renderIRPCorruption() {
    var container = document.getElementById('irp-corruption-container');
    if (!container) return;
    var bonds = window._irpBonds || [];
    var char = window._irpActiveChar;
    if (!char) { container.innerHTML = '<p style="color:var(--text2);text-align:center">Aucun personnage actif.</p>'; return; }

    /* Calcul corruption totale (max de tous les bonds) */
    var maxCorr = 0;
    bonds.forEach(function (b) { maxCorr = Math.max(maxCorr, b.corruption || 0); });

    var TRAITS = [
      { threshold: 200, name: 'Impitoyable', color: '#cc5555' },
      { threshold: 400, name: 'Cruel', color: '#aa2222' },
      { threshold: 600, name: 'Obsédé par le contrôle', color: '#8B008B' },
      { threshold: 800, name: 'Dépravé', color: '#4B0000' },
    ];

    var pct = Math.min(100, maxCorr / 10);
    var html = '<div style="max-width:600px;margin:24px auto;padding:24px">';

    /* Jauge visuelle */
    html += '<div style="text-align:center;margin-bottom:24px">';
    html += '<div style="font-family:var(--font-h);font-size:1.2rem;color:#dc143c;letter-spacing:0.15em;margin-bottom:8px">☠️ CORRUPTION</div>';
    html += '<div style="font-family:var(--font-m);font-size:2rem;color:var(--text)">' + maxCorr + ' / 1000</div>';
    html += '</div>';

    html += '<div style="height:12px;background:var(--bg2);border-radius:6px;overflow:hidden;margin-bottom:24px;border:1px solid rgba(220,20,60,0.15)">';
    html += '<div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#8B008B,#dc143c);border-radius:6px;transition:width 0.5s"></div>';
    html += '</div>';

    /* Traits */
    html += '<div style="margin-top:16px">';
    TRAITS.forEach(function (t) {
      var unlocked = maxCorr >= t.threshold;
      var opacity = unlocked ? '1' : '0.3';
      var icon = unlocked ? '◆' : '◇';
      html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);opacity:' + opacity + '">';
      html += '<span style="color:' + t.color + ';font-size:1rem">' + icon + '</span>';
      html += '<span style="font-family:var(--font-b);font-size:0.85rem;color:var(--text)">' + t.name + '</span>';
      html += '<span style="margin-left:auto;font-family:var(--font-m);font-size:0.65rem;color:var(--text3)">' + t.threshold + '+</span>';
      html += '</div>';
    });
    html += '</div></div>';
    container.innerHTML = html;
  }

  /* ── ONGLET SEAL ── */
  function renderIRPSeal() {
    var container = document.getElementById('irp-seal-container');
    if (!container) return;
    var char = window._irpActiveChar;
    var seal = window._irpSeal;
    var targets = window._irpSealTargets || [];
    var marks = window._irpFleshMarks || [];

    if (!char) { container.innerHTML = '<p style="color:var(--text2);text-align:center">Aucun personnage actif.</p>'; return; }
    var level = char.level || 0;

    var html = '<div style="max-width:700px;margin:24px auto;padding:16px">';

    if (level < 50) {
      html += '<div style="text-align:center;padding:40px;color:var(--text3)">';
      html += '<div style="font-size:2rem;margin-bottom:12px">👁️</div>';
      html += '<div style="font-family:var(--font-h);font-size:0.8rem;letter-spacing:0.12em">SEAL OF DOMINION</div>';
      html += '<div style="font-family:var(--font-m);font-size:0.7rem;margin-top:8px">Niveau 50 requis · Actuellement niveau ' + level + '</div>';
      html += '</div>';
    } else if (!seal) {
      html += '<div style="text-align:center;padding:40px">';
      html += '<div style="font-size:2rem;margin-bottom:12px">👁️</div>';
      html += '<div style="font-family:var(--font-h);font-size:0.8rem;color:#dc143c;letter-spacing:0.12em">SEAL OF DOMINION</div>';
      html += '<div style="font-family:var(--font-m);font-size:0.7rem;color:var(--text2);margin-top:8px">Aucun sceau créé. Utilise le bot IRP pour en créer un.</div>';
      html += '</div>';
    } else {
      /* Seal info */
      html += '<div style="text-align:center;margin-bottom:24px">';
      html += '<div style="font-family:var(--font-h);font-size:1rem;color:#dc143c;letter-spacing:0.12em">👁️ ' + (seal.name || 'Sceau') + '</div>';
      if (seal.description) html += '<div style="font-family:var(--font-body);font-size:0.7rem;color:var(--text2);margin-top:4px;font-style:italic">' + seal.description + '</div>';
      html += '</div>';

      /* Targets */
      if (targets.length > 0) {
        html += '<div style="font-family:var(--font-b);font-size:0.75rem;color:var(--text);margin-bottom:12px;letter-spacing:0.08em">CIBLES MARQUÉES</div>';
        targets.forEach(function (t) {
          var state = t.state || '?';
          var stateEmoji = { active: '🟢', inactive: '🟡', revoked: '🔴' }[state] || '⚪';
          var tgtId = t.target_char_id || '';
          /* Count marks on this target */
          var markCount = marks.filter(function (m) { return m.owner_char_id === char._id; }).length;
          html += '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px">';
          html += '<span style="font-size:1rem">' + stateEmoji + '</span>';
          html += '<div style="flex:1">';
          html += '<div style="font-family:var(--font-b);font-size:0.75rem;color:var(--text)">' + tgtId.substring(0, 12) + '...</div>';
          html += '<div style="font-size:0.6rem;color:var(--text3)">' + state + ' · ' + markCount + ' marque(s)</div>';
          html += '</div></div>';
        });
      } else {
        html += '<div style="color:var(--text3);text-align:center;padding:20px;font-size:0.7rem">Aucune cible marquée.</div>';
      }
    }

    /* Marques de chair sur MOI */
    if (marks.length > 0) {
      html += '<div style="margin-top:24px;font-family:var(--font-b);font-size:0.75rem;color:#dc143c;margin-bottom:12px;letter-spacing:0.08em">🔥 MARQUES SUR MOI</div>';
      marks.forEach(function (m) {
        html += '<div style="background:rgba(220,20,60,0.06);border:1px solid rgba(220,20,60,0.15);border-radius:8px;padding:10px;margin-bottom:6px">';
        html += '<span style="font-family:var(--font-b);color:var(--text);font-size:0.7rem">🔥 ' + (m.name || '?') + '</span>';
        html += '<span style="color:var(--text3);font-size:0.6rem;margin-left:8px">' + (m.location || '') + ' — par ' + (m.owner_name || '?') + '</span>';
        html += '</div>';
      });
    }

    html += '</div>';
    container.innerHTML = html;
  }

  /* ── ONGLET COUR ── */
  function renderIRPCour() {
    var container = document.getElementById('irp-cour-container');
    if (!container) return;
    var char = window._irpActiveChar;
    var court = window._irpCourt;

    if (!char) { container.innerHTML = '<p style="color:var(--text2);text-align:center">Aucun personnage actif.</p>'; return; }

    var html = '<div style="max-width:600px;margin:24px auto;padding:16px">';

    if (!court) {
      html += '<div style="text-align:center;padding:40px;color:var(--text3)">';
      html += '<div style="font-size:2rem;margin-bottom:12px">👑</div>';
      html += '<div style="font-family:var(--font-h);font-size:0.8rem;letter-spacing:0.12em">COUR</div>';
      html += '<div style="font-family:var(--font-m);font-size:0.7rem;margin-top:8px">Aucune cour. Ascendant ≥ 700 sur 3+ cibles requis.</div>';
      html += '</div>';
    } else {
      html += '<div style="text-align:center;margin-bottom:24px">';
      html += '<div style="font-family:var(--font-h);font-size:1rem;color:#dc143c;letter-spacing:0.12em">👑 ' + (court.name || 'Cour') + '</div>';
      html += '</div>';

      var members = court.members || [];
      var titles = court.titles || {};

      if (members.length > 0) {
        members.forEach(function (mcid, i) {
          var rank = ['🥇', '🥈', '🥉'][i] || '#' + (i + 1);
          var title = titles[mcid] || '';
          var titleStr = title ? ' — ' + title : '';
          html += '<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:12px">';
          html += '<span style="font-size:1.2rem">' + rank + '</span>';
          html += '<div style="flex:1">';
          html += '<div style="font-family:var(--font-b);font-size:0.75rem;color:var(--text)">' + mcid.substring(0, 12) + '...' + titleStr + '</div>';
          html += '</div></div>';
        });
      } else {
        html += '<div style="color:var(--text3);text-align:center;padding:20px;font-size:0.7rem">Aucun membre.</div>';
      }
    }

    html += '</div>';
    container.innerHTML = html;
  }

  /* ── Modifier les slots inventaire pour IRP ── */
  function addIRPSlotsToInventory() {
    /* Observer les changements dans le panel inventaire pour ajouter les slots IRP */
    var invPanel = document.getElementById('panel-inventaire');
    if (!invPanel) return;

    var observer = new MutationObserver(function () {
      /* Chercher le panneau personnage (cyb-panel) pour ajouter les slots IRP */
      var cybPanel = invPanel.querySelector('.cyb-panel');
      if (!cybPanel) return;
      if (cybPanel.querySelector('.irp-slots-added')) return;

      /* Ajouter les slots IRP après les slots existants */
      var slotsDiv = document.createElement('div');
      slotsDiv.className = 'irp-slots-added';
      slotsDiv.style.cssText = 'margin-top:16px;border-top:1px solid rgba(220,20,60,0.15);padding-top:12px';
      slotsDiv.innerHTML = '<div style="font-family:var(--font-h);font-size:0.5rem;letter-spacing:0.12em;color:#dc143c;margin-bottom:8px;text-align:center">IRP SLOTS</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">' +
        '<div class="slot-cell empty-cell" data-slot="erp" style="border-color:rgba(220,20,60,0.2)"><span style="font-size:.45rem;color:var(--text3)">ERP</span></div>'.repeat(3) +
        '<div class="slot-cell empty-cell" data-slot="dominion" style="border-color:rgba(139,0,139,0.2)"><span style="font-size:.45rem;color:var(--text3)">DOM</span></div>'.repeat(3) +
        '<div class="slot-cell empty-cell" data-slot="lord" style="border-color:rgba(106,13,173,0.2)"><span style="font-size:.45rem;color:var(--text3)">LORD</span></div>'.repeat(4) +
        '</div>';
      cybPanel.appendChild(slotsDiv);
    });
    observer.observe(invPanel, { childList: true, subtree: true });
  }
  addIRPSlotsToInventory();

  /* ── Hook le chargement des données IRP après le login hub ── */
  /* On observe quand le hub-main devient visible (login réussi) */
  var loginObserver = new MutationObserver(function () {
    var hubMain = document.getElementById('hub-main');
    if (hubMain && hubMain.style.display !== 'none') {
      if (typeof window._loadIRPHubData === 'function') {
        window._loadIRPHubData();
      }
      loginObserver.disconnect();
    }
  });
  loginObserver.observe(document.body, { childList: true, subtree: true, attributes: true });

  /* ── Lancer ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForHub);
  } else {
    waitForHub();
  }
})();
