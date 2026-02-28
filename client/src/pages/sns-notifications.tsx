import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bell, Plus, Trash2, Send, Users, MessageSquare, Radio,
  Hash, Mail, Phone, User, AlertTriangle, CheckCircle2,
  Clock, Megaphone, Zap, Search, Filter, Settings2,
  Play, Sparkles, Target, Bolt, Activity, UserPlus, MailX, MailCheck,
  BellRing, Smartphone, Globe, TestTube2
} from "lucide-react";
import type { SnsTopic, SnsSubscriber, SnsMessage, SnsTrigger, SnsScheduledNotification } from "@shared/schema";

const ICON_MAP: Record<string, any> = {
  zap: Zap, bolt: Bolt, bell: Bell, mail: Mail, target: Target,
  activity: Activity, sparkles: Sparkles, alert: AlertTriangle,
  users: Users, send: Send, megaphone: Megaphone, hash: Hash,
  radio: Radio, play: Play, clock: Clock,
};

const COLOR_OPTIONS = [
  { value: "text-violet-500", label: "Purple" },
  { value: "text-blue-500", label: "Blue" },
  { value: "text-emerald-500", label: "Green" },
  { value: "text-amber-500", label: "Amber" },
  { value: "text-red-500", label: "Red" },
  { value: "text-cyan-500", label: "Cyan" },
  { value: "text-pink-500", label: "Pink" },
  { value: "text-orange-500", label: "Orange" },
];

const ICON_OPTIONS = Object.keys(ICON_MAP);

