/**
 * FORGE CLI - Status Command
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, getApiClient } from './utils';

export const statusCommand = new Command('status')
  .description('Check FORGE system status')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Checking system status...').start();
    
    try {
      const config = await loadConfig();
      const client = getApiClient(config);
      
      const status = await client.getSystemStatus();
      
      spinner.stop();
      
      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
        return;
      }
      
      const overallIcon = status.overall === 'healthy' 
        ? chalk.green('●') 
        : status.overall === 'degraded'
          ? chalk.yellow('●')
          : chalk.red('●');
      
      console.log(`
${chalk.bold('FORGE System Status')}
${'─'.repeat(40)}
  ${chalk.dim('Overall:')}  ${overallIcon} ${status.overall}
  ${chalk.dim('Version:')}  ${status.version}
  ${chalk.dim('Region:')}   ${status.region || 'default'}
`);

      if (status.services) {
        console.log(chalk.bold('Services:'));
        
        for (const [name, svc] of Object.entries(status.services)) {
          const icon = svc.status === 'healthy' 
            ? chalk.green('●') 
            : svc.status === 'degraded'
              ? chalk.yellow('●')
              : chalk.red('●');
          
          console.log(`  ${icon} ${name}: ${svc.status}`);
          
          if (svc.latency) {
            console.log(`    ${chalk.dim('Latency:')} ${svc.latency}ms`);
          }
        }
        
        console.log('');
      }
      
      if (status.activeRuns !== undefined) {
        console.log(chalk.bold('Metrics:'));
        console.log(`  ${chalk.dim('Active Runs:')} ${status.activeRuns}`);
        console.log(`  ${chalk.dim('Queue Depth:')} ${status.queueDepth || 0}`);
        console.log('');
      }
      
      if (status.incidents?.length > 0) {
        console.log(chalk.bold.yellow('Active Incidents:'));
        
        for (const incident of status.incidents) {
          const icon = incident.severity === 'critical' 
            ? chalk.red('🚨') 
            : chalk.yellow('⚠️');
          
          console.log(`  ${icon} ${incident.title}`);
          console.log(`    ${chalk.dim(incident.status)} | Started ${formatTime(incident.startedAt)}`);
        }
        
        console.log('');
      }
    } catch (error) {
      spinner.fail(`Failed: ${(error as Error).message}`);
      
      // Show connection error details
      if ((error as any).code === 'ECONNREFUSED') {
        console.log(chalk.dim('\nUnable to connect to FORGE API.'));
        console.log(chalk.dim('Check your network connection and API URL in config.'));
      }
      
      process.exit(1);
    }
  });

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}
