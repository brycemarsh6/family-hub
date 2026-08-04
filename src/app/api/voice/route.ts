import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { parseTranscript } from "@/lib/voice/parse";
import { applyActions } from "@/lib/voice/apply";

// The one door into the app that isn't a browser.
//
// Alexa and Siri can't sign in — there's no place to type the family password —
// so this endpoint can't use the session cookie the rest of the app relies on.
// It carries its own shared secret instead, sent by the skill/shortcut in a
// header.
//
// This is a Route Handler rather than a Server Action on purpose: Server
// Actions are for our own buttons, and their wire format is an implementation
// detail of React that external callers shouldn't have to reproduce. A plain
// POST endpoint is what a voice platform can actually talk to.
//
// SECURITY: this is a public URL. Anyone can send it a POST. Phase 1e of the
// deployment work proved the lesson this is built on — proxy.ts is a UX layer
// that can be misconfigured, so the real check lives here, next to the data,
// and runs before anything is parsed or written.

type VoiceRequestBody = { transcript?: unknown };

/** Compare digests, not strings — same reasoning as the family password. */
function isValidToken(provided: string | null): boolean {
  const expected = process.env.VOICE_API_TOKEN;
  if (!expected) {
    throw new Error(
      "VOICE_API_TOKEN is not set. Generate one with `openssl rand -base64 32` " +
        "and add it to .env locally / the host's environment variables in production.",
    );
  }
  if (!provided) return false;

  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** A spoken reply, in the shape both Alexa and a Siri shortcut can read. */
function speak(text: string, status = 200) {
  return Response.json({ speech: text }, { status });
}

export async function POST(request: NextRequest) {
  // Auth first — before reading the body, before spending a cent on parsing.
  let authorised: boolean;
  try {
    authorised = isValidToken(request.headers.get("x-voice-token"));
  } catch (error) {
    console.error("[voice] misconfigured:", error);
    return speak("The voice service isn't set up yet.", 500);
  }
  if (!authorised) {
    // Deliberately terse: an attacker learns nothing about why.
    return Response.json({ error: "unauthorised" }, { status: 401 });
  }

  let transcript: string;
  try {
    const body = (await request.json()) as VoiceRequestBody;
    transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  } catch {
    return speak("I couldn't read that request.", 400);
  }
  if (!transcript) return speak("I didn't hear anything.", 400);

  // A sentence, not an essay — this also caps what one request can cost.
  if (transcript.length > 500) {
    return speak("That was too long for me to follow. Try one or two items.", 400);
  }

  try {
    const actions = await parseTranscript(transcript);
    const { speech } = await applyActions(actions);
    return speak(speech);
  } catch (error) {
    // The kitchen gets a sentence it can act on; the detail goes to the log.
    console.error("[voice] failed:", error);
    return speak("Something went wrong updating the kitchen.", 500);
  }
}
