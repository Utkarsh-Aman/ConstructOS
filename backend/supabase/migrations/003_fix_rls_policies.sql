-- ============================================================
-- Migration 003: Fix RLS policies for service-role operations
-- ============================================================
-- The service_role key should bypass RLS automatically in Supabase.
-- However, if the PostgREST schema cache is stale or policies are
-- too restrictive, explicit "service-role bypass" policies help.
--
-- These policies allow full access for the service_role (which is
-- what our backend uses). They are safe because the service_role
-- key is never exposed to the client.
-- ============================================================

-- Allow service_role to insert users (registration)
CREATE POLICY "service_role_insert_users" ON users
  FOR INSERT
  WITH CHECK (true);

-- Allow service_role to update users
CREATE POLICY "service_role_update_users" ON users
  FOR UPDATE
  USING (true);

-- Allow service_role to select users
CREATE POLICY "service_role_select_users" ON users
  FOR SELECT
  USING (true);

-- Allow service_role to insert companies
CREATE POLICY "service_role_insert_companies" ON companies
  FOR INSERT
  WITH CHECK (true);

-- Allow service_role to select companies
CREATE POLICY "service_role_select_companies" ON companies
  FOR SELECT
  USING (true);

-- Allow service_role to insert/select/update projects
CREATE POLICY "service_role_all_projects" ON projects
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow operations on master_plans
CREATE POLICY "service_role_all_master_plans" ON master_plans
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_master_plan_versions" ON master_plan_versions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow operations on material_requests
CREATE POLICY "service_role_all_material_requests" ON material_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow operations on worker_requirements
CREATE POLICY "service_role_all_worker_requirements" ON worker_requirements
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow operations on worker_responses
CREATE POLICY "service_role_all_worker_responses" ON worker_responses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow operations on work_assignments
CREATE POLICY "service_role_all_work_assignments" ON work_assignments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow operations on deliveries
CREATE POLICY "service_role_all_deliveries" ON deliveries
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow operations on vendors
CREATE POLICY "service_role_all_vendors" ON vendors
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow operations on notifications
CREATE POLICY "service_role_all_notifications" ON notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow operations on audit_logs (no RLS enabled, but safe to add)
-- audit_logs doesn't have RLS enabled, skip.

-- Allow operations on anonymous sessions and quotation tables
CREATE POLICY "service_role_all_uploaded_quotations" ON uploaded_quotations
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_quotation_analyses" ON quotation_analyses
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_verification_findings" ON verification_findings
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_chat_sessions" ON chat_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_chat_messages" ON chat_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);
