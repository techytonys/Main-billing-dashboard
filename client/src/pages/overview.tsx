import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  FileText,
  FolderOpen,
  Clock,
  AlertTriangle,
  Bot,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/format";
import type { Invoice, Project, Customer, WorkEntry, BillingRate } from "@shared/schema";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-1" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <Skeleton className="h-6 w-36 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <Skeleton className="h-6 w-36 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function Overview() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalRevenue: number;
    activeProjects: number;
    pendingInvoices: number;
    unbilledWork: number;
    overdueInvoices: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentInvoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices?limit=5"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: workEntries } = useQuery<WorkEntry[]>({
    queryKey: ["/api/work-entries"],
  });

  const { data: rates } = useQuery<BillingRate[]>({
    queryKey: ["/api/billing-rates"],
  });

  const { data: agentSummary } = useQuery<{
    totalEntries: number;
    totalAgentCostCents: number;
    totalClientChargeCents: number;
    totalProfitCents: number;
    unbilledCount: number;
    unbilledChargeCents: number;
  }>({
    queryKey: ["/api/agent-costs/summary"],
  });

  const isLoading = statsLoading || invoicesLoading || projectsLoading;

  usePageTitle("Overview");

  if (isLoading) {
    return <OverviewSkeleton />;
  }

  const customerMap = new Map(customers?.map(c => [c.id, c]) ?? []);
  const rateMap = new Map(rates?.map(r => [r.id, r]) ?? []);
  const activeProjects = projects?.filter(p => p.status === "active") ?? [];

  const recentWork = workEntries?.slice(0, 8) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your billing dashboard at a glance
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          icon={DollarSign}
          subtitle="From paid invoices"
          testId="stat-revenue"
        />
        <StatCard
          title="Active Projects"
          value={String(stats?.activeProjects ?? 0)}
          icon={FolderOpen}
          subtitle="Currently in progress"
          testId="stat-projects"
        />
        <StatCard
          title="Pending Invoices"
          value={String(stats?.pendingInvoices ?? 0)}
          icon={FileText}
          subtitle="Awaiting payment"
          testId="stat-invoices"
        />
        <StatCard
          title={stats?.overdueInvoices ? "Overdue" : "Unbilled Work"}
          value={stats?.overdueInvoices ? String(stats.overdueInvoices) : formatCurrency(stats?.unbilledWork ?? 0)}
          icon={stats?.overdueInvoices ? AlertTriangle : Clock}
          subtitle={stats?.overdueInvoices ? "Past due date" : "Ready to invoice"}
          testId="stat-overdue"
        />
      </div>

      {(stats?.overdueInvoices ?? 0) > 0 && (
        <Card className="p-4 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20" data-testid="alert-overdue">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {stats!.overdueInvoices} overdue invoice{stats!.overdueInvoices > 1 ? "s" : ""} need{stats!.overdueInvoices === 1 ? "s" : ""} attention
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                These invoices are past their due date. Follow up with your clients to collect payment.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4 border-primary/20 bg-primary/5 dark:bg-primary/10" data-testid="card-agent-cost-reminder">
        <div className="flex items-start gap-3">
          <Bot className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              Did an AI agent do work recently? Don't forget to log the cost!
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {agentSummary && agentSummary.unbilledCount > 0
                ? `You have ${agentSummary.unbilledCount} unbilled entr${agentSummary.unbilledCount === 1 ? "y" : "ies"} worth ${formatCurrency(agentSummary.unbilledChargeCents)} ready to invoice.`
                : "Track what the agents built so you can bill your clients accurately."}
            </p>
          </div>
          <Link href="/billing-rates">
            <Button variant="outline" data-testid="button-go-to-agent-costs">
              Log Costs
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-base font-semibold mb-4" data-testid="text-recent-invoices-title">
            Recent Invoices
          </h2>
          <div className="space-y-3">
            {recentInvoices && recentInvoices.length > 0 ? (
              recentInvoices.slice(0, 5).map((inv) => {
                const customer = customerMap.get(inv.customerId);
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0"
                    data-testid={`row-invoice-${inv.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{customer?.company || customer?.name || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium">
                        {formatCurrency(inv.totalAmountCents, inv.currency ?? "USD")}
                      </span>
                      <Badge variant="secondary" className={`text-xs ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No invoices yet</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold mb-4" data-testid="text-active-projects-title">
            Active Projects
          </h2>
          <div className="space-y-3">
            {activeProjects.length > 0 ? (
              activeProjects.slice(0, 5).map((project) => {
                const customer = customerMap.get(project.customerId);
                const unbilledCount = workEntries?.filter(e => e.projectId === project.id && !e.invoiceId).length ?? 0;
                const unbilledAmount = workEntries
                  ?.filter(e => e.projectId === project.id && !e.invoiceId)
                  .reduce((sum, e) => sum + (Number(e.quantity) * (rateMap.get(e.rateId)?.rateCents ?? 0)), 0) ?? 0;
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0"
                    data-testid={`row-project-${project.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{customer?.company || customer?.name || "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {unbilledCount > 0 ? (
                        <>
                          <p className="text-sm font-medium">{formatCurrency(unbilledAmount)}</p>
                          <p className="text-xs text-muted-foreground">{unbilledCount} unbilled</p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">All billed</p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No active projects</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-base font-semibold mb-4" data-testid="text-recent-work-title">
          Recent Work Entries
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Work Type</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</th>
                <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentWork.length > 0 ? (
                recentWork.map((entry) => {
                  const rate = rateMap.get(entry.rateId);
                  const project = projects?.find(p => p.id === entry.projectId);
                  const lineTotal = Number(entry.quantity) * (rate?.rateCents ?? 0);
                  return (
                    <tr key={entry.id} className="border-b last:border-b-0" data-testid={`row-work-${entry.id}`}>
                      <td className="py-3 pr-4 font-medium">{rate?.name ?? "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{project?.name ?? "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground max-w-[200px] truncate">{entry.description || "—"}</td>
                      <td className="py-3 pr-4 text-right">{Number(entry.quantity)}</td>
                      <td className="py-3 pr-4 text-right font-medium">{formatCurrency(lineTotal)}</td>
                      <td className="py-3">
                        <Badge variant="secondary" className={`text-xs ${entry.invoiceId ? getStatusColor("paid") : getStatusColor("pending")}`}>
                          {entry.invoiceId ? "Billed" : "Unbilled"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No work entries yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
