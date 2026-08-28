// Real unit tests (node:test, zero new dependencies) for the pure Alexa
// helpers. Run with `npm test`.
//
// Phase A's honest limit applies here too (see the mission file): no
// request craftable in this environment carries a genuine Amazon signature,
// so these tests only cover the pure functions in alexa.ts — the
// skill-ID predicate, slot extraction, and the response builders. They do
// not and cannot prove a real Alexa request reaches this endpoint; that's
// Phase C, against a live signed request.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isFromOurSkill,
  getSpokenText,
  speech,
  speechWithReprompt,
  emptyResponse,
  type AlexaRequestEnvelope,
} from "./alexa";

const OUR_SKILL_ID = "amzn1.ask.skill.our-real-skill-id";
const OTHER_SKILL_ID = "amzn1.ask.skill.someone-elses-skill-id";

function envelopeWith(
  sessionId?: string,
  contextId?: string,
): AlexaRequestEnvelope {
  return {
    session: sessionId ? { application: { applicationId: sessionId } } : {},
    context: contextId
      ? { System: { application: { applicationId: contextId } } }
      : {},
  };
}

test("isFromOurSkill: accepts a matching ID present in both locations", () => {
  const envelope = envelopeWith(OUR_SKILL_ID, OUR_SKILL_ID);
  assert.equal(isFromOurSkill(envelope, OUR_SKILL_ID), true);
});

test("isFromOurSkill: rejects a mismatched ID", () => {
  const envelope = envelopeWith(OTHER_SKILL_ID, OTHER_SKILL_ID);
  assert.equal(isFromOurSkill(envelope, OUR_SKILL_ID), false);
});

test("isFromOurSkill: rejects an envelope with no application ID anywhere", () => {
  const envelope = envelopeWith();
  assert.equal(isFromOurSkill(envelope, OUR_SKILL_ID), false);
});

test("isFromOurSkill: fails closed when the expected ID is empty", () => {
  const envelope = envelopeWith(OUR_SKILL_ID, OUR_SKILL_ID);
  assert.equal(isFromOurSkill(envelope, ""), false);
});

test("isFromOurSkill: fails closed when the expected ID is only whitespace", () => {
  const envelope = envelopeWith(OUR_SKILL_ID, OUR_SKILL_ID);
  assert.equal(isFromOurSkill(envelope, "   "), false);
});

test("isFromOurSkill: a matching ID present in only session.application passes", () => {
  const envelope = envelopeWith(OUR_SKILL_ID, undefined);
  assert.equal(isFromOurSkill(envelope, OUR_SKILL_ID), true);
});

test("isFromOurSkill: a matching ID present in only context.System.application passes", () => {
  const envelope = envelopeWith(undefined, OUR_SKILL_ID);
  assert.equal(isFromOurSkill(envelope, OUR_SKILL_ID), true);
});

test("isFromOurSkill: one location matches and the other mismatches — rejected", () => {
  // A mismatch anywhere it's present fails the check, even if the other
  // location is correct — this is the "any present ID mismatches" case.
  const envelope = envelopeWith(OUR_SKILL_ID, OTHER_SKILL_ID);
  assert.equal(isFromOurSkill(envelope, OUR_SKILL_ID), false);
});

test("isFromOurSkill: an entirely empty envelope is rejected", () => {
  assert.equal(isFromOurSkill({}, OUR_SKILL_ID), false);
});

test("getSpokenText: returns the command slot's value", () => {
  const envelope: AlexaRequestEnvelope = {
    request: {
      intent: { name: "CommandIntent", slots: { command: { value: "i used 2 hot dogs" } } },
    },
  };
  assert.equal(getSpokenText(envelope), "i used 2 hot dogs");
});

test("getSpokenText: trims surrounding whitespace", () => {
  const envelope: AlexaRequestEnvelope = {
    request: {
      intent: { name: "CommandIntent", slots: { command: { value: "  undo  " } } },
    },
  };
  assert.equal(getSpokenText(envelope), "undo");
});

test("getSpokenText: empty string when the slot value is missing", () => {
  const envelope: AlexaRequestEnvelope = {
    request: { intent: { name: "CommandIntent", slots: { command: {} } } },
  };
  assert.equal(getSpokenText(envelope), "");
});

test("getSpokenText: empty string when the slots object is missing", () => {
  const envelope: AlexaRequestEnvelope = {
    request: { intent: { name: "CommandIntent" } },
  };
  assert.equal(getSpokenText(envelope), "");
});

test("getSpokenText: empty string when the intent itself is missing", () => {
  const envelope: AlexaRequestEnvelope = { request: { type: "LaunchRequest" } };
  assert.equal(getSpokenText(envelope), "");
});

test("getSpokenText: empty string on a completely empty envelope", () => {
  assert.equal(getSpokenText({}), "");
});

test("speech: builds a PlainText envelope and ends the session when asked", () => {
  const result = speech("Took 2 off Hot dogs — 3 left.", { endSession: true });
  assert.deepEqual(result, {
    version: "1.0",
    response: {
      outputSpeech: { type: "PlainText", text: "Took 2 off Hot dogs — 3 left." },
      shouldEndSession: true,
    },
  });
});

test("speech: can leave the session open", () => {
  const result = speech("Say that again?", { endSession: false });
  assert.equal(result.response.shouldEndSession, false);
  assert.equal(result.response.outputSpeech?.type, "PlainText");
});

test("speechWithReprompt: includes both outputSpeech and a reprompt, session open", () => {
  const result = speechWithReprompt(
    "Tell Marsh HQ what you need.",
    "I didn't catch that — what would you like to do?",
  );
  assert.deepEqual(result, {
    version: "1.0",
    response: {
      outputSpeech: { type: "PlainText", text: "Tell Marsh HQ what you need." },
      reprompt: {
        outputSpeech: {
          type: "PlainText",
          text: "I didn't catch that — what would you like to do?",
        },
      },
      shouldEndSession: false,
    },
  });
});

test("emptyResponse: no outputSpeech key at all, session ended", () => {
  const result = emptyResponse();
  assert.deepEqual(result, {
    version: "1.0",
    response: { shouldEndSession: true },
  });
  assert.equal("outputSpeech" in result.response, false);
});
