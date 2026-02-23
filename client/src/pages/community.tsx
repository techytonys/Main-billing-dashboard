import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ThumbsUp,
  Heart,
  MessageCircle,
  Share2,
  Send,
  Pin,
  Trash2,
  ImageIcon,
  Type,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Bell,
  Users,
  Megaphone,
  Globe,
  Zap,
  Star,
  Clock,
  CheckCircle2,
  ArrowUp,
  Pencil,
  MoreHorizontal,
  LogIn,
  LogOut,
  UserPlus,
  Mail,
  ExternalLink,
  User,
  AtSign,
  UserPlus2,
  UsersRound,
  Hash,
  Layers,
  Plus,
  UserCheck,
  UserX,
  Filter,
  X,
  Shield,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SiFacebook,
  SiX,
  SiLinkedin,
  SiInstagram,
  SiYoutube,
  SiGithub,
  SiTiktok,
} from "react-icons/si";

type ReactionType = "like" | "heart" | "haha" | "angry";

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
  createdAt: string;
}

interface CommunityNotification {
  id: string;
  type: string;
  message: string;
  title?: string;
  body?: string | null;
  actorName?: string;
  isRead: boolean;
  createdAt: string;
}

interface CommunityMember {
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
  createdAt: string;
}

interface CommunityPost {
  id: string;
  authorName: string;
  authorType: string;
  authorRole?: string;
  authorUserId?: string;
  authorAvatar?: string | null;
  title?: string | null;
  body: string;
  imageUrl?: string | null;
  isPinned?: boolean;
  likesCount: number;
  heartsCount: number;
  hahaCount: number;
  angryCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  userReactions?: { like: boolean; heart: boolean; haha: boolean; angry: boolean };
}

interface CommunityComment {
  id: string;
  postId: string;
  authorName: string;
  authorAvatar?: string | null;
  authorType: string;
  body: string;
  createdAt: string;
}

interface CommunityGroup {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  memberCount?: number;
  createdAt: string;
}

interface CommunityFriendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  requesterName?: string;
  addresseeName?: string;
  createdAt: string;
}

interface CommunityFriend {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt: string;
}

function useCommunityAuth(skip: boolean) {
  const { data: user, isLoading, refetch } = useQuery<CommunityUser | null>({
    queryKey: ["/api/community/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !skip,
    staleTime: 60000,
  });

  const isLoggedIn = !!user;

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; totpCode?: string }) => {
      const res = await apiRequest("POST", "/api/community/auth/login", data);
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; displayName: string }) => {
      const res = await apiRequest("POST", "/api/community/auth/signup", data);
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/community/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/community/auth/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/community/user"] });
    },
  });

  return {
    user: skip ? null : (user ?? null),
    isLoading: skip ? false : isLoading,
    isLoggedIn: skip ? false : isLoggedIn,
    login: loginMutation,
    signup: signupMutation,
    logout: logoutMutation,
    refetch,
  };
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 5) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${diffYear}y ago`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i;

function renderRichText(text: string) {
  const combined = /(https?:\/\/[^\s<]+)|@(\w+)/g;
  const parts: Array<{ type: "text" | "link" | "image" | "mention"; value: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    if (match[1]) {
      const url = match[1].replace(/[.,;:!?)]+$/, "");
      if (IMAGE_EXTENSIONS.test(url)) {
        parts.push({ type: "image", value: url });
      } else {
        parts.push({ type: "link", value: url });
      }
      combined.lastIndex = match.index + url.length;
    } else if (match[2]) {
      parts.push({ type: "mention", value: match[2] });
    }
    lastIndex = combined.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  if (parts.length === 0) return text;
  return (
    <span>
      {parts.map((part, i) => {
        if (part.type === "mention") {
          return (
            <span key={i} className="text-primary font-semibold cursor-pointer hover:underline" data-testid={`mention-${part.value}`}>
              @{part.value}
            </span>
          );
        }
        if (part.type === "link") {
          return (
            <a
              key={i}
              href={part.value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-1 break-all"
              data-testid={`link-${i}`}
            >
              {part.value}
              <ExternalLink className="w-3 h-3 inline shrink-0" />
            </a>
          );
        }
        if (part.type === "image") {
          return (
            <span key={i} className="block my-2">
              <img
                src={part.value}
                alt="Shared image"
                className="rounded-lg max-h-[400px] max-w-full object-contain border"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const fallback = document.createElement("a");
                  fallback.href = part.value;
                  fallback.target = "_blank";
                  fallback.rel = "noopener noreferrer";
                  fallback.textContent = part.value;
                  fallback.className = "text-primary underline";
                  target.parentNode?.appendChild(fallback);
                }}
                data-testid={`inline-image-${i}`}
              />
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </span>
  );
}

function renderWithMentions(text: string) {
  return renderRichText(text);
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: any) => void;
  textareaRef?: any;
  onFocus?: () => void;
  onBlur?: () => void;
  "data-testid"?: string;
}

function MentionTextarea({ value, onChange, placeholder, className, onKeyDown, textareaRef, onFocus, onBlur, "data-testid": dataTestId }: MentionTextareaProps) {
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef || localRef;

  const { data: mentionResults = [] } = useQuery<Array<{ id: string; displayName: string; avatarUrl?: string | null }>>({
    queryKey: ["/api/community/users/search", mentionQuery],
    queryFn: async () => {
      if (!mentionQuery || mentionQuery.length < 1) return [];
      const res = await fetch(`/api/community/users/search?q=${encodeURIComponent(mentionQuery)}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: mentionActive && mentionQuery.length >= 1,
    staleTime: 5000,
  });

  const handleChange = (e: any) => {
    const val = e.target.value;
    onChange(val);
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionActive(true);
      setMentionQuery(atMatch[1]);
      setSelectedIndex(0);
      const textarea = ref.current;
      if (textarea) {
        setMentionPos({ top: textarea.offsetHeight + 4, left: 0 });
      }
    } else {
      setMentionActive(false);
      setMentionQuery("");
    }
  };

  const insertMention = (displayName: string) => {
    const textarea = ref.current;
    if (!textarea) return;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      const handle = displayName.replace(/\s+/g, "");
      const start = cursorPos - atMatch[0].length;
      const newValue = value.slice(0, start) + `@${handle} ` + value.slice(cursorPos);
      onChange(newValue);
    }
    setMentionActive(false);
    setMentionQuery("");
    setTimeout(() => textarea.focus(), 0);
  };

  const handleKeyDown = (e: any) => {
    if (mentionActive && mentionResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % mentionResults.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + mentionResults.length) % mentionResults.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionResults[selectedIndex].displayName);
        return;
      }
      if (e.key === "Escape") {
        setMentionActive(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div ref={containerRef} className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={(e) => {
          setTimeout(() => setMentionActive(false), 200);
          onBlur?.();
        }}
        placeholder={placeholder}
        className={className}
        data-testid={dataTestId}
      />
      {mentionActive && mentionResults.length > 0 && (
        <div
          className="absolute z-50 w-64 bg-card border rounded-lg shadow-lg overflow-hidden"
          style={{ top: mentionPos.top, left: mentionPos.left }}
          data-testid="mention-dropdown"
        >
          {mentionResults.map((user, i) => (
            <button
              key={user.id}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors ${i === selectedIndex ? "bg-muted/50" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); insertMention(user.displayName); }}
              data-testid={`mention-option-${user.id}`}
            >
              <Avatar className="h-6 w-6">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(user.displayName)} text-white text-[8px] font-bold`}>
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium truncate">{user.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-card rounded-xl border p-6">
          <div className="flex items-center gap-3 mb-5">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-4/5 mb-2" />
          <Skeleton className="h-4 w-2/3 mb-5" />
          <Separator className="mb-4" />
          <div className="flex gap-6">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface PostComposerProps {
  onPost: (data: { title?: string; body: string; imageUrl?: string }) => void;
  isPending: boolean;
  displayName: string;
  avatarUrl?: string;
}

function PostComposer({ onPost, isPending, displayName, avatarUrl }: PostComposerProps) {
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showTitle, setShowTitle] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    if (!body.trim()) return;
    onPost({
      title: title.trim() || undefined,
      body: body.trim(),
      imageUrl: imageUrl.trim() || undefined,
    });
    setBody("");
    setTitle("");
    setImageUrl("");
    setShowTitle(false);
    setShowImage(false);
    setIsFocused(false);
  };

  return (
    <div ref={composerRef} className="bg-card rounded-xl border p-5" data-testid="card-post-composer">
      <div className="flex gap-3">
        <Avatar className="h-11 w-11 shrink-0 ring-2 ring-background shadow-sm">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(displayName)} text-white text-sm font-bold`}>
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          {showTitle && (
            <Input
              placeholder="Add a title for your post..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base font-medium border-0 bg-muted/40 dark:bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary/30"
              data-testid="input-post-title"
            />
          )}
          <div
            className={`relative rounded-lg transition-all duration-200 ${
              isFocused
                ? "bg-muted/30 dark:bg-muted/15 ring-1 ring-primary/20"
                : "bg-muted/40 dark:bg-muted/20"
            }`}
          >
            <MentionTextarea
              textareaRef={textareaRef}
              placeholder="Share something with the community... Use @ to mention someone"
              value={body}
              onChange={setBody}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setTimeout(() => {
                  if (!body && !composerRef.current?.contains(document.activeElement)) {
                    setIsFocused(false);
                  }
                }, 150);
              }}
              className={`resize-none border-0 bg-transparent text-base focus-visible:ring-0 transition-all duration-200 ${
                isFocused ? "min-h-[120px]" : "min-h-[52px]"
              }`}
              data-testid="textarea-post-body"
            />
          </div>
          {showImage && (
            <Input
              placeholder="Paste an image URL..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="border-0 bg-muted/40 dark:bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary/30"
              data-testid="input-post-image"
            />
          )}
          {(isFocused || body) && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTitle(!showTitle)}
                  className={`gap-1.5 text-xs toggle-elevate ${showTitle ? "toggle-elevated text-primary" : "text-muted-foreground"}`}
                  data-testid="button-toggle-title"
                >
                  <Type className="w-4 h-4" />
                  Title
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImage(!showImage)}
                  className={`gap-1.5 text-xs toggle-elevate ${showImage ? "toggle-elevated text-primary" : "text-muted-foreground"}`}
                  data-testid="button-toggle-image"
                >
                  <ImageIcon className="w-4 h-4" />
                  Image
                </Button>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!body.trim() || isPending}
                size="sm"
                className="gap-1.5 px-5"
                data-testid="button-submit-post"
              >
                <Send className="w-3.5 h-3.5" />
                Post
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CommentSectionProps {
  postId: string;
  isAdmin: boolean;
  displayName: string;
  authorType: string;
  authorAvatar?: string;
}

