"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

// Swipe a list row right-to-left to reveal a Delete button — the iOS Mail /
// Reminders gesture, which is what the household already expects from a
// list on a phone.
//
// THREE THINGS MAKE THIS FEEL RIGHT RATHER THAN BROKEN, and they're the
// reason this is a shared component instead of copy-pasted per row:
//
// 1. It must never steal vertical scrolling. Inventory is hundreds of rows
//    long; a swipe handler that grabs every drag makes the page unscrollable
//    on a phone. So a gesture stays UNDECIDED until the finger has moved far
//    enough to judge its direction: more horizontal than vertical locks into
//    a swipe, otherwise we bail out permanently for that gesture and let the
//    browser scroll. `touch-action: pan-y` tells the browser the same thing.
//
// 2. A swipe must not fire the buttons it passes over. Rows contain a
//    stepper, a cart button, and a tap-to-edit surface — without
//    suppression, ending a swipe on top of "+" would also increment the
//    quantity. Once a gesture locks into a swipe, the next click is
//    swallowed in the capture phase, before it reaches any child.
//
// 3. The Delete button is always in the DOM, not conditionally rendered.
//    It's only hidden *visually*, behind the row. That keeps it reachable
//    by keyboard and screen readers, which a swipe gesture alone never is —
//    this is what makes it safe to have removed the always-visible × that
//    grocery rows used to carry.
//
// Deliberately NOT a confirmation step: the house rule is that delete is
// immediate and unconfirmed everywhere. The swipe itself is already the
// deliberate act, same as it is on iOS.

/** How far the row slides open — wide enough for a 48px-plus tap target. */
const ACTION_WIDTH = 88;

/** Past this much horizontal travel, the gesture is committed to a swipe
 * (or, if vertical won, to scrolling). Small enough to feel responsive,
 * large enough that a sloppy tap isn't read as a drag. */
const DIRECTION_LOCK_PX = 8;

/** Released past this, the row snaps open instead of closed. */
const OPEN_THRESHOLD = ACTION_WIDTH / 2;

type GestureMode = "idle" | "undecided" | "swiping" | "scrolling";

export function SwipeToDelete({
  onDelete,
  deleteLabel,
  children,
}: {
  onDelete: () => void;
  /** Spoken by screen readers, e.g. "Delete Cheddar cheese". */
  deleteLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);

  const mode = useRef<GestureMode>("idle");
  const start = useRef({ x: 0, y: 0 });
  // The gesture's own source of truth for how far the row has moved.
  // Deliberately a ref and not the `dragX` state: React batches state
  // updates, so several pointermove events landing in one task leave
  // `dragX` stale, and the release then reads 0 and snaps the row shut on
  // a swipe that clearly should have opened it. State drives rendering,
  // this drives the decision.
  const offsetRef = useRef(0);
  // Set the moment a gesture becomes a swipe; read by the capture-phase
  // click handler to decide whether to swallow the click that follows.
  const swallowNextClick = useRef(false);

  function handlePointerDown(event: React.PointerEvent) {
    // Mouse right/middle click has no business starting a swipe.
    if (event.pointerType === "mouse" && event.button !== 0) return;
    mode.current = "undecided";
    start.current = { x: event.clientX, y: event.clientY };
    offsetRef.current = open ? -ACTION_WIDTH : 0;
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (mode.current === "idle" || mode.current === "scrolling") return;

    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;

    if (mode.current === "undecided") {
      if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) {
        return; // too early to tell
      }
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical wins — this is a scroll. Stay out of the way for the
        // rest of this gesture.
        mode.current = "scrolling";
        return;
      }
      mode.current = "swiping";
      swallowNextClick.current = true;
      // Keep receiving events even if the finger leaves this row. Guarded
      // because setPointerCapture throws when the pointer isn't currently
      // active, and an exception here would abandon the gesture halfway —
      // the row would follow the finger and then never settle. Capture is
      // a nicety; the swipe still works without it.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Not capturable — carry on uncaptured.
      }
    }

    // Only ever opens leftward. Dragging right from closed does nothing;
    // from open it closes.
    const base = open ? -ACTION_WIDTH : 0;
    const next = Math.max(-ACTION_WIDTH, Math.min(0, base + dx));
    offsetRef.current = next;
    setDragX(next);
  }

  function endGesture() {
    if (mode.current === "swiping") {
      setOpen(offsetRef.current <= -OPEN_THRESHOLD);
    }
    mode.current = "idle";
    setDragX(null);
  }

  // A click lands after pointerup. If the gesture was a swipe, stop that
  // click before any child button sees it.
  function handleClickCapture(event: React.MouseEvent) {
    if (!swallowNextClick.current) return;
    swallowNextClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  // While open, a tap anywhere on the row closes it rather than doing what
  // the row normally does — same as iOS.
  function handleRowPointerDownCapture(event: React.PointerEvent) {
    if (open && mode.current === "idle") {
      setOpen(false);
      swallowNextClick.current = true;
      event.stopPropagation();
    }
  }

  const offset = dragX ?? (open ? -ACTION_WIDTH : 0);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Sits behind the row; revealed as the row slides left. Always
          rendered so it stays keyboard- and screen-reader-reachable. */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onDelete();
          }}
          aria-label={deleteLabel}
          style={{ width: ACTION_WIDTH }}
          className="flex flex-col items-center justify-center gap-0.5 bg-danger text-xs font-semibold text-white transition-opacity active:opacity-80"
        >
          <Trash2 aria-hidden="true" size={18} />
          Delete
        </button>
      </div>

      <div
        onPointerDown={handlePointerDown}
        onPointerDownCapture={handleRowPointerDownCapture}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onClickCapture={handleClickCapture}
        // pan-y: vertical scrolling belongs to the browser, horizontal to us.
        className="relative touch-pan-y bg-surface"
        style={{
          transform: `translateX(${offset}px)`,
          // Animate the snap, but follow the finger instantly while dragging.
          transition: dragX === null ? "transform 180ms ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
