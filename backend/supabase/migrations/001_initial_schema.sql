-- ============================================================
-- ConstructOS — Initial Schema Migration
-- ============================================================
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM (
  'company_admin', 'site_manager', 'worker', 'group_leader', 'vendor', 'driver'
);

CREATE TYPE user_status AS ENUM ('active', 'suspended');

CREATE TYPE project_status AS ENUM ('active', 'archived');

CREATE TYPE master_plan_status AS ENUM ('active', 'archived');

CREATE TYPE ai_processing_status AS ENUM ('not_started', 'queued', 'complete');

CREATE TYPE material_request_status AS ENUM (
  'draft', 'submitted', 'under_review', 'approved', 'rejected', 'fulfilled', 'closed'
);

CREATE TYPE material_request_priority AS ENUM ('low', 'medium', 'high');

CREATE TYPE rfp_status AS ENUM ('open', 'closed');

CREATE TYPE quote_status AS ENUM (
  'submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn'
);

CREATE TYPE pay_basis AS ENUM ('per_day', 'per_job');

CREATE TYPE worker_requirement_status AS ENUM (
  'open', 'partially_filled', 'filled', 'closed'
);

CREATE TYPE worker_response_type AS ENUM ('individual', 'group');

CREATE TYPE worker_response_status AS ENUM ('accepted', 'rejected', 'pending');

CREATE TYPE work_assignment_status AS ENUM (
  'assigned', 'in_progress', 'completed', 'no_show', 'cancelled'
);

CREATE TYPE payment_status AS ENUM ('pending', 'paid');

CREATE TYPE delivery_status AS ENUM ('scheduled', 'in_transit', 'delivered', 'delayed');

CREATE TYPE chat_scope AS ENUM ('General', 'QuotationFollowUp');

CREATE TYPE uploaded_quotation_status AS ENUM (
  'Uploaded', 'Processing', 'Ready', 'Failed', 'Deleted'
);

CREATE TYPE quotation_analysis_status AS ENUM ('Pending', 'Completed', 'Failed');

CREATE TYPE verification_outcome AS ENUM (
  'Flagged', 'NoIssueDetected', 'InsufficientData'
);

CREATE TYPE finding_type AS ENUM (
  'PriceUnusual', 'MissingQuantity', 'MissingUnit', 'MissingSpecification',
  'IncompleteLineItem', 'AmbiguousDescription', 'MissingCharge',
  'CalculationMismatch', 'TaxInconsistency', 'UnclearScope',
  'RequiresManualVerification', 'MaterialSpecMismatch'
);

CREATE TYPE confidence_level AS ENUM ('High', 'Medium', 'Low', 'InsufficientData');

CREATE TYPE reference_source_type AS ENUM (
  'GovernmentSchedule', 'MaterialPriceList', 'LabourRate',
  'BuildingCode', 'Standard', 'Other'
);

CREATE TYPE reference_source_status AS ENUM ('Active', 'Superseded');

CREATE TYPE chat_message_role AS ENUM ('User', 'Assistant');

CREATE TYPE citation_type AS ENUM (
  'RAGDocument', 'ReferenceSource', 'QuotationLineItem', 'VerificationFinding'
);

CREATE TYPE group_member_status AS ENUM ('active', 'inactive');

CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');

-- ============================================================
-- §11.1 IDENTITY & COMPANY
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE,                          -- FK to Supabase auth.users
  role user_role NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES users(id),
  verification_status verification_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  status project_status NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  address TEXT NOT NULL,
  geo_lat DOUBLE PRECISION,  -- internal use only, never rendered as live map
  geo_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE site_manager_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  user_id UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- ============================================================
-- §11.2 MASTER PLANS (storage-only, no AI)
-- ============================================================
CREATE TABLE master_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  current_version_id UUID,  -- FK set after first version created
  status master_plan_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE master_plan_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_plan_id UUID NOT NULL REFERENCES master_plans(id),
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,         -- Supabase Storage path
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  ai_processing_status ai_processing_status DEFAULT 'not_started', -- reserved extension point
  UNIQUE(master_plan_id, version_number)
);

-- Back-reference: set current_version_id after insert
ALTER TABLE master_plans ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES master_plan_versions(id);

