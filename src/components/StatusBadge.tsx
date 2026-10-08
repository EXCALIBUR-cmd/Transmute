import React from "react";

export type WorkbenchStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "running"
  | "completed"
  | "failed"
  | "reconciled"
  | "rolled_back"
  | "rollback_partial"
  | "rollback_failed"
  | "skipped"
  | "conflict"
  | "quarantined"
  | "migrated"
  | "created";

interface StatusBadgeProps {
  status: WorkbenchStatus | string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "md",
  className = "",
}) => {
  const norm = (status || "unknown").toLowerCase();

  let styles = "bg-zinc-800/80 text-zinc-300 border-zinc-700/80";
  let label = norm;
  let dotColor = "bg-zinc-400";

  switch (norm) {
    case "approved":
    case "completed":
    case "migrated":
    case "created":
      styles = "bg-emerald-950/60 text-emerald-300 border-emerald-800/60";
      dotColor = "bg-emerald-400";
      label = norm === "completed" ? "Completed" : norm === "approved" ? "Approved" : norm;
      break;
    case "reconciled":
      styles = "bg-emerald-900/40 text-emerald-200 border-emerald-500/60 shadow-sm shadow-emerald-950";
      dotColor = "bg-emerald-400 animate-pulse";
      label = "Reconciled";
      break;
    case "pending":
      styles = "bg-amber-950/60 text-amber-300 border-amber-800/60";
      dotColor = "bg-amber-400";
      label = "Pending Review";
      break;
    case "running":
      styles = "bg-indigo-950/60 text-indigo-300 border-indigo-700/80";
      dotColor = "bg-indigo-400 animate-ping";
      label = "Running";
      break;
    case "rejected":
    case "failed":
    case "rollback_failed":
      styles = "bg-rose-950/60 text-rose-300 border-rose-800/60";
      dotColor = "bg-rose-400";
      label = norm === "rollback_failed" ? "Rollback Failed" : norm === "rejected" ? "Rejected" : "Failed";
      break;
    case "rolled_back":
      styles = "bg-purple-950/60 text-purple-300 border-purple-800/60";
      dotColor = "bg-purple-400";
      label = "Rolled Back";
      break;
    case "rollback_partial":
      styles = "bg-orange-950/60 text-orange-300 border-orange-800/60";
      dotColor = "bg-orange-400";
      label = "Rollback Partial";
      break;
    case "skipped":
      styles = "bg-zinc-800/70 text-zinc-400 border-zinc-700";
      dotColor = "bg-zinc-400";
      label = "Skipped";
      break;
    case "conflict":
      styles = "bg-orange-950/60 text-orange-300 border-orange-700/70";
      dotColor = "bg-orange-400";
      label = "Conflict";
      break;
    case "quarantined":
      styles = "bg-amber-950/60 text-amber-300 border-amber-700/70";
      dotColor = "bg-amber-400";
      label = "Quarantined";
      break;
  }

  const sizeClass =
    size === "sm"
      ? "text-[10px] px-1.5 py-0.5 gap-1 font-mono tracking-wider uppercase font-semibold"
      : size === "lg"
      ? "text-xs px-3 py-1 gap-2 font-mono tracking-wider uppercase font-bold"
      : "text-[11px] px-2 py-0.5 gap-1.5 font-mono tracking-wider uppercase font-semibold";

  return (
    <span
      className={`inline-flex items-center rounded-md border ${sizeClass} ${styles} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
    </span>
  );
};
