import { describe, expect, it } from "vitest";
import { mixAdditiveColors } from "./botcheeColors";

describe("additive player-color mixing", () => {
  it("uses screen blending so light channels combine additively", () => {
    expect(mixAdditiveColors("#ff0000", "#00ff00")).toBe("#ffff00");
    expect(mixAdditiveColors("#000000", "#123456")).toBe("#123456");
    expect(mixAdditiveColors("#ffffff", "#ffffff")).toBe("#ffffff");
  });

  it("rejects colors outside the validated six-digit hex format", () => {
    expect(() => mixAdditiveColors("red", "#ffffff")).toThrow(
      "Additive color mixing requires six-digit hex colors.",
    );
  });
});
