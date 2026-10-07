"use client";

import { useState, useEffect, useCallback } from "react";
import { InspectionResult } from "@/types/schema";
import { MappingProposal } from "@/types/mapping";
import { MappingPlan } from "@/types/plan";

export default function Home() {
  const [schemaData, setSchemaData] = useState<InspectionResult | null>(null);
  const [activePlan, setActivePlan] = useState<MappingPlan | null>(null);
  const [recentPlans, setRecentPlans] = useState<MappingPlan[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState<boolean>(true);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState<boolean>(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);
  const [isSubmittingRejection, setIsSubmittingRejection] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<{ title: string; detail: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const loadSchemas = useCallback(async () => {
    setIsLoadingSchema(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/schema/inspect");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to inspect schema (HTTP ${res.status})`);
      }
      const data: InspectionResult = await res.json();
      setSchemaData(data);
    } catch (err) {
      setErrorMessage({
        title: "Schema Inspection Failed",
        detail: err instanceof Error ? err.message : "Unable to reach schema inspection endpoint",
      });
    } finally {
      setIsLoadingSchema(false);
    }
  }, []);

  const loadRecentPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/mapping/plans");
      if (res.ok) {
        const data = await res.json();
        if (data.plans && Array.isArray(data.plans) && data.plans.length > 0) {
          setRecentPlans(data.plans);
          setActivePlan(data.plans[0]);
        }
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    loadSchemas();
    loadRecentPlans();
  }, [loadSchemas, loadRecentPlans]);

  const handleGenerateProposal = async () => {
    if (!schemaData) return;
    setIsGeneratingProposal(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const proposeRes = await fetch("/api/mapping/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: schemaData.source,
          target: schemaData.target,
        }),
      });

      if (!proposeRes.ok) {
        const err = await proposeRes.json().catch(() => ({}));
        throw new Error(err.error || `Proposal generation failed (HTTP ${proposeRes.status})`);
      }

      const proposal: MappingProposal = await proposeRes.json();

      const persistRes = await fetch("/api/mapping/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCollection: schemaData.source.collection,
          targetCollection: schemaData.target.collection,
          proposal,
        }),
      });

      if (!persistRes.ok) {
        const err = await persistRes.json().catch(() => ({}));
        throw new Error(err.error || `Failed to persist mapping plan (HTTP ${persistRes.status})`);
      }

      const newPlan: MappingPlan = await persistRes.json();
      setActivePlan(newPlan);
      setRecentPlans((prev) => [newPlan, ...prev.filter((p) => p.id !== newPlan.id)]);
      setSuccessMessage("AI proposal generated and persisted as Pending Human Review.");
    } catch (err) {
      setErrorMessage({
        title: "Proposal Generation Error",
        detail: err instanceof Error ? err.message : "An unexpected failure occurred while generating proposal",
      });
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  const handleApprove = async () => {
    if (!activePlan || activePlan.status !== "pending") return;
    setIsSubmittingApproval(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/mapping/plans/${activePlan.id}/approve`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Approval failed (HTTP ${res.status})`);
      }

      const updated: MappingPlan = await res.json();
      setActivePlan(updated);
      setRecentPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSuccessMessage("Mapping proposal approved. State persisted. (Migration execution locked)");
    } catch (err) {
      setErrorMessage({
        title: "Approval Failed",
        detail: err instanceof Error ? err.message : "Unable to submit approval",
      });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleReject = async () => {
    if (!activePlan || activePlan.status !== "pending") return;
    setIsSubmittingRejection(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/mapping/plans/${activePlan.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: rejectionReason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Rejection failed (HTTP ${res.status})`);
      }

      const updated: MappingPlan = await res.json();
      setActivePlan(updated);
      setRecentPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setShowRejectDialog(false);
      setRejectionReason("");
      setSuccessMessage("Mapping proposal rejected. State persisted for audit.");
    } catch (err) {
      setErrorMessage({
        title: "Rejection Failed",
        detail: err instanceof Error ? err.message : "Unable to submit rejection",
      });
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
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
                  v0.4.0
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Controlled Migration Workbench · Stage 4: Human Review & Approval
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-zinc-300">Atlas Connected</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-400">Source:</span>
              <span className="text-zinc-200 font-semibold">50 customers</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-400">Target:</span>
              <span className="text-emerald-400 font-semibold">0 users (Locked)</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-3 rounded-lg border bg-zinc-900/60 border-zinc-800 text-zinc-400">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Stage 1 & 2</div>
            <div className="text-zinc-200 font-medium mt-0.5">Schema Inspection</div>
            <div className="text-[10px] text-emerald-400 mt-1">✓ Complete</div>
          </div>
          <div className="p-3 rounded-lg border bg-zinc-900/60 border-zinc-800 text-zinc-400">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Stage 3</div>
            <div className="text-zinc-200 font-medium mt-0.5">AI Proposal Engine</div>
            <div className="text-[10px] text-emerald-400 mt-1">✓ Gemini Flash</div>
          </div>
          <div className="p-3 rounded-lg border bg-indigo-950/40 border-indigo-500/50 text-indigo-300 shadow-sm shadow-indigo-950">
            <div className="text-[10px] text-indigo-400 uppercase tracking-widest font-semibold">Stage 4 (Current)</div>
            <div className="text-white font-medium mt-0.5">Human Approval Layer</div>
            <div className="text-[10px] text-indigo-300 mt-1">● Active Trust Boundary</div>
          </div>
          <div className="p-3 rounded-lg border bg-zinc-900/30 border-zinc-900 text-zinc-600 opacity-70">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Stage 5 & 6</div>
            <div className="text-zinc-500 font-medium mt-0.5">Deterministic Execution</div>
            <div className="text-[10px] text-zinc-600 mt-1">🔒 Locked (Future Scope)</div>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-4 text-rose-200 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-rose-400 text-base mt-0.5">⚠</span>
              <div>
                <h3 className="font-semibold text-sm text-rose-100">{errorMessage.title}</h3>
                <p className="text-xs text-rose-300/90 mt-1 font-mono">{errorMessage.detail}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 text-xs px-2 py-1 rounded bg-rose-900/30 border border-rose-800/50"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-200 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 text-base mt-0.5">✓</span>
              <div>
                <h3 className="font-semibold text-sm text-emerald-100">Workflow State Updated</h3>
                <p className="text-xs text-emerald-300/90 mt-1">{successMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs px-2 py-1 rounded bg-emerald-900/30 border border-emerald-800/50"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                1. Schema Inspection
              </h2>
              <span className="text-xs text-zinc-500">Mongoose metadata</span>
            </div>
            <button
              onClick={loadSchemas}
              disabled={isLoadingSchema}
              className="text-xs px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 font-mono transition-colors disabled:opacity-50"
            >
              {isLoadingSchema ? "Inspecting..." : "Refresh Schemas"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
                  <span className="font-mono text-sm font-semibold text-zinc-200">
                    {schemaData?.source.collection || "source_customers"}
                  </span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-cyan-400 border border-zinc-700">
                  Source Database
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {isLoadingSchema ? (
                  <div className="py-8 text-center text-xs text-zinc-500 font-mono">
                    Loading source schema metadata...
                  </div>
                ) : (
                  schemaData?.source.fields.map((field) => (
                    <div
                      key={field.name}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-950/50 border border-zinc-800/60 font-mono text-xs"
                    >
                      <span className="text-zinc-200 font-medium">{field.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400 text-[11px]">{field.type}</span>
                        {field.required ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950/60 text-red-300 border border-red-800/50">
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

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                  <span className="font-mono text-sm font-semibold text-zinc-200">
                    {schemaData?.target.collection || "target_users"}
                  </span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-purple-400 border border-zinc-700">
                  Target Database
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {isLoadingSchema ? (
                  <div className="py-8 text-center text-xs text-zinc-500 font-mono">
                    Loading target schema metadata...
                  </div>
                ) : (
                  schemaData?.target.fields.map((field) => (
                    <div
                      key={field.name}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-950/50 border border-zinc-800/60 font-mono text-xs"
                    >
                      <span className="text-zinc-200 font-medium">{field.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400 text-[11px]">{field.type}</span>
                        {field.required ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950/60 text-red-300 border border-red-800/50">
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
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                2. AI Mapping Proposal & Review
              </h2>
              <span className="text-xs text-zinc-500">Semantic reasoning candidate</span>
            </div>
            <button
              onClick={handleGenerateProposal}
              disabled={isGeneratingProposal || !schemaData}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/20"
            >
              {isGeneratingProposal ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Querying Gemini Model...</span>
                </>
              ) : (
                <>
                  <span>✦</span>
                  <span>Generate AI Mapping Proposal</span>
                </>
              )}
            </button>
          </div>

          {isGeneratingProposal && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/10 p-12 text-center flex flex-col items-center justify-center gap-4">
              <div className="h-10 w-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <div>
                <h3 className="font-semibold text-base text-indigo-200">Analyzing Schemas with Gemini</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                  Generating candidate field transformations, computing confidence scores, and identifying migration risks...
                </p>
              </div>
            </div>
          )}

          {!isGeneratingProposal && !activePlan && (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 text-xl font-bold">
                ⚗
              </div>
              <h3 className="font-semibold text-sm text-zinc-200">No mapping proposal generated yet</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Inspect the schemas above, then click &quot;Generate AI Mapping Proposal&quot; to prompt Gemini for semantic transformations. AI proposals require explicit human approval before execution.
              </p>
            </div>
          )}

          {!isGeneratingProposal && activePlan && (
            <div className="flex flex-col gap-6">
              <div
                className={`rounded-xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  activePlan.status === "approved"
                    ? "border-emerald-500/40 bg-emerald-950/20"
                    : activePlan.status === "rejected"
                    ? "border-rose-500/40 bg-rose-950/20"
                    : "border-amber-500/40 bg-amber-950/20"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                      activePlan.status === "approved"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : activePlan.status === "rejected"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {activePlan.status === "approved"
                      ? "✓"
                      : activePlan.status === "rejected"
                      ? "✕"
                      : "!"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">
                        {activePlan.status === "approved"
                          ? "Mapping Plan Approved"
                          : activePlan.status === "rejected"
                          ? "Mapping Plan Rejected"
                          : "Pending Human Review"}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold tracking-wider ${
                          activePlan.status === "approved"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : activePlan.status === "rejected"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {activePlan.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1">
                      {activePlan.status === "approved"
                        ? "Plan approved by human engineer. Proposal is locked. Migration execution is deferred."
                        : activePlan.status === "rejected"
                        ? `Plan rejected: ${activePlan.rejectionReason || "No explicit reason specified."}`
                        : "Review confidence scores and risks below. Explicit human approval is required to proceed."}
                    </p>
                    <div className="text-[11px] font-mono text-zinc-400 mt-2 flex flex-wrap gap-4">
                      <span>ID: <code className="text-zinc-300">{activePlan.id}</code></span>
                      <span>Created: {new Date(activePlan.createdAt).toLocaleString()}</span>
                      {activePlan.reviewedAt && (
                        <span>Reviewed: {new Date(activePlan.reviewedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {activePlan.status === "pending" && (
                    <>
                      <button
                        onClick={() => setShowRejectDialog(true)}
                        disabled={isSubmittingRejection || isSubmittingApproval}
                        className="px-4 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 font-medium text-xs transition-colors disabled:opacity-50"
                      >
                        {isSubmittingRejection ? "Rejecting..." : "Reject Mapping"}
                      </button>
                      <button
                        onClick={handleApprove}
                        disabled={isSubmittingApproval || isSubmittingRejection}
                        className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSubmittingApproval ? (
                          <>
                            <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
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

                  {activePlan.status !== "pending" && (
                    <div className="text-xs font-mono px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      State Finalized
                    </div>
                  )}
                </div>
              </div>

              {showRejectDialog && (
                <div className="rounded-xl border border-rose-500/50 bg-zinc-950 p-5 flex flex-col gap-3">
                  <h4 className="font-semibold text-sm text-rose-200">Reject Mapping Proposal</h4>
                  <p className="text-xs text-zinc-400">
                    Provide an optional rejection reason. Once rejected, this plan cannot be approved.
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
                      onClick={() => setShowRejectDialog(false)}
                      className="px-3 py-1.5 rounded-md bg-zinc-900 text-zinc-300 text-xs border border-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={isSubmittingRejection}
                      className="px-4 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium"
                    >
                      {isSubmittingRejection ? "Confirming..." : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Field-to-Field Mapping Candidates ({activePlan.proposal.mappings.length})
                </h3>
                <div className="flex flex-col gap-3">
                  {activePlan.proposal.mappings.map((mapping, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center flex-wrap gap-2">
                          <div className="flex items-center gap-1 font-mono text-xs">
                            {mapping.sourceFields.map((sf, sIdx) => (
                              <span
                                key={sf}
                                className="px-2.5 py-1 rounded-md bg-cyan-950/60 text-cyan-200 border border-cyan-800/60 font-semibold"
                              >
                                {sf}
                                {sIdx < mapping.sourceFields.length - 1 && " + "}
                              </span>
                            ))}
                          </div>
                          <span className="text-zinc-500 text-sm font-bold">→</span>
                          <span className="px-2.5 py-1 rounded-md bg-purple-950/60 text-purple-200 border border-purple-800/60 font-mono text-xs font-semibold">
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
                              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                mapping.confidence >= 1.0
                                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
                                  : mapping.confidence >= 0.9
                                  ? "bg-blue-950/80 text-blue-300 border border-blue-800/60"
                                  : "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                              }`}
                            >
                              {(mapping.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-zinc-400 bg-zinc-950/40 rounded-lg p-2.5 border border-zinc-800/60">
                        <span className="text-zinc-500 font-mono text-[11px] uppercase mr-2">Rationale:</span>
                        {mapping.rationale}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {activePlan.proposal.risks.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                    <span>⚠</span>
                    <span>Identified AI Risks & Edge Considerations ({activePlan.proposal.risks.length})</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-amber-200/90 flex flex-col gap-1 pl-1">
                    {activePlan.proposal.risks.map((risk, idx) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-3">
                  <span className="text-zinc-500 uppercase text-[10px] block mb-1">
                    Unmapped Source Fields
                  </span>
                  {activePlan.proposal.unmappedSourceFields.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {activePlan.proposal.unmappedSourceFields.map((f) => (
                        <span key={f} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-600">None (all source fields accounted for)</span>
                  )}
                </div>

                <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-3">
                  <span className="text-zinc-500 uppercase text-[10px] block mb-1">
                    Unmapped Target Fields
                  </span>
                  {activePlan.proposal.unmappedTargetFields.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {activePlan.proposal.unmappedTargetFields.map((f) => (
                        <span key={f} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-600">None (all target fields accounted for)</span>
                  )}
                </div>
              </div>

              {recentPlans.length > 1 && (
                <div className="border-t border-zinc-800/80 pt-4 flex flex-col gap-2">
                  <span className="text-xs font-mono uppercase text-zinc-500">
                    Persisted Plan History ({recentPlans.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {recentPlans.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setActivePlan(p)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-2 ${
                          activePlan.id === p.id
                            ? "bg-zinc-800 border-indigo-500/60 text-white"
                            : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            p.status === "approved"
                              ? "bg-emerald-400"
                              : p.status === "rejected"
                              ? "bg-rose-400"
                              : "bg-amber-400"
                          }`}
                        ></span>
                        <span>{p.id.slice(-6)}</span>
                        <span className="text-[10px] uppercase text-zinc-500">[{p.status}]</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-zinc-800/80 bg-zinc-950/80 px-6 py-4 text-xs font-mono text-zinc-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            Transmute Migration Workbench · LLMs propose, humans approve, deterministic code executes.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Database Invariant:</span>
            <span className="text-zinc-400">source = 50</span>
            <span className="text-zinc-400">target = 0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
