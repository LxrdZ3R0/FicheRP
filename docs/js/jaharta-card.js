/* jaharta-card.js — Web Component <jaharta-card>
   Design : fidele a la preview + modifications demandees
   - Tilt 3D + reflet speculaire JS (argente / prismatique S+)
   - body opacity 15%, blur 2px
   - Neon hover couleur de race (--rc)
   - Aucune limite d affichage race/raceSpecific
   - Titre POUVOIRS sans emoji
   - Underline sur le NOM couleur de race
   - Badge rang+niveau preserve identique preview */

const HIGH_RANKS = ["S","SS","SSS","X","T","G","G+","Z"];
const MAX_TILT   = 6;
const SCRAMBLE   = "アイウエオカキクケコΨΩΣΔЯЖЩЦABCDEFGHIJKLMNOPQRSTUVWXYZ";

function bindTilt(card) {
  const isPrismatic = HIGH_RANKS.includes(card.dataset.rank);
  card.addEventListener("mousemove", e => {
    const r  = card.getBoundingClientRect();
    const nx = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2);
    const ny = (r.height / 2 - (e.clientY - r.top)) / (r.height / 2);
    card.style.transform =
      "perspective(800px) rotateX("+(ny*MAX_TILT).toFixed(2)+"deg) "+
      "rotateY("+(nx*MAX_TILT).toFixed(2)+"deg) scale(1.02)";
    const reflet = card.querySelector(".card-reflet");
    if (reflet) {
      const lx = 50 + nx * 35;
      const ly = 50 - ny * 35;
      reflet.style.background = isPrismatic
        ? "radial-gradient(ellipse 55% 40% at "+lx+"% "+ly+"%,rgba(255,80,80,.08) 0%,rgba(255,200,50,.07) 22%,rgba(80,255,130,.06) 44%,rgba(77,163,255,.08) 66%,rgba(180,80,255,.07) 88%,transparent 100%)"
        : "radial-gradient(ellipse 55% 40% at "+lx+"% "+ly+"%,rgba(255,255,255,.10) 0%,rgba(255,255,255,.04) 45%,transparent 75%)";
    }
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = "";
    const reflet = card.querySelector(".card-reflet");
    if (reflet) reflet.style.background = "";
  });
}

function bindScramble(card) {
  const targets = [card.querySelector(".card-fn"), card.querySelector(".card-ln")];
  card.addEventListener("mouseenter", () => {
    targets.forEach(el => {
      if (!el) return;
      const orig = el.dataset.orig || el.textContent.trim();
      el.dataset.orig = orig;
      el.style.fontFamily = "Share Tech Mono, monospace";
      let iter = 0;
      clearInterval(el._scrI);
      el._scrI = setInterval(() => {
        el.textContent = orig.split("").map((c, i) => {
          if (c === " ") return " ";
          if (i < iter) return orig[i];
          return SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
        }).join("");
        if (iter >= orig.length) { clearInterval(el._scrI); el.style.fontFamily = ""; }
        iter += 0.5;
      }, 35);
    });
  });
}

class JahartaCard extends HTMLElement {
  constructor() {
    super();
    this.style.display = "contents";
    this._data = null;
  }
  set fiche(data) { this._data = data; if (this.isConnected) this._render(); }
  get fiche() { return this._data; }
  connectedCallback() { if (this._data) this._render(); }

