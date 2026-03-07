import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Server,
  Shield,
  Zap,
  Code,
  Palette,
  Search,
  Database,
  Cloud,
  Lock,
  Rocket,
  Lightbulb,
  Layers,
  Cpu,
  Wifi,
  Terminal,
  Smartphone,
  ImageIcon,
  Gauge,
  KeyRound,
  Sparkles,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  Share2,
  Copy,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Link2,
} from "lucide-react";
import {
  SiInstagram,
  SiFacebook,
  SiTiktok,
  SiYoutube,
  SiLinkedin,
  SiX,
  SiPinterest,
  SiSnapchat,
  SiSpotify,
  SiTwitch,
  SiReddit,
  SiGooglechrome,
  SiWordpress,
  SiShopify,
  SiGithub,
  SiFigma,
  SiCloudflare,
  SiLetsencrypt,
  SiGoogleanalytics,
  SiGooglecloud,
  SiNetlify,
  SiOpenai,
  SiCanva,
  SiMailchimp,
  SiGodaddy,
} from "react-icons/si";
import type { DailyTip } from "@shared/schema";

const floatingIcons = [
  { Icon: SiInstagram, color: "#E4405F", x: "5%", y: "12%", size: 28, delay: 0 },
  { Icon: SiFacebook, color: "#1877F2", x: "88%", y: "8%", size: 26, delay: 1.5 },
  { Icon: SiTiktok, color: "#00F2EA", x: "12%", y: "35%", size: 26, delay: 0.8 },
  { Icon: SiYoutube, color: "#FF0000", x: "92%", y: "30%", size: 30, delay: 2.2 },
  { Icon: SiLinkedin, color: "#0A66C2", x: "3%", y: "58%", size: 24, delay: 1.2 },
  { Icon: SiX, color: "#ffffff", x: "95%", y: "52%", size: 22, delay: 0.5 },
  { Icon: SiPinterest, color: "#BD081C", x: "8%", y: "78%", size: 26, delay: 2.8 },
  { Icon: SiSnapchat, color: "#FFFC00", x: "90%", y: "72%", size: 24, delay: 1.8 },
  { Icon: SiSpotify, color: "#1DB954", x: "15%", y: "92%", size: 22, delay: 3.2 },
  { Icon: SiTwitch, color: "#9146FF", x: "85%", y: "90%", size: 24, delay: 0.3 },
  { Icon: SiReddit, color: "#FF4500", x: "20%", y: "18%", size: 22, delay: 2.5 },
  { Icon: SiWordpress, color: "#21759B", x: "80%", y: "18%", size: 22, delay: 3.5 },
  { Icon: SiShopify, color: "#7AB55C", x: "6%", y: "48%", size: 22, delay: 1.0 },
  { Icon: SiGooglechrome, color: "#4285F4", x: "93%", y: "42%", size: 22, delay: 2.0 },
  { Icon: SiGithub, color: "#ffffff", x: "18%", y: "65%", size: 22, delay: 3.8 },
  { Icon: SiFigma, color: "#F24E1E", x: "82%", y: "62%", size: 22, delay: 0.7 },
];

const iconMap: Record<string, any> = {
  globe: Globe, server: Server, shield: Shield, zap: Zap, code: Code,
  palette: Palette, search: Search, database: Database, cloud: Cloud,
  lock: Lock, rocket: Rocket, lightbulb: Lightbulb, layers: Layers,
  cpu: Cpu, wifi: Wifi, terminal: Terminal, smartphone: Smartphone,
  image: ImageIcon, gauge: Gauge, key: KeyRound,
};

