import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  Globe,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Plus,
  Trash2,
  Search,
  Building2,
  MapPin,
  Star,
  Zap,
  Filter,
  Download,
  Upload,
  Loader2,
  ListChecks,
  Copy,
  Check,
} from "lucide-react";
import type { DirectorySubmission } from "@shared/schema";

const DIRECTORY_MASTER_LIST = [
  { name: "Google Business Profile", url: "https://business.google.com/", category: "Search Engines", priority: "critical" },
  { name: "Bing Places", url: "https://www.bingplaces.com/", category: "Search Engines", priority: "critical" },
  { name: "Apple Maps Connect", url: "https://mapsconnect.apple.com/", category: "Search Engines", priority: "critical" },
  { name: "Yelp", url: "https://business.yelp.com/", category: "Reviews", priority: "critical" },
  { name: "Facebook Business", url: "https://www.facebook.com/pages/create", category: "Social", priority: "critical" },
  { name: "LinkedIn Company Page", url: "https://www.linkedin.com/company/setup/new/", category: "Social", priority: "critical" },
  { name: "Instagram Business", url: "https://business.instagram.com/", category: "Social", priority: "high" },
  { name: "Better Business Bureau", url: "https://www.bbb.org/get-listed", category: "Trust & Authority", priority: "high" },
  { name: "Clutch.co", url: "https://clutch.co/get-listed", category: "Industry", priority: "high" },
  { name: "DesignRush", url: "https://www.designrush.com/agency/register", category: "Industry", priority: "high" },
  { name: "GoodFirms", url: "https://www.goodfirms.co/add-company", category: "Industry", priority: "high" },
  { name: "UpCity", url: "https://upcity.com/signup", category: "Industry", priority: "high" },
  { name: "Sortlist", url: "https://www.sortlist.com/register", category: "Industry", priority: "medium" },
  { name: "The Manifest", url: "https://themanifest.com/get-listed", category: "Industry", priority: "medium" },
  { name: "Crunchbase", url: "https://www.crunchbase.com/register", category: "Business", priority: "high" },
  { name: "AngelList / Wellfound", url: "https://wellfound.com/companies/signup", category: "Business", priority: "medium" },
  { name: "Yellow Pages (YP.com)", url: "https://www.yellowpages.com/claim-your-listing", category: "General", priority: "medium" },
  { name: "Foursquare", url: "https://business.foursquare.com/", category: "General", priority: "medium" },
  { name: "Hotfrog", url: "https://www.hotfrog.com/AddYourBusiness.aspx", category: "General", priority: "medium" },
  { name: "Manta", url: "https://www.manta.com/claim", category: "General", priority: "medium" },
  { name: "Thumbtack", url: "https://www.thumbtack.com/pro/join", category: "Services", priority: "high" },
  { name: "Bark.com", url: "https://www.bark.com/en/us/join/", category: "Services", priority: "medium" },
  { name: "Alignable", url: "https://www.alignable.com/biz/join", category: "Business", priority: "medium" },
  { name: "Chamber of Commerce", url: "https://www.chamberofcommerce.com/add-your-business", category: "Business", priority: "medium" },
  { name: "Dun & Bradstreet", url: "https://www.dnb.com/utility-pages/claim-monitor.html", category: "Trust & Authority", priority: "high" },
  { name: "Trustpilot", url: "https://business.trustpilot.com/signup", category: "Reviews", priority: "high" },
  { name: "G2", url: "https://sell.g2.com/create-a-profile", category: "Reviews", priority: "high" },
  { name: "Capterra", url: "https://www.capterra.com/vendors/sign-up", category: "Reviews", priority: "high" },
  { name: "TripAdvisor (if local)", url: "https://www.tripadvisor.com/GetListedNew", category: "General", priority: "low" },
  { name: "Nextdoor Business", url: "https://business.nextdoor.com/", category: "Local", priority: "medium" },
  { name: "MapQuest", url: "https://www.mapquest.com/my-place/add", category: "Search Engines", priority: "low" },
  { name: "Superpages", url: "https://www.superpages.com/", category: "General", priority: "low" },
  { name: "CitySearch", url: "https://www.citysearch.com/", category: "Local", priority: "low" },
  { name: "Yellowbot", url: "https://www.yellowbot.com/", category: "General", priority: "low" },
  { name: "Brownbook.net", url: "https://www.brownbook.net/", category: "General", priority: "low" },
  { name: "ShowMeLocal", url: "https://www.showmelocal.com/", category: "Local", priority: "low" },
  { name: "EZLocal", url: "https://www.ezlocal.com/", category: "Local", priority: "low" },
  { name: "Spoke.com", url: "https://www.spoke.com/", category: "Business", priority: "low" },
  { name: "Storeboard", url: "https://www.storeboard.com/", category: "Business", priority: "low" },
  { name: "n49.com", url: "https://www.n49.com/", category: "Local", priority: "low" },
  { name: "Cylex", url: "https://www.cylex.us.com/", category: "General", priority: "low" },
  { name: "iGlobal", url: "https://www.iglobal.co/", category: "General", priority: "low" },
  { name: "FindOpen", url: "https://www.findopen.com/", category: "General", priority: "low" },
  { name: "Tupalo", url: "https://www.tupalo.com/", category: "General", priority: "low" },
  { name: "Wand.com", url: "https://www.wand.com/", category: "General", priority: "low" },
  { name: "ProductHunt", url: "https://www.producthunt.com/posts/new", category: "Tech", priority: "high" },
  { name: "AlternativeTo", url: "https://alternativeto.net/submit/", category: "Tech", priority: "medium" },
  { name: "SaaSHub", url: "https://www.saashub.com/submit", category: "Tech", priority: "medium" },
  { name: "BetaList", url: "https://betalist.com/submit", category: "Tech", priority: "medium" },
  { name: "StackShare", url: "https://stackshare.io/", category: "Tech", priority: "medium" },
];