  _render() {
    const ch          = this._data;
    const RACES       = window.RACES || {};
    const RANKS       = window.RANKS || {};
    const rc          = RACES[ch.race] || { color: "#4DA3FF", label: ch.race || "?" };
    const rk          = RANKS[ch.rank] || { color: "#6b7280" };
    const raceColor   = rc.color;
    const rankColor   = rk.color;
    const rank        = ch.rank || "F";
    const level       = ch.level || 0;
    const isPrismatic = HIGH_RANKS.includes(rank);

    const card = document.createElement("div");
    card.className = "rp-card" + (isPrismatic ? " prismatic" : "");
    card.dataset.race  = ch.race || "";
    card.dataset.rank  = rank;
    card.dataset.level = level;
    card.style.setProperty("--rc", raceColor);

    let totalStats = 0;
    const stats = ch.stats || {};
    ["str","agi","spd","int","mana","res","cha","aura"].forEach(k => { totalStats += (stats[k]||0); });
    card.dataset.totalStats = totalStats;

    /* Reflet */
    const reflet = document.createElement("div");
    reflet.className = "card-reflet";
    card.appendChild(reflet);

    /* Glow */
    const glow = document.createElement("div");
    glow.className = "card-glow";
    glow.style.boxShadow = "0 0 30px "+raceColor+"15,0 0 60px "+raceColor+"08";
    card.appendChild(glow);

    /* PHOTO */
    const photo = document.createElement("div");
    photo.className = "card-photo";

    const stripe = document.createElement("div");
    stripe.className = "card-stripe";
    stripe.style.background = "linear-gradient(90deg,"+raceColor+","+raceColor+"20)";
    photo.appendChild(stripe);

    if (ch.photoUrl || ch.photo) {
      const img   = document.createElement("img");
      img.alt     = ch.firstname || "";
      img.loading = "lazy";
      if (window.JImgCache && ch.id) {
        window.JImgCache.applyTo(img, 'fc_' + ch.id, ch.photoUrl || ch.photo);
      } else {
        img.src = ch.photoUrl || ch.photo;
      }
      photo.appendChild(img);
    } else {
      const ph = document.createElement("div");
      ph.style.cssText = "width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:var(--font-h);font-size:2.5rem;font-weight:900;color:"+raceColor+";opacity:0.4";
      ph.textContent = (ch.firstname?.[0]||"")+( ch.lastname?.[0]||"");
      photo.appendChild(ph);
    }

    const ov = document.createElement("div");
    ov.className = "card-photo-ov";
    photo.appendChild(ov);

    /* Badge rang+niveau — identique preview */
    const badge = document.createElement("div");
    badge.className = "rank-badge";
    badge.style.color = rankColor;
    if (isPrismatic) badge.style.animation = "rankPulse 2.5s infinite";

    const rbVal = document.createElement("div");
    rbVal.className = "rb-val";
    rbVal.textContent = rank;
    badge.appendChild(rbVal);

    const rbLbl = document.createElement("div");
    rbLbl.className = "rb-lbl";
    rbLbl.textContent = "RANG";
    badge.appendChild(rbLbl);

    if (level) {
      const rbLevel = document.createElement("div");
      rbLevel.className = "rb-level";
      rbLevel.textContent = "Nv."+level;
      badge.appendChild(rbLevel);
    }
    photo.appendChild(badge);

    /* Stats bar */
    const statDefs = [{k:"str",l:"STR",c:"sb-str"},{k:"agi",l:"AGI",c:"sb-agi"},{k:"spd",l:"SPD",c:"sb-spd"},{k:"int",l:"INT",c:"sb-int"},{k:"mana",l:"MNA",c:"sb-mana"},{k:"res",l:"RES",c:"sb-res"},{k:"cha",l:"CHA",c:"sb-cha"},{k:"aura",l:"AUR",c:"sb-aura"}];
    const hasStats = statDefs.some(d => (stats[d.k]||0) > 0);
    if (hasStats) {
      const bar = document.createElement("div");
      bar.className = "stats-bar";
      statDefs.forEach(d => {
        const v = stats[d.k] || 0;
        if (d.k === "aura" && v === 0) return;
        const item = document.createElement("div");
        item.className = "sb-item "+d.c;
        item.innerHTML = "<div class=sb-lbl>"+d.l+"</div><div class=sb-val>"+v+"</div><div class=sb-bar><div class=sb-fill style=width:"+Math.min(100,Math.round(v/9999*100))+"%></div></div>";
        bar.appendChild(item);
      });
      if (bar.children.length) photo.appendChild(bar);
    }

    card.appendChild(photo);

    /* BODY */
    const body = document.createElement("div");
    body.className = "card-body";

    const fn = document.createElement("div");
    fn.className = "card-fn";
    fn.textContent = ch.firstname || "";
    body.appendChild(fn);

    /* Nom avec underline race */
    const ln = document.createElement("div");
    ln.className = "card-ln";
    ln.textContent = ch.lastname || "";
    body.appendChild(ln);

    /* Race pill — aucune limite */
    const pill = document.createElement("div");
    pill.className = "card-rpill";
    pill.style.cssText = "color:"+raceColor+";border-color:"+raceColor+"44;background:"+raceColor+"0e";
    const pip = document.createElement("span");
    pip.className = "rpip";
    pip.style.cssText = "background:"+raceColor+";box-shadow:0 0 4px "+raceColor;
    pill.appendChild(pip);
    const raceSpan = document.createElement("span");
    raceSpan.textContent = ch.race || "";
    pill.appendChild(raceSpan);
    if (ch.raceSpecific) {
      const sep = document.createElement("span");
      sep.style.cssText = "opacity:.4;margin:0 3px";
      sep.textContent = ".";
      pill.appendChild(sep);
      const specific = document.createElement("span");
      specific.style.opacity = ".85";
      specific.textContent = ch.raceSpecific;
      pill.appendChild(specific);
    }
    body.appendChild(pill);

    const desc = document.createElement("p");
    desc.className = "card-desc";
    desc.textContent = ch.desc || ch.bio || "";
    body.appendChild(desc);

    /* Pouvoirs — SANS emoji */
    const powers = ch.powers || [];
    if (powers.length > 0) {
      const ps = document.createElement("div");
      ps.className = "powers-section";
      const pt = document.createElement("div");
      pt.className = "powers-title";
      pt.textContent = "POUVOIRS";
      ps.appendChild(pt);
      const pl = document.createElement("div");
      pl.className = "powers-list";
      powers.forEach(pw => {
        const pi = document.createElement("div");
        pi.className = "power-item";
        pi.style.borderColor = raceColor+"88";
        pi.style.background  = raceColor+"08";
        const pn = document.createElement("div");
        pn.className = "power-name";
        pn.style.color = raceColor;
        pn.textContent = pw.name || pw;
        pi.appendChild(pn);
        if (pw.desc) {
          const pd = document.createElement("div");
          pd.className = "power-desc";
          pd.textContent = pw.desc;
          pi.appendChild(pd);
        }
        pl.appendChild(pi);
      });
      ps.appendChild(pl);
      body.appendChild(ps);
    }

    /* Liens */
    const ls = ch.links||(ch.linkUrl?[{t:ch.linkType||"Fiche",h:ch.linkUrl}]:[]);
    if (ls.length > 0) {
      const linksDiv = document.createElement("div");
      linksDiv.className = "card-links";
      ls.forEach(l => {
        const a = document.createElement("a");
        a.className = "lbtn";
        a.href = l.h || l.url || "#";
        a.target = "_blank";
        a.textContent = l.t || l.type || "Lien";
        linksDiv.appendChild(a);
      });
      body.appendChild(linksDiv);
    }

    /* Admin */
    if (ch.id) {
      const adminRow = document.createElement("div");
      adminRow.className = "card-admin-row";
      adminRow.style.display = window._isAdmin ? "flex" : "none";
      const editBtn = document.createElement("button");
      editBtn.className = "card-edit-btn";
      editBtn.textContent = "✎ Modifier";
      editBtn.onclick = () => window.openEditFiche?.(ch.id);
      const delBtn = document.createElement("button");
      delBtn.className = "card-del-btn";
      delBtn.textContent = "✕ Supprimer";
      delBtn.onclick = () => window.deleteFicheById?.(ch.id);
      adminRow.appendChild(editBtn);
      adminRow.appendChild(delBtn);
      body.appendChild(adminRow);
    }

    card.appendChild(body);

    this.dataset.race = ch.race || "";
    this.dataset.rank = rank;
    this.replaceChildren(card);

    bindTilt(card);
    bindScramble(card);
  }

  updateAdminVisibility(isAdmin) {
    const row = this.querySelector(".card-admin-row");
    if (row) row.style.display = isAdmin ? "flex" : "none";
  }
}

customElements.define("jaharta-card", JahartaCard);
