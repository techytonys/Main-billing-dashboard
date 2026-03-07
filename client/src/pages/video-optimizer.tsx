import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { useUpload } from "@/hooks/use-upload";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Video,
  Upload,
  Download,
  Trash2,
  Loader2,
  Wand2,
  Monitor,
  Smartphone,
  Square,
  Calendar,
  Plus,
  Film,
  Check,
  X,
  Clock,
  LayoutGrid,
  FileVideo,
  RefreshCw,
  Send,
  ExternalLink,
  Pencil,
  Copy,
  Save,
  Hash,
  Type,
  FileText,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import {
  SiFacebook,
  SiInstagram,
  SiTiktok,
  SiYoutube,
  SiPinterest,
} from "react-icons/si";
import type { SocialVideo, SocialVideoVariant, SocialPost } from "@shared/schema";

const PLATFORM_INFO: Record<string, { label: string; icon: any; color: string; dimensions: string; uploadUrl: string }> = {
  tiktok: { label: "TikTok / Reels", icon: SiTiktok, color: "bg-gray-900 dark:bg-white dark:text-black", dimensions: "1080 x 1920", uploadUrl: "https://www.tiktok.com/upload" },
  instagram_reel: { label: "Instagram Reel", icon: SiInstagram, color: "bg-gradient-to-br from-pink-500 to-purple-600", dimensions: "1080 x 1920", uploadUrl: "https://www.instagram.com/" },
  facebook_reel: { label: "Facebook Reel", icon: SiFacebook, color: "bg-blue-600", dimensions: "1080 x 1920", uploadUrl: "https://www.facebook.com/reels/create" },
  pinterest: { label: "Pinterest Pin", icon: SiPinterest, color: "bg-red-600", dimensions: "1000 x 1500", uploadUrl: "https://www.pinterest.com/pin-creation-tool/" },
  youtube: { label: "YouTube", icon: SiYoutube, color: "bg-red-500", dimensions: "1920 x 1080", uploadUrl: "https://studio.youtube.com/" },
  square: { label: "Square Post", icon: Square, color: "bg-indigo-600", dimensions: "1080 x 1080", uploadUrl: "" },
};

type VideoWithVariants = SocialVideo & { variants?: SocialVideoVariant[] };

