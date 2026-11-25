// Who may set a star value on a habit (mission 79): parents and admins. A
// kid or a device login may still edit a habit they are on, but their save
// never changes stars. Pure: no `server-only`, no database.

import { MANAGER_ROLES } from "../constants";

export function canSetStars(role: string): boolean {
  return (MANAGER_ROLES as readonly string[]).includes(role);
}
