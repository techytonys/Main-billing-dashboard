import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Clock,
  Paperclip,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  FileText,
  LinkIcon,
  X,
  Plus,
  Upload,
} from "lucide-react";
import type { ConversationMessage } from "@shared/schema";

interface Attachment {
  name: string;
  url: string;
  type: "file" | "image" | "url";
  contentType?: string;
}

interface ConversationData {
  id: string;
  visitorName: string;
  subject: string;
  status: string;
  createdAt: string;
  messages: ConversationMessage[];
}

export default function ConversationPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading } = useQuery<ConversationData>({
    queryKey: ["/api/public/conversations", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/conversations/${token}`);
      if (!res.ok) throw new Error("Failed to load conversation");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ message, attachments: atts }: { message: string; attachments: Attachment[] }) => {
      const res = await fetch(`/api/public/conversations/${token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          attachments: atts.length > 0 ? JSON.stringify(atts) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      setAttachments([]);
      queryClient.invalidateQueries({ queryKey: ["/api/public/conversations", token] });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages?.length]);

  const handleSend = () => {
    const trimmed = newMessage.trim();
    if (!trimmed && attachments.length === 0) return;
    sendMutation.mutate({ message: trimmed || (attachments.length > 0 ? "Shared attachments" : ""), attachments });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

        await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        const fileUrl = `/objects${objectPath}`;
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: fileUrl,
            type: isImage ? "image" : "file",
            contentType: file.type,
          },
        ]);
      }
      toast({ title: "Files uploaded", description: `${files.length} file${files.length > 1 ? "s" : ""} ready to send` });
    } catch (err) {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    let url = trimmed;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    setAttachments((prev) => [...prev, { name: url, url, type: "url" }]);
    setUrlInput("");
    setShowUrlInput(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-1">Conversation Not Found</h2>
          <p className="text-white/50 text-sm mb-4">This link may be invalid or expired.</p>
          <Link href="/">
            <Button variant="outline" className="border-white/10 text-white" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const renderAttachments = (attachmentsJson: string | null) => {
    if (!attachmentsJson) return null;
    try {
      const files: Attachment[] = JSON.parse(attachmentsJson);
      if (!Array.isArray(files) || files.length === 0) return null;

      const images = files.filter((f) => f.type === "image");
      const otherFiles = files.filter((f) => f.type === "file");
      const urls = files.filter((f) => f.type === "url");

      return (
        <div className="mt-3 space-y-2">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <a
                  key={i}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md overflow-hidden border border-white/10 hover:border-violet-500/40 transition-colors"
                  data-testid={`link-image-attachment-${i}`}
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="max-w-[240px] max-h-[180px] object-cover"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          )}
          {otherFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {otherFiles.map((file, i) => (
                <a
                  key={i}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  data-testid={`link-file-attachment-${i}`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="max-w-[160px] truncate">{file.name}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ))}
            </div>
          )}
          {urls.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {urls.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors break-all"
                  data-testid={`link-url-attachment-${i}`}
                >
                  <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                  {link.url}
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

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white" style={{ fontFamily: "Poppins, sans-serif" }}>
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a14]/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-white/60 shrink-0" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate" data-testid="text-conversation-subject">{conversation.subject}</h1>
              <p className="text-xs text-white/40">Secure conversation with AI Powered Sites</p>
            </div>
          </div>
          <Badge
            variant={conversation.status === "active" ? "default" : "secondary"}
            className={conversation.status === "active" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}
            data-testid="badge-conversation-status"
          >
            {conversation.status === "active" ? "Active" : "Closed"}
          </Badge>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-40">
        <div className="flex flex-col gap-4" data-testid="messages-list">
          {conversation.messages.map((msg) => {
            const isVisitor = msg.senderType === "visitor";
            return (
              <div
                key={msg.id}
                className={`flex ${isVisitor ? "justify-end" : "justify-start"}`}
                data-testid={`message-${msg.id}`}
              >
                <div className={`max-w-[85%] sm:max-w-[75%] ${isVisitor ? "order-1" : ""}`}>
                  <div
                    className={`rounded-md p-3 sm:p-4 ${
                      isVisitor
                        ? "bg-violet-500/20 border border-violet-500/20"
                        : "bg-white/[0.04] border border-white/5"
                    }`}
                  >
                    {msg.message && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid={`text-message-content-${msg.id}`}>
                        {msg.message}
                      </p>
                    )}
                    {renderAttachments(msg.attachments)}
                  </div>
                  <div className={`flex items-center gap-2 mt-1 ${isVisitor ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] text-white/30">{msg.senderName}</span>
                    <span className="text-[10px] text-white/20">{formatTime(msg.createdAt as unknown as string)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {conversation.status === "active" && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-[#0a0a14]/95 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-4 py-3">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-white/5">
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs"
                    data-testid={`pending-attachment-${i}`}
                  >
                    {att.type === "image" ? (
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                    ) : att.type === "url" ? (
                      <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-orange-400" />
                    )}
                    <span className="max-w-[120px] truncate text-white/70">{att.name}</span>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="text-white/30 hover:text-white/60 transition-colors"
                      data-testid={`button-remove-attachment-${i}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showUrlInput && (
              <div className="flex gap-2 mb-2">
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddUrl(); } }}
                  placeholder="Paste a URL (website, design inspiration, etc.)"
                  className="flex-1 bg-white/[0.04] border-white/10 text-white text-sm placeholder:text-white/30"
                  autoFocus
                  data-testid="input-url"
                />
                <Button
                  onClick={handleAddUrl}
                  disabled={!urlInput.trim()}
                  size="sm"
                  className="bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  data-testid="button-add-url"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
                <Button
                  onClick={() => { setShowUrlInput(false); setUrlInput(""); }}
                  size="sm"
                  variant="ghost"
                  className="text-white/40"
                  data-testid="button-cancel-url"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex gap-1 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.zip,.psd,.ai,.fig,.sketch,.xd"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-white/40 hover:text-white/70"
                  title="Attach files or images"
                  data-testid="button-attach-file"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-white/40 hover:text-white/70"
                  title="Add a URL"
                  data-testid="button-add-link"
                >
                  <LinkIcon className="w-4 h-4" />
                </Button>
              </div>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-1 min-h-[44px] max-h-32 bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 resize-none text-sm"
                data-testid="input-message"
              />
              <Button
                onClick={handleSend}
                disabled={(!newMessage.trim() && attachments.length === 0) || sendMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-violet-600 border-0 text-white shrink-0"
                data-testid="button-send-message"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-white/20 mt-1.5 text-center">
              Attach files, images, or URLs. Press Enter to send, Shift+Enter for new line.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
