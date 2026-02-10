import axios, { AxiosInstance } from 'axios';
import { getApiToken, getApiUrl } from './config.js';

class HookCatchAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: getApiUrl(),
      timeout: 30000,
    });
  }

  private getHeaders() {
    const token = getApiToken();
    if (!token) {
      throw new Error('Not authenticated. Run "hookcatch login" first.');
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async createTunnel(localPort: number, options?: { subdomain?: string; password?: string }) {
    const response = await this.client.post(
      '/api/tunnels',
      {
        localPort,
        subdomain: options?.subdomain,
        password: options?.password,
      },
      { headers: this.getHeaders() }
    );
    return response.data.tunnel;
  }

  async listTunnels() {
    const response = await this.client.get('/api/tunnels', {
      headers: this.getHeaders(),
    });
    return response.data.tunnels;
  }

  async getTunnel(tunnelId: string) {
    const response = await this.client.get(`/api/tunnels/${tunnelId}`, {
      headers: this.getHeaders(),
    });
    return response.data.tunnel;
  }

  async getTunnelStats() {
    const response = await this.client.get('/api/tunnels/stats/usage', {
      headers: this.getHeaders(),
    });
    return response.data.stats;
  }

  async deleteTunnel(tunnelId: string) {
    const response = await this.client.delete(`/api/tunnels/${tunnelId}`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async getUsageStats() {
    const response = await this.client.get('/api/tunnels/stats/usage', {
      headers: this.getHeaders(),
    });
    return response.data.stats;
  }

  async sendToBin(binId: string, data: { method: string; url: string; headers: Record<string, string>; body?: string }) {
    // Clean headers - remove problematic ones
    const cleanHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(data.headers)) {
      const lowerKey = key.toLowerCase();
      // Skip connection-specific, host, and content-type headers (we'll set content-type ourselves)
      if (!['host', 'connection', 'content-length', 'transfer-encoding', 'content-type'].includes(lowerKey)) {
        cleanHeaders[key] = String(value);
      }
    }

    // Get original content type for reference
    const originalContentType = data.headers['content-type'] || data.headers['Content-Type'] || '';

    // Handle body based on content type
    let requestBody: any = {};
    let finalContentType = 'application/json';
    
    console.log('DEBUG sendToBin - raw body:', data.body);
    console.log('DEBUG sendToBin - originalContentType:', originalContentType);
    
    if (data.body && data.body.trim()) {
      if (originalContentType.includes('application/json')) {
        try {
          // Parse JSON so axios sends it as object (axios will stringify)
          requestBody = JSON.parse(data.body);
          finalContentType = 'application/json';
          console.log('DEBUG sendToBin - parsed JSON:', requestBody);
        } catch (e) {
          // Invalid JSON, send as raw text
          requestBody = data.body;
          finalContentType = 'text/plain';
          console.log('DEBUG sendToBin - JSON parse failed, sending as text:', e);
        }
      } else {
        // Non-JSON content, send raw
        requestBody = data.body;
        finalContentType = originalContentType || 'text/plain';
      }
    } else {
      // Empty body - send empty object for JSON
      requestBody = {};
      finalContentType = 'application/json';
    }
    
    console.log('DEBUG sendToBin - final body:', requestBody);
    console.log('DEBUG sendToBin - final content-type:', finalContentType);

    const response = await this.client.post(
      `/b/${binId}${data.url}`,
      requestBody,
      { 
        headers: {
          ...cleanHeaders,
          'Content-Type': finalContentType,
          'User-Agent': 'HookCatch-CLI-Proxy/1.0',
        }
      }
    );
    return response.data;
  }
}

export const api = new HookCatchAPI();
