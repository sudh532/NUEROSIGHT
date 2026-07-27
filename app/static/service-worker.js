/**
 * Aegis-Eye Service Worker Background Synchronization Controller
 * Updated to Network-First for instant developer hot-reloading (v10 - Settings Drawer)
 */

const DB_NAME = "AegisEyeOfflineStore";
const STORE_NAME = "pending_scans";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function flushOfflineQueue() {
  try {
    const db = await openDatabase();
    
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      return;
    }
    
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    
    const getRequest = store.getAll();
    
    getRequest.onsuccess = async () => {
      const scans = getRequest.result;
      if (scans.length === 0) return;
      
      console.log(`[Aegis Worker] Found ${scans.length} pending scans cached in IndexedDB. Flushing queue.`);
      
      for (const scan of scans) {
        try {
          const base64Response = await fetch(scan.image_base64);
          const blob = await base64Response.blob();
          const file = new File([blob], scan.filename || "ingress_frame.jpg", { type: "image/jpeg" });
          
          const formData = new FormData();
          formData.append("image", file);
          formData.append("operator_id", scan.operator_id);
          formData.append("case_id", scan.case_id);
          formData.append("lighting_profile", scan.lighting_profile);
          
          const response = await fetch("/api/detect", {
            method: "POST",
            body: formData
          });
          
          if (response.ok) {
            const deleteTx = db.transaction(STORE_NAME, "readwrite");
            const deleteStore = deleteTx.objectStore(STORE_NAME);
            deleteStore.delete(scan.id);
            console.log(`[Aegis Worker] Background synchronization completed for scan: ${scan.filename}`);
          }
        } catch (err) {
          console.error(`[Aegis Worker] Failed to upload queued scan ${scan.id}:`, err);
        }
      }
    };
    
  } catch (error) {
    console.error("[Aegis Worker] Error running queue sync:", error);
  }
}

// Background Sync listener
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-scans") {
    event.waitUntil(flushOfflineQueue());
  }
});

// Cache configuration names
const CACHE_NAME = "aegis-eye-v10";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/admin.html",
  "/css/design_tokens.css",
  "/css/reset.css",
  "/css/layout/navigation.css",
  "/css/layout/ingress.css",
  "/css/layout/telemetry.css",
  "/css/layout/trends.css",
  "/css/tactical_hud.css",
  "/js/main.js",
  "/js/api.js",
  "/js/audio.js",
  "/js/webcam.js",
  "/js/settings.js",
  "/js/report_modal.js",
  "/js/view/archive.js",
  "/js/view/canvas3d.js",
  "/js/view/elements.js",
  "/js/database/indexed_db.js"
];

// Install and Pre-Cache Static assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate & Clear obsolete caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Aegis Worker] Clearing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First strategy for static assets and APIs to ensure live hot-reloading
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
