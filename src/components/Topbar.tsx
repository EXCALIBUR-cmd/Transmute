import React from "react";

interface TopbarProps {
  sourceCount: number;
  targetCount: number;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  sourceCount,
  targetCount,
  subtitle,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30 text-base select-none">
            ⚗
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-wider text-white">TRANSMUTE</span>
              <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 font-semibold">
                v0.8.0
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-normal">
              {subtitle || "Controlled Migration Workbench · Stage 4: Human Review & Approval"}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
            <span>Atlas Connected</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-400">
            <span>Source:</span>
            <span className="text-white font-bold">{sourceCount}</span>
            <span>customers</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-400">
            <span>Target:</span>
            <span className="text-emerald-400 font-semibold">{targetCount} users</span>
            {targetCount === 0 && (
              <span className="text-emerald-500/70">(Locked)</span>
            )}
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh database counts"
              className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
            >
              <span className={`inline-block ${isRefreshing ? "animate-spin" : ""}`}>↻</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
