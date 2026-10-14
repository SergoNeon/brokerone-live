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
