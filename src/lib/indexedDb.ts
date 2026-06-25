// Client-side IndexedDB wrapper service for Kraken's Vault
// Bypasses the 5MB localStorage limit and supports large datasets.

const DB_NAME = "kraken_vault_indexeddb";
const DB_VERSION = 1;

export interface DBUser {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface DBVaultItem {
  id: string;
  userId: string;
  type: "login" | "card" | "note" | "identity";
  title: string;
  titleIv: string;
  fields: string;
  fieldsIv: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

let dbInstance: IDBDatabase | null = null;

export function initIndexedDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in browser environments"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (!db.objectStoreNames.contains("users")) {
        const userStore = db.createObjectStore("users", { keyPath: "id" });
        userStore.createIndex("email", "email", { unique: true });
      }

      if (!db.objectStoreNames.contains("items")) {
        const itemStore = db.createObjectStore("items", { keyPath: "id" });
        itemStore.createIndex("userId", "userId", { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };
  });
}

// User store operations
export async function getUsers(): Promise<DBUser[]> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("users", "readonly");
    const store = tx.objectStore("users");
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as DBUser[]);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to fetch users from IndexedDB"));
    };
  });
}

export async function getUserByEmail(email: string): Promise<DBUser | undefined> {
  const db = await initIndexedDB();
  const cleanEmail = email.toLowerCase().trim();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("users", "readonly");
    const store = tx.objectStore("users");
    const index = store.index("email");
    const request = index.get(cleanEmail);

    request.onsuccess = () => {
      resolve(request.result as DBUser | undefined);
    };

    request.onerror = () => {
      reject(request.error || new Error(`Failed to fetch user by email: ${email}`));
    };
  });
}

export async function saveUser(user: DBUser): Promise<void> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("users", "readwrite");
    const store = tx.objectStore("users");
    const request = store.put(user);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to save user in IndexedDB"));
    };
  });
}

// Vault items operations
export async function getItems(userId: string): Promise<DBVaultItem[]> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("items", "readonly");
    const store = tx.objectStore("items");
    const index = store.index("userId");
    const request = index.getAll(userId);

    request.onsuccess = () => {
      resolve(request.result as DBVaultItem[]);
    };

    request.onerror = () => {
      reject(request.error || new Error(`Failed to fetch items for user: ${userId}`));
    };
  });
}

export async function saveItem(item: DBVaultItem): Promise<void> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");
    const request = store.put(item);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error || new Error(`Failed to save item: ${item.id}`));
    };
  });
}

export async function deleteItem(itemId: string): Promise<void> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");
    const request = store.delete(itemId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error || new Error(`Failed to delete item: ${itemId}`));
    };
  });
}