const CATEGORIES = [...new Set(DIRECTORY_MASTER_LIST.map(d => d.category))].sort();

const BUSINESS_INFO = {
  name: "AI Powered Sites",
  website: "https://aipoweredsites.com",
  email: "hello@aipoweredsites.com",
  phone: "",
  description: "AI-powered web design agency specializing in custom websites, web apps, client portals, and digital solutions built for growth. No templates. No compromises.",
  shortDescription: "Custom AI-powered websites and web apps built for business growth.",
  categories: "Web Design, Web Development, AI, Digital Agency, Software Development",
  address: "",
};

export default function DirectorySubmissions() {
  const { toast } = useToast();
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [newDir, setNewDir] = useState({ directoryName: "", directoryUrl: "", category: "General" });

  const { data: submissions = [], isLoading } = useQuery<DirectorySubmission[]>({
    queryKey: ["/api/directory-submissions"],
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/directory-submissions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/directory-submissions"] });
      toast({ title: "Directory added" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/directory-submissions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/directory-submissions"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/directory-submissions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/directory-submissions"] });
      toast({ title: "Removed" });
    },
  });

  const bulkAddMutation = useMutation({
    mutationFn: (directories: any[]) => apiRequest("POST", "/api/directory-submissions/bulk", { directories }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/directory-submissions"] });
      toast({ title: `Added ${data.created} new directories` });
    },
  });

  const handleLoadAll = () => {
    const dirs = DIRECTORY_MASTER_LIST.map(d => ({
      directoryName: d.name,
      directoryUrl: d.url,
      category: d.category,
      status: "pending",
    }));
    bulkAddMutation.mutate(dirs);
  };

  const handleMarkSubmitted = (id: string) => {
    updateMutation.mutate({ id, data: { status: "submitted", submittedAt: new Date().toISOString() } });
  };


  const handleMarkSkipped = (id: string) => {
    updateMutation.mutate({ id, data: { status: "skipped" } });
  };

  const handleAddCustom = () => {
    if (!newDir.directoryName.trim() || !newDir.directoryUrl.trim()) return;
    addMutation.mutate({ ...newDir, status: "pending" });
    setNewDir({ directoryName: "", directoryUrl: "", category: "General" });
    setAddDialogOpen(false);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const submittedNames = new Set(submissions.map(s => s.directoryName));

  const notYetAdded = DIRECTORY_MASTER_LIST.filter(d => !submittedNames.has(d.name));

  const filtered = submissions.filter(s => {
    if (filterCategory !== "all" && s.category !== filterCategory) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (searchTerm && !s.directoryName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalCount = submissions.length;
  const submittedCount = submissions.filter(s => s.status === "submitted").length;
  const pendingCount = submissions.filter(s => s.status === "pending").length;
  const skippedCount = submissions.filter(s => s.status === "skipped").length;

  const statusIcon = (status: string | null) => {
    if (status === "submitted") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status === "skipped") return <XCircle className="w-4 h-4 text-slate-400" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const statusBadge = (status: string | null) => {
    if (status === "submitted") return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Submitted</Badge>;
    if (status === "skipped") return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 text-[10px]">Skipped</Badge>;
    return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">Pending</Badge>;
  };

  const priorityBadge = (name: string) => {
    const dir = DIRECTORY_MASTER_LIST.find(d => d.name === name);
    if (!dir) return null;
    if (dir.priority === "critical") return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">Critical</Badge>;
    if (dir.priority === "high") return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px]">High</Badge>;
    if (dir.priority === "medium") return <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/20 text-[10px]">Medium</Badge>;
    return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px]">Low</Badge>;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-directory-title">
            <Globe className="w-6 h-6 text-blue-500" />
            Directory Submissions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit your business to {DIRECTORY_MASTER_LIST.length}+ directories to boost SEO and visibility.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {notYetAdded.length > 0 && (
            <Button
              onClick={handleLoadAll}
              disabled={bulkAddMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-violet-600 text-white"
              data-testid="button-load-all"
            >
              {bulkAddMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
              Load All Directories ({notYetAdded.length})
            </Button>
          )}
          <Button variant="outline" onClick={() => setAddDialogOpen(true)} data-testid="button-add-custom">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Custom
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card data-testid="stat-total">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalCount}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-submitted">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{submittedCount}</div>
              <div className="text-xs text-muted-foreground">Submitted</div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-pending">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-skipped">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{skippedCount}</div>
              <div className="text-xs text-muted-foreground">Skipped</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {totalCount > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Copy className="w-4 h-4 text-violet-500" />
              Quick Copy — Business Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.entries(BUSINESS_INFO).filter(([_, v]) => v).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => copyToClipboard(value, key)}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-card hover:bg-accent transition-colors text-left group"
                  data-testid={`button-copy-${key}`}
                >
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="text-xs truncate">{value}</div>
                  </div>
                  {copiedField === key ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search directories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-directories"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-category">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Globe className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">
              {totalCount === 0 ? "No directories loaded yet" : "No results match your filters"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {totalCount === 0
                ? `Click "Load All Directories" to import ${DIRECTORY_MASTER_LIST.length} major directories.`
                : "Try adjusting your search or filters."
              }
            </p>
            {totalCount === 0 && (
              <Button onClick={handleLoadAll} disabled={bulkAddMutation.isPending} data-testid="button-load-empty">
                <Download className="w-4 h-4 mr-1.5" />
                Load All Directories
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => (
            <Card key={sub.id} className={`transition-all ${sub.status === "submitted" ? "opacity-70" : ""}`} data-testid={`card-directory-${sub.id}`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {statusIcon(sub.status)}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm truncate">{sub.directoryName}</span>
                        {statusBadge(sub.status)}
                        {priorityBadge(sub.directoryName)}
                        <Badge variant="outline" className="text-[10px]">{sub.category}</Badge>
                      </div>
                      {sub.submittedAt && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a href={sub.directoryUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="h-8 text-xs" data-testid={`button-open-${sub.id}`}>
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Open
                      </Button>
                    </a>
                    {sub.status === "pending" && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleMarkSubmitted(sub.id)}
                          data-testid={`button-mark-submitted-${sub.id}`}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Done
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground"
                          onClick={() => handleMarkSkipped(sub.id)}
                          data-testid={`button-skip-${sub.id}`}
                        >
                          Skip
                        </Button>
                      </>
                    )}
                    {sub.status !== "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground"
                        onClick={() => updateMutation.mutate({ id: sub.id, data: { status: "pending", submittedAt: null } })}
                        data-testid={`button-reset-${sub.id}`}
                      >
                        Reset
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500"
                      onClick={() => deleteMutation.mutate(sub.id)}
                      data-testid={`button-delete-${sub.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" />
              Add Custom Directory
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Directory Name</label>
              <Input
                value={newDir.directoryName}
                onChange={(e) => setNewDir(p => ({ ...p, directoryName: e.target.value }))}
                placeholder="e.g. WebDesignDirectory.com"
                data-testid="input-custom-name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Submission URL</label>
              <Input
                value={newDir.directoryUrl}
                onChange={(e) => setNewDir(p => ({ ...p, directoryUrl: e.target.value }))}
                placeholder="https://..."
                data-testid="input-custom-url"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <Select value={newDir.category} onValueChange={(v) => setNewDir(p => ({ ...p, category: v }))}>
                <SelectTrigger data-testid="select-custom-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAddCustom}
              disabled={!newDir.directoryName.trim() || !newDir.directoryUrl.trim()}
              className="w-full"
              data-testid="button-save-custom"
            >
              Add Directory
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
