import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Globe,
  Plus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Server,
  User,
  Clock,
  Info,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Save,
} from "lucide-react";

const NAMESERVERS = ["ns1.linode.com", "ns2.linode.com", "ns3.linode.com", "ns4.linode.com", "ns5.linode.com"];
const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"];

interface DnsZone {
  id: string;
  domain: string;
  customerId: string | null;
  serverId: string | null;
  linodeDomainId: number | null;
  soaEmail: string | null;
  status: string | null;
  createdAt: string;
  customerName: string | null;
}

interface DnsRecord {
  id: number;
  type: string;
  name: string;
  target: string;
  ttl_sec: number;
  priority?: number;
  port?: number;
  weight?: number;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-muted-foreground hover:text-foreground transition-colors"
      data-testid={`button-copy-${text}`}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function getPlaceholder(type: string, field: string) {
  if (field === "name") {
    if (type === "MX" || type === "TXT") return "";
    return "subdomain";
  }
  if (field === "target") {
    const map: Record<string, string> = {
      A: "192.168.1.1", AAAA: "2001:db8::1", CNAME: "example.com",
      MX: "mail.example.com", TXT: "v=spf1 include:_spf.google.com ~all",
      NS: "ns1.example.com", SRV: "server.example.com",
    };
    return map[type] || "value";
  }
  return "";
}

function RecordFormFields({
  recordType, setRecordType, recordName, setRecordName,
  recordTarget, setRecordTarget, recordTtl, setRecordTtl,
  recordPriority, setRecordPriority, recordPort, setRecordPort,
  recordWeight, setRecordWeight, isEdit,
}: {
  recordType: string; setRecordType: (v: string) => void;
  recordName: string; setRecordName: (v: string) => void;
  recordTarget: string; setRecordTarget: (v: string) => void;
  recordTtl: string; setRecordTtl: (v: string) => void;
  recordPriority: string; setRecordPriority: (v: string) => void;
  recordPort: string; setRecordPort: (v: string) => void;
  recordWeight: string; setRecordWeight: (v: string) => void;
  isEdit?: boolean;
}) {
  const showPriority = recordType === "MX" || recordType === "SRV";
  const showPortWeight = recordType === "SRV";

  return (
    <div className="space-y-3">
      <div>
        <Label>Type</Label>
        <Select value={recordType} onValueChange={setRecordType} disabled={isEdit}>
          <SelectTrigger data-testid="select-record-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RECORD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {isEdit && <p className="text-xs text-muted-foreground mt-1">Type cannot be changed after creation</p>}
      </div>
      <div>
        <Label>Name</Label>
        <Input
          value={recordName} onChange={(e) => setRecordName(e.target.value)}
          placeholder={getPlaceholder(recordType, "name")}
          data-testid="input-record-name"
        />
        <p className="text-xs text-muted-foreground mt-1">Leave empty for root domain (@)</p>
      </div>
      <div>
        <Label>Target / Value</Label>
        <Input
          value={recordTarget} onChange={(e) => setRecordTarget(e.target.value)}
          placeholder={getPlaceholder(recordType, "target")}
          data-testid="input-record-target"
        />
      </div>
      <div className={`grid gap-3 ${showPriority && showPortWeight ? "grid-cols-2 sm:grid-cols-4" : showPriority ? "grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <Label>TTL (seconds)</Label>
          <Input value={recordTtl} onChange={(e) => setRecordTtl(e.target.value)} data-testid="input-record-ttl" />
        </div>
        {showPriority && (
          <div>
            <Label>Priority</Label>
            <Input value={recordPriority} onChange={(e) => setRecordPriority(e.target.value)} data-testid="input-record-priority" />
          </div>
        )}
        {showPortWeight && (
          <>
            <div>
              <Label>Port</Label>
              <Input value={recordPort} onChange={(e) => setRecordPort(e.target.value)} data-testid="input-record-port" />
            </div>
            <div>
              <Label>Weight</Label>
              <Input value={recordWeight} onChange={(e) => setRecordWeight(e.target.value)} data-testid="input-record-weight" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function buildRecordPayload(type: string, name: string, target: string, ttl: string, priority: string, port: string, weight: string) {
  const payload: any = {
    type,
    name: name,
    target,
    ttl_sec: parseInt(ttl) || 3600,
  };
  if (type === "MX" || type === "SRV") payload.priority = parseInt(priority) || 10;
  if (type === "SRV") {
    payload.port = parseInt(port) || 0;
    payload.weight = parseInt(weight) || 0;
  }
  return payload;
}

function ZoneCard({ zone, onDelete }: { zone: DnsZone; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [addRecordOpen, setAddRecordOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<DnsRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [recordType, setRecordType] = useState("A");
  const [recordName, setRecordName] = useState("");
  const [recordTarget, setRecordTarget] = useState("");
  const [recordTtl, setRecordTtl] = useState("3600");
  const [recordPriority, setRecordPriority] = useState("10");
  const [recordPort, setRecordPort] = useState("0");
  const [recordWeight, setRecordWeight] = useState("0");

  const [editType, setEditType] = useState("");
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editTtl, setEditTtl] = useState("3600");
  const [editPriority, setEditPriority] = useState("10");
  const [editPort, setEditPort] = useState("0");
  const [editWeight, setEditWeight] = useState("0");

  const { toast } = useToast();

  const { data: records = [], isLoading: recordsLoading } = useQuery<DnsRecord[]>({
    queryKey: ["/api/dns-zones", zone.id, "records"],
    queryFn: async () => {
      const res = await fetch(`/api/dns-zones/${zone.id}/records`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: expanded,
  });

  const addRecordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/dns-zones/${zone.id}/records`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dns-zones", zone.id, "records"] });
      setAddRecordOpen(false);
      resetAddForm();
      toast({ title: "Record added" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add record", description: err.message, variant: "destructive" });
    },
  });

  const editRecordMutation = useMutation({
    mutationFn: async ({ recordId, data }: { recordId: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/dns-zones/${zone.id}/records/${recordId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dns-zones", zone.id, "records"] });
      setEditOpen(false);
      setEditRecord(null);
      toast({ title: "Record updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update record", description: err.message, variant: "destructive" });
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (recordId: number) => {
      await apiRequest("DELETE", `/api/dns-zones/${zone.id}/records/${recordId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dns-zones", zone.id, "records"] });
      toast({ title: "Record deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete record", description: err.message, variant: "destructive" });
    },
  });

  function resetAddForm() {
    setRecordType("A");
    setRecordName("");
    setRecordTarget("");
    setRecordTtl("3600");
    setRecordPriority("10");
    setRecordPort("0");
    setRecordWeight("0");
  }

  function openEditDialog(record: DnsRecord) {
    setEditRecord(record);
    setEditType(record.type);
    setEditName(record.name || "");
    setEditTarget(record.target || "");
    setEditTtl(String(record.ttl_sec || 3600));
    setEditPriority(String(record.priority || 10));
    setEditPort(String(record.port || 0));
    setEditWeight(String(record.weight || 0));
    setEditOpen(true);
  }

  return (
    <Card className="overflow-hidden" data-testid={`card-dns-zone-${zone.id}`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-expand-zone-${zone.id}`}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <Globe className="w-5 h-5 text-primary" />
          <div>
            <span className="font-semibold text-sm" data-testid={`text-domain-${zone.id}`}>{zone.domain}</span>
            <div className="flex items-center gap-2 mt-0.5">
              {zone.customerName && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="w-3 h-3" /> {zone.customerName}
                </span>
              )}
              {zone.linodeDomainId && (
                <span className="text-xs text-muted-foreground">ID: {zone.linodeDomainId}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={zone.status === "active" ? "default" : "secondary"} className="text-xs" data-testid={`badge-status-${zone.id}`}>
            {zone.status || "active"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(zone.id); }}
            data-testid={`button-delete-zone-${zone.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <Server className="w-4 h-4" /> DNS Records
            </h4>
            <Dialog open={addRecordOpen} onOpenChange={(open) => { setAddRecordOpen(open); if (!open) resetAddForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs" data-testid={`button-add-record-${zone.id}`}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Record
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add DNS Record — {zone.domain}</DialogTitle>
                </DialogHeader>
                <div className="pt-2">
                  <RecordFormFields
                    recordType={recordType} setRecordType={setRecordType}
                    recordName={recordName} setRecordName={setRecordName}
                    recordTarget={recordTarget} setRecordTarget={setRecordTarget}
                    recordTtl={recordTtl} setRecordTtl={setRecordTtl}
                    recordPriority={recordPriority} setRecordPriority={setRecordPriority}
                    recordPort={recordPort} setRecordPort={setRecordPort}
                    recordWeight={recordWeight} setRecordWeight={setRecordWeight}
                  />
                  <Button
                    className="w-full mt-4"
                    onClick={() => addRecordMutation.mutate(buildRecordPayload(recordType, recordName, recordTarget, recordTtl, recordPriority, recordPort, recordWeight))}
                    disabled={!recordTarget || addRecordMutation.isPending}
                    data-testid="button-submit-record"
                  >
                    {addRecordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add Record
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditRecord(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit DNS Record — {zone.domain}</DialogTitle>
              </DialogHeader>
              {editRecord && (
                <div className="pt-2">
                  <RecordFormFields
                    recordType={editType} setRecordType={setEditType}
                    recordName={editName} setRecordName={setEditName}
                    recordTarget={editTarget} setRecordTarget={setEditTarget}
                    recordTtl={editTtl} setRecordTtl={setEditTtl}
                    recordPriority={editPriority} setRecordPriority={setEditPriority}
                    recordPort={editPort} setRecordPort={setEditPort}
                    recordWeight={editWeight} setRecordWeight={setEditWeight}
                    isEdit
                  />
                  <Button
                    className="w-full mt-4"
                    onClick={() => editRecordMutation.mutate({
                      recordId: editRecord.id,
                      data: buildRecordPayload(editType, editName, editTarget, editTtl, editPriority, editPort, editWeight),
                    })}
                    disabled={!editTarget || editRecordMutation.isPending}
                    data-testid="button-save-record"
                  >
                    {editRecordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {recordsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No DNS records yet. Click "Add Record" to create one.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Type</th>
                    <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Name</th>
                    <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Target / Value</th>
                    <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">TTL</th>
                    <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground hidden sm:table-cell">Extra</th>
                    <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-t hover:bg-muted/30 transition-colors" data-testid={`row-record-${record.id}`}>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs font-mono">{record.type}</Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{record.name || "@"}</td>
                      <td className="px-3 py-2 font-mono text-xs max-w-[200px] truncate" title={record.target}>{record.target}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{record.ttl_sec || "default"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">
                        {record.priority != null && <span>pri:{record.priority} </span>}
                        {record.port != null && record.type === "SRV" && <span>port:{record.port} </span>}
                        {record.weight != null && record.type === "SRV" && <span>w:{record.weight}</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditDialog(record)}
                            data-testid={`button-edit-record-${record.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm(`Delete this ${record.type} record?`)) deleteRecordMutation.mutate(record.id); }}
                            disabled={deleteRecordMutation.isPending}
                            data-testid={`button-delete-record-${record.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
              <Info className="w-3.5 h-3.5" /> Point your domain to these nameservers
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {NAMESERVERS.map(ns => (
                <div key={ns} className="flex items-center gap-1.5 bg-background rounded px-2 py-1 text-xs font-mono">
                  {ns}
                  <CopyButton text={ns} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function DnsDomains() {
  const [addZoneOpen, setAddZoneOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newSoaEmail, setNewSoaEmail] = useState("");
  const [newCustomerId, setNewCustomerId] = useState("");
  const { toast } = useToast();

  const { data: zones = [], isLoading } = useQuery<DnsZone[]>({
    queryKey: ["/api/dns-zones"],
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  const createZoneMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/dns-zones", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dns-zones"] });
      setAddZoneOpen(false);
      setNewDomain("");
      setNewSoaEmail("");
      setNewCustomerId("");
      toast({ title: "DNS zone created" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create DNS zone", description: err.message, variant: "destructive" });
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/dns-zones/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dns-zones"] });
      toast({ title: "DNS zone deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete DNS zone", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Globe className="w-6 h-6 text-primary" /> DNS Domains
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage DNS zones and records for all client domains via Linode DNS
          </p>
        </div>
        <Dialog open={addZoneOpen} onOpenChange={setAddZoneOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-zone">
              <Plus className="w-4 h-4 mr-2" /> Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add DNS Zone</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label>Domain</Label>
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  data-testid="input-zone-domain"
                />
              </div>
              <div>
                <Label>SOA Email</Label>
                <Input
                  value={newSoaEmail}
                  onChange={(e) => setNewSoaEmail(e.target.value)}
                  placeholder="admin@example.com"
                  data-testid="input-zone-soa-email"
                />
                <p className="text-xs text-muted-foreground mt-1">Defaults to admin@domain if empty</p>
              </div>
              <div>
                <Label>Assign to Customer (optional)</Label>
                <Select value={newCustomerId} onValueChange={setNewCustomerId}>
                  <SelectTrigger data-testid="select-zone-customer"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {customers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => createZoneMutation.mutate({
                  domain: newDomain,
                  soaEmail: newSoaEmail || undefined,
                  customerId: newCustomerId && newCustomerId !== "none" ? newCustomerId : undefined,
                })}
                disabled={!newDomain || createZoneMutation.isPending}
                data-testid="button-submit-zone"
              >
                {createZoneMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create DNS Zone
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : zones.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Globe className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-1">No DNS Domains Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add a domain to start managing DNS records. Domains are managed through Linode's DNS infrastructure.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {zones.length} domain{zones.length !== 1 ? "s" : ""} managed
          </div>
          {zones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              onDelete={(id) => {
                if (confirm(`Delete DNS zone for ${zone.domain}? This will also remove it from Linode.`)) {
                  deleteZoneMutation.mutate(id);
                }
              }}
            />
          ))}
        </div>
      )}

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">DNS Propagation</p>
              <p className="text-xs text-muted-foreground mt-1">
                After adding or changing DNS records, changes can take up to 24-48 hours to propagate globally.
                Point your domain's nameservers to Linode's nameservers (ns1-ns5.linode.com) at your domain registrar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
