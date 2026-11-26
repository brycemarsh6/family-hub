// The pure rule behind MARSHEE_OWNER_COPY (read at call time in copyConfig.ts).
// Only the exact value "1" turns the owner features on; a pasted trailing
// newline or space still counts. "true", "yes", "0", "" and unset are all off.

export function parseOwnerCopyFlag(value: string | undefined): boolean {
  return value?.trim() === "1";
}
