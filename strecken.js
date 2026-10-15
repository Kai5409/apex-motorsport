/* APEX – Streckenseiten: Schalter „Deutsche Zeit | Ortszeit“, Entfernung zum Startort und Kartenausschnitt „In der Nähe“.
   Ergänzt serienseiten.js nur auf den Streckenseiten. Lädt nichts nach (außer der Kartengrundlage zum gewählten Design); der Startort wird nur gelesen
   (gewählt und lokal gespeichert auf der Seite „In der Nähe“, Schlüssel wie dort), die Zeitwahl nicht gespeichert. */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);

  /* Deutsche Zeit oder Ortszeit: beide Angaben stehen in der Seite (.zd, .zo), der Schalter tauscht nur die Anzeige.
     Beim Öffnen immer deutsche Zeit. */
  const zeitKnoepfe = Array.from(document.querySelectorAll(".zeitseg button"));
  zeitKnoepfe.forEach((b) => b.addEventListener("click", () => {
    document.documentElement.classList.toggle("ortszeit", b.dataset.zeit === "ort");
    zeitKnoepfe.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  }));

  const datenEl = $("#apex-strecke"); if (!datenEl) return;
  const X = JSON.parse(datenEl.textContent);
  const RAD = Math.PI / 180;
  function km(a, b) { const p1 = a[0] * RAD, p2 = b[0] * RAD, dp = p2 - p1, dl = (b[1] - a[1]) * RAD, h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2; return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h))); }
  function kmText(d) { const r = d < 50 ? Math.round(d) : Math.round(d / 5) * 5; return "≈ " + r.toLocaleString("de-DE") + " km"; }
  /* Vorschau ohne Ordneradressen (…/index.html): Verweise auf Ordner mit index.html ergänzen (wie serienseiten.js) */
  const ordner = (h) => (/\/index\.html$/.test(location.pathname) && /\/$/.test(h) ? h + "index.html" : h);

  /* Entfernung nur, wenn auf „In der Nähe“ ein Startort gewählt wurde – kein Beispielort */
  let ich = null;
  try { const o = JSON.parse(localStorage.getItem("apex_ort") || "null"); if (o && typeof o.n === "string" && o.n && isFinite(o.lat) && isFinite(o.lon)) ich = o; } catch (e) {}
  if (ich && $("#entf")) {
    $("#entf-km").textContent = kmText(km([+ich.lat, +ich.lon], [X.lat, X.lon]));
    $("#entf-ab").textContent = "ab " + ich.n;
    $("#entf-route").href = "https://www.google.com/maps/dir/?api=1&origin=" + ich.lat + "," + ich.lon + "&destination=" + X.lat + "," + X.lon;
    $("#entf").hidden = false;
  }

  /* Kartenausschnitt: Strecke in der Mitte, Punkte der Strecken in der Nähe (Farbe: Serie des nächsten Termins dort),
     Namen der fünf nächsten ohne Überlappung (rechts, links, oben, unten – sonst kein Name) */
  const NS = "http://www.w3.org/2000/svg", svg = $("#minisvg"), dyn = $("#minidyn"), info = $("#miniinfo");
  if (!svg || !dyn || !info) return;
  let AUSWAHL = -1;
  function el(t, a, txt) { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; return e; }
  function zeichnen() {
    const w = svg.getBoundingClientRect().width; if (!w) return;
    const B = X.box, u = B[2] / w; dyn.textContent = "";
    const fs = 11.5 * u, sw = 3 * u;
    const text = (x, y, t, anchor, extra) => el("text", Object.assign({ x, y, "text-anchor": anchor, "font-family": "Inter, system-ui, sans-serif", "font-weight": 600, "font-size": fs, fill: "var(--paper2)", "paint-order": "stroke", stroke: "var(--meer)", "stroke-width": sw, "stroke-linejoin": "round" }, extra || {}), t);
    const [nx, ny] = X.np, titel = X.name.toUpperCase(), tw = titel.length * 12 * u * 0.62;
    const belegt = [[nx - tw / 2, ny - 27 * u, nx + tw / 2, ny - 13 * u], [nx - 11 * u, ny - 11 * u, nx + 11 * u, ny + 11 * u]];
    X.pkt.forEach((p, i) => {
      belegt.push([p.x - 4 * u, p.y - 4 * u, p.x + 4 * u, p.y + 4 * u]);
      const g = el("g", { class: "mpt", "data-i": i, tabindex: 0, role: "button", "aria-label": p.n + ", " + p.km + " Luftlinie" });
      g.append(el("circle", { cx: p.x, cy: p.y, r: 14 * u, fill: "transparent" }));
      if (i === AUSWAHL) g.append(el("circle", { cx: p.x, cy: p.y, r: 8.5 * u, fill: "none", stroke: "var(--paper)", "stroke-width": 1.5 * u }));
      g.append(el("circle", { cx: p.x, cy: p.y, r: (p.l || i === AUSWAHL ? 4.2 : 3.2) * u, fill: p.c, stroke: "var(--meer)", "stroke-width": 1.4 * u }));
      dyn.append(g);
    });
    X.pkt.forEach((p, i) => {
      if (!p.l && i !== AUSWAHL) return;
      const t = p.n, w2 = t.length * fs * 0.58, h = fs * 1.15;
      for (const [dx, dy, a] of [[8, 0, "start"], [-8, 0, "end"], [0, -11, "middle"], [0, 14, "middle"]]) {
        const x = p.x + dx * u, y = p.y + dy * u + fs * 0.35, x0 = a === "start" ? x : a === "end" ? x - w2 : x - w2 / 2, b = [x0, y - h * 0.8, x0 + w2, y + h * 0.2];
        if (b[0] < B[0] + 2 * u || b[2] > B[0] + B[2] - 2 * u || b[1] < B[1] + 2 * u || b[3] > B[1] + B[3] - 2 * u) continue;
        const eigen = (q) => Math.abs((q[0] + q[2]) / 2 - p.x) < 0.01 && Math.abs((q[1] + q[3]) / 2 - p.y) < 0.01;
        if (belegt.some((q) => !eigen(q) && b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1])) continue;
        belegt.push(b); dyn.append(text(x, y, t, a, { "data-i": i, style: "cursor:pointer" })); break;
      }
    });
    /* die Strecke selbst */
    dyn.append(el("circle", { cx: nx, cy: ny, r: 11 * u, fill: "var(--gold-fl)", "fill-opacity": 0.2 }));
    dyn.append(el("circle", { cx: nx, cy: ny, r: 5.6 * u, fill: "var(--gold-fl)", stroke: "var(--paper)", "stroke-width": 1.6 * u }));
    dyn.append(text(nx, ny - 15 * u, titel, "middle", { "font-family": "IBM Plex Mono, monospace", "letter-spacing": 0.6 * u, fill: "var(--paper)", "font-size": 12 * u }));
  }
  /* Punkt oder Name antippen: Infokarte mit nächstem Termin und Link zur Streckenseite (wie auf „In der Nähe“) */
  const escH = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function zeigen(i) {
    AUSWAHL = i; zeichnen();
    if (i < 0) { info.hidden = true; return; }
    const p = X.pkt[i];
    info.style.setProperty("--pc", p.c);
    info.innerHTML = `<button class="zu" type="button" aria-label="Schließen">×</button><h3>${escH(p.n)}</h3><p class="m"><b>${escH(p.km)}</b> Luftlinie · ${escH(p.land)} · ${p.anz} ${p.anz === 1 ? "Termin" : "Termine"}</p><p class="n"><b style="color:${p.c}">${escH(p.ns)}</b>${escH(p.nn)}<small>${escH(p.nd)}</small></p><a href="${ordner("../" + p.slug + "/")}">Zur Streckenseite <span aria-hidden="true">→</span></a>`;
    info.hidden = false;
  }
  svg.addEventListener("click", (ev) => { const t = ev.target.closest("[data-i]"); zeigen(t ? +t.dataset.i : -1); });
  svg.addEventListener("keydown", (ev) => { const t = ev.target.closest(".mpt"); if (t && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); zeigen(+t.dataset.i); } });
  info.addEventListener("click", (ev) => { if (ev.target.closest(".zu")) zeigen(-1); });
  /* Schließen: ×, Escape oder Tippen daneben */
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && AUSWAHL >= 0) zeigen(-1); });
  document.addEventListener("click", (ev) => { if (AUSWAHL >= 0 && !ev.composedPath().some((n) => n === svg || n === info)) zeigen(-1); });
  /* Kartengrundlage zum Design: karte/<region>.svg bzw. karte/<region>-hell.svg (Umschalten ohne Neuladen, Ereignis aus serienseiten.js) */
  const grund = svg.querySelector("image");
  const grundSetzen = () => { if (!grund) return; const d = grund.getAttribute("href"), hell = document.documentElement.getAttribute("data-design") === "hell";
    const n = hell ? d.replace(/(-hell)?\.svg$/, "-hell.svg") : d.replace(/-hell\.svg$/, ".svg"); if (n !== d) grund.setAttribute("href", n); };
  grundSetzen(); document.addEventListener("apex-design", grundSetzen);
  zeichnen();
  let rz = 0; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(zeichnen, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(zeichnen);
})();
