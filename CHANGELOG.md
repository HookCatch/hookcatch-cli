# Changelog

All notable changes to HookCatch CLI will be documented in this file.

## [0.1.0] - 2026-02-10

### Added
- Initial release
- `login` command - Authenticate with HookCatch API token
- `tunnel` command - Create localhost tunnel to webhook inspector
- `list` command - List all active tunnels
- `stop` command - Stop a specific tunnel
- `logout` command - Remove stored credentials
- MIT License

### Fixed
- ES module compatibility in bin file (changed `require` to `import` for Node.js v18+)

### Technical
- TypeScript compilation to ES2022 modules
- Commander.js for CLI framework
- WebSocket support for real-time tunnel connections
- Secure config storage using `conf` package
- Colorful CLI output with `chalk` and `ora`

---

## Release Notes

### v0.1.0 - First Public Release

**Installation:**
```bash
npm install -g @hookcatch/cli
```

**Quick Start:**
```bash
# Authenticate
hookcatch login

# Start tunnel
hookcatch tunnel 3000

# List tunnels
hookcatch list

# Stop tunnel
hookcatch stop <tunnelId>
```

**Requirements:**
- Node.js >= 18.0.0
- HookCatch account (free tier available)

**Known Issues:**
- None reported yet

**Coming Soon:**
- Custom subdomain support
- Request filtering options
- Webhook replay functionality
- Collaboration features
