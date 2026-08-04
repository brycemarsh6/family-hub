import "server-only";
import { db } from "@/lib/db";
import { matchItem } from "@/lib/match";
import type { ParsedAction } from "@/lib/voice/parse";
import { toCategory, DEFAULT_LOCATION } from "@/lib/constants";

// Carries out the actions the parser found, and records each one so it can be
// undone. Every function here returns a sentence to be read back aloud —
// speaking the result is the whole safety mechanism for voice: a mishear
// becomes "took 2 off Tortilla chips" in the kitchen, which someone corrects on
// the spot, rather than a wrong number found weeks later.

export type ApplyResult = {
  /** What to say back. Always non-empty. */
  speech: string;
  /** True when nothing was changed, so the caller can pick a status code. */
  noop: boolean;
};

/** Trim a float to 2dp — quantities are things like 1.5 gallons, not 1.4999. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** "2 hot dogs" / "1 hot dog" — small thing, but it's read out loud. */
function plural(quantity: number, unit: string | null): string {
  if (!unit) return String(quantity);
  return `${quantity} ${unit}`;
}

async function applyUse(action: ParsedAction): Promise<string> {
  const items = await db.pantryItem.findMany({
    select: { id: true, name: true, quantity: true, unit: true },
  });
  const { match, ambiguous } = matchItem(action.item, items);
  if (!match) return `I couldn't find ${action.item} in the inventory.`;

  const current = items.find((i) => i.id === match.id);
  if (!current) return `I couldn't find ${action.item} in the inventory.`;

  // Never below zero — "out" is a real state, negative stock isn't.
  const next = round(Math.max(0, current.quantity - action.quantity));

  await db.pantryItem.update({
    where: { id: match.id },
    data: { quantity: next },
  });
  await db.voiceChange.create({
    data: {
      transcript: `use ${action.quantity} ${action.item}`,
      action: "use",
      pantryItemId: match.id,
      itemName: current.name,
      quantityBefore: current.quantity,
      quantityAfter: next,
    },
  });

  const left = next === 0 ? "none left" : `${plural(next, current.unit)} left`;
  // Naming the matched item is what makes an arbitrary pick recoverable.
  return ambiguous
    ? `Took ${action.quantity} off ${current.name} — ${left}. Say undo if you meant something else.`
    : `Took ${action.quantity} off ${current.name} — ${left}.`;
}

async function applyAdd(action: ParsedAction): Promise<string> {
  const items = await db.pantryItem.findMany({
    select: { id: true, name: true, quantity: true, unit: true },
  });
  const { match, ambiguous } = matchItem(action.item, items);

  // Genuinely new to the house — create it rather than refusing. Same
  // reasoning as "put away" on the shopping list.
  if (!match) {
    const created = await db.pantryItem.create({
      data: {
        name: action.item,
        quantity: action.quantity,
        category: toCategory(undefined),
        location: DEFAULT_LOCATION,
      },
    });
    await db.voiceChange.create({
      data: {
        transcript: `add ${action.quantity} ${action.item}`,
        action: "add",
        pantryItemId: created.id,
        itemName: created.name,
        quantityBefore: null,
        quantityAfter: action.quantity,
      },
    });
    return `Added ${action.item} to the pantry — ${action.quantity}. It's uncategorised, so tidy it up in the app when you get a chance.`;
  }

  const current = items.find((i) => i.id === match.id);
  if (!current) return `I couldn't find ${action.item} in the inventory.`;

  const next = round(current.quantity + action.quantity);
  await db.pantryItem.update({
    where: { id: match.id },
    data: { quantity: next },
  });
  await db.voiceChange.create({
    data: {
      transcript: `add ${action.quantity} ${action.item}`,
      action: "add",
      pantryItemId: match.id,
      itemName: current.name,
      quantityBefore: current.quantity,
      quantityAfter: next,
    },
  });

  return ambiguous
    ? `Added ${action.quantity} to ${current.name} — now ${plural(next, current.unit)}. Say undo if you meant something else.`
    : `Added ${action.quantity} to ${current.name} — now ${plural(next, current.unit)}.`;
}

async function applyBuy(action: ParsedAction): Promise<string> {
  // Already on the list? Don't stack duplicates — saying it twice while
  // cooking is normal.
  const existing = await db.groceryItem.findFirst({
    where: { name: { equals: action.item, mode: "insensitive" }, checked: false },
  });
  if (existing) return `${action.item} is already on the shopping list.`;

  // If it's a known pantry item, tag the grocery row with it so "put away"
  // later tops up the right jar instead of creating a duplicate.
  //
  // An ambiguous match is deliberately treated as no match here, unlike the
  // use/add paths. Saying "add milk to the list" when the house stocks seven
  // milks isn't a mishear to be confirmed — the speaker genuinely hasn't
  // chosen yet, and "milk" on the list lets whoever shops decide. Guessing
  // would put the wrong carton in the trolley.
  const pantryItems = await db.pantryItem.findMany({
    select: { id: true, name: true },
  });
  const result = matchItem(action.item, pantryItems);
  const match = result.ambiguous ? null : result.match;

  await db.groceryItem.create({
    data: {
      name: match ? match.name : action.item,
      quantity: action.quantity,
      category: toCategory(undefined),
      pantryItemId: match ? match.id : null,
    },
  });
  await db.voiceChange.create({
    data: {
      transcript: `buy ${action.quantity} ${action.item}`,
      action: "buy",
      pantryItemId: match ? match.id : null,
      itemName: match ? match.name : action.item,
      quantityBefore: null,
      quantityAfter: null,
    },
  });

  return `Put ${match ? match.name : action.item} on the shopping list.`;
}

/**
 * Reverse the most recent voice change that hasn't already been undone.
 *
 * Restores the recorded `quantityBefore` rather than adding the difference
 * back: if anything else touched the item in between, a straight restore is
 * predictable, whereas arithmetic would silently compound the other change.
 */
async function applyUndo(): Promise<string> {
  const last = await db.voiceChange.findFirst({
    where: { undoneAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!last) return "There's nothing to undo.";

  if (last.action === "buy") {
    await db.groceryItem.deleteMany({
      where: { name: last.itemName, checked: false },
    });
  } else if (last.pantryItemId && last.quantityBefore !== null) {
    await db.pantryItem.update({
      where: { id: last.pantryItemId },
      data: { quantity: last.quantityBefore },
    });
  } else if (last.pantryItemId && last.quantityBefore === null) {
    // The change created this item, so undoing it means removing it again.
    await db.pantryItem.delete({ where: { id: last.pantryItemId } });
  }

  await db.voiceChange.update({
    where: { id: last.id },
    data: { undoneAt: new Date() },
  });

  return `Undone — ${last.itemName} is back to how it was.`;
}

/** Run every action the parser found, in order, and compose one reply. */
export async function applyActions(
  actions: ParsedAction[],
): Promise<ApplyResult> {
  if (actions.length === 0) {
    return {
      speech: "I didn't catch anything about the kitchen there.",
      noop: true,
    };
  }

  const lines: string[] = [];
  for (const action of actions) {
    if (action.action === "undo") lines.push(await applyUndo());
    else if (action.action === "use") lines.push(await applyUse(action));
    else if (action.action === "add") lines.push(await applyAdd(action));
    else if (action.action === "buy") lines.push(await applyBuy(action));
  }

  return { speech: lines.join(" "), noop: false };
}
