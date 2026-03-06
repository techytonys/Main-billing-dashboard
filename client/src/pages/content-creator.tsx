import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Copy,
  Check,
  Hash,
  Lightbulb,
  Clock,
  TrendingUp,
  Loader2,
  Share2,
  Video,
  Image,
  FileText,
  MessageSquare,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Layers,
  Film,
  Music,
  Eye,
  Target,
} from "lucide-react";
import {
  SiFacebook,
  SiInstagram,
  SiTiktok,
  SiYoutube,
  SiLinkedin,
  SiPinterest,
  SiX,
  SiThreads,
} from "react-icons/si";

const PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: SiInstagram, color: "from-pink-500 to-purple-600", contentTypes: ["post", "reel", "story", "carousel"] },
  { id: "facebook", name: "Facebook", icon: SiFacebook, color: "from-blue-600 to-blue-700", contentTypes: ["post", "reel", "story", "video"] },
  { id: "tiktok", name: "TikTok", icon: SiTiktok, color: "from-gray-900 to-gray-800 dark:from-gray-200 dark:to-gray-300", contentTypes: ["video", "post"] },
  { id: "youtube", name: "YouTube", icon: SiYoutube, color: "from-red-500 to-red-700", contentTypes: ["video", "short", "post"] },
  { id: "twitter", name: "X (Twitter)", icon: SiX, color: "from-gray-800 to-gray-900 dark:from-gray-200 dark:to-gray-300", contentTypes: ["post", "thread"] },
  { id: "linkedin", name: "LinkedIn", icon: SiLinkedin, color: "from-blue-500 to-blue-700", contentTypes: ["post", "article", "carousel"] },
  { id: "pinterest", name: "Pinterest", icon: SiPinterest, color: "from-red-500 to-red-600", contentTypes: ["pin", "idea_pin"] },
  { id: "threads", name: "Threads", icon: SiThreads, color: "from-gray-800 to-black dark:from-gray-200 dark:to-white", contentTypes: ["post", "thread"] },
];

const CONTENT_TYPE_LABELS: Record<string, { label: string; icon: any }> = {
  post: { label: "Post", icon: FileText },
  reel: { label: "Reel", icon: Film },
  story: { label: "Story", icon: Image },
  carousel: { label: "Carousel", icon: Layers },
  video: { label: "Video", icon: Video },
  short: { label: "Short", icon: Film },
  thread: { label: "Thread", icon: MessageSquare },
  article: { label: "Article", icon: FileText },
  pin: { label: "Pin", icon: Image },
  idea_pin: { label: "Idea Pin", icon: Layers },
};

const TONES = [
  "Professional", "Casual & Fun", "Inspirational", "Educational",
  "Bold & Confident", "Friendly", "Urgent", "Storytelling", "Humorous",
];

const TOPIC_IDEAS = [
  "Why every business needs a website in 2025",
  "5 signs your website is losing you customers",
  "Before/after website redesign showcase",
  "How AI is changing web design",
  "Common website mistakes small businesses make",
  "Why your competitor's website is beating yours",
  "The ROI of a professional website",
  "Website speed matters — here's why",
  "Mobile-first design explained simply",
  "Client success story / testimonial",
  "Behind the scenes of building a website",
  "SEO tips for small businesses",
  "How to get more leads from your website",
  "The difference between cheap and professional websites",
  "Web design trends for this year",
];

const CHAR_LIMITS: Record<string, number> = {
  twitter: 280, instagram: 2200, facebook: 63206, linkedin: 3000,
  tiktok: 2200, youtube: 5000, pinterest: 500, threads: 500,
};

