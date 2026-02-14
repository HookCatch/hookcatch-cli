import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { hasApiToken } from '../lib/config.js';
import { getPayloadType } from '../lib/request-utils.js';

function formatBody(request: any) {
  const contentType = request?.contentType || '';
  const hasJsonContentType = contentType.toLowerCase().includes('application/json') || contentType.toLowerCase().includes('+json');

  if (request?.rawBody && !hasJsonContentType) {
    return request.rawBody;
  }

  if (typeof request?.body === 'string') {
    return request.body;
  }

  if (request?.body === undefined || request?.body === null) {
    return '';
  }

  return JSON.stringify(request.body, null, 2);
}

export const requestCommand = new Command('request')
  .description('Show details for a captured request')
  .argument('[requestId]', 'Request ID')
  .argument('[binId]', 'Bin ID')
  .option('--requestId <requestId>', 'Request ID')
  .option('--binId <binId>', 'Bin ID for the request')
  .option('--bin <binId>', 'Bin ID for the request (alias for --binId)')
  .option('--password <password>', 'Password for private bin')
  .option('--access-token <token>', 'Access token for private bin')
  .option('--format <format>', 'Output format (json|pretty)', 'pretty')
  .action(async (requestId: string | undefined, binId: string | undefined, options) => {
    const hasAuth = hasApiToken() || options.password || options.accessToken;
    if (!hasAuth) {
      console.log(chalk.red('✗ Not authenticated. Run "hookcatch login" first or provide --password/--access-token.\n'));
      process.exit(1);
    }

    const resolvedRequestId = options.requestId || requestId;
    const resolvedBinId = options.binId || options.bin || binId;

    if (!resolvedRequestId || !resolvedBinId) {
      console.log(chalk.red('✗ Both requestId and binId are required.\n'));
      process.exit(1);
    }
    const spinner = ora('Fetching request...').start();

    try {
      const request = await api.getBinRequest(resolvedBinId, resolvedRequestId, {
        password: options.password,
        token: options.accessToken,
      });
      spinner.stop();

      if (options.format === 'json') {
        console.log(JSON.stringify(request, null, 2));
        return;
      }

      const payloadType = getPayloadType(request.contentType, request.body, request.rawBody);
      const responseStatus = request.responseStatus ?? 200;
      const time = request.timestamp ? new Date(request.timestamp).toLocaleString() : '-';
      const size = request.size !== undefined ? `${request.size} B` : '-';

      console.log(chalk.bold(`\n📨 Request ${request.id}\n`));
      console.log(chalk.cyan('Bin:'), resolvedBinId);
      console.log(chalk.cyan('Method:'), request.method || '-');
      console.log(chalk.cyan('Path:'), request.path || '/');
      console.log(chalk.cyan('Response Status:'), responseStatus);
      console.log(chalk.cyan('Payload Type:'), payloadType);
      console.log(chalk.cyan('Content Type:'), request.contentType || '-');
      console.log(chalk.cyan('IP:'), request.ip || '-');
      console.log(chalk.cyan('Time:'), time);
      console.log(chalk.cyan('Size:'), size);

      if (request.verified !== undefined) {
        console.log(chalk.cyan('Verified:'), request.verified ? 'yes' : 'no');
      }
      if (request.verificationProvider) {
        console.log(chalk.cyan('Verification Provider:'), request.verificationProvider);
      }

      console.log(chalk.bold('\nHeaders:\n'));
      console.log(JSON.stringify(request.headers || {}, null, 2));

      console.log(chalk.bold('\nQuery:\n'));
      console.log(JSON.stringify(request.query || {}, null, 2));

      console.log(chalk.bold('\nBody:\n'));
      const bodyOutput = formatBody(request);
      console.log(bodyOutput === '' ? '(empty)' : bodyOutput);
      console.log();
    } catch (error: any) {
      spinner.fail('Failed to fetch request');
      console.log(chalk.red(`✗ ${error.response?.data?.error || error.message}\n`));
      process.exit(1);
    }
  });
