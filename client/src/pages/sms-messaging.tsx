import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  MessageSquare, Users, Zap, Send, Plus, MoreVertical, Trash2, UserMinus, UserPlus,
  Phone, Mail, Clock, CheckCircle2, XCircle, AlertCircle, Search, Filter,
  Radio, Hash, ArrowUpDown, RefreshCw, Pencil, Eye, Megaphone, BarChart3,
  TrendingUp, TrendingDown, MousePointerClick, MailOpen, ShieldAlert, ListChecks, Palette, UserPlus2
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { SmsSubscriber, SmsEvent, SmsMessage, SmsList } from "@shared/schema";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
    active: { variant: "default", icon: CheckCircle2 },
    unsubscribed: { variant: "secondary", icon: XCircle },
    deleted: { variant: "destructive", icon: Trash2 },
    queued: { variant: "outline", icon: Clock },
    sent: { variant: "default", icon: Send },
    delivered: { variant: "default", icon: CheckCircle2 },
    failed: { variant: "destructive", icon: AlertCircle },
  };
  const c = config[status] || { variant: "outline" as const, icon: AlertCircle };
  const Icon = c.icon;
  return (
    <Badge variant={c.variant} className="gap-1" data-testid={`badge-status-${status}`}>
      <Icon className="w-3 h-3" />
      {status}
    </Badge>
  );
}

