// Client-only: draws the page content (the app's <main>) into a small JPEG
// data URL for the Send feedback sheet. Never throws and never blocks the
// message: any failure or a slow capture resolves to null.

import "client-only";
import { toCanvas } from "html-to-image";

/** The longest side of the picture we keep, in pixels. */
const LONGEST_SIDE_PX = 1000;
const JPEG_QUALITY = 0.7;
const GIVE_UP_MS = 4000;
/** Elements this far past the window edge are still drawn, so nothing pops at the border. */
const OFFSCREEN_MARGIN_PX = 200;
/** If this many nodes would still be copied, the page is too big to draw quickly, so we skip. */
const MAX_NODES = 3000;

/**
 * Takes the picture of `<main>` as it is right now. Only the part of `<main>`
 * inside the window is drawn: the library is told the size of that visible
 * rectangle, and the copy of `<main>` it draws is slid up and left by how far
 * the page is scrolled, so the visible part lands at the top left of the
 * picture. An element wholly outside the window keeps its own empty shell (the
 * library copies its resolved width and height, so the layout does not move)
 * but its contents are left out, which keeps a very long page (expanded
 * Inventory) fast. The
 * page's own background colour is painted behind it, so dark mode keeps its
 * dark look.
 */
export function captureScreenshot(): Promise<string | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), GIVE_UP_MS));
  return Promise.race([draw().catch(() => null), timeout]);
}

// True when the element sits wholly outside the window, plus the margin, on any side.
function isWhollyOutside(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  return (
    rect.bottom < -OFFSCREEN_MARGIN_PX ||
    rect.top > window.innerHeight + OFFSCREEN_MARGIN_PX ||
    rect.right < -OFFSCREEN_MARGIN_PX ||
    rect.left > window.innerWidth + OFFSCREEN_MARGIN_PX
  );
}

// True when the element's children cannot pass their top or bottom margins out
// through it (flex, grid and similar boxes, clipped boxes, or padding or a
// border at both ends). Margins that do pass through are part of the
// element's own spacing, so losing the child would move everything after it.
function containsMargins(element: Element): boolean {
  const style = getComputedStyle(element);
  if (/flex|grid|flow-root|table|inline-block/.test(style.display)) return true;
  if (style.overflowX !== "visible" || style.overflowY !== "visible") return true;
  if (style.position === "absolute" || style.position === "fixed" || style.float !== "none") return true;
  const top = parseFloat(style.paddingTop) > 0 || parseFloat(style.borderTopWidth) > 0;
  const bottom = parseFloat(style.paddingBottom) > 0 || parseFloat(style.borderBottomWidth) > 0;
  return top && bottom;
}

// A node is dropped when its parent is wholly outside the window, except that
// a parent which lets margins through keeps its first and last child element
// (the only two whose margins can pass out) and inline parents keep everything
// (an inline box with no contents would collapse). Kept children are empty
// shells in their turn, so the cost stays small.
function isKept(node: Node, root: Element): boolean {
  const parent = node.parentElement;
  if (!parent || node === root) return true;
  if (!isWhollyOutside(parent)) return true;
  if (getComputedStyle(parent).display.startsWith("inline")) return true;
  if (node.nodeType !== 1) return false;
  if (containsMargins(parent)) return false;
  return node === parent.firstElementChild || node === parent.lastElementChild;
}

function countKept(element: Element, root: Element, limit: number): number {
  let count = 1;
  for (const child of Array.from(element.children)) {
    if (!isKept(child, root)) continue;
    count += countKept(child, root, limit - count);
    if (count > limit) return count;
  }
  return count;
}

// Only <body> paints the page colour; <main> and <html> are transparent.
function pageBackground(): string {
  return getComputedStyle(document.body).backgroundColor;
}

async function draw(): Promise<string | null> {
  const main = document.querySelector("main");
  if (!main) return null;

  const box = main.getBoundingClientRect();
  const left = Math.max(0, -box.left);
  const top = Math.max(0, -box.top);
  const width = Math.min(box.width, window.innerWidth - box.left) - left;
  const height = Math.min(box.height, window.innerHeight - box.top) - top;
  if (width < 1 || height < 1) return null;

  if (countKept(main, main, MAX_NODES) > MAX_NODES) return null;

  const scale = Math.min(1, LONGEST_SIDE_PX / Math.max(width, height));
  const background = pageBackground();
  const canvas = await toCanvas(main as HTMLElement, {
    pixelRatio: scale,
    cacheBust: true,
    backgroundColor: background,
    // The picture is the visible rectangle; <main> keeps its full size and is
    // shifted so that rectangle sits at the top left (the svg clips the rest).
    width,
    height,
    style: {
      width: `${box.width}px`,
      height: `${box.height}px`,
      // <main> is centred with auto margins, which the library would copy onto the picture.
      margin: "0",
      transformOrigin: "0 0",
      transform: `translate(${-left}px, ${-top}px)`,
    },
    // Contents of anything wholly outside the window are skipped; the empty
    // shells stay at full size so the layout above the window does not move.
    filter: (node) => isKept(node, main),
  });

  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(width * scale));
  out.height = Math.max(1, Math.round(height * scale));
  const context = out.getContext("2d");
  if (!context) return null;
  context.fillStyle = background;
  context.fillRect(0, 0, out.width, out.height);
  context.drawImage(canvas, 0, 0, out.width, out.height);
  const url = out.toDataURL("image/jpeg", JPEG_QUALITY);
  return url.startsWith("data:image/jpeg") ? url : null;
}
