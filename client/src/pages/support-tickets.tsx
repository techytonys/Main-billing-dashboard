import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  LifeBuoy, Search, MessageSquare, ArrowLeft, Send, Loader2,
  CircleDot, Clock, CheckCircle, XCircle, AlertTriangle, ChevronDown,
  User, Mail, Hash, Calendar, Tag, Filter, Inbox, ArrowUpRight, Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, getStatusColor } from "@/lib/format";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SupportTicket, TicketMessage } from "@shared/schema";

type TicketWithCustomer = SupportTicket & { customerName: string; customerEmail: string };
type TicketDetail = SupportTicket & { customerName: string; customerEmail: string; projectName: string | null; messages: TicketMessage[] };

function getStatusIcon(status: string) {
  switch (status) {
    case "open": return <CircleDot className="w-4 h-4" />;
    case "in_progress": return <Clock className="w-4 h-4" />;
    case "resolved": return <CheckCircle className="w-4 h-4" />;
    case "closed": return <XCircle className="w-4 h-4" />;
    default: return <CircleDot className="w-4 h-4" />;
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "open": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "in_progress": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "resolved": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "closed": return "bg-muted text-muted-foreground border-muted";
    default: return "bg-muted text-muted-foreground border-muted";
  }
}

function getPriorityStyle(priority: string) {
  switch (priority) {
    case "urgent": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "high": return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    case "medium": return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
    case "low": return "bg-muted text-muted-foreground border-muted";
    default: return "bg-muted text-muted-foreground border-muted";
  }
}

function getPriorityIcon(priority: string) {
  switch (priority) {
    case "urgent": return <AlertTriangle className="w-3 h-3" />;
    case "high": return <ArrowUpRight className="w-3 h-3" />;
    default: return null;
  }
}

function formatTimeAgo(date: Date | string | null): string {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

function TicketsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Skeleton className="h-7 w-44 mb-1.5" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>
      <Card className="overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </Card>
    </div>
  );
}

