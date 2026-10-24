
/*
 * NOVA APPS — MÓDULO DE OPERACIONES
 * Archivo: js/finanzas/operaciones.js
 *
 * Funciones independientes para el historial financiero.
 * Solo trabaja con datos de demostración.
 */

"use strict";

(function () {
  const CUENTAS = ["bancario", "tarjeta"];
  const TIPOS = ["ingreso", "gasto"];
  const MAX_IMPORTE = 1000000000;
  const MAX_OPERACIONES = 5000;

  function redondear(importe) {
    return Math.round((importe + Number.EPSILON) * 100) / 100;
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

  function validarImporte(importe) {
    return typeof importe === "number" &&
      Number.isFinite(importe) &&
      importe > 0 &&
      importe <= MAX_IMPORTE;
  }

  function validarOperacion(datos) {
    if (!datos || typeof datos !== "object") {
      return {
        correcta: false,
        error: "Los datos de la operación no son válidos."
      };
    }

    const descripcion = typeof datos.descripcion === "string"
      ? datos.descripcion.trim().slice(0, 80)
      : "";

    if (!descripcion) {
      return {
        correcta: false,
        error: "La descripción es obligatoria."
      };
    }

    if (!TIPOS.includes(datos.tipo)) {
      return {
        correcta: false,
        error: "Selecciona un tipo de operación válido."
      };
    }

    if (!CUENTAS.includes(datos.cuenta)) {
      return {
        correcta: false,
        error: "Selecciona una cuenta válida."
      };
    }

    if (!validarImporte(datos.importe)) {
      return {
        correcta: false,
        error: "El importe debe ser mayor que cero."
      };
    }

    return {
      correcta: true,
      operacion: {
        id: crearId(),
        descripcion,
        tipo: datos.tipo,
        cuenta: datos.cuenta,
        importe: redondear(datos.importe),
        fecha: new Date().toISOString()
      }
    };
  }

  function validarSaldos(saldos) {
    return Boolean(
      saldos &&
      typeof saldos === "object" &&
      Number.isFinite(saldos.bancario) &&
      Number.isFinite(saldos.tarjeta) &&
      saldos.bancario >= 0 &&
      saldos.tarjeta >= 0
    );
  }

  /*
   * Calcula un nuevo estado sin modificar los datos originales.
   */
  function aplicarOperacion(saldos, operaciones, entrada) {
    if (!validarSaldos(saldos)) {
      return {
        correcta: false,
        error: "Los saldos actuales no son válidos."
      };
    }

    if (!Array.isArray(operaciones)) {
      return {
        correcta: false,
        error: "El historial de operaciones no es válido."
      };
    }

    if (operaciones.length >= MAX_OPERACIONES) {
      return {
        correcta: false,
        error: "Se alcanzó el límite del historial."
      };
    }

    const resultado = validarOperacion(entrada);

    if (!resultado.correcta) {
      return resultado;
    }

    const operacion = resultado.operacion;
    const nuevosSaldos = {
      bancario: redondear(saldos.bancario),
      tarjeta: redondear(saldos.tarjeta)
    };

    const cambio = operacion.tipo === "ingreso"
      ? operacion.importe
      : -operacion.importe;

    const saldoNuevo = redondear(
      nuevosSaldos[operacion.cuenta] + cambio
    );

    if (saldoNuevo < 0) {
      return {
        correcta: false,
        error: "El saldo de demostración es insuficiente."
      };
    }

    nuevosSaldos[operacion.cuenta] = saldoNuevo;

    return {
      correcta: true,
      saldos: nuevosSaldos,
      operaciones: operaciones.concat(operacion),
      operacion
    };
  }

  /*
   * Simula un movimiento entre los dos saldos locales.
   * No envía dinero a otras cuentas ni a tarjetas reales.
   */
  function simularTransferencia(
    saldos,
    operaciones,
    origen,
    destino,
    importe
  ) {
    if (!validarSaldos(saldos)) {
      return {
        correcta: false,
        error: "Los saldos actuales no son válidos."
      };
    }

    if (
      !Array.isArray(operaciones) ||
      operaciones.length + 2 > MAX_OPERACIONES
    ) {
      return {
        correcta: false,
        error: "No hay espacio en el historial."
      };
    }

    if (
      !CUENTAS.includes(origen) ||
      !CUENTAS.includes(destino) ||
      origen === destino
    ) {
      return {
        correcta: false,
        error: "Elige dos cuentas de demostración diferentes."
      };
    }

    if (!validarImporte(importe)) {
      return {
        correcta: false,
        error: "Introduce un importe válido."
      };
    }

    importe = redondear(importe);

    if (saldos[origen] < importe) {
      return {
        correcta: false,
        error: "El saldo de demostración es insuficiente."
      };
    }

    const nuevosSaldos = {
      bancario: redondear(saldos.bancario),
      tarjeta: redondear(saldos.tarjeta)
    };

    nuevosSaldos[origen] = redondear(
      nuevosSaldos[origen] - importe
    );

    nuevosSaldos[destino] = redondear(
      nuevosSaldos[destino] + importe
    );

    const fecha = new Date().toISOString();

    const salida = {
      id: crearId(),
      descripcion: "Transferencia simulada de salida",
      tipo: "gasto",
      cuenta: origen,
      importe,
      fecha
    };

    const entrada = {
      id: crearId(),
      descripcion: "Transferencia simulada de entrada",
      tipo: "ingreso",
      cuenta: destino,
      importe,
      fecha
    };

    return {
      correcta: true,
      saldos: nuevosSaldos,
      operaciones: operaciones.concat([salida, entrada]),
      operacionesCreadas: [salida, entrada]
    };
  }

  function ordenarOperaciones(operaciones, orden) {
    if (!Array.isArray(operaciones)) return [];

    const resultado = operaciones.slice();

    if (orden === "importeDesc") {
      resultado.sort((a, b) => b.importe - a.importe);
    } else if (orden === "importeAsc") {
      resultado.sort((a, b) => a.importe - b.importe);
    } else {
      resultado.sort((a, b) =>
        Date.parse(b.fecha) - Date.parse(a.fecha)
      );
    }

    return resultado;
  }

  function filtrarOperaciones(operaciones, cuenta) {
    if (!Array.isArray(operaciones)) return [];

    if (cuenta === "todas") {
      return operaciones.slice();
    }

    if (!CUENTAS.includes(cuenta)) {
      return [];
    }

    return operaciones.filter(op => op.cuenta === cuenta);
  }

  function formatearImporte(importe) {
    if (!Number.isFinite(importe)) return "0,00 CUP";

    return redondear(importe).toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " CUP";
  }

  window.NovaFinanzasOperaciones = Object.freeze({
    validarImporte,
    validarOperacion,
    validarSaldos,
    aplicarOperacion,
    simularTransferencia,
    ordenarOperaciones,
    filtrarOperaciones,
    formatearImporte,
    maximoOperaciones: MAX_OPERACIONES
  });
})();
