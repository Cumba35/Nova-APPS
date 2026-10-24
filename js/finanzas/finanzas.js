
/*
 * NOVA APPS — FINANZAS
 * Archivo: js/finanzas/finanzas.js
 * Versión: 3.0.0
 * Prototipo local: no mueve dinero real.
 */

"use strict";

(function () {
  const CLAVE = "nova_finanzas_demo_v1";
  const MAX_OPERACIONES = 5000;
  const MAX_TARJETAS = 200;
  const MAX_IMPORTE = 1000000000;

  const CUENTAS = ["bancario", "tarjeta"];
  const TIPOS = ["ingreso", "gasto"];

  const CATEGORIAS = {
    alimentacion: "Alimentación",
    transporte: "Transporte",
    hogar: "Hogar",
    servicios: "Servicios",
    salud: "Salud",
    educacion: "Educación",
    entretenimiento: "Entretenimiento",
    compras: "Compras",
    otros: "Otros"
  };

  const moduloOperaciones = window.NovaFinanzasOperaciones;
  const moduloTarjetas = window.NovaFinanzasTarjetas;
  const moduloReportes = window.NovaFinanzasReportes;

  function estadoInicial() {
    return {
      saldos: { bancario: 0, tarjeta: 0 },
      operaciones: [],
      tarjetas: []
    };
  }

  function redondear(valor) {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }

  function dinero(valor) {
    if (moduloReportes &&
        typeof moduloReportes.formatearCUP === "function") {
      return moduloReportes.formatearCUP(valor);
    }

    return Number(valor).toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " CUP";
  }

  function textoSeguro(valor, maximo) {
    return typeof valor === "string"
      ? valor.trim().slice(0, maximo)
      : "";
  }

  function crearId() {
    if (window.crypto &&
        typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return Date.now().toString(36) +
      Math.random().toString(36).slice(2);
  }

  function nombreCuenta(cuenta) {
    return cuenta === "bancario"
      ? "Saldo bancario"
      : "Saldo en tarjetas";
  }

  function nombreCategoria(categoria) {
    return CATEGORIAS[categoria] || CATEGORIAS.otros;
  }

  function estadoMensaje(mensaje) {
    const elemento = document.getElementById("estado");
    if (elemento) elemento.textContent = mensaje;
  }

  function elementoTexto(etiqueta, contenido, clase) {
    const elemento = document.createElement(etiqueta);
    elemento.textContent = contenido;
    if (clase) elemento.className = clase;
    return elemento;
  }

  function validarOperacion(op) {
    return Boolean(
      op &&
      typeof op.id === "string" &&
      typeof op.descripcion === "string" &&
      TIPOS.includes(op.tipo) &&
      CUENTAS.includes(op.cuenta) &&
      typeof op.importe === "number" &&
      Number.isFinite(op.importe) &&
      op.importe > 0 &&
      op.importe <= MAX_IMPORTE &&
      typeof op.fecha === "string" &&
      Number.isFinite(Date.parse(op.fecha))
    );
  }

  function validarTarjeta(tarjeta) {
    return Boolean(
      tarjeta &&
      typeof tarjeta.id === "string" &&
      typeof tarjeta.alias === "string" &&
      tarjeta.alias.trim().length > 0 &&
      tarjeta.alias.length <= 40 &&
      typeof tarjeta.ultimos === "string" &&
      (tarjeta.ultimos === "" ||
        /^[0-9]{4}$/.test(tarjeta.ultimos))
    );
  }

  function cargar() {
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (!guardado) return estadoInicial();

      const original = JSON.parse(guardado);

      if (
        !original ||
        typeof original !== "object" ||
        !original.saldos ||
        !Number.isFinite(original.saldos.bancario) ||
        !Number.isFinite(original.saldos.tarjeta) ||
        original.saldos.bancario < 0 ||
        original.saldos.tarjeta < 0 ||
        !Array.isArray(original.operaciones) ||
        !Array.isArray(original.tarjetas)
      ) {
        estadoMensaje("Los datos guardados no son válidos.");
        return estadoInicial();
      }

      const operaciones = original.operaciones
        .filter(validarOperacion)
        .slice(-MAX_OPERACIONES)
        .map(op => ({
          ...op,
          categoria: Object.prototype.hasOwnProperty.call(
            CATEGORIAS,
            op.categoria
          ) ? op.categoria : "otros"
        }));

      return {
        saldos: {
          bancario: redondear(original.saldos.bancario),
          tarjeta: redondear(original.saldos.tarjeta)
        },
        operaciones,
        tarjetas: original.tarjetas
          .filter(validarTarjeta)
          .slice(0, MAX_TARJETAS)
      };
    } catch (error) {
      console.error("Nova Finanzas: error al cargar datos locales.");
      return estadoInicial();
    }
  }

  let datos = cargar();

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
      return true;
    } catch (error) {
      estadoMensaje("No se pudieron guardar los datos en este navegador.");
      return false;
    }
  }

  function clonarDatos() {
    return {
      saldos: { ...datos.saldos },
      operaciones: datos.operaciones.map(op => ({ ...op })),
      tarjetas: datos.tarjetas.map(tarjeta => ({ ...tarjeta }))
    };
  }

  function confirmarCambio(borrador, mensaje) {
    const anterior = datos;
    datos = borrador;

    if (!guardar()) {
      datos = anterior;
      renderizar();
      return false;
    }

    renderizar();

    if (window.NovaFinanzasPresupuestos &&
        typeof window.NovaFinanzasPresupuestos.renderizar === "function") {
      window.NovaFinanzasPresupuestos.renderizar();
    }

    estadoMensaje(mensaje);
    return true;
  }

  function agregarOperacion(descripcion, tipo, cuenta, categoria, importe) {
    descripcion = textoSeguro(descripcion, 80);

    if (
      !descripcion ||
      !TIPOS.includes(tipo) ||
      !CUENTAS.includes(cuenta) ||
      !Object.prototype.hasOwnProperty.call(CATEGORIAS, categoria) ||
      !Number.isFinite(importe) ||
      importe <= 0 ||
      importe > MAX_IMPORTE
    ) {
      estadoMensaje("Comprueba la descripción, tipo, cuenta, categoría e importe.");
      return false;
    }

    if (datos.operaciones.length >= MAX_OPERACIONES) {
      estadoMensaje("Se alcanzó el límite de operaciones de demostración.");
      return false;
    }

    importe = redondear(importe);

    let resultado;

    if (moduloOperaciones &&
        typeof moduloOperaciones.aplicarOperacion === "function") {
      resultado = moduloOperaciones.aplicarOperacion(
        datos.saldos,
        datos.operaciones,
        { descripcion, tipo, cuenta, importe }
      );

      if (!resultado.correcta) {
        estadoMensaje(resultado.error);
        return false;
      }

      resultado.operaciones = resultado.operaciones.map(op =>
        op.id === resultado.operacion.id
          ? { ...op, categoria }
          : op
      );
    } else {
      const cambio = tipo === "ingreso" ? importe : -importe;
      const saldoNuevo = redondear(datos.saldos[cuenta] + cambio);

      if (saldoNuevo < 0) {
        estadoMensaje("El saldo de demostración es insuficiente.");
        return false;
      }

      const operacion = {
        id: crearId(),
        descripcion,
        tipo,
        cuenta,
        categoria,
        importe,
        fecha: new Date().toISOString()
      };

      resultado = {
        correcta: true,
        saldos: {
          ...datos.saldos,
          [cuenta]: saldoNuevo
        },
        operaciones: datos.operaciones.concat(operacion)
      };
    }

    const borrador = clonarDatos();
    borrador.saldos = resultado.saldos;
    borrador.operaciones = resultado.operaciones;

    return confirmarCambio(
      borrador,
      "Operación de demostración guardada."
    );
  }

  function transferir(origen, destino, importe) {
    if (
      !CUENTAS.includes(origen) ||
      !CUENTAS.includes(destino) ||
      origen === destino ||
      !Number.isFinite(importe) ||
      importe <= 0 ||
      importe > MAX_IMPORTE
    ) {
      estadoMensaje("Selecciona dos cuentas diferentes y un importe válido.");
      return false;
    }

    if (datos.operaciones.length + 2 > MAX_OPERACIONES) {
      estadoMensaje("No hay espacio para registrar esta transferencia simulada.");
      return false;
    }

    importe = redondear(importe);

    let resultado;

    if (moduloOperaciones &&
        typeof moduloOperaciones.simularTransferencia === "function") {
      resultado = moduloOperaciones.simularTransferencia(
        datos.saldos,
        datos.operaciones,
        origen,
        destino,
        importe
      );

      if (!resultado.correcta) {
        estadoMensaje(resultado.error);
        return false;
      }

      resultado.operaciones = resultado.operaciones.map(op => ({
        ...op,
        categoria: "otros"
      }));
    } else {
      if (datos.saldos[origen] < importe) {
        estadoMensaje("El saldo de demostración es insuficiente.");
        return false;
      }

      const nuevosSaldos = { ...datos.saldos };
      nuevosSaldos[origen] = redondear(nuevosSaldos[origen] - importe);
      nuevosSaldos[destino] = redondear(nuevosSaldos[destino] + importe);

      const fecha = new Date().toISOString();

      resultado = {
        correcta: true,
        saldos: nuevosSaldos,
        operaciones: datos.operaciones.concat([
          {
            id: crearId(),
            descripcion: "Transferencia simulada de salida",
            tipo: "gasto",
            cuenta: origen,
            categoria: "otros",
            importe,
            fecha
          },
          {
            id: crearId(),
            descripcion: "Transferencia simulada de entrada",
            tipo: "ingreso",
            cuenta: destino,
            categoria: "otros",
            importe,
            fecha
          }
        ])
      };
    }

    const borrador = clonarDatos();
    borrador.saldos = resultado.saldos;
    borrador.operaciones = resultado.operaciones;

    return confirmarCambio(
      borrador,
      "Transferencia simulada guardada. No se movió dinero real."
    );
  }

  function agregarTarjeta(alias, ultimos) {
    alias = textoSeguro(alias, 40);
    ultimos = textoSeguro(ultimos, 4);

    if (datos.tarjetas.length >= MAX_TARJETAS) {
      estadoMensaje("Se alcanzó el límite de tarjetas de demostración.");
      return false;
    }

    let resultado;

    if (moduloTarjetas &&
        typeof moduloTarjetas.crearTarjeta === "function") {
      resultado = moduloTarjetas.crearTarjeta(alias, ultimos);

      if (!resultado.correcta) {
        estadoMensaje(resultado.error);
        return false;
      }
    } else {
      if (!alias) {
        estadoMensaje("Escribe un nombre para la tarjeta.");
        return false;
      }

      if (ultimos && !/^[0-9]{4}$/.test(ultimos)) {
        estadoMensaje("Solo se permiten los últimos cuatro dígitos.");
        return false;
      }

      resultado = {
        correcta: true,
        tarjeta: { id: crearId(), alias, ultimos }
      };
    }

    const borrador = clonarDatos();
    borrador.tarjetas.push(resultado.tarjeta);

    return confirmarCambio(borrador, "Tarjeta de demostración guardada.");
  }

  function obtenerOperacionesOrdenadas() {
    const filtroCuenta =
      document.getElementById("filtroCuenta")?.value || "todas";
    const orden =
      document.getElementById("filtroOrden")?.value || "fecha";

    let operaciones;

    if (moduloOperaciones &&
        typeof moduloOperaciones.filtrarOperaciones === "function") {
      operaciones = moduloOperaciones.filtrarOperaciones(
        datos.operaciones,
        filtroCuenta
      );
    } else {
      operaciones = datos.operaciones.filter(op =>
        filtroCuenta === "todas" || op.cuenta === filtroCuenta
      );
    }

    if (moduloOperaciones &&
        typeof moduloOperaciones.ordenarOperaciones === "function") {
      return moduloOperaciones.ordenarOperaciones(operaciones, orden);
    }

    if (orden === "importeDesc") {
      operaciones.sort((a, b) => b.importe - a.importe);
    } else if (orden === "importeAsc") {
      operaciones.sort((a, b) => a.importe - b.importe);
    } else {
      operaciones.sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
    }

    return operaciones;
  }

  function renderizarOperaciones() {
    const contenedor = document.getElementById("listaOperaciones");
    if (!contenedor) return;

    const operaciones = obtenerOperacionesOrdenadas();
    contenedor.replaceChildren();

    if (!operaciones.length) {
      contenedor.appendChild(
        elementoTexto("div", "Todavía no hay operaciones.", "vacio")
      );
      return;
    }

    operaciones.forEach(op => {
      const fila = document.createElement("article");
      fila.className = "operacion";

      const detalles = document.createElement("div");
      detalles.appendChild(
        elementoTexto("div", op.descripcion, "operacion-nombre")
      );
      detalles.appendChild(
        elementoTexto(
          "div",
          nombreCuenta(op.cuenta) + " · " +
            nombreCategoria(op.categoria || "otros") + " · " +
            new Date(op.fecha).toLocaleString(),
          "operacion-fecha"
        )
      );

      const signo = op.tipo === "ingreso" ? "+" : "−";
      const importe = elementoTexto(
        "div",
        signo + dinero(op.importe),
        "importe " + (op.tipo === "ingreso" ? "positivo" : "negativo")
      );

      fila.append(detalles, importe);
      contenedor.appendChild(fila);
    });
  }

  function renderizarTarjetas() {
    const contenedor = document.getElementById("listaTarjetas");
    if (!contenedor) return;

    if (moduloTarjetas &&
        typeof moduloTarjetas.renderizarLista === "function") {
      if (moduloTarjetas.renderizarLista(contenedor, datos.tarjetas)) {
        return;
      }
    }

    contenedor.replaceChildren();

    if (!datos.tarjetas.length) {
      contenedor.appendChild(
        elementoTexto("div", "No hay tarjetas de demostración.", "vacio")
      );
      return;
    }

    datos.tarjetas.forEach(tarjeta => {
      const fila = document.createElement("div");
      fila.className = "operacion";

      fila.append(
        elementoTexto(
          "div",
          tarjeta.ultimos
            ? tarjeta.alias + " · **** " + tarjeta.ultimos
            : tarjeta.alias,
          "operacion-nombre"
        ),
        elementoTexto("span", "DEMO", "etiqueta")
      );

      contenedor.appendChild(fila);
    });
  }

  function renderizarResumenReportes() {
    const contenedor = document.getElementById("resumenReportes");
    if (!contenedor || !moduloReportes ||
        typeof moduloReportes.resumir !== "function") {
      return;
    }

    const resumen = moduloReportes.resumir(datos.operaciones);
    contenedor.replaceChildren();

    [
      ["Operaciones registradas", String(resumen.cantidadOperaciones)],
      ["Ingresos registrados", dinero(resumen.ingresos)],
      ["Gastos registrados", dinero(resumen.gastos)],
      ["Balance neto de operaciones", dinero(resumen.balanceNeto)]
    ].forEach(([titulo, valor]) => {
      const bloque = document.createElement("div");
      bloque.className = "operacion";
      bloque.append(
        elementoTexto("span", titulo, "operacion-nombre"),
        elementoTexto("strong", valor, "importe")
      );
      contenedor.appendChild(bloque);
    });
  }

  function renderizar() {
    const bancario = document.getElementById("saldoBancario");
    const tarjetas = document.getElementById("saldoTarjetas");

    if (bancario) bancario.textContent = dinero(datos.saldos.bancario);
    if (tarjetas) tarjetas.textContent = dinero(datos.saldos.tarjeta);

    renderizarOperaciones();
    renderizarTarjetas();
    renderizarResumenReportes();
  }

  function exportarCSV() {
    const filas = [
      ["Descripción", "Tipo", "Cuenta", "Categoría", "Importe CUP", "Fecha"]
    ];

    datos.operaciones.forEach(op => {
      filas.push([
        op.descripcion,
        op.tipo,
        nombreCuenta(op.cuenta),
        nombreCategoria(op.categoria || "otros"),
        op.importe.toFixed(2),
        op.fecha
      ]);
    });

    function escapar(valor) {
      let texto = String(valor);
      if (/^[\s]*[=+\-@]/.test(texto)) texto = "'" + texto;
      return '"' + texto.replace(/"/g, '""') + '"';
    }

    const csv = "\uFEFF" + filas.map(fila =>
      fila.map(escapar).join(";")
    ).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    try {
      enlace.href = url;
      enlace.download = "nova-finanzas-demo.csv";
      enlace.hidden = true;
      document.body.appendChild(enlace);
      enlace.click();
      estadoMensaje("Archivo CSV de demostración preparado.");
    } catch (error) {
      estadoMensaje("No se pudo iniciar la exportación.");
    } finally {
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
  }

  function configurar() {
    document.getElementById("formOperacion")
      ?.addEventListener("submit", evento => {
        evento.preventDefault();

        const descripcion = document.getElementById("opNombre").value.trim();
        const tipo = document.getElementById("opTipo").value;
        const cuenta = document.getElementById("opCuenta").value;
        const categoria = document.getElementById("opCategoria")?.value || "otros";
        const importe = Number(document.getElementById("opImporte").value);

        if (agregarOperacion(descripcion, tipo, cuenta, categoria, importe)) {
          evento.target.reset();
        }
      });

    document.querySelectorAll("[data-formulario]").forEach(boton => {
      boton.addEventListener("click", () => {
        const formulario = document.getElementById(boton.dataset.formulario);
        if (!formulario) return;

        formulario.classList.toggle("abierto");

        if (formulario.classList.contains("abierto")) {
          formulario.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      });
    });

    document.getElementById("formTransferencia")
      ?.addEventListener("submit", evento => {
        evento.preventDefault();

        const origen = document.getElementById("trOrigen").value;
        const destino = document.getElementById("trDestino").value;
        const importe = Number(document.getElementById("trImporte").value);

        if (transferir(origen, destino, importe)) evento.target.reset();
      });

    document.getElementById("formTarjeta")
      ?.addEventListener("submit", evento => {
        evento.preventDefault();

        const alias = document.getElementById("tarAlias").value.trim();
        const ultimos = document.getElementById("tarUltimos").value.trim();

        if (agregarTarjeta(alias, ultimos)) evento.target.reset();
      });

    document.getElementById("filtroOrden")
      ?.addEventListener("change", renderizarOperaciones);

    document.getElementById("filtroCuenta")
      ?.addEventListener("change", renderizarOperaciones);

    document.getElementById("exportar")
      ?.addEventListener("click", exportarCSV);

    document.getElementById("borrarDatos")
      ?.addEventListener("click", () => {
        if (!window.confirm(
          "¿Borrar todos los datos financieros de demostración de este navegador?"
        )) return;

        const anterior = datos;
        datos = estadoInicial();

        if (!guardar()) {
          datos = anterior;
          renderizar();
          return;
        }

        renderizar();

        if (window.NovaFinanzasPresupuestos) {
          try {
            localStorage.removeItem("nova_finanzas_presupuestos_v1");
            window.NovaFinanzasPresupuestos.renderizar();
          } catch (error) {
            console.error("No se pudieron borrar los presupuestos.");
          }
        }

        estadoMensaje("Datos de demostración borrados.");
      });

    renderizar();

    if (window.NovaFinanzasPresupuestos &&
        typeof window.NovaFinanzasPresupuestos.renderizar === "function") {
      window.NovaFinanzasPresupuestos.renderizar();
    }
  }

  window.NovaFinanzas = Object.freeze({
    version: "3.0.0",
    obtenerDatos: () => JSON.parse(JSON.stringify(datos)),
    agregarOperacion,
    transferir,
    agregarTarjeta,
    renderizar,
    formatearImporte: dinero,
    categorias: { ...CATEGORIAS }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", configurar, { once: true });
  } else {
    configurar();
  }
})();
