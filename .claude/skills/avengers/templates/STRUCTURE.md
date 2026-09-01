# STRUCTURE.md — <project name>

<Captain's constitution. Codify where code lives and which boundaries hold — from what the project already does well, plus caps that prevent the standard rots (mega-files, circular imports, duplicated vocabularies).>

## Layout map

<Where each kind of code lives. Example shape:>
| Path | What lives here | What never lives here |
|---|---|---|
| `src/<...>` | <kind of code> | <what doesn't belong> |

## File-size caps

- **Soft cap: 300 lines** — crossing it is a signal to consider splitting, recorded as a NOTE.
- **Hard cap: 500 lines** — crossing it requires a written justification in the file's header comment, or it's a BLOCKER.
- Watch trends, not just thresholds: a file growing steadily across missions is a split waiting to be scheduled.

## Dependency direction

<Which layers may import from which. State the arrows explicitly, e.g.:>
- `<pure layer>` imports from nothing above it — never from UI or route layers.
- <etc.>
- No circular imports, ever — a cycle means a boundary is drawn wrong.

## One source of truth

<The registry: vocabularies, constants, and patterns that live in exactly one place. Adding a second definition of any of these is a BLOCKER.>
- `<path>` — <what it's the single source for>

## Naming

<The project's conventions — files, components, functions, database fields. Codify what's already consistent.>

## Captain's checklist

1. Placement — every new file where the layout map says its kind lives.
2. Size — caps respected; growth trends flagged.
3. Dependency direction — arrows hold; no cycles.
4. One source of truth — no second definitions, no copy-paste of shared logic.
5. Naming — consistent with conventions and neighbors.

## Settled decisions — don't relitigate

<Structural decisions made deliberately. Each: the decision and why it's settled — e.g. an internal name kept for migration-cost reasons that a fresh reviewer would want to "fix.">
- <decision> — <why it's settled>
