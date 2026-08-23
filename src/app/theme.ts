import { createContext, useContext } from "react";

import { settingsRepository } from "../database/repositories";

import type { ThemePreference } from "../types";

export const THEME_SETTING_KEY = "theme";

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = [
  "dark",
  "light",
  "system",
];

export const SYSTEM_COLOR_SCHEME_QUERY = "(prefers-color-scheme: light)";

export type ResolvedTheme = "dark" | "light";

export interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" &&
    THEME_PREFERENCES.includes(value as ThemePreference)
  );
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersLight: boolean,
): ResolvedTheme {
  if (preference === "light") {
    return "light";
  }

  if (preference === "system") {
    return systemPrefersLight ? "light" : "dark";
  }

  return "dark";
}

export function getSystemPrefersLight(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }

  try {
    return window.matchMedia(SYSTEM_COLOR_SCHEME_QUERY).matches;
  } catch {
    return false;
  }
}

export function applyThemeAttribute(theme: ResolvedTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);
}

export async function loadThemePreference(): Promise<ThemePreference> {
  const storedPreference =
    await settingsRepository.get<string>(THEME_SETTING_KEY);

  return isThemePreference(storedPreference)
    ? storedPreference
    : DEFAULT_THEME_PREFERENCE;
}

export async function saveThemePreference(
  preference: ThemePreference,
): Promise<void> {
  await settingsRepository.set(THEME_SETTING_KEY, preference);
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }

  return context;
}
