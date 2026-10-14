-- PostgreSQL defense-in-depth access policy foundation.
-- The trusted API must set app.office_id and app.agent_id per verified request,
-- in a transaction (SET LOCAL), after authenticating the caller.
-- NEVER allow untrusted clients to choose these values directly.
-- Application DB role must NOT own tables or have BYPASSRLS.
CREATE OR REPLACE FUNCTION crm_office_id() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('app.office_id',true),'')::uuid
$$;
CREATE OR REPLACE FUNCTION crm_agent_id() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('app.agent_id',true),'')::uuid
$$;
CREATE OR REPLACE FUNCTION crm_is_manager() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER AS $$
 SELECT EXISTS (SELECT 1 FROM agents a WHERE a.id=crm_agent_id() AND a.office_id=crm_office_id() AND a.active AND a.role IN ('owner','manager'))
$$;
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE offices FORCE ROW LEVEL SECURITY;
ALTER TABLE agents FORCE ROW LEVEL SECURITY;
ALTER TABLE clients FORCE ROW LEVEL SECURITY;
ALTER TABLE properties FORCE ROW LEVEL SECURITY;
ALTER TABLE deals FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY office_read ON offices FOR SELECT USING (id=crm_office_id());
CREATE POLICY agent_read ON agents FOR SELECT USING (office_id=crm_office_id() AND (id=crm_agent_id() OR crm_is_manager()));
CREATE POLICY client_read ON clients FOR SELECT USING (office_id=crm_office_id() AND (assigned_agent_id=crm_agent_id() OR crm_is_manager()));
CREATE POLICY client_write ON clients FOR ALL USING (office_id=crm_office_id() AND (assigned_agent_id=crm_agent_id() OR crm_is_manager())) WITH CHECK (office_id=crm_office_id() AND (assigned_agent_id=crm_agent_id() OR crm_is_manager()));
CREATE POLICY property_read ON properties FOR SELECT USING (office_id=crm_office_id() AND (assigned_agent_id=crm_agent_id() OR crm_is_manager()));
CREATE POLICY property_write ON properties FOR ALL USING (office_id=crm_office_id() AND (assigned_agent_id=crm_agent_id() OR crm_is_manager())) WITH CHECK (office_id=crm_office_id() AND (assigned_agent_id=crm_agent_id() OR crm_is_manager()));
CREATE POLICY deal_read ON deals FOR SELECT USING (office_id=crm_office_id() AND (assigned_agent_id=crm_agent_id() OR crm_is_manager()));
CREATE POLICY deal_write ON deals FOR ALL USING (office_id=crm_office_id() AND (assigned_agent_id=crm_agent_id() OR crm_is_manager())) WITH CHECK (office_id=crm_office_id() AND (assigned_agent_id=crm_agent_id() OR crm_is_manager()));
CREATE POLICY task_read ON tasks FOR SELECT USING (office_id=crm_office_id() AND (assigned_agent_id=crm_agent_id() OR crm_is_manager()));
CREATE POLICY task_write ON tasks FOR ALL USING (office_id=crm_office_id() AND (assigned_agent_id=crm_agent_id() OR crm_is_manager())) WITH CHECK (office_id=crm_office_id() AND (assigned_agent_id=crm_agent_id() OR crm_is_manager()));
-- IMPORTANT: policies require review, role/grant hardening, and integration tests.
-- No policy for writes to agents or offices: admin provisioning only.
