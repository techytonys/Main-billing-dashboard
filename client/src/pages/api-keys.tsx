import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Key, Plus, Trash2, Copy, Check, ExternalLink, Shield, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import type { Customer } from "@shared/schema";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  customerId: string | null;
  scopes: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function ApiKeys() {
  usePageTitle("API Keys");
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState("read");
  const [customerId, setCustomerId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery<ApiKey[]>({ queryKey: ["/api/api-keys"] });
  const { data: customers } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; scopes: string; customerId?: string }) => {
      const res = await apiRequest("POST", "/api/api-keys", data);
      return res.json();
    },
    onSuccess: (data: ApiKey) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setNewlyCreatedKey(data.key);
      setShowCreate(false);
      setName("");
      setScopes("read");
      setCustomerId("");
      toast({ title: "API key created", description: "Copy the key now - you won't be able to see it again." });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/api-keys/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "API key deleted" });
    },
  });

  function copyKey(key: string, id: string) {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied to clipboard" });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Card key={i} className="p-5"><Skeleton className="h-20 w-full" /></Card>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Key className="w-6 h-6 text-primary" />
            API Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API keys for programmatic access to your data
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild data-testid="link-api-docs">
            <a href="/api/docs" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-1" />
              API Docs
            </a>
          </Button>
          <Button onClick={() => setShowCreate(true)} data-testid="button-create-key">
            <Plus className="w-4 h-4 mr-1" />
            Create API Key
          </Button>
        </div>
      </div>

      {newlyCreatedKey && (
        <Card className="p-4 border-yellow-500/50 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">New API Key Created</p>
              <p className="text-xs text-muted-foreground mb-2">Copy this key now. You won't be able to see the full key again.</p>
              <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                <code className="text-xs font-mono break-all flex-1" data-testid="text-new-key">{newlyCreatedKey}</code>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(newlyCreatedKey); toast({ title: "Copied!" }); }} data-testid="button-copy-new-key">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setNewlyCreatedKey(null)} className="shrink-0">Dismiss</Button>
          </div>
        </Card>
      )}

      {(!keys || keys.length === 0) ? (
        <Card className="p-12 text-center">
          <Key className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No API Keys</h3>
          <p className="text-muted-foreground text-sm mb-4">Create an API key to start integrating with your billing data programmatically.</p>
          <Button onClick={() => setShowCreate(true)} data-testid="button-create-key-empty">
            <Plus className="w-4 h-4 mr-1" /> Create Your First API Key
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <Card key={k.id} className="p-4" data-testid={`card-api-key-${k.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold" data-testid={`text-key-name-${k.id}`}>{k.name}</h3>
                    <Badge variant={k.isActive ? "default" : "secondary"} className="text-xs">
                      {k.isActive ? "Active" : "Disabled"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {k.scopes === "all" ? "Full Access" : k.scopes}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-xs font-mono text-muted-foreground" data-testid={`text-key-value-${k.id}`}>
                      {k.key}
                    </code>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created {new Date(k.createdAt).toLocaleDateString()}
                    </span>
                    {k.lastUsedAt && (
                      <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                    )}
                    {k.customerId && customers && (
                      <span>
                        Scoped to: {customers.find((c: Customer) => c.id === k.customerId)?.name || "Unknown"}
                      </span>
                    )}
                    {k.expiresAt && (
                      <span className={new Date(k.expiresAt) < new Date() ? "text-red-500" : ""}>
                        {new Date(k.expiresAt) < new Date() ? "Expired" : `Expires ${new Date(k.expiresAt).toLocaleDateString()}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={k.isActive}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: k.id, isActive: checked })}
                    data-testid={`switch-toggle-key-${k.id}`}
                  />
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(k.id)} data-testid={`button-delete-key-${k.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                placeholder="e.g., My Integration"
                value={name}
                onChange={e => setName(e.target.value)}
                data-testid="input-key-name"
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <Select value={scopes} onValueChange={setScopes}>
                <SelectTrigger data-testid="select-key-scopes">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read Only</SelectItem>
                  <SelectItem value="read,write">Read & Write</SelectItem>
                  <SelectItem value="all">Full Access</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Read = view data, Write = create entries, Full = everything
              </p>
            </div>
            <div>
              <Label>Restrict to Customer (Optional)</Label>
              <Select value={customerId || "none"} onValueChange={v => setCustomerId(v === "none" ? "" : v)}>
                <SelectTrigger data-testid="select-key-customer">
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All customers</SelectItem>
                  {customers?.map((c: Customer) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Limit this key to only access one customer's data
              </p>
            </div>
            <Button
              className="w-full"
              disabled={!name || createMutation.isPending}
              onClick={() => createMutation.mutate({ name, scopes, customerId: customerId || undefined })}
              data-testid="button-submit-create-key"
            >
              {createMutation.isPending ? "Creating..." : "Create API Key"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
