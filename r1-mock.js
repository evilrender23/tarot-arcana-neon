/**
 * r1-mock.js - Entorno de simulación para desarrollo local.
 * Desactivado automáticamente en hardware real Rabbit R1.
 */

(function() {
  'use strict';

  // Si existe PluginMessageHandler real o estamos en el hardware r1, desactivar simulador
  const isRealHardware = !!(
    window.PluginMessageHandler ||
    (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.PluginMessageHandler) ||
    /Rabbit/i.test(navigator.userAgent)
  );

  if (isRealHardware) {
    console.log('[r1-mock] Hardware real detectado. Simulador desactivado.');
    return;
  }

  // Teclas para simulación en ordenador local (desarrollo)
  window.addEventListener('keydown', function(e) {
    if (!window.R1Bridge) return;
    if (e.key === 'ArrowUp') {
      window.R1Bridge.emit('scrollUp');
    } else if (e.key === 'ArrowDown') {
      window.R1Bridge.emit('scrollDown');
    } else if (e.key === ' ' || e.key === 'Enter') {
      window.R1Bridge.emit('sideClick');
    }
  });

})();
