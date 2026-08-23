import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  applyThemeAttribute,
  DEFAULT_THEME_PREFERENCE,
  getSystemPrefersLight,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  SYSTEM_COLOR_SCHEME_QUERY,
  ThemeContext,
  type ResolvedTheme,
} from "./theme";

import type { ThemePreference } from "../types";

interface ThemeProviderProps {
  children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const [preference, setPreference] = useState<ThemePreference>(
    DEFAULT_THEME_PREFERENCE,
  );

  const [systemPrefersLight, setSystemPrefersLight] = useState<boolean>(() =>
    getSystemPrefersLight(),
  );

  useEffect(() => {
    let isActive = true;

    loadThemePreference()
      .then((storedPreference) => {
        if (isActive) {
          setPreference(storedPreference);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load theme preference:", error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const mediaQuery = window.matchMedia(SYSTEM_COLOR_SCHEME_QUERY);

    function handleSystemColorSchemeChange(event: MediaQueryListEvent): void {
      setSystemPrefersLight(event.matches);
    }

    mediaQuery.addEventListener("change", handleSystemColorSchemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemColorSchemeChange);
    };
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(
    () => resolveTheme(preference, systemPrefersLight),
    [preference, systemPrefersLight],
  );

  useEffect(() => {
    applyThemeAttribute(resolvedTheme);
  }, [resolvedTheme]);

  const updatePreference = useCallback(
    (nextPreference: ThemePreference): void => {
      setPreference(nextPreference);

      saveThemePreference(nextPreference).catch((error: unknown) => {
        console.error("Failed to persist theme preference:", error);
      });
    },
    [],
  );

  const contextValue = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference: updatePreference,
    }),
    [preference, resolvedTheme, updatePreference],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}
