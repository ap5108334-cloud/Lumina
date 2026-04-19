"use client";

import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useTheme = create<ThemeState>((set) => ({
  theme: "dark",

  setTheme: (theme) => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("lumina-theme", theme);
    set({ theme });
  },

  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(newTheme);
      localStorage.setItem("lumina-theme", newTheme);
      return { theme: newTheme };
    });
  },
}));

export function initializeTheme() {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("lumina-theme") as Theme | null;
  const theme = stored || "dark";
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
  return theme;
}
