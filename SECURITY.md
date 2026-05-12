# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Features

### Path Traversal Protection
- `safePath()` function validates all user-supplied file paths
- Prevents directory traversal attacks (e.g., `../../../etc/passwd`)
- Uses path normalization and relative path checks
- Implemented in: `ai/index.js`, `server.js`

### SSRF Protection
- `validateGeminiUrl()` validates Gemini API URLs
- Only allows HTTPS requests to `generativelanguage.googleapis.com`
- Validates URL path format to prevent same-host SSRF
- Implemented in: `ai/index.js`

### File Size Limits
- Maximum file upload size: 50MB
- Prevents DoS attacks via large file writes
- Implemented in: `server.js`

### Rate Limiting
- API endpoints rate limited to 120 requests per minute
- Prevents abuse and DoS attacks
- Applied to: `/api/ai`, `/api/git`, `/api/file`, `/api/files`, `/api/health`

### Command Injection Protection
- Git commands use `execFile()` with timeout (30 seconds)
- npm script execution limited to whitelist: build, install, test, dev, lint, start
- User input sanitized before passing to shell commands

### WebSocket Security
- Message parsing with error handling
- Connection error logging
- No authentication (local development tool)

## Known Issues

### Development Dependencies

**pkg (5.8.1) - Moderate Severity**
- Issue: Local Privilege Escalation (CVE-2023-45811)
- Status: No fix available (unmaintained)
- Impact: Only affects Windows EXE builds via `npm run build:standalone:win`
- Mitigation: pkg is a devDependency used only for packaging standalone builds. It does not affect runtime security. The vulnerability requires local access and user interaction. For production deployments, use Docker or npm start instead of the Windows EXE.
- Tracking: https://github.com/advisories/GHSA-22r3-9w55-cj54

## Reporting a Vulnerability

If you discover a security vulnerability, please email the maintainer or open a private security advisory on GitHub.

**Please do not report security vulnerabilities through public GitHub issues.**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and provide a fix timeline.

## Security Best Practices

When deploying Nightmare Code Console:

1. **Access Control**: Run behind authentication (nginx, Apache)
2. **Network Isolation**: Bind to `127.0.0.1` only for local use
3. **API Keys**: Never commit API keys to git; use `.env` file
4. **Local Storage**: API keys stored in browser localStorage are accessible to JavaScript
5. **File Access**: Server restricts file access to project directory only
6. **Git Credentials**: Git operations may prompt for credentials; use SSH keys or credential managers

## Updates

- Check for updates regularly: `npm outdated`
- Update dependencies: `npm update`
- Review CHANGELOG for security-related changes
