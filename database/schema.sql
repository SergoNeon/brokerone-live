-- PostgreSQL schema for a single brokerage office, multiple agents.
-- Run on a trusted backend; never expose a service-role credential in the browser.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS offices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS agents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 office_id uuid NOT NULL REFERENCES offices(id),
 auth_subject text NOT NULL UNIQUE,
 full_name text NOT NULL,
 email text NOT NULL,
 role text NOT NULL CHECK (role IN ('owner','manager','agent')),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(office_id,id)
);
CREATE TABLE IF NOT EXISTS clients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 office_id uuid NOT NULL REFERENCES offices(id),
 assigned_agent_id uuid,
 name text NOT NULL,
 phone text,
 email text,
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(office_id,assigned_agent_id) REFERENCES agents(office_id,id),
 UNIQUE(office_id,id)
);
CREATE TABLE IF NOT EXISTS properties (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 office_id uuid NOT NULL REFERENCES offices(id),
 assigned_agent_id uuid,
 owner_client_id uuid,
 title text NOT NULL,
 address text,
 asking_price_ils numeric(14,2) CHECK(asking_price_ils >= 0),
 status text NOT NULL DEFAULT 'available' CHECK(status IN ('available','reserved','sold','rented','archived')),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(office_id,assigned_agent_id) REFERENCES agents(office_id,id),
 FOREIGN KEY(office_id,owner_client_id) REFERENCES clients(office_id,id),
 UNIQUE(office_id,id)
);
CREATE TABLE IF NOT EXISTS deals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 office_id uuid NOT NULL REFERENCES offices(id),
 property_id uuid,
 client_id uuid,
 assigned_agent_id uuid,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','negotiating','closed','cancelled')),
 agreed_price_ils numeric(14,2) CHECK(agreed_price_ils >= 0),
 commission_rate numeric(6,3) CHECK(commission_rate BETWEEN 0 AND 100),
 closed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(office_id,property_id) REFERENCES properties(office_id,id),
 FOREIGN KEY(office_id,client_id) REFERENCES clients(office_id,id),
 FOREIGN KEY(office_id,assigned_agent_id) REFERENCES agents(office_id,id)
);
CREATE TABLE IF NOT EXISTS tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 office_id uuid NOT NULL REFERENCES offices(id),
 assigned_agent_id uuid,
 title text NOT NULL,
 due_at timestamptz,
 completed boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(office_id,assigned_agent_id) REFERENCES agents(office_id,id)
);
CREATE INDEX IF NOT EXISTS idx_agents_office ON agents(office_id);
CREATE INDEX IF NOT EXISTS idx_clients_agent ON clients(office_id,assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_agent ON properties(office_id,assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_deals_agent ON deals(office_id,assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(office_id,assigned_agent_id);
-- Mandatory next step before production: enforce tenant/role authorization
-- in backend request handlers and database RLS policies; this schema alone is not authorization.
