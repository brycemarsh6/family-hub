// Marshee's public privacy policy (the Google consent screen needs this URL).
// Plain static text. Wording approved by Bryce 2026-11-08. Keep it true to the
// code: unlinking is src/app/actions/linkedCalendars.ts (asks Google to revoke
// the token, then deletes the stored account and its calendars).

const sectionTitle = "mt-8 mb-2 text-xl font-semibold";

export default function PrivacyPage() {
  return (
    <article className="leading-relaxed">
      <h1 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
        Marshee privacy policy
      </h1>
      <p className="text-sm text-muted">Last updated: November 8, 2026</p>

      <h2 className={sectionTitle}>What Marshee is</h2>
      <p>
        Marshee is a private app for one family. It is not a public product,
        and it is not sold or marketed to anyone.
      </p>

      <h2 className={sectionTitle}>If you link Google Calendar</h2>
      <p>
        A family member can link their Google account to Marshee. When they do,
        Marshee asks Google for three things:
      </p>
      <ul className="my-2 list-disc space-y-1 pl-6">
        <li>your email address</li>
        <li>the list of your calendars</li>
        <li>
          permission to see, create, change and delete events on calendars you
          own
        </li>
      </ul>
      <p>
        Marshee uses these to show your Google events inside Marshee, and to
        add or change events from Marshee.
      </p>

      <h2 className={sectionTitle}>What Marshee keeps</h2>
      <p>
        Marshee stores your email address, Google&apos;s ID for your account,
        the names and colors of your calendars, and a login token for the link.
        The token is encrypted. Marshee keeps nothing else from Google except
        what it needs to show your calendar.
      </p>

      <h2 className={sectionTitle}>Who sees it</h2>
      <p>
        Nothing from Google is sold, shared with advertisers, or given to
        anyone outside the family.
      </p>

      <h2 className={sectionTitle}>Unlinking</h2>
      <p>
        You can unlink Google at any time in Marshee, under Settings, then
        Calendars. When you unlink, Marshee asks Google to cancel the login
        token, then deletes your stored account details and calendar list. If
        Google doesn&apos;t answer, Marshee still unlinks and deletes. You can
        also remove access yourself at myaccount.google.com/permissions.
      </p>

      <h2 className={sectionTitle}>Google API Services User Data Policy</h2>
      <p>
        Marshee&apos;s use and transfer of information received from Google
        APIs follows the{" "}
        <a
          className="underline"
          href="https://developers.google.com/terms/api-services-user-data-policy"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements.
      </p>

      <h2 className={sectionTitle}>Contact</h2>
      <p>
        <a className="underline" href="mailto:bryce.r.marsh@gmail.com">
          bryce.r.marsh@gmail.com
        </a>
      </p>
    </article>
  );
}
