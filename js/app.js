/* Min dag – vyer, exempeldata, uppgifter och tema. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var NAME = "Karl";
  var TZ = Sun.TZ, HOME = Sun.HOME;

  /* ---------- lagring (fungerar även om webbläsaren blockerar den) ---------- */
  function load(key, fallback) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ingen lagring */ } }

  /* ---------- format ---------- */
  var hm = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  var longDate = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
  var weekday = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, weekday: "long" });
  function fmt(d) { return d ? hm.format(d) : "–"; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function durStr(ms) { var m = Math.round(ms / 60000); return Math.floor(m / 60) + " h " + (m % 60) + " min"; }
  function today() { var p = Sun.localParts(new Date()); return { y: p.year, m: p.month, d: p.day, min: p.hour * 60 + p.minute }; }

  /* ---------- tema ---------- */
  var DAY = { glass: [248, 251, 249, .72], edge: [255, 255, 255, .7], ink: [15, 28, 23, 1], ink2: [15, 28, 23, .66], line: [15, 28, 23, .11], accent: [46, 122, 85, 1], accentSoft: [46, 122, 85, .14], onAccent: [255, 255, 255, 1], shadow: [20, 40, 30, .20] };
  var NIGHT = { glass: [13, 21, 20, .60], edge: [255, 255, 255, .10], ink: [234, 241, 237, 1], ink2: [234, 241, 237, .64], line: [255, 255, 255, .10], accent: [127, 203, 160, 1], accentSoft: [127, 203, 160, .16], onAccent: [6, 18, 12, 1], shadow: [0, 0, 0, .40] };
  var VARS = { glass: "--glass", edge: "--edge", ink: "--ink", ink2: "--ink-2", line: "--line", accent: "--accent", accentSoft: "--accent-soft", onAccent: "--on-accent", shadow: "--shadow" };
  var TEXT = { ink: 1, ink2: 1, onAccent: 1 };
  function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function applyTheme(dayness) {
    // Ytor glider långsamt; texten byter inom ett smalt fönster så den aldrig blir grå på grått.
    var surf = smooth(0.15, 0.85, dayness), text = smooth(0.46, 0.54, surf), root = document.documentElement.style;
    Object.keys(VARS).forEach(function (k) {
      var t = TEXT[k] ? text : surf, a = NIGHT[k], b = DAY[k], c = [];
      for (var i = 0; i < 4; i++) c[i] = a[i] + (b[i] - a[i]) * t;
      root.setProperty(VARS[k], "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + c[3].toFixed(3) + ")");
    });
    root.setProperty("color-scheme", surf > .5 ? "light" : "dark");
  }
  var themeOpt = load("mindag.theme", "auto");
  if (["auto", "light", "dark"].indexOf(themeOpt) < 0) themeOpt = "auto";
  var HINTS = {
    auto: "Ljust när solen är uppe i Stockholm, mörkt efter skymningen.",
    light: "Alltid ljust. Jorden i bakgrunden följer ändå den riktiga tiden.",
    dark: "Alltid mörkt. Jorden i bakgrunden följer ändå den riktiga tiden."
  };
  function showThemeOpt() {
    document.querySelectorAll("[data-theme-opt]").forEach(function (b) { b.setAttribute("aria-checked", b.dataset.themeOpt === themeOpt ? "true" : "false"); });
    $("theme-hint").textContent = HINTS[themeOpt];
  }
  document.querySelectorAll("[data-theme-opt]").forEach(function (b) {
    b.addEventListener("click", function () { themeOpt = b.dataset.themeOpt; save("mindag.theme", themeOpt); showThemeOpt(); update(); });
  });

  /* ---------- vyer ---------- */
  var VIEWS = ["idag", "kalender", "uppgifter", "inkorg", "mer"];
  function go(name, push) {
    if (VIEWS.indexOf(name) < 0) name = "idag";
    document.querySelectorAll(".view").forEach(function (v) { v.hidden = v.dataset.view !== name; });
    document.querySelectorAll("[data-go]").forEach(function (b) {
      if (b.dataset.go === name) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    if (push) history.replaceState(null, "", name === "idag" ? location.pathname : "#" + name);
    window.scrollTo(0, 0); $("main").scrollTop = 0;
  }
  document.querySelectorAll("[data-go]").forEach(function (b) { b.addEventListener("click", function () { go(b.dataset.go, true); }); });
  window.addEventListener("hashchange", function () { go(location.hash.slice(1)); });

  /* ---------- exempeldata (visas tills Google är anslutet) ---------- */
  function exampleEvents(t) {
    var list = [[0, 600, 60, "Träning", "Friskis & Svettis"], [0, 810, 60, "Arbetsintervju", "Butik, Södermalm"], [0, 1110, 90, "Middag hemma"],
      [1, 540, 30, "Ring Arbetsförmedlingen"], [1, 900, 60, "Fika med Sara", "Mariatorget"], [2, 660, 90, "Promenad", "Djurgården"]];
    return list.map(function (e) {
      var d = dayYmd(t, e[0]), s = Sun.stockholmDate(d.y, d.m, d.d, e[1]);
      return { title: e[3], location: e[4] || "", allDay: false, start: s.toISOString(), end: new Date(s.getTime() + e[2] * 60000).toISOString() };
    });
  }
  function exampleMail() {
    var n = Date.now();
    return { unread: 2, threads: [
      { from: "Banken", subject: "Komplettering behövs", snippet: "Vi behöver komplettera dina uppgifter.", date: new Date(n - 3 * 3600000).toISOString(), unread: true },
      { from: "Butik Södermalm", subject: "Intervju", snippet: "Välkommen på intervju torsdag 13:30!", date: new Date(n - 26 * 3600000).toISOString(), unread: true },
      { from: "Arbetsförmedlingen", subject: "Påminnelse", snippet: "Aktivitetsrapport senast den 14:e.", date: new Date(n - 80 * 3600000).toISOString() }
    ] };
  }

  /* ---------- Google (via ditt eget Google Apps Script) ---------- */
  var G = load("mindag.google", null);          // { url, key }
  var gdata = load("mindag.gdata", null);       // { at, events, mail }
  var gBusy = false;
  // Läser en "Länk till andra enheter" (…#anslut=…). Ger { url, key } eller null.
  function parseLink(text) {
    var m = String(text).match(/#anslut=([^\s#]+)/);
    if (!m) return null;
    try { var c = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1]))))); return c.url && c.key ? { url: c.url, key: c.key } : null; } catch (e) { return null; }
  }
  (function connectFromLink() {
    if (!/^#anslut=/.test(location.hash)) return;
    var c = parseLink(location.hash);
    if (c) { G = c; save("mindag.google", G); }
    history.replaceState(null, "", location.pathname + "#mer");
  })();
  function connected() { return !!(G && gdata && gdata.events); }
  function gStatus(text) { $("g-status").textContent = text; }
  function showGoogle() {
    $("g-off").hidden = !!G; $("g-on").hidden = !G;
    $("g-state").textContent = G ? "Ansluten" : "Inte ansluten";
    if (G && gdata && !gBusy) gStatus("Senast hämtat " + hm.format(new Date(gdata.at)) + ".");
  }
  function fetchGoogle(cfg) {
    cfg = cfg || G;
    if (!cfg || gBusy) return Promise.resolve(false);
    gBusy = true;
    return fetch(cfg.url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ key: cfg.key }) })
      .then(function (r) { if (!r.ok) throw new Error("svar " + r.status); return r.json(); })
      .then(function (d) {
        if (d.error) throw new Error(d.error);
        if (!Array.isArray(d.events) || !d.mail) throw new Error("oväntat svar från skriptet");
        gdata = { at: Date.now(), events: d.events, mail: d.mail };
        save("mindag.gdata", gdata); gBusy = false; renderData(); showGoogle();
        return true;
      })
      .catch(function (e) {
        gBusy = false;
        var msg = /Failed to fetch|NetworkError|Load failed/i.test(e.message) ? "kunde inte nå skriptet (kontrollera adressen och att åtkomst är \"Alla\")" : e.message;
        gStatus("Kunde inte hämta: " + msg + ".");
        return Promise.reject(new Error(msg));
      });
  }
  $("g-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var cfg = parseLink($("g-url").value) || { url: $("g-url").value.trim(), key: $("g-key").value.trim() };
    if (!cfg.key) { $("g-err").textContent = "Fyll i nyckeln – eller klistra in hela länken från din andra enhet i fältet ovanför."; return; }
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(cfg.url)) { $("g-err").textContent = "Adressen ska börja med https://script.google.com/ och sluta med /exec."; return; }
    $("g-err").textContent = "Ansluter…";
    fetchGoogle(cfg).then(function () {
      G = cfg; save("mindag.google", G); $("g-err").textContent = ""; $("g-key").value = ""; $("g-url").value = ""; showGoogle(); renderData();
    }, function (err) { $("g-err").textContent = "Det gick inte: " + err.message + "."; });
  });
  $("g-refresh").addEventListener("click", function () { gStatus("Hämtar…"); fetchGoogle().catch(function () {}); });
  $("g-disconnect").addEventListener("click", function () {
    G = null; gdata = null; save("mindag.google", null); save("mindag.gdata", null); showGoogle(); renderData();
  });
  $("g-copy").addEventListener("click", function () {
    var link = location.origin + location.pathname + "#anslut=" + encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(G)))));
    var done = function () { gStatus("Länken är kopierad. Öppna den på din andra enhet. Den innehåller din nyckel – dela den inte med någon."); };
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(done, function () { window.prompt("Kopiera länken:", link); });
    else window.prompt("Kopiera länken:", link);
  });

  var DEFAULT_TASKS = [
    { id: 1, text: "Uppdatera CV", done: true },
    { id: 2, text: "Skicka två ansökningar", done: false },
    { id: 3, text: "Svara på mejl från banken", done: false },
    { id: 4, text: "Handla till middagen", done: false }
  ];
  var tasks = load("mindag.tasks", DEFAULT_TASKS);
  if (!Array.isArray(tasks)) tasks = DEFAULT_TASKS.slice();

  function dayYmd(t, add) { var d = new Date(Date.UTC(t.y, t.m - 1, t.d + add)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; }
  function ymdStr(o) { return o.y + "-" + String(o.m).padStart(2, "0") + "-" + String(o.d).padStart(2, "0"); }
  function eventsOn(events, t, add) {
    var o = dayYmd(t, add), n = dayYmd(t, add + 1), ds = ymdStr(o);
    var from = Sun.stockholmDate(o.y, o.m, o.d, 0).getTime(), to = Sun.stockholmDate(n.y, n.m, n.d, 0).getTime();
    return events.filter(function (e) {
      if (e.allDay) return e.start <= ds && ds < e.end;
      var s = Date.parse(e.start), en = Date.parse(e.end);
      return s < to && en > from;
    }).sort(function (a, b) { return (a.allDay ? 0 : 1) - (b.allDay ? 0 : 1) || Date.parse(a.start) - Date.parse(b.start); });
  }
  function eventRow(e, now, nextStart) {
    var timed = !e.allDay, past = timed && Date.parse(e.end) < now;
    var isNext = timed && e.start === nextStart;
    return '<li class="' + (past ? "past" : "") + '"><time>' + (timed ? fmt(new Date(e.start)) : "Heldag") + '</time><span class="bar' + (isNext ? "" : " muted") + '"></span><div>' + esc(e.title) + (e.location ? "<small>" + esc(e.location) + "</small>" : "") + "</div></li>";
  }
  function renderEvents(t) {
    var now = Date.now(), events = connected() ? gdata.events : exampleEvents(t);
    var upcoming = events.filter(function (e) { return !e.allDay && Date.parse(e.end) > now; }).sort(function (a, b) { return Date.parse(a.start) - Date.parse(b.start); });
    var nextStart = upcoming.length ? upcoming[0].start : null;
    var todays = eventsOn(events, t, 0);
    $("events-today").innerHTML = todays.length ? todays.map(function (e) { return eventRow(e, now, nextStart); }).join("") : '<li class="empty">Inget inbokat idag</li>';
    $("evcount").textContent = todays.length === 1 ? "1 händelse" : todays.length + " händelser";
    var html = "";
    for (var d = 0; d < 3; d++) {
      var o = dayYmd(t, d), noon = Sun.stockholmDate(o.y, o.m, o.d, 12 * 60);
      var label = d === 0 ? "Idag" : d === 1 ? "Imorgon" : cap(weekday.format(noon));
      var list = eventsOn(events, t, d);
      html += '<section class="glass card"><div class="head"><h2>' + label + "</h2><span>" + esc(longDate.format(noon).replace(/^\S+\s/, "")) + '</span></div><ul class="events tnum">' +
        (list.length ? list.map(function (e) { return eventRow(e, now, nextStart); }).join("") : '<li class="empty">Inget inbokat</li>') + "</ul></section>";
    }
    $("calendar").innerHTML = html;
  }
  var shortDay = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, weekday: "short" });
  var shortDate = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, day: "numeric", month: "short" });
  function mailTime(iso) {
    var d = new Date(iso), t = today(), ds = Sun.localParts(d), dd = { y: ds.year, m: ds.month, d: ds.day };
    if (ymdStr(dd) === ymdStr(t)) return hm.format(d);
    if (ymdStr(dd) === ymdStr(dayYmd(t, -1))) return "Igår";
    if (Date.now() - d.getTime() < 6 * 86400000) return cap(shortDay.format(d).replace(".", ""));
    return shortDate.format(d).replace(".", "");
  }
  function renderMail() {
    var m = connected() ? gdata.mail : exampleMail(), live = connected();
    $("mail").innerHTML = m.threads.length ? m.threads.map(function (x) {
      var inner = "<b>" + esc(x.from) + "</b><time>" + esc(mailTime(x.date)) + "</time><p><span class=\"subj\">" + esc(x.subject) + "</span>" + (x.snippet ? " – " + esc(x.snippet) : "") + "</p>";
      return '<li class="' + (x.unread ? "unread" : "") + '">' + (live && x.id ? '<a href="https://mail.google.com/mail/u/0/#inbox/' + encodeURIComponent(x.id) + '" target="_blank" rel="noopener">' + inner + "</a>" : inner) + "</li>";
    }).join("") : '<li class="empty">Inkorgen är tom</li>';
    $("mailcount").textContent = m.unread === 1 ? "1 oläst" : m.unread + " olästa";
  }
  function renderData() {
    var live = connected();
    document.querySelectorAll("[data-src]").forEach(function (el) { el.hidden = el.dataset.src !== (live ? "google" : "example"); });
    renderEvents(today()); renderMail();
  }
  var CHECK = '<span class="box"><svg viewBox="0 0 24 24" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span>';
  function taskList(list, prefix) {
    if (!list.length) return '<li class="empty">Inga uppgifter – skönt!</li>';
    return list.map(function (t) {
      var id = prefix + t.id;
      return '<li><label for="' + id + '"><input type="checkbox" id="' + id + '" data-task="' + t.id + '"' + (t.done ? " checked" : "") + ">" + CHECK + '<span class="t">' + esc(t.text) + "</span></label></li>";
    }).join("");
  }
  function renderTasks() {
    var done = tasks.filter(function (t) { return t.done; }).length;
    var label = done + " av " + tasks.length + " klara";
    $("tasks-today").innerHTML = taskList(tasks.slice(0, 5), "td");
    $("tasks-all").innerHTML = taskList(tasks, "ta");
    $("taskcount").textContent = label; $("taskcount-all").textContent = label;
    $("clear-done").hidden = done === 0;
  }
  document.addEventListener("change", function (e) {
    var id = e.target && e.target.dataset && e.target.dataset.task;
    if (!id) return;
    tasks.forEach(function (t) { if (String(t.id) === id) t.done = e.target.checked; });
    save("mindag.tasks", tasks);
    setTimeout(renderTasks, 260); // låt bocken animera färdigt
  });
  $("add-task").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = $("new-task").value.trim();
    if (!v) return;
    tasks.push({ id: Date.now(), text: v, done: false });
    save("mindag.tasks", tasks); $("new-task").value = ""; renderTasks();
  });
  $("clear-done").addEventListener("click", function () {
    tasks = tasks.filter(function (t) { return !t.done; }); save("mindag.tasks", tasks); renderTasks();
  });

  /* ---------- Idag ---------- */
  function greeting(min) { var h = min / 60; return h < 5 ? "God natt" : h < 10 ? "God morgon" : h < 12 ? "God förmiddag" : h < 17 ? "God eftermiddag" : h < 23 ? "God kväll" : "God natt"; }
  var SUN_UP = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v6M9 7l3-3 3 3"/></svg>';
  var SUN_DN = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v6M9 7l3 3 3-3"/></svg>';

  var lastDay = "";
  function update() {
    var now = new Date(), t = today(), info = Sun.dayInfo(t.y, t.m, t.d);
    var alt = Sun.altitude(now, HOME.lat, HOME.lon);
    applyTheme(themeOpt === "light" ? 1 : themeOpt === "dark" ? 0 : smooth(-6, 2, alt));
    Earth.render(now);

    $("date").textContent = cap(longDate.format(now));
    $("greet").textContent = greeting(t.min) + ", " + NAME;
    var ms = now.getTime(), s1, s2;
    if (info.rise && ms < info.rise.getTime()) { s1 = SUN_UP + "Solen går upp <b>" + fmt(info.rise) + "</b>"; s2 = "ner " + fmt(info.set); }
    else if (info.set && ms < info.set.getTime()) { s1 = SUN_DN + "Solen går ner <b>" + fmt(info.set) + "</b>"; s2 = "Dagsljus " + (info.rise ? durStr(info.set - info.rise) : "–"); }
    else { s1 = SUN_DN + "Solen gick ner <b>" + fmt(info.set) + "</b>"; s2 = "Skymningen slutade " + fmt(info.dusk); }
    $("sun1").innerHTML = s1; $("sun2").textContent = s2;
    $("updated").textContent = "Uppdaterad " + hm.format(now);

    var key = t.y + "-" + t.m + "-" + t.d + "-" + Math.floor(t.min / 15);
    if (key !== lastDay) { lastDay = key; renderData(); }
    // Hämta nytt från Google var femte minut medan appen är öppen.
    if (G && (!gdata || Date.now() - gdata.at > 5 * 60000)) fetchGoogle().catch(function () {});
  }

  /* ---------- start ---------- */
  showThemeOpt();
  showGoogle();
  renderTasks();
  go(location.hash.slice(1));
  update();
  Earth.ready(update);
  // Uppdatera varje minut (pausat när fliken är dold) och direkt när man kommer tillbaka.
  setInterval(function () { if (!document.hidden) update(); }, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) update(); });
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(update, 120); });
})();
