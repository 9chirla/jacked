"use client";

import { Button } from "@/components/ui/Button";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Never interrupt an in-progress logging session. */
export function UpdateBanner() {
  const pathname = usePathname();
  const inSession = /^\/log\/[^/]+/.test(pathname ?? "");
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onController = () => {
      // refreshed after skipWaiting
    };

    void navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(reg.waiting);
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", onController);
    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onController,
      );
    };
  }, []);

  if (!waiting || inSession) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--nav-height)+var(--safe-bottom)+0.5rem)] z-40 mx-auto w-full max-w-lg px-4">
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface px-3 py-2 shadow-sm">
        <p className="text-[14px] text-ink">Update ready</p>
        <Button
          type="button"
          variant="primary"
          className="min-h-10 px-3 text-[14px]"
          onClick={() => {
            waiting.postMessage({ type: "SKIP_WAITING" });
            window.location.reload();
          }}
        >
          Reload
        </Button>
      </div>
    </div>
  );
}
