/**
 * app.js - Tarot Arcana Neón (Sí o No) para Rabbit R1
 * Incluye animación de barajado del mazo, 22 Arcanos Mayores y consulta de IA
 * persistente al mantener presionado el botón lateral de Rabbit R1.
 */

(function() {
  'use strict';

  // Baraja Completa de los 22 Arcanos Mayores (0 al XXI)
  const CARDS = [
    { id: 0, type: 'YES', name: '0. EL LOCO', image: 'card_loco.jpg', speech: '¡SÍ! El Loco anuncia nuevos comienzos y aventura sin miedo.' },
    { id: 1, type: 'YES', name: 'I. EL MAGO', image: 'card_mago.jpg', speech: '¡SÍ! El Mago manifiesta tu deseo con todo tu poder.' },
    { id: 2, type: 'YES', name: 'II. SACERDOTISA', image: 'card_estrella.jpg', speech: '¡SÍ! La Sacerdotisa pide confiar en tu intuición.' },
    { id: 3, type: 'YES', name: 'III. EMPERATRIZ', image: 'card_yes.jpg', speech: '¡SÍ! La Emperatriz trae abundancia y florecimiento.' },
    { id: 4, type: 'YES', name: 'IV. EMPERADOR', image: 'card_mago.jpg', speech: '¡SÍ! El Emperador afirma estructura, control y éxito.' },
    { id: 5, type: 'YES', name: 'V. EL PAPA', image: 'card_estrella.jpg', speech: '¡SÍ! El Sumo Sacerdote bendice tu camino.' },
    { id: 6, type: 'YES', name: 'VI. ENAMORADOS', image: 'card_yes.jpg', speech: '¡SÍ! Los Enamorados auguran armonía y elecciones sabias.' },
    { id: 7, type: 'YES', name: 'VII. EL CARRO', image: 'card_mago.jpg', speech: '¡SÍ! El Carro impulsa tu victoria con determinación.' },
    { id: 8, type: 'YES', name: 'VIII. LA FUERZA', image: 'card_yes.jpg', speech: '¡SÍ! La Fuerza demuestra tu valor interior.' },
    { id: 9, type: 'NO', name: 'IX. ERMITAÑO', image: 'card_no.jpg', speech: '¡NO! El Ermitaño sugiere introspección antes de actuar.' },
    { id: 10, type: 'YES', name: 'X. LA RUEDA', image: 'card_yes.jpg', speech: '¡SÍ! La Rueda de la Fortuna gira a tu favor.' },
    { id: 11, type: 'YES', name: 'XI. LA JUSTICIA', image: 'card_juicio.jpg', speech: '¡SÍ! La Justicia equilibra la verdad y la equidad.' },
    { id: 12, type: 'NO', name: 'XII. EL COLGADO', image: 'card_torre.jpg', speech: '¡NO! El Colgado pide pausar y ver otro ángulo.' },
    { id: 13, type: 'NO', name: 'XIII. LA MUERTE', image: 'card_muerte.jpg', speech: '¡NO! La Muerte marca el fin de un ciclo para transformar.' },
    { id: 14, type: 'YES', name: 'XIV. TEMPLANZA', image: 'card_estrella.jpg', speech: '¡SÍ! La Templanza trae equilibrio y armonía.' },
    { id: 15, type: 'NO', name: 'XV. EL DIABLO', image: 'card_no.jpg', speech: '¡NO! El Diablo advierte contra ataduras e impulsos.' },
    { id: 16, type: 'NO', name: 'XVI. LA TORRE', image: 'card_torre.jpg', speech: '¡NO! La Torre indica cambios y revelaciones repentinas.' },
    { id: 17, type: 'YES', name: 'XVII. ESTRELLA', image: 'card_estrella.jpg', speech: '¡SÍ! La Estrella concede tu mayor esperanza.' },
    { id: 18, type: 'NO', name: 'XVIII. LA LUNA', image: 'card_no.jpg', speech: '¡NO! La Luna sugiere misterios y cautela.' },
    { id: 19, type: 'YES', name: 'XIX. EL SOL', image: 'card_yes.jpg', speech: '¡SÍ! El Sol ilumina tu camino con alegría y plenitud.' },
    { id: 20, type: 'NO', name: 'XX. EL JUICIO', image: 'card_juicio.jpg', speech: '¡NO! El Juicio pide evaluar las consecuencias.' },
    { id: 21, type: 'YES', name: 'XXI. EL MUNDO', image: 'card_mundo.jpg', speech: '¡SÍ! El Mundo celebra tu realización total y triunfo.' }
  ];

  // Estado de la App
  let yesCount = 0;
  let noCount = 0;
  let score = 0;
  let isFlipped = false;
  let isShuffling = false;
  let isPressingIA = false;
  let currentCard = null;
  let currentQuestion = 'Tirada General de Tarot Arcana';

  function initApp() {
    // Elementos DOM
    const scoreVal = document.getElementById('score-val');
    const ratioVal = document.getElementById('ratio-val');
    const cardStage = document.getElementById('card-stage');
    const tarotCard = document.getElementById('tarot-card');
    const cardImg = document.getElementById('card-img');
    const resultBadge = document.getElementById('result-badge');
    const cardName = document.getElementById('card-name');
    const promptText = document.getElementById('prompt-text');
    const llmBox = document.getElementById('llm-box');
    const llmQuestionText = document.getElementById('llm-question-text');
    const llmText = document.getElementById('llm-text');
    const closeLlmBtn = document.getElementById('close-llm');

    updateStatsDisplay();
    loadState();

    async function loadState() {
      try {
        const raw = await R1Bridge.storage.plain.getItem('tarot_arcana_state');
        if (raw) {
          const parsed = JSON.parse(raw);
          yesCount = parsed.yes || 0;
          noCount = parsed.no || 0;
          score = parsed.score || 0;
          updateStatsDisplay();
        }
      } catch (e) {
        console.warn('Error cargando estado:', e);
      }
    }

    async function saveState() {
      try {
        await R1Bridge.storage.plain.setItem('tarot_arcana_state', JSON.stringify({
          yes: yesCount,
          no: noCount,
          score: score
        }));
      } catch (e) {}
    }

    function updateStatsDisplay() {
      if (scoreVal) scoreVal.textContent = score;
      if (ratioVal) ratioVal.textContent = `${yesCount} / ${noCount}`;
    }

    // -------------------------------------------------------------
    // Animación de Barajar Mazo
    // -------------------------------------------------------------
    function triggerShuffleAnimation(callback, duration = 800) {
      if (isShuffling) return;
      isShuffling = true;

      cardStage.classList.add('shuffling-active');
      tarotCard.classList.add('shuffling');
      playShuffleSound();

      if (promptText) promptText.textContent = '🔮 Barajando los 22 Arcanos...';

      setTimeout(() => {
        cardStage.classList.remove('shuffling-active');
        tarotCard.classList.remove('shuffling');
        isShuffling = false;
        if (callback) callback();
      }, duration);
    }

    // -------------------------------------------------------------
    // Tirada de Carta (Sí o No de los 22 Arcanos)
    // -------------------------------------------------------------
    function drawCard() {
      if (isShuffling) return;

      if (isFlipped) {
        // Cubrir carta
        isFlipped = false;
        tarotCard.classList.remove('face-up');
        tarotCard.classList.add('face-down');
        if (promptText) promptText.textContent = 'Pulsa PTT o Clic para Revelar';
        return;
      }

      // Ejecutar animación de barajado antes de revelar
      triggerShuffleAnimation(() => {
        const randomIndex = Math.floor(Math.random() * CARDS.length);
        currentCard = CARDS[randomIndex];

        if (cardImg) cardImg.src = currentCard.image;
        if (cardName) cardName.textContent = currentCard.name;

        if (resultBadge) {
          resultBadge.textContent = currentCard.type;
          resultBadge.className = `result-badge ${currentCard.type.toLowerCase()}`;
        }

        // Revelar carta
        isFlipped = true;
        tarotCard.classList.remove('face-down');
        tarotCard.classList.add('face-up');

        if (currentCard.type === 'YES') {
          yesCount++;
          score += 100;
        } else {
          noCount++;
          score += 50;
        }
        updateStatsDisplay();
        saveState();

        if (promptText) promptText.textContent = `Resultado: ${currentCard.type} (${currentCard.name})`;

        speakResult(currentCard);
      }, 700);
    }

    // -------------------------------------------------------------
    // Lectura en Voz Alta (TTS & r1 Speaker)
    // -------------------------------------------------------------
    function speakResult(card) {
      const textToSpeak = `El Tarot Arcana dice: ${card.type}. ${card.name}. ${card.speech}`;

      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.lang = 'es-ES';
          utterance.rate = 1.0;
          utterance.pitch = 0.9;
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        console.warn('SpeechSynthesis no disponible:', e);
      }

      R1Bridge.postMessage({
        message: `[Tarot Arcana]: Arcano Mayor ${card.name} tirado. Resultado = ${card.type}.`,
        useLLM: false,
        wantsR1Response: true
      });
    }

    function playShuffleSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        for (let i = 0; i < 4; i++) {
          setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300 + Math.random() * 400, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
          }, i * 70);
        }
      } catch (e) {}
    }

    // -------------------------------------------------------------
    // Consulta IA Persistente (Rabbit OS LLM)
    // -------------------------------------------------------------
    function startIAQuestion() {
      isPressingIA = true;
      const cardContext = currentCard ? `${currentCard.name} (${currentCard.type})` : 'Mazo de Arcanos';
      currentQuestion = `¿Qué significa la carta ${cardContext} para mí?`;

      if (promptText) promptText.textContent = '🎙️ Escuchando pregunta... (Mantén pulsado)';
      if (llmQuestionText) llmQuestionText.textContent = currentQuestion;
      if (llmText) llmText.textContent = 'Escuchando tu voz... Suelta el botón para enviar la consulta.';
      if (llmBox) llmBox.classList.remove('hidden');
    }

    function finishIAQuestion() {
      if (!isPressingIA) return;
      isPressingIA = false;

      if (promptText) promptText.textContent = '🔮 Enviando consulta al Oráculo IA...';
      if (llmText) llmText.textContent = '🔮 Oráculo Arcana interpretando tu tirada...';

      // Comunicar con Rabbit OS activando LLM y voz
      R1Bridge.postMessage({
        message: `[Tarot Arcana]: ${currentQuestion}. Por favor responde brevemente como un sabio oráculo de tarot.`,
        useLLM: true,
        wantsR1Response: true
      });
    }

    // Manejar respuesta del LLM manteniendo la pregunta visible
    R1Bridge.onMessage((data) => {
      let reply = '';
      if (data && data.data) {
        try {
          const parsed = JSON.parse(data.data);
          reply = parsed.reply || parsed.message || data.data;
        } catch (e) {
          reply = data.data;
        }
      } else if (data && data.message) {
        reply = data.message;
      }

      if (!reply) {
        reply = `El Arcano ${currentCard ? currentCard.name : 'elegido'} te aconseja mantener la fe y seguir tu instinto.`;
      }

      if (llmText && llmBox) {
        llmText.textContent = reply;
        if (llmQuestionText) llmQuestionText.textContent = currentQuestion;
        llmBox.classList.remove('hidden');
        if (promptText) promptText.textContent = 'Oráculo Arcana ha respondido.';
      }
    });

    // -------------------------------------------------------------
    // Eventos de Hardware R1 (Rueda & Botón PTT)
    // -------------------------------------------------------------
    R1Bridge.on('scrollUp', () => {
      score += 10;
      updateStatsDisplay();
      triggerShuffleAnimation();
    });

    R1Bridge.on('scrollDown', () => {
      score += 10;
      updateStatsDisplay();
      triggerShuffleAnimation();
    });

    R1Bridge.on('sideClick', () => {
      drawCard();
    });

    // Presionar y mantener botón lateral
    R1Bridge.on('longPressStart', () => {
      startIAQuestion();
    });

    // Soltar botón lateral
    R1Bridge.on('longPressEnd', () => {
      finishIAQuestion();
    });

    // Interacción Táctil
    tarotCard.addEventListener('click', drawCard);
    if (closeLlmBtn) closeLlmBtn.addEventListener('click', () => {
      if (llmBox) llmBox.classList.add('hidden');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
