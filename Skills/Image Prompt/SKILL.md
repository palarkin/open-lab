[SKILL.md](https://github.com/user-attachments/files/32669924/SKILL.md)
---
name: image-prompt
description: Use when someone asks for help writing an AI image prompt, wants a better prompt for GPT Image, ChatGPT, Midjourney, Nano Banana, FLUX, Ideogram or Firefly, needs an image for a social post, deck slide, email banner, website, or print piece and does not know how to describe it, or says an AI image came out generic, flat, or wrong and wants to fix it. Triggers on "write me an image prompt", "prompt for an image of", "make this image prompt better", "enhance this prompt", "my AI image looks generic", "help me describe this image", "make it look like this reference", "match this image's style", "/image-prompt".
argument-hint: [what you want an image of]
allowed-tools: Read, Grep, AskUserQuestion
---

## What This Skill Does

Turns a vague image idea into a finished, copy-pasteable prompt, then **stays in the loop** to
iterate one slot at a time until the image is right.

Two paths, chosen by the user up front. **Path A (quick enhance)** takes a rough prompt they
already have and fills every remaining slot by inference — no questions. **Path B (custom
build)** interviews them slot by slot. Both target the same 15-slot quality bar; the only
difference is who fills the blanks.

**This skill ends at the prompt.** It does not generate images and does not depend on any
image-generation tool being connected. The deliverable is text the user pastes into whatever
tool they already use. If they ask you to render it, say that is outside this skill and stop.

---

## Reference files

Load only what you need, only when you need it.

| File | Load when |
|---|---|
| `reference/template.md` | Always — the 15 slots, the assembler, the params tail, the fix-it ladder |
| `reference/master-guide.md` | The job matches a §10 task template (product flat lay, corporate portrait, UI mockup, food, vector, isometric, architectural, vintage film, icon), or the user asks *why* a rule exists, or you need §3 modifier vocabulary, §4 model mechanics, §9 troubleshooting, §11 rights |

The master guide is 1,100+ lines. Do not read it whole. Grep the section you need.

---

## How to ask

**One question at a time. Never batch.** Ask, wait for the answer, record it, then ask the
next. This holds for `AskUserQuestion` calls *and* for plain-text questions — never put two
questions in one message, and never send a bulleted list of things to answer. Four questions
at once reads as a form and feels overwhelming; one question reads as a conversation.

**Options per question are capped at 4.** `AskUserQuestion` rejects a fifth with a validation
error. An "Other" free-text choice is added automatically — never spend one of your four on
"other", "not sure", or "something else". Anything needing more than four choices is asked as
plain text instead.

**The number of questions is not capped.** Ask as many as the image needs, one after another.
**Ask everything that will make the image better.** Do not ration questions to seem efficient —
a prompt with an empty lighting slot wastes far more of the user's time than one extra
question does.

The discipline is *relevance*, not brevity. Never ask what the brief already answered, never
ask a slot that does not apply to the medium, and stop when the remaining slots would only be
guesses — but within that, go as deep as the image warrants.

---

## The four non-negotiables

Slots **1 MEDIUM · 2 SUBJECT · 7 LIGHT · 15 PARAMS** always get filled. They are the four
that always change the output. Never assemble a prompt missing one of them.

**Light is the highest-leverage slot in the entire template.** It needs all three parts —
**quality + direction + source**. "Soft light" is half an answer. "Soft, from camera-left,
single large softbox" is the answer. If the user gives one part, ask for the other two.

---

## The job spec — what you know without asking

The job is a **specification, not a preference**. Once the user names what the image is for,
slots 13 (negative space) and 15 (params) are already decided, plus constraints they should
never have to think about. Fill these silently. Only ask if the job is genuinely unclear.

| Job | Aspect | Negative space | Enforce without asking |
|---|---|---|---|
| **Social — feed** | 4:5 | Optional | High contrast, subject legible at thumbnail size |
| **Social — story / reel** | 9:16 | Top and bottom | Center-weighted — platform UI covers the edges |
| **Deck slide** | 16:9 | Mandatory, one side | Quiet, low-detail area behind where type will sit |
| **Email banner** | 2:1 or 3:1 | Mandatory | No fine detail, no in-image text — it renders ~600px wide |
| **Website hero** | 16:9 or wider | Mandatory | Subject off-centre so responsive crops survive |
| **Website inline** | 16:9 or 4:3 | None | Standalone, nothing overlays it |
| **Print** | As spec'd, default 3:2 | Varies | In-gamut colour, no neon, fine detail is safe here |
| **Product / ecommerce** | 1:1 or 4:5 | None | Clean ground, no props competing with the product |

If the aspect ratio the job implies conflicts with something the user asked for, **the user
wins** — say once that the job usually wants X, then use their number.

---

## Working from a reference

A reference does two things, and the second one is the one that gets missed.

**First, it fills slots.** Read the image and map what you actually see onto the 15 slots —
typically medium, light, colour, material, mood, style and era all at once. Then **say your
read back in one short block and confirm it** before asking anything:

> From the reference I'm taking: [medium] · [light: quality + direction + source] ·
> [palette] · [mood] · [style/era]. Tell me if I've misread any of it.

Cheap to do, and it catches a misread before it contaminates every downstream question.

**Second, and more important: it re-anchors every question you ask afterwards.** Once a
reference is in play, the generic option tables in B5 are no longer valid. Every remaining
question must draw its options from the reference's own visual world.

A dark, moody, gothic reference means the lighting question offers `chiaroscuro from above` ·
`single candle source` · `moonlight through stained glass` · `cold rim light through fog` —
**not** `soft daylight from a window`. Offering an option that contradicts the reference is a
bug, not a choice. The user picked that reference for a reason.

Rules once a reference is live:

1. **Never offer an option that fights the reference** unless the user has explicitly said they
   want to deviate on that slot.
2. **Confirm, don't ask open**, for any slot the reference already answers. "The reference is
   lit by hard side light with crushed blacks — keep that, or soften it?" beats re-asking how
   it should be lit.
3. **Ask normally only for slots the reference cannot answer** — subject, action, environment,
   framing, negative space, and anything the job spec sets.
4. **Name the reference in the prompt itself.** For prose models, lead with the treatment you
   read off it. For Midjourney, that is `--sref [URL]` for style or `--oref [URL]` for subject.
5. **A reference beats an adjective, always.** If the user has the image, do not try to
   reconstruct its look in words alone — attach it and describe only the delta.


---

## Workflow

### Step 1 — Choose the mode, before anything else

**This is the first question every time — ahead of the reference check, ahead of everything.**

**Q: How much do you want to invest in this?**
- `Quick enhance` — paste the rough prompt you already have and I'll do the rest. No questions.
- `Custom build` — I interview you slot by slot for the strongest possible prompt.

Both paths aim at a full-quality 15-slot prompt. The only difference is **who fills the
blanks** — me by inference, or you by answering. Say that in one line if they hesitate.

`Quick enhance` → **Path A**. `Custom build` → **Path B**.

---

## Path A — Quick enhance (the meta-prompt)

Take whatever they have and return the best prompt it can support. **Ask nothing else.** No
reference question, no model question, no follow-ups — that is the entire promise of this path.

1. One line, then stop: *"Paste what you've got — a single sentence is fine."*
2. When it arrives, read it against all 15 slots and **fill every slot you can infer with
   confidence.** Aim for the same quality bar as Path B. Quick means fewer questions, not a
   thinner prompt.
3. Inference rules — where to commit and where to leave it alone:
   - **Medium:** infer from their language ("photo of" → photograph, "icon" → flat vector).
     Default to photograph for real-world subjects.
   - **Light:** **never leave this empty.** Pick the lighting that best serves the subject and
     commit to quality + direction + source. An inferred lighting slot beats an absent one
     every time.
   - **Aspect:** if the job is named or obvious, take it from the job spec table. Otherwise 4:5
     for people and products, 16:9 for scenes and environments, 1:1 when genuinely unknown.
   - **Action:** if a person is in frame, give the hands a job even though they didn't ask.
   - **Everything else:** fill it if it is inferable from what they wrote; delete the bracket
     if filling it would be a coin flip. Never invent a brand colour, a named era, or in-image
     text they did not mention.
4. **Model:** use it if they named one. Otherwise write model-neutral prose and append the
   Midjourney params tail as a bonus, noting it is swappable.
5. Deliver in the **B7** format, plus one extra block:

   > **Assumptions I made:** [each inferred slot, one short phrase each]

   That block is what makes this path honest — they can correct any single line of it in one
   sentence, and it doubles as the iteration entry point.
6. Offer the upgrade **once**, in one sentence: full custom build is available if this isn't
   close. Do not push it twice.

Then **B8 — Stay in the loop** applies exactly as it does on Path B.

---

## Path B — Custom build

The full interview. One question at a time, as many as the image needs.

### B1 — Mine the brief before asking anything

Read what the user already said. Most briefs arrive with 3–6 slots already answered, and the
job is usually named outright ("an email banner for the Q4 push"). **Never ask for something
they already told you.** Map their words to slots silently, then ask only for the gaps.

If they named a model in the brief, that is answered too — do not re-ask it in B3.
If they attached or named a reference image, B2 handles it.

If they pasted a prompt that isn't working, skip to **Fixing a broken prompt**.

### B2 — Reference check

**The first question on this path**, after the mode fork. A reference image changes every
question that follows, so it cannot come later.

**Q: Do you have a reference image?**
- `Yes — match its look and feel` — style, lighting, palette, and mood get taken from the image; the subject is whatever you tell me
- `Yes — keep the exact subject from it` — identity, product, or logo must survive unchanged; this becomes a batch/edit job, not a generation
- `No — starting fresh` — the normal flow

(Three options. "Other" covers "I have a rough idea but no file".)

If they say yes but attach nothing, ask for the file or path before continuing. Do not guess
what is in an image you have not seen.

**If a reference is provided, read it** with the `Read` tool, then follow **Working from a
reference** below before asking anything else.

**If they need the exact subject preserved,** this is not a generation job. Go to the batch
template (`reference/template.md` §7) — identity lives in the reference image, never in
adjectives — and note that the model matters: Nano Banana and GPT Image take an attached
image directly, Midjourney needs `--oref [URL]` with `--ow` to control strength.

### B3 — Setup

Two questions, asked **one at a time** — two separate `AskUserQuestion` calls.

**Q1: Which tool will you paste this into?**
- `ChatGPT / GPT Image 2` — verbose natural language, strongest text rendering, no negative field
- `Midjourney` — scene language then a `--` params tail, has a real `--no`
- `Gemini / Nano Banana` — conversational prose, no negatives, best for multi-turn editing
- `FLUX` — pure natural language, hex codes land well, no negatives on pro/max

(Four options exactly. "Other" is automatic and covers Ideogram, Firefly, Stable Diffusion,
and "not sure" — for "not sure", write model-neutral prose and append the Midjourney tail as
a bonus.)

**Q2 (after Q1 is answered): Want me to explain as we go?**
- `Just the prompt` — silent and fast, no commentary. **This is the default.**
- `Teach me as we go` — one line on why each slot matters, and what to reuse next time

Skip this question and stay silent if the user has already said which they want, or if they
are clearly mid-flow on a second image in the same session.

### B4 — The brief, in their words

Ask as **plain text**, not multiple choice — these need the user's own language. **One per
message.** Send the next only after the previous is answered. Skip any the brief already
answered.

1. **What's it for?** Social post, deck slide, email banner, website hero, print piece, product shot? *(only if unknown)*
2. **What exactly is in frame?** The subject plus 2–3 concrete details — how many, what's distinctive, what condition. (slot 2)
3. **Where is it, and when?** Place, time of day, weather. (slot 4)
4. **What should it feel like?** One or two words. (slot 10)

Once the job is known, apply the job spec table above. Do not ask for aspect ratio or negative
space — you already know them.

### B5 — The taxonomy slots

Medium and light always. Then work the conditional table below and ask **every slot that
applies** — **one question per `AskUserQuestion` call**, as many calls as it takes. A
photographic hero for a print piece may need eight; a flat vector icon may need two. Let the
job and the medium decide, not a budget.

**The option lists below are the no-reference defaults.** If a reference image is in play,
replace them with options drawn from that image per **Working from a reference** — do not use
these.

**Q: What kind of image?** (slot 1)
`Photograph` · `Illustration` · `3D render` · `Flat vector / graphic`

**Q: How is it lit?** (slot 7) — offer complete answers, not adjectives:
`Soft daylight from a window, camera-left` · `Golden hour backlight with reflector fill` ·
`Single softbox, studio, from above` · `Hard directional light, strong shadows`

Their own answer via Other beats all four. If it is missing direction or source, ask for the
missing part before moving on.

**Conditional slots — ask every row whose "Ask when" is true:**

| Slot | Ask when | Skip when |
|---|---|---|
| **3 ACTION / POSE** | The subject is a person or animal, or anything with hands | A static object, product, or texture |
| **5 FRAMING** | Nearly always — shot size plus where the subject sits | Only when the job spec already pins it |
| **6 CAMERA** (lens, aperture, angle) | Medium is photograph | Illustration, vector, flat graphic |
| **8 MATERIAL** | Medium is photograph or 3D render | Flat vector, line art |
| **9 COLOR** | Brand colours apply, or they named a palette | Exploring — let the model choose |
| **11 STYLE / ERA** | They want a specific cultural look | Contemporary generic is fine |
| **12 TEXT** | Words must appear **inside** the image | Type gets set in Figma or Canva later |
| **14 CONSTRAINTS** | Something specifically must not appear | Nothing to exclude |

**Hands rule:** whenever a person is in frame, slot 3 must give the hands a job — "right hand
on the mug handle, thumb on top." Unassigned hands come back mangled. Not optional.

**Slot 12 rule:** the string goes in quotes, under ~200 characters, with type style and
placement named. Never put in-image text on an email banner. If they need a headline set
accurately, prompt for empty negative space and set the type in Figma.

**Slot 14 rule:** phrase it as a **positive state**. "Clean unmarked surfaces" works. "No
watermark" often summons one. Only phrase it negatively for models with a real negative field
(Midjourney `--no`, Stable Diffusion, Ideogram, FLUX flex/dev).

### B6 — Assemble

Fill the assembler from `reference/template.md` §2:

```
[1 MEDIUM] of [2 SUBJECT], [3 ACTION/POSE], in [4 ENVIRONMENT]. [5 FRAMING], [6 CAMERA]. Lit by [7 LIGHT: quality + direction + source]. [8 MATERIAL]. [9 COLOR]. [10 MOOD], [11 STYLE/ERA]. [12 TEXT]. [13 NEGATIVE SPACE]. [14 CONSTRAINTS]. [15 PARAMS]
```

1. **Delete every bracket you did not fill.** Never write a placeholder, never invent an
   answer. An unfilled slot becomes a model default, not a guess.
2. **Front-load whatever must be true.** The non-negotiable detail goes in the first sentence —
   early tokens carry more weight on every current model.
3. **Self-labelling connectives.** "Lit by", "conveying a mood of", "in the style of" tell the
   model what kind of information follows.
4. **Params last, always.** Vendor flags at the very end, never mid-sentence.
5. Read it back as prose. If a phrase reads like a form field, rewrite it as English.

Append the params tail for their model from `reference/template.md` §3.

### B7 — Deliver

````
**Your prompt — [model name]**

```
[the assembled prompt, one paragraph, params tail appended]
```

**Set by the job:** [aspect ratio + negative space + any job constraint applied]
**Left to the model's default:** [comma list of skipped slots, or "nothing — all 15 filled"]

Paste it back with what you got — or just tell me what's off — and I'll change one thing.
````

One prompt. No commentary, no explaining the slots back, no three variants unless asked.

**In teach mode**, add one closing block: the two or three slots that did the most work in
this prompt and why, phrased so they can reuse it without the skill next time.

### B8 — Stay in the loop

Do not end the conversation at delivery. When the user comes back with a result or a
complaint:

1. **Change exactly one slot.** Return the same prompt with that one slot altered, and name
   which one you changed and why.
2. Work the ladder in order — the first entry that matches the complaint is the one to change:
   - Muddy, flat, generic, or the subject melts into the background → **light** (quality, direction, source)
   - Boring composition, wrong scale, cropped badly → **framing and lens**
   - Plastic, fake, CGI-looking skin → **material** (`visible pores, 35mm grain` for people)
   - Mangled hands → give the hands a **specific job**
   - A detail keeps vanishing → **move it to the first sentence.** Nothing else fixes that
   - Unwanted text or watermark → restate the constraint **positively**
3. **Never rewrite the whole prompt.** Changing four things at once teaches nothing about
   which one was broken — even when several slots are obviously empty.
4. Once the image is 90% right, switch to the **edit template** (below). Do not keep
   regenerating; that rerolls the noise and destroys what they liked.

---

## Fixing a broken prompt

When the user pastes a prompt that isn't working, do not interview from scratch.

1. Map their prompt onto the 15 slots. Name which are filled and which are empty.
2. Match the complaint to the ladder in B8, or §9 of the master guide for the full
   symptom table.
3. **Change one slot** — the highest-leverage one that matches, which is almost always light.

---

## Editing and batch work

Different jobs from generation, and they need different templates.

- **The image is 90% right and one thing must change** → edit template, `reference/template.md`
  §6. Repeat the full keep-list every turn or identity drifts. Stop after ~3 chained edits and
  restart from the approved base.
- **A campaign set that must stay consistent** → batch template, `reference/template.md` §7.
  Identity lives in a **reference image**, not in adjectives. Run every placement off the same
  approved hero; never chain variant 12 off variant 11.

---

## Guardrails

- **Ask which mode first, every time** — quick enhance or custom build. It decides whether you
  are allowed to ask anything else at all.
- **On Path A, ask nothing after the paste.** No reference question, no model question, no
  clarifiers. Infer, state your assumptions, ship. Breaking this breaks the only promise that
  path makes.
- **Ask about a reference image first on Path B, every time.** It reorders and rewrites everything
  after it. Once one is in play, never offer an option that contradicts it.
- **One question at a time, always.** Never batch questions into a single call or message,
  and never send a list of things to answer. This is the rule users notice most.
- **Never invent a slot answer.** If they didn't say it, delete the bracket and list it under
  "left to the model's default."
- **Never exceed 4 options** on an `AskUserQuestion` choice — it is a hard validation error,
  not a preference — and never waste one of the four on "other".
- **Ask as many questions as the image needs** — there is no round budget. But never walk all
  15 slots mechanically: skip what the brief answered, what the job spec set, and what the
  medium makes irrelevant. When the user signals they want something fast, offer the five-slot
  version in `reference/template.md` §4 instead of silently thinning the interview.
- **Never generate the image.** This skill ends at prompt text. It is deliberately
  tool-independent — no image API, no connector, no credits. If asked to render, say that is a
  separate job and hand back the prompt.
- **Living artists:** do not write "in the style of [living artist]". Prompt the mechanical
  elements instead — "stark shadows, saturated primaries, halftone dots". Flag once, then offer
  the mechanical version.
- **Trademarks:** do not place a real brand's logo or a recognizable public figure into
  commercial work. Say so plainly and move on.
- **Brand colours:** if the image is StackAdapt-branded and no hex codes were given, say the
  palette is a gap rather than guessing. Colours come from `stackadapt-brand`.
- **Stock first:** if the user needs a real photo rather than a generated one, the Stock Library
  is the route — see router §3. Say so before writing a prompt.
