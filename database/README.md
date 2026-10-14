# Production database design (not deployed)

`schema.sql` models **one office with multiple agents** and relational clients, properties, deals and tasks. Each record belongs to an office; composite foreign keys prevent cross-office references. Prices and commissions use ILS numeric fields.

## Security requirements before any real user data

1. Connect a managed Postgres database and identity provider through a trusted server, never GitHub Pages client JavaScript.
2. Implement verified sessions, authorization for owner/manager/agent, and row-level security where supported. Default-deny all unauthenticated access.
3. Add database migrations, audit logs, encrypted backups, rate limits and automated access-control tests.
4. Keep API secrets and personal customer information out of the public demo repository.

The GitHub Pages demo is **local-only**, not connected to this schema.

## Authorization policy draft

`access-policy.sql` contains a **draft** PostgreSQL RLS strategy for one office and several agents. It is not deployed or tested against a running database. A trusted API must verify identity and set `app.office_id` and `app.agent_id` transaction-locally; untrusted browsers must never receive direct database credentials. Do not use in production without database role/grant hardening, full write-policy review, tests for privilege escalation and transaction pooling, and migration tooling.
