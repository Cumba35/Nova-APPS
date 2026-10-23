
/*
 * NOVA APPS
 * Archivo: js/auth/session.js
 *
 * Cliente central de Supabase, autenticación Google
 * y consultas de permisos del usuario.
 *
 * IMPORTANTE:
 * La autorización definitiva debe aplicarse también
 * mediante políticas RLS en Supabase.
 */

import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

/* =========================================
   1. CONFIGURACIÓN
   ========================================= */

export const SUPABASE_URL =
  "https://suirbghmnuxixktzkrze.supabase.co";

export const SUPABASE_KEY =
  "sb_publishable_1ZmYJ5J-A8hGDIcUIOiY3g_dYOKdnIp";

export const OWNER_UID =
  "e2b76b60-09b4-4e01-a93f-00c9bd7e257e";

export const TABLA_ROLES = "nova_user_roles";

/*
 * No colocar aquí claves secretas, service_role
 * ni claves privadas de proveedores de IA.
 */

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

/* =========================================
   2. OBTENER SESIÓN Y USUARIO
   ========================================= */

export async function obtenerSesion() {
  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export async function obtenerUsuario() {
  const { data, error } =
    await supabase.auth.getUser();

  if (error) {
    if (error.name === "AuthSessionMissingError") {
      return null;
    }

    if (error.status === 401) {
      return null;
    }

    throw error;
  }

  return data.user || null;
}

export async function haySesion() {
  const sesion = await obtenerSesion();
  return Boolean(sesion?.user);
}

/* =========================================
   3. INICIAR SESIÓN CON GOOGLE
   ========================================= */

export async function iniciarSesionGoogle() {
  const redirectTo =
    window.location.origin +
    window.location.pathname;

  const { data, error } =
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo
      }
    });

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================
   4. CERRAR SESIÓN
   ========================================= */

export async function cerrarSesion() {
  const { error } =
    await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  return true;
}

/* =========================================
   5. NORMALIZAR RANGOS
   ========================================= */

export function normalizarRol(rol) {
  if (typeof rol !== "string") {
    return "visitante";
  }

  const limpio = rol
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const equivalencias = {
    propietario: "propietario",
    owner: "propietario",

    admin: "administrador",
    administrador: "administrador",

    inspectores: "inspectores",
    inspector: "inspectores",

    "usuario vip": "usuario_vip",
    usuario_vip: "usuario_vip",

    usuario: "usuario",
    visitante: "visitante"
  };

  return equivalencias[limpio] || "visitante";
}

/* =========================================
   6. CONSULTAR ROL EN SUPABASE
   ========================================= */

export async function obtenerRol(userId = null) {
  const usuario = await obtenerUsuario();

  if (!usuario) {
    return "visitante";
  }

  const idConsultado = userId || usuario.id;

  /*
   * Un usuario normal solo puede consultar su propio rol.
   * La RLS debe reforzar esta restricción.
   */
  if (
    idConsultado !== usuario.id &&
    usuario.id !== OWNER_UID
  ) {
    throw new Error(
      "No tienes permiso para consultar este usuario."
    );
  }

  /*
   * El propietario se identifica por su UID configurado.
   * La base de datos también debe proteger las operaciones.
   */
  if (usuario.id === OWNER_UID) {
    return "propietario";
  }

  const { data, error } = await supabase
    .from(TABLA_ROLES)
    .select("role")
    .eq("user_id", idConsultado)
    .maybeSingle();

  if (error) {
    console.error(
      "Nova Apps: no se pudo consultar el rol.",
      error.message
    );

    throw new Error(
      "No se pudo verificar tu rango en Supabase."
    );
  }

  if (!data || !data.role) {
    return "visitante";
  }

  return normalizarRol(data.role);
}

/* =========================================
   7. COMPROBAR PERMISOS
   ========================================= */

export async function esPropietario() {
  const usuario = await obtenerUsuario();

  return Boolean(
    usuario && usuario.id === OWNER_UID
  );
}

export async function esAdministrador() {
  const rol = await obtenerRol();

  return [
    "propietario",
    "administrador"
  ].includes(rol);
}

export async function puedeGestionarInspectores() {
  /*
   * Solo Propietario y Administrador pueden
   * administrar los registros de inspectores.
   */
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
      rol: "visitante",
      propietario: false,
      administrador: false,
      gestionarInspectores: false
    };
  }

  const rol = await obtenerRol();

  const administrativo = [
    "propietario",
    "administrador"
  ].includes(rol);

  return {
    autenticado: true,
    usuarioId: usuario.id,
    rol,
    propietario: rol === "propietario",
    administrador: administrativo,
    gestionarInspectores: administrativo
  };
}

/* =========================================
   8. OBSERVAR CAMBIOS DE SESIÓN
   ========================================= */

export function observarSesion(callback) {
  if (typeof callback !== "function") {
    throw new TypeError(
      "Debes proporcionar una función callback."
    );
  }

  const { data } =
    supabase.auth.onAuthStateChange(
      (evento, sesion) => {
        /*
         * No ejecutar consultas Supabase adicionales
         * directamente dentro de este callback.
         */
        try {
          callback({
            evento,
            sesion,
            usuario: sesion?.user || null
          });
        } catch (error) {
          console.error(
            "Nova Apps: error al procesar la sesión.",
            error
          );
        }
      }
    );

  return function dejarDeObservar() {
    data.subscription.unsubscribe();
  };
}

/* =========================================
   9. VERIFICAR CONEXIÓN
   ========================================= */

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
    return {
      correcto: false,
      mensaje: "Error de conexión con Supabase."
    };
  }
}

/* =========================================
   10. EXPORTACIÓN DEL MÓDULO
   ========================================= */

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
