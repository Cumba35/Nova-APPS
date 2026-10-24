
/*
 * NOVA APPS — Gestor de archivos
 * Ruta: js/nova/gestor-archivos.js
 *
 * Selección, lectura y descarga de archivos en el navegador.
 * No envía archivos a servidores.
 *
 * API pública: window.NovaArchivos
 */

(function () {
  "use strict";

  const MAX_TEXTO_BYTES = 2 * 1024 * 1024;
  const MAX_DESCARGA_BYTES = 10 * 1024 * 1024;
  const MAX_NOMBRE = 180;

  function validarArchivo(archivo) {
    if (
      typeof File === "undefined" ||
      !(archivo instanceof File)
    ) {
      throw new Error("Debes seleccionar un archivo válido.");
    }

    return archivo;
  }

  function validarNombre(nombre) {
    if (typeof nombre !== "string") {
      throw new Error("El nombre debe ser un texto.");
    }

    const limpio = nombre.trim();

    if (!limpio) {
      throw new Error("Indica un nombre de archivo.");
    }

    if (limpio.length > MAX_NOMBRE) {
      throw new Error("El nombre del archivo es demasiado largo.");
    }

    if (/[/\\\u0000-\u001F\u007F]/.test(limpio)) {
      throw new Error(
        "El nombre contiene caracteres no permitidos."
      );
    }

    if (limpio === "." || limpio === "..") {
      throw new Error("El nombre del archivo no es válido.");
    }

    return limpio;
  }

  function obtenerInformacion(archivo) {
    validarArchivo(archivo);

    return {
      nombre: archivo.name,
      tipo: archivo.type || "Desconocido",
      tamanoBytes: archivo.size,
      tamano: formatearTamano(archivo.size),
      modificado: archivo.lastModified
        ? new Date(archivo.lastModified).toISOString()
        : null
    };
  }

  function seleccionarArchivos(opciones) {
    const ajustes = opciones || {};

    if (
      ajustes.accept !== undefined &&
      typeof ajustes.accept !== "string"
    ) {
      return Promise.reject(
        new Error("El filtro de archivos no es válido.")
      );
    }

    return new Promise(function (resolve, reject) {
      let selector;

      try {
        selector = document.createElement("input");
        selector.type = "file";
        selector.multiple = ajustes.multiple === true;

        if (ajustes.accept) {
          selector.accept = ajustes.accept;
        }

        let resuelto = false;

        function finalizar(archivos) {
          if (resuelto) return;
          resuelto = true;
          resolve(archivos);
        }

        selector.addEventListener("change", function () {
          finalizar(Array.from(selector.files || []));
        }, { once: true });

        selector.addEventListener("cancel", function () {
          finalizar([]);
        }, { once: true });

        // El selector debe abrirse como consecuencia de una
        // acción del usuario, por ejemplo, pulsar un botón.
        selector.click();
      } catch (error) {
        reject(
          new Error(
            "No se pudo abrir el selector de archivos."
          )
        );
      }
    });
  }

  async function leerTexto(archivo) {
    validarArchivo(archivo);

    if (archivo.size > MAX_TEXTO_BYTES) {
      throw new Error(
        "El archivo supera el límite de lectura de 2 MB."
      );
    }

    try {
      return await archivo.text();
    } catch {
      throw new Error(
        "No se pudo leer el archivo seleccionado."
      );
    }
  }

  async function leerJSON(archivo) {
    const texto = await leerTexto(archivo);

    try {
      return JSON.parse(texto);
    } catch {
      throw new Error(
        "El archivo no contiene JSON válido."
      );
    }
  }

  function descargarTexto(nombre, contenido, tipo) {
    const nombreFinal = validarNombre(nombre);

    if (contenido === undefined || contenido === null) {
      throw new Error("No hay contenido para descargar.");
    }

    let texto;

    if (typeof contenido === "string") {
      texto = contenido;
    } else {
      try {
        texto = JSON.stringify(contenido, null, 2);
      } catch {
        throw new Error(
          "El contenido no se puede convertir a texto."
        );
      }
    }

    if (typeof texto !== "string") {
      throw new Error(
        "No se pudo preparar el contenido de la descarga."
      );
    }

    const bytes = new TextEncoder().encode(texto).length;

    if (bytes > MAX_DESCARGA_BYTES) {
      throw new Error(
        "La descarga supera el límite de 10 MB."
      );
    }

    const blob = new Blob(
      [texto],
      {
        type: tipo || "text/plain;charset=utf-8"
      }
    );

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    try {
      enlace.href = url;
      enlace.download = nombreFinal;
      enlace.hidden = true;
      enlace.rel = "noopener";

      document.body.appendChild(enlace);
      enlace.click();

      return true;
    } catch {
      throw new Error(
        "El navegador no pudo iniciar la descarga."
      );
    } finally {
      enlace.remove();

      // Retrasar la revocación para dar tiempo al navegador.
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1500);
    }
  }

  function formatearTamano(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) {
      return "Tamaño desconocido";
    }

    if (bytes < 1024) {
      return bytes + " B";
    }

    const unidades = ["KB", "MB", "GB", "TB"];
    let tamano = bytes / 1024;
    let indice = 0;

    while (
      tamano >= 1024 &&
      indice < unidades.length - 1
    ) {
      tamano /= 1024;
      indice++;
    }

    return tamano.toFixed(2) + " " + unidades[indice];
  }

  function esTipoPermitido(archivo, tipos) {
    validarArchivo(archivo);

    if (!Array.isArray(tipos) || tipos.length === 0) {
      return false;
    }

    const nombre = archivo.name.toLowerCase();
    const mime = (archivo.type || "").toLowerCase();

    return tipos.some(function (tipo) {
      if (typeof tipo !== "string") return false;

      const esperado = tipo.trim().toLowerCase();

      if (!esperado) return false;

      if (esperado.startsWith(".")) {
        return nombre.endsWith(esperado);
      }

      if (esperado.endsWith("/*")) {
        return mime.startsWith(esperado.slice(0, -1));
      }

      return mime === esperado;
    });
  }

  window.NovaArchivos = Object.freeze({
    seleccionarArchivos: seleccionarArchivos,
    obtenerInformacion: obtenerInformacion,
    leerTexto: leerTexto,
    leerJSON: leerJSON,
    descargarTexto: descargarTexto,
    formatearTamano: formatearTamano,
    esTipoPermitido: esTipoPermitido
  });
})();
