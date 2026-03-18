import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Users,
  FileText,
  Flag,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  EyeOff,
  Loader2,
  Info,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, ApiError } from "@/lib/api";

type AdminTab = "overview" | "post-reports" | "confession-reports";

type UiStatus = "pending" | "reviewed" | "resolved";
type UiType = "Post" | "Confession";

interface Report {
  id: string; // report id
  type: UiType;
  reason: string;
  reporter: string;
  status: UiStatus;
  time: string;
  targetId: string; // post_id or confession_id
}

const statusConfig: Record<UiStatus, { icon: typeof Clock; className: string }> = {
  pending: { icon: Clock, className: "text-gold" },
  reviewed: { icon: AlertTriangle, className: "text-primary" },
  resolved: { icon: CheckCircle2, className: "text-green-600 dark:text-green-400" },
};

// ---- helpers ----
function safeIsoToRelative(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function normalizeStatus(s?: string): UiStatus {
  const up = String(s || "").toUpperCase();
  if (up === "RESOLVED") return "resolved";
  if (up === "REVIEWED") return "reviewed";
  return "pending";
}

function pickReporter(row: any) {
  return (
    row.reporter_name ||
    row.reporter_email ||
    row.reporter ||
    row.email ||
    "Anonymous"
  );
}

function normalizePostReportRow(row: any): Report {
  const id = String(row.report_id ?? row.id ?? "");
  const targetId = String(row.post_id ?? row.target_id ?? row.postId ?? "");
  return {
    id,
    type: "Post",
    reason: String(row.reason || "OTHER"),
    reporter: pickReporter(row),
    status: normalizeStatus(row.status),
    time: safeIsoToRelative(row.reported_at || row.created_at),
    targetId,
  };
}

function normalizeConfessionReportRow(row: any): Report {
  const id = String(row.report_id ?? row.id ?? "");
  const targetId = String(row.confession_id ?? row.target_id ?? row.confessionId ?? "");
  return {
    id,
    type: "Confession",
    reason: String(row.reason || "OTHER"),
    reporter: pickReporter(row),
    status: normalizeStatus(row.status),
    time: safeIsoToRelative(row.reported_at || row.created_at),
    targetId,
  };
}

const AdminDashboard = () => {
  const { isAdmin, isLoggedIn } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [actionReport, setActionReport] = useState<{
    report: Report;
    action: "hide" | "unhide" | "resolve";
  } | null>(null);

  // Access control
  if (!isLoggedIn) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-heading font-semibold text-foreground text-lg mb-1">
            Sign in required
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            You must be signed in as an administrator to access this page.
          </p>
          <Button asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-heading font-semibold text-foreground text-lg mb-1">
            Access denied
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            Only administrators can access the admin dashboard.
          </p>
          <Button asChild variant="outline">
            <Link to="/feed">Go to Feed</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  // ---- Queries ----
  const statsQuery = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      // If you haven't added /api/admin/stats in backend, this may fail.
      // We'll handle failure gracefully and show the demo notice.
      return await adminApi.stats();
    },
    retry: 0,
  });

  const postReportsQuery = useQuery({
    queryKey: ["admin", "postReports"],
    queryFn: async () => {
      const res = await adminApi.reports();
      const rows = res?.reports ?? res?.rows ?? [];
      return Array.isArray(rows) ? rows.map(normalizePostReportRow) : [];
    },
  });

  const confessionReportsQuery = useQuery({
    queryKey: ["admin", "confessionReports"],
    queryFn: async () => {
      const res = await adminApi.confessionReports();
      const rows = res?.reports ?? res?.rows ?? [];
      return Array.isArray(rows) ? rows.map(normalizeConfessionReportRow) : [];
    },
  });

  const allReports = useMemo(() => {
    const a = postReportsQuery.data ?? [];
    const b = confessionReportsQuery.data ?? [];
    // newest first: we only have `time` as formatted string; keep order from API
    return [...a, ...b];
  }, [postReportsQuery.data, confessionReportsQuery.data]);

  const pendingCounts = useMemo(() => {
    const postsPending = (postReportsQuery.data ?? []).filter(r => r.status === "pending").length;
    const confPending = (confessionReportsQuery.data ?? []).filter(r => r.status === "pending").length;
    return { postsPending, confPending };
  }, [postReportsQuery.data, confessionReportsQuery.data]);

  // ---- Actions ----
  const actionMutation = useMutation({
    mutationFn: async (payload: { report: Report; action: "hide" | "unhide" | "resolve" }) => {
      const { report, action } = payload;

      if (action === "resolve") {
        if (report.type === "Post") {
          return adminApi.resolveReport(Number(report.id));
        }
        return adminApi.resolveConfessionReport(Number(report.id));
      }

      if (action === "hide") {
        if (report.type === "Post") {
          return adminApi.hidePost(Number(report.targetId));
        }
        return adminApi.hideConfession(Number(report.targetId));
      }

      // unhide
      if (report.type === "Post") {
        return adminApi.unhidePost(Number(report.targetId));
      }
      return adminApi.unhideConfession(Number(report.targetId));
    },
    onSuccess: async (_, vars) => {
      if (vars.action === "resolve") toast.success("Report resolved ✅");
      if (vars.action === "hide") toast.success("Content hidden ✅");
      if (vars.action === "unhide") toast.success("Content restored ✅");

      setActionReport(null);

      // refresh
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "postReports"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "confessionReports"] }),
      ]);
    },
    onError: (err: any) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : err?.message || "Action failed.";
      toast.error("Action failed", { description: msg });
    },
  });

  const tabs: { key: AdminTab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "post-reports", label: "Post Reports", count: pendingCounts.postsPending },
    { key: "confession-reports", label: "Confession Reports", count: pendingCounts.confPending },
  ];

  // ---- Overview stats (demo fallback if endpoint missing) ----
  const statsCards = useMemo(() => {
    const s = statsQuery.data;
    const demo = [
      { label: "Total Users", value: "—", change: "", icon: Users, trend: "up" as const },
      { label: "Total Posts", value: "—", change: "", icon: FileText, trend: "up" as const },
      { label: "Active Reports", value: "—", change: "", icon: Flag, trend: "down" as const },
      { label: "Active Clubs", value: "—", change: "", icon: Shield, trend: "up" as const },
    ];

    if (!s) return demo;

    // expected: { users, posts, reports, clubs }
    return [
      { label: "Total Users", value: String(s.users ?? "—"), change: "", icon: Users, trend: "up" as const },
      { label: "Total Posts", value: String(s.posts ?? "—"), change: "", icon: FileText, trend: "up" as const },
      { label: "Active Reports", value: String(s.reports ?? "—"), change: "", icon: Flag, trend: "down" as const },
      { label: "Active Clubs", value: String(s.clubs ?? "—"), change: "", icon: Shield, trend: "up" as const },
    ];
  }, [statsQuery.data]);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage users, content, and moderation
          </p>
        </div>

        {/* Stats notice */}
        {statsQuery.isError && (
          <div className="bg-muted/50 rounded-lg border border-border p-3 flex gap-2 items-center">
            <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Stats endpoint not available yet. Reports + moderation are fully live.
            </p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statsCards.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <stat.icon className="w-5 h-5 text-muted-foreground" />
                    <div className="flex items-center gap-1">
                      <TrendingUp
                        className={`w-3.5 h-3.5 ${
                          stat.trend === "up"
                            ? "text-green-600 dark:text-green-400"
                            : "text-destructive rotate-180"
                        }`}
                      />
                      {!!stat.change && (
                        <span
                          className={`text-xs font-medium ${
                            stat.trend === "up"
                              ? "text-green-600 dark:text-green-400"
                              : "text-destructive"
                          }`}
                        >
                          {stat.change}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-2xl font-heading font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Recent Reports Summary */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-heading font-semibold text-foreground">
                  Recent Reports
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => setActiveTab("post-reports")}
                >
                  View All
                </Button>
              </div>

              {(postReportsQuery.isLoading || confessionReportsQuery.isLoading) && (
                <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading reports...
                </div>
              )}

              {(postReportsQuery.isError || confessionReportsQuery.isError) && (
                <div className="p-6 flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  Could not load reports. Ensure backend is running and you’re logged in as admin.
                </div>
              )}

              {!postReportsQuery.isLoading &&
                !confessionReportsQuery.isLoading &&
                !postReportsQuery.isError &&
                !confessionReportsQuery.isError && (
                  <div className="divide-y divide-border">
                    {allReports.slice(0, 6).map((report) => {
                      const statusInfo = statusConfig[report.status];
                      const StatusIcon = statusInfo.icon;
                      return (
                        <div
                          key={`${report.type}-${report.id}`}
                          className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors"
                        >
                          <StatusIcon
                            className={`w-5 h-5 flex-shrink-0 ${statusInfo.className}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {report.type}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                — {report.reason}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Reported by {report.reporter} · {report.time}
                            </p>
                          </div>
                          <span className="text-xs font-medium capitalize text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                            {report.status}
                          </span>
                        </div>
                      );
                    })}
                    {allReports.length === 0 && (
                      <div className="p-6 text-sm text-muted-foreground">
                        No reports yet.
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Post Reports Tab */}
        {activeTab === "post-reports" && (
          <ReportsTable
            title="Post Reports"
            reports={postReportsQuery.data ?? []}
            isLoading={postReportsQuery.isLoading}
            isError={postReportsQuery.isError}
            processing={actionMutation.isPending}
            onHide={(r) => setActionReport({ report: r, action: "hide" })}
            onResolve={(r) => setActionReport({ report: r, action: "resolve" })}
          />
        )}

        {/* Confession Reports Tab */}
        {activeTab === "confession-reports" && (
          <ReportsTable
            title="Confession Reports"
            reports={confessionReportsQuery.data ?? []}
            isLoading={confessionReportsQuery.isLoading}
            isError={confessionReportsQuery.isError}
            processing={actionMutation.isPending}
            onHide={(r) => setActionReport({ report: r, action: "hide" })}
            onResolve={(r) => setActionReport({ report: r, action: "resolve" })}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!actionReport}
        onOpenChange={(open) => !open && setActionReport(null)}
        title={
          actionReport?.action === "resolve"
            ? "Resolve this report?"
            : actionReport?.action === "hide"
            ? `Hide this ${actionReport?.report.type.toLowerCase()} content?`
            : `Unhide this ${actionReport?.report.type.toLowerCase()} content?`
        }
        description={
          actionReport?.action === "resolve"
            ? "This will mark the report as resolved."
            : actionReport?.action === "hide"
            ? "This content will be hidden from users."
            : "This will make the content visible again."
        }
        confirmLabel={
          actionReport?.action === "resolve"
            ? "Resolve"
            : actionReport?.action === "hide"
            ? "Hide Content"
            : "Unhide"
        }
        variant={actionReport?.action === "hide" ? "destructive" : "default"}
        onConfirm={() => {
          if (!actionReport) return;
          actionMutation.mutate(actionReport);
        }}
      />
    </AppLayout>
  );
};

function ReportsTable({
  title,
  reports,
  isLoading,
  isError,
  processing,
  onHide,
  onResolve,
}: {
  title: string;
  reports: Report[];
  isLoading: boolean;
  isError: boolean;
  processing: boolean;
  onHide: (r: Report) => void;
  onResolve: (r: Report) => void;
}) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading {title.toLowerCase()}...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 flex items-center gap-2 text-sm text-destructive">
        <AlertTriangle className="w-4 h-4" />
        Could not load {title.toLowerCase()}. Confirm backend + admin token.
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="font-heading font-semibold text-foreground text-lg mb-1">
          All clear!
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          No reports to review in this category.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-heading font-semibold text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">{reports.length} total</span>
      </div>

      <div className="divide-y divide-border">
        {reports.map((report) => {
          const statusInfo = statusConfig[report.status];
          const StatusIcon = statusInfo.icon;

          return (
            <div
              key={`${report.type}-${report.id}`}
              className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors"
            >
              <StatusIcon className={`w-5 h-5 flex-shrink-0 ${statusInfo.className}`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {report.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    — {report.reason}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Reported by {report.reporter} · {report.time} · Target #{report.targetId}
                </p>
              </div>

              <span className="text-xs font-medium capitalize text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                {report.status}
              </span>

              <div className="flex gap-1.5">
                {report.status !== "resolved" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onHide(report)}
                      disabled={processing}
                      className="text-xs gap-1"
                    >
                      {processing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                      Hide
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onResolve(report)}
                      disabled={processing}
                      className="text-xs gap-1"
                    >
                      {processing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      Resolve
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AdminDashboard;