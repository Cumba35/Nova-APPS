
/* NOVA Apps — recordatorios locales y bóveda cifrada.
   Los datos de la bóveda permanecen cifrados en el dispositivo.
   Requiere HTTPS, IndexedDB y Web Crypto.
*/
(function (global) {
  "use strict";

  const REMINDERS_KEY = "nova_recordatorios_v1";
  const DB_NAME = "nova_boveda_v1";
  const STORE_NAME = "credenciales";
  const ITERATIONS = 310000;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let sessionKey = null;
  let sessionSalt = null;

  function makeId() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) +
          Math.random().toString(36).slice(2);
  }

  function requireCrypto() {
    if (!global.crypto || !global.crypto.subtle) {
      throw new Error(
        "Se requiere HTTPS y un navegador compatible con Web Crypto."
      );
    }
  }

  function toBase64(value) {
    const bytes = new Uint8Array(value);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  function fromBase64(value) {
    return Uint8Array.from(atob(value), c => c.charCodeAt(0));
  }

  function reminders() {
    try {
      const value = JSON.parse(
        localStorage.getItem(REMINDERS_KEY) || "[]"
      );
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveReminders(items) {
    if (!Array.isArray(items)) {
      throw new Error("La lista de recordatorios no es válida.");
    }

    localStorage.setItem(
      REMINDERS_KEY,
      JSON.stringify(items)
    );
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {
            keyPath: "id"
          });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getAllRecords() {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .getAll();

      request.onsuccess = () => {
        db.close();
        resolve(request.result || []);
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  }

  async function putRecord(record) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .put(record);

      request.onsuccess = () => {
        db.close();
        resolve();
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  }

  async function deleteRecord(id) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .delete(id);

      request.onsuccess = () => {
        db.close();
        resolve();
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  }

  async function deriveKey(password, salt) {
    requireCrypto();

    const material = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
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
    return records.some(record => record.id === "__meta__");
  }

  async function createVault(password) {
    requireCrypto();

    if (typeof password !== "string" || password.length < 10) {
      throw new Error(
        "La contraseña maestra debe tener al menos 10 caracteres."
      );
    }

    if (await vaultExists()) {
      throw new Error(
        "La bóveda ya existe. Desbloquéala en lugar de crear otra."
      );
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);

    const check = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
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

    sessionSalt = salt;
    sessionKey = key;
  }

  async function unlockVault(password) {
    requireCrypto();

    const records = await getAllRecords();
    const meta = records.find(record => record.id === "__meta__");

    if (!meta) {
      throw new Error("Primero debes crear la bóveda.");
    }

    const salt = fromBase64(meta.salt);
    const key = await deriveKey(password, salt);

    try {
      const plain = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: fromBase64(meta.iv)
        },
        key,
        fromBase64(meta.check)
      );

      if (decoder.decode(plain) !== "NOVA_VAULT_OK") {
        throw new Error("Comprobación inválida.");
      }

      sessionSalt = salt;
      sessionKey = key;
      return true;
    } catch {
      sessionKey = null;
      sessionSalt = null;
      throw new Error("Contraseña maestra incorrecta.");
    }
  }

  function lock() {
    sessionKey = null;
    sessionSalt = null;
  }

  async function vaultList() {
    if (!sessionKey) {
      throw new Error("Desbloquea la bóveda primero.");
    }

    const records = await getAllRecords();
    const output = [];

    for (const record of records) {
      if (record.id === "__meta__") continue;

      try {
        const plain = await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: fromBase64(record.iv)
          },
          sessionKey,
          fromBase64(record.data)
        );

        output.push(JSON.parse(decoder.decode(plain)));
      } catch {
        throw new Error(
          "No se pudo descifrar una credencial. Comprueba la integridad de la bóveda."
        );
      }
    }

    return output;
  }

  async function vaultSave(item) {
    if (!sessionKey) {
      throw new Error("Desbloquea la bóveda primero.");
    }

    if (!item || typeof item !== "object") {
      throw new Error("La credencial no es válida.");
    }

    const id = item.id || makeId();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const value = { ...item, id };

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
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
      throw new Error("Desbloquea la bóveda primero.");
    }

    if (id === "__meta__") {
      throw new Error("No se puede borrar el registro de seguridad.");
    }

    await deleteRecord(id);
  }

  async function exportEncrypted() {
    const records = await getAllRecords();

    if (!records.some(record => record.id === "__meta__")) {
      throw new Error("No existe una bóveda para exportar.");
    }

    const blob = new Blob(
      [
        JSON.stringify({
          format: "NOVA-PV",
          version: 1,
          records
        }, null, 2)
      ],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "boveda.novapv";
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importEncrypted(file) {
    if (!file) throw new Error("Selecciona un archivo.");

    const data = JSON.parse(await file.text());

    if (
      data.format !== "NOVA-PV" ||
      !Array.isArray(data.records) ||
      !data.records.some(record => record.id === "__meta__")
    ) {
      throw new Error("El archivo .novapv no es válido.");
    }

    // Validar antes de modificar la bóveda actual.
    for (const record of data.records) {
      if (!record || typeof record.id !== "string") {
        throw new Error("El archivo contiene registros inválidos.");
      }

      if (
        record.id !== "__meta__" &&
        (!record.iv || !record.data)
      ) {
        throw new Error("El archivo contiene datos cifrados incompletos.");
      }
    }

    const db = await openDatabase();

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      store.clear();
      for (const record of data.records) store.put(record);

      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });

    db.close();
    lock();
  }

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
