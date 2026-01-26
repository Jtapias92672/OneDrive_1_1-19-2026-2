#!/usr/bin/env node
/**
 * FORGE CLI - Command Line Interface
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

import { Command } from 'commander';
import chalk from 'chalk';

// Import commands
import { runCommand } from './commands/run';
import { contractCommand } from './commands/contract';
import { configCommand } from './commands/config';
import { statusCommand } from './commands/status';

const program = new Command();

program
  .name('forge')
  .description(chalk.bold('FORGE CLI - Contract-Driven Agent Reliability'))
  .version('1.0.0');

// Add commands
program.addCommand(runCommand);
program.addCommand(contractCommand);
program.addCommand(configCommand);
program.addCommand(statusCommand);

// Global options
program
  .option('-v, --verbose', 'Enable verbose output')
  .option('--json', 'Output in JSON format')
  .option('-c, --config <path>', 'Path to config file');

// Error handling
program.exitOverride((err) => {
  if (err.code === 'commander.help') {
    process.exit(0);
  }
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
});

// Parse and execute
async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}

main();

export { program };
