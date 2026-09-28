import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { APP_VERSION } from "../../app/version";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const settingsPageSource = readFileSync(
  join(featureDirectory, "SettingsPage.tsx"),
  "utf-8",
);

describe("settings application information section", () => {
  it("renders an Application Information section", () => {
    expect(settingsPageSource).toContain("Application Information");
  });

  it("labels the displayed value as Version", () => {
    expect(settingsPageSource).toContain("Version");
  });

  it("renders the version through the application version boundary", () => {
    expect(settingsPageSource).toContain("{APP_VERSION}");
  });

  it("imports the version from the application version module", () => {
    expect(settingsPageSource).toContain(
      'import { APP_VERSION } from "../../app/version"',
    );
  });

  it("does not hard-code the version literal in the Settings page", () => {
    expect(settingsPageSource).not.toContain(`>${APP_VERSION}<`);
  });

  it("leaves the unrelated backup version display unchanged", () => {
    expect(settingsPageSource).toContain("Backup version");
    expect(settingsPageSource).toContain("selectedBackup.backup.version");
  });
});
