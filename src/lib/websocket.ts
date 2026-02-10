import WebSocket from 'ws';
import axios from 'axios';
import chalk from 'chalk';
import { getApiToken, getApiUrl } from './config.js';

interface RequestMessage {
  type: 'REQUEST';
  requestId: string;
  method: string;
  path: string;
  headers: Record<string, any>;
  body: any;
  query: Record<string, any>;
}

interface ConnectedMessage {
  type: 'CONNECTED';
  tunnelId: string;
  message: string;
}

interface ErrorMessage {
  type: 'ERROR';
  message: string;
}

interface PingMessage {
  type: 'PING';
}

type WebSocketMessage = RequestMessage | ConnectedMessage | ErrorMessage | PingMessage;

export class TunnelClient {
  private ws: WebSocket | null = null;
  private tunnelId: string;
  private localPort: number;
  private onRequest?: (method: string, path: string, statusCode: number, duration: number) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  constructor(
    tunnelId: string,
    localPort: number,
    onRequest?: (method: string, path: string, statusCode: number, duration: number) => void
  ) {
    this.tunnelId = tunnelId;
    this.localPort = localPort;
    this.onRequest = onRequest;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const apiToken = getApiToken();
      if (!apiToken) {
        return reject(new Error('Not authenticated. Run "hookcatch login" first.'));
      }

      const apiUrl = getApiUrl();
      const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');

      // Warn if using insecure WebSocket
      if (wsUrl.startsWith('ws://') && !wsUrl.includes('localhost')) {
        console.log(chalk.yellow('⚠️  WARNING: Using insecure WebSocket connection (ws://)'));
        console.log(chalk.yellow('   All tunnel traffic is transmitted in plaintext.'));
        console.log(chalk.yellow('   Use HTTPS endpoint for secure connections (wss://).\n'));
      }

      this.ws = new WebSocket(`${wsUrl}/ws/tunnel`);

      this.ws.on('open', () => {
        // Send CONNECT message
        this.ws!.send(
          JSON.stringify({
            type: 'CONNECT',
            token: apiToken,
            tunnelId: this.tunnelId,
            localPort: this.localPort,
          })
        );
      });

      this.ws.on('message', async (data: WebSocket.Data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());

          if (message.type === 'CONNECTED') {
            this.reconnectAttempts = 0;
            resolve();
          } else if (message.type === 'ERROR') {
            console.error(chalk.red(`Error: ${message.message}`));
            this.ws?.close();
            reject(new Error(message.message));
          } else if (message.type === 'REQUEST') {
            await this.handleRequest(message);
          } else if (message.type === 'PING') {
            // Respond to keepalive ping
            this.ws!.send(JSON.stringify({ type: 'PONG' }));
          }
        } catch (error) {
          console.error(chalk.red('Error processing message:'), error);
        }
      });

      this.ws.on('close', () => {
        console.log(chalk.yellow('\nTunnel disconnected'));
        this.attemptReconnect();
      });

      this.ws.on('error', (error) => {
        console.error(chalk.red('WebSocket error:'), error.message);
        reject(error);
      });
    });
  }

  private async handleRequest(message: RequestMessage): Promise<void> {
    const { requestId, method, path, headers, body, query } = message;
    const startTime = Date.now();

    try {
      // Build URL with query params
      const url = new URL(`http://localhost:${this.localPort}${path}`);
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });

      const sanitizedHeaders = Object.fromEntries(
        Object.entries(headers)
          .filter(([, value]) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
          .map(([key, value]) => [key, String(value)])
      );
      delete sanitizedHeaders['content-length'];
      delete sanitizedHeaders['transfer-encoding'];
      delete sanitizedHeaders['connection'];
      delete sanitizedHeaders['host'];

      // Forward request to localhost
      const response = await axios({
        method: method.toLowerCase() as any,
        url: url.toString(),
        headers: {
          ...sanitizedHeaders,
          host: `localhost:${this.localPort}`, // Override host header
        },
        data: body,
        validateStatus: () => true, // Accept any status code
        maxRedirects: 0, // Don't follow redirects
        timeout: 30000,
      });

      const duration = Date.now() - startTime;

      // Send response back
      this.ws!.send(
        JSON.stringify({
          type: 'RESPONSE',
          requestId,
          statusCode: response.status,
          headers: response.headers,
          body: response.data,
        })
      );

      // Log request
      if (this.onRequest) {
        this.onRequest(method, path, response.status, duration);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;

      const errorMessage = error?.message || (typeof error === 'string' ? error : 'Internal server error');
      const errorCode = error?.code ? ` (${error.code})` : '';
      const errorBody = `${errorMessage}${errorCode}`;

      // Send error response
      this.ws!.send(
        JSON.stringify({
          type: 'RESPONSE',
          requestId,
          statusCode: error.response?.status || 500,
          headers: error.response?.headers || {},
          body: errorBody,
        })
      );

      // Log error
      if (this.onRequest) {
        this.onRequest(method, path, error.response?.status || 500, duration);
      }

      console.error(chalk.red(`Error forwarding request: ${errorBody}`));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(chalk.red('Max reconnection attempts reached. Exiting.'));
      process.exit(1);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(chalk.yellow(`Attempting to reconnect in ${delay / 1000}s... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`));

    setTimeout(async () => {
      try {
        await this.connect();
        console.log(chalk.green('✓ Reconnected successfully'));
      } catch (error: any) {
        console.error(chalk.red(`Reconnection failed: ${error.message}`));
      }
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
