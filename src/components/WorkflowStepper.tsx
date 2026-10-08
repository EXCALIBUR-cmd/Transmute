import React from "react";

export type WorkflowStageKey =
  | "schema"
  | "proposal"
  | "approval"
  | "dryrun"
  | "execution"
  | "reconciliation"
  | "recovery";

export type WorkflowStageStatus =
  | "completed"
  | "approved"
  | "reconciled"
  | "pending"
  | "available"
  | "locked"
  | "failed";

export interface StageInfo {
  key: WorkflowStageKey;
  step: string;
  title: string;
  subtitle: string;
  workflowStatus: WorkflowStageStatus;
}

interface WorkflowStepperProps {
  currentStage: WorkflowStageKey;
  onSelectStage: (stage: WorkflowStageKey) => void;
  stageStatuses: Record<WorkflowStageKey, WorkflowStageStatus>;
  stageSubtitles?: Partial<Record<WorkflowStageKey, string>>;
  hasSchema?: boolean;
  hasProposal?: boolean;
  isApproved?: boolean;
  hasDryRun?: boolean;
  hasExecuted?: boolean;
  hasReconciled?: boolean;
}

function renderStatusBadge(status: WorkflowStageStatus) {
  switch (status) {
    case "completed":
      return (
        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
          <span>✓</span>
          <span>Completed</span>
        </span>
      );
    case "approved":
      return (
        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
          <span>✓</span>
          <span>Approved</span>
        </span>
      );
    case "reconciled":
      return (
        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
          <span>✓</span>
          <span>Reconciled</span>
        </span>
      );
    case "pending":
      return (
        <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
          <span>○</span>
          <span>Pending</span>
        </span>
      );
    case "available":
      return (
        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
          <span>○</span>
          <span>Available</span>
        </span>
      );
    case "failed":
      return (
        <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
          <span>✕</span>
          <span>Failed</span>
        </span>
      );
    case "locked":
    default:
      return (
        <span className="text-[10px] text-zinc-600 flex items-center gap-1">
          <span>🔒</span>
          <span>Locked</span>
        </span>
      );
  }
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStage,
  onSelectStage,
  stageStatuses,
  stageSubtitles = {},
}) => {
  const defaultSubtitles: Record<WorkflowStageKey, string> = {
    schema: "50 src / 5 tgt",
    proposal: "Mappings generated",
    approval: "Trust Boundary",
    dryrun: "In-Memory Test",
    execution: "Deterministic Write",
    reconciliation: "Read-Only Audit",
    recovery: "Run-Scoped Rollback",
  };

  const stages: StageInfo[] = [
    {
      key: "schema",
      step: "01",
      title: "Schema Inspection",
      subtitle: stageSubtitles.schema || defaultSubtitles.schema,
      workflowStatus: stageStatuses.schema,
    },
    {
      key: "proposal",
      step: "02",
      title: "AI Proposal",
      subtitle: stageSubtitles.proposal || defaultSubtitles.proposal,
      workflowStatus: stageStatuses.proposal,
    },
    {
      key: "approval",
      step: "03",
      title: "Human Approval",
      subtitle: stageSubtitles.approval || defaultSubtitles.approval,
      workflowStatus: stageStatuses.approval,
    },
    {
      key: "dryrun",
      step: "04",
      title: "Deterministic Dry Run",
      subtitle: stageSubtitles.dryrun || defaultSubtitles.dryrun,
      workflowStatus: stageStatuses.dryrun,
    },
    {
      key: "execution",
      step: "05",
      title: "Migration Execution",
      subtitle: stageSubtitles.execution || defaultSubtitles.execution,
      workflowStatus: stageStatuses.execution,
    },
    {
      key: "reconciliation",
      step: "06",
      title: "Reconciliation",
      subtitle: stageSubtitles.reconciliation || defaultSubtitles.reconciliation,
      workflowStatus: stageStatuses.reconciliation,
    },
    {
      key: "recovery",
      step: "07",
      title: "History & Recovery",
      subtitle: stageSubtitles.recovery || defaultSubtitles.recovery,
      workflowStatus: stageStatuses.recovery,
    },
  ];

  return (
    <nav
      aria-label="Migration Workflow Progress"
      className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2"
    >
      {stages.map((stage) => {
        const isSelected = currentStage === stage.key;
        const isLocked = stage.workflowStatus === "locked";

        let cardClasses = "";

        if (isSelected) {
          cardClasses =
            "bg-indigo-950/40 border-indigo-500/80 text-white shadow-lg shadow-indigo-950/50 ring-2 ring-indigo-500/60";
        } else if (
          stage.workflowStatus === "completed" ||
          stage.workflowStatus === "approved" ||
          stage.workflowStatus === "reconciled"
        ) {
          cardClasses =
            "bg-zinc-900/60 border-emerald-900/40 text-zinc-300 hover:border-emerald-700/60 hover:text-white";
        } else if (stage.workflowStatus === "pending") {
          cardClasses =
            "bg-zinc-900/40 border-amber-800/40 text-zinc-300 hover:border-amber-700/60 hover:text-white";
        } else if (stage.workflowStatus === "failed") {
          cardClasses =
            "bg-zinc-900/40 border-rose-800/40 text-zinc-300 hover:border-rose-700/60";
        } else if (isLocked) {
          cardClasses =
            "bg-zinc-950/30 border-zinc-900 text-zinc-600 opacity-60 cursor-not-allowed";
        } else {
          cardClasses =
            "bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200";
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
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-mono tracking-widest font-bold ${
                    isSelected ? "text-indigo-300" : "text-zinc-500"
                  }`}
                >
                  {stage.step}
                </span>
                {isSelected && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse"
                    aria-label="Active selection"
                  />
                )}
              </div>
              {renderStatusBadge(stage.workflowStatus)}
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
