/**
 * FORGE CLI - Config Command
 * @package @forge/integrations
 * @epic 11 - Integrations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { loadConfig, saveConfig, ForgeConfig, CONFIG_PATH } from './utils';

export const configCommand = new Command('config')
  .description('Manage FORGE CLI configuration')
  .addCommand(
    new Command('init')
      .description('Initialize FORGE configuration')
      .option('--force', 'Overwrite existing config')
      .action(async (options) => {
        try {
          const fs = await import('fs/promises');
          
          // Check if config exists
          try {
            await fs.access(CONFIG_PATH);
            if (!options.force) {
              console.log(chalk.yellow('Config already exists. Use --force to overwrite.'));
              process.exit(1);
            }
          } catch {
            // Config doesn't exist, continue
          }
          
          // Interactive setup
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'apiUrl',
              message: 'FORGE API URL:',
              default: 'https://api.forge.dev',
            },
            {
              type: 'password',
              name: 'apiKey',
              message: 'API Key:',
              validate: (input) => input.length > 0 || 'API key is required',
            },
            {
              type: 'input',
              name: 'defaultEnvironment',
              message: 'Default environment:',
              default: 'dev',
            },
            {
              type: 'confirm',
              name: 'enableNotifications',
              message: 'Enable CLI notifications?',
              default: true,
            },
          ]);
          
          const config: ForgeConfig = {
            apiUrl: answers.apiUrl,
            apiKey: answers.apiKey,
            defaultEnvironment: answers.defaultEnvironment,
            notifications: answers.enableNotifications,
          };
          
          await saveConfig(config);
          
          console.log(chalk.green('\n✓ Configuration saved to ' + CONFIG_PATH));
        } catch (error) {
          console.error(chalk.red(`Error: ${(error as Error).message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('show')
      .description('Show current configuration')
      .option('--reveal', 'Show sensitive values')
      .action(async (options) => {
        try {
          const config = await loadConfig();
          
          console.log(chalk.bold('\nFORGE Configuration:'));
          console.log('─'.repeat(40));
          
          console.log(`  ${chalk.dim('Config Path:')}  ${CONFIG_PATH}`);
          console.log(`  ${chalk.dim('API URL:')}      ${config.apiUrl}`);
          console.log(`  ${chalk.dim('API Key:')}      ${options.reveal ? config.apiKey : maskValue(config.apiKey)}`);
          console.log(`  ${chalk.dim('Environment:')}  ${config.defaultEnvironment || 'dev'}`);
          
          if (config.notifications !== undefined) {
            console.log(`  ${chalk.dim('Notifications:')} ${config.notifications ? 'enabled' : 'disabled'}`);
          }
          
          console.log('');
        } catch (error) {
          console.error(chalk.red(`Error: ${(error as Error).message}`));
          console.log(chalk.dim('\nRun `forge config init` to create a configuration.'));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('set')
      .description('Set a configuration value')
      .argument('<key>', 'Configuration key')
      .argument('<value>', 'Configuration value')
      .action(async (key, value) => {
        try {
          const config = await loadConfig().catch(() => ({} as ForgeConfig));
          
          const validKeys = ['apiUrl', 'apiKey', 'defaultEnvironment', 'notifications'];
          
          if (!validKeys.includes(key)) {
            console.error(chalk.red(`Invalid key: ${key}`));
            console.log(chalk.dim(`Valid keys: ${validKeys.join(', ')}`));
            process.exit(1);
          }
          
          // Parse boolean for notifications
          if (key === 'notifications') {
            (config as any)[key] = value === 'true' || value === '1';
          } else {
            (config as any)[key] = value;
          }
          
          await saveConfig(config);
          console.log(chalk.green(`✓ Set ${key}`));
        } catch (error) {
          console.error(chalk.red(`Error: ${(error as Error).message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('get')
      .description('Get a configuration value')
      .argument('<key>', 'Configuration key')
      .option('--reveal', 'Show sensitive values')
      .action(async (key, options) => {
        try {
          const config = await loadConfig();
          const value = (config as any)[key];
          
          if (value === undefined) {
            console.log(chalk.dim('(not set)'));
          } else if (key === 'apiKey' && !options.reveal) {
            console.log(maskValue(value));
          } else {
            console.log(value);
          }
        } catch (error) {
          console.error(chalk.red(`Error: ${(error as Error).message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('path')
      .description('Show configuration file path')
      .action(() => {
        console.log(CONFIG_PATH);
      })
  );

function maskValue(value: string): string {
  if (!value) return '(not set)';
  if (value.length <= 8) return '****';
  return value.slice(0, 4) + '****' + value.slice(-4);
}
