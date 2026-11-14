"use client";

import { Moon, Sun } from "lucide-react";

import { THEME_STORAGE_KEY } from "@/lib/theme";

export function ThemeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
    } catch {
      // Private mode or storage disabled: theme still applies for this page.
    }
  }

  // Both icons render; CSS shows the right one, so server and client HTML match.
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="text-muted-foreground hover:text-foreground hover:bg-muted -m-2 inline-flex size-9 items-center justify-center rounded-md transition-colors"
    >
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
    </button>
  );
}
