/* =========================================================
   app.js — interações + coleta de dados do visitante
   ========================================================= */
(function () {
  "use strict";

  /* ------- FLAG DE CONSENTIMENTO -------
     false = rastreia direto ao carregar (comportamento atual pedido).
     true  = mostra banner e só rastreia após "Entendi".            */
  var TRACK_CONSENT_REQUIRED = false;

  /* ---------- Carteira de intrometido: número + validade ---------- */
  function gerarNumero() {
    var n = "";
    for (var i = 0; i < 12; i++) {
      if (i && i % 4 === 0) n += " ";
      n += Math.floor(Math.random() * 10);
    }
    return n;
  }
  function validade() {
    var d = new Date();
    d.setDate(d.getDate() + 30);
    return ("0" + d.getDate()).slice(-2) + "/" +
           ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
  }
  var numEl = document.getElementById("card-num");
  var valEl = document.getElementById("card-val");
  if (numEl) numEl.textContent = gerarNumero();
  if (valEl) valEl.textContent = validade();

  /* ---------- Copiar linha digitável ---------- */
  document.querySelectorAll(".copybtn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var code = btn.getAttribute("data-code") || "";
      var done = function () {
        var old = btn.textContent;
        btn.textContent = "copiado ✓";
        btn.classList.add("ok");
        setTimeout(function () { btn.textContent = old; btn.classList.remove("ok"); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done).catch(fallback);
      } else { fallback(); }
      function fallback() {
        var t = document.createElement("textarea");
        t.value = code; document.body.appendChild(t); t.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(t); done();
      }
      track("copy_linha", { parcela: btn.getAttribute("data-parcela") });
    });
  });

  /* ---------- Lightbox (ver boleto inteiro) ---------- */
  var lb = document.getElementById("lightbox");
  var lbImg = lb ? lb.querySelector("img") : null;
  document.querySelectorAll("[data-full]").forEach(function (el) {
    el.addEventListener("click", function () {
      if (!lb) return;
      lbImg.src = el.getAttribute("data-full");
      lb.classList.add("on");
      document.body.style.overflow = "hidden";
      track("ver_boleto", { parcela: el.getAttribute("data-parcela") });
    });
  });
  function closeLb() {
    if (!lb) return;
    lb.classList.remove("on");
    document.body.style.overflow = "";
  }
  if (lb) {
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.classList.contains("close")) closeLb();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLb(); });
  }

  /* ---------- Reveal on scroll ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Coleta de dados do visitante ---------- */
  var sent = false;
  function coletar(extra) {
    var nav = navigator || {};
    var scr = window.screen || {};
    var conn = nav.connection || nav.mozConnection || nav.webkitConnection || {};
    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    var data = {
      event: (extra && extra.event) || "pageview",
      page: location.pathname + location.search,
      url: location.href,
      referrer: document.referrer || null,
      title: document.title,
      ts_cliente: new Date().toISOString(),
      lang: nav.language || null,
      langs: (nav.languages || []).join(","),
      platform: nav.platform || null,
      ua: nav.userAgent || null,
      ua_mobile: (nav.userAgentData && nav.userAgentData.mobile) || null,
      touch: ("ontouchstart" in window) || (nav.maxTouchPoints > 0),
      cores: nav.hardwareConcurrency || null,
      memoria_gb: nav.deviceMemory || null,
      tela_w: scr.width || null,
      tela_h: scr.height || null,
      viewport_w: window.innerWidth || null,
      viewport_h: window.innerHeight || null,
      dpr: window.devicePixelRatio || null,
      cor_profundidade: scr.colorDepth || null,
      timezone: tz || null,
      conexao: conn.effectiveType || null,
      downlink: conn.downlink || null,
      dnt: nav.doNotTrack || null,
      utm: (function () {
        var p = new URLSearchParams(location.search), o = {};
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
          if (p.get(k)) o[k] = p.get(k);
        });
        return o;
      })()
    };
    if (extra) for (var k in extra) data[k] = extra[k];
    return data;
  }

  function track(event, extra) {
    try {
      var payload = coletar(Object.assign({ event: event || "pageview" }, extra || {}));
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon && event === "pageview") {
        navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
          keepalive: true
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function iniciar() {
    if (sent) return; sent = true;
    track("pageview");
  }

  /* ---------- Banner de consentimento (desligado por padrão) ---------- */
  var banner = document.getElementById("consent");
  if (TRACK_CONSENT_REQUIRED && banner) {
    var ok = localStorage.getItem("cdv_consent");
    if (ok === "1") { iniciar(); }
    else {
      banner.classList.add("on");
      banner.querySelector(".ok").addEventListener("click", function () {
        try { localStorage.setItem("cdv_consent", "1"); } catch (e) {}
        banner.classList.remove("on"); iniciar();
      });
      banner.querySelector(".no").addEventListener("click", function () {
        banner.classList.remove("on");
      });
    }
  } else {
    iniciar();
  }

  /* expõe track para outros cliques */
  window.__cdvTrack = track;
})();
