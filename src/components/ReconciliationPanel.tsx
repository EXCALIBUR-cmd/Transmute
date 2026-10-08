import React from "react";
import { ReconciliationResult } from "@/types/reconciliation";
import { StatusBadge } from "@/components/StatusBadge";

interface ReconciliationPanelProps {
  runId: string | null;
  reconciliationResult: ReconciliationResult | null;
  isReconciling: boolean;
  onExecuteReconcile: (runId: string) => Promise<void>;
}

export const ReconciliationPanel: React.FC<ReconciliationPanelProps> = ({
  runId,
  reconciliationResult,
  isReconciling,
  onExecuteReconcile,
}) => {
  const isReconciled = reconciliationResult?.status === "reconciled";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            5. Reconciliation & Database Integrity Audit
          </h2>
          <span className="text-xs text-zinc-500 font-mono">Read-only verification</span>
        </div>

        {runId && (
          <button
            type="button"
            disabled={isReconciling}
            onClick={() => onExecuteReconcile(runId)}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-emerald-600/20"
          >
            {isReconciling ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Comparing Database State...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Audit Reconciliation</span>
              </>
            )}
          </button>
        )}
      </div>

      {!runId && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-center text-xs text-zinc-500 font-mono">
          No active migration run selected for reconciliation. Complete an execution step or select a run from history below.
        </div>
      )}

      {runId && !reconciliationResult && !isReconciling && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-8 text-center flex flex-col items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 font-bold">
            ⚖
          </div>
          <p className="text-xs text-zinc-300 font-medium">Reconciliation Ready for Run {runId}</p>
          <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
            Compare actual documents in target_users against deterministic output expected from the approved plan without mutating data.
          </p>
        </div>
      )}

      {reconciliationResult && (
        <div className="flex flex-col gap-4">
          <div
            className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
              isReconciled
                ? "border-emerald-500/50 bg-emerald-950/20"
                : "border-rose-500/50 bg-rose-950/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`h-3 w-3 rounded-full mt-1 ${
                  isReconciled
                    ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                    : "bg-rose-400 shadow-sm shadow-rose-400/50"
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-zinc-100">
                    {isReconciled ? "Database State Reconciled" : "Reconciliation Discrepancy Detected"}
                  </span>
                  <StatusBadge status={reconciliationResult.status} size="sm" />
                </div>
                <p className="text-xs text-zinc-300 mt-1">
                  {isReconciled
                    ? "All expected target records exist with exact deterministic content. Zero quarantined records leaked into target_users."
                    : "The actual target database does not match the expected state of the migration run."}
                </p>
                <div className="text-[11px] font-mono text-zinc-400 mt-1">
                  Reconciled At: {new Date(reconciliationResult.reconciledAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col gap-1">
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                Expected
              </span>
              <span className="text-xl font-bold text-zinc-200">
                {reconciliationResult.expectedRecords}
              </span>
              <span className="text-[11px] text-zinc-500">records expected</span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col gap-1">
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                Actual Target
              </span>
              <span className="text-xl font-bold text-zinc-200">
                {reconciliationResult.actualRecords}
              </span>
              <span className="text-[11px] text-zinc-500">records found</span>
            </div>

            <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 flex flex-col gap-1">
              <span className="text-emerald-400 text-[10px] uppercase tracking-wider font-semibold">
                Matched Content
              </span>
              <span className="text-xl font-bold text-emerald-300">
                {reconciliationResult.matchedRecords}
              </span>
              <span className="text-[11px] text-emerald-400/70">100% exact match</span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col gap-1">
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                Missing / Mismatch
              </span>
              <span className="text-xl font-bold text-zinc-300">
                {reconciliationResult.missingRecords.length +
                  reconciliationResult.contentMismatches.length}
              </span>
              <span className="text-[11px] text-zinc-500">discrepancies</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs font-mono flex flex-wrap items-center justify-between gap-3 text-zinc-400">
            <div className="flex items-center gap-3">
              <span className="text-zinc-500 uppercase text-[10px] font-bold">Quarantine Containment:</span>
              <span className="text-emerald-400 font-semibold">
                {reconciliationResult.quarantinedRecordsPresent.length === 0
                  ? "✓ 0 leaked records (Strictly Absent)"
                  : `⚠ ${reconciliationResult.quarantinedRecordsPresent.length} quarantined records leaked!`}
              </span>
            </div>

            <div className="text-[11px] text-zinc-500">
              Read-only verification · Source and target unmutated
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
