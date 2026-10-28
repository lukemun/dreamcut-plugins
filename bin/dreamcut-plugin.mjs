#!/usr/bin/env node
/**
 * The DreamCut plugin's MCP server. DreamCut lives in a git clone of https://github.com/lukemun/dreamcut
 * (~/DreamCut, or the folder in DREAMCUT_HOME), so the user and their agent can read and fix its code. This
 * file only starts that clone's own MCP server (`node bin/dreamcut.mjs mcp`).
 *
 * Before the clone is installed it answers with one tool, dreamcut_setup_status, which tells the agent how
 * to install it. It checks every few seconds; once the clone is ready it starts the real server, replays the
 * agent's `initialize` to it, forwards everything from then on and tells the agent its tools changed.
 * Messages that arrive during the hand-over are queued, never dropped. It never downloads or installs
 * anything itself: the agent runs the install steps in the open, with the user's permission.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const VERSION = '0.4.0';
const SETUP_TOOL = 'dreamcut_setup_status';
const REPLAY_ID = '__dreamcut_plugin_initialize';
const REPOSITORY = 'https://github.com/lukemun/dreamcut';
const root = path.resolve(process.env.DREAMCUT_HOME || path.join(os.homedir(), 'DreamCut'));
const launcher = path.join(root, 'bin', 'dreamcut.mjs');

const cloned = () => fs.existsSync(launcher);
// pnpm writes .modules.yaml when an install finishes, so a half-done install never starts the server.
const installed = () => cloned() && fs.existsSync(path.join(root, 'node_modules', '.modules.yaml'));
const startServer = stdio => spawn(process.execPath, [launcher, 'mcp'], { cwd: root, env: process.env, stdio });

// Exit normally on a signal so the real server, and the editor it owns, stop with this process.
let child = null;
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { child?.kill(signal); process.exit(0); });

if (installed()) {
  child = startServer('inherit');
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
} else {
  serveUntilInstalled();
}

function setupText() {
  const where = root.startsWith(os.homedir()) ? `~${root.slice(os.homedir().length)}` : root;
  if (cloned()) {
    return `DreamCut is cloned at ${where} but its dependencies are not installed. With the user's OK, run \`corepack enable\`, `
      + `\`pnpm install\` and \`pnpm bootstrap\` in ${where}. DreamCut's tools appear here when \`pnpm install\` finishes.`;
  }
  return `DreamCut is not installed. Follow the install-dreamcut skill: with the user's OK, clone ${REPOSITORY} to ${where}, `
    + `then run \`corepack enable\`, \`pnpm install\` and \`pnpm bootstrap\` there (Git and Node.js 22 or 24 are required). `
    + `DreamCut's tools appear here when \`pnpm install\` finishes; this happens only once.`;
}

function serveUntilInstalled({ input = process.stdin, output = process.stdout } = {}) {
  const write = message => output.write(`${JSON.stringify(message)}\n`);
  let initialize = null, live = false, closed = false;
  const queued = [];

  const answer = ({ id, method, params }) => {
    if (id == null) return; // Notifications need no reply.
    if (method === 'initialize') {
      initialize = { id, method, params };
      write({ jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion ?? '2024-11-05', capabilities: { tools: { listChanged: true } },
        serverInfo: { name: 'dreamcut', version: VERSION }, instructions: `DreamCut is not installed yet. Call ${SETUP_TOOL} for the steps; the full DreamCut tools appear once it is installed.` } });
    } else if (method === 'ping') write({ jsonrpc: '2.0', id, result: {} });
    else if (method === 'tools/list') write({ jsonrpc: '2.0', id, result: { tools: [{ name: SETUP_TOOL, title: 'DreamCut setup status',
      description: 'Say whether DreamCut is installed and, if not, the steps to install it from GitHub. DreamCut\'s editing tools appear when it is installed.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true } }] } });
    else if (method === 'tools/call') write({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: setupText() }], isError: params?.name !== SETUP_TOOL } });
    else if (method === 'resources/list') write({ jsonrpc: '2.0', id, result: { resources: [] } });
    else if (method === 'prompts/list') write({ jsonrpc: '2.0', id, result: { prompts: [] } });
    else write({ jsonrpc: '2.0', id, error: { code: -32601, message: `${method} is unavailable until DreamCut is installed.` } });
  };

  const lines = readline.createInterface({ input });
  lines.on('line', line => {
    if (!line.trim()) return;
    if (live) { child.stdin.write(`${line}\n`); return; }
    if (child) { queued.push(line); return; } // Handing over: the real server answers these.
    let message;
    try { message = JSON.parse(line); } catch { return; }
    answer(message);
  });
  lines.on('close', () => { closed = true; clearInterval(poll); if (child) child.stdin.end(); else process.exit(0); });

  const poll = setInterval(() => {
    if (closed || child || !installed()) return;
    clearInterval(poll);
    child = startServer(['pipe', 'pipe', 'inherit']);
    child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
    const replies = readline.createInterface({ input: child.stdout });
    replies.on('line', line => {
      if (live) { output.write(`${line}\n`); return; }
      let message;
      try { message = JSON.parse(line); } catch { return; }
      if (message.id !== REPLAY_ID) return;
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
      live = true;
      for (const pending of queued.splice(0)) child.stdin.write(`${pending}\n`);
      write({ jsonrpc: '2.0', method: 'notifications/tools/list_changed' });
    });
    const params = initialize?.params ?? { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'dreamcut-plugin', version: VERSION } };
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: REPLAY_ID, method: 'initialize', params })}\n`);
  }, 3000);
}
