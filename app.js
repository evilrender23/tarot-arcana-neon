/**
 * app.js - Tarot Arcana Neón (Sí o No) para Rabbit R1
 * Captura activa de micrófono con webkitSpeechRecognition y eventos nativos de voz de Rabbit OS.
 * Muestra la pregunta hablada exacta del usuario en pantalla y envía la petición al LLM.
 */

(function() {
  'use strict';

  // Baraja Completa de los 22 Arcanos Mayores (0 al XXI)
  const CARDS = [
    { id: 0, type: 'YES', name: '0. EL LOCO', image: 'card_0.jpg', speech: '¡SÍ! El Loco anuncia nuevos comienzos y aventura sin miedo.' },
    { id: 1, type: 'YES', name: 'I. EL MAGO', image: 'card_1.jpg', speech: '¡SÍ! El Mago manifiesta tu deseo con todo tu poder.' },
    { id: 2, type: 'YES', name: 'II. SACERDOTISA', image: 'card_2.jpg', speech: '¡SÍ! La Sacerdotisa pide confiar en tu intuición.' },
    { id: 3, type: 'YES', name: 'III. EMPERATRIZ', image: 'card_3.jpg', speech: '¡SÍ! La Emperatriz trae abundancia y florecimiento.' },
    { id: 4, type: 'YES', name: 'IV. EMPERADOR', image: 'card_4.jpg', speech: '¡SÍ! El Emperador afirma estructura, control y éxito.' },
    { id: 5, type: 'YES', name: 'V. EL PAPA', image: 'card_5.jpg', speech: '¡SÍ! El Sumo Sacerdote bendice tu camino.' },
    { id: 6, type: 'YES', name: 'VI. ENAMORADOS', image: 'card_6.jpg', speech: '¡SÍ! Los Enamorados auguran armonía y elecciones sabias.' },
    { id: 7, type: 'YES', name: 'VII. EL CARRO', image: 'card_7.jpg', speech: '¡SÍ! El Carro impulsa tu victoria con determinación.' },
    { id: 8, type: 'YES', name: 'VIII. LA FUERZA', image: 'card_8.jpg', speech: '¡SÍ! La Fuerza demuestra tu valor interior.' },
    { id: 9, type: 'NO', name: 'IX. ERMITAÑO', image: 'card_9.jpg', speech: '¡NO! El Ermitaño sugiere introspección antes de actuar.' },
    { id: 10, type: 'YES', name: 'X. LA RUEDA', image: 'card_10.jpg', speech: '¡SÍ! La Rueda de la Fortuna gira a tu favor.' },
    { id: 11, type: 'YES', name: 'XI. LA JUSTICIA', image: 'card_11.jpg', speech: '¡SÍ! La Justicia equilibra la verdad y la equidad.' },
    { id: 12, type: 'NO', name: 'XII. EL COLGADO', image: 'card_12.jpg', speech: '¡NO! El Colgado pide pausar y ver otro ángulo.' },
    { id: 13, type: 'NO', name: 'XIII. LA MUERTE', image: 'card_13.jpg', speech: '¡NO! La Muerte marca el fin de un ciclo para transformar.' },
    { id: 14, type: 'YES', name: 'XIV. TEMPLANZA', image: 'card_14.jpg', speech: '¡SÍ! La Templanza trae equilibrio y armonía.' },
    { id: 15, type: 'NO', name: 'XV. EL DIABLO', image: 'card_15.jpg', speech: '¡NO! El Diablo advierte contra ataduras e impulsos.' },
    { id: 16, type: 'NO', name: 'XVI. LA TORRE', image: 'card_16.jpg', speech: '¡NO! La Torre indica cambios y revelaciones repentinas.' },
    { id: 17, type: 'YES', name: 'XVII. ESTRELLA', image: 'card_17.jpg', speech: '¡SÍ! La Estrella concede tu mayor esperanza.' },
    { id: 18, type: 'NO', name: 'XVIII. LA LUNA', image: 'card_18.jpg', speech: '¡NO! La Luna sugiere misterios y cautela.' },
    { id: 19, type: 'YES', name: 'XIX. EL SOL', image: 'card_19.jpg', speech: '¡SÍ! El Sol ilumina tu camino con alegría y plenitud.' },
    { id: 20, type: 'NO', name: 'XX. EL JUICIO', image: 'card_20.jpg', speech: '¡NO! El Juicio pide evaluar las consecuencias.' },
    { id: 21, type: 'YES', name: 'XXI. EL MUNDO', image: 'card_21.jpg', speech: '¡SÍ! El Mundo celebra tu realización total y triunfo.' }
  ];

  // Estado de la App
  let yesCount = 0;
  let noCount = 0;
  let score = 0;
  let isFlipped = false;
  let isShuffling = false;
  let isListeningVoice = false;
  let currentCard = null;
  let speechRecognizer = null;
  let userSpokenQuery = '';

  // -------------------------------------------------------------
  // Inicialización del Reconocimiento de Voz por Micrófono
  // -------------------------------------------------------------
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        speechRecognizer = new SpeechRecognition();
        speechRecognizer.continuous = false;
        speechRecognizer.interimResults = true;
        speechRecognizer.lang = 'es-ES';

        speechRecognizer.onresult = function(event) {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            userSpokenQuery = transcript.trim();
            const qText = document.getElementById('llm-question-text');
            if (qText) qText.textContent = `Pregunta: "${userSpokenQuery}"`;
            const promptText = document.getElementById('prompt-text');
            if (promptText) promptText.textContent = `🎙️ "${userSpokenQuery}"`;
          }
        };

        speechRecognizer.onerror = function(e) {
          console.warn('[Micrófono] Error de reconocimiento:', e);
        };
      } catch (e) {
        console.warn('[Micrófono] No se pudo inicializar SpeechRecognition:', e);
      }
    }
  }

  function initApp() {
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

    if (cardImg) {
      cardImg.onerror = function() {
        this.onerror = null;
        this.src = 'card_yes.jpg';
      };
    }

    initSpeechRecognition();
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

      if (promptText) promptText.textContent = '🔮 Barajando mazo...';

      setTimeout(() => {
        cardStage.classList.remove('shuffling-active');
        tarotCard.classList.remove('shuffling');
        isShuffling = false;
        if (callback) callback();
      }, duration);
    }

    // -------------------------------------------------------------
    // Tirada de Carta
    // -------------------------------------------------------------
    function drawCard() {
      if (isShuffling) return;

      if (isFlipped) {
        isFlipped = false;
        tarotCard.classList.remove('face-up');
        tarotCard.classList.add('face-down');
        if (promptText) promptText.textContent = 'Pulsa PTT o Clic para Revelar';
        return;
      }

      triggerShuffleAnimation(() => {
        const randomIndex = Math.floor(Math.random() * CARDS.length);
        currentCard = CARDS[randomIndex];

        if (cardImg) cardImg.src = currentCard.image;
        if (cardName) cardName.textContent = currentCard.name;

        if (resultBadge) {
          resultBadge.textContent = currentCard.type;
          resultBadge.className = `result-badge ${currentCard.type.toLowerCase()}`;
        }

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
    // Captura de Micrófono & Consulta IA Directa al Mantener PTT
    // -------------------------------------------------------------
    function onPTTHoldStart() {
      isListeningVoice = true;
      userSpokenQuery = '';

      // Iniciar captura por micrófono HTML5 si está soportado
      if (speechRecognizer) {
        try {
          speechRecognizer.start();
        } catch (e) {}
      }

      if (promptText) promptText.textContent = '🎙️ Escuchando tu pregunta... (Manten presionado)';
      if (llmQuestionText) llmQuestionText.textContent = 'Escuchando tu voz por el micrófono...';
      if (llmText) llmText.textContent = 'Habla tu duda ahora. Al soltar el botón se procesará tu pregunta exacta.';
      if (llmBox) llmBox.classList.remove('hidden');
    }

    function onPTTHoldRelease() {
      if (!isListeningVoice) return;
      isListeningVoice = false;

      // Detener captura por micrófono HTML5
      if (speechRecognizer) {
        try {
          speechRecognizer.stop();
        } catch (e) {}
      }

      setTimeout(() => {
        const cardContext = currentCard ? `Carta actual: ${currentCard.name} (${currentCard.type})` : 'Mazo de Tarot';
        const finalQuery = userSpokenQuery ? `Pregunta hablada por el usuario: "${userSpokenQuery}"` : 'Consulta de voz del usuario';

        if (promptText) promptText.textContent = '🔮 Enviando petición de voz a la IA...';
        if (llmQuestionText) llmQuestionText.textContent = userSpokenQuery ? `"${userSpokenQuery}"` : 'Petición de voz';
        if (llmText) llmText.textContent = 'Procesando la pregunta en el Oráculo de Rabbit OS...';

        // Enviar petición con la frase capturada del micrófono hacia Rabbit OS
        R1Bridge.postMessage({
          message: `[Tarot Arcana]: ${cardContext}. ${finalQuery}. Responde a su pregunta con precisión.`,
          useLLM: true,
          wantsR1Response: true
        });
      }, 300);
    }

    // -------------------------------------------------------------
    // Escuchar Eventos de Mensaje y Transcripción Nativa de Rabbit OS
    // -------------------------------------------------------------
    R1Bridge.onMessage((data) => {
      // Capturar transcripción hablada nativa enviada por Rabbit OS
      if (data && (data.type === 'speechResult' || data.transcript || data.text || data.spokenText)) {
        const spoken = data.transcript || data.text || data.speechResult || data.spokenText;
        if (spoken) {
          userSpokenQuery = spoken;
          if (llmQuestionText) llmQuestionText.textContent = `Pregunta: "${userSpokenQuery}"`;
          if (promptText) promptText.textContent = `🎙️ "${userSpokenQuery}"`;
        }
        return;
      }

      // Procesar respuesta del LLM
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
        reply = `El Oráculo de Rabbit OS ha procesado tu consulta sobre ${currentCard ? currentCard.name : 'la tirada'}.`;
      }

      if (llmText && llmBox) {
        llmText.textContent = reply;
        if (llmQuestionText) llmQuestionText.textContent = userSpokenQuery ? `"${userSpokenQuery}"` : 'Pregunta procesada';
        llmBox.classList.remove('hidden');
        if (promptText) promptText.textContent = 'Respuesta de voz procesada.';
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

    R1Bridge.on('longPressStart', () => {
      onPTTHoldStart();
    });

    R1Bridge.on('longPressEnd', () => {
      onPTTHoldRelease();
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
