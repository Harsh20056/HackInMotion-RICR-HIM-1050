import { useState } from "react";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useAuth } from "@/features/auth";
import { useAdminDashboard } from "../hooks/useAdminDashboard";
import { ResolveIssueDialog } from "../components/ResolveIssueDialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
  Shield, Loader2, ShieldAlert, LayoutDashboard, MapPin, ChevronLeft, ChevronRight,
  Wifi, WifiOff, AlertTriangle, ThumbsUp, RotateCcw,
} from "lucide-react";
import { ROUTES } from "@/shared/config/routes";
import { LoadingState } from "@/shared/components/LoadingState";
import { EmptyState } from "@/shared/components/EmptyState";
import { UserRole } from "@/shared/types/domain/UserRole";
import { IssueStatus } from "@/shared/types/domain/IssueStatus";
import { CATEGORIES, CATEGORY_LABELS } from "@/shared/constants/categories";
import { QueueItem } from "../services/adminService";

const STATUS_COLORS: Record<string, string> = {
  reported: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  acknowledged: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  resolved: "bg-green-500/10 text-green-600 border-green-500/20",
  verified: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  reopened: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  closed: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

const STATUS_LABEL: Record<string, { en: string; hi: string }> = {
  reported: { en: "Reported", hi: "रिपोर्ट" },
  acknowledged: { en: "Acknowledged", hi: "स्वीकृत" },
  in_progress: { en: "In Progress", hi: "प्रगति में" },
  resolved: { en: "Resolved", hi: "हल" },
  verified: { en: "Verified", hi: "सत्यापित" },
  reopened: { en: "Reopened", hi: "पुनः खोला" },
  rejected: { en: "Rejected", hi: "अस्वीकृत" },
  closed: { en: "Closed", hi: "बंद" },
};

/**
 * The next lifecycle steps an admin may take from a given state. Mirrors the
 * server's state machine; the server remains the authority and will reject
 * anything else with 422.
 */
const NEXT_ADMIN_STATUSES: Record<string, string[]> = {
  reported: ["acknowledged", "rejected"],
  acknowledged: ["in_progress", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: ["closed"],
  verified: ["closed"],
  reopened: ["acknowledged", "in_progress", "rejected"],
  rejected: [],
  closed: [],
};

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();

  const {
    isAdmin,
    userRole,
    departments,
    activeDepartmentId,
    setActiveDepartmentId,
    items,
    total,
    page,
    totalPages,
    setPage,
    filters,
    setFilters,
    loading,
    error,
    updatingId,
    isRealTimeConnected,
    updateStatus,
  } = useAdminDashboard(user, authLoading, language);

  const [resolving, setResolving] = useState<QueueItem | null>(null);

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message={language === "en" ? "Loading admin data..." : "प्रशासक डेटा लोड हो रहा है..."} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 max-w-md text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{language === "en" ? "Access Denied" : "पहुंच अस्वीकृत"}</h2>
        <p className="text-muted-foreground mb-6">
          {language === "en"
            ? "You need department admin privileges to view this page."
            : "इस पृष्ठ को देखने के लिए विभागीय व्यवस्थापक अधिकार आवश्यक हैं।"}
        </p>
        <Button onClick={() => (window.location.href = ROUTES.DASHBOARD)}>
          {language === "en" ? "Back to Dashboard" : "डैशबोर्ड पर वापस जाएं"}
        </Button>
      </div>
    );
  }

  const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;
  const activeDept = departments.find((d) => d.id === activeDepartmentId);

  const handleTransition = async (item: QueueItem, status: string) => {
    if (status === IssueStatus.RESOLVED) {
      setResolving(item);
      return;
    }
    await updateStatus(item.issue.id, status as IssueStatus);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isSuperAdmin
                ? language === "en"
                  ? "Super Admin Dashboard"
                  : "सुपर एडमिन डैशबोर्ड"
                : `${activeDept?.nameEn ?? ""} ${language === "en" ? "Queue" : "कतार"}`}
            </h1>
            <p className="text-xs text-muted-foreground">
              {total} {language === "en" ? "work orders" : "कार्य आदेश"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
              isRealTimeConnected
                ? "text-green-600 border-green-500/20 bg-green-500/10"
                : "text-muted-foreground border-border bg-muted/40"
            }`}
            title={
              isRealTimeConnected
                ? "Live updates connected"
                : "Reconnecting — updates may lag until the stream is restored"
            }
          >
            {isRealTimeConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isRealTimeConnected ? (language === "en" ? "Live" : "लाइव") : language === "en" ? "Offline" : "ऑफ़लाइन"}
          </span>

          {isSuperAdmin && departments.length > 0 && (
            <Select value={activeDepartmentId ?? undefined} onValueChange={setActiveDepartmentId}>
              <SelectTrigger className="w-56">
                <LayoutDashboard className="w-4 h-4 mr-2 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {language === "en" ? d.nameEn : d.nameHi}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-card border border-border rounded-2xl">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            {language === "en" ? "Status" : "स्थिति"}
          </label>
          <Select
            value={filters.status ?? "all"}
            onValueChange={(v) => setFilters({ status: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "en" ? "All statuses" : "सभी"}</SelectItem>
              {Object.keys(STATUS_LABEL).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s][language]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            {language === "en" ? "Category" : "श्रेणी"}
          </label>
          <Select
            value={filters.categoryCode ?? "all"}
            onValueChange={(v) => setFilters({ categoryCode: v === "all" ? undefined : v })}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "en" ? "All categories" : "सभी श्रेणियां"}</SelectItem>
              {Object.values(CATEGORIES).map((code) => (
                <SelectItem key={code} value={code}>
                  {CATEGORY_LABELS[code][language]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            {language === "en" ? "From" : "से"}
          </label>
          <Input
            type="date"
            className="w-40"
            value={filters.from?.slice(0, 10) ?? ""}
            onChange={(e) =>
              setFilters({ from: e.target.value ? new Date(e.target.value).toISOString() : undefined })
            }
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            {language === "en" ? "To" : "तक"}
          </label>
          <Input
            type="date"
            className="w-40"
            value={filters.to?.slice(0, 10) ?? ""}
            onChange={(e) =>
              setFilters({ to: e.target.value ? new Date(e.target.value).toISOString() : undefined })
            }
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            {language === "en" ? "Sort" : "क्रम"}
          </label>
          <Select value={filters.sort} onValueChange={(v) => setFilters({ sort: v as typeof filters.sort })}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">{language === "en" ? "Newest first" : "नवीनतम"}</SelectItem>
              <SelectItem value="created_asc">{language === "en" ? "Oldest first" : "पुराने"}</SelectItem>
              <SelectItem value="priority">{language === "en" ? "Priority" : "प्राथमिकता"}</SelectItem>
              <SelectItem value="status">{language === "en" ? "Status" : "स्थिति"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(filters.status || filters.categoryCode || filters.from || filters.to) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilters({ status: undefined, categoryCode: undefined, from: undefined, to: undefined })
            }
          >
            {language === "en" ? "Clear" : "साफ़ करें"}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-destructive/5 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {language === "en" ? "Could not load the queue" : "कतार लोड नहीं हो सकी"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Queue */}
      {loading ? (
        <LoadingState message={language === "en" ? "Loading queue…" : "कतार लोड हो रही है…"} />
      ) : items.length === 0 ? (
        <EmptyState
          title={language === "en" ? "Nothing in this queue" : "इस कतार में कुछ नहीं"}
          description={
            language === "en"
              ? "No work orders match the current filters."
              : "वर्तमान फ़िल्टर से कोई कार्य आदेश मेल नहीं खाता।"
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const issue = item.issue;
            const nextStatuses = NEXT_ADMIN_STATUSES[issue.status] ?? [];
            const isBusy = updatingId === issue.id;

            return (
              <div
                key={item.workOrderId}
                className="bg-card border border-border rounded-2xl p-4 hover:border-primary/20 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <Badge variant="outline" className={STATUS_COLORS[issue.status] ?? ""}>
                        {STATUS_LABEL[issue.status]?.[language] ?? issue.status}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {issue.category.nameEn}
                      </Badge>
                      {item.role !== "primary" && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {item.role}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono">{issue.publicRef}</span>
                    </div>

                    <h3 className="font-semibold text-foreground truncate">{issue.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{issue.description}</p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
                      {issue.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {issue.address}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> {issue.supportsCount}
                      </span>
                      <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                      {issue.reporterName && (
                        <span>
                          {language === "en" ? "by" : "द्वारा"} {issue.reporterName}
                        </span>
                      )}
                    </div>

                    {issue.resolutionNote && (
                      <p className="mt-2 text-xs bg-green-500/5 border border-green-500/15 rounded-lg p-2 text-muted-foreground">
                        <strong className="text-foreground">
                          {language === "en" ? "Resolution: " : "समाधान: "}
                        </strong>
                        {issue.resolutionNote}
                      </p>
                    )}
                  </div>

                  {/* Inline lifecycle actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isBusy && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    {nextStatuses.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground italic">
                        {language === "en" ? "No further action" : "कोई कार्रवाई नहीं"}
                      </span>
                    ) : (
                      nextStatuses.map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={status === "rejected" ? "outline" : "default"}
                          disabled={isBusy}
                          onClick={() => handleTransition(item, status)}
                        >
                          {status === "reopened" && <RotateCcw className="w-3 h-3 mr-1" />}
                          {STATUS_LABEL[status]?.[language] ?? status}
                        </Button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {language === "en" ? "Page" : "पृष्ठ"} {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Resolve requires a note + proof photo, enforced server-side too */}
      {resolving && (
        <ResolveIssueDialog
          item={resolving}
          onClose={() => setResolving(null)}
          onSubmit={async (note, proofUrl) => {
            const ok = await updateStatus(resolving.issue.id, IssueStatus.RESOLVED, {
              resolutionNote: note,
              proofUrl,
            });
            if (ok) setResolving(null);
            return ok;
          }}
        />
      )}
    </div>
  );
}
