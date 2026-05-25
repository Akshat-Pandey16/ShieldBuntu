import { useEffect, useState } from "react";

const STORAGE_KEY = "sb_custom_cursor";
const EVENT = "sb-cursor-pref-change";

function readPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "1";
  } catch {
    return true;
  }
}

export function setCursorEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: enabled }));
}

export function useCursorPref(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(readPref);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setEnabled(detail);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);
  return [enabled, setCursorEnabled];
}
