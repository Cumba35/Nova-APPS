
/*
 * NOVA APPS — FINANZAS
 * Archivo: js/finanzas/finanzas.js
 *
 * Prototipo local independiente del HTML.
 * No realiza transferencias reales ni conecta con bancos.
 */

"use strict";

const CLAVE_FINANZAS = "nova_finanzas_demo_v1";

const estadoInicialFinanzas = () => ({
  saldos: {
    bancario: 0,
    tarjeta: 0
  },
  operaciones: [],
  tarjetas: []
});

let datosFinanzas = cargarFinanzas();

function cargarFinanzas() {
  try {
    const guardado = localStorage.getItem(CLAVE_FINANZAS);

    if (!guardado) {
      return estadoInicialFinanzas();
    }

    const datos = JSON.parse(guardado);

    if (
      !datos ||
      !datos.saldos ||
      !Number.isFinite(datos.saldos.bancario) ||
      !Number.isFinite(datos.saldos.tarjeta) ||
      !Array.isArray(datos.operaciones) ||
      !Array.isArray(datos.tarjetas)
    ) {
      return estadoInicialFinanzas();
    }

    return datos;
  } catch (error) {
    console.error("Nova Finanzas: error al cargar datos.", error);
    return estadoInicialFinanzas();
  }
}

function guardarFinanzas() {
  try {
    localStorage.setItem(
      CLAVE_FINANZAS,
      JSON.stringify(datosFinanzas)
    );
    return true;
  } catch (error) {
    mostrarEstadoFinanzas(
      "No se pudieron guardar los datos en este dispositivo."
    );
    return false;
  }
}

function crearIdFinanzas() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return Date.now().toString(36) +
    Math.random().toString(36).slice(2);
}

function dineroFinanzas(cantidad) {
  return Number(cantidad).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " CUP";
}

function nombreCuentaFinanzas(cuenta) {
  return cuenta === "bancario"
    ? "Saldo bancario"
    : "Saldo en tarjetas";
}

function mostrarEstadoFinanzas(mensaje) {
  const elemento = document.getElementById("estado");

  if (elemento) {
    elemento.textContent = mensaje;
  }
}

function elementoTextoFinanzas(tag, contenido, clase = "") {
  const elemento = document.createElement(tag);
  elemento.textContent = contenido;

  if (clase) {
    elemento.className = clase;
  }

  return elemento;
}

function guardarCambioFinanzas(mensaje) {
  if (!guardarFinanzas()) {
    return false;
  }

  renderizarFinanzas();
  mostrarEstadoFinanzas(mensaje);
  return true;
}

function agregarOperacionFinanzas(
  descripcion,
  tipo,
  cuenta,
  importe
) {
  if (
    !descripcion ||
    !["ingreso", "gasto"].includes(tipo) ||
    !["bancario", "tarjeta"].includes(cuenta) ||
    !Number.isFinite(importe) ||
    importe <= 0 ||
    importe > 1000000000
  ) {
    mostrarEstadoFinanzas("Comprueba los datos de la operación.");
    return false;
  }

  importe = Math.round(importe * 100) / 100;

  const cambio = tipo === "ingreso" ? importe : -importe;
  const nuevoSaldo = datosFinanzas.saldos[cuenta] + cambio;

  if (nuevoSaldo < 0) {
    mostrarEstadoFinanzas(
      "El saldo de demostración es insuficiente."
    );
    return false;
  }

  datosFinanzas.saldos[cuenta] =
    Math.round(nuevoSaldo * 100) / 100;

  datosFinanzas.operaciones.push({
    id: crearIdFinanzas(),
    descripcion: descripcion.slice(0, 80),
    tipo,
    cuenta,
    importe,
    fecha: new Date().toISOString()
  });

  return guardarCambioFinanzas(
    "Operación de demostración guardada."
  );
}

