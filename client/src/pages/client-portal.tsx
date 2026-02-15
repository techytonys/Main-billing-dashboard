import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useSearch } from "wouter";
import { useState, useEffect } from "react";
import {
  FileText, ChevronDown, ChevronUp, Clock, CheckCircle, AlertTriangle,
  FolderOpen, User, Mail, Phone, Pencil, Save, Loader2, LifeBuoy, Plus, Send,
  ArrowLeft, CircleDot, MessageSquare, CreditCard, Download, Trash2, ShieldAlert, Star,
  CalendarClock, ExternalLink, ImageIcon, Receipt, Wallet, LayoutDashboard, Bell, Check,
  Upload, File, ThumbsUp, RotateCcw, Eye, BellRing, BellOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatCurrency, formatDate, getStatusColor } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Invoice, InvoiceLineItem, Project, SupportTicket, TicketMessage, PaymentPlan, ProjectScreenshot, ProjectClientFile } from "@shared/schema";
import { useUpload } from "@/hooks/use-upload";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const logoImg = "/images/logo.png";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise() {
  if (!stripePromise) {
    stripePromise = fetch("/api/stripe/publishable-key")
      .then(r => r.json())
      .then(d => loadStripe(d.publishableKey))
      .catch(() => null);
  }
  return stripePromise;
}

