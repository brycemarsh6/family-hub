"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { RewardActivityList } from "./RewardActivityList";
import { RewardSheet } from "./RewardSheet";
import { StarAdjustForm } from "./StarAdjustForm";
import type { HouseholdPerson } from "@/lib/householdPeople";
import type { Gate } from "@/lib/rewardGates";
import type { RewardView } from "@/lib/rewardsRead";
import type { RecentLine } from "@/lib/rewards/starHistory";
import { ADJUST_SECTION_TITLE, NO_WISHES_TEXT, RECENT_SECTION_TITLE, SET_COST_LABEL, wishOfText, wishesTitleText } from "@/lib/rewardVocabulary";

const SECTION_TITLE = "mb-2 mt-1 text-xs font-extrabold uppercase tracking-wide text-muted";

/**
 * The Manage page body. One container: the three sections stack on a phone,
 * and from 48rem of its own width it is two columns (Give or take and Wishes on
 * the left, Recent on the right). A wish is a reward with no cost; Set cost
 * opens the same reward sheet a parent already uses to edit a reward.
 */
export function RewardsManage({
  people,
  wishes,
  recent,
  defaultPersonId,
  gate,
}: {
  people: HouseholdPerson[];
  wishes: RewardView[];
  recent: RecentLine[];
  defaultPersonId: string;
  gate: Gate;
}) {
  const [editing, setEditing] = useState<RewardView | null>(null);

  return (
    <>
      <div className="@container">
        <div className="grid grid-cols-1 gap-x-4 gap-y-5 @min-[48rem]:grid-cols-2 @min-[48rem]:items-start">
          <div className="flex flex-col gap-5">
            <section aria-label={ADJUST_SECTION_TITLE}>
              <h2 className={SECTION_TITLE}>{ADJUST_SECTION_TITLE}</h2>
              <StarAdjustForm people={people} defaultPersonId={defaultPersonId} />
            </section>

            <section aria-label={wishesTitleText(wishes.length)}>
              <h2 className={SECTION_TITLE}>{wishesTitleText(wishes.length)}</h2>
              {wishes.length === 0 ? (
                <p className="text-sm text-muted">{NO_WISHES_TEXT}</p>
              ) : (
                <ul className="rounded-2xl border border-line bg-surface px-3">
                  {wishes.map((wish) => {
                    const owner = people.find((person) => person.id === wish.ownerId);
                    return (
                      <li key={wish.id} className="flex min-h-14 items-center gap-3 border-t border-line py-2 first:border-t-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-xl leading-none">
                          {wish.emoji ?? <Gift aria-hidden="true" size={18} className="text-muted" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{wish.title}</p>
                          {owner && <p className="text-xs text-muted">{wishOfText(owner.displayName)}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditing(wish)}
                          className="flex min-h-12 shrink-0 items-center rounded-xl border border-line px-3 text-sm font-bold text-fg transition-colors active:bg-surface-2"
                        >
                          {SET_COST_LABEL}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <section aria-label={RECENT_SECTION_TITLE}>
            <h2 className={SECTION_TITLE}>{RECENT_SECTION_TITLE}</h2>
            <RewardActivityList lines={recent} />
          </section>
        </div>
      </div>

      {editing && <RewardSheet key={editing.id} initial={editing} ownerId={editing.ownerId} people={people} gate={gate} onClose={() => setEditing(null)} />}
    </>
  );
}
