"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Check, Flame, Plane, Trophy } from "lucide-react";
import { AvatarBadge } from "./AvatarBadge";
import { HabitIcon } from "./HabitIcon";
import { HoursLeftLine, HoursLogButton } from "./HoursHabitRow";
import { QUIT_TAG_CLASS } from "./HabitRow";
import { LogButton } from "./LogButton";
import { ProgressBar } from "./ProgressBar";
import { isExcused, isExcusedAllDay } from "@/lib/habits/weekOverrides";
import { CHORES_LAST_WEEK_FAMILY, NOTHING_DUE_TODAY, ON_VACATION_LABEL, SKIPPED_THIS_WEEK_LABEL, SKIPPED_TODAY_LABEL, streakLabel } from "@/lib/habitVocabulary";
import type { FamilyColumn, FamilyRow } from "@/lib/habitsFamily";
import { familyCountText } from "@/lib/habitsFamilyColumns";

const TITLE_CLASS = "flex min-h-11 min-w-0 flex-1 items-center gap-2.5 self-stretch";

/** The icon, title and streak: a link to the stats page when the viewer may open it (decisions 105, 114), else plain text. */
function TitleArea({ row, children }: { row: FamilyRow; children: ReactNode }) {
  return row.canOpenStats ? (
    <Link href={`/habits/${row.id}`} draggable={false} className={TITLE_CLASS}>
      {children}
    </Link>
  ) : (
    <div className={TITLE_CLASS}>{children}</div>
  );
}

/**
 * One line of the family view: the icon and title (a link to the habit's stats
 * page, decision 105), a streak when allowed (98) and the 44px check. A row the
 * viewer may tick for gets the same round check as Today, named for the person
 * whose it is ("Mark Run done for Emily"); a row they may not
 * shows its state in a plain marker that is not a button. A skipped row shows
 * the same dashed marker as Today and reads "Skipped today" (101). A row on
 * vacation reads "On vacation" (115), and a week skip or move carries its tag.
 * A Together row's check does not name one person (`together`): it is the
 * family's, ticked for whoever the tap lands on.
 */
