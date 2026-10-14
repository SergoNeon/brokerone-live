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
