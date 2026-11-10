# Mission 57: Screensaver S1, slideshow photos

(Opened as mission 56; renumbered 2026-11-09 because calendar sync PR 2 took 56 on main.)

**Project:** family-hub (Marshee)
**Status:** DELIVERED (all gates PASS; merge and production check recorded under Delivery)

**Strange's sign-in (precedent, mission 56 calendar sync, 2026-11-09):** Bryce signs in himself in the built-in browser pane on the local dev server. No agent reads `.env` or mints a session cookie. Test photos for the gate (made from macOS wallpapers, no family photos) live in the session scratchpad `testphotos/`: `land-dated.jpg` (3000x2000, taken 2023-06-14), `portrait-dated.jpg` (2000x3000, taken 2021-11-09), `land-nodate.jpg` and `small.jpg` (no EXIF). Every test upload goes to the dev store and is deleted through the page afterward.
**Started:** 2026-11-09 · **Updated:** 2026-11-09

Plan: `.avengers/plans/screensaver-slideshow-v1.md` (approved by Bryce 2026-11-09). This is PR S1.

## Brief

- **Goal:** Parents and admins can add, caption and delete family photos from their phones. Photos are stored privately in Vercel Blob and listed on a new "Slideshow photos" page under Settings. No slideshow yet (that is S2).
- **Done means:**
  - A parent or admin uploads photos from a phone (including iPhone HEIC photos), sees them in a grid, edits a caption, and deletes one with one tap.
  - The photo's "taken" date is saved when the file has one.
  - Kids and the Tablet login cannot reach the page or its actions; any signed-in login can view a photo through `/api/slideshow/[id]/image`; a signed-out request gets 404.
  - Deleting a photo removes both the database row and the stored file.
  - The gauntlet passes, including new tests for the pure helpers.
- **Out of scope:** the slideshow itself, screensaver settings, sleep mode, the default page setting, "On this day", any other photo feature (recipes, profiles, vision cards, a gallery), kids uploading, the Assistant API.

## Danger register

From AGENTS.md (absolute):
- Never run `npm run db:seed` or `npm run db:reset`.
- Migrations are additive only; review the SQL before applying. Merging applies it to production.
- Never write a clean or reset script for the `User` table.
- Secrets live in `.env` and Vercel env vars only. The Blob tokens never go in chat, git, or a dispatch prompt.
- Never `git add -A` or `git add .`; stage by path; `git show --stat HEAD` after each commit.
- Direct pushes to `main` are blocked; branch, PR, Gauntlet green, merge.

