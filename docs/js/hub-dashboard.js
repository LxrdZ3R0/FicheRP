/* ═══════════════════════════════════════════════════════════════════════
   docs/js/hub-dashboard.js — Onglet Dashboard
   ═══════════════════════════════════════════════════════════════════════
   Fonctions : renderDashChar, renderNoChar, renderPlayerWidgets,
               loadWallet, _compSyncPowerBonuses
   ═══════════════════════════════════════════════════════════════════════ */

// ── RENDER DASHBOARD ──
function renderDashChar(){
  const c=CHAR,fn=c.first_name||'',ln=c.last_name||'';
  const name=[fn,ln].filter(Boolean).join(' ')||'Personnage';
  const {level:lvl,cur:cxpDash,need:nxpDash}=levelFromXp(c.xp||0);
  const xp=c.xp||0;const pct=Math.min(100,nxpDash>0?Math.round(cxpDash/nxpDash*100):100);
  const stats=c.stats||{};
  document.getElementById('dash-char-card').innerHTML=`
    ${c.profile_image?(()=>{const _cu=window.JImgCache?window.JImgCache.get('char_'+CHAR_ID):null;if(window.JImgCache)window.JImgCache.set('char_'+CHAR_ID,c.profile_image);return `<img src="${e(_cu||c.profile_image)}" class="char-card-img" alt="${e(name)}" onerror="this.outerHTML='<div class=&quot;char-card-placeholder&quot;>NO IMAGE</div>'">`;})():`<div class="char-card-placeholder">NO IMAGE</div>`}
    <div class="card-body">
      <div class="char-name">${e(name)}</div>
      <div class="char-meta">${e(c.race_category||'—')} · ${e(c.class||'—')} · ${c.age||'?'} ans</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        <span class="badge badge-race">${e(c.race_category||'—')}</span>
        <span class="badge badge-class">${e(c.class||'—')}</span>
      </div>
      <div class="char-lvl-row"><span class="char-lvl-label">Niveau</span><span class="char-lvl-val">${lvl}</span></div>
      <div class="xp-labels"><span>XP</span><span>${cxpDash.toLocaleString()} / ${nxpDash.toLocaleString()}</span></div>
      <div class="xp-bar"><div class="xp-fill" style="width:${pct}%"></div></div>
    </div>`;
  // ── Calcul bonus items pour affichage dashboard ──
  const _dashBonuses={};
  try{
    const eqList=(INV_DATA&&INV_DATA.equipped_assets)||[];
    if(eqList.length>0){
      // 1) Equipment direct
      eqList.forEach(id=>{
        const it=ALL_ITEMS_DATA[id]||{};
        if((it.rarity||'').toLowerCase()==='signature')return;
        if(id==='equalizer')return;
        Object.entries(it.stat_effects||it.stats||{}).forEach(([s,v])=>{
          try{const n=parseInt(String(v).replace('+',''));if(n)_dashBonuses[s]=(_dashBonuses[s]||0)+n;}catch(_){}
        });
      });
      // 2) Signature
      const aura=parseInt(stats.aura||0)>0;
      const sigB=calculateSignatureBonuses(eqList,stats,aura,{..._dashBonuses});
      Object.entries(sigB).forEach(([s,v])=>{if(!s.startsWith('_'))_dashBonuses[s]=(_dashBonuses[s]||0)+Math.floor(v);});
      // 3) Sets
      if(typeof calculateSetBonuses==='function'){
        const setR=calculateSetBonuses(eqList);
        Object.entries(setR.stats||{}).forEach(([s,v])=>{_dashBonuses[s]=(_dashBonuses[s]||0)+v;});
      }
    }
  }catch(_){}
  // 4) Achievement bonuses
  try{
    if(window._achDefsCache && UID){
      const achSnap=window._userAchData;
      if(achSnap && achSnap.unlocked){
        const achN=window._achDefsCache.normal||{};
        const achI=window._achDefsCache.irp||{};
        Object.keys(achSnap.unlocked).forEach(function(achId){
          const defn=achN[achId]||achI[achId];
          if(defn && defn.bonus){
            Object.entries(defn.bonus).forEach(function(e){_dashBonuses[e[0]]=(_dashBonuses[e[0]]||0)+e[1];});
          }
        });
      }
    }
  }catch(_){}
  document.getElementById('dash-stats-grid').innerHTML=SK.map(k=>{
    const base=parseInt(stats[k]||0);
    const bon=_dashBonuses[k]||0;
    const total=base+bon;
    const bonusText=bon>0?`<span class="stat-bon-tag">+${bon}</span>`:(bon<0?`<span class="stat-bon-tag neg">${bon}</span>`:'');
    return `<div class="stat-row"><span class="stat-icon">${SI[k]}</span><span class="stat-name">${SL[k]}</span><span class="stat-val">${total}${bonusText}</span></div>`;
  }).join('');
  const powers=c.powers||[];
  document.getElementById('dash-powers-list').innerHTML=powers.length
    ?powers.slice(0,5).map(p=>`<div class="power-item"><div class="pq ${p.quality||'common'}"></div><span class="power-name">${e(p.name||p.id||'—')}</span><span class="power-qual-tag">${e((p.quality||'').toUpperCase())}</span></div>`).join('')+(powers.length>5?`<div class="empty">+${powers.length-5} autres</div>`:'')
    :'<div class="empty">Aucun pouvoir</div>';
}

