import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { PersistedMedia } from "../../../types";
import AddMediaToCollectionModal from "./AddMediaToCollectionModal";

/**
 * Regression tests for the AddMediaToCollectionModal infinite render bug.
 *
 * Root cause: the modal previously called setHasResetOnOpen(false) during
 * render whenever isOpen was false. Because CollectionDetailPage always
 * mounts the modal (even when closed), this created a render loop.
 *
 * The fix removes hasResetOnOpen entirely and follows the EditMediaModal
 * pattern: the search/pending state lives in a child form component that
 * remounts via a key prop each time the dialog opens, so state is reset
 * naturally without any setState-in-effect. There is no render-time setState,
 * so the parent can safely always mount this modal (even closed) without
 * triggering a render loop.
 */
describe("AddMediaToCollectionModal render loop regression", () => {
  const sourcePath = path.join(
    __dirname,
    "AddMediaToCollectionModal.tsx",
  );

  it("does not call setState during render when isOpen is false", () => {
    const source = fs.readFileSync(sourcePath, "utf-8");

    expect(source).not.toContain("hasResetOnOpen");
    expect(source).not.toMatch(
      /if\s*\(\s*!\s*isOpen\s*\)\s*\{[\s\S]*?setHasResetOnOpen/,
    );
  });

    it("resets form state via child-component key remount, not setState-in-effect", () => {
    const source = fs.readFileSync(sourcePath, "utf-8");

    // The reset is achieved by rendering a keyed child form component
    // (matching the EditMediaModal pattern). The form uses its own local
    // useState, so a remount naturally resets search/pending state.
    expect(source).toContain("AddMediaToCollectionForm");
    expect(source).toMatch(/<AddMediaToCollectionForm[\s\S]*?key\s*=\s*["']/);

    // setSearchTerm and setPendingId are called by the child form component's
    // event handlers and useState initializers — never inside a useEffect.
    // Extract every useEffect body and confirm none of them call setState.
    const effectBodies = source.match(/useEffect\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}/g) || [];
    for (const body of effectBodies) {
      expect(body).not.toMatch(/setSearchTerm/);
      expect(body).not.toMatch(/setPendingId/);
    }
  });

  it("does not contain any render-time setState synchronization pattern", () => {
    const source = fs.readFileSync(sourcePath, "utf-8");

    const renderTimeSetStatePattern =
      /^\s*if\s*\([^)]*\)\s*\{[^}]*set[A-Z]\w*\([^}]*\)\s*;\s*\}/gm;
    const matches = source.match(renderTimeSetStatePattern) || [];

    const problematicMatches = matches.filter((match) => {
      const matchIndex = source.indexOf(match);
      const precedingText = source.substring(
        Math.max(0, matchIndex - 500),
        matchIndex,
      );
      return !precedingText.includes("useEffect");
    });

    expect(problematicMatches).toHaveLength(0);
  });

  /*
   * Regression test: renders the actual component with isOpen={false}
   * — the initial state CollectionDetailPage always hands it. The fixed
   * implementation returns null early when !isOpen. If the buggy
   * render-time setState regressed, React would throw "Maximum update
   * depth exceeded" during render.
   */
  it("renders to completion without an infinite loop when isOpen is false", () => {
    const mediaItems: PersistedMedia[] = [
      {
        id: 1,
        title: "Breaking Bad",
        mediaType: "tv",
        tmdbId: 1396,
        posterPath: "/poster.jpg",
        userStatus: "watching" as const,
        createdAt: new Date("2020-01-01"),
        updatedAt: new Date("2020-01-02"),
      },
    ];

    const noop = () => undefined;

    const element = React.createElement(AddMediaToCollectionModal, {
      isOpen: false,
      isSaving: false,
      mediaItems,
      onClose: noop,
      onAdd: async () => undefined,
    });

    const html = renderToStaticMarkup(element);

    expect(html).toBe("");
  });

  /*
   * The key-prop remount pattern: when the modal is open, a child form
   * component is rendered with a stable key, so it remounts cleanly on each
   * open. This test verifies the pattern is structurally present in source.
   */
  it("uses a key-remount child component for form state isolation", () => {
    const source = fs.readFileSync(sourcePath, "utf-8");

    // Child component exists and is keyed by the parent
    expect(source).toContain("function AddMediaToCollectionForm");
    expect(source).toMatch(/<AddMediaToCollectionForm[\s\S]*?key=/);
  });
});