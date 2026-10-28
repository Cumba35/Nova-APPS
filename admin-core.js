import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL =
  "https://suirbghmnuxixktzkrze.supabase.co";

export const SUPABASE_KEY =
  "sb_publishable_1ZmYJ5J-A8hGDIcUIOiY3g_dYOKdnIp";

export const ADMIN_UID =
  "e2b76b60-09b4-4e01-a93f-00c9bd7e257e";

export const RANKS = [
  "Propietario",
  "Administrador",
  "Inspectores",
  "Usuario VIP",
  "Usuario",
  "Visitante"
];

export const RANK_ASSETS = {
  Propietario: {
    file: "rango_propietario.png",
    className: "rank-owner"
  },
  Administrador: {
    file: "rango_administrador.png",
    className: "rank-admin"
  },
  Inspectores: {
    file: "rango_inspector.png",
    className: "rank-inspector"
  },
  "Usuario VIP": {
    file: "rango_vip.png",
    className: "rank-vip"
  },
  Usuario: {
    file: "rango_usuario.png",
    className: "rank-user"
  },
  Visitante: {
    file: "rango_usuario.png",
    className: "rank-visitor"
  }
};

export const RANK_ICON_BASE =
  "https://cumba35.github.io/Nova-APPS/";

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

export const $ = selector =>
  document.querySelector(selector);

export function say(text) {
  const element = $("#message");

  if (element) {
    element.textContent = String(text ?? "");
  }
}

export function safeUrl(value) {
  try {
    const url = new URL(value);

    return url.protocol === "https:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export function setupAuth() {
  const loginButton = $("#loginBtn");
  const logoutButton = $("#logoutBtn");

  if (loginButton && !loginButton.dataset.authBound) {
    loginButton.dataset.authBound = "true";

    loginButton.addEventListener("click", async () => {
      loginButton.disabled = true;
      say("Conectando con Google...");

      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.href.split("#")[0]
          }
        });

        if (error) {
          say("Error de inicio de sesión: " + error.message);
          loginButton.disabled = false;
        }
      } catch (error) {
        console.error("Error al iniciar sesión:", error);
        say("No se pudo iniciar sesión. Inténtalo de nuevo.");
        loginButton.disabled = false;
      }
    });
  }

  if (logoutButton && !logoutButton.dataset.authBound) {
    logoutButton.dataset.authBound = "true";

    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;

      try {
        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }

        window.location.href = "./admin.html";
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        say("No se pudo cerrar la sesión.");
        logoutButton.disabled = false;
      }
    });
  }
}

export async function guardPage() {
  const login = $("#login");
  const panel = $("#panel");

  if (login) login.classList.add("hidden");
  if (panel) panel.classList.add("hidden");

  say("Verificando autorización...");

  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      if (login) login.classList.remove("hidden");

      say("Inicia sesión con la cuenta autorizada.");
      return false;
    }

    const user = data.user;

    if (user.id !== ADMIN_UID) {
      await supabase.auth.signOut();

      if (login) login.classList.remove("hidden");

      say("Acceso denegado: esta cuenta no está autorizada.");
      return false;
    }

    if (login) login.classList.add("hidden");
    if (panel) panel.classList.remove("hidden");

    const account = $("#account");

    if (account) {
      account.textContent =
        "Sesión autorizada: " +
        (user.email || "administrador");
    }

    say("Acceso autorizado.");
    return true;
  } catch (error) {
    console.error("Error al verificar permisos:", error);

    if (login) login.classList.remove("hidden");

    say("No se pudo verificar la autorización. Comprueba la conexión.");
    return false;
  }
}