const categoryBrandIcon: Record<string, { Icon: any; color: string }> = {
  "Domain Names": { Icon: SiGodaddy, color: "#1BDBDB" },
  "Web Hosting": { Icon: SiCloudflare, color: "#F38020" },
  "WordPress": { Icon: SiWordpress, color: "#21759B" },
  "Website Speed": { Icon: SiGooglechrome, color: "#4285F4" },
  "SEO Basics": { Icon: SiGoogleanalytics, color: "#E37400" },
  "Google My Business": { Icon: SiGoogleanalytics, color: "#4285F4" },
  "Social Media Marketing": { Icon: SiInstagram, color: "#E4405F" },
  "Instagram Marketing": { Icon: SiInstagram, color: "#E4405F" },
  "Facebook Marketing": { Icon: SiFacebook, color: "#1877F2" },
  "TikTok Marketing": { Icon: SiTiktok, color: "#ffffff" },
  "YouTube Marketing": { Icon: SiYoutube, color: "#FF0000" },
  "LinkedIn Marketing": { Icon: SiLinkedin, color: "#0A66C2" },
  "Pinterest Marketing": { Icon: SiPinterest, color: "#E60023" },
  "Digital Marketing": { Icon: Rocket, color: "#8B5CF6" },
  "Email Marketing": { Icon: SiMailchimp, color: "#FFE01B" },
  "Content Marketing": { Icon: BookOpen, color: "#10B981" },
  "DNS Management": { Icon: SiCloudflare, color: "#F38020" },
  "SSL Certificates": { Icon: SiLetsencrypt, color: "#003A70" },
  "Website Security": { Icon: Shield, color: "#EF4444" },
  "AI Tools for Business": { Icon: SiOpenai, color: "#10A37F" },
  "AI Website Builders": { Icon: SiOpenai, color: "#8B5CF6" },
  "Chatbots & AI": { Icon: SiOpenai, color: "#10A37F" },
  "E-commerce Tips": { Icon: SiShopify, color: "#7AB55C" },
  "Online Reviews": { Icon: Sparkles, color: "#F59E0B" },
  "Local SEO": { Icon: SiGoogleanalytics, color: "#34A853" },
  "Google Ads": { Icon: SiGooglechrome, color: "#4285F4" },
  "Facebook Ads": { Icon: SiFacebook, color: "#1877F2" },
  "Branding & Logo": { Icon: SiFigma, color: "#F24E1E" },
  "Web Design Tips": { Icon: SiFigma, color: "#A259FF" },
  "Mobile-Friendly Websites": { Icon: Smartphone, color: "#06B6D4" },
  "Landing Pages": { Icon: Layers, color: "#8B5CF6" },
  "Analytics & Tracking": { Icon: SiGoogleanalytics, color: "#E37400" },
  "Conversion Optimization": { Icon: TrendingUp, color: "#10B981" },
  "Lead Generation": { Icon: Zap, color: "#F59E0B" },
  "Online Reputation": { Icon: Shield, color: "#3B82F6" },
  "Business Email": { Icon: SiMailchimp, color: "#FFE01B" },
  "Website Backups": { Icon: Database, color: "#6B7280" },
  "Cloud Hosting": { Icon: SiGooglecloud, color: "#4285F4" },
  "Managed Hosting": { Icon: Server, color: "#10B981" },
  "Website Migration": { Icon: SiNetlify, color: "#00C7B7" },
  "Page Speed": { Icon: Gauge, color: "#F97316" },
  "Image Optimization": { Icon: SiCanva, color: "#00C4CC" },
  "Video Marketing": { Icon: SiYoutube, color: "#FF0000" },
  "Blog Strategy": { Icon: BookOpen, color: "#6366F1" },
  "Hashtag Strategy": { Icon: SiInstagram, color: "#C13584" },
  "Influencer Marketing": { Icon: SiTiktok, color: "#EE1D52" },
  "Customer Engagement": { Icon: Sparkles, color: "#EC4899" },
  "Online Directories": { Icon: Globe, color: "#06B6D4" },
  "Nameservers & DNS": { Icon: Globe, color: "#8B5CF6" },
  "Website Accessibility": { Icon: Globe, color: "#3B82F6" },
  "UX Design Tips": { Icon: SiFigma, color: "#A259FF" },
  "Color & Branding": { Icon: SiFigma, color: "#F24E1E" },
  "Typography Tips": { Icon: SiCanva, color: "#00C4CC" },
  "CMS Basics": { Icon: SiWordpress, color: "#21759B" },
  "Website Maintenance": { Icon: Server, color: "#6B7280" },
  "Cybersecurity Basics": { Icon: Shield, color: "#EF4444" },
  "Password Security": { Icon: KeyRound, color: "#EF4444" },
  "Two-Factor Authentication": { Icon: Lock, color: "#10B981" },
  "SMS Marketing": { Icon: Smartphone, color: "#22C55E" },
  "Push Notifications": { Icon: Zap, color: "#F59E0B" },
  "Retargeting Ads": { Icon: Search, color: "#8B5CF6" },
  "Content Creation Tools": { Icon: SiCanva, color: "#00C4CC" },
  "Canva & Design Tools": { Icon: SiCanva, color: "#00C4CC" },
  "Stock Photos & Media": { Icon: ImageIcon, color: "#EC4899" },
  "Domain Email Setup": { Icon: SiMailchimp, color: "#FFE01B" },
  "CDN & Performance": { Icon: SiCloudflare, color: "#F38020" },
  "Website Analytics": { Icon: SiGoogleanalytics, color: "#E37400" },
  "Social Proof": { Icon: Sparkles, color: "#F59E0B" },
  "Testimonials & Reviews": { Icon: Sparkles, color: "#10B981" },
  "Client Communication": { Icon: Smartphone, color: "#3B82F6" },
  "Project Management": { Icon: Layers, color: "#6366F1" },
  "Invoicing Tips": { Icon: Gauge, color: "#10B981" },
  "Online Payments": { Icon: SiShopify, color: "#7AB55C" },
};

