# HookCatch CLI

Official CLI tool for creating localhost tunnels with HookCatch.

## Installation

```bash
# Using npx (no installation)
npx hookcatch tunnel 3000

# Or install globally
npm install -g hookcatch
hookcatch tunnel 3000
```

## Usage

### 1. Login

First, generate an API token from your [HookCatch Dashboard](https://hookcatch.dev/dashboard), then:

```bash
npx hookcatch login
# Enter your API token when prompted
```

### 2. Start Tunnel (Inbound - Receive webhooks)

Forward external webhooks to your localhost:

```bash
npx hookcatch tunnel <port>

# Example: Forward to localhost:3000
npx hookcatch tunnel 3000

# With custom options
npx hookcatch tunnel 8080 --password secret123
```

Your tunnel URL will be displayed. Send webhooks to this URL and they'll be forwarded to your localhost.

### 3. Start Tunnel with Capture (Outbound - Capture localhost requests)

Capture outbound requests from your localhost application to a bin:

```bash
npx hookcatch tunnel <port> --capture <binId>

# Example: Capture requests to bin abc123
npx hookcatch tunnel 3000 --capture abc123

# Custom proxy port (default: 8081)
npx hookcatch tunnel 3000 --capture abc123 --proxy-port 9000
```

Configure your application to use the proxy:

```bash
# Set HTTP_PROXY environment variable
HTTP_PROXY=http://localhost:8081 node app.js

# Or in your code (Node.js example):
const axios = require('axios');
axios.get('https://api.example.com', {
  proxy: {
    host: 'localhost',
    port: 8081
  }
});
```

All requests through the proxy will be captured in your bin and visible in the dashboard.

### 4. Bidirectional Mode (Both directions)

Run both inbound and outbound capture simultaneously:

```bash
npx hookcatch tunnel 3000 --capture my-bin-id
```

- **INBOUND**: External webhooks → tunnel URL → your localhost:3000
- **OUTBOUND**: Your app → proxy (localhost:8081) → captured in bin

### 5. List Active Tunnels

```bash
npx hookcatch list
```

### 6. Stop Tunnel

```bash
npx hookcatch stop <tunnelId>
```

## Commands

### `login`
Authenticate with your HookCatch API token.

```bash
npx hookcatch login
```

### `tunnel <port>`
Create a tunnel to your localhost.

**Options:**
- `--password <password>` - Password-protect the tunnel (PRO+ tier)
- `--subdomain <name>` - Custom subdomain (ENTERPRISE tier)

**Example:**
```bash
npx hookcatch tunnel 3000
# ✓ Tunnel established
# → http://localhost:3001/tunnel/abc123xyz
# 
# Forwarding to http://localhost:3000
# Press Ctrl+C to stop
```

### `list`
Show all your active tunnels.

```bash
npx hookcatch list
```

### `stop <tunnelId>`
Stop a specific tunnel.

```bash
npx hookcatch stop abc123xyz
```

### `logout`
Remove stored API token.

```bash
npx hookcatch logout
```

## Features

- ✅ Zero-config tunnel creation
- ✅ Real-time request forwarding
- ✅ Automatic reconnection on network issues (PRO+)
- ✅ Password protection (PRO+ tier)
- ✅ Custom subdomains (ENTERPRISE tier)
- ✅ Usage tracking and limits
- ✅ Cross-platform (Windows, Mac, Linux)

## Tiers

- **FREE**: No tunneling (upgrade required)
- **PLUS**: 1 tunnel, 1-hour sessions, 1GB/month 
- **PRO**: 5 tunnels, unlimited time, 10GB/month 
- **ENTERPRISE**: 20 tunnels, custom subdomains, 100GB/month

## Support

- Documentation: https://hookcatch.dev/docs
- Issues: https://github.com/yourusername/hookcatch-cli/issues
- Email: support@hookcatch.dev

## License

MIT
