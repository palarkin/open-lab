---
name: markdown-me
description: >-
  Use when someone asks to convert, reformat, or turn any input — pasted text, a note, a chat
  excerpt, a rough idea, or a file — into OKF markdown format (Open Knowledge Format YAML
  frontmatter + markdown body) as a single standalone file. Triggers on "markdown me",
  "markdown this", "convert this to OKF", "format this as OKF", "make this an OKF file". For
  ingesting a source into a full knowledge-catalog bundle, use /ingest-okf instead.
argument-hint: [text or file path]
allowed-tools: Read, Write, Bash(date *)
---

# Convert any input into one OKF markdown file

Take whatever the user hands you and return it as **one** well-formed OKF file: six-field YAML
frontmatter plus a clean markdown body. This is a lightweight converter — do NOT create vaults,
bundles, indexes, logs, decomposition, or cross-linking. That machinery belongs to `/ingest-okf`.

**Input:** `$ARGUMENTS` — pasted text or a file path (Read it). If empty, ask the user for content.

**Capture timestamp (ISO-8601 UTC):** !`date -u +%Y-%m-%dT%H:%M:%SZ`

Full OKF spec — vocabularies (§2), slug rules (§7), hard rules (§9):
[../ingest-okf/reference.md](../ingest-okf/reference.md). Consult it when anything here is
ambiguous; it is canonical.

## Frontmatter contract (all six fields, this exact order, nothing else)

```yaml
---
type: <controlled value>
title: <human title>
description: <one sentence>
resource: <original URL, absolute file path, or "" if none>
tags: [lowercase-kebab, topical]
timestamp: <ISO-8601 UTC from the date command above — never invented>
---
```

## Choosing `type` — controlled vocabularies only, never invent a new value

| Input is… | Pick from |
|---|---|
| A captured source (article, page, email, doc, media) | `Article`, `Web Page`, `YouTube Video`, `Video`, `PDF Document`, `Word Document`, `Spreadsheet`, `Presentation`, `Email`, `Image`, `Audio Recording` |
| An idea, entity, method, or analysis | `Source`, `Person`, `Organization`, `Product/Tool`, `Place`, `Event`, `Concept`, `Technique`, `Metric`, `Comparison`, `Analysis` |

If genuinely ambiguous between two types, pick one and state the choice and why in one line —
only ask the user if nothing fits.

## Workflow

1. Get the input from `$ARGUMENTS` (Read file paths) or ask for it.
2. Classify against the type tables above.
3. Build the frontmatter: derive `title` from the content; write a one-sentence `description`;
   `resource` = the input's URL or absolute file path if one exists, else `""`; 2–6 topical
   lowercase-kebab tags; `timestamp` from the date command above.
4. Format the body as clean markdown: preserve the input's substance faithfully (keep real
   numbers, names, quotes), normalize headings/lists, strip boilerplate. Short inputs stay
   nearly verbatim.
5. Output the complete file in a fenced code block with a suggested filename — a kebab-case
   slug of the title (`AI Alignment` → `ai-alignment.md`). Only Write to disk if the user named
   a destination path; otherwise offer to save, and suggest `/ingest-okf` if the content
   deserves full bundle treatment.

## Worked example

Input (pasted rough note):
> quick note from the enablement sync — the trick that's working for workshop signups is
> pre-filling the calendar invite with a 2-line 'what you'll walk away with' blurb instead of
> a generic title. signups roughly doubled for the June session. worth writing down as a
> repeatable move for the AI Fluency workshops

Output — suggested filename `pre-filled-invite-blurbs.md`:

```markdown
---
type: Technique
title: Pre-Filled Invite Blurbs
description: Boost workshop signups by pre-filling calendar invites with a two-line "what you'll walk away with" blurb instead of a generic title
resource: ""
tags: [ai-fluency, workshops, enablement, calendar-invites]
timestamp: 2026-07-20T18:42:00Z
---

# Pre-Filled Invite Blurbs

A repeatable move for driving workshop signups, surfaced in an enablement sync.

## The technique

Instead of sending a calendar invite with a generic title, pre-fill it with a two-line
"what you'll walk away with" blurb.

## Observed result

Signups roughly doubled for the June session.

## Where to apply

Flagged as worth repeating for the AI Fluency workshops.
```

Note the judgment calls: a method → `Technique` (wiki concept vocabulary, not a source type);
empty `resource` (no URL); nothing invented — no author, no sync date, no embellished metrics.

## Hard rules

- Never fabricate content, metadata, dates, or authors. Unknown → omit or mark "unknown".
- All six frontmatter fields, exact order, nothing else in frontmatter — detail goes in the body.
- One input → one file. No bundle scaffolding of any kind.
