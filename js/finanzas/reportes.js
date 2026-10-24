
/*
 * NOVA APPS — REPORTES FINANCIEROS
 * Archivo: js/finanzas/reportes.js
 *
 * Calcula estadísticas a partir de operaciones locales.
 * Los resultados son de demostración, no estados bancarios reales.
 */

"use strict";

(function () {
  const CUENTAS = ["bancario", "tarjeta"];
  const TIPOS = ["ingreso", "gasto"];

  function esOperacionValida(op) {
    return Boolean(
      op &&
      typeof op === "object" &&
      typeof op.descripcion === "string" &&
      TIPOS.includes(op.tipo) &&
      CUENTAS.includes(op.cuenta) &&
      typeof op.importe === "number" &&
      Number.isFinite(op.importe) &&
      op.importe > 0 &&
      typeof op.fecha === "string" &&
      Number.isFinite(Date.parse(op.fecha))
    );
  }

  function redondear(valor) {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  function obtenerOperaciones(operaciones) {
    if (!Array.isArray(operaciones)) return [];
    return operaciones.filter(esOperacionValida);
  }

  function resumir(operaciones) {
    const lista = obtenerOperaciones(operaciones);

    let ingresos = 0;
    let gastos = 0;

    const porCuenta = {
      bancario: { ingresos: 0, gastos: 0, cantidad: 0 },
      tarjeta: { ingresos: 0, gastos: 0, cantidad: 0 }
    };

    lista.forEach(op => {
      const cuenta = porCuenta[op.cuenta];

      cuenta.cantidad += 1;

      if (op.tipo === "ingreso") {
        ingresos += op.importe;
        cuenta.ingresos += op.importe;
      } else {
        gastos += op.importe;
        cuenta.gastos += op.importe;
      }
    });

    ingresos = redondear(ingresos);
    gastos = redondear(gastos);

    return {
      cantidadOperaciones: lista.length,
      ingresos,
      gastos,
      balanceNeto: redondear(ingresos - gastos),
      porCuenta: {
        bancario: {
          ingresos: redondear(porCuenta.bancario.ingresos),
          gastos: redondear(porCuenta.bancario.gastos),
          balanceNeto: redondear(
            porCuenta.bancario.ingresos -
            porCuenta.bancario.gastos
          ),
          cantidad: porCuenta.bancario.cantidad
        },
        tarjeta: {
          ingresos: redondear(porCuenta.tarjeta.ingresos),
          gastos: redondear(porCuenta.tarjeta.gastos),
          balanceNeto: redondear(
            porCuenta.tarjeta.ingresos -
            porCuenta.tarjeta.gastos
          ),
          cantidad: porCuenta.tarjeta.cantidad
        }
      }
    };
  }

  function resumirPeriodo(operaciones, inicio, fin) {
    const fechaInicio = Date.parse(inicio);
    const fechaFin = Date.parse(fin);

    if (
      !Number.isFinite(fechaInicio) ||
      !Number.isFinite(fechaFin) ||
      fechaInicio > fechaFin
    ) {
      return {
        correcta: false,
        error: "El intervalo de fechas no es válido."
      };
    }

    const lista = obtenerOperaciones(operaciones).filter(op => {
      const fecha = Date.parse(op.fecha);
      return fecha >= fechaInicio && fecha <= fechaFin;
    });

    return {
      correcta: true,
      inicio,
      fin,
      resumen: resumir(lista)
    };
  }

  function filtrarPorTipo(operaciones, tipo) {
    const lista = obtenerOperaciones(operaciones);

    if (tipo === "todos") return lista;

    if (!TIPOS.includes(tipo)) return [];

    return lista.filter(op => op.tipo === tipo);
  }

  function filtrarPorCuenta(operaciones, cuenta) {
    const lista = obtenerOperaciones(operaciones);

    if (cuenta === "todas") return lista;

    if (!CUENTAS.includes(cuenta)) return [];

    return lista.filter(op => op.cuenta === cuenta);
  }

  function mayoresGastos(operaciones, limite) {
    const cantidad = Number.isInteger(limite) && limite > 0
      ? Math.min(limite, 100)
      : 10;

    return obtenerOperaciones(operaciones)
      .filter(op => op.tipo === "gasto")
      .sort((a, b) => b.importe - a.importe)
      .slice(0, cantidad);
  }

  function formatearCUP(valor) {
    if (!Number.isFinite(valor)) return "0,00 CUP";

    return redondear(valor).toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " CUP";
  }

  window.NovaFinanzasReportes = Object.freeze({
    resumir,
    resumirPeriodo,
    filtrarPorTipo,
    filtrarPorCuenta,
    mayoresGastos,
    formatearCUP
  });
})();
