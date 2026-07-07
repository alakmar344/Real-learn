# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

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

## Security Measures

RealLearn employs several security measures:

- **Authentication:** Clerk-based JWT verification with rotating JWKS keys
- **Input/Output Filtering:** Automated content moderation on all user inputs and AI outputs
- **Rate Limiting:** Per-user and per-IP request limits
- **HTTPS:** All communication encrypted in transit
- **CORS:** Strict origin allow-listing
- **Security Headers:** X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP
- **Data Minimization:** We collect only what is necessary for the service

## Scope

This policy applies to the RealLearn application hosted at reallearn.site and the backend API at real-learn.onrender.com.

## Recognition

We appreciate responsible disclosure and will credit reporters (with their permission) once the issue is resolved.
