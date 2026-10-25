
/* =====================================================
   NOVA APPS — AMIGOS E INVITACIONES
   Archivo: js/amigos/amigos.js
   Almacenamiento provisional local.
   ===================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "nova-amigos-v1";

  const defaults = {
    friends: [],
    received: [],
    sent: [],
    invitations: []
  };

  function readData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return structuredCopy(defaults);

      const parsed = JSON.parse(stored);

      return {
        friends: Array.isArray(parsed.friends) ? parsed.friends : [],
        received: Array.isArray(parsed.received) ? parsed.received : [],
        sent: Array.isArray(parsed.sent) ? parsed.sent : [],
        invitations: Array.isArray(parsed.invitations)
          ? parsed.invitations : []
      };
    } catch {
      return structuredCopy(defaults);
    }
  }

  function structuredCopy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  let state = readData();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error("Nova Amigos: error al guardar.", error);
      return false;
    }
  }

  function id() {
    return window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : "amigo-" + Date.now() + "-" +
        Math.random().toString(36).slice(2);
  }

  function clean(value) {
    return String(value || "").trim().slice(0, 100);
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

  function emitChange() {
    window.dispatchEvent(new CustomEvent("nova:amigos-cambio", {
      detail: getData()
    }));
  }

  function result(ok, message, item) {
    return { ok, message, item: item || null };
  }

  function addFriend(nickname) {
    nickname = clean(nickname);

    if (nickname.length < 3) {
      return result(false, "El apodo debe tener al menos 3 caracteres.");
    }

    const key = nickname.toLocaleLowerCase();

    if (state.friends.some(x =>
      x.nickname.toLocaleLowerCase() === key
    )) {
      return result(false, "Esta persona ya está en tus amigos.");
    }

    if (state.sent.some(x =>
      x.nickname.toLocaleLowerCase() === key
    )) {
      return result(false, "Ya existe una solicitud enviada.");
    }

    const item = {
      id: id(),
      nickname,
      status: "pendiente",
      createdAt: new Date().toISOString()
    };

    state.sent.unshift(item);
    persist();
    emitChange();

    return result(true, "Solicitud registrada localmente.", item);
  }

  function receiveRequest(nickname, userId) {
    nickname = clean(nickname);

    if (!nickname) {
      return result(false, "Falta el apodo.");
    }

    const item = {
      id: id(),
      userId: clean(userId),
      nickname,
      status: "pendiente",
      createdAt: new Date().toISOString()
    };

    state.received.unshift(item);
    persist();
    emitChange();

    return result(true, "Solicitud agregada a la lista local.", item);
  }

  function acceptRequest(requestId) {
    const request = state.received.find(x => x.id === requestId);

    if (!request) {
      return result(false, "No se encontró la solicitud.");
    }

    state.friends.push({
      id: id(),
      userId: request.userId || "",
      nickname: request.nickname,
      createdAt: new Date().toISOString()
    });

    state.received = state.received.filter(x => x.id !== requestId);

    persist();
    emitChange();

    return result(true, "Amistad aceptada en la lista local.");
  }

  function rejectRequest(requestId) {
    const exists = state.received.some(x => x.id === requestId);

    if (!exists) {
      return result(false, "No se encontró la solicitud.");
    }

    state.received = state.received.filter(x => x.id !== requestId);
    persist();
    emitChange();

    return result(true, "Solicitud rechazada.");
  }

  function cancelRequest(requestId) {
    const exists = state.sent.some(x => x.id === requestId);

    if (!exists) {
      return result(false, "No se encontró la solicitud.");
    }

    state.sent = state.sent.filter(x => x.id !== requestId);
    persist();
    emitChange();

    return result(true, "Solicitud cancelada localmente.");
  }

  function removeFriend(friendId) {
    const exists = state.friends.some(x => x.id === friendId);

    if (!exists) {
      return result(false, "No se encontró el amigo.");
    }

    state.friends = state.friends.filter(x => x.id !== friendId);
    persist();
    emitChange();

    return result(true, "Amigo eliminado de la lista local.");
  }

  function createInvitation(contact, destination) {
    const item = {
      id: id(),
      contact: clean(contact),
      destination: clean(destination),
      url: new URL("./", window.location.href).href,
      status: "preparada",
      createdAt: new Date().toISOString()
    };

    state.invitations.unshift(item);
    persist();
    emitChange();

    return item;
  }

  async function shareInvitation(invitationId) {
    const item = state.invitations.find(x => x.id === invitationId);

    if (!item) {
      return result(false, "No se encontró la invitación.");
    }

    const message = "Te invito a unirte a Nova Apps: " + item.url;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Invitación a Nova Apps",
          text: message,
          url: item.url
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        window.prompt("Copia el enlace de invitación:", message);
      }

      item.status = "compartida";
      persist();
      emitChange();

      return result(true, "Invitación preparada para compartir.", item);
    } catch (error) {
      if (error?.name === "AbortError") {
        return result(false, "Compartir fue cancelado.");
      }

      return result(false, "No se pudo compartir la invitación.");
    }
  }

  async function selectContacts() {
    if (typeof navigator.contacts?.select !== "function") {
      return result(
        false,
        "Este navegador no admite la selección de contactos."
      );
    }

    try {
      const contacts = await navigator.contacts.select(
        ["name", "email", "tel"],
        { multiple: true }
      );

      const added = [];

      contacts.forEach(contact => {
        const name = contact.name?.[0] ||
          contact.email?.[0] ||
          contact.tel?.[0] ||
          "Contacto";

        const destination = contact.email?.[0] ||
          contact.tel?.[0] || "";

        added.push(createInvitation(name, destination));
      });

      return result(true, "Contactos seleccionados.", added);
    } catch (error) {
      return result(
        false,
        error?.name === "AbortError"
          ? "Selección cancelada."
          : "No se pudieron seleccionar los contactos."
      );
    }
  }

  function getData() {
    return structuredCopy(state);
  }

  function clearLocalData() {
    state = structuredCopy(defaults);
    persist();
    emitChange();
    return result(true, "Listas locales vaciadas.");
  }

  window.NOVA_FRIENDS = Object.freeze({
    getData,
    addFriend,
    receiveRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
    createInvitation,
    shareInvitation,
    selectContacts,
    clearLocalData
  });
})();
