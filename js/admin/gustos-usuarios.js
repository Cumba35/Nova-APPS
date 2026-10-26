/* NOVA APPS — Administración de gustos y preferencias de usuarios */
(function () {
"use strict";

const STORAGE_KEY = "nova_admin_gustos_usuarios_v1";

function normalizar(valor) {
return String(valor ?? "").trim();
}

function escaparHTML(valor) {
return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
"&": "&",
"<": "<",
">": ">",
'"': """,
"'": "'"
})[caracter]);
}

function estaAutorizado() {
return document.body?.dataset?.adminAuthorized === "true";
}

function comprobarPermiso() {
if (!estaAutorizado()) {
throw new Error("No tienes permiso para realizar esta acción.");
}
}

function leerDatos() {
try {
const datos = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
return Array.isArray(datos) ? datos : [];
} catch {
return [];
}
}

function guardarDatos(datos) {
localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
}

function obtenerUsuarioId(usuario) {
return normalizar(usuario?.id || usuario?.user_id || usuario?.uid);
}

function obtenerNombre(usuario) {
return normalizar(
usuario?.nickname ||
usuario?.username ||
usuario?.name ||
usuario?.email ||
"Usuario sin nombre"
);
}

function obtenerPreferencias(usuarioId) {
comprobarPermiso();

const id = normalizar(usuarioId);
const registro = leerDatos().find(item => item.userId === id);

return registro ? {
  userId: registro.userId,
  nickname: registro.nickname || "",
  interests: Array.isArray(registro.interests) ? registro.interests : [],
  favoriteCategories: Array.isArray(registro.favoriteCategories)
    ? registro.favoriteCategories
    : [],
  preferredLanguage: registro.preferredLanguage || "es",
  communication: registro.communication || "sitio",
  notes: registro.notes || "",
  updatedAt: registro.updatedAt || null
} : {
  userId: id,
  nickname: "",
  interests: [],
  favoriteCategories: [],
  preferredLanguage: "es",
  communication: "sitio",
  notes: "",
  updatedAt: null
};

}

function guardarPreferencias(usuarioId, cambios = {}) {
comprobarPermiso();

const id = normalizar(usuarioId);
if (!id) throw new Error("Falta el identificador del usuario.");

const datos = leerDatos();
const indice = datos.findIndex(item => item.userId === id);
const anterior = indice >= 0 ? datos[indice] : {};

const registro = {
  ...anterior,
  userId: id,
  nickname: normalizar(cambios.nickname ?? anterior.nickname),
  interests: Array.isArray(cambios.interests)
    ? cambios.interests.map(normalizar).filter(Boolean)
    : anterior.interests || [],
  favoriteCategories: Array.isArray(cambios.favoriteCategories)
    ? cambios.favoriteCategories.map(normalizar).filter(Boolean)
    : anterior.favoriteCategories || [],
  preferredLanguage: normalizar(
    cambios.preferredLanguage ?? anterior.preferredLanguage ?? "es"
  ),
  communication: normalizar(
    cambios.communication ?? anterior.communication ?? "sitio"
  ),
  notes: normalizar(cambios.notes ?? anterior.notes),
  updatedAt: new Date().toISOString()
};

if (registro.nickname.length > 40) {
  throw new Error("El apodo no puede superar los 40 caracteres.");
}

if (registro.notes.length > 2000) {
  throw new Error("Las notas no pueden superar los 2000 caracteres.");
}

if (indice >= 0) {
  datos[indice] = registro;
} else {
  datos.push(registro);
}

guardarDatos(datos);
return obtenerPreferencias(id);

}

function eliminarPreferencias(usuarioId) {
comprobarPermiso();

const id = normalizar(usuarioId);
if (!id) throw new Error("Falta el identificador del usuario.");

guardarDatos(leerDatos().filter(item => item.userId !== id));
return true;

}

function renderizar(contenedor, usuarios = []) {
if (!contenedor) {
throw new Error("No se encontró el contenedor del módulo.");
}

if (!estaAutorizado()) {
  contenedor.replaceChildren();

  const aviso = document.createElement("p");
  aviso.setAttribute("role", "alert");
  aviso.textContent = "No tienes autorización para acceder a esta sección.";
  contenedor.appendChild(aviso);
  return;
}

const listaUsuarios = Array.isArray(usuarios)
  ? usuarios.filter(usuario => obtenerUsuarioId(usuario))
  : [];

contenedor.innerHTML = `
  <section class="nova-admin-gustos">
    <header>
      <h2>Gustos y preferencias de usuarios</h2>
      <p>Consulta y administra las preferencias guardadas en este navegador.</p>
    </header>

    <div class="nova-admin-gustos__search">
      <label for="nova-gustos-busqueda">Buscar usuario</label>
      <input id="nova-gustos-busqueda" type="search"
        placeholder="Nombre, apodo o correo" autocomplete="off">
    </div>

    <div class="nova-admin-gustos__layout">
      <div class="nova-admin-gustos__users">
        <h3>Usuarios</h3>
        <div id="nova-gustos-lista">
          ${
            listaUsuarios.length
              ? listaUsuarios.map(usuario => {
                  const id = obtenerUsuarioId(usuario);
                  const nombre = obtenerNombre(usuario);
                  const correo = normalizar(usuario.email);

                  return `
                    <button type="button"
                      class="nova-admin-gustos__user"
                      data-user-id="${escaparHTML(id)}"
                      data-search="${escaparHTML(
                        `${nombre} ${correo} ${id}`.toLowerCase()
                      )}"
                      aria-pressed="false">
                      <strong>${escaparHTML(nombre)}</strong>
                      <small>${escaparHTML(correo || id)}</small>
                    </button>`;
                }).join("")
              : "<p>No hay usuarios disponibles para mostrar.</p>"
          }
        </div>
      </div>

      <div class="nova-admin-gustos__editor">
        <h3>Preferencias seleccionadas</h3>
        <p id="nova-gustos-instruccion">
          Selecciona un usuario para consultar sus preferencias.
        </p>

        <form id="nova-gustos-form" hidden>
          <input type="hidden" id="nova-gustos-user-id">

          <div class="nova-admin-gustos__field">
            <label for="nova-gustos-apodo">Apodo</label>
            <input id="nova-gustos-apodo" maxlength="40">
          </div>

          <div class="nova-admin-gustos__field">
            <label for="nova-gustos-intereses">Intereses (uno por línea)</label>
            <textarea id="nova-gustos-intereses" rows="4"></textarea>
          </div>

          <div class="nova-admin-gustos__field">
            <label for="nova-gustos-categorias">Categorías favoritas (una por línea)</label>
            <textarea id="nova-gustos-categorias" rows="4"></textarea>
          </div>

          <div class="nova-admin-gustos__field">
            <label for="nova-gustos-idioma">Idioma preferido</label>
            <select id="nova-gustos-idioma">
              <option value="es">Español</option>
              <option value="en">Inglés</option>
              <option value="fr">Francés</option>
              <option value="pt">Portugués</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div class="nova-admin-gustos__field">
            <label for="nova-gustos-comunicacion">Comunicación preferida</label>
            <select id="nova-gustos-comunicacion">
              <option value="sitio">Notificaciones del sitio</option>
              <option value="correo">Correo electrónico</option>
              <option value="ninguna">Sin comunicaciones opcionales</option>
            </select>
          </div>

          <div class="nova-admin-gustos__field">
            <label for="nova-gustos-notas">Notas administrativas</label>
            <textarea id="nova-gustos-notas" rows="4" maxlength="2000"
              placeholder="No incluyas contraseñas ni información sensible."></textarea>
          </div>

          <p id="nova-gustos-mensaje" role="status" aria-live="polite"></p>

          <div class="nova-admin-gustos__actions">
            <button type="submit">Guardar preferencias</button>
            <button type="button" id="nova-gustos-borrar">
              Eliminar preferencias guardadas
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>`;

const lista = contenedor.querySelector("#nova-gustos-lista");
const busqueda = contenedor.querySelector("#nova-gustos-busqueda");
const formulario = contenedor.querySelector("#nova-gustos-form");
const instruccion = contenedor.querySelector("#nova-gustos-instruccion");
const mensaje = contenedor.querySelector("#nova-gustos-mensaje");

let seleccionado = "";

function cargarUsuario(id) {
  const usuario = listaUsuarios.find(
    item => obtenerUsuarioId(item) === id
  );

  if (!usuario) {
    mensaje.textContent = "No se encontró ese usuario.";
    return;
  }

  seleccionado = id;
  const preferencias = obtenerPreferencias(id);

  contenedor.querySelector("#nova-gustos-user-id").value = id;
  contenedor.querySelector("#nova-gustos-apodo").value = preferencias.nickname;
  contenedor.querySelector("#nova-gustos-intereses").value =
    preferencias.interests.join("\n");
  contenedor.querySelector("#nova-gustos-categorias").value =
    preferencias.favoriteCategories.join("\n");
  contenedor.querySelector("#nova-gustos-idioma").value =
    preferencias.preferredLanguage;
  contenedor.querySelector("#nova-gustos-comunicacion").value =
    preferencias.communication;
  contenedor.querySelector("#nova-gustos-notas").value = preferencias.notes;

  instruccion.textContent = `Usuario: ${obtenerNombre(usuario)}`;
  formulario.hidden = false;
  mensaje.textContent = "";

  lista.querySelectorAll("[data-user-id]").forEach(boton => {
    const activo = boton.dataset.userId === id;
    boton.classList.toggle("is-selected", activo);
    boton.setAttribute("aria-pressed", String(activo));
  });
}

lista.addEventListener("click", evento => {
  const boton = evento.target.closest("[data-user-id]");
  if (boton) cargarUsuario(boton.dataset.userId);
});

busqueda.addEventListener("input", () => {
  const consulta = busqueda.value.trim().toLowerCase();

  lista.querySelectorAll("[data-user-id]").forEach(boton => {
    boton.hidden = !boton.dataset.search.includes(consulta);
  });
});

formulario.addEventListener("submit", evento => {
  evento.preventDefault();

  try {
    guardarPreferencias(seleccionado, {
      nickname: contenedor.querySelector("#nova-gustos-apodo").value,
      interests: contenedor.querySelector("#nova-gustos-intereses").value.split("\n"),
      favoriteCategories: contenedor.querySelector("#nova-gustos-categorias").value.split("\n"),
      preferredLanguage: contenedor.querySelector("#nova-gustos-idioma").value,
      communication: contenedor.querySelector("#nova-gustos-comunicacion").value,
      notes: contenedor.querySelector("#nova-gustos-notas").value
    });

    mensaje.textContent = "Preferencias guardadas en este navegador.";
  } catch (error) {
    mensaje.textContent = error.message || "No se pudieron guardar los cambios.";
  }
});

contenedor.querySelector("#nova-gustos-borrar").addEventListener("click", () => {
  if (!seleccionado) return;

  if (!window.confirm("¿Eliminar las preferencias guardadas de este usuario?")) {
    return;
  }

  try {
    eliminarPreferencias(seleccionado);
    cargarUsuario(seleccionado);
    mensaje.textContent = "Preferencias locales eliminadas.";
  } catch (error) {
    mensaje.textContent = error.message || "No se pudieron eliminar los datos.";
  }
});

}

window.NOVA_ADMIN_GUSTOS = {
render: renderizar,
getPreferences: obtenerPreferencias,
savePreferences: guardarPreferencias,
deletePreferences: eliminarPreferencias,
isAuthorized: estaAutorizado
};
})();