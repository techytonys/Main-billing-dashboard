import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Server,
  Plus,
  Trash2,
  Loader2,
  Globe,
  Cpu,
  HardDrive,
  MemoryStick,
  Activity,
  FileText,
  RefreshCw,
  ArrowUpDown,
  Network,
  MapPin,
  Terminal,
  Copy,
  Check,
  RotateCcw,
  Shield,
  ShieldOff,
  Pencil,
  DollarSign,
  Clock,
  UserPlus,
  Rocket,
  ShieldCheck,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import type { LinodeServer, Customer } from "@shared/schema";

const regionCountryMap: Record<string, string> = {
  "us-central": "us", "us-west": "us", "us-east": "us", "us-southeast": "us", "us-iad": "us", "us-ord": "us", "us-lax": "us", "us-mia": "us", "us-den": "us", "us-sea": "us",
  "ca-central": "ca",
  "eu-west": "gb", "eu-central": "de", "ap-west": "in", "ap-south": "sg", "ap-southeast": "au", "ap-northeast": "jp",
  "gb-lon": "gb", "de-fra": "de", "fr-par": "fr", "nl-ams": "nl", "se-sto": "se", "es-mad": "es", "it-mil": "it",
  "in-maa": "in", "in-bom": "in", "sg-sin": "sg", "au-mel": "au", "jp-osa": "jp", "jp-tyo": "jp",
  "id-cgk": "id", "br-gru": "br", "cl-scl": "cl", "co-bog": "co", "mx-qro": "mx",
};

function getCountryFlag(region: string): string {
  const code = regionCountryMap[region] || region.split("-")[0];
  if (code.length === 2) {
    return String.fromCodePoint(...[...code.toUpperCase()].map(c => c.charCodeAt(0) + 127397));
  }
  return "🌐";
}

interface LinodeType {
  id: string;
  label: string;
  typeClass: string;
  vcpus: number;
  memory: number;
  disk: number;
  transfer: number;
  monthlyPrice: number;
  hourlyPrice: number;
}

interface LinodeRegion {
  id: string;
  label: string;
  country: string;
}

interface PricingData {
  hourlyPrice: number;
  hourlyWithMarkup: number;
  hoursRunning: number;
  billingStart: string;
  linodeCostSoFar: number;
  costWithMarkup: number;
  markupPercent: number;
  monthlyPrice: number;
  monthlyWithMarkup: number;
  backupMonthly: number;
  backupWithMarkup: number;
}

