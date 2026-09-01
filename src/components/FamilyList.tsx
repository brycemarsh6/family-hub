"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { AvatarBadge } from "@/components/AvatarBadge";
import { FloatingAddButton } from "@/components/FloatingAddButton";
import { CreatePersonSheet } from "@/components/CreatePersonSheet";
import { PersonManageSheet } from "@/components/PersonManageSheet";
import type { PersonInfo } from "@/lib/personInfo";
import { ROLE_LABELS } from "@/lib/constants";

/** Active people first (alphabetical), deactivated people dimmed and
 * sorted last (also alphabetical among themselves) — per the C3 contract.
 * Re-run on every render rather than stored, so a deactivate/reactivate
 * immediately moves someone to the right place in the list. */
function sortPeople(people: PersonInfo[]): PersonInfo[] {
  return [...people].sort((a, b) => {
    const aOut = a.deactivatedAt !== null;
    const bOut = b.deactivatedAt !== null;
    if (aOut !== bOut) return aOut ? 1 : -1;
    return a.displayName.localeCompare(b.displayName);
  });
}

/**
 * Manage Family's list: everyone in the household, a per-person action
 * sheet, and a floating + to add someone new. Local state mirrors the
 * server on every write (the same pattern CookbookDetail/
 * ShareRecipeControls already established) rather than router.refresh(),
 * so a rename or a role change feels instant.
 */
export function FamilyList({
  people: initialPeople,
  currentUserId,
}: {
  people: PersonInfo[];
  currentUserId: string;
}) {
  const [people, setPeople] = useState(initialPeople);
  const [addOpen, setAddOpen] = useState(false);
  const [managingId, setManagingId] = useState<string | null>(null);

  const managingPerson = people.find((p) => p.id === managingId) ?? null;
  const sorted = sortPeople(people);

  function handleCreated(person: PersonInfo) {
    setPeople((prev) => [...prev, person]);
    setAddOpen(false);
  }

  function handleUpdated(person: PersonInfo) {
    setPeople((prev) => prev.map((p) => (p.id === person.id ? person : p)));
  }

  return (
    <div>
      <ul className="flex flex-col gap-2">
        {sorted.map((person) => {
          const deactivated = person.deactivatedAt !== null;
          return (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => setManagingId(person.id)}
                className={`flex min-h-16 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 text-left transition-colors active:bg-surface-2 ${
                  deactivated ? "opacity-50" : ""
                }`}
              >
                <AvatarBadge
                  displayName={person.displayName}
                  avatarColor={person.avatarColor}
                  size={40}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span className="truncate text-base font-medium">
                      {person.displayName}
                      {person.id === currentUserId && (
                        <span className="text-muted"> (you)</span>
                      )}
                    </span>
                    {deactivated && (
                      <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
                        Deactivated
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-muted">
                    {ROLE_LABELS[person.role]} ·{" "}
                    {person.hasAccount ? "Account" : "Profile — can't sign in"}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Keeps the last row clear of the floating add button. */}
      <div aria-hidden="true" className="h-20" />

      <FloatingAddButton onClick={() => setAddOpen(true)} />

      {addOpen && (
        <CreatePersonSheet onCreated={handleCreated} onClose={() => setAddOpen(false)} />
      )}

      {managingPerson && (
        <PersonManageSheet
          key={managingPerson.id}
          person={managingPerson}
          isSelf={managingPerson.id === currentUserId}
          onUpdated={handleUpdated}
          onClose={() => setManagingId(null)}
        />
      )}
    </div>
  );
}
