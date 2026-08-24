import { useSyncExternalStore } from "react";

export type StoredAuthUser = {
  uid?: string;
  name?: string;
  email?: string;
  photoURL?: string;
  role?: "customer" | "soleProvider" | "institution";
};

const STORAGE_KEY = "bluehope.authUser";

let cache: StoredAuthUser | null | undefined;
const listeners = new Set<() => void>();

function readFromStorage(): StoredAuthUser | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthUser;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function getSnapshot(): StoredAuthUser | null {
  if (cache === undefined) {
    cache = readFromStorage();
  }
  return cache;
}

function getServerSnapshot(): StoredAuthUser | null {
  return null;
}

function emitChange() {
  cache = undefined;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      emitChange();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStoredAuthUser(): StoredAuthUser | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function clearStoredAuthUser() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable; still notify subscribers.
  }
  emitChange();
}