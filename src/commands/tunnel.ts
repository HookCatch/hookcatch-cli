import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { TunnelClient } from '../lib/websocket.js';
import { hasApiToken } from '../lib/config.js';
import * as http from 'http';
import * as readline from 'readline';
import axios from 'axios';
import { listCommand } from './list.js';

export const tunnelCommand = new Command('tunnel')
  .description('Create a tunnel to your localhost')
  .argument('[port]', 'Local port to forward (e.g., 3000)')
  .option('--password <password>', 'Password-protect the tunnel')
  .option('--subdomain <name>', 'Custom subdomain (ENTERPRISE tier)')
  .option('--capture <binId>', 'Capture outbound requests to a bin')
  .option('--proxy-port <port>', 'Local proxy port for capture (default: 8081)', '8081')
  .addCommand(listCommand)
  .action(async (portArg: string | undefined, options, command) => {
    if (!portArg) {
      command.outputHelp();
      process.exit(1);
    }
    if (!hasApiToken()) {
      console.log(chalk.red('✗ Not authenticated. Run "hookcatch login" first.\n'));
      process.exit(1);
    }

    const port = parseInt(portArg, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.log(chalk.red('✗ Invalid port number. Must be between 1 and 65535.\n'));
      process.exit(1);
    }

    const proxyPort = parseInt(options.proxyPort, 10);
    if (isNaN(proxyPort) || proxyPort < 1 || proxyPort > 65535) {
      console.log(chalk.red('✗ Invalid proxy port number. Must be between 1 and 65535.\n'));
      process.exit(1);
    }

    const spinner = ora('Creating tunnel...').start();

    try {
      // Get user stats to determine tier and limits
      let stats: any = {
        tier: 'FREE',
        limits: { totalTunnelTime: null, sessionLength: null },
      };
      let statsWarning: string | null = null;
      try {
        stats = await api.getTunnelStats();
      } catch {
        statsWarning = '⚠️  Usage stats unavailable; continuing without limits info.';
      }
      
      // Create tunnel via API
      const tunnel = await api.createTunnel(port, {
        subdomain: options.subdomain,
        password: options.password,
      });

      spinner.succeed('Tunnel created');
      if (statsWarning) {
        console.log(chalk.yellow(statsWarning));
      }

      console.log(chalk.green.bold('\n✓ Tunnel established'));
      console.log(chalk.cyan(`→ ${tunnel.url}`));
      console.log(chalk.gray(`\nForwarding to http://localhost:${port}`));
      
      if (options.password) {
        console.log(chalk.yellow('🔒 Password protected'));
      }

      const maxRecentRequests = 8;
      const recentRequests: string[] = [];
      const useRollingLog = Boolean(process.stdout.isTTY);

      const formatRequestLine = (direction: 'INBOUND' | 'OUTBOUND', method: string, path: string, statusCode: number, duration: number) => {
        const statusColor = statusCode >= 500 ? 'red' : statusCode >= 400 ? 'yellow' : 'green';
        const timestamp = new Date().toLocaleTimeString();
        const directionColor = direction === 'OUTBOUND' ? 'magenta' : 'blue';
        return (
          chalk.gray(`[${timestamp}]`) +
          ' ' +
          chalk[directionColor](direction.padEnd(8)) +
          ' ' +
          chalk.white(method.padEnd(6)) +
          ' ' +
          chalk.gray(path.padEnd(30)) +
          ' ' +
          chalk[statusColor](String(statusCode).padEnd(3)) +
          ' ' +
          chalk.gray(`(${duration}ms)`)
        );
      };

      const renderRecentRequests = () => {
        if (!useRollingLog) return;

        const padded = Array.from({ length: maxRecentRequests }, () => '');
        const startIndex = Math.max(0, maxRecentRequests - recentRequests.length);
        recentRequests.forEach((line, index) => {
          padded[startIndex + index] = line;
        });

        readline.moveCursor(process.stdout, 0, -maxRecentRequests);
        for (let i = 0; i < maxRecentRequests; i++) {
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0);
          process.stdout.write(`${padded[i]}\n`);
        }
      };

      const recordRequest = (direction: 'INBOUND' | 'OUTBOUND', method: string, path: string, statusCode: number, duration: number) => {
        const line = formatRequestLine(direction, method, path, statusCode, duration);
        if (!useRollingLog) {
          console.log(line);
          return;
        }
        recentRequests.push(line);
        if (recentRequests.length > maxRecentRequests) {
          recentRequests.shift();
        }
        renderRecentRequests();
      };

      // Start capture proxy if --capture is provided
      let proxyServer: http.Server | null = null;
      if (options.capture) {
        console.log(chalk.blue(`\n📦 Capture Mode Enabled`));
        console.log(chalk.gray(`Capturing requests to bin: ${options.capture}`));
        console.log(chalk.gray(`Proxy listening on http://localhost:${proxyPort}`));
        console.log(chalk.gray(`\nConfigure your app to use this proxy:`));
        console.log(chalk.white(`  HTTP_PROXY=http://localhost:${proxyPort} node app.js\n`));

        proxyServer = createCaptureProxy(proxyPort, options.capture, recordRequest);
      }

      console.log(chalk.gray('Press Ctrl+C to stop\n'));

      if (useRollingLog) {
        console.log(chalk.gray(`Recent requests (latest ${maxRecentRequests}):`));
        for (let i = 0; i < maxRecentRequests; i++) {
          process.stdout.write('\n');
        }
      }
      
      // Session timer - updates at top right of terminal (on ASCII art line)
      const sessionStartTime = Date.now();
      
      const getTimerString = () => {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        if (stats.tier === 'FREE') {
          const totalMinutes = Math.floor((stats.limits.totalTunnelTime || 1800) / 60);
          const totalTime = `${String(totalMinutes).padStart(2, '0')}:00`;
          return `${currentTime} / ${totalTime}`;
        } else if (stats.tier === 'PLUS' && tunnel.expiresAt) {
          const limitSeconds = stats.limits.sessionLength || 3600;
          const limitHours = Math.floor(limitSeconds / 3600);
          const limitMinutes = Math.floor((limitSeconds % 3600) / 60);
          const limitTime = `${String(limitHours).padStart(2, '0')}:${String(limitMinutes).padStart(2, '0')}:00`;
          return `${currentTime} / ${limitTime}`;
        } else {
          return `${currentTime}`;
        }
      };
      
      // Count lines printed so far (banner = 5, tunnel info = ~8, capture = 5, total ~18 lines up)
      const timerLine = 5; // Position on last line of ASCII banner
      
      // Update timer every second at fixed position
      const timerInterval = setInterval(() => {
        const timerStr = getTimerString();
        const timerLength = timerStr.length;
        const cols = process.stdout.columns || 80;
        const col = Math.max(1, cols - timerLength - 2);
        
        // ANSI escape: save cursor, move to line 5 column X, write timer, restore cursor
        process.stdout.write(`\x1b7\x1b[${timerLine};${col}H${chalk.yellow(timerStr)}\x1b8`);
      }, 1000);
      
      // Write initial timer
      const timerStr = getTimerString();
      const timerLength = timerStr.length;
      const cols = process.stdout.columns || 80;
      const col = Math.max(1, cols - timerLength - 2);
      process.stdout.write(`\x1b7\x1b[${timerLine};${col}H${chalk.yellow(timerStr)}\x1b8`);

      // Connect WebSocket
      const client = new TunnelClient(tunnel.tunnelId, port, (method: string, path: string, statusCode: number, duration: number) => {
        recordRequest('INBOUND', method, path, statusCode, duration);
      });

      await client.connect();

      // Handle graceful shutdown
      const cleanup = () => {
        console.log(chalk.yellow('\n\nShutting down tunnel...'));
        clearInterval(timerInterval);
        client.disconnect();
        if (proxyServer) {
          proxyServer.close();
        }
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

    } catch (error: any) {
      spinner.fail('Failed to create tunnel');
      
      if (error.response?.data?.error) {
        console.log(chalk.red(`\n✗ ${error.response.data.error}\n`));
      } else {
        console.log(chalk.red(`\n✗ ${error.message}\n`));
      }
      
      process.exit(1);
    }
  });

