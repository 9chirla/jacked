"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toast } from "@/components/ui/Toast";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { ThemePreference } from "@/lib/theme";
import { useEffect, useState } from "react";

const options: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeSettings() {
  const { preference, setPreference } = useTheme();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 1600);
    return () => window.clearTimeout(id);
  }, [saved]);

  return (
    <div className="space-y-3">
      <SegmentedControl
        ariaLabel="Theme preference"
        value={preference}
        options={options}
        onChange={(next) => {
          setPreference(next);
          setSaved(true);
        }}
      />
      {saved ? <Toast message="Theme preference saved on this device." /> : null}
    </div>
  );
}
