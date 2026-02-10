import { Command } from 'commander';
import chalk from 'chalk';
import { clearApiToken } from '../lib/config.js';

export const logoutCommand = new Command('logout')
  .description('Remove stored API token')
  .action(() => {
    clearApiToken();
    console.log(chalk.green('\n✓ Logged out successfully'));
    console.log(chalk.gray('API token removed from ~/.hookcatch/config.json\n'));
  });
