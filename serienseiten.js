/* APEX – Serienseiten und Serienübersicht: Interaktionen.
   Die Seiten sind fertiges HTML; dieses Skript ergänzt nur Bedienung und rückt „Nächstes Rennen“
   nach dem heutigen Datum vor. Es lädt nichts nach und speichert nur die Einstellung
   „Ergebnisse verbergen“ und die Serienauswahl (gleiche Schlüssel wie in der App) sowie auf der Seite
   „In der Nähe“ den gewählten Startort. */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const root = document.documentElement;
  const SPOILER = "apex_spoiler";
  const heute = (() => {
    try { return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }); }
    catch (e) { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  })();

  /* Vorschau ohne Ordneradressen (…/formel-1/index.html): Verweise auf Ordner mit index.html ergänzen */
  function ordnerLinks(r) {
    if (/\/index\.html$/.test(location.pathname)) $$("a[href]", r).forEach((a) => {
      const m = /^((?:\.\.?\/)+(?:[\w-]+\/)*)([?#].*)?$/.exec(a.getAttribute("href"));
      if (m) a.setAttribute("href", m[1] + "index.html" + (m[2] || ""));
    });
  }
  ordnerLinks();

  /* Kurzer Hinweis unten */
  let uhr = 0;
  function hinweis(t) { const el = $("#toast"); if (!el) return; el.textContent = t; el.classList.add("on"); clearTimeout(uhr); uhr = setTimeout(() => el.classList.remove("on"), 2600); }

  /* Ergebnisse verbergen */
  const schalter = $("#spoiler");
  function spoiler(an, speichern) {
    root.classList.toggle("sp", an);
    $$(".auf").forEach((x) => x.classList.remove("auf"));
    if (schalter) schalter.setAttribute("aria-checked", String(an));
    if (speichern) { try { localStorage.setItem(SPOILER, an ? "1" : "0"); } catch (e) {} hinweis(an ? "Ergebnisse verborgen" : "Ergebnisse sichtbar"); }
  }
  if (schalter) {
    schalter.setAttribute("aria-checked", String(root.classList.contains("sp")));
    schalter.addEventListener("click", () => spoiler(!root.classList.contains("sp"), true));
  }
  addEventListener("storage", (e) => { if (e.key === SPOILER) spoiler(e.newValue === "1", false); });

  /* Klicks: Zeile aufklappen, Ergebnis aufdecken */
  function oeffnen(li, an) {
    if (an == null) an = !li.classList.contains("open");
    li.classList.toggle("open", an);
    const b = $(".gp", li); if (b) b.setAttribute("aria-expanded", String(an));
  }
  document.addEventListener("click", (ev) => {
    const r = ev.target.closest(".reveal");
    if (r) { const z = r.closest(".race,.wert"); if (z) z.classList.add("auf"); return; }
    const g = ev.target.closest(".race .gp");
    if (g) oeffnen(g.closest(".race"));
  });
  function zuZeile(id, sanft) {
    const li = document.getElementById("r-" + id); if (!li) return;
    /* Zeile einer anderen Saison: vorher umschalten */
    const s = li.closest(".saison"); if (s && s.hidden) saisonZeigen(s.dataset.saison);
    oeffnen(li, true);
    li.scrollIntoView({ block: "center", behavior: sanft ? "smooth" : "auto" });
    li.classList.remove("hl"); void li.offsetWidth; li.classList.add("hl");
  }

  /* Wo schauen? – Land umschalten */
  $$(".seg button[data-l]").forEach((b) => b.addEventListener("click", () => {
    $$(".seg button[data-l]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $$(".tvland").forEach((x) => x.classList.toggle("on", x.dataset.land === b.dataset.l));
  }));

  /* Saisons (Serien- und Streckenseiten): Umschalter über den Terminen, gezeigt wird eine Saison */
  const saisons = $$(".saison[data-saison]");
  function saisonZeigen(k) {
    if (!saisons.some((s) => s.dataset.saison === k)) return;
    saisons.forEach((s) => { s.hidden = s.dataset.saison !== k; });
    $$(".saisonseg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.saison === k)));
  }
  $$(".saisonseg button").forEach((b) => b.addEventListener("click", () => saisonZeigen(b.dataset.saison)));
  /* abgeschlossen: alle Termine der Saison liegen vor heute */
  saisons.forEach((s) => { const a = $(".abg", s); if (a && s.dataset.bis && s.dataset.bis < heute) a.hidden = false; });

  /* Abschnittsnavigation markieren */
  const links = $$(".subnav a");
  if (links.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id));
    }), { rootMargin: "-40% 0px -55% 0px" });
    links.forEach((a) => { const el = document.getElementById(a.getAttribute("href").slice(1)); if (el) io.observe(el); });
  }

  /* Termine abonnieren */
  const veil = $("#veil"), abo = $("#abo");
  function aboZu() { if (veil && veil.classList.contains("on")) { veil.classList.remove("on"); if (abo) abo.focus(); } }
  if (veil && abo) {
    abo.addEventListener("click", (ev) => { ev.preventDefault(); veil.classList.add("on"); const o = $(".opt", veil); if (o) o.focus(); });
    $("#closeabo").addEventListener("click", aboZu);
    veil.addEventListener("click", (ev) => { if (ev.target === veil) aboZu(); });
    document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") aboZu(); });
    $$("a.opt", veil).forEach((a) => a.addEventListener("click", () => setTimeout(aboZu, 300)));
    const kopie = $("#copyabo");
    if (kopie) kopie.addEventListener("click", () => { kopieren(kopie.dataset.url); veil.classList.remove("on"); });
  }
  function kopieren(url) {
    const alt = () => {
      try {
        const t = document.createElement("textarea"); t.value = url; t.setAttribute("readonly", "");
        t.style.cssText = "position:fixed;top:0;left:0;opacity:0"; document.body.appendChild(t); t.select();
        const ok = document.execCommand("copy"); document.body.removeChild(t);
        if (ok) { hinweis("Link kopiert"); return; }
      } catch (e) {}
      window.prompt("Link kopieren:", url);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => hinweis("Link kopiert"), alt);
    else alt();
  }

  /* Nächstes Rennen nach dem heutigen Datum: erstes Event, das noch nicht vorbei ist */
  const karte = $("#next .nextcard");
  let NEXT = karte ? karte.dataset.id || "" : "";
  if (karte) {
    const kand = $$("template.naechst").map((t) => ({ id: t.dataset.id, von: t.dataset.von, bis: t.dataset.bis, t }));
    if (NEXT) kand.push({ id: NEXT, von: karte.dataset.von, bis: karte.dataset.bis, t: null });
    kand.sort((a, b) => (a.von < b.von ? -1 : a.von > b.von ? 1 : 0));
    const x = kand.find((k) => k.bis >= heute), ende = $("#naechst-ende");
    const neu = x ? x.id : ende ? "" : NEXT;
    if (neu !== NEXT) {
      const q = x ? x.t : ende;
      if (q && q.content) { karte.replaceWith(q.content.cloneNode(true)); NEXT = neu; }
    }
    $$(".race.next").forEach((li) => { if (li.id !== "r-" + NEXT) li.classList.remove("next"); });
    const nl = NEXT && document.getElementById("r-" + NEXT); if (nl) nl.classList.add("next");
  }
  /* Gezeigte Saison: die mit dem nächsten Termin (wie die Karte), sonst die jüngste mit Terminen */
  if (saisons.length > 1) {
    const nl = NEXT && document.getElementById("r-" + NEXT), sn = nl && nl.closest(".saison");
    const mitTermin = saisons.filter((s) => s.dataset.bis).sort((a, b) => (a.dataset.bis < b.dataset.bis ? -1 : 1));
    const s = sn || mitTermin[mitTermin.length - 1] || saisons[0];
    saisonZeigen(s.dataset.saison);
  }
  if (/^#r-/.test(location.hash)) zuZeile(location.hash.slice(3), false);
  addEventListener("hashchange", () => { if (/^#r-/.test(location.hash)) zuZeile(location.hash.slice(3), true); });

  /* Wertung und lange Zeitpläne: erst gekürzt, auf Wunsch alles */
  $$(".more").forEach((b) => {
    const liste = b.previousElementSibling; if (!liste) return;
    liste.classList.add("kurz"); b.hidden = false; b.setAttribute("aria-expanded", "false");
    b.addEventListener("click", () => { const kurz = liste.classList.toggle("kurz"); b.textContent = kurz ? b.dataset.alle : b.dataset.weniger; b.setAttribute("aria-expanded", String(!kurz)); festPruefen(); });
  });

  /* Saisonlinie (Saison des nächsten Events). Je Punkt [id, Text, Zustand d/c/u, Beschriftung, Monat, Farbe (optional)] */
  const datenEl = $("#apex-seite");
  const D = datenEl ? JSON.parse(datenEl.textContent) : null;
  const linie = D && D.linien ? (D.linien.find((l) => l.ev.some((x) => x[0] === NEXT)) || D.linien.find((l) => l.key === D.linie)) : null;
  function zeichnen() {
    const svg = $("#linesvg"); if (!svg || !linie) return;
    /* top: Platz über dem Scheitelpunkt für den Ortsnamen (steht über dem Ring, ohne ihn zu berühren) */
    const W = svg.clientWidth || 600, H = 118, padX = 10, top = 34, bot = 94, E = linie.ev, n = E.length;
    const ni = E.findIndex((x) => x[0] === NEXT);
    const lastDone = E.reduce((a, x, i) => (x[2] === "d" ? i : a), -1);
    const xs = E.map((_, i) => padX + (i * (W - 2 * padX)) / Math.max(1, n - 1));
    const xa = ni >= 0 ? xs[ni] : xs[Math.max(0, lastDone)];
    const y = (x) => { const span = x <= xa ? xa - padX : W - padX - xa; const r = span ? Math.abs(x - xa) / span : 0; return top + (bot - top) * Math.pow(r, 1.7); };
    let p = "", pd = "";
    for (let x = padX; x <= W - padX; x += 4) p += (p ? "L" : "M") + x.toFixed(1) + "," + y(x).toFixed(1);
    if (lastDone >= 0) for (let x = padX; x <= xs[lastDone]; x += 4) pd += (pd ? "L" : "M") + x.toFixed(1) + "," + y(x).toFixed(1);
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    let h = `<path class="track" d="${p}"/>` + (pd ? `<path class="done-track" d="${pd}"/>` : "");
    E.forEach((x, i) => {
      const cx = xs[i], cy = y(cx);
      let c;
      if (i === ni) c = `<circle class="halo" cx="${cx}" cy="${cy}" r="13" fill="none" stroke="var(--gold)" stroke-width="2.5"/><circle class="core" cx="${cx}" cy="${cy}" r="5" fill="var(--gold)"/>`;
      else if (x[2] === "c") c = `<circle class="core" cx="${cx}" cy="${cy}" r="4.5" fill="var(--bg)" stroke="var(--faint)" stroke-width="1.5"/><line x1="${cx - 5}" y1="${cy + 5}" x2="${cx + 5}" y2="${cy - 5}" stroke="var(--faint)" stroke-width="1.5"/>`;
      else if (x[2] === "d") c = `<circle class="core" cx="${cx}" cy="${cy}" r="4.5" fill="${x[5] || "var(--serie)"}"/>`;
      else c = `<circle class="core" cx="${cx}" cy="${cy}" r="4.5" fill="var(--bg)" stroke="${x[5] || "var(--paper)"}" stroke-width="1.5"/>`;
      h += `<g class="dot" tabindex="0" role="button" data-i="${i}" aria-label="${esc(x[1])}"><circle cx="${cx}" cy="${cy}" r="14" fill="transparent"/>${c}</g>`;
    });
    if (ni >= 0) h += `<text class="lbl gold" id="linelbl" x="${xs[ni]}" y="${top - 21}" text-anchor="middle">${esc(E[ni][3])}</text>`;
    h += `<text class="lbl" x="${xs[0]}" y="${H - 4}" text-anchor="start">${esc(E[0][4])}</text>`;
    h += `<text class="lbl" x="${xs[n - 1]}" y="${H - 4}" text-anchor="end">${esc(E[n - 1][4])}</text>`;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("aria-label", linie.aria); svg.innerHTML = h;
    /* Ortsname: Unterkante 4 px über dem Ring (Radius 13 + halbe Linienstärke), am Rand ganz im Bild */
    const lbl = $("#linelbl", svg);
    if (lbl && lbl.getBBox) {
      const b = lbl.getBBox();
      if (b.width) {
        lbl.setAttribute("y", (+lbl.getAttribute("y") + (top - 13 - 1.25 - 4) - (b.y + b.height)).toFixed(1));
        const links = b.x < 0 ? -b.x : 0, rechts = b.x + b.width > W ? b.x + b.width - W : 0;
        if (links || rechts) lbl.setAttribute("x", (xs[ni] + links - rechts).toFixed(1));
      }
    }
    const tip = $("#tip");
    svg.querySelectorAll(".dot").forEach((g) => {
      const x = E[+g.dataset.i];
      const zeig = () => { const r = g.getBBox(); tip.textContent = x[1]; tip.style.left = r.x + r.width / 2 + "px"; tip.style.top = r.y - 6 + "px"; tip.classList.add("on"); };
      const weg = () => tip.classList.remove("on");
      g.addEventListener("mouseenter", zeig); g.addEventListener("focus", zeig);
      g.addEventListener("mouseleave", weg); g.addEventListener("blur", weg);
      g.addEventListener("click", () => zuZeile(x[0], true));
      g.addEventListener("keydown", (k) => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); zuZeile(x[0], true); } });
    });
    const l = $("#capL"), r = $("#capR");
    if (l) l.innerHTML = linie.capL; if (r) r.textContent = linie.capR;
  }

  /* Karte bleibt am PC nur stehen, wenn sie ganz auf den Bildschirm passt */
  function festPruefen() {
    const n = $(".side .next"); if (!n) return;
    const breit = window.matchMedia ? matchMedia("(min-width:1000px)").matches : false;
    n.classList.toggle("fest", breit && n.offsetHeight + 36 <= innerHeight);
  }
  zeichnen(); festPruefen();
  let rz = 0;
  addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { zeichnen(); festPruefen(); }, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(festPruefen);

  /* Serienfilter wie in der App (Seiten „Dieses Wochenende“ und „In der Nähe“): bis 4 Serien einzelne Knöpfe,
     ab 5 (oder immer, mit immerGruppen) Gruppenknöpfe – Tippen klappt die Auswahl der Gruppe auf (oben
     „Alle …-Serien“, darunter die einzelnen Serien). Gleicher Speicher wie die App („apex_filter“, {kürzel: an/aus});
     ohne gespeicherte Auswahl die Standardwerte der App (Rahmenserien aus).
     opt.serien() = gezeigte Serien, opt.geaendert() = nach jeder Änderung der Auswahl */
  const FILTER = "apex_filter";
  function serienFilter(leiste, DAT, opt) {
    const SER = DAT.serien || {}, GRP = DAT.gruppen || {}, ALLE = Object.keys(SER), AKTIV = new Set();
    let offen = null, gezeigtOffen = null;
    function filterLaden() {
      let alt = null; try { alt = JSON.parse(localStorage.getItem(FILTER) || "null"); } catch (e) { alt = null; }
      if (!alt || typeof alt !== "object" || Array.isArray(alt)) alt = {};
      AKTIV.clear();
      ALLE.forEach((sk) => { if (typeof alt[sk] === "boolean" ? alt[sk] : !SER[sk].aus) AKTIV.add(sk); });
      if (!AKTIV.size) ALLE.forEach((sk) => { if (!SER[sk].aus) AKTIV.add(sk); });
      if (!AKTIV.size) ALLE.forEach((sk) => AKTIV.add(sk));
    }
    function filterSpeichern() { try { const o = {}; ALLE.forEach((sk) => { o[sk] = AKTIV.has(sk); }); localStorage.setItem(FILTER, JSON.stringify(o)); } catch (e) {} }
    const gezeigteSerien = () => opt.serien().filter((sk) => SER[sk]);
    const escH = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    function gruppenVon(sks) {
      const gl = Object.keys(GRP).map((g) => ({ g, name: GRP[g].name, short: GRP[g].short, farbe: GRP[g].farbe, sks: sks.filter((sk) => SER[sk].gruppe === g) }));
      const rest = sks.filter((sk) => !GRP[SER[sk].gruppe]);
      if (rest.length) gl.push({ g: "weitere", name: "Weitere", short: "Weitere", farbe: "", sks: rest });
      return gl.filter((x) => x.sks.length);
    }
    const knopf = (sk) => { const S = SER[sk], an = AKTIV.has(sk);
      return `<button class="wf-chip${an ? "" : " aus"}" type="button" data-serie="${sk}" aria-pressed="${an}" title="${escH(S.name)}"><i style="background:${S.color}"></i><span class="wf-l">${escH(S.name)}</span><span class="wf-s">${escH(S.short)}</span></button>`; };
    /* „Formel-Serien“, „Sportwagen- & GT-Serien“ (wie „Weitere … -Serien“ auf den Serienseiten) */
    const gruppenWort = (x) => (x.g === "weitere" ? "weiteren Serien" : x.name.split(" & ").map((w) => w + "-").join(" & ") + "Serien");
    /* Knöpfe werden neu gezeichnet – der Tastaturfokus wandert auf den neuen Knopf an gleicher Stelle */
    const fokusWahl = (el) => el.dataset.serie ? `.wf-chip[data-serie="${el.dataset.serie}"]`
      : el.classList.contains("wf-alle") ? ".wf-alle" : el.closest(".wf-grp") ? `.wf-grp[data-g="${el.closest(".wf-grp").dataset.g}"] .wf-an` : null;
    function filterZeichnen() {
      if (!leiste) return;
      const sks = gezeigteSerien(), f = document.activeElement, war = gezeigtOffen;
      const fokus = f && f !== document.body && leiste.contains(f) ? fokusWahl(f) : null;
      leiste.hidden = !sks.length;
      let h = "";
      if (sks.length && sks.length <= 4 && !opt.immerGruppen) { offen = null; h = `<div class="wf-leiste">${sks.map(knopf).join("")}</div>`; }
      else if (sks.length) {
        const gl = gruppenVon(sks);
        if (offen && !gl.some((x) => x.g === offen)) offen = null;
        h = `<div class="wf-leiste wf-gruppen">` + gl.map((x) => {
          const an = x.sks.filter((sk) => AKTIV.has(sk)).length, n = x.sks.length, st = !an ? "aus" : an < n ? "teil" : "an", auf = offen === x.g;
          /* Auswahl direkt hinter ihrem Knopf (Tab-Reihenfolge); sie liegt unter der ganzen Leiste */
          return `<div class="wf-grp ${st}${auf ? " offen" : ""}" data-g="${x.g}"${x.farbe ? ` style="--gf:${x.farbe}"` : ""}>` +
            `<button class="wf-an" type="button" aria-expanded="${auf}"${auf ? ' aria-controls="wf-panel"' : ""} aria-label="${escH(x.name)}: ${an} von ${n} Serien ausgewählt" title="${escH(x.name)}"><span class="wf-l">${escH(x.name)}</span><span class="wf-s">${escH(x.short)}</span><span class="wf-pf" aria-hidden="true">▾</span></button>` +
            (st === "teil" ? `<span class="wf-z" aria-hidden="true">${an}/${n}</span>` : "") + `</div>` +
            (auf ? `<div class="wf-panel" id="wf-panel" role="group" aria-label="${escH(x.name)}">` +
              `<button class="switch wf-alle" type="button" role="switch" aria-checked="${an === n}"><span class="track"></span>Alle ${escH(gruppenWort(x))}</button>` +
              `<div class="wf-chips">${x.sks.map(knopf).join("")}</div></div>` : "");
        }).join("") + "</div>";
      } else offen = null;
      leiste.innerHTML = h; gezeigtOffen = offen;
      /* Fokus zurück; lag er in der gerade geschlossenen Auswahl, auf den Gruppenknopf */
      const neu = fokus && ($(fokus, leiste) || (war && $(`.wf-grp[data-g="${war}"] .wf-an`, leiste))); if (neu) neu.focus({ preventScroll: true });
    }
    /* wie toggleSeries()/toggleGruppe() der App: mindestens eine Serie bleibt ausgewählt */
    const MIND_EINE = "Mindestens eine Serie bleibt ausgewählt";
    function serieUmschalten(sk) { if (AKTIV.has(sk)) { if (AKTIV.size <= 1) { hinweis(MIND_EINE); return; } AKTIV.delete(sk); } else AKTIV.add(sk); geaendert(); }
    /* Schalter „Alle …-Serien“: sind alle Serien der Gruppe an, gehen alle aus – sonst alle an */
    function gruppeUmschalten(g) {
      const x = gruppenVon(gezeigteSerien()).find((y) => y.g === g); if (!x) return;
      if (x.sks.every((sk) => AKTIV.has(sk))) { if (x.sks.length >= AKTIV.size) { hinweis(MIND_EINE); return; } x.sks.forEach((sk) => AKTIV.delete(sk)); }
      else x.sks.forEach((sk) => AKTIV.add(sk));
      geaendert();
    }
    function geaendert() { filterSpeichern(); filterZeichnen(); opt.geaendert(); }
    if (leiste) leiste.addEventListener("click", (ev) => {
      const chip = ev.target.closest(".wf-chip"), alle = ev.target.closest(".wf-alle"), an = ev.target.closest(".wf-an");
      if (chip) serieUmschalten(chip.dataset.serie);
      else if (alle) gruppeUmschalten(offen);
      else if (an) { const g = an.closest(".wf-grp").dataset.g; offen = offen === g ? null : g; filterZeichnen(); }
    });
    /* Auswahl schließen: nochmals Tippen auf den Gruppenknopf (oben), Tippen außerhalb des Filters oder Esc (wie in der App) */
    document.addEventListener("click", (ev) => { if (offen && leiste && !leiste.contains(ev.target)) { offen = null; filterZeichnen(); } }, true);
    document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && offen) { offen = null; filterZeichnen(); } });
    /* Auswahl aus der App übernehmen: anderer Tab (storage) oder Rückkehr aus dem Browser-Zwischenspeicher */
    const abgleichen = () => { filterLaden(); filterZeichnen(); opt.geaendert(); };
    addEventListener("storage", (ev) => { if (ev.key === FILTER || ev.key === null) abgleichen(); });
    addEventListener("pageshow", (ev) => { if (ev.persisted) abgleichen(); });
    filterLaden();
    return { aktiv: AKTIV, zeichnen: filterZeichnen, schliessen: () => { offen = null; } };
  }

  /* Dieses Wochenende: Wochenende zum heutigen Datum (Donnerstag 00:00 bis Montag 06:00 deutscher Zeit).
     Die Seite enthält jedes Wochenende mit Events (das erste direkt, die übrigen als <template>). Montag bis
     Donnerstag gilt das kommende, Freitag bis Sonntag das laufende Wochenende; ohne Events ein Hinweis und
     das nächste Wochenende mit Events. Dazu: vorbei/läuft, Heute, Serienfilter (wie in der App) und „Trainings ausblenden“. */
  const woche = $("#woche");
  if (woche) {
    const MONL = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    const p2 = (n) => String(n).padStart(2, "0");
    const wand = () => {
      try { const t = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Berlin", hour12: false }); return { datum: t.slice(0, 10), zeit: t.slice(11, 16) }; }
      catch (e) { const d = new Date(); return { datum: d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()), zeit: p2(d.getHours()) + ":" + p2(d.getMinutes()) }; }
    };
    const tag = (x) => { const a = x.split("-").map(Number); return new Date(Date.UTC(a[0], a[1] - 1, a[2])); };
    const plus = (x, n) => { const d = tag(x); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    /* Donnerstag des Wochenendes; Montag bis 06:00 gehört noch zum Wochenende davor */
    const donnerstag = (j) => { const w = tag(j.datum).getUTCDay(); return w === 1 && j.zeit < "06:00" ? plus(j.datum, -4) : plus(j.datum, w === 0 ? -3 : 4 - w); };
    const spanneText = (von, bis) => { const a = tag(von), b = tag(bis);
      return a.getUTCMonth() === b.getUTCMonth() ? a.getUTCDate() + ".–" + b.getUTCDate() + ". " + MONL[b.getUTCMonth()] + " " + b.getUTCFullYear()
        : a.getUTCDate() + ". " + MONL[a.getUTCMonth()] + (a.getUTCFullYear() !== b.getUTCFullYear() ? " " + a.getUTCFullYear() : "") + " – " + b.getUTCDate() + ". " + MONL[b.getUTCMonth()] + " " + b.getUTCFullYear(); };
    const erste = $(".wk", woche);
    const wochen = (erste ? [{ k: erste.dataset.do, titel: erste.dataset.titel, el: erste }] : [])
      .concat($$("template.wvorlage").map((t) => ({ k: t.dataset.do, t })))
      .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0));
    let gezeigt = erste ? wochen.find((w) => w.el === erste) : null;
    let ohneTraining = false;

    function waehlen() {
      const j = wand(), k = donnerstag(j);
      const ziel = wochen.find((w) => w.k === k) || wochen.find((w) => w.k > k) || null;
      if (ziel !== gezeigt) {
        if (ziel && !ziel.el) { ziel.el = ziel.t.content.firstElementChild.cloneNode(true); ziel.titel = ziel.el.dataset.titel; }
        woche.replaceChildren(...(ziel ? [ziel.el] : []));
        if (ziel) ordnerLinks(ziel.el);
        gezeigt = ziel;
      }
      const leer = $("#wleer"), zr = $("#wzr");
      if (ziel && ziel.k === k) { leer.hidden = true; leer.innerHTML = ""; if (zr) zr.textContent = ziel.titel; }
      else {
        if (zr) zr.textContent = spanneText(plus(k, 1), plus(k, 3));
        leer.innerHTML = "<p><b>An diesem Wochenende finden keine Rennen statt.</b></p>" + (ziel
          ? "<p>Nächstes Rennwochenende: <b>" + ziel.titel + "</b></p>"
          : "<p>Weitere Termine folgen, sobald die Kalender veröffentlicht sind.</p>");
        leer.hidden = false;
      }
    }
    /* vorbei (ausgegraut) und läuft – nach der Uhrzeit; „läuft gerade“ und „Heute“ nach dem Datum */
    function zustand() {
      const jetzt = Date.now(), heute = wand().datum;
      $$("li[data-a]", woche).forEach((li) => {
        const vorbei = jetzt >= +li.dataset.e, laeuft = !vorbei && jetzt >= +li.dataset.a, m = $(".wlive", li);
        li.classList.toggle("vorbei", vorbei); li.classList.toggle("laeuft", laeuft);
        if (laeuft && !m) $(".wsi b", li).insertAdjacentHTML("beforeend", ' <span class="wlive">läuft</span>');
        else if (!laeuft && m) m.remove();
      });
      $$("li.ohne", woche).forEach((li) => li.classList.toggle("vorbei", li.dataset.bis < heute));
      $$("[data-von]", woche).forEach((x) => { const l = $(".wlg", x); if (l) l.hidden = !(x.dataset.von <= heute && heute <= x.dataset.bis); });
      $$(".wtag", woche).forEach((t) => { const h = $(".wheute", t); if (h) h.hidden = t.dataset.tag !== heute; });
    }
    /* Serienfilter (serienFilter, unten): nur mit den Serien des gezeigten Wochenendes */
    const DAT = (() => { try { return JSON.parse($("#apex-woche").textContent); } catch (e) { return {}; } })();
    const SER = DAT.serien || {};
    let filterWoche;
    const wochenSerien = () => (gezeigt && gezeigt.el ? gezeigt.el.dataset.serien.split(" ").filter((sk) => SER[sk]) : []);
    const FL = serienFilter($("#wfilter"), DAT, { serien: wochenSerien, geaendert: () => filtern() });

    /* Serienauswahl und „Trainings ausblenden“ wirken nur auf den Zeitplan (Trainings per CSS, Klasse am <html>).
       „Auf dem Programm“ und „Wo läuft was?“ zeigen immer alle Serien des Wochenendes; ausgeblendete gedämpft. */
    const sichtbar = (x) => FL.aktiv.has(x.dataset.serie);
    function filtern() {
      root.classList.toggle("ohnetraining", ohneTraining);
      let zeilen = 0;
      $$(".wtag", woche).forEach((t) => {
        let n = 0;
        $$(".wsl li", t).forEach((li) => { li.hidden = !sichtbar(li); if (!li.hidden && !(ohneTraining && li.classList.contains("training"))) n++; });
        t.hidden = !n; zeilen += n;
      });
      let evs = 0;
      $$(".wel li", woche).forEach((li) => {
        const an = sichtbar(li), aus = $(".waus", li);
        li.classList.toggle("gedaempft", !an); if (aus) aus.hidden = an; if (an) evs++;
      });
      const nix = $(".wnix", woche);
      if (nix) {
        nix.hidden = zeilen > 0;
        nix.textContent = !evs ? "Keine der ausgewählten Serien fährt an diesem Wochenende – oben weitere Serien auswählen."
          : ohneTraining ? "In diesem Zeitraum stehen nur Trainings auf dem Programm – ohne „Trainings ausblenden“ erscheinen sie." : "Für diese Events liegen noch keine Sessionzeiten vor.";
      }
      const serien = wochenSerien();
      $$(".wtvb").forEach((b) => { b.hidden = !serien.includes(b.dataset.serie); });
      const sender = $("#sender");
      if (sender) sender.hidden = !$$(".wtvb").some((b) => !b.hidden);
    }
    const tr = document.getElementById("ohnetraining");
    if (tr) tr.addEventListener("click", () => { ohneTraining = tr.getAttribute("aria-checked") !== "true"; tr.setAttribute("aria-checked", String(ohneTraining)); filtern(); });
    const alles = () => { waehlen(); if (gezeigt !== filterWoche) { filterWoche = gezeigt; FL.schliessen(); FL.zeichnen(); } zustand(); filtern(); };
    alles();
    setInterval(alles, 60000);
  }

  /* In der Nähe: Karte mit allen Strecken in Europa, Liste nach Entfernung (Luftlinie) ab dem Startort.
     Die Seite enthält alle Termine ab dem Datenstand; welche noch kommen, entscheidet das heutige Datum.
     Startort lokal unter „apex_ort“, Serienauswahl wie in der App („apex_filter“). Lädt nichts nach. */
  const nahDaten = $("#apex-naehe");
  if (nahDaten) {
    const N = (() => { try { return JSON.parse(nahDaten.textContent); } catch (e) { return null; } })();
    if (N) nahStarten(N);
  }
  function nahStarten(N) {
    const byId = (id) => document.getElementById(id);
    const K = N.karte;
    /* Projektion: winkeltreue Kegelprojektion (identisch mit der beim Erzeugen der Karte) */
    const RAD = Math.PI / 180, HP = Math.PI / 2, tany = (y) => Math.tan((HP + y) / 2);
    const PY0 = K.par[0] * RAD, PY1 = K.par[1] * RAD, CY0 = Math.cos(PY0);
    const PN = Math.log(CY0 / Math.cos(PY1)) / Math.log(tany(PY1) / tany(PY0)), PF = CY0 * Math.pow(tany(PY0), PN) / PN;
    function proj(lat, lon) { const x = (lon - K.lon0) * RAD, r = PF / Math.pow(tany(lat * RAD), PN); return [K.tx + K.k * r * Math.sin(PN * x), K.ty - K.k * (PF - r * Math.cos(PN * x))]; }
    function unproj(X, Y) { const x = (X - K.tx) / K.k, y = (K.ty - Y) / K.k, fy = PF - y, r = Math.sign(PN) * Math.sqrt(x * x + fy * fy); let l = Math.atan2(x, Math.abs(fy)) * Math.sign(fy); if (fy * PN < 0) l -= Math.PI * Math.sign(x) * Math.sign(fy); return [(2 * Math.atan(Math.pow(PF / r, 1 / PN)) - HP) / RAD, l / PN / RAD + K.lon0]; }
    function km(a, b) { const p1 = a[0] * RAD, p2 = b[0] * RAD, dp = p2 - p1, dl = (b[1] - a[1]) * RAD, h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2; return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h))); }
    function ziel(lat, lon, brg, d) { const a = d / 6371, t = brg * RAD, p1 = lat * RAD, l1 = lon * RAD, p2 = Math.asin(Math.sin(p1) * Math.cos(a) + Math.cos(p1) * Math.sin(a) * Math.cos(t)), l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(a) * Math.cos(p1), Math.cos(a) - Math.sin(p1) * Math.sin(p2)); return [p2 / RAD, l2 / RAD]; }

    /* Hilfen */
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
    const MON = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
    const JAHR = +heute.slice(0, 4);
    function plusTage(x, n) { const d = new Date(x + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
    function datum(d0, d1) { const a = new Date(d0 + "T12:00:00"), b = new Date(d1 + "T12:00:00"), j = b.getFullYear() !== JAHR ? " " + b.getFullYear() : "";
      if (d0 === d1) return a.getDate() + ". " + MON[a.getMonth()] + j;
      if (a.getMonth() === b.getMonth()) return a.getDate() + ".–" + b.getDate() + ". " + MON[b.getMonth()] + j;
      return a.getDate() + ". " + MON[a.getMonth()] + " – " + b.getDate() + ". " + MON[b.getMonth()] + j; }
    function kmText(d) { const r = d < 50 ? Math.round(d) : Math.round(d / 5) * 5; return "≈ " + r.toLocaleString("de-DE") + " km"; }
    const route = (o) => `https://www.google.com/maps/dir/?api=1&origin=${START.lat},${START.lon}&destination=${o.lat},${o.lon}`;

    /* Daten aufbereiten */
    const S = N.serien, G = N.gruppen, SK = Object.keys(S);
    const ORTE = Object.entries(N.strecken).map(([id, v]) => ({ id, name: v[0], land: v[1], typ: v[2], lat: v[3], lon: v[4], xy: proj(v[3], v[4]) }));
    const ORT_BY = Object.fromEntries(ORTE.map((o) => [o.id, o]));
    /* Rennwochenenden: gleiche Strecke + gleiche Woche = eine Zeile (z. B. MotoGP mit Moto2 und Moto3) */
    function wochenKey(x) { const d = new Date(x + "T12:00:00"); const t = (d.getDay() + 6) % 7; d.setDate(d.getDate() - t); return d.toISOString().slice(0, 10); }
    const ZEILEN = (() => { const m = new Map();
      N.termine.forEach(([v, sk, n, d0, d1]) => { if (!ORT_BY[v] || !S[sk]) return; const k = v + "|" + wochenKey(d1); let z = m.get(k);
        if (!z) { z = { v, d0, d1, ev: [] }; m.set(k, z); } z.d0 = d0 < z.d0 ? d0 : z.d0; z.d1 = d1 > z.d1 ? d1 : z.d1; z.ev.push({ s: sk, n }); });
      return [...m.values()].map((z) => {
        const serien = [...new Set(z.ev.map((e) => e.s))].sort((a, b) => (S[a].aus - S[b].aus) || (SK.indexOf(a) - SK.indexOf(b)));
        const haupt = serien[0], namen = z.ev.filter((e) => e.s === haupt).map((e) => e.n);
        let name = namen[0]; if (namen.length > 1) { name = namen[0].replace(/\s+I{1,3}$/, "") + " · " + namen.length + " Rennen"; }
        return { v: z.v, d0: z.d0, d1: z.d1, serien, haupt, name };
      }).sort((a, b) => (a.d0 < b.d0 ? -1 : 1)); })();

    /* Zustand: Startort (lokal gespeichert, sonst Beispielort Frankfurt), Zeitraum, ausgewählte Strecke */
    const BEISPIEL = { n: "Frankfurt", lat: 50.1, lon: 8.675, beispiel: true };
    const ortOK = (o) => o && typeof o === "object" && typeof o.n === "string" && o.n && isFinite(o.lat) && isFinite(o.lon) && Math.abs(o.lat) <= 90 && Math.abs(o.lon) <= 180;
    let START = (() => { try { const o = JSON.parse(localStorage.getItem("apex_ort") || "null"); return ortOK(o) ? { n: o.n, lat: +o.lat, lon: +o.lon } : BEISPIEL; } catch (e) { return BEISPIEL; } })();
    let ZEIT = "12", AUSGEWAEHLT = null;
    const OFFEN_MEHR = new Set();
    const FL = serienFilter(byId("wfilter"), N, { serien: () => SK, immerGruppen: true, geaendert: () => aktualisieren() });
    const AKTIV = FL.aktiv;

    const bisDatum = () => (ZEIT === "3" ? plusTage(heute, 92) : ZEIT === "12" ? plusTage(heute, 365) : N.jahr + "-12-31");
    function sichtbareZeilen() {
      const bis = bisDatum();
      return ZEILEN.filter((z) => z.d1 >= heute && z.d0 <= bis).map((z) => ({ ...z, serien: z.serien.filter((sk) => AKTIV.has(sk)) })).filter((z) => z.serien.length).map((z) => ((z.haupt = z.serien[0]), z));
    }
    function ortListe() {
      const zeilen = sichtbareZeilen(), m = new Map();
      zeilen.forEach((z) => { if (!m.has(z.v)) m.set(z.v, []); m.get(z.v).push(z); });
      return [...m.entries()].map(([id, zs]) => { const o = ORT_BY[id]; const gr = [...new Set(zs.map((z) => S[z.haupt].gruppe))];
        return { ...o, zeilen: zs, gruppen: gr, d: km([START.lat, START.lon], [o.lat, o.lon]) }; }).sort((a, b) => a.d - b.d);
    }
    const farbe = (g) => (G[g] && G[g].farbe) || "#8d8678";

    /* Karte: Ausschnitt, Zoom, Verschieben */
    const W = K.W, H = K.H, svg = byId("svg"), dyn = byId("dyn"), box = byId("karte");
    let VB = { cx: W / 2, cy: H / 2, w: W };
    function verh() { const r = box.getBoundingClientRect(); return r.height / r.width || H / W; }
    function maxW() { return Math.min(W, H / verh()); }
    function klemmen() { const mw = maxW(); VB.w = Math.max(mw / 8, Math.min(mw, VB.w)); const h = VB.w * verh();
      VB.cx = Math.max(VB.w / 2, Math.min(W - VB.w / 2, VB.cx)); VB.cy = Math.max(h / 2, Math.min(H - h / 2, VB.cy)); }
    function vbSetzen() { klemmen(); const h = VB.w * verh(); svg.setAttribute("viewBox", `${(VB.cx - VB.w / 2).toFixed(2)} ${(VB.cy - h / 2).toFixed(2)} ${VB.w.toFixed(2)} ${h.toFixed(2)}`);
      const z = maxW() / VB.w; box.classList.toggle("gezoomt", z > 1.05); byId("zminus").disabled = z <= 1.01; byId("zplus").disabled = z >= 7.9; byId("zganz").disabled = z <= 1.01; kartenpunkte(); }
    function ppu() { return box.getBoundingClientRect().width / VB.w; }
    function klemmenNurW() { const mw = maxW(); VB.w = Math.max(mw / 8, Math.min(mw, VB.w)); }
    function zoomUm(f, px, py) { const alt = VB.w; VB.w = VB.w / f; klemmenNurW(); const k = VB.w / alt;
      if (px != null) { VB.cx = px + (VB.cx - px) * k; VB.cy = py + (VB.cy - py) * k; } vbSetzen(); }
    function svgPunkt(cx, cy) { const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
    function startAusschnitt() { const schmal = box.getBoundingClientRect().width < 640; const [x, y] = proj(START.lat, START.lon);
      VB = { cx: schmal ? x : W / 2, cy: schmal ? y : H / 2, w: schmal ? maxW() / 1.6 : maxW() }; vbSetzen(); }

    /* Zeichnen */
    const NS = "http://www.w3.org/2000/svg";
    function el(tag, attr, text) { const e = document.createElementNS(NS, tag); for (const k in attr) e.setAttribute(k, attr[k]); if (text != null) e.textContent = text; return e; }
    let LISTE = [];
    function kartenpunkte() {
      const u = 1 / ppu(); dyn.textContent = "";
      const ich = proj(START.lat, START.lon);
      /* Ringe 300/600 km (echte Kreise auf der Erde, projiziert) */
      [300, 600].forEach((r) => { const pts = []; for (let b = 0; b <= 360; b += 4) { const [la, lo] = ziel(START.lat, START.lon, b, r); pts.push(proj(la, lo).map((v) => v.toFixed(1)).join(",")); }
        dyn.append(el("polyline", { points: pts.join(" "), fill: "none", stroke: "var(--gold)", "stroke-opacity": r === 300 ? 0.55 : 0.35, "stroke-width": 1.2 * u, "stroke-dasharray": `${5 * u} ${4 * u}` }));
      });
      /* Strecken */
      const sel = AUSGEWAEHLT;
      LISTE.slice().reverse().forEach((o) => { const [x, y] = o.xy; const n = o.zeilen.length, r = (4.2 + Math.min(n, 6) * 0.55) * u;
        const g1 = farbe(o.gruppen[0]), g2 = o.gruppen[1] ? farbe(o.gruppen[1]) : null;
        const grp = el("g", { "data-id": o.id, class: "pt" });
        if (o.id === sel) grp.append(el("circle", { cx: x, cy: y, r: r + 7 * u, fill: "none", stroke: "var(--paper)", "stroke-width": 1.5 * u }));
        grp.append(el("circle", { cx: x, cy: y, r: r + (g2 ? 2.6 * u : 1.6 * u), fill: g2 || "var(--meer)" }));
        if (g2) grp.append(el("circle", { cx: x, cy: y, r: r + 1.1 * u, fill: "var(--meer)" }));
        grp.append(el("circle", { cx: x, cy: y, r, fill: g1 }));
        if (o.typ === "rallye") grp.append(el("circle", { cx: x, cy: y, r: r * 0.38, fill: "var(--meer)" }));
        dyn.append(grp); });
      /* Beschriftungen: die nächsten Strecken + die ausgewählte, ohne Überlappung */
      const z = maxW() / VB.w, anzahl = z < 1.3 ? 5 : z < 2.2 ? 9 : z < 3.5 ? 16 : 99, belegt = [];
      const [ix, iy] = ich, iw = START.n.length * 7.6 * u; belegt.push([ix - iw / 2, iy - 28 * u, ix + iw / 2, iy + 9 * u]);
      LISTE.forEach((o) => { const r = 2.5 * u; belegt.push([o.xy[0] - r, o.xy[1] - r, o.xy[0] + r, o.xy[1] + r]); });
      const kurz = box.getBoundingClientRect().width < 560;
      const vh = VB.w * verh(), v0 = [VB.cx - VB.w / 2 + 4 * u, VB.cy - vh / 2 + 4 * u, VB.cx + VB.w / 2 - 4 * u, VB.cy + vh / 2 - 4 * u];
      belegt.push([v0[2] - 50 * u, v0[1] - 4 * u, v0[2] + 4 * u, v0[1] + 130 * u]);
      const kand = LISTE.slice(0, anzahl); if (sel && !kand.some((o) => o.id === sel)) { const s0 = LISTE.find((o) => o.id === sel); if (s0) kand.unshift(s0); }
      kand.sort((a, b) => (b.id === sel) - (a.id === sel));
      kand.forEach((o) => { const [x, y] = o.xy, mitKm = !kurz || o.id === sel, t = o.name + (mitKm ? "  " + kmText(o.d).replace("≈ ", "") : ""), fs = (o.id === sel ? 12.5 : 11.5) * u, w = t.length * fs * 0.56, h = fs * 1.2;
        for (const [dx, anchor] of [[9 * u, "start"], [-9 * u, "end"]]) { const x0 = anchor === "start" ? x + dx : x + dx - w, b = [x0, y - h * 0.75, x0 + w, y + h * 0.35];
          if (b[0] < v0[0] || b[2] > v0[2] || b[1] < v0[1] || b[3] > v0[3]) continue;
          const eigen = (q) => Math.abs((q[0] + q[2]) / 2 - x) < 0.01 && Math.abs((q[1] + q[3]) / 2 - y) < 0.01;
          if (belegt.some((q) => !eigen(q) && b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1])) continue; belegt.push(b);
          const tx = el("text", { x: x + dx, y: y + fs * 0.35, "text-anchor": anchor, "font-family": "Inter, system-ui, sans-serif", "font-weight": o.id === sel ? 700 : 600, "font-size": fs, fill: o.id === sel ? "var(--paper)" : "#cfc8bb", "paint-order": "stroke", stroke: "var(--meer)", "stroke-width": 3.2 * u, "stroke-linejoin": "round" });
          tx.append(document.createTextNode(o.name + (mitKm ? " " : ""))); if (mitKm) tx.append(el("tspan", { "font-family": "IBM Plex Mono, monospace", "font-weight": 500, fill: "var(--gold)" }, kmText(o.d).replace("≈ ", "")));
          dyn.append(tx); break; } });
      /* Startort */
      dyn.append(el("circle", { cx: ix, cy: iy, r: 11 * u, fill: "var(--gold)", "fill-opacity": 0.16 }));
      dyn.append(el("circle", { cx: ix, cy: iy, r: 5.5 * u, fill: "var(--bg)", stroke: "var(--gold)", "stroke-width": 2.4 * u }));
      dyn.append(el("circle", { cx: ix, cy: iy, r: 1.8 * u, fill: "var(--gold)" }));
      dyn.append(el("text", { x: ix, y: iy - 15 * u, "text-anchor": "middle", "font-family": "IBM Plex Mono, monospace", "font-weight": 600, "font-size": 11.5 * u, "letter-spacing": 0.6 * u, fill: "var(--gold)", "paint-order": "stroke", stroke: "var(--meer)", "stroke-width": 3.2 * u }, START.n.toUpperCase()));
    }

    /* Liste */
    function zeileHTML(z) { const hs = S[z.haupt];
      const rest = z.serien.slice(1).map((sk) => S[sk].short).join(" · ");
      return `<li><time datetime="${z.d0}">${datum(z.d0, z.d1)}</time><a href="../${hs.seite}/"><span class="sk" style="color:${hs.color}">${esc(hs.short)}${rest ? ` <small>· ${esc(rest)}</small>` : ""}</span><span class="en">${esc(z.name)}</span></a></li>`; }
    function listeZeichnen() {
      const bands = [[300, "Bis 300 km"], [600, "300 bis 600 km"], [1000, "600 bis 1.000 km"], [1e9, "Über 1.000 km"]];
      let h = "", b = -1;
      if (!LISTE.length) h = `<p class="leer">Im gewählten Zeitraum gibt es für diese Serien keine Termine in Europa.</p>`;
      LISTE.forEach((o) => { const nb = bands.findIndex((x) => o.d <= x[0]);
        if (nb !== b) { b = nb; const n = LISTE.filter((q) => bands.findIndex((x) => q.d <= x[0]) === nb).length; h += `<div class="band"><span><b>${bands[nb][1]}</b> Luftlinie</span><span>${n} ${n === 1 ? "Strecke" : "Strecken"}</span></div>`; }
        const offen = OFFEN_MEHR.has(o.id), zs = offen ? o.zeilen : o.zeilen.slice(0, 3);
        const g1 = farbe(o.gruppen[0]), g2 = o.gruppen[1] ? farbe(o.gruppen[1]) : "transparent";
        const typ = o.typ === "rallye" ? "Rallye-Zentrum" : o.typ === "stadt" ? "Stadtkurs" : "Rennstrecke";
        h += `<article class="ort${o.id === AUSGEWAEHLT ? " aktiv" : ""}" id="o-${o.id}" data-id="${o.id}">
      <button class="ort-kopf" type="button" data-id="${o.id}" style="--pc:${g1};--pr:${g2}"><span class="p"></span><b>${esc(o.name)}</b><span class="km">${kmText(o.d)}<small>Luftlinie</small></span></button>
      <p class="ort-meta">${esc(o.land)} · ${typ} · ${o.zeilen.length} ${o.zeilen.length === 1 ? "Termin" : "Termine"}</p>
      <ul class="ev">${zs.map(zeileHTML).join("")}</ul>
      ${o.zeilen.length > 3 ? `<button class="mehr" type="button" data-mehr="${o.id}">${offen ? "Weniger zeigen" : "Alle " + o.zeilen.length + " Termine zeigen"}</button><br>` : ""}
      <a class="route" href="${route(o)}" target="_blank" rel="noopener noreferrer">Route planen ↗</a>
    </article>`; });
      const liste = byId("liste"); liste.innerHTML = h; ordnerLinks(liste);
      const zr = ZEIT === "3" ? "nächste 3 Monate" : ZEIT === "12" ? "nächste 12 Monate" : "bis Ende " + N.jahr;
      byId("lsub").textContent = `Luftlinie ab ${START.n}${START.beispiel ? " (Beispiel)" : ""} · ${LISTE.length} ${LISTE.length === 1 ? "Strecke" : "Strecken"} · ${zr}`;
      /* außerhalb Europas */
      const bis = bisDatum();
      const aus = N.ausserhalb.filter(([sk, d0, d1]) => d1 >= heute && d0 <= bis && AKTIV.has(sk));
      byId("aussen").innerHTML = aus.length ? `Dazu kommen <b>${aus.length} Termine außerhalb Europas</b> – alle in der <a href="../">Zeitleiste</a>.` : "";
      ordnerLinks(byId("aussen"));
      const offen = N.offen.filter((sk) => S[sk] && AKTIV.has(sk)).map((sk) => S[sk].name);
      byId("offen").innerHTML = ZEIT !== "3" && offen.length ? `Kalender ${N.jahr} noch nicht veröffentlicht: <b>${esc(offen.join(", "))}</b> – diese Termine kommen dazu, sobald sie feststehen.` : "";
    }

    /* Info-Karte in der Karte */
    function infoZeigen() { const i = byId("info"), o = LISTE.find((q) => q.id === AUSGEWAEHLT);
      if (!o) { i.hidden = true; return; } const z = o.zeilen[0], hs = S[z.haupt];
      i.innerHTML = `<button class="zu" type="button" aria-label="Schließen">×</button><h3>${esc(o.name)}</h3><p class="m"><b>${kmText(o.d)}</b> Luftlinie · ${esc(o.land)}</p>
    <p class="n"><b style="color:${hs.color}">${esc(hs.short)}</b> ${esc(z.name)} · ${datum(z.d0, z.d1)}</p><div class="akt"><button class="alle" type="button">${o.zeilen.length > 1 ? "Alle " + o.zeilen.length + " Termine" : "In der Liste"}</button><a href="${route(o)}" target="_blank" rel="noopener noreferrer">Route planen ↗</a></div>`;
      i.hidden = false; }
    function auswaehlen(id, { scroll = false, zentrieren = false } = {}) { AUSGEWAEHLT = id;
      $$(".ort.aktiv").forEach((e) => e.classList.remove("aktiv"));
      const a = id && byId("o-" + id); if (a) a.classList.add("aktiv");
      if (id && zentrieren && maxW() / VB.w > 1.05) { const o = ORT_BY[id]; VB.cx = o.xy[0]; VB.cy = o.xy[1]; vbSetzen(); } else kartenpunkte();
      infoZeigen(); if (scroll && a) a.scrollIntoView({ behavior: "smooth", block: "center" }); }

    /* Alles neu */
    function aktualisieren() { LISTE = ortListe(); if (AUSGEWAEHLT && !LISTE.some((o) => o.id === AUSGEWAEHLT)) AUSGEWAEHLT = null; listeZeichnen(); kartenpunkte(); infoZeigen();
      byId("ort").value = START.beispiel ? "" : START.n; byId("orthinweis").innerHTML = START.beispiel ? "Beispielort: <b>Frankfurt</b>" : ""; }

    /* Startort setzen */
    function ortSetzen(o, speichernOk = true) { START = o; if (speichernOk) { try { localStorage.setItem("apex_ort", JSON.stringify({ n: o.n, lat: o.lat, lon: o.lon })); } catch (e) {} } aktualisieren(); }
    function naechsterOrt(lat, lon) { let best = null; N.orte.forEach(([n, la, lo]) => { const d = km([lat, lon], [la, lo]); if (!best || d < best.d) best = { n, d }; }); return best; }

    /* Suche */
    const inp = byId("ort"), vl = byId("vorschlaege"); let TREFFER = [], AKT = -1;
    function vorschlaege() { const q = norm(inp.value.trim()); if (!q) { vl.hidden = true; inp.setAttribute("aria-expanded", "false"); return; }
      const a = N.orte.filter((o) => norm(o[0]).startsWith(q)), b = N.orte.filter((o) => !norm(o[0]).startsWith(q) && norm(o[0]).includes(q));
      TREFFER = a.concat(b).slice(0, 8); AKT = TREFFER.length ? 0 : -1;
      vl.innerHTML = TREFFER.length ? TREFFER.map((o, i) => `<li role="option" id="v${i}" data-i="${i}" aria-selected="${i === AKT}">${esc(o[0])}<small>${esc(o[3])}</small></li>`).join("") : `<li role="option" aria-disabled="true">Kein Ort gefunden – „Auf der Karte wählen“ nutzen<small></small></li>`;
      vl.hidden = false; inp.setAttribute("aria-expanded", "true"); }
    function waehlen(i) { const o = TREFFER[i]; if (!o) return; vl.hidden = true; inp.setAttribute("aria-expanded", "false"); ortSetzen({ n: o[0], lat: o[1], lon: o[2] }); startAusschnitt(); inp.blur(); }
    inp.addEventListener("input", vorschlaege);
    /* Klick ins Feld: der bisherige Ort verschwindet sofort (steht als Platzhalter da); ohne neue Eingabe kommt er beim Verlassen zurück */
    const PLATZHALTER = inp.placeholder;
    inp.addEventListener("focus", () => { if (!START.beispiel && inp.value === START.n) { inp.value = ""; inp.placeholder = START.n + " – neuen Ort eingeben"; } else if (inp.value) vorschlaege(); });
    inp.addEventListener("blur", () => { setTimeout(() => { if (document.activeElement === inp) return; if (!inp.value.trim() && !START.beispiel) inp.value = START.n; inp.placeholder = PLATZHALTER; vl.hidden = true; }, 150); });
    inp.addEventListener("keydown", (e) => { if (vl.hidden) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!TREFFER.length) return; AKT = (AKT + (e.key === "ArrowDown" ? 1 : -1) + TREFFER.length) % TREFFER.length; $$("li", vl).forEach((li, i) => li.setAttribute("aria-selected", i === AKT)); }
      else if (e.key === "Enter") { e.preventDefault(); waehlen(AKT); } else if (e.key === "Escape") { vl.hidden = true; } });
    vl.addEventListener("mousedown", (e) => { const li = e.target.closest("li[data-i]"); if (li) { e.preventDefault(); waehlen(+li.dataset.i); } });
    document.addEventListener("click", (e) => { if (!e.target.closest(".suche")) vl.hidden = true; });
    byId("ortweg").addEventListener("click", () => { inp.value = ""; inp.focus(); vl.hidden = true; });

    /* Zeitraum */
    byId("zeitraum").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; ZEIT = b.dataset.z;
      $$("button", byId("zeitraum")).forEach((x) => x.setAttribute("aria-checked", x === b)); aktualisieren(); });

    /* Liste: Klicks */
    byId("liste").addEventListener("click", (e) => { const m = e.target.closest("[data-mehr]"); if (m) { const id = m.dataset.mehr; OFFEN_MEHR.has(id) ? OFFEN_MEHR.delete(id) : OFFEN_MEHR.add(id); listeZeichnen(); return; }
      const k = e.target.closest(".ort-kopf"); if (k) { auswaehlen(k.dataset.id, { zentrieren: true }); if (window.matchMedia("(max-width:979px)").matches) box.scrollIntoView({ behavior: "smooth", block: "center" }); } });
    byId("info").addEventListener("click", (e) => { if (e.target.closest(".zu")) { auswaehlen(null); return; } if (e.target.closest(".alle")) auswaehlen(AUSGEWAEHLT, { scroll: true }); });

    /* Karte: Tippen, Ziehen, Zwei-Finger-Zoom */
    const zeiger = new Map(); let start = null, pinch = null;
    svg.addEventListener("pointerdown", (e) => { svg.setPointerCapture(e.pointerId); zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (zeiger.size === 1) start = { x: e.clientX, y: e.clientY, cx: VB.cx, cy: VB.cy, t: Date.now(), bewegt: false };
      if (zeiger.size === 2) { const [a, b] = [...zeiger.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), w: VB.w }; if (start) start.bewegt = true; } });
    svg.addEventListener("pointermove", (e) => { if (!zeiger.has(e.pointerId)) return; zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && zeiger.size === 2) { const [a, b] = [...zeiger.values()], d = Math.hypot(a.x - b.x, a.y - b.y), m = svgPunkt((a.x + b.x) / 2, (a.y + b.y) / 2); const f = VB.w / (pinch.w * pinch.d / d); zoomUm(f, m.x, m.y); return; }
      if (!start) return; const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!start.bewegt && Math.hypot(dx, dy) > 6 && maxW() / VB.w > 1.05) { start.bewegt = true; box.classList.add("zieht"); }
      if (start.bewegt && !pinch) { const k = 1 / ppu(); VB.cx = start.cx - dx * k; VB.cy = start.cy - dy * k; vbSetzen(); } });
    function ende(e) { zeiger.delete(e.pointerId); if (zeiger.size < 2) pinch = null;
      if (zeiger.size === 0 && start) { box.classList.remove("zieht");
        if (!start.bewegt && Math.hypot(e.clientX - start.x, e.clientY - start.y) <= 6) { tippen(e.clientX, e.clientY); } start = null; } }
    svg.addEventListener("pointerup", ende); svg.addEventListener("pointercancel", (e) => { zeiger.delete(e.pointerId); pinch = null; start = null; box.classList.remove("zieht"); });
    let WAHL = false;
    function wahlmodus(an) { WAHL = an; box.classList.toggle("waehlen", an); byId("wahl").hidden = !an; byId("ortwahl").setAttribute("aria-pressed", an);
      if (an) { auswaehlen(null); const r = box.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) box.scrollIntoView({ behavior: "smooth", block: "center" }); } }
    byId("ortwahl").addEventListener("click", () => wahlmodus(!WAHL));
    byId("wahlweg").addEventListener("click", () => wahlmodus(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && WAHL) wahlmodus(false); });
    function tippen(cx, cy) { const pt = svgPunkt(cx, cy), u = 1 / ppu();
      if (WAHL) { const [lat, lon] = unproj(pt.x, pt.y), no = naechsterOrt(lat, lon); wahlmodus(false); AUSGEWAEHLT = null;
        ortSetzen({ n: no && no.d < 40 ? "bei " + no.n : "Gewählter Punkt", lat: +lat.toFixed(4), lon: +lon.toFixed(4) }); return; }
      let best = null; LISTE.forEach((o) => { const d = Math.hypot(o.xy[0] - pt.x, o.xy[1] - pt.y); if (d < 16 * u && (!best || d < best.d)) best = { id: o.id, d }; });
      if (best) { auswaehlen(best.id === AUSGEWAEHLT ? null : best.id); return; }
      if (AUSGEWAEHLT) auswaehlen(null); }
    svg.addEventListener("dblclick", (e) => { const pt = svgPunkt(e.clientX, e.clientY); zoomUm(1.8, pt.x, pt.y); });
    svg.addEventListener("wheel", (e) => { if (!e.ctrlKey) return; e.preventDefault(); const pt = svgPunkt(e.clientX, e.clientY); zoomUm(Math.exp(-e.deltaY * 0.01), pt.x, pt.y); }, { passive: false });
    byId("zplus").addEventListener("click", () => { const [x, y] = AUSGEWAEHLT ? ORT_BY[AUSGEWAEHLT].xy : proj(START.lat, START.lon); zoomUm(1.6, x, y); });
    byId("zminus").addEventListener("click", () => zoomUm(1 / 1.6));
    byId("zganz").addEventListener("click", () => { VB = { cx: W / 2, cy: H / 2, w: maxW() }; vbSetzen(); });
    if ("ResizeObserver" in window) new ResizeObserver(() => vbSetzen()).observe(box);
    else addEventListener("resize", () => vbSetzen());

    /* Start */
    FL.zeichnen(); aktualisieren(); startAusschnitt();
  }

  /* Übersichten (Serien, Strecken): nächstes Event je Serie bzw. Strecke nach dem heutigen Datum */
  const ueb = $("#apex-uebersicht");
  if (ueb) {
    const U = JSON.parse(ueb.textContent);
    $$(".scard[data-serie],.scard[data-strecke]").forEach((c) => {
      const d = U[c.dataset.serie || c.dataset.strecke], el = $(".snext", c); if (!d || !el) return;
      const x = d.kand.find((k) => k[0] >= heute);
      el.innerHTML = x ? x[1] : d.ende;
    });
  }
})();