function renderizarOperacionesFinanzas() {
  const contenedor = document.getElementById("listaOperaciones");
  if (!contenedor) return;

  const filtroCuenta =
    document.getElementById("filtroCuenta")?.value || "todas";

  const orden =
    document.getElementById("filtroOrden")?.value || "fecha";

  let operaciones = datosFinanzas.operaciones.filter(op =>
    filtroCuenta === "todas" || op.cuenta === filtroCuenta
  );

  operaciones = operaciones.slice();

  if (orden === "importeDesc") {
    operaciones.sort((a, b) => b.importe - a.importe);
  } else if (orden === "importeAsc") {
    operaciones.sort((a, b) => a.importe - b.importe);
  } else {
    operaciones.sort((a, b) =>
      new Date(b.fecha).getTime() -
      new Date(a.fecha).getTime()
    );
  }

  contenedor.replaceChildren();

  if (!operaciones.length) {
    contenedor.appendChild(
      elementoTextoFinanzas(
        "div",
        "Todavía no hay operaciones.",
        "vacio"
      )
    );
    return;
  }

  operaciones.forEach(op => {
    const fila = document.createElement("article");
    fila.className = "operacion";

    const detalles = document.createElement("div");

    detalles.appendChild(
      elementoTextoFinanzas(
        "div",
        op.descripcion,
        "operacion-nombre"
      )
    );

    const fecha = new Date(op.fecha);

    detalles.appendChild(
      elementoTextoFinanzas(
        "div",
        nombreCuentaFinanzas(op.cuenta) +
          " · " + fecha.toLocaleString(),
        "operacion-fecha"
      )
    );

    const signo = op.tipo === "ingreso" ? "+" : "−";

    const importe = elementoTextoFinanzas(
      "div",
      signo + dineroFinanzas(op.importe),
      "importe " +
        (op.tipo === "ingreso" ? "positivo" : "negativo")
    );

    fila.append(detalles, importe);
    contenedor.appendChild(fila);
  });
}

function renderizarTarjetasFinanzas() {
  const contenedor = document.getElementById("listaTarjetas");
  if (!contenedor) return;

  contenedor.replaceChildren();

  if (!datosFinanzas.tarjetas.length) {
    contenedor.appendChild(
      elementoTextoFinanzas(
        "div",
        "No hay tarjetas de demostración.",
        "vacio"
      )
    );
    return;
  }

  datosFinanzas.tarjetas.forEach(tarjeta => {
    const fila = document.createElement("div");
    fila.className = "operacion";

    const descripcion = tarjeta.ultimos
      ? tarjeta.alias + " · **** " + tarjeta.ultimos
      : tarjeta.alias;

    fila.appendChild(
      elementoTextoFinanzas(
        "div",
        descripcion,
        "operacion-nombre"
      )
    );

    fila.appendChild(
      elementoTextoFinanzas("span", "DEMO", "etiqueta")
    );

    contenedor.appendChild(fila);
  });
}

function renderizarFinanzas() {
  const bancario = document.getElementById("saldoBancario");
  const tarjetas = document.getElementById("saldoTarjetas");

  if (bancario) {
    bancario.textContent =
      dineroFinanzas(datosFinanzas.saldos.bancario);
  }

  if (tarjetas) {
    tarjetas.textContent =
      dineroFinanzas(datosFinanzas.saldos.tarjeta);
  }

  renderizarOperacionesFinanzas();
  renderizarTarjetasFinanzas();
}

