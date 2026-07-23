/**
 * r1-bridge.js - Puente de comunicación ultraseguro y resiliente para Rabbit R1.
 * Maneja eventos de hardware, PluginMessageHandler y almacenamiento sin lanzar excepciones.
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

    // Registrar oyente de eventos de hardware r1
    on: function(event, callback) {
      if (typeof callback !== 'function') return;
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    },

    // Emitir evento interno de hardware
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

    // Registrar callback de mensajes devueltos por PluginMessageHandler
    onMessage: function(callback) {
      if (typeof callback === 'function') {
        this.messageCallback = callback;
      }
    },

    // Enviar mensaje hacia Rabbit OS
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

    // Sistema de Almacenamiento seguro
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
              console.warn('[r1-bridge] Error en getItem:', e);
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
              console.warn('[r1-bridge] Error en setItem:', e);
              resolve(false);
            }
          });
        }
      }
    }
  };

  // Exponer globalmente
  window.R1Bridge = R1Bridge;

  // Escuchar mensajes entrantes del sistema operativo Rabbit OS
  window.addEventListener('message', function(evt) {
    if (!evt || !evt.data) return;
    try {
      let data = evt.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) {}
      }

      if (data && data.type) {
        R1Bridge.emit(data.type, data.payload || data);
      } else if (R1Bridge.messageCallback) {
        R1Bridge.messageCallback(data);
      }
    } catch (e) {
      console.warn('[r1-bridge] Error procesando evento message:', e);
    }
  });

})();