export function FamilyHabitRow({
  row,
  showStreaks,
  onToggle,
  together = false,
  tag = null,
  layout = "row",
}: {
  row: FamilyRow;
  showStreaks: boolean;
  onToggle: () => void;
  /** True in the Together strip: the check's name leaves out the person. */
  together?: boolean;
  /** A small label under the title ("Together", "Chore"): the wide layout, where rows of every kind share a group. */
  tag?: string | null;
  /** "card" (the wide columns): a tall card with the icon on top. "row" (the phone cards): one line. */
  layout?: "row" | "card";
}) {
  const card = layout === "card";
  const finished = row.doneToday || isExcused(row);
  const excusedByCalendar = isExcusedAllDay(row);
  const skippedMark = row.skippedToday || (row.skippedThisWeek && !row.doneToday);
  const showProgress = row.dueState === "open" && row.progress && row.progress.target > 1 && !row.doneToday;
  const progressLabel = showProgress ? `${row.progress!.count} of ${row.progress!.target} ${row.progress!.label}` : null;
  const meta =
    (row.skippedToday ? SKIPPED_TODAY_LABEL : null) ??
    (row.onVacation && !row.doneToday ? ON_VACATION_LABEL : null) ??
    row.weekTag ??
    (row.carriedFrom && !row.doneToday ? "Carried over" : null) ??
    progressLabel;
  const streak = showStreaks && row.streakLabel;
  // The check names whose it is, because a card holds several people's rows (and a parent or the tablet taps for others).
  const who = row.participants.find((p) => p.userId === row.logForId)?.displayName ?? "them";

  const title = (
    <TitleArea row={row}>
      {!card && (
        <span className={`flex shrink-0 ${finished ? "text-muted" : "text-accent"}`}>
          <HabitIcon name={row.icon} kind={row.kind} size={20} />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`text-base font-semibold ${excusedByCalendar ? "text-muted-strong" : finished ? "text-muted" : ""}`}>{row.title}</span>
        {row.hours ? (
          // An hours habit shows the person's week: "6½ of 10 hours this week", the bar and the hours left (decision 197).
          <span className="mt-0.5 flex flex-col gap-1">
            <span className="text-xs text-muted">{row.hours.doneText}</span>
            <ProgressBar fraction={row.hours.fraction} label={`${row.title} for ${who}: ${row.hours.doneText}`} />
            <HoursLeftLine hours={row.hours} />
          </span>
        ) : (
          meta && <span className={`text-xs ${excusedByCalendar ? "text-muted-strong" : "text-muted"}`}>{meta}</span>
        )}
        {tag && <span className={`mt-1 self-start ${QUIT_TAG_CLASS}`}>{tag}</span>}
      </span>
      {streak && (
        <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-streak">
          <Flame aria-hidden="true" size={14} />
          {streak}
        </span>
      )}
    </TitleArea>
  );

  return (
    <div className={card ? "flex min-h-[100px] flex-col gap-2 rounded-2xl bg-surface p-3" : "flex min-h-14 items-center gap-2.5"}>
      {card && (
        <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-xl bg-accent-soft ${finished ? "text-muted-strong" : "text-accent"}`}>
          <HabitIcon name={row.icon} kind={row.kind} size={22} />
        </span>
      )}
      <div className="flex items-start gap-2.5">
        {title}
        {row.hours && row.canLog ? (
          <HoursLogButton hours={row.hours} title={row.title} forName={who} onClick={onToggle} />
        ) : skippedMark ? (
          <LogButton done={false} label={row.title} idle="empty" skipped skippedLabel={row.skippedToday ? SKIPPED_TODAY_LABEL : SKIPPED_THIS_WEEK_LABEL} onClick={onToggle} />
        ) : row.canLog ? (
          <LogButton done={row.doneToday} label={row.title} forName={together ? undefined : who} idle="empty" onClick={onToggle} />
        ) : (
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              row.doneToday ? "bg-accent text-accent-fg" : "border-2 border-line-strong"
            }`}
          >
            {row.doneToday && <Check aria-hidden="true" size={22} />}
            <span className="sr-only">{row.doneToday ? `${row.title} is done` : `${row.title} is not done yet`}</span>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * One person's card on the family view: avatar, name, "x of y done" (their own rows and the
 * Together ones they are on; excused rows are in neither number, 109, 115), then Habits and Chores. The
 * chore streak is a flame after the "Chores" title (120); a person on vacation reads "On vacation" under
 * their name (after the count when something still counts, "5 of 5 done · On vacation"); on a Sunday after a clean week the card says so (122).
 */
export function HabitFamilyColumn({
  column,
  together,
  showStreaks,
  keep = () => true,
  onToggle,
}: {
  column: FamilyColumn;
  /** The Together strip's rows, so the count can include the ones this person is on. */
  together: FamilyRow[];
  showStreaks: boolean;
  /** The Filter sheet's test: whether a row shows. The count above is always the whole day. */
  keep?: (row: FamilyRow) => boolean;
  onToggle: (row: FamilyRow) => void;
}) {
  const shown = column.rows.filter(keep);
  const sections = [
    { key: "habit", title: "Habits", rows: shown.filter((row) => row.kind === "habit") },
    { key: "chore", title: "Chores", rows: shown.filter((row) => row.kind === "chore") },
  ].filter((section) => section.rows.length > 0);

  return (
    <section aria-label={column.displayName} data-family-person={column.id} data-layout="stacked" className="flex min-w-0 flex-col gap-1 rounded-2xl border border-line bg-surface p-3.5">
      <div className="flex items-center gap-2.5 pb-1.5">
        <AvatarBadge displayName={column.displayName} avatarColor={column.avatarColor} size={40} />
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate text-lg font-bold leading-tight">{column.displayName}</h2>
          <span className="text-sm text-muted">
            {familyCountText(column, together)}
          </span>
        </div>
        {column.onVacation && <Plane aria-hidden="true" size={18} className="ml-auto shrink-0 text-muted" />}
      </div>
      {column.shoutOut && (
        <p className="mb-1 flex items-center gap-2 rounded-xl bg-streak-soft px-3 py-2 text-sm font-semibold">
          <Trophy aria-hidden="true" size={16} className="shrink-0 text-streak" />
          {CHORES_LAST_WEEK_FAMILY}
        </p>
      )}
      {sections.length === 0 && <p className="py-2 text-sm text-muted">{NOTHING_DUE_TODAY}</p>}
      {sections.map((section) => (
        <div key={section.key}>
          <h3 className="flex items-center gap-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {section.title}
            {section.key === "chore" && showStreaks && streakLabel(column.choreStreak, "days") && (
              <span className="inline-flex items-center gap-0.5 text-sm font-semibold normal-case tracking-normal text-streak">
                <Flame aria-hidden="true" size={14} />
                {streakLabel(column.choreStreak, "days")}
              </span>
            )}
          </h3>
          <ul className="divide-y divide-line">
            {section.rows.map((row) => (
              <li key={row.id}>
                <FamilyHabitRow row={row} showStreaks={showStreaks} onToggle={() => onToggle(row)} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
