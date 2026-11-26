import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { isOwnerCopy } from "@/lib/copyConfig";
import type { CalendarDate } from "@/lib/householdDate";
import {
  aiAccess,
  aiMonthWindow,
  costMicroUsd,
  parseAllowanceCents,
  parseUpgradeUrl,
  type AiBlockReason,
  type AiFeature,
} from "@/lib/aiMeterPolicy";

// The one door to Anthropic (mission 92, family copies PR 5). Every AI call in
// the app goes through `meteredCreate`: it refuses a relative's copy once the
// month's allowance is spent (before Anthropic is called, so a blocked call
// costs nothing) and records every call's tokens and cost. The rules
// themselves are pure code in `aiMeterPolicy.ts`.
//
// Two calls at the same moment can both pass the check and overshoot by one
// call. Accepted: the family's Anthropic key spend cap is the hard stop.

/** The copy may not make this AI call. Callers turn it into the friendly message; the message here is for logs only. */
export class AiAllowanceError extends Error {
  constructor(
    readonly reason: AiBlockReason,
    readonly resetsOn: CalendarDate,
  ) {
    super(`ai allowance: ${reason}`);
    this.name = "AiAllowanceError";
  }
}

/** The allowance in cents. Read at call time, never cached at module load. */
export function allowanceCents(): number {
  return parseAllowanceCents(process.env.AI_ALLOWANCE_CENTS);
}

/** The Upgrade link (`STRIPE_PAYMENT_LINK_URL`), or null when unset or not a good https URL. */
export function aiUpgradeUrl(): string | null {
  return parseUpgradeUrl(process.env.STRIPE_PAYMENT_LINK_URL);
}

async function usedThisMonth(start: Date, end: Date): Promise<number> {
  const total = await db.aiUsage.aggregate({
    _sum: { costMicroUsd: true },
    where: { createdAt: { gte: start, lt: end } },
  });
  return total._sum.costMicroUsd ?? 0;
}

/**
 * The Anthropic create call, metered. Throws `AiAllowanceError` before calling
 * Anthropic when this copy may not spend; otherwise returns the message and
 * saves a usage row (a failed save is logged, never thrown: the call is paid).
 */
export async function meteredCreate(
  feature: AiFeature,
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  const isOwner = isOwnerCopy();
  if (!isOwner) {
    const { start, end, resetsOn } = aiMonthWindow(new Date(), HOUSEHOLD_TIME_ZONE);
    const access = aiAccess({
      isOwner,
      allowanceCents: allowanceCents(),
      usedMicroUsd: await usedThisMonth(start, end),
    });
    if (access !== "allow") throw new AiAllowanceError(access, resetsOn);
  }

  // Constructed per call: a missing API key should fail this one request with
  // a clear message, not crash the app at boot.
  const response = await new Anthropic().messages.create(params);

  try {
    await db.aiUsage.create({
      data: {
        feature,
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
        costMicroUsd: costMicroUsd(response.model, response.usage),
      },
    });
  } catch (error) {
    console.error("[aiMeter] could not save the usage row:", error);
  }

  return response;
}

export type AiMonthSummary = {
  usedMicroUsd: number;
  requests: number;
  byFeature: { feature: string; requests: number; costMicroUsd: number }[];
  resetsOn: CalendarDate;
};

/** This household month's AI use, for the Settings card. */
export async function loadAiMonthSummary(now: Date): Promise<AiMonthSummary> {
  const { start, end, resetsOn } = aiMonthWindow(now, HOUSEHOLD_TIME_ZONE);
  const groups = await db.aiUsage.groupBy({
    by: ["feature"],
    where: { createdAt: { gte: start, lt: end } },
    _sum: { costMicroUsd: true },
    _count: { _all: true },
  });
  const byFeature = groups.map((g) => ({
    feature: g.feature,
    requests: g._count._all,
    costMicroUsd: g._sum.costMicroUsd ?? 0,
  }));
  return {
    usedMicroUsd: byFeature.reduce((sum, g) => sum + g.costMicroUsd, 0),
    requests: byFeature.reduce((sum, g) => sum + g.requests, 0),
    byFeature,
    resetsOn,
  };
}
