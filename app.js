/**
 * app.js - Tarot Arcana Neón (Sí o No) para Rabbit R1
 * Ofrece tiradas de tarot estilo Pixel Neón 16-Bit con lectura en voz alta (Speech Synthesis),
 * voz nativa r1 (PluginMessageHandler), animaciones 3D y persistencia de racha.
 */

(function() {
  'use strict';

  // Baraja de Cartas Tarot Arcana (Sí / No)
  const CARDS = [
    { type: 'YES', name: 'EL SOL', image: 'card_yes.jpg', speech: '¡SÍ! El Sol ilumina tu camino.' },
    { type: 'YES', name: 'EL DESTINO', image: 'card_yes.jpg', speech: '¡SÍ! El Destino está a tu favor.' },
    { type: 'YES', name: 'LA FORTUNA', image: 'card_yes.jpg', speech: '¡SÍ! La Rueda de la Fortuna sonríe.' },
    { type: 'YES', name: 'EL MAGO', image: 'card_yes.jpg', speech: '¡SÍ! Tienes todo el poder para lograrlo.' },
    { type: 'NO', name: 'LA LUNA', image: 'card_no.jpg', speech: '¡NO! La Luna sugiere precaución y duda.' },
    { type: 'NO', name: 'LA TORRE', image: 'card_no.jpg', speech: '¡NO! La Torre indica cambios inesperados.' },
    { type: 'NO', name: 'LA SOMBRA', image: 'card_no.jpg', speech: '¡NO! Las sombras tapan la respuesta.' },
    { type: 'NO', name: 'EL JUICIO', image: 'card_no.jpg', speech: '¡NO! El Juicio pide prudencia.' }
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
    // Tirada de Carta (Sí o No)
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
      if (promptText) promptText.textContent = '🔮 Consultando el Oráculo Arcana...';
      playChimeSound();

      setTimeout(() => {
        tarotCard.classList.remove('shuffling');
        isShuffling = false;

        // Seleccionar carta aleatoria
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
      const textToSpeak = `El Tarot Arcana dice: ${card.type}. ${card.speech}`;

      // 1. Web Speech Synthesis (Navegador / WebView)
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

      // 2. Comunicar a Rabbit OS para altavoz nativo
      R1Bridge.postMessage({
        message: `[Tarot Arcana]: Tirada realizada. Resultado = ${card.type}. Carta = ${card.name}.`,
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
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
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
      const cardContext = currentCard ? `${currentCard.type} (${currentCard.name})` : 'Tirada General';

      R1Bridge.postMessage({
        message: `[Tarot Arcana]: Dame una breve y mística lectura de tarot de Sí o No para la carta ${cardContext} en tono de oráculo misterioso.`,
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
      if (promptText) promptText.textContent = 'Barajando mazo...';
    });

    R1Bridge.on('scrollDown', () => {
      score += 10;
      updateStatsDisplay();
      playChimeSound();
      if (promptText) promptText.textContent = 'Barajando mazo...';
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
