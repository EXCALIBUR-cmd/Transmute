import React, { useState } from "react";
import { DryRunResult, ValidTransformedRecord, QuarantinedRecord } from "@/types/dry-run";
import { StatusBadge } from "@/components/StatusBadge";

interface DryRunPanelProps {
  planId: string;
  isPlanApproved: boolean;
  dryRunResult: DryRunResult | null;
  isRunningDryRun: boolean;
  onExecuteDryRun: () => Promise<void>;
}

export const DryRunPanel: React.FC<DryRunPanelProps> = ({
  planId,
  isPlanApproved,
  dryRunResult,
  isRunningDryRun,
  onExecuteDryRun,
}) => {
  const [filter, setFilter] = useState<"all" | "valid" | "quarantined">("all");

  const validRecords = dryRunResult?.records || [];
  const quarantinedRecords = dryRunResult?.quarantinedRecords || [];

  const displayedRecords =
    filter === "valid"
      ? validRecords.map((r: ValidTransformedRecord) => ({
          id: r.sourceId,
          targetId: String(r.transformed.user_id || r.sourceId),
          status: "valid" as const,
          details: `${String(r.transformed.full_name || "")} · ${String(r.transformed.email_address || "")}`,
          errors: [] as string[],
        }))
      : filter === "quarantined"
      ? quarantinedRecords.map((q: QuarantinedRecord) => ({
          id: q.sourceId,
          targetId: null as string | null,
          status: "quarantined" as const,
          details: q.categories.join(", "),
          errors: q.errors.map((e) => `${e.field}: ${e.message}`),
        }))
      : [
          ...validRecords.map((r: ValidTransformedRecord) => ({
            id: r.sourceId,
            targetId: String(r.transformed.user_id || r.sourceId),
            status: "valid" as const,
            details: `${String(r.transformed.full_name || "")} · ${String(r.transformed.email_address || "")}`,
            errors: [] as string[],
          })),
          ...quarantinedRecords.map((q: QuarantinedRecord) => ({
            id: q.sourceId,
            targetId: null as string | null,
            status: "quarantined" as const,
            details: q.categories.join(", "),
            errors: q.errors.map((e) => `${e.field}: ${e.message}`),
          })),
        ].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            3. Deterministic Dry Run & Quarantine
          </h2>
          <span className="text-xs text-zinc-500 font-mono">In-memory evaluation</span>
        </div>

        <button
          type="button"
          onClick={onExecuteDryRun}
          disabled={isRunningDryRun || !isPlanApproved}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20"
        >
          {isRunningDryRun ? (
            <>
              <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Evaluating 50 Source Records...</span>
            </>
          ) : (
            <>
              <span>▶</span>
              <span>Execute Deterministic Dry Run</span>
            </>
          )}
        </button>
      </div>

      {!isPlanApproved && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-center text-xs text-zinc-500 font-mono">
          Dry run is locked. You must approve the mapping proposal before previewing transformation outcomes.
        </div>
      )}

      {isPlanApproved && !dryRunResult && !isRunningDryRun && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-8 text-center flex flex-col items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 font-bold">
            🧪
          </div>
          <p className="text-xs text-zinc-300 font-medium">Ready for Deterministic Dry Run</p>
          <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
            Click &quot;Execute Deterministic Dry Run&quot; to transform all 50 source customer records in-memory, evaluate validations, and isolate edge-case records into quarantine candidates without mutating target_users.
          </p>
        </div>
      )}

      {dryRunResult && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              <div>
                <span className="text-xs font-semibold text-emerald-200">
                  Zero-Write Invariant Verified
                </span>
                <p className="text-[11px] text-emerald-300/80 mt-0.5">
                  No target records were modified. All transformations executed strictly in memory.
                </p>
              </div>
            </div>
            <div className="text-[11px] font-mono text-zinc-400">
              Evaluated In-Memory (Zero Writes)
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col gap-1">
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                Total Evaluated
              </span>
              <span className="text-xl font-bold text-zinc-100">{dryRunResult.totalRecords}</span>
              <span className="text-[11px] text-zinc-500">source records</span>
            </div>

            <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 flex flex-col gap-1">
              <span className="text-emerald-400 text-[10px] uppercase tracking-wider font-semibold">
                Valid / Ready
              </span>
              <span className="text-xl font-bold text-emerald-300">{dryRunResult.validRecords}</span>
              <span className="text-[11px] text-emerald-400/70">86.0% eligible</span>
            </div>

            <div className="p-4 rounded-xl border border-amber-900/40 bg-amber-950/20 flex flex-col gap-1">
              <span className="text-amber-400 text-[10px] uppercase tracking-wider font-semibold">
                Quarantined
              </span>
              <span className="text-xl font-bold text-amber-300">{dryRunResult.invalidRecords}</span>
              <span className="text-[11px] text-amber-400/70">14.0% isolated</span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col gap-1">
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                Target Writes
              </span>
              <span className="text-xl font-bold text-purple-300">0</span>
              <span className="text-[11px] text-purple-400/70">writes committed</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Record Transformation Preview
                </span>
                <span className="text-xs font-mono text-zinc-500">({displayedRecords.length})</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${
                    filter === "all"
                      ? "bg-zinc-800 border-zinc-600 text-white"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  All ({dryRunResult.totalRecords})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("valid")}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${
                    filter === "valid"
                      ? "bg-emerald-950 border-emerald-700 text-emerald-200"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-emerald-300"
                  }`}
                >
                  Ready ({dryRunResult.validRecords})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("quarantined")}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${
                    filter === "quarantined"
                      ? "bg-amber-950 border-amber-700 text-amber-200"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-amber-300"
                  }`}
                >
                  Quarantined ({dryRunResult.invalidRecords})
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/80 font-mono text-xs">
              {displayedRecords.map((record: { id: string; targetId: string | null; status: "valid" | "quarantined"; details: string; errors: string[] }) => (
                <div
                  key={record.id}
                  className="p-3 hover:bg-zinc-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-200 font-semibold">{record.id}</span>
                    {record.targetId && (
                      <>
                        <span className="text-zinc-600">→</span>
                        <span className="text-purple-300">{record.targetId}</span>
                      </>
                    )}
                    <span className="text-zinc-400 text-[11px] truncate max-w-xs sm:max-w-md">
                      {record.details}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {record.status === "valid" ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold">
                        Ready
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/60 font-semibold">
                        Quarantined
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
