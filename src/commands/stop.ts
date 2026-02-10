import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { hasApiToken } from '../lib/config.js';

export const stopCommand = new Command('stop')
  .description('Stop a tunnel')
  .argument('<tunnelId>', 'Tunnel ID to stop')
  .action(async (tunnelId: string) => {
    if (!hasApiToken()) {
      console.log(chalk.red('✗ Not authenticated. Run "hookcatch login" first.\n'));
      process.exit(1);
    }

    const spinner = ora(`Stopping tunnel ${tunnelId}...`).start();

    try {
      await api.deleteTunnel(tunnelId);
      spinner.succeed('Tunnel stopped');
      console.log(chalk.green(`\n✓ Tunnel ${tunnelId} has been stopped\n`));
    } catch (error: any) {
      spinner.fail('Failed to stop tunnel');
      
      if (error.response?.data?.error) {
        console.log(chalk.red(`\n✗ ${error.response.data.error}\n`));
      } else {
        console.log(chalk.red(`\n✗ ${error.message}\n`));
      }
      
      process.exit(1);
    }
  });
