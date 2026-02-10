import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { hasApiToken } from '../lib/config.js';

export const listCommand = new Command('list')
  .description('List all your active tunnels')
  .action(async () => {
    if (!hasApiToken()) {
      console.log(chalk.red('✗ Not authenticated. Run "hookcatch login" first.\n'));
      process.exit(1);
    }

    const spinner = ora('Fetching tunnels...').start();

    try {
      const tunnels = await api.listTunnels();
      spinner.stop();

      if (tunnels.length === 0) {
        console.log(chalk.yellow('\nNo active tunnels found.\n'));
        console.log(chalk.gray('Create one with: hookcatch tunnel <port>\n'));
        return;
      }

      console.log(chalk.blue.bold('\n📡 Active Tunnels\n'));

      tunnels.forEach((tunnel: any) => {
        const statusColor = tunnel.isConnected ? 'green' : 'gray';
        const statusText = tunnel.isConnected ? '● ACTIVE' : '○ INACTIVE';

        console.log(chalk.white.bold(`Tunnel: ${tunnel.tunnelId}`));
        console.log(chalk[statusColor](`  ${statusText}`));
        console.log(chalk.cyan(`  URL: ${tunnel.url}`));
        console.log(chalk.gray(`  Port: ${tunnel.localPort}`));
        console.log(chalk.gray(`  Created: ${new Date(tunnel.createdAt).toLocaleString()}`));
        
        if (tunnel.bytesTransferred > 0) {
          const mb = (tunnel.bytesTransferred / 1024 / 1024).toFixed(2);
          console.log(chalk.gray(`  Data: ${mb} MB (${tunnel.requestCount} requests)`));
        }
        
        if (tunnel.expiresAt) {
          const expiresIn = new Date(tunnel.expiresAt).getTime() - Date.now();
          if (expiresIn > 0) {
            const minutes = Math.floor(expiresIn / 60000);
            console.log(chalk.yellow(`  ⏱️  Expires in ${minutes} minutes`));
          } else {
            console.log(chalk.red('  ⏱️  EXPIRED'));
          }
        }
        
        console.log();
      });

      console.log(chalk.gray(`Total: ${tunnels.length} tunnel(s)\n`));
    } catch (error: any) {
      spinner.fail('Failed to fetch tunnels');
      console.log(chalk.red(`\n✗ ${error.message}\n`));
      process.exit(1);
    }
  });