New for this mission:
- **Production photos are the family's real photos.** Local dev and tests use the dev Blob store only. No agent ever uploads to, lists or deletes from the production store.
- **Creating the Blob stores changes Bryce's Vercel account.** Fury asks Bryce right before doing it.
- A delete in the dev store must only ever target a path the same code just created.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Strange: a new visible page and a Settings row.
- Captain: new table, new route, new files, a STRUCTURE.md amendment (private browser caching for slideshow images).
- Banner: done during planning (2026-11-09 brief, summarized in the plan's Context).

## Open design questions (for Bryce, with the mock)

Answered by Bryce 2026-11-09 (he approved every recommendation):
- A "Slideshow photos" row in Settings, parents and admins only, showing the photo count.
- The page: BackLink to Settings, title, "N photos. They show on the wall tablet.", one "Add photos" button, a 3-across grid (phone), newest first, a small speech-bubble mark on photos with a caption.
- "Add photos" opens the camera roll with multi-select. A progress line ("Adding 7 of 12") and bar. One failure never stops the rest; failed ones get "Try again".
- Tapping a photo opens a sheet: the photo, "Taken <date> · added by <name>", an optional caption (max 80 characters), Delete (one tap, no confirmation) and Done.

## Blob stores (created 2026-11-09 by Fury, with Bryce's yes)

- `marshee-photos-prod` (`store_t5ixPBMk9ZkJL7vh`), private, pdx1. For the Production environment only.
- `marshee-photos-dev` (`store_fVA6UhAamXKF8h3x`), private, pdx1. For Preview, Development and local `.env`.
- Created unconnected on purpose: the MCP connect option cannot pick environments, and connecting prod to every environment would let preview builds write real photos. Bryce connects each in the Vercel dashboard with the right environments; both set `BLOB_READ_WRITE_TOKEN`.
- Local: Bryce pastes the dev store's token into the main checkout's `.env` himself. Worktrees have no `.env` of their own.
- **Connected and verified 2026-11-09** (`filter_project_envs`, values not decrypted): prod sets `BLOB_STORE_ID` + `BLOB_WEBHOOK_PUBLIC_KEY` for Production only; dev sets the same pair for Development + Preview. **No `BLOB_READ_WRITE_TOKEN` was created.** New stores sign in with OIDC: on Vercel the SDK reads `VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID` and refreshes the token itself. So production holds no long-lived Blob secret at all.
- Local dev cannot get OIDC without the Vercel CLI (12-hour tokens). Chosen fallback: the dev store's own read-write token as `BLOB_READ_WRITE_TOKEN` in the local `.env` only (the SDK documents this for local development). Code must not hard-require either credential style; it calls the SDK with no token option and lets it resolve.

## Design decisions made while contracting (Fury, structure calls)

- **Two files per photo:** a full photo (longest side 2048 px, JPEG 0.85) for the slideshow and a thumbnail (longest side 400 px, JPEG 0.8) for the grid. 42 full photos on a phone grid would be about 40 MB; thumbnails keep it about 2 MB.
- **Upload goes through a Server Action, one photo per call**, not Vercel's client-upload flow. Each shrunk photo is about 1 MB, well under the 8 MB action limit, and the client-upload completion webhook does not fire on localhost. The action uses the same `getVerifiedUser` gate as every other write.
- **The "taken" date is a plain `YYYY-MM-DD` string (`takenOn`)**, read in the browser from the JPEG's EXIF `DateTimeOriginal` by a small pure parser in `src/lib/exifDate.ts`. A camera date has no timezone, so storing it as a moment in time would shift it by the household offset. No new EXIF dependency: `exifr` is 1.3 MB unpacked, and only one tag is needed. iPhone Safari hands a file input JPEG (it converts HEIC itself), so JPEG-only parsing covers the family's phones.
- **No relation to `User`**: the row stores `uploadedById` and `uploadedByName` as plain strings, like `Feedback.authorId`/`authorName`. Deleting a person never touches photos, and no cleanup script needs to reason about a foreign key into `User`.
- **Image responses are cached privately for a year** (`Cache-Control: private, max-age=31536000, immutable`). A photo's bytes never change for a given id and path. A deleted photo can linger in one device's own cache, but it is no longer listed anywhere, so nothing shows it. This is the STRUCTURE.md amendment Captain reviews.
- **Who:** page and write actions require `MANAGER_ROLES` (admin, parent) and `!user.isDevice`. Viewing an image requires any signed-in login (S2's tablet needs it).

## Contracts

### C1 — Photo storage foundation: table, Blob wrapper, pure helpers, and the login-checked image route
- **Status:** DONE (Stark, 2026-11-09). Report: @vercel/blob pinned 2.9.0; `put`/`get`/`del` signatures confirmed from installed types; migration matched `migrate diff`; +28 tests both timezones (1512 Denver; UTC 1505 pass + 7 skipped); all five gauntlet commands green; no token option; no test imports the Blob wrapper. Then main was merged in (calendar sync PR 2), the schema conflict resolved by keeping both new tables, the migration renamed to `20261115000000_slideshow_photos` (main took the 20261114 stamp) and re-checked against main's schema (identical), and Fury applied it to the dev branch (host `ep-hidden-pine-`) with `npx prisma migrate deploy`.
- **Objective:** Add the `SlideshowPhoto` table, the `@vercel/blob` dependency, server-only storage and read helpers, two tested pure helper modules, and `GET /api/slideshow/[id]/image`.
- **Boundaries:**
  - May touch: `package.json`, `package-lock.json`, `prisma/schema.prisma` (append one model, nothing else), new `prisma/migrations/20261115000000_slideshow_photos/migration.sql`, new `src/lib/slideshowPhotos.ts`, new `src/lib/slideshowPhotos.test.ts`, new `src/lib/exifDate.ts`, new `src/lib/exifDate.test.ts`, new `src/lib/slideshowBlob.ts`, new `src/lib/slideshowRead.ts`, new `src/app/api/slideshow/[id]/image/route.ts`, `STRUCTURE.md` (the private-image-route rule only, plus a layout-table mention if one lists such routes), `.env.example`, `README.md` (env section only).
  - Must not touch: `proxy.ts`, `src/lib/dal.ts`, `src/app/(app)/layout.tsx`, `src/components/`, `src/app/actions/`, any existing migration, `.env`.
  - **No `prisma migrate` command of any kind** (Fury reviews the SQL and runs `npx prisma migrate deploy` against the dev branch). `npx prisma generate` and `npx prisma migrate diff` are allowed.
  - **No call to the real Blob service.** Tests never import `slideshowBlob.ts`; no script uploads, lists or deletes.
- **What to build:**
  1. `npm install @vercel/blob` (pin the exact installed version in `package.json`, matching how `next` is pinned). Confirm from the installed package's types that `put`, `get` (with `access: "private"`) and `del` exist; quote the signatures in the report.
  2. Model, appended to the schema:
     - `id String @id @default(cuid())`
     - `photoPath String @unique` and `thumbPath String @unique` (Blob pathnames)
     - `width Int`, `height Int` (of the full photo)
     - `caption String?`
     - `takenOn String?` (`YYYY-MM-DD`, the camera date, no timezone)
     - `uploadedById String`, `uploadedByName String` (plain strings, no relation)
     - `createdAt DateTime @default(now())`
     - `@@index([createdAt])`
     - A `///` doc comment saying what the table is, that the bytes live in Vercel Blob (private store), and why there is no `User` relation.
  3. Hand-written migration SQL that creates only that table and its indexes, matching `prisma migrate diff` output from main's schema to the new one.
  4. `src/lib/slideshowPhotos.ts` (pure, no imports from server-only code), exporting: `CAPTION_MAX = 80`; `PHOTO_MAX_BYTES = 4 * 1024 * 1024`; `THUMB_MAX_BYTES = 512 * 1024`; `PHOTO_LONG_EDGE = 2048`; `THUMB_LONG_EDGE = 400`; `PHOTO_TYPE = "image/jpeg"`; `normalizeCaption(raw: unknown): string | null` (trims, collapses inner whitespace, empty becomes null, over 80 characters becomes null with no truncation, non-string becomes null); `isTakenOn(raw: unknown): raw is string` (a real calendar date `YYYY-MM-DD`, years 1900 to 2100; rejects `2023-02-30`); `photoPaths(id: string): { photoPath, thumbPath }` returning `slideshow/<id>.jpg` and `slideshow/<id>-thumb.jpg`; `toDimension(raw: unknown): number | null` (an integer 1 to 8192).
  5. `src/lib/exifDate.ts` (pure): `readExifTakenOn(bytes: ArrayBuffer | Uint8Array): string | null`. Walks JPEG markers to APP1 `Exif\0\0`, reads the TIFF header (both byte orders), follows IFD0 to the Exif sub-IFD pointer (tag `0x8769`), reads `DateTimeOriginal` (`0x9003`), and falls back to IFD0 `DateTime` (`0x0132`). Returns `YYYY-MM-DD` only when `isTakenOn` accepts it. Never throws: any truncated or malformed input returns null. Bounds-checks every read.
  6. Tests: `slideshowPhotos.test.ts` covers every export's edge cases. `exifDate.test.ts` builds small JPEG byte arrays in the test (a helper that writes SOI, an APP1 with a TIFF header, IFD0 and an Exif IFD), and covers: little-endian, big-endian, DateTime-only fallback, no APP1, APP1 that is not Exif, a truncated buffer at several cut points, a zero date (`0000:00:00 00:00:00`), and an offset pointing past the end. Both files sit flat in `src/lib/`, so the existing test glob picks them up (no `package.json` glob change).
  7. `src/lib/slideshowBlob.ts` (`import "server-only"`): `putSlideshowFile(pathname, bytes)` calls `put` with `access: "private"`, `contentType: "image/jpeg"`, `addRandomSuffix: false`, `allowOverwrite: false` (or the installed SDK's equivalent; report what you used), and returns the stored pathname. `getSlideshowFile(pathname)` calls `get(pathname, { access: "private" })` and returns `{ stream, contentType }` or null on anything but 200. `deleteSlideshowFiles(pathnames: string[])` calls `del`. **No token option anywhere**: the SDK resolves OIDC on Vercel and `BLOB_READ_WRITE_TOKEN` locally. A comment says so and names both.
  8. `src/lib/slideshowRead.ts` (`import "server-only"`): `listSlideshowPhotos()` newest first, selecting id, width, height, caption, takenOn, uploadedByName, createdAt (never paths); `loadSlideshowPhotoPaths(id)` returning `{ photoPath, thumbPath } | null`; `countSlideshowPhotos()`.
  9. `src/app/api/slideshow/[id]/image/route.ts`: copy the shape of `src/app/api/feedback/[id]/screenshot/route.ts`. `getVerifiedUser()`, null means 404. Any signed-in login is allowed (devices included). `?size=thumb` serves the thumbnail, anything else serves the full photo. Unknown id or missing blob is 404. Headers: `Content-Type: image/jpeg`, `Cache-Control: private, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`. A header comment explains why this route caches where the screenshot route does not.
  10. `STRUCTURE.md`: amend the private-image-route rule so it names both instances and states when `private, max-age=..., immutable` is allowed (bytes that never change for a given URL) versus `no-store` (the default). Small edit only.
  11. `.env.example` and README: one commented entry for `BLOB_READ_WRITE_TOKEN` saying it is for local development only, holds the **dev** store's token, and that Vercel deployments use `BLOB_STORE_ID` plus automatic OIDC instead. Never a real value.
- **Verification:** the gauntlet (all five commands) passes. `npx prisma migrate diff --from-schema-datamodel <(git show origin/main:prisma/schema.prisma) --to-schema-datamodel prisma/schema.prisma --script` (or the installed Prisma's equivalent flags) matches the migration SQL apart from whitespace and comments.
- **Evidence required:** the full migration SQL and the diff output; the SDK signatures quoted from the installed types; the test counts before and after for both timezones; each gauntlet command's last lines; `wc -l` of every new file; `git diff --stat`.
- **Done criteria:** Fury reads the SQL (one `CREATE TABLE`, its indexes, nothing else), re-runs the test glob and sees the new tests counted in both timezones, and greps that `slideshowBlob.ts` has no `token:` option and is imported by no test.
- **Report:** pending.

### C2 — Server Actions and the browser shrink helper
- **Status:** DONE (Stark, 2026-11-09, commit d08469b). Guard is the first statement of all three actions (Fury grepped lines 41, 130, 153); ids are only used in `where`, paths come from the row or `photoPaths` on a server-made id. Gauntlet green (1621 both timezones). Unspecified case: caption update on an unknown id returns "That photo isn't there any more." `shrinkPhoto` has not run in a browser yet; C3's design gate is its first real run.
- **Objective:** Add the three write actions and the client-only helper that shrinks a picked photo into a full photo and a thumbnail and reads its taken date.
- **Boundaries:**
  - May touch: new `src/app/actions/slideshowPhotos.ts`, new `src/lib/shrinkPhoto.ts`.
  - Must not touch: everything else, including `prisma/`, `STRUCTURE.md`, `src/components/`, the C1 files.
- **What to build:**
  1. `src/app/actions/slideshowPhotos.ts` (`"use server"`), every action starting with `const user = await getVerifiedUser()` and refusing unless `user && !user.isDevice && MANAGER_ROLES.includes(user.role)`, returning `{ ok: false, error }` with a plain-English message (no throw to the client):
     - `addSlideshowPhoto(formData)`: fields `photo` (File), `thumb` (File), `width`, `height`, `takenOn` (optional). Validates with the C1 helpers: both files `image/jpeg`, photo within `PHOTO_MAX_BYTES`, thumb within `THUMB_MAX_BYTES`, dimensions via `toDimension`, `takenOn` via `isTakenOn` else null. Creates the id first (`cuid`-style via Prisma default is not available before insert, so generate with `crypto.randomUUID()` and pass it as `id`), uploads both files to `photoPaths(id)`, then inserts the row. If the insert fails, deletes both uploaded files. If the second upload fails, deletes the first. Returns `{ ok: true, photo }` with the same shape `listSlideshowPhotos` returns. `revalidatePath("/settings/slideshow")` and `revalidatePath("/settings")`.
     - `updateSlideshowCaption(id, caption)`: `normalizeCaption`; a caption that is non-empty but too long is an error ("Captions can be up to 80 characters."), empty clears it.
     - `deleteSlideshowPhoto(id)`: loads paths, deletes the row, then deletes both files. A missing row is `{ ok: true }` (already gone). A file-delete failure after the row is gone is logged with `console.error` and still returns ok, because the photo is already unlisted.
  2. `src/lib/shrinkPhoto.ts` (`import "client-only"`): `shrinkPhoto(file: File): Promise<{ photo: Blob; thumb: Blob; width: number; height: number; takenOn: string | null }>`. Reads the bytes once, calls `readExifTakenOn` on them, decodes with `createImageBitmap(file, { imageOrientation: "from-image" })` (falling back to an `<img>` decode if that throws), draws to a canvas at `PHOTO_LONG_EDGE` (never upscaling) and `THUMB_LONG_EDGE`, and encodes with `canvas.toBlob("image/jpeg", 0.85 / 0.8)`. Throws a plain `Error("That photo couldn't be read.")` on decode failure. Uses the C1 constants, not new numbers.
- **Verification:** the gauntlet passes.
- **Evidence required:** each gauntlet command's last lines; the guard line from each action quoted; `git diff --stat`.
- **Done criteria:** Fury greps every exported action for the guard as its first statement, and checks no action trusts a client-sent id for anything but lookup.
- **Report:** pending.

### C3 — The Slideshow photos page and its Settings row
- **Status:** DONE (Stark, 2026-11-09). Settings row gated by `canSyncCalendars` (same `!isDevice && MANAGER_ROLES` test), count only loaded for managers; page, manager (186 lines) and sheet (143 lines); gauntlet green. Stark flagged that "optimistic removal" contradicts DESIGN.md's destructive-verb carve-out: Fury confirmed the contract was wrong, fixed in C3b.
- **Objective:** Build the page and sheet Bryce approved in the mock, and the Settings row that opens it.
- **Boundaries:**
  - May touch: `src/app/(app)/settings/page.tsx`, new `src/app/(app)/settings/slideshow/page.tsx`, new `src/components/SlideshowPhotosManager.tsx`, new `src/components/SlideshowPhotoSheet.tsx`.
  - Must not touch: everything else, including the C1 and C2 files, `src/lib/nav.ts`, `DESIGN.md`, `STRUCTURE.md`.
- **What to build (Bryce's approved mock, recorded above under "Open design questions"):**
  1. Settings row: "Slideshow photos" with the Lucide `Images` icon and the photo count on the right, styled exactly like the "Manage family" link. Shown only when `!user.isDevice && MANAGER_ROLES.includes(user.role)`. Place it in the left column directly after "Synced calendars", sharing its `order-3`, and update the page's doc comment order list.
  2. `/settings/slideshow` page: `requireRole(...MANAGER_ROLES)`, `export const dynamic = "force-dynamic"`, a `BackLink` to Settings, the title "Slideshow photos", the line "N photos. They show on the wall tablet." (singular "1 photo"; zero reads "No photos yet. Add some to show on the wall tablet."), then `SlideshowPhotosManager` with the list from `listSlideshowPhotos()`.
  3. `SlideshowPhotosManager` (client): a full-width 48px+ "Add photos" button wrapping a hidden `<input type="file" accept="image/*" multiple>`. Picked files upload **one at a time** (`shrinkPhoto`, then `addSlideshowPhoto`); a progress block shows "Adding N of M photos" with a bar; each success puts the photo at the front of the grid at once. A failure never stops the rest; at the end, "N photo(s) couldn't be added." with a "Try again" button that retries only the failed files. The grid: 3 columns on a phone, more on wider screens using the page's existing container pattern, square cells, `<img src="/api/slideshow/<id>/image?size=thumb" loading="lazy">` with `object-cover`, a small Lucide `MessageSquare` mark in the corner when the photo has a caption. Each cell is a button (48px+) that opens the sheet. Alt text is the caption, or "Photo added <date>" when there is none.
  4. `SlideshowPhotoSheet` (client): follows `FeedbackDetailSheet.tsx`'s sheet shape (portal, Escape, focus in and back, bottom sheet on phones and centered dialog on wide screens). Shows the full photo (`object-contain`, max height so the sheet fits), "Taken <Month D, YYYY> · added by <name>" (just "Added by <name>" when there is no date; the date is formatted from the `YYYY-MM-DD` string without any timezone conversion), a caption text field with a live "N/80" counter, and two buttons: Delete (danger color, one tap, no confirmation, optimistic removal) and Done (saves the caption only if it changed, then closes). Errors show in a `role="alert"` line.
- **Verification:** the gauntlet passes.
- **Evidence required:** each gauntlet command's last lines; `wc -l` of every new or changed file; `git diff --stat`.
- **Done criteria:** Strange's gate on the running app with real uploads to the **dev** store (Fury supplies test photos; every uploaded test photo is deleted through the page afterward).
- **Report:** pending.

### C3b — Delete waits for the server (fixes Fury's contract error)
- **Status:** DONE
- **Objective:** Make the sheet's Delete follow DESIGN.md's destructive-verb carve-out (lines 102-112): wait for `deleteSlideshowPhoto`, then remove the photo and close the sheet; never remove it optimistically.
- **Why:** C3 said "optimistic removal". That contradicts DESIGN.md's written, Bryce-approved rule. Stark built the contract as written and flagged the conflict. The contract was wrong, not the build.
- **Boundaries:** may touch: `src/components/SlideshowPhotosManager.tsx`, `src/components/SlideshowPhotoSheet.tsx`. Must not touch: everything else.
- **What to build:** while the delete is in flight, the Delete button shows a pending state (disabled with "Deleting…" is fine; it must not look like nothing happened) and the sheet stays open. On `{ ok: true }` the photo leaves the grid and the sheet closes. On failure the sheet stays open with the error in its `role="alert"` line and the grid never changed. Remove the put-it-back-in-sorted-place code, since it is no longer needed.
- **Verification:** the gauntlet passes.
- **Evidence required:** the new `handleDelete` quoted; gauntlet last lines; `git show --stat HEAD`.
- **Done criteria:** Fury reads `handleDelete` and confirms no state change before the awaited result.
- **Report:** DONE (Stark, 2026-11-09). `handleDelete` awaits `deleteSlideshowPhoto` before any state change (Fury read it); the sheet shows "Deleting…" and disables both buttons while in flight; a failure stays in the sheet's alert line. Gauntlet green.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision (HEAD 3ad6ec1) | PASS | none | 9 notes; gauntlet re-run green; boundaries clean; auth, caching and EXIF parser reviewed |

| 1 | Captain (HEAD 3ad6ec1) | BLOCKED | 2: `SlideshowPhotoSheet.tsx:8-11` local `MONTH_NAMES`, and `SlideshowPhotosManager.tsx:15-18` local `Intl.DateTimeFormat` month formatter, both violate STRUCTURE.md's month-name rule ("a sixth definition is a BLOCKER") | notes: mission number at STRUCTURE.md:17; `normalizeCaption` copy; repeated `select` (export `SLIDESHOW_PHOTO_SELECT`); `canSyncCalendars` name gates two doors; no own `loading.tsx`; full-width Add button on iPad (for Strange); proposed amendments A (caching rule wording), B (Slideshow photos one-source-of-truth entry), C (Wide pages list) |

| 1 | Strange (HEAD 3ad6ec1, dev server, Bryce's session, dev store) | BLOCKED | 2: failure line renders "1 photocouldn't be added." (JSX drops the space, Manager :122-123); on iPad the "Add photos" button (1148x48) and the progress/failure rows stretch the full page width (STRUCTURE.md wide-page rule 3, ipad-landscape-v1 rules 3-4) | passed: Settings row matches Manage family, count 0/4/0; count wording; upload progress; 3 / 7 column grid; thumbs only (~13 KB), full ~75 KB; cache headers; taken dates exact (no off-by-one); caption save + collapse; delete waits ("Deleting…" then removed); 48px targets; contrast both themes. Notes: alt text identical for undated cells (use takenOn); "1 photo. They show…" grammar (Bryce's copy); unreadable file loses its reason; failure row never clears; focus falls to BODY after delete; counter counts before whitespace collapse. Cleanup: 5 test photos uploaded and deleted through the page, final count 0, `public/strange-test/` removed. |

| 2 | Captain (HEAD e47b78e) | PASS | none (both pass-1 blockers cleared) | notes: STRUCTURE.md at 1,770 lines, 13 below the 1,783 cleanup trigger, so the next rule-adding mission should run the cleanup pass first; `shortDateWithYear` duplicates `VacationCard.tsx:17`'s text shape (candidate shared helper); `public/strange-test/` present mid-gate, confirm removed before merge; no own `loading.tsx` (carried leftover) |

| 2 | Strange (HEAD e47b78e) | PASS | none (both pass-1 blockers cleared) | failure line "1 photo couldn't be added." (real failure forced by patching fetch, then restored); unreadable file shows "That photo couldn't be read." with no Try again; Add photos 165x48 on iPad, rows 448 wide, phone unchanged; count wording 0/1/2+ correct; focus to Add photos after each delete; alt text from takenOn; messages clear after a later success. Note: a batch with both an upload error and an unreadable file shows only the upload error. Cleanup: 5 test photos uploaded and deleted, final 0, `public/strange-test/` removed (Fury confirmed). |

| 2 | Vision (HEAD e47b78e, `git diff 3ad6ec1 HEAD`) | PASS | none | gauntlet re-run green; guards still first; new cleanup only reaches a path the same call made; select has no paths; notes: a photo over 3.5 MiB after shrinking would fail every retry (unproven at real sizes; later: re-encode lower or treat as unreadable); delete during upload leaves focus on body |

### C4 — Gate pass 1 fix batch
- **Status:** PENDING
- **Objective:** Clear the four gate-pass-1 blockers and the notes Fury took, in one dispatch.
- **Boundaries:** may touch: `src/components/SlideshowPhotosManager.tsx`, `src/components/SlideshowPhotoSheet.tsx`, `src/lib/slideshowPhotos.ts`, `src/lib/slideshowPhotos.test.ts`, `src/lib/slideshowRead.ts`, `src/lib/shrinkPhoto.ts`, `src/app/actions/slideshowPhotos.ts`, `src/app/(app)/settings/page.tsx`, `STRUCTURE.md` (line 17's "mission-56" to "mission-57" only; the amendments wait for Bryce). Must not touch: everything else, including `prisma/`, `src/lib/mealPlanDates.ts`, `src/lib/householdDate.ts`, `src/lib/gridClasses.ts`.
- **Blockers:**
  1. (Captain) `SlideshowPhotoSheet.tsx`: delete the local `MONTH_NAMES`; use `FULL_MONTH_NAMES` from `@/lib/mealPlanDates`. Keep the label built from the `YYYY-MM-DD` text with no timezone conversion (`parseDateParam` from `@/lib/householdDate` is fine if it fits; null means "Added by <name>").
  2. (Captain) `SlideshowPhotosManager.tsx`: delete `addedDate` and its `Intl.DateTimeFormat`; build dates with `calendarDateInZone(..., HOUSEHOLD_TIME_ZONE)` and `formatShortCalendarDate` from `@/lib/householdDate` (see note 5 for the new alt wording).
  3. (Strange) The failure line must read "1 photo couldn't be added." / "N photos couldn't be added." with the space: build the sentence in one expression.
  4. (Strange) From `md` up, "Add photos" hugs its label (`md:w-auto md:px-6`, the `LogLeftoverButton.tsx` pattern), and the progress block and failure row are capped at `md:max-w-md`. Below `md` nothing changes.
- **Notes taken:**
  5. Alt text: "Photo taken <Mon D, YYYY>" from `takenOn` when there is one, otherwise "Photo added <Mon D, YYYY>" (Denver), both through the shared helpers in blocker 1/2 (short month names from the shared source, never a new list).
  6. Use `normalizeCaption` in `handleSaveCaption` instead of the inline copy.
  7. Export `SLIDESHOW_PHOTO_SELECT` from `slideshowRead.ts` and use it in both `listSlideshowPhotos` and the action's `create` select.
  8. `PHOTO_MAX_BYTES` becomes `3.5 * 1024 * 1024` (Vercel Functions' request body limit is 4.5 MB; photo + thumb + multipart must fit); update its test.
  9. If the first `put` throws, still try to delete `photoPath` (deleting a missing path is harmless).
  10. `shrinkPhoto`: set `imageSmoothingQuality = "high"` on both canvases.
  11. A file `shrinkPhoto` cannot read shows its own message ("That photo couldn't be read.") in the alert line and is not offered for "Try again"; only upload failures are retried.
  12. The failure row clears when any later action succeeds (delete or caption save) and has no stale state across uploads.
  13. After a successful delete, focus moves to the "Add photos" button.
  14. `settings/page.tsx`: add `const canManageSlideshow = canSyncCalendars;` with a one-line comment, and gate the row on it.
  15. STRUCTURE.md:17: "mission-56" becomes "mission-57" (a correction, not an amendment).
- **Not taken:** Captain's own `loading.tsx` for the page (fine to inherit for now; recorded as a leftover); the counter counting before whitespace collapse (harmless); dropping the redundant `user.isDevice ||` checks (harmless until tablet PR B).
- **Verification:** the gauntlet passes; the test count rises only by any new tests you add.
- **Evidence required:** each blocker's new code quoted; `grep -n "MONTH_NAMES\|DateTimeFormat" src/components/Slideshow*.tsx` returns nothing; gauntlet last lines; `git show --stat HEAD`.
- **Done criteria:** Captain and Strange pass 2 both PASS.
- **Report:** DONE (Stark, commit dd480ca): all 4 blockers and notes 5 to 15 built; tsc, eslint, both test timezones green (1621); Fury re-ran `npm run build` (exit 0) because Stark's capture missed the exit code. Untested at runtime: focus after delete and iPad widths (Strange pass 2).
- **Fury, after Bryce's approvals (2026-11-09):** one-photo wording now "1 photo. It shows on the wall tablet." (Bryce approved); Captain's amendments A (caching rule wording), B (Slideshow photos one-source-of-truth entry) and C (Wide pages list and container) written into STRUCTURE.md (Bryce approved).

**Vision pass 1 notes queued for the fix batch:** STRUCTURE.md:17 says "mission-56" (renumbered, now 57); `SlideshowPhotosManager.tsx:90` re-implements `normalizeCaption`; `PHOTO_MAX_BYTES` (4 MiB) + thumb + multipart overhead can exceed Vercel Functions' 4.5 MB request body limit (lower to 3.5 MiB); first `put` throwing after storing leaves an orphan (clean up that path too); thumbnail drawn without `imageSmoothingQuality = "high"`. Not taken: the route answering 500 on a Blob outage (a broken image either way); a caption save on a photo another parent deleted keeps it in the grid until reload (rare, harmless).

**Done-means correction (Vision note):** a signed-out request never reaches the image route: `proxy.ts` redirects it to `/login` like every protected path, which leaks nothing. The route's own 404 covers a valid cookie whose user fails verification. The Brief's "a signed-out request gets 404" was Fury's wording error; the code follows the plan.

## Handoff log

- 2026-11-09: Plan approved and committed on branch `claude/family-screensaver-slideshow-263de9`. Mission file opened. Photos page mock shown to Bryce; waiting on his answers and his yes to create two private Blob stores (production and dev) on the Marsh Team.
- 2026-11-09: C1 preflight: 3 hard failures, all over-cap files that are not code (`package-lock.json`, `prisma/schema.prisma`, `STRUCTURE.md`), the same exemption every migration mission has used. REVIEW claim "both files flat in `src/lib/` are picked up by the glob" checked: `package.json` test script globs `src/lib/*.test.ts`. Worktree `.env` symlinked to the main checkout's (the same link the other worktrees use; gitignored).
- 2026-11-09: Bryce approved the mock and the stores. Both stores created (see "Blob stores"). Waiting on Bryce's dashboard connect and `.env` step; contracts next.

## Delivery

- **Shipped:** the `SlideshowPhoto` table (migration `20261115000000_slideshow_photos`), private Blob storage through `src/lib/slideshowBlob.ts`, the login-checked image route, the add/caption/delete actions, the in-browser shrink and EXIF date reader, and the Slideshow photos page with its Settings row. Gates: Vision PASS (pass 2), Captain PASS (pass 2), Strange PASS (pass 2). STRUCTURE.md amendments A, B, C (Bryce-approved).
- **Shipped check:** pushed 2026-11-09 as PR #94 (`git log origin/claude/family-screensaver-slideshow-263de9..HEAD` empty at push). Merged as e62056c; production deploy dpl_ECGfBri8pesymrLFLENYfZgQefr3 READY with the migration applied (checked by mission 62, 2026-11-09).
- **Deliberate leftovers:**
  - No own `loading.tsx` for `/settings/slideshow` (inherits the Settings skeleton).
  - A shrunk photo over 3.5 MiB fails every retry; unproven at real sizes. If Bryce's phone test hits it, re-encode at lower quality in `shrinkPhoto`.
  - A batch with both an upload error and an unreadable file shows only the upload error.
  - `shortDateWithYear` in the Manager builds the same text as `VacationCard.tsx:17`; a shared `formatShortCalendarDateWithYear` is a candidate helper.
  - The caption counter counts before whitespace collapse.
  - STRUCTURE.md is 1,770 lines, 13 below its cleanup trigger: run the cleanup pass before S2 adds rules.
  - Real iPhone HEIC photos and the on-screen keyboard over the sheet are proven only by Bryce's phone check (`.avengers/status.md`).
- **Model note (cost discipline):** Vision on Fable missed nothing a re-read caught; its pass-1 mission-number note was also found by Captain.
