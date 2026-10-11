"use client";

import { useEffect } from "react";

/** Register on any secure context (HTTPS + localhost) so install/offline can be verified. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const secure =
      window.isSecureContext ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1";
    if (!secure) return;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((error: unknown) => {
        console.error("Service worker registration failed", error);
      });
  }, []);

  return null;
}
