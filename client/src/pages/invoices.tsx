import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, Search, Eye, CheckCircle, AlertTriangle, Send, Loader2, Download, Trash2, CalendarClock, X, Filter, FolderOpen, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/format";
import type { Invoice, InvoiceLineItem, Customer, PaymentPlan } from "@shared/schema";
import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

function InvoicesSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Card className="overflow-hidden">
        <div className="p-4 border-b">
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function Invoices() {
  usePageTitle("Invoices");
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<(Invoice & {
    lineItems?: InvoiceLineItem[];
    projectName?: string | null;
    customerName?: string | null;
    workEntries?: Array<{
      id: string;
      rateId: string;
      quantity: string;
      description: string | null;
      recordedAt: string | null;
      rateName: string | null;
      unitLabel: string | null;
      rateCents: number;
    }>;
  }) | null>(null);

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: overdueInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/overdue-invoices"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planInvoice, setPlanInvoice] = useState<Invoice | null>(null);
  const [planInstallments, setPlanInstallments] = useState("3");
  const [planFrequency, setPlanFrequency] = useState("monthly");

  const { data: paymentPlans } = useQuery<PaymentPlan[]>({
    queryKey: ["/api/payment-plans"],
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      setSendingId(id);
      const res = await apiRequest("POST", `/api/invoices/${id}/send`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice sent", description: "The invoice has been emailed to the client." });
      setSendingId(null);
    },
    onError: (err: any) => {
      toast({ title: "Send failed", description: err.message || "Could not send invoice email.", variant: "destructive" });
      setSendingId(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/overdue-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Invoice updated", description: "Invoice status has been changed." });
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async ({ invoiceId, numberOfInstallments, frequency }: { invoiceId: string; numberOfInstallments: number; frequency: string }) => {
      const res = await apiRequest("POST", `/api/invoices/${invoiceId}/payment-plan`, { numberOfInstallments, frequency });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-plans"] });
      toast({ title: "Payment plan created", description: "The payment plan has been set up and is waiting for the client to accept." });
      setPlanDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to create plan", description: err.message || "Could not create payment plan.", variant: "destructive" });
    },
  });

  const cancelPlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest("DELETE", `/api/payment-plans/${planId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-plans"] });
      toast({ title: "Plan cancelled", description: "The payment plan has been cancelled." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to cancel", description: err.message || "Could not cancel plan.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/invoices/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Invoice deleted", description: "The draft invoice has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message || "Could not delete invoice.", variant: "destructive" });
    },
  });

  const downloadPdf = (id: string, invoiceNumber: string) => {
    const link = document.createElement("a");
    link.href = `/api/invoices/${id}/pdf`;
    link.download = `${invoiceNumber}.pdf`;
    link.click();
  };

  const viewInvoice = async (id: string) => {
    try {
      const res = await apiRequest("GET", `/api/invoices/${id}`);
      const data = await res.json();
      setSelectedInvoice(data);
      setDetailDialogOpen(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not load invoice details.", variant: "destructive" });
    }
  };

  if (isLoading) return <InvoicesSkeleton />;

  const customerMap = new Map(customers?.map(c => [c.id, c]) ?? []);

  const filtered = invoices?.filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.status.toLowerCase().includes(q) ||
      (customerMap.get(inv.customerId)?.name ?? "").toLowerCase().includes(q) ||
      (customerMap.get(inv.customerId)?.company ?? "").toLowerCase().includes(q)
    );
  }) ?? [];

  const statusCounts = invoices?.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
          Invoices
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage and track all billing invoices
        </p>
      </div>

      {overdueInvoices && overdueInvoices.length > 0 && (
        <Card className="p-4 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20" data-testid="alert-overdue-invoices">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                {overdueInvoices.map(inv => inv.invoiceNumber).join(", ")} &mdash; follow up with clients to collect payment.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-2 flex-wrap" data-testid="status-filter-bar">
        {[
          { value: "all", label: "All", icon: FileText },
          { value: "draft", label: "Draft", icon: Clock },
          { value: "pending", label: "Pending", icon: Send },
          { value: "paid", label: "Paid", icon: CheckCircle },
          { value: "overdue", label: "Overdue", icon: AlertTriangle },
        ].map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            variant={statusFilter === value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(value)}
            className="gap-1.5"
            data-testid={`filter-status-${value}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {value !== "all" && statusCounts[value] ? (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {statusCounts[value]}
              </Badge>
            ) : value === "all" && invoices ? (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {invoices.length}
              </Badge>
            ) : null}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 flex-wrap p-4 border-b">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-invoices"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Invoice</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((inv) => {
                  const customer = customerMap.get(inv.customerId);
                  return (
                    <tr key={inv.id} className="border-b last:border-b-0" data-testid={`row-invoice-${inv.id}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-muted shrink-0">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium">{inv.invoiceNumber}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{customer?.company || customer?.name || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(inv.issuedAt)}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className={`text-xs ${getStatusColor(inv.status)}`}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(inv.totalAmountCents, inv.currency ?? "USD")}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => viewInvoice(inv.id)} data-testid={`button-view-invoice-${inv.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => downloadPdf(inv.id, inv.invoiceNumber)} data-testid={`button-download-pdf-${inv.id}`}>
                            <Download className="w-4 h-4" />
                          </Button>
                          {inv.status !== "paid" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => sendMutation.mutate(inv.id)}
                              disabled={sendingId === inv.id}
                              data-testid={`button-send-invoice-${inv.id}`}
                            >
                              {sendingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                          )}
                          {(inv.status === "pending" || inv.status === "overdue") && (
                            <Button size="icon" variant="ghost" onClick={() => statusMutation.mutate({ id: inv.id, status: "paid" })} data-testid={`button-mark-paid-${inv.id}`}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => {
                            if (confirm("Delete this invoice? This cannot be undone.")) {
                              deleteMutation.mutate(inv.id);
                            }
                          }} data-testid={`button-delete-invoice-${inv.id}`}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {search ? "No invoices match your search" : "No invoices found"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3" data-testid="text-invoice-detail-title">
              <FileText className="w-5 h-5 text-primary" />
              Invoice {selectedInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-md bg-muted/40" data-testid="detail-customer">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Customer</p>
                  <p className="text-sm font-medium truncate">{selectedInvoice.customerName || customerMap.get(selectedInvoice.customerId)?.company || customerMap.get(selectedInvoice.customerId)?.name || "—"}</p>
                </div>
                {selectedInvoice.projectName && (
                  <div className="p-3 rounded-md bg-muted/40" data-testid="detail-project">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Project</p>
                    <p className="text-sm font-medium truncate flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {selectedInvoice.projectName}
                    </p>
                  </div>
                )}
                <div className="p-3 rounded-md bg-muted/40" data-testid="detail-issued">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Issued</p>
                  <p className="text-sm font-medium">{formatDate(selectedInvoice.issuedAt)}</p>
                </div>
                <div className="p-3 rounded-md bg-muted/40" data-testid="detail-due">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Due</p>
                  <p className="text-sm font-medium">{formatDate(selectedInvoice.dueDate)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 px-1">
                <Badge variant="secondary" className={`text-xs ${getStatusColor(selectedInvoice.status)}`} data-testid="detail-status">
                  {selectedInvoice.status}
                </Badge>
                <span className="text-lg font-bold" data-testid="detail-total">
                  {formatCurrency(selectedInvoice.totalAmountCents)}
                </span>
              </div>

              {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Line Items</h4>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/30 border-b">
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Item</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Qty</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Rate</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.lineItems.map((item) => (
                          <tr key={item.id} className="border-b last:border-b-0" data-testid={`detail-line-item-${item.id}`}>
                            <td className="py-2 px-3">{item.description}</td>
                            <td className="py-2 px-3 text-right">{Number(item.quantity)}</td>
                            <td className="py-2 px-3 text-right text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-2 px-3 text-right font-medium">{formatCurrency(item.totalCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/20">
                          <td colSpan={3} className="py-2 px-3 text-right font-semibold text-xs uppercase tracking-wider">Total</td>
                          <td className="py-2 px-3 text-right font-bold">{formatCurrency(selectedInvoice.totalAmountCents)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {selectedInvoice.workEntries && selectedInvoice.workEntries.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Work Breakdown</h4>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/30 border-b">
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Type</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Description</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Qty</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.workEntries.map((entry) => (
                          <tr key={entry.id} className="border-b last:border-b-0" data-testid={`detail-work-entry-${entry.id}`}>
                            <td className="py-2 px-3">
                              <span className="font-medium">{entry.rateName || "—"}</span>
                              {entry.unitLabel && (
                                <span className="text-muted-foreground text-xs ml-1">({formatCurrency(entry.rateCents)}/{entry.unitLabel})</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground max-w-[180px] truncate">{entry.description || "—"}</td>
                            <td className="py-2 px-3 text-right">{Number(entry.quantity)}</td>
                            <td className="py-2 px-3 text-right text-muted-foreground text-xs">{entry.recordedAt ? formatDate(entry.recordedAt) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {(() => {
                const existingPlan = paymentPlans?.find(p => p.invoiceId === selectedInvoice.id && (p.status === "pending" || p.status === "active"));
                if (existingPlan) {
                  return (
                    <div className="p-3 rounded-md border bg-muted/30" data-testid="card-existing-plan">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Payment Plan</p>
                            <p className="text-xs text-muted-foreground">
                              {existingPlan.numberOfInstallments} {existingPlan.frequency} payments of {formatCurrency(existingPlan.installmentAmountCents)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`text-xs ${getStatusColor(existingPlan.status)}`}>
                            {existingPlan.status === "pending" ? "Awaiting Client" : `${existingPlan.installmentsPaid}/${existingPlan.numberOfInstallments} paid`}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Cancel this payment plan?")) cancelPlanMutation.mutate(existingPlan.id);
                            }}
                            data-testid="button-cancel-plan"
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => downloadPdf(selectedInvoice.id, selectedInvoice.invoiceNumber)}
                  data-testid="button-download-pdf-dialog"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                {selectedInvoice.status !== "paid" && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      sendMutation.mutate(selectedInvoice.id);
                      setDetailDialogOpen(false);
                    }}
                    disabled={sendingId === selectedInvoice.id}
                    data-testid="button-send-invoice-dialog"
                  >
                    {sendingId === selectedInvoice.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Email Invoice
                  </Button>
                )}
                {selectedInvoice.status !== "paid" && !paymentPlans?.find(p => p.invoiceId === selectedInvoice.id && (p.status === "pending" || p.status === "active")) && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setPlanInvoice(selectedInvoice);
                      setPlanInstallments("3");
                      setPlanFrequency("monthly");
                      setPlanDialogOpen(true);
                    }}
                    data-testid="button-create-payment-plan"
                  >
                    <CalendarClock className="w-4 h-4 mr-2" />
                    Payment Plan
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Payment Plan</DialogTitle>
          </DialogHeader>
          {planInvoice && (
            <div className="space-y-4">
              <div className="p-3 rounded-md bg-muted/30 border">
                <p className="text-sm text-muted-foreground">Invoice Total</p>
                <p className="text-lg font-semibold" data-testid="text-plan-total">
                  {formatCurrency(planInvoice.totalAmountCents)}
                </p>
                <p className="text-xs text-muted-foreground">{planInvoice.invoiceNumber}</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Number of Installments</label>
                  <Select value={planInstallments} onValueChange={setPlanInstallments}>
                    <SelectTrigger data-testid="select-installments">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 payments</SelectItem>
                      <SelectItem value="3">3 payments</SelectItem>
                      <SelectItem value="4">4 payments</SelectItem>
                      <SelectItem value="6">6 payments</SelectItem>
                      <SelectItem value="12">12 payments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Frequency</label>
                  <Select value={planFrequency} onValueChange={setPlanFrequency}>
                    <SelectTrigger data-testid="select-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-3 rounded-md border bg-muted/10">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Each payment</span>
                  <span className="font-semibold" data-testid="text-installment-amount">
                    {formatCurrency(Math.ceil(planInvoice.totalAmountCents / Number(planInstallments)))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {planInstallments} {planFrequency} payments &middot; Stripe handles collection automatically
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  createPlanMutation.mutate({
                    invoiceId: planInvoice.id,
                    numberOfInstallments: Number(planInstallments),
                    frequency: planFrequency,
                  });
                }}
                disabled={createPlanMutation.isPending}
                data-testid="button-confirm-create-plan"
              >
                {createPlanMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CalendarClock className="w-4 h-4 mr-2" />
                )}
                Create Payment Plan
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
