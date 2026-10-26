/* js/amigos.js */

(() => {
"use strict";

const $ = id => document.getElementById(id);

const status = $("friendsStatus");
const contactsStatus = $("contactsPermissionStatus");
const inviteStatus = $("inviteStatus");
const inviteInput = $("inviteLink");
const copyButton = $("copyInviteLink");
const contactButton = $("requestContactsPermission");
const searchForm = $("findFriendForm");
const searchInput = $("friendSearch");
const searchResults = $("friendSearchResults");

let selectedContacts = [];

function message(element, text) {
if (element) {
element.textContent = text;
}
}

function createElement(tag, text, className) {
const element = document.createElement(tag);

if (text !== undefined) {
  element.textContent = text;
}

if (className) {
  element.className = className;
}

return element;

}

function getInvitationUrl() {
const url = new URL("./index.html", window.location.href);

url.searchParams.set("invitacion", "nova-apps");

return url.href;

}

function prepareInvitation() {
inviteInput.value = getInvitationUrl();
copyButton.disabled = false;
}

async function copyText(text) {
if (
navigator.clipboard &&
typeof navigator.clipboard.writeText === "function" &&
window.isSecureContext
) {
await navigator.clipboard.writeText(text);
return;
}

const temporary = document.createElement("textarea");

temporary.value = text;
temporary.readOnly = true;
temporary.style.position = "fixed";
temporary.style.opacity = "0";
temporary.style.pointerEvents = "none";

document.body.appendChild(temporary);
temporary.select();

let copied = false;

try {
  copied = document.execCommand("copy");
} finally {
  temporary.remove();
}

if (!copied) {
  inviteInput.focus();
  inviteInput.select();

  throw new Error(
    "No se pudo copiar automáticamente. Selecciona el enlace y cópialo manualmente."
  );
}

}

async function copyInvitation() {
try {
await copyText(inviteInput.value);

  message(
    inviteStatus,
    "Enlace copiado. Puedes compartirlo con quien quieras invitar."
  );
} catch (error) {
  message(
    inviteStatus,
    error.message || "No se pudo copiar el enlace."
  );
}

}

function renderSelectedContacts(contacts) {
const container = $("deviceContacts");

container.replaceChildren();

if (!contacts.length) {
  container.append(
    createElement(
      "p",
      "No se seleccionaron contactos.",
      "friends-empty"
    )
  );

  return;
}

const heading = createElement(
  "h3",
  "Contactos seleccionados"
);

const explanation = createElement(
  "p",
  "La selección permanece en esta página. No se ha enviado a Nova Apps."
);

explanation.className = "friends-description";

const list = document.createElement("ul");

for (const contact of contacts) {
  const item = document.createElement("li");

  const name = Array.isArray(contact.name)
    ? contact.name.join(" ")
    : "Contacto";

  item.append(
    createElement("strong", name || "Contacto")
  );

  const details = [];

  if (Array.isArray(contact.email)) {
    details.push(...contact.email);
  }

  if (Array.isArray(contact.tel)) {
    details.push(...contact.tel);
  }

  if (details.length) {
    item.append(
      createElement("p", details.join(" · "))
    );
  }

  const shareButton = createElement(
    "button",
    "Compartir invitación"
  );

  shareButton.type = "button";

  shareButton.addEventListener("click", async () => {
    const invitation = getInvitationUrl();

    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: "Únete a Nova Apps",
          text: "Te invito a conocer Nova Apps.",
          url: invitation
        });

        message(
          contactsStatus,
          "Se abrió el sistema para compartir la invitación."
        );
      } else {
        await copyText(invitation);

        message(
          contactsStatus,
          "Enlace copiado. Envíalo al contacto mediante tu aplicación de mensajería."
        );
      }
    } catch (error) {
      if (error.name === "AbortError") return;

      message(
        contactsStatus,
        error.message || "No se pudo preparar la invitación."
      );
    }
  });

  item.append(shareButton);
  list.append(item);
}

container.append(heading, explanation, list);

}

async function selectContacts() {
if (!("contacts" in navigator) ||
typeof navigator.contacts.select !== "function") {
message(
contactsStatus,
"Este navegador no admite la selección de contactos. Puedes copiar el enlace de invitación y enviarlo manualmente."
);

  return;
}

try {
  const supported = typeof navigator.contacts.getProperties === "function"
    ? await navigator.contacts.getProperties()
    : ["name", "email", "tel"];

  const properties = ["name"];

  if (supported.includes("email")) {
    properties.push("email");
  }

  if (supported.includes("tel")) {
    properties.push("tel");
  }

  const contacts = await navigator.contacts.select(
    properties,
    { multiple: true }
  );

  selectedContacts = Array.isArray(contacts)
    ? contacts
    : [];

  renderSelectedContacts(selectedContacts);

  message(
    contactsStatus,
    selectedContacts.length
      ? "Has seleccionado " + selectedContacts.length +
        " contacto(s). No se han guardado ni enviado a un servidor."
      : "No se seleccionaron contactos."
  );
} catch (error) {
  if (error.name === "AbortError") {
    message(
      contactsStatus,
      "Cancelaste la selección de contactos."
    );

    return;
  }

  message(
    contactsStatus,
    error.message ||
      "No se pudieron seleccionar los contactos. Puedes compartir el enlace manualmente."
  );
}

}

function showConnectionPending(container, text) {
container.replaceChildren(
createElement("p", text, "friends-empty")
);
}

function searchUsers(event) {
event.preventDefault();

const query = searchInput.value.trim();

searchResults.replaceChildren();

if (!query) {
  searchResults.append(
    createElement(
      "p",
      "Escribe un nombre o usuario para buscar.",
      "friends-empty"
    )
  );

  return;
}

searchResults.append(
  createElement(
    "p",
    "La búsqueda de usuarios requiere conectar Supabase y definir las tablas de perfiles y amistades. Todavía no se ha enviado ninguna búsqueda al servidor.",
    "friends-empty"
  )
);

}

function initialize() {
prepareInvitation();

copyButton.addEventListener(
  "click",
  copyInvitation
);

contactButton.addEventListener(
  "click",
  selectContacts
);

searchForm.addEventListener(
  "submit",
  searchUsers
);

showConnectionPending(
  $("friendsList"),
  "La lista de amigos se cargará al conectar el servicio de amistades."
);

showConnectionPending(
  $("receivedRequests"),
  "Las solicitudes recibidas se cargarán al conectar el servicio."
);

showConnectionPending(
  $("sentRequests"),
  "Las solicitudes enviadas se cargarán al conectar el servicio."
);

showConnectionPending(
  $("invitedContacts"),
  "El historial de invitaciones requiere almacenamiento en el servidor."
);

message(
  status,
  "Enlaces de invitación preparados. Las amistades, solicitudes e invitaciones registradas se conectarán posteriormente con Supabase."
);

}

initialize();
})();