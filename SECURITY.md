# Security Policy

No system is fully “hackproof.” This document defines our threat model, the assets we protect, and the baseline security controls required when operating Content Vigilante.

## Supported Versions

Security fixes are provided for the latest `main` branch and the most recent tagged release. Older versions are unsupported.

## Reporting a Vulnerability

Please report vulnerabilities via GitHub Security Advisories (Security → Advisories → “Report a vulnerability”). Include a clear reproduction, impact, and any suggested mitigation. Avoid creating public issues for security bugs.

## Scope & Threat Model

**Primary assets**
- OAuth access/refresh tokens (LinkedIn, X, Meta, GA4).
- Vercel KV data and sync tokens.
- User content (drafts, brand guides, audit results).
- API keys for LLM providers (Anthropic, OpenAI, Ollama).

**Attack surfaces**
- Web app UI and API routes (Next.js App Router).
- CLI and local file ingestion.
- CI workflows and GitHub Actions.
- Third-party integrations and outbound HTTP fetches.

## Repository Hardening (Required)

These settings must be enforced in GitHub:
- Branch protection on `main` with required status checks (CI + dependency review).
- Require signed commits and 2FA for all maintainers.
- Disable force pushes and branch deletions on protected branches.
- Enforce CODEOWNERS for security-sensitive paths.
- Enable secret scanning and push protection.
- Use least-privilege GitHub tokens (fine-grained PAT or GitHub App).

## Supply-Chain Controls

We require:
- Dependabot for npm workspaces and GitHub Actions (weekly).
- Dependency Review on every PR.
- GitHub Actions pinned by SHA.
- Scheduled SBOM generation (artifact retained in Actions).
- Regular vulnerability audits as part of release readiness (use your org’s preferred tooling).

## Application Security Baseline

Minimum expectations for product security:
- AuthN/role gates for workspace data and publishing features.
- Input validation for all API routes (JSON + multipart).
- File uploads must be size- and MIME-restricted.
- SSRF protections on all URL fetches (block localhost/private IPs).
- Avoid rendering untrusted HTML; sanitize or treat as plain text.
- Same-origin checks for mutating API routes (CSRF mitigation).
- Rate limiting at the edge/WAF for public endpoints.
- Secure cookies: `httpOnly`, `secure` in production, `sameSite` set, and a strong `CV_COOKIE_SECRET`.

## Integrations & Secrets

- Request minimum OAuth scopes required for each integration.
- Rotate secrets regularly and revoke compromised tokens immediately.
- Validate webhook signatures when adding inbound webhooks.
- Scope KV data per user/workspace and ensure at-rest encryption via the backing store.

## Operational Security

- Centralized monitoring/alerting for auth failures, publish failures, and API errors.
- Audit logs for publish actions and token changes.
- Backup and restore procedures for KV data and critical configs.
- Periodic security reviews and external pen-tests.