function WebPushSection() {
  const { toast } = useToast();
  const [pushSupported] = useState(() => "serviceWorker" in navigator && "PushManager" in window);
  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(true);

  const pushSubsQuery = useQuery<any[]>({ queryKey: ["/api/push/subscriptions"] });

  const testPushMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/push/test"),
    onSuccess: async (res: any) => {
      const data = await res.json();
      toast({ title: "Test push sent", description: `Sent to ${data.sent} of ${data.total} subscribers` });
    },
    onError: () => toast({ title: "Failed to send test push", variant: "destructive" }),
  });

  useEffect(() => {
    if (!pushSupported) { setChecking(false); return; }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
      setChecking(false);
    }).catch(() => setChecking(false));
  }, [pushSupported]);

  async function subscribeToPush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const res = await fetch("/api/push/vapid-key");
      const { publicKey } = await res.json();
      if (!publicKey) {
        toast({ title: "VAPID key not configured", variant: "destructive" });
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const subJson = sub.toJSON();
      await apiRequest("POST", "/api/push/subscribe", {
        endpoint: sub.endpoint,
        keys: { p256dh: subJson.keys?.p256dh, auth: subJson.keys?.auth },
        userType: "admin",
      });
      setSubscribed(true);
      queryClient.invalidateQueries({ queryKey: ["/api/push/subscriptions"] });
      toast({ title: "Subscribed to push notifications" });
    } catch (err: any) {
      toast({ title: "Subscription failed", description: err.message, variant: "destructive" });
    }
  }

  async function unsubscribeFromPush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiRequest("POST", "/api/push/unsubscribe", { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      queryClient.invalidateQueries({ queryKey: ["/api/push/subscriptions"] });
      toast({ title: "Unsubscribed from push notifications" });
    } catch (err: any) {
      toast({ title: "Unsubscribe failed", description: err.message, variant: "destructive" });
    }
  }

  const subs = pushSubsQuery.data || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BellRing className="w-5 h-5 text-violet-500" /> Web Push Notifications
          </CardTitle>
          <CardDescription>
            Browser-based push notifications. When triggers fire, all subscribed browsers receive instant push alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pushSupported ? (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Push notifications are not supported in this browser.</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${subscribed ? "bg-emerald-500" : "bg-gray-400"}`} />
                <span className="text-sm font-medium">
                  {checking ? "Checking..." : subscribed ? "This browser is subscribed" : "This browser is not subscribed"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {subscribed ? (
                  <Button size="sm" variant="outline" onClick={unsubscribeFromPush} data-testid="button-unsubscribe-push">
                    <BellRing className="w-3.5 h-3.5 mr-1.5" /> Unsubscribe
                  </Button>
                ) : (
                  <Button size="sm" onClick={subscribeToPush} className="bg-violet-600 hover:bg-violet-700" data-testid="button-subscribe-push">
                    <BellRing className="w-3.5 h-3.5 mr-1.5" /> Enable Push
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testPushMut.mutate()}
                  disabled={testPushMut.isPending || subs.length === 0}
                  data-testid="button-test-push"
                >
                  <TestTube2 className="w-3.5 h-3.5 mr-1.5" /> Test Push
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="w-4 h-4 text-blue-500" /> Active Subscriptions
            <Badge variant="secondary" className="ml-1">{subs.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pushSubsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : subs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No push subscriptions yet</p>
              <p className="text-xs mt-1">Click "Enable Push" above to subscribe this browser</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subs.map((sub: any, i: number) => (
                <div key={sub.id || i} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border" data-testid={`push-sub-${i}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Smartphone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-mono truncate max-w-[180px] sm:max-w-[300px]">{sub.endpoint?.split("/").pop()}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{sub.userType || "visitor"}</Badge>
                        {sub.createdAt && <span className="text-[10px] text-muted-foreground">{new Date(sub.createdAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                    onClick={async () => {
                      await apiRequest("POST", "/api/push/unsubscribe", { endpoint: sub.endpoint });
                      queryClient.invalidateQueries({ queryKey: ["/api/push/subscriptions"] });
                      toast({ title: "Subscription removed" });
                    }}
                    data-testid={`button-delete-push-${i}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="w-4 h-4 text-gray-500" /> How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong className="text-foreground">1.</strong> Click "Enable Push" to subscribe this browser to notifications.</p>
          <p><strong className="text-foreground">2.</strong> When any SNS trigger fires, all subscribed browsers receive an instant push notification.</p>
          <p><strong className="text-foreground">3.</strong> Notifications work even when the browser tab is closed (as long as the browser is running).</p>
          <p><strong className="text-foreground">4.</strong> Client portal visitors can also subscribe from their portal page.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function SnsNotifications() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("triggers");
  const [topicDialog, setTopicDialog] = useState(false);
  const [subscriberDialog, setSubscriberDialog] = useState(false);
  const [messageDialog, setMessageDialog] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [topicName, setTopicName] = useState("");
  const [topicDesc, setTopicDesc] = useState("");
  const [topicTriggers, setTopicTriggers] = useState<string[]>([]);

  const [subName, setSubName] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subPhone, setSubPhone] = useState("");
  const [subTopicId, setSubTopicId] = useState("");

  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgTopicId, setMsgTopicId] = useState<string>("all");

  const [editTriggersTopicId, setEditTriggersTopicId] = useState<string | null>(null);
  const [editTriggersList, setEditTriggersList] = useState<string[]>([]);

  const [triggerDialog, setTriggerDialog] = useState(false);
  const [triggerName, setTriggerName] = useState("");
  const [triggerDesc, setTriggerDesc] = useState("");
  const [triggerIcon, setTriggerIcon] = useState("zap");
  const [triggerColor, setTriggerColor] = useState("text-violet-500");

  const [fireDialog, setFireDialog] = useState<SnsTrigger | null>(null);
  const [fireSubject, setFireSubject] = useState("");
  const [fireMessage, setFireMessage] = useState("");
  const [fireLinks, setFireLinks] = useState<{ label: string; url: string }[]>([]);
  const [fireLinkLabel, setFireLinkLabel] = useState("");
  const [fireLinkUrl, setFireLinkUrl] = useState("");
  const [fireSchedule, setFireSchedule] = useState(false);
  const [fireScheduleDate, setFireScheduleDate] = useState("");

  const { data: snsStatus } = useQuery<{ configured: boolean; region: string | null }>({
    queryKey: ["/api/sns/status"],
  });

  const { data: topics = [], isLoading: topicsLoading } = useQuery<SnsTopic[]>({
    queryKey: ["/api/sns/topics"],
  });

  const { data: subscribers = [], isLoading: subsLoading } = useQuery<SnsSubscriber[]>({
    queryKey: ["/api/sns/subscribers"],
  });

  const { data: messages = [], isLoading: msgsLoading } = useQuery<SnsMessage[]>({
    queryKey: ["/api/sns/messages"],
  });

  const { data: customTriggers = [], isLoading: triggersLoading } = useQuery<SnsTrigger[]>({
    queryKey: ["/api/sns/triggers"],
  });

  const { data: scheduledNotifications = [] } = useQuery<SnsScheduledNotification[]>({
    queryKey: ["/api/sns/scheduled"],
  });

  const deleteScheduledMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sns/scheduled/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sns/scheduled"] });
      toast({ title: "Scheduled Notification Cancelled" });
    },
  });

  const createTriggerMut = useMutation({
    mutationFn: (data: { name: string; description: string | null; icon: string; color: string }) =>
      apiRequest("POST", "/api/sns/triggers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sns/triggers"] });
      setTriggerDialog(false);
      setTriggerName("");
      setTriggerDesc("");
      setTriggerIcon("zap");
      setTriggerColor("text-violet-500");
      toast({ title: "Trigger Created", description: "Your custom trigger is ready. Assign it to topics to start using it." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteTriggerMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sns/triggers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sns/triggers"] });
      toast({ title: "Trigger Deleted" });
    },
  });

  const fireTriggerMut = useMutation({
    mutationFn: ({ slug, subject, message, htmlMessage, scheduledAt }: { slug: string; subject: string; message: string; htmlMessage?: string; scheduledAt?: string }) =>
      apiRequest("POST", `/api/sns/triggers/${slug}/fire`, { subject, message, htmlMessage, scheduledAt }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sns/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sns/scheduled"] });
      setFireDialog(null);
      setFireSubject("");
      setFireMessage("");
      setFireLinks([]);
      setFireSchedule(false);
      setFireScheduleDate("");
      toast({
        title: variables.scheduledAt ? "Notification Scheduled" : "Trigger Fired",
        description: variables.scheduledAt ? `Will be sent at ${new Date(variables.scheduledAt).toLocaleString()}` : "Emails sent to all matching subscribers.",
      });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createTopicMut = useMutation({
    mutationFn: (data: { name: string; description: string; triggers: string }) =>
      apiRequest("POST", "/api/sns/topics", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sns/topics"] });
      setTopicDialog(false);
      setTopicName("");
      setTopicDesc("");
      setTopicTriggers([]);
      toast({ title: "Topic Created", description: "Your notification topic is ready with triggers configured." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateTriggersMut = useMutation({
    mutationFn: ({ id, triggers }: { id: string; triggers: string }) =>
      apiRequest("PATCH", `/api/sns/topics/${id}`, { triggers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sns/topics"] });
      setEditTriggersTopicId(null);
      toast({ title: "Triggers Updated", description: "Event triggers saved successfully." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteTopicMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sns/topics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sns/topics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sns/subscribers"] });
      toast({ title: "Topic Deleted" });
    },
  });

  const createSubMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sns/subscribers", { topicId: subTopicId, name: subName, email: subEmail || null, phone: subPhone || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sns/subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sns/topics"] });
      setSubscriberDialog(false);
      setSubName("");
      setSubEmail("");
      setSubPhone("");
      setSubTopicId("");
      toast({ title: "Subscriber Added", description: "Contact subscribed to notifications." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteSubMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sns/subscribers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sns/subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sns/topics"] });
      toast({ title: "Subscriber Removed" });
    },
  });

  const toggleSubStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/sns/subscribers/${id}/status`, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sns/subscribers"] });
      toast({
        title: variables.status === "unsubscribed" ? "Subscriber Unsubscribed" : "Subscriber Resubscribed",
        description: variables.status === "unsubscribed" ? "They will no longer receive emails." : "They will now receive emails again.",
      });
    },
  });

  const sendMsgMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sns/messages", {
      topicId: msgTopicId === "all" ? null : msgTopicId,
      subject: msgSubject,
      message: msgBody,
      messageType: msgTopicId === "all" ? "broadcast" : "targeted",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sns/messages"] });
      setMessageDialog(false);
      setMsgSubject("");
      setMsgBody("");
      setMsgTopicId("all");
      toast({ title: "Message Sent", description: "Your notification has been dispatched." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filteredSubscribers = subscribers.filter((s) => {
    const matchesTopic = selectedTopicId === "all" || s.topicId === selectedTopicId;
    const matchesSearch = !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone?.includes(searchQuery);
    return matchesTopic && matchesSearch;
  });

  const getTopicName = (id: string | null) => topics.find((t) => t.id === id)?.name || "All Topics";
  const getTopicTriggers = (topic: SnsTopic) => topic.triggers ? topic.triggers.split(",").map(s => s.trim()).filter(Boolean) : [];
  const getIconComponent = (iconName: string) => ICON_MAP[iconName] || Zap;

  const toggleTrigger = (triggerId: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(triggerId) ? list.filter(t => t !== triggerId) : [...list, triggerId]);
  };

  const totalSubscribers = subscribers.length;
  const totalMessages = messages.length;
  const activeTopics = topics.length;

  return (
    <div className="space-y-6" data-testid="page-sns-notifications">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            SNS Notifications
          </h1>
          <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm">
            Create triggers, assign to topics, and manage subscribers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {snsStatus?.configured ? (
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs" data-testid="badge-sns-connected">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              AWS Connected ({snsStatus.region})
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/30 gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs" data-testid="badge-sns-pending">
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Keys Not Set
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20" data-testid="card-stat-triggers">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Triggers</p>
                <p className="text-2xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{customTriggers.length}</p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20" data-testid="card-stat-topics">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Topics</p>
                <p className="text-2xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{activeTopics}</p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <Radio className="w-4 h-4 sm:w-6 sm:h-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20" data-testid="card-stat-subscribers">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Subscribers</p>
                <p className="text-2xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{totalSubscribers}</p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20" data-testid="card-stat-messages">
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Sent</p>
                <p className="text-2xl sm:text-3xl font-bold mt-0.5 sm:mt-1">{totalMessages}</p>
              </div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Send className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="w-full overflow-x-auto -mx-1 px-1 pb-1">
            <TabsList className="bg-muted/50 w-max sm:w-auto" data-testid="tabs-sns">
              <TabsTrigger value="triggers" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3" data-testid="tab-triggers">
                <Zap className="w-3.5 h-3.5 flex-shrink-0" /> Triggers
              </TabsTrigger>
              <TabsTrigger value="topics" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3" data-testid="tab-topics">
                <Radio className="w-3.5 h-3.5 flex-shrink-0" /> Topics
              </TabsTrigger>
              <TabsTrigger value="subscribers" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3" data-testid="tab-subscribers">
                <Users className="w-3.5 h-3.5 flex-shrink-0" /> Subs
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3" data-testid="tab-messages">
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" /> Msgs
              </TabsTrigger>
              <TabsTrigger value="webpush" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3" data-testid="tab-webpush">
                <BellRing className="w-3.5 h-3.5 flex-shrink-0" /> Push
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "triggers" && (
              <Dialog open={triggerDialog} onOpenChange={setTriggerDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5" data-testid="button-create-trigger">
                    <Plus className="w-4 h-4" /> New Trigger
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-create-trigger">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-500" /> Create Custom Trigger
                    </DialogTitle>
                    <DialogDescription>Define a new event trigger. Once created, assign it to topics and fire it whenever you need.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Trigger Name</Label>
                      <Input placeholder="e.g. Contract Signed, Website Launched, Payment Failed" value={triggerName} onChange={(e) => setTriggerName(e.target.value)} data-testid="input-trigger-name" />
                      {triggerName && (
                        <p className="text-xs text-muted-foreground">
                          Slug: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{triggerName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}</code>
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea placeholder="What does this trigger do?" value={triggerDesc} onChange={(e) => setTriggerDesc(e.target.value)} rows={2} data-testid="input-trigger-description" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Icon</Label>
                        <Select value={triggerIcon} onValueChange={setTriggerIcon}>
                          <SelectTrigger data-testid="select-trigger-icon">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ICON_OPTIONS.map((iconName) => {
                              const IconComp = ICON_MAP[iconName];
                              return (
                                <SelectItem key={iconName} value={iconName}>
                                  <div className="flex items-center gap-2">
                                    <IconComp className="w-4 h-4" />
                                    <span className="capitalize">{iconName}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <Select value={triggerColor} onValueChange={setTriggerColor}>
                          <SelectTrigger data-testid="select-trigger-color">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLOR_OPTIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${c.value.replace("text-", "bg-")}`} />
                                  {c.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs font-medium mb-1">Preview</p>
                      <div className="flex items-center gap-2">
                        {(() => { const IC = getIconComponent(triggerIcon); return <IC className={`w-5 h-5 ${triggerColor}`} />; })()}
                        <span className="font-medium text-sm">{triggerName || "Trigger Name"}</span>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTriggerDialog(false)} data-testid="button-cancel-trigger">Cancel</Button>
                    <Button
                      onClick={() => createTriggerMut.mutate({ name: triggerName, description: triggerDesc || null, icon: triggerIcon, color: triggerColor })}
                      disabled={!triggerName || createTriggerMut.isPending}
                      data-testid="button-save-trigger"
                    >
                      {createTriggerMut.isPending ? "Creating..." : "Create Trigger"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {activeTab === "topics" && (
              <Dialog open={topicDialog} onOpenChange={setTopicDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5" data-testid="button-create-topic">
                    <Plus className="w-4 h-4" /> New Topic
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg" data-testid="dialog-create-topic">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Radio className="w-5 h-5 text-primary" /> Create Topic
                    </DialogTitle>
                    <DialogDescription>Create a topic and assign your custom triggers to it.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Topic Name</Label>
                      <Input placeholder="e.g. Client Alerts" value={topicName} onChange={(e) => setTopicName(e.target.value)} data-testid="input-topic-name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea placeholder="What is this topic about?" value={topicDesc} onChange={(e) => setTopicDesc(e.target.value)} rows={2} data-testid="input-topic-description" />
                    </div>
                    {customTriggers.length > 0 && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" /> Assign Triggers
                        </Label>
                        <p className="text-xs text-muted-foreground">Select which of your custom triggers should fire notifications to this topic.</p>
                        <div className="grid gap-2 mt-2 max-h-60 overflow-y-auto">
                          {customTriggers.map((trigger) => {
                            const IconComp = getIconComponent(trigger.icon || "zap");
                            return (
                              <label
                                key={trigger.id}
                                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                  topicTriggers.includes(trigger.slug)
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-muted-foreground/30"
                                }`}
                                data-testid={`trigger-checkbox-${trigger.slug}`}
                              >
                                <Checkbox
                                  checked={topicTriggers.includes(trigger.slug)}
                                  onCheckedChange={() => toggleTrigger(trigger.slug, topicTriggers, setTopicTriggers)}
                                />
                                <IconComp className={`w-4 h-4 ${trigger.color || "text-violet-500"} flex-shrink-0`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">{trigger.name}</p>
                                  {trigger.description && <p className="text-[11px] text-muted-foreground">{trigger.description}</p>}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {customTriggers.length === 0 && (
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          No triggers created yet. Go to the Triggers tab first to create your custom triggers.
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTopicDialog(false)} data-testid="button-cancel-topic">Cancel</Button>
                    <Button
                      onClick={() => createTopicMut.mutate({ name: topicName, description: topicDesc, triggers: topicTriggers.join(",") })}
                      disabled={!topicName || createTopicMut.isPending}
                      data-testid="button-save-topic"
                    >
                      {createTopicMut.isPending ? "Creating..." : "Create Topic"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {activeTab === "subscribers" && (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="pl-9 w-32 sm:w-48"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-subscribers"
                  />
                </div>
                <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                  <SelectTrigger className="w-28 sm:w-40" data-testid="select-filter-topic">
                    <Filter className="w-3.5 h-3.5 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {topics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={subscriberDialog} onOpenChange={setSubscriberDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5" data-testid="button-add-subscriber">
                      <Plus className="w-4 h-4" /> Add Subscriber
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="dialog-add-subscriber">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" /> Add Subscriber
                      </DialogTitle>
                      <DialogDescription>Subscribe a contact to receive notifications via email or SMS.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label>Topic</Label>
                        <Select value={subTopicId} onValueChange={setSubTopicId}>
                          <SelectTrigger data-testid="select-sub-topic">
                            <SelectValue placeholder="Select topic" />
                          </SelectTrigger>
                          <SelectContent>
                            {topics.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input placeholder="John Doe" value={subName} onChange={(e) => setSubName(e.target.value)} data-testid="input-sub-name" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input type="email" placeholder="john@example.com" value={subEmail} onChange={(e) => setSubEmail(e.target.value)} data-testid="input-sub-email" />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input type="tel" placeholder="+1 555-123-4567" value={subPhone} onChange={(e) => setSubPhone(e.target.value)} data-testid="input-sub-phone" />
                      </div>
                      <p className="text-xs text-muted-foreground">At least one of email or phone is required.</p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSubscriberDialog(false)} data-testid="button-cancel-subscriber">Cancel</Button>
                      <Button
                        onClick={() => createSubMut.mutate()}
                        disabled={!subName || !subTopicId || (!subEmail && !subPhone) || createSubMut.isPending}
                        data-testid="button-save-subscriber"
                      >
                        {createSubMut.isPending ? "Adding..." : "Add Subscriber"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {activeTab === "messages" && (
              <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5" data-testid="button-compose-message">
                    <Megaphone className="w-4 h-4" /> Compose Message
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg" data-testid="dialog-compose-message">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Send className="w-5 h-5 text-primary" /> Send Notification
                    </DialogTitle>
                    <DialogDescription>Send a notification to a specific topic or broadcast to all subscribers.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Target</Label>
                      <Select value={msgTopicId} onValueChange={setMsgTopicId}>
                        <SelectTrigger data-testid="select-msg-topic">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subscribers (Broadcast)</SelectItem>
                          {topics.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name} ({t.subscriberCount || 0} subscribers)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input placeholder="Notification subject" value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} data-testid="input-msg-subject" />
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea
                        placeholder="Write your notification message..."
                        value={msgBody}
                        onChange={(e) => setMsgBody(e.target.value)}
                        rows={5}
                        className="resize-none"
                        data-testid="input-msg-body"
                      />
                    </div>
                    {!snsStatus?.configured && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          AWS credentials not configured. Messages will be saved but not delivered via SNS until you add your keys.
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setMessageDialog(false)} data-testid="button-cancel-message">Cancel</Button>
                    <Button
                      onClick={() => sendMsgMut.mutate()}
                      disabled={!msgSubject || !msgBody || sendMsgMut.isPending}
                      className="gap-1.5"
                      data-testid="button-send-message"
                    >
                      <Send className="w-4 h-4" />
                      {sendMsgMut.isPending ? "Sending..." : "Send Notification"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* TRIGGERS TAB */}
        <TabsContent value="triggers" className="space-y-4">
          {triggersLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading triggers...</div>
          ) : customTriggers.length === 0 ? (
            <Card className="border-dashed" data-testid="card-empty-triggers">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 flex items-center justify-center mb-4">
                  <Zap className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Create Your First Trigger</h3>
                <p className="text-sm text-muted-foreground mb-2 max-w-md">
                  Triggers are custom events you define. Create a trigger like "Contract Signed" or "Website Launched",
                  then assign it to a topic. When the event happens, click "Fire" and all subscribers get notified instantly.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-xs text-muted-foreground mb-6">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 font-bold text-[10px]">1</div>
                    Create triggers
                  </div>
                  <div className="text-muted-foreground/40 hidden sm:block">→</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 font-bold text-[10px]">2</div>
                    Assign to topics
                  </div>
                  <div className="text-muted-foreground/40 hidden sm:block">→</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 font-bold text-[10px]">3</div>
                    Fire & notify
                  </div>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => setTriggerDialog(true)} data-testid="button-create-first-trigger">
                  <Plus className="w-4 h-4" /> Create Trigger
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {customTriggers.map((trigger) => {
                const IconComp = getIconComponent(trigger.icon || "zap");
                const assignedTopics = topics.filter(t => {
                  const slugs = t.triggers ? t.triggers.split(",").map(s => s.trim()) : [];
                  return slugs.includes(trigger.slug);
                });
                return (
                  <Card key={trigger.id} className="group hover:shadow-md transition-all duration-200 border-0 shadow-sm" data-testid={`card-trigger-${trigger.id}`}>
                    <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center flex-shrink-0`}>
                            <IconComp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{trigger.name}</CardTitle>
                            {trigger.description && (
                              <CardDescription className="text-xs mt-0.5 line-clamp-1">{trigger.description}</CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => {
                              setFireDialog(trigger);
                              setFireSubject(`${trigger.name} Event`);
                              setFireMessage("");
                            }}
                            data-testid={`button-fire-trigger-${trigger.id}`}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteTriggerMut.mutate(trigger.id)}
                            data-testid={`button-delete-trigger-${trigger.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2 px-3 sm:px-6 pb-3 sm:pb-6">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[9px] sm:text-[10px] font-mono gap-1">
                          <Hash className="w-3 h-3" /> {trigger.slug}
                        </Badge>
                        <Badge variant="outline" className={`text-[9px] sm:text-[10px] gap-1 ${trigger.color}`}>
                          <IconComp className="w-3 h-3" /> {trigger.icon}
                        </Badge>
                      </div>
                      {assignedTopics.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Assigned to:</p>
                          <div className="flex flex-wrap gap-1">
                            {assignedTopics.map(t => (
                              <Badge key={t.id} variant="secondary" className="text-[10px] gap-1">
                                <Radio className="w-3 h-3 text-violet-500" /> {t.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Not assigned to any topics yet</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Created {trigger.createdAt ? new Date(trigger.createdAt).toLocaleDateString() : "—"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {scheduledNotifications.filter(n => n.status === "pending").length > 0 && (
            <div className="space-y-2 mt-6">
              <div className="flex items-center gap-2 px-1">
                <Clock className="w-4 h-4 text-violet-500" />
                <h3 className="text-sm font-semibold">Scheduled Notifications</h3>
                <Badge variant="secondary" className="text-[10px]">
                  {scheduledNotifications.filter(n => n.status === "pending").length}
                </Badge>
              </div>
              {scheduledNotifications.filter(n => n.status === "pending").map(notification => {
                const trigger = customTriggers.find(t => t.slug === notification.triggerSlug);
                const TrigIcon = getIconComponent(trigger?.icon || "zap");
                return (
                  <Card key={notification.id} className="border-0 shadow-sm border-l-4 border-l-violet-500" data-testid={`card-scheduled-${notification.id}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                            <TrigIcon className={`w-4 h-4 ${trigger?.color || "text-violet-500"}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{notification.subject}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{notification.message.slice(0, 80)}{notification.message.length > 80 ? "..." : ""}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <Badge variant="outline" className="text-[10px] gap-1 border-violet-300 text-violet-600">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(notification.scheduledAt).toLocaleString()}
                              </Badge>
                              {trigger && (
                                <Badge variant="secondary" className="text-[10px] gap-1">
                                  <TrigIcon className="w-2.5 h-2.5" /> {trigger.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          onClick={() => deleteScheduledMut.mutate(notification.id)}
                          data-testid={`button-cancel-scheduled-${notification.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TOPICS TAB */}
        <TabsContent value="topics" className="space-y-4">
          {topicsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading topics...</div>
          ) : topics.length === 0 ? (
            <Card className="border-dashed" data-testid="card-empty-topics">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Radio className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No Topics Yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  {customTriggers.length === 0
                    ? "Create some triggers first in the Triggers tab, then create a topic to assign them to."
                    : "Create a topic and assign your custom triggers to start receiving notifications."}
                </p>
                <Button size="sm" className="gap-1.5" onClick={() => setTopicDialog(true)} data-testid="button-create-first-topic">
                  <Plus className="w-4 h-4" /> Create Topic
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => {
                const triggerSlugs = getTopicTriggers(topic);
                return (
                  <Card key={topic.id} className="group hover:shadow-md transition-all duration-200 border-0 shadow-sm" data-testid={`card-topic-${topic.id}`}>
                    <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{topic.name}</CardTitle>
                            {topic.description && (
                              <CardDescription className="text-xs mt-0.5 line-clamp-1">{topic.description}</CardDescription>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteTopicMut.mutate(topic.id)}
                          data-testid={`button-delete-topic-${topic.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span>{topic.subscriberCount || 0} subscribers</span>
                        </div>
                        {(() => {
                          const topicSubs = subscribers.filter(s => s.topicId === topic.id);
                          if (topicSubs.length === 0) return null;
                          return (
                            <div className="space-y-1">
                              {topicSubs.map(sub => (
                                <div key={sub.id} className="flex items-center justify-between bg-muted/40 rounded-lg px-2.5 py-1.5" data-testid={`topic-sub-${sub.id}`}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                                      <span className="text-white font-semibold text-[9px]">
                                        {sub.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                      </span>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-medium truncate">{sub.name}</p>
                                        {sub.status === "unsubscribed" && (
                                          <span className="text-[9px] text-red-500 font-medium bg-red-50 px-1 py-0.5 rounded">unsub</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-muted-foreground truncate">{sub.email || sub.phone}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={`h-6 w-6 ${sub.status === "unsubscribed" ? "text-emerald-600 hover:bg-emerald-50" : "text-amber-600 hover:bg-amber-50"}`}
                                      onClick={() => toggleSubStatusMut.mutate({
                                        id: sub.id,
                                        status: sub.status === "unsubscribed" ? "confirmed" : "unsubscribed"
                                      })}
                                      title={sub.status === "unsubscribed" ? "Resubscribe" : "Unsubscribe"}
                                      data-testid={`button-topic-toggle-sub-${sub.id}`}
                                    >
                                      {sub.status === "unsubscribed" ? <MailCheck className="w-3 h-3" /> : <MailX className="w-3 h-3" />}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => deleteSubMut.mutate(sub.id)}
                                      data-testid={`button-topic-delete-sub-${sub.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      {triggerSlugs.length > 0 ? (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-500" /> Active Triggers
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {triggerSlugs.map(slug => {
                              const ct = customTriggers.find(t => t.slug === slug);
                              if (ct) {
                                const IC = getIconComponent(ct.icon || "zap");
                                return (
                                  <Badge key={slug} variant="secondary" className="text-[10px] px-1.5 py-0.5 gap-1">
                                    <IC className={`w-3 h-3 ${ct.color || "text-violet-500"}`} />
                                    {ct.name}
                                  </Badge>
                                );
                              }
                              return (
                                <Badge key={slug} variant="secondary" className="text-[10px] px-1.5 py-0.5 gap-1">
                                  <Zap className="w-3 h-3" /> {slug}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No triggers assigned</p>
                      )}
                      <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 mt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5 text-xs sm:text-sm"
                          onClick={() => {
                            setSubTopicId(topic.id);
                            setSubName("");
                            setSubEmail("");
                            setSubPhone("");
                            setSubscriberDialog(true);
                          }}
                          data-testid={`button-quick-add-sub-${topic.id}`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Add Subscriber
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5 text-xs sm:text-sm"
                          onClick={() => {
                            setEditTriggersTopicId(topic.id);
                            setEditTriggersList(triggerSlugs);
                          }}
                          data-testid={`button-edit-triggers-${topic.id}`}
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          {triggerSlugs.length > 0 ? "Edit Triggers" : "Assign Triggers"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {topic.createdAt ? new Date(topic.createdAt).toLocaleDateString() : "—"}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* SUBSCRIBERS TAB */}
        <TabsContent value="subscribers" className="space-y-3">
          {subsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading subscribers...</div>
          ) : filteredSubscribers.length === 0 ? (
            <Card className="border-dashed" data-testid="card-empty-subscribers">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No Subscribers Yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  {topics.length === 0
                    ? "Create a topic first, then add subscribers to start sending notifications."
                    : "Add your first subscriber to start sending notifications."}
                </p>
                {topics.length > 0 && (
                  <Button size="sm" className="gap-1.5" onClick={() => setSubscriberDialog(true)} data-testid="button-add-first-subscriber">
                    <Plus className="w-4 h-4" /> Add Subscriber
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {(() => {
                const activeSubs = filteredSubscribers.filter(s => s.status !== "unsubscribed");
                const unsubSubs = filteredSubscribers.filter(s => s.status === "unsubscribed");
                const renderSubCard = (sub: SnsSubscriber) => (
                  <Card key={sub.id} className="group border-0 shadow-sm hover:shadow-md transition-all duration-200" data-testid={`card-subscriber-${sub.id}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${sub.status === "unsubscribed" ? "bg-gradient-to-br from-gray-400 to-gray-500" : "bg-gradient-to-br from-blue-500 to-cyan-500"}`}>
                          <span className="text-white font-semibold text-xs sm:text-sm">
                            {sub.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className={`font-medium text-sm truncate ${sub.status === "unsubscribed" ? "text-muted-foreground line-through" : ""}`}>{sub.name}</p>
                              <Badge
                                variant="outline"
                                className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 flex-shrink-0 ${
                                  sub.status === "confirmed" ? "border-emerald-300 text-emerald-600" :
                                  sub.status === "unsubscribed" ? "border-red-300 text-red-500" :
                                  "border-amber-300 text-amber-600"
                                }`}
                              >
                                {sub.status === "unsubscribed" ? "unsub" : sub.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-7 w-7 sm:h-8 sm:w-8 ${sub.status === "unsubscribed" ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}`}
                                onClick={() => toggleSubStatusMut.mutate({
                                  id: sub.id,
                                  status: sub.status === "unsubscribed" ? "confirmed" : "unsubscribed"
                                })}
                                title={sub.status === "unsubscribed" ? "Resubscribe" : "Unsubscribe"}
                                data-testid={`button-toggle-subscriber-${sub.id}`}
                              >
                                {sub.status === "unsubscribed" ? <MailCheck className="w-3.5 h-3.5" /> : <MailX className="w-3.5 h-3.5" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => deleteSubMut.mutate(sub.id)}
                                data-testid={`button-delete-subscriber-${sub.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 mt-1">
                            {sub.email && (
                              <span className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{sub.email}</span>
                              </span>
                            )}
                            {sub.phone && (
                              <span className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3 flex-shrink-0" /> {sub.phone}
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5">
                            <Badge variant="secondary" className="text-[9px] sm:text-[10px] gap-1 px-1.5">
                              <Hash className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              {getTopicName(sub.topicId)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
                return (
                  <>
                    {activeSubs.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <h3 className="text-sm font-semibold">Active Subscribers</h3>
                          <Badge variant="secondary" className="text-[10px]">{activeSubs.length}</Badge>
                        </div>
                        {activeSubs.map(renderSubCard)}
                      </div>
                    )}
                    {unsubSubs.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <MailX className="w-4 h-4 text-red-500" />
                          <h3 className="text-sm font-semibold">Unsubscribed</h3>
                          <Badge variant="outline" className="text-[10px] border-red-300 text-red-500">{unsubSubs.length}</Badge>
                        </div>
                        {unsubSubs.map(renderSubCard)}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </TabsContent>

        {/* MESSAGES TAB */}
        <TabsContent value="messages" className="space-y-3">
          {msgsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading messages...</div>
          ) : messages.length === 0 ? (
            <Card className="border-dashed" data-testid="card-empty-messages">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Megaphone className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No Messages Sent</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Compose and send your first notification to subscribers.
                </p>
                <Button size="sm" className="gap-1.5" onClick={() => setMessageDialog(true)} data-testid="button-compose-first-message">
                  <Send className="w-4 h-4" /> Compose Message
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <Card key={msg.id} className="border-0 shadow-sm" data-testid={`card-message-${msg.id}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
                        msg.messageType === "broadcast"
                          ? "bg-gradient-to-br from-amber-500 to-orange-500"
                          : msg.messageType === "event"
                          ? "bg-gradient-to-br from-violet-500 to-purple-600"
                          : "bg-gradient-to-br from-emerald-500 to-teal-500"
                      }`}>
                        {msg.messageType === "broadcast" ? (
                          <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        ) : msg.messageType === "event" ? (
                          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        ) : (
                          <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          <p className="font-medium text-xs sm:text-sm">{msg.subject}</p>
                          <Badge variant={msg.status === "sent" ? "default" : "secondary"} className="text-[9px] sm:text-[10px]">
                            {msg.status}
                          </Badge>
                          {msg.messageType === "event" && (
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] border-violet-300 text-violet-600 gap-0.5">
                              <Zap className="w-2.5 h-2.5" /> Auto
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{msg.message}</p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2">
                          <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" /> {msg.recipientCount || 0}
                          </span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : "—"}
                          </span>
                          {msg.topicId && (
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] gap-1">
                              <Hash className="w-3 h-3" /> {getTopicName(msg.topicId)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="webpush" className="space-y-4">
          <WebPushSection />
        </TabsContent>
      </Tabs>

      {/* Edit Triggers Dialog */}
      <Dialog open={!!editTriggersTopicId} onOpenChange={(open) => { if (!open) setEditTriggersTopicId(null); }}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-edit-triggers">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" /> Edit Triggers
            </DialogTitle>
            <DialogDescription>
              Choose which triggers fire notifications for "{topics.find(t => t.id === editTriggersTopicId)?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
            {customTriggers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No triggers created yet. Go to the Triggers tab to create some first.</p>
            ) : (
              customTriggers.map((trigger) => {
                const IconComp = getIconComponent(trigger.icon || "zap");
                return (
                  <label
                    key={trigger.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      editTriggersList.includes(trigger.slug)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                    data-testid={`edit-trigger-${trigger.slug}`}
                  >
                    <Checkbox
                      checked={editTriggersList.includes(trigger.slug)}
                      onCheckedChange={() => toggleTrigger(trigger.slug, editTriggersList, setEditTriggersList)}
                    />
                    <IconComp className={`w-4 h-4 ${trigger.color || "text-violet-500"} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{trigger.name}</p>
                      {trigger.description && <p className="text-[11px] text-muted-foreground">{trigger.description}</p>}
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTriggersTopicId(null)} data-testid="button-cancel-edit-triggers">Cancel</Button>
            <Button
              onClick={() => editTriggersTopicId && updateTriggersMut.mutate({ id: editTriggersTopicId, triggers: editTriggersList.join(",") })}
              disabled={updateTriggersMut.isPending}
              data-testid="button-save-triggers"
            >
              {updateTriggersMut.isPending ? "Saving..." : "Save Triggers"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fire Trigger Dialog */}
      <Dialog open={!!fireDialog} onOpenChange={(open) => { if (!open) setFireDialog(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" data-testid="dialog-fire-trigger">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Play className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" /> Fire — {fireDialog?.name}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Compose a message for all subscribers on matching topics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-1 sm:py-2">
            <div className="space-y-2">
              <Label>Email Subject</Label>
              <Input placeholder="e.g. Your new community is ready!" value={fireSubject} onChange={(e) => setFireSubject(e.target.value)} data-testid="input-fire-subject" />
            </div>
            <div className="space-y-2">
              <Label>Message Body</Label>
              <Textarea
                placeholder={"Write your message here...\n\nUse [link text](https://url.com) for inline hyperlinks.\nLinks added below will appear as buttons."}
                value={fireMessage}
                onChange={(e) => setFireMessage(e.target.value)}
                rows={6}
                data-testid="input-fire-message"
              />
              <p className="text-[11px] text-muted-foreground">
                Supports inline hyperlinks: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">[click here](https://example.com)</code> — URLs typed directly will also be auto-linked.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" /> Add Links / Buttons
              </Label>
              {fireLinks.length > 0 && (
                <div className="space-y-1.5">
                  {fireLinks.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border text-sm">
                      <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="font-medium truncate">{link.label}</span>
                      <span className="text-muted-foreground truncate text-xs flex-1">{link.url}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive flex-shrink-0"
                        onClick={() => setFireLinks(fireLinks.filter((_, j) => j !== i))}
                        data-testid={`button-remove-link-${i}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  placeholder="Button text"
                  className="flex-1"
                  value={fireLinkLabel}
                  onChange={(e) => setFireLinkLabel(e.target.value)}
                  data-testid="input-link-label"
                />
                <Input
                  placeholder="https://..."
                  className="flex-1"
                  value={fireLinkUrl}
                  onChange={(e) => setFireLinkUrl(e.target.value)}
                  data-testid="input-link-url"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="sm:w-auto"
                  disabled={!fireLinkLabel || !fireLinkUrl}
                  onClick={() => {
                    setFireLinks([...fireLinks, { label: fireLinkLabel, url: fireLinkUrl }]);
                    setFireLinkLabel("");
                    setFireLinkUrl("");
                  }}
                  data-testid="button-add-link"
                >
                  <Plus className="w-4 h-4 mr-1 sm:mr-0" /> <span className="sm:hidden">Add Link</span>
                </Button>
              </div>
            </div>
            {fireDialog && (() => {
              const assignedTopics = topics.filter(t => {
                const slugs = t.triggers ? t.triggers.split(",").map(s => s.trim()) : [];
                return slugs.includes(fireDialog.slug);
              });
              const totalEmailSubs = assignedTopics.reduce((sum, t) => {
                const topicSubs = subscribers.filter(s => s.topicId === t.id && s.email);
                return sum + topicSubs.length;
              }, 0);
              const totalSmsSubs = assignedTopics.reduce((sum, t) => {
                const topicSubs = subscribers.filter(s => s.topicId === t.id && s.phone);
                return sum + topicSubs.length;
              }, 0);
              return assignedTopics.length > 0 ? (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-2">Will deliver to:</p>
                  <div className="flex flex-wrap gap-2">
                    {totalEmailSubs > 0 && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Mail className="w-3 h-3 text-blue-500" /> {totalEmailSubs} email{totalEmailSubs !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {totalSmsSubs > 0 && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Phone className="w-3 h-3 text-emerald-500" /> {totalSmsSubs} SMS (when AWS configured)
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {assignedTopics.map(t => (
                      <Badge key={t.id} variant="outline" className="text-[10px] gap-1">
                        <Radio className="w-3 h-3" /> {t.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    This trigger isn't assigned to any topics yet. Assign it to a topic first.
                  </p>
                </div>
              );
            })()}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="schedule-toggle"
                  checked={fireSchedule}
                  onCheckedChange={(checked) => {
                    setFireSchedule(!!checked);
                    if (!checked) setFireScheduleDate("");
                  }}
                  data-testid="checkbox-schedule"
                />
                <Label htmlFor="schedule-toggle" className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <Clock className="w-3.5 h-3.5 text-violet-500" /> Schedule for later
                </Label>
              </div>
              {fireSchedule && (
                <Input
                  type="datetime-local"
                  value={fireScheduleDate}
                  onChange={(e) => setFireScheduleDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full"
                  data-testid="input-schedule-date"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFireDialog(null)} data-testid="button-cancel-fire">Cancel</Button>
            <Button
              onClick={() => {
                if (!fireDialog) return;
                const linksHtml = fireLinks.length > 0
                  ? `<div style="margin-top:24px;text-align:center">${fireLinks.map(l =>
                      `<a href="${l.url}" style="display:inline-block;margin:6px 8px;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">${l.label}</a>`
                    ).join("")}</div>`
                  : "";
                let messageHtml = fireMessage
                  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                messageHtml = messageHtml.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
                  '<a href="$2" style="color:#6366f1;text-decoration:underline;font-weight:500">$1</a>');
                messageHtml = messageHtml.replace(
                  /(?<!href=")(https?:\/\/[^\s<\)]+)/g,
                  '<a href="$1" style="color:#6366f1;text-decoration:underline">$1</a>'
                );
                messageHtml = messageHtml.replace(/\n/g, "<br>");
                const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07)">
<tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:600">${fireSubject}</h1>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px">AI Powered Sites</p>
</td></tr>
<tr><td style="padding:28px 32px">
<div style="font-size:15px;line-height:1.7;color:#374151">${messageHtml}</div>
${linksHtml}
</td></tr>
<tr><td style="padding:0 32px 28px">
<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px">
<p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">Sent by AI Powered Sites Notifications</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
                fireTriggerMut.mutate({
                  slug: fireDialog.slug,
                  subject: fireSubject,
                  message: fireMessage,
                  htmlMessage: fullHtml,
                  scheduledAt: fireSchedule && fireScheduleDate ? new Date(fireScheduleDate).toISOString() : undefined,
                });
              }}
              disabled={!fireSubject || !fireMessage || fireTriggerMut.isPending || (fireSchedule && !fireScheduleDate)}
              className={`gap-1.5 ${fireSchedule ? "bg-violet-600 hover:bg-violet-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
              data-testid="button-confirm-fire"
            >
              {fireSchedule ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {fireTriggerMut.isPending ? "Processing..." : fireSchedule ? "Schedule Notification" : "Send Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
