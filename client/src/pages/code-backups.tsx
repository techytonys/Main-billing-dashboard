import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  GitBranch, Play, Clock, CheckCircle, XCircle, Loader2,
  ToggleLeft, ToggleRight, Settings2, History, Github,
  FolderGit2, RefreshCw, Trash2, ChevronDown, ChevronUp,
  Zap, AlertTriangle, DollarSign, Pencil,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { Project, Customer } from "@shared/schema";

interface GitBackupConfig {
  id: string;
  projectId: string;
  customerId: string;
  githubUsername: string | null;
  githubRepo: string | null;
  githubBranch: string | null;
  autopilotEnabled: boolean | null;
  autopilotFrequency: string | null;
  lastPushAt: string | null;
  nextScheduledAt: string | null;
  isConnected: boolean | null;
  createdAt: string;
}

interface GitBackupLog {
  id: string;
  configId: string;
  projectId: string;
  status: string;
  commitSha: string | null;
  commitMessage: string | null;
  filesCount: number | null;
  errorMessage: string | null;
  triggeredBy: string;
  createdAt: string;
}

interface GithubRepo {
  fullName: string;
  name: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "success":
      return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" data-testid={`badge-status-${status}`}><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
    case "failed":
      return <Badge variant="destructive" data-testid={`badge-status-${status}`}><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid={`badge-status-${status}`}><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
    default:
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>{status}</Badge>;
  }
}

