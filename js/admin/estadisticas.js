import { supabase } from "../../admin-core.js";

"use strict";

const SELECTORES = {
  registrados: "#usuariosRegistrados",
  activos: "#usuariosActivos",
  comentarios: "#totalComentarios",
  compartidos: "#totalCompartidos",
  valoracionGeneral: "#valoracionGeneral",
  valoracionMayor: "#valoracionMayor",
  valoracionMenor: "#valoracionMenor",
  nuevosUsuarios: "#nuevosUsuarios"
};

function mostrarEstado(mensaje) {
  const estado = document.querySelector("#statsStatus");
  const mensajeGeneral = document.querySelector("#message");

  if (estado) estado.textContent = mensaje;
  if (mensajeGeneral) mensajeGeneral.textContent = mensaje;
}

function limpiarMetricas() {
  Object.values(SELECTORES).forEach(selector => {
    const elemento = document.querySelector(selector);

    if (elemento) {
      elemento.textContent = "—";
    }
  });
}

function mostrarCuenta(usuario) {
  const elemento = document.querySelector("#account");

  if (elemento) {
    elemento.textContent =
      "Sesión autorizada: " +
      (usuario.email || "administrador");
  }
}

function prepararTabla() {
  const cuerpo = document.querySelector("#statsContentBody");

  if (!cuerpo) return;

  const fila = document.createElement("tr");
  const celda = document.createElement("td");

  celda.colSpan = 5;
  celda.className = "stats-empty";
  celda.textContent =
    "Todavía no hay fuentes de datos conectadas para estas métricas.";

  fila.appendChild(celda);
  cuerpo.replaceChildren(fila);
}

async function comprobarEstadisticas() {
  const boton = document.querySelector("#refreshStats");

  if (boton) {
    boton.disabled = true;
    boton.textContent = "Comprobando…";
  }

  limpiarMetricas();
  prepararTabla();

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      mostrarEstado(
        "No hay una sesión activa. Inicia sesión con la cuenta autorizada."
      );
      return;
    }

    mostrarCuenta(data.user);

    mostrarEstado(
      "Sesión verificada. Las estadísticas reales siguen pendientes de conectar con las tablas y los eventos de Supabase."
    );
  } catch (error) {
    console.error("Error al comprobar las estadísticas:", error);

    mostrarEstado(
      "No se pudo comprobar la sesión. Verifica tu conexión e inténtalo de nuevo."
    );
  } finally {
    if (boton) {
      boton.disabled = false;
      boton.textContent = "Comprobar estado";
    }
  }
}

function iniciarEstadisticas() {
  const boton = document.querySelector("#refreshStats");

  boton?.addEventListener("click", comprobarEstadisticas);

  comprobarEstadisticas();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    iniciarEstadisticas,
    { once: true }
  );
} else {
  iniciarEstadisticas();
}