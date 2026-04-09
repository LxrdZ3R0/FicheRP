/* ══════════════════════════════════════════════════════════════════════
   hub-core.js — Noyau du Hub Jaharta
   Firebase init · constantes · cache · session · auth · state · loaders · tabs · utils
   ══════════════════════════════════════════════════════════════════════ */

// ── CONFIG FIREBASE ──
const FB={apiKey:"AIzaSyAru7qZX8Gu_b8Y3oNDV-a5PmkrrkRjkcs",authDomain:"jaharta-rp.firebaseapp.com",projectId:"jaharta-rp",storageBucket:"jaharta-rp.firebasestorage.app",messagingSenderId:"217075417489",appId:"1:217075417489:web:4d1e2df422a5cd42411a30"};
if(!firebase.apps.length)firebase.initializeApp(FB);
const db=firebase.firestore();

// ── COLLECTIONS (noms exacts du bot) ──
const C={
  ACTIVE:'active_characters',   // {discord_id} → {character_id, user_id}
  CHARS:'characters',           // {char_uuid}  → perso complet
  PLAYERS:'players',            // {discord_id} → {navarites, notoriety, display_theme, consecutive_days...}
  INV:'inventories',            // {discord_id}_{char_uuid} → {items:{}, equipped_assets:[]}
  COMP:'companions_user',       // {discord_id}_{char_uuid} → {owned_companions, active_companion}
  TITLES:'titles_user',         // {discord_id} → {titles:{}, tp:0}
  PARTIES:'parties',            // {party_id}   → {name, members[], leader_char_key...}
  PARTY_MEM:'party_membership', // {discord_id}_{char_uuid} → {party_id}
  PITY:'gacha_pity',            // {discord_id} → {navarites_spent_epic, navarites_spent_leg}
  SHOPS:'shops',                // {discord_id}_{char_uuid} → {name, open, items{}}
  ECONOMY:'economy',             // {discord_id}_{char_uuid} → {personal:{}}
  LINK:'gacha_link_codes',      // {code} → {discord_id, username, avatar_url, expires_at}
  CFG:'config',                 // items, companions_data, etc.
};

const SI={strength:'⚔️',agility:'💨',speed:'🏃',intelligence:'🧠',mana:'✨',resistance:'🛡️',charisma:'👑',aura:'🌟'};
const SL={strength:'Force',agility:'Agilité',speed:'Vitesse',intelligence:'Intel.',mana:'Mana',resistance:'Rés.',charisma:'Charisme',aura:'Aura'};
const SK=['strength','agility','speed','intelligence','mana','resistance','charisma','aura'];
const PITY_T={epic:30,leg:150};

// ══════════════════════════════════════════════
// CACHE — utilise JCache (js/jaharta-cache.js) partagé avec tout le site
// Wrappers pour compatibilité avec le code hub existant
// ══════════════════════════════════════════════
function cacheInvalidate(key){JCache.invalidate(key,null);}
// Raccourci : get un doc Firestore avec cache (compat SDK)
// Utilise cacheKey comme clé de cache (au lieu de collection/docId)
// pour que cacheInvalidate(cacheKey) fonctionne correctement
async function cachedGet(collection,docId,cacheKey,ttl){
  var cached=JCache.peek(cacheKey,null);
  if(cached!==null) return cached;
  var snap=await db.collection(collection).doc(docId).get();
  var data=snap.exists?snap.data():null;
  JCache.put(cacheKey,null,data,ttl);
  return data;
}
// Raccourci : get toute une collection avec cache
async function cachedCollection(collection,cacheKey,ttl){
  var cached=JCache.peek(cacheKey,null);
  if(cached!==null) return cached;
  var snap=await db.collection(collection).get();
  var docs=[];
  snap.forEach(function(d){docs.push({_key:d.id,...d.data()});});
  JCache.put(cacheKey,null,docs,ttl);
  return docs;
}

