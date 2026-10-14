#!/bin/sh
set -eu
printf 'BrokerOne API deployment preflight\n'
if ! command -v node >/dev/null 2>&1; then echo 'BLOCKED: Node.js 20+ is missing'; exit 2; fi
node -e 'if(Number(process.versions.node.split(".")[0])<20)process.exit(2)' || { echo 'BLOCKED: Node.js 20+ required'; exit 2; }
if [ ! -f /etc/brokerone/api.env ]; then echo 'BLOCKED: private API environment file missing'; exit 2; fi
for key in DATABASE_URL OIDC_ISSUER OIDC_AUDIENCE OIDC_JWKS_URL ALLOWED_ORIGIN; do
 if ! grep -q "^${key}=" /etc/brokerone/api.env; then echo "BLOCKED: ${key} not configured"; exit 2; fi
done
if grep -Eq "REPLACE|identity[.]example[.]com" /etc/brokerone/api.env; then echo BLOCKED-placeholder-configuration; exit 2; fi
if ! grep -Eq "^ALLOWED_ORIGIN=https://" /etc/brokerone/api.env; then echo BLOCKED-insecure-origin; exit 2; fi
if ! grep -Eq "^OIDC_ISSUER=https://" /etc/brokerone/api.env; then echo BLOCKED-insecure-issuer; exit 2; fi
if ! grep -Eq "^OIDC_JWKS_URL=https://" /etc/brokerone/api.env; then echo BLOCKED-insecure-jwks; exit 2; fi
if [ ! -f /opt/brokerone/api/index.js ]; then echo 'BLOCKED: API source missing'; exit 2; fi
printf 'Preflight passed. Requires RLS, OIDC, HTTPS, database privilege and backup integration tests before service activation.\n'
