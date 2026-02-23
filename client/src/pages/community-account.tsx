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
  ShieldCheck,
  ShieldOff,
  Lock,
  Mail,
  Calendar,
  Loader2,
  ArrowLeft,
  User,
  X,
  Link2,
  ExternalLink,
  QrCode,
  Copy,
  Check,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  SiFacebook,
  SiX,
  SiLinkedin,
  SiInstagram,
  SiYoutube,
  SiGithub,
  SiTiktok,
} from "react-icons/si";

interface CommunityUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  websiteUrl?: string | null;
  facebookUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  githubUrl?: string | null;
  tiktokUrl?: string | null;
  twoFactorEnabled?: boolean;
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
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [twoFaSetupData, setTwoFaSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisable2fa, setShowDisable2fa] = useState(false);

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
      setWebsiteUrl(user.websiteUrl || "");
      setFacebookUrl(user.facebookUrl || "");
      setTwitterUrl(user.twitterUrl || "");
      setLinkedinUrl(user.linkedinUrl || "");
      setInstagramUrl(user.instagramUrl || "");
      setYoutubeUrl(user.youtubeUrl || "");
      setGithubUrl(user.githubUrl || "");
      setTiktokUrl(user.tiktokUrl || "");
    }
  }, [user]);

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/community");
    }
  }, [userLoading, user, setLocation]);

  const hasChanges =
    user &&
    (displayName !== (user.displayName || "") ||
      bio !== (user.bio || "") ||
      websiteUrl !== (user.websiteUrl || "") ||
      facebookUrl !== (user.facebookUrl || "") ||
      twitterUrl !== (user.twitterUrl || "") ||
      linkedinUrl !== (user.linkedinUrl || "") ||
      instagramUrl !== (user.instagramUrl || "") ||
      youtubeUrl !== (user.youtubeUrl || "") ||
      githubUrl !== (user.githubUrl || "") ||
      tiktokUrl !== (user.tiktokUrl || ""));

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Record<string, string | undefined>) => {
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

  const setup2faMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/community/auth/2fa/setup");
      return res.json();
    },
    onSuccess: (data: { secret: string; qrCode: string }) => {
      setTwoFaSetupData(data);
      setTwoFaCode("");
      setShowSecret(false);
      setSecretCopied(false);
    },
    onError: () => {
      toast({ title: "Failed to set up 2FA", variant: "destructive" });
    },
  });

  const verify2faMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/community/auth/2fa/verify", { code });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/auth/me"] });
      setTwoFaSetupData(null);
      setTwoFaCode("");
      toast({ title: "Two-factor authentication enabled!" });
    },
    onError: () => {
      toast({ title: "Invalid code. Please try again.", variant: "destructive" });
    },
  });

  const disable2faMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/community/auth/2fa/disable", { password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/auth/me"] });
      setShowDisable2fa(false);
      setDisablePassword("");
      toast({ title: "Two-factor authentication disabled" });
    },
    onError: () => {
      toast({ title: "Incorrect password", variant: "destructive" });
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
      websiteUrl: websiteUrl.trim(),
      facebookUrl: facebookUrl.trim(),
      twitterUrl: twitterUrl.trim(),
      linkedinUrl: linkedinUrl.trim(),
      instagramUrl: instagramUrl.trim(),
      youtubeUrl: youtubeUrl.trim(),
      githubUrl: githubUrl.trim(),
      tiktokUrl: tiktokUrl.trim(),
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let avatarUrl = "";

      const presignRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });

      if (presignRes.ok) {
        const { uploadURL, objectPath } = await presignRes.json();
        const uploadRes = await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload file");
        avatarUrl = objectPath;
      } else {
        const localRes = await fetch("/api/uploads/local", {
          method: "POST",
          headers: { "Content-Type": file.type },
          credentials: "include",
          body: file,
        });
        if (!localRes.ok) throw new Error("Failed to upload file");
        const { url } = await localRes.json();
        avatarUrl = url;
      }

      await apiRequest("PATCH", "/api/community/auth/profile", { avatarUrl });

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

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-semibold">Website & Social Profiles</h3>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Add your links and they'll appear as icons next to your name in the community
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg border-2 border-foreground/20 bg-muted/30 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 text-foreground/70" />
                    </div>
                    <Input
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      data-testid="input-website-url"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg border-2 border-foreground/20 bg-muted/30 flex items-center justify-center shrink-0">
                      <SiFacebook className="w-4 h-4 text-[#1877F2]" />
                    </div>
                    <Input
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      placeholder="https://facebook.com/yourprofile"
                      data-testid="input-facebook-url"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg border-2 border-foreground/20 bg-muted/30 flex items-center justify-center shrink-0">
                      <SiX className="w-4 h-4 text-foreground" />
                    </div>
                    <Input
                      value={twitterUrl}
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      placeholder="https://x.com/yourhandle"
                      data-testid="input-twitter-url"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg border-2 border-foreground/20 bg-muted/30 flex items-center justify-center shrink-0">
                      <SiLinkedin className="w-4 h-4 text-[#0A66C2]" />
                    </div>
                    <Input
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/yourprofile"
                      data-testid="input-linkedin-url"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg border-2 border-foreground/20 bg-muted/30 flex items-center justify-center shrink-0">
                      <SiInstagram className="w-4 h-4 text-[#E4405F]" />
                    </div>
                    <Input
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/yourhandle"
                      data-testid="input-instagram-url"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg border-2 border-foreground/20 bg-muted/30 flex items-center justify-center shrink-0">
                      <SiYoutube className="w-4 h-4 text-[#FF0000]" />
                    </div>
                    <Input
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/@yourchannel"
                      data-testid="input-youtube-url"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg border-2 border-foreground/20 bg-muted/30 flex items-center justify-center shrink-0">
                      <SiGithub className="w-4 h-4 text-foreground" />
                    </div>
                    <Input
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/yourusername"
                      data-testid="input-github-url"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg border-2 border-foreground/20 bg-muted/30 flex items-center justify-center shrink-0">
                      <SiTiktok className="w-4 h-4 text-foreground" />
                    </div>
                    <Input
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                      placeholder="https://tiktok.com/@yourhandle"
                      data-testid="input-tiktok-url"
                    />
                  </div>
                </div>
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

        <Card data-testid="card-2fa">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="w-5 h-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account using an authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user.twoFactorEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Two-factor authentication is enabled</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Your account is protected with an authenticator app</p>
                  </div>
                </div>
                {!showDisable2fa ? (
                  <Button
                    variant="outline"
                    className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => setShowDisable2fa(true)}
                    data-testid="button-show-disable-2fa"
                  >
                    <ShieldOff className="w-4 h-4" />
                    Disable 2FA
                  </Button>
                ) : (
                  <div className="space-y-3 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                    <p className="text-sm font-medium">Enter your password to disable 2FA</p>
                    <Input
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="Your password"
                      data-testid="input-disable-2fa-password"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => disable2faMutation.mutate(disablePassword)}
                        disabled={!disablePassword || disable2faMutation.isPending}
                        data-testid="button-confirm-disable-2fa"
                      >
                        {disable2faMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Disable"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowDisable2fa(false); setDisablePassword(""); }}
                        data-testid="button-cancel-disable-2fa"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : twoFaSetupData ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <QrCode className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-700 dark:text-amber-400">Scan this QR code with your authenticator app</p>
                    <p className="text-xs text-muted-foreground mt-1">Use Google Authenticator, Authy, Microsoft Authenticator, or any TOTP-compatible app</p>
                  </div>
                </div>

                <div className="flex justify-center p-6 bg-white rounded-xl border-2 border-dashed border-muted-foreground/20">
                  <img
                    src={twoFaSetupData.qrCode}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                    data-testid="img-2fa-qr-code"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Manual entry key</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowSecret(!showSecret)}
                      data-testid="button-toggle-secret"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  {showSecret && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 font-mono text-sm">
                      <code className="flex-1 break-all select-all" data-testid="text-2fa-secret">{twoFaSetupData.secret}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(twoFaSetupData.secret);
                          setSecretCopied(true);
                          setTimeout(() => setSecretCopied(false), 2000);
                        }}
                        data-testid="button-copy-secret"
                      >
                        {secretCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="text-sm font-medium" htmlFor="totpCode">
                    Enter the 6-digit code from your app to verify
                  </label>
                  <div className="flex gap-3">
                    <Input
                      id="totpCode"
                      value={twoFaCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setTwoFaCode(val);
                      }}
                      placeholder="000000"
                      className="font-mono text-center text-lg tracking-[0.5em] max-w-[200px]"
                      maxLength={6}
                      data-testid="input-2fa-verify-code"
                    />
                    <Button
                      onClick={() => verify2faMutation.mutate(twoFaCode)}
                      disabled={twoFaCode.length !== 6 || verify2faMutation.isPending}
                      className="gap-2"
                      data-testid="button-verify-2fa"
                    >
                      {verify2faMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      Verify & Enable
                    </Button>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setTwoFaSetupData(null); setTwoFaCode(""); }}
                  data-testid="button-cancel-2fa-setup"
                >
                  Cancel Setup
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border">
                  <Shield className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p>Two-factor authentication adds an extra layer of security. When enabled, you'll need to enter a code from your authenticator app each time you log in.</p>
                  </div>
                </div>
                <Button
                  onClick={() => setup2faMutation.mutate()}
                  disabled={setup2faMutation.isPending}
                  className="gap-2"
                  data-testid="button-setup-2fa"
                >
                  {setup2faMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <QrCode className="w-4 h-4" />
                  )}
                  Set Up Two-Factor Authentication
                </Button>
              </div>
            )}
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
