# BrokerOne office API (backend foundation)

This is a **development foundation, not a deployed production service**. It is intentionally separate from GitHub Pages, which only hosts the frontend. Do not enter real customer data into the current demo.

Requires Node 20+, PostgreSQL, an existing trusted OpenID Connect identity provider with RS256 JWTs, and environment variables `DATABASE_URL`, `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URL`, `ALLOWED_ORIGIN` and optional `PORT`.

1. Provision a PostgreSQL instance and a separate migration owner role.
2. Apply `../database/schema.sql` and review/test `../database/access-policy.sql` as the migration owner. The API database role must not own tables or have BYPASSRLS; grant only necessary table and sequence privileges.
3. Create office and agent membership rows through a separate, trusted administrator provisioning flow. Match `agents.auth_subject` to the verified OIDC token `sub`. Never allow browsers to set office IDs or roles.
4. `npm install`, then `npm start` with the environment variables set.
5. Test cross-office isolation, agent-vs-manager visibility, missing membership, unauthorized inserts, and role changes before deploying.

Current routes: `GET /health`, `GET /v1/{clients,properties,deals,tasks}`, `POST /v1/{clients,properties,deals,tasks}`. The service validates bearer JWT signatures using the provider JWKS, binds database tenant context per transaction, and relies on PostgreSQL row-level security. The frontend is **not yet connected**. Do not publish database credentials or secrets to GitHub Pages.

Known gaps: refresh/session UX, input validation by resource, rate limits, audit log, invitation flow, pagination, operational monitoring, migrations, RLS integration tests, deployment, and backup strategy. Until these are completed this is not production-ready.

## Security review notes

- The existing RLS policy file uses `crm_is_manager()` from within the agents policy; this requires the reviewed security-definer hardening in `database/rls-hardening.sql` and correct function ownership. Do **not** deploy until that ownership and permissions are configured and tested.
- New records require an active assigned agent in the same office; ordinary agents can assign only themselves.
- The service must be hosted behind HTTPS and use a managed OIDC identity provider; no user/password implementation is included here.

## Pre-deployment correction

The original API membership query would fail under correctly enforced row-level security because it ran before tenant context was set. `database/auth-bootstrap.sql` adds a privileged, narrowly scoped membership lookup. This function and `database/rls-hardening.sql` require careful function ownership and `GRANT EXECUTE` to the API-only database role; neither should be applied without verifying the role model. Never connect the static browser frontend directly to PostgreSQL.

For the server you provide: Ubuntu LTS or Debian, SSH with an unprivileged sudo user, domain/subdomain pointing to the host, TLS certificate, Node 20+, and a process supervisor/reverse proxy. Share connection details through a secure mechanism, not a password pasted into a public repository. Configure OIDC provider before enabling API access.

Publishing implementation: see `publishing-contract.md`. A manager-only authenticated publication endpoint is now present in source but depends on unapproved migrations, tested RLS and OIDC configuration; it is not live.

Publication checks: `node publication-test.mjs` and `node smoke-test.mjs`. Public feed requires a separately reviewed read-only database access design under FORCE RLS; do not run the API with a table-owner or BYPASSRLS connection to make the public feed work.

## Authenticated record updates

`PATCH /v1/{clients,properties,deals,tasks}/{uuid}` updates only allowlisted columns within the caller's office and within the row-level-security scope. Changing `assigned_agent_id` requires an active agent in the same office; regular agents cannot reassign records. A missing or inaccessible row returns 404. This route requires verified OIDC JWT and tested RLS, and is not deployed yet. No browser fallback to localStorage should silently pretend that a server write succeeded.

## Input validation and error handling

`api-validation.js` validates allowlisted record input for both create and update operations. `api-validation-test.mjs` covers required fields, malformed emails, UUIDs, oversized strings, and safe HTTP error mapping. Authentication failures (expired/invalid JWTs) return 401 instead of a generic 500; known database constraint errors return 400/409 without exposing database internals. Run `node api-validation-test.mjs`, `node publication-test.mjs`, and `node smoke-test.mjs` before deployment. Full integration tests against a disposable Postgres tenant and a real OIDC provider are still required.

## Browser-to-API integration module

`../crm-api-client.js` is a separate ES module for authenticated office operations (`list`, `create`, `update`, `publish`). It requires an access-token provider from a properly configured OIDC login flow; it never stores tokens, uses no cookie credentials, and never silently writes to localStorage when a server request fails. HTTPS is mandatory outside local development. Tests: `node crm-api-client-test.mjs`.

The current browser CRM still uses local demo data. This module is **not wired into it** until OIDC, HTTPS, office membership, RLS, and API hosting are fully configured and tested. Do not present it as an active server connection.

## Production service preflight (not activated)

`brokerone-api.service` is a proposed restricted systemd unit for a dedicated `brokerone` Unix user. `deployment-check.sh` refuses startup when Node.js 20+, a private environment file, or required variables are missing. Never write database credentials into the repository or the public web root. Only enable the service after domain/TLS, OIDC issuer and login flow, restricted DB role, verified office-scoped RLS, and backup/restore testing. Do not expose port 8080 publicly. Keep the current static CRM separate until the API is proven safe.

## IP-only HTTPS plan

The user has chosen to retain `77.42.93.209` and not purchase a domain. `nginx-ip-https.conf.example` is a **non-active** reference configuration for an IP-address certificate. Before enabling it, obtain a trusted certificate explicitly valid for the IP address, confirm automated renewal, open port 443, test nginx syntax, and verify rollback. Do not use a self-signed certificate for staff logins. The existing HTTP site must not be used for real customer data or bearer tokens.