function renderNoChar(){
  document.getElementById('dash-char-card').innerHTML='<div class="char-card-placeholder" style="background:#050910">AUCUN PERSO ACTIF</div><div class="card-body"><div class="empty">Aucun personnage actif</div></div>';
  document.getElementById('dash-stats-grid').innerHTML='<div class="empty" style="grid-column:1/-1">—</div>';
  document.getElementById('dash-powers-list').innerHTML='<div class="empty">—</div>';
}

function renderPlayerWidgets(){
  /* En IRP, utiliser le solde de jahartites — JAMAIS PLAYER.navarites en fallback */
  const isIRP = window._irpMode;
  const irpP = window._irpPlayer;
  let nav, streak;
  if(isIRP){
    /* Si _irpPlayer n'est pas encore chargé, afficher 0 et relancer le chargement */
    nav = irpP ? (irpP.jahartites || 0) : 0;
    streak = irpP ? (irpP.consecutive_days || 0) : 0;
    if(!irpP && typeof db !== 'undefined' && typeof UID !== 'undefined' && UID){
      /* Chargement async des jahartites si pas encore fait */
      db.collection('irp_players').doc(String(UID)).get().then(function(snap){
        if(snap.exists){
          window._irpPlayer = snap.data();
          if(window.PLAYER) window.PLAYER.navarites = window._irpPlayer.jahartites || 0;
          renderPlayerWidgets(); /* re-render avec les bonnes données */
        }
      }).catch(function(){});
    }
  } else {
    nav = (PLAYER.navarites || 0);
    streak = (PLAYER.consecutive_days || 0);
  }
  const unit = isIRP ? 'JAH' : 'NAV';
  document.getElementById('dash-nav-val').innerHTML=`<span>${nav.toLocaleString()}</span><span class="nav-unit">${unit}</span>`;
  document.getElementById('dash-nav-streak').innerHTML=streak?`<span>${streak}</span> jour${streak>1?'s':''} consécutifs`:'Pas encore de série active';
  // Load wallet after player data is ready
  loadWallet();
}

