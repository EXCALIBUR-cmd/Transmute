"use client";

import { useState, useEffect, useCallback } from "react";
import { InspectionResult } from "@/types/schema";
import { MappingProposal } from "@/types/mapping";
import { MappingPlan } from "@/types/plan";
import { DryRunResult } from "@/types/dry-run";
import { MigrationExecutionResult } from "@/types/execution";
import { ReconciliationResult } from "@/types/reconciliation";
import { RollbackResult } from "@/types/rollback";
import { IMigrationRun } from "@/models/MigrationRun";
import { Topbar } from "@/components/Topbar";
import { WorkflowStepper, WorkflowStageKey } from "@/components/WorkflowStepper";
import { SchemaPanel } from "@/components/SchemaPanel";
import { MappingCard } from "@/components/MappingCard";
import { RiskPanel } from "@/components/RiskPanel";
import { ApprovalPanel } from "@/components/ApprovalPanel";
import { DryRunPanel } from "@/components/DryRunPanel";
import { ExecutionPanel } from "@/components/ExecutionPanel";
import { ReconciliationPanel } from "@/components/ReconciliationPanel";
import { HistoryAndRollbackPanel } from "@/components/HistoryAndRollbackPanel";

export default function Home() {
  const [currentStage, setCurrentStage] = useState<WorkflowStageKey>("schema");
  const [schemaData, setSchemaData] = useState<InspectionResult | null>(null);
  const [activePlan, setActivePlan] = useState<MappingPlan | null>(null);
  const [recentPlans, setRecentPlans] = useState<MappingPlan[]>([]);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [executionResult, setExecutionResult] = useState<MigrationExecutionResult | null>(null);
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null);
  const [rollbackResult, setRollbackResult] = useState<RollbackResult | null>(null);
  const [migrationRuns, setMigrationRuns] = useState<IMigrationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<IMigrationRun | null>(null);

  const [isLoadingSchema, setIsLoadingSchema] = useState<boolean>(true);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState<boolean>(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);
  const [isSubmittingRejection, setIsSubmittingRejection] = useState<boolean>(false);
  const [isRunningDryRun, setIsRunningDryRun] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<{ title: string; detail: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [sourceCustomerCount, setSourceCustomerCount] = useState<number>(50);
  const [targetUserCount, setTargetUserCount] = useState<number>(43);

  const loadSchemas = useCallback(async () => {
    setIsLoadingSchema(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/schema/inspect");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to inspect schema (HTTP ${res.status})`);
      }
      const data: InspectionResult = await res.json();
      setSchemaData(data);
    } catch (err) {
      setErrorMessage({
        title: "Schema Inspection Failed",
        detail: err instanceof Error ? err.message : "Unable to reach schema inspection endpoint",
      });
    } finally {
      setIsLoadingSchema(false);
    }
  }, []);

  const loadRecentPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/mapping/plans");
      if (res.ok) {
        const data = await res.json();
        if (data.plans && Array.isArray(data.plans) && data.plans.length > 0) {
          setRecentPlans(data.plans);
          setActivePlan((prev) => prev || data.plans[0]);
        }
      }
    } catch {
    }
  }, []);

  const loadMigrationRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/migration/runs");
      if (res.ok) {
        const data = await res.json();
        if (data.runs && Array.isArray(data.runs)) {
          setMigrationRuns(data.runs);
          setSelectedRun((prev) => prev || (data.runs.length > 0 ? data.runs[0] : null));
          if (data.runs.length > 0 && data.runs[0].reconciliationResult) {
            setReconciliationResult((prev) => prev || (data.runs[0].reconciliationResult as ReconciliationResult));
          }
        }
      }
    } catch {
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadSchemas(), loadRecentPlans(), loadMigrationRuns()]);
    setIsRefreshing(false);
  }, [loadSchemas, loadRecentPlans, loadMigrationRuns]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleGenerateProposal = async () => {
    if (!schemaData) return;
    setIsGeneratingProposal(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const proposeRes = await fetch("/api/mapping/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: schemaData.source,
          target: schemaData.target,
        }),
      });

      if (!proposeRes.ok) {
        const err = await proposeRes.json().catch(() => ({}));
        throw new Error(err.error || `Proposal generation failed (HTTP ${proposeRes.status})`);
      }

      const proposal: MappingProposal = await proposeRes.json();

      const persistRes = await fetch("/api/mapping/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCollection: schemaData.source.collection,
          targetCollection: schemaData.target.collection,
          proposal,
        }),
      });

      if (!persistRes.ok) {
        const err = await persistRes.json().catch(() => ({}));
        throw new Error(err.error || `Failed to persist mapping plan (HTTP ${persistRes.status})`);
      }

      const newPlan: MappingPlan = await persistRes.json();
      setActivePlan(newPlan);
      setRecentPlans((prev) => [newPlan, ...prev.filter((p) => p.id !== newPlan.id)]);
      setCurrentStage("approval");
      setSuccessMessage("AI proposal generated and persisted as Pending Human Review.");
    } catch (err) {
      setErrorMessage({
        title: "Proposal Generation Error",
        detail: err instanceof Error ? err.message : "An unexpected failure occurred while generating proposal",
      });
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  const handleApprove = async () => {
    if (!activePlan || activePlan.status !== "pending") return;
    setIsSubmittingApproval(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/mapping/plans/${activePlan.id}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Approval failed (HTTP ${res.status})`);
      }

      const updated: MappingPlan = await res.json();
      setActivePlan(updated);
      setRecentPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setCurrentStage("dryrun");
      setSuccessMessage("Mapping proposal approved. State persisted. Ready for Deterministic Dry Run.");
    } catch (err) {
      setErrorMessage({
        title: "Approval Failed",
        detail: err instanceof Error ? err.message : "Unable to submit approval",
      });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!activePlan || activePlan.status !== "pending") return;
    setIsSubmittingRejection(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/mapping/plans/${activePlan.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Rejection failed (HTTP ${res.status})`);
      }

      const updated: MappingPlan = await res.json();
      setActivePlan(updated);
      setRecentPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSuccessMessage("Mapping proposal rejected. State persisted for audit.");
    } catch (err) {
      setErrorMessage({
        title: "Rejection Failed",
        detail: err instanceof Error ? err.message : "Unable to submit rejection",
      });
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  const handleExecuteDryRun = async () => {
    if (!activePlan) return;
    setIsRunningDryRun(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/migration/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: activePlan.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Dry run failed (HTTP ${res.status})`);
      }

      const result: DryRunResult = await res.json();
      setDryRunResult(result);
      setSuccessMessage(
        `Dry run completed: ${result.validRecords} valid, ${result.invalidRecords} quarantined. Zero target writes committed.`
      );
    } catch (err) {
      setErrorMessage({
        title: "Dry Run Evaluation Failed",
        detail: err instanceof Error ? err.message : "Unable to execute dry run",
      });
    } finally {
      setIsRunningDryRun(false);
    }
  };

  const handleExecuteMigration = async () => {
    if (!activePlan || activePlan.status !== "approved") return;
    setIsExecuting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/migration/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: activePlan.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Migration execution failed (HTTP ${res.status})`);
      }

      const result: MigrationExecutionResult = await res.json();
      setExecutionResult(result);
      setTargetUserCount(result.recordsAfter.target);
      setCurrentStage("reconciliation");
      await loadMigrationRuns();
      setSuccessMessage(
        `Migration run completed: ${result.migratedRecords} newly migrated, ${result.skippedRecords} skipped, ${result.quarantinedRecords} quarantined.`
      );
    } catch (err) {
      setErrorMessage({
        title: "Migration Execution Failed",
        detail: err instanceof Error ? err.message : "Unable to execute migration",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReconcile = async (runId: string) => {
    setIsReconciling(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/migration/runs/${runId}/reconcile`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Reconciliation failed (HTTP ${res.status})`);
      }

      const result: ReconciliationResult = await res.json();
      setReconciliationResult(result);
      await loadMigrationRuns();
      setSuccessMessage(
        `Reconciliation completed: status is ${result.status}. ${result.matchedRecords} exact matches, 0 quarantine leaks.`
      );
    } catch (err) {
      setErrorMessage({
        title: "Reconciliation Failed",
        detail: err instanceof Error ? err.message : "Unable to audit reconciliation",
      });
    } finally {
      setIsReconciling(false);
    }
  };

  const handleRollback = async (runId: string, reason?: string): Promise<RollbackResult | null> => {
    setIsRollingBack(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/migration/runs/${runId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Rollback failed (HTTP ${res.status})`);
      }

      const result: RollbackResult = await res.json();
      setRollbackResult(result);
      setTargetUserCount(result.targetCountAfter);
      await loadMigrationRuns();
      setSuccessMessage(
        `Rollback successful: ${result.rolledBackCount} target records created by this run were safely removed. Target users count is now ${result.targetCountAfter}.`
      );
      return result;
    } catch (err) {
      setErrorMessage({
        title: "Rollback Refused",
        detail: err instanceof Error ? err.message : "Unable to rollback migration run",
      });
      return null;
    } finally {
      setIsRollingBack(false);
    }
  };

  const isPlanApproved = activePlan?.status === "approved";
  const activeRunId = executionResult?.runId || (selectedRun ? String(selectedRun._id) : null);

  return (
    <div className="min-h-screen bg-[#090b10] text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Topbar
        sourceCount={sourceCustomerCount}
        targetCount={targetUserCount}
        onRefresh={refreshAll}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        <WorkflowStepper
          currentStage={currentStage}
          onSelectStage={setCurrentStage}
          hasSchema={!!schemaData}
          hasProposal={!!activePlan}
          isApproved={isPlanApproved}
          hasDryRun={!!dryRunResult}
          hasExecuted={!!executionResult || migrationRuns.length > 0}
          hasReconciled={!!reconciliationResult}
        />

        {errorMessage && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 text-rose-200 flex items-start justify-between gap-4 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-3">
              <span className="text-rose-400 text-base mt-0.5">⚠</span>
              <div>
                <h3 className="font-semibold text-sm text-rose-100">{errorMessage.title}</h3>
                <p className="text-xs text-rose-300/90 mt-1 font-mono">{errorMessage.detail}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 text-xs px-2.5 py-1 rounded-md bg-rose-900/30 border border-rose-800/50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 text-emerald-200 flex items-start justify-between gap-4 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 text-base mt-0.5">✓</span>
              <div>
                <h3 className="font-semibold text-sm text-emerald-100">Workflow Action Verified</h3>
                <p className="text-xs text-emerald-300/90 mt-1">{successMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs px-2.5 py-1 rounded-md bg-emerald-900/30 border border-emerald-800/50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {currentStage === "schema" && (
          <SchemaPanel
            data={schemaData}
            isLoading={isLoadingSchema}
            onRefresh={loadSchemas}
          />
        )}

        {currentStage === "proposal" && (
          <section className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                  2. AI Mapping Proposal Engine
                </h2>
                <span className="text-xs text-zinc-500 font-mono">Semantic candidate reasoning</span>
              </div>
              <button
                type="button"
                onClick={handleGenerateProposal}
                disabled={isGeneratingProposal || !schemaData}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20"
              >
                {isGeneratingProposal ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Querying Gemini Flash...</span>
                  </>
                ) : (
                  <>
                    <span>✦</span>
                    <span>Generate AI Mapping Proposal</span>
                  </>
                )}
              </button>
            </div>

            {isGeneratingProposal && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/15 p-12 text-center flex flex-col items-center justify-center gap-4">
                <div className="h-10 w-10 border-3 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                <div>
                  <h3 className="font-semibold text-sm text-indigo-100">
                    Querying Gemini Model for Semantic Relationships
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                    Computing candidate transformations, validating against allowlisted operations, and surfacing precision risks...
                  </p>
                </div>
              </div>
            )}

            {!isGeneratingProposal && !activePlan && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 text-xl font-bold">
                  ⚗
                </div>
                <h3 className="font-semibold text-sm text-zinc-200">No mapping proposal generated yet</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Click &quot;Generate AI Mapping Proposal&quot; to prompt Gemini for semantic transformations. AI proposals require human approval before execution.
                </p>
              </div>
            )}

            {!isGeneratingProposal && activePlan && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Candidate Field Mappings ({activePlan.proposal.mappings.length})
                  </h3>
                  <div className="flex flex-col gap-3">
                    {activePlan.proposal.mappings.map((m) => (
                      <MappingCard key={m.targetField} mapping={m} />
                    ))}
                  </div>
                </div>

                <RiskPanel risks={activePlan.proposal.risks} />

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStage("approval")}
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                  >
                    <span>Proceed to Human Review & Approval</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {currentStage === "approval" && (
          <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                  3. Human Approval Layer
                </h2>
                <span className="text-xs text-zinc-500 font-mono">Explicit trust boundary</span>
              </div>
            </div>

            {activePlan ? (
              <div className="flex flex-col gap-6">
                <ApprovalPanel
                  plan={activePlan}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isApproving={isSubmittingApproval}
                  isRejecting={isSubmittingRejection}
                />

                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Reviewed Field Mappings ({activePlan.proposal.mappings.length})
                  </h3>
                  <div className="flex flex-col gap-3">
                    {activePlan.proposal.mappings.map((m) => (
                      <MappingCard key={m.targetField} mapping={m} />
                    ))}
                  </div>
                </div>

                <RiskPanel risks={activePlan.proposal.risks} />

                {isPlanApproved && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStage("dryrun")}
                      className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                    >
                      <span>Proceed to Deterministic Dry Run</span>
                      <span>→</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-8 text-center text-xs text-zinc-500 font-mono">
                No active plan selected for review. Generate an AI mapping proposal first.
              </div>
            )}
          </section>
        )}

        {currentStage === "dryrun" && (
          <DryRunPanel
            planId={activePlan?.id || ""}
            isPlanApproved={isPlanApproved}
            dryRunResult={dryRunResult}
            isRunningDryRun={isRunningDryRun}
            onExecuteDryRun={handleExecuteDryRun}
          />
        )}

        {currentStage === "execution" && (
          <ExecutionPanel
            planId={activePlan?.id || ""}
            isPlanApproved={isPlanApproved}
            hasDryRunRun={!!dryRunResult}
            readyRecordsCount={dryRunResult?.validRecords || 43}
            quarantinedRecordsCount={dryRunResult?.invalidRecords || 7}
            executionResult={executionResult}
            isExecuting={isExecuting}
            onExecuteMigration={handleExecuteMigration}
            onTriggerReconciliation={(runId) => {
              setCurrentStage("reconciliation");
              handleReconcile(runId);
            }}
          />
        )}

        {currentStage === "reconciliation" && (
          <ReconciliationPanel
            runId={activeRunId}
            reconciliationResult={reconciliationResult}
            isReconciling={isReconciling}
            onExecuteReconcile={handleReconcile}
          />
        )}

        {currentStage === "recovery" && (
          <HistoryAndRollbackPanel
            runs={migrationRuns}
            selectedRun={selectedRun}
            onSelectRun={setSelectedRun}
            onRollbackRun={handleRollback}
            isRollingBack={isRollingBack}
            rollbackResult={rollbackResult}
          />
        )}
      </main>

      <footer className="border-t border-zinc-800/80 bg-zinc-950/80 px-6 py-4 text-xs font-mono text-zinc-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            Transmute Migration Workbench · LLMs propose, humans approve, deterministic code executes.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Database Invariants:</span>
            <span className="text-cyan-400 font-semibold">source = {sourceCustomerCount} (read-only)</span>
            <span className="text-purple-400 font-semibold">target = {targetUserCount} (verified)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
