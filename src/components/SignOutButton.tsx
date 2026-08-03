import { logout } from "@/app/actions/auth";

/**
 * Sign out, in the header.
 *
 * A plain <form> pointed straight at the Server Action — no client-side
 * JavaScript involved, the browser just submits it. Rendered only when
 * there's a session (see the root layout), so it never appears on the
 * login page.
 */
export function SignOutButton() {
  return (
    <form action={logout} className="ml-auto">
      <button
        type="submit"
        className="min-h-11 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        Sign out
      </button>
    </form>
  );
}
