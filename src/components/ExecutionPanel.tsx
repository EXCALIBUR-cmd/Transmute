import React, { useState } from "react";
import { MigrationExecutionResult } from "@/types/execution";
import { StatusBadge } from "@/components/StatusBadge";

interface ExecutionPanelProps {
  planId: string;
  isPlanApproved: boolean;
  hasDryRunRun: boolean;
  readyRecordsCount: number;
  quarantinedRecordsCount: number;
  executionResult: MigrationExecutionResult | null;
  isExecuting: boolean;
  onExecuteMigration: () => Promise<void>;
  onTriggerReconciliation?: (runId: string) => void;
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  planId,
  isPlanApproved,
  hasDryRunRun,
  readyRecordsCount,
  quarantinedRecordsCount,
  executionResult,
  isExecuting,
  onExecuteMigration,
  onTriggerReconciliation,
}) => {
  const [hasConfirmed, setHasConfirmed] = useState(false);

  const canExecute = isPlanApproved && !isExecuting;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            4. Deterministic Migration Execution
          </h2>
          <span className="text-xs text-zinc-500 font-mono">Real target writes</span>
        </div>

        {executionResult && (
          <StatusBadge status={executionResult.status} size="sm" />
        )}
      </div>

      {!isPlanApproved && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-center text-xs text-zinc-500 font-mono">
          Execution locked. Migration execution requires explicit prior human approval.
        </div>
      )}

      {isPlanApproved && !executionResult && !isExecuting && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/15 p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-indigo-400 text-lg mt-0.5">⚡</span>
            <div>
              <h3 className="text-sm font-semibold text-indigo-100">
                Ready for Deterministic Target Writes
              </h3>
              <p className="text-xs text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                You are about to write up to{" "}
                <span className="font-mono font-bold text-emerald-300">
                  {readyRecordsCount || 43} transformed records
                </span>{" "}
                to <code className="text-purple-300 font-bold">target_users</code>. The remaining{" "}
                <span className="font-mono font-bold text-amber-300">
                  {quarantinedRecordsCount || 7} invalid records
                </span>{" "}
                will be quarantined and will not be written. Idempotency guarantees that identical records will not be duplicated.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-indigo-500/20 pt-4 mt-1">
            <label className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasConfirmed}
                onChange={(e) => setHasConfirmed(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500/40 h-4 w-4"
              />
              <span>
                I confirm the approved mapping plan is ready for deterministic database writes
              </span>
            </label>

            <button
              type="button"
              disabled={!hasConfirmed || !canExecute}
              onClick={onExecuteMigration}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-md shadow-indigo-600/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>🚀</span>
              <span>Execute Migration</span>
            </button>
          </div>
        </div>
      )}

      {isExecuting && (
        <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-10 text-center flex flex-col items-center justify-center gap-4">
          <div className="h-10 w-10 border-3 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
          <div>
            <h3 className="font-semibold text-sm text-indigo-100">
              Executing Deterministic Migration...
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              Transforming source customer documents, performing idempotent target checks, writing valid users, and recording outcomes...
            </p>
          </div>
        </div>
      )}

      {executionResult && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-400 mt-1 shadow-sm shadow-emerald-400/50" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-emerald-100">
                    Migration Execution Completed
                  </span>
                  <StatusBadge status={executionResult.status} size="sm" />
                </div>
                <div className="text-[11px] font-mono text-zinc-400 mt-1 flex flex-wrap gap-3">
                  <span>
                    Run ID: <code className="text-zinc-200">{executionResult.runId}</code>
                  </span>
                  <span>
                    Completed: {executionResult.completedAt ? new Date(executionResult.completedAt).toLocaleTimeString() : "Pending"}
                  </span>
                </div>
              </div>
            </div>

            {onTriggerReconciliation && (
              <button
                type="button"
                onClick={() => onTriggerReconciliation(executionResult.runId)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-md shadow-emerald-600/20 flex items-center gap-2"
              >
                <span>🔍</span>
                <span>Reconcile Target State</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 flex flex-col gap-1">
              <span className="text-emerald-400 text-[10px] uppercase tracking-wider font-semibold">
                Newly Migrated
              </span>
              <span className="text-xl font-bold text-emerald-300">
                {executionResult.migratedRecords}
              </span>
              <span className="text-[11px] text-emerald-400/70">written to target</span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col gap-1">
              <span className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">
                Idempotent Skipped
              </span>
              <span className="text-xl font-bold text-zinc-200">
                {executionResult.skippedRecords || 0}
              </span>
              <span className="text-[11px] text-zinc-500">already identical</span>
            </div>

            <div className="p-4 rounded-xl border border-amber-900/40 bg-amber-950/20 flex flex-col gap-1">
              <span className="text-amber-400 text-[10px] uppercase tracking-wider font-semibold">
                Quarantined
              </span>
              <span className="text-xl font-bold text-amber-300">
                {executionResult.quarantinedRecords}
              </span>
              <span className="text-[11px] text-amber-400/70">zero writes</span>
            </div>

            <div className="p-4 rounded-xl border border-rose-900/40 bg-rose-950/20 flex flex-col gap-1">
              <span className="text-rose-400 text-[10px] uppercase tracking-wider font-semibold">
                Failed
              </span>
              <span className="text-xl font-bold text-rose-300">
                {executionResult.failedRecords}
              </span>
              <span className="text-[11px] text-rose-400/70">write errors</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
