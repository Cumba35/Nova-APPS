
/* =========================================================
   NOVA Apps — Recordatorios locales y bóveda cifrada
   Archivo: js/nova/recordatorios-boveda.js

   API compatible con mi-espacio.html:
   reminders()
   saveReminders(items)
   vaultExists()
   createVault(password)
   unlockVault(password)
   lock()
   vaultList()
   vaultSave(item)
   vaultDelete(id)
   exportEncrypted()
   importEncrypted(file)

   Almacenamiento local. Sin conexión a Supabase.
   ========================================================= */

(function (global) {
  "use strict";

  const REMINDERS_KEY = "nova_recordatorios_v1";
  const DB_NAME = "nova_boveda_v1";
  const STORE_NAME = "credenciales";
  const ITERATIONS = 310000;
  const MAX_IMPORT_SIZE = 10 * 1024 * 1024;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });

  let sessionKey = null;

  /* -------------------------
     Funciones básicas
  ------------------------- */

  function makeId() {
    if (global.crypto && global.crypto.randomUUID) {
      return global.crypto.randomUUID();
    }

    if (global.crypto && global.crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      global.crypto.getRandomValues(bytes);

      return Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
    }

    throw new Error(
      "Este navegador no dispone de un generador seguro de identificadores."
    );
  }

  function requireCrypto() {
    if (!global.crypto || !global.crypto.subtle) {
      throw new Error(
        "El cifrado requiere un navegador compatible y una conexión HTTPS."
      );
    }
  }

  function requireIndexedDB() {
    if (!global.indexedDB) {
      throw new Error(
        "Este navegador no permite utilizar IndexedDB."
      );
    }
  }

  function toBase64(value) {
    const bytes = new Uint8Array(value);
    let binary = "";
    const chunkSize = 8192;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(
        ...bytes.subarray(i, i + chunkSize)
      );
    }

    return global.btoa(binary);
  }

  function fromBase64(value) {
    if (
      typeof value !== "string" ||
      !value ||
      value.length % 4 !== 0 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
    ) {
      throw new Error("El archivo contiene datos codificados inválidos.");
    }

    const binary = global.atob(value);

    return Uint8Array.from(
      binary,
      character => character.charCodeAt(0)
    );
  }

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  /* -------------------------
     Recordatorios locales
  ------------------------- */

  function reminders() {
    try {
      const raw = global.localStorage.getItem(REMINDERS_KEY);
      const value = JSON.parse(raw || "[]");

      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveReminders(items) {
    if (!Array.isArray(items)) {
      throw new Error(
        "La lista de recordatorios no es válida."
      );
    }

    const ids = new Set();

    for (const item of items) {
      if (
        !isObject(item) ||
        typeof item.id !== "string" ||
        !item.id ||
        typeof item.title !== "string" ||
        typeof item.date !== "string" ||
        !Number.isFinite(new Date(item.date).getTime())
      ) {
        throw new Error(
          "La lista contiene un recordatorio inválido."
        );
      }

      if (ids.has(item.id)) {
        throw new Error(
          "La lista contiene identificadores duplicados."
        );
      }

      ids.add(item.id);
    }

    try {
      global.localStorage.setItem(
        REMINDERS_KEY,
        JSON.stringify(items)
      );
    } catch {
      throw new Error(
        "No se pudieron guardar los recordatorios. Comprueba el almacenamiento disponible."
      );
    }
  }

  /* -------------------------
     IndexedDB
  ------------------------- */

  function openDatabase() {
    requireIndexedDB();

    return new Promise((resolve, reject) => {
      let request;

      try {
        request = global.indexedDB.open(DB_NAME, 1);
      } catch {
        reject(
          new Error("No se pudo abrir la base de datos local.")
        );
        return;
      }

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {
            keyPath: "id"
          });
        }
      };

      request.onsuccess = () => {
        const db = request.result;

        db.onversionchange = () => db.close();

        resolve(db);
      };

      request.onerror = () => {
        reject(
          new Error(
            "No se pudo abrir la bóveda local."
          )
        );
      };

      request.onblocked = () => {
        reject(
          new Error(
            "La base de datos está bloqueada por otra conexión. Cierra otras pestañas de Nova Apps."
          )
        );
      };
    });
  }

  async function getAllRecords() {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      let transaction;
      let request;
      let finished = false;

      function cleanup() {
        db.close();
      }

      function fail() {
        if (finished) return;
        finished = true;
        cleanup();

        reject(
          new Error("No se pudieron leer los datos de la bóveda.")
        );
      }

      try {
        transaction = db.transaction(STORE_NAME, "readonly");
        request = transaction.objectStore(STORE_NAME).getAll();
      } catch {
        cleanup();
        reject(
          new Error("No se pudo consultar la bóveda.")
        );
        return;
      }

      request.onsuccess = () => {
        if (finished) return;

        const result = request.result || [];

        transaction.oncomplete = () => {
          if (finished) return;
          finished = true;
          cleanup();
          resolve(result);
        };
      };

      request.onerror = fail;
      transaction.onerror = fail;
      transaction.onabort = fail;
    });
  }

  async function putRecord(record) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      let transaction;
      let finished = false;

      function cleanup() {
        db.close();
      }

      function fail() {
        if (finished) return;
        finished = true;
        cleanup();

        reject(
          new Error("No se pudo guardar el registro de la bóveda.")
        );
      }

      try {
        transaction = db.transaction(STORE_NAME, "readwrite");

        transaction.objectStore(STORE_NAME).put(record);
      } catch {
        cleanup();
        reject(
          new Error("No se pudo iniciar el guardado.")
        );
        return;
      }

      transaction.oncomplete = () => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve();
      };

      transaction.onerror = fail;
      transaction.onabort = fail;
    });
  }

  async function deleteRecord(id) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      let transaction;
      let finished = false;

      function cleanup() {
        db.close();
      }

      function fail() {
        if (finished) return;
        finished = true;
        cleanup();

        reject(
          new Error("No se pudo eliminar el registro.")
        );
      }

      try {
        transaction = db.transaction(STORE_NAME, "readwrite");

        transaction.objectStore(STORE_NAME).delete(id);
      } catch {
        cleanup();
        reject(
          new Error("No se pudo iniciar la eliminación.")
        );
        return;
      }

      transaction.oncomplete = () => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve();
      };

      transaction.onerror = fail;
      transaction.onabort = fail;
    });
  }

  /* -------------------------
     Cifrado AES-GCM / PBKDF2
  ------------------------- */

  async function deriveKey(password, salt) {
    requireCrypto();

    const material = await global.crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return global.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: ITERATIONS,
        hash: "SHA-256"
      },
      material,
      {
        name: "AES-GCM",
        length: 256
      },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function vaultExists() {
    const records = await getAllRecords();

    return records.some(
      record => record && record.id === "__meta__"
    );
  }

  async function createVault(password) {
    requireCrypto();

    if (
      typeof password !== "string" ||
      password.length < 10
    ) {
      throw new Error(
        "La contraseña maestra debe tener al menos 10 caracteres."
      );
    }

    if (await vaultExists()) {
      throw new Error(
        "La bóveda ya existe. Desbloquéala en lugar de crear otra."
      );
    }

    const salt = global.crypto.getRandomValues(
      new Uint8Array(16)
    );

    const iv = global.crypto.getRandomValues(
      new Uint8Array(12)
    );

    const key = await deriveKey(password, salt);

    const check = await global.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      encoder.encode("NOVA_VAULT_OK")
    );

    await putRecord({
      id: "__meta__",
      salt: toBase64(salt),
      iv: toBase64(iv),
      check: toBase64(check),
      version: 1
    });

    sessionKey = key;
  }

  async function unlockVault(password) {
    requireCrypto();

    if (typeof password !== "string" || !password) {
      throw new Error(
        "Introduce la contraseña maestra."
      );
    }

    const records = await getAllRecords();

    const meta = records.find(
      record => record && record.id === "__meta__"
    );

    if (!meta) {
      throw new Error(
        "Primero debes crear o importar una bóveda."
      );
    }

    try {
      if (
        meta.version !== 1 ||
        typeof meta.salt !== "string" ||
        typeof meta.iv !== "string" ||
        typeof meta.check !== "string"
      ) {
        throw new Error("Metadatos inválidos.");
      }

      const salt = fromBase64(meta.salt);
      const iv = fromBase64(meta.iv);
      const check = fromBase64(meta.check);

      if (
        salt.length !== 16 ||
        iv.length !== 12 ||
        check.length < 16
      ) {
        throw new Error("Metadatos incompletos.");
      }

      const key = await deriveKey(password, salt);

      const plain = await global.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv
        },
        key,
        check
      );

      if (decoder.decode(plain) !== "NOVA_VAULT_OK") {
        throw new Error("Comprobación incorrecta.");
      }

      sessionKey = key;

      return true;
    } catch {
      sessionKey = null;

      throw new Error(
        "No se pudo desbloquear la bóveda. Comprueba la contraseña y la integridad del archivo."
      );
    }
  }

  function lock() {
    sessionKey = null;
  }

  /* -------------------------
     Leer credenciales cifradas
  ------------------------- */

  async function vaultList() {
    if (!sessionKey) {
      throw new Error(
        "Desbloquea la bóveda primero."
      );
    }

    const records = await getAllRecords();
    const output = [];

    for (const record of records) {
      if (!record || record.id === "__meta__") {
        continue;
      }

      try {
        if (
          typeof record.iv !== "string" ||
          typeof record.data !== "string" ||
          record.version !== 1
        ) {
          throw new Error("Registro inválido.");
        }

        const iv = fromBase64(record.iv);
        const encrypted = fromBase64(record.data);

        if (iv.length !== 12 || encrypted.length < 16) {
          throw new Error("Datos cifrados incompletos.");
        }

        const plain = await global.crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv
          },
          sessionKey,
          encrypted
        );

        const item = JSON.parse(decoder.decode(plain));

        if (
          !isObject(item) ||
          item.id !== record.id
        ) {
          throw new Error("Credencial inválida.");
        }

        output.push(item);
      } catch {
        throw new Error(
          "No se pudo descifrar una credencial. Comprueba la integridad de la bóveda."
        );
      }
    }

    return output;
  }

  /* -------------------------
     Guardar credenciales
  ------------------------- */

  async function vaultSave(item) {
    requireCrypto();

    if (!sessionKey) {
      throw new Error(
        "Desbloquea la bóveda primero."
      );
    }

    if (!isObject(item)) {
      throw new Error(
        "La credencial no es válida."
      );
    }

    const service = String(item.service || "").trim();
    const user = String(item.user || "").trim();
    const password = String(item.password || "");

    if (!service || !user || !password) {
      throw new Error(
        "El servicio, el usuario y la contraseña son obligatorios."
      );
    }

    const id = item.id || makeId();

    if (typeof id !== "string" || !id || id === "__meta__") {
      throw new Error("El identificador de la credencial no es válido.");
    }

    const value = {
      id,
      service,
      user,
      password,
      notes: String(item.notes || "")
    };

    const iv = global.crypto.getRandomValues(
      new Uint8Array(12)
    );

    const encrypted = await global.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      sessionKey,
      encoder.encode(JSON.stringify(value))
    );

    await putRecord({
      id,
      iv: toBase64(iv),
      data: toBase64(encrypted),
      version: 1
    });

    return id;
  }

  async function vaultDelete(id) {
    if (!sessionKey) {
      throw new Error(
        "Desbloquea la bóveda primero."
      );
    }

    if (
      typeof id !== "string" ||
      !id ||
      id === "__meta__"
    ) {
      throw new Error(
        "No se puede eliminar este registro."
      );
    }

    await deleteRecord(id);
  }

  /* -------------------------
     Exportar copia cifrada
  ------------------------- */

  async function exportEncrypted() {
    const records = await getAllRecords();

    const meta = records.find(
      record => record && record.id === "__meta__"
    );

    if (!meta) {
      throw new Error(
        "No existe una bóveda para exportar."
      );
    }

    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: "NOVA-PV",
            version: 1,
            records
          },
          null,
          2
        )
      ],
      {
        type: "application/json"
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "boveda.novapv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    global.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 2000);
  }

  /* -------------------------
     Validar archivo de bóveda
  ------------------------- */

  async function validateImport(file) {
    if (!file) {
      throw new Error("Selecciona un archivo.");
    }

    if (file.size > MAX_IMPORT_SIZE) {
      throw new Error(
        "El archivo supera el límite de 10 MB."
      );
    }

    let data;

    try {
      data = JSON.parse(await file.text());
    } catch {
      throw new Error(
        "El archivo no contiene JSON válido."
      );
    }

    if (
      !isObject(data) ||
      data.format !== "NOVA-PV" ||
      data.version !== 1 ||
      !Array.isArray(data.records) ||
      data.records.length === 0
    ) {
      throw new Error(
        "El archivo .novapv no tiene una estructura compatible."
      );
    }

    const ids = new Set();
    let metaCount = 0;

    for (const record of data.records) {
      if (
        !isObject(record) ||
        typeof record.id !== "string" ||
        !record.id
      ) {
        throw new Error(
          "El archivo contiene registros inválidos."
        );
      }

      if (ids.has(record.id)) {
        throw new Error(
          "El archivo contiene identificadores duplicados."
        );
      }

      ids.add(record.id);

      if (record.id === "__meta__") {
        metaCount++;

        if (
          record.version !== 1 ||
          typeof record.salt !== "string" ||
          typeof record.iv !== "string" ||
          typeof record.check !== "string"
        ) {
          throw new Error(
            "La información de seguridad de la bóveda está incompleta."
          );
        }

        const salt = fromBase64(record.salt);
        const iv = fromBase64(record.iv);
        const check = fromBase64(record.check);

        if (
          salt.length !== 16 ||
          iv.length !== 12 ||
          check.length < 16
        ) {
          throw new Error(
            "La información de seguridad contiene datos inválidos."
          );
        }
      } else {
        if (
          record.version !== 1 ||
          typeof record.iv !== "string" ||
          typeof record.data !== "string"
        ) {
          throw new Error(
            "El archivo contiene una credencial incompleta."
          );
        }

        const iv = fromBase64(record.iv);
        const encrypted = fromBase64(record.data);

        if (iv.length !== 12 || encrypted.length < 16) {
          throw new Error(
            "Una credencial contiene datos cifrados inválidos."
          );
        }
      }
    }

    if (metaCount !== 1) {
      throw new Error(
        "El archivo debe contener exactamente un registro de seguridad."
      );
    }

    return data;
  }

  /* -------------------------
     Importar de forma atómica
  ------------------------- */

  async function importEncrypted(file) {
    const data = await validateImport(file);
    const db = await openDatabase();

    try {
      await new Promise((resolve, reject) => {
        let transaction;
        let finished = false;

        function fail() {
          if (finished) return;
          finished = true;

          reject(
            new Error(
              "No se pudo importar la bóveda. Los cambios incompletos se cancelaron."
            )
          );
        }

        try {
          transaction = db.transaction(
            STORE_NAME,
            "readwrite"
          );

          const store = transaction.objectStore(STORE_NAME);

          store.clear();

          for (const record of data.records) {
            store.put(record);
          }
        } catch {
          if (transaction) {
            try {
              transaction.abort();
            } catch {
              // La transacción puede haber terminado.
            }
          }

          fail();
          return;
        }

        transaction.oncomplete = () => {
          if (finished) return;
          finished = true;
          resolve();
        };

        transaction.onerror = fail;
        transaction.onabort = fail;
      });
    } finally {
      db.close();
    }

    lock();
  }

  /* -------------------------
     API pública compatible
  ------------------------- */

  global.NOVA_PERSONAL = {
    reminders,
    saveReminders,
    vaultExists,
    createVault,
    unlockVault,
    lock,
    vaultList,
    vaultSave,
    vaultDelete,
    exportEncrypted,
    importEncrypted
  };

})(window);
