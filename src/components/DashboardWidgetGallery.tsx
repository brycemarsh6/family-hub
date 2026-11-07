"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import DashboardWidgetPreview from "./DashboardWidgetPreview";
import { DASHBOARD_WIDGETS, WIDGET_SIZE_LABELS } from "@/lib/dashboardWidgets";
import type { DashboardWidgetKind, WidgetSize } from "@/lib/dashboardWidgets";

/**
 * The size picker (decision 206): a horizontal swipe strip of drawn previews,
 * one per size the kind allows, with dots under it when there are two or more.
 * CSS scroll snap does the swiping. Every preview is a real button
 * (`aria-pressed`, named by its size), so nothing needs the swipe: the
 * selected one has an accent ring and a check and is scrolled into view on
 * open. It holds no choice of its own; `onSelect` says which size was tapped.
 */
export default function DashboardWidgetGallery({
  kind,
  selected,
  onSelect,
}: {
  kind: DashboardWidgetKind;
  selected: WidgetSize;
  onSelect: (size: WidgetSize) => void;
}) {
  const { sizes } = DASHBOARD_WIDGETS[kind];
  const strip = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(Math.max(0, sizes.indexOf(selected)));
  const [scrolls, setScrolls] = useState(false);

  // Open with the selected card showing: set the strip's own scroll, so the page never jumps.
  useEffect(() => {
    const el = strip.current;
    const card = el?.children[Math.max(0, sizes.indexOf(selected))] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollLeft = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2;
    // Only on open: a later tap must not make the strip jump under the finger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The card whose middle is nearest the strip's middle is the one "in view".
  // The strip is `relative`, so each card's offsetLeft is measured from the strip, not the dialog.
  const onScroll = useCallback(() => {
    const el = strip.current;
    if (!el) return;
    const middle = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestGap = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const card = child as HTMLElement;
      const gap = Math.abs(card.offsetLeft + card.offsetWidth / 2 - middle);
      if (gap < bestGap) {
        best = i;
        bestGap = gap;
      }
    });
    setInView(best);
  }, []);

  // Dots only make sense when the strip can actually scroll; re-measured when it resizes.
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const measure = () => setScrolls(el.scrollWidth > el.clientWidth);
    measure();
    const observer = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onScroll]);

  return (
    <div className="shrink-0">
      <div
        ref={strip}
        onScroll={onScroll}
        // A tap scrolls a card into view smoothly; the dot follows when that scroll ends.
        onScrollEnd={onScroll}
        className="relative flex snap-x snap-mandatory items-end gap-3 overflow-x-auto px-3 pb-2"
      >
        {sizes.map((size) => {
          const isSelected = size === selected;
          return (
            <button
              key={size}
              type="button"
              aria-pressed={isSelected}
              aria-label={WIDGET_SIZE_LABELS[size]}
              onClick={() => onSelect(size)}
              className="flex min-h-12 shrink-0 snap-center flex-col items-center gap-1.5 rounded-2xl p-1.5 transition-colors active:bg-surface-2"
            >
              <span
                className={`relative rounded-xl ${isSelected ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
              >
                <DashboardWidgetPreview kind={kind} size={size} />
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-fg"
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </span>
              <span aria-hidden="true" className={`text-sm ${isSelected ? "font-semibold text-fg" : "text-muted"}`}>
                {WIDGET_SIZE_LABELS[size]}
              </span>
            </button>
          );
        })}
      </div>
      {sizes.length >= 2 && scrolls && (
        <div aria-hidden="true" className="mt-1 flex justify-center gap-1.5">
          {sizes.map((size, i) => (
            <span
              key={size}
              className={`h-2 w-2 rounded-full ${i === inView ? "bg-accent" : "bg-muted/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