function createCaptureProxy(
  proxyPort: number,
  binId: string,
  recordRequest: (direction: 'INBOUND' | 'OUTBOUND', method: string, path: string, statusCode: number, duration: number) => void
): http.Server {
  const server = http.createServer(async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Capture request data
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', async () => {
        let body = Buffer.concat(chunks).toString();
        
        // Windows curl --json flag wraps JSON in single quotes - strip them
        if (body.startsWith("'") && body.endsWith("'")) {
          body = body.slice(1, -1);
        }
        
        if (process.env.HOOKCATCH_DEBUG === 'true') {
          console.log(chalk.gray('DEBUG - Captured body:'), body);
          console.log(chalk.gray('DEBUG - Content-Type:'), req.headers['content-type']);
        }
        
        // Send to bin endpoint
        try {
          await api.sendToBin(binId, {
            method: req.method || 'GET',
            url: req.url || '/',
            headers: req.headers as Record<string, string>,
            body: body || undefined,
          });

          const duration = Date.now() - startTime;
          recordRequest('OUTBOUND', req.method || 'GET', req.url || '/', 200, duration);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            message: 'Request captured',
            binUrl: `${process.env.API_URL || 'http://localhost:3001'}/bin/${binId}/view`
          }));
        } catch (error: any) {
          console.error(chalk.red('Failed to capture request:'), error.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to capture request' }));
        }
      });
    } catch (error) {
      res.writeHead(500);
      res.end('Proxy error');
    }
  });

  server.listen(proxyPort);
  return server;
}
