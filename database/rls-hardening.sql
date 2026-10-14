-- Apply with a trusted migration owner, after schema.sql and access-policy.sql.
-- Prevent recursive agent policy evaluation when checking manager membership.
-- The function owner MUST have a carefully controlled, non-login BYPASSRLS role.
-- Review and adapt ownership to your deployment security model before use.
CREATE OR REPLACE FUNCTION crm_is_manager() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.agents a
  WHERE a.id=public.crm_agent_id() AND a.office_id=public.crm_office_id()
    AND a.active AND a.role IN ('owner','manager')
 )
$$;
REVOKE ALL ON FUNCTION crm_is_manager() FROM PUBLIC;
-- GRANT EXECUTE ON FUNCTION crm_is_manager() TO your_runtime_role;
-- Important: do not use this function until its owner bypasses agents RLS;
-- otherwise it will recurse via agent_read policy.
