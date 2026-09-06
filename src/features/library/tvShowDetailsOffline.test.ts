import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const featureDirectory = dirname(fileURLToPath(import.meta.url));

const tvDetailsSource = readFileSync(
  join(featureDirectory, "TvShowDetailsPage.tsx"),
  "utf-8",
);

/*
 * The Vitest environment is node-only (no DOM), so the page cannot be mounted
 * here (see tvDetailsTheme.test.ts / routerSplitting.test.ts for the same
 * convention). These assertions pin the Alpha 18 offline-hardening wiring:
 *
 *  - the reactive online state from the existing useOnlineStatus hook is
 *    consumed and forwarded to BOTH service calls via the existing
 *    canUseNetwork contract, so offline never blocks local-first rendering;
 *  - the season error state exposes a Retry control that reuses the existing
 *    handleSelectSeason season-loading path.
 */

function callSite(source: string, callName: string): string {
  const callIndex = source.indexOf(callName);

  if (callIndex === -1) {
    throw new Error(`Expected ${callName} to be called.`);
  }

  return source.slice(callIndex, callIndex + 600);
}

describe("TvShowDetailsPage offline hardening", () => {
  it("consumes the existing reactive online status hook", () => {
    expect(tvDetailsSource).toContain(
      'import { useOnlineStatus } from "../../app/useOnlineStatus";',
    );
    expect(tvDetailsSource).toContain("const isOnline = useOnlineStatus();");
  });

  it("passes the reactive online state to loadTvShowDetails", () => {
    const detailsCall = callSite(tvDetailsSource, "loadTvShowDetails(");

    expect(detailsCall).toContain("canUseNetwork: () => isOnline");
    // Local-first rendering must remain intact: local data still wins.
    expect(detailsCall).toContain("onLocalData");
  });

  it("passes the reactive online state to loadSeasonEpisodes", () => {
    const seasonCall = callSite(tvDetailsSource, "loadSeasonEpisodes(");

    expect(seasonCall).toContain("canUseNetwork: () => isOnline");
    // Local-first rendering must remain intact: local data still wins.
    expect(seasonCall).toContain("onLocalData");
  });

  it("re-runs the details load when connectivity changes so reconnect enriches", () => {
    expect(tvDetailsSource).toContain(
      "[mediaId, reloadToken, isOnline]",
    );
  });

  it("exposes a Retry control in the season error state", () => {
    // Anchor on the rendered season-error JSX branch (the ternary
    // `seasonError ? (`), not the first textual mention of `seasonError`,
    // which is its useState declaration further up the file.
    const errorBlockStart = tvDetailsSource.indexOf("seasonError ? (");

    expect(errorBlockStart).toBeGreaterThan(-1);

    const errorBlock = tvDetailsSource.slice(
      errorBlockStart,
      errorBlockStart + 1200,
    );

    expect(errorBlock).toContain("Retry");
    expect(errorBlock).toContain("RotateCcw");
    // Retry must reuse the existing season-loading path, not a new fetch.
    expect(errorBlock).toContain(
      "handleSelectSeason(selectedSeasonNumber)",
    );
  });

  it("does not reintroduce a second independent season-loading implementation", () => {
    expect(tvDetailsSource.match(/loadSeasonEpisodes\(/g)?.length).toBe(1);
  });
});
