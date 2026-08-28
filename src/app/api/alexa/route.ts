import type { NextRequest } from "next/server";
import { SkillRequestSignatureVerifier, TimestampVerifier } from "ask-sdk-express-adapter";
import {
  isFromOurSkill,
  getSpokenText,
  speech,
  speechWithReprompt,
  emptyResponse,
  type AlexaRequestEnvelope,
  type AlexaResponseEnvelope,
} from "@/lib/voice/alexa";
import { parseTranscript } from "@/lib/voice/parse";
import { applyActions } from "@/lib/voice/apply";

// The Alexa door into the app -- a third thin client over the same voice
// backend Siri already uses (src/app/api/voice/route.ts), but Alexa is not
// our own button either, and it can't sign in with the family password. It
// proves who it is a different way: every request Amazon's platform sends
// is signed with a private key only Amazon holds, over a certificate chain
// rooted at Amazon's own CA. That signature is strictly stronger than
// /api/voice's shared VOICE_API_TOKEN -- it can't be copied out of a
// screenshot the way that token once nearly was (see CLAUDE.md) -- so this
// route does NOT check x-voice-token at all. Its own signature/timestamp/
// skill-ID gates are the real gate here, run before anything is parsed or
// written, same principle as /api/voice's token check and the Server Action
// getVerifiedSession() guard elsewhere in the app.
//
// This has to run on the Node.js runtime, not the edge runtime: the
// verifiers below use Node's crypto and https modules directly. Node is
// Route Handlers' default (see the Segment Config Options section of
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
// route.md), so simply not setting `export const runtime = "edge"` is
// enough -- and that file is never to be added here.

// Reused across requests on purpose, not constructed fresh per call:
// SkillRequestSignatureVerifier caches Amazon's certificate chain internally
// (its own `certCache` field), so a module-level instance means only the
// first request in a warm serverless instance pays for the HTTPS fetch to
// Amazon's cert URL. TimestampVerifier holds no per-request state, but is
// kept alongside it for symmetry.
const signatureVerifier = new SkillRequestSignatureVerifier();
const timestampVerifier = new TimestampVerifier(); // default 150s tolerance

const WELCOME =
  "Tell me what happened in the kitchen. For example, I used two hot dogs, or add milk to the shopping list.";
const HELP =
  "You can say things like: I used two hot dogs. We're out of paper towels. Add milk to the shopping list. Or say undo to reverse the last change.";
const GOODBYE = "Okay, bye!";
const USAGE_NO_COMMAND =
  "I didn't catch anything. Try something like: I used two hot dogs, or add milk to the shopping list.";
const TOO_LONG = "That was too long for me to follow. Try one or two items.";
const SOMETHING_WRONG = "Something went wrong updating the kitchen.";

/**
 * Deliberately terse, same reasoning as /api/voice's 401 comment: an
 * attacker probing this endpoint learns nothing about which check failed --
 * not "bad signature" vs "bad timestamp" vs "wrong skill," just "no."
 */
function unauthorised(): Response {
  return Response.json({ error: "unauthorised" }, { status: 400 });
}

/** Mirrors /api/voice's isValidToken misconfigured-500 pattern exactly. */
function misconfigured(): Response {
  return Response.json({ error: "misconfigured" }, { status: 500 });
}

function alexaResponse(envelope: AlexaResponseEnvelope, status = 200): Response {
  return Response.json(envelope, { status });
}

/**
 * Amazon's own two checks, over the exact request bytes: the request was
 * really signed by Amazon (SkillRequestSignatureVerifier, which itself
 * fetches and validates the signing certificate chain), and it's recent
 * enough not to be a replayed capture (TimestampVerifier). Either throwing
 * is a hard stop -- see the Web Headers -> IncomingHttpHeaders conversion
 * below, which is what lets Amazon's own verifier read the SignatureCertChainUrl
 * and Signature-256 headers it looks for internally.
 */
async function verifyAlexaRequest(rawBody: string, headers: Headers): Promise<void> {
  const plainHeaders = Object.fromEntries(headers.entries());
  await signatureVerifier.verify(rawBody, plainHeaders);
  await timestampVerifier.verify(rawBody);
}

/**
 * Mirrors /api/voice's isValidToken: throws a descriptive Error when the
 * env var is missing, caught at the call site and turned into a
 * misconfigured-500. Deliberately fails closed -- until Phase B's developer
 * console walkthrough supplies the real skill ID, every request is rejected
 * here, including genuine ones from Amazon. That's intended, not a bug: an
 * unconfigured endpoint that accepted anything signed by *any* skill would
 * be a real hole (see isFromOurSkill's own doc comment on why the ID check
 * exists at all), so "reject everything" is the safe default until it is.
 */
