"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const NAV_SHORTCUTS: Record<string, string> = {
  g: "", // prefix — handled separately
};

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let lastKey = "";
    let lastKeyTime = 0;

    function handler(e: KeyboardEvent) {
      // Skip if typing in an input, textarea, or contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
        || (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;

      // Skip if modifier keys held (except Shift for search)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      const now = Date.now();
      const isChord = lastKey === "g" && now - lastKeyTime < 1000;

      // "g" prefix chords — go to page
      if (isChord) {
        lastKey = "";
        switch (key) {
          case "d": e.preventDefault(); router.push("/dashboard"); break;
          case "c": e.preventDefault(); router.push("/cases"); break;
          case "t": e.preventDefault(); router.push("/tasks"); break;
          case "a": e.preventDefault(); router.push("/activities"); break;
          case "p": e.preventDefault(); router.push("/payments"); break;
          case "f": e.preventDefault(); router.push("/field-visits"); break;
          case "l": e.preventDefault(); router.push("/legal"); break;
          case "r": e.preventDefault(); router.push("/reports"); break;
        }
        return;
      }

      // Single-key shortcuts
      if (key === "g") {
        lastKey = "g";
        lastKeyTime = now;
        return;
      }

      // "/" — focus global search
      if (key === "/") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>("[data-global-search]");
        searchInput?.focus();
        return;
      }

      // Escape — close any open modal/panel (browsers handle this for most cases)
      // "b" — go back
      if (key === "b") {
        e.preventDefault();
        router.back();
        return;
      }

      lastKey = "";
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);
}
