import React from "react";

interface RiskPanelProps {
  risks: string[];
}

export const RiskPanel: React.FC<RiskPanelProps> = ({ risks }) => {
  if (!risks || risks.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 flex flex-col gap-2 shadow-xs">
      <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs tracking-wide">
        <span className="text-amber-400">⚠</span>
        <span className="uppercase font-mono text-[11px] font-bold">
          Identified AI Risks & Edge Considerations ({risks.length})
        </span>
      </div>
      <ul className="list-disc list-inside text-xs text-amber-200/90 flex flex-col gap-1 pl-1 font-mono">
        {risks.map((risk, idx) => (
          <li key={idx}>{risk}</li>
        ))}
      </ul>
    </div>
  );
};
