import "server-only";
import { parseOwnerCopyFlag } from "@/lib/ownerCopyFlag";

// Marshee ships to relatives as their own copy (their own Vercel project).
// Owner-only features (Winnie, the voice doors, the morning briefing) stay off
// there. Only Bryce's project sets MARSHEE_OWNER_COPY=1.

/** True only in the owner's copy. Read at call time, never cached at module load. */
export function isOwnerCopy(): boolean {
  return parseOwnerCopyFlag(process.env.MARSHEE_OWNER_COPY);
}
