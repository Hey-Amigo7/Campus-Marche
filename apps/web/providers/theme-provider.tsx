"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeId = "classic" | "midnight" | "dune" | "lagoon" | "canopy";

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  description: string;
  swatch: string;
  accent: string;
};

export const THEMES: ThemeDefinition[] = [
  {
    id: "classic",
    label: "Campus Classic",
    description: "Warm cream · Navy · Sage",
    swatch: "#FAF7F2",
    accent: "#7FB685",
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Dark navy · Soft glow",
    swatch: "#0D1117",
    accent: "#3FB950",
  },
  {
    id: "dune",
    label: "Dune",
    description: "Sand · Amber · Terracotta",
    swatch: "#FFFBF5",
    accent: "#D97706",
  },
  {
    id: "lagoon",
    label: "Lagoon",
    description: "Ocean blue · Cyan · Crisp",
    swatch: "#F0F9FF",
    accent: "#0891B2",
  },
  {
    id: "canopy",
    label: "Canopy",
    description: "Forest green · Earth tones",
    swatch: "#F0FDF4",
    accent: "#16A34A",
  },
];

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  definition: ThemeDefinition;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "classic",
  setTheme: () => {},
  definition: THEMES[0]!,
});

const STORAGE_KEY = "campus-marche-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("classic");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      applyTheme(stored);
      setThemeState(stored);
    }
  }, []);

  function setTheme(id: ThemeId) {
    setThemeState(id);
    localStorage.setItem(STORAGE_KEY, id);
    applyTheme(id);
  }

  const definition = (THEMES.find((t) => t.id === theme) ?? THEMES[0])!;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, definition }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyTheme(id: ThemeId) {
  const html = document.documentElement;
  THEMES.forEach((t) => html.removeAttribute(`data-theme-${t.id}`));
  if (id !== "classic") {
    html.setAttribute("data-theme", id);
  } else {
    html.removeAttribute("data-theme");
  }
}

export function useTheme() {
  return useContext(ThemeContext);
}
