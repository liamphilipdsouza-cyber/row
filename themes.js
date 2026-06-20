// Animated wallpaper themes — Matrix Rain, Aurora Lake, Origami Sky
(function () {
  'use strict';

  var THEME_KEY = 'app:theme';
  var canvas = null;
  var ctx = null;
  var raf = null;
  var lastFrame = 0;
  var paused = false;
  var currentTheme = null;
  var currentVariant = 'dark';
  var state = {};
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function readTheme() {
    try { return JSON.parse(localStorage.getItem(THEME_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveTheme(name, variant) {
    try { localStorage.setItem(THEME_KEY, JSON.stringify({ name: name, variant: variant })); } catch (e) {}
  }

  // ── Canvas setup ──────────────────────────────────────────────────────
  function createCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-3;pointer-events:none;';
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext('2d');
    sizeCanvas();
    window.addEventListener('resize', onResize);
  }

  function sizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
    canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  }

  function onResize() {
    sizeCanvas();
    reinitState();
  }

  function removeCanvas() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (canvas) { canvas.remove(); canvas = null; ctx = null; }
    window.removeEventListener('resize', onResize);
    state = {};
  }

  function reinitState() {
    if (currentTheme === 'matrix') initMatrix();
    else if (currentTheme === 'aurora') initAurora();
    else if (currentTheme === 'origami') initOrigami();
  }

  // ── Matrix Rain ───────────────────────────────────────────────────────
  var KATAKANA = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ01';

  function initMatrix() {
    var W = window.innerWidth, H = window.innerHeight;
    var cols = Math.ceil(W / 16);
    var drops = [];
    for (var i = 0; i < cols; i++) {
      drops[i] = Math.random() * -(H / 16);
    }
    state.matrix = { cols: cols, drops: drops, W: W, H: H };
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawMatrix(light) {
    var m = state.matrix;
    if (!m) return;
    var W = m.W, H = m.H;

    // Trail wash — low-alpha overlay fades old glyphs
    ctx.fillStyle = light ? 'rgba(234,245,232,0.06)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = '13px ui-monospace,"SF Mono",Menlo,Consolas,monospace';
    ctx.textAlign = 'left';

    for (var i = 0; i < m.cols; i++) {
      var ch = KATAKANA[Math.floor(Math.random() * KATAKANA.length)];
      var x = i * 16;
      var y = m.drops[i] * 16;

      // Bright head
      ctx.fillStyle = light ? '#c8f5c0' : '#ccffcc';
      ctx.fillText(ch, x, y);
      // Main color one step behind
      ctx.fillStyle = light ? '#00aa30' : '#00FF41';
      ctx.fillText(KATAKANA[Math.floor(Math.random() * KATAKANA.length)], x, y - 16);

      if (y > H && Math.random() > 0.975) m.drops[i] = 0;
      m.drops[i] += 0.5;
    }
  }

  // ── Aurora Lake ───────────────────────────────────────────────────────
  function initAurora() {
    var W = window.innerWidth, H = window.innerHeight;
    var stars = [];
    for (var i = 0; i < 35; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.50,
        r: Math.random() * 1.4 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.025 + 0.005,
      });
    }
    state.aurora = {
      W: W, H: H,
      t: 0,
      stars: stars,
      bands: [
        { c1r: 0, c1g: 255, c1b: 128, c2r: 0, c2g: 180, c2b: 255, phase: 0,    speed: 0.003,  yBase: 0.25, amp: 0.08, freq: 0.70 },
        { c1r: 140, c1g: 0, c1b: 255, c2r: 0, c2g: 220, c2b: 220, phase: 1.2,  speed: 0.0025, yBase: 0.32, amp: 0.06, freq: 0.90 },
        { c1r: 255, c1g: 0, c1b: 160, c2r: 100,c2g: 255,c2b: 200, phase: 2.4,  speed: 0.002,  yBase: 0.20, amp: 0.07, freq: 0.60 },
      ],
    };
  }

  function drawAurora(light) {
    var s = state.aurora;
    if (!s) return;
    var W = s.W, H = s.H;
    s.t += 0.016;

    // Sky
    var skyH = H * 0.52;
    var skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);
    if (light) {
      skyGrad.addColorStop(0, '#9bbcd8');
      skyGrad.addColorStop(0.5, '#c0d8ee');
      skyGrad.addColorStop(1, '#d8ebf5');
    } else {
      skyGrad.addColorStop(0, '#020524');
      skyGrad.addColorStop(0.35, '#040820');
      skyGrad.addColorStop(0.75, '#040608');
      skyGrad.addColorStop(1, '#020306');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, skyH);

    // Lake (bottom 48%)
    var lakeGrad = ctx.createLinearGradient(0, skyH, 0, H);
    if (light) {
      lakeGrad.addColorStop(0, '#88b8d4');
      lakeGrad.addColorStop(1, '#6898b8');
    } else {
      lakeGrad.addColorStop(0, '#010210');
      lakeGrad.addColorStop(1, '#000108');
    }
    ctx.fillStyle = lakeGrad;
    ctx.fillRect(0, skyH, W, H - skyH);

    // Stars (dark only)
    if (!light) {
      s.stars.forEach(function (star) {
        var bright = 0.4 + 0.6 * Math.sin(s.t * star.speed * 60 + star.phase);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + (bright * 0.9).toFixed(2) + ')';
        ctx.fill();
      });
    }

    // Aurora bands + reflections
    var bandAlpha = light ? 0.18 : 0.38;
    s.bands.forEach(function (band) {
      band.phase += band.speed;
      var pts = buildRibbonPoints(band, W, H);
      // Sky ribbon
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, skyH);
      ctx.clip();
      drawRibbon(pts, band, W, bandAlpha);
      ctx.restore();
      // Lake reflection
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, skyH, W, H - skyH);
      ctx.clip();
      ctx.globalAlpha = 0.28;
      ctx.translate(0, H);
      ctx.scale(1, -1);
      drawRibbon(pts, band, W, bandAlpha);
      ctx.restore();
    });

    // Mountains
    drawMountains(W, H, skyH, light);
  }

  function buildRibbonPoints(band, W, H) {
    var pts = [];
    var steps = 80;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var x = t * W;
      var wave = Math.sin(i * band.freq * 0.08 + band.phase) * band.amp * H
               + Math.sin(i * band.freq * 0.15 + band.phase * 1.3) * band.amp * 0.4 * H;
      pts.push({ x: x, y: band.yBase * H + wave });
    }
    return pts;
  }

  function drawRibbon(pts, band, W, alpha) {
    var H2 = window.innerHeight * 0.05;
    var grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0,   'rgba(' + band.c1r + ',' + band.c1g + ',' + band.c1b + ',0)');
    grad.addColorStop(0.25,'rgba(' + band.c1r + ',' + band.c1g + ',' + band.c1b + ',' + alpha + ')');
    grad.addColorStop(0.55,'rgba(' + band.c2r + ',' + band.c2g + ',' + band.c2b + ',' + alpha + ')');
    grad.addColorStop(1,   'rgba(' + band.c2r + ',' + band.c2g + ',' + band.c2b + ',0)');
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y - H2);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y - H2);
    for (var i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + H2 * 3);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function drawMountains(W, H, skyH, light) {
    var fill = light ? '#3a5070' : '#010310';
    var peaksY = [0.78, 0.92, 0.60, 0.82, 0.48, 0.75, 0.40, 0.68, 0.52, 0.80, 0.65];
    var peaksX = [0.05, 0.12, 0.22, 0.30, 0.42, 0.52, 0.62, 0.74, 0.82, 0.91, 1.00];

    function drawPeaks(reflectAlpha) {
      ctx.beginPath();
      ctx.moveTo(0, skyH);
      for (var i = 0; i < peaksX.length; i++) {
        ctx.lineTo(peaksX[i] * W, peaksY[i] * skyH);
      }
      ctx.lineTo(W, skyH);
      ctx.closePath();
      ctx.fillStyle = fill;
      if (reflectAlpha !== undefined) ctx.globalAlpha = reflectAlpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Sky-side mountains
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, skyH);
    ctx.clip();
    drawPeaks();
    ctx.restore();

    // Lake-side reflection
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, skyH, W, H - skyH);
    ctx.clip();
    ctx.translate(0, H);
    ctx.scale(1, -1);
    drawPeaks(0.25);
    ctx.restore();
  }

  // ── Origami Sky ───────────────────────────────────────────────────────
  var PLANE_COLORS_LIGHT = ['#f9a8d4', '#a5f3fc', '#bbf7d0', '#fde68a', '#c4b5fd', '#fed7aa'];
  var PLANE_COLORS_DARK  = ['#db2777', '#0891b2', '#059669', '#d97706', '#7c3aed', '#ea580c'];

  function initOrigami() {
    var W = window.innerWidth, H = window.innerHeight;
    var planes = [];
    for (var i = 0; i < 9; i++) {
      planes.push(makePlane(W, H, true, i));
    }
    state.origami = { planes: planes, W: W, H: H, cloudPhase: 0 };
  }

  function makePlane(W, H, scattered, i) {
    var duration = (20 + Math.random() * 8) * 1000;
    var startTime = performance.now() - (scattered ? Math.random() * duration : 0);
    return {
      y: H * (0.08 + Math.random() * 0.65),
      scale: 0.55 + Math.random() * 0.65,
      colorL: PLANE_COLORS_LIGHT[Math.floor(Math.random() * PLANE_COLORS_LIGHT.length)],
      colorD: PLANE_COLORS_DARK[Math.floor(Math.random() * PLANE_COLORS_DARK.length)],
      duration: duration,
      startTime: startTime,
      drift: (Math.random() - 0.5) * H * 0.06,
    };
  }

  function drawOrigami(light) {
    var s = state.origami;
    if (!s) return;
    var W = s.W, H = s.H;
    s.cloudPhase += 0.0004;

    // Sky gradient
    var skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    if (light) {
      skyGrad.addColorStop(0, '#dceefb');
      skyGrad.addColorStop(0.55, '#eaf1fc');
      skyGrad.addColorStop(1, '#f7eff0');
    } else {
      skyGrad.addColorStop(0, '#0a1428');
      skyGrad.addColorStop(0.6, '#0f0a22');
      skyGrad.addColorStop(1, '#160a18');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Soft clouds
    drawClouds(W, H, light, s.cloudPhase);

    // Paper planes
    var now = performance.now();
    for (var i = 0; i < s.planes.length; i++) {
      var p = s.planes[i];
      var elapsed = (now - p.startTime) % p.duration;
      var prog = elapsed / p.duration;
      var x = -80 + (W + 160) * prog;
      var y = p.y + Math.sin(prog * Math.PI * 2.5) * p.drift;
      drawPaperPlane(x, y, p.scale, light ? p.colorL : p.colorD, light);

      if (elapsed < 50 && prog < 0.01) {
        // Just wrapped — randomize
        p.y = H * (0.08 + Math.random() * 0.65);
        p.drift = (Math.random() - 0.5) * H * 0.06;
        p.duration = (20 + Math.random() * 8) * 1000;
        p.colorL = PLANE_COLORS_LIGHT[Math.floor(Math.random() * PLANE_COLORS_LIGHT.length)];
        p.colorD = PLANE_COLORS_DARK[Math.floor(Math.random() * PLANE_COLORS_DARK.length)];
      }
    }
  }

  function drawClouds(W, H, light, phase) {
    var defs = [
      { cx: 0.15, cy: 0.13, rx: 0.11, ry: 0.035 },
      { cx: 0.45, cy: 0.09, rx: 0.10, ry: 0.030 },
      { cx: 0.72, cy: 0.20, rx: 0.13, ry: 0.040 },
      { cx: 0.30, cy: 0.32, rx: 0.09, ry: 0.028 },
      { cx: 0.82, cy: 0.42, rx: 0.10, ry: 0.032 },
    ];
    var alpha = light ? 0.55 : 0.09;
    defs.forEach(function (d, idx) {
      var cx = ((d.cx + 0.008 * idx * Math.sin(phase + idx * 0.7)) % 1.05) * W;
      var cy = d.cy * H;
      var rx = d.rx * W;
      var ry = d.ry * H;
      // Soft cloud via layered radial gradients
      for (var layer = 0; layer < 3; layer++) {
        var rad = rx * (1 - layer * 0.25);
        var a = alpha * (1 - layer * 0.3);
        var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        grad.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(2) + ')');
        grad.addColorStop(0.5, 'rgba(255,255,255,' + (a * 0.5).toFixed(2) + ')');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save();
        ctx.scale(1, ry / rx);
        ctx.beginPath();
        ctx.arc(cx, cy * rx / ry, rad, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }
    });
  }

  function drawPaperPlane(x, y, scale, color, light) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    var pw = 36, ph = 22;

    // Shadow
    ctx.shadowColor = light ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = color;

    // Upper wing + body
    ctx.beginPath();
    ctx.moveTo(pw, ph * 0.42);         // nose
    ctx.lineTo(-pw * 0.52, 0);         // top-back
    ctx.lineTo(-pw * 0.22, ph * 0.42); // inner fold (notch indent)
    ctx.lineTo(-pw * 0.52, ph * 0.88); // tail bottom
    ctx.lineTo(pw * 0.04, ph * 0.60);  // fuselage bottom
    ctx.closePath();
    ctx.fill();

    // Crease highlight
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = light ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(pw, ph * 0.42);
    ctx.lineTo(-pw * 0.22, ph * 0.42);
    ctx.stroke();

    ctx.restore();
  }

  // ── Animation loop ────────────────────────────────────────────────────
  function getInterval() {
    return currentTheme === 'matrix' ? 50 : 33; // 20fps or ~30fps
  }

  function loop(ts) {
    if (paused) return;
    raf = requestAnimationFrame(loop);
    if (ts - lastFrame < getInterval()) return;
    lastFrame = ts;
    if (!ctx) return;
    var light = currentVariant === 'light';
    if (currentTheme === 'matrix') drawMatrix(light);
    else if (currentTheme === 'aurora') drawAurora(light);
    else if (currentTheme === 'origami') drawOrigami(currentVariant !== 'dark');
  }

  // ── Public API ────────────────────────────────────────────────────────
  function apply(name, variant) {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    state = {};
    currentTheme = name || null;
    currentVariant = variant || 'dark';

    if (!name || name === 'none') {
      removeCanvas();
      saveTheme('none', currentVariant);
      return;
    }

    createCanvas();

    if (name === 'matrix') {
      if (ctx) { ctx.fillStyle = currentVariant === 'light' ? '#eaf5e8' : '#000'; ctx.fillRect(0, 0, window.innerWidth, window.innerHeight); }
      initMatrix();
    } else if (name === 'aurora') {
      initAurora();
    } else if (name === 'origami') {
      initOrigami();
    }

    saveTheme(name, currentVariant);

    if (reducedMotion) {
      // Single static frame
      var light = currentVariant === 'light';
      if (name === 'matrix') drawMatrix(light);
      else if (name === 'aurora') drawAurora(light);
      else if (name === 'origami') drawOrigami(currentVariant !== 'dark');
      return;
    }

    paused = false;
    lastFrame = 0;
    raf = requestAnimationFrame(loop);
  }

  window.Themes = {
    apply: apply,
    getTheme: function () { return { name: currentTheme, variant: currentVariant }; },
  };

  // Pause/resume on visibility
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      paused = true;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    } else if (currentTheme && currentTheme !== 'none') {
      paused = false;
      lastFrame = 0;
      raf = requestAnimationFrame(loop);
    }
  });

  // Auto-apply saved theme
  var saved = readTheme();
  if (saved.name && saved.name !== 'none') {
    if (document.body) {
      apply(saved.name, saved.variant);
    } else {
      document.addEventListener('DOMContentLoaded', function () { apply(saved.name, saved.variant); });
    }
  }

})();
