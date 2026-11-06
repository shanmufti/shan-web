// Client helpers for the remembered "who are you" choice on /food-tour.
// Read via useSyncExternalStore so server and first client render agree.

const PERSON_STORAGE_KEY = "food-tour-person";
const LOCAL_EVENT = "food-tour-person";

export function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCAL_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCAL_EVENT, onChange);
  };
}

export function readStoredPerson(): string {
  try {
    return window.localStorage.getItem(PERSON_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function storePerson(id: string) {
  try {
    window.localStorage.setItem(PERSON_STORAGE_KEY, id);
    // "storage" only fires in other tabs; tell this tab's forms too.
    window.dispatchEvent(new Event(LOCAL_EVENT));
  } catch {
    // Storage can be unavailable (private mode); picking again is fine.
  }
}