function ProjectBackupCard({ project, customers, backupRate }: { project: Project; customers: Customer[]; backupRate?: BillingRate | null }) {
  const { toast } = useToast();
  const [showLogs, setShowLogs] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [commitMessage, setCommitMessage] = useState("");

  const customer = customers.find(c => c.id === project.customerId);

  const { data: config, isLoading: configLoading } = useQuery<GitBackupConfig | null>({
    queryKey: ["/api/git-backups/project", project.id],
    queryFn: async () => {
      const res = await fetch(`/api/git-backups/project/${project.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: logs } = useQuery<GitBackupLog[]>({
    queryKey: ["/api/git-backups/logs", project.id],
    queryFn: async () => {
      const res = await fetch(`/api/git-backups/logs/${project.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: showLogs,
  });

  const { data: repos } = useQuery<GithubRepo[]>({
    queryKey: ["/api/git-backups/repos", config?.id],
    queryFn: async () => {
      const res = await fetch(`/api/git-backups/${config!.id}/repos`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!config?.isConnected && showSetup,
  });

  const createConfigMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/git-backups", {
        projectId: project.id,
        customerId: project.customerId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/git-backups/project", project.id] });
      toast({ title: "Backup initialized", description: "GitHub connection is ready. Customer needs to connect their GitHub account from their portal." });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/git-backups/${config!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/git-backups/project", project.id] });
      toast({ title: "Config updated" });
    },
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/git-backups/${config!.id}/push`, {
        message: commitMessage || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/git-backups/logs", project.id] });
      toast({ title: "Backup started", description: "Pushing project data to GitHub..." });
      setCommitMessage("");
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/git-backups/${config!.id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/git-backups/project", project.id] });
      toast({ title: "Backup config removed" });
    },
  });

  if (configLoading) {
    return <Card className="p-4"><Skeleton className="h-20 w-full" /></Card>;
  }

  return (
    <Card className="overflow-hidden" data-testid={`card-backup-${project.id}`}>
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <FolderGit2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm" data-testid={`text-project-name-${project.id}`}>{project.name}</h3>
              <p className="text-xs text-muted-foreground">{customer?.name || "Unknown client"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config?.isConnected ? (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" data-testid={`badge-connected-${project.id}`}>
                <Github className="w-3 h-3 mr-1" />
                {config.githubUsername || "Connected"}
              </Badge>
            ) : config ? (
              <Badge variant="outline" className="text-amber-600 border-amber-300" data-testid={`badge-pending-${project.id}`}>
                <AlertTriangle className="w-3 h-3 mr-1" />
                Awaiting GitHub
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-4">
        {!config ? (
          <div className="text-center py-6">
            <Github className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No backup configured for this project</p>
            <Button
              onClick={() => createConfigMutation.mutate()}
              disabled={createConfigMutation.isPending}
              data-testid={`button-enable-backup-${project.id}`}
            >
              {createConfigMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GitBranch className="w-4 h-4 mr-2" />}
              Enable Code Backups
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {config.isConnected ? (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    {config.githubRepo ? (
                      <Badge variant="outline" className="font-mono text-xs" data-testid={`badge-repo-${project.id}`}>
                        {config.githubRepo}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">No repo selected</span>
                    )}
                    {config.githubBranch && (
                      <Badge variant="secondary" className="text-xs">
                        <GitBranch className="w-3 h-3 mr-1" />
                        {config.githubBranch}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSetup(!showSetup)}
                      data-testid={`button-settings-${project.id}`}
                    >
                      <Settings2 className="w-4 h-4 mr-1" />
                      Settings
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLogs(!showLogs)}
                      data-testid={`button-history-${project.id}`}
                    >
                      <History className="w-4 h-4 mr-1" />
                      History
                      {showLogs ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateConfigMutation.mutate({ autopilotEnabled: !config.autopilotEnabled })}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`button-autopilot-toggle-${project.id}`}
                    >
                      {config.autopilotEnabled ? (
                        <ToggleRight className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-8 h-8" />
                      )}
                    </button>
                    <div>
                      <p className="text-sm font-medium">Autopilot {config.autopilotEnabled ? "On" : "Off"}</p>
                      <p className="text-xs text-muted-foreground">
                        {config.autopilotEnabled
                          ? `Auto-backup ${config.autopilotFrequency || "daily"}`
                          : "Enable for automatic backups"}
                      </p>
                    </div>
                  </div>
                  {config.autopilotEnabled && (
                    <Select
                      value={config.autopilotFrequency || "daily"}
                      onValueChange={(val) => updateConfigMutation.mutate({ autopilotFrequency: val })}
                    >
                      <SelectTrigger className="w-28" data-testid={`select-frequency-${project.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Commit message (optional)"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="flex-1 text-sm"
                    data-testid={`input-commit-message-${project.id}`}
                  />
                  <Button
                    onClick={() => pushMutation.mutate()}
                    disabled={pushMutation.isPending || !config.githubRepo}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                    data-testid={`button-push-now-${project.id}`}
                  >
                    {pushMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Push Now
                    {backupRate?.isActive && backupRate.rateCents > 0 && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 bg-white/20 rounded-full px-2 py-0.5 text-xs font-medium">
                        <DollarSign className="w-3 h-3" />{(backupRate.rateCents / 100).toFixed(2)}
                      </span>
                    )}
                  </Button>
                </div>

                {config.lastPushAt && (
                  <p className="text-xs text-muted-foreground">
                    Last backup: {new Date(config.lastPushAt).toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Github className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Waiting for customer to connect GitHub</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {customer?.name || "Customer"} needs to connect their GitHub account from their portal.
                  </p>
                  {customer?.portalToken && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Portal link: <code className="bg-muted px-1 rounded">/portal/{customer.portalToken}</code>
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteConfigMutation.mutate()}
                  disabled={deleteConfigMutation.isPending}
                  className="text-destructive"
                  data-testid={`button-remove-config-${project.id}`}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Remove
                </Button>
              </div>
            )}
          </div>
        )}

        {showSetup && config?.isConnected && (
          <div className="mt-4 p-4 border rounded-lg space-y-3 bg-muted/20">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Repository Settings
            </h4>
            <div className="space-y-2">
              <Label className="text-xs">Repository</Label>
              <Select
                value={selectedRepo || config.githubRepo || ""}
                onValueChange={(val) => {
                  setSelectedRepo(val);
                  const repo = repos?.find(r => r.fullName === val);
                  if (repo) setSelectedBranch(repo.defaultBranch);
                  updateConfigMutation.mutate({ githubRepo: val, githubBranch: repo?.defaultBranch || "main" });
                }}
              >
                <SelectTrigger data-testid={`select-repo-${project.id}`}>
                  <SelectValue placeholder="Select a repository" />
                </SelectTrigger>
                <SelectContent>
                  {repos?.map((repo) => (
                    <SelectItem key={repo.fullName} value={repo.fullName}>
                      <span className="flex items-center gap-2">
                        {repo.fullName}
                        {repo.private && <Badge variant="secondary" className="text-[10px] py-0 px-1">private</Badge>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Branch</Label>
              <Input
                value={selectedBranch || config.githubBranch || "main"}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  updateConfigMutation.mutate({ githubBranch: e.target.value });
                }}
                className="text-sm"
                data-testid={`input-branch-${project.id}`}
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  if (confirm("Remove Git backup configuration for this project?")) {
                    deleteConfigMutation.mutate();
                  }
                }}
                data-testid={`button-delete-config-${project.id}`}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Remove Backup
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowSetup(false)}>
                Done
              </Button>
            </div>
          </div>
        )}

        {showLogs && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <History className="w-4 h-4" />
                Backup History
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/git-backups/logs", project.id] })}
                data-testid={`button-refresh-logs-${project.id}`}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            {!logs || logs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No backups yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-2 rounded-md border text-xs" data-testid={`log-entry-${log.id}`}>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={log.status} />
                      <span className="text-muted-foreground">
                        {log.commitMessage || "Backup"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {log.triggeredBy === "autopilot" && <span title="Autopilot"><Zap className="w-3 h-3 text-amber-500" /></span>}
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                      {log.commitSha && (
                        <code className="bg-muted px-1 rounded font-mono">{log.commitSha.substring(0, 7)}</code>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

interface BillingRate {
  id: string;
  code: string;
  name: string;
  rateCents: number;
  isActive: boolean | null;
  unitLabel: string;
}

export default function CodeBackups() {
  const { toast } = useToast();
  const [editingRate, setEditingRate] = useState(false);
  const [newRate, setNewRate] = useState("");

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: backupRate } = useQuery<BillingRate>({
    queryKey: ["/api/git-backups/billing-rate"],
    queryFn: async () => {
      const res = await fetch("/api/git-backups/billing-rate", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: async (data: { rateCents?: number; isActive?: boolean }) => {
      const res = await apiRequest("PATCH", "/api/git-backups/billing-rate", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/git-backups/billing-rate"] });
      setEditingRate(false);
      toast({ title: "Rate updated", description: "Backup billing rate has been updated." });
    },
  });

  const activeProjects = projects?.filter(p => p.status === "active") || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3" data-testid="text-page-title">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <FolderGit2 className="w-6 h-6 text-white" />
          </div>
          Code Backups
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Push project backups to your customers' GitHub repositories. Customers connect their GitHub from their portal, and you control when backups happen.
        </p>
      </div>

      <Card className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200 dark:border-violet-800">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-violet-900 dark:text-violet-200">How it works</p>
            <ol className="text-xs text-violet-700 dark:text-violet-300 mt-1 space-y-0.5 list-decimal pl-4">
              <li>Click "Enable Code Backups" on any project below</li>
              <li>Your customer connects their GitHub account from their portal</li>
              <li>Select which repository and branch to push backups to</li>
              <li>Push manually anytime, or turn on Autopilot for automatic daily/weekly backups</li>
              <li>Each successful backup automatically adds a billable work entry to the project</li>
            </ol>
          </div>
        </div>
      </Card>

      {backupRate && (
        <Card className="p-4 border-emerald-200 dark:border-emerald-800" data-testid="card-backup-billing">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Backup Billing Rate</p>
                {editingRate ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      className="w-24 h-7 text-xs"
                      data-testid="input-backup-rate"
                    />
                    <span className="text-xs text-muted-foreground">per backup</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        const val = parseFloat(newRate);
                        if (isNaN(val) || val < 0) return;
                        const cents = Math.round(val * 100);
                        updateRateMutation.mutate({ rateCents: cents });
                      }}
                      disabled={!newRate || isNaN(parseFloat(newRate)) || parseFloat(newRate) < 0}
                      data-testid="button-save-rate"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setEditingRate(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">${(backupRate.rateCents / 100).toFixed(2)}</span> per backup &middot; auto-added to project billing
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!editingRate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setNewRate((backupRate.rateCents / 100).toFixed(2)); setEditingRate(true); }}
                  data-testid="button-edit-rate"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                size="sm"
                variant={backupRate.isActive ? "outline" : "secondary"}
                onClick={() => updateRateMutation.mutate({ isActive: !backupRate.isActive })}
                className="text-xs"
                data-testid="button-toggle-billing"
              >
                {backupRate.isActive ? (
                  <><ToggleRight className="w-4 h-4 mr-1 text-emerald-500" /> Billing On</>
                ) : (
                  <><ToggleLeft className="w-4 h-4 mr-1 text-muted-foreground" /> Billing Off</>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {projectsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : activeProjects.length === 0 ? (
        <Card className="p-8 text-center">
          <FolderGit2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No active projects found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeProjects.map(project => (
            <ProjectBackupCard
              key={project.id}
              project={project}
              customers={customers || []}
              backupRate={backupRate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
