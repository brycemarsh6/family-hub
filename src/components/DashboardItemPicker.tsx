"use client";

import { ChevronLeft } from "lucide-react";
import { HabitIcon } from "./HabitIcon";
import { SortableList } from "./SortableList";
import { ToggleSwitch } from "./ToggleSwitch";
import { splitPicks, togglePick } from "@/lib/dashboardPicks";
import { DASHBOARD_PICKER_LABELS } from "@/lib/dashboardWidgets";

/** One thing the person can pick. `icon` is set (null for the kind's default) for habits and left out for goals. */
export type PickItem = { id: string; title: string; icon?: string | null };

const GROUP_HEADING = "mt-4 mb-1 px-3 text-sm font-semibold uppercase tracking-wide text-muted";

/**
 * The picker view inside the Customize sheet (decision 137): a back control, a
 * title, then a switch per item. Picked items sit under "Showing" in picked
 * order with a grip to drag; the rest sit under "Not showing". It is a body
 * for the sheet, not a sheet of its own, and holds no state: `onChange` gets
 * the full new list of picked ids and the dashboard saves it.
 */
export default function DashboardItemPicker({
  title,
  items,
  picks,
  nothingPicked,
  none,
  onChange,
  onBack,
  onClose,
}: {
  title: string;
  items: PickItem[];
  picks: string[];
  /** The note under the title while nothing is picked. */
  nothingPicked: string;
  /** Shown instead when there is nothing to pick from. */
  none: string;
  onChange: (ids: string[]) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const { showing, notShowing } = splitPicks(items, picks);

  function row(item: PickItem) {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-3">
        {item.icon !== undefined && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
            <HabitIcon name={item.icon} kind="habit" size={18} />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-base font-medium text-fg">{item.title}</span>
      </span>
    );
  }

  return (
    <>
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          onClick={onBack}
          aria-label={DASHBOARD_PICKER_LABELS.back}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-fg transition-colors active:bg-surface-2"
        >
          <ChevronLeft aria-hidden="true" size={22} />
        </button>
        <h2 className="min-w-0 flex-1 text-lg font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
        >
          ×
        </button>
      </div>

      {items.length === 0 ? (
        <p className="px-3 py-2 text-base text-muted">{none}</p>
      ) : (
        <>
          {showing.length === 0 && <p className="px-3 text-sm text-muted">{nothingPicked}</p>}

          {showing.length > 0 && (
            <>
              <h3 className={GROUP_HEADING}>{DASHBOARD_PICKER_LABELS.showing}</h3>
              <SortableList
                items={showing}
                label={(item) => item.title}
                onReorder={onChange}
                className="flex flex-col"
                itemClassName="flex min-h-14 items-center gap-2 rounded-xl px-3"
                renderItem={(item, { grip }) => (
                  <>
                    {row(item)}
                    <ToggleSwitch
                      checked
                      onChange={() => onChange(togglePick(items, picks, item.id))}
                      label={`Show ${item.title}`}
                    />
                    {grip}
                  </>
                )}
              />
            </>
          )}

          {notShowing.length > 0 && (
            <>
              <h3 className={GROUP_HEADING}>{DASHBOARD_PICKER_LABELS.notShowing}</h3>
              <ul className="flex flex-col">
                {notShowing.map((item) => (
                  <li key={item.id} className="flex min-h-14 items-center gap-2 rounded-xl px-3">
                    {row(item)}
                    <ToggleSwitch
                      checked={false}
                      onChange={() => onChange(togglePick(items, picks, item.id))}
                      label={`Show ${item.title}`}
                    />
                    {/* Same width as the grip above, so the switch stays put when a row moves between the lists. */}
                    <span aria-hidden="true" className="w-11 shrink-0" />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </>
  );
}
