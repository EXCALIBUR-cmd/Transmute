# Transmute — Agent-Assisted Development Record

This document provides a factual, chronological record of the mixed human + agent engineering process across all development loops of Transmute.

AI-assisted implementation was performed within explicitly bounded tasks. Architecture, scope, verification strategy, review, and acceptance remained under human direction.

---

## Retrospective — LOOP 1: Database Foundation & Seed Data

### Human Engineering Work
- Set up MongoDB Atlas cluster, network security, and database user credentials.
- Configured repository environment (`.env.local`) with database connection strings.
- Initialized local Git repository and connected remote origin on GitHub.
- Defined architectural boundaries for Loop 1: establishing data foundation without permitting any AI engine, migration execution, or transformation logic.
- Defined Mongoose schema structures for `source_customers` and `target_users`.
- Established acceptance criteria: exactly 50 source customers, exactly 0 target users, and deterministic planted edge cases.
- Executed and interpreted manual verification commands.
- Discovered during Loop 1A reconciliation that the verification npm script was missing from `package.json`, directing immediate reconciliation.
- Formally accepted Loop 1 foundation checkpoint `0277ed9` and fix `3f20af3`.

### Agent-Assisted Implementation Work
- Implemented Mongoose connection caching in `src/lib/db.ts`.
- Created Mongoose models `Customer.ts` and `User.ts` in `src/models/`.
- Generated deterministic synthetic dataset with 50 customer records containing planted edge cases (invalid email, null values, invalid date format, invalid phone format) in `src/seed/data.ts`.
- Created idempotent seeding script in `src/seed/run.ts`.
- Implemented comprehensive database assertion script `src/seed/verify.ts` and wired `npm run verify` in `package.json`.

---

## Retrospective — LOOP 2: Schema Inspection & Structural Comparison

### Human Engineering Work
- Defined the objective and boundaries for Loop 2: deterministic, read-only reflection of source and target schemas.
- Strictly prohibited AI integration, migration execution, or transformation code in this stage.
- Conducted a forensic audit of unexpected modifications to Loop 1 files, verifying that edits were strictly limited to enforcing the zero-comment invariant with zero functional divergence.
- Defined data contracts for `FieldMetadata`, `SchemaMetadata`, `FieldComparison`, and `SchemaComparison`.
- Reviewed and accepted unit tests and database integration tests.
- Formally accepted Loop 2 checkpoint `fe9194f`.

### Agent-Assisted Implementation Work
- Implemented deterministic Mongoose schema introspection in `src/lib/schema/inspect.ts`.
- Built structural schema comparison logic in `src/lib/schema/compare.ts` identifying name matches, type compatibility, and unshared fields.
- Implemented read-only HTTP route handler `GET /api/schema/inspect`.
- Created unit test suite in `src/test/schema.test.ts` and integration test in `src/test/integration.test.ts`.
- Audited the repository to enforce the zero-comment invariant.

---

## Retrospective — LOOP 3: AI Mapping Proposal Engine

### Human Engineering Work
- Formulated the core architectural safety boundary: LLMs propose candidate mappings; application code validates outside the model; the model never receives database write access or execution authority.
- Provisioned Google Gemini API key and configured credentials in `.env.local`.
- Enforced requirement for live Gemini verification in addition to deterministic unit validation.
- Performed model configuration review and correction: diagnosed that `gemini-2.5-flash` was deprecated (HTTP 404) and `gemini-3.8-flash` encountered intermittent quota restrictions (HTTP 503), directing configuration of `gemini-3.1-flash-lite`.
- Defined transformation allowlist and field existence validation rules.
- Reviewed and accepted Loop 3 checkpoints `0c20bc4` and `ee784d8`.

### Agent-Assisted Implementation Work
- Integrated official `@google/genai` Node.js SDK.
- Constructed structured prompt with strict `responseSchema` for JSON schema mapping proposals in `src/lib/ai/prompt.ts`.
- Built independent proposal validator `src/lib/ai/validator.ts` verifying field existence, allowlisted transformations, and confidence ranges.
- Implemented proposal generation service in `src/lib/ai/proposal-service.ts`.
- Implemented `POST /api/mapping/propose` API route.
- Created test suite `src/test/mapping.test.ts` covering validation rules, malformed responses, and live Gemini proposal generation.

---

## LOOP 4: Human Approval Workflow & Control Room UI

