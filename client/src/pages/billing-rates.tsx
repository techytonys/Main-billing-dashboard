import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { DollarSign, Plus, Pencil, Trash2, Tag, Bot, TrendingUp, ArrowUpRight, Calendar, FileText, Send, Loader2, CheckCircle, ChevronDown, ChevronUp, FolderOpen, Clock, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/format";
import type { BillingRate, AgentCostEntry, Project, Customer, Invoice } from "@shared/schema";

function RatesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-6 w-40 mb-3" />
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function AgentCostTracker() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceCustomerId, setInvoiceCustomerId] = useState("");
  const [invoiceProjectId, setInvoiceProjectId] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [costForm, setCostForm] = useState({
    description: "",
    agentCost: "",
    markupPercent: "50",
    customerId: "",
    projectId: "",
  });

  const { data: entries } = useQuery<AgentCostEntry[]>({
    queryKey: ["/api/agent-costs"],
  });

  const { data: summary } = useQuery<{
    totalEntries: number;
    totalAgentCostCents: number;
    totalClientChargeCents: number;
    totalProfitCents: number;
    unbilledCount: number;
    unbilledChargeCents: number;
    byProject: { projectId: string; agentCost: number; clientCharge: number; profit: number; count: number }[];
  }>({
    queryKey: ["/api/agent-costs/summary"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: allCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/agent-costs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-costs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-costs/summary"] });
      setCostForm({ description: "", agentCost: "", markupPercent: "50", customerId: "", projectId: "" });
      setShowForm(false);
      toast({ title: "Cost logged", description: "Agent cost entry has been recorded." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/agent-costs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-costs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-costs/summary"] });
      toast({ title: "Entry removed", description: "Agent cost entry has been deleted." });
    },
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async (data: { customerId: string; projectId?: string }) => {
      const res = await apiRequest("POST", "/api/invoices/generate-from-agent-costs", data);
      return res.json();
    },
    onSuccess: (invoice: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-costs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-costs/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setShowInvoiceDialog(false);
      setInvoiceCustomerId("");
      setInvoiceProjectId("");
      toast({ title: "Invoice created", description: `Invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.totalAmountCents)} has been generated. Go to Invoices to send it.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const agentCostCents = Math.round(Number(costForm.agentCost) * 100);
    if (agentCostCents <= 0) {
      toast({ title: "Invalid cost", description: "Enter a valid agent cost amount.", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      description: costForm.description,
      agentCostCents,
      markupPercent: Number(costForm.markupPercent),
      projectId: costForm.projectId || undefined,
      customerId: costForm.customerId || undefined,
    });
  };

  const agentCostDollars = Number(costForm.agentCost) || 0;
  const markupPct = Number(costForm.markupPercent) || 50;
  const clientChargeDollars = agentCostDollars * (1 + markupPct / 100);
  const profitDollars = clientChargeDollars - agentCostDollars;

  const projectMap = new Map(projects?.map(p => [p.id, p.name]) || []);
  const invoiceMap = new Map(invoices?.map(inv => [inv.id, inv]) || []);
  const customerMap = new Map(allCustomers?.map(c => [c.id, c]) || []);
  const unbilledEntries = entries?.filter(e => !e.invoiceId) || [];
  const unbilledTotal = unbilledEntries.reduce((sum, e) => sum + e.clientChargeCents, 0);

  const customersWithUnbilled = allCustomers?.filter(c =>
    unbilledEntries.some(e => e.customerId === c.id)
  ) || [];

  const selectedCustomerUnbilled = invoiceCustomerId
    ? unbilledEntries.filter(e => e.customerId === invoiceCustomerId && (!invoiceProjectId || e.projectId === invoiceProjectId))
    : [];
  const selectedCustomerTotal = selectedCustomerUnbilled.reduce((sum, e) => sum + e.clientChargeCents, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold tracking-tight" data-testid="text-agent-costs-title">Agent Cost Tracker</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Log AI agent coding costs and auto-calculate client charges with markup</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unbilledEntries.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowInvoiceDialog(true)}
              data-testid="button-generate-agent-invoice"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Invoice ({unbilledEntries.length} unbilled)
            </Button>
          )}
          <Button onClick={() => setShowForm(!showForm)} data-testid="button-log-agent-cost">
            <Plus className="w-4 h-4 mr-2" />
            Log Cost
          </Button>
        </div>
      </div>

      {summary && summary.totalEntries > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Your Cost</p>
            <p className="text-lg font-bold" data-testid="text-total-agent-cost">{formatCurrency(summary.totalAgentCostCents)}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-1 mb-1">
              <ArrowUpRight className="w-3 h-3 text-green-500" />
              <p className="text-xs text-muted-foreground">Client Charge</p>
            </div>
            <p className="text-lg font-bold" data-testid="text-total-client-charge">{formatCurrency(summary.totalClientChargeCents)}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <p className="text-xs text-muted-foreground">Profit</p>
            </div>
            <p className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="text-total-profit">{formatCurrency(summary.totalProfitCents)}</p>
          </Card>
        </div>
      )}

      {summary && summary.byProject && summary.byProject.length > 0 && (
        <Card className="p-4">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center justify-between gap-3 w-full text-left"
            data-testid="button-toggle-breakdown"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Cost Breakdown by Project</span>
              <Badge variant="secondary" className="text-xs">{summary.byProject.length} project{summary.byProject.length !== 1 ? "s" : ""}</Badge>
            </div>
            {showBreakdown ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showBreakdown && (
            <div className="mt-4 space-y-0">
              <div className="grid grid-cols-5 gap-3 pb-2 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span className="col-span-1">Project</span>
                <span className="text-right">Entries</span>
                <span className="text-right">Your Cost</span>
                <span className="text-right">Client Charge</span>
                <span className="text-right">Profit</span>
              </div>
              {summary.byProject.map((bp) => {
                const projName = bp.projectId === "unassigned" ? "Unassigned" : (projectMap.get(bp.projectId) || "Unknown Project");
                return (
                  <div
                    key={bp.projectId}
                    className="grid grid-cols-5 gap-3 py-3 border-b last:border-b-0 text-sm items-center"
                    data-testid={`row-breakdown-${bp.projectId}`}
                  >
                    <span className="col-span-1 font-medium truncate">{projName}</span>
                    <span className="text-right text-muted-foreground">{bp.count}</span>
                    <span className="text-right">{formatCurrency(bp.agentCost)}</span>
                    <span className="text-right">{formatCurrency(bp.clientCharge)}</span>
                    <span className="text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(bp.profit)}</span>
                  </div>
                );
              })}
              <div className="grid grid-cols-5 gap-3 pt-3 text-sm font-semibold border-t">
                <span className="col-span-1">Totals</span>
                <span className="text-right">{summary.totalEntries}</span>
                <span className="text-right">{formatCurrency(summary.totalAgentCostCents)}</span>
                <span className="text-right">{formatCurrency(summary.totalClientChargeCents)}</span>
                <span className="text-right text-green-600 dark:text-green-400">{formatCurrency(summary.totalProfitCents)}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {showForm && (
        <Card className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cost-desc">Description *</Label>
              <Input
                id="cost-desc"
                placeholder="e.g., Homepage design session, Bug fixes, New feature build"
                value={costForm.description}
                onChange={(e) => setCostForm(p => ({ ...p, description: e.target.value }))}
                required
                data-testid="input-agent-cost-description"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost-amount">Agent Cost ($) *</Label>
                <Input
                  id="cost-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="4.35"
                  value={costForm.agentCost}
                  onChange={(e) => setCostForm(p => ({ ...p, agentCost: e.target.value }))}
                  required
                  data-testid="input-agent-cost-amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost-markup">Markup %</Label>
                <Input
                  id="cost-markup"
                  type="number"
                  min="0"
                  step="1"
                  value={costForm.markupPercent}
                  onChange={(e) => setCostForm(p => ({ ...p, markupPercent: e.target.value }))}
                  data-testid="input-agent-cost-markup"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select
                  value={costForm.customerId || "none"}
                  onValueChange={(val) => setCostForm(p => ({ ...p, customerId: val === "none" ? "" : val, projectId: "" }))}
                >
                  <SelectTrigger data-testid="select-agent-cost-customer">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No customer</SelectItem>
                    {allCustomers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={costForm.projectId || "none"}
                  onValueChange={(val) => {
                    const pid = val === "none" ? "" : val;
                    const proj = projects?.find(p => p.id === pid);
                    setCostForm(p => ({
                      ...p,
                      projectId: pid,
                      customerId: proj?.customerId || p.customerId,
                    }));
                  }}
                >
                  <SelectTrigger data-testid="select-agent-cost-project">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {(costForm.customerId
                      ? projects?.filter(p => p.customerId === costForm.customerId)
                      : projects
                    )?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {agentCostDollars > 0 && (
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
                  <div>
                    <span className="text-muted-foreground">Your cost:</span>{" "}
                    <span className="font-semibold">${agentCostDollars.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">+ {markupPct}% markup =</span>{" "}
                    <span className="font-bold text-green-600 dark:text-green-400">${clientChargeDollars.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Profit:</span>{" "}
                    <span className="font-semibold text-green-600 dark:text-green-400">${profitDollars.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-agent-cost">
                {createMutation.isPending ? "Saving..." : "Log Cost"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {entries && entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card key={entry.id} className="p-4" data-testid={`card-agent-cost-${entry.id}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate" data-testid={`text-agent-cost-desc-${entry.id}`}>{entry.description}</p>
                    {entry.customerId && customerMap.get(entry.customerId) && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {customerMap.get(entry.customerId)?.company || customerMap.get(entry.customerId)?.name}
                      </Badge>
                    )}
                    {entry.projectId && projectMap.get(entry.projectId) && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {projectMap.get(entry.projectId)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {entry.sessionDate ? new Date(entry.sessionDate).toLocaleDateString() : "—"}
                    </span>
                    <span>{entry.markupPercent}% markup</span>
                    {(() => {
                      if (!entry.invoiceId) {
                        return <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" data-testid={`badge-status-${entry.id}`}>Unbilled</Badge>;
                      }
                      const invoice = invoiceMap.get(entry.invoiceId);
                      if (!invoice) {
                        return <Badge variant="secondary" className="text-xs" data-testid={`badge-status-${entry.id}`}>Invoiced</Badge>;
                      }
                      switch (invoice.status) {
                        case "draft":
                          return <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800" data-testid={`badge-status-${entry.id}`}><Send className="w-3 h-3 mr-1" />Needs Sending</Badge>;
                        case "pending":
                          return <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800" data-testid={`badge-status-${entry.id}`}><Clock className="w-3 h-3 mr-1" />Unpaid</Badge>;
                        case "overdue":
                          return <Badge variant="outline" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800" data-testid={`badge-status-${entry.id}`}><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge>;
                        case "paid":
                          return <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" data-testid={`badge-status-${entry.id}`}><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
                        default:
                          return <Badge variant="secondary" className="text-xs" data-testid={`badge-status-${entry.id}`}>{invoice.status}</Badge>;
                      }
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Cost</p>
                    <p className="text-sm font-medium">{formatCurrency(entry.agentCostCents)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Charge</p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400" data-testid={`text-agent-charge-${entry.id}`}>{formatCurrency(entry.clientChargeCents)}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(entry.id)} data-testid={`button-delete-agent-cost-${entry.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : !showForm ? (
        <Card className="p-8 text-center">
          <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No agent costs logged yet. Click "Log Cost" to start tracking your AI coding expenses.</p>
        </Card>
      ) : null}

      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Invoice from Agent Costs</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create an invoice from unbilled AI development costs. The invoice will appear on the Invoices page where you can send it via email.
            </p>

            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select
                value={invoiceCustomerId}
                onValueChange={(val) => {
                  setInvoiceCustomerId(val);
                  setInvoiceProjectId("");
                }}
              >
                <SelectTrigger data-testid="select-invoice-customer">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customersWithUnbilled.length > 0 ? (
                    customersWithUnbilled.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                    ))
                  ) : (
                    allCustomers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Project (optional)</Label>
              <Select
                value={invoiceProjectId || "all"}
                onValueChange={(val) => setInvoiceProjectId(val === "all" ? "" : val)}
              >
                <SelectTrigger data-testid="select-invoice-project">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects?.filter(p => invoiceCustomerId ? p.customerId === invoiceCustomerId : true).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {invoiceCustomerId && (
              <Card className="p-4 bg-muted/50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Unbilled entries</span>
                    <span className="font-medium">{selectedCustomerUnbilled.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Invoice total</span>
                    <span className="font-bold text-lg">{formatCurrency(selectedCustomerTotal)}</span>
                  </div>
                  {selectedCustomerUnbilled.length > 0 && (
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Line items:</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {selectedCustomerUnbilled.map(e => (
                          <div key={e.id} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate">{e.description}</span>
                            <span className="font-medium shrink-0">{formatCurrency(e.clientChargeCents)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            <Button
              className="w-full"
              onClick={() => {
                if (!invoiceCustomerId) {
                  toast({ title: "Select a customer", description: "Please select a customer for this invoice.", variant: "destructive" });
                  return;
                }
                generateInvoiceMutation.mutate({
                  customerId: invoiceCustomerId,
                  projectId: invoiceProjectId || undefined,
                });
              }}
              disabled={generateInvoiceMutation.isPending || !invoiceCustomerId || selectedCustomerUnbilled.length === 0}
              data-testid="button-confirm-generate-invoice"
            >
              {generateInvoiceMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Generate Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BillingRates() {
  usePageTitle("Billing Rates");
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<BillingRate | null>(null);
  const [formData, setFormData] = useState({
    code: "", name: "", description: "", unitLabel: "", rateCents: "",
  });

  const { data: rates, isLoading } = useQuery<BillingRate[]>({
    queryKey: ["/api/billing-rates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/billing-rates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-rates"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Rate created", description: "New billing rate has been added." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/billing-rates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-rates"] });
      setDialogOpen(false);
      setEditingRate(null);
      resetForm();
      toast({ title: "Rate updated", description: "Billing rate has been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/billing-rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-rates"] });
      toast({ title: "Rate deleted", description: "Billing rate has been removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => setFormData({ code: "", name: "", description: "", unitLabel: "", rateCents: "" });

  const openCreate = () => {
    resetForm();
    setEditingRate(null);
    setDialogOpen(true);
  };

  const openEdit = (rate: BillingRate) => {
    setEditingRate(rate);
    setFormData({
      code: rate.code,
      name: rate.name,
      description: rate.description ?? "",
      unitLabel: rate.unitLabel,
      rateCents: String(rate.rateCents / 100),
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: formData.code,
      name: formData.name,
      description: formData.description || undefined,
      unitLabel: formData.unitLabel,
      rateCents: Math.round(Number(formData.rateCents) * 100),
    };
    if (editingRate) {
      updateMutation.mutate({ id: editingRate.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) return <RatesSkeleton />;

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Billing Rates</h1>
            <p className="text-sm text-muted-foreground mt-1">Configure your per-unit pricing for different types of work</p>
          </div>
          <Button onClick={openCreate} data-testid="button-add-rate">
            <Plus className="w-4 h-4 mr-2" />
            Add Rate
          </Button>
        </div>

        {rates && rates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rates.map((rate) => (
              <Card key={rate.id} className="p-5" data-testid={`card-rate-${rate.id}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 shrink-0">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(rate)} data-testid={`button-edit-rate-${rate.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(rate.id)} data-testid={`button-delete-rate-${rate.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-semibold mb-1" data-testid={`text-rate-name-${rate.id}`}>{rate.name}</h3>
                {rate.description && (
                  <p className="text-xs text-muted-foreground mb-3">{rate.description}</p>
                )}
                <div className="flex items-center justify-between gap-3 flex-wrap mt-auto pt-3 border-t">
                  <Badge variant="secondary" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {rate.code}
                  </Badge>
                  <span className="text-sm font-semibold" data-testid={`text-rate-price-${rate.id}`}>
                    {formatCurrency(rate.rateCents)} / {rate.unitLabel}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No billing rates configured. Add your first rate to get started.</p>
          </Card>
        )}
      </div>

      <div className="border-t pt-8">
        <AgentCostTracker />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRate ? "Edit Rate" : "Add Billing Rate"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rate-name">Name *</Label>
              <Input id="rate-name" placeholder="e.g., Page Design" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required data-testid="input-rate-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate-code">Code *</Label>
              <Input id="rate-code" placeholder="e.g., page_design" value={formData.code} onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))} required data-testid="input-rate-code" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate-price">Price ($) *</Label>
                <Input id="rate-price" type="number" min="0" step="0.01" placeholder="200.00" value={formData.rateCents} onChange={(e) => setFormData(p => ({ ...p, rateCents: e.target.value }))} required data-testid="input-rate-price" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate-unit">Per Unit *</Label>
                <Input id="rate-unit" placeholder="e.g., page, asset, session" value={formData.unitLabel} onChange={(e) => setFormData(p => ({ ...p, unitLabel: e.target.value }))} required data-testid="input-rate-unit" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate-desc">Description</Label>
              <Textarea id="rate-desc" placeholder="What this rate covers" value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} data-testid="input-rate-description" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-rate">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingRate ? "Save Changes" : "Add Rate"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