export default function ContentCreator() {
  usePageTitle("Content Creator");
  const { toast } = useToast();
  const [platform, setPlatform] = useState("instagram");
  const [contentType, setContentType] = useState("post");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Professional");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [showSlides, setShowSlides] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [tipsData, setTipsData] = useState<string[]>([]);

  const selectedPlatform = PLATFORMS.find(p => p.id === platform)!;
  const charLimit = CHAR_LIMITS[platform] || 2000;

  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/content/generate", data);
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedContent(data);
      toast({ title: "Content generated!" });
    },
    onError: () => {
      toast({ title: "Failed to generate content", variant: "destructive" });
    },
  });

  const tipsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/content/tips", data);
      return res.json();
    },
    onSuccess: (data) => {
      setTipsData(data.tips || []);
    },
  });

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast({ title: "Enter a topic", description: "What do you want to post about?", variant: "destructive" });
      return;
    }
    generateMutation.mutate({ platform, contentType, topic: topic.trim(), tone, includeHashtags, includeEmojis });
  };

  const handleGetTips = () => {
    tipsMutation.mutate({ platform, contentType });
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: "Copied!" });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAll = () => {
    if (!generatedContent) return;
    let full = generatedContent.content || "";
    if (generatedContent.hashtags?.length > 0) {
      full += "\n\n" + generatedContent.hashtags.map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ");
    }
    copyToClipboard(full, "all");
  };

  const shareContent = async () => {
    if (!generatedContent?.content) return;
    if (navigator.share) {
      try {
        await navigator.share({ text: generatedContent.content });
      } catch {}
    } else {
      copyAll();
    }
  };

  const handlePlatformChange = (val: string) => {
    setPlatform(val);
    const plat = PLATFORMS.find(p => p.id === val);
    if (plat && !plat.contentTypes.includes(contentType)) {
      setContentType(plat.contentTypes[0]);
    }
    setGeneratedContent(null);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="p-1.5 rounded-md hover:bg-muted transition-colors"
      data-testid={`button-copy-${field}`}
    >
      {copiedField === field ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-violet-500/20">
          <Sparkles className="w-5 h-5 text-pink-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Content Creator</h1>
          <p className="text-sm text-muted-foreground">AI-powered social media content for every platform</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-5">
          <Card>
            <CardContent className="p-5 space-y-5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Platform</label>
                <div className="grid grid-cols-4 gap-2">
                  {PLATFORMS.map(p => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handlePlatformChange(p.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${platform === p.id ? "border-violet-500 bg-violet-500/5 shadow-sm" : "border-transparent hover:border-muted-foreground/20 hover:bg-muted/50"}`}
                        data-testid={`button-platform-${p.id}`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{p.name.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Content Type</label>
                <div className="flex flex-wrap gap-2">
                  {selectedPlatform.contentTypes.map(ct => {
                    const info = CONTENT_TYPE_LABELS[ct];
                    const Icon = info?.icon || FileText;
                    return (
                      <button
                        key={ct}
                        onClick={() => { setContentType(ct); setGeneratedContent(null); }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${contentType === ct ? "bg-violet-500 text-white shadow-sm" : "bg-muted hover:bg-muted/80"}`}
                        data-testid={`button-content-type-${ct}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {info?.label || ct}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Topic / Idea</label>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What do you want to post about?"
                  rows={3}
                  className="resize-none"
                  data-testid="input-topic"
                />
                <div className="mt-2">
                  <button
                    onClick={() => setShowTips(!showTips)}
                    className="text-[11px] text-violet-500 hover:text-violet-600 font-medium flex items-center gap-1"
                    data-testid="button-toggle-ideas"
                  >
                    <Lightbulb className="w-3 h-3" />
                    {showTips ? "Hide" : "Show"} topic ideas
                  </button>
                  {showTips && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {TOPIC_IDEAS.map((idea, i) => (
                        <button
                          key={i}
                          onClick={() => setTopic(idea)}
                          className="text-[11px] px-2.5 py-1.5 rounded-full bg-muted hover:bg-violet-500/10 hover:text-violet-600 transition-colors"
                          data-testid={`button-topic-idea-${i}`}
                        >
                          {idea}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Tone</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger data-testid="select-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  Include Hashtags
                </label>
                <Switch checked={includeHashtags} onCheckedChange={setIncludeHashtags} data-testid="switch-hashtags" />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Include Emojis</label>
                <Switch checked={includeEmojis} onCheckedChange={setIncludeEmojis} data-testid="switch-emojis" />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !topic.trim()}
                className="w-full h-12 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white text-base shadow-lg shadow-violet-500/25"
                data-testid="button-generate"
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Generating...</>
                ) : (
                  <><Sparkles className="w-5 h-5 mr-2" /> Generate Content</>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Pro Tips
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGetTips}
                  disabled={tipsMutation.isPending}
                  className="h-7 text-xs"
                  data-testid="button-get-tips"
                >
                  {tipsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                  Get Tips
                </Button>
              </div>
              {tipsData.length > 0 ? (
                <ul className="space-y-2">
                  {tipsData.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Click "Get Tips" for AI-powered advice on creating great {CONTENT_TYPE_LABELS[contentType]?.label || contentType} content for {selectedPlatform.name}.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-5">
          {generateMutation.isPending && (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="relative mx-auto w-16 h-16 mb-4">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 to-violet-600 animate-spin" style={{ animationDuration: "3s" }}></div>
                  <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-violet-500" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">Creating your content...</h3>
                <p className="text-sm text-muted-foreground">AI is generating a {CONTENT_TYPE_LABELS[contentType]?.label || contentType} for {selectedPlatform.name}</p>
              </CardContent>
            </Card>
          )}

          {!generatedContent && !generateMutation.isPending && (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-pink-500/10 to-violet-500/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Ready to create?</h3>
                <p className="text-sm text-muted-foreground mb-4">Choose a platform, content type, and topic — then hit Generate.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {PLATFORMS.map(p => {
                    const Icon = p.icon;
                    return <Icon key={p.id} className="w-5 h-5 text-muted-foreground/40" />;
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {generatedContent && !generateMutation.isPending && (
            <>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {(() => { const Icon = selectedPlatform.icon; return <Icon className="w-5 h-5" />; })()}
                      <h3 className="font-semibold">{selectedPlatform.name} {CONTENT_TYPE_LABELS[contentType]?.label}</h3>
                      {generatedContent.estimatedReach && (
                        <Badge className={`text-[10px] ${generatedContent.estimatedReach === "high" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : generatedContent.estimatedReach === "medium" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-slate-500/10 text-slate-500 border-slate-500/20"}`}>
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {generatedContent.estimatedReach} reach
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={copyAll} className="h-8 text-xs gap-1.5" data-testid="button-copy-all">
                        {copiedField === "all" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy All
                      </Button>
                      <Button variant="outline" size="sm" onClick={shareContent} className="h-8 text-xs gap-1.5" data-testid="button-share">
                        <Share2 className="w-3.5 h-3.5" />
                        Share
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerate}
                        className="h-8 text-xs gap-1.5"
                        data-testid="button-regenerate"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Redo
                      </Button>
                    </div>
                  </div>

                  {generatedContent.hook && (
                    <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-pink-500/5 to-violet-500/5 border border-pink-500/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-pink-600 dark:text-pink-400 font-semibold flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Hook
                        </span>
                        <CopyButton text={generatedContent.hook} field="hook" />
                      </div>
                      <p className="text-sm font-medium">{generatedContent.hook}</p>
                    </div>
                  )}

                  <div className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Content</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] ${(generatedContent.content?.length || 0) > charLimit ? "text-red-500" : "text-muted-foreground"}`}>
                          {generatedContent.content?.length || 0} / {charLimit}
                        </span>
                        <CopyButton text={generatedContent.content} field="content" />
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed" data-testid="text-generated-content">
                        {generatedContent.content}
                      </p>
                    </div>
                  </div>

                  {generatedContent.cta && (
                    <div className="mt-4 p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1">
                          <Target className="w-3 h-3" /> Call to Action
                        </span>
                        <CopyButton text={generatedContent.cta} field="cta" />
                      </div>
                      <p className="text-sm font-medium">{generatedContent.cta}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {generatedContent.script?.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <button
                      onClick={() => setShowScript(!showScript)}
                      className="flex items-center justify-between w-full"
                      data-testid="button-toggle-script"
                    >
                      <h3 className="font-semibold flex items-center gap-2">
                        <Film className="w-4 h-4 text-blue-500" />
                        Video Script ({generatedContent.script.length} scenes)
                      </h3>
                      {showScript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showScript && (
                      <div className="mt-4 space-y-3">
                        {generatedContent.musicMood && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/5 border border-purple-500/10 text-xs">
                            <Music className="w-4 h-4 text-purple-500" />
                            <span className="font-medium text-purple-600 dark:text-purple-400">Music Mood:</span>
                            <span>{generatedContent.musicMood}</span>
                          </div>
                        )}
                        {generatedContent.script.map((scene: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-[10px]">Scene {scene.scene || i + 1}</Badge>
                              <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">{scene.duration}</Badge>
                            </div>
                            {scene.visual && (
                              <div className="flex items-start gap-2 mb-1.5">
                                <Eye className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                                <span className="text-xs text-muted-foreground">{scene.visual}</span>
                              </div>
                            )}
                            {scene.text && (
                              <div className="flex items-start gap-2 mb-1.5">
                                <FileText className="w-3 h-3 text-violet-500 mt-0.5 shrink-0" />
                                <span className="text-xs font-medium">{scene.text}</span>
                              </div>
                            )}
                            {scene.narration && (
                              <div className="flex items-start gap-2">
                                <MessageSquare className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                <span className="text-xs italic text-muted-foreground">"{scene.narration}"</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {generatedContent.slides?.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <button
                      onClick={() => setShowSlides(!showSlides)}
                      className="flex items-center justify-between w-full"
                      data-testid="button-toggle-slides"
                    >
                      <h3 className="font-semibold flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-500" />
                        Carousel Slides ({generatedContent.slides.length})
                      </h3>
                      {showSlides ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showSlides && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {generatedContent.slides.map((slide: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                Slide {slide.number || i + 1}
                              </Badge>
                            </div>
                            <h4 className="text-sm font-semibold mb-1">{slide.headline}</h4>
                            <p className="text-xs text-muted-foreground mb-2">{slide.body}</p>
                            {slide.visualDescription && (
                              <div className="flex items-start gap-1.5 text-[11px] text-violet-500">
                                <Image className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>{slide.visualDescription}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {generatedContent.hashtags?.length > 0 && (
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Hash className="w-4 h-4 text-blue-500" />
                          Hashtags
                        </h3>
                        <CopyButton
                          text={generatedContent.hashtags.map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ")}
                          field="hashtags"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedContent.hashtags.map((tag: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => copyToClipboard(tag.startsWith("#") ? tag : `#${tag}`, `tag-${i}`)}
                            className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors"
                            data-testid={`button-hashtag-${i}`}
                          >
                            {tag.startsWith("#") ? tag : `#${tag}`}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {generatedContent.keywords?.length > 0 && (
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Target className="w-4 h-4 text-violet-500" />
                          Recommended Keywords
                        </h3>
                        <CopyButton
                          text={generatedContent.keywords.join(", ")}
                          field="keywords"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedContent.keywords.map((kw: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-violet-500/10" onClick={() => copyToClipboard(kw, `kw-${i}`)}>
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {generatedContent.bestTimeToPost && (
                  <Card>
                    <CardContent className="p-5">
                      <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        Best Time to Post
                      </h3>
                      <p className="text-sm text-muted-foreground">{generatedContent.bestTimeToPost}</p>
                    </CardContent>
                  </Card>
                )}

                {generatedContent.tips?.length > 0 && (
                  <Card>
                    <CardContent className="p-5">
                      <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-emerald-500" />
                        Content Tips
                      </h3>
                      <ul className="space-y-1.5">
                        {generatedContent.tips.map((tip: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
