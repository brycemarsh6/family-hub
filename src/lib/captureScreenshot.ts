// Client-only: draws the page content (the app's <main>) into a small JPEG
// data URL for the Send feedback sheet. Never throws and never blocks the
// message: any failure or a slow capture resolves to null.

import "client-only";
import { toCanvas } from "html-to-image";

/** The longest side of the picture we keep, in pixels. */
const LONGEST_SIDE_PX = 1000;
const JPEG_QUALITY = 0.7;
const GIVE_UP_MS = 4000;

/**
 * Takes the picture of `<main>` as it is right now. The crop works in three
 * steps: measure which part of `<main>` is inside the window at this moment,
 * redraw the whole of `<main>` at a scale that already makes the visible part
 * at most 1000 px on its longest side, then copy only that visible rectangle
 * onto a fresh canvas and save it as a JPEG.
 */
export function captureScreenshot(): Promise<string | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), GIVE_UP_MS));
  return Promise.race([draw().catch(() => null), timeout]);
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
  const whole = await toCanvas(main as HTMLElement, { pixelRatio: scale, cacheBust: true });

  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(width * scale));
  out.height = Math.max(1, Math.round(height * scale));
  const context = out.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, out.width, out.height);
  context.drawImage(
    whole,
    Math.round(left * scale),
    Math.round(top * scale),
    out.width,
    out.height,
    0,
    0,
    out.width,
    out.height,
  );
  const url = out.toDataURL("image/jpeg", JPEG_QUALITY);
  return url.startsWith("data:image/jpeg") ? url : null;
}