export default function VideoOptimizer() {
  usePageTitle("Video Optimizer");
  const { toast } = useToast();
  const { getUploadParameters } = useUpload();
  const [selectedVideo, setSelectedVideo] = useState<VideoWithVariants | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [postHashtags, setPostHashtags] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    platform: "",
    caption: "",
    hashtags: "",
    scheduledAt: "",
  });

  const { data: videos = [], isLoading } = useQuery<SocialVideo[]>({
    queryKey: ["/api/social-videos"],
  });

  const { data: posts = [] } = useQuery<SocialPost[]>({
    queryKey: ["/api/social-posts"],
  });

  const { data: videoDetail, refetch: refetchDetail } = useQuery<VideoWithVariants>({
    queryKey: ["/api/social-videos", selectedVideo?.id],
    enabled: !!selectedVideo?.id,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { objectPath: string; fileName: string; fileSize: number }) => {
      const res = await apiRequest("POST", "/api/social-videos", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-videos"] });
      toast({ title: "Video uploaded", description: "Your video has been saved to the library." });
    },
  });

  const optimizeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/social-videos/${id}/optimize`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Optimization started", description: "Your video is being optimized for all platforms. This may take a minute." });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/social-videos"] });
        if (selectedVideo) refetchDetail();
      }, 5000);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/social-videos"] });
        if (selectedVideo) refetchDetail();
      }, 15000);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/social-videos"] });
        if (selectedVideo) refetchDetail();
      }, 30000);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/social-videos"] });
        if (selectedVideo) refetchDetail();
      }, 60000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/social-videos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-videos"] });
      setSelectedVideo(null);
      toast({ title: "Video deleted" });
    },
  });

  const saveDetailsMutation = useMutation({
    mutationFn: async ({ id, description, hashtags }: { id: string; description: string; hashtags: string }) => {
      const res = await apiRequest("PATCH", `/api/social-videos/${id}`, { description, hashtags });
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-videos"] });
      if (selectedVideo) {
        setSelectedVideo({ ...selectedVideo, description: updated.description, hashtags: updated.hashtags });
        queryClient.invalidateQueries({ queryKey: ["/api/social-videos", selectedVideo.id] });
      }
      toast({ title: "Post details saved" });
    },
  });

  const generateDescriptionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/social-videos/${id}/generate-description`, { type: "description" });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.description) {
        setPostDescription(data.description);
        toast({ title: "Description generated" });
      }
    },
    onError: (err: any) => {
      const msg = err?.message?.includes("API key") ? "OpenAI API key needs to be updated in settings" : "Failed to generate description";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const generateHashtagsMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/social-videos/${id}/generate-description`, { type: "hashtags" });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.hashtags) {
        setPostHashtags(data.hashtags);
        toast({ title: "Hashtags generated" });
      }
    },
    onError: (err: any) => {
      const msg = err?.message?.includes("API key") ? "OpenAI API key needs to be updated in settings" : "Failed to generate hashtags";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const copyAll = async () => {
    const title = displayVideo?.title || "";
    const desc = postDescription;
    const tags = postHashtags;
    const parts = [title, desc, tags].filter(Boolean);
    await copyToClipboard(parts.join("\n\n"), "all");
  };

  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await apiRequest("PATCH", `/api/social-videos/${id}`, { title });
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-videos"] });
      if (selectedVideo) {
        setSelectedVideo({ ...selectedVideo, title: updated.title });
        queryClient.invalidateQueries({ queryKey: ["/api/social-videos", selectedVideo.id] });
        refetchDetail();
      }
      setIsRenaming(false);
      toast({ title: "Video renamed" });
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/social-posts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      setShowScheduler(false);
      setScheduleForm({ platform: "", caption: "", hashtags: "", scheduledAt: "" });
      toast({ title: "Post scheduled" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/social-posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      toast({ title: "Scheduled post removed" });
    },
  });

  const handleUploadComplete = (result: any) => {
    const files = result.successful || [];
    for (const file of files) {
      const uploadUrl = file.uploadURL || "";
      const objectPath = "/objects/" + uploadUrl.split("/objects/").pop()?.split("?")[0];
      registerMutation.mutate({
        objectPath,
        fileName: file.name,
        fileSize: file.size,
      });
    }
  };

  const displayVideo = videoDetail || selectedVideo;
  const variants = displayVideo?.variants || [];


  const handleDownload = async (url: string, filename: string) => {
    try {
      toast({ title: "Preparing download...", description: "Your file will download shortly." });
      const gcsMatch = url.match(/https:\/\/storage\.googleapis\.com\/[^\s]+/);
      const fetchUrl = gcsMatch ? gcsMatch[0] : url;
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        toast({ title: "Download failed", description: "Could not fetch the file. Try again.", variant: "destructive" });
        window.open(fetchUrl, "_blank");
        return;
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        document.body.removeChild(link);
      }, 1000);
    } catch {
      const gcsMatch = url.match(/https:\/\/storage\.googleapis\.com\/[^\s]+/);
      window.open(gcsMatch ? gcsMatch[0] : url, "_blank");
    }
  };

  return (
    <div className="space-y-6" data-testid="video-optimizer-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Film className="h-6 w-6 text-indigo-500" />
            Video Optimizer
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload screen recordings and create optimized versions for every social platform
          </p>
        </div>
        <ObjectUploader
          maxNumberOfFiles={1}
          maxFileSize={524288000}
          onGetUploadParameters={getUploadParameters}
          onComplete={handleUploadComplete}
          buttonClassName="bg-indigo-600 hover:bg-indigo-700"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Video
        </ObjectUploader>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileVideo className="h-4 w-4" />
                Video Library ({videos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  <Video className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No videos yet</p>
                  <p className="text-xs mt-1">Upload a screen recording to get started</p>
                </div>
              ) : (
                <div className="divide-y">
                  {videos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => {
                        setSelectedVideo(video as VideoWithVariants);
                        setPostDescription(video.description || "");
                        setPostHashtags(video.hashtags || "");
                        setIsRenaming(false);
                      }}
                      className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
                        selectedVideo?.id === video.id ? "bg-muted/80" : ""
                      }`}
                      data-testid={`video-item-${video.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-12 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {video.thumbnailUrl ? (
                            <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Film className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" data-testid={`text-video-title-${video.id}`}>{video.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {video.originalFilename}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={video.status === "ready" ? "default" : video.status === "processing" ? "secondary" : "destructive"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {video.status === "processing" && <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />}
                              {video.status}
                            </Badge>
                            {video.width && video.height && (
                              <span className="text-[10px] text-muted-foreground">{video.width}x{video.height}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Scheduled Posts ({posts.length})
                </CardTitle>
                {selectedVideo && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowScheduler(true)}
                    className="h-7 text-xs"
                    data-testid="button-schedule-post"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Schedule
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {posts.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No scheduled posts</p>
                </div>
              ) : (
                <div className="divide-y">
                  {posts.map((post) => {
                    const pInfo = PLATFORM_INFO[post.platform];
                    return (
                      <div key={post.id} className="p-3 text-sm" data-testid={`post-item-${post.id}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {pInfo && <pInfo.icon className="h-3.5 w-3.5" />}
                            <span className="font-medium text-xs">{pInfo?.label || post.platform}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {post.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => deletePostMutation.mutate(post.id)}
                              data-testid={`button-delete-post-${post.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {post.caption && (
                          <p className="text-xs text-muted-foreground truncate">{post.caption}</p>
                        )}
                        {post.scheduledAt && (
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(post.scheduledAt).toLocaleDateString()} {new Date(post.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {!selectedVideo ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                <LayoutGrid className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Select a video</p>
                <p className="text-sm mt-1">Choose a video from the library or upload a new one</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      {isRenaming ? (
                        <div className="flex items-center gap-2 mb-1">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-8 text-base font-semibold w-full max-w-64"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && renameValue.trim()) {
                                renameMutation.mutate({ id: selectedVideo!.id, title: renameValue.trim() });
                              }
                              if (e.key === "Escape") setIsRenaming(false);
                            }}
                            data-testid="input-rename-video"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              if (renameValue.trim()) {
                                renameMutation.mutate({ id: selectedVideo!.id, title: renameValue.trim() });
                              }
                            }}
                            disabled={renameMutation.isPending}
                            data-testid="button-confirm-rename"
                          >
                            {renameMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-500" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setIsRenaming(false)}
                            data-testid="button-cancel-rename"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-lg font-semibold">{displayVideo?.title}</h2>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setRenameValue(displayVideo?.title || "");
                              setIsRenaming(true);
                            }}
                            data-testid="button-rename-video"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">{displayVideo?.originalFilename}</p>
                      {displayVideo?.width && displayVideo?.height && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Original: {displayVideo.width} x {displayVideo.height}
                          {displayVideo.fileSize && ` - ${(displayVideo.fileSize / 1024 / 1024).toFixed(1)} MB`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/social-videos", selectedVideo.id] });
                          refetchDetail();
                        }}
                        variant="outline"
                        data-testid="button-refresh-variants"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(selectedVideo.originalUrl, `${selectedVideo.title || selectedVideo.originalFilename || "video"}.mp4`)}
                        data-testid="button-download-original"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Original
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => optimizeMutation.mutate(selectedVideo.id)}
                        disabled={optimizeMutation.isPending || displayVideo?.status === "processing"}
                        className="bg-indigo-600 hover:bg-indigo-700"
                        data-testid="button-optimize"
                      >
                        {optimizeMutation.isPending || displayVideo?.status === "processing" ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4 mr-2" />
                        )}
                        Optimize for All Platforms
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(selectedVideo.id)}
                        data-testid="button-delete-video"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {displayVideo?.thumbnailUrl && (
                    <div className="rounded-lg overflow-hidden bg-black mb-4 max-h-[300px] flex items-center justify-center">
                      <img src={displayVideo.thumbnailUrl} alt="Preview" className="max-h-[300px] object-contain" />
                    </div>
                  )}

                  {displayVideo?.status === "processing" && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                      <div>
                        <p className="text-sm font-medium text-indigo-400">Optimizing video...</p>
                        <p className="text-xs text-muted-foreground">Creating versions for all platforms. This may take a minute or two.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Post Details
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={copyAll}
                        disabled={!displayVideo?.title && !postDescription && !postHashtags}
                        data-testid="button-copy-all"
                      >
                        {copiedField === "all" ? <ClipboardCheck className="h-3 w-3 mr-1 text-green-500" /> : <Copy className="h-3 w-3 mr-1" />}
                        {copiedField === "all" ? "Copied" : "Copy All"}
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          if (selectedVideo) {
                            saveDetailsMutation.mutate({
                              id: selectedVideo.id,
                              description: postDescription,
                              hashtags: postHashtags,
                            });
                          }
                        }}
                        disabled={saveDetailsMutation.isPending}
                        data-testid="button-save-details"
                      >
                        {saveDetailsMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                        Save
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                        <Type className="h-3 w-3" />
                        Title
                      </label>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => copyToClipboard(displayVideo?.title || "", "title")}
                        disabled={!displayVideo?.title}
                        data-testid="button-copy-title"
                      >
                        {copiedField === "title" ? <ClipboardCheck className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <div className="bg-muted/50 rounded-md px-3 py-2 text-sm">{displayVideo?.title}</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Description / Caption
                      </label>
                    </div>
                    <Textarea
                      value={postDescription}
                      onChange={(e) => setPostDescription(e.target.value)}
                      placeholder="Write your post description or click the button below to auto-generate one with AI..."
                      rows={3}
                      data-testid="input-post-description"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5"
                        onClick={() => selectedVideo && generateDescriptionMutation.mutate(selectedVideo.id)}
                        disabled={generateDescriptionMutation.isPending}
                        data-testid="button-generate-description"
                      >
                        {generateDescriptionMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-indigo-500" />}
                        AI Generate Description
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5"
                        onClick={() => copyToClipboard(postDescription, "description")}
                        disabled={!postDescription}
                        data-testid="button-copy-description"
                      >
                        {copiedField === "description" ? <ClipboardCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedField === "description" ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        Hashtags
                      </label>
                    </div>
                    <Input
                      value={postHashtags}
                      onChange={(e) => setPostHashtags(e.target.value)}
                      placeholder="#webdesign #smallbusiness #entrepreneur #ai #website"
                      data-testid="input-post-hashtags"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5"
                        onClick={() => selectedVideo && generateHashtagsMutation.mutate(selectedVideo.id)}
                        disabled={generateHashtagsMutation.isPending}
                        data-testid="button-generate-hashtags"
                      >
                        {generateHashtagsMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-indigo-500" />}
                        AI Generate Hashtags
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5"
                        onClick={() => copyToClipboard(postHashtags, "hashtags")}
                        disabled={!postHashtags}
                        data-testid="button-copy-hashtags"
                      >
                        {copiedField === "hashtags" ? <ClipboardCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedField === "hashtags" ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {variants.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Platform Variants ({variants.filter(v => v.status === "ready").length} ready)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {variants.map((variant) => {
                      const pInfo = PLATFORM_INFO[variant.platform];
                      if (!pInfo) return null;
                      const PlatformIcon = pInfo.icon;
                      return (
                        <Card key={variant.id} data-testid={`variant-card-${variant.platform}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg ${pInfo.color} flex items-center justify-center text-white`}>
                                  <PlatformIcon className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{pInfo.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {variant.width} x {variant.height}
                                    {variant.fileSize && ` - ${(variant.fileSize / 1024 / 1024).toFixed(1)} MB`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {variant.status === "ready" ? (
                                  <>
                                    <button
                                      onClick={() => handleDownload(variant.url!, `${displayVideo?.title || "video"}_${pInfo.label.replace(/\s+/g, "_")}.mp4`)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border text-foreground transition-colors"
                                      data-testid={`button-download-${variant.platform}`}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      Download
                                    </button>
                                    {pInfo.uploadUrl && (
                                      <a
                                        href={pInfo.uploadUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground transition-colors"
                                        data-testid={`button-post-${variant.platform}`}
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Post Now
                                      </a>
                                    )}
                                  </>
                                ) : variant.status === "processing" ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Processing
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">Error</Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {variants.length === 0 && displayVideo?.status !== "processing" && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Wand2 className="h-12 w-12 mb-3 opacity-30" />
                    <p className="font-medium">No optimized versions yet</p>
                    <p className="text-sm mt-1">Click "Optimize for All Platforms" to create versions for TikTok, Instagram, Facebook, Pinterest, YouTube, and more</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showScheduler} onOpenChange={setShowScheduler}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-indigo-500" />
              Create Post
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Platform</label>
              <Select value={scheduleForm.platform} onValueChange={(v) => setScheduleForm(f => ({ ...f, platform: v }))}>
                <SelectTrigger data-testid="select-platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>{info.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Caption</label>
              <Textarea
                value={scheduleForm.caption}
                onChange={(e) => setScheduleForm(f => ({ ...f, caption: e.target.value }))}
                placeholder="Write your post caption..."
                rows={3}
                data-testid="input-caption"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Hashtags</label>
              <Input
                value={scheduleForm.hashtags}
                onChange={(e) => setScheduleForm(f => ({ ...f, hashtags: e.target.value }))}
                placeholder="#webdesign #business #ai"
                data-testid="input-hashtags"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Schedule Date & Time (leave blank to post now)</label>
              <Input
                type="datetime-local"
                value={scheduleForm.scheduledAt}
                onChange={(e) => setScheduleForm(f => ({ ...f, scheduledAt: e.target.value }))}
                data-testid="input-scheduled-at"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowScheduler(false)} data-testid="button-cancel-post">
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!scheduleForm.platform) {
                  toast({ title: "Select a platform", variant: "destructive" });
                  return;
                }
                createPostMutation.mutate({
                  videoId: selectedVideo?.id,
                  platform: scheduleForm.platform,
                  caption: scheduleForm.caption,
                  hashtags: scheduleForm.hashtags,
                  status: "draft",
                });
              }}
              disabled={createPostMutation.isPending}
              data-testid="button-save-draft"
            >
              Save as Draft
            </Button>
            {scheduleForm.scheduledAt ? (
              <Button
                onClick={() => {
                  if (!scheduleForm.platform) {
                    toast({ title: "Select a platform", variant: "destructive" });
                    return;
                  }
                  createPostMutation.mutate({
                    videoId: selectedVideo?.id,
                    platform: scheduleForm.platform,
                    caption: scheduleForm.caption,
                    hashtags: scheduleForm.hashtags,
                    scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
                    status: "scheduled",
                  });
                }}
                disabled={createPostMutation.isPending}
                data-testid="button-schedule-later"
              >
                {createPostMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
                Schedule
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (!scheduleForm.platform) {
                    toast({ title: "Select a platform", variant: "destructive" });
                    return;
                  }
                  createPostMutation.mutate({
                    videoId: selectedVideo?.id,
                    platform: scheduleForm.platform,
                    caption: scheduleForm.caption,
                    hashtags: scheduleForm.hashtags,
                    status: "posted",
                    postedAt: new Date().toISOString(),
                  });
                }}
                disabled={createPostMutation.isPending}
                data-testid="button-post-now"
              >
                {createPostMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Post Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
