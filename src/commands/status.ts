import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { hasApiToken } from '../lib/config.js';

export const statusCommand = new Command('status')
  .alias('whoami')
  .description('Show account details')
  .option('--format <format>', 'Output format (json|pretty)', 'pretty')
  .action(async (options) => {
    if (!hasApiToken()) {
      console.log(chalk.red('✗ Not authenticated. Run "hookcatch login" first.\n'));
      process.exit(1);
    }

    const spinner = ora('Fetching account details...').start();

    try {
      const user = await api.getCurrentUser();
      spinner.stop();

      if (options.format === 'json') {
        console.log(JSON.stringify(user, null, 2));
        return;
      }

      console.log(chalk.green.bold('\n✓ Account Status\n'));
      console.log(chalk.cyan('Email:'), user.email || '-');
      console.log(chalk.cyan('Name:'), user.name || '-');
      console.log(chalk.cyan('Tier:'), (user.subscriptionTier || '-').toUpperCase());
      console.log(chalk.cyan('Email Verified:'), user.emailVerified ? 'yes' : 'no');
      console.log(chalk.cyan('OAuth Provider:'), user.oauthProvider || '-');
      console.log(chalk.cyan('User ID:'), user.id || '-');
      if (user.createdAt) {
        console.log(chalk.cyan('Created:'), new Date(user.createdAt).toLocaleString());
      }
      console.log();
    } catch (error: any) {
      spinner.fail('Failed to fetch account details');
      console.log(chalk.red(`✗ ${error.response?.data?.error || error.message}\n`));
      process.exit(1);
    }
  });
