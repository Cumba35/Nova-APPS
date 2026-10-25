/* NOVA APPS — Administración de gustos y preferencias de usuarios */
(function () {
  "use strict";

  const STORAGE_KEY = "nova_admin_gustos_usuarios_v1";

  function readData() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function getUserId(user) {
    return String(user?.id ?? user?.user_id ?? user?.uid ?? "");
  }

  function getUserName(user) {
    return normalizeText(
      user?.nickname ||
      user?.username ||
      user?.name ||
      user?.email ||
      "Usuario sin nombre"
    );
  }

  function getCurrentRole() {
    const session = window.NOVA_SESSION;

    if (session && typeof session.getUser === "function") {
      const user = session.getUser();
      return String(user?.role || user?.rol || "");
    }

    return String(
      document.body?.dataset?.role ||
      localStorage.getItem("nova_user_role") ||
      ""
    );
  }

  function isAuthorized() {
    const role = getCurrentRole()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return ["propietario", "administrador", "admin"].includes(role);
  }

  function findUserRecord(records, userId) {
    return records.find(item => item.userId === String(userId));
  }

  function getPreferences(userId) {
    const record = findUserRecord(readData(), userId);

    return record ? {
      userId: record.userId,
      nickname: record.nickname || "",
      interests: Array.isArray(record.interests) ? record.interests : [],
      favoriteCategories: Array.isArray(record.favoriteCategories)
        ? record.favoriteCategories
        : [],
      preferredLanguage: record.preferredLanguage || "es",
      communication: record.communication || "sitio",
      notes: record.notes || "",
      updatedAt: record.updatedAt || null
    } : {
      userId: String(userId),
      nickname: "",
      interests: [],
      favoriteCategories: [],
      preferredLanguage: "es",
      communication: "sitio",
      notes: "",
      updatedAt: null
    };
  }

  function savePreferences(userId, changes) {
    if (!isAuthorized()) {
      throw new Error("No tienes permiso para modificar estos datos.");
    }

    const id = normalizeText(userId);

    if (!id) {
      throw new Error("Falta el identificador del usuario.");
    }

    const records = readData();
    const index = records.findIndex(item => item.userId === id);
    const previous = index >= 0 ? records[index] : {};

    const next = {
      ...previous,
      userId: id,
      nickname: normalizeText(changes.nickname ?? previous.nickname),
      interests: Array.isArray(changes.interests)
        ? changes.interests.map(normalizeText).filter(Boolean)
        : previous.interests || [],
      favoriteCategories: Array.isArray(changes.favoriteCategories)
        ? changes.favoriteCategories.map(normalizeText).filter(Boolean)
        : previous.favoriteCategories || [],
      preferredLanguage: normalizeText(
        changes.preferredLanguage ?? previous.preferredLanguage ?? "es"
      ),
      communication: normalizeText(
        changes.communication ?? previous.communication ?? "sitio"
      ),
      notes: normalizeText(changes.notes ?? previous.notes),
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      records[index] = next;
    } else {
      records.push(next);
    }

    saveData(records);
    return getPreferences(id);
  }

  function deletePreferences(userId) {
    if (!isAuthorized()) {
      throw new Error("No tienes permiso para eliminar estos datos.");
    }

    const id = normalizeText(userId);
    saveData(readData().filter(item => item.userId !== id));
    return true;
  }

  function render(container, users) {
    if (!container) {
      throw new Error("No se encontró el contenedor del módulo.");
    }

    if (!isAuthorized()) {
      container.innerHTML = `
        <section class="nova-admin-gustos">
          <p role="alert">No tienes autorización para acceder a esta sección.</p>
        </section>
      `;
      return;
    }

    const safeUsers = Array.isArray(users) ? users : [];

    container.innerHTML = `
      <section class="nova-admin-gustos">
        <header>
          <h2>Gustos y preferencias de usuarios</h2>
          <p>Consulta y administra las preferencias guardadas para cada usuario.</p>
        </header>

        <div class="nova-admin-gustos__search">
          <label for="nova-gustos-busqueda">Buscar usuario</label>
          <input
            id="nova-gustos-busqueda"
            type="search"
            placeholder="Nombre, apodo o correo"
            autocomplete="off"
          >
        </div>

        <div class="nova-admin-gustos__layout">
          <div class="nova-admin-gustos__users">
            <h3>Usuarios</h3>
            <div id="nova-gustos-lista">
              ${
                safeUsers.length
                  ? safeUsers.map(user => {
                      const id = getUserId(user);
                      const name = getUserName(user);

                      return `
                        <button
                          type="button"
                          class="nova-admin-gustos__user"
                          data-user-id="${escapeHTML(id)}"
                          data-search="${escapeHTML(
                            `${name} ${user?.email || ""} ${id}`.toLowerCase()
                          )}"
                        >
                          <strong>${escapeHTML(name)}</strong>
                          <small>${escapeHTML(user?.email || id || "Sin identificador")}</small>
                        </button>
                      `;
                    }).join("")
                  : `<p>No se han proporcionado usuarios para mostrar.</p>`
              }
            </div>
          </div>

          <div class="nova-admin-gustos__editor">
            <h3>Preferencias seleccionadas</h3>
            <p id="nova-gustos-instruccion">Selecciona un usuario para consultar sus preferencias.</p>

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
                <textarea
                  id="nova-gustos-notas"
                  rows="4"
                  maxlength="2000"
                  placeholder="No incluyas contraseñas ni información sensible."
                ></textarea>
              </div>

              <p id="nova-gustos-mensaje" role="status" aria-live="polite"></p>

              <div class="nova-admin-gustos__actions">
                <button type="submit">Guardar preferencias</button>
                <button type="button" id="nova-gustos-borrar">Eliminar preferencias guardadas</button>
              </div>
            </form>
          </div>
        </div>
      </section>
    `;

    const list = container.querySelector("#nova-gustos-lista");
    const search = container.querySelector("#nova-gustos-busqueda");
    const form = container.querySelector("#nova-gustos-form");
    const instruction = container.querySelector("#nova-gustos-instruccion");
    const message = container.querySelector("#nova-gustos-mensaje");

    let selectedId = "";

    function loadUser(id) {
      const user = safeUsers.find(item => getUserId(item) === id);

      if (!user) {
        message.textContent = "No se encontró ese usuario.";
        return;
      }

      selectedId = id;
      const preferences = getPreferences(id);

      container.querySelector("#nova-gustos-user-id").value = id;
      container.querySelector("#nova-gustos-apodo").value = preferences.nickname;
      container.querySelector("#nova-gustos-intereses").value =
        preferences.interests.join("\n");
      container.querySelector("#nova-gustos-categorias").value =
        preferences.favoriteCategories.join("\n");
      container.querySelector("#nova-gustos-idioma").value =
        preferences.preferredLanguage;
      container.querySelector("#nova-gustos-comunicacion").value =
        preferences.communication;
      container.querySelector("#nova-gustos-notas").value = preferences.notes;

      instruction.textContent = `Usuario: ${getUserName(user)}`;
      form.hidden = false;
      message.textContent = "";

      list.querySelectorAll("[data-user-id]").forEach(button => {
        button.classList.toggle("is-selected", button.dataset.userId === id);
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.userId === id)
        );
      });
    }

    list.addEventListener("click", event => {
      const button = event.target.closest("[data-user-id]");
      if (button) loadUser(button.dataset.userId);
    });

    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();

      list.querySelectorAll("[data-user-id]").forEach(button => {
        button.hidden = !button.dataset.search.includes(query);
      });
    });

    form.addEventListener("submit", event => {
      event.preventDefault();

      try {
        savePreferences(selectedId, {
          nickname: container.querySelector("#nova-gustos-apodo").value,
          interests: container.querySelector("#nova-gustos-intereses").value
            .split("\n"),
          favoriteCategories: container.querySelector("#nova-gustos-categorias").value
            .split("\n"),
          preferredLanguage: container.querySelector("#nova-gustos-idioma").value,
          communication: container.querySelector("#nova-gustos-comunicacion").value,
          notes: container.querySelector("#nova-gustos-notas").value
        });

        message.textContent = "Preferencias guardadas en este navegador.";
      } catch (error) {
        message.textContent = error.message || "No se pudieron guardar los cambios.";
      }
    });

    container.querySelector("#nova-gustos-borrar").addEventListener("click", () => {
      if (!selectedId) return;

      if (!window.confirm("¿Eliminar las preferencias guardadas de este usuario?")) {
        return;
      }

      try {
        deletePreferences(selectedId);
        loadUser(selectedId);
        message.textContent = "Preferencias locales eliminadas.";
      } catch (error) {
        message.textContent = error.message || "No se pudieron eliminar los datos.";
      }
    });
  }

  window.NOVA_ADMIN_GUSTOS = {
    render,
    getPreferences,
    savePreferences,
    deletePreferences,
    isAuthorized
  };
})();