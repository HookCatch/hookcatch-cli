#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { loginCommand } from './commands/login.js';
import { tunnelCommand } from './commands/tunnel.js';
import { listCommand } from './commands/list.js';
import { stopCommand } from './commands/stop.js';
import { logoutCommand } from './commands/logout.js';

const program = new Command();

program
  .name('hookcatch')
  .description('CLI tool for creating localhost tunnels with HookCatch')
  .version('0.1.0');

// ASCII art banner
console.log(chalk.cyan(`
  _   _             _     ____      _       _     
 | | | | ___   ___ | | __/ ___|__ _| |_ ___| |__  
 | |_| |/ _ \\ / _ \\| |/ / |   / _\` | __/ __| '_ \\ 
 |  _  | (_) | (_) |   <| |__| (_| | || (__| | | |
 |_| |_|\\___/ \\___/|_|\\_\\\\____\\__,_|\\__\\___|_| |_|
`));

// Add commands
program.addCommand(loginCommand);
program.addCommand(tunnelCommand);
program.addCommand(listCommand);
program.addCommand(stopCommand);
program.addCommand(logoutCommand);

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
