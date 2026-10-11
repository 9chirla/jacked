"use client";

import { Button } from "@/components/ui/Button";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [outcome, setOutcome] = useState<string | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    setStandalone(mq.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (standalone) {
    return (
      <p className="text-[14px] text-muted">Installed — running standalone.</p>
    );
  }

  if (!deferred) {
    return (
      <p className="text-[14px] text-muted">
        Install: Chrome menu → Install app (or Add to Home screen). The in-app
        button appears when the browser fires <span className="tabular">beforeinstallprompt</span>.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          await deferred.prompt();
          const choice = await deferred.userChoice;
          setOutcome(choice.outcome);
          setDeferred(null);
        }}
      >
        Install Jacked
      </Button>
      {outcome ? (
        <p className="text-[13px] text-muted">Install choice: {outcome}</p>
      ) : null}
    </div>
  );
}
