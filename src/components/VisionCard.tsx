import { Lightbulb } from "lucide-react";
import { lifeAreaInfo, type LifeArea } from "@/lib/goalVocabulary";

/**
 * One life area on the vision board. Empty: the area, one prompt, a "Write
 * your vision" look-alike and "Another prompt". Filled: the area's icon band,
 * the statement and the area's goal count. An editable card is one button for
 * the whole card; "Another prompt" sits outside it (no nested buttons). A
 * read-only card is plain markup.
 */
export function VisionCard({
  area,
  text,
  goalCount,
  prompt,
  canEdit,
  wide,
  onOpen,
  onAnotherPrompt,
}: {
  area: LifeArea;
  text: string | null;
  goalCount: number;
  prompt: string;
  canEdit: boolean;
  wide: boolean;
  onOpen: () => void;
  onAnotherPrompt: () => void;
}) {
  const info = lifeAreaInfo(area);
  const Icon = info.icon;

  const body = (
    <>
      <span className="flex h-16 w-full items-center justify-center bg-accent-soft text-accent" aria-hidden="true">
        <Icon size={28} />
      </span>
      <span className="flex flex-col gap-2 p-3 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{info.label}</span>
        {text !== null ? (
          <>
            <span className="whitespace-pre-wrap break-words text-base text-fg">{text}</span>
            {goalCount > 0 && (
              <span className="text-sm text-muted">{goalCount === 1 ? "1 goal" : `${goalCount} goals`}</span>
            )}
          </>
        ) : (
          <>
            <span className="flex items-start gap-2 text-sm text-muted-strong">
              <Lightbulb aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
              <span>{prompt}</span>
            </span>
            {canEdit && <span className="text-sm font-semibold text-accent">Write your vision</span>}
          </>
        )}
      </span>
    </>
  );

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-surface ${wide ? "col-span-2" : ""}`}
    >
      {canEdit ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${info.label}: ${text !== null ? "edit your vision" : "write your vision"}`}
          className="flex min-h-12 flex-1 flex-col items-stretch text-left active:bg-surface-2"
        >
          {body}
        </button>
      ) : (
        <div className="flex flex-1 flex-col items-stretch">{body}</div>
      )}
      {text === null && (
        <button
          type="button"
          onClick={onAnotherPrompt}
          className="flex min-h-11 items-center justify-center border-t border-line text-sm font-medium text-muted-strong active:bg-surface-2"
        >
          Another prompt
        </button>
      )}
    </div>
  );
}
