# NOVA Apps — pasos pendientes de Supabase

Este paquete deja integrado el frontend y las funciones locales. **No significa que el backend esté desplegado ni que se haya probado en tu proyecto Supabase.** Las partes que necesitan infraestructura se indican abajo.

## 1. Publicar la web desde GitHub

1. Descomprime el ZIP en el teléfono.
2. Sube los archivos y carpetas a la raíz del repositorio `Cumba35/Nova-APPS` conservando la estructura.
3. En GitHub, abre **Settings → Pages** y confirma la rama/carpeta que publica la web.
4. Abre la página publicada por HTTPS. La bóveda usa Web Crypto, IndexedDB y requiere un origen seguro.

## 2. Comprobar inicio de sesión Google

En Supabase → Authentication → URL Configuration, agrega el dominio de GitHub Pages como Site URL/Redirect URL, por ejemplo `https://cumba35.github.io/Nova-APPS/**` y la URL exacta que uses para el callback si tu configuración lo requiere. Conserva el proveedor Google ya habilitado.

## 3. Bóveda cifrada local

En **Cuenta → Mi espacio privado**, crea una contraseña maestra de al menos 10 caracteres y guárdala de forma segura. Si la pierdes, no hay recuperación de contraseñas guardadas. Exporta periódicamente el archivo `.novapv`; el archivo exportado contiene los registros cifrados, pero debe mantenerse privado.

## 4. Copia cifrada en Supabase (opcional, no conectada todavía)

1. En Supabase → SQL Editor, ejecuta `supabase/migrations/20261022_nova_vault_encrypted.sql`.
2. Esa tabla solo permite a cada usuario autenticado acceder a su propia fila y está diseñada para recibir **un paquete ya cifrado por el navegador**.
3. La sincronización automática no está activada en esta entrega. Antes de habilitarla hay que integrar botones de copia/restauración que usen la sesión autenticada de Supabase y envíen únicamente el archivo cifrado; nunca envíes la contraseña maestra ni credenciales descifradas.
4. No habilites políticas públicas ni guardes contraseñas en texto plano.

## 5. NOVA IA

La web llama a la URL `NOVA_IA_ENDPOINT` definida al principio del script de `index.html`. Debe apuntar a una Supabase Edge Function desplegada, con `GEMINI_API_KEY` configurada en **Supabase → Edge Functions → Secrets**. No pongas la clave Gemini en HTML, JavaScript público, GitHub ni en este ZIP.

La Edge Function debe validar entrada, aplicar límites de uso y devolver JSON con `answer`, `text` o `response`. En la web se bloquean consultas que parecen pedir contraseñas y se muestran recordatorios locales, sin enviarlos a la IA. Eso es una protección del cliente; para seguridad completa, no permitas que la IA acceda a tablas de credenciales.

## 6. Funciones que siguen necesitando backend/configuración

- **Permisos de archivos:** `js/nova/permisos-archivos.js` espera la Edge Function `nova-permisos-archivos`.
- **Suscripciones:** `js/nova/suscripciones.js` espera `nova-suscripciones`. No procesa pagos reales por sí solo.
- **Deportes:** `js/deportes/deportes.js` espera `nova-deportes`; no inventa resultados si el servidor no responde.
- **Sincronización de bóveda:** requiere el flujo de subida/restauración cifrada descrito arriba.
- **Notificaciones cuando el navegador está cerrado:** no están garantizadas con una página estática. Las notificaciones locales solo se revisan mientras la página permanece abierta y el navegador permite ejecutarlas.
- **Memoria y archivos:** el navegador local no equivale a una base de datos online ni sincroniza entre dispositivos automáticamente.

## 7. Prueba de aceptación recomendada

1. Abrir `index.html` publicado y comprobar catálogo e inicio de sesión.
2. Abrir **Mi espacio privado**, crear un recordatorio, exportar/importar `.nova.ev`.
3. Crear la bóveda, guardar una credencial de prueba, bloquear y desbloquear; exportar `.novapv`, importarlo y comprobar que la contraseña maestra permite descifrarla.
4. Confirmar en la pestaña Network del navegador que las credenciales nunca se mandan a la Edge Function.
5. Probar NOVA IA solo después de confirmar el despliegue de su Edge Function.


## 8. Desplegar la función NOVA IA incluida en el ZIP

El código inicial está en `supabase/functions/nova-ia/index.ts`. Para desplegarla necesitas Supabase CLI (por ejemplo, desde un entorno con terminal; GitHub web por sí solo no ejecuta funciones):

1. Vincula el directorio al proyecto correcto con `supabase link --project-ref suirbghmnuxixktzkrze`.
2. Configura el secreto con `supabase secrets set GEMINI_API_KEY=TU_CLAVE_REAL` (no lo pegues en HTML ni en el chat). Opcionalmente configura `GEMINI_MODEL`.
3. Despliega con `supabase functions deploy nova-ia --no-verify-jwt` si deseas que el chat público funcione sin sesión; la función valida entrada y bloquea consultas de credenciales, pero para producción agrega límites de uso/abuso. Si exiges sesión, elimina `--no-verify-jwt` y adapta el flujo de frontend para enviar una sesión válida.
4. Prueba primero con consultas no sensibles y revisa logs y límites de uso.

**No desplegadas en este paquete:** `nova-permisos-archivos`, `nova-suscripciones` y `nova-deportes`. Sus módulos no conceden permisos ni procesan pagos por sí solos. No simules autorización ni resultados.
