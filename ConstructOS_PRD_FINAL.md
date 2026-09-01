# ConstructOS — Product Requirements Document (Final)
### Construction Company / Worker / Vendor / Public-AI Platform — MVP PRD

**Document status:** Final, implementation-ready. This document supersedes and merges the two prior drafts (the original ConstructOS PRD and PRD v2). Where anything here conflicts with either prior draft or with any attached research report, **this PRD governs.**

**Labeling convention:** **[CONFIRMED]** = stated explicitly in the source problem statement/brief · **[ASSUMPTION]** = not stated, a reasonable default assumed to make the spec buildable — needs product-owner sign-off · **[RECOMMENDATION]** = proposed beyond the mandated scope, individually acceptable or cuttable without touching the mandatory list in §22.

---

## 1. Product Vision

ConstructOS connects seven actor types around a shared project record, built on two deliberately different principles:

1. **Company-side coordination workflows** — Master Plan storage, worker requirements, material requests, vendor quotations, deliveries with periodic driver location. These are **entirely deterministic and human-triggered** in MVP. No LLM touches Company Master Plans or auto-generates RFPs/BOQs.
2. **Public AI workflows** — a no-login RAG chatbot and a no-login AI-powered quotation-verification tool. These **are core, LLM-powered features**, not optional extras, and are the platform's core differentiator.

This split is intentional and load-bearing for the whole document — §2 fixes it as an inviolable rule, and every subsequent section (data model, architecture, security, phasing) respects it.

**The seven actors:**
- **Company Admin** — owns companies/projects, stores Master Plans, oversees vendors and deliveries.
- **Site Manager** — runs a specific project/site: requests workers, requests materials, tracks deliveries.
- **Worker** — an individual daily-wage/skilled worker who discovers and accepts/rejects work.
- **Worker Group Leader** — a crew leader who can accept work on behalf of a specified number of group members.
- **Vendor** — a material supplier who lists a catalogue, responds to RFPs, and manages deliveries/trucks/drivers.
- **Driver** — shares periodic (not live) location for an assigned delivery.
- **Public User** — no login required; uses an LLM-powered RAG chatbot and an AI-assisted quotation-verification tool.

One coherent system: shared backend, shared database, shared auth/RBAC, shared notification layer.

---

## 2. Critical Scope Rules

These override anything else in this document.

### 2.1 Company Master Plan — storage only, no exceptions
Company Admins upload existing documents; the platform stores, versions, and serves them. **No LLM ever processes Master Plan content** — no BOQ extraction, no AI interpretation, no auto-generated RFPs, no AI procurement/vendor/demand recommendations. The architecture leaves a clean extension point (§12) so this can be added later without a rewrite, but it is not built now.

### 2.2 Public AI is core, not optional
The RAG Chatbot and Quotation Verification tool are **both core MVP features**, explicitly required to use an LLM, explicitly required to work without login. Neither may be cut, stubbed, or deferred to V1.

### 2.3 No live tracking / no maps
No live GPS tracking, no live map, no truck icon, no continuous surveillance, no route optimization, no fleet management. Driver location is periodic, interval configurable by company/vendor, purely to support an approximate, clearly-labeled ETA. No mapping/routing/navigation/geofencing service of any kind.

### 2.4 No public consumer account system
Public users get the RAG chatbot and quotation verification via **anonymous sessions** — no registration, no persistent account, no consumer dashboard beyond the current session's chat/analysis.

### 2.5 Deterministic vs. LLM — a hard architectural boundary
Wherever a calculation, comparison, or objective validation can be done in code, it **must** be done in code — never delegated to the LLM. The LLM is reserved for semantic understanding, normalization, explanation, and conversation. This rule applies specifically and non-negotiably to quotation verification (§9).

