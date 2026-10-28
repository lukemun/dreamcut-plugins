# DreamCut plugin

Edit video with DreamCut from Claude Code or Codex. DreamCut is a local video editor you drive from your
agent: it runs on your computer, your footage never leaves it, and you review and approve every change in
the editor.

Claude Code:

```bash
claude plugin marketplace add lukemun/dreamcut-plugins
claude plugin install dreamcut@dreamcut
```

Codex:

```bash
codex plugin marketplace add lukemun/dreamcut-plugins
codex plugin add dreamcut@dreamcut
```

Then start a new chat and say **"Open DreamCut."**

## How it works

DreamCut itself is not in this plugin. It lives in a git clone of its public repository,
[lukemun/dreamcut](https://github.com/lukemun/dreamcut), at `~/DreamCut` (in Claude Code, the
folder in `DREAMCUT_HOME` instead, if you set it). That keeps the real source on your computer, so you and your agent can read it, fix a
bug on the spot and update with `node ~/DreamCut/bin/dreamcut.mjs update`.

The plugin adds:

- **An MCP server** (`bin/dreamcut-plugin.mjs`). When the clone is installed, it starts the clone's own
  server (`node ~/DreamCut/bin/dreamcut.mjs mcp`). Until then it offers one read-only tool,
  `dreamcut_setup_status`, which tells your agent how to install DreamCut, and switches to the full tools
  once the install finishes.
- **Skills**: `install-dreamcut` (install or repair the clone), `open` (open the editor) and `edit-video`
  (how to edit with DreamCut's tools).

Already connected DreamCut with `claude mcp add dreamcut` or `codex mcp add dreamcut`? Remove that
connection (`claude mcp remove dreamcut -s user`, `codex mcp remove dreamcut`) so the tools don't appear
twice.

## What it runs and downloads

The plugin itself downloads and installs nothing. Your agent installs DreamCut by running these commands,
which it shows you and runs only with your permission:

- `git clone https://github.com/lukemun/dreamcut.git ~/DreamCut`: the editor's source, from GitHub
- `corepack enable` and `pnpm install`: its dependencies, from the npm registry
- `pnpm bootstrap`: checks FFmpeg, Chrome and the other programs it uses
- Optionally `node ~/DreamCut/bin/dreamcut.mjs setup`: the programs and models for captions, voice
  enhancement and cutouts (about 4 GB, once)

Once installed, the editor runs on `127.0.0.1` on your computer.

## Privacy Policy

- **Collection:** this plugin collects and sends nothing. It only checks whether `~/DreamCut` is
  installed and starts it.
- **Use and storage:** your projects, footage and edits stay in the DreamCut Library folder you choose on
  your computer. Footage is never uploaded.
- **Third parties:** DreamCut checks GitHub for updates. If you sign in to a DreamCut account, AI media
  generation you ask for runs through that account, and edit data from your exports is shared with
  DreamCut unless you turn that off in settings. Signed out, nothing is sent.
- **Retention:** the plugin keeps no data. To remove DreamCut, uninstall the plugin and delete
  `~/DreamCut`; your Library folder stays until you delete it.
- **Contact:** open an issue at https://github.com/lukemun/dreamcut/issues.

## License

[FSL-1.1-ALv2](LICENSE), the same license as DreamCut.
