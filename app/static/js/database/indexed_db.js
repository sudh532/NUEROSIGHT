/**
 * Client-Side Offline Database Cache Manager for Aegis-Eye
 * Stores raw screening payloads in IndexedDB during network outages.
 */
export const IndexedDB = {
  dbName: "AegisEyeOfflineStore",
  dbVersion: 1,
  storeName: "pending_scans",

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id", autoIncrement: true });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(new Error(`Failed to open IndexedDB: ${event.target.error}`));
      };
    });
  },

  async savePendingScan(scanData) {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      
      const payload = {
        timestamp: new Date().toISOString(),
        operator_id: scanData.operator_id,
        case_id: scanData.case_id,
        lighting_profile: scanData.lighting_profile,
        image_base64: scanData.image_base64,
        filename: scanData.filename
      };

      const request = store.add(payload);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(new Error(`Failed to cache transaction in IndexedDB: ${request.error}`));
      };
    });
  },

  async getPendingScans() {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to query IndexedDB scans: ${request.error}`));
      };
    });
  },

  async deletePendingScan(id) {
    const db = await this.openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(new Error(`Failed to remove scan index ${id}: ${request.error}`));
      };
    });
  }
};