function CommentSection({ postId, isAdmin, displayName, authorType, authorAvatar }: CommentSectionProps) {
  const [commentBody, setCommentBody] = useState("");

  const { data: comments = [], isLoading } = useQuery<CommunityComment[]>({
    queryKey: ["/api/community/posts", postId, "comments"],
  });

  const addComment = useMutation({
    mutationFn: async (data: { authorName: string; authorAvatar?: string; authorType: string; body: string }) => {
      const res = await apiRequest("POST", `/api/community/posts/${postId}/comments`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      setCommentBody("");
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest("DELETE", `/api/community/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", postId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
  });

  const handleSend = () => {
    if (!commentBody.trim() || !displayName) return;
    addComment.mutate({
      authorName: displayName,
      authorAvatar: authorAvatar || undefined,
      authorType,
      body: commentBody.trim(),
    });
  };

  return (
    <div className="bg-muted/20 dark:bg-muted/10 rounded-lg mx-5 mb-5 p-4 space-y-3" data-testid={`comment-section-${postId}`}>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-2.5 group"
              data-testid={`comment-${comment.id}`}
            >
              <Avatar className="h-8 w-8 shrink-0 ring-1 ring-background">
                {comment.authorAvatar && <AvatarImage src={comment.authorAvatar} alt={comment.authorName} />}
                <AvatarFallback
                  className={`bg-gradient-to-br ${getAvatarGradient(comment.authorName)} text-white text-[10px] font-bold`}
                >
                  {getInitials(comment.authorName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="bg-card rounded-xl px-3.5 py-2.5 border border-border/50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" data-testid={`text-comment-author-${comment.id}`}>
                      {comment.authorName}
                    </span>
                    {comment.authorType === "admin" && (
                      <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-primary/10 text-primary border-0 font-semibold">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm mt-0.5 text-foreground/90" data-testid={`text-comment-body-${comment.id}`}>
                    {renderWithMentions(comment.body)}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground ml-3.5 mt-0.5 inline-block">
                  {getRelativeTime(comment.createdAt)}
                </span>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="invisible group-hover:visible shrink-0 h-7 w-7 text-destructive/60"
                  onClick={() => deleteComment.mutate(comment.id)}
                  data-testid={`button-delete-comment-${comment.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-3">Be the first to comment</p>
      )}

      <div className="flex gap-2.5 items-center pt-1">
        <Avatar className="h-8 w-8 shrink-0 ring-1 ring-background">
          {authorAvatar && <AvatarImage src={authorAvatar} alt={displayName || "User"} />}
          <AvatarFallback
            className={`bg-gradient-to-br ${displayName ? getAvatarGradient(displayName) : "from-gray-400 to-gray-500"} text-white text-[10px] font-bold`}
          >
            {displayName ? getInitials(displayName) : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex gap-2 items-center bg-card rounded-full border border-border/50 pl-4 pr-1 py-1">
          <MentionTextarea
            placeholder="Write a comment... Use @ to mention"
            value={commentBody}
            onChange={setCommentBody}
            onKeyDown={(e: any) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 border-0 bg-transparent h-8 min-h-[32px] text-sm focus-visible:ring-0 px-0 resize-none py-1"
            data-testid={`input-comment-${postId}`}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            onClick={handleSend}
            disabled={!commentBody.trim() || addComment.isPending}
            data-testid={`button-send-comment-${postId}`}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

const REACTION_EMOJIS: { type: ReactionType; emoji: string; label: string; color: string; bg: string }[] = [
  { type: "like", emoji: "\u{1F44D}", label: "Like", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500" },
  { type: "heart", emoji: "\u2764\uFE0F", label: "Love", color: "text-red-500 dark:text-red-400", bg: "bg-red-500" },
  { type: "haha", emoji: "\u{1F602}", label: "Haha", color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500" },
  { type: "angry", emoji: "\u{1F621}", label: "Angry", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500" },
];

interface ReactionSummaryProps {
  counts: { like: number; heart: number; haha: number; angry: number };
  commentsCount: number;
}

function ReactionSummary({ counts, commentsCount }: ReactionSummaryProps) {
  const total = counts.like + counts.heart + counts.haha + counts.angry;
  if (total === 0 && commentsCount === 0) return null;

  const activeTypes = REACTION_EMOJIS.filter(r => counts[r.type] > 0);

  return (
    <div className="flex items-center justify-between px-5 py-2 text-xs text-muted-foreground" data-testid="reaction-summary">
      <div className="flex items-center gap-1.5">
        {total > 0 && (
          <>
            <div className="flex -space-x-0.5">
              {activeTypes.map(r => (
                <span key={r.type} className="text-base leading-none" title={`${counts[r.type]} ${r.label}`}>
                  {r.emoji}
                </span>
              ))}
            </div>
            <span>{total}</span>
          </>
        )}
      </div>
      {commentsCount > 0 && (
        <span>{commentsCount} comment{commentsCount !== 1 ? "s" : ""}</span>
      )}
    </div>
  );
}

interface SocialIconsProps {
  member?: CommunityMember | null;
  size?: "sm" | "md";
}

function SocialIcons({ member, size = "sm" }: SocialIconsProps) {
  if (!member) return null;

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const containerSize = size === "sm" ? "w-6 h-6" : "w-7 h-7";

  const socials = [
    { url: member.websiteUrl, icon: Globe, color: "#6366F1", label: "Website" },
    { url: member.facebookUrl, icon: SiFacebook, color: "#1877F2", label: "Facebook" },
    { url: member.twitterUrl, icon: SiX, color: "#000000", label: "X" },
    { url: member.linkedinUrl, icon: SiLinkedin, color: "#0A66C2", label: "LinkedIn" },
    { url: member.instagramUrl, icon: SiInstagram, color: "#E4405F", label: "Instagram" },
    { url: member.youtubeUrl, icon: SiYoutube, color: "#FF0000", label: "YouTube" },
    { url: member.githubUrl, icon: SiGithub, color: "#333333", label: "GitHub" },
    { url: member.tiktokUrl, icon: SiTiktok, color: "#000000", label: "TikTok" },
  ].filter((s) => s.url);

  if (socials.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {socials.map((social) => {
        const Icon = social.icon;
        return (
          <a
            key={social.label}
            href={social.url!.startsWith("http") ? social.url! : `https://${social.url}`}
            target="_blank"
            rel="noopener noreferrer"
            title={social.label}
            className={`${containerSize} rounded-md border-2 border-black dark:border-black/80 bg-background flex items-center justify-center transition-all duration-200 hover:brightness-110 hover:shadow-md`}
            style={{
              boxShadow: "inset 0 1px 2px rgba(255,255,255,0.4), 0 1px 3px rgba(0,0,0,0.2)",
            }}
            data-testid={`social-icon-${social.label.toLowerCase()}`}
          >
            <Icon className={iconSize} style={{ color: social.color }} />
          </a>
        );
      })}
    </div>
  );
}

interface PostCardProps {
  post: CommunityPost;
  isAdmin: boolean;
  displayName: string;
  authorType: string;
  userAvatar?: string;
  currentUserId?: string;
  members?: CommunityMember[];
  onNeedName: () => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onEdit: (post: CommunityPost) => void;
}

function PostCard({ post, isAdmin, displayName, authorType, userAvatar, currentUserId, members = [], onNeedName, onDelete, onPin, onEdit }: PostCardProps) {
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [activeReaction, setActiveReaction] = useState<ReactionType | null>(
    post.userReactions?.like ? "like" :
    post.userReactions?.heart ? "heart" :
    post.userReactions?.haha ? "haha" :
    post.userReactions?.angry ? "angry" : null
  );
  const [localCounts, setLocalCounts] = useState({
    like: post.likesCount,
    heart: post.heartsCount,
    haha: post.hahaCount || 0,
    angry: post.angryCount || 0,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const POST_CHAR_LIMIT = 200;

  useEffect(() => {
    const newActive = post.userReactions?.like ? "like" :
      post.userReactions?.heart ? "heart" :
      post.userReactions?.haha ? "haha" :
      post.userReactions?.angry ? "angry" : null;
    setActiveReaction(newActive);
    setLocalCounts({
      like: post.likesCount,
      heart: post.heartsCount,
      haha: post.hahaCount || 0,
      angry: post.angryCount || 0,
    });
  }, [post]);

  const reactMutation = useMutation({
    mutationFn: async (reactionType: ReactionType) => {
      await apiRequest("POST", `/api/community/posts/${post.id}/reactions`, {
        reactionType,
        actorName: displayName,
        actorType: authorType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
  });

  const authorMember = post.authorUserId ? members.find((m) => m.id === post.authorUserId) : null;

  const handleReaction = (type: ReactionType) => {
    if (!displayName) {
      onNeedName();
      return;
    }
    setShowReactionPicker(false);

    if (activeReaction === type) {
      setLocalCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
      setActiveReaction(null);
    } else {
      if (activeReaction) {
        setLocalCounts(prev => ({ ...prev, [activeReaction]: Math.max(0, prev[activeReaction] - 1) }));
        reactMutation.mutate(activeReaction);
      }
      setLocalCounts(prev => ({ ...prev, [type]: prev[type] + 1 }));
      setActiveReaction(type);
    }
    reactMutation.mutate(type);
  };

  const handleLikeButtonClick = () => {
    if (activeReaction) {
      handleReaction(activeReaction);
    } else {
      handleReaction("like");
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setShowReactionPicker(true), 400);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setShowReactionPicker(false), 500);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/community#post-${post.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  const handleCommentClick = () => {
    if (!displayName && !showComments) {
      onNeedName();
      return;
    }
    setShowComments(!showComments);
  };

  return (
    <div className="bg-card rounded-xl border overflow-visible" id={`post-${post.id}`} data-testid={`card-post-${post.id}`}>
      {post.isPinned && (
        <div className="flex items-center gap-1.5 text-primary px-5 pt-3 pb-0" data-testid={`pin-indicator-${post.id}`}>
          <Pin className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">Pinned Post</span>
        </div>
      )}

      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 ring-2 ring-background shadow-sm">
              {post.authorAvatar && <AvatarImage src={post.authorAvatar} alt={post.authorName} />}
              <AvatarFallback
                className={`bg-gradient-to-br ${getAvatarGradient(post.authorName)} text-white text-sm font-bold`}
              >
                {getInitials(post.authorName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[15px]" data-testid={`text-post-author-${post.id}`}>
                  {post.authorName}
                </span>
                {(post.authorRole === "admin" || post.authorType === "admin") && (
                  <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-primary/10 text-primary border-0 font-semibold">
                    Admin
                  </Badge>
                )}
                <SocialIcons member={authorMember} />
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground" data-testid={`text-post-time-${post.id}`}>
                  {getRelativeTime(post.createdAt)}
                </span>
                <Globe className="w-3 h-3 text-muted-foreground ml-1" />
              </div>
            </div>
          </div>

          {(isAdmin || post.authorName === displayName || (currentUserId && post.authorUserId === currentUserId)) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  data-testid={`button-post-menu-${post.id}`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {(isAdmin || post.authorName === displayName || (currentUserId && post.authorUserId === currentUserId)) && (
                  <DropdownMenuItem onClick={() => onEdit(post)} data-testid={`menu-edit-post-${post.id}`}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem onClick={() => onPin(post.id, !post.isPinned)} data-testid={`menu-pin-post-${post.id}`}>
                    <Pin className="w-4 h-4 mr-2" />
                    {post.isPinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                )}
                {(isAdmin || post.authorName === displayName || (currentUserId && post.authorUserId === currentUserId)) && (
                  <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive focus:text-destructive" data-testid={`menu-delete-post-${post.id}`}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="mt-4">
          {post.title && (
            <h3 className="font-semibold text-lg leading-snug mb-1.5" data-testid={`text-post-title-${post.id}`}>
              {post.title}
            </h3>
          )}
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90" data-testid={`text-post-body-${post.id}`}>
            {post.body.length > POST_CHAR_LIMIT && !isExpanded
              ? <>{renderWithMentions(post.body.slice(0, POST_CHAR_LIMIT) + "...")}<button onClick={() => setIsExpanded(true)} className="text-primary font-semibold hover:underline ml-1" data-testid={`button-see-more-${post.id}`}>See more</button></>
              : renderWithMentions(post.body)
            }
          </p>
          {isExpanded && post.body.length > POST_CHAR_LIMIT && (
            <button onClick={() => setIsExpanded(false)} className="text-primary text-sm font-semibold hover:underline mt-1" data-testid={`button-see-less-${post.id}`}>See less</button>
          )}
        </div>

        {post.imageUrl && (
          <div className="mt-4 -mx-5">
            <img
              src={post.imageUrl}
              alt={post.title || "Post image"}
              className="w-full object-cover max-h-[420px]"
              data-testid={`img-post-${post.id}`}
            />
          </div>
        )}
      </div>

      <ReactionSummary
        counts={localCounts}
        commentsCount={post.commentsCount}
      />

      <div className="border-t mx-5" />

      <div className="flex items-center justify-around px-2 py-1">
        <div
          className="relative flex-1"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          ref={pickerRef}
        >
          {showReactionPicker && (
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card rounded-full shadow-xl border px-2 py-1.5 flex items-center gap-0.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
              data-testid={`reaction-picker-${post.id}`}
            >
              {REACTION_EMOJIS.map(r => (
                <button
                  key={r.type}
                  onClick={() => handleReaction(r.type)}
                  className={`group relative text-2xl hover:scale-125 transition-transform duration-150 px-1.5 py-0.5 rounded-full ${activeReaction === r.type ? "bg-muted scale-110" : ""}`}
                  data-testid={`reaction-emoji-${r.type}-${post.id}`}
                  title={r.label}
                >
                  {r.emoji}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-semibold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
          )}
          {(() => {
            const activeEmoji = activeReaction ? REACTION_EMOJIS.find(r => r.type === activeReaction) : null;
            return (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLikeButtonClick}
                className={`w-full justify-center gap-2 ${
                  activeEmoji ? activeEmoji.color : "text-muted-foreground"
                }`}
                data-testid={`button-like-${post.id}`}
              >
                {activeEmoji ? (
                  <span className="text-lg leading-none">{activeEmoji.emoji}</span>
                ) : (
                  <ThumbsUp className="w-[18px] h-[18px]" />
                )}
                <span className="font-medium">{activeEmoji ? activeEmoji.label : "Like"}</span>
              </Button>
            );
          })()}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCommentClick}
          className="flex-1 justify-center gap-2 text-muted-foreground"
          data-testid={`button-comment-${post.id}`}
        >
          <MessageCircle className="w-[18px] h-[18px]" />
          <span>Comment</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="flex-1 justify-center gap-2 text-muted-foreground"
          data-testid={`button-share-${post.id}`}
        >
          <Share2 className="w-[18px] h-[18px]" />
          <span>Share</span>
        </Button>
      </div>

      {showComments && (
        <>
          <div className="border-t mx-5" />
          <div className="pt-3">
            <CommentSection
              postId={post.id}
              isAdmin={isAdmin}
              displayName={displayName}
              authorType={authorType}
              authorAvatar={userAvatar}
            />
          </div>
        </>
      )}
    </div>
  );
}

function AuthDialog({ open, onOpenChange, auth }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auth: ReturnType<typeof useCommunityAuth>;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<string>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [needs2fa, setNeeds2fa] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setError("");
    setNeeds2fa(false);
    setTotpCode("");
  };

  const handleSignIn = async () => {
    setError("");
    try {
      await auth.login.mutateAsync({ email, password, totpCode: needs2fa ? totpCode : undefined });
      resetForm();
      onOpenChange(false);
      toast({ title: "Signed in successfully" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign in failed";
      const cleanMsg = msg.replace(/^\d+:\s*/, "");
      if (cleanMsg.includes("2fa_required") || cleanMsg.includes("Two-factor")) {
        setNeeds2fa(true);
        setError("");
      } else {
        setError(cleanMsg);
      }
    }
  };

  const handleSignUp = async () => {
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }
    try {
      await auth.signup.mutateAsync({ email, password, displayName: displayName.trim() });
      resetForm();
      onOpenChange(false);
      toast({ title: "Account created successfully" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sign up failed";
      setError(msg.replace(/^\d+:\s*/, ""));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-[420px]" data-testid="dialog-auth">
        <DialogHeader>
          <DialogTitle className="text-xl">Join the Community</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Sign in or create an account to interact with the community.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => { setTab(v); setError(""); }} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin" data-testid="tab-signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="space-y-3 mt-4">
            {!needs2fa ? (
              <>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-signin-email"
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSignIn(); }}
                  data-testid="input-signin-password"
                />
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Shield className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-sm">Enter the 6-digit code from your authenticator app</p>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setTotpCode(val);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter" && totpCode.length === 6) handleSignIn(); }}
                  className="font-mono text-center text-lg tracking-[0.5em]"
                  maxLength={6}
                  autoFocus
                  data-testid="input-signin-2fa-code"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setNeeds2fa(false); setTotpCode(""); setError(""); }}
                  className="text-xs"
                  data-testid="button-back-to-login"
                >
                  Back to login
                </Button>
              </div>
            )}
            {error && <p className="text-sm text-destructive" data-testid="text-auth-error">{error}</p>}
            <Button
              onClick={handleSignIn}
              disabled={!email || !password || (needs2fa && totpCode.length !== 6) || auth.login.isPending}
              className="w-full gap-2"
              data-testid="button-signin"
            >
              <LogIn className="w-4 h-4" />
              {auth.login.isPending ? "Signing in..." : needs2fa ? "Verify & Sign In" : "Sign In"}
            </Button>
          </TabsContent>
          <TabsContent value="signup" className="space-y-3 mt-4">
            <Input
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              data-testid="input-signup-name"
            />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-signup-email"
            />
            <Input
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSignUp(); }}
              data-testid="input-signup-password"
            />
            {error && <p className="text-sm text-destructive" data-testid="text-auth-error">{error}</p>}
            <Button
              onClick={handleSignUp}
              disabled={!email || !password || !displayName.trim() || auth.signup.isPending}
              className="w-full gap-2"
              data-testid="button-signup"
            >
              <UserPlus className="w-4 h-4" />
              {auth.signup.isPending ? "Creating account..." : "Create Account"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/community/user/notifications/unread-count"],
    refetchInterval: 15000,
  });

  const { data: notifications = [] } = useQuery<CommunityNotification[]>({
    queryKey: ["/api/community/user/notifications"],
    enabled: open,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/community/user/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/user/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/user/notifications/unread-count"] });
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/community/user/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/user/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/user/notifications/unread-count"] });
    },
  });

  const unreadCount = unreadData?.count ?? 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white/80 hover:text-white"
          data-testid="button-notification-bell"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1" data-testid="badge-unread-count">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto" data-testid="dropdown-notifications">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              className="text-xs h-7"
              data-testid="button-mark-all-read"
            >
              Mark all read
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground" data-testid="text-no-notifications">
            No notifications yet
          </div>
        ) : (
          notifications.slice(0, 20).map((n) => {
            const NotifIcon = n.type === "mention" ? AtSign : n.type === "comment" ? MessageCircle : n.type === "reaction" ? Heart : n.type === "share" ? Share2 : n.type === "friend_request" ? UserPlus : n.type === "friend_accepted" ? UserCheck : Bell;
            const iconColor = n.type === "mention" ? "text-blue-500" : n.type === "comment" ? "text-green-500" : n.type === "reaction" ? "text-pink-500" : n.type === "share" ? "text-purple-500" : n.type === "friend_request" ? "text-orange-500" : n.type === "friend_accepted" ? "text-emerald-500" : "text-muted-foreground";
            return (
              <DropdownMenuItem
                key={n.id}
                className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer ${!n.isRead ? "bg-primary/5" : ""}`}
                onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
                data-testid={`notification-${n.id}`}
              >
                <NotifIcon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className={`text-sm leading-tight ${!n.isRead ? "font-semibold" : ""}`}>{n.message || n.title}</span>
                  <span className="text-[11px] text-muted-foreground">{getRelativeTime(n.createdAt)}</span>
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ContactDialog({ open, onOpenChange, prefillName, prefillEmail }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillName?: string;
  prefillEmail?: string;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(prefillName || "");
  const [email, setEmail] = useState(prefillEmail || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open) {
      setName(prefillName || "");
      setEmail(prefillEmail || "");
    }
  }, [open, prefillName, prefillEmail]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/community/messages", { name, email, subject, body });
    },
    onSuccess: () => {
      toast({ title: "Message sent successfully" });
      setSubject("");
      setBody("");
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]" data-testid="dialog-contact">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Get in Touch
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Send us a message and we'll get back to you.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="input-contact-name"
          />
          <Input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="input-contact-email"
          />
          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            data-testid="input-contact-subject"
          />
          <Textarea
            placeholder="Your message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[100px] resize-none"
            data-testid="textarea-contact-body"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => sendMessage.mutate()}
            disabled={!name.trim() || !email.trim() || !subject.trim() || !body.trim() || sendMessage.isPending}
            className="w-full gap-2"
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
            {sendMessage.isPending ? "Sending..." : "Send Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const GROUP_COLORS = [
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#10B981" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Orange", value: "#F97316" },
  { name: "Pink", value: "#EC4899" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Red", value: "#EF4444" },
  { name: "Amber", value: "#F59E0B" },
];

const GROUP_ICONS = ["Hash", "Star", "Zap", "Globe", "Megaphone", "Layers", "Users", "MessageCircle"];

function getGroupIcon(iconName?: string | null) {
  switch (iconName) {
    case "Star": return Star;
    case "Zap": return Zap;
    case "Globe": return Globe;
    case "Megaphone": return Megaphone;
    case "Layers": return Layers;
    case "Users": return UsersRound;
    case "MessageCircle": return MessageCircle;
    default: return Hash;
  }
}

function CreateGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Hash");
  const [selectedColor, setSelectedColor] = useState("#3B82F6");

  const createGroup = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/community/groups", {
        name: name.trim(),
        description: description.trim() || undefined,
        icon: selectedIcon,
        color: selectedColor,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/groups"] });
      toast({ title: "Group created" });
      setName("");
      setDescription("");
      setSelectedIcon("Hash");
      setSelectedColor("#3B82F6");
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to create group", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]" data-testid="dialog-create-group">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Group
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create a new group for community discussions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Group Name</label>
            <Input
              placeholder="e.g. General Discussion"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-group-name"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <Textarea
              placeholder="What is this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
              data-testid="textarea-group-description"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Icon</label>
            <div className="flex flex-wrap gap-2">
              {GROUP_ICONS.map((iconName) => {
                const IconComp = getGroupIcon(iconName);
                return (
                  <button
                    key={iconName}
                    onClick={() => setSelectedIcon(iconName)}
                    className={`h-9 w-9 rounded-lg flex items-center justify-center border transition-colors ${
                      selectedIcon === iconName ? "border-primary bg-primary/10" : "border-border hover-elevate"
                    }`}
                    data-testid={`button-icon-${iconName}`}
                  >
                    <IconComp className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {GROUP_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    selectedColor === color.value ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  data-testid={`button-color-${color.name}`}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-group">
            Cancel
          </Button>
          <Button
            onClick={() => createGroup.mutate()}
            disabled={!name.trim() || createGroup.isPending}
            className="gap-1.5"
            data-testid="button-save-group"
          >
            <Plus className="w-4 h-4" />
            {createGroup.isPending ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FriendRequestsPanel({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();

  const { data: friendships = [] } = useQuery<CommunityFriendship[]>({
    queryKey: ["/api/community/friendships"],
  });

  const pendingRequests = friendships.filter((f) => f.status === "pending");

  const acceptRequest = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/community/friendships/${id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/friendships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/friends"] });
      toast({ title: "Friend request accepted" });
    },
  });

  const declineRequest = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/community/friendships/${id}/decline`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/friendships"] });
      toast({ title: "Friend request declined" });
    },
  });

  return (
    <div className="bg-card rounded-xl border p-5" data-testid="panel-friend-requests">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <UserPlus2 className="w-3.5 h-3.5" />
          Friend Requests
        </h4>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} data-testid="button-close-friend-requests">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      {pendingRequests.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3" data-testid="text-no-friend-requests">
          No pending requests
        </p>
      ) : (
        <div className="space-y-2.5">
          {pendingRequests.map((req) => (
            <div key={req.id} className="flex items-center justify-between gap-2" data-testid={`friend-request-${req.id}`}>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-7 w-7 shrink-0 ring-1 ring-background">
                  <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(req.requesterName || "User")} text-white text-[9px] font-bold`}>
                    {getInitials(req.requesterName || "U")}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate" data-testid={`text-requester-name-${req.id}`}>
                  {req.requesterName || "Someone"}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => acceptRequest.mutate(req.id)}
                  disabled={acceptRequest.isPending}
                  className="h-7 w-7 text-green-600 dark:text-green-400"
                  data-testid={`button-accept-friend-${req.id}`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => declineRequest.mutate(req.id)}
                  disabled={declineRequest.isPending}
                  className="h-7 w-7 text-destructive/60"
                  data-testid={`button-decline-friend-${req.id}`}
                >
                  <UserX className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeftSidebar({
  postCount,
  isLoggedIn,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  feedFilter,
  onFeedFilterChange,
  currentUserId,
  isAdmin,
}: {
  postCount: number;
  isLoggedIn: boolean;
  selectedGroupId: string | null;
  onSelectGroup: (id: string | null) => void;
  onCreateGroup: () => void;
  isAdmin?: boolean;
  feedFilter: string;
  onFeedFilterChange: (filter: string) => void;
  currentUserId?: string;
}) {
  const { toast } = useToast();
  const [showFriendRequests, setShowFriendRequests] = useState(false);

  const { data: members = [] } = useQuery<CommunityMember[]>({
    queryKey: ["/api/community/members"],
  });

  const { data: groups = [] } = useQuery<CommunityGroup[]>({
    queryKey: ["/api/community/groups"],
  });

  const { data: friendships = [] } = useQuery<CommunityFriendship[]>({
    queryKey: ["/api/community/friendships"],
    enabled: isLoggedIn,
  });

  const { data: friends = [] } = useQuery<CommunityFriend[]>({
    queryKey: ["/api/community/friends"],
    enabled: isLoggedIn,
  });

  const pendingRequestCount = friendships.filter((f) => f.status === "pending").length;
  const friendIds = new Set(friends.map((f) => f.id));
  const pendingOutgoing = new Set(
    friendships
      .filter((f) => f.status === "pending" && f.requesterId === currentUserId)
      .map((f) => f.addresseeId)
  );

  const sendFriendRequest = useMutation({
    mutationFn: async (addresseeId: string) => {
      await apiRequest("POST", "/api/community/friendships", { addresseeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/friendships"] });
      toast({ title: "Friend request sent" });
    },
    onError: () => {
      toast({ title: "Failed to send friend request", variant: "destructive" });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/community/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      toast({ title: "Member removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove member", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4 sticky top-6 z-40">
      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Community</h3>
            <p className="text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Separator className="mb-4" />
        <div className="space-y-3">
          <div className="flex items-center gap-3" data-testid="stat-members">
            <div className="h-8 w-8 rounded-lg bg-muted/60 dark:bg-muted/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-foreground/60" />
            </div>
            <div>
              <p className="text-sm font-medium" data-testid="text-member-count">{members.length}</p>
              <p className="text-[11px] text-muted-foreground">Members</p>
            </div>
          </div>
          <div className="flex items-center gap-3" data-testid="stat-posts">
            <div className="h-8 w-8 rounded-lg bg-muted/60 dark:bg-muted/30 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-foreground/60" />
            </div>
            <div>
              <p className="text-sm font-medium" data-testid="text-post-count">{postCount}</p>
              <p className="text-[11px] text-muted-foreground">Posts</p>
            </div>
          </div>
          {isLoggedIn && (
            <div className="flex items-center gap-3" data-testid="stat-friends">
              <div className="h-8 w-8 rounded-lg bg-muted/60 dark:bg-muted/30 flex items-center justify-center">
                <UsersRound className="w-4 h-4 text-foreground/60" />
              </div>
              <div>
                <p className="text-sm font-medium" data-testid="text-friend-count">{friends.length}</p>
                <p className="text-[11px] text-muted-foreground">Friends</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Groups
          </h4>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onCreateGroup}
              data-testid="button-create-group"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <button
          onClick={() => { onSelectGroup(null); onFeedFilterChange("all"); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
            !selectedGroupId && feedFilter === "all" ? "bg-primary/10 text-primary font-semibold" : "hover-elevate text-foreground/80"
          }`}
          data-testid="button-filter-all-posts"
        >
          <Globe className="w-4 h-4 shrink-0" />
          <span>All Posts</span>
        </button>
        {isLoggedIn && (
          <button
            onClick={() => { onSelectGroup(null); onFeedFilterChange("friends"); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
              feedFilter === "friends" ? "bg-primary/10 text-primary font-semibold" : "hover-elevate text-foreground/80"
            }`}
            data-testid="button-filter-friends"
          >
            <UsersRound className="w-4 h-4 shrink-0" />
            <span>Friends</span>
            {pendingRequestCount > 0 && (
              <Badge variant="secondary" className="ml-auto text-[10px] h-5 min-w-[20px] justify-center" data-testid="badge-friend-requests">
                {pendingRequestCount}
              </Badge>
            )}
          </button>
        )}
        {groups.length > 0 && (
          <div className="space-y-0.5 mt-1">
            {groups.map((group) => {
              const GroupIcon = getGroupIcon(group.icon);
              const isSelected = selectedGroupId === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    onSelectGroup(isSelected ? null : group.id);
                    onFeedFilterChange(isSelected ? "all" : "group");
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isSelected ? "bg-primary/10 font-semibold" : "hover-elevate"
                  }`}
                  data-testid={`button-group-${group.id}`}
                >
                  <span
                    className="h-5 w-5 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${group.color || "#3B82F6"}20` }}
                  >
                    <GroupIcon className="w-3 h-3" style={{ color: group.color || "#3B82F6" }} />
                  </span>
                  <span className="truncate flex-1 text-left">{group.name}</span>
                  {group.memberCount != null && (
                    <span className="text-[11px] text-muted-foreground shrink-0">{group.memberCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {groups.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2" data-testid="text-no-groups">No groups yet</p>
        )}
      </div>

      {isLoggedIn && showFriendRequests && (
        <FriendRequestsPanel onClose={() => setShowFriendRequests(false)} />
      )}

      {isLoggedIn && pendingRequestCount > 0 && !showFriendRequests && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => setShowFriendRequests(true)}
          data-testid="button-show-friend-requests"
        >
          <UserPlus2 className="w-3.5 h-3.5" />
          {pendingRequestCount} Friend Request{pendingRequestCount !== 1 ? "s" : ""}
        </Button>
      )}

      {members.length > 0 && (
        <div className="bg-card rounded-xl border p-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Members</h4>
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
            {members.slice(0, 20).map((member) => {
              const isFriend = friendIds.has(member.id);
              const isPendingOut = pendingOutgoing.has(member.id);
              const isSelf = member.id === currentUserId;

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2.5"
                  data-testid={`member-${member.id}`}
                >
                  <Avatar className="h-8 w-8 shrink-0 ring-1 ring-background">
                    {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.displayName} />}
                    <AvatarFallback
                      className={`bg-gradient-to-br ${getAvatarGradient(member.displayName)} text-white text-[10px] font-bold`}
                    >
                      {getInitials(member.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" data-testid={`text-member-name-${member.id}`}>{member.displayName}</p>
                    <p className="text-[11px] text-muted-foreground">Joined {getRelativeTime(member.createdAt)}</p>
                  </div>
                  {isLoggedIn && !isSelf && (
                    <div className="shrink-0 flex items-center gap-0.5">
                      {isFriend ? (
                        <span className="text-[11px] text-green-600 dark:text-green-400 font-medium flex items-center gap-0.5" data-testid={`badge-friend-${member.id}`}>
                          <UserCheck className="w-3 h-3" />
                        </span>
                      ) : isPendingOut ? (
                        <span className="text-[11px] text-muted-foreground font-medium" data-testid={`badge-pending-${member.id}`}>
                          Pending
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => sendFriendRequest.mutate(member.id)}
                          disabled={sendFriendRequest.isPending}
                          data-testid={`button-add-friend-${member.id}`}
                        >
                          <UserPlus2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Remove ${member.displayName} from the community? This will delete all their posts, comments, and data.`)) {
                              removeMember.mutate(member.id);
                            }
                          }}
                          disabled={removeMember.isPending}
                          data-testid={`button-remove-member-${member.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RightSidebar({ posts, isLoggedIn, onContactOpen, portalUrl }: {
  posts: CommunityPost[];
  isLoggedIn: boolean;
  onContactOpen: () => void;
  portalUrl?: string | null;
}) {
  const pinnedPosts = posts.filter((p) => p.isPinned);
  const topPosts = [...posts]
    .sort((a, b) => (b.likesCount + b.heartsCount + (b.hahaCount || 0) + (b.angryCount || 0)) - (a.likesCount + a.heartsCount + (a.hahaCount || 0) + (a.angryCount || 0)))
    .slice(0, 3);

  return (
    <div className="space-y-4 sticky top-6 z-40">
      {portalUrl && (
        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold" data-testid="text-portal-title">Your Portal</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Access your project portal to manage your services.</p>
          <a href={portalUrl} target="_blank" rel="noopener noreferrer" data-testid="link-portal">
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
              <ExternalLink className="w-3 h-3" />
              Open Portal
            </Button>
          </a>
        </div>
      )}

      {pinnedPosts.length > 0 && (
        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Pin className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pinned</h4>
          </div>
          <div className="space-y-2">
            {pinnedPosts.slice(0, 3).map((p) => (
              <a
                key={p.id}
                href={`#post-${p.id}`}
                className="block p-3 rounded-lg bg-muted/30 dark:bg-muted/15 transition-colors hover-elevate"
                data-testid={`link-pinned-${p.id}`}
              >
                <p className="text-sm font-medium line-clamp-2" data-testid={`text-pinned-title-${p.id}`}>{p.title || p.body}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{getRelativeTime(p.createdAt)}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trending</h4>
        </div>
        {topPosts.length > 0 ? (
          <div className="space-y-2">
            {topPosts.map((p, i) => (
              <a
                key={p.id}
                href={`#post-${p.id}`}
                className="flex items-start gap-3 p-2 rounded-lg hover-elevate"
                data-testid={`link-trending-${p.id}`}
              >
                <span className="text-lg font-bold text-muted-foreground/50 mt-0.5 min-w-[20px]">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2" data-testid={`text-trending-title-${p.id}`}>{p.title || p.body}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">{p.likesCount + p.heartsCount + (p.hahaCount || 0) + (p.angryCount || 0)} reactions</span>
                    <span className="text-[11px] text-muted-foreground">{p.commentsCount} comments</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">No trending posts yet</p>
        )}
      </div>

      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold" data-testid="text-contact-title">Get in Touch</h4>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Have a question or feedback? Send us a message.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onContactOpen}
          className="w-full gap-1.5 text-xs"
          data-testid="button-open-contact"
        >
          <Mail className="w-3 h-3" />
          Send Message
        </Button>
      </div>

      <div className="bg-muted/30 dark:bg-muted/15 rounded-xl border p-5">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold" data-testid="text-promo-title">AI Powered Sites</h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-promo-description">
          Premium web solutions powered by AI. Get a free website audit and discover how we can transform your online presence.
        </p>
        <a href="/" className="inline-block mt-3" data-testid="link-learn-more">
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <ArrowUp className="w-3 h-3 rotate-45" />
            Learn More
          </Button>
        </a>
      </div>
    </div>
  );
}

interface CommunityProps {
  isAdmin?: boolean;
  portalToken?: string;
}

export default function Community({ isAdmin: isAdminProp = false, portalToken }: CommunityProps) {
  const { toast } = useToast();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState<string>("all");
  const [adminAutoLoggedIn, setAdminAutoLoggedIn] = useState(false);

  const adminAuth = useAuth();
  const auth = useCommunityAuth(false);

  const isAdmin = isAdminProp || !!adminAuth.user || !!(auth.user as any)?.isAdmin;

  useEffect(() => {
    if (adminAuth.user && !adminAutoLoggedIn && !auth.isLoggedIn) {
      apiRequest("POST", "/api/community/auth/admin-auto-login")
        .then(() => {
          setAdminAutoLoggedIn(true);
          auth.refetch();
        })
        .catch(() => {});
    }
  }, [adminAuth.user, adminAutoLoggedIn, auth.isLoggedIn]);

  const { data: portalData } = useQuery<{ customer: { name: string } }>({
    queryKey: ["/api/portal", portalToken],
    enabled: !!portalToken,
  });

  const { data: portalLinkData } = useQuery<{ hasPortal: boolean; portalUrl?: string }>({
    queryKey: ["/api/community/user/portal-link"],
    enabled: auth.isLoggedIn,
  });

  const displayName = isAdmin
    ? [adminAuth.user?.firstName, adminAuth.user?.lastName].filter(Boolean).join(" ") || "Admin"
    : auth.user?.displayName || "";

  const authorType = isAdmin ? "admin" : "member";

  const { data: posts = [], isLoading } = useQuery<CommunityPost[]>({
    queryKey: ["/api/community/posts"],
    refetchInterval: 30000,
  });

  const { data: groupPosts = [] } = useQuery<CommunityPost[]>({
    queryKey: ["/api/community/groups", selectedGroupId, "posts"],
    enabled: !!selectedGroupId,
  });

  const { data: friends = [] } = useQuery<CommunityFriend[]>({
    queryKey: ["/api/community/friends"],
    enabled: auth.isLoggedIn || (isAdmin && adminAutoLoggedIn),
  });

  const { data: groups = [] } = useQuery<CommunityGroup[]>({
    queryKey: ["/api/community/groups"],
  });

  const { data: allMembers = [] } = useQuery<CommunityMember[]>({
    queryKey: ["/api/community/members"],
  });

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;

  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");

  const userAvatar = isAdmin ? (adminAuth.user?.profileImageUrl || auth.user?.avatarUrl || "") : (auth.user?.avatarUrl || "");

  const createPost = useMutation({
    mutationFn: async (data: { title?: string; body: string; imageUrl?: string }) => {
      const res = await apiRequest("POST", "/api/community/posts", {
        ...data,
        authorName: displayName,
        authorAvatar: userAvatar || undefined,
        authorType: authorType,
        authorRole: isAdmin ? "admin" : "member",
        ...(selectedGroupId ? { groupId: selectedGroupId } : {}),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      if (selectedGroupId) {
        queryClient.invalidateQueries({ queryKey: ["/api/community/groups", selectedGroupId, "posts"] });
      }
      toast({ title: "Post published" });
    },
    onError: () => {
      toast({ title: "Failed to create post", variant: "destructive" });
    },
  });

  const editPost = useMutation({
    mutationFn: async (data: { id: string; title?: string; body: string; imageUrl?: string }) => {
      const { id, ...updates } = data;
      const res = await apiRequest("PATCH", `/api/community/posts/${id}`, {
        ...updates,
        authorName: displayName,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      toast({ title: "Post updated" });
      setEditingPost(null);
    },
    onError: () => {
      toast({ title: "Failed to update post", variant: "destructive" });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/community/posts/${id}?authorName=${encodeURIComponent(displayName)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      toast({ title: "Post deleted" });
    },
  });

  const pinPost = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      await apiRequest("PATCH", `/api/community/posts/${id}`, { isPinned, authorName: displayName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
  });

  const handleNeedName = () => {
    if (!displayName) {
      setAuthDialogOpen(true);
    }
  };

  const friendUserIds = new Set(friends.map((f) => f.id));

  const filteredPosts = (() => {
    if (feedFilter === "group" && selectedGroupId) {
      return groupPosts;
    }
    if (feedFilter === "friends") {
      return posts.filter((p) => p.authorUserId && friendUserIds.has(p.authorUserId));
    }
    return posts;
  })();

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const portalUrl = portalLinkData?.hasPortal ? portalLinkData.portalUrl : null;

  return (
    <div className={`min-h-screen ${isAdmin ? "" : "bg-muted/30 dark:bg-muted/10"}`} data-testid="page-community">
      {!isAdmin && (
        <div className="relative">
          <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 mb-3">
                <div className="h-12 w-12 rounded-xl bg-muted/60 dark:bg-muted/30 flex items-center justify-center border">
                  <Sparkles className="w-6 h-6 text-foreground/60" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-community-title">
                    Community
                  </h1>
                  <p className="text-sm text-muted-foreground" data-testid="text-community-subtitle">
                    Updates, announcements, and conversations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {auth.isLoggedIn && (
                  <NotificationBell />
                )}
                {auth.isLoggedIn && auth.user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="gap-2" data-testid="button-user-menu">
                        <Avatar className="h-7 w-7 ring-1 ring-border">
                          {auth.user.avatarUrl && <AvatarImage src={auth.user.avatarUrl} />}
                          <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(auth.user.displayName)} text-white text-[10px] font-bold`}>
                            {getInitials(auth.user.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium hidden sm:inline" data-testid="text-user-name">{auth.user.displayName}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48" data-testid="dropdown-user-menu">
                      <DropdownMenuItem
                        onClick={() => { window.location.href = "/community/account"; }}
                        data-testid="menu-my-account"
                      >
                        <User className="w-4 h-4 mr-2" />
                        My Account
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => auth.logout.mutate()}
                        data-testid="menu-signout"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setAuthDialogOpen(true)}
                      data-testid="button-hero-login"
                    >
                      <LogIn className="w-4 h-4" />
                      <span className="hidden sm:inline">Sign In</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setAuthDialogOpen(true)}
                      data-testid="button-hero-signup"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Sign Up</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-muted/40 dark:bg-muted/20 px-3 py-1.5 rounded-full border">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{posts.length} posts</span>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/40 dark:bg-muted/20 px-3 py-1.5 rounded-full border">
                <Globe className="w-3.5 h-3.5" />
                <span>Public</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight" data-testid="text-community-title">Community</h1>
                <p className="text-sm text-muted-foreground" data-testid="text-community-subtitle">Manage posts and engage with your community</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {auth.isLoggedIn && (
                <NotificationBell />
              )}
              {auth.isLoggedIn && auth.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2" data-testid="button-admin-user-menu">
                      <Avatar className="h-7 w-7 ring-1 ring-border">
                        {(auth.user.avatarUrl || adminAuth.user?.profileImageUrl) && <AvatarImage src={auth.user.avatarUrl || (adminAuth.user as any)?.profileImageUrl || ""} />}
                        <AvatarFallback className={`bg-gradient-to-br ${getAvatarGradient(auth.user.displayName)} text-white text-[10px] font-bold`}>
                          {getInitials(auth.user.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium hidden sm:inline" data-testid="text-admin-user-name">{auth.user.displayName}</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48" data-testid="dropdown-admin-user-menu">
                    <DropdownMenuItem
                      onClick={() => { window.location.href = "/community/account"; }}
                      data-testid="menu-admin-my-account"
                    >
                      <User className="w-4 h-4 mr-2" />
                      My Account
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => auth.logout.mutate()}
                      data-testid="menu-admin-signout"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto ${isAdmin ? "" : "px-4 py-6"}`}>
        <div className="flex gap-6">
          <div className="hidden lg:block w-[260px] shrink-0">
            <LeftSidebar
              postCount={posts.length}
              isLoggedIn={auth.isLoggedIn}
              isAdmin={isAdmin}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
              onCreateGroup={() => setCreateGroupDialogOpen(true)}
              feedFilter={feedFilter}
              onFeedFilterChange={setFeedFilter}
              currentUserId={auth.user?.id}
            />
          </div>

          <div className={`flex-1 min-w-0 space-y-5`}>
            <div className="flex items-center gap-2 flex-wrap" data-testid="feed-filter-tabs">
                <Button
                  variant={feedFilter === "all" && !selectedGroupId ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => { setFeedFilter("all"); setSelectedGroupId(null); }}
                  data-testid="button-feed-all"
                >
                  <Globe className="w-3.5 h-3.5" />
                  All Posts
                </Button>
                {auth.isLoggedIn && (
                  <Button
                    variant={feedFilter === "friends" ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => { setFeedFilter("friends"); setSelectedGroupId(null); }}
                    data-testid="button-feed-friends"
                  >
                    <UsersRound className="w-3.5 h-3.5" />
                    Friends
                  </Button>
                )}
                {selectedGroup && (
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 text-xs"
                    data-testid="button-feed-group"
                  >
                    <Hash className="w-3.5 h-3.5" />
                    {selectedGroup.name}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedGroupId(null); setFeedFilter("all"); }}
                      className="ml-1"
                      data-testid="button-clear-group-filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Button>
                )}
              </div>

            {selectedGroup && (
              <div
                className="bg-card rounded-xl border overflow-visible"
                data-testid={`group-header-${selectedGroup.id}`}
              >
                <div
                  className="h-16 rounded-t-xl flex items-end"
                  style={{ backgroundColor: `${selectedGroup.color || "#3B82F6"}15` }}
                >
                  <div className="px-5 pb-3 flex items-center gap-3">
                    <span
                      className="h-9 w-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${selectedGroup.color || "#3B82F6"}25` }}
                    >
                      {(() => {
                        const GIcon = getGroupIcon(selectedGroup.icon);
                        return <GIcon className="w-5 h-5" style={{ color: selectedGroup.color || "#3B82F6" }} />;
                      })()}
                    </span>
                    <div>
                      <h3 className="font-semibold text-base" data-testid={`text-group-name-${selectedGroup.id}`}>{selectedGroup.name}</h3>
                      {selectedGroup.description && (
                        <p className="text-xs text-muted-foreground" data-testid={`text-group-desc-${selectedGroup.id}`}>{selectedGroup.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {displayName ? (
              <PostComposer
                onPost={(data) => createPost.mutate(data)}
                isPending={createPost.isPending}
                displayName={displayName}
                avatarUrl={userAvatar}
              />
            ) : (
              <div
                className="bg-card rounded-xl border p-5 cursor-pointer"
                onClick={handleNeedName}
                data-testid="card-post-composer-prompt"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 ring-2 ring-background shadow-sm">
                    <AvatarFallback className="bg-muted text-muted-foreground text-sm font-bold">?</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 rounded-lg bg-muted/40 dark:bg-muted/20 px-4 py-3 text-muted-foreground text-sm">
                    Sign in to join the conversation...
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <FeedSkeleton />
            ) : sortedPosts.length === 0 ? (
              <div className="bg-card rounded-xl border p-12 text-center" data-testid="empty-state">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  {feedFilter === "friends" ? "No posts from friends" : feedFilter === "group" ? "No posts in this group" : "No posts yet"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {feedFilter === "friends"
                    ? "Add friends or wait for them to post!"
                    : feedFilter === "group"
                    ? "Be the first to post in this group!"
                    : "Be the first to share something with the community!"}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {sortedPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    isAdmin={isAdmin}
                    displayName={displayName}
                    authorType={authorType}
                    userAvatar={userAvatar}
                    currentUserId={auth.user?.id}
                    members={allMembers}
                    onNeedName={handleNeedName}
                    onDelete={(id) => deletePost.mutate(id)}
                    onPin={(id, isPinned) => pinPost.mutate({ id, isPinned })}
                    onEdit={(p) => {
                      setEditingPost(p);
                      setEditTitle(p.title || "");
                      setEditBody(p.body);
                      setEditImageUrl(p.imageUrl || "");
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="hidden xl:block w-[300px] shrink-0">
            <RightSidebar
              posts={posts}
              isLoggedIn={auth.isLoggedIn}
              onContactOpen={() => setContactDialogOpen(true)}
              portalUrl={portalUrl}
            />
          </div>
        </div>
      </div>

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        auth={auth}
      />

      <ContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        prefillName={auth.user?.displayName}
        prefillEmail={auth.user?.email}
      />

      <CreateGroupDialog
        open={createGroupDialogOpen}
        onOpenChange={setCreateGroupDialogOpen}
      />

      <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent className="sm:max-w-[520px]" data-testid="dialog-edit-post">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Edit Post
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Make changes to your post below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Post title (optional)"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="h-11 text-base font-medium"
              data-testid="input-edit-title"
            />
            <Textarea
              placeholder="What's on your mind?"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="min-h-[120px] text-base resize-none"
              data-testid="textarea-edit-body"
            />
            <Input
              placeholder="Image URL (optional)"
              value={editImageUrl}
              onChange={(e) => setEditImageUrl(e.target.value)}
              data-testid="input-edit-image"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditingPost(null)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingPost && editBody.trim()) {
                  editPost.mutate({
                    id: editingPost.id,
                    title: editTitle.trim() || undefined,
                    body: editBody.trim(),
                    imageUrl: editImageUrl.trim() || undefined,
                  });
                }
              }}
              disabled={!editBody.trim() || editPost.isPending}
              className="gap-1.5"
              data-testid="button-save-edit"
            >
              <CheckCircle2 className="w-4 h-4" />
              {editPost.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
