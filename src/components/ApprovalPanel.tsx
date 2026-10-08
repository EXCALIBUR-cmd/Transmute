import React, { useState } from "react";
import { MappingPlan } from "@/types/plan";
import { StatusBadge } from "@/components/StatusBadge";

interface ApprovalPanelProps {
  plan: MappingPlan;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  isApproving: boolean;
  isRejecting: boolean;
}

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
  plan,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}) => {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleConfirmReject = async () => {
    await onReject(rejectionReason);
    setShowRejectDialog(false);
    setRejectionReason("");
  };

  const isPending = plan.status === "pending";
  const isApproved = plan.status === "approved";
  const isRejected = plan.status === "rejected";

  let containerStyles = "border-amber-500/40 bg-amber-950/20";
  let iconBadge = "bg-amber-900/60 border-amber-600/50 text-amber-300";
  let iconText = "!";

  if (isApproved) {
    containerStyles = "border-emerald-500/40 bg-emerald-950/20";
    iconBadge = "bg-emerald-900/60 border-emerald-600/50 text-emerald-400";
    iconText = "✓";
  } else if (isRejected) {
    containerStyles = "border-rose-500/40 bg-rose-950/20";
    iconBadge = "bg-rose-900/60 border-rose-600/50 text-rose-400";
    iconText = "✕";
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${containerStyles}`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-base border select-none shrink-0 ${iconBadge}`}
          >
            {iconText}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-100">
                {isApproved
                  ? "Mapping Plan Approved"
                  : isRejected
                  ? "Mapping Plan Rejected"
                  : "Pending Human Review"}
              </span>
              <StatusBadge status={plan.status} size="sm" />
            </div>

            <p className="text-xs text-zinc-400 mt-0.5">
              {isApproved
                ? "Plan approved by human engineer. Proposal is locked. Migration execution is deferred."
                : isRejected
                ? `Plan rejected: ${plan.rejectionReason || "No explicit reason specified."}`
                : "Review confidence scores and edge risks below. Explicit human approval is required before execution can occur."}
            </p>

            <div className="text-[11px] font-mono text-zinc-500 mt-1 flex flex-wrap gap-4">
              <span>
                ID: <code className="text-zinc-300">{plan.id}</code>
              </span>
              <span>Created: {new Date(plan.createdAt).toLocaleString()}</span>
              {plan.reviewedAt && (
                <span>Reviewed: {new Date(plan.reviewedAt).toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isPending && (
            <>
              <button
                type="button"
                onClick={() => setShowRejectDialog(true)}
                disabled={isRejecting || isApproving}
                className="px-3.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 font-medium text-xs transition-colors disabled:opacity-50"
              >
                {isRejecting ? "Rejecting..." : "Reject Mapping"}
              </button>

              <button
                type="button"
                onClick={onApprove}
                disabled={isApproving || isRejecting}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isApproving ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>Approve Mapping</span>
                  </>
                )}
              </button>
            </>
          )}

          {!isPending && (
            <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-750 text-zinc-400 select-none">
              State Finalized
            </div>
          )}
        </div>
      </div>

      {showRejectDialog && (
        <div className="rounded-xl border border-rose-500/50 bg-zinc-950 p-5 flex flex-col gap-3 shadow-lg">
          <h4 className="font-semibold text-sm text-rose-200">Reject Mapping Proposal</h4>
          <p className="text-xs text-zinc-400">
            Provide an optional reason for the audit trail. Once rejected, this plan cannot be approved.
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Incompatible transformation for birth year, or manual override required..."
            rows={2}
            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-rose-500"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowRejectDialog(false)}
              className="px-3 py-1.5 rounded-md bg-zinc-900 text-zinc-300 text-xs border border-zinc-800 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              disabled={isRejecting}
              className="px-4 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium disabled:opacity-50"
            >
              {isRejecting ? "Confirming..." : "Confirm Rejection"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