-- ============================================================
-- §11.3 MATERIAL REQUESTS & VENDOR FLOW
-- ============================================================
CREATE TABLE material_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  site_manager_id UUID NOT NULL REFERENCES users(id),
  material TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  required_by_date DATE NOT NULL,
  priority material_request_priority NOT NULL DEFAULT 'medium',
  remarks TEXT,
  attachment_url TEXT,
  status material_request_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  business_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  service_area TEXT,
  verification_documents JSONB,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE vendor_material_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  category TEXT NOT NULL,
  catalogue_item TEXT NOT NULL,
  unit_price NUMERIC,
  est_delivery_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rfps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_request_id UUID NOT NULL REFERENCES material_requests(id),
  status rfp_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rfp_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id),
  item TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL
);

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  expected_delivery_date DATE,
  validity_date DATE,
  payment_terms TEXT,
  terms_and_conditions TEXT,
  document_url TEXT,
  status quote_status NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id),
  item TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  tax NUMERIC,
  delivery_charge NUMERIC
);

-- ============================================================
-- §11.4 WORKER MARKETPLACE
-- ============================================================
CREATE TABLE worker_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  skills TEXT[] DEFAULT '{}',
  trade_tags TEXT[] DEFAULT '{}',
  photo_url TEXT,
  availability_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE worker_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leader_user_id UUID NOT NULL REFERENCES users(id),
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE worker_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES worker_groups(id),
  worker_user_id UUID NOT NULL REFERENCES users(id),
  status group_member_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, worker_user_id)
);

CREATE TABLE worker_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  site_manager_id UUID NOT NULL REFERENCES users(id),
  work_type TEXT NOT NULL,
  trade TEXT NOT NULL,
  headcount INTEGER NOT NULL,
  date DATE NOT NULL,
  duration TEXT,
  working_hours TEXT,
  location TEXT NOT NULL,
  pay NUMERIC NOT NULL,
  pay_basis pay_basis NOT NULL DEFAULT 'per_day',
  description TEXT,
  required_skills TEXT[] DEFAULT '{}',
  deadline TIMESTAMPTZ,
  urgent_flag BOOLEAN NOT NULL DEFAULT FALSE,
  status worker_requirement_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE worker_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requirement_id UUID NOT NULL REFERENCES worker_requirements(id),
  worker_user_id UUID NOT NULL REFERENCES users(id),
  type worker_response_type NOT NULL DEFAULT 'individual',
  group_id UUID REFERENCES worker_groups(id),
  committed_count INTEGER,
  status worker_response_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE work_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requirement_id UUID NOT NULL REFERENCES worker_requirements(id),
  worker_user_id UUID REFERENCES users(id),
  group_id UUID REFERENCES worker_groups(id),
  status work_assignment_status NOT NULL DEFAULT 'assigned',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES work_assignments(id),
  date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  marked_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES work_assignments(id),
  rated_by UUID REFERENCES users(id),
  rated_user_or_group_id UUID NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- §11.5 DELIVERY / DRIVER
-- ============================================================
CREATE TABLE trucks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  registration_number TEXT NOT NULL,
  type TEXT,
  capacity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  material TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  expected_date DATE NOT NULL,
  expected_time TIME,
  truck_id UUID REFERENCES trucks(id),
  driver_id UUID REFERENCES drivers(id),
  status delivery_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE driver_delivery_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  secure_link_token_hash TEXT NOT NULL UNIQUE,
  link_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE location_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- used only for approximate ETA computation — never rendered as a live map
);

-- ============================================================
-- §11.6 PUBLIC AI
-- ============================================================
CREATE TABLE anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token TEXT NOT NULL UNIQUE,   -- stored as bcrypt hash
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);
CREATE INDEX idx_anonymous_sessions_token ON anonymous_sessions(session_token);

CREATE TABLE uploaded_quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_session_id UUID NOT NULL REFERENCES anonymous_sessions(id),
  original_filename TEXT,
  file_url TEXT,   -- Supabase Storage private object key
  file_type TEXT,
  file_size_bytes BIGINT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status uploaded_quotation_status NOT NULL DEFAULT 'Uploaded',
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_uploaded_quotations_session ON uploaded_quotations(anonymous_session_id);
CREATE INDEX idx_uploaded_quotations_status ON uploaded_quotations(status);

CREATE TABLE quotation_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_quotation_id UUID NOT NULL UNIQUE REFERENCES uploaded_quotations(id),
  raw_ocr_text TEXT,
  page_count INTEGER,
  ocr_confidence FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quotation_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_document_id UUID NOT NULL REFERENCES quotation_documents(id),
  line_number INTEGER,
  description_extracted TEXT,
  material_normalised TEXT,
  quantity_extracted TEXT,      -- kept as string (raw OCR may be ambiguous)
  quantity_normalised NUMERIC,
  unit_extracted TEXT,
  unit_normalised TEXT,
  unit_price_extracted NUMERIC,
  total_price_extracted NUMERIC,
  field_source JSONB NOT NULL DEFAULT '{}',  -- per-field Extracted/Normalised/Inferred/Missing map
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_quotation_line_items_doc ON quotation_line_items(quotation_document_id);

