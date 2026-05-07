// src/pages/ba/ReturnSims.tsx
import { useState, useMemo } from "react";
import {
  RotateCcw, Search, X, CheckCircle2, AlertCircle,
  Loader2, PackageSearch, Check, ChevronLeft, ChevronRight,
  ShieldAlert, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSIMs } from "@/hooks/useInventory";
import { useBulkReturnSIMs } from "@/hooks/useInventory";
import { showSuccess, showError } from "@/lib/toast";
import type { SIM } from "@/types/inventory.types";

const PAGE_SIZE = 20;

export default function BAReturnSims() {
  const { user } = useAuth();
  const userId   = user?.id ? Number(user.id) : 0;

  // ── State ───────────────────────────────────────────────────────────────
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [notes,       setNotes]       = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMsg,  setSuccessMsg]  = useState("");

  // ── Fetch BA's held SIMs ────────────────────────────────────────────────
  const filterParams = useMemo(() => ({
    status: "issued" as const,
    holder: userId,
    ...(search.trim() ? { search: search.trim() } : {}),
    page,
  }), [userId, search, page]);

  const { data: simsData, isLoading, isError, refetch } = useSIMs(filterParams);
  const sims: SIM[]    = simsData?.results ?? [];
  const totalCount     = simsData?.count ?? 0;
  const totalPages     = Math.ceil(totalCount / PAGE_SIZE);

  const bulkReturn = useBulkReturnSIMs();

  // ── Selection helpers ────────────────────────────────────────────────────
  const toggleOne = (serial: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(serial)) next.delete(serial);
      else next.add(serial);
      return next;
    });
  };

  const toggleAll = () => {
    const pageSerials = sims.map(s => s.serial_number);
    const allSelected = pageSerials.every(s => selected.has(s));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) pageSerials.forEach(s => next.delete(s));
      else             pageSerials.forEach(s => next.add(s));
      return next;
    });
  };

  const allPageSelected = sims.length > 0 && sims.every(s => selected.has(s.serial_number));
  const somePageSelected = sims.some(s => selected.has(s.serial_number));

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (selected.size === 0) return;
    try {
      await bulkReturn.mutateAsync({
        serial_numbers: Array.from(selected),
        from_user: userId,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      const msg = `${selected.size} SIM${selected.size !== 1 ? "s" : ""} returned successfully.`;
      showSuccess(msg);
      setSuccessMsg(msg);
      setSelected(new Set());
      setNotes("");
      setShowConfirm(false);
      refetch();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: unknown) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      showError(detail ?? "Return failed. Please try again.");
      setShowConfirm(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-primary" />
            Return SIMs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Return unused SIM cards back to your van team or branch
          </p>
        </div>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <p className="text-sm font-medium text-green-500">{successMsg}</p>
        </div>
      )}

      {/* Info notice */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-primary">
          Only SIM cards currently in your hands can be returned. Registered SIMs cannot be returned.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">In My Hands</p>
          <p className="text-2xl font-bold font-heading text-amber-500 mt-1">
            {isLoading ? "—" : totalCount.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">Selected to Return</p>
          <p className="text-2xl font-bold font-heading text-primary mt-1">
            {selected.size.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search + select controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search serial number…"
            className="w-full rounded-md border border-border bg-accent py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {selected.size > 0 && (
          <button
            onClick={() => setSelected(new Set())}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear selection ({selected.size})
          </button>
        )}
      </div>

      {/* SIM table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading your SIMs…</span>
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load SIMs.</span>
          <button onClick={() => refetch()} className="ml-auto underline text-xs">Retry</button>
        </div>
      ) : sims.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 gap-3 text-muted-foreground">
          <PackageSearch className="h-10 w-10 opacity-30" />
          <p className="text-sm">
            {search ? "No SIMs match your search." : "You have no SIMs in your hands."}
          </p>
          {search && (
            <button onClick={() => setSearch("")} className="text-primary text-xs underline">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/30 text-muted-foreground text-xs">
                  <th className="py-3 px-4 text-left font-medium w-10">
                    <button
                      onClick={toggleAll}
                      className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                        allPageSelected
                          ? "bg-primary border-primary"
                          : somePageSelected
                          ? "bg-primary/40 border-primary"
                          : "border-border bg-accent hover:border-primary"
                      )}
                    >
                      {(allPageSelected || somePageSelected) && (
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-left font-medium">Serial Number</th>
                  <th className="py-3 px-4 text-left font-medium">Branch</th>
                  <th className="py-3 px-4 text-left font-medium">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {sims.map(sim => {
                  const isSelected = selected.has(sim.serial_number);
                  return (
                    <tr
                      key={sim.id}
                      onClick={() => toggleOne(sim.serial_number)}
                      className={cn(
                        "border-b border-border/50 transition-colors cursor-pointer",
                        isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-accent/40"
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary border-primary" : "border-border bg-accent"
                        )}>
                          {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "font-mono text-xs font-semibold",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {sim.serial_number}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {sim.branch_details?.name ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(sim.updated_at).toLocaleDateString("en-KE", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Showing <span className="text-foreground font-medium">
              {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, totalCount).toLocaleString()}
            </span> of <span className="text-foreground font-medium">{totalCount.toLocaleString()}</span> SIMs
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Notes + submit */}
      {selected.size > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              <span className="text-primary">{selected.size}</span> SIM{selected.size !== 1 ? "s" : ""} selected for return
            </p>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Reason for return, e.g. Damaged, Excess stock…"
              className="w-full rounded-md border border-border bg-card py-2 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Return {selected.size} SIM{selected.size !== 1 ? "s" : ""}
          </button>
        </div>
      )}

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => !bulkReturn.isPending && setShowConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl">
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-heading text-lg font-semibold">Confirm Return</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  These SIMs will be returned to your van team or branch stock.
                </p>
              </div>
              <div className="rounded-lg border border-border bg-accent/30 divide-y divide-border text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">SIMs to return</span>
                  <span className="font-semibold text-primary">{selected.size.toLocaleString()}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Returning to</span>
                  <span className="font-medium text-foreground">Van / Branch Stock</span>
                </div>
                {notes.trim() && (
                  <div className="flex justify-between px-4 py-2.5 gap-4">
                    <span className="text-muted-foreground shrink-0">Notes</span>
                    <span className="font-medium text-foreground text-right">{notes.trim()}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                This action cannot be undone. The SIMs will be removed from your hands.
              </p>
            </div>
            <div className="flex gap-2 border-t border-border px-6 py-4">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={bulkReturn.isPending}
                className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={bulkReturn.isPending}
                className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {bulkReturn.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {bulkReturn.isPending ? "Processing…" : "Confirm Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}