
/*
 * NOVA APPS — REPORTES FINANCIEROS
 * Archivo: js/finanzas/reportes.js
 */

"use strict";

(function () {
  const CUENTAS = ["bancario", "tarjeta"];
  const TIPOS = ["ingreso", "gasto"];

  function redondear(valor) {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

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

    const porCategoria = {};

    lista.forEach(op => {
      const cuenta = porCuenta[op.cuenta];
      cuenta.cantidad += 1;

      const categoria =
        typeof op.categoria === "string" && op.categoria.trim()
          ? op.categoria.trim()
          : "otros";

      if (!porCategoria[categoria]) {
        porCategoria[categoria] = {
          ingresos: 0,
          gastos: 0,
          cantidad: 0
        };
      }

      porCategoria[categoria].cantidad += 1;

      if (op.tipo === "ingreso") {
        ingresos += op.importe;
        cuenta.ingresos += op.importe;
        porCategoria[categoria].ingresos += op.importe;
      } else {
        gastos += op.importe;
        cuenta.gastos += op.importe;
        porCategoria[categoria].gastos += op.importe;
      }
    });

    Object.keys(porCategoria).forEach(categoria => {
      porCategoria[categoria].ingresos =
        redondear(porCategoria[categoria].ingresos);
      porCategoria[categoria].gastos =
        redondear(porCategoria[categoria].gastos);
    });

    return {
      cantidadOperaciones: lista.length,
      ingresos: redondear(ingresos),
      gastos: redondear(gastos),
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
      },

      porCategoria
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

  function filtrarPorCategoria(operaciones, categoria) {
    const lista = obtenerOperaciones(operaciones);

    if (categoria === "todas") return lista;

    return lista.filter(op => {
      const valor = op.categoria || "otros";
      return valor === categoria;
    });
  }

  function mayoresGastos(operaciones, limite) {
    const cantidad =
      Number.isInteger(limite) && limite > 0
        ? Math.min(limite, 100)
        : 10;

    return obtenerOperaciones(operaciones)
      .filter(op => op.tipo === "gasto")
      .sort((a, b) => b.importe - a.importe)
      .slice(0, cantidad);
  }

  function gastosPorCategoria(operaciones) {
    const resultado = {};

    obtenerOperaciones(operaciones)
      .filter(op => op.tipo === "gasto")
      .forEach(op => {
        const categoria = op.categoria || "otros";

        resultado[categoria] =
          (resultado[categoria] || 0) + op.importe;
      });

    Object.keys(resultado).forEach(categoria => {
      resultado[categoria] = redondear(resultado[categoria]);
    });

    return resultado;
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
    filtrarPorCategoria,
    mayoresGastos,
    gastosPorCategoria,
    formatearCUP
  });
})();
