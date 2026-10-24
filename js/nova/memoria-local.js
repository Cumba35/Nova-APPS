
/*
 * NOVA APPS — Memoria local
 * Ruta: js/nova/memoria-local.js
 *
 * Almacenamiento local mediante localStorage.
 * No se conecta a Supabase ni transmite información.
 *
 * API pública: window.NovaMemoria
 */

(function () {
  "use strict";

  const PREFIJO = "nova_memoria_";
  const VERSION = 1;
  const MAX_CLAVE = 160;
  const MAX_REGISTRO = 500000;

  function crearClave(clave) {
    if (typeof clave !== "string") {
      throw new TypeError("La clave debe ser un texto.");
    }

    const limpia = clave.trim();

    if (!limpia) {
      throw new Error("La clave de memoria es obligatoria.");
    }

    if (limpia.length > MAX_CLAVE) {
      throw new Error("La clave es demasiado larga.");
    }

    if (/[\u0000-\u001F\u007F]/.test(limpia)) {
      throw new Error("La clave contiene caracteres no permitidos.");
    }

    return PREFIJO + limpia;
  }

  function resultado(correcto, mensaje, extra) {
    return Object.assign({
      correcto: correcto,
      mensaje: mensaje
    }, extra || {});
  }

  function registrarError(operacion, error) {
    // No registrar valores guardados ni datos privados.
    console.error(
      "[NovaMemoria] Error en " + operacion + ":",
      error && error.message ? error.message : "Error desconocido"
    );
  }

  function guardar(clave, valor) {
    try {
      const claveFinal = crearClave(clave);

      const contenido = JSON.stringify({
        version: VERSION,
        valor: valor,
        actualizado: new Date().toISOString()
      });

      if (typeof contenido !== "string") {
        return resultado(
          false,
          "El contenido no se puede convertir a JSON."
        );
      }

      if (contenido.length > MAX_REGISTRO) {
        return resultado(
          false,
          "La información supera el tamaño permitido."
        );
      }

      localStorage.setItem(claveFinal, contenido);

      return resultado(
        true,
        "Información guardada localmente."
      );
    } catch (error) {
      registrarError("guardar", error);

      return resultado(
        false,
        "No se pudo guardar. Comprueba el almacenamiento del navegador y el formato de los datos."
      );
    }
  }

  function obtenerRegistro(clave) {
    try {
      const contenido = localStorage.getItem(
        crearClave(clave)
      );

      if (contenido === null) {
        return null;
      }

      if (contenido.length > MAX_REGISTRO) {
        throw new Error("El registro supera el tamaño permitido.");
      }

      const registro = JSON.parse(contenido);

      if (
        !registro ||
        typeof registro !== "object" ||
        !Object.prototype.hasOwnProperty.call(registro, "valor")
      ) {
        throw new Error("Formato de registro no válido.");
      }

      return {
        version: Number.isInteger(registro.version)
          ? registro.version
          : 0,
        valor: registro.valor,
        actualizado: typeof registro.actualizado === "string"
          ? registro.actualizado
          : null
      };
    } catch (error) {
      registrarError("leer registro", error);
      return null;
    }
  }

  function leer(clave) {
    const registro = obtenerRegistro(clave);
    return registro === null ? null : registro.valor;
  }

  function existe(clave) {
    try {
      return localStorage.getItem(crearClave(clave)) !== null;
    } catch (error) {
      registrarError("comprobar existencia", error);
      return false;
    }
  }

  function eliminar(clave) {
    try {
      localStorage.removeItem(crearClave(clave));
      return true;
    } catch (error) {
      registrarError("eliminar", error);
      return false;
    }
  }

  function listarClaves() {
    const claves = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const claveCompleta = localStorage.key(i);

        if (
          typeof claveCompleta === "string" &&
          claveCompleta.startsWith(PREFIJO)
        ) {
          claves.push(
            claveCompleta.substring(PREFIJO.length)
          );
        }
      }

      claves.sort();
    } catch (error) {
      registrarError("listar claves", error);
    }

    return claves;
  }

  function contar() {
    return listarClaves().length;
  }

  function borrarTodo() {
    let eliminadas = 0;
    let fallidas = 0;

    try {
      const claves = listarClaves();

      claves.forEach(function (clave) {
        if (eliminar(clave)) {
          eliminadas++;
        } else {
          fallidas++;
        }
      });

      return resultado(
        fallidas === 0,
        fallidas === 0
          ? "Memoria local borrada."
          : "Algunas entradas no se pudieron eliminar.",
        {
          eliminadas: eliminadas,
          fallidas: fallidas
        }
      );
    } catch (error) {
      registrarError("borrar memoria", error);

      return resultado(
        false,
        "No se pudo completar el borrado.",
        {
          eliminadas: eliminadas,
          fallidas: fallidas
        }
      );
    }
  }

  function exportar() {
    try {
      const datos = {};

      listarClaves().forEach(function (clave) {
        const registro = obtenerRegistro(clave);

        if (registro !== null) {
          datos[clave] = registro;
        }
      });

      return {
        correcto: true,
        version: VERSION,
        exportado: new Date().toISOString(),
        datos: datos
      };
    } catch (error) {
      registrarError("exportar", error);

      return resultado(
        false,
        "No se pudo exportar la memoria."
      );
    }
  }

  function importar(paquete, opciones) {
    const ajustes = opciones || {};
    const reemplazar = ajustes.reemplazar === true;

    if (
      !paquete ||
      typeof paquete !== "object" ||
      !paquete.datos ||
      typeof paquete.datos !== "object" ||
      Array.isArray(paquete.datos)
    ) {
      return resultado(
        false,
        "El archivo de memoria no tiene un formato válido."
      );
    }

    const entradas = Object.entries(paquete.datos);

    if (entradas.length > 1000) {
      return resultado(
        false,
        "El archivo contiene demasiadas entradas."
      );
    }

    // Validar todas las entradas antes de escribir.
    const preparadas = [];

    try {
      for (const [clave, registro] of entradas) {
        crearClave(clave);

        if (
          !registro ||
          typeof registro !== "object" ||
          !Object.prototype.hasOwnProperty.call(registro, "valor")
        ) {
          throw new Error(
            "Hay una entrada inválida en el archivo."
          );
        }

        const contenido = JSON.stringify({
          version: VERSION,
          valor: registro.valor,
          actualizado: new Date().toISOString()
        });

        if (
          typeof contenido !== "string" ||
          contenido.length > MAX_REGISTRO
        ) {
          throw new Error(
            "Una entrada supera el tamaño permitido."
          );
        }

        preparadas.push({
          clave: crearClave(clave),
          contenido: contenido
        });
      }
    } catch (error) {
      registrarError("validar importación", error);

      return resultado(
        false,
        error.message || "El archivo no es válido."
      );
    }

    if (!reemplazar) {
      for (const entrada of preparadas) {
        try {
          if (localStorage.getItem(entrada.clave) !== null) {
            return resultado(
              false,
              "Ya existe una entrada con ese nombre. No se importó ningún dato."
            );
          }
        } catch (error) {
          registrarError("comprobar importación", error);

          return resultado(
            false,
            "No se pudo comprobar el almacenamiento."
          );
        }
      }
    }

    let guardadas = 0;

    try {
      for (const entrada of preparadas) {
        localStorage.setItem(
          entrada.clave,
          entrada.contenido
        );

        guardadas++;
      }

      return resultado(
        true,
        "Importación completada.",
        {
          importadas: guardadas
        }
      );
    } catch (error) {
      registrarError("importar", error);

      return resultado(
        false,
        "La importación se interrumpió. Algunos registros podrían haberse guardado.",
        {
          importadas: guardadas
        }
      );
    }
  }

  window.NovaMemoria = Object.freeze({
    version: VERSION,
    guardar: guardar,
    leer: leer,
    obtenerRegistro: obtenerRegistro,
    existe: existe,
    eliminar: eliminar,
    listarClaves: listarClaves,
    contar: contar,
    borrarTodo: borrarTodo,
    exportar: exportar,
    importar: importar
  });
})();
