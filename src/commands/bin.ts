import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { hasApiToken } from '../lib/config.js';
import Table from 'cli-table3';

export const binCommand = new Command('bin')
  .description('Manage webhook bins')
  .addCommand(createBinCommand())
  .addCommand(listBinsCommand())
  .addCommand(requestsCommand())
  .addCommand(deleteBinCommand());

function createBinCommand() {
  return new Command('create')
    .description('Create a new webhook bin')
    .option('--name <name>', 'Bin name')
    .option('--private', 'Create a private bin (PLUS+ tier)')
    .option('--password <password>', 'Password for private bin')
    .action(async (options) => {
      if (!hasApiToken()) {
        console.log(chalk.red('✗ Not authenticated. Run "hookcatch login" first.\n'));
        process.exit(1);
      }

      const spinner = ora('Creating bin...').start();

      try {
        const bin = await api.createBin({
          name: options.name,
          isPrivate: options.private,
          password: options.password,
        });

        spinner.succeed('Bin created');

        console.log(chalk.green.bold('\n✓ Webhook bin created'));
        console.log(chalk.cyan(`\nBin ID: ${bin.binId}`));
        console.log(chalk.cyan(`Webhook URL: ${bin.url || `https://hookcatch.dev/b/${bin.binId}`}`));
        console.log(chalk.cyan(`View URL: https://hookcatch.dev/bin/${bin.binId}/view`));
        
        if (options.name) {
          console.log(chalk.gray(`Name: ${options.name}`));
        }
        if (options.private) {
          console.log(chalk.yellow('🔒 Private bin (password required to view)'));
        }
        console.log();
      } catch (error: any) {
        spinner.fail('Failed to create bin');
        console.log(chalk.red(`✗ ${error.response?.data?.error || error.message}\n`));
        process.exit(1);
      }
    });
}

function listBinsCommand() {
  return new Command('list')
    .description('List your webhook bins')
    .action(async () => {
      if (!hasApiToken()) {
        console.log(chalk.red('✗ Not authenticated. Run "hookcatch login" first.\n'));
        process.exit(1);
      }

      const spinner = ora('Fetching bins...').start();

      try {
        const bins = await api.listBins();
        spinner.stop();

        if (bins.length === 0) {
          console.log(chalk.yellow('\nNo bins found. Create one with:'));
          console.log(chalk.cyan('  hookcatch bin create\n'));
          return;
        }

        console.log(chalk.bold(`\n📦 Your bins (${bins.length}):\n`));

        const table = new Table({
          head: ['Bin ID', 'Name', 'Status', 'Requests', 'Created'],
          style: {
            head: ['cyan'],
          },
        });

        for (const bin of bins) {
          const status = bin.isPrivate ? '🔒 Private' : '🌐 Public';
          const requestCount = bin.requestCount || 0;
          const created = new Date(bin.createdAt).toLocaleDateString();
          
          table.push([
            bin.binId,
            bin.name || '-',
            status,
            requestCount.toString(),
            created,
          ]);
        }

        console.log(table.toString());
        console.log();
      } catch (error: any) {
        spinner.fail('Failed to fetch bins');
        console.log(chalk.red(`✗ ${error.response?.data?.error || error.message}\n`));
        process.exit(1);
      }
    });
}

function requestsCommand() {
  return new Command('requests')
    .description('Get requests for a bin')
    .argument('<binId>', 'Bin ID')
    .option('--limit <number>', 'Number of requests to fetch', '50')
    .option('--format <format>', 'Output format (json|table)', 'table')
    .option('--method <method>', 'Filter by HTTP method')
    .action(async (binId: string, options) => {
      if (!hasApiToken()) {
        console.log(chalk.red('✗ Not authenticated. Run "hookcatch login" first.\n'));
        process.exit(1);
      }

      const spinner = ora('Fetching requests...').start();

      try {
        const data = await api.getBinRequests(binId, {
          limit: parseInt(options.limit, 10),
        });

        spinner.stop();

        let requests = data.requests || [];

        // Filter by method if specified
        if (options.method) {
          const method = options.method.toUpperCase();
          requests = requests.filter((r: any) => r.method === method);
        }

        if (requests.length === 0) {
          console.log(chalk.yellow('\n No requests found for this bin.\n'));
          return;
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(requests, null, 2));
          return;
        }

        // Table format
        console.log(chalk.bold(`\n📥 Requests (${requests.length}):\n`));

        const table = new Table({
          head: ['ID', 'Method', 'Path', 'IP', 'Time'],
          style: {
            head: ['cyan'],
          },
        });

        for (const req of requests) {
          const method = req.method || 'GET';
          const path = req.path || '/';
          const ip = req.ip || '-';
          const time = new Date(req.timestamp).toLocaleTimeString();
          
          table.push([
            req.id.substring(0, 8),
            method,
            path.substring(0, 30),
            ip,
            time,
          ]);
        }

        console.log(table.toString());
        console.log(chalk.gray(`\nView full details: https://hookcatch.dev/bin/${binId}/view\n`));
      } catch (error: any) {
        spinner.fail('Failed to fetch requests');
        console.log(chalk.red(`✗ ${error.response?.data?.error || error.message}\n`));
        process.exit(1);
      }
    });
}

function deleteBinCommand() {
  return new Command('delete')
    .description('Delete a webhook bin')
    .argument('<binId>', 'Bin ID to delete')
    .option('--yes', 'Skip confirmation')
    .action(async (binId: string, options) => {
      if (!hasApiToken()) {
        console.log(chalk.red('✗ Not authenticated. Run "hookcatch login" first.\n'));
        process.exit(1);
      }

      if (!options.yes) {
        console.log(chalk.yellow(`⚠️  Are you sure you want to delete bin ${binId}?`));
        console.log(chalk.gray('Run with --yes to skip this confirmation.\n'));
        process.exit(0);
      }

      const spinner = ora('Deleting bin...').start();

      try {
        await api.deleteBin(binId);
        spinner.succeed(`Bin ${binId} deleted`);
        console.log();
      } catch (error: any) {
        spinner.fail('Failed to delete bin');
        console.log(chalk.red(`✗ ${error.response?.data?.error || error.message}\n`));
        process.exit(1);
      }
    });
}
