---
name: install-dreamcut
description: Install or repair DreamCut from its public GitHub repository. Use when the only DreamCut tool is dreamcut_setup_status, when the user asks to install or set up DreamCut, or when DreamCut's tools fail because the install is broken.
---

# Install DreamCut

DreamCut is a git clone of https://github.com/lukemun/dreamcut, by default at `~/DreamCut`
(`$HOME\DreamCut` on Windows; in Claude Code, the folder in `DREAMCUT_HOME` if it is set). The plugin starts that clone's MCP
server. Because it is real source, you can read and fix it when something goes wrong.

1. Call `dreamcut_setup_status`. It says whether DreamCut is cloned and installed, and where.
2. Check the prerequisites: Git, Node.js 22 or 24 (not 23) and Google Chrome (for exports). If one is
   missing, show the install command and run it only with the user's OK:
   - macOS: `brew install git node@24` and Chrome from https://www.google.com/chrome/
   - Windows: `winget install Git.Git OpenJS.NodeJS.LTS Google.Chrome`
3. Tell the user what you will run, then with their OK:

   ```bash
   git clone https://github.com/lukemun/dreamcut.git ~/DreamCut
   cd ~/DreamCut
   corepack enable
   pnpm install
   pnpm bootstrap
   ```

   If `~/DreamCut` already exists, skip the clone and run the rest there.
4. DreamCut's full tools replace `dreamcut_setup_status` a few seconds after `pnpm install` finishes. If
   they do not appear, ask the user to start a new chat.
5. Do not also run `claude mcp add dreamcut` or `codex mcp add dreamcut`: the plugin already connects
   DreamCut, and a second connection shows every tool twice.

Captions, "Enhance voice" and cutout templates use extra programs and models (about 4 GB, once).
`node ~/DreamCut/bin/dreamcut.mjs setup` installs them and `node ~/DreamCut/bin/dreamcut.mjs doctor`
shows what is ready.

## When something breaks

Read the error, then the code in `~/DreamCut`, and fix it there if you can; tell the user what you changed.
`node ~/DreamCut/bin/dreamcut.mjs update` fast-forwards to GitHub's latest version and leaves a copy with
local changes alone.
