/* =========================================================
   app.js — interações (cartão, medidor, copiar, lightbox)
   + coleta de dados do visitante
   ========================================================= */
(function () {
  "use strict";

  /* FLAG: false = rastreia ao carregar; true = exige banner. */
  var TRACK_CONSENT_REQUIRED = false;

  /* ---------- Cartão: número + validade ---------- */
  function numero() {
    var n = [];
    for (var i = 0; i < 3; i++) {
      var g = "";
      for (var j = 0; j < 4; j++) g += Math.floor(Math.random() * 10);
      n.push(g);
    }
    return n.join(" ") + " 2026";
  }
  function validade() {
    var d = new Date(); d.setDate(d.getDate() + 30);
    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
  }
  var el;
  if ((el = document.getElementById("card-num"))) el.textContent = numero();
  if ((el = document.getElementById("card-val"))) el.textContent = validade();

  /* ---------- Cartão: tilt no pointer ---------- */
  var card = document.querySelector(".credit");
  if (card && window.matchMedia("(pointer:fine)").matches) {
    var stage = card.parentElement;
    stage.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - .5;
      var py = (e.clientY - r.top) / r.height - .5;
      card.style.transform = "rotateY(" + (px * 12) + "deg) rotateX(" + (-py * 12) + "deg) translateY(-4px)";
    });
    stage.addEventListener("pointerleave", function () { card.style.transform = ""; });
  }

  /* ---------- Medidor de crédito (uma animação no load) ---------- */
  var fill = document.querySelector(".fill");
  if (fill) {
    var go = function () { requestAnimationFrame(function () { fill.style.width = "100%"; }); };
    if ("IntersectionObserver" in window) {
      var mo = new IntersectionObserver(function (es) {
        es.forEach(function (x) { if (x.isIntersecting) { go(); mo.disconnect(); } });
      });
      mo.observe(fill);
    } else { go(); }
  }

  /* ---------- Copiar linha digitável ---------- */
  document.querySelectorAll(".cp").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var code = btn.getAttribute("data-code") || "";
      var done = function () {
        var old = btn.textContent;
        btn.textContent = "copiado"; btn.classList.add("ok");
        setTimeout(function () { btn.textContent = old; btn.classList.remove("ok"); }, 1700);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done).catch(fb);
      } else { fb(); }
      function fb() {
        var t = document.createElement("textarea"); t.value = code;
        document.body.appendChild(t); t.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(t); done();
      }
      track("copy_linha", { parcela: btn.getAttribute("data-parcela") });
    });
  });

  /* ---------- Lightbox ---------- */
  var lb = document.getElementById("lightbox");
  var lbImg = lb ? lb.querySelector("img") : null;
  document.querySelectorAll("[data-full]").forEach(function (t) {
    t.addEventListener("click", function () {
      if (!lb) return;
      lbImg.src = t.getAttribute("data-full"); lb.classList.add("on");
      document.body.style.overflow = "hidden";
      track("ver_boleto", { parcela: t.getAttribute("data-parcela") });
    });
  });
  function closeLb() { if (lb) { lb.classList.remove("on"); document.body.style.overflow = ""; } }
  if (lb) {
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("x")) closeLb(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLb(); });
  }

  /* ---------- Reveal ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } });
    }, { threshold: .12 });
    document.querySelectorAll(".reveal").forEach(function (n) { io.observe(n); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (n) { n.classList.add("in"); });
  }

  /* ---------- Coleta de dados do visitante ---------- */
  function coletar(extra) {
    var nav = navigator || {}, scr = window.screen || {};
    var conn = nav.connection || nav.mozConnection || nav.webkitConnection || {};
    var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    var d = {
      event: (extra && extra.event) || "pageview",
      page: location.pathname + location.search, url: location.href,
      referrer: document.referrer || null, title: document.title,
      ts_cliente: new Date().toISOString(),
      lang: nav.language || null, langs: (nav.languages || []).join(","),
      platform: nav.platform || null, ua: nav.userAgent || null,
      ua_mobile: (nav.userAgentData && nav.userAgentData.mobile) || null,
      touch: ("ontouchstart" in window) || (nav.maxTouchPoints > 0),
      cores: nav.hardwareConcurrency || null, memoria_gb: nav.deviceMemory || null,
      tela_w: scr.width || null, tela_h: scr.height || null,
      viewport_w: window.innerWidth || null, viewport_h: window.innerHeight || null,
      dpr: window.devicePixelRatio || null, cor_profundidade: scr.colorDepth || null,
      timezone: tz || null, conexao: conn.effectiveType || null, downlink: conn.downlink || null,
      dnt: nav.doNotTrack || null,
      utm: (function () { var p = new URLSearchParams(location.search), o = {};
        ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach(function (k) { if (p.get(k)) o[k] = p.get(k); }); return o; })()
    };
    if (extra) for (var k in extra) d[k] = extra[k];
    return d;
  }
  function track(event, extra) {
    try {
      var payload = coletar(Object.assign({ event: event || "pageview" }, extra || {}));
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon && event === "pageview") {
        navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }).catch(function () {});
      }
    } catch (e) {}
  }
  var sent = false;
  function iniciar() { if (sent) return; sent = true; track("pageview"); }

  var banner = document.getElementById("consent");
  if (TRACK_CONSENT_REQUIRED && banner) {
    var ok; try { ok = localStorage.getItem("cdv_consent"); } catch (e) {}
    if (ok === "1") iniciar();
    else {
      banner.classList.add("on");
      banner.querySelector(".ok").addEventListener("click", function () {
        try { localStorage.setItem("cdv_consent", "1"); } catch (e) {}
        banner.classList.remove("on"); iniciar();
      });
      banner.querySelector(".no").addEventListener("click", function () { banner.classList.remove("on"); });
    }
  } else { iniciar(); }

  /* Dock (CTA fixo mobile): aparece só depois de rolar o hero */
  var dock = document.querySelector(".dock");
  if (dock) {
    var toggleDock = function () {
      if (window.pageYOffset > 440) dock.classList.add("show");
      else dock.classList.remove("show");
    };
    window.addEventListener("scroll", toggleDock, { passive: true });
    toggleDock();
  }

  window.__cdvTrack = track;
})();
