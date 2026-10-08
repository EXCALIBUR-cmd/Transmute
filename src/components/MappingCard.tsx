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
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 flex flex-col gap-2.5 hover:border-zinc-700/80 transition-colors shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            {mapping.sourceFields.map((sf, idx) => (
              <span
                key={sf}
                className="px-2.5 py-1 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold"
              >
                {sf}{idx < mapping.sourceFields.length - 1 ? " +" : ""}
              </span>
            ))}
          </div>

          <span className="text-zinc-600 text-sm font-bold mx-0.5">→</span>

          <span className="px-2.5 py-1 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono text-xs font-semibold">
            {mapping.targetField}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-zinc-900/90 text-zinc-300 border border-zinc-700/70">
            {mapping.transformation}
          </span>
          <div className="flex items-center gap-1 font-mono text-xs">
            <span className="text-zinc-400">Confidence:</span>
            <span
              className={`px-2 py-0.5 rounded font-bold text-[11px] border ${confStyles}`}
            >
              {(mapping.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      <div className="text-xs text-zinc-300 bg-zinc-950/60 rounded-lg p-2.5 border border-zinc-900 font-mono">
        <span className="text-zinc-500 font-mono text-[11px] uppercase mr-2 tracking-wider font-semibold">
          RATIONALE:
        </span>
        {mapping.rationale}
      </div>
    </div>
  );
};
