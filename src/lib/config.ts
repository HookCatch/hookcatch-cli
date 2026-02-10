import Conf from 'conf';

interface Config {
  apiToken?: string;
  apiUrl?: string;
}

const config = new Conf<Config>({
  projectName: 'hookcatch',
  defaults: {
    apiUrl: process.env.HOOKCATCH_API_URL || 'https://api.hookcatch.dev', // Production default
  },
});

export function setApiToken(token: string): void {
  config.set('apiToken', token);
}

export function getApiToken(): string | undefined {
  // Check environment variable first, then config file
  return process.env.HOOKCATCH_TOKEN || config.get('apiToken');
}

export function clearApiToken(): void {
  config.delete('apiToken');
}

export function getApiUrl(): string {
  // Priority: env var > config file > production default
  return process.env.HOOKCATCH_API_URL || config.get('apiUrl') || 'https://api.hookcatch.dev';
}

export function setApiUrl(url: string): void {
  config.set('apiUrl', url);
}

export function hasApiToken(): boolean {
  return !!(process.env.HOOKCATCH_TOKEN || config.get('apiToken'));
}
