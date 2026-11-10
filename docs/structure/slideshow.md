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
  pathname) and `toDimension`. `src/lib/exifDate.ts` (pure) is the only
  EXIF reader. `src/lib/shrinkPhoto.ts` (`client-only`) is the only
  in-browser photo shrink. `src/lib/slideshowBlob.ts` (`server-only`, no
  auth, never a `token` option) is the only importer of `@vercel/blob`;
  its callers are `actions/slideshowPhotos.ts` (put, delete) and the image
  route (get), each carrying its own gate. `src/lib/slideshowRead.ts`
  (`server-only`, no auth) is the only reader of `SlideshowPhoto` and owns
  `SLIDESHOW_PHOTO_SELECT`; its list never carries the stored paths.
  `addSlideshowPhoto`, `updateSlideshowCaption` and `deleteSlideshowPhoto`
  (guard form a, `MANAGER_ROLES`) are the only writers; if a second caller
  appears (a Winnie route, the tablet's slideshow), the writes move into
  `src/lib/slideshowWrites.ts` first. The bytes go out through
  `src/app/api/slideshow/[id]/image/route.ts` alone. **`SlideshowPhoto`
  has no Prisma relation to `User` on purpose** (the `Feedback`
  precedent): `uploadedById` is a plain id and `uploadedByName` a
  snapshot; adding the relation later is a separate additive migration
  that first confirms no `uploadedById` lacks a `User` row. A second
  reader, writer, Blob importer or caption cleaner is a BLOCKER. (Added
  mission-57, on Captain's ruling, Bryce-approved.)
