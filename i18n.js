/* Idiomas (es / en). Idioma en localStorage 'labs-lang'. t(clave, vars) con {x}.
   Los textos de niveles y piezas en español viven en app.js / engine.js; aquí solo la traducción al inglés. */
(function () {
  'use strict';
  var D = { es: {}, en: {} }, L = 'es', cbs = [];
  function read() { try { return localStorage.getItem('labs-lang'); } catch (e) { return null; } }
  function detect() { var s = read(); if (s === 'es' || s === 'en') return s; return (navigator.language || 'es').toLowerCase().indexOf('en') === 0 ? 'en' : 'es'; }
  L = detect();
  function t(k, v) {
    var s = D[L] && D[L][k]; if (s === undefined) s = D.es[k] !== undefined ? D.es[k] : k;
    if (v) for (var x in v) s = s.split('{' + x + '}').join(v[x]);
    return s;
  }
  function apply() {
    document.documentElement.lang = L;
    document.querySelectorAll('[data-i18n]').forEach(function (e) { e.innerHTML = t(e.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (e) {
      e.getAttribute('data-i18n-attr').split(';').forEach(function (par) { var p = par.split(':'); if (p.length === 2) e.setAttribute(p[0].trim(), t(p[1].trim())); });
    });
    document.title = t('titulo');
    var meta = document.querySelector('meta[name="description"]'); if (meta) meta.setAttribute('content', t('descripcion'));
    document.querySelectorAll('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-l') === L)); });
    cbs.forEach(function (f) { try { f(L); } catch (e) { console.error(e); } });
  }
  function set(l) { if (l !== 'es' && l !== 'en') return; L = l; try { localStorage.setItem('labs-lang', l); } catch (e) { } apply(); }
  function mount() { document.querySelectorAll('.lang button').forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-l')); }); }); }

  D.es = {
    titulo: 'Máquinas Locas de Chispa', descripcion: 'Juego para aprender reacciones en cadena y las máquinas simples construyendo máquinas de Rube Goldberg con física real.',
    back: 'Atrás', home: 'Inicio', brand: 'Máquinas Locas', sections: 'Secciones', tab1: 'Reacción en cadena', tab2: 'La máquina', tab3: 'Aprende', tab4: 'Construye', sound: 'Sonido', theme: 'Cambiar tema', style: 'Estilo: onírico o natural',
    s1eyebrow: 'Paso 1 · ¿Qué es una reacción en cadena?',
    bubble0: '¡Hola! Soy <b>Chispa</b> ⚡. Mira esta fila de dominós. Si empujo <b>solo el primero</b>… ¿qué crees que pasará?',
    introCv: 'Fila de diez dominós listos para caer', predAll: '✅ Caerán todas', predOne: 'Solo caerá la primera', predNone: 'No pasará nada',
    cee1t: '1. CAUSA', cee1d: 'Algo empieza el movimiento: empujé la primera ficha.', cee2t: '2. EFECTO', cee2d: 'Cada ficha empuja a la siguiente. ¡La energía viaja!', cee3t: '3. RESULTADO', cee3d: 'Al final pasa algo: ¡caen todas!',
    toDemo: 'Ver una máquina de Goldberg →', again: '↺ Otra vez', forTeacher: 'Para el profe',
    teach1: '<li><b>Objetivo:</b> reconocer la secuencia causa → efecto → resultado.</li><li>Pide que <b>prediga</b> antes de empujar y que explique por qué acertó o no.</li><li>Pregunta: “¿qué pasaría si quitamos una ficha del medio?” (la cadena se rompe).</li>',
    pushHere: '¡Empuja aquí!', bubbleDone: '¡Cayeron <b>todas</b>! Solo empujé una ficha, pero cada una empujó a la siguiente. Eso es una <b>reacción en cadena</b>. Toca las tarjetas 👇',
    bubbleGood: '¡Buena predicción! Vamos a comprobarlo… 👀', bubbleOther: '¡Hmm! Tú dijiste <b>{p}</b>. Vamos a comprobarlo… 👀', predOneTxt: 'solo la primera', predNoneTxt: 'nada',
    bubblePushed: '¡Empujaste la primera! Mira lo que pasa… 👀', bubbleAgain: '¡Otra vez! Si empujo <b>solo el primero</b>… ¿qué crees que pasará?',
    s2eyebrow: 'Paso 2 · La máquina de Rube Goldberg', s2h: 'Mucho trabajo para algo muy simple',
    s2p: 'Rube Goldberg dibujaba máquinas complicadísimas que hacían cosas sencillas. Esta hace sonar una campana 🔔 usando una <b>cadena de máquinas</b>. Enciéndela y mira cómo se ilumina cada paso.',
    demoCv: 'Máquina de Goldberg: tornillo, rampas, dominós y campana', demoOn: '▶ Encender', demoSlow: '🐢 Cámara lenta', demoNormal: '🐇 Velocidad normal', demoStop: '■ Detener', toMap: 'Aprender las máquinas →',
    teach2: '<li>Pausa con cámara lenta y pide que nombre cada paso de la cadena.</li><li>Pregunta: “¿cuál es la causa inicial y cuál el resultado final?”.</li><li>Anticipa: cada pieza es una <b>máquina simple</b>; en el paso 3 las aprenderá una por una.</li>',
    step1: '🌀 Tornillo sube la canica', step2: '📐 Rampas', step3: '⚡ Dominós', step4: '🔔 ¡Campana!',
    demoWin: '¡RIIING! 🔔 Una cadena de máquinas hizo algo muy simple: tocar una campana.', demoFollow: 'Sigue la canica con los ojos… 👀',
    s3eyebrow: 'Paso 3 · El camino del inventor', s3h: 'Aprende cada máquina simple', s3p: 'Cada parada tiene una idea corta y un reto. Todas están abiertas: ve en orden o salta a la que quieras.', progress: 'Tu progreso',
    mapSign: '🧭 Camino del inventor', mapAria: 'Nivel {n}: {name}, {s} estrellas', progTxt: '{d} de {t} máquinas · {s} ★',
    learn: '📖 Aprender', hint: '💡 Pista', solution: '👀 Ver solución', example: '👀 Ver un ejemplo', levelN: 'Nivel {n} · {name}',
    lvCv: 'Mesa de trabajo para construir la máquina', designMode: '✏️ Modo diseño', running: '▶ En marcha', exampleMode: '👀 Ejemplo',
    piece1: '🧩 {n} pieza agregada', pieceN: '🧩 {n} piezas agregadas',
    rotL: 'Girar a la izquierda', rotLt: 'Girar (E)', rotR: 'Girar a la derecha', rotRt: 'Girar (R)', flip: 'Voltear', flipt: 'Voltear (F)', del: 'Borrar pieza', delt: 'Borrar (Supr)',
    watching: '👀 Mirando cómo funciona', watchEnd: 'Volver a mi diseño', play: '▶ Jugar', stop: '■ Detener', undo: '↶ Deshacer', clear: '🧹 Quitar mis piezas', reset: '⟳ Reiniciar nivel', resetSure: '⟳ ¿Seguro? Toca otra vez',
    slow: '🐢 Lento', normal: '🐇 Normal', snap: '🧲 Imán: {v}', yes: 'sí', no: 'no', palette: 'Piezas para construir',
    footer: 'Máquinas Locas de Chispa · física real con Matter.js · construye, prueba y mejora', teacherLock: '🔒 Modo profe', teacherOn: '🔓 Modo profe activado',
    engineFail: 'No se pudo cargar el motor de física', engineFail2: 'Revisa la conexión a internet y recarga la página.',
    tmTitle: '🔒 Modo profe', tmP: 'Ingresa el código para ver las guías "Para el profe" en esta pestaña.', tmPh: 'Código', tmEnter: 'Entrar', tmCancel: 'Cancelar', tmOkToast: 'Modo profe activado en esta pestaña ✅', tmBad: 'Código incorrecto.', tmOff: 'Modo profe desactivado en esta pestaña.',
    yourGoal: '🎯 Tu reto:', foundIn: 'La encuentras en:', goBuild: '¡A construir! 🛠️', watchWork: '👀 Mira cómo funciona',
    lvFail: 'La campana no sonó. Mira dónde se detuvo todo y ajusta una pieza. 🔧', lvFailToast: 'La campana no sonó esta vez.', lvFailBtn: '↺ Ajustar mi máquina',
    watchWin: '¡Así funciona! 🔔 Ahora vuelve a tu diseño e inténtalo tú.', watchingEx: 'Estás mirando el ejemplo. Toca "Volver a mi diseño" para editar.', stopFirst: 'Toca ■ Detener para cambiar tu máquina.',
    backToDesign: 'Tu máquina volvió a como la armaste. ¡Ajusta y prueba otra vez!', followChain: '¡Sigue la cadena con los ojos! 👀',
    savedDesign: 'Recuperé tu diseño guardado. Presiona ▶ Jugar para probarlo.', startMsg: 'Arrastra piezas desde la caja de piezas a la mesa (o tócalas y luego toca la mesa). Después presiona ▶ Jugar.',
    howSolve: 'Así se puede resolver. Mira la cadena… 👀', backMine: 'Volviste a tu diseño. ¡Ahora inténtalo tú!',
    crit1: '🔔 Hiciste sonar la campana', crit3: '🧩 Con {par} {pz} o menos (usaste {n})', pzOne: 'pieza agregada', pzMany: 'piezas agregadas',
    mWorks: '¡Tu máquina funciona!', mUsed: 'Máquinas que participaron:', mCreative: '¡Pura creatividad!', mKeep: 'Seguir inventando', mMap: 'Mapa', mPerfect: '¡Máquina perfecta! 🏆', mDone: '¡Lo lograste! 🎉',
    mNext: 'Siguiente máquina →', mFree: 'Ir al taller libre →', mRetry: '↺ Mejorar', mMapBtn: '🗺️ Mapa',
    m_plano: '📐 Plano inclinado', m_palanca: '⚖️ Palanca', m_rueda: '🛞 Rueda y eje', m_polea: '🪢 Polea', m_cuna: '🔺 Cuña', m_tornillo: '🌀 Tornillo', m_resorte: '🟥 Resorte',
    cat1: 'Máquinas simples', cat2: 'Objetos', cat3: 'Construcción', cat4: 'Meta', domino5: 'Fila de 5 dominós', domino5d: 'Pone 5 dominós en fila de una vez.',
    armedMsg: 'Toca la mesa para poner: <b>{n}</b>. {d} (Toca otra vez la pieza para soltarla.)', placedMsg: 'Pusiste {n}. Puedes moverla arrastrándola.',
    nothingUndo: 'No hay nada que deshacer.', noPieces: 'Todavía no agregaste piezas.', removedMsg: 'Quité tus piezas. (Puedes ↶ Deshacer.)', resetMsg: 'El nivel volvió a empezar. (Puedes ↶ Deshacer.)',
    hintSolution: ' Si quieres, toca 👀 para ver una solución.',
    lbl_rampa: '¡Plano inclinado!', lbl_palanca: '¡Palanca!', lbl_rueda: '¡Rueda y eje!', lbl_polea: '¡Polea!', lbl_cuna: '¡Cuña!', lbl_tornillo: '¡Tornillo!', lbl_resorte: '¡Resorte!', lbl_domino: '¡Dominós!', lbl_soplador: '¡Soplador!', lbl_cinta: '¡Cinta!', lbl_cubeta: '¡A la cubeta!'
  };
  D.en = {
    titulo: "Spark's Crazy Machines", descripcion: 'A game to learn chain reactions and simple machines by building Rube Goldberg machines with real physics.',
    back: 'Back', home: 'Home', brand: 'Crazy Machines', sections: 'Sections', tab1: 'Chain reaction', tab2: 'The machine', tab3: 'Learn', tab4: 'Build', sound: 'Sound', theme: 'Change theme', style: 'Style: dreamy or natural',
    s1eyebrow: 'Step 1 · What is a chain reaction?',
    bubble0: "Hi! I'm <b>Spark</b> ⚡. Look at this row of dominoes. If I push <b>only the first one</b>… what do you think will happen?",
    introCv: 'A row of ten dominoes ready to fall', predAll: '✅ They will all fall', predOne: 'Only the first one will fall', predNone: 'Nothing will happen',
    cee1t: '1. CAUSE', cee1d: 'Something starts the movement: I pushed the first domino.', cee2t: '2. EFFECT', cee2d: 'Each domino pushes the next one. The energy travels!', cee3t: '3. RESULT', cee3d: 'In the end something happens: they all fall!',
    toDemo: 'See a Goldberg machine →', again: '↺ Again', forTeacher: 'For the teacher',
    teach1: '<li><b>Goal:</b> recognize the sequence cause → effect → result.</li><li>Ask students to <b>predict</b> before pushing and to explain why they were right or wrong.</li><li>Ask: "what would happen if we removed a domino from the middle?" (the chain breaks).</li>',
    pushHere: 'Push here!', bubbleDone: 'They <b>all</b> fell! I only pushed one domino, but each one pushed the next. That is a <b>chain reaction</b>. Tap the cards 👇',
    bubbleGood: 'Good prediction! Let us check it… 👀', bubbleOther: 'Hmm! You said <b>{p}</b>. Let us check it… 👀', predOneTxt: 'only the first one', predNoneTxt: 'nothing',
    bubblePushed: 'You pushed the first one! Watch what happens… 👀', bubbleAgain: 'Again! If I push <b>only the first one</b>… what do you think will happen?',
    s2eyebrow: 'Step 2 · The Rube Goldberg machine', s2h: 'A lot of work for something very simple',
    s2p: 'Rube Goldberg drew super complicated machines that did simple things. This one rings a bell 🔔 using a <b>chain of machines</b>. Turn it on and watch each step light up.',
    demoCv: 'Goldberg machine: screw, ramps, dominoes and bell', demoOn: '▶ Turn on', demoSlow: '🐢 Slow motion', demoNormal: '🐇 Normal speed', demoStop: '■ Stop', toMap: 'Learn the machines →',
    teach2: '<li>Pause with slow motion and ask students to name each step in the chain.</li><li>Ask: "what is the first cause and what is the final result?".</li><li>Look ahead: each piece is a <b>simple machine</b>; in step 3 they will learn them one by one.</li>',
    step1: '🌀 Screw lifts the marble', step2: '📐 Ramps', step3: '⚡ Dominoes', step4: '🔔 Bell!',
    demoWin: 'DING-DONG! 🔔 A chain of machines did something very simple: ring a bell.', demoFollow: 'Follow the marble with your eyes… 👀',
    s3eyebrow: "Step 3 · The inventor's path", s3h: 'Learn each simple machine', s3p: 'Each stop has a short idea and a challenge. They are all open: go in order or jump to the one you want.', progress: 'Your progress',
    mapSign: "🧭 The inventor's path", mapAria: 'Level {n}: {name}, {s} stars', progTxt: '{d} of {t} machines · {s} ★',
    learn: '📖 Learn', hint: '💡 Hint', solution: '👀 See solution', example: '👀 See an example', levelN: 'Level {n} · {name}',
    lvCv: 'Workbench to build the machine', designMode: '✏️ Design mode', running: '▶ Running', exampleMode: '👀 Example',
    piece1: '🧩 {n} piece added', pieceN: '🧩 {n} pieces added',
    rotL: 'Rotate left', rotLt: 'Rotate (E)', rotR: 'Rotate right', rotRt: 'Rotate (R)', flip: 'Flip', flipt: 'Flip (F)', del: 'Delete piece', delt: 'Delete (Del)',
    watching: '👀 Watching how it works', watchEnd: 'Back to my design', play: '▶ Play', stop: '■ Stop', undo: '↶ Undo', clear: '🧹 Remove my pieces', reset: '⟳ Restart level', resetSure: '⟳ Sure? Tap again',
    slow: '🐢 Slow', normal: '🐇 Normal', snap: '🧲 Magnet: {v}', yes: 'on', no: 'off', palette: 'Pieces to build with',
    footer: "Spark's Crazy Machines · real physics with Matter.js · build, test and improve", teacherLock: '🔒 Teacher mode', teacherOn: '🔓 Teacher mode on',
    engineFail: 'The physics engine could not be loaded', engineFail2: 'Check your internet connection and reload the page.',
    tmTitle: '🔒 Teacher mode', tmP: 'Enter the code to see the "For the teacher" guides in this tab.', tmPh: 'Code', tmEnter: 'Enter', tmCancel: 'Cancel', tmOkToast: 'Teacher mode is on in this tab ✅', tmBad: 'Wrong code.', tmOff: 'Teacher mode is off in this tab.',
    yourGoal: '🎯 Your challenge:', foundIn: 'You can find it in:', goBuild: "Let's build! 🛠️", watchWork: '👀 See how it works',
    lvFail: 'The bell did not ring. Look at where everything stopped and adjust one piece. 🔧', lvFailToast: 'The bell did not ring this time.', lvFailBtn: '↺ Adjust my machine',
    watchWin: "That's how it works! 🔔 Now go back to your design and try it yourself.", watchingEx: 'You are watching the example. Tap "Back to my design" to edit.', stopFirst: 'Tap ■ Stop to change your machine.',
    backToDesign: 'Your machine went back to how you built it. Adjust it and try again!', followChain: 'Follow the chain with your eyes! 👀',
    savedDesign: 'I restored your saved design. Press ▶ Play to try it.', startMsg: 'Drag pieces from the parts box onto the table (or tap one and then tap the table). Then press ▶ Play.',
    howSolve: 'This is one way to solve it. Watch the chain… 👀', backMine: 'You are back at your design. Now try it yourself!',
    crit1: '🔔 You rang the bell', crit3: '🧩 With {par} {pz} or fewer (you used {n})', pzOne: 'added piece', pzMany: 'added pieces',
    mWorks: 'Your machine works!', mUsed: 'Machines that took part:', mCreative: 'Pure creativity!', mKeep: 'Keep inventing', mMap: 'Map', mPerfect: 'Perfect machine! 🏆', mDone: 'You did it! 🎉',
    mNext: 'Next machine →', mFree: 'Go to the free workshop →', mRetry: '↺ Improve', mMapBtn: '🗺️ Map',
    m_plano: '📐 Inclined plane', m_palanca: '⚖️ Lever', m_rueda: '🛞 Wheel and axle', m_polea: '🪢 Pulley', m_cuna: '🔺 Wedge', m_tornillo: '🌀 Screw', m_resorte: '🟥 Spring',
    cat1: 'Simple machines', cat2: 'Objects', cat3: 'Building', cat4: 'Goal', domino5: 'Row of 5 dominoes', domino5d: 'Places 5 dominoes in a row at once.',
    armedMsg: 'Tap the table to place: <b>{n}</b>. {d} (Tap the piece again to put it down.)', placedMsg: 'You placed the {n}. You can move it by dragging it.',
    nothingUndo: 'There is nothing to undo.', noPieces: 'You have not added any pieces yet.', removedMsg: 'I removed your pieces. (You can ↶ Undo.)', resetMsg: 'The level started over. (You can ↶ Undo.)',
    hintSolution: ' If you want, tap 👀 to see a solution.',
    lbl_rampa: 'Inclined plane!', lbl_palanca: 'Lever!', lbl_rueda: 'Wheel and axle!', lbl_polea: 'Pulley!', lbl_cuna: 'Wedge!', lbl_tornillo: 'Screw!', lbl_resorte: 'Spring!', lbl_domino: 'Dominoes!', lbl_soplador: 'Blower!', lbl_cinta: 'Belt!', lbl_cubeta: 'Into the bucket!'
  };

  /* ---- Niveles (traducción al inglés; el español está en app.js) ---- */
  var LV = {
    1: { name: 'Inclined plane', kicker: 'Simple machine 1', goal: 'Take the marble from the top to the bell on the shelf.',
      idea: 'It is a <b>slanted surface</b>, like a ramp. It helps lift or lower things with <b>less effort</b>: the marble rolls down by itself.',
      parts: [['Slope', 'steeper = faster'], ['Length', 'longer = smoother']], examples: ['🛝 Slide', '♿ Entrance ramp', '🚚 Truck ramp', '⛰️ Mountain road'],
      c2: '📐 A ramp carried the marble in the chain', hints: ['The marble falls down the first ramp. Where does it land?', 'Place ramps like steps going down to the right.', 'Three ramps in a staircase, the last one pointing at the shelf, are enough.'],
      teach: ['Goal: the inclined plane turns a fall into a controlled path.', 'Ask: what happens if the ramp is steeper?', 'Reference solution: 3 ramps in a staircase toward the shelf.'] },
    2: { name: 'Domino chain', kicker: 'Chain reaction', goal: 'The marble knocks down the first dominoes. Complete the row up to the bell.',
      idea: 'Each domino stores energy while standing. When it falls, it <b>pushes the next one</b> and the energy <b>travels</b> along the whole row.',
      parts: [['Distance', 'not too close, not too far'], ['Height', 'the domino must reach the next one']], examples: ['👉 Row of dominoes', '🧑‍🤝‍🧑 The wave in a stadium', '📚 Falling books'],
      c2: '🎯 8 or more dominoes fell', hints: ['Use the "Row of 5 dominoes" to go faster.', 'Leave about a finger of space between pieces (about 40 magnet steps).', 'Keep the row going until it almost touches the bell.'],
      teach: ['Goal: energy is passed from domino to domino.', 'Ask: what happens if you leave a very big gap?', 'Solution: dominoes every 40 px from x=370 to x=650.'] },
    3: { name: 'Lever', kicker: 'Simple machine 2', goal: 'Drop something heavy onto the lever to launch the box up to the bell.',
      idea: 'A <b>bar</b> that turns on a <b>pivot point</b>. If you push one side down hard, <b>the other side goes up</b> and can launch things.',
      parts: [['Pivot', 'where the bar turns'], ['Force', 'what pushes down'], ['Load', 'what goes up']], examples: ['🛝 Seesaw', '✂️ Scissors', '🔨 Claw hammer', '🥄 Catapult'],
      c2: '⚖️ The lever took part in the chain', hints: ['Which side of the lever is up?', 'A heavy ball falling hard is the best "force".', 'Put the heavy ball very high, right above the high end (the right one).'],
      teach: ['Goal: identify pivot, force and load.', 'Ask: why does the box go up if the ball goes down?', 'Solution: heavy ball dropped from above onto the right end.'] },
    4: { name: 'Wheel and axle', kicker: 'Simple machine 3', goal: 'The cart falls off the shelf. Build it a path so it rolls to the bell.',
      idea: 'A <b>wheel</b> joined to an <b>axle</b> turns together. Wheels make moving things <b>much easier</b> than dragging them.',
      parts: [['Wheel', 'turns and moves forward'], ['Axle', 'the bar in the center']], examples: ['🚲 Bicycle', '🛒 Shopping cart', '🚪 Door knob', '🎡 Ferris wheel'],
      c2: '🛞 The cart (wheel and axle) rolled in', hints: ['Look at where the cart falls when you play.', 'Put a ramp right under the edge of the shelf.', 'Two ramps in a row down to the floor: that way it does not tip over.'],
      teach: ['Goal: the wheel reduces friction and makes movement easier.', 'Ask: why does the cart tip over if it falls suddenly?', 'Solution: 2 gentle ramps from the edge of the shelf to the floor.'] },
    5: { name: 'Pulley', kicker: 'Simple machine 4', goal: 'Guide the heavy ball into the left bucket so the right one rises and touches the bell.',
      idea: 'A <b>wheel with a rope</b>. If one side goes down, <b>the other goes up</b>. It is used to lift heavy things from below.',
      parts: [['Wheel', 'the rope passes over it'], ['Rope', 'joins both sides'], ['Load', 'what goes up']], examples: ['🏗️ Crane', '🚩 Flagpole', '🪣 Water well', '🛗 Elevator'],
      c2: '🪢 The pulley lifted the bucket', hints: ['The ball falls very close by. It needs a push to the right.', 'A ramp under the ball takes it to the bucket.', 'Put a gentle ramp near x=330, y=210.'],
      teach: ['Goal: the pulley changes the direction of the force.', 'Ask: what would happen if the load were heavier than the ball?', 'Solution: a ramp that drops the ball into the left bucket.'] },
    6: { name: 'Wedge', kicker: 'Simple machine 5', goal: 'The marble falls and goes to the right. Use a wedge to send it to the bell on the left.',
      idea: 'A wedge is <b>two inclined planes together</b>. It is used to <b>split, lift or redirect</b> things: what hits it leaves along its slanted side.',
      parts: [['Tip', 'splits or cuts'], ['Slanted sides', 'redirect the push']], examples: ['🪓 Axe', '🔪 Knife', '🚪 Door stop', '🦷 Teeth'],
      c2: '🔺 The wedge redirected the marble', hints: ['Play once and see where the marble lands.', 'Put the wedge right where the marble lands, on the floor.', 'The slanted side must go down to the left (use ⇋ to flip it).'],
      teach: ['Goal: the wedge changes the direction of a force.', 'Ask: what happens if you flip the wedge?', 'Solution: wedge on the floor under the fall (x≈620), slanted side to the left.'] },
    7: { name: 'Screw', kicker: 'Simple machine 6', goal: 'The marble rolls along the floor. Lift it up to the bell shelf.',
      idea: 'A screw is an <b>inclined plane wrapped</b> in a spiral. The <b>Archimedes screw</b> turns and lifts things, like water or marbles!',
      parts: [['Spiral', 'a wrapped ramp'], ['Turning', 'lifts the load']], examples: ['🔩 Screws', '🫙 Jar lid', '💧 Old water pump', '🌀 Spiral slide'],
      c2: '🌀 The screw lifted the marble', hints: ['The marble needs to go UP, not down.', 'The screw catches what enters from below.', 'Put the screw on the floor, before the shelf (x≈390).'],
      teach: ['Goal: recognize the screw as a wrapped inclined plane.', 'Ask: where have you seen a screw that lifts things?', 'Solution: screw resting on the floor near x=390.'] },
    8: { name: 'Spring', kicker: 'Stored energy', goal: 'A wall blocks the way. Make the marble jump over it and touch the bell.',
      idea: 'A spring <b>stores energy</b> when you squash it and <b>releases it suddenly</b>. That is why we bounce on a trampoline!',
      parts: [['Squash', 'stores energy'], ['Release', 'launches upward']], examples: ['🖊️ Pen', '🛏️ Mattress', '🤸 Trampoline', '🪀 Jumping toy'],
      c2: '🟥 The spring launched the marble', hints: ['The marble hits the wall. It needs to go over the top.', 'Put the spring on the floor, before the wall.', 'A spring near x=320 makes it jump over the wall.'],
      teach: ['Goal: stored (elastic) energy turns into motion.', 'Ask: what happens if the spring is closer to the wall?', 'Solution: spring on the floor near x=320.'] },
    9: { name: 'The Big Machine!', kicker: 'Final challenge', goal: 'The bell hangs very high. Combine at least 3 simple machines in one chain to make it ring.',
      idea: 'Inventors <b>combine</b> simple machines to make complex machines. Think: which machine <b>lifts</b> things? Which one <b>raises</b> one side when the other goes down?',
      parts: [['Plan', 'draw the chain in your mind'], ['Build', 'piece by piece'], ['Test', 'and improve']], examples: ['🏭 Factories', '🎢 Roller coaster', '🚗 Cars', '⏰ Clocks'],
      c2: '⚙️ You used 3 different simple machines', hints: ['Idea: the screw can lift the marble.', 'If the marble falls into a pulley bucket, the other bucket goes up.', 'Screw near x=370 and pulley with its wheel at x=520, y=200.'],
      teach: ['Goal: combine several simple machines (final project).', 'Ask students to explain each step: cause → effect → result.', 'Reference: inclined plane + screw + pulley that lifts the bucket to the bell.'] },
    libre: { name: 'Inventions workshop', kicker: 'Step 4 · Free building', goal: 'Use as many pieces as you want. Invent your own Rube Goldberg machine and ring the bell.',
      hints: ['Start with a marble up high and the bell at the end.', 'Mix machines: one that lifts, one that lowers, one that launches.', 'Test often: play, see what happens and improve one piece at a time.', 'Tap 👀 to see an example idea.'],
      teach: ['Free space to create. Ask students to name the simple machines they used.', 'Challenge: a machine with 5 steps or more.', 'Suggested assessment: can they explain cause → effect → result?'] }
  };
  var PC = { canica: ['Marble', 'Rolls and bounces. The star of the machine!'], domino: ['Domino', 'Falls and pushes the next one: chain reaction.'], caja: ['Box', 'A weight you can push or drop.'],
    bola: ['Heavy ball', 'Very heavy: pushes and makes things go down.'], rampa: ['Ramp', 'Inclined plane: the marble rolls down.'], rampaC: ['Short ramp', 'A small inclined plane to adjust the path.'],
    plataforma: ['Platform', 'A floor to rest things on top.'], muro: ['Wall', 'Stops things or makes them bounce.'], cuna: ['Wedge', 'Two inclined planes: lifts, splits or makes things jump.'],
    palanca: ['Lever', 'A bar that turns on a pivot: one side goes down and the other goes up.'], rueda: ['Motor wheel', 'Wheel and axle: it spins nonstop and launches what it touches.'],
    carrito: ['Cart', 'Wheel and axle: its wheels turn so it moves easily.'], polea: ['Pulley', 'A wheel with a rope: if one side goes down, the other goes up.'],
    tornillo: ['Screw', 'Archimedes screw: a wrapped inclined plane that lifts things.'], resorte: ['Spring', 'Stores energy and launches upward whatever falls on it.'],
    cinta: ['Belt', 'Conveyor belt: moves what is on top.'], soplador: ['Blower', 'Blows air and pushes light things.'], cubeta: ['Bucket', 'Catches marbles and balls.'], campana: ['Bell', 'The goal: make something touch it!'] };

  window.MLC_I18N = { t: t, lang: function () { return L; }, set: set, apply: apply, mount: mount, onChange: function (f) { cbs.push(f); }, LV: LV, PC: PC };
})();
