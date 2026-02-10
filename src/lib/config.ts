import Conf from 'conf';

interface Config {
  apiToken?: string;
  apiUrl?: string;
}

const config = new Conf<Config>({
  projectName: 'hookcatch',
  defaults: {
    apiUrl: 'http://localhost:3002', // Default for development (backend port)
  },
});

export function setApiToken(token: string): void {
  config.set('apiToken', token);
}

export function getApiToken(): string | undefined {
  return config.get('apiToken');
}

export function clearApiToken(): void {
  config.delete('apiToken');
}

export function getApiUrl(): string {
  return config.get('apiUrl') || 'http://localhost:3002';
}

export function setApiUrl(url: string): void {
  config.set('apiUrl', url);
}

export function hasApiToken(): boolean {
  return !!config.get('apiToken');
}
