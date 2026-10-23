Ruta: "js/nova/memoria-local.js"

(function () {
  "use strict";

  const PREFIJO = "nova_memoria_";

  function crearClave(clave) {
    if (typeof clave !== "string" || !clave.trim()) {
      throw new Error("La clave de memoria es obligatoria.");
    }

    return PREFIJO + clave.trim();
  }

  function guardar(clave, valor) {
    try {
      const claveFinal = crearClave(clave);
      const contenido = JSON.stringify({
        valor: valor,
        actualizado: new Date().toISOString()
      });

      localStorage.setItem(claveFinal, contenido);

      return {
        correcto: true,
        mensaje: "Información guardada localmente."
      };
    } catch (error) {
      console.error("Nova Memoria:", error);

      return {
        correcto: false,
        mensaje: "No se pudo guardar la información."
      };
    }
  }

  function leer(clave) {
    try {
      const contenido = localStorage.getItem(crearClave(clave));

      if (contenido === null) {
        return null;
      }

      const registro = JSON.parse(contenido);
      return registro.valor;
    } catch (error) {
      console.error("Nova Memoria:", error);
      return null;
    }
  }

  function obtenerRegistro(clave) {
    try {
      const contenido = localStorage.getItem(crearClave(clave));

      return contenido === null ? null : JSON.parse(contenido);
    } catch (error) {
      console.error("Nova Memoria:", error);
      return null;
    }
  }

  function eliminar(clave) {
    try {
      localStorage.removeItem(crearClave(clave));
      return true;
    } catch (error) {
      console.error("Nova Memoria:", error);
      return false;
    }
  }

  function listarClaves() {
    const claves = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const clave = localStorage.key(i);

        if (clave && clave.startsWith(PREFIJO)) {
          claves.push(clave.substring(PREFIJO.length));
        }
      }
    } catch (error) {
      console.error("Nova Memoria:", error);
    }

    return claves;
  }

  function borrarTodo() {
    let eliminadas = 0;

    try {
      const claves = listarClaves();

      claves.forEach(function (clave) {
        if (eliminar(clave)) {
          eliminadas++;
        }
      });

      return {
        correcto: true,
        eliminadas: eliminadas
      };
    } catch (error) {
      console.error("Nova Memoria:", error);

      return {
        correcto: false,
        eliminadas: eliminadas
      };
    }
  }

  window.NovaMemoria = Object.freeze({
    guardar: guardar,
    leer: leer,
    obtenerRegistro: obtenerRegistro,
    eliminar: eliminar,
    listarClaves: listarClaves,
    borrarTodo: borrarTodo
  });
})();