// ── SESSION (partagée gacha ↔ hub) — TTL 7 jours ──
const SESSION_TTL=7*24*60*60*1000;
function getSess(){
  try{
    const raw=localStorage.getItem('hub_session')||localStorage.getItem('gacha_session');
    if(!raw)return null;
    const s=JSON.parse(raw);
    /* Vérifier l'expiration de la session */
    if(s._exp&&Date.now()>s._exp){clearSess();return null;}
    return s;
  }catch(e){return null}
}
function setSess(s){
  const payload={...s,_exp:Date.now()+SESSION_TTL};
  localStorage.setItem('hub_session',JSON.stringify(payload));
  localStorage.setItem('gacha_session',JSON.stringify(payload));
}
function clearSess(){localStorage.removeItem('hub_session');localStorage.removeItem('gacha_session')}

// ── AUTH ──
async function verifyCode(){
  const inp=document.getElementById('link-code'),err=document.getElementById('code-error'),btn=document.getElementById('verify-btn');
  err.style.display='none';
  const code=inp.value.trim().toUpperCase();
  if(!code||code.length<4){showErr('Entre un code valide');return}
  btn.disabled=true;btn.textContent='VÉRIFICATION...';
  function showErr(m){err.textContent=m;err.style.display='block'}
  function done(){btn.disabled=false;btn.textContent='CONNEXION AU NEXUS'}
  try{
    /* ── Transaction atomique : lecture + suppression en une seule opération ──
       Empêche la réutilisation du même code par deux onglets simultanés (TOCTOU). */
    const codeRef=db.collection(C.LINK).doc(code);
    let sessionData=null;
    await db.runTransaction(async(tx)=>{
      const snap=await tx.get(codeRef);
      if(!snap.exists)throw Object.assign(new Error('Code invalide ou déjà utilisé'),{_userMsg:true});
      const d=snap.data();
      if(d.expires_at&&new Date(d.expires_at)<new Date()){
        tx.delete(codeRef);
        throw Object.assign(new Error('Code expiré — utilise /link'),{_userMsg:true});
      }
      /* Marquer utilisé dans la transaction AVANT de retourner les données */
      tx.delete(codeRef);
      sessionData={id:d.discord_id,username:d.username,avatar:d.avatar_url};
    });
    setSess(sessionData);
    await loadHub();
  }catch(e){
    const msg=e._userMsg?e.message:'Erreur de connexion — réessaye';
    showErr(msg);done();
  }
}
document.addEventListener('DOMContentLoaded',function(){
  const lc=document.getElementById('link-code');
  const vb=document.getElementById('verify-btn');
  if(lc)lc.addEventListener('keydown',e=>{if(e.key==='Enter')verifyCode();});
  if(vb)vb.addEventListener('click',verifyCode);
  init();
});

function logout(){
  clearSess();
  document.getElementById('hub-main').classList.remove('active');
  document.getElementById('main-nav').style.display='none';
  document.getElementById('login-gate').style.display='flex';
  showToast('Déconnecté','info');
}

// ── ACCESSIBILITÉ ──
const prefersReducedMotion=window.matchMedia('(prefers-reduced-motion:reduce)').matches;

// ── STATE ──
let CHAR=null,PLAYER=null,PITY=null,INV_DATA=null,CHAR_ID=null,UID=null,ALL_ITEMS_DATA={};
let PARTY_DATA=null,TITLES_DATA=null,TITLES_DEF=null,BUFFS_DATA=null;
let COMP_USER=null,COMP_CFG=null; // compagnon data for stats
let CURRENT_TAB='dashboard'; // onglet actif — lazy render

/* ── SIGNATURE ITEMS (port from signature_items.py) ── */
const SIGNATURE_ITEMS={
  cyclo_arcana:{name:"Cyclo-Arcana",icon:"⚔️",slot:"armes_h"},
  fake_twins:{name:"Fake Twins",icon:"🔫",slot:"armes_h"},
  kings_jewel:{name:"King's Jewel",icon:"💎",slot:"mains"},
  real_twins:{name:"Real Twins",icon:"🧤",slot:"armes_h"},
  diademe_du_nexus:{name:"Diadème du Nexus",icon:"👑",slot:"cou"},
  faux_modele_0:{name:"Faux, Modèle 0",icon:"🪓",slot:"armes_h"},
  epee_de_damocles:{name:"Épée de Damoclès",icon:"🗡️",slot:"armes_h"},
  blitz_runners:{name:"Blitz Runners",icon:"👟",slot:"pieds"},
  survivai_kit:{name:"Survivai Kit, Premium Edition",icon:"🧰",slot:"mains"},
  riviere_dopalines:{name:"Rivière d'Opalines",icon:"📿",slot:"cou"},
  faux_ongles_tisserand:{name:"Faux-Ongles du Tisserand",icon:"💅",slot:"cou"}
};
const SIG_ALL_STATS=["strength","agility","speed","intelligence","mana","resistance","charisma"];

