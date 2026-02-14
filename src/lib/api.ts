import axios, { AxiosInstance } from 'axios';
import { getApiToken, getApiUrl } from './config.js';

class HookCatchAPI {
  public client: AxiosInstance; // Make public for token commands

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

  private getOptionalHeaders() {
    const token = getApiToken();
    if (!token) {
      return {};
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

  async getCurrentUser() {
    const response = await this.client.get('/api/auth/me', {
      headers: this.getHeaders(),
    });
    return response.data;
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
    const debugEnabled = process.env.HOOKCATCH_DEBUG === 'true';

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
    
    if (debugEnabled) {
      console.log('DEBUG sendToBin - raw body:', data.body);
      console.log('DEBUG sendToBin - originalContentType:', originalContentType);
    }
    
    if (data.body && data.body.trim()) {
      if (originalContentType.includes('application/json')) {
        try {
          // Parse JSON so axios sends it as object (axios will stringify)
          requestBody = JSON.parse(data.body);
          finalContentType = 'application/json';
          if (debugEnabled) {
            console.log('DEBUG sendToBin - parsed JSON:', requestBody);
          }
        } catch (e) {
          // Invalid JSON, send as raw text
          requestBody = data.body;
          finalContentType = 'text/plain';
          if (debugEnabled) {
            console.log('DEBUG sendToBin - JSON parse failed, sending as text:', e);
          }
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
    
    if (debugEnabled) {
      console.log('DEBUG sendToBin - final body:', requestBody);
      console.log('DEBUG sendToBin - final content-type:', finalContentType);
    }

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

  // Bin management methods
  async createBin(options?: { name?: string; isPrivate?: boolean; password?: string }) {
    const response = await this.client.post(
      '/api/bins',
      {
        name: options?.name,
        isPrivate: options?.isPrivate,
        password: options?.password,
      },
      { headers: this.getHeaders() }
    );
    return response.data.bin || response.data;
  }

  async listBins() {
    const response = await this.client.get('/api/bins', {
      headers: this.getHeaders(),
    });
    return response.data.bins;
  }

  async getBin(binId: string) {
    const response = await this.client.get(`/api/bins/${binId}`, {
      headers: this.getHeaders(),
    });
    return response.data.bin;
  }

  async getBinRequests(binId: string, options?: { limit?: number; before?: number; password?: string; token?: string }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.before) params.append('before', options.before.toString());
    if (options?.password) params.append('password', options.password);
    if (options?.token) params.append('token', options.token);

    const response = await this.client.get(`/api/bins/${binId}/requests?${params}`, {
      headers: this.getOptionalHeaders(),
    });
    return response.data;
  }

  async getBinRequest(binId: string, requestId: string, options?: { password?: string; token?: string }) {
    const params = new URLSearchParams();
    if (options?.password) params.append('password', options.password);
    if (options?.token) params.append('token', options.token);

    const response = await this.client.get(`/api/bins/${binId}/requests/${requestId}?${params}`, {
      headers: this.getOptionalHeaders(),
    });
    return response.data;
  }

  async deleteBin(binId: string) {
    const response = await this.client.delete(`/api/bins/${binId}`, {
      headers: this.getHeaders(),
    });
    return response.data;
  }

  async updateBin(binId: string, data: { name?: string; isPrivate?: boolean; password?: string }) {
    const response = await this.client.patch(`/api/bins/${binId}`, data, {
      headers: this.getHeaders(),
    });
    return response.data.bin || response.data;
  }

  async replayRequest(
    binId: string, 
    requestId: string, 
    options: { 
      url: string; 
      headers?: Record<string, string>; 
      body?: any 
    }
  ) {
    const response = await this.client.post(
      `/api/bins/${binId}/requests/${requestId}/replay`,
      {
        url: options.url,
        headers: options.headers,
        body: options.body,
      },
      { headers: this.getHeaders() }
    );
    return response.data;
  }
}

export const api = new HookCatchAPI();
