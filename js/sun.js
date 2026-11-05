/* Solens läge och tid i Stockholm. Noggrant till ungefär en minut. */
(function () {
  "use strict";
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var HOME = { name: "Stockholm", lat: 59.3293, lon: 18.0686 };
  var TZ = "Europe/Stockholm";

  function sunEq(date) {
    var n = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
    var L = (280.460 + 0.9856474 * n) % 360, g = ((357.528 + 0.9856003 * n) % 360) * D2R;
    var lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * D2R;
    var eps = (23.439 - 0.0000004 * n) * D2R;
    var ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
    var dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    var gmst = ((18.697374558 + 24.06570982441908 * n) % 24 + 24) % 24;
    return { ra: ra, dec: dec, gmst: gmst * 15 * D2R };
  }
  // Punkten på jorden där solen står rakt ovanför (radianer).
  function subsolar(date) {
    var s = sunEq(date), lon = s.ra - s.gmst;
    return { lat: s.dec, lon: Math.atan2(Math.sin(lon), Math.cos(lon)) };
  }
  function altitude(date, lat, lon) {
    var s = sunEq(date), H = s.gmst + lon * D2R - s.ra, p = lat * D2R;
    return Math.asin(Math.sin(p) * Math.sin(s.dec) + Math.cos(p) * Math.cos(s.dec) * Math.cos(H)) * R2D;
  }
  function crossings(dayStartMs, alt) {
    var out = { rise: null, set: null }, step = 10 * 60000;
    var prev = altitude(new Date(dayStartMs), HOME.lat, HOME.lon) - alt;
    for (var t = dayStartMs + step; t <= dayStartMs + 86400000; t += step) {
      var cur = altitude(new Date(t), HOME.lat, HOME.lon) - alt;
      if ((prev < 0) !== (cur < 0)) {
        var a = t - step, b = t, fa = prev;
        for (var i = 0; i < 20; i++) {
          var m = (a + b) / 2, fm = altitude(new Date(m), HOME.lat, HOME.lon) - alt;
          if ((fa < 0) === (fm < 0)) { a = m; fa = fm; } else b = m;
        }
        if (prev < 0) out.rise = new Date((a + b) / 2); else out.set = new Date((a + b) / 2);
      }
      prev = cur;
    }
    return out;
  }

  var partsFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  function localParts(d) {
    var o = {};
    partsFmt.formatToParts(d).forEach(function (p) { if (p.type !== "literal") o[p.type] = +p.value; });
    return o;
  }
  function tzOffsetMs(d) {
    var p = localParts(d);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(d.getTime() / 1000) * 1000;
  }
  // Ett ögonblick angivet i Stockholmstid.
  function stockholmDate(y, m, d, minutes) {
    var guess = Date.UTC(y, m - 1, d, 0, minutes);
    var t = guess - tzOffsetMs(new Date(guess));
    return new Date(guess - tzOffsetMs(new Date(t)));
  }
  var cache = {};
  function dayInfo(y, m, d) {
    var key = y + "-" + m + "-" + d;
    if (cache[key]) return cache[key];
    var start = stockholmDate(y, m, d, 0).getTime();
    var sun = crossings(start, -0.833), civ = crossings(start, -6);
    return (cache[key] = { start: start, rise: sun.rise, set: sun.set, dawn: civ.rise, dusk: civ.set });
  }

  window.Sun = { HOME: HOME, TZ: TZ, subsolar: subsolar, altitude: altitude, localParts: localParts, stockholmDate: stockholmDate, dayInfo: dayInfo };
})();
