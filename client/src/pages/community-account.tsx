import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera,
  Save,
  Monitor,
  Smartphone,
  Globe,
  Shield,
  Lock,
  Mail,
  Calendar,
  Loader2,
  ArrowLeft,
  User,
  X,
} from "lucide-react";

interface CommunityUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  customerId?: string | null;
  isActive?: boolean;
  lastSeenAt?: string | null;
  createdAt: string;
}

interface Session {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastSeenAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  isCurrent: boolean;
}

const AVATAR_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-purple-500 to-violet-600",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-500",
  "from-amber-500 to-orange-600",
  "from-indigo-500 to-purple-600",
];

function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return "Unknown Browser";

  let browser = "Unknown Browser";
  let os = "";

  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";
  else if (ua.includes("Opera/") || ua.includes("OPR/")) browser = "Opera";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  if (os) return `${browser} on ${os}`;
  return browser;
}

function getDeviceIcon(ua: string | null) {
  if (!ua) return Monitor;
  if (ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone")) {
    return Smartphone;
  }
  return Monitor;
}

function formatMemberSince(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function CommunityAccount() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery<CommunityUser | null>({
    queryKey: ["/api/community/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 60000,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ["/api/community/auth/sessions"],
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
    }
  }, [user]);

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/community");
    }
  }, [userLoading, user, setLocation]);

  const hasChanges =
    user &&
    (displayName !== (user.displayName || "") || bio !== (user.bio || ""));

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName?: string; bio?: string; avatarUrl?: string }) => {
      const res = await apiRequest("PATCH", "/api/community/auth/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/auth/me"] });
      toast({ title: "Profile updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await apiRequest("DELETE", `/api/community/auth/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/auth/sessions"] });
      toast({ title: "Session revoked" });
    },
    onError: () => {
      toast({ title: "Failed to revoke session", variant: "destructive" });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      displayName: displayName.trim(),
      bio: bio.trim(),
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });

      if (!res.ok) throw new Error("Failed to get upload URL");

      const { uploadURL, objectPath } = await res.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload file");

      await apiRequest("PATCH", "/api/community/auth/profile", {
        avatarUrl: objectPath,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/community/auth/me"] });
      toast({ title: "Avatar updated" });
    } catch {
      toast({ title: "Failed to upload avatar", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background" data-testid="page-community-account">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/community")}
            data-testid="button-back-community"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
              My Account
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile and account settings
            </p>
          </div>
        </div>

        <Card data-testid="card-profile">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Your public profile information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="relative group shrink-0">
                <Avatar
                  className="h-24 w-24 ring-4 ring-background shadow-md cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="avatar-profile"
                >
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
                  <AvatarFallback
                    className={`bg-gradient-to-br ${getAvatarGradient(user.displayName)} text-white text-2xl font-bold`}
                  >
                    {getInitials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  disabled={isUploading}
                  data-testid="button-upload-avatar"
                >
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  data-testid="input-avatar-file"
                />
              </div>

              <div className="flex-1 w-full space-y-1 text-center sm:text-left">
                <h2 className="text-xl font-semibold" data-testid="text-display-name">
                  {user.displayName}
                </h2>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground justify-center sm:justify-start flex-wrap">
                  <Mail className="w-3.5 h-3.5" />
                  <span data-testid="text-email">{user.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground justify-center sm:justify-start flex-wrap">
                  <Calendar className="w-3.5 h-3.5" />
                  <span data-testid="text-member-since">
                    Member since {formatMemberSince(user.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="displayName">
                  Display Name
                </label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  data-testid="input-display-name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="opacity-60"
                  data-testid="input-email-readonly"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="bio">
                  Bio
                </label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="resize-none min-h-[100px]"
                  data-testid="textarea-bio"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  disabled={!hasChanges || updateProfileMutation.isPending}
                  className="gap-2"
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-sessions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5" />
              Login Sessions
            </CardTitle>
            <CardDescription>
              Devices where your account is currently logged in
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No active sessions found
              </p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const DeviceIcon = getDeviceIcon(session.userAgent);
                  return (
                    <div
                      key={session.id}
                      className={`flex items-center gap-4 rounded-lg p-3 transition-colors flex-wrap ${
                        session.isCurrent
                          ? "bg-primary/5 dark:bg-primary/10 border border-primary/20"
                          : "bg-muted/30 dark:bg-muted/15 border border-transparent"
                      }`}
                      data-testid={`session-${session.id}`}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted/50 dark:bg-muted/30 shrink-0">
                        <DeviceIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" data-testid={`text-session-device-${session.id}`}>
                            {parseUserAgent(session.userAgent)}
                          </span>
                          {session.isCurrent && (
                            <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-primary/10 text-primary border-0 font-semibold">
                              Current Session
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {session.ipAddress && (
                            <span className="flex items-center gap-1" data-testid={`text-session-ip-${session.id}`}>
                              <Globe className="w-3 h-3" />
                              {session.ipAddress}
                            </span>
                          )}
                          {session.lastSeenAt && (
                            <span data-testid={`text-session-lastseen-${session.id}`}>
                              {getRelativeTime(session.lastSeenAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeSessionMutation.mutate(session.id)}
                          disabled={revokeSessionMutation.isPending}
                          className="shrink-0 text-destructive"
                          data-testid={`button-revoke-session-${session.id}`}
                        >
                          {revokeSessionMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5 mr-1" />
                          )}
                          Revoke
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-account-settings">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="w-5 h-5" />
              Account Settings
            </CardTitle>
            <CardDescription>
              Security and account preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Email</label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span data-testid="text-account-email">{user.email}</span>
              </div>
            </div>

            <Separator />

            <div className="rounded-lg border border-dashed p-4 bg-muted/20 dark:bg-muted/10">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Lock className="w-4 h-4" />
                Change Password
              </div>
              <p className="text-xs text-muted-foreground mt-1" data-testid="text-password-placeholder">
                Password change coming soon
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
