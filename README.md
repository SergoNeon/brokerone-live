# Israel Realtor CRM

Trilingual (Hebrew RTL / Russian / English) CRM prototype for **one real-estate office with multiple agents**.

## Demo

GitHub Pages publishes this static prototype using GitHub Actions. The prototype supports adding, editing, deleting, searching and locally persisting clients, properties, deals, agents and tasks. All demo data stays in the current browser via localStorage. **Do not enter actual client or sensitive information.**

## Next production milestones

- Secure authentication and per-agent permissions
- PostgreSQL database and audit history
- Property-to-client matching, showings and commissions
- Secure documents and integrations
- Automated tests and production security review

## Multi-agent production architecture

The initial relational PostgreSQL schema is in [`database/schema.sql`](database/schema.sql). It is a design artifact, **not a live database**. Authentication, verified role-based access, secure server API and tenant isolation are required before using real customer information.
