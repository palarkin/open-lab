# OwnerRez + Claude (OwnerRez MCP Server)

This lets you **talk to your OwnerRez account using Claude, in plain English.** Once it's set up,
you can ask things like:

- "Who's checking in this week?"
- "How much did I make this month?"
- "Show me the owner statement for Jane Smith."
- "Which properties had the most bookings in the last 30 days?"

You don't need to be technical. Just follow the steps below in order. It takes about 15 minutes.

---

## Before you start, you need three things

1. **An OwnerRez account** (with admin access, so you can create a key).
2. **Claude Desktop** — the free app. Download it here: https://claude.ai/download
3. **Node.js** — a free tool that runs this program. Download the "LTS" version here:
   https://nodejs.org — click the big button, open the file, and click through the installer.

> **What's the "Terminal"?** It's an app on your computer where you type commands. On a Mac, press
> `Cmd + Space`, type **Terminal**, and press Enter. On Windows, search for **PowerShell**. You'll
> paste a few commands into it below — just copy, paste, and press Enter.

---

## Step 1 — Download this program

Paste this into your Terminal and press Enter:

```bash
npx degit palarkin/open-lab/MCPs/OwnerRez OwnerRez-MCP
cd OwnerRez-MCP
```

This downloads just this program (not the rest of the repo) into a folder and moves you into it.
If it asks to install `degit`, type `y` and press Enter.

## Step 2 — Get your OwnerRez key

1. Log in to OwnerRez.
2. Go to **Settings → Advanced Tools → Developer/API Settings**.
3. Click **Create Personal Access Token**, give it any name (like "Claude"), and create it.
4. **Copy the token** — it starts with `pt_`. You only see it once, so copy it now.

## Step 3 — Add your email and key

In your Terminal, paste this to create your settings file:

```bash
cp .env.example .env
open -e .env      # on Windows use:  notepad .env
```

A text editor will open. Fill in the two lines with **your** OwnerRez email and the `pt_` key you
just copied, so they look like this:

```
OWNERREZ_EMAIL=you@example.com
OWNERREZ_TOKEN=pt_your_key_here
```

Save the file and close it. (This file stays on your computer and is never shared.)

## Step 4 — Set it up

Paste these two commands (one at a time) and press Enter after each:

```bash
npm install
npm run build
```

The first downloads what the program needs; the second gets it ready to run. Wait for each to
finish.

**Check it works:** paste `node probe.mjs` and press Enter. You should see `✅ Auth OK` with your
account name. If you do, everything's connected correctly. 🎉

## Step 5 — Connect it to Claude

Paste this **exactly** — it plugs the program into Claude:

```bash
claude mcp add ownerrez --scope user -- node "$(pwd)/dist/index.js"
```

Then **fully quit Claude Desktop and reopen it** (don't just close the window).

> **Prefer to use the Claude Desktop app's settings instead?** You can add it there under
> Settings → Connectors/MCP, pointing to the file path that `pwd` shows you followed by
> `/dist/index.js`. The command above is the easy way if you have the Claude command installed.

## Step 6 — Try it!

In Claude, type something like:

> *"Using OwnerRez, who is checking in this week?"*

That's it — you're done.

---

## If something goes wrong

- **`node` or `git` "command not found"** → Node.js (or Git) isn't installed. Install Node.js from
  https://nodejs.org and try again.
- **`probe.mjs` shows a 401 error** → your email or key is wrong. Re-check the two lines in your
  `.env` file (the key must start with `pt_`), or make a new key in OwnerRez.
- **Claude doesn't see the tools** → make sure you fully **quit and reopened** Claude, and that
  Step 4 finished without errors.

## Good to know

- Your key and email live only in the `.env` file on your computer. They are never uploaded or
  shared.
- Anything that would *change* your data (like updating a rate) always asks you to confirm first —
  it won't change anything on its own.
- **Guest messaging** needs a bit of extra setup (an OwnerRez "OAuth app"); everything else works
  with just the key above. See `BLUEPRINT.md` if you want the details.

## For developers

See [`BLUEPRINT.md`](BLUEPRINT.md) for the architecture, the full list of tools, remote/HTTP
hosting, and how to run the tests (`npm test`).