function calculateSignatureBonuses(equippedIds,charStats,auraEnabled,existingBuffs){
  const b={};
  function add(s,v){b[s]=(b[s]||0)+Math.floor(v);}
  function base(s){return parseInt((charStats||{})[s]||0)||0;}
  const sigIds=equippedIds.filter(id=>SIGNATURE_ITEMS[id]);
  for(const id of sigIds){
    if(id==='cyclo_arcana'){
      const spdTotal=base('speed')+(existingBuffs||{}).speed||0;
      add('speed',spdTotal*0.50);
    }else if(id==='fake_twins'){
      add('agility',20);add('charisma',50);
      if(auraEnabled){SIG_ALL_STATS.forEach(s=>add(s,50));add('aura',100);}
    }else if(id==='kings_jewel'){
      add('mana',50);
      if(auraEnabled){add('mana',50);}
    }else if(id==='real_twins'){
      Object.entries(existingBuffs||{}).forEach(([s,v])=>{if(v>0)add(s,v*0.75);});
    }else if(id==='diademe_du_nexus'){
      add('agility',50);add('intelligence',50);
      if(base('mana')>300)add('mana',100);
    }else if(id==='faux_modele_0'){
      add('intelligence',75);
      if(base('mana')>300)add('mana',100);
    }else if(id==='epee_de_damocles'){
      add('agility',50);
    }else if(id==='blitz_runners'){
      add('agility',75);add('speed',75);add('mana',75);
    }else if(id==='survivai_kit'){
      if(charStats){
        const highest=SIG_ALL_STATS.reduce((a,s)=>base(s)>base(a)?s:a,SIG_ALL_STATS[0]);
        SIG_ALL_STATS.forEach(s=>add(s,s===highest?75:50));
      }
      if(base('agility')>600){
        Object.entries(existingBuffs||{}).forEach(([s,v])=>{if(v>0)add(s,v*0.5);});
      }
    }else if(id==='riviere_dopalines'){
      SIG_ALL_STATS.forEach(s=>add(s,50));
      if(base('mana')>300){SIG_ALL_STATS.forEach(s=>add(s,25));add('mana',100);}
    }else if(id==='faux_ongles_tisserand'){
      add('mana',150);
      if(base('mana')>700){SIG_ALL_STATS.forEach(s=>add(s,150));}
    }
  }
  return b;
}

// ── INIT ──
async function init(){
  const s=getSess();
  if(s&&s.id){
    try{ await loadHub(); }
    catch(err){ window._dbg?.error('[HUB] loadHub failed',err); }
  } else {
    document.getElementById('login-gate').style.display='flex';
  }
}

async function loadHub(){
  const s=getSess();
  if(!s||!s.id){
    window._dbg?.warn('[HUB]','loadHub: pas de session valide');
    document.getElementById('login-gate').style.display='flex';
    return;
  }
  UID=s.id;
  // Afficher l'interface immédiatement
  document.getElementById('login-gate').style.display='none';
  document.getElementById('main-nav').style.display='flex';
  document.getElementById('hub-main').classList.add('active');
  document.getElementById('nav-username').textContent=s.username||'—';try{document.getElementById('menu-username').textContent=s.username||'—';}catch(e){}
  if(s.avatar){const av=document.getElementById('nav-avatar');av.src=s.avatar;av.style.display='block'}
  // Charger les données en parallèle — les erreurs n'empêchent pas l'affichage
  try{ await Promise.all([loadCharacter(),loadPlayer()]); }
  catch(err){ window._dbg?.error('[HUB] chargement données',err); }
}

