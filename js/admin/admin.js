/**

* NOVA Apps — Autorización administrativa
* Archivo: js/admin/admin.js
* 
* Comprueba los permisos mediante Supabase.
* La seguridad definitiva también debe aplicarse
* mediante políticas RLS y validaciones del servidor.
  */

"use strict";

const TABLA_ROLES_ADMIN = "nova_user_roles";

const RANGOS_ADMINISTRATIVOS = new Set([
"admin",
"administrador"
]);

/**

* Normaliza el nombre del rol.
  */
  function normalizarRol(rol) {
  return String(rol ?? "")
  .trim()
  .toLowerCase();
  }

/**

* Obtiene el usuario autenticado.
  */
  export async function obtenerUsuarioAutenticado(db) {
  if (!db) {
  throw new Error("El cliente Supabase no está disponible.");
  }

const { data, error } = await db.auth.getUser();

if (error) {
throw error;
}

return data.user ?? null;
}

/**

* Consulta el rol de un usuario en nova_user_roles.
  */
  export async function obtenerRolUsuario(db, userId) {
  if (!db) {
  throw new Error("El cliente Supabase no está disponible.");
  }

if (!userId) {
return null;
}

const { data, error } = await db
.from(TABLA_ROLES_ADMIN)
.select("role")
.eq("user_id", userId)
.maybeSingle();

if (error) {
throw new Error(
"No se pudo verificar el rol: " + error.message
);
}

return data?.role
? normalizarRol(data.role)
: null;
}

/**

* Comprueba si un usuario es administrador.
  */
  export async function esAdministrador(db, userId = null) {
  const usuario = userId
  ? { id: userId }
  : await obtenerUsuarioAutenticado(db);

if (!usuario?.id) {
return false;
}

const rol = await obtenerRolUsuario(db, usuario.id);

return RANGOS_ADMINISTRATIVOS.has(rol);
}

/**

* Comprueba si el usuario actual es administrador.
  */
  export async function comprobarAdministrador(db) {
  const usuario = await obtenerUsuarioAutenticado(db);

if (!usuario) {
return {
autorizado: false,
usuario: null,
rol: null,
mensaje: "Debes iniciar sesión para acceder."
};
}

const rol = await obtenerRolUsuario(db, usuario.id);
const autorizado = RANGOS_ADMINISTRATIVOS.has(rol);

return {
autorizado,
usuario,
rol,
mensaje: autorizado
? "Acceso administrativo autorizado."
: "Tu cuenta no tiene permisos de administrador."
};
}

/**

* Protege una sección de la interfaz.
* 
* Esto controla la interfaz, pero no sustituye
* la autorización de las operaciones en el servidor.
  */
  export async function protegerPanelAdmin(
  db,
  opciones = {}
  ) {
  const {
  selector = "[data-admin-only]",
  ocultarNoAutorizado = true,
  alResultado = () => {}
  } = opciones;

const elementos = document.querySelectorAll(selector);
const resultado = await comprobarAdministrador(db);

elementos.forEach((elemento) => {
if (ocultarNoAutorizado) {
elemento.hidden = !resultado.autorizado;
}

elemento.setAttribute(
  "aria-hidden",
  String(!resultado.autorizado)
);

});

alResultado(resultado);

return resultado;
}

/**

* Registra una comprobación de permisos para
* cada cambio de sesión de Supabase.
  */
  export function observarPermisosAdmin(db, alResultado) {
  if (!db) {
  throw new Error("El cliente Supabase no está disponible.");
  }

if (typeof alResultado !== "function") {
throw new Error(
"Debes proporcionar una función para recibir el resultado."
);
}

const {
data: { subscription }
} = db.auth.onAuthStateChange(async () => {
try {
const resultado = await comprobarAdministrador(db);
alResultado(resultado);
} catch (error) {
alResultado({
autorizado: false,
usuario: null,
rol: null,
mensaje: error.message
});
}
});

return () => subscription.unsubscribe();
}