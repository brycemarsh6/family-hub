// Pure helpers for the Alexa Skills Kit request/response shape.
//
// Deliberately has no "server-only" guard and holds no secrets: the expected
// skill ID arrives as a parameter rather than being read from process.env
// here, which is what lets these functions run under `node --test` with no
// server context at all — same precedent as src/lib/match.ts and
// src/lib/duplicates.ts. The route handler that reads ALEXA_SKILL_ID from
// the environment and does signature/timestamp verification is a separate
// piece (src/app/api/alexa/route.ts).
//
// The types below are hand-written and cover only the fields this app
// actually reads, not the full Alexa Skills Kit schema — there is no
// `ask-sdk-model` dependency in this project and none is being added for
// this.

/** The one custom slot this skill has — see alexa/interaction-model.json. */
type AlexaSlot = {
  value?: string;
};

type AlexaIntent = {
  name?: string;
  slots?: {
    command?: AlexaSlot;
  };
};

type AlexaRequest = {
  type?: string;
  intent?: AlexaIntent;
  timestamp?: string;
};

type AlexaApplication = {
  applicationId?: string;
};

type AlexaSession = {
  application?: AlexaApplication;
};

type AlexaContext = {
  System?: {
    application?: AlexaApplication;
  };
};

/** The subset of an Alexa request envelope this app reads. */
export type AlexaRequestEnvelope = {
  version?: string;
  session?: AlexaSession;
  context?: AlexaContext;
  request?: AlexaRequest;
};

/**
 * Is this request genuinely addressed to *our* skill?
 *
 * Amazon's request signature (verified in the route handler, not here)
 * proves a request came from Alexa — it says nothing about which skill it
 * was meant for. Any developer can point a skill's endpoint at this URL and
 * Amazon will sign that request just as validly. `applicationId` is the
 * field that actually distinguishes "our skill" from "someone else's skill
 * calling our endpoint", so this check is the real gate, and it fails
 * closed in every direction: no expected ID configured, no ID anywhere in
 * the envelope, or a mismatch on any ID that *is* present all return false.
 *
 * The ID can show up in either `session.application.applicationId` or
 * `context.System.application.applicationId` (Alexa sends both on most
 * request types, but only one on some) — an ID present in just one location
 * is enough to pass, as long as it matches; it's a *mismatch*, not an
 * absence, that fails the check.
 */
export function isFromOurSkill(
  envelope: AlexaRequestEnvelope,
  expectedSkillId: string,
): boolean {
  const expected = expectedSkillId.trim();
  if (!expected) return false;

  const sessionId = envelope.session?.application?.applicationId;
  const contextId = envelope.context?.System?.application?.applicationId;
  const presentIds = [sessionId, contextId].filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  if (presentIds.length === 0) return false;

  return presentIds.every((id) => id === expected);
}

/**
 * Pull the raw spoken text out of the one slot this skill's intent carries.
 *
 * `CommandIntent`'s only sample utterance is `{command}` (see
 * alexa/interaction-model.json) — Alexa's speech-to-text lands whatever was
 * said, verbatim, in this one slot, and `parseTranscript` (src/lib/voice/
 * parse.ts) does the actual interpretation. Returns "" rather than throwing
 * when the intent, its slots, or the value are missing, so callers can treat
 * "nothing to parse" as a plain empty-string check.
 */
export function getSpokenText(envelope: AlexaRequestEnvelope): string {
  const value = envelope.request?.intent?.slots?.command?.value;
  return typeof value === "string" ? value.trim() : "";
}

type AlexaOutputSpeech = {
  type: "PlainText";
  text: string;
};

/** The shape every Alexa response is wrapped in. */
export type AlexaResponseEnvelope = {
  version: "1.0";
  response: {
    outputSpeech?: AlexaOutputSpeech;
    reprompt?: { outputSpeech: AlexaOutputSpeech };
    shouldEndSession?: boolean;
  };
};

/**
 * A plain spoken reply.
 *
 * PlainText, not SSML: `applyActions` (src/lib/voice/apply.ts) returns plain
 * prose sentences ("Took 2 off Hot dogs — 3 left."), and nothing in this
 * app builds SSML markup, so there's nothing for an SSML wrapper to add.
 */
export function speech(
  text: string,
  options: { endSession: boolean },
): AlexaResponseEnvelope {
  return {
    version: "1.0",
    response: {
      outputSpeech: { type: "PlainText", text },
      shouldEndSession: options.endSession,
    },
  };
}

/**
 * A spoken reply that keeps the microphone open for a follow-up, with a
 * reprompt if the user says nothing at all. Alexa requires a reprompt on any
 * response that leaves the session open, or the platform's own generic
 * reprompt is used instead — this is for LaunchRequest's "what can I help
 * with" opener, where an unanswered prompt should ask again in our own
 * words, not Alexa's.
 */
export function speechWithReprompt(
  text: string,
  reprompt: string,
): AlexaResponseEnvelope {
  return {
    version: "1.0",
    response: {
      outputSpeech: { type: "PlainText", text },
      reprompt: { outputSpeech: { type: "PlainText", text: reprompt } },
      shouldEndSession: false,
    },
  };
}

/**
 * The reply to a SessionEndedRequest.
 *
 * Alexa's own docs forbid returning outputSpeech (or a card, or a reprompt)
 * in response to SessionEndedRequest — the session is already over, so
 * there's nothing left to say out loud. This is the one response with no
 * `outputSpeech` key at all, not an empty string.
 */
export function emptyResponse(): AlexaResponseEnvelope {
  return {
    version: "1.0",
    response: {
      shouldEndSession: true,
    },
  };
}
