
/* =====================================================
   NOVA APPS — MI ESPACIO
   Archivo: js/mi-espacio.js
   ===================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "nova-mi-espacio-v1";

  const defaults = {
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
      categories: [],
      language: "es",
      theme: "system"
    },
    privacy: {
      showNickname: true,
      allowFriendRequests: true,
      contactsPermission: false
    }
  };

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!value) return copy(defaults);

      return {
        ...copy(defaults),
        ...value,
        profile: { ...defaults.profile, ...(value.profile || {}) },
        preferences: {
          ...defaults.preferences,
          ...(value.preferences || {})
        },
        privacy: { ...defaults.privacy, ...(value.privacy || {}) }
      };
    } catch {
      return copy(defaults);
    }
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent("nova:mi-espacio-updated", {
        detail: getData()
      }));
      return true;
    } catch (error) {
      console.error("Nova Mi Espacio:", error);
      return false;
    }
  }

  function getData() {
    return copy(state);
  }

  function updateProfile(values) {
    if (!values || typeof values !== "object") return false;

    const next = { ...state.profile, ...values };

    if (next.nickname && !/^[\p{L}\p{N}_.-]{3,24}$/u.test(next.nickname)) {
      return false;
    }

    if (next.age !== "" && (
      !Number.isInteger(Number(next.age)) ||
      Number(next.age) < 13 ||
      Number(next.age) > 120
    )) {
      return false;
    }

    if (next.sex && !["masculino", "femenino"].includes(next.sex)) {
      return false;
    }

    state.profile = next;
    return save();
  }

  function updatePreferences(values) {
    if (!values || typeof values !== "object") return false;

    state.preferences = {
      ...state.preferences,
      ...values,
      interests: Array.isArray(values.interests)
        ? values.interests.map(String).slice(0, 100)
        : state.preferences.interests,
      categories: Array.isArray(values.categories)
        ? values.categories.map(String).slice(0, 100)
        : state.preferences.categories
    };

    return save();
  }

  function updatePrivacy(values) {
    if (!values || typeof values !== "object") return false;

    const allowed = [
      "showNickname",
      "allowFriendRequests",
      "contactsPermission"
    ];

    allowed.forEach(key => {
      if (typeof values[key] === "boolean") {
        state.privacy[key] = values[key];
      }
    });

    return save();
  }

  function reset() {
    state = copy(defaults);
    return save();
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function mount(container) {
    if (typeof container === "string") {
      container = document.querySelector(container);
    }

    if (!container) return false;

    const profile = state.profile;

    container.innerHTML = `
      <section class="nova-account">
        <header class="nova-account-header">
          <div class="nova-account-avatar">
            ${escapeHTML((profile.nickname || "U").charAt(0).toUpperCase())}
          </div>
          <div>
            <h2>${escapeHTML(profile.nickname || "Mi espacio")}</h2>
            <p>Tu información y preferencias personales</p>
          </div>
        </header>

        <section class="nova-account-card">
          <h3>Información personal</h3>

          <form data-nova-space-form class="nova-account-form">
            <label class="nova-account-field">
              <span>Apodo único</span>
              <input name="nickname" minlength="3" maxlength="24"
                value="${escapeHTML(profile.nickname)}" required>
            </label>

            <div class="nova-account-grid">
              <label class="nova-account-field">
                <span>Edad</span>
                <input name="age" type="number" min="13" max="120"
                  value="${escapeHTML(profile.age)}" required>
              </label>

              <label class="nova-account-field">
                <span>Sexo</span>
                <select name="sex" required>
                  <option value="">Seleccionar</option>
                  <option value="masculino"
                    ${profile.sex === "masculino" ? "selected" : ""}>
                    Masculino
                  </option>
                  <option value="femenino"
                    ${profile.sex === "femenino" ? "selected" : ""}>
                    Femenino
                  </option>
                </select>
              </label>
            </div>

            <label class="nova-account-field">
              <span>Teléfono (opcional)</span>
              <input name="phone" type="tel"
                value="${escapeHTML(profile.phone)}">
            </label>

            <label class="nova-account-field">
              <span>Correo secundario (opcional)</span>
              <input name="secondaryEmail" type="email"
                value="${escapeHTML(profile.secondaryEmail)}">
            </label>

            <label class="nova-account-field">
              <span>Sobre mí</span>
              <textarea name="biography" maxlength="500" rows="3">${escapeHTML(profile.biography)}</textarea>
            </label>

            <button class="nova-account-button" type="submit">
              Guardar información
            </button>
          </form>

          <p data-nova-space-message aria-live="polite"></p>
        </section>
      </section>
    `;

    const form = container.querySelector("[data-nova-space-form]");
    const message = container.querySelector("[data-nova-space-message]");

    form.addEventListener("submit", event => {
      event.preventDefault();

      const values = Object.fromEntries(new FormData(form).entries());

      if (!updateProfile(values)) {
        message.textContent = "Revisa los datos introducidos.";
        return;
      }

      message.textContent = "Información guardada en este dispositivo.";
      mount(container);
    });

    return true;
  }

  window.NOVA_MY_SPACE = Object.freeze({
    mount,
    getData,
    updateProfile,
    updatePreferences,
    updatePrivacy,
    reset
  });
})();