const categoryColors: Record<string, string> = {
  "Domain Names": "from-purple-500 to-pink-500",
  "Web Hosting": "from-blue-500 to-cyan-500",
  "WordPress": "from-blue-600 to-indigo-500",
  "Website Speed": "from-orange-500 to-yellow-500",
  "SEO Basics": "from-green-500 to-teal-500",
  "Google My Business": "from-blue-500 to-green-500",
  "Social Media Marketing": "from-pink-500 to-fuchsia-500",
  "Instagram Marketing": "from-pink-500 to-purple-500",
  "Facebook Marketing": "from-blue-500 to-indigo-500",
  "TikTok Marketing": "from-gray-600 to-gray-800",
  "YouTube Marketing": "from-red-500 to-rose-500",
  "LinkedIn Marketing": "from-blue-600 to-sky-500",
  "Pinterest Marketing": "from-red-500 to-pink-500",
  "Digital Marketing": "from-violet-500 to-purple-500",
  "Email Marketing": "from-yellow-500 to-amber-500",
  "Content Marketing": "from-emerald-500 to-teal-500",
  "DNS Management": "from-violet-500 to-purple-500",
  "SSL Certificates": "from-green-500 to-emerald-500",
  "Website Security": "from-red-500 to-orange-500",
  "AI Tools for Business": "from-violet-500 to-fuchsia-500",
  "AI Website Builders": "from-purple-500 to-violet-500",
  "Chatbots & AI": "from-emerald-500 to-cyan-500",
  "E-commerce Tips": "from-green-500 to-lime-500",
  "Online Reviews": "from-amber-500 to-yellow-500",
  "Local SEO": "from-green-600 to-emerald-500",
  "Google Ads": "from-blue-500 to-sky-500",
  "Facebook Ads": "from-blue-600 to-indigo-600",
  "Branding & Logo": "from-pink-500 to-rose-500",
  "Web Design Tips": "from-fuchsia-500 to-pink-500",
  "Mobile-Friendly Websites": "from-teal-500 to-cyan-500",
  "Landing Pages": "from-indigo-500 to-violet-500",
  "Analytics & Tracking": "from-amber-500 to-orange-500",
  "Conversion Optimization": "from-emerald-500 to-green-500",
  "Lead Generation": "from-yellow-500 to-orange-500",
  "Online Reputation": "from-blue-500 to-indigo-500",
  "Business Email": "from-rose-500 to-pink-500",
  "Website Backups": "from-slate-500 to-gray-500",
  "Cloud Hosting": "from-sky-500 to-blue-500",
  "Managed Hosting": "from-emerald-500 to-green-600",
  "Website Migration": "from-amber-500 to-yellow-500",
  "Page Speed": "from-orange-500 to-red-500",
  "Image Optimization": "from-teal-500 to-cyan-500",
  "Video Marketing": "from-red-500 to-orange-500",
  "Blog Strategy": "from-indigo-500 to-blue-500",
  "Hashtag Strategy": "from-pink-500 to-fuchsia-500",
  "Influencer Marketing": "from-rose-500 to-pink-500",
  "Customer Engagement": "from-pink-500 to-rose-500",
  "Online Directories": "from-cyan-500 to-blue-500",
  "Nameservers & DNS": "from-purple-500 to-violet-500",
  "Website Accessibility": "from-blue-500 to-purple-500",
  "UX Design Tips": "from-violet-500 to-indigo-500",
  "Color & Branding": "from-pink-500 to-rose-500",
  "Typography Tips": "from-fuchsia-500 to-pink-500",
  "CMS Basics": "from-blue-600 to-indigo-500",
  "Website Maintenance": "from-gray-500 to-slate-600",
  "Cybersecurity Basics": "from-red-600 to-orange-600",
  "Password Security": "from-red-500 to-rose-500",
  "Two-Factor Authentication": "from-green-500 to-emerald-500",
  "SMS Marketing": "from-green-500 to-teal-500",
  "Push Notifications": "from-yellow-500 to-amber-500",
  "Retargeting Ads": "from-violet-500 to-purple-500",
  "Content Creation Tools": "from-teal-500 to-cyan-500",
  "Canva & Design Tools": "from-cyan-500 to-teal-500",
  "Stock Photos & Media": "from-pink-500 to-fuchsia-500",
  "Domain Email Setup": "from-yellow-400 to-amber-500",
  "CDN & Performance": "from-orange-500 to-yellow-500",
  "Website Analytics": "from-orange-500 to-amber-500",
  "Social Proof": "from-amber-500 to-yellow-500",
  "Testimonials & Reviews": "from-green-500 to-emerald-500",
  "Client Communication": "from-blue-500 to-sky-500",
  "Project Management": "from-indigo-500 to-violet-500",
  "Invoicing Tips": "from-emerald-500 to-green-500",
  "Online Payments": "from-green-500 to-lime-500",
};

