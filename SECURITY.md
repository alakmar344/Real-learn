# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| 1.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in RealLearn, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email us at: **esamzai365@gmail.com**

When reporting, please include:

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any suggested fixes (if you have them)

## Safe Harbor

We will not pursue legal action against security researchers who:
- Make a good faith effort to avoid privacy violations, data destruction, and service disruption
- Only interact with accounts they own or with explicit permission of the account holder
- Do not exploit a vulnerability beyond what is necessary to confirm its existence
- Report vulnerabilities to us promptly and do not publicly disclose them before we have had a reasonable time to respond

## Response Timeline

- We will acknowledge receipt within **48 hours**
- We will provide an initial assessment within **7 days**
- We will work on a fix and coordinate disclosure with you

## Security Measures

RealLearn employs several security measures:

- **Authentication:** Clerk-based JWT verification with rotating JWKS keys and offline PEM fallback
- **Authorization:** IDOR elimination — all data writes keyed by verified token identity, never client-supplied IDs
- **Input Validation:** Questions capped at 1,000 characters; language/level validated against exact allowlists; JSON body limited to 100KB
- **Input/Output Filtering:** Multi-layer content moderation (regex + LLM) on all user inputs and AI outputs
- **Rate Limiting:** Per-user (hashed token) and per-IP sliding-window request limits
- **HTTPS:** All communication encrypted in transit
- **CORS:** Strict origin allow-listing (no null/undefined origins)
- **Security Headers:** X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP, HSTS with preload
- **Data Minimization:** We collect only what is necessary for the service
- **Account Deletion:** Full data erasure including Clerk account, MongoDB records, and localStorage
- **Token Security:** Rate-limit keys are hashed (SHA-256, capped at 4KB input) to prevent CPU amplification
- **Debug Endpoints:** Auth-debug requires authentication and is production-gated

## Scope

This policy applies to:
- **In scope:** RealLearn application at reallearn.site, backend API at real-learn.onrender.com
- **Out of scope:** Third-party services (Clerk, Cloudflare Workers AI, Serper, MongoDB Atlas, Vercel, Render) — report issues with those services directly to their respective maintainers

## Recognition

We appreciate responsible disclosure and will credit reporters (with their permission) once the issue is resolved.
