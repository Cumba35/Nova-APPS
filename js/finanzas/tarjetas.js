
/*
 * NOVA APPS — GESTIÓN DE TARJETAS
 * Archivo: js/finanzas/tarjetas.js
 *
 * Utilidades para tarjetas de demostración.
 * No conecta con bancos ni procesa pagos reales.
 */

"use strict";

(function () {
  const MAX_TARJETAS = 200;

  function validarAlias(alias) {
    return typeof alias === "string" &&
      alias.trim().length > 0 &&
      alias.trim().length <= 40;
  }

  function validarUltimosDigitos(ultimos) {
    if (ultimos === "" || ultimos == null) {
      return true;
    }

    return /^[0-9]{4}$/.test(String(ultimos));
  }

  function crearTarjeta(alias, ultimos) {
    const nombre = typeof alias === "string"
      ? alias.trim()
      : "";

    const digitos = ultimos == null
      ? ""
      : String(ultimos).trim();

    if (!validarAlias(nombre)) {
      return {
        correcta: false,
        error: "Escribe un alias de hasta 40 caracteres."
      };
    }

    if (!validarUltimosDigitos(digitos)) {
      return {
        correcta: false,
        error: "Solo puedes indicar los últimos cuatro dígitos."
      };
    }

    return {
      correcta: true,
      tarjeta: {
        id: crearId(),
        alias: nombre,
        ultimos: digitos
      }
    };
  }

  function crearId() {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return window.crypto.randomUUID();
    }

    return Date.now().toString(36) +
      Math.random().toString(36).slice(2);
  }

  function validarLista(tarjetas) {
    if (!Array.isArray(tarjetas)) {
      return {
        correcta: false,
        error: "La lista de tarjetas no es válida."
      };
    }

    if (tarjetas.length > MAX_TARJETAS) {
      return {
        correcta: false,
        error: "Se alcanzó el límite de tarjetas."
      };
    }

    const ids = new Set();

    for (const tarjeta of tarjetas) {
      if (
        !tarjeta ||
        typeof tarjeta.id !== "string" ||
        !validarAlias(tarjeta.alias) ||
        !validarUltimosDigitos(tarjeta.ultimos || "")
      ) {
        return {
          correcta: false,
          error: "Una tarjeta contiene datos incorrectos."
        };
      }

      if (ids.has(tarjeta.id)) {
        return {
          correcta: false,
          error: "Hay tarjetas con identificadores repetidos."
        };
      }

      ids.add(tarjeta.id);
    }

    return { correcta: true };
  }

  function formatearTarjeta(tarjeta) {
    if (!tarjeta || !validarAlias(tarjeta.alias)) {
      return "Tarjeta de demostración";
    }

    const alias = tarjeta.alias.trim();

    if (validarUltimosDigitos(tarjeta.ultimos || "") &&
        tarjeta.ultimos) {
      return alias + " · **** " + tarjeta.ultimos;
    }

    return alias;
  }

  function renderizarLista(contenedor, tarjetas) {
    if (!contenedor || !contenedor.ownerDocument) {
      return false;
    }

    const validacion = validarLista(tarjetas);

    if (!validacion.correcta) {
      return false;
    }

    const documento = contenedor.ownerDocument;
    const fragmento = documento.createDocumentFragment();

    if (tarjetas.length === 0) {
      const vacio = documento.createElement("div");
      vacio.className = "vacio";
      vacio.textContent = "No hay tarjetas de demostración.";
      fragmento.appendChild(vacio);
    } else {
      tarjetas.forEach(tarjeta => {
        const fila = documento.createElement("div");
        fila.className = "operacion";

        const nombre = documento.createElement("div");
        nombre.className = "operacion-nombre";
        nombre.textContent = formatearTarjeta(tarjeta);

        const etiqueta = documento.createElement("span");
        etiqueta.className = "etiqueta";
        etiqueta.textContent = "DEMO";

        fila.append(nombre, etiqueta);
        fragmento.appendChild(fila);
      });
    }

    contenedor.replaceChildren(fragmento);
    return true;
  }

  window.NovaFinanzasTarjetas = Object.freeze({
    validarAlias,
    validarUltimosDigitos,
    crearTarjeta,
    validarLista,
    formatearTarjeta,
    renderizarLista,
    maximoTarjetas: MAX_TARJETAS
  });
})();
