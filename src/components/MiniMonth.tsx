import { monthGridDays, isTodayCell } from "@/lib/monthLayout";
import { FULL_DAY_NAMES, FULL_MONTH_NAMES, isSameDay, isSameMonth, toLocalDateString } from "@/lib/mealPlanDates";

// Mission 72: the app's one small month for navigating (the month panel's
// grid). Weekday letters over the 42 cells of `monthGridDays`; days outside
// the month are blank, so a tap can only land in the month on show.
// MonthGrid and YearView draw events and are not navigation grids.
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function MiniMonth({
  month,
  today,
  selected = null,
  onPickDay,
  dotDays,
}: {
  /** Any real day inside the month to show. */
  month: Date;
  today: Date;
  /** The day the calendar is showing: gets a ring. */
  selected?: Date | null;
  onPickDay: (day: Date) => void;
  /** Local "YYYY-MM-DD" of days with an event or task; a small dot under each. */
  dotDays?: ReadonlySet<string>;
}) {
  return (
    <div className="px-1 pb-2">
      <div aria-hidden="true" className="grid grid-cols-7 pb-1 text-center text-xs font-semibold text-muted">
        {WEEKDAY_LETTERS.map((letter, index) => (
          <span key={index}>{letter}</span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthGridDays(month).map((day) => {
          if (!isSameMonth(day, month)) return <span key={day.getTime()} className="h-11" />;
          const isToday = isTodayCell(day, month, today);
          const isShowing = selected !== null && isSameDay(day, selected);
          const label = `${FULL_DAY_NAMES[day.getDay()]}, ${FULL_MONTH_NAMES[day.getMonth()]} ${day.getDate()}${isShowing ? " (showing)" : ""}`;
          return (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => onPickDay(day)}
              aria-label={label}
              aria-current={isToday ? "date" : undefined}
              className="relative flex h-11 flex-col items-center justify-center text-sm"
            >
              <span
                className={`flex h-[2.125rem] w-[2.125rem] items-center justify-center rounded-full transition-colors ${
                  isToday ? "bg-accent font-bold text-accent-fg" : "font-medium text-fg active:bg-surface-2"
                } ${isShowing ? "ring-2 ring-accent" : ""}`}
              >
                {day.getDate()}
              </span>
              {!isToday && dotDays?.has(toLocalDateString(day)) && (
                <span aria-hidden="true" className="absolute bottom-0.5 h-1 w-1 rounded-full bg-muted" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
