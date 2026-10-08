import React from "react";
import { InspectionResult } from "@/types/schema";

interface SchemaPanelProps {
  data: InspectionResult | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const SchemaPanel: React.FC<SchemaPanelProps> = ({
  data,
  isLoading,
  onRefresh,
}) => {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            1. Schema Inspection & Structural Comparison
          </h2>
          <span className="text-xs text-zinc-500 font-mono">Mongoose live inspection</span>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 font-mono transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <span className={`inline-block ${isLoading ? "animate-spin" : ""}`}>↻</span>
          <span>{isLoading ? "Inspecting..." : "Refresh Schemas"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
              <span className="font-mono text-sm font-semibold text-zinc-200">
                {data?.source.collection || "source_customers"}
              </span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/80">
              Source Database
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {isLoading ? (
              <div className="py-10 text-center text-xs text-zinc-500 font-mono">
                Loading source schema metadata...
              </div>
            ) : (
              data?.source.fields.map((field) => (
                <div
                  key={field.name}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 font-mono text-xs hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500/70" />
                    <span className="text-zinc-200 font-medium">{field.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-[11px]">{field.type}</span>
                    {field.required ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800/50">
                        required
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800/80 text-zinc-400">
                        optional
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
              <span className="font-mono text-sm font-semibold text-zinc-200">
                {data?.target.collection || "target_users"}
              </span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-950/70 text-purple-300 border border-purple-800/80">
              Target Database
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {isLoading ? (
              <div className="py-10 text-center text-xs text-zinc-500 font-mono">
                Loading target schema metadata...
              </div>
            ) : (
              data?.target.fields.map((field) => (
                <div
                  key={field.name}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 font-mono text-xs hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500/70" />
                    <span className="text-zinc-200 font-medium">{field.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-[11px]">{field.type}</span>
                    {field.required ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800/50">
                        required
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800/80 text-zinc-400">
                        optional
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {data?.comparison && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 uppercase text-[10px] font-bold">Structural Divergence:</span>
            <span>{data.comparison.sourceOnly.length} source-only</span>
            <span>·</span>
            <span>{data.comparison.targetOnly.length} target-only</span>
            <span>·</span>
            <span>{data.comparison.sameName.length} direct name matches</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Semantic AI reasoning required for field alignment
          </div>
        </div>
      )}
    </section>
  );
};
