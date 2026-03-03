import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, Users, MousePointerClick, Clock, Smartphone, Monitor, Tablet, Copy, Check, TrendingUp, BarChart3, Activity, Globe, Radio, Trash2, ShieldOff, Shield } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const countryFlags: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}", CA: "\u{1F1E8}\u{1F1E6}", GB: "\u{1F1EC}\u{1F1E7}", IE: "\u{1F1EE}\u{1F1EA}",
  FR: "\u{1F1EB}\u{1F1F7}", DE: "\u{1F1E9}\u{1F1EA}", ES: "\u{1F1EA}\u{1F1F8}", IT: "\u{1F1EE}\u{1F1F9}",
  NL: "\u{1F1F3}\u{1F1F1}", BE: "\u{1F1E7}\u{1F1EA}", CH: "\u{1F1E8}\u{1F1ED}", AT: "\u{1F1E6}\u{1F1F9}",
  SE: "\u{1F1F8}\u{1F1EA}", NO: "\u{1F1F3}\u{1F1F4}", FI: "\u{1F1EB}\u{1F1EE}", DK: "\u{1F1E9}\u{1F1F0}",
  PL: "\u{1F1F5}\u{1F1F1}", CZ: "\u{1F1E8}\u{1F1FF}", HU: "\u{1F1ED}\u{1F1FA}", RO: "\u{1F1F7}\u{1F1F4}",
  BG: "\u{1F1E7}\u{1F1EC}", GR: "\u{1F1EC}\u{1F1F7}", TR: "\u{1F1F9}\u{1F1F7}", PT: "\u{1F1F5}\u{1F1F9}",
  UA: "\u{1F1FA}\u{1F1E6}", RU: "\u{1F1F7}\u{1F1FA}", JP: "\u{1F1EF}\u{1F1F5}", CN: "\u{1F1E8}\u{1F1F3}",
  HK: "\u{1F1ED}\u{1F1F0}", TW: "\u{1F1F9}\u{1F1FC}", KR: "\u{1F1F0}\u{1F1F7}", IN: "\u{1F1EE}\u{1F1F3}",
  SG: "\u{1F1F8}\u{1F1EC}", TH: "\u{1F1F9}\u{1F1ED}", ID: "\u{1F1EE}\u{1F1E9}", PH: "\u{1F1F5}\u{1F1ED}",
  MY: "\u{1F1F2}\u{1F1FE}", VN: "\u{1F1FB}\u{1F1F3}", AE: "\u{1F1E6}\u{1F1EA}", SA: "\u{1F1F8}\u{1F1E6}",
  PK: "\u{1F1F5}\u{1F1F0}", BD: "\u{1F1E7}\u{1F1E9}", LK: "\u{1F1F1}\u{1F1F0}", NP: "\u{1F1F3}\u{1F1F5}",
  AU: "\u{1F1E6}\u{1F1FA}", NZ: "\u{1F1F3}\u{1F1FF}", EG: "\u{1F1EA}\u{1F1EC}", NG: "\u{1F1F3}\u{1F1EC}",
  KE: "\u{1F1F0}\u{1F1EA}", ZA: "\u{1F1FF}\u{1F1E6}", MA: "\u{1F1F2}\u{1F1E6}", GH: "\u{1F1EC}\u{1F1ED}",
  MX: "\u{1F1F2}\u{1F1FD}", CO: "\u{1F1E8}\u{1F1F4}", BR: "\u{1F1E7}\u{1F1F7}", AR: "\u{1F1E6}\u{1F1F7}",
  PE: "\u{1F1F5}\u{1F1EA}", CL: "\u{1F1E8}\u{1F1F1}", VE: "\u{1F1FB}\u{1F1EA}", IL: "\u{1F1EE}\u{1F1F1}",
  IR: "\u{1F1EE}\u{1F1F7}", IQ: "\u{1F1EE}\u{1F1F6}", JO: "\u{1F1EF}\u{1F1F4}", LB: "\u{1F1F1}\u{1F1E7}",
  CR: "\u{1F1E8}\u{1F1F7}", PA: "\u{1F1F5}\u{1F1E6}", JM: "\u{1F1EF}\u{1F1F2}", PR: "\u{1F1F5}\u{1F1F7}",
  DO: "\u{1F1E9}\u{1F1F4}", CU: "\u{1F1E8}\u{1F1FA}", GT: "\u{1F1EC}\u{1F1F9}",
  XX: "\u{1F30D}",
};