async function loadCharacter(){
  try{
    const acData=await cachedGet(C.ACTIVE,UID,'_active_char',15);
    if(!acData){renderNoChar();return}
    CHAR_ID=acData.character_id;
    if(!CHAR_ID){renderNoChar();return}
    const cData=await cachedGet(C.CHARS,CHAR_ID,'_character',30);
    if(!cData){renderNoChar();return}
    CHAR={_id:CHAR_ID,...cData};
    const charKey=`${UID}_${CHAR_ID}`;
    // Charger en parallèle avec cache
    const[invData,cfgData,bufData,pmData]=await Promise.all([
      cachedGet(C.INV,charKey,'_inventory',15),
      cachedGet(C.CFG,'items','config/items',600),
      cachedGet('buffs',UID,'_buffs',30),
      cachedGet(C.PARTY_MEM,charKey,'_party_mem',60)
    ]);
    INV_DATA=invData||{items:{},equipped_assets:[]};
    if(cfgData){
      ALL_ITEMS_DATA={...cfgData.items||{},...cfgData.equipment||{},...cfgData.food_items||{},...cfgData.consumable_items||{}};
    }
    BUFFS_DATA=bufData?(bufData.buffs||[]):[];
    // Charger compagnons pour bonus stats (Personnage tab)
    try{
      const[compUser,compCfg]=await Promise.all([
        cachedGet(C.COMP,charKey,'_companions',60),
        cachedGet(C.CFG,'companions_data','config/companions_data',600)
      ]);
      COMP_USER=compUser||{};
      COMP_CFG=compCfg||{companions:{},evolutions:{}};
    }catch(_){COMP_USER={};COMP_CFG={companions:{},evolutions:{}};}
    if(pmData&&pmData.party_id){
      const pData=await cachedGet(C.PARTIES,pmData.party_id,'_party',60);
      PARTY_DATA=pData||null;
    }
    renderDashChar();
    _refreshCurrentTab();
  }catch(e){window._dbg?.error('[CHAR]',e);renderNoChar()}
}

async function loadPlayer(){
  try{
    const[pData,pityData]=await Promise.all([
      cachedGet(C.PLAYERS,UID,'_player',30),
      cachedGet(C.PITY,UID,'_pity',30)
    ]);
    PLAYER=pData||{};
    PITY=pityData||{};
    renderPlayerWidgets();
    _refreshCurrentTab();
  }catch(e){window._dbg?.error('[PLAYER]',e);}
}

// ── LOADERS PARESSEUX (au clic de l'onglet) ──
async function loadInventory(){
  const grid=document.getElementById('inv-grid');
  if(!CHAR_ID){grid.innerHTML='<div class="empty">Aucun personnage actif</div>';return}
  if(window.Skeleton) window.Skeleton.show('inv-grid',6);
  try{
    const key=`${UID}_${CHAR_ID}`;
    const[invData,cfgData]=await Promise.all([
      cachedGet(C.INV,key,'_inventory',15),
      cachedGet(C.CFG,'items','config/items',600)
    ]);
    INV_DATA=invData||{items:{},equipped_assets:[]};
    if(cfgData) ALL_ITEMS_DATA={...cfgData.items||{},...cfgData.equipment||{},...cfgData.food_items||{},...cfgData.consumable_items||{}};
    if(window.Skeleton) window.Skeleton.hide('inv-grid');
    renderInventory();
  }catch(e){window._dbg?.error('[INV]',e);if(window.Skeleton) window.Skeleton.hide('inv-grid');grid.innerHTML='<div class="empty">Erreur de chargement</div>'}
}

async function loadParty(){
  if(!CHAR_ID){document.getElementById('party-content').innerHTML='<div class="empty">Aucun personnage actif</div>';return}
  try{
    const key=`${UID}_${CHAR_ID}`;
    const mData=await cachedGet(C.PARTY_MEM,key,'_party_mem',60);
    if(!mData||!mData.party_id){document.getElementById('party-content').innerHTML='<div class="empty">Tu n\'es dans aucune party.</div>';return}
    const pData=await cachedGet(C.PARTIES,String(mData.party_id),'_party',60);
    if(!pData){document.getElementById('party-content').innerHTML='<div class="empty">Party introuvable.</div>';return}
    renderParty(pData);
  }catch(e){document.getElementById('party-content').innerHTML='<div class="empty">Erreur de chargement</div>'}
}

