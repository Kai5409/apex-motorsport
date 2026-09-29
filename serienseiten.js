/* APEX – Serienseiten und Serienübersicht: Interaktionen.
   Die Seiten sind fertiges HTML; dieses Skript ergänzt nur Bedienung und rückt „Nächstes Rennen“
   nach dem heutigen Datum vor. Es lädt nichts nach und speichert nur die Einstellung
   „Ergebnisse verbergen“ (gleicher Schlüssel wie in der App). */
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
    oeffnen(li, true);
    li.scrollIntoView({ block: "center", behavior: sanft ? "smooth" : "auto" });
    li.classList.remove("hl"); void li.offsetWidth; li.classList.add("hl");
  }
  if (/^#r-/.test(location.hash)) zuZeile(location.hash.slice(3), false);

  /* Wo schauen? – Land umschalten */
  $$(".seg button").forEach((b) => b.addEventListener("click", () => {
    $$(".seg button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $$(".tvland").forEach((x) => x.classList.toggle("on", x.dataset.land === b.dataset.l));
  }));

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

  /* Wertung und lange Zeitpläne: erst gekürzt, auf Wunsch alles */
  $$(".more").forEach((b) => {
    const liste = b.previousElementSibling; if (!liste) return;
    liste.classList.add("kurz"); b.hidden = false; b.setAttribute("aria-expanded", "false");
    b.addEventListener("click", () => { const kurz = liste.classList.toggle("kurz"); b.textContent = kurz ? b.dataset.alle : b.dataset.weniger; b.setAttribute("aria-expanded", String(!kurz)); festPruefen(); });
  });

  /* Saisonlinie (Saison des nächsten Events) */
  const datenEl = $("#apex-seite");
  const D = datenEl ? JSON.parse(datenEl.textContent) : null;
  const linie = D && D.linien ? (D.linien.find((l) => l.ev.some((x) => x[0] === NEXT)) || D.linien.find((l) => l.key === D.linie)) : null;
  function zeichnen() {
    const svg = $("#linesvg"); if (!svg || !linie) return;
    const W = svg.clientWidth || 600, H = 118, padX = 10, top = 22, bot = 92, E = linie.ev, n = E.length;
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
      else if (x[2] === "d") c = `<circle class="core" cx="${cx}" cy="${cy}" r="4.5" fill="var(--serie)"/>`;
      else c = `<circle class="core" cx="${cx}" cy="${cy}" r="4.5" fill="var(--bg)" stroke="var(--paper)" stroke-width="1.5"/>`;
      h += `<g class="dot" tabindex="0" role="button" data-i="${i}" aria-label="${esc(x[1])}"><circle cx="${cx}" cy="${cy}" r="14" fill="transparent"/>${c}</g>`;
    });
    if (ni >= 0) h += `<text class="lbl gold" x="${xs[ni]}" y="${top - 12}" text-anchor="middle">${esc(E[ni][3])}</text>`;
    h += `<text class="lbl" x="${xs[0]}" y="${H - 4}" text-anchor="start">${esc(E[0][4])}</text>`;
    h += `<text class="lbl" x="${xs[n - 1]}" y="${H - 4}" text-anchor="end">${esc(E[n - 1][4])}</text>`;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("aria-label", linie.aria); svg.innerHTML = h;
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
    /* Serienfilter wie in der App, aber nur mit den Serien des gezeigten Wochenendes: bis 4 Serien einzelne
       Knöpfe, ab 5 Gruppenknöpfe mit Pfeil zum Aufklappen. Gleicher Speicher wie die App („apex_filter“,
       {kürzel: an/aus}); ohne gespeicherte Auswahl die Standardwerte der App (Rahmenserien aus). */
    const FILTER = "apex_filter";
    const DAT = (() => { try { return JSON.parse($("#apex-woche").textContent); } catch (e) { return {}; } })();
    const SER = DAT.serien || {}, GRP = DAT.gruppen || {}, ALLE = Object.keys(SER), AKTIV = new Set();
    const leiste = $("#wfilter");
    let offen = null, filterWoche;
    function filterLaden() {
      let alt = null; try { alt = JSON.parse(localStorage.getItem(FILTER) || "null"); } catch (e) { alt = null; }
      if (!alt || typeof alt !== "object" || Array.isArray(alt)) alt = {};
      AKTIV.clear();
      ALLE.forEach((sk) => { if (typeof alt[sk] === "boolean" ? alt[sk] : !SER[sk].aus) AKTIV.add(sk); });
      if (!AKTIV.size) ALLE.forEach((sk) => { if (!SER[sk].aus) AKTIV.add(sk); });
      if (!AKTIV.size) ALLE.forEach((sk) => AKTIV.add(sk));
    }
    function filterSpeichern() { try { const o = {}; ALLE.forEach((sk) => { o[sk] = AKTIV.has(sk); }); localStorage.setItem(FILTER, JSON.stringify(o)); } catch (e) {} }
    const wochenSerien = () => (gezeigt && gezeigt.el ? gezeigt.el.dataset.serien.split(" ").filter((sk) => SER[sk]) : []);
    const escH = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    function gruppenDerWoche(sks) {
      const gl = Object.keys(GRP).map((g) => ({ g, name: GRP[g].name, short: GRP[g].short, farbe: GRP[g].farbe, sks: sks.filter((sk) => SER[sk].gruppe === g) }));
      const rest = sks.filter((sk) => !GRP[SER[sk].gruppe]);
      if (rest.length) gl.push({ g: "weitere", name: "Weitere", short: "Weitere", farbe: "", sks: rest });
      return gl.filter((x) => x.sks.length);
    }
    const knopf = (sk) => { const S = SER[sk], an = AKTIV.has(sk);
      return `<button class="wf-chip${an ? "" : " aus"}" type="button" data-serie="${sk}" aria-pressed="${an}" title="${escH(S.name)}"><i style="background:${S.color}"></i><span class="wf-l">${escH(S.name)}</span><span class="wf-s">${escH(S.short)}</span></button>`; };
    /* Knöpfe werden neu gezeichnet – der Tastaturfokus wandert auf den neuen Knopf an gleicher Stelle */
    const fokusWahl = (el) => el.dataset.serie ? `.wf-chip[data-serie="${el.dataset.serie}"]`
      : el.closest(".wf-grp") ? `.wf-grp[data-g="${el.closest(".wf-grp").dataset.g}"] .${el.classList.contains("wf-pfeil") ? "wf-pfeil" : "wf-an"}` : null;
    function filterZeichnen() {
      if (!leiste) return;
      const sks = wochenSerien(), f = document.activeElement;
      const fokus = f && f !== document.body && leiste.contains(f) ? fokusWahl(f) : null;
      leiste.hidden = !sks.length;
      let h = "";
      if (sks.length && sks.length <= 4) { offen = null; h = `<div class="wf-leiste">${sks.map(knopf).join("")}</div>`; }
      else if (sks.length) {
        const gl = gruppenDerWoche(sks);
        if (offen && !gl.some((x) => x.g === offen)) offen = null;
        h = `<div class="wf-leiste wf-gruppen">` + gl.map((x) => {
          const an = x.sks.filter((sk) => AKTIV.has(sk)).length, n = x.sks.length, st = !an ? "aus" : an < n ? "teil" : "an", auf = offen === x.g;
          return `<div class="wf-grp ${st}${auf ? " offen" : ""}" data-g="${x.g}"${x.farbe ? ` style="--gf:${x.farbe}"` : ""}>` +
            `<button class="wf-an" type="button" aria-pressed="${st === "an" ? "true" : st === "teil" ? "mixed" : "false"}" title="${escH(x.name)}"><span class="wf-l">${escH(x.name)}</span><span class="wf-s">${escH(x.short)}</span></button>` +
            (st === "teil" ? `<span class="wf-z">${an}/${n}</span>` : "") +
            `<button class="wf-pfeil" type="button" aria-expanded="${auf}"${auf ? ' aria-controls="wf-panel"' : ""} aria-label="Serien der Gruppe ${escH(x.name)} einzeln auswählen"><span aria-hidden="true">▾</span></button></div>`;
        }).join("") + "</div>";
        const g = gl.find((x) => x.g === offen);
        if (g) h += `<div class="wf-panel" id="wf-panel" role="group" aria-label="${escH(g.name)}">${g.sks.map(knopf).join("")}</div>`;
      } else offen = null;
      leiste.innerHTML = h;
      const neu = fokus && $(fokus, leiste); if (neu) neu.focus({ preventScroll: true });
    }
    /* wie toggleSeries()/toggleGruppe() der App: mindestens eine Serie bleibt ausgewählt */
    function serieUmschalten(sk) { if (AKTIV.has(sk)) { if (AKTIV.size > 1) AKTIV.delete(sk); } else AKTIV.add(sk); geaendert(); }
    function gruppeUmschalten(g) {
      const x = gruppenDerWoche(wochenSerien()).find((y) => y.g === g); if (!x) return;
      if (x.sks.some((sk) => AKTIV.has(sk))) { if (x.sks.filter((sk) => AKTIV.has(sk)).length >= AKTIV.size) return; x.sks.forEach((sk) => AKTIV.delete(sk)); }
      else x.sks.forEach((sk) => AKTIV.add(sk));
      geaendert();
    }
    function geaendert() { filterSpeichern(); filterZeichnen(); filtern(); }
    if (leiste) leiste.addEventListener("click", (ev) => {
      const chip = ev.target.closest(".wf-chip"), an = ev.target.closest(".wf-an"), pf = ev.target.closest(".wf-pfeil");
      if (chip) serieUmschalten(chip.dataset.serie);
      else if (an) gruppeUmschalten(an.closest(".wf-grp").dataset.g);
      else if (pf) { const g = pf.closest(".wf-grp").dataset.g; offen = offen === g ? null : g; filterZeichnen(); }
    });
    /* Aufgeklappte Feinauswahl schließen: Tippen außerhalb des Filters oder Esc (wie in der App) */
    document.addEventListener("click", (ev) => { if (offen && leiste && !leiste.contains(ev.target)) { offen = null; filterZeichnen(); } }, true);
    document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && offen) { offen = null; filterZeichnen(); } });
    /* Auswahl aus der App übernehmen: anderer Tab (storage) oder Rückkehr aus dem Browser-Zwischenspeicher */
    const abgleichen = () => { filterLaden(); filterZeichnen(); filtern(); };
    addEventListener("storage", (ev) => { if (ev.key === FILTER || ev.key === null) abgleichen(); });
    addEventListener("pageshow", (ev) => { if (ev.persisted) abgleichen(); });

    /* Serienauswahl und „Trainings ausblenden“ wirken nur auf den Zeitplan (Trainings per CSS, Klasse am <html>).
       „Auf dem Programm“ und „Wo läuft was?“ zeigen immer alle Serien des Wochenendes; ausgeblendete gedämpft. */
    const sichtbar = (x) => AKTIV.has(x.dataset.serie);
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
    filterLaden();
    const alles = () => { waehlen(); if (gezeigt !== filterWoche) { filterWoche = gezeigt; offen = null; filterZeichnen(); } zustand(); filtern(); };
    alles();
    setInterval(alles, 60000);
  }

  /* Übersicht: nächstes Event je Serie nach dem heutigen Datum */
  const ueb = $("#apex-uebersicht");
  if (ueb) {
    const U = JSON.parse(ueb.textContent);
    $$(".scard[data-serie]").forEach((c) => {
      const d = U[c.dataset.serie], el = $(".snext", c); if (!d || !el) return;
      const x = d.kand.find((k) => k[0] >= heute);
      el.innerHTML = x ? x[1] : d.ende;
    });
  }
})();