CREATE TABLE quotation_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_quotation_id UUID NOT NULL UNIQUE REFERENCES uploaded_quotations(id),
  overall_summary TEXT,
  status quotation_analysis_status NOT NULL DEFAULT 'Pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  overall_confidence confidence_level,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_quotation_analyses_status ON quotation_analyses(status);

CREATE TABLE reference_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  source_type reference_source_type NOT NULL,
  region TEXT,
  published_date DATE,
  source_url TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status reference_source_status NOT NULL DEFAULT 'Active'
);

CREATE TABLE reference_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_source_id UUID NOT NULL REFERENCES reference_sources(id),
  material_category TEXT NOT NULL,
  unit TEXT NOT NULL,
  price_low NUMERIC,
  price_high NUMERIC,
  region TEXT,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reference_prices_category ON reference_prices(material_category);
CREATE INDEX idx_reference_prices_source ON reference_prices(reference_source_id);

CREATE TABLE verification_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES quotation_analyses(id),
  line_item_id UUID REFERENCES quotation_line_items(id),  -- nullable for doc-level findings
  finding_type finding_type NOT NULL,
  outcome verification_outcome NOT NULL,   -- required enum, never inferred from absence
  explanation TEXT,                         -- LLM-generated, grounded
  reference_source_id UUID REFERENCES reference_sources(id),
  confidence confidence_level,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_verification_findings_analysis ON verification_findings(analysis_id);

-- RAG corpus (prose knowledge: codes, standards, FAQs)
CREATE TABLE rag_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  url TEXT,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rag_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES rag_documents(id),
  chunk_text TEXT NOT NULL,
  embedding vector(1536),   -- dimension for text-embedding-3-small or equivalent
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rag_chunks_doc ON rag_chunks(document_id);
CREATE INDEX idx_rag_chunks_embedding ON rag_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Chat
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_session_id UUID REFERENCES anonymous_sessions(id),
  user_id UUID REFERENCES users(id),
  scope chat_scope NOT NULL DEFAULT 'General',
  uploaded_quotation_id UUID REFERENCES uploaded_quotations(id),  -- set when scope=QuotationFollowUp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_session_id UUID NOT NULL REFERENCES chat_sessions(id),
  role chat_message_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_session ON chat_messages(chat_session_id);

CREATE TABLE chat_citations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_message_id UUID NOT NULL REFERENCES chat_messages(id),
  citation_type citation_type NOT NULL,
  cited_entity_id UUID NOT NULL   -- polymorphic: points to rag_documents, reference_sources, etc.
);
CREATE INDEX idx_chat_citations_message ON chat_citations(chat_message_id);

-- ============================================================
-- §11.7 CROSS-CUTTING
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================================
-- UPDATED_AT TRIGGER HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users','companies','projects','sites','master_plans','master_plan_versions',
    'material_requests','vendors','vendor_material_categories','rfps','quotes',
    'worker_profiles','worker_groups','worker_group_members','worker_requirements',
    'worker_responses','work_assignments','trucks','drivers','deliveries',
    'quotation_analyses'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();', tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY — BASIC POLICIES
-- (Service role bypasses all; fine-grained policies added per portal)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = auth_id);

-- Company admins can read their company
CREATE POLICY "company_admin_read_own_company" ON companies
  FOR SELECT USING (
    owner_user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Projects: readable by company members
CREATE POLICY "project_read_by_company_member" ON projects
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
    OR id IN (
      SELECT project_id FROM site_manager_assignments WHERE user_id IN (
        SELECT id FROM users WHERE auth_id = auth.uid()
      )
    )
  );

-- Notifications: users see only their own
CREATE POLICY "notifications_read_own" ON notifications
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Anonymous session scoping handled in application layer (session token cookie)
-- The service_role key is used server-side for all anonymous session operations.
-- These tables are not directly exposed to public anon Supabase client.
CREATE POLICY "deny_public_anonymous_sessions" ON anonymous_sessions
  FOR ALL USING (FALSE);

CREATE POLICY "deny_public_uploaded_quotations" ON uploaded_quotations
  FOR ALL USING (FALSE);

CREATE POLICY "deny_public_quotation_analyses" ON quotation_analyses
  FOR ALL USING (FALSE);

CREATE POLICY "deny_public_verification_findings" ON verification_findings
  FOR ALL USING (FALSE);
