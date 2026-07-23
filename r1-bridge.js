/**
 * r1-bridge.js - Puente Universal de Eventos de Hardware para Rabbit R1.
 * Captura controles por 4 vías simultáneas:
 * 1. Global Window Handlers (onScrollUp, onScrollDown, onSideClick, onLongPressStart, onLongPressEnd)
 * 2. Teclado Físico Android (ArrowUp/Down, PageUp/Down, Enter, Space, MediaPlayPause, HeadsetHook)
 * 3. Eventos DOM Wheel / Touch (deltaY, gestos)
 * 4. PostMessage IPC de Rabbit OS
 */

(function() {
  'use strict';

  function safeAtob(str) {
    if (!str || typeof str !== 'string') return null;
    try {
      return atob(str);
    } catch (e) {
      try {
        return decodeURIComponent(escape(window.atob(str)));
      } catch (e2) {
        return str;
      }
    }
  }

  function safeBtoa(str) {
    if (!str) return '';
    try {
      return btoa(str);
    } catch (e) {
      try {
        return window.btoa(unescape(encodeURIComponent(str)));
      } catch (e2) {
        return str;
      }
    }
  }

  const R1Bridge = {
    listeners: {},
    messageCallback: null,

    on: function(event, callback) {
      if (typeof callback !== 'function') return;
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    },

    emit: function(event, data) {
      const callbacks = this.listeners[event];
      if (callbacks && callbacks.length > 0) {
        callbacks.forEach(cb => {
          try {
            cb(data);
          } catch (e) {
            console.error(`[r1-bridge] Error en handler para ${event}:`, e);
          }
        });
      }
    },

    onMessage: function(callback) {
      if (typeof callback === 'function') {
        this.messageCallback = callback;
      }
    },

    postMessage: function(msgObj) {
      try {
        const payload = typeof msgObj === 'string' ? msgObj : JSON.stringify(msgObj);
        if (window.PluginMessageHandler && typeof window.PluginMessageHandler.postMessage === 'function') {
          window.PluginMessageHandler.postMessage(payload);
        } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.PluginMessageHandler) {
          window.webkit.messageHandlers.PluginMessageHandler.postMessage(payload);
        } else {
          console.log('[r1-bridge] (Simulador) postMessage:', payload);
        }
      } catch (e) {
        console.warn('[r1-bridge] Error enviando postMessage:', e);
      }
    },

    storage: {
      plain: {
        getItem: function(key) {
          return new Promise((resolve) => {
            try {
              if (window.creationStorage && typeof window.creationStorage.getItem === 'function') {
                window.creationStorage.getItem(key, (val) => {
                  resolve(safeAtob(val) || val);
                });
              } else {
                const local = localStorage.getItem(key);
                resolve(local);
              }
            } catch (e) {
              resolve(null);
            }
          });
        },

        setItem: function(key, val) {
          return new Promise((resolve) => {
            try {
              const strVal = typeof val === 'string' ? val : JSON.stringify(val);
              if (window.creationStorage && typeof window.creationStorage.setItem === 'function') {
                window.creationStorage.setItem(key, safeBtoa(strVal), () => {
                  resolve(true);
                });
              } else {
                localStorage.setItem(key, strVal);
                resolve(true);
              }
            } catch (e) {
              resolve(false);
            }
          });
        }
      }
    }
  };

  window.R1Bridge = R1Bridge;

  // -------------------------------------------------------------------
  // VÍA 1: Handlers Globales Directos en window (Llamados por Rabbit OS)
  // -------------------------------------------------------------------
  window.onScrollUp = window.onscrollup = function() { R1Bridge.emit('scrollUp'); };
  window.onScrollDown = window.onscrolldown = function() { R1Bridge.emit('scrollDown'); };
  window.onSideClick = window.onsideclick = function() { R1Bridge.emit('sideClick'); };
  window.onLongPressStart = window.onlongpressstart = function() { R1Bridge.emit('longPressStart'); };
  window.onLongPressEnd = window.onlongpressend = function() { R1Bridge.emit('longPressEnd'); };

  // -------------------------------------------------------------------
  // VÍA 2: Teclado Físico Android & Teclas del Dispositivo (Keydown/Keyup)
  // -------------------------------------------------------------------
  let pttTimer = null;
  let pttPressed = false;

  window.addEventListener('keydown', function(e) {
    const k = e.key || '';
    const code = e.keyCode || e.which || 0;

    // Rueda R1 (Arriba)
    if (k === 'ArrowUp' || k === 'PageUp' || code === 38 || code === 33) {
      e.preventDefault();
      R1Bridge.emit('scrollUp');
    }
    // Rueda R1 (Abajo)
    else if (k === 'ArrowDown' || k === 'PageDown' || code === 40 || code === 34) {
      e.preventDefault();
      R1Bridge.emit('scrollDown');
    }
    // Botón PTT Lateral R1
    else if (k === 'Enter' || k === ' ' || k === 'MediaPlayPause' || k === 'HeadsetHook' || code === 13 || code === 32 || code === 79 || code === 179) {
      if (!pttPressed) {
        pttPressed = true;
        pttTimer = setTimeout(() => {
          R1Bridge.emit('longPressStart');
        }, 300);
      }
    }
  }, true);

  window.addEventListener('keyup', function(e) {
    const k = e.key || '';
    const code = e.keyCode || e.which || 0;

    if (k === 'Enter' || k === ' ' || k === 'MediaPlayPause' || k === 'HeadsetHook' || code === 13 || code === 32 || code === 79 || code === 179) {
      if (pttPressed) {
        pttPressed = false;
        if (pttTimer) {
          clearTimeout(pttTimer);
          pttTimer = null;
          // Si soltó rápido, fue un SideClick
          R1Bridge.emit('sideClick');
        } else {
          // Si soltó tras mantener, fue LongPressEnd
          R1Bridge.emit('longPressEnd');
        }
      }
    }
  }, true);

  // -------------------------------------------------------------------
  // VÍA 3: Evento Wheel / Scroll del Navegador
  // -------------------------------------------------------------------
  window.addEventListener('wheel', function(e) {
    if (e.deltaY < 0) {
      R1Bridge.emit('scrollUp');
    } else if (e.deltaY > 0) {
      R1Bridge.emit('scrollDown');
    }
  }, { passive: true });

  // -------------------------------------------------------------------
  // VÍA 4: PostMessage IPC de Rabbit OS
  // -------------------------------------------------------------------
  window.addEventListener('message', function(evt) {
    if (!evt || !evt.data) return;
    try {
      let data = evt.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) {}
      }

      if (data && data.type) {
        R1Bridge.emit(data.type, data.payload || data);
      } else if (typeof data === 'string') {
        if (data.includes('scrollUp')) R1Bridge.emit('scrollUp');
        else if (data.includes('scrollDown')) R1Bridge.emit('scrollDown');
        else if (data.includes('sideClick')) R1Bridge.emit('sideClick');
        else if (data.includes('longPressStart')) R1Bridge.emit('longPressStart');
        else if (data.includes('longPressEnd')) R1Bridge.emit('longPressEnd');
        else if (R1Bridge.messageCallback) R1Bridge.messageCallback(data);
      } else if (R1Bridge.messageCallback) {
        R1Bridge.messageCallback(data);
      }
    } catch (e) {
      console.warn('[r1-bridge] Error procesando evento message:', e);
    }
  });

})();
