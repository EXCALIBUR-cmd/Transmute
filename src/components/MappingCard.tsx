import React from "react";
import { FieldMapping } from "@/types/mapping";

interface MappingCardProps {
  mapping: FieldMapping;
}

export const MappingCard: React.FC<MappingCardProps> = ({ mapping }) => {
  const isHighConfidence = mapping.confidence >= 1.0;
  const isMedConfidence = mapping.confidence >= 0.9;

  const confStyles = isHighConfidence
    ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/60"
    : isMedConfidence
    ? "bg-blue-950/80 text-blue-300 border-blue-800/60"
    : "bg-amber-950/80 text-amber-300 border-amber-800/60";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1 font-mono text-xs">
            {mapping.sourceFields.map((sf, idx) => (
              <span
                key={sf}
                className="px-2.5 py-1 rounded-md bg-cyan-950/60 text-cyan-200 border border-cyan-800/60 font-semibold shadow-xs"
              >
                {sf}
                {idx < mapping.sourceFields.length - 1 && " + "}
              </span>
            ))}
          </div>

          <span className="text-zinc-500 text-sm font-bold">→</span>

          <span className="px-2.5 py-1 rounded-md bg-purple-950/60 text-purple-200 border border-purple-800/60 font-mono text-xs font-semibold shadow-xs">
            {mapping.targetField}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
            {mapping.transformation}
          </span>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-zinc-400">Confidence:</span>
            <span
              className={`px-2 py-0.5 rounded font-bold text-[11px] border ${confStyles}`}
            >
              {(mapping.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      <div className="text-xs text-zinc-400 bg-zinc-950/50 rounded-lg p-2.5 border border-zinc-800/60">
        <span className="text-zinc-500 font-mono text-[11px] uppercase mr-2 font-semibold">
          Rationale:
        </span>
        {mapping.rationale}
      </div>
    </div>
  );
};
