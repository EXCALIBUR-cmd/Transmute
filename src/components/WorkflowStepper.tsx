import React from "react";

export type WorkflowStageKey =
  | "schema"
  | "proposal"
  | "approval"
  | "dryrun"
  | "execution"
  | "reconciliation"
  | "recovery";

interface StageInfo {
  key: WorkflowStageKey;
  step: string;
  title: string;
  subtitle: string;
  status: "complete" | "active" | "available" | "locked";
}

interface WorkflowStepperProps {
  currentStage: WorkflowStageKey;
  onSelectStage: (stage: WorkflowStageKey) => void;
  hasSchema: boolean;
  hasProposal: boolean;
  isApproved: boolean;
  hasDryRun: boolean;
  hasExecuted: boolean;
  hasReconciled: boolean;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStage,
  onSelectStage,
  hasSchema,
  hasProposal,
  isApproved,
  hasDryRun,
  hasExecuted,
  hasReconciled,
}) => {
  const stages: StageInfo[] = [
    {
      key: "schema",
      step: "01",
      title: "Schema Inspection",
      subtitle: hasSchema ? "50 src / 5 tgt" : "Ready",
      status: hasSchema ? "complete" : currentStage === "schema" ? "active" : "available",
    },
    {
      key: "proposal",
      step: "02",
      title: "AI Proposal",
      subtitle: hasProposal ? "Mappings generated" : "Gemini Flash",
      status: hasProposal ? "complete" : currentStage === "proposal" ? "active" : "available",
    },
    {
      key: "approval",
      step: "03",
      title: "Human Approval",
      subtitle: isApproved ? "Approved by engineer" : "Trust Boundary",
      status: isApproved ? "complete" : currentStage === "approval" ? "active" : "available",
    },
    {
      key: "dryrun",
      step: "04",
      title: "Deterministic Dry Run",
      subtitle: hasDryRun ? "Zero writes verified" : "In-Memory Test",
      status: hasDryRun ? "complete" : currentStage === "dryrun" ? "active" : isApproved ? "available" : "locked",
    },
    {
      key: "execution",
      step: "05",
      title: "Migration Execution",
      subtitle: hasExecuted ? "Target updated" : "Deterministic Write",
      status: hasExecuted ? "complete" : currentStage === "execution" ? "active" : isApproved ? "available" : "locked",
    },
    {
      key: "reconciliation",
      step: "06",
      title: "Reconciliation",
      subtitle: hasReconciled ? "State verified" : "Read-Only Audit",
      status: hasReconciled ? "complete" : currentStage === "reconciliation" ? "active" : hasExecuted ? "available" : "locked",
    },
    {
      key: "recovery",
      step: "07",
      title: "History & Recovery",
      subtitle: "Run-Scoped Rollback",
      status: currentStage === "recovery" ? "active" : "available",
    },
  ];

  return (
    <nav
      aria-label="Migration Workflow Progress"
      className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2"
    >
      {stages.map((stage) => {
        const isCurrent = currentStage === stage.key;
        const isLocked = stage.status === "locked";

        let cardClasses = "bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200";
        let statusBadge = <span className="text-[10px] text-zinc-500">○ Pending</span>;

        if (stage.status === "complete") {
          cardClasses = "bg-zinc-900/60 border-emerald-900/40 text-zinc-300 hover:border-emerald-700/60";
          statusBadge = <span className="text-[10px] text-emerald-400 font-semibold">✓ Completed</span>;
        }

        if (isCurrent) {
          cardClasses = "bg-indigo-950/40 border-indigo-500/70 text-white shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/40";
          statusBadge = <span className="text-[10px] text-indigo-300 font-bold animate-pulse">● Active</span>;
        }

        if (isLocked) {
          cardClasses = "bg-zinc-950/30 border-zinc-900 text-zinc-600 opacity-60 cursor-not-allowed";
          statusBadge = <span className="text-[10px] text-zinc-600">🔒 Locked</span>;
        }

        return (
          <button
            key={stage.key}
            type="button"
            disabled={isLocked}
            onClick={() => onSelectStage(stage.key)}
            className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between gap-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${cardClasses}`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 font-bold">
                {stage.step}
              </span>
              {statusBadge}
            </div>

            <div>
              <div className="text-xs font-semibold tracking-tight truncate leading-tight">
                {stage.title}
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5 truncate">
                {stage.subtitle}
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );
};
