
"use strict";

/*
 * NOVA APPS — GESTIÓN DE INSPECTORES
 * Modo de demostración con almacenamiento local.
 * No representa una gestión real de usuarios ni permisos del servidor.
 */

(function () {
  const CLAVE = "nova_inspectores_demo_v1";

  const obtener = (id) => document.getElementById(id);

  const formulario = obtener("formulario");
  const lista = obtener("lista");
  const mensaje = obtener("mensaje");
  const botonAbrir = obtener("abrirFormulario");
  const botonCancelar = obtener("cancelar");

  if (
    !formulario ||
    !lista ||
    !mensaje ||
    !botonAbrir ||
    !botonCancelar
  ) {
    console.error("Nova Apps: faltan elementos necesarios en inspectores.html.");
    return;
  }

  let inspectores = cargar();

  function cargar() {
    try {
      const contenido = localStorage.getItem(CLAVE);
      if (!contenido) return [];

      const datos = JSON.parse(contenido);
      if (!Array.isArray(datos)) return [];

      return datos.filter((item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.nombre === "string" &&
        typeof item.codigo === "string" &&
        typeof item.zona === "string" &&
        ["activo", "inactivo"].includes(item.estado)
      );
    } catch (error) {
      console.error("No se pudieron leer los registros locales.", error);
      return [];
    }
  }

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(inspectores));
      return true;
    } catch (error) {
      console.error("No se pudieron guardar los registros.", error);
      mostrarMensaje(
        "No se pudieron guardar los datos en este dispositivo."
      );
      return false;
    }
  }

  function nuevoId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return Date.now().toString(36) +
      Math.random().toString(36).slice(2);
  }

  function elemento(etiqueta, texto, clase) {
    const nodo = document.createElement(etiqueta);
    nodo.textContent = texto;

    if (clase) nodo.className = clase;

    return nodo;
  }

  function mostrarMensaje(texto) {
    mensaje.textContent = texto;
  }

  function abrirFormulario() {
    formulario.hidden = false;
    formulario.classList.add("abierto");
    botonAbrir.setAttribute("aria-expanded", "true");
    obtener("nombre").focus();
  }

  function cerrarFormulario(limpiar = true) {
    formulario.hidden = true;
    formulario.classList.remove("abierto");
    botonAbrir.setAttribute("aria-expanded", "false");

    if (limpiar) formulario.reset();
  }

  function renderizar() {
    const campoBusqueda = obtener("buscar");
    const campoFiltro = obtener("filtroEstado");

    if (!campoBusqueda || !campoFiltro) return;

    const busqueda = campoBusqueda.value
      .trim()
      .toLocaleLowerCase();

    const filtro = campoFiltro.value;

    const activos = inspectores.filter(
      (item) => item.estado === "activo"
    ).length;

    obtener("total").textContent = String(inspectores.length);
    obtener("activos").textContent = String(activos);
    obtener("inactivos").textContent =
      String(inspectores.length - activos);

    lista.replaceChildren();

    const filtrados = inspectores.filter((item) => {
      const coincideEstado =
        filtro === "todos" || item.estado === filtro;

      const texto = (
        item.nombre + " " + item.codigo + " " + item.zona
      ).toLocaleLowerCase();

      return coincideEstado && texto.includes(busqueda);
    });

    if (filtrados.length === 0) {
      lista.appendChild(
        elemento(
          "div",
          "No hay registros que coincidan con la búsqueda.",
          "vacio"
        )
      );
      return;
    }

    filtrados.forEach((item) => {
      const tarjeta = elemento("article", "", "inspector");
      const cabecera = elemento("div", "", "inspector-cabecera");
      const detalles = document.createElement("div");

      detalles.append(
        elemento("div", item.nombre, "nombre"),
        elemento("div", "Código: " + item.codigo, "detalle"),
        elemento("div", "Zona: " + item.zona, "detalle")
      );

      cabecera.append(
        detalles,
        elemento(
          "span",
          item.estado === "activo" ? "Activo" : "Inactivo",
          "estado " + item.estado
        )
      );

      const acciones = elemento("div", "", "acciones");

      const botonEstado = elemento(
        "button",
        item.estado === "activo" ? "Marcar inactivo" : "Marcar activo",
        "boton"
      );

      botonEstado.type = "button";
      botonEstado.addEventListener("click", () => {
        cambiarEstado(item.id);
      });

      const botonEliminar = elemento(
        "button",
        "Eliminar registro",
        "boton peligro"
      );

      botonEliminar.type = "button";
      botonEliminar.addEventListener("click", () => {
        eliminar(item.id);
      });

      acciones.append(botonEstado, botonEliminar);
      tarjeta.append(cabecera, acciones);
      lista.appendChild(tarjeta);
    });
  }

  function cambiarEstado(id) {
    const item = inspectores.find((registro) => registro.id === id);
    if (!item) return;

    const estadoAnterior = item.estado;
    item.estado = estadoAnterior === "activo" ? "inactivo" : "activo";

    if (!guardar()) {
      item.estado = estadoAnterior;
      renderizar();
      return;
    }

    renderizar();
    mostrarMensaje("Estado local actualizado.");
  }

  function eliminar(id) {
    const item = inspectores.find((registro) => registro.id === id);
    if (!item) return;

    if (!window.confirm(
      "¿Eliminar el registro de demostración de " + item.nombre + "?"
    )) {
      return;
    }

    const anteriores = inspectores;
    inspectores = inspectores.filter((registro) => registro.id !== id);

    if (!guardar()) {
      inspectores = anteriores;
      renderizar();
      return;
    }

    renderizar();
    mostrarMensaje("Registro local eliminado.");
  }

  botonAbrir.addEventListener("click", () => {
    if (formulario.hidden) {
      abrirFormulario();
    } else {
      cerrarFormulario(false);
    }
  });

  botonCancelar.addEventListener("click", () => {
    cerrarFormulario();
    mostrarMensaje("");
    botonAbrir.focus();
  });

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const nombre = obtener("nombre").value.trim();
    const codigo = obtener("codigo").value.trim();
    const zona = obtener("zona").value.trim();
    const estado = obtener("estadoInicial").value;

    if (!nombre || !codigo || !zona) {
      mostrarMensaje("Completa todos los campos obligatorios.");
      return;
    }

    if (!["activo", "inactivo"].includes(estado)) {
      mostrarMensaje("Selecciona un estado válido.");
      return;
    }

    const codigoNormalizado = codigo.toLocaleLowerCase();

    const duplicado = inspectores.some(
      (item) => item.codigo.toLocaleLowerCase() === codigoNormalizado
    );

    if (duplicado) {
      mostrarMensaje("Ese código ya existe en los registros locales.");
      return;
    }

    const nuevo = {
      id: nuevoId(),
      nombre,
      codigo,
      zona,
      estado,
      creado: new Date().toISOString()
    };

    inspectores.push(nuevo);

    if (!guardar()) {
      inspectores = inspectores.filter((item) => item.id !== nuevo.id);
      renderizar();
      return;
    }

    cerrarFormulario();
    renderizar();
    mostrarMensaje("Registro de demostración guardado.");
  });

  obtener("buscar").addEventListener("input", renderizar);
  obtener("filtroEstado").addEventListener("change", renderizar);

  cerrarFormulario(false);
  renderizar();
})();
