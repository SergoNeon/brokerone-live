# BrokerOne publishing workflow — implementation contract

**Not yet deployed or enabled.** This is a specification for the authenticated backend.

1. An agent creates a private property in the office, selects `sale` or `rent`, and uploads media to private object storage. Client-provided URLs are never treated as verified uploads.
2. An agent edits a public draft (title, city, description, photos, amenities). Draft changes never affect the live site before approval.
3. A manager checks owner consent, price, listing status, image rights, personal-data removal, and mandatory fields.
4. An authorized manager publishes through a transaction with office-scoped membership verification and an audit log. `is_published` remains false until this succeeds.
5. Public GET endpoints return only allowlisted public columns and approved public media, never private owner, agent, notes, phone or document fields.
6. Changing status to sold, rented, archived, or withdrawing consent unpublishes immediately and invalidates caches.
7. Media upload requires server-side file type verification, size limits, malware scanning where available, EXIF stripping, and storage quotas.
8. Audit entries include actor, office, property, action, timestamp, and changed fields; do not log sensitive values.
9. Public inquiry forms need rate limiting, spam controls, consent text, retention policy, and routing to the correct office.
10. No deployment until auth, RLS, domain, HTTPS, and backup/restore are tested.

Database upgrade: `database/public-listings.sql` followed by `database/publishing-upgrade.sql` only after explicit approval and security review.

## Manager publication endpoint (implemented in API source; not deployed)

`POST /v1/properties/{uuid}/publication` with `Authorization: Bearer ...`, JSON body `{"publish":true}` or `{"publish":false}`.

Only active office members whose role is `manager`, `admin`, or `owner` can publish or unpublish. A publication requires an available property, nonempty title and city, room count, price, and HTTPS cover photo. It updates the record in a tenant-scoped database transaction. The database role and RLS policies still need security verification; this route is not production-ready. The `publication_reviewed_by` and `publication_reviewed_at` columns require `database/publishing-upgrade.sql`. Full immutable audit logging and draft revision approval remain outstanding.