function requireSkillId(): string {
  const id = process.env.ALEXA_SKILL_ID;
  if (!id) {
    throw new Error(
      "ALEXA_SKILL_ID is not set. Find it in the Alexa developer console " +
        "(Build tab -> Endpoint) once the skill exists, and add it to .env " +
        "locally / the host's environment variables in production.",
    );
  }
  return id;
}

export async function POST(request: NextRequest): Promise<Response> {
  // Amazon computes the signature over the exact request bytes, so this has
  // to be the raw text -- never request.json() first. Parsing to an object
  // and re-serializing it (even just for logging, or a body already read
  // once) can reorder keys or change whitespace, which would make a
  // genuinely valid signature fail to verify against the recomputed bytes.
  const rawBody = await request.text();

  try {
    await verifyAlexaRequest(rawBody, request.headers);
  } catch (error) {
    // TEMPORARY DIAGNOSTIC -- remove once the Alexa handshake is proven.
    // Header NAMES only, never values: the signature and cert URL are not
    // secrets, but there is no reason to write request contents to a log.
    console.error(
      "[alexa] header names received:",
      Array.from(request.headers.keys()).sort().join(", "),
    );
    console.error("[alexa] signature/timestamp check failed:", error);
    return unauthorised();
  }

  let envelope: AlexaRequestEnvelope;
  try {
    envelope = JSON.parse(rawBody) as AlexaRequestEnvelope;
  } catch (error) {
    console.error("[alexa] body was not JSON:", error);
    return unauthorised();
  }

  let expectedSkillId: string;
  try {
    expectedSkillId = requireSkillId();
  } catch (error) {
    console.error("[alexa] misconfigured:", error);
    return misconfigured();
  }

  if (!isFromOurSkill(envelope, expectedSkillId)) {
    // A validly-signed request for someone else's skill, pointed at this
    // URL -- Amazon's signature proves "this came from Alexa," not "this
    // was meant for us." See isFromOurSkill's own doc comment in alexa.ts.
    return unauthorised();
  }

  const requestType = envelope.request?.type;

  if (requestType === "SessionEndedRequest") {
    // Alexa's own docs forbid any outputSpeech in this reply.
    return alexaResponse(emptyResponse());
  }

  if (requestType === "LaunchRequest") {
    return alexaResponse(speechWithReprompt(WELCOME, WELCOME));
  }

  if (requestType === "IntentRequest") {
    const intentName = envelope.request?.intent?.name;

    if (intentName === "AMAZON.StopIntent" || intentName === "AMAZON.CancelIntent") {
      return alexaResponse(speech(GOODBYE, { endSession: true }));
    }

    if (intentName === "CommandIntent") {
      const transcript = getSpokenText(envelope);

      if (!transcript) {
        // No Haiku call for an empty command -- there's nothing to parse,
        // so there's nothing worth spending a cent on.
        return alexaResponse(speech(USAGE_NO_COMMAND, { endSession: false }));
      }

      if (transcript.length > 500) {
        // Same cap as /api/voice: a sentence, not an essay, and it also
        // bounds what one request can cost.
        return alexaResponse(speech(TOO_LONG, { endSession: false }));
      }

      try {
        const actions = await parseTranscript(transcript);
        const { speech: reply } = await applyActions(actions);
        return alexaResponse(speech(reply, { endSession: true }));
      } catch (error) {
        // The kitchen gets a sentence it can act on, as a real Alexa
        // envelope -- never the bare {speech} JSON /api/voice returns,
        // which Alexa's platform wouldn't know how to read. The failure
        // detail goes to the log, same split as /api/voice's catch block.
        console.error("[alexa] failed:", error);
        return alexaResponse(speech(SOMETHING_WRONG, { endSession: true }));
      }
    }

    // AMAZON.HelpIntent, AMAZON.FallbackIntent, and anything else Alexa
    // might route here (e.g. AMAZON.NavigateHomeIntent) all get the same
    // plain example-phrases reply, session left open.
    return alexaResponse(speech(HELP, { endSession: false }));
  }

  // A request type this skill doesn't otherwise expect -- fail gracefully
  // with a real Alexa envelope instead of a 500.
  return alexaResponse(speech(HELP, { endSession: false }));
}
