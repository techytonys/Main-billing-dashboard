import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Link2, Plus, Copy, Check, ExternalLink, Trash2, MousePointerClick, Users, Eye,
  Globe, Smartphone, Monitor, Tablet, BarChart3, TrendingUp, RefreshCw,
} from "lucide-react";
import {
  SiFacebook, SiInstagram, SiTiktok, SiPinterest, SiX, SiLinkedin, SiYoutube,
  SiReddit, SiSnapchat, SiWhatsapp, SiTelegram, SiThreads,
} from "react-icons/si";

const PLATFORMS = [
  { id: "facebook", name: "Facebook", icon: SiFacebook, color: "text-blue-600",
    types: ["Reel", "Story", "Group Post", "Page Post", "Profile Bio", "Marketplace", "Event", "Ad", "Comment", "Messenger", "Feed Post", "Pinned Post", "Live Video", "Watch Video", "Cover Photo"] },
  { id: "instagram", name: "Instagram", icon: SiInstagram, color: "text-pink-500",
    types: ["Reel", "Story", "Bio Link", "Post", "IGTV", "Ad", "Comment", "DM", "Guide", "Carousel", "Highlight", "Live", "Collab Post", "Broadcast Channel"] },
  { id: "tiktok", name: "TikTok", icon: SiTiktok, color: "text-black dark:text-white",
    types: ["Video", "Bio Link", "Story", "Comment", "Ad", "Live", "Duet", "Stitch", "Series", "Photo Mode", "Pinned Video"] },
  { id: "pinterest", name: "Pinterest", icon: SiPinterest, color: "text-red-600",
    types: ["Pin", "Board", "Profile", "Idea Pin", "Ad", "Rich Pin", "Video Pin", "Carousel Pin", "Collection Pin", "Shopping Pin"] },
  { id: "twitter", name: "X / Twitter", icon: SiX, color: "text-black dark:text-white",
    types: ["Tweet", "Bio Link", "DM", "Thread", "Ad", "Pinned Tweet", "Space", "List", "Moment", "Reply", "Retweet", "Bookmark"] },
  { id: "linkedin", name: "LinkedIn", icon: SiLinkedin, color: "text-blue-700",
    types: ["Post", "Group", "Article", "Bio Link", "Company Page", "Ad", "Comment", "Message", "Newsletter", "Event", "Document", "Poll", "Carousel", "Video"] },
  { id: "youtube", name: "YouTube", icon: SiYoutube, color: "text-red-500",
    types: ["Video Description", "Channel Bio", "Short", "Community Post", "Comment", "Card", "End Screen", "Ad", "Pinned Comment", "Live Chat", "Playlist", "Banner Link"] },
  { id: "reddit", name: "Reddit", icon: SiReddit, color: "text-orange-500",
    types: ["Post", "Comment", "Profile Bio", "Subreddit Sidebar", "Ad", "Wiki", "Crosspost", "AMA", "Live Thread"] },
  { id: "snapchat", name: "Snapchat", icon: SiSnapchat, color: "text-yellow-400",
    types: ["Story", "Spotlight", "Profile", "Ad", "Snap", "Chat", "My Story", "Discover"] },
  { id: "whatsapp", name: "WhatsApp", icon: SiWhatsapp, color: "text-green-500",
    types: ["Message", "Status", "Group", "Business Profile", "Catalog", "Channel", "Community"] },
  { id: "telegram", name: "Telegram", icon: SiTelegram, color: "text-blue-400",
    types: ["Channel", "Group", "Message", "Profile Bio", "Bot", "Mini App", "Sticker"] },
  { id: "threads", name: "Threads", icon: SiThreads, color: "text-black dark:text-white",
    types: ["Post", "Bio Link", "Reply", "Repost", "Quote"] },
];

