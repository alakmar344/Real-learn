# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in RealLearn, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email us at: **esamzai365@gmail.com**

When reporting, please include:

- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Any suggested fixes (if you have them)

## Response Timeline

- We will acknowledge receipt within **48 hours**
- We will provide an initial assessment within **7 days**
- We will work on a fix and coordinate disclosure with you
- In the event of a data breach, we will notify affected users and relevant authorities within **72 hours** as required by applicable law

## Security Measures

RealLearn employs several security measures:

- **Authentication:** Clerk-based JWT verification with rotating JWKS keys and PEM fallback
- **Issuer Trust Model:** Strict allowlist of trusted token issuers; dev-only domains rejected in production
- **IDOR Prevention:** User identity always derived from verified JWT tokens, never from request body
- **Input/Output Filtering:** Dual-layer content moderation (regex pattern matching + AI safety classifier)
- **Rate Limiting:** Dual-bucket per-user and per-IP request limits with configurable windows
- **HTTPS:** All communication encrypted in transit with HSTS preload (2-year max-age)
- **CORS:** Strict origin allow-listing; null/opaque origins rejected
- **Security Headers:** X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP with object-src none and upgrade-insecure-requests
- **Input Validation:** Question length caps, language/level locked to allowed values, TTS prosody sanitization
- **SSML Injection Prevention:** TTS parameters validated against strict regex patterns
- **Error Sanitization:** Internal error messages never exposed to clients
- **Data Minimization:** We collect only what is necessary for the service
- **Request Size Limits:** JSON body limited to 100KB
- **Circuit Breaker:** Automatic failover for AI model timeouts
- **Concurrency Control:** Configurable limits on simultaneous lesson generation requests

## Scope

This policy applies to the RealLearn application hosted at reallearn.site and the backend API at real-learn.onrender.com.

## Recognition

We appreciate responsible disclosure and will credit reporters (with their permission) once the issue is resolved.
