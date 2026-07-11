export type ThemePreference = "dark" | "light" | "system";

export interface AppSetting {
  key: string;
  value: unknown;
  updatedAt: Date;
}