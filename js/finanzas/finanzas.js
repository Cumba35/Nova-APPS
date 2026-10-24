
/* =========================================================
   NOVA FINANZAS — CONTROL PRINCIPAL
   Archivo: js/finanzas/finanzas.js
   Versión: 4.0.0
========================================================= */

"use strict";

(function () {
  const CLAVE = "nova_finanzas_demo_v1";
  const CLAVE_PRESUPUESTOS = "nova_finanzas_presupuestos_v1";
  const MAX_IMPORTE = 1000000000;

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

  const obtener = id => document.getElementById(id);

  function idNuevo() {
    if (window.crypto &&
        typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return Date.now().toString(36) +
      Math.random().toString(36).slice(2);
  }

  function dinero(valor) {
    const numero = Number(valor);
    return (Number.isFinite(numero) ? numero : 0)
      .toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + " CUP";
  }

  function fechaActual() {
    const fecha = new Date();
    const ajuste = fecha.getTimezoneOffset() * 60000;
    return new Date(fecha.getTime() - ajuste)
      .toISOString().slice(0, 10);
  }

  function estadoInicial() {
    return {
      saldos: {
        bancario: 0,
        tarjeta: 0
      },
      operaciones: [],
      tarjetas: []
    };
  }

  function normalizarEstado(datos) {
    const inicial = estadoInicial();

    if (!datos || typeof datos !== "object") return inicial;

    const saldos = datos.saldos || {};

    inicial.saldos.bancario =
      Number.isFinite(Number(saldos.bancario))
        ? Number(saldos.bancario)
        : 0;

    inicial.saldos.tarjeta =
      Number.isFinite(Number(saldos.tarjeta))
        ? Number(saldos.tarjeta)
        : 0;

    inicial.operaciones = Array.isArray(datos.operaciones)
      ? datos.operaciones.filter(op =>
          op &&
          typeof op.id === "string" &&
          ["ingreso", "gasto", "transferencia"].includes(op.tipo) &&
          ["bancario", "tarjeta"].includes(op.cuenta) &&
          Number.isFinite(Number(op.importe)) &&
          Number(op.importe) > 0 &&
          typeof op.fecha === "string"
        )
      : [];

    inicial.tarjetas = Array.isArray(datos.tarjetas)
      ? datos.tarjetas
      : [];

    return inicial;
  }

  function cargar() {
    try {
      const contenido = localStorage.getItem(CLAVE);
      if (!contenido) return estadoInicial();
      return normalizarEstado(JSON.parse(contenido));
    } catch (error) {
      console.error("Nova Finanzas: error al cargar datos.", error);
      return estadoInicial();
    }
  }

  let estado = cargar();

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
      return true;
    } catch (error) {
      console.error("Nova Finanzas: error al guardar datos.", error);
      mostrarEstado("No se pudieron guardar los datos en este navegador.");
      return false;
    }
  }

  function mostrarEstado(mensaje) {
    const elemento = obtener("estado");
    if (elemento) elemento.textContent = mensaje;
  }

  function categoriaNombre(clave) {
    return CATEGORIAS[clave] || "Otros";
  }

  function crearOperacion(datos) {
    const importe = Number(datos.importe);

    if (!Number.isFinite(importe) ||
        importe <= 0 ||
        importe > MAX_IMPORTE) {
      return { correcta: false, error: "El importe no es válido." };
    }

    if (!["ingreso", "gasto"].includes(datos.tipo)) {
      return { correcta: false, error: "Selecciona un tipo válido." };
    }

    if (!["bancario", "tarjeta"].includes(datos.cuenta)) {
      return { correcta: false, error: "Selecciona una cuenta válida." };
    }

    const categoria = CATEGORIAS[datos.categoria]
      ? datos.categoria
      : "otros";

    const descripcion = String(datos.descripcion || "")
      .trim()
      .slice(0, 80);

    if (!descripcion) {
      return { correcta: false, error: "Escribe una descripción." };
    }

    const saldoActual = Number(estado.saldos[datos.cuenta]) || 0;

    if (datos.tipo === "gasto" && saldoActual < importe) {
      return {
        correcta: false,
        error: "Saldo insuficiente en esta cuenta de demostración."
      };
    }

    const saldoNuevo = datos.tipo === "ingreso"
      ? saldoActual + importe
      : saldoActual - importe;

    if (!Number.isFinite(saldoNuevo) || saldoNuevo < 0) {
      return { correcta: false, error: "El saldo resultante no es válido." };
    }

    const operacion = {
      id: idNuevo(),
      descripcion,
      tipo: datos.tipo,
      cuenta: datos.cuenta,
      categoria,
      importe: Math.round((importe + Number.EPSILON) * 100) / 100,
      fecha: new Date().toISOString(),
      fechaDia: fechaActual()
    };

    estado.saldos[datos.cuenta] = saldoNuevo;
    estado.operaciones.unshift(operacion);

    if (!guardar()) {
      estado = cargar();
      return { correcta: false, error: "No se pudo guardar la operación." };
    }

    return { correcta: true, operacion };
  }

  function transferir(origen, destino, importe) {
    const cantidad = Number(importe);

    if (!["bancario", "tarjeta"].includes(origen) ||
        !["bancario", "tarjeta"].includes(destino) ||
        origen === destino) {
      return { correcta: false, error: "Selecciona cuentas distintas y válidas." };
    }

    if (!Number.isFinite(cantidad) ||
        cantidad <= 0 ||
        cantidad > MAX_IMPORTE) {
      return { correcta: false, error: "El importe no es válido." };
    }

    if (estado.saldos[origen] < cantidad) {
      return { correcta: false, error: "Saldo insuficiente para transferir." };
    }

    const cantidadRedondeada =
      Math.round((cantidad + Number.EPSILON) * 100) / 100;

    const fecha = new Date().toISOString();
    const idTransferencia = idNuevo();

    const salida = {
      id: idNuevo(),
      transferenciaId: idTransferencia,
      descripcion: "Transferencia enviada a " + destino,
      tipo: "transferencia",
      cuenta: origen,
      categoria: "otros",
      importe: cantidadRedondeada,
      movimiento: "salida",
      fecha
    };

    const entrada = {
      id: idNuevo(),
      transferenciaId: idTransferencia,
      descripcion: "Transferencia recibida desde " + origen,
      tipo: "transferencia",
      cuenta: destino,
      categoria: "otros",
      importe: cantidadRedondeada,
      movimiento: "entrada",
      fecha
    };

    estado.saldos[origen] -= cantidadRedondeada;
    estado.saldos[destino] += cantidadRedondeada;
    estado.operaciones.unshift(entrada, salida);

    if (!guardar()) {
      estado = cargar();
      return { correcta: false, error: "No se pudo guardar la transferencia." };
    }

    return { correcta: true, operaciones: [salida, entrada] };
  }

  function agregarTarjeta(alias, ultimos) {
    const modulo = window.NovaFinanzasTarjetas;

    if (!modulo || typeof modulo.crearTarjeta !== "function") {
      return { correcta: false, error: "El módulo de tarjetas no está disponible." };
    }

    const resultado = modulo.crearTarjeta(alias, ultimos);
    if (!resultado.correcta) return resultado;

    const lista = estado.tarjetas.slice();

    if (lista.length >= modulo.maximoTarjetas) {
      return { correcta: false, error: "Se alcanzó el límite de tarjetas." };
    }

    lista.push(resultado.tarjeta);
    estado.tarjetas = lista;

    if (!guardar()) {
      estado = cargar();
      return { correcta: false, error: "No se pudo guardar la tarjeta." };
    }

    renderizar();
    return { correcta: true, tarjeta: resultado.tarjeta };
  }

  function eliminarTarjeta(id) {
    const modulo = window.NovaFinanzasTarjetas;

    if (!modulo || typeof modulo.eliminarTarjeta !== "function") {
      return false;
    }

    const resultado = modulo.eliminarTarjeta(estado.tarjetas, id);
    if (!resultado.correcta) return false;

    estado.tarjetas = resultado.tarjetas;

    if (!guardar()) {
      estado = cargar();
      return false;
    }

    renderizar();
    return true;
  }

  function renderizarSaldos() {
    const bancario = obtener("saldoBancario");
    const tarjeta = obtener("saldoTarjetas");

    if (bancario) bancario.textContent = dinero(estado.saldos.bancario);
    if (tarjeta) tarjeta.textContent = dinero(estado.saldos.tarjeta);
  }

  function renderizarTarjetas() {
    const contenedor = obtener("listaTarjetas");
    const modulo = window.NovaFinanzasTarjetas;

    if (!contenedor || !modulo) return;

    modulo.renderizarLista(contenedor, estado.tarjetas);
  }

  function ordenarOperaciones(lista) {
    const orden = obtener("filtroOrden")?.value || "fecha";
    const resultado = lista.slice();

    if (orden === "importeDesc") {
      resultado.sort((a, b) => b.importe - a.importe);
    } else if (orden === "importeAsc") {
      resultado.sort((a, b) => a.importe - b.importe);
    } else {
      resultado.sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
    }

    return resultado;
  }

  function renderizarOperaciones() {
    const contenedor = obtener("listaOperaciones");
    if (!contenedor) return;

    const cuenta = obtener("filtroCuenta")?.value || "todas";

    let lista = estado.operaciones.slice();

    if (cuenta !== "todas") {
      lista = lista.filter(op => op.cuenta === cuenta);
    }

    lista = ordenarOperaciones(lista);
    contenedor.replaceChildren();

    if (!lista.length) {
      const vacio = document.createElement("div");
      vacio.className = "vacio";
      vacio.textContent = "Todavía no hay operaciones.";
      contenedor.appendChild(vacio);
      return;
    }

    lista.slice(0, 200).forEach(op => {
      const fila = document.createElement("article");
      fila.className = "operacion";

      const contenido = document.createElement("div");
      contenido.className = "operacion-contenido";

      const nombre = document.createElement("strong");
      nombre.className = "operacion-nombre";
      nombre.textContent = op.descripcion;

      const categoria = document.createElement("div");
      categoria.className = "operacion-fecha";
      categoria.textContent =
        categoriaNombre(op.categoria) + " · " +
        (op.cuenta === "bancario" ? "Saldo bancario" : "Tarjeta") +
        " · " + new Date(op.fecha).toLocaleString("es-ES");

      const detalle = document.createElement("div");
      detalle.className = "operacion-fecha";

      if (op.tipo === "transferencia") {
        detalle.textContent = op.movimiento === "entrada"
          ? "Transferencia recibida"
          : "Transferencia enviada";
      } else {
        detalle.textContent =
          (op.tipo === "ingreso" ? "Ingreso" : "Gasto") +
          " · " + dinero(op.importe);
      }

      contenido.append(nombre, categoria, detalle);

      const importe = document.createElement("strong");
      importe.className = "operacion-importe";
      importe.textContent =
        op.tipo === "ingreso" ||
        (op.tipo === "transferencia" && op.movimiento === "entrada")
          ? "+ " + dinero(op.importe)
          : "− " + dinero(op.importe);

      fila.append(contenido, importe);
      contenedor.appendChild(fila);
    });
  }

  function renderizar() {
    renderizarSaldos();
    renderizarTarjetas();
    renderizarOperaciones();

    if (window.NovaFinanzasPresupuestos &&
        typeof window.NovaFinanzasPresupuestos.renderizar === "function") {
      window.NovaFinanzasPresupuestos.renderizar();
    }
  }

  function exportarCSV() {
    const filas = [
      ["Fecha", "Descripción", "Tipo", "Cuenta", "Categoría", "Importe CUP"]
    ];

    estado.operaciones.forEach(op => {
      filas.push([
        op.fecha,
        op.descripcion,
        op.tipo,
        op.cuenta,
        categoriaNombre(op.categoria),
        op.importe
      ]);
    });

    const csv = filas.map(fila =>
      fila.map(valor =>
        '"' + String(valor ?? "").replace(/"/g, '""') + '"'
      ).join(";")
    ).join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = "nova-finanzas-operaciones.csv";
    enlace.hidden = true;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function borrarDatos() {
    if (!window.confirm(
      "¿Eliminar todos los datos financieros de demostración de este navegador?"
    )) {
      return;
    }

    const copiaAnterior = estado;
    estado = estadoInicial();

    try {
      localStorage.removeItem(CLAVE_PRESUPUESTOS);

      if (!guardar()) {
        estado = copiaAnterior;
        return;
      }

      renderizar();
      mostrarEstado("Se borraron los datos de demostración.");
    } catch (error) {
      estado = copiaAnterior;
      mostrarEstado("No se pudieron borrar los datos.");
    }
  }

  function configurar() {
    document.querySelectorAll("[data-formulario]").forEach(boton => {
      boton.addEventListener("click", () => {
        const destino = obtener(boton.dataset.formulario);
        if (!destino) return;

        destino.classList.toggle("abierto");
        destino.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    obtener("formOperacion")?.addEventListener("submit", evento => {
      evento.preventDefault();

      const resultado = crearOperacion({
        descripcion: obtener("opNombre")?.value || "",
        tipo: obtener("opTipo")?.value || "",
        cuenta: obtener("opCuenta")?.value || "",
        categoria: obtener("opCategoria")?.value || "otros",
        importe: obtener("opImporte")?.value
      });

      if (!resultado.correcta) {
        mostrarEstado(resultado.error);
        return;
      }

      evento.target.reset();
      renderizar();
      mostrarEstado("Operación de demostración guardada.");
    });

    obtener("formTransferencia")?.addEventListener("submit", evento => {
      evento.preventDefault();

      const resultado = transferir(
        obtener("trOrigen")?.value,
        obtener("trDestino")?.value,
        obtener("trImporte")?.value
      );

      if (!resultado.correcta) {
        mostrarEstado(resultado.error);
        return;
      }

      evento.target.reset();
      renderizar();
      mostrarEstado("Transferencia local de demostración completada.");
    });

    obtener("formTarjeta")?.addEventListener("submit", evento => {
      evento.preventDefault();

      const resultado = agregarTarjeta(
        obtener("tarAlias")?.value || "",
        obtener("tarUltimos")?.value || ""
      );

      if (!resultado.correcta) {
        mostrarEstado(resultado.error);
        return;
      }

      evento.target.reset();
      mostrarEstado("Tarjeta de demostración guardada.");
    });

    obtener("filtroOrden")?.addEventListener("change", renderizarOperaciones);
    obtener("filtroCuenta")?.addEventListener("change", renderizarOperaciones);
    obtener("exportar")?.addEventListener("click", exportarCSV);
    obtener("borrarDatos")?.addEventListener("click", borrarDatos);

    window.addEventListener("storage", evento => {
      if (evento.key === CLAVE) {
        estado = cargar();
        renderizar();
      }
    });

    renderizar();
  }

  window.NovaFinanzas = Object.freeze({
    version: "4.0.0",
    obtenerEstado: () => JSON.parse(JSON.stringify(estado)),
    crearOperacion,
    transferir,
    agregarTarjeta,
    eliminarTarjeta,
    renderizar,
    exportarCSV
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", configurar, { once: true });
  } else {
    configurar();
  }
})();