function StatsCards({ stats }: { stats: any }) {
  const cards = [
    { label: "Active Subscribers", value: stats?.activeSubscribers || 0, icon: Users, color: "text-emerald-500" },
    { label: "Total Messages", value: stats?.totalMessages || 0, icon: MessageSquare, color: "text-blue-500" },
    { label: "Active Events", value: stats?.totalEvents || 0, icon: Zap, color: "text-amber-500" },
    { label: "Unsubscribed", value: stats?.unsubscribed || 0, icon: UserMinus, color: "text-red-400" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label} data-testid={`card-stat-${c.label.toLowerCase().replace(/\s+/g, "-")}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-3xl font-bold mt-1">{c.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-muted ${c.color}`}>
                <c.icon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SubscribersTab() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<SmsSubscriber | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCompose, setShowCompose] = useState(false);

  const [addForm, setAddForm] = useState({ name: "", phone: "", email: "", source: "", tags: "", notes: "" });
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", source: "", tags: "", notes: "" });

  const { data: subscribers = [], isLoading } = useQuery<SmsSubscriber[]>({
    queryKey: ["/api/sms/subscribers", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/sms/subscribers?status=${statusFilter}`, { credentials: "include" });
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/sms/subscribers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/stats"] });
      setShowAdd(false);
      setAddForm({ name: "", phone: "", email: "", source: "", tags: "", notes: "" });
      toast({ title: "Subscriber added" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/sms/subscribers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/subscribers"] });
      setShowEdit(null);
      toast({ title: "Subscriber updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, hard }: { id: string; hard?: boolean }) => apiRequest("DELETE", `/api/sms/subscribers/${id}${hard ? "?hard=true" : ""}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/stats"] });
      toast({ title: "Subscriber removed" });
    },
  });

  const unsubMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/sms/subscribers/${id}/unsubscribe`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/stats"] });
      toast({ title: "Subscriber unsubscribed" });
    },
  });

  const resubMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/sms/subscribers/${id}/resubscribe`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/stats"] });
      toast({ title: "Subscriber reactivated" });
    },
  });

  const filtered = subscribers.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.name?.toLowerCase().includes(q) || s.phone.includes(q) || s.email?.toLowerCase().includes(q));
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((s) => s.id)));
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-subscribers" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <Button variant="default" onClick={() => setShowCompose(true)} data-testid="button-send-selected">
            <Send className="w-4 h-4 mr-2" />
            Send to {selected.size}
          </Button>
        )}
        <Button onClick={() => setShowAdd(true)} data-testid="button-add-subscriber">
          <Plus className="w-4 h-4 mr-2" />
          Add Subscriber
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} className="rounded" data-testid="checkbox-select-all" />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No subscribers found</TableCell></TableRow>
              ) : filtered.map((sub) => (
                <TableRow key={sub.id} data-testid={`row-subscriber-${sub.id}`}>
                  <TableCell>
                    <input type="checkbox" checked={selected.has(sub.id)} onChange={() => toggleSelect(sub.id)} className="rounded" />
                  </TableCell>
                  <TableCell className="font-medium">{sub.name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      {sub.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    {sub.email ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        {sub.email}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell><StatusBadge status={sub.status} /></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{sub.source || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {sub.optedInAt ? new Date(sub.optedInAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-menu-${sub.id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setShowEdit(sub); setEditForm({ name: sub.name || "", phone: sub.phone, email: sub.email || "", source: sub.source || "", tags: sub.tags || "", notes: sub.notes || "" }); }}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        {sub.status === "active" && (
                          <DropdownMenuItem onClick={() => unsubMutation.mutate(sub.id)}>
                            <UserMinus className="w-4 h-4 mr-2" /> Unsubscribe
                          </DropdownMenuItem>
                        )}
                        {sub.status === "unsubscribed" && (
                          <DropdownMenuItem onClick={() => resubMutation.mutate(sub.id)}>
                            <UserPlus className="w-4 h-4 mr-2" /> Resubscribe
                          </DropdownMenuItem>
                        )}
                        {sub.status !== "deleted" && (
                          <DropdownMenuItem onClick={() => deleteMutation.mutate({ id: sub.id })} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> Soft Delete
                          </DropdownMenuItem>
                        )}
                        {sub.status === "deleted" && (
                          <DropdownMenuItem onClick={() => deleteMutation.mutate({ id: sub.id, hard: true })} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> Permanently Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subscriber</DialogTitle>
            <DialogDescription>Add a new SMS subscriber to your list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name</Label><Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="John Doe" data-testid="input-add-name" /></div>
              <div><Label>Phone *</Label><Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="+1 (555) 123-4567" data-testid="input-add-phone" /></div>
            </div>
            <div><Label>Email</Label><Input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="john@example.com" data-testid="input-add-email" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Source</Label><Input value={addForm.source} onChange={(e) => setAddForm({ ...addForm, source: e.target.value })} placeholder="Website, Manual, Import..." data-testid="input-add-source" /></div>
              <div><Label>Tags</Label><Input value={addForm.tags} onChange={(e) => setAddForm({ ...addForm, tags: e.target.value })} placeholder="vip, client, lead..." data-testid="input-add-tags" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} placeholder="Any notes about this subscriber..." data-testid="input-add-notes" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(addForm)} disabled={!addForm.phone || createMutation.isPending} data-testid="button-save-subscriber">
              {createMutation.isPending ? "Adding..." : "Add Subscriber"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscriber</DialogTitle>
            <DialogDescription>Update subscriber information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="input-edit-name" /></div>
              <div><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} data-testid="input-edit-phone" /></div>
            </div>
            <div><Label>Email</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} data-testid="input-edit-email" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Source</Label><Input value={editForm.source} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })} data-testid="input-edit-source" /></div>
              <div><Label>Tags</Label><Input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} data-testid="input-edit-tags" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} data-testid="input-edit-notes" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button onClick={() => showEdit && updateMutation.mutate({ id: showEdit.id, data: editForm })} disabled={updateMutation.isPending} data-testid="button-update-subscriber">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ComposeDialog open={showCompose} onOpenChange={setShowCompose} subscriberIds={Array.from(selected)} onSent={() => setSelected(new Set())} />
    </>
  );
}

