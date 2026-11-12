// When the Calendar asks Google for news by itself (mission 75, PR 9). Pure:
// the clock and the page's visibility come in as arguments. The server still
// decides what is really pulled (a lease per calendar, 5 minutes unforced);
// these rules only decide when the page asks. Answer 2 of
// .avengers/plans/calendar-fullscreen-v1.md: the kitchen tablet checks on a
// timer only if it was touched in the last 10 minutes, which protects the
// free database hours.

/** How often the open, visible Calendar asks (the server's own unforced limit). */
export const AUTO_PULL_EVERY_MS = 5 * 60 * 1000;

/** How recently the Tablet must have been touched for the timer to run. */
export const TABLET_TOUCH_WINDOW_MS = 10 * 60 * 1000;

/**
 * Should the timer's tick pull? Never while the page is hidden. Any login
 * other than the Tablet always may. The Tablet only if its last touch is
 * inside the window (a touch exactly at the window's edge counts as outside).
 */
export function shouldTimerPull(args: {
  hidden: boolean;
  isTablet: boolean;
  lastTouchAt: number;
  now: number;
}): boolean {
  if (args.hidden) return false;
  if (!args.isTablet) return true;
  return args.now - args.lastTouchAt < TABLET_TOUCH_WINDOW_MS;
}

/**
 * Should a touch pull right away? Only the Tablet, and only when the touch
 * ends a quiet spell of the full window or more (the tap that wakes the
 * screensaver). Everyone else already has the timer and the return-to-front
 * check, so a tap never pulls.
 */
export function shouldTouchPull(args: { isTablet: boolean; lastTouchAt: number; now: number }): boolean {
  return args.isTablet && args.now - args.lastTouchAt >= TABLET_TOUCH_WINDOW_MS;
}
