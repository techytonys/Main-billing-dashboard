import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Clock,
  User,
  Mail,
  Search,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Archive,
  RotateCcw,
  Paperclip,
  ExternalLink,
  Copy,
  Check,
  FileText,
  LinkIcon,
  Image as ImageIcon,
  X,
  Plus,
} from "lucide-react";
import type { Conversation, ConversationMessage } from "@shared/schema";

interface AttachmentItem {
  name: string;
  url: string;
  type: "file" | "image" | "url";
  contentType?: string;
}

interface ConversationWithMeta extends Conversation {
  messageCount: number;
  lastMessage: ConversationMessage | null;
}

interface ConversationDetail extends Conversation {
  messages: ConversationMessage[];
}

export default function AdminConversations() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [replyAttachments, setReplyAttachments] = useState<AttachmentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const adminFileInputRef = useRef<HTMLInputElement>(null);

  const { data: conversations = [], isLoading } = useQuery<ConversationWithMeta[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: detail, isLoading: detailLoading } = useQuery<ConversationDetail>({
    queryKey: ["/api/conversations", selectedId],
    enabled: !!selectedId,
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, message, attachments }: { id: string; message: string; attachments: AttachmentItem[] }) => {
      return apiRequest("POST", `/api/conversations/${id}/messages`, {
        message,
        attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
      });
    },
    onSuccess: () => {
      setReplyText("");
      setReplyAttachments([]);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Reply sent", description: "The visitor will receive an email notification." });
    },
    onError: () => {
      toast({ title: "Failed to send reply", variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/conversations/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedId] });
    },
  });

  const filteredConversations = conversations.filter((c) =>
    !searchQuery ||
    c.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.visitorEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: string | Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleSendReply = () => {
    const trimmed = replyText.trim();
    if ((!trimmed && replyAttachments.length === 0) || !selectedId) return;
    replyMutation.mutate({
      id: selectedId,
      message: trimmed || (replyAttachments.length > 0 ? "Shared attachments" : ""),
      attachments: replyAttachments,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleAdminFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const isImage = file.type.startsWith("image/");
        const reqRes = await fetch("/api/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
        });
        if (!reqRes.ok) throw new Error("Failed to get upload URL");
        const { uploadURL, objectPath } = await reqRes.json();
        await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        setReplyAttachments((prev) => [...prev, { name: file.name, url: `/objects${objectPath}`, type: isImage ? "image" : "file", contentType: file.type }]);
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (adminFileInputRef.current) adminFileInputRef.current.value = "";
    }
  };

  const handleAdminAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    let url = trimmed;
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    setReplyAttachments((prev) => [...prev, { name: url, url, type: "url" }]);
    setUrlInput("");
    setShowUrlInput(false);
  };

  const renderAttachments = (attachmentsJson: string | null) => {
    if (!attachmentsJson) return null;
    try {
      const files: AttachmentItem[] = JSON.parse(attachmentsJson);
      if (!Array.isArray(files) || files.length === 0) return null;
      const images = files.filter((f) => f.type === "image");
      const otherFiles = files.filter((f) => f.type === "file");
      const urls = files.filter((f) => f.type === "url");
      return (
        <div className="mt-2 space-y-1.5">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="block rounded-md overflow-hidden border border-border hover:border-primary/40 transition-colors">
                  <img src={img.url} alt={img.name} className="max-w-[200px] max-h-[140px] object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          )}
          {otherFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {otherFiles.map((file, i) => (
                <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs hover:underline">
                  <FileText className="w-3 h-3" /><span className="max-w-[120px] truncate">{file.name}</span><ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          )}
          {urls.length > 0 && (
            <div className="flex flex-col gap-1">
              {urls.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline break-all">
                  <LinkIcon className="w-3 h-3 shrink-0" />{link.url}
                </a>
              ))}
            </div>
          )}
        </div>
      );
    } catch {
      return null;
    }
  };

  const copyConversationLink = (token: string | null) => {
    if (!token) return;
    const baseUrl = window.location.origin;
    navigator.clipboard.writeText(`${baseUrl}/conversation/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({ title: "Link copied", description: "Conversation link copied to clipboard." });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Conversations</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage client onboarding conversations</p>
        </div>
        <Badge variant="secondary" data-testid="badge-conversation-count">
          {conversations.length} total
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or subject..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-conversations"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredConversations.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-1" data-testid="text-empty-state">No conversations yet</h3>
          <p className="text-sm text-muted-foreground">When visitors start conversations from your landing page, they'll appear here.</p>
        </Card>
      ) : (
        <div className="grid gap-3" data-testid="conversations-list">
          {filteredConversations.map((conv) => {
            const lastMsgTime = conv.lastMessage?.createdAt || conv.updatedAt;
            const hasUnreplied = conv.lastMessage?.senderType === "visitor" && conv.status === "active";
            return (
              <Card
                key={conv.id}
                className={`p-4 cursor-pointer transition-colors hover-elevate ${hasUnreplied ? "border-violet-500/30" : ""}`}
                onClick={() => setSelectedId(conv.id)}
                data-testid={`card-conversation-${conv.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm" data-testid={`text-visitor-name-${conv.id}`}>{conv.visitorName}</span>
                      {hasUnreplied && (
                        <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30" data-testid={`badge-needs-reply-${conv.id}`}>
                          Needs Reply
                        </Badge>
                      )}
                      <Badge variant={conv.status === "active" ? "default" : "secondary"} className={conv.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}>
                        {conv.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium truncate" data-testid={`text-subject-${conv.id}`}>{conv.subject}</p>
                    {conv.lastMessage && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        <span className="font-medium">{conv.lastMessage.senderName}:</span> {conv.lastMessage.message}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{conv.visitorEmail}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{conv.messageCount} messages</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(lastMsgTime)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); copyConversationLink(conv.accessToken); }}
                    data-testid={`button-copy-link-${conv.id}`}
                  >
                    {copiedToken === conv.accessToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedId} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <DialogTitle className="text-base truncate" data-testid="text-dialog-subject">{detail?.subject || "Loading..."}</DialogTitle>
                {detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {detail.visitorName} ({detail.visitorEmail})
                  </p>
                )}
              </div>
              {detail && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyConversationLink(detail.accessToken)}
                    data-testid="button-copy-conversation-link"
                  >
                    {copiedToken === detail.accessToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  {detail.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => statusMutation.mutate({ id: detail.id, status: "closed" })}
                      data-testid="button-close-conversation"
                    >
                      <Archive className="w-3.5 h-3.5 mr-1.5" />
                      Close
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => statusMutation.mutate({ id: detail.id, status: "active" })}
                      data-testid="button-reopen-conversation"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Reopen
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-0 py-4 space-y-3" data-testid="dialog-messages-list">
            {detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : detail?.messages?.map((msg) => {
              const isAdmin = msg.senderType === "admin";
              return (
                <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`} data-testid={`dialog-message-${msg.id}`}>
                  <div className={`max-w-[80%]`}>
                    <Card className={`p-3 ${isAdmin ? "bg-primary/10 border-primary/20" : ""}`}>
                      {msg.message && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>}
                      {renderAttachments(msg.attachments)}
                    </Card>
                    <div className={`flex items-center gap-2 mt-1 ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <span className="text-[10px] text-muted-foreground">{msg.senderName}</span>
                      <span className="text-[10px] text-muted-foreground/50">{formatTime(msg.createdAt as unknown as string)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {detail?.status === "active" && (
            <div className="border-t pt-3 space-y-2">
              {replyAttachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {replyAttachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs" data-testid={`admin-pending-attachment-${i}`}>
                      {att.type === "image" ? <ImageIcon className="w-3 h-3 text-emerald-500" /> : att.type === "url" ? <LinkIcon className="w-3 h-3 text-blue-500" /> : <FileText className="w-3 h-3 text-orange-500" />}
                      <span className="max-w-[100px] truncate">{att.name}</span>
                      <button onClick={() => setReplyAttachments((p) => p.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground" data-testid={`button-remove-admin-attachment-${i}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {showUrlInput && (
                <div className="flex gap-2">
                  <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdminAddUrl(); } }} placeholder="Paste a URL..." className="flex-1 text-sm" autoFocus data-testid="input-admin-url" />
                  <Button onClick={handleAdminAddUrl} disabled={!urlInput.trim()} size="sm" data-testid="button-admin-add-url"><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
                  <Button onClick={() => { setShowUrlInput(false); setUrlInput(""); }} size="sm" variant="ghost" data-testid="button-admin-cancel-url"><X className="w-3.5 h-3.5" /></Button>
                </div>
              )}
              <div className="flex gap-2">
                <input ref={adminFileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.zip,.psd,.ai,.fig" onChange={handleAdminFileSelect} className="hidden" data-testid="input-admin-file-upload" />
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => adminFileInputRef.current?.click()} disabled={isUploading} title="Attach files" data-testid="button-admin-attach-file">
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setShowUrlInput(!showUrlInput)} title="Add URL" data-testid="button-admin-add-link">
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your reply..."
                  className="flex-1 min-h-[44px] max-h-28 resize-none text-sm"
                  data-testid="input-admin-reply"
                />
                <Button
                  onClick={handleSendReply}
                  disabled={(!replyText.trim() && replyAttachments.length === 0) || replyMutation.isPending}
                  data-testid="button-send-admin-reply"
                >
                  {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