function generateSlug(platform: string, contentType: string): string {
  const prefix = platform.slice(0, 2);
  const typePrefix = contentType.replace(/\s+/g, "").slice(0, 4).toLowerCase();
  const rand = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${typePrefix}-${rand}`;
}

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const p = PLATFORMS.find(pl => pl.id === platform);
  if (!p) return <Globe className={className} />;
  const Icon = p.icon;
  return <Icon className={`${className} ${p.color}`} />;
}

function CreateLinkDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState("");
  const [contentType, setContentType] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [label, setLabel] = useState("");
  const [slug, setSlug] = useState("");
  const [customDomain, setCustomDomain] = useState("");

  const selectedPlatform = PLATFORMS.find(p => p.id === platform);
  const baseUrl = window.location.origin;

  const createMutation = useMutation({
    mutationFn: async () => {
      const finalSlug = slug || generateSlug(platform, contentType);
      return apiRequest("POST", "/api/tracked-links", {
        slug: finalSlug,
        destinationUrl,
        platform,
        contentType,
        label: label || undefined,
        customDomain: customDomain || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Link created", description: "Your tracked link is ready to use" });
      queryClient.invalidateQueries({ queryKey: ["/api/tracked-links"] });
      setOpen(false);
      setPlatform(""); setContentType(""); setDestinationUrl(""); setLabel(""); setSlug(""); setCustomDomain("");
      onCreated();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-link"><Plus className="w-4 h-4 mr-2" /> Create Link</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Create Tracked Link
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Generate a trackable link for any social platform</p>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Platform</Label>
              <Select value={platform} onValueChange={(v) => { setPlatform(v); setContentType(""); setSlug(""); }}>
                <SelectTrigger data-testid="select-platform" className="h-10">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <p.icon className={`w-4 h-4 ${p.color}`} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Content Type</Label>
              <Select value={contentType} onValueChange={(v) => { setContentType(v); setSlug(generateSlug(platform, v)); }} disabled={!selectedPlatform}>
                <SelectTrigger data-testid="select-content-type" className="h-10">
                  <SelectValue placeholder={selectedPlatform ? "Select..." : "Pick platform first"} />
                </SelectTrigger>
                <SelectContent>
                  {(selectedPlatform?.types || []).map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Destination URL</Label>
            <Input
              placeholder="https://aipoweredsites.com"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              className="h-10"
              data-testid="input-destination-url"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Campaign Label <span className="normal-case font-normal">(optional)</span></Label>
            <Input
              placeholder="e.g. Spring Sale Campaign"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-10"
              data-testid="input-label"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Custom Slug <span className="normal-case font-normal">(auto-generated if empty)</span></Label>
            <div className="flex items-center border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <span className="px-3 py-2 text-xs text-muted-foreground bg-muted border-r whitespace-nowrap">/go/</span>
              <Input
                placeholder={slug || "auto-generated"}
                value={slug}
                onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))}
                className="border-0 h-10 focus-visible:ring-0 focus-visible:ring-offset-0"
                data-testid="input-slug"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Custom Domain <span className="normal-case font-normal">(optional)</span></Label>
            <Input
              placeholder="e.g. link.yourbrand.com"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              className="h-10"
              data-testid="input-custom-domain"
            />
            <p className="text-[11px] text-muted-foreground">Point your custom domain's DNS to this server to use it</p>
          </div>

          {slug && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Preview</p>
              <p className="text-sm font-mono font-semibold text-primary break-all">
                {customDomain ? `https://${customDomain}/go/${slug}` : `${baseUrl}/go/${slug}`}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5">Redirects to: <span className="font-mono">{destinationUrl || "..."}</span></p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-muted/20">
          <Button
            className="w-full h-11"
            onClick={() => createMutation.mutate()}
            disabled={!platform || !contentType || !destinationUrl || createMutation.isPending}
            data-testid="button-submit-link"
          >
            {createMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Tracked Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinkCard({ link, onDelete }: { link: any; onDelete: () => void }) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();
  const baseUrl = window.location.origin;
  const fullUrl = link.customDomain ? `https://${link.customDomain}/go/${link.slug}` : `${baseUrl}/go/${link.slug}`;

  const toggleMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/tracked-links/${link.id}`, { isActive: !link.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tracked-links"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/tracked-links/${link.id}`),
    onSuccess: () => {
      toast({ title: "Link deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/tracked-links"] });
      onDelete();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/tracked-links", link.id],
    queryFn: () => fetch(`/api/tracked-links/${link.id}`).then(r => r.json()),
    enabled: showDetails,
  });

  const copyUrl = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const platform = PLATFORMS.find(p => p.id === link.platform);

  return (
    <Card className={`transition-all ${!link.isActive ? "opacity-60" : ""}`} data-testid={`card-link-${link.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-muted/50 shrink-0">
              <PlatformIcon platform={link.platform} className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{platform?.name || link.platform}</span>
                <Badge variant="secondary" className="text-xs">{link.contentType}</Badge>
                {link.label && <span className="text-xs text-muted-foreground">· {link.label}</span>}
                {!link.isActive && <Badge variant="outline" className="text-xs text-red-500 border-red-200">Paused</Badge>}
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <p className="text-xs font-mono text-muted-foreground truncate">{fullUrl}</p>
                <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={copyUrl} data-testid={`button-copy-${link.id}`}>
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">→ {link.destinationUrl}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <MousePointerClick className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-lg font-bold">{link.totalClicks || 0}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{link.uniqueClicks || 0} unique</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowDetails(!showDetails)} data-testid={`button-details-${link.id}`}>
            <BarChart3 className="w-3 h-3 mr-1" /> {showDetails ? "Hide" : "Details"}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open(fullUrl, "_blank")} data-testid={`button-test-${link.id}`}>
            <ExternalLink className="w-3 h-3 mr-1" /> Test
          </Button>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-muted-foreground">{link.isActive ? "Active" : "Paused"}</span>
            <Switch checked={link.isActive} onCheckedChange={() => toggleMutation.mutate()} data-testid={`switch-active-${link.id}`} />
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => deleteMutation.mutate()} data-testid={`button-delete-${link.id}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {showDetails && stats && (
          <div className="mt-3 pt-3 border-t space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <MousePointerClick className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-lg font-bold">{stats.clicks}</p>
                <p className="text-[10px] text-muted-foreground">Total Clicks</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <Users className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-lg font-bold">{stats.uniqueClicks}</p>
                <p className="text-[10px] text-muted-foreground">Unique Clicks</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                <TrendingUp className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-lg font-bold">{stats.clicks > 0 ? Math.round((stats.uniqueClicks / stats.clicks) * 100) : 0}%</p>
                <p className="text-[10px] text-muted-foreground">Unique Rate</p>
              </div>
            </div>
            {stats.deviceBreakdown && Object.keys(stats.deviceBreakdown).length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1.5">Devices</p>
                <div className="flex gap-3">
                  {Object.entries(stats.deviceBreakdown).map(([device, count]: [string, any]) => {
                    const Icon = device === "mobile" ? Smartphone : device === "tablet" ? Tablet : Monitor;
                    return (
                      <div key={device} className="flex items-center gap-1.5 text-xs">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="capitalize">{device}</span>
                        <Badge variant="secondary" className="text-[10px] h-4">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {stats.dailyClicks && Object.keys(stats.dailyClicks).length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1.5">Recent Clicks</p>
                <div className="flex items-end gap-1 h-10">
                  {Object.entries(stats.dailyClicks).slice(-14).map(([date, count]: [string, any]) => {
                    const max = Math.max(...Object.values(stats.dailyClicks).map(Number));
                    return (
                      <div key={date} className="flex-1 group relative">
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                          {new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" })}: {count}
                        </div>
                        <div
                          className="w-full bg-primary/70 rounded-t-sm min-h-[2px] hover:bg-primary transition-all"
                          style={{ height: `${(count / Math.max(max, 1)) * 40}px` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LinkTracker() {
  usePageTitle("Link Tracker");
  const [filterPlatform, setFilterPlatform] = useState("all");

  const { data: links = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tracked-links"],
  });

  const filteredLinks = filterPlatform === "all" ? links : links.filter(l => l.platform === filterPlatform);
  const totalClicks = links.reduce((sum, l) => sum + (l.totalClicks || 0), 0);
  const totalUnique = links.reduce((sum, l) => sum + (l.uniqueClicks || 0), 0);
  const activePlatforms = [...new Set(links.map(l => l.platform))];

  return (
    <div className="space-y-6" data-testid="page-link-tracker">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Link Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Create trackable links for every social platform</p>
        </div>
        <CreateLinkDialog onCreated={() => {}} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Links</p>
                <p className="text-2xl font-bold mt-1">{links.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10"><Link2 className="w-5 h-5 text-primary" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Clicks</p>
                <p className="text-2xl font-bold mt-1">{totalClicks.toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10"><MousePointerClick className="w-5 h-5 text-primary" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Unique Clicks</p>
                <p className="text-2xl font-bold mt-1">{totalUnique.toLocaleString()}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Platforms</p>
                <p className="text-2xl font-bold mt-1">{activePlatforms.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10"><Globe className="w-5 h-5 text-primary" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {activePlatforms.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant={filterPlatform === "all" ? "default" : "outline"} onClick={() => setFilterPlatform("all")} data-testid="filter-all">
            All ({links.length})
          </Button>
          {activePlatforms.map(p => {
            const pl = PLATFORMS.find(x => x.id === p);
            const count = links.filter(l => l.platform === p).length;
            return (
              <Button key={p} size="sm" variant={filterPlatform === p ? "default" : "outline"} onClick={() => setFilterPlatform(p)} data-testid={`filter-${p}`}>
                <PlatformIcon platform={p} className="w-3.5 h-3.5 mr-1.5" />
                {pl?.name || p} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-20 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : filteredLinks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Link2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tracked links yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first tracked link to start monitoring clicks from social media
            </p>
            <CreateLinkDialog onCreated={() => {}} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLinks.map(link => (
            <LinkCard key={link.id} link={link} onDelete={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
