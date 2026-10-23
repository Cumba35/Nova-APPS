
/*
 * NOVA APPS — Módulo principal
 * Ruta: js/main.js
 *
 * Versión inicial sin conexión a Supabase.
 * No contiene claves privadas ni credenciales.
 */

(function () {
  "use strict";

  const Nova = window.Nova || {};

  Nova.version = "1.0.0";

  Nova.config = Object.freeze({
    appName: "Nova Apps",
    homeUrl: "./index.html",
    themeStorageKey: "nova-theme",
    debug: false
  });

  /**
   * Busca un elemento por su ID.
   */
  Nova.get = function (id) {
    return document.getElementById(id);
  };

  /**
   * Busca elementos mediante un selector CSS.
   */
  Nova.query = function (selector, root) {
    return (root || document).querySelector(selector);
  };

  /**
   * Busca todos los elementos que coinciden con un selector.
   */
  Nova.queryAll = function (selector, root) {
    return Array.from(
      (root || document).querySelectorAll(selector)
    );
  };

  /**
   * Registra mensajes únicamente cuando el modo de depuración
   * está activado.
   */
  Nova.log = function (...args) {
    if (Nova.config.debug) {
      console.log("[Nova Apps]", ...args);
    }
  };

  /**
   * Muestra una notificación accesible.
   * Utiliza un contenedor existente o crea uno.
   */
  Nova.notify = function (message, type) {
    const text = String(message || "").trim();

    if (!text) return;

    let container = Nova.get("novaNotifications");

    if (!container) {
      container = document.createElement("div");
      container.id = "novaNotifications";
      container.setAttribute("aria-live", "polite");
      container.setAttribute("role", "status");

      Object.assign(container.style, {
        position: "fixed",
        right: "16px",
        bottom: "16px",
        zIndex: "99999",
        display: "grid",
        gap: "8px",
        maxWidth: "min(360px, calc(100vw - 32px))"
      });

      document.body.appendChild(container);
    }

    const item = document.createElement("div");
    item.textContent = text;
    item.dataset.type = type || "info";

    Object.assign(item.style, {
      padding: "12px 16px",
      borderRadius: "10px",
      background: "#172033",
      color: "#ffffff",
      boxShadow: "0 4px 18px rgba(0,0,0,.2)",
      overflowWrap: "anywhere"
    });

    container.appendChild(item);

    // Se elimina al hacer clic; no se utilizan temporizadores.
    item.title = "Pulsa para cerrar";
    item.tabIndex = 0;
    item.style.cursor = "pointer";

    const remove = function () {
      item.remove();
    };

    item.addEventListener("click", remove);
    item.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        remove();
      }
    });
  };

  /**
   * Lee el tema guardado.
   */
  Nova.getTheme = function () {
    try {
      return localStorage.getItem(
        Nova.config.themeStorageKey
      ) || "system";
    } catch (error) {
      Nova.log("No se pudo leer el tema:", error);
      return "system";
    }
  };

  /**
   * Guarda y aplica el tema cuando el documento lo permite.
   * Los valores admitidos son: light, dark y system.
   */
  Nova.setTheme = function (theme) {
    const allowed = ["light", "dark", "system"];

    if (!allowed.includes(theme)) {
      throw new Error("Tema no válido.");
    }

    try {
      localStorage.setItem(
        Nova.config.themeStorageKey,
        theme
      );
    } catch (error) {
      Nova.log("No se pudo guardar el tema:", error);
    }

    const root = document.documentElement;

    if (theme === "system") {
      root.removeAttribute("data-theme");
      root.style.colorScheme = "light dark";
    } else {
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
    }

    return theme;
  };

  /**
   * Prepara enlaces internos que indiquen que requieren
   * confirmación antes de navegar.
   *
   * Uso posterior:
   * <a href="..." data-nova-confirm="¿Deseas continuar?">
   */
  Nova.enableNavigationConfirmations = function () {
    document.addEventListener("click", function (event) {
      const link = event.target.closest(
        "a[data-nova-confirm]"
      );

      if (!link) return;

      const message = link.dataset.novaConfirm;

      if (message && !window.confirm(message)) {
        event.preventDefault();
      }
    });
  };

  /**
   * Comprueba si el navegador tiene conexión de red.
   * No garantiza que un servidor concreto esté disponible.
   */
  Nova.isOnline = function () {
    return navigator.onLine;
  };

  /**
   * Inicialización segura.
   */
  Nova.init = function () {
    Nova.setTheme(Nova.getTheme());
    Nova.enableNavigationConfirmations();

    window.addEventListener("online", function () {
      Nova.notify("La conexión de red está disponible.", "success");
    });

    window.addEventListener("offline", function () {
      Nova.notify("No hay conexión de red.", "warning");
    });

    Nova.log("Módulo principal inicializado.");
  };

  window.Nova = Nova;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      Nova.init,
      { once: true }
    );
  } else {
    Nova.init();
  }
})();
