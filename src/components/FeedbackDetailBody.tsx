import { describeDevice } from "@/lib/feedback";
import { feedbackTimeLabel } from "@/lib/feedbackTime";
import { navLabelForPath } from "@/lib/nav";
import type { FeedbackListItem } from "@/lib/feedbackRead";

/**
 * One report in full: header, message, Page and Device, and the screenshot.
 * Shared by the sheet (which passes `onClose` and gets the ×) and the wide
 * panel (which passes nothing: tapping another row swaps it).
 */
export function FeedbackDetailBody({
  item,
  onClose,
}: {
  item: FeedbackListItem;
  onClose?: () => void;
}) {
  const device = item.userAgent ? describeDevice(item.userAgent, item.viewport ?? "") : null;

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{item.authorName}</h2>
          <p className="text-sm text-muted">
            {feedbackTimeLabel(item.createdAt)}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        )}
      </div>

      <p className="whitespace-pre-wrap break-words text-base">{item.message}</p>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Page</dt>
        <dd className="min-w-0 break-words">{navLabelForPath(item.pagePath)}</dd>
        {device && (
          <>
            <dt className="text-muted">Device</dt>
            <dd>{device}</dd>
          </>
        )}
      </dl>

      {item.hasScreenshot && (
        <div className="mt-4">
          <p className="mb-1 text-sm text-muted">Screenshot</p>
          {/* A plain img: the route is admin-only and never cached, so the
              image optimizer (which would fetch it without the cookie) does
              not fit. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/feedback/${item.id}/screenshot`}
            alt={`Screenshot of ${item.pagePath} from ${item.authorName}`}
            className="w-full rounded-xl border border-line"
          />
        </div>
      )}
    </>
  );
}
