"use client";

import { useGameStore } from "@/lib/store";
import { useEffect } from "react";

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const isDarkMode = useGameStore((s) => s.isDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove("light");
      document.documentElement.style.setProperty("--background", "#0a0b0f");
      document.documentElement.style.setProperty("--foreground", "#f0ede8");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.style.setProperty("--background", "#f5f0e8");
      document.documentElement.style.setProperty("--foreground", "#1a1a2e");
    }
  }, [isDarkMode]);

  return <>{children}</>;
}
