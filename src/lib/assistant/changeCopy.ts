// The stored shape of an AssistantChange.summary. Old rows hold the plain
// detail JSON (version 1). New rows that carry full copies of the row hold
// { v: 2, detail, before, after } (version 2), which is what makes a change
// undoable. Pure on purpose: no database, so it is easy to test.

export type RowCopy = Record<string, unknown> | null;

export type DecodedChange = {
  version: 1 | 2;
  detail: unknown;
  /** undefined on version 1 rows and when a v2 row lacks the key. */
  before: RowCopy | undefined;
  after: RowCopy | undefined;
};

/** Dates become ISO strings, because that is what JSON.stringify does. */
export function encodeChangeSummary(input: {
  detail: unknown;
  before: RowCopy | undefined;
  after: RowCopy | undefined;
}): string {
  return JSON.stringify({
    v: 2,
    detail: input.detail ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
  });
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function copyOrUndefined(x: unknown): RowCopy | undefined {
  if (x === null) return null;
  return isPlainObject(x) ? x : undefined;
}

/** Never throws: anything that is not a v2 object is a version 1 row. */
export function decodeChangeSummary(text: string | null | undefined): DecodedChange {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text ?? "null");
  } catch {
    return { version: 1, detail: text ?? null, before: undefined, after: undefined };
  }
  if (isPlainObject(parsed) && parsed.v === 2) {
    return {
      version: 2,
      detail: "detail" in parsed ? parsed.detail : null,
      before: copyOrUndefined(parsed.before),
      after: copyOrUndefined(parsed.after),
    };
  }
  return { version: 1, detail: parsed, before: undefined, after: undefined };
}
