import { Star } from "lucide-react";
import { starCountText } from "@/lib/rewardVocabulary";

/** A habit row's stars: the filled gold star and the value, the streak chip's shape. Draws nothing below 1. */
export function StarChip({ stars }: { stars?: number | null }) {
  if (!stars || stars < 1) return null;
  return (
    <span role="img" aria-label={starCountText(stars)} className="inline-flex items-center gap-0.5 text-sm font-semibold text-fg">
      <Star aria-hidden="true" size={14} fill="currentColor" className="text-star" />
      {stars}
    </span>
  );
}
