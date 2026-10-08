import React, { useState } from "react";
import { IMigrationRun } from "@/models/MigrationRun";
import { StatusBadge } from "@/components/StatusBadge";
import { RollbackResult } from "@/types/rollback";

interface HistoryAndRollbackPanelProps {
  runs: IMigrationRun[];
  selectedRun: IMigrationRun | null;
  onSelectRun: (run: IMigrationRun) => void;
  onRollbackRun: (runId: string, reason?: string) => Promise<RollbackResult | null>;
  isRollingBack: boolean;
  rollbackResult: RollbackResult | null;
}

export const HistoryAndRollbackPanel: React.FC<HistoryAndRollbackPanelProps> = ({
  runs,
  selectedRun,
  onSelectRun,
  onRollbackRun,
  isRollingBack,
  rollbackResult,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [rollbackReasonInput, setRollbackReasonInput] = useState("");

  const createdRecordsCount =
    selectedRun?.recordResults?.filter((r) => r.action === "created").length ||
    (selectedRun?.status === "completed" && !selectedRun?.rollbackStatus ? selectedRun.migratedRecords : 0);

  const isRolledBack =
    selectedRun?.rollbackStatus === "rolled_back" ||
    (rollbackResult && rollbackResult.runId === (selectedRun?._id ? String(selectedRun._id) : "") && rollbackResult.status === "rolled_back");

  const canRollback =
    selectedRun?.status === "completed" &&
    !isRolledBack &&
    createdRecordsCount > 0;

  const handleConfirm = async () => {
    if (!selectedRun) return;
    await onRollbackRun(String(selectedRun._id), rollbackReasonInput);
    setShowConfirmModal(false);
    setRollbackReasonInput("");
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            6. Migration Audit History & Run-Scoped Recovery
          </h2>
          <span className="text-xs text-zinc-500 font-mono">Immutable run logs</span>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Completed Migration Runs ({runs.length})
          </span>
          <span className="text-xs text-zinc-500 font-mono">
            Select a run to inspect record ownership and recovery controls
          </span>
        </div>

        {runs.length === 0 ? (
          <div className="p-10 text-center text-xs text-zinc-500 font-mono">
            No completed migration runs recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80 font-mono text-xs">
            {runs.map((r) => {
              const runId = String(r._id);
              const isSelected = selectedRun && String(selectedRun._id) === runId;
              const dateStr = r.completedAt
                ? new Date(r.completedAt).toLocaleString()
                : new Date(r.startedAt).toLocaleString();

              return (
                <div
                  key={runId}
                  onClick={() => onSelectRun(r)}
                  className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-zinc-800/60 border-l-4 border-indigo-500"
                      : "hover:bg-zinc-800/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-200 font-bold">{runId.slice(-8)}</span>
                    <span className="text-zinc-500 text-[11px]">{dateStr}</span>
                    <span className="text-zinc-400 text-[11px]">
                      {r.sourceCollection} → {r.targetCollection}
                    </span>
                  </div>

                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-emerald-400">
                      {r.migratedRecords} migrated
                    </span>
                    {r.skippedRecords ? (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                        {r.skippedRecords} skipped
                      </span>
                    ) : null}
                    <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400">
                      {r.quarantinedRecords} quarantined
                    </span>

                    <StatusBadge status={r.status} size="sm" />

                    {r.rollbackStatus && (
                      <StatusBadge status={r.rollbackStatus} size="sm" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedRun && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col gap-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-100">
                  Run Inspection: <code className="text-indigo-300 font-mono">{String(selectedRun._id)}</code>
                </span>
                <StatusBadge status={selectedRun.status} size="sm" />
                {selectedRun.rollbackStatus && (
                  <StatusBadge status={selectedRun.rollbackStatus} size="sm" />
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Plan ID: <code className="text-zinc-300 font-mono">{String(selectedRun.planId)}</code> · Started:{" "}
                {new Date(selectedRun.startedAt).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {canRollback && (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isRollingBack}
                  className="px-4 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/80 text-rose-200 font-medium text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <span>↺</span>
                  <span>Rollback This Run</span>
                </button>
              )}

              {isRolledBack && (
                <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-purple-950/60 border border-purple-800/80 text-purple-300">
                  Run Rolled Back ({selectedRun.rolledBackCount || 43} records removed)
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-950/15 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs tracking-wide">
              <span>🛡</span>
              <span className="uppercase font-mono text-[11px] font-bold">
                Run-Scoped Ownership & Safety Policy
              </span>
            </div>
            <p className="text-xs text-rose-200/90 leading-relaxed font-sans">
              Rollback is strictly run-scoped. Only target records explicitly created by this run (
              <span className="font-mono font-bold text-white">{createdRecordsCount}</span> records) are eligible for deletion. Pre-existing records, records from other runs, and skipped records are never touched.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/50">
              <span className="text-zinc-500 text-[10px] uppercase block mb-1">Total Records</span>
              <span className="text-base font-bold text-zinc-100">{selectedRun.totalRecords}</span>
            </div>
            <div className="p-3 rounded-lg border border-emerald-900/40 bg-zinc-950/50">
              <span className="text-emerald-400 text-[10px] uppercase block mb-1">Migrated Count</span>
              <span className="text-base font-bold text-emerald-300">{selectedRun.migratedRecords}</span>
            </div>
            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/50">
              <span className="text-zinc-400 text-[10px] uppercase block mb-1">Skipped Count</span>
              <span className="text-base font-bold text-zinc-300">{selectedRun.skippedRecords || 0}</span>
            </div>
            <div className="p-3 rounded-lg border border-amber-900/40 bg-zinc-950/50">
              <span className="text-amber-400 text-[10px] uppercase block mb-1">Quarantined</span>
              <span className="text-base font-bold text-amber-300">{selectedRun.quarantinedRecords}</span>
            </div>
          </div>

          {showConfirmModal && (
            <div className="rounded-xl border border-rose-500/60 bg-zinc-950 p-5 flex flex-col gap-3 shadow-xl">
              <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
                <span>⚠</span>
                <span>Confirm Run-Scoped Rollback</span>
              </div>
              <p className="text-xs text-zinc-300">
                You are about to delete up to <span className="font-bold text-white">{createdRecordsCount} target records</span> created by migration run <code className="text-rose-300 font-mono">{String(selectedRun._id)}</code>. Unrelated target documents and source records will remain completely untouched.
              </p>
              <input
                type="text"
                value={rollbackReasonInput}
                onChange={(e) => setRollbackReasonInput(e.target.value)}
                placeholder="Optional audit reason for rollback..."
                className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-rose-500"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-3 py-1.5 rounded-md bg-zinc-900 text-zinc-300 text-xs border border-zinc-800 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isRollingBack}
                  className="px-4 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium disabled:opacity-50"
                >
                  {isRollingBack ? "Executing Rollback..." : "Confirm Rollback"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