function EventsTab() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<SmsEvent | null>(null);
  const [showPreview, setShowPreview] = useState<SmsEvent | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", messageTemplate: "", enabled: true, isSystem: false });

  const { data: events = [], isLoading } = useQuery<SmsEvent[]>({
    queryKey: ["/api/sms/events"],
    queryFn: async () => {
      const res = await fetch("/api/sms/events", { credentials: "include" });
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/sms/events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/stats"] });
      setShowCreate(false);
      setForm({ name: "", slug: "", description: "", messageTemplate: "", enabled: true, isSystem: false });
      toast({ title: "Event created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/sms/events/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/events"] });
      setShowEdit(null);
      toast({ title: "Event updated" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => apiRequest("PATCH", `/api/sms/events/${id}`, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sms/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/stats"] });
      toast({ title: "Event deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Cannot delete", description: err.message, variant: "destructive" });
    },
  });

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">Configure events that trigger SMS messages. System events fire automatically; custom events can be triggered manually or via API.</p>
        <Button onClick={() => setShowCreate(true)} data-testid="button-create-event">
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading events...</CardContent></Card>
        ) : events.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No events configured</CardContent></Card>
        ) : events.map((ev) => (
          <Card key={ev.id} className={`transition-all ${!ev.enabled ? "opacity-60" : ""}`} data-testid={`card-event-${ev.id}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className={`w-4 h-4 ${ev.enabled ? "text-amber-500" : "text-muted-foreground"}`} />
                    <h3 className="font-semibold">{ev.name}</h3>
                    {ev.isSystem && <Badge variant="outline" className="text-xs">System</Badge>}
                    <Badge variant="secondary" className="text-xs font-mono">{ev.slug}</Badge>
                  </div>
                  {ev.description && <p className="text-sm text-muted-foreground mb-2">{ev.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> Triggered {ev.triggerCount} times</span>
                    {ev.lastTriggeredAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last: {new Date(ev.lastTriggeredAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={ev.enabled} onCheckedChange={(checked) => toggleMutation.mutate({ id: ev.id, enabled: checked })} data-testid={`switch-event-${ev.id}`} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowPreview(ev)}><Eye className="w-4 h-4 mr-2" /> Preview Message</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setShowEdit(ev); setForm({ name: ev.name, slug: ev.slug, description: ev.description || "", messageTemplate: ev.messageTemplate, enabled: ev.enabled, isSystem: ev.isSystem }); }}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      {!ev.isSystem && (
                        <DropdownMenuItem onClick={() => deleteMutation.mutate(ev.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Custom Event</DialogTitle>
            <DialogDescription>Define a new event trigger with a message template. Use {"{{name}}"}, {"{{link}}"}, {"{{amount}}"} as placeholders.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Event Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: autoSlug(e.target.value) })} placeholder="e.g. Welcome Back Offer" data-testid="input-event-name" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="welcome_back_offer" className="font-mono text-sm" data-testid="input-event-slug" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="When this event fires..." data-testid="input-event-description" />
            </div>
            <div>
              <Label>Message Template *</Label>
              <Textarea value={form.messageTemplate} onChange={(e) => setForm({ ...form, messageTemplate: e.target.value })} placeholder={"Hi {{name}}, check out our latest offer! {{link}}"} rows={4} data-testid="input-event-template" />
              <p className="text-xs text-muted-foreground mt-1">Available variables: {"{{name}}, {{link}}, {{amount}}, {{invoiceNumber}}, {{projectName}}"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.messageTemplate || !form.slug || createMutation.isPending} data-testid="button-save-event">
              {createMutation.isPending ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update event configuration and message template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Event Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-edit-event-name" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-edit-event-description" />
            </div>
            <div>
              <Label>Message Template</Label>
              <Textarea value={form.messageTemplate} onChange={(e) => setForm({ ...form, messageTemplate: e.target.value })} rows={4} data-testid="input-edit-event-template" />
              <p className="text-xs text-muted-foreground mt-1">Available variables: {"{{name}}, {{link}}, {{amount}}, {{invoiceNumber}}, {{projectName}}"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button onClick={() => showEdit && updateMutation.mutate({ id: showEdit.id, data: form })} disabled={updateMutation.isPending} data-testid="button-update-event">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
            <DialogDescription>{showPreview?.name}</DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-xl p-4">
            <div className="bg-emerald-500 text-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-sm leading-relaxed">
              {showPreview?.messageTemplate.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
                const samples: Record<string, string> = { name: "John", link: "https://aipoweredsites.com/portal/abc", amount: "499.00", invoiceNumber: "INV-001", projectName: "My Website" };
                return samples[key] || `[${key}]`;
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">This is a preview with sample data. Actual values will be injected at send time.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ListsTab() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingList, setEditingList] = useState<SmsList | null>(null);
  const [selectedList, setSelectedList] = useState<(SmsList & { memberCount: number }) | null>(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [searchMembers, setSearchMembers] = useState("");

  const { data: lists = [], isLoading } = useQuery<(SmsList & { memberCount: number })[]>({
    queryKey: ["/api/sms/lists"],
    queryFn: async () => { const r = await fetch("/api/sms/lists", { credentials: "include" }); return r.json(); },
  });

  const { data: members = [], refetch: refetchMembers } = useQuery<SmsSubscriber[]>({
    queryKey: ["/api/sms/lists", selectedList?.id, "members"],
    queryFn: async () => { const r = await fetch(`/api/sms/lists/${selectedList!.id}/members`, { credentials: "include" }); return r.json(); },
    enabled: !!selectedList,
  });

  const { data: allSubscribers = [] } = useQuery<SmsSubscriber[]>({
    queryKey: ["/api/sms/subscribers"],
    queryFn: async () => { const r = await fetch("/api/sms/subscribers", { credentials: "include" }); return r.json(); },
    enabled: showAddMembers,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/sms/lists", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: newName, description: newDesc || null, color: newColor }) });
      if (!r.ok) throw new Error("Failed to create list");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/lists"] });
      setShowCreate(false); setNewName(""); setNewDesc(""); setNewColor("#3b82f6");
      toast({ title: "List created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/sms/lists/${editingList!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: newName, description: newDesc || null, color: newColor }) });
      if (!r.ok) throw new Error("Failed to update");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/lists"] });
      setEditingList(null); setNewName(""); setNewDesc(""); setNewColor("#3b82f6");
      toast({ title: "List updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/sms/lists/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/lists"] });
      if (selectedList) setSelectedList(null);
      toast({ title: "List deleted" });
    },
  });

  const addMembersMutation = useMutation({
    mutationFn: async (subscriberIds: string[]) => {
      const r = await fetch(`/api/sms/lists/${selectedList!.id}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ subscriberIds }) });
      return r.json();
    },
    onSuccess: (data) => {
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ["/api/sms/lists"] });
      setShowAddMembers(false);
      toast({ title: `Added ${data.added} contact(s)` });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (subscriberId: string) => {
      await fetch(`/api/sms/lists/${selectedList!.id}/members/${subscriberId}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => {
      refetchMembers();
      queryClient.invalidateQueries({ queryKey: ["/api/sms/lists"] });
      toast({ title: "Contact removed from list" });
    },
  });

  const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#f97316"];

  if (selectedList) {
    const filteredMembers = members.filter(m => !searchMembers || m.name?.toLowerCase().includes(searchMembers.toLowerCase()) || m.phone.includes(searchMembers));
    const memberIds = new Set(members.map(m => m.id));
    const availableToAdd = allSubscribers.filter(s => s.status === "active" && !memberIds.has(s.id));

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedList(null)} data-testid="button-back-to-lists">
            <ArrowUpDown className="w-4 h-4 mr-1" /> Back to Lists
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedList.color || "#3b82f6" }} />
            <h3 className="text-lg font-semibold">{selectedList.name}</h3>
            <Badge variant="secondary">{members.length} contacts</Badge>
          </div>
        </div>

        {selectedList.description && (
          <p className="text-sm text-muted-foreground">{selectedList.description}</p>
        )}

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search contacts..." value={searchMembers} onChange={(e) => setSearchMembers(e.target.value)} className="pl-9" data-testid="input-search-members" />
          </div>
          <Button onClick={() => setShowAddMembers(true)} className="gap-2" data-testid="button-add-contacts">
            <UserPlus2 className="w-4 h-4" /> Add Contacts
          </Button>
        </div>

        {showAddMembers && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add Contacts to {selectedList.name}</CardTitle>
              <CardDescription>{availableToAdd.length} active contacts not yet in this list</CardDescription>
            </CardHeader>
            <CardContent>
              {availableToAdd.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {availableToAdd.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-2 rounded hover:bg-muted" data-testid={`row-add-member-${sub.id}`}>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{sub.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{sub.phone}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addMembersMutation.mutate([sub.id])} data-testid={`button-add-${sub.id}`}>
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">All active contacts are already in this list</p>
              )}
              <div className="flex justify-end mt-3">
                <Button variant="ghost" size="sm" onClick={() => setShowAddMembers(false)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length > 0 ? filteredMembers.map(m => (
                <TableRow key={m.id} data-testid={`row-member-${m.id}`}>
                  <TableCell className="font-medium">{m.name || "—"}</TableCell>
                  <TableCell>{m.phone}</TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => removeMemberMutation.mutate(m.id)} data-testid={`button-remove-member-${m.id}`}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No contacts in this list yet. Click "Add Contacts" to get started.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Organize contacts into lists for targeted messaging.</p>
        <Button onClick={() => { setShowCreate(true); setNewName(""); setNewDesc(""); setNewColor("#3b82f6"); }} className="gap-2" data-testid="button-create-list">
          <Plus className="w-4 h-4" /> Create List
        </Button>
      </div>

      <Dialog open={showCreate || !!editingList} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditingList(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingList ? "Edit List" : "Create New List"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Main Newsletter" data-testid="input-list-name" />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What is this list for?" data-testid="input-list-desc" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex gap-2">
                {colors.map(c => (
                  <button key={c} onClick={() => setNewColor(c)} className={`w-8 h-8 rounded-full transition-all ${newColor === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"}`} style={{ backgroundColor: c }} data-testid={`button-color-${c}`} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditingList(null); }}>Cancel</Button>
            <Button onClick={() => editingList ? updateMutation.mutate() : createMutation.mutate()} disabled={!newName.trim()} data-testid="button-save-list">
              {editingList ? "Save Changes" : "Create List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Loading lists...</CardContent></Card>
      ) : lists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ListChecks className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <h3 className="font-semibold mb-1">No lists yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first list to organize contacts for targeted messaging.</p>
            <Button onClick={() => { setShowCreate(true); setNewName(""); setNewDesc(""); setNewColor("#3b82f6"); }} className="gap-2" data-testid="button-create-first-list">
              <Plus className="w-4 h-4" /> Create Your First List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map(list => (
            <Card key={list.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedList(list)} data-testid={`card-list-${list.id}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: list.color || "#3b82f6" }} />
                    <div>
                      <h3 className="font-semibold">{list.name}</h3>
                      {list.description && <p className="text-xs text-muted-foreground mt-0.5">{list.description}</p>}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-list-menu-${list.id}`}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingList(list); setNewName(list.name); setNewDesc(list.description || ""); setNewColor(list.color || "#3b82f6"); }}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(list.id); }} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{list.memberCount} contact{list.memberCount !== 1 ? "s" : ""}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RateCard({ label, value, icon: Icon, color, trend }: { label: string; value: number; icon: any; color: string; trend?: string }) {
  return (
    <Card data-testid={`card-rate-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}%</p>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
          </div>
          <div className={`p-3 rounded-xl bg-muted ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsTab() {
  const [days, setDays] = useState("30");

  const { data: analytics, isLoading } = useQuery<{
    deliveryRate: number; openRate: number; clickRate: number; unsubscribeRate: number;
    totalSent: number; totalDelivered: number; totalOpened: number; totalClicked: number; totalFailed: number;
    dailyMessages: { date: string; sent: number; delivered: number; opened: number; failed: number }[];
    dailySubscribers: { date: string; newSubscribers: number; unsubscribed: number }[];
    eventPerformance: { name: string; sent: number; delivered: number; opened: number; clicked: number }[];
  }>({
    queryKey: ["/api/sms/analytics", days],
    queryFn: async () => {
      const res = await fetch(`/api/sms/analytics?days=${days}`, { credentials: "include" });
      return res.json();
    },
  });

  if (isLoading) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Loading analytics...</CardContent></Card>;
  }

  const a = analytics || { deliveryRate: 0, openRate: 0, clickRate: 0, unsubscribeRate: 0, totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0, totalFailed: 0, dailyMessages: [], dailySubscribers: [], eventPerformance: [] };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Message performance and subscriber trends over time.</p>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[150px]" data-testid="select-analytics-days">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RateCard label="Delivery Rate" value={a.deliveryRate} icon={Send} color="text-emerald-500" trend={`${a.totalDelivered} of ${a.totalSent} delivered`} />
        <RateCard label="Open Rate" value={a.openRate} icon={MailOpen} color="text-blue-500" trend={`${a.totalOpened} opened`} />
        <RateCard label="Click Rate" value={a.clickRate} icon={MousePointerClick} color="text-violet-500" trend={`${a.totalClicked} clicked`} />
        <RateCard label="Unsubscribe Rate" value={a.unsubscribeRate} icon={UserMinus} color="text-red-400" trend={`${a.totalFailed} failed`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: "Total Sent", value: a.totalSent, icon: Send, color: "text-blue-500" },
          { label: "Delivered", value: a.totalDelivered, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Opened", value: a.totalOpened, icon: MailOpen, color: "text-violet-500" },
          { label: "Clicked", value: a.totalClicked, icon: MousePointerClick, color: "text-amber-500" },
          { label: "Failed", value: a.totalFailed, icon: ShieldAlert, color: "text-red-500" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-bold">{item.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Message Volume
          </CardTitle>
          <CardDescription>Daily breakdown of sent, delivered, opened, and failed messages.</CardDescription>
        </CardHeader>
        <CardContent>
          {a.dailyMessages.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={a.dailyMessages}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} />
                <Legend />
                <Area type="monotone" dataKey="sent" name="Sent" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="delivered" name="Delivered" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="opened" name="Opened" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No message data yet</p>
                <p className="text-xs mt-1">Send your first message to see analytics here</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Subscriber Growth
            </CardTitle>
            <CardDescription>New subscribers vs unsubscribes over time.</CardDescription>
          </CardHeader>
          <CardContent>
            {a.dailySubscribers.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={a.dailySubscribers}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} />
                  <Legend />
                  <Bar dataKey="newSubscribers" name="New" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="unsubscribed" name="Unsubscribed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No subscriber data yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Event Performance
            </CardTitle>
            <CardDescription>How each event trigger is performing.</CardDescription>
          </CardHeader>
          <CardContent>
            {a.eventPerformance.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Opened</TableHead>
                    <TableHead className="text-right">Clicked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {a.eventPerformance.map((ep, i) => (
                    <TableRow key={i} data-testid={`row-event-perf-${i}`}>
                      <TableCell className="font-medium">{ep.name}</TableCell>
                      <TableCell className="text-right">{ep.sent}</TableCell>
                      <TableCell className="text-right text-emerald-600">{ep.delivered}</TableCell>
                      <TableCell className="text-right text-violet-600">{ep.opened}</TableCell>
                      <TableCell className="text-right text-amber-600">{ep.clicked}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Zap className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No event data yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ComposeDialog({ open, onOpenChange, subscriberIds, onSent }: { open: boolean; onOpenChange: (open: boolean) => void; subscriberIds?: string[]; onSent?: () => void }) {
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [eventId, setEventId] = useState("");

  const { data: events = [] } = useQuery<SmsEvent[]>({
    queryKey: ["/api/sms/events"],
    queryFn: async () => {
      const res = await fetch("/api/sms/events", { credentials: "include" });
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", subscriberIds?.length ? "/api/sms/send" : "/api/sms/broadcast", data),
    onSuccess: async (res) => {
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/sms/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/stats"] });
      setBody("");
      setEventId("");
      onOpenChange(false);
      onSent?.();
      toast({ title: `${result.sent} message(s) queued`, description: "Messages will be sent when Twilio is connected." });
    },
  });

  const applyTemplate = (evId: string) => {
    setEventId(evId);
    const ev = events.find((e) => e.id === evId);
    if (ev) setBody(ev.messageTemplate);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {subscriberIds?.length ? `Send to ${subscriberIds.length} subscriber(s)` : "Broadcast to All"}
          </DialogTitle>
          <DialogDescription>
            {subscriberIds?.length ? "Send a targeted message to selected subscribers." : "Send a message to all active subscribers."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Event Template (optional)</Label>
            <Select value={eventId} onValueChange={applyTemplate}>
              <SelectTrigger data-testid="select-event-template">
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {events.filter(e => e.enabled).map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Message *</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Type your message here... Use {{name}} for personalization. Include links like https://aipoweredsites.com" data-testid="input-compose-body" />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-muted-foreground">Supports hyperlinks. Paste any URL and it will be clickable.</p>
              <p className="text-xs text-muted-foreground">{body.length} / 1600 chars</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => sendMutation.mutate({ body, eventId: eventId || undefined, subscriberIds })} disabled={!body || sendMutation.isPending} data-testid="button-send-message">
            {sendMutation.isPending ? "Sending..." : (
              <><Send className="w-4 h-4 mr-2" /> Queue Message</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MessagesTab() {
  const { data: messages = [], isLoading } = useQuery<SmsMessage[]>({
    queryKey: ["/api/sms/messages"],
    queryFn: async () => {
      const res = await fetch("/api/sms/messages", { credentials: "include" });
      return res.json();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5" />
          Message Log
        </CardTitle>
        <CardDescription>All outbound SMS messages. Messages are queued until Twilio is connected.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : messages.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No messages sent yet</TableCell></TableRow>
            ) : messages.map((msg) => (
              <TableRow key={msg.id} data-testid={`row-message-${msg.id}`}>
                <TableCell className="font-medium">{msg.subscriberName || "—"}</TableCell>
                <TableCell className="font-mono text-sm">{msg.subscriberPhone}</TableCell>
                <TableCell>{msg.eventName ? <Badge variant="outline" className="text-xs">{msg.eventName}</Badge> : "—"}</TableCell>
                <TableCell className="max-w-[300px] truncate text-sm">{msg.body}</TableCell>
                <TableCell><StatusBadge status={msg.status} /></TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function SmsMessaging() {
  usePageTitle("SMS Messaging");
  const [showBroadcast, setShowBroadcast] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["/api/sms/stats"],
    queryFn: async () => {
      const res = await fetch("/api/sms/stats", { credentials: "include" });
      return res.json();
    },
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <MessageSquare className="w-7 h-7 text-primary" />
            SMS Messaging
          </h1>
          <p className="text-muted-foreground mt-1">Manage subscribers, configure event triggers, and send targeted SMS messages.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBroadcast(true)} data-testid="button-broadcast">
            <Megaphone className="w-4 h-4 mr-2" />
            Broadcast
          </Button>
          <Badge variant="outline" className="px-3 py-2 gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-500" />
            Twilio: Not Connected
          </Badge>
        </div>
      </div>

      <StatsCards stats={stats} />

      <Tabs defaultValue="subscribers" className="space-y-4">
        <TabsList data-testid="tabs-sms">
          <TabsTrigger value="subscribers" className="gap-2" data-testid="tab-subscribers">
            <Users className="w-4 h-4" />
            Subscribers
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2" data-testid="tab-events">
            <Zap className="w-4 h-4" />
            Events
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2" data-testid="tab-messages">
            <MessageSquare className="w-4 h-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="lists" className="gap-2" data-testid="tab-lists">
            <ListChecks className="w-4 h-4" />
            Lists
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2" data-testid="tab-analytics">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers">
          <SubscribersTab />
        </TabsContent>

        <TabsContent value="events">
          <EventsTab />
        </TabsContent>

        <TabsContent value="messages">
          <MessagesTab />
        </TabsContent>

        <TabsContent value="lists">
          <ListsTab />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>

      <ComposeDialog open={showBroadcast} onOpenChange={setShowBroadcast} />

      <Card className="border-dashed border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Twilio Integration Pending</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Messages are currently being queued but not delivered. Once you connect your Twilio account (Account SID, Auth Token, and Phone Number),
                messages will be sent automatically. All event triggers, subscriber management, and message composition are fully functional.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
