# HookCatch CLI

Official CLI tool for webhook testing and localhost tunneling with HookCatch.

## Installation

```bash
# Using npx (no installation)
npx hookcatch tunnel 3000

# Or install globally
npm install -g hookcatch
hookcatch tunnel 3000
```

## Quick Start

```bash
# 1. Login with email/password
hookcatch login
# Enter your email and password

# 2. (Optional) Generate long-lived API token for automation
hookcatch token generate
export HOOKCATCH_API_KEY="hc_live_..."

# 3. Create a webhook bin
hookcatch bin create --name "Test Stripe"
# Returns: https://hookcatch.dev/b/abc123xyz

# 4. View captured requests
hookcatch bin requests abc123xyz

# 5. Tunnel your localhost
hookcatch tunnel 3000
```

## Commands

### Authentication

#### `login`
Authenticate with your HookCatch account (email/password or API token).

```bash
# Login with email/password (interactive)
hookcatch login

# Or login with API token directly
hookcatch login --token hc_live_xxx
```

**For automation (OpenClaw, CI/CD):**
```bash
# Generate a long-lived API token
hookcatch token generate

# Then use it via environment variable
export HOOKCATCH_API_KEY="hc_live_..."

# Or login directly
hookcatch login --token hc_live_...
```

#### `logout`
Remove stored credentials.

```bash
hookcatch logout
```

### Bin Management (NEW!)

#### `bin create`
Create a new webhook bin.

```bash
hookcatch bin create [options]

# Options:
#   --name <name>          Bin name
#   --private              Create private bin (PLUS+ tier)
#   --password <password>  Password for private bin

# Examples:
hookcatch bin create --name "Stripe Webhooks"
hookcatch bin create --private --password secret123
```

#### `bin list`
List all your bins.

```bash
hookcatch bin list
```

#### `bin requests <binId>`
Get captured requests for a bin.

```bash
hookcatch bin requests <binId> [options]

# Options:
#   --limit <number>  Number of requests (default: 50)
#   --format <type>   Output format: json|table (default: table)
#   --method <method> Filter by HTTP method (GET, POST, etc.)

# Examples:
hookcatch bin requests abc123xyz --limit 10
hookcatch bin requests abc123xyz --format json --method POST
```

#### `bin delete <binId>`
Delete a bin.

```bash
hookcatch bin delete <binId> --yes
```

### API Token Management (NEW!)

#### `token generate`
Generate a long-lived API token for automation.

```bash
hookcatch token generate
# Store the token securely - it won't be shown again!
# Use it with: export HOOKCATCH_API_KEY="hc_live_..."
```

#### `token status`
Check your API token status.

```bash
hookcatch token status
```

#### `token revoke`
Revoke your API token.

```bash
hookcatch token revoke --yes
```

### Localhost Tunneling

#### `tunnel <port>`
Create a tunnel to your localhost.

```bash
hookcatch tunnel <port> [options]

# Options:
#   --password <password>  Password-protect tunnel (PRO+ tier)
#   --subdomain <name>     Custom subdomain (ENTERPRISE tier)
#   --capture <binId>      Capture outbound requests to bin
#   --proxy-port <port>    Local proxy port (default: 8081)

# Examples:
hookcatch tunnel 3000
hookcatch tunnel 8080 --password secret123
hookcatch tunnel 3000 --capture abc123
```

#### `list`
Show all your active tunnels.

```bash
hookcatch list
```

#### `stop <tunnelId>`
Stop a specific tunnel.

```bash
hookcatch stop abc123xyz
```

## Usage Examples

### Test Stripe Webhooks

```bash
# Create a bin
hookcatch bin create --name "Stripe Test"
# Use the URL in Stripe dashboard

# View captured webhooks
hookcatch bin requests abc123xyz --format json
```

### Expose Local API

```bash
# Start your local server
# python -m http.server 8000 &

# Expose it via tunnel
hookcatch tunnel 8000
# Public URL: https://hookcatch.dev/tunnel/xyz789
```

### Capture Outbound Requests

```bash
# Start tunnel with capture
hookcatch tunnel 3000 --capture my-bin-id

# Configure your app to use proxy
HTTP_PROXY=http://localhost:8081 node app.js
```

### Automation with API Tokens

```bash
# Generate token
hookcatch token generate
export HOOKCATCH_API_KEY="hc_live_..."

# Use in scripts
hookcatch bin create --name "CI Test" --format json | jq -r '.url'
```

## OpenClaw Integration

HookCatch has a dedicated OpenClaw skill for AI-powered webhook testing:

```bash
# Install via ClawHub
clawhub install hookcatch
```

See [skills/hookcatch/README.md](../../skills/hookcatch/README.md) for details.

## Environment Variables

Configure the CLI using environment variables:

```bash
# API Token (for authentication)
export HOOKCATCH_TOKEN="hc_live_..."

# API URL (defaults to https://api.hookcatch.dev)
export HOOKCATCH_API_URL="https://api.hookcatch.dev"

# For local development
export HOOKCATCH_API_URL="http://localhost:3002"
```

**Priority order:**
1. Environment variables (`HOOKCATCH_TOKEN`, `HOOKCATCH_API_URL`)
2. Config file (`~/.config/hookcatch/config.json`)
3. Default values (production API)

## Features

### Webhook Bins
- ✅ Create unlimited bins (tier-dependent)
- ✅ Capture HTTP requests in real-time
- ✅ Private bins with password protection (PLUS+)
- ✅ JSON output for automation
- ✅ Request filtering by method

### Localhost Tunnels
- ✅ Zero-config tunnel creation
- ✅ Real-time request forwarding
- ✅ Automatic reconnection
- ✅ Password protection (PRO+)
- ✅ Custom subdomains (ENTERPRISE)

### API Tokens
- ✅ Long-lived tokens for automation
- ✅ Secure bcrypt hashing
- ✅ Easy revocation
- ✅ No expiration (until regenerated)


## Environment Variables

- `HOOKCATCH_API_KEY` - API token for authentication
- `HOOKCATCH_API_URL` - Override API URL (default: https://api.hookcatch.dev)

## Support

- Documentation: https://docs.hookcatch.dev
- GitHub: https://github.com/hookcatch/cli
- Email: support@hookcatch.dev

## License

MIT