async function loadWallet(){
  const walletEl=document.getElementById('dash-wallet');
  if(!walletEl)return;
  // Gather all currency data
  const isIRP = window._irpMode;
  const irpP = window._irpPlayer;
  const nav = isIRP ? (irpP ? (irpP.jahartites || 0) : 0) : (PLAYER.navarites || 0);
  const navLabel = isIRP ? 'Jahartites' : 'Navarites';
  const navIcon = isIRP
    ? 'https://firebasestorage.googleapis.com/v0/b/jaharta-rp.firebasestorage.app/o/icons%2FChatGPT%20Image%2013%20avr.%202026%2C%2018_19_29.png?alt=media&token=ac0476c3-965f-4806-aad0-ee6c917e02cd'
    : 'https://firebasestorage.googleapis.com/v0/b/jaharta-rp.firebasestorage.app/o/icons%2FNavarite.png?alt=media&token=4b19c26d-c28e-426e-89ca-0fe381708ece';
  const notoriety=PLAYER.notoriety||0;
  const _ge=PLAYER.golden_eggs;
  const goldenEggs=typeof _ge==='number'?_ge:(typeof _ge==='object'&&_ge!==null?(Object.values(_ge).find(v=>typeof v==='number')||0):(parseInt(_ge)||0));
  // Load economy data for kanite currencies
  let bronze=0,silver=0,gold=0,platinum=0;
  if(UID&&CHAR_ID){
    try{
      const charKey=`${UID}_${CHAR_ID}`;
      const snap=await db.collection(C.ECONOMY).doc(charKey).get();
      if(snap.exists){
        const personal=snap.data().personal||{};
        bronze=personal.bronze_kanite||0;
        silver=personal.silver_kanite||0;
        gold=personal.gold_kanite||0;
        platinum=personal.platinum_kanite||0;
      }
    }catch(e){window._dbg?.error('[WALLET]',e)}
  }
  // Build wallet items — always show navarites and golden eggs, show kanites if > 0
  let html='';
  // Currency icon URLs
  const IC={
    nav:'https://firebasestorage.googleapis.com/v0/b/jaharta-rp.firebasestorage.app/o/icons%2FNavarite.png?alt=media&token=4b19c26d-c28e-426e-89ca-0fe381708ece',
    egg:'https://firebasestorage.googleapis.com/v0/b/jaharta-rp.firebasestorage.app/o/icons%2FGolden%20Egg.png?alt=media&token=f2758281-8c47-428d-b071-d934cf7b1df6',
    bronze:'https://firebasestorage.googleapis.com/v0/b/jaharta-rp.firebasestorage.app/o/icons%2Fbronze%20Kanite.png?alt=media&token=8caf5762-a623-4edc-9e06-50438996569b',
    silver:'https://firebasestorage.googleapis.com/v0/b/jaharta-rp.firebasestorage.app/o/icons%2FSilver%20Kanite.png?alt=media&token=2ee7b03c-930e-4108-b633-b358eb166b07',
    gold:'https://firebasestorage.googleapis.com/v0/b/jaharta-rp.firebasestorage.app/o/icons%2Fbronze%20Kanite.png?alt=media&token=8caf5762-a623-4edc-9e06-50438996569b',
    platinum:'https://firebasestorage.googleapis.com/v0/b/jaharta-rp.firebasestorage.app/o/icons%2FPlatinum%20Kanite.png?alt=media&token=aceec5d7-9971-4bb5-ab1c-10162c697f00'
  };
  function wimg(url){return `<img src="${url}" alt="" style="width:28px;height:28px;object-fit:contain;filter:drop-shadow(0 0 4px rgba(255,214,10,0.3))">`;}
  html+=`<div class="wallet-item wi-navarite"><span class="wi-icon">${wimg(isIRP ? navIcon : IC.nav)}</span><div><div class="wi-val">${nav.toLocaleString()}</div><div class="wi-label">${navLabel}</div></div></div>`;
  html+=`<div class="wallet-item wi-golden-egg"><span class="wi-icon">${wimg(IC.egg)}</span><div><div class="wi-val">${goldenEggs.toLocaleString()}</div><div class="wi-label">Golden Egg</div></div></div>`;
  if(platinum>0)html+=`<div class="wallet-item wi-platinum"><span class="wi-icon">${wimg(IC.platinum)}</span><div><div class="wi-val">${platinum.toLocaleString()}</div><div class="wi-label">Platinum K</div></div></div>`;
  if(gold>0)html+=`<div class="wallet-item wi-gold"><span class="wi-icon">${wimg(IC.gold)}</span><div><div class="wi-val">${gold.toLocaleString()}</div><div class="wi-label">Gold K</div></div></div>`;
  if(silver>0)html+=`<div class="wallet-item wi-silver"><span class="wi-icon">${wimg(IC.silver)}</span><div><div class="wi-val">${silver.toLocaleString()}</div><div class="wi-label">Silver K</div></div></div>`;
  if(bronze>0)html+=`<div class="wallet-item wi-bronze"><span class="wi-icon">${wimg(IC.bronze)}</span><div><div class="wi-val">${bronze.toLocaleString()}</div><div class="wi-label">Bronze K</div></div></div>`;
  if(notoriety>0)html+=`<div class="wallet-item wi-notoriety"><span class="wi-icon">⚡</span><div><div class="wi-val">${notoriety.toLocaleString()}</div><div class="wi-label">Notoriété</div></div></div>`;
  walletEl.innerHTML=html||'<div class="empty">Portefeuille vide</div>';
}

// ── Companion sync_power → flat stat bonuses map ──
function _compSyncPowerBonuses(power){
  const p=(power||'').toLowerCase().trim();
  const ALL=['strength','agility','speed','intelligence','mana','resistance','charisma'];
  const MAP={
    'royalty presence':{charisma:100},
    "hunter's dominion":{agility:100},
    'lost knowledge':{intelligence:100},
    'old tenacity':{resistance:200},
    'thunderclap':Object.fromEntries(ALL.map(s=>[s,20])),
    'thunder strikes twice':Object.fromEntries(ALL.map(s=>[s,30])),
    'challenger':Object.fromEntries(ALL.map(s=>[s,55])),
    'killer instinct':{strength:25,resistance:25,mana:25},
    'unextinguishable':{strength:150,resistance:150,mana:150},
    'strategist':{agility:25,intelligence:25,mana:25},
    'unfathomable':{agility:150,intelligence:150,mana:150},
    'assassin':{agility:45,intelligence:45,mana:45},
    'unavoidable':{agility:200,intelligence:200,mana:200},
    'sturdy':{strength:23,resistance:23,agility:23,charisma:23},
    'unchained':{strength:130,resistance:130,agility:130,charisma:130},
    'blessing':Object.fromEntries(ALL.map(s=>[s,23])),
    'the one':Object.fromEntries(ALL.map(s=>[s,300])),
    'curse':{strength:46,intelligence:46,agility:46,charisma:46,speed:-23,mana:-23,resistance:-23},
    'the last':Object.fromEntries(ALL.map(s=>[s,300])),
  };
  return MAP[p]||{};
}

