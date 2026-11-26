# Feedback structure rules

Part of STRUCTURE.md's One source of truth list: a second definition of
anything here is a BLOCKER.

## Send feedback

- `src/lib/feedback.ts` has no imports, on purpose, and holds the rules:
  `MESSAGE_MAX`, `SCREENSHOT_MAX_BYTES`, `USER_AGENT_MAX`, `SCREENSHOT_TYPE`,
  `TOUCH_STAMP` (the one encoding of "a Mac that had touch", appended to the
  user agent), `normalizeMessage` (the only empty or too-long wording, used
  by both the sheet and the action), `normalizePagePath`,
  `normalizeViewport`, `describeDevice` and `decodeScreenshot` (uses
  `Buffer`, so server code only).
- `src/lib/feedbackRead.ts` (`server-only`, no auth; callers check the role)
  is the only reader of the `Feedback` table, including the inbox rate-limit
  count, and its list never carries screenshot bytes. A second reader is a
  BLOCKER.
- `src/lib/feedbackWrites.ts` (`server-only`, no auth, never calls
  `revalidatePath`) is the only code that inserts a `Feedback` row. Its
  callers are `sendFeedback` (`actions/feedback.ts`, guard form a, devices
  too) and `/api/feedback-inbox` (key-gated). `markFeedbackDone` /
  `deleteFeedback` (`actions/feedbackAdmin.ts`, form b, behind the
  `requireRole("admin")` page `/settings/feedback`) are the only other
  writers; a second caller of either moves it into `feedbackWrites.ts` first.
- The bytes go out through `src/app/api/feedback/[id]/screenshot/route.ts`
  alone.
- `Feedback` has no Prisma relation to `User` on purpose: `authorId` is a
  plain id and `authorName` a snapshot. Forwarded rows carry
  `FORWARDED_AUTHOR_ID` and never have a `User`, so a later relation must be
  optional and skip them.
- `src/lib/captureScreenshot.ts` carries `import "client-only"`, is the only
  in-browser page capture and the only importer of `html-to-image`.

## Forwarding between copies (mission-90)

- `src/lib/feedbackForward.ts` is pure (imports only `feedback.ts`; no `db`,
  env read or clock): the payload shape and `parseForwardedFeedback`, the
  caps (`FORWARD_BODY_MAX_BYTES`, `FAMILY_NAME_MAX`, `AUTHOR_NAME_MAX`,
  `KEY_MIN_LENGTH`), `forwardConfig(env)`, `familyName`,
  `FORWARDED_AUTHOR_ID`, and the hourly limits with `inboxRateLimited`.
  Tested in `feedbackForward.test.ts`.
- `src/lib/feedbackInbox.ts` (`server-only`, no auth) is the only code that
  reads `FEEDBACK_FORWARD_URL`, `FEEDBACK_FORWARD_KEY` and
  `FEEDBACK_INBOX_KEY`, the only sender to another copy
  (`forwardFeedbackToOwner`, 5 s timeout, `redirect: "error"`, never logs the
  key or message), and the only key check for the inbox. A second sender or
  key check is a BLOCKER. `feedbackForwardsToOwner()` (not the owner copy,
  and forwarding configured) is the only "does this copy forward" rule: the
  action and `(app)/layout.tsx` both use it.
- Forwarding runs in `after()` once the family's own row is saved, so it
  never slows or fails their send. The owner's screenshot copy is sent only
  when `shareScreenshotWithOwner === true`.
- The family label is `familyName(savedFamilyName() ?? FAMILY_NAME)`, built
  only in `sendFeedback`'s `after()`: the name saved in `HouseholdSettings`
  (read by `householdSettingsRead.ts`, the table's one reader) wins, and the
  `FAMILY_NAME` setting covers copies set up before setup saves one.
