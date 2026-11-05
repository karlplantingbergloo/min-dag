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

  /* ---------- exempeldata ---------- */
  var EVENTS = [
    { day: 0, min: 600, title: "Träning", place: "Friskis & Svettis" },
    { day: 0, min: 810, title: "Arbetsintervju", place: "Butik, Södermalm", key: true },
    { day: 0, min: 1110, title: "Middag hemma" },
    { day: 1, min: 540, title: "Ring Arbetsförmedlingen", key: true },
    { day: 1, min: 900, title: "Fika med Sara", place: "Mariatorget" },
    { day: 2, min: 660, title: "Promenad", place: "Djurgården" }
  ];
  var MAIL = [
    { from: "Banken", time: "08:12", text: "Vi behöver komplettera dina uppgifter.", unread: true },
    { from: "Butik Södermalm", time: "Igår", text: "Välkommen på intervju torsdag 13:30!", unread: true },
    { from: "Arbetsförmedlingen", time: "Mån", text: "Påminnelse: aktivitetsrapport senast den 14:e." }
  ];
  var DEFAULT_TASKS = [
    { id: 1, text: "Uppdatera CV", done: true },
    { id: 2, text: "Skicka två ansökningar", done: false },
    { id: 3, text: "Svara på mejl från banken", done: false },
    { id: 4, text: "Handla till middagen", done: false }
  ];
  var tasks = load("mindag.tasks", DEFAULT_TASKS);
  if (!Array.isArray(tasks)) tasks = DEFAULT_TASKS.slice();

  function eventRow(e, nowMin, isToday) {
    var hh = String(Math.floor(e.min / 60)).padStart(2, "0") + ":" + String(e.min % 60).padStart(2, "0");
    var past = isToday && e.min + 60 < nowMin;
    return '<li class="' + (past ? "past" : "") + '"><time>' + hh + '</time><span class="bar' + (e.key ? "" : " muted") + '"></span><div>' + esc(e.title) + (e.place ? "<small>" + esc(e.place) + "</small>" : "") + "</div></li>";
  }
  function renderEvents(t) {
    var todays = EVENTS.filter(function (e) { return e.day === 0; });
    $("events-today").innerHTML = todays.map(function (e) { return eventRow(e, t.min, true); }).join("");
    $("evcount").textContent = todays.length + " händelser";
    var html = "";
    for (var d = 0; d < 3; d++) {
      var noon = new Date(Sun.stockholmDate(t.y, t.m, t.d, 12 * 60).getTime() + d * 86400000);
      var label = d === 0 ? "Idag" : d === 1 ? "Imorgon" : cap(weekday.format(noon));
      var list = EVENTS.filter(function (e) { return e.day === d; });
      html += '<section class="glass card"><div class="head"><h2>' + label + "</h2><span>" + esc(longDate.format(noon).replace(/^\S+\s/, "")) + '</span></div><ul class="events tnum">' +
        (list.length ? list.map(function (e) { return eventRow(e, t.min, d === 0); }).join("") : '<li class="empty">Inget inbokat</li>') + "</ul></section>";
    }
    $("calendar").innerHTML = html;
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
  $("mail").innerHTML = MAIL.map(function (m) {
    return '<li class="' + (m.unread ? "unread" : "") + '"><b>' + esc(m.from) + "</b><time>" + esc(m.time) + "</time><p>" + esc(m.text) + "</p></li>";
  }).join("");

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
    if (key !== lastDay) { lastDay = key; renderEvents(t); }
  }

  /* ---------- start ---------- */
  showThemeOpt();
  renderTasks();
  go(location.hash.slice(1));
  update();
  Earth.ready(update);
  // Uppdatera varje minut (pausat när fliken är dold) och direkt när man kommer tillbaka.
  setInterval(function () { if (!document.hidden) update(); }, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) update(); });
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(update, 120); });
})();
