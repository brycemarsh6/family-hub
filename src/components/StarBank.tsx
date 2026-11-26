"use client";

import { Star } from "lucide-react";
import { starCountText } from "@/lib/rewardVocabulary";
import { useCountUp } from "@/lib/useCountUp";
import { useStarLanding } from "./StarFlightLayer";

/**
 * A person's star bank: the filled gold star and the total, shown as is (a
 * take-back can dip it below zero). `data-star-bank` is how a star flight finds
 * where to land; the number climbs after the stars arrive, but the label
 * always says the real total.
 */
export function StarBank({ userId, stars, className = "" }: { userId: string; stars: number; className?: string }) {
  const shown = useCountUp(stars, useStarLanding(userId));
  return (
    <span data-star-bank={userId} role="img" aria-label={starCountText(stars)} className={`inline-flex shrink-0 items-center gap-1 text-lg font-bold tabular-nums text-fg ${className}`}>
      <Star aria-hidden="true" size={20} fill="currentColor" className="text-star" />
      {shown}
    </span>
  );
}
