import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Trash2,
  RefreshCw,
  Star,
  ArrowUp,
  ArrowDown,
  Target,
  Zap,
  BarChart3,
  Eye,
  Loader2,
  Download,
  Filter,
  Hash,
  Globe,
  ChevronRight,
  Sparkles,
  X,
  History,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { SeoKeyword } from "@shared/schema";

const SUGGESTED_SEED_KEYWORDS = [
  "web design agency",
  "custom website development",
  "AI powered websites",
  "small business web design",
  "ecommerce website builder",
  "responsive web design",
  "wordpress development",
  "landing page design",
  "SEO services",
  "website redesign",
  "web app development",
  "UI UX design agency",
  "affordable web design",
  "local business website",
  "professional web design",
];

export default function SeoKeywords() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("research");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<SeoKeyword | null>(null);
  const [updatePositionId, setUpdatePositionId] = useState<string | null>(null);
  const [newPosition, setNewPosition] = useState("");
  const [newKeyword, setNewKeyword] = useState({ keyword: "", notes: "", tags: "" });
  const [trackerSearch, setTrackerSearch] = useState("");

  const { data: keywords = [], isLoading } = useQuery<SeoKeyword[]>({
    queryKey: ["/api/seo-keywords"],
  });

  const { data: history = [] } = useQuery<any[]>({
    queryKey: [`/api/seo-keywords/${selectedKeyword?.id}/history`],
    enabled: !!selectedKeyword?.id,
  });

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/seo-keywords/suggest/${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchSuggestions]);

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/seo-keywords", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seo-keywords"] });
      toast({ title: "Keyword added to tracker" });
    },
  });

  const bulkAddMutation = useMutation({
    mutationFn: (kws: string[]) => apiRequest("POST", "/api/seo-keywords/bulk-add", { keywords: kws }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/seo-keywords"] });
      toast({ title: `Added ${data.created} keyword${data.created !== 1 ? "s" : ""} to tracker` });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/seo-keywords/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seo-keywords"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/seo-keywords/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seo-keywords"] });
      toast({ title: "Keyword removed" });
    },
  });

  const checkRankMutation = useMutation({
    mutationFn: ({ id, position }: { id: string; position: number }) =>
      apiRequest("POST", `/api/seo-keywords/${id}/check-rank`, { position }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seo-keywords"] });
      setUpdatePositionId(null);
      setNewPosition("");
      toast({ title: "Position updated" });
    },
  });

  const handleAddKeyword = (keyword: string) => {
    addMutation.mutate({ keyword, status: "tracking" });
  };

  const handleAddCustom = () => {
    if (!newKeyword.keyword.trim()) return;
    addMutation.mutate({
      keyword: newKeyword.keyword.trim(),
      notes: newKeyword.notes || null,
      tags: newKeyword.tags || null,
      status: "tracking",
    });
    setNewKeyword({ keyword: "", notes: "", tags: "" });
    setAddDialogOpen(false);
  };

  const trackedNames = new Set(keywords.map((k) => k.keyword.toLowerCase()));

  const filtered = keywords.filter((k) => {
    if (filterStatus !== "all" && k.status !== filterStatus) return false;
    if (trackerSearch && !k.keyword.toLowerCase().includes(trackerSearch.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "position") return (a.currentPosition ?? 999) - (b.currentPosition ?? 999);
    if (sortBy === "change") return (b.positionChange ?? 0) - (a.positionChange ?? 0);
    if (sortBy === "alpha") return a.keyword.localeCompare(b.keyword);
    return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
  });

  const totalTracked = keywords.length;
  const improved = keywords.filter((k) => (k.positionChange ?? 0) > 0).length;
  const declined = keywords.filter((k) => (k.positionChange ?? 0) < 0).length;
  const top10 = keywords.filter((k) => k.currentPosition != null && k.currentPosition <= 10).length;

  const getChangeIcon = (change: number | null) => {
    if (!change || change === 0) return <Minus className="w-3.5 h-3.5 text-slate-400" />;
    if (change > 0) return <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />;
    return <ArrowDown className="w-3.5 h-3.5 text-red-500" />;
  };

  const getChangeBadge = (change: number | null) => {
    if (!change || change === 0) return <Badge variant="outline" className="text-[10px] text-slate-400">—</Badge>;
    if (change > 0)
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
          <ArrowUp className="w-3 h-3 mr-0.5" />+{change}
        </Badge>
      );
    return (
      <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">
        <ArrowDown className="w-3 h-3 mr-0.5" />{change}
      </Badge>
    );
  };

  const getPositionColor = (pos: number | null) => {
    if (pos == null) return "text-slate-400";
    if (pos <= 3) return "text-emerald-500 font-bold";
    if (pos <= 10) return "text-blue-500 font-semibold";
    if (pos <= 20) return "text-amber-500";
    if (pos <= 50) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-seo-title">
            <Target className="w-6 h-6 text-violet-500" />
            SEO Keyword Research
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover keywords, track rankings, and monitor position changes over time.
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-keyword">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Keyword
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card data-testid="stat-tracked">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalTracked}</div>
              <div className="text-xs text-muted-foreground">Tracked</div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-improved">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{improved}</div>
              <div className="text-xs text-muted-foreground">Improved</div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-declined">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{declined}</div>
              <div className="text-xs text-muted-foreground">Declined</div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-top10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{top10}</div>
              <div className="text-xs text-muted-foreground">Top 10</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="research" className="flex items-center gap-1.5" data-testid="tab-research">
            <Search className="w-3.5 h-3.5" />
            Research
          </TabsTrigger>
          <TabsTrigger value="tracker" className="flex items-center gap-1.5" data-testid="tab-tracker">
            <BarChart3 className="w-3.5 h-3.5" />
            Rank Tracker
          </TabsTrigger>
        </TabsList>

        <TabsContent value="research" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search for keyword ideas... (e.g. 'web design', 'SEO services')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                  data-testid="input-keyword-search"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {suggestions.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Google Suggestions ({suggestions.length})
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        const untracked = suggestions.filter((s) => !trackedNames.has(s.toLowerCase()));
                        if (untracked.length) bulkAddMutation.mutate(untracked);
                      }}
                      disabled={bulkAddMutation.isPending}
                      data-testid="button-track-all-suggestions"
                    >
                      {bulkAddMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                      Track All New
                    </Button>
                  </div>
                  <div className="grid gap-1.5">
                    {suggestions.map((s, i) => {
                      const isTracked = trackedNames.has(s.toLowerCase());
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                            isTracked ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card hover:bg-accent"
                          }`}
                          data-testid={`suggestion-${i}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{s}</span>
                            {isTracked && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Tracked
                              </Badge>
                            )}
                          </div>
                          {!isTracked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs shrink-0"
                              onClick={() => handleAddKeyword(s)}
                              disabled={addMutation.isPending}
                              data-testid={`button-track-${i}`}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Track
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {searchQuery.length === 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-violet-500" />
                    Suggested Seed Keywords
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_SEED_KEYWORDS.map((kw, i) => {
                      const isTracked = trackedNames.has(kw.toLowerCase());
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (!isTracked) handleAddKeyword(kw);
                            setSearchQuery(kw);
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                            isTracked
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                              : "bg-card hover:bg-accent border-border"
                          }`}
                          data-testid={`seed-${i}`}
                        >
                          {isTracked && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                          {kw}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracker" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter tracked keywords..."
                value={trackerSearch}
                onChange={(e) => setTrackerSearch(e.target.value)}
                className="pl-9"
                data-testid="input-tracker-search"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-filter-status">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="tracking">Tracking</SelectItem>
                <SelectItem value="saved">Saved</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-sort">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="position">Position (Best)</SelectItem>
                <SelectItem value="change">Biggest Change</SelectItem>
                <SelectItem value="alpha">A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : sorted.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Target className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-1">
                  {totalTracked === 0 ? "No keywords being tracked" : "No results match your filters"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {totalTracked === 0
                    ? "Use the Research tab to find keywords, or add one manually."
                    : "Try adjusting your search or filters."
                  }
                </p>
                {totalTracked === 0 && (
                  <Button onClick={() => setActiveTab("research")} data-testid="button-go-research">
                    <Search className="w-4 h-4 mr-1.5" />
                    Start Researching
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="col-span-5">Keyword</div>
                <div className="col-span-2 text-center">Position</div>
                <div className="col-span-2 text-center">Change</div>
                <div className="col-span-1 text-center">Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {sorted.map((kw) => (
                <Card key={kw.id} className="transition-all hover:shadow-sm" data-testid={`card-keyword-${kw.id}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center flex flex-col gap-3">
                      <div className="col-span-5 min-w-0">
                        <div className="flex items-center gap-2">
                          {getChangeIcon(kw.positionChange)}
                          <span className="font-medium text-sm truncate">{kw.keyword}</span>
                        </div>
                        {kw.lastChecked && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 ml-5">
                            Last checked: {new Date(kw.lastChecked).toLocaleDateString()}
                          </p>
                        )}
                        {kw.tags && (
                          <div className="flex flex-wrap gap-1 mt-1 ml-5">
                            {kw.tags.split(",").map((t, i) => (
                              <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0">{t.trim()}</Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="col-span-2 text-center">
                        {updatePositionId === kw.id ? (
                          <div className="flex items-center gap-1 justify-center">
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              value={newPosition}
                              onChange={(e) => setNewPosition(e.target.value)}
                              className="w-16 h-7 text-xs text-center"
                              placeholder="#"
                              data-testid="input-new-position"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newPosition) {
                                  const pos = parseInt(newPosition);
                                  if (!isNaN(pos) && pos >= 1 && pos <= 1000) {
                                    checkRankMutation.mutate({ id: kw.id, position: pos });
                                  }
                                }
                                if (e.key === "Escape") { setUpdatePositionId(null); setNewPosition(""); }
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                const pos = parseInt(newPosition);
                                if (!isNaN(pos) && pos >= 1 && pos <= 1000) {
                                  checkRankMutation.mutate({ id: kw.id, position: pos });
                                }
                              }}
                              data-testid="button-save-position"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => { setUpdatePositionId(null); setNewPosition(""); }}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            className={`text-lg ${getPositionColor(kw.currentPosition)} cursor-pointer hover:underline`}
                            onClick={() => { setUpdatePositionId(kw.id); setNewPosition(kw.currentPosition?.toString() || ""); }}
                            data-testid={`button-position-${kw.id}`}
                          >
                            {kw.currentPosition != null ? `#${kw.currentPosition}` : "—"}
                          </button>
                        )}
                      </div>

                      <div className="col-span-2 flex justify-center">
                        {getChangeBadge(kw.positionChange)}
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] cursor-pointer ${
                            kw.status === "saved" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                            kw.status === "archived" ? "bg-slate-500/10 text-slate-400 border-slate-500/20" :
                            "bg-violet-500/10 text-violet-600 border-violet-500/20"
                          }`}
                          onClick={() => {
                            const next = kw.status === "tracking" ? "saved" : kw.status === "saved" ? "archived" : "tracking";
                            updateMutation.mutate({ id: kw.id, data: { status: next } });
                          }}
                          data-testid={`badge-status-${kw.id}`}
                        >
                          {kw.status === "saved" ? "★ Saved" : kw.status === "archived" ? "Archived" : "Tracking"}
                        </Badge>
                      </div>

                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setUpdatePositionId(kw.id); setNewPosition(kw.currentPosition?.toString() || ""); }}
                          title="Update Position"
                          data-testid={`button-update-rank-${kw.id}`}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setSelectedKeyword(kw); setHistoryDialogOpen(true); }}
                          title="View History"
                          data-testid={`button-history-${kw.id}`}
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => deleteMutation.mutate(kw.id)}
                          data-testid={`button-delete-${kw.id}`}
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
        </TabsContent>
      </Tabs>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-violet-500" />
              Add Keyword to Track
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Keyword</label>
              <Input
                placeholder="e.g. web design agency near me"
                value={newKeyword.keyword}
                onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                data-testid="input-new-keyword"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tags (comma separated)</label>
              <Input
                placeholder="e.g. local, branded, long-tail"
                value={newKeyword.tags}
                onChange={(e) => setNewKeyword({ ...newKeyword, tags: e.target.value })}
                data-testid="input-new-tags"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes</label>
              <Input
                placeholder="Optional notes..."
                value={newKeyword.notes}
                onChange={(e) => setNewKeyword({ ...newKeyword, notes: e.target.value })}
                data-testid="input-new-notes"
              />
            </div>
            <Button onClick={handleAddCustom} disabled={!newKeyword.keyword.trim() || addMutation.isPending} className="w-full" data-testid="button-save-keyword">
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Add Keyword
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialogOpen} onOpenChange={(o) => { setHistoryDialogOpen(o); if (!o) setSelectedKeyword(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-500" />
              Ranking History — "{selectedKeyword?.keyword}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {selectedKeyword && (
              <div className="flex items-center gap-4 p-3 rounded-lg bg-accent/50">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getPositionColor(selectedKeyword.currentPosition)}`}>
                    {selectedKeyword.currentPosition != null ? `#${selectedKeyword.currentPosition}` : "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Current</div>
                </div>
                <div className="text-center">
                  <div className="text-lg text-muted-foreground">
                    {selectedKeyword.previousPosition != null ? `#${selectedKeyword.previousPosition}` : "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Previous</div>
                </div>
                <div className="text-center">
                  {getChangeBadge(selectedKeyword.positionChange)}
                  <div className="text-[10px] text-muted-foreground mt-0.5">Change</div>
                </div>
              </div>
            )}

            {history.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No ranking history yet. Update the position to start tracking.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-48 relative rounded-lg border bg-card p-4">
                  <RankChart history={history} />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {history.map((h: any, i: number) => {
                    const prev = history[i + 1];
                    const change = prev ? (prev.position ?? 0) - (h.position ?? 0) : 0;
                    return (
                      <div key={h.id} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-card text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${getPositionColor(h.position)}`}>
                            #{h.position}
                          </span>
                          {change !== 0 && (
                            <Badge className={`text-[10px] ${change > 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}`}>
                              {change > 0 ? `↑${change}` : `↓${Math.abs(change)}`}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(h.checkedAt).toLocaleDateString()} {new Date(h.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RankChart({ history }: { history: any[] }) {
  if (history.length === 0) return null;

  const reversed = [...history].reverse();
  const positions = reversed.map((h) => h.position ?? 0);
  const maxPos = Math.max(...positions, 10);
  const minPos = Math.min(...positions, 1);
  const range = Math.max(maxPos - minPos, 5);

  const width = 100;
  const height = 100;
  const padding = 5;

  const points = reversed.map((h, i) => {
    const x = padding + (i / Math.max(reversed.length - 1, 1)) * (width - 2 * padding);
    const y = padding + ((h.position ?? maxPos) - minPos) / range * (height - 2 * padding);
    return { x, y, pos: h.position };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="rankGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#rankGradient)" />
      <path d={pathD} fill="none" stroke="rgb(139, 92, 246)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill="rgb(139, 92, 246)" stroke="white" strokeWidth="1" />
      ))}
      <text x={padding} y={padding - 1} fontSize="4" fill="currentColor" className="text-muted-foreground">#{minPos}</text>
      <text x={padding} y={height - padding + 5} fontSize="4" fill="currentColor" className="text-muted-foreground">#{maxPos}</text>
    </svg>
  );
}
