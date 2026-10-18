import { describe, expect, it } from "vitest";

import {
  clampSpan,
  defaultSizeFor,
  resolveSizes,
  resizeDownFrom,
  resizeUpFrom,
} from "./widgetGridConstraints";

const definition = {
  defaultSize: { w: 8, h: 2 },
  minSize: { w: 4, h: 1 },
  supportedSizes: [
    { w: 4, h: 1 },
    { w: 6, h: 2 },
    { w: 8, h: 2 },
    { w: 12, h: 2 },
  ],
};

describe("widget grid constraints", () => {
  it("uses only supported dimensions and enforces registry minimums", () => {
    expect(clampSpan({ w: 1, h: 0 }, definition)).toEqual({ w: 4, h: 1 });
    expect(clampSpan({ w: 7, h: 2 }, definition)).toEqual({ w: 6, h: 2 });
    expect(clampSpan({ w: 24, h: 9 }, definition)).toEqual({ w: 12, h: 2 });
    expect(resolveSizes(definition)).toEqual([
      { w: 4, h: 1 },
      { w: 6, h: 2 },
      { w: 8, h: 2 },
      { w: 12, h: 2 },
    ]);
  });

  it("steps only through supported sizes", () => {
    const sizes = resolveSizes(definition);

    expect(resizeUpFrom(sizes[0], sizes)).toEqual(sizes[1]);
    expect(resizeUpFrom(sizes[3], sizes)).toEqual(sizes[3]);
    expect(resizeDownFrom(sizes[2], sizes)).toEqual(sizes[1]);
    expect(resizeDownFrom(sizes[0], sizes)).toEqual(sizes[0]);
  });

  it("uses a validated registry default when no sizes are listed", () => {
    expect(resolveSizes({ ...definition, supportedSizes: [] })).toEqual([
      definition.defaultSize,
    ]);
    expect(defaultSizeFor(definition)).toEqual(definition.defaultSize);
    expect(defaultSizeFor(definition)).not.toBe(definition.defaultSize);
  });

  it("rejects a default size that is absent from supported sizes", () => {
    expect(() =>
      resolveSizes({
        ...definition,
        defaultSize: { w: 10, h: 2 },
      }),
    ).toThrow(RangeError);
  });
});
