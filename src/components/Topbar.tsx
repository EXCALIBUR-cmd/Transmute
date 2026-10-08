import React from "react";

interface TopbarProps {
  sourceCount: number;
  targetCount: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  sourceCount,
  targetCount,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 text-lg">
            ⚗
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-wider text-zinc-100">TRANSMUTE</span>
              <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                v0.8.0
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Controlled Migration Workbench · LLMs propose, humans approve, deterministic code executes
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-300">Atlas Connected</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-400">Source:</span>
            <span className="text-cyan-300 font-semibold">{sourceCount} customers</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
            <span className="text-zinc-400">Target:</span>
            <span className="text-purple-300 font-semibold">{targetCount} users</span>
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
