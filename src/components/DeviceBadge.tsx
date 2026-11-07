import { Tablet } from "lucide-react";

/**
 * The tablet login (role "device") has no initial worth showing, so it gets
 * the Tablet icon in the same 40px circle an AvatarBadge would fill. The
 * background is a prop because it sits on different surfaces.
 */
export function DeviceBadge({ bgClass = "bg-surface-2" }: { bgClass?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted ${bgClass}`}
    >
      <Tablet size={22} />
    </span>
  );
}