function StatusQuickFilters({
  tickets, active, onChange
}: { tickets: TicketWithCustomer[]; active: string; onChange: (v: string) => void }) {
  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
    closed: tickets.filter(t => t.status === "closed").length,
  };

  const filters = [
    { key: "all", label: "All", icon: Inbox },
    { key: "open", label: "Open", icon: CircleDot },
    { key: "in_progress", label: "In Progress", icon: Clock },
    { key: "resolved", label: "Resolved", icon: CheckCircle },
    { key: "closed", label: "Closed", icon: XCircle },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {filters.map(f => {
        const count = counts[f.key as keyof typeof counts];
        const isActive = active === f.key;
        return (
          <Button
            key={f.key}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => onChange(f.key)}
            className="shrink-0"
            data-testid={`button-filter-${f.key}`}
          >
            <f.icon className="w-3.5 h-3.5 mr-1.5" />
            {f.label}
            {count > 0 && (
              <span className={`ml-1.5 text-xs tabular-nums ${isActive ? "opacity-80" : "text-muted-foreground"}`}>
                {count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}

function TicketListView({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const { data: tickets, isLoading } = useQuery<TicketWithCustomer[]>({
    queryKey: ["/api/support/tickets"],
  });

  if (isLoading) return <TicketsSkeleton />;

  const allTickets = tickets || [];

  const filtered = allTickets.filter(t => {
    const matchesSearch = !search || t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const openCount = allTickets.filter(t => t.status === "open").length;
  const inProgressCount = allTickets.filter(t => t.status === "in_progress").length;
  const urgentCount = allTickets.filter(t => t.priority === "urgent" && t.status !== "closed" && t.status !== "resolved").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-support-title">Support Center</h1>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {urgentCount} urgent
            </span>
          )}
          {openCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
              <CircleDot className="w-3 h-3" />
              {openCount} open
            </span>
          )}
          {inProgressCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              {inProgressCount} in progress
            </span>
          )}
          {openCount === 0 && inProgressCount === 0 && urgentCount === 0 && (
            <span className="text-sm text-muted-foreground">All caught up</span>
          )}
        </div>
      </div>

      <StatusQuickFilters tickets={allTickets} active={statusFilter} onChange={setStatusFilter} />

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject, ticket number, or customer..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-tickets"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-priority-filter">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {filtered.length > 0 ? (
          <div className="divide-y">
            {filtered.map(ticket => (
              <button
                key={ticket.id}
                className="w-full p-4 text-left flex items-start gap-3.5 hover-elevate transition-colors"
                onClick={() => onSelect(ticket.id)}
                data-testid={`button-ticket-${ticket.id}`}
              >
                <div className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 border ${getStatusStyle(ticket.status)}`}>
                  {getStatusIcon(ticket.status)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate">{ticket.subject}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {ticket.ticketNumber}
                    </span>
                    <span className="opacity-30">|</span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {ticket.customerName}
                    </span>
                    <span className="opacity-30">|</span>
                    <span>{formatTimeAgo(ticket.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="secondary" className={`text-xs border ${getPriorityStyle(ticket.priority)}`}>
                    {getPriorityIcon(ticket.priority)}
                    <span className={getPriorityIcon(ticket.priority) ? "ml-1" : ""}>{ticket.priority}</span>
                  </Badge>
                  <Badge variant="secondary" className={`text-xs border ${getStatusStyle(ticket.status)}`}>
                    {ticket.status.replace("_", " ")}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
              <LifeBuoy className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">
              {search || statusFilter !== "all" || priorityFilter !== "all"
                ? "No tickets match your filters"
                : "No support tickets yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {search || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Tickets will appear here when customers reach out"}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

function TicketDetailView({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { toast } = useToast();
  const [replyText, setReplyText] = useState("");

  const { data: ticket, isLoading } = useQuery<TicketDetail>({
    queryKey: ["/api/support/tickets", ticketId],
  });

  const replyMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", `/api/support/tickets/${ticketId}/messages`, { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      toast({ title: "Reply sent", description: "Your reply has been sent and the customer has been notified." });
      setReplyText("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to send reply", description: err.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (updates: { status?: string; priority?: string }) => {
      const res = await apiRequest("PATCH", `/api/support/tickets/${ticketId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      toast({ title: "Ticket updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/support/tickets/${ticketId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/tickets"] });
      toast({ title: "Ticket deleted", description: "The support ticket has been permanently removed." });
      onBack();
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete ticket", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
          <Card className="p-6">
            <Skeleton className="h-6 w-64 mb-4" />
            <Skeleton className="h-40 w-full" />
          </Card>
          <Card className="p-5">
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </Card>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-to-list">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to tickets
        </Button>
        <Card className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
            <LifeBuoy className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Ticket not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-to-list">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to tickets
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        <div className="space-y-4 min-w-0">
          <div>
            <h1 className="text-xl font-semibold leading-tight mb-1" data-testid="text-ticket-subject">{ticket.subject}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className={`text-xs border ${getStatusStyle(ticket.status)}`}>
                {getStatusIcon(ticket.status)}
                <span className="ml-1">{ticket.status.replace("_", " ")}</span>
              </Badge>
              <Badge variant="secondary" className={`text-xs border ${getPriorityStyle(ticket.priority)}`}>
                {getPriorityIcon(ticket.priority)}
                <span className={getPriorityIcon(ticket.priority) ? "ml-1" : ""}>{ticket.priority}</span>
              </Badge>
              <span className="text-xs text-muted-foreground">{ticket.ticketNumber}</span>
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="divide-y">
              {ticket.messages.map((msg, idx) => {
                const isAdmin = msg.senderType === "admin";
                return (
                  <div
                    key={msg.id}
                    className={`p-5 ${isAdmin ? "bg-primary/[0.03] dark:bg-primary/[0.06]" : ""}`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                        isAdmin
                          ? "bg-primary text-primary-foreground"
                          : "bg-gradient-to-br from-blue-500 to-violet-500 text-white"
                      }`}>
                        {msg.senderName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-sm font-semibold">{msg.senderName}</span>
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${isAdmin ? "bg-primary/10 text-primary border-primary/20" : "bg-muted"}`}>
                            {isAdmin ? "Staff" : "Customer"}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto shrink-0">{formatTimeAgo(msg.createdAt)}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90" data-testid={`text-message-body-${msg.id}`}>
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {ticket.status !== "closed" && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Reply</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <Textarea
                  placeholder="Type your reply to the customer..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  className="resize-none min-h-[120px] text-sm"
                  data-testid="textarea-reply"
                />
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3 h-3" />
                    The customer will be notified by email
                  </p>
                  <Button
                    onClick={() => replyMutation.mutate(replyText)}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    data-testid="button-send-reply"
                  >
                    {replyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Send Reply
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Ticket Details</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={ticket.status} onValueChange={(val) => statusMutation.mutate({ status: val })}>
                  <SelectTrigger data-testid="select-ticket-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Priority</label>
                <Select value={ticket.priority} onValueChange={(val) => statusMutation.mutate({ priority: val })}>
                  <SelectTrigger data-testid="select-ticket-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Customer</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {ticket.customerName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{ticket.customerName}</p>
                  <p className="text-xs text-muted-foreground truncate">{ticket.customerEmail}</p>
                </div>
              </div>
              {ticket.projectName && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1 border-t">
                  <Tag className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Project: {ticket.projectName}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Info</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Hash className="w-3 h-3 shrink-0" />
                <span>{ticket.ticketNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-3 h-3 shrink-0" />
                <span className="capitalize">{ticket.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 shrink-0" />
                <span>Opened {formatDate(ticket.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3 shrink-0" />
                <span>Updated {formatTimeAgo(ticket.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3 h-3 shrink-0" />
                <span>{ticket.messages.length} message{ticket.messages.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Actions</h3>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive"
              onClick={() => {
                if (confirm("Are you sure you want to permanently delete this ticket and all its messages? This cannot be undone.")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-delete-ticket"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              Delete Ticket
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SupportTickets() {
  usePageTitle("Support Center");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  if (selectedTicketId) {
    return <TicketDetailView ticketId={selectedTicketId} onBack={() => setSelectedTicketId(null)} />;
  }

  return <TicketListView onSelect={setSelectedTicketId} />;
}