function configurarFinanzas() {
  const formularioOperacion =
    document.getElementById("formOperacion");

  formularioOperacion?.addEventListener("submit", evento => {
    evento.preventDefault();

    const descripcion =
      document.getElementById("opNombre").value.trim();

    const tipo = document.getElementById("opTipo").value;
    const cuenta = document.getElementById("opCuenta").value;

    const importe = Number(
      document.getElementById("opImporte").value
    );

    if (
      agregarOperacionFinanzas(
        descripcion,
        tipo,
        cuenta,
        importe
      )
    ) {
      formularioOperacion.reset();
    }
  });

  document.querySelectorAll("[data-formulario]").forEach(boton => {
    boton.addEventListener("click", () => {
      const formulario = document.getElementById(
        boton.dataset.formulario
      );

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
      const importe = Number(
        document.getElementById("trImporte").value
      );

      if (
        origen === destino ||
        !["bancario", "tarjeta"].includes(origen) ||
        !["bancario", "tarjeta"].includes(destino) ||
        !Number.isFinite(importe) ||
        importe <= 0 ||
        importe > 1000000000
      ) {
        mostrarEstadoFinanzas(
          "Comprueba las cuentas y el importe."
        );
        return;
      }

      const cantidad = Math.round(importe * 100) / 100;

      if (datosFinanzas.saldos[origen] < cantidad) {
        mostrarEstadoFinanzas(
          "Saldo de demostración insuficiente."
        );
        return;
      }

      datosFinanzas.saldos[origen] =
        Math.round(
          (datosFinanzas.saldos[origen] - cantidad) * 100
        ) / 100;

      datosFinanzas.saldos[destino] =
        Math.round(
          (datosFinanzas.saldos[destino] + cantidad) * 100
        ) / 100;

      const fecha = new Date().toISOString();

      datosFinanzas.operaciones.push({
        id: crearIdFinanzas(),
        descripcion:
          "Transferencia simulada a " +
          nombreCuentaFinanzas(destino),
        tipo: "gasto",
        cuenta: origen,
        importe: cantidad,
        fecha
      });

      datosFinanzas.operaciones.push({
        id: crearIdFinanzas(),
        descripcion:
          "Transferencia simulada desde " +
          nombreCuentaFinanzas(origen),
        tipo: "ingreso",
        cuenta: destino,
        importe: cantidad,
        fecha
      });

      if (guardarCambioFinanzas(
        "Simulación local guardada. No se transfirió dinero real."
      )) {
        evento.target.reset();
      }
    });

  document.getElementById("formTarjeta")
    ?.addEventListener("submit", evento => {
      evento.preventDefault();

      const alias =
        document.getElementById("tarAlias").value.trim();

      const ultimos =
        document.getElementById("tarUltimos").value.trim();

      if (
        !alias ||
        (ultimos && !/^[0-9]{4}$/.test(ultimos))
      ) {
        mostrarEstadoFinanzas(
          "Escribe un alias y, si quieres, cuatro dígitos."
        );
        return;
      }

      datosFinanzas.tarjetas.push({
        id: crearIdFinanzas(),
        alias: alias.slice(0, 40),
        ultimos
      });

      if (guardarCambioFinanzas(
        "Tarjeta de demostración guardada."
      )) {
        evento.target.reset();
      }
    });

  document.getElementById("filtroOrden")
    ?.addEventListener("change", renderizarOperacionesFinanzas);

  document.getElementById("filtroCuenta")
    ?.addEventListener("change", renderizarOperacionesFinanzas);

  document.getElementById("exportar")
    ?.addEventListener("click", () => {
      const filas = [
        ["Descripción", "Tipo", "Cuenta", "Importe CUP", "Fecha"]
      ];

      datosFinanzas.operaciones.forEach(op => {
        filas.push([
          op.descripcion,
          op.tipo,
          nombreCuentaFinanzas(op.cuenta),
          Number(op.importe).toFixed(2),
          op.fecha
        ]);
      });

      function escaparCSV(valor) {
        let texto = String(valor);

        if (/^[\s]*[=+\-@]/.test(texto)) {
          texto = "'" + texto;
        }

        return '"' + texto.replace(/"/g, '""') + '"';
      }

      const csv = "\uFEFF" + filas.map(fila =>
        fila.map(escaparCSV).join(";")
      ).join("\r\n");

      const archivo = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
      });

      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement("a");

      enlace.href = url;
      enlace.download = "nova-finanzas-demo.csv";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      URL.revokeObjectURL(url);

      mostrarEstadoFinanzas(
        "Archivo CSV de demostración preparado."
      );
    });

  document.getElementById("borrarDatos")
    ?.addEventListener("click", () => {
      const confirmar = window.confirm(
        "¿Borrar todos los datos financieros de demostración " +
        "guardados en este navegador?"
      );

      if (!confirmar) return;

      try {
        localStorage.removeItem(CLAVE_FINANZAS);
        datosFinanzas = estadoInicialFinanzas();
        renderizarFinanzas();

        mostrarEstadoFinanzas(
          "Datos de demostración borrados."
        );
      } catch (error) {
        mostrarEstadoFinanzas(
          "No se pudieron borrar los datos."
        );
      }
    });

  renderizarFinanzas();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    configurarFinanzas,
    { once: true }
  );
} else {
  configurarFinanzas();
}
