---
name: draft-okrs
description: Use when someone asks to draft their OKRs, help write OKRs, structure objectives and key results, or build quarterly goals in StackAdapt's format. Triggers on "draft my OKRs", "help me write OKRs", "build my quarterly goals", "structure my objectives", or /draft-okrs.
argument-hint: [team | individual]
---

## What This Skill Does

Interviews the user one question at a time and turns their answers into well-formed OKRs
matching StackAdapt's house format. Acts as a **quality gate**: it refuses to emit task-based
objectives or unscoreable key results, coaching the user to fix them using the rubric's
good/bad examples before finalizing.

## Reference material — READ BEFORE STARTING

Load all three at the start of the session. They drive the coaching and the output shape.

- [reference/okr-structure.md](reference/okr-structure.md) — the rubric: hierarchy rules
  (Team vs Individual), the Objective Quality Bar, the Key Result Quality Bar
  (Output / Outcome / Quality Gate), and the **canonical output format you must reproduce**.
- [reference/okr-examples.md](reference/okr-examples.md) — paired good/bad examples across four
  failure modes (task-based objectives, vague results, mixed scope, "ongoing" without standards).
  Use these to validate and coach answers **live**, not just at the end.
- [reference/okr-best-practices.md](reference/okr-best-practices.md) — the *why* behind the rubric.
  Use it to explain any rejection and suggest the fix.

## Workflow

Ask **one question at a time** using AskUserQuestion. Never dump the whole form. Coach as you go.

### Step 1 — Level

If the argument (`team`/`individual`) already answered this, skip. Otherwise ask:
**Team OKR (leader-owned) or Individual OKR (IC-owned)?**

- Team: business outcomes with numeric targets (pipeline, SQLs, revenue, adoption, efficiency).
- Individual: rolls up into a single team Objective; translates the outcome into initiatives +
  delivery milestones. **One of the (max 5) Individual objectives must be professional development.**

### Step 2 — The Objective (outcome, not task)

Ask what change this objective is meant to drive. Then run the **quality gate**:

- If the answer is a task or activity ("update onboarding emails", "launch a nurture"), reflect
  the matching bad→good pair from okr-examples.md and re-ask for the *outcome*. Do not proceed
  until the objective describes what changes, not what gets done.
- Check it against the Objective Quality Bar (outcome-focused, time-bound, directional,
  understandable without context).
- Watch for **mixed scope** ("improve onboarding, demand programs, and reporting") — split it or
  narrow it so it rolls up cleanly into one goal.

### Step 3 — Roll-up test (Individual OKRs only)

Ask: **which single team Objective does this support?** If the user can't name one, the OKR
doesn't belong — tell them so and help them either re-anchor it or drop it.

### Step 4 — Numeric target

Ask for the metric, its **baseline**, its **target**, and the **by-DATE deadline**
(e.g. "SQLs from 90 → 135 by 3/31"). If they don't have a baseline or target, **flag it as a gap
and ask** — never invent numbers.

### Step 5 — Key Results (2–5 per objective)

For each KR, capture it and then gate it:

- **Classify** it as Output (a concrete thing delivered), Outcome (a measurable result), or
  Quality Gate (approval / readiness / enablement checkpoint).
- **Binary or numeric** — done/not-done or X by Y date. Reject "review current performance"
  (no deadline, no definition of done); coach toward "complete performance review and
  optimization plan by XDATE".
- **Single intent** — reject any KR with "and" that bundles two results; split it.
- **Time-bound** — every KR names a date or a clear completion condition.
- **No unscored "ongoing"** — reject "support priority requests (ongoing)"; coach toward
  "execute priority requests with 100% on-time delivery".

Stop at 5 KRs; fewer is better if each is strong.

### Step 6 — Committed vs aspirational

Before finalizing each objective, ask the user to declare it **committed** (expected at 100%)
or **aspirational** (stretch; ~0.7 is a healthy result). Label it in the output.

### Step 7 — Caps and output

- Enforce **5 objectives max**. For Individual, confirm one is professional development.
- Produce the final OKRs in the canonical structure below.

## Output Format

Reproduce the structure from okr-structure.md exactly. One block per objective:

```
### Objective [N]: [outcome statement]  — [Committed | Aspirational]

Rolls up to: [team objective]        ← Individual OKRs only

Key Results:
- KR1: [key result] — [Output | Outcome | Quality Gate]
- KR2: [key result] — [Output | Outcome | Quality Gate]
- KR3: ...
```

After the OKRs, add a short **Gaps** list of any missing baselines/targets/dates the user still
owes — do not fill these in yourself.

## Notes

- Gather before generating. Do not draft OKRs until the interview has the outcome, targets, and KRs.
- **Never fabricate** metrics, baselines, or deadlines. A missing number is a gap to surface, not
  a blank to fill.
- The skill's value is the refusal: when an answer trips a known failure mode, show the good/bad
  pair and the best-practices reason, then re-ask. Never silently accept a weak objective or KR.
- This produces text output by default. Only write a file if the user asks where they want it.
