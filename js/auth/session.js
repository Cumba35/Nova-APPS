/*
 * NOVA APPS
 * Archivo: js/auth/session.js
 * Autenticación, sesión y permisos.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL =
  "https://suirbghmnuxixktzkrze.supabase.co";

export const SUPABASE_KEY =
  "sb_publishable_1ZmYJ5J-A8hGDIcUIOiY3g_dYOKdnIp";

export const OWNER_UID =
  "e2b76b60-09b4-4e01-a93f-00c9bd7e257e";

export const TABLA_ROLES = "nova_user_roles";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce"
    }
  }
);

export async function obtenerSesion() {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  return data.session ?? null;
}

export async function obtenerUsuario() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (
      error.name === "AuthSessionMissingError" ||
      error.status === 401
    ) {
      return null;
    }

    throw error;
  }

  return data.user ?? null;
}

export async function haySesion() {
  const sesion = await obtenerSesion();
  return Boolean(sesion?.user);
}

export async function iniciarSesionGoogle() {
  const redirectTo =
    window.location.origin +
    window.location.pathname +
    window.location.search;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo }
  });

  if (error) throw error;

  return data;
}

export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;

  return true;
}

export function normalizarRol(rol) {
  if (typeof rol !== "string") {
    return "visitante";
  }

  const limpio = rol
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-\s]+/g, "_");

  const equivalencias = {
    propietario: "propietario",
    owner: "propietario",
    admin: "administrador",
    administrador: "administrador",
    inspector: "inspectores",
    inspectores: "inspectores",
    usuario_vip: "usuario_vip",
    usuario: "usuario",
    visitante: "visitante"
  };

  return equivalencias[limpio] || "visitante";
}

export async function obtenerRol(userId = null) {
  const usuario = await obtenerUsuario();

  if (!usuario) {
    return "visitante";
  }

  const idConsultado = userId || usuario.id;

  if (
    idConsultado !== usuario.id &&
    usuario.id !== OWNER_UID
  ) {
    throw new Error(
      "No tienes permiso para consultar el rango de esta cuenta."
    );
  }

  if (idConsultado === OWNER_UID) {
    return "propietario";
  }

  const { data, error } = await supabase
    .from(TABLA_ROLES)
    .select("role")
    .eq("user_id", idConsultado)
    .maybeSingle();

  if (error) {
    console.error(
      "Nova Apps: error al consultar el rango.",
      error.message
    );

    throw new Error(
      "No se pudo verificar el rango en Supabase."
    );
  }

  return normalizarRol(data?.role);
}

export async function esPropietario() {
  const usuario = await obtenerUsuario();

  return Boolean(usuario && usuario.id === OWNER_UID);
}

export async function esAdministrador() {
  const rol = await obtenerRol();

  return ["propietario", "administrador"].includes(rol);
}

export async function puedeGestionarInspectores() {
  return esAdministrador();
}

export async function esInspector() {
  const rol = await obtenerRol();

  return [
    "propietario",
    "administrador",
    "inspectores"
  ].includes(rol);
}

export async function obtenerPermisos() {
  const usuario = await obtenerUsuario();

  if (!usuario) {
    return {
      autenticado: false,
      usuarioId: null,
      rol: "visitante",
      propietario: false,
      administrador: false,
      gestionarInspectores: false,
      inspector: false
    };
  }

  const rol = await obtenerRol();

  const propietario = rol === "propietario";
  const administrador = [
    "propietario",
    "administrador"
  ].includes(rol);

  return {
    autenticado: true,
    usuarioId: usuario.id,
    rol,
    propietario,
    administrador,
    gestionarInspectores: administrador,
    inspector: [
      "propietario",
      "administrador",
      "inspectores"
    ].includes(rol)
  };
}

export function observarSesion(callback) {
  if (typeof callback !== "function") {
    throw new TypeError(
      "Debes proporcionar una función callback."
    );
  }

  const { data } = supabase.auth.onAuthStateChange(
    (evento, sesion) => {
      try {
        callback({
          evento,
          sesion,
          usuario: sesion?.user ?? null
        });
      } catch (error) {
        console.error(
          "Nova Apps: error al procesar el cambio de sesión.",
          error
        );
      }
    }
  );

  return () => {
    data.subscription.unsubscribe();
  };
}

export async function comprobarConexion() {
  try {
    const { error } = await supabase.auth.getSession();

    if (error) {
      return {
        correcto: false,
        mensaje: "No se pudo comprobar la sesión."
      };
    }

    return {
      correcto: true,
      mensaje: "Cliente Supabase disponible."
    };
  } catch (error) {
    console.error("Error de conexión con Supabase:", error);

    return {
      correcto: false,
      mensaje: "Error de conexión con Supabase."
    };
  }
}

export default Object.freeze({
  supabase,
  obtenerSesion,
  obtenerUsuario,
  haySesion,
  iniciarSesionGoogle,
  cerrarSesion,
  obtenerRol,
  normalizarRol,
  esPropietario,
  esAdministrador,
  esInspector,
  puedeGestionarInspectores,
  obtenerPermisos,
  observarSesion,
  comprobarConexion
});