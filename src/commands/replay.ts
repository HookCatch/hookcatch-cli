import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { hasApiToken } from '../lib/config.js';

export const replayCommand = new Command('replay')
  .description('Replay a captured request to a different URL')
  .argument('[binId]', 'Bin ID')
  .argument('[requestId]', 'Request ID to replay')
  .argument('[url]', 'Target URL to replay the request to')
  .option('--binId <binId>', 'Bin ID')
  .option('--requestId <requestId>', 'Request ID to replay')
  .option('--url <url>', 'Target URL to replay the request to')
  .option('--headers <json>', 'Additional headers as JSON (optional)')
  .option('--body <value>', 'Override body (JSON or raw string, optional)')
  .action(async (binId: string | undefined, requestId: string | undefined, url: string | undefined, options) => {
    if (!hasApiToken()) {
      console.log(chalk.red('✗ Not authenticated. Run "hookcatch login" first.\n'));
      process.exit(1);
    }

    const resolvedBinId = options.binId || binId;
    const resolvedRequestId = options.requestId || requestId;
    const resolvedUrl = options.url || url;

    if (!resolvedBinId || !resolvedRequestId || !resolvedUrl) {
      console.log(chalk.red('✗ binId, requestId, and url are required.\n'));
      process.exit(1);
    }

    // Parse optional JSON parameters
    let headers: Record<string, string> | undefined;
    let body: any;

    if (options.headers) {
      try {
        headers = JSON.parse(options.headers);
      } catch (err) {
        console.log(chalk.red('✗ Invalid JSON for --headers\n'));
        process.exit(1);
      }
    }

    if (options.body !== undefined) {
      // Try JSON first, otherwise send raw string
      try {
        body = JSON.parse(options.body);
      } catch {
        body = options.body;
        console.log(chalk.yellow('ℹ️  --body is not valid JSON; sending as raw text'));
      }
    }

    const spinner = ora('Replaying request...').start();

    try {
      const result = await api.replayRequest(resolvedBinId, resolvedRequestId, {
        url: resolvedUrl,
        headers,
        body,
      });

      spinner.succeed('Request replayed');

      console.log(chalk.green.bold('\n✓ Request replayed successfully\n'));
      console.log(chalk.cyan('Response:'));
      console.log(chalk.gray(`  Status: ${result.status} ${result.statusText}`));
      
      if (result.data) {
        console.log(chalk.gray('\n  Body:'));
        const dataStr = typeof result.data === 'string' 
          ? result.data 
          : JSON.stringify(result.data, null, 2);
        
        // Limit output to first 500 characters
        if (dataStr.length > 500) {
          console.log(chalk.white('  ' + dataStr.substring(0, 500) + '...'));
          console.log(chalk.gray(`  (truncated, ${dataStr.length} total chars)`));
        } else {
          console.log(chalk.white('  ' + dataStr));
        }
      }
      console.log();
    } catch (error: any) {
      spinner.fail('Failed to replay request');
      console.log(chalk.red(`✗ ${error.response?.data?.error || error.message}\n`));
      process.exit(1);
    }
  });
