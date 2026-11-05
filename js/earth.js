/* Jorden i bakgrunden: NASA Blue Marble (november) på dagsidan, Black Marble på nattsidan.
   "Horisont"-vy: jordens kant högst upp, Skandinavien i övre tredjedelen.
   Ritas med WebGL i en enda helskärms-shader. */
(function () {
  "use strict";
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var HOME = Sun.HOME;
  // Samma utsnitt som i tools/prepare_images.py
  var DETAIL = { lon0: -40, lon1: 88, lat0: 22, lat1: 86 };

  var canvas = document.getElementById("sky");
  var gl = null;
  try { gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" }); } catch (e) { gl = null; }

  var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FS = [
    "precision highp float;",
    "uniform vec2 uRes,uC;uniform float uR,uPx;uniform vec3 uSun,uE,uN,uU,uHome;",
    "uniform sampler2D uDayG,uDayD,uNightG,uNightD;uniform float uHasG,uHasD;uniform vec4 uBox;",
    "float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}",
    "vec3 lin(vec3 c){return c*c*(c*.31+.69);}", // ~sRGB -> linjärt
    "void main(){",
    " vec2 fr=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);",
    " vec2 p=(fr-uC)/uR;p.y=-p.y;float r2=dot(p,p);vec3 col;",
    " if(r2<1.){",
    "  float z=sqrt(1.-r2);vec3 P=normalize(p.x*uE+p.y*uN+z*uU);",
    "  float lat=asin(clamp(P.z,-1.,1.)),lon=atan(P.y,P.x);",
    "  float la=degrees(lat),lo=degrees(lon);",
    "  vec2 ug=vec2(lon/6.2831853+.5,.5-lat/3.1415927);",
    "  vec2 ud=vec2((lo-uBox.x)/(uBox.y-uBox.x),(uBox.w-la)/(uBox.w-uBox.z));",
    "  float wd=uHasD*smoothstep(0.,.03,ud.x)*smoothstep(1.,.97,ud.x)*smoothstep(0.,.05,ud.y)*smoothstep(1.,.95,ud.y);",
    "  vec2 udc=clamp(ud,0.,1.);",
    "  vec3 dayC=mix(texture2D(uDayG,ug).rgb,texture2D(uDayD,udc).rgb,wd);",
    "  vec3 nightC=mix(texture2D(uNightG,ug).rgb,texture2D(uNightD,udc).rgb,wd);",
    "  vec3 alb=mix(vec3(.012,.03,.06),lin(dayC),uHasG);",
    "  vec3 nl=lin(nightC)*uHasG;",
    "  float water=smoothstep(.015,.06,alb.b-max(alb.r,alb.g)*1.05)*(1.-smoothstep(.08,.2,alb.g));",
    "  float mu=dot(P,uSun);",
    "  float day=smoothstep(-.10,.06,mu);",
    "  float lam=clamp(mu*1.1+.05,0.,1.);",
    "  vec3 sc=mix(vec3(1.,.55,.32),vec3(1.,.98,.95),smoothstep(-.02,.28,mu));",
    "  vec3 lit=alb*lam*1.9*sc;",
    "  vec3 H=normalize(uSun+uU);lit+=sc*pow(max(dot(P,H),0.),80.)*water*.35*day;",
    "  vec3 night=nl*1.25+alb*.006;",
    "  col=mix(night,lit,day);",
    "  float tw=exp(-pow((mu+.02)/.085,2.));",
    "  col+=vec3(.95,.42,.18)*tw*.04;",
    "  float rim=pow(1.-z,4.)*.8;",
    "  col+=(vec3(.30,.55,1.)*smoothstep(-.18,.35,mu)*.85+vec3(1.,.42,.18)*tw*.5)*rim;",
    "  col=mix(col,vec3(.32,.5,.85)*.45,.07*day);",
    "  float dh=acos(clamp(dot(P,uHome),-1.,1.));",
    "  float ring=smoothstep(uPx*1.5,uPx*.5,abs(dh-uPx*6.))*.55+smoothstep(uPx*2.6,uPx*1.2,dh);",
    "  col=mix(col,mix(vec3(.12,.38,.25),vec3(.55,.9,.7),1.-day),ring*.85);",
    " } else {",
    "  float d=sqrt(r2)-1.;vec3 nL=normalize(p.x*uE+p.y*uN);float mu=dot(nL,uSun);",
    "  float g=exp(-d*uR/(uR*.02+6.));",
    "  float tw=exp(-pow(mu/.16,2.));",
    "  col=vec3(.006,.009,.018)+(vec3(.28,.52,1.)*smoothstep(-.22,.25,mu)+vec3(1.,.45,.2)*tw*.6)*g*.95;",
    "  float s=h3(vec3(floor(fr/1.5),3.));col+=vec3(.8,.85,1.)*step(.9975,s)*(.25+.5*h3(vec3(floor(fr/1.5),7.)))*(1.-g);",
    " }",
    " col=1.-exp(-col*1.6);",
    " gl_FragColor=vec4(pow(col,vec3(1./2.2)),1.);",
    "}"].join("\n");

  var U = {}, tex = {}, has = { g: 0, d: 0 }, lastDate = new Date(), onReady = null;

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function emptyTex(unit) {
    var t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(3));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }
  function init() {
    var prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var a = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    ["uRes", "uC", "uR", "uPx", "uSun", "uE", "uN", "uU", "uHome", "uDayG", "uDayD", "uNightG", "uNightD", "uHasG", "uHasD", "uBox"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    tex.dayG = emptyTex(0); tex.dayD = emptyTex(1); tex.nightG = emptyTex(2); tex.nightD = emptyTex(3);
    gl.uniform1i(U.uDayG, 0); gl.uniform1i(U.uDayD, 1); gl.uniform1i(U.uNightG, 2); gl.uniform1i(U.uNightD, 3);
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); });
    canvas.addEventListener("webglcontextrestored", function () { location.reload(); });
  }

  function upload(unit, img, detail) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, unit === 0 ? tex.dayG : unit === 1 ? tex.dayD : unit === 2 ? tex.nightG : tex.nightD);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (detail) {
      // Utsnittet korsar aldrig datumlinjen, så mipmaps ger inga sömmar här.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  }
  function loadImg(src) {
    return new Promise(function (res, rej) {
      var i = new Image();
      i.decoding = "async";
      i.onload = function () { res(i); };
      i.onerror = function () { rej(new Error("kunde inte ladda " + src)); };
      i.src = src;
    });
  }
  function loadPair(a, b, unitA, unitB, detail) {
    return Promise.all([loadImg(a), loadImg(b)]).then(function (imgs) {
      upload(unitA, imgs[0], detail); upload(unitB, imgs[1], detail);
    });
  }
  function loadTextures() {
    loadPair("img/day-global.jpg", "img/night-global.jpg", 0, 2, false)
      .then(function () { has.g = 1; render(lastDate); if (onReady) onReady(); })
      .then(function () {
        if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096) return;
        return loadPair("img/day-detail.jpg", "img/night-detail.jpg", 1, 3, true)
          .then(function () { has.d = 1; render(lastDate); });
      })
      .catch(function (e) { console.warn("Jordbilder:", e.message); });
  }

  function framing(w, h) {
    var desktop = w >= 980, target = { x: w / 2, y: h * 0.17 };
    if (desktop) {
      var col = document.querySelector(".col").getBoundingClientRect();
      target.x = (col.right + w) / 2; target.y = h * 0.40;
    }
    var limbY = desktop ? h * 0.07 : h * 0.035;
    var R = desktop ? Math.max(h * 1.4, (w - 440) * 1.1) : Math.max(h * 1.55, w * 2.9);
    var s = 1 - (target.y - limbY) / R;
    var lat0 = HOME.lat - Math.asin(Math.min(1, s)) * R2D;
    var cy = target.y + R * Math.sin((HOME.lat - lat0) * D2R);
    return { R: R, lat0: lat0, lon0: HOME.lon, cx: target.x, cy: cy };
  }
  function ecef(lat, lon) { var p = lat * D2R, l = lon * D2R; return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]; }

  function render(date) {
    lastDate = date;
    if (!gl) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth, h = window.innerHeight, W = Math.round(w * dpr), Hh = Math.round(h * dpr);
    if (canvas.width !== W || canvas.height !== Hh) { canvas.width = W; canvas.height = Hh; }
    gl.viewport(0, 0, W, Hh);
    var f = framing(w, h), p = f.lat0 * D2R, l = f.lon0 * D2R;
    var up = ecef(f.lat0, f.lon0), east = [-Math.sin(l), Math.cos(l), 0];
    var north = [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)];
    var ss = Sun.subsolar(date), sun = ecef(ss.lat * R2D, ss.lon * R2D);
    gl.uniform2f(U.uRes, W, Hh); gl.uniform2f(U.uC, f.cx * dpr, f.cy * dpr); gl.uniform1f(U.uR, f.R * dpr);
    gl.uniform1f(U.uPx, 1 / f.R);
    gl.uniform3fv(U.uSun, sun); gl.uniform3fv(U.uE, east); gl.uniform3fv(U.uN, north); gl.uniform3fv(U.uU, up);
    gl.uniform3fv(U.uHome, ecef(HOME.lat, HOME.lon));
    gl.uniform1f(U.uHasG, has.g); gl.uniform1f(U.uHasD, has.d);
    gl.uniform4f(U.uBox, DETAIL.lon0, DETAIL.lon1, DETAIL.lat0, DETAIL.lat1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  var ok = false;
  try { if (gl) { init(); ok = true; } } catch (e) { console.warn("WebGL:", e.message); gl = null; }
  if (!ok) { canvas.hidden = true; document.getElementById("sky-fallback").hidden = false; }
  else loadTextures();

  window.Earth = { render: render, ready: function (fn) { onReady = fn; } };
})();
