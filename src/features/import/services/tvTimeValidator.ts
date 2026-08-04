const REQUIRED_FILES = [
  "followed_tv_show.csv",
  "user_tv_show_data.csv",
  "seen_episode_latest.csv",
  "show_seen_episode_latest.csv",
] as const;

export interface ValidationResult {
  valid: boolean;
  found: string[];
  missing: string[];
}

export function validateTvTimeFiles(fileNames: string[]): ValidationResult {
  const normalized = fileNames.map((file) => file.split("/").pop() ?? file);

  const found = REQUIRED_FILES.filter((file) => normalized.includes(file));

  const missing = REQUIRED_FILES.filter((file) => !normalized.includes(file));

  return {
    valid: missing.length === 0,
    found,
    missing,
  };
}
