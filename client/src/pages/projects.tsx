import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  FolderOpen, Plus, Search, Clock, FileText, Pencil,
  Receipt, Trash2, DollarSign, Layers, TrendingUp,
  ExternalLink, Copy, Link, Check, X, Activity, Send, Milestone,
  Camera, Download, Image, Loader2, Users, ThumbsUp, RotateCcw, Eye, File, Upload,
  ChevronDown, Building2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/format";
import { useUpload } from "@/hooks/use-upload";
import type { Customer, Project, BillingRate, WorkEntry, ProjectUpdate, ProjectScreenshot, ProjectClientFile } from "@shared/schema";

interface PendingUpload {
  file: File;
  name: string;
  preview: string;
}

function ProjectScreenshotsSection({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: screenshots, isLoading } = useQuery<ProjectScreenshot[]>({
    queryKey: ["/api/projects", projectId, "screenshots"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/screenshots`);
      if (!res.ok) throw new Error("Failed to fetch screenshots");
      return res.json();
    },
  });

  const { uploadFile } = useUpload({});

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/screenshots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "screenshots"] });
      toast({ title: "Screenshot deleted" });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, fileName }: { id: string; fileName: string }) => {
      const res = await apiRequest("PATCH", `/api/screenshots/${id}`, { fileName });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "screenshots"] });
      toast({ title: "Name updated" });
    },
  });

  const requestApprovalMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/screenshots/${id}/request-approval`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "screenshots"] });
      toast({ title: "Approval requested", description: "Client can now approve or request revisions." });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const pending: PendingUpload[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const nameWithoutExt = f.name.replace(/\.[^/.]+$/, "");
      pending.push({ file: f, name: nameWithoutExt, preview: URL.createObjectURL(f) });
    }
    setPendingUploads(pending);
    e.target.value = "";
  };

  const handleConfirmUpload = async () => {
    setUploading(true);
    try {
      for (const item of pendingUploads) {
        const response = await uploadFile(item.file);
        if (response) {
          await apiRequest("POST", `/api/projects/${projectId}/screenshots`, {
            objectPath: response.objectPath,
            fileName: item.name || response.metadata.name,
            fileSize: response.metadata.size,
            contentType: response.metadata.contentType,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "screenshots"] });
      toast({ title: "Screenshots uploaded", description: `${pendingUploads.length} screenshot${pendingUploads.length > 1 ? "s" : ""} saved.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      pendingUploads.forEach(p => URL.revokeObjectURL(p.preview));
      setPendingUploads([]);
      setUploading(false);
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  return (
    <div className="p-3 rounded-md bg-muted/40" data-testid={`screenshots-section-${projectId}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Screenshots</span>
          {screenshots && screenshots.length > 0 && (
            <Badge variant="secondary" className="text-xs">{screenshots.length}</Badge>
          )}
        </div>
        <div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id={`screenshot-upload-${projectId}`}
            data-testid={`input-screenshot-upload-${projectId}`}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(`screenshot-upload-${projectId}`)?.click()}
            data-testid={`button-upload-screenshot-${projectId}`}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Upload
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex gap-2">
          <Skeleton className="h-16 w-16 rounded-md" />
          <Skeleton className="h-16 w-16 rounded-md" />
        </div>
      ) : screenshots && screenshots.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {screenshots.map((ss) => (
            <div key={ss.id} className="group relative rounded-md overflow-visible border bg-background" data-testid={`screenshot-item-${ss.id}`}>
              <a href={ss.objectPath} target="_blank" rel="noopener noreferrer" className="block relative">
                <img
                  src={ss.objectPath}
                  alt={ss.fileName}
                  className="w-full h-20 object-cover rounded-t-md"
                  loading="lazy"
                />
                {ss.approvalStatus && (
                  <div className="absolute top-1 right-1">
                    {ss.approvalStatus === "approved" && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" title="Approved" />}
                    {ss.approvalStatus === "pending" && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white" title="Awaiting approval" />}
                    {ss.approvalStatus === "revisions" && <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" title="Revisions requested" />}
                  </div>
                )}
              </a>
              <div className="p-1.5">
                <div className="flex items-center justify-between gap-1">
                  {editingId === ss.id ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-6 text-[11px] px-1.5 flex-1 min-w-0"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            renameMutation.mutate({ id: ss.id, fileName: editingName });
                            setEditingId(null);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        data-testid={`input-rename-screenshot-${ss.id}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 shrink-0"
                        onClick={() => {
                          renameMutation.mutate({ id: ss.id, fileName: editingName });
                          setEditingId(null);
                        }}
                        data-testid={`button-confirm-rename-${ss.id}`}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <span
                      className="text-[11px] text-muted-foreground truncate flex-1 cursor-pointer"
                      title={`${ss.fileName} (click to rename)`}
                      onClick={() => { setEditingId(ss.id); setEditingName(ss.fileName); }}
                      data-testid={`text-screenshot-name-${ss.id}`}
                    >
                      {ss.fileName}
                    </span>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 shrink-0"
                    onClick={() => deleteMutation.mutate(ss.id)}
                    data-testid={`button-delete-screenshot-${ss.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                {ss.approvalStatus === "revisions" && ss.revisionNotes && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 line-clamp-2" title={ss.revisionNotes}>
                    Revisions: {ss.revisionNotes}
                  </p>
                )}
                {!ss.approvalStatus && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-1.5 h-6 text-[10px]"
                    onClick={() => requestApprovalMutation.mutate(ss.id)}
                    disabled={requestApprovalMutation.isPending}
                    data-testid={`button-request-approval-${ss.id}`}
                  >
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    Request Approval
                  </Button>
                )}
                {ss.approvalStatus === "approved" && (
                  <Badge variant="secondary" className="text-[10px] mt-1.5 w-full justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    Approved
                  </Badge>
                )}
                {ss.approvalStatus === "pending" && (
                  <Badge variant="secondary" className="text-[10px] mt-1.5 w-full justify-center">
                    Awaiting Approval
                  </Badge>
                )}
                {ss.approvalStatus === "revisions" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-1.5 h-6 text-[10px]"
                    onClick={() => requestApprovalMutation.mutate(ss.id)}
                    disabled={requestApprovalMutation.isPending}
                    data-testid={`button-resubmit-approval-${ss.id}`}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Resubmit for Approval
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No screenshots uploaded yet</p>
      )}

      <Dialog open={pendingUploads.length > 0} onOpenChange={() => { pendingUploads.forEach(p => URL.revokeObjectURL(p.preview)); setPendingUploads([]); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Name Your Screenshots</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {pendingUploads.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-md border" data-testid={`pending-upload-${idx}`}>
                <img src={item.preview} alt="" className="w-14 h-14 rounded-md object-cover shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <Input
                    value={item.name}
                    onChange={(e) => {
                      const updated = [...pendingUploads];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setPendingUploads(updated);
                    }}
                    placeholder="Screenshot name"
                    className="text-sm"
                    data-testid={`input-screenshot-name-${idx}`}
                  />
                  <p className="text-[10px] text-muted-foreground truncate">{item.file.name}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { pendingUploads.forEach(p => URL.revokeObjectURL(p.preview)); setPendingUploads([]); }}
              disabled={uploading}
              data-testid="button-cancel-upload"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmUpload}
              disabled={uploading || pendingUploads.some(p => !p.name.trim())}
              data-testid="button-confirm-upload"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Uploading...</>
              ) : (
                <><Camera className="w-4 h-4 mr-1.5" />Upload {pendingUploads.length > 1 ? `${pendingUploads.length} Screenshots` : "Screenshot"}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminClientFilesSection({ projectId }: { projectId: string }) {
  const { data: files, isLoading } = useQuery<ProjectClientFile[]>({
    queryKey: ["/api/projects", projectId, "client-files"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/client-files`);
      if (!res.ok) throw new Error("Failed to fetch client files");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-3 rounded-md bg-muted/40">
        <div className="flex items-center gap-2 mb-2">
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client Files</span>
        </div>
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!files || files.length === 0) return null;

  return (
    <div className="p-3 rounded-md bg-muted/40" data-testid={`client-files-section-${projectId}`}>
      <div className="flex items-center gap-2 mb-2">
        <Upload className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client Files</span>
        <Badge variant="secondary" className="text-xs">{files.length}</Badge>
      </div>
      <div className="space-y-1.5">
        {files.map((f) => (
          <div key={f.id} className="flex items-center gap-2 p-2 rounded-md border bg-background" data-testid={`client-file-${f.id}`}>
            <File className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" data-testid={`text-client-file-name-${f.id}`}>{f.fileName}</p>
              <p className="text-[10px] text-muted-foreground">
                {f.contentType} {f.fileSize ? `· ${(f.fileSize / 1024).toFixed(1)} KB` : ""}
              </p>
            </div>
            <a href={f.objectPath} target="_blank" rel="noopener noreferrer">
              <Button size="icon" variant="ghost" data-testid={`button-download-client-file-${f.id}`}>
                <Download className="w-3.5 h-3.5" />
              </Button>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-6 w-48 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-36" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Projects() {
  usePageTitle("Projects");
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [workDialogOpen, setWorkDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState({ customerId: "", name: "", description: "" });
  const [workForm, setWorkForm] = useState({ rateId: "", quantity: "1", description: "" });
  const [editingLinkKey, setEditingLinkKey] = useState<string | null>(null);
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [copiedLinkKey, setCopiedLinkKey] = useState<string | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateProjectId, setUpdateProjectId] = useState<string | null>(null);
  const [updateForm, setUpdateForm] = useState({ title: "", description: "", type: "update", status: "completed" });
  const [collapsedCustomers, setCollapsedCustomers] = useState<Set<string>>(new Set());

  const toggleCustomerGroup = (customerId: string) => {
    setCollapsedCustomers(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: rates } = useQuery<BillingRate[]>({
    queryKey: ["/api/billing-rates"],
  });

  const { data: workEntries } = useQuery<WorkEntry[]>({
    queryKey: ["/api/work-entries"],
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: typeof projectForm) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setProjectDialogOpen(false);
      setProjectForm({ customerId: "", name: "", description: "" });
      toast({ title: "Project created", description: "New project has been added." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const logWorkMutation = useMutation({
    mutationFn: async (data: { projectId: string; customerId: string; rateId: string; quantity: string; description: string }) => {
      const res = await apiRequest("POST", "/api/work-entries", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setWorkDialogOpen(false);
      setWorkForm({ rateId: "", quantity: "1", description: "" });
      toast({ title: "Work logged", description: "Work entry has been recorded." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteWorkMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/work-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Entry deleted", description: "Work entry has been removed." });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Project deleted", description: "Project and all related data have been removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async (data: { projectId: string }) => {
      const res = await apiRequest("POST", "/api/invoices/generate", { ...data, taxRate: 0 });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setInvoiceDialogOpen(false);
      toast({ title: "Invoice generated", description: "Invoice has been created from unbilled work." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateLinkMutation = useMutation({
    mutationFn: async ({ id, field, url }: { id: string; field: "previewUrl" | "progressUrl"; url: string }) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, { [field]: url || null });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditingLinkKey(null);
      toast({ title: "Link saved", description: "The link has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const copyLink = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkKey(key);
    setTimeout(() => setCopiedLinkKey(null), 2000);
    toast({ title: "Copied", description: "Link copied to clipboard." });
  };

  const createUpdateMutation = useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: typeof updateForm }) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/updates`, data);
      return res.json();
    },
    onSuccess: () => {
      if (updateProjectId) queryClient.invalidateQueries({ queryKey: ["/api/projects", updateProjectId, "updates"] });
      setUpdateDialogOpen(false);
      setUpdateForm({ title: "", description: "", type: "update", status: "completed" });
      toast({ title: "Update posted", description: "Progress update has been published." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteUpdateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/project-updates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Update deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openLogWork = (projectId: string) => {
    setSelectedProjectId(projectId);
    setWorkForm({ rateId: "", quantity: "1", description: "" });
    setWorkDialogOpen(true);
  };

  const openGenerateInvoice = (projectId: string) => {
    setSelectedProjectId(projectId);
    setInvoiceDialogOpen(true);
  };

  const handleLogWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    const project = projects?.find(p => p.id === selectedProjectId);
    if (!project) return;
    logWorkMutation.mutate({
      projectId: selectedProjectId,
      customerId: project.customerId,
      rateId: workForm.rateId,
      quantity: workForm.quantity,
      description: workForm.description,
    });
  };

  if (projectsLoading) return <ProjectsSkeleton />;

  const customerMap = new Map(customers?.map(c => [c.id, c]) ?? []);
  const rateMap = new Map(rates?.map(r => [r.id, r]) ?? []);

  const filtered = projects?.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (customerMap.get(p.customerId)?.name ?? "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const getProjectMetrics = (projectId: string) => {
    const allEntries = workEntries?.filter(e => e.projectId === projectId) ?? [];
    const unbilled = allEntries.filter(e => !e.invoiceId);
    const billed = allEntries.filter(e => e.invoiceId);

    const unbilledAmount = unbilled.reduce((sum, e) => {
      const rate = rateMap.get(e.rateId);
      return sum + (Number(e.quantity) * (rate?.rateCents ?? 0));
    }, 0);

    const billedAmount = billed.reduce((sum, e) => {
      const rate = rateMap.get(e.rateId);
      return sum + (Number(e.quantity) * (rate?.rateCents ?? 0));
    }, 0);

    return {
      totalEntries: allEntries.length,
      unbilledCount: unbilled.length,
      unbilledAmount,
      billedAmount,
      totalAmount: unbilledAmount + billedAmount,
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Track work and generate invoices for each project</p>
        </div>
        <Button onClick={() => { setProjectForm({ customerId: "", name: "", description: "" }); setProjectDialogOpen(true); }} data-testid="button-add-project">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-projects"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-5">
          {(() => {
            const grouped = new Map<string, typeof filtered>();
            filtered.forEach((project) => {
              const cid = project.customerId;
              if (!grouped.has(cid)) grouped.set(cid, []);
              grouped.get(cid)!.push(project);
            });

            return Array.from(grouped.entries()).map(([customerId, customerProjects]) => {
              const customer = customerMap.get(customerId);
              const isCollapsed = collapsedCustomers.has(customerId);
              const totalUnbilled = customerProjects.reduce((sum, p) => sum + getProjectMetrics(p.id).unbilledAmount, 0);
              const totalBilled = customerProjects.reduce((sum, p) => sum + getProjectMetrics(p.id).billedAmount, 0);

              return (
                <div key={customerId} data-testid={`customer-group-${customerId}`}>
                  <button
                    onClick={() => toggleCustomerGroup(customerId)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-muted/50 hover-elevate transition-colors mb-2"
                    data-testid={`button-toggle-customer-${customerId}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold truncate" data-testid={`text-customer-group-name-${customerId}`}>
                        {customer?.company || customer?.name || "Unknown Customer"}
                      </span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {customerProjects.length} {customerProjects.length === 1 ? "project" : "projects"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-sm">
                      {totalUnbilled > 0 && (
                        <span className="text-amber-500 font-medium" data-testid={`text-customer-unbilled-${customerId}`}>
                          ${(totalUnbilled / 100).toLocaleString()} unbilled
                        </span>
                      )}
                      {totalBilled > 0 && (
                        <span className="text-muted-foreground" data-testid={`text-customer-billed-${customerId}`}>
                          ${(totalBilled / 100).toLocaleString()} billed
                        </span>
                      )}
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-4 pl-4 border-l-2 border-muted ml-4">
                      {customerProjects.map((project) => {
                        const metrics = getProjectMetrics(project.id);
                        const projectEntries = workEntries?.filter(e => e.projectId === project.id && !e.invoiceId) ?? [];

            return (
              <Card key={project.id} className="p-5" data-testid={`card-project-${project.id}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold" data-testid={`text-project-name-${project.id}`}>{project.name}</h3>
                      <Badge variant="secondary" className={`text-xs ${getStatusColor(project.status)}`}>
                        {project.status}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openLogWork(project.id)} data-testid={`button-log-work-${project.id}`}>
                      <Clock className="w-4 h-4 mr-1.5" />
                      Log Work
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setUpdateProjectId(project.id); setUpdateForm({ title: "", description: "", type: "update", status: "completed" }); setUpdateDialogOpen(true); }} data-testid={`button-post-update-${project.id}`}>
                      <Activity className="w-4 h-4 mr-1.5" />
                      Post Update
                    </Button>
                    {metrics.unbilledCount > 0 && (
                      <Button size="sm" onClick={() => openGenerateInvoice(project.id)} data-testid={`button-generate-invoice-${project.id}`}>
                        <Receipt className="w-4 h-4 mr-1.5" />
                        Generate Invoice
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete this project? This will also remove all related work entries and invoices.")) {
                          deleteProjectMutation.mutate(project.id);
                        }
                      }}
                      disabled={deleteProjectMutation.isPending}
                      data-testid={`button-delete-project-${project.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(() => {
                    const previewEditKey = `${project.id}-previewUrl`;
                    return (
                      <div className="p-3 rounded-md bg-muted/40" data-testid={`previewUrl-section-${project.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preview Link</span>
                        </div>
                        {editingLinkKey === previewEditKey ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={linkUrlInput}
                              onChange={(e) => setLinkUrlInput(e.target.value)}
                              placeholder="https://preview.example.com/site"
                              className="flex-1 text-sm"
                              data-testid={`input-previewUrl-${project.id}`}
                            />
                            <Button size="icon" variant="ghost" onClick={() => updateLinkMutation.mutate({ id: project.id, field: "previewUrl", url: linkUrlInput })} disabled={updateLinkMutation.isPending} data-testid={`button-save-previewUrl-${project.id}`}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingLinkKey(null)} data-testid={`button-cancel-previewUrl-${project.id}`}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : project.previewUrl ? (
                          <div className="flex items-center gap-2">
                            <a href={project.previewUrl} target="_blank" rel="noopener noreferrer" className="text-sm truncate flex-1 underline decoration-muted-foreground/30 underline-offset-2" data-testid={`link-previewUrl-${project.id}`}>
                              {project.previewUrl}
                            </a>
                            <Button size="icon" variant="ghost" onClick={() => copyLink(previewEditKey, project.previewUrl!)} data-testid={`button-copy-previewUrl-${project.id}`}>
                              {copiedLinkKey === previewEditKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => window.open(project.previewUrl!, '_blank')} data-testid={`button-open-previewUrl-${project.id}`}>
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => { setEditingLinkKey(previewEditKey); setLinkUrlInput(project.previewUrl || ""); }} data-testid={`button-edit-previewUrl-${project.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => { setEditingLinkKey(previewEditKey); setLinkUrlInput(""); }} data-testid={`button-add-previewUrl-${project.id}`}>
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add Preview Link
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                  {(() => {
                    const progressUrl = `${window.location.origin}/progress/${project.id}`;
                    const progressCopyKey = `${project.id}-progressUrl`;
                    return (
                      <div className="p-3 rounded-md bg-muted/40" data-testid={`progressUrl-section-${project.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress Link</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate flex-1 text-muted-foreground" data-testid={`link-progressUrl-${project.id}`}>
                            /progress/{project.id.slice(0, 8)}...
                          </span>
                          <Button size="icon" variant="ghost" onClick={() => copyLink(progressCopyKey, progressUrl)} data-testid={`button-copy-progressUrl-${project.id}`}>
                            {copiedLinkKey === progressCopyKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => window.open(progressUrl, '_blank')} data-testid={`button-open-progressUrl-${project.id}`}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                  {(() => {
                    if (!customer?.portalToken) return null;
                    const portalUrl = `${window.location.origin}/portal/${customer.portalToken}`;
                    const portalCopyKey = `${project.id}-portalUrl`;
                    return (
                      <div className="p-3 rounded-md bg-muted/40" data-testid={`portalUrl-section-${project.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client Portal</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate flex-1 text-muted-foreground" data-testid={`link-portalUrl-${project.id}`}>
                            /portal/{customer.portalToken.slice(0, 8)}...
                          </span>
                          <Button size="icon" variant="ghost" onClick={() => copyLink(portalCopyKey, portalUrl)} data-testid={`button-copy-portalUrl-${project.id}`}>
                            {copiedLinkKey === portalCopyKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => window.open(portalUrl, '_blank')} data-testid={`button-open-portalUrl-${project.id}`}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="mb-4">
                  <ProjectScreenshotsSection projectId={project.id} />
                </div>

                <div className="mb-4">
                  <AdminClientFilesSection projectId={project.id} />
                </div>

                {metrics.totalEntries > 0 && (
                  <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid={`metrics-project-${project.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
                        <TrendingUp className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground leading-none mb-1">Total Value</p>
                        <p className="text-sm font-semibold leading-none truncate" data-testid={`text-total-value-${project.id}`}>{formatCurrency(metrics.totalAmount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-green-500/10 shrink-0">
                        <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground leading-none mb-1">Invoiced</p>
                        <p className="text-sm font-semibold leading-none truncate" data-testid={`text-billed-value-${project.id}`}>{formatCurrency(metrics.billedAmount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-500/10 shrink-0">
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground leading-none mb-1">Unbilled</p>
                        <p className="text-sm font-semibold leading-none truncate" data-testid={`text-unbilled-value-${project.id}`}>{formatCurrency(metrics.unbilledAmount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-500/10 shrink-0">
                        <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground leading-none mb-1">Deliverables</p>
                        <p className="text-sm font-semibold leading-none truncate" data-testid={`text-total-entries-${project.id}`}>{metrics.totalEntries}</p>
                      </div>
                    </div>
                  </div>
                )}

                {projectEntries.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Work</th>
                          <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                          <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</th>
                          <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate</th>
                          <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                          <th className="py-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectEntries.map((entry) => {
                          const rate = rateMap.get(entry.rateId);
                          const lineTotal = Number(entry.quantity) * (rate?.rateCents ?? 0);
                          return (
                            <tr key={entry.id} className="border-b last:border-b-0" data-testid={`row-work-${entry.id}`}>
                              <td className="py-2 pr-4 font-medium">{rate?.name ?? "Unknown"}</td>
                              <td className="py-2 pr-4 text-muted-foreground max-w-[200px] truncate">{entry.description || "—"}</td>
                              <td className="py-2 pr-4 text-right">{Number(entry.quantity)}</td>
                              <td className="py-2 pr-4 text-right text-muted-foreground">{formatCurrency(rate?.rateCents ?? 0)}/{rate?.unitLabel}</td>
                              <td className="py-2 pr-4 text-right font-medium">{formatCurrency(lineTotal)}</td>
                              <td className="py-2 pr-4 text-right text-muted-foreground text-xs">{formatDate(entry.recordedAt)}</td>
                              <td className="py-2">
                                <Button size="icon" variant="ghost" onClick={() => deleteWorkMutation.mutate(entry.id)} data-testid={`button-delete-work-${entry.id}`}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {projectEntries.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No unbilled work entries yet</p>
                )}
              </Card>
                      );
                    })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "No projects match your search" : "No projects yet. Create a project to start tracking work."}
          </p>
        </Card>
      )}

      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createProjectMutation.mutate(projectForm); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={projectForm.customerId} onValueChange={(v) => setProjectForm(p => ({ ...p, customerId: v }))}>
                <SelectTrigger data-testid="select-project-customer">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company ? `${c.company} (${c.name})` : c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input id="project-name" value={projectForm.name} onChange={(e) => setProjectForm(p => ({ ...p, name: e.target.value }))} required data-testid="input-project-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-desc">Description</Label>
              <Textarea id="project-desc" value={projectForm.description} onChange={(e) => setProjectForm(p => ({ ...p, description: e.target.value }))} data-testid="input-project-description" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setProjectDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createProjectMutation.isPending || !projectForm.customerId} data-testid="button-save-project">
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={workDialogOpen} onOpenChange={setWorkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Work</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogWork} className="space-y-4">
            <div className="space-y-2">
              <Label>What did you do? *</Label>
              <Select value={workForm.rateId} onValueChange={(v) => setWorkForm(p => ({ ...p, rateId: v }))}>
                <SelectTrigger data-testid="select-work-type">
                  <SelectValue placeholder="Select work type" />
                </SelectTrigger>
                <SelectContent>
                  {rates?.filter(r => r.isActive).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({formatCurrency(r.rateCents)}/{r.unitLabel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="work-qty">Quantity *</Label>
              <Input id="work-qty" type="number" min="0.1" step="0.1" value={workForm.quantity} onChange={(e) => setWorkForm(p => ({ ...p, quantity: e.target.value }))} required data-testid="input-work-quantity" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work-desc">Description</Label>
              <Textarea id="work-desc" placeholder="Brief note about what was done" value={workForm.description} onChange={(e) => setWorkForm(p => ({ ...p, description: e.target.value }))} data-testid="input-work-description" />
            </div>
            {workForm.rateId && (
              <div className="p-3 rounded-md bg-muted/50 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Estimated charge:</span>
                  <span className="font-semibold" data-testid="text-work-estimate">
                    {formatCurrency(Number(workForm.quantity) * (rateMap.get(workForm.rateId)?.rateCents ?? 0))}
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setWorkDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={logWorkMutation.isPending || !workForm.rateId} data-testid="button-save-work">
                {logWorkMutation.isPending ? "Logging..." : "Log Work"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
          </DialogHeader>
          {selectedProjectId && (() => {
            const m = getProjectMetrics(selectedProjectId);
            const unbilled = m.unbilledAmount;
            const count = m.unbilledCount;
            return (
              <div className="space-y-4">
                <div className="space-y-2 p-3 rounded-md bg-muted/50 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Work entries:</span>
                    <span>{count}</span>
                  </div>
                  <div className="flex justify-between gap-3 pt-2 border-t font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(unbilled)}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setInvoiceDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => generateInvoiceMutation.mutate({ projectId: selectedProjectId })} disabled={generateInvoiceMutation.isPending} data-testid="button-confirm-generate-invoice">
                    {generateInvoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Progress Update</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (updateProjectId) createUpdateMutation.mutate({ projectId: updateProjectId, data: updateForm }); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="update-title">Title *</Label>
              <Input id="update-title" value={updateForm.title} onChange={(e) => setUpdateForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Homepage design completed" required data-testid="input-update-title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="update-desc">Description</Label>
              <Textarea id="update-desc" value={updateForm.description} onChange={(e) => setUpdateForm(p => ({ ...p, description: e.target.value }))} placeholder="Add details about this update..." data-testid="input-update-description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={updateForm.type} onValueChange={(v) => setUpdateForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger data-testid="select-update-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="deliverable">Deliverable</SelectItem>
                    <SelectItem value="launch">Launch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={updateForm.status} onValueChange={(v) => setUpdateForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger data-testid="select-update-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createUpdateMutation.isPending} data-testid="button-save-update">
                {createUpdateMutation.isPending ? "Posting..." : "Post Update"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
