export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "jacked.theme";

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): "light" | "dark" {
  if (preference === "system") {
    return systemDark ? "dark" : "light";
  }
  return preference;
}
