"use client";

import { useState, useTransition } from "react";
import { AvatarBadge } from "@/components/AvatarBadge";
import { SortableList } from "@/components/SortableList";
import { setFamilyOrder } from "@/app/actions/usersOrder";

export type OrderPerson = { id: string; displayName: string; avatarColor: string };

/**
 * Drag active household people into the order they appear in across Marshee.
 * Saves on every drop; the new order shows at once and snaps back with an
 * error line if the save fails.
 */
export function FamilyOrderList({ people }: { people: OrderPerson[] }) {
  const [order, setOrder] = useState(people);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onReorder(ids: string[]) {
    const previous = order;
    const byId = new Map(order.map((person) => [person.id, person]));
    setOrder(ids.flatMap((id) => byId.get(id) ?? []));
    setError(null);
    startTransition(async () => {
      let message: string | null = null;
      try {
        const result = await setFamilyOrder(ids);
        if ("error" in result) message = result.error;
      } catch {
        message = "Couldn't save the order. Try again.";
      }
      if (message) {
        setOrder(previous);
        setError(message);
      }
    });
  }

  return (
    <div>
      <SortableList
        items={order}
        label={(person) => person.displayName}
        onReorder={onReorder}
        className="space-y-2"
        itemClassName="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface px-3"
        renderItem={(person, { grip }) => (
          <>
            <AvatarBadge displayName={person.displayName} avatarColor={person.avatarColor} size={36} />
            <span className="min-w-0 flex-1 truncate font-medium">{person.displayName}</span>
            {grip}
          </>
        )}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
