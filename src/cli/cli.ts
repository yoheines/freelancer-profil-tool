#!/usr/bin/env node

/**
 * Freelancer Profil Tool — CLI entry point.
 *
 * Usage:
 *   npx tsx src/cli/cli.ts run --posting ./ausschreibung.txt --sources ./profil.yaml
 *   npx tsx src/cli/cli.ts inspect <run-id>
 */

import { Command } from "commander";
import { createRunCommand } from "./commands/run-profile-generation.js";
import { createInspectCommand } from "./commands/inspect-run.js";
import { createReviewCommand } from "./commands/review-profile-fit.js";

const program = new Command();

program
  .name("freelancer-profil-tool")
  .description("CLI tool for generating tailored freelancer profiles from job postings")
  .version("1.0.0");

program.addCommand(createRunCommand());
program.addCommand(createReviewCommand());
program.addCommand(createInspectCommand());

program.parse(process.argv);
