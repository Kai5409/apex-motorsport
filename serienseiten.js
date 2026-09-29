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
  if (/\/index\.html$/.test(location.pathname)) $$("a[href]").forEach((a) => {
    const m = /^((?:\.\.?\/)+(?:[\w-]+\/)*)([?#].*)?$/.exec(a.getAttribute("href"));
    if (m) a.setAttribute("href", m[1] + "index.html" + (m[2] || ""));
  });

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
    liste.classList.add("kurz"); b.hidden = false;
    b.addEventListener("click", () => { const kurz = liste.classList.toggle("kurz"); b.textContent = kurz ? b.dataset.alle : b.dataset.weniger; festPruefen(); });
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