function LiveUsageCounter({ serverId, status }: { serverId: string; status: string }) {
  const isProvisioned = status !== "provisioning";
  const isRunning = status === "running";

  const { data: pricing, refetch } = useQuery<PricingData>({
    queryKey: ["/api/linode/servers", serverId, "pricing"],
    queryFn: async () => {
      const res = await fetch(`/api/linode/servers/${serverId}/pricing`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isProvisioned,
    refetchInterval: isRunning ? 30000 : 60000,
  });

  const [prevStatus, setPrevStatus] = useState(status);
  useEffect(() => {
    if (prevStatus !== status) {
      refetch();
    }
    setPrevStatus(status);
  }, [status, prevStatus, refetch]);

  const [displayCost, setDisplayCost] = useState(0);
  const pricingRef = useRef(pricing);
  pricingRef.current = pricing;

  useEffect(() => {
    if (!pricing) return;
    setDisplayCost(pricing.costWithMarkup);
    const interval = setInterval(() => {
      setDisplayCost(prev => {
        const rate = pricingRef.current?.hourlyWithMarkup ?? 0;
        const increment = rate / 3600;
        return +(prev + increment).toFixed(6);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pricing]);

  if (!pricing) {
    if (!isProvisioned) {
      return (
        <div className="flex items-center gap-3 px-3 py-2 bg-muted/40 rounded-lg text-xs" data-testid={`usage-counter-${serverId}`}>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-muted-foreground">Provisioning...</span>
          </div>
          <span className="text-muted-foreground">Billing starts once provisioned</span>
        </div>
      );
    }
    return null;
  }

  const statusLabel = isRunning ? "Live" : status === "booting" ? "Booting" : status === "rebooting" ? "Rebooting" : status === "shutting_down" ? "Stopping" : status === "offline" ? "Offline" : status;
  const dotColor = isRunning ? "bg-green-500 animate-pulse" : status === "booting" || status === "rebooting" ? "bg-yellow-500 animate-pulse" : "bg-gray-400";

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-muted/40 rounded-lg text-xs" data-testid={`usage-counter-${serverId}`}>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-muted-foreground">{statusLabel}</span>
      </div>
      <div className="flex items-center gap-1 font-mono font-bold text-sm text-green-600 dark:text-green-400">
        <DollarSign className="w-3.5 h-3.5" />
        {displayCost.toFixed(4)}
      </div>
      <span className="text-muted-foreground">accrued ({pricing.markupPercent}% markup)</span>
      <div className="ml-auto flex items-center gap-3 text-muted-foreground flex-wrap justify-end">
        <span>${pricing.hourlyWithMarkup.toFixed(4)}/hr</span>
        <span>{pricing.hoursRunning.toFixed(1)} hrs</span>
        {pricing.monthlyWithMarkup > 0 && (
          <span className="text-xs opacity-70">(~${pricing.monthlyWithMarkup}/mo)</span>
        )}
        {pricing.backupMonthly > 0 && (
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Backup: ${pricing.backupWithMarkup.toFixed(2)}/mo
          </span>
        )}
      </div>
    </div>
  );
}

function EditableLabel({ serverId, currentLabel }: { serverId: string; currentLabel: string }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(currentLabel);

  const renameMutation = useMutation({
    mutationFn: async (newLabel: string) => {
      const res = await apiRequest("PATCH", `/api/linode/servers/${serverId}`, { label: newLabel });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linode/servers"] });
      setEditing(false);
      toast({ title: "Server renamed", description: "Label updated on Linode." });
    },
    onError: (err: any) => {
      toast({ title: "Rename failed", description: err.message, variant: "destructive" });
      setLabel(currentLabel);
    },
  });

  const handleSave = () => {
    if (renameMutation.isPending) return;
    const trimmed = label.trim();
    if (!trimmed || trimmed === currentLabel) {
      setEditing(false);
      setLabel(currentLabel);
      return;
    }
    renameMutation.mutate(trimmed);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Server className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
        <Input
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditing(false); setLabel(currentLabel); } }}
          onBlur={handleSave}
          className="h-7 text-sm font-semibold w-48 px-1.5"
          autoFocus
          data-testid={`input-rename-${serverId}`}
        />
        {renameMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      </div>
    );
  }

  return (
    <h3 className="font-semibold flex items-center gap-1.5 group cursor-pointer" onClick={() => setEditing(true)} data-testid={`label-${serverId}`}>
      <Server className="w-3.5 h-3.5 text-violet-500" />
      {currentLabel}
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </h3>
  );
}

function UptimeDisplay({ updated, status }: { updated: string | null; status: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status !== "running" || !updated) return;
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [status, updated]);

  if (status !== "running" || !updated) return null;

  const bootTime = new Date(updated).getTime();
  const diffMs = now - bootTime;
  if (diffMs < 0) return null;

  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  let uptimeStr = "";
  if (days > 0) uptimeStr = `${days}d ${hrs % 24}h`;
  else if (hrs > 0) uptimeStr = `${hrs}h ${mins % 60}m`;
  else uptimeStr = `${mins}m`;

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="uptime-display">
      <Clock className="w-3 h-3" />
      Up {uptimeStr}
    </span>
  );
}

