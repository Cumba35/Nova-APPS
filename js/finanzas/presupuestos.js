
/* =========================================================
   NOVA FINANZAS — GESTOR DE PRESUPUESTOS
   Archivo: js/finanzas/presupuestos.js
   Versión: 1.0.0

   Funciones:
   - Crear y validar presupuestos.
   - Establecer límites mensuales por categoría.
   - Calcular gastos y dinero disponible.
   - Detectar presupuestos excedidos.
   - Guardar datos localmente.
   - Exportar presupuestos en formato JSON.

   Nota:
   Este módulo todavía no está conectado a finanzas.html
   ni a Supabase.
========================================================= */

(function (global) {
  "use strict";

  const CLAVE = "nova_finanzas_presupuestos_v1";

  const NovaFinanzasPresupuestos = {
    version: "1.0.0",

    categorias: [
      "Alimentación",
      "Transporte",
      "Vivienda",
      "Electricidad",
      "Internet",
      "Salud",
      "Educación",
      "Compras",
      "Entretenimiento",
      "Otros"
    ],

    obtenerTodos: function () {
      try {
        const contenido = global.localStorage.getItem(CLAVE);

        if (!contenido) {
          return [];
        }

        const datos = JSON.parse(contenido);

        return Array.isArray(datos) ? datos : [];
      } catch (error) {
        console.error(
          "[Nova Finanzas] No se pudieron leer los presupuestos:",
          error
        );

        return [];
      }
    },

    guardarTodos: function (presupuestos) {
      if (!Array.isArray(presupuestos)) {
        throw new TypeError(
          "Los presupuestos deben proporcionarse como una lista."
        );
      }

      global.localStorage.setItem(
        CLAVE,
        JSON.stringify(presupuestos)
      );

      return true;
    },

    validar: function (datos) {
      const errores = [];

      if (!datos || typeof datos !== "object") {
        return {
          valido: false,
          errores: ["Debes proporcionar los datos del presupuesto."]
        };
      }

      const categoria = String(datos.categoria || "").trim();
      const limite = Number(datos.limite);
      const mes = String(datos.mes || "").trim();

      if (!categoria) {
        errores.push("La categoría es obligatoria.");
      }

      if (!Number.isFinite(limite) || limite <= 0) {
        errores.push("El límite debe ser mayor que cero.");
      }

      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
        errores.push("El mes debe tener el formato AAAA-MM.");
      }

      return {
        valido: errores.length === 0,
        errores: errores
      };
    },

    crear: function (datos) {
      const validacion = this.validar(datos);

      if (!validacion.valido) {
        return {
          correcto: false,
          errores: validacion.errores
        };
      }

      const categoria = String(datos.categoria).trim();
      const mes = String(datos.mes).trim();
      const limite = Number(datos.limite);

      const presupuestos = this.obtenerTodos();

      const existente = presupuestos.find(function (item) {
        return (
          item.categoria.toLowerCase() ===
            categoria.toLowerCase() &&
          item.mes === mes
        );
      });

      if (existente) {
        return {
          correcto: false,
          errores: [
            "Ya existe un presupuesto para esa categoría y ese mes."
          ]
        };
      }

      const presupuesto = {
        id: this.generarId(),
        categoria: categoria,
        limite: limite,
        mes: mes,
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString()
      };

      presupuestos.push(presupuesto);
      this.guardarTodos(presupuestos);

      return {
        correcto: true,
        presupuesto: presupuesto
      };
    },

    actualizar: function (id, cambios) {
      const presupuestos = this.obtenerTodos();

      const indice = presupuestos.findIndex(function (item) {
        return item.id === id;
      });

      if (indice === -1) {
        return {
          correcto: false,
          errores: ["No se encontró el presupuesto."]
        };
      }

      const anterior = presupuestos[indice];

      const actualizado = {
        ...anterior,
        categoria:
          cambios.categoria !== undefined
            ? String(cambios.categoria).trim()
            : anterior.categoria,
        limite:
          cambios.limite !== undefined
            ? Number(cambios.limite)
            : anterior.limite,
        mes:
          cambios.mes !== undefined
            ? String(cambios.mes).trim()
            : anterior.mes,
        actualizadoEn: new Date().toISOString()
      };

      const validacion = this.validar(actualizado);

      if (!validacion.valido) {
        return {
          correcto: false,
          errores: validacion.errores
        };
      }

      const duplicado = presupuestos.some(function (item) {
        return (
          item.id !== id &&
          item.categoria.toLowerCase() ===
            actualizado.categoria.toLowerCase() &&
          item.mes === actualizado.mes
        );
      });

      if (duplicado) {
        return {
          correcto: false,
          errores: [
            "Ya existe otro presupuesto con esa categoría y ese mes."
          ]
        };
      }

      presupuestos[indice] = actualizado;
      this.guardarTodos(presupuestos);

      return {
        correcto: true,
        presupuesto: actualizado
      };
    },

    eliminar: function (id) {
      const presupuestos = this.obtenerTodos();

      const restantes = presupuestos.filter(function (item) {
        return item.id !== id;
      });

      if (restantes.length === presupuestos.length) {
        return false;
      }

      this.guardarTodos(restantes);
      return true;
    },

    obtenerPorMes: function (mes) {
      return this.obtenerTodos().filter(function (item) {
        return item.mes === mes;
      });
    },

    calcular: function (presupuesto, operaciones) {
      const lista = Array.isArray(operaciones)
        ? operaciones
        : [];

      const inicio = presupuesto.mes + "-01";
      const partes = presupuesto.mes.split("-").map(Number);
      const siguienteMes = new Date(
        partes[0],
        partes[1],
        1
      );

      const fin = [
        siguienteMes.getFullYear(),
        String(siguienteMes.getMonth() + 1).padStart(2, "0"),
        "01"
      ].join("-");

      const gastos = lista.filter(function (operacion) {
        if (!operacion || typeof operacion !== "object") {
          return false;
        }

        const fecha = String(
          operacion.fecha || operacion.creadoEn || ""
        ).slice(0, 10);

        const tipo = String(
          operacion.tipo || ""
        ).toLowerCase();

        const categoria = String(
          operacion.categoria || operacion.nombre || ""
        ).trim().toLowerCase();

        return (
          tipo === "gasto" &&
          fecha >= inicio &&
          fecha < fin &&
          categoria === presupuesto.categoria.toLowerCase()
        );
      });

      const gastado = gastos.reduce(function (total, operacion) {
        const importe = Number(
          operacion.importe ?? operacion.monto ?? 0
        );

        return total +
          (Number.isFinite(importe) && importe > 0
            ? importe
            : 0);
      }, 0);

      const limite = Number(presupuesto.limite) || 0;
      const disponible = limite - gastado;
      const porcentaje = limite > 0
        ? (gastado / limite) * 100
        : 0;

      return {
        categoria: presupuesto.categoria,
        mes: presupuesto.mes,
        limite: limite,
        gastado: gastado,
        disponible: disponible,
        porcentaje: Math.round(porcentaje * 100) / 100,
        excedido: gastado > limite,
        alcanzado: gastado >= limite,
        operaciones: gastos.length
      };
    },

    resumirMes: function (mes, operaciones) {
      const presupuestos = this.obtenerPorMes(mes);
      const resultados = presupuestos.map((presupuesto) =>
        this.calcular(presupuesto, operaciones)
      );

      const limiteTotal = resultados.reduce(
        (total, item) => total + item.limite,
        0
      );

      const gastadoTotal = resultados.reduce(
        (total, item) => total + item.gastado,
        0
      );

      return {
        mes: mes,
        cantidad: resultados.length,
        limiteTotal: limiteTotal,
        gastadoTotal: gastadoTotal,
        disponibleTotal: limiteTotal - gastadoTotal,
        excedidos: resultados.filter(
          (item) => item.excedido
        ).length,
        presupuestos: resultados
      };
    },

    exportarJSON: function () {
      const datos = this.obtenerTodos();

      return JSON.stringify(datos, null, 2);
    },

    generarId: function () {
      if (
        global.crypto &&
        typeof global.crypto.randomUUID === "function"
      ) {
        return global.crypto.randomUUID();
      }

      return (
        "presupuesto-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 10)
      );
    },

    formatearImporte: function (importe, moneda) {
      const valor = Number(importe);

      if (!Number.isFinite(valor)) {
        return "Importe no válido";
      }

      return new Intl.NumberFormat("es", {
        style: "currency",
        currency: moneda || "CUP",
        maximumFractionDigits: 2
      }).format(valor);
    }
  };

  global.NovaFinanzasPresupuestos =
    NovaFinanzasPresupuestos;

})(window);
