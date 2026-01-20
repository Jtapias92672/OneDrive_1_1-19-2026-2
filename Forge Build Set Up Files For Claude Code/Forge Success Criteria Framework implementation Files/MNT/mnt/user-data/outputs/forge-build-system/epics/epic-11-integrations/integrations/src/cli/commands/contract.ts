/**
 * FORGE CLI - Contract Command
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, getApiClient } from './utils';

export const contractCommand = new Command('contract')
  .description('Manage FORGE contracts')
  .addCommand(
    new Command('list')
      .description('List all contracts')
      .option('-s, --status <status>', 'Filter by status')
      .option('--json', 'Output as JSON')
      .action(async (options) => {
        const spinner = ora('Loading contracts...').start();
        
        try {
          const config = await loadConfig();
          const client = getApiClient(config);
          
          const contracts = await client.listContracts({
            status: options.status,
          });
          
          spinner.stop();
          
          if (options.json) {
            console.log(JSON.stringify(contracts, null, 2));
            return;
          }
          
          if (contracts.length === 0) {
            console.log(chalk.dim('No contracts found'));
            return;
          }
          
          console.log(chalk.bold(`\nContracts (${contracts.length}):\n`));
          
          for (const contract of contracts) {
            const status = contract.status === 'active' 
              ? chalk.green('●') 
              : chalk.dim('○');
            
            console.log(
              `  ${status} ${chalk.cyan(contract.id)} ` +
              `${contract.name} ` +
              `${chalk.dim(`v${contract.version}`)}`
            );
            
            if (contract.description) {
              console.log(`    ${chalk.dim(contract.description.slice(0, 60))}${contract.description.length > 60 ? '...' : ''}`);
            }
          }
          
          console.log('');
        } catch (error) {
          spinner.fail(`Failed: ${(error as Error).message}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('get')
      .description('Get contract details')
      .argument('<id>', 'Contract ID')
      .option('--json', 'Output as JSON')
      .action(async (id, options) => {
        try {
          const config = await loadConfig();
          const client = getApiClient(config);
          
          const contract = await client.getContract(id);
          
          if (options.json) {
            console.log(JSON.stringify(contract, null, 2));
            return;
          }
          
          console.log(`
${chalk.bold('Contract Details')}
${'─'.repeat(40)}
  ${chalk.dim('ID:')}          ${contract.id}
  ${chalk.dim('Name:')}        ${contract.name}
  ${chalk.dim('Version:')}     ${contract.version}
  ${chalk.dim('Status:')}      ${formatStatus(contract.status)}
  ${chalk.dim('Created:')}     ${new Date(contract.createdAt).toLocaleString()}
  ${chalk.dim('Updated:')}     ${new Date(contract.updatedAt).toLocaleString()}
`);

          if (contract.description) {
            console.log(`${chalk.dim('Description:')}\n  ${contract.description}\n`);
          }
          
          console.log(chalk.dim('Specification:'));
          console.log(chalk.cyan(JSON.stringify(contract.spec, null, 2)));
        } catch (error) {
          console.error(chalk.red(`Error: ${(error as Error).message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('create')
      .description('Create a new contract')
      .argument('<file>', 'Path to contract YAML/JSON file')
      .option('-n, --name <name>', 'Contract name')
      .option('--activate', 'Activate contract immediately', false)
      .action(async (file, options) => {
        const spinner = ora('Creating contract...').start();
        
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          
          const content = await fs.readFile(file, 'utf-8');
          
          // Parse YAML or JSON
          let spec;
          if (file.endsWith('.yaml') || file.endsWith('.yml')) {
            const yaml = await import('yaml');
            spec = yaml.parse(content);
          } else {
            spec = JSON.parse(content);
          }
          
          const config = await loadConfig();
          const client = getApiClient(config);
          
          const contract = await client.createContract({
            name: options.name || path.basename(file, path.extname(file)),
            spec,
            activate: options.activate,
          });
          
          spinner.succeed(`Contract created: ${chalk.cyan(contract.id)}`);
          
          console.log(`
  ${chalk.dim('Name:')}    ${contract.name}
  ${chalk.dim('Version:')} ${contract.version}
  ${chalk.dim('Status:')}  ${formatStatus(contract.status)}
`);
        } catch (error) {
          spinner.fail(`Failed: ${(error as Error).message}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('validate')
      .description('Validate a contract file')
      .argument('<file>', 'Path to contract YAML/JSON file')
      .action(async (file) => {
        const spinner = ora('Validating contract...').start();
        
        try {
          const fs = await import('fs/promises');
          
          const content = await fs.readFile(file, 'utf-8');
          
          // Parse YAML or JSON
          let spec;
          if (file.endsWith('.yaml') || file.endsWith('.yml')) {
            const yaml = await import('yaml');
            spec = yaml.parse(content);
          } else {
            spec = JSON.parse(content);
          }
          
          const config = await loadConfig();
          const client = getApiClient(config);
          
          const result = await client.validateContract(spec);
          
          if (result.valid) {
            spinner.succeed(chalk.green('Contract is valid'));
          } else {
            spinner.fail(chalk.red('Contract validation failed'));
            
            for (const error of result.errors || []) {
              console.log(`  ${chalk.red('✗')} ${error.path}: ${error.message}`);
            }
            
            process.exit(1);
          }
        } catch (error) {
          spinner.fail(`Failed: ${(error as Error).message}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('activate')
      .description('Activate a contract')
      .argument('<id>', 'Contract ID')
      .action(async (id) => {
        const spinner = ora('Activating contract...').start();
        
        try {
          const config = await loadConfig();
          const client = getApiClient(config);
          
          await client.activateContract(id);
          spinner.succeed(`Contract ${id} activated`);
        } catch (error) {
          spinner.fail(`Failed: ${(error as Error).message}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('deactivate')
      .description('Deactivate a contract')
      .argument('<id>', 'Contract ID')
      .action(async (id) => {
        const spinner = ora('Deactivating contract...').start();
        
        try {
          const config = await loadConfig();
          const client = getApiClient(config);
          
          await client.deactivateContract(id);
          spinner.succeed(`Contract ${id} deactivated`);
        } catch (error) {
          spinner.fail(`Failed: ${(error as Error).message}`);
          process.exit(1);
        }
      })
  );

function formatStatus(status: string): string {
  const colors: Record<string, (s: string) => string> = {
    active: chalk.green,
    draft: chalk.yellow,
    deprecated: chalk.dim,
    archived: chalk.dim,
  };
  
  const color = colors[status] || chalk.dim;
  return color(status);
}
