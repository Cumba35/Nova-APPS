
/* =========================================================
   NOVA APPS — MI CUENTA
   Archivo: js/mi-cuenta.js
   Versión inicial local, preparada para integración futura.
   La sincronización segura con Supabase se hará al final.
   ========================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "nova-mi-cuenta-v1";
  const NICKNAME_CHANGE_DAYS = 30;

  const DEFAULT_DATA = {
    profile: {
      nickname: "",
      age: "",
      sex: "",
      phone: "",
      secondaryEmail: "",
      biography: ""
    },
    preferences: {
      interests: [],
      favoriteCategories: [],
      communication: "equilibrada",
      language: "es",
      theme: "system"
    },
    novaPreferences: {
      responseStyle: "claro",
      proactiveSuggestions: true,
      saveConversationPreferences: true
    },
    notifications: {
      friendRequests: true,
      invitations: true,
      accountUpdates: true,
      reminders: true
    },
    privacy: {
      showNickname: true,
      allowFriendRequests: true,
      contactsPermission: false
    },
    memories: [],
    tasks: [],
    friends: [],
    receivedRequests: [],
    sentRequests: [],
    invitations: [],
    nicknameLastChanged: null
  };

  let activeTab = "perfil";
  let currentContainer = null;
  let currentOptions = {};

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) return clone(DEFAULT_DATA);

      const parsed = JSON.parse(saved);

      return {
        ...clone(DEFAULT_DATA),
        ...parsed,
        profile: {
          ...DEFAULT_DATA.profile,
          ...(parsed.profile || {})
        },
        preferences: {
          ...DEFAULT_DATA.preferences,
          ...(parsed.preferences || {})
        },
        novaPreferences: {
          ...DEFAULT_DATA.novaPreferences,
          ...(parsed.novaPreferences || {})
        },
        notifications: {
          ...DEFAULT_DATA.notifications,
          ...(parsed.notifications || {})
        },
        privacy: {
          ...DEFAULT_DATA.privacy,
          ...(parsed.privacy || {})
        },
        memories: Array.isArray(parsed.memories) ? parsed.memories : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        friends: Array.isArray(parsed.friends) ? parsed.friends : [],
        receivedRequests: Array.isArray(parsed.receivedRequests)
          ? parsed.receivedRequests : [],
        sentRequests: Array.isArray(parsed.sentRequests)
          ? parsed.sentRequests : [],
        invitations: Array.isArray(parsed.invitations)
          ? parsed.invitations : []
      };
    } catch (error) {
      console.error("Nova: no se pudieron leer los datos de Mi Cuenta.", error);
      return clone(DEFAULT_DATA);
    }
  }

  let data = loadData();

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Nova: no se pudieron guardar los datos.", error);
      notify("No se pudieron guardar los cambios en este dispositivo.", "error");
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return "nova-" + Date.now() + "-" +
      Math.random().toString(36).slice(2, 10);
  }

  function notify(message, type) {
    const existing = document.querySelector(".nova-account-notice");

    if (existing) existing.remove();

    const notice = document.createElement("div");
    notice.className = "nova-account-notice";
    notice.setAttribute("role", "status");
    notice.textContent = message;

    if (type) notice.dataset.type = type;

    const parent = currentContainer || document.body;
    parent.prepend(notice);

    window.setTimeout(function () {
      notice.remove();
    }, 4000);
  }

  function nicknameAvailableDate() {
    if (!data.nicknameLastChanged) return null;

    const last = new Date(data.nicknameLastChanged);
    if (Number.isNaN(last.getTime())) return null;

    const available = new Date(last);
    available.setDate(available.getDate() + NICKNAME_CHANGE_DAYS);

    return available;
  }

  function canChangeNickname() {
    const available = nicknameAvailableDate();
    return !available || Date.now() >= available.getTime();
  }

  function nicknameStatus() {
    const available = nicknameAvailableDate();

    if (!available || canChangeNickname()) {
      return "Puedes cambiar tu apodo. Después de cambiarlo, deberás esperar 30 días.";
    }

    return "Podrás cambiarlo nuevamente el " +
      available.toLocaleDateString("es", {
        year: "numeric",
        month: "long",
        day: "numeric"
      }) + ".";
  }

  function field(label, name, value, type, required, options) {
    const attrs = options || {};
    const requiredAttr = required ? " required" : "";
    const maxlength = attrs.maxlength
      ? ' maxlength="' + Number(attrs.maxlength) + '"'
      : "";
    const placeholder = attrs.placeholder
      ? ' placeholder="' + escapeHTML(attrs.placeholder) + '"'
      : "";

    return `
      <label class="nova-account-field">
        <span>${escapeHTML(label)}</span>
        <input
          type="${escapeHTML(type || "text")}"
          name="${escapeHTML(name)}"
          value="${escapeHTML(value)}"
          ${requiredAttr}
          ${maxlength}
          ${placeholder}
        >
      </label>
    `;
  }

  function selectField(label, name, value, choices) {
    return `
      <label class="nova-account-field">
        <span>${escapeHTML(label)}</span>
        <select name="${escapeHTML(name)}">
          ${choices.map(function (choice) {
            return `
              <option value="${escapeHTML(choice.value)}"
                ${choice.value === value ? "selected" : ""}>
                ${escapeHTML(choice.label)}
              </option>
            `;
          }).join("")}
        </select>
      </label>
    `;
  }

  function toggleField(label, name, checked, description) {
    return `
      <label class="nova-account-option">
        <span>
          <strong>${escapeHTML(label)}</strong>
          ${description
            ? `<small>${escapeHTML(description)}</small>`
            : ""}
        </span>
        <input type="checkbox" name="${escapeHTML(name)}"
          ${checked ? "checked" : ""}>
      </label>
    `;
  }

  function renderProfile() {
    const profile = data.profile;

    return `
      <section class="nova-account-card">
        <h3>Datos personales</h3>
        <p>Completa los datos que quieras guardar en tu cuenta.</p>

        <form data-form="profile" class="nova-account-form">
          ${field(
            "Apodo único",
            "nickname",
            profile.nickname,
            "text",
            true,
            { maxlength: 24, placeholder: "Elige tu apodo" }
          )}

          <small class="nova-account-help">
            ${escapeHTML(nicknameStatus())}
          </small>

          <div class="nova-account-grid">
            ${field("Edad", "age", profile.age, "number", true)}
            ${selectField("Sexo", "sex", profile.sex, [
              { value: "", label: "Seleccionar" },
              { value: "masculino", label: "Masculino" },
              { value: "femenino", label: "Femenino" }
            ])}
          </div>

          ${field(
            "Teléfono (opcional)",
            "phone",
            profile.phone,
            "tel"
          )}

          ${field(
            "Correo secundario (opcional)",
            "secondaryEmail",
            profile.secondaryEmail,
            "email"
          )}

          <label class="nova-account-field">
            <span>Sobre mí (opcional)</span>
            <textarea name="biography" maxlength="500"
              rows="3">${escapeHTML(profile.biography)}</textarea>
          </label>

          <button class="nova-account-button" type="submit">
            Guardar perfil
          </button>
        </form>
      </section>
    `;
  }

  function renderPreferences() {
    const p = data.preferences;

    return `
      <section class="nova-account-card">
        <h3>Gustos y preferencias</h3>

        <form data-form="preferences" class="nova-account-form">
          <label class="nova-account-field">
            <span>Intereses separados por comas</span>
            <textarea name="interests" rows="3"
              placeholder="Tecnología, música, juegos...">${escapeHTML(
                p.interests.join(", ")
              )}</textarea>
          </label>

          <label class="nova-account-field">
            <span>Categorías favoritas</span>
            <textarea name="favoriteCategories" rows="2"
              placeholder="Aplicaciones, herramientas...">${escapeHTML(
                p.favoriteCategories.join(", ")
              )}</textarea>
          </label>

          ${selectField("Estilo de comunicación", "communication",
            p.communication, [
              { value: "breve", label: "Breve y directo" },
              { value: "equilibrada", label: "Equilibrado" },
              { value: "detallada", label: "Detallado" }
            ])}

          ${selectField("Idioma", "language", p.language, [
            { value: "es", label: "Español" },
            { value: "en", label: "Inglés" }
          ])}

          ${selectField("Tema visual", "theme", p.theme, [
            { value: "system", label: "Según el dispositivo" },
            { value: "light", label: "Claro" },
            { value: "dark", label: "Oscuro" }
          ])}

          <button class="nova-account-button" type="submit">
            Guardar preferencias
          </button>
        </form>
      </section>
    `;
  }

  function renderNovaPreferences() {
    const p = data.novaPreferences;

    return `
      <section class="nova-account-card">
        <h3>Preferencias de Nova</h3>
        <p>Configura cómo quieres que Nova te ayude.</p>

        <form data-form="nova-preferences" class="nova-account-form">
          ${selectField("Estilo de respuesta", "responseStyle",
            p.responseStyle, [
              { value: "claro", label: "Claro y directo" },
              { value: "detallado", label: "Con explicaciones" },
              { value: "tecnico", label: "Técnico" }
            ])}

          ${toggleField(
            "Sugerencias proactivas",
            "proactiveSuggestions",
            p.proactiveSuggestions,
            "Permitir sugerencias útiles."
          )}

          ${toggleField(
            "Recordar preferencias",
            "saveConversationPreferences",
            p.saveConversationPreferences,
            "Guardar preferencias locales para futuras sesiones."
          )}

          <button class="nova-account-button" type="submit">
            Guardar configuración
          </button>
        </form>
      </section>
    `;
  }

  function renderNotifications() {
    return `
      <section class="nova-account-card">
        <h3>Notificaciones y alertas</h3>

        <form data-form="notifications" class="nova-account-form">
          ${toggleField(
            "Solicitudes de amistad",
            "friendRequests",
            data.notifications.friendRequests
          )}

          ${toggleField(
            "Invitaciones",
            "invitations",
            data.notifications.invitations
          )}

          ${toggleField(
            "Cambios de la cuenta",
            "accountUpdates",
            data.notifications.accountUpdates
          )}

          ${toggleField(
            "Recordatorios y tareas",
            "reminders",
            data.notifications.reminders
          )}

          <button class="nova-account-button" type="submit">
            Guardar notificaciones
          </button>
        </form>
      </section>
    `;
  }

  function renderPrivacy() {
    return `
      <section class="nova-account-card">
        <h3>Privacidad y permisos</h3>

        <form data-form="privacy" class="nova-account-form">
          ${toggleField(
            "Mostrar mi apodo",
            "showNickname",
            data.privacy.showNickname
          )}

          ${toggleField(
            "Permitir solicitudes de amistad",
            "allowFriendRequests",
            data.privacy.allowFriendRequests
          )}

          ${toggleField(
            "Permitir acceso a contactos",
            "contactsPermission",
            data.privacy.contactsPermission,
            "No se leerán contactos hasta que actives el permiso y el navegador lo permita."
          )}

          <button class="nova-account-button" type="submit">
            Guardar privacidad
          </button>
        </form>

        <p class="nova-account-help">
          El permiso guardado aquí no concede por sí solo acceso al teléfono.
          El navegador debe solicitar autorización cuando se implemente esa función.
        </p>
      </section>
    `;
  }

  function renderMemories() {
    const rows = data.memories.map(function (item) {
      return `
        <div class="nova-account-list-item">
          <span>${escapeHTML(item.text || "")}</span>
          <button type="button" data-delete-memory="${escapeHTML(item.id)}">
            Eliminar
          </button>
        </div>
      `;
    }).join("");

    return `
      <section class="nova-account-card">
        <h3>Datos que Nova recuerda</h3>
        <p>Esta versión solo administra notas locales de este dispositivo.</p>

        <form data-form="memory" class="nova-account-form">
          <label class="nova-account-field">
            <span>Agregar nota</span>
            <input name="memory" maxlength="500" required
              placeholder="Escribe una preferencia o dato">
          </label>
          <button class="nova-account-button" type="submit">
            Guardar nota
          </button>
        </form>

        <div class="nova-account-list">
          ${rows || '<p class="nova-account-empty">No hay notas guardadas.</p>'}
        </div>
      </section>
    `;
  }

  function renderTasks() {
    const rows = data.tasks.map(function (task) {
      return `
        <div class="nova-account-list-item">
          <label>
            <input type="checkbox" data-task-done="${escapeHTML(task.id)}"
              ${task.done ? "checked" : ""}>
            <span>${escapeHTML(task.text)}</span>
          </label>
          <button type="button" data-delete-task="${escapeHTML(task.id)}">
            Eliminar
          </button>
        </div>
      `;
    }).join("");

    return `
      <section class="nova-account-card">
        <h3>Tareas pendientes y actividad</h3>

        <form data-form="task" class="nova-account-form">
          <label class="nova-account-field">
            <span>Nueva tarea</span>
            <input name="task" maxlength="250" required
              placeholder="Escribe una tarea">
          </label>
          <button class="nova-account-button" type="submit">
            Agregar tarea
          </button>
        </form>

        <div class="nova-account-list">
          ${rows || '<p class="nova-account-empty">No hay tareas guardadas.</p>'}
        </div>
      </section>
    `;
  }

  function renderFriends() {
    const friends = data.friends.map(function (friend) {
      return `
        <div class="nova-account-list-item">
          <span>${escapeHTML(friend.nickname)}</span>
          <button type="button" data-remove-friend="${escapeHTML(friend.id)}">
            Eliminar
          </button>
        </div>
      `;
    }).join("");

    const received = data.receivedRequests.map(function (request) {
      return `
        <div class="nova-account-list-item">
          <span>${escapeHTML(request.nickname)}</span>
          <div class="nova-account-actions">
            <button type="button" data-accept-request="${escapeHTML(request.id)}">
              Aceptar
            </button>
            <button type="button" data-reject-request="${escapeHTML(request.id)}">
              Rechazar
            </button>
          </div>
        </div>
      `;
    }).join("");

    const sent = data.sentRequests.map(function (request) {
      return `
        <div class="nova-account-list-item">
          <span>${escapeHTML(request.nickname)} — Pendiente</span>
          <button type="button" data-cancel-request="${escapeHTML(request.id)}">
            Cancelar
          </button>
        </div>
      `;
    }).join("");

    const invitations = data.invitations.map(function (invite) {
      return `
        <div class="nova-account-list-item">
          <span>
            ${escapeHTML(invite.contact || invite.destination)}
            — ${escapeHTML(invite.status || "Preparada")}
          </span>
          <button type="button" data-share-invitation="${escapeHTML(invite.id)}">
            Compartir enlace
          </button>
        </div>
      `;
    }).join("");

    return `
      <section class="nova-account-card">
        <h3>Amigos</h3>

        <form data-form="friend" class="nova-account-form">
          <label class="nova-account-field">
            <span>Apodo de la persona</span>
            <input name="friendNickname" maxlength="24" required
              placeholder="Apodo exacto">
          </label>
          <button class="nova-account-button" type="submit">
            Registrar solicitud de prueba
          </button>
        </form>

        <p class="nova-account-help">
          Esta versión guarda listas locales. Las solicitudes reales entre
          cuentas se conectarán al sistema de usuarios posteriormente.
        </p>

        <h4>Mis amigos</h4>
        <div class="nova-account-list">
          ${friends || '<p class="nova-account-empty">Todavía no tienes amigos guardados.</p>'}
        </div>

        <h4>Solicitudes recibidas</h4>
        <div class="nova-account-list">
          ${received || '<p class="nova-account-empty">No hay solicitudes recibidas.</p>'}
        </div>

        <h4>Solicitudes enviadas</h4>
        <div class="nova-account-list">
          ${sent || '<p class="nova-account-empty">No hay solicitudes enviadas.</p>'}
        </div>

        <h4>Contactos invitados</h4>
        <div class="nova-account-list">
          ${invitations || '<p class="nova-account-empty">Todavía no has preparado invitaciones.</p>'}
        </div>

        <button type="button" class="nova-account-button"
          data-action="invite">
          Crear invitación
        </button>

        <button type="button" class="nova-account-button"
          data-action="contacts">
          Seleccionar contactos compatibles
        </button>
      </section>
    `;
  }

  const TABS = [
    ["perfil", "Perfil"],
    ["preferencias", "Gustos y preferencias"],
    ["nova", "Preferencias de Nova"],
    ["notificaciones", "Notificaciones"],
    ["privacidad", "Privacidad y permisos"],
    ["recuerdos", "Datos que Nova recuerda"],
    ["tareas", "Tareas y actividad"],
    ["amigos", "Amigos"]
  ];

  function renderActiveTab() {
    switch (activeTab) {
      case "perfil": return renderProfile();
      case "preferencias": return renderPreferences();
      case "nova": return renderNovaPreferences();
      case "notificaciones": return renderNotifications();
      case "privacidad": return renderPrivacy();
      case "recuerdos": return renderMemories();
      case "tareas": return renderTasks();
      case "amigos": return renderFriends();
      default: return renderProfile();
    }
  }

  function render() {
    if (!currentContainer) return;

    const displayName = data.profile.nickname ||
      currentOptions.userName ||
      "Mi cuenta";

    currentContainer.innerHTML = `
      <div class="nova-account">
        <header class="nova-account-header">
          <div class="nova-account-avatar" aria-hidden="true">
            ${escapeHTML(displayName.charAt(0).toUpperCase())}
          </div>
          <div>
            <h2>${escapeHTML(displayName)}</h2>
            <p>Tu perfil, preferencias y contactos de Nova Apps</p>
          </div>
        </header>

        <nav class="nova-account-tabs" aria-label="Opciones de mi cuenta">
          ${TABS.map(function (tab) {
            return `
              <button type="button"
                class="nova-account-tab ${activeTab === tab[0] ? "active" : ""}"
                data-tab="${tab[0]}"
                aria-selected="${activeTab === tab[0] ? "true" : "false"}">
                ${escapeHTML(tab[1])}
              </button>
            `;
          }).join("")}
        </nav>

        <div class="nova-account-content">
          ${renderActiveTab()}
        </div>
      </div>
    `;
  }

  function getFormData(form) {
    return new FormData(form);
  }

  function splitList(value) {
    return String(value || "")
      .split(",")
      .map(function (item) { return item.trim(); })
      .filter(Boolean)
      .slice(0, 50);
  }

  function handleProfile(form) {
    const formData = getFormData(form);
    const nickname = String(formData.get("nickname") || "").trim();
    const age = Number(formData.get("age"));
    const sex = String(formData.get("sex") || "");
    const phone = String(formData.get("phone") || "").trim();
    const email = String(formData.get("secondaryEmail") || "").trim();

    if (!/^[\p{L}\p{N}_.-]{3,24}$/u.test(nickname)) {
      notify("El apodo debe tener entre 3 y 24 caracteres: letras, números, punto, guion o guion bajo.", "error");
      return;
    }

    if (!Number.isInteger(age) || age < 13 || age > 120) {
      notify("Introduce una edad válida entre 13 y 120 años.", "error");
      return;
    }

    if (!["masculino", "femenino"].includes(sex)) {
      notify("Selecciona una opción en el campo Sexo.", "error");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notify("El correo secundario no parece válido.", "error");
      return;
    }

    const oldNickname = data.profile.nickname;

    if (
      oldNickname &&
      nickname.toLowerCase() !== oldNickname.toLowerCase() &&
      !canChangeNickname()
    ) {
      notify(nicknameStatus(), "error");
      return;
    }

    if (
      oldNickname &&
      nickname.toLowerCase() !== oldNickname.toLowerCase()
    ) {
      data.nicknameLastChanged = new Date().toISOString();
    } else if (!oldNickname && nickname) {
      data.nicknameLastChanged = new Date().toISOString();
    }

    data.profile = {
      ...data.profile,
      nickname,
      age: String(age),
      sex,
      phone,
      secondaryEmail: email,
      biography: String(formData.get("biography") || "").trim()
    };

    saveData();
    render();
    notify("Perfil guardado en este dispositivo.");
  }

  function handleSubmit(event) {
    const form = event.target.closest("form[data-form]");
    if (!form) return;

    event.preventDefault();

    const type = form.dataset.form;
    const formData = getFormData(form);

    if (type === "profile") {
      handleProfile(form);
      return;
    }

    if (type === "preferences") {
      data.preferences = {
        ...data.preferences,
        interests: splitList(formData.get("interests")),
        favoriteCategories: splitList(formData.get("favoriteCategories")),
        communication: String(formData.get("communication") || "equilibrada"),
        language: String(formData.get("language") || "es"),
        theme: String(formData.get("theme") || "system")
      };
    }

    if (type === "nova-preferences") {
      data.novaPreferences = {
        responseStyle: String(formData.get("responseStyle") || "claro"),
        proactiveSuggestions: formData.has("proactiveSuggestions"),
        saveConversationPreferences: formData.has("saveConversationPreferences")
      };
    }

    if (type === "notifications") {
      data.notifications = {
        friendRequests: formData.has("friendRequests"),
        invitations: formData.has("invitations"),
        accountUpdates: formData.has("accountUpdates"),
        reminders: formData.has("reminders")
      };
    }

    if (type === "privacy") {
      data.privacy = {
        showNickname: formData.has("showNickname"),
        allowFriendRequests: formData.has("allowFriendRequests"),
        contactsPermission: formData.has("contactsPermission")
      };
    }

    if (type === "memory") {
      const text = String(formData.get("memory") || "").trim();
      if (!text) return;

      data.memories.unshift({
        id: makeId(),
        text,
        createdAt: new Date().toISOString()
      });
    }

    if (type === "task") {
      const text = String(formData.get("task") || "").trim();
      if (!text) return;

      data.tasks.unshift({
        id: makeId(),
        text,
        done: false,
        createdAt: new Date().toISOString()
      });
    }

    if (type === "friend") {
      const nickname = String(formData.get("friendNickname") || "").trim();

      if (
        nickname.toLowerCase() ===
        String(data.profile.nickname || "").toLowerCase()
      ) {
        notify("No puedes enviarte una solicitud a ti mismo.", "error");
        return;
      }

      const duplicate = data.friends.some(function (friend) {
        return friend.nickname.toLowerCase() === nickname.toLowerCase();
      }) || data.sentRequests.some(function (request) {
        return request.nickname.toLowerCase() === nickname.toLowerCase();
      });

      if (duplicate) {
        notify("Esa persona ya está en tu lista o tiene una solicitud pendiente.", "error");
        return;
      }

      data.sentRequests.unshift({
        id: makeId(),
        nickname,
        createdAt: new Date().toISOString()
      });
    }

    saveData();
    render();
    notify("Cambios guardados en este dispositivo.");
  }

  async function shareInvitation(invitation) {
    const baseUrl = currentOptions.invitationUrl ||
      window.location.origin + window.location.pathname;

    const message = "Te invito a unirte a Nova Apps: " + baseUrl;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Invitación a Nova Apps",
          text: message,
          url: baseUrl
        });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
        notify("Enlace de invitación copiado.");
      } else {
        window.prompt("Copia este enlace de invitación:", message);
      }
    } catch (error) {
      if (error && error.name !== "AbortError") {
        notify("No se pudo compartir. Puedes copiar el enlace manualmente.", "error");
      }
    }
  }

  function createInvitation() {
    const invitation = {
      id: makeId(),
      contact: "",
      destination: "Enlace general",
      status: "Preparada",
      url: currentOptions.invitationUrl ||
        window.location.origin + window.location.pathname,
      createdAt: new Date().toISOString()
    };

    data.invitations.unshift(invitation);
    saveData();
    render();
    shareInvitation(invitation);
  }

  async function selectContacts() {
    if (!data.privacy.contactsPermission) {
      notify("Activa primero el permiso de contactos en Privacidad y permisos.", "error");
      return;
    }

    if (typeof navigator.contacts?.select !== "function") {
      notify("Este navegador no admite la selección de contactos. Puedes crear una invitación y compartirla por WhatsApp, SMS o correo.");
      return;
    }

    try {
      const contacts = await navigator.contacts.select(
        ["name", "email", "tel"],
        { multiple: true }
      );

      if (!contacts || contacts.length === 0) {
        notify("No se seleccionaron contactos.");
        return;
      }

      contacts.forEach(function (contact) {
        const name = (contact.name && contact.name[0]) ||
          (contact.email && contact.email[0]) ||
          (contact.tel && contact.tel[0]) ||
          "Contacto";

        const destination = (contact.email && contact.email[0]) ||
          (contact.tel && contact.tel[0]) || "";

        data.invitations.unshift({
          id: makeId(),
          contact: name,
          destination,
          status: "Pendiente de compartir",
          url: currentOptions.invitationUrl ||
            window.location.origin + window.location.pathname,
          createdAt: new Date().toISOString()
        });
      });

      saveData();
      render();
      notify("Contactos seleccionados. Comparte las invitaciones cuando quieras.");
    } catch (error) {
      if (!error || error.name !== "AbortError") {
        notify("No se pudieron seleccionar los contactos.", "error");
      }
    }
  }

  function handleClick(event) {
    const tab = event.target.closest("[data-tab]");

    if (tab) {
      activeTab = tab.dataset.tab;
      render();
      return;
    }

    const accept = event.target.closest("[data-accept-request]");
    if (accept) {
      const request = data.receivedRequests.find(function (item) {
        return item.id === accept.dataset.acceptRequest;
      });

      if (request) {
        data.friends.push({
          id: makeId(),
          nickname: request.nickname,
          addedAt: new Date().toISOString()
        });

        data.receivedRequests = data.receivedRequests.filter(function (item) {
          return item.id !== request.id;
        });

        saveData();
        render();
        notify("Amigo agregado a la lista local.");
      }
      return;
    }

    const reject = event.target.closest("[data-reject-request]");
    if (reject) {
      data.receivedRequests = data.receivedRequests.filter(function (item) {
        return item.id !== reject.dataset.rejectRequest;
      });
      saveData();
      render();
      notify("Solicitud eliminada.");
      return;
    }

    const cancel = event.target.closest("[data-cancel-request]");
    if (cancel) {
      data.sentRequests = data.sentRequests.filter(function (item) {
        return item.id !== cancel.dataset.cancelRequest;
      });
      saveData();
      render();
      notify("Solicitud local cancelada.");
      return;
    }

    const removeFriend = event.target.closest("[data-remove-friend]");
    if (removeFriend) {
      data.friends = data.friends.filter(function (item) {
        return item.id !== removeFriend.dataset.removeFriend;
      });
      saveData();
      render();
      notify("Amigo eliminado de la lista local.");
      return;
    }

    const removeMemory = event.target.closest("[data-delete-memory]");
    if (removeMemory) {
      data.memories = data.memories.filter(function (item) {
        return item.id !== removeMemory.dataset.deleteMemory;
      });
      saveData();
      render();
      return;
    }

    const removeTask = event.target.closest("[data-delete-task]");
    if (removeTask) {
      data.tasks = data.tasks.filter(function (item) {
        return item.id !== removeTask.dataset.deleteTask;
      });
      saveData();
      render();
      return;
    }

    const doneTask = event.target.closest("[data-task-done]");
    if (doneTask) {
      const task = data.tasks.find(function (item) {
        return item.id === doneTask.dataset.taskDone;
      });

      if (task) {
        task.done = doneTask.checked;
        saveData();
      }
      return;
    }

    const share = event.target.closest("[data-share-invitation]");
    if (share) {
      const invitation = data.invitations.find(function (item) {
        return item.id === share.dataset.shareInvitation;
      });

      if (invitation) shareInvitation(invitation);
      return;
    }

    const action = event.target.closest("[data-action]");
    if (!action) return;

    if (action.dataset.action === "invite") {
      createInvitation();
    }

    if (action.dataset.action === "contacts") {
      selectContacts();
    }
  }

  function mount(container, options) {
    if (typeof container === "string") {
      container = document.querySelector(container);
    }

    if (!container || !container.nodeType) {
      console.error("Nova Mi Cuenta: falta un contenedor HTML válido.");
      return false;
    }

    currentContainer = container;
    currentOptions = options || {};
    activeTab = currentOptions.initialTab || "perfil";

    currentContainer.removeEventListener("click", handleClick);
    currentContainer.removeEventListener("submit", handleSubmit);

    currentContainer.addEventListener("click", handleClick);
    currentContainer.addEventListener("submit", handleSubmit);

    data = loadData();
    render();

    return true;
  }

  function getData() {
    return clone(data);
  }

  function updateData(updates) {
    if (!updates || typeof updates !== "object") return false;

    data = {
      ...data,
      ...updates
    };

    const saved = saveData();
    if (saved) render();

    return saved;
  }

  window.NOVA_ACCOUNT = {
    mount,
    render,
    getData,
    updateData,
    reload: function () {
      data = loadData();
      render();
    }
  };
})();
