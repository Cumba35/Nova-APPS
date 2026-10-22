
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL =
  'https://suirbghmnuxixktzkrze.supabase.co';

export const SUPABASE_KEY =
  'sb_publishable_1ZmYJ5J-A8jGDIcUIOiY3g_dYOKdnIp';

export const ADMIN_UID =
  'e2b76b60-09b4-4e01-a93f-00c9bd7e257e';

export const RANKS = [
  'Propietario',
  'Administrador',
  'Inspectores',
  'Usuario VIP',
  'Usuario',
  'Visitante'
];

export const RANK_ASSETS = {
  'Propietario': {
    file: 'rango_propietario.png',
    className: 'rank-owner'
  },
  'Administrador': {
    file: 'rango_administrador.png',
    className: 'rank-admin'
  },
  'Inspectores': {
    file: 'rango_inspector.png',
    className: 'rank-inspector'
  },
  'Usuario VIP': {
    file: 'rango_vip.png',
    className: 'rank-vip'
  },
  'Usuario': {
    file: 'rango_usuario.png',
    className: 'rank-user'
  },
  'Visitante': {
    file: 'rango_usuario.png',
    className: 'rank-visitor'
  }
};

export const RANK_ICON_BASE =
  'https://cumba35.github.io/Nova-APPS/';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export const $ = selector =>
  document.querySelector(selector);

export function say(text) {
  const el = $('#message');
  if (el) el.textContent = text;
}

export function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export function setupAuth() {
  $('#loginBtn')?.addEventListener('click', async () => {
    const { error } =
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: location.href.split('#')[0]
        }
      });

    if (error) {
      say('Error de inicio de sesión: ' + error.message);
    }
  });

  $('#logoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.href = './admin.html';
  });
}

export async function guardPage() {
  const login = $('#login');
  const panel = $('#panel');

  const { data, error } =
    await supabase.auth.getUser();

  if (error || !data.user) {
    login?.classList.remove('hidden');
    panel?.classList.add('hidden');
    say('Inicia sesión con Google para continuar.');
    return false;
  }

  if (data.user.id !== ADMIN_UID) {
    await supabase.auth.signOut();

    login?.classList.remove('hidden');
    panel?.classList.add('hidden');

    say('Acceso denegado: esta cuenta no es administradora.');
    return false;
  }

  login?.classList.add('hidden');
  panel?.classList.remove('hidden');

  const account = $('#account');

  if (account) {
    account.textContent =
      'Sesión autorizada: ' +
      (data.user.email || 'administrador');
  }

  return true;
}
