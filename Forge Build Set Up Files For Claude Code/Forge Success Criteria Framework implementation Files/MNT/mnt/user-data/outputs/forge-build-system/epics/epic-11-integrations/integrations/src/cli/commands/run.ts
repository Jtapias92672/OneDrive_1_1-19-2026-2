/**
 * FORGE CLI - Run Command
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, getApiClient } from './utils';

export const runCommand = new Command('run')
  .description('Execute FORGE validation runs')
  .addCommand(
    new Command('start')
      .description('Start a new validation run')
      .argument('<contract>', 'Contract ID or path to contract file')
      .option('-e, --env <environment>', 'Target environment', 'dev')
      .option('-i, --input <json>', 'Input data as JSON string')
      .option('-f, --input-file <path>', 'Path to input file')
      .option('--max-iterations <n>', 'Maximum iterations', '10')
      .option('--target-score <n>', 'Target score (0-1)', '0.9')
      .option('--timeout <ms>', 'Timeout in milliseconds', '300000')
      .option('--wait', 'Wait for run to complete', false)
      .option('--stream', 'Stream run output', false)
      .action(async (contract, options) => {
        const spinner = ora('Starting run...').start();
        
        try {
          const config = await loadConfig();
          const client = getApiClient(config);
          
          // Parse input
          let input = {};
          if (options.input) {
            input = JSON.parse(options.input);
          } else if (options.inputFile) {
            const fs = await import('fs/promises');
            const content = await fs.readFile(options.inputFile, 'utf-8');
            input = JSON.parse(content);
          }
          
          // Start run
          const run = await client.startRun({
            contractId: contract,
            environment: options.env,
            input,
            config: {
              maxIterations: parseInt(options.maxIterations, 10),
              targetScore: parseFloat(options.targetScore),
              timeoutMs: parseInt(options.timeout, 10),
            },
          });
          
          spinner.succeed(`Run started: ${chalk.cyan(run.id)}`);
          
          console.log(`
${chalk.bold('Run Details:')}
  ${chalk.dim('Contract:')} ${run.contractId}
  ${chalk.dim('Environment:')} ${run.environment}
  ${chalk.dim('Status:')} ${formatStatus(run.status)}
`);
          
          if (options.wait || options.stream) {
            spinner.start('Waiting for run to complete...');
            
            const result = await client.waitForRun(run.id, {
              onProgress: options.stream ? (event) => {
                spinner.text = `Iteration ${event.iteration}: Score ${(event.score * 100).toFixed(1)}%`;
              } : undefined,
            });
            
            spinner.stop();
            printRunResult(result);
          }
        } catch (error) {
          spinner.fail(`Run failed: ${(error as Error).message}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('status')
      .description('Get status of a run')
      .argument('<runId>', 'Run ID')
      .option('--watch', 'Watch for updates', false)
      .action(async (runId, options) => {
        try {
          const config = await loadConfig();
          const client = getApiClient(config);
          
          const run = await client.getRun(runId);
          printRunResult(run);
          
          if (options.watch && run.status === 'running') {
            const spinner = ora('Watching for updates...').start();
            
            const result = await client.waitForRun(runId, {
              onProgress: (event) => {
                spinner.text = `Iteration ${event.iteration}: Score ${(event.score * 100).toFixed(1)}%`;
              },
            });
            
            spinner.stop();
            printRunResult(result);
          }
        } catch (error) {
          console.error(chalk.red(`Error: ${(error as Error).message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List recent runs')
      .option('-n, --limit <n>', 'Number of runs to show', '10')
      .option('-s, --status <status>', 'Filter by status')
      .option('-c, --contract <id>', 'Filter by contract')
      .action(async (options) => {
        try {
          const config = await loadConfig();
          const client = getApiClient(config);
          
          const runs = await client.listRuns({
            limit: parseInt(options.limit, 10),
            status: options.status,
            contractId: options.contract,
          });
          
          if (runs.length === 0) {
            console.log(chalk.dim('No runs found'));
            return;
          }
          
          console.log(chalk.bold(`\nRecent Runs (${runs.length}):\n`));
          
          for (const run of runs) {
            const score = run.score !== undefined 
              ? `${(run.score * 100).toFixed(0)}%` 
              : '—';
            
            console.log(
              `  ${formatStatus(run.status)} ${chalk.cyan(run.id.slice(0, 12))} ` +
              `${chalk.dim(run.contractId)} ${score} ` +
              `${chalk.dim(formatTime(run.updatedAt))}`
            );
          }
          
          console.log('');
        } catch (error) {
          console.error(chalk.red(`Error: ${(error as Error).message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('cancel')
      .description('Cancel a running run')
      .argument('<runId>', 'Run ID')
      .action(async (runId) => {
        const spinner = ora('Cancelling run...').start();
        
        try {
          const config = await loadConfig();
          const client = getApiClient(config);
          
          await client.cancelRun(runId);
          spinner.succeed(`Run ${runId} cancelled`);
        } catch (error) {
          spinner.fail(`Failed to cancel: ${(error as Error).message}`);
          process.exit(1);
        }
      })
  );

function formatStatus(status: string): string {
  const colors: Record<string, (s: string) => string> = {
    running: chalk.blue,
    converged: chalk.green,
    failed: chalk.red,
    timeout: chalk.yellow,
    cancelled: chalk.gray,
    pending: chalk.dim,
  };
  
  const icons: Record<string, string> = {
    running: '●',
    converged: '✓',
    failed: '✗',
    timeout: '⏱',
    cancelled: '○',
    pending: '○',
  };
  
  const color = colors[status] || chalk.dim;
  const icon = icons[status] || '?';
  
  return color(`${icon} ${status}`);
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

function printRunResult(run: any): void {
  const statusLine = formatStatus(run.status);
  const score = run.score !== undefined 
    ? `${(run.score * 100).toFixed(1)}%` 
    : 'N/A';
  
  console.log(`
${chalk.bold('Run Result')}
${'─'.repeat(40)}
  ${chalk.dim('Run ID:')}      ${run.id}
  ${chalk.dim('Contract:')}    ${run.contractId}
  ${chalk.dim('Status:')}      ${statusLine}
  ${chalk.dim('Score:')}       ${run.score >= 0.9 ? chalk.green(score) : run.score >= 0.7 ? chalk.yellow(score) : chalk.red(score)}
  ${chalk.dim('Iterations:')}  ${run.iterations || 'N/A'}
  ${chalk.dim('Duration:')}    ${run.duration ? formatDuration(run.duration) : 'N/A'}
`);

  if (run.summary) {
    console.log(`${chalk.dim('Summary:')}\n  ${run.summary}\n`);
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}
