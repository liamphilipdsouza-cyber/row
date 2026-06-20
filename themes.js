/* ================================================================
   themes.js — 15-theme engine: backgrounds + card CSS variables
   ================================================================ */
(function () {
  'use strict';

  // ─── Storage keys ───────────────────────────────────────────────────
  var THEME_KEY = 'app:theme';
  var ANIM_KEY  = 'app:theme:anim';

  // ─── Runtime state ──────────────────────────────────────────────────
  var cvs = null, cx = null, raf = null;
  var lastTs = 0, paused = false;
  var cur = null;           // current theme id
  var animOn = true;        // animation enabled
  var reducedMotion = !!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var S = {};               // per-theme canvas state

  // ─── Prefs ──────────────────────────────────────────────────────────
  function readPref()  { try { return JSON.parse(localStorage.getItem(THEME_KEY)) || {}; } catch(e){ return {}; } }
  function savePref(id,anim){ try { localStorage.setItem(THEME_KEY, JSON.stringify({id:id, anim:!!anim})); } catch(e){} }
  function readAnim()  { var p=readPref(); return p.anim !== false; }

  // ─── Theme metadata ─────────────────────────────────────────────────
  var THEMES = [
    { id:'mesh',         label:'Mesh Gradient',    desc:'Floating color blobs',         cat:'premium',     type:'css',    bg:'#0a0a0a',   prev:'linear-gradient(135deg,#0a0a14 0%,#0d1a2a 45%,#120a1a 100%)' },
    { id:'aurora',       label:'Aurora',            desc:'Flowing light streams',         cat:'premium',     type:'canvas', bg:'#050515',   prev:'linear-gradient(135deg,#050515 0%,#0a0530 50%,#050510 100%)' },
    { id:'liquid-metal', label:'Liquid Metal',      desc:'Chrome wave animation',         cat:'premium',     type:'css',    bg:'#111',      prev:'linear-gradient(135deg,#1c1c1c 0%,#2e2e2e 50%,#181818 100%)' },
    { id:'brutalist',    label:'Brutalist Grid',    desc:'Raw concrete power',            cat:'bold',        type:'css',    bg:'#161616',   prev:'linear-gradient(0deg,#222 0%,#181818 100%)' },
    { id:'volcanic',     label:'Volcanic Lava',     desc:'Beast mode activated',          cat:'bold',        type:'canvas', bg:'#080000',   prev:'linear-gradient(180deg,#0d0000 0%,#1a0200 60%,#080000 100%)' },
    { id:'cyberpunk',    label:'Cyberpunk Neon',    desc:'Blade Runner aesthetic',        cat:'bold',        type:'css',    bg:'#000',      prev:'linear-gradient(135deg,#000 0%,#05000a 50%,#000a0a 100%)' },
    { id:'synthwave',    label:'Synthwave 80s',     desc:'Neon Miami nights',             cat:'bold',        type:'css',    bg:'#1a0033',   prev:'linear-gradient(180deg,#1a0033 0%,#2a004a 55%,#3a005a 100%)' },
    { id:'topographic',  label:'Topographic',       desc:'Elevation contour map',         cat:'minimal',     type:'canvas', bg:'#0a141e',   prev:'linear-gradient(135deg,#0a141e 0%,#0d1b28 100%)' },
    { id:'blueprint',    label:'Blueprint',         desc:'Engineering schematic',         cat:'minimal',     type:'css',    bg:'#0d2847',   prev:'linear-gradient(135deg,#0d2847 0%,#0a2040 100%)' },
    { id:'zen',          label:'Japanese Zen',      desc:'Calm minimalism',               cat:'minimal',     type:'css',    bg:'#f5f1e8',   prev:'linear-gradient(165deg,#f5f1e8 0%,#ede8dc 100%)' },
    { id:'nordic',       label:'Nordic Aurora',     desc:'Scandinavian winter',           cat:'atmospheric', type:'canvas', bg:'#0a1929',   prev:'linear-gradient(180deg,#0a1929 0%,#0d2240 100%)' },
    { id:'ocean',        label:'Ocean Depths',      desc:'Bioluminescent deep sea',       cat:'atmospheric', type:'canvas', bg:'#001528',   prev:'linear-gradient(180deg,#001528 0%,#002040 100%)' },
    { id:'matrix',       label:'Matrix Code Rain',  desc:'Cascading green code',          cat:'themed',      type:'canvas', bg:'#000',      prev:'linear-gradient(180deg,#000 0%,#001000 100%)' },
    { id:'space',        label:'Solar Flare Space',  desc:'Cosmic nebula drifting',       cat:'themed',      type:'canvas', bg:'#00000f',   prev:'linear-gradient(135deg,#00000f 0%,#050005 50%,#000010 100%)' },
    { id:'sakura',       label:'Sakura Dream',      desc:'Cherry blossom season',         cat:'themed',      type:'canvas', bg:'#1a0d1a',   prev:'linear-gradient(165deg,#1a0d1a 0%,#2a1525 60%,#1a0d1a 100%)' },
  ];

  // ─── CSS-variable definitions per theme ─────────────────────────────
  var VARS = {
    'mesh':         '--card-bg:rgba(20,20,30,0.60);--card-border:rgba(255,255,255,0.08);--card-glow:rgba(16,185,129,0.22);--card-text:rgba(255,255,255,0.95);--card-radius:16px;--card-blur:12px;--card-shadow:none;',
    'aurora':       '--card-bg:rgba(15,25,40,0.55);--card-border:rgba(168,85,247,0.22);--card-glow:rgba(168,85,247,0.35);--card-text:rgba(220,230,255,0.95);--card-radius:16px;--card-blur:14px;--card-shadow:none;',
    'liquid-metal': '--card-bg:rgba(40,40,44,0.55);--card-border:rgba(192,192,192,0.30);--card-glow:rgba(255,255,255,0.35);--card-text:rgba(255,255,255,0.95);--card-radius:12px;--card-blur:10px;--card-shadow:none;',
    'brutalist':    '--card-bg:rgba(40,40,40,0.92);--card-border:rgba(255,255,255,0.18);--card-glow:transparent;--card-text:#fff;--card-radius:4px;--card-blur:0px;--card-shadow:4px 4px 0 rgba(239,68,68,0.7);',
    'volcanic':     '--card-bg:rgba(28,4,4,0.88);--card-border:rgba(255,80,0,0.40);--card-glow:rgba(255,120,0,0.45);--card-text:rgba(255,240,230,0.95);--card-radius:10px;--card-blur:8px;--card-shadow:none;',
    'cyberpunk':    '--card-bg:rgba(0,0,0,0.88);--card-border:rgba(0,255,255,0.45);--card-glow:rgba(255,0,255,0.45);--card-text:#00ffff;--card-radius:6px;--card-blur:0px;--card-shadow:0 0 18px rgba(255,0,255,0.30);',
    'synthwave':    '--card-bg:rgba(26,0,50,0.75);--card-border:rgba(255,0,255,0.50);--card-glow:rgba(0,255,255,0.45);--card-text:#00ffff;--card-radius:8px;--card-blur:8px;--card-shadow:0 0 20px rgba(255,0,255,0.35);',
    'topographic':  '--card-bg:rgba(10,20,30,0.72);--card-border:rgba(255,255,255,0.18);--card-glow:rgba(200,220,255,0.20);--card-text:rgba(245,235,220,0.95);--card-radius:12px;--card-blur:10px;--card-shadow:none;',
    'blueprint':    '--card-bg:rgba(13,40,71,0.82);--card-border:rgba(255,255,255,0.42);--card-glow:rgba(255,255,255,0.22);--card-text:#fff;--card-radius:6px;--card-blur:0px;--card-shadow:none;',
    'zen':          '--card-bg:rgba(255,250,240,0.92);--card-border:rgba(180,160,140,0.35);--card-glow:rgba(100,100,200,0.12);--card-text:#3a2818;--card-radius:22px;--card-blur:0px;--card-shadow:0 4px 24px rgba(0,0,0,0.06);',
    'nordic':       '--card-bg:rgba(12,28,48,0.72);--card-border:rgba(100,200,255,0.22);--card-glow:rgba(150,220,255,0.30);--card-text:rgba(220,235,250,0.95);--card-radius:14px;--card-blur:12px;--card-shadow:none;',
    'ocean':        '--card-bg:rgba(4,20,40,0.72);--card-border:rgba(0,200,255,0.22);--card-glow:rgba(0,220,255,0.30);--card-text:rgba(200,240,255,0.95);--card-radius:16px;--card-blur:12px;--card-shadow:none;',
    'matrix':       '--card-bg:rgba(0,8,0,0.92);--card-border:rgba(0,255,0,0.35);--card-glow:rgba(0,255,0,0.40);--card-text:#00ff00;--card-radius:4px;--card-blur:0px;--card-shadow:0 0 12px rgba(0,255,0,0.25);',
    'space':        '--card-bg:rgba(0,0,12,0.88);--card-border:rgba(255,200,100,0.22);--card-glow:rgba(255,220,100,0.38);--card-text:rgba(255,250,240,0.95);--card-radius:14px;--card-blur:10px;--card-shadow:none;',
    'sakura':       '--card-bg:rgba(36,18,28,0.65);--card-border:rgba(255,192,203,0.32);--card-glow:rgba(255,182,193,0.40);--card-text:rgba(255,230,240,0.95);--card-radius:18px;--card-blur:14px;--card-shadow:none;',
  };

  // ─── CSS background definitions (CSS-type themes) ───────────────────
  var CSS_BG = {

    'mesh': {
      body: '#0a0a0a',
      css: `
@keyframes mesh-float-a { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-40px,60px) scale(1.08)} 66%{transform:translate(50px,-30px) scale(0.95)} }
@keyframes mesh-float-b { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(50px,-40px) scale(1.1)} 66%{transform:translate(-35px,50px) scale(0.92)} }
@keyframes mesh-float-c { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-45px,-55px) scale(1.06)} }
@keyframes mesh-float-d { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(60px,40px) scale(1.04)} }
#theme-bg-layer { background:#0a0a0a; }
#theme-bg-layer::before {
  content:'';position:absolute;inset:0;
  background:
    radial-gradient(ellipse 700px 600px at 20% 20%, rgba(16,185,129,0.22), transparent 55%),
    radial-gradient(ellipse 650px 550px at 80% 15%, rgba(59,130,246,0.20), transparent 55%),
    radial-gradient(ellipse 600px 600px at 75% 80%, rgba(168,85,247,0.18), transparent 55%),
    radial-gradient(ellipse 550px 500px at 15% 75%, rgba(236,72,153,0.16), transparent 55%);
  animation: mesh-float-a 20s ease-in-out infinite;
  filter:blur(80px);
}
#theme-bg-layer::after {
  content:'';position:absolute;inset:0;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat:repeat;background-size:200px;opacity:0.03;
}`,
    },

    'liquid-metal': {
      body: '#111',
      css: `
@keyframes lm-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
#theme-bg-layer {
  background: linear-gradient(135deg,#111,#2a2a2a,#1a1a1a,#333,#1c1c1c,#111);
  background-size:400% 400%;
  animation:lm-shift 12s ease infinite;
}
#theme-bg-layer::before {
  content:'';position:absolute;inset:0;
  background: repeating-linear-gradient(
    105deg, transparent 0px, transparent 1px,
    rgba(255,255,255,0.03) 1px, rgba(255,255,255,0.03) 2px
  );
}
#theme-bg-layer::after {
  content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,255,255,0.06), transparent 70%);
  animation:lm-shift 8s ease infinite reverse;
}`,
    },

    'brutalist': {
      body: '#161616',
      css: `
#theme-bg-layer {
  background: #161616;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size:40px 40px;
}
#theme-bg-layer::before {
  content:'';position:absolute;left:0;top:0;width:100%;height:100%;
  background:
    linear-gradient(0deg,transparent 0%,rgba(239,68,68,0.08) 1px,transparent 1px) 0 0 / 1px 80px,
    linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.05) 1px,transparent 1px) 0 0 / 80px 1px;
}
#theme-bg-layer::after {
  content:'';position:absolute;top:0;right:0;width:40%;height:8px;
  background:rgba(239,68,68,0.7);
  box-shadow:0 0 40px 4px rgba(239,68,68,0.35);
}`,
    },

    'cyberpunk': {
      body: '#000',
      css: `
@keyframes cp-glitch-h { 0%,95%,100%{transform:none;opacity:1} 96%{transform:translateX(-4px) skewX(-5deg);opacity:0.85} 98%{transform:translateX(4px) skewX(3deg);opacity:0.9} }
@keyframes cp-scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
#theme-bg-layer { background:#000; }
#theme-bg-layer::before {
  content:'';position:absolute;inset:0;
  background:
    repeating-linear-gradient(0deg, rgba(0,255,255,0.015) 0px, rgba(0,255,255,0.015) 1px, transparent 1px, transparent 4px),
    radial-gradient(ellipse 500px 400px at 10% 40%, rgba(255,0,255,0.12), transparent 55%),
    radial-gradient(ellipse 400px 350px at 85% 60%, rgba(0,255,255,0.10), transparent 55%),
    radial-gradient(ellipse 300px 250px at 50% 20%, rgba(0,255,255,0.06), transparent 55%);
}
#theme-bg-layer::after {
  content:'';position:absolute;left:0;top:0;width:100%;height:3px;
  background:linear-gradient(90deg,transparent,rgba(0,255,255,0.5),transparent);
  animation:cp-scan 5s linear infinite;
  pointer-events:none;
}`,
    },

    'synthwave': {
      body: '#1a0033',
      css: `
@keyframes sw-star { 0%,100%{opacity:0.6} 50%{opacity:1} }
@keyframes sw-glow { 0%,100%{opacity:0.7} 50%{opacity:1} }
#theme-bg-layer {
  background:linear-gradient(180deg,#1a0033 0%,#2a004a 45%,#1a0066 70%,#000 100%);
}
#theme-bg-layer::before {
  content:'';position:absolute;inset:0;
  background:
    linear-gradient(180deg,transparent 55%,rgba(255,0,255,0.12) 70%,rgba(255,0,255,0.04) 100%),
    repeating-linear-gradient(90deg,rgba(255,0,255,0.18) 0px,rgba(255,0,255,0.18) 1px,transparent 1px,transparent 40px),
    repeating-linear-gradient(0deg,rgba(255,0,255,0.10) 0px,rgba(255,0,255,0.10) 1px,transparent 1px,transparent 40px);
  background-position:0 56%, 0 56%, 0 56%;
  background-size:100% 100%, 40px 100%, 100% 40px;
  perspective:400px;
  transform:perspective(300px) rotateX(30deg);
  transform-origin:50% 100%;
}
#theme-bg-layer::after {
  content:'';position:absolute;left:50%;top:35%;transform:translateX(-50%);
  width:380px;height:190px;border-radius:50%;
  background:linear-gradient(180deg,#ff6600,#ff0044,transparent);
  filter:blur(2px);
  opacity:0.85;
  animation:sw-glow 4s ease-in-out infinite;
}`,
    },

    'blueprint': {
      body: '#0d2847',
      css: `
#theme-bg-layer {
  background:#0d2847;
  background-image:
    linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
  background-size:30px 30px;
}
#theme-bg-layer::before {
  content:'';position:absolute;inset:0;
  background-image:
    linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px);
  background-size:150px 150px;
}
#theme-bg-layer::after {
  content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 60% 60% at 20% 80%, rgba(255,255,255,0.04), transparent 60%);
}`,
    },

    'zen': {
      body: '#f5f1e8',
      css: `
@keyframes zen-petal { 0%{transform:translateX(0) translateY(-10%) rotate(-15deg);opacity:0} 10%{opacity:0.7} 80%{opacity:0.4} 100%{transform:translateX(60px) translateY(110vh) rotate(200deg);opacity:0} }
#theme-bg-layer { background:linear-gradient(165deg,#f5f1e8,#ede8dc,#f0eadd); }
#theme-bg-layer::before {
  content:'';position:absolute;inset:0;
  background:
    repeating-linear-gradient(
      -45deg, transparent 0, transparent 18px,
      rgba(180,155,120,0.07) 18px, rgba(180,155,120,0.07) 19px
    );
}
#theme-bg-layer::after {
  content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 50% 80% at 80% 50%, rgba(100,80,180,0.05), transparent 55%);
}`,
    },
  };

  // ─── Card override CSS (injected once) ──────────────────────────────
  var CARD_CSS = `
.tile, .gm-card, .wt-card, .card, .po-card,
.stack-card, .entry-card, .stat-card, .habit-card,
.modal > .modal, .modal-bg > .modal,
.journal-entry, .finance-card, .water-card {
  background: var(--card-bg, rgba(255,255,255,0.04)) !important;
  border-color: var(--card-border, rgba(255,255,255,0.07)) !important;
  color: var(--card-text, inherit) !important;
  border-radius: var(--card-radius, 16px) !important;
  box-shadow: var(--card-shadow, none) !important;
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.18s ease !important;
}
.tile:hover, .gm-card:hover, .wt-card:hover, .card:hover {
  box-shadow: 0 0 28px var(--card-glow, transparent), var(--card-shadow, none) !important;
  border-color: var(--card-glow, rgba(255,255,255,0.12)) !important;
  transform: translateY(-2px) !important;
}
`;

  // ─── Canvas renderers ────────────────────────────────────────────────

  // ── Aurora ──
  function initAurora() {
    var W = window.innerWidth, H = window.innerHeight;
    S = {
      W: W, H: H, t: 0,
      stars: Array.from({length:40},function(){return{x:Math.random()*W,y:Math.random()*H*0.6,r:Math.random()*1.3+0.2,ph:Math.random()*6.28,sp:Math.random()*0.02+0.005};} ),
      bands: [
        {r:100,g:60,b:255,  r2:0,  g2:200,b2:255, ph:0,    spd:0.0025, yf:0.30, amp:0.09, frq:0.65},
        {r:200,g:0, b:255,  r2:0,  g2:220,b2:220, ph:1.3,  spd:0.002,  yf:0.22, amp:0.07, frq:0.85},
        {r:0,  g:180,b:255, r2:255,g2:60,  b2:200, ph:2.6,  spd:0.003,  yf:0.38, amp:0.06, frq:0.55},
      ],
    };
    if (cx) { cx.fillStyle='#050515'; cx.fillRect(0,0,W,H); }
  }
  function drawAurora() {
    var W=S.W,H=S.H; S.t+=0.016;
    var g=cx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#020310'); g.addColorStop(0.5,'#050520'); g.addColorStop(1,'#030215');
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
    // Stars
    S.stars.forEach(function(s){
      var b=0.3+0.7*Math.sin(S.t*s.sp*60+s.ph);
      cx.beginPath(); cx.arc(s.x,s.y,s.r,0,6.28);
      cx.fillStyle='rgba(255,255,255,'+( b*0.85).toFixed(2)+')'; cx.fill();
    });
    // Bands
    S.bands.forEach(function(b){ b.ph+=b.spd; drawAuroraBand(b,W,H); });
  }
  function drawAuroraBand(b,W,H) {
    var steps=60, pts=[];
    for(var i=0;i<=steps;i++){
      var t=i/steps;
      pts.push({
        x:t*W,
        y:b.yf*H + Math.sin(i*b.frq*0.09+b.ph)*b.amp*H + Math.sin(i*b.frq*0.17+b.ph*1.4)*b.amp*0.35*H,
      });
    }
    var grd=cx.createLinearGradient(0,0,W,0);
    grd.addColorStop(0,   'rgba('+b.r+','+b.g+','+b.b+',0)');
    grd.addColorStop(0.25,'rgba('+b.r+','+b.g+','+b.b+',0.32)');
    grd.addColorStop(0.6, 'rgba('+b.r2+','+b.g2+','+b.b2+',0.28)');
    grd.addColorStop(1,   'rgba('+b.r2+','+b.g2+','+b.b2+',0)');
    var bH=H*0.06;
    cx.beginPath();
    cx.moveTo(pts[0].x,pts[0].y-bH);
    for(var i=1;i<pts.length;i++) cx.lineTo(pts[i].x,pts[i].y-bH);
    for(var i=pts.length-1;i>=0;i--) cx.lineTo(pts[i].x,pts[i].y+bH*2.5);
    cx.closePath();
    cx.fillStyle=grd; cx.fill();
  }

  // ── Volcanic ──
  function initVolcanic() {
    var W=window.innerWidth,H=window.innerHeight;
    S={W:W,H:H,t:0,
      blobs:Array.from({length:6},function(){return{x:Math.random()*W,y:H*0.4+Math.random()*H*0.6,r:60+Math.random()*120,ph:Math.random()*6.28,spd:0.004+Math.random()*0.006};}),
      embers:Array.from({length:35},function(){return makeEmber(W,H);}),
    };
  }
  function makeEmber(W,H){return{x:W*0.3+Math.random()*W*0.4,y:H+Math.random()*40,r:1+Math.random()*2.5,vx:(Math.random()-0.5)*0.8,vy:-(0.4+Math.random()*1.0),life:0,maxLife:200+Math.random()*200,ph:Math.random()*6.28};}
  function drawVolcanic() {
    var W=S.W,H=S.H; S.t+=0.016;
    var g=cx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#0d0000'); g.addColorStop(0.5,'#1a0200'); g.addColorStop(1,'#0a0000');
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
    // Lava blobs
    cx.globalCompositeOperation='screen';
    S.blobs.forEach(function(b){
      b.ph+=b.spd; b.x+=Math.sin(b.ph*0.7)*0.5;
      var bx=b.x+Math.sin(b.ph)*30, by=b.y+Math.cos(b.ph*0.8)*20;
      var gr=cx.createRadialGradient(bx,by,0,bx,by,b.r);
      var pulse=0.5+0.5*Math.sin(b.ph*1.5);
      gr.addColorStop(0,'rgba(255,'+(60+pulse*80|0)+',0,'+(0.18+pulse*0.08).toFixed(2)+')');
      gr.addColorStop(0.5,'rgba(200,20,0,0.10)'); gr.addColorStop(1,'transparent');
      cx.fillStyle=gr; cx.beginPath(); cx.arc(bx,by,b.r,0,6.28); cx.fill();
    });
    cx.globalCompositeOperation='source-over';
    // Embers
    S.embers.forEach(function(e,i){
      e.x+=e.vx; e.y+=e.vy; e.vx+=( Math.random()-0.5)*0.08; e.life++;
      var prog=e.life/e.maxLife, fade=prog<0.1?prog*10:(prog>0.8?(1-prog)*5:1);
      cx.beginPath(); cx.arc(e.x,e.y,e.r*fade,0,6.28);
      cx.fillStyle='rgba(255,'+(80+Math.sin(e.ph+S.t*3)*40|0)+',0,'+( fade*0.85).toFixed(2)+')';
      cx.fill();
      if(e.life>=e.maxLife||e.y<-20) S.embers[i]=makeEmber(S.W,S.H);
    });
  }

  // ── Topographic ──
  function initTopographic() {
    S={W:window.innerWidth,H:window.innerHeight,t:0};
  }
  function drawTopographic() {
    var W=S.W,H=S.H; S.t+=0.002;
    cx.fillStyle='#0a141e'; cx.fillRect(0,0,W,H);
    cx.strokeStyle='rgba(200,220,255,0.10)'; cx.lineWidth=1;
    var lines=18, step=H/(lines+1);
    for(var l=0;l<lines;l++){
      var baseY=(l+1)*step;
      cx.beginPath();
      for(var x=0;x<=W;x+=4){
        var y=baseY
          + Math.sin(x*0.008+S.t+l*0.7)*22
          + Math.sin(x*0.015-S.t*1.3+l*0.4)*12
          + Math.sin(x*0.03+S.t*0.7+l*1.1)*7;
        if(x===0) cx.moveTo(x,y); else cx.lineTo(x,y);
      }
      cx.stroke();
    }
    // Occasional accent lines
    cx.strokeStyle='rgba(100,180,255,0.18)'; cx.lineWidth=1.5;
    for(var l=2;l<lines;l+=5){
      var baseY=(l+1)*step;
      cx.beginPath();
      for(var x=0;x<=W;x+=4){
        var y=baseY
          + Math.sin(x*0.008+S.t+l*0.7)*22
          + Math.sin(x*0.015-S.t*1.3+l*0.4)*12
          + Math.sin(x*0.03+S.t*0.7+l*1.1)*7;
        if(x===0) cx.moveTo(x,y); else cx.lineTo(x,y);
      }
      cx.stroke();
    }
  }

  // ── Nordic ──
  function initNordic() {
    var W=window.innerWidth,H=window.innerHeight;
    S={W:W,H:H,t:0,
      snow:Array.from({length:120},function(){return makeSnow(W,H,true);}),
      bands:[
        {r:0,g:220,b:100,  r2:0,g2:120,b2:255, ph:0,   spd:0.0020,yf:0.28,amp:0.07,frq:0.60},
        {r:80,g:0,b:200,   r2:0,g2:200,b2:200, ph:1.8, spd:0.0015,yf:0.18,amp:0.05,frq:0.80},
      ],
    };
  }
  function makeSnow(W,H,initial){return{x:Math.random()*W,y:initial?Math.random()*H:-10,r:0.5+Math.random()*1.8,vx:(Math.random()-0.5)*0.5,vy:0.3+Math.random()*0.8,ph:Math.random()*6.28};}
  function drawNordic() {
    var W=S.W,H=S.H; S.t+=0.016;
    var g=cx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#0a1929'); g.addColorStop(0.6,'#0d2240'); g.addColorStop(1,'#0a1520');
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
    // Stars (faint)
    for(var i=0;i<60;i++){
      var sx=((i*137.508)%1)*W, sy=((i*73.1)%0.55)*H;
      var sb=0.2+0.3*Math.sin(S.t*0.8+i);
      cx.beginPath(); cx.arc(sx,sy,0.6,0,6.28);
      cx.fillStyle='rgba(255,255,255,'+sb.toFixed(2)+')'; cx.fill();
    }
    // Aurora bands
    S.bands.forEach(function(b){ b.ph+=b.spd; drawAuroraBand(b,W,H); });
    // Pine silhouette (bottom)
    drawPines(W,H);
    // Snow
    S.snow.forEach(function(s,i){
      s.x+=s.vx+Math.sin(S.t*0.5+s.ph)*0.3; s.y+=s.vy;
      cx.beginPath(); cx.arc(s.x,s.y,s.r,0,6.28);
      cx.fillStyle='rgba(220,235,255,0.75)'; cx.fill();
      if(s.y>H+10) S.snow[i]=makeSnow(S.W,S.H,false);
    });
  }
  function drawPines(W,H) {
    cx.fillStyle='#050f18';
    var tree=function(x,h){
      cx.beginPath(); cx.moveTo(x,H);
      cx.lineTo(x-h*0.25,H-h*0.5);
      cx.lineTo(x-h*0.15,H-h*0.5);
      cx.lineTo(x-h*0.35,H-h*0.85);
      cx.lineTo(x-h*0.12,H-h*0.85);
      cx.lineTo(x,H-h);
      cx.lineTo(x+h*0.12,H-h*0.85);
      cx.lineTo(x+h*0.35,H-h*0.85);
      cx.lineTo(x+h*0.15,H-h*0.5);
      cx.lineTo(x+h*0.25,H-h*0.5);
      cx.closePath(); cx.fill();
    };
    var trees=[
      [W*0.04,70],[W*0.09,90],[W*0.15,65],[W*0.21,100],[W*0.28,75],
      [W*0.34,55],[W*0.40,85],[W*0.47,110],[W*0.54,70],[W*0.60,95],
      [W*0.66,60],[W*0.72,80],[W*0.79,100],[W*0.85,65],[W*0.91,88],[W*0.97,72],
    ];
    trees.forEach(function(t){ tree(t[0],t[1]); });
  }

  // ── Ocean ──
  function initOcean() {
    var W=window.innerWidth,H=window.innerHeight;
    S={W:W,H:H,t:0,
      bubbles:Array.from({length:55},function(){return makeBubble(W,H,true);}),
      caustics:Array.from({length:8},function(){ return{x:Math.random()*W,y:Math.random()*H,r:40+Math.random()*80,ph:Math.random()*6.28,sp:0.02+Math.random()*0.03}; }),
      particles:Array.from({length:25},function(){return{x:Math.random()*W,y:Math.random()*H,r:1+Math.random()*2,ph:Math.random()*6.28,sp:0.01+Math.random()*0.02,vy:-0.1-Math.random()*0.2};} ),
    };
  }
  function makeBubble(W,H,initial){return{x:Math.random()*W,y:initial?Math.random()*H:H+10,r:1+Math.random()*4,vy:-(0.2+Math.random()*0.6),vx:(Math.random()-0.5)*0.3,ph:Math.random()*6.28};}
  function drawOcean() {
    var W=S.W,H=S.H; S.t+=0.016;
    var g=cx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#001528'); g.addColorStop(0.5,'#002040'); g.addColorStop(1,'#001228');
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
    // Caustic light patterns
    S.caustics.forEach(function(c){
      c.ph+=c.sp; c.x+=Math.sin(c.ph*0.7)*0.3;
      var cr=cx.createRadialGradient(c.x,c.y,0,c.x,c.y,c.r);
      cr.addColorStop(0,'rgba(0,220,255,0.07)'); cr.addColorStop(1,'transparent');
      cx.fillStyle=cr; cx.beginPath(); cx.arc(c.x,c.y,c.r,0,6.28); cx.fill();
    });
    // Bioluminescent particles
    S.particles.forEach(function(p){
      p.ph+=p.sp; p.y+=p.vy; p.x+=Math.sin(p.ph)*0.4;
      if(p.y<-5){ p.y=H+5; p.x=Math.random()*W; }
      var glow=0.3+0.5*Math.sin(p.ph*3);
      cx.beginPath(); cx.arc(p.x,p.y,p.r*(0.7+glow*0.3),0,6.28);
      cx.fillStyle='rgba(0,255,200,'+(glow*0.5).toFixed(2)+')'; cx.fill();
    });
    // Bubbles
    S.bubbles.forEach(function(b,i){
      b.x+=b.vx+Math.sin(S.t*0.5+b.ph)*0.2; b.y+=b.vy;
      cx.beginPath(); cx.arc(b.x,b.y,b.r,0,6.28);
      cx.strokeStyle='rgba(100,200,255,0.30)'; cx.lineWidth=0.8; cx.stroke();
      if(b.y<-10) S.bubbles[i]=makeBubble(S.W,S.H,false);
    });
  }

  // ── Matrix ──
  var KATAKANA='ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ01';
  function initMatrix() {
    var W=window.innerWidth,H=window.innerHeight;
    var cols=Math.ceil(W/16);
    var drops=Array.from({length:cols},function(){return Math.random()*-(H/16);});
    S={W:W,H:H,cols:cols,drops:drops};
    if(cx){ cx.fillStyle='#000'; cx.fillRect(0,0,W,H); }
  }
  function drawMatrix() {
    var W=S.W,H=S.H;
    cx.fillStyle='rgba(0,0,0,0.055)'; cx.fillRect(0,0,W,H);
    cx.font='13px ui-monospace,"SF Mono",Menlo,monospace'; cx.textAlign='left';
    for(var i=0;i<S.cols;i++){
      var ch=KATAKANA[Math.random()*KATAKANA.length|0];
      var x=i*16, y=S.drops[i]*16;
      cx.fillStyle='#cfffcf'; cx.fillText(ch,x,y);
      cx.fillStyle='#00FF41'; cx.fillText(KATAKANA[Math.random()*KATAKANA.length|0],x,y-16);
      if(y>H&&Math.random()>0.975) S.drops[i]=0;
      S.drops[i]+=0.5;
    }
  }

  // ── Space ──
  function initSpace() {
    var W=window.innerWidth,H=window.innerHeight;
    S={W:W,H:H,t:0,
      stars:Array.from({length:200},function(){return{x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+0.2,ph:Math.random()*6.28,sp:Math.random()*0.01+0.002};}),
      nebulas:[
        {x:W*0.15,y:H*0.25,rx:180,ry:120,r:180,g:60,b:255,a:0.12,ph:0,sp:0.003},
        {x:W*0.75,y:H*0.60,rx:220,ry:140,r:255,g:80,b:180,a:0.10,ph:1.5,sp:0.002},
        {x:W*0.50,y:H*0.40,rx:150,ry:100,r:60,g:160,b:255,a:0.09,ph:3.1,sp:0.0025},
      ],
      flare:{x:W*0.88,y:H*0.12,r:80,ph:0},
    };
  }
  function drawSpace() {
    var W=S.W,H=S.H; S.t+=0.016;
    cx.fillStyle='#00000f'; cx.fillRect(0,0,W,H);
    // Stars
    S.stars.forEach(function(s){
      var b=0.2+0.8*Math.sin(S.t*s.sp*60+s.ph);
      cx.beginPath(); cx.arc(s.x,s.y,s.r,0,6.28);
      cx.fillStyle='rgba(255,255,255,'+(b*0.85).toFixed(2)+')'; cx.fill();
    });
    // Nebula clouds
    cx.globalCompositeOperation='screen';
    S.nebulas.forEach(function(n){
      n.ph+=n.sp; n.x+=Math.sin(n.ph)*0.2;
      var pulsea=n.a*(0.8+0.2*Math.sin(n.ph*2));
      var gr=cx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.rx);
      gr.addColorStop(0,'rgba('+n.r+','+n.g+','+n.b+','+pulsea.toFixed(2)+')');
      gr.addColorStop(1,'transparent');
      cx.save(); cx.scale(1,n.ry/n.rx);
      cx.beginPath(); cx.arc(n.x,n.y*n.rx/n.ry,n.rx,0,6.28);
      cx.fillStyle=gr; cx.fill(); cx.restore();
    });
    cx.globalCompositeOperation='source-over';
    // Solar flare
    var f=S.flare; f.ph+=0.01;
    var pulse=0.6+0.4*Math.sin(f.ph*2);
    var fg=cx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*(1+pulse*0.3));
    fg.addColorStop(0,'rgba(255,220,80,'+(0.9*pulse).toFixed(2)+')');
    fg.addColorStop(0.3,'rgba(255,140,20,'+(0.5*pulse).toFixed(2)+')');
    fg.addColorStop(1,'transparent');
    cx.fillStyle=fg; cx.beginPath(); cx.arc(f.x,f.y,f.r*1.4,0,6.28); cx.fill();
    // Flare rays
    for(var i=0;i<8;i++){
      var angle=f.ph+i*(6.28/8);
      var len=40+20*Math.sin(f.ph*3+i);
      cx.save(); cx.translate(f.x,f.y); cx.rotate(angle);
      cx.beginPath(); cx.moveTo(f.r*0.5,0); cx.lineTo(f.r*0.5+len,0);
      cx.strokeStyle='rgba(255,220,100,'+(0.25*pulse).toFixed(2)+')';
      cx.lineWidth=2; cx.stroke(); cx.restore();
    }
  }

  // ── Sakura ──
  function initSakura() {
    var W=window.innerWidth,H=window.innerHeight;
    S={W:W,H:H,t:0,
      petals:Array.from({length:50},function(){return makePetal(W,H,true);}),
    };
  }
  function makePetal(W,H,initial){
    return{
      x:Math.random()*W, y:initial?Math.random()*H:-20,
      r:3+Math.random()*5, rot:Math.random()*6.28, rotv:(Math.random()-0.5)*0.04,
      vy:0.4+Math.random()*0.8, vx:(Math.random()-0.5)*0.6,
      ph:Math.random()*6.28, life:0,
      hue:340+Math.random()*20,
    };
  }
  function drawSakura() {
    var W=S.W,H=S.H; S.t+=0.016;
    var g=cx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#1a0d1a'); g.addColorStop(0.4,'#2a1525'); g.addColorStop(1,'#1a0d1a');
    cx.fillStyle=g; cx.fillRect(0,0,W,H);
    // Stars
    for(var i=0;i<60;i++){
      var sx=((i*137.5)%1)*W, sy=((i*89.3)%0.7)*H;
      cx.beginPath(); cx.arc(sx,sy,0.5,0,6.28);
      cx.fillStyle='rgba(255,220,230,0.3)'; cx.fill();
    }
    // Fuji silhouette
    cx.beginPath();
    cx.moveTo(0,H);
    cx.lineTo(W*0.20,H);
    cx.lineTo(W*0.50,H*0.38);
    cx.lineTo(W*0.80,H);
    cx.lineTo(W,H);
    cx.fillStyle='rgba(12,5,12,0.60)'; cx.fill();
    // Pagoda silhouette (right area)
    drawPagoda(W*0.80,H*0.70,50);
    // Blossoms glow
    var bg=cx.createRadialGradient(W*0.5,H*0.38,0,W*0.5,H*0.38,W*0.4);
    bg.addColorStop(0,'rgba(255,180,200,0.08)'); bg.addColorStop(1,'transparent');
    cx.fillStyle=bg; cx.fillRect(0,0,W,H);
    // Petals
    S.petals.forEach(function(p,i){
      p.x+=p.vx+Math.sin(S.t*0.4+p.ph)*0.6;
      p.y+=p.vy; p.rot+=p.rotv; p.life++;
      drawPetal(p);
      if(p.y>H+20) S.petals[i]=makePetal(S.W,S.H,false);
    });
  }
  function drawPetal(p) {
    cx.save(); cx.translate(p.x,p.y); cx.rotate(p.rot);
    cx.beginPath();
    cx.ellipse(0,0,p.r,p.r*0.55,0,0,6.28);
    cx.fillStyle='rgba(255,'+(160+Math.random()*30|0)+','+(180+Math.random()*30|0)+',0.55)';
    cx.fill();
    cx.restore();
  }
  function drawPagoda(px,py,size) {
    cx.fillStyle='rgba(20,5,15,0.55)';
    // 3-tiered pagoda
    var tiers=[1,0.75,0.5];
    tiers.forEach(function(s,i){
      var ty=py-i*size*0.5;
      var tw=size*s*1.2;
      cx.beginPath();
      cx.moveTo(px-tw,ty+size*s*0.2);
      cx.lineTo(px-tw*0.7,ty);
      cx.lineTo(px,ty-size*s*0.25);
      cx.lineTo(px+tw*0.7,ty);
      cx.lineTo(px+tw,ty+size*s*0.2);
      cx.closePath(); cx.fill();
    });
    // Spire
    cx.beginPath(); cx.moveTo(px,py-size*1.5); cx.lineTo(px-3,py-size*1.15); cx.lineTo(px+3,py-size*1.15); cx.closePath(); cx.fill();
  }

  // ─── CSS themes: background injection ───────────────────────────────

  function getBgEl() {
    var el=document.getElementById('theme-bg-layer');
    if(!el){
      el=document.createElement('div');
      el.id='theme-bg-layer';
      el.style.cssText='position:fixed;inset:0;z-index:-3;pointer-events:none;overflow:hidden;';
      el.innerHTML=''; // will use ::before and ::after from injected CSS
      document.body.insertBefore(el,document.body.firstChild);
    }
    return el;
  }

  function injectBgCSS(themeId) {
    var def=CSS_BG[themeId];
    // Inject or update background style
    var st=document.getElementById('theme-bg-css');
    if(!st){ st=document.createElement('style'); st.id='theme-bg-css'; document.head.appendChild(st); }
    if(def){
      st.textContent=def.css||'';
      document.body.style.background=def.body||'';
    } else {
      st.textContent='';
      var t=THEMES.find(function(x){return x.id===themeId;});
      document.body.style.background=t?t.bg:'#0a0a0a';
    }
    // Override page body::before/after for clean slate
    var sup=document.getElementById('theme-sup-css');
    if(!sup){ sup=document.createElement('style'); sup.id='theme-sup-css'; document.head.appendChild(sup); }
    sup.textContent='body::before,body::after{display:none!important;animation:none!important;}';
  }

  function injectVars(themeId) {
    var v=VARS[themeId]||VARS['mesh'];
    var st=document.getElementById('theme-vars-css');
    if(!st){ st=document.createElement('style'); st.id='theme-vars-css'; document.head.appendChild(st); }
    st.textContent=':root{'+v+'}';
  }

  function injectCardOverrides() {
    if(document.getElementById('theme-card-css')) return;
    var st=document.createElement('style'); st.id='theme-card-css';
    st.textContent=CARD_CSS;
    document.head.appendChild(st);
  }

  function removeThemeSup() {
    var sup=document.getElementById('theme-sup-css');
    if(sup) sup.textContent='';
    document.body.style.background='';
  }

  // ─── Canvas helpers ──────────────────────────────────────────────────

  function sizeCanvas() {
    if(!cvs) return;
    var dpr=window.devicePixelRatio||1;
    cvs.width=window.innerWidth*dpr;
    cvs.height=window.innerHeight*dpr;
    cvs.style.width=window.innerWidth+'px';
    cvs.style.height=window.innerHeight+'px';
    cx.scale(dpr,dpr);
  }

  function getCanvas() {
    if(cvs) return;
    cvs=document.createElement('canvas');
    cvs.id='theme-canvas';
    cvs.style.cssText='position:fixed;inset:0;z-index:-2;pointer-events:none;';
    document.body.insertBefore(cvs,document.body.firstChild);
    cx=cvs.getContext('2d');
    sizeCanvas();
    window.addEventListener('resize',onResize);
  }

  function removeCanvas() {
    if(raf){ cancelAnimationFrame(raf); raf=null; }
    if(cvs){ cvs.remove(); cvs=null; cx=null; }
    window.removeEventListener('resize',onResize);
    S={};
  }

  function onResize() {
    sizeCanvas(); S={};
    if(cur) initForTheme(cur);
  }

  function initForTheme(id) {
    S={};
    if(id==='aurora')       initAurora();
    else if(id==='volcanic')     initVolcanic();
    else if(id==='topographic')  initTopographic();
    else if(id==='nordic')       initNordic();
    else if(id==='ocean')        initOcean();
    else if(id==='matrix')       initMatrix();
    else if(id==='space')        initSpace();
    else if(id==='sakura')       initSakura();
  }

  // ─── Animation loop ──────────────────────────────────────────────────
  function getInterval(id) { return id==='matrix'?50:33; }

  function loop(ts) {
    if(paused) return;
    raf=requestAnimationFrame(loop);
    if(ts-lastTs < getInterval(cur)) return;
    lastTs=ts;
    if(!cx||!cur) return;
    if(cur==='aurora')       drawAurora();
    else if(cur==='volcanic')     drawVolcanic();
    else if(cur==='topographic')  drawTopographic();
    else if(cur==='nordic')       drawNordic();
    else if(cur==='ocean')        drawOcean();
    else if(cur==='matrix')       drawMatrix();
    else if(cur==='space')        drawSpace();
    else if(cur==='sakura')       drawSakura();
  }

  // ─── Fade transition ─────────────────────────────────────────────────
  function fadeTransition(cb) {
    var overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;z-index:9999;background:#000;opacity:0;pointer-events:none;transition:opacity 0.15s ease;';
    document.body.appendChild(overlay);
    requestAnimationFrame(function(){
      overlay.style.opacity='0.5';
      setTimeout(function(){ cb(); setTimeout(function(){ overlay.style.opacity='0'; setTimeout(function(){ overlay.remove(); },180); },80); },160);
    });
  }

  // ─── Core apply ──────────────────────────────────────────────────────
  function apply(id, animated) {
    if(animated===undefined) animated=animOn;
    animOn=animated;
    cur=id||'mesh';
    savePref(cur,animOn);

    var def=THEMES.find(function(x){return x.id===cur;});
    var isCanvas=def&&def.type==='canvas';

    // Tear down previous
    removeCanvas();

    // "None" — restore default appearance
    if(cur==='none'){
      removeThemeSup();
      var bgEl2=document.getElementById('theme-bg-layer'); if(bgEl2) bgEl2.style.display='none';
      var vcss=document.getElementById('theme-vars-css'); if(vcss) vcss.textContent='';
      document.documentElement.removeAttribute('data-theme');
      syncPickerUI('none');
      return;
    }

    // Inject CSS variables + card overrides
    injectVars(cur);
    injectCardOverrides();

    if(isCanvas){
      // Canvas theme
      injectBgCSS(cur); // sets body bg + suppresses page ::before/::after
      getBgEl().style.display='none'; // hide CSS bg div if present
      getCanvas();
      initForTheme(cur);
      if(!animOn||reducedMotion){
        // One static frame
        if(cur==='aurora')       drawAurora();
        else if(cur==='volcanic')     drawVolcanic();
        else if(cur==='topographic')  drawTopographic();
        else if(cur==='nordic')       drawNordic();
        else if(cur==='ocean')        drawOcean();
        else if(cur==='matrix')       drawMatrix();
        else if(cur==='space')        drawSpace();
        else if(cur==='sakura')       drawSakura();
      } else {
        paused=false; lastTs=0;
        raf=requestAnimationFrame(loop);
      }
    } else {
      // CSS theme
      var bgEl=getBgEl();
      bgEl.style.display='';
      injectBgCSS(cur);
    }

    // Update data-theme attribute for any extra CSS hooks
    document.documentElement.setAttribute('data-theme',cur);
    syncPickerUI(cur);
  }

  function setAnim(on) {
    animOn=!!on;
    savePref(cur,animOn);
    if(!animOn||reducedMotion){
      paused=true;
      if(raf){ cancelAnimationFrame(raf); raf=null; }
    } else if(cur){
      var def=THEMES.find(function(x){return x.id===cur;});
      if(def&&def.type==='canvas'){
        paused=false; lastTs=0;
        raf=requestAnimationFrame(loop);
      }
    }
  }

  // ─── Picker UI sync ──────────────────────────────────────────────────
  function syncPickerUI(activeId) {
    document.querySelectorAll('.tp-tile').forEach(function(el){
      el.classList.toggle('tp-active',el.dataset.theme===activeId);
    });
    var animToggle=document.getElementById('animToggle');
    if(animToggle) animToggle.checked=animOn;
  }

  // ─── Visibility handling ──────────────────────────────────────────────
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){
      paused=true;
      if(raf){ cancelAnimationFrame(raf); raf=null; }
    } else if(animOn&&!reducedMotion){
      var def=cur&&THEMES.find(function(x){return x.id===cur;});
      if(def&&def.type==='canvas'){ paused=false; lastTs=0; raf=requestAnimationFrame(loop); }
    }
  });

  // ─── Public API ──────────────────────────────────────────────────────
  window.Themes={
    apply:function(id){ fadeTransition(function(){ apply(id,animOn); }); },
    applyInstant:apply,
    setAnim:setAnim,
    getTheme:function(){ return cur||'none'; },
    getAnimOn:function(){ return animOn; },
    list:THEMES,
    syncUI:syncPickerUI,
    META: THEMES,
  };

  // ─── Auto-apply on load ──────────────────────────────────────────────
  (function(){
    var p=readPref();
    if(p.anim!==undefined) animOn=p.anim;
    var id=p.id||null;
    if(!id) return;
    function boot(){ apply(id,animOn); }
    if(document.body) boot();
    else document.addEventListener('DOMContentLoaded',boot);
  })();

})();
