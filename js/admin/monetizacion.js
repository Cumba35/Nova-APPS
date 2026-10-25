
import { supabase } from "../../admin-core.js";

const STORAGE_KEY = "nova_monetizacion_tareas_v1";

function cargarTareas() {
  try {
    const datos = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

    return datos && typeof datos === "object" && !Array.isArray(datos)
      ? datos
      : {};
  } catch {
    return {};
  }
}

function guardarTareas(tareas) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tareas));
    return true;
  } catch {
    return false;
  }
}

function prepararListaTareas() {
  const seccion = document.querySelector("#tareas");

  if (!seccion) return;

  const lista = seccion.querySelector("ul");
  if (!lista) return;

  const tareasGuardadas = cargarTareas();

  const progreso = document.createElement("p");
  progreso.className = "monetizacion-status";
  progreso.setAttribute("role", "status");
  progreso.setAttribute("aria-live", "polite");

  const aviso = document.createElement("p");
  aviso.className = "monetizacion-status";
  aviso.hidden = true;

  function actualizarProgreso() {
    const controles = [...lista.querySelectorAll('input[type="checkbox"]')];
    const completadas = controles.filter(control => control.checked).length;

    progreso.textContent =
      `Progreso: ${completadas} de ${controles.length} tareas completadas.`;

    aviso.hidden = true;
  }

  [...lista.querySelectorAll("li")].forEach((elemento, indice) => {
    const texto = elemento.textContent.trim();
    const id = `tarea-${indice + 1}`;

    const etiqueta = document.createElement("label");
    etiqueta.className = "monetizacion-task";

    const control = document.createElement("input");
    control.type = "checkbox";
    control.checked = tareasGuardadas[id] === true;
    control.setAttribute("aria-label", texto);

    const descripcion = document.createElement("span");
    descripcion.textContent = texto;

    etiqueta.append(control, descripcion);
    elemento.replaceChildren(etiqueta);

    control.addEventListener("change", () => {
      const nuevasTareas = cargarTareas();
      nuevasTareas[id] = control.checked;

      if (!guardarTareas(nuevasTareas)) {
        aviso.hidden = false;
        aviso.textContent =
          "No se pudo guardar el progreso en este dispositivo.";
      }

      actualizarProgreso();
    });
  });

  lista.after(progreso, aviso);
  actualizarProgreso();
}

function prepararCierreSesion() {
  const panel = document.querySelector("#panel");

  if (!panel || document.querySelector("#monetizacionLogout")) return;

  const boton = document.createElement("button");
  boton.id = "monetizacionLogout";
  boton.type = "button";
  boton.className = "secondary";
  boton.textContent = "Cerrar sesión";

  boton.addEventListener("click", async () => {
    boton.disabled = true;
    boton.textContent = "Cerrando sesión...";

    const { error } = await supabase.auth.signOut();

    if (error) {
      boton.disabled = false;
      boton.textContent = "Cerrar sesión";

      const mensaje = document.querySelector("#message");
      if (mensaje) {
        mensaje.textContent = "No se pudo cerrar la sesión. Inténtalo de nuevo.";
      }

      return;
    }

    location.href = "./admin.html";
  });

  panel.prepend(boton);
}

function iniciar() {
  prepararListaTareas();
  prepararCierreSesion();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar, { once: true });
} else {
  iniciar();
}
