import { useEffect } from "react";

function isProtectedTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest("img, canvas, .preview-frame, .client-frame, .editor-frame, .no-save");
}

export function useAssetProtection() {
  useEffect(() => {
    function preventProtectedEvent(event: Event) {
      if (!isProtectedTarget(event.target)) return;
      event.preventDefault();
    }

    function preventSaveShortcut(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && (key === "s" || key === "u" || key === "p")) {
        event.preventDefault();
      }
    }

    document.addEventListener("contextmenu", preventProtectedEvent);
    document.addEventListener("dragstart", preventProtectedEvent);
    document.addEventListener("selectstart", preventProtectedEvent);
    document.addEventListener("keydown", preventSaveShortcut);

    return () => {
      document.removeEventListener("contextmenu", preventProtectedEvent);
      document.removeEventListener("dragstart", preventProtectedEvent);
      document.removeEventListener("selectstart", preventProtectedEvent);
      document.removeEventListener("keydown", preventSaveShortcut);
    };
  }, []);
}
