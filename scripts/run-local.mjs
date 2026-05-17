#!/usr/bin/env node

/**
 * Local run helper for development.
 * Usage: node scripts/run-local.mjs --posting ./path/to/posting.txt
 *
 * This script sets up local paths and calls the compiled CLI.
 * In development, prefer: npm run dev -- --posting ...
 */

import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// Forward all arguments to tsx runner
const args = process.argv.slice(2).join(" ");
const cmd = `npx tsx ${projectRoot}/src/cli/cli.ts ${args}`;

console.log(`[run-local] ${cmd}\n`);
execSync(cmd, { stdio: "inherit", cwd: projectRoot });
