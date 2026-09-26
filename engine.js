/* Máquinas Locas de Chispa — motor de escenario y piezas (Matter.js 0.19) */
(function (global) {
  'use strict';
  var M = global.Matter;
  var Engine = M.Engine, Bodies = M.Bodies, Body = M.Body, Composite = M.Composite,
      Constraint = M.Constraint, Events = M.Events, Query = M.Query;

  var STEP = 1000 / 60;
  var TAU = Math.PI * 2;

  /* ---------------- colores del tema ---------------- */
  var C = {};
  function refreshColors() {
    var s = getComputedStyle(document.documentElement);
    ['sky1','sky2','hill1','hill2','grass','grass-d','dirt','dirt-d','ink','wood','wood-d','wood-l','oak','oak-d',
     'metal','metal-d','metal-l','brick','brick-d','red','red-d','blue','blue-d','orange','orange-d','green','green-d',
     'purple','purple-d','yellow','yellow-d','ivory','ivory-d','sun','cloud','grid','accent','night']
      .forEach(function (k) { C[k] = s.getPropertyValue('--' + k).trim() || '#888'; });
    C.dark = s.getPropertyValue('--night').trim() === '1';
  }

  /* ---------------- utilidades de dibujo ---------------- */
  function rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function shadowOn(c) { c.shadowColor = 'rgba(20,28,60,.30)'; c.shadowBlur = 8; c.shadowOffsetY = 4; }
  function shadowOff(c) { c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0; }
  function lg(c, x0, y0, x1, y1, a, b) { var g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  function at(c, body, fn) { c.save(); c.translate(body.position.x, body.position.y); c.rotate(body.angle); fn(); c.restore(); }
  function poly(c, verts) { c.beginPath(); c.moveTo(verts[0].x, verts[0].y); for (var i = 1; i < verts.length; i++) c.lineTo(verts[i].x, verts[i].y); c.closePath(); }

  function plank(c, w, h, top, bot, opts) {
    opts = opts || {};
    shadowOn(c); c.fillStyle = lg(c, 0, -h / 2, 0, h / 2, top, bot); rr(c, -w / 2, -h / 2, w, h, Math.min(6, h / 2)); c.fill(); shadowOff(c);
    c.save(); rr(c, -w / 2, -h / 2, w, h, Math.min(6, h / 2)); c.clip();
    c.strokeStyle = 'rgba(70,35,5,.28)'; c.lineWidth = 1.2;
    for (var i = 0; i < 3; i++) { var yy = -h / 2 + (h / 4) * (i + 1); c.beginPath(); c.moveTo(-w / 2, yy);
      for (var x = -w / 2; x <= w / 2; x += 18) c.lineTo(x, yy + Math.sin(x * 0.09 + i * 2) * 1.2); c.stroke(); }
    c.restore();
    c.strokeStyle = 'rgba(40,20,0,.35)'; c.lineWidth = 1.5; rr(c, -w / 2, -h / 2, w, h, Math.min(6, h / 2)); c.stroke();
    if (opts.nails !== false && w > 60) { c.fillStyle = C['metal-l']; [-w / 2 + 9, w / 2 - 9].forEach(function (nx) { c.beginPath(); c.arc(nx, 0, 2.4, 0, TAU); c.fill(); }); }
  }
  function metalFill(c, verts, top, bot) {
    var minY = 1e9, maxY = -1e9; verts.forEach(function (v) { minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); });
    c.fillStyle = lg(c, 0, minY, 0, maxY, top, bot); poly(c, verts); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 1.2; c.stroke();
  }
  function drawParts(c, body, top, bot, shadow) {
    var parts = body.parts.length > 1 ? body.parts.slice(1) : [body];
    if (shadow) shadowOn(c);
    parts.forEach(function (p) { metalFill(c, p.vertices, top, bot); });
    shadowOff(c);
  }
  function post(c, x, yTop, yBot, w) {
    if (yBot - yTop < 4) return;
    c.fillStyle = lg(c, x - w / 2, 0, x + w / 2, 0, C['wood-d'], C.wood); c.fillRect(x - w / 2, yTop, w, yBot - yTop);
    c.fillStyle = C['wood-d']; rr(c, x - w * 1.6, yBot - 6, w * 3.2, 6, 3); c.fill();
  }

  /* ---------------- registro de piezas ---------------- */
  var PIECES = {};
  var ORDER = [];
  function def(type, o) { o.type = type; PIECES[type] = o; ORDER.push(type); }

  var MARBLE_COLORS = [['#FF8A3D', '#C2410C'], ['#4DA3FF', '#1D4ED8'], ['#3FD69A', '#047857'], ['#C084FC', '#6D28D9'], ['#FF6B8B', '#BE123C']];

  def('canica', { name: 'Canica', cat: 'obj', role: 'mover', desc: 'Rueda y rebota. ¡La estrella de la máquina!',
    create: function (s, it) { var b = Bodies.circle(it.x, it.y, 14, { restitution: 0.25, friction: 0.012, frictionStatic: 0.03, frictionAir: 0.0006, density: 0.004 }); return { bodies: [b], main: b }; },
    draw: function (c, s, it, P) { var b = P.main, col = MARBLE_COLORS[(it.id || 0) % MARBLE_COLORS.length];
      at(c, b, function () { shadowOn(c); var g = c.createRadialGradient(-5, -5, 1, 0, 0, 14); g.addColorStop(0, '#fff'); g.addColorStop(0.3, col[0]); g.addColorStop(1, col[1]);
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fill(); shadowOff(c);
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 0, 8, 0.3, 2.3); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(-5, -6, 3, 0, TAU); c.fill(); }); } });

  def('bola', { name: 'Bola pesada', cat: 'obj', role: 'mover', desc: 'Muy pesada: empuja y hace bajar cosas.',
    create: function (s, it) { var b = Bodies.circle(it.x, it.y, 22, { restitution: 0.08, friction: 0.03, frictionStatic: 0.05, frictionAir: 0.0004, density: 0.012 }); return { bodies: [b], main: b }; },
    draw: function (c, s, it, P) { at(c, P.main, function () { shadowOn(c); var g = c.createRadialGradient(-7, -8, 2, 0, 0, 22); g.addColorStop(0, '#6B7A99'); g.addColorStop(1, '#161B2E');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 22, 0, TAU); c.fill(); shadowOff(c);
      c.fillStyle = '#0A0D18'; [[-6, -8], [2, -10], [-1, -2]].forEach(function (h) { c.beginPath(); c.arc(h[0], h[1], 2.8, 0, TAU); c.fill(); }); }); } });

  def('domino', { name: 'Dominó', cat: 'obj', role: 'domino', settle: true, desc: 'Cae y empuja al siguiente: reacción en cadena.',
    create: function (s, it) { var b = Bodies.rectangle(it.x, it.y, 14, 64, { density: 0.0022, friction: 0.35, frictionStatic: 0.6, frictionAir: 0.0005, restitution: 0.05, slop: 0.02, chamfer: { radius: 2 } }); return { bodies: [b], main: b }; },
    draw: function (c, s, it, P) { at(c, P.main, function () { shadowOn(c); c.fillStyle = lg(c, -7, 0, 7, 0, C.ivory, C['ivory-d']); rr(c, -7, -32, 14, 64, 3); c.fill(); shadowOff(c);
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.2; rr(c, -7, -32, 14, 64, 3); c.stroke(); c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.stroke();
      c.fillStyle = '#1B1F33'; [[-3, -24], [0, -16], [3, -8], [-3, 10], [3, 22]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 1.9, 0, TAU); c.fill(); }); }); } });

  def('caja', { name: 'Caja', cat: 'obj', role: 'mover', settle: true, desc: 'Un peso que puedes empujar o dejar caer.',
    create: function (s, it) { var b = Bodies.rectangle(it.x, it.y, 44, 44, { density: 0.002, friction: 0.5, frictionStatic: 0.7, chamfer: { radius: 3 } }); return { bodies: [b], main: b }; },
    draw: function (c, s, it, P) { at(c, P.main, function () { shadowOn(c); c.fillStyle = lg(c, 0, -22, 0, 22, C.wood, C['wood-d']); rr(c, -22, -22, 44, 44, 4); c.fill(); shadowOff(c);
      c.strokeStyle = C['wood-d']; c.lineWidth = 4; c.strokeRect(-18, -18, 36, 36); c.beginPath(); c.moveTo(-18, -18); c.lineTo(18, 18); c.stroke();
      c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1.2; rr(c, -22, -22, 44, 44, 4); c.stroke(); }); } });

  function rampDef(type, name, len, desc) {
    def(type, { name: name, cat: 'maq', machine: 'plano', rot: true, flipMode: 'angle', a0: 0.3, desc: desc,
      create: function (s, it) { var b = Bodies.rectangle(it.x, it.y, len, 14, { isStatic: true, angle: it.a, friction: 0.02, frictionStatic: 0.05, chamfer: { radius: 5 } }); return { bodies: [b], main: b }; },
      draw: function (c, s, it, P) { at(c, P.main, function () { plank(c, len, 14, C.wood, C['wood-d']); }); } });
  }
  rampDef('rampa', 'Rampa', 200, 'Plano inclinado: la canica baja rodando.');
  rampDef('rampaC', 'Rampa corta', 120, 'Plano inclinado pequeño para ajustar el camino.');

  def('plataforma', { name: 'Plataforma', cat: 'est', rot: true, flipMode: 'angle', a0: 0, desc: 'Un piso para apoyar cosas arriba.',
    create: function (s, it) { var b = Bodies.rectangle(it.x, it.y, 180, 16, { isStatic: true, angle: it.a, friction: 0.3, chamfer: { radius: 4 } }); return { bodies: [b], main: b }; },
    draw: function (c, s, it, P) { at(c, P.main, function () { plank(c, 180, 16, C.oak, C['oak-d']); }); } });

  def('muro', { name: 'Muro', cat: 'est', rot: true, flipMode: 'angle', a0: 0, desc: 'Detiene o hace rebotar las cosas.',
    create: function (s, it) { var b = Bodies.rectangle(it.x, it.y, 22, 130, { isStatic: true, angle: it.a, friction: 0.3 }); return { bodies: [b], main: b }; },
    draw: function (c, s, it, P) { at(c, P.main, function () { shadowOn(c); c.fillStyle = C.brick; rr(c, -11, -65, 22, 130, 3); c.fill(); shadowOff(c);
      c.strokeStyle = C['brick-d']; c.lineWidth = 1.5; for (var y = -65 + 13; y < 65; y += 13) { c.beginPath(); c.moveTo(-11, y); c.lineTo(11, y); c.stroke(); }
      for (var k = 0, y2 = -65; y2 < 65; y2 += 13, k++) { var xx = k % 2 ? -3 : 4; c.beginPath(); c.moveTo(xx, y2); c.lineTo(xx, y2 + 13); c.stroke(); }
      c.strokeStyle = 'rgba(0,0,0,.3)'; rr(c, -11, -65, 22, 130, 3); c.stroke(); }); } });

  def('cuna', { name: 'Cuña', cat: 'maq', machine: 'cuna', rot: true, flipMode: 'flip', a0: 0, desc: 'Dos planos inclinados: levanta, separa o hace saltar.',
    create: function (s, it) { var f = it.flip ? -1 : 1;
      var v = [{ x: -55 * f, y: 25 }, { x: 55 * f, y: 25 }, { x: 55 * f, y: -25 }];
      var b = Bodies.fromVertices(it.x, it.y, [v], { isStatic: true, friction: 0.02, frictionStatic: 0.05 }, true);
      Body.setAngle(b, it.a || 0); return { bodies: [b], main: b }; },
    draw: function (c, s, it, P) { var b = P.main; shadowOn(c); var bb = b.bounds; c.fillStyle = lg(c, 0, bb.min.y, 0, bb.max.y, C.wood, C['wood-d']); poly(c, b.vertices); c.fill(); shadowOff(c);
      c.save(); poly(c, b.vertices); c.clip(); c.strokeStyle = 'rgba(70,35,5,.25)'; c.lineWidth = 1.2; for (var y = bb.min.y + 8; y < bb.max.y; y += 8) { c.beginPath(); c.moveTo(bb.min.x, y); c.lineTo(bb.max.x, y); c.stroke(); } c.restore();
      c.strokeStyle = 'rgba(40,20,0,.4)'; c.lineWidth = 1.5; poly(c, b.vertices); c.stroke(); } });

  def('palanca', { name: 'Palanca', cat: 'maq', machine: 'palanca', rot: true, flipMode: 'angle', a0: 0, desc: 'Barra que gira sobre un punto de apoyo: baja un lado y sube el otro.',
    create: function (s, it) {
      var plankB = Bodies.rectangle(it.x, it.y, 260, 12, { density: 0.0025, friction: 0.6, frictionStatic: 0.8, angle: it.a, chamfer: { radius: 4 } });
      var hub = Bodies.circle(it.x, it.y + 16, 14, { isStatic: true, isSensor: true });
      var con = Constraint.create({ bodyA: plankB, pointA: { x: 0, y: 0 }, pointB: { x: it.x, y: it.y }, stiffness: 1, length: 0 });
      return { bodies: [plankB, hub], constraints: [con], main: plankB, roles: { 1: 'deco' }, state: { baseY: s.surfaceBelow(it.x, it.y + 40) } };
    },
    draw: function (c, s, it, P) {
      post(c, it.x, it.y + 30, P.state.baseY, 10);
      shadowOn(c); c.fillStyle = lg(c, 0, it.y, 0, it.y + 36, C['metal-l'], C['metal-d']); c.beginPath(); c.moveTo(it.x, it.y); c.lineTo(it.x - 22, it.y + 36); c.lineTo(it.x + 22, it.y + 36); c.closePath(); c.fill(); shadowOff(c);
      at(c, P.main, function () { plank(c, 260, 12, C.wood, C['wood-d'], { nails: false }); c.fillStyle = C.red; rr(c, -130, -8, 16, 16, 3); rr(c, 114, -8, 16, 16, 3); c.fill(); });
      c.fillStyle = C['metal-l']; c.beginPath(); c.arc(it.x, it.y, 5, 0, TAU); c.fill(); c.strokeStyle = C['metal-d']; c.lineWidth = 1.5; c.stroke();
    } });

  def('rueda', { name: 'Rueda con motor', cat: 'maq', machine: 'rueda', flipMode: 'flip', desc: 'Rueda y eje: gira sin parar y lanza lo que toca.',
    create: function (s, it) {
      var parts = [Bodies.circle(0, 0, 22)];
      for (var k = 0; k < 4; k++) parts.push(Bodies.rectangle(0, 0, 104, 10, { angle: k * Math.PI / 4 }));
      var b = Body.create({ parts: parts, density: 0.01, friction: 0.6, frictionStatic: 0.8 });
      Body.setPosition(b, { x: it.x, y: it.y });
      var con = Constraint.create({ bodyA: b, pointA: { x: 0, y: 0 }, pointB: { x: it.x, y: it.y }, stiffness: 1, length: 0 });
      return { bodies: [b], constraints: [con], main: b, state: { baseY: s.surfaceBelow(it.x, it.y + 60) } };
    },
    pre: function (s, it, P) { Body.setAngularVelocity(P.main, (it.flip ? -1 : 1) * 0.07); },
    draw: function (c, s, it, P) {
      post(c, it.x, it.y, P.state.baseY, 12);
      var b = P.main; shadowOn(c);
      b.parts.slice(2).forEach(function (p) { c.fillStyle = lg(c, 0, p.bounds.min.y, 0, p.bounds.max.y, C.wood, C['wood-d']); poly(c, p.vertices); c.fill(); });
      shadowOff(c);
      var hub = b.parts[1]; c.fillStyle = lg(c, 0, hub.bounds.min.y, 0, hub.bounds.max.y, C['metal-l'], C['metal-d']); poly(c, hub.vertices); c.fill();
      c.fillStyle = C.yellow; c.beginPath(); c.arc(it.x, it.y, 6, 0, TAU); c.fill();
      c.strokeStyle = C.accent; c.lineWidth = 3; c.beginPath(); var d = it.flip ? -1 : 1; c.arc(it.x, it.y, 34, -1.2, -0.2); c.stroke();
      var ex = it.x + Math.cos(-0.2) * 34, ey = it.y + Math.sin(-0.2) * 34; c.fillStyle = C.accent; c.beginPath();
      if (d > 0) { c.moveTo(ex + 5, ey - 5); c.lineTo(ex - 5, ey - 5); c.lineTo(ex, ey + 5); } else { c.moveTo(ex - 6, ey - 3); c.lineTo(ex + 6, ey - 3); c.lineTo(ex, ey - 12); }
      c.fill();
    } });

  def('carrito', { name: 'Carrito', cat: 'maq', machine: 'rueda', role: 'mover', settle: true, desc: 'Rueda y eje: sus ruedas giran para avanzar fácil.',
    create: function (s, it) {
      var g = Body.nextGroup(true);
      var ch = Bodies.rectangle(it.x, it.y, 90, 22, { collisionFilter: { group: g }, density: 0.0025, friction: 0.3, frictionAir: 0.0008, chamfer: { radius: 6 } });
      var w1 = Bodies.circle(it.x - 30, it.y + 14, 14, { collisionFilter: { group: g }, density: 0.003, friction: 0.9, frictionStatic: 1, restitution: 0, frictionAir: 0.0008 });
      var w2 = Bodies.circle(it.x + 30, it.y + 14, 14, { collisionFilter: { group: g }, density: 0.003, friction: 0.9, frictionStatic: 1, restitution: 0, frictionAir: 0.0008 });
      var c1 = Constraint.create({ bodyA: ch, pointA: { x: -30, y: 14 }, bodyB: w1, stiffness: 1, length: 0 });
      var c2 = Constraint.create({ bodyA: ch, pointA: { x: 30, y: 14 }, bodyB: w2, stiffness: 1, length: 0 });
      return { bodies: [ch, w1, w2], constraints: [c1, c2], main: ch, settleBodies: [w1, w2] };
    },
    draw: function (c, s, it, P) {
      at(c, P.main, function () { shadowOn(c); c.fillStyle = lg(c, 0, -11, 0, 11, C.red, C['red-d']); rr(c, -45, -11, 90, 22, 6); c.fill(); shadowOff(c);
        c.fillStyle = 'rgba(255,255,255,.35)'; rr(c, -38, -7, 76, 5, 2); c.fill(); c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 1.2; rr(c, -45, -11, 90, 22, 6); c.stroke(); });
      P.bodies.slice(1).forEach(function (w) { at(c, w, function () { c.fillStyle = '#20263D'; c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fill();
        c.fillStyle = C['metal-l']; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.fill(); c.strokeStyle = C['metal-d']; c.lineWidth = 2;
        for (var k = 0; k < 3; k++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(k * 2.09) * 8, Math.sin(k * 2.09) * 8); c.stroke(); } }); });
    } });

  function bucketParts() { return [Bodies.rectangle(0, 22, 84, 10), Bodies.rectangle(-37, 0, 10, 50), Bodies.rectangle(37, 0, 10, 50)]; }
  def('polea', { name: 'Polea', cat: 'maq', machine: 'polea', desc: 'Rueda con cuerda: si un lado baja, el otro sube.',
    create: function (s, it) {
      var y0 = it.y + 170, mk = function (x) { var b = Body.create({ parts: bucketParts(), density: 0.0015, friction: 0.6, frictionStatic: 0.8 }); Body.setPosition(b, { x: x, y: y0 }); Body.setInertia(b, Infinity); return b; };
      var L = mk(it.x - 70), R = mk(it.x + 70);
      var wheel = Bodies.circle(it.x, it.y, 26, { isStatic: true, isSensor: true });
      return { bodies: [wheel, L, R], main: wheel, roles: { 0: 'deco', 1: 'bucket', 2: 'bucket' },
        state: { C: L.position.y + R.position.y, xL: it.x - 70, xR: it.x + 70, yMin: it.y + 70, yMax: it.y + 330, L0: L.position.y } };
    },
    pre: function (s, it, P) { var st = P.state, L = P.bodies[1], R = P.bodies[2];
      Body.setPosition(L, { x: st.xL, y: L.position.y }); Body.setVelocity(L, { x: 0, y: L.velocity.y });
      Body.setPosition(R, { x: st.xR, y: R.position.y }); Body.setVelocity(R, { x: 0, y: R.velocity.y }); },
    post: function (s, it, P) { var st = P.state, L = P.bodies[1], R = P.bodies[2];
      var d = (L.position.y + R.position.y - st.C) / 2, yL = L.position.y - d, yR = R.position.y - d;
      var m = (L.velocity.y + R.velocity.y) / 2, vL = L.velocity.y - m, vR = R.velocity.y - m;
      if (yL > st.yMax) { yL = st.yMax; yR = st.C - yL; vL = Math.min(vL, 0); vR = -vL; }
      if (yL < st.yMin) { yL = st.yMin; yR = st.C - yL; vL = Math.max(vL, 0); vR = -vL; }
      Body.setPosition(L, { x: st.xL, y: yL }); Body.setVelocity(L, { x: 0, y: vL });
      Body.setPosition(R, { x: st.xR, y: yR }); Body.setVelocity(R, { x: 0, y: vR }); },
    draw: function (c, s, it, P) {
      var L = P.bodies[1], R = P.bodies[2], rot = (L.position.y - P.state.L0) / 26;
      c.fillStyle = C['metal-d']; c.fillRect(it.x - 4, 0, 8, it.y); c.fillRect(it.x - 26, 0, 52, 8);
      c.strokeStyle = '#C9A46A'; c.lineWidth = 2.5;
      [[L, -1], [R, 1]].forEach(function (a) { var bx = a[0].position.x, top = a[0].bounds.min.y; c.beginPath(); c.moveTo(it.x + a[1] * 26, it.y); c.lineTo(bx + a[1] * 0, top + 4); c.stroke();
        c.beginPath(); c.moveTo(bx - 36, top + 6); c.lineTo(bx, top - 14); c.lineTo(bx + 36, top + 6); c.stroke(); });
      c.save(); c.translate(it.x, it.y); c.rotate(rot); shadowOn(c); c.fillStyle = lg(c, 0, -26, 0, 26, C['metal-l'], C['metal-d']); c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.fill(); shadowOff(c);
      c.strokeStyle = C['metal-d']; c.lineWidth = 3; for (var k = 0; k < 4; k++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(k * 1.57) * 22, Math.sin(k * 1.57) * 22); c.stroke(); }
      c.fillStyle = C.yellow; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill(); c.restore();
      drawParts(c, L, C['metal-l'], C['metal-d'], true); drawParts(c, R, C['metal-l'], C['metal-d'], true);
    } });

  def('tornillo', { name: 'Tornillo', cat: 'maq', machine: 'tornillo', flipMode: 'flip', desc: 'Tornillo de Arquímedes: un plano inclinado enrollado que sube cosas.',
    create: function (s, it) { var b = Bodies.rectangle(it.x, it.y, 66, 260, { isStatic: true, isSensor: true }); return { bodies: [b], main: b, roles: { 0: 'deco' } }; },
    pre: function (s, it, P) { var top = it.y - 130, bot = it.y + 130, d = it.flip ? -1 : 1;
      s.movers.forEach(function (m) { var p = m.position; if (p.x > it.x - 36 && p.x < it.x + 36 && p.y > top - 4 && p.y < bot + 6) {
        if (p.y < top + 20) Body.setVelocity(m, { x: d * 3.4, y: -2.2 });
        else Body.setVelocity(m, { x: (it.x - p.x) * 0.12, y: -3.2 }); } }); },
    draw: function (c, s, it, P) { var x = it.x - 33, y = it.y - 130, w = 66, h = 260, d = it.flip ? -1 : 1;
      shadowOn(c); c.fillStyle = 'rgba(180,220,255,.28)'; rr(c, x, y, w, h, 14); c.fill(); shadowOff(c);
      c.save(); rr(c, x, y, w, h, 14); c.clip(); var off = (s.mode === 'run' ? s.clock * 1.6 : 0) % 40;
      c.strokeStyle = C.accent; c.lineWidth = 7; c.lineCap = 'round';
      for (var yy = y - 40 + (40 - off); yy < y + h + 40; yy += 40) { c.beginPath(); c.moveTo(x + 4, yy + 16); c.quadraticCurveTo(it.x, yy - 10, x + w - 4, yy); c.stroke(); }
      c.fillStyle = C['metal-d']; c.fillRect(it.x - 3, y, 6, h); c.restore();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; rr(c, x, y, w, h, 14); c.stroke();
      c.fillStyle = C['metal-d']; rr(c, x - 6, y + h - 8, w + 12, 18, 5); c.fill();
      c.fillStyle = C.accent; c.beginPath(); c.moveTo(it.x + d * 20, y - 2); c.lineTo(it.x + d * 44, y + 8); c.lineTo(it.x + d * 20, y + 18); c.closePath(); c.fill(); } });

  def('resorte', { name: 'Resorte', cat: 'est', machine: 'resorte', rot: true, flipMode: 'angle', a0: 0, desc: 'Guarda energía y lanza hacia arriba lo que cae encima.',
    create: function (s, it) { var b = Bodies.rectangle(it.x, it.y, 80, 12, { isStatic: true, isSensor: true, angle: it.a }); return { bodies: [b], main: b, roles: { 0: 'spring' }, state: { comp: 0 } }; },
    draw: function (c, s, it, P) { var comp = P.state.comp; P.state.comp *= 0.85;
      at(c, P.main, function () { var dy = -8 * comp; c.fillStyle = C['metal-d']; rr(c, -40, 20, 80, 7, 3); c.fill();
        c.strokeStyle = C['metal-l']; c.lineWidth = 3; c.beginPath(); c.moveTo(-26, 20);
        for (var k = 0; k <= 8; k++) { var yy = 20 - (20 - (6 + dy)) * (k / 8); c.lineTo(k % 2 ? 26 : -26, yy); } c.stroke();
        shadowOn(c); c.fillStyle = lg(c, 0, -6 + dy, 0, 6 + dy, C.red, C['red-d']); rr(c, -40, -6 + dy, 80, 12, 5); c.fill(); shadowOff(c);
        c.fillStyle = 'rgba(255,255,255,.45)'; rr(c, -34, -4 + dy, 68, 3, 2); c.fill(); }); } });

  def('soplador', { name: 'Soplador', cat: 'est', flipMode: 'flip', desc: 'Sopla aire y empuja las cosas livianas.',
    create: function (s, it) { var b = Bodies.rectangle(it.x, it.y, 46, 46, { isStatic: true, chamfer: { radius: 6 } }); return { bodies: [b], main: b }; },
    pre: function (s, it, P) { var d = it.flip ? -1 : 1, x0 = it.x + d * 23, x1 = it.x + d * 283;
      s.movers.forEach(function (m) { var p = m.position; var inX = d > 0 ? (p.x > x0 && p.x < x1) : (p.x < x0 && p.x > x1);
        if (inX && Math.abs(p.y - it.y) < 34) { var v = m.velocity; var nv = v.x + d * 0.35; if (d > 0) nv = Math.min(nv, 7); else nv = Math.max(nv, -7); Body.setVelocity(m, { x: nv, y: v.y - 0.04 }); } }); },
    draw: function (c, s, it, P) { var d = it.flip ? -1 : 1;
      if (s.mode === 'run') { c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; for (var k = 0; k < 4; k++) { var ph = ((s.clock * 4 + k * 60) % 240); c.beginPath(); var sx = it.x + d * (30 + ph), sy = it.y - 18 + k * 12; c.moveTo(sx, sy); c.lineTo(sx + d * 22, sy); c.stroke(); } }
      at(c, P.main, function () { shadowOn(c); c.fillStyle = lg(c, 0, -23, 0, 23, C.blue, C['blue-d']); rr(c, -23, -23, 46, 46, 8); c.fill(); shadowOff(c);
        c.fillStyle = '#E8F1FF'; c.beginPath(); c.arc(d * 6, 0, 16, 0, TAU); c.fill(); c.save(); c.translate(d * 6, 0); c.rotate(s.mode === 'run' ? s.clock * 0.5 : 0);
        c.fillStyle = C['blue-d']; for (var k = 0; k < 3; k++) { c.rotate(TAU / 3); c.beginPath(); c.ellipse(0, -8, 4, 8, 0, 0, TAU); c.fill(); } c.restore(); }); } });

  def('cinta', { name: 'Cinta', cat: 'est', rot: true, flipMode: 'flip', a0: 0, desc: 'Cinta transportadora: mueve lo que está encima.',
    create: function (s, it) { var b = Bodies.rectangle(it.x, it.y, 220, 16, { isStatic: true, angle: it.a, friction: 0.8, chamfer: { radius: 8 } }); return { bodies: [b], main: b }; },
    pre: function (s, it, P) { var d = it.flip ? -1 : 1, b = P.main, tx = Math.cos(b.angle) * d, ty = Math.sin(b.angle) * d;
      s.movers.forEach(function (m) { if (Query.collides(m, [b]).length) { var v = m.velocity, vt = v.x * tx + v.y * ty, dv = (3.5 - vt) * 0.25; Body.setVelocity(m, { x: v.x + tx * dv, y: v.y + ty * dv }); } }); },
    draw: function (c, s, it, P) { var d = it.flip ? -1 : 1; at(c, P.main, function () { shadowOn(c); c.fillStyle = '#2B3147'; rr(c, -110, -8, 220, 16, 8); c.fill(); shadowOff(c);
      c.save(); rr(c, -110, -8, 220, 16, 8); c.clip(); c.strokeStyle = '#8B93AE'; c.lineWidth = 2; var off = (s.mode === 'run' ? s.clock * 1.5 : 0) % 20;
      for (var x = -130 + (d > 0 ? off : 20 - off); x < 130; x += 20) { c.beginPath(); c.moveTo(x - d * 4, -4); c.lineTo(x + d * 3, 0); c.lineTo(x - d * 4, 4); c.stroke(); } c.restore();
      c.fillStyle = C['metal-l']; [-102, 102].forEach(function (x) { c.beginPath(); c.arc(x, 0, 6, 0, TAU); c.fill(); }); }); } });

  def('cubeta', { name: 'Cubeta', cat: 'est', desc: 'Atrapa canicas y bolas.',
    create: function (s, it) { var b = Body.create({ parts: [Bodies.rectangle(0, 25, 110, 10), Bodies.rectangle(-50, 0, 10, 60), Bodies.rectangle(50, 0, 10, 60)], isStatic: true, friction: 0.5 });
      Body.setPosition(b, { x: it.x, y: it.y }); return { bodies: [b], main: b }; },
    draw: function (c, s, it, P) { drawParts(c, P.main, C['metal-l'], C['metal-d'], true); } });

  def('campana', { name: 'Campana', cat: 'meta', desc: 'La meta: ¡haz que algo la toque!',
    create: function (s, it) { var b = Bodies.rectangle(it.x, it.y, 74, 84, { isStatic: true, isSensor: true }); return { bodies: [b], main: b, roles: { 0: 'goal' }, state: { swing: 0, t: 0, baseY: s.surfaceBelow(it.x, it.y + 36) } }; },
    draw: function (c, s, it, P) { var st = P.state; st.t += 1; var sw = st.swing * Math.sin(st.t * 0.35); st.swing *= 0.97;
      var glow = c.createRadialGradient(it.x, it.y, 6, it.x, it.y, 70); glow.addColorStop(0, 'rgba(255,200,40,.45)'); glow.addColorStop(1, 'rgba(255,200,40,0)'); c.fillStyle = glow; c.beginPath(); c.arc(it.x, it.y, 70, 0, TAU); c.fill();
      if (it.hang) { c.strokeStyle = C['metal-d']; c.lineWidth = 3; c.setLineDash([6, 3]); c.beginPath(); c.moveTo(it.x, 0); c.lineTo(it.x, it.y - 36); c.stroke(); c.setLineDash([]);
        c.fillStyle = C['metal-d']; rr(c, it.x - 18, -4, 36, 10, 3); c.fill(); }
      else { post(c, it.x + 30, it.y - 34, st.baseY, 8); c.fillStyle = C['wood-d']; c.fillRect(it.x - 2, it.y - 38, 36, 7); }
      c.save(); c.translate(it.x, it.y - 32); c.rotate(sw * 0.5); shadowOn(c);
      c.fillStyle = lg(c, -26, 0, 26, 0, C.yellow, C['yellow-d']); c.beginPath(); c.moveTo(-6, 4); c.quadraticCurveTo(-24, 10, -26, 56); c.lineTo(26, 56); c.quadraticCurveTo(24, 10, 6, 4); c.closePath(); c.fill(); shadowOff(c);
      c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-10, 26, 4, 14, 0.2, 0, TAU); c.fill();
      c.fillStyle = C['yellow-d']; rr(c, -30, 52, 60, 8, 4); c.fill(); c.beginPath(); c.arc(sw * 8, 64, 6, 0, TAU); c.fill(); c.restore(); } });

  var MOVER_ROLES = { mover: 1, domino: 1, bucket: 1 };

  /* ---------------- Escenario ---------------- */
  function Stage(canvas, opts) {
    opts = opts || {};
    this.cv = canvas; this.ctx = canvas ? canvas.getContext('2d') : null;
    this.W = opts.W || 1000; this.H = opts.H || 600; this.FLOOR = this.H - (opts.floorH || 44);
    this.editable = !!opts.editable; this.showGrid = opts.grid !== false;
    this.items = []; this.mode = 'edit'; this.sel = null; this.ghost = null; this.clock = 0; this.acc = 0; this.slow = false;
    this.on = {}; this.parts = {}; this.movers = []; this.activated = {}; this.flashes = []; this.labels = []; this.won = false; this.steps = 0;
    this.engine = Engine.create({ positionIterations: 10, velocityIterations: 8, constraintIterations: 4 });
    this.engine.gravity.y = 1;
    var W = this.W, H = this.H, F = this.FLOOR;
    this.boundsB = [Bodies.rectangle(W / 2, F + 50, W + 400, 100, { isStatic: true, friction: 0.25 }), Bodies.rectangle(-25, H / 2 - 300, 50, H + 600, { isStatic: true }),
      Bodies.rectangle(W + 25, H / 2 - 300, 50, H + 600, { isStatic: true })];
    this.boundsB.forEach(function (b) { b.plugin.mlc = { role: 'bound' }; });
    Composite.add(this.engine.world, this.boundsB);
    this.comp = Composite.create(); Composite.add(this.engine.world, this.comp);
    var self = this;
    Events.on(this.engine, 'collisionStart', function (e) { self._collide(e.pairs); });
    Events.on(this.engine, 'collisionActive', function (e) {
      if (self.mode !== 'run' || self.won) return;
      e.pairs.forEach(function (p) { var A = p.bodyA.parent || p.bodyA, B = p.bodyB.parent || p.bodyB, ta = A.plugin.mlc || {}, tb = B.plugin.mlc || {};
        if (ta.role === 'goal' && MOVER_ROLES[tb.role] && (B.speed > 0.35 || Math.abs(B.angularVelocity) > 0.02)) self._ring(ta.id);
        if (tb.role === 'goal' && MOVER_ROLES[ta.role] && (A.speed > 0.35 || Math.abs(A.angularVelocity) > 0.02)) self._ring(tb.id); });
    });
    if (canvas) this.resize();
  }
  var S = Stage.prototype;
  S.resize = function () { var d = Math.min(global.devicePixelRatio || 1, 2); this.dpr = d; this.cv.width = this.W * d; this.cv.height = this.H * d; };
  S.emit = function (n, a, b) { if (this.on[n]) this.on[n](a, b); };
  S.surfaceBelow = function (x, y) {
    var solids = this.boundsB.concat(this._staticSolids || []);
    for (var yy = Math.max(0, y); yy < this.FLOOR; yy += 3) { if (Query.point(solids, { x: x, y: yy }).length) return yy; }
    return this.FLOOR;
  };
  S.setItems = function (items) { this.items = JSON.parse(JSON.stringify(items || [])); var mx = 0; this.items.forEach(function (i) { mx = Math.max(mx, i.id || 0); }); this.nextId = mx + 1; this.items.forEach(function (i) { if (!i.id) i.id = this.nextId++; }, this); this.build(); };
  S.settleAll = function () { var self = this; this.items.forEach(function (it) { if (PIECES[it.type].settle) self.settle(it); }); };
  S.getItems = function () { return JSON.parse(JSON.stringify(this.items)); };
  S.build = function () {
    Composite.clear(this.comp, false, true);
    this.parts = {}; this.movers = []; this.activated = {}; this.flashes = []; this.labels = []; this.won = false; this.steps = 0; this.still = 0; this.settledSent = false;
    // primero las piezas estáticas sólidas (para calcular superficies), luego el resto
    this._staticSolids = [];
    var order = this.items.slice().sort(function (a, b) { return (PIECES[a.type].role ? 1 : 0) - (PIECES[b.type].role ? 1 : 0); });
    var self = this;
    order.forEach(function (it) { self._buildItem(it); });
  };
  S._buildItem = function (it) {
    var d = PIECES[it.type]; if (!d) return;
    if (it.a == null) it.a = d.a0 || 0;
    var P = d.create(this, it); P.bodies = P.bodies || [P.main]; P.constraints = P.constraints || []; P.state = P.state || {};
    var self = this;
    P.bodies.forEach(function (b, i) {
      var role = (P.roles && P.roles[i]) || d.role || (b.isStatic ? 'static' : 'dyn');
      var tag = { id: it.id, type: it.type, role: role };
      b.plugin.mlc = tag; b.parts.forEach(function (p) { p.plugin.mlc = tag; });
      if (MOVER_ROLES[role]) self.movers.push(b);
      if (b.isStatic && !b.isSensor) self._staticSolids.push(b);
    });
    Composite.add(this.comp, P.bodies); if (P.constraints.length) Composite.add(this.comp, P.constraints);
    this.parts[it.id] = P;
  };
  S._removeItemBodies = function (it) {
    var P = this.parts[it.id]; if (!P) return;
    var self = this;
    P.bodies.forEach(function (b) { Composite.remove(self.comp, b); self.movers = self.movers.filter(function (m) { return m !== b; }); self._staticSolids = self._staticSolids.filter(function (m) { return m !== b; }); });
    P.constraints.forEach(function (c) { Composite.remove(self.comp, c); });
    delete this.parts[it.id];
  };
  S.rebuildItem = function (it) { this._removeItemBodies(it); this._buildItem(it); };
  S.itemBounds = function (it) {
    var P = this.parts[it.id]; if (!P) return null; var b = { minx: 1e9, miny: 1e9, maxx: -1e9, maxy: -1e9 };
    P.bodies.forEach(function (bd) { b.minx = Math.min(b.minx, bd.bounds.min.x); b.miny = Math.min(b.miny, bd.bounds.min.y); b.maxx = Math.max(b.maxx, bd.bounds.max.x); b.maxy = Math.max(b.maxy, bd.bounds.max.y); });
    return b;
  };
  S.hit = function (x, y) {
    for (var i = this.items.length - 1; i >= 0; i--) { var it = this.items[i], P = this.parts[it.id]; if (!P) continue;
      if (Query.point(P.bodies, { x: x, y: y }).length) return it;
      var bb = this.itemBounds(it); if (bb && x > bb.minx - 6 && x < bb.maxx + 6 && y > bb.miny - 6 && y < bb.maxy + 6 && (bb.maxx - bb.minx < 40 || bb.maxy - bb.miny < 24)) return it; }
    return null;
  };
  S.clamp = function (it) { it.x = Math.max(20, Math.min(this.W - 20, it.x)); it.y = Math.max(16, Math.min(this.FLOOR - 6, it.y)); };
  S.settle = function (it) {
    var d = PIECES[it.type]; if (!d.settle) return;
    var P = this.parts[it.id]; if (!P) return; var own = P.bodies;
    var solids = this.boundsB.concat(Composite.allBodies(this.comp).filter(function (b) { return !b.isSensor && own.indexOf(b) < 0; }));
    var probe = P.settleBodies || [P.main], all = P.bodies;
    function hits() { for (var i = 0; i < probe.length; i++) if (Query.collides(probe[i], solids).length) return true; return false; }
    function mv(dy) { all.forEach(function (b) { Body.translate(b, { x: 0, y: dy }); }); }
    var dy = 0;
    if (hits()) { for (var up = 0; up < 240 && hits(); up += 2) { mv(-2); dy -= 2; } }
    else { for (var k = 0; k < 700; k += 2) { mv(2); if (hits()) { mv(-2); break; } dy += 2; } }
    it.y += dy; this.rebuildItem(it);
  };
  S.addItem = function (type, x, y, extra) {
    var d = PIECES[type]; if (!d) return null;
    var it = { id: this.nextId++, type: type, x: Math.round(x), y: Math.round(y), a: d.a0 || 0, flip: false, added: true };
    if (extra) for (var k in extra) it[k] = extra[k];
    this.clamp(it); this.items.push(it); this._buildItem(it); this.settle(it); return it;
  };
  S.removeItem = function (it) { this._removeItemBodies(it); this.items = this.items.filter(function (i) { return i !== it; }); if (this.sel === it) this.sel = null; };
  S.moveItem = function (it, x, y) { it.x = Math.round(x); it.y = Math.round(y); this.clamp(it); this.rebuildItem(it); };
  S.rotateItem = function (it, dir) { var d = PIECES[it.type]; if (!d.rot) return false; it.a = (it.a || 0) + dir * Math.PI / 12; if (Math.abs(it.a) < 1e-6) it.a = 0; this.rebuildItem(it); return true; };
  S.flipItem = function (it) { var d = PIECES[it.type]; if (!d.flipMode) return false; if (d.flipMode === 'angle') it.a = -(it.a || 0); else it.flip = !it.flip; this.rebuildItem(it); return true; };

  S.run = function () { if (this.mode === 'run') return; this.snapshot = this.getItems(); this.build(); this.mode = 'run'; this.acc = 0; this.sel = null; this.emit('mode', 'run'); };
  S.stop = function () { if (this.snapshot) this.items = this.snapshot; this.snapshot = null; this.mode = 'edit'; this.build(); this.emit('mode', 'edit'); };
  S.step = function () {
    var self = this, k;
    for (k = 0; k < this.items.length; k++) { var it = this.items[k], d = PIECES[it.type]; if (d.pre && this.parts[it.id]) d.pre(this, it, this.parts[it.id]); }
    Engine.update(this.engine, STEP);
    for (k = 0; k < this.items.length; k++) { var it2 = this.items[k], d2 = PIECES[it2.type]; if (d2.post && this.parts[it2.id]) d2.post(this, it2, this.parts[it2.id]); }
    this.steps++;
    // cosas que se salen del mundo
    this.movers.forEach(function (m) { if (m.position.y > self.H + 200) { Body.setPosition(m, { x: m.position.x, y: self.H + 200 }); Body.setVelocity(m, { x: 0, y: 0 }); Body.setStatic(m, true); } });
    if (this.steps % 20 === 0 && !this.settledSent) {
      var moving = this.movers.some(function (m) { return !m.isStatic && (Math.abs(m.velocity.x) + Math.abs(m.velocity.y) > 0.15 || Math.abs(m.angularVelocity) > 0.01); });
      var active = this.items.some(function (i) { return i.type === 'rueda' || i.type === 'soplador' || i.type === 'cinta' || i.type === 'tornillo'; }) && this.steps < 60 * 25;
      this.still = moving ? 0 : this.still + 1;
      if ((this.still >= 5 && !active) || this.steps > 60 * 30) { this.settledSent = true; this.emit('settled', this.won); }
    }
  };
  S.tick = function (dt) {
    this.clock += dt / 16.67;
    if (this.mode !== 'run') return;
    this.acc += Math.min(dt, 64) * (this.slow ? 0.3 : 1);
    var n = 0; while (this.acc >= STEP && n < 4) { this.step(); this.acc -= STEP; n++; }
  };
  S.simulate = function (n) { for (var i = 0; i < n; i++) { this.step(); if (this.won && this.wonAt == null) this.wonAt = i; } };
  S._collide = function (pairs) {
    if (this.mode !== 'run') return;
    var self = this;
    pairs.forEach(function (p) {
      var A = p.bodyA.parent || p.bodyA, B = p.bodyB.parent || p.bodyB;
      var ta = A.plugin.mlc || {}, tb = B.plugin.mlc || {};
      [[ta, tb, A, B], [tb, ta, B, A]].forEach(function (q) {
        var t = q[0], o = q[1], body = q[2], other = q[3];
        if (t.role === 'goal' && MOVER_ROLES[o.role] && (other.speed > 0.35 || Math.abs(other.angularVelocity) > 0.02)) self._ring(t.id);
        if (t.role === 'spring' && (MOVER_ROLES[o.role] || o.role === 'dyn') && !other.isStatic) {
          var n = { x: Math.sin(body.angle), y: -Math.cos(body.angle) }, v = other.velocity, vn = v.x * n.x + v.y * n.y;
          if (vn < 4) { Body.setVelocity(other, { x: v.x - vn * n.x + n.x * 13.5, y: v.y - vn * n.y + n.y * 13.5 }); var P = self.parts[t.id]; if (P) P.state.comp = 1; self.emit('sound', 'boing'); }
        }
      });
      if (ta.role === 'domino' && tb.role === 'domino') self.emit('sound', 'toc');
      [ta, tb].forEach(function (t) { if (t.id && t.role !== 'bound' && !self.activated[t.id]) { self.activated[t.id] = self.steps + 1;
        var it = self.items.find(function (i) { return i.id === t.id; }); if (it) { self.flashes.push({ id: t.id, t: 0 }); self.emit('activate', it); } } });
    });
  };
  S._ring = function (id) {
    var P = this.parts[id]; if (P) P.state.swing = 1;
    if (!this.won) { this.won = true; this.wonStep = this.steps; this.emit('sound', 'bell'); this.emit('win'); }
  };
  S.label = function (text, x, y) { this.labels.push({ text: text, x: x, y: y, t: 0 }); };
  S.activatedMachines = function () { var set = {}, self = this; Object.keys(this.activated).forEach(function (id) { var it = self.items.find(function (i) { return String(i.id) === id; }); if (it && PIECES[it.type].machine) set[PIECES[it.type].machine] = 1; }); return Object.keys(set); };

  /* ---------------- dibujo del escenario ---------------- */
  S.drawBackground = function (c) {
    var W = this.W, H = this.H, F = this.FLOOR, t = this.clock;
    c.fillStyle = lg(c, 0, 0, 0, F, C.sky1, C.sky2); c.fillRect(0, 0, W, H);
    if (C.dark) { c.fillStyle = 'rgba(255,255,255,.85)'; for (var i = 0; i < 40; i++) { var sx = (i * 173) % W, sy = (i * 97) % (F - 120), tw = 0.5 + 0.5 * Math.sin(t * 0.05 + i); c.globalAlpha = 0.4 + 0.6 * tw; c.fillRect(sx, sy, 2, 2); } c.globalAlpha = 1;
      c.fillStyle = '#F4F1DE'; c.beginPath(); c.arc(W - 110, 80, 30, 0, TAU); c.fill(); c.fillStyle = C.sky1; c.beginPath(); c.arc(W - 98, 72, 26, 0, TAU); c.fill(); }
    else { var sg = c.createRadialGradient(W - 110, 80, 10, W - 110, 80, 90); sg.addColorStop(0, 'rgba(255,236,150,1)'); sg.addColorStop(0.35, 'rgba(255,220,110,.9)'); sg.addColorStop(1, 'rgba(255,220,110,0)'); c.fillStyle = sg; c.beginPath(); c.arc(W - 110, 80, 90, 0, TAU); c.fill();
      c.fillStyle = C.cloud; [[140, 90, 1], [420, 60, 0.8], [700, 120, 1.1]].forEach(function (cl, k) { var x = ((cl[0] + t * (0.12 + k * 0.05)) % (W + 200)) - 100, y = cl[1], s = cl[2];
        c.beginPath(); c.arc(x, y, 24 * s, 0, TAU); c.arc(x + 26 * s, y - 10 * s, 30 * s, 0, TAU); c.arc(x + 56 * s, y, 22 * s, 0, TAU); c.rect(x, y, 56 * s, 20 * s); c.fill(); }); }
    c.fillStyle = C.hill1; c.beginPath(); c.moveTo(0, F); for (var x = 0; x <= W; x += 20) c.lineTo(x, F - 90 - Math.sin(x * 0.006 + 1) * 40); c.lineTo(W, F); c.fill();
    c.fillStyle = C.hill2; c.beginPath(); c.moveTo(0, F); for (var x2 = 0; x2 <= W; x2 += 20) c.lineTo(x2, F - 40 - Math.sin(x2 * 0.01 + 3) * 22); c.lineTo(W, F); c.fill();
    c.fillStyle = C.dirt; c.fillRect(0, F, W, H - F); c.fillStyle = C['dirt-d']; for (var k = 0; k < 30; k++) { c.fillRect((k * 71) % W, F + 14 + (k * 13) % (H - F - 16), 6, 3); }
    c.fillStyle = C.grass; c.fillRect(0, F - 2, W, 10); c.fillStyle = C['grass-d']; for (var g = 4; g < W; g += 14) { c.beginPath(); c.moveTo(g, F + 1); c.lineTo(g + 3, F - 7); c.lineTo(g + 6, F + 1); c.fill(); }
    if (this.mode === 'edit' && this.editable && this.showGrid) { c.fillStyle = C.grid; for (var gx = 25; gx < W; gx += 25) for (var gy = 25; gy < F; gy += 25) c.fillRect(gx - 1, gy - 1, 2, 2); }
  };
  S.draw = function () {
    if (!this.ctx) return; var c = this.ctx, self = this;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, this.W, this.H);
    this.drawBackground(c);
    var list = this.items.slice().sort(function (a, b) { return (PIECES[a.type].role ? 1 : 0) - (PIECES[b.type].role ? 1 : 0); });
    list.forEach(function (it) { var P = self.parts[it.id]; if (P) { try { PIECES[it.type].draw(c, self, it, P); } catch (e) { } } });
    // destellos de activación
    this.flashes = this.flashes.filter(function (f) { f.t++; var it = self.items.find(function (i) { return i.id === f.id; }); var bb = it && self.itemBounds(it); if (!bb) return false;
      var cx = (bb.minx + bb.maxx) / 2, cy = (bb.miny + bb.maxy) / 2, r = Math.max(bb.maxx - bb.minx, bb.maxy - bb.miny) / 2 + 14;
      var g = 6 + f.t * 0.35; c.strokeStyle = 'rgba(255,200,40,' + (1 - f.t / 40) + ')'; c.lineWidth = 5; rr(c, bb.minx - g, bb.miny - g, bb.maxx - bb.minx + 2 * g, bb.maxy - bb.miny + 2 * g, 14); c.stroke(); return f.t < 40; });
    this.labels = this.labels.filter(function (l) { l.t++; var a = l.t < 90 ? 1 : 1 - (l.t - 90) / 30; c.globalAlpha = Math.max(0, a); c.font = '700 22px Fredoka, Nunito, sans-serif'; c.textAlign = 'center';
      var w = c.measureText(l.text).width + 26, y = l.y - Math.min(l.t, 30) * 0.8; c.fillStyle = 'rgba(30,24,70,.85)'; rr(c, l.x - w / 2, y - 22, w, 34, 17); c.fill(); c.fillStyle = '#FFF'; c.fillText(l.text, l.x, y + 3); c.globalAlpha = 1; c.textAlign = 'left'; return l.t < 120; });
    if (this.sel && this.mode === 'edit') { var bb = this.itemBounds(this.sel); if (bb) { c.strokeStyle = C.accent; c.lineWidth = 2.5; c.setLineDash([7, 5]); rr(c, bb.minx - 8, bb.miny - 8, bb.maxx - bb.minx + 16, bb.maxy - bb.miny + 16, 10); c.stroke(); c.setLineDash([]); } }
    if (this.ghost) { c.globalAlpha = 0.55; drawGhost(c, this, this.ghost.type, this.ghost.x, this.ghost.y); c.globalAlpha = 1; }
    if (this.onOverlay) this.onOverlay(c);
  };

  /* fantasma e íconos */
  var scratch = null;
  function scratchStage() { if (!scratch) { scratch = new Stage(null, { W: 1000, H: 600 }); } return scratch; }
  function drawGhost(c, s, type, x, y) {
    var d = PIECES[type], it = { id: 999, type: type, x: x, y: y, a: d.a0 || 0, flip: false };
    var sc = scratchStage(); sc._staticSolids = s._staticSolids || []; sc.boundsB = s.boundsB; sc.FLOOR = s.FLOOR; sc.clock = s.clock; sc.mode = 'edit';
    var P = d.create(sc, it); P.bodies = P.bodies || [P.main]; P.state = P.state || {}; d.draw(c, sc, it, P);
  }
  function drawIcon(canvas, type) {
    var d = PIECES[type], dpr = Math.min(global.devicePixelRatio || 1, 2), w = canvas.width = 72 * dpr, h = canvas.height = 56 * dpr, c = canvas.getContext('2d');
    var sc = scratchStage(); sc._staticSolids = []; sc.FLOOR = 10000; sc.clock = 0; sc.mode = 'edit';
    var it = { id: 1, type: type, x: 500, y: 300, a: d.a0 || 0, flip: false };
    var P = d.create(sc, it); P.bodies = P.bodies || [P.main]; P.state = P.state || {};
    if (P.state.baseY) P.state.baseY = it.y + 50;
    var bb = { minx: 1e9, miny: 1e9, maxx: -1e9, maxy: -1e9 }; P.bodies.forEach(function (b) { bb.minx = Math.min(bb.minx, b.bounds.min.x); bb.miny = Math.min(bb.miny, b.bounds.min.y); bb.maxx = Math.max(bb.maxx, b.bounds.max.x); bb.maxy = Math.max(bb.maxy, b.bounds.max.y); });
    if (type === 'polea') { bb.miny = 280; } if (type === 'campana') { bb.minx -= 10; bb.maxx += 30; bb.miny -= 40; }
    var s = Math.min((w - 10 * dpr) / (bb.maxx - bb.minx), (h - 8 * dpr) / (bb.maxy - bb.miny)); s = Math.min(s, 1.6 * dpr);
    c.setTransform(s, 0, 0, s, w / 2 - s * (bb.minx + bb.maxx) / 2, h / 2 - s * (bb.miny + bb.maxy) / 2);
    try { d.draw(c, sc, it, P); } catch (e) { }
  }

  global.MLC_ENGINE = { Stage: Stage, PIECES: PIECES, ORDER: ORDER, refreshColors: refreshColors, drawIcon: drawIcon, colors: C, rr: rr, STEP: STEP };
})(window);
