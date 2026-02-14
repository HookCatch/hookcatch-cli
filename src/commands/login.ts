import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as readline from 'readline';
import { setApiToken, getApiUrl } from '../lib/config.js';
import axios from 'axios';

// Password masking helper
function promptPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Mute readline echo to hide password input.
    (rl as any)._writeToOutput = () => {};

    const stdin = process.stdin as any;
    stdin.setRawMode?.(true);
    stdin.resume?.();
    
    let password = '';
    
    const render = () => {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(question + '*'.repeat(password.length));
    };

    render();
    
    const onData = (char: Buffer) => {
      const ch = char.toString('utf8');
      
      switch (ch) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-D
          stdin.removeListener('data', onData);
          stdin.setRawMode?.(false);
          stdin.pause?.();
          rl.close();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl-C
          stdin.removeListener('data', onData);
          stdin.setRawMode?.(false);
          stdin.pause?.();
          rl.close();
          process.stdout.write('\n');
          process.exit(1);
          break;
        case '\u007f': // Backspace
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
            render();
          }
          break;
        default:
          if (ch.charCodeAt(0) >= 32) { // Printable character
            password += ch;
            render();
          }
          break;
      }
    };

    stdin.on('data', onData);
  });
}

export const loginCommand = new Command('login')
  .description('Authenticate with your HookCatch account')
  .option('--token <token>', 'Login with an API token directly')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🔐 HookCatch Login\n'));

    // If token provided via flag, use it directly
    if (options.token) {
      return await loginWithToken(options.token);
    }

    // Otherwise, prompt for email/password
    await loginWithCredentials();
  });

async function loginWithToken(token: string) {
  token = token.trim();

  if (!token.startsWith('hc_') && !token.startsWith('eyJ')) {
    console.log(chalk.red('\n✗ Invalid token format'));
    console.log(chalk.gray('API tokens start with "hc_", JWT tokens start with "eyJ"\n'));
    process.exit(1);
  }

  const spinner = ora('Validating token...').start();

  try {
    // Test token by calling /api/user/token (requires auth)
    const response = await axios.get(`${getApiUrl()}/api/user/token`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    });

    spinner.succeed('Token validated');
    setApiToken(token);
    console.log(chalk.green('\n✓ Successfully authenticated!'));
    console.log(chalk.gray('Token saved to ~/.hookcatch/config.json\n'));
  } catch (error: any) {
    spinner.fail('Token validation failed');
    if (error.response?.status === 401) {
      console.log(chalk.red('\n✗ Invalid token\n'));
    } else if (error.code === 'ECONNREFUSED') {
      console.log(chalk.red('\n✗ Cannot connect to HookCatch API'));
      console.log(chalk.gray(`   Make sure the API is running at ${getApiUrl()}\n`));
    } else {
      console.log(chalk.red('\n✗ ' + error.message + '\n'));
    }
    process.exit(1);
  }
}

async function loginWithCredentials() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (question: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  };

  try {
    let email = await prompt('Email: ');
    const password = await promptPassword('Password: ');

    if (!email || !password) {
      console.log(chalk.red('\n✗ Email and password are required\n'));
      rl.close();
      process.exit(1);
    }
    
    // Normalize email to lowercase
    email = email.toLowerCase().trim();

    const spinner = ora('Authenticating...').start();

    try {
      const response = await axios.post(
        `${getApiUrl()}/api/auth/login`,
        { email, password },
        { timeout: 10000 }
      );

      const { token, user } = response.data;

      if (!token) {
        throw new Error('No token returned from server');
      }

      spinner.succeed('Authenticated');
      setApiToken(token);
      
      console.log(chalk.green('\n✓ Successfully logged in!'));
      console.log(chalk.gray(`   Welcome, ${user.email}`));
      console.log(chalk.gray('   Token saved to ~/.hookcatch/config.json'));
      
      if (!user.emailVerified) {
        console.log(chalk.yellow('\n⚠️  Your email is not verified.'));
        console.log(chalk.gray('   Some features may be limited until you verify your email.\n'));
      } else {
        console.log(chalk.gray('\n💡 Tip: Generate a long-lived API token with:'));
        console.log(chalk.cyan('   hookcatch token generate\n'));
      }
    } catch (error: any) {
      spinner.fail('Authentication failed');
      if (error.response?.status === 401) {
        console.log(chalk.red('\n✗ Invalid email or password\n'));
      } else if (error.code === 'ECONNREFUSED') {
        console.log(chalk.red('\n✗ Cannot connect to HookCatch API'));
        console.log(chalk.gray(`   Make sure the API is running at ${getApiUrl()}\n`));
      } else {
        console.log(chalk.red('\n✗ ' + (error.response?.data?.error || error.message) + '\n'));
      }
      rl.close();
      process.exit(1);
    }
  } finally {
    rl.close();
  }
}
