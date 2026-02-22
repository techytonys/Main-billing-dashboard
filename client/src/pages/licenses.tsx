import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Key, Plus, RefreshCw, Trash2, Copy, Check, Shield, ShieldCheck, Clock, Server, Eye, ChevronDown, ChevronUp, Unplug, Globe, Wifi } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Customer, License } from "@shared/schema";

interface LicenseActivation {
  id: string;
  licenseId: string;
  serverId: string | null;
  serverIp: string | null;
  hostname: string | null;
  status: string;
  activatedAt: string;
  releasedAt: string | null;
}

export default function Licenses() {
  usePageTitle("Licenses");
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [maxActivations, setMaxActivations] = useState("0");
  const [notes, setNotes] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: licenses, isLoading } = useQuery<License[]>({ queryKey: ["/api/licenses"] });
  const { data: customers } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const createMutation = useMutation({
    mutationFn: async (data: { customerId: string; maxActivations: number; notes: string }) => {
      const res = await apiRequest("POST", "/api/licenses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/licenses"] });
      setShowCreate(false);
      setCustomerId("");
      setMaxActivations("0");
      setNotes("");
      toast({ title: "License created", description: "A new license key has been generated." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create license", description: err.message || "An error occurred", variant: "destructive" });
    },
  });

  const reissueMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/licenses/${id}/reissue`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/licenses"] });
      toast({ title: "License reissued", description: "A new key has been generated. The old key is now invalid." });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/licenses/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/licenses"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/licenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/licenses"] });
      toast({ title: "License deleted" });
    },
  });

  const copyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCustomerName = (cId: string) => {
    return customers?.find(c => c.id === cId)?.name || "Unknown";
  };

  const getCustomerToken = (cId: string) => {
    return customers?.find(c => c.id === cId)?.portalToken || "";
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title-licenses">
            <Shield className="h-6 w-6" />
            License Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Issue, reissue, and manage script licenses for your customers
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="btn-create-license">
          <Plus className="h-4 w-4 mr-2" />
          Issue License
        </Button>
      </div>

      {!licenses?.length ? (
        <Card className="p-12 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Licenses Yet</h3>
          <p className="text-muted-foreground mb-4">
            Issue a license key to a customer to let them run the server setup script.
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Issue First License
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {licenses.map((license) => (
            <LicenseCard
              key={license.id}
              license={license}
              customerName={getCustomerName(license.customerId)}
              portalToken={getCustomerToken(license.customerId)}
              copiedId={copiedId}
              expanded={expandedId === license.id}
              onToggleExpand={() => setExpandedId(expandedId === license.id ? null : license.id)}
              onCopy={(key) => copyKey(key, license.id)}
              onReissue={() => {
                if (confirm("This will generate a new license key. The old key will stop working immediately. Continue?")) {
                  reissueMutation.mutate(license.id);
                }
              }}
              onToggleStatus={(status) => toggleStatusMutation.mutate({ id: license.id, status })}
              onDelete={() => {
                if (confirm("Delete this license permanently?")) {
                  deleteMutation.mutate(license.id);
                }
              }}
            />
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue New License</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger data-testid="select-license-customer">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Max Activations</Label>
              <Input
                type="number"
                value={maxActivations}
                onChange={(e) => setMaxActivations(e.target.value)}
                placeholder="0 = unlimited"
                data-testid="input-max-activations"
              />
              <p className="text-xs text-muted-foreground mt-1">Set to 0 for unlimited activations</p>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional internal notes"
                data-testid="input-license-notes"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => createMutation.mutate({
                customerId,
                maxActivations: parseInt(maxActivations) || 0,
                notes,
              })}
              disabled={!customerId || createMutation.isPending}
              data-testid="btn-submit-license"
            >
              {createMutation.isPending ? "Creating..." : "Issue License Key"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LicenseCard({
  license,
  customerName,
  portalToken,
  copiedId,
  expanded,
  onToggleExpand,
  onCopy,
  onReissue,
  onToggleStatus,
  onDelete,
}: {
  license: License;
  customerName: string;
  portalToken: string;
  copiedId: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
  onCopy: (key: string) => void;
  onReissue: () => void;
  onToggleStatus: (status: string) => void;
  onDelete: () => void;
}) {
  const { toast: cardToast } = useToast();
  const { data: activations } = useQuery<LicenseActivation[]>({
    queryKey: ["/api/licenses", license.id, "activations"],
    queryFn: async () => {
      const res = await fetch(`/api/licenses/${license.id}/activations`);
      return res.json();
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (activationId: string) => {
      await apiRequest("POST", `/api/licenses/${license.id}/activations/${activationId}/release`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/licenses", license.id, "activations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/licenses"] });
      cardToast({ title: "IP released", description: "This IP slot is now free for a new server." });
    },
  });

  const activeCount = activations?.filter(a => a.status === "active").length || 0;

  const statusColor = license.status === "active"
    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    : license.status === "suspended"
    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";

  return (
    <Card className="p-5" data-testid={`license-card-${license.id}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">{customerName}</span>
            <Badge className={statusColor}>{license.status}</Badge>
            {(license.activationCount ?? 0) > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Validated
              </Badge>
            )}
          </div>

          {portalToken && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span>Portal Token:</span>
              <code className="bg-muted/50 px-1.5 py-0.5 rounded font-mono text-xs" data-testid={`portal-token-${license.id}`}>{portalToken}</code>
            </div>
          )}

          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 font-mono text-sm">
            <span data-testid={`license-key-${license.id}`}>{license.licenseKey}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onCopy(license.licenseKey)}
              data-testid={`btn-copy-key-${license.id}`}
            >
              {copiedId === license.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {activeCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {activations?.filter(a => a.status === "active").map((a) => (
                <Badge key={a.id} variant="outline" className="text-xs font-mono gap-1 py-0.5 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400">
                  <Wifi className="h-3 w-3" />
                  {a.serverIp}
                  {a.hostname && a.hostname !== "unknown" && <span className="text-muted-foreground font-sans">({a.hostname})</span>}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Server className="h-3.5 w-3.5" />
              {activeCount} active / {license.maxActivations && license.maxActivations > 0 ? `${license.maxActivations} max` : "unlimited"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {license.createdAt ? new Date(license.createdAt).toLocaleDateString() : "N/A"}
            </span>
            {license.lastActivatedAt && (
              <span className="flex items-center gap-1">
                Last used: {new Date(license.lastActivatedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {license.notes && (
            <p className="text-sm text-muted-foreground italic">{license.notes}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleExpand}
            title="View activations"
            data-testid={`btn-expand-${license.id}`}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onReissue}
            title="Reissue license key"
            data-testid={`btn-reissue-${license.id}`}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleStatus(license.status === "active" ? "suspended" : "active")}
            title={license.status === "active" ? "Suspend license" : "Activate license"}
            data-testid={`btn-toggle-status-${license.id}`}
          >
            <Shield className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            title="Delete license"
            data-testid={`btn-delete-${license.id}`}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            IP Activations
            {activeCount > 0 && (
              <Badge variant="outline" className="ml-1">{activeCount} active</Badge>
            )}
          </h4>
          {!activations?.length ? (
            <p className="text-sm text-muted-foreground">No IP activations yet. The license will activate when a server runs the setup script.</p>
          ) : (
            <div className="space-y-2">
              {activations.map((a) => (
                <div key={a.id} className="flex items-center gap-3 text-sm bg-muted/30 rounded-lg px-3 py-2">
                  {a.status === "active" ? (
                    <Wifi className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Unplug className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-mono font-medium">{a.serverIp || "N/A"}</span>
                  <span className="text-muted-foreground">{a.hostname || "N/A"}</span>
                  <Badge variant={a.status === "active" ? "default" : "secondary"} className="text-xs">
                    {a.status}
                  </Badge>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {a.activatedAt ? new Date(a.activatedAt).toLocaleDateString() : "N/A"}
                    {a.status === "released" && a.releasedAt && (
                      <> — released {new Date(a.releasedAt).toLocaleDateString()}</>
                    )}
                  </span>
                  {a.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-500 hover:text-red-700"
                      onClick={() => {
                        if (confirm(`Release IP ${a.serverIp}? This will free up an activation slot.`)) {
                          releaseMutation.mutate(a.id);
                        }
                      }}
                      data-testid={`btn-release-ip-${a.id}`}
                    >
                      <Unplug className="h-3 w-3 mr-1" />
                      Release
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
