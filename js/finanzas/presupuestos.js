
/* =========================================================
   NOVA FINANZAS — GESTOR DE PRESUPUESTOS
   Archivo: js/finanzas/presupuestos.js
   Versión: 2.0.0

   Funciones:
   - Crear, editar y eliminar presupuestos.
   - Presupuestos semanales, mensuales y anuales.
   - Cálculo de gastos por categoría.
   - Resumen de límites, gastos y dinero disponible.
   - Avisos de límites alcanzados o excedidos.
   - Almacenamiento local.
   - Exportación de presupuestos a JSON.

   No conectado todavía a Supabase.
========================================================= */

(function (global) {
  "use strict";

  const CLAVE_PRESUPUESTOS = "nova_finanzas_presupuestos_v1";
  const CLAVE_FINANZAS = "nova_finanzas_demo_v1";

  const MAX_LIMITE = 1000000000;

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

  function obtener(id) {
    return document.getElementById(id);
  }

  function texto(valor, maximo) {
    return typeof valor === "string"
      ? valor.trim().slice(0, maximo)
      : "";
  }

  function importeValido(valor) {
    return Number.isFinite(Number(valor)) &&
      Number(valor) > 0 &&
      Number(valor) <= MAX_LIMITE;
  }

  function redondear(valor) {
    return Math.round(
      (valor + Number.EPSILON) * 100
    ) / 100;
  }

  function fechaLocal(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return anio + "-" + mes + "-" + dia;
  }

  function hoy() {
    return fechaLocal(new Date());
  }

  function dinero(valor) {
    return Number(valor).toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " CUP";
  }

  function nuevoId() {
    if (
      global.crypto &&
      typeof global.crypto.randomUUID === "function"
    ) {
      return global.crypto.randomUUID();
    }

    return "presupuesto-" +
      Date.now().toString(36) + "-" +
      Math.random().toString(36).slice(2, 10);
  }

  function mostrarEstado(mensaje) {
    const elemento = obtener("estadoPresupuestos");

    if (elemento) {
      elemento.textContent = mensaje;
    }
  }

  function elementoTexto(etiqueta, contenido, clase) {
    const elemento = document.createElement(etiqueta);

    elemento.textContent = contenido;

    if (clase) {
      elemento.className = clase;
    }

    return elemento;
  }

  function leerPresupuestos() {
    try {
      const contenido = global.localStorage.getItem(
        CLAVE_PRESUPUESTOS
      );

      if (!contenido) {
        return [];
      }

      const lista = JSON.parse(contenido);

      if (!Array.isArray(lista)) {
        return [];
      }

      return lista.filter(function (item) {
        return item &&
          typeof item.id === "string" &&
          typeof item.categoria === "string" &&
          importeValido(item.limite);
      });
    } catch (error) {
      console.error(
        "Nova Finanzas: error al leer presupuestos.",
        error
      );

      return [];
    }
  }

  function guardarPresupuestos(lista) {
    try {
      global.localStorage.setItem(
        CLAVE_PRESUPUESTOS,
        JSON.stringify(lista)
      );

      return true;
    } catch (error) {
      console.error(
        "Nova Finanzas: error al guardar presupuestos.",
        error
      );

      mostrarEstado(
        "No se pudieron guardar los presupuestos. " +
        "Comprueba el almacenamiento del navegador."
      );

      return false;
    }
  }

  function leerOperaciones() {
    try {
      const contenido = global.localStorage.getItem(
        CLAVE_FINANZAS
      );

      if (!contenido) {
        return [];
      }

      const datos = JSON.parse(contenido);

      return datos &&
        Array.isArray(datos.operaciones)
        ? datos.operaciones
        : [];
    } catch (error) {
      console.error(
        "Nova Finanzas: error al leer operaciones.",
        error
      );

      return [];
    }
  }

  function normalizarCategoria(valor) {
    return texto(valor, 60)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function obtenerNombreCategoria(clave) {
    return CATEGORIAS[clave] || clave;
  }

  function validar(datos, lista, idActual) {
    const errores = [];

    if (!texto(datos.nombre, 60)) {
      errores.push("Escribe el nombre del presupuesto.");
    }

    if (!Object.prototype.hasOwnProperty.call(
      CATEGORIAS,
      datos.categoria
    )) {
      errores.push("Selecciona una categoría válida.");
    }

    if (!importeValido(datos.limite)) {
      errores.push(
        "El límite debe ser mayor que cero y no superar 1.000.000.000 CUP."
      );
    }

    if (!["semanal", "mensual", "anual"].includes(
      datos.periodo
    )) {
      errores.push("Selecciona un período válido.");
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(datos.inicio) ||
      !Number.isFinite(Date.parse(datos.inicio + "T12:00:00"))
    ) {
      errores.push("Selecciona una fecha de inicio válida.");
    }

    if (datos.fin) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(datos.fin) ||
        datos.fin < datos.inicio
      ) {
        errores.push(
          "La fecha final debe ser igual o posterior al inicio."
        );
      }
    }

    const duplicado = lista.some(function (item) {
      return item.id !== idActual &&
        item.categoria === datos.categoria &&
        item.periodo === datos.periodo &&
        item.inicio === datos.inicio;
    });

    if (duplicado) {
      errores.push(
        "Ya existe un presupuesto de esa categoría, período e inicio."
      );
    }

    return {
      valido: errores.length === 0,
      errores: errores
    };
  }

  function calcularFinPeriodo(presupuesto) {
    const inicio = new Date(
      presupuesto.inicio + "T12:00:00"
    );

    if (presupuesto.fin) {
      return presupuesto.fin;
    }

    if (presupuesto.periodo === "semanal") {
      inicio.setDate(inicio.getDate() + 6);
    } else if (presupuesto.periodo === "mensual") {
      inicio.setMonth(inicio.getMonth() + 1);
      inicio.setDate(0);
    } else {
      inicio.setFullYear(inicio.getFullYear() + 1);
      inicio.setDate(0);
    }

    return fechaLocal(inicio);
  }

  function calcular(presupuesto, operaciones) {
    const inicio = presupuesto.inicio;
    const fin = calcularFinPeriodo(presupuesto);

    const categoriaBuscada = normalizarCategoria(
      obtenerNombreCategoria(presupuesto.categoria)
    );

    const gastos = operaciones.filter(function (op) {
      if (!op || op.tipo !== "gasto") {
        return false;
      }

      const fecha = texto(op.fecha, 30).slice(0, 10);

      /*
       * Las operaciones deben guardar una categoría independiente.
       * No se asigna una categoría basándose solamente en la descripción.
       */
      const categoria = normalizarCategoria(
        texto(op.categoria, 60)
      );

      const coincideCategoria =
        categoria === normalizarCategoria(presupuesto.categoria) ||
        categoria === categoriaBuscada;

      return coincideCategoria &&
        fecha >= inicio &&
        fecha <= fin;
    });

    const gastado = redondear(
      gastos.reduce(function (total, op) {
        const valor = Number(op.importe);

        if (!Number.isFinite(valor) || valor <= 0) {
          return total;
        }

        return total + valor;
      }, 0)
    );

    const limite = Number(presupuesto.limite);
    const disponible = redondear(limite - gastado);

    const porcentaje = limite > 0
      ? redondear(gastado / limite * 100)
      : 0;

    return {
      id: presupuesto.id,
      nombre: presupuesto.nombre,
      categoria: presupuesto.categoria,
      periodo: presupuesto.periodo,
      inicio: inicio,
      fin: fin,
      limite: limite,
      gastado: gastado,
      disponible: disponible,
      porcentaje: porcentaje,
      alcanzado: gastado >= limite,
      excedido: gastado > limite,
      cantidadOperaciones: gastos.length
    };
  }

  function crear(datos) {
    const lista = leerPresupuestos();

    const entrada = {
      nombre: texto(datos.nombre, 60),
      categoria: datos.categoria,
      limite: Number(datos.limite),
      periodo: datos.periodo,
      inicio: datos.inicio,
      fin: datos.fin || ""
    };

    const revision = validar(entrada, lista, "");

    if (!revision.valido) {
      return {
        correcto: false,
        errores: revision.errores
      };
    }

    const fecha = new Date().toISOString();

    const presupuesto = {
      id: nuevoId(),
      ...entrada,
      creadoEn: fecha,
      actualizadoEn: fecha
    };

    if (!guardarPresupuestos(lista.concat(presupuesto))) {
      return {
        correcto: false,
        errores: ["No se pudo guardar el presupuesto."]
      };
    }

    return {
      correcto: true,
      presupuesto: presupuesto
    };
  }

  function actualizar(id, cambios) {
    const lista = leerPresupuestos();

    const indice = lista.findIndex(function (item) {
      return item.id === id;
    });

    if (indice < 0) {
      return {
        correcto: false,
        errores: ["No se encontró el presupuesto."]
      };
    }

    const anterior = lista[indice];

    const actualizado = {
      ...anterior,
      nombre: texto(cambios.nombre, 60),
      categoria: cambios.categoria,
      limite: Number(cambios.limite),
      periodo: cambios.periodo,
      inicio: cambios.inicio,
      fin: cambios.fin || "",
      actualizadoEn: new Date().toISOString()
    };

    const revision = validar(actualizado, lista, id);

    if (!revision.valido) {
      return {
        correcto: false,
        errores: revision.errores
      };
    }

    lista[indice] = actualizado;

    if (!guardarPresupuestos(lista)) {
      return {
        correcto: false,
        errores: ["No se pudo guardar la modificación."]
      };
    }

    return {
      correcto: true,
      presupuesto: actualizado
    };
  }

  function eliminar(id) {
    const lista = leerPresupuestos();

    const restantes = lista.filter(function (item) {
      return item.id !== id;
    });

    if (restantes.length === lista.length) {
      return false;
    }

    return guardarPresupuestos(restantes);
  }

  function resumen() {
    const presupuestos = leerPresupuestos();
    const operaciones = leerOperaciones();

    const resultados = presupuestos.map(function (item) {
      return calcular(item, operaciones);
    });

    return {
      cantidad: resultados.length,
      limiteTotal: redondear(
        resultados.reduce((total, item) => total + item.limite, 0)
      ),
      gastadoTotal: redondear(
        resultados.reduce((total, item) => total + item.gastado, 0)
      ),
      disponibleTotal: redondear(
        resultados.reduce(
          (total, item) => total + item.disponible,
          0
        )
      ),
      excedidos: resultados.filter(
        item => item.excedido
      ).length,
      presupuestos: resultados
    };
  }

  function actualizarResumen() {
    const datos = resumen();

    const total = obtener("presupuestoTotal");
    const gastado = obtener("presupuestoGastado");
    const disponible = obtener("presupuestoDisponible");

    if (total) {
      total.textContent = dinero(datos.limiteTotal);
    }

    if (gastado) {
      gastado.textContent = dinero(datos.gastadoTotal);
    }

    if (disponible) {
      disponible.textContent = dinero(datos.disponibleTotal);
    }
  }

  function crearBoton(etiqueta, accion, id) {
    const boton = document.createElement("button");

    boton.type = "button";
    boton.className = "boton";
    boton.textContent = etiqueta;
    boton.dataset.accionPresupuesto = accion;
    boton.dataset.presupuestoId = id;

    return boton;
  }

  function renderizar() {
    const contenedor = obtener("listaPresupuestos");

    actualizarResumen();

    if (!contenedor) {
      return;
    }

    const lista = leerPresupuestos();
    const operaciones = leerOperaciones();

    contenedor.replaceChildren();

    if (!lista.length) {
      contenedor.appendChild(
        elementoTexto(
          "div",
          "Todavía no hay presupuestos creados.",
          "vacio"
        )
      );

      return;
    }

    lista.forEach(function (presupuesto) {
      const datos = calcular(presupuesto, operaciones);

      const tarjeta = document.createElement("article");
      tarjeta.className = "operacion presupuesto-item";

      const contenido = document.createElement("div");
      contenido.className = "presupuesto-contenido";

      contenido.appendChild(
        elementoTexto(
          "h3",
          presupuesto.nombre,
          "operacion-nombre"
        )
      );

      contenido.appendChild(
        elementoTexto(
          "p",
          obtenerNombreCategoria(presupuesto.categoria) +
          " · " + presupuesto.periodo,
          "operacion-fecha"
        )
      );

      contenido.appendChild(
        elementoTexto(
          "p",
          "Período: " + datos.inicio + " — " + datos.fin
        )
      );

      contenido.appendChild(
        elementoTexto(
          "p",
          "Límite: " + dinero(datos.limite)
        )
      );

      contenido.appendChild(
        elementoTexto(
          "p",
          "Gastado: " + dinero(datos.gastado)
        )
      );

      contenido.appendChild(
        elementoTexto(
          "p",
          "Disponible: " + dinero(datos.disponible)
        )
      );

      const barra = document.createElement("progress");
      barra.max = 100;
      barra.value = Math.min(100, Math.max(0, datos.porcentaje));
      barra.setAttribute(
        "aria-label",
        "Porcentaje del presupuesto utilizado"
      );

      contenido.appendChild(barra);

      contenido.appendChild(
        elementoTexto(
          "p",
          datos.excedido
            ? "Presupuesto excedido."
            : datos.alcanzado
              ? "Has alcanzado el límite."
              : datos.porcentaje.toFixed(2) + "% utilizado.",
          "estado"
        )
      );

      const acciones = document.createElement("div");
      acciones.className = "acciones";

      acciones.append(
        crearBoton("Editar", "editar", presupuesto.id),
        crearBoton("Eliminar", "eliminar", presupuesto.id)
      );

      tarjeta.append(contenido, acciones);
      contenedor.appendChild(tarjeta);
    });
  }

  function limpiarFormulario() {
    const formulario = obtener("formPresupuesto");

    if (formulario) {
      formulario.reset();
    }

    const id = obtener("presupuestoId");
    const titulo = obtener("presupuestoTitulo");
    const boton = obtener("guardarPresupuesto");
    const inicio = obtener("presupuestoInicio");

    if (id) id.value = "";
    if (titulo) titulo.textContent = "Crear presupuesto";
    if (boton) boton.textContent = "Guardar presupuesto";
    if (inicio) inicio.value = hoy();

    mostrarEstado("");
  }

  function abrirFormulario(presupuesto) {
    const formulario = obtener("presupuestoForm");

    if (!formulario) return;

    formulario.classList.add("abierto");

    if (presupuesto) {
      obtener("presupuestoId").value = presupuesto.id;
      obtener("presupuestoNombre").value = presupuesto.nombre;
      obtener("presupuestoCategoria").value = presupuesto.categoria;
      obtener("presupuestoLimite").value = presupuesto.limite;
      obtener("presupuestoPeriodo").value = presupuesto.periodo;
      obtener("presupuestoInicio").value = presupuesto.inicio;
      obtener("presupuestoFin").value = presupuesto.fin || "";

      obtener("presupuestoTitulo").textContent =
        "Editar presupuesto";

      obtener("guardarPresupuesto").textContent =
        "Guardar cambios";
    } else {
      limpiarFormulario();
      formulario.classList.add("abierto");
    }

    formulario.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function datosDelFormulario() {
    return {
      nombre: obtener("presupuestoNombre").value,
      categoria: obtener("presupuestoCategoria").value,
      limite: Number(obtener("presupuestoLimite").value),
      periodo: obtener("presupuestoPeriodo").value,
      inicio: obtener("presupuestoInicio").value,
      fin: obtener("presupuestoFin").value
    };
  }

  function exportarJSON() {
    try {
      const contenido = JSON.stringify(
        leerPresupuestos(),
        null,
        2
      );

      const blob = new Blob([contenido], {
        type: "application/json;charset=utf-8"
      });

      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");

      enlace.href = url;
      enlace.download = "nova-presupuestos.json";
      enlace.hidden = true;

      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      URL.revokeObjectURL(url);

      mostrarEstado("Exportación de presupuestos iniciada.");
    } catch (error) {
      mostrarEstado("No se pudieron exportar los presupuestos.");
    }
  }

  function configurar() {
    const inicio = obtener("presupuestoInicio");

    if (inicio && !inicio.value) {
      inicio.value = hoy();
    }

    obtener("formPresupuesto")
      ?.addEventListener("submit", function (evento) {
        evento.preventDefault();

        const id = obtener("presupuestoId").value;
        const datos = datosDelFormulario();

        const resultado = id
          ? actualizar(id, datos)
          : crear(datos);

        if (!resultado.correcto) {
          mostrarEstado(resultado.errores.join(" "));
          return;
        }

        limpiarFormulario();
        renderizar();

        mostrarEstado(
          id
            ? "Presupuesto actualizado correctamente."
            : "Presupuesto creado correctamente."
        );
      });

    obtener("nuevoPresupuesto")
      ?.addEventListener("click", function () {
        abrirFormulario(null);
      });

    obtener("cancelarPresupuesto")
      ?.addEventListener("click", function () {
        limpiarFormulario();

        obtener("presupuestoForm")
          ?.classList.remove("abierto");
      });

    obtener("listaPresupuestos")
      ?.addEventListener("click", function (evento) {
        const boton = evento.target.closest(
          "[data-accion-presupuesto]"
        );

        if (!boton) return;

        const id = boton.dataset.presupuestoId;
        const accion = boton.dataset.accionPresupuesto;

        const presupuesto = leerPresupuestos().find(
          item => item.id === id
        );

        if (!presupuesto) {
          mostrarEstado("No se encontró ese presupuesto.");
          renderizar();
          return;
        }

        if (accion === "editar") {
          abrirFormulario(presupuesto);
          return;
        }

        if (accion === "eliminar") {
          if (!global.confirm(
            "¿Quieres eliminar este presupuesto? " +
            "Esta acción no se puede deshacer."
          )) {
            return;
          }

          if (eliminar(id)) {
            renderizar();
            mostrarEstado("Presupuesto eliminado.");
          } else {
            mostrarEstado("No se pudo eliminar el presupuesto.");
          }
        }
      });

    /*
     * Las operaciones cambian desde finanzas.js.
     * Se vuelve a calcular el resumen cuando cambia el historial.
     */
    global.addEventListener("storage", function (evento) {
      if (
        evento.key === CLAVE_FINANZAS ||
        evento.key === CLAVE_PRESUPUESTOS
      ) {
        renderizar();
      }
    });

    renderizar();
  }

  const API = {
    version: "2.0.0",
    categorias: { ...CATEGORIAS },
    obtenerTodos: leerPresupuestos,
    obtenerOperaciones: leerOperaciones,
    validar: validar,
    crear: crear,
    actualizar: actualizar,
    eliminar: eliminar,
    calcular: calcular,
    resumen: resumen,
    renderizar: renderizar,
    exportarJSON: exportarJSON,
    formatearImporte: dinero
  };

  global.NovaFinanzasPresupuestos = API;

  if (global.document) {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        configurar,
        { once: true }
      );
    } else {
      configurar();
    }
  }
})(window);