### 2.6 "Insufficient information" is a distinct, valid outcome
The system must always be able to say "insufficient information to assess" — this is a separate outcome from "no issue detected," never conflated with it, and never silently defaulted. This governs both the RAG chatbot (no grounded source → say so) and quotation verification (no reference data → say so, don't guess).

---

## 3. User Roles & RBAC

| Role | Auth | Core permissions |
|---|---|---|
| **Company Admin** | Email + password | Full CRUD on own company's projects and Master Plans (upload/version/view/download); approves Material Requests; manages RFP/quotation review; manages vendor relationships; visibility into all project activity. Company-scoped only. |
| **Site Manager** | Email/phone + password, invited, project-scoped | Create/manage Worker Requirements and Material Requests for assigned project(s); read-only on Master Plans; views deliveries and driver ETA; cannot approve their own Material Requests. |
| **Worker** | Phone + OTP | Browse/accept/reject open requirements; manage profile, skills, availability; view own assignment history; **check in/out [RECOMMENDATION]**. |
| **Worker Group Leader** | Phone + OTP | Everything a Worker can do, plus create/manage a group, invite/remove members, and commit N members to a requirement. |
| **Vendor** | Email + password, verification-pending flag | Manage company profile/catalogue; view matching RFPs; submit/edit/withdraw quotations; manage trucks/drivers; create/manage deliveries. |
| **Driver** | No account — secure, single-use, expiring tokenized link per delivery | View only their linked delivery; grant/deny location; send periodic updates; stop sharing; mark delivery complete. |
| **Public User** | **None — anonymous session token, no login** | Use the RAG chatbot; upload a quotation document; view its verification report; ask follow-up questions about it. Cannot see any other session's data. No persistent identity across browser sessions/devices in MVP. |

### 3.1 Data-visibility boundaries
- **Company-side scoping**: company-level, project-level, site-level, vendor, worker, and driver/location data is scoped per the RBAC table above — enforced at the API layer, not just UI-level hiding.
- **Anonymous session data** (an uploaded quotation, its extracted line items, its analysis, its chat history) is visible **only to the browser session that created it**, identified by a session token validated server-side on every request. No cross-session, cross-user, or admin-facing view of another user's uploaded quotation exists in MVP — **[RECOMMENDATION]** not even an internal support/debug view, without a separate, explicitly-logged, purpose-limited access path, given the emphasis on quotation confidentiality (§18).
- RAG knowledge-base content (building codes, reference prices) is public read-only data, visible to any Public User's chatbot session, and separately used server-side as reference data in quotation verification — the two features share the *knowledge base*, never a user's *uploaded content*.

---

## 4. Information Architecture / Sitemap

**Company Admin:** Dashboard · Projects · Project Details (tabs: Overview, Master Plans, Worker Requirements, Material Requests, Vendors/Deliveries, Activity Feed **[RECOMMENDATION]**) · Master Plans · Master Plan Upload · Master Plan Details · Vendors · Quotations (+ compare) · Deliveries · Notifications · Settings

**Site Manager:** Dashboard · Worker Requirements · Create Worker Requirement · Requirement Details · Material Requests · Create Material Request · Material Request Details · Deliveries · Driver ETA · Notifications · Profile

**Worker:** Available Work · Work Details · My Work · Availability · Profile · My Group · Attendance **[RECOMMENDATION]** · Notifications

**Group Leader:** everything above, plus Group · Members · Group Requests · Group Acceptance · Committed-Workers view

**Vendor:** Dashboard · Profile/Catalogue · RFPs/Requests · RFP Details · Submit Quote · My Quotes · Deliveries · Trucks · Drivers · Notifications

**Driver:** Active Delivery (single view) · Location Sharing · Delivery Details

**Public (no login):** RAG Chatbot (single chat page) · Upload Quotation · Quotation Analysis (processing status) · Analysis Detail (full report) · Follow-up Chat (scoped to the uploaded quotation, distinct session from the general chatbot but sharing the same chat UI component) · Multi-Quote Compare **[RECOMMENDATION]**

---

## 5. Page-by-Page UI Requirements

Format per page: **Purpose | Key components | Notes**. Every page assumes standard success/error toasts and skeleton loading states unless noted.

### 5.1 Company Admin

| Page | Purpose | Key components | Notes |
|---|---|---|---|
| Dashboard | At-a-glance status across all projects | Project cards (status, open requirements, open material requests, pending quotes), quick-create buttons | Empty state: "No projects yet — create your first project" |
| Projects | List/manage projects | Table: name, status, site manager(s), created date; filters by status; search by name | Archive action requires confirmation modal |
| Project Details | Single project overview | Tabs: Overview, Master Plans, Worker Requirements, Material Requests, Vendors/Deliveries, Activity Feed **[RECOMMENDATION]** | — |
| Master Plans | List Master Plans for a project | Table: document name, version, uploaded by, date, file type, size, status; download button | Empty state: "No Master Plan uploaded" |
| Master Plan Upload | Upload a new document or new version | File picker (drag/drop), version note field, project selector | Validation errors shown inline (file type, size limit) |
| Master Plan Details | View metadata & version history | Metadata panel, version history table, download links per version | No preview/parsing — download only, per §2.1 |
| Vendors | Manage vendor relationships | Table: vendor name, category, verification status, active RFPs | — |
| Quotations | Company-wide view of quotes received | Table + compare view (side-by-side up to 3 quotes) | Compare view reuses verification-engine flag styling **[RECOMMENDATION]** |
| Deliveries | Track incoming deliveries | Table: vendor, material, expected date/time, status, latest driver update, ETA (labeled "estimate") | No map — text/badge ETA only |
| Activity Feed **[RECOMMENDATION]** | Chronological cross-entity feed per project | Timeline list: Master Plan uploads, requirement posts, material requests, deliveries | Read-only |
| Settings | Company profile, user management, notification preferences | Form fields, role-assignment table | — |

### 5.2 Site Manager

| Page | Purpose | Key components |
|---|---|---|
| Dashboard | Project status for assigned site(s) | Open requirements count, open material requests count, pending deliveries |
| Create Worker Requirement | Post a labour need | Form: work type/trade, headcount, date, duration, hours, location, pay + pay basis, description, required skills, deadline, **urgent flag [RECOMMENDATION]** |
| Requirement Details | Track responses | List of individual/group responses, accepted count vs. required, status badge, fulfil/close action |
| Create Material Request | Post a material need | Form: material, quantity, unit, required-by date, priority, remarks, optional photo |
| Material Request Details | Track lifecycle | Status stepper (Draft→Submitted→Under Review→Approved/Rejected→Fulfilled→Closed), linked vendor quotes |
| Deliveries / Driver ETA | Monitor incoming deliveries | Card per delivery: material, vendor, truck/driver, last location update timestamp, approximate ETA (clearly labeled estimate), staleness indicator if no update beyond the configured interval |

### 5.3 Worker / Group Leader

| Page | Purpose | Key components |
|---|---|---|
| Available Work | Browse open requirements | Card feed: work type, site, approximate distance, pay + basis, duration, start date, headcount needed, description; accept/reject buttons; **urgent badge [RECOMMENDATION]** |
| Work Details | Full requirement info before accepting | All fields from card + full description + any attachments |
| My Work | Track own assignments | Tabs: Upcoming, Accepted, Completed; status per assignment; **attendance check-in/out button [RECOMMENDATION]** |
| Availability | Set availability windows | Calendar/toggle UI |
| Profile | Manage personal info, skills, trade tags | Editable fields, photo upload |
| Group / Members (Leader only) | Manage crew | Member list, add/remove member, per-member availability |
| Group Requests / Acceptance (Leader only) | Accept work for N members | Requirement details + numeric selector for committed member count, validated against available members |

Mobile behavior for this entire portal: single-column, large tap targets, minimal text density, offline-tolerant form submission with retry queue **[RECOMMENDATION]**, given field connectivity is unreliable.

### 5.4 Vendor

| Page | Purpose | Key components |
|---|---|---|
| Dashboard | Vendor overview | Active RFPs, pending quotes, upcoming deliveries |
| Profile/Catalogue | Manage listing | Company info, service area, material categories & catalogue items with unit price/est. delivery time, verification documents upload |
| RFPs/Requests | View relevant material requests | List filtered by matching category/service area |
| Submit Quote | Respond to an RFP | Line-item form: item, qty, unit, unit price, total, taxes, delivery charge, expected delivery date, validity, payment terms, T&Cs, document upload |
| My Quotes | Track submitted quotes | Status per quote: Submitted/Shortlisted/Accepted/Rejected/Withdrawn |
| Trucks / Drivers | Manage delivery assets | Truck: reg. number, type, capacity; Driver: name, contact, assigned delivery |

### 5.5 Driver

| Page | Purpose | Key components |
|---|---|---|
| Active Delivery | View current assignment | Delivery details, project/site address (text, no map) |
| Location Sharing | Start/stop periodic sharing | Consent toggle, interval display (set by company/vendor), last-sent timestamp, manual "share now" button |
| Delivery Details | Confirm completion | Mark delivered, stop sharing automatically on completion |

Access via secure, single-use, expiring tokenized link — no full account/app required for MVP.

### 5.6 Public (no login)

This is the platform's core differentiator; these pages must not be under-specified.

**RAG Chatbot**
- **Purpose:** general construction-knowledge Q&A, no login, no document required.
- **Components:** chat input, message thread, each assistant message showing inline citations (source title, date if available, link), a persistent disclaimer ("Answers are generated from available sources and may be incomplete — not a substitute for professional advice"), and a small entry point to "Upload a quotation for verification instead" (cross-promotes the second feature without merging the two experiences).
- **Empty state:** a few example prompts ("What does M25 grade concrete mean?", "What's the standard rebar spacing for a slab?") to reduce blank-page hesitation.
- **Loading state:** typing indicator while retrieval + generation run.
- **Out-of-scope state:** explicit "I don't have reliable information on this" rather than a generated guess.
- **Rate-limit state:** friendly throttle message, not a raw error.
- **Mobile:** full-height chat view, no side navigation.

**Upload Quotation**
- **Purpose:** entry point for quotation verification.
- **Components:** drag-and-drop/file-picker upload zone, supported-format hint text, a short explainer of what happens next ("We'll extract the line items and compare them against reference pricing — this takes about 30–60 seconds").
- **Validation:** client-side file-type/size pre-check before upload; server-side re-validation always.
- **States:** uploading (progress bar) → processing (redirect to a status view) → ready (redirect to Analysis Detail) → failed (specific reason, e.g. "We couldn't read this file — try a clearer scan or a different format," with a retry button).
- **Consent notice, shown before upload completes:** a concise, non-buried statement of what happens to the file (§18) — **[RECOMMENDATION]** must be an actual visible statement on this page, not just buried in a Terms link, given the sensitivity of contractor-quotation content.

**Quotation Analysis (processing status)**
- **Purpose:** bridge state between upload and a completed report, since OCR + extraction + reference lookup + LLM generation is not instant.
- **Components:** a staged progress indicator (Reading document → Extracting line items → Comparing with reference data → Preparing explanation), auto-refreshing/polling until complete.
- **Long-processing state:** past **[ASSUMPTION] 90 seconds**, show a reassuring message rather than appearing frozen; past a hard timeout (**[ASSUMPTION] 5 minutes**), fail gracefully with a retry/re-upload option.
- **Permissions:** accessible only via the session token that created this upload; a stale/foreign token gets a "not found" (404-style) response rather than "forbidden" (403) — **[RECOMMENDATION]**, avoids confirming the existence of another session's data.

**Analysis Detail (the verification report)**
- **Purpose:** the core deliverable of the whole feature — must be genuinely readable by a non-technical user, not a raw data dump.
- **Components:**
  - **Overall summary** — 2–3 plain-language sentences (LLM-generated, only after deterministic checks have run) stating what was found overall.
  - **Extracted quotation table** — columns: Item/Description, Quantity, Unit, Quoted Price, Reference Range, Difference (%), Status (badge: OK / Flagged / Insufficient Data). Every cell from OCR/extraction is visually distinguishable from an inferred value — **[RECOMMENDATION]** inferred cells get a small "(inferred)" tag and a different text style, never presented identically to extracted fact.
  - **Flags panel** — a list of specific issues, each with a plain-language explanation of *why* it was flagged.
  - **Sources panel** — every reference price/standard cited, with its origin (e.g., "State Schedule of Rates, [region], [date]") — matches the RAG citation pattern for consistency across both AI features.
  - **Confidence indicator** — per-item and/or overall, distinguishing **"No issue detected"** from **"Insufficient information to assess"** as genuinely different, visually distinct states — not the same green checkmark for both.
- **Actions:** "Ask a follow-up question," "Download report" (**[ASSUMPTION] PDF export, V1**, flagged as an open decision in §26), "Delete my upload" (§18's user-initiated deletion right).
- **Error state:** if extraction failed entirely (e.g., illegible scan), show what *could* be extracted plus an explicit "We couldn't reliably read [N] items — please check the original document" rather than fabricating placeholder values.

**Follow-up Chat (quotation-scoped)**
- **Purpose:** let the user interrogate their specific report ("Why did you flag cement?").
- **Components:** same chat UI pattern as the RAG chatbot, but every message is answered using the uploaded quotation's extracted data + analysis findings + the shared reference knowledge base as context — **not** a general-purpose chat that has lost the document context.
- **Scoping:** tied to the specific quotation/analysis; cannot answer questions about a different quotation or unrelated topics without redirecting the user to the general chatbot — **[RECOMMENDATION]** keeps the two AI surfaces' responsibilities clean.
- **Grounding discipline:** answers must cite either a specific extracted line item, a specific finding, or a specific reference source — never a bare unsupported claim.

**Multi-Quote Compare [RECOMMENDATION]**
- **Purpose:** compare 2–3 quotations for the same job, side by side.
- **Components:** side-by-side table reusing the single-quotation extraction+flagging pipeline.

Empty/error states throughout: "Insufficient reference data — unable to assess" must render distinctly (different visual treatment) from "No issue detected."

---

## 6. Extracted vs. Normalised vs. Inferred vs. Missing — Formal Definitions

This distinction is foundational to the whole quotation-verification feature and is a first-class data concept, not just a UI label:

- **Extracted:** a value read directly from the document by OCR/parsing, with no transformation beyond format cleanup (e.g., "500 bags" read verbatim). Stored with a reference back to its location in the source document (page/region) where feasible — **[ASSUMPTION]** exact bounding-box storage is a nice-to-have, not required for MVP; a page number is sufficient.
- **Normalised:** an extracted value transformed into a standard representation for comparison (e.g., "500 bags" → `{quantity: 500, unit: "bag"}` mapped to a canonical unit; "OPC 53 Grade Cement" mapped to a standard material category for reference-price lookup). Normalization is **LLM-assisted** (semantic mapping) but the *result* is a structured, deterministic value used in all downstream calculation — this is the seam between LLM and deterministic logic (§10.3).
- **Inferred:** a value the system believes is likely but that was **not explicitly present** in the document (e.g., inferring a unit was "bags" when the document just said "500 cement" with no unit stated, based on typical convention). **Inferred values must always carry a visible `(inferred)` label wherever displayed and must never be used as if they were extracted fact in a flag's reasoning without disclosing that inference occurred.**
- **Missing — the fourth, distinct state:** the system must **never silently invent** a missing price, quantity, specification, or other commercial fact. If a required field is genuinely absent and cannot be reasonably inferred from context, it is reported as **Missing** — not quietly defaulted to zero, "N/A" treated as a number, or interpolated without disclosure. This is what stops the system from ever silently defaulting an absent price to zero.

---

## 7. Worker / Group Model

A `Worker` may join a `WorkerGroup` led by a `WorkerGroupLeader`. Individual workers accept/reject requirements directly; a group leader can commit N members to a requirement in a single action, and the requirement's `partially_filled`/`filled` status reflects the running total across individual and group acceptances. Double-booking is prevented at the assignment layer (§16). **Known MVP limitation (flagged as an open decision, §26):** per-member assignment *within* a group commitment is not individually tracked — the system records "6 of a group's members committed" but not *which* 6 — and whether a worker can belong to more than one group simultaneously is unresolved.

---

## 8. Quotation Verification — Detailed Requirements

### 8.1 Supported input formats
**[ASSUMPTION, flagged for confirmation]:** PDF (native/text-based), scanned/image-based PDF, JPG/PNG (photographed quotations). Handwritten quotations are **explicitly a degraded-confidence case, not an unsupported one** — the system attempts OCR and clearly downgrades confidence rather than outright rejecting the file, since real contractor quotations in this market are often handwritten or poorly scanned.

### 8.2 Fields to extract (where available)
Item/line-item description, material/service, quantity, unit, unit price, total price, tax, discount, labour charges, transportation/delivery charges, other charges, grand total, contractor/vendor information, date, quotation number, validity period, terms and conditions — each tagged Extracted / Normalised / Inferred / Missing per §6.

---

## 9. Quotation Verification Logic & Output

### 9.1 Reference data sources
- Regional market price references (e.g., state Schedule of Rates publications).
- Construction material reference price lists.
- Labour-rate references, where publicly available.
- Government rate schedules.
- Building codes/construction standards (shared corpus with the RAG chatbot, §10).
- **[ASSUMPTION]** All reference sources are curated/ingested by an admin process, not scraped live per-request, so pricing freshness depends on ingestion cadence — flagged as an open decision (§26).

### 9.2 Issue types the system can flag
Unusual pricing (significantly above/below reference range), missing quantity/unit/specification, incomplete or ambiguous line items, potentially missing charges, calculation inconsistencies, tax inconsistencies, unclear scope, items requiring human verification, and possible material/specification mismatches.

### 9.3 What the product explicitly does NOT claim
The system never asserts a quotation is objectively "correct." It provides analysis, reference comparison, warnings, flags, explanations, a confidence indicator, and source references. **The user makes the final decision.** This framing appears in the UI itself, not just in this document — **[RECOMMENDATION]** the report's header literally states "This is an analysis to help you ask better questions — not a certification that this quotation is fair or unfair."

### 9.4 Deterministic vs. LLM division of labor

| Task | Deterministic | LLM | Retrieval |
|---|---|---|---|
| OCR/raw text extraction | ✔ (OCR engine) | | |
| Structuring raw text into line items | | ✔ (semantic parsing of messy layouts) | |
| Quantity × unit price = line total check | ✔ | | |
| Tax calculation check | ✔ | | |
| Grand total reconciliation | ✔ | | |
| Percentage difference vs. reference price | ✔ | | |
| Threshold-based flagging (e.g., >20% above reference) | ✔ | | |
| Missing-field detection | ✔ | | |
| Mapping a messy material description to a standard reference category | | ✔ | |
| Normalising unit terminology ("bag" vs "bags" vs "50kg bag") | | ✔ (deterministic canonical-unit lookup as ground truth) | |
| Retrieving the relevant reference price for a normalised category + region | | | ✔ |
| Explaining why something was flagged, in plain language | | ✔ | ✔ (grounds the explanation) |
| Summarising the overall report | | ✔ | |
| Follow-up conversational Q&A | | ✔ | ✔ |

**Hard rule:** the LLM is never the sole authority for a numerical calculation or a threshold decision. Every flag that claims "price is X% above reference" is computed in code first; the LLM only explains a flag that deterministic logic already raised — it never decides independently whether something is flagged.

### 9.5 Output structure
Overall summary → Extracted quotation table (Item/Description/Quantity/Unit/Quoted Price/Reference Range/Difference/Status) → Flags (each with a plain-language explanation) → Sources → Confidence. **"No issue detected" and "Insufficient information to assess" are distinct, separately-labeled outcomes** — the former means reference data existed and the item fell within range; the latter means no reliable reference data existed to compare against at all. Conflating these would be actively misleading, so this distinction is enforced as a required field (`VerificationFinding.outcome`, §11) rather than left to UI copy discipline alone.

---

## 10. AI Architecture — Two Pipelines

### 10.1 RAG Chatbot pipeline
`Knowledge base (RAGDocument/RAGChunk) → ingestion & chunking → embedding generation → vector DB storage → user question → query embedding → vector retrieval (top-k, [ASSUMPTION] k=5) → optional reranking [RECOMMENDATION] → context assembly with source labels → LLM generation, grounded-only → answer + ChatCitation records → rendered with source chips.`

Knowledge base is admin-curated ingestion of building codes/bye-laws, regional pricing references, and general construction FAQs — **[ASSUMPTION]** no self-serve public upload into this shared corpus (that would risk poisoning the knowledge base other users rely on).

### 10.2 Quotation Verification pipeline
`Upload → file validation (type/size/malware scan) → OCR/document parsing → LLM-assisted structured extraction → normalisation (LLM-assisted mapping into deterministic canonical fields) → deterministic validation & arithmetic (§9.4) → reference-data retrieval (same underlying vector/structured store as 10.1, filtered to pricing/standards categories) → deterministic threshold comparison → LLM-generated explanation of already-determined flags → structured VerificationFinding records → user-facing report (§5.6) → follow-up chat reusing the same extracted context + retrieval mechanism.`

**Shared infrastructure, deliberately:** both pipelines use the same underlying vector store and retrieval mechanism, the same LLM provider/access pattern, and the same citation-rendering UI pattern — a genuine architectural synergy: one retrieval/citation service both features consume, not two parallel implementations.

### 10.3 Explicit step classification
- **Deterministic:** file validation, malware scanning, OCR invocation (the engine itself is deterministic even though its *input* is messy), arithmetic/threshold checks, missing-field detection, rate-limiting, session management, citation formatting.
- **Retrieval-based:** vector similarity search against the shared knowledge base/reference-price store; structured lookup where reference data is tabular (e.g., a Schedule-of-Rates table) rather than embedded prose — **[RECOMMENDATION]** don't force every reference source through embeddings if it's naturally tabular; a direct structured query is more reliable for exact price lookups than semantic search.
- **LLM-based:** structured extraction from messy OCR text, terminology normalization, explanation generation, summarization, conversational follow-up.

### 10.4 AI Safety / Quality controls
- **Source grounding:** every chatbot answer must trace to at least one citation, or explicitly state it cannot answer. If retrieval returns nothing above a relevance threshold, the system returns "I don't have a grounded source for that" rather than an ungrounded LLM answer — **hallucination control, non-negotiable.**
- **Confidence is not decorative:** `confidence_level`/`overallConfidence` (High/Medium/Low/InsufficientData) is a required field that gates what claims the UI is allowed to render.
- **Prompt-injection defense:** uploaded documents and retrieved chunks are treated as data, never as instructions; system prompts explicitly instruct the model to ignore any embedded imperative text found inside a document.
- **Malicious document handling:** file-type allowlist, virus/malware scan on upload, size caps, sandboxed OCR processing.
- **Numerical validation:** any number the LLM proposes for a calculation is re-verified deterministically before display; mismatches are flagged, not silently corrected.
- **Conflicting reference sources:** if two `ReferenceSource` entries disagree materially, both are shown with their source and the conflict is noted in the finding's explanation, rather than silently averaged or one being silently picked.
- **Outdated references:** `ReferencePrice.effectiveDate` beyond a configurable staleness window (**[ASSUMPTION]**: 12 months) triggers a "reference may be outdated" notice; explanation text is instructed to note staleness more assertively for volatile categories (material prices) than for stable ones (structural standards).

---

## 11. Core Data Model

Fields marked `*`/`(PK)` are required. Timestamps (`createdAt`, `updatedAt`) and soft-delete (`deletedAt`) are implicit on every entity unless noted; omitted below for brevity.

### 11.1 Identity & company
- **User**: `id (PK)` · `role* [company_admin|site_manager|worker|group_leader|vendor|driver]` · `name*` · `phone*` · `email` · `passwordHash` (nullable for driver link-auth) · `status [active|suspended]`
- **Company**: `id (PK)` · `name*` · `ownerUserId* (FK→User)` · `verificationStatus`
- **Project**: `id (PK)` · `companyId* (FK→Company)` · `name*` · `status [active|archived]` · `createdBy (FK→User)`
- **Site**: `id (PK)` · `projectId* (FK→Project)` · `address*` · `geoLat` · `geoLng` *(internal use only — never rendered as a live map, §2.3)*
- **SiteManagerAssignment**: `id (PK)` · `projectId* (FK)` · `userId* (FK)` · `assignedAt`

### 11.2 Master Plans (storage-only)
- **MasterPlan**: `id (PK)` · `projectId* (FK)` · `currentVersionId (FK→MasterPlanVersion)` · `status [active|archived]`
- **MasterPlanVersion**: `id (PK)` · `masterPlanId* (FK)` · `versionNumber*` · `fileUrl*` · `fileType*` · `fileSizeBytes*` · `uploadedBy* (FK→User)` · `uploadedAt*` · `note` · `aiProcessingStatus [not_started|queued|complete]` — **[ASSUMPTION]** nullable, reserved-but-unused extension point (§12) so future AI processing can attach without a schema migration.

### 11.3 Material requests & vendor flow
- **MaterialRequest**: `id (PK)` · `projectId* (FK)` · `siteManagerId* (FK→User)` · `material*` · `quantity*` · `unit*` · `requiredByDate*` · `priority [low|medium|high]` · `remarks` · `attachmentUrl` · `status [draft|submitted|under_review|approved|rejected|fulfilled|closed]`
- **Vendor**: `id (PK)` · `userId* (FK)` · `businessName*` · `contactPerson` · `phone*` · `email` · `address` · `serviceArea` · `verificationDocuments`
- **VendorMaterialCategory**: `id (PK)` · `vendorId* (FK)` · `category*` · `catalogueItem*` · `unitPrice` · `estDeliveryTime`
- **RFP**: `id (PK)` · `materialRequestId* (FK)` · `status [open|closed]`
- **RFPItem**: `id (PK)` · `rfpId* (FK)` · `item*` · `quantity*` · `unit*`
- **Quote**: `id (PK)` · `rfpId* (FK)` · `vendorId* (FK)` · `expectedDeliveryDate` · `validityDate` · `paymentTerms` · `termsAndConditions` · `documentUrl` · `status [submitted|shortlisted|accepted|rejected|withdrawn]`
- **QuoteItem**: `id (PK)` · `quoteId* (FK)` · `item*` · `quantity*` · `unit*` · `unitPrice*` · `total*` · `tax` · `deliveryCharge`

### 11.4 Worker marketplace
- **WorkerProfile**: `id (PK)` · `userId* (FK)` · `skills[]` · `tradeTags[]` · `photoUrl` · `availabilityJson`
- **WorkerGroup**: `id (PK)` · `leaderUserId* (FK→User)`
- **WorkerGroupMember**: `id (PK)` · `groupId* (FK)` · `workerUserId* (FK)` · `status [active|inactive]`
- **WorkerRequirement**: `id (PK)` · `projectId* (FK)` · `siteManagerId* (FK→User)` · `workType*` · `trade*` · `headcount*` · `date*` · `duration` · `workingHours` · `location*` · `pay*` · `payBasis [per_day|per_job]` · `description` · `requiredSkills[]` · `deadline` · `urgentFlag: boolean` **[RECOMMENDATION]** · `status [open|partially_filled|filled|closed]`
- **WorkerResponse**: `id (PK)` · `requirementId* (FK)` · `workerUserId* (FK)` · `type [individual|group]` · `groupId (FK, nullable)` · `committedCount (nullable, for group)` · `status [accepted|rejected|pending]`
- **WorkAssignment**: `id (PK)` · `requirementId* (FK)` · `workerUserId (FK, nullable if group)` · `groupId (FK, nullable)` · `status [assigned|in_progress|completed|no_show|cancelled]` · `paymentStatus [pending|paid]` **[RECOMMENDATION]**
- **AttendanceRecord [RECOMMENDATION]**: `id (PK)` · `assignmentId* (FK)` · `date*` · `checkInTime` · `checkOutTime` · `markedBy (FK→User)`
- **Rating [RECOMMENDATION]**: `id (PK)` · `assignmentId* (FK)` · `ratedBy (FK→User)` · `ratedUserOrGroupId*` · `score [1-5]*` · `comment`

### 11.5 Delivery / driver
- **Delivery**: `id (PK)` · `quoteId* (FK)` · `projectId* (FK)` · `material*` · `quantity*` · `expectedDate*` · `expectedTime` · `truckId (FK)` · `driverId (FK)` · `status [scheduled|in_transit|delivered|delayed]`
- **Truck**: `id (PK)` · `vendorId* (FK)` · `registrationNumber*` · `type` · `capacity`
- **Driver**: `id (PK)` · `vendorId* (FK)` · `name*` · `contact*`
- **DriverDeliveryAssignment**: `id (PK)` · `deliveryId* (FK)` · `driverId* (FK)` · `secureLinkTokenHash*` · `linkExpiresAt*`
- **LocationUpdate**: `id (PK)` · `deliveryId* (FK)` · `driverId* (FK)` · `lat*` · `lng*` · `capturedAt*` *(used only to compute an approximate ETA — never rendered as a live map, §2.3)*

### 11.6 Public AI

- **AnonymousSession**: `id (PK)` · `sessionToken: string (hashed), unique, indexed` · `createdAt` · `lastActiveAt` · `expiresAt` — **[ASSUMPTION]** 24-hour rolling expiry. One session may have zero-or-more `ChatSession`s and zero-or-more `UploadedQuotation`s.
- **UploadedQuotation**: `id (PK)` · `anonymousSessionId* (FK, indexed)` · `originalFilename` · `fileUrl` (private object storage key) · `fileType` · `fileSizeBytes` · `uploadedAt*` · `status [Uploaded|Processing|Ready|Failed] (indexed)` · `deletedAt` (soft delete, user- or retention-triggered)
- **QuotationDocument**: `id (PK)` · `uploadedQuotationId* (FK, unique)` · `rawOcrText` · `pageCount` · `ocrConfidence: float` — separated from `UploadedQuotation` so the raw file record and the OCR output have independent lifecycles (e.g., re-running OCR with an improved engine later without re-uploading).
- **QuotationLineItem**: `id (PK)` · `quotationDocumentId* (FK, indexed)` · `lineNumber` · `descriptionExtracted` · `materialNormalised` · `quantityExtracted: string` (kept as string at extraction, since raw OCR may be ambiguous) · `quantityNormalised: decimal` · `unitExtracted` · `unitNormalised` · `unitPriceExtracted: decimal` · `totalPriceExtracted: decimal` · `fieldSource: JSON` — a **per-field map** of Extracted/Normalised/Inferred/Missing (§6), not a single document-level boolean; this is what makes the UI's per-cell "(inferred)" tagging actually implementable.
- **QuotationAnalysis**: `id (PK)` · `uploadedQuotationId* (FK, unique)` · `overallSummary` · `status [Pending|Completed|Failed] (indexed)` · `startedAt` · `completedAt` · `overallConfidence [High|Medium|Low|InsufficientData]`
- **VerificationFinding**: `id (PK)` · `analysisId* (FK, indexed)` · `lineItemId (FK, nullable — nullable for document-level findings like "grand total doesn't reconcile")` · `findingType [PriceUnusual|MissingQuantity|MissingUnit|MissingSpecification|IncompleteLineItem|AmbiguousDescription|MissingCharge|CalculationMismatch|TaxInconsistency|UnclearScope|RequiresManualVerification|MaterialSpecMismatch]` · `outcome: [Flagged|NoIssueDetected|InsufficientData]*` — a **required, hard enum** (§9.5), never inferred from the absence of a flag · `explanation: text` (LLM-generated, grounded) · `referenceSourceId (FK, nullable)` · `confidence [High|Medium|Low]`
- **ReferenceSource**: `id (PK)` · `title*` · `sourceType [GovernmentSchedule|MaterialPriceList|LabourRate|BuildingCode|Standard|Other]` · `region` · `publishedDate` · `sourceUrl` · `ingestedAt*` · `status [Active|Superseded]`
- **ReferencePrice**: `id (PK)` · `referenceSourceId* (FK, indexed)` · `materialCategory* (indexed)` · `unit*` · `priceLow` · `priceHigh` · `region` · `effectiveDate*` — a structured table, deliberately **not** embedded-only, to keep exact pricing lookups deterministic/structured rather than purely semantic.
- **RAGDocument**: `id (PK)` · `title*` · `sourceType*` · `url` · `ingestedAt*` — prose-form knowledge (codes, standards, FAQs); `ReferenceSource`/`ReferencePrice` handle the pricing-specific structured case. Both queried by the shared retrieval service (§10.2).
- **RAGChunk**: `id (PK)` · `documentId* (FK)` · `chunkText*` · `embeddingVector*` · `chunkIndex*`
- **ChatSession**: `id (PK)` · `anonymousSessionId (FK, nullable)` · `userId (FK, nullable)` · `scope [General|QuotationFollowUp]` · `uploadedQuotationId (FK, nullable — set only when scope=QuotationFollowUp)` · `createdAt` · `expiresAt`
- **ChatMessage**: `id (PK)` · `chatSessionId* (FK, indexed)` · `role [User|Assistant]` · `content*` · `createdAt*`
- **ChatCitation**: `id (PK)` · `chatMessageId* (FK, indexed)` · `citationType [RAGDocument|ReferenceSource|QuotationLineItem|VerificationFinding]` · `citedEntityId*` — a **polymorphic** citation record, so a follow-up-chat answer can cite either general knowledge *or* the user's own quotation data, both represented uniformly for the UI's citation rendering.

**Relationship notes:** `QuotationLineItem.fieldSource` is the mechanism that makes §6's Extracted/Normalised/Inferred/Missing distinction enforceable in the database, not just a UI convention. `VerificationFinding.outcome` being a required enum is what prevents "no flag raised" from being silently conflated with "insufficient data to check."

### 11.7 Cross-cutting
- **Notification**: `id (PK)` · `userId* (FK)` · `type*` · `payloadJson*` · `readAt`
- **AuditLog**: `id (PK)` · `actorUserId (FK, nullable for system)` · `entityType*` · `entityId*` · `action*` · `beforeJson` · `afterJson` · `createdAt*`

---

## 12. Master Plan Storage Architecture

Pre-signed upload flow → MIME/size validation → malware scan → secure object storage (encrypted at rest) → `MasterPlanVersion` metadata row created (never overwritten — always a new version, full history retained) → permission check on view/download (project members + company admin only, RBAC-gated) → signed, time-limited download URLs → audit log entry on upload/view/download/delete → retention/backup per company policy → **no parsing, no text extraction, no AI touches this pipeline in MVP.** The reserved `aiProcessingStatus` column (§11.2) is the only forward-looking hook; it does nothing today.

---

## 13. System Architecture / Recommended Technology Stack

**[ASSUMPTION/RECOMMENDATION-level throughout — not mandates]**

| Layer | Recommendation | Why |
|---|---|---|
| Frontend | React (Next.js) | Mature ecosystem, strong mobile responsiveness, matches the multi-portal structure. Public AI routes are built to work with zero authentication state, served as fast, lightweight, largely static-shell pages so first-load performance stays good for an anonymous visitor who hasn't committed to the product yet. |
| Backend | Node.js (NestJS) or Python (FastAPI) — modular monolith | Either fits a role-based REST API well; pick based on team familiarity. Quotation processing (OCR → extraction → analysis) is inherently asynchronous and potentially slow, so it runs as a **background job**, not inline in the HTTP request/response cycle, with the frontend polling for status. |
| Database | PostgreSQL + `pgvector` | Relational integrity for the heavily-relational data model in §11; hosts both the general RAG corpus and the quotation-verification reference data in one instance, consistent with §10.2's shared-infrastructure design. A dedicated vector store (e.g., Pinecone/Weaviate) is a fallback if the RAG corpus grows large enough to need one. |
| Object storage | S3-compatible, encrypted at rest | Master Plans, quotation documents, images. Uploaded quotations get their **own private, short-retention bucket/prefix**, logically separated from the long-retained Master Plan bucket, since their retention and access-control policies are meaningfully different (anonymous, short-lived, user-deletable vs. authenticated, company-owned, long-lived). |
| Auth | JWT-based auth for authenticated roles + single-use, time-limited secure link tokens for Driver | Public User is deliberately not an authentication case at all — `AnonymousSession` is a lightweight, non-identity-bearing session token, not a lightweight account. |
| Background jobs/queues | BullMQ (Redis-backed) or a managed equivalent | Runs the OCR → extraction → normalization → analysis pipeline asynchronously per uploaded quotation, with retry/backoff on transient OCR/LLM-provider failures and a dead-letter path that surfaces as the "Failed" status. |
| LLM | Claude (Anthropic) via API | Strong instruction-following for grounded, hybrid deterministic+LLM workflows. Same provider across both AI features for prompting consistency and a single data-handling agreement to vet (§18.5) — **pending stakeholder confirmation**. |
| OCR/document processing | A managed document-AI API for MVP, with a swap-in path to a self-hosted engine (Tesseract/PaddleOCR) if cost/data-residency later demands it | Managed services handle messy real-world scans (skew, poor lighting, handwriting) far better out of the box, which matters given §8.1's handwritten-quotation case. |
| Notifications | Email provider + in-app for authenticated roles; SMS/IVR reserved for Future | Public/anonymous users receive no persistent notifications in MVP — all feedback happens within the live session. |
| Hosting | Any major cloud provider, containerized | No unusual infra requirements for MVP. |
| Monitoring | Standard APM (hosted error-tracking + tracing) | Especially for tracing the AI pipelines' retrieval/confidence metrics. |
| CI/CD | Standard git-based pipeline | No special requirements. |

Do not over-engineer: a single Postgres instance, a single API service, and a single frontend app are sufficient for MVP — resist microservice-splitting before there's a scaling reason to.

---

## 14. API Design (Representative Endpoints)

### 14.1 Company-side
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | none | Role-aware login |
| POST | `/companies/{id}/projects` | Company Admin | Create project |
| POST | `/projects/{id}/master-plans` | Company Admin | Multipart/pre-signed upload; creates `MasterPlan` + v1 `MasterPlanVersion` |
| POST | `/master-plans/{id}/versions` | Company Admin | New version upload |
| GET | `/master-plans/{id}` | Project members | Metadata + version list |
| POST | `/projects/{id}/worker-requirements` | Site Manager | |
| POST | `/worker-requirements/{id}/responses` | Worker/Group Leader | `type: individual\|group`, `committedCount` if group |
| POST | `/projects/{id}/material-requests` | Site Manager | |
| PATCH | `/material-requests/{id}/status` | Company Admin | Approve/reject transition |
| POST | `/material-requests/{id}/rfp` | Company Admin | Opens RFP to matching vendors |
| POST | `/rfps/{id}/quotes` | Vendor | Line items nested |
| GET | `/rfps/{id}/quotes/compare` | Company Admin | Side-by-side comparison |
| POST | `/deliveries/{id}/location-updates` | Driver (link-token auth) | Rate-limited to configured interval |
| GET | `/deliveries/{id}/eta` | Site Manager | Returns estimate + "as of [timestamp]" label |

### 14.2 Public AI
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/public/sessions` | none | Creates an `AnonymousSession`. Returns `{sessionToken, expiresAt}`. Rate-limited per IP against session-farming abuse. |
| POST | `/public/chat/sessions` | valid session token | Creates a `ChatSession` with `scope=General`. |
| POST | `/public/chat/sessions/:id/messages` | valid session token | Send a message, get a grounded RAG answer with citations. Rate-limited per session and per IP. |
| POST | `/public/quotations/upload-url` | valid session token | Requests a pre-signed upload URL. Returns `{uploadUrl, objectKey, expiresAt}`. |
| POST | `/public/quotations` | valid session token | Finalizes upload, creates `UploadedQuotation` (status `Uploaded`), enqueues the processing job. |
| GET | `/public/quotations/:id/status` | session-token scoped | Poll processing status; a foreign token gets a 404, not a 403 (§5.6). |
| GET | `/public/quotations/:id/analysis` | session-token scoped | Retrieves the completed analysis + findings + line items for the report UI. |
| POST | `/public/quotations/:id/chat` | session-token scoped | Creates/continues a `ChatSession` with `scope=QuotationFollowUp`. |
| DELETE | `/public/quotations/:id` | session-token scoped | User-initiated deletion (§18.4); soft-deletes and triggers async purge. |

All endpoints: standard rate limiting, RBAC/session-token enforcement, structured error responses (`code`, `message`, `field` where applicable). All `/public/*` endpoints are rate-limited independently of any user identity (since there isn't one) — per-session-token and per-IP, both enforced.

---

## 15. End-to-End Workflows

**Workflow 1 — Master Plan (no AI):** Company Admin creates project → uploads Master Plan → server validates & scans → stores securely → metadata saved → authorized users view/download → new versions uploadable, full history retained.

**Workflow 2 — Worker Requirement:** Site Manager creates requirement → publishes → workers discover via feed → individual accepts/rejects, or group leader accepts for N members → Site Manager sees confirmed count vs. required → requirement auto-transitions to filled/partially_filled → closed on completion.

**Workflow 3 — Material Request:** Site Manager creates request → submits → Company Admin reviews → approves/rejects → approved requests open an RFP → vendors quote → delivery scheduled on acceptance.

**Workflow 4 — Vendor Quotation:** Vendor views RFP → submits quote → Company Admin compares (optionally via the reused verification-flagging view **[RECOMMENDATION]**) → selects/rejects → delivery initiated on acceptance.

**Workflow 5 — Driver:** Vendor creates delivery → assigns truck/driver → driver receives secure link → opens, grants location permission → periodic updates sent per configured interval → Site Manager sees latest update + approximate ETA → driver marks delivered → sharing stops automatically. No live map at any point.

**Workflow 6 — Public RAG:** User opens site, no login → `AnonymousSession` created implicitly on first interaction → asks question → retrieval → LLM answer with citations → can ask follow-ups in the same chat session.

**Workflow 7 — Quotation Verification:** Public User opens the site, no login → `AnonymousSession` created implicitly → uploads a quotation document → server validates file type/size, malware-scans it → job queued → OCR extracts raw text → LLM performs structured extraction into `QuotationLineItem` records, each field tagged Extracted/Normalised/Inferred/Missing → normalization maps descriptions/units into canonical categories (LLM-assisted, deterministic-canonical-target) → deterministic engine runs arithmetic/threshold checks against `ReferencePrice` data retrieved for each normalized category+region → each check produces a `VerificationFinding` with a required `outcome` (Flagged/NoIssueDetected/InsufficientData) → LLM generates a plain-language explanation for each finding and an overall summary, strictly grounded in the already-computed findings and retrieved sources → `QuotationAnalysis` marked Completed → user sees the full report → user may ask follow-up questions, answered using the extracted quotation + findings + shared reference retrieval as grounding → user may delete their upload at any time, or it auto-expires per the retention policy (§18.3).

---

## 16. State Machines

- **MaterialRequest**: `draft → submitted → under_review → (approved | rejected) → fulfilled → closed`. Actor for `submitted`: Site Manager. Actor for `approved/rejected`: Company Admin. Notification fires on every transition; audit log on every transition.
- **WorkerRequirement**: `open → partially_filled → filled → closed`. Driven by `WorkerResponse` acceptances; `closed` can also be manually set by Site Manager (e.g., requirement withdrawn).
- **WorkAssignment**: `assigned → in_progress → completed`, with `no_show` and `cancelled` as terminal alternates. `in_progress`/`completed` optionally driven by `AttendanceRecord` check-in/out if that recommendation is adopted.
- **Quote**: `submitted → shortlisted → (accepted | rejected)`, or `withdrawn` (a distinct terminal state, not deletion — audit trail preserved).
- **Delivery**: `scheduled → in_transit → (delivered | delayed)`.
- **UploadedQuotation**: `Uploaded → Processing → Ready` / `Uploaded → Processing → Failed` (Failed is terminal but re-uploadable as a fresh record; **[ASSUMPTION]** no automatic retry beyond the job queue's own transient-failure retries) · `Ready/Failed → Deleted` (user-triggered or retention-triggered, soft-delete then async hard purge).
- **QuotationAnalysis**: `Pending → Completed` / `Pending → Failed`. No further transitions — a completed analysis is immutable; a user wanting a fresh look must re-upload — **[RECOMMENDATION]** keeps the report's integrity simple; no in-place "re-analyze" that could silently change a report the user has already read and possibly discussed via follow-up chat.
- **VerificationFinding**: created directly in its final `outcome` state (Flagged/NoIssueDetected/InsufficientData) as part of `QuotationAnalysis` completion — not individually mutable after creation, consistent with the analysis-immutability rule above.

---

## 17. Notifications

MVP channels: in-app + email for authenticated roles. SMS/IVR explicitly Future **[RECOMMENDATION to pull forward — see open decision §26]**. Public/anonymous users receive **no notification-system entries** in MVP — all AI-feature feedback is synchronous/in-session.

| Role | Notified on |
|---|---|
| Company Admin | New material request submitted; new vendor quote received; delivery status change |
| Site Manager | Worker response received; requirement fully filled; material request status change; delivery update; driver location update/staleness |
| Worker | New matching opportunity; their acceptance confirmed/rejected; assignment changes |
| Vendor | New RFP matching their category; quote status change; delivery updates |
| Driver | Delivery assignment; location-sharing status reminders; delivery changes |

---

## 18. Security & Privacy

RBAC enforced at the API layer on every endpoint, not just UI-level hiding. File upload security across the board: type allowlist, size caps, malware scanning, encrypted object storage.

### 18.1 Anonymous session handling
Session tokens are opaque, unguessable, and **stored hashed server-side** (never store the raw token as a lookup key). Tokens are **[ASSUMPTION]** delivered via an HttpOnly cookie where possible (reduces XSS exposure vs. local storage), with local storage as a fallback.

### 18.2 Secure upload & encryption
Uploads go through the same pre-signed-URL, malware-scanned pipeline as Master Plans (§12), into a **separate, private object-storage prefix/bucket** with its own lifecycle policy. Encryption at rest and in transit.

### 18.3 Temporary storage & retention
**[ASSUMPTION, flagged for legal/compliance confirmation]** Uploaded quotations and their derived data (OCR text, line items, analysis, chat history) are retained for **30 days** from upload, then automatically hard-deleted, unless the user deletes them sooner. This balances the follow-up-chat feature's need for data to persist across a browsing session against the sensitivity of the content.

### 18.4 User-initiated deletion
A user can delete their uploaded quotation and its derived analysis/chat at any time. Deletion is immediate from the user's perspective (soft-delete removes it from all UI/API access instantly) with async hard purge of the underlying file within **[ASSUMPTION] 24 hours**.

### 18.5 Model training
**[ASSUMPTION, flagged as a required legal/product decision, not a technical default]** — uploaded quotations are **not** used to train or fine-tune any model, and the LLM API provider used is contractually bound not to retain/train on this data (a standard enterprise-API-tier guarantee from major providers). Must be explicitly confirmed with whichever LLM provider is selected and stated plainly in the product's public-facing privacy notice — this is a trust-critical claim, not an internal implementation detail.

### 18.6 Access controls
An uploaded quotation and its analysis are accessible **only** via the exact `AnonymousSession` token that created them. No admin UI exposes a cross-session view of quotation content in MVP.

### 18.7 Secure processing
The OCR/extraction/LLM pipeline processes the document server-side only; the raw file is never passed to a third-party service without going through the platform's own backend as an intermediary — the platform retains a single, auditable point of control over where sensitive content travels.

### 18.8 Abuse prevention
Rate limits per session token and per IP on both upload frequency and chat-message frequency; file-size/type limits double as basic defense against resource-exhaustion abuse; malware scanning protects the processing pipeline itself, not just downstream users. CAPTCHA on upload if abuse is detected.

### 18.9 Cross-user exposure — the explicit non-negotiable
**The system must never expose one user's uploaded quotation to another user**, under any UI path, API response, or shared-cache mechanism. This is a security invariant to be explicitly covered in test cases (§25), not just a design intention.

### 18.10 Company-side & driver-specific privacy
- **Master Plan confidentiality:** project-scoped access only, audit-logged on every view/download.
- **Driver location data:** retained only as long as needed for delivery ETA + a short audit window (**[ASSUMPTION]**: 7 days post-delivery), then purged.
- **Worker/vendor PII:** standard access controls; individual worker ratings visible only per §26's open decision.

---

## 19. Non-Functional Requirements (recommendations, not hard SLAs)

- **Performance:** chatbot first-token latency target <3s **[RECOMMENDATION]**; quotation-processing latency **[ASSUMPTION]** p95 end-to-end (upload → completed report) under 60 seconds for a typical 1–3 page quotation — documents exceeding this trigger the "still processing" reassurance state rather than appearing broken.
- **Scalability:** stateless API layer, horizontally scalable; vector DB and object storage independently scalable.
- **Availability:** target 99.5% for MVP **[RECOMMENDATION]**.
- **Mobile responsiveness & low-bandwidth usability:** Worker and Driver portals must function on 3G-equivalent connections with graceful degradation (compressed images, offline-tolerant form queueing).
- **Accessibility:** minimum WCAG AA-equivalent contrast/tap-target sizing on Worker-facing screens.
- **AI cost containment [RECOMMENDATION]:** track per-session LLM/OCR cost as an operational metric from day one, given anonymous, unauthenticated usage has no natural cost ceiling the way a paid account would — this directly informs rate-limiting thresholds (§18.8).
- **Monitoring/logging:** structured logs, error tracking, AI-pipeline-specific tracing (retrieval hit rate, extraction confidence distribution).

---

## 20. Analytics (MVP — do not overbuild)

**Company-side:** projects created, Master Plan uploads/versions, requirements posted, material requests by status, quotes received/accepted, deliveries completed.
**Worker-side:** jobs viewed, acceptance rate, jobs completed, group participation rate.
**Vendor-side:** RFPs received, quotes submitted, quotes accepted, on-time delivery rate.

**Public AI:**

| Metric | Notes |
|---|---|
| Chat sessions started (General vs. QuotationFollowUp) | Split by scope — functionally distinct usage patterns |
| Questions asked per session | Engagement depth indicator |
| Quotation uploads (started vs. completed) | Surfaces upload/processing drop-off |
| Successful extraction rate | % of uploads reaching Ready vs. Failed — core quality signal for the OCR/extraction pipeline |
| Analysis completion rate | Distinct from extraction rate — tracks whether a completed extraction reliably produces a full analysis |
| Most common finding types | Which `findingType` values recur most — informs both product iteration and reference-data coverage gaps |
| RAG unanswered/low-confidence question rate | Surfaces knowledge-base coverage gaps |
| Retrieval quality **[RECOMMENDATION]** | e.g., a lightweight thumbs-up/down on individual chat answers — kept intentionally minimal |

---

## 21. Edge Cases

**Master Plan:** corrupt/unsupported/oversized file → validation error before storage attempt; duplicate filename → versioned, not overwritten.

**Workers:** double booking → system blocks a second acceptance for an overlapping date/requirement; group leader commits more members than actually available → validation error at submission.

**Vendors:** quote submitted after RFP deadline → flagged "late" but still viewable; quote withdrawn → status set to a distinct `withdrawn` state, not deleted (audit trail).

**Driver:** location permission denied → delivery still proceeds, Site Manager sees "no location sharing" instead of stale/fake ETA; update older than 2× the configured interval → UI marks it "stale," ETA hidden or caveated.

**Quotation verification:** Poor scan → OCR proceeds with a lower recorded `ocrConfidence`, and extraction uncertainty propagates into per-field Inferred/Missing tagging rather than false confidence. Handwritten quotation → degraded-confidence input, not rejected outright; if OCR confidence falls below a threshold **[ASSUMPTION]**, the report leads with a prominent caveat rather than burying it. Missing price/quantity/unit → tagged `Missing`, never defaulted. Ambiguous material description → LLM attempts normalization; if confidence is low, `materialNormalised` is left null and a `RequiresManualVerification` finding is raised rather than guessing a category. Multiple currencies → **[ASSUMPTION]** MVP assumes single-currency (INR) documents; a detected foreign-currency symbol triggers `RequiresManualVerification` rather than an attempted conversion. Tax ambiguity (inclusive/exclusive unclear) → flagged explicitly rather than assumed either way. Calculation mismatch (line items don't sum to the stated grand total) → deterministic check, always caught, always flagged with the exact discrepancy shown. No reference price available for a category → `InsufficientData`, explicitly distinct from `NoIssueDetected`. Conflicting reference sources → present the range spanning both rather than silently picking one, and flag the conflict in the explanation. Outdated reference data → every cited source carries its published date; staleness noted more assertively for volatile categories. Unsupported/unusual item (no reasonable reference category match) → `InsufficientData`, with an honest explanation rather than a forced, poor-fit categorization. Extremely large quotation (many pages/line items) → processed but may exceed the latency target; UI communicates this rather than timing out silently. Malicious uploaded document (embedded exploit, not just wrong file type) → malware scan blocks it before it reaches OCR/LLM processing. Follow-up question unrelated to the quotation → explicitly declines to speculate and redirects to the general RAG chatbot for genuinely out-of-scope questions.

**RAG (general):** no relevant source found → explicit "no grounded source" response; suspected prompt injection inside a retrieved document or uploaded file → system prompt instructs the model to treat it as inert data, never as an instruction; outdated source, unsupported question, excessive usage → same handling pattern as the quotation-verification equivalents, since both features share the retrieval/grounding infrastructure.

---

## 22. MVP / V1 / Future Scope

### MVP (confirmed scope)
**Company:** auth · project management · Master Plan upload/version/view/download (no AI).
**Site Manager:** worker requirements · material requests.
**Workers:** individual accept/reject · worker groups · group-leader partial acceptance.
**Vendors:** registration/listing · RFP viewing · quote submission · company-side quote comparison.
**Delivery:** truck/driver info · periodic driver location · approximate ETA (no map).
**Public AI (not optional — §2.2):** no-login RAG chatbot with citations · no-login quotation upload · extraction (OCR + structured line items) · line-item analysis (deterministic checks) · reference-price/data comparison · AI-generated verification explanation · source citations (both features) · confidence labeling · follow-up chat.

**[RECOMMENDATION] additions folded into MVP scope**, flagged individually so each can be dropped without touching the mandatory list above: worker/group rating after assignment completion; attendance check-in/out; payment-status flag on assignments/quotes; multi-quotation compare on the public side; internal reuse of the verification engine for vendor quotes; project activity feed; urgent-flag on worker requirements.

### V1
PDF export of a verification report · reranking step in retrieval, if MVP precision proves insufficient · thumbs-up/down feedback on chat answers · WhatsApp/SMS notification channel for authenticated roles · per-member assignment tracking within group commitments · broader reference-data coverage (more regions/material categories).

### Future (explicitly out of MVP and V1)
LLM-based Master Plan understanding · automatic BOQ extraction · AI-generated RFPs from Master Plans · AI procurement/vendor recommendations · live GPS maps · fleet management · route optimization · advanced construction/schedule planning automation.

---

## 23. Acceptance Criteria (Given/When/Then — representative; full set follows the same pattern for every item in §22)

**Master Plan upload**
- Given a Company Admin on a project page, when they upload a valid PDF under the size limit, then a new `MasterPlan` and v1 `MasterPlanVersion` are created and visible in the project's Master Plans list.
- Given an existing Master Plan, when the Admin uploads a replacement file, then a new version is created and the previous version remains accessible in history — never overwritten.

**Group acceptance**
- Given an open Worker Requirement needing 10 workers, when a Group Leader accepts for 6 committed members, then the requirement status becomes `partially_filled` and shows "6 of 10 filled."
- Given a Group Leader attempts to commit more members than are marked available, then the system rejects the submission with a clear validation error.

**RAG chatbot**
- Given a Public User asks a question covered by the knowledge base, when they submit it, then the system retrieves relevant chunks, generates a grounded answer, and displays it with source citations and dates where available; if no sufficiently relevant chunk exists, the system explicitly states it lacks reliable information rather than generating an unsupported answer.

**Quotation upload**
- Given a Public User selects a supported file under the size limit, when they upload it, then the system creates an `UploadedQuotation` in `Uploaded` status, scoped to their `AnonymousSession`, triggers a malware scan, and enqueues processing — the record never becoming accessible to any other session.

**Quotation extraction**
- Given an uploaded quotation passes validation and scanning, when the processing job runs, then the system produces `QuotationLineItem` records with every field tagged as Extracted, Normalised, Inferred, or Missing, and never populates a field with an invented value that isn't labeled as Inferred.

**Quotation verification — insufficient data**
- Given extracted line items and available reference price data for their normalized categories, when the deterministic validation engine runs, then it produces a `VerificationFinding` for each check with an explicit `outcome` of Flagged, NoIssueDetected, or InsufficientData — and InsufficientData is used whenever no reliable reference data exists, never silently defaulting to NoIssueDetected.

**Follow-up quotation chat**
- Given a completed `QuotationAnalysis` exists for the caller's session, when the user asks a follow-up question, then the system answers using only the quotation's extracted data, its findings, and the shared reference/knowledge retrieval as grounding, and cites at least one specific line item, finding, or source per substantive answer.

**Cross-session privacy**
- Given two distinct anonymous sessions each have an uploaded quotation, when one session's token is used to request the other session's analysis, then the system returns a not-found response and never returns any data belonging to the other session.

**Driver ETA staleness**
- Given the configured update interval is 30 minutes and no update has arrived in 65+ minutes, when the Site Manager views the delivery, then the ETA is visually marked stale/uncertain rather than silently shown as current.

---

## 24. Product Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Marketplace cold start (no workers/vendors to match requests) | Seed initial supply manually in target regions before public launch; consider a manual-matching fallback in early markets |
| Worker/vendor adoption | Keep onboarding to a single short form; no mandatory heavy verification at signup |
| Driver participation/consent friction | Single secure link, no app install; explain purpose (ETA only) clearly at consent |
| Location accuracy/staleness | Explicit staleness UI (§21), never silently present an old location as current |
| Master Plan confidentiality | Project-scoped RBAC + audit logging on every view/download |
| Quotation extraction accuracy on poor/handwritten scans | Confidence scoring surfaced to the user, degraded-confidence handling rather than outright rejection, tracked as a first-class analytics metric to drive iteration |
| AI hallucination (RAG or verification) | Strict architectural separation — LLM never decides a flag independently, only explains an already-deterministically-computed finding; no citation, no claim |
| Incorrect/outdated reference prices | `effectiveDate` staleness flagging; multiple-source conflict shown transparently, not resolved silently; admin ingestion/refresh process keeps the corpus current |
| Regional price variation | `ReferencePrice` is region-scoped, not a single national number, reducing false "unusual pricing" flags from a mismatched region |
| Outdated construction standards in the RAG/reference corpus | `status: Superseded` versioning pattern on `ReferenceSource`, consistently applied |
| RAG retrieval quality | Reranking flagged as a V1 lever if MVP precision proves insufficient; unanswered-question rate tracked |
| Public abuse (upload spam, chat flooding, scraping) | Per-session and per-IP rate limits on both upload and chat endpoints; file-count caps per session |
| AI cost at scale / cost exposure from unauthenticated usage | Cache repeated RAG queries where safe; batch reference-price lookups; per-session cost tracked as an operational metric from launch; rate limits double as cost control |
| Data security for anonymous sessions / sensitive uploaded quotations | Encryption at rest, session-token scoping (hashed), defined retention/auto-deletion, user-deletion right, no cross-session exposure as a tested invariant, explicit no-training confirmation required before launch |

---

## 25. Implementation Phasing

**Phase 1 — Foundation:** Auth/RBAC, Company/Project/User models, Master Plan upload+versioning+storage (no AI), basic notifications. *Dependencies*: none. *AI work*: none.

**Phase 2 — Marketplace core:** Worker Requirements, Worker Responses (individual + group), Material Requests, Vendor registration, RFP/Quote flow. *Dependencies*: Phase 1 auth/RBAC. *AI work*: none.

**Phase 3 — Delivery & driver:** Truck/Driver models, secure link auth for Driver, periodic LocationUpdate ingestion, ETA calculation (deterministic, geospatial-internal-only, no map UI). *Dependencies*: Phase 2 Quote/Delivery linkage.

**Phase 4 — Public AI, RAG:** RAGDocument ingestion pipeline, embeddings, vector store, chat endpoint, citation rendering. *Dependencies*: none on prior phases — can run in parallel with Phases 1–3 since it's a fully separate data domain. *AI work*: full RAG pipeline (§10.1).

**Phase 5 — Public AI, Quotation Verification:** anonymous session handling, upload pipeline, OCR, extraction, normalization, deterministic calculation engine, ReferencePrice data seeding, LLM explanation layer, follow-up chat reusing Phase 4's chat infrastructure. *Dependencies*: Phase 4's chat/session infrastructure. *AI work*: full hybrid pipeline (§10.2) — this and Phase 4 are the highest-AI-risk phases, given their substantial, self-contained scope, and **should be resourced as a separate workstream started in parallel with Phase 2 onward**, not bolted on at the end — treating either as a late add-on risks under-resourcing a stated core differentiator. Testing for this phase specifically includes: extraction-accuracy spot-checks against a labeled sample set of real (or realistic) quotations, cross-session privacy boundary tests (§18.9, made explicit as a required test case), grounding/hallucination checks on both chatbot and verification explanations, retention/deletion correctness, rate-limit enforcement, malicious-file handling. Deployment for this phase requires OCR provider integration and LLM provider integration with a confirmed no-training-on-input agreement (§18.5) before any real user data flows through it.

**Phase 6 — Recommendations & polish:** rating system, attendance check-in, payment-status flags, multi-quote compare, activity feed, urgent-flag. *Dependencies*: Phases 2–3 core entities must exist first.

Each phase includes its own testing pass (unit + integration) and a deployment checkpoint before the next phase begins.

---

## 26. Open Product Decisions

1. **Retention window for public quotation uploads** — 30 days is an assumption; too short frustrates users who want to revisit an analysis, too long increases privacy exposure.
2. **Whether anonymized uploaded quotations may improve `ReferencePrice` data over time** — a product/legal decision, not a technical one; directly affects consent language and whether this needs explicit opt-in.
3. **Definition of "region" for `ReferencePrice`** (state/city/pincode-radius?) — too coarse makes price comparisons meaningless; too fine makes seeding reference data impractical initially.
4. **Reference-price data sourcing and update cadence** — who curates Schedule-of-Rates/material-price ingestion, and how often, given this data is explicitly time-sensitive; also determines how credible the verification feature is on day one.
5. **File-type allow-list and max size for quotation uploads** — currently assumed to mirror Master Plan limits; may need to differ given typical quotation file sizes are much smaller.
6. **OCR/document-AI provider selection** — cost, accuracy on regional/handwritten documents, and data-residency terms differ materially between providers; a gating decision for Phase 5.
7. **LLM provider and its data-training/retention terms** — must be contractually confirmed before any real user upload flows through it; not a purely technical choice given the trust claim it underwrites.
8. **Whether anonymous session identity persists via cookie or requires the user to keep a link/token** — affects whether a user can return to a prior analysis after closing their browser.
9. **Region-matching granularity for reference prices** — state-level, city-level, or pincode-level materially affects both data-collection burden and flagging accuracy.
10. **Confidence-score thresholds** — what OCR/extraction confidence triggers "degraded confidence" UI treatment vs. normal display; a product-trust-calibration decision, not purely engineering, needing sign-off before launch copy is written.
11. **Whether PDF export of a verification report is MVP or V1** — currently deferred to V1; may be higher-priority if users need to share reports offline.
12. **Whether the general RAG chatbot and the quotation follow-up chat should share visible chat history in the UI, or remain fully separate** — currently designed as separate; worth validating against real user expectations.
13. **Rate-limit thresholds for anonymous upload/chat usage** — specific numeric ceilings balancing usability against abuse/cost exposure are unassigned.
14. **Whether Company Master Plans and the public-AI reference corpus should ever share infrastructure beyond the same database instance** — currently strictly separated at the data level; confirm this is sufficient given both live in one Postgres instance.
15. **Whether a rejected/expired Quote or an expired Worker Requirement should be resurfaceable.**
16. **Whether individual Workers can belong to more than one Group simultaneously.**
17. **How group-level worker commitments handle per-member assignment** — a known MVP gap (§7).
18. **Group acceptance conflict rule** — if two group leaders try to commit overlapping members to different requirements simultaneously, who wins? Affects the `WorkerGroupMember`/`WorkAssignment` locking logic.
19. **Vendor verification process ownership** — no platform-admin role currently exists.
20. **Worker identity verification level for MVP** — phone-only, or a documented ID step? Affects trust, onboarding friction, and cold-start speed.
21. **Whether Delivery status auto-transitions to `in_transit` on first driver location update, or requires manual Vendor action.**
22. **Definition of "stale" for driver location data** — currently a 2× interval-multiplier assumption.
23. **Configurable location-update interval — who sets it (company or vendor), and can it be overridden per-delivery?** Affects both the data model (§11.5) and Site Manager UX expectations.
24. **Whether Company Admins see cross-project analytics.**
25. **Data retention policy for archived Master Plans/closed projects generally** (distinct from the quotation-specific retention question).
26. **Session/token expiry durations across all auth methods** (OTP, driver token, anonymous session, chat session) — should be confirmed as one coherent policy.
27. **Monetization/billing model** — entirely unaddressed; also relevant to whether the free, unauthenticated public AI features have any usage ceiling tied to a future paid tier.
28. **Whether malicious-file detection should block processing entirely or quarantine-and-flag for review** — currently assumed to hard-block; confirm this is the desired posture versus logging suspicious files for manual inspection.
29. **How conflicting reference sources are surfaced when they disagree materially** — showing a spanning range is recommended; whether that's sufficient or a source-priority ranking is needed is unresolved.
30. **Whether the platform should collect any optional contact info from public users** (e.g., "email me this report") — currently explicitly out of scope (no consumer accounts), but a low-friction option without full registration is a plausible, unaddressed middle ground.
31. **What happens to `WorkAssignment` status if a worker never checks in** (if the attendance recommendation is adopted) — auto-no-show after a grace period, or manual-only? Affects rating/reputation fairness.
32. **Payment-status field ownership** — self-reported by the Site Manager, the vendor, or both sides confirming? Affects trust in the payment-status flag.
33. **Multi-quote compare scope** — does it require quotations to be for literally the same scope of work, and how is that matching enforced, or left to user judgment?
34. **RBAC granularity for multi-project Site Managers** — can one Site Manager be assigned to several projects simultaneously in MVP?
35. **Notification channel priority for low-smartphone-literacy workers** — is email/in-app sufficient for MVP, or does SMS need to be pulled forward from Future scope?
36. **Master Plan file-size/type limits** — affects both storage cost and whether large drawing sets/BIM files need special handling later.
37. **Whether Company Admins can see individual worker ratings, or only aggregate scores** (if the rating recommendation is adopted) — a privacy/fairness tradeoff for workers.
38. **Data residency requirements** for Master Plans and uploaded quotations, if operating across regions with different data-localization rules — affects the object-storage architecture choice (§13).

---

*End of PRD. All items marked [RECOMMENDATION] can be individually accepted or cut without affecting the mandatory scope defined in §22. All items marked [ASSUMPTION] should be explicitly confirmed or overridden by the product owner before Phase 1 begins.*
