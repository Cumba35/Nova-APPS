Ruta: "js/nova/gestor-archivos.js"

(function () {
  "use strict";

  const MAX_TEXTO_BYTES = 2 * 1024 * 1024;

  function validarArchivo(archivo) {
    if (!(archivo instanceof File)) {
      throw new Error("Debes seleccionar un archivo válido.");
    }

    return archivo;
  }

  function obtenerInformacion(archivo) {
    validarArchivo(archivo);

    return {
      nombre: archivo.name,
      tipo: archivo.type || "Desconocido",
      tamanoBytes: archivo.size,
      modificado: archivo.lastModified
        ? new Date(archivo.lastModified).toISOString()
        : null
    };
  }

  function seleccionarArchivos(opciones) {
    opciones = opciones || {};

    return new Promise(function (resolve) {
      const selector = document.createElement("input");

      selector.type = "file";
      selector.multiple = opciones.multiple === true;

      if (opciones.accept) {
        selector.accept = opciones.accept;
      }

      selector.addEventListener("change", function () {
        resolve(Array.from(selector.files || []));
      }, { once: true });

      // Algunos navegadores no disparan change si se cancela.
      // El usuario puede cancelar sin que se lean archivos.
      selector.addEventListener("cancel", function () {
        resolve([]);
      }, { once: true });

      selector.click();
    });
  }

  async function leerTexto(archivo) {
    validarArchivo(archivo);

    if (archivo.size > MAX_TEXTO_BYTES) {
      throw new Error(
        "El archivo supera el límite de lectura de 2 MB."
      );
    }

    return await archivo.text();
  }

  function descargarTexto(nombre, contenido, tipo) {
    if (typeof nombre !== "string" || !nombre.trim()) {
      throw new Error("Indica un nombre de archivo.");
    }

    const blob = new Blob(
      [String(contenido)],
      { type: tipo || "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = nombre.trim();
    enlace.hidden = true;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);

    return true;
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

    while (tamano >= 1024 && indice < unidades.length - 1) {
      tamano /= 1024;
      indice++;
    }

    return tamano.toFixed(2) + " " + unidades[indice];
  }

  window.NovaArchivos = Object.freeze({
    seleccionarArchivos: seleccionarArchivos,
    obtenerInformacion: obtenerInformacion,
    leerTexto: leerTexto,
    descargarTexto: descargarTexto,
    formatearTamano: formatearTamano
  });
})();