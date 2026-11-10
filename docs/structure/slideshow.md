# STRUCTURE.md companion: Slideshow photos

Part of [STRUCTURE.md](../../STRUCTURE.md)'s "One source of truth" list,
cut from it word for word at commit e62056c on 2026-11-09 by mission 59.
Every rule here binds exactly like STRUCTURE.md; a second definition is a
BLOCKER. Each entry continues the headline kept in STRUCTURE.md.

## One source of truth

### Slideshow photos

`src/lib/slideshowPhotos.ts` has no
  imports, on purpose, and holds the rules: `CAPTION_MAX`,
  `PHOTO_MAX_BYTES`, `THUMB_MAX_BYTES`, `PHOTO_LONG_EDGE`,
  `THUMB_LONG_EDGE`, `PHOTO_TYPE`, `normalizeCaption` (the only caption
  cleaner), `isTakenOn`, `photoPaths` (the only builder of a stored
  pathname), `slideshowImageUrl` (the only builder of the image route's
  URL, `/api/slideshow/{id}/image`, with `?size=thumb` for the small copy)
  and `toDimension`. `src/lib/exifDate.ts` (pure) is the only
  EXIF reader. `src/lib/shrinkPhoto.ts` (`client-only`) is the only
  in-browser photo shrink. `src/lib/slideshowBlob.ts` (`server-only`, no
  auth, never a `token` option) is the only importer of `@vercel/blob`;
  its callers are `actions/slideshowPhotos.ts` (put, delete) and the image
  route (get), each carrying its own gate. `src/lib/slideshowRead.ts`
  (`server-only`, no auth) is the only reader of `SlideshowPhoto` and owns
  `SLIDESHOW_PHOTO_SELECT`; its list never carries the stored paths.
  `src/lib/slideshowWrites.ts` (`server-only`, no auth, no
  `revalidatePath`: `createSlideshowPhotoRow`, `updateSlideshowCaptionRow`,
  `deleteSlideshowPhotoRow`) holds the only writes to `SlideshowPhoto`.
  `addSlideshowPhoto`, `updateSlideshowCaption` and `deleteSlideshowPhoto`
  (guard form a, `MANAGER_ROLES`) call them and keep their own gates, the
  Blob calls and `revalidatePath`; a Winnie route would be a second caller
  with its own gate (mission-61). `listSlideshowShowItems` in
  `slideshowRead.ts` is the tablet's narrow list (id, size, caption, taken
  date; never the paths). The bytes go out through
  `src/app/api/slideshow/[id]/image/route.ts` alone. **`SlideshowPhoto`
  has no Prisma relation to `User` on purpose** (the `Feedback`
  precedent): `uploadedById` is a plain id and `uploadedByName` a
  snapshot; adding the relation later is a separate additive migration
  that first confirms no `uploadedById` lacks a `User` row. A second
  reader, writer, Blob importer or caption cleaner is a BLOCKER. (Added
  mission-57, on Captain's ruling, Bryce-approved.)

### Screensaver

Added by mission 61 (Screensaver S2). `src/lib/screensaver.ts` (pure; imports
  only `constants.ts`, `householdDate.ts`, `mealPlanDates.ts`) is the only
  home of the `ScreensaverSettings` type, `SCREENSAVER_DEFAULTS`, the step
  lists (`START_AFTER_STEPS`, `SECONDS_PER_PHOTO_STEPS`,
  `BACK_TO_BLACK_STEPS`, `SLEEP_MINUTE_STEP`) with `stepLadder` and
  `stepSleepMinute`, the row cleaner `toScreensaverSettings`, the save
  validator `parseScreensaverField`, `isSleepTime`, the screen rule
  `screensaverState`, the shuffle `pickNextPhoto`, the formatters
  `formatSleepMinute`, `formatScreensaverDate` and `formatTakenOn`, and
  `SCREENSAVER_WORDS`. Every screensaver word, the overlay's `aria-label`
  and the stepper units included, is in `SCREENSAVER_WORDS`; components
  never type them. `src/lib/screensaverRead.ts` (`server-only`, no auth) is
  the only reader of `ScreensaverSettings`; a missing row reads as the
  defaults. `saveScreensaverSetting` (`actions/screensaver.ts`, guard form
  a, `MANAGER_ROLES`, never a device) is the only writer; if a second
  caller appears (a Winnie route), the write moves into
  `src/lib/screensaverWrites.ts` first. `loadScreensaverShow` (guard form
  a, device logins only, `null` on refusal) is the tablet's only fresh
  read. The `(app)` layout reads the settings for a device login alone,
  and only `AppChrome` mounts `ScreensaverHost`. Its overlay is portaled
  to `document.body` after mount, above the drawer. Its clock and date
  lines use `formatHouseholdClock` and `formatScreensaverDate` with
  `HOUSEHOLD_TIME_ZONE` in the browser on purpose: the tablet shows Denver
  whatever its own zone. `ScreensaverSlide` builds image URLs only with
  `slideshowImageUrl`. `ScreensaverSettings` has no relation to `User`
  (`updatedById` is a plain id, the `SlideshowPhoto` precedent). A second
  reader, writer, state rule, shuffle or step list is a BLOCKER. (Added
  mission-61, on Captain's ruling, Bryce-approved.)