interface PaymentMethodInfo {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

function CardBrandIcon({ brand }: { brand: string }) {
  const label = brand.charAt(0).toUpperCase() + brand.slice(1);
  return (
    <div className="flex items-center justify-center w-10 h-7 rounded-md border bg-background text-xs font-bold uppercase tracking-wide">
      {brand === "visa" ? "VISA" : brand === "mastercard" ? "MC" : brand === "amex" ? "AMEX" : label.substring(0, 4)}
    </div>
  );
}

function AddCardForm({ token, onSuccess, onCancel }: { token: string; onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSaving(true);
    setError(null);

    try {
      const res = await apiRequest("POST", `/api/portal/${token}/setup-intent`);
      const { clientSecret } = await res.json();

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (result.error) {
        setError(result.error.message || "Failed to save card");
      } else {
        toast({ title: "Card saved", description: "Your payment method has been added." });
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-md bg-background">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "15px",
                color: "hsl(var(--foreground))",
                "::placeholder": { color: "hsl(var(--muted-foreground))" },
                fontFamily: "Poppins, sans-serif",
              },
              invalid: { color: "hsl(var(--destructive))" },
            },
          }}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={saving || !stripe} data-testid="button-save-card">
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
          Save Card
        </Button>
        <Button variant="ghost" type="button" onClick={onCancel} data-testid="button-cancel-add-card">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function PaymentMethodsSection({ token }: { token: string }) {
  const [adding, setAdding] = useState(false);
  const [stripeLoaded, setStripeLoaded] = useState<Promise<Stripe | null> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setStripeLoaded(getStripePromise());
  }, []);

  const { data, isLoading, refetch } = useQuery<{ paymentMethods: PaymentMethodInfo[]; defaultPaymentMethodId: string | null }>({
    queryKey: ["/api/portal", token, "payment-methods"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${token}/payment-methods`);
      if (!res.ok) throw new Error("Failed to load payment methods");
      return res.json();
    },
    enabled: !!token,
  });

  const deleteMutation = useMutation({
    mutationFn: async (pmId: string) => {
      const res = await apiRequest("DELETE", `/api/portal/${token}/payment-methods/${pmId}`);
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Card removed", description: "Payment method has been deleted." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Could not remove card.", variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (pmId: string) => {
      const res = await apiRequest("POST", `/api/portal/${token}/default-payment-method`, { paymentMethodId: pmId });
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Default updated", description: "Your default payment method has been changed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Could not set default.", variant: "destructive" });
    },
  });

  const methods = data?.paymentMethods || [];

  return (
    <div data-testid="card-payment-methods">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Payment Methods</h3>
        {!adding && methods.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAdding(true)}
            data-testid="button-add-card"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Card
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
      ) : (
        <>
          {methods.length === 0 && !adding && (
            <Card className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">No saved payment methods</p>
              <p className="text-xs text-muted-foreground mb-4">Add a card for faster checkout</p>
              <Button
                variant="outline"
                onClick={() => setAdding(true)}
                data-testid="button-add-first-card"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Your First Card
              </Button>
            </Card>
          )}

          {methods.length > 0 && (
            <div className="space-y-2">
              {methods.map((pm) => (
                <Card
                  key={pm.id}
                  className="p-4"
                  data-testid={`card-pm-${pm.id}`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <CardBrandIcon brand={pm.brand} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" data-testid={`text-pm-last4-${pm.id}`}>
                            **** {pm.last4}
                          </span>
                          {pm.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="w-3 h-3 mr-0.5" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Expires {String(pm.expMonth).padStart(2, "0")}/{pm.expYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!pm.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(pm.id)}
                          disabled={setDefaultMutation.isPending}
                          data-testid={`button-set-default-${pm.id}`}
                        >
                          <Star className="w-3.5 h-3.5 mr-1" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Remove this card?")) deleteMutation.mutate(pm.id);
                        }}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-remove-pm-${pm.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {adding && stripeLoaded && (
            <Card className="p-5 mt-3">
              <p className="text-sm font-medium mb-4">Add a new card</p>
              <Elements stripe={stripeLoaded}>
                <AddCardForm
                  token={token}
                  onSuccess={() => { setAdding(false); refetch(); }}
                  onCancel={() => setAdding(false)}
                />
              </Elements>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

interface PortalData {
  customer: { name: string; company: string | null; email: string; phone: string | null };
  invoices: (Invoice & { lineItems: InvoiceLineItem[] })[];
  projects: Project[];
}

function PortalSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <Skeleton className="h-10 w-64 bg-white/10" />
          <Skeleton className="h-5 w-48 mt-3 bg-white/10" />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 -mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => <Card key={i} className="p-6"><Skeleton className="h-10 w-24" /></Card>)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Card key={i} className="p-6"><Skeleton className="h-6 w-40 mb-3" /><Skeleton className="h-4 w-32" /></Card>)}
        </div>
      </div>
    </div>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case "paid":
      return <CheckCircle className="w-4 h-4" />;
    case "overdue":
      return <AlertTriangle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

function PortalClientFiles({ token, projectId }: { token: string; projectId: string }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const { uploadFile } = useUpload({});

  const { data: files, isLoading } = useQuery<ProjectClientFile[]>({
    queryKey: ["/api/portal", token, "projects", projectId, "files"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${token}/projects/${projectId}/files`);
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
    enabled: !!token && !!projectId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await fetch(`/api/portal/${token}/files/${fileId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal", token, "projects", projectId, "files"] });
      toast({ title: "File removed" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        const response = await uploadFile(f);
        if (response) {
          await fetch(`/api/portal/${token}/projects/${projectId}/files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              objectPath: response.objectPath,
              fileName: f.name,
              fileSize: response.metadata.size,
              contentType: response.metadata.contentType,
            }),
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/portal", token, "projects", projectId, "files"] });
      toast({ title: "Files uploaded", description: `${fileList.length} file${fileList.length > 1 ? "s" : ""} uploaded successfully.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const fileIcon = (contentType: string | null) => {
    if (contentType?.startsWith("image/")) return <ImageIcon className="w-4 h-4 text-blue-500" />;
    return <File className="w-4 h-4 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="mt-4 pt-4 border-t" data-testid={`portal-client-files-${projectId}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" />
          Your Files {files && files.length > 0 ? `(${files.length})` : ""}
        </p>
        <div>
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id={`client-file-upload-${projectId}`}
            data-testid={`input-client-file-upload-${projectId}`}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(`client-file-upload-${projectId}`)?.click()}
            disabled={uploading}
            data-testid={`button-upload-client-file-${projectId}`}
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
            {uploading ? "Uploading..." : "Upload Files"}
          </Button>
        </div>
      </div>
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      )}
      {files && files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-md border bg-muted/30" data-testid={`client-file-${f.id}`}>
              {fileIcon(f.contentType)}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{f.fileName}</p>
                <p className="text-[10px] text-muted-foreground">{formatFileSize(f.fileSize)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {f.contentType?.startsWith("image/") && (
                  <a href={f.objectPath} target="_blank" rel="noreferrer">
                    <Button size="icon" variant="ghost" data-testid={`button-view-file-${f.id}`}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                )}
                <a href={f.objectPath} download={f.fileName}>
                  <Button size="icon" variant="ghost" data-testid={`button-download-file-${f.id}`}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </a>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(f.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-file-${f.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {files && files.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground text-center py-3">Upload logos, brand assets, or documents for this project.</p>
      )}
    </div>
  );
}

function PortalScreenshots({ token, projectId }: { token: string; projectId: string }) {
  const [viewingScreenshot, setViewingScreenshot] = useState<ProjectScreenshot | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: screenshots, isLoading } = useQuery<ProjectScreenshot[]>({
    queryKey: ["/api/portal", token, "projects", projectId, "screenshots"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${token}/projects/${projectId}/screenshots`);
      if (!res.ok) throw new Error("Failed to fetch screenshots");
      return res.json();
    },
    enabled: !!token && !!projectId,
  });

  const approveMutation = useMutation({
    mutationFn: async (screenshotId: string) => {
      const res = await fetch(`/api/portal/${token}/screenshots/${screenshotId}/approve`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal", token, "projects", projectId, "screenshots"] });
      toast({ title: "Approved", description: "Deliverable has been approved." });
      setViewingScreenshot(null);
    },
  });

  const revisionMutation = useMutation({
    mutationFn: async ({ screenshotId, notes }: { screenshotId: string; notes: string }) => {
      const res = await fetch(`/api/portal/${token}/screenshots/${screenshotId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to request revisions");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal", token, "projects", projectId, "screenshots"] });
      toast({ title: "Revisions Requested", description: "We'll review your feedback." });
      setRevisionNotes("");
      setShowRevisionInput(null);
      setViewingScreenshot(null);
    },
  });

  const approvalBadge = (ss: ProjectScreenshot) => {
    if (!ss.approvalStatus) return null;
    if (ss.approvalStatus === "pending") return <Badge variant="secondary" className="text-[10px]">Needs Approval</Badge>;
    if (ss.approvalStatus === "approved") return <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Approved</Badge>;
    if (ss.approvalStatus === "revisions") return <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Revisions Requested</Badge>;
    return null;
  };

  if (isLoading) {
    return (
      <div className="mt-4 pt-4 border-t">
        <Skeleton className="h-4 w-24 mb-2" />
        <div className="flex gap-2">
          <Skeleton className="w-20 h-20 rounded-md" />
          <Skeleton className="w-20 h-20 rounded-md" />
        </div>
      </div>
    );
  }

  if (!screenshots || screenshots.length === 0) return null;

  const needsApproval = screenshots.filter(s => s.approvalStatus === "pending");

  return (
    <>
      <div className="mt-4 pt-4 border-t" data-testid={`portal-screenshots-${projectId}`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            Screenshots ({screenshots.length})
          </p>
          {needsApproval.length > 0 && (
            <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" data-testid={`badge-needs-approval-${projectId}`}>
              {needsApproval.length} awaiting approval
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {screenshots.map((ss) => (
            <div
              key={ss.id}
              className="group relative rounded-md overflow-hidden border cursor-pointer"
              onClick={() => setViewingScreenshot(ss)}
              data-testid={`portal-screenshot-${ss.id}`}
            >
              <div className="aspect-square relative">
                <img
                  src={ss.objectPath}
                  alt={ss.fileName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                {ss.approvalStatus === "pending" && (
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-white" />
                )}
                {ss.approvalStatus === "approved" && (
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground truncate px-1.5 py-1 border-t" title={ss.fileName} data-testid={`text-portal-screenshot-name-${ss.id}`}>
                {ss.fileName}
              </p>
            </div>
          ))}
        </div>
      </div>

      {viewingScreenshot && (
        <Dialog open={!!viewingScreenshot} onOpenChange={() => { setViewingScreenshot(null); setShowRevisionInput(null); setRevisionNotes(""); }}>
          <DialogContent className="max-w-3xl p-2">
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-sm" data-testid="text-lightbox-name">{viewingScreenshot.fileName}</DialogTitle>
                {approvalBadge(viewingScreenshot)}
              </div>
            </DialogHeader>
            <img
              src={viewingScreenshot.objectPath}
              alt={viewingScreenshot.fileName}
              className="w-full h-auto rounded-md"
            />
            {viewingScreenshot.approvalStatus === "revisions" && viewingScreenshot.revisionNotes && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-sm">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Your revision notes:</p>
                <p className="text-xs text-muted-foreground">{viewingScreenshot.revisionNotes}</p>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex gap-2 flex-wrap">
                {viewingScreenshot.approvalStatus === "pending" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(viewingScreenshot.id)}
                      disabled={approveMutation.isPending}
                      className="bg-emerald-600 text-white border-0"
                      data-testid={`button-approve-${viewingScreenshot.id}`}
                    >
                      {approveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRevisionInput(viewingScreenshot.id)}
                      data-testid={`button-request-revisions-${viewingScreenshot.id}`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Request Revisions
                    </Button>
                  </>
                )}
              </div>
              <a href={viewingScreenshot.objectPath} download>
                <Button size="sm" variant="outline" data-testid="button-download-screenshot">
                  <Download className="w-4 h-4 mr-1.5" />
                  Download
                </Button>
              </a>
            </div>
            {showRevisionInput === viewingScreenshot.id && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs">What changes would you like?</Label>
                <Textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Describe the changes you'd like..."
                  className="text-sm"
                  data-testid="input-revision-notes"
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => { setShowRevisionInput(null); setRevisionNotes(""); }}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={() => revisionMutation.mutate({ screenshotId: viewingScreenshot.id, notes: revisionNotes })}
                    disabled={!revisionNotes.trim() || revisionMutation.isPending}
                    data-testid="button-submit-revisions"
                  >
                    {revisionMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                    Send Feedback
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

type PortalTab = "dashboard" | "invoices" | "projects" | "billing" | "support";

interface PortalNotification {
  id: string;
  customerId: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

function RecentActivityFeed({ token }: { token: string }) {
  const { data } = useQuery<{ notifications: PortalNotification[]; unreadCount: number }>({
    queryKey: ["/api/portal", token, "notifications"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${token}/notifications`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 30000,
  });

  const recent = (data?.notifications || []).slice(0, 5);

  const typeIcon = (type: string) => {
    switch (type) {
      case "project_update": return <FolderOpen className="w-3.5 h-3.5 text-blue-500" />;
      case "invoice_created": return <Receipt className="w-3.5 h-3.5 text-emerald-500" />;
      case "ticket_reply": return <MessageSquare className="w-3.5 h-3.5 text-purple-500" />;
      case "screenshot_uploaded": return <ImageIcon className="w-3.5 h-3.5 text-amber-500" />;
      case "payment_plan_created": return <CalendarClock className="w-3.5 h-3.5 text-indigo-500" />;
      default: return <Bell className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (recent.length === 0) return null;

  return (
    <div data-testid="section-recent-activity">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recent Activity</h3>
      <Card className="divide-y">
        {recent.map(n => (
          <div key={n.id} className="flex items-start gap-3 p-3.5" data-testid={`activity-item-${n.id}`}>
            <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{n.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>
            </div>
            {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />}
          </div>
        ))}
      </Card>
    </div>
  );
}

function PushNotificationToggle({ token }: { token: string }) {
  const { toast } = useToast();
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setPushSupported(true);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushEnabled(!!sub);
        });
      });
    }
  }, []);

  const subscribePush = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const keyRes = await fetch("/api/push/vapid-key");
      const { publicKey } = await keyRes.json();
      if (!publicKey) throw new Error("Push not configured");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      const subJson = sub.toJSON();
      await apiRequest("POST", `/api/portal/${token}/push/subscribe`, {
        endpoint: subJson.endpoint,
        keys: { p256dh: subJson.keys?.p256dh, auth: subJson.keys?.auth },
      });

      setPushEnabled(true);
      setDialogOpen(false);
      toast({ title: "Notifications enabled", description: "You'll now receive push notifications for updates." });
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast({ title: "Notifications blocked", description: "Please enable notifications in your browser settings.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Could not enable push notifications.", variant: "destructive" });
      }
    }
    setLoading(false);
  };

  const unsubscribePush = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiRequest("POST", `/api/portal/${token}/push/unsubscribe`, { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setPushEnabled(false);
      setDialogOpen(false);
      toast({ title: "Notifications disabled", description: "You won't receive push notifications anymore." });
    } catch {
      toast({ title: "Error", description: "Could not disable push notifications.", variant: "destructive" });
    }
    setLoading(false);
  };

  if (!pushSupported) return null;

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setDialogOpen(true)}
        disabled={loading}
        className={`relative bg-white/[0.08] text-white/80 ${pushEnabled ? "text-emerald-400" : ""}`}
        title={pushEnabled ? "Manage push notifications" : "Enable push notifications"}
        data-testid="button-push-toggle"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : pushEnabled ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#1a1a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {pushEnabled ? <BellRing className="w-5 h-5 text-emerald-400" /> : <BellOff className="w-5 h-5 text-white/60" />}
              Push Notifications
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-md bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 p-4 -mt-1">
            <p className="text-sm font-medium text-white/90 text-center">
              Allow <span className="text-blue-400 font-semibold">AI Powered Sites</span> to send you notifications
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {pushEnabled ? (
              <>
                <div className="flex items-center gap-3 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-sm text-emerald-300">Push notifications are currently enabled</p>
                </div>
                <p className="text-sm text-white/60">
                  You're receiving instant alerts on this device for new invoices, project updates, support replies, and more.
                </p>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-white/10 text-white/80"
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-push-keep"
                  >
                    Keep Enabled
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 text-red-400"
                    onClick={unsubscribePush}
                    disabled={loading}
                    data-testid="button-push-disable"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Turn Off
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-white/70">
                  Stay in the loop with instant notifications delivered right to your device. You'll be alerted about:
                </p>
                <div className="space-y-2.5">
                  {[
                    { icon: Receipt, label: "New invoices & payment confirmations" },
                    { icon: FolderOpen, label: "Project milestones & updates" },
                    { icon: MessageSquare, label: "Support ticket replies" },
                    { icon: ImageIcon, label: "New screenshots & deliverables" },
                    { icon: Wallet, label: "Payment plan updates" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 text-sm text-white/80">
                      <div className="w-8 h-8 rounded-md bg-white/[0.06] flex items-center justify-center shrink-0">
                        <item.icon className="w-4 h-4 text-blue-400" />
                      </div>
                      {item.label}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-white/40 pt-1">
                  Your browser will ask for permission. You can turn this off anytime.
                </p>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    className="flex-1 text-white/60"
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-push-cancel"
                  >
                    Not Now
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 text-white"
                    onClick={subscribePush}
                    disabled={loading}
                    data-testid="button-push-enable"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BellRing className="w-4 h-4 mr-2" />}
                    Enable Notifications
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PushPromptBanner({ token }: { token: string }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const storageKey = `push-banner-dismissed-${token}`;

  useEffect(() => {
    if (sessionStorage.getItem(storageKey)) {
      setDismissed(true);
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          setTimeout(() => setVisible(true), 1500);
          return;
        }
        const sub = await registration.pushManager.getSubscription();
        if (!sub) {
          setTimeout(() => setVisible(true), 1500);
        }
      } catch {
        setTimeout(() => setVisible(true), 1500);
      }
    };
    checkSubscription();
  }, [storageKey]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    sessionStorage.setItem(storageKey, "1");
  };

  const handleEnable = () => {
    handleDismiss();
    const btn = document.querySelector('[data-testid="button-push-toggle"]') as HTMLButtonElement | null;
    if (btn) btn.click();
  };

  if (dismissed || !visible) return null;

  return (
    <div
      className="mb-4 -mt-3 animate-in slide-in-from-top-2 fade-in duration-500"
      data-testid="push-prompt-banner"
    >
      <div className="relative rounded-md bg-gradient-to-r from-blue-600/90 to-purple-600/90 p-4 flex items-center gap-4 flex-wrap shadow-lg">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-md bg-white/15 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              Never miss an update
            </p>
            <p className="text-xs text-white/70 mt-0.5">
              Get instant alerts for invoices, project milestones, and deliverables right on your device.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/70"
            onClick={handleDismiss}
            data-testid="button-banner-dismiss"
          >
            Not Now
          </Button>
          <Button
            size="sm"
            className="bg-white text-slate-900 font-medium"
            onClick={handleEnable}
            data-testid="button-banner-enable"
          >
            <BellRing className="w-3.5 h-3.5 mr-1.5" />
            Enable Notifications
          </Button>
        </div>
      </div>
    </div>
  );
}

function NotificationBell({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const { data, refetch } = useQuery<{ notifications: PortalNotification[]; unreadCount: number }>({
    queryKey: ["/api/portal", token, "notifications"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${token}/notifications`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/portal/${token}/notifications/${id}/read`);
    },
    onSuccess: () => refetch(),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/portal/${token}/notifications/read-all`);
    },
    onSuccess: () => refetch(),
  });

  const unread = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  const typeIcon = (type: string) => {
    switch (type) {
      case "project_update": return <FolderOpen className="w-4 h-4 text-blue-400" />;
      case "invoice_created": return <Receipt className="w-4 h-4 text-emerald-400" />;
      case "ticket_reply": return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case "screenshot_uploaded": return <ImageIcon className="w-4 h-4 text-amber-400" />;
      case "payment_plan_created": return <CalendarClock className="w-4 h-4 text-indigo-400" />;
      default: return <Bell className="w-4 h-4 text-white/60" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setOpen(!open)}
        className="relative bg-white/[0.08] text-white/80"
        data-testid="button-notification-bell"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center" data-testid="text-notification-badge">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50 bg-popover border rounded-md shadow-xl overflow-hidden" data-testid="notification-dropdown">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-muted/50">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unread > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => markAllReadMutation.mutate()}
                  data-testid="button-mark-all-read"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground" data-testid="text-no-notifications">
                  No notifications yet
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-colors ${
                      n.isRead ? "opacity-60" : "bg-accent/30"
                    }`}
                    onClick={() => {
                      if (!n.isRead) markReadMutation.mutate(n.id);
                      setOpen(false);
                    }}
                    data-testid={`notification-item-${n.id}`}
                  >
                    <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ClientPortal() {
  const params = useParams<{ token: string }>();
  const { toast } = useToast();
  const searchString = useSearch();
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [activeTab, setActiveTab] = useState<PortalTab>("dashboard");

  useEffect(() => {
    const urlParams = new URLSearchParams(searchString);
    const payment = urlParams.get("payment");
    const invoiceNum = urlParams.get("invoice");
    const paymentPlan = urlParams.get("payment_plan");
    if (payment === "success" && invoiceNum) {
      toast({ title: "Payment Successful", description: `Invoice ${invoiceNum} has been paid. Thank you!` });
      queryClient.invalidateQueries({ queryKey: [`/api/portal/${params.token}`] });
    } else if (payment === "cancelled") {
      toast({ title: "Payment Cancelled", description: "Your payment was not processed.", variant: "destructive" });
    }
    if (paymentPlan === "accepted") {
      toast({ title: "Payment Plan Started", description: "Your payment plan is now active. Payments will be collected automatically." });
      queryClient.invalidateQueries({ queryKey: ["/api/portal", params.token, "payment-plans"] });
    } else if (paymentPlan === "cancelled") {
      toast({ title: "Plan Not Started", description: "You can accept the payment plan at any time.", variant: "destructive" });
    }
  }, [searchString]);

  const payInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      setPayingInvoiceId(invoiceId);
      const res = await apiRequest("POST", `/api/portal/${params.token}/invoices/${invoiceId}/pay`);
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      setPayingInvoiceId(null);
      toast({ title: "Payment Error", description: err.message || "Could not start payment process.", variant: "destructive" });
    },
  });
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newPriority, setNewPriority] = useState("medium");
  const [viewingTicketId, setViewingTicketId] = useState<string | null>(null);
  const [ticketReply, setTicketReply] = useState("");

  const [acceptingPlanId, setAcceptingPlanId] = useState<string | null>(null);

  const portalApiPath = `/api/portal/${params.token}`;
  const { data, isLoading, error } = useQuery<PortalData>({
    queryKey: [portalApiPath],
    enabled: !!params.token,
  });

  const { data: paymentPlansData } = useQuery<PaymentPlan[]>({
    queryKey: ["/api/portal", params.token, "payment-plans"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${params.token}/payment-plans`);
      if (!res.ok) throw new Error("Failed to load payment plans");
      return res.json();
    },
    enabled: !!params.token,
  });

  const acceptPlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      setAcceptingPlanId(planId);
      const res = await apiRequest("POST", `/api/portal/${params.token}/payment-plans/${planId}/accept`);
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      setAcceptingPlanId(null);
      toast({ title: "Error", description: err.message || "Could not start payment plan.", variant: "destructive" });
    },
  });

  const { data: tickets } = useQuery<SupportTicket[]>({
    queryKey: ["/api/portal", params.token, "tickets"],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${params.token}/tickets`);
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
    enabled: !!params.token,
  });

  const { data: ticketDetail } = useQuery<SupportTicket & { messages: TicketMessage[] }>({
    queryKey: ["/api/portal", params.token, "tickets", viewingTicketId],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${params.token}/tickets/${viewingTicketId}`);
      if (!res.ok) throw new Error("Failed to fetch ticket");
      return res.json();
    },
    enabled: !!viewingTicketId && !!params.token,
  });

  const profileMutation = useMutation({
    mutationFn: async (updates: { name: string; email: string; company: string; phone: string }) => {
      const res = await apiRequest("PATCH", `/api/portal/${params.token}/profile`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portalApiPath] });
      toast({ title: "Profile updated", description: "Your contact details have been saved." });
      setEditingProfile(false);
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message || "Could not update your details.", variant: "destructive" });
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string; category: string; priority: string }) => {
      const res = await apiRequest("POST", `/api/portal/${params.token}/tickets`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal", params.token, "tickets"] });
      toast({ title: "Ticket created", description: "Your support ticket has been submitted." });
      setNewTicketOpen(false);
      setNewSubject("");
      setNewMessage("");
      setNewCategory("general");
      setNewPriority("medium");
    },
    onError: (err: any) => {
      toast({ title: "Failed to create ticket", description: err.message, variant: "destructive" });
    },
  });

  const replyTicketMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const res = await apiRequest("POST", `/api/portal/${params.token}/tickets/${ticketId}/messages`, { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal", params.token, "tickets", viewingTicketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal", params.token, "tickets"] });
      toast({ title: "Reply sent" });
      setTicketReply("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to send reply", description: err.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/portal/${params.token}/delete-account`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account deleted", description: "Your account and all associated data have been removed." });
      setShowDeleteDialog(false);
      window.location.href = "/";
    },
    onError: (err: any) => {
      toast({ title: "Cannot delete account", description: err.message || "Failed to delete account.", variant: "destructive" });
    },
  });

  if (isLoading) return <PortalSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <Card className="p-10 text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <FileText className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Link Not Found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This portal link is invalid or has expired. Please contact your service provider for a new link.
          </p>
        </Card>
      </div>
    );
  }

  const { customer, invoices: customerInvoices, projects } = data;

  const totalOwed = customerInvoices
    .filter(inv => inv.status === "pending" || inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.totalAmountCents, 0);

  const totalPaid = customerInvoices
    .filter(inv => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.totalAmountCents, 0);

  const overdueCount = customerInvoices.filter(inv => inv.status === "overdue").length;
  const activeTicketCount = (tickets || []).filter(t => t.status === "open" || t.status === "in_progress").length;
  const activePaymentPlans = (paymentPlansData || []).filter(p => p.status !== "cancelled" && p.status !== "completed");

  const tabs: { id: PortalTab; label: string; icon: typeof LayoutDashboard; count?: number }[] = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "invoices", label: "Invoices", icon: Receipt, count: customerInvoices.filter(i => i.status === "pending" || i.status === "overdue").length },
    { id: "projects", label: "Projects", icon: FolderOpen, count: projects.filter(p => p.status === "active" || p.status === "in_progress").length },
    { id: "billing", label: "Billing", icon: Wallet },
    { id: "support", label: "Support", icon: LifeBuoy, count: activeTicketCount },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)]" />
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-16 relative">
          <div className="flex items-center gap-4 mb-6">
            <img src={logoImg} alt="AI Powered Sites" className="w-11 h-11 rounded-md object-cover shrink-0 ring-2 ring-white/20" />
            <div className="flex-1">
              <p className="text-xs text-white/50 uppercase tracking-wider font-medium">Client Portal</p>
              <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-portal-title">
                {customer.company || customer.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <PushNotificationToggle token={params.token!} />
              <NotificationBell token={params.token!} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-md p-4 border border-white/[0.08]">
              <p className="text-xs text-white/50 mb-1">Amount Due</p>
              <p className="text-xl font-semibold" data-testid="text-portal-amount-due">
                {formatCurrency(totalOwed)}
              </p>
              {overdueCount > 0 && (
                <p className="text-xs text-red-300 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {overdueCount} overdue
                </p>
              )}
            </div>
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-md p-4 border border-white/[0.08]">
              <p className="text-xs text-white/50 mb-1">Total Paid</p>
              <p className="text-xl font-semibold" data-testid="text-portal-total-paid">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-md p-4 border border-white/[0.08]">
              <p className="text-xs text-white/50 mb-1">Invoices</p>
              <p className="text-xl font-semibold" data-testid="text-portal-invoice-count">
                {customerInvoices.length}
              </p>
            </div>
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-md p-4 border border-white/[0.08]">
              <p className="text-xs text-white/50 mb-1">Projects</p>
              <p className="text-xl font-semibold" data-testid="text-portal-project-count">
                {projects.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <PushPromptBanner token={params.token!} />
        <div className="-mt-5 mb-8">
          <Card className="p-1.5 inline-flex items-center gap-1 flex-wrap">
            {tabs.map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => { setActiveTab(tab.id); setViewingTicketId(null); }}
                data-testid={`button-tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count && tab.count > 0 ? (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 min-w-[20px] justify-center">
                    {tab.count}
                  </Badge>
                ) : null}
              </Button>
            ))}
          </Card>
        </div>

        <div className="pb-12">
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              <div data-testid="section-welcome">
                <h2 className="text-xl font-semibold mb-1">
                  Welcome back, {customer.name.split(" ")[0]}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">Here's what's happening with your projects.</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {customerInvoices.some(i => i.status === "pending" || i.status === "overdue") && (
                    <Button size="sm" onClick={() => setActiveTab("invoices")} data-testid="button-quick-pay">
                      <CreditCard className="w-4 h-4 mr-1.5" />
                      Pay Invoice
                    </Button>
                  )}
                  {projects.length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => setActiveTab("projects")} data-testid="button-quick-progress">
                      <FolderOpen className="w-4 h-4 mr-1.5" />
                      View Projects
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("support")} data-testid="button-quick-ticket">
                    <LifeBuoy className="w-4 h-4 mr-1.5" />
                    Get Help
                  </Button>
                </div>
              </div>

              {overdueCount > 0 && (
                <div className="flex items-start gap-4 p-4 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      You have {overdueCount} overdue invoice{overdueCount > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                      Please arrange payment as soon as possible to avoid additional fees.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-red-600 border-red-300 dark:text-red-400 dark:border-red-800"
                    onClick={() => setActiveTab("invoices")}
                    data-testid="button-view-overdue"
                  >
                    View Invoices
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  {activePaymentPlans.length > 0 && (
                    <div data-testid="section-payment-plans">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Active Payment Plans</h3>
                      <div className="space-y-3">
                        {activePaymentPlans.map(plan => {
                          const invoiceData = customerInvoices.find(inv => inv.id === plan.invoiceId);
                          const frequencyLabel = plan.frequency === "weekly" ? "week" : plan.frequency === "biweekly" ? "2 weeks" : "month";
                          const progressPercent = plan.numberOfInstallments > 0 ? Math.round((plan.installmentsPaid / plan.numberOfInstallments) * 100) : 0;
                          return (
                            <Card key={plan.id} className="p-5" data-testid={`card-payment-plan-${plan.id}`}>
                              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                                <div>
                                  <p className="text-sm font-semibold">
                                    {plan.numberOfInstallments} payments of {formatCurrency(plan.installmentAmountCents)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Every {frequencyLabel} {invoiceData ? `for invoice ${invoiceData.invoiceNumber}` : ""}
                                  </p>
                                </div>
                                <Badge variant="secondary" className={`text-xs ${getStatusColor(plan.status)}`}>
                                  {plan.status === "pending" ? "Ready to Start" : plan.status === "active" ? "In Progress" : plan.status}
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                                  <span>Total: {formatCurrency(plan.totalAmountCents)}</span>
                                  <span>{plan.installmentsPaid} of {plan.numberOfInstallments} paid</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-blue-500 to-violet-600 h-2 rounded-full transition-all"
                                    style={{ width: `${progressPercent}%` }}
                                    data-testid={`progress-plan-${plan.id}`}
                                  />
                                </div>
                              </div>
                              {plan.status === "pending" && (
                                <div className="mt-4 pt-4 border-t">
                                  <Button
                                    className="w-full bg-gradient-to-r from-blue-500 to-violet-600 text-white border-0"
                                    onClick={() => acceptPlanMutation.mutate(plan.id)}
                                    disabled={acceptingPlanId === plan.id}
                                    data-testid={`button-accept-plan-${plan.id}`}
                                  >
                                    {acceptingPlanId === plan.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <CreditCard className="w-4 h-4 mr-2" />
                                    )}
                                    {acceptingPlanId === plan.id ? "Redirecting..." : `Accept & Start Plan`}
                                  </Button>
                                  <p className="text-xs text-muted-foreground text-center mt-2">
                                    You'll be redirected to Stripe to set up automatic payments
                                  </p>
                                </div>
                              )}
                              {plan.status === "active" && plan.startDate && (
                                <p className="text-xs text-muted-foreground mt-3">
                                  Started {formatDate(plan.startDate)} &middot; Next payment collected automatically
                                </p>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Invoices</h3>
                      {customerInvoices.length > 3 && (
                        <Button variant="ghost" size="sm" onClick={() => setActiveTab("invoices")} data-testid="button-view-all-invoices">
                          View All
                        </Button>
                      )}
                    </div>
                    {customerInvoices.length > 0 ? (
                      <div className="space-y-2">
                        {customerInvoices.slice(0, 3).map(inv => (
                          <Card key={inv.id} className="hover-elevate cursor-pointer" onClick={() => { setActiveTab("invoices"); setExpandedInvoice(inv.id); }} data-testid={`card-dashboard-invoice-${inv.id}`}>
                            <div className="p-4 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`flex items-center justify-center w-9 h-9 rounded-md shrink-0 ${
                                  inv.status === "paid" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                  inv.status === "overdue" ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                                  "bg-muted text-muted-foreground"
                                }`}>
                                  {getStatusIcon(inv.status)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                                  <p className="text-xs text-muted-foreground">Due {formatDate(inv.dueDate)}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold">{formatCurrency(inv.totalAmountCents)}</p>
                                <Badge variant="secondary" className={`text-xs ${getStatusColor(inv.status)}`}>
                                  {inv.status}
                                </Badge>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="p-8 text-center">
                        <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No invoices yet</p>
                      </Card>
                    )}
                  </div>

                  {projects.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Projects</h3>
                        {projects.length > 2 && (
                          <Button variant="ghost" size="sm" onClick={() => setActiveTab("projects")} data-testid="button-view-all-projects">
                            View All
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {projects.slice(0, 2).map(project => (
                          <Card key={project.id} className="p-4 hover-elevate cursor-pointer" onClick={() => setActiveTab("projects")} data-testid={`card-dashboard-project-${project.id}`}>
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{project.name}</p>
                                {project.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>}
                              </div>
                              <Badge variant="secondary" className={`text-xs ${getStatusColor(project.status)}`}>
                                {project.status}
                              </Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  <RecentActivityFeed token={params.token!} />

                  <div data-testid="card-portal-profile">
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Account</h3>
                      {!editingProfile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditName(customer.name);
                            setEditEmail(customer.email);
                            setEditCompany(customer.company || "");
                            setEditPhone(customer.phone || "");
                            setEditingProfile(true);
                          }}
                          data-testid="button-edit-profile"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                    {editingProfile ? (
                      <Card className="p-5">
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="portal-name" className="text-xs font-medium">Full Name</Label>
                            <Input id="portal-name" value={editName} onChange={(e) => setEditName(e.target.value)} data-testid="input-portal-name" />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="portal-company" className="text-xs font-medium">Company</Label>
                            <Input id="portal-company" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="(optional)" data-testid="input-portal-company" />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="portal-email" className="text-xs font-medium">Email</Label>
                            <Input id="portal-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} data-testid="input-portal-email" />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="portal-phone" className="text-xs font-medium">Phone</Label>
                            <Input id="portal-phone" type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="(optional)" data-testid="input-portal-phone" />
                          </div>
                          <div className="flex items-center gap-2 pt-3 border-t">
                            <Button
                              size="sm"
                              onClick={() => profileMutation.mutate({ name: editName, email: editEmail, company: editCompany, phone: editPhone })}
                              disabled={profileMutation.isPending || !editEmail.trim() || !editName.trim()}
                              data-testid="button-save-profile"
                            >
                              {profileMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                              Save
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingProfile(false)} data-testid="button-cancel-edit">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <Card className="p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-lg font-semibold shrink-0">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate" data-testid="text-portal-name">{customer.name}</p>
                            {customer.company && <p className="text-xs text-muted-foreground" data-testid="text-portal-company">{customer.company}</p>}
                          </div>
                        </div>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate" data-testid="text-portal-email">{customer.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span data-testid="text-portal-phone">{customer.phone || "Not provided"}</span>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Need to remove your data? You can request permanent deletion of your account.
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-destructive"
                          onClick={() => { setDeleteConfirmText(""); setShowDeleteDialog(true); }}
                          data-testid="button-request-delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Request Data Deletion
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "invoices" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">Invoices</h2>
                <p className="text-sm text-muted-foreground">{customerInvoices.length} total invoice{customerInvoices.length !== 1 ? "s" : ""}</p>
              </div>
              {customerInvoices.length > 0 ? (
                <div className="space-y-3">
                  {customerInvoices.map(inv => {
                    const isExpanded = expandedInvoice === inv.id;
                    return (
                      <Card key={inv.id} className="overflow-hidden" data-testid={`card-portal-invoice-${inv.id}`}>
                        <button
                          onClick={() => setExpandedInvoice(isExpanded ? null : inv.id)}
                          className="w-full p-5 text-left flex items-center justify-between gap-3 hover-elevate"
                          data-testid={`button-expand-invoice-${inv.id}`}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-md shrink-0 ${
                              inv.status === "paid" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                              inv.status === "overdue" ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {getStatusIcon(inv.status)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{inv.invoiceNumber}</p>
                              <p className="text-xs text-muted-foreground">
                                Issued {formatDate(inv.issuedAt)} &middot; Due {formatDate(inv.dueDate)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className="text-base font-semibold">{formatCurrency(inv.totalAmountCents)}</p>
                              <Badge variant="secondary" className={`text-xs ${getStatusColor(inv.status)}`}>
                                {inv.status}
                              </Badge>
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t px-5 pb-5">
                            {inv.lineItems && inv.lineItems.length > 0 && (
                              <div className="mt-4">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-2.5 text-xs font-medium text-muted-foreground">Item</th>
                                      <th className="text-right py-2.5 text-xs font-medium text-muted-foreground">Qty</th>
                                      <th className="text-right py-2.5 text-xs font-medium text-muted-foreground">Rate</th>
                                      <th className="text-right py-2.5 text-xs font-medium text-muted-foreground">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {inv.lineItems.map((item) => (
                                      <tr key={item.id} className="border-b last:border-b-0">
                                        <td className="py-2.5 pr-3">{item.description}</td>
                                        <td className="py-2.5 text-right text-muted-foreground">{Number(item.quantity)}</td>
                                        <td className="py-2.5 text-right text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                                        <td className="py-2.5 text-right font-medium">{formatCurrency(item.totalCents)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            <div className="flex justify-between gap-3 text-sm pt-4 border-t mt-4 font-semibold">
                              <span>Total</span>
                              <span>{formatCurrency(inv.totalAmountCents)}</span>
                            </div>
                            <div className="flex gap-3 pt-4 mt-4 border-t flex-wrap">
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const link = document.createElement("a");
                                  link.href = `/api/portal/${params.token}/invoices/${inv.id}/pdf`;
                                  link.download = `${inv.invoiceNumber}.pdf`;
                                  link.click();
                                }}
                                data-testid={`button-download-pdf-${inv.id}`}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download PDF
                              </Button>
                              {inv.status !== "paid" && inv.status !== "draft" && (
                                <Button
                                  className="bg-gradient-to-r from-blue-500 to-violet-600 text-white border-0 flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    payInvoice.mutate(inv.id);
                                  }}
                                  disabled={payingInvoiceId === inv.id}
                                  data-testid={`button-pay-invoice-${inv.id}`}
                                >
                                  {payingInvoiceId === inv.id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <CreditCard className="w-4 h-4 mr-2" />
                                  )}
                                  {payingInvoiceId === inv.id ? "Redirecting..." : `Pay ${formatCurrency(inv.totalAmountCents)}`}
                                </Button>
                              )}
                            </div>
                            {inv.status === "paid" && (
                              <div className="pt-4 mt-4 border-t flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">Paid in full</span>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
                    <Receipt className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium mb-1">No invoices yet</p>
                  <p className="text-xs text-muted-foreground">Invoices will appear here once your project work begins.</p>
                </Card>
              )}
            </div>
          )}

          {activeTab === "projects" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">Projects</h2>
                <p className="text-sm text-muted-foreground">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
              </div>
              {projects.length > 0 ? (
                <div className="space-y-4">
                  {projects.map(project => (
                    <Card key={project.id} className="p-5" data-testid={`card-portal-project-${project.id}`}>
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{project.name}</p>
                          {project.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">{project.description}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className={`text-xs ${getStatusColor(project.status)}`}>
                          {project.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <a
                          href={`/progress/${project.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`link-portal-progress-${project.id}`}
                        >
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                            View Progress
                          </Button>
                        </a>
                        {project.previewUrl && (
                          <a
                            href={project.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`link-portal-preview-${project.id}`}
                          >
                            <Button variant="outline" size="sm">
                              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                              View Site Preview
                            </Button>
                          </a>
                        )}
                      </div>
                      <PortalScreenshots token={params.token!} projectId={project.id} />
                      <PortalClientFiles token={params.token!} projectId={project.id} />
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
                    <FolderOpen className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium mb-1">No projects yet</p>
                  <p className="text-xs text-muted-foreground">Your projects will appear here once they're created.</p>
                </Card>
              )}
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-1">Billing & Payments</h2>
                <p className="text-sm text-muted-foreground">Manage your payment methods and view payment plans</p>
              </div>

              <PaymentMethodsSection token={params.token!} />

              {activePaymentPlans.length > 0 && (
                <div data-testid="section-billing-payment-plans">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Payment Plans</h3>
                  <div className="space-y-3">
                    {activePaymentPlans.map(plan => {
                      const invoiceData = customerInvoices.find(inv => inv.id === plan.invoiceId);
                      const frequencyLabel = plan.frequency === "weekly" ? "week" : plan.frequency === "biweekly" ? "2 weeks" : "month";
                      const progressPercent = plan.numberOfInstallments > 0 ? Math.round((plan.installmentsPaid / plan.numberOfInstallments) * 100) : 0;
                      return (
                        <Card key={plan.id} className="p-5" data-testid={`card-billing-plan-${plan.id}`}>
                          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                            <div>
                              <p className="text-sm font-semibold">
                                {plan.numberOfInstallments} payments of {formatCurrency(plan.installmentAmountCents)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Every {frequencyLabel} {invoiceData ? `for ${invoiceData.invoiceNumber}` : ""}
                              </p>
                            </div>
                            <Badge variant="secondary" className={`text-xs ${getStatusColor(plan.status)}`}>
                              {plan.status === "pending" ? "Ready to Start" : plan.status === "active" ? "In Progress" : plan.status}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                              <span>Total: {formatCurrency(plan.totalAmountCents)}</span>
                              <span>{plan.installmentsPaid} of {plan.numberOfInstallments} paid</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div className="bg-gradient-to-r from-blue-500 to-violet-600 h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                            </div>
                          </div>
                          {plan.status === "pending" && (
                            <div className="mt-4 pt-4 border-t">
                              <Button
                                className="w-full bg-gradient-to-r from-blue-500 to-violet-600 text-white border-0"
                                onClick={() => acceptPlanMutation.mutate(plan.id)}
                                disabled={acceptingPlanId === plan.id}
                                data-testid={`button-billing-accept-plan-${plan.id}`}
                              >
                                {acceptingPlanId === plan.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                                {acceptingPlanId === plan.id ? "Redirecting..." : "Accept & Start Plan"}
                              </Button>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {(() => {
                const paidInvoices = customerInvoices.filter(inv => inv.status === "paid");
                if (paidInvoices.length === 0) return null;
                const totalPaidAmount = paidInvoices.reduce((sum, inv) => sum + inv.totalAmountCents, 0);
                return (
                  <div data-testid="section-payment-history">
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Payment History</h3>
                      <span className="text-xs text-muted-foreground">{paidInvoices.length} payment{paidInvoices.length !== 1 ? "s" : ""} totaling {formatCurrency(totalPaidAmount)}</span>
                    </div>
                    <Card className="divide-y">
                      {paidInvoices.map(inv => (
                        <div key={inv.id} className="flex items-center gap-4 p-4" data-testid={`payment-history-${inv.id}`}>
                          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-emerald-500/10 shrink-0">
                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              Paid {formatDate(inv.dueDate)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.totalAmountCents)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = `/api/portal/${params.token}/invoices/${inv.id}/pdf`;
                              link.download = `${inv.invoiceNumber}.pdf`;
                              link.click();
                            }}
                            data-testid={`button-download-receipt-${inv.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </Card>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === "support" && (
            <>
              {viewingTicketId && ticketDetail ? (
                <div className="space-y-5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingTicketId(null)}
                    data-testid="button-back-tickets"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    All tickets
                  </Button>

                  <Card className="overflow-hidden">
                    <div className="p-6 border-b bg-muted/30">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1.5">
                          <h2 className="text-lg font-semibold leading-tight" data-testid="text-ticket-subject">{ticketDetail.subject}</h2>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span className="font-mono">{ticketDetail.ticketNumber}</span>
                            <span className="opacity-30">|</span>
                            <span className="capitalize">{ticketDetail.category}</span>
                            <span className="opacity-30">|</span>
                            <span>{formatDate(ticketDetail.createdAt)}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className={`text-xs border ${
                          ticketDetail.status === "open" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" :
                          ticketDetail.status === "in_progress" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
                          ticketDetail.status === "resolved" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                          "bg-muted border-muted"
                        }`}>
                          {ticketDetail.status === "open" && <CircleDot className="w-3 h-3 mr-1" />}
                          {ticketDetail.status === "in_progress" && <Clock className="w-3 h-3 mr-1" />}
                          {ticketDetail.status === "resolved" && <CheckCircle className="w-3 h-3 mr-1" />}
                          {ticketDetail.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>

                    <div className="divide-y">
                      {ticketDetail.messages.map((msg) => {
                        const isStaff = msg.senderType === "admin";
                        return (
                          <div
                            key={msg.id}
                            className={`p-5 ${isStaff ? "bg-primary/[0.03] dark:bg-primary/[0.06]" : ""}`}
                            data-testid={`message-${msg.id}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                                isStaff
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-gradient-to-br from-blue-500 to-violet-500 text-white"
                              }`}>
                                {msg.senderName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="text-sm font-semibold">{msg.senderName}</span>
                                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${isStaff ? "bg-primary/10 text-primary border-primary/20" : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"} border`}>
                                    {isStaff ? "Support Team" : "You"}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground ml-auto shrink-0">{formatDate(msg.createdAt)}</span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{msg.message}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {ticketDetail.status !== "closed" && (
                      <div className="border-t">
                        <div className="p-5 space-y-3">
                          <Textarea
                            placeholder="Write your reply..."
                            value={ticketReply}
                            onChange={e => setTicketReply(e.target.value)}
                            className="resize-none min-h-[100px] text-sm"
                            data-testid="textarea-portal-reply"
                          />
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Mail className="w-3 h-3" />
                              Our team will be notified
                            </p>
                            <Button
                              onClick={() => replyTicketMutation.mutate({ ticketId: viewingTicketId, message: ticketReply })}
                              disabled={!ticketReply.trim() || replyTicketMutation.isPending}
                              data-testid="button-portal-send-reply"
                            >
                              {replyTicketMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                              Send Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {ticketDetail.status === "resolved" && (
                      <div className="border-t p-5 bg-emerald-500/5">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          <p className="text-sm font-medium">This ticket has been resolved</p>
                        </div>
                      </div>
                    )}

                    {ticketDetail.status === "closed" && (
                      <div className="border-t p-5 bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MessageSquare className="w-4 h-4 shrink-0" />
                          <p className="text-sm">This ticket is closed. Open a new ticket if you need further help.</p>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h2 className="text-xl font-semibold mb-1">Support</h2>
                      <p className="text-sm text-muted-foreground">
                        {activeTicketCount > 0
                          ? `${activeTicketCount} active ticket${activeTicketCount !== 1 ? "s" : ""}`
                          : "Get help from our team"}
                      </p>
                    </div>
                    <Button onClick={() => setNewTicketOpen(true)} data-testid="button-new-ticket">
                      <Plus className="w-4 h-4 mr-1.5" />
                      New Ticket
                    </Button>
                  </div>

                  {(tickets || []).length > 0 ? (
                    <div className="space-y-2">
                      {(tickets || []).map(ticket => {
                        const statusStyle = ticket.status === "open" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" :
                          ticket.status === "in_progress" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
                          ticket.status === "resolved" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                          "bg-muted text-muted-foreground border-muted";
                        const statusIcon = ticket.status === "open" ? <CircleDot className="w-3.5 h-3.5" /> :
                          ticket.status === "in_progress" ? <Clock className="w-3.5 h-3.5" /> :
                          ticket.status === "resolved" ? <CheckCircle className="w-3.5 h-3.5" /> :
                          <MessageSquare className="w-3.5 h-3.5" />;

                        return (
                          <Card
                            key={ticket.id}
                            className="hover-elevate cursor-pointer"
                            onClick={() => setViewingTicketId(ticket.id)}
                            data-testid={`button-portal-ticket-${ticket.id}`}
                          >
                            <div className="p-4 flex items-start gap-3.5">
                              <div className={`flex items-center justify-center w-9 h-9 rounded-full border shrink-0 ${statusStyle}`}>
                                {statusIcon}
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <p className="text-sm font-semibold truncate">{ticket.subject}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-mono">{ticket.ticketNumber}</span>
                                  <span className="opacity-30">|</span>
                                  <span>{formatDate(ticket.createdAt)}</span>
                                </div>
                              </div>
                              <Badge variant="secondary" className={`text-xs shrink-0 border ${statusStyle}`}>
                                {ticket.status.replace("_", " ")}
                              </Badge>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <Card className="p-12 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
                        <LifeBuoy className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium mb-1">No support tickets yet</p>
                      <p className="text-xs text-muted-foreground mb-4">Need help? We're here for you.</p>
                      <Button onClick={() => setNewTicketOpen(true)} data-testid="button-new-ticket-empty">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Create Your First Ticket
                      </Button>
                    </Card>
                  )}
                </div>
              )}

              <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <LifeBuoy className="w-5 h-5 text-muted-foreground" />
                      How can we help?
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="ticket-subject" className="text-xs font-medium">Subject</Label>
                      <Input
                        id="ticket-subject"
                        placeholder="Brief description of your issue"
                        value={newSubject}
                        onChange={e => setNewSubject(e.target.value)}
                        data-testid="input-ticket-subject"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Category</Label>
                        <Select value={newCategory} onValueChange={setNewCategory}>
                          <SelectTrigger data-testid="select-ticket-category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="billing">Billing</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                            <SelectItem value="feature_request">Feature Request</SelectItem>
                            <SelectItem value="bug">Bug Report</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Priority</Label>
                        <Select value={newPriority} onValueChange={setNewPriority}>
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
                    <div className="space-y-1.5">
                      <Label htmlFor="ticket-message" className="text-xs font-medium">Describe your issue</Label>
                      <Textarea
                        id="ticket-message"
                        placeholder="Please provide as much detail as possible so we can help you quickly..."
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        className="resize-none min-h-[140px] text-sm"
                        data-testid="textarea-ticket-message"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button variant="ghost" onClick={() => setNewTicketOpen(false)} data-testid="button-cancel-ticket">
                        Cancel
                      </Button>
                      <Button
                        onClick={() => createTicketMutation.mutate({ subject: newSubject, message: newMessage, category: newCategory, priority: newPriority })}
                        disabled={!newSubject.trim() || !newMessage.trim() || createTicketMutation.isPending}
                        data-testid="button-submit-ticket"
                      >
                        {createTicketMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Submit Ticket
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Delete Your Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will permanently delete your account and all associated data including projects, invoices, and support tickets. This action cannot be undone.
            </p>
            <p className="text-sm text-muted-foreground">
              If you have outstanding invoices, you must settle them before deleting your account.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type "DELETE" to confirm</Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                data-testid="input-delete-confirm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteDialog(false)}
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
                onClick={() => deleteAccountMutation.mutate()}
                data-testid="button-confirm-delete"
              >
                {deleteAccountMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete My Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
