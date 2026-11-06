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

/**
 * Takes the picture of `<main>` as it is right now. Only the part of `<main>`
 * inside the window is drawn: the library is told the size of that visible
 * rectangle, and the copy of `<main>` it draws is slid up and left by how far
 * the page is scrolled, so the visible part lands at the top left of the
 * picture. Elements wholly below or to the right of the window are left out
 * of the copy, which keeps a very long page (expanded Inventory) fast. The
 * page's own background colour is painted behind it, so dark mode keeps its
 * dark look.
 */
export function captureScreenshot(): Promise<string | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), GIVE_UP_MS));
  return Promise.race([draw().catch(() => null), timeout]);
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

  const scale = Math.min(1, LONGEST_SIDE_PX / Math.max(width, height));
  const background = pageBackground();
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;
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
      transformOrigin: "0 0",
      transform: `translate(${-left}px, ${-top}px)`,
    },
    // Skip anything entirely below or right of the window. Things above or to
    // the left stay, because removing them would pull the rest out of place.
    filter: (node) => {
      if (node.nodeType !== 1) return true;
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return true;
      return rect.top < viewHeight + OFFSCREEN_MARGIN_PX && rect.left < viewWidth + OFFSCREEN_MARGIN_PX;
    },
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
