# DESIGN.md — <project name>

<Strange's constitution. Codify what the project does *deliberately* — a rule the codebase violates everywhere is noise from day one. Every rule carries its why, so future changes can tell when a rule's reason has expired.>

## Identity

- **What this is:** <the app, in two sentences>
- **Who uses it, on what:** <devices, contexts — e.g. "phones one-handed in a store; a wall tablet with wet hands">
- **It should feel:** <three adjectives with a sentence each>

## Hard rules

<Each: the rule, then the why. Examples of the *kind* of rule that belongs here:>
- **Minimum tap target <N>px** — because <who/where>.
- **<Interaction pattern>** — because <reason>.

## Color semantics

- Tokens are named by **job**, not appearance: <list the tokens and their jobs>.
- Semantic truth: color must mean the same thing everywhere — <e.g. "red = urgent/destructive, never decoration; green = good — check that 'more' is actually good in context before coloring an increase green">.
- <Light/dark handling.>

## Component vocabulary

<The canonical shared components. A new one-off that duplicates a canonical component's job is a design violation, not a style choice.>
- `<Component>` — <its job, where it lives>

## States

- Every screen has deliberate **empty**, **loading**, and **error** states. <Project's conventions for each.>
- Estimates and guesses are visually marked as such (<convention, e.g. a `~` prefix>) — a guess must never masquerade as a fact.

## Strange's checklist

1. Tap targets and spacing against the hard rules.
2. Component vocabulary — no one-offs where a canonical component exists.
3. Color tokens only — no raw values; semantic truth of every color in context.
4. States — empty/loading/error present and honest.
5. Semantic pass — does every visual signal tell the truth? Affordances look like what they do; hierarchy matches importance; marked estimates.
6. Coverage — the viewports/themes the change affects.

## Settled decisions — don't relitigate

<Decisions made deliberately that a fresh reviewer would be tempted to "fix." Each: the decision, when, and why.>
- <decision> — <why it's settled>
