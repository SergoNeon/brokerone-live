-- Deploy ONLY after reviewing SECURITY DEFINER function ownership and privileges.
-- Function owner must be a trusted non-login role with BYPASSRLS; runtime role must not.
-- The runtime API passes only the verified OIDC subject; the database determines office and agent.
CREATE OR REPLACE FUNCTION public.crm_membership(p_subject text)
RETURNS TABLE(agent_id uuid, office_id uuid, agent_role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT a.id, a.office_id, a.role
  FROM public.agents AS a
  WHERE a.auth_subject = p_subject AND a.active = true
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.crm_membership(text) FROM PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.crm_membership(text) TO brokerone_api;
-- CRITICAL: any role with EXECUTE can resolve memberships by subject.
-- Restrict network access to API only, do not expose database access to browsers.
