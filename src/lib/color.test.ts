// Real unit tests (node:test, zero new dependencies) for color.ts's own
// exports — this file exists solely to hold hexToRgba after mission-10/C3
// hoisted it out of MonthCell.tsx and EventCard.tsx's two byte-identical
// private copies. mission-17/C5 added `bandedBackground` for the same
// reason: MonthCell.tsx's `pillBackground` and TimelineGrid.tsx's
// `blockBackground` were a second byte-identical pair. Mission 77 replaced
// that with `personFill` (solid when live, a wash plus stripe when faded).

import { test } from "node:test";
import assert from "node:assert/strict";
import { hexToRgba, personFill } from "./color";
import { AVATAR_COLORS } from "./constants";

test("hexToRgba: converts a 6-digit hex string with the given alpha", () => {
  assert.equal(hexToRgba("#000000", 0.1), "rgba(0, 0, 0, 0.1)");
  assert.equal(hexToRgba("#ffffff", 1), "rgba(255, 255, 255, 1)");
});

test("hexToRgba: reads each channel from its own 2-digit slice", () => {
  // #1a2b3c -> r=0x1a=26, g=0x2b=43, b=0x3c=60 — a value where every
  // channel differs catches a slice-offset mistake a same-value test like
  // #000000/#ffffff can't.
  assert.equal(hexToRgba("#1a2b3c", 0.5), "rgba(26, 43, 60, 0.5)");
});

test("hexToRgba: passes alpha through unchanged, including 0", () => {
  assert.equal(hexToRgba("#336699", 0), "rgba(51, 102, 153, 0)");
  assert.equal(hexToRgba("#336699", 0.05), "rgba(51, 102, 153, 0.05)");
});

test("personFill: no people is today's flat fallback with no text treatment of its own", () => {
  for (const faded of [false, true]) {
    const fill = personFill([], faded, 4);
    assert.equal(fill.look, "none");
    assert.equal(fill.background, "var(--surface-2)");
    assert.equal(fill.textClass, "");
    assert.deepEqual(fill.style, { backgroundColor: "var(--surface-2)" });
  }
});

test("personFill: live with people is solid bands at full strength, white text, no stripe", () => {
  const fill = personFill(["#000000", "#ffffff"], false, 4);
  assert.equal(fill.look, "solid");
  assert.equal(fill.textClass, "text-white");
  assert.equal(fill.background, "linear-gradient(135deg, #000000 0%, #000000 50%, #ffffff 50%, #ffffff 100%)");
  assert.equal(fill.style.borderLeftColor, undefined);
  assert.equal(fill.style.borderLeftWidth, undefined);
  assert.equal(fill.style.backgroundImage, fill.background);
});

test("personFill: faded is a 15% wash over the surface, muted-strong text, stripe in the FIRST hex", () => {
  const fill = personFill(["#336699", "#ffffff"], true, 4);
  assert.equal(fill.look, "faded");
  assert.equal(fill.textClass, "text-muted-strong");
  assert.equal(
    fill.background,
    "linear-gradient(135deg, rgba(51, 102, 153, 0.15) 0%, rgba(51, 102, 153, 0.15) 50%, " +
      "rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 100%), var(--surface)",
  );
  assert.equal(fill.style.borderLeftColor, "#336699");
  assert.equal(fill.style.borderLeftWidth, "4px");
  assert.equal(fill.style.backgroundColor, "var(--surface)");
  assert.ok(fill.style.backgroundImage?.startsWith("linear-gradient("));
});

test("personFill: style never uses the background shorthand (it would reset backgroundOrigin on re-render)", () => {
  for (const [hexes, faded] of [[[], false], [["#336699"], false], [["#336699"], true]] as const) {
    assert.equal("background" in personFill([...hexes], faded, 4).style, false);
  }
});

test("personFill: a stripe width of 0 draws no stripe (a Month bar's continuing segment)", () => {
  const fill = personFill(["#336699"], true, 0);
  assert.equal(fill.look, "faded");
  assert.equal(fill.style.borderLeftColor, undefined);
  assert.equal(fill.style.borderLeftWidth, undefined);
});

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

test("AVATAR_COLORS: white text clears 4.5:1 on every swatch", () => {
  for (const { name, hex } of AVATAR_COLORS) {
    const ratio = 1.05 / (luminance(hex) + 0.05);
    assert.ok(ratio >= 4.5, `${name} ${hex} is ${ratio.toFixed(2)}:1`);
  }
});
