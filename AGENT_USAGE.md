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

---

## LOOP 5: Deterministic Dry Run & Record Validation

### Delegated Work
- Defined data contracts in `src/types/dry-run.ts` for `DryRunResult`, `DryRunStatistics`, `QuarantinedRecord`, `ValidTransformedRecord`, and `RecordValidationError`.
- Implemented deterministic transformation engine in `src/lib/migration/transform.ts` supporting all 9 allowlisted transformations (`identity`, `concat_with_space`, `extract_year`, `trim`, `lowercase`, `uppercase`, `to_string`, `to_number`, `format_date`) with strict calendar validation preventing silent corruption of invalid dates.
- Implemented target record validation in `src/lib/migration/validator.ts` verifying required fields, expected scalar types, email format, phone format, and birth year bounds.
- Built dry-run execution engine in `src/lib/migration/dry-run.ts` reading source records in-memory, evaluating approved mapping plans, generating transformed preview records, and categorizing invalid records into quarantine candidates with zero writes to `target_users`.
- Created read-only API endpoint `POST /api/migration/dry-run` rejecting pending and rejected plans (HTTP 409) and executing approved plans (HTTP 200).
- Extended structured logging in `src/lib/logger.ts` for dry-run events (`migration_dry_run_started`, `migration_dry_run_completed`, `migration_dry_run_failed`).
- Created test suite `src/test/dry-run.test.ts` covering 21 test scenarios and added `"test:dry-run"` script to `package.json`.

### Human Engineering Decisions
- Enforced strict execution boundary: dry run operates exclusively on approved MappingPlan records; AI proposal generation is not called and cannot modify the approved plan.
- Verified and enforced the zero-target-write invariant: dry run transforms data in-memory and produces a migration preview without writing to `target_users` (`target_users` count remains 0).
- Confirmed that source data remains strictly read-only (`source_customers` count remains 50).
- Defined quarantine classification model: surfaced invalid records with field-level error messages and failure categories (`transformation_error`, `missing_required_field`, `type_mismatch`, `format_validation_error`, `schema_violation`).
- Confirmed that edge-case fixtures (`CUST-041` to `CUST-044`, `CUST-048`, `CUST-049`, `CUST-050`) are properly surfaced and quarantined.
- Decided to keep frontend scope untouched in this loop to keep changes strictly focused on the backend data engine.

### Corrections / Rejected Approaches
- Machine-Specific Path Resolution: In previous verification scripts, machine-specific absolute ESM imports were replaced with standard module imports (`import mongoose from "mongoose"`) and executed with `tsx --env-file=.env.local` to maintain platform neutrality.
- Calendar Date Parsing Precision: Rather than relying on lenient `Date.parse`, strict component checks (`YYYY-MM-DD`, month 1–12, valid days per month) were enforced in `extract_year` so that invalid dates like `1985-13-45` throw a `TransformationError` rather than guessing a date.

### Verification
Concrete commands executed and runtime evidence:

```bash
npm run test:dry-run
```
Result: All 21 transformation, validation, state boundary, and invariant checks PASSED (`ALL_DRY_RUN_TESTS_PASSED`).

```bash
npm run verify
```
Result: 11/11 foundation checks PASSED. Source count = 50, Target count = 0.

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
Result: `ALL_PLAN_TESTS_PASSED`

```bash
npm run test:rejection
```
Result: `REJECTION RUNTIME WORKFLOW VERIFIED SUCCESSFULLY`

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
Result: Production build succeeded with `/api/migration/dry-run` compiled.

```text
Live Runtime Dry-Run Verification (http://localhost:3000):
- Pre-check: source_customers = 50, target_users = 0
- Pending plan dry-run: rejected with HTTP 409 Conflict ("Plan is pending approval and cannot be executed in dry run")
- Rejected plan dry-run: rejected with HTTP 409 Conflict ("Plan was rejected and cannot be executed in dry run")
- Approved plan dry-run: succeeded with HTTP 200 OK
- Results:
  - Total records: 50
  - Valid records: 43
  - Invalid records: 7
  - Quarantine candidates: 7
  - Transformation failures: 2
  - Validation failures: 6
  - CUST-048 quarantined: YES (failedFields: ["birth_year"], category: "transformation_error")
  - CUST-050 quarantined: YES (failedFields: ["birth_year", "phone_number"], categories: ["transformation_error", "format_validation_error"])
- Post-check: source_customers = 50, target_users = 0
```

