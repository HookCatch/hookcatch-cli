import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { hasApiToken, setApiToken, getApiToken } from '../lib/config.js';

export const tokenCommand = new Command('token')
  .description('Manage API tokens')
  .addCommand(generateCommand())
  .addCommand(statusCommand())
  .addCommand(revokeCommand());

function generateCommand() {
  return new Command('generate')
    .description('Generate a new API token for CLI authentication')
    .action(async () => {
      if (!hasApiToken()) {
        console.log(chalk.red('✗ Not authenticated. Run "hookcatch login" first.\n'));
        process.exit(1);
      }

      const spinner = ora('Generating API token...').start();

      try {
        // Call backend to generate token
        const response = await api.client.post(
          '/api/user/token',
          {},
          { headers: { Authorization: `Bearer ${getApiToken()}` } }
        );

        const { token, createdAt } = response.data;

        spinner.succeed('API token generated');
        setApiToken(token);

        console.log(chalk.green.bold('\n✓ New API token generated'));
        console.log(chalk.yellow('\n⚠️  Store this token securely. It will not be shown again.\n'));
        console.log(chalk.cyan('Token:'));
        console.log(chalk.white.bold(token));
        console.log(chalk.gray(`\nCreated: ${new Date(createdAt).toLocaleString()}`));
        console.log(chalk.gray('Expires: Never (until regenerated or revoked)'));
        console.log(chalk.green('\n✓ Token saved for CLI use'));
        console.log(chalk.gray('   (Stored in ~/.config/hookcatch/config.json)\n'));
      } catch (error: any) {
        spinner.fail('Failed to generate token');
        console.log(chalk.red(`✗ ${error.response?.data?.error || error.message}\n`));
        process.exit(1);
      }
    });
}

function statusCommand() {
  return new Command('status')
    .description('Check API token status')
    .action(async () => {
      if (!hasApiToken()) {
        console.log(chalk.red('✗ Not authenticated. Run "hookcatch login" first.\n'));
        process.exit(1);
      }

      const spinner = ora('Checking token status...').start();

      try {
        const response = await api.client.get(
          '/api/user/token',
          { headers: { Authorization: `Bearer ${getApiToken()}` } }
        );

        const data = response.data;

        spinner.stop();

        if (data.hasToken) {
          console.log(chalk.green('\n✓ API token exists'));
          console.log(chalk.gray(`Created: ${new Date(data.createdAt).toLocaleString()}`));
          console.log(chalk.gray('\nNote: Token value is hidden for security.'));
          console.log(chalk.gray('Use "hookcatch token generate" to create a new token.\n'));
        } else {
          console.log(chalk.yellow('\n⚠️  No API token generated yet'));
          console.log(chalk.gray('Generate one with: hookcatch token generate\n'));
        }
      } catch (error: any) {
        spinner.fail('Failed to check status');
        console.log(chalk.red(`✗ ${error.response?.data?.error || error.message}\n`));
        process.exit(1);
      }
    });
}

function revokeCommand() {
  return new Command('revoke')
    .description('Revoke your API token')
    .option('--yes', 'Skip confirmation')
    .action(async (options) => {
      if (!hasApiToken()) {
        console.log(chalk.red('✗ Not authenticated. Run "hookcatch login" first.\n'));
        process.exit(1);
      }

      if (!options.yes) {
        console.log(chalk.yellow('⚠️  Are you sure you want to revoke your API token?'));
        console.log(chalk.gray('This will invalidate any scripts or integrations using it.'));
        console.log(chalk.gray('Run with --yes to skip this confirmation.\n'));
        process.exit(0);
      }

      const spinner = ora('Revoking API token...').start();

      try {
        await api.client.delete(
          '/api/user/token',
          { headers: { Authorization: `Bearer ${getApiToken()}` } }
        );

        spinner.succeed('API token revoked');
        console.log(chalk.green('\n✓ API token revoked successfully\n'));
      } catch (error: any) {
        spinner.fail('Failed to revoke token');
        console.log(chalk.red(`✗ ${error.response?.data?.error || error.message}\n`));
        process.exit(1);
      }
    });
}