function AssignCustomerButton({ serverId, currentCustomerId, customers }: { serverId: string; currentCustomerId: string | null; customers: Customer[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentCustomerId || "none");

  const assignMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const res = await apiRequest("PATCH", `/api/linode/servers/${serverId}`, {
        customerId: customerId === "none" ? null : customerId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linode/servers"] });
      setOpen(false);
      toast({ title: "Customer updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to assign customer", description: err.message, variant: "destructive" });
    },
  });

  if (currentCustomerId) return null;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5" data-testid={`button-assign-customer-${serverId}`}>
        <UserPlus className="w-3.5 h-3.5" />
        Assign Customer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-500" />
              Assign Customer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger data-testid="select-assign-customer">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No customer</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              onClick={() => assignMutation.mutate(selected)}
              disabled={assignMutation.isPending || selected === "none"}
              data-testid="button-confirm-assign"
            >
              {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BackupButton({ serverId, planType }: { serverId: string; planType: string }) {
  const { toast } = useToast();
  const { data: backupInfo, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/linode/servers", serverId, "backups"],
    queryFn: async () => {
      const res = await fetch(`/api/linode/servers/${serverId}/backups`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: typeInfo } = useQuery<{ addons?: { backups?: { price?: { monthly?: number } } } }>({
    queryKey: ["/api/linode/types", planType],
    queryFn: async () => {
      const res = await fetch(`/api/linode/types`, { credentials: "include" });
      if (!res.ok) return {};
      const types = await res.json();
      return types.find((t: any) => t.id === planType) || {};
    },
  });

  const enableMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/linode/servers/${serverId}/backups/enable`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/linode/servers", serverId, "backups"] });
      const base = (data.backupPriceCents / 100).toFixed(2);
      const total = (data.totalCents / 100).toFixed(2);
      toast({
        title: "Backups enabled!",
        description: `Linode: $${base}/mo + 50% markup = $${total}/mo`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Failed to enable backups", description: err.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/linode/servers/${serverId}/backups/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linode/servers", serverId, "backups"] });
      toast({ title: "Backups disabled" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to cancel backups", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return null;

  const enabled = backupInfo?.enabled ?? false;

  if (enabled) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          if (confirm("Cancel backups for this server? Existing backups will be deleted.")) {
            cancelMutation.mutate();
          }
        }}
        disabled={cancelMutation.isPending}
        className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
        data-testid={`button-backups-enabled-${serverId}`}
      >
        {cancelMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
        Backups On
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        if (confirm("Enable automatic backups for this server? Pricing includes a 50% markup on Linode's backup cost.")) {
          enableMutation.mutate();
        }
      }}
      disabled={enableMutation.isPending}
      className="gap-1.5"
      data-testid={`button-enable-backups-${serverId}`}
    >
      {enableMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
      Backups
    </Button>
  );
}

function SshCommand({ ip }: { ip: string }) {
  const [copied, setCopied] = useState(false);
  const cmd = `ssh root@${ip}`;
  const handleCopy = () => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 mb-3 px-2.5 py-2 bg-muted/50 rounded-lg" data-testid={`ssh-command-${ip}`}>
      <Terminal className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <code className="text-xs font-mono flex-1 select-all">{cmd}</code>
      <button
        onClick={handleCopy}
        className="p-1 rounded hover:bg-muted transition-colors"
        title="Copy SSH command"
        data-testid={`button-copy-ssh-${ip}`}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
    </div>
  );
}

function SetupCommandButton({ serverId, customerId, serverSetupComplete }: { serverId: string; customerId: string | null; serverSetupComplete?: boolean }) {
  if (!customerId) return null;

  if (serverSetupComplete) {
    return (
      <div className="mt-2">
        <div className="flex items-center gap-2 px-2.5 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg" data-testid={`setup-complete-${serverId}`}>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Server secured &amp; setup complete</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-lg" data-testid={`auto-setup-status-${serverId}`}>
        <Loader2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin flex-shrink-0" />
        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Auto-setup in progress — server will secure itself on boot</span>
      </div>
    </div>
  );
}

export default function LinodeServers() {
  usePageTitle("Server Provisioning");
  const { toast } = useToast();
  const [showProvision, setShowProvision] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("us-central");
  const [serverLabel, setServerLabel] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "shared" | "dedicated">("all");
  const [rootPassword, setRootPassword] = useState("");
  const [showRootPass, setShowRootPass] = useState(false);
  const [authorizedKeys, setAuthorizedKeys] = useState("");
  const [statsServerId, setStatsServerId] = useState<string | null>(null);
  const [invoiceHtml, setInvoiceHtml] = useState<string | null>(null);

  const { data: servers = [], isLoading: serversLoading } = useQuery<LinodeServer[]>({
    queryKey: ["/api/linode/servers"],
    refetchInterval: (query) => {
      const data = query.state.data as LinodeServer[] | undefined;
      if (data?.some(s => s.status === "provisioning" || s.status === "booting" || s.status === "rebooting")) {
        return 5000;
      }
      return 30000;
    },
  });

  const { data: types = [], isLoading: typesLoading } = useQuery<LinodeType[]>({
    queryKey: ["/api/linode/types"],
    enabled: showProvision,
  });

  const { data: regions = [] } = useQuery<LinodeRegion[]>({
    queryKey: ["/api/linode/regions"],
    enabled: showProvision,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const provisionMutation = useMutation({
    mutationFn: async (data: { typeId: string; region: string; label: string; customerId?: string; rootPassword?: string; authorizedKeys?: string }) => {
      const res = await apiRequest("POST", "/api/linode/provision", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/linode/servers"] });
      setShowProvision(false);
      setSelectedType("");
      setServerLabel("");
      setSelectedCustomer("");
      setRootPassword("");
      setAuthorizedKeys("");
      toast({
        title: "Server provisioned!",
        description: `${data.label} is being created.${data.rootPassword ? " Root password has been set." : ""}`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Provisioning failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/linode/servers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linode/servers"] });
      toast({ title: "Server deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete server", variant: "destructive" });
    },
  });

  const statsMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("GET", `/api/linode/servers/${id}/stats`);
      return res.json();
    },
    onError: (err: any) => {
      const msg = err.message || "";
      if (msg.includes("Linode") || msg.includes("stats")) {
        toast({ title: "Stats not available yet", description: "Server usage data takes a few hours to become available after provisioning." });
      } else {
        toast({ title: "Failed to fetch stats", description: msg, variant: "destructive" });
      }
    },
  });

  const rebootMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/linode/servers/${id}/reboot`);
      return id;
    },
    onSuccess: (serverId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/linode/servers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linode/servers", serverId, "pricing"] });
      toast({ title: "Server rebooting", description: "The server is restarting now." });
    },
    onError: (err: any) => {
      toast({ title: "Reboot failed", description: err.message, variant: "destructive" });
    },
  });

  const backupEnableMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/linode/servers/${id}/backups/enable`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/linode/servers"] });
      const base = (data.backupPriceCents / 100).toFixed(2);
      const total = (data.totalCents / 100).toFixed(2);
      toast({
        title: "Backups enabled!",
        description: `Linode: $${base}/mo + 50% markup = $${total}/mo billed to customer`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Failed to enable backups", description: err.message, variant: "destructive" });
    },
  });

  const backupCancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/linode/servers/${id}/backups/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linode/servers"] });
      toast({ title: "Backups disabled" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to cancel backups", description: err.message, variant: "destructive" });
    },
  });

  const invoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/linode/servers/${id}/invoice`);
      return res.json();
    },
    onSuccess: (data, serverId) => {
      setInvoiceHtml(data.html);
      queryClient.invalidateQueries({ queryKey: ["/api/linode/servers", serverId, "pricing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linode/servers"] });
      if (data.emailSent) {
        toast({ title: "Invoice sent!", description: `Emailed to ${data.customerEmail} — $${(data.totalCents / 100).toFixed(2)} total` });
      } else {
        toast({ title: "Invoice generated", description: `$${(data.totalCents / 100).toFixed(2)} — No customer email linked, preview only.` });
      }
    },
    onError: (err: any) => {
      toast({ title: "Invoice failed", description: err.message || "Could not generate invoice", variant: "destructive" });
    },
  });

  const filteredTypes = typeFilter === "all"
    ? types
    : types.filter(t => typeFilter === "shared" ? t.typeClass === "standard" || t.typeClass === "nanode" : t.typeClass === "dedicated");

  const selectedTypeInfo = types.find(t => t.id === selectedType);

  const handleProvision = () => {
    if (!selectedType || !serverLabel) return;
    provisionMutation.mutate({
      typeId: selectedType,
      region: selectedRegion,
      label: serverLabel,
      customerId: selectedCustomer && selectedCustomer !== "none" ? selectedCustomer : undefined,
      rootPassword: rootPassword || undefined,
      authorizedKeys: authorizedKeys || undefined,
    });
  };

  const handleViewStats = async (serverId: string) => {
    setStatsServerId(serverId);
    statsMutation.mutate(serverId);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      running: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      provisioning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      booting: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      rebooting: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      offline: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      shutting_down: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return <Badge className={colors[status] || "bg-gray-100 text-gray-700"} data-testid={`status-${status}`}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Server Provisioning</h1>
            <p className="text-muted-foreground mt-1">Provision and manage Linode servers for your clients</p>
          </div>
          <Button
            onClick={() => setShowProvision(true)}
            className="gap-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white"
            data-testid="button-new-server"
          >
            <Plus className="w-4 h-4" />
            New Server
          </Button>
        </div>
      </div>

      {serversLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : servers.length === 0 ? (
        <Card className="p-12 text-center">
          <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No servers yet</h3>
          <p className="text-muted-foreground mb-4">Provision your first Linode server for a client</p>
          <Button onClick={() => setShowProvision(true)} className="gap-2" data-testid="button-first-server">
            <Plus className="w-4 h-4" /> Provision Server
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {servers.map((server) => {
            const customer = customers.find(c => c.id === server.customerId);
            return (
              <Card key={server.id} className="p-4" data-testid={`card-server-${server.id}`}>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <span className="text-xl">{getCountryFlag(server.region)}</span>
                    <div>
                      <EditableLabel serverId={server.id} currentLabel={server.label} />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{server.region}</span>
                        {customer && <span>· {customer.name}</span>}
                      </div>
                    </div>
                  </div>

                  {getStatusBadge(server.status)}
                  <UptimeDisplay updated={(server as any).updated} status={server.status} />

                  {server.ipv4 && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Globe className="w-3.5 h-3.5" />
                      <span className="font-mono text-xs">{server.ipv4}</span>
                    </div>
                  )}

                  <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
                    {server.vcpus && <span>{server.vcpus} vCPU</span>}
                    {server.memory && <span>{Math.round(server.memory / 1024)} GB RAM</span>}
                    {server.disk && <span>{Math.round(server.disk / 1024)} GB Disk</span>}
                  </div>
                </div>

                <div className="mt-3">
                  <LiveUsageCounter serverId={server.id} status={server.status} />
                </div>

                {server.ipv4 && (
                  <div className="mt-2">
                    <SshCommand ip={server.ipv4} />
                  </div>
                )}

                <SetupCommandButton serverId={server.id} customerId={server.customerId} serverSetupComplete={server.serverSetupComplete} />

                <div className="flex gap-2 pt-3 mt-1 border-t flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Reboot this server? It will be briefly unavailable.")) {
                        rebootMutation.mutate(server.id);
                      }
                    }}
                    disabled={rebootMutation.isPending || server.status === "rebooting"}
                    className="gap-1.5"
                    data-testid={`button-reboot-${server.id}`}
                  >
                    {rebootMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    Reboot
                  </Button>
                  <AssignCustomerButton serverId={server.id} currentCustomerId={server.customerId} customers={customers} />
                  <BackupButton serverId={server.id} planType={server.planType} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewStats(server.id)}
                    disabled={statsMutation.isPending && statsServerId === server.id}
                    className="gap-1.5"
                    data-testid={`button-stats-${server.id}`}
                  >
                    {statsMutation.isPending && statsServerId === server.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Activity className="w-3.5 h-3.5" />
                    )}
                    Stats
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => invoiceMutation.mutate(server.id)}
                    disabled={invoiceMutation.isPending}
                    className="gap-1.5"
                    data-testid={`button-invoice-${server.id}`}
                  >
                    {invoiceMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    Invoice
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/linode/servers"] });
                    }}
                    className="gap-1.5"
                    data-testid={`button-refresh-${server.id}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Are you sure? This will permanently delete this server from Linode.")) {
                        deleteMutation.mutate(server.id);
                      }
                    }}
                    className="gap-1.5 text-red-500 ml-auto"
                    data-testid={`button-delete-${server.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showProvision} onOpenChange={setShowProvision}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-violet-500" />
              Provision New Server
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Server Label</label>
              <Input
                placeholder="e.g., client-website-prod"
                value={serverLabel}
                onChange={(e) => setServerLabel(e.target.value)}
                data-testid="input-server-label"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Assign to Customer (optional)</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger data-testid="select-customer">
                  <SelectValue placeholder="No customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No customer</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Root Password <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Input
                  type={showRootPass ? "text" : "password"}
                  placeholder="Leave blank to auto-generate"
                  value={rootPassword}
                  onChange={(e) => setRootPassword(e.target.value)}
                  data-testid="input-root-password"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowRootPass(!showRootPass)}
                  tabIndex={-1}
                >
                  {showRootPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">If left blank, a secure password will be generated automatically.</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                SSH Public Key <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="ssh-rsa AAAA... or ssh-ed25519 AAAA..."
                value={authorizedKeys}
                onChange={(e) => setAuthorizedKeys(e.target.value)}
                rows={3}
                className="font-mono text-xs"
                data-testid="input-ssh-key"
              />
              <p className="text-xs text-muted-foreground mt-1">Paste your public SSH key to enable key-based login from the start.</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Region</label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger data-testid="select-region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.label} ({r.country.toUpperCase()})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Server Plan</label>
                <div className="flex gap-1">
                  {(["all", "shared", "dedicated"] as const).map(f => (
                    <Button
                      key={f}
                      size="sm"
                      variant={typeFilter === f ? "default" : "outline"}
                      onClick={() => setTypeFilter(f)}
                      className="text-xs h-7 px-2.5"
                      data-testid={`button-filter-${f}`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {typesLoading ? (
                <Skeleton className="h-32 rounded-lg" />
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {filteredTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedType === type.id
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                          : "border-transparent hover:bg-muted/50"
                      }`}
                      data-testid={`plan-${type.id}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{type.label}</span>
                        <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                          ${type.monthlyPrice}/mo
                        </span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{type.vcpus} vCPU</span>
                        <span>{Math.round(type.memory / 1024)} GB RAM</span>
                        <span>{Math.round(type.disk / 1024)} GB Disk</span>
                        <span>{type.transfer / 1000} TB Transfer</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedTypeInfo && (
                <div className="mt-3 p-3 bg-violet-50 dark:bg-violet-500/10 rounded-lg text-sm">
                  <div className="font-medium text-violet-700 dark:text-violet-300">
                    Selected: {selectedTypeInfo.label}
                  </div>
                  <div className="text-muted-foreground mt-1">
                    ${selectedTypeInfo.monthlyPrice}/mo · {selectedTypeInfo.vcpus} vCPU · {Math.round(selectedTypeInfo.memory / 1024)} GB RAM · Ubuntu 24.04
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleProvision}
              disabled={!selectedType || !serverLabel || provisionMutation.isPending}
              className="w-full gap-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white"
              data-testid="button-provision"
            >
              {provisionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Server className="w-4 h-4" />
              )}
              {provisionMutation.isPending ? "Provisioning..." : "Provision Server"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statsServerId && !!statsMutation.data} onOpenChange={(open) => { if (!open) setStatsServerId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-500" />
              Server Statistics
            </DialogTitle>
          </DialogHeader>
          {statsMutation.data && (
            <div className="space-y-4 mt-2">
              {statsMutation.data.message && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm" data-testid="stats-message">
                  {statsMutation.data.message}
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 text-center">
                  <Cpu className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                  <div className="text-lg font-bold">{statsMutation.data.cpu}%</div>
                  <div className="text-xs text-muted-foreground">CPU Usage</div>
                </Card>
                <Card className="p-3 text-center">
                  <Network className="w-5 h-5 mx-auto text-green-500 mb-1" />
                  <div className="text-lg font-bold">{statsMutation.data.networkInGB}</div>
                  <div className="text-xs text-muted-foreground">GB In</div>
                </Card>
                <Card className="p-3 text-center">
                  <Network className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                  <div className="text-lg font-bold">{statsMutation.data.networkOutGB}</div>
                  <div className="text-xs text-muted-foreground">GB Out</div>
                </Card>
              </div>
              {statsMutation.data.cpuTimeline?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">CPU Timeline (last 24 points)</h4>
                  <div className="flex items-end gap-0.5 h-16 bg-muted/30 rounded-lg p-1">
                    {statsMutation.data.cpuTimeline.map((point: { time: number; value: string }, i: number) => (
                      <div
                        key={i}
                        className="flex-1 bg-violet-500 rounded-sm min-h-[2px]"
                        style={{ height: `${Math.max(2, parseFloat(point.value))}%` }}
                        title={`${point.value}%`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!invoiceHtml} onOpenChange={(open) => { if (!open) setInvoiceHtml(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-500" />
              Server Invoice
            </DialogTitle>
          </DialogHeader>
          {invoiceHtml && (
            <div
              className="mt-2"
              dangerouslySetInnerHTML={{ __html: invoiceHtml }}
              data-testid="invoice-preview"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
