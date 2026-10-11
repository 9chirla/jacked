"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Instant feedback on same-origin navigations (soft or hard).
 * Cleared when the URL settles.
 */
export function NavPending() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [pending, setPending] = useState(false);
  const [settledRoute, setSettledRoute] = useState(routeKey);

  // Reset pending when the route changes (adjust during render — not in an effect).
  if (routeKey !== settledRoute) {
    setSettledRoute(routeKey);
    if (pending) setPending(false);
  }

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const href = anchor.href;
      if (!href) return;
      let url: URL;
      try {
        url = new URL(href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      setPending(true);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  if (!pending) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-0.5 overflow-hidden bg-line"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="nav-pending-bar h-full w-1/3 bg-accent" />
    </div>
  );
}