### Delegated Work
- Implemented data contracts in `src/types/plan.ts` for `MappingPlan` with statuses: `pending`, `approved`, and `rejected`.
- Created Mongoose model `src/models/MappingPlan.ts` with strict status enums, timestamps, and embedded proposal schemas.
- Implemented structured workflow logger in `src/lib/logger.ts` for operational events (`mapping_proposal_persisted`, `mapping_plan_approved`, `mapping_plan_rejected`, `mapping_plan_fetch_failed`).
- Built server-side approval and rejection endpoints:
  - `POST /api/mapping/plans` (persists validated proposal as pending plan)
  - `GET /api/mapping/plans` (lists recent plans)
  - `GET /api/mapping/plans/[id]` (retrieves plan state)
  - `POST /api/mapping/plans/[id]/approve` (validates pending state and transitions to approved)
  - `POST /api/mapping/plans/[id]/reject` (validates pending state and transitions to rejected with optional reason)
- Replaced default starter page with a dark, developer-focused Transmute control room in `src/app/page.tsx` covering all 8 UX states:
  - Empty state (clean initial prompt)
  - Loading state (live spinner during Gemini analysis)
  - Success state (feedback banners upon proposal generation and approval)
  - Validation error state (clear error banner on schema or proposal errors)
  - Network/Server failure state (clean user-facing alerts without stack traces)
  - Pending approval state (amber badge, proposal cards, confidence, risks, and approval controls)
  - Approved state (emerald badge, locked proposal, deferred execution notice)
  - Rejected state (rose badge, recorded rejection reason)
- Created test suite `src/test/plan.test.ts` verifying 14 validation and transition requirements and added `"test:plan"` script to `package.json`.

### Human Engineering Decisions
- Enforced the explicit trust boundary: AI proposals must never auto-approve; approval is exclusively a human decision.
- Confirmed that approval is a state transition only and must NOT trigger migration execution or mutate `target_users`.
- Established legal state machine transitions: only `pending` can transition to `approved` or `rejected`; duplicate approvals/rejections and transitions from `rejected` to `approved` must be rejected with HTTP 409.
- Defined control room layout requirements: high information density, dark aesthetic, clear field-to-field cards, confidence badges, risk panels, and prominent approval/rejection controls.
- Mandated runtime browser verification of the complete user workflow.

### Corrections / Rejected Approaches
- Consumed Request Stream in Tests: In `src/test/plan.test.ts`, duplicate rejection tests initially reused a consumed `NextRequest` instance, which caused a 400 Bad Request when re-reading the body stream instead of exercising the duplicate state check. Fixed by instantiating fresh `NextRequest` instances for duplicate requests.
- Comment Removal: Self-audit detected an inline comment `// Ignore background plan fetch error` in `src/app/page.tsx`. Removed immediately to preserve the zero-comment invariant.
- Mongoose Import Resolution: Corrected an auto-generated import in `src/app/api/mapping/plans/[id]/route.ts` that referenced internal Next.js primitives instead of standard `mongoose`.

### Verification
Concrete commands executed and runtime evidence:

```bash
npm run seed
```
Result: 50 source customer records seeded deterministically.

```bash
npm run verify
```
Result:
- Source customer count = 50 (PASS)
- Target user count = 0 (PASS)
- No duplicate source IDs (PASS)
- 11/11 foundation checks PASSED.

```bash
npm run test:schema
```
Result: `ALL_SCHEMA_TESTS_PASSED`

```bash
npm run test:mapping
```
Result: `LIVE_GEMINI_PROPOSAL_SUCCESS`, `ALL_MAPPING_TESTS_PASSED`

```bash
npm run test:plan
```
Result: All 14 plan validation, state machine transition, and invariant checks PASSED (`ALL_PLAN_TESTS_PASSED`).

```bash
npx tsx --env-file=.env.local src/test/integration.test.ts
```
Result: `INTEGRATION_TEST_PASSED`

```bash
npx tsc --noEmit
```
Result: Exited with code 0. Zero TypeScript errors.

```bash
npm run build
```
Result: Production build succeeded with all static and dynamic App Router routes compiled.

```text
Browser Subagent Runtime Verification (http://localhost:3000):
- Control room header verified with "Atlas Connected" and "Stage 4: Human Review & Approval".
- Source schema (source_customers, 6 fields) and target schema (target_users, 5 fields) rendered.
- Triggered "Generate AI Mapping Proposal" with live Gemini model.
- Persisted pending plan ID: 6ac6958215722c7a352a4563.
- Observed 5 field mappings, confidence scores (100%, 100%, 100%, 100%, 90%), and 2 identified risks.
- Clicked "Approve Mapping".
- Verified status transitioned to "Mapping Plan Approved" with emerald APPROVED badge and reviewed timestamp.
- Verified target_users count remained 0 throughout.
- Session recording saved: loop4_ui_demo_1791399248873.webp
```
