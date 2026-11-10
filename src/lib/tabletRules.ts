// What the kitchen tablet (role "device") may do beyond what every signed-in
// login can. One named check per rule, on purpose: mission 39 decision 10
// plans a per-login permissions page later, and each of these becomes one
// switch there without anyone hunting through action files for the
// scattered `role === "device"` tests.
//
// Pure functions over plain values, so they are unit-tested without a
// database (tabletRules.test.ts).

import type { Role } from "./constants";

/**
 * The tablet may check off any task, not only ones it is assigned to (a
 * device is never a TaskPerson). It only ever adds `device` to the people
 * who may: a kid still needs to be on the task, and un-completing a task
 * stays parent-only.
 */
export function tabletMayCompleteAnyTask(role: Role): boolean {
  return role === "device";
}

/**
 * The tablet may open the Wall tablet page and change its settings and its
 * start page (Bryce, 2026-11-10, mission 64). Parents and admins may too, by
 * the manager rule; this adds only `device`.
 */
export function tabletMayChangeWallTablet(role: Role): boolean {
  return role === "device";
}
