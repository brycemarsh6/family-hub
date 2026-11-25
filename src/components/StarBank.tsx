import { Star } from "lucide-react";
import { starCountText } from "@/lib/rewardVocabulary";

/** A person's star bank: the filled gold star and the total, shown as is (a take-back can dip it below zero). */
export function StarBank({ stars, className = "" }: { stars: number; className?: string }) {
  return (
    <span role="img" aria-label={starCountText(stars)} className={`inline-flex shrink-0 items-center gap-1 text-lg font-bold tabular-nums text-fg ${className}`}>
      <Star aria-hidden="true" size={20} fill="currentColor" className="text-star" />
      {stars}
    </span>
  );
}
