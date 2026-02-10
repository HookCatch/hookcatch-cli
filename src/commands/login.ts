import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as readline from 'readline';
import { setApiToken, getApiUrl, setApiUrl } from '../lib/config.js';
import axios from 'axios';

export const loginCommand = new Command('login')
  .description('Authenticate with your HookCatch API token')
  .action(async () => {
    console.log(chalk.blue.bold('\n🔐 HookCatch Login\n'));
    console.log('Get your API token from: ' + chalk.cyan(`${getApiUrl()}/dashboard\n`));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Enter your API token: ', async (token) => {
      token = token.trim();

      if (!token) {
        console.log(chalk.red('\n✗ API token is required'));
        rl.close();
        process.exit(1);
      }

      if (!token.startsWith('hc_')) {
        console.log(chalk.red('\n✗ Invalid API token format (should start with "hc_")'));
        rl.close();
        process.exit(1);
      }

      // Validate token with server
      const spinner = ora('Validating token...').start();
      
      try {
        const apiUrl = getApiUrl();
        const fullUrl = `${apiUrl}/api/user/api-token`;
        const requestToken = (url: string) => axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        });

        let response;
        try {
          response = await requestToken(fullUrl);
        } catch (error: any) {
          if (error.response?.status === 404 && apiUrl === 'http://localhost:3001') {
            const fallbackUrl = 'http://localhost:3002';
            spinner.text = 'Validating token (retrying on port 3002)...';
            response = await requestToken(`${fallbackUrl}/api/user/api-token`);
            setApiUrl(fallbackUrl);
          } else {
            throw error;
          }
        }

        if (response.status === 200 && response.data.hasToken) {
          spinner.succeed('Token validated');
          setApiToken(token);
          console.log(chalk.green('\n✓ Successfully authenticated!'));
          console.log(chalk.gray('API token saved to ~/.hookcatch/config.json\n'));
        } else {
          spinner.fail('Token validation failed');
          console.log(chalk.red('\n✗ Invalid API token'));
          process.exit(1);
        }
      } catch (error: any) {
        spinner.fail('Token validation failed');
        if (error.response?.status === 401) {
          console.log(chalk.red('\n✗ Invalid API token - authentication failed'));
        } else if (error.code === 'ECONNREFUSED') {
          console.log(chalk.red('\n✗ Cannot connect to HookCatch API'));
          console.log(chalk.gray(`   Make sure the API is running at ${getApiUrl()}`));
        } else {
          console.log(chalk.red('\n✗ Failed to validate token: ' + error.message));
        }
        process.exit(1);
      }
      
      rl.close();
    });
  });
