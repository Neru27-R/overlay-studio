import { useEffect, useState } from "react";
import { AdminApp } from "./AdminApp";
import { ClientApp } from "./ClientApp";

type StandaloneMode = "admin" | "client";

const ADMIN_HASH = "atelier-vault-7291";

function getModeFromHash(): StandaloneMode {
  const hash = window.location.hash.replace("#", "");
  if (hash === ADMIN_HASH) return "admin";
  return "client";
}

export function StandaloneApp() {
  const [mode, setMode] = useState<StandaloneMode>(() => getModeFromHash());

  useEffect(() => {
    function handleHashChange() {
      setMode(getModeFromHash());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (mode === "admin") return <AdminApp />;
  return <ClientApp />;
}
