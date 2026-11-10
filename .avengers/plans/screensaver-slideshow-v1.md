# Screensaver slideshow v1: family photos on the wall tablet

Status: **approved by Bryce 2026-11-09.** S1 is next.

## Context

Bryce wants the kitchen wall tablet to show family photos when nobody is
using it. After about 30 minutes with no taps, Marshee switches to a
full-screen slideshow. A tap opens Marshee on a chosen page. At night the
app goes black instead of showing photos.

This is the first feature that stores photos. Earlier photo ideas (recipe
photos, profile pictures, vision card photos) were each skipped because
Vercel Blob cost money. Bryce's Vercel team is now on Pro (he confirmed with
a screenshot, 2026-11-09), so that reason is gone for this feature. Those
older features stay out of scope here.

What the code has today (Banner's research, 2026-11-09):
- No idle timer, slideshow, photo storage or "default page" idea exists.
- Login always lands on `/` (`src/app/actions/auth.ts:98`).
- Per-login settings live in `UserPreferences` (`prisma/schema.prisma:735`), read in `src/lib/dal.ts`, written in `src/app/actions/preferences.ts`.
- The Tablet is a login with `role: "device"`; code checks `user.isDevice`.
- Private images already have a pattern: a login-checked route, `/api/feedback/[id]/screenshot`.
- A photo picker that shrinks images in the browser exists in `src/components/PhotoImportForm.tsx`.
- The page list for a picker exists in one place: `NAV_SECTIONS` in `src/lib/nav.ts`.
- `AppChrome` (`src/components/AppChrome.tsx`) wraps every signed-in page, so the screensaver mounts there.

## Bryce's decisions (2026-11-09)

- **Photos are uploaded inside Marshee** and stored privately on his Vercel account.
- **Only parents and admins** add, caption and remove photos.
- **Only the Tablet login** gets the screensaver. Phones and personal logins never time out to it.
- **The tablet's screensaver settings live in parents' Settings**, in a "Wall tablet" section. Nothing is editable from the wall.
- **Tall photos:** show the whole photo, with a soft blurred copy of the same photo filling the sides.
- **Order:** shuffled, with no repeats until every photo has shown.
- **On top of the photo:** clock and date, caption, and when it was taken. Each is its own switch.
- **Timing:** starts after 30 minutes with no taps, 15 seconds per photo. Both adjustable with +/− steppers.
- **Sleep mode:** the app goes fully black at 10 PM and the slideshow returns at 6 AM. A tap wakes Marshee to the default page. If nobody touches it again during sleep hours, it goes back to black after 2 minutes.
  - **Every sleep detail is a setting:** on or off, start time, end time, and the back-to-black wait. Bryce does not want these fixed in code.
- **"Open Marshee on" (default page):** every login can pick one. It is where you land after logging in, and where a tap on the screensaver takes the tablet. Dashboard is the starting value.
- **"On this day":** yes, as a later PR. Photos taken on today's date in past years show early in the shuffle, and the date line reads like "2 years ago today".

## How it works (structure, Claude's recommendation)

### Photo storage

- **A private Vercel Blob store.** Photos are never public. A photo's storage address is useless without a Marshee login.
- **Two stores: one for production, one for dev.** Same reason the database has a dev branch: testing must never touch the family's real photos.
- **Photos are shrunk in the browser before upload** (longest side about 2048 px, JPEG), reusing the approach in `PhotoImportForm.tsx`. This keeps each photo around 1 MB, fast to upload on a phone and cheap to store.
- **The "taken" date is read from the photo file in the browser before shrinking**, because shrinking throws that information away. If a photo has no date, the date line is simply hidden for it.
- **A new table, `SlideshowPhoto`:** id, storage path, width, height, caption (optional), taken date (optional), who uploaded it, when. Additive migration only.
- **Photos are served by a new login-checked route**, `/api/slideshow/[id]/image`, copying the feedback screenshot route. Any signed-in login may view, the tablet included. It is never added to the public route lists in `proxy.ts`.
  - One difference from the feedback route: these responses should be cached privately in the browser, because the tablet re-shows the same photos all day. That needs a small amendment to the rule in STRUCTURE.md, for Captain to review.
- **Deleting a photo removes both the table row and the stored file.** Delete is one tap with no confirmation, like everywhere else in Marshee.

### Screensaver

- **Settings are one household row** in a new `ScreensaverSettings` table: start-after minutes, seconds per photo, three overlay switches, sleep on/off, sleep start, sleep end, back-to-black minutes.
- **The rules are pure code** in a new `src/lib/screensaver.ts`: given the time, the last tap and the settings, the answer is "awake", "slideshow" or "sleep". The shuffle is a pure function too. Both get tests, run in both timezones.
- **Sleep hours use Denver time** (`HOUSEHOLD_TIME_ZONE`), like every other "today" in the app.
- **One client component, `ScreensaverHost`**, mounted in `AppChrome` only when `user.isDevice`. It listens for taps, runs the timer and draws the full-screen overlay through a portal.
- **A tap on the slideshow or the black screen only wakes the app.** It never presses whatever button is underneath.
- **New photos and changed settings reach the tablet without a reload:** the host re-reads them each time the slideshow starts.
- **Keeping the iPad awake is the iPad's job.** Bryce's iPad is set to never auto-lock and dims by a shortcut at 11 PM. Marshee does not try to control the screen's power or brightness.

### Default page

- **A new `startPage` column on `UserPreferences`** (text, empty means Dashboard). The picker lists the drawer destinations from `NAV_SECTIONS`, so there is one source of truth.
- **Used in two places:** the redirect after login, and the tablet's tap-to-wake.
- **Visiting `/` always shows the dashboard.** The default page never hijacks the Dashboard link.
- The tablet's own default page is set by a parent in the "Wall tablet" section.

## The PRs (one chat each)

| PR | What ships | Bryce sees |
|---|---|---|
| **S1 Photos** | Blob stores, `SlideshowPhoto` table, upload, the login-checked image route, a "Slideshow photos" page under Settings for parents and admins (grid, add, caption, delete) | He can add and manage photos from his phone. No slideshow yet. |
| **S2 Screensaver** | `ScreensaverSettings` table, the "Wall tablet" settings section, the idle timer, the slideshow overlay (blurred sides, shuffle, clock, caption, date), sleep mode | The wall tablet shows photos after 30 minutes and goes black at night. A tap opens the dashboard. |
| **S3 Default page** | `startPage` setting for every login, used after login and on tap-to-wake | Each person, and the tablet, opens on their chosen page. |
| **S4 On this day** | Past-year photos from today's date shown first, with the "2 years ago today" line | Memories show up on their anniversaries. |

Each PR goes through the Avengers: Stark and Vision always, Strange for
anything visible, Captain for new files and tables.

## What Bryce needs to do (S1)

1. Approve creating two private Blob stores on the Marsh Team (production and dev). Claude can create them through the Vercel connection once he says yes.
2. Put the dev store's token in his local `.env` himself. Tokens never go in chat or git.

## Out of scope

- Video, Live Photos, albums, favorites.
- Pulling from Google Photos or iCloud.
- A photo gallery page for browsing (the "Not built yet" item stays not built).
- Recipe photos, profile pictures, vision card photos.
- Kids adding photos.
- Winnie (the Assistant API) seeing or managing photos.
- A screensaver on phones or personal logins.

## Risks and open questions

- **iPhone photo formats (HEIC).** The browser should convert these when shrinking, but it must be proven on Bryce's real phone in S1.
- **Storage cost.** Expected to be small (about 1 MB a photo), but the real Pro numbers have not been checked. Check Vercel's usage page after the first batch of uploads.
- **Privacy page.** `/privacy` was written for Google sign-in. Decide in S1 whether it should mention stored family photos.
- **How many photos at once.** Uploading 50 photos in one go needs a progress display and must survive one failure. Mock it for Bryce in S1.
- **Screen burn-in.** The clock sits in one corner all day. If it becomes a worry, a later change can move it between corners.

## Design questions still to mock for Bryce

- S1: the "Slideshow photos" page (grid, add button, caption editing, upload progress).
- S2: the real "Wall tablet" settings section, including the sleep rows, and the fade between photos.
- S3: the "Open Marshee on" picker.