function getGradient(category: string) {
  return categoryColors[category] || "from-blue-500 to-purple-500";
}

export default function TipOfTheDay() {
  const { toast } = useToast();
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [expandedTip, setExpandedTip] = useState<string | null>(null);
  const [subEmail, setSubEmail] = useState("");
  const [subPhone, setSubPhone] = useState("");
  const [subFirstName, setSubFirstName] = useState("");
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [subSuccess, setSubSuccess] = useState(false);

  const [, routeParams] = useRoute("/tips/:id");
  const tipId = routeParams?.id;

  const { data: specificTip } = useQuery<DailyTip>({
    queryKey: ["/api/tips/by-id", tipId],
    queryFn: () => fetch(`/api/tips/by-id/${tipId}`).then(r => r.json()),
    enabled: !!tipId,
  });

  const { data: latestTip, isLoading: tipLoading } = useQuery<DailyTip>({
    queryKey: ["/api/tips/latest"],
    enabled: !tipId,
  });

  const currentTip = tipId ? specificTip : latestTip;

  const { data: tipHistory } = useQuery<DailyTip[]>({
    queryKey: ["/api/tips/history"],
    enabled: showHistory,
  });

  const generateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/tips/generate"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tips/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tips/history"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleCopy = () => {
    if (!currentTip) return;
    navigator.clipboard.writeText(`Tip of the Day: ${currentTip.title}\n\n${currentTip.content}\n\n-- AI Powered Sites`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTipUrl = (tip: DailyTip) => `${window.location.origin}/tips/${tip.id}`;

  const handleShare = async () => {
    if (!currentTip) return;
    const tipUrl = getTipUrl(currentTip);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tip of the Day: ${currentTip.title}`,
          text: currentTip.content.substring(0, 200) + "...",
          url: tipUrl,
        });
      } catch (_e) {
      }
    } else {
      navigator.clipboard.writeText(tipUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (!currentTip) return;
    navigator.clipboard.writeText(getTipUrl(currentTip));
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({ title: "Link copied", description: "Share link copied to clipboard" });
  };

  const brandIcon = currentTip ? categoryBrandIcon[currentTip.category] : null;
  const TipIcon = brandIcon?.Icon || (currentTip?.icon ? iconMap[currentTip.icon] || Lightbulb : Lightbulb);
  const tipIconColor = brandIcon?.color || "#ffffff";
  const gradient = currentTip ? getGradient(currentTip.category) : "from-blue-500 to-purple-500";

  return (
    <div className="min-h-screen bg-[#06060b] text-white overflow-hidden">
      <style>{`
        @keyframes floatIcon {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-12px) rotate(3deg); }
          50% { transform: translateY(-6px) rotate(-2deg); }
          75% { transform: translateY(-18px) rotate(1deg); }
        }
        @keyframes orbDrift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(80px, -60px) scale(1.1); }
          66% { transform: translate(-40px, 40px) scale(0.95); }
        }
        @keyframes orbDrift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-60px, 80px) scale(0.9); }
          66% { transform: translate(50px, -30px) scale(1.05); }
        }
        @keyframes orbDrift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 50px) scale(1.08); }
        }
        @keyframes shimmer {
          0% { opacity: 0.03; }
          50% { opacity: 0.06; }
          100% { opacity: 0.03; }
        }
      `}</style>

      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "url('/images/tips-bg-pattern.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        opacity: 0.2,
      }} />

      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        animation: "shimmer 8s ease-in-out infinite",
      }} />

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[700px] h-[700px] rounded-full blur-[180px]"
          style={{
            top: "-10%", left: "15%",
            background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0.03) 40%, transparent 70%)",
            animation: "orbDrift1 25s ease-in-out infinite",
          }} />
        <div className="absolute w-[600px] h-[600px] rounded-full blur-[160px]"
          style={{
            top: "30%", right: "-5%",
            background: "radial-gradient(circle, rgba(168,85,247,0.09) 0%, rgba(168,85,247,0.02) 40%, transparent 70%)",
            animation: "orbDrift2 30s ease-in-out infinite",
          }} />
        <div className="absolute w-[500px] h-[500px] rounded-full blur-[140px]"
          style={{
            bottom: "5%", left: "5%",
            background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, rgba(6,182,212,0.02) 40%, transparent 70%)",
            animation: "orbDrift3 20s ease-in-out infinite",
          }} />
        <div className="absolute w-[400px] h-[400px] rounded-full blur-[120px]"
          style={{
            top: "60%", right: "25%",
            background: "radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 60%)",
            animation: "orbDrift1 35s ease-in-out infinite reverse",
          }} />
      </div>

      <div className="fixed inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 50%),
          radial-gradient(ellipse 60% 40% at 80% 100%, rgba(168,85,247,0.05) 0%, transparent 50%),
          radial-gradient(ellipse 50% 30% at 10% 60%, rgba(6,182,212,0.04) 0%, transparent 50%)
        `,
      }} />

      <div className="fixed inset-0 pointer-events-none hidden md:block">
        {floatingIcons.map((item, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: item.x,
              top: item.y,
              animation: `floatIcon ${6 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${item.delay}s`,
            }}
          >
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: item.size + 24,
                height: item.size + 24,
                backgroundColor: `${item.color}12`,
                border: `1px solid ${item.color}20`,
                boxShadow: `0 0 20px ${item.color}15`,
                opacity: 0.45,
              }}
            >
              <item.Icon
                size={item.size}
                style={{ color: item.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10">
        <header className="border-b border-white/[0.06]">
          <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 group" data-testid="link-home">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white/90 text-sm tracking-wide">AI Powered Sites</span>
            </a>
            <a
              href="/updates"
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
              data-testid="link-subscribe"
            >
              Get Updates <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 pt-16 pb-24">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-gray-400 tracking-wide uppercase font-medium">Grow Online</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-5 leading-[1.1] text-white" data-testid="text-page-title">
              Tip of the Day
            </h1>

            <p className="text-[15px] md:text-base text-gray-500 max-w-xl mx-auto leading-relaxed mb-4">
              Custom websites, apps, and portals — powered by AI, built for growth. No templates. No compromises.
            </p>
            <p className="text-lg md:text-xl text-gray-400 max-w-lg mx-auto leading-relaxed">
              Web hosting, social media, AI, digital marketing, and more — explained for beginners.
            </p>
          </div>

          {!tipId && (
            <div className="flex justify-center mb-14">
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                data-testid="button-generate-tip"
                className="flex items-center gap-3 px-8 py-4 rounded-lg border-2 border-white/20 bg-black/60 backdrop-blur-sm hover:border-white/40 hover:bg-black/80 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                )}
                <span className="text-[15px] font-semibold text-white tracking-wide">
                  {generateMutation.isPending ? "Generating..." : "Get Today's Tip"}
                </span>
              </button>
            </div>
          )}

          {tipLoading && (
            <div className="flex justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400/60" />
                <span className="text-sm text-gray-500">Loading tip...</span>
              </div>
            </div>
          )}

          {currentTip && !tipLoading && (
            <div className="mb-14" data-testid="card-current-tip">
              <div className="rounded-2xl border-2 border-black bg-white/[0.02] overflow-hidden backdrop-blur-sm shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <div className={`h-px bg-gradient-to-r ${gradient}`} />
                <div className="p-8 md:p-10">
                  <div className="flex items-start gap-6">
                    <div className="shrink-0 w-14 h-14 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shadow-lg shadow-black/20">
                      <TipIcon size={28} style={{ color: tipIconColor }} className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                        <Badge className={`bg-gradient-to-r ${gradient} text-white border-0 text-[11px] px-2.5 py-0.5 font-medium`}>
                          {currentTip.category}
                        </Badge>
                        <span className="text-[11px] text-gray-600 uppercase tracking-wider font-medium">
                          {currentTip.difficulty}
                        </span>
                        {currentTip.generatedAt && (
                          <span className="text-[11px] text-gray-600 flex items-center gap-1 ml-auto">
                            <Clock className="w-3 h-3" />
                            {new Date(currentTip.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 leading-snug" data-testid="text-tip-title">
                        {currentTip.title}
                      </h2>

                      <div className="text-[18px] md:text-[19px] text-white font-medium leading-[2] whitespace-pre-line" data-testid="text-tip-content">
                        {currentTip.content}
                      </div>

                      <div className="mt-8 pt-6 border-t border-white/[0.06]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={handleCopy}
                            data-testid="button-copy-tip"
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all text-xs text-gray-400 hover:text-white"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? "Copied" : "Copy"}
                          </button>
                          <button
                            onClick={handleShare}
                            data-testid="button-share-tip"
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all text-xs text-gray-400 hover:text-white"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Share
                          </button>
                          <button
                            onClick={handleCopyLink}
                            data-testid="button-copy-link"
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all text-xs text-gray-400 hover:text-white"
                          >
                            {linkCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Link2 className="w-3.5 h-3.5" />}
                            {linkCopied ? "Copied" : "Copy Link"}
                          </button>

                          <div className="w-px h-5 bg-white/[0.06] mx-1 hidden sm:block" />

                          <a
                            href={currentTip ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${currentTip.title} — Tip of the Day`)}&url=${encodeURIComponent(getTipUrl(currentTip))}` : "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="button-share-x"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all text-xs text-gray-400 hover:text-white"
                          >
                            <SiX className="w-3 h-3" />
                          </a>
                          <a
                            href={currentTip ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getTipUrl(currentTip))}` : "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="button-share-facebook"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-[#1877F2]/10 border border-white/[0.06] transition-all text-xs text-gray-400 hover:text-[#1877F2]"
                          >
                            <SiFacebook className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={currentTip ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getTipUrl(currentTip))}` : "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="button-share-linkedin"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-[#0A66C2]/10 border border-white/[0.06] transition-all text-xs text-gray-400 hover:text-[#0A66C2]"
                          >
                            <SiLinkedin className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        {currentTip && (
                          <div
                            onClick={handleCopyLink}
                            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05] cursor-pointer hover:bg-white/[0.04] transition-all group"
                            data-testid="share-url"
                          >
                            <Link2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <span className="text-[11px] text-gray-500 truncate font-mono">
                              {getTipUrl(currentTip)}
                            </span>
                            <Copy className="w-3 h-3 text-gray-600 group-hover:text-gray-400 shrink-0 ml-auto transition-colors" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tipId && currentTip && (
            <div className="mt-10 max-w-2xl mx-auto">
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-8 backdrop-blur-sm">
                {subSuccess ? (
                  <div className="text-center py-4" data-testid="subscribe-success">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-7 h-7 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">You're in!</h3>
                    <p className="text-gray-400 text-sm">You'll receive daily tips to help grow your business online.</p>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-6 h-6 text-indigo-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2" data-testid="text-subscribe-heading">Get Daily Tips Delivered</h3>
                      <p className="text-gray-400 text-sm max-w-md mx-auto">
                        Join thousands of business owners getting free daily tips on websites, marketing, SEO, AI, and more.
                      </p>
                    </div>
                    <form
                      data-testid="form-subscribe"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!subEmail || subSubmitting) return;
                        setSubSubmitting(true);
                        try {
                          const resp = await fetch("/api/tips/subscribe", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              email: subEmail,
                              phone: subPhone || undefined,
                              firstName: subFirstName || undefined,
                            }),
                          });
                          const data = await resp.json();
                          if (!resp.ok) throw new Error(data.error || "Failed to subscribe");
                          setSubSuccess(true);
                          toast({ title: "Subscribed!", description: "You'll get daily tips delivered." });
                        } catch (err: any) {
                          toast({ title: "Error", description: err.message, variant: "destructive" });
                        } finally {
                          setSubSubmitting(false);
                        }
                      }}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="First name (optional)"
                          value={subFirstName}
                          onChange={(e) => setSubFirstName(e.target.value)}
                          data-testid="input-subscribe-name"
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                        />
                        <input
                          type="email"
                          placeholder="Email address *"
                          required
                          value={subEmail}
                          onChange={(e) => setSubEmail(e.target.value)}
                          data-testid="input-subscribe-email"
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                        />
                      </div>
                      <input
                        type="tel"
                        placeholder="Phone number for SMS tips (optional)"
                        value={subPhone}
                        onChange={(e) => setSubPhone(e.target.value)}
                        data-testid="input-subscribe-phone"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={subSubmitting || !subEmail}
                        data-testid="button-subscribe"
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {subSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Rocket className="w-4 h-4" />
                        )}
                        {subSubmitting ? "Subscribing..." : "Subscribe for Free"}
                      </button>
                      <p className="text-[11px] text-gray-600 text-center">
                        No spam. Unsubscribe anytime. By subscribing you agree to our terms.
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}

          {!currentTip && !tipLoading && !tipId && (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                <Lightbulb className="w-9 h-9 text-yellow-500/30" />
              </div>
              <p className="text-gray-400 text-lg" data-testid="text-empty-state">Press the button above to generate your first tip.</p>
            </div>
          )}

          {!currentTip && !tipLoading && tipId && (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                <Lightbulb className="w-9 h-9 text-yellow-500/30" />
              </div>
              <p className="text-gray-400 text-lg">This tip could not be found.</p>
            </div>
          )}

          {!tipId && (
            <div className="text-center">
              <button
                onClick={() => setShowHistory(!showHistory)}
                data-testid="button-toggle-history"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-sm font-medium"
              >
                <Clock className="w-4 h-4" />
                {showHistory ? "Hide" : "View"} Previous Tips
                {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {!tipId && showHistory && tipHistory && tipHistory.length > 0 && (
            <div className="mt-8 space-y-3" data-testid="section-tip-history">
              {tipHistory.map((tip) => {
                const histBrand = categoryBrandIcon[tip.category];
                const HistIcon = histBrand?.Icon || (tip.icon ? iconMap[tip.icon] || Lightbulb : Lightbulb);
                const histIconColor = histBrand?.color || "#ffffff";
                const histGradient = getGradient(tip.category);
                const isExpanded = expandedTip === tip.id;
                return (
                  <button
                    key={tip.id}
                    onClick={() => setExpandedTip(isExpanded ? null : tip.id)}
                    className="w-full text-left rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] transition-all overflow-hidden"
                    data-testid={`card-tip-history-${tip.id}`}
                  >
                    <div className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="shrink-0 w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                          <HistIcon size={18} style={{ color: histIconColor }} className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-medium uppercase tracking-wider bg-gradient-to-r ${histGradient} bg-clip-text text-transparent`}>
                              {tip.category}
                            </span>
                            {tip.generatedAt && (
                              <span className="text-[10px] text-gray-600 ml-auto">
                                {new Date(tip.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                          <h4 className="text-[15px] font-medium text-gray-200">{tip.title}</h4>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-600 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-white/[0.06]">
                          <div className="text-[15px] text-gray-300 leading-[1.9] whitespace-pre-line">
                            {tip.content}
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(getTipUrl(tip));
                              toast({ title: "Link copied", description: "Share link copied to clipboard" });
                            }}
                            className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05] cursor-pointer hover:bg-white/[0.04] transition-all group"
                            data-testid={`share-url-${tip.id}`}
                          >
                            <Link2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <span className="text-[11px] text-gray-500 truncate font-mono">
                              {getTipUrl(tip)}
                            </span>
                            <Copy className="w-3 h-3 text-gray-600 group-hover:text-gray-400 shrink-0 ml-auto transition-colors" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        <footer className="border-t border-white/[0.06]">
          <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-gray-600">
            <span>&copy; {new Date().getFullYear()} AI Powered Sites</span>
            <div className="flex items-center gap-4">
              <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-gray-400 transition-colors">Terms</a>
              <a href="/updates" className="hover:text-gray-400 transition-colors">Subscribe</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