function getFlag(code: string): string {
  return countryFlags[code] || "\u{1F30D}";
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function StatCard({ title, value, icon: Icon, subtitle }: { title: string; value: string | number; icon: any; subtitle?: string }) {
  return (
    <Card data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrafficChart({ data, interval }: { data: { pageViews: any[]; sessions: any[] }; interval: string }) {
  if (!data.pageViews.length && !data.sessions.length) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No traffic data for this period
      </div>
    );
  }

  const allPeriods = [...new Set([...data.pageViews.map(d => d.period), ...data.sessions.map(d => d.period)])].sort();
  const pvMap = new Map(data.pageViews.map(d => [d.period, d.count]));
  const sessMap = new Map(data.sessions.map(d => [d.period, d.count]));

  const chartData = allPeriods.map(p => ({
    period: p,
    views: pvMap.get(p) || 0,
    sessions: sessMap.get(p) || 0,
  }));

  const maxVal = Math.max(...chartData.map(d => Math.max(d.views, d.sessions)), 1);
  const chartHeight = 160;

  const pvPoints = chartData.map((d, i) => {
    const x = chartData.length === 1 ? 50 : (i / (chartData.length - 1)) * 100;
    const y = chartHeight - (d.views / maxVal) * (chartHeight - 20);
    return `${x},${y}`;
  }).join(" ");

  const sessPoints = chartData.map((d, i) => {
    const x = chartData.length === 1 ? 50 : (i / (chartData.length - 1)) * 100;
    const y = chartHeight - (d.sessions / maxVal) * (chartHeight - 20);
    return `${x},${y}`;
  }).join(" ");

  const pvAreaPoints = `0,${chartHeight} ${pvPoints} 100,${chartHeight}`;
  const sessAreaPoints = `0,${chartHeight} ${sessPoints} 100,${chartHeight}`;

  const formatLabel = (period: string) => {
    if (interval === "hour") {
      const d = new Date(period.replace(" ", "T") + ":00");
      return d.toLocaleTimeString("en", { hour: "numeric", hour12: true });
    }
    const d = new Date(period);
    return d.toLocaleDateString("en", { month: "short", day: "numeric" });
  };

  const ySteps = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];

  return (
    <div className="relative" data-testid="chart-traffic">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Page Views</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Sessions</span>
        </div>
      </div>

      <div className="flex">
        <div className="flex flex-col justify-between text-[10px] text-muted-foreground pr-2 py-0" style={{ height: chartHeight }}>
          {ySteps.reverse().map((v, i) => <span key={i}>{v}</span>)}
        </div>

        <div className="flex-1 relative" style={{ height: chartHeight }}>
          {[0, 25, 50, 75, 100].map(pct => (
            <div key={pct} className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/10" style={{ top: `${pct}%` }} />
          ))}

          <svg viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none" className="w-full h-full">
            <polygon points={pvAreaPoints} fill="hsl(var(--primary))" opacity="0.1" />
            <polyline points={pvPoints} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <polygon points={sessAreaPoints} fill="rgb(16, 185, 129)" opacity="0.08" />
            <polyline points={sessPoints} fill="none" stroke="rgb(16, 185, 129)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            {chartData.map((d, i) => {
              const x = chartData.length === 1 ? 50 : (i / (chartData.length - 1)) * 100;
              const yv = chartHeight - (d.views / maxVal) * (chartHeight - 20);
              const ys = chartHeight - (d.sessions / maxVal) * (chartHeight - 20);
              return (
                <g key={i}>
                  <circle cx={x} cy={yv} r="2" fill="hsl(var(--primary))" className="hover:r-3 transition-all" />
                  <circle cx={x} cy={ys} r="2" fill="rgb(16, 185, 129)" />
                </g>
              );
            })}
          </svg>

          {chartData.map((d, i) => {
            const x = chartData.length === 1 ? 50 : (i / (chartData.length - 1)) * 100;
            return (
              <div key={i} className="absolute top-0 bottom-0 group" style={{ left: `${x}%`, width: `${100 / chartData.length}%`, transform: "translateX(-50%)" }}>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-popover border shadow-lg text-[10px] px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                  <p className="font-medium">{formatLabel(d.period)}</p>
                  <p className="text-primary">{d.views} views</p>
                  <p className="text-emerald-500">{d.sessions} sessions</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground ml-8">
        {chartData.length > 0 && <span>{formatLabel(chartData[0].period)}</span>}
        {chartData.length > 2 && <span>{formatLabel(chartData[Math.floor(chartData.length / 2)].period)}</span>}
        {chartData.length > 1 && <span>{formatLabel(chartData[chartData.length - 1].period)}</span>}
      </div>
    </div>
  );
}

function LiveVisitorsPanel() {
  const { data: live } = useQuery<any>({
    queryKey: ["/api/analytics/live"],
    queryFn: () => fetch("/api/analytics/live", { credentials: "include" }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),
    refetchInterval: 5000,
  });

  const count = live?.count || 0;
  const countries = live?.countries || [];
  const pages = live?.pages || [];

  return (
    <Card className="border-primary/20" data-testid="card-live-visitors">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Radio className="w-5 h-5 text-emerald-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{count}</span>
              <span className="text-sm font-medium text-emerald-600">LIVE</span>
            </div>
            <p className="text-xs text-muted-foreground">visitor{count !== 1 ? "s" : ""} right now</p>
          </div>
        </div>

        {countries.length > 0 && (
          <div className="space-y-1.5 mb-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Countries</p>
            <div className="flex flex-wrap gap-1.5">
              {countries.map((c: any) => (
                <Badge key={c.code} variant="secondary" className="text-xs gap-1 py-0.5" data-testid={`live-country-${c.code}`}>
                  <span className="text-sm">{getFlag(c.code)}</span>
                  {c.name}
                  <span className="text-muted-foreground ml-0.5">{c.count}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {pages.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Active Pages</p>
            {pages.slice(0, 5).map((p: any) => (
              <div key={p.path} className="flex items-center justify-between text-xs py-0.5">
                <span className="font-mono truncate max-w-[70%] text-muted-foreground">{p.path}</span>
                <Badge variant="outline" className="text-[10px] h-4">{p.count}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  usePageTitle("Analytics");
  const [range, setRange] = useState("7d");
  const [copied, setCopied] = useState(false);
  const [selfTrackingBlocked, setSelfTrackingBlocked] = useState(() => localStorage.getItem("_aips_no_track") === "1");
  const { toast } = useToast();

  const fetchAuth = (url: string) => fetch(url, { credentials: "include" }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); });

  const resetMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/analytics/reset"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/traffic-chart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/countries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/pageviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/live"] });
      toast({ title: "Analytics Reset", description: "All analytics data has been cleared." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reset analytics data.", variant: "destructive" });
    },
  });

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/analytics/stats", range],
    queryFn: () => fetchAuth(`/api/analytics/stats?range=${range}`),
    refetchInterval: 30000,
  });

  const { data: trafficData } = useQuery<any>({
    queryKey: ["/api/analytics/traffic-chart", range],
    queryFn: () => fetchAuth(`/api/analytics/traffic-chart?range=${range}`),
  });

  const { data: countries } = useQuery<any[]>({
    queryKey: ["/api/analytics/countries", range],
    queryFn: () => fetchAuth(`/api/analytics/countries?range=${range}`),
  });

  const { data: recentEvents } = useQuery<any[]>({
    queryKey: ["/api/analytics/events", range],
    queryFn: () => fetchAuth(`/api/analytics/events?range=${range}`),
  });

  const { data: scriptSnippet } = useQuery<string>({
    queryKey: ["/api/analytics/script"],
    queryFn: () => fetch("/api/analytics/script", { credentials: "include" }).then(r => r.text()),
  });

  const copyScript = () => {
    if (scriptSnippet) {
      navigator.clipboard.writeText(scriptSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6" data-testid="page-analytics">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Track page views, visitors, events, and traffic</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            data-testid="button-toggle-self-tracking"
            className={selfTrackingBlocked
              ? "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
              : "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
            }
            onClick={() => {
              if (selfTrackingBlocked) {
                localStorage.removeItem("_aips_no_track");
                setSelfTrackingBlocked(false);
                toast({ title: "Self-tracking enabled", description: "Your visits will now be tracked in analytics." });
              } else {
                localStorage.setItem("_aips_no_track", "1");
                setSelfTrackingBlocked(true);
                toast({ title: "Self-tracking blocked", description: "Your visits will no longer appear in analytics." });
              }
            }}
          >
            {selfTrackingBlocked ? (
              <><ShieldOff className="w-4 h-4 mr-2" />Tracking Blocked</>
            ) : (
              <><Shield className="w-4 h-4 mr-2" />Block My Visits</>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" data-testid="button-reset-analytics">
                <Trash2 className="w-4 h-4 mr-2" />
                Reset All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset All Analytics?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all page views, events, and sessions. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-reset">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => resetMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-reset"
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? "Resetting..." : "Yes, Reset Everything"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[140px]" data-testid="select-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard title="Page Views" value={stats?.totalPageViews?.toLocaleString() || "0"} icon={Eye} />
                <StatCard title="Sessions" value={stats?.totalSessions?.toLocaleString() || "0"} icon={Activity} />
                <StatCard title="Unique Visitors" value={stats?.uniqueVisitors?.toLocaleString() || "0"} icon={Users} />
                <StatCard title="Total Events" value={stats?.totalEvents?.toLocaleString() || "0"} icon={MousePointerClick} />
                <StatCard title="Avg. Duration" value={formatDuration(stats?.avgSessionDuration || 0)} icon={Clock} />
              </div>

              {trafficData && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Traffic Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TrafficChart data={trafficData} interval={trafficData.interval} />
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <LiveVisitorsPanel />

              {countries && countries.length > 0 && (
                <Card data-testid="card-countries">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      Countries
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {countries.map((c: any, i: number) => {
                        const total = countries.reduce((acc: number, x: any) => acc + x.count, 0);
                        const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
                        return (
                          <div key={i} data-testid={`country-${c.code}`}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{getFlag(c.code)}</span>
                                <span className="font-medium text-xs">{c.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground">{pct}%</span>
                                <span className="text-xs font-semibold">{c.count}</span>
                              </div>
                            </div>
                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <Tabs defaultValue="sources" className="space-y-4">
            <TabsList data-testid="tabs-analytics">
              <TabsTrigger value="sources">Traffic Sources</TabsTrigger>
              <TabsTrigger value="pages">Top Pages</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="devices">Devices</TabsTrigger>
              <TabsTrigger value="install">Install Script</TabsTrigger>
            </TabsList>

            <TabsContent value="sources">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Traffic Sources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!stats?.sourceBreakdown?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No traffic data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.sourceBreakdown.map((s: any, i: number) => {
                        const total = stats.sourceBreakdown.reduce((acc: number, x: any) => acc + x.count, 0);
                        const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                        return (
                          <div key={i} data-testid={`source-${s.source}`}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">{s.source || "Direct"}</span>
                                <span className="text-xs text-muted-foreground">/ {s.medium || "none"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{pct}%</span>
                                <span className="font-medium">{s.count}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pages">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" /> Top Pages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!stats?.topPages?.length ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No page views yet</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.topPages.map((p: any, i: number) => {
                        const total = stats.topPages.reduce((acc: number, x: any) => acc + x.count, 0);
                        const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
                        return (
                          <div key={i} className="flex items-center justify-between py-2 border-b last:border-0" data-testid={`page-${i}`}>
                            <span className="text-sm font-mono truncate max-w-[60%]">{p.path}</span>
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-sm font-medium w-12 text-right">{p.count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MousePointerClick className="w-4 h-4 text-primary" /> Event Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!stats?.eventTypes?.length ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No events yet</p>
                    ) : (
                      <div className="space-y-2">
                        {stats.eventTypes.map((e: any, i: number) => (
                          <div key={i} className="flex items-center justify-between py-1.5">
                            <Badge variant="outline" className="font-mono text-xs">{e.eventType}</Badge>
                            <span className="text-sm font-medium">{e.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" /> Recent Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!recentEvents?.length ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No events yet</p>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {recentEvents.slice(0, 30).map((e: any) => (
                          <div key={e.id} className="flex items-start gap-2 py-1.5 border-b last:border-0 text-xs" data-testid={`event-${e.id}`}>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{e.eventType}</Badge>
                            <div className="min-w-0">
                              <p className="truncate text-muted-foreground">{e.elementText || e.href || e.path}</p>
                              <p className="text-[10px] text-muted-foreground/60">{new Date(e.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="devices">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Devices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!stats?.deviceBreakdown?.length ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                    ) : (
                      <div className="space-y-3">
                        {stats.deviceBreakdown.map((d: any, i: number) => {
                          const Icon = d.device === "mobile" ? Smartphone : d.device === "tablet" ? Tablet : Monitor;
                          const total = stats.deviceBreakdown.reduce((acc: number, x: any) => acc + x.count, 0);
                          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                          return (
                            <div key={i} className="flex items-center gap-3" data-testid={`device-${d.device}`}>
                              <Icon className="w-5 h-5 text-muted-foreground" />
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="capitalize font-medium">{d.device}</span>
                                  <span>{pct}% ({d.count})</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Browsers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!stats?.browserBreakdown?.length ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                    ) : (
                      <div className="space-y-2">
                        {stats.browserBreakdown.map((b: any, i: number) => {
                          const total = stats.browserBreakdown.reduce((acc: number, x: any) => acc + x.count, 0);
                          const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
                          return (
                            <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0" data-testid={`browser-${b.browser}`}>
                              <span className="text-sm font-medium">{b.browser}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="install">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Install Tracking Script</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Add this script to any website you want to track. Place it before the closing <code className="bg-muted px-1 py-0.5 rounded text-xs">&lt;/head&gt;</code> tag.
                  </p>
                  <div className="relative">
                    <pre className="bg-muted/50 border rounded-lg p-4 text-sm font-mono overflow-x-auto" data-testid="code-tracking-script">
                      {scriptSnippet || "Loading..."}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={copyScript}
                      data-testid="button-copy-script"
                    >
                      {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">What gets tracked:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Page views and unique visitors</li>
                      <li>Button clicks and link clicks</li>
                      <li>Outbound link clicks</li>
                      <li>Form submissions</li>
                      <li>UTM parameters (source, medium, campaign)</li>
                      <li>Device, browser, OS, and country</li>
                      <li>Session duration and time on page</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
