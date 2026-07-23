/**
 * app.js - Tarot Arcana Neón (Sí o No) para Rabbit R1
 * Baraja completa de los 22 Arcanos Mayores del Tarot en Pixel-Art 16-Bit.
 * Incluye lectura en voz alta (TTS), voz nativa r1, animaciones 3D y racha.
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
  let currentCard = null;

  function initApp() {
    // Elementos DOM
    const scoreVal = document.getElementById('score-val');
    const ratioVal = document.getElementById('ratio-val');
    const tarotCard = document.getElementById('tarot-card');
    const cardImg = document.getElementById('card-img');
    const resultBadge = document.getElementById('result-badge');
    const cardName = document.getElementById('card-name');
    const promptText = document.getElementById('prompt-text');
    const llmBox = document.getElementById('llm-box');
    const llmText = document.getElementById('llm-text');
    const closeLlmBtn = document.getElementById('close-llm');

    // Render Inicial Inmediato
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
    // Tirada de Carta (Sí o No de los 22 Arcanos)
    // -------------------------------------------------------------
    function drawCard() {
      if (isShuffling) return;

      if (isFlipped) {
        // Volver a cubrir la carta
        isFlipped = false;
        tarotCard.classList.remove('face-up');
        tarotCard.classList.add('face-down');
        if (promptText) promptText.textContent = 'Pulsa PTT o Clic para Revelar';
        return;
      }

      // Animación de Barajar
      isShuffling = true;
      tarotCard.classList.add('shuffling');
      if (promptText) promptText.textContent = '🔮 Mezclando los 22 Arcanos Mayores...';
      playChimeSound();

      setTimeout(() => {
        tarotCard.classList.remove('shuffling');
        isShuffling = false;

        // Seleccionar carta aleatoria entre los 22 Arcanos
        const randomIndex = Math.floor(Math.random() * CARDS.length);
        currentCard = CARDS[randomIndex];

        // Actualizar visuales de la carta
        if (cardImg) cardImg.src = currentCard.image;
        if (cardName) cardName.textContent = currentCard.name;

        if (resultBadge) {
          resultBadge.textContent = currentCard.type;
          resultBadge.className = `result-badge ${currentCard.type.toLowerCase()}`;
        }

        // Voltear carta
        isFlipped = true;
        tarotCard.classList.remove('face-down');
        tarotCard.classList.add('face-up');

        // Actualizar Estadísticas
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

        // LECTURA EN VOZ ALTA (Web Speech Synthesis & r1 Speaker)
        speakResult(currentCard);

      }, 600);
    }

    // -------------------------------------------------------------
    // Lectura en Voz Alta (TTS & r1 Audio)
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

    function playChimeSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {}
    }

    // -------------------------------------------------------------
    // Interpretación Profunda con IA (Rabbit OS LLM)
    // -------------------------------------------------------------
    function requestDeepOracle() {
      if (promptText) promptText.textContent = '🔮 Oráculo Arcana r1 interpretando...';
      const cardContext = currentCard ? `${currentCard.name} (${currentCard.type})` : 'Baraja de 22 Arcanos';

      R1Bridge.postMessage({
        message: `[Tarot Arcana]: Dame una breve y mística interpretación del Arcano Mayor ${cardContext} respondiendo a una duda de Sí o No en tono místico.`,
        useLLM: true,
        wantsR1Response: true
      });
    }

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

      if (reply && llmText && llmBox) {
        llmText.textContent = reply;
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
      playChimeSound();
      if (promptText) promptText.textContent = 'Barajando los 22 Arcanos...';
    });

    R1Bridge.on('scrollDown', () => {
      score += 10;
      updateStatsDisplay();
      playChimeSound();
      if (promptText) promptText.textContent = 'Barajando los 22 Arcanos...';
    });

    R1Bridge.on('sideClick', () => {
      drawCard();
    });

    R1Bridge.on('longPressStart', () => {
      requestDeepOracle();
    });

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
