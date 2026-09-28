import { readFileSync } from "node:fs";

import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import packageJson from "../../package.json";

import { APP_VERSION } from "./version";

describe("application version", () => {
  it("exposes the version declared in the authoritative package.json", () => {
    expect(APP_VERSION).toBe(packageJson.version);
  });

  it("reports a non-empty semantic version string", () => {
    expect(APP_VERSION).toBe("1.0.0");
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("reads the version from package.json rather than duplicating it", () => {
    const versionSource = readFileSync(
      resolve(process.cwd(), "src", "app", "version.ts"),
      "utf-8",
    );

    // The boundary must derive the value from package.json, so the version
    // literal may only appear as the imported binding, never as a second
    // manually maintained constant.
    expect(versionSource).toContain('from "../../package.json"');
    expect(versionSource).toMatch(/APP_VERSION\s*:\s*string\s*=\s*packageVersion/);
    expect(versionSource).not.toMatch(/APP_VERSION[^=\n]*=\s*["']\d+\.\d+\.\d+["']/);
  });
});