async function loadTitles(){
  const el=document.getElementById('titles-grid');if(!el)return;
  if(!UID){el.innerHTML='<div class="empty">Non connecté — utilise /link</div>';return;}
  el.innerHTML='<div class="empty">Chargement...</div>';
  try{
    const[tData,cfgData]=await Promise.all([
      cachedGet(C.TITLES,UID,'_titles',60),
      cachedGet(C.CFG,'titles_data','config/titles_data',600)
    ]);
    const defs=cfgData?(cfgData.titles||cfgData||{}):{};
    TITLES_DATA=tData||{};
    TITLES_DEF=defs;
    renderTitles(TITLES_DATA,defs);
  }catch(e){window._dbg?.error('[TITLES]',e);el.innerHTML='<div class="empty">Erreur de chargement</div>'}
}

async function loadCompanions(){
  if(!CHAR_ID){document.getElementById('comp-content').innerHTML='<div class="empty">Aucun personnage actif</div>';return}
  try{
    const key=`${UID}_${CHAR_ID}`;
    const[cData,cfgData]=await Promise.all([
      cachedGet(C.COMP,key,'_companions',60),
      cachedGet(C.CFG,'companions_data','config/companions_data',600)
    ]);
    renderCompanions(cData||{},cfgData||{companions:{},evolutions:{}});
  }catch(e){window._dbg?.error('[COMP]',e);document.getElementById('comp-content').innerHTML='<div class="empty">Erreur de chargement</div>'}
}

async function loadShop(){
  if(!CHAR_ID){document.getElementById('shop-content').innerHTML='<div class="empty">Aucun personnage actif</div>';return}
  try{
    const snap=await db.collection(C.SHOPS).doc(`${UID}_${CHAR_ID}`).get();
    renderShop(snap.exists?snap.data():null);
  }catch(e){document.getElementById('shop-content').innerHTML='<div class="empty">Erreur</div>'}
}

// ── TABS ──
const LAZY={
  personnage:()=>{if(CHAR)renderFullChar();},
  inventaire:()=>{if(INV_DATA&&Object.keys(ALL_ITEMS_DATA).length){renderInventory();}else{loadInventory();}},
  gacha:()=>{if(PLAYER)renderGacha();},
  party:loadParty,
  progression:()=>{if(CHAR)renderProgression();initAlloc();},
  titres:loadTitles,
  compagnons:loadCompanions,
  monshop:()=>{if(_monshopLoaded){renderMonShop();}else{loadMonShop();}},
  shops:loadShops,
  ushop:loadUshop,
  parametres:renderSettings,
};
function showTab(id){
  CURRENT_TAB=id;
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  const panel=document.getElementById('panel-'+id);
  const btn=document.getElementById('tab-'+id);
  if(!panel){window._dbg?.warn('[TAB]','panel-'+id+' introuvable !');return;}
  panel.classList.add('active');
  if(btn)btn.classList.add('active');
  if(LAZY[id]){
    try{
      const result=LAZY[id]();
      if(result&&result.catch)result.catch(err=>window._dbg?.error('[TAB] '+id,err));
    }catch(err){window._dbg?.error('[TAB] '+id+' sync',err);}
  }
}
function _refreshCurrentTab(){
  if(CURRENT_TAB==='dashboard')return;
  if(!LAZY[CURRENT_TAB])return;
  try{const r=LAZY[CURRENT_TAB]();if(r&&r.catch)r.catch(()=>{});}catch(_){}
}

// ── UTILS ──
// Formule XP exacte du bot (stats_common.py)
// xp_needed_for_next_level(level) = 500 * level
// total_xp_required_for_level(level) = 500 * (n*(n+1)/2) avec n=level-1
function totalXpForLevel(lvl){
  const n=Math.max(0,Math.floor(lvl)-1);
  return 500*(n*(n+1)/2);
}
function xpForNextLevel(lvl){return 500*Math.max(1,Math.floor(lvl));}
function levelFromXp(totalXp){
  let xp=Math.max(0,totalXp),level=1;
  while(level<500){
    const need=xpForNextLevel(level);
    if(xp<need)return{level,cur:xp,need};
    xp-=need;level++;
  }
  return{level:500,cur:0,need:0};
}
// Legacy alias
function lvlXP(lvl){return totalXpForLevel(lvl);}
function e(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

window.addEventListener('scroll',()=>{const max=document.body.scrollHeight-window.innerHeight;document.getElementById('scroll-line').style.width=(max>0?(window.scrollY/max*100):0)+'%'});
