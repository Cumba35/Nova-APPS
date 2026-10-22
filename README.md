# NOVA Apps — paquete integrado

Este ZIP contiene el sitio estático, paneles de administración existentes, módulos JavaScript, iconos/rangos, página privada, recordatorios locales, bóveda cifrada y archivos de configuración de Supabase.

## Funciona en el navegador (HTTPS)
- Catálogo del sitio y módulos de interfaz existentes.
- Página **Mi espacio privado**: recordatorios locales, exportación/importación `.nova.ev`, permiso de notificaciones mientras la página permanece abierta, bóveda con cifrado AES-GCM y derivación PBKDF2, exportación/importación cifrada `.novapv`.
- El chat no remite a la IA las consultas que parecen solicitar contraseñas/credenciales y puede mostrar los recordatorios locales.
- Los logos usan rutas relativas del repositorio.

## Necesita configuración externa antes de considerarse producción
- Inicio de sesión y catálogo online: credenciales públicas válidas, URLs de redirección y políticas de Supabase.
- NOVA IA: desplegar `supabase/functions/nova-ia` y guardar `GEMINI_API_KEY` en Supabase Secrets. La clave no debe ir en el frontend. La cuota gratuita depende de las condiciones vigentes del proveedor.
- Bóveda online: la migración crea una tabla para paquetes cifrados, pero la sincronización automática todavía no está conectada.
- Permisos avanzados de archivos, suscripciones y deportes: los módulos frontend están presentes; las funciones servidor `nova-permisos-archivos`, `nova-suscripciones` y `nova-deportes` todavía deben implementarse y desplegarse. Los pagos requieren proveedor externo; no se procesa dinero en este paquete.
- Los recordatorios no generan avisos fiables con el navegador cerrado.

## Instalación rápida
1. Haz una copia del repositorio actual antes de reemplazar archivos.
2. Descomprime este ZIP y sube el contenido (los archivos directamente, no una carpeta anidada) a la raíz de `Cumba35/Nova-APPS`.
3. En GitHub, revisa **Settings → Pages** y publica la rama/carpeta correcta.
4. Ejecuta en Supabase SQL Editor `supabase/migrations/20261022_nova_vault_encrypted.sql`.
5. Despliega NOVA IA siguiendo `SUPABASE-PASOS.md`; no publiques secretos.
6. Prueba las funciones de frontend con datos ficticios antes de guardar información real.

## Importante
No se ha publicado automáticamente el repositorio ni se ha desplegado ninguna función en tu cuenta. Este paquete no debe describirse como un backend de producción completo hasta terminar las tareas marcadas arriba y probar RLS, autenticación, cuotas y seguridad. No guardes contraseñas bancarias importantes hasta que hayas probado el cifrado, exportación y restauración en el navegador objetivo.
