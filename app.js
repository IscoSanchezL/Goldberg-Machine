/* Máquinas Locas de Chispa — aplicación */
(function () {
  'use strict';
  var I = window.MLC_I18N, t = I.t;
  var E = window.MLC_ENGINE;
  if (!E || !window.Matter) {
    document.querySelector('main').innerHTML = '<div class="card"><h2>' + t('engineFail') + '</h2><p>' + t('engineFail2') + '</p></div>';
    I.apply(); I.mount();
    return;
  }
  var PIECES = E.PIECES, Body = Matter.Body;
  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('mlc-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('mlc-' + k, JSON.stringify(v)); } catch (e) { } },
    del: function (k) { try { localStorage.removeItem('mlc-' + k); } catch (e) { } }
  };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= SONIDO ================= */
  var Sound = (function () {
    var ac = null, on = store.get('sound', true), lastToc = 0;
    function ctx() {
      if (!ac) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return null; try { ac = new A(); } catch (e) { return null; } }
      if (ac.state === 'suspended') ac.resume(); return ac;
    }
    function tone(f, d, type, vol, when, slide) {
      var a = ctx(); if (!a || !on) return;
      var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (when || 0);
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.05);
    }
    return {
      isOn: function () { return on; },
      toggle: function () { on = !on; store.set('sound', on); return on; },
      unlock: function () { ctx(); },
      play: function (n) {
        if (!on) return;
        if (n === 'bell') { tone(880, 1.8, 'sine', 0.22); tone(1760, 1.2, 'sine', 0.07); tone(1318, 1.5, 'sine', 0.09); tone(2637, 0.8, 'sine', 0.035); }
        else if (n === 'toc') { var now = performance.now(); if (now - lastToc < 40) return; lastToc = now; tone(950 + Math.random() * 300, 0.05, 'square', 0.035); }
        else if (n === 'boing') tone(170, 0.4, 'sine', 0.2, 0, 640);
        else if (n === 'pop') tone(640, 0.08, 'triangle', 0.12);
        else if (n === 'del') tone(320, 0.14, 'triangle', 0.1, 0, 150);
        else if (n === 'click') tone(520, 0.05, 'triangle', 0.07);
        else if (n === 'start') { tone(440, 0.1, 'triangle', 0.1); tone(660, 0.14, 'triangle', 0.1, 0.08); }
        else if (n === 'win') [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.4, 'triangle', 0.13, 0.25 + i * 0.11); });
        else if (n === 'fail') tone(330, 0.3, 'sine', 0.1, 0, 200);
      }
    };
  })();
  document.addEventListener('pointerdown', function () { Sound.unlock(); }, { once: false, passive: true });

  /* ================= ÍCONOS Y TEMA ================= */
  var iconList = [];
  function icon(type, w, h) {
    if (iconList.length > 150) iconList = iconList.filter(function (c) { return c.isConnected; });
    var cv = document.createElement('canvas'); cv.dataset.type = type; paintIcon(cv); iconList.push(cv);
    if (w) cv.style.width = w + 'px'; if (h) cv.style.height = h + 'px'; return cv;
  }
  function paintIcon(cv) {
    var t = cv.dataset.type;
    if (t === 'domino5') {
      var tmp = document.createElement('canvas'); E.drawIcon(tmp, 'domino');
      cv.width = tmp.width; cv.height = tmp.height; var c = cv.getContext('2d');
      [-0.3, 0, 0.3].forEach(function (o) { c.drawImage(tmp, o * tmp.width * 0.5, 0); });
    } else E.drawIcon(cv, t);
  }
  var Theme = {
    mode: store.get('theme', 'dark'),
    isDark: function () { return this.mode === 'dark' || (this.mode === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); },
    apply: function () {
      var r = document.documentElement;
      if (this.mode === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', this.mode);
      $('themeBtn').textContent = this.isDark() ? '☀️' : '🌙';
      E.refreshColors(); iconList.forEach(paintIcon);
    },
    toggle: function () { this.mode = this.isDark() ? 'light' : 'dark'; store.set('theme', this.mode); this.apply(); }
  };
  var Style = {
    mode: store.get('style', 'dream'),
    apply: function (sync) {
      E.setStyle(this.mode); $('styleBtn').textContent = this.mode === 'dream' ? '🌌' : '🌿'; $('styleBtn').setAttribute('aria-pressed', String(this.mode === 'natural'));
      if (sync) { Theme.mode = this.mode === 'dream' ? 'dark' : 'light'; store.set('theme', Theme.mode); }
      Theme.apply();
    },
    toggle: function () { this.mode = this.mode === 'dream' ? 'natural' : 'dream'; store.set('style', this.mode); this.apply(true); }
  };
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (Theme.mode === 'system') Theme.apply(); }); } catch (e) { }

  /* ================= TOAST, MODAL, CONFETI ================= */
  var toastTimer = null;
  function toast(text, btnText, onBtn, ms) {
    $('toastTxt').textContent = text; var b = $('toastBtn');
    if (btnText) { b.hidden = false; b.textContent = btnText; b.onclick = function () { hideToast(); onBtn && onBtn(); }; } else b.hidden = true;
    $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, ms || 4200);
  }
  function hideToast() { $('toast').hidden = true; }
  function modal(html, wire) { $('mbox').innerHTML = html; $('modal').hidden = false; if (wire) wire($('mbox')); var f = $('mbox').querySelector('button'); if (f) f.focus(); }
  function closeModal() { $('modal').hidden = true; }
  $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) closeModal(); });

  /* ================= MODO PROFE (oculta "Para el profe" a estudiantes) ================= */
  var Teacher = (function () {
    var CODE = '0381'; // cámbialo por el código que quieras usar con tus estudiantes
    var SKEY = 'mlc-teacher-unlocked';
    function isOn() { try { return sessionStorage.getItem(SKEY) === '1'; } catch (e) { return false; } }
    function setOn(v) {
      document.body.classList.toggle('teacher-on', v);
      try { if (v) sessionStorage.setItem(SKEY, '1'); else sessionStorage.removeItem(SKEY); } catch (e) { }
      var b = $('teacherLockBtn'); if (b) b.textContent = v ? t('teacherOn') : t('teacherLock');
    }
    function ask() {
      modal(
        '<h2>' + t('tmTitle') + '</h2><p class="muted" style="margin:6px 0 16px">' + t('tmP') + '</p>' +
        '<input id="teachPin" type="password" inputmode="numeric" autocomplete="off" placeholder="' + t('tmPh') + '" ' +
        'style="width:100%;font:18px Fredoka,sans-serif;text-align:center;letter-spacing:4px;padding:12px;border-radius:14px;border:1.5px solid var(--line);background:var(--panel2);color:var(--ink);box-sizing:border-box;margin-bottom:6px">' +
        '<p id="teachErr" class="muted" style="color:var(--stop);min-height:20px;margin:2px 0 10px"></p>' +
        '<div class="row" style="justify-content:center">' +
        '<button class="btn go" id="teachOk">' + t('tmEnter') + '</button>' +
        '<button class="btn soft" id="teachCancel">' + t('tmCancel') + '</button>' +
        '</div>',
        function (box) {
          var input = box.querySelector('#teachPin');
          input.focus();
          function tryUnlock() {
            if (input.value === CODE) { setOn(true); closeModal(); toast(t('tmOkToast')); }
            else { box.querySelector('#teachErr').textContent = t('tmBad'); input.value = ''; input.focus(); }
          }
          box.querySelector('#teachOk').addEventListener('click', tryUnlock);
          box.querySelector('#teachCancel').addEventListener('click', closeModal);
          input.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryUnlock(); });
        }
      );
    }
    return { isOn: isOn, setOn: setOn, ask: ask };
  })();
  Teacher.setOn(Teacher.isOn());
  $('teacherLockBtn').addEventListener('click', function () {
    if (Teacher.isOn()) {
      Teacher.setOn(false);
      toast(t('tmOff'));
    } else {
      Teacher.ask();
    }
  });

  function confetti() {
    if (reduced) return;
    var cv = $('confetti'), c = cv.getContext('2d'), d = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = innerWidth * d; cv.height = innerHeight * d; c.setTransform(d, 0, 0, d, 0, 0);
    var cols = ['#FFC23A', '#6D45F5', '#22C55E', '#3B82F6', '#EF4444', '#FB923C'], ps = [];
    for (var i = 0; i < 160; i++) ps.push({ x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, s: 6 + Math.random() * 6, c: cols[i % cols.length] });
    var t0 = performance.now();
    (function f(now) {
      var t = now - t0; c.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach(function (p) { p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); });
      if (t < 2800) requestAnimationFrame(f); else c.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }

  /* ================= CHISPA (canvas) ================= */
  function drawChispa(c, x, y, s, mood, t) {
    c.save(); c.translate(x, y + Math.sin(t * 0.06) * 3); c.scale(s, s);
    c.shadowColor = 'rgba(20,20,60,.3)'; c.shadowBlur = 10; c.shadowOffsetY = 5;
    c.fillStyle = '#6D45F5'; E.rr(c, -36, -32, 72, 64, 22); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = '#5230D6'; E.rr(c, -36, 16, 72, 16, 10); c.fill();
    c.strokeStyle = '#5230D6'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -32); c.lineTo(0, -48); c.stroke();
    c.fillStyle = '#FFC23A'; c.beginPath(); c.arc(0, -52, 7 + Math.sin(t * 0.2) * 1, 0, 6.3); c.fill();
    c.fillStyle = '#14163A'; E.rr(c, -26, -22, 52, 36, 12); c.fill();
    var blink = (Math.floor(t) % 190) < 8; c.fillStyle = '#8EF0FF';
    if (blink) { c.fillRect(-17, -6, 12, 3); c.fillRect(5, -6, 12, 3); } else { c.beginPath(); c.arc(-11, -5, 5.5, 0, 6.3); c.arc(11, -5, 5.5, 0, 6.3); c.fill(); }
    c.strokeStyle = '#8EF0FF'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath();
    if (mood === 'happy') c.arc(0, 4, 8, 0.15 * Math.PI, 0.85 * Math.PI); else if (mood === 'wow') { c.arc(0, 7, 4, 0, 6.3); } else { c.moveTo(-6, 7); c.lineTo(6, 7); }
    c.stroke();
    c.strokeStyle = '#6D45F5'; c.lineWidth = 7; c.beginPath(); c.moveTo(34, 2); c.lineTo(56, mood === 'think' ? -8 : -18); c.stroke();
    c.fillStyle = '#FFC23A'; c.beginPath(); c.arc(58, mood === 'think' ? -9 : -20, 6, 0, 6.3); c.fill();
    c.restore();
  }

  /* ================= DATOS DE NIVELES ================= */
  function R(x, y, a, t) { return { type: t || 'rampa', x: x, y: y, a: a }; }
  function D(xs) { return xs.map(function (x) { return { type: 'domino', x: x, y: 524 }; }); }
  var START_LOW = [R(120, 470, 0.3), { type: 'canica', x: 70, y: 420 }];
  var LEVELS = [
    { id: 1, machine: 'plano', icon: 'rampa', name: 'Plano inclinado', kicker: 'Máquina simple 1',
      goal: 'Lleva la canica desde arriba hasta la campana que está sobre la repisa.',
      idea: 'Es una <b>superficie inclinada</b>, como una rampa. Ayuda a subir o bajar cosas con <b>menos esfuerzo</b>: la canica baja rodando sola.',
      parts: [['Inclinación', 'más inclinada = más rápido'], ['Recorrido', 'más larga = más suave']],
      examples: ['🛝 Tobogán', '♿ Rampa de entrada', '🚚 Rampa de camión', '⛰️ Camino de montaña'],
      fixed: [R(140, 150, 0.3), { type: 'canica', x: 90, y: 100 }, { type: 'plataforma', x: 860, y: 420, a: 0 }, { type: 'campana', x: 880, y: 366 }],
      solution: [R(330, 240, 0.3), R(530, 320, 0.3), R(720, 385, 0.2)], par: 3, recommend: ['rampa', 'rampaC'],
      c2: '📐 Una rampa llevó la canica en la cadena',
      hints: ['La canica cae por la primera rampa. ¿Dónde aterriza?', 'Pon rampas como escalones que bajan hacia la derecha.', 'Tres rampas en escalera, la última apuntando a la repisa, bastan.'],
      teach: ['Objetivo: el plano inclinado transforma una caída en un recorrido controlado.', 'Pregunta: ¿qué pasa si la rampa está más inclinada?', 'Solución de referencia: 3 rampas en escalera hacia la repisa.'] },
    { id: 2, machine: null, icon: 'domino', name: 'Dominós en cadena', kicker: 'Reacción en cadena',
      goal: 'La canica tumba los primeros dominós. Completa la fila hasta la campana.',
      idea: 'Cada ficha guarda energía al estar de pie. Cuando cae, <b>empuja a la siguiente</b> y la energía <b>viaja</b> por toda la fila.',
      parts: [['Distancia', 'ni muy juntos ni muy separados'], ['Altura', 'la ficha debe alcanzar a la siguiente']],
      examples: ['👉 Fila de dominós', '🧑‍🤝‍🧑 La ola en el estadio', '📚 Libros que caen'],
      fixed: START_LOW.concat(D([250, 290, 330])).concat([{ type: 'campana', x: 720, y: 514 }]),
      solution: D([370, 410, 450, 490, 530, 570, 610, 650]), par: 9, recommend: ['domino', 'domino5'],
      check2: function (s) { return countActivated(s, 'domino') >= 8; }, c2: '🎯 Cayeron 8 dominós o más',
      hints: ['Usa la "Fila de 5 dominós" para ir más rápido.', 'Deja más o menos un dedo de espacio entre fichas (unos 40 pasos del imán).', 'Sigue la fila hasta casi tocar la campana.'],
      teach: ['Objetivo: la energía se transmite de ficha en ficha.', 'Pregunta: ¿qué pasa si dejas un espacio muy grande?', 'Solución: dominós cada 40 px desde x=370 hasta x=650.'] },
    { id: 3, machine: 'palanca', icon: 'palanca', name: 'Palanca', kicker: 'Máquina simple 2',
      goal: 'Deja caer algo pesado sobre la palanca para lanzar la caja hasta la campana.',
      idea: 'Una <b>barra</b> que gira sobre un <b>punto de apoyo</b>. Si empujas fuerte un lado hacia abajo, <b>el otro lado sube</b> y puede lanzar cosas.',
      parts: [['Punto de apoyo', 'donde gira la barra'], ['Fuerza', 'lo que empuja hacia abajo'], ['Carga', 'lo que sube']],
      examples: ['🛝 Sube y baja', '✂️ Tijeras', '🔨 Sacaclavos', '🥄 Catapulta'],
      fixed: [{ type: 'palanca', x: 430, y: 505, a: -0.4 }, { type: 'caja', x: 345, y: 420 }, { type: 'campana', x: 350, y: 310, hang: true }],
      solution: [{ type: 'bola', x: 535, y: 120 }], par: 1, recommend: ['bola', 'caja'],
      c2: '⚖️ La palanca participó en la cadena',
      hints: ['¿Qué lado de la palanca está arriba?', 'Una bola pesada que cae con fuerza es la mejor "fuerza".', 'Pon la bola pesada muy arriba, justo sobre el extremo alto (derecho).'],
      teach: ['Objetivo: identificar punto de apoyo, fuerza y carga.', 'Pregunta: ¿por qué la caja sube si la bola baja?', 'Solución: bola pesada soltada desde arriba sobre el extremo derecho.'] },
    { id: 4, machine: 'rueda', icon: 'carrito', name: 'Rueda y eje', kicker: 'Máquina simple 3',
      goal: 'El carrito se cae de la repisa. Constrúyele un camino para que llegue rodando a la campana.',
      idea: 'Una <b>rueda</b> unida a un <b>eje</b> gira junta. Las ruedas hacen que mover cosas sea <b>mucho más fácil</b> que arrastrarlas.',
      parts: [['Rueda', 'gira y avanza'], ['Eje', 'la barra del centro']],
      examples: ['🚲 Bicicleta', '🛒 Carrito del súper', '🚪 Perilla de puerta', '🎡 Rueda de la fortuna'],
      fixed: [{ type: 'plataforma', x: 190, y: 380, a: 0.2 }, { type: 'carrito', x: 150, y: 320 }, { type: 'campana', x: 800, y: 514 }],
      solution: [R(375, 450, 0.3), R(560, 515, 0.25)], par: 2, recommend: ['rampa', 'rampaC'],
      c2: '🛞 El carrito (rueda y eje) llegó rodando',
      hints: ['Mira dónde se cae el carrito cuando juegas.', 'Pon una rampa justo debajo del borde de la repisa.', 'Dos rampas seguidas hasta el piso: así no se voltea.'],
      teach: ['Objetivo: la rueda reduce la fricción y facilita el movimiento.', 'Pregunta: ¿por qué el carrito se voltea si cae de golpe?', 'Solución: 2 rampas suaves desde el borde de la repisa hasta el piso.'] },
    { id: 5, machine: 'polea', icon: 'polea', name: 'Polea', kicker: 'Máquina simple 4',
      goal: 'Guía la bola pesada a la cubeta izquierda para que la derecha suba y toque la campana.',
      idea: 'Una <b>rueda con una cuerda</b>. Si un lado baja, <b>el otro sube</b>. Sirve para levantar cosas pesadas desde abajo.',
      parts: [['Rueda', 'la cuerda pasa por arriba'], ['Cuerda', 'une los dos lados'], ['Carga', 'lo que sube']],
      examples: ['🏗️ Grúa', '🚩 Asta de bandera', '🪣 Pozo de agua', '🛗 Ascensor'],
      fixed: [{ type: 'polea', x: 620, y: 190 }, R(120, 90, 0.3), { type: 'bola', x: 70, y: 40 }, { type: 'campana', x: 690, y: 200, hang: true }],
      solution: [R(330, 210, 0.25)], par: 1, recommend: ['rampa', 'rampaC'],
      c2: '🪢 La polea levantó la cubeta',
      hints: ['La bola cae muy cerca. Necesita un empujón hacia la derecha.', 'Una rampa debajo de la bola la lleva hacia la cubeta.', 'Pon una rampa suave cerca de x=330, y=210.'],
      teach: ['Objetivo: la polea cambia la dirección de la fuerza.', 'Pregunta: ¿qué pasaría si la carga fuera más pesada que la bola?', 'Solución: una rampa que deja caer la bola en la cubeta izquierda.'] },
    { id: 6, machine: 'cuna', icon: 'cuna', name: 'Cuña', kicker: 'Máquina simple 5',
      goal: 'La canica cae y se va para la derecha. Usa una cuña para desviarla hacia la campana de la izquierda.',
      idea: 'Una cuña son <b>dos planos inclinados juntos</b>. Sirve para <b>separar, levantar o desviar</b> cosas: lo que la golpea sale por su lado inclinado.',
      parts: [['Punta', 'separa o corta'], ['Lados inclinados', 'desvían el empuje']],
      examples: ['🪓 Hacha', '🔪 Cuchillo', '🚪 Tope de puerta', '🦷 Dientes'],
      fixed: [R(480, 120, 0.3, 'rampaC'), { type: 'canica', x: 440, y: 80 }, { type: 'campana', x: 330, y: 514 }],
      solution: [{ type: 'cuna', x: 620, y: 539 }], par: 1, recommend: ['cuna'],
      c2: '🔺 La cuña desvió la canica',
      hints: ['Juega una vez y mira dónde cae la canica.', 'Pon la cuña justo donde cae la canica, en el piso.', 'El lado inclinado debe bajar hacia la izquierda (usa ⇋ para voltearla).'],
      teach: ['Objetivo: la cuña cambia la dirección de una fuerza.', 'Pregunta: ¿qué pasa si volteas la cuña?', 'Solución: cuña en el piso bajo la caída (x≈620), lado inclinado hacia la izquierda.'] },
    { id: 7, machine: 'tornillo', icon: 'tornillo', name: 'Tornillo', kicker: 'Máquina simple 6',
      goal: 'La canica rueda por el piso. Súbela hasta la repisa de la campana.',
      idea: 'Un tornillo es un <b>plano inclinado enrollado</b> en espiral. El <b>tornillo de Arquímedes</b> gira y va subiendo cosas, ¡como agua o canicas!',
      parts: [['Espiral', 'una rampa enrollada'], ['Giro', 'hace subir la carga']],
      examples: ['🔩 Tornillos', '🫙 Tapa de frasco', '💧 Bomba de agua antigua', '🌀 Tobogán en espiral'],
      fixed: START_LOW.concat([{ type: 'plataforma', x: 560, y: 356, a: 0 }, { type: 'campana', x: 610, y: 306 }]),
      solution: [{ type: 'tornillo', x: 390, y: 426 }], par: 1, recommend: ['tornillo'],
      c2: '🌀 El tornillo subió la canica',
      hints: ['La canica necesita SUBIR, no bajar.', 'El tornillo atrapa lo que entra por abajo.', 'Pon el tornillo sobre el piso, antes de la repisa (x≈390).'],
      teach: ['Objetivo: reconocer el tornillo como plano inclinado enrollado.', 'Pregunta: ¿dónde has visto un tornillo que sube cosas?', 'Solución: tornillo apoyado en el piso cerca de x=390.'] },
    { id: 8, machine: 'resorte', icon: 'resorte', name: 'Resorte', kicker: 'Energía guardada',
      goal: 'Un muro tapa el camino. Haz que la canica salte por encima y toque la campana.',
      idea: 'Un resorte <b>guarda energía</b> cuando lo aplastas y la <b>suelta de golpe</b>. ¡Por eso rebotamos en el trampolín!',
      parts: [['Aplastar', 'guarda energía'], ['Soltar', 'lanza hacia arriba']],
      examples: ['🖊️ Bolígrafo', '🛏️ Colchón', '🤸 Trampolín', '🪀 Juguete saltarín'],
      fixed: START_LOW.concat([{ type: 'muro', x: 400, y: 491 }, { type: 'campana', x: 540, y: 514 }]),
      solution: [{ type: 'resorte', x: 320, y: 549 }], par: 1, recommend: ['resorte'],
      c2: '🟥 El resorte lanzó la canica',
      hints: ['La canica choca contra el muro. Necesita ir por arriba.', 'Pon el resorte en el piso, antes del muro.', 'Un resorte cerca de x=320 la hace saltar el muro.'],
      teach: ['Objetivo: energía guardada (elástica) que se convierte en movimiento.', 'Pregunta: ¿qué pasa si el resorte está más cerca del muro?', 'Solución: resorte en el piso cerca de x=320.'] },
    { id: 9, machine: null, icon: 'campana', name: '¡La Gran Máquina!', kicker: 'Reto final',
      goal: 'La campana cuelga muy alto. Combina al menos 3 máquinas simples en una sola cadena para hacerla sonar.',
      idea: 'Los inventores <b>combinan</b> máquinas simples para hacer máquinas complejas. Piensa: ¿qué máquina <b>sube</b> cosas? ¿Cuál <b>levanta</b> un lado cuando el otro baja?',
      parts: [['Planea', 'dibuja la cadena en tu mente'], ['Construye', 'pieza por pieza'], ['Prueba', 'y mejora']],
      examples: ['🏭 Fábricas', '🎢 Montaña rusa', '🚗 Autos', '⏰ Relojes'],
      fixed: START_LOW.concat([{ type: 'campana', x: 590, y: 200, hang: true }]),
      solution: [{ type: 'tornillo', x: 370, y: 426 }, { type: 'polea', x: 520, y: 200 }], par: 3, recommend: ['tornillo', 'polea', 'palanca', 'resorte'],
      check2: function (s) { return s.activatedMachines().length >= 3; }, c2: '⚙️ Usaste 3 máquinas simples distintas',
      hints: ['Idea: el tornillo puede subir la canica.', 'Si la canica cae en una cubeta de la polea, la otra cubeta sube.', 'Tornillo cerca de x=370 y polea con su rueda en x=520, y=200.'],
      teach: ['Objetivo: integrar varias máquinas simples (proyecto final).', 'Pide que explique cada paso: causa → efecto → resultado.', 'Referencia: plano inclinado + tornillo + polea que sube la cubeta hasta la campana.'] }
  ];
  var LIBRE = { id: 'libre', free: true, icon: 'campana', name: 'Taller de inventos', kicker: 'Paso 4 · Construcción libre',
    goal: 'Usa todas las piezas que quieras. Inventa tu propia máquina de Rube Goldberg y haz sonar la campana.',
    fixed: START_LOW.concat([{ type: 'campana', x: 880, y: 514 }]),
    solution: [{ type: 'tornillo', x: 250, y: 426 }, R(370, 340, 0.3), R(565, 425, 0.3)].concat(D([700, 740, 780, 820])), par: 99, recommend: [],
    hints: ['Empieza con una canica arriba y la campana al final.', 'Mezcla máquinas: una que suba, una que baje, una que lance.', 'Prueba seguido: juega, mira qué pasa y mejora una pieza a la vez.', 'Toca 👀 para ver una idea de ejemplo.'],
    teach: ['Espacio libre para crear. Pide que nombre las máquinas simples que usó.', 'Reto: una máquina con 5 pasos o más.', 'Evaluación sugerida: ¿puede explicar causa → efecto → resultado?'] };
  var DEMO_ITEMS = LIBRE.fixed.concat(LIBRE.solution);

  /* ---- idioma de niveles y piezas: el español es la base; el inglés viene de i18n.js ---- */
  var KEYS = ['name', 'kicker', 'goal', 'idea', 'parts', 'examples', 'c2', 'hints', 'teach'];
  var ALL_LV = LEVELS.concat([LIBRE]);
  var ES_LV = {}; ALL_LV.forEach(function (l) { var o = {}; KEYS.forEach(function (k) { if (l[k] !== undefined) o[k] = l[k]; }); ES_LV[l.id] = o; });
  var ES_PC = {}; Object.keys(PIECES).forEach(function (k) { ES_PC[k] = [PIECES[k].name, PIECES[k].desc]; });
  function localize() {
    var en = I.lang() === 'en';
    ALL_LV.forEach(function (l) { var src = en ? I.LV[l.id] : ES_LV[l.id]; KEYS.forEach(function (k) { if (src && src[k] !== undefined) l[k] = src[k]; }); });
    Object.keys(PIECES).forEach(function (k) { var src = en ? I.PC[k] : ES_PC[k]; if (src) { PIECES[k].name = src[0]; PIECES[k].desc = src[1]; } });
  }
  localize();

  var LABEL = { rampa: 'rampa', rampaC: 'rampa', palanca: 'palanca', rueda: 'rueda', carrito: 'rueda', polea: 'polea', cuna: 'cuna', tornillo: 'tornillo', resorte: 'resorte', domino: 'domino', soplador: 'soplador', cinta: 'cinta', cubeta: 'cubeta' };
  function lbl(type) { return LABEL[type] ? t('lbl_' + LABEL[type]) : null; }
  function countActivated(s, type) { var n = 0; Object.keys(s.activated).forEach(function (id) { var it = s.items.find(function (i) { return String(i.id) === id; }); if (it && it.type === type) n++; }); return n; }
  function itemCenter(s, it) { var b = s.itemBounds(it); return b ? { x: (b.minx + b.maxx) / 2, y: b.miny } : { x: it.x, y: it.y }; }
  function wireLabels(s, seen) {
    s.on.activate = function (it) { var tl = lbl(it.type); if (!tl || seen[it.type]) return; seen[it.type] = 1; var p = itemCenter(s, it); s.label(tl, p.x, Math.max(40, p.y - 12)); };
  }

  /* ================= PANTALLAS Y NAVEGACIÓN ================= */
  var App = { stage: null, screen: null };
  var SCREENS = { inicio: 's-inicio', maquina: 's-maquina', mapa: 's-mapa', nivel: 's-nivel' };
  function show(name) {
    Object.keys(SCREENS).forEach(function (k) { $(SCREENS[k]).hidden = k !== name; });
    App.screen = name;
  }
  function parseRoute() { var h = (location.hash || '#inicio').slice(1); if (h === 'libre') return { name: 'libre' }; var m = h.match(/^nivel-(\d+)$/); if (m) return { name: 'nivel', n: +m[1] }; if (SCREENS[h]) return { name: h }; return { name: 'inicio' }; }
  function route() {
    var r = parseRoute();
    if (App.leave) { App.leave(); App.leave = null; }
    closeModal(); hideToast();
    document.querySelectorAll('.tabs a').forEach(function (a) { var k = a.dataset.r; a.classList.toggle('on', k === r.name || (k === 'mapa' && r.name === 'nivel')); });
    $('backBtn').disabled = r.name === 'inicio'; $('backBtn').style.visibility = r.name === 'inicio' ? 'hidden' : 'visible';
    if (r.name === 'inicio') { show('inicio'); Intro.enter(); }
    else if (r.name === 'maquina') { show('maquina'); Demo.enter(); }
    else if (r.name === 'mapa') { show('mapa'); MapScreen.enter(); }
    else if (r.name === 'nivel') { var L = LEVELS.find(function (l) { return l.id === r.n; }) || LEVELS[0]; show('nivel'); Level.open(L); }
    else if (r.name === 'libre') { show('nivel'); Level.open(LIBRE); }
    window.scrollTo(0, 0);
  }
  function go(h) { if (location.hash === '#' + h) route(); else location.hash = h; }
  $('backBtn').addEventListener('click', function () {
    if (App.screen === 'nivel' && Level.handleBack()) return;
    var r = parseRoute(), parent = { maquina: 'inicio', mapa: 'maquina', nivel: 'mapa', libre: 'mapa' }[r.name];
    if (parent) go(parent);
  });
  window.addEventListener('hashchange', route);
  $('soundBtn').addEventListener('click', function () { var on = Sound.toggle(); this.textContent = on ? '🔊' : '🔇'; if (on) Sound.play('click'); });
  $('soundBtn').textContent = Sound.isOn() ? '🔊' : '🔇';
  $('themeBtn').addEventListener('click', function () { Theme.toggle(); });
  $('styleBtn').addEventListener('click', function () { Style.toggle(); });

  /* ================= 1. INTRO ================= */
  var Intro = (function () {
    var st = new E.Stage($('introCv'), { W: 1000, H: 340, floorH: 40, editable: false });
    var items = []; for (var i = 0; i < 10; i++) items.push({ type: 'domino', x: 360 + i * 38, y: 260 });
    st.setItems(items); st.settleAll();
    var mood = 'think', pushed = false, litTimer = [];
    st.on.sound = Sound.play;
    st.onOverlay = function (c) {
      drawChispa(c, 150, st.FLOOR - 70, 1.3, mood, st.clock);
      if (!pushed) { c.font = '700 20px Fredoka, sans-serif'; c.fillStyle = C().ink; c.fillText(t('pushHere'), 270, st.FLOOR - 150); c.font = '34px sans-serif'; c.fillText('👇', 318, st.FLOOR - 92); }
    };
    st.on.settled = function () { if (pushed) { mood = 'happy'; $('introBubble').setAttribute('data-i18n', 'bubbleDone'); $('introBubble').innerHTML = t('bubbleDone'); lightCards(); } };
    function push() {
      st.run(); pushed = true; mood = 'wow';
      var P = st.parts[st.items[0].id]; Body.setAngularVelocity(P.main, 0.06); Body.setVelocity(P.main, { x: 1.2, y: 0 }); Sound.play('pop');
    }
    function lightCards() { var cs = document.querySelectorAll('.ceecard'); cs.forEach(function (c) { c.classList.remove('lit'); }); litTimer.forEach(clearTimeout); litTimer = [];
      cs.forEach(function (c, i) { litTimer.push(setTimeout(function () { c.classList.add('lit'); Sound.play('click'); }, 400 + i * 700)); }); }
    var bubbleKey = 'bubble0', bubbleVars = null;
    function setBubble(k, v) { bubbleKey = k; bubbleVars = v || null; $('introBubble').setAttribute('data-i18n', k); $('introBubble').innerHTML = t(k, v); }
    function reset() { st.stop(); pushed = false; mood = 'think'; }
    document.querySelectorAll('[data-pred]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.dataset.pred; $('predWrap').hidden = true; $('introAfter').hidden = false;
        setBubble(p === 'todas' ? 'bubbleGood' : 'bubbleOther', { p: t(p === 'una' ? 'predOneTxt' : 'predNoneTxt') });
        push();
      });
    });
    $('introCv').addEventListener('pointerdown', function () { if (!pushed) { $('predWrap').hidden = true; $('introAfter').hidden = false; setBubble('bubblePushed'); push(); } });
    $('introAgain').addEventListener('click', function () { reset(); $('predWrap').hidden = false; $('introAfter').hidden = true; setBubble('bubbleAgain'); document.querySelectorAll('.ceecard').forEach(function (c) { c.classList.remove('lit'); }); });
    document.querySelectorAll('.ceecard').forEach(function (c) { c.addEventListener('click', function () { c.classList.toggle('lit'); Sound.play('click'); }); });
    $('toDemo').addEventListener('click', function () { go('maquina'); });
    return { stage: st, refresh: function () { reset(); $('predWrap').hidden = false; $('introAfter').hidden = true; document.querySelectorAll('.ceecard').forEach(function (c) { c.classList.remove('lit'); }); setBubble('bubble0'); }, enter: function () { App.stage = st; App.leave = function () { litTimer.forEach(clearTimeout); }; } };
  })();
  function C() { return E.colors; }

  /* ================= 2. DEMO ================= */
  var Demo = (function () {
    var st = new E.Stage($('demoCv'), { editable: false });
    var steps = [{ k: 'tornillo', t: 'step1' }, { k: 'plano', t: 'step2' }, { k: 'domino', t: 'step3' }, { k: 'campana', t: 'step4' }];
    var chain = $('chain'), slow = false, seen = {};
    steps.forEach(function (s, i) { if (i) { var a = document.createElement('span'); a.className = 'arr'; a.textContent = '→'; chain.appendChild(a); }
      var el = document.createElement('span'); el.className = 'step'; el.dataset.k = s.k; el.setAttribute('data-i18n', s.t); el.textContent = t(s.t); chain.appendChild(el); });
    function lit(k) { var el = chain.querySelector('[data-k="' + k + '"]'); if (el && !el.classList.contains('lit')) { el.classList.add('lit'); } }
    function load() { st.setItems(DEMO_ITEMS); st.settleAll(); }
    load();
    st.on.sound = Sound.play;
    st.on.mode = function (m) { var b = $('demoPlay'); if (m === 'run') { b.textContent = t('demoStop'); b.className = 'btn stop'; } else { b.textContent = t('demoOn'); b.className = 'btn go'; } };
    st.on.activate = function (it) {
      var k = { tornillo: 'tornillo', rampa: 'plano', domino: 'domino' }[it.type]; if (k) lit(k);
      var tl = lbl(it.type); if (tl && !seen[it.type]) { seen[it.type] = 1; var p = itemCenter(st, it); st.label(tl, p.x, Math.max(40, p.y - 12)); }
    };
    st.on.win = function () { lit('campana'); $('demoMsg').textContent = t('demoWin'); Sound.play('win'); confetti(); };
    $('demoPlay').addEventListener('click', function () {
      if (st.mode === 'run') { st.stop(); resetChain(); $('demoMsg').textContent = ''; return; }
      resetChain(); seen = {}; st.run(); Sound.play('start'); $('demoMsg').textContent = t('demoFollow');
    });
    $('demoSlow').addEventListener('click', function () { slow = !slow; st.slow = slow; this.textContent = t(slow ? 'demoNormal' : 'demoSlow'); });
    $('toMap').addEventListener('click', function () { go('mapa'); });
    function resetChain() { chain.querySelectorAll('.step').forEach(function (e) { e.classList.remove('lit'); }); }
    return { stage: st, refresh: function () { st.on.mode(st.mode); $('demoSlow').textContent = t(slow ? 'demoNormal' : 'demoSlow'); }, enter: function () { App.stage = st; App.leave = function () { if (st.mode === 'run') st.stop(); resetChain(); $('demoMsg').textContent = ''; }; } };
  })();

  /* ================= 3. MAPA ================= */
  var MapScreen = (function () {
    var pos = [[8, 74], [19, 40], [30, 74], [41, 40], [52, 74], [63, 40], [74, 74], [85, 40], [92, 76]];
    var built = false;
    function stars() { return store.get('stars', {}); }
    function build() {
      var map = $('map'), list = $('mapList'); map.innerHTML = ''; list.innerHTML = '';
      var svgNS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('class', 'path'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
      var d = 'M' + pos[0][0] + ' ' + pos[0][1]; for (var i = 1; i < pos.length; i++) { var p0 = pos[i - 1], p1 = pos[i], mx = (p0[0] + p1[0]) / 2; d += ' C' + mx + ' ' + p0[1] + ' ' + mx + ' ' + p1[1] + ' ' + p1[0] + ' ' + p1[1]; }
      ['rgba(255,255,255,.75)', 'rgba(120,80,30,.35)'].forEach(function (col, k) { var path = document.createElementNS(svgNS, 'path'); path.setAttribute('d', d); path.setAttribute('fill', 'none'); path.setAttribute('stroke', col); path.setAttribute('stroke-width', k ? '3' : '12'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('vector-effect', 'non-scaling-stroke'); if (k) path.setAttribute('stroke-dasharray', '2 10'); svg.appendChild(path); });
      map.appendChild(svg); var sign = document.createElement('div'); sign.className = 'sign'; sign.textContent = t('mapSign'); map.appendChild(sign);
      var S = stars(), next = LEVELS.find(function (l) { return !S[l.id]; });
      LEVELS.forEach(function (L, i) {
        var s = S[L.id] || 0, b = document.createElement('button'); b.className = 'station' + (next === L ? ' next' : '') + (L.id === 9 ? ' big' : '');
        b.style.left = pos[i][0] + '%'; b.style.top = pos[i][1] + '%'; b.setAttribute('aria-label', t('mapAria', { n: L.id, name: L.name, s: s }));
        var disk = document.createElement('span'); disk.className = 'disk'; disk.appendChild(icon(L.icon));
        var num = document.createElement('span'); num.className = 'num'; num.textContent = L.id; disk.appendChild(num);
        var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = L.name;
        var st = document.createElement('span'); st.className = 'st'; st.textContent = '★'.repeat(s) + '☆'.repeat(3 - s);
        b.appendChild(disk); b.appendChild(nm); b.appendChild(st); b.addEventListener('click', function () { go('nivel-' + L.id); }); map.appendChild(b);
        var li = document.createElement('li'), lb = document.createElement('button'); lb.appendChild(icon(L.icon));
        var tt = document.createElement('span'); tt.className = 't'; tt.innerHTML = '<b>' + L.id + '. ' + L.name + '</b><span class="muted">' + L.kicker + '</span>'; lb.appendChild(tt);
        var s2 = document.createElement('span'); s2.style.color = 'var(--star)'; s2.textContent = '★'.repeat(s) + '☆'.repeat(3 - s); lb.appendChild(s2);
        lb.addEventListener('click', function () { go('nivel-' + L.id); }); li.appendChild(lb); list.appendChild(li);
      });
      var done = LEVELS.filter(function (l) { return S[l.id]; }).length, tot = LEVELS.reduce(function (a, l) { return a + (S[l.id] || 0); }, 0);
      $('progTxt').textContent = t('progTxt', { d: done, t: LEVELS.length, s: tot }); $('progBar').style.width = (done / LEVELS.length * 100) + '%';
    }
    return { enter: function () { build(); App.stage = null; } };
  })();

  /* ================= 4. NIVEL / EDITOR ================= */
  var Level = (function () {
    var cv = $('lvCv'), st = new E.Stage(cv, { editable: true });
    var L = null, undo = [], armed = null, drag = null, pal = null, watching = null, hintI = 0, seen = {}, snapOn = store.get('snap', true), resetArm = 0, chip = null;
    st.on.sound = Sound.play;
    wireLabels(st, seen);
    st.on.mode = function (m) {
      var b = $('playBtn');
      if (m === 'run') { b.textContent = t('stop'); b.className = 'btn stop'; $('hudMode').textContent = t('running'); }
      else { b.textContent = t('play'); b.className = 'btn go'; $('hudMode').textContent = watching ? t('exampleMode') : t('designMode'); }
      updateSel();
    };
    st.on.win = function () {
      if (watching) { msg(t('watchWin')); Sound.play('win'); return; }
      Sound.play('win'); confetti();
      var r = L.free ? null : score(); if (r) { var S = store.get('stars', {}); if (!S[L.id] || r.s > S[L.id]) { S[L.id] = r.s; store.set('stars', S); } }
      setTimeout(function () { if (App.screen === 'nivel') winModal(r); }, 1300);
    };
    st.on.settled = function (won) {
      if (won || watching) return;
      Sound.play('fail'); msg(t('lvFail'));
      toast(t('lvFailToast'), t('lvFailBtn'), function () { stopRun(); }, 7000);
    };

    function msg(t) { $('lvMsg').innerHTML = t || '&nbsp;'; }
    function added() { return st.items.filter(function (i) { return i.added; }).length; }
    function hud() { var n = added(); $('hudCount').textContent = t(n === 1 ? 'piece1' : 'pieceN', { n: n }); }
    function save() { if (!watching && L) store.set('design-' + L.id, st.getItems()); }
    function changed() { save(); hud(); updateSel(); }
    function pushUndo() { undo.push(JSON.stringify(st.items)); if (undo.length > 80) undo.shift(); }
    function snap(v) { return snapOn ? Math.round(v / 5) * 5 : Math.round(v); }
    function editable() {
      if (watching) { toast(t('watchingEx')); return false; }
      if (st.mode === 'run') { toast(t('stopFirst'), t('stop'), stopRun); return false; }
      return true;
    }
    function stopRun() { if (st.mode === 'run') { st.stop(); hideToast(); msg(t('backToDesign')); } }
    function startRun() { if (st.mode === 'run') return; closeLearn(); seen = {}; wireLabels(st, seen); st.sel = null; st.run(); Sound.play('start'); msg(t('followChain')); }

    /* ----- abrir nivel ----- */
    function open(level) {
      if (watching) endWatch(true);
      if (st.mode === 'run') st.stop();
      L = level; undo = []; armed = null; drag = null; hintI = 0; resetArm = 0; st.sel = null;
      var saved = store.get('design-' + L.id, null);
      st.setItems(saved || L.fixed.map(function (x) { return Object.assign({}, x); })); if (!saved) st.settleAll();
      $('lvNum').textContent = L.free ? '★' : L.id; $('lvKicker').textContent = L.kicker; $('lvName').textContent = L.free ? L.name : t('levelN', { n: L.id, name: L.name }); $('lvGoal').textContent = '🎯 ' + L.goal;
      $('learnBtn').hidden = !!L.free; $('solBtn').textContent = L.free ? t('example') : t('solution');
      ctlTexts(); buildPalette(); hud(); updateSel();
      $('teachBody').innerHTML = '<ul>' + L.teach.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';
      msg(saved ? t('savedDesign') : t('startMsg'));
      if (!L.free) showLearn(); else closeLearn();
      App.stage = st; App.leave = function () { if (watching) endWatch(true); if (st.mode === 'run') st.stop(); closeLearn(); endPaletteDrag(); };
    }

    /* ----- aprender ----- */
    function showLearn() {
      var box = $('learnBox'); box.innerHTML = '';
      var top = document.createElement('div'); top.className = 'top'; var ic = document.createElement('div'); ic.className = 'ic'; ic.appendChild(icon(L.icon)); top.appendChild(ic);
      var h = document.createElement('div'); h.innerHTML = '<span class="eyebrow">' + L.kicker + '</span><h2>' + L.name + '</h2>'; top.appendChild(h); box.appendChild(top);
      var rest = document.createElement('div');
      rest.innerHTML = '<p class="idea">' + L.idea + '</p>' +
        '<div class="parts">' + L.parts.map(function (p) { return '<div><b>' + p[0] + '</b><br>' + p[1] + '</div>'; }).join('') + '</div>' +
        '<p style="margin:10px 0 2px"><b style="font-family:Fredoka,Nunito,sans-serif">' + t('foundIn') + '</b></p><div class="chips">' + L.examples.map(function (e) { return '<span>' + e + '</span>'; }).join('') + '</div>' +
        '<p class="muted" style="margin-top:10px">' + t('yourGoal').replace(/^(\S+) (.*)$/, '$1 <b>$2</b>') + ' ' + L.goal + '</p>' +
        '<div class="row" style="margin-top:12px"><button class="btn go" id="lGo">' + t('goBuild') + '</button><button class="btn soft" id="lWatch">' + t('watchWork') + '</button></div>';
      box.appendChild(rest); $('learn').hidden = false;
      $('lGo').onclick = function () { closeLearn(); Sound.play('click'); }; $('lWatch').onclick = function () { closeLearn(); watch(); };
      setTimeout(function () { var g = $('lGo'); if (g) g.focus(); }, 50);
    }
    function closeLearn() { $('learn').hidden = true; }

    /* ----- ver solución ----- */
    function watch() {
      if (watching) return; if (st.mode === 'run') st.stop();
      watching = { items: st.getItems(), undo: undo.slice() }; st.sel = null; armed = null; refreshPalette();
      st.setItems(L.fixed.map(function (x) { return Object.assign({}, x); }).concat(L.solution.map(function (x) { return Object.assign({ added: true }, x); }))); st.settleAll();
      $('watchBar').hidden = false; $('hudMode').textContent = t('exampleMode'); msg(t('howSolve')); hud(); updateSel();
      setTimeout(function () { if (watching && st.mode !== 'run') { seen = {}; wireLabels(st, seen); st.run(); } }, 700);
    }
    function endWatch(silent) {
      if (!watching) return; if (st.mode === 'run') st.stop();
      st.setItems(watching.items); undo = watching.undo; watching = null; $('watchBar').hidden = true; st.on.mode('edit'); hud(); updateSel();
      if (!silent) msg(t('backMine'));
    }
    $('watchEnd').addEventListener('click', function () { endWatch(); });

    /* ----- puntuación ----- */
    function score() {
      var ok2 = L.check2 ? L.check2(st) : (L.machine ? st.activatedMachines().indexOf(L.machine) >= 0 : true);
      var n = added(), ok3 = ok2 && n <= L.par;
      return { s: 1 + (ok2 ? 1 : 0) + (ok3 ? 1 : 0), crit: [[true, t('crit1')], [ok2, L.c2], [ok3, t('crit3', { par: L.par, pz: t(L.par === 1 ? 'pzOne' : 'pzMany'), n: n })]] };
    }
    function winModal(r) {
      if (!r) {
        var used = st.activatedMachines().map(function (m) { return { plano: t('m_plano'), palanca: t('m_palanca'), rueda: t('m_rueda'), polea: t('m_polea'), cuna: t('m_cuna'), tornillo: t('m_tornillo'), resorte: t('m_resorte') }[m]; }).filter(Boolean);
        modal('<div style="font-size:56px">🏆</div><h2>' + t('mWorks') + '</h2><p class="muted">' + t('mUsed') + '</p><div class="chips" style="justify-content:center">' + (used.length ? used.map(function (u) { return '<span>' + u + '</span>'; }).join('') : '<span>' + t('mCreative') + '</span>') + '</div>' +
          '<div class="row" style="justify-content:center;margin-top:16px"><button class="btn go" id="mKeep">' + t('mKeep') + '</button><button class="btn soft" id="mMap">' + t('mMap') + '</button></div>',
          function () { $('mKeep').onclick = function () { closeModal(); stopRun(); }; $('mMap').onclick = function () { closeModal(); go('mapa'); }; });
        return;
      }
      var nextL = LEVELS.find(function (l) { return l.id === L.id + 1; });
      var starsHtml = [0, 1, 2].map(function (i) { return '<span class="' + (i < r.s ? '' : 'off') + '">★</span>'; }).join('');
      modal('<h2>' + (r.s === 3 ? t('mPerfect') : t('mDone')) + '</h2><div class="stars">' + starsHtml + '</div>' +
        '<ul class="mcrit">' + r.crit.map(function (c) { return '<li>' + (c[0] ? '✅ ' : '⬜ ') + c[1] + '</li>'; }).join('') + '</ul>' +
        '<div class="row" style="justify-content:center;margin-top:12px">' + (nextL ? '<button class="btn go" id="mNext">' + t('mNext') + '</button>' : '<button class="btn go" id="mFree">' + t('mFree') + '</button>') +
        '</div><div class="row" style="justify-content:center;margin-top:10px"><button class="btn soft sm" id="mRetry">' + t('mRetry') + '</button><button class="btn soft sm" id="mMap">' + t('mMapBtn') + '</button></div>',
        function () {
          if ($('mNext')) $('mNext').onclick = function () { closeModal(); go('nivel-' + nextL.id); };
          if ($('mFree')) $('mFree').onclick = function () { closeModal(); go('libre'); };
          $('mRetry').onclick = function () { closeModal(); stopRun(); }; $('mMap').onclick = function () { closeModal(); go('mapa'); };
        });
    }

    /* ----- paleta ----- */
    var CATS = [['cat1', ['rampa', 'rampaC', 'palanca', 'rueda', 'carrito', 'polea', 'cuna', 'tornillo']], ['cat2', ['canica', 'bola', 'domino', 'domino5', 'caja']],
      ['cat3', ['plataforma', 'muro', 'resorte', 'soplador', 'cinta', 'cubeta']], ['cat4', ['campana']]];
    function pname(ty) { return ty === 'domino5' ? t('domino5') : PIECES[ty].name; }
    function pdesc(ty) { return ty === 'domino5' ? t('domino5d') : PIECES[ty].desc; }
    function buildPalette() {
      var p = $('palette'); p.innerHTML = '';
      CATS.forEach(function (cat) {
        var h = document.createElement('h3'); h.textContent = t(cat[0]); p.appendChild(h);
        var g = document.createElement('div'); g.className = 'pgrid';
        cat[1].forEach(function (t) {
          var b = document.createElement('button'); b.className = 'piece' + (L.recommend.indexOf(t) >= 0 ? ' rec' : ''); b.dataset.type = t; b.title = pdesc(t);
          b.setAttribute('aria-label', pname(t) + ': ' + pdesc(t)); b.appendChild(icon(t)); var s = document.createElement('span'); s.textContent = pname(t); b.appendChild(s);
          b.addEventListener('pointerdown', paletteDown); b.addEventListener('pointermove', paletteMove); b.addEventListener('pointerup', paletteUp); b.addEventListener('pointercancel', endPaletteDrag);
          b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!editable()) return; placeAt(t, st.W / 2, 200); } });
          g.appendChild(b);
        });
        p.appendChild(g);
      });
    }
    function refreshPalette() { document.querySelectorAll('.piece').forEach(function (b) { b.classList.toggle('armed', b.dataset.type === armed); }); }
    function worldFrom(e) { var r = cv.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null; return { x: (e.clientX - r.left) / r.width * st.W, y: (e.clientY - r.top) / r.height * st.H }; }
    function paletteDown(e) { if (e.button > 0) return; var t = this.dataset.type; pal = { type: t, x0: e.clientX, y0: e.clientY, moved: false, el: this }; try { this.setPointerCapture(e.pointerId); } catch (_) { } }
    function paletteMove(e) {
      if (!pal) return;
      if (!pal.moved && Math.hypot(e.clientX - pal.x0, e.clientY - pal.y0) > 7) { pal.moved = true; chip = document.createElement('div'); chip.className = 'dragchip'; var ic = document.createElement('canvas'); ic.dataset.type = pal.type; paintIcon(ic); chip.appendChild(ic); document.body.appendChild(chip); }
      if (pal.moved) { chip.style.left = e.clientX + 'px'; chip.style.top = e.clientY + 'px'; var w = worldFrom(e); st.ghost = w && st.mode === 'edit' && !watching ? { type: pal.type === 'domino5' ? 'domino' : pal.type, x: w.x, y: w.y } : null; chip.style.opacity = st.ghost ? '0' : '1'; }
    }
    function paletteUp(e) {
      if (!pal) return; var p = pal; endPaletteDrag();
      if (p.moved) { var w = worldFrom(e); if (w && editable()) placeAt(p.type, w.x, w.y); }
      else { armed = armed === p.type ? null : p.type; refreshPalette(); Sound.play('click'); if (armed) msg(t('armedMsg', { n: pname(armed), d: pdesc(armed) })); else msg(''); }
    }
    function endPaletteDrag() { pal = null; st.ghost = null; if (chip) { chip.remove(); chip = null; } }
    function placeAt(ty, x, y) {
      pushUndo(); var it;
      if (ty === 'domino5') { for (var k = 0; k < 5; k++) it = st.addItem('domino', snap(x + k * 40), snap(y)); }
      else it = st.addItem(ty, snap(x), snap(y));
      st.sel = it; Sound.play('pop'); changed(); closeLearn();
      if (ty === 'campana' || ty === 'canica') msg(t('placedMsg', { n: pname(ty).toLowerCase() }));
    }

    /* ----- mesa: seleccionar, mover, colocar ----- */
    cv.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return; var p = worldFrom(e); if (!p) return;
      if (st.mode === 'run' || watching) { editable(); return; }
      var it = st.hit(p.x, p.y);
      if (it) { st.sel = it; drag = { it: it, dx: p.x - it.x, dy: p.y - it.y, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (_) { } Sound.play('click'); }
      else if (armed) { placeAt(armed, p.x, p.y); }
      else st.sel = null;
      updateSel();
    });
    cv.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect(), p = { x: (e.clientX - r.left) / r.width * st.W, y: (e.clientY - r.top) / r.height * st.H };
      if (drag) { if (!drag.moved) { if (Math.hypot(p.x - drag.dx - drag.it.x, p.y - drag.dy - drag.it.y) < 3) return; pushUndo(); drag.moved = true; }
        st.moveItem(drag.it, snap(p.x - drag.dx), snap(p.y - drag.dy)); updateSel(); return; }
      if (st.mode === 'edit' && !watching) { var h = st.hit(p.x, p.y); cv.style.cursor = h ? 'grab' : (armed ? 'copy' : 'default'); }
    });
    function endDrag() { if (drag) { if (drag.moved) { st.settle(drag.it); changed(); } drag = null; } }
    cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
    cv.addEventListener('wheel', function (e) { if (!st.sel || st.mode !== 'edit' || watching) return; if (!PIECES[st.sel.type].rot) return; e.preventDefault(); pushUndo(); st.rotateItem(st.sel, e.deltaY > 0 ? 1 : -1); changed(); }, { passive: false });

    /* ----- barra de selección ----- */
    function updateSel() {
      var bar = $('selbar'), it = st.sel;
      if (!it || st.mode !== 'edit' || watching || st.items.indexOf(it) < 0) { bar.hidden = true; return; }
      var d = PIECES[it.type], bb = st.itemBounds(it); if (!bb) { bar.hidden = true; return; }
      $('rotL').hidden = $('rotR').hidden = !d.rot; $('flipB').hidden = !d.flipMode;
      var r = cv.getBoundingClientRect(), sx = r.width / st.W, sy = r.height / st.H, cx = (bb.minx + bb.maxx) / 2 * sx, top = bb.miny * sy - 12;
      bar.hidden = false; cx = Math.max(90, Math.min(r.width - 90, cx));
      if (top < 60) { bar.style.transform = 'translate(-50%,0)'; top = bb.maxy * sy + 12; } else bar.style.transform = 'translate(-50%,-100%)';
      bar.style.left = cx + 'px'; bar.style.top = Math.min(top, r.height - 10) + 'px';
    }
    function act(fn) { return function () { if (!st.sel || !editable()) return; pushUndo(); fn(st.sel); changed(); Sound.play('click'); }; }
    $('rotL').addEventListener('click', act(function (it) { st.rotateItem(it, -1); }));
    $('rotR').addEventListener('click', act(function (it) { st.rotateItem(it, 1); }));
    $('flipB').addEventListener('click', act(function (it) { st.flipItem(it); }));
    $('delB').addEventListener('click', act(function (it) { st.removeItem(it); Sound.play('del'); }));
    window.addEventListener('resize', updateSel);

    /* ----- controles ----- */
    $('playBtn').addEventListener('click', function () { if (st.mode === 'run') { stopRun(); if (watching) st.on.mode('edit'); } else { if (watching) { st.run(); return; } startRun(); } });
    $('undoBtn').addEventListener('click', function () { if (!editable()) return; var u = undo.pop(); if (!u) { toast(t('nothingUndo')); return; } st.setItems(JSON.parse(u)); st.sel = null; changed(); Sound.play('click'); });
    $('clearBtn').addEventListener('click', function () { if (!editable()) return; if (!added()) { toast(t('noPieces')); return; } pushUndo(); st.items.filter(function (i) { return i.added; }).forEach(function (i) { st.removeItem(i); }); changed(); Sound.play('del'); msg(t('removedMsg')); });
    $('resetBtn').addEventListener('click', function () {
      if (watching) endWatch(true); if (st.mode === 'run') st.stop();
      var now = Date.now(); if (now - resetArm > 3500) { resetArm = now; this.textContent = t('resetSure'); var self = this; setTimeout(function () { self.textContent = t('reset'); }, 3500); return; }
      resetArm = 0; this.textContent = t('reset'); pushUndo(); store.del('design-' + L.id); st.setItems(L.fixed.map(function (x) { return Object.assign({}, x); })); st.settleAll(); st.sel = null; changed(); msg(t('resetMsg'));
    });
    $('slowBtn').addEventListener('click', function () { st.slow = !st.slow; this.textContent = t(st.slow ? 'normal' : 'slow'); });
    $('snapBtn').addEventListener('click', function () { snapOn = !snapOn; store.set('snap', snapOn); this.textContent = t('snap', { v: t(snapOn ? 'yes' : 'no') }); });
    function ctlTexts() { $('resetBtn').textContent = t('reset'); $('slowBtn').textContent = t(st.slow ? 'normal' : 'slow'); $('snapBtn').textContent = t('snap', { v: t(snapOn ? 'yes' : 'no') }); $('playBtn').textContent = t(st.mode === 'run' ? 'stop' : 'play'); }
    ctlTexts();
    $('learnBtn').addEventListener('click', function () { if (watching) endWatch(true); if (st.mode === 'run') st.stop(); showLearn(); });
    $('hintBtn').addEventListener('click', function () { var h = L.hints[Math.min(hintI, L.hints.length - 1)]; msg('💡 ' + h); hintI++; if (hintI > L.hints.length) msg('💡 ' + h + t('hintSolution')); Sound.play('click'); });
    $('solBtn').addEventListener('click', function () { closeLearn(); watch(); });

    /* ----- teclado ----- */
    window.addEventListener('keydown', function (e) {
      if (App.screen !== 'nivel' || !$('modal').hidden) return;
      var tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'Escape') { if (!$('learn').hidden) closeLearn(); else if (watching) endWatch(); else { st.sel = null; armed = null; refreshPalette(); updateSel(); } return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); $('undoBtn').click(); return; }
      if (e.key === ' ' && tag !== 'button') { e.preventDefault(); $('playBtn').click(); return; }
      if (!st.sel) return;
      var k = e.key.toLowerCase();
      if (k === 'r') $('rotR').click(); else if (k === 'e') $('rotL').click(); else if (k === 'f') $('flipB').click();
      else if (k === 'delete' || k === 'backspace') { e.preventDefault(); $('delB').click(); }
      else if (k.indexOf('arrow') === 0 && editable()) { e.preventDefault(); var dx = k === 'arrowleft' ? -5 : k === 'arrowright' ? 5 : 0, dy = k === 'arrowup' ? -5 : k === 'arrowdown' ? 5 : 0; pushUndo(); st.moveItem(st.sel, st.sel.x + dx, st.sel.y + dy); changed(); }
    });

    return {
      open: open, stage: st,
      handleBack: function () { if (!$('learn').hidden) { closeLearn(); return true; } if (watching) { endWatch(); return true; } if (st.mode === 'run') { stopRun(); return true; } return false; },
      _test: { watch: watch, endWatch: endWatch, score: score, levels: LEVELS, libre: LIBRE }
    };
  })();

  /* ================= BUCLE ================= */
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(64, now - last); last = now; var s = App.stage;
    if (s) { try { s.tick(dt); s.draw(); } catch (err) { if (window.console) console.error(err); } }
    requestAnimationFrame(frame);
  }
  var started = false;
  I.onChange(function () {
    localize(); if (!started) return;
    Teacher.setOn(Teacher.isOn());
    route();
    if (App.screen === 'inicio') Intro.refresh(); else if (App.screen === 'maquina') Demo.refresh();
  });
  I.mount();
  Style.apply(false);
  I.apply();
  route();
  started = true;
  requestAnimationFrame(frame);
  window.MLC = { App: App, Level: Level, LEVELS: LEVELS, LIBRE: LIBRE, DEMO_ITEMS: DEMO_ITEMS, Stage: E.Stage, go: go };
})();
