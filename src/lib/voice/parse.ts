import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Turns a spoken sentence into a list of things to do.
//
// This is the one piece that genuinely needs an LLM. "2 hotdogs and 2 can of
// dr pepper" has to survive plurals, brand names, two items in one breath, and
// whatever the microphone thought it heard — which is exactly the shape of
// problem that rule-based parsing loses to. Haiku is the smallest model that
// does this well, and it costs a fraction of a cent per sentence.

/** The verbs voice is allowed to use. Deliberately short — see below. */
export type VoiceAction = "use" | "add" | "buy" | "undo";

export type ParsedAction = {
  action: VoiceAction;
  /** The item as spoken — matching it to a real pantry row happens later. */
  item: string;
  quantity: number;
};

// Note there's no "delete" verb, and there never should be. Everything here is
// reversible: a wrong "use 2" is undone by adding 2 back. A misheard delete is
// not undoable, and voice is the input we can least trust.
const SCHEMA = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      description:
        "One entry per thing the speaker mentioned. Empty if the sentence " +
        "isn't about inventory at all.",
      items: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["use", "add", "buy", "undo"],
            description:
              "'use' = took some out of the house (used, ate, drank, finished). " +
              "'add' = put some into the house (bought, restocked, put away). " +
              "'buy' = wants it on the shopping list, not in the pantry yet. " +
              "'undo' = reverse the previous voice change.",
          },
          item: {
            type: "string",
            description:
              "The item name as spoken, singular where natural. Keep brand " +
              "names ('Dr Pepper', not 'soda'). Empty string for 'undo'.",
          },
          quantity: {
            type: "number",
            description:
              "How many. Default to 1 when unspoken ('I used a hot dog'). " +
              "Use 0 for 'undo'.",
          },
        },
        required: ["action", "item", "quantity"],
        additionalProperties: false,
      },
    },
  },
  required: ["actions"],
  additionalProperties: false,
} as const;

const SYSTEM = `You convert spoken sentences about a family's kitchen into structured actions.

The speaker is talking to a smart speaker while cooking or unpacking shopping.
Transcription is imperfect — interpret generously and prefer a sensible guess
over refusing.

Rules:
- One entry per item mentioned. "2 hotdogs and 2 cans of Dr Pepper" is two entries.
- Past tense about consuming ("used", "ate", "drank", "took", "finished", "opened")
  is "use". Past tense about acquiring ("bought", "got", "restocked", "put away")
  is "add".
- "add X to the list", "we need X", "put X on the shopping list" is "buy".
- "undo", "never mind", "scratch that", "reverse that" is a single "undo" entry.
- Bare counts attach to the item they precede: "two milk" is quantity 2, item "milk".
- If the sentence isn't about kitchen inventory at all, return an empty array.
- Never invent items the speaker didn't say.`;

/**
 * Ask Claude what the sentence means.
 *
 * Structured outputs (`output_config.format`) constrain the reply to the schema
 * above, so this returns real objects rather than prose we'd have to scrape.
 */
export async function parseTranscript(
  transcript: string,
): Promise<ParsedAction[]> {
  // Constructed per call rather than at module load: this file is imported by
  // the route, and a missing key should fail that one request with a clear
  // message, not crash the whole app at boot.
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: transcript }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return [];

  // Structured outputs guarantee the shape, but a refusal or a hit token
  // ceiling can still end a turn early — so this stays defensive rather than
  // trusting the happy path.
  try {
    const parsed = JSON.parse(block.text) as { actions?: ParsedAction[] };
    return Array.isArray(parsed.actions) ? parsed.actions : [];
  } catch {
    return [];
  }
